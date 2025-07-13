"""
Modelos actualizados con nomenclatura unificada y soporte multimedia
"""

from datetime import datetime, timedelta
from backend_app.extensions import db, bcrypt
from sqlalchemy import Index, CheckConstraint, text, event
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import validates
import json
import uuid

class BaseModel(db.Model):
    """Modelo base con funcionalidades comunes"""
    __abstract__ = True
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Soft delete
    is_deleted = db.Column(db.Boolean, default=False, nullable=False, index=True)
    deleted_at = db.Column(db.DateTime)
    
    def soft_delete(self):
        """Soft delete del registro"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        db.session.commit()
    
    def restore(self):
        """Restaurar registro soft deleted"""
        self.is_deleted = False
        self.deleted_at = None
        db.session.commit()
    
    @classmethod
    def active(cls):
        """Query para registros activos (no soft deleted)"""
        return cls.query.filter(cls.is_deleted == False)

class Flashcard(BaseModel):
    """
    Modelo Flashcard con nomenclatura unificada y soporte multimedia
    
    CAMBIOS PRINCIPALES:
    - Estructura de contenido unificada (front_content, back_content)
    - Soporte nativo para multimedia
    - Datos de algoritmo agrupados
    - Compatibilidad con nomenclatura anterior
    """
    __tablename__ = 'flashcards'
    
    deck_id = db.Column(db.Integer, db.ForeignKey('decks.id'), nullable=False, index=True)
    
    # ========== CONTENIDO UNIFICADO ==========
    # Contenido frontal
    front_text = db.Column(db.Text, nullable=True)  # Ahora opcional si hay imagen
    front_image_url = db.Column(db.String(500))
    front_audio_url = db.Column(db.String(500))
    front_video_url = db.Column(db.String(500))  # Preparado para futuro
    
    # Contenido posterior  
    back_text = db.Column(db.Text, nullable=True)   # Ahora opcional si hay imagen
    back_image_url = db.Column(db.String(500))
    back_audio_url = db.Column(db.String(500))
    back_video_url = db.Column(db.String(500))     # Preparado para futuro
    
    # ========== DATOS DE ALGORITMO AGRUPADOS ==========
    # SM-2 y variantes
    ease_factor = db.Column(db.Float, default=2.5)
    interval_days = db.Column(db.Integer, default=1, index=True)
    repetitions = db.Column(db.Integer, default=0)
    
    # FSRS específico
    stability = db.Column(db.Float, default=1.0)
    difficulty_fsrs = db.Column(db.Float, default=5.0)
    
    # Timestamps de algoritmo
    next_review = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    last_reviewed = db.Column(db.DateTime, index=True)
    
    # Tipo de algoritmo usado
    algorithm_type = db.Column(db.String(20), default='fsrs', index=True)
    
    # ========== METADATOS ==========
    difficulty = db.Column(db.String(20), default='normal', index=True)
    tags = db.Column(db.Text)  # JSON string
    notes = db.Column(db.Text)
    
    # Estadísticas
    total_reviews = db.Column(db.Integer, default=0, index=True)
    correct_reviews = db.Column(db.Integer, default=0)
    last_review_rating = db.Column(db.Integer)
    
    # Relaciones
    reviews = db.relationship(
        'CardReview', 
        backref='flashcard', 
        lazy='dynamic',
        cascade='all, delete-orphan',
        primaryjoin="and_(Flashcard.id==CardReview.flashcard_id, CardReview.is_deleted==False)"
    )
    
    # ========== CONSTRAINTS Y VALIDACIONES ==========
    __table_args__ = (
        # Validar que al menos uno de los contenidos frontales existe
        CheckConstraint(
            'front_text IS NOT NULL OR front_image_url IS NOT NULL OR front_audio_url IS NOT NULL',
            name='check_front_content_exists'
        ),
        # Validar que al menos uno de los contenidos posteriores existe
        CheckConstraint(
            'back_text IS NOT NULL OR back_image_url IS NOT NULL OR back_audio_url IS NOT NULL',
            name='check_back_content_exists'
        ),
        # Validaciones de algoritmo
        CheckConstraint('ease_factor > 0', name='check_positive_ease_factor'),
        CheckConstraint('interval_days >= 0', name='check_non_negative_interval'),
        CheckConstraint('repetitions >= 0', name='check_non_negative_repetitions'),
        CheckConstraint('stability > 0', name='check_positive_stability'),
        CheckConstraint('difficulty_fsrs >= 0', name='check_non_negative_difficulty'),
        CheckConstraint('total_reviews >= 0', name='check_non_negative_total_reviews'),
        CheckConstraint('correct_reviews >= 0', name='check_non_negative_correct_reviews'),
        CheckConstraint('correct_reviews <= total_reviews', name='check_correct_reviews_logic'),
        CheckConstraint("difficulty IN ('easy', 'normal', 'hard')", name='check_difficulty_values'),
        CheckConstraint("algorithm_type IN ('sm2', 'ultra_sm2', 'anki', 'fsrs')", name='check_algorithm_type'),
        CheckConstraint('last_review_rating >= 1 AND last_review_rating <= 5', name='check_rating_range'),
        
        # Índices optimizados
        Index('idx_flashcard_deck_difficulty', 'deck_id', 'difficulty'),
        Index('idx_flashcard_review_schedule', 'next_review', 'deck_id'),
        Index('idx_flashcard_stats', 'total_reviews', 'correct_reviews'),
        Index('idx_flashcard_algorithm', 'algorithm_type', 'ease_factor', 'interval_days'),
        Index('idx_flashcard_multimedia', 'front_image_url', 'back_image_url'),
    )
    
    # ========== PROPIEDADES HÍBRIDAS PARA CONTENIDO UNIFICADO ==========
    
    @hybrid_property
    def front_content(self):
        """Contenido frontal unificado"""
        return {
            'text': self.front_text,
            'image_url': self.front_image_url,
            'audio_url': self.front_audio_url,
            'video_url': self.front_video_url
        }
    
    @front_content.setter
    def front_content(self, value):
        """Establecer contenido frontal desde objeto"""
        if isinstance(value, dict):
            self.front_text = value.get('text')
            self.front_image_url = value.get('image_url')
            self.front_audio_url = value.get('audio_url')
            self.front_video_url = value.get('video_url')
    
    @hybrid_property
    def back_content(self):
        """Contenido posterior unificado"""
        return {
            'text': self.back_text,
            'image_url': self.back_image_url,
            'audio_url': self.back_audio_url,
            'video_url': self.back_video_url
        }
    
    @back_content.setter
    def back_content(self, value):
        """Establecer contenido posterior desde objeto"""
        if isinstance(value, dict):
            self.back_text = value.get('text')
            self.back_image_url = value.get('image_url')
            self.back_audio_url = value.get('audio_url')
            self.back_video_url = value.get('video_url')
    
    @hybrid_property
    def algorithm_data(self):
        """Datos de algoritmo unificados"""
        return {
            'algorithm_type': self.algorithm_type,
            'ease_factor': self.ease_factor,
            'interval': self.interval_days,
            'repetitions': self.repetitions,
            'stability': self.stability,
            'difficulty': self.difficulty_fsrs,
            'next_review': self.next_review.isoformat() if self.next_review else None,
            'last_review': self.last_reviewed.isoformat() if self.last_reviewed else None
        }
    
    @algorithm_data.setter
    def algorithm_data(self, value):
        """Establecer datos de algoritmo desde objeto"""
        if isinstance(value, dict):
            self.algorithm_type = value.get('algorithm_type', self.algorithm_type)
            self.ease_factor = value.get('ease_factor', self.ease_factor)
            self.interval_days = value.get('interval', self.interval_days)
            self.repetitions = value.get('repetitions', self.repetitions)
            self.stability = value.get('stability', self.stability)
            self.difficulty_fsrs = value.get('difficulty', self.difficulty_fsrs)
            
            # Manejar timestamps
            if 'next_review' in value and value['next_review']:
                if isinstance(value['next_review'], str):
                    self.next_review = datetime.fromisoformat(value['next_review'].replace('Z', '+00:00'))
                else:
                    self.next_review = value['next_review']
            
            if 'last_review' in value and value['last_review']:
                if isinstance(value['last_review'], str):
                    self.last_reviewed = datetime.fromisoformat(value['last_review'].replace('Z', '+00:00'))
                else:
                    self.last_reviewed = value['last_review']
    
    # ========== COMPATIBILIDAD CON NOMENCLATURA ANTERIOR ==========
    
    @hybrid_property
    def front(self):
        """Alias para compatibilidad - devuelve texto frontal"""
        return self.front_text
    
    @front.setter
    def front(self, value):
        """Alias para compatibilidad - establece texto frontal"""
        self.front_text = value
    
    @hybrid_property
    def back(self):
        """Alias para compatibilidad - devuelve texto posterior"""
        return self.back_text
    
    @back.setter
    def back(self, value):
        """Alias para compatibilidad - establece texto posterior"""
        self.back_text = value
    
    # Aliases para campos de algoritmo
    @hybrid_property
    def interval(self):
        return self.interval_days
    
    @interval.setter
    def interval(self, value):
        self.interval_days = value
    
    @hybrid_property
    def easiness_factor(self):
        return self.ease_factor
    
    @easiness_factor.setter
    def easiness_factor(self, value):
        self.ease_factor = value
    
    # ========== MÉTODOS DE UTILIDAD ==========
    
    @hybrid_property
    def tags_list(self):
        """Obtener tags como lista"""
        if self.tags:
            try:
                return json.loads(self.tags)
            except:
                return []
        return []
    
    @tags_list.setter
    def tags_list(self, value):
        """Establecer tags desde lista"""
        if isinstance(value, list):
            self.tags = json.dumps(value)
        else:
            self.tags = None
    
    @hybrid_property
    def accuracy_rate(self):
        """Calcular tasa de acierto"""
        if self.total_reviews == 0:
            return 0
        return round((self.correct_reviews / self.total_reviews) * 100, 2)
    
    @hybrid_property
    def is_due(self):
        """Verificar si la carta está lista para revisión"""
        return self.next_review <= datetime.utcnow()
    
    @hybrid_property
    def has_multimedia(self):
        """Verificar si tiene contenido multimedia"""
        return bool(
            self.front_image_url or self.back_image_url or 
            self.front_audio_url or self.back_audio_url or
            self.front_video_url or self.back_video_url
        )
    
    def update_review_stats(self, rating):
        """Actualizar estadísticas después de una revisión"""
        self.total_reviews += 1
        self.last_review_rating = rating
        self.last_reviewed = datetime.utcnow()
        
        if rating >= 3:  # Good o Easy
            self.correct_reviews += 1
    
    def validate_content(self):
        """Validar que el contenido es válido"""
        # Validar contenido frontal
        if not (self.front_text or self.front_image_url or self.front_audio_url):
            raise ValueError("El contenido frontal debe tener al menos texto, imagen o audio")
        
        # Validar contenido posterior
        if not (self.back_text or self.back_image_url or self.back_audio_url):
            raise ValueError("El contenido posterior debe tener al menos texto, imagen o audio")
        
        return True
    
    def to_dict(self, include_content=True, unified_format=True):
        """
        Convertir a diccionario con formato unificado o legacy
        
        Args:
            include_content: Incluir contenido de la flashcard
            unified_format: Usar formato unificado (True) o legacy (False)
        """
        base_data = {
            'id': self.id,
            'deck_id': self.deck_id,
            'difficulty': self.difficulty,
            'tags': self.tags_list,
            'notes': self.notes,
            'total_reviews': self.total_reviews,
            'correct_reviews': self.correct_reviews,
            'accuracy_rate': self.accuracy_rate,
            'last_review_rating': self.last_review_rating,
            'is_due': self.is_due,
            'has_multimedia': self.has_multimedia,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_content:
            if unified_format:
                # Formato unificado nuevo
                base_data.update({
                    'front_content': self.front_content,
                    'back_content': self.back_content,
                    'algorithm_data': self.algorithm_data
                })
            else:
                # Formato legacy para compatibilidad
                base_data.update({
                    'front_text': self.front_text,
                    'back_text': self.back_text,
                    'front': self.front_text,  # Alias
                    'back': self.back_text,    # Alias
                    'front_image_url': self.front_image_url,
                    'back_image_url': self.back_image_url,
                    'front_audio_url': self.front_audio_url,
                    'back_audio_url': self.back_audio_url,
                    'ease_factor': self.ease_factor,
                    'interval_days': self.interval_days,
                    'interval': self.interval_days,  # Alias
                    'repetitions': self.repetitions,
                    'stability': self.stability,
                    'difficulty_fsrs': self.difficulty_fsrs,
                    'algorithm_type': self.algorithm_type,
                    'next_review': self.next_review.isoformat() if self.next_review else None,
                    'last_reviewed': self.last_reviewed.isoformat() if self.last_reviewed else None
                })
        
        return base_data

# Eventos para validación automática
@event.listens_for(Flashcard, 'before_insert')
@event.listens_for(Flashcard, 'before_update')
def validate_flashcard_content(mapper, connection, target):
    """Validar contenido antes de insertar/actualizar"""
    target.validate_content()


"""
Modelos optimizados con índices, constraints y mejoras de rendimiento
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

class User(BaseModel):
    __tablename__ = 'users'
    
    # Información básica con constraints
    email = db.Column(
        db.String(120), 
        unique=True, 
        nullable=False, 
        index=True
    )
    username = db.Column(
        db.String(80), 
        unique=True, 
        nullable=False, 
        index=True
    )
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    
    # Información adicional
    bio = db.Column(db.Text)
    avatar_url = db.Column(db.String(500))
    
    # Configuraciones de usuario
    timezone = db.Column(db.String(50), default='UTC')
    language = db.Column(db.String(10), default='es')
    theme = db.Column(db.String(20), default='light')
    
    # Configuraciones de estudio
    daily_goal = db.Column(db.Integer, default=20)  # cartas por día
    reminder_enabled = db.Column(db.Boolean, default=True)
    reminder_time = db.Column(db.Time)
    
    # Estadísticas con índices para consultas frecuentes
    total_study_time = db.Column(db.Integer, default=0, index=True)  # en minutos
    current_streak = db.Column(db.Integer, default=0, index=True)
    longest_streak = db.Column(db.Integer, default=0)
    total_cards_studied = db.Column(db.Integer, default=0, index=True)
    total_cards_correct = db.Column(db.Integer, default=0)
    
    # Timestamps con índices para consultas de actividad
    last_login = db.Column(db.DateTime, index=True)
    last_study = db.Column(db.DateTime, index=True)
    
    # Estado de cuenta
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(100))
    
    # Relaciones optimizadas con lazy loading
    decks = db.relationship(
        'Deck', 
        backref='owner', 
        lazy='dynamic',  # Para consultas eficientes
        cascade='all, delete-orphan',
        primaryjoin="and_(User.id==Deck.user_id, Deck.is_deleted==False)"
    )
    study_sessions = db.relationship(
        'StudySession', 
        backref='user', 
        lazy='dynamic',
        primaryjoin="and_(User.id==StudySession.user_id, StudySession.is_deleted==False)"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint('total_study_time >= 0', name='check_positive_study_time'),
        CheckConstraint('current_streak >= 0', name='check_positive_current_streak'),
        CheckConstraint('longest_streak >= 0', name='check_positive_longest_streak'),
        CheckConstraint('total_cards_studied >= 0', name='check_positive_cards_studied'),
        CheckConstraint('daily_goal > 0', name='check_positive_daily_goal'),
        Index('idx_user_activity', 'last_login', 'last_study'),
        Index('idx_user_stats', 'total_cards_studied', 'current_streak'),
        Index('idx_user_email_username', 'email', 'username'),
    )
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    @hybrid_property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @hybrid_property
    def accuracy_rate(self):
        """Calcular tasa de acierto"""
        if self.total_cards_studied == 0:
            return 0
        return round((self.total_cards_correct / self.total_cards_studied) * 100, 2)
    
    def update_streak(self, studied_today=True):
        """Actualizar racha de estudio"""
        if studied_today:
            self.current_streak += 1
            if self.current_streak > self.longest_streak:
                self.longest_streak = self.current_streak
        else:
            self.current_streak = 0
    
    @validates('email')
    def validate_email(self, key, email):
        assert '@' in email, "Email debe contener @"
        return email.lower()
    
    @validates('username')
    def validate_username(self, key, username):
        assert len(username) >= 3, "Username debe tener al menos 3 caracteres"
        return username.lower()

    def to_dict(self, include_stats=True):
        data = {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'bio': self.bio,
            'avatar_url': self.avatar_url,
            'timezone': self.timezone,
            'language': self.language,
            'theme': self.theme,
            'daily_goal': self.daily_goal,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'last_study': self.last_study.isoformat() if self.last_study else None
        }
        
        if include_stats:
            data.update({
                'total_study_time': self.total_study_time,
                'current_streak': self.current_streak,
                'longest_streak': self.longest_streak,
                'total_cards_studied': self.total_cards_studied,
                'total_cards_correct': self.total_cards_correct,
                'accuracy_rate': self.accuracy_rate
            })
        
        return data

class Deck(BaseModel):
    __tablename__ = 'decks'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Información básica
    name = db.Column(db.String(100), nullable=False, index=True)
    description = db.Column(db.Text)
    
    # Metadatos
    difficulty_level = db.Column(
        db.String(20), 
        default='intermediate',
        index=True
    )
    color = db.Column(db.String(7), default='#2196F3')  # Hex color
    icon = db.Column(db.String(10), default='📚')
    
    # Configuraciones
    is_public = db.Column(db.Boolean, default=False, nullable=False, index=True)
    allow_collaboration = db.Column(db.Boolean, default=False)
    
    # Estadísticas con índices
    total_cards = db.Column(db.Integer, default=0, nullable=False, index=True)
    total_reviews = db.Column(db.Integer, default=0)
    average_rating = db.Column(db.Float, default=0.0)
    
    # Metadatos adicionales
    tags = db.Column(db.Text)  # JSON string
    category = db.Column(db.String(50), index=True)
    
    # Timestamps para ordenamiento
    last_studied = db.Column(db.DateTime, index=True)
    
    # Relaciones optimizadas
    flashcards = db.relationship(
        'Flashcard', 
        backref='deck', 
        lazy='dynamic',
        cascade='all, delete-orphan',
        primaryjoin="and_(Deck.id==Flashcard.deck_id, Flashcard.is_deleted==False)"
    )
    study_sessions = db.relationship(
        'StudySession', 
        backref='deck', 
        lazy='dynamic',
        primaryjoin="and_(Deck.id==StudySession.deck_id, StudySession.is_deleted==False)"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint('total_cards >= 0', name='check_positive_total_cards'),
        CheckConstraint('total_reviews >= 0', name='check_positive_total_reviews'),
        CheckConstraint('average_rating >= 0 AND average_rating <= 5', name='check_rating_range'),
        CheckConstraint("difficulty_level IN ('beginner', 'intermediate', 'advanced')", name='check_difficulty_level'),
        Index('idx_deck_user_public', 'user_id', 'is_public'),
        Index('idx_deck_category_difficulty', 'category', 'difficulty_level'),
        Index('idx_deck_stats', 'total_cards', 'average_rating'),
        Index('idx_deck_activity', 'last_studied', 'created_at'),
    )
    
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
    
    def update_stats(self):
        """Actualizar estadísticas del deck"""
        self.total_cards = self.flashcards.count()
        
        # Calcular rating promedio
        reviews = db.session.query(db.func.avg(CardReview.rating)).join(
            Flashcard, CardReview.flashcard_id == Flashcard.id
        ).filter(Flashcard.deck_id == self.id).scalar()
        
        self.average_rating = round(reviews or 0.0, 2)
        
        # Actualizar total de reviews
        self.total_reviews = db.session.query(db.func.count(CardReview.id)).join(
            Flashcard, CardReview.flashcard_id == Flashcard.id
        ).filter(Flashcard.deck_id == self.id).scalar() or 0

    def to_dict(self, include_stats=True):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'difficulty_level': self.difficulty_level,
            'color': self.color,
            'icon': self.icon,
            'is_public': self.is_public,
            'allow_collaboration': self.allow_collaboration,
            'tags': self.tags_list,
            'category': self.category,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_studied': self.last_studied.isoformat() if self.last_studied else None
        }
        
        if include_stats:
            data.update({
                'total_cards': self.total_cards,
                'total_reviews': self.total_reviews,
                'average_rating': self.average_rating
            })
        
        return data

class Flashcard(BaseModel):
    __tablename__ = 'flashcards'
    
    deck_id = db.Column(db.Integer, db.ForeignKey('decks.id'), nullable=False, index=True)
    
    # Contenido de la flashcard
    front_text = db.Column(db.Text, nullable=False)
    back_text = db.Column(db.Text, nullable=False)
    
    # Contenido multimedia
    front_image_url = db.Column(db.String(500))
    back_image_url = db.Column(db.String(500))
    front_audio_url = db.Column(db.String(500))
    back_audio_url = db.Column(db.String(500))
    
    # Metadatos
    difficulty = db.Column(
        db.String(20), 
        default='normal',
        index=True
    )
    tags = db.Column(db.Text)  # JSON string
    notes = db.Column(db.Text)
    
    # Algoritmo de revisión espaciada
    ease_factor = db.Column(db.Float, default=2.5)
    interval_days = db.Column(db.Integer, default=1, index=True)
    repetitions = db.Column(db.Integer, default=0)
    
    # FSRS específico
    stability = db.Column(db.Float, default=1.0)
    difficulty_fsrs = db.Column(db.Float, default=5.0)
    
    # Estadísticas con índices para consultas frecuentes
    total_reviews = db.Column(db.Integer, default=0, index=True)
    correct_reviews = db.Column(db.Integer, default=0)
    last_review_rating = db.Column(db.Integer)
    
    # Timestamps críticos para algoritmos
    next_review = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    last_reviewed = db.Column(db.DateTime, index=True)
    
    # Relaciones
    reviews = db.relationship(
        'CardReview', 
        backref='flashcard', 
        lazy='dynamic',
        cascade='all, delete-orphan',
        primaryjoin="and_(Flashcard.id==CardReview.flashcard_id, CardReview.is_deleted==False)"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint('ease_factor > 0', name='check_positive_ease_factor'),
        CheckConstraint('interval_days >= 0', name='check_non_negative_interval'),
        CheckConstraint('repetitions >= 0', name='check_non_negative_repetitions'),
        CheckConstraint('stability > 0', name='check_positive_stability'),
        CheckConstraint('difficulty_fsrs >= 0', name='check_non_negative_difficulty'),
        CheckConstraint('total_reviews >= 0', name='check_non_negative_total_reviews'),
        CheckConstraint('correct_reviews >= 0', name='check_non_negative_correct_reviews'),
        CheckConstraint('correct_reviews <= total_reviews', name='check_correct_reviews_logic'),
        CheckConstraint("difficulty IN ('easy', 'normal', 'hard')", name='check_difficulty_values'),
        CheckConstraint('last_review_rating >= 1 AND last_review_rating <= 5', name='check_rating_range'),
        Index('idx_flashcard_deck_difficulty', 'deck_id', 'difficulty'),
        Index('idx_flashcard_review_schedule', 'next_review', 'deck_id'),
        Index('idx_flashcard_stats', 'total_reviews', 'correct_reviews'),
        Index('idx_flashcard_algorithm', 'ease_factor', 'interval_days', 'stability'),
    )
    
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
    
    def update_review_stats(self, rating):
        """Actualizar estadísticas después de una revisión"""
        self.total_reviews += 1
        self.last_review_rating = rating
        self.last_reviewed = datetime.utcnow()
        
        if rating >= 3:  # Good o Easy
            self.correct_reviews += 1

    def to_dict(self, include_content=True):
        data = {
            'id': self.id,
            'deck_id': self.deck_id,
            'difficulty': self.difficulty,
            'tags': self.tags_list,
            'notes': self.notes,
            'ease_factor': self.ease_factor,
            'interval_days': self.interval_days,
            'repetitions': self.repetitions,
            'stability': self.stability,
            'difficulty_fsrs': self.difficulty_fsrs,
            'total_reviews': self.total_reviews,
            'correct_reviews': self.correct_reviews,
            'accuracy_rate': self.accuracy_rate,
            'last_review_rating': self.last_review_rating,
            'next_review': self.next_review.isoformat() if self.next_review else None,
            'last_reviewed': self.last_reviewed.isoformat() if self.last_reviewed else None,
            'is_due': self.is_due,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_content:
            data.update({
                'front_text': self.front_text,
                'back_text': self.back_text,
                'front_image_url': self.front_image_url,
                'back_image_url': self.back_image_url,
                'front_audio_url': self.front_audio_url,
                'back_audio_url': self.back_audio_url
            })
        
        return data

class StudySession(BaseModel):
    __tablename__ = 'study_sessions'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    deck_id = db.Column(db.Integer, db.ForeignKey('decks.id'), nullable=False, index=True)
    
    # Configuración de sesión
    algorithm = db.Column(db.String(20), default='fsrs', index=True)
    max_cards = db.Column(db.Integer, default=20)
    
    # Estadísticas de sesión con índices
    cards_studied = db.Column(db.Integer, default=0, index=True)
    cards_correct = db.Column(db.Integer, default=0)
    total_time = db.Column(db.Integer, default=0)  # segundos
    
    # Estado
    is_completed = db.Column(db.Boolean, default=False, nullable=False, index=True)
    
    # Timestamps con índices para análisis temporal
    started_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    completed_at = db.Column(db.DateTime, index=True)
    
    # Relaciones
    reviews = db.relationship(
        'CardReview', 
        backref='session', 
        lazy='dynamic',
        cascade='all, delete-orphan',
        primaryjoin="and_(StudySession.id==CardReview.session_id, CardReview.is_deleted==False)"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint('max_cards > 0', name='check_positive_max_cards'),
        CheckConstraint('cards_studied >= 0', name='check_non_negative_cards_studied'),
        CheckConstraint('cards_correct >= 0', name='check_non_negative_cards_correct'),
        CheckConstraint('cards_correct <= cards_studied', name='check_correct_logic'),
        CheckConstraint('total_time >= 0', name='check_non_negative_time'),
        CheckConstraint("algorithm IN ('fsrs', 'sm2')", name='check_algorithm_values'),
        Index('idx_session_user_deck', 'user_id', 'deck_id'),
        Index('idx_session_completion', 'is_completed', 'completed_at'),
        Index('idx_session_stats', 'cards_studied', 'cards_correct', 'total_time'),
        Index('idx_session_timeline', 'started_at', 'completed_at'),
    )
    
    @hybrid_property
    def accuracy_rate(self):
        """Calcular tasa de acierto de la sesión"""
        if self.cards_studied == 0:
            return 0
        return round((self.cards_correct / self.cards_studied) * 100, 2)
    
    @hybrid_property
    def duration_minutes(self):
        """Duración en minutos"""
        return round(self.total_time / 60, 2) if self.total_time else 0
    
    def complete_session(self):
        """Completar la sesión"""
        self.is_completed = True
        self.completed_at = datetime.utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'deck_id': self.deck_id,
            'algorithm': self.algorithm,
            'max_cards': self.max_cards,
            'cards_studied': self.cards_studied,
            'cards_correct': self.cards_correct,
            'accuracy_rate': self.accuracy_rate,
            'total_time': self.total_time,
            'duration_minutes': self.duration_minutes,
            'is_completed': self.is_completed,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CardReview(BaseModel):
    __tablename__ = 'card_reviews'
    
    flashcard_id = db.Column(db.Integer, db.ForeignKey('flashcards.id'), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey('study_sessions.id'), nullable=False, index=True)
    
    # Respuesta del usuario
    rating = db.Column(db.Integer, nullable=False, index=True)  # 1=Again, 2=Hard, 3=Good, 4=Easy
    response_time = db.Column(db.Integer)  # milisegundos
    
    # Estado antes de la revisión
    previous_ease = db.Column(db.Float)
    previous_interval = db.Column(db.Integer)
    previous_stability = db.Column(db.Float)
    
    # Estado después de la revisión
    new_ease = db.Column(db.Float)
    new_interval = db.Column(db.Integer)
    new_stability = db.Column(db.Float)
    new_next_review = db.Column(db.DateTime, index=True)
    
    # Timestamp con índice para análisis temporal
    reviewed_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
        CheckConstraint('response_time >= 0', name='check_non_negative_response_time'),
        CheckConstraint('previous_ease > 0', name='check_positive_previous_ease'),
        CheckConstraint('new_ease > 0', name='check_positive_new_ease'),
        CheckConstraint('previous_interval >= 0', name='check_non_negative_previous_interval'),
        CheckConstraint('new_interval >= 0', name='check_non_negative_new_interval'),
        CheckConstraint('previous_stability > 0', name='check_positive_previous_stability'),
        CheckConstraint('new_stability > 0', name='check_positive_new_stability'),
        Index('idx_review_flashcard_session', 'flashcard_id', 'session_id'),
        Index('idx_review_rating_time', 'rating', 'reviewed_at'),
        Index('idx_review_algorithm_data', 'new_ease', 'new_interval', 'new_stability'),
        Index('idx_review_timeline', 'reviewed_at', 'new_next_review'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'flashcard_id': self.flashcard_id,
            'session_id': self.session_id,
            'rating': self.rating,
            'response_time': self.response_time,
            'previous_ease': self.previous_ease,
            'previous_interval': self.previous_interval,
            'previous_stability': self.previous_stability,
            'new_ease': self.new_ease,
            'new_interval': self.new_interval,
            'new_stability': self.new_stability,
            'new_next_review': self.new_next_review.isoformat() if self.new_next_review else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Event listeners para mantener estadísticas actualizadas
@event.listens_for(Flashcard, 'after_insert')
def update_deck_card_count_insert(mapper, connection, target):
    """Actualizar contador de cartas al insertar"""
    connection.execute(
        text("UPDATE decks SET total_cards = total_cards + 1 WHERE id = :deck_id"),
        {"deck_id": target.deck_id}
    )

@event.listens_for(Flashcard, 'after_delete')
def update_deck_card_count_delete(mapper, connection, target):
    """Actualizar contador de cartas al eliminar"""
    connection.execute(
        text("UPDATE decks SET total_cards = total_cards - 1 WHERE id = :deck_id AND total_cards > 0"),
        {"deck_id": target.deck_id}
    )

@event.listens_for(CardReview, 'after_insert')
def update_review_stats(mapper, connection, target):
    """Actualizar estadísticas después de una revisión"""
    # Actualizar estadísticas de la flashcard
    connection.execute(
        text("""
            UPDATE flashcards 
            SET total_reviews = total_reviews + 1,
                correct_reviews = CASE WHEN :rating >= 3 THEN correct_reviews + 1 ELSE correct_reviews END,
                last_review_rating = :rating,
                last_reviewed = :reviewed_at
            WHERE id = :flashcard_id
        """),
        {
            "rating": target.rating,
            "reviewed_at": target.reviewed_at,
            "flashcard_id": target.flashcard_id
        }
    )
    
    # Actualizar estadísticas de la sesión
    connection.execute(
        text("""
            UPDATE study_sessions 
            SET cards_studied = cards_studied + 1,
                cards_correct = CASE WHEN :rating >= 3 THEN cards_correct + 1 ELSE cards_correct END
            WHERE id = :session_id
        """),
        {
            "rating": target.rating,
            "session_id": target.session_id
        }
    )

# Funciones de consulta optimizadas
class QueryOptimizer:
    """Clase con consultas optimizadas frecuentes"""
    
    @staticmethod
    def get_due_cards(user_id, deck_id=None, limit=20):
        """Obtener cartas listas para revisión"""
        query = db.session.query(Flashcard).filter(
            Flashcard.is_deleted == False,
            Flashcard.next_review <= datetime.utcnow()
        )
        
        if deck_id:
            query = query.filter(Flashcard.deck_id == deck_id)
        else:
            # Filtrar por decks del usuario
            query = query.join(Deck).filter(
                Deck.user_id == user_id,
                Deck.is_deleted == False
            )
        
        return query.order_by(Flashcard.next_review).limit(limit).all()
    
    @staticmethod
    def get_user_stats(user_id, days=30):
        """Obtener estadísticas del usuario"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        stats = db.session.query(
            db.func.count(StudySession.id).label('sessions_count'),
            db.func.sum(StudySession.cards_studied).label('total_cards'),
            db.func.sum(StudySession.cards_correct).label('total_correct'),
            db.func.sum(StudySession.total_time).label('total_time')
        ).filter(
            StudySession.user_id == user_id,
            StudySession.is_deleted == False,
            StudySession.started_at >= cutoff_date
        ).first()
        
        return {
            'sessions_count': stats.sessions_count or 0,
            'total_cards': stats.total_cards or 0,
            'total_correct': stats.total_correct or 0,
            'total_time': stats.total_time or 0,
            'accuracy_rate': round((stats.total_correct / stats.total_cards * 100) if stats.total_cards else 0, 2)
        }
    
    @staticmethod
    def get_deck_performance(deck_id, days=30):
        """Obtener rendimiento del deck"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        performance = db.session.query(
            db.func.count(CardReview.id).label('total_reviews'),
            db.func.avg(CardReview.rating).label('avg_rating'),
            db.func.count(db.case([(CardReview.rating >= 3, 1)])).label('correct_reviews')
        ).join(Flashcard).filter(
            Flashcard.deck_id == deck_id,
            CardReview.is_deleted == False,
            CardReview.reviewed_at >= cutoff_date
        ).first()
        
        return {
            'total_reviews': performance.total_reviews or 0,
            'avg_rating': round(performance.avg_rating or 0, 2),
            'correct_reviews': performance.correct_reviews or 0,
            'accuracy_rate': round((performance.correct_reviews / performance.total_reviews * 100) if performance.total_reviews else 0, 2)
        }


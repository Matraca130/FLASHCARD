"""
Sistema de servicios completo con patrones de diseño y optimizaciones
"""

from backend_app.extensions import db
from backend_app.models import User, Deck, Flashcard, StudySession, CardReview
from backend_app.utils.algorithms import calculate_fsrs, calculate_sm2
from backend_app.utils.cache import CacheManager
from flask_jwt_extended import create_access_token
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import joinedload
import logging

logger = logging.getLogger('app.services')
cache_manager = CacheManager()

class BaseService:
    """Clase base para todos los servicios"""
    
    def __init__(self):
        self.logger = logging.getLogger(f'app.services.{self.__class__.__name__}')
    
    def _success_response(self, data, message=None):
        """Respuesta exitosa estándar"""
        return {
            'success': True,
            'data': data,
            'message': message
        }
    
    def _error_response(self, error, code=None):
        """Respuesta de error estándar"""
        return {
            'success': False,
            'error': error,
            'code': code
        }

class UserService(BaseService):
    """Servicio para gestión de usuarios"""
    
    def register_user(self, user_data):
        """Registrar nuevo usuario"""
        try:
            # Verificar email único
            if User.query.filter_by(email=user_data['email']).first():
                return self._error_response('El email ya está registrado')
            
            # Verificar username único
            if User.query.filter_by(username=user_data['username']).first():
                return self._error_response('El nombre de usuario ya está en uso')
            
            # Crear usuario
            user = User(
                email=user_data['email'],
                username=user_data['username'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name']
            )
            user.set_password(user_data['password'])
            
            db.session.add(user)
            db.session.commit()
            
            # Generar token
            token = create_access_token(identity=str(user.id))
            
            return self._success_response({
                'user': user.to_dict(),
                'token': token,
                'id': user.id,
                'email': user.email
            })
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error registering user: {str(e)}")
            return self._error_response('Error al registrar usuario')
    
    def authenticate_user(self, email, password):
        """Autenticar usuario"""
        try:
            user = User.query.filter_by(email=email).first()
            
            if not user or not user.check_password(password):
                return self._error_response('Credenciales inválidas')
            
            # Actualizar último login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Generar token
            token = create_access_token(identity=str(user.id))
            
            return self._success_response({
                'user': user.to_dict(),
                'token': token,
                'id': user.id,
                'email': user.email
            })
            
        except Exception as e:
            self.logger.error(f"Error authenticating user: {str(e)}")
            return self._error_response('Error en autenticación')
    
    def get_user_profile(self, user_id):
        """Obtener perfil de usuario"""
        try:
            user = User.query.get(user_id)
            if not user:
                return self._error_response('Usuario no encontrado')
            
            return self._success_response(user.to_dict())
            
        except Exception as e:
            self.logger.error(f"Error getting user profile: {str(e)}")
            return self._error_response('Error al obtener perfil')
    
    def update_user_profile(self, user_id, update_data):
        """Actualizar perfil de usuario"""
        try:
            user = User.query.get(user_id)
            if not user:
                return self._error_response('Usuario no encontrado')
            
            # Actualizar campos permitidos
            for field in ['first_name', 'last_name', 'username']:
                if field in update_data:
                    setattr(user, field, update_data[field])
            
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            return self._success_response(user.to_dict())
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error updating user profile: {str(e)}")
            return self._error_response('Error al actualizar perfil')
    
    def change_password(self, user_id, current_password, new_password):
        """Cambiar contraseña de usuario"""
        try:
            user = User.query.get(user_id)
            if not user:
                return self._error_response('Usuario no encontrado')
            
            if not user.check_password(current_password):
                return self._error_response('Contraseña actual incorrecta')
            
            user.set_password(new_password)
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            return self._success_response({'message': 'Contraseña actualizada'})
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error changing password: {str(e)}")
            return self._error_response('Error al cambiar contraseña')

class DeckService(BaseService):
    """Servicio para gestión de decks"""
    
    def get_user_decks(self, user_id, query_params):
        """Obtener decks del usuario con filtros"""
        try:
            # Cache key
            cache_key = f"user_decks:{user_id}:{hash(str(query_params))}"
            cached_result = cache_manager.get(cache_key)
            if cached_result:
                return self._success_response(cached_result)
            
            # Query base
            query = Deck.query.filter_by(user_id=user_id, is_deleted=False)
            
            # Aplicar filtros
            if query_params.get('deck_id'):
                query = query.filter(Deck.id == query_params['deck_id'])
            if query_params.get('difficulty'):
                query = query.filter(Deck.difficulty_level == query_params['difficulty'])
            if query_params.get('tags'):
                # Implementar filtro por tags
                tags_filter = query_params['tags'].split(',')
                if len(tags_filter) == 1:
                    query = query.filter(Deck.tags.contains(tags_filter[0]))
                else:
                    query = query.filter(
                        db.or_(*[Deck.tags.contains(tag.strip()) for tag in tags_filter])
                    )
            
            # Paginación
            page = query_params.get('page', 1)
            per_page = min(query_params.get('per_page', 20), 100)
            
            paginated = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            result = {
                'decks': paginated.items,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                }
            }
            
            # Cache result
            cache_manager.set(cache_key, result, timeout=300)
            
            return self._success_response(result)
            
        except Exception as e:
            self.logger.error(f"Error getting user decks: {str(e)}")
            return self._error_response('Error al obtener decks')
    
    def create_deck(self, user_id, deck_data):
        """Crear nuevo deck"""
        try:
            deck = Deck(
                user_id=user_id,
                name=deck_data['name'],
                description=deck_data.get('description', ''),
                difficulty_level=deck_data.get('difficulty_level', 'intermediate'),
                tags=deck_data.get('tags', []),
                is_public=deck_data.get('is_public', False)
            )
            
            db.session.add(deck)
            db.session.commit()
            
            # Invalidar cache
            cache_manager.delete_pattern(f"user_decks:{user_id}:*")
            
            return self._success_response(deck)
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error creating deck: {str(e)}")
            return self._error_response('Error al crear deck')
    
    def get_deck_by_id(self, deck_id, user_id):
        """Obtener deck por ID"""
        try:
            deck = Deck.query.filter_by(
                id=deck_id, user_id=user_id, is_deleted=False
            ).first()
            
            if not deck:
                return self._error_response('Deck no encontrado')
            
            return self._success_response(deck)
            
        except Exception as e:
            self.logger.error(f"Error getting deck: {str(e)}")
            return self._error_response('Error al obtener deck')
    
    def update_deck(self, deck_id, user_id, update_data):
        """Actualizar deck"""
        try:
            deck = Deck.query.filter_by(
                id=deck_id, user_id=user_id, is_deleted=False
            ).first()
            
            if not deck:
                return self._error_response('Deck no encontrado')
            
            # Actualizar campos
            for field in ['name', 'description', 'difficulty_level', 'tags', 'is_public']:
                if field in update_data:
                    setattr(deck, field, update_data[field])
            
            deck.updated_at = datetime.utcnow()
            db.session.commit()
            
            # Invalidar cache
            cache_manager.delete_pattern(f"user_decks:{user_id}:*")
            
            return self._success_response(deck)
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error updating deck: {str(e)}")
            return self._error_response('Error al actualizar deck')
    
    def delete_deck(self, deck_id, user_id):
        """Eliminar deck (soft delete)"""
        try:
            deck = Deck.query.filter_by(
                id=deck_id, user_id=user_id, is_deleted=False
            ).first()
            
            if not deck:
                return self._error_response('Deck no encontrado')
            
            deck.is_deleted = True
            deck.updated_at = datetime.utcnow()
            db.session.commit()
            
            # Invalidar cache
            cache_manager.delete_pattern(f"user_decks:{user_id}:*")
            
            return self._success_response({'name': deck.name})
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error deleting deck: {str(e)}")
            return self._error_response('Error al eliminar deck')
    
    def get_deck_statistics(self, deck_id, user_id):
        """Obtener estadísticas del deck"""
        try:
            deck = Deck.query.filter_by(
                id=deck_id, user_id=user_id, is_deleted=False
            ).first()
            
            if not deck:
                return self._error_response('Deck no encontrado')
            
            # Cache key
            cache_key = f"deck_stats:{deck_id}"
            cached_stats = cache_manager.get(cache_key)
            if cached_stats:
                return self._success_response(cached_stats)
            
            # Calcular estadísticas
            total_cards = Flashcard.query.filter_by(deck_id=deck_id, is_deleted=False).count()
            
            stats = {
                'total_cards': total_cards,
                'cards_due': 0,  # Implementar lógica
                'mastered_cards': 0,  # Implementar lógica
                'average_difficulty': 0,  # Implementar lógica
                'last_studied': None  # Implementar lógica
            }
            
            # Cache stats
            cache_manager.set(cache_key, stats, timeout=600)
            
            return self._success_response(stats)
            
        except Exception as e:
            self.logger.error(f"Error getting deck statistics: {str(e)}")
            return self._error_response('Error al obtener estadísticas')
    
    def duplicate_deck(self, deck_id, user_id):
        """Duplicar deck"""
        try:
            original_deck = Deck.query.filter_by(
                id=deck_id, user_id=user_id, is_deleted=False
            ).first()
            
            if not original_deck:
                return self._error_response('Deck no encontrado')
            
            # Crear nuevo deck
            new_deck = Deck(
                user_id=user_id,
                name=f"{original_deck.name} (Copia)",
                description=original_deck.description,
                difficulty_level=original_deck.difficulty_level,
                tags=original_deck.tags,
                is_public=False
            )
            
            db.session.add(new_deck)
            db.session.flush()  # Para obtener el ID
            
            # Duplicar flashcards
            original_cards = Flashcard.query.filter_by(
                deck_id=deck_id, is_deleted=False
            ).all()
            
            for card in original_cards:
                new_card = Flashcard(
                    deck_id=new_deck.id,
                    front_text=card.front_text,
                    back_text=card.back_text,
                    front_image=card.front_image,
                    back_image=card.back_image,
                    front_audio=card.front_audio,
                    back_audio=card.back_audio,
                    tags=card.tags,
                    difficulty=card.difficulty
                )
                db.session.add(new_card)
            
            db.session.commit()
            
            # Invalidar cache
            cache_manager.delete_pattern(f"user_decks:{user_id}:*")
            
            return self._success_response(new_deck)
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error duplicating deck: {str(e)}")
            return self._error_response('Error al duplicar deck')

class FlashcardService(BaseService):
    """Servicio para gestión de flashcards"""
    
    def get_user_flashcards(self, user_id, query_params):
        """Obtener flashcards del usuario"""
        try:
            # Query base con join optimizado
            query = Flashcard.query.join(Deck).filter(
                Deck.user_id == user_id,
                Flashcard.is_deleted == False,
                Deck.is_deleted == False
            )
            
            # Aplicar filtros
            if query_params.get('deck_id'):
                query = query.filter(Flashcard.deck_id == query_params['deck_id'])
            if query_params.get('difficulty'):
                query = query.filter(Flashcard.difficulty == query_params['difficulty'])
            
            # Paginación
            page = query_params.get('page', 1)
            per_page = min(query_params.get('per_page', 20), 100)
            
            paginated = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            result = {
                'flashcards': paginated.items,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                }
            }
            
            return self._success_response(result)
            
        except Exception as e:
            self.logger.error(f"Error getting user flashcards: {str(e)}")
            return self._error_response('Error al obtener flashcards')
    
    def create_flashcard(self, user_id, flashcard_data):
        """Crear nueva flashcard"""
        try:
            # Verificar ownership del deck
            deck = Deck.query.filter_by(
                id=flashcard_data['deck_id'], 
                user_id=user_id, 
                is_deleted=False
            ).first()
            
            if not deck:
                return self._error_response('Deck no encontrado o no autorizado')
            
            flashcard = Flashcard(
                deck_id=flashcard_data['deck_id'],
                front_text=flashcard_data['front_text'],
                back_text=flashcard_data['back_text'],
                front_image=flashcard_data.get('front_image'),
                back_image=flashcard_data.get('back_image'),
                front_audio=flashcard_data.get('front_audio'),
                back_audio=flashcard_data.get('back_audio'),
                tags=flashcard_data.get('tags', []),
                difficulty=flashcard_data.get('difficulty', 'normal')
            )
            
            db.session.add(flashcard)
            db.session.commit()
            
            return self._success_response(flashcard.to_dict())
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error creating flashcard: {str(e)}")
            return self._error_response('Error al crear flashcard')
    
    def get_flashcard_by_id(self, flashcard_id, user_id):
        """Obtener flashcard por ID"""
        try:
            flashcard = Flashcard.query.join(Deck).filter(
                Flashcard.id == flashcard_id,
                Deck.user_id == user_id,
                Flashcard.is_deleted == False,
                Deck.is_deleted == False
            ).first()
            
            if not flashcard:
                return self._error_response('Flashcard no encontrada')
            
            return self._success_response(flashcard.to_dict())
            
        except Exception as e:
            self.logger.error(f"Error getting flashcard: {str(e)}")
            return self._error_response('Error al obtener flashcard')
    
    def update_flashcard(self, flashcard_id, user_id, update_data):
        """Actualizar flashcard"""
        try:
            flashcard = Flashcard.query.join(Deck).filter(
                Flashcard.id == flashcard_id,
                Deck.user_id == user_id,
                Flashcard.is_deleted == False,
                Deck.is_deleted == False
            ).first()
            
            if not flashcard:
                return self._error_response('Flashcard no encontrada')
            
            # Actualizar campos
            for field in ['front_text', 'back_text', 'front_image', 'back_image', 
                         'front_audio', 'back_audio', 'tags', 'difficulty']:
                if field in update_data:
                    setattr(flashcard, field, update_data[field])
            
            flashcard.updated_at = datetime.utcnow()
            db.session.commit()
            
            return self._success_response(flashcard)
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error updating flashcard: {str(e)}")
            return self._error_response('Error al actualizar flashcard')
    
    def delete_flashcard(self, flashcard_id, user_id):
        """Eliminar flashcard (soft delete)"""
        try:
            flashcard = Flashcard.query.join(Deck).filter(
                Flashcard.id == flashcard_id,
                Deck.user_id == user_id,
                Flashcard.is_deleted == False,
                Deck.is_deleted == False
            ).first()
            
            if not flashcard:
                return self._error_response('Flashcard no encontrada')
            
            flashcard.is_deleted = True
            flashcard.updated_at = datetime.utcnow()
            db.session.commit()
            
            return self._success_response({'deck_id': flashcard.deck_id})
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error deleting flashcard: {str(e)}")
            return self._error_response('Error al eliminar flashcard')
    
    def create_flashcards_batch(self, user_id, batch_data):
        """Crear flashcards en lote"""
        try:
            # Verificar ownership del deck
            deck = Deck.query.filter_by(
                id=batch_data['deck_id'], 
                user_id=user_id, 
                is_deleted=False
            ).first()
            
            if not deck:
                return self._error_response('Deck no encontrado o no autorizado')
            
            created_cards = []
            failed_cards = []
            
            for card_data in batch_data['flashcards']:
                try:
                    flashcard = Flashcard(
                        deck_id=batch_data['deck_id'],
                        front_text=card_data['front_text'],
                        back_text=card_data['back_text'],
                        tags=card_data.get('tags', []),
                        difficulty=card_data.get('difficulty', 'normal')
                    )
                    db.session.add(flashcard)
                    created_cards.append(flashcard)
                except Exception as e:
                    failed_cards.append({
                        'data': card_data,
                        'error': str(e)
                    })
            
            db.session.commit()
            
            return self._success_response({
                'created': created_cards,
                'failed': failed_cards
            })
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error creating batch flashcards: {str(e)}")
            return self._error_response('Error al crear flashcards en lote')
    
    def get_deck_flashcards(self, deck_id, user_id, query_params):
        """Obtener flashcards de un deck específico"""
        try:
            # Verificar ownership del deck
            deck = Deck.query.filter_by(
                id=deck_id, user_id=user_id, is_deleted=False
            ).first()
            
            if not deck:
                return self._error_response('Deck no encontrado')
            
            query = Flashcard.query.filter_by(
                deck_id=deck_id, is_deleted=False
            )
            
            # Paginación
            page = query_params.get('page', 1)
            per_page = min(query_params.get('per_page', 20), 100)
            
            paginated = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            result = {
                'flashcards': paginated.items,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                },
                'deck_info': {
                    'id': deck.id,
                    'name': deck.name,
                    'description': deck.description
                }
            }
            
            return self._success_response(result)
            
        except Exception as e:
            self.logger.error(f"Error getting deck flashcards: {str(e)}")
            return self._error_response('Error al obtener flashcards del deck')
    
    def search_flashcards(self, user_id, query_params):
        """Buscar flashcards por contenido"""
        try:
            search_query = query_params['search_query']
            
            # Query con búsqueda full-text
            query = Flashcard.query.join(Deck).filter(
                Deck.user_id == user_id,
                Flashcard.is_deleted == False,
                Deck.is_deleted == False,
                or_(
                    Flashcard.front_text.contains(search_query),
                    Flashcard.back_text.contains(search_query)
                )
            )
            
            # Paginación
            page = query_params.get('page', 1)
            per_page = min(query_params.get('per_page', 20), 100)
            
            paginated = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            result = {
                'flashcards': paginated.items,
                'total_results': paginated.total,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                }
            }
            
            return self._success_response(result)
            
        except Exception as e:
            self.logger.error(f"Error searching flashcards: {str(e)}")
            return self._error_response('Error en búsqueda de flashcards')

class StudyService(BaseService):
    """Servicio para gestión de sesiones de estudio"""
    
    def __init__(self):
        super().__init__()
    
    def start_study_session(self, user_id, session_data):
        """Iniciar nueva sesión de estudio"""
        try:
            # Verificar ownership del deck
            deck = Deck.query.filter_by(
                id=session_data['deck_id'], 
                user_id=user_id, 
                is_deleted=False
            ).first()
            
            if not deck:
                return self._error_response('Deck no encontrado')
            
            session = StudySession(
                user_id=user_id,
                deck_id=session_data['deck_id'],
                algorithm=session_data.get('algorithm', 'fsrs'),
                max_cards=session_data.get('target_cards', 20)
            )
            
            db.session.add(session)
            db.session.commit()
            
            return self._success_response(session.to_dict())
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error starting study session: {str(e)}")
            return self._error_response('Error al iniciar sesión de estudio')
    
    def get_next_card(self, session_id, user_id):
        """Obtener siguiente carta para revisar"""
        try:
            session = StudySession.query.filter_by(
                id=session_id, user_id=user_id
            ).first()
            
            if not session:
                return self._error_response('Sesión no encontrada')
            
            # Obtener cartas pendientes de revisión
            # Implementar lógica de algoritmo de espaciado
            
            # Por ahora, obtener una carta aleatoria del deck
            flashcard = Flashcard.query.filter_by(
                deck_id=session.deck_id, is_deleted=False
            ).first()
            
            if not flashcard:
                return self._error_response('No hay cartas disponibles')
            
            return self._success_response({
                'flashcard': flashcard.to_dict(),
                'session_progress': {
                    'cards_studied': session.cards_studied,
                    'target_cards': session.max_cards
                }
            })
            
        except Exception as e:
            self.logger.error(f"Error getting next card: {str(e)}")
            return self._error_response('Error al obtener siguiente carta')
    
    def review_card(self, session_id, user_id, review_data):
        """Revisar carta con algoritmos de espaciado"""
        try:
            session = StudySession.query.filter_by(
                id=session_id, user_id=user_id
            ).first()
            
            if not session:
                return self._error_response('Sesión no encontrada')
            
            # Crear review
            review = CardReview(
                user_id=user_id,
                flashcard_id=review_data['flashcard_id'],
                session_id=session_id,
                rating=review_data['rating'],
                response_time=review_data.get('response_time', 0)
            )
            
            # Aplicar algoritmo de espaciado
            if session.algorithm == 'fsrs':
                stability, difficulty, interval = calculate_fsrs(
                    rating=review_data['rating'],
                    stability=1.0,  # Valor por defecto
                    difficulty=5.0   # Valor por defecto
                )
                next_review_date = datetime.utcnow() + timedelta(days=interval)
                result = {
                    'next_review_date': next_review_date,
                    'interval': interval,
                    'ease_factor': 2.5
                }
            else:
                ease_factor, interval = calculate_sm2(
                    rating=review_data['rating'],
                    ease_factor=2.5,  # Valor por defecto
                    interval=1        # Valor por defecto
                )
                next_review_date = datetime.utcnow() + timedelta(days=interval)
                result = {
                    'next_review_date': next_review_date,
                    'interval': interval,
                    'ease_factor': ease_factor
                }
            
            review.next_review_date = result['next_review_date']
            review.interval_days = result['interval']
            review.ease_factor = result.get('ease_factor', 2.5)
            
            db.session.add(review)
            
            # Actualizar sesión
            session.cards_studied += 1
            session.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return self._success_response({
                'review': review.to_dict(),
                'next_review_date': result['next_review_date'],
                'session_progress': {
                    'cards_studied': session.cards_studied,
                    'target_cards': session.max_cards
                }
            })
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error reviewing card: {str(e)}")
            return self._error_response('Error al revisar carta')
    
    def complete_study_session(self, session_id, user_id):
        """Completar sesión de estudio"""
        try:
            session = StudySession.query.filter_by(
                id=session_id, user_id=user_id
            ).first()
            
            if not session:
                return self._error_response('Sesión no encontrada')
            
            session.completed_at = datetime.utcnow()
            session.is_completed = True
            db.session.commit()
            
            return self._success_response({
                'session_id': session_id,
                'cards_studied': session.cards_studied,
                'duration': (session.completed_at - session.created_at).total_seconds(),
                'completion_rate': (session.cards_studied / session.max_cards) * 100
            })
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error completing study session: {str(e)}")
            return self._error_response('Error al completar sesión')
    
    def get_due_cards(self, user_id):
        """Obtener cartas que necesitan revisión"""
        try:
            # Obtener cartas con revisiones vencidas
            due_cards = db.session.query(Flashcard).join(
                CardReview, Flashcard.id == CardReview.flashcard_id
            ).join(
                Deck, Flashcard.deck_id == Deck.id
            ).filter(
                Deck.user_id == user_id,
                CardReview.next_review_date <= datetime.utcnow(),
                Flashcard.is_deleted == False,
                Deck.is_deleted == False
            ).distinct().all()
            
            # Obtener cartas nuevas (sin revisiones)
            new_cards = db.session.query(Flashcard).join(
                Deck, Flashcard.deck_id == Deck.id
            ).outerjoin(
                CardReview, Flashcard.id == CardReview.flashcard_id
            ).filter(
                Deck.user_id == user_id,
                CardReview.id.is_(None),
                Flashcard.is_deleted == False,
                Deck.is_deleted == False
            ).limit(10).all()
            
            return self._success_response({
                'due_cards': [card.to_dict() for card in due_cards],
                'new_cards': [card.to_dict() for card in new_cards],
                'total_due': len(due_cards),
                'total_new': len(new_cards)
            })
            
        except Exception as e:
            self.logger.error(f"Error getting due cards: {str(e)}")
            return self._error_response('Error al obtener cartas pendientes')

class StatsService(BaseService):
    """Servicio para estadísticas y analytics"""
    
    def get_dashboard_stats(self, user_id):
        """Obtener estadísticas del dashboard"""
        try:
            # Cache key
            cache_key = f"dashboard_stats:{user_id}"
            cached_stats = cache_manager.get(cache_key)
            if cached_stats:
                return self._success_response(cached_stats)
            
            # Calcular estadísticas
            total_decks = Deck.query.filter_by(user_id=user_id, is_deleted=False).count()
            total_cards = db.session.query(Flashcard).join(Deck).filter(
                Deck.user_id == user_id,
                Flashcard.is_deleted == False,
                Deck.is_deleted == False
            ).count()
            
            # Estadísticas de estudio
            today = datetime.utcnow().date()
            cards_studied_today = CardReview.query.filter(
                CardReview.user_id == user_id,
                func.date(CardReview.reviewed_at) == today
            ).count()
            
            # Racha de estudio
            study_streak = self._calculate_study_streak(user_id)
            
            stats = {
                'total_decks': total_decks,
                'total_cards': total_cards,
                'cards_studied_today': cards_studied_today,
                'study_streak': study_streak,
                'cards_due': 0,  # Implementar
                'mastery_rate': 0  # Implementar
            }
            
            # Cache stats
            cache_manager.set(cache_key, stats, timeout=300)
            
            return self._success_response(stats)
            
        except Exception as e:
            self.logger.error(f"Error getting dashboard stats: {str(e)}")
            return self._error_response('Error al obtener estadísticas')
    
    def get_performance_analytics(self, user_id, period, deck_id=None):
        """Obtener analytics de rendimiento"""
        try:
            # Calcular fechas del período
            end_date = datetime.utcnow()
            if period == '7d':
                start_date = end_date - timedelta(days=7)
            elif period == '30d':
                start_date = end_date - timedelta(days=30)
            elif period == '90d':
                start_date = end_date - timedelta(days=90)
            else:
                start_date = end_date - timedelta(days=30)
            
            # Query base
            query = CardReview.query.filter(
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= start_date
            )
            
            if deck_id:
                query = query.join(Flashcard).filter(Flashcard.deck_id == deck_id)
            
            reviews = query.all()
            
            # Calcular métricas
            total_reviews = len(reviews)
            if total_reviews == 0:
                return self._success_response({
                    'total_reviews': 0,
                    'accuracy_rate': 0,
                    'average_response_time': 0,
                    'daily_breakdown': []
                })
            
            correct_reviews = len([r for r in reviews if r.rating >= 3])
            accuracy_rate = (correct_reviews / total_reviews) * 100
            
            avg_response_time = sum(r.response_time for r in reviews) / total_reviews
            
            # Breakdown diario
            daily_breakdown = self._calculate_daily_breakdown(reviews, start_date, end_date)
            
            analytics = {
                'total_reviews': total_reviews,
                'accuracy_rate': round(accuracy_rate, 2),
                'average_response_time': round(avg_response_time, 2),
                'daily_breakdown': daily_breakdown,
                'period': period
            }
            
            return self._success_response(analytics)
            
        except Exception as e:
            self.logger.error(f"Error getting performance analytics: {str(e)}")
            return self._error_response('Error al obtener analytics')
    
    def get_retention_analysis(self, user_id):
        """Obtener análisis de retención"""
        try:
            # Implementar análisis de retención de memoria
            # Por ahora, datos de ejemplo
            retention_data = {
                'retention_rates': {
                    '1_day': 85,
                    '3_days': 70,
                    '7_days': 60,
                    '30_days': 45
                },
                'forgetting_curve': [
                    {'days': 1, 'retention': 85},
                    {'days': 3, 'retention': 70},
                    {'days': 7, 'retention': 60},
                    {'days': 14, 'retention': 50},
                    {'days': 30, 'retention': 45}
                ]
            }
            
            return self._success_response(retention_data)
            
        except Exception as e:
            self.logger.error(f"Error getting retention analysis: {str(e)}")
            return self._error_response('Error al obtener análisis de retención')
    
    def get_progress_tracking(self, user_id):
        """Obtener seguimiento de progreso"""
        try:
            # Progreso por deck
            decks_progress = []
            decks = Deck.query.filter_by(user_id=user_id, is_deleted=False).all()
            
            for deck in decks:
                total_cards = Flashcard.query.filter_by(
                    deck_id=deck.id, is_deleted=False
                ).count()
                
                # Cartas con al menos una revisión exitosa
                mastered_cards = db.session.query(Flashcard).join(CardReview).filter(
                    Flashcard.deck_id == deck.id,
                    CardReview.rating >= 4,
                    Flashcard.is_deleted == False
                ).distinct().count()
                
                progress_rate = (mastered_cards / total_cards * 100) if total_cards > 0 else 0
                
                decks_progress.append({
                    'deck_id': deck.id,
                    'deck_name': deck.name,
                    'total_cards': total_cards,
                    'mastered_cards': mastered_cards,
                    'progress_rate': round(progress_rate, 2)
                })
            
            return self._success_response({
                'decks_progress': decks_progress,
                'overall_progress': sum(d['progress_rate'] for d in decks_progress) / len(decks_progress) if decks_progress else 0
            })
            
        except Exception as e:
            self.logger.error(f"Error getting progress tracking: {str(e)}")
            return self._error_response('Error al obtener seguimiento de progreso')
    
    def _calculate_study_streak(self, user_id):
        """Calcular racha de estudio"""
        try:
            # Obtener días únicos con revisiones
            study_days = db.session.query(
                func.date(CardReview.reviewed_at).label('study_date')
            ).filter(
                CardReview.user_id == user_id
            ).distinct().order_by(
                desc('study_date')
            ).all()
            
            if not study_days:
                return 0
            
            # Calcular racha consecutiva
            streak = 0
            current_date = datetime.utcnow().date()
            
            for study_day in study_days:
                if study_day.study_date == current_date:
                    streak += 1
                    current_date -= timedelta(days=1)
                elif study_day.study_date == current_date:
                    streak += 1
                    current_date -= timedelta(days=1)
                else:
                    break
            
            return streak
            
        except Exception as e:
            self.logger.error(f"Error calculating study streak: {str(e)}")
            return 0
    
    def _calculate_daily_breakdown(self, reviews, start_date, end_date):
        """Calcular breakdown diario de revisiones"""
        try:
            daily_data = {}
            current_date = start_date.date()
            end_date = end_date.date()
            
            # Inicializar todos los días con 0
            while current_date <= end_date:
                daily_data[current_date.isoformat()] = {
                    'date': current_date.isoformat(),
                    'reviews': 0,
                    'correct': 0,
                    'accuracy': 0
                }
                current_date += timedelta(days=1)
            
            # Contar revisiones por día
            for review in reviews:
                date_key = review.reviewed_at.date().isoformat()
                if date_key in daily_data:
                    daily_data[date_key]['reviews'] += 1
                    if review.rating >= 3:
                        daily_data[date_key]['correct'] += 1
            
            # Calcular accuracy
            for day_data in daily_data.values():
                if day_data['reviews'] > 0:
                    day_data['accuracy'] = round(
                        (day_data['correct'] / day_data['reviews']) * 100, 2
                    )
            
            return list(daily_data.values())
            
        except Exception as e:
            self.logger.error(f"Error calculating daily breakdown: {str(e)}")
            return []


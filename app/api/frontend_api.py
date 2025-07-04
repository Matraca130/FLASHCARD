"""
Endpoints específicos para integración frontend
APIs optimizadas para consumo desde aplicaciones web
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import User, Deck, Flashcard, StudySession, CardReview
from app.utils import get_current_user_id
from datetime import datetime, timedelta
import logging

# Blueprint para APIs frontend
frontend_api = Blueprint('frontend_api', __name__, url_prefix='/api/v1')
logger = logging.getLogger('app.frontend_api')

@frontend_api.route('/health', methods=['GET'])
def health_check():
    """Endpoint de health check para el frontend"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0',
        'services': {
            'database': 'connected',
            'authentication': 'active',
            'cache': 'active'
        }
    })

@frontend_api.route('/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Obtener perfil completo del usuario para el frontend"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Estadísticas del usuario
        total_decks = Deck.query.filter_by(user_id=user_id).count()
        total_cards = db.session.query(Flashcard).join(Deck).filter(Deck.user_id == user_id).count()
        total_reviews = CardReview.query.filter_by(user_id=user_id).count()
        
        # Actividad reciente
        recent_sessions = StudySession.query.filter_by(user_id=user_id)\
            .order_by(StudySession.created_at.desc()).limit(5).all()
        
        return jsonify({
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            },
            'statistics': {
                'total_decks': total_decks,
                'total_cards': total_cards,
                'total_reviews': total_reviews,
                'study_streak': 0  # TODO: Implementar cálculo de racha
            },
            'recent_activity': [
                {
                    'id': session.id,
                    'deck_name': session.deck.name,
                    'cards_studied': session.cards_studied,
                    'created_at': session.created_at.isoformat()
                } for session in recent_sessions
            ]
        })
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@frontend_api.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Obtener datos completos del dashboard para el frontend"""
    try:
        user_id = get_current_user_id()
        
        # Decks del usuario con estadísticas
        decks = db.session.query(Deck).filter_by(user_id=user_id).all()
        decks_data = []
        
        for deck in decks:
            total_cards = Flashcard.query.filter_by(deck_id=deck.id).count()
            due_cards = Flashcard.query.filter_by(deck_id=deck.id)\
                .filter(Flashcard.next_review <= datetime.utcnow()).count()
            
            decks_data.append({
                'id': deck.id,
                'name': deck.name,
                'description': deck.description,
                'total_cards': total_cards,
                'due_cards': due_cards,
                'created_at': deck.created_at.isoformat(),
                'updated_at': deck.updated_at.isoformat()
            })
        
        # Estadísticas de estudio recientes
        today = datetime.utcnow().date()
        week_ago = today - timedelta(days=7)
        
        daily_stats = []
        for i in range(7):
            date = week_ago + timedelta(days=i)
            reviews_count = CardReview.query.filter_by(user_id=user_id)\
                .filter(db.func.date(CardReview.reviewed_at) == date).count()
            
            daily_stats.append({
                'date': date.isoformat(),
                'reviews': reviews_count
            })
        
        return jsonify({
            'decks': decks_data,
            'statistics': {
                'total_decks': len(decks_data),
                'total_cards': sum(deck['total_cards'] for deck in decks_data),
                'due_cards': sum(deck['due_cards'] for deck in decks_data),
                'daily_stats': daily_stats
            }
        })
    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@frontend_api.route('/deck/<int:deck_id>/study-session', methods=['POST'])
@jwt_required()
def start_study_session(deck_id):
    """Iniciar sesión de estudio optimizada para frontend"""
    try:
        user_id = get_current_user_id()
        
        # Verificar que el deck pertenece al usuario
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return jsonify({'error': 'Deck no encontrado'}), 404
        
        # Obtener cartas pendientes de revisión
        due_cards = Flashcard.query.filter_by(deck_id=deck_id)\
            .filter(Flashcard.next_review <= datetime.utcnow())\
            .order_by(Flashcard.next_review.asc()).limit(20).all()
        
        if not due_cards:
            return jsonify({
                'message': 'No hay cartas pendientes de revisión',
                'cards': []
            })
        
        # Crear sesión de estudio
        session = StudySession(
            user_id=user_id,
            deck_id=deck_id,
            cards_studied=0
        )
        db.session.add(session)
        db.session.commit()
        
        # Formatear cartas para el frontend
        cards_data = []
        for card in due_cards:
            cards_data.append({
                'id': card.id,
                'front': card.front,
                'back': card.back,
                'difficulty': card.difficulty,
                'interval': card.interval,
                'ease_factor': card.ease_factor,
                'next_review': card.next_review.isoformat()
            })
        
        return jsonify({
            'session_id': session.id,
            'deck': {
                'id': deck.id,
                'name': deck.name
            },
            'cards': cards_data,
            'total_cards': len(cards_data)
        })
    except Exception as e:
        logger.error(f"Error starting study session: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@frontend_api.route('/study-session/<int:session_id>/review', methods=['POST'])
@jwt_required()
def review_card_frontend(session_id):
    """Revisar carta optimizado para frontend"""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        if not data or 'card_id' not in data or 'rating' not in data:
            return jsonify({'error': 'Datos requeridos: card_id, rating'}), 400
        
        card_id = data['card_id']
        rating = data['rating']
        
        # Validar rating
        if rating not in [1, 2, 3, 4]:
            return jsonify({'error': 'Rating debe ser 1-4 (Again, Hard, Good, Easy)'}), 400
        
        # Verificar sesión
        session = StudySession.query.filter_by(id=session_id, user_id=user_id).first()
        if not session:
            return jsonify({'error': 'Sesión no encontrada'}), 404
        
        # Obtener carta
        card = Flashcard.query.get(card_id)
        if not card:
            return jsonify({'error': 'Carta no encontrada'}), 404
        
        # Aplicar algoritmo de revisión espaciada
        from app.algorithms import calculate_fsrs
        
        result = calculate_fsrs(
            difficulty=card.difficulty,
            stability=card.stability,
            retrievability=card.retrievability,
            rating=rating,
            days_since_last_review=card.days_since_last_review or 0
        )
        
        # Actualizar carta
        card.difficulty = result['difficulty']
        card.stability = result['stability']
        card.retrievability = result['retrievability']
        card.interval = result['interval']
        card.next_review = datetime.utcnow() + timedelta(days=result['interval'])
        card.days_since_last_review = 0
        
        # Crear registro de revisión
        review = CardReview(
            user_id=user_id,
            flashcard_id=card_id,
            rating=rating,
            response_time=data.get('response_time', 0)
        )
        
        # Actualizar sesión
        session.cards_studied += 1
        session.updated_at = datetime.utcnow()
        
        db.session.add(review)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'card_updated': {
                'id': card.id,
                'next_review': card.next_review.isoformat(),
                'interval': card.interval,
                'difficulty': card.difficulty
            },
            'session_progress': {
                'cards_studied': session.cards_studied
            }
        })
    except Exception as e:
        logger.error(f"Error reviewing card: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@frontend_api.route('/search', methods=['GET'])
@jwt_required()
def search_content():
    """Búsqueda global optimizada para frontend"""
    try:
        user_id = get_current_user_id()
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'error': 'Parámetro de búsqueda requerido'}), 400
        
        # Buscar en decks
        decks = Deck.query.filter_by(user_id=user_id)\
            .filter(Deck.name.contains(query) | Deck.description.contains(query))\
            .limit(10).all()
        
        # Buscar en flashcards
        flashcards = db.session.query(Flashcard).join(Deck)\
            .filter(Deck.user_id == user_id)\
            .filter(Flashcard.front.contains(query) | Flashcard.back.contains(query))\
            .limit(20).all()
        
        return jsonify({
            'query': query,
            'results': {
                'decks': [
                    {
                        'id': deck.id,
                        'name': deck.name,
                        'description': deck.description,
                        'type': 'deck'
                    } for deck in decks
                ],
                'flashcards': [
                    {
                        'id': card.id,
                        'front': card.front,
                        'back': card.back,
                        'deck_name': card.deck.name,
                        'deck_id': card.deck_id,
                        'type': 'flashcard'
                    } for card in flashcards
                ]
            },
            'total_results': len(decks) + len(flashcards)
        })
    except Exception as e:
        logger.error(f"Error searching content: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500


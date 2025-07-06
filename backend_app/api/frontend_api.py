"""
Endpoints específicos para integración frontend
APIs optimizadas para consumo desde aplicaciones web
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from backend_app.extensions import db
from backend_app.models import User, Deck, Flashcard, StudySession, CardReview
from backend_app.services_new import (
    UserService,
    DeckService,
    FlashcardService,
    StudyService,
    StatsService,
)
from backend_app.utils import get_current_user_id
from backend_app.utils.statistics import calculate_study_streak
from datetime import datetime, timedelta
import logging

# Blueprint para APIs frontend
frontend_api = Blueprint("frontend_api", __name__, url_prefix="/api/v1")
logger = logging.getLogger("app.frontend_api")

# Instanciar servicios refactorizados con inyección de dependencias
user_service = UserService(db=db)
deck_service = DeckService(db=db)
flashcard_service = FlashcardService(db=db)
study_service = StudyService(db=db)
stats_service = StatsService(db=db)


@frontend_api.route("/health", methods=["GET"])
def health_check():
    """Endpoint de health check para el frontend"""
    return jsonify(
        {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": "connected",
                "authentication": "active",
                "cache": "active",
            },
        }
    )


@frontend_api.route("/user/profile", methods=["GET"])
@jwt_required()
def get_user_profile():
    """Obtener perfil completo del usuario para el frontend"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Estadísticas del usuario
        total_decks = Deck.query.filter_by(user_id=user_id).count()
        total_cards = db.session.query(Flashcard).join(Deck).filter(Deck.user_id == user_id).count()
        total_reviews = CardReview.query.filter_by(user_id=user_id).count()

        # Actividad reciente
        recent_sessions = (
            StudySession.query.filter_by(user_id=user_id).order_by(StudySession.created_at.desc()).limit(5).all()
        )

        return jsonify(
            {
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "created_at": user.created_at.isoformat(),
                    "last_login": (user.last_login.isoformat() if user.last_login else None),
                },
                "statistics": {
                    "total_decks": total_decks,
                    "total_cards": total_cards,
                    "total_reviews": total_reviews,
                    "study_streak": calculate_study_streak(user_id),  # Implemented study streak calculation
                },
                "recent_activity": [
                    {
                        "id": session.id,
                        "deck_name": session.deck.name,
                        "cards_studied": session.cards_studied,
                        "created_at": session.created_at.isoformat(),
                    }
                    for session in recent_sessions
                ],
            }
        )
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@frontend_api.route("/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard_data():
    """Obtener datos completos del dashboard para el frontend"""
    try:
        user_id = get_current_user_id()

        # Obtener decks del usuario
        decks = db.session.query(Deck).filter_by(user_id=user_id, is_deleted=False).all()

        # Usar consulta optimizada para estadísticas de decks
        from backend_app.models.models import QueryOptimizer

        deck_stats = QueryOptimizer.get_decks_stats(user_id)

        # Construir datos de decks con estadísticas optimizadas
        decks_data = []
        for deck in decks:
            stats = deck_stats.get(deck.id, {"total_cards": 0, "due_cards": 0})

            decks_data.append(
                {
                    "id": deck.id,
                    "name": deck.name,
                    "description": deck.description,
                    "total_cards": stats["total_cards"],
                    "due_cards": stats["due_cards"],
                    "created_at": deck.created_at.isoformat(),
                    "updated_at": deck.updated_at.isoformat(),
                }
            )

        # Estadísticas de estudio recientes (optimizada)
        today = datetime.utcnow().date()
        week_ago = today - timedelta(days=7)

        # Consulta agregada para estadísticas diarias
        daily_reviews = (
            db.session.query(
                db.func.date(CardReview.reviewed_at).label("review_date"),
                db.func.count(CardReview.id).label("reviews_count"),
            )
            .filter(
                CardReview.user_id == user_id,
                not CardReview.is_deleted,
                db.func.date(CardReview.reviewed_at) >= week_ago,
            )
            .group_by(db.func.date(CardReview.reviewed_at))
            .all()
        )

        # Crear diccionario para acceso rápido
        reviews_dict = {review.review_date: review.reviews_count for review in daily_reviews}

        # Construir estadísticas diarias
        daily_stats = []
        for i in range(7):
            date = week_ago + timedelta(days=i)
            reviews_count = reviews_dict.get(date, 0)

            daily_stats.append({"date": date.isoformat(), "reviews": reviews_count})

        return jsonify(
            {
                "decks": decks_data,
                "statistics": {
                    "total_decks": len(decks_data),
                    "total_cards": sum(deck["total_cards"] for deck in decks_data),
                    "due_cards": sum(deck["due_cards"] for deck in decks_data),
                    "daily_stats": daily_stats,
                },
            }
        )
    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


# ENDPOINTS OBSOLETOS COMENTADOS - Usar /api/study/ en su lugar
# @frontend_api.route('/deck/<int:deck_id>/study-session', methods=['POST'])
# @jwt_required()
# def start_study_session(deck_id):
#     """DEPRECATED: Use /api/study/session instead"""
#     return jsonify({
#         'error': 'Este endpoint está deprecated. Use /api/study/session',
#         'redirect_to': '/api/study/session'
#     }), 410  # Gone

# @frontend_api.route('/study-session/<int:session_id>/review', methods=['POST'])
# @jwt_required()
# def review_card_frontend(session_id):
#     """DEPRECATED: Use /api/study/card/answer instead"""
#     return jsonify({
#         'error': 'Este endpoint está deprecated. Use /api/study/card/answer',
#         'redirect_to': '/api/study/card/answer'
#     }), 410  # Gone


@frontend_api.route("/search", methods=["GET"])
@jwt_required()
def search_content():
    """Búsqueda global optimizada para frontend"""
    try:
        user_id = get_current_user_id()
        query = request.args.get("q", "").strip()

        if not query:
            return jsonify({"error": "Parámetro de búsqueda requerido"}), 400

        # Buscar en decks
        decks = (
            Deck.query.filter_by(user_id=user_id)
            .filter(Deck.name.contains(query) | Deck.description.contains(query))
            .limit(10)
            .all()
        )

        # Buscar en flashcards
        flashcards = (
            db.session.query(Flashcard)
            .join(Deck)
            .filter(Deck.user_id == user_id)
            .filter(Flashcard.front.contains(query) | Flashcard.back.contains(query))
            .limit(20)
            .all()
        )

        return jsonify(
            {
                "query": query,
                "results": {
                    "decks": [
                        {
                            "id": deck.id,
                            "name": deck.name,
                            "description": deck.description,
                            "type": "deck",
                        }
                        for deck in decks
                    ],
                    "flashcards": [
                        {
                            "id": card.id,
                            "front": card.front,
                            "back": card.back,
                            "deck_name": card.deck.name,
                            "deck_id": card.deck_id,
                            "type": "flashcard",
                        }
                        for card in flashcards
                    ],
                },
                "total_results": len(decks) + len(flashcards),
            }
        )
    except Exception as e:
        logger.error(f"Error searching content: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

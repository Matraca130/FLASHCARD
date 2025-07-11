"""
Rutas de estudio para StudyingFlash
Compatible con frontend existente - CRÍTICO para conexión frontend-backend
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend_app.models import User, Deck, Flashcard, StudySession, CardReview
from backend_app.services_new import StudyService
from backend_app.utils import calculate_fsrs, calculate_sm2, get_next_review_date
from backend_app.extensions import db
from backend_app.validation.schemas import StudyAnswerSchema
from backend_app.validation.validators import validate_json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
study_bp = Blueprint("study", __name__)

# Usar servicio refactorizado con inyección de dependencias
study_service = StudyService(db=db)


@study_bp.route("/session", methods=["POST"])
@jwt_required()
def start_study_session():
    """
    Iniciar sesión de estudio - Compatible con frontend
    POST /api/study/session
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400

        deck_id = data.get("deck_id")
        if not deck_id:
            return jsonify({"error": "deck_id es requerido"}), 400

        # Verificar que el deck pertenece al usuario
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return jsonify({"error": "Deck no encontrado"}), 404

        # Usar servicio para crear sesión
        result = study_service.start_study_session(user_id, deck_id, algorithm=data.get("algorithm", "fsrs"))
        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        session_data = result["data"]

        return (
            jsonify(
                {
                    "success": True,
                    "session": session_data["session"],
                    "cards": session_data["cards"],
                    "total_cards": len(session_data["cards"]),
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error iniciando sesión: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500











@study_bp.route("/card/answer", methods=["POST"])
@jwt_required()
@validate_json(StudyAnswerSchema)
def answer_card(validated_data):
    try:
        user_id = get_jwt_identity()
        card_id = validated_data["card_id"]
        quality = validated_data["quality"]
        session_id = validated_data["session_id"]


        result = study_service.review_card(session_id, user_id, card_id, quality, validated_data.get("response_time"))
        if not result["success"]:
            return jsonify({"error": result["error"]}), 400
        return jsonify(result["data"]), 200
    except Exception as e:
        logger.error(f"Error procesando respuesta de carta: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor"}), 500


@study_bp.route("/session/<int:session_id>/end", methods=["POST"])
@jwt_required()
def end_study_session(session_id):
    """
    Finalizar sesión de estudio
    POST /api/study/session/<id>/end
    """
    try:
        user_id = get_jwt_identity()

        session = StudySession.query.filter_by(
            id=session_id, user_id=user_id).first()

        if not session:
            return jsonify({"error": "Sesión no encontrada"}), 404

        # Finalizar sesión
        session.ended_at = datetime.utcnow()
        session.total_time = (
            session.ended_at
            - session.started_at).total_seconds()

        # Actualizar tiempo total de estudio del usuario
        user = User.query.get(user_id)
        user.total_study_time += int(session.total_time / 60)  # en minutos

        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "session": {
                        "id": session.id,
                        "cards_studied": session.cards_studied,
                        "cards_correct": session.cards_correct,
                        "total_time": session.total_time,
                        "accuracy": (
                            round(
                                (session.cards_correct / session.cards_studied) * 100,
                                1) if session.cards_studied > 0 else 0),
                    },
                }),
            200,
        )

    except Exception as e:
        logger.error(f"Error finalizando sesión: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor"}), 500


@study_bp.route("/cards/due", methods=["GET"])
@jwt_required()
def get_due_cards():
    """
    Obtener cartas que necesitan revisión
    GET /api/study/cards/due
    """
    try:
        user_id = get_jwt_identity()

        result = study_service.get_due_cards(user_id)
        if not result["success"]:
            return jsonify({"error": result["error"]}), 400
        return jsonify(result["data"]), 200
    except Exception as e:
        logger.error(f"Error obteniendo cartas pendientes: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

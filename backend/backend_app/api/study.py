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
        result = study_service.start_session(user_id, deck_id, data)

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


def _validate_answer(user_id, card_id, session_id):
    card = db.session.query(Flashcard).join(Deck).filter(
        Flashcard.id == card_id, Deck.user_id == user_id).first()
    if not card:
        return None, None, jsonify({"error": "Carta no encontrada"}), 404

    session = StudySession.query.filter_by(
        id=session_id, user_id=user_id).first()
    if not session:
        return None, None, jsonify({"error": "Sesión no encontrada"}), 404

    return card, session, None, None


def _update_card_and_review(card, session, quality, validated_data):
    algorithm = session.algorithm or "fsrs"
    previous_interval = card.interval_days

    if algorithm == "fsrs":
        elapsed_days = 0
        if card.last_reviewed:
            elapsed_days = (datetime.utcnow() - card.last_reviewed).days
        new_stability, new_difficulty, new_interval = calculate_fsrs(
            quality, card.stability, card.difficulty_fsrs, elapsed_days)
        card.stability = new_stability
        card.difficulty_fsrs = new_difficulty
        card.interval_days = new_interval
        card.repetitions += 1
    elif algorithm in ("sm2", "ultra_sm2", "anki"):
        new_ease_factor, new_interval, new_repetitions = calculate_sm2(
            quality, card.ease_factor, card.interval_days, card.repetitions)

        if algorithm == "ultra_sm2":
            min_factor = 1.3
            max_factor = 3.0
            new_ease_factor = max(min_factor, min(max_factor, new_ease_factor))
        elif algorithm == "anki":
            if card.repetitions == 0 and quality >= 3:
                new_interval = 1
            elif card.repetitions == 1 and quality >= 3:
                new_interval = 4
            elif quality < 3:
                new_interval = 1
                new_repetitions = 0

        card.ease_factor = new_ease_factor
        card.interval_days = new_interval
        card.repetitions = new_repetitions
    else:
        new_ease_factor, new_interval, new_repetitions = calculate_sm2(
            quality, card.ease_factor, card.interval_days, card.repetitions)
        card.ease_factor = new_ease_factor
        card.interval_days = new_interval
        card.repetitions = new_repetitions

    card.last_reviewed = datetime.utcnow()
    card.next_review = get_next_review_date(card.interval_days)

    review = CardReview(
        flashcard_id=card.id,
        session_id=session.id,
        rating=quality,
        previous_interval=previous_interval,
        new_interval=card.interval_days,
        response_time=validated_data.get("response_time", 0),
    )
    db.session.add(review)
    return review, algorithm


def _update_session_and_user_stats(session, user, quality):
    session.cards_studied += 1
    if quality >= 3:
        session.cards_correct += 1

    user.total_cards_studied += 1
    if quality >= 3:
        user.total_cards_correct += 1


def _build_response(card, review, session, algorithm, quality):
    return (
        jsonify(
            {
                "success": True,
                "card": {
                    "id": card.id,
                    "interval": card.interval_days,
                    "next_review": card.next_review.isoformat(),
                    "difficulty": card.difficulty,
                    "stability": card.stability,
                    "repetitions": card.repetitions,
                },
                "review": {
                    "id": review.id,
                    "quality": quality,
                    "new_interval": card.interval_days,
                    "algorithm": algorithm,
                },
                "session_stats": {
                    "cards_studied": session.cards_studied,
                    "cards_correct": session.cards_correct,
                    "accuracy": (
                        round(
                            (session.cards_correct / session.cards_studied) * 100,
                            1) if session.cards_studied > 0 else 0),
                },
            }),
        200,
    )


@study_bp.route("/card/answer", methods=["POST"])
@jwt_required()
@validate_json(StudyAnswerSchema)
def answer_card(validated_data):
    try:
        user_id = get_jwt_identity()
        card_id = validated_data["card_id"]
        quality = validated_data["quality"]
        session_id = validated_data["session_id"]

        card, session, error_response, status_code = _validate_answer(
            user_id, card_id, session_id)
        if error_response:
            return error_response, status_code

        review, algorithm = _update_card_and_review(
            card, session, quality, validated_data)

        user = User.query.get(user_id)
        _update_session_and_user_stats(session, user, quality)

        db.session.commit()

        return _build_response(card, review, session, algorithm, quality)

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

        # Obtener cartas que necesitan revisión
        now = datetime.utcnow()
        due_cards = (
            db.session.query(Flashcard)
            .join(Deck)
            .filter(Deck.user_id == user_id, Flashcard.next_review <= now)
            .limit(50)
            .all()
        )

        cards_data = []
        for card in due_cards:
            cards_data.append(
                {
                    "id": card.id,
                    "front": card.front,
                    "back": card.back,
                    "deck_id": card.deck_id,
                    "deck_name": card.deck.name,
                    "interval": card.interval_days,
                    "difficulty": card.difficulty,
                    "next_review": card.next_review.isoformat(),
                }
            )

        return (
            jsonify({"success": True, "cards": cards_data, "total": len(cards_data)}),
            200,
        )

    except Exception as e:
        logger.error(f"Error obteniendo cartas pendientes: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

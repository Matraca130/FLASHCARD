"""
Rutas de gestión de decks para StudyingFlash
Compatible con frontend existente
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend_app.models import Deck, Flashcard
from backend_app.services_new import DeckService
from backend_app.extensions import db
from backend_app.validation.schemas import DeckCreationSchema
from backend_app.validation.validators import validate_json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
decks_bp = Blueprint("decks", __name__)

# Usar servicio refactorizado con inyección de dependencias
deck_service = DeckService(db=db)


@decks_bp.route("/", methods=["GET"])
@jwt_required()
def get_decks():
    """
    Obtener todos los decks del usuario - Compatible con frontend
    GET /api/decks/
    """
    try:
        user_id = get_jwt_identity()

        # Obtener parámetros de consulta
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search", "")

        # Usar servicio para obtener decks
        result = deck_service.get_user_decks(user_id, page, per_page, search)

        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        decks_data = result["data"]

        return (
            jsonify(
                {
                    "success": True,
                    "decks": decks_data["decks"],
                    "pagination": decks_data["pagination"],
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error obteniendo decks: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@decks_bp.route("/", methods=["POST"])
@jwt_required()
@validate_json(DeckCreationSchema)
def create_deck(validated_data):
    """
    Crear nuevo deck - Compatible con frontend
    POST /api/decks/
    """
    try:
        user_id = get_jwt_identity()

        # Usar servicio para crear deck con datos validados
        result = deck_service.create_deck(user_id, validated_data)

        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        deck_data = result["data"]

        return (
            jsonify(
                {
                    "success": True,
                    "deck": deck_data,
                    "message": "Deck creado exitosamente",
                }
            ),
            201,
        )

    except Exception as e:
        logger.error(f"Error creando deck: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@decks_bp.route("/<int:deck_id>", methods=["GET"])
@jwt_required()
def get_deck(deck_id):
    """
    Obtener deck específico con sus flashcards
    GET /api/decks/<id>
    """
    try:
        user_id = get_jwt_identity()

        # Verificar que el deck pertenece al usuario
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return jsonify({"error": "Deck no encontrado"}), 404

        # Obtener flashcards del deck
        flashcards = Flashcard.query.filter_by(deck_id=deck_id).all()

        flashcards_data = []
        for card in flashcards:
            flashcards_data.append(
                {
                    "id": card.id,
                    "front": card.front,
                    "back": card.back,
                    "interval": card.interval,
                    "difficulty": card.difficulty,
                    "next_review": (card.next_review.isoformat() if card.next_review else None),
                    "created_at": card.created_at.isoformat(),
                }
            )

        deck_data = {
            "id": deck.id,
            "name": deck.name,
            "description": deck.description,
            "is_public": deck.is_public,
            "total_cards": len(flashcards_data),
            "cards_due": len([c for c in flashcards if c.next_review and c.next_review <= datetime.utcnow()]),
            "created_at": deck.created_at.isoformat(),
            "updated_at": deck.updated_at.isoformat(),
            "flashcards": flashcards_data,
        }

        return jsonify({"success": True, "deck": deck_data}), 200

    except Exception as e:
        logger.error(f"Error obteniendo deck: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@decks_bp.route("/<int:deck_id>", methods=["PUT"])
@jwt_required()
def update_deck(deck_id):
    """
    Actualizar deck existente
    PUT /api/decks/<id>
    """
    try:
        user_id = get_jwt_identity()

        # Verificar que el deck pertenece al usuario
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return jsonify({"error": "Deck no encontrado"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400

        # Usar servicio para actualizar
        result = deck_service.update_deck(deck_id, data)

        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        deck_data = result["data"]

        return (
            jsonify(
                {
                    "success": True,
                    "deck": deck_data,
                    "message": "Deck actualizado exitosamente",
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error actualizando deck: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@decks_bp.route("/<int:deck_id>", methods=["DELETE"])
@jwt_required()
def delete_deck(deck_id):
    """
    Eliminar deck (soft delete)
    DELETE /api/decks/<id>
    """
    try:
        user_id = get_jwt_identity()

        # Verificar que el deck pertenece al usuario
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return jsonify({"error": "Deck no encontrado"}), 404

        # Usar servicio para eliminar
        result = deck_service.delete_deck(deck_id)

        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        return jsonify({"success": True, "message": "Deck eliminado exitosamente"}), 200

    except Exception as e:
        logger.error(f"Error eliminando deck: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@decks_bp.route("/<int:deck_id>/export", methods=["GET"])
@jwt_required()
def export_deck(deck_id):
    """
    Exportar deck en formato JSON
    GET /api/decks/<id>/export
    """
    try:
        user_id = get_jwt_identity()

        # Verificar que el deck pertenece al usuario
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return jsonify({"error": "Deck no encontrado"}), 404

        # Usar servicio para exportar
        result = deck_service.export_deck(deck_id)

        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        export_data = result["data"]

        return (
            jsonify(
                {
                    "success": True,
                    "export_data": export_data,
                    "filename": f"{deck.name.replace(' ', '_')}_export.json",
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error exportando deck: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@decks_bp.route("/import", methods=["POST"])
@jwt_required()
def import_deck():
    """
    Importar deck desde archivo JSON/CSV
    POST /api/decks/import
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400

        # Usar servicio para importar
        result = deck_service.import_deck(user_id, data)

        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        import_data = result["data"]

        return (
            jsonify(
                {
                    "success": True,
                    "deck": import_data["deck"],
                    "imported_cards": import_data["imported_cards"],
                    "message": f"Deck importado exitosamente con {import_data['imported_cards']} cartas",
                }
            ),
            201,
        )

    except Exception as e:
        logger.error(f"Error importando deck: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@decks_bp.route("/public", methods=["GET"])
def get_public_decks():
    """
    Obtener decks públicos disponibles
    GET /api/decks/public
    """
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search", "")

        # Consulta de decks públicos
        query = Deck.query.filter_by(is_public=True)

        if search:
            query = query.filter(Deck.name.contains(search))

        decks = query.paginate(page=page, per_page=per_page, error_out=False)

        decks_data = []
        for deck in decks.items:
            # Contar flashcards
            card_count = Flashcard.query.filter_by(deck_id=deck.id).count()

            decks_data.append(
                {
                    "id": deck.id,
                    "name": deck.name,
                    "description": deck.description,
                    "total_cards": card_count,
                    "author": f"{deck.owner.first_name} {deck.owner.last_name}",
                    "created_at": deck.created_at.isoformat(),
                }
            )

        return (
            jsonify(
                {
                    "success": True,
                    "decks": decks_data,
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total": decks.total,
                        "pages": decks.pages,
                        "has_next": decks.has_next,
                        "has_prev": decks.has_prev,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error obteniendo decks públicos: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

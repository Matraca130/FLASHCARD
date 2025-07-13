"""
Rutas de gestión de flashcards para StudyingFlash
Compatible con frontend existente
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend_app.models import User, Deck, Flashcard
from backend_app.services_new import FlashcardService
from backend_app.extensions import db
from backend_app.validation.schemas import FlashcardCreationSchema
from backend_app.validation.validators import validate_json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
flashcards_bp = Blueprint('flashcards', __name__)

# Usar servicio refactorizado con inyección de dependencias
flashcard_service = FlashcardService(db=db)

@flashcards_bp.route('/', methods=['POST'])
@jwt_required()
@validate_json(FlashcardCreationSchema)
def create_flashcard(validated_data):
    """
    Crear nueva flashcard - Compatible con frontend
    POST /api/flashcards/
    """
    try:
        user_id = get_jwt_identity()
        
        # Usar servicio para crear flashcard con datos validados
        result = flashcard_service.create_flashcard(user_id, validated_data)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 400
        
        flashcard_data = result['data']
        
        return jsonify({
            'success': True,
            'flashcard': flashcard_data,
            'message': 'Flashcard creada exitosamente'
        }), 201
        
    except Exception as e:
        logger.error(f"Error creando flashcard: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@flashcards_bp.route('/<int:flashcard_id>', methods=['GET'])
@jwt_required()
def get_flashcard(flashcard_id):
    """
    Obtener flashcard específica
    GET /api/flashcards/<id>
    """
    try:
        user_id = get_jwt_identity()
        
        # Verificar que la flashcard pertenece al usuario
        flashcard = db.session.query(Flashcard).join(Deck).filter(
            Flashcard.id == flashcard_id,
            Deck.user_id == user_id
        ).first()
        
        if not flashcard:
            return jsonify({'error': 'Flashcard no encontrada'}), 404
        
        flashcard_data = {
            'id': flashcard.id,
            'front': flashcard.front,
            'back': flashcard.back,
            'deck_id': flashcard.deck_id,
            'deck_name': flashcard.deck.name,
            'interval': flashcard.interval,
            'difficulty': flashcard.difficulty,
            'stability': flashcard.stability,
            'retrievability': flashcard.retrievability,
            'repetitions': flashcard.repetitions,
            'last_review': flashcard.last_review.isoformat() if flashcard.last_review else None,
            'next_review': flashcard.next_review.isoformat() if flashcard.next_review else None,
            'created_at': flashcard.created_at.isoformat(),
            'updated_at': flashcard.updated_at.isoformat()
        }
        
        return jsonify({
            'success': True,
            'flashcard': flashcard_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo flashcard: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@flashcards_bp.route('/<int:flashcard_id>', methods=['PUT'])
@jwt_required()
def update_flashcard(flashcard_id):
    """
    Actualizar flashcard existente
    PUT /api/flashcards/<id>
    """
    try:
        user_id = get_jwt_identity()
        
        # Verificar que la flashcard pertenece al usuario
        flashcard = db.session.query(Flashcard).join(Deck).filter(
            Flashcard.id == flashcard_id,
            Deck.user_id == user_id
        ).first()
        
        if not flashcard:
            return jsonify({'error': 'Flashcard no encontrada'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        # Usar servicio para actualizar
        result = flashcard_service.update_flashcard(flashcard_id, data)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 400
        
        flashcard_data = result['data']
        
        return jsonify({
            'success': True,
            'flashcard': flashcard_data,
            'message': 'Flashcard actualizada exitosamente'
        }), 200
        
    except Exception as e:
        logger.error(f"Error actualizando flashcard: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@flashcards_bp.route('/<int:flashcard_id>', methods=['DELETE'])
@jwt_required()
def delete_flashcard(flashcard_id):
    """
    Eliminar flashcard (soft delete)
    DELETE /api/flashcards/<id>
    """
    try:
        user_id = get_jwt_identity()
        
        # Verificar que la flashcard pertenece al usuario
        flashcard = db.session.query(Flashcard).join(Deck).filter(
            Flashcard.id == flashcard_id,
            Deck.user_id == user_id
        ).first()
        
        if not flashcard:
            return jsonify({'error': 'Flashcard no encontrada'}), 404
        
        # Usar servicio para eliminar
        result = flashcard_service.delete_flashcard(flashcard_id)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 400
        
        return jsonify({
            'success': True,
            'message': 'Flashcard eliminada exitosamente'
        }), 200
        
    except Exception as e:
        logger.error(f"Error eliminando flashcard: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@flashcards_bp.route('/deck/<int:deck_id>', methods=['GET'])
@jwt_required()
def get_deck_flashcards(deck_id):
    """
    Obtener todas las flashcards de un deck
    GET /api/flashcards/deck/<deck_id>
    """
    try:
        user_id = get_jwt_identity()
        
        # Verificar que el deck pertenece al usuario
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return jsonify({'error': 'Deck no encontrado'}), 404
        
        # Obtener parámetros de consulta
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')
        
        # Consulta de flashcards
        query = Flashcard.query.filter_by(deck_id=deck_id)
        
        if search:
            query = query.filter(
                db.or_(
                    Flashcard.front.contains(search),
                    Flashcard.back.contains(search)
                )
            )
        
        flashcards = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        flashcards_data = []
        for card in flashcards.items:
            flashcards_data.append({
                'id': card.id,
                'front': card.front,
                'back': card.back,
                'interval': card.interval,
                'difficulty': card.difficulty,
                'next_review': card.next_review.isoformat() if card.next_review else None,
                'created_at': card.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'flashcards': flashcards_data,
            'deck': {
                'id': deck.id,
                'name': deck.name
            },
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': flashcards.total,
                'pages': flashcards.pages,
                'has_next': flashcards.has_next,
                'has_prev': flashcards.has_prev
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo flashcards del deck: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@flashcards_bp.route('/bulk', methods=['POST'])
@jwt_required()
def create_bulk_flashcards():
    """
    Crear múltiples flashcards de una vez
    POST /api/flashcards/bulk
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        deck_id = data.get('deck_id')
        flashcards_data = data.get('flashcards', [])
        
        if not deck_id:
            return jsonify({'error': 'deck_id es requerido'}), 400
        
        if not flashcards_data:
            return jsonify({'error': 'Se requiere al menos una flashcard'}), 400
        
        # Verificar que el deck pertenece al usuario
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return jsonify({'error': 'Deck no encontrado'}), 404
        
        # Usar servicio para crear flashcards en lote
        result = flashcard_service.create_bulk_flashcards(deck_id, flashcards_data)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 400
        
        bulk_data = result['data']
        
        return jsonify({
            'success': True,
            'created_count': bulk_data['created_count'],
            'flashcards': bulk_data['flashcards'],
            'message': f"{bulk_data['created_count']} flashcards creadas exitosamente"
        }), 201
        
    except Exception as e:
        logger.error(f"Error creando flashcards en lote: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500


"""
API de Flashcards actualizada con nomenclatura unificada y soporte multimedia
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend_app.models import Flashcard, Deck, User
from backend_app.extensions import db
from backend_app.utils.algorithms import calculate_fsrs, calculate_sm2, get_next_review_date
from backend_app.validation.schemas import FlashcardSchema, FlashcardUpdateSchema
from datetime import datetime
import logging

logger = logging.getLogger('app.api.flashcards')
flashcards_bp = Blueprint('flashcards', __name__)

# Esquemas de validación
flashcard_schema = FlashcardSchema()
flashcard_update_schema = FlashcardUpdateSchema()

@flashcards_bp.route('/flashcards', methods=['POST'])
@jwt_required()
def create_flashcard():
    """
    Crear nueva flashcard con soporte multimedia y nomenclatura unificada
    
    Body (formato unificado):
    {
        "deck_id": 123,
        "front_content": {
            "text": "¿Cuál es la capital de Francia?",
            "image_url": "https://example.com/france.jpg",
            "audio_url": null
        },
        "back_content": {
            "text": "París",
            "image_url": "https://example.com/paris.jpg",
            "audio_url": null
        },
        "difficulty": "normal",
        "tags": ["geography", "capitals"],
        "notes": "Flashcard con imágenes"
    }
    
    Body (formato legacy - compatibilidad):
    {
        "deck_id": 123,
        "front": "¿Cuál es la capital de Francia?",
        "back": "París",
        "front_image_url": "https://example.com/france.jpg",
        "back_image_url": "https://example.com/paris.jpg"
    }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validar que el deck existe y pertenece al usuario
        deck = Deck.query.filter_by(
            id=data.get('deck_id'),
            user_id=user_id,
            is_deleted=False
        ).first()
        
        if not deck:
            return jsonify({'error': 'Deck not found or access denied'}), 404
        
        # Detectar formato de datos (unificado vs legacy)
        is_unified_format = 'front_content' in data or 'back_content' in data
        
        # Crear flashcard
        flashcard = Flashcard(deck_id=deck.id)
        
        if is_unified_format:
            # Formato unificado
            if 'front_content' in data:
                flashcard.front_content = data['front_content']
            if 'back_content' in data:
                flashcard.back_content = data['back_content']
        else:
            # Formato legacy - mapear a nueva estructura
            if 'front' in data or 'front_text' in data:
                flashcard.front_text = data.get('front') or data.get('front_text')
            if 'back' in data or 'back_text' in data:
                flashcard.back_text = data.get('back') or data.get('back_text')
            
            # Mapear campos multimedia legacy
            if 'front_image_url' in data:
                flashcard.front_image_url = data['front_image_url']
            if 'back_image_url' in data:
                flashcard.back_image_url = data['back_image_url']
            if 'front_audio_url' in data:
                flashcard.front_audio_url = data['front_audio_url']
            if 'back_audio_url' in data:
                flashcard.back_audio_url = data['back_audio_url']
        
        # Establecer metadatos
        flashcard.difficulty = data.get('difficulty', 'normal')
        flashcard.notes = data.get('notes')
        
        # Manejar tags
        if 'tags' in data:
            flashcard.tags_list = data['tags']
        
        # Configurar algoritmo inicial
        algorithm_type = data.get('algorithm_type', 'fsrs')
        flashcard.algorithm_type = algorithm_type
        
        # Validar contenido antes de guardar
        try:
            flashcard.validate_content()
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        
        # Guardar en base de datos
        db.session.add(flashcard)
        db.session.commit()
        
        # Actualizar estadísticas del deck
        deck.update_stats()
        db.session.commit()
        
        logger.info(f"Flashcard {flashcard.id} created for deck {deck.id} by user {user_id}")
        
        # Retornar en formato unificado por defecto
        return jsonify({
            'success': True,
            'data': flashcard.to_dict(unified_format=True),
            'message': 'Flashcard created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating flashcard: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@flashcards_bp.route('/flashcards/<int:flashcard_id>', methods=['GET'])
@jwt_required()
def get_flashcard(flashcard_id):
    """
    Obtener flashcard por ID con formato unificado
    
    Query params:
    - format: 'unified' (default) | 'legacy'
    - include_content: true (default) | false
    """
    try:
        user_id = get_jwt_identity()
        format_type = request.args.get('format', 'unified')
        include_content = request.args.get('include_content', 'true').lower() == 'true'
        
        # Buscar flashcard que pertenezca al usuario
        flashcard = db.session.query(Flashcard).join(Deck).filter(
            Flashcard.id == flashcard_id,
            Deck.user_id == user_id,
            Flashcard.is_deleted == False
        ).first()
        
        if not flashcard:
            return jsonify({'error': 'Flashcard not found'}), 404
        
        unified_format = format_type == 'unified'
        
        return jsonify({
            'success': True,
            'data': flashcard.to_dict(
                include_content=include_content,
                unified_format=unified_format
            )
        })
        
    except Exception as e:
        logger.error(f"Error getting flashcard {flashcard_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@flashcards_bp.route('/flashcards/<int:flashcard_id>', methods=['PUT'])
@jwt_required()
def update_flashcard(flashcard_id):
    """
    Actualizar flashcard con soporte para ambos formatos
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Buscar flashcard
        flashcard = db.session.query(Flashcard).join(Deck).filter(
            Flashcard.id == flashcard_id,
            Deck.user_id == user_id,
            Flashcard.is_deleted == False
        ).first()
        
        if not flashcard:
            return jsonify({'error': 'Flashcard not found'}), 404
        
        # Detectar formato
        is_unified_format = 'front_content' in data or 'back_content' in data
        
        if is_unified_format:
            # Actualizar con formato unificado
            if 'front_content' in data:
                flashcard.front_content = data['front_content']
            if 'back_content' in data:
                flashcard.back_content = data['back_content']
            if 'algorithm_data' in data:
                flashcard.algorithm_data = data['algorithm_data']
        else:
            # Actualizar con formato legacy
            for field in ['front_text', 'back_text', 'front', 'back']:
                if field in data:
                    if field in ['front', 'front_text']:
                        flashcard.front_text = data[field]
                    elif field in ['back', 'back_text']:
                        flashcard.back_text = data[field]
            
            # Campos multimedia
            multimedia_fields = [
                'front_image_url', 'back_image_url',
                'front_audio_url', 'back_audio_url'
            ]
            for field in multimedia_fields:
                if field in data:
                    setattr(flashcard, field, data[field])
            
            # Campos de algoritmo
            algorithm_fields = [
                'ease_factor', 'interval_days', 'interval', 'repetitions',
                'stability', 'difficulty_fsrs', 'algorithm_type'
            ]
            for field in algorithm_fields:
                if field in data:
                    if field == 'interval':
                        flashcard.interval_days = data[field]
                    else:
                        setattr(flashcard, field, data[field])
        
        # Actualizar metadatos comunes
        for field in ['difficulty', 'notes']:
            if field in data:
                setattr(flashcard, field, data[field])
        
        if 'tags' in data:
            flashcard.tags_list = data['tags']
        
        # Validar contenido
        try:
            flashcard.validate_content()
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        
        flashcard.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Flashcard {flashcard_id} updated by user {user_id}")
        
        return jsonify({
            'success': True,
            'data': flashcard.to_dict(unified_format=True),
            'message': 'Flashcard updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating flashcard {flashcard_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@flashcards_bp.route('/flashcards/<int:flashcard_id>/review', methods=['POST'])
@jwt_required()
def review_flashcard(flashcard_id):
    """
    Procesar revisión de flashcard con algoritmos unificados
    
    Body:
    {
        "rating": 3,  // 1=Again, 2=Hard, 3=Good, 4=Easy
        "response_time": 1500,  // milisegundos
        "algorithm_type": "fsrs"  // opcional, usa el configurado en la carta
    }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'rating' not in data:
            return jsonify({'error': 'Rating is required'}), 400
        
        rating = data['rating']
        if rating not in [1, 2, 3, 4]:
            return jsonify({'error': 'Rating must be between 1 and 4'}), 400
        
        # Buscar flashcard
        flashcard = db.session.query(Flashcard).join(Deck).filter(
            Flashcard.id == flashcard_id,
            Deck.user_id == user_id,
            Flashcard.is_deleted == False
        ).first()
        
        if not flashcard:
            return jsonify({'error': 'Flashcard not found'}), 404
        
        # Determinar algoritmo a usar
        algorithm_type = data.get('algorithm_type', flashcard.algorithm_type)
        
        # Guardar estado anterior para el historial
        previous_state = {
            'ease_factor': flashcard.ease_factor,
            'interval': flashcard.interval_days,
            'stability': flashcard.stability,
            'difficulty': flashcard.difficulty_fsrs
        }
        
        # Calcular nuevos valores según el algoritmo
        if algorithm_type == 'fsrs':
            # Calcular días transcurridos
            elapsed_days = 0
            if flashcard.last_reviewed:
                elapsed_days = (datetime.utcnow() - flashcard.last_reviewed).days
            
            new_stability, new_difficulty, new_interval = calculate_fsrs(
                rating=rating,
                stability=flashcard.stability,
                difficulty=flashcard.difficulty_fsrs,
                elapsed_days=elapsed_days
            )
            
            flashcard.stability = new_stability
            flashcard.difficulty_fsrs = new_difficulty
            flashcard.interval_days = new_interval
            
        elif algorithm_type in ['sm2', 'ultra_sm2']:
            new_ease_factor, new_interval, new_repetitions = calculate_sm2(
                rating=rating,
                ease_factor=flashcard.ease_factor,
                interval=flashcard.interval_days,
                repetitions=flashcard.repetitions
            )
            
            flashcard.ease_factor = new_ease_factor
            flashcard.interval_days = new_interval
            flashcard.repetitions = new_repetitions
            
            # Para Ultra SM-2, aplicar ajustes adicionales
            if algorithm_type == 'ultra_sm2':
                # Ajuste dinámico basado en historial
                if flashcard.total_reviews > 5:
                    accuracy = flashcard.accuracy_rate / 100
                    if accuracy > 0.9:
                        flashcard.interval_days = int(flashcard.interval_days * 1.2)
                    elif accuracy < 0.7:
                        flashcard.interval_days = max(1, int(flashcard.interval_days * 0.8))
        
        # Actualizar timestamps y estadísticas
        flashcard.next_review = get_next_review_date(flashcard.interval_days)
        flashcard.update_review_stats(rating)
        flashcard.algorithm_type = algorithm_type
        
        # Crear registro de revisión
        from backend_app.models import CardReview
        review = CardReview(
            flashcard_id=flashcard.id,
            session_id=data.get('session_id'),  # Opcional
            rating=rating,
            response_time=data.get('response_time'),
            previous_ease=previous_state['ease_factor'],
            previous_interval=previous_state['interval'],
            previous_stability=previous_state['stability'],
            new_ease=flashcard.ease_factor,
            new_interval=flashcard.interval_days,
            new_stability=flashcard.stability,
            new_next_review=flashcard.next_review
        )
        
        db.session.add(review)
        db.session.commit()
        
        logger.info(f"Flashcard {flashcard_id} reviewed with rating {rating} using {algorithm_type}")
        
        return jsonify({
            'success': True,
            'data': {
                'flashcard': flashcard.to_dict(unified_format=True),
                'review': review.to_dict(),
                'algorithm_used': algorithm_type,
                'next_review': flashcard.next_review.isoformat(),
                'new_interval': flashcard.interval_days
            },
            'message': 'Review processed successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing review for flashcard {flashcard_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@flashcards_bp.route('/flashcards/due', methods=['GET'])
@jwt_required()
def get_due_flashcards():
    """
    Obtener flashcards que necesitan revisión
    
    Query params:
    - deck_id: ID del deck (opcional)
    - limit: Número máximo de cartas (default: 20)
    - format: 'unified' | 'legacy'
    """
    try:
        user_id = get_jwt_identity()
        deck_id = request.args.get('deck_id', type=int)
        limit = request.args.get('limit', 20, type=int)
        format_type = request.args.get('format', 'unified')
        
        # Construir query base
        query = db.session.query(Flashcard).join(Deck).filter(
            Deck.user_id == user_id,
            Flashcard.is_deleted == False,
            Flashcard.next_review <= datetime.utcnow()
        )
        
        # Filtrar por deck si se especifica
        if deck_id:
            query = query.filter(Flashcard.deck_id == deck_id)
        
        # Ordenar por prioridad (cartas más atrasadas primero)
        query = query.order_by(Flashcard.next_review.asc())
        
        # Aplicar límite
        flashcards = query.limit(limit).all()
        
        unified_format = format_type == 'unified'
        
        return jsonify({
            'success': True,
            'data': [
                flashcard.to_dict(unified_format=unified_format)
                for flashcard in flashcards
            ],
            'total': len(flashcards),
            'limit': limit
        })
        
    except Exception as e:
        logger.error(f"Error getting due flashcards: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@flashcards_bp.route('/flashcards/search', methods=['GET'])
@jwt_required()
def search_flashcards():
    """
    Buscar flashcards con soporte multimedia
    
    Query params:
    - q: Término de búsqueda
    - deck_id: ID del deck (opcional)
    - has_images: true/false (opcional)
    - difficulty: easy/normal/hard (opcional)
    - format: unified/legacy
    """
    try:
        user_id = get_jwt_identity()
        search_query = request.args.get('q', '').strip()
        deck_id = request.args.get('deck_id', type=int)
        has_images = request.args.get('has_images')
        difficulty = request.args.get('difficulty')
        format_type = request.args.get('format', 'unified')
        
        # Construir query base
        query = db.session.query(Flashcard).join(Deck).filter(
            Deck.user_id == user_id,
            Flashcard.is_deleted == False
        )
        
        # Filtros
        if search_query:
            query = query.filter(
                db.or_(
                    Flashcard.front_text.ilike(f'%{search_query}%'),
                    Flashcard.back_text.ilike(f'%{search_query}%'),
                    Flashcard.notes.ilike(f'%{search_query}%')
                )
            )
        
        if deck_id:
            query = query.filter(Flashcard.deck_id == deck_id)
        
        if has_images is not None:
            if has_images.lower() == 'true':
                query = query.filter(
                    db.or_(
                        Flashcard.front_image_url.isnot(None),
                        Flashcard.back_image_url.isnot(None)
                    )
                )
            else:
                query = query.filter(
                    db.and_(
                        Flashcard.front_image_url.is_(None),
                        Flashcard.back_image_url.is_(None)
                    )
                )
        
        if difficulty:
            query = query.filter(Flashcard.difficulty == difficulty)
        
        flashcards = query.order_by(Flashcard.updated_at.desc()).limit(50).all()
        
        unified_format = format_type == 'unified'
        
        return jsonify({
            'success': True,
            'data': [
                flashcard.to_dict(unified_format=unified_format)
                for flashcard in flashcards
            ],
            'total': len(flashcards),
            'query': search_query
        })
        
    except Exception as e:
        logger.error(f"Error searching flashcards: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Endpoint de migración para convertir datos legacy
@flashcards_bp.route('/flashcards/migrate-format', methods=['POST'])
@jwt_required()
def migrate_flashcard_format():
    """
    Migrar flashcards existentes al nuevo formato (solo para administradores)
    """
    try:
        user_id = get_jwt_identity()
        
        # Verificar permisos de administrador (implementar según tu lógica)
        user = User.query.get(user_id)
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Contar flashcards que necesitan migración
        flashcards_to_migrate = Flashcard.query.filter(
            Flashcard.is_deleted == False
        ).all()
        
        migrated_count = 0
        
        for flashcard in flashcards_to_migrate:
            # Verificar si ya tiene el formato correcto
            if flashcard.algorithm_type is None:
                flashcard.algorithm_type = 'fsrs'  # Default
                migrated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Migration completed. {migrated_count} flashcards updated.',
            'total_processed': len(flashcards_to_migrate),
            'migrated': migrated_count
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error during migration: {str(e)}")
        return jsonify({'error': 'Migration failed'}), 500


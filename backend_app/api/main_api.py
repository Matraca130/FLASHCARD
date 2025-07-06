"""
APIs v2 optimizadas con cache inteligente y mejoras de rendimiento
Versión mejorada de las APIs v2 con optimizaciones específicas para frontend
"""

from typing import List, Dict
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import User, Deck, Flashcard, StudySession, CardReview
from .extensions import db
from .frontend_helpers import (
    frontend_response, frontend_error, paginated_response,
    validate_frontend_request, format_deck_for_frontend,
    format_flashcard_for_frontend, format_study_session_for_frontend,
    get_request_pagination, get_request_filters, log_frontend_request
)
from .cache_optimized import (
    cache_user_data, cache_deck_data, cache_study_data,
    invalidate_user_cache, invalidate_deck_cache, invalidate_study_cache,
    QueryOptimizer, ResponseCompressor
)
from .performance_middleware import performance_monitor, optimize_json_response
from .algorithms import calculate_fsrs, calculate_sm2, get_next_review_date
from datetime import datetime, timedelta
from sqlalchemy import or_, and_, func
import logging

logger = logging.getLogger(__name__)

# Blueprint para APIs v2 optimizadas
api_v2_opt = Blueprint('api_v2_opt', __name__, url_prefix='/api/v2/opt')

@api_v2_opt.route('/dashboard', methods=['GET'])
@jwt_required()
@log_frontend_request('dashboard_v2_optimized')
@cache_user_data(user_id=lambda: get_jwt_identity(), ttl=300)
@performance_monitor(threshold_ms=200)
def get_dashboard_v2_optimized():
    """
    Dashboard optimizado con cache inteligente y consultas eficientes
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return frontend_error('Usuario no encontrado', 'USER_NOT_FOUND', status_code=404)
        
        # Usar consultas optimizadas con agregaciones eficientes
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Consulta única para estadísticas de decks y cards
        deck_stats = db.session.query(
            func.count(Deck.id).label('total_decks'),
            func.count(Flashcard.id).label('total_cards'),
            func.sum(func.case([(Flashcard.next_review <= now, 1)], else_=0)).label('cards_due'),
            func.sum(func.case([(Flashcard.last_review.is_(None), 1)], else_=0)).label('new_cards'),
            func.sum(func.case([(Flashcard.interval > 30, 1)], else_=0)).label('mastered_cards')
        ).select_from(Deck).outerjoin(Flashcard).filter(Deck.user_id == user_id).first()
        
        # Consulta optimizada para sesiones de hoy
        today_stats = db.session.query(
            func.sum(StudySession.cards_studied).label('cards_studied'),
            func.sum(StudySession.total_time).label('study_time')
        ).join(Deck).filter(
            Deck.user_id == user_id,
            StudySession.started_at >= today_start
        ).first()
        
        # Calcular racha de estudio de manera eficiente
        study_streak = calculate_study_streak_optimized(user_id)
        
        # Decks recientes con consulta optimizada
        recent_decks = Deck.query.filter_by(user_id=user_id).order_by(
            Deck.updated_at.desc()
        ).limit(5).all()
        
        # Próximas revisiones con consulta agregada
        upcoming_reviews = get_upcoming_reviews_optimized(user_id, days=7)
        
        # Construir respuesta optimizada
        dashboard_data = {
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'member_since': user.created_at.isoformat()
            },
            'stats': {
                'total_decks': deck_stats.total_decks or 0,
                'total_cards': deck_stats.total_cards or 0,
                'cards_due_today': deck_stats.cards_due or 0,
                'new_cards': deck_stats.new_cards or 0,
                'mastered_cards': deck_stats.mastered_cards or 0,
                'mastery_percentage': round(
                    (deck_stats.mastered_cards / deck_stats.total_cards * 100) 
                    if deck_stats.total_cards > 0 else 0, 1
                ),
                'cards_studied_today': today_stats.cards_studied or 0,
                'study_time_today': (today_stats.study_time or 0) // 60,  # convertir a minutos
                'study_streak': study_streak
            },
            'recent_decks': [format_deck_for_frontend(deck) for deck in recent_decks],
            'upcoming_reviews': upcoming_reviews,
            'quick_actions': {
                'has_due_cards': (deck_stats.cards_due or 0) > 0,
                'has_new_cards': (deck_stats.new_cards or 0) > 0,
                'suggested_study_time': min(30, (deck_stats.cards_due or 0) * 2) if deck_stats.cards_due else 0
            }
        }
        
        # Optimizar respuesta JSON
        optimized_data = optimize_json_response(dashboard_data)
        
        return frontend_response(optimized_data, 'Dashboard cargado exitosamente')
        
    except Exception as e:
        logger.error(f"Error en dashboard v2 optimizado: {str(e)}")
        return frontend_error('Error interno del servidor', 'INTERNAL_ERROR', status_code=500)

@api_v2_opt.route('/decks', methods=['GET'])
@jwt_required()
@log_frontend_request('list_decks_v2_optimized')
@cache_user_data(user_id=lambda: get_jwt_identity(), ttl=180)
@performance_monitor(threshold_ms=150)
def list_decks_v2_optimized():
    """
    Listar decks con consultas optimizadas y cache inteligente
    """
    try:
        user_id = get_jwt_identity()
        page, per_page = get_request_pagination()
        filters = get_request_filters()
        
        # Query base optimizada
        query = Deck.query.filter_by(user_id=user_id)
        
        # Aplicar filtros de manera eficiente
        if 'search' in filters:
            search_term = f"%{filters['search']}%"
            query = query.filter(
                or_(
                    Deck.name.ilike(search_term),
                    Deck.description.ilike(search_term)
                )
            )
        
        # Usar optimizador de consultas
        include_stats = request.args.get('include_stats', 'true').lower() == 'true'
        query = QueryOptimizer.optimize_deck_query(query, include_stats)
        
        # Ordenamiento optimizado
        sort_by = request.args.get('sort_by', 'updated_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        if sort_by == 'name':
            order_column = Deck.name
        elif sort_by == 'created_at':
            order_column = Deck.created_at
        else:
            order_column = Deck.updated_at
        
        if sort_order == 'asc':
            query = query.order_by(order_column.asc())
        else:
            query = query.order_by(order_column.desc())
        
        # Paginación optimizada
        total = query.count()
        decks = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Formatear para frontend de manera eficiente
        formatted_decks = []
        for deck in decks:
            deck_data = format_deck_for_frontend(deck, include_stats=include_stats)
            formatted_decks.append(deck_data)
        
        # Crear respuesta paginada optimizada
        paginated_data = ResponseCompressor.optimize_pagination_response(
            formatted_decks, {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page,
                'has_prev': page > 1,
                'has_next': page < (total + per_page - 1) // per_page
            }
        )
        
        return frontend_response(
            paginated_data,
            f'Se encontraron {total} decks',
            meta={'filters_applied': filters}
        )
        
    except Exception as e:
        logger.error(f"Error listando decks v2 optimizado: {str(e)}")
        return frontend_error('Error interno del servidor', 'INTERNAL_ERROR', status_code=500)

@api_v2_opt.route('/decks/<int:deck_id>/study', methods=['GET'])
@jwt_required()
@log_frontend_request('get_study_cards_v2_optimized')
@cache_deck_data(deck_id=lambda deck_id: deck_id, ttl=120)
@performance_monitor(threshold_ms=100)
def get_study_cards_v2_optimized(deck_id):
    """
    Obtener cards para estudiar con algoritmo y consultas optimizadas
    """
    try:
        user_id = get_jwt_identity()
        
        # Verificar deck con consulta optimizada
        deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first()
        if not deck:
            return frontend_error('Deck no encontrado', 'DECK_NOT_FOUND', status_code=404)
        
        # Parámetros de estudio
        limit = int(request.args.get('limit', 20))
        include_new = request.args.get('include_new', 'true').lower() == 'true'
        include_due = request.args.get('include_due', 'true').lower() == 'true'
        
        now = datetime.utcnow()
        
        # Consulta optimizada para cards de estudio
        study_cards = []
        
        if include_due:
            # Cards vencidas con consulta optimizada
            due_cards = Flashcard.query.filter(
                and_(
                    Flashcard.deck_id == deck_id,
                    Flashcard.next_review <= now,
                    Flashcard.last_review.isnot(None)
                )
            ).order_by(Flashcard.next_review.asc()).limit(limit).all()
            study_cards.extend(due_cards)
        
        if include_new and len(study_cards) < limit:
            # Cards nuevas con consulta optimizada
            remaining_limit = limit - len(study_cards)
            new_cards = Flashcard.query.filter(
                and_(
                    Flashcard.deck_id == deck_id,
                    Flashcard.last_review.is_(None)
                )
            ).order_by(Flashcard.created_at.asc()).limit(remaining_limit).all()
            study_cards.extend(new_cards)
        
        # Formatear cards de manera eficiente
        formatted_cards = []
        for card in study_cards:
            card_data = format_flashcard_for_frontend(card, include_review_data=True)
            
            # Agregar información de estudio optimizada
            is_due = card.next_review <= now if card.next_review else True
            days_overdue = (now - card.next_review).days if card.next_review and card.next_review < now else 0
            
            card_data['study_info'] = {
                'is_new': card.last_review is None,
                'is_due': is_due,
                'days_overdue': days_overdue
            }
            
            formatted_cards.append(card_data)
        
        # Estadísticas optimizadas
        session_stats = {
            'total_cards': len(formatted_cards),
            'new_cards': sum(1 for card in formatted_cards if card['study_info']['is_new']),
            'due_cards': sum(1 for card in formatted_cards if card['study_info']['is_due']),
            'estimated_time_minutes': len(formatted_cards) * 2
        }
        
        response_data = {
            'deck': format_deck_for_frontend(deck),
            'cards': formatted_cards,
            'session_stats': session_stats
        }
        
        return frontend_response(
            optimize_json_response(response_data),
            f'Sesión de estudio preparada con {len(formatted_cards)} cards'
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo cards para estudio v2 optimizado: {str(e)}")
        return frontend_error('Error interno del servidor', 'INTERNAL_ERROR', status_code=500)

@api_v2_opt.route('/stats/progress', methods=['GET'])
@jwt_required()
@log_frontend_request('get_progress_stats_v2_optimized')
@cache_study_data(user_id=lambda: get_jwt_identity(), ttl=600)
@performance_monitor(threshold_ms=300)
def get_progress_stats_v2_optimized():
    """
    Estadísticas de progreso con consultas agregadas optimizadas
    """
    try:
        user_id = get_jwt_identity()
        days = int(request.args.get('days', 30))
        
        if days > 365:
            days = 365
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Consulta optimizada para estadísticas diarias
        daily_stats_query = QueryOptimizer.optimize_study_stats_query(
            StudySession.query, user_id, days
        )
        
        daily_results = daily_stats_query.all()
        
        # Convertir a formato optimizado
        daily_stats = []
        for result in daily_results:
            daily_stats.append({
                'date': result.date.isoformat(),
                'cards_studied': result.total_cards or 0,
                'study_time_minutes': (result.total_time or 0) // 60,
                'sessions_count': result.session_count or 0,
                'accuracy_percentage': 85  # Placeholder - calcular si es necesario
            })
        
        # Estadísticas por deck optimizadas
        deck_stats_query = db.session.query(
            Deck.name,
            func.count(StudySession.id).label('sessions'),
            func.sum(StudySession.cards_studied).label('total_cards'),
            func.sum(StudySession.total_time).label('total_time')
        ).join(StudySession).filter(
            and_(
                Deck.user_id == user_id,
                StudySession.started_at >= start_date
            )
        ).group_by(Deck.id, Deck.name).order_by(
            func.sum(StudySession.cards_studied).desc()
        ).limit(10)
        
        deck_results = deck_stats_query.all()
        
        formatted_deck_stats = [
            {
                'deck_name': result.name,
                'sessions': result.sessions,
                'cards_studied': result.total_cards or 0,
                'study_time_minutes': (result.total_time or 0) // 60
            }
            for result in deck_results
        ]
        
        # Resumen optimizado con consulta única
        summary_stats = db.session.query(
            func.count(StudySession.id).label('total_sessions'),
            func.sum(StudySession.cards_studied).label('total_cards'),
            func.sum(StudySession.total_time).label('total_time')
        ).join(Deck).filter(
            and_(
                Deck.user_id == user_id,
                StudySession.started_at >= start_date
            )
        ).first()
        
        progress_data = {
            'period': {
                'days': days,
                'start_date': start_date.date().isoformat(),
                'end_date': end_date.date().isoformat()
            },
            'summary': {
                'total_sessions': summary_stats.total_sessions or 0,
                'total_cards_studied': summary_stats.total_cards or 0,
                'total_study_time_minutes': (summary_stats.total_time or 0) // 60,
                'average_cards_per_day': round((summary_stats.total_cards or 0) / days, 1),
                'average_study_time_per_day': round((summary_stats.total_time or 0) / days / 60, 1)
            },
            'daily_stats': daily_stats,
            'deck_stats': formatted_deck_stats
        }
        
        return frontend_response(
            optimize_json_response(progress_data),
            f'Estadísticas de progreso de los últimos {days} días'
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de progreso v2 optimizado: {str(e)}")
        return frontend_error('Error interno del servidor', 'INTERNAL_ERROR', status_code=500)

def calculate_study_streak_optimized(user_id: int) -> int:
    """
    Calcular racha de estudio de manera optimizada
    """
    try:
        # Consulta optimizada para obtener días con estudio
        study_days = db.session.query(
            func.date(StudySession.started_at).label('study_date')
        ).join(Deck).filter(
            and_(
                Deck.user_id == user_id,
                StudySession.cards_studied > 0,
                StudySession.started_at >= datetime.utcnow() - timedelta(days=365)
            )
        ).distinct().order_by(
            func.date(StudySession.started_at).desc()
        ).all()
        
        if not study_days:
            return 0
        
        # Calcular racha consecutiva
        today = datetime.utcnow().date()
        streak = 0
        
        for i, day_result in enumerate(study_days):
            expected_date = today - timedelta(days=i)
            
            if day_result.study_date == expected_date:
                streak += 1
            else:
                break
        
        return streak
        
    except Exception as e:
        logger.error(f"Error calculando racha de estudio optimizada: {str(e)}")
        return 0

def get_upcoming_reviews_optimized(user_id: int, days: int = 7) -> List[Dict]:
    """
    Obtener próximas revisiones de manera optimizada
    """
    try:
        now = datetime.utcnow()
        end_date = now + timedelta(days=days)
        
        # Consulta optimizada para próximas revisiones
        upcoming_query = db.session.query(
            func.date(Flashcard.next_review).label('review_date'),
            func.count(Flashcard.id).label('card_count')
        ).join(Deck).filter(
            and_(
                Deck.user_id == user_id,
                Flashcard.next_review >= now,
                Flashcard.next_review <= end_date
            )
        ).group_by(
            func.date(Flashcard.next_review)
        ).order_by(
            func.date(Flashcard.next_review)
        ).all()
        
        # Convertir a formato esperado
        upcoming_reviews = []
        for result in upcoming_query:
            upcoming_reviews.append({
                'date': result.review_date.isoformat(),
                'count': result.card_count
            })
        
        return upcoming_reviews
        
    except Exception as e:
        logger.error(f"Error obteniendo próximas revisiones optimizadas: {str(e)}")
        return []


"""
StatsService - Servicio para estadísticas y analíticas
Refactorizado con consultas optimizadas y lógica centralizada
"""

from .base_service import BaseService
try:
    from ..models import User, Deck, Flashcard, StudySession, CardReview
except ImportError:
    from backend_app.models import User, Deck, Flashcard, StudySession, CardReview
from sqlalchemy import and_, or_, func, desc, case
from datetime import datetime, timedelta
import calendar


class StatsService(BaseService):
    """Servicio para estadísticas y analíticas del usuario"""
    
    def get_dashboard_stats(self, user_id):
        """
        Obtener estadísticas principales para el dashboard
        
        Args:
            user_id: ID del usuario
            
        Returns:
            dict: Respuesta con estadísticas del dashboard
        """
        try:
            cache_key = f"dashboard_stats:{user_id}"
            
            def fetch_stats():
                # Obtener usuario
                user = self.db.session.query(User).get(user_id)
                if not user:
                    return None
                
                # Estadísticas básicas
                total_decks = self.db.session.query(Deck).filter_by(
                    user_id=user_id, 
                    is_deleted=False
                ).count()
                
                total_cards = self.db.session.query(Flashcard).join(Deck).filter(
                    and_(
                        Deck.user_id == user_id,
                        Deck.is_deleted == False,
                        Flashcard.is_deleted == False
                    )
                ).count()
                
                # Cartas vencidas hoy
                cards_due_today = self.db.session.query(Flashcard).join(Deck).filter(
                    and_(
                        Deck.user_id == user_id,
                        Deck.is_deleted == False,
                        Flashcard.is_deleted == False,
                        Flashcard.next_review <= datetime.utcnow()
                    )
                ).count()
                
                # Cartas estudiadas hoy
                today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                cards_studied_today = self.db.session.query(func.sum(StudySession.cards_studied)).join(Deck).filter(
                    and_(
                        Deck.user_id == user_id,
                        StudySession.started_at >= today_start
                    )
                ).scalar() or 0
                
                # Tiempo de estudio hoy (en minutos)
                study_time_today = self.db.session.query(func.sum(StudySession.total_time)).join(Deck).filter(
                    and_(
                        Deck.user_id == user_id,
                        StudySession.started_at >= today_start
                    )
                ).scalar() or 0
                
                # Racha de estudio
                study_streak = self._calculate_study_streak(user_id)
                
                # Estadísticas de rendimiento
                accuracy_rate = user.accuracy_rate or 0
                
                return {
                    'total_decks': total_decks,
                    'total_cards': total_cards,
                    'cards_due_today': cards_due_today,
                    'cards_studied_today': int(cards_studied_today),
                    'study_time_today': int(study_time_today),
                    'study_streak': study_streak,
                    'accuracy_rate': round(accuracy_rate, 1),
                    'total_study_time': user.total_study_time or 0,
                    'total_cards_studied': user.total_cards_studied or 0,
                    'longest_streak': user.longest_streak or 0
                }
            
            stats = self._get_or_set_cache(cache_key, fetch_stats, timeout=300)
            
            if stats is None:
                return self._error_response('Usuario no encontrado', code=404)
            
            return self._success_response(stats)
            
        except Exception as e:
            return self._handle_exception(e, "obtención de estadísticas del dashboard")
    
    def get_weekly_stats(self, user_id):
        """
        Obtener estadísticas de los últimos 7 días
        
        Args:
            user_id: ID del usuario
            
        Returns:
            dict: Respuesta con estadísticas semanales
        """
        try:
            cache_key = f"weekly_stats:{user_id}"
            
            def fetch_weekly():
                end_date = datetime.utcnow().date()
                start_date = end_date - timedelta(days=6)
                
                weekly_data = []
                current_date = start_date
                
                while current_date <= end_date:
                    day_start = datetime.combine(current_date, datetime.min.time())
                    day_end = datetime.combine(current_date, datetime.max.time())
                    
                    # Cartas estudiadas en el día
                    cards_studied = self.db.session.query(func.sum(StudySession.cards_studied)).join(Deck).filter(
                        and_(
                            Deck.user_id == user_id,
                            StudySession.started_at.between(day_start, day_end)
                        )
                    ).scalar() or 0
                    
                    # Tiempo de estudio en el día (en minutos)
                    study_time = self.db.session.query(func.sum(StudySession.total_time)).join(Deck).filter(
                        and_(
                            Deck.user_id == user_id,
                            StudySession.started_at.between(day_start, day_end)
                        )
                    ).scalar() or 0
                    
                    # Número de sesiones
                    sessions_count = self.db.session.query(StudySession).join(Deck).filter(
                        and_(
                            Deck.user_id == user_id,
                            StudySession.started_at.between(day_start, day_end)
                        )
                    ).count()
                    
                    weekly_data.append({
                        'date': current_date.isoformat(),
                        'day': current_date.strftime('%a'),
                        'cards_studied': int(cards_studied),
                        'study_time': int(study_time),
                        'sessions': sessions_count
                    })
                    
                    current_date += timedelta(days=1)
                
                return {'weekly_data': weekly_data}
            
            result = self._get_or_set_cache(cache_key, fetch_weekly, timeout=600)
            
            return self._success_response(result)
            
        except Exception as e:
            return self._handle_exception(e, "obtención de estadísticas semanales")
    
    def get_performance_analytics(self, user_id, days=30):
        """
        Obtener análisis de rendimiento en un período
        
        Args:
            user_id: ID del usuario
            days: Número de días a analizar
            
        Returns:
            dict: Respuesta con análisis de rendimiento
        """
        try:
            cache_key = f"performance_analytics:{user_id}:{days}"
            
            def fetch_performance():
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=days)
                
                # Estadísticas de revisiones
                reviews = self.db.session.query(CardReview).join(StudySession).join(Deck).filter(
                    and_(
                        Deck.user_id == user_id,
                        CardReview.reviewed_at.between(start_date, end_date)
                    )
                ).all()
                
                if not reviews:
                    return {
                        'total_reviews': 0,
                        'accuracy_rate': 0,
                        'average_response_time': 0,
                        'quality_distribution': {},
                        'algorithm_performance': {}
                    }
                
                # Calcular métricas
                total_reviews = len(reviews)
                correct_reviews = len([r for r in reviews if r.quality >= 3])
                accuracy_rate = (correct_reviews / total_reviews * 100) if total_reviews > 0 else 0
                
                # Tiempo de respuesta promedio
                response_times = [r.response_time for r in reviews if r.response_time and r.response_time > 0]
                avg_response_time = sum(response_times) / len(response_times) if response_times else 0
                
                # Distribución de calidad
                quality_dist = {}
                for i in range(6):  # 0-5
                    quality_dist[str(i)] = len([r for r in reviews if r.quality == i])
                
                # Rendimiento por algoritmo
                algorithm_perf = {}
                algorithms = set(r.algorithm for r in reviews if r.algorithm)
                
                for algo in algorithms:
                    algo_reviews = [r for r in reviews if r.algorithm == algo]
                    algo_correct = len([r for r in algo_reviews if r.quality >= 3])
                    algo_accuracy = (algo_correct / len(algo_reviews) * 100) if algo_reviews else 0
                    
                    algorithm_perf[algo] = {
                        'total_reviews': len(algo_reviews),
                        'accuracy_rate': round(algo_accuracy, 1)
                    }
                
                return {
                    'period_days': days,
                    'total_reviews': total_reviews,
                    'accuracy_rate': round(accuracy_rate, 1),
                    'average_response_time': round(avg_response_time, 1),
                    'quality_distribution': quality_dist,
                    'algorithm_performance': algorithm_perf
                }
            
            result = self._get_or_set_cache(cache_key, fetch_performance, timeout=900)
            
            return self._success_response(result)
            
        except Exception as e:
            return self._handle_exception(e, "obtención de análisis de rendimiento")
    
    def get_retention_analysis(self, user_id):
        """
        Obtener análisis de retención de conocimiento
        
        Args:
            user_id: ID del usuario
            
        Returns:
            dict: Respuesta con análisis de retención
        """
        try:
            cache_key = f"retention_analysis:{user_id}"
            
            def fetch_retention():
                # Obtener cartas por intervalos de retención
                intervals = [
                    (0, 1, 'new'),           # Cartas nuevas
                    (1, 7, 'learning'),     # 1-7 días
                    (7, 21, 'young'),       # 1-3 semanas
                    (21, 90, 'mature'),     # 3 semanas - 3 meses
                    (90, 365, 'mastered'),  # 3 meses - 1 año
                    (365, float('inf'), 'expert')  # Más de 1 año
                ]
                
                retention_data = {}
                
                for min_days, max_days, category in intervals:
                    if category == 'new':
                        # Cartas nunca estudiadas
                        count = self.db.session.query(Flashcard).join(Deck).filter(
                            and_(
                                Deck.user_id == user_id,
                                Deck.is_deleted == False,
                                Flashcard.is_deleted == False,
                                Flashcard.last_reviewed == None
                            )
                        ).count()
                    else:
                        # Cartas con intervalos específicos
                        if max_days == float('inf'):
                            count = self.db.session.query(Flashcard).join(Deck).filter(
                                and_(
                                    Deck.user_id == user_id,
                                    Deck.is_deleted == False,
                                    Flashcard.is_deleted == False,
                                    Flashcard.interval_days >= min_days
                                )
                            ).count()
                        else:
                            count = self.db.session.query(Flashcard).join(Deck).filter(
                                and_(
                                    Deck.user_id == user_id,
                                    Deck.is_deleted == False,
                                    Flashcard.is_deleted == False,
                                    Flashcard.interval_days >= min_days,
                                    Flashcard.interval_days < max_days
                                )
                            ).count()
                    
                    retention_data[category] = count
                
                # Calcular total para porcentajes
                total_cards = sum(retention_data.values())
                
                # Agregar porcentajes
                for category in retention_data:
                    count = retention_data[category]
                    percentage = (count / total_cards * 100) if total_cards > 0 else 0
                    retention_data[category] = {
                        'count': count,
                        'percentage': round(percentage, 1)
                    }
                
                return {
                    'total_cards': total_cards,
                    'retention_breakdown': retention_data
                }
            
            result = self._get_or_set_cache(cache_key, fetch_retention, timeout=1800)
            
            return self._success_response(result)
            
        except Exception as e:
            return self._handle_exception(e, "obtención de análisis de retención")
    
    def get_progress_tracking(self, user_id):
        """
        Obtener seguimiento de progreso por deck
        
        Args:
            user_id: ID del usuario
            
        Returns:
            dict: Respuesta con progreso por deck
        """
        try:
            cache_key = f"progress_tracking:{user_id}"
            
            def fetch_progress():
                # Obtener decks del usuario
                decks = self.db.session.query(Deck).filter_by(
                    user_id=user_id, 
                    is_deleted=False
                ).all()
                
                progress_data = []
                
                for deck in decks:
                    # Estadísticas del deck
                    total_cards = self.db.session.query(Flashcard).filter_by(
                        deck_id=deck.id, 
                        is_deleted=False
                    ).count()
                    
                    if total_cards == 0:
                        continue
                    
                    # Cartas por estado
                    new_cards = self.db.session.query(Flashcard).filter(
                        and_(
                            Flashcard.deck_id == deck.id,
                            Flashcard.is_deleted == False,
                            Flashcard.last_reviewed == None
                        )
                    ).count()
                    
                    learning_cards = self.db.session.query(Flashcard).filter(
                        and_(
                            Flashcard.deck_id == deck.id,
                            Flashcard.is_deleted == False,
                            Flashcard.last_reviewed != None,
                            Flashcard.interval_days < 21
                        )
                    ).count()
                    
                    mastered_cards = self.db.session.query(Flashcard).filter(
                        and_(
                            Flashcard.deck_id == deck.id,
                            Flashcard.is_deleted == False,
                            Flashcard.interval_days >= 21
                        )
                    ).count()
                    
                    # Calcular progreso
                    studied_cards = total_cards - new_cards
                    progress_percentage = (studied_cards / total_cards * 100) if total_cards > 0 else 0
                    mastery_percentage = (mastered_cards / total_cards * 100) if total_cards > 0 else 0
                    
                    progress_data.append({
                        'deck_id': deck.id,
                        'deck_name': deck.name,
                        'total_cards': total_cards,
                        'new_cards': new_cards,
                        'learning_cards': learning_cards,
                        'mastered_cards': mastered_cards,
                        'progress_percentage': round(progress_percentage, 1),
                        'mastery_percentage': round(mastery_percentage, 1),
                        'last_studied': deck.last_studied.isoformat() if deck.last_studied else None
                    })
                
                # Ordenar por progreso descendente
                progress_data.sort(key=lambda x: x['progress_percentage'], reverse=True)
                
                return {'decks_progress': progress_data}
            
            result = self._get_or_set_cache(cache_key, fetch_progress, timeout=600)
            
            return self._success_response(result)
            
        except Exception as e:
            return self._handle_exception(e, "obtención de seguimiento de progreso")
    
    def get_activity_heatmap(self, user_id, year=None):
        """
        Obtener datos para heatmap de actividad anual
        
        Args:
            user_id: ID del usuario
            year: Año a analizar (por defecto el actual)
            
        Returns:
            dict: Respuesta con datos del heatmap
        """
        try:
            if not year:
                year = datetime.utcnow().year
            
            cache_key = f"activity_heatmap:{user_id}:{year}"
            
            def fetch_heatmap():
                # Fechas del año
                start_date = datetime(year, 1, 1)
                end_date = datetime(year, 12, 31, 23, 59, 59)
                
                # Obtener actividad diaria
                daily_activity = {}
                
                # Consulta optimizada para obtener actividad por día
                sessions = self.db.session.query(
                    func.date(StudySession.started_at).label('date'),
                    func.sum(StudySession.cards_studied).label('cards'),
                    func.sum(StudySession.total_time).label('time'),
                    func.count(StudySession.id).label('sessions')
                ).join(Deck).filter(
                    and_(
                        Deck.user_id == user_id,
                        StudySession.started_at.between(start_date, end_date)
                    )
                ).group_by(func.date(StudySession.started_at)).all()
                
                # Procesar resultados
                for session in sessions:
                    date_str = session.date.isoformat()
                    daily_activity[date_str] = {
                        'cards_studied': int(session.cards or 0),
                        'study_time': int(session.time or 0),
                        'sessions': int(session.sessions or 0)
                    }
                
                # Generar datos para todos los días del año
                heatmap_data = []
                current_date = start_date.date()
                end_date_only = end_date.date()
                
                while current_date <= end_date_only:
                    date_str = current_date.isoformat()
                    activity = daily_activity.get(date_str, {
                        'cards_studied': 0,
                        'study_time': 0,
                        'sessions': 0
                    })
                    
                    heatmap_data.append({
                        'date': date_str,
                        'day_of_week': current_date.weekday(),
                        'week_of_year': current_date.isocalendar()[1],
                        **activity
                    })
                    
                    current_date += timedelta(days=1)
                
                return {
                    'year': year,
                    'heatmap_data': heatmap_data
                }
            
            result = self._get_or_set_cache(cache_key, fetch_heatmap, timeout=3600)
            
            return self._success_response(result)
            
        except Exception as e:
            return self._handle_exception(e, "obtención de heatmap de actividad")
    
    def _calculate_study_streak(self, user_id):
        """
        Calcular racha de días consecutivos estudiando
        
        Args:
            user_id: ID del usuario
            
        Returns:
            int: Número de días consecutivos
        """
        try:
            # Obtener fechas únicas de estudio en orden descendente
            study_dates = self.db.session.query(
                func.date(StudySession.started_at).label('study_date')
            ).join(Deck).filter(
                Deck.user_id == user_id
            ).distinct().order_by(desc('study_date')).all()
            
            if not study_dates:
                return 0
            
            # Convertir a lista de fechas
            dates = [date.study_date for date in study_dates]
            
            # Calcular racha desde hoy hacia atrás
            today = datetime.utcnow().date()
            streak = 0
            
            # Verificar si estudió hoy
            if dates and dates[0] == today:
                streak = 1
                check_date = today - timedelta(days=1)
            elif dates and dates[0] == today - timedelta(days=1):
                # Si no estudió hoy pero sí ayer, empezar desde ayer
                streak = 1
                check_date = today - timedelta(days=2)
            else:
                return 0
            
            # Contar días consecutivos hacia atrás
            for date in dates[1:]:
                if date == check_date:
                    streak += 1
                    check_date -= timedelta(days=1)
                else:
                    break
            
            return streak
            
        except Exception as e:
            self.logger.error(f"Error calculando racha de estudio: {str(e)}")
            return 0


"""
Utilidades para cálculos estadísticos
"""

from datetime import datetime, timedelta
from backend_app.models import StudySession
from backend_app.extensions import db


def calculate_study_streak(user_id: int) -> int:
    """
    Calcula la racha de estudio actual del usuario

    Args:
        user_id: ID del usuario

    Returns:
        int: Número de días consecutivos de estudio
    """
    try:
        # Obtener sesiones de estudio ordenadas por fecha descendente
        sessions = (
            db.session.query(StudySession)
            .filter(StudySession.user_id == user_id, StudySession.is_completed)
            .order_by(StudySession.created_at.desc())
            .all()
        )

        if not sessions:
            return 0

        streak = 0
        current_date = datetime.utcnow().date()

        # Verificar si estudió hoy
        last_session_date = sessions[0].created_at.date()
        if last_session_date == current_date:
            streak = 1
            current_date = current_date - timedelta(days=1)
        elif last_session_date == current_date - timedelta(days=1):
            # Si no estudió hoy pero sí ayer, empezar desde ayer
            streak = 1
            current_date = last_session_date - timedelta(days=1)
        else:
            # Si la última sesión fue hace más de un día, no hay racha
            return 0

        # Contar días consecutivos hacia atrás
        session_dates = set(session.created_at.date() for session in sessions)

        while current_date in session_dates:
            streak += 1
            current_date = current_date - timedelta(days=1)

        return streak

    except Exception:
        # En caso de error, retornar 0
        return 0


def calculate_weekly_stats(user_id: int) -> dict:
    """
    Calcula estadísticas de la semana actual

    Args:
        user_id: ID del usuario

    Returns:
        dict: Estadísticas semanales
    """
    try:
        week_start = datetime.utcnow().date() - timedelta(days=datetime.utcnow().weekday())
        week_end = week_start + timedelta(days=6)

        sessions = (
            db.session.query(StudySession)
            .filter(
                StudySession.user_id == user_id,
                StudySession.created_at >= week_start,
                StudySession.created_at <= week_end + timedelta(days=1),
            )
            .all()
        )

        total_cards = sum(session.cards_studied for session in sessions)
        total_time = sum(
            (session.completed_at - session.created_at).total_seconds() / 60
            for session in sessions
            if session.completed_at
        )

        return {
            "sessions_this_week": len(sessions),
            "cards_studied_this_week": total_cards,
            "minutes_studied_this_week": round(total_time, 1),
        }

    except Exception:
        return {
            "sessions_this_week": 0,
            "cards_studied_this_week": 0,
            "minutes_studied_this_week": 0,
        }

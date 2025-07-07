"""
Rutas de dashboard para StudyingFlash
Compatible con frontend existente
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend_app.models import User, Deck, Flashcard, StudySession, CardReview
from backend_app.services_new import StatsService
from backend_app.extensions import db
from datetime import datetime, timedelta
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)
dashboard_bp = Blueprint("dashboard", __name__)

# Usar servicio refactorizado con inyección de dependencias
stats_service = StatsService(db=db)


@dashboard_bp.route("/", methods=["GET"])
@jwt_required()
def get_dashboard():
    """
    Obtener datos del dashboard - Compatible con frontend
    GET /api/dashboard/
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Usar servicio para obtener estadísticas
        result = stats_service.get_dashboard_stats(user_id)

        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        dashboard_data = result["data"]

        # Formato compatible con frontend
        return (
            jsonify(
                {
                    "success": True,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "member_since": user.created_at.isoformat(),
                        "current_streak": user.current_streak,
                        "total_study_time": user.total_study_time,
                    },
                    "stats": dashboard_data["stats"],
                    "recent_activity": dashboard_data.get(
                        "recent_activity",
                        []),
                    "upcoming_reviews": dashboard_data.get(
                        "upcoming_reviews",
                        []),
                    "weekly_progress": dashboard_data.get(
                        "weekly_progress",
                        []),
                }),
            200,
        )

    except Exception as e:
        logger.error(f"Error obteniendo dashboard: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@dashboard_bp.route("/stats/weekly", methods=["GET"])
@jwt_required()
def get_weekly_stats():
    """
    Obtener estadísticas semanales
    GET /api/dashboard/stats/weekly
    """
    try:
        user_id = get_jwt_identity()

        # Obtener estadísticas de los últimos 7 días
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=6)

        weekly_data = []
        current_date = start_date

        while current_date <= end_date:
            day_start = datetime.combine(current_date, datetime.min.time())
            day_end = datetime.combine(current_date, datetime.max.time())

            # Cartas estudiadas en el día
            cards_studied = (
                db.session.query(func.sum(StudySession.cards_studied))
                .join(Deck)
                .filter(
                    Deck.user_id == user_id,
                    StudySession.started_at >= day_start,
                    StudySession.started_at <= day_end,
                )
                .scalar()
                or 0
            )

            # Tiempo de estudio en el día (en minutos)
            study_time = (
                db.session.query(func.sum(StudySession.total_time))
                .join(Deck)
                .filter(
                    Deck.user_id == user_id,
                    StudySession.started_at >= day_start,
                    StudySession.started_at <= day_end,
                )
                .scalar()
                or 0
            )

            study_time_minutes = int(study_time / 60) if study_time else 0

            weekly_data.append(
                {
                    "date": current_date.isoformat(),
                    "day": current_date.strftime("%a"),
                    "cards_studied": int(cards_studied),
                    "study_time": study_time_minutes,
                }
            )

            current_date += timedelta(days=1)

        return jsonify({"success": True, "weekly_data": weekly_data}), 200

    except Exception as e:
        logger.error(f"Error obteniendo estadísticas semanales: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@dashboard_bp.route("/stats/heatmap", methods=["GET"])
@jwt_required()
def get_activity_heatmap():
    """
    Obtener datos para heatmap de actividad
    GET /api/dashboard/stats/heatmap
    """
    try:
        user_id = get_jwt_identity()

        # Obtener actividad de los últimos 365 días
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=364)

        # Consulta optimizada para obtener actividad diaria
        activity_data = (
            db.session.query(
                func.date(StudySession.started_at).label("date"),
                func.sum(StudySession.cards_studied).label("cards_studied"),
                func.sum(StudySession.total_time).label("total_time"),
            )
            .join(Deck)
            .filter(
                Deck.user_id == user_id,
                func.date(StudySession.started_at) >= start_date,
                func.date(StudySession.started_at) <= end_date,
            )
            .group_by(func.date(StudySession.started_at))
            .all()
        )

        # Convertir a formato para heatmap
        heatmap_data = []
        for row in activity_data:
            heatmap_data.append(
                {
                    "date": row.date.isoformat(),
                    "value": int(row.cards_studied or 0),
                    # en minutos
                    "study_time": int((row.total_time or 0) / 60),
                }
            )

        return (
            jsonify(
                {
                    "success": True,
                    "heatmap_data": heatmap_data,
                    "date_range": {
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat(),
                    },
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error obteniendo heatmap: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@dashboard_bp.route("/stats/performance", methods=["GET"])
@jwt_required()
def get_performance_stats():
    """
    Obtener estadísticas de rendimiento
    GET /api/dashboard/stats/performance
    """
    try:
        user_id = get_jwt_identity()

        # Estadísticas de precisión por deck
        deck_performance = (
            db.session.query(
                Deck.id,
                Deck.name,
                func.count(
                    CardReview.id).label("total_reviews"),
                func.avg(
                    CardReview.quality).label("avg_quality"),
                func.sum(
                    func.case(
                        [
                            (CardReview.quality >= 3,
                             1)],
                        else_=0)).label("correct_reviews"),
            ) .join(Flashcard) .join(CardReview) .filter(
                Deck.user_id == user_id) .group_by(
                Deck.id,
                Deck.name) .all())

        performance_data = []
        for row in deck_performance:
            accuracy = (
                row.correct_reviews /
                row.total_reviews *
                100) if row.total_reviews > 0 else 0
            performance_data.append(
                {
                    "deck_id": row.id,
                    "deck_name": row.name,
                    "total_reviews": row.total_reviews,
                    "average_quality": (
                        round(
                            row.avg_quality,
                            2) if row.avg_quality else 0),
                    "accuracy": round(
                        accuracy,
                        1),
                })

        return jsonify(
            {"success": True, "performance_data": performance_data}), 200
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de rendimiento: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

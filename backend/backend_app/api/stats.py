"""
Rutas de estadísticas para StudyingFlash
Compatible con frontend existente
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend_app.models import User, Deck, Flashcard, StudySession, CardReview
from backend_app.services_new import StatsService
from backend_app.extensions import db
from datetime import datetime, timedelta
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)
stats_bp = Blueprint("stats", __name__)

# Usar servicio refactorizado con inyección de dependencias
stats_service = StatsService(db=db)


@stats_bp.route("/", methods=["GET"])
@jwt_required()
def get_general_stats():
    """
    Obtener estadísticas generales del usuario
    GET /api/stats
    / """
    try:
        user_id = get_jwt_identity()

        # Usar servicio para obtener estadísticas
        result = stats_service.get_user_stats(user_id)

        if not result["success"]:
            return jsonify({"error": result["error"]}), 400

        stats_data = result["data"]

        return jsonify({"success": True, "stats": stats_data}), 200

    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@stats_bp.route("/charts", methods=["GET"])
@jwt_required()
def get_chart_data():
    """
    Obtener datos para gráficos del dashboard
    GET /api/stats/charts
    """
    try:
        user_id = get_jwt_identity()

        # Obtener parámetros
        chart_type = request.args.get("type", "weekly")
        days = request.args.get("days", 30, type=int)

        if chart_type == "weekly":
            # Datos semanales
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

                weekly_data.append(
                    {
                        "date": current_date.isoformat(),
                        "day": current_date.strftime("%a"),
                        "cards_studied": int(cards_studied),
                    }
                )

                current_date += timedelta(days=1)

            return (
                jsonify({"success": True, "chart_data": weekly_data, "type": "weekly"}),
                200,
            )

        elif chart_type == "monthly":
            # Datos mensuales
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days - 1)

            monthly_data = (
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

            chart_data = []
            for row in monthly_data:
                chart_data.append(
                    {
                        "date": row.date.isoformat(),
                        "cards_studied": int(row.cards_studied or 0),
                        # en minutos
                        "study_time": int((row.total_time or 0) / 60),
                    }
                )

            return (
                jsonify({"success": True, "chart_data": chart_data, "type": "monthly"}),
                200,
            )

        elif chart_type == "accuracy":
            # Datos de precisión por deck
            accuracy_data = (
                db.session.query(
                    Deck.id,
                    Deck.name,
                    func.count(
                        CardReview.id).label("total_reviews"),
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

            chart_data = []
            for row in accuracy_data:
                accuracy = (
                    row.correct_reviews
                    / row.total_reviews
                    * 100) if row.total_reviews > 0 else 0
                chart_data.append(
                    {
                        "deck_name": row.name,
                        "accuracy": round(accuracy, 1),
                        "total_reviews": row.total_reviews,
                    }
                )

            return (
                jsonify({"success": True, "chart_data": chart_data, "type": "accuracy"}),
                200,
            )

        else:
            return jsonify({"error": "Tipo de gráfico no válido"}), 400

    except Exception as e:
        logger.error(f"Error obteniendo datos de gráficos: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@stats_bp.route("/progress", methods=["GET"])
@jwt_required()
def get_progress_stats():
    """
    Obtener estadísticas de progreso
    GET /api/stats/progress
    """
    try:
        user_id = get_jwt_identity()

        # Obtener usuario
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Estadísticas de progreso
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Cartas estudiadas hoy
        cards_today = (
            db.session.query(
                func.sum(
                    StudySession.cards_studied)) .join(Deck) .filter(
                Deck.user_id == user_id,
                StudySession.started_at >= today_start) .scalar() or 0)

        # Tiempo de estudio hoy (en minutos)
        time_today = (
            db.session.query(
                func.sum(
                    StudySession.total_time)) .join(Deck) .filter(
                Deck.user_id == user_id,
                StudySession.started_at >= today_start) .scalar() or 0)

        time_today_minutes = int(time_today / 60) if time_today else 0

        # Cartas que necesitan revisión
        cards_due = (
            db.session.query(func.count(Flashcard.id))
            .join(Deck)
            .filter(Deck.user_id == user_id, Flashcard.next_review <= now)
            .scalar()
            or 0
        )

        # Progreso hacia meta diaria
        daily_goal = user.daily_goal or 20
        goal_progress = min(
            (cards_today / daily_goal) * 100,
            100) if daily_goal > 0 else 0

        progress_data = {
            "daily_progress": {
                "cards_studied": int(cards_today),
                "daily_goal": daily_goal,
                "goal_progress": round(
                    goal_progress,
                    1),
                "study_time": time_today_minutes,
            },
            "overall_stats": {
                "total_cards_studied": user.total_cards_studied,
                "total_study_time": user.total_study_time,
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
                "cards_due": cards_due,
            },
            "accuracy": {
                "total_correct": user.total_cards_correct,
                "accuracy_rate": (
                    round(
                        (user.total_cards_correct / user.total_cards_studied * 100),
                        1) if user.total_cards_studied > 0 else 0),
            },
        }

        return jsonify({"success": True, "progress": progress_data}), 200

    except Exception as e:
        logger.error(f"Error obteniendo progreso: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500


@stats_bp.route("/leaderboard", methods=["GET"])
def get_leaderboard():
    """
    Obtener tabla de líderes (opcional, para gamificación)
    GET /api/stats/leaderboard
    """
    try:
        # Top usuarios por cartas estudiadas (últimos 30 días)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        leaderboard = (
            db.session.query(
                User.id,
                User.username,
                User.first_name,
                User.last_name,
                func.sum(StudySession.cards_studied).label("cards_studied"),
            )
            .join(StudySession)
            .filter(StudySession.started_at >= thirty_days_ago)
            .group_by(User.id, User.username, User.first_name, User.last_name)
            .order_by(func.sum(StudySession.cards_studied).desc())
            .limit(10)
            .all()
        )

        leaderboard_data = []
        for i, row in enumerate(leaderboard, 1):
            leaderboard_data.append(
                {
                    "rank": i,
                    "username": row.username,
                    "name": f"{row.first_name} {row.last_name}",
                    "cards_studied": int(row.cards_studied or 0),
                }
            )

        return (
            jsonify({"success": True, "leaderboard": leaderboard_data, "period": "30 días"}),
            200,
        )

    except Exception as e:
        logger.error(f"Error obteniendo leaderboard: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

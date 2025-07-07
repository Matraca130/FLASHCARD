"""
Health check endpoints para monitoreo de la aplicación
"""

import time
from datetime import datetime
from flask import Blueprint, jsonify
from sqlalchemy import text

from backend_app.models.models import db
from backend_app.utils.monitoring import HealthMonitor, log_info

# Blueprint para health checks
health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check básico
    GET /health
    """
    return (
        jsonify(
            {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "service": "StudyingFlash API",
                "version": "1.0.0",
            }
        ),
        200,
    )


@health_bp.route("/health/detailed", methods=["GET"])
def detailed_health_check():
    """
    Health check detallado con verificación de dependencias
    GET /health/detailed
    """
    start_time = time.time()
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "StudyingFlash API",
        "version": "1.0.0",
        "checks": {},
    }

    # Verificar base de datos
    try:
        db_start = time.time()
        db.session.execute(text("SELECT 1"))
        db_time = (time.time() - db_start) * 1000

        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": round(db_time, 2),
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"

    # Verificar Sentry (si está configurado)
    try:
        sentry_healthy = HealthMonitor.check_sentry_health()
        health_status["checks"]["sentry"] = {
            "status": "healthy" if sentry_healthy else "unhealthy"}
    except Exception as e:
        health_status["checks"]["sentry"] = {
            "status": "unhealthy", "error": str(e)}

    # Métricas del sistema
    try:
        system_metrics = HealthMonitor.get_system_metrics()
        health_status["checks"]["system"] = {
            "status": "healthy",
            "metrics": system_metrics,
        }

        # Verificar si los recursos están bajo presión
        if (
            system_metrics["cpu_percent"] > 90
            or system_metrics["memory_percent"] > 90
            or system_metrics["disk_percent"] > 95
        ):
            health_status["checks"]["system"]["status"] = "warning"
            health_status["status"] = "degraded"

    except Exception as e:
        health_status["checks"]["system"] = {
            "status": "unhealthy", "error": str(e)}

    # Tiempo total de respuesta
    total_time = (time.time() - start_time) * 1000
    health_status["response_time_ms"] = round(total_time, 2)

    # Determinar código de estado HTTP
    if health_status["status"] == "healthy":
        status_code = 200
    elif health_status["status"] == "degraded":
        status_code = 200  # Aún funcional pero con problemas
    else:
        status_code = 503  # Service unavailable

    log_info(f"Health check completed: {health_status['status']}")

    return jsonify(health_status), status_code


@health_bp.route("/health/ready", methods=["GET"])
def readiness_check():
    """
    Readiness check - verifica si la app está lista para recibir tráfico
    GET /health/ready
    """
    try:
        # Verificar conexión a base de datos
        db.session.execute(text("SELECT 1"))

        # Verificar que las tablas principales existen
        required_tables = ["users", "decks", "flashcards"]
        for table in required_tables:
            db.session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))

        return (
            jsonify(
                {
                    "status": "ready",
                    "timestamp": datetime.utcnow().isoformat(),
                    "message": "Application is ready to receive traffic",
                }
            ),
            200,
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "status": "not_ready",
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": str(e),
                    "message": "Application is not ready to receive traffic",
                }
            ),
            503,
        )


@health_bp.route("/health/live", methods=["GET"])
def liveness_check():
    """
    Liveness check - verifica si la app está viva (para Kubernetes)
    GET /health/live
    """
    return (
        jsonify(
            {
                "status": "alive",
                "timestamp": datetime.utcnow().isoformat(),
                "uptime_seconds": (
                    time.time()
                    - start_time if "start_time" in globals() else 0),
            }),
        200,
    )


@health_bp.route("/health/metrics", methods=["GET"])
def metrics_endpoint():
    """
    Endpoint de métricas básicas
    GET /health/metrics
    """
    try:
        # Métricas de base de datos
        db_metrics = {}

        # Contar usuarios activos
        result = db.session.execute(
            text(
                """
            SELECT COUNT(*) as total_users,
                   COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users
            FROM users
            WHERE is_deleted = false
        """
            )
        )
        user_stats = result.fetchone()

        db_metrics["users"] = {
            "total": user_stats[0] if user_stats else 0,
            "active_last_30_days": user_stats[1] if user_stats else 0,
        }

        # Contar decks y flashcards
        result = db.session.execute(
            text(
                """
            SELECT
                (SELECT COUNT(*) FROM decks WHERE is_deleted = false) as total_decks,
                (SELECT COUNT(*) FROM flashcards WHERE is_deleted = false) as total_flashcards
        """
            )
        )
        content_stats = result.fetchone()

        db_metrics["content"] = {
            "total_decks": content_stats[0] if content_stats else 0,
            "total_flashcards": content_stats[1] if content_stats else 0,
        }

        # Métricas del sistema
        system_metrics = HealthMonitor.get_system_metrics()

        return (
            jsonify(
                {
                    "timestamp": datetime.utcnow().isoformat(),
                    "database": db_metrics,
                    "system": system_metrics,
                }
            ),
            200,
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "error": "Failed to collect metrics",
                    "message": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                }
            ),
            500,
        )


@health_bp.route("/health/version", methods=["GET"])
def version_info():
    """
    Información de versión de la aplicación
    GET /health/version
    """
    import sys
    import platform

    return (
        jsonify(
            {
                "application": {
                    "name": "StudyingFlash API",
                    "version": "1.0.0",
                    "environment": "production",  # Esto debería venir de variables de entorno
                },
                "runtime": {
                    "python_version": sys.version,
                    "platform": platform.platform(),
                    "architecture": platform.architecture()[0],
                },
                "dependencies": {
                    "flask": "2.3.3",  # Versiones aproximadas
                    "sqlalchemy": "2.0.0",
                    "flask_jwt_extended": "4.5.0",
                },
                "timestamp": datetime.utcnow().isoformat(),
            }
        ),
        200,
    )


# Registrar tiempo de inicio para uptime
start_time = time.time()

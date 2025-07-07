"""
Manejadores centralizados de errores para la aplicación Flask
"""

from flask import jsonify, request
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from marshmallow import ValidationError
from flask_jwt_extended.exceptions import JWTExtendedException
import sentry_sdk

from backend_app.utils.monitoring import log_error, capture_exception_with_context


def register_error_handlers(app):
    """Registrar todos los manejadores de errores"""

    @app.errorhandler(400)
    def bad_request(error):
        """Manejo de errores 400 Bad Request"""
        log_error(
            f"Bad Request: {str(error)}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "url": request.url,
            },
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Solicitud inválida",
                    "message": "Los datos enviados no son válidos",
                    "status_code": 400,
                }
            ),
            400,
        )

    @app.errorhandler(401)
    def unauthorized(error):
        """Manejo de errores 401 Unauthorized"""
        log_error(
            f"Unauthorized access: {str(error)}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "ip_address": request.remote_addr,
            },
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "No autorizado",
                    "message": "Token de autenticación requerido o inválido",
                    "status_code": 401,
                }
            ),
            401,
        )

    @app.errorhandler(403)
    def forbidden(error):
        """Manejo de errores 403 Forbidden"""
        log_error(
            f"Forbidden access: {str(error)}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "user_id": getattr(request, "current_user_id", None),
            },
        )

        return (jsonify({"success": False,
                         "error": "Acceso prohibido",
                         "message": "No tienes permisos para acceder a este recurso",
                         "status_code": 403,
                         }),
                403,
                )

    @app.errorhandler(404)
    def not_found(error):
        """Manejo de errores 404 Not Found"""
        log_error(
            f"Resource not found: {str(error)}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "url": request.url,
            },
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Recurso no encontrado",
                    "message": "El recurso solicitado no existe",
                    "status_code": 404,
                }
            ),
            404,
        )

    @app.errorhandler(409)
    def conflict(error):
        """Manejo de errores 409 Conflict"""
        log_error(
            f"Conflict: {str(error)}",
            extra={"endpoint": request.endpoint, "method": request.method},
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Conflicto",
                    "message": "El recurso ya existe o hay un conflicto con el estado actual",
                    "status_code": 409,
                }),
            409,
        )

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        """Manejo de errores 429 Too Many Requests"""
        log_error(
            f"Rate limit exceeded: {str(error)}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "ip_address": request.remote_addr,
            },
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Demasiadas solicitudes",
                    "message": "Has excedido el límite de solicitudes. Intenta de nuevo más tarde",
                    "status_code": 429,
                }),
            429,
        )

    @app.errorhandler(500)
    def internal_server_error(error):
        """Manejo de errores 500 Internal Server Error"""
        log_error(
            f"Internal server error: {str(error)}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "url": request.url,
            },
        )

        # Capturar en Sentry con contexto completo
        capture_exception_with_context(
            error,
            {
                "request_info": {
                    "endpoint": request.endpoint,
                    "method": request.method,
                    "url": request.url,
                    "user_agent": request.headers.get("User-Agent"),
                }
            },
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Error interno del servidor",
                    "message": "Ha ocurrido un error inesperado. Por favor intenta de nuevo",
                    "status_code": 500,
                }),
            500,
        )

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        """Manejo de errores de base de datos"""
        from backend_app.models.models import db

        db.session.rollback()

        log_error(
            f"Database error: {str(error)}",
            exception=error,
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "error_type": type(error).__name__,
            },
        )

        # Capturar en Sentry
        sentry_sdk.set_context(
            "database_error",
            {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "endpoint": request.endpoint,
            },
        )
        sentry_sdk.capture_exception(error)

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Error de base de datos",
                    "message": "Ha ocurrido un error al acceder a la base de datos",
                    "status_code": 500,
                }),
            500,
        )

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        """Manejo específico de errores de integridad de BD"""
        from backend_app.models.models import db

        db.session.rollback()

        log_error(
            f"Integrity error: {str(error)}",
            exception=error,
            extra={"endpoint": request.endpoint, "method": request.method},
        )

        # Determinar el tipo de error de integridad
        error_message = str(
            error.orig) if hasattr(
            error,
            "orig") else str(error)

        if "UNIQUE constraint failed" in error_message or "duplicate key" in error_message.lower():
            message = "El recurso ya existe"
            status_code = 409
        elif "FOREIGN KEY constraint failed" in error_message or "foreign key" in error_message.lower():
            message = "Referencia inválida a otro recurso"
            status_code = 400
        else:
            message = "Error de integridad de datos"
            status_code = 400

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Error de integridad",
                    "message": message,
                    "status_code": status_code,
                }
            ),
            status_code,
        )

    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        """Manejo de errores de validación de Marshmallow"""
        log_error(
            f"Validation error: {str(error)}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "validation_errors": error.messages,
            },
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Error de validación",
                    "message": "Los datos proporcionados no son válidos",
                    "validation_errors": error.messages,
                    "status_code": 400,
                }
            ),
            400,
        )

    @app.errorhandler(JWTExtendedException)
    def handle_jwt_error(error):
        """Manejo de errores de JWT"""
        log_error(
            f"JWT error: {str(error)}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "jwt_error_type": type(error).__name__,
            },
        )

        # Diferentes tipos de errores JWT
        error_messages = {
            "ExpiredSignatureError": "Token expirado",
            "InvalidTokenError": "Token inválido",
            "DecodeError": "Token malformado",
            "InvalidSignatureError": "Firma de token inválida",
            "NoAuthorizationError": "Token de autorización requerido",
            "CSRFError": "Error de CSRF en token",
            "WrongTokenError": "Tipo de token incorrecto",
        }

        error_type = type(error).__name__
        message = error_messages.get(error_type, "Error de autenticación")

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Error de autenticación",
                    "message": message,
                    "status_code": 401,
                }
            ),
            401,
        )

    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        """Manejo de excepciones genéricas no capturadas"""
        log_error(
            f"Unhandled exception: {str(error)}",
            exception=error,
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "exception_type": type(error).__name__,
            },
        )

        # Capturar en Sentry con contexto completo
        capture_exception_with_context(
            error,
            {
                "unhandled_exception": {
                    "type": type(error).__name__,
                    "message": str(error),
                    "endpoint": request.endpoint,
                    "method": request.method,
                }
            },
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "Error inesperado",
                    "message": "Ha ocurrido un error inesperado. Por favor contacta al soporte",
                    "status_code": 500,
                }),
            500,
        )

    # Manejador para errores HTTP genéricos
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Manejo de excepciones HTTP genéricas"""
        log_error(
            f"HTTP exception: {error.code} - {error.description}",
            extra={
                "endpoint": request.endpoint,
                "method": request.method,
                "status_code": error.code,
            },
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": error.name,
                    "message": error.description,
                    "status_code": error.code,
                }
            ),
            error.code,
        )


def create_error_response(
        message: str,
        status_code: int = 400,
        error_type: str = None,
        details: dict = None):
    """Crear respuesta de error estandarizada"""
    response = {
        "success": False,
        "error": error_type or "Error",
        "message": message,
        "status_code": status_code,
    }

    if details:
        response["details"] = details

    return jsonify(response), status_code


def log_and_return_error(
    message: str,
    status_code: int = 400,
    exception: Exception = None,
    extra: dict = None,
):
    """Log error y retornar respuesta estandarizada"""
    log_error(message, exception=exception, extra=extra)

    if exception and status_code >= 500:
        capture_exception_with_context(exception, extra)

    return create_error_response(message, status_code)

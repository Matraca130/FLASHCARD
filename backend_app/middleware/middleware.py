"""
Middleware específico para integración frontend-backend
Manejo de CORS, autenticación y headers de seguridad
"""

from flask import request, jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from functools import wraps
import logging
import time

logger = logging.getLogger("app.middleware")


def init_middleware(app):
    """Inicializar middleware personalizado"""

    @app.before_request
    def before_request():
        """Middleware ejecutado antes de cada request"""

        # Log de requests para debugging
        if app.debug:
            logger.debug(f"Request: {request.method} {request.path}")
            logger.debug(f"Headers: {dict(request.headers)}")
            logger.debug(
                f"Origin: {request.headers.get('Origin', 'No Origin')}")

        # Manejar preflight requests (OPTIONS)
        if request.method == "OPTIONS":
            return handle_preflight_request()

        # Agregar información del request al contexto global
        g.request_start_time = time.time()
        g.user_id = None

        # Intentar obtener información del usuario si hay token
        try:
            if "Authorization" in request.headers:
                verify_jwt_in_request(optional=True)
                g.user_id = get_jwt_identity()
        except Exception:
            # No hacer nada si el token es inválido,
            # los endpoints protegidos manejarán esto
            pass

    @app.after_request
    def after_request(response):
        """Middleware ejecutado después de cada request"""

        # Agregar headers de seguridad
        add_security_headers(response, app)

        # Agregar headers de CORS si es necesario
        add_cors_headers(response, app)

        # Log de respuesta para debugging
        if app.debug:
            duration = time.time() - getattr(g, "request_start_time", 0)
            logger.debug(
                f"Response: {response.status_code} in {duration:.3f}s")

        return response


def handle_preflight_request():
    """Manejar requests OPTIONS (preflight)"""
    response = jsonify({"status": "preflight"})
    response.status_code = 200
    return response


def add_security_headers(response, app):
    """Agregar headers de seguridad"""
    security_headers = app.config.get("SECURITY_HEADERS", {})

    for header, value in security_headers.items():
        response.headers[header] = value

    # Headers adicionales para APIs
    response.headers["X-API-Version"] = app.config.get("API_VERSION", "1.0.0")

    # Cache control para APIs
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"


def add_cors_headers(response, app):
    """Agregar headers de CORS específicos"""
    origin = request.headers.get("Origin")
    allowed_origins = app.config.get("CORS_ORIGINS", [])

    # Verificar si el origin está permitido
    if origin and (origin in allowed_origins or "*" in allowed_origins):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, X-API-Key, X-Requested-With, Accept, Origin"
        )
        response.headers["Access-Control-Expose-Headers"] = (
            "X-Total-Count, X-Page-Count, X-Rate-Limit-Remaining, X-Rate-Limit-Reset, X-API-Version"
        )
        response.headers["Access-Control-Max-Age"] = "3600"


def require_auth(f):
    """Decorator para endpoints que requieren autenticación"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return f(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Authentication failed: {str(e)}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Token de autorización requerido o inválido",
                        "code": "AUTHENTICATION_REQUIRED",
                    }
                ),
                401,
            )

    return decorated_function


def require_auth_optional(f):
    """Decorator para endpoints con autenticación opcional"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request(optional=True)
        except Exception:
            # Ignorar errores de autenticación en endpoints opcionales
            pass
        return f(*args, **kwargs)

    return decorated_function


def rate_limit_by_user(f):
    """Decorator para rate limiting por usuario"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        get_jwt_identity() if get_jwt_identity() else request.remote_addr

        # Implementar lógica de rate limiting personalizada aquí
        # Por ahora, usar el rate limiting global de Flask-Limiter

        return f(*args, **kwargs)

    return decorated_function


def validate_json(required_fields=None):
    """Decorator para validar JSON en requests"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Content-Type debe ser application/json",
                            "code": "INVALID_CONTENT_TYPE",
                        }
                    ),
                    400,
                )

            data = request.get_json()
            if not data:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "JSON inválido o vacío",
                            "code": "INVALID_JSON",
                        }
                    ),
                    400,
                )

            # Validar campos requeridos
            if required_fields:
                missing_fields = [
                    field for field in required_fields if field not in data]
                if missing_fields:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": f'Campos requeridos faltantes: {", ".join(missing_fields)}',
                                "code": "MISSING_REQUIRED_FIELDS",
                            }),
                        400,
                    )

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def handle_api_errors(f):
    """Decorator para manejo consistente de errores en APIs"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.warning(f"Validation error in {f.__name__}: {str(e)}")
            return (
                jsonify({"success": False, "error": str(e), "code": "VALIDATION_ERROR"}),
                400,
            )
        except PermissionError as e:
            logger.warning(f"Permission error in {f.__name__}: {str(e)}")
            return (jsonify({"success": False,
                             "error": "No tienes permisos para realizar esta acción",
                             "code": "PERMISSION_DENIED",
                             }),
                    403,
                    )
        except Exception as e:
            logger.error(
                f"Unexpected error in {f.__name__}: {str(e)}",
                exc_info=True)
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Error interno del servidor",
                        "code": "INTERNAL_ERROR",
                    }
                ),
                500,
            )

    return decorated_function

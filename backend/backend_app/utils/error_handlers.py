"""
Manejador global de errores para eliminar duplicación de código en try/except
"""
import logging
from functools import wraps
from flask import jsonify
from backend_app.extensions import db

logger = logging.getLogger(__name__)


def handle_api_errors(f):
    """
    Decorador para manejar errores de API de forma centralizada
    Elimina la necesidad de try/except repetitivos en cada ruta
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.error(f"Error de validación en {f.__name__}: {str(e)}")
            return jsonify({'error': str(e)}), 400
        except PermissionError as e:
            logger.error(f"Error de permisos en {f.__name__}: {str(e)}")
            return jsonify(
                {'error': 'No tienes permisos para realizar esta acción'}), 403
        except Exception as e:
            logger.error(f"Error interno en {f.__name__}: {str(e)}")
            db.session.rollback()
            return jsonify({'error': 'Error interno del servidor'}), 500

    return decorated_function


def handle_service_errors(f):
    """
    Decorador para manejar errores en servicios con rollback automático
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            result = f(*args, **kwargs)
            if hasattr(result, 'get') and not result.get('success', True):
                # Si el servicio retorna un error, hacer rollback
                db.session.rollback()
            else:
                # Si todo está bien, hacer commit
                db.session.commit()
            return result
        except Exception as e:
            logger.error(f"Error en servicio {f.__name__}: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': 'Error interno del servidor',
                'details': str(e)
            }

    return decorated_function


class APIError(Exception):
    """Excepción personalizada para errores de API"""

    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundError(APIError):
    """Excepción para recursos no encontrados"""

    def __init__(self, resource="Recurso"):
        super().__init__(f"{resource} no encontrado", 404)


class ValidationError(APIError):
    """Excepción para errores de validación"""

    def __init__(self, message):
        super().__init__(message, 400)


class PermissionError(APIError):
    """Excepción para errores de permisos"""

    def __init__(self, message="No tienes permisos para realizar esta acción"):
        super().__init__(message, 403)

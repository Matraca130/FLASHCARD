"""
Response Helpers - Calidad Empresarial Premium
Centraliza la creación de respuestas API para garantizar consistencia y mantenibilidad
"""
from typing import Dict, Any, Optional, Union, List
from flask import jsonify
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ResponseStatus:
    """Constantes para estados de respuesta estandarizados"""
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class HTTPStatus:
    """Constantes para códigos de estado HTTP más legibles"""
    OK = 200
    CREATED = 201
    NO_CONTENT = 204
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    INTERNAL_SERVER_ERROR = 500


class APIResponse:
    """
    Clase para crear respuestas API estandarizadas con calidad empresarial
    Garantiza consistencia en toda la aplicación y facilita el mantenimiento
    """

    @staticmethod
    def success(
        data: Optional[Union[Dict, List, str, int]] = None,
        message: str = "Operación exitosa",
        status_code: int = HTTPStatus.OK,
        meta: Optional[Dict[str, Any]] = None
    ) -> tuple:
        """
        Crea una respuesta de éxito estandarizada

        Args:
            data: Datos a retornar (opcional)
            message: Mensaje descriptivo del éxito
            status_code: Código de estado HTTP
            meta: Metadatos adicionales (paginación, etc.)

        Returns:
            tuple: (response_json, status_code)
        """
        response = {
            "status": ResponseStatus.SUCCESS,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }

        if meta:
            response["meta"] = meta

        logger.info(f"API Success Response: {message}")
        return jsonify(response), status_code

    @staticmethod
    def error(
        message: str = "Ha ocurrido un error",
        status_code: int = HTTPStatus.BAD_REQUEST,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        field_errors: Optional[Dict[str, List[str]]] = None
    ) -> tuple:
        """
        Crea una respuesta de error estandarizada

        Args:
            message: Mensaje de error principal
            status_code: Código de estado HTTP
            error_code: Código de error interno para debugging
            details: Detalles adicionales del err
            or field_errors: Errores específicos por campo (validaciones)

        Returns:
            tuple: (response_json, status_code)
        """
        response = {
            "status": ResponseStatus.ERROR,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }

        if error_code:
            response["error_code"] = error_code

        if details:
            response["details"] = details

        if field_errors:
            response["field_errors"] = field_errors

        logger.error(f"API Error Response: {message} (Code: {status_code})")
        return jsonify(response), status_code

    @staticmethod
    def not_found(resource: str = "Recurso") -> tuple:
        """
        Respuesta estandarizada para recursos no encontrados

        Args:
            resource: Nombre del recurso no encontrado

        Returns:
            tuple: (response_json, 404)
        """
        return APIResponse.error(
            message=f"{resource} no encontrado",
            status_code=HTTPStatus.NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND"
        )

    @staticmethod
    def unauthorized(message: str = "No autorizado") -> tuple:
        """
        Respuesta estandarizada para errores de autenticación

        Args:
            message: Mensaje de error personalizado

        Returns:
            tuple: (response_json, 401)
        """
        return APIResponse.error(
            message=message,
            status_code=HTTPStatus.UNAUTHORIZED,
            error_code="UNAUTHORIZED"
        )

    @staticmethod
    def forbidden(
            message: str = "No tienes permisos para realizar esta acción") -> tuple:
        """
        Respuesta estandarizada para errores de autorización

        Args:
            message: Mensaje de error personalizado

        Returns:
            tuple: (response_json, 403)
        """
        return APIResponse.error(
            message=message,
            status_code=HTTPStatus.FORBIDDEN,
            error_code="FORBIDDEN"
        )

    @staticmethod
    def validation_error(
        message: str = "Error de validación",
        field_errors: Optional[Dict[str, List[str]]] = None
    ) -> tuple:
        """
        Respuesta estandarizada para errores de validación

        Args:
            message: Mensaje principal de err
            or field_errors: Errores específicos por campo

        Returns:
            tuple: (response_json, 422)
        """
        return APIResponse.error(
            message=message,
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            field_errors=field_errors
        )

    @staticmethod
    def created(
        data: Optional[Union[Dict, List]] = None,
        message: str = "Recurso creado exitosamente",
        location: Optional[str] = None
    ) -> tuple:
        """
        Respuesta estandarizada para recursos creados

        Args:
            data: Datos del recurso creado
            message: Mensaje de éxito
            location: URL del recurso creado (para header Location)

        Returns:
            tuple: (response_json, 201)
        """
        response, status_code = APIResponse.success(
            data=data,
            message=message,
            status_code=HTTPStatus.CREATED
        )

        if location:
            response.headers['Location'] = location

        return response, status_code

    @staticmethod
    def paginated(
        data: List[Any],
        page: int,
        per_page: int,
        total: int,
        message: str = "Datos obtenidos exitosamente"
    ) -> tuple:
        """
        Respuesta estandarizada para datos paginados

        Args:
            data: Lista de elementos de la página actual
            page: Número de página actual
            per_page: Elementos por página
            total: Total de elementos
            message: Mensaje de éxito

        Returns:
            tuple: (response_json, 200)
        """
        total_pages = (total + per_page - 1) // per_page

        meta = {
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }

        return APIResponse.success(
            data=data,
            message=message,
            meta=meta
        )


class ServiceResponse:
    """
    Clase para respuestas de servicios internos
    Separa las respuestas de servicios de las respuestas de API
    """

    @staticmethod
    def success(data: Any = None,
                message: str = "Operación exitosa") -> Dict[str, Any]:
        """
        Respuesta de éxito para servicios internos

        Args:
            data: Datos a retornar
            message: Mensaje descriptivo

        Returns:
            Dict con estructura estandarizada
        """
        return {
            "success": True,
            "data": data,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }

    @staticmethod
    def error(message: str,
              error_code: Optional[str] = None,
              details: Any = None) -> Dict[str,
                                           Any]:
        """
        Respuesta de error para servicios internos

        Args:
            message: Mensaje de err
            or error_code: Código de error interno
            details: Detalles adicionales

        Returns:
            Dict con estructura estandarizada
        """
        response = {
            "success": False,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }

        if error_code:
            response["error_code"] = error_code

        if details:
            response["details"] = details

        return response

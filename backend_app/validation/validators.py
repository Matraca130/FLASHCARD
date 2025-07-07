"""
Utilidades de validación y decoradores
Proporciona funciones helper para validación consistente
"""

from functools import wraps
from flask import request, jsonify
from pydantic import BaseModel, ValidationError
from typing import Type, Dict, Any
import logging

logger = logging.getLogger(__name__)


def validate_json(schema: Type[BaseModel]):
    """
    Decorador para validar JSON de entrada usando esquemas Pydantic

    Args:
        schema: Clase de esquema Pydantic para validación

    Returns:
        Decorador que valida la entrada y pasa datos validados a la función
    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Obtener datos JSON
                data = request.get_json()

                if not data:
                    return (
                        jsonify(
                            {
                                "error": "No se proporcionaron datos JSON",
                                "details": "El cuerpo de la petición debe contener JSON válido",
                            }),
                        400,
                    )

                # Validar usando esquema Pydantic
                try:
                    validated_data = schema(**data)
                    # Convertir a dict para compatibilidad
                    kwargs["validated_data"] = validated_data.dict()
                    return f(*args, **kwargs)

                except ValidationError as e:
                    # Formatear errores de validación
                    errors = []
                    for error in e.errors():
                        field = ".".join(str(x) for x in error["loc"])
                        message = error["msg"]
                        errors.append(
                            {"field": field, "message": message, "type": error["type"]})

                    return (
                        jsonify({"error": "Datos de entrada inválidos", "details": errors}),
                        400,
                    )

            except Exception as e:
                logger.error(f"Error en validación: {str(e)}")
                return (
                    jsonify(
                        {
                            "error": "Error interno de validación",
                            "details": "Contacte al administrador si el problema persiste",
                        }),
                    500,
                )

        return decorated_function

    return decorator


def validate_query_params(schema: Type[BaseModel]):
    """
    Decorador para validar parámetros de query usando esquemas Pydantic

    Args:
        schema: Clase de esquema Pydantic para validación

    Returns:
        Decorador que valida parámetros de query
    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Obtener parámetros de query
                query_params = request.args.to_dict()

                # Validar usando esquema Pydantic
                try:
                    validated_params = schema(**query_params)
                    kwargs["validated_params"] = validated_params.dict()
                    return f(*args, **kwargs)

                except ValidationError as e:
                    # Formatear errores de validación
                    errors = []
                    for error in e.errors():
                        field = ".".join(str(x) for x in error["loc"])
                        message = error["msg"]
                        errors.append(
                            {"field": field, "message": message, "type": error["type"]})

                    return (
                        jsonify(
                            {
                                "error": "Parámetros de consulta inválidos",
                                "details": errors,
                            }
                        ),
                        400,
                    )

            except Exception as e:
                logger.error(f"Error en validación de query params: {str(e)}")
                return (
                    jsonify(
                        {
                            "error": "Error interno de validación",
                            "details": "Contacte al administrador si el problema persiste",
                        }),
                    500,
                )

        return decorated_function

    return decorator


def validate_data_manually(
        data: Dict[Any, Any], schema: Type[BaseModel]) -> Dict[str, Any]:
    """
    Validar datos manualmente sin decorador
    
    Args:
        data: Datos a validar
        schema: Esquema Pydantic

    Returns:
        Dict con datos validados o información de error
    
    Raises:
        ValidationError: Si los datos no son válidos
    """
    try:
        validated_data = schema(**data)
        return {"success": True, "data": validated_data.dict()}
    except ValidationError as e:
        errors = []
        for error in e.errors():
            field = ".".join(str(x) for x in error["loc"])
            message = error["msg"]
            errors.append(
                {"field": field, "message": message, "type": error["type"]})

        return {"success": False, "errors": errors}


def sanitize_string(value: str, max_length: int = None) -> str:
    """
    Sanitizar string de entrada

    Args:
        value: String a sanitizar
        max_length: Longitud máxima opcional

    Returns:
        String sanitizado
    """
    if not isinstance(value, str):
        return str(value)

    # Remover espacios al inicio y final
    sanitized = value.strip()

    # Truncar si es necesario
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    return sanitized


def validate_file_upload(file, allowed_extensions: set,
                         max_size_mb: int = 5) -> Dict[str, Any]:
    """
    Validar archivo subido

    Args:
        file: Archivo de Flask
        allowed_extensions: Extensiones permitidas
        max_size_mb: Tamaño máximo en MB

    Returns:
        Dict con resultado de validación
    """
    if not file:
        return {"success": False, "error": "No se proporcionó archivo"}

    if file.filename == "":
        return {"success": False, "error": "Nombre de archivo vacío"}

    # Verificar extensión
    if "." not in file.filename:
        return {"success": False, "error": "Archivo sin extensión"}

    extension = file.filename.rsplit(".", 1)[1].lower()
    if extension not in allowed_extensions:
        return {
            "success": False,
            "error": f'Extensión no permitida. Permitidas: {", ".join(allowed_extensions)}',
        }

    # Verificar tamaño (si es posible)
    try:
        file.seek(0, 2)  # Ir al final del archivo
        size = file.tell()
        file.seek(0)  # Volver al inicio

        max_size_bytes = max_size_mb * 1024 * 1024
        if size > max_size_bytes:
            return {
                "success": False,
                "error": f"Archivo demasiado grande. Máximo: {max_size_mb}MB",
            }
    except Exception:
        # Si no se puede verificar el tamaño, continuar
        pass

    return {"success": True, "filename": file.filename, "extension": extension}


class ValidationHelper:
    """Clase helper con métodos de validación comunes"""

    @staticmethod
    def is_valid_email(email: str) -> bool:
        """Verificar si un email es válido"""
        import re

        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return re.match(pattern, email) is not None

    @staticmethod
    def is_strong_password(password: str) -> Dict[str, Any]:
        """
        Verificar fortaleza de contraseña

        Returns:
            Dict con resultado y detalles
        """
        import re

        checks = {
            "length": len(password) >= 8,
            "uppercase": bool(re.search(r"[A-Z]", password)),
            "lowercase": bool(re.search(r"[a-z]", password)),
            "digit": bool(re.search(r"\d", password)),
            "special": bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password)),
        }

        score = sum(checks.values())

        if score >= 4:
            strength = "strong"
        elif score >= 3:
            strength = "medium"
        else:
            strength = "weak"

        return {
            "strength": strength,
            "score": score,
            "checks": checks,
            "is_valid": score >= 3,
        }

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitizar nombre de archivo"""
        import re

        # Remover caracteres peligrosos
        sanitized = re.sub(r"[^\w\-_\.]", "_", filename)
        # Limitar longitud
        if len(sanitized) > 100:
            name, ext = sanitized.rsplit(
                ".", 1) if "." in sanitized else (
                sanitized, "")
            sanitized = name[:95] + ("." + ext if ext else "")
        return sanitized

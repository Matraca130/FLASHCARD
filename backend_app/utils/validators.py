"""
Validadores comunes para eliminar duplicación de código en validaciones
"""
from flask import request
from .error_handlers import ValidationErr

def validate_json_data():
    """
    Valida que la petición contenga datos JSON válidos
    Retorna los datos o lanza ValidationError
    """
    if not request.is_json:
        raise ValidationError("La petición debe contener datos JSON")

    data = request.get_json()
    if not data:
        raise ValidationError("No se enviaron datos")

    return data


def validate_required_fields(data, required_fields):
    """
    Valida que todos los campos requeridos estén presentes y no vacíos

    Args:
        data (dict): Datos a validar
        required_fields (list): Lista de campos requeridos

    Raises:
        ValidationError: Si falta algún campo requerido
    """
    missing_fields = []
    empty_fields = []

    for field in required_fields:
        if field not in data:
            missing_fields.append(field)
        elif not data[field] or (isinstance(data[field], str) and not data[field].strip()):
            empty_fields.append(field)

    if missing_fields:
        raise ValidationError(
            f"Campos requeridos faltantes: {', '.join(missing_fields)}")

    if empty_fields:
        raise ValidationError(
            f"Los siguientes campos no pueden estar vacíos: {', '.join(empty_fields)}")


def validate_email(email):
    """
    Valida formato de email básico

    Args:
        email (str): Email a validar

    Raises:
        ValidationError: Si el email no es válido
    """
    import re

    if not email or not isinstance(email, str):
        raise ValidationError("Email es requerido")

    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email.strip()):
        raise ValidationError("Formato de email inválido")


def validate_password(password):
    """
    Valida que la contraseña cumpla con requisitos mínimos

    Args:
        password (str): Contraseña a validar

    Raises:
        ValidationError: Si la contraseña no es válida
    """
    if not password or not isinstance(password, str):
        raise ValidationError("Contraseña es requerida")

    if len(password) < 6:
        raise ValidationError("La contraseña debe tener al menos 6 caracteres")


def validate_positive_integer(value, field_name):
    """
    Valida que un valor sea un entero positivo

    Args:
        value: Valor a validar
        field_name (str): Nombre del campo para el mensaje de err
    or Raises:
        ValidationError: Si el valor no es válido
    """
    try:
        int_value = int(value)
        if int_value <= 0:
            raise ValidationError(f"{field_name} debe ser un número positivo")
        return int_value
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} debe ser un número válido")


def validate_string_length(value, field_name, min_length=1, max_length=None):
    """
    Valida la longitud de una cadena

    Args:
        value (str): Valor a validar
        field_name (str): Nombre del campo
        min_length (int): Longitud mínima
        max_length (int): Longitud máxima (opcional)

    Raises:
        ValidationError: Si la longitud no es válida
    """
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} debe ser una cadena de texto")

    if len(value.strip()) < min_length:
        raise ValidationError(
            f"{field_name} debe tener al menos {min_length} caracteres")

    if max_length and len(value.strip()) > max_length:
        raise ValidationError(
            f"{field_name} no puede tener más de {max_length} caracteres")

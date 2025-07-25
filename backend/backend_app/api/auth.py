"""
Rutas de autenticación para StudyingFlash
Compatible con frontend existente
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend_app.models import User
from backend_app.services_new import UserService
from backend_app.extensions import db
from backend_app.validation.schemas import UserRegistrationSchema, UserLoginSchema
from backend_app.validation.validators import validate_json
from backend_app.utils.error_handlers import handle_api_errors
from backend_app.utils.auth_utils import get_current_user_or_404
from backend_app.utils.response_helpers import APIResponse
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)

# Usar servicio refactorizado con inyección de dependencias
user_service = UserService(db=db)


@auth_bp.route("/login", methods=["POST"])
@validate_json(UserLoginSchema)
@handle_api_errors
def login(validated_data):
    """
    Autenticación de usuario - Compatible con frontend
    POST /api/auth/login
    """
    # Usar servicio para autenticar con datos validados
    result = user_service.authenticate_user(
        validated_data["email"], validated_data["password"])
    if not result["success"]:
        return jsonify({"error": result["error"]}), 401

    user_data = result["data"]

    return (
        jsonify(
            {
                "success": True,
                "token": user_data["token"],
                "user": {
                    "id": user_data["id"],
                    "email": user_data["email"],
                    "username": user_data["user"].username,
                    "first_name": user_data["user"].first_name,
                    "last_name": user_data["user"].last_name,
                },
            }
        ),
        200,
    )


@auth_bp.route("/register", methods=["POST"])
@validate_json(UserRegistrationSchema)
@handle_api_errors
def register(validated_data):
    """
    Registro de usuario - Compatible con frontend
    POST /api/auth/register
    """
    # Usar servicio para registrar con datos validados
    result = user_service.register_user(validated_data)

    if not result["success"]:
        return jsonify({"error": result["error"]}), 400

    user_data = result["data"]

    return (
        jsonify(
            {
                "success": True,
                "token": user_data["token"],
                "user": {
                    "id": user_data["id"],
                    "email": user_data["email"],
                    "username": user_data["user"].username,
                    "first_name": user_data["user"].first_name,
                    "last_name": user_data["user"].last_name,
                },
            }
        ),
        201,
    )


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
@handle_api_errors
def get_profile():
    """
    Obtener perfil del usuario autenticado
    GET /api/auth/profile
    """
    user_id = get_jwt_identity()
    # Elimina duplicación de verificación
    user = get_current_user_or_404(user_id)

    return (
        jsonify(
            {
                "success": True,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "bio": user.bio,
                    "avatar_url": user.avatar_url,
                    "daily_goal": user.daily_goal,
                    "current_streak": user.current_streak,
                    "total_study_time": user.total_study_time,
                    "total_cards_studied": user.total_cards_studied,
                    "member_since": user.created_at.isoformat(),
                },
            }
        ),
        200,
    )


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
@handle_api_errors
def update_profile():
    """
    Actualizar perfil del usuario
    PUT /api/auth/profile
    """
    user_id = get_jwt_identity()
    user = get_current_user_or_404(user_id)  # Elimina duplicación

    data = request.get_json()
    if not data:
        return jsonify({"error": "No se proporcionaron datos"}), 400

    # Actualizar campos permitidos
    updatable_fields = [
        "first_name",
        "last_name",
        "bio",
        "daily_goal",
        "timezone",
        "language",
    ]
    for field in updatable_fields:
        if field in data:
            setattr(user, field, data[field])

    db.session.commit()

    return (
        jsonify(
            {
                "success": True,
                "message": "Perfil actualizado correctamente",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "bio": user.bio,
                    "daily_goal": user.daily_goal,
                },
            }
        ),
        200,
    )


@auth_bp.route("/verify-token", methods=["GET"])
@jwt_required()
@handle_api_errors
def verify_token():
    """
    Verificar si el token es válido
    GET /api/auth/verify-token
    """
    user_id = get_jwt_identity()
    user = get_current_user_or_404(user_id)  # Elimina duplicación

    return jsonify(
        {"success": True, "valid": True, "user_id": user_id}), 200

"""
Endpoints para manejo de refresh tokens y autenticación mejorada
"""

from backend_app.api.error_handlers import create_error_response
from backend_app.utils.monitoring import monitor_api_endpoint, log_user_action
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from marshmallow import Schema, fields, ValidationError
from backend_app.utils.auth_helpers import AuthHelper, TokenBlacklist


# Blueprint para autenticación con refresh tokens
auth_refresh_bp = Blueprint("auth_refresh", __name__)


class LoginSchema(Schema):
    """Schema para login"""

    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=lambda x: len(x) >= 6)


class RefreshTokenSchema(Schema):
    """Schema para refresh token"""

    refresh_token = fields.Str(required=True)


@auth_refresh_bp.route("/login", methods=["POST"])
@monitor_api_endpoint
def login():
    """
    Login con generación de access y refresh tokens
    POST /api/auth/login
    """
    try:
        # Validar datos de entrada
        schema = LoginSchema()
        data = schema.load(request.get_json() or {})

    except ValidationError as e:
        return create_error_response(
            "Datos de login inválidos",
            400,
            "validation_error",
            e.messages)

    # Autenticar usuario
    user = AuthHelper.authenticate_user(data["email"], data["password"])

    if not user:
        return create_error_response(
            "Credenciales inválidas", 401, "authentication_failed")

    try:
        # Crear tokens
        tokens = AuthHelper.create_tokens_for_user(user)

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Login exitoso",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                    },
                    "tokens": tokens,
                }
            ),
            200,
        )

    except Exception:
        return create_error_response(
            "Error interno durante login", 500, "internal_error")


@auth_refresh_bp.route("/refresh", methods=["POST"])
@monitor_api_endpoint
def refresh_token():
    """
    Renovar access token usando refresh token
    POST /api/auth/refresh
    """
    try:
        # Validar datos de entrada
        schema = RefreshTokenSchema()
        data = schema.load(request.get_json() or {})

    except ValidationError as e:
        return create_error_response(
            "Refresh token requerido",
            400,
            "validation_error",
            e.messages)

    # Renovar token
    new_tokens = AuthHelper.refresh_access_token(data["refresh_token"])

    if not new_tokens:
        return create_error_response(
            "Refresh token inválido o expirado",
            401,
            "invalid_refresh_token")

    return (
        jsonify(
            {
                "success": True,
                "message": "Token renovado exitosamente",
                "tokens": new_tokens,
            }
        ),
        200,
    )


@auth_refresh_bp.route("/logout", methods=["POST"])
@jwt_required()
@monitor_api_endpoint
def logout():
    """
    Logout con revocación de tokens
    POST /api/auth/logout
    """
    user_id = get_jwt_identity()
    jti = get_jwt()["jti"]  # JWT ID para blacklist

    try:
        # Obtener refresh token del request (opcional)
        data = request.get_json() or {}
        refresh_token = data.get("refresh_token")

        # Agregar access token a blacklist
        TokenBlacklist.add_token(jti)

        # Revocar refresh token si se proporciona
        if refresh_token:
            AuthHelper.revoke_refresh_token(refresh_token, "logout")

        log_user_action("logout", {"method": "single_session"}, user_id)

        return jsonify({"success": True, "message": "Logout exitoso"}), 200

    except Exception:
        return create_error_response(
            "Error durante logout", 500, "internal_error")


@auth_refresh_bp.route("/logout-all", methods=["POST"])
@jwt_required()
@monitor_api_endpoint
def logout_all():
    """
    Logout de todas las sesiones del usuario
    POST /api/auth/logout-all
    """
    user_id = get_jwt_identity()
    jti = get_jwt()["jti"]

    try:
        # Agregar token actual a blacklist
        TokenBlacklist.add_token(jti)

        # Revocar todos los refresh tokens del usuario
        revoked_count = AuthHelper.revoke_all_user_tokens(
            user_id, "logout_all")

        log_user_action(
            "logout_all", {
                "revoked_sessions": revoked_count}, user_id)

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"Logout exitoso de {revoked_count} sesiones",
                    "revoked_sessions": revoked_count,
                }
            ),
            200,
        )

    except Exception:
        return create_error_response(
            "Error durante logout completo", 500, "internal_error")


@auth_refresh_bp.route("/sessions", methods=["GET"])
@jwt_required()
@monitor_api_endpoint
def get_user_sessions():
    """
    Obtener sesiones activas del usuario
    GET /api/auth/sessions
    """
    user_id = get_jwt_identity()

    try:
        sessions = AuthHelper.get_user_sessions(user_id)

        return (jsonify({"success": True, "sessions": sessions,
                         "total_sessions": len(sessions)}), 200, )

    except Exception:
        return create_error_response(
            "Error obteniendo sesiones", 500, "internal_error")


@auth_refresh_bp.route("/revoke-session/<int:session_id>", methods=["DELETE"])
@jwt_required()
@monitor_api_endpoint
def revoke_session(session_id):
    """
    Revocar sesión específica
    DELETE /api/auth/revoke-session/<session_id>
    """
    user_id = get_jwt_identity()

    try:
        from backend_app.models.refresh_token import RefreshToken

        # Verificar que la sesión pertenece al usuario
        token_record = RefreshToken.query.filter(
            RefreshToken.id == session_id,
            RefreshToken.user_id == user_id,
            not RefreshToken.is_revoked,
            not RefreshToken.is_deleted,
        ).first()

        if not token_record:
            return create_error_response(
                "Sesión no encontrada", 404, "session_not_found")

        # Revocar sesión
        token_record.revoke("manual_revocation")
        from backend_app.models.models import db

        db.session.commit()

        log_user_action(
            "session_revoked",
            {"session_id": session_id, "device_info": token_record.device_info},
            user_id,
        )

        return (
            jsonify({"success": True, "message": "Sesión revocada exitosamente"}),
            200,
        )

    except Exception:
        return create_error_response(
            "Error revocando sesión", 500, "internal_error")


@auth_refresh_bp.route("/validate-token", methods=["POST"])
@jwt_required()
@monitor_api_endpoint
def validate_token():
    """
    Validar token actual y obtener información del usuario
    POST /api/auth/validate-token
    """
    user_id = get_jwt_identity()
    jti = get_jwt()["jti"]

    # Verificar si el token está en blacklist
    if TokenBlacklist.is_blacklisted(jti):
        return create_error_response(
            "Token revocado", 401, "token_blacklisted")

    try:
        from backend_app.models.models import User

        user = User.query.get(user_id)

        if not user or user.is_deleted:
            return create_error_response(
                "Usuario no encontrado", 404, "user_not_found")

        return (
            jsonify(
                {
                    "success": True,
                    "valid": True,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                    },
                    "token_info": {
                        "jti": jti,
                        "issued_at": get_jwt().get("iat"),
                        "expires_at": get_jwt().get("exp"),
                    },
                }
            ),
            200,
        )

    except Exception:
        return create_error_response(
            "Error validando token", 500, "internal_error")


# Middleware para verificar tokens en blacklist
@auth_refresh_bp.before_app_request
def check_if_token_revoked():
    """Verificar si el token está en blacklist antes de cada request"""
    from flask_jwt_extended import verify_jwt_in_request, get_jwt

    try:
        # Solo verificar en endpoints que requieren JWT
        if request.endpoint and "auth" in request.endpoint:
            verify_jwt_in_request(optional=True)

            if get_jwt():  # Si hay JWT en el request
                jti = get_jwt()["jti"]
                if TokenBlacklist.is_blacklisted(jti):
                    return create_error_response(
                        "Token revocado", 401, "token_blacklisted")
    except Exception:
        # Si hay error verificando JWT, continuar normalmente
        # El decorador @jwt_required() manejará el error apropiadamente
        pass

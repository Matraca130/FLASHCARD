"""
Utilidades para manejo de autenticación y refresh tokens
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

from flask import request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
)
from werkzeug.security import check_password_hash

from backend_app.models.models import db, User
from backend_app.models.refresh_token import RefreshToken
from backend_app.utils.monitoring import log_user_action, log_err

or class AuthHelper:
    """Clase helper para operaciones de autenticación"""

    @staticmethod
    def create_token_hash(token: str) -> str:
        """Crear hash seguro del token"""
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def generate_secure_token() -> str:
        """Generar token seguro aleatorio"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def get_device_info() -> str:
        """Obtener información del dispositivo desde request"""
        user_agent = request.headers.get("User-Agent", "Unknown")
        # Limitar longitud para evitar ataques
        return user_agent[:500] if user_agent else "Unknown"

    @staticmethod
    def get_client_ip() -> str:
        """Obtener IP del cliente"""
        # Verificar headers de proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        return request.remote_addr or "Unknown"

    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[User]:
        """Autenticar usuario con email y contraseña"""
        try:
            user = User.query.filter(
                User.email == email, not User.is_deleted).first()

            if user and check_password_hash(user.password_hash, password):
                log_user_action("login_success", {"email": email}, user.id)
                return user
            else:
                log_user_action(
                    "login_failed", {
                        "email": email, "reason": "invalid_credentials"})
                return None

        except Exception as e:
            log_error(f"Error during authentication: {str(e)}", exception=e)
            return None

    @staticmethod
    def create_tokens_for_user(user: User) -> Dict[str, str]:
        """Crear access token y refresh token para usuario"""
        try:
            # Crear access token (corta duración)
            access_token = create_access_token(
                identity=user.id, expires_delta=timedelta(
                    hours=1))  # 1 hora

            # Crear refresh token (larga duración)
            refresh_token = create_refresh_token(
                identity=user.id, expires_delta=timedelta(
                    days=30))  # 30 días

            # Guardar refresh token en BD
            token_hash = AuthHelper.create_token_hash(refresh_token)
            device_info = AuthHelper.get_device_info()
            ip_address = AuthHelper.get_client_ip()

            refresh_token_record = RefreshToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=datetime.utcnow() + timedelta(days=30),
                device_info=device_info,
                ip_address=ip_address,
            )

            db.session.add(refresh_token_record)
            db.session.commit()

            log_user_action(
                "tokens_created",
                {"device_info": device_info, "ip_address": ip_address},
                user.id,
            )

            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "expires_in": 3600,  # 1 hora en segundos
            }

        except Exception as e:
            db.session.rollback()
            log_error(
                f"Error creating tokens for user {user.id}: {str(e)}",
                exception=e)
            raise

    @staticmethod
    def refresh_access_token(refresh_token: str) -> Optional[Dict[str, str]]:
        """Renovar access token usando refresh token"""
        try:
            # Verificar refresh token en BD
            token_hash = AuthHelper.create_token_hash(refresh_token)
            refresh_record = RefreshToken.get_valid_token(token_hash)

            if not refresh_record:
                log_user_action("refresh_failed", {"reason": "invalid_token"})
                return None

            # Actualizar última vez usado
            refresh_record.update_last_used()

            # Crear nuevo access token
            new_access_token = create_access_token(
                identity=refresh_record.user_id,
                expires_delta=timedelta(
                    hours=1))

            db.session.commit()

            log_user_action(
                "token_refreshed",
                {"ip_address": AuthHelper.get_client_ip()},
                refresh_record.user_id,
            )

            return {
                "access_token": new_access_token,
                "token_type": "Bearer",
                "expires_in": 3600,
            }

        except Exception as e:
            db.session.rollback()
            log_error(f"Error refreshing token: {str(e)}", exception=e)
            return None

    @staticmethod
    def revoke_refresh_token(
            refresh_token: str,
            reason: str = "manual") -> bool:
        """Revocar refresh token específico"""
        try:
            token_hash = AuthHelper.create_token_hash(refresh_token)
            refresh_record = RefreshToken.get_valid_token(token_hash)

            if refresh_record:
                refresh_record.revoke(reason)
                db.session.commit()

                log_user_action(
                    "token_revoked",
                    {"reason": reason, "token_id": refresh_record.id},
                    refresh_record.user_id,
                )

                return True

            return False

        except Exception as e:
            db.session.rollback()
            log_error(f"Error revoking token: {str(e)}", exception=e)
            return False

    @staticmethod
    def revoke_all_user_tokens(
            user_id: int,
            reason: str = "logout_all") -> int:
        """Revocar todos los tokens de un usuario"""
        try:
            count = RefreshToken.revoke_all_for_user(user_id, reason)

            log_user_action(
                "all_tokens_revoked", {
                    "reason": reason, "tokens_count": count}, user_id)

            return count

        except Exception as e:
            log_error(
                f"Error revoking all tokens for user {user_id}: {str(e)}",
                exception=e)
            return 0

    @staticmethod
    def get_user_sessions(user_id: int) -> list:
        """Obtener sesiones activas del usuario"""
        try:
            tokens = RefreshToken.get_user_tokens(user_id, active_only=True)

            sessions = []
            for token in tokens:
                sessions.append(
                    {
                        "id": token.id,
                        "device_info": token.device_info,
                        "ip_address": token.ip_address,
                        "last_used": (
                            token.last_used.isoformat() if token.last_used else None),
                        "created_at": (
                            token.created_at.isoformat() if token.created_at else None),
                        "expires_at": (
                            token.expires_at.isoformat() if token.expires_at else None),
                    })

            return sessions

        except Exception as e:
            log_error(
                f"Error getting user sessions for user {user_id}: {str(e)}",
                exception=e)
            return []

    @staticmethod
    def cleanup_expired_tokens() -> int:
        """Limpiar tokens expirados (tarea de mantenimiento)"""
        try:
            count = RefreshToken.cleanup_expired()
            log_user_action("tokens_cleanup", {"expired_count": count})
            return count

        except Exception as e:
            log_error(f"Error during token cleanup: {str(e)}", exception=e)
            return 0

    @staticmethod
    def validate_token_security(
            user_id: int, refresh_token: str) -> Tuple[bool, str]:
        """Validar seguridad del token (detectar uso sospechoso)"""
        try:
            token_hash = AuthHelper.create_token_hash(refresh_token)
            refresh_record = RefreshToken.get_valid_token(token_hash)

            if not refresh_record:
                return False, "Token inválido"

            current_ip = AuthHelper.get_client_ip()
            current_device = AuthHelper.get_device_info()

            # Verificar cambio de IP sospechoso
            if refresh_record.ip_address and refresh_record.ip_address != current_ip:
                log_user_action(
                    "suspicious_ip_change",
                    {
                        "old_ip": refresh_record.ip_address,
                        "new_ip": current_ip,
                        "token_id": refresh_record.id,
                    },
                    user_id,
                )

                # En producción, podrías requerir re-autenticación
                # Por ahora solo loggeamos

            # Verificar cambio de dispositivo
            if refresh_record.device_info and refresh_record.device_info != current_device:
                log_user_action(
                    "device_change",
                    {
                        "old_device": refresh_record.device_info[:100],
                        "new_device": current_device[:100],
                        "token_id": refresh_record.id,
                    },
                    user_id,
                )

            return True, "Token válido"

        except Exception as e:
            log_error(
                f"Error validating token security: {str(e)}",
                exception=e)
            return False, "Error de validación"


class TokenBlacklist:
    """Manejo de blacklist de tokens (para logout inmediato)"""

    # En producción, usar Redis para mejor rendimiento
    _blacklisted_tokens = set()

    @classmethod
    def add_token(cls, jti: str):
        """Agregar token a blacklist"""
        cls._blacklisted_tokens.add(jti)

    @classmethod
    def is_blacklisted(cls, jti: str) -> bool:
        """Verificar si token está en blacklist"""
        return jti in cls._blacklisted_tokens

    @classmethod
    def cleanup_expired(cls):
        """Limpiar tokens expirados de blacklist"""
        # En implementación real con Redis, usar TTL automático
        pass

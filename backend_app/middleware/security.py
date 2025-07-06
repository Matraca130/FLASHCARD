"""
Módulo de seguridad avanzada
Incluye headers de seguridad, rate limiting, validaciones y protecciones
"""

import os
import hashlib
import secrets
import time
from functools import wraps
from flask import request, jsonify, current_app
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
import redis
import json
from datetime import datetime


# Configuración de rate limiting avanzado
def get_user_id():
    """Obtener ID de usuario para rate limiting personalizado"""
    from flask_jwt_extended import get_jwt_identity

    try:
        return get_jwt_identity() or get_remote_address()
    except Exception:
        return get_remote_address()


# Configuración de Redis para rate limiting
redis_client = None
try:
    redis_client = redis.Redis(
        host=os.environ.get("REDIS_HOST", "localhost"),
        port=int(os.environ.get("REDIS_PORT", 6379)),
        db=int(os.environ.get("REDIS_DB", 0)),
        decode_responses=True,
    )
    redis_client.ping()
except Exception:
    redis_client = None

# Rate limiter con configuración avanzada
limiter = Limiter(
    key_func=get_user_id,
    storage_uri=os.environ.get("RATELIMIT_STORAGE_URL", "memory://"),
    default_limits=["1000 per hour", "100 per minute"],
)


# Configuración de headers de seguridad
def configure_security_headers(app):
    """Configurar headers de seguridad con Talisman"""

    # Configuración CSP (Content Security Policy)
    csp = {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data: https:",
        "font-src": "'self'",
        "connect-src": "'self'",
        "frame-ancestors": "'none'",
        "base-uri": "'self'",
        "form-action": "'self'",
    }

    # Configurar Talisman
    Talisman(
        app,
        force_https=app.config.get("FORCE_HTTPS", False),
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,
        content_security_policy=csp,
        content_security_policy_nonce_in=["script-src", "style-src"],
        referrer_policy="strict-origin-when-cross-origin",
        feature_policy={
            "geolocation": "'none'",
            "microphone": "'none'",
            "camera": "'none'",
            "payment": "'none'",
            "usb": "'none'",
        },
    )


# Blacklist de tokens JWT
class JWTBlacklist:
    """Manejo de blacklist de tokens JWT"""

    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.memory_blacklist = set()

    def add_token(self, jti, expires_at):
        """Agregar token a la blacklist"""
        if self.redis_client:
            try:
                # Calcular TTL basado en expiración del token
                ttl = int((expires_at - datetime.utcnow()).total_seconds())
                if ttl > 0:
                    self.redis_client.setex(f"blacklist:{jti}", ttl, "1")
                return True
            except Exception:
                pass

        # Fallback a memoria
        self.memory_blacklist.add(jti)
        return True

    def is_blacklisted(self, jti):
        """Verificar si token está en blacklist"""
        if self.redis_client:
            try:
                return bool(self.redis_client.get(f"blacklist:{jti}"))
            except Exception:
                pass

        # Fallback a memoria
        return jti in self.memory_blacklist

    def cleanup_memory(self):
        """Limpiar blacklist en memoria (llamar periódicamente)"""
        # En un entorno real, esto se haría con un job programado
        pass


# Instancia global de blacklist
jwt_blacklist = JWTBlacklist(redis_client)


# Validador de archivos
class FileValidator:
    """Validador de archivos subidos"""

    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
    ALLOWED_AUDIO_EXTENSIONS = {"mp3", "wav", "ogg", "m4a"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    @staticmethod
    def validate_file_extension(filename, allowed_extensions):
        """Validar extensión de archivo"""
        if not filename:
            return False

        extension = filename.rsplit(".", 1)[-1].lower()
        return extension in allowed_extensions

    @staticmethod
    def validate_file_size(file_data):
        """Validar tamaño de archivo"""
        if len(file_data) > FileValidator.MAX_FILE_SIZE:
            return False
        return True

    @staticmethod
    def validate_image_file(filename, file_data):
        """Validar archivo de imagen"""
        if not FileValidator.validate_file_extension(filename, FileValidator.ALLOWED_IMAGE_EXTENSIONS):
            return False, "Extensión de imagen no permitida"

        if not FileValidator.validate_file_size(file_data):
            return False, "Archivo demasiado grande"

        # Validar que realmente sea una imagen
        try:
            from PIL import Image
            import io

            Image.open(io.BytesIO(file_data))
            return True, "Válido"
        except Exception:
            return False, "Archivo no es una imagen válida"

    @staticmethod
    def validate_audio_file(filename, file_data):
        """Validar archivo de audio"""
        if not FileValidator.validate_file_extension(filename, FileValidator.ALLOWED_AUDIO_EXTENSIONS):
            return False, "Extensión de audio no permitida"

        if not FileValidator.validate_file_size(file_data):
            return False, "Archivo demasiado grande"

        return True, "Válido"


# Detector de ataques
class AttackDetector:
    """Detector de patrones de ataque"""

    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.memory_attempts = {}

    def record_failed_attempt(self, identifier, attempt_type="login"):
        """Registrar intento fallido"""
        key = f"failed_attempts:{attempt_type}:{identifier}"

        if self.redis_client:
            try:
                current = self.redis_client.get(key) or 0
                self.redis_client.setex(key, 3600, int(current) + 1)  # 1 hora TTL
                return int(current) + 1
            except Exception:
                pass

        # Fallback a memoria
        if key not in self.memory_attempts:
            self.memory_attempts[key] = {"count": 0, "timestamp": time.time()}

        # Limpiar intentos antiguos
        if time.time() - self.memory_attempts[key]["timestamp"] > 3600:
            self.memory_attempts[key] = {"count": 0, "timestamp": time.time()}

        self.memory_attempts[key]["count"] += 1
        return self.memory_attempts[key]["count"]

    def get_failed_attempts(self, identifier, attempt_type="login"):
        """Obtener número de intentos fallidos"""
        key = f"failed_attempts:{attempt_type}:{identifier}"

        if self.redis_client:
            try:
                return int(self.redis_client.get(key) or 0)
            except Exception:
                pass

        # Fallback a memoria
        if key in self.memory_attempts:
            if time.time() - self.memory_attempts[key]["timestamp"] > 3600:
                return 0
            return self.memory_attempts[key]["count"]

        return 0

    def clear_failed_attempts(self, identifier, attempt_type="login"):
        """Limpiar intentos fallidos"""
        key = f"failed_attempts:{attempt_type}:{identifier}"

        if self.redis_client:
            try:
                self.redis_client.delete(key)
                return True
            except Exception:
                pass

        # Fallback a memoria
        if key in self.memory_attempts:
            del self.memory_attempts[key]

        return True

    def is_blocked(self, identifier, attempt_type="login", max_attempts=5):
        """Verificar si está bloqueado"""
        return self.get_failed_attempts(identifier, attempt_type) >= max_attempts


# Instancia global de detector
attack_detector = AttackDetector(redis_client)


# Decoradores de seguridad
def require_api_key(f):
    """Decorador para requerir API key"""

    @wraps(f)
    def wrapper(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")
        expected_key = current_app.config.get("API_KEY")

        if not expected_key:
            return f(*args, **kwargs)  # No API key configurada

        if not api_key or api_key != expected_key:
            return (
                jsonify({"success": False, "error": "API key requerida o inválida"}),
                401,
            )

        return f(*args, **kwargs)

    return wrapper


def check_account_lockout(f):
    """Decorador para verificar bloqueo de cuenta"""

    @wraps(f)
    def wrapper(*args, **kwargs):
        identifier = request.json.get("email") if request.is_json else None

        if identifier and attack_detector.is_blocked(identifier):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Cuenta temporalmente bloqueada por múltiples intentos fallidos",
                    }
                ),
                429,
            )

        return f(*args, **kwargs)

    return wrapper


def log_security_event(event_type, details=None):
    """Registrar evento de seguridad"""
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "type": event_type,
        "ip": get_remote_address(request),
        "user_agent": request.headers.get("User-Agent", ""),
        "details": details or {},
    }

    # Log a archivo o sistema de logging
    current_app.logger.warning(f"SECURITY_EVENT: {json.dumps(event)}")

    # Opcional: enviar a sistema de monitoreo
    if redis_client:
        try:
            redis_client.lpush("security_events", json.dumps(event))
            redis_client.ltrim("security_events", 0, 999)  # Mantener últimos 1000 eventos
        except Exception:
            pass


# Middleware de seguridad
def security_middleware():
    """Middleware de seguridad para todas las requests"""

    # Verificar headers sospechosos
    suspicious_headers = ["X-Forwarded-For", "X-Real-IP"]
    for header in suspicious_headers:
        if header in request.headers:
            value = request.headers[header]
            # Log si hay múltiples IPs (posible proxy malicioso)
            if "," in value:
                log_security_event("suspicious_proxy", {"header": header, "value": value})

    # Verificar User-Agent
    user_agent = request.headers.get("User-Agent", "")
    if not user_agent or len(user_agent) < 10:
        log_security_event("suspicious_user_agent", {"user_agent": user_agent})

    # Verificar tamaño de request
    if request.content_length and request.content_length > 50 * 1024 * 1024:  # 50MB
        log_security_event("large_request", {"size": request.content_length})
        return jsonify({"success": False, "error": "Request demasiado grande"}), 413


# Función para generar tokens seguros
def generate_secure_token(length=32):
    """Generar token seguro"""
    return secrets.token_urlsafe(length)


# Función para hash seguro
def secure_hash(data, salt=None):
    """Crear hash seguro con salt"""
    if salt is None:
        salt = secrets.token_bytes(32)

    hash_obj = hashlib.pbkdf2_hmac("sha256", data.encode(), salt, 100000)
    return salt + hash_obj


def verify_secure_hash(data, hashed):
    """Verificar hash seguro"""
    salt = hashed[:32]
    hash_obj = hashed[32:]
    return hashlib.pbkdf2_hmac("sha256", data.encode(), salt, 100000) == hash_obj


# Configuración de CORS seguro
def configure_cors(app):
    """Configurar CORS de manera segura"""
    from flask_cors import CORS

    # En producción, especificar dominios exactos
    if app.config.get("ENV") == "production":
        allowed_origins = app.config.get("CORS_ORIGINS", [])
    else:
        allowed_origins = "*"  # Solo para desarrollo

    CORS(
        app,
        origins=allowed_origins,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-API-Key"],
        expose_headers=["X-Total-Count", "X-Page-Count"],
        supports_credentials=True,
        max_age=3600,
    )


# Validador de entrada SQL injection
def validate_sql_injection(value):
    """Detectar posibles intentos de SQL injection"""
    if not isinstance(value, str):
        return True

    # Patrones sospechosos
    suspicious_patterns = [
        r"(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)",
        r"(--|#|/\*|\*/)",
        r"(\b(or|and)\s+\d+\s*=\s*\d+)",
        r"(\b(or|and)\s+['\"].*['\"])",
        r"(;|\|\||&&)",
    ]

    import re

    for pattern in suspicious_patterns:
        if re.search(pattern, value.lower()):
            log_security_event("sql_injection_attempt", {"value": value})
            return False

    return True


# Validador de XSS
def validate_xss(value):
    """Detectar posibles intentos de XSS"""
    if not isinstance(value, str):
        return True

    # Patrones sospechosos
    suspicious_patterns = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
    ]

    import re

    for pattern in suspicious_patterns:
        if re.search(pattern, value.lower()):
            log_security_event("xss_attempt", {"value": value})
            return False

    return True


# Función para inicializar seguridad
def init_security(app):
    """Inicializar todas las configuraciones de seguridad"""

    # Configurar headers de seguridad
    configure_security_headers(app)

    # Configurar CORS
    configure_cors(app)

    # Configurar rate limiting
    limiter.init_app(app)

    # Registrar middleware
    app.before_request(security_middleware)

    # Configurar JWT blacklist

    jwt = app.extensions.get("flask-jwt-extended")
    if jwt:

        @jwt.token_in_blocklist_loader
        def check_if_token_revoked(jwt_header, jwt_payload):
            jti = jwt_payload["jti"]
            return jwt_blacklist.is_blacklisted(jti)

    return app

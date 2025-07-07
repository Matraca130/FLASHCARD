import os
from datetime import timedelta


class Config:
    """Configuración base para StudyingFlash"""

    # Flask Configuration
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable is required")

    # Database Configuration
    if os.environ.get("DATABASE_URL"):
        # Producción (Render con PostgreSQL)
        SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
        if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
            SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
    else:
        # Desarrollo (SQLite local)
        SQLALCHEMY_DATABASE_URI = "sqlite:///flashcards.db"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY environment variable is required")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)
    JWT_ALGORITHM = "HS256"

    # CORS Configuration
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "memory://")

    # File Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = "uploads"

    # Security Headers (Talisman)
    TALISMAN_CONFIG = {
        "force_https": os.environ.get("FLASK_ENV") == "production",
        "strict_transport_security": True,
        "content_security_policy": {
            "default-src": "'self'",
            "script-src": "'self' 'unsafe-inline'",
            "style-src": "'self' 'unsafe-inline'",
            "img-src": "'self' data: https:",
            "connect-src": "'self'",
        },
    }

    # Logging
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    # Cache Configuration
    CACHE_TYPE = "simple"
    CACHE_DEFAULT_TIMEOUT = 300


class DevelopmentConfig(Config):
    """Configuración para desarrollo"""

    DEBUG = True
    FLASK_ENV = "development"
    TALISMAN_CONFIG = {
        "force_https": False,
        "strict_transport_security": False,
        "content_security_policy": False,
    }


class ProductionConfig(Config):
    """Configuración para producción"""

    DEBUG = False
    FLASK_ENV = "production"

    # Security enhancements for production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # Database optimizations for production
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "pool_recycle": 120,
        "pool_pre_ping": True,
        "max_overflow": 20,
    }


class TestingConfig(Config):
    """Configuración para testing"""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


# Configuración por defecto basada en variable de entorno
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config():
    """Obtener configuración basada en FLASK_ENV"""
    env = os.environ.get("FLASK_ENV", "development")
    return config.get(env, config["default"])

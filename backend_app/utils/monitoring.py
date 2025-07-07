"""
Sistema de monitoreo y logging estructurado con Sentry
"""

import os
import logging
import time
from functools import wraps
from datetime import datetime
from typing import Dict, Any

import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from flask import request, g


class MonitoringConfig:
    """Configuración de monitoreo"""

    # Sentry Configuration
    SENTRY_DSN = os.getenv("SENTRY_DSN")
    SENTRY_ENVIRONMENT = os.getenv("FLASK_ENV", "development")
    SENTRY_RELEASE = os.getenv("SENTRY_RELEASE", "unknown")

    # Logging Configuration
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/app.log")

    # Performance Monitoring
    ENABLE_PERFORMANCE_MONITORING = os.getenv(
        "ENABLE_PERFORMANCE_MONITORING",
        "true").lower() == "true"
    PERFORMANCE_SAMPLE_RATE = float(
        os.getenv("PERFORMANCE_SAMPLE_RATE", "0.1"))


def init_sentry(app):
    """Inicializar Sentry para monitoreo de errores"""
    if not MonitoringConfig.SENTRY_DSN:
        app.logger.warning(
            "SENTRY_DSN no configurado. Monitoreo de errores deshabilitado.")
        return

    # Configurar integración de logging
    sentry_logging = LoggingIntegration(
        level=logging.INFO,  # Capturar logs de nivel INFO y superior
        event_level=logging.ERROR,  # Enviar a Sentry solo errores y críticos
    )

    sentry_sdk.init(
        dsn=MonitoringConfig.SENTRY_DSN,
        integrations=[
            FlaskIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            sentry_logging,
        ],
        environment=MonitoringConfig.SENTRY_ENVIRONMENT,
        release=MonitoringConfig.SENTRY_RELEASE,
        traces_sample_rate=(
            MonitoringConfig.PERFORMANCE_SAMPLE_RATE if MonitoringConfig.ENABLE_PERFORMANCE_MONITORING else 0.0
        ),
        send_default_pii=False,  # No enviar información personal por defecto
        before_send=filter_sensitive_data,
        before_send_transaction=filter_sensitive_transactions,
    )

    app.logger.info(
        f"Sentry inicializado para entorno: {MonitoringConfig.SENTRY_ENVIRONMENT}")


def filter_sensitive_data(event, hint):
    """Filtrar datos sensibles antes de enviar a Sentry"""
    # Filtrar headers sensibles
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        sensitive_headers = ["authorization", "cookie", "x-api-key"]

        for header in sensitive_headers:
            if header in headers:
                headers[header] = "[Filtered]"

    # Filtrar datos de formularios
    if "request" in event and "data" in event["request"]:
        data = event["request"]["data"]
        if isinstance(data, dict):
            sensitive_fields = ["password", "token", "secret", "key"]
            for field in sensitive_fields:
                if field in data:
                    data[field] = "[Filtered]"

    return event


def filter_sensitive_transactions(event, hint):
    """Filtrar transacciones sensibles"""
    # No monitorear endpoints de health check
    if event.get("transaction") == "/health":
        return None

    return event


def setup_logging(app):
    """Configurar logging estructurado con filtrado inteligente"""
    # Crear directorio de logs si no existe
    log_dir = os.path.dirname(MonitoringConfig.LOG_FILE)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Configurar formato de logging
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(funcName)s - %(message)s"
    )

    # Handler para archivo
    file_handler = logging.FileHandler(MonitoringConfig.LOG_FILE)
    file_handler.setFormatter(formatter)
    # Usar WARNING como nivel mínimo para reducir ruido
    file_handler.setLevel(logging.WARNING)

    # Handler para consola
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    # Solo mostrar WARNING y superiores en consola
    console_handler.setLevel(logging.WARNING)

    # Configurar logger de la aplicación
    app.logger.setLevel(logging.WARNING)  # Cambiar de INFO a WARNING
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)

    # Configurar logger de SQLAlchemy (solo errores)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.ERROR)
    logging.getLogger("sqlalchemy.engine").addHandler(file_handler)


def monitor_performance(operation_name: str = None):
    """Decorador para monitorear rendimiento de funciones"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            operation = operation_name or f"{func.__module__}.{func.__name__}"

            try:
                with sentry_sdk.start_transaction(op="function", name=operation):
                    result = func(*args, **kwargs)

                execution_time = time.time() - start_time

                # Log si la operación es lenta (>1 segundo)
                if execution_time > 1.0:
                    logging.warning(
                        f"Operación lenta detectada: {operation} tomó {execution_time:.2f}s")

                return result

            except Exception as e:
                execution_time = time.time() - start_time
                logging.error(
                    f"Error en {operation} después de {execution_time:.2f}s: {str(e)}")

                # Agregar contexto adicional a Sentry
                sentry_sdk.set_context(
                    "performance",
                    {
                        "operation": operation,
                        "execution_time": execution_time,
                        "args_count": len(args),
                        "kwargs_keys": list(kwargs.keys()),
                    },
                )

                raise

        return wrapper

    return decorator


def monitor_api_endpoint(func):
    """Decorador específico para monitorear endpoints de API"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()

        # Obtener información de la request
        endpoint = request.endpoint or "unknown"
        method = request.method
        user_id = getattr(g, "current_user_id", None)

        # Configurar contexto de Sentry
        sentry_sdk.set_context(
            "request_info",
            {
                "endpoint": endpoint,
                "method": method,
                "user_id": user_id,
                "user_agent": request.headers.get("User-Agent", "unknown"),
            },
        )

        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time

            # Log request exitosa
            logging.info(
                f"API {method} {endpoint} - Usuario: {user_id} - Tiempo: {execution_time:.3f}s")

            return result

        except Exception as e:
            execution_time = time.time() - start_time

            # Log error con contexto
            logging.error(
                f"Error en API {method} {endpoint} - Usuario: {user_id} - Tiempo: {execution_time:.3f}s - Error: {str(e)}"
            )

            # Agregar tags a Sentry
            sentry_sdk.set_tag("endpoint", endpoint)
            sentry_sdk.set_tag("method", method)
            if user_id:
                sentry_sdk.set_tag("user_id", str(user_id))

            raise

    return wrapper


def log_user_action(action: str,
                    details: Dict[str,
                                  Any] = None,
                    user_id: int = None):
    """Log de acciones de usuario para auditoría"""
    user_id = user_id or getattr(g, "current_user_id", None)

    log_data = {
        "action": action,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "ip_address": request.remote_addr if request else None,
        "user_agent": request.headers.get("User-Agent") if request else None,
        "details": details or {},
    }

    logging.info(f"USER_ACTION: {log_data}")

    # Enviar a Sentry como breadcrumb
    sentry_sdk.add_breadcrumb(
        message=f"User action: {action}",
        category="user_action",
        data=log_data,
        level="info",
    )


def capture_exception_with_context(
        exception: Exception, context: Dict[str, Any] = None):
    """Capturar excepción con contexto adicional"""
    if context:
        for key, value in context.items():
            sentry_sdk.set_context(key, value)

    sentry_sdk.capture_exception(exception)
    logging.exception(f"Excepción capturada: {str(exception)}")


def monitor_database_query(query_name: str = None):
    """Decorador para monitorear consultas de base de datos"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            query = query_name or f"db_query_{func.__name__}"

            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time

                # Log consultas lentas (>1 segundo)
                if execution_time > 1.0:
                    logging.warning(
                        f"Consulta DB lenta: {query} tomó {execution_time:.2f}s")

                    # Enviar métrica a Sentry
                    sentry_sdk.set_context(
                        "slow_query", {
                            "query_name": query, "execution_time": execution_time}, )

                return result

            except Exception as e:
                execution_time = time.time() - start_time
                logging.error(
                    f"Error en consulta DB {query} después de {execution_time:.2f}s: {str(e)}")

                sentry_sdk.set_context(
                    "db_error",
                    {
                        "query_name": query,
                        "execution_time": execution_time,
                        "error": str(e),
                    },
                )

                raise

        return wrapper

    return decorator


class HealthMonitor:
    """Monitor de salud del sistema"""

    @staticmethod
    def check_database_health():
        """Verificar salud de la base de datos"""
        try:
            from backend_app.models.models import db

            db.session.execute("SELECT 1")
            return True
        except Exception as e:
            logging.error(f"Database health check failed: {str(e)}")
            return False

    @staticmethod
    def check_sentry_health():
        """Verificar conexión con Sentry"""
        try:
            sentry_sdk.capture_message("Health check", level="info")
            return True
        except Exception as e:
            logging.error(f"Sentry health check failed: {str(e)}")
            return False

    @staticmethod
    def get_system_metrics():
        """Obtener métricas del sistema"""
        import psutil

        return {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent,
            "timestamp": datetime.utcnow().isoformat(),
        }


# Funciones de utilidad para logging estructurado
def log_info(message: str, extra: Dict[str, Any] = None):
    """Log de información con contexto adicional"""
    if extra:
        logging.info(f"{message} - Context: {extra}")
    else:
        logging.info(message)


def log_warning(message: str, extra: Dict[str, Any] = None):
    """Log de advertencia con contexto adicional"""
    if extra:
        logging.warning(f"{message} - Context: {extra}")
    else:
        logging.warning(message)


def log_error(message: str, exception: Exception = None,
              extra: Dict[str, Any] = None):
    """Log de error con contexto adicional"""
    context = extra or {}
    if exception:
        context["exception"] = str(exception)
        context["exception_type"] = type(exception).__name__

    if context:
        logging.error(f"{message} - Context: {context}")
    else:
        logging.error(message)

    if exception:
        sentry_sdk.capture_exception(exception)

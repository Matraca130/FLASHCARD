"""
BaseService mejorado con inyección de dependencias y lógica común
Proporciona funcionalidades compartidas para todos los servicios
"""

import logging
from datetime import datetime

# Importaciones con manejo de errores para flexibilidad
try:
    from ..extensions import db as default_db
except ImportError:
    try:
        from backend_app.extensions import db as default_db
    except ImportError:
        default_db = None

try:
    from ..utils.cache import CacheManager
except ImportError:
    try:
        from backend_app.utils.cache import CacheManager
    except ImportError:
        CacheManager = None


class BaseService:
    """
    Clase base para todos los servicios con inyección de dependencias
    y funcionalidades comunes reutilizables
    """

    def __init__(self, db=None, cache=None):
        """
        Inicializar servicio con dependencias inyectables

        Args:
            db: Instancia de base de datos (SQLAlchemy)
            cache: Instancia de cache manager
        """
        self.db = db or default_db
        self.cache = cache or CacheManager()
        self.logger = logging.getLogger(f"app.services.{self.__class__.__name__}")

    def _success_response(self, data, message=None):
        """
        Respuesta exitosa estándar

        Args:
            data: Datos a retornar
            message: Mensaje opcional de éxito

        Returns:
            dict: Respuesta estructurada
        """
        return {"success": True, "data": data, "message": message}

    def _error_response(self, error, code=None):
        """
        Respuesta de error estándar

        Args:
            error: Mensaje de error
            code: Código de error HTTP sugerido

        Returns:
            dict: Respuesta de error estructurada
        """
        return {"success": False, "error": error, "code": code or 400}

    def _handle_exception(self, e, operation="operación"):
        """
        Manejo centralizado de excepciones

        Args:
            e: Excepción capturada
            operation: Descripción de la operación que falló

        Returns:
            dict: Respuesta de error estándar
        """
        error_msg = f"Error en {operation}: {str(e)}"
        self.logger.error(error_msg)

        # Rollback automático si hay transacción activa
        try:
            if self.db.session.is_active:
                self.db.session.rollback()
        except Exception as rollback_error:
            self.logger.error(f"Error en rollback: {str(rollback_error)}")

        return self._error_response(f"Error interno en {operation}", code=500)

    def _get_resource_if_owned(self, model_class, resource_id, user_id, resource_name="recurso"):
        """
        Obtener recurso verificando que pertenece al usuario

        Args:
            model_class: Clase del modelo (Deck, Flashcard, etc.)
            resource_id: ID del recurso
            user_id: ID del usuario propietario
            resource_name: Nombre del recurso para mensajes de error

        Returns:
            tuple: (resource_object, error_response)
                   Si hay error, resource_object es None
        """
        try:
            resource = (
                self.db.session.query(model_class).filter_by(id=resource_id, user_id=user_id, is_deleted=False).first()
            )

            if not resource:
                return None, self._error_response(f"{resource_name.capitalize()} no encontrado", code=404)

            return resource, None

        except Exception as e:
            return None, self._handle_exception(e, f"verificación de {resource_name}")

    def _apply_pagination(self, query, page=1, per_page=20):
        """
        Aplicar paginación a una consulta

        Args:
            query: Query de SQLAlchemy
            page: Número de página
            per_page: Elementos por página

        Returns:
            dict: Datos paginados con metadatos
        """
        try:
            # Limitar per_page para evitar sobrecarga
            per_page = min(per_page, 100)

            paginated = query.paginate(page=page, per_page=per_page, error_out=False)

            return {
                "items": paginated.items,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": paginated.total,
                    "pages": paginated.pages,
                    "has_next": paginated.has_next,
                    "has_prev": paginated.has_prev,
                },
            }

        except Exception as e:
            self.logger.error(f"Error en paginación: {str(e)}")
            return {
                "items": [],
                "pagination": {
                    "page": 1,
                    "per_page": per_page,
                    "total": 0,
                    "pages": 0,
                    "has_next": False,
                    "has_prev": False,
                },
            }

    def _invalidate_cache_pattern(self, pattern):
        """
        Invalidar entradas de cache que coincidan con un patrón

        Args:
            pattern: Patrón de cache a invalidar
        """
        try:
            self.cache.delete_pattern(pattern)
        except Exception as e:
            self.logger.warning(f"Error invalidando cache {pattern}: {str(e)}")

    def _get_or_set_cache(self, key, fetch_function, timeout=300):
        """
        Obtener de cache o ejecutar función y cachear resultado

        Args:
            key: Clave de cache
            fetch_function: Función que obtiene los datos si no están en cache
            timeout: Tiempo de vida del cache en segundos

        Returns:
            Datos obtenidos del cache o de la función
        """
        try:
            # Intentar obtener del cache
            cached_data = self.cache.get(key)
            if cached_data is not None:
                return cached_data

            # Si no está en cache, ejecutar función
            data = fetch_function()

            # Cachear resultado
            self.cache.set(key, data, timeout=timeout)

            return data

        except Exception as e:
            self.logger.warning(f"Error en cache {key}: {str(e)}")
            # Si falla el cache, ejecutar función directamente
            return fetch_function()

    def _commit_or_rollback(self):
        """
        Hacer commit o rollback automático en caso de error

        Returns:
            bool: True si commit exitoso, False si hubo error
        """
        try:
            self.db.session.commit()
            return True
        except Exception as e:
            self.logger.error(f"Error en commit: {str(e)}")
            try:
                self.db.session.rollback()
            except Exception as rollback_error:
                self.logger.error(f"Error en rollback: {str(rollback_error)}")
            return False

    def _update_timestamps(self, obj):
        """
        Actualizar timestamp de updated_at en un objeto

        Args:
            obj: Objeto del modelo a actualizar
        """
        if hasattr(obj, "updated_at"):
            obj.updated_at = datetime.utcnow()

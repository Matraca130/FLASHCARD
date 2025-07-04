"""
Sistema de cache optimizado para mejorar el rendimiento del backend
Implementa cache inteligente con invalidación automática y estrategias específicas
"""

import json
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Dict, List, Optional, Union
from flask import request, current_app
import logging

logger = logging.getLogger(__name__)

class CacheManager:
    """Gestor de cache inteligente"""
    
    def __init__(self):
        self._cache = {}
        self._expiry = {}
        self._dependencies = {}
        self._stats = {
            'hits': 0,
            'misses': 0,
            'invalidations': 0
        }
    
    def get(self, key: str) -> Optional[Any]:
        """Obtener valor del cache"""
        if key not in self._cache:
            self._stats['misses'] += 1
            return None
        
        # Verificar expiración
        if key in self._expiry and datetime.utcnow() > self._expiry[key]:
            self.delete(key)
            self._stats['misses'] += 1
            return None
        
        self._stats['hits'] += 1
        return self._cache[key]
    
    def set(self, key: str, value: Any, ttl: int = 300, dependencies: List[str] = None):
        """Establecer valor en cache"""
        self._cache[key] = value
        
        if ttl > 0:
            self._expiry[key] = datetime.utcnow() + timedelta(seconds=ttl)
        
        if dependencies:
            self._dependencies[key] = dependencies
        
        logger.debug(f"Cache set: {key} (TTL: {ttl}s)")
    
    def delete(self, key: str):
        """Eliminar valor del cache"""
        if key in self._cache:
            del self._cache[key]
        
        if key in self._expiry:
            del self._expiry[key]
        
        if key in self._dependencies:
            del self._dependencies[key]
        
        logger.debug(f"Cache deleted: {key}")
    
    def invalidate_by_dependency(self, dependency: str):
        """Invalidar cache por dependencia"""
        keys_to_delete = []
        
        for key, deps in self._dependencies.items():
            if dependency in deps:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            self.delete(key)
            self._stats['invalidations'] += 1
        
        logger.debug(f"Cache invalidated by dependency: {dependency} ({len(keys_to_delete)} keys)")
    
    def clear(self):
        """Limpiar todo el cache"""
        count = len(self._cache)
        self._cache.clear()
        self._expiry.clear()
        self._dependencies.clear()
        logger.debug(f"Cache cleared: {count} keys")
    
    def get_stats(self) -> Dict:
        """Obtener estadísticas del cache"""
        total_requests = self._stats['hits'] + self._stats['misses']
        hit_rate = (self._stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'hits': self._stats['hits'],
            'misses': self._stats['misses'],
            'invalidations': self._stats['invalidations'],
            'hit_rate': round(hit_rate, 2),
            'total_keys': len(self._cache),
            'memory_usage': self._estimate_memory_usage()
        }
    
    def _estimate_memory_usage(self) -> int:
        """Estimar uso de memoria del cache"""
        try:
            import sys
            total_size = 0
            
            for key, value in self._cache.items():
                total_size += sys.getsizeof(key)
                total_size += sys.getsizeof(value)
            
            return total_size
        except:
            return 0

# Instancia global del cache
cache_manager = CacheManager()

def generate_cache_key(*args, **kwargs) -> str:
    """Generar clave de cache única"""
    # Incluir información del usuario si está disponible
    user_id = getattr(request, 'user_id', 'anonymous')
    
    # Crear string único basado en argumentos
    key_data = {
        'user_id': user_id,
        'args': args,
        'kwargs': kwargs,
        'endpoint': request.endpoint if request else 'unknown'
    }
    
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()

def cached(ttl: int = 300, dependencies: List[str] = None, key_func=None):
    """
    Decorator para cache automático de funciones
    
    Args:
        ttl: Tiempo de vida en segundos
        dependencies: Lista de dependencias para invalidación
        key_func: Función personalizada para generar la clave
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generar clave de cache
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            
            # Intentar obtener del cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_result
            
            # Ejecutar función y cachear resultado
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl, dependencies)
            logger.debug(f"Cache miss: {cache_key}")
            
            return result
        
        return wrapper
    return decorator

def cache_user_data(user_id: int, ttl: int = 600):
    """Cache específico para datos de usuario"""
    return cached(ttl=ttl, dependencies=[f'user:{user_id}'])

def cache_deck_data(deck_id: int, ttl: int = 300):
    """Cache específico para datos de deck"""
    return cached(ttl=ttl, dependencies=[f'deck:{deck_id}', 'decks'])

def cache_flashcard_data(card_id: int, ttl: int = 300):
    """Cache específico para datos de flashcard"""
    return cached(ttl=ttl, dependencies=[f'card:{card_id}', 'flashcards'])

def cache_study_data(user_id: int, ttl: int = 180):
    """Cache específico para datos de estudio"""
    return cached(ttl=ttl, dependencies=[f'user:{user_id}', 'study_sessions'])

def invalidate_user_cache(user_id: int):
    """Invalidar cache de usuario"""
    cache_manager.invalidate_by_dependency(f'user:{user_id}')

def invalidate_deck_cache(deck_id: int):
    """Invalidar cache de deck"""
    cache_manager.invalidate_by_dependency(f'deck:{deck_id}')
    cache_manager.invalidate_by_dependency('decks')

def invalidate_flashcard_cache(card_id: int):
    """Invalidar cache de flashcard"""
    cache_manager.invalidate_by_dependency(f'card:{card_id}')
    cache_manager.invalidate_by_dependency('flashcards')

def invalidate_study_cache(user_id: int):
    """Invalidar cache de estudio"""
    cache_manager.invalidate_by_dependency(f'user:{user_id}')
    cache_manager.invalidate_by_dependency('study_sessions')

class QueryOptimizer:
    """Optimizador de consultas de base de datos"""
    
    @staticmethod
    def optimize_deck_query(query, include_stats: bool = False):
        """Optimizar consulta de decks"""
        if include_stats:
            # Usar joins eficientes para estadísticas
            from sqlalchemy import func
            from app.models import Flashcard
            
            query = query.outerjoin(Flashcard).group_by('decks.id').add_columns(
                func.count(Flashcard.id).label('total_cards'),
                func.sum(func.case([(Flashcard.next_review <= datetime.utcnow(), 1)], else_=0)).label('cards_due'),
                func.sum(func.case([(Flashcard.last_review.is_(None), 1)], else_=0)).label('new_cards')
            )
        
        return query
    
    @staticmethod
    def optimize_flashcard_query(query, for_study: bool = False):
        """Optimizar consulta de flashcards"""
        if for_study:
            # Ordenar por prioridad de estudio
            query = query.order_by(
                Flashcard.next_review.asc(),
                Flashcard.created_at.asc()
            )
        
        return query
    
    @staticmethod
    def optimize_study_stats_query(query, user_id: int, days: int = 30):
        """Optimizar consulta de estadísticas de estudio"""
        from sqlalchemy import func
        from app.models import StudySession, Deck
        
        # Usar agregaciones eficientes
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        query = query.join(Deck).filter(
            Deck.user_id == user_id,
            StudySession.started_at >= start_date
        ).group_by(
            func.date(StudySession.started_at)
        ).with_entities(
            func.date(StudySession.started_at).label('date'),
            func.sum(StudySession.cards_studied).label('total_cards'),
            func.sum(StudySession.total_time).label('total_time'),
            func.count(StudySession.id).label('session_count')
        )
        
        return query

class ResponseCompressor:
    """Compresor de respuestas para optimizar transferencia"""
    
    @staticmethod
    def compress_json_response(data: Dict) -> Dict:
        """Comprimir respuesta JSON eliminando campos innecesarios"""
        if isinstance(data, dict):
            # Eliminar campos None
            compressed = {k: v for k, v in data.items() if v is not None}
            
            # Comprimir timestamps a formato más corto
            for key, value in compressed.items():
                if isinstance(value, str) and 'T' in value and value.endswith('Z'):
                    try:
                        # Convertir ISO timestamp a timestamp Unix más corto
                        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                        compressed[key] = int(dt.timestamp())
                    except:
                        pass
                elif isinstance(value, dict):
                    compressed[key] = ResponseCompressor.compress_json_response(value)
                elif isinstance(value, list):
                    compressed[key] = [
                        ResponseCompressor.compress_json_response(item) if isinstance(item, dict) else item
                        for item in value
                    ]
            
            return compressed
        
        return data
    
    @staticmethod
    def optimize_pagination_response(items: List, pagination: Dict) -> Dict:
        """Optimizar respuesta paginada"""
        # Comprimir metadatos de paginación
        optimized_pagination = {
            'p': pagination.get('page', 1),
            'pp': pagination.get('per_page', 20),
            't': pagination.get('total', 0),
            'tp': pagination.get('total_pages', 0),
            'hp': pagination.get('has_prev', False),
            'hn': pagination.get('has_next', False)
        }
        
        # Solo incluir URLs si existen
        if pagination.get('prev_url'):
            optimized_pagination['pu'] = pagination['prev_url']
        if pagination.get('next_url'):
            optimized_pagination['nu'] = pagination['next_url']
        
        return {
            'items': items,
            'pagination': optimized_pagination
        }

def optimize_database_queries():
    """Aplicar optimizaciones generales a la base de datos"""
    from app.extensions import db
    
    # Configurar pool de conexiones optimizado
    if hasattr(db.engine, 'pool'):
        db.engine.pool._recycle = 3600  # Reciclar conexiones cada hora
        db.engine.pool._pre_ping = True  # Verificar conexiones antes de usar
    
    # Configurar timeouts
    db.engine.execute("PRAGMA busy_timeout = 30000")  # 30 segundos timeout
    
    logger.info("Database optimizations applied")

def create_indexes():
    """Crear índices para optimizar consultas frecuentes"""
    from app.extensions import db
    
    try:
        # Índices para flashcards
        db.engine.execute("CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review)")
        db.engine.execute("CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id)")
        db.engine.execute("CREATE INDEX IF NOT EXISTS idx_flashcards_last_review ON flashcards(last_review)")
        
        # Índices para study_sessions
        db.engine.execute("CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id)")
        db.engine.execute("CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at)")
        db.engine.execute("CREATE INDEX IF NOT EXISTS idx_study_sessions_deck_id ON study_sessions(deck_id)")
        
        # Índices para decks
        db.engine.execute("CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id)")
        db.engine.execute("CREATE INDEX IF NOT EXISTS idx_decks_updated_at ON decks(updated_at)")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {str(e)}")

def get_cache_stats() -> Dict:
    """Obtener estadísticas del cache"""
    return cache_manager.get_stats()

def clear_all_cache():
    """Limpiar todo el cache"""
    cache_manager.clear()

# Funciones de utilidad para monitoreo
def log_query_performance(func):
    """Decorator para monitorear rendimiento de consultas"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        import time
        start_time = time.time()
        
        result = func(*args, **kwargs)
        
        end_time = time.time()
        duration = (end_time - start_time) * 1000  # en milisegundos
        
        if duration > 100:  # Log consultas lentas (>100ms)
            logger.warning(f"Slow query detected: {func.__name__} took {duration:.2f}ms")
        
        return result
    
    return wrapper


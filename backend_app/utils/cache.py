"""
Sistema de cache simplificado para StudyingFlash
"""

class CacheManager:
    """Cache manager simplificado usando memoria"""
    
    def __init__(self):
        self._cache = {}
    
    def get(self, key):
        """Obtener valor del cache"""
        return self._cache.get(key)
    
    def set(self, key, value, timeout=300):
        """Establecer valor en cache"""
        self._cache[key] = value
        return True
    
    def delete(self, key):
        """Eliminar valor del cache"""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self):
        """Limpiar todo el cache"""
        self._cache.clear()
        return True


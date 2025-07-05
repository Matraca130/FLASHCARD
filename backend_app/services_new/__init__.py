"""
Servicios refactorizados con inyección de dependencias
Exportación centralizada para fácil importación
"""

from .base_service import BaseService
from .user_service import UserService
from .deck_service import DeckService
from .flashcard_service import FlashcardService
from .study_service import StudyService
from .stats_service import StatsService

# Exportar todas las clases
__all__ = [
    'BaseService',
    'UserService', 
    'DeckService',
    'FlashcardService',
    'StudyService',
    'StatsService'
]

# Factory para crear instancias con dependencias inyectadas
def create_services(db=None, cache=None):
    """
    Factory para crear todas las instancias de servicios con dependencias inyectadas
    
    Args:
        db: Instancia de base de datos (SQLAlchemy)
        cache: Instancia de cache (Redis/Flask-Caching)
        
    Returns:
        dict: Diccionario con todas las instancias de servicios
    """
    return {
        'user_service': UserService(db=db, cache=cache),
        'deck_service': DeckService(db=db, cache=cache),
        'flashcard_service': FlashcardService(db=db, cache=cache),
        'study_service': StudyService(db=db, cache=cache),
        'stats_service': StatsService(db=db, cache=cache)
    }

# Instancias globales para compatibilidad (usando valores por defecto)
user_service = UserService()
deck_service = DeckService()
flashcard_service = FlashcardService()
study_service = StudyService()
stats_service = StatsService()

# Alias para compatibilidad con código existente
UserService_instance = user_service
DeckService_instance = deck_service
FlashcardService_instance = flashcard_service
StudyService_instance = study_service
StatsService_instance = stats_service


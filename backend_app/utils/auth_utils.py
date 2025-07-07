"""
Utilidades de autenticación para eliminar duplicación de código
"""
from backend_app.models.models import User, Deck, Flashcard
from .error_handlers import NotFoundError, PermissionErr

or def get_current_user_or_404(user_id):
    """
    Obtiene el usuario actual o lanza error 404 si no existe
    Elimina la duplicación de User.query.get() + verificación en múltiples rutas

    Args:
        user_id (int): ID del usuario

    Returns:
        User: Instancia del usuario

    Raises:
        NotFoundError: Si el usuario no existe
    """
    user = User.query.get(user_id)
    if not user:
        raise NotFoundError("Usuario")
    return user


def get_user_deck_or_404(user_id, deck_id):
    """
    Obtiene un deck del usuario o lanza error 404 si no existe o no pertenece al usuario
    Elimina la duplicación de verificación de propiedad de deck

    Args:
        user_id (int): ID del usuario
        deck_id (int): ID del deck

    Returns:
        Deck: Instancia del deck

    Raises:
        NotFoundError: Si el deck no existe o no pertenece al usuario
    """
    deck = Deck.query.filter_by(
        id=deck_id,
        user_id=user_id,
        is_deleted=False).first()
    if not deck:
        raise NotFoundError("Deck")
    return deck


def get_user_flashcard_or_404(user_id, flashcard_id):
    """
    Obtiene una flashcard del usuario o lanza error 404 si no existe o no pertenece al usuario
    Elimina la duplicación de verificación de propiedad de flashcard

    Args:
        user_id (int): ID del usuario
        flashcard_id (int): ID de la flashcard

    Returns:
        Flashcard: Instancia de la flashcard

    Raises:
        NotFoundError: Si la flashcard no existe o no pertenece al usuario
    """
    flashcard = Flashcard.query.join(Deck).filter(
        Flashcard.id == flashcard_id,
        Deck.user_id == user_id,
        Flashcard.is_deleted == False,
        Deck.is_deleted == False
    ).first()

    if not flashcard:
        raise NotFoundError("Flashcard")
    return flashcard


def verify_deck_ownership(user_id, deck_id):
    """
    Verifica que un deck pertenezca al usuario
    Versión simplificada que solo verifica sin retornar el objeto

    Args:
        user_id (int): ID del usuario
        deck_id (int): ID del deck

    Raises:
        PermissionError: Si el deck no pertenece al usuario
        NotFoundError: Si el deck no existe
    """
    deck = Deck.query.filter_by(id=deck_id, is_deleted=False).first()
    if not deck:
        raise NotFoundError("Deck")

    if deck.user_id != user_id:
        raise PermissionError("No tienes permisos para acceder a este deck")


def verify_flashcard_ownership(user_id, flashcard_id):
    """
    Verifica que una flashcard pertenezca al usuario

    Args:
        user_id (int): ID del usuario
        flashcard_id (int): ID de la flashcard

    Raises:
        PermissionError: Si la flashcard no pertenece al usuario
        NotFoundError: Si la flashcard no existe
    """
    flashcard = Flashcard.query.join(Deck).filter(
        Flashcard.id == flashcard_id,
        Flashcard.is_deleted == False,
        Deck.is_deleted == False
    ).first()

    if not flashcard:
        raise NotFoundError("Flashcard")

    if flashcard.deck.user_id != user_id:
        raise PermissionError(
            "No tienes permisos para acceder a esta flashcard")

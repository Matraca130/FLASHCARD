"""
FlashcardService - Servicio para gestión de flashcards
Refactorizado con inyección de dependencias e interfaces consistentes
"""

from .base_service import BaseService

try:
    from ..models import Deck, Flashcard
except ImportError:
    from backend_app.models import Deck, Flashcard
from sqlalchemy import and_, or_
from datetime import datetime


class FlashcardService(BaseService):
    """Servicio para gestión de flashcards del usuario"""

    def get_user_flashcards(self, user_id, deck_id=None, page=1, per_page=20, search=""):
        """
        Obtener flashcards del usuario con filtros

        Args:
            user_id: ID del usuario
            deck_id: ID del deck (opcional, para filtrar por deck)
            page: Número de página
            per_page: Elementos por página
            search: Término de búsqueda

        Returns:
            dict: Respuesta con flashcards paginadas
        """
        try:
            # Cache key
            cache_key = f"user_flashcards:{user_id}:{deck_id}:{page}:{per_page}:{search}"

            def fetch_flashcards():
                # Query base con join a Deck para verificar propiedad
                query = (
                    self.db.session.query(Flashcard)
                    .join(Deck)
                    .filter(
                        and_(
                            Deck.user_id == user_id,
                            not Deck.is_deleted,
                            not Flashcard.is_deleted,
                        )
                    )
                )

                # Filtrar por deck específico si se proporciona
                if deck_id:
                    query = query.filter(Flashcard.deck_id == deck_id)

                # Aplicar búsqueda si se proporciona
                if search:
                    search_term = f"%{search}%"
                    query = query.filter(
                        or_(
                            Flashcard.front_text.ilike(search_term),
                            Flashcard.back_text.ilike(search_term),
                        )
                    )

                # Ordenar por fecha de creación
                query = query.order_by(Flashcard.created_at.desc())

                # Aplicar paginación
                paginated_data = self._apply_pagination(query, page, per_page)

                # Convertir flashcards a diccionarios
                flashcards_data = []
                for card in paginated_data["items"]:
                    card_dict = card.to_dict()
                    # Agregar información del deck
                    card_dict["deck_name"] = card.deck.name
                    flashcards_data.append(card_dict)

                return {
                    "flashcards": flashcards_data,
                    "pagination": paginated_data["pagination"],
                }

            result = self._get_or_set_cache(cache_key, fetch_flashcards, timeout=300)

            return self._success_response(result)

        except Exception as e:
            return self._handle_exception(e, "obtención de flashcards del usuario")

    def create_flashcard(self, user_id, flashcard_data):
        """
        Crear nueva flashcard

        Args:
            user_id: ID del usuario propietario
            flashcard_data: Datos de la flashcard

        Returns:
            dict: Respuesta con flashcard creada
        """
        try:
            deck_id = flashcard_data.get("deck_id")
            if not deck_id:
                return self._error_response("El ID del deck es requerido", code=400)

            # Verificar que el deck existe y pertenece al usuario
            deck, error = self._get_resource_if_owned(Deck, deck_id, user_id, "deck")
            if error:
                return error

            # Validar contenido mínimo
            front_text = flashcard_data.get("front_text", "").strip()
            back_text = flashcard_data.get("back_text", "").strip()

            if not front_text and not flashcard_data.get("front_image_url"):
                return self._error_response("El frente de la carta debe tener texto o imagen", code=400)

            if not back_text and not flashcard_data.get("back_image_url"):
                return self._error_response("El reverso de la carta debe tener texto o imagen", code=400)

            # Crear flashcard
            flashcard = Flashcard(
                deck_id=deck_id,
                front_text=front_text,
                back_text=back_text,
                front_image_url=flashcard_data.get("front_image_url", ""),
                back_image_url=flashcard_data.get("back_image_url", ""),
                front_audio_url=flashcard_data.get("front_audio_url", ""),
                back_audio_url=flashcard_data.get("back_audio_url", ""),
                difficulty=flashcard_data.get("difficulty", "medium"),
                tags=flashcard_data.get("tags", ""),
            )

            self.db.session.add(flashcard)

            if not self._commit_or_rollback():
                return self._error_response("Error al crear flashcard", code=500)

            # Actualizar contador de cartas en el deck
            deck.total_cards = self.db.session.query(Flashcard).filter_by(deck_id=deck_id, is_deleted=False).count()
            self._update_timestamps(deck)
            self._commit_or_rollback()

            # Invalidar cache
            self._invalidate_cache_pattern(f"user_flashcards:{user_id}:*")
            self._invalidate_cache_pattern(f"user_decks:{user_id}:*")

            return self._success_response(flashcard.to_dict(), "Flashcard creada exitosamente")

        except Exception as e:
            return self._handle_exception(e, "creación de flashcard")

    def get_flashcard_by_id(self, flashcard_id, user_id):
        """
        Obtener flashcard por ID verificando propiedad

        Args:
            flashcard_id: ID de la flashcard
            user_id: ID del usuario propietario

        Returns:
            dict: Respuesta con datos de la flashcard
        """
        try:
            # Verificar que la flashcard existe y el deck pertenece al usuario
            flashcard = (
                self.db.session.query(Flashcard)
                .join(Deck)
                .filter(
                    and_(
                        Flashcard.id == flashcard_id,
                        Deck.user_id == user_id,
                        not Flashcard.is_deleted,
                        not Deck.is_deleted,
                    )
                )
                .first()
            )

            if not flashcard:
                return self._error_response("Flashcard no encontrada", code=404)

            card_dict = flashcard.to_dict()
            card_dict["deck_name"] = flashcard.deck.name

            return self._success_response(card_dict)

        except Exception as e:
            return self._handle_exception(e, "obtención de flashcard")

    def update_flashcard(self, flashcard_id, user_id, update_data):
        """
        Actualizar flashcard existente

        Args:
            flashcard_id: ID de la flashcard
            user_id: ID del usuario propietario
            update_data: Datos a actualizar

        Returns:
            dict: Respuesta con flashcard actualizada
        """
        try:
            # Verificar que la flashcard existe y el deck pertenece al usuario
            flashcard = (
                self.db.session.query(Flashcard)
                .join(Deck)
                .filter(
                    and_(
                        Flashcard.id == flashcard_id,
                        Deck.user_id == user_id,
                        not Flashcard.is_deleted,
                        not Deck.is_deleted,
                    )
                )
                .first()
            )

            if not flashcard:
                return self._error_response("Flashcard no encontrada", code=404)

            # Actualizar campos permitidos
            allowed_fields = [
                "front_text",
                "back_text",
                "front_image_url",
                "back_image_url",
                "front_audio_url",
                "back_audio_url",
                "difficulty",
                "tags",
            ]

            for field in allowed_fields:
                if field in update_data:
                    value = update_data[field]
                    if field in ["front_text", "back_text"] and isinstance(value, str):
                        value = value.strip()
                    setattr(flashcard, field, value)

            # Validar que sigue teniendo contenido mínimo
            if not flashcard.front_text and not flashcard.front_image_url:
                return self._error_response("El frente de la carta debe tener texto o imagen", code=400)

            if not flashcard.back_text and not flashcard.back_image_url:
                return self._error_response("El reverso de la carta debe tener texto o imagen", code=400)

            self._update_timestamps(flashcard)

            if not self._commit_or_rollback():
                return self._error_response("Error al actualizar flashcard", code=500)

            # Invalidar cache
            self._invalidate_cache_pattern(f"user_flashcards:{user_id}:*")

            return self._success_response(flashcard.to_dict(), "Flashcard actualizada exitosamente")

        except Exception as e:
            return self._handle_exception(e, "actualización de flashcard")

    def delete_flashcard(self, flashcard_id, user_id):
        """
        Eliminar flashcard (soft delete)

        Args:
            flashcard_id: ID de la flashcard
            user_id: ID del usuario propietario

        Returns:
            dict: Respuesta de confirmación
        """
        try:
            # Verificar que la flashcard existe y el deck pertenece al usuario
            flashcard = (
                self.db.session.query(Flashcard)
                .join(Deck)
                .filter(
                    and_(
                        Flashcard.id == flashcard_id,
                        Deck.user_id == user_id,
                        not Flashcard.is_deleted,
                        not Deck.is_deleted,
                    )
                )
                .first()
            )

            if not flashcard:
                return self._error_response("Flashcard no encontrada", code=404)

            # Soft delete
            flashcard.is_deleted = True
            self._update_timestamps(flashcard)

            if not self._commit_or_rollback():
                return self._error_response("Error al eliminar flashcard", code=500)

            # Actualizar contador de cartas en el deck
            deck = flashcard.deck
            deck.total_cards = self.db.session.query(Flashcard).filter_by(deck_id=deck.id, is_deleted=False).count()
            self._update_timestamps(deck)
            self._commit_or_rollback()

            # Invalidar cache
            self._invalidate_cache_pattern(f"user_flashcards:{user_id}:*")
            self._invalidate_cache_pattern(f"user_decks:{user_id}:*")

            return self._success_response({"message": "Flashcard eliminada"}, "Flashcard eliminada exitosamente")

        except Exception as e:
            return self._handle_exception(e, "eliminación de flashcard")

    def create_multiple_flashcards(self, user_id, deck_id, flashcards_data):
        """
        Crear múltiples flashcards en lote

        Args:
            user_id: ID del usuario propietario
            deck_id: ID del deck
            flashcards_data: Lista de datos de flashcards

        Returns:
            dict: Respuesta con flashcards creadas
        """
        try:
            # Verificar que el deck existe y pertenece al usuario
            deck, error = self._get_resource_if_owned(Deck, deck_id, user_id, "deck")
            if error:
                return error

            if not flashcards_data or not isinstance(flashcards_data, list):
                return self._error_response("Se requiere una lista de flashcards", code=400)

            created_cards = []
            errors = []

            for i, card_data in enumerate(flashcards_data):
                try:
                    # Validar contenido mínimo
                    front_text = card_data.get("front_text", "").strip()
                    back_text = card_data.get("back_text", "").strip()

                    if not front_text and not card_data.get("front_image_url"):
                        errors.append(f"Carta {i+1}: El frente debe tener texto o imagen")
                        continue

                    if not back_text and not card_data.get("back_image_url"):
                        errors.append(f"Carta {i+1}: El reverso debe tener texto o imagen")
                        continue

                    # Crear flashcard
                    flashcard = Flashcard(
                        deck_id=deck_id,
                        front_text=front_text,
                        back_text=back_text,
                        front_image_url=card_data.get("front_image_url", ""),
                        back_image_url=card_data.get("back_image_url", ""),
                        front_audio_url=card_data.get("front_audio_url", ""),
                        back_audio_url=card_data.get("back_audio_url", ""),
                        difficulty=card_data.get("difficulty", "medium"),
                        tags=card_data.get("tags", ""),
                    )

                    self.db.session.add(flashcard)
                    created_cards.append(flashcard)

                except Exception as e:
                    errors.append(f"Carta {i+1}: {str(e)}")

            if not created_cards:
                return self._error_response(
                    f'No se pudo crear ninguna flashcard. Errores: {"; ".join(errors)}',
                    code=400,
                )

            if not self._commit_or_rollback():
                return self._error_response("Error al guardar flashcards", code=500)

            # Actualizar contador de cartas en el deck
            deck.total_cards = self.db.session.query(Flashcard).filter_by(deck_id=deck_id, is_deleted=False).count()
            self._update_timestamps(deck)
            self._commit_or_rollback()

            # Invalidar cache
            self._invalidate_cache_pattern(f"user_flashcards:{user_id}:*")
            self._invalidate_cache_pattern(f"user_decks:{user_id}:*")

            result = {
                "created_count": len(created_cards),
                "flashcards": [card.to_dict() for card in created_cards],
            }

            if errors:
                result["errors"] = errors
                message = f"{len(created_cards)} flashcards creadas con {len(errors)} errores"
            else:
                message = f"{len(created_cards)} flashcards creadas exitosamente"

            return self._success_response(result, message)

        except Exception as e:
            return self._handle_exception(e, "creación múltiple de flashcards")

    def get_flashcards_for_study(self, user_id, deck_id, limit=20):
        """
        Obtener flashcards para sesión de estudio

        Args:
            user_id: ID del usuario
            deck_id: ID del deck
            limit: Número máximo de cartas

        Returns:
            dict: Respuesta con flashcards para estudiar
        """
        try:
            # Verificar que el deck existe y pertenece al usuario
            deck, error = self._get_resource_if_owned(Deck, deck_id, user_id, "deck")
            if error:
                return error

            # Obtener cartas vencidas (prioritarias)
            due_cards = (
                self.db.session.query(Flashcard)
                .filter(
                    and_(
                        Flashcard.deck_id == deck_id,
                        not Flashcard.is_deleted,
                        Flashcard.next_review <= datetime.utcnow(),
                    )
                )
                .order_by(Flashcard.next_review.asc())
                .limit(limit)
                .all()
            )

            # Si no hay suficientes cartas vencidas, agregar cartas nuevas
            if len(due_cards) < limit:
                remaining_limit = limit - len(due_cards)
                new_cards = (
                    self.db.session.query(Flashcard)
                    .filter(
                        and_(
                            Flashcard.deck_id == deck_id,
                            not Flashcard.is_deleted,
                            Flashcard.last_reviewed is None,
                        )
                    )
                    .order_by(Flashcard.created_at.asc())
                    .limit(remaining_limit)
                    .all()
                )

                due_cards.extend(new_cards)

            # Convertir a diccionarios
            cards_data = [card.to_dict() for card in due_cards]

            return self._success_response({"flashcards": cards_data, "total_available": len(cards_data)})

        except Exception as e:
            return self._handle_exception(e, "obtención de flashcards para estudio")

"""
DeckService - Servicio para gestión de decks
Refactorizado con inyección de dependencias e interfaces consistentes
"""

from .base_service import BaseService

try:
    from ..models import Deck, Flashcard
except ImportError:
    from backend_app.models import Deck, Flashcard
from sqlalchemy import and_, or_
from datetime import datetime


class DeckService(BaseService):
    """Servicio para gestión de decks del usuario"""

    def get_user_decks(self, user_id, page=1, per_page=20, search=""):
        """
        Obtener decks del usuario con filtros y paginación

        Args:
            user_id: ID del usuario
            page: Número de página
            per_page: Elementos por página
            search: Término de búsqueda

        Returns:
            dict: Respuesta con decks paginados
        """
        try:
            # Cache key
            cache_key = f"user_decks:{user_id}:{page}:{per_page}:{search}"

            def fetch_decks():
                # Query base
                query = self.db.session.query(Deck).filter_by(
                    user_id=user_id, is_deleted=False)

                # Aplicar búsqueda si se proporciona
                if search:
                    search_term = f"%{search}%"
                    query = query.filter(
                        or_(
                            Deck.name.ilike(search_term),
                            Deck.description.ilike(search_term),
                        )
                    )

                # Ordenar por fecha de actualización
                query = query.order_by(Deck.updated_at.desc())

                # Aplicar paginación
                paginated_data = self._apply_pagination(query, page, per_page)

                # Convertir decks a diccionarios con estadísticas
                decks_data = []
                for deck in paginated_data["items"]:
                    deck_dict = deck.to_dict()

                    # Agregar estadísticas básicas
                    total_cards = self.db.session.query(Flashcard).filter_by(
                        deck_id=deck.id, is_deleted=False).count()

                    deck_dict.update(
                        {
                            "total_cards": total_cards,
                            "cards_due": self._get_cards_due_count(deck.id),
                        }
                    )

                    decks_data.append(deck_dict)

                return {
                    "decks": decks_data,
                    "pagination": paginated_data["pagination"]}

            result = self._get_or_set_cache(
                cache_key, fetch_decks, timeout=300)

            return self._success_response(result)

        except Exception as e:
            return self._handle_exception(e, "obtención de decks del usuario")

    def create_deck(self, user_id, deck_data):
        """
        Crear nuevo deck

        Args:
            user_id: ID del usuario propietario
            deck_data: Datos del deck a crear

        Returns:
            dict: Respuesta con deck creado
        """
        try:
            # Verificar que el nombre no esté vacío
            if not deck_data.get("name", "").strip():
                return self._error_response(
                    "El nombre del deck es requerido", code=400)

            # Verificar que no exista otro deck con el mismo nombre para este
            # usuario
            existing_deck = (
                self.db.session.query(Deck) .filter_by(
                    user_id=user_id,
                    name=deck_data["name"].strip(),
                    is_deleted=False) .first())

            if existing_deck:
                return self._error_response(
                    "Ya existe un deck con ese nombre", code=409)

            # Crear deck
            deck = Deck(
                user_id=user_id, name=deck_data["name"].strip(), description=deck_data.get(
                    "description", "").strip(), difficulty_level=deck_data.get(
                    "difficulty_level", "intermediate"), is_public=deck_data.get(
                    "is_public", False), color=deck_data.get(
                    "color", "#2196F3"), icon=deck_data.get(
                        "icon", "📚"), category=deck_data.get(
                            "category", ""), tags=deck_data.get(
                                "tags", ""), )

            self.db.session.add(deck)

            if not self._commit_or_rollback():
                return self._error_response("Error al crear deck", code=500)

            # Invalidar cache de decks del usuario
            self._invalidate_cache_pattern(f"user_decks:{user_id}:*")

            return self._success_response(
                deck.to_dict(), "Deck creado exitosamente")

        except Exception as e:
            return self._handle_exception(e, "creación de deck")

    def get_deck_by_id(self, deck_id, user_id):
        """
        Obtener deck por ID verificando propiedad

        Args:
            deck_id: ID del deck
            user_id: ID del usuario propietario

        Returns:
            dict: Respuesta con datos del deck
        """
        try:
            deck, error = self._get_resource_if_owned(
                Deck, deck_id, user_id, "deck")

            if error:
                return err
            or  # Obtener estadísticas del deck
            deck_dict = deck.to_dict()

            # Agregar estadísticas detalladas
            total_cards = self.db.session.query(Flashcard).filter_by(
                deck_id=deck_id, is_deleted=False).count()

            cards_due = self._get_cards_due_count(deck_id)
            cards_new = self._get_cards_new_count(deck_id)
            cards_learning = self._get_cards_learning_count(deck_id)
            cards_mastered = self._get_cards_mastered_count(deck_id)

            deck_dict.update(
                {
                    "total_cards": total_cards,
                    "cards_due": cards_due,
                    "cards_new": cards_new,
                    "cards_learning": cards_learning,
                    "cards_mastered": cards_mastered,
                }
            )

            return self._success_response(deck_dict)

        except Exception as e:
            return self._handle_exception(e, "obtención de deck")

    def update_deck(self, deck_id, user_id, update_data):
        """
        Actualizar deck existente

        Args:
            deck_id: ID del deck
            user_id: ID del usuario propietario
            update_data: Datos a actualizar

        Returns:
            dict: Respuesta con deck actualizado
        """
        try:
            deck, error = self._get_resource_if_owned(
                Deck, deck_id, user_id, "deck")

            if error:
                return err
            or  # Verificar nombre único si se está cambiando
            if "name" in update_data and update_data["name"].strip(
            ) != deck.name:
                existing_deck = (
                    self.db.session.query(Deck)
                    .filter_by(
                        user_id=user_id,
                        name=update_data["name"].strip(),
                        is_deleted=False,
                    )
                    .filter(Deck.id != deck_id)
                    .first()
                )

                if existing_deck:
                    return self._error_response(
                        "Ya existe un deck con ese nombre", code=409)

            # Actualizar campos permitidos
            allowed_fields = [
                "name",
                "description",
                "difficulty_level",
                "is_public",
                "color",
                "icon",
                "category",
                "tags",
            ]

            for field in allowed_fields:
                if field in update_data:
                    value = update_data[field]
                    if field in [
                            "name",
                            "description"] and isinstance(
                            value,
                            str):
                        value = value.strip()
                    setattr(deck, field, value)

            self._update_timestamps(deck)

            if not self._commit_or_rollback():
                return self._error_response(
                    "Error al actualizar deck", code=500)

            # Invalidar cache
            self._invalidate_cache_pattern(f"user_decks:{user_id}:*")

            return self._success_response(
                deck.to_dict(), "Deck actualizado exitosamente")

        except Exception as e:
            return self._handle_exception(e, "actualización de deck")

    def delete_deck(self, deck_id, user_id):
        """
        Eliminar deck (soft delete)

        Args:
            deck_id: ID del deck
            user_id: ID del usuario propietario

        Returns:
            dict: Respuesta de confirmación
        """
        try:
            deck, error = self._get_resource_if_owned(
                Deck, deck_id, user_id, "deck")

            if error:
                return err
            or  # Soft delete del deck
            deck.is_deleted = True
            self._update_timestamps(deck)

            # También marcar como eliminadas todas las flashcards del deck
            self.db.session.query(Flashcard).filter_by(deck_id=deck_id).update(
                {"is_deleted": True, "updated_at": datetime.utcnow()}
            )

            if not self._commit_or_rollback():
                return self._error_response("Error al eliminar deck", code=500)

            # Invalidar cache
            self._invalidate_cache_pattern(f"user_decks:{user_id}:*")

            return self._success_response(
                {"message": "Deck eliminado"}, "Deck eliminado exitosamente")

        except Exception as e:
            return self._handle_exception(e, "eliminación de deck")

    def duplicate_deck(self, deck_id, user_id, new_name=None):
        """
        Duplicar un deck existente

        Args:
            deck_id: ID del deck a duplicar
            user_id: ID del usuario propietario
            new_name: Nombre para el deck duplicado

        Returns:
            dict: Respuesta con deck duplicado
        """
        try:
            deck, error = self._get_resource_if_owned(
                Deck, deck_id, user_id, "deck")

            if error:
                return err
            or  # Generar nombre para el duplicado
            if not new_name:
                new_name = f"{deck.name} (Copia)"

            # Verificar que el nuevo nombre no exista
            counter = 1
            original_new_name = new_name
            while self.db.session.query(Deck).filter_by(
                    user_id=user_id, name=new_name, is_deleted=False).first():
                new_name = f"{original_new_name} ({counter})"
                counter += 1

            # Crear deck duplicado
            new_deck = Deck(
                user_id=user_id,
                name=new_name,
                description=deck.description,
                difficulty_level=deck.difficulty_level,
                is_public=False,  # Los duplicados no son públicos por defecto
                color=deck.color,
                icon=deck.icon,
                category=deck.category,
                tags=deck.tags,
            )

            self.db.session.add(new_deck)
            self.db.session.flush()  # Para obtener el ID del nuevo deck

            # Duplicar flashcards
            flashcards = self.db.session.query(Flashcard).filter_by(
                deck_id=deck_id, is_deleted=False).all()

            for card in flashcards:
                new_card = Flashcard(
                    deck_id=new_deck.id,
                    front_text=card.front_text,
                    back_text=card.back_text,
                    front_image_url=card.front_image_url,
                    back_image_url=card.back_image_url,
                    front_audio_url=card.front_audio_url,
                    back_audio_url=card.back_audio_url,
                    difficulty=card.difficulty,
                    tags=card.tags,
                    # No copiamos estadísticas de estudio (interval,
                    # ease_factor, etc.)
                )
                self.db.session.add(new_card)

            if not self._commit_or_rollback():
                return self._error_response("Error al duplicar deck", code=500)

            # Invalidar cache
            self._invalidate_cache_pattern(f"user_decks:{user_id}:*")

            return self._success_response(
                new_deck.to_dict(), f'Deck duplicado como "{new_name}"')

        except Exception as e:
            return self._handle_exception(e, "duplicación de deck")

    def _get_cards_due_count(self, deck_id):
        """Obtener número de cartas vencidas para repaso"""
        try:
            return (
                self.db.session.query(Flashcard)
                .filter(
                    and_(
                        Flashcard.deck_id == deck_id,
                        not Flashcard.is_deleted,
                        Flashcard.next_review <= datetime.utcnow(),
                    )
                )
                .count()
            )
        except Exception:
            return 0

    def _get_cards_new_count(self, deck_id):
        """Obtener número de cartas nuevas (nunca estudiadas)"""
        try:
            return (
                self.db.session.query(Flashcard)
                .filter(
                    and_(
                        Flashcard.deck_id == deck_id,
                        not Flashcard.is_deleted,
                        Flashcard.last_reviewed is None,
                    )
                )
                .count()
            )
        except Exception:
            return 0

    def _get_cards_learning_count(self, deck_id):
        """Obtener número de cartas en proceso de aprendizaje"""
        try:
            return (
                self.db.session.query(Flashcard)
                .filter(
                    and_(
                        Flashcard.deck_id == deck_id,
                        not Flashcard.is_deleted,
                        Flashcard.last_reviewed is not None,
                        Flashcard.interval_days < 21,  # Menos de 3 semanas
                    )
                )
                .count()
            )
        except Exception:
            return 0

    def _get_cards_mastered_count(self, deck_id):
        """Obtener número de cartas dominadas"""
        try:
            return (
                self.db.session.query(Flashcard)
                .filter(
                    and_(
                        Flashcard.deck_id == deck_id,
                        not Flashcard.is_deleted,
                        Flashcard.interval_days >= 21,  # 3 semanas o más
                    )
                )
                .count()
            )
        except Exception:
            return 0

    def get_public_decks(self, page=1, per_page=20, search=""):
        """
        Obtener decks públicos con filtros y paginación

        Args:
            page: Número de página
            per_page: Elementos por página
            search: Término de búsqueda

        Returns:
            dict: Respuesta con decks públicos paginados
        """
        try:
            # Query base para decks públicos
            query = self.db.session.query(Deck).filter_by(
                is_public=True, is_deleted=False)

            # Aplicar búsqueda si se proporciona
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        Deck.name.ilike(search_term),
                        Deck.description.ilike(search_term),
                    )
                )

            # Ordenar por popularidad (número de flashcards)
            query = query.order_by(Deck.updated_at.desc())

            # Paginación
            total = query.count()
            decks = query.offset((page - 1) * per_page).limit(per_page).all()

            # Serializar decks
            decks_data = []
            for deck in decks:
                deck_data = deck.to_dict()
                # Agregar estadísticas básicas
                deck_data.update({
                    'total_cards': self._get_total_cards_count(deck.id),
                    'cards_due': self._get_cards_due_count(deck.id),
                })
                decks_data.append(deck_data)

            return self._success_response(
                data=decks_data,
                message=f"Se encontraron {total} decks públicos",
                pagination={
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            )

        except Exception as e:
            return self._handle_exception(e, "obtención de decks públicos")

    def search_decks(self, user_id, query, page=1, per_page=20):
        """
        Buscar decks del usuario por término de búsqueda

        Args:
            user_id: ID del usuario
            query: Término de búsqueda
            page: Número de página
            per_page: Elementos por página

        Returns:
            dict: Respuesta con decks encontrados
        """
        try:
            if not query or len(query.strip()) < 2:
                return self._error_response(
                    "El término de búsqueda debe tener al menos 2 caracteres")

            # Usar el método get_user_decks con búsqueda
            return self.get_user_decks(
                user_id,
                page=page,
                per_page=per_page,
                search=query.strip())

        except Exception as e:
            return self._handle_exception(e, "búsqueda de decks")

    def _get_total_cards_count(self, deck_id):
        """Obtener número total de cartas en el deck"""
        try:
            return (
                self.db.session.query(Flashcard)
                .filter(
                    and_(
                        Flashcard.deck_id == deck_id,
                        not Flashcard.is_deleted,
                    )
                )
                .count()
            )
        except Exception:
            return 0

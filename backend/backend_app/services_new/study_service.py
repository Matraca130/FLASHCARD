"""
StudyService - Servicio para gestión de sesiones de estudio
Refactorizado con algoritmos de repetición espaciada mejorados
"""

from .base_service import BaseService

try:
    from ..utils.algorithms import calculate_fsrs, calculate_sm2
except ImportError:
    from backend_app.utils.algorithms import calculate_fsrs, calculate_sm2

try:
    from ..models import Deck, Flashcard, StudySession, CardReview
except ImportError:
    from backend_app.models import Deck, Flashcard, StudySession, CardReview

from sqlalchemy import and_, or_
from datetime import datetime, timedelta
import random


class StudyService(BaseService):
    """Servicio para gestión de sesiones de estudio y algoritmos de repetición"""

    def start_study_session(self, user_id, deck_id, algorithm="fsrs"):
        """
        Iniciar nueva sesión de estudio

        Args:
            user_id: ID del usuario
            deck_id: ID del deck a estudiar
            algorithm: Algoritmo de repetición ("fsrs", "sm2", "anki", "ultra_sm2")

        Returns:
            dict: Respuesta con sesión creada
        """
        try:
            # Verificar que el deck existe y pertenece al usuario
            deck, error = self._get_resource_if_owned(
                Deck, deck_id, user_id, "deck")
            if error:
<<<<<<< HEAD
                return error
            
            # Verificar que hay cartas disponibles para estudiar
=======
                return err
            or  # Verificar que hay cartas disponibles para estudiar
>>>>>>> 4a64f0c0b7272a924fb9959c73278447c3324b3f
            available_cards = self._get_cards_for_study(deck_id)
            if not available_cards:
                return self._error_response(
                    "No hay cartas disponibles para estudiar", code=404)

            # Crear sesión de estudio
            session = StudySession(
                user_id=user_id,
                deck_id=deck_id,
                algorithm=algorithm,
                started_at=datetime.utcnow(),
                cards_studied=0,
                cards_correct=0,
                total_time=0,
            )

            self.db.session.add(session)

            if not self._commit_or_rollback():
                return self._error_response(
                    "Error al crear sesión de estudio", code=500)

            return self._success_response(
                {
                    "session_id": session.id,
                    "deck_name": deck.name,
                    "algorithm": algorithm,
                    "available_cards": len(available_cards),
                    "started_at": session.started_at.isoformat(),
                },
                "Sesión de estudio iniciada",
            )

        except Exception as e:
            return self._handle_exception(e, "inicio de sesión de estudio")

    def get_next_card(self, session_id, user_id):
        """
        Obtener siguiente carta para estudiar

        Args:
            session_id: ID de la sesión de estudio
            user_id: ID del usuario

        Returns:
            dict: Respuesta con carta para estudiar
        """
        try:
            # Verificar que la sesión existe y pertenece al usuario
            session = (
                self.db.session.query(StudySession)
                # Sesión activa
                .filter_by(id=session_id, user_id=user_id, completed_at=None)
                .first()
            )

            if not session:
                return self._error_response(
                    "Sesión de estudio no encontrada o completada", code=404)

            # Obtener cartas disponibles para esta sesión
            available_cards = self._get_cards_for_study(session.deck_id)

            if not available_cards:
                return self._error_response(
                    "No hay más cartas para estudiar", code=404)

            # Seleccionar carta según prioridad
            card = self._select_next_card(available_cards)

            # Preparar datos de la carta (sin mostrar la respuesta)
            card_data = {
                "id": card.id,
                "front_text": card.front_text,
                "front_image_url": card.front_image_url,
                "front_audio_url": card.front_audio_url,
                "difficulty": card.difficulty,
                "is_new": card.last_reviewed is None,
                "interval_days": card.interval_days or 0,
                "session_id": session_id,
            }

            return self._success_response(card_data)

        except Exception as e:
            return self._handle_exception(e, "obtención de siguiente carta")

    def _update_card_review_data(
            self,
            card,
            new_interval,
            new_ease_factor,
            new_repetitions,
            algorithm_result,
            session_algorithm):
        card.interval_days = new_interval
        card.ease_factor = new_ease_factor
        card.repetitions = new_repetitions or (card.repetitions or 0) + 1
        card.last_reviewed = datetime.utcnow()
        card.next_review = datetime.utcnow() + timedelta(days=new_interval)

        if session_algorithm == "fsrs":
            if hasattr(card, "stability"):
                card.stability = algorithm_result.get(
                    "stability", card.stability)
            if hasattr(card, "difficulty_fsrs"):
                card.difficulty_fsrs = algorithm_result.get(
                    "difficulty", card.difficulty_fsrs)
        self._update_timestamps(card)

    def _create_card_review_record(
            self,
            card_id,
            session_id,
            quality,
            response_time,
            session_algorithm,
            new_interval,
            new_ease_factor):
        review = CardReview(
            flashcard_id=card_id,
            session_id=session_id,
            quality=quality,
            response_time=response_time or 0,
            algorithm=session_algorithm,
            interval_before=card.interval_days,
            interval_after=new_interval,
            ease_factor=new_ease_factor or card.ease_factor,
            reviewed_at=datetime.utcnow(),
        )
        self.db.session.add(review)
        return review

    def _update_session_stats(self, session, quality, response_time):
        session.cards_studied += 1
        if quality >= 3:
            session.cards_correct += 1
        if response_time:
            session.total_time += response_time
        self._update_timestamps(session)

    def _build_review_response(self, card, quality, new_interval, session):
        return self._success_response({
            "card_id": card.id,
            "quality": quality,
            "new_interval": new_interval,
            "next_review": card.next_review.isoformat(),
            "is_correct": quality >= 3,
            "back_text": card.back_text,
            "back_image_url": card.back_image_url,
            "back_audio_url": card.back_audio_url,
            "session_stats": {
                "cards_studied": session.cards_studied,
                "cards_correct": session.cards_correct,
                "accuracy": (
                    (session.cards_correct / session.cards_studied * 100) if session.cards_studied > 0 else 0
                ),
            },
        }, "Carta revisada exitosamente")

    def review_card(
            self,
            session_id,
            user_id,
            card_id,
            quality,
            response_time=None):
        """
        Registrar respuesta a una carta y aplicar algoritmo de repetición

        Args:
            session_id: ID de la sesión de estudio
            user_id: ID del usuario
            card_id: ID de la carta respondida
            quality: Calidad de la respuesta (0-5)
            response_time: Tiempo de respuesta en segundos

        Returns:
            dict: Respuesta con resultado del algoritmo
        """
        try:
            session = (
                self.db.session.query(StudySession).filter_by(
                    id=session_id,
                    user_id=user_id,
                    completed_at=None).first())
            if not session:
                return self._error_response(
                    "Sesión de estudio no encontrada o completada", code=404)

            card = (
                self.db.session.query(Flashcard) .filter_by(
                    id=card_id,
                    deck_id=session.deck_id,
                    is_deleted=False) .first())
            if not card:
                return self._error_response("Carta no encontrada", code=404)

            if not isinstance(quality, (int, float)
                              ) or quality < 0 or quality > 5:
                return self._error_response(
                    "La calidad debe ser un número entre 0 y 5", code=400)

            algorithm_result = self._apply_spaced_repetition(
                card, quality, session.algorithm)
            if not algorithm_result["success"]:
                return algorithm_result

            new_interval, new_ease_factor, new_repetitions = algorithm_result["data"]

            self._update_card_review_data(
                card,
                new_interval,
                new_ease_factor,
                new_repetitions,
                algorithm_result,
                session.algorithm)
            self._create_card_review_record(
                card_id,
                session_id,
                quality,
                response_time,
                session.algorithm,
                new_interval,
                new_ease_factor)
            self._update_session_stats(session, quality, response_time)

            if not self._commit_or_rollback():
                return self._error_response(
                    "Error al guardar revisión", code=500)

            return self._build_review_response(
                card, quality, new_interval, session)

        except Exception as e:
            return self._handle_exception(e, "revisión de carta")

    def complete_study_session(self, session_id, user_id):
        """
        Completar sesión de estudio

        Args:
            session_id: ID de la sesión
            user_id: ID del usuario

        Returns:
            dict: Respuesta con estadísticas finales
        """
        try:
            # Verificar sesión activa
            session = (
                self.db.session.query(StudySession).filter_by(
                    id=session_id,
                    user_id=user_id,
                    completed_at=None).first())

            if not session:
                return self._error_response(
                    "Sesión de estudio no encontrada o ya completada", code=404)

            # Marcar sesión como completada
            session.completed_at = datetime.utcnow()
            session.duration = int(
                (session.completed_at - session.started_at).total_seconds())

            self._update_timestamps(session)

            if not self._commit_or_rollback():
                return self._error_response(
                    "Error al completar sesión", code=500)

            # Calcular estadísticas finales
            accuracy = (
                session.cards_correct
                / session.cards_studied
                * 100) if session.cards_studied > 0 else 0

            stats = {
                "session_id": session_id,
                "duration_seconds": session.duration,
                "duration_minutes": round(session.duration / 60, 1),
                "cards_studied": session.cards_studied,
                "cards_correct": session.cards_correct,
                "accuracy_percentage": round(accuracy, 1),
                "algorithm_used": session.algorithm,
                "deck_name": session.deck.name,
            }

            return self._success_response(
                stats, "Sesión completada exitosamente")

        except Exception as e:
            return self._handle_exception(
                e, "finalización de sesión de estudio")

    def get_due_cards(self, user_id, deck_id=None, limit=50):
        """
        Obtener cartas vencidas para repaso

        Args:
            user_id: ID del usuario
            deck_id: ID del deck (opcional)
            limit: Número máximo de cartas

        Returns:
            dict: Respuesta con cartas vencidas
        """
        try:
            # Query base
            query = (
                self.db.session.query(Flashcard)
                .join(Deck)
                .filter(
                    and_(
                        Deck.user_id == user_id,
                        not Deck.is_deleted,
                        not Flashcard.is_deleted,
                        or_(
                            Flashcard.next_review <= datetime.utcnow(),  # Cartas vencidas
                            Flashcard.last_reviewed is None,  # Cartas nuevas
                        ),
                    )
                )
            )

            # Filtrar por deck específico si se proporciona
            if deck_id:
                query = query.filter(Flashcard.deck_id == deck_id)

            # Ordenar por prioridad: vencidas primero, luego nuevas
            query = query.order_by(
                Flashcard.next_review.asc().nullslast(),
                Flashcard.created_at.asc()).limit(limit)

            cards = query.all()

            # Agrupar por deck
            cards_by_deck = {}
            for card in cards:
                deck_name = card.deck.name
                if deck_name not in cards_by_deck:
                    cards_by_deck[deck_name] = {
                        "deck_id": card.deck_id,
                        "deck_name": deck_name,
                        "cards": [],
                    }

                cards_by_deck[deck_name]["cards"].append(
                    {
                        "id": card.id,
                        "front_text": (
                            card.front_text[:100] + "..." if len(card.front_text) > 100 else card.front_text
                        ),
                        "is_new": card.last_reviewed is None,
                        "next_review": (card.next_review.isoformat() if card.next_review else None),
                        "interval_days": card.interval_days or 0,
                    }
                )

            return self._success_response(
                {"total_due": len(cards), "decks": list(cards_by_deck.values())})

        except Exception as e:
            return self._handle_exception(e, "obtención de cartas vencidas")

    def _get_cards_for_study(self, deck_id, limit=20):
        """
        Obtener cartas disponibles para estudiar en un deck
        """
        try:
            # Priorizar cartas vencidas
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

            # Si no hay suficientes vencidas, agregar nuevas
            if len(due_cards) < limit:
                remaining = limit - len(due_cards)
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
                    .limit(remaining)
                    .all()
                )

                due_cards.extend(new_cards)

            return due_cards

        except Exception:
            return []

    def _select_next_card(self, available_cards):
        """
        Seleccionar la siguiente carta según prioridad
        """
        if not available_cards:
            return None

        # Separar cartas vencidas y nuevas
        due_cards = [
            c for c in available_cards if c.next_review and c.next_review <= datetime.utcnow()]
        new_cards = [c for c in available_cards if c.last_reviewed is None]

        # Priorizar cartas vencidas
        if due_cards:
            # Ordenar por fecha de vencimiento (más vencidas primero)
            due_cards.sort(key=lambda x: x.next_review)
            return due_cards[0]

        # Si no hay vencidas, tomar carta nueva
        if new_cards:
            return new_cards[0]

        # Fallback: carta aleatoria
        return random.choice(available_cards)

    def _apply_spaced_repetition(self, card, quality, algorithm):
        """
        Aplicar algoritmo de repetición espaciada
        """
        try:
            if algorithm == "fsrs":
                return self._apply_fsrs(card, quality)
            elif algorithm == "sm2":
                return self._apply_sm2(card, quality)
            elif algorithm == "ultra_sm2":
                return self._apply_ultra_sm2(card, quality)
            elif algorithm == "anki":
                return self._apply_anki(card, quality)
            else:
                return self._error_response(
                    f"Algoritmo no soportado: {algorithm}", code=400)

        except Exception as e:
            return self._handle_exception(
                e, f"aplicación de algoritmo {algorithm}")

    def _apply_fsrs(self, card, quality):
        """
        Aplicar algoritmo FSRS
        """
        try:
            stability = getattr(card, "stability", 2.5)
            difficulty = getattr(card, "difficulty_fsrs", 5.0)

            new_stability, new_difficulty, new_interval = calculate_fsrs(
                stability, difficulty, quality, card.repetitions or 0
            )

            return self._success_response(
                (new_interval, None, None),
                {"stability": new_stability, "difficulty": new_difficulty},
            )

        except Exception as e:
            self.logger.error(f"Error en FSRS: {str(e)}")
            # Fallback a SM-2
            return self._apply_sm2(card, quality)

    def _apply_sm2(self, card, quality):
        """
        Aplicar algoritmo SM-2 clásico
        """
        try:
            ease_factor = card.ease_factor or 2.5
            repetitions = card.repetitions or 0

            new_ease_factor, new_interval, new_repetitions = calculate_sm2(
                ease_factor, repetitions, quality)

            return self._success_response(
                (new_interval, new_ease_factor, new_repetitions))

        except Exception as e:
            self.logger.error(f"Error en SM-2: {str(e)}")
            # Fallback básico
            return self._success_response((1, 2.5, 1))

    def _apply_ultra_sm2(self, card, quality):
        """
        Aplicar algoritmo Ultra SM-2 con límites dinámicos
        """
        try:
            ease_factor = card.ease_factor or 2.5
            repetitions = card.repetitions or 0

            # Calcular SM-2 base
            new_ease_factor, new_interval, new_repetitions = calculate_sm2(
                ease_factor, repetitions, quality)

            # Aplicar límites dinámicos del Ultra SM-2
            if quality < 3:
                # Respuesta incorrecta: reducir intervalo más agresivamente
                new_interval = max(1, new_interval // 2)
                new_ease_factor = max(1.3, new_ease_factor - 0.2)
            else:
                # Respuesta correcta: límites más conservadores
                new_ease_factor = min(3.0, new_ease_factor)
                new_interval = min(365, new_interval)  # Máximo 1 año

            return self._success_response(
                (new_interval, new_ease_factor, new_repetitions))

        except Exception as e:
            self.logger.error(f"Error en Ultra SM-2: {str(e)}")
            return self._apply_sm2(card, quality)

    def _apply_anki(self, card, quality):
        """
        Aplicar algoritmo estilo Anki con pasos de aprendizaje
        """
        try:
            repetitions = card.repetitions or 0
            ease_factor = card.ease_factor or 2.5

            # Pasos de aprendizaje para cartas nuevas

            if repetitions == 0:
                # Primera vez: 1 minuto
                new_interval = 1 / 1440  # 1 minuto en días
                new_repetitions = 1
            elif repetitions == 1 and quality >= 3:
                # Segunda vez correcta: 10 minutos
                new_interval = 10 / 1440  # 10 minutos en días
                new_repetitions = 2
            elif repetitions >= 2 and quality >= 3:
                # Carta graduada: usar SM-2
                new_ease_factor, new_interval, new_repetitions = calculate_sm2(
                    ease_factor, repetitions - 2, quality)
                return self._success_response(
                    (new_interval, new_ease_factor, new_repetitions))
            else:
                # Respuesta incorrecta: reiniciar
                new_interval = 1 / 1440  # 1 minuto
                new_repetitions = 1
                ease_factor = max(1.3, ease_factor - 0.2)

            return self._success_response(
                (new_interval, ease_factor, new_repetitions))

        except Exception as e:
            self.logger.error(f"Error en Anki: {str(e)}")
            return self._apply_sm2(card, quality)

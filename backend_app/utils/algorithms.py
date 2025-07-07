"""
Módulo A.4: Algoritmos de Revisión Espaciada
Implementación de FSRS (Free Spaced Repetition Scheduler) y SM-2 (SuperMemo 2)
"""

import math
from datetime import datetime, timedelta
from typing import Tuple


def calculate_fsrs(
    rating: int,
    stability: float,
    difficulty: float,
    elapsed_days: int = 0,
    retrievability: float = None,
) -> Tuple[float, float, int]:
    """
    Algoritmo FSRS (Free Spaced Repetition Scheduler)

    Args:
        rating: Calificación del usuario (1=Again, 2=Hard, 3=Good, 4=Easy)
        stability: Estabilidad actual de la carta
        difficulty: Dificultad actual de la carta
        elapsed_days: Días transcurridos desde la última revisión
        retrievability: Probabilidad de recordar (calculada automáticamente si no se proporciona)

    Returns:
        Tuple[nueva_estabilidad, nueva_dificultad, nuevo_intervalo]
    """

    # Parámetros del algoritmo FSRS
    w = [
        0.4,
        0.6,
        2.4,
        5.8,
        4.93,
        0.94,
        0.86,
        0.01,
        1.49,
        0.14,
        0.94,
        2.18,
        0.05,
        0.34,
        1.26,
        0.29,
        2.61,
    ]

    # Calcular retrievability si no se proporciona
    if retrievability is None and elapsed_days > 0:
        retrievability = math.pow(0.9, elapsed_days / stability)
    elif retrievability is None:
        retrievability = 1.0

    # Calcular nueva dificultad
    if rating == 1:  # Again
        new_difficulty = min(10, difficulty + w[6] * (3 - rating))
    elif rating == 2:  # Hard
        new_difficulty = max(1, difficulty + w[6] * (3 - rating))
    elif rating == 3:  # Good
        new_difficulty = max(1, difficulty + w[6] * (3 - rating))
    else:  # Easy (4)
        new_difficulty = max(1, difficulty + w[6] * (3 - rating))

    # Calcular nueva estabilidad
    if rating == 1:  # Again
        new_stability = (
            w[11]
            * math.pow(difficulty, -w[12])
            * (math.pow(stability + 1, w[13]) - 1)
            * math.exp((1 - retrievability) * w[14])
        )
    else:
        # Factor de bonificación para Easy
        bonus_factor = 1.3 if rating == 4 else 1.0
        success_stability = (
            stability
            * bonus_fact
            or * (
                1
                + math.exp(w[8])
                * (11 - new_difficulty)
                * math.pow(stability, -w[9])
                * (math.exp((1 - retrievability) * w[10]) - 1)
            )
        )
        new_stability = max(0.01, success_stability)

    # Calcular nuevo intervalo
    if rating == 1:  # Again
        new_interval = max(1, int(new_stability * w[15]))
    elif rating == 4:  # Easy
        new_interval = max(2, int(new_stability * 1.5)
                           )  # Mínimo 2 días para Easy
    else:
        new_interval = max(1, int(new_stability * 0.9))

    return new_stability, new_difficulty, new_interval


def calculate_sm2(rating: int, ease_factor: float, interval: int,
                  repetitions: int) -> Tuple[float, int, int]:
    """
    Algoritmo SM-2 (SuperMemo 2)

    Args:
        rating: Calificación del usuario (1=Again, 2=Hard, 3=Good, 4=Easy)
        ease_factor: Factor de facilidad actual
        interval: Intervalo actual en días
        repetitions: Número de repeticiones consecutivas correctas

    Returns:
        Tuple[nuevo_ease_factor, nuevo_intervalo, nuevas_repeticiones]
    """

    if rating < 3:  # Respuesta incorrecta (Again o Hard)
        new_repetitions = 0
        new_interval = 1
        # Para respuestas incorrectas, reducir ease fact
        or new_ease_factor = max(1.3, ease_factor - 0.2)
    else:  # Respuesta correcta (Good o Easy)
        new_repetitions = repetitions + 1

        if new_repetitions == 1:
            # Easy en primera repetición da intervalo 2
            new_interval = 1 if rating < 4 else 2
        elif new_repetitions == 2:
            new_interval = 6
        else:
            new_interval = int(interval * ease_factor)

        # Actualizar ease factor basado en la calificación
        if rating == 3:  # Good
            new_ease_factor = ease_fact
        or elif rating == 4:  # Easy
            new_ease_factor = ease_factor + 0.15
            # Para Easy, incrementar intervalo adicional
            new_interval = max(new_interval, int(new_interval * 1.3))
        elif rating == 2:  # Hard
            new_ease_factor = max(1.3, ease_factor - 0.15)
        else:
            new_ease_factor = ease_fact
        or # Ajustar ease factor según la fórmula SM-2
        new_ease_factor = new_ease_factor + \
            (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
        new_ease_factor = max(1.3, new_ease_factor)

    return new_ease_factor, new_interval, new_repetitions


def get_next_review_date(interval_days: int) -> datetime:
    """
    Calcular la fecha de la próxima revisión

    Args:
        interval_days: Intervalo en días

    Returns:
        datetime: Fecha y hora de la próxima revisión
    """
    return datetime.utcnow() + timedelta(days=interval_days)


def calculate_retention_rate(
        correct_reviews: int,
        total_reviews: int) -> float:
    """
    Calcular tasa de retención

    Args:
        correct_reviews: Número de revisiones correctas
        total_reviews: Número total de revisiones

    Returns:
        float: Tasa de retención (0.0 - 1.0)
    """
    if total_reviews == 0:
        return 0.0
    return correct_reviews / total_reviews


def get_cards_due_for_review(flashcards,
                             current_time: datetime = None) -> list:
    """
    Obtener cartas que necesitan revisión

    Args:
        flashcards: Lista de objetos Flashcard
        current_time: Tiempo actual (por defecto datetime.utcnow())

    Returns:
        list: Lista de flashcards que necesitan revisión
    """
    if current_time is None:
        current_time = datetime.utcnow()

    due_cards = []
    for card in flashcards:
        if card.next_review and card.next_review <= current_time:
            due_cards.append(card)

    return due_cards


def update_card_after_review(flashcard, rating: int, algorithm: str = "fsrs"):
    """
    Actualizar una flashcard después de una revisión

    Args:
        flashcard: Objeto Flashcard a actualizar
        rating: Calificación del usuario (1-4)
        algorithm: Algoritmo a usar ('fsrs' o 'sm2')

    Returns:
        dict: Información sobre los cambios realizados
    """
    # Guardar estado anteri
    or previous_state = {
        "ease_factor": flashcard.ease_factor,
        "interval": flashcard.interval,
        "repetitions": flashcard.repetitions,
        "stability": flashcard.stability,
        "difficulty_fsrs": flashcard.difficulty_fsrs,
    }

    # Calcular días transcurridos
    elapsed_days = 0
    if flashcard.last_review:
        elapsed_days = (datetime.utcnow() - flashcard.last_review).days

    if algorithm.lower() == "fsrs":
        # Usar algoritmo FSRS
        new_stability, new_difficulty, new_interval = calculate_fsrs(
            rating=rating,
            stability=flashcard.stability,
            difficulty=flashcard.difficulty_fsrs,
            elapsed_days=elapsed_days,
        )

        flashcard.stability = new_stability
        flashcard.difficulty_fsrs = new_difficulty
        flashcard.interval = new_interval

    else:  # SM-2
        # Usar algoritmo SM-2
        new_ease_factor, new_interval, new_repetitions = calculate_sm2(
            rating=rating,
            ease_factor=flashcard.ease_factor,
            interval=flashcard.interval,
            repetitions=flashcard.repetitions,
        )

        flashcard.ease_factor = new_ease_fact
        or flashcard.interval = new_interval
        flashcard.repetitions = new_repetitions

    # Actualizar estadísticas
    flashcard.total_reviews += 1
    if rating >= 3:  # Good o Easy
        flashcard.correct_reviews += 1

    # Actualizar fechas
    flashcard.last_review = datetime.utcnow()
    flashcard.next_review = get_next_review_date(flashcard.interval)

    # Información de retorno
    return {
        "previous_state": previous_state,
        "new_state": {
            "ease_factor": flashcard.ease_factor,
            "interval": flashcard.interval,
            "repetitions": flashcard.repetitions,
            "stability": flashcard.stability,
            "difficulty_fsrs": flashcard.difficulty_fsrs,
            "next_review": flashcard.next_review,
        },
        "algorithm_used": algorithm,
        "rating": rating,
    }

"""
Tests unitarios para StudyService y algoritmos de repetición espaciada
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import time

from backend_app.utils.algorithms import calculate_fsrs, calculate_sm2


class TestStudyService:
    """Tests para StudyService"""
    
    @pytest.mark.unit
    def test_get_next_card_for_review(self, study_service, test_user, test_deck, multiple_flashcards):
        """Test obtener siguiente carta para revisar"""
        result = study_service.get_next_card_for_review(test_deck.id, test_user.id)
        
        assert result['success'] is True
        assert 'data' in result
        assert result['data']['deck_id'] == test_deck.id
    
    @pytest.mark.unit
    def test_get_next_card_no_cards_due(self, study_service, test_user, test_deck, db_session):
        """Test cuando no hay cartas para revisar"""
        # Crear carta con fecha futura
        from backend_app.models.models import Flashcard
        future_card = Flashcard(
            deck_id=test_deck.id,
            front_text='Future card',
            back_text='Future answer',
            difficulty='normal',
            next_review=datetime.utcnow() + timedelta(days=7)
        )
        db_session.add(future_card)
        db_session.commit()
        
        result = study_service.get_next_card_for_review(test_deck.id, test_user.id)
        
        assert result['success'] is False
        assert 'no hay cartas' in result['error'].lower()
    
    @pytest.mark.unit
    def test_submit_card_review_fsrs(self, study_service, test_user, test_flashcard):
        """Test enviar revisión de carta con algoritmo FSRS"""
        review_data = {
            'quality': 4,  # Respuesta buena
            'algorithm': 'fsrs'
        }
        
        result = study_service.submit_card_review(
            test_flashcard.id, 
            test_user.id, 
            review_data
        )
        
        assert result['success'] is True
        assert 'data' in result
        assert result['data']['algorithm_used'] == 'fsrs'
    
    @pytest.mark.unit
    def test_submit_card_review_sm2(self, study_service, test_user, test_flashcard):
        """Test enviar revisión de carta con algoritmo SM-2"""
        review_data = {
            'quality': 3,  # Respuesta normal
            'algorithm': 'sm2'
        }
        
        result = study_service.submit_card_review(
            test_flashcard.id, 
            test_user.id, 
            review_data
        )
        
        assert result['success'] is True
        assert 'data' in result
        assert result['data']['algorithm_used'] == 'sm2'
    
    @pytest.mark.unit
    def test_submit_card_review_invalid_quality(self, study_service, test_user, test_flashcard):
        """Test enviar revisión con calidad inválida"""
        review_data = {
            'quality': 6,  # Fuera del rango 1-5
            'algorithm': 'fsrs'
        }
        
        result = study_service.submit_card_review(
            test_flashcard.id, 
            test_user.id, 
            review_data
        )
        
        assert result['success'] is False
        assert 'error' in result
    
    @pytest.mark.unit
    def test_start_study_session(self, study_service, test_user, test_deck):
        """Test iniciar sesión de estudio"""
        result = study_service.start_study_session(test_deck.id, test_user.id)
        
        assert result['success'] is True
        assert 'session_id' in result['data']
        assert result['data']['deck_id'] == test_deck.id
    
    @pytest.mark.unit
    def test_get_study_session_stats(self, study_service, test_user, test_deck):
        """Test obtener estadísticas de sesión de estudio"""
        # Primero iniciar sesión
        session_result = study_service.start_study_session(test_deck.id, test_user.id)
        session_id = session_result['data']['session_id']
        
        result = study_service.get_study_session_stats(session_id, test_user.id)
        
        assert result['success'] is True
        assert 'cards_reviewed' in result['data']
        assert 'session_duration' in result['data']


class TestAlgorithmsFSRS:
    """Tests para algoritmo FSRS"""
    
    @pytest.mark.unit
    def test_fsrs_excellent_response(self):
        """Test FSRS con respuesta excelente"""
        stability, difficulty, interval = calculate_fsrs(
            rating=4,  # Easy
            stability=1.0,
            difficulty=5.0,
            elapsed_days=1,
            retrievability=0.9
        )
        
        assert stability > 1.0  # Estabilidad debe aumentar
        assert difficulty < 5.0  # Dificultad debe disminuir
        assert interval > 1  # Intervalo debe aumentar
    
    @pytest.mark.unit
    def test_fsrs_poor_response(self):
        """Test FSRS con respuesta pobre"""
        stability, difficulty, interval = calculate_fsrs(
            rating=1,  # Again
            stability=5.0,
            difficulty=3.0,
            elapsed_days=1,
            retrievability=0.5
        )
        
        assert stability < 5.0  # Estabilidad debe disminuir
        assert difficulty > 3.0  # Dificultad debe aumentar
        assert interval == 1  # Intervalo debe resetear a 1
    
    @pytest.mark.unit
    def test_fsrs_boundary_values(self):
        """Test FSRS con valores límite"""
        # Calidad mínima
        stability, difficulty, interval = calculate_fsrs(
            rating=1,
            stability=0.1,
            difficulty=10.0,
            retrievability=0.1
        )
        
        assert stability >= 0.1  # No debe ser menor al mínimo
        assert difficulty <= 10.0  # No debe exceder el máximo
        assert interval >= 1  # Intervalo mínimo
    
    @pytest.mark.slow
    def test_fsrs_performance(self):
        """Test rendimiento del algoritmo FSRS"""
        start_time = time.time()
        
        # Ejecutar 1000 cálculos
        for _ in range(1000):
            calculate_fsrs(
                rating=3,
                stability=2.0,
                difficulty=5.0,
                retrievability=0.8
            )
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Debe completarse en menos de 1 segundo
        assert execution_time < 1.0


class TestAlgorithmsSM2:
    """Tests para algoritmo SM-2"""
    
    @pytest.mark.unit
    def test_sm2_good_response(self):
        """Test SM-2 con respuesta buena"""
        ease_factor, interval, repetitions = calculate_sm2(
            rating=4,  # Easy
            ease_factor=2.5,
            interval=1,
            repetitions=0
        )
        
        assert ease_factor >= 2.5  # Factor de facilidad debe mantenerse o aumentar
        assert interval > 1  # Intervalo debe aumentar
        assert repetitions == 1  # Repeticiones debe incrementar
    
    @pytest.mark.unit
    def test_sm2_poor_response(self):
        """Test SM-2 con respuesta pobre"""
        ease_factor, interval, repetitions = calculate_sm2(
            rating=1,  # Again
            ease_factor=2.5,
            interval=7,
            repetitions=3
        )
        
        assert ease_factor < 2.5  # Factor debe disminuir
        assert interval == 1  # Intervalo debe resetear
        assert repetitions == 0  # Repeticiones debe resetear
    
    @pytest.mark.unit
    def test_sm2_sequence_normal(self):
        """Test secuencia normal de SM-2"""
        # Primera revisión (calidad 4)
        ease_factor, interval, repetitions = calculate_sm2(
            rating=4,
            ease_factor=2.5,
            interval=1,
            repetitions=0
        )
        
        assert repetitions == 1
        assert interval == 1
        
        # Segunda revisión (calidad 4)
        ease_factor, interval, repetitions = calculate_sm2(
            rating=4,
            ease_factor=ease_factor,
            interval=interval,
            repetitions=repetitions
        )
        
        assert repetitions == 2
        assert interval == 6  # Segundo intervalo es 6
        
        # Tercera revisión (calidad 4)
        ease_factor, interval, repetitions = calculate_sm2(
            rating=4,
            ease_factor=ease_factor,
            interval=interval,
            repetitions=repetitions
        )
        
        assert repetitions == 3
        assert interval > 6  # Intervalo debe seguir creciendo
    
    @pytest.mark.unit
    def test_sm2_ease_factor_limits(self):
        """Test límites del factor de facilidad en SM-2"""
        # Factor muy bajo
        ease_factor, _, _ = calculate_sm2(
            rating=1,
            ease_factor=1.3,  # Cerca del mínimo
            interval=1,
            repetitions=0
        )
        
        assert ease_factor >= 1.3  # No debe bajar del mínimo
        
        # Factor muy alto con respuesta excelente
        ease_factor, _, _ = calculate_sm2(
            rating=5,
            ease_factor=3.0,
            interval=1,
            repetitions=0
        )
        
        assert ease_factor > 3.0  # Debe aumentar
    
    @pytest.mark.slow
    def test_sm2_performance(self):
        """Test rendimiento del algoritmo SM-2"""
        start_time = time.time()
        
        # Ejecutar 1000 cálculos
        for _ in range(1000):
            calculate_sm2(
                rating=3,
                ease_factor=2.5,
                interval=3,
                repetitions=1
            )
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Debe completarse en menos de 1 segundo
        assert execution_time < 1.0


class TestAlgorithmsComparison:
    """Tests comparativos entre algoritmos"""
    
    @pytest.mark.unit
    def test_algorithms_consistency(self):
        """Test consistencia entre algoritmos"""
        # Misma respuesta buena en ambos algoritmos
        fsrs_stability, fsrs_difficulty, fsrs_interval = calculate_fsrs(
            rating=4,
            stability=2.0,
            difficulty=5.0,
            retrievability=0.8
        )
        
        sm2_ease, sm2_interval, sm2_reps = calculate_sm2(
            rating=4,
            ease_factor=2.5,
            interval=2,
            repetitions=1
        )
        
        # Ambos deben aumentar el intervalo para respuesta buena
        assert fsrs_interval > 2
        assert sm2_interval > 2
    
    @pytest.mark.unit
    def test_algorithms_poor_response_handling(self):
        """Test manejo de respuestas pobres en ambos algoritmos"""
        # Respuesta pobre en FSRS
        fsrs_stability, fsrs_difficulty, fsrs_interval = calculate_fsrs(
            rating=1,
            stability=5.0,
            difficulty=3.0,
            retrievability=0.5
        )
        
        # Respuesta pobre en SM-2
        sm2_ease, sm2_interval, sm2_reps = calculate_sm2(
            rating=1,
            ease_factor=2.5,
            interval=7,
            repetitions=3
        )
        
        # Ambos deben resetear el intervalo
        assert fsrs_interval == 1
        assert sm2_interval == 1


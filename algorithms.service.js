import { api } from './apiClient.js';
import { store } from './store/store.js';

// Variable para el algoritmo seleccionado en el modal
let selectedModalAlgorithm = 'ultra_sm2';

/**
 * Muestra el modal de selección de algoritmo
 */
export function showAlgorithmModal() {
  const modal = document.getElementById('algorithm-modal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  // Reset selection to default
  selectModalAlgorithm('ultra_sm2');
  
  // Add animation
  setTimeout(() => {
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.transform = 'scale(1)';
      content.style.opacity = '1';
    }
  }, 10);
}

/**
 * Cierra el modal de algoritmos
 */
export function closeAlgorithmModal() {
  const modal = document.getElementById('algorithm-modal');
  if (!modal) return;
  
  modal.style.display = 'none';
}

/**
 * Selecciona un algoritmo en el modal
 */
export function selectModalAlgorithm(algorithmId) {
  selectedModalAlgorithm = algorithmId;
  
  // Update visual selection
  document.querySelectorAll('.algorithm-option').forEach(option => {
    const check = option.querySelector('.algorithm-check');
    if (option.dataset.algorithm === algorithmId) {
      option.style.borderColor = '#4caf50';
      option.style.background = 'rgba(76, 175, 80, 0.1)';
      if (check) {
        check.style.background = '#4caf50';
        check.style.borderColor = '#4caf50';
        check.style.color = 'white';
      }
    } else {
      option.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      option.style.background = 'rgba(255, 255, 255, 0.05)';
      if (check) {
        check.style.background = 'transparent';
        check.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        check.style.color = 'transparent';
      }
    }
  });
}

/**
 * Inicia el estudio con el algoritmo seleccionado
 */
export async function startStudyWithAlgorithm() {
  try {
    const deckId = store.get('selectedDeckId');
    if (!deckId) {
      if (window.showNotification) {
        window.showNotification('Por favor selecciona un deck primero', 'warning');
      }
      return;
    }

    // Guardar el algoritmo seleccionado
    store.set('selectedAlgorithm', selectedModalAlgorithm);
    
    // Cerrar modal
    closeAlgorithmModal();
    
    // Iniciar sesión de estudio
    const response = await api(`/api/study/start`, {
      method: 'POST',
      body: JSON.stringify({
        deck_id: deckId,
        algorithm: selectedModalAlgorithm
      })
    });

    if (response.session_id) {
      store.set('currentSessionId', response.session_id);
      
      // Navegar a la sesión de estudio
      if (window.navigate) {
        window.navigate('study-session');
      }
      
      if (window.showNotification) {
        window.showNotification(`Sesión iniciada con ${getAlgorithmName(selectedModalAlgorithm)}`, 'success');
      }
    }
    
  } catch (error) {
    console.error('Error starting study session:', error);
    if (window.showNotification) {
      window.showNotification('Error al iniciar la sesión', 'error');
    }
  }
}

/**
 * Obtiene el nombre legible del algoritmo
 */
export function getAlgorithmName(algorithmId) {
  const algorithms = {
    'ultra_sm2': 'Ultra SM-2',
    'anki': 'Anki',
    'fsrs': 'FSRS',
    'leitner': 'Sistema Leitner',
    'simple': 'Repetición Simple'
  };
  
  return algorithms[algorithmId] || algorithmId;
}

/**
 * Obtiene información detallada del algoritmo
 */
export function getAlgorithmInfo(algorithmId) {
  const algorithms = {
    'ultra_sm2': {
      name: 'Ultra SM-2',
      description: 'Algoritmo avanzado basado en SM-2 con optimizaciones para retención a largo plazo',
      features: ['Intervalos adaptativos', 'Factor de facilidad dinámico', 'Análisis de confianza'],
      recommended: true
    },
    'anki': {
      name: 'Anki',
      description: 'Algoritmo utilizado por la popular aplicación Anki',
      features: ['Intervalos graduales', 'Revisiones programadas', 'Factores de dificultad'],
      recommended: false
    },
    'fsrs': {
      name: 'FSRS',
      description: 'Free Spaced Repetition Scheduler - Algoritmo moderno basado en investigación',
      features: ['Predicción de memoria', 'Optimización automática', 'Análisis estadístico'],
      recommended: false
    },
    'leitner': {
      name: 'Sistema Leitner',
      description: 'Sistema clásico de cajas para repetición espaciada',
      features: ['Cajas de intervalos', 'Promoción/degradación', 'Simplicidad'],
      recommended: false
    },
    'simple': {
      name: 'Repetición Simple',
      description: 'Sistema básico de repetición con intervalos fijos',
      features: ['Intervalos fijos', 'Fácil de entender', 'Sin complejidad'],
      recommended: false
    }
  };
  
  return algorithms[algorithmId] || null;
}

/**
 * Evalúa una carta con el algoritmo seleccionado
 */
export async function evaluateCard(cardId, quality, responseTime = 0) {
  try {
    const algorithm = store.get('selectedAlgorithm') || 'ultra_sm2';
    
    const response = await api('/api/study/card/answer', {
      method: 'POST',
      body: JSON.stringify({
        card_id: cardId,
        quality: quality,
        response_time: responseTime,
        algorithm: algorithm,
        confidence: quality + 1 // Convertir a escala 1-5
      })
    });
    
    if (!response.ok && response.status) {
      throw new Error('Error al evaluar carta');
    }
    
    return response;
    
  } catch (error) {
    console.error('Error evaluating card:', error);
    throw error;
  }
}

/**
 * Actualiza la repetición espaciada de una carta
 */
export async function updateSpacedRepetition(cardId, quality, algorithm = 'ultra_sm2') {
  try {
    const response = await api('/api/cards/spaced-repetition', {
      method: 'POST',
      body: JSON.stringify({
        card_id: cardId,
        quality: quality,
        algorithm: algorithm
      })
    });
    
    return response;
    
  } catch (error) {
    console.error('Error updating spaced repetition:', error);
    throw error;
  }
}

/**
 * Obtiene el algoritmo seleccionado actualmente
 */
export function getSelectedAlgorithm() {
  return selectedModalAlgorithm;
}

/**
 * Establece el algoritmo seleccionado
 */
export function setSelectedAlgorithm(algorithmId) {
  selectedModalAlgorithm = algorithmId;
  store.set('selectedAlgorithm', algorithmId);
}

/**
 * Inicializa los event listeners para el modal de algoritmos
 */
export function initializeAlgorithmModal() {
  // Event listeners para las opciones de algoritmo
  document.querySelectorAll('.algorithm-option').forEach(option => {
    option.addEventListener('click', () => {
      const algorithmId = option.dataset.algorithm;
      if (algorithmId) {
        selectModalAlgorithm(algorithmId);
      }
    });
  });
  
  // Event listener para el botón de cerrar
  const closeBtn = document.querySelector('#algorithm-modal .close-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAlgorithmModal);
  }
  
  // Event listener para el botón de iniciar
  const startBtn = document.querySelector('#algorithm-modal .start-study-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startStudyWithAlgorithm);
  }
  
  // Cerrar modal al hacer clic fuera
  const modal = document.getElementById('algorithm-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAlgorithmModal();
      }
    });
  }
}

// Exponer funciones globalmente para compatibilidad
window.showAlgorithmModal = showAlgorithmModal;
window.closeAlgorithmModal = closeAlgorithmModal;
window.selectModalAlgorithm = selectModalAlgorithm;
window.startStudyWithAlgorithm = startStudyWithAlgorithm;
window.evaluateCard = evaluateCard;
window.updateSpacedRepetition = updateSpacedRepetition;


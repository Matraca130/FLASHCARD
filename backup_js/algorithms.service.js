import { ApiClient } from './apiClient.js';
import { store } from './store/store.js';
import { apiWithFallback, performCrudOperation } from './utils/apiHelpers.js';
import { showNotification } from './utils/helpers.js';

// Variable para el algoritmo seleccionado en el modal
let selectedModalAlgorithm = 'ultra_sm2';

// Configuraciones de algoritmos disponibles
const ALGORITHM_CONFIGS = {
  ultra_sm2: {
    name: 'Ultra SM-2',
    description: 'Algoritmo optimizado basado en SM-2 con ajustes dinámicos',
    difficulty: 'Intermedio',
    features: [
      'Intervalos adaptativos',
      'Factor de facilidad dinámico',
      'Optimizado para retención',
    ],
    defaultParams: {
      initial_interval: 1,
      easy_factor: 2.5,
      hard_factor: 1.2,
      min_factor: 1.3,
      max_factor: 3.0,
    },
  },
  sm2: {
    name: 'SM-2 Clásico',
    description: 'Algoritmo SuperMemo 2 tradicional y confiable',
    difficulty: 'Básico',
    features: [
      'Intervalos fijos',
      'Factor de facilidad estático',
      'Probado y confiable',
    ],
    defaultParams: {
      initial_interval: 1,
      easy_factor: 2.5,
      hard_factor: 1.2,
    },
  },
  anki: {
    name: 'Estilo Anki',
    description: 'Algoritmo similar al usado por Anki con graduación',
    difficulty: 'Avanzado',
    features: [
      'Graduación por pasos',
      'Intervalos personalizables',
      'Lapsos optimizados',
    ],
    defaultParams: {
      learning_steps: [1, 10],
      graduating_interval: 1,
      easy_interval: 4,
      max_interval: 36500,
    },
  },
  fsrs: {
    name: 'FSRS v4',
    description:
      'Free Spaced Repetition Scheduler - Algoritmo de última generación',
    difficulty: 'Experto',
    features: [
      'IA adaptativa',
      'Predicción de memoria',
      'Optimización continua',
    ],
    defaultParams: {
      w: [
        0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18,
        0.05, 0.34, 1.26, 0.29, 2.61,
      ],
    },
  },
};

/**
 * Muestra el modal de selección de algoritmo
 */
export function showAlgorithmModal() {
  const modal = document.getElementById('algorithm-modal');
  if (!modal) {
    createAlgorithmModal();
    return;
  }

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
 * Crea el modal de algoritmos dinámicamente
 */
function createAlgorithmModal() {
  const modalHTML = `
    <div id="algorithm-modal" class="modal algorithm-modal" style="display: flex;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Seleccionar Algoritmo de Repetición</h3>
          <span class="close" onclick="closeAlgorithmModal()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="algorithms-grid">
    ${Object.entries(ALGORITHM_CONFIGS)
      .map(
        ([id, config]) => `
            <div class="algorithm-option" data-algorithm="${id}" onclick="selectModalAlgorithm('${id}')">
              <div class="algorithm-header">
                <h4>${config.name}</h4>
                <span class="algorithm-difficulty ${config.difficulty.toLowerCase()}">${config.difficulty}</span>
              </div>
              <p class="algorithm-description">${config.description}</p>
              <div class="algorithm-features">
                ${config.features.map((feature) => `<span class="feature-tag">${feature}</span>`).join('')}
              </div>
              <div class="algorithm-check">✓</div>
            </div>
          `
      )
      .join('')}
          </div>
          <div class="algorithm-details" id="algorithm-details">
            <h4>Configuración del Algoritmo</h4>
            <div id="algorithm-params"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeAlgorithmModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="confirmAlgorithmSelection()">Confirmar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Cierra el modal de algoritmos
 */
export function closeAlgorithmModal() {
  const modal = document.getElementById('algorithm-modal');
  if (!modal) {
    return;
  }

  modal.style.display = 'none';
}

/**
 * Selecciona un algoritmo en el modal
 * @param {string} algorithmId - ID del algoritmo a seleccionar
 */
export function selectModalAlgorithm(algorithmId) {
  selectedModalAlgorithm = algorithmId;

  // Update visual selection
  document.querySelectorAll('.algorithm-option').forEach((option) => {
    const check = option.querySelector('.algorithm-check');
    if (option.dataset.algorithm === algorithmId) {
      option.style.borderColor = '#4caf50';
      option.style.background = 'rgba(76, 175, 80, 0.1)';
      if (check) {
        check.style.display = 'block';
      }
    } else {
      option.style.borderColor = '#ddd';
      option.style.background = 'white';
      if (check) {
        check.style.display = 'none';
      }
    }
  });

  // Update algorithm details
  updateAlgorithmDetails(algorithmId);
}

/**
 * Actualiza los detalles del algoritmo seleccionado
 * @param {string} algorithmId - ID del algoritmo
 */
function updateAlgorithmDetails(algorithmId) {
  const config = ALGORITHM_CONFIGS[algorithmId];
  if (!config) {
    return;
  }

  const detailsContainer = document.getElementById('algorithm-params');
  if (!detailsContainer) {
    return;
  }

  const paramsHTML = Object.entries(config.defaultParams)
    .map(
      ([key, value]) => `
    <div class="param-item">
      <label for="param-${key}">${formatParamName(key)}:</label>
      <input type="number" id="param-${key}" value="${value}" step="0.1" min="0">
    </div>
  `
    )
    .join('');

  detailsContainer.innerHTML = `
    <div class="algorithm-params">
      ${paramsHTML}
    </div>
    <div class="algorithm-info">
      <p><strong>Descripción:</strong> ${config.description}</p>
      <p><strong>Características:</strong> ${config.features.join(', ')}</p>
    </div>
  `;
}

/**
 * Formatea el nombre de un parámetro para mostrar
 * @param {string} paramName - Nombre del parámetro
 * @returns {string} - Nombre formateado
 */
function formatParamName(paramName) {
  return paramName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Confirma la selección del algoritmo
 */
export async function confirmAlgorithmSelection() {
  try {
    // Recopilar parámetros personalizados
    const params = {};
    const config = ALGORITHM_CONFIGS[selectedModalAlgorithm];

    Object.keys(config.defaultParams).forEach((key) => {
      const input = document.getElementById(`param-${key}`);
      if (input) {
        params[key] = parseFloat(input.value) || config.defaultParams[key];
      }
    });

    // Guardar configuración del algoritmo
    await saveAlgorithmConfig(selectedModalAlgorithm, params);

    closeAlgorithmModal();
    showNotification(
      `Algoritmo ${config.name} configurado exitosamente`,
      'success'
    );
  } catch (error) {
    console.error('Error confirmando selección de algoritmo:', error);
    showNotification('Error al configurar algoritmo', 'error');
  }
}

/**
 * Guarda la configuración del algoritmo
 * @param {string} algorithmId - ID del algoritmo
 * @param {Object} params - Parámetros del algoritmo
 */
export async function saveAlgorithmConfig(algorithmId, params) {
  try {
    const config = {
      algorithm: algorithmId,
      parameters: params,
      updated_at: new Date().toISOString(),
    };

    await performCrudOperation(
      () =>
        ApiClient.post('/api/user/algorithm-config', config),
      null, // No mostrar notificación aquí
      'Error al guardar configuración del algoritmo'
    );

    // Actualizar store local
    store.setState({ algorithmConfig: config });

    // Actualizar UI si es necesario
    updateAlgorithmDisplay(algorithmId);
  } catch (error) {
    console.error('Error guardando configuración:', error);
    throw error;
  }
}

/**
 * Carga la configuración actual del algoritmo
 * @returns {Promise<Object>} - Configuración del algoritmo
 */
export async function loadAlgorithmConfig() {
  try {
    const config = await apiWithFallback('/api/user/algorithm-config', {
      algorithm: 'ultra_sm2',
      parameters: ALGORITHM_CONFIGS.ultra_sm2.defaultParams,
      updated_at: new Date().toISOString(),
    });

    // Actualizar store
    store.setState({ algorithmConfig: config });

    // Actualizar UI
    updateAlgorithmDisplay(config.algorithm);

    return config;
  } catch (error) {
    console.error('Error cargando configuración del algoritmo:', error);
    return null;
  }
}

/**
 * Actualiza la visualización del algoritmo actual
 * @param {string} algorithmId - ID del algoritmo actual
 */
function updateAlgorithmDisplay(algorithmId) {
  const config = ALGORITHM_CONFIGS[algorithmId];
  if (!config) {
    return;
  }

  // Actualizar elementos de UI que muestran el algoritmo actual
  const algorithmDisplay = document.getElementById('current-algorithm');
  if (algorithmDisplay) {
    algorithmDisplay.textContent = config.name;
  }

  const algorithmDescription = document.getElementById('algorithm-description');
  if (algorithmDescription) {
    algorithmDescription.textContent = config.description;
  }
}

/**
 * Calcula el próximo intervalo usando el algoritmo configurado
 * @param {Object} cardData - Datos de la tarjeta
 * @param {number} quality - Calidad de la respuesta (0-5)
 * @returns {Promise<Object>} - Datos actualizados de la tarjeta
 */
export async function calculateNextInterval(cardData, quality) {
  try {
    const config =
      store.getState().algorithmConfig || (await loadAlgorithmConfig());

    const result = await performCrudOperation(
      () =>
        ApiClient.post('/api/study/calculate-interval', {
          card_data: cardData,
          quality: quality,
          algorithm: config.algorithm,
          parameters: config.parameters,
        }),
      null, // No mostrar notificación
      'Error al calcular intervalo'
    );

    return result;
  } catch (error) {
    console.error('Error calculando intervalo:', error);
    // Fallback a cálculo local simple
    return calculateSimpleInterval(cardData, quality);
  }
}

/**
 * Cálculo de intervalo simple como fallback
 * @param {Object} cardData - Datos de la tarjeta
 * @param {number} quality - Calidad de la respuesta
 * @returns {Object} - Datos actualizados
 */
function calculateSimpleInterval(cardData, quality) {
  const interval = cardData.interval || 1;
  const easeFactor = cardData.ease_factor || 2.5;

  let newInterval = interval;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    // Respuesta correcta
    if (cardData.repetitions === 0) {
      newInterval = 1;
    } else if (cardData.repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }

    newEaseFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // Respuesta incorrecta
    newInterval = 1;
    newEaseFactor = Math.max(1.3, easeFactor - 0.2);
  }

  return {
    ...cardData,
    interval: Math.max(1, newInterval),
    ease_factor: Math.max(1.3, newEaseFactor),
    repetitions: quality >= 3 ? (cardData.repetitions || 0) + 1 : 0,
    next_review: new Date(
      Date.now() + newInterval * 24 * 60 * 60 * 1000
    ).toISOString(),
  };
}

/**
 * Obtiene estadísticas del algoritmo actual
 * @returns {Promise<Object>} - Estadísticas del algoritmo
 */
export async function getAlgorithmStats() {
  try {
    const stats = await apiWithFallback('/api/dashboard/stats/performance', {
      total_reviews: 0,
      average_retention: 0,
      algorithm_efficiency: 0,
      optimal_intervals: [],
    });

    return stats;
  } catch (error) {
    console.error('Error obteniendo estadísticas del algoritmo:', error);
    return null;
  }
}

// Exponer funciones globalmente para compatibilidad
window.showAlgorithmModal = showAlgorithmModal;
window.closeAlgorithmModal = closeAlgorithmModal;
window.selectModalAlgorithm = selectModalAlgorithm;
window.confirmAlgorithmSelection = confirmAlgorithmSelection;



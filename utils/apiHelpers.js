/**
 * Utilidades para Manejo de API
 * Elimina duplicación en llamadas API con fallback
 */

import { api } from '../apiClient.js';
import { showNotification } from './helpers.js';

/**
 * Realiza una llamada API con fallback a datos locales
 * @param {string} endpoint - Endpoint de la API
 * @param {any} fallbackData - Datos de fallback si la API falla
 * @param {Object} options - Opciones adicionales para fetch
 * @param {boolean} showFallbackMessage - Mostrar mensaje cuando se usa fallback
 * @returns {Promise<any>} - Datos de la API o fallback
 */
export async function apiWithFallback(
  endpoint,
  fallbackData,
  options = {},
  showFallbackMessage = true
) {
  try {
    const data = await api(endpoint, options);

    // Si la API devuelve un error, usar fallback
    if (data && data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch {
    if (showFallbackMessage) {
      console.log(
        `API no disponible para ${endpoint}, usando datos de ejemplo`
      );
    }

    return fallbackData;
  }
}

/**
 * Realiza múltiples llamadas API en paralelo con fallback
 * @param {Array} apiCalls - Array de objetos {endpoint, fallback, options}
 * @returns {Promise<Array>} - Array con resultados de todas las llamadas
 */
export async function multipleApiWithFallback(apiCalls) {
  const promises = apiCalls.map(({ endpoint, fallback, options = {} }) =>
    apiWithFallback(endpoint, fallback, options, false)
  );

  try {
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error en llamadas múltiples de API:', error);
    return apiCalls.map((call) => call.fallback);
  }
}

/**
 * Wrapper para operaciones CRUD con manejo de errores estándar
 * @param {Function} operation - Función que realiza la operación
 * @param {string} successMessage - Mensaje de éxito
 * @param {string} errorMessage - Mensaje de error
 * @returns {Promise<any>} - Resultado de la operación
 */
export async function performCrudOperation(
  operation,
  successMessage,
  errorMessage
) {
  try {
    const result = await operation();

    if (result && !result.error) {
      if (successMessage) {
        showNotification(successMessage, 'success');
      }
      return result;
    } else {
      throw new Error(result?.error || 'Operación fallida');
    }
  } catch (error) {
    console.error('Error en operación CRUD:', error);
    showNotification(errorMessage || 'Error en la operación', 'error');
    throw error;
  }
}

/**
 * Carga datos con retry automático
 * @param {string} endpoint - Endpoint de la API
 * @param {any} fallbackData - Datos de fallback
 * @param {number} maxRetries - Número máximo de reintentos
 * @param {number} retryDelay - Delay entre reintentos en ms
 * @returns {Promise<any>} - Datos cargados
 */
export async function loadDataWithRetry(
  endpoint,
  fallbackData,
  maxRetries = 3,
  retryDelay = 1000
) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await api(endpoint);

      if (data && !data.error) {
        return data;
      }

      lastError = new Error(data?.error || 'API error');
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        console.log(
          `Intento ${attempt} fallido, reintentando en ${retryDelay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.log(
    `Todos los intentos fallaron, usando datos de fallback. Error: ${lastError.message}`
  );
  return fallbackData;
}

/**
 * Datos de fallback comunes para diferentes endpoints
 */
export const FALLBACK_DATA = {
  stats: {
    totalCards: 150,
    studiedToday: 25,
    accuracy: 78,
    streak: 5,
    totalCorrect: 120,
    totalIncorrect: 30,
    weeklyProgress: [12, 19, 15, 25, 22, 18, 30],
  },

  decks: [
    {
      id: 1,
      name: 'Vocabulario Inglés',
      card_count: 50,
      last_studied: '2024-01-15',
    },
    {
      id: 2,
      name: 'Matemáticas Básicas',
      card_count: 30,
      last_studied: '2024-01-14',
    },
    {
      id: 3,
      name: 'Historia Mundial',
      card_count: 75,
      last_studied: '2024-01-13',
    },
  ],

  flashcards: [
    { id: 1, front: 'Hello', back: 'Hola', deck_id: 1 },
    { id: 2, front: 'Goodbye', back: 'Adiós', deck_id: 1 },
    { id: 3, front: '2 + 2', back: '4', deck_id: 2 },
  ],

  user: {
    id: 1,
    email: 'demo@example.com',
    name: 'Usuario Demo',
    created_at: '2024-01-01',
  },
};

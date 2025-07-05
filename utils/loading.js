/**
 * Utilidades para Estados de Carga y Feedback Visual
 * Mejora la experiencia de usuario durante operaciones asíncronas
 */

import { showNotification } from './helpers.js';

/**
 * Muestra un indicador de carga en un botón
 * @param {string|HTMLElement} buttonSelector - Selector o elemento del botón
 * @param {string} loadingText - Texto a mostrar durante la carga
 * @returns {Function} - Función para restaurar el estado original
 */
export function showButtonLoading(buttonSelector, loadingText = 'Cargando...') {
  const button =
    typeof buttonSelector === 'string'
      ? document.querySelector(buttonSelector)
      : buttonSelector;

  if (!button) {
    return () => {};
  }

  // Guardar estado original
  const originalText = button.textContent;
  const originalDisabled = button.disabled;

  // Aplicar estado de carga
  button.textContent = `⏳ ${loadingText}`;
  button.disabled = true;
  button.style.opacity = '0.7';
  button.style.cursor = 'not-allowed';

  // Retornar función para restaurar
  return () => {
    button.textContent = originalText;
    button.disabled = originalDisabled;
    button.style.opacity = '';
    button.style.cursor = '';
  };
}

/**
 * Muestra un overlay de carga en un contenedor
 * @param {string|HTMLElement} containerSelector - Selector o elemento del contenedor
 * @param {string} message - Mensaje de carga
 * @returns {Function} - Función para ocultar el overlay
 */
export function showLoadingOverlay(containerSelector, message = 'Cargando...') {
  const container =
    typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;

  if (!container) {
    return () => {};
  }

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    border-radius: inherit;
  `;

  // Crear contenido del overlay
  overlay.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 0.75rem; 
                text-align: center; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);">
      <div style="width: 40px; height: 40px; border: 4px solid #f3f4f6; 
                  border-top: 4px solid #3b82f6; border-radius: 50%; 
                  animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
      <div style="color: #374151; font-weight: 500;">${message}</div>
    </div>
  `;

  // Agregar animación de spin
  if (!document.getElementById('loading-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Asegurar que el contenedor tenga position relative
  const originalPosition = container.style.position;
  if (!originalPosition || originalPosition === 'static') {
    container.style.position = 'relative';
  }

  container.appendChild(overlay);

  // Retornar función para ocultar
  return () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (!originalPosition || originalPosition === 'static') {
      container.style.position = originalPosition;
    }
  };
}

/**
 * Muestra feedback visual de validación en un campo
 * @param {string|HTMLElement} fieldSelector - Selector o elemento del campo
 * @param {boolean} isValid - Si el campo es válido
 * @param {string} message - Mensaje de feedback
 */
export function showFieldValidation(fieldSelector, isValid, message = '') {
  const field =
    typeof fieldSelector === 'string'
      ? document.querySelector(fieldSelector)
      : fieldSelector;

  if (!field) {
    return;
  }

  // Remover clases de validación anteriores
  field.classList.remove('field-valid', 'field-invalid');

  // Remover mensaje anterior si existe
  const existingMessage = field.parentNode.querySelector('.validation-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Agregar nueva clase de validación
  field.classList.add(isValid ? 'field-valid' : 'field-invalid');

  // Agregar estilos de validación si no existen
  if (!document.getElementById('validation-styles')) {
    const style = document.createElement('style');
    style.id = 'validation-styles';
    style.textContent = `
      .field-valid {
        border-color: #10b981 !important;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
      }
      .field-invalid {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
      }
      .validation-message {
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .validation-message.valid {
        color: #10b981;
      }
      .validation-message.invalid {
        color: #ef4444;
      }
    `;
    document.head.appendChild(style);
  }

  // Agregar mensaje si se proporciona
  if (message) {
    const messageElement = document.createElement('div');
    messageElement.className = `validation-message ${isValid ? 'valid' : 'invalid'}`;
    messageElement.innerHTML = `
      <span>${isValid ? '✓' : '✗'}</span>
      <span>${message}</span>
    `;

    field.parentNode.appendChild(messageElement);
  }
}

/**
 * Muestra un toast de progreso para operaciones largas
 * @param {string} message - Mensaje inicial
 * @param {number} steps - Número total de pasos
 * @returns {Object} - Objeto con métodos para actualizar el progreso
 */
export function showProgressToast(message, steps = 1) {
  const toast = document.createElement('div');
  toast.className = 'progress-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    min-width: 300px;
    max-width: 400px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  `;

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
      <div style="width: 20px; height: 20px; border: 2px solid #f3f4f6; 
                  border-top: 2px solid #3b82f6; border-radius: 50%; 
                  animation: spin 1s linear infinite;"></div>
      <div style="font-weight: 500; color: #374151;" class="progress-message">${message}</div>
    </div>
    <div style="background: #f3f4f6; height: 8px; border-radius: 4px; overflow: hidden;">
      <div class="progress-bar" style="background: linear-gradient(90deg, #3b82f6, #1d4ed8); 
                                     height: 100%; width: 0%; transition: width 0.3s ease;"></div>
    </div>
    <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;" class="progress-text">
      Paso 0 de ${steps}
    </div>
  `;

  document.body.appendChild(toast);

  return {
    updateProgress: (step, newMessage = null) => {
      const percentage = (step / steps) * 100;

      const progressBar = toast.querySelector('.progress-bar');
      const progressText = toast.querySelector('.progress-text');
      const messageElement = toast.querySelector('.progress-message');

      if (progressBar) {
        progressBar.style.width = `${percentage}%`;
      }
      if (progressText) {
        progressText.textContent = `Paso ${step} de ${steps}`;
      }
      if (newMessage && messageElement) {
        messageElement.textContent = newMessage;
      }
    },

    complete: (finalMessage = 'Completado') => {
      const progressBar = toast.querySelector('.progress-bar');
      const progressText = toast.querySelector('.progress-text');
      const messageElement = toast.querySelector('.progress-message');
      const spinner = toast.querySelector('[style*="animation"]');

      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.background =
          'linear-gradient(90deg, #10b981, #059669)';
      }
      if (progressText) {
        progressText.textContent = 'Completado';
      }
      if (messageElement) {
        messageElement.textContent = finalMessage;
      }
      if (spinner) {
        spinner.style.display = 'none';
      }

      // Auto-remove after 2 seconds
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }
      }, 2000);
    },

    error: (errorMessage = 'Error en la operación') => {
      const progressBar = toast.querySelector('.progress-bar');
      const progressText = toast.querySelector('.progress-text');
      const messageElement = toast.querySelector('.progress-message');
      const spinner = toast.querySelector('[style*="animation"]');

      if (progressBar) {
        progressBar.style.background =
          'linear-gradient(90deg, #ef4444, #dc2626)';
      }
      if (progressText) {
        progressText.textContent = 'Error';
      }
      if (messageElement) {
        messageElement.textContent = errorMessage;
      }
      if (spinner) {
        spinner.style.display = 'none';
      }

      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }
      }, 3000);
    },

    remove: () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    },
  };
}

/**
 * Wrapper para operaciones asíncronas con feedback visual automático
 * @param {Function} operation - Función asíncrona a ejecutar
 * @param {Object} options - Opciones de configuración
 * @returns {Promise} - Resultado de la operación
 */
export async function withLoadingFeedback(operation, options = {}) {
  const {
    buttonSelector = null,
    containerSelector = null,
    loadingText = 'Procesando...',
    successMessage = 'Operación completada',
    errorMessage = 'Error en la operación',
  } = options;

  let restoreButton = () => {};
  let hideOverlay = () => {};

  try {
    // Mostrar indicadores de carga
    if (buttonSelector) {
      restoreButton = showButtonLoading(buttonSelector, loadingText);
    }

    if (containerSelector) {
      hideOverlay = showLoadingOverlay(containerSelector, loadingText);
    }

    // Ejecutar operación
    const result = await operation();

    // Mostrar mensaje de éxito
    if (successMessage) {
      showNotification(successMessage, 'success');
    }

    return result;
  } catch (error) {
    // Mostrar mensaje de error
    const finalErrorMessage = error.message || errorMessage;
    showNotification(finalErrorMessage, 'error');
    throw error;
  } finally {
    // Restaurar estados
    restoreButton();
    hideOverlay();
  }
}

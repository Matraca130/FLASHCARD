/**
 * Utilidades Helper Comunes
 * Funciones de utilidad general para toda la aplicación
 */

/**
 * Función debounce para limitar la frecuencia de ejecución
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} - Función debounced
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Muestra una notificación temporal en la UI con iconos y mejor UX
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación (success, error, warning, info)
 * @param {number} duration - Duración en ms (default: 4000)
 * @param {Object} options - Opciones adicionales
 */
export function showNotification(
  message,
  type = 'info',
  duration = 4000,
  options = {}
) {
  const {
    title = null,
    persistent = false,
    actionText = null,
    actionCallback = null,
  } = options;

  // Iconos para cada tipo de notificación
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    z-index: 10000;
    padding: 1rem 1.5rem;
    border-radius: 0.75rem;
    color: white;
    font-weight: 500;
    max-width: 350px;
    min-width: 280px;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;

  // Set background color based on type
  switch (type) {
    case 'success':
      notification.style.background =
        'linear-gradient(135deg, #10b981, #059669)';
      break;
    case 'error':
      notification.style.background =
        'linear-gradient(135deg, #ef4444, #dc2626)';
      break;
    case 'warning':
      notification.style.background =
        'linear-gradient(135deg, #f59e0b, #d97706)';
      break;
    default:
      notification.style.background =
        'linear-gradient(135deg, #3b82f6, #2563eb)';
  }

  // Construir contenido de la notificación
  let content = `
    <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
      <span style="font-size: 1.25rem; flex-shrink: 0;">${icons[type]}</span>
      <div style="flex: 1;">
  `;

  if (title) {
    content += `<div style="font-weight: 600; margin-bottom: 0.25rem;">${title}</div>`;
  }

  content += `<div style="font-size: 0.9rem; line-height: 1.4;">${message}</div>`;

  if (actionText && actionCallback) {
    content += `
      <button onclick="(${actionCallback.toString()})()" 
              style="margin-top: 0.5rem; background: rgba(255,255,255,0.2); 
                     border: 1px solid rgba(255,255,255,0.3); color: white; 
                     padding: 0.25rem 0.75rem; border-radius: 0.375rem; 
                     font-size: 0.8rem; cursor: pointer;">
        ${actionText}
      </button>
    `;
  }

  content += `
      </div>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: rgba(255,255,255,0.7); 
                     font-size: 1.2rem; cursor: pointer; padding: 0; margin-left: 0.5rem;">
        ×
      </button>
    </div>
  `;

  notification.innerHTML = content;
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Auto remove (unless persistent)
  if (!persistent) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
  }
}

/**
 * Formatea una fecha para mostrar en la UI
 * @param {string|Date} date - Fecha a formatear
 * @param {string} locale - Locale para el formato (default: 'es-ES')
 * @returns {string} - Fecha formateada
 */
export function formatDate(date, locale = 'es-ES') {
  if (!date) {
    return 'N/A';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }

  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formatea una fecha relativa (ej: "hace 2 días")
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha relativa formateada
 */
export function formatRelativeDate(date) {
  if (!date) {
    return 'N/A';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - dateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Hoy';
  }
  if (diffDays === 1) {
    return 'Ayer';
  }
  if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  }
  if (diffDays < 30) {
    return `Hace ${Math.floor(diffDays / 7)} semanas`;
  }
  if (diffDays < 365) {
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  }

  return `Hace ${Math.floor(diffDays / 365)} años`;
}

/**
 * Capitaliza la primera letra de una cadena
 * @param {string} str - Cadena a capitalizar
 * @returns {string} - Cadena capitalizada
 */
export function capitalize(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitaliza solo la primera letra de un string (alias para capitalize)
 * @param {string} str - String a capitalizar
 * @returns {string} - String con primera letra capitalizada
 */
export function capitalizeFirst(str) {
  return capitalize(str);
}

/**
 * Trunca un texto a una longitud específica
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @param {string} suffix - Sufijo a agregar (default: '...')
 * @returns {string} - Texto truncado
 */
export function truncateText(text, maxLength, suffix = '...') {
  if (!text || typeof text !== 'string') {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Genera un ID único simple
 * @returns {string} - ID único
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} - true si se copió exitosamente
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification('Copiado al portapapeles', 'success');
    return true;
  } catch (error) {
    console.error('Error al copiar:', error);
    showNotification('Error al copiar al portapapeles', 'error');
    return false;
  }
}

/**
 * Valida si un elemento DOM existe y es visible
 * @param {string} selector - Selector CSS del elemento
 * @returns {HTMLElement|null} - Elemento si existe y es visible, null en caso contrario
 */
export function getVisibleElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    return null;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return null;
  }

  return element;
}

/**
 * Limpia un formulario estableciendo valores vacíos
 * @param {string|HTMLFormElement} formSelector - Selector del formulario o elemento del formulario
 */
export function clearForm(formSelector) {
  const form =
    typeof formSelector === 'string'
      ? document.querySelector(formSelector)
      : formSelector;

  if (!form) {
    return;
  }

  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = false;
    } else {
      input.value = '';
    }
  });
}

/**
 * Renderiza un estado vacío en un contenedor
 * @param {HTMLElement|string} container - Elemento contenedor o selector CSS
 * @param {Object} options - Opciones de configuración
 * @param {string} options.message - Mensaje a mostrar
 * @param {string} options.actionText - Texto del botón de acción (opcional)
 * @param {string} options.actionTarget - Sección a mostrar al hacer click (opcional)
 * @param {Function} options.actionCallback - Función a ejecutar al hacer click (opcional)
 * @param {string} options.icon - Icono a mostrar (opcional)
 * @param {string} options.className - Clase CSS adicional (opcional)
 */
export function renderEmptyState(container, options = {}) {
  const {
    message = 'No hay elementos disponibles',
    actionText = null,
    actionTarget = null,
    actionCallback = null,
    icon = null,
    className = '',
  } = options;

  // Obtener elemento contenedor
  const element =
    typeof container === 'string'
      ? document.querySelector(container)
      : container;

  if (!element) {
    console.warn('Contenedor no encontrado para renderizar estado vacío');
    return;
  }

  // Construir HTML del estado vacío
  let html = `<div class="empty-state ${className}">`;

  // Agregar icono si se especifica
  if (icon) {
    html += `<div class="empty-state-icon">${icon}</div>`;
  }

  // Agregar mensaje
  html += `<p class="text-muted empty-state-message">${message}</p>`;

  // Agregar botón de acción si se especifica
  if (actionText) {
    if (actionTarget) {
      // Acción de navegación
      html += `
        <button onclick="window.showSection('${actionTarget}')" class="btn btn-primary empty-state-action">
          ${actionText}
        </button>
      `;
    } else if (actionCallback) {
      // Acción personalizada
      const callbackName = `emptyStateAction_${Date.now()}`;
      window[callbackName] = actionCallback;
      html += `
        <button onclick="window.${callbackName}()" class="btn btn-primary empty-state-action">
          ${actionText}
        </button>
      `;
    }
  }

  html += '</div>';

  // Insertar HTML en el contenedor
  element.innerHTML = html;
}

/**
 * Renderiza estado vacío específico para decks
 * @param {HTMLElement|string} container - Elemento contenedor o selector CSS
 * @param {Object} options - Opciones adicionales
 */
export function renderEmptyDecksState(container, options = {}) {
  const defaultOptions = {
    message: 'No tienes decks creados',
    actionText: 'Crear tu primer deck',
    actionTarget: 'crear',
    icon: '📚',
    className: 'empty-decks-state',
  };

  const finalOptions = { ...defaultOptions, ...options };
  renderEmptyState(container, finalOptions);
}

/**
 * Renderiza estado vacío específico para flashcards
 * @param {HTMLElement|string} container - Elemento contenedor o selector CSS
 * @param {Object} options - Opciones adicionales
 */
export function renderEmptyFlashcardsState(container, options = {}) {
  const defaultOptions = {
    message: 'No hay flashcards en este deck',
    actionText: 'Agregar flashcards',
    actionTarget: 'crear',
    icon: '🃏',
    className: 'empty-flashcards-state',
  };

  const finalOptions = { ...defaultOptions, ...options };
  renderEmptyState(container, finalOptions);
}

/**
 * Renderiza estado vacío específico para resultados de búsqueda
 * @param {HTMLElement|string} container - Elemento contenedor o selector CSS
 * @param {string} searchTerm - Término de búsqueda
 * @param {Object} options - Opciones adicionales
 */
export function renderEmptySearchState(
  container,
  searchTerm = '',
  options = {}
) {
  const defaultOptions = {
    message: searchTerm
      ? `No se encontraron resultados para "${searchTerm}"`
      : 'No se encontraron resultados',
    icon: '🔍',
    className: 'empty-search-state',
  };

  const finalOptions = { ...defaultOptions, ...options };
  renderEmptyState(container, finalOptions);
}

/**
 * Renderiza estado vacío específico para estadísticas
 * @param {HTMLElement|string} container - Elemento contenedor o selector CSS
 * @param {Object} options - Opciones adicionales
 */
export function renderEmptyStatsState(container, options = {}) {
  const defaultOptions = {
    message: 'No hay datos de estadísticas disponibles',
    actionText: 'Comenzar a estudiar',
    actionTarget: 'estudiar',
    icon: '📊',
    className: 'empty-stats-state',
  };

  const finalOptions = { ...defaultOptions, ...options };
  renderEmptyState(container, finalOptions);
}

/**
 * Descarga un archivo con el contenido especificado
 * @param {string} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo (default: 'text/plain')
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Capitaliza la primera letra de cada palabra en una cadena
 * @param {string} str - Cadena a capitalizar
 * @returns {string} - Cadena capitalizada
 */
export function capitalizeWords(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Sanitiza un nombre de archivo
 * @param {string} filename - Nombre original
 * @returns {string} - Nombre de archivo sanitizado
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'archivo';
  }

  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Parsea contenido CSV simple
 * @param {string} csvContent - Contenido CSV
 * @param {string} delimiter - Delimitador (default: ',')
 * @returns {Array<Array<string>>} - Array de filas parseadas
 */
export function parseCSV(csvContent, delimiter = ',') {
  if (!csvContent || typeof csvContent !== 'string') {
    return [];
  }

  const lines = csvContent.trim().split('\n');
  return lines.map((line) =>
    line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''))
  );
}

/**
 * Formatea el tamaño de un archivo en bytes a formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Valida si un email tiene formato válido
 * @param {string} email - Email a validar
 * @returns {boolean} - true si es válido
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida si una contraseña cumple los requisitos mínimos
 * @param {string} password - Contraseña a validar
 * @returns {boolean} - true si es válida
 */
export function isValidPassword(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // Mínimo 6 caracteres
  return password.length >= 6;
}


/**
 * FUNCIONES ESPECÍFICAS DE ESTE ARCHIVO (Migradas de backup_js/helpers.js)
 * =======================================================================
 */

/**
 * Inicializa partículas con configuración mejorada
 */
export function initializeParticles(config = {}) {
  const defaultConfig = {
    particles: {
      number: { value: 50, density: { enable: true, value_area: 800 } },
      color: { value: '#ffffff' },
      shape: { type: 'circle' },
      opacity: { value: 0.1, random: true },
      size: { value: 3, random: true },
      line_linked: {
        enable: true,
        distance: 150,
        color: '#ffffff',
        opacity: 0.1,
        width: 1,
      },
      move: {
        enable: true,
        speed: 1,
        direction: 'none',
        random: false,
        straight: false,
        out_mode: 'out',
        bounce: false,
      },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: true, mode: 'repulse' },
        onclick: { enable: true, mode: 'push' },
        resize: true,
      },
      modes: {
        grab: { distance: 400, line_linked: { opacity: 1 } },
        bubble: { distance: 400, size: 40, duration: 2, opacity: 8, speed: 3 },
        repulse: { distance: 200, duration: 0.4 },
        push: { particles_nb: 4 },
        remove: { particles_nb: 2 },
      },
    },
    retina_detect: true,
  };


  if (typeof particlesJS !== 'undefined') {
    try {
      particlesJS('particles-js', finalConfig);
      console.error('❌ Error inicializando partículas:', error);
      return false;
    }
  } else {
    console.log('⚠️ particlesJS no disponible');

/**
 * Inicialización automática de partículas con detección inteligente
 */
export function autoInitParticles() {
  const container = document.getElementById('particles-js');

  if (!container) {
    console.log('📄 Contenedor de partículas no encontrado');
    return false;
  const isLowPerformance =
    navigator.hardwareConcurrency < 4 ||
    navigator.deviceMemory < 4 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    );

  // Configuración adaptativa según el rendimiento
  const adaptiveConfig = isLowPerformance
    ? {
        particles: {
          number: { value: 25 },
          line_linked: { enable: false },
          move: { speed: 0.5 },
        },
        interactivity: {
          events: {
            onhover: { enable: false },
            onclick: { enable: false },
          },
        },
      }
    : {};

  return initializeParticles(adaptiveConfig);
}

/**
 * Función de compatibilidad para mostrar secciones
 * (delegada al sistema de navegación)
 */
export function showSection(sectionId, options = {}) {
  // Verificar si el sistema de navegación está disponible
  if (window.showSection && typeof window.showSection === 'function') {
    return window.showSection(sectionId, options);
  // Fallback básico si el sistema de navegación no está disponible
    '⚠️ Sistema de navegación no disponible, usando fallback básico'
  );

  if (section) {
    // Ocultar todas las secciones
    document.querySelectorAll('[data-section], .section').forEach((s) => {
      s.style.display = 'none';
      s.classList.remove('active');
    });

    // Mostrar la sección solicitada
    section.style.display = 'block';
    section.classList.add('active');

    showNotification(`Sección ${sectionId} mostrada`, 'info', 2000);
    return true;
  }

  showNotification(`Sección ${sectionId} no encontrada`, 'error', 3000);
  return false;
}

/**
 * Función de utilidad para manejar errores globales
 */
export function handleGlobalError(error, context = 'Unknown') {
  console.error(`[${context}] Error global:`, error);

  // Mostrar notificación al usuario
  showNotification(
    `Error en ${context}: ${error.message || 'Error desconocido'}`,
    'error',
    5000
  );

  // Enviar error a servicio de logging si está disponible
  if (window.logError && typeof window.logError === 'function') {
    window.logError(error, context);
  }
}
 * Función de utilidad para verificar conectividad
export async function checkConnectivity() {
  try {
    const response = await fetch('/health', {
      method: 'HEAD',
      cache: 'no-cache',
      timeout: 5000,
    });
    return response.ok;
  } catch {
    console.log('🔌 Sin conectividad con el servidor');
    return false;
  }
}

/**
export function getDeviceInfo() {
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
    isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
    isDesktop: !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
    hasTouch: 'ontouchstart' in window,
    cores: navigator.hardwareConcurrency || 1,
    memory: navigator.deviceMemory || 1,
    connection: navigator.connection?.effectiveType || 'unknown',
    online: navigator.onLine,
  };
}

/**
 * Función para generar un slug a partir de un texto
 * @param {string} text - Texto de entrada
 * @returns {string} - Slug generado
 */
export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * COMPATIBILIDAD GLOBAL (Migradas de backup_js/helpers.js)
 * ========================================================
 */

// Exponer funciones globalmente para compatibilidad con código legacy
window.debounce = debounce;
window.showNotification = showNotification;
window.initializeParticles = initializeParticles;
window.showSection = showSection;
window.handleGlobalError = handleGlobalError;
window.checkConnectivity = checkConnectivity;
// Exponer utilidades comunes
window.copyToClipboard = copyToClipboard;
window.validateRequiredFields = validateRequiredFields;
window.apiWithFallback = apiWithFallback;

/**
 * INICIALIZACIÓN AUTOMÁTICA (Migradas de backup_js/helpers.js)
 * ===========================================================
 */

// Auto-inicializar partículas cuando el DOM esté listo
const tryInitParticles = () => {
  if (document.getElementById('particles-js')) {
    autoInitParticles();
  }
};

if (document.readyState !== 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitParticles);

// Configurar manejo de errores globales
window.addEventListener('error', (event) => {
  handleGlobalError(event.error, 'JavaScript');
});

window.addEventListener('unhandledrejection', (event) => {
  handleGlobalError(event.reason, 'Promise');
});

// Monitorear cambios de conectividad
window.addEventListener('online', () => {
  showNotification('Conexión restaurada', 'success', 3000);
});

window.addEventListener('offline', () => {
  showNotification('Sin conexión a internet', 'warning', 5000);
});

console.log(
  '🔧 Helpers refactorizados inicializados - Compatibilidad total mantenida'
);



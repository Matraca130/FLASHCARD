/**
 * HELPERS - REFACTORIZADO
 * =======================
 *
 * Archivo de compatibilidad que re-exporta las utilidades comunes
 * para mantener compatibilidad con código legacy mientras elimina duplicación
 */

// Importar todas las utilidades refactorizadas
import {
  showNotification,
  debounce,
  formatDate,
  formatRelativeDate,
  copyToClipboard,
  clearForm,
  generateId,
  sanitizeFilename,
  parseCSV,
  formatFileSize,
  downloadFile,
  isValidEmail,
  isValidPassword,
  truncateText,
  capitalizeFirst,
  slugify,
} from './utils/helpers.js';

import {
  validateRequiredFields,
  validateLoginCredentials,
  validateFlashcardData,
  validateDeckData,
  validateEmail,
  validatePassword,
} from './utils/validation.js';

import {
  apiWithFallback,
  multipleApiWithFallback,
  performCrudOperation,
  loadDataWithRetry,
} from './utils/apiHelpers.js';

/**
 * FUNCIONES ESPECÍFICAS DE ESTE ARCHIVO
 * =====================================
 */

/**
 * Inicializa partículas con configuración mejorada
 */
function initializeParticles(config = {}) {
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

  // Combinar configuración por defecto con la personalizada
  const finalConfig = { ...defaultConfig, ...config };

  if (typeof particlesJS !== 'undefined') {
    try {
      particlesJS('particles-js', finalConfig);
      console.log('✅ Partículas inicializadas exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando partículas:', error);
      return false;
    }
  } else {
    console.log('⚠️ particlesJS no disponible');
    return false;
  }
}

/**
 * Inicialización automática de partículas con detección inteligente
 */
function autoInitParticles() {
  const container = document.getElementById('particles-js');

  if (!container) {
    console.log('📄 Contenedor de partículas no encontrado');
    return false;
  }

  // Detectar si el dispositivo es de bajo rendimiento
  const isLowPerformance =
    navigator.hardwareConcurrency < 4 ||
    navigator.deviceMemory < 4 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
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
function showSection(sectionId, options = {}) {
  // Verificar si el sistema de navegación está disponible
  if (window.showSection && typeof window.showSection === 'function') {
    return window.showSection(sectionId, options);
  }

  // Fallback básico si el sistema de navegación no está disponible
  console.warn(
    '⚠️ Sistema de navegación no disponible, usando fallback básico'
  );

  const section = document.querySelector(
    `[data-section="${sectionId}"], #${sectionId}`
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
function handleGlobalError(error, context = 'Unknown') {
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

/**
 * Función de utilidad para verificar conectividad
 */
async function checkConnectivity() {
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
 * Función de utilidad para detectar características del dispositivo
 */
function getDeviceInfo() {
  return {
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
 * EXPORTACIONES
 * =============
 */

// Exportar funciones específicas de este archivo
export {
  initializeParticles,
  autoInitParticles,
  showSection,
  handleGlobalError,
  checkConnectivity,
  getDeviceInfo,
};

// Re-exportar todas las utilidades comunes para compatibilidad
export {
  // Utilidades generales
  showNotification,
  debounce,
  formatDate,
  formatRelativeDate,
  copyToClipboard,
  clearForm,
  generateId,
  sanitizeFilename,
  parseCSV,
  formatFileSize,
  isValidEmail,
  isValidPassword,
  truncateText,
  capitalizeFirst,
  slugify,

  // Validaciones
  validateRequiredFields,
  validateLoginCredentials,
  validateFlashcardData,
  validateDeckData,
  validateEmail,
  validatePassword,

  // API helpers
  apiWithFallback,
  multipleApiWithFallback,
  performCrudOperation,
  loadDataWithRetry,
};

/**
 * COMPATIBILIDAD GLOBAL
 * =====================
 */

// Exponer funciones globalmente para compatibilidad con código legacy
window.debounce = debounce;
window.showNotification = showNotification;
window.initializeParticles = initializeParticles;
window.showSection = showSection;
window.handleGlobalError = handleGlobalError;
window.checkConnectivity = checkConnectivity;
window.getDeviceInfo = getDeviceInfo;

// Exponer utilidades comunes
window.formatDate = formatDate;
window.copyToClipboard = copyToClipboard;
window.validateRequiredFields = validateRequiredFields;
window.apiWithFallback = apiWithFallback;

/**
 * INICIALIZACIÓN AUTOMÁTICA
 * =========================
 */

// Auto-inicializar partículas cuando el DOM esté listo
const tryInitParticles = () => {
  if (document.getElementById('particles-js')) {
    autoInitParticles();
  }
};

if (document.readyState !== 'loading') {
  tryInitParticles();
} else {
  document.addEventListener('DOMContentLoaded', tryInitParticles);
}

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

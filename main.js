/**
 * main.js - Punto de entrada principal refactorizado
 * Gestiona la inicialización de la aplicación StudyingFlash
 */

import './router.js';
import './core-navigation.js';
import './bindings.js';

// Importar servicios refactorizados
import { loadGamificationData } from './gamification.service.js';

import { initializeCharts } from './charts.js';

// Importar utilidades comunes
import { showNotification } from './utils/helpers.js';
import { ApiClient } from './apiClient.js';

// Configuración de la aplicación
const APP_CONFIG = {
  name: 'StudyingFlash',
  version: '2.0.0',
  environment:
    window.location.hostname === 'localhost' ? 'development' : 'production',
  features: {
    serviceWorker: true,
    analytics: false,
    debugging: window.location.hostname === 'localhost',
    offlineMode: true,
  },
  initialization: {
    chartsDelay: 100,
    particlesDelay: 50,
    servicesDelay: 0,
  },
};

// Estado de la aplicación
let appState = {
  initialized: false,
  services: new Map(),
  errors: [],
  startTime: Date.now(),
};

/**
 * Inicialización principal de la aplicación
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log(
      `🚀 Inicializando ${APP_CONFIG.name} v${APP_CONFIG.version}...`
    );

    // Mostrar información de depuración si está habilitada
    if (APP_CONFIG.features.debugging) {
      console.log('🔧 Modo desarrollo activado');
      console.log('📊 Configuración:', APP_CONFIG);
    }

    // Verificar conectividad inicial
    await checkInitialConnectivity();

    // Inicializar servicios en orden de prioridad
    await initializeServices();

    // Inicializar componentes visuales
    await initializeVisualComponents();

    // Configurar PWA si está habilitado
    if (APP_CONFIG.features.serviceWorker) {
      await initializeServiceWorker();
    }

    // Configurar manejo de errores globales
    setupGlobalErrorHandling();

    // Configurar eventos de conectividad
    setupConnectivityHandling();

    // Marcar como inicializado
    appState.initialized = true;
    const initTime = Date.now() - appState.startTime;

    console.log(
      `✅ ${APP_CONFIG.name} inicializado exitosamente en ${initTime}ms`
    );

    // Notificar al usuario si hay errores no críticos
    if (appState.errors.length > 0) {
      console.warn(
        '⚠️ Errores no críticos durante la inicialización:',
        appState.errors
      );
    }

    // Mostrar notificación de bienvenida
    showWelcomeNotification();
  } catch (error) {
    console.error('❌ Error crítico durante la inicialización:', error);
    showCriticalErrorFallback(error);
  }
});

/**
 * Verifica la conectividad inicial con la API
 */
async function checkInitialConnectivity() {
  try {
    console.log('🔍 Verificando conectividad con la API...');

    const isConnected = await ApiClient.checkConnection();

    if (isConnected) {
      console.log('✅ Conectividad con API confirmada');

      // Obtener información de la API
      const apiInfo = await ApiClient.getApiInfo();
      if (!apiInfo.error) {
        console.log('📡 API Info:', apiInfo.data);
      }
    } else {
      console.warn('⚠️ API no disponible, usando modo offline');

      if (APP_CONFIG.features.offlineMode) {
        showNotification('Modo offline activado', 'info', 3000);
      }
    }
  } catch (error) {
    console.warn('⚠️ Error verificando conectividad:', error);
    appState.errors.push({ type: 'connectivity', error: error.message });
  }
}

/**
 * Inicializa todos los servicios de la aplicación
 */
async function initializeServices() {
  console.log('🔧 Inicializando servicios...');

  const services = [
    { name: 'gamification', init: loadGamificationData, critical: false },
    // { name: 'algorithms', init: initializeAlgorithmModal, critical: false },
    // { name: 'flashcards', init: initializeFlashcardEvents, critical: true },
    // { name: 'importExport', init: initializeImportExportEvents, critical: false },
    // { name: 'create', init: initializeCreateEvents, critical: true },
    // { name: 'activityHeatmap', init: initializeActivityHeatmap, critical: false }
  ];

  for (const service of services) {
    try {
      console.log(`  🔧 Inicializando ${service.name}...`);

      await new Promise((resolve) => {
        setTimeout(async () => {
          await service.init();
          appState.services.set(service.name, {
            status: 'initialized',
            timestamp: Date.now(),
          });
          resolve();
        }, APP_CONFIG.initialization.servicesDelay);
      });

      console.log(`  ✅ ${service.name} inicializado`);
    } catch (error) {
      console.error(`  ❌ Error inicializando ${service.name}:`, error);

      appState.services.set(service.name, {
        status: 'error',
        error: error.message,
        timestamp: Date.now(),
      });
      appState.errors.push({
        type: 'service',
        service: service.name,
        error: error.message,
      });

      // Si es un servicio crítico, mostrar notificación
      if (service.critical) {
        showNotification(`Error en servicio ${service.name}`, 'error', 5000);
      }
    }
  }

  console.log('✅ Servicios inicializados');
}

/**
 * Inicializa componentes visuales
 */
async function initializeVisualComponents() {
  console.log('🎨 Inicializando componentes visuales...');

  try {
    // Inicializar partículas con delay
    setTimeout(() => {
      console.log('  ✅ Partículas inicializadas');
    }, APP_CONFIG.initialization.particlesDelay);

    // Inicializar gráficos con delay mayor para asegurar DOM listo
    setTimeout(async () => {
      try {
        const chartsInitialized = await initializeCharts({
          theme: 'auto',
          fallbackEnabled: true,
        });

        if (chartsInitialized) {
          console.log('  ✅ Gráficos inicializados');
        } else {
          console.log('  ⚠️ Gráficos en modo fallback');
        }
      } catch (error) {
        console.error('  ❌ Error inicializando gráficos:', error);
        appState.errors.push({ type: 'charts', error: error.message });
      }
    }, APP_CONFIG.initialization.chartsDelay);

    console.log('✅ Componentes visuales programados');
  } catch (error) {
    console.error('❌ Error inicializando componentes visuales:', error);
    appState.errors.push({ type: 'visual', error: error.message });
  }
}

/**
 * Inicializa el Service Worker para PWA
 */
async function initializeServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('⚠️ Service Worker no soportado');
    return;
  }

  try {
    console.log('📱 Registrando Service Worker...');

    const registration = await navigator.serviceWorker.register('./sw.js');

    console.log('✅ Service Worker registrado:', registration);

    // Escuchar actualizaciones
    registration.addEventListener('updatefound', () => {
      console.log('🔄 Nueva versión de la aplicación disponible');
      showNotification(
        'Nueva versión disponible. Recarga la página para actualizar.',
        'info',
        10000
      );
    });
  } catch (error) {
    console.error('❌ Error registrando Service Worker:', error);
    appState.errors.push({ type: 'serviceWorker', error: error.message });
  }
}

/**
 * Configura el manejo de errores globales
 */
function setupGlobalErrorHandling() {
  // Errores JavaScript no capturados
  window.addEventListener('error', (event) => {
    console.error('❌ Error global capturado:', event.error);

    appState.errors.push({
      type: 'javascript',
      error: event.error?.message || 'Error desconocido',
      filename: event.filename,
      lineno: event.lineno,
      timestamp: Date.now(),
    });

    // No mostrar notificación para errores menores
    if (!event.error?.message?.includes('Script error')) {
      showNotification('Se produjo un error inesperado', 'error', 3000);
    }
  });

  // Promesas rechazadas no capturadas
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no capturada:', event.reason);

    appState.errors.push({
      type: 'promise',
      error: event.reason?.message || 'Promesa rechazada',
      timestamp: Date.now(),
    });

    // Prevenir que aparezca en la consola del navegador
    event.preventDefault();
  });

  console.log('🛡️ Manejo de errores globales configurado');
}

/**
 * Configura el manejo de eventos de conectividad
 */
function setupConnectivityHandling() {
  // Detectar cambios en la conectividad
  window.addEventListener('online', () => {
    console.log('🌐 Conectividad restaurada');
    showNotification('Conexión restaurada', 'success', 3000);
  });

  window.addEventListener('offline', () => {
    console.log('📴 Conectividad perdida');

    if (APP_CONFIG.features.offlineMode) {
      showNotification('Modo offline activado', 'warning', 5000);
    } else {
      showNotification('Sin conexión a internet', 'error', 5000);
    }
  });

  console.log('📡 Manejo de conectividad configurado');
}

/**
 * Muestra notificación de bienvenida
 */
function showWelcomeNotification() {
  const hour = new Date().getHours();
  let greeting = 'Buenos días';

  if (hour >= 12 && hour < 18) {
    greeting = 'Buenas tardes';
  } else if (hour >= 18) {
    greeting = 'Buenas noches';
  }

  const message = `${greeting}! Bienvenido a ${APP_CONFIG.name}`;
  showNotification(message, 'success', 4000);
}

/**
 * Muestra interfaz de error crítico
 */
function showCriticalErrorFallback(error) {
  const errorContainer = document.createElement('div');
  errorContainer.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: 'Inter', sans-serif;
      color: white;
    ">
      <div style="
        text-align: center;
        max-width: 500px;
        padding: 40px;
        background: rgba(255,255,255,0.1);
        border-radius: 20px;
        backdrop-filter: blur(10px);
      ">
        <h1 style="font-size: 2.5em; margin-bottom: 20px;">⚠️</h1>
        <h2 style="margin-bottom: 20px;">Error de Inicialización</h2>
        <p style="margin-bottom: 30px; opacity: 0.9;">
          ${APP_CONFIG.name} no pudo inicializarse correctamente.
        </p>
        <button onclick="window.location.reload()" style="
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
           onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          Recargar Aplicación
        </button>
        <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
          Error: ${error.message}
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(errorContainer);
}

/**
 * Obtiene información del estado de la aplicación
 */
export function getAppState() {
  return {
    ...appState,
    config: APP_CONFIG,
    uptime: Date.now() - appState.startTime,
    servicesStatus: Object.fromEntries(appState.services),
  };
}

/**
 * Reinicia la aplicación
 */
export function restartApp() {
  console.log('🔄 Reiniciando aplicación...');

  // Limpiar estado
  appState = {
    initialized: false,
    services: new Map(),
    errors: [],
    startTime: Date.now(),
  };

  // Recargar página
  window.location.reload();
}

/**
 * Activa/desactiva el modo de depuración
 */
export function toggleDebugMode(enabled = null) {
  if (enabled === null) {
    APP_CONFIG.features.debugging = !APP_CONFIG.features.debugging;
  } else {
    APP_CONFIG.features.debugging = enabled;
  }

  console.log(
    `🔧 Modo depuración: ${APP_CONFIG.features.debugging ? 'activado' : 'desactivado'}`
  );

  if (APP_CONFIG.features.debugging) {
    console.log('📊 Estado actual:', getAppState());
  }
}

// Exponer funciones globalmente para depuración
if (APP_CONFIG.features.debugging) {
  window.StudyingFlash = {
    getAppState,
    restartApp,
    toggleDebugMode,
    config: APP_CONFIG,
  };
}

// Exponer configuración globalmente
window.APP_CONFIG = APP_CONFIG;

/**
 * router.js - Sistema de enrutamiento refactorizado
 * Maneja navegación SPA con hash routing y validación
 */

import { showSection } from './core-navigation.js';
import { showNotification } from './utils/helpers.js';

// Configuración del router
const ROUTER_CONFIG = {
  defaultRoute: 'inicio',
  validRoutes: [
    'inicio',
    'estudiar', 
    'crear',
    'gestionar',
    'ranking',
    'configuracion',
    'perfil',
    'estadisticas',
    'ayuda'
  ],
  protectedRoutes: [
    'perfil',
    'estadisticas',
    'configuracion'
  ],
  routeAliases: {
    'home': 'inicio',
    'study': 'estudiar',
    'create': 'crear',
    'manage': 'gestionar',
    'leaderboard': 'ranking',
    'settings': 'configuracion',
    'profile': 'perfil',
    'stats': 'estadisticas',
    'help': 'ayuda'
  },
  animations: {
    enabled: true,
    duration: 300,
    easing: 'ease-in-out'
  }
};

// Estado del router
let routerState = {
  currentRoute: null,
  previousRoute: null,
  history: [],
  isNavigating: false,
  authRequired: false
};

/**
 * Navega a una sección específica
 * @param {string} section - Sección de destino
 * @param {Object} options - Opciones de navegación
 * @returns {boolean} - Éxito de la navegación
 */
export function navigate(section, options = {}) {
  const {
    replace = false,
    silent = false,
    force = false,
    data = null
  } = options;

  try {
    // Normalizar sección
    const normalizedSection = normalizeRoute(section);
    
    // Validar ruta
    if (!isValidRoute(normalizedSection) && !force) {
      console.warn(`⚠️ Ruta inválida: ${section}`);
      
      if (!silent) {
        showNotification(`Página "${section}" no encontrada`, 'error', 3000);
      }
      
      return false;
    }

    // Verificar si ya estamos en esa ruta
    if (routerState.currentRoute === normalizedSection && !force) {
      console.log(`📍 Ya estás en la sección: ${normalizedSection}`);
      return true;
    }

    // Verificar autenticación si es necesario
    if (isProtectedRoute(normalizedSection) && !isAuthenticated()) {
      console.warn(`🔒 Ruta protegida: ${normalizedSection}`);
      
      if (!silent) {
        showNotification('Debes iniciar sesión para acceder a esta página', 'warning', 4000);
      }
      
      // Redirigir al login o inicio
      navigate('inicio', { replace: true, silent: true });
      return false;
    }

    // Prevenir navegación múltiple simultánea
    if (routerState.isNavigating && !force) {
      console.log('🔄 Navegación en progreso, ignorando...');
      return false;
    }

    // Actualizar estado
    routerState.isNavigating = true;
    routerState.previousRoute = routerState.currentRoute;
    routerState.currentRoute = normalizedSection;

    // Actualizar historial
    updateHistory(normalizedSection, data);

    // Actualizar URL si es necesario
    if (window.location.hash.replace('#', '') !== normalizedSection) {
      if (replace) {
        window.location.replace(`#${normalizedSection}`);
      } else {
        window.location.hash = normalizedSection;
      }
    }

    // Ejecutar navegación
    executeNavigation(normalizedSection, data);

    // Log de navegación
    console.log(`🧭 Navegando: ${routerState.previousRoute || 'inicio'} → ${normalizedSection}`);

    return true;

  } catch (error) {
    console.error('❌ Error durante la navegación:', error);
    
    if (!silent) {
      showNotification('Error de navegación', 'error', 3000);
    }
    
    routerState.isNavigating = false;
    return false;
  }
}

/**
 * Ejecuta la navegación real
 * @param {string} section - Sección de destino
 * @param {*} data - Datos adicionales
 */
function executeNavigation(section, data = null) {
  try {
    // Llamar al sistema de navegación
    showSection(section, {
      previousSection: routerState.previousRoute,
      data: data,
      animated: ROUTER_CONFIG.animations.enabled
    });

    // Actualizar título de la página
    updatePageTitle(section);

    // Disparar evento personalizado
    dispatchNavigationEvent(section, routerState.previousRoute, data);

    // Marcar navegación como completada
    setTimeout(() => {
      routerState.isNavigating = false;
    }, ROUTER_CONFIG.animations.duration);

  } catch (error) {
    console.error('❌ Error ejecutando navegación:', error);
    routerState.isNavigating = false;
    throw error;
  }
}

/**
 * Maneja cambios en el hash de la URL
 */
function handleHashChange() {
  const section = window.location.hash ? window.location.hash.slice(1) : ROUTER_CONFIG.defaultRoute;
  
  // Solo navegar si no estamos ya navegando programáticamente
  if (!routerState.isNavigating) {
    navigate(section, { silent: true });
  }
}

/**
 * Maneja la carga inicial de la página
 */
function handleInitialLoad() {
  const section = window.location.hash ? window.location.hash.slice(1) : ROUTER_CONFIG.defaultRoute;
  
  console.log(`🚀 Carga inicial: navegando a ${section}`);
  
  // Navegación inicial
  navigate(section, { silent: true, force: true });
}

/**
 * Normaliza una ruta aplicando aliases
 * @param {string} route - Ruta original
 * @returns {string} - Ruta normalizada
 */
function normalizeRoute(route) {
  if (!route || typeof route !== 'string') {
    return ROUTER_CONFIG.defaultRoute;
  }

  const cleanRoute = route.toLowerCase().trim();
  
  // Aplicar aliases
  return ROUTER_CONFIG.routeAliases[cleanRoute] || cleanRoute;
}

/**
 * Verifica si una ruta es válida
 * @param {string} route - Ruta a verificar
 * @returns {boolean} - Validez de la ruta
 */
function isValidRoute(route) {
  return ROUTER_CONFIG.validRoutes.includes(route);
}

/**
 * Verifica si una ruta está protegida
 * @param {string} route - Ruta a verificar
 * @returns {boolean} - Si la ruta está protegida
 */
function isProtectedRoute(route) {
  return ROUTER_CONFIG.protectedRoutes.includes(route);
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} - Estado de autenticación
 */
function isAuthenticated() {
  // Verificar token en localStorage
  const token = localStorage.getItem('studyingflash_auth_token');
  
  if (!token) return false;
  
  try {
    // Verificar si el token no ha expirado (básico)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    return payload.exp > now;
  } catch (error) {
    console.warn('⚠️ Error verificando token:', error);
    return false;
  }
}

/**
 * Actualiza el historial de navegación
 * @param {string} route - Ruta actual
 * @param {*} data - Datos adicionales
 */
function updateHistory(route, data = null) {
  const historyEntry = {
    route: route,
    timestamp: Date.now(),
    data: data
  };

  routerState.history.push(historyEntry);

  // Mantener solo los últimos 50 elementos
  if (routerState.history.length > 50) {
    routerState.history = routerState.history.slice(-50);
  }
}

/**
 * Actualiza el título de la página
 * @param {string} section - Sección actual
 */
function updatePageTitle(section) {
  const titles = {
    'inicio': 'StudyingFlash - Inicio',
    'estudiar': 'StudyingFlash - Estudiar',
    'crear': 'StudyingFlash - Crear Contenido',
    'gestionar': 'StudyingFlash - Gestionar Decks',
    'ranking': 'StudyingFlash - Ranking',
    'configuracion': 'StudyingFlash - Configuración',
    'perfil': 'StudyingFlash - Mi Perfil',
    'estadisticas': 'StudyingFlash - Estadísticas',
    'ayuda': 'StudyingFlash - Ayuda'
  };

  document.title = titles[section] || `StudyingFlash - ${section}`;
}

/**
 * Dispara evento personalizado de navegación
 * @param {string} currentRoute - Ruta actual
 * @param {string} previousRoute - Ruta anterior
 * @param {*} data - Datos adicionales
 */
function dispatchNavigationEvent(currentRoute, previousRoute, data) {
  const event = new CustomEvent('routeChanged', {
    detail: {
      currentRoute,
      previousRoute,
      data,
      timestamp: Date.now()
    }
  });

  window.dispatchEvent(event);
}

/**
 * Navega hacia atrás en el historial
 * @returns {boolean} - Éxito de la navegación
 */
export function goBack() {
  if (routerState.history.length < 2) {
    console.log('📍 No hay historial suficiente para retroceder');
    return false;
  }

  // Obtener la ruta anterior (excluyendo la actual)
  const previousEntry = routerState.history[routerState.history.length - 2];
  
  if (previousEntry) {
    console.log(`⬅️ Navegando hacia atrás: ${previousEntry.route}`);
    return navigate(previousEntry.route, { data: previousEntry.data });
  }

  return false;
}

/**
 * Navega hacia adelante (si es posible)
 * @returns {boolean} - Éxito de la navegación
 */
export function goForward() {
  // En un router hash simple, no hay concepto de "adelante"
  // Esta función está aquí para compatibilidad futura
  console.log('⚠️ Navegación hacia adelante no implementada en router hash');
  return false;
}

/**
 * Refresca la ruta actual
 */
export function refresh() {
  console.log('🔄 Refrescando ruta actual');
  
  if (routerState.currentRoute) {
    navigate(routerState.currentRoute, { force: true });
  }
}

/**
 * Obtiene la ruta actual
 * @returns {string} - Ruta actual
 */
export function getCurrentRoute() {
  return routerState.currentRoute || ROUTER_CONFIG.defaultRoute;
}

/**
 * Obtiene el estado completo del router
 * @returns {Object} - Estado del router
 */
export function getRouterState() {
  return {
    ...routerState,
    config: ROUTER_CONFIG
  };
}

/**
 * Verifica si una ruta específica está activa
 * @param {string} route - Ruta a verificar
 * @returns {boolean} - Si la ruta está activa
 */
export function isActiveRoute(route) {
  return normalizeRoute(route) === routerState.currentRoute;
}

/**
 * Registra una nueva ruta válida
 * @param {string} route - Nueva ruta
 * @param {boolean} protected - Si la ruta está protegida
 */
export function registerRoute(route, protected = false) {
  if (!ROUTER_CONFIG.validRoutes.includes(route)) {
    ROUTER_CONFIG.validRoutes.push(route);
    console.log(`📝 Ruta registrada: ${route}`);
  }

  if (protected && !ROUTER_CONFIG.protectedRoutes.includes(route)) {
    ROUTER_CONFIG.protectedRoutes.push(route);
    console.log(`🔒 Ruta protegida: ${route}`);
  }
}

/**
 * Configura el router
 * @param {Object} config - Nueva configuración
 */
export function configureRouter(config = {}) {
  Object.assign(ROUTER_CONFIG, config);
  console.log('⚙️ Router reconfigurado:', ROUTER_CONFIG);
}

// Configurar event listeners
window.addEventListener('hashchange', handleHashChange);
document.addEventListener('DOMContentLoaded', handleInitialLoad);

// Escuchar eventos de autenticación
window.addEventListener('authStateChanged', (event) => {
  routerState.authRequired = !event.detail.isAuthenticated;
  
  // Si se cerró sesión y estamos en una ruta protegida, redirigir
  if (!event.detail.isAuthenticated && isProtectedRoute(routerState.currentRoute)) {
    navigate('inicio', { replace: true });
  }
});

// Exponer funciones globalmente para compatibilidad
window.navigate = navigate;
window.goBack = goBack;
window.refresh = refresh;
window.getCurrentRoute = getCurrentRoute;

// Exponer router para depuración
if (window.APP_CONFIG?.features?.debugging) {
  window.Router = {
    navigate,
    goBack,
    goForward,
    refresh,
    getCurrentRoute,
    getRouterState,
    isActiveRoute,
    registerRoute,
    configureRouter,
    state: routerState,
    config: ROUTER_CONFIG
  };
}

console.log('🧭 Router inicializado con', ROUTER_CONFIG.validRoutes.length, 'rutas válidas');


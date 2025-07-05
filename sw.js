/**
 * SERVICE WORKER - REFACTORIZADO
 * ==============================
 * 
 * Service Worker mejorado con capacidades offline robustas,
 * estrategias de cache inteligentes y manejo de errores
 */

// Configuración del cache
const CACHE_NAME = 'studyingflash-v1.2.0';
const STATIC_CACHE = 'studyingflash-static-v1.2.0';
const DYNAMIC_CACHE = 'studyingflash-dynamic-v1.2.0';
const API_CACHE = 'studyingflash-api-v1.2.0';

// Recursos estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/meta-dark-theme.css',
  '/main.js',
  '/router.js',
  '/bindings.js',
  '/core-navigation.js',
  '/store.js',
  '/helpers.js',
  '/utils/helpers.js',
  '/utils/validation.js',
  '/utils/apiHelpers.js',
  '/apiClient.js',
  '/charts.js'
];

// Recursos dinámicos que se cachean bajo demanda
const DYNAMIC_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:js|css)$/,
  /\/api\/.*$/
];

// Configuración de estrategias de cache
const CACHE_STRATEGIES = {
  // Cache First: Para recursos estáticos
  CACHE_FIRST: 'cache-first',
  // Network First: Para contenido dinámico
  NETWORK_FIRST: 'network-first',
  // Stale While Revalidate: Para recursos que pueden estar desactualizados
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Network Only: Para requests críticos
  NETWORK_ONLY: 'network-only',
  // Cache Only: Para modo offline
  CACHE_ONLY: 'cache-only'
};

// Configuración de timeouts
const TIMEOUTS = {
  NETWORK: 5000,
  CACHE: 1000
};

/**
 * EVENTOS DEL SERVICE WORKER
 * ==========================
 */

/**
 * Evento de instalación
 */
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker v1.2.0');
  
  event.waitUntil(
    Promise.all([
      // Pre-cachear recursos estáticos
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Pre-cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),
      
      // Configurar cache dinámico
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE)
    ]).then(() => {
      console.log('[SW] Instalación completada');
      // Forzar activación inmediata
      return self.skipWaiting();
    }).catch(error => {
      console.error('[SW] Error durante instalación:', error);
    })
  );
});

/**
 * Evento de activación
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker v1.2.0');
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      cleanupOldCaches(),
      
      // Tomar control de todas las pestañas
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activación completada');
      
      // Notificar a los clientes sobre la actualización
      return notifyClients('sw-updated', { version: '1.2.0' });
    }).catch(error => {
      console.error('[SW] Error durante activación:', error);
    })
  );
});

/**
 * Evento de fetch - Manejo de requests
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo manejar requests GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Determinar estrategia de cache
  const strategy = determineStrategy(request, url);
  
  event.respondWith(
    handleRequest(request, strategy)
      .catch(error => {
        console.error('[SW] Error manejando request:', error);
        return handleOfflineResponse(request);
      })
  );
});

/**
 * Evento de mensaje - Comunicación con la app
 */
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: '1.2.0' });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_URLS':
      if (payload?.urls) {
        cacheUrls(payload.urls).then(() => {
          event.ports[0].postMessage({ success: true });
        });
      }
      break;
      
    default:
      console.log('[SW] Mensaje no reconocido:', type);
  }
});

/**
 * Evento de sync - Sincronización en background
 */
self.addEventListener('sync', event => {
  console.log('[SW] Evento de sync:', event.tag);
  
  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(performBackgroundSync());
      break;
      
    case 'upload-data':
      event.waitUntil(uploadPendingData());
      break;
  }
});

/**
 * FUNCIONES DE ESTRATEGIAS DE CACHE
 * =================================
 */

/**
 * Determina la estrategia de cache para un request
 */
function determineStrategy(request, url) {
  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Recursos estáticos - Cache First
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // HTML pages - Stale While Revalidate
  if (request.headers.get('accept')?.includes('text/html')) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Default - Network First
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

/**
 * Maneja un request según la estrategia especificada
 */
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request);
      
    default:
      return networkFirst(request);
  }
}

/**
 * Estrategia Cache First
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.status === 200) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * Estrategia Network First
 */
async function networkFirst(request) {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), TIMEOUTS.NETWORK)
      )
    ]);
    
    if (networkResponse.status === 200) {
      const cacheName = request.url.includes('/api/') ? API_CACHE : DYNAMIC_CACHE;
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Estrategia Stale While Revalidate
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const networkResponsePromise = fetch(request).then(response => {
    if (response.status === 200) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(error => {
    console.log('[SW] Network update failed:', error.message);
  });
  
  return cachedResponse || networkResponsePromise;
}

/**
 * FUNCIONES DE UTILIDAD
 * =====================
 */

/**
 * Limpia caches antiguos
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  
  const deletePromises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => {
      console.log('[SW] Eliminando cache antiguo:', cacheName);
      return caches.delete(cacheName);
    });
  
  return Promise.all(deletePromises);
}

/**
 * Maneja respuestas offline
 */
async function handleOfflineResponse(request) {
  const url = new URL(request.url);
  
  // Para páginas HTML, devolver página offline
  if (request.headers.get('accept')?.includes('text/html')) {
    const offlinePage = await caches.match('/offline.html') || 
                       await caches.match('/index.html');
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // Para API requests, devolver respuesta JSON de error
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'No hay conexión disponible',
        timestamp: Date.now()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Para otros recursos, devolver error genérico
  return new Response('Recurso no disponible offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

/**
 * Notifica a todos los clientes
 */
async function notifyClients(type, payload) {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({ type, payload });
  });
}

/**
 * Limpia todos los caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
  return Promise.all(deletePromises);
}

/**
 * Cachea URLs específicas
 */
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachePromises = urls.map(url => {
    return fetch(url).then(response => {
      if (response.status === 200) {
        return cache.put(url, response);
      }
    }).catch(error => {
      console.log('[SW] Error cacheando URL:', url, error);
    });
  });
  
  return Promise.all(cachePromises);
}

/**
 * Sincronización en background
 */
async function performBackgroundSync() {
  console.log('[SW] Realizando sincronización en background');
  
  try {
    // Intentar sincronizar datos pendientes
    await uploadPendingData();
    
    // Actualizar cache con datos frescos
    await updateCacheWithFreshData();
    
    console.log('[SW] Sincronización completada');
  } catch (error) {
    console.error('[SW] Error en sincronización:', error);
  }
}

/**
 * Sube datos pendientes
 */
async function uploadPendingData() {
  // Implementar lógica para subir datos que están pendientes
  // cuando la conexión se restaure
  console.log('[SW] Subiendo datos pendientes...');
}

/**
 * Actualiza cache con datos frescos
 */
async function updateCacheWithFreshData() {
  const cache = await caches.open(API_CACHE);
  
  // URLs críticas para actualizar
  const criticalUrls = [
    '/api/user/profile',
    '/api/decks',
    '/api/stats'
  ];
  
  const updatePromises = criticalUrls.map(async url => {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.log('[SW] Error actualizando cache para:', url);
    }
  });
  
  return Promise.all(updatePromises);
}

/**
 * LOGGING Y DEBUGGING
 * ===================
 */

console.log('[SW] Service Worker refactorizado cargado - v1.2.0');
console.log('[SW] Estrategias de cache configuradas');
console.log('[SW] Capacidades offline mejoradas activas');


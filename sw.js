/**
 * Service Worker para StudyingFlash PWA
 * Implementa cache offline y estrategias de cache optimizadas
 */

const CACHE_NAME = 'studyingflash-v4.0.0';
const STATIC_CACHE = 'studyingflash-static-v3.1.0';
const DYNAMIC_CACHE = 'studyingflash-dynamic-v3.1.0';
const API_CACHE = 'studyingflash-api-v3.1.0';

// Archivos críticos para precache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/meta-dark-theme.css',
  '/responsive.css',
  '/core-navigation.js',
  '/apiClient.js',
  '/create.service.js',
  '/utils/helpers.js',
  '/utils/validation.js',
  '/utils/loading.js',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/favicon-32x32.png'
];

// URLs de API para cache
const API_URLS = [
  '/api/auth/validate-token',
  '/api/decks/',
  '/api/dashboard/stats'
];

// Archivos que nunca se deben cachear
const NEVER_CACHE = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh'
];

/**
 * Evento de instalación del Service Worker
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Precaching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Activar inmediatamente
      })
      .catch(error => {
        console.error('[SW] Error during installation:', error);
      })
  );
});

/**
 * Evento de activación del Service Worker
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Eliminar caches antiguos
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim(); // Tomar control inmediatamente
      })
      .catch(error => {
        console.error('[SW] Error during activation:', error);
      })
  );
});

/**
 * Evento de fetch - Interceptar todas las requests
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo manejar requests del mismo origen
  if (url.origin !== location.origin) {
    return;
  }
  
  // No cachear requests que nunca se deben cachear
  if (NEVER_CACHE.some(path => url.pathname.includes(path))) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

/**
 * Manejar requests con diferentes estrategias según el tipo
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Estrategia para archivos estáticos
    if (isStaticAsset(url.pathname)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // Estrategia para API calls
    if (url.pathname.startsWith('/api/')) {
      return await networkFirst(request, API_CACHE);
    }
    
    // Estrategia para páginas HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }
    
    // Estrategia por defecto para otros recursos
    return await networkFirst(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    return await handleOfflineFallback(request);
  }
}

/**
 * Estrategia Cache First - Para assets estáticos
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * Estrategia Network First - Para API calls
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    console.log('[SW] Network first:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Estrategia Stale While Revalidate - Para páginas HTML
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch en background para actualizar cache
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  // Retornar cache inmediatamente si existe, sino esperar network
  return cachedResponse || fetchPromise;
}

/**
 * Verificar si es un asset estático
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         STATIC_ASSETS.includes(pathname);
}

/**
 * Manejar fallback offline
 */
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Para páginas HTML, mostrar página offline
  if (request.headers.get('accept')?.includes('text/html')) {
    const cache = await caches.open(STATIC_CACHE);
    return await cache.match('/') || new Response(
      createOfflinePage(),
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
  
  // Para API calls, retornar respuesta JSON de error
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'offline',
        message: 'No hay conexión a internet. Algunos datos pueden estar desactualizados.'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
  
  // Para otros recursos, retornar error
  return new Response('Recurso no disponible offline', { status: 503 });
}

/**
 * Crear página HTML offline básica
 */
function createOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>StudyingFlash - Sin conexión</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #f9fafb;
          color: #374151;
          text-align: center;
          padding: 20px;
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #1f2937;
          margin-bottom: 0.5rem;
        }
        p {
          color: #6b7280;
          max-width: 400px;
          line-height: 1.6;
        }
        .retry-btn {
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 1rem;
        }
        .retry-btn:hover {
          background: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <div class="offline-icon">📱</div>
      <h1>Sin conexión a internet</h1>
      <p>
        StudyingFlash funciona offline con los datos que ya tienes guardados.
        Algunas funciones pueden estar limitadas hasta que se restablezca la conexión.
      </p>
      <button class="retry-btn" onclick="window.location.reload()">
        Reintentar conexión
      </button>
    </body>
    </html>
  `;
}

/**
 * Manejar mensajes del cliente
 */
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Obtener estado del cache
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

/**
 * Limpiar todos los caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

/**
 * Evento de sincronización en background
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * Realizar sincronización en background
 */
async function doBackgroundSync() {
  try {
    // Aquí puedes implementar lógica para sincronizar datos
    // cuando se recupere la conexión
    console.log('[SW] Performing background sync...');
    
    // Ejemplo: revalidar cache de API críticas
    const criticalAPIs = ['/api/decks/', '/api/dashboard/stats'];
    
    for (const apiUrl of criticalAPIs) {
      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          const cache = await caches.open(API_CACHE);
          cache.put(apiUrl, response.clone());
        }
      } catch (error) {
        console.log('[SW] Failed to sync:', apiUrl);
      }
    }
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

console.log('[SW] Service Worker script loaded');


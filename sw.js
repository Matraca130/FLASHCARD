self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  clients.claim();
});

const CACHE = 'flashcards-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(
        response =>
          response ||
          fetch(request).then(networkResp => {
            if (networkResp.status === 200 && networkResp.type === 'basic') {
              cache.put(request, networkResp.clone());
            }
            return networkResp;
          })
      )
    )
  );
});

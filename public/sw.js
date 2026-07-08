// Service Worker for Isis Agenda PWA
const CACHE_NAME = 'isis-agenda-v2';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/isisneutraperfil.png',
  '/favicon.svg'
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network First strategy
// Ensures we always get the latest version if online, but can fallback to cache
self.addEventListener('fetch', (event) => {
  // We only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Successful network request - update cache and return
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Network failed - return from cache or error response
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Recurso não encontrado no cache.', { 
            status: 404, 
            statusText: 'Not Found',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// -- PUSH NOTIFICATIONS --
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Isis Agenda';
  const options = {
    body: data.body || 'Você tem uma nova atualização!',
    icon: data.icon || '/isisneutraperfil.png',
    badge: data.badge || '/favicon.svg',
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});

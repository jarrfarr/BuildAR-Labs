// Robust Service Worker for Builder's Offline Guide
const CACHE_VERSION = 'v2';
const CACHE_NAME = `builders-guide-${CACHE_VERSION}`;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/manifest.json',
  '/js/app.js',
  '/js/modelviewer.js',
  '/pages/products.html',
  '/pages/settings.html',
  '/pages/product-page1.html',
  '/pages/model.html'
];

const RUNTIME_CACHE = 'runtime-assets';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  const expectedCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (!expectedCaches.includes(key)) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

// Helper to determine navigation requests
function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Always try to serve core assets from cache first
  if (CORE_ASSETS.includes(new URL(request.url).pathname)) {
    event.respondWith(caches.match(request).then(resp => resp || fetch(request)));
    return;
  }

  if (isNavigationRequest(request)) {
    // Network-first for navigations, fallback to cached offline page
    event.respondWith(
      fetch(request).then(networkResponse => {
        // Update runtime cache with fresh navigation HTML
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, networkResponse.clone()));
        return networkResponse;
      }).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // For other requests (images, scripts, styles) use cache-first then network and cache
  event.respondWith(
    caches.match(request).then(cachedResp => {
      if (cachedResp) return cachedResp;
      return fetch(request).then(networkResp => {
        // Only cache successful responses
        if (!networkResp || networkResp.status !== 200 || networkResp.type === 'opaque') return networkResp;
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, networkResp.clone()));
        return networkResp;
      }).catch(() => {
        // If image fails, you could return a placeholder image (not included here)
        return caches.match('/offline.html');
      });
    })
  );
});

// Listen for messages from pages (e.g. request to pre-cache core assets)
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  if (event.data.type === 'CACHE_CORE') {
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => {
      // Respond back to sender if a MessagePort was provided
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'CACHE_COMPLETE' });
      } else {
        // Broadcast to all clients
        self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage({ type: 'CACHE_COMPLETE' })));
      }
    }).catch(err => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'CACHE_FAILED', error: err && err.message ? err.message : String(err) });
      } else {
        self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage({ type: 'CACHE_FAILED', error: err && err.message ? err.message : String(err) })));
      }
    });
  }
});


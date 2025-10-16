const CACHE_NAME = 'buildlab360-root-v1';
const FILES_TO_CACHE = [
  '/',
  '/frontend/index.html',
  '/frontend/test.html',
  '/frontend/style.css',
  '/model/model.glb',
  '/model/model-large.glb',
  '/backend/manifest.json',
  'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Don't cache opaque responses from CDN by default, but try for same-origin
        if (response && response.status === 200 && response.type === 'basic') {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        }
        return response;
      }).catch(() => caches.match('/frontend/index.html'));
    })
  );
});

// Listen for messages from the page (e.g., request to cache a specific URL)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { action, url } = event.data;
  if (action === 'cache-url' && url) {
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const resp = await fetch(url);
        if (resp && resp.status === 200) {
          await cache.put(url, resp.clone());
          // notify all clients
          const clients = await self.clients.matchAll();
          for (const client of clients) {
            client.postMessage({ type: 'cache-complete', url });
          }
        }
      } catch (err) {
        console.error('Cache-url failed', err);
      }
    });
  }
  if (action === 'uncache-url' && url) {
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const removed = await cache.delete(url);
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: 'uncache-complete', url, removed });
        }
      } catch (err) {
        console.error('Uncache-url failed', err);
      }
    });
  }
});
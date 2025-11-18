const CACHE_NAME = "buildlab-cache-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/main.js",
  "/pages/home.html",
  "/pages/.preferences.html",
  "/pages/install.html",
  "/pages/siga-majvest_200.html", 
  "/manifest.json",

  // cache the following fonts
  "/assets/fonts/roboto-300.woff2",
  "/assets/fonts/roboto-400.woff2",
  "/assets/fonts/roboto-500.woff2",
  "/assets/fonts/roboto-700.woff2",

  // local assets we want available offline after first install
  "/assets/pdfs/sample.pdf",
  "/assets/models/model.glb",
  "/assets/videos/sample.mp4",

];

self.addEventListener("install", event => {
  // Pre-cache core resources. Keep failures from runtime/fetch out of install
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// On fetch, respond from cache if available. Otherwise fetch from network and
// put a copy into the cache (runtime caching). This allows cross-origin
// resources like the CDN model-viewer script to be cached after first load.
self.addEventListener("fetch", event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // If response is invalid, just pass it through
        if (!response || (response.status !== 200 && response.type !== 'opaque')) {
          return response;
          

        // Clone response before caching because response is a stream
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          try {
            cache.put(event.request, responseClone);
          } catch (err) {
            // Ignore cache put failures (quota, opaque responses etc.)
            console.warn('Cache put failed for', event.request.url, err);
          }
        });

        return response;
      }).catch(() => {
        // Network failed: optionally return a fallback for navigations
        // For navigation requests, try to return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
      });
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      .then(() => self.clients.claim())
    )
  );
});

const CACHE_NAME = 'buildar-pwa-v5';
const urlsToCache = [
  '/index.html',
  '/pages/demo.html',
  '/pages/404.html',
  '/pages/contact.html',
  '/pages/digital-assets.html',
  '/pages/library.html',
  '/css/styles.css',
  '/css/text.css',
  '/js/app.js',
  '/manifest.json',
  'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js',
  '/assets/images/ar-logo.png',
  '/assets/images/image.png',
  '/assets/images/profile.jpg',
  '/assets/models/model.glb',
  '/assets/models/anim.glb',
  '/assets/videos/huber-zip-1.mp4',
  '/assets/pdfs/huber-rainscreen-install-1.pdf',
  '/assets/pdfs/huber-zip-install-1.pdf',
  '/assets/icons/augmented-reality.svg',
  '/assets/icons/book.svg',
  '/assets/icons/deploy.svg',
  '/assets/icons/external-link.svg'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Force activate new SW immediately
});

// Fetch event - cache-first strategy with fallback to network and cache newly fetched resources
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Handle range requests for cached media files
          const requestRange = event.request.headers.get('range');
          if (requestRange && (event.request.url.endsWith('.mp4') || event.request.url.endsWith('.webm'))) {
            return response.blob().then(blob => {
              const parts = requestRange.split('=');
              const rangeValue = parts[1];
              const [start, end] = rangeValue.split('-').map(Number);
              const blobSlice = blob.slice(start, end !== undefined ? end + 1 : undefined);
              const responseInit = {
                status: 206,
                statusText: 'Partial Content',
                headers: {
                  'Content-Range': `bytes ${start}-${(end || blob.size - 1)}/${blob.size}`,
                  'Content-Length': blobSlice.size,
                  'Content-Type': response.headers.get('content-type')
                }
              };
              return new Response(blobSlice, responseInit);
            });
          }
          return response;
        }
        // Fetch from network and cache the new resource
        return fetch(event.request).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Clone the response to cache it
          let responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName != CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim(); // Take control of all open pages immediately
});

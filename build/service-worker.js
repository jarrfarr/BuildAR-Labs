// Organized cache buckets
const CACHE_APP = 'buildlab-app';         // Auto-persistent: CSS, fonts, JS, static files
const CACHE_ASSETS = 'buildlab-assets';   // Auto-persistent: images, runtime assets
const CACHE_PAGE_SIGA = 'buildlab-page-siga';     // Manual: siga.html page assets
const CACHE_PAGE_INSTALL = 'buildlab-page-install'; // Manual: install.html page assets
const CACHE_RUNTIME = 'buildlab-runtime'; // Fallback runtime cache

// Static assets to precache on install
const STATIC_FILES = [
  './',
  'index.html',
  'offline.html',
  'manifest.json',
  'css/style.css',
  'css/base.css',
  'css/cache-ui.css',
  'css/fonts.css',
  'css/theme-dark.css',
  'js/main.js',
  'pages/preferences.html',
  'pages/install.html',
  'pages/siga.html',
  'assets/icon-512.png',
  'favicon.ico',
  'logo.png'
];

// Fonts and core assets
const CORE_ASSETS = [
  'assets/fonts/Roboto-Regular-webfont.woff',
  'assets/fonts/Roboto-Medium-webfont.woff',
  'assets/fonts/Roboto-Thin-webfont.woff',
  'assets/fonts/Roboto-MediumItalic-webfont.woff',
  'assets/fonts/Roboto-ThinItalic-webfont.woff'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first for HTML pages - ensures latest content
  async networkFirst(request) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_RUNTIME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // Return offline fallback for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('./offline.html');
      }
      throw error;
    }
  },

  // Cache first for static assets
  async cacheFirst(request, cacheName = CACHE_APP) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      // For images, return a placeholder if available
      if (request.destination === 'image') {
        return new Response('', { status: 404 });
      }
      throw error;
    }
  },

  // Stale while revalidate for CDN resources
  async staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const revalidatePromise = fetch(request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE_RUNTIME);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(() => cached);

    return cached || await revalidatePromise;
  }
};

// Install event - precache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker...');

  event.waitUntil(
    Promise.all([
      // Cache app resources (auto-persistent)
      caches.open(CACHE_APP).then(cache => {
        console.log('[SW] Precaching app resources');
        return Promise.allSettled(
          [...STATIC_FILES, ...CORE_ASSETS].map(url => cache.add(url).catch(err => console.warn('Failed to precache:', url, err)))
        );
      })
    ]).then(() => {
      console.log('[SW] Precache complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker...');

  const currentCaches = [CACHE_APP, CACHE_ASSETS, CACHE_PAGE_SIGA, CACHE_PAGE_INSTALL, CACHE_RUNTIME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests (except for allowed domains)
  if (url.origin !== location.origin) {
    // Allow common CDNs and external resources
    if (!url.hostname.includes('fonts.googleapis.com') &&
        !url.hostname.includes('youtube.com') &&
        !url.hostname.includes('modelviewer.dev')) {
      return;
    }
  }

  // Determine cache strategy based on request type
  if (request.mode === 'navigate') {
    // Navigation requests - network first
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
  } else if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    // CSS, JS, Fonts - auto-persistent in app cache
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request, CACHE_APP));
  } else if (request.destination === 'image') {
    // Images - auto-persistent in assets cache
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request, CACHE_ASSETS));
  } else if (url.hostname !== location.origin) {
    // External resources - stale while revalidate
    event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
  } else {
    // Other resources - runtime cache
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request, CACHE_RUNTIME));
  }
});

// Message event - handle manual cache operations
self.addEventListener('message', (event) => {
  const { data } = event;

  switch (data.type) {
    case 'CACHE_URLS':
      handleCacheUrls(data.urls, event);
      break;
    case 'CACHE_PAGE':
      handleCachePage(data.pageId, data.urls, event);
      break;
    case 'GET_CACHE_INFO':
      handleGetCacheInfo(event);
      break;
    case 'CLEAR_CACHE':
      handleClearCache(event);
      break;
    default:
      console.warn('[SW] Unknown message type:', data.type);
  }
});

// Handle manual URL caching
async function handleCacheUrls(urls, event) {
  if (!Array.isArray(urls)) {
    event.ports[0].postMessage({ success: false, error: 'URLs must be an array' });
    return;
  }

  const results = { success: true, cached: [], failed: [] };

  try {
    const cache = await caches.open(CACHE_RUNTIME);
    await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            results.cached.push(url);
          } else {
            results.failed.push({ url, reason: `HTTP ${response.status}` });
          }
        } catch (error) {
          results.failed.push({ url, reason: error.message });
        }
      })
    );

    if (results.failed.length > 0) {
      results.success = results.failed.length < urls.length;
    }
  } catch (error) {
    results.success = false;
    results.error = error.message;
  }

  event.ports[0].postMessage(results);
}

// Handle manual page-specific caching
async function handleCachePage(pageId, urls, event) {
  let cacheName;
  switch (pageId) {
    case 'siga':
      cacheName = CACHE_PAGE_SIGA;
      break;
    case 'install':
      cacheName = CACHE_PAGE_INSTALL;
      break;
    default:
      event.ports[0].postMessage({ success: false, error: 'Unknown page ID' });
      return;
  }

  if (!Array.isArray(urls)) {
    event.ports[0].postMessage({ success: false, error: 'URLs must be an array' });
    return;
  }

  const results = { success: true, cached: [], failed: [] };

  try {
    const cache = await caches.open(cacheName);
    await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            results.cached.push(url);
          } else {
            results.failed.push({ url, reason: `HTTP ${response.status}` });
          }
        } catch (error) {
          results.failed.push({ url, reason: error.message });
        }
      })
    );

    if (results.failed.length > 0) {
      results.success = results.failed.length < urls.length;
    }
  } catch (error) {
    results.success = false;
    results.error = error.message;
  }

  event.ports[0].postMessage(results);
}

// Handle cache info request
async function handleGetCacheInfo(event) {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {};

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheInfo[cacheName] = {
        entries: keys.length,
        estimatedSize: await getCacheSize(cache)
      };
    }

    event.ports[0].postMessage({ success: true, cacheInfo });
  } catch (error) {
    event.ports[0].postMessage({ success: false, error: error.message });
  }
}

// Handle cache clearing
async function handleClearCache(event) {
  const { cacheName } = event.data;
  try {
    if (cacheName) {
      await caches.delete(cacheName);
      event.ports[0].postMessage({ success: true, cleared: [cacheName] });
    } else {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      event.ports[0].postMessage({ success: true, cleared: cacheNames });
    }
  } catch (error) {
    event.ports[0].postMessage({ success: false, error: error.message });
  }
}

// Estimate cache size
async function getCacheSize(cache) {
  try {
    const keys = await cache.keys();
    let totalSize = 0;

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          totalSize += parseInt(contentLength, 10);
        } else {
          // Estimate size for responses without content-length
          const cloned = response.clone();
          const blob = await cloned.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.warn('[SW] Error calculating cache size:', error);
    return 0;
  }
}

// Periodic cleanup (runs when service worker is idle)
self.addEventListener('periodic-sync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldCacheEntries());
  }
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-cache') {
    event.waitUntil(performBackgroundCaching());
  }
});

async function cleanupOldCacheEntries() {
  // Clean up large caches if needed (skip auto-persistent caches, focus on runtime and page-specific)
  const cacheInfos = await Promise.all(
    [CACHE_RUNTIME, CACHE_PAGE_SIGA, CACHE_PAGE_INSTALL].map(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const size = await getCacheSize(cache);
      return { cacheName, keys, size };
    })
  );

  // Simple cleanup: delete oldest entries if cache is too large (50MB limit)
  const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

  for (const { cacheName, keys, size } of cacheInfos) {
    if (size > MAX_CACHE_SIZE) {
      console.log(`[SW] Cleaning up cache ${cacheName}, size: ${(size / 1024 / 1024).toFixed(2)}MB`);
      const cache = await caches.open(cacheName);
      // Delete oldest half of entries
      const toDelete = keys.slice(0, Math.floor(keys.length / 2));
      await Promise.all(toDelete.map(request => cache.delete(request)));
    }
  }
}

async function performBackgroundCaching() {
  // Placeholder for background sync operations
  console.log('[SW] Performing background caching operations');
  // Could be used to cache recently accessed resources
}

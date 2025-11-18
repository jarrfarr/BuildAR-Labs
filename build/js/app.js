// PWA Cache App
class CacheApp {
    constructor() {
        this.dbName = 'BuildLabCache';
        this.dbVersion = 1;
        this.db = null;
        this.initIndexedDB();
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Articles store
                if (!db.objectStoreNames.contains('articles')) {
                    const articlesStore = db.createObjectStore('articles', { keyPath: 'id' });
                    articlesStore.createIndex('id', 'id', { unique: true });
                }

                // Assets store
                if (!db.objectStoreNames.contains('assets')) {
                    const assetsStore = db.createObjectStore('assets', { keyPath: 'url' });
                    assetsStore.createIndex('url', 'url', { unique: true });
                }

                // Persisted pages store
                if (!db.objectStoreNames.contains('persistedPages')) {
                    const persistedStore = db.createObjectStore('persistedPages', { keyPath: 'id' });
                    persistedStore.createIndex('id', 'id', { unique: true });
                    persistedStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async getAllArticles() {
        if (!this.db) await this.initIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['articles'], 'readonly');
            const store = transaction.objectStore('articles');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllAssets() {
        if (!this.db) await this.initIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['assets'], 'readonly');
            const store = transaction.objectStore('assets');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPersistedPages() {
        if (!this.db) await this.initIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['persistedPages'], 'readonly');
            const store = transaction.objectStore('persistedPages');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async storePersistedPage(pageId) {
        if (!this.db) await this.initIndexedDB();

        // Mock page data - in real app this would fetch from server
        const pageData = {
            id: pageId,
            url: `${pageId}.html`,
            timestamp: Date.now(),
            title: this.getPageTitle(pageId),
            content: await this.fetchPageContent(pageId)
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['persistedPages'], 'readwrite');
            const store = transaction.objectStore('persistedPages');
            const request = store.put(pageData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async removePersistedPage(pageId) {
        if (!this.db) await this.initIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['persistedPages'], 'readwrite');
            const store = transaction.objectStore('persistedPages');
            const request = store.delete(pageId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getPageTitle(pageId) {
        const titles = {
            'product-page1': 'Heavy Duty Vapor Barrier Installation',
            'model': '3D Model Viewer',
            'install': 'Installation Guide'
        };
        return titles[pageId] || pageId;
    }

    async fetchPageContent(pageId) {
        // Mock content - in real implementation would fetch HTML
        return `<p>Cached content for ${pageId}</p>`;
    }

    async cacheAppFiles() {
        if (!this.db) await this.initIndexedDB();

        // Core app files to cache
        const appFiles = [
            { url: 'index.html', type: 'html' },
            { url: 'products.html', type: 'html' },
            { url: 'settings.html', type: 'html' },
            { url: 'product-page1.html', type: 'html' },
            { url: 'model.html', type: 'html' },
            { url: 'style.css', type: 'css' },
            { url: 'app.js', type: 'js' },
            { url: 'modelviewer.js', type: 'js' },
            { url: 'manifest.json', type: 'other' },
            { url: 'sw.js', type: 'js' }
        ];

        // Mock sizes for different file types (in real app, fetch actual sizes)
        const mockSizes = {
            html: 5000,  // ~5KB per HTML page
            css: 15000,  // ~15KB for CSS
            js: 8000,    // ~8KB per JS file
            other: 2000  // ~2KB for manifest etc.
        };

        const transaction = this.db.transaction(['assets'], 'readwrite');
        const store = transaction.objectStore('assets');

        for (const file of appFiles) {
            await new Promise((resolve, reject) => {
                const request = store.put({
                    url: file.url,
                    data: `Mock cached data for ${file.url}`,
                    size: mockSizes[file.type] || 1000,
                    type: 'app-file',
                    timestamp: Date.now()
                });
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }
    }

    async getDetailedStorageAnalysis() {
        if (!this.db) await this.initIndexedDB();

        const articles = await this.getAllArticles();
        const assets = await this.getAllAssets();
        const persistedPages = await this.getPersistedPages();

        // Calculate breakdown
        const appAssets = assets.filter(asset => asset.type === 'app-file');
        const contentAssets = assets.filter(asset => asset.type !== 'app-file');

        const appBreakdown = {
            css: appAssets.filter(a => a.url.includes('.css')).reduce((sum, a) => sum + (a.size || 0), 0),
            js: appAssets.filter(a => a.url.includes('.js')).reduce((sum, a) => sum + (a.size || 0), 0),
            html: appAssets.filter(a => a.url.includes('.html')).reduce((sum, a) => sum + (a.size || 0), 0),
            fonts: 0, // Would need to implement font detection
            other: appAssets.filter(a => !(a.url.includes('.css') || a.url.includes('.js') || a.url.includes('.html'))).reduce((sum, a) => sum + (a.size || 0), 0)
        };

        const appTotalSize = appAssets.reduce((sum, a) => sum + (a.size || 0), 0);

        // Analyze content types (mock implementation)
        const models = contentAssets.filter(asset =>
            asset.url.includes('.glb') || asset.url.includes('.gltf') || asset.url.includes('model')
        );
        const videos = contentAssets.filter(asset =>
            asset.url.includes('.mp4') || asset.url.includes('.webm') || asset.url.includes('video')
        );
        const pdfs = contentAssets.filter(asset =>
            asset.url.includes('.pdf')
        );

        const pagesSize = articles.reduce((sum, article) => sum + JSON.stringify(article).length, 0);
        const modelsSize = models.reduce((sum, model) => sum + (model.size || 0), 0);
        const videosSize = videos.reduce((sum, video) => sum + (video.size || 0), 0);
        const pdfsSize = pdfs.reduce((sum, pdf) => sum + (pdf.size || 0), 0);

        return {
            appTotalSize,
            appBreakdown,
            pagesDownloaded: persistedPages.length,
            pagesSize,
            modelsCount: models.length,
            modelsSize,
            videosCount: videos.length,
            videosSize,
            pdfsCount: pdfs.length,
            pdfsSize,
            totalStorage: appTotalSize + pagesSize + modelsSize + videosSize + pdfsSize
        };
    }
}

// Global cache instance
const cache = new CacheApp();
window.cache = cache;

// Register service worker for all pages that include this script
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => {
            console.log('Service Worker registered:', reg.scope);
        })
        .catch(err => console.warn('SW registration failed:', err));

        // Once the service worker is ready, request it to pre-cache core assets
        navigator.serviceWorker.ready.then(async (registration) => {
            try {
                // Populate IndexedDB stores for persisted pages/assets (non-blocking)
                if (window.cache && typeof window.cache.cacheAppFiles === 'function') {
                    window.cache.cacheAppFiles().catch(e => console.warn('IndexedDB cacheAppFiles error', e));
                }

                // Send a message to the active service worker to cache CORE_ASSETS
                if (registration.active) {
                    const msgChannel = new MessageChannel();
                    msgChannel.port1.onmessage = (ev) => {
                        if (ev.data && ev.data.type === 'CACHE_COMPLETE') {
                            document.dispatchEvent(new CustomEvent('pwa-cache-complete'));
                            console.log('PWA core cache completed');
                        } else if (ev.data && ev.data.type === 'CACHE_FAILED') {
                            console.warn('PWA core cache failed', ev.data.error);
                            document.dispatchEvent(new CustomEvent('pwa-cache-failed', { detail: ev.data.error }));
                        }
                    };
                    registration.active.postMessage({ type: 'CACHE_CORE' }, [msgChannel.port2]);
                } else if (navigator.serviceWorker.controller) {
                    // Fallback to controller
                    const msgChannel = new MessageChannel();
                    msgChannel.port1.onmessage = (ev) => {
                        if (ev.data && ev.data.type === 'CACHE_COMPLETE') document.dispatchEvent(new CustomEvent('pwa-cache-complete'));
                    };
                    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_CORE' }, [msgChannel.port2]);
                }
            } catch (err) {
                console.warn('Error requesting SW to cache core assets', err);
            }
        });

    // Capture beforeinstallprompt to allow custom install UI
    window.deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPrompt = e; // Stored for later use by UI
        document.dispatchEvent(new CustomEvent('pwa-install-available'));
    });

    // Helper to trigger install prompt from UI
    window.showInstallPrompt = async function () {
        if (!window.deferredPrompt) return null;
        window.deferredPrompt.prompt();
        const choice = await window.deferredPrompt.userChoice;
        window.deferredPrompt = null;
        return choice;
    };
}

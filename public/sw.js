/**
 * Service Worker - Progressive Web App
 * Offline-first capabilities con caching inteligente
 */

const CACHE_NAME = 'welcomedly-v1.0.0';
const STATIC_CACHE = 'welcomedly-static-v1.0.0';
const DYNAMIC_CACHE = 'welcomedly-dynamic-v1.0.0';
const API_CACHE = 'welcomedly-api-v1.0.0';

// Assets que se cachearán estáticamente
const STATIC_ASSETS = [
    '/',
    '/auth/login',
    '/views/landing.ejs',
    '/views/layouts/generalLayout.ejs',
    '/views/layouts/authLayout.ejs',
    '/css/styles.css',
    '/js/sanitize.js',
    '/images/logo-welcomedly.svg',
    '/images/icons/icon-192x192.png',
    '/images/icons/icon-512x512.png',
    '/manifest.json',
    // Bootstrap y jQuery (CDN con fallback)
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://code.jquery.com/jquery-3.6.0.min.js',
    // SweetAlert2
    'https://cdn.jsdelivr.net/npm/sweetalert2@11.7.32/dist/sweetalert2.min.css',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11.7.32/dist/sweetalert2.all.min.js',
    // Font Awesome
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    // Google Fonts
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap'
];

// Endpoints de API que se pueden cachear temporalmente
const CACHEABLE_API_PATTERNS = [
    /^\/api\/auth\/me$/,
    /^\/api\/campaigns\/$/,
    /^\/api\/agents\/lista$/,
    /^\/api\/disposiciones\/lista$/
];

// API patterns que nunca se cachean (siempre fresh)
const NO_CACHE_API_PATTERNS = [
    /^\/api\/auth\/login/,
    /^\/api\/auth\/logout/,
    /^\/api\/auth\/refresh/,
    /^\/api\/campaigns\/crear/,
    /^\/api\/campaigns\/editar/,
    /^\/api\/campaigns\/eliminar/,
    /^\/api\/agents\/crear/,
    /^\/api\/agents\/editar/,
    /^\/api\/agents\/eliminar/
];

// Evento de instalación
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('📦 Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker: Installation complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Installation failed:', error);
            })
    );
});

// Evento de activación
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Eliminar caches antiguos
                        if (cacheName !== STATIC_CACHE &&
                            cacheName !== DYNAMIC_CACHE &&
                            cacheName !== API_CACHE) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activation complete');
                return self.clients.claim();
            })
    );
});

// Evento principal de fetch (manejo de requests)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Estrategia: Cache First para assets estáticos
    if (isStaticAsset(request)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // Estrategia: Network First para API calls
    if (isAPIRequest(url)) {
        event.respondWith(networkFirstForAPI(request));
        return;
    }

    // Estrategia: Stale While Revalidate para páginas HTML
    if (isNavigationRequest(request)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Default: Network First
    event.respondWith(networkFirst(request));
});

// Función: Cache First strategy
async function cacheFirst(request, cacheName) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Cache hit - retornar respuesta cacheada
            return cachedResponse;
        }

        // Cache miss - hacer request y cachear respuesta
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('Cache First failed:', error);

        // Si hay error, intentar offline page
        if (request.destination === 'document') {
            return caches.match('/offline.html');
        }

        throw error;
    }
}

// Función: Network First strategy
async function networkFirst(request, cacheName = DYNAMIC_CACHE) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            // Clonar respuesta para cachear
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', error.message);

        // Si network falla, intentar cache
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Si no hay cache y es una página, mostrar offline page
        if (request.destination === 'document') {
            return caches.match('/offline.html');
        }

        throw error;
    }
}

// Función: Stale While Revalidate strategy
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    });

    // Return cached response immediately, revalidate in background
    return cachedResponse || fetchPromise;
}

// Función: Network First para API con caching inteligente
async function networkFirstForAPI(request) {
    const url = new URL(request.url);

    // No cachear ciertos endpoints
    if (shouldNotCacheAPI(url)) {
        return fetch(request);
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            // Cachear respuesta por tiempo limitado (5 minutos)
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);

            // Eliminar del cache después de 5 minutos
            setTimeout(() => {
                cache.delete(request);
            }, 5 * 60 * 1000);
        }

        return networkResponse;
    } catch (error) {
        console.log('API Network failed, trying cache:', error.message);

        // Si es GET y es cacheable, intentar cache
        if (request.method === 'GET' && isCacheableAPI(url)) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                // Add header para indicar que es cached data
                const response = cachedResponse.clone();
                response.headers.set('X-From-Cache', 'true');
                response.headers.set('X-Cache-Time', new Date().toISOString());
                return response;
            }
        }

        throw error;
    }
}

// Funciones helper
function isStaticAsset(request) {
    return request.destination === 'script' ||
           request.destination === 'style' ||
           request.destination === 'image' ||
           request.destination === 'font' ||
           request.url.includes('/images/') ||
           request.url.includes('/css/') ||
           request.url.includes('/js/');
}

function isAPIRequest(url) {
    return url.pathname.startsWith('/api/');
}

function isNavigationRequest(request) {
    return request.mode === 'navigate' ||
           (request.method === 'GET' && request.destination === 'document');
}

function shouldNotCacheAPI(url) {
    return NO_CACHE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isCacheableAPI(url) {
    return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Background Sync para datos offline
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync event:', event.tag);

    if (event.tag === 'sync-offline-data') {
        event.waitUntil(syncOfflineData());
    }
});

async function syncOfflineData() {
    try {
        // Obtener datos offline del IndexedDB
        const offlineData = await getOfflineData();

        for (const data of offlineData) {
            try {
                await fetch(data.url, {
                    method: data.method,
                    headers: data.headers,
                    body: data.body
                });

                // Si exitoso, eliminar del offline storage
                await deleteOfflineData(data.id);
                console.log('✅ Synced offline data:', data.id);
            } catch (error) {
                console.error('❌ Failed to sync:', data.id, error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push Notifications
self.addEventListener('push', (event) => {
    console.log('📬 Push message received:', event);

    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación de Welcomedly',
        icon: '/images/icons/icon-192x192.png',
        badge: '/images/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver detalles',
                icon: '/images/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: '/images/icons/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Welcomedly', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('📱 Notification click received');

    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/market/market')
        );
    }
});

// IndexedDB helpers para offline storage
async function getOfflineData() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('welcomedly-offline', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['sync-queue'], 'readonly');
            const store = transaction.objectStore('sync-queue');
            const getRequest = store.getAll();

            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        };
    });
}

async function deleteOfflineData(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('welcomedly-offline', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['sync-queue'], 'readwrite');
            const store = transaction.objectStore('sync-queue');
            const deleteRequest = store.delete(id);

            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
    });
}

// Cache cleanup periódico
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_CLEANUP') {
        event.waitUntil(cleanupCache());
    }
});

async function cleanupCache() {
    try {
        const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];

        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();

            // Eliminar entradas viejas (más de 7 días)
            const cutoffDate = Date.now() - (7 * 24 * 60 * 60 * 1000);

            for (const request of requests) {
                const response = await cache.match(request);
                const dateHeader = response?.headers.get('date');

                if (dateHeader && new Date(dateHeader).getTime() < cutoffDate) {
                    await cache.delete(request);
                    console.log('🗑️ Cleaned old cache entry:', request.url);
                }
            }
        }

        console.log('✅ Cache cleanup completed');
    } catch (error) {
        console.error('Cache cleanup failed:', error);
    }
}

console.log('🚀 Service Worker loaded successfully');
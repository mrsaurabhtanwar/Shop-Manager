// Service Worker v3 - Enhanced with stale-while-revalidate and offline indicator
const CACHE_NAME = 'shop-manager-v3';
const OFFLINE_CACHE = 'shop-manager-offline-v3';

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/static/css/dashboard.css',
  '/static/scripts/dashboard.js',
  '/static/scripts/pwa.js',
  '/static/manifest.json',
  '/static/images/icon-192.png',
  // External dependencies
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Routes to cache with stale-while-revalidate
const STALE_WHILE_REVALIDATE_ROUTES = [
  '/orders',
  '/workers',
  '/expenses',
  '/orders/fabric',
  '/orders/tailor',
  '/orders/fabric-tailor'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v3');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Create offline cache
      caches.open(OFFLINE_CACHE).then((cache) => {
        // Add a basic offline response
        return cache.put('/offline', new Response(
          '<html><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        ));
      })
    ]).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v3');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.claim();
      // Notify all clients about new version
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', version: 'v3' });
        });
      });
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Google Sheets API requests - Network First with offline fallback
  if (url.hostname.includes('sheets.googleapis.com')) {
    event.respondWith(networkFirstWithOfflineNotification(request));
    return;
  }

  // App routes - Stale While Revalidate
  if (url.origin === location.origin && 
      (STALE_WHILE_REVALIDATE_ROUTES.some(route => url.pathname.startsWith(route)) || 
       url.pathname === '/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Static assets - Cache First
  if (url.origin === location.origin && url.pathname.startsWith('/static/')) {
    event.respondWith(cacheFirstWithUpdate(request));
    return;
  }

  // External CDN resources - Cache First with long TTL
  if (url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(cacheFirstWithUpdate(request, 86400000)); // 24 hours
    return;
  }

  // Default - Network with cache fallback
  event.respondWith(networkWithCacheFallback(request));
});

// Strategy: Network First with offline notification
async function networkFirstWithOfflineNotification(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Update cache with fresh data
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      
      // Notify client that data is fresh
      notifyClients({ type: 'DATA_FRESH', url: request.url });
      return response;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Notify client that data is stale
      notifyClients({ type: 'DATA_STALE', url: request.url });
      return cachedResponse;
    }
    
    // No cache available - notify client about offline state
    notifyClients({ type: 'OFFLINE', url: request.url });
    throw error;
  }
}

// Strategy: Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh data in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
      // Notify client that fresh data is available
      notifyClients({ type: 'DATA_UPDATED', url: request.url });
    }
    return response;
  }).catch((error) => {
    console.log('Service Worker: Background fetch failed', request.url);
    notifyClients({ type: 'BACKGROUND_SYNC_FAILED', url: request.url });
  });
  
  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Strategy: Cache First with update
async function cacheFirstWithUpdate(request, maxAge = 3600000) { // Default 1 hour
  const cache = await caches.open(CACHE_NAME);
  let cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get('date'));
    const now = new Date();
    
    // If cache is fresh enough, return it
    if (now - cachedDate < maxAge) {
      return cachedResponse;
    }
  }
  
  // Cache is stale or missing, fetch fresh data
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed, return stale cache if available
    if (cachedResponse) {
      notifyClients({ type: 'STALE_DATA', url: request.url });
      return cachedResponse;
    }
    throw error;
  }
}

// Strategy: Network with cache fallback
async function networkWithCacheFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      notifyClients({ type: 'FALLBACK_TO_CACHE', url: request.url });
      return cachedResponse;
    }
    throw error;
  }
}

// Helper function to notify all clients
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

// Background sync for failed requests (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      event.waitUntil(
        // Retry failed requests
        retryFailedRequests()
      );
    }
  });
}

// Retry logic for background sync
async function retryFailedRequests() {
  // Implementation for retrying failed API requests
  console.log('Service Worker: Retrying failed requests');
}

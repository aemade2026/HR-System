// AE (HR-SYSTEM) - Service Worker (PWA)
const CACHE_NAME = 'ae-hr-system-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './api.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './icon.svg'
];

// Install: Cache app shell and static core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core offline assets v2...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up previous cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Serve from cache when available, stale-while-revalidate for local assets
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only intercept GET requests
  if (req.method !== 'GET') {
    return;
  }

  const url = new URL(req.url);

  // Bypass cache for Supabase backend and REST API requests to ensure real-time data sync
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1/')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch update in background for next visit (Stale-While-Revalidate)
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
          }
        }).catch(() => {
          // Offline, cachedResponse already served
        });
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Cache local assets or external CDN fonts/scripts
        const isCdn = url.hostname.includes('cdnjs') || 
                      url.hostname.includes('fonts.googleapis.com') || 
                      url.hostname.includes('fonts.gstatic.com') || 
                      url.hostname.includes('cdn.jsdelivr.net');

        if (networkResponse.type === 'basic' || isCdn) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }

        return networkResponse;
      }).catch(() => {
        // Fallback to cached index.html if navigating while offline
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

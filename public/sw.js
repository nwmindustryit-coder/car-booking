const CACHE_NAME = 'car-booking-final-v1';

const ASSETS_TO_CACHE = [
  '/favicon.ico',
  '/logo.png',
  '/manifest.json'
];

// Install Event: Cache only core assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event: Clear ALL old caches to start fresh
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Strict Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 1. DYNAMIC CONTENT: Always Network-Only (No caching for pages/API)
  // We want users to see real-time data always when online.
  if (
    event.request.mode === 'navigate' || 
    url.pathname.startsWith('/api/') ||
    url.pathname === '/' ||
    url.pathname.length > 1 // Any subpages
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Only if network fails completely, try to find a cached version
        return caches.match(event.request);
      })
    );
    return;
  }

  // 2. STATIC ASSETS: Cache-First (Images, Next.js internal chunks)
  // These are safe to cache because Next.js uses hashes in filenames for updates.
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok && event.request.url.startsWith('http')) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
        }
        return networkResponse;
      });
    })
  );
});

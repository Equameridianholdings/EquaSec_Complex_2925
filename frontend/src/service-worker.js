// This is a basic service worker for Angular PWA support.
// For production, use Angular's ngsw-worker.js or customize as needed.
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) return response;
        // Otherwise, try network fetch
        return fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return a fallback (optional)
        // For navigation requests, you could return a fallback HTML page
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        // For other requests, just fail silently
        return Response.error();
      })
  );
});

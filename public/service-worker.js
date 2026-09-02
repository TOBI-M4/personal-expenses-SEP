const CACHE_NAME = "expense-tracker-cache-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const oldCaches = cacheNames.filter(
        (cacheName) => cacheName !== CACHE_NAME
      );

      return Promise.all(
        oldCaches.map((cacheName) => caches.delete(cacheName))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Only handle http/https requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // Skip external APIs (like Supabase, fonts, etc.) to avoid caching dynamic database/auth requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // In development, skip service worker caching for hot-reloads and sockjs
  if (url.pathname.includes("ws") || url.pathname.includes("sockjs-node") || url.pathname.includes("hot-update")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache).catch(() => {});
        });

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // If navigating to a route and offline, return cached root index.html
        if (event.request.mode === "navigate") {
          const indexCached = await caches.match("/index.html");
          if (indexCached) return indexCached;
        }
        return new Response("Network error occurred", { status: 503, statusText: "Service Unavailable" });
      })
  );
});

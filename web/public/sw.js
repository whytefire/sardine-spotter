// Bumped to force re-install when the fetch handler changes.
const CACHE_NAME = "sardine-spotter-v5.0.0";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  "/manifest.json",
  OFFLINE_URL,
  "/icons/icon-192-maskable.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Only intercept HTML navigations (top-level page loads), and ONLY in production.
// In dev, Turbopack constantly creates/aborts script and HMR fetches; intercepting
// them turns aborted requests into hung pages. Everything that isn't a navigation
// is left to the browser entirely (return without calling respondWith).
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch:
  //   - non-GET requests
  //   - API calls (always live)
  //   - Next.js internals (/_next/*, hot-reloader, RSC, source maps, etc.)
  //   - anything that isn't a top-level navigation
  if (request.method !== "GET") return;
  if (request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;

  // Don't intercept on localhost dev servers — HMR is more important than
  // offline support while iterating, and Next dev breaks if the SW caches
  // a stale HTML document.
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return;

  // Production: network-first with cache fallback for navigation requests.
  // Falls through to the precached /offline.html when both network and cache
  // miss, so the user sees a branded "you're offline" screen instead of a
  // raw browser chrome error.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
      })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Sardine Spotter", body: event.data.text() };
  }

  const options = {
    body: data.body || "New sardine sighting near you!",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-72.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "sardine-sighting",
    renotify: true,
    data: data.data || {},
    actions: [
      { action: "view", title: "View Sighting" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Sardine Spotter",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/app";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/app") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

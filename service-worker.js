// Minimal service worker: keeps a copy of the app shell for offline use, but
// always prefers the network when it's available — so pushing a new
// index.html actually reaches returning visitors instead of them being stuck
// on whatever was cached the first time they opened the site.
const CACHE_NAME = "mondial2026-shell-v3";
const SHELL_FILES = [
  "./",
  "./config.js",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Live data: always go to the network, never serve a cached/stale bracket.
  if (url.pathname.endsWith("data/bracket.json")) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // App shell: network-first. Try the network so updates show up immediately;
  // only fall back to the cached copy if the network request fails (offline).
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

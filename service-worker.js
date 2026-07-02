// Minimal service worker: keeps a copy of the app shell for offline use, but
// always prefers the network when it's available — so pushing a new
// index.html actually reaches returning visitors instead of them being stuck
// on whatever was cached the first time they opened the site.
const CACHE_NAME = "mondial2026-shell-v4";
const LIVE_DATA_URL = "https://world-cup-data.pointvirgule.dev/bracket.json";
const SHELL_FILES = [
  "./",
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

  // Server-Sent Events stream (real-time bracket updates): never intercept it.
  // It's a long-lived streaming response — trying to cache/clone it would break
  // the connection. Let the browser talk to the network directly.
  if (url.pathname === "/events" ||
      event.request.headers.get("accept") === "text/event-stream") {
    return;
  }

  // Live data: always go to the network, never serve a cached/stale bracket.
  if (url.origin + url.pathname === LIVE_DATA_URL) {
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

// ---------------------------------------------------------------------------
// Web Push (Phase 2)
// The data server sends a notification to followers of a team on kickoff and
// full-time. The payload is a JSON string { title, body, ... }; we fall back to
// generic text if it can't be parsed so a malformed push still shows something.
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: "Mondial 2026", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Mondial 2026";
  const options = {
    body: payload.body || "",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: "wc2026-match",
    data: { url: "./index.html" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus an already-open tab if there is one, otherwise open the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

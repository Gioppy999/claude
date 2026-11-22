// Germoglio: prima la rete, se manca usa la copia salvata. I dati (/api) non si salvano qui.
const CACHE = "germoglio-v3";
const BASE = ["/", "/index.html", "/piano.json", "/manifest.json", "/icon-192.png", "/icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("/"))));
});
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data.json() } catch { d = { title: "Germoglio", body: e.data ? e.data.text() : "" } }
  e.waitUntil(self.registration.showNotification(d.title || "Germoglio", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", tag: "germoglio", renotify: true }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => { for (const w of ws) { if ("focus" in w) return w.focus() } return clients.openWindow("/") }));
});

const CACHE = "roast-journal-v62";
const ASSETS = ["./", "./index.html", "./styles.css?v=62", "./app.js?v=62", "./manifest.webmanifest?v=62", "./icon-roastlog.png?v=62", "./feedback-qr.png?v=62", "./app-qr.png?v=62", "./version.json?v=62"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});

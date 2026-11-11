const CACHE = "arerps-v1";
const CORE = ["./", "index.html", "css/style.css", "js/data.js", "js/app.js", "js/scene.js", "manifest.webmanifest", "assets/icon.svg", "vendor/three/three.module.js", "vendor/three/addons/controls/OrbitControls.js", "vendor/three/addons/environments/RoomEnvironment.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
// Network first so updates show up; fall back to cache when offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

const CACHE = "arerps-v2";
const CORE = ["./", "index.html", "css/style.css", "js/data.js", "js/app.js", "js/scene.js", "manifest.webmanifest", "assets/icon.svg", "vendor/three/three.module.js", "vendor/three/addons/controls/OrbitControls.js", "vendor/three/addons/environments/RoomEnvironment.js", "play.html", "css/play.css", "game/play.js", "game/world.js", "systems/admin/AdminPanel.js", "systems/audio/AmbientAudio.js", "systems/controls/PlayerControls.js", "systems/fire/FireSystem.js", "systems/weather/WeatherFX.js", "systems/weather/WeatherSystem.js", "systems/wheel/WheelMenu.js", "vendor/three/addons/postprocessing/EffectComposer.js", "vendor/three/addons/postprocessing/MaskPass.js", "vendor/three/addons/postprocessing/OutputPass.js", "vendor/three/addons/postprocessing/Pass.js", "vendor/three/addons/postprocessing/RenderPass.js", "vendor/three/addons/postprocessing/ShaderPass.js", "vendor/three/addons/postprocessing/UnrealBloomPass.js", "vendor/three/addons/shaders/CopyShader.js", "vendor/three/addons/shaders/LuminosityHighPassShader.js", "vendor/three/addons/shaders/OutputShader.js"];

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

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("scene");
try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b14);
  scene.fog = new THREE.FogExp2(0x070b14, 0.028);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(6, 2.6, 8);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, -0.4, 0);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.7;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;

  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, ...o });
  const slate = mat(0x4a5361, { metalness: 0.6, roughness: 0.45 });
  const navy = mat(0x0f1d3d, { metalness: 0.5, roughness: 0.4 });
  const glass = mat(0x0a1220, { metalness: 0.9, roughness: 0.08 });
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f8, metalness: 0.7, roughness: 0.25, clearcoat: 1 });
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  };

  // Ground, road and lane markings
  const road = add(scene, new THREE.PlaneGeometry(60, 60), mat(0x10141c, { roughness: 0.55, metalness: 0.3 }));
  road.rotation.x = -Math.PI / 2; road.castShadow = false;
  for (let i = -5; i <= 5; i++) {
    const d = add(scene, new THREE.BoxGeometry(0.15, 0.01, 1.4), mat(0xffffff, { emissive: 0x444444 }), 0, 0.01, i * 3);
    d.castShadow = false;
  }

  // Chattanooga-style skyline blocks with lit windows
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, r = 18 + rnd() * 8;
    const h = 4 + rnd() * 16, w = 2 + rnd() * 3;
    const b = add(scene, new THREE.BoxGeometry(w, h, w), mat(0x141c2c, { roughness: 0.6, metalness: 0.4 }), Math.cos(a) * r, h / 2, Math.sin(a) * r);
    const win = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h * 0.8, w + 0.02), mat(0x0, { emissive: 0x2e7bff, emissiveIntensity: 0.25 + rnd() * 0.3, wireframe: true }));
    win.position.copy(b.position); scene.add(win);
  }

  // Patrol vehicle
  const car = new THREE.Group();
  add(car, new THREE.BoxGeometry(4.4, 0.7, 1.9), paint, 0, 0.7, 0);
  add(car, new THREE.BoxGeometry(2.2, 0.65, 1.7), glass, -0.2, 1.3, 0);
  add(car, new THREE.BoxGeometry(4.42, 0.32, 1.92), navy, 0, 0.55, 0);
  add(car, new THREE.BoxGeometry(0.3, 0.18, 1.7), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.5 }), 2.2, 0.8, 0);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 28);
  [[-1.4, .9], [1.4, .9], [-1.4, -.9], [1.4, -.9]].forEach(([x, z]) => {
    const w = add(car, wheelGeo, mat(0x0b0b0d, { roughness: 0.8 }), x, 0.42, z);
    w.rotation.x = Math.PI / 2;
  });
  const barBlue = mat(0x2e7bff, { emissive: 0x2e7bff, emissiveIntensity: 0 });
  const barRed = mat(0xff2d4a, { emissive: 0xff2d4a, emissiveIntensity: 0 });
  const barWhite = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0 });
  add(car, new THREE.BoxGeometry(0.4, 0.14, 0.7), barBlue, -0.5, 1.7, -0.45);
  add(car, new THREE.BoxGeometry(0.4, 0.14, 0.7), barRed, -0.5, 1.7, 0.45);
  add(car, new THREE.BoxGeometry(0.3, 0.12, 0.3), barWhite, -0.5, 1.7, 0);
  const lBlue = new THREE.PointLight(0x2e7bff, 0, 14); lBlue.position.set(-0.5, 2.1, -0.6); car.add(lBlue);
  const lRed = new THREE.PointLight(0xff2d4a, 0, 14); lRed.position.set(-0.5, 2.1, 0.6); car.add(lRed);
  car.position.set(-1.8, 0, 0);
  scene.add(car);

  // SPRAID unit (slate body, navy trim, electric-blue accents)
  const droid = new THREE.Group();
  const accent = mat(0x2e7bff, { emissive: 0x2e7bff, emissiveIntensity: 1.2 });
  add(droid, new THREE.BoxGeometry(0.7, 0.9, 0.4), slate, 0, 1.4, 0);
  add(droid, new THREE.BoxGeometry(0.72, 0.25, 0.42), navy, 0, 1.15, 0);
  add(droid, new THREE.SphereGeometry(0.22, 24, 16), slate, 0, 2.1, 0);
  add(droid, new THREE.BoxGeometry(0.3, 0.07, 0.05), accent, 0, 2.12, 0.2);
  add(droid, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20), accent, 0, 1.5, 0.21).rotation.x = Math.PI / 2;
  [-1, 1].forEach((s) => {
    add(droid, new THREE.BoxGeometry(0.22, 0.2, 0.3), navy, s * 0.5, 1.8, 0);
    add(droid, new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), s < 0 ? barBlue : barRed, s * 0.5, 1.95, 0);
    add(droid, new THREE.BoxGeometry(0.18, 0.8, 0.2), slate, s * 0.55, 1.35, 0);
    add(droid, new THREE.BoxGeometry(0.22, 0.85, 0.25), slate, s * 0.2, 0.45, 0);
    add(droid, new THREE.BoxGeometry(0.26, 0.12, 0.4), navy, s * 0.2, 0.06, 0.05);
  });
  droid.position.set(2.2, 0, 1.2);
  droid.rotation.y = -0.6;
  scene.add(droid);

  scene.add(new THREE.HemisphereLight(0x6f8cff, 0x080a10, 0.5));
  const sun = new THREE.DirectionalLight(0xbcd0ff, 1.1);
  sun.position.set(6, 10, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  scene.add(sun);

  // Rain
  const N = 600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 30; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = (Math.random() - .5) * 30; }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x9db0d3, size: 0.04, transparent: true, opacity: 0.5 }));
  scene.add(rain);

  // Light modes: 0 Solid, 1 SlowFlash, 2 MedFlash, 3 FullFlash, 4 Pursuit (blue/red/white only)
  let mode = 0;
  addEventListener("arerps-lightmode", (e) => { mode = e.detail; });
  function lights(t) {
    const hz = [0, 1, 2.5, 6, 3][mode];
    let b, r, w = 0;
    if (mode === 0) { b = r = 1; }
    else { const ph = Math.floor(t * hz * 2) % 2; b = ph ? 1 : 0; r = ph ? 0 : 1; }
    if (mode === 4) w = Math.floor(t * 9) % 3 === 0 ? 1 : 0;
    barBlue.emissiveIntensity = b * 4; barRed.emissiveIntensity = r * 4; barWhite.emissiveIntensity = w * 4;
    lBlue.intensity = b * 60; lRed.intensity = r * 60;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = Math.max(8, 8 + (1 - w / h) * 6);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    lights(t);
    if (!reduce) {
      const p = rainGeo.attributes.position;
      for (let i = 0; i < N; i++) { let y = p.getY(i) - 0.15; if (y < 0) y = 14; p.setY(i, y); }
      p.needsUpdate = true;
    }
    controls.update();
    renderer.render(scene, camera);
  });
} catch (err) {
  // No WebGL: the page still works, the hero just shows the gradient background.
  console.warn("3D scene unavailable:", err);
}

// ARERPS Game: wires weather, fire, wheel, admin panel, audio and controls into one playable world.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildWorld, height, ground } from "./world.js";
import { WeatherSystem } from "../systems/weather/WeatherSystem.js";
import { WeatherFX } from "../systems/weather/WeatherFX.js";
import { FireSystem } from "../systems/fire/FireSystem.js";
import { WheelMenu } from "../systems/wheel/WheelMenu.js";
import { AdminPanel } from "../systems/admin/AdminPanel.js";
import { AmbientAudio } from "../systems/audio/AmbientAudio.js";
import { PlayerControls } from "../systems/controls/PlayerControls.js";

const $ = (s) => document.querySelector(s);
const touch = matchMedia("(pointer:coarse)").matches;
const qp = new URLSearchParams(location.search);
let quality = qp.get("q") || localStorage.getItem("arerps.q") || (touch ? "low" : "high");

const canvas = $("#c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === "high", powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality === "high" ? 2 : 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .35;
const camera = new THREE.PerspectiveCamera(60, 1, .1, 3000);
const U = { uTime: { value: 0 }, uWind: { value: .1 }, uWave: { value: .15 } };

const world = buildWorld(scene, U, quality);
const weather = new WeatherSystem();
const fx = new WeatherFX(scene, camera, weather, U);
const fire = new FireSystem(scene);
const audio = new AmbientAudio();
world.buildings.forEach((b) => fire.registerBuilding(b));
fire.registerFuel(world.fuelPositions);

const controls = new PlayerControls(canvas, camera, { joyPad: $("#joy"), joyKnob: $("#joyKnob"), onMode: (v) => { $("#btnFps").classList.toggle("on", v); audio.fps = v; syncMask(); } },
  { height, ground, colliders: world.colliders });
scene.add(controls.avatar);

// ---------- Post-processing (glow) ----------
let composer = null;
function setupComposer() {
  composer = null; if (quality !== "high") return;
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .5, .7, .85)); composer.addPass(new OutputPass());
}
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); composer && composer.setSize(innerWidth, innerHeight); }
addEventListener("resize", resize); setupComposer(); resize();

// ---------- UI helpers ----------
function toast(msg, red) {
  const t = document.createElement("div"); t.className = "toast" + (red ? " red" : ""); t.textContent = msg; $("#toasts").append(t); setTimeout(() => t.remove(), 6000);
  while ($("#toasts").children.length > 4) $("#toasts").firstChild.remove();
}
const eq = { tool: null, mask: false, armor: false, light: false, drone: null, droid: null, droidMode: "follow" };
function syncMask() { $("#mask").hidden = !(eq.mask && controls.fps); audio.mask = eq.mask; controls.maskMesh.visible = eq.mask; }

// ---------- Strikes, fire & dispatch ----------
const flashEl = $("#flash");
function whiteFlash(a) { flashEl.style.transition = "none"; flashEl.style.opacity = a; requestAnimationFrame(() => { flashEl.style.transition = "opacity 1.2s"; flashEl.style.opacity = 0; }); }
function pickBuilding() { return world.buildings[Math.floor(Math.random() * world.buildings.length)]; }
function strike(kind) {
  let p, dist;
  if (kind === "player") { p = controls.pos.clone(); }
  else if (kind === "building") { const b = pickBuilding(); p = new THREE.Vector3(b.center.x + (Math.random() - .5) * 20, b.top, b.center.z); strike.b = b; }
  else { const a = Math.random() * 6.28, r = 40 + Math.random() * 260; p = new THREE.Vector3(controls.pos.x + Math.cos(a) * r, 0, controls.pos.z + Math.sin(a) * r); p.y = Math.max(0, height(p.x, p.z)); }
  fx.bolt(p); dist = p.distanceTo(controls.pos);
  audio.thunder(dist / 343);
  if (dist < 90) fx.shake = Math.max(fx.shake, .25);
  if (kind === "player") { whiteFlash(1); controls.stun = 3; toast("⚡ You were struck by lightning! (very rare)", true); }
  else if (kind === "building") {
    const b = strike.b; toast("⚡ Lightning hit " + b.name + "!", true);
    if (Math.random() < .85) fire.igniteBuilding(b);
  } else {
    const near = world.fuelPositions.filter((q) => q.distanceTo(p) < 12);
    if (near.length && weather.eff.rain < .6 && Math.random() < .15) { fire.ignite(near[0], { size: .8 }); toast("🌳 Lightning started a brush fire.", true); }
  }
}
weather.on("strike", ({ kind }) => strike(kind));
fire.on("structure", (b) => { toast("🚒 DISPATCH: Structure fire at " + b.name + ". Fire & Rescue respond!", true); });
fire.on("wildfire", () => toast("🔥 DISPATCH: Wildfire reported. All fire units respond!", true));
fire.on("charred", (b) => b.mats.forEach((m) => m.color.multiplyScalar(.35)));
fire.on("allout", () => toast("✅ All fires are out."));
weather.on("disaster", ({ name, on }) => {
  toast((on ? "⚠ ADMIN started: " : "Admin ended: ") + name, on);
  if (name === "wildfire" && on) { const c = world.fuelPositions[Math.floor(Math.random() * world.fuelPositions.length)]; fire.wildfire(c || controls.pos, 60); weather.stopDisaster("wildfire"); }
  if (name === "earthquake" && !on && Math.random() < .3) fire.igniteBuilding(pickBuilding());
  if (name === "tornado" && on) toast("🌪 Tornado warning! Take cover.", true);
});

// ---------- Tools: hose / extinguisher ----------
const WN = 260, wp = new Float32Array(WN * 3), wv = new Float32Array(WN * 3), wl = new Float32Array(WN).fill(-1);
const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.BufferAttribute(wp, 3));
const water = new THREE.Points(wg, new THREE.PointsMaterial({ color: 0xcfeaff, size: .22, transparent: true, opacity: .85, depthWrite: false })); water.frustumCulled = false; scene.add(water);
let wi = 0, using = false;
const origin = new THREE.Vector3(), dir = new THREE.Vector3();
function useTool(dt) {
  const hose = eq.tool === "hose" || eq.tool === "extinguisher";
  audio.spray(using && hose);
  if (using && hose) {
    dir.copy(controls.dir); origin.copy(controls.head); origin.y -= .35; origin.addScaledVector(dir, .6);
    const spd = eq.tool === "hose" ? 20 : 13;
    for (let k = 0; k < 4; k++) {
      const i = wi++ % WN; wp.set([origin.x, origin.y, origin.z], i * 3);
      wv.set([dir.x * spd + (Math.random() - .5) * 1.2, dir.y * spd + (Math.random() - .5) * 1.2 + 2, dir.z * spd + (Math.random() - .5) * 1.2], i * 3); wl[i] = 1.2;
    }
    fire.spray(origin, dir.clone().normalize(), dt, eq.tool === "hose" ? 1.4 : .7);
  }
  for (let i = 0; i < WN; i++) {
    if (wl[i] < 0) { wp[i * 3 + 1] = -999; continue; } wl[i] -= dt; wv[i * 3 + 1] -= 9.8 * dt;
    wp[i * 3] += wv[i * 3] * dt; wp[i * 3 + 1] += wv[i * 3 + 1] * dt; wp[i * 3 + 2] += wv[i * 3 + 2] * dt;
    if (wp[i * 3 + 1] < height(wp[i * 3], wp[i * 3 + 2])) wl[i] = -1;
  }
  wg.attributes.position.needsUpdate = true;
}
const useBtn = $("#btnUse");
useBtn.addEventListener("pointerdown", (e) => { using = true; useBtn.classList.add("down"); useBtn.setPointerCapture(e.pointerId); e.stopPropagation(); });
useBtn.addEventListener("pointerup", () => { using = false; useBtn.classList.remove("down"); });
useBtn.addEventListener("pointercancel", () => { using = false; useBtn.classList.remove("down"); });
addEventListener("keydown", (e) => { if (e.code === "Space") using = true; if (e.code === "KeyQ" || e.code === "Tab") { e.preventDefault(); wheel.toggle(wheelItems); } });
addEventListener("keyup", (e) => { if (e.code === "Space") using = false; });

// ---------- Flashlight, SPRAID droid + drone ----------
const flash = new THREE.SpotLight(0xfff4dd, 0, 60, .5, .5, 1.2); scene.add(flash, flash.target);
function makeDroid() {
  const g = new THREE.Group(), m = (c, me = .6, r = .45) => new THREE.MeshStandardMaterial({ color: c, metalness: me, roughness: r });
  const part = (geo, mt, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  part(new THREE.BoxGeometry(.8, 1, .45), m(0x4a5361), 0, 1.4, 0); part(new THREE.BoxGeometry(.82, .3, .47), m(0x0f1d3d), 0, 1.0, 0);
  part(new THREE.SphereGeometry(.26, 20, 14), m(0x4a5361), 0, 2.1, 0);
  const visor = part(new THREE.BoxGeometry(.34, .08, .06), new THREE.MeshStandardMaterial({ color: 0x2e7bff, emissive: 0x2e7bff, emissiveIntensity: 2 }), 0, 2.12, .24);
  const lb = new THREE.MeshStandardMaterial({ color: 0x2e7bff, emissive: 0x2e7bff, emissiveIntensity: 3 }), lr = new THREE.MeshStandardMaterial({ color: 0xff2d4a, emissive: 0xff2d4a, emissiveIntensity: 3 });
  part(new THREE.CylinderGeometry(.08, .08, .12, 12), lb, -.55, 2.0, 0); part(new THREE.CylinderGeometry(.08, .08, .12, 12), lr, .55, 2.0, 0);
  [-1, 1].forEach((s) => { part(new THREE.BoxGeometry(.2, .9, .22), m(0x4a5361), s * .6, 1.35, 0); part(new THREE.BoxGeometry(.28, .95, .3), m(0x4a5361), s * .22, .48, 0); part(new THREE.BoxGeometry(.3, .12, .46), m(0x0f1d3d), s * .22, .06, .05); });
  g.userData = { lb, lr }; return g;
}
function makeDrone() {
  const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(.35, .4, .18, 16), new THREE.MeshStandardMaterial({ color: 0x4a5361, metalness: .7, roughness: .4 })); g.add(body);
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .02, 16), new THREE.MeshStandardMaterial({ color: 0x111 })); r.position.set(a * .5, .1, b * .5); r.userData.rotor = true; g.add(r); });
  const led = new THREE.Mesh(new THREE.SphereGeometry(.07), new THREE.MeshStandardMaterial({ color: 0xff2d4a, emissive: 0xff2d4a, emissiveIntensity: 4 })); led.position.y = -.12; g.add(led); g.userData.led = led; return g;
}
function droidAI(t, dt) {
  const d = eq.droid;
  if (d) {
    let tx, tz;
    if (eq.droidMode === "follow") { tx = controls.pos.x - Math.sin(controls.yaw) * -2 + 1.6; tz = controls.pos.z - Math.cos(controls.yaw) * -2 + 1.6; }
    else if (eq.droidMode === "fire" && fire.fires[0]) { tx = fire.fires[0].pos.x - 5; tz = fire.fires[0].pos.z + 5; } else { tx = d.position.x; tz = d.position.z; }
    const dx = tx - d.position.x, dz = tz - d.position.z, l = Math.hypot(dx, dz);
    if (l > 2.2) { const s = Math.min(l - 2, 6 * dt); d.position.x += dx / l * s; d.position.z += dz / l * s; d.rotation.y = Math.atan2(dx, dz); }
    d.position.y = Math.max(height(d.position.x, d.position.z), ground(d.position.x, d.position.z));
    const ph = Math.floor(t * 4) % 2; d.userData.lb.emissiveIntensity = ph ? 4 : .2; d.userData.lr.emissiveIntensity = ph ? .2 : 4;
  }
  const dr = eq.drone;
  if (dr) {
    const tgt = fire.fires[0] ? fire.fires[0].pos : controls.pos; const hx = tgt.x, hz = tgt.z;
    const a = t * .6, cx = hx + Math.cos(a) * 6, cz = hz + Math.sin(a) * 6, cy = Math.max(height(hx, hz), tgt.y || 0) + 12;
    dr.position.x += (cx - dr.position.x) * Math.min(1, dt * 1.2); dr.position.z += (cz - dr.position.z) * Math.min(1, dt * 1.2); dr.position.y += (cy - dr.position.y) * Math.min(1, dt * 1.2);
    dr.children.forEach((c) => c.userData.rotor && (c.rotation.y += dt * 60)); dr.userData.led.material.emissiveIntensity = Math.floor(t * 3) % 2 ? 5 : .5;
  }
}

// ---------- Radial wheel ----------
const setTool = (t) => { eq.tool = eq.tool === t ? null : t; toast(eq.tool ? "Equipped: " + t : "Tool put away"); renderTags(); };
const toggle = (k, label) => () => { eq[k] = !eq[k]; toast(label + (eq[k] ? " ON" : " OFF")); if (k === "mask") syncMask(); renderTags(); };
const wheelItems = [
  { icon: "🧰", label: "Tools", children: [
    { icon: "🚒", label: "Fire Hose", active: () => eq.tool === "hose", action: () => setTool("hose") },
    { icon: "🧯", label: "Extinguisher", active: () => eq.tool === "extinguisher", action: () => setTool("extinguisher") },
    { icon: "🔦", label: "Flashlight", active: () => eq.light, action: toggle("light", "Flashlight") },
    { icon: "🪓", label: "Fire Axe", active: () => eq.tool === "axe", action: () => setTool("axe") },
    { icon: "📻", label: "Radio", active: () => eq.tool === "radio", action: () => { setTool("radio"); toast("📻 Dispatch: " + (fire.count ? fire.count + " active fire(s) in the city." : "All clear.")); } }] },
  { icon: "🛡️", label: "Weapons (RP)", children: [
    { icon: "⚡", label: "Taser", active: () => eq.tool === "taser", action: () => setTool("taser") },
    { icon: "🏏", label: "Baton", active: () => eq.tool === "baton", action: () => setTool("baton") },
    { icon: "🔫", label: "Sidearm", active: () => eq.tool === "sidearm", action: () => setTool("sidearm") }] },
  { icon: "😷", label: "Equipment", children: [
    { icon: "😷", label: "SCBA Mask", active: () => eq.mask, action: toggle("mask", "SCBA mask") },
    { icon: "⛑️", label: "Helmet", active: () => true, action: () => toast("Helmet worn") }] },
  { icon: "🦺", label: "Body Armor", children: [
    { icon: "🦺", label: "Armor Vest", active: () => eq.armor, action: toggle("armor", "Body armor") }] },
  { icon: "🤖", label: "SPRAID", children: [
    { icon: "🤖", label: "Deploy Unit", active: () => !!eq.droid, action: () => { if (eq.droid) { scene.remove(eq.droid); eq.droid = null; toast("SPRAID unit recalled"); } else { eq.droid = makeDroid(); eq.droid.position.copy(controls.pos).add(new THREE.Vector3(2, 0, 2)); scene.add(eq.droid); toast("SPRAID Unit 09 deployed"); } } },
    { icon: "🚁", label: "Drone", active: () => !!eq.drone, action: () => { if (eq.drone) { scene.remove(eq.drone); eq.drone = null; toast("Drone docked"); } else { eq.drone = makeDrone(); eq.drone.position.copy(controls.pos).add(new THREE.Vector3(0, 8, 0)); scene.add(eq.drone); toast("Deployment drone launched. It orbits fires."); } } },
    { icon: "➡️", label: "Follow", active: () => eq.droidMode === "follow", action: () => { eq.droidMode = "follow"; toast("SPRAID: following"); }, keepOpen: true },
    { icon: "🔥", label: "Go to Fire", active: () => eq.droidMode === "fire", action: () => { eq.droidMode = "fire"; toast("SPRAID: responding to fire"); }, keepOpen: true },
    { icon: "✋", label: "Hold", active: () => eq.droidMode === "hold", action: () => { eq.droidMode = "hold"; toast("SPRAID: holding position"); }, keepOpen: true }] }
];
const wheel = new WheelMenu($("#wheel"));
$("#btnWheel").addEventListener("click", () => wheel.toggle(wheelItems));
$("#btnFps").addEventListener("click", () => controls.setFps(!controls.fps));

// ---------- Menu + Admin ----------
const admin = new AdminPanel($("#admin"), weather, {
  igniteBuilding: () => { fire.igniteBuilding(pickBuilding()); }, wildfire: () => { const c = world.fuelPositions[Math.floor(Math.random() * world.fuelPositions.length)]; fire.wildfire(c || controls.pos, 60); },
  extinguishAll: () => fire.extinguishAll(), strike: (k) => strike(k), toast
});
$("#btnMenu").addEventListener("click", () => ($("#menu").hidden = false));
$("#menuClose").addEventListener("click", () => ($("#menu").hidden = true));
$("#menuAdmin").addEventListener("click", () => { $("#menu").hidden = true; admin.open(); });
const qBtn = $("#menuQuality"); const qLabel = () => (qBtn.textContent = "Graphics: " + (quality === "high" ? "High (bloom, big forest)" : "Mobile-friendly") + " – tap to switch (reloads)");
qLabel(); qBtn.addEventListener("click", () => { localStorage.setItem("arerps.q", quality === "high" ? "low" : "high"); location.reload(); });

const tp = (x, z) => { controls.pos.set(x, 0, z); $("#menu").hidden = true; };
$("#tpCampus").addEventListener("click", () => tp(0, 52));
$("#tpDispatch").addEventListener("click", () => tp(world.dispatch.position.x - 7, world.dispatch.position.z + hzOut()));
const hzOut = () => 19;
// ---------- HUD ----------
function renderTags() {
  const t = [];
  if (eq.tool) t.push(`<span>🛠 ${eq.tool}</span>`); if (eq.mask) t.push("<span>😷 SCBA</span>"); if (eq.armor) t.push("<span>🦺 Armor</span>"); if (eq.light) t.push("<span>🔦 Light</span>");
  if (fire.count) t.push(`<span class="red">🔥 ${fire.count} fire${fire.count > 1 ? "s" : ""}</span>`);
  $("#hudTags").innerHTML = t.join("");
}
let hudT = 0;

// ---------- Main loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime; U.uTime.value = t;
  weather.update(dt); controls.update(dt);
  if (fx.shake > 0) camera.position.add(new THREE.Vector3((Math.random() - .5), (Math.random() - .5), (Math.random() - .5)).multiplyScalar(fx.shake * .3));
  fx.update(dt, controls.pos); world.update(t, dt); fire.update(dt, camera.position);
  world.setNight(Math.min(1, fx.night + weather.eff.storm * .35 * (1 - fx.night)));
  world.waterY(fx.waterRise);
  useTool(dt); droidAI(t, dt); syncMask();
  flash.intensity = eq.light ? 900 : 0; if (eq.light) { flash.position.copy(camera.position); flash.target.position.copy(camera.position).addScaledVector(controls.dir, 20); }
  renderer.toneMappingExposure = .9 + fx.night * .15;
  audio.setWeather(weather.eff, weather.gust); audio.quake(fx.shake > .05 ? fx.shake : 0); audio.update();
  hudT -= dt; if (hudT < 0) {
    hudT = .5; const h = Math.floor(weather.time), m = Math.floor((weather.time % 1) * 60);
    $("#hudInfo").innerHTML = `🕒 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} · ☁ ${weather.preset}<br>💨 wind ${(weather.gust * 40).toFixed(0)} mph`;
    renderTags();
    const inc = [], seen = new Set();
    fire.fires.forEach((f) => { const k = f.building ? f.building.name : "Wildfire"; if (seen.has(k)) return; seen.add(k); inc.push({ id: "23-" + (1050 + inc.length), label: (f.building ? "Structure fire " : "") + k, units: f.building ? "E1, E2, M1" : "E3, R1", x: f.pos.x, z: f.pos.z }); });
    world.dispatch.setIncidents(inc);
  }
  composer ? composer.render() : renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

$("#loadMsg").textContent = `World ready · ${world.treeCount} trees · ${quality === "high" ? "High" : "Mobile"} graphics`;
$("#btnStart").addEventListener("click", () => { audio.start(); $("#start").remove(); });
window.__arerps = { renderer, frame, weather, fire, controls, world, fx, scene, camera, strike, eq };

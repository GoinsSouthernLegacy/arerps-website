// ARERPS Staff Truck: blue/gold pickup (police-package style), drivable ONLY when the Admin Panel is unlocked.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC or Xbox engines.
// NOTE: the admin check is client-side; a real multiplayer server must verify staff before allowing driving.
import * as THREE from "three";

function tex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

function star(g, x, y, r) {
  g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 - 1.57, rr = i % 2 ? r * .62 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath();
  g.fillStyle = "#f2c230"; g.fill(); g.strokeStyle = "#7a5a10"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#12263a"; g.beginPath(); g.arc(x, y, r * .5, 0, 6.3); g.fill(); g.fillStyle = "#f2c230"; g.font = `bold ${r * .26}px system-ui`; g.textAlign = "center"; g.fillText("ARERPS", x, y + r * .09);
}
function livery(g, w, h) {
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#2d62c9"); bg.addColorStop(.6, "#1c3f94"); bg.addColorStop(1, "#0d1a33"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = "#f2c230"; g.beginPath(); g.moveTo(0, h * .42); g.lineTo(w * .55, h * .3); g.lineTo(w, h * .36); g.lineTo(w, h * .5); g.lineTo(w * .5, h * .46); g.lineTo(0, h * .58); g.closePath(); g.fill();
  g.fillStyle = "#4aa3ff"; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w * (.78 + i * .05), h * .25); g.lineTo(w * (.9 + i * .03), h * .95); g.lineTo(w * (.88 + i * .03), h * .95); g.closePath(); g.fill(); }
}
function sideTex(flip) {
  return tex(1024, 256, (g, w, h) => {
    livery(g, w, h); if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    g.save(); if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    star(g, 150, 140, 62);
    g.textAlign = "left"; g.fillStyle = "#10203a"; g.font = "bold 62px system-ui"; g.fillText("A.R.E.R.P.S. DEVELOPMENT", 238, 128); g.fillStyle = "#fff"; g.font = "bold 46px system-ui"; g.fillText("STAFF MEMBER", 240, 188);
    g.restore();
  });
}
const tailTex = () => tex(512, 160, (g, w, h) => { g.fillStyle = "#0d1a33"; g.fillRect(0, 0, w, h); g.fillStyle = "#f2c230"; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8); g.textAlign = "center"; g.font = "bold 50px system-ui"; g.fillText("A.R.E.R.P.S.", w / 2, 70); g.fillStyle = "#fff"; g.font = "bold 46px system-ui"; g.fillText("C.E.O.", w / 2, 128); });
const hoodTex = () => tex(512, 256, (g, w, h) => { livery(g, w, h); star(g, w / 2, 100, 60); g.fillStyle = "#f2c230"; g.textAlign = "center"; g.font = "bold 44px system-ui"; g.fillText("A.R.E.R.P.S. STAFF", w / 2, 220); });

export class StaffTruck {
  constructor({ scene, controls, world, height, ground, isAdmin, toast, x = -30, z = 46 }) {
    Object.assign(this, { scene, controls, world, height, ground, isAdmin, toast });
    this.g = new THREE.Group(); this.h = 0; this.v = 0; this.driving = false; this.steer = 0; this.wheels = []; this.lightT = 0;
    this._build(); this.g.position.set(x, height(x, z), z); scene.add(this.g);
  }
  _build() {
    const M = (o) => new THREE.MeshStandardMaterial(o), g = this.g;
    const paint = M({ color: 0x1c3f94, metalness: .55, roughness: .3 }), blk = M({ color: 0x14171c, roughness: .6, metalness: .3 }), glass = M({ color: 0x0b1118, metalness: .8, roughness: .1 });
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    // forward is -z. Body 2.0 wide, 5.8 long
    const lower = add(new THREE.BoxGeometry(2, .85, 5.8), [paint, paint, paint, paint, paint, paint], 0, .95, 0);
    const sideMats = [M({ map: sideTex(false), metalness: .3, roughness: .35 }), M({ map: sideTex(true), metalness: .3, roughness: .35 })];
    lower.material = [sideMats[0], sideMats[1], paint, blk, paint, paint];
    add(new THREE.BoxGeometry(1.9, .22, 1.6), M({ map: hoodTex(), metalness: .4, roughness: .35 }), 0, 1.45, -1.9).material = [paint, paint, M({ map: hoodTex(), metalness: .4, roughness: .35 }), blk, paint, paint];
    add(new THREE.BoxGeometry(1.85, .75, 2.5), paint, 0, 1.78, .35);                         // cab
    add(new THREE.BoxGeometry(1.9, .55, 2.2), glass, 0, 1.8, .35).scale.set(1, 1, 1.0);       // tinted windows (slightly wider)
    add(new THREE.BoxGeometry(1.7, .18, 2.3), paint, 0, 2.22, .35);                           // roof
    add(new THREE.BoxGeometry(1.92, .08, 2.0), blk, 0, 1.35, 2.0);                            // tonneau cover (bed)
    add(new THREE.BoxGeometry(1.94, .5, .06), M({ map: tailTex(), roughness: .5 }), 0, 1.0, 2.92);   // tailgate sign
    add(new THREE.BoxGeometry(1.7, .5, .12), blk, 0, .62, -2.95);                              // front bumper
    add(new THREE.BoxGeometry(1.7, .1, .1), blk, 0, 1.0, -3.08); [-.7, .7].forEach((x) => add(new THREE.BoxGeometry(.08, .7, .08), blk, x, 1.0, -3.1)); // bull bar
    add(new THREE.BoxGeometry(2.04, .12, .5), blk, 0, .55, .3);                               // running boards (full length strip)
    [-.65, .65].forEach((x) => add(new THREE.BoxGeometry(.3, .16, .08), M({ color: 0xfff6d0, emissive: 0xfff0b0, emissiveIntensity: .6 }), x, 1.1, -2.93)); // headlights
    [-.8, .8].forEach((x) => add(new THREE.BoxGeometry(.25, .14, .06), M({ color: 0xff2a2a, emissive: 0xff0000, emissiveIntensity: .8 }), x, 1.2, 2.95)); // tail lights
    // interior-visible light bar: blue/red/white only
    this.bar = [0x2e7bff, 0xffffff, 0xff2a2a, 0xffffff, 0x2e7bff].map((c, i) => { const m = M({ color: c, emissive: c, emissiveIntensity: .2 }); add(new THREE.BoxGeometry(.3, .1, .12), m, -.7 + i * .35, 2.34, -.45); return m; });
    const wm = M({ color: 0x15171a, roughness: .9 }), rm = M({ color: 0x2a2d33, metalness: .7, roughness: .4 });
    [[-1.02, -1.85], [1.02, -1.85], [-1.02, 1.75], [1.02, 1.75]].forEach(([x, z]) => {
      const w = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .32, 20).rotateZ(Math.PI / 2), wm); const r = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .34, 12).rotateZ(Math.PI / 2), rm);
      w.add(t, r); w.position.set(x, .46, z); t.castShadow = true; g.add(w); this.wheels.push(w);
    });
    this.light = new THREE.SpotLight(0xfff2cc, 0, 40, .5, .5, 1.5); this.light.position.set(0, 1.2, -2.8); this.light.target.position.set(0, .5, -15); g.add(this.light, this.light.target);
  }
  get pos() { return this.g.position; }
  nearPlayer() { return this.g.position.distanceTo(this.controls.pos) < 6; }
  toggle() {
    if (this.driving) return this.exit();
    if (!this.isAdmin()) return this.toast("🚫 Staff Truck: A.R.E.R.P.S. staff only. Unlock the Admin Panel first.", true);
    if (!this.nearPlayer()) return this.toast("Walk up to the Staff Truck (blue/gold) to enter.");
    this.driving = true; this.controls.stun = 99; this.controls.avatar.visible = false; this.controls.dist = 9; this.toast("🚙 Driving Staff Truck. W/S gas/brake, A/D steer, Space handbrake. Press E/Wheel to exit."); this.light.intensity = 0;
  }
  exit() {
    this.driving = false; this.controls.stun = 0; this.v = 0; const s = this.h; this.controls.pos.set(this.g.position.x + Math.cos(s) * 2.6, 0, this.g.position.z - Math.sin(s) * 2.6); this.controls.dist = 5; this.toast("Exited Staff Truck");
  }
  update(dt, night) {
    this.lightT += dt; const sw = Math.floor(this.lightT * 4) % 2;
    this.bar.forEach((m, i) => (m.emissiveIntensity = this.driving ? (i % 2 === sw ? 1.6 : .1) : .15));
    this.light.intensity = this.driving && night > .3 ? 120 : 0;
    if (this.driving && !this.isAdmin()) return this.exit();
    const c = this.controls, k = c.keys, p = this.g.position;
    if (this.driving) {
      c.stun = 99;
      const gas = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + c.joy.y, st = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0) - c.joy.x;
      this.v += gas * 14 * dt; if (k.Space) this.v *= 1 - Math.min(1, 4 * dt); this.v *= 1 - Math.min(1, (gas ? .25 : .9) * dt); this.v = Math.max(-8, Math.min(24, this.v));
      this.steer += (st * .6 - this.steer) * Math.min(1, dt * 6);
      this.h += this.steer * this.v * dt * .22;
      const dx = -Math.sin(this.h) * this.v * dt, dz = -Math.cos(this.h) * this.v * dt, nx = p.x + dx, nz = p.z + dz;
      let hit = this.height(nx, nz) < -.9 && !(this.ground(nx, nz) > -50);
      for (const b of this.world.colliders) if (nx > b.minX - 1.2 && nx < b.maxX + 1.2 && nz > b.minZ - 1.2 && nz < b.maxZ + 1.2 && b.maxY > 1.5) hit = true;
      if (hit) this.v *= -.3; else { p.x = nx; p.z = nz; }
      c.pos.set(p.x, p.y, p.z); c.yaw = this.h; c.avatar.visible = false; c.moving = false;
    }
    const gy = Math.max(this.height(p.x, p.z), this.ground(p.x, p.z)); p.y += (gy - p.y) * Math.min(1, dt * 10);
    this.g.rotation.y = this.h; this.wheels.forEach((w, i) => { w.children.forEach((m) => (m.rotation.x -= this.v * dt / .46)); if (i < 2) w.rotation.y = this.steer * .5; });
  }
}

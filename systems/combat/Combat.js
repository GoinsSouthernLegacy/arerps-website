// ARERPS Combat System: weapons, bullets (hitscan with tracers), ammo/reload, taser, melee, health & armor.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC or Xbox engines.
// Roleplay-safe: hit characters fall down and get back up (no gore).
import * as THREE from "three";

export const WEAPONS = {
  taser:   { name: "Taser X2", icon: "⚡", type: "taser", mag: 2, reserve: 10, rate: .8, dmg: 0, range: 14, reload: 2.2, auto: false, color: 0xffd23a, len: .16 },
  sidearm: { name: "Sidearm 9mm", icon: "🔫", type: "gun", mag: 15, reserve: 90, rate: .22, dmg: 24, range: 90, spread: .008, reload: 1.4, auto: false, color: 0x20242b, len: .2, kick: .02 },
  rifle:   { name: "Patrol Rifle", icon: "🎯", type: "gun", mag: 30, reserve: 150, rate: .1, dmg: 18, range: 150, spread: .014, reload: 2.1, auto: true, color: 0x1a1d22, len: .55, kick: .012 },
  shotgun: { name: "Shotgun", icon: "💥", type: "gun", mag: 6, reserve: 36, rate: .85, dmg: 11, pellets: 8, range: 45, spread: .05, reload: 2.6, auto: false, color: 0x2a2018, len: .5, kick: .05 },
  baton:   { name: "Baton", icon: "🏏", type: "melee", mag: Infinity, reserve: 0, rate: .45, dmg: 14, range: 2.4, reload: 0, auto: false, color: 0x111111, len: .45 }
};

export class Combat {
  constructor({ scene, camera, controls, world, audio, hooks = {} }) {
    Object.assign(this, { scene, camera, controls, world, audio, hooks });
    scene.add(camera);
    this.hp = 100; this.maxHp = 100; this.armor = 0; this.id = null; this.ammo = {}; this.cd = 0; this.reloadT = 0; this.held = false; this.pressed = false; this.dead = 0;
    Object.entries(WEAPONS).forEach(([k, w]) => (this.ammo[k] = { mag: w.mag, reserve: w.reserve }));
    this.tracers = Array.from({ length: 14 }, () => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, blending: THREE.AdditiveBlending })); l.visible = false; l.frustumCulled = false; l.life = 0; scene.add(l); return l; });
    this.flashLight = new THREE.PointLight(0xffc870, 0, 12, 2); scene.add(this.flashLight);
    const N = 80; this.sp = { n: N, pos: new Float32Array(N * 3).fill(-999), vel: new Float32Array(N * 3), life: new Float32Array(N), i: 0 };
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(this.sp.pos, 3));
    this.sparks = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffb040, size: .12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.sparks.frustumCulled = false; scene.add(this.sparks);
    this.gunMesh = null; this.viewMesh = null; this.swing = 0;
  }

  _mesh(w) {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: w.color, roughness: .5, metalness: .6 });
    if (w.type === "melee") { const b = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, w.len, 8), m); b.rotation.x = Math.PI / 2; b.position.z = w.len / 2; g.add(b); }
    else { const b = new THREE.Mesh(new THREE.BoxGeometry(.05, .09, w.len), m); b.position.z = w.len / 2; g.add(b); const h = new THREE.Mesh(new THREE.BoxGeometry(.04, .13, .06), m); h.position.set(0, -.09, .04); g.add(h); }
    return g;
  }

  equip(id) {
    const r = this.controls.rig; if (this.gunMesh) { r.hand.remove(this.gunMesh); this.gunMesh = null; } if (this.viewMesh) { this.camera.remove(this.viewMesh); this.viewMesh = null; }
    this.id = id === this.id ? null : id; this.reloadT = 0;
    if (this.id) {
      const w = WEAPONS[this.id]; this.gunMesh = this._mesh(w); r.hand.add(this.gunMesh);
      this.viewMesh = this._mesh(w); this.viewMesh.position.set(.22, -.2, -.45); this.viewMesh.rotation.y = Math.PI; this.camera.add(this.viewMesh);
    }
    this.controls.heldAim = !!this.id && WEAPONS[this.id].type !== "melee";
    return this.id;
  }
  get weapon() { return this.id ? WEAPONS[this.id] : null; }
  get armed() { return !!this.id; }

  trigger(down) { this.held = down; if (down) this.pressed = true; }
  reload() { const w = this.weapon, a = this.ammo[this.id]; if (!w || w.type === "melee" || this.reloadT > 0 || a.mag === w.mag || a.reserve <= 0) return; this.reloadT = w.reload; this.hooks.toast && this.hooks.toast("Reloading…"); }
  refill() { Object.entries(WEAPONS).forEach(([k, w]) => (this.ammo[k] = { mag: w.mag, reserve: w.reserve })); }

  damage(n, why) {
    if (this.dead > 0) return; const soak = Math.min(this.armor, n * .6); this.armor -= soak; this.hp -= n - soak;
    this.hooks.hurt && this.hooks.hurt(n, why);
    if (this.hp <= 0) { this.hp = 0; this.dead = 5; this.hooks.down && this.hooks.down(why); }
  }

  _rayHit(o, d, range) {
    let best = { t: range, kind: "none" };
    // character hit: closest approach to a vertical cylinder
    for (const n of this.world.npcs || []) {
      const p = n.g.position, dx = p.x - o.x, dz = p.z - o.z, t = (dx * d.x + dz * d.z) / Math.max(1e-6, Math.hypot(d.x, d.z));
      if (t < 0 || t > best.t) continue; const tt = t / Math.max(1e-6, Math.hypot(d.x, d.z)); // param along 3D ray
      const hx = o.x + d.x * tt - p.x, hz = o.z + d.z * tt - p.z, hy = o.y + d.y * tt - p.y;
      if (tt < best.t && Math.hypot(hx, hz) < .45 && hy > 0 && hy < 1.95) best = { t: tt, kind: "npc", npc: n, head: hy > 1.6 };
    }
    // buildings: ray vs AABB slabs
    for (const c of this.world.colliders) {
      let t0 = 0, t1 = best.t; const mn = [c.minX, -1, c.minZ], mx = [c.maxX, c.maxY, c.maxZ], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z]; let ok = true;
      for (let a = 0; a < 3 && ok; a++) { if (Math.abs(dd[a]) < 1e-6) { if (oo[a] < mn[a] || oo[a] > mx[a]) ok = false; } else { let ta = (mn[a] - oo[a]) / dd[a], tb = (mx[a] - oo[a]) / dd[a]; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) ok = false; } }
      if (ok && t0 < best.t && t0 > 0) best = { t: t0, kind: "wall" };
    }
    const gp = o.clone().addScaledVector(d, best.t); if (best.kind === "none" && d.y < 0) { const tg = o.y / -d.y; if (tg < best.t) best = { t: tg, kind: "ground" }; }
    return best;
  }

  _tracer(a, b) {
    const l = this.tracers.find((x) => x.life <= 0); if (!l) return; l.life = .09; l.visible = true;
    const p = l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true;
  }
  _spark(p, n = 8) { const s = this.sp; for (let k = 0; k < n; k++) { const i = s.i++ % s.n; s.pos.set([p.x, p.y, p.z], i * 3); s.vel.set([(Math.random() - .5) * 5, Math.random() * 4, (Math.random() - .5) * 5], i * 3); s.life[i] = .35; } }

  _shoot() {
    const w = this.weapon, a = this.ammo[this.id], c = this.controls; this.cd = w.rate;
    if (w.type === "melee") { this.swing = .3; this.audio && this.audio.shot("melee"); return this._melee(w); }
    if (a.mag <= 0) { this.audio && this.audio.shot("dry"); this.reload(); return; }
    a.mag--; const origin = c.head.clone(), muzzle = origin.clone().addScaledVector(c.dir, .7); muzzle.y -= .15;
    const right = new THREE.Vector3(c.dir.z, 0, -c.dir.x).normalize(); muzzle.addScaledVector(right, .22);
    const pellets = w.pellets || 1;
    for (let k = 0; k < pellets; k++) {
      const d = c.dir.clone().add(new THREE.Vector3((Math.random() - .5), (Math.random() - .5), (Math.random() - .5)).multiplyScalar(w.spread * 2)).normalize();
      const hit = this._rayHit(origin, d, w.range), end = origin.clone().addScaledVector(d, hit.t);
      this._tracer(muzzle, end);
      if (hit.kind === "npc") { this._hitNpc(hit.npc, w, hit.head); this._spark(end, 4); }
      else if (hit.kind !== "none") this._spark(end, 7);
    }
    this.flashLight.position.copy(muzzle); this.flashLight.intensity = 60; this.flashT = .05;
    c.pitch += w.kick || 0; c.yaw += (Math.random() - .5) * (w.kick || 0) * .6;
    this.audio && this.audio.shot(w.type === "taser" ? "taser" : this.id);
    if (a.mag <= 0) this.reload();
  }
  _melee(w) {
    const c = this.controls, o = c.head.clone(), hit = this._rayHit(o, c.dir.clone(), w.range);
    if (hit.kind === "npc") this._hitNpc(hit.npc, w, false);
  }
  _hitNpc(n, w, head) {
    if (w.type === "taser") { n.down = 6; this.hooks.hit && this.hooks.hit("Tased"); return; }
    n.hp = (n.hp ?? 100) - w.dmg * (head ? 1.8 : 1); this.hooks.hit && this.hooks.hit(head ? "Headshot" : "Hit");
    if (n.hp <= 0) { n.down = 10; n.hp = 100; this.hooks.hit && this.hooks.hit("Suspect down"); } else if (Math.random() < .25) n.down = 2;
  }

  update(dt) {
    const w = this.weapon;
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { this.hp = this.maxHp; this.armor = 0; this.hooks.respawn && this.hooks.respawn(); } }
    this.cd -= dt; this.swing = Math.max(0, this.swing - dt);
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0 && w) { const a = this.ammo[this.id], take = Math.min(w.mag - a.mag, a.reserve); a.mag += take; a.reserve -= take; } }
    if (w && this.dead <= 0 && this.reloadT <= 0 && this.cd <= 0 && (w.auto ? this.held : this.pressed)) this._shoot();
    this.pressed = false;
    if (this.viewMesh) { this.viewMesh.visible = this.controls.fps; this.viewMesh.position.z += (-.45 - this.viewMesh.position.z) * .3; if (this.swing) this.viewMesh.rotation.x = -this.swing * 3; else this.viewMesh.rotation.x *= .8; }
    if (this.gunMesh && w && w.type === "melee") this.controls.rig.armR.rotation.x = -1 - this.swing * 5;
    this.tracers.forEach((l) => { if (l.life > 0) { l.life -= dt; l.material.opacity = Math.max(0, l.life / .09); if (l.life <= 0) l.visible = false; } });
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flashLight.intensity = 0; }
    const s = this.sp; for (let i = 0; i < s.n; i++) { if (s.life[i] <= 0) { s.pos[i * 3 + 1] = -999; continue; } s.life[i] -= dt; s.vel[i * 3 + 1] -= 12 * dt; for (let k = 0; k < 3; k++) s.pos[i * 3 + k] += s.vel[i * 3 + k] * dt; }
    this.sparks.geometry.attributes.position.needsUpdate = true;
  }
}

// ARERPS Fire System: building fires, wildfire spread, smoke, and hose/extinguisher suppression.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
import * as THREE from "three";

function tex(stops) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class FireSystem {
  constructor(scene) {
    this.scene = scene; this.fires = []; this.fuel = []; this.buildings = []; this.max = 70; this._l = {}; this.t = 0;
    this.flameTex = tex([[0, "rgba(255,240,170,1)"], [.35, "rgba(255,140,30,.85)"], [1, "rgba(200,30,0,0)"]]);
    this.smokeTex = tex([[0, "rgba(60,60,60,.55)"], [1, "rgba(60,60,60,0)"]]);
    this.light = new THREE.PointLight(0xff7a2a, 0, 40, 1.6); scene.add(this.light);
  }
  on(e, f) { (this._l[e] ||= []).push(f); return this; }
  emit(e, d) { (this._l[e] || []).forEach((f) => f(d)); }
  get count() { return this.fires.length; }

  registerBuilding(b) { this.buildings.push(b); }   // {name, mesh, anchors:[Vector3], burn:0}
  registerFuel(positions) { this.fuel = positions.map((p) => ({ p, burnt: false })); }

  ignite(pos, opts = {}) {
    if (this.fires.length >= this.max) return null;
    const f = { pos: pos.clone(), size: opts.size || .8, hp: 0, building: opts.building || null, age: 0, spr: [] };
    f.hp = 60 * f.size;
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
      s.userData = { ph: Math.random(), sp: .6 + Math.random() * .8, ox: (Math.random() - .5), oz: (Math.random() - .5), smoke: false }; this.scene.add(s); f.spr.push(s);
    }
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, depthWrite: false, fog: true }));
      s.userData = { ph: Math.random(), sp: .25 + Math.random() * .2, ox: (Math.random() - .5), oz: (Math.random() - .5), smoke: true }; this.scene.add(s); f.spr.push(s);
    }
    this.fires.push(f); this.emit("ignite", f); return f;
  }

  igniteBuilding(b) {
    const a = b.anchors[Math.floor(Math.random() * b.anchors.length)];
    const f = this.ignite(a, { building: b, size: 1 });
    if (f) this.emit("structure", b);
    return f;
  }

  wildfire(center, radius = 40) {
    const near = this.fuel.filter((q) => !q.burnt && q.p.distanceTo(center) < radius);
    for (let i = 0; i < Math.min(5, near.length); i++) { const q = near[Math.floor(Math.random() * near.length)]; q.burnt = true; this.ignite(q.p, { size: 1.2 }); }
    this.emit("wildfire", center);
  }

  _remove(f) {
    f.spr.forEach((s) => { this.scene.remove(s); s.material.dispose(); });
    this.fires.splice(this.fires.indexOf(f), 1); this.emit("out", f);
    if (!this.fires.length) this.emit("allout");
  }
  extinguishAll() { [...this.fires].forEach((f) => this._remove(f)); }

  // Spray water along a ray from origin; returns true if it hit fire.
  spray(origin, dir, dt, power = 1) {
    let hit = false;
    for (const f of [...this.fires]) {
      const v = f.pos.clone().sub(origin), t = v.dot(dir);
      if (t < 0 || t > 22) continue;
      const d = v.sub(dir.clone().multiplyScalar(t)).length();
      if (d < 1.6 + f.size * 1.6) { hit = true; f.hp -= dt * power * 40; f.size = Math.max(.3, f.size - dt * .15 * power); if (f.hp <= 0) this._remove(f); }
    }
    return hit;
  }

  update(dt, camPos) {
    this.t += dt; let nearest = null, nd = 1e9;
    for (const f of [...this.fires]) {
      f.age += dt;
      f.size = Math.min(3, f.size + dt * .03);
      if (f.building) {
        f.building.burn = Math.min(1.5, (f.building.burn || 0) + dt * .004 * f.size);
        if (f.building.burn > 1 && !f.building.charred) { f.building.charred = true; this.emit("charred", f.building); }
      }
      // spread: neighbouring fuel (trees) or more anchors on a burning building
      if (Math.random() < dt * .08 * f.size && this.fires.length < this.max) {
        if (f.building) { const b = f.building, a = b.anchors[Math.floor(Math.random() * b.anchors.length)]; if (!this.fires.some((o) => o.pos.distanceTo(a) < 2)) this.ignite(a, { building: b, size: .7 }); }
        else {
          const c = this.fuel.filter((q) => !q.burnt && q.p.distanceTo(f.pos) < 16);
          if (c.length) { const q = c[Math.floor(Math.random() * c.length)]; q.burnt = true; this.ignite(q.p, { size: .8 }); }
        }
      }
      for (const s of f.spr) {
        const u = s.userData, life = (this.t * u.sp + u.ph) % 1;
        const sz = f.size;
        if (!u.smoke) {
          s.position.set(f.pos.x + u.ox * 1.4 * sz + Math.sin(this.t * 7 + u.ph * 9) * .15, f.pos.y + life * 3.2 * sz, f.pos.z + u.oz * 1.4 * sz);
          const sc = (1 - life) * 2.6 * sz + .3; s.scale.set(sc, sc * 1.4, 1); s.material.opacity = Math.sin(life * Math.PI) * .95;
        } else {
          s.position.set(f.pos.x + u.ox * 2 + life * 3, f.pos.y + 2 + life * 14 * sz, f.pos.z + u.oz * 2 + life * 2);
          const sc = 2 + life * 9 * sz; s.scale.set(sc, sc, 1); s.material.opacity = Math.sin(life * Math.PI) * .5;
        }
      }
      const d = f.pos.distanceTo(camPos); if (d < nd) { nd = d; nearest = f; }
    }
    if (nearest && nd < 120) { this.light.position.copy(nearest.pos).y += 2.5; this.light.intensity = (2200 + Math.sin(this.t * 17) * 600 + Math.random() * 400) * Math.min(1.5, nearest.size); }
    else this.light.intensity = 0;
  }
}

// ARERPS Player Controls: WASD/mouse and touch (joystick, drag-look, pinch to switch first/third person).
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
import * as THREE from "three";

export class PlayerControls {
  constructor(canvas, camera, ui, opts) {
    this.canvas = canvas; this.camera = camera; this.ui = ui; this.o = opts; // opts.height(x,z), opts.colliders[]
    this.pos = new THREE.Vector3(8, 0, 48); this.yaw = Math.PI; this.pitch = -.05;
    this.fps = false; this.keys = {}; this.joy = { x: 0, y: 0 }; this.bob = 0; this.moving = false;
    this.avatar = this._avatar();
    this.dist = 5; this._look = null; this._joyId = null; this._pinch = null;
    addEventListener("keydown", (e) => { this.keys[e.code] = true; if (e.code === "KeyV") this.setFps(!this.fps); });
    addEventListener("keyup", (e) => (this.keys[e.code] = false));
    canvas.addEventListener("pointerdown", (e) => this._down(e));
    addEventListener("pointermove", (e) => this._move(e));
    addEventListener("pointerup", (e) => this._up(e));
    addEventListener("pointercancel", (e) => this._up(e));
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); this.setFps(e.deltaY < 0 && this.dist < 2.5 ? true : this.fps && e.deltaY > 0 ? false : this.fps); this.dist = Math.min(9, Math.max(2, this.dist + e.deltaY * .005)); if (!this.fps && e.deltaY < 0 && this.dist <= 2) this.setFps(true); }, { passive: false });
    canvas.addEventListener("touchmove", (e) => this._pinchMove(e), { passive: false });
    canvas.addEventListener("touchend", () => (this._pinch = null));
    this._joyBind();
  }

  // Rigged blocky avatar: pivots for arms/legs so walking and emotes can animate it.
  _avatar() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const M = (c, r = .8, me = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: me });
    const mk = { top: M(0x1c2a52), pants: M(0x141c33), vest: M(0x222831, .6, .2), hat: M(0x16203f, .5), skin: M(0xd6a98a), accent: M(0xd8e0e8, .4, .4) };
    const add = (geo, mat, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    const pivot = (x, y, parent = body) => { const p = new THREE.Group(); p.position.set(x, y, 0); parent.add(p); return p; };
    add(new THREE.BoxGeometry(.55, .7, .3), mk.top, 0, 1.15, 0);
    const vest = add(new THREE.BoxGeometry(.58, .5, .34), mk.vest, 0, 1.2, 0);
    const stripe = add(new THREE.BoxGeometry(.56, .1, .32), mk.accent, 0, .95, 0);
    add(new THREE.BoxGeometry(.52, .08, .28), M(0x0b0d12), 0, .82, 0); // duty belt
    const head = pivot(0, 1.5); add(new THREE.SphereGeometry(.17, 20, 14), mk.skin, 0, .18, 0, head);
    const hat = add(new THREE.SphereGeometry(.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mk.hat, 0, .24, 0, head);
    const brim = add(new THREE.BoxGeometry(.3, .03, .16), mk.hat, 0, .22, .17, head);
    this.maskMesh = add(new THREE.BoxGeometry(.24, .2, .12), M(0x222831, .3, .6), 0, .14, .15, head); this.maskMesh.visible = false;
    const armL = pivot(-.38, 1.45), armR = pivot(.38, 1.45), legL = pivot(-.14, .8), legR = pivot(.14, .8);
    [armL, armR].forEach((a) => { add(new THREE.BoxGeometry(.16, .5, .18), mk.top, 0, -.25, 0, a); add(new THREE.BoxGeometry(.14, .22, .16), mk.skin, 0, -.58, 0, a); });
    [legL, legR].forEach((l) => { add(new THREE.BoxGeometry(.22, .8, .24), mk.pants, 0, -.4, 0, l); add(new THREE.BoxGeometry(.24, .1, .34), M(0x0b0d12), 0, -.78, .05, l); });
    const hand = new THREE.Group(); hand.position.set(0, -.6, .05); armR.add(hand); // held item mount
    this.rig = { body, head, armL, armR, legL, legR, hand, mk, vest, stripe, hat, brim };
    this.emoteFn = null; this.emoteT = 0; this.walkA = 0; this.bubble = null;
    return g;
  }

  // Uniform looks (colors follow ARERPS branding: police navy, sheriff tan/green, fire turnout, EMS, DOT hi-vis, SWAT black).
  setUniform(id) {
    const U = {
      police: [0x1c2a52, 0x141c33, 0x222831, 0x16203f, 0xd8e0e8, 1], sheriff: [0xb7a67a, 0x4a5a35, 0x3d4a2c, 0x3f4a2a, 0xd9b24a, 1],
      fire: [0x8a1c1c, 0x4a1010, 0x3a1414, 0xf2c200, 0xe8e07a, 1], ems: [0x1b2f66, 0x0f1a3a, 0x1b2f66, 0x1b2f66, 0xff8a1c, 1],
      dot: [0xff7a1a, 0x2a3350, 0xffb020, 0xf2c200, 0xd8ff3a, 1], swat: [0x15171b, 0x15171b, 0x0b0c0f, 0x0b0c0f, 0x394049, 0],
      fbi: [0x1c2a52, 0x3a3a3a, 0x15181f, 0x1c2a52, 0xffd23a, 1], marine: [0x5b6b43, 0x56673e, 0x3e4a2c, 0x56673e, 0x8a7a4a, 1]
    }[id]; if (!U) return; const k = this.rig.mk;
    k.top.color.setHex(U[0]); k.pants.color.setHex(U[1]); k.vest.color.setHex(U[2]); k.hat.color.setHex(U[3]); k.accent.color.setHex(U[4]);
    this.rig.brim.visible = !!U[5]; this.uniform = id;
  }

  playEmote(fn) { this.emoteFn = fn; this.emoteT = 0; }
  _animate(dt) {
    const r = this.rig, lerp = (o, k, v) => { o.rotation[k] += (v - o.rotation[k]) * Math.min(1, dt * 14); };
    if (this.moving && this.emoteFn) this.emoteFn = null;
    let P = { aLx: 0, aRx: 0, aLz: 0, aRz: 0, lL: 0, lR: 0, by: 0, bx: 0, bry: 0, hx: 0 };
    if (this.emoteFn) { this.emoteT += dt; Object.assign(P, this.emoteFn(this.emoteT)); }
    else if (this.moving) { const sw = Math.sin(this.bob) * .9; P.aLx = sw; P.aRx = -sw; P.lL = -sw; P.lR = sw; P.by = Math.abs(Math.cos(this.bob)) * .04; }
    if (this.heldAim) this.avatar.rotation.y = this.yaw + Math.PI;
    if (this.heldAim) { P.aRx = -1.5 + (this.pitch || 0); P.aRz = 0; }
    lerp(r.armL, "x", P.aLx); lerp(r.armR, "x", P.aRx); lerp(r.armL, "z", P.aLz); lerp(r.armR, "z", P.aRz);
    lerp(r.legL, "x", P.lL); lerp(r.legR, "x", P.lR); lerp(r.head, "x", P.hx);
    r.body.position.y += (P.by - r.body.position.y) * Math.min(1, dt * 14); lerp(r.body, "x", P.bx); lerp(r.body, "y", P.bry);
  }

  setFps(v) { this.fps = v; this.ui.onMode && this.ui.onMode(v); }

  _joyBind() {
    const pad = this.ui.joyPad, knob = this.ui.joyKnob; if (!pad) return;
    pad.addEventListener("pointerdown", (e) => { this._joyId = e.pointerId; pad.setPointerCapture(e.pointerId); this._joyUpd(e); e.stopPropagation(); });
    pad.addEventListener("pointermove", (e) => { if (e.pointerId === this._joyId) this._joyUpd(e); });
    const end = (e) => { if (e.pointerId === this._joyId) { this._joyId = null; this.joy.x = this.joy.y = 0; knob.style.transform = ""; } };
    pad.addEventListener("pointerup", end); pad.addEventListener("pointercancel", end);
  }
  _joyUpd(e) {
    const r = this.ui.joyPad.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const l = Math.hypot(dx, dy);
    if (l > R) { dx = dx / l * R; dy = dy / l * R; }
    this.joy.x = dx / R; this.joy.y = -dy / R; this.ui.joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
  }
  _down(e) { if (e.pointerType === "touch" && this._look) return; this._look = { id: e.pointerId, x: e.clientX, y: e.clientY }; }
  _move(e) {
    if (!this._look || e.pointerId !== this._look.id || this._pinch) return;
    this.yaw -= (e.clientX - this._look.x) * .005; this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - (e.clientY - this._look.y) * .005));
    this._look.x = e.clientX; this._look.y = e.clientY;
  }
  _up(e) { if (this._look && e.pointerId === this._look.id) this._look = null; }
  _pinchMove(e) {
    if (e.touches.length !== 2) return; e.preventDefault();
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (this._pinch == null) { this._pinch = d; this._look = null; return; }
    if (d - this._pinch > 40) { this.setFps(true); this._pinch = d; }       // pinch out = zoom in = first person
    else if (this._pinch - d > 40) { this.setFps(false); this._pinch = d; } // pinch in = third person
  }

  update(dt) {
    this.stun = Math.max(0, (this.stun || 0) - dt);
    const k = this.keys; let fx = this.joy.y, rx = this.joy.x;
    if (this.stun > 0) { fx = rx = 0; }
    if (k.KeyW || k.ArrowUp) fx += 1; if (k.KeyS || k.ArrowDown) fx -= 1; if (k.KeyD || k.ArrowRight) rx += 1; if (k.KeyA || k.ArrowLeft) rx -= 1;
    const l = Math.hypot(fx, rx), run = k.ShiftLeft || Math.hypot(this.joy.x, this.joy.y) > .9;
    this.moving = l > .05;
    if (this.moving) {
      const sp = (run ? 7.5 : 4.2) * dt / Math.max(1, l);
      const dx = (-Math.sin(this.yaw) * fx + Math.cos(this.yaw) * rx) * sp, dz = (-Math.cos(this.yaw) * fx - Math.sin(this.yaw) * rx) * sp;
      this._try(dx, 0); this._try(0, dz); this.bob += dt * (run ? 11 : 7);
      this.avatar.rotation.y = Math.atan2(dx, dz);
    }
    const gy = Math.max(this.o.height(this.pos.x, this.pos.z), this.o.ground ? this.o.ground(this.pos.x, this.pos.z) : -99);
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 14);
    this._animate(dt);
    this.avatar.position.copy(this.pos); this.avatar.visible = !this.fps;
    const head = new THREE.Vector3(this.pos.x, this.pos.y + 1.68 + (this.fps && this.moving ? Math.sin(this.bob) * .035 : 0), this.pos.z);
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    if (this.fps) { this.camera.position.copy(head); this.camera.lookAt(head.clone().add(dir)); this.camera.fov += (75 - this.camera.fov) * .2; }
    else {
      this.camera.position.copy(head).addScaledVector(dir, -this.dist); this.camera.position.y += .6;
      const gh = this.o.height(this.camera.position.x, this.camera.position.z) + .4; if (this.camera.position.y < gh) this.camera.position.y = gh;
      this.camera.lookAt(head.x, head.y, head.z); this.camera.fov += (60 - this.camera.fov) * .2;
    }
    this.camera.updateProjectionMatrix();
    this.dir = dir; this.head = head;
  }

  _try(dx, dz) {
    const nx = this.pos.x + dx, nz = this.pos.z + dz, r = .35;
    for (const c of this.o.colliders) if (nx > c.minX - r && nx < c.maxX + r && nz > c.minZ - r && nz < c.maxZ + r && c.maxY > this.pos.y + .6) return;
    if (this.o.height(nx, nz) < -.9 && !(this.o.ground && this.o.ground(nx, nz) > -50)) return; // river
    this.pos.x = nx; this.pos.z = nz;
  }
}

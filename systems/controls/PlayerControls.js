// ARERPS Player Controls: WASD/mouse and touch (joystick, drag-look, pinch to switch first/third person).
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
import * as THREE from "three";

export class PlayerControls {
  constructor(canvas, camera, ui, opts) {
    this.canvas = canvas; this.camera = camera; this.ui = ui; this.o = opts; // opts.height(x,z), opts.colliders[]
    this.pos = new THREE.Vector3(8, 0, 48); this.yaw = Math.PI; this.pitch = -.05;
    this.fps = false; this.keys = {}; this.joy = { x: 0, y: 0 }; this.bob = 0; this.moving = false;
    this.avatar = this._avatar(); this.avatar.castShadow = true;
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

  _avatar() {
    const g = new THREE.Group(), m = (c, r = .8, me = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: me });
    const add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(.55, .75, .3), m(0x2b2f3a), 0, 1.15, 0);       // turnout coat
    add(new THREE.BoxGeometry(.56, .12, .31), m(0xd8e0e8, .4, .4), 0, 1.0, 0); // reflective stripe
    add(new THREE.BoxGeometry(.5, .8, .26), m(0x1b1e26), 0, .45, 0);         // pants
    add(new THREE.SphereGeometry(.17, 20, 14), m(0xd6a98a), 0, 1.68, 0);     // head
    add(new THREE.SphereGeometry(.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m(0xf2c200, .35), 0, 1.72, 0); // helmet
    [-1, 1].forEach((s) => { add(new THREE.BoxGeometry(.16, .7, .18), m(0x2b2f3a), s * .37, 1.12, 0); add(new THREE.BoxGeometry(.18, .1, .3), m(0x111), s * .13, .05, .04); });
    this.maskMesh = add(new THREE.BoxGeometry(.24, .2, .12), m(0x222831, .3, .6), 0, 1.64, .15); this.maskMesh.visible = false;
    return g;
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

// ARERPS Weather FX: draws sky, sun, clouds, rain, snow, lightning, tornado, tsunami, quake shake.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
import * as THREE from "three";

const clamp = (a, b, x) => Math.min(b, Math.max(a, x));
const C = (h) => new THREE.Color(h);

function cloudTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  for (let i = 0; i < 26; i++) {
    const x = 64 + (Math.random() - .5) * 60, y = 64 + (Math.random() - .5) * 30, r = 16 + Math.random() * 28;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

export class WeatherFX {
  constructor(scene, camera, weather, uniforms) {
    this.scene = scene; this.camera = camera; this.w = weather; this.u = uniforms;
    this.shake = 0; this.waterRise = 0; this.night = 0; this.sunDir = new THREE.Vector3(0, 1, 0);
    this.tornado = null; this.tsunami = null; this.bolts = []; this.flash = 0;
    this._quakeT = 0; this._tsT = 0; this._floodT = 0;

    this.skyU = { top: { value: C(0x3b78c8) }, bottom: { value: C(0xbcd6f0) }, sun: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C(0xfff2d0) }, night: { value: 0 }, flash: { value: 0 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
      fragmentShader: `uniform vec3 top,bottom,sun,sunCol; uniform float night,flash; varying vec3 vD;
        float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
        void main(){ vec3 d=normalize(vD); float h=clamp(d.y,0.,1.);
          vec3 c=mix(bottom,top,pow(h,.55));
          float s=max(dot(d,normalize(sun)),0.);
          c+=sunCol*(pow(s,900.)*6.+pow(s,10.)*.25)*(1.-night*.2);
          c+=vec3(step(.9988,hash(floor(d*320.))))*night*h;
          c+=vec3(.7,.75,.9)*flash; gl_FragColor=vec4(c,1.); }`
    }));
    this.sky.renderOrder = -10; scene.add(this.sky);
    this.scene.fog = new THREE.FogExp2(0xbcd6f0, .0006);

    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 700 });
    this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .6;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd6f0, 0x4a5a3a, .6); scene.add(this.hemi);

    // clouds
    const tex = cloudTexture();
    this.clouds = [];
    for (let i = 0; i < 44; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: .8 });
      const s = new THREE.Sprite(m);
      const sz = 260 + Math.random() * 300; s.scale.set(sz, sz * .45, 1);
      s.position.set((Math.random() - .5) * 1800, 150 + Math.random() * 90, (Math.random() - .5) * 1800);
      s.userData.k = i / 44; scene.add(s); this.clouds.push(s);
    }

    // rain (line segments) and snow (points) follow the camera
    this.RN = 3200;
    this.rainPos = new Float32Array(this.RN * 6); this.rainHead = new Float32Array(this.RN * 3);
    for (let i = 0; i < this.RN; i++) this._seed(this.rainHead, i, true);
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaec4de, transparent: true, opacity: .4, fog: true }));
    this.rain.frustumCulled = false; scene.add(this.rain);
    this.SN = 1800; this.snowHead = new Float32Array(this.SN * 3);
    for (let i = 0; i < this.SN; i++) this._seed(this.snowHead, i, true);
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(this.snowHead.slice(), 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: .18, transparent: true, opacity: .9 }));
    this.snow.frustumCulled = false; scene.add(this.snow);

    this.flashLight = new THREE.PointLight(0xcfd8ff, 0, 900, 1.2); scene.add(this.flashLight);

    weather.on("disaster", (e) => this._disaster(e));
  }

  _seed(a, i, init) {
    a[i * 3] = (Math.random() - .5) * 70; a[i * 3 + 1] = init ? Math.random() * 35 : 35; a[i * 3 + 2] = (Math.random() - .5) * 70;
  }

  _disaster({ name, on, intensity }) {
    if (name === "tornado") {
      if (on && !this.tornado) this._makeTornado(); else if (!on && this.tornado) { this.scene.remove(this.tornado.obj); this.tornado = null; }
    } else if (name === "tsunami" && on) this._makeTsunami();
    else if (name === "earthquake" && on) { this._quakeT = 18; this.shake = clamp(.3, 1, intensity || .7); }
  }

  _makeTornado() {
    const N = 2600, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), par = [];
    for (let i = 0; i < N; i++) par.push({ h: Math.random(), a: Math.random() * 6.28, s: .6 + Math.random() * 1.6 });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const obj = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x555a60, size: 3.2, transparent: true, opacity: .55, depthWrite: false }));
    obj.frustumCulled = false;
    obj.position.set(-260, 0, -330); this.scene.add(obj);
    this.tornado = { obj, par, pos, vx: 5, vz: 3, t: 0 };
  }

  _makeTsunami() {
    const m = new THREE.Mesh(new THREE.BoxGeometry(900, 26, 14), new THREE.MeshPhysicalMaterial({ color: 0x2b6f8f, transparent: true, opacity: .8, roughness: .15 }));
    m.userData.rise = 0; m.position.set(0, -6, 380); this.scene.add(m); this.tsunami = m; this._tsT = 0;
  }

  bolt(p) {
    const pts = [], top = new THREE.Vector3(p.x + (Math.random() - .5) * 60, 190, p.z + (Math.random() - .5) * 60);
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = i / n, v = top.clone().lerp(p, t);
      if (i > 0 && i < n) { v.x += (Math.random() - .5) * 18 * (1 - t * .5); v.z += (Math.random() - .5) * 18 * (1 - t * .5); }
      pts.push(v);
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xeaf0ff, fog: false }));
    this.scene.add(line); this.bolts.push({ line, life: .22 });
    this.flash = 1; this.flashLight.position.set(p.x, 60, p.z);
  }

  update(dt, player) {
    const w = this.w, e = w.eff, t = w.time;
    const ang = (t - 6) / 12 * Math.PI, el = Math.sin(ang);
    this.sunDir.set(Math.cos(ang) * .8, el, .55).normalize();
    const day = clamp(0, 1, (el + .12) / .4);
    this.night = 1 - day;
    const dusk = clamp(0, 1, 1 - Math.abs(el - .05) * 5) * (1 - e.storm * .6);
    const top = C(0x050a18).lerp(C(0x3b78c8), day).lerp(C(0x6a4a7a), dusk * .5);
    const bot = C(0x0a1020).lerp(C(0xbcd6f0), day).lerp(C(0xff9358), dusk);
    const gray = C(0x6e7680).multiplyScalar(.25 + day * .75);
    const dark = C(0x252a33).multiplyScalar(.35 + day * .65);
    const g = clamp(0, 1, e.cloud * .75 + e.storm * .25);
    top.lerp(gray, g).lerp(dark, e.storm * .8); bot.lerp(gray, g).lerp(dark, e.storm * .7);
    this.flash *= Math.exp(-dt * 9);
    this.skyU.top.value.copy(top); this.skyU.bottom.value.copy(bot);
    this.skyU.sun.value.copy(this.sunDir); this.skyU.night.value = this.night * (1 - e.cloud * .8); this.skyU.flash.value = this.flash * .6;
    this.skyU.sunCol.value.set(0xfff2d0).lerp(C(0xff8a3a), dusk).multiplyScalar(1 - e.cloud * .85);
    this.sky.position.copy(this.camera.position);

    this.sun.position.copy(player).addScaledVector(this.sunDir, 300);
    this.sun.target.position.copy(player);
    this.sun.intensity = Math.max(0, el) * 2.6 * (1 - e.cloud * .7 - e.storm * .15);
    this.sun.color.set(0xfff0d8).lerp(C(0xff9a4a), dusk);
    this.hemi.intensity = .12 + day * .6 * (1 - e.storm * .4) + this.flash * 2;
    this.hemi.color.copy(bot);
    this.scene.fog.color.copy(bot);
    this.scene.fog.density = .0005 + e.fog * .011 + e.rain * .0018 + e.snow * .004;
    this.flashLight.intensity = this.flash * 6000;

    // clouds drift with wind
    const drift = (6 + this.w.gust * 60) * dt;
    const tint = C(0xffffff).lerp(C(0x3a3f48), e.storm).multiplyScalar(.25 + day * .75);
    for (const c of this.clouds) {
      c.position.x += drift; if (c.position.x > 900) c.position.x = -900;
      c.visible = c.userData.k < e.cloud;
      c.material.color.copy(tint).lerp(C(0xff9a6a), dusk * .5);
      c.material.opacity = .55 + e.cloud * .4 + this.flash * .5;
    }

    // rain and snow follow camera
    const cam = this.camera.position, wx = this.w.gust * 14;
    const rc = Math.floor(e.rain * this.RN);
    this.rain.geometry.setDrawRange(0, rc * 2); this.rain.visible = rc > 0;
    if (rc > 0) {
      for (let i = 0; i < rc; i++) {
        const h = this.rainHead; h[i * 3 + 1] -= 40 * dt; h[i * 3] += wx * dt;
        if (h[i * 3 + 1] < 0) this._seed(h, i, false);
        const x = h[i * 3] + cam.x, y = h[i * 3 + 1] + cam.y - 8, z = h[i * 3 + 2] + cam.z;
        this.rainPos.set([x, y, z, x + wx * .02, y + .9, z], i * 6);
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    const sc = Math.floor(e.snow * this.SN);
    this.snow.geometry.setDrawRange(0, sc); this.snow.visible = sc > 0;
    if (sc > 0) {
      const p = this.snow.geometry.attributes.position.array, h = this.snowHead;
      for (let i = 0; i < sc; i++) {
        h[i * 3 + 1] -= (2 + Math.sin(i) * .6) * dt; h[i * 3] += (wx * .5 + Math.sin(this.w.clock + i) * .6) * dt;
        if (h[i * 3 + 1] < 0) this._seed(h, i, false);
        p[i * 3] = h[i * 3] + cam.x; p[i * 3 + 1] = h[i * 3 + 1] + cam.y - 8; p[i * 3 + 2] = h[i * 3 + 2] + cam.z;
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.life -= dt; b.line.visible = Math.floor(b.life * 40) % 3 !== 1;
      if (b.life <= 0) { this.scene.remove(b.line); b.line.geometry.dispose(); this.bolts.splice(i, 1); }
    }

    if (this.tornado) this._updTornado(dt, player);
    if (this.tsunami) this._updTsunami(dt);
    if (this._quakeT > 0) { this._quakeT -= dt; if (this._quakeT <= 0) { this.shake = 0; this.w.stopDisaster("earthquake"); } else this.shake = Math.min(1, this._quakeT / 6) * (this.w.disasters.earthquake.intensity + .2); }
    const fl = this.w.disasters.flood.active, hu = this.w.disasters.hurricane.active;
    const wantRise = (fl ? 3.5 : 0) + (hu ? 1.2 : 0) + (this.tsunami ? this.tsunami.userData.rise : 0);
    this.waterRise += (wantRise - this.waterRise) * (1 - Math.exp(-dt * .25));
    this.u.uWind.value = this.w.gust;
    this.u.uWave.value = .12 + e.wind * .5 + (this.tsunami ? 1.2 : 0) + (hu ? 1 : 0);
  }

  _updTornado(dt, player) {
    const T = this.tornado; T.t += dt;
    T.obj.position.x += T.vx * dt; T.obj.position.z += T.vz * dt;
    const H = 140, p = T.pos;
    for (let i = 0; i < T.par.length; i++) {
      const q = T.par[i]; q.a += dt * q.s * (3.5 - q.h * 2);
      const r = 4 + q.h * q.h * 48 + Math.sin(q.a * 3 + T.t) * 2;
      p[i * 3] = Math.cos(q.a) * r; p[i * 3 + 1] = q.h * H; p[i * 3 + 2] = Math.sin(q.a) * r;
    }
    T.obj.geometry.attributes.position.needsUpdate = true;
    const d = Math.hypot(T.obj.position.x - player.x, T.obj.position.z - player.z);
    if (d < 140) this.shake = Math.max(this.shake, (1 - d / 140) * .6);
    else if (this._quakeT <= 0) this.shake = 0;
    if (T.t > 180) this.w.stopDisaster("tornado");
  }

  _updTsunami(dt) {
    const m = this.tsunami; this._tsT += dt;
    m.position.z -= 14 * dt;
    const t = this._tsT;
    m.userData.rise = t < 40 ? 6 * Math.min(1, t / 12) : Math.max(0, 6 * (1 - (t - 40) / 25));
    m.position.y = -8 + Math.min(t * 1.3, 11);
    if (t > 65) { this.scene.remove(m); this.tsunami = null; this.w.stopDisaster("tsunami"); }
  }

  get tornadoPos() { return this.tornado ? this.tornado.obj.position : null; }
}

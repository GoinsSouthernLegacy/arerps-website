// ARERPS World: Chattanooga-inspired Appalachian Aquatic Discovery Center campus, terrain, river, forest, grass.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
import * as THREE from "three";
import { buildAquaticExterior, cascadeGround } from "../systems/aquarium/AquaticExterior.js";
import { buildDispatchCenter } from "../systems/dispatch/DispatchCenter.js";

const rngSeed = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function height(x, z) {
  const n = Math.sin(x * .011) * Math.cos(z * .013) * .5 + Math.sin(x * .027 + 1.3) * Math.sin(z * .023) * .25 + Math.sin(x * .06 + z * .05) * .08;
  const r = Math.hypot(x * .8, z + 20);
  const hill = sstep(170, 420, r) * (38 + n * 30) + n * 1.1 * sstep(90, 170, r);
  const rv = sstep(58, 72, z) * (1 - sstep(250, 330, z));
  return hill * (1 - rv) - 4 * rv + n * .15;
}

// Pier / boardwalk decks the player may stand on above the water.
export function ground(x, z) {
  const cg = cascadeGround(x, z); if (cg > -50) return cg;
  if (x > 46 && x < 50.4 && z > 55 && z < 84) return .15;
  if (z > 55 && z < 63.2 && Math.abs(x) < 125) return .12;
  return -99;
}

function canvasTex(w, h, draw, rep) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.repeat.set(rep[0], rep[1]); return t;
}

export function buildWorld(scene, U, quality = "high") {
  const rnd = rngSeed(20260);
  const W = { colliders: [], buildings: [], updaters: [], nightMats: [], trees: [], height, ground, fuelPositions: [] };
  const add = (o) => { scene.add(o); return o; };

  // ---------- Materials & textures ----------
  const stoneTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#8d877b"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 32; x < w + 64; x += 64) {
      const v = 120 + Math.random() * 40; g.fillStyle = `rgb(${v + 12},${v + 6},${v - 4})`; g.fillRect(x + 1, y + 1, 62, 30);
    }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  const winTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#1b2a3a";
    g.fillStyle = "#cfd8e0"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#26384a"; g.fillRect(14, 16, 100, 70);
    const gr = g.createLinearGradient(0, 16, 0, 86); gr.addColorStop(0, "rgba(160,200,230,.5)"); gr.addColorStop(1, "rgba(20,40,60,0)"); g.fillStyle = gr; g.fillRect(14, 16, 100, 70);
    g.fillStyle = "#cfd8e0"; g.fillRect(62, 16, 4, 70);
  });
  const winEmis = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffd9a0"; g.fillRect(14, 16, 100, 70); g.fillStyle = "#000"; g.fillRect(62, 16, 4, 70); });
  const asphaltTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#2b2d31"; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 30 + Math.random() * 40; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, [30, 30]);
  const concreteTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#b9b6ad"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, [24, 24]);
  const woodTex = canvasTex(128, 128, (g, w, h) => { for (let y = 0; y < h; y += 16) { const v = 90 + Math.random() * 30; g.fillStyle = `rgb(${v + 30},${v},${v - 30})`; g.fillRect(0, y, w, 15); } }, [30, 3]);

  const mat = (o) => new THREE.MeshStandardMaterial(o);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9fd4ea, metalness: .1, roughness: .05, transparent: true, opacity: .38, transmission: 0, envMapIntensity: 1.6, emissive: 0x19c9e6, emissiveIntensity: 0, side: THREE.DoubleSide });
  W.nightMats.push({ m: glassMat, k: 1.6 });
  const steel = mat({ color: 0x6f7c88, metalness: .8, roughness: .35 });
  const roofMat = mat({ color: 0x8a8f94, roughness: .9 });

  function boxUV(geo, w, h, d, cell = [6, 4]) {
    const uv = geo.attributes.uv, groups = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * groups[f][0] / cell[0], uv.getY(k) * groups[f][1] / cell[1]); }
  }
  function wall(name, x, z, w, h, d, o = {}) {
    const geo = new THREE.BoxGeometry(w, h, d); boxUV(geo, w, h, d, o.cell || [6, 4]);
    const sm = mat({ color: o.color || 0xffffff, map: o.stone === false ? winTex : stoneTex, roughness: .85 });
    const wm = mat({ color: 0xffffff, map: winTex, emissiveMap: winEmis, emissive: 0xffc27a, emissiveIntensity: 0, roughness: .35, metalness: .2 });
    W.nightMats.push({ m: wm, k: 1.4 });
    // Side faces use the window wall, top uses roof
    const m = new THREE.Mesh(geo, [wm, wm, roofMat, roofMat, wm, wm]);
    m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; add(m);
    // stone base band
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + .2, 2.2, d + .2), sm); band.position.set(x, 1.1, z); band.castShadow = band.receiveShadow = true; add(band);
    W.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, maxY: h });
    if (name) {
      const anchors = [];
      for (let i = 0; i < 8; i++) anchors.push(new THREE.Vector3(x + (rnd() - .5) * w * .8, h + .2, z + (rnd() - .5) * d * .8));
      for (let i = 0; i < 4; i++) anchors.push(new THREE.Vector3(x + (rnd() - .5) * w * .8, 3 + rnd() * (h - 4), z + d / 2 + 1));
      const b = { name, mesh: m, mats: [wm, sm], anchors, burn: 0, center: new THREE.Vector3(x, h / 2, z), top: h }; W.buildings.push(b);
    }
    return m;
  }

  // ---------- Terrain ----------
  const SEG = quality === "high" ? 200 : 120, SZ = 1000;
  const tg = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = height(x, z); p.setY(i, h);
    const n = Math.sin(x * .13) * Math.sin(z * .11) * .5 + .5;
    if (h < -.7) c.set(0x6a5d48); else if (h < .1 && z > 50) c.set(0x8a7d62);
    else if (h > 24) c.setHSL(.27, .38, .2 + n * .06); else c.setHSL(.25 + n * .03, .5, .27 + n * .08 - h * .002);
    col.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute("color", new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, mat({ vertexColors: true, roughness: 1 })); terrain.receiveShadow = true; add(terrain);

  // ---------- River ----------
  const bump = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 1400; i++) { const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 10, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } g.globalCompositeOperation = "destination-over"; g.fillStyle = "#555"; g.fillRect(0, 0, w, h); }, [80, 26]);
  const wg = new THREE.PlaneGeometry(1000, 420, 100, 40); wg.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x1c4d63, roughness: .08, metalness: .15, bumpMap: bump, bumpScale: 1.4, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: .1 });
  waterMat.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.uTime; s.uniforms.uWave = U.uWave;
    s.vertexShader = "uniform float uTime; uniform float uWave;\n" + s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed.y += (sin(position.x*.15+uTime*1.1)+sin(position.z*.21+uTime*.8)*.7)*uWave*.5;");
  };
  waterMat.customProgramCacheKey = () => "arerps-water";
  const water = new THREE.Mesh(wg, waterMat); water.position.set(0, -1.2, 255); water.receiveShadow = true; add(water);
  W.water = water; W.waterBase = -1.2; W.updaters.push((t) => { bump.offset.set(t * .004, t * .0025); });

  // ---------- Pavement ----------
  const flat = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.receiveShadow = true; add(o); return o; };
  const conc = mat({ map: concreteTex, roughness: .9 }), asph = mat({ map: asphaltTex, roughness: .85 });
  const plaza = flat(new THREE.CircleGeometry(48, 64).rotateX(-Math.PI / 2), conc, 0, .05, 34);
  flat(new THREE.BoxGeometry(250, .1, 12), conc, 0, .06, 56.5);              // riverwalk promenade
  const road = (w, d, x, z) => flat(new THREE.BoxGeometry(w, .1, d), asph, x, .045, z);
  road(440, 12, 0, -62); road(12, 118, -145, -3); road(12, 118, 145, -3);
  road(120, 40, 120, -30); road(14, 120, -145, 40);
  const lineMat = mat({ color: 0xe8d34a, roughness: .7 });
  for (let x = -210; x < 210; x += 8) flat(new THREE.BoxGeometry(3, .02, .25), lineMat, x, .11, -62);
  const stripe = mat({ color: 0xffffff, roughness: .7 });
  for (let i = 0; i < 10; i++) flat(new THREE.BoxGeometry(.2, .02, 5), stripe, 70 + i * 4, .11, -30);

  // ---------- Boardwalk, pier, rails ----------
  flat(new THREE.BoxGeometry(250, .3, 8), mat({ map: woodTex, roughness: .9 }), 0, -.02, 59);
  flat(new THREE.BoxGeometry(4.4, .3, 29), mat({ map: woodTex, roughness: .9 }), 48.2, -.02, 69.5);
  const rail = mat({ color: 0x3b4650, metalness: .6, roughness: .5 });
  flat(new THREE.BoxGeometry(250, .08, .1), rail, 0, 1.1, 63.1); flat(new THREE.BoxGeometry(250, .08, .1), rail, 0, .6, 63.1);
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.05, .05, 1.1), rail, 100);
  for (let i = 0; i < 100; i++) posts.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-124 + i * 2.5, .55, 63.1)); add(posts);
  const pyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(.25, .25, 5), mat({ color: 0x4a3f33, roughness: 1 }), 60);
  for (let i = 0; i < 60; i++) pyl.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-124 + i * 4.2, -2.4, 62.8)); add(pyl);

  // ---------- Main aquarium ----------
  wall("Aquatic Discovery Center", 0, -10, 110, 15, 60);
  const pyr = (x, y, z, s, hh, rot = 0) => {
    const g = new THREE.Mesh(new THREE.ConeGeometry(s * .707, hh, 4, 1), glassMat); g.rotation.y = Math.PI / 4 + rot; g.position.set(x, y + hh / 2, z); g.castShadow = false; add(g);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g.geometry), new THREE.LineBasicMaterial({ color: 0x4d5a66 })); e.rotation.copy(g.rotation); e.position.copy(g.position); add(e);
    // glazing bars
    const e2 = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.ConeGeometry(s * .707, hh, 4, 4)), new THREE.LineBasicMaterial({ color: 0x66737f, transparent: true, opacity: .5 })); e2.rotation.copy(g.rotation); e2.position.copy(g.position); add(e2);
  };
  pyr(-26, 15, -10, 34, 20); pyr(2, 15, -10, 38, 26, .1); pyr(30, 15, -10, 32, 18);
  // front atrium: sloped glass + columns + canopy
  const atr = new THREE.Mesh(new THREE.BoxGeometry(46, 12, 16), glassMat); atr.position.set(0, 8, 28); atr.rotation.x = 0; add(atr);
  const slope = new THREE.Mesh(new THREE.PlaneGeometry(46, 22), glassMat); slope.position.set(0, 20, 12); slope.rotation.x = -Math.PI / 2 * .42; add(slope);
  for (let i = -3; i <= 3; i++) { const col2 = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 12), steel); col2.position.set(i * 7, 6, 36.2); col2.castShadow = true; add(col2); }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(50, .6, 10), steel); canopy.position.set(0, 12.2, 31); canopy.castShadow = true; add(canopy);
  // sign
  const signTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = "#12263a"; g.fillRect(0, 0, w, h); g.fillStyle = "#8fd0ee"; g.beginPath(); g.moveTo(40, 200); g.lineTo(110, 60); g.lineTo(150, 120); g.lineTo(190, 80); g.lineTo(260, 200); g.closePath(); g.fill();
    g.fillStyle = "#2e7bff"; g.beginPath(); g.ellipse(150, 190, 100, 26, 0, 0, 6.3); g.fill();
    g.fillStyle = "#fff"; g.font = "bold 92px system-ui"; g.fillText("APPALACHIAN", 300, 120);
    g.fillStyle = "#8fd0ee"; g.font = "46px system-ui"; g.fillText("AQUATIC DISCOVERY CENTER", 305, 190);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: .1 }));
  sign.position.set(-4, 12.5, 20.2); add(sign); W.nightMats.push({ m: sign.material, k: 1.2, base: .1 });
  const motto = new THREE.Mesh(new THREE.PlaneGeometry(10, 14), new THREE.MeshStandardMaterial({ map: canvasTex(256, 360, (g, w, h) => { g.fillStyle = "#1c3a5a"; g.fillRect(0, 0, w, h); g.fillStyle = "#cfe6f5"; g.font = "bold 38px system-ui"; ["EXPLORE", "EDUCATE", "CONSERVE", "TOGETHER"].forEach((t, i) => g.fillText(t, 20, 90 + i * 60)); }) }));
  motto.position.set(42, 8, 20.3); add(motto);

  // ---------- Observation tower ----------
  const tw = new THREE.Group(); tw.position.set(70, 0, -26);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 6.2, 92, 24, 1, true), glassMat); shaft.position.y = 46; tw.add(shaft);
  const frame = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.CylinderGeometry(3.6, 6.2, 92, 8, 14)), new THREE.LineBasicMaterial({ color: 0x5c6a76 })); frame.position.y = 46; tw.add(frame);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 92, 12), steel); core.position.y = 46; core.castShadow = true; tw.add(core);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 7, 3, 24), steel); deck.position.y = 93; deck.castShadow = true; tw.add(deck);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 6, 24, 1, true), glassMat); cab.position.y = 97.5; tw.add(cab);
  const troof = new THREE.Mesh(new THREE.ConeGeometry(8, 3, 24), roofMat); troof.position.y = 102; tw.add(troof);
  const rl = new THREE.Mesh(new THREE.TorusGeometry(9.4, .12, 6, 40), rail); rl.rotation.x = Math.PI / 2; rl.position.y = 95; tw.add(rl);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 6, 24), new THREE.MeshStandardMaterial({ map: stoneTex })); base.position.y = 3; base.castShadow = true; tw.add(base);
  add(tw); W.colliders.push({ minX: 61, maxX: 79, minZ: -35, maxZ: -17, maxY: 100 });

  // ---------- Other campus buildings ----------
  wall("Research Center", -100, -30, 56, 20, 34);
  wall("Parking Garage", -108, 14, 90, 22, 36, { cell: [4, 3.6] });
  wall("Animal Care Hospital", 108, 22, 42, 11, 30);
  wall(null, 118, -62, 20, 6, 20);
  // Amphitheater: curved stepped lawn + stage
  for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(24 + i * 3, 24 + i * 3, .5, 40, 1, false, Math.PI * .1, Math.PI * .8), mat({ color: 0x4f8f3a, roughness: 1 })); st.position.set(98, .25 * (i + 1) + i * .35, 70 - 20 - i * .1); st.rotation.y = Math.PI; st.receiveShadow = true; add(st); }
  const stage = new THREE.Mesh(new THREE.BoxGeometry(18, .8, 10), steel); stage.position.set(98, .4, 36); add(stage);
  const sroof = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, .5, 3, 1), steel); sroof.rotation.set(0, 0, 0); sroof.position.set(98, 7, 36); sroof.castShadow = true; add(sroof);
  [[-8, -4], [8, -4], [-8, 4], [8, 4]].forEach(([a, b]) => { const c2 = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 7), steel); c2.position.set(98 + a, 3.5, 36 + b); add(c2); });

  buildAquaticExterior(scene, W, rnd);

  // ---------- Fountain ----------
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 10, 1.4, 48), new THREE.MeshStandardMaterial({ map: stoneTex })); basin.position.set(0, .7, 34); basin.castShadow = basin.receiveShadow = true; add(basin);
  const fw = new THREE.Mesh(new THREE.CircleGeometry(8.6, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x2b7fa5, roughness: .05, transparent: true, opacity: .85, emissive: 0x19c9e6, emissiveIntensity: 0 })); fw.position.set(0, 1.25, 34); add(fw);
  W.nightMats.push({ m: fw.material, k: .6 });
  const JN = 700, jp = new Float32Array(JN * 3), jv = [];
  for (let i = 0; i < JN; i++) { const a = rnd() * 6.28, j = i % 5, rr = j ? 3.2 : 0; jv.push({ x: Math.cos(a) * (j ? 1.6 : .6), z: Math.sin(a) * (j ? 1.6 : .6), y: 9 + rnd() * 5 + (j ? -2 : 4), life: rnd() * 2, cx: Math.cos(a * 1.7) * rr, cz: Math.sin(a * 1.7) * rr }); }
  const jg = new THREE.BufferGeometry(); jg.setAttribute("position", new THREE.BufferAttribute(jp, 3));
  const jets = new THREE.Points(jg, new THREE.PointsMaterial({ color: 0xdff6ff, size: .22, transparent: true, opacity: .8, depthWrite: false })); jets.frustumCulled = false; add(jets);
  W.updaters.push((t, dt) => { for (let i = 0; i < JN; i++) { const q = jv[i]; q.life = (q.life + dt * .8) % 2; const s = q.life; jp[i * 3] = q.cx + q.x * s; jp[i * 3 + 1] = 1.4 + q.y * s - 6.5 * s * s; jp[i * 3 + 2] = 34 + q.cz + q.z * s; if (jp[i * 3 + 1] < 1.3) q.life = 0; } jg.attributes.position.needsUpdate = true; });

  // ---------- Lamp posts ----------
  const lampPos = []; for (let x = -120; x <= 120; x += 15) lampPos.push([x, 54.5]); for (let a = 0; a < 12; a++) lampPos.push([Math.cos(a / 12 * 6.28) * 46, 34 + Math.sin(a / 12 * 6.28) * 46 * .9]);
  const lp = new THREE.InstancedMesh(new THREE.CylinderGeometry(.08, .1, 5), steel, lampPos.length);
  const lm = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd9a0, emissiveIntensity: 0 }); W.nightMats.push({ m: lm, k: 4 });
  const lh = new THREE.InstancedMesh(new THREE.SphereGeometry(.35, 10, 8), lm, lampPos.length);
  lampPos.forEach(([x, z], i) => { lp.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 2.5, z)); lh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 5.1, z)); }); add(lp); add(lh);

  // ---------- Vegetation ----------
  const swayMat = (m, amp, off) => {
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = U.uTime; s.uniforms.uWind = U.uWind;
      s.vertexShader = "uniform float uTime; uniform float uWind;\n" + s.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x*.31 + instanceMatrix[3].z*.17;
        #else
        float ph = 0.;
        #endif
        float hh = max(position.y,0.) + ${off.toFixed(2)};
        float sw = sin(uTime*(1.4+uWind*3.)+ph)*(.03+uWind*.3) + sin(uTime*.6+ph*.5)*uWind*.18 + sin(uTime*(3.+uWind*6.)+ph*2.)*uWind*.05;
        transformed.x += sw*hh*${amp.toFixed(2)};
        transformed.z += sw*.6*hh*${amp.toFixed(2)};`);
    };
    m.customProgramCacheKey = () => "sway" + amp + off; return m;
  };
  W.dispatch = buildDispatchCenter(scene, W, 172, 8, Math.max(0, height(172, 8)));
  W.updaters.push((t, dt) => W.dispatch.update(t, dt));
  const occupied = (x, z, pad = 4) => (Math.abs(x - 172) < 18 + pad && Math.abs(z - 8) < 15 + pad) || W.colliders.some((c) => x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad);
  const paved = (x, z) => Math.hypot(x, z - 34) < 49 || (z > 52 && z < 64) || (Math.abs(z + 62) < 7) || (Math.abs(x + 145) < 7 && z < 52 && z > -62) || (Math.abs(x - 145) < 7 && z < 52 && z > -62) || (x > 60 && x < 180 && z > -52 && z < -8) || (Math.abs(x + 145) < 9 && z > -20);
  const crownGeo = new THREE.IcosahedronGeometry(1, 2); { const pp = crownGeo.attributes.position; for (let i = 0; i < pp.count; i++) { const k = 1 + (Math.sin(pp.getX(i) * 5) * Math.cos(pp.getZ(i) * 4)) * .18; pp.setXYZ(i, pp.getX(i) * k * 1.1, pp.getY(i) * k * .9, pp.getZ(i) * k * 1.1); } crownGeo.computeVertexNormals(); }
  const trunkM = mat({ color: 0x4b3b2d, roughness: 1 }), crownM = swayMat(mat({ color: 0xffffff, roughness: .85 }), .1, 3.5), pineM = swayMat(mat({ color: 0xffffff, roughness: .9 }), .06, 2.5);
  const trees = [], pines = [];
  const NT = quality === "high" ? 4200 : 1600;
  for (let i = 0; i < NT * 3 && trees.length + pines.length < NT; i++) {
    const x = (rnd() - .5) * 960, z = (rnd() - .5) * 960, h = height(x, z);
    if (h < -.5 || occupied(x, z, 6) || paved(x, z)) continue;
    const near = Math.hypot(x, z + 10) < 200;
    if (near && rnd() < .8 && Math.hypot(x, z - 20) < 130) { if (rnd() < .93) continue; }
    const s = near ? 3.5 + rnd() * 2.8 : 5 + rnd() * 6;
    (rnd() < (h > 14 ? .3 : .65) ? trees : pines).push({ x, z, h, s });
  }
  // ornamental trees around the campus paths
  for (let a = 0; a < 40; a++) { const ang = a / 40 * 6.28, r = 52 + rnd() * 8; const x = Math.cos(ang) * r, z = 34 + Math.sin(ang) * r * .6; if (z < 50 && !occupied(x, z, 2)) trees.push({ x, z, h: 0, s: 3 + rnd() }); }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .3, 1, 6), trunkM, trees.length + pines.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownM, trees.length * 2), cones = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.4, 8, 3), pineM, pines.length * 2);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), cc = new THREE.Color();
  trees.forEach((t, i) => {
    M.compose(V.set(t.x, t.h + t.s * .35, t.z), q, S.set(1, t.s * .7, 1)); trunks.setMatrixAt(i, M);
    for (let k = 0; k < 2; k++) { M.compose(V.set(t.x + (k ? .6 : 0), t.h + t.s * (.75 + k * .35), t.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), S.setScalar(t.s * (.62 - k * .15))); crowns.setMatrixAt(i * 2 + k, M); cc.setHSL(.24 + rnd() * .06, .5, .2 + rnd() * .12); crowns.setColorAt(i * 2 + k, cc); }
    if (Math.hypot(t.x, t.z + 10) < 200 && W.fuelPositions.length < 220) W.fuelPositions.push(new THREE.Vector3(t.x, t.h + 1, t.z));
  });
  pines.forEach((t, i) => {
    M.compose(V.set(t.x, t.h + t.s * .3, t.z), q.identity(), S.set(1, t.s * .6, 1)); trunks.setMatrixAt(trees.length + i, M);
    for (let k = 0; k < 2; k++) { M.compose(V.set(t.x, t.h + t.s * (.8 + k * .75), t.z), q, S.set(t.s * (.55 - k * .15), t.s * .7, t.s * (.55 - k * .15))); cones.setMatrixAt(i * 2 + k, M); cc.setHSL(.3 + rnd() * .04, .45, .12 + rnd() * .07); cones.setColorAt(i * 2 + k, cc); }
    if (Math.hypot(t.x, t.z + 10) < 200 && W.fuelPositions.length < 220) W.fuelPositions.push(new THREE.Vector3(t.x, t.h + 1, t.z));
  });
  [trunks, crowns, cones].forEach((o) => { o.castShadow = true; o.frustumCulled = false; add(o); });
  W.treeCount = trees.length + pines.length;

  // Grass blades that sway with the wind
  const gg = new THREE.PlaneGeometry(.22, 1, 1, 3); gg.translate(0, .5, 0);
  { const pp = gg.attributes.position, gc = new Float32Array(pp.count * 3); for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); gc.set([.12 + y * .22, .3 + y * .3, .08 + y * .05], i * 3); pp.setX(i, pp.getX(i) * (1 - y * .8)); } gg.setAttribute("color", new THREE.BufferAttribute(gc, 3)); }
  const grassM = swayMat(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), .5, 0);
  const NG = quality === "high" ? 26000 : 9000, grass = new THREE.InstancedMesh(gg, grassM, NG); let gi = 0;
  for (let tries = 0; tries < NG * 3 && gi < NG; tries++) {
    const x = (rnd() - .5) * 340, z = -110 + rnd() * 170;
    if (occupied(x, z, 1) || paved(x, z) || height(x, z) < -.2) continue;
    M.compose(V.set(x, height(x, z), z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 3.14), S.set(1, .5 + rnd() * .7, 1)); grass.setMatrixAt(gi++, M);
  }
  grass.count = gi; grass.frustumCulled = false; add(grass);
  // Shrubs / flower beds along walkways
  const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), swayMat(mat({ color: 0x3f7f3a, roughness: 1 }), .05, 1), 160);
  for (let i = 0; i < 160; i++) { const a = rnd() * 6.28, r = 50 + rnd() * 14; const x = Math.cos(a) * r, z = 34 + Math.sin(a) * r * .55; M.compose(V.set(x, .5, Math.min(z, 52)), q.identity(), S.set(.9 + rnd(), .5 + rnd() * .4, .9 + rnd())); shrubs.setMatrixAt(i, M); cc.setHSL(.25 + rnd() * .15, .5, .25 + rnd() * .15); shrubs.setColorAt(i, cc); }
  shrubs.castShadow = true; add(shrubs);

  // ---------- Parked + driving cars ----------
  const carColors = [0xc9ccd1, 0x1c2230, 0xb02a2a, 0xe8e8e8, 0x2b4a7a, 0x5b6068, 0x8a1d1d];
  const bodyGeo = new THREE.BoxGeometry(4.3, .75, 1.8), cabGeo = new THREE.BoxGeometry(2.2, .65, 1.6), wGeo = new THREE.CylinderGeometry(.36, .36, .26, 14).rotateX(Math.PI / 2);
  const wheelM = mat({ color: 0x0c0c0e, roughness: .9 }), glassC = mat({ color: 0x0b1118, metalness: .9, roughness: .08 });
  const hl = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2cf, emissiveIntensity: 0 }); W.nightMats.push({ m: hl, k: 3 });
  function car(color) {
    const g = new THREE.Group(), bm = new THREE.MeshPhysicalMaterial({ color, metalness: .7, roughness: .28, clearcoat: 1 });
    const b = new THREE.Mesh(bodyGeo, bm); b.position.y = .72; b.castShadow = true; g.add(b);
    const c2 = new THREE.Mesh(cabGeo, glassC); c2.position.set(-.3, 1.3, 0); c2.castShadow = true; g.add(c2);
    [[1.4, .85], [-1.4, .85], [1.4, -.85], [-1.4, -.85]].forEach(([x, z]) => { const w2 = new THREE.Mesh(wGeo, wheelM); w2.position.set(x, .36, z); g.add(w2); });
    [-.6, .6].forEach((z) => { const l = new THREE.Mesh(new THREE.BoxGeometry(.1, .15, .4), hl); l.position.set(2.16, .85, z); g.add(l); });
    return g;
  }
  for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { if (rnd() < .3) continue; const c3 = car(carColors[Math.floor(rnd() * carColors.length)]); c3.position.set(72 + i * 4, 0, -46 + r * 10 + (r > 1 ? 4 : 0)); c3.rotation.y = Math.PI / 2; add(c3); }
  W.cars = [];
  for (let i = 0; i < 5; i++) { const c3 = car(carColors[i]); add(c3); W.cars.push({ g: c3, t: i / 5 * 100, sp: 9 + i }); }
  const loop = (t) => { // rectangular loop around the roads, t in 0..100 -> x,z,rot
    const pts = [[-145, -62], [145, -62], [145, 50], [-145, 50]]; const L = [290, 112, 290, 112]; const tot = 804; let d = (t / 100) * tot;
    for (let i = 0; i < 4; i++) { if (d <= L[i]) { const a = pts[i], b = pts[(i + 1) % 4], k = d / L[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])]; } d -= L[i]; }
    return [-145, -62, 0];
  };
  W.updaters.push((t, dt) => W.cars.forEach((c3) => { c3.t = (c3.t + c3.sp * dt / 804 * 100) % 100; const [x, z, r] = loop(c3.t); c3.g.position.set(x + (Math.sin(r) * 3), 0, z - (Math.cos(r) * 3)); c3.g.rotation.y = -r; }));

  // ---------- Boats ----------
  W.boats = [];
  [[40, 70, .3], [58, 74, -.2], [-30, 85, 1], [100, 120, 0]].forEach(([x, z, r], i) => {
    const g = new THREE.Group(), hull = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1, 2), mat({ color: 0xf1f1f1, roughness: .4, metalness: .2 })); hull.position.y = .5; hull.castShadow = true; g.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2, .9, 1.5), glassC); cab.position.set(-.4, 1.4, 0); g.add(cab);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(5.42, .25, 2.02), mat({ color: [0x2e7bff, 0x1c4d63, 0xff2d4a, 0x2b4a7a][i % 4] })); stripe2.position.y = .75; g.add(stripe2);
    g.position.set(x, -1, z); g.rotation.y = r; add(g); W.boats.push({ g, x, z, r, i });
  });
  W.updaters.push((t) => W.boats.forEach((b) => { b.g.position.y = -1.05 + W.water.position.y + 1.2 + Math.sin(t * 1.2 + b.i) * .12 * U.uWave.value * 4; b.g.rotation.z = Math.sin(t * .9 + b.i) * .04 * (1 + U.uWave.value * 3); }));

  // ---------- Pedestrians ----------
  W.npcs = [];
  for (let i = 0; i < 28; i++) {
    const g = new THREE.Group(), cc2 = new THREE.Color().setHSL(rnd(), .5, .45);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .8, 4, 8), mat({ color: cc2, roughness: .8 })); b.position.y = 1.05; b.castShadow = true; g.add(b);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 10), mat({ color: [0xd6a98a, 0x8d5a3a, 0xf1c9a5, 0x5f3d2a][i % 4] })); hd.position.y = 1.78; g.add(hd);
    const lg = new THREE.Mesh(new THREE.BoxGeometry(.3, .7, .2), mat({ color: 0x2a2f3a })); lg.position.y = .35; g.add(lg);
    const path = i % 2 ? { z: 59 + rnd() * 3, x0: -118, x1: 118 } : { z: 20 + rnd() * 30, x0: -40, x1: 40, plaza: true };
    const n = { g, path, x: path.x0 + rnd() * (path.x1 - path.x0), dir: rnd() < .5 ? 1 : -1, sp: .9 + rnd() * .6, ph: rnd() * 6 };
    add(g); W.npcs.push(n);
  }
  W.updaters.push((t, dt) => W.npcs.forEach((n) => { if (n.down > 0) { n.down -= dt; n.g.rotation.z = n.down > .4 ? 1.5 : 0; n.g.position.y = height(n.x, n.path.z) + (n.down > .4 ? .25 : 0); return; } n.g.rotation.z = 0; n.x += n.dir * n.sp * dt; if (n.x > n.path.x1 || n.x < n.path.x0) n.dir *= -1; n.g.position.set(n.x, height(n.x, n.path.z) + Math.abs(Math.sin(t * 6 + n.ph)) * .05, n.path.z); n.g.rotation.y = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }));

  W.setNight = (n) => W.nightMats.forEach(({ m, k, base = 0 }) => { m.emissiveIntensity = base + n * k; });
  W.waterY = (rise) => { water.position.y = W.waterBase + rise; };
  W.update = (t, dt) => W.updaters.forEach((f) => f(t, dt));
  return W;
}

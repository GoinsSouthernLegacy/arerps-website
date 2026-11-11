// ARERPS Aquatic Exterior: waterfall-cascade staircase (inspired by the Chattanooga, TN aquarium plaza), banners,
// bus drop-off canopies, riverside dock with boats, terraced garden walls.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC or Xbox engines.
import * as THREE from "three";

export const CASCADE = { x0: 57, x1: 65, zTop: 14, zBot: 42, rise: 6, steps: 14 };

// Walkable height of the cascade stairs + upper terrace (used by game/world.js ground()).
export function cascadeGround(x, z) {
  const C = CASCADE; if (x < C.x0 || x > C.x1) return -99;
  if (z >= -8 && z < C.zTop) return C.rise;
  if (z < C.zTop || z > C.zBot) return -99;
  const i = Math.floor((z - C.zTop) / ((C.zBot - C.zTop) / C.steps));
  return C.rise - (i + 1) * (C.rise / C.steps);
}

export function buildAquaticExterior(scene, W, rnd) {
  const add = (o) => { scene.add(o); return o; };
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const C = CASCADE, stone = M({ color: 0x8d877b, roughness: .9 }), dark = M({ color: 0x3b4650, metalness: .6, roughness: .5 });
  const sw = C.x1 - C.x0, cx = (C.x0 + C.x1) / 2, dz = (C.zBot - C.zTop) / C.steps, dy = C.rise / C.steps;

  // water texture: vertical streaks that scroll down the steps
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 128; const g = cv.getContext("2d");
  g.fillStyle = "#4aa9cf"; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${.15 + Math.random() * .5})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 8 + Math.random() * 40); }
  const wtex = new THREE.CanvasTexture(cv); wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping; wtex.repeat.set(3, 1); wtex.colorSpace = THREE.SRGBColorSpace;
  const wmat = new THREE.MeshPhysicalMaterial({ map: wtex, color: 0xbfe8f7, transparent: true, opacity: .72, roughness: .05, emissive: 0x19c9e6, emissiveIntensity: 0, side: THREE.DoubleSide });
  W.nightMats.push({ m: wmat, k: .5 });

  // upper terrace beside the building, then the steps
  const tl = C.zTop + 8, ter = new THREE.Mesh(new THREE.BoxGeometry(sw, C.rise, tl), stone); ter.position.set(cx, C.rise / 2, (C.zTop - 8) / 2); ter.castShadow = ter.receiveShadow = true; add(ter);
  for (let i = 0; i < C.steps; i++) {
    const top = C.rise - (i + 1) * dy, z = C.zTop + i * dz + dz / 2;
    const s = new THREE.Mesh(new THREE.BoxGeometry(sw, Math.max(.05, top), dz), stone); s.position.set(cx, top / 2, z); s.castShadow = s.receiveShadow = true; add(s);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(sw - 1.2, dy), wmat); sheet.position.set(cx, top + dy / 2, z - dz / 2 - .02); add(sheet);
    const film = new THREE.Mesh(new THREE.PlaneGeometry(sw - 1.2, dz * .35).rotateX(-Math.PI / 2), wmat); film.position.set(cx, top + .03, z + dz * .15); add(film);
    for (const x of [C.x0 - .3, C.x1 + .3]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.6, top + 1.1, dz), stone); w.position.set(x, (top + 1.1) / 2, z); w.castShadow = true; add(w); }
  }
  for (const x of [C.x0 - .3, C.x1 + .3]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.1, tl), stone); w.position.set(x, C.rise + .55, (C.zTop - 8) / 2); add(w);
    W.colliders.push({ minX: x - .3, maxX: x + .3, minZ: -8, maxZ: C.zBot, maxY: 8 });
  }
  // plunge pool + mist
  const pool = new THREE.Mesh(new THREE.BoxGeometry(sw + 4, .5, 4), M({ color: 0x2b7fa5, roughness: .05, transparent: true, opacity: .85 })); pool.position.set(cx, .15, C.zBot + 2); add(pool);
  const N = 120, pp = new Float32Array(N * 3), seed = [];
  for (let i = 0; i < N; i++) seed.push({ x: (rnd() - .5) * sw, z: C.zBot + rnd() * 3, o: rnd() * 6.28 });
  const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const mist = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0xffffff, size: .35, transparent: true, opacity: .35, depthWrite: false })); mist.frustumCulled = false; add(mist);
  W.updaters.push((t) => {
    wtex.offset.y = -t * .8;
    seed.forEach((s, i) => { const k = (t * .4 + s.o) % 2; pp[i * 3] = cx + s.x + Math.sin(t + s.o) * .3; pp[i * 3 + 1] = .5 + k; pp[i * 3 + 2] = s.z; });
    mg.attributes.position.needsUpdate = true;
  });

  // banner poles around the plaza (blue, with a white emblem)
  const bt = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 192; const q = c.getContext("2d"); q.fillStyle = "#1f5fa8"; q.fillRect(0, 0, 64, 192); q.fillStyle = "#fff"; q.beginPath(); q.arc(32, 70, 16, 0, 6.3); q.fill(); q.fillStyle = "#8fd0ee"; q.fillRect(8, 120, 48, 5); q.fillRect(14, 132, 36, 5); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bm = M({ map: bt, side: THREE.DoubleSide, roughness: .8 });
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (.1 + i * .075), x = Math.cos(a) * 52, z = 34 + Math.sin(a) * 52 * .75;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 6), dark); pole.position.set(x, 3, z); add(pole);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.2), bm); b.position.set(x, 3.8, z); b.rotation.y = -a + Math.PI / 2; add(b);
  }
  // bus drop-off canopies
  const roofM = M({ color: 0xaab4bd, metalness: .5, roughness: .45 });
  [[-78, 40, .3], [-88, 48, .5], [-98, 56, .7]].forEach(([x, z, r]) => {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = r;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9, .25, 3.2), roofM); roof.position.y = 3.2; roof.castShadow = true; c.add(roof);
    [-4, 4].forEach((px) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 3.2), dark); p.position.set(px, 1.6, 1.2); c.add(p); });
    add(c);
  });
  // terraced garden retaining walls (curved stone)
  for (let k = 0; k < 2; k++) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(58 + k * 6, 58 + k * 6, .9 + k * .5, 48, 1, true, Math.PI * .12, Math.PI * .76), M({ color: 0x938c7f, roughness: .95, side: THREE.DoubleSide }));
    w.position.set(0, .45 + k * .25, 34); w.castShadow = w.receiveShadow = true; add(w);
  }
  // riverside dock with boats
  const dock = new THREE.Mesh(new THREE.BoxGeometry(14, .25, 3), M({ color: 0x7a6248, roughness: .9 })); dock.position.set(-30, .05, 73); add(dock);
  [[-34, 76.5, 0xffffff], [-28, 76.5, 0xe8eef2], [-22, 75.5, 0xffffff]].forEach(([x, z, c]) => {
    const b = new THREE.Group(), hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, .6, 5.2), M({ color: c, roughness: .4 })); hull.position.y = .1; b.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, .8, 1.6), M({ color: 0x2e5f8a })); cab.position.set(0, .8, .4); b.add(cab);
    b.position.set(x, -.3, z); const ph = rnd() * 6; add(b); W.updaters.push((t) => { b.position.y = -.3 + Math.sin(t * 1.2 + ph) * .06; b.rotation.z = Math.sin(t + ph) * .02; });
  });
}

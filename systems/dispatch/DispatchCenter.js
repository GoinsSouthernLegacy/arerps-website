// ARERPS Dispatch Data Center MK-II: an enterable building (control room, server room, NOC, electrical, UPS).
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC or Xbox engines.
// Colors follow the ARERPS rule: green = normal, blue = processing/data, red = fault/alert.
import * as THREE from "three";

const SX = 36, SZ = 30, WH = 4.6; // footprint (m) and wall height

function tex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, g, t };
}
const M = (o) => new THREE.MeshStandardMaterial(o);

export function buildDispatchCenter(scene, W, cx, cz, groundY = 0) {
  const root = new THREE.Group(); root.position.set(cx, groundY, cz); scene.add(root);
  const wallM = M({ color: 0x3a4048, roughness: .8, metalness: .3 });
  const floorM = M({ color: 0x1b1f26, roughness: .35, metalness: .5 });
  const trimM = M({ color: 0x2e7bff, emissive: 0x2e7bff, emissiveIntensity: 2.2 });
  const redM = M({ color: 0xff2d4a, emissive: 0xff2d4a, emissiveIntensity: 2.2 });
  const deskM = M({ color: 0x5b626c, roughness: .5, metalness: .3 });
  const darkM = M({ color: 0x14171c, roughness: .5, metalness: .6 });
  const mats = [wallM];
  const nightMats = [];

  const box = (w, h, d, x, y, z, m, parent = root) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  };
  const collide = (x0, x1, z0, z1, h = WH) => W.colliders.push({ minX: cx + x0, maxX: cx + x1, minZ: cz + z0, maxZ: cz + z1, maxY: h });

  // Wall along X (z fixed) or Z (x fixed) with door gaps: gaps = [[from,to],...]
  function wallRun(axis, fixed, a, b, gaps = [], trim = null) {
    const cuts = [a, ...gaps.flat(), b], T = .3;
    for (let i = 0; i < cuts.length; i += 2) {
      const s = cuts[i], e = cuts[i + 1]; if (e - s < .05) continue;
      if (axis === "x") { box(e - s, WH, T, (s + e) / 2, WH / 2, fixed, wallM); collide(s, e, fixed - T / 2, fixed + T / 2); }
      else { box(T, WH, e - s, fixed, WH / 2, (s + e) / 2, wallM); collide(fixed - T / 2, fixed + T / 2, s, e); }
    }
    gaps.forEach(([s, e]) => {
      const lh = WH - 2.6, ly = 2.6 + lh / 2;
      if (axis === "x") box(e - s, lh, T, (s + e) / 2, ly, fixed, wallM); else box(T, lh, e - s, fixed, ly, (s + e) / 2, wallM);
      if (trim) { if (axis === "x") box(e - s, .08, .06, (s + e) / 2, 2.6, fixed, trim); else box(.06, .08, e - s, fixed, 2.6, (s + e) / 2, trim); }
    });
  }

  const hx = SX / 2, hz = SZ / 2;
  box(SX, .2, SZ, 0, .1, 0, floorM);
  box(SX + .6, .4, SZ + .6, 0, WH + .2, 0, M({ color: 0x232830, roughness: .9 }));
  // exterior walls; the front door (south, +z) is a 3.5 m gap into the control room
  wallRun("x", hz, -hx, hx, [[-9, -5.5]], trimM); wallRun("x", -hz, -hx, hx);
  wallRun("z", -hx, -hz, hz); wallRun("z", hx, -hz, hz);
  // interior: control room is x -18..4; support rooms form the right column
  wallRun("z", 4, -hz, hz, [[-8, -5], [1, 4], [9, 12]], trimM);
  wallRun("x", -1, 4, hx); wallRun("x", 7, 4, hx, [], redM); wallRun("z", 11, 7, hz, [[10, 13]], redM);

  function sign(text, color, x, y, z, ry = 0, w = 3, h = .6) {
    const { t } = tex(512, 100, (g, ww, hh) => { g.fillStyle = "#0b1018"; g.fillRect(0, 0, ww, hh); g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(4, 4, ww - 8, hh - 8); g.fillStyle = color; g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, ww / 2, hh / 2); });
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .8 })); o.position.set(x, y, z); o.rotation.y = ry; root.add(o); return o;
  }
  sign("DISPATCH CONTROL ROOM", "#5aa2ff", -7.25, 3.5, hz - .2, Math.PI, 3.6, .6);
  sign("SERVER ROOM", "#5aa2ff", 3.8, 3.5, -6.5, -Math.PI / 2, 2.6, .5);
  sign("NOC ROOM", "#5aa2ff", 3.8, 3.5, 2.5, -Math.PI / 2, 2, .5);
  sign("ELECTRICAL – HIGH VOLTAGE", "#ff2d4a", 3.8, 3.5, 10.5, -Math.PI / 2, 3.4, .5);
  sign("UPS ROOM", "#ff2d4a", 10.8, 3.5, 11.5, -Math.PI / 2, 2, .5);

  const ext = tex(1024, 200, (g, w, h) => { g.fillStyle = "#0b1018"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2e7bff"; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = "#e8f0ff"; g.font = "bold 84px sans-serif"; g.textAlign = "center"; g.fillText("ARERPS DISPATCH", w / 2, 95); g.fillStyle = "#5aa2ff"; g.font = "44px sans-serif"; g.fillText("DATA CENTER MK-II · NOC", w / 2, 160); });
  const es = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.95), M({ map: ext.t, emissiveMap: ext.t, emissive: 0xffffff, emissiveIntensity: .7 })); es.position.set(5, 3.6, hz + .2); root.add(es);

  // ceiling strips (blue = normal data, red = alert) and room lights
  [-12, -6, 0].forEach((x) => box(.25, .08, 24, x, WH - .05, 0, trimM));
  box(.25, .08, 13, 8, WH - .05, -8, trimM); box(.25, .08, 6, 8, WH - .05, 3, trimM); box(.25, .08, 7, 8, WH - .05, 11, redM);
  const lights = [[-7, 3.6, 0, 0x8fb8ff, 160], [10, 3.6, -8, 0x4d8bff, 140], [10, 3.6, 3, 0x9cc4ff, 90], [10, 3.6, 11, 0xff3a4a, 100], [-12, 3.6, 10, 0x8fb8ff, 110]].map(([x, y, z, c, i]) => { const l = new THREE.PointLight(c, i, 16, 1.6); l.position.set(x, y, z); root.add(l); return l; });

  // big wall display (live list of incidents)
  const incidents = [], big = tex(1024, 512, () => {});
  function drawBig(t) {
    const g = big.g, w = 1024, h = 512; g.fillStyle = "#07101c"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#1c4a8c"; g.lineWidth = 2; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(40 + i * 56, 60); g.lineTo(150 + i * 38, 440); g.stroke(); g.beginPath(); g.moveTo(30, 60 + i * 38); g.lineTo(560, 80 + i * 36); g.stroke(); }
    incidents.slice(0, 6).forEach((it, i) => { const px = 120 + ((it.x * 7 + i * 83) % 400 + 400) % 400, py = 110 + ((it.z * 5 + i * 57) % 300 + 300) % 300; g.fillStyle = "#ff2d4a"; g.beginPath(); g.arc(px, py, 8 + 4 * Math.sin(t * 5 + i), 0, 7); g.fill(); });
    g.fillStyle = "#5aa2ff"; g.font = "bold 28px sans-serif"; g.fillText("INCIDENT OVERVIEW", 20, 38);
    g.fillStyle = "#0e1c30"; g.fillRect(600, 50, 400, 440); g.fillStyle = "#e8f0ff"; g.font = "bold 24px sans-serif"; g.fillText("ACTIVE INCIDENTS", 620, 84);
    if (!incidents.length) { g.fillStyle = "#44d17a"; g.font = "20px sans-serif"; g.fillText("● ALL CLEAR – SYSTEM NORMAL", 620, 130); }
    incidents.slice(0, 7).forEach((it, i) => { g.fillStyle = "#ff5a6a"; g.font = "20px sans-serif"; g.fillText(`${it.id}  ${it.label}`.slice(0, 32), 620, 125 + i * 44); g.fillStyle = "#9cb4d8"; g.font = "16px sans-serif"; g.fillText(`Units: ${it.units}`, 640, 146 + i * 44); });
    g.fillStyle = "#44d17a"; g.font = "20px sans-serif"; g.fillText("SERVERS ONLINE · RADIO ONLINE · UPS READY", 20, 490);
    big.t.needsUpdate = true;
  }
  drawBig(0);
  const bigScr = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5 * .85), M({ map: big.t, emissiveMap: big.t, emissive: 0xffffff, emissiveIntensity: 1.1 })); bigScr.position.set(-7, 2.7, -hz + .25); root.add(bigScr);
  box(9.3, 4.1, .12, -7, 2.7, -hz + .12, darkM);

  // console: curved ring of desks with monitors, facing the big screen
  const mon = tex(256, 160, (g, w, h) => { g.fillStyle = "#0a1626"; g.fillRect(0, 0, w, h); g.fillStyle = "#1d6fff"; for (let i = 0; i < 9; i++) g.fillRect(10, 12 + i * 15, 60 + Math.random() * 170, 7); g.strokeStyle = "#44d17a"; g.beginPath(); g.moveTo(0, 130); for (let x = 0; x < w; x += 12) g.lineTo(x, 130 - Math.random() * 25); g.stroke(); });
  const monM = M({ map: mon.t, emissiveMap: mon.t, emissive: 0xffffff, emissiveIntensity: .9 });
  const N = 9, R = 5.6, cxA = -7, czA = -2;
  for (let i = 0; i < N; i++) {
    const a = (i / (N - 1) - .5) * Math.PI * 1.3; // arc centered on the +z side, curving toward the big screen
    const x = cxA + Math.sin(a) * R, z = czA + Math.cos(a) * R * .8 + 2;
    const seg = new THREE.Group(); seg.position.set(x, 0, z); seg.rotation.y = Math.PI + a; root.add(seg);
    box(1.9, .75, .9, 0, .4, 0, deskM, seg); box(1.9, .05, .95, 0, .8, 0, darkM, seg); box(1.95, .06, .08, 0, .35, -.46, trimM, seg);
    [-.5, .5].forEach((dx) => { const sc = new THREE.Mesh(new THREE.PlaneGeometry(.8, .5), monM); sc.position.set(dx, 1.35, .08); sc.rotation.y = Math.PI; seg.add(sc); box(.84, .54, .04, dx, 1.35, .12, darkM, seg); box(.06, .4, .06, dx, 1.0, .12, darkM, seg); });
    if (i % 3 === 1) { const ch = new THREE.Group(); ch.position.set(0, 0, -.95); seg.add(ch); box(.55, .08, .55, 0, .5, 0, darkM, ch); box(.55, .65, .08, 0, .9, -.27, darkM, ch); box(.08, .5, .08, 0, .25, 0, darkM, ch); }
  }
  collide(-13.5, -.5, 1.5, 6, 1.1);

  const poster = (title, lines, x, z, ry) => { const { t } = tex(256, 320, (g, w, h) => { g.fillStyle = "#e9ecef"; g.fillRect(0, 0, w, h); g.fillStyle = "#16202e"; g.font = "bold 24px sans-serif"; g.fillText(title, 12, 34); g.font = "18px sans-serif"; lines.forEach((l, i) => g.fillText(l, 14, 74 + i * 32)); }); const o = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), M({ map: t, roughness: .9 })); o.position.set(x, 2, z); o.rotation.y = ry; root.add(o); };
  poster("DISPATCH PROTOCOLS", ["1 Receive call", "2 Verify location", "3 Prioritize", "4 Dispatch units", "5 Monitor", "6 Document"], -16.5, -hz + .2, 0);
  poster("UNIT STATUS", ["E-12  10-8", "M-2   10-17", "R-1   10-8", "10-33 Main St"], -17.8, -4, Math.PI / 2);
  poster("RESPONSE FLOW", ["Alert", "Assess", "Deploy", "Respond", "Review"], -17.8, 3, Math.PI / 2);

  // server room racks with blinking-LED fronts
  const led = tex(128, 256, (g, w, h) => { g.fillStyle = "#0d1118"; g.fillRect(0, 0, w, h); for (let y = 10; y < h - 6; y += 12) { g.fillStyle = "#1a2230"; g.fillRect(6, y, w - 12, 9); for (let x = 12; x < w - 14; x += 10) { g.fillStyle = Math.random() < .04 ? "#ff2d4a" : Math.random() < .5 ? "#2e7bff" : "#44d17a"; g.fillRect(x, y + 3, 5, 4); } } });
  const rackFront = M({ map: led.t, emissiveMap: led.t, emissive: 0xffffff, emissiveIntensity: 1.2 });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
    const rack = new THREE.Group(); rack.position.set(r ? 15.6 : 7.4, 0, -13.2 + i * 2.2); root.add(rack);
    box(1, 2.3, 1.7, 0, 1.2, 0, darkM, rack);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), rackFront); f.rotation.y = r ? -Math.PI / 2 : Math.PI / 2; f.position.set(r ? -.51 : .51, 1.2, 0); rack.add(f);
    box(.04, .04, 1.7, r ? -.52 : .52, .08, 0, trimM, rack);
  }
  collide(6.8, 8.0, -14, -.3, 2.4); collide(15, 16.2, -14, -.3, 2.4);
  [[0xff2d4a, -.25], [0x2e7bff, 0], [0xffd23a, .25]].forEach(([c, o]) => { const cm = M({ color: c, roughness: .6 }); box(.1, .1, 13, 11.5 + o, .24, -7.6, cm); box(.1, .1, 13, 11.5 + o, 4.2, -7.6, cm); });

  // NOC desk + network map
  box(2.4, .8, 1, 11, .45, 4, deskM);
  [-.7, 0, .7].forEach((dx) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(.7, .45), monM); s.position.set(11 + dx, 1.5, 4.4); s.rotation.y = Math.PI; root.add(s); });
  const noc = tex(512, 256, (g, w, h) => { g.fillStyle = "#07101c"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2e7bff"; g.lineWidth = 2; const pts = [[80, 70], [200, 50], [330, 90], [440, 60], [150, 170], [300, 190], [420, 170]]; pts.forEach((p, i) => pts.forEach((q, j) => { if (j > i && (i + j) % 3 < 2) { g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.stroke(); } })); pts.forEach((p) => { g.fillStyle = "#44d17a"; g.beginPath(); g.arc(p[0], p[1], 8, 0, 7); g.fill(); }); g.fillStyle = "#e8f0ff"; g.font = "bold 26px sans-serif"; g.fillText("NOC · NETWORK STATUS: ONLINE", 20, 236); });
  const nocS = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), M({ map: noc.t, emissiveMap: noc.t, emissive: 0xffffff, emissiveIntensity: 1 })); nocS.position.set(11, 2.6, 6.8); nocS.rotation.y = Math.PI; root.add(nocS);

  // electrical room (red) + UPS room
  [5.4, 6.6].forEach((x) => { box(1, 2, .5, x, 1.1, 14.3, M({ color: 0x8a919a, roughness: .5, metalness: .5 })); box(.2, .2, .05, x, 1.5, 14.03, redM); });
  const hv = tex(256, 128, (g, w, h) => { g.fillStyle = "#ffd23a"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.fillText("HIGH", w / 2, 55); g.fillText("VOLTAGE", w / 2, 100); });
  const hvS = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .6), M({ map: hv.t })); hvS.position.set(7.5, 2.1, 7.2); hvS.rotation.y = 0; root.add(hvS);
  for (let i = 0; i < 3; i++) { box(1.2, 2.1, .9, 13.5 + i * 1.5, 1.1, 14.3, darkM); box(.3, .15, .04, 13.5 + i * 1.5, 1.7, 13.83, i === 1 ? trimM : redM); }
  collide(12.8, 17.8, 13.7, 14.9, 2.2);

  // fire hook: invisible body is the "mesh"; wall material chars when it burns
  const body = new THREE.Mesh(new THREE.BoxGeometry(SX, WH, SZ), new THREE.MeshBasicMaterial({ visible: false })); body.position.set(0, WH / 2, 0); root.add(body);
  const anchors = []; for (let i = 0; i < 10; i++) anchors.push(new THREE.Vector3(cx + (Math.random() - .5) * SX * .8, groundY + WH + .3, cz + (Math.random() - .5) * SZ * .8));
  W.buildings.push({ name: "ARERPS Dispatch Center", mesh: body, mats, anchors, burn: 0, center: new THREE.Vector3(cx, groundY + WH / 2, cz), top: WH + .4 });

  let acc = 1, alarm = 0;
  return {
    root, position: new THREE.Vector3(cx, groundY, cz),
    setIncidents(list) { incidents.length = 0; incidents.push(...list); alarm = list.length; drawBig(performance.now() / 1000); },
    update(t, dt) {
      acc += dt; if (acc > .5) { acc = 0; drawBig(t); rackFront.emissiveIntensity = .9 + Math.random() * .5; }
      lights[3].intensity = alarm ? 100 + 80 * Math.sin(t * 6) : 60; redM.emissiveIntensity = alarm ? 1.6 + 1.4 * Math.sin(t * 6) : 1.2;
    }
  };
}

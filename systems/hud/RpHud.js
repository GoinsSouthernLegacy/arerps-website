// ARERPS RP HUD: minimap, level ring, health/armor, money, chat, radio/mic, action buttons, nametags, ammo.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC or Xbox engines.
// Generic roleplay-HUD layout built from scratch (no third-party game assets).
const CSS = `
#rp{position:fixed;inset:0;pointer-events:none;z-index:6;font-family:system-ui,sans-serif;color:#fff}
#rp>*{pointer-events:auto}
#rpMap{position:absolute;left:8px;top:8px;width:118px;height:118px;border-radius:50%;border:2px solid #7fd0ff;background:#0b1620;box-shadow:0 0 10px #0008}
#rpLvl{position:absolute;left:96px;top:96px;width:38px;height:38px;border-radius:50%;background:conic-gradient(#3aa0ff var(--p,0%),#123 0);display:grid;place-items:center;font-weight:800;font-size:13px}
#rpLvl span{background:#0b1620;width:30px;height:30px;border-radius:50%;display:grid;place-items:center}
#rpBars{position:absolute;left:8px;top:138px;width:150px}
.rpbar{height:14px;border-radius:7px;background:#0008;border:1px solid #fff3;overflow:hidden;margin-bottom:4px;position:relative}
.rpbar i{position:absolute;inset:0 auto 0 0;background:#e23b3b;transition:width .2s}
.rpbar.a i{background:#3aa0ff}.rpbar b{position:absolute;right:5px;top:-1px;font-size:11px}
#rpMoney{position:absolute;left:8px;top:182px;font-weight:800;color:#6dff9a;text-shadow:0 1px 3px #000}
#rpTop{position:absolute;right:8px;top:50px;display:flex;gap:6px}
.rpb{pointer-events:auto;background:#0b1620cc;border:1px solid #7fd0ff88;color:#fff;border-radius:10px;padding:7px 10px;font-size:14px;min-width:38px}
.rpb.on{background:#c4312e}
#rpChat{position:absolute;left:8px;bottom:84px;width:min(300px,52vw);font-size:12px}
#rpLog{max-height:92px;overflow:hidden;background:#0007;border-radius:8px;padding:4px 6px;display:flex;flex-direction:column;justify-content:flex-end}
#rpLog div{margin:1px 0}#rpLog .sys{color:#7fd0ff}#rpLog .red{color:#ff6b6b}
#rpIn{width:100%;box-sizing:border-box;margin-top:3px;background:#0009;border:1px solid #fff3;color:#fff;border-radius:8px;padding:5px;font-size:16px}
#rpAct{position:absolute;right:10px;bottom:120px;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
#rpAct .rpb{width:62px;height:62px;border-radius:50%;font-size:24px;padding:0}
#rpAmmo{position:absolute;right:12px;bottom:300px;font-weight:800;font-size:18px;text-shadow:0 1px 3px #000;text-align:right}
#rpCross{position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px;border:2px solid #fff9;border-radius:50%;display:none}
#rpHit{position:absolute;left:50%;top:40%;transform:translateX(-50%);font-weight:800;color:#ffd23a;text-shadow:0 1px 4px #000;opacity:0;transition:opacity .4s}
#rpFoot{position:absolute;right:8px;bottom:4px;font-size:10px;opacity:.7}
#rpDmg{position:absolute;inset:0;background:radial-gradient(transparent 40%,#d00 120%);opacity:0;transition:opacity .4s;pointer-events:none!important}
#rpDead{position:absolute;inset:0;background:#000d;display:none;place-items:center;font-size:28px;font-weight:800;pointer-events:none!important}
.rpTag{position:absolute;transform:translate(-50%,-100%);font-size:11px;background:#0009;border-radius:6px;padding:1px 5px;white-space:nowrap;pointer-events:none!important}
`;
const $ = (h) => { const d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstChild; };

export class RpHud {
  constructor({ world, controls, camera, combat, hooks }) {
    Object.assign(this, { world, controls, camera, combat, hooks }); this.money = 1500; this.xp = 0; this.level = 1; this.radio = false; this.mic = false; this.fires = [];
    const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
    this.root = $(`<div id="rp"><canvas id="rpMap" width="236" height="236"></canvas><div id="rpLvl"><span>1</span></div>
      <div id="rpBars"><div class="rpbar"><i id="rpHp"></i><b id="rpHpT"></b></div><div class="rpbar a"><i id="rpAr"></i><b id="rpArT"></b></div></div>
      <div id="rpMoney"></div>
      <div id="rpTop"><button class="rpb" data-k="store">🛒 STORE</button><button class="rpb" data-k="bell">🔔</button><button class="rpb" data-k="tasks">📋</button><button class="rpb" data-k="bag">🎒</button></div>
      <div id="rpChat"><div id="rpLog"></div><input id="rpIn" placeholder="Chat…" maxlength="120" enterkeyhint="send"></div>
      <div id="rpAct"><button class="rpb" id="rpRadio">📻</button><button class="rpb" id="rpMic">🎤</button><button class="rpb" id="rpEmote">…</button><button class="rpb" id="rpRel">↻</button><button class="rpb" id="rpAtk">👊</button></div>
      <div id="rpAmmo"></div><div id="rpCross"></div><div id="rpHit"></div><div id="rpFoot"></div><div id="rpDmg"></div><div id="rpDead">You were knocked out… returning to the hospital</div></div>`);
    document.body.append(this.root); this.q = (s) => this.root.querySelector(s);
    this.map = this.q("#rpMap").getContext("2d"); this.tags = new Map();
    const b = (s, f) => this.q(s).addEventListener("click", f);
    this.root.querySelectorAll("[data-k]").forEach((e) => e.addEventListener("click", () => this.toastK(e.dataset.k)));
    b("#rpRadio", (e) => { this.radio = !this.radio; e.currentTarget.classList.toggle("on", this.radio); this.say(this.radio ? "Radio ON – channel Dispatch 1" : "Radio OFF", "sys"); });
    b("#rpMic", (e) => { this.mic = !this.mic; e.currentTarget.classList.toggle("on", this.mic); this.say(this.mic ? "Mic live (voice chat needs a server)" : "Mic muted", "sys"); });
    b("#rpEmote", () => hooks.openEmotes()); b("#rpRel", () => combat.reload());
    const atk = this.q("#rpAtk"); atk.addEventListener("pointerdown", (e) => { e.preventDefault(); combat.trigger(true); }); ["pointerup", "pointerleave", "pointercancel"].forEach((n) => atk.addEventListener(n, () => combat.trigger(false)));
    const inp = this.q("#rpIn"); inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter" && inp.value.trim()) { this.say("You: " + inp.value.trim()); inp.value = ""; inp.blur(); } });
    addEventListener("keydown", (e) => { if (e.target === inp) return; if (e.code === "KeyR") combat.reload(); if (e.code === "Enter") inp.focus(); if (e.code === "KeyF") combat.trigger(true); });
    addEventListener("keyup", (e) => { if (e.code === "KeyF") combat.trigger(false); });
    addEventListener("mousedown", (e) => { if (e.button === 0 && e.target.id === "c" && combat.armed && controls.fps) combat.trigger(true); }); addEventListener("mouseup", () => combat.trigger(false));
    this.say("Welcome to Chattanooga, TN. Press Enter to chat.", "sys");
  }
  toastK(k) { this.hooks.toast({ store: "🛒 STORE: coming soon (cosmetics are free in this build)", bell: "🔔 No new alerts", tasks: "📋 Task: respond to any fire with the hose (+XP)", bag: "🎒 Open the Wheel (◎) for your gear" }[k]); }
  say(msg, cls = "") { const l = this.q("#rpLog"); const d = document.createElement("div"); if (cls) d.className = cls; d.textContent = msg; l.append(d); while (l.children.length > 6) l.firstChild.remove(); }
  addXp(n, cash = 0) { this.xp += n; this.money += cash; const need = this.level * 100; if (this.xp >= need) { this.xp -= need; this.level++; this.say("⭐ Level up! You are now level " + this.level, "sys"); } }
  hitMarker(t) { const e = this.q("#rpHit"); e.textContent = t; e.style.opacity = 1; clearTimeout(this._h); this._h = setTimeout(() => (e.style.opacity = 0), 600); }
  hurt() { const e = this.q("#rpDmg"); e.style.opacity = .8; setTimeout(() => (e.style.opacity = 0), 250); }
  setDead(v) { this.q("#rpDead").style.display = v ? "grid" : "none"; }

  update(dt, t) {
    const c = this.combat, p = this.controls.pos, hp = c.hp / c.maxHp * 100, ar = c.armor / 50 * 100;
    this.q("#rpHp").style.width = hp + "%"; this.q("#rpHpT").textContent = Math.round(hp) + "%"; this.q("#rpAr").style.width = Math.min(100, ar) + "%"; this.q("#rpArT").textContent = Math.round(Math.min(100, ar)) + "%";
    this.q("#rpLvl").style.setProperty("--p", this.xp / (this.level * 100) * 100 + "%"); this.q("#rpLvl span").textContent = this.level;
    this.q("#rpMoney").textContent = "$" + this.money.toLocaleString();
    const w = c.weapon; this.q("#rpCross").style.display = w && w.type !== "melee" ? "block" : "none";
    this.q("#rpAmmo").textContent = w ? (w.type === "melee" ? w.icon + " " + w.name : `${w.icon} ${c.ammo[c.id].mag} / ${c.ammo[c.id].reserve}${c.reloadT > 0 ? " ↻" : ""}`) : "";
    this.q("#rpAtk").textContent = w ? w.icon : "👊";
    const d = new Date(); this.q("#rpFoot").textContent = `Server time ${d.toTimeString().slice(0, 5)} · ${Math.round(1 / Math.max(dt, .001))} fps · Chattanooga RP`;
    this._map(p); this._tags(p);
  }
  _map(p) {
    const g = this.map, R = 118, S = 1.1, X = (x) => R + (x - p.x) * S, Z = (z) => R + (z - p.z) * S;
    g.clearRect(0, 0, 236, 236); g.save(); g.beginPath(); g.arc(R, R, R, 0, 7); g.clip(); g.fillStyle = "#16301f"; g.fillRect(0, 0, 236, 236);
    g.fillStyle = "#1d4d7a"; g.fillRect(0, Z(58), 236, 400);
    g.fillStyle = "#8d98a3"; for (const b of this.world.buildings) { const c = b.center; if (c) g.fillRect(X(c.x) - 6, Z(c.z) - 6, 12, 12); }
    g.fillStyle = "#5f6b76"; for (const c of this.world.colliders) { const w = c.maxX - c.minX, h = c.maxZ - c.minZ; if (w < 80 && h < 80) g.fillRect(X(c.minX), Z(c.minZ), w * S, h * S); }
    g.fillStyle = "#ff4b3a"; for (const f of this.hooks.fires()) { g.beginPath(); g.arc(X(f.pos.x), Z(f.pos.z), 4, 0, 7); g.fill(); }
    g.fillStyle = "#ffd23a"; for (const n of this.world.npcs) { const q = n.g.position; g.fillRect(X(q.x) - 1.5, Z(q.z) - 1.5, 3, 3); }
    g.translate(R, R); g.rotate(-this.controls.yaw); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
  }
  _tags(p) {
    const cam = this.camera, v = this.v || (this.v = cam.position.clone()), W = innerWidth, H = innerHeight; const used = new Set(); let n = 0;
    for (const o of this.world.npcs) {
      if (n > 10) break; const q = o.g.position; if (Math.hypot(q.x - p.x, q.z - p.z) > 22) continue;
      v.set(q.x, q.y + 2.2, q.z).project(cam); if (v.z > 1) continue; n++; used.add(o);
      let e = this.tags.get(o); if (!e) { e = document.createElement("div"); e.className = "rpTag"; e.textContent = "Lv " + (o.lv || (o.lv = 1 + Math.floor(Math.random() * 40))) + " · Citizen"; this.root.append(e); this.tags.set(o, e); }
      e.style.left = (v.x * .5 + .5) * W + "px"; e.style.top = (-v.y * .5 + .5) * H + "px";
    }
    for (const [o, e] of this.tags) if (!used.has(o)) { e.remove(); this.tags.delete(o); }
  }
}

// ARERPS ADMIN PANEL: PIN-protected control panel for weather, time, lightning, disasters and fire.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
// NOTE: The PIN only stops casual use on this device. A real multiplayer game needs server-side admin checks.
import { PRESETS, DISASTERS } from "../weather/WeatherSystem.js";

const h = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach((k) => n.append(k)); return n; };

async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("arerps:" + s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export class AdminPanel {
  // hooks: { igniteBuilding(), wildfire(), extinguishAll(), strike(kind), toast(msg) }
  constructor(root, weather, hooks) {
    this.root = root; this.w = weather; this.hooks = hooks; this.tab = "weather"; this.unlocked = false;
    root.className = "admin"; root.hidden = true;
  }
  open() { this.root.hidden = false; this._render(); }
  close() { this.root.hidden = true; }

  async _gate() {
    const stored = localStorage.getItem("arerps.adminpin");
    const input = h("input", { type: "password", inputMode: "numeric", placeholder: stored ? "Enter admin PIN" : "Create a 4+ digit PIN", maxLength: 12 });
    const msg = h("p", { className: "msg" });
    const go = h("button", { className: "btn primary", textContent: stored ? "Unlock" : "Set PIN" });
    go.addEventListener("click", async () => {
      if (input.value.length < 4) { msg.textContent = "PIN must be at least 4 characters."; return; }
      const hh = await sha(input.value);
      if (!stored) { localStorage.setItem("arerps.adminpin", hh); this.unlocked = true; this._render(); }
      else if (hh === stored) { this.unlocked = true; this._render(); }
      else msg.textContent = "Wrong PIN.";
    });
    return [h("h2", { textContent: "ARERPS ADMIN PANEL" }), h("p", { textContent: stored ? "Admins only." : "First time: choose your admin PIN." }), input, go, msg,
      h("button", { className: "btn", textContent: "Close", onclick: () => this.close() })];
  }

  async _render() {
    this.root.replaceChildren();
    const box = h("div", { className: "admin-box" }); this.root.append(box);
    if (!this.unlocked) { (await this._gate()).forEach((n) => box.append(n)); return; }
    const w = this.w;
    const head = h("div", { className: "admin-head" }, h("strong", { textContent: "⚙ ARERPS ADMIN PANEL" }), h("button", { className: "chip", textContent: "✕", onclick: () => this.close() }));
    const tabs = h("div", { className: "admin-tabs" });
    [["weather", "Weather"], ["time", "Time"], ["disasters", "Disasters"], ["fire", "Fire"]].forEach(([k, l]) =>
      tabs.append(h("button", { className: "chip" + (this.tab === k ? " on" : ""), textContent: l, onclick: () => { this.tab = k; this._render(); } })));
    const body = h("div", { className: "admin-body" });
    box.append(head, tabs, body);

    const slider = (label, min, max, step, get, set) => {
      const out = h("span", { textContent: (+get()).toFixed(2) });
      const i = h("input", { type: "range", min, max, step, value: get() });
      i.addEventListener("input", () => { set(+i.value); out.textContent = (+i.value).toFixed(2); });
      return h("label", {}, h("span", { textContent: label + " " }), out, i);
    };
    const check = (label, get, set) => {
      const i = h("input", { type: "checkbox", checked: get() }); i.addEventListener("change", () => set(i.checked));
      return h("label", { className: "check" }, i, document.createTextNode(" " + label));
    };

    if (this.tab === "weather") {
      body.append(check("Automatic Tennessee weather", () => w.auto, (v) => (w.auto = v)));
      const grid = h("div", { className: "modes" });
      Object.keys(PRESETS).forEach((p) => grid.append(h("button", { className: "chip" + (w.preset === p ? " on" : ""), textContent: p, onclick: () => { w.auto = false; w.set(p); this._render(); } })));
      body.append(h("h3", { textContent: "Preset" }), grid, h("h3", { textContent: "Fine tune" }));
      ["cloud", "rain", "wind", "fog", "storm", "snow"].forEach((k) => body.append(slider(k, 0, 1, .01, () => w.target[k], (v) => { w.auto = false; w.setCustom(k, v); })));
      body.append(h("h3", { textContent: "Lightning" }),
        check("Lightning enabled", () => w.lightning.enabled, (v) => (w.lightning.enabled = v)),
        slider("Strike rate", 0, 4, .1, () => w.lightning.rate, (v) => (w.lightning.rate = v)),
        slider("Chance a strike hits a player", 0, .2, .005, () => w.lightning.playerChance, (v) => (w.lightning.playerChance = v)),
        slider("Chance a strike hits a building", 0, .5, .01, () => w.lightning.buildingChance, (v) => (w.lightning.buildingChance = v)),
        h("div", { className: "modes" },
          h("button", { className: "chip", textContent: "⚡ Ground strike", onclick: () => this.hooks.strike("ground") }),
          h("button", { className: "chip", textContent: "⚡ Strike a building", onclick: () => this.hooks.strike("building") }),
          h("button", { className: "chip", textContent: "⚡ Strike me", onclick: () => this.hooks.strike("player") })));
    } else if (this.tab === "time") {
      const t = h("span", { textContent: "" }); const upd = () => (t.textContent = Math.floor(w.time) + ":" + String(Math.floor((w.time % 1) * 60)).padStart(2, "0"));
      upd();
      const i = h("input", { type: "range", min: 0, max: 23.99, step: .05, value: w.time }); i.addEventListener("input", () => { w.time = +i.value; upd(); });
      body.append(h("label", {}, h("span", { textContent: "Time of day " }), t, i),
        check("Pause time", () => w.paused, (v) => (w.paused = v)),
        slider("Speed (game minutes per second)", 0, 20, .5, () => w.timeScale * 60, (v) => (w.timeScale = v / 60)),
        h("div", { className: "modes" }, ...[["Dawn", 6], ["Noon", 12], ["Sunset", 19], ["Midnight", 0]].map(([n, v]) => h("button", { className: "chip", textContent: n, onclick: () => { w.time = v; this._render(); } }))));
    } else if (this.tab === "disasters") {
      body.append(h("p", { className: "warn", textContent: "All disasters are OFF by default. Arm one (unlock), then press Start." }));
      Object.entries(DISASTERS).forEach(([k, d]) => {
        const s = w.disasters[k];
        const row = h("div", { className: "drow" });
        const arm = h("input", { type: "checkbox", checked: s.armed }); arm.addEventListener("change", () => { s.armed = arm.checked; this._render(); });
        const start = h("button", { className: "chip danger", textContent: s.active ? "■ Stop" : "▶ Start", disabled: !s.armed && !s.active });
        start.addEventListener("click", () => { s.active ? w.stopDisaster(k) : w.startDisaster(k); setTimeout(() => this._render(), 50); });
        row.append(h("span", { textContent: d.icon + " " + d.label }), h("label", { className: "check" }, arm, document.createTextNode(" Arm")), start);
        body.append(row, slider("Intensity", .2, 1, .05, () => s.intensity, (v) => (s.intensity = v)));
      });
      body.append(h("button", { className: "btn", textContent: "Stop ALL disasters", onclick: () => { w.stopAll(); this._render(); } }));
    } else {
      body.append(h("div", { className: "modes" },
        h("button", { className: "chip danger", textContent: "🔥 Start building fire", onclick: () => this.hooks.igniteBuilding() }),
        h("button", { className: "chip danger", textContent: "🌳 Start forest fire", onclick: () => this.hooks.wildfire() }),
        h("button", { className: "chip", textContent: "💧 Put out all fires", onclick: () => this.hooks.extinguishAll() })));
    }
  }
}

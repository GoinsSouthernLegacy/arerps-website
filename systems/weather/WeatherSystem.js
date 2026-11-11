// ARERPS Weather & Disaster System (logic only, no rendering).
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
const clamp = (a, b, x) => Math.min(b, Math.max(a, x));

export const PRESETS = {
  clear:        { cloud: .08, rain: 0,   wind: .12, fog: 0,   storm: 0,   snow: 0 },
  partly:       { cloud: .45, rain: 0,   wind: .3,  fog: 0,   storm: 0,   snow: 0 },
  overcast:     { cloud: .9,  rain: 0,   wind: .25, fog: .1,  storm: .1,  snow: 0 },
  rain:         { cloud: .95, rain: .55, wind: .35, fog: .2,  storm: .25, snow: 0 },
  thunderstorm: { cloud: 1,   rain: .85, wind: .6,  fog: .25, storm: .7,  snow: 0 },
  supercell:    { cloud: 1,   rain: 1,   wind: .85, fog: .3,  storm: 1,   snow: 0 },
  fog:          { cloud: .6,  rain: 0,   wind: .05, fog: .8,  storm: 0,   snow: 0 },
  windy:        { cloud: .4,  rain: 0,   wind: .8,  fog: 0,   storm: 0,   snow: 0 },
  snow:         { cloud: .9,  rain: 0,   wind: .3,  fog: .3,  storm: 0,   snow: .8 },
  blizzard:     { cloud: 1,   rain: 0,   wind: .9,  fog: .6,  storm: .2,  snow: 1 }
};

// Tennessee-realistic random weather (weight). Snow/blizzard are admin-only.
const NATURAL = [["clear", 4], ["partly", 4], ["overcast", 2], ["rain", 2], ["thunderstorm", 1], ["fog", 1], ["windy", 1], ["supercell", .15]];

// Disasters are OFF by default and only run when an admin starts them.
export const DISASTERS = {
  tornado:    { label: "Tornado", icon: "🌪️" },
  hurricane:  { label: "Hurricane", icon: "🌀" },
  tsunami:    { label: "Tsunami", icon: "🌊" },
  earthquake: { label: "Earthquake", icon: "🛘" },
  wildfire:   { label: "Wildfire", icon: "🔥" },
  flood:      { label: "Flood", icon: "💧" }
};

export class WeatherSystem {
  constructor() {
    this.preset = "clear";
    this.target = { ...PRESETS.clear };
    this.cur = { ...PRESETS.clear };
    this.eff = { ...PRESETS.clear };
    this.gust = 0;
    this.time = 14;            // hour of day 0-24
    this.timeScale = 1 / 120;  // game hours per real second (24h = 48 min)
    this.paused = false;
    this.auto = true;
    this.autoEvery = 150;
    this._autoT = 0;
    this.clock = 0;
    this.disasters = {};
    Object.keys(DISASTERS).forEach((k) => (this.disasters[k] = { armed: false, active: false, intensity: .7 }));
    this.lightning = { enabled: true, rate: 1, playerChance: .01, buildingChance: .12 };
    this._l = {};
  }
  on(e, f) { (this._l[e] ||= []).push(f); return this; }
  emit(e, d) { (this._l[e] || []).forEach((f) => f(d)); }

  set(name) {
    if (!PRESETS[name]) return;
    this.preset = name; this.target = { ...PRESETS[name] };
    this.emit("change", name);
  }
  setCustom(key, v) { this.target[key] = clamp(0, 1, v); this.preset = "custom"; this.emit("change", "custom"); }
  startDisaster(name) {
    const d = this.disasters[name]; if (!d || d.active) return;
    d.active = true; this.emit("disaster", { name, on: true, intensity: d.intensity });
  }
  stopDisaster(name) {
    const d = this.disasters[name]; if (!d || !d.active) return;
    d.active = false; this.emit("disaster", { name, on: false });
  }
  stopAll() { Object.keys(this.disasters).forEach((k) => this.stopDisaster(k)); }
  forceStrike(kind) { this.emit("strike", { kind }); }

  _pickNatural() {
    const tot = NATURAL.reduce((a, b) => a + b[1], 0); let r = Math.random() * tot;
    for (const [n, w] of NATURAL) { if ((r -= w) <= 0) return n; }
    return "clear";
  }

  update(dt) {
    this.clock += dt;
    if (!this.paused) this.time = (this.time + dt * this.timeScale) % 24;
    if (this.auto) {
      this._autoT += dt;
      if (this._autoT > this.autoEvery) { this._autoT = 0; this.set(this._pickNatural()); }
    }
    const k = 1 - Math.exp(-dt * .35);
    for (const key in this.cur) this.cur[key] += (this.target[key] - this.cur[key]) * k;
    const e = this.eff;
    Object.assign(e, this.cur);
    const D = this.disasters;
    if (D.hurricane.active) { const i = D.hurricane.intensity; e.wind = Math.max(e.wind, .7 + .3 * i); e.rain = Math.max(e.rain, .8 + .2 * i); e.cloud = 1; e.storm = Math.max(e.storm, .9); e.fog = Math.max(e.fog, .3); }
    if (D.tornado.active) { e.cloud = 1; e.storm = Math.max(e.storm, .95); e.wind = Math.max(e.wind, .6); e.rain = Math.max(e.rain, .4); }
    const c = this.clock;
    this.gust = clamp(0, 1, e.wind * (.55 + .45 * Math.sin(c * .23) * Math.sin(c * .071 + 1) + .2 * Math.sin(c * 1.7)));
    const L = this.lightning;
    if (L.enabled && e.storm > .45) {
      if (Math.random() < dt * L.rate * (e.storm - .4) * .35) {
        const r = Math.random();
        const kind = r < L.playerChance ? "player" : r < L.playerChance + L.buildingChance ? "building" : "ground";
        this.emit("strike", { kind });
      }
    }
  }
}

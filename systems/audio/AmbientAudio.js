// ARERPS Ambient Audio: rain, wind, thunder, quake rumble, SCBA mask breathing, hose spray (all synthesized, no files).
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
export class AmbientAudio {
  constructor() { this.ctx = null; this.mask = false; this.fps = false; }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * .08) * .985; d[i] = last * 6 + (Math.random() * 2 - 1) * .2; }
    this.buf = buf;
    const loop = (type, freq, q = .7) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(); return g;
    };
    this.rainG = loop("highpass", 1800); this.windG = loop("lowpass", 500); this.rumbleG = loop("lowpass", 70); this.sprayG = loop("bandpass", 2500, .8);
    this.breathG = ctx.createGain(); this.breathG.gain.value = 0;
    const bs = ctx.createBufferSource(); bs.buffer = buf; bs.loop = true;
    this.breathF = ctx.createBiquadFilter(); this.breathF.type = "bandpass"; this.breathF.frequency.value = 900; this.breathF.Q.value = 1.2;
    bs.connect(this.breathF); this.breathF.connect(this.breathG); this.breathG.connect(ctx.destination); bs.start();
    this._breath = 0;
  }

  setWeather(e, gust) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.rainG.gain.setTargetAtTime(e.rain * .22, t, .5);
    this.windG.gain.setTargetAtTime(gust * .5 + .02, t, .4);
  }
  // Short synthesized weapon sounds: "sidearm","rifle","shotgun","taser","melee","dry"
  shot(kind) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    const P = { sidearm: [1800, .12, .55], rifle: [1400, .14, .6], shotgun: [700, .3, .9], taser: [4500, .35, .3], melee: [500, .08, .35], dry: [3000, .03, .2] }[kind] || [1500, .1, .5];
    const s = ctx.createBufferSource(); s.buffer = this.buf; const f = ctx.createBiquadFilter(); f.type = kind === "taser" ? "highpass" : "lowpass"; f.frequency.value = P[0];
    const g = ctx.createGain(); g.gain.setValueAtTime(P[2], t); g.gain.exponentialRampToValueAtTime(.001, t + P[1]);
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t, Math.random() * 2, P[1] + .05);
  }
  quake(v) { if (this.ctx) this.rumbleG.gain.setTargetAtTime(v * .9, this.ctx.currentTime, .2); }
  spray(on) { if (this.ctx) this.sprayG.gain.setTargetAtTime(on ? .22 : 0, this.ctx.currentTime, .08); }

  thunder(delay) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime + Math.min(delay, 6);
    const s = ctx.createBufferSource(); s.buffer = this.buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 220 + Math.random() * 200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.9, t0 + .05); g.gain.exponentialRampToValueAtTime(.001, t0 + 3.5);
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t0, Math.random() * 2, 4);
  }

  // Mask breathing only matters when a mask is worn; louder and tighter in first person.
  update() {
    if (!this.ctx || !this.mask) return;
    const ctx = this.ctx, now = ctx.currentTime;
    if (now < this._breath) return;
    const v = this.fps ? .5 : .12, g = this.breathG.gain;
    g.cancelScheduledValues(now);
    this.breathF.frequency.setValueAtTime(900, now);
    g.setValueAtTime(0, now); g.linearRampToValueAtTime(v, now + .9); g.linearRampToValueAtTime(0, now + 1.5);
    this.breathF.frequency.setValueAtTime(600, now + 1.6);
    g.linearRampToValueAtTime(v * .7, now + 2.2); g.linearRampToValueAtTime(0, now + 3.1);
    this._breath = now + 3.4;
  }
}

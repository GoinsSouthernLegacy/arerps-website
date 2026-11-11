// ARERPS Emotes & Emotions: animations for the rigged avatar plus floating emotion bubbles. Pick them on the radial wheel.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC or Xbox engines.
import * as THREE from "three";

const S = Math.sin;
// Each pose(t) returns joint angles (radians): aLx/aRx = arm swing (negative = forward/up), aLz/aRz = arm sideways, lL/lR = legs, by = body up/down, bx = lean, bry = spin, hx = head tilt.
export const EMOTES = [
  { id: "wave", icon: "👋", label: "Wave", pose: (t) => ({ aRx: -2.7, aRz: .3 + S(t * 9) * .45 }) },
  { id: "salute", icon: "🫡", label: "Salute", pose: () => ({ aRx: -2.3, aRz: -.5 }) },
  { id: "point", icon: "👉", label: "Point", pose: () => ({ aRx: -1.57 }) },
  { id: "halt", icon: "✋", label: "Stop / Halt", pose: () => ({ aRx: -1.57, aRz: .15 }) },
  { id: "handsup", icon: "🙌", label: "Hands Up", pose: () => ({ aLx: -3, aRx: -3, aLz: -.25, aRz: .25 }) },
  { id: "thumbs", icon: "👍", label: "Thumbs Up", pose: () => ({ aRx: -1.2, aRz: .2 }) },
  { id: "clap", icon: "👏", label: "Clap", pose: (t) => ({ aLx: -1.3, aRx: -1.3, aLz: .45 - Math.abs(S(t * 10)) * .4, aRz: -.45 + Math.abs(S(t * 10)) * .4 }) },
  { id: "facepalm", icon: "🤦", label: "Facepalm", pose: () => ({ aRx: -2.6, aRz: -.1, hx: .4 }) },
  { id: "dance", icon: "🕺", label: "Dance", pose: (t) => ({ aLx: -2.4 + S(t * 8) * .8, aRx: -2.4 - S(t * 8) * .8, lL: S(t * 8) * .5, lR: -S(t * 8) * .5, by: Math.abs(S(t * 8)) * .12, bry: S(t * 4) * .6 }) },
  { id: "cheer", icon: "🎉", label: "Cheer", pose: (t) => ({ aLx: -3, aRx: -3, aLz: -.4, aRz: .4, by: Math.abs(S(t * 9)) * .3 }) },
  { id: "flex", icon: "💪", label: "Flex", pose: (t) => ({ aLx: -.3, aRx: -.3, aLz: -1.5, aRz: 1.5, by: S(t * 6) * .02 }) },
  { id: "bow", icon: "🙇", label: "Bow", pose: () => ({ bx: .7 }) },
  { id: "sit", icon: "🪑", label: "Sit", pose: () => ({ lL: -1.5, lR: -1.5, aLx: -.6, aRx: -.6, by: -.42 }) },
  { id: "kneel", icon: "🧎", label: "Kneel", pose: () => ({ lL: -1.2, lR: .3, by: -.35, aLx: -.4, aRx: -.4 }) },
  { id: "crossed", icon: "🙅", label: "Arms Crossed", pose: () => ({ aLx: -1.1, aRx: -1.1, aLz: .7, aRz: -.7 }) },
  { id: "shrug", icon: "🤷", label: "Shrug", pose: (t) => ({ aLz: -.7, aRz: .7, aLx: -.5, aRx: -.5, by: S(t * 3) * .02 }) }
];

// Emotion bubbles: a floating emoji above the head for a few seconds.
export const EMOTIONS = [
  { id: "happy", icon: "😀", label: "Happy" }, { id: "laugh", icon: "😂", label: "Laugh" }, { id: "angry", icon: "😡", label: "Angry" },
  { id: "sad", icon: "😢", label: "Sad" }, { id: "shock", icon: "😱", label: "Shocked" }, { id: "love", icon: "😍", label: "Love" },
  { id: "cool", icon: "😎", label: "Cool" }, { id: "think", icon: "🤔", label: "Thinking" }
];

export class Emotes {
  constructor(controls) { this.c = controls; this.sprite = null; this.t = 0; }
  play(id) { const e = EMOTES.find((x) => x.id === id); if (e) this.c.playEmote(e.pose); }
  stop() { this.c.emoteFn = null; }
  feel(icon, seconds = 4) {
    if (this.sprite) this.c.avatar.remove(this.sprite);
    const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"); g.font = "96px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(icon, 64, 70);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true })); sp.scale.set(.7, .7, 1); sp.position.y = 2.35; sp.renderOrder = 10;
    this.c.avatar.add(sp); this.sprite = sp; this.t = seconds;
  }
  update(dt) {
    if (!this.sprite) return; this.t -= dt;
    this.sprite.position.y = 2.35 + Math.sin(performance.now() / 300) * .05; this.sprite.visible = !this.c.fps;
    if (this.t <= 0) { this.c.avatar.remove(this.sprite); this.sprite = null; }
  }
  emoteItems() { return EMOTES.map((e) => ({ icon: e.icon, label: e.label, action: () => this.play(e.id) })); }
  emotionItems() { return EMOTIONS.map((e) => ({ icon: e.icon, label: e.label, action: () => this.feel(e.icon) })); }
}

// ARERPS Radial Wheel: tap-to-open interactive wheel for tools, weapons, equipment, armor and SPRAID commands.
// PLATFORM: iOS (Safari/PWA), web app, website. NOT for Roblox Studio, PC/Xbox engines.
// items: [{label, icon, active?:()=>bool, action?:()=>void, children?:[...]}]
export class WheelMenu {
  constructor(root) {
    this.root = root; this.stack = [];
    root.className = "wheel"; root.hidden = true;
    root.addEventListener("pointerdown", (e) => { if (e.target === root) this.close(); });
  }
  get isOpen() { return !this.root.hidden; }
  open(items, title = "ARERPS WHEEL") { this.stack = [{ items, title }]; this.root.hidden = false; this._render(); }
  close() { this.root.hidden = true; this.stack = []; }
  toggle(items) { this.isOpen ? this.close() : this.open(items); }

  _render() {
    const { items, title } = this.stack[this.stack.length - 1];
    this.root.replaceChildren();
    const ring = document.createElement("div"); ring.className = "wheel-ring"; this.root.append(ring);
    const r = Math.min(150, Math.min(innerWidth, innerHeight) * .32);
    const hub = document.createElement("button"); hub.className = "wheel-hub";
    hub.textContent = this.stack.length > 1 ? "◀ Back" : "✕ " + title;
    hub.addEventListener("click", () => { if (this.stack.length > 1) { this.stack.pop(); this._render(); } else this.close(); });
    ring.append(hub);
    items.forEach((it, i) => {
      const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
      const b = document.createElement("button"); b.className = "wheel-item";
      if (it.active && it.active()) b.classList.add("on");
      b.style.transform = `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px)`;
      b.innerHTML = `<span class="i">${it.icon || "•"}</span><span class="l">${it.label}</span>`;
      b.addEventListener("click", () => {
        if (it.children) { this.stack.push({ items: it.children, title: it.label }); this._render(); }
        else { it.action && it.action(); if (it.keepOpen) this._render(); else this.close(); }
      });
      ring.append(b);
    });
  }
}

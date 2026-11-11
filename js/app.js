(function () {
  "use strict";
  const D = window.ARERPS;
  const $ = (s) => document.querySelector(s);
  const el = (tag, props, ...kids) => {
    const n = document.createElement(tag);
    Object.assign(n, props || {});
    kids.forEach((k) => n.append(k));
    return n;
  };

  const menu = $("#menu"), menuBtn = $("#menuBtn");
  menuBtn.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { menu.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  });
  $("#year").textContent = new Date().getFullYear();

  D.departments.forEach((d) => {
    $("#deptGrid").append(el("article", { className: "card" }, el("h3", { textContent: d.icon + " " + d.name }), el("p", { textContent: d.text })));
    $("#applyDept").append(el("option", { textContent: d.name }));
  });
  D.city.forEach((c) => {
    $("#cityGrid").append(el("article", { className: "card" }, el("h3", { textContent: c.icon + " " + c.name }), el("p", { textContent: c.text })));
  });
  D.locations.forEach((l) => $("#callLoc").append(el("option", { textContent: l })));

  D.roadmap.forEach(([title, text]) => {
    $("#roadmapList").append(el("details", { className: "card" }, el("summary", { textContent: title }), el("p", { textContent: text })));
  });

  let current = 0, mode = 0;
  const list = $("#unitList"), detail = $("#unitDetail");
  function renderUnit() {
    const u = D.units[current];
    list.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-selected", String(i === current)));
    const row = el("div", { className: "modes" });
    D.lightModes.forEach((m, i) => {
      const b = el("button", { className: "chip" + (i === mode ? " on" : ""), textContent: m, type: "button" });
      b.addEventListener("click", () => {
        mode = i; renderUnit();
        window.dispatchEvent(new CustomEvent("arerps-lightmode", { detail: i }));
      });
      row.append(b);
    });
    detail.replaceChildren(
      el("h3", { textContent: u.name }),
      el("p", { className: "tag", textContent: u.role + " · " + u.id }),
      el("p", { textContent: u.text }),
      el("p", { textContent: "Light mode (also changes the 3D scene at the top):" }),
      row
    );
  }
  D.units.forEach((u, i) => {
    const b = el("button", { type: "button", role: "tab", textContent: u.name });
    b.addEventListener("click", () => { current = i; renderUnit(); });
    list.append(b);
  });
  renderUnit();

  const KEY = "arerps.calls.v1";
  const unitsPool = ["Unit 09", "Unit 12", "Medic 3", "Engine 7", "Drone 2", "Unit 21"];
  let calls = [];
  try { calls = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { calls = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(calls)); } catch (e) { /* storage unavailable */ } };
  function renderCalls() {
    const ul = $("#callList");
    ul.replaceChildren();
    if (!calls.length) ul.append(el("li", { className: "empty", textContent: "No active calls. Create one!" }));
    calls.forEach((c) => {
      const assign = el("button", { className: "chip", type: "button", textContent: c.unit ? "Assigned: " + c.unit : "Assign unit" });
      assign.addEventListener("click", () => {
        c.unit = unitsPool[(unitsPool.indexOf(c.unit) + 1) % unitsPool.length];
        save(); renderCalls();
      });
      const close = el("button", { className: "chip", type: "button", textContent: "Close" });
      close.addEventListener("click", () => { calls = calls.filter((x) => x.id !== c.id); save(); renderCalls(); });
      ul.append(el("li", { className: "p" + c.pri },
        el("strong", { textContent: "P" + c.pri + " · " + c.type }),
        el("span", { textContent: c.loc + " · " + c.time }),
        el("div", { className: "modes" }, assign, close)));
    });
  }
  $("#callForm").addEventListener("submit", (e) => {
    e.preventDefault();
    calls.unshift({ id: Date.now(), type: $("#callType").value, loc: $("#callLoc").value, pri: $("#callPri").value, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), unit: "" });
    calls = calls.slice(0, 30);
    save(); renderCalls();
  });
  $("#clearCalls").addEventListener("click", () => { calls = []; save(); renderCalls(); });
  renderCalls();

  // Applications are saved on this device. Set CONTACT_EMAIL to also open an email draft.
  const CONTACT_EMAIL = "";
  $("#applyForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const app = Object.fromEntries(new FormData(e.target).entries());
    try {
      const all = JSON.parse(localStorage.getItem("arerps.apps.v1") || "[]");
      all.push({ ...app, at: new Date().toISOString() });
      localStorage.setItem("arerps.apps.v1", JSON.stringify(all));
    } catch (err) { /* ignore */ }
    $("#applyMsg").textContent = "Application saved on this device. Thank you, " + app.username + "!";
    if (CONTACT_EMAIL) {
      const body = Object.entries(app).map(([k, v]) => k + ": " + v).join("\n");
      location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("ARERPS application – " + app.dept) + "&body=" + encodeURIComponent(body);
    }
    e.target.reset();
  });

  let deferred;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; $("#installBtn").hidden = false; });
  $("#installBtn").addEventListener("click", () => { if (deferred) { deferred.prompt(); deferred = null; $("#installBtn").hidden = true; } });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
})();

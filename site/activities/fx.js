/* AUD AI Festival — visual & audio effects for the activities page.
   FX.bg       living neural network behind the page (reacts to pointer, ripples on events)
   FX.burst    particle burst at a point          FX.confetti  full-screen celebration
   FX.float    rising "+120" text                 FX.shake / FX.flash
   FX.sound    tiny WebAudio cues (off by default; toggle in the top bar) */
(() => {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = { ember: [255, 106, 61], ion: [143, 216, 255], signal: [215, 255, 90], alarm: [255, 61, 90], paper: [236, 232, 223] };
  const VIEW_ACCENT = { hub: "ember", quiz: "ion", prompt: "signal", ainot: "ember" };
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const pointer = { x: -9999, y: -9999, on: false };

  /* ───── background network ───── */
  const bg = (() => {
    const c = document.getElementById("bg"), ctx = c.getContext("2d");
    let W = 0, H = 0, dpr = 1, nodes = [], pulses = [], ripples = [];
    let accent = COLORS.ember.slice(), target = COLORS.ember;
    const LINK = 140;
    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(36, Math.min(120, Math.round((W * H) / 15000)));
      while (nodes.length < n) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: .8 + Math.random() * 1.8, alt: Math.random() < .3 });
      nodes.length = n;
    }
    function frame() {
      if (!document.hidden) {
        accent = mix(accent, target, .04);
        ctx.clearRect(0, 0, W, H);
        for (const n of nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20; if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
          const dx = n.x - pointer.x, dy = n.y - pointer.y, d = Math.hypot(dx, dy);
          if (d < 180 && d > 1) { n.x += (dx / d) * (180 - d) * .012; n.y += (dy / d) * (180 - d) * .012; }
          for (const r of ripples) {
            const rd = Math.hypot(n.x - r.x, n.y - r.y);
            if (Math.abs(rd - r.r) < 30 && rd > 1) { n.x += ((n.x - r.x) / rd) * 2.2 * r.a; n.y += ((n.y - r.y) / rd) * 2.2 * r.a; n.glow = 1; }
          }
          n.glow = (n.glow || 0) * .95;
        }
        // links
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < LINK) {
              ctx.strokeStyle = rgba(accent, (1 - d / LINK) * .22 + Math.max(a.glow, b.glow) * .3);
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
              if (Math.random() < .0009 && pulses.length < 40) pulses.push({ a, b, t: 0, s: .012 + Math.random() * .02 });
            }
          }
          const pd = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (pd < 200) { ctx.strokeStyle = rgba(accent, (1 - pd / 200) * .35); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke(); }
        }
        // nodes
        for (const n of nodes) {
          const col = n.alt ? COLORS.paper : accent;
          ctx.fillStyle = rgba(col, .55 + n.glow * .45);
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + n.glow * 2.5, 0, 6.283); ctx.fill();
        }
        // signals travelling along links
        pulses = pulses.filter((p) => (p.t += p.s) < 1);
        for (const p of pulses) {
          const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
          ctx.fillStyle = rgba(accent, .95); ctx.shadowColor = rgba(accent, 1); ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        }
        // ripples
        ripples = ripples.filter((r) => (r.r += 9) < r.max);
        for (const r of ripples) {
          r.a = 1 - r.r / r.max;
          ctx.strokeStyle = rgba(r.c, r.a * .5); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
        }
      }
      requestAnimationFrame(frame);
    }
    if (!reduced) { resize(); addEventListener("resize", resize); requestAnimationFrame(frame); }
    return {
      view(v) { target = COLORS[VIEW_ACCENT[v] || "ember"]; },
      ripple(x, y, color = "signal") { ripples.push({ x, y, r: 10, max: Math.max(innerWidth, innerHeight) * .9, c: COLORS[color] || color, a: 1 }); },
    };
  })();

  /* ───── particles (bursts + confetti) on the top canvas ───── */
  const fxc = document.getElementById("fx"), fctx = fxc.getContext("2d");
  let parts = [], running = false;
  function sizeFx() { const d = Math.min(2, devicePixelRatio || 1); fxc.width = innerWidth * d; fxc.height = innerHeight * d; fctx.setTransform(d, 0, 0, d, 0, 0); }
  sizeFx(); addEventListener("resize", sizeFx);
  function run() {
    if (running) return; running = true;
    const step = () => {
      fctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => (p.life -= p.decay) > 0 && p.y < innerHeight + 40);
      for (const p of parts) {
        p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        fctx.save(); fctx.globalAlpha = Math.min(1, p.life * 1.5); fctx.translate(p.x, p.y); fctx.rotate(p.rot);
        fctx.fillStyle = p.col;
        if (p.shape === 0) { fctx.beginPath(); fctx.arc(0, 0, p.s, 0, 6.283); fctx.fill(); }
        else fctx.fillRect(-p.s, -p.s * .45, p.s * 2, p.s * .9);
        fctx.restore();
      }
      if (parts.length) requestAnimationFrame(step); else { running = false; fctx.clearRect(0, 0, innerWidth, innerHeight); }
    };
    requestAnimationFrame(step);
  }
  const colorOf = (c) => rgba(COLORS[c] || COLORS.signal, 1);
  function burst(x, y, color = "signal", n = 36) {
    if (reduced) return;
    const pal = [colorOf(color), colorOf("paper"), colorOf(color)];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 7;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: .18, drag: .94, s: 1.5 + Math.random() * 3, rot: 0, vr: (Math.random() - .5) * .4, life: 1, decay: .012 + Math.random() * .015, col: pal[i % 3], shape: i % 3 ? 0 : 1 });
    }
    run();
  }
  function confetti(n = 160) {
    if (reduced) return;
    const pal = ["ember", "ion", "signal", "paper"].map(colorOf);
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0, x = fromLeft ? -10 : innerWidth + 10, y = innerHeight * (.55 + Math.random() * .3);
      const a = fromLeft ? -Math.PI / 2 + .35 + Math.random() * .6 : -Math.PI / 2 - .35 - Math.random() * .6, v = 12 + Math.random() * 12;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .28, drag: .985, s: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .5, life: 1.6, decay: .006 + Math.random() * .004, col: pal[i % 4], shape: 1 });
    }
    run();
  }

  /* ───── DOM effects ───── */
  function float(x, y, text, color = "var(--signal)", sub = "") {
    const e = document.createElement("div");
    e.className = "float"; e.style.left = x + "px"; e.style.top = y + "px"; e.style.color = color;
    e.innerHTML = text + (sub ? `<small>${sub}</small>` : "");
    document.body.appendChild(e); setTimeout(() => e.remove(), 1300);
  }
  const restart = (el, cls, ms) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
  const shake = (el) => restart(el, "shake", 600);
  const bump = (el) => restart(el, "bump", 500);
  function flash(good) { const e = document.createElement("div"); e.className = good ? "flash-good" : "flash-bad"; document.body.appendChild(e); setTimeout(() => e.remove(), 800); }
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  /* ───── sound ───── */
  let actx = null, soundOn = false;
  try { soundOn = localStorage.getItem("aud-sound") === "1"; } catch (e) { /* storage blocked */ }
  function tone(f, t0, dur, type = "sine", vol = .08) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, actx.currentTime + t0);
    g.gain.setValueAtTime(0, actx.currentTime + t0);
    g.gain.linearRampToValueAtTime(vol, actx.currentTime + t0 + .01);
    g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + t0 + dur);
    o.connect(g).connect(actx.destination); o.start(actx.currentTime + t0); o.stop(actx.currentTime + t0 + dur + .05);
  }
  const CUES = {
    good: () => { tone(660, 0, .12, "triangle"); tone(990, .08, .18, "triangle"); },
    bad: () => { tone(180, 0, .25, "sawtooth", .05); tone(140, .07, .25, "sawtooth", .04); },
    drop: () => tone(420, 0, .06, "square", .03),
    pick: () => tone(300, 0, .05, "square", .025),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .09, .3, "triangle", .07)),
  };
  function sound(name) {
    if (!soundOn || !CUES[name]) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); CUES[name](); } catch (e) { /* audio unavailable */ }
  }
  const sndBtn = document.getElementById("snd");
  const paintSnd = () => sndBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
  sndBtn.addEventListener("click", () => {
    soundOn = !soundOn; paintSnd();
    try { localStorage.setItem("aud-sound", soundOn ? "1" : "0"); } catch (e) { /* storage blocked */ }
    sound("good");
  });
  paintSnd();

  /* ───── pointer spotlight + hub card tilt ───── */
  const spot = document.getElementById("spot");
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") { document.body.classList.add("pointer"); spot.style.left = e.clientX + "px"; spot.style.top = e.clientY + "px"; }
    pointer.x = e.clientX; pointer.y = e.clientY;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; });
  document.querySelectorAll(".card-link").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", (px - .5) * 10 + "deg"); card.style.setProperty("--rx", (.5 - py) * 8 + "deg");
      card.style.setProperty("--mx", px * 100 + "%"); card.style.setProperty("--my", py * 100 + "%");
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  });

  /* ───── hub headline split + ticker ───── */
  document.querySelectorAll(".split").forEach((h) => {
    let k = 0;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) frag.appendChild(document.createTextNode(t));
          else { const s = document.createElement("span"); s.className = "w"; s.style.setProperty("--k", k++); s.textContent = t; frag.appendChild(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    });
    walk(h);
  });
  const FACTS = [
    "AUD students taught <b>50 EV chargers</b> to cut queues by 83%",
    "A <b>$410 FPGA</b> screens for Alzheimer's in 1.3 s",
    "<b>One blood value</b> and one formula screen kidney disease",
    "Solar forecasts <b>16% sharper</b> by first asking: sunny or cloudy?",
    "Four AI agents help you spend <b>miles you forgot</b>",
    "A tiny model learns ARC puzzles <b>from examples alone</b>",
    "EEG can spot a wandering mind, <b>during video</b>",
    "Agents plan shipments; <b>the buyer decides</b>",
    "YOLOv8 counts carbon <b>tree by tree</b>",
    "RAG finds the diagnosis in a <b>long referral</b>",
  ];
  const tk = document.querySelector(".tk");
  if (tk) tk.innerHTML = [...FACTS, ...FACTS].map((f) => `<span>${f}</span>`).join("");

  window.FX = { bg, burst, confetti, float, shake, bump, flash, sound, centerOf };
})();

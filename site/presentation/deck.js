/* AUD AI Festival — presentation controller.
   One "run" per visible slide: every timer and animation frame belongs to it
   and dies when the slide leaves, so off-screen slides cost nothing. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const svg = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  class Run {
    constructor() { this.alive = true; this.ids = []; }
    after(ms, fn) { this.ids.push(setTimeout(() => this.alive && fn(), ms)); }
    every(ms, fn) { this.ids.push(setInterval(() => this.alive && fn(), ms)); }
    loop(fn) {
      const t0 = performance.now();
      const step = (now) => { if (!this.alive) return; fn((now - t0) / 1000); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    tween(ms, fn, done) {
      const t0 = performance.now();
      const step = (now) => {
        if (!this.alive) return;
        const t = clamp((now - t0) / ms, 0, 1);
        fn(t);
        if (t < 1) requestAnimationFrame(step); else if (done) done();
      };
      requestAnimationFrame(step);
    }
    stop() { this.alive = false; this.ids.forEach((id) => { clearTimeout(id); clearInterval(id); }); }
  }

  /* ───── numbers ───── */
  const fmt = (v, el) => {
    const dec = +(el.dataset.dec || 0);
    let s = Math.abs(v).toFixed(dec);
    if (!el.hasAttribute("data-raw") && Math.abs(v) >= 1000) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (v < 0 ? "−" : "") + (el.dataset.prefix || "") + s + (el.dataset.suffix || "");
  };
  function counters(section, run) {
    $$("[data-count]", section).forEach((el) => {
      const target = +el.dataset.count;
      const host = el.closest("[data-in]");
      const delay = 250 + (host ? +getComputedStyle(host).getPropertyValue("--i") || 0 : 0) * 85 + 250;
      el.textContent = fmt(0, el);
      run.after(delay, () => run.tween(1600, (t) => { el.textContent = fmt(target * easeOut(t), el); }));
    });
  }

  /* ───── canvas helper (sized in slide units; reveal scales the canvas) ───── */
  function fitCanvas(c) {
    const w = c.offsetWidth, h = c.offsetHeight, d = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== w * d || c.height !== h * d) { c.width = w * d; c.height = h * d; }
    const ctx = c.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx, w, h };
  }

  const V = {};

  /* 01 · title: a dot field that drifts from ember (left) to ion (right) */
  V.field = (s, run) => {
    const c = $(".field", s);
    const A = [255, 106, 61], B = [143, 216, 255], P = [236, 232, 223];
    run.loop((t) => {
      const { ctx, w, h } = fitCanvas(c);
      ctx.clearRect(0, 0, w, h);
      const gap = 22;
      for (let y = gap; y < h; y += gap) {
        for (let x = gap; x < w; x += gap) {
          const u = x / w;
          const v = (Math.sin(x * 0.009 + t * 0.7) + Math.sin(y * 0.014 - t * 0.5) + Math.sin((x - y) * 0.006 + t * 0.35)) / 3;
          const top = 1 - y / h;                                     // fade under the headline
          const a = clamp((v + 0.25) * 1.3, 0, 1) * (0.25 + 0.75 * top);
          if (a < 0.04) continue;
          const col = u < 0.5 ? A.map((k, i) => lerp(k, P[i], u * 2 * 0.6)) : B.map((k, i) => lerp(k, P[i], (1 - u) * 2 * 0.6));
          const dy = Math.sin(x * 0.01 + t) * 4 * v;
          const r = 1 + a * 1.8;
          ctx.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a.toFixed(3)})`;
          ctx.fillRect(x - r / 2, y + dy - r / 2, r, r);
        }
      }
    });
  };

  /* 03 · EV charging: 50 stations, baseline queues vs a shared MARL policy */
  V.ev = (s, run) => {
    const root = $(".ev-svg", s), viz = $(".viz-ev", s);
    if (!root.dataset.built) {
      const R = rng(7);
      const roads = [];
      [70, 190, 300, 420, 530].forEach((y) => roads.push([[0, y + R() * 30], [800, y + R() * 30]]));
      [80, 220, 360, 500, 640, 750].forEach((x) => roads.push([[x + R() * 20, 0], [x + R() * 20, 640]]));
      roads.push([[0, 610], [800, 40]]);
      const gR = svg("g", {}, root);
      roads.forEach(([a, b], i) => svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "rgba(236,232,223,.09)", "stroke-width": i === roads.length - 1 ? 5 : 2 }, gR));
      const gL = svg("g", { class: "links", opacity: 0 }, root);
      const gC = svg("g", {}, root);
      const gS = svg("g", {}, root);
      const hub = { x: 410, y: 320 };
      const pts = [];
      for (let i = 0; i < 50; i++) {
        const [a, b] = roads[(R() * roads.length) | 0], t = 0.05 + R() * 0.9;
        pts.push({ x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), base: 0.4 + R() * 0.6, ph: R() * 6 });
      }
      pts.forEach((p) => {
        svg("line", { x1: hub.x, y1: hub.y, x2: p.x, y2: p.y, stroke: "#8fd8ff", "stroke-width": 0.6 }, gL);
        p.q = svg("rect", { x: p.x + 7, width: 3, y: p.y, height: 0, fill: "#ff3d5a" }, gS);
        p.c = svg("circle", { cx: p.x, cy: p.y, r: 4.5, fill: "#b9b6ae" }, gS);
        p.h = 6;
      });
      const cars = [];
      for (let i = 0; i < 46; i++) {
        const road = roads[(R() * roads.length) | 0];
        cars.push({ road, t: R(), v: (0.02 + R() * 0.05) * (R() > 0.5 ? 1 : -1), n: svg("circle", { r: 1.8, fill: "rgba(236,232,223,.55)" }, gC) });
      }
      const hubG = svg("g", { transform: `translate(${hub.x} ${hub.y})` }, root);
      const ring = svg("circle", { r: 0, fill: "none", stroke: "#8fd8ff", "stroke-width": 1.5, opacity: 0 }, hubG);
      svg("polygon", { points: "0,-16 14,-8 14,8 0,16 -14,8 -14,-8", fill: "#07090d", stroke: "#8fd8ff", "stroke-width": 1.5 }, hubG);
      const lab = svg("text", { y: 34, "text-anchor": "middle", fill: "#8fd8ff", "font-family": "Geist Mono", "font-size": 11, "letter-spacing": "1.5" }, hubG);
      lab.textContent = "SHARED POLICY";
      Object.assign(root, { _pts: pts, _cars: cars, _ring: ring, _links: gL });
      root.dataset.built = 1;
    }
    const { _pts: pts, _cars: cars, _ring: ring, _links: links } = root;
    let last = 0;
    run.loop((t) => {
      const dt = Math.min(0.05, t - last); last = t;
      const cyc = t % 10, b = cyc >= 4.5;
      viz.dataset.phase = b ? "b" : "a";
      const k = b ? clamp((cyc - 4.5) / 1.2, 0, 1) : 0;
      ring.setAttribute("r", b ? 20 + k * 420 : 0);
      ring.setAttribute("opacity", b ? 1 - k : 0);
      links.setAttribute("opacity", b ? 0.35 * (1 - clamp((cyc - 5.5) / 2, 0, 1)) + 0.05 : 0);
      pts.forEach((p) => {
        const target = b ? 3 + 3 * p.base : 10 + 34 * p.base * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph)) * clamp(cyc / 2, 0.2, 1);
        p.h = lerp(p.h, target, 0.06);
        p.q.setAttribute("y", p.y - p.h / 2); p.q.setAttribute("height", p.h);
        p.q.setAttribute("fill", b ? "#8fd8ff" : "#ff3d5a");
        p.c.setAttribute("fill", b ? "#8fd8ff" : p.h > 26 ? "#ff3d5a" : "#b9b6ae");
      });
      cars.forEach((c) => {
        c.t = (c.t + c.v * dt + 1) % 1;
        const [a, e] = c.road;
        c.n.setAttribute("cx", lerp(a[0], e[0], c.t)); c.n.setAttribute("cy", lerp(a[1], e[1], c.t));
      });
    });
  };

  /* 05 · long video: drop idle frames, keep motion, answer in words */
  V.video = (s, run) => {
    const strip = $(".strip", s), stages = $$(".stages li", s), type = $(".type", s);
    if (!strip.children.length) {
      for (let i = 0; i < 16; i++) {
        const f = document.createElement("div");
        f.className = "fr";
        const cell = (i * 5) % 9;
        f.style.backgroundImage = "url(../assets/img/cctv-grid.webp)";
        f.style.backgroundPosition = `${(cell % 3) * 50}% ${((cell / 3) | 0) * 50}%`;
        const m = 2 + i * 7;
        f.innerHTML = `<span>0${(m / 60) | 0}:${String(m % 60).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}</span>`;
        strip.appendChild(f);
      }
    }
    const frames = $$(".fr", strip), keep = new Set([2, 6, 7, 11, 14]);
    const cycle = () => {
      frames.forEach((f) => f.classList.remove("idle", "keep"));
      stages.forEach((l) => l.classList.remove("on"));
      type.textContent = "";
      run.after(1200, () => stages[0].classList.add("on"));
      frames.forEach((f, i) => run.after(1500 + i * 110, () => f.classList.add(keep.has(i) ? "keep" : "idle")));
      run.after(3700, () => stages[1].classList.add("on"));
      run.after(4700, () => stages[2].classList.add("on"));
      run.after(5700, () => {
        stages[3].classList.add("on");
        const txt = type.dataset.text;
        let n = 0;
        run.every(32, () => { if (n <= txt.length) type.textContent = txt.slice(0, n++); });
      });
    };
    cycle();
  };

  /* 06 · Synapse: voxels stream over AXI into the FPGA, the cascade lights up */
  V.synapse = (s, run) => {
    const chip = $(".chip", s);
    $$(".bit", chip).forEach((b) => b.remove());
    const bits = [];
    for (let i = 0; i < 9; i++) bits.push({ n: svg("rect", { class: "bit", width: 6, height: 6, y: 117 }, chip), o: i / 9 });
    const out = [];
    for (let i = 0; i < 4; i++) out.push({ n: svg("rect", { class: "bit", width: 5, height: 5, y: 117.5 }, chip), o: i / 4 });
    $$(".auc-f", chip).forEach((r) => r.setAttribute("width", 0));
    $$(".auc-f", chip).forEach((r, i) => run.after(1800 + i * 450, () => r.setAttribute("width", r.dataset.w)));
    run.loop((t) => {
      bits.forEach((b) => b.n.setAttribute("x", 140 + ((t * 0.7 + b.o) % 1) * 104));
      out.forEach((b) => b.n.setAttribute("x", 392 + ((t * 0.5 + b.o) % 1) * 46));
    });
  };

  /* 07 · PV: a window slides over three days; spectral flatness picks the model */
  V.pv = (s, run) => {
    const root = $(".pv-svg", s), viz = $(".viz-pv", s);
    const W = 760, H = 270, N = 120;
    if (!root._d) {
      const R = rng(11), act = [], fore = [];
      let cloud = 1;
      for (let i = 0; i < N; i++) {
        const day = (i / 40) | 0, k = i % 40;
        const bell = Math.pow(Math.sin((Math.PI * (k + 0.5)) / 40), 1.4);
        let v = bell * 0.95;
        if (day === 1) { cloud = clamp(cloud + (R() - 0.5) * 0.7, 0.15, 1); v *= cloud; }
        v += (R() - 0.5) * 0.02;
        act.push(v);
        fore.push(clamp(v + (R() - 0.5) * (day === 1 ? 0.12 : 0.03), 0, 1));
      }
      const g = $(".grid", root);
      for (let i = 0; i <= 4; i++) svg("line", { x1: 0, x2: W, y1: 20 + (H - 20) * (i / 4), y2: 20 + (H - 20) * (i / 4) }, g);
      ["DAY 1", "DAY 2", "DAY 3"].forEach((d, i) => { const tx = svg("text", { x: (i * W) / 3 + 6, y: H + 22 }, g); tx.textContent = d; });
      [1, 2].forEach((i) => svg("line", { x1: (i * W) / 3, x2: (i * W) / 3, y1: 20, y2: H, "stroke-dasharray": "2 4" }, g));
      root._d = { act, fore };
    }
    const { act, fore } = root._d;
    const X = (i) => (i / (N - 1)) * W, Y = (v) => H - v * (H - 30);
    const pathTo = (arr, n) => arr.slice(0, n).map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
    const win = $(".win", root), sf = $(".sf", root), pa = $(".pv-act", root), pf = $(".pv-fore", root);
    const flat = (arr) => {
      // power spectrum of the detrended window, then geometric/arithmetic mean
      const n = arr.length, m = arr.reduce((a, b) => a + b) / n;
      const d = arr.map((v, i) => v - m - ((arr[n - 1] - arr[0]) * (i - (n - 1) / 2)) / (n - 1));
      const P = [];
      for (let k = 1; k <= n / 2; k++) {
        let re = 0, im = 0;
        d.forEach((v, j) => { re += v * Math.cos((2 * Math.PI * k * j) / n); im -= v * Math.sin((2 * Math.PI * k * j) / n); });
        P.push(re * re + im * im + 1e-9);
      }
      const g = Math.exp(P.reduce((a, p) => a + Math.log(p), 0) / P.length), am = P.reduce((a, b) => a + b) / P.length;
      return g / am;
    };
    run.loop((t) => {
      const n = clamp(Math.floor(((t % 11) / 9) * N), 2, N);
      pa.setAttribute("d", pathTo(act, n));
      pf.setAttribute("d", pathTo(fore, n));
      const w0 = Math.max(0, n - 16);
      win.setAttribute("x", X(w0)); win.setAttribute("width", Math.max(4, X(n - 1) - X(w0)));
      if (n - w0 >= 8) {
        const f = flat(act.slice(w0, n));
        const reg = f > 0.32 ? "cloudy" : "sunny";
        viz.dataset.regime = reg;
        sf.setAttribute("x", X(w0)); sf.textContent = `FLATNESS ${f.toFixed(2)} → ${reg.toUpperCase()}`;
      }
    });
  };

  /* 08 · CKD: draw the calibrated curve, then scan creatinine values */
  V.ckd = (s, run) => {
    const root = $(".ckd-svg", s);
    const W = 700, H = 300, x0 = 50, y0 = 20;
    const X = (c) => x0 + (c / 5) * W, Y = (p) => y0 + (1 - p) * H;
    const raw = (c) => 0.991 - 0.214 * Math.exp(c * (1.532 - c));
    const P = (c) => 1 / (1 + Math.exp(-(8.3 * raw(c) - 6.37)));   // Platt-calibrated, matches paper's figure
    if (!root.dataset.built) {
      const ax = $(".axes", root);
      for (let p = 0; p <= 1; p += 0.25) {
        svg("line", { class: "g", x1: x0, x2: x0 + W, y1: Y(p), y2: Y(p) }, ax);
        svg("text", { x: x0 - 10, y: Y(p) + 4, "text-anchor": "end" }, ax).textContent = p.toFixed(2);
      }
      for (let c = 0; c <= 5; c++) svg("text", { x: X(c), y: y0 + H + 22, "text-anchor": "middle" }, ax).textContent = c;
      svg("text", { x: x0 + W, y: y0 + H + 44, "text-anchor": "end" }, ax).textContent = "SERUM CREATININE (mg/dL)";
      svg("line", { x1: x0, x2: x0 + W, y1: Y(0.5), y2: Y(0.5), "stroke-dasharray": "4 4" }, ax);
      svg("text", { x: x0 + W, y: Y(0.5) - 8, "text-anchor": "end" }, ax).textContent = "DECISION 0.5";
      const band = $(".band", root);
      Object.entries({ x: X(0.03), width: X(1.5) - X(0.03), y: y0, height: H }).forEach(([k, v]) => band.setAttribute(k, v));
      svg("text", { x: X(0.77), y: y0 + 16, "text-anchor": "middle", fill: "#d7ff5a", "font-family": "Geist Mono", "font-size": 11 }, root).textContent = "HEALTHY 0.03–1.50";
      let d = "";
      for (let i = 0; i <= 250; i++) { const c = (i / 250) * 5; d += `${i ? "L" : "M"}${X(c).toFixed(1)} ${Y(P(c)).toFixed(1)}`; }
      $(".curve", root).setAttribute("d", d);
      root.dataset.built = 1;
    }
    const curve = $(".curve", root), len = curve.getTotalLength();
    curve.style.strokeDasharray = len; curve.style.strokeDashoffset = len;
    run.tween(2200, (t) => (curve.style.strokeDashoffset = len * (1 - easeOut(t))));
    const probe = $(".probe", root), pl = $(".probe-l", root), ro = $(".readout", root), r1 = $(".r1", root), r2 = $(".r2", root);
    run.loop((t) => {
      const k = t < 2.2 ? 0 : (1 - Math.cos((t - 2.2) * 0.45)) / 2;
      const c = 0.05 + k * 4.2, p = P(c);
      probe.setAttribute("cx", X(c)); probe.setAttribute("cy", Y(p));
      Object.entries({ x1: X(c), x2: X(c), y1: Y(p), y2: y0 + H }).forEach(([a, v]) => pl.setAttribute(a, v));
      ro.setAttribute("transform", `translate(${clamp(X(c) + 14, 0, x0 + W - 270)} ${clamp(Y(p) - 70, 0, H)})`);
      r1.textContent = `creatinine ${c.toFixed(2)} mg/dL`;
      r2.textContent = `P(CKD) ${p.toFixed(2)} · ${p < 0.5 ? "healthy range" : "refer for testing"}`;
    });
  };

  /* 09 · ARC: demonstrations are written into memory, the solver refines */
  V.arc = (s, run) => {
    const demos = $(".demos", s), test = $(".test", s), tokWrap = $(".tokens", s), stepEl = $(".step", s);
    // ARC task 0ca9ddb6: red → yellow diagonals, blue → orange cross, others unchanged
    const rule = (cells) => {
      const out = new Map(cells);
      cells.forEach((c, k) => {
        const [r, q] = k.split(",").map(Number);
        const nb = c === "red" ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : c === "blue" ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [];
        nb.forEach(([a, b]) => { const kk = `${r + a},${q + b}`; if (!out.has(kk)) out.set(kk, c === "red" ? "yel" : "org"); });
      });
      return out;
    };
    const grid = (cells, cls = "") => {
      const g = document.createElement("div"); g.className = "g9 " + cls;
      for (let r = 0; r < 9; r++) for (let q = 0; q < 9; q++) {
        const i = document.createElement("i"); const c = cells.get(`${r},${q}`);
        if (c) i.className = "c-" + c; i.dataset.k = `${r},${q}`; g.appendChild(i);
      }
      return g;
    };
    const tasks = [
      new Map([["2,2", "red"], ["6,5", "blue"]]),
      new Map([["1,6", "red"], ["5,2", "blue"], ["7,7", "mag"]]),
    ];
    const testIn = new Map([["2,6", "blue"], ["6,2", "red"], ["4,4", "mag"], ["7,7", "red"]]);
    const testOut = rule(testIn);
    if (!demos.querySelector(".pair")) {
      tasks.forEach((tk) => {
        const p = document.createElement("div"); p.className = "pair";
        p.append(grid(tk), Object.assign(document.createElement("span"), { className: "ar", textContent: "→" }), grid(rule(tk)));
        demos.appendChild(p);
      });
      for (let i = 0; i < 16; i++) tokWrap.appendChild(document.createElement("i"));
      test.appendChild(grid(testIn, "tg"));
    }
    const toks = $$("i", tokWrap), tg = $(".tg", test), pairs = $$(".pair", demos);
    const R = rng(3), order = [...testOut.keys()].filter((k) => !testIn.has(k)).map((k) => ({ k, at: 2 + R() * 7 }));
    const cycle = () => {
      toks.forEach((t) => (t.className = ""));
      $$("i", tg).forEach((i) => { i.className = testIn.has(i.dataset.k) ? "c-" + testIn.get(i.dataset.k) : ""; });
      stepEl.textContent = 0;
      pairs.forEach((p) => (p.style.opacity = 0.35));
      pairs.forEach((p, d) => {
        run.after(600 + d * 1400, () => { pairs.forEach((x) => (x.style.opacity = 0.35)); p.style.opacity = 1; });
        for (let j = 0; j < 8; j++) run.after(800 + d * 1400 + j * 120, () => toks[d * 8 + j].classList.add("on"));
      });
      run.after(3700, () => { pairs.forEach((x) => (x.style.opacity = 1)); toks.forEach((t, i) => run.after(i * 40, () => (t.className = "read"))); });
      for (let st = 1; st <= 11; st++) {
        run.after(4300 + st * 420, () => {
          stepEl.textContent = st === 11 ? "11 · HALT" : st;
          order.forEach(({ k, at }) => {
            const cell = tg.querySelector(`[data-k="${k}"]`);
            if (st >= at) cell.className = "c-" + testOut.get(k); else if (st >= at - 2) cell.className = "ghost";
          });
        });
      }
      run.after(11200, cycle);
    };
    cycle();
  };

  /* 10 · EEG: eight scrolling channels, a mind-wandering stretch, a probe */
  V.eeg = (s, run) => {
    const c = $(".eeg", s), pop = $(".probe-pop", s);
    run.loop((t) => {
      const { ctx, w, h } = fitCanvas(c);
      ctx.clearRect(0, 0, w, h);
      const ch = 8, lh = h / ch, speed = 120;
      // shaded mind-wandering window drifting left
      const mwStart = ((7 - (t % 7)) / 7) * (w + 300) - 150;
      ctx.fillStyle = "rgba(255,106,61,.07)"; ctx.fillRect(mwStart, 0, 220, h);
      ctx.fillStyle = "rgba(255,106,61,.85)"; ctx.font = "10px Geist Mono"; ctx.fillText("MIND-WANDERING", mwStart + 8, h - 8);
      for (let k = 0; k < ch; k++) {
        const y0 = lh * (k + 0.5);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const tt = (x + t * speed) / 60;
          const inMW = x > mwStart && x < mwStart + 220 ? 1 : 0;
          const v = Math.sin(tt * 3.1 + k) * 0.5 + Math.sin(tt * 7.3 + k * 2.1) * (0.3 + inMW * 0.55) + Math.sin(tt * 13.7 + k * 0.7) * 0.18 + Math.sin(tt * 1.3 + k * 4) * 0.4;
          const yy = y0 + v * lh * 0.28;
          x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        }
        ctx.strokeStyle = k % 2 ? "rgba(236,232,223,.55)" : "rgba(236,232,223,.8)";
        ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "#7d828c"; ctx.font = "10px Geist Mono";
        ctx.fillText(["Fp1", "Fp2", "F3", "F4", "C3", "C4", "O1", "O2"][k], 4, y0 - lh * 0.3);
      }
      pop.classList.toggle("show", t % 7 > 3.2 && t % 7 < 5.6);
    });
  };

  /* 11 · shipment planner: eight weeks light up, reefer chosen, agent email accepted */
  V.ship = (s, run) => {
    const wk = $(".weeks", s);
    const plan = ["order", "wait", "wait", "wait", "plan", "wait", "wait", "wait"];
    if (!wk.children.length) plan.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = p; d.innerHTML = `<span>W${i + 1}</span><b>${p === "order" ? "ORDER" : p === "plan" ? "PLAN" : "wait"}</b>`;
      wk.appendChild(d);
    });
    const ws = $$("div", wk), pick = $(".modes .pick", s), ok = $(".mail .ok", s);
    ws.forEach((w) => w.classList.remove("lit")); pick.classList.remove("on"); ok.classList.remove("on");
    ws.forEach((w, i) => run.after(900 + i * 260, () => w.classList.add("lit")));
    run.after(3400, () => pick.classList.add("on"));
    run.after(5200, () => ok.classList.add("on"));
  };

  /* 12 · gaze: the same reading, re-detected by three algorithms */
  V.gaze = (s, run) => {
    const root = $(".page", s), det = $(".det", s), fx = $(".fx b", s), needle = $(".needle", s);
    root.innerHTML = "";
    const R = rng(5), words = [];
    for (let l = 0; l < 8; l++) {
      let x = 40; const y = 50 + l * 44;
      while (x < 660) { const w = 24 + R() * 70; if (x + w > 680) break; svg("rect", { class: "w", x, y: y - 7, width: w, height: 14, rx: 2 }, root); words.push({ x: x + w / 2, y, w }); x += w + 12; }
    }
    const gS = svg("g", {}, root), gF = svg("g", {}, root);
    const detectors = [
      { name: "I2MC", split: 1, merge: 1, auc: 0.91 },
      { name: "I-VT", split: 2, merge: 1, auc: 0.88 },
      { name: "I-DT", split: 1, merge: 3, auc: 0.93 },
    ];
    // one underlying reading: fixations per word with a few regressions
    const base = [];
    words.forEach((w, i) => {
      base.push({ x: w.x + (R() - 0.5) * w.w * 0.4, y: w.y + (R() - 0.5) * 6, d: 0.6 + R() });
      if (R() < 0.12 && i > 2) { const b = words[i - 1 - ((R() * 2) | 0)]; base.push({ x: b.x, y: b.y, d: 0.8, reg: 1 }); }
    });
    let di = 0;
    const show = () => {
      const D = detectors[di % 3]; di++;
      gS.innerHTML = ""; gF.innerHTML = "";
      det.textContent = D.name;
      needle.style.left = ((D.auc - 0.8) / 0.2) * 100 + "%";
      let fix = [];
      base.forEach((f, i) => {
        if (D.merge > 1 && i % D.merge) { const p = fix[fix.length - 1]; if (p && Math.abs(p.y - f.y) < 10) { p.x = (p.x + f.x) / 2; p.d += f.d; return; } }
        fix.push({ ...f });
        if (D.split > 1) fix.push({ ...f, x: f.x + 8, d: f.d * 0.4 });
      });
      let path = "", count = 0;
      fix.forEach((f, i) => run.after(i * (3600 / fix.length), () => {
        path += `${i ? "L" : "M"}${f.x.toFixed(1)} ${f.y.toFixed(1)}`;
        gS.innerHTML = ""; svg("path", { class: "sac", d: path }, gS);
        svg("circle", { class: "fix" + (f.reg ? " reg" : ""), cx: f.x, cy: f.y, r: 3 + f.d * 4 }, gF);
        fx.textContent = ++count;
      }));
      run.after(5000, show);
    };
    show();
  };

  /* 13 · HVAC: one day, forecast at midnight, schedule follows */
  V.hvac = (s, run) => {
    const root = $(".day", s);
    const x0 = 0, W = 760, top = 22, h = 150;
    const X = (hr) => x0 + ((hr - 5) / 17) * W;
    const sig = (x) => 1 / (1 + Math.exp(-x));
    const prob = (hr) => clamp(sig((hr - 8.2) * 3.2) * (1 - sig((hr - 17.6) * 3)) * (1 - 0.45 * Math.exp(-Math.pow((hr - 12.6) / 0.5, 2))), 0, 1) * 0.92;
    const occ = (hr) => (hr > 8.5 && hr < 12.2) || (hr > 13.1 && hr < 17.7) ? 1 : 0;
    if (!root.dataset.built) {
      const g = $(".hours", root);
      for (let hr = 5; hr <= 22; hr += 2) {
        svg("line", { x1: X(hr), x2: X(hr), y1: top, y2: 250 }, g);
        svg("text", { x: X(hr) + 3, y: 268 }, g).textContent = `${String(hr).padStart(2, "0")}:00`;
      }
      let d = `M${X(5)} ${top + h}`, o = "";
      for (let i = 0; i <= 340; i++) {
        const hr = 5 + (i / 340) * 17;
        d += `L${X(hr).toFixed(1)} ${(top + h - prob(hr) * h).toFixed(1)}`;
        o += `${i ? "L" : "M"}${X(hr).toFixed(1)} ${(top + h - occ(hr) * h * 0.92).toFixed(1)}`;
      }
      d += `L${X(22)} ${top + h}Z`;
      $(".prob", root).setAttribute("d", d); $(".occ", root).setAttribute("d", o);
      const defs = svg("defs", {}, root), cp = svg("clipPath", { id: "dayclip" }, defs);
      root._clip = svg("rect", { x: 0, y: 0, height: 300, width: 0 }, cp);
      $(".prob", root).setAttribute("clip-path", "url(#dayclip)"); $(".occ", root).setAttribute("clip-path", "url(#dayclip)");
      // schedule: on when forecast > 0.5, pre-start 30 min
      const sc = $(".sched", root); let on = null;
      for (let i = 0; i <= 680; i++) {
        const hr = 5 + (i / 680) * 17, p = prob(hr + 0.5) > 0.5;
        if (p && on === null) on = hr;
        if ((!p || i === 680) && on !== null) { svg("rect", { x: X(on), y: 230, width: X(hr) - X(on), height: 14, rx: 2, "clip-path": "url(#dayclip)" }, sc); on = null; }
      }
      root.dataset.built = 1;
    }
    const clip = root._clip, now = $(".now", root);
    run.loop((t) => {
      const k = clamp((t % 12) / 9, 0, 1), x = X(5) + k * W;
      clip.setAttribute("width", x); now.setAttribute("x1", x); now.setAttribute("x2", x);
    });
  };

  /* 14 · heart: monitor-style ECG sweep + pipeline stepping */
  V.heart = (s, run) => {
    const c = $(".ecg", s), steps = $$(".pipe span", s);
    const beat = (p) => {          // one PQRST complex, p in [0,1)
      const g = (m, w, a) => a * Math.exp(-Math.pow((p - m) / w, 2));
      return g(0.18, 0.03, 0.12) - g(0.36, 0.012, 0.15) + g(0.4, 0.012, 1) - g(0.44, 0.014, 0.28) + g(0.66, 0.05, 0.25);
    };
    let ys = null, lastX = 0;
    run.loop((t) => {
      const { ctx, w, h } = fitCanvas(c);
      if (!ys || ys.length !== Math.ceil(w)) ys = new Array(Math.ceil(w)).fill(null);
      const x = Math.floor((t * 260) % w);
      for (let i = lastX; i !== x; i = (i + 1) % w) ys[i] = h * 0.62 - beat(((i + Math.floor(t * 260 / w) * w) / 170) % 1) * h * 0.5;
      lastX = x;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath(); let pen = false;
      for (let i = 0; i < w; i++) {
        if (ys[i] == null || (i > x && i < x + 30)) { pen = false; continue; }
        pen ? ctx.lineTo(i, ys[i]) : ctx.moveTo(i, ys[i]); pen = true;
      }
      ctx.strokeStyle = "#ff6a3d"; ctx.lineWidth = 2; ctx.shadowColor = "#ff6a3d"; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#ff6a3d"; ctx.beginPath(); ctx.arc(x, ys[x] ?? h * 0.62, 3, 0, 7); ctx.fill();
      const k = Math.floor(t / 1.1) % (steps.length + 2);
      steps.forEach((sp, i) => sp.classList.toggle("on", i < k));
    });
  };

  /* 15 · RAG: scroll the report, highlight evidence, fill the summary */
  V.rag = (s, run) => {
    const lines = $(".lines", s), fields = $$(".card .f", s);
    if (!lines.children.length) {
      const R = rng(9);
      for (let i = 0; i < 120; i++) {
        const d = document.createElement("div"); d.className = "ln";
        d.style.width = (i % 7 === 6 ? 30 + R() * 30 : 70 + R() * 30) + "%";
        if (i % 7 === 6) d.style.marginBottom = "12px";
        lines.appendChild(d);
      }
    }
    const L = $$(".ln", lines), hits = [[14, 15], [52, 53, 54], [88, 89]], offs = [0, -330, -640];
    const cycle = () => {
      L.forEach((l) => l.classList.remove("hit")); fields.forEach((f) => f.classList.remove("on"));
      lines.style.transform = "translateY(0)";
      hits.forEach((hs, i) => {
        run.after(800 + i * 2600, () => (lines.style.transform = `translateY(${offs[i]}px)`));
        run.after(2000 + i * 2600, () => { hs.forEach((h) => L[h].classList.add("hit")); });
        run.after(2500 + i * 2600, () => fields[i].classList.add("on"));
      });
      run.after(11000, cycle);
    };
    cycle();
  };

  /* 16 · forest: top-down canopy, detections appear, the credit chain fills */
  V.forest = (s, run) => {
    const root = $(".canopy", s), chain = $$(".chain span", s);
    if (!root.dataset.built) {
      const R = rng(21), trees = [];
      const defs = svg("defs", {}, root);
      [["gA", "#3f7a4f", "#173322"], ["gB", "#6f8f3a", "#24331a"], ["gC", "#2f6a5f", "#0f2a26"]].forEach(([id, a, b]) => {
        const g = svg("radialGradient", { id, cx: ".4", cy: ".35" }, defs);
        svg("stop", { offset: "0", "stop-color": a }, g); svg("stop", { offset: "1", "stop-color": b }, g);
      });
      for (let tries = 0; trees.length < 26 && tries < 2000; tries++) {
        const r = 22 + R() * 30, x = r + R() * (760 - 2 * r), y = r + R() * (460 - 2 * r);
        if (trees.every((t) => Math.hypot(t.x - x, t.y - y) > t.r + r + 6)) trees.push({ x, y, r, sp: (R() * 4) | 0 });
      }
      const species = [["ghaf", "#d7ff5a"], ["date palm", "#ff6a3d"], ["neem", "#8fd8ff"], ["acacia", "#ffd166"]];
      trees.forEach((t) => {
        const g = svg("g", { class: "tree" }, root);
        if (t.sp === 1) {           // palm: fronds radiating
          for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2;
            svg("path", { d: `M${t.x} ${t.y} Q ${t.x + Math.cos(a + 0.3) * t.r * 0.7} ${t.y + Math.sin(a + 0.3) * t.r * 0.7} ${t.x + Math.cos(a) * t.r} ${t.y + Math.sin(a) * t.r}`, stroke: "#6f8f3a", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, g);
          }
        } else {
          for (let k = 0; k < 5; k++) svg("circle", { cx: t.x + (R() - 0.5) * t.r * 0.6, cy: t.y + (R() - 0.5) * t.r * 0.6, r: t.r * (0.55 + R() * 0.3), fill: `url(#${["gA", "gB", "gC"][(t.sp + k) % 3]})`, opacity: 0.9 }, g);
        }
        const [name, col] = species[t.sp];
        const b = svg("g", { class: "box" }, root);
        svg("rect", { x: t.x - t.r, y: t.y - t.r, width: t.r * 2, height: t.r * 2, stroke: col }, b);
        svg("rect", { x: t.x - t.r, y: t.y - t.r - 14, width: 84, height: 14, style: `fill:${col};stroke:none` }, b);
        svg("text", { x: t.x - t.r + 4, y: t.y - t.r - 3.5, fill: "#07090d" }, b).textContent = `${name} ${(0.82 + R() * 0.16).toFixed(2)}`;
      });
      root.dataset.built = 1;
    }
    const boxes = $$(".box", root);
    const cycle = () => {
      boxes.forEach((b) => b.classList.remove("on")); chain.forEach((c) => c.classList.remove("on"));
      boxes.forEach((b, i) => run.after(500 + i * 140, () => b.classList.add("on")));
      chain.forEach((c, i) => run.after(500 + boxes.length * 140 + i * 450, () => c.classList.add("on")));
      run.after(500 + boxes.length * 140 + 5 * 450 + 2500, cycle);
    };
    cycle();
  };

  /* 17 · agents: a normal request flows through, a trick request is blocked */
  V.agents = (s, run) => {
    const root = $(".net", s), rewards = $$(".rewards span", s);
    const N = {
      you:   { x: 20,  y: 150, l: "Member request", sub: "own account" },
      trick: { x: 20,  y: 330, l: "Trick request", sub: "someone else's miles" },
      safe:  { x: 210, y: 240, l: "Safety check", sub: "every request", cls: "shield" },
      orch:  { x: 400, y: 240, l: "Orchestrator", sub: "keeps data separate", cls: "hub" },
      prof:  { x: 400, y: 60,  l: "Profiler", sub: "how you travel" },
      val:   { x: 590, y: 150, l: "Value estimator", sub: "what rewards are worth" },
      rec:   { x: 590, y: 330, l: "Recommender", sub: "best three, with reasons" },
    };
    const w = 160, h = 58, C = (n) => ({ x: n.x + w / 2, y: n.y + h / 2 });
    if (!root.dataset.built) {
      const gl = $(".links", root), gn = $(".nodes", root);
      [["you", "safe"], ["trick", "safe"], ["safe", "orch"], ["orch", "prof"], ["orch", "val"], ["orch", "rec"]].forEach(([a, b]) => {
        const A = C(N[a]), B = C(N[b]);
        svg("line", { class: "link", x1: A.x, y1: A.y, x2: B.x, y2: B.y }, gl);
      });
      for (const k in N) {
        const n = N[k], g = svg("g", { class: "node " + (n.cls || ""), transform: `translate(${n.x} ${n.y})` }, gn);
        svg("rect", { width: w, height: h, rx: 6 }, g);
        svg("text", { x: 14, y: 25 }, g).textContent = n.l;
        svg("text", { class: "sub", x: 14, y: 43 }, g).textContent = n.sub.toUpperCase();
        n.g = g;
      }
      root._N = N; root.dataset.built = 1;
    }
    const NN = root._N, gp = $(".packets", root);
    const go = (a, b, ms, bad) => new Promise((res) => {
      const A = C(NN[a]), B = C(NN[b]);
      const p = svg("circle", { class: "pk" + (bad ? " bad" : ""), r: 6, cx: A.x, cy: A.y }, gp);
      run.tween(ms, (t) => { const e = easeOut(t); p.setAttribute("cx", lerp(A.x, B.x, e)); p.setAttribute("cy", lerp(A.y, B.y, e)); }, () => {
        p.remove(); NN[b].g.classList.add("pulse"); run.after(400, () => NN[b].g.classList.remove("pulse")); res();
      });
    });
    const cycle = async () => {
      if (!run.alive) return;
      gp.innerHTML = ""; rewards.forEach((r) => r.classList.remove("on")); NN.safe.g.classList.remove("blocked");
      await go("you", "safe", 800); await go("safe", "orch", 700);
      await go("orch", "prof", 600); await go("prof", "orch", 600);
      await go("orch", "val", 600); await go("val", "orch", 600);
      await go("orch", "rec", 600);
      rewards.forEach((r, i) => run.after(i * 250, () => r.classList.add("on")));
      await new Promise((r) => run.after(1200, r));
      await go("trick", "safe", 900, true);
      NN.safe.g.classList.add("blocked");
      run.after(2600, cycle);
    };
    cycle();
  };

  V.tracks = () => {};
  V.tumor = () => {};
  V.close = () => {};

  /* ───── deck wiring ───── */
  const slides = $$(".reveal .slides > section");
  slides.forEach((s) => $$("[data-in]", s).forEach((e, i) => e.style.setProperty("--i", i)));

  const seg = $("#segments");
  slides.forEach((s) => {
    const i = document.createElement("i");
    i.style.setProperty("--c", s.dataset.track === "ug" ? "var(--ember)" : s.dataset.track === "g" ? "var(--ion)" : "var(--paper)");
    seg.appendChild(i);
  });
  $("#total").textContent = String(slides.length).padStart(2, "0");

  const DEFAULT_MS = 16000;
  let current = null;
  function enter(s) {
    if (current) current.stop();
    current = new Run();
    const idx = slides.indexOf(s);
    document.body.dataset.track = s.dataset.track;
    $("#ix").textContent = String(idx + 1).padStart(2, "0");
    $$("i", seg).forEach((el, i) => {
      el.classList.toggle("done", i < idx);
      el.classList.remove("now");
      if (i === idx) { void el.offsetWidth; el.style.setProperty("--dur", (+s.dataset.autoslide || DEFAULT_MS) + "ms"); el.classList.add("now"); }
    });
    const wipe = $("#wipe");
    wipe.style.setProperty("--wc", s.dataset.track === "ug" ? "#ff6a3d" : s.dataset.track === "g" ? "#8fd8ff" : "#ece8df");
    wipe.classList.remove("go"); void wipe.offsetWidth; wipe.classList.add("go");
    counters(s, current);
    const v = V[s.dataset.viz];
    if (v && !reduced) { try { v(s, current); } catch (e) { console.error("[deck] viz", s.dataset.viz, e); } }
  }

  Reveal.initialize({
    width: 1600, height: 900, margin: 0, minScale: 0.1, maxScale: 3,
    center: false, hash: true, controls: false, progress: false,
    autoSlide: DEFAULT_MS, autoSlideStoppable: true, loop: true,
    transition: "fade", transitionSpeed: "slow", backgroundTransition: "none",
    preloadIframes: false, viewDistance: 2,
  }).then(() => enter(Reveal.getCurrentSlide()));

  Reveal.on("slidechanged", (e) => enter(e.currentSlide));
  const setPaused = (p) => { document.body.classList.toggle("paused", p); $("#pause").textContent = p ? "PLAY" : "PAUSE"; };
  Reveal.on("autoslidepaused", () => setPaused(true));
  Reveal.on("autoslideresumed", () => setPaused(false));
  $("#pause").addEventListener("click", () => Reveal.toggleAutoSlide());
  window.addEventListener("resize", () => Reveal.layout());
})();

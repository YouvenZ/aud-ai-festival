/* AUD AI Festival — three booth challenges.
   Drag and drop uses pointer events so it works with mouse, touch and pen;
   every draggable also responds to a tap/Enter for visitors who don't drag. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ═════════ drag engine ═════════ */
  const zoneAt = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.closest("[data-zone]"); };
  function draggable(el, { onDrop, onTap, onOver, fly }) {
    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap && onTap(); } });
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ox = sx - r.left, oy = sy - r.top;
      let ghost = null, lastZone = null, py = sy, scroller = null, lx = sx, tilt = 0;
      el.setPointerCapture(e.pointerId);
      // auto-scroll near the viewport edges so off-screen targets are reachable on phones
      const edge = () => {
        const m = 70, v = py < m ? -(m - py) / 4 : py > innerHeight - m ? (py - (innerHeight - m)) / 4 : 0;
        if (v) window.scrollBy(0, v);
      };
      const move = (ev) => {
        py = ev.clientY;
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!ghost) {
          ghost = el.cloneNode(true); ghost.classList.add("ghost"); ghost.style.width = r.width + "px"; ghost.style.margin = 0;
          document.body.appendChild(ghost); el.classList.add("lifting");
          scroller = setInterval(edge, 16);
          FX.sound("pick");
        }
        tilt = Math.max(-14, Math.min(14, tilt * .8 + (ev.clientX - lx) * .9)); lx = ev.clientX;
        ghost.style.left = ev.clientX - ox + "px"; ghost.style.top = ev.clientY - oy + "px";
        ghost.style.transform = `rotate(${tilt}deg) scale(1.03)`;
        const z = zoneAt(ev.clientX, ev.clientY);
        if (z !== lastZone) { lastZone && lastZone.classList.remove("over"); z && z.classList.add("over"); lastZone = z; }
        onOver && onOver(z, ev);
      };
      const up = (ev) => {
        el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
        clearInterval(scroller);
        lastZone && lastZone.classList.remove("over");
        onOver && onOver(null, ev);
        if (ghost) {
          const z = ev.type === "pointerup" ? zoneAt(ev.clientX, ev.clientY) : null;
          const g = ghost, ok = z && onDrop(z, ev) !== false;
          if (ok && fly) {            // throw the card into its target
            const zr = z.getBoundingClientRect();
            g.classList.add("fly"); g.style.left = zr.left + zr.width / 2 - r.width / 2 + "px"; g.style.top = zr.top + zr.height / 2 - r.height / 2 + "px";
            g.style.transform = `rotate(${tilt * 2}deg) scale(.3)`; setTimeout(() => g.remove(), 380);
          } else if (!ok) {           // missed: glide back home
            g.classList.add("back"); g.style.left = r.left + "px"; g.style.top = r.top + "px"; g.style.transform = "none";
            setTimeout(() => { g.remove(); el.classList.remove("lifting"); }, 360);
            return;
          } else { g.remove(); FX.sound("drop"); }
          el.classList.remove("lifting");
        }
        else if (ev.type === "pointerup") onTap && onTap();
      };
      el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    });
  }

  /* ═════════ 01 · quiz ═════════ */
  const QUIZ = [
    { q: "When a model is “trained”, what is actually happening?",
      o: ["It memorises every example word for word", "It adjusts its internal numbers (parameters) to make fewer mistakes on examples", "It downloads answers from the internet", "A programmer writes a rule for every case"],
      a: 1, e: "Training is an optimisation loop: predict, measure the error, nudge millions of parameters to reduce it, repeat. Memorising would fail on anything new." },
    { q: "Which of these is supervised learning?",
      o: ["Grouping shoppers by habits, with no labels", "A robot learning to walk by trial and error", "Predicting a flat's price from past sales with known prices", "Shrinking a photo to a smaller file"],
      a: 2, e: "Supervised means every training example comes with the right answer (the label), here the real sale price. Grouping without labels is unsupervised; trial-and-error is reinforcement learning." },
    { q: "Predicting tomorrow's temperature in °C is a…",
      o: ["Classification problem", "Regression problem", "Clustering problem", "Search problem"],
      a: 1, e: "Regression predicts a number on a continuous scale. Classification picks a category, such as “hot / mild / cold”." },
    { q: "A model scores 99% on its training data but 61% on new data. What's the most likely problem?",
      o: ["Underfitting", "Overfitting", "The computer is too slow", "Too much test data"],
      a: 1, e: "Overfitting: the model learned the quirks and noise of its training set instead of the general pattern. More data, simpler models or regularisation usually help." },
    { q: "In ML, a “feature” is…",
      o: ["A selling point in the app store", "An input variable the model uses, like blood creatinine level", "The final prediction", "A bug that someone calls a feature"],
      a: 1, e: "Features are the measurable inputs. Choosing good ones matters a lot.",
      aud: "An AUD undergraduate paper screens kidney disease with <b>a single feature</b>, serum creatinine, and still reaches AUC 0.81." },
    { q: "99 of 100 patients are healthy. A lazy model always answers “healthy”. Its accuracy is 99%. What's the catch?",
      o: ["Nothing, 99% is excellent", "It misses every sick patient, so accuracy is misleading on imbalanced data", "Accuracy can never be above 95%", "It needs more GPUs"],
      a: 1, e: "With imbalanced classes, check recall and precision, or AUROC. A model that never finds the sick patient is useless, however high its accuracy." },
    { q: "In AUD's EEG study, a pipeline scored AUROC 0.936. When train and test came from separate time blocks, it dropped to 0.809. What inflated the first number?",
      o: ["Data leakage: near-identical data ended up in both training and test", "The EEG cap was too tight", "The model was too small", "AUROC always drops over time"],
      a: 0, e: "Leakage lets information from the test set slip into training, so the score looks better than real-world performance. A careful split is often the most important line of code.",
      aud: "Seen at AUD: the <b>mind-wandering EEG paper</b> showed that published results were likely overestimated for exactly this reason." },
    { q: "What does a single artificial neuron compute?",
      o: ["A random number", "A weighted sum of its inputs plus a bias, passed through an activation function", "The average of all pixels in an image", "An if/else rule written by a person"],
      a: 1, e: "Multiply each input by a weight, add them up with a bias, then squash the result (ReLU, sigmoid…). Stack thousands of these and you have a network." },
    { q: "Gradient descent is used to…",
      o: ["Draw nicer charts", "Find parameters that minimise the loss by taking small steps downhill", "Compress the dataset", "Choose the colour of the GPU"],
      a: 1, e: "The gradient points uphill on the error surface. Step the other way, a little at a time, until the error stops shrinking. The step size is the “learning rate”." },
    { q: "Large language models read text as…",
      o: ["Whole sentences", "Tokens, small pieces of words", "Individual pixels", "Audio waves"],
      a: 1, e: "Text is split into tokens (for example “learn” + “ing”). Models are priced and limited by tokens, and they predict the next token one at a time." },
    { q: "A chatbot confidently cites a research paper that doesn't exist. This is called…",
      o: ["A hallucination", "Overclocking", "Fine-tuning", "Encryption"],
      a: 0, e: "LLMs generate plausible text; plausible isn't the same as true. Grounding answers in real documents and checking sources reduces it." },
    { q: "What does RAG (retrieval-augmented generation) do?",
      o: ["Makes the model bigger", "Finds relevant documents and gives them to the model so answers are grounded in sources", "Deletes old data", "Translates code into images"],
      a: 1, e: "Retrieve, then generate: the model answers using passages it was handed, and can point back to them.",
      aud: "An MSAI thesis with <b>SEHA–SKMC</b> uses RAG to pull diagnoses out of long pediatric referral reports, each linked to its source line." },
    { q: "In reinforcement learning, an agent improves by…",
      o: ["Reading a labelled dataset", "Trying actions and receiving rewards or penalties", "Copying another agent's code", "Asking a human every time"],
      a: 1, e: "The agent explores, gets feedback as a reward signal, and gradually learns a policy that earns more reward.",
      aud: "An MSAI project trained <b>50 EV charging stations</b> this way and cut mean queue length by 83%." },
    { q: "Which Python library is the usual choice for working with tables of data?",
      o: ["pandas", "pygame", "Flask", "turtle"],
      a: 0, e: "pandas gives you DataFrames: load a CSV, filter, group, join, clean. It's usually the first import in an ML notebook." },
    { q: "A model flags a patient as high-risk. A tool like SHAP can tell you…",
      o: ["The patient's name", "How much each input pushed that prediction up or down", "Whether the GPU is overheating", "The exact code of the model"],
      a: 1, e: "SHAP assigns each feature a contribution to one specific prediction, which helps people decide whether to trust it.",
      aud: "Two AUD papers, the <b>Synapse</b> Alzheimer's pipeline and the <b>heart-failure</b> app, attach SHAP explanations to every prediction." },
  ];
  const LEVELS = [
    [14, "AI engineer in the making", "You think like an ML practitioner already. The MSc in Artificial Intelligence would sharpen that fast."],
    [11, "ML-ready", "Solid foundations. A couple of concepts to tighten, and you're ready to train your first real model."],
    [7, "Apprentice", "You've got the intuition. A short Python + ML course would make everything click."],
    [0, "Curious beginner", "Everyone starts here. You learned at least five new ideas in the last five minutes."],
  ];
  const quiz = { i: 0, score: 0, marks: [], xp: 0, streak: 0, best: 0, t0: 0 };
  const SPEED_MS = 12000;
  function hud(id, n) {
    const el = $(id); if (!el) return;
    el.querySelector("b").textContent = n; el.classList.toggle("hot", n >= 3); if (n) FX.bump(el);
  }
  function quizStart() { Object.assign(quiz, { i: 0, score: 0, marks: [], xp: 0, streak: 0, best: 0 }); $("#qXP").textContent = 0; hud("#qStreak", 0); quizRender(); }
  function quizRender() {
    const prog = $("#qProgress"), body = $("#qBody");
    prog.innerHTML = QUIZ.map((_, k) => `<i class="${quiz.marks[k] || (k === quiz.i ? "now" : "")}"></i>`).join("");
    if (quiz.i >= QUIZ.length) return quizResult();
    const Q = QUIZ[quiz.i];
    body.innerHTML = "";
    const card = h("div", "q-card");
    card.append(h("i", "q-timer"), h("div", "q-num", `QUESTION ${String(quiz.i + 1).padStart(2, "0")} / ${QUIZ.length} · <span class="q-bonus">answer within 12 s for a speed bonus</span>`), h("div", "q-text", Q.q));
    quiz.t0 = performance.now();
    const opts = h("div", "q-opts");
    Q.o.forEach((t, k) => {
      const b = h("button", "q-opt", `<span class="k">${"ABCD"[k]}</span><span>${t}</span>`);
      b.style.setProperty("--k", k);
      b.addEventListener("click", () => quizAnswer(k));
      opts.appendChild(b);
    });
    card.append(opts, h("div", "", ""));
    const foot = h("div", "q-foot", `<span class="q-score">SCORE ${quiz.score} / ${quiz.i}</span>`);
    card.appendChild(foot);
    body.appendChild(card);
  }
  function quizAnswer(k) {
    const Q = QUIZ[quiz.i], ok = k === Q.a, btns = $$(".q-opt");
    if (btns[0].disabled) return;
    btns.forEach((b, j) => { b.disabled = true; if (j === Q.a) b.classList.add("right"); else if (j === k) b.classList.add("wrong"); else b.classList.add("dim"); });
    if (ok) quiz.score++;
    quiz.marks[quiz.i] = ok ? "ok" : "no";
    $(".q-timer") && $(".q-timer").classList.add("stop");
    const [cx, cy] = FX.centerOf(btns[k]);
    if (ok) {
      quiz.streak++; quiz.best = Math.max(quiz.best, quiz.streak);
      const fast = performance.now() - quiz.t0 < SPEED_MS, gain = 100 + (fast ? 50 : 0) + (quiz.streak >= 3 ? 25 * (quiz.streak - 2) : 0);
      quiz.xp += gain; $("#qXP").textContent = quiz.xp; FX.bump($("#qXP").parentNode);
      FX.burst(cx, cy, "ion", 40); FX.float(cx, cy - 20, "+" + gain, "var(--ion)", [fast && "speed bonus", quiz.streak >= 3 && "streak ×" + quiz.streak].filter(Boolean).join(" · "));
      FX.bg.ripple(cx, cy, "ion"); FX.sound("good"); FX.flash(true);
    } else {
      quiz.streak = 0; FX.shake($(".q-card")); FX.flash(false); FX.sound("bad"); FX.bg.ripple(cx, cy, "alarm");
    }
    hud("#qStreak", quiz.streak);
    const ex = h("div", "q-explain", `<div class="v ${ok ? "ok" : "no"}">${ok ? "Correct" : "Not quite. The answer is " + "ABCD"[Q.a]}</div><p>${Q.e}</p>${Q.aud ? `<div class="aud">${Q.aud}</div>` : ""}`);
    $(".q-card").insertBefore(ex, $(".q-foot"));
    const foot = $(".q-foot");
    foot.innerHTML = `<span class="q-score">SCORE ${quiz.score} / ${quiz.i + 1}</span>`;
    const next = h("button", "btn primary", quiz.i === QUIZ.length - 1 ? "See my result →" : "Next question →");
    next.addEventListener("click", () => { quiz.i++; quizRender(); window.scrollTo({ top: $("#quiz").offsetTop - 70, behavior: "smooth" }); });
    foot.appendChild(next);
    $$(".q-progress i")[quiz.i].className = quiz.marks[quiz.i];
    next.focus({ preventScroll: true });
  }
  function quizResult() {
    const [, lvl, msg] = LEVELS.find(([min]) => quiz.score >= min);
    const C = 2 * Math.PI * 120;
    $("#qBody").innerHTML = `
      <div class="result">
        <svg class="ring" viewBox="0 0 280 280"><circle class="bg" cx="140" cy="140" r="120"/><circle class="fg" cx="140" cy="140" r="120" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
          <text x="140" y="150" font-size="84">${quiz.score}</text><text x="140" y="190" font-size="22" opacity=".6">of ${QUIZ.length}</text></svg>
        <div><div class="lvl">Your level</div><h2>${lvl}</h2><p>${msg}</p>
          <div class="badge"><span><b>${quiz.xp}</b> XP</span><span>best streak <b>${quiz.best}</b></span></div>
          <div class="row"><button class="btn primary" data-go="prompt">Next: build a prompt →</button><button class="btn" data-restart="quiz">Try again</button></div></div>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { $(".ring .fg").style.strokeDashoffset = C * (1 - quiz.score / QUIZ.length); }));
    if (quiz.score >= 11) { FX.confetti(); FX.sound("win"); } else if (quiz.score >= 7) { const [x, y] = FX.centerOf($(".ring")); FX.burst(x, y, "ion", 70); }
  }

  /* ═════════ 02 · prompt builder ═════════ */
  const CAT = { role: "ROLE", task: "TASK", context: "CONTEXT", constraints: "LIMITS", format: "FORMAT", check: "SELF-CHECK", example: "EXAMPLE" };
  const PB = {
    coding: {
      label: "Coding",
      blocks: [
        { c: "role", t: "You are a senior Python developer who writes clean, well-tested code." },
        { c: "task", t: "Write a function that removes duplicate email addresses from a list, ignoring upper/lower case." },
        { c: "context", t: "It's for a student club sign-up sheet with about 500 entries, exported from a form." },
        { c: "constraints", t: "Use only the standard library and keep the original order of the list." },
        { c: "format", t: "Return the code, then three example tests, then a one-line explanation." },
        { c: "check", t: "If anything about the input is unclear, ask me before writing the code." },
        { bad: 1, t: "Write code.", why: "too vague. Code for what, in which language?" },
        { bad: 1, t: "Make it super fast and perfect!!!", why: "“perfect” isn't measurable. Name the real requirement instead." },
        { bad: 1, t: "You probably know what I need.", why: "it doesn't. A model only knows what you write down." },
        { bad: 1, t: "Don't make any mistakes.", why: "it adds no information. Ask for tests or a self-check instead." },
      ],
    },
    writing: {
      label: "Writing",
      blocks: [
        { c: "role", t: "Act as the editor of a university student magazine." },
        { c: "task", t: "Write a 150-word article inviting students to the AUD AI Festival." },
        { c: "context", t: "Readers are first-year students who are curious about AI but new to it." },
        { c: "constraints", t: "Friendly tone, no jargon, and mention one real student project." },
        { c: "format", t: "Give a headline, the article, then a one-line caption for social media." },
        { c: "example", t: "Match the style of this line: “Robots won't take your seat in class, but they might help you find it.”" },
        { bad: 1, t: "Write something good.", why: "“good” for whom, how long, and about what?" },
        { bad: 1, t: "Make it go viral.", why: "an outcome no one controls. Describe the audience and tone instead." },
        { bad: 1, t: "Use lots of big words so it sounds smart.", why: "this works against your real readers, who are new to AI." },
        { bad: 1, t: "Any length is fine.", why: "length limits shape the writing. Give a number." },
      ],
    },
    studying: {
      label: "Studying",
      blocks: [
        { c: "role", t: "Be a patient tutor for a first-year engineering student." },
        { c: "task", t: "Explain how gradient descent works." },
        { c: "context", t: "I understand slopes from calculus but have never trained a model." },
        { c: "constraints", t: "Use one everyday analogy and stay under 200 words." },
        { c: "format", t: "End with three quiz questions and wait for my answers before giving the solutions." },
        { c: "check", t: "If my answers show a misunderstanding, point it out and explain it differently." },
        { bad: 1, t: "Just give me the answers to my homework.", why: "you skip the learning, and it's an academic-integrity risk." },
        { bad: 1, t: "Explain everything about AI.", why: "too broad. One focused concept at a time sticks better." },
        { bad: 1, t: "Be smart.", why: "it adds nothing the model can act on." },
        { bad: 1, t: "Skip the boring parts.", why: "the model can't know which parts you find boring. Say what you already know instead." },
      ],
    },
  };
  const TIPS = {
    role: "Add a <b>role</b>. It sets the expertise and voice of the answer.",
    task: "State the <b>task</b> plainly. Without it, nothing else matters.",
    context: "Give <b>context</b>: who it's for and what you already know.",
    constraints: "Add <b>limits</b> such as length, tools or tone. They make the answer fit your situation.",
    format: "Describe the <b>format</b> you want back, so the answer is ready to use.",
    check: "Add a <b>self-check</b>: ask it to ask questions or verify, which catches mistakes early.",
    example: "Show an <b>example</b> of the style you want; models copy examples very well.",
  };
  const pb = { mode: "coding", order: {}, canvas: [], checked: false, added: -1, live: 0 };
  function pbInit(mode) {
    pb.mode = mode; pb.checked = false;
    pb.order[mode] = shuffle(PB[mode].blocks.map((_, i) => i));
    pb.canvas = [];
    $("#pbReport").innerHTML = "";
    $$("#pbModes button").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
    pbRender();
  }
  function pbBlock(i) {
    const B = PB[pb.mode].blocks[i];
    const el = h("div", "blk", `<span class="cat">${B.bad ? "WEAK" : CAT[B.c]}</span>${B.t}`);
    el.dataset.i = i;
    if (pb.checked) el.classList.add(B.bad ? "bad" : "good");
    if (i === pb.added && pb.canvas.includes(i)) el.classList.add("pop");
    const inCanvas = () => pb.canvas.includes(i);
    draggable(el, {
      onTap: () => { if (inCanvas()) pb.canvas.splice(pb.canvas.indexOf(i), 1); else { pb.canvas.push(i); pb.added = i; FX.sound("drop"); } pbChanged(); },
      onOver: (z, ev) => pbMark(z && z.id === "pbCanvas" ? pbIndexAt(ev.clientY, i) : -1),
      onDrop: (z, ev) => {
        if (!z) return;
        const from = pb.canvas.indexOf(i);
        if (z.id === "pbCanvas") {
          const at = pbIndexAt(ev.clientY, i);
          if (from > -1) pb.canvas.splice(from, 1);
          pb.canvas.splice(at, 0, i); pb.added = i;
        } else if (z.id === "pbPool" && from > -1) pb.canvas.splice(from, 1);
        pbChanged();
      },
    });
    return el;
  }
  function pbIndexAt(y, self) {
    const items = $$(".blk", $("#pbCanvas")).filter((b) => +b.dataset.i !== self);
    let k = 0;
    for (const b of items) { const r = b.getBoundingClientRect(); if (y > r.top + r.height / 2) k++; }
    return k;
  }
  function pbMark(k) {
    $$(".slot-mark").forEach((m) => m.remove());
    if (k < 0) return;
    const cv = $("#pbCanvas"), items = $$(".blk:not(.lifting)", cv), m = h("div", "slot-mark");
    items[k] ? cv.insertBefore(m, items[k]) : cv.appendChild(m);
  }
  function pbChanged() { if (pb.checked) { pb.checked = false; $("#pbReport").innerHTML = ""; } pbRender(); }
  function pbRender() {
    const pool = $("#pbPool"), cv = $("#pbCanvas");
    pool.innerHTML = ""; cv.innerHTML = "";
    $("#pb").classList.toggle("checked", pb.checked);
    pb.order[pb.mode].filter((i) => !pb.canvas.includes(i)).forEach((i) => pool.appendChild(pbBlock(i)));
    pb.canvas.forEach((i) => cv.appendChild(pbBlock(i)));
    const txt = pb.canvas.map((i) => PB[pb.mode].blocks[i].t).join("\n");
    $("#pbPreview").textContent = txt;
    $("#pbWords").textContent = (txt.match(/\S+/g) || []).length + " words";
    $("#pbPoolCount").textContent = pool.children.length + " left";
    pbLive();
  }
  function pbScore() {
    const blocks = PB[pb.mode].blocks, used = pb.canvas.map((i) => blocks[i]);
    const cats = blocks.filter((b) => !b.bad).map((b) => b.c);
    const have = new Set(used.filter((b) => !b.bad).map((b) => b.c));
    const bad = used.filter((b) => b.bad);
    let s = have.size * 15;
    const good = used.filter((b) => !b.bad);
    if (good.length && good[0].c === "role") s += 5;
    if (good.length >= 3 && good.slice(-2).some((b) => b.c === "format")) s += 5;
    s -= bad.length * 12;
    if (!have.has("task")) s = Math.min(s, 35);
    return { score: Math.max(0, Math.min(100, s)), cats, have, bad };
  }
  function pbLive() {
    const s = pb.canvas.length ? pbScore().score : 0, prev = pb.live, wrap = $(".live");
    $("#pbLive").style.width = s + "%";
    wrap.classList.toggle("drop", s < prev);
    const el = $("#pbLiveN"), t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 600); el.textContent = Math.round(prev + (s - prev) * k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    if (s !== prev && pb.canvas.length) FX.bump(el);
    if (s === 100 && prev < 100) { const [x, y] = FX.centerOf(el); FX.burst(x, y, "signal", 60); FX.sound("win"); }
    pb.live = s;
  }
  function pbCheck() {
    if (!pb.canvas.length) { $("#pbReport").innerHTML = `<div class="report"><div class="tips" style="border:0;padding:0"><p>Your prompt is empty. Drag or tap a few blocks first.</p></div></div>`; return; }
    pb.checked = true; pbRender();
    const { score, cats, have, bad } = pbScore();
    const grade = score >= 90 ? "Expert prompt" : score >= 70 ? "Strong prompt" : score >= 45 ? "Getting there" : "Too vague";
    const tips = cats.filter((c) => !have.has(c)).map((c) => `<p>→ ${TIPS[c]}</p>`).join("") +
      bad.map((b) => `<p><b>“${b.t}”</b>: ${b.why}</p>`).join("");
    $("#pbReport").innerHTML = `
      <div class="report">
        <div class="meter"><span>Prompt score</span><b id="pbNum">0</b><span class="grade">${grade}</span></div>
        <ul class="checks">${cats.map((c, k) => `<li style="--k:${k}" class="${have.has(c) ? "y" : "n"}"><i>${have.has(c) ? "✓" : "✗"}</i><span><b>${CAT[c][0] + CAT[c].slice(1).toLowerCase()}</b></span></li>`).join("")}
          <li style="--k:${cats.length}" class="${bad.length ? "n" : "y"}"><i>${bad.length ? "✗" : "✓"}</i><span><b>No vague filler</b>${bad.length ? ` · ${bad.length} weak block${bad.length > 1 ? "s" : ""}` : ""}</span></li></ul>
        <div class="tips">${tips || "<p>Every ingredient is there and there's no filler. Try this structure with any AI assistant.</p>"}</div>
      </div>`;
    const el = $("#pbNum"), t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 900); el.textContent = Math.round(score * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    $("#pbReport").scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => {
      const [x, y] = FX.centerOf(el);
      if (score >= 90) { FX.confetti(120); FX.sound("win"); } else if (score >= 70) { FX.burst(x, y, "signal", 50); FX.sound("good"); }
      else FX.sound("bad");
      FX.bg.ripple(x, y, score >= 70 ? "signal" : "alarm");
    }, 700);
  }
  function pbExpert() {
    const blocks = PB[pb.mode].blocks, order = ["role", "task", "context", "constraints", "example", "format", "check"];
    pb.canvas = order.map((c) => blocks.findIndex((b) => b.c === c)).filter((i) => i > -1);
    pb.checked = false; pbRender(); pbCheck();
  }

  /* ═════════ 03 · AI or not ═════════ */
  const G = {   // tiny line glyphs, 64×64
    face: '<circle cx="32" cy="30" r="16"/><circle cx="26" cy="27" r="1.6" fill="currentColor"/><circle cx="38" cy="27" r="1.6" fill="currentColor"/><path d="M26 36q6 5 12 0M10 14V8h6M54 14V8h-6M10 50v6h6M54 50v6h-6"/>',
    thermo: '<rect x="27" y="8" width="10" height="36" rx="5"/><circle cx="32" cy="50" r="8"/><path d="M32 22v26M42 16h6M42 24h6M42 32h6"/>',
    turk: '<rect x="10" y="30" width="44" height="26"/><path d="M14 30V20h36v10M28 20v-8h8v8M24 42h16"/><circle cx="32" cy="10" r="3"/>',
    film: '<rect x="8" y="14" width="48" height="36" rx="2"/><path d="M8 22h48M8 42h48M16 14v8M24 14v8M32 14v8M40 14v8M48 14v8M16 42v8M24 42v8M32 42v8M40 42v8M48 42v8"/>',
    calc: '<rect x="16" y="6" width="32" height="52" rx="3"/><rect x="21" y="11" width="22" height="10"/><path d="M22 30h4M30 30h4M38 30h4M22 38h4M30 38h4M38 38h4M22 46h4M30 46h4M38 46h4"/>',
    keys: '<rect x="6" y="22" width="52" height="26" rx="3"/><path d="M12 30h4M20 30h4M28 30h4M36 30h4M44 30h4M16 38h32"/><path d="M14 14h20" stroke-dasharray="3 3"/>',
    toast: '<path d="M10 52V30q0-12 22-12t22 12v22z"/><path d="M22 18v-6M32 18v-8M42 18v-6M48 36h8"/><circle cx="20" cy="40" r="2" fill="currentColor"/>',
    map: '<path d="M8 14l14-6 20 6 14-6v42l-14 6-20-6-14 6z"/><path d="M22 8v42M42 14v42" opacity=".5"/><path d="M14 40q10-20 20-6t18-16" stroke-dasharray="3 3"/>',
    ball: '<circle cx="32" cy="32" r="24"/><path d="M32 22l9 16H23z"/>',
    light: '<rect x="22" y="6" width="20" height="44" rx="4"/><circle cx="32" cy="15" r="4"/><circle cx="32" cy="28" r="4"/><circle cx="32" cy="41" r="4"/><path d="M32 50v8M8 30h10M46 30h10" opacity=".5"/>',
    chess: '<path d="M22 54h20M24 48h16l-2-14h-12zM26 34q-6-8 6-14 12 6 6 14M32 20v-8M28 14h8"/>',
    bird: '<path d="M14 36q2-20 22-22 12 0 14 10l6 4-8 2q-4 14-20 14-8 0-14-8z"/><circle cx="42" cy="22" r="1.6" fill="currentColor"/><path d="M24 50l-4 8M30 50l0 8"/>',
  };
  const AN = [
    { t: "Your phone unlocking when it sees your face", g: "face", ai: 1, e: "A neural network trained on millions of faces turns yours into numbers and compares them. It copes with glasses, beards and bad lighting, because it learned, not because someone wrote a rule for each case." },
    { t: "A thermostat that switches the AC on at 24 °C", g: "thermo", ai: 0, e: "One fixed rule: <i>if temperature &gt; 24, cool</i>. It never learns your schedule. (A thermostat that <i>learns</i> when you come home would count.)" },
    { t: "The 1770 “Mechanical Turk”, a chess robot that beat Napoleon", g: "turk", ai: 0, e: "A human chess master was hidden inside the cabinet. It's the oldest “AI” hoax, and a good reminder to ask how a system really works." },
    { t: "Netflix's “Because you watched…” row", g: "film", ai: 1, e: "Recommender models learn from the viewing patterns of millions of people to guess what you'll watch next. Same family of ideas as the Skywards rewards project at AUD." },
    { t: "A calculator solving 7,392 × 41 instantly", g: "calc", ai: 0, e: "Fast is not the same as intelligent. The calculator follows exact arithmetic rules, learns nothing and makes no choices." },
    { t: "Your keyboard suggesting the next word", g: "keys", ai: 1, e: "That's a small language model predicting the most likely next word from what you've typed, a tiny cousin of ChatGPT." },
    { t: "A “smart” toaster with a timer and a blue LED", g: "toast", ai: 0, e: "Marketing! A timer and a light don't learn or decide anything. A “smart” label doesn't make something AI." },
    { t: "Google Maps re-routing you around a traffic jam", g: "map", ai: 1, e: "It predicts travel times from live and historical traffic with machine learning, then searches for the fastest route. That's learning plus planning." },
    { t: "A Magic 8-Ball answering “Outlook good”", g: "ball", ai: 0, e: "A random pick from 20 fixed answers. Confident isn't the same as intelligent, and the same holds when chatbots sound sure of wrong facts." },
    { t: "Traffic lights that learn to shorten queues at a junction", g: "light", ai: 1, e: "Reinforcement learning: the lights try timings and get rewarded for shorter queues. AUD's MSAI students did this for 50 EV chargers in Dubai." },
    { t: "A chess app that looks ahead millions of moves", g: "chess", ai: 1, e: "Tricky one: even with no learning, searching through future moves and choosing the best is classic AI. Modern engines also use neural networks to judge positions." },
    { t: "A parrot saying “Hello!” when you walk in", g: "bird", ai: 0, e: "Impressive, but it's natural intelligence, not artificial. It's a bird." },
  ];
  const an = { deck: [], i: 0, marks: [], busy: false, streak: 0 };
  function anStart() { an.deck = shuffle(AN); an.i = 0; an.marks = []; an.busy = false; an.streak = 0; hud("#anStreak", 0); anRender(); }
  function anDots() {
    $("#anDots").innerHTML = an.deck.map((_, k) => `<i class="${an.marks[k] || ""}"></i>`).join("");
    const right = an.marks.filter((m) => m === "ok").length;
    $("#anScore").textContent = `CARD ${Math.min(an.i + 1, an.deck.length)} / ${an.deck.length} · ${right} RIGHT`;
  }
  function anRender() {
    const st = $("#anStage"); st.innerHTML = ""; anDots();
    $("#binAI").disabled = $("#binNot").disabled = false;
    if (an.i >= an.deck.length) return anResult();
    const C = an.deck[an.i];
    const card = h("div", "an-card", `<div class="k"><span>CARD ${String(an.i + 1).padStart(2, "0")}</span><span>AI OR NOT?</span></div><h3>${C.t}</h3>
      <svg class="glyph" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${G[C.g]}</svg>
      <div class="hint">drag left or right · or tap a side</div>`);
    draggable(card, { fly: true, onDrop: (z) => (z.dataset.zone === "ai" || z.dataset.zone === "not") ? (setTimeout(() => anDecide(z.dataset.zone === "ai"), 300), true) : false });
    st.appendChild(card);
  }
  function anDecide(saidAI) {
    if (an.busy || an.i >= an.deck.length) return;
    an.busy = true;
    const C = an.deck[an.i], ok = !!C.ai === saidAI;
    an.marks[an.i] = ok ? "ok" : "no"; anDots();
    const bin = saidAI ? $("#binAI") : $("#binNot"), [bx, by] = FX.centerOf(bin);
    bin.classList.remove("hit"); void bin.offsetWidth; bin.classList.add("hit");
    if (ok) {
      an.streak++; FX.burst(bx, by, saidAI ? "ion" : "ember", 44); FX.float(bx, by - 30, "Correct", "var(--signal)", an.streak >= 3 ? "streak ×" + an.streak : "");
      FX.sound("good"); FX.bg.ripple(bx, by, "signal");
    } else { an.streak = 0; FX.flash(false); FX.sound("bad"); FX.bg.ripple(bx, by, "alarm"); }
    hud("#anStreak", an.streak);
    $("#binAI").disabled = $("#binNot").disabled = true;
    const v = h("div", "verdict", `<div class="v ${ok ? "ok" : "no"}">${ok ? "Correct" : "Not quite"}</div>
      <h3>${C.ai ? "It's <em style=\"color:var(--ion)\">AI</em>." : "It's <em style=\"color:var(--ember)\">not AI</em>."}</h3><p>${C.e}</p>`);
    const next = h("button", "btn primary", an.i === an.deck.length - 1 ? "See my score →" : "Next card →");
    next.addEventListener("click", () => { an.i++; an.busy = false; anRender(); });
    v.appendChild(next);
    $("#anStage").innerHTML = ""; $("#anStage").appendChild(v);
    if (!ok) FX.shake(v);
    next.focus({ preventScroll: true });
  }
  function anResult() {
    const right = an.marks.filter((m) => m === "ok").length, n = an.deck.length;
    $("#binAI").disabled = $("#binNot").disabled = true;
    const msg = right >= 11 ? ["Sharp eye", "You can tell a learning system from a fixed rule, which is more than most marketing departments manage."]
      : right >= 8 ? ["Good instincts", "The tricky ones (chess, thermostats, “smart” gadgets) catch most people. Now you know the test: does it learn or decide?"]
      : ["Now you know the trick", "Ask one question: does it learn from data or choose between options? If it only follows a fixed rule, it's not AI."];
    $("#anStage").innerHTML = `<div class="verdict"><div class="v ok">${right} / ${n} correct</div><h3>${msg[0]}.</h3><p>${msg[1]}</p>
      <div class="row" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:auto"><button class="btn primary" data-restart="ainot">Play again</button><button class="btn" data-go="quiz">Take the quiz →</button></div></div>`;
    if (right >= 9) { FX.confetti(); FX.sound("win"); }
  }
  // bins also work as tap targets
  $("#binAI").addEventListener("click", () => anDecide(true));
  $("#binNot").addEventListener("click", () => anDecide(false));

  /* ═════════ routing, restart, idle reset ═════════ */
  const VIEWS = ["hub", "quiz", "prompt", "ainot"];
  const START = { quiz: quizStart, prompt: () => pbInit(pb.mode), ainot: anStart };
  function route() {
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "hub";
    VIEWS.forEach((k) => ($("#" + k).hidden = k !== v));
    $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === v));
    document.body.dataset.view = v; FX.bg.view(v);
    window.scrollTo(0, 0);
  }
  Object.entries(PB).forEach(([k, m]) => {
    const b = h("button", "", m.label); b.dataset.mode = k;
    b.addEventListener("click", () => pbInit(k));
    $("#pbModes").appendChild(b);
  });
  $("#pbCheck").addEventListener("click", pbCheck);
  $("#pbExpert").addEventListener("click", pbExpert);
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-restart]"); if (r) START[r.dataset.restart]();
    const g = e.target.closest("[data-go]"); if (g) location.hash = g.dataset.go;
  });
  document.addEventListener("keydown", (e) => {
    if (location.hash !== "#quiz") return;
    const k = "1234abcd".indexOf(e.key.toLowerCase());
    if (k > -1 && $(".q-opt") && !$(".q-opt").disabled) quizAnswer(k % 4);
  });

  const IDLE_MS = 120000, WARN_S = 10;
  let last = Date.now(), warn = null;
  const poke = () => { last = Date.now(); if (warn) { clearInterval(warn); warn = null; $("#idle").hidden = true; } };
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((ev) => addEventListener(ev, poke, { passive: true }));
  setInterval(() => {
    if (warn || location.hash.length < 2 || Date.now() - last < IDLE_MS) return;
    let s = WARN_S; $("#idleS").textContent = s; $("#idle").hidden = false;
    warn = setInterval(() => {
      $("#idleS").textContent = --s;
      if (s <= 0) { poke(); quizStart(); pbInit("coding"); anStart(); location.hash = ""; }
    }, 1000);
  }, 5000);

  addEventListener("hashchange", route);
  quizStart(); pbInit("coding"); anStart(); route();
})();

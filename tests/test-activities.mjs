// End-to-end check of the three activities: mouse drag, touch drag, taps, full runs.
import puppeteer from "puppeteer-core";
const base = process.argv[2] || "http://localhost:8765", out = process.argv[3] || "shots";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const errors = [], results = [];
const ok = (name, cond) => results.push(`${cond ? "PASS" : "FAIL"}  ${name}`);
async function open(vp, hash = "") {
  const p = await browser.newPage();
  await p.setViewport(vp);
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push("pageerror " + e.message));
  p.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await p.goto(`${base}/activities/${hash}`, { waitUntil: "networkidle0" });
  return p;
}
const center = async (p, sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
async function mouseDrag(p, from, to) {
  const a = await center(p, from), b = await center(p, to);
  await p.mouse.move(a.x, a.y); await p.mouse.down();
  for (let i = 1; i <= 12; i++) { await p.mouse.move(a.x + (b.x - a.x) * i / 12, a.y + (b.y - a.y) * i / 12); await wait(15); }
  await p.mouse.up(); await wait(500);
}
async function touchDrag(p, from, to) {
  const a = await center(p, from), b = await center(p, to);
  await p.touchscreen.touchStart(a.x, a.y);
  for (let i = 1; i <= 12; i++) { await p.touchscreen.touchMove(a.x + (b.x - a.x) * i / 12, a.y + (b.y - a.y) * i / 12); await wait(15); }
  await p.touchscreen.touchEnd(); await wait(500);
}

// ── desktop
let p = await open({ width: 1440, height: 900 });
await p.screenshot({ path: `${out}/act-hub.png`, fullPage: true });

// quiz: answer B everywhere, check explanations and the result screen
await p.goto(`${base}/activities/#quiz`); await wait(300);
await p.screenshot({ path: `${out}/act-quiz-q1.png` });
for (let i = 0; i < 15; i++) {
  await p.click(".q-opt:nth-child(2)"); await wait(80);
  if (i === 6) await p.screenshot({ path: `${out}/act-quiz-answered.png` });
  await p.click(".q-foot .btn.primary"); await wait(80);
}
await wait(1800);
ok("quiz reaches result", !!(await p.$(".result h2")));
ok("quiz progress shows 15 marks", (await p.$$eval(".q-progress i.ok, .q-progress i.no", (x) => x.length)) === 15);
await p.screenshot({ path: `${out}/act-quiz-result.png` });

// prompt builder: mouse-drag two blocks, tap one, reorder, check
await p.goto(`${base}/activities/#prompt`); await wait(300);
await mouseDrag(p, "#pbPool .blk:nth-child(1)", "#pbCanvas");
await mouseDrag(p, "#pbPool .blk:nth-child(1)", "#pbCanvas");
await p.click("#pbPool .blk:nth-child(1)"); await wait(100);
ok("prompt: 3 blocks in canvas after 2 drags + 1 tap", (await p.$$eval("#pbCanvas .blk", (x) => x.length)) === 3);
const firstBefore = await p.$eval("#pbCanvas .blk:nth-child(1)", (e) => e.dataset.i);
{ const a = await center(p, "#pbCanvas .blk:nth-child(1)"), r = await p.$eval("#pbCanvas .blk:nth-child(3)", (e) => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.bottom - 4 }; });
  await p.mouse.move(a.x, a.y); await p.mouse.down();
  for (let i = 1; i <= 12; i++) { await p.mouse.move(a.x + (r.x - a.x) * i / 12, a.y + (r.y - a.y) * i / 12); await wait(15); }
  await p.mouse.up(); await wait(500); }
const lastAfter = await p.$eval("#pbCanvas .blk:last-child", (e) => e.dataset.i);
ok("prompt: drag reorders inside canvas", firstBefore === lastAfter);
await mouseDrag(p, "#pbCanvas .blk:nth-child(1)", "#pbPool");
ok("prompt: drag back to library removes", (await p.$$eval("#pbCanvas .blk", (x) => x.length)) === 2);
ok("prompt: preview has text", (await p.$eval("#pbPreview", (e) => e.textContent.length)) > 10);
await p.click("#pbCheck"); await wait(1100);
ok("prompt: report rendered", !!(await p.$(".report .meter")));
await p.screenshot({ path: `${out}/act-prompt-check.png`, fullPage: true });
await p.click("#pbExpert"); await wait(1100);
ok("prompt: expert scores 100", (await p.$eval("#pbNum", (e) => e.textContent)) === "100");
await p.screenshot({ path: `${out}/act-prompt-expert.png`, fullPage: true });
for (const m of ["writing", "studying"]) {
  await p.click(`#pbModes [data-mode=${m}]`); await wait(100); await p.click("#pbExpert"); await wait(1000);
  ok(`prompt: ${m} expert scores 100`, (await p.$eval("#pbNum", (e) => e.textContent)) === "100");
}

// ai-or-not: drag first card into AI bin, then tap through the rest
await p.goto(`${base}/activities/#ainot`); await wait(300);
await p.screenshot({ path: `${out}/act-ainot-card.png` });
await mouseDrag(p, ".an-card", "#binAI");
ok("ainot: drag produced a verdict", !!(await p.$(".verdict")));
await p.screenshot({ path: `${out}/act-ainot-verdict.png` });
await p.click(".verdict .btn"); await wait(80);
for (let i = 1; i < 12; i++) { await p.click(i % 2 ? "#binNot" : "#binAI"); await wait(60); await p.click(".verdict .btn"); await wait(60); }
ok("ainot: result after 12 cards", (await p.$eval(".verdict .v", (e) => e.textContent)).includes("/ 12"));
await p.screenshot({ path: `${out}/act-ainot-result.png` });
await p.close();

// ── phone with touch
p = await open({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.screenshot({ path: `${out}/m-hub.png`, fullPage: true });
await p.goto(`${base}/activities/#prompt`); await wait(300);
{ // drag to the bottom edge, let auto-scroll bring the canvas into view, then drop on it
  const a = await center(p, "#pbPool .blk:nth-child(2)");
  await p.touchscreen.touchStart(a.x, a.y);
  for (let i = 1; i <= 10; i++) { await p.touchscreen.touchMove(a.x, a.y + (835 - a.y) * i / 10); await wait(15); }
  for (let i = 0; i < 120; i++) {
    const top = await p.$eval("#pbCanvas", (e) => e.getBoundingClientRect().top);
    if (top < 600) break;
    await p.touchscreen.touchMove(a.x, 835 - (i % 2)); await wait(25);
  }
  const c = await p.$eval("#pbCanvas", (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: Math.min(r.y + 60, 700) }; });
  for (let i = 1; i <= 8; i++) { await p.touchscreen.touchMove(c.x, 835 + (c.y - 835) * i / 8); await wait(20); }
  await p.touchscreen.touchEnd(); await wait(200); }
ok("touch: drag block into canvas", (await p.$$eval("#pbCanvas .blk", (x) => x.length)) === 1);
await p.screenshot({ path: `${out}/m-prompt.png`, fullPage: true });
await p.goto(`${base}/activities/#ainot`); await wait(300);
await touchDrag(p, ".an-card", "#binNot");
ok("touch: drag card into bin", !!(await p.$(".verdict")));
await p.screenshot({ path: `${out}/m-ainot.png`, fullPage: true });
await p.goto(`${base}/activities/#quiz`); await wait(300);
await p.screenshot({ path: `${out}/m-quiz.png`, fullPage: true });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
ok("mobile: no horizontal scroll (scrollWidth " + sw + ")", sw <= 390);

console.log(results.join("\n"));
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await browser.close();

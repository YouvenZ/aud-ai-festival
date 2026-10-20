import puppeteer from "puppeteer-core";
const base = process.argv[2], out = process.argv[3];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base + "/activities/", { waitUntil: "networkidle0" });
await p.mouse.move(900, 300); await wait(2600);
await p.screenshot({ path: out + "/fx-hub.png" });
await p.mouse.move(760, 640); await wait(500);
await p.screenshot({ path: out + "/fx-hub-hover.png" });
await p.goto(base + "/activities/#quiz"); await wait(1200);
for (let i = 0; i < 3; i++) { await p.click(".q-opt:nth-child(2)"); await wait(i === 2 ? 260 : 300); if (i < 2) { await p.click(".q-foot .btn.primary"); await wait(700); } }
await p.screenshot({ path: out + "/fx-quiz-correct.png" });
await p.goto(base + "/activities/#prompt"); await wait(800);
await p.click("#pbExpert"); await wait(1150);
await p.screenshot({ path: out + "/fx-prompt-win.png" });
await p.goto(base + "/activities/#ainot"); await wait(800);
const c = await p.$eval(".an-card", (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
const t = await p.$eval("#binAI", (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await p.mouse.move(...c); await p.mouse.down();
for (let i = 1; i <= 14; i++) { await p.mouse.move(c[0] + (t[0] - c[0]) * i / 14, c[1] + (t[1] - c[1]) * i / 14); await wait(16); }
await wait(100); await p.screenshot({ path: out + "/fx-ainot-drag.png" });
await p.mouse.up(); await wait(420);
await p.screenshot({ path: out + "/fx-ainot-drop.png" });
console.log(errs.length ? errs : "no errors"); await b.close();

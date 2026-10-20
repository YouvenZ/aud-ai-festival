// Let autoplay run naturally and detect a hung main thread or a stalled deck.
import puppeteer from "puppeteer-core";
const base = process.argv[2], from = +(process.argv[3] || 10), secs = +(process.argv[4] || 70);
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); const [vw, vh, dpr] = (process.argv[5] || "1600x900x1").split("x").map(Number); await p.setViewport({ width: vw, height: vh, deviceScaleFactor: dpr });
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto(base + "/presentation/#/" + from, { waitUntil: "networkidle0" });
const probe = () => Promise.race([
  p.evaluate(() => ({ i: Reveal.getState().indexh + 1, auto: Reveal.isAutoSliding(), paused: Reveal.isPaused() })),
  new Promise((r) => setTimeout(() => r("HUNG (main thread unresponsive)"), 3000)),
]);
let last = null;
for (let s = 0; s < secs; s++) {
  const st = await probe();
  const line = typeof st === "string" ? st : `slide ${st.i} auto=${st.auto}`;
  if (line !== last) { console.log(`t=${s}s  ${line}`); last = line; }
  if (typeof st === "string") break;
  await new Promise((r) => setTimeout(r, 1000));
}
await b.close().catch(() => {}); process.exit(0);

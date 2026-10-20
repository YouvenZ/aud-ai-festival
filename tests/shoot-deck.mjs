// Walk every slide, wait for its animation, screenshot, report console errors.
import puppeteer from "puppeteer-core";
const base = process.argv[2] || "http://localhost:8765";
const out = process.argv[3] || "shots";
const only = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
const errors = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("requestfailed", (r) => errors.push("[404] " + r.url()));
page.on("response", (r) => { if (r.status() >= 400) errors.push(`[${r.status()}] ${r.url()}`); });
await page.goto(base + "/presentation/", { waitUntil: "networkidle0" });
const n = await page.evaluate(() => Reveal.getTotalSlides());
await page.evaluate(() => Reveal.configure({ autoSlide: 0 }));
for (let i = 0; i < n; i++) {
  if (only && !only.includes(i + 1)) continue;
  await page.evaluate((i) => Reveal.slide(i), i);
  await new Promise((r) => setTimeout(r, 6500));
  await page.screenshot({ path: `${out}/deck-${String(i + 1).padStart(2, "0")}.png` });
}
console.log("slides:", n);
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();

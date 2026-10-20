// Frame timing + top CPU functions while a given slide is on screen.
import puppeteer from "puppeteer-core";
const [base, idx, vp] = [process.argv[2], +process.argv[3], (process.argv[4] || "1366x768x1").split("x").map(Number)];
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: vp[0], height: vp[1], deviceScaleFactor: vp[2] });
await p.goto(`${base}/presentation/#/${idx - 1}`, { waitUntil: "networkidle0" });
await p.evaluate(() => Reveal.configure({ autoSlide: 0 }));
const cdp = await p.createCDPSession();
await cdp.send("Profiler.enable"); await cdp.send("Profiler.start");
await p.evaluate(() => { window.__f = []; let l = performance.now(); const s = (n) => { __f.push(n - l); l = n; if (__f.length < 400) requestAnimationFrame(s); }; requestAnimationFrame(s); });
await p.evaluate((i) => Reveal.slide(i), idx - 1);
await new Promise((r) => setTimeout(r, 4000));
const ok = await Promise.race([p.evaluate(() => __f), new Promise((r) => setTimeout(() => r(null), 8000))]);
const { profile } = await cdp.send("Profiler.stop");
if (!ok) console.log("page unresponsive");
else { const f = ok.slice(5); f.sort((a, b) => a - b); console.log(`slide ${idx} @${vp.join("x")}: frames=${ok.length} median=${f[f.length >> 1]?.toFixed(1)}ms worst=${f[f.length - 1]?.toFixed(0)}ms`); }
const self = {}; const dt = profile.timeDeltas; const byId = Object.fromEntries(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, k) => { const cf = byId[id].callFrame; const key = `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}:${cf.lineNumber + 1}`; self[key] = (self[key] || 0) + (dt[k] || 0); });
Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log(`  ${(v / 1000).toFixed(0).padStart(6)} ms  ${k}`));
await b.close(); process.exit(0);

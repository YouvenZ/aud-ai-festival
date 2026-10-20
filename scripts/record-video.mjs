// Render the auto-playing deck to an MP4 that plays from a USB stick on any TV or laptop.
//
// The page runs on a virtual clock: timers, requestAnimationFrame, performance.now and every
// CSS animation/transition are advanced exactly 1/fps per frame, then the frame is captured.
// The video is therefore perfectly smooth no matter how slow the machine is.
//
//   node scripts/record-video.mjs [--out video/aud-ai-festival-showcase.mp4] [--fps 30]
//        [--size 1920x1080] [--loops 1] [--seconds N] [--base http://host/site-root]
//
// Without --base it serves ./site itself on a free local port.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).join(" ").split(/\s*--/).filter(Boolean).map((a) => {
  const [k, ...v] = a.trim().split(/\s+/); return [k, v.join(" ") || true];
}));
const FPS = +(args.fps || 30);
const [W, H] = String(args.size || "1920x1080").split("x").map(Number);
const LOOPS = Math.max(1, +(args.loops || 1));
const LIMIT = args.seconds ? +args.seconds * 1000 : Infinity;
const OUT = path.resolve(ROOT, args.out || "video/aud-ai-festival-showcase.mp4");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";

// ── tiny static server for ./site ──
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json" };
let server = null, base = args.base;
if (!base) {
  const siteDir = path.join(ROOT, "site");
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let f = path.join(siteDir, p);
    if (!f.startsWith(siteDir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }).end(buf);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
}

// ── virtual clock, injected before any page script runs ──
const CLOCK = () => {
  let now = 0, seq = 0, rafs = [];
  const timers = new Map();
  performance.now = () => now;
  const epoch = Date.now(); Date.now = () => epoch + now;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = ++seq; timers.set(id, { t: now + Math.max(0, +ms || 0), fn, a, iv: 0 }); return id; };
  window.setInterval = (fn, ms = 0, ...a) => { const id = ++seq; const iv = Math.max(1, +ms || 0); timers.set(id, { t: now + iv, fn, a, iv }); return id; };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  window.requestAnimationFrame = (fn) => { const id = ++seq; rafs.push({ id, fn }); return id; };
  window.cancelAnimationFrame = (id) => { rafs = rafs.filter((r) => r.id !== id); };
  const call = (fn, a) => { try { typeof fn === "function" && fn(...a); } catch (e) { console.error("[clock]", e); } };
  window.__clock = {
    get now() { return now; },
    advance(ms) {
      const target = now + ms;
      for (;;) {
        let next = null;
        for (const [id, t] of timers) if (t.t <= target && (!next || t.t < next[1].t || (t.t === next[1].t && id < next[0]))) next = [id, t];
        if (!next) break;
        const [id, t] = next; now = t.t;
        if (t.iv) t.t += t.iv; else timers.delete(id);
        call(t.fn, t.a);
      }
      now = target;
      const list = rafs; rafs = [];
      list.forEach((r) => call(r.fn, [now]));
      // CSS animations and transitions follow the same clock
      for (const an of document.getAnimations()) {
        if (an.__vs === undefined) { an.__vs = now; an.pause(); }
        an.currentTime = now - an.__vs;
      }
    },
  };
  // calmer grain for video encoding (moving noise wastes bitrate and smears)
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = ".grain::after{animation:none!important;opacity:.035!important}";
    document.head.appendChild(s);
  });
};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--font-render-hinting=none", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("[page]", e.message));
await page.evaluateOnNewDocument(CLOCK);
await page.goto(base + "/presentation/#/", { waitUntil: "networkidle0" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
});
const total = await page.evaluate(() => Reveal.getSlides().reduce((s, el) => s + (+el.dataset.autoslide || Reveal.getConfig().autoSlide), 0));
const durMs = Math.min(total, LIMIT);
const ONE = LOOPS > 1 ? OUT.replace(/\.mp4$/, ".once.mp4") : OUT;
const frames = Math.round((durMs / 1000) * FPS);
console.log(`deck ${(total / 1000).toFixed(1)} s · rendering ${(durMs / 1000).toFixed(1)} s × ${LOOPS} · ${frames} frames @ ${FPS} fps · ${W}x${H}`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  "-map", "0:v", "-map", "1:a", "-shortest",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-tune", "animation",
  "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-profile:v", "high", "-level", "4.1", "-r", String(FPS), "-g", String(FPS * 2),
  "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart",
  "-metadata", "title=AI at AUD: student research showcase",
  ONE,
], { stdio: ["pipe", "inherit", "inherit"] });
const ffDone = new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg exited " + c)))));

const cdp = await page.createCDPSession();
const step = 1000 / FPS;
const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate((ms) => window.__clock.advance(ms), f === 0 ? 0 : step);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 94, optimizeForSpeed: true });
  if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % (FPS * 10) === 0) {
    const slide = await page.evaluate(() => Reveal.getIndices().h + 1);
    const el = (Date.now() - t0) / 1000, eta = (el / (f + 1)) * (frames - f - 1);
    console.log(`  ${(f / FPS).toFixed(0).padStart(4)} s  slide ${String(slide).padStart(2)}  ·  ${((100 * f) / frames).toFixed(0)}%  ·  eta ${Math.round(eta)} s`);
  }
}
ff.stdin.end();
await ffDone;
await browser.close();
server?.close();
if (LOOPS > 1) {
  // repeat the rendered pass without re-encoding; the deck ends where it begins, so the seam is clean
  await new Promise((r, j) => spawn("ffmpeg", ["-y", "-loglevel", "error", "-stream_loop", String(LOOPS - 1), "-i", ONE,
    "-c", "copy", "-movflags", "+faststart", OUT], { stdio: "inherit" }).on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg loop " + c)))));
  fs.unlinkSync(ONE);
}
const mb = (fs.statSync(OUT).size / 1e6).toFixed(1);
console.log(`done → ${path.relative(ROOT, OUT)} (${mb} MB) in ${Math.round((Date.now() - t0) / 1000)} s`);

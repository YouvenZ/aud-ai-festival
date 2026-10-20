// When the page hangs, pause the debugger and print the stack of the spinning code.
import puppeteer from "puppeteer-core";
const [base, vp] = [process.argv[2], (process.argv[3] || "1366x768x1").split("x").map(Number)];
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: vp[0], height: vp[1], deviceScaleFactor: vp[2] });
const cdp = await p.createCDPSession();
const scripts = {};
cdp.on("Debugger.scriptParsed", (e) => (scripts[e.scriptId] = e.url));
await cdp.send("Debugger.enable");
await p.goto(base + "/presentation/#/12", { waitUntil: "networkidle0" });
const paused = new Promise((r) => cdp.once("Debugger.paused", r));
await new Promise((r) => setTimeout(r, 18000));          // autoplay moves 13 → 14 at ~16 s
await cdp.send("Debugger.pause");
const ev = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 4000))]);
if (!ev) console.log("page was not hung (no pause needed)");
else for (const f of ev.callFrames.slice(0, 6)) console.log(`${f.functionName || "(anon)"}  ${scripts[f.location.scriptId]?.split("/").pop()}:${f.location.lineNumber + 1}:${f.location.columnNumber + 1}`);
if (ev) {
  const top = ev.callFrames[0];
  for (const sc of top.scopeChain.slice(0, 2)) {
    const { result } = await cdp.send("Runtime.getProperties", { objectId: sc.object.objectId, ownProperties: true });
    console.log(sc.type + ":", result.filter((x) => ["i", "x", "w", "lastX", "t", "h"].includes(x.name)).map((x) => `${x.name}=${x.value?.value ?? x.value?.description}`).join("  "));
  }
}
process.exit(0);

import { chromium } from "playwright";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
const dir = "../../spikes/argon-towers-v2/dist";
const OVERLAYS = "../../research/snap-preview-re/assets/devices_overlays";
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp", ".mp3":"audio/mpeg", ".json":"application/json" };
const srv = createServer((req,res)=>{
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url.startsWith("/__snapchrome__/")) {
    const f = join(OVERLAYS, url.slice(16));
    if (existsSync(f) && statSync(f).isFile()) { res.setHeader("Content-Type","image/png"); createReadStream(f).pipe(res); } else res.writeHead(404).end();
    return;
  }
  const p = join(dir, url.replace(/^\/+/,"")||"index.html"); const f = existsSync(p)&&statSync(p).isFile()?p:join(dir,"index.html"); res.setHeader("Content-Type", MIME[extname(f)]??"application/octet-stream"); createReadStream(f).pipe(res);
});
await new Promise(r=>srv.listen(0,r));
const url = `http://localhost:${srv.address().port}/`;
const b = await chromium.launch({ headless:false });
const c = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
// Persistent overlay: re-injected on every navigation/reload.
await c.addInitScript((dev) => {
  const inject = () => {
    if (document.getElementById("snap-chrome")) return;
    const img = document.createElement("img");
    img.id = "snap-chrome";
    img.src = `/__snapchrome__/${encodeURIComponent(dev)}/live.png`;
    img.style.cssText = "position:fixed;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:2147483647";
    (document.body || document.documentElement).appendChild(img);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
  new MutationObserver(inject).observe(document.documentElement, { childList: true, subtree: false });
}, "iPhone 14 Pro");
const p = await c.newPage();
await p.goto(url, { waitUntil:"load" });
console.log("LIVE (overlay persistente):", url);
await new Promise(()=>{}); // queda abierto

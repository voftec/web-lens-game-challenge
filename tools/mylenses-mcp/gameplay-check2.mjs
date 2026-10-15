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
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
const p = await c.newPage();
const errs = [];
p.on("pageerror", e=>errs.push(e.message));
await p.goto(`http://localhost:${srv.address().port}/`, { waitUntil:"load" });
await p.waitForTimeout(5000);
const chrome = () => p.evaluate((dev) => {
  document.getElementById("snap-chrome")?.remove();
  const img = document.createElement("img"); img.id="snap-chrome";
  img.src = `/__snapchrome__/${encodeURIComponent(dev)}/live.png`;
  img.style.cssText = "position:fixed;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:2147483647";
  document.body.appendChild(img);
}, "iPhone 14 Pro");
// find real dock button positions
const btns = await p.evaluate(() => [...document.querySelectorAll(".fr-tower-btn")].map(b => { const r = b.getBoundingClientRect(); return [b.id, Math.round(r.x+r.width/2), Math.round(r.y+r.height/2)]; }));
console.log("dock:", JSON.stringify(btns));
const wave = await p.evaluate(() => { const r = document.getElementById("fr-hud-btn-wave").getBoundingClientRect(); return [Math.round(r.x+r.width/2), Math.round(r.y+r.height/2)]; });
console.log("wave:", wave);
// place gatling on field
await p.touchscreen.tap(btns[0][1], btns[0][2]); await p.waitForTimeout(400);
await p.touchscreen.tap(130, 420); await p.waitForTimeout(500);
// place goo
await p.touchscreen.tap(btns[1][1], btns[1][2]); await p.waitForTimeout(400);
await p.touchscreen.tap(260, 450); await p.waitForTimeout(500);
await p.screenshot({ path: "shots/gg1-placed.png" });
// start wave
await p.touchscreen.tap(wave[0], wave[1]); await p.waitForTimeout(3500);
await chrome(); await p.screenshot({ path: "shots/gg2-wave.png" });
// tap a placed tower → radial
await p.touchscreen.tap(130, 420); await p.waitForTimeout(1200);
await chrome(); await p.screenshot({ path: "shots/gg3-radial.png" });
await p.touchscreen.tap(196, 300); await p.waitForTimeout(6000);
await chrome(); await p.screenshot({ path: "shots/gg4-action.png" });
console.log("errors:", JSON.stringify(errs.slice(0,5)));
await c.close(); await b.close(); srv.close();

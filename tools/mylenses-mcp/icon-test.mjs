import { chromium } from "playwright";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";
const dir = "../../spikes/argon-towers-v2/dist";
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp", ".mp3":"audio/mpeg", ".ogg":"audio/ogg", ".wasm":"application/wasm", ".json":"application/json" };
const srv = createServer((req,res)=>{ const p = join(dir, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html"); const f = existsSync(p)&&statSync(p).isFile()?p:join(dir,"index.html"); res.setHeader("Content-Type", MIME[extname(f)]??"application/octet-stream"); createReadStream(f).pipe(res); });
await new Promise(r=>srv.listen(0,r));
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:720,height:1280}, hasTouch:true, isMobile:true });
const p = await c.newPage();
await p.goto(`http://localhost:${srv.address().port}/`, { waitUntil:"load" });
await p.waitForTimeout(5000);
await p.touchscreen.tap(416,1242); await p.waitForTimeout(600);   // $5 tower
await p.touchscreen.tap(330,640);  await p.waitForTimeout(600);   // place
await p.touchscreen.tap(519,1242); await p.waitForTimeout(600);   // $10 tower
await p.touchscreen.tap(420,700);  await p.waitForTimeout(600);   // place
await p.touchscreen.tap(328,1242); await p.waitForTimeout(4000);  // START WAVE
await p.screenshot({ path: "shots/icon-src.png" });
await c.close(); await b.close(); srv.close();
const e = spawnSync("ffmpeg",["-y","-i","shots/icon-src.png","-vf","crop=720:720:0:280,scale=512:512","-frames:v","1","../../spikes/argon-towers-v2/icon.png"],{encoding:"utf8"});
console.log(e.status===0 ? "icon ok" : e.stderr.slice(-500));

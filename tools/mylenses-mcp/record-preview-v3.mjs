import { chromium } from "playwright";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";

const dir = "../../spikes/argon-towers-v2/dist";
const outPath = "../../spikes/argon-towers-v2/preview-v3.mp4";
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp", ".mp3":"audio/mpeg", ".wav":"audio/wav", ".json":"application/json" };
const srv = createServer((req,res)=>{
  const url = decodeURIComponent(req.url.split("?")[0]);
  const p = join(dir, url.replace(/^\/+/,"")||"index.html");
  const f = existsSync(p)&&statSync(p).isFile()?p:join(dir,"index.html");
  res.setHeader("Content-Type", MIME[extname(f)]??"application/octet-stream");
  createReadStream(f).pipe(res);
});
await new Promise(r=>srv.listen(0,r));

const vidDir = join("shots", `rec-v3-${Date.now()}`);
const b = await chromium.launch();
// 375x667 @ dpr2 = exact 9:16 mobile portrait (750x1334 -> 720x1280 with zero distortion)
const c = await b.newContext({
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  recordVideo: { dir: vidDir, size: { width: 720, height: 1280 } },
  hasTouch: true,
  isMobile: true,
});
const p = await c.newPage();
const errs = [];
p.on("pageerror", e => errs.push(e.message));
await p.goto(`http://localhost:${srv.address().port}/`, { waitUntil: "load" });
await p.waitForTimeout(2000);

const ui = await p.evaluate(() => {
  const center = el => { const r = el.getBoundingClientRect(); return [Math.round(r.x + r.width/2), Math.round(r.y + r.height/2)]; };
  return {
    gatling: center(document.getElementById("fr-tower-btn-gatling")),
    goo:     center(document.getElementById("fr-tower-btn-goo")),
    wave:    center(document.getElementById("fr-hud-btn-wave")),
    speed:   center(document.getElementById("fr-hud-btn-speed")),
  };
});
console.log("UI coords:", JSON.stringify(ui));

// Place 3 towers in a clean tactical funnel around the center lane
await p.touchscreen.tap(...ui.gatling); await p.waitForTimeout(350);
await p.touchscreen.tap(125, 310);      await p.waitForTimeout(450);

await p.touchscreen.tap(...ui.goo);     await p.waitForTimeout(350);
await p.touchscreen.tap(190, 355);      await p.waitForTimeout(450);

await p.touchscreen.tap(...ui.gatling); await p.waitForTimeout(350);
await p.touchscreen.tap(255, 310);      await p.waitForTimeout(450);

// 2x speed + launch Wave 1
await p.touchscreen.tap(...ui.speed);   await p.waitForTimeout(250);
await p.touchscreen.tap(...ui.wave);    await p.waitForTimeout(5800);
await p.screenshot({ path: "shots/preview-v3-midframe.png" });

await c.close();
await b.close();
srv.close();

const webm = readdirSync(vidDir).find(f => f.endsWith(".webm"));
const enc = spawnSync("ffmpeg", [
  "-y", "-i", join(vidDir, webm),
  "-ss", "1.2", "-t", "9.5",
  "-vf", "scale=720:1280,fps=30",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-an", outPath
], { encoding: "utf8" });
console.log("encode status:", enc.status, "errors:", errs);

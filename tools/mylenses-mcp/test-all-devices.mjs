import { chromium } from "playwright";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";

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
const port = srv.address().port;

// Read native PNG dimensions for all 13 devices
const allDevs = readdirSync(OVERLAYS).filter(d => existsSync(join(OVERLAYS, d, "live.png")));
const b = await chromium.launch();
const probe = await (await b.newContext()).newPage();
const specs = [];
for (const dev of allDevs) {
  const b64 = readFileSync(join(OVERLAYS, dev, "live.png")).toString("base64");
  const { W, H } = await probe.evaluate(async s => {
    const i = new Image(); i.src = "data:image/png;base64," + s; await i.decode();
    return { W: i.width, H: i.height };
  }, b64);
  // Normalize CSS width to realistic mobile CSS width (~390px) preserving exact PNG aspect ratio
  const cssW = 393;
  const cssH = Math.round(393 * H / W);
  const slug = dev.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  specs.push({ dev, W, H, cssW, cssH, slug });
}
await probe.context().close();

for (const s of specs) {
  const c = await b.newContext({ viewport: { width: s.cssW, height: s.cssH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await c.newPage();
  await p.goto(`http://localhost:${port}/`, { waitUntil: "load" });
  await p.waitForTimeout(2600);
  await p.evaluate((d) => {
    const img = document.createElement("img"); img.id = "snap-chrome";
    img.src = `/__snapchrome__/${encodeURIComponent(d)}/live.png`;
    img.style.cssText = "position:fixed;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:2147483647";
    document.body.appendChild(img);
  }, s.dev);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `shots/dev-${s.slug}.png` });
  await c.close();
  console.log("captured:", s.dev.padEnd(20), `native=${s.W}x${s.H}`, `css=${s.cssW}x${s.cssH}`);
}
await b.close();
srv.close();

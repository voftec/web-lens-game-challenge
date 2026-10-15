import { chromium } from "playwright";
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 720, height: 1280 },
  recordVideo: { dir: "../../spikes/argon-towers-v2/video", size: { width: 720, height: 1280 } },
  hasTouch: true, isMobile: true,
});
const page = await ctx.newPage();
page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
await page.goto("http://localhost:8931/", { waitUntil: "load" });
await new Promise(r => setTimeout(r, 4000));
// first tap — the one that crashed before
await page.touchscreen.tap(360, 640);
await new Promise(r => setTimeout(r, 1500));
// try to place a tower: tap dock then grid (heuristic taps)
await page.touchscreen.tap(360, 1150).catch(()=>{});
await new Promise(r => setTimeout(r, 800));
await page.touchscreen.tap(360, 600).catch(()=>{});
await new Promise(r => setTimeout(r, 1200));
// tap start wave area
await page.touchscreen.tap(360, 1180).catch(()=>{});
await new Promise(r => setTimeout(r, 6000));
await page.screenshot({ path: "../../spikes/argon-towers-v2/midgame-v2.png" });
console.log("ERRORS:", errors.length ? errors.slice(0,10).join("\n") : "none");
const vp = await ctx.close(); // closing saves video
await browser.close();
console.log("video saved");

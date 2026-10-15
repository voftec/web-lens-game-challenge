import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { readdirSync, existsSync, statSync, createReadStream } from "node:fs";
import { createServer } from "node:http";
import { join, extname } from "node:path";
const DIR = "../../spikes/argon-towers-v2/dist";
const MIME = {".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".bin":"application/octet-stream",".data":"application/octet-stream"};
const srv = createServer((req,res)=>{const p=join(DIR,decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html");const f=existsSync(p)&&statSync(p).isFile()?p:join(DIR,"index.html");res.setHeader("Content-Type",MIME[extname(f)]??"application/octet-stream");createReadStream(f).pipe(res);});
await new Promise(r=>srv.listen(8473,r));
const errors=[];
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport:{width:720,height:1280},recordVideo:{dir:"shots/game-demo",size:{width:720,height:1280}},hasTouch:true,isMobile:true});
const page = await ctx.newPage();
page.on("pageerror",e=>errors.push(e.message));
await page.goto("http://localhost:8473/",{waitUntil:"load"});
await page.waitForTimeout(5000);
const tap = async(x,y,d=700)=>{await page.touchscreen.tap(x,y).catch(()=>{});await page.waitForTimeout(d);};
// place 2 towers: tap tower btn then a grid cell
await tap(500,1240); await tap(360,700);   // $10 tower mid map
await tap(584,1240); await tap(450,550);   // $20 tower
await tap(416,1240); await tap(280,850);   // $5 tower
await page.screenshot({path:"shots/game-demo/placed.png"});
// start wave
await tap(328,1242,500);
// let the action run ~12s
await page.waitForTimeout(12000);
await page.screenshot({path:"shots/game-demo/action.png"});
await ctx.close(); await browser.close(); srv.close();
const webm = readdirSync("shots/game-demo").find(f=>f.endsWith(".webm"));
spawnSync("ffmpeg",["-y","-i",`shots/game-demo/${webm}`,"-ss","4","-t","10","-vf","scale=720:1280,fps=30","-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart","-c:a","aac","-shortest","../../spikes/argon-towers-v2/preview-real.mp4"]);
console.log("errors:",errors.length?errors:"none");
console.log("preview: spikes/argon-towers-v2/preview-real.mp4");

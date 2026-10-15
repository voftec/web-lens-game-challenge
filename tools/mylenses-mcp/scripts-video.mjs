import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Web Lenses");
await page.waitForSelector("text=Submit a new Web Lens");
await page.click("text=Accept Cookies").catch(()=>{});
await page.evaluate(() => document.querySelector('[data-testid="web-lens-folder-continue"]').click());
await page.waitForSelector('[data-testid="web-lens-submit"]');
// click the preview control and inspect dialog/file input
await page.click("text=Change Lens Preview").catch(()=>{});
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: "shots/preview-picker.png" });
const inputs = await page.evaluate(() => Array.from(document.querySelectorAll("input[type=file]")).map(i => ({accept:i.accept, name:i.name, testid:i.getAttribute("data-testid")})));
console.log("INPUTS:", JSON.stringify(inputs));
// find the video input by accept attr
const vidInput = page.locator('input[type=file][accept*="video"], input[type=file][accept*="mp4"]').first();
if (await vidInput.count()) {
  await vidInput.setInputFiles("../../spike/test-assets/preview.mp4");
  console.log("video set");
} else {
  await page.locator("input[type=file]").nth(2).setInputFiles("../../spike/test-assets/preview.mp4").catch(e=>console.log("nth2 fail", e.message.split("\n")[0]));
}
for (let i=0;i<8;i++){ await new Promise(r=>setTimeout(r,3000)); const t = await page.evaluate(()=>{const el=[...document.querySelectorAll("*")].find(e=>/video preview attached/i.test(e.innerText||"")); return el?el.innerText.slice(0,300):"";}); if(/Ready|attached/i.test(t)&&!/needs attention/i.test(t)){console.log("OK:",t.slice(0,150));break;} console.log(`t=${(i+1)*3}s`, t.split("\n").slice(0,4).join(" | ")); }
await page.screenshot({ path: "shots/video-state.png", fullPage: true });
await ctx.close();

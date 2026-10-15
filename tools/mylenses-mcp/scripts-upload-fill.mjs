import { chromium } from "playwright";
const ZIP = "../../spikes/argon-towers-lens-v1.zip";
const ICON = "../../spike/test-assets/icon.png";
const VID = "../../spike/test-assets/preview.mp4";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Web Lenses");
await page.waitForSelector("text=Submit a new Web Lens");
await page.click("text=Accept Cookies").catch(()=>{});
await page.evaluate(() => document.querySelector('[data-testid="web-lens-folder-continue"]').click());
await page.waitForSelector('[data-testid="web-lens-submit"]', { timeout: 20000 });
// close feedback widget if open
await page.evaluate(() => { for (const b of document.querySelectorAll("button")) if (b.innerText.trim()==="Close") b.click(); });
// package zip = first file input
const files = page.locator("input[type=file]");
console.log("file inputs:", await files.count());
await files.nth(0).setInputFiles(ZIP);
await new Promise(r => setTimeout(r, 8000));
// lens name
const nameInput = page.locator("input[type=text]").first();
await nameInput.fill("Argon Towers Test");
// icon = second file input
await files.nth(1).setInputFiles(ICON).catch(e => console.log("icon fail:", e.message.split("\n")[0]));
await new Promise(r => setTimeout(r, 3000));
// video preview — try clicking Add/Change Lens Preview
await page.click("text=Add Snapchat Lens Preview").catch(()=>{});
await page.click("text=Change Lens Preview").catch(()=>{});
await new Promise(r => setTimeout(r, 2000));
const files2 = page.locator("input[type=file]");
console.log("file inputs now:", await files2.count());
if (await files2.count() >= 3) await files2.nth(2).setInputFiles(VID).catch(e => console.log("vid fail:", e.message.split("\n")[0]));
await new Promise(r => setTimeout(r, 8000));
const txt = await page.evaluate(() => document.body.innerText.trim().slice(0, 2500));
console.log("TEXT:\n" + txt);
await page.screenshot({ path: "shots/filled-form.png", fullPage: true });
await ctx.close();

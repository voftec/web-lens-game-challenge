import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
await page.goto("https://my-lenses.snapchat.com/6c3789de-28c4-4c02-bdad-567177a1d02d/lens-folders/2d6573be-00c3-47e8-a6ef-f6a0056cffc8/lenses/7b660349-db32-4377-97ec-cdf7de42c9cb", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 8000));
console.log("URL:", page.url());
console.log((await page.evaluate(() => document.body.innerText.trim().slice(0,1200))));
await page.screenshot({ path: "shots/lens-page.png", fullPage: true });
// also list web lenses page
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Web Lenses").catch(()=>{});
await new Promise(r => setTimeout(r, 5000));
console.log("\n--- WEB LENSES PAGE ---");
console.log((await page.evaluate(() => document.body.innerText.trim().slice(0,1500))));
await page.screenshot({ path: "shots/weblenses-list.png", fullPage: true });
await ctx.close();

import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Lens Folders");
await new Promise(r => setTimeout(r, 5000));
console.log("URL:", page.url());
console.log((await page.evaluate(() => document.body.innerText.trim().slice(0,2000))));
await page.screenshot({ path: "shots/folders.png", fullPage: true });
// click AR 2025 folder if present
await page.click("text=AR 2025").catch(e=>console.log("no AR 2025 link"));
await new Promise(r => setTimeout(r, 5000));
console.log("URL2:", page.url());
console.log((await page.evaluate(() => document.body.innerText.trim().slice(0,2000))));
await page.screenshot({ path: "shots/folder-inside.png", fullPage: true });
await ctx.close();

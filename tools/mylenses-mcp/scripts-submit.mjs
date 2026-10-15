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
await page.evaluate(() => { for (const b of document.querySelectorAll("button")) if (b.innerText.trim()==="Close") b.click(); });
// package
await page.locator('input[type=file][accept=".zip"]').setInputFiles("../../spikes/argon-towers-lens-v1.zip");
await page.waitForSelector("text=argon-towers-lens-v1.zip", { timeout: 60000 }).catch(()=>console.log("zip name not shown"));
// name
await page.locator("input[type=text]").first().fill("Argon Towers Test");
// icon
await page.locator('input[type=file][accept="image/png"]').setInputFiles("../../spike/test-assets/icon.png");
await new Promise(r => setTimeout(r, 2000));
// video
await page.click("text=Change Lens Preview");
await new Promise(r => setTimeout(r, 1500));
await page.locator('input[type=file][accept*="video"]').setInputFiles("../../spike/test-assets/preview.mp4");
// wait for Apply to be enabled and click
await page.waitForSelector('button:has-text("Apply")', { timeout: 60000 });
await new Promise(r => setTimeout(r, 3000));
await page.click('button:has-text("Apply")');
await new Promise(r => setTimeout(r, 5000));
const status = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("*")].filter(e => /Ready|Needs attention/i.test(e.innerText||"") && e.children.length===0);
  return document.body.innerText.match(/Ready to submit[\s\S]{0,1500}/)?.[0] || "not found";
});
console.log(status);
await page.screenshot({ path: "shots/pre-submit.png", fullPage: true });
// Submit
await page.evaluate(() => document.querySelector('[data-testid="web-lens-submit"]').click());
await new Promise(r => setTimeout(r, 8000));
console.log("URL:", page.url());
console.log((await page.evaluate(() => document.body.innerText.trim().slice(0,1500))));
await page.screenshot({ path: "shots/post-submit.png", fullPage: true });
await ctx.close();

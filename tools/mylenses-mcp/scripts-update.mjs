import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Web Lenses");
await page.waitForSelector("text=Update an existing Lens");
await page.click("text=Accept Cookies").catch(()=>{});
// pick "Update an existing Lens" radio
const radios = page.locator("input[type=radio]");
const n = await radios.count();
for (let i=0;i<n;i++){
  const lbl = await radios.nth(i).evaluate(r => (r.closest("label")?.innerText || r.parentElement?.innerText || "").trim());
  console.log("radio", i, lbl.slice(0,60));
}
await radios.nth(1).check().catch(()=>radios.nth(1).click());
await new Promise(r => setTimeout(r, 2000));
const txt = await page.evaluate(() => document.body.innerText.trim().slice(0,2000));
console.log("TEXT:\n" + txt);
await page.screenshot({ path: "shots/update-picker.png", fullPage: true });
await ctx.close();

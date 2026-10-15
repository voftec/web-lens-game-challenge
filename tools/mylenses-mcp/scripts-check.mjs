import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" }).catch(()=>{});
for (let i = 0; i < 10; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const txt = await page.evaluate(() => document.body.innerText.trim());
  console.log(`t=${(i+1)*3}s URL=${page.url()} len=${txt.length}`);
  if (txt.length > 20) { console.log("TEXT:\n" + txt.slice(0, 2000)); break; }
}
await page.screenshot({ path: "shots/dashboard.png", fullPage: true });
await ctx.close();

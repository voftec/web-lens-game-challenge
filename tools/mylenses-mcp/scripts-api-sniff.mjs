import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
const calls = [];
page.on("response", async (r) => {
  const u = r.url();
  if (/error|log|lens|status|submission/i.test(u) && !/\.(png|jpg|css|woff|js)(\?|$)/.test(u)) {
    let body = "";
    try { body = (await r.text()).slice(0, 4000); } catch {}
    calls.push({ u, s: r.status(), body });
  }
});
await page.goto("https://my-lenses.snapchat.com/6c3789de-28c4-4c02-bdad-567177a1d02d/lens-folders/2d6573be-00c3-47e8-a6ef-f6a0056cffc8/lenses/7b660349-db32-4377-97ec-cdf7de42c9cb", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 8000));
await page.click("text=Error Logs").catch(()=>{});
await new Promise(r => setTimeout(r, 3000));
await page.click("text=View Details").catch(()=>{});
await new Promise(r => setTimeout(r, 3000));
await page.click("text=See more").catch(()=>{});
await new Promise(r => setTimeout(r, 3000));
for (const c of calls) console.log("\n==>", c.s, c.u, "\n", c.body.slice(0,1500));
await page.screenshot({ path: "shots/details.png", fullPage: true });
await ctx.close();

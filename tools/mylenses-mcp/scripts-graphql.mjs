import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
page.on("response", async (r) => {
  if (!r.url().endsWith("/graphql")) return;
  try {
    const req = r.request().postData() || "";
    const op = req.match(/"operationName"\s*:\s*"([^"]+)"/)?.[1] || req.slice(0,80);
    const body = await r.text();
    if (/error|Error|submission|lens/i.test(body)) {
      console.log("=== OP:", op, "\nREQ:", req.slice(0,300), "\nRES:", body.slice(0,2500), "\n");
    }
  } catch {}
});
await page.goto("https://my-lenses.snapchat.com/6c3789de-28c4-4c02-bdad-567177a1d02d/lens-folders/2d6573be-00c3-47e8-a6ef-f6a0056cffc8/lenses/7b660349-db32-4377-97ec-cdf7de42c9cb", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 9000));
await page.click("text=Error Logs").catch(()=>{});
await new Promise(r => setTimeout(r, 4000));
await page.click("text=See more").catch(()=>{});
await new Promise(r => setTimeout(r, 4000));
await ctx.close();

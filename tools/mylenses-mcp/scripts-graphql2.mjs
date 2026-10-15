import { chromium } from "playwright";
import fs from "node:fs";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
const out = [];
page.on("response", async (r) => {
  if (!r.url().endsWith("/graphql")) return;
  try {
    const req = r.request().postData() || "";
    const op = req.match(/"operationName"\s*:\s*"([^"]+)"/)?.[1] || "?";
    const body = await r.text();
    out.push({ op, req: req.slice(0, 800), res: body.slice(0, 8000) });
  } catch {}
});
await page.goto("https://my-lenses.snapchat.com/6c3789de-28c4-4c02-bdad-567177a1d02d/lens-folders/2d6573be-00c3-47e8-a6ef-f6a0056cffc8/lenses/7b660349-db32-4377-97ec-cdf7de42c9cb", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 9000));
await page.click("text=Error Logs").catch(()=>{});
await new Promise(r => setTimeout(r, 4000));
await page.click("text=See more").catch(()=>{});
await new Promise(r => setTimeout(r, 4000));
fs.writeFileSync("shots/graphql-dump.json", JSON.stringify(out, null, 1));
console.log("ops:", out.map(o=>o.op).join(", "));
await ctx.close();

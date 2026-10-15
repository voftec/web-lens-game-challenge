import { chromium } from "playwright";
import fs from "node:fs";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
const hits = [];
page.on("response", async (r) => {
  try {
    const ct = r.headers()["content-type"] || "";
    if (!/json|text|graphql/.test(ct)) return;
    const body = await r.text();
    if (/Runtime|errorReasons|rejected|submissionError|errorLogs|CRITICAL/i.test(body)) {
      hits.push({ url: r.url(), req: (r.request().postData()||"").slice(0,500), body: body.slice(0,5000) });
    }
  } catch {}
});
await page.goto("https://my-lenses.snapchat.com/6c3789de-28c4-4c02-bdad-567177a1d02d/lens-folders/2d6573be-00c3-47e8-a6ef-f6a0056cffc8/lenses/7b660349-db32-4377-97ec-cdf7de42c9cb", { waitUntil: "networkidle" });
await new Promise(r => setTimeout(r, 5000));
await page.click("text=Error Logs").catch(()=>{});
await new Promise(r => setTimeout(r, 4000));
await page.click("text=View Details").catch(()=>{});
await new Promise(r => setTimeout(r, 4000));
await page.click("text=See more").catch(()=>{});
await new Promise(r => setTimeout(r, 4000));
fs.writeFileSync("shots/error-hits.json", JSON.stringify(hits, null, 1));
console.log("hits:", hits.length, hits.map(h=>h.url).join("\n"));
await ctx.close();

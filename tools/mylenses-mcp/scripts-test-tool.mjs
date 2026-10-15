import { chromium } from "playwright";
import { join } from "node:path";
const HERE = ".";
const page = await (async () => {
  const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true, viewport: {width:1280,height:900} });
  return ctx.pages()[0] ?? await ctx.newPage();
})();
const pageCtx = page.context();
const lensName = "Argon Towers Test", folderName = "AR 2025";
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome", { timeout: 30000 });
await page.click("text=Lens Folders");
await page.waitForTimeout(4000);
await page.click(`text=${folderName}`).catch(() => {});
await page.waitForTimeout(4000);
await page.click(`text=${lensName}`);
await page.waitForTimeout(5000);
const base = await page.evaluate(() => ({
  url: location.href,
  lensId: document.body.innerText.match(/Lens ID:\s*([0-9a-f-]+)/i)?.[1] ?? null,
  status: document.body.innerText.match(/\n(Processing|Published|Invalid|Live|Rejected)\n/)?.[1] ?? null,
  banner: document.body.innerText.match(/This Lens submission was[^.]+\./)?.[0] ?? null,
}));
for (const sel of ["text=Error Logs", "text=See more", "text=View Details"]) {
  await page.click(sel).catch(() => {});
  await page.waitForTimeout(2500);
}
const errors = await page.evaluate(() => {
  const mods = [...document.querySelectorAll(".ant-modal, [class*=modal], [role=dialog]")]
    .map(m => m.innerText.trim()).filter(Boolean);
  return { modalText: mods.join("\n---\n") };
});
console.log(JSON.stringify({...base, errors}, null, 2));
await pageCtx.close();

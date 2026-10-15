import { chromium } from "playwright";
import { spawnSync } from "node:child_process";

for (let i = 0; i < 60; i++) {
  const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
  const page = ctx.pages()[0] ?? await ctx.newPage();
  let ready = false;
  try {
    await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("text=Welcome", { timeout: 25000 });
    await page.click("text=Web Lenses");
    await page.waitForSelector("text=Update an existing Lens", { timeout: 20000 });
    await page.locator("input[type=radio]").nth(1).click();
    await page.waitForTimeout(1500);
    await page.locator("input[role=combobox]").first().click();
    await page.locator(".ant-select-item-option-content", { hasText: "AR 2025" }).first().click();
    await page.waitForTimeout(2500);
    ready = (await page.locator("text=Argon Towers Test").count()) > 0;
  } catch {}
  await ctx.close();
  if (ready) {
    console.log("Review completed! Uploading latest v3 package now...");
    const r = spawnSync("node", ["scripts-update-final.mjs"], { stdio: "inherit" });
    process.exit(r.status ?? 0);
  }
  console.log(`[${new Date().toLocaleTimeString()}] Still In Review — retrying in 60s...`);
  await new Promise(r => setTimeout(r, 60000));
}

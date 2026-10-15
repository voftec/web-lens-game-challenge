import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Web Lenses");
await page.waitForSelector("text=Update an existing Lens");
await page.click("text=Accept Cookies").catch(()=>{});
await page.locator("input[type=radio]").nth(1).click();
await page.waitForTimeout(1500);
await page.locator("input[role=combobox]").first().click();
await page.locator(".ant-select-item-option-content", { hasText: "AR 2025" }).first().click();
await page.waitForSelector("text=Argon Towers Test");
await page.click("text=Argon Towers Test");
await page.waitForSelector("text=Updating Argon Towers Test");
await page.locator('input[type=file][accept=".zip"]').setInputFiles("../../spikes/argon-towers-lens-v3.zip");
await page.waitForSelector("text=argon-towers-lens-v3.zip", { timeout: 120000 });
await page.waitForTimeout(4000);
const iconInput = page.locator('input[type=file][accept="image/png"]');
if (await iconInput.count()) {
  await iconInput.first().setInputFiles("../../spikes/argon-towers-v2/icon.png").catch(()=>{});
  await page.waitForTimeout(1500);
}
await page.click("text=Change Lens Preview").catch(()=>{});
await page.waitForTimeout(1500);
const vid = page.locator('input[type=file][accept*="video"]');
if (await vid.count()) {
  await vid.first().setInputFiles("../../spikes/argon-towers-v2/preview-v3.mp4");
  await page.waitForSelector('button:has-text("Apply")', { timeout: 60000 }).catch(()=>{});
  await page.waitForTimeout(2500);
  await page.click('button:has-text("Apply")').catch(()=>{});
}
await page.waitForTimeout(3000);
await page.evaluate(() => { [...document.querySelectorAll("button")].find(b=>/^Update$/.test(b.innerText.trim()))?.click(); });
await page.waitForTimeout(2500);
await page.screenshot({ path: "shots/up-modal.png" });
// confirmation modal?
const modal = await page.evaluate(()=>document.body.innerText.match(/(Publishing|Update|Submit|Confirm)[\s\S]{0,400}/)?.[0]||"");
console.log("MODAL?", modal.replace(/\n/g," | "));
await page.evaluate(() => { const b=[...document.querySelectorAll("button")].filter(b=>/^(submit|publish|confirm|update)$/i.test(b.innerText.trim())); b[b.length-1]?.click(); });
await page.waitForTimeout(12000);
await page.screenshot({ path: "shots/up-done.png", fullPage: true });
console.log("URL:", page.url());
console.log("RESULT:", (await page.evaluate(()=>document.body.innerText.trim().slice(0,1200))).replace(/\n/g," | "));
await ctx.close();

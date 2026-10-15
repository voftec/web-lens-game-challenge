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
await page.locator('input[type=file][accept=".zip"]').setInputFiles("../../spikes/argon-towers-lens-v1.zip");
await page.waitForSelector("text=argon-towers-lens-v1.zip", { timeout: 60000 });
await page.locator("input[type=text]").first().fill("Argon Towers Test");
await page.locator('input[type=file][accept="image/png"]').setInputFiles("../../spike/test-assets/icon.png");
await new Promise(r => setTimeout(r, 2000));
await page.click("text=Change Lens Preview");
await new Promise(r => setTimeout(r, 1500));
await page.locator('input[type=file][accept*="video"]').setInputFiles("../../spike/test-assets/preview.mp4");
await page.waitForSelector('button:has-text("Apply")', { timeout: 60000 });
await new Promise(r => setTimeout(r, 3000));
await page.click('button:has-text("Apply")');
await new Promise(r => setTimeout(r, 5000));
await page.evaluate(() => document.querySelector('[data-testid="web-lens-submit"]').click());
await page.waitForSelector("text=Publishing Lens", { timeout: 30000 });
// select Hidden visibility
await page.click("text=Hidden").catch(e => console.log("hidden click:", e.message.split("\n")[0]));
await new Promise(r => setTimeout(r, 1000));
// dump modal buttons
const btns = await page.evaluate(() => Array.from(document.querySelectorAll(".ant-modal button, [class*=modal] button, button")).map(b => b.innerText.trim()).filter(Boolean));
console.log("BUTTONS:", JSON.stringify(btns));
await page.screenshot({ path: "shots/confirm-modal.png", fullPage: true });
// click the modal's confirm (Publish/Submit) — last black button
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")].filter(b => /^(publish|submit|confirm)$/i.test(b.innerText.trim()));
  console.log(btns.map(b=>b.innerText).join(","));
  btns[btns.length-1]?.click();
});
await new Promise(r => setTimeout(r, 10000));
console.log("URL:", page.url());
const txt = await page.evaluate(() => document.body.innerText.trim().slice(0, 2000));
console.log("TEXT:\n" + txt);
await page.screenshot({ path: "shots/final.png", fullPage: true });
await ctx.close();

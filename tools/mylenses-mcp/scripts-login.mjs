import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", {
  headless: false, viewport: { width: 1280, height: 900 }, args: ["--start-maximized"],
});
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "networkidle" }).catch(()=>{});
console.log("window open, waiting for real login...");
let consecutive = 0;
const deadline = Date.now() + 10 * 60 * 1000;
while (Date.now() < deadline) {
  try {
    const url = page.url();
    const ok = url.startsWith("https://my-lenses.snapchat.com") && await page.evaluate(() =>
      !/iniciar sesión|sign in|log in|nombre de usuario|username or email/i.test(document.body.innerText));
    consecutive = ok ? consecutive + 1 : 0;
    if (consecutive >= 3) { console.log("LOGIN CONFIRMED:", url); break; }
  } catch {}
  await new Promise(r => setTimeout(r, 2000));
}
console.log("done:", page.url());
await new Promise(r => setTimeout(r, 3000));
await ctx.close();

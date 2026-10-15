import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
// navigate into folder > lens
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Lens Folders");
await new Promise(r => setTimeout(r, 4000));
await page.click("text=AR 2025");
await page.waitForSelector("text=Argon Towers Test");
await page.click("text=Argon Towers Test");
await new Promise(r => setTimeout(r, 5000));
console.log("URL:", page.url());
// find lens id + error logs link
const info = await page.evaluate(() => {
  const id = document.body.innerText.match(/Lens ID:\s*([0-9a-f-]+)/i)?.[1];
  const links = [...document.querySelectorAll("a")].map(a => ({t:a.innerText.trim(), href:a.href})).filter(l=>l.t);
  return { id, links };
});
console.log(JSON.stringify(info, null, 1));
await page.click("text=Error Logs").catch(e=>console.log("click err", e.message.split("\n")[0]));
await new Promise(r => setTimeout(r, 4000));
console.log("URL2:", page.url());
console.log((await page.evaluate(() => document.body.innerText.trim().slice(0,3000))));
await page.screenshot({ path: "shots/error-logs.png", fullPage: true });
await ctx.close();

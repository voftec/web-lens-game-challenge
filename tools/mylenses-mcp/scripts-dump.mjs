import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome", { timeout: 30000 });
// click "Web Lenses" nav
await page.click("text=Web Lenses").catch(e => console.log("click fail", e.message));
await new Promise(r => setTimeout(r, 5000));
console.log("URL:", page.url());
const txt = await page.evaluate(() => document.body.innerText.trim().slice(0, 2000));
console.log("TEXT:\n" + txt);
// list buttons/links/inputs
const els = await page.evaluate(() => Array.from(document.querySelectorAll("a,button,input,[role=button]")).map(e => `${e.tagName}[${e.getAttribute("type")||e.getAttribute("role")||""}] ${(e.innerText||e.getAttribute("aria-label")||"").slice(0,60)}`).filter(s => s.trim()).slice(0, 80));
console.log("ELS:\n" + els.join("\n"));
await page.screenshot({ path: "shots/weblenses.png", fullPage: true });
await ctx.close();

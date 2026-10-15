import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome", { timeout: 30000 });
await page.click("text=Web Lenses");
await page.waitForSelector("text=Submit a new Web Lens", { timeout: 20000 });
await page.click("text=Accept Cookies").catch(()=>{});
// see what that textarea is
const ta = await page.evaluate(() => { const t = document.querySelector("textarea"); const r = t?.getBoundingClientRect(); return t ? {rect:{x:r.x,y:r.y,w:r.width,h:r.height}, outer:t.outerHTML.slice(0,200), parentCls:t.closest("div")?.className?.slice(0,120)} : null; });
console.log("TEXTAREA:", JSON.stringify(ta));
// select a folder: check radio labels
const radioInfo = await page.evaluate(() => Array.from(document.querySelectorAll("input[type=radio]")).map(r => ({name:r.name, checked:r.checked, label:(r.closest("label")?.innerText||r.parentElement?.innerText||"").slice(0,80)})));
console.log("RADIOS:", JSON.stringify(radioInfo));
// click continue programmatically
await page.evaluate(() => document.querySelector('[data-testid="web-lens-folder-continue"]').click());
await new Promise(r => setTimeout(r, 5000));
console.log("URL:", page.url());
const txt = await page.evaluate(() => document.body.innerText.trim().slice(0, 2500));
console.log("TEXT:\n" + txt);
const els = await page.evaluate(() => Array.from(document.querySelectorAll("input,button,select,textarea")).map(e => `${e.tagName}[${e.getAttribute("type")||""}|${e.getAttribute("name")||""}|${e.getAttribute("data-testid")||""}] ${(e.innerText||e.getAttribute("placeholder")||"").slice(0,60)}`).filter(s=>s.trim()).slice(0,80));
console.log("ELS:\n" + els.join("\n"));
await page.screenshot({ path: "shots/submit-form.png", fullPage: true });
await ctx.close();

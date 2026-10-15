import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
const shot = (n) => page.screenshot({ path: `shots/upd-${n}.png`, fullPage: true });
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Web Lenses");
await page.waitForSelector("text=Update an existing Lens");
await page.click("text=Accept Cookies").catch(()=>{});
await page.locator("input[type=radio]").nth(1).click();
await new Promise(r => setTimeout(r, 1000));
// folder select dropdown (ant-select probably)
await page.click("text=Select a Lens Folder").catch(()=>{});
await new Promise(r => setTimeout(r, 1500));
await page.click(".ant-select-item:has-text('AR 2025'), li:has-text('AR 2025'), text='AR 2025'").catch(e=>console.log("folder pick:",e.message.split("\n")[0]));
await new Promise(r => setTimeout(r, 2000));
console.log("AFTER FOLDER:", (await page.evaluate(()=>document.body.innerText.trim().slice(0,1500))));
await shot("folder");
// maybe lens picker appears — pick Argon Towers Test
await page.click("text=Argon Towers Test").catch(e=>console.log("lens pick:",e.message.split("\n")[0]));
await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => document.querySelector('[data-testid="web-lens-folder-continue"]')?.click());
await new Promise(r => setTimeout(r, 4000));
console.log("URL:", page.url());
console.log("TEXT:", (await page.evaluate(()=>document.body.innerText.trim().slice(0,2000))));
await shot("form");
await ctx.close();

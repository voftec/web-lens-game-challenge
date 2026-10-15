import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
const ctx = await chromium.launchPersistentContext(".browser-profile", { headless: true });
const page = ctx.pages()[0] ?? await ctx.newPage();
page.setDefaultTimeout(30000);
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Welcome");
await page.click("text=Lens Folders");
await page.waitForTimeout(4000);
await page.click("text=AR 2025");
await page.waitForSelector("text=Argon Towers Test");
await page.click("text=Argon Towers Test");
await page.waitForTimeout(5000);
const lensId = await page.evaluate(() => document.body.innerText.match(/Lens ID:\s*([0-9a-f-]+)/i)?.[1]);
const status = await page.evaluate(() => document.body.innerText.match(/\n(Processing|Published|Invalid|Live|Rejected)\n/)?.[1]);
await page.click("text=Error Logs").catch(()=>{});
await page.waitForTimeout(2500);
await page.click("text=See more").catch(()=>{});
await page.waitForTimeout(1500);
const errors = await page.evaluate(() => [...new Set([...document.querySelectorAll(".ant-modal,[role=dialog]")].map(m=>m.innerText.trim()).filter(Boolean))].join("\n---\n"));
console.log("lensId:", lensId, "| status:", status);
console.log("errors:", errors.slice(0,400));
const subject = `Web Lens review — request for detailed error logs (Lens ID ${lensId})`;
const body = `Hi Snap team,

My Web Lens "Argon Towers Test" (Lens ID: ${lensId}) was rejected during automated testing with a "Critical Runtime Error". The My Lenses portal only shows the generic message below, so could you share the detailed logs (stack trace, device/webview info) and which specific behaviors are considered not allowed or unsupported, so I can fix and resubmit?

Errors visible in My Lenses:
${errors}

Thanks,
Diego Aguirre`;
spawnSync("open", [`mailto:lensstudio-support@snapchat.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`]);
console.log("draft opened in mail client");
await ctx.close();

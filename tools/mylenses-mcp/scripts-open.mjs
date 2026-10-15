import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".browser-profile", {
  headless: false, viewport: null, args: ["--start-maximized"],
});
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto("https://my-lenses.snapchat.com/home", { waitUntil: "domcontentloaded" });
console.log("open:", page.url());
ctx.on("close", () => { console.log("closed"); process.exit(0); });
await new Promise(() => {});

import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext(".gmail-profile", {
  headless: false, viewport: { width: 1280, height: 900 }, args: ["--start-maximized"],
});
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto("https://mail.google.com/mail/u/0/#inbox", { waitUntil: "domcontentloaded" });
console.log("Gmail open — log in with diego.usdz@gmail");
const deadline = Date.now() + 10 * 60 * 1000;
let ok = 0;
while (Date.now() < deadline) {
  const url = page.url();
  const good = url.includes("mail.google.com") && !/accounts\.google|signin|ServiceLogin/i.test(url)
    && await page.evaluate(() => /compose|redactar|inbox|recibidos/i.test(document.body.innerText)).catch(() => false);
  ok = good ? ok + 1 : 0;
  if (ok >= 3) { console.log("GMAIL LOGIN CONFIRMED:", url); break; }
  await new Promise(r => setTimeout(r, 2000));
}
console.log("final:", page.url());
await ctx.close();

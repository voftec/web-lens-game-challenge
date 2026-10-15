#!/usr/bin/env node
// mylenses-mcp — MCP server for Web Lens packaging + My Lenses automation.
// Credentials: none stored. `mylenses_login` opens a headed browser on a
// persistent profile dir (.browser-profile/, gitignored) where Diego logs in
// once; every other tool reuses that session headlessly.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createReadStream } from "node:fs";
import { extname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PROFILE_DIR = join(HERE, ".browser-profile");
const GMAIL_PROFILE_DIR = join(HERE, ".gmail-profile");
const MYLENSES = "https://my-lenses.snapchat.com";
const GMAIL = "https://mail.google.com";
// Diego's primary (Apple/iCloud) address — always CC'd on support mails so
// Snap replies land in his main inbox, not just the Gmail sender account.
const PRIMARY_EMAIL_CC = "diego.aguirre8@icloud.com";

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".wav": "audio/wav",
  ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff",
  ".woff2": "font/woff2", ".bin": "application/octet-stream",
  ".data": "application/octet-stream", ".glb": "model/gltf-binary",
};

function txt(s) { return { content: [{ type: "text", text: s }] }; }

// --- helpers ---------------------------------------------------------------

async function withPage(headless, fn, profileDir = PROFILE_DIR) {
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1280, height: 900 },
  });
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    return await fn(page);
  } finally {
    await ctx.close();
  }
}

async function pageSummary(page) {
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    buttons: [...document.querySelectorAll("button, [role=button], input[type=file]")]
      .map((el) => ({
        text: (el.innerText || el.getAttribute("aria-label") || el.id || "").trim().slice(0, 80),
        type: el.type || el.tagName.toLowerCase(),
        visible: !!el.offsetParent,
      }))
      .filter((b) => b.text || b.type === "file")
      .slice(0, 40),
    inputs: [...document.querySelectorAll("input:not([type=file]), textarea, select")]
      .map((el) => ({ name: el.name || el.placeholder || el.getAttribute("aria-label") || "", type: el.type || el.tagName }))
      .slice(0, 20),
    bodyText: document.body.innerText.slice(0, 3000),
  }));
  return data;
}

// --- server ----------------------------------------------------------------

const server = new McpServer({ name: "mylenses", version: "0.1.0" });

server.tool(
  "weblens_validate_zip",
  "Validate a Web Lens zip against Snap platform requirements: index.html at root and <=1MB, forward slashes, total <=8MB, no absolute paths in index.html, no external URLs, file-extension media types.",
  { zipPath: z.string().describe("Absolute path to the .zip file") },
  async ({ zipPath }) => {
    if (!existsSync(zipPath)) return txt(`ERROR: ${zipPath} does not exist`);
    const list = spawnSync("unzip", ["-l", zipPath], { encoding: "utf8" });
    if (list.status !== 0) return txt(`ERROR: unzip failed: ${list.stderr}`);
    const names = list.stdout.split("\n")
      .map((l) => l.trim())
      .filter((l) => /^\d+ /.test(l))
      .map((l) => l.replace(/^\d+\s+\S+\s+\S+\s+/, ""));
    const failures = [], notes = [];
    if (!names.includes("index.html")) failures.push("index.html is NOT at the zip root");
    if (names.some((n) => n.startsWith("dist/") || /^[a-zA-Z0-9_-]+\/index\.html$/.test(n)))
      failures.push("index.html appears inside a folder (zip the CONTENTS of dist/, not the folder)");
    const backslash = names.filter((n) => n.includes("\\"));
    if (backslash.length) failures.push(`backslash paths: ${backslash.slice(0, 5).join(", ")}`);
    const zipBytes = statSync(zipPath).size;
    if (zipBytes > 8 * 1024 * 1024) failures.push(`zip is ${(zipBytes / 1048576).toFixed(2)}MB > 8MB limit`);
    if (names.some((n) => n.startsWith("__snap/"))) failures.push("reserved /__snap/ path present");
    // index.html content checks
    const idx = spawnSync("unzip", ["-p", zipPath, "index.html"], { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 });
    if (idx.status === 0) {
      if (idx.stdout.length > 1024 * 1024) failures.push(`index.html is ${(idx.stdout.length / 1048576).toFixed(2)}MB > 1MB`);
      const abs = idx.stdout.match(/(?:src|href)="\/[^"]+"/g);
      if (abs) failures.push(`absolute paths in index.html: ${abs.slice(0, 5).join(", ")}`);
      const ext = idx.stdout.match(/(?:src|href)="https?:\/\/[^"]+"/g);
      if (ext) failures.push(`external URLs in index.html: ${ext.slice(0, 5).join(", ")}`);
      if (/<base[\s>]/i.test(idx.stdout)) failures.push("<base> element present (blocked)");
      if (/rel=["']manifest["']/i.test(idx.stdout)) failures.push("web app manifest present (blocked)");
      if (/<iframe/i.test(idx.stdout)) failures.push("<iframe> present (blocked)");
      if (!/viewport-fit=cover/.test(idx.stdout)) notes.push("viewport-fit=cover missing — safe-area insets will read 0");
    }
    const report = [
      failures.length ? "❌ FAIL" : "✅ PASS",
      `zip: ${basename(zipPath)} (${(zipBytes / 1048576).toFixed(2)}MB), ${names.length} entries`,
      ...failures.map((f) => `FAIL: ${f}`),
      ...notes.map((n) => `NOTE: ${n}`),
    ];
    return txt(report.join("\n"));
  }
);

let staticServer = null;
server.tool(
  "weblens_serve",
  "Serve a build directory locally for playtesting (mimics Web Lens static hosting). Returns the URL.",
  {
    dir: z.string().describe("Absolute path to the directory containing index.html"),
    port: z.number().default(8471),
  },
  async ({ dir, port }) => {
    if (!existsSync(join(dir, "index.html"))) return txt(`ERROR: no index.html in ${dir}`);
    if (staticServer) await new Promise((r) => staticServer.close(r));
    staticServer = createServer((req, res) => {
      const p = join(dir, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html");
      const file = existsSync(p) && statSync(p).isFile() ? p : join(dir, "index.html");
      res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
      createReadStream(file).pipe(res);
    });
    await new Promise((r) => staticServer.listen(port, r));
    return txt(`serving ${dir} at http://localhost:${port}/`);
  }
);

server.tool(
  "mylenses_login",
  "Open a headed browser on My Lenses so Diego can sign in once. The session persists in .browser-profile/ (no credentials stored in files). Call this before upload/status if not logged in.",
  {},
  async () => {
    return txt(
      await withPage(false, async (page) => {
        await page.goto(`${MYLENSES}/home`);
        // wait until user reaches an authenticated area (heuristic: URL leaves accounts.snapchat.com)
        const deadline = Date.now() + 5 * 60 * 1000;
        while (Date.now() < deadline) {
          const url = page.url();
          if (url.startsWith(MYLENSES) && !/sign|login|accounts/.test(url)) {
            return `Login detected at ${url}. Session persisted in ${PROFILE_DIR}.`;
          }
          await page.waitForTimeout(2000);
        }
        const s = await pageSummary(page);
        return `Timed out waiting for login. Current page: ${JSON.stringify(s, null, 2)}`;
      })
    );
  }
);

server.tool(
  "mylenses_list",
  "List Lenses in the My Lenses dashboard with their review status, using the stored session.",
  {},
  async () => {
    return txt(
      await withPage(true, async (page) => {
        await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
        const s = await pageSummary(page);
        if (/sign in|log in|iniciar/i.test(s.bodyText) || /accounts\.snapchat/.test(s.url))
          return `NOT LOGGED IN — run mylenses_login first.\n${s.url}`;
        return JSON.stringify(s, null, 2);
      })
    );
  }
);

// Navigates to Web Lenses > pick flow (new|update) > pick folder > Continue.
// Returns true when the submit form is on screen.
async function openSubmitFlow(page, { flow, folderName, lensName }) {
  await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Welcome", { timeout: 30000 });
  await page.click("text=Web Lenses");
  await page.waitForSelector("text=Submit a new Web Lens", { timeout: 20000 });
  await page.click("text=Accept Cookies").catch(() => {});
  const radios = page.locator("input[type=radio]");
  const idx = flow === "update" ? 1 : 0;
  await radios.nth(idx).check().catch(() => radios.nth(idx).click());
  await page.waitForTimeout(1000);
  if (folderName) await page.click(`text=${folderName}`).catch(() => {});
  if (lensName) { await page.waitForTimeout(2000); await page.click(`text=${lensName}`).catch(() => {}); }
  // a stray feedback textarea intercepts pointer events — click via JS
  await page.evaluate(() => document.querySelector('[data-testid="web-lens-folder-continue"]')?.click());
  await page.waitForSelector('[data-testid="web-lens-submit"]', { timeout: 30000 });
  return true;
}

// Fills the submit form. Optionally clicks Submit and confirms the modal.
async function fillAndSubmit(page, { zipPath, name, iconPath, videoPath, visibility, submitForReview }) {
  const log = [];
  await page.evaluate(() => { for (const b of document.querySelectorAll("button")) if (b.innerText.trim() === "Close") b.click(); });
  if (zipPath) {
    await page.locator('input[type=file][accept=".zip"]').setInputFiles(zipPath);
    await page.waitForSelector(`text=${basename(zipPath)}`, { timeout: 90000 });
    log.push(`zip uploaded: ${basename(zipPath)}`);
  }
  if (name) {
    await page.locator("input[type=text]").first().fill(name);
    log.push(`name: ${name}`);
  }
  if (iconPath) {
    await page.locator('input[type=file][accept="image/png"]').setInputFiles(iconPath);
    await page.waitForTimeout(3000);
    log.push("icon uploaded");
  }
  if (videoPath) {
    await page.click("text=Change Lens Preview").catch(() => page.click("text=Add Snapchat Lens Preview"));
    await page.waitForTimeout(1500);
    await page.locator('input[type=file][accept*="video"]').setInputFiles(videoPath);
    await page.waitForSelector('button:has-text("Apply")', { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(5000);
    log.push("preview video attached + applied");
  }
  const checklist = await page.evaluate(() =>
    document.body.innerText.match(/Ready to submit[\s\S]{0,1200}/)?.[0] ?? "checklist not found");
  if (!submitForReview) return { log, checklist, submitted: false };
  await page.evaluate(() => document.querySelector('[data-testid="web-lens-submit"]').click());
  await page.waitForSelector("text=Publishing Lens", { timeout: 30000 });
  if (visibility) await page.click(`text=${visibility}`).catch(() => {});
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter(b => /^(publish|submit|confirm)$/i.test(b.innerText.trim()));
    btns[btns.length - 1]?.click();
  });
  await page.waitForTimeout(10000);
  log.push(`submitted, visibility=${visibility ?? "default"}`);
  return { log, checklist, submitted: true, finalUrl: page.url() };
}

server.tool(
  "mylenses_upload",
  "Submit a NEW Web Lens to My Lenses: zip + name + icon + preview video into a Lens Folder, optional Game Lens visibility, then Submit or stop at the filled form. Uses the proven real selectors.",
  {
    zipPath: z.string(),
    name: z.string().max(18).describe("Lens name (18 chars max)"),
    folderName: z.string().describe("Lens Folder, e.g. 'AR 2025'"),
    iconPath: z.string().optional().describe("512x512 PNG"),
    videoPath: z.string().optional().describe("720x1280 5-10s mp4 H.264/AAC"),
    visibility: z.enum(["Public", "Hidden", "Offline"]).default("Hidden"),
    submitForReview: z.boolean().default(false).describe("If true, clicks through Submit + Publishing modal. GATE required."),
  },
  async (args) => {
    for (const p of [args.zipPath, args.iconPath, args.videoPath].filter(Boolean))
      if (!existsSync(p)) return txt(`ERROR: file not found: ${p}`);
    return txt(
      await withPage(true, async (page) => {
        await openSubmitFlow(page, { flow: "new", folderName: args.folderName });
        const res = await fillAndSubmit(page, args);
        return JSON.stringify(res, null, 2);
      })
    );
  }
);

server.tool(
  "mylenses_update",
  "Update an EXISTING Web Lens: new zip and/or new icon/video. Each update is a new version that goes through review again. submitForReview=true clicks through.",
  {
    lensName: z.string().describe("Existing lens name, e.g. 'Argon Towers Test'"),
    folderName: z.string().describe("Lens Folder the lens lives in"),
    zipPath: z.string().optional(),
    iconPath: z.string().optional(),
    videoPath: z.string().optional(),
    visibility: z.enum(["Public", "Hidden", "Offline"]).default("Hidden"),
    submitForReview: z.boolean().default(false),
  },
  async (args) => {
    for (const p of [args.zipPath, args.iconPath, args.videoPath].filter(Boolean))
      if (!existsSync(p)) return txt(`ERROR: file not found: ${p}`);
    return txt(
      await withPage(true, async (page) => {
        await openSubmitFlow(page, { flow: "update", folderName: args.folderName, lensName: args.lensName });
        const res = await fillAndSubmit(page, args);
        return JSON.stringify(res, null, 2);
      })
    );
  }
);

server.tool(
  "mylenses_status",
  "Get a Lens's review status (Processing/Published/Invalid) and Lens ID from its page in a Lens Folder.",
  {
    lensName: z.string(),
    folderName: z.string().optional(),
  },
  async ({ lensName, folderName }) => {
    return txt(
      await withPage(true, async (page) => {
        await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("text=Welcome", { timeout: 30000 });
        await page.click("text=Lens Folders");
        await page.waitForTimeout(4000);
        const folders = folderName ? [folderName] :
          await page.evaluate(() => [...document.querySelectorAll("a")]
            .map(a => a.innerText.trim())
            .filter(t => t && !/Home|Lens Folders|Insights|Monetization|Asset|Hosted|Web Lenses|Scheduler|Apps|Privacy|Terms|Cookie|Invite|Manage|Create/.test(t))
            .slice(0, 10));
        for (const f of folders) {
          await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
          await page.waitForSelector("text=Welcome", { timeout: 30000 });
          await page.click("text=Lens Folders");
          await page.waitForTimeout(3000);
          await page.click(`text=${f}`).catch(() => {});
          await page.waitForTimeout(4000);
          if (!(await page.locator(`text=${lensName}`).count())) continue;
          const row = await page.evaluate((n) => {
            const el = [...document.querySelectorAll("tr, li, [class*=row]")].find(r => r.innerText?.includes(n));
            return el?.innerText.replace(/\n/g, " | ").slice(0, 300) ?? null;
          }, lensName);
          await page.click(`text=${lensName}`);
          await page.waitForTimeout(5000);
          const detail = await page.evaluate(() => ({
            url: location.href,
            lensId: document.body.innerText.match(/Lens ID:\s*([0-9a-f-]+)/i)?.[1] ?? null,
            status: document.body.innerText.match(/\n(Processing|Published|Invalid|Live|Rejected)\n/)?.[1] ?? null,
            visibility: document.body.innerText.match(/\n(Public|Hidden|Offline)\n/)?.[1] ?? null,
          }));
          return JSON.stringify({ folder: f, row, detail }, null, 2);
        }
        return `Lens "${lensName}" not found in folders: ${folders.join(", ")}`;
      })
    );
  }
);

server.tool(
  "mylenses_dump_ui",
  "Debug tool: open My Lenses and dump the current page structure (buttons/inputs/text) so the agent can adapt upload automation when the UI changes.",
  {},
  async () => {
    return txt(await withPage(true, async (page) => {
      await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
      return JSON.stringify(await pageSummary(page), null, 2);
    }));
  }
);

// Scrapes a lens page: lensId, status, rejection banner, and all error modal text.
async function scrapeLensErrors(page, { lensName, folderName }) {
  await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Welcome", { timeout: 30000 });
  await page.click("text=Lens Folders");
  await page.waitForTimeout(4000);
  const folders = folderName ? [folderName] :
    await page.evaluate(() => [...document.querySelectorAll("a")]
      .map(a => a.innerText.trim())
      .filter(t => t && !/Home|Lens Folders|Insights|Monetization|Asset|Hosted|Web Lenses|Scheduler|Apps|Privacy|Terms|Cookie|Invite|Manage|Create/.test(t))
      .slice(0, 10));
  let found = false;
  for (const f of folders) {
    await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Welcome", { timeout: 30000 });
    await page.click("text=Lens Folders");
    await page.waitForTimeout(3000);
    await page.click(`text=${f}`).catch(() => {});
    await page.waitForTimeout(4000);
    if (await page.locator(`text=${lensName}`).count()) {
      await page.click(`text=${lensName}`);
      found = f;
      break;
    }
  }
  if (!found) return { error: `Lens "${lensName}" not found in folders: ${folders.join(", ")}` };
  await page.waitForTimeout(5000);
  const base = await page.evaluate(() => ({
    url: location.href,
    lensId: document.body.innerText.match(/Lens ID:\s*([0-9a-f-]+)/i)?.[1] ?? null,
    status: document.body.innerText.match(/\n(Processing|Published|Invalid|Live|Rejected)\n/)?.[1] ?? null,
    banner: document.body.innerText.match(/This Lens submission was[^.]+\./)?.[0] ?? null,
  }));
  for (const sel of ["text=Error Logs", "text=See more", "text=View Details"]) {
    await page.click(sel).catch(() => {});
    await page.waitForTimeout(2500);
  }
  const modalText = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll(".ant-modal, [class*=modal], [role=dialog]")]
      .map(m => m.innerText.trim()).filter(Boolean))].join("\n---\n"));
  return { folder: found, ...base, errors: modalText };
}

server.tool(
  "mylenses_error_report",
  "Fetch a Lens's review errors: navigates to its detail page in a Lens Folder, scrapes the Lens ID, status and every error shown in the Errors modal ('Error Logs'/'See more'). Returns the errors plus a ready-to-send support email draft (lensstudio-support@snapchat.com) including the Lens ID, asking for the detailed logs and which behaviors are disallowed.",
  {
    lensName: z.string().describe("Lens name as shown in the folder table, e.g. 'Argon Towers Test'"),
    folderName: z.string().optional().describe("Lens Folder name; if omitted, iterates all folders"),
  },
  async ({ lensName, folderName }) => {
    return txt(
      await withPage(true, async (page) => {
        const r = await scrapeLensErrors(page, { lensName, folderName });
        if (r.error) return r.error;
        const shot = join(HERE, "shots", `errors-${Date.now()}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        const draft = supportEmailDraft(lensName, r);
        return JSON.stringify({ ...r, screenshot: shot, supportEmailDraft: draft }, null, 2);
      })
    );
  }
);

function supportEmailDraft(lensName, r) {
  return [
    `Hi Snap team,`,
    ``,
    `My Web Lens "${lensName}" (Lens ID: ${r.lensId}) was rejected during`,
    `automated testing with a "Critical Runtime Error". The My Lenses portal only`,
    `shows the generic message, so could you share the detailed logs (stack trace,`,
    `device/webview info) and which specific behaviors are considered not allowed`,
    `or unsupported, so I can fix and resubmit?`,
    ``,
    `Errors visible in My Lenses:`,
    r.errors || "(none scraped)",
    ``,
    `Thanks,`,
    `Diego`,
  ].join("\n");
}

server.tool(
  "gmail_login",
  "Open a headed browser on Gmail so Diego can sign in once with diego.usdz@gmail. The session persists in .gmail-profile/ (gitignored). Required before gmail_send / auto error-report emails.",
  {},
  async () => {
    return txt(
      await withPage(false, async (page) => {
        await page.goto(`${GMAIL}/mail/u/0/#inbox`, { waitUntil: "domcontentloaded" }).catch(() => {});
        const deadline = Date.now() + 8 * 60 * 1000;
        while (Date.now() < deadline) {
          const url = page.url();
          const logged = url.includes("mail.google.com") && !/accounts\.google|signin|ServiceLogin/.test(url)
            && await page.evaluate(() => /inbox|recibidos|compose|redactar/i.test(document.body.innerText)).catch(() => false);
          if (logged) return `Gmail login OK at ${url}. Session persisted in ${GMAIL_PROFILE_DIR}.`;
          await page.waitForTimeout(2000);
        }
        return `Timed out waiting for Gmail login. Current: ${page.url()}`;
      }, GMAIL_PROFILE_DIR)
    );
  }
);

server.tool(
  "gmail_send",
  "Send an email through the persisted Gmail session (diego.usdz@gmail) via the compose window. Real side effect — only call with approved content.",
  {
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  },
  async ({ to, subject, body }) => {
    return txt(
      await withPage(false, async (page) => {
        await page.goto(`${GMAIL}/mail/u/0/#inbox`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(5000);
        if (/accounts\.google|signin/i.test(page.url())) return "NOT LOGGED IN — run gmail_login first.";
        // open compose via keyboard shortcut (most robust)
        await page.keyboard.press("c");
        await page.waitForSelector('div[role=dialog] input[aria-label], form[role=dialog], [role=dialog]', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
        // To field
        const toField = page.locator('[role=dialog] input[aria-label*="To"], [role=dialog] input[aria-label*="Para"], [role=dialog] textarea[name="to"], [role=dialog] input[name="to"]').first();
        if (await toField.count()) await toField.fill(to);
        else { await page.keyboard.type(to); await page.keyboard.press("Tab"); }
        // subject
        const subj = page.locator('[role=dialog] input[name="subjectbox"], [role=dialog] input[placeholder*="Subject"], [role=dialog] input[placeholder*="Asunto"]').first();
        if (await subj.count()) await subj.fill(subject); else await page.keyboard.type(subject);
        // body
        const bodyEl = page.locator('[role=dialog] div[role=textbox][aria-label], [role=dialog] div[contenteditable=true]').first();
        if (await bodyEl.count()) { await bodyEl.click(); await bodyEl.fill(body); }
        else await page.keyboard.type(body);
        // send
        const sendBtn = page.locator('[role=dialog] div[role=button][aria-label*="Send"], [role=dialog] div[role=button][aria-label*="Enviar"], [role=dialog] button:has-text("Send"), [role=dialog] div[data-tooltip*="Send"]').first();
        if (!(await sendBtn.count())) return `Compose filled but no Send button found. Page: ${await page.evaluate(() => document.body.innerText.slice(0, 800))}`;
        await sendBtn.click();
        await page.waitForTimeout(4000);
        return `Sent to ${to}: "${subject}"`;
      }, GMAIL_PROFILE_DIR)
    );
  }
);

server.tool(
  "mylenses_send_error_report",
  "Full loop: scrape a rejected Lens's errors + Lens ID, draft the support email, and SEND it from diego.usdz@gmail via the persisted Gmail session. Requires mylenses session + gmail_login done once.",
  {
    lensName: z.string(),
    folderName: z.string().optional(),
  },
  async ({ lensName, folderName }) => {
    const report = await withPage(true, async (page) => scrapeLensErrors(page, { lensName, folderName }));
    if (report.error) return txt(report.error);
    const subject = `Web Lens review — request for detailed error logs (Lens ID ${report.lensId})`;
    const body = supportEmailDraft(lensName, report);
    // Preferred: Gmail REST API via tools/gmail-sender (OAuth tokens, gitignored).
    const tokensPath = join(HERE, "..", "gmail-sender", ".gmail-tokens.json");
    if (existsSync(tokensPath)) {
      const tmp = join(HERE, "shots", `support-email-${Date.now()}.txt`);
      spawnSync("bash", ["-c", `cat > "$1"`, "_", tmp], { input: undefined }); // noop guard
      const { writeFileSync } = await import("node:fs");
      writeFileSync(tmp, body);
      const r = spawnSync("node", [join(HERE, "..", "gmail-sender", "send.mjs"),
        "--to", "lensstudio-support@snapchat.com", "--cc", PRIMARY_EMAIL_CC,
        "--subject", subject, "--body-file", tmp],
        { encoding: "utf8" });
      if (r.status === 0) return txt(JSON.stringify({ lens: report.lensId, email: r.stdout.trim(), via: "gmail-api" }, null, 2));
      return txt(`Gmail API send failed: ${r.stderr || r.stdout}`);
    }
    const sent = await withPage(false, async (page) => {
      await page.goto(`${GMAIL}/mail/u/0/#inbox`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(5000);
      if (/accounts\.google|signin/i.test(page.url())) {
        // Fallback: open prefilled draft in Diego's default mail client.
        const mailto = `mailto:lensstudio-support@snapchat.com?cc=${encodeURIComponent(PRIMARY_EMAIL_CC)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        spawnSync("open", [mailto]);
        return "NOT LOGGED IN to Gmail — opened a prefilled draft in your mail client instead (hit Send). For full automation run tools/gmail-sender/oauth.sh once.";
      }
      await page.keyboard.press("c");
      await page.waitForTimeout(3000);
      const toField = page.locator('[role=dialog] input[aria-label*="To"], [role=dialog] input[aria-label*="Para"], [role=dialog] input[name="to"], [role=dialog] textarea[name="to"]').first();
      if (await toField.count()) await toField.fill("lensstudio-support@snapchat.com");
      else await page.keyboard.type("lensstudio-support@snapchat.com");
      await page.waitForTimeout(800);
      const subj = page.locator('[role=dialog] input[name="subjectbox"], [role=dialog] input[placeholder*="Subject"], [role=dialog] input[placeholder*="Asunto"]').first();
      if (await subj.count()) await subj.fill(subject);
      const bodyEl = page.locator('[role=dialog] div[role=textbox][aria-label], [role=dialog] div[contenteditable=true]').first();
      if (await bodyEl.count()) { await bodyEl.click(); await page.keyboard.insertText(body); }
      const sendBtn = page.locator('[role=dialog] div[role=button][aria-label*="Send"], [role=dialog] div[role=button][aria-label*="Enviar"], [role=dialog] div[data-tooltip*="Send"]').first();
      if (!(await sendBtn.count())) return `No Send button — check compose manually. Draft body was: ${body.slice(0, 300)}`;
      await sendBtn.click();
      await page.waitForTimeout(4000);
      return "sent";
    });
    return txt(JSON.stringify({ lens: report.lensId, status: report.status, email: sent, subject }, null, 2));
  }
);

server.tool(
  "mylenses_list_folders",
  "List Lens Folders in My Lenses (folders are where Lenses live; needed before upload/error_report). Returns folder names.",
  {},
  async () => {
    return txt(
      await withPage(true, async (page) => {
        await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("text=Welcome", { timeout: 30000 });
        await page.click("text=Lens Folders");
        await page.waitForTimeout(4000);
        const folders = await page.evaluate(() =>
          [...document.querySelectorAll("a")]
            .map(a => a.innerText.trim())
            .filter(t => t && !/Home|Lens Folders|Insights|Monetization|Asset|Hosted|Web Lenses|Scheduler|Apps|Privacy|Terms|Cookie|Invite|Manage/.test(t)));
        return JSON.stringify({ url: page.url(), folders }, null, 2);
      })
    );
  }
);

server.tool(
  "mylenses_create_folder",
  "Create a new Lens Folder in My Lenses. Folders group Lenses; a folder must be selected in the Web Lens submit flow.",
  { folderName: z.string().describe("Name for the new Lens Folder") },
  async ({ folderName }) => {
    return txt(
      await withPage(true, async (page) => {
        await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("text=Welcome", { timeout: 30000 });
        await page.click("text=Lens Folders");
        await page.waitForSelector('[data-testid="lens-folders-header-create-button"]', { timeout: 20000 });
        await page.click('[data-testid="lens-folders-header-create-button"]');
        await page.waitForSelector('[data-testid="lens-folders-modal-create-button"]', { timeout: 10000 });
        await page.locator("input[type=text]").last().fill(folderName);
        await page.click('[data-testid="lens-folders-modal-create-button"]');
        await page.waitForTimeout(4000);
        const ok = await page.evaluate((f) => document.body.innerText.includes(f), folderName);
        return ok
          ? `Folder "${folderName}" created (visible at ${page.url()})`
          : `Create dialog submitted but folder not visible yet. Page text:\n${(await page.evaluate(() => document.body.innerText.slice(0, 1500)))}`;
      })
    );
  }
);

server.tool(
  "weblens_record_preview",
  "Record a REAL gameplay preview video: serves the build dir, plays it in a 720x1280 touch viewport with scripted taps for N seconds, then encodes to Snap spec (720x1280 H.264+AAC mp4, faststart, 30fps). Returns the mp4 path and any console/page errors seen during capture.",
  {
    dir: z.string().describe("Build dir containing index.html"),
    outPath: z.string().describe("Output .mp4 path"),
    seconds: z.number().default(8).describe("Recording length (Snap wants 5-10s)"),
    taps: z.string().optional().describe("Optional JSON array of taps, e.g. [[x,y,delayMs],...] to drive the gameplay. Default: a few center-ish taps."),
    warmupMs: z.number().default(4000).describe("Wait after load before recording interactions"),
  },
  async ({ dir, outPath, seconds, taps, warmupMs }) => {
    if (!existsSync(join(dir, "index.html"))) return txt(`ERROR: no index.html in ${dir}`);
    // serve the build
    if (staticServer) await new Promise((r) => staticServer.close(r));
    const port = 8471;
    staticServer = createServer((req, res) => {
      const p = join(dir, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html");
      const file = existsSync(p) && statSync(p).isFile() ? p : join(dir, "index.html");
      res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
      createReadStream(file).pipe(res);
    });
    await new Promise((r) => staticServer.listen(port, r));
    const vidDir = join(HERE, "shots", `rec-${Date.now()}`);
    const errors = [];
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 720, height: 1280 },
      recordVideo: { dir: vidDir, size: { width: 720, height: 1280 } },
      hasTouch: true, isMobile: true,
    });
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
    page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
    await page.goto(`http://localhost:${port}/`, { waitUntil: "load" });
    await page.waitForTimeout(warmupMs);
    const tapList = taps ? JSON.parse(taps) : [[360, 640, 800], [360, 640, 1500], [360, 1150, 800], [360, 600, 1000]];
    const tapBudget = Math.max(1000, seconds * 1000 - warmupMs);
    let spent = 0;
    while (spent < tapBudget) {
      for (const [x, y, d] of tapList) {
        if (spent >= tapBudget) break;
        await page.touchscreen.tap(x, y).catch(() => {});
        await page.waitForTimeout(d ?? 800);
        spent += (d ?? 800);
      }
    }
    await ctx.close();
    await browser.close();
    const { readdirSync } = await import("node:fs");
    const webm = readdirSync(vidDir).find(f => f.endsWith(".webm"));
    if (!webm) return txt("ERROR: no video captured");
    const enc = spawnSync("ffmpeg", ["-y", "-i", join(vidDir, webm),
      "-t", String(Math.min(seconds, 10)), "-vf", "scale=720:1280,fps=30",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-c:a", "aac", "-shortest", outPath], { encoding: "utf8" });
    if (enc.status !== 0) return txt(`ffmpeg failed: ${enc.stderr?.slice(-800)}`);
    return txt(JSON.stringify({
      preview: outPath, size: `${(statSync(outPath).size / 1048576).toFixed(2)}MB`,
      errors: errors.length ? errors : "none",
    }, null, 2));
  }
);

await server.connect(new StdioServerTransport());

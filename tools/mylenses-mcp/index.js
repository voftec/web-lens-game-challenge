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
const MYLENSES = "https://my-lenses.snapchat.com";

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

async function withPage(headless, fn) {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
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
        await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("text=Welcome", { timeout: 30000 });
        await page.click("text=Lens Folders");
        await page.waitForTimeout(4000);
        const folders = folderName ? [folderName] :
          await page.evaluate(() => [...document.querySelectorAll("a")]
            .map(a => a.innerText.trim())
            .filter(t => t && !/Home|Lens Folders|Insights|Monetization|Asset|Hosted|Web Lenses|Scheduler|Apps|Privacy|Terms|Cookie|Invite|Create/.test(t))
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
            found = true;
            break;
          }
        }
        if (!found) return `Lens "${lensName}" not found in folders: ${folders.join(", ")}`;
        await page.waitForTimeout(5000);
        const base = await page.evaluate(() => ({
          url: location.href,
          lensId: document.body.innerText.match(/Lens ID:\s*([0-9a-f-]+)/i)?.[1] ?? null,
          status: document.body.innerText.match(/\n(Processing|Published|Invalid|Live|Rejected)\n/)?.[1] ?? null,
          banner: document.body.innerText.match(/This Lens submission was[^.]+\./)?.[0] ?? null,
        }));
        // open every error affordance and collect text
        for (const sel of ["text=Error Logs", "text=See more", "text=View Details"]) {
          await page.click(sel).catch(() => {});
          await page.waitForTimeout(2500);
        }
        const errors = await page.evaluate(() => {
          const mods = [...document.querySelectorAll(".ant-modal, [class*=modal], [role=dialog]")]
            .map(m => m.innerText.trim()).filter(Boolean);
          const body = document.body.innerText;
          const inline = body.match(/Errors[\s\S]{0,2000}?mailto:[^)]+\)|Errors\n[\s\S]{0,1500}/)?.[0];
          return { modalText: mods.join("\n---\n"), inlineErrors: inline ?? null };
        });
        const shot = join(HERE, "shots", `errors-${Date.now()}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        const draft = [
          `To: lensstudio-support@snapchat.com`,
          `Subject: Web Lens review — request for detailed error logs (Lens ID ${base.lensId})`,
          ``,
          `Hi Snap team,`,
          ``,
          `My Web Lens "${lensName}" (Lens ID: ${base.lensId}) was rejected during`,
          `automated testing with a "Critical Runtime Error". The portal only shows the`,
          `generic message, so could you share the detailed logs (stack trace / device /`,
          `webview version) and which specific behaviors are considered not allowed or`,
          `unsupported, so I can fix and resubmit?`,
          ``,
          `Errors visible in My Lenses:`,
          errors.modalText || errors.inlineErrors || "(none scraped)",
          ``,
          `Thanks,`,
          `Diego`,
        ].join("\n");
        return JSON.stringify({ ...base, errors, screenshot: shot, supportEmailDraft: draft }, null, 2);
      })
    );
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

await server.connect(new StdioServerTransport());

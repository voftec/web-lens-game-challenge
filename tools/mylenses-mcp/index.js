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

server.tool(
  "mylenses_upload",
  "Upload a Web Lens zip to My Lenses (new Web Lens flow) with optional icon and preview video. Best-effort UI automation; returns page state on each step. Does NOT submit for review unless submitForReview=true.",
  {
    zipPath: z.string(),
    name: z.string().describe("Lens name"),
    iconPath: z.string().optional().describe("512x512 PNG"),
    videoPath: z.string().optional().describe("720x1280 5s mp4"),
    submitForReview: z.boolean().default(false).describe("If true, clicks submit for review. Only use with an approved GATE."),
  },
  async ({ zipPath, name, iconPath, videoPath, submitForReview }) => {
    for (const p of [zipPath, iconPath, videoPath].filter(Boolean))
      if (!existsSync(p)) return txt(`ERROR: file not found: ${p}`);
    const shots = [];
    return txt(
      await withPage(false, async (page) => { // headed: Snap may challenge headless
        const shot = async (tag) => {
          const f = join(HERE, "shots", `${tag}-${Date.now()}.png`);
          await page.screenshot({ path: f }).catch(() => {});
          shots.push(f);
        };
        await page.goto(`${MYLENSES}/home`, { waitUntil: "domcontentloaded" });
        let s = await pageSummary(page);
        if (/sign in|log in|iniciar/i.test(s.bodyText) || /accounts\.snapchat/.test(s.url))
          return `NOT LOGGED IN — run mylenses_login first.\n${s.url}`;
        await shot("home");
        const log = [`start: ${s.url}`];
        // Try to start "New Lens" / "Web Lens" creation — selectors are best-effort
        // because My Lenses has no public API and the UI may change.
        const createBtn = page.getByRole("button", { name: /new lens|create|web lens/i })
          .or(page.getByRole("link", { name: /new lens|create|web lens/i })).first();
        if (await createBtn.count()) {
          await createBtn.click();
          await page.waitForTimeout(1500);
          log.push("clicked create/new lens");
        } else {
          log.push("no create button found");
        }
        // file inputs: try zip upload
        const fileInputs = page.locator("input[type=file]");
        const n = await fileInputs.count();
        log.push(`file inputs: ${n}`);
        if (n > 0) await fileInputs.first().setInputFiles(zipPath);
        // name field
        const nameField = page.getByPlaceholder(/name/i).or(page.locator("input[name*=name i]")).first();
        if (await nameField.count()) { await nameField.fill(name); log.push("filled name"); }
        if (iconPath && n > 1) { await fileInputs.nth(1).setInputFiles(iconPath); log.push("uploaded icon"); }
        if (videoPath && n > 2) { await fileInputs.nth(2).setInputFiles(videoPath); log.push("uploaded video"); }
        if (submitForReview) {
          const submit = page.getByRole("button", { name: /submit|review|publish/i }).first();
          if (await submit.count()) { await submit.click(); log.push("clicked submit for review"); }
        }
        await shot("after-upload");
        s = await pageSummary(page);
        return [...log, "", "PAGE STATE:", JSON.stringify(s, null, 2), "", "screenshots:", ...shots].join("\n");
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

await server.connect(new StdioServerTransport());

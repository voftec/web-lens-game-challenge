// gmail-sender — sends mail via Gmail REST API using the OAuth tokens saved by
// oauth.sh (.gmail-tokens.json, gitignored). Usage:
//   node send.mjs --to a@b.c --subject "s" --body "b"   (or --body-file f)
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOK = join(HERE, ".gmail-tokens.json");

const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : null;
};

if (!existsSync(TOK)) {
  console.error("ERROR: .gmail-tokens.json missing — run ./oauth.sh <client_id> <client_secret> first");
  process.exit(1);
}
const t = JSON.parse(readFileSync(TOK, "utf8"));

const tokRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: t.client_id, client_secret: t.client_secret,
    refresh_token: t.refresh_token, grant_type: "refresh_token",
  }),
});
const tok = await tokRes.json();
if (!tok.access_token) { console.error("token refresh failed:", JSON.stringify(tok)); process.exit(1); }
if (tok.refresh_token) { t.refresh_token = tok.refresh_token; writeFileSync(TOK, JSON.stringify(t)); }

const to = arg("to"), subject = arg("subject"), cc = arg("cc");
const body = arg("body") ?? (arg("body-file") ? readFileSync(arg("body-file"), "utf8") : null);
if (!to || !subject || !body) { console.error("need --to --subject --body|--body-file"); process.exit(1); }

const mime = [
  `To: ${to}`, ...(cc ? [`Cc: ${cc}`] : []), `Subject: ${subject}`,
  "Content-Type: text/plain; charset=UTF-8",
  "MIME-Version: 1.0", "", body,
].join("\r\n");
const raw = Buffer.from(mime).toString("base64url");

const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ raw }),
});
const out = await res.json();
if (!res.ok) { console.error("send failed:", JSON.stringify(out)); process.exit(1); }
console.log(`SENT to ${to} — message id ${out.id}`);

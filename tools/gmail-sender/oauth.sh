#!/usr/bin/env bash
# One-time OAuth flow for Gmail send. Needs an OAuth "Desktop app" client
# (client_id + client_secret) from Google Cloud Console.
# Usage: ./oauth.sh <client_id> <client_secret>
# Opens your NORMAL browser for consent, saves tokens to .gmail-tokens.json
set -euo pipefail
cd "$(dirname "$0")"
CID="${1:?client_id required}"; SEC="${2:?client_secret required}"
PORT=8472
STATE=$(openssl rand -hex 8)
AUTH="https://accounts.google.com/o/oauth2/v2/auth?client_id=${CID}&redirect_uri=http%3A%2F%2Flocalhost%3A${PORT}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send&access_type=offline&prompt=consent&state=${STATE}"
echo "Opening browser for Google consent..."
open "$AUTH"
CODE=$(python3 - "$PORT" "$STATE" <<'PY'
import http.server, sys, urllib.parse
port, state = int(sys.argv[1]), sys.argv[2]
box = {}
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.urlparse(self.path).query
        p = urllib.parse.parse_qs(q)
        if p.get("state",[None])[0] != state:
            self.send_response(400); self.end_headers(); return
        box["code"] = p.get("code",[None])[0]
        self.send_response(200); self.end_headers()
        self.wfile.write(b"OK - you can close this tab and go back to Devin.")
    def log_message(self, *a): pass
http.server.HTTPServer(("localhost", port), H).handle_request()
print(box.get("code",""))
PY
)
[ -z "$CODE" ] && { echo "ERROR: no auth code received"; exit 1; }
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "code=$CODE" -d "client_id=$CID" -d "client_secret=$SEC" \
  -d "redirect_uri=http://localhost:$PORT" -d "grant_type=authorization_code" \
  -o .gmail-tokens.json
python3 -c "import json;d=json.load(open('.gmail-tokens.json'));d['client_id']='$CID';d['client_secret']='$SEC';json.dump(d,open('.gmail-tokens.json','w'))"
echo "Tokens saved to .gmail-tokens.json (gitignored). Done."

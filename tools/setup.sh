#!/usr/bin/env bash
# setup.sh — one-shot environment setup for the web-lens-game-challenge workspace.
# Safe to re-run. Requires: macOS, Node.js >= 20, git.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== repo: $ROOT"

node --version | grep -Eq 'v(2[0-9]|[3-9][0-9])' || { echo "FAIL: need Node >= 20"; exit 1; }

echo "== installing mylenses-mcp deps"
cd tools/mylenses-mcp
npm ci
npx playwright install chromium
cd "$ROOT"

echo "== writing .devin/mcp_config.local.json (absolute paths for this machine)"
mkdir -p .devin
NODE_BIN="$(command -v node)"
cat > .devin/mcp_config.local.json <<EOF
{
  "mcpServers": {
    "mylenses": {
      "command": "$NODE_BIN",
      "args": ["$ROOT/tools/mylenses-mcp/index.js"],
      "transport": "stdio"
    }
  }
}
EOF

echo
echo "Done. Next steps:"
echo "  1. Open this folder in Devin — the 'mylenses' MCP loads automatically."
echo "  2. Ask Devin to run mylenses_login to authenticate your Snapchat session once."
echo "  3. Read CONTEXT.md (challenge rules) and ARGON.md (game-build playbook)."

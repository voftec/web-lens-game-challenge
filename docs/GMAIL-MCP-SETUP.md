# Gmail MCP oficial de Google — setup

Endpoint remoto: `https://gmailmcp.googleapis.com/mcp/v1` (HTTP streaming, OAuth 2.0).
Fuente: https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server

## Caveats

- **No hay `send`**. El toolset expone `create_draft`, `get_message`, `get_thread`,
  `search_threads`, `list_drafts`, `list_labels`, `label/unlabel`, `create_label`.
  El flujo de soporte a Snap queda: agente crea el draft → Diego lo manda con un click.
- Requiere ser miembro del **Developer Preview Program** de Google Workspace:
  https://developers.google.com/workspace/preview
- El login por browser automatizado (Playwright) NO funciona: Google rechaza el
  Chromium de test ("No puedes acceder"). El MCP oficial es el camino correcto.

## Pasos (una sola vez, con tu cuenta de Google)

1. **Developer Preview**: enrolarse en
   https://developers.google.com/workspace/preview
2. **Proyecto GCP**: https://console.cloud.google.com → crear proyecto
   (ej. `web-lens-mcp`).
3. **Habilitar APIs** (console o gcloud):
   ```bash
   gcloud services enable gmail.googleapis.com gmailmcp.googleapis.com --project=PROJECT_ID
   ```
4. **OAuth consent screen**: Google Auth Platform → Branding
   - Nombre: `Gmail MCP Server`, email de soporte: `diego.usdz@gmail.com`
   - Audience: **Externo** (o Interno si es workspace) → si Externo, agregar
     `diego.usdz@gmail.com` como **test user**
   - Data Access → agregar scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.compose`
5. **OAuth Client**: Google Auth Platform → Clients → Create Client →
   **Aplicación web** → redirect URI según el cliente MCP:
   - Devin: usar el callback que exponga Devin (verificar en docs Devin);
     de referencia, Antigravity usa `https://antigravity.google/oauth-callback`
     y Claude usa `https://claude.ai/api/mcp/auth_callback`.
   - Copiar **Client ID** y **Client Secret**.
6. **Config local** (`.devin/mcp_config.local.json`, gitignored):
   ```json
   {
     "mcpServers": {
       "gmail": {
         "serverUrl": "https://gmailmcp.googleapis.com/mcp/v1",
         "oauth": {
           "clientId": "OAUTH_CLIENT_ID",
           "clientSecret": "OAUTH_CLIENT_SECRET"
         }
       }
     }
   }
   ```
7. Autenticar desde el cliente (Devin debería lanzar el flujo OAuth;
   autorizar con diego.usdz@gmail).

## Uso previsto

`mylenses_send_error_report` → si el MCP de Gmail está autenticado, el draft se
crea vía `create_draft` (to: lensstudio-support@snapchat.com, con Lens ID y los
errores scrapeados) y Diego aprieta Send. Fallback actual: draft en texto plano
para copiar.

## Alternativas si el preview program no acepta

- Gmail API vía `gcloud auth` + `curl` (mismo consent screen, `gmail.send` SÍ
  existe en la API REST — solo el MCP está capado a drafts).
- Apps Script con `MailApp.sendEmail` deployado como web app (auth del usuario).

# STATUS — Web Lens Game Challenge

**Deadline submission:** 26 oct 2026, 23:59 CET · **Upload a My Lenses:** ≤24 oct (buffer review 24–48hs)

## Fase actual
0 — Concepto. Falta la sesión de alineación (game-designer entrevista a Diego).

## Estado
- [x] Research del challenge (`CONTEXT.md`)
- [x] Playbook Argon (`ARGON.md`)
- [x] Repo privado en GitHub (voftec/web-lens-game-challenge)
- [x] Harness de agentes configurado (`.devin/agents/`, `AGENTS.md`)
- [x] Spike de porting: Argon Towers → zip Web Lens válido 5.6MB (`SPIKE-PORTING.md`)
- [x] MCP local `mylenses` (`tools/mylenses-mcp/`): validate_zip, serve, login, list, upload, dump_ui — sesión de Snap en `.browser-profile/` (gitignored)
- [ ] Concepto del juego aprobado (GATE)
- [ ] Build del juego (`game/`)
- [ ] Lens publicado en My Lenses
- [ ] Registration + submission en Lenslist

## Bloqueos
- Ninguno.

## Gates registrados
- (ninguno todavía)

## Update — My Lenses E2E test (2026-10-15)

- Login persistente OK: sesión autenticada en `tools/mylenses-mcp/.browser-profile/` ("Welcome, Diego Aguirre"). En headless el dashboard tarda ~6s en hidratar — esperar `text=Welcome`.
- Submit E2E completado: `Argon Towers Test` subido al folder `AR 2025`.
  - Lens ID: `7b660349-db32-4377-97ec-cdf7de42c9cb`, estado `Processing`, visibility `Hidden`.
- Selectores reales que funcionaron:
  - Nav: link `text=Web Lenses` → radio "Submit a new Web Lens" → `[data-testid="web-lens-folder-continue"]` (hay un textarea de feedback que intercepta clicks — click via `evaluate`).
  - Form: `input[type=file][accept=".zip"]` (package), `[accept="image/png"]` (icon), `input[type=text]` (nombre, 18 chars max), `[accept*="video"]` (preview — aparece tras "Change Lens Preview", hay que clickear **Apply** en el modal o queda Invalid).
  - Submit: `[data-testid="web-lens-submit"]` → modal "Publishing Lens" (elegir visibility: Public/Hidden/Offline) → último botón "Submit".
- Checklist de la UI: zip válido, ≤100MB, build output ≤8MB, icono png ≤8MB, nombre, video 5–10s (720x1280 min, ≤32MB).
- Nota: el portal acepta zip de hasta 100MB y extrae el build de dist/ solo — el límite de 8MB aplica al output, no al zip.
- Próximo: esperar review de Snap, obtener Lens link, probar en teléfono.

## Update — Rechazo de Snap (15 oct 2026)

- `Argon Towers Test` rechazado: **Critical Runtime Error** en automated testing
  (banner en la página del Lens + modal Errors con mensaje genérico — el portal
  NO muestra logs detallados; hay que pedirlos a lensstudio-support@snapchat.com).
- Causa probable (P0 ya detectado en spike): `this.audio.unlock is not a function`
  crashea en el primer tap → "critical error during automated testing".
- Fix aplicado en `spikes/argon-towers-v2/dist`: `audio.unlock()` →
  `audio.resume()`, `viewport-fit=cover`, safe-area translateY en HUD,
  `overscroll-behavior:none`. Playtest limpio: 0 errores de consola/página.
- Preview video real grabado con Playwright (720x1280 webm → mp4 faststart):
  `spikes/argon-towers-v2/preview-v2.mp4`.
- Zip v2: `spikes/argon-towers-lens-v2.zip` (5.9MB). Pendiente: re-submit como
  "Update an existing Lens".
- Nuevo tool MCP `mylenses_error_report`: dado lensName+folderName scrapea
  Lens ID, status y errores del modal, y devuelve un draft de email a soporte
  con el Lens ID pidiendo logs detallados.

## Update — MCP tools de folders (15 oct 2026)

- `mylenses_list_folders`: lista folders via nav "Lens Folders".
- `mylenses_create_folder`: crea folder — selectores reales:
  `[data-testid="lens-folders-header-create-button"]` → input[type=text] →
  `[data-testid="lens-folders-modal-create-button"]`.
- Creado folder **"Game Challenge"** (folders actuales: AR 2025, Games,
  Game Challenge). `mylenses_error_report` ya acepta `folderName`.
- Ojo: las URLs directas de folders/lenses redirigen a /home — hay que
  navegar por la UI (home → click "Lens Folders" → click folder).

## Update — MCP upload/update/status reales (15 oct 2026)

- `mylenses_upload` reescrito con el flujo probado E2E (radio submit → folder →
  continue → zip/name/icon/video+Apply → checklist → Submit → Publishing modal
  → visibility → confirm). `submitForReview` sigue detrás de flag.
- `mylenses_update`: "Update an existing Lens" (radio 1) → folder → lens →
  mismo form. Cada update = nueva versión = nueva review.
- `mylenses_status`: Lens ID + status + visibilidad desde la página del Lens,
  buscando el lens en todos los folders si no se pasa `folderName`.
- Helpers internos: `openSubmitFlow` y `fillAndSubmit` compartidos.

## Update — Resubmit v2 + gameplay MCP (15 oct 2026)

- **Resubmit enviado**: `Argon Towers Test` actualizado a v2 (~12:03 PM),
  estado `Processing`. Zip `argon-towers-lens-v2.zip` (5.6MB, fix audio +
  viewport-fit) + preview `preview-real.mp4` (gameplay REAL grabado, no
  generado — distinción clave pedida por Diego). Checklist del portal todo
  Ready antes de Update.
- Flujo de update real (selectores): radio Update → `input[role=combobox]` →
  `.ant-select-item-option-content` (Ant Design select) → click nombre del
  lens → form "Updating <name> Lens". Si la versión previa falló, el update
  EXIGE zip nuevo. Video se reemplaza con "Change Lens Preview" + Apply.
  Script reusable: `tools/mylenses-mcp/scripts-update-final.mjs`.
- **Gameplay MCP** (`gameplay_*` en index.js): sesión persistente headed que
  sirve el build, viewport 720x1280 táctil, `recordVideo` grabando TODO el
  tiempo; tools: `gameplay_start` / `gameplay_screenshot` / `gameplay_eval`
  / `gameplay_tap` / `gameplay_swipe` / `gameplay_wait` / `gameplay_stop`
  (encodea mp4 H.264+AAC 30fps faststart, ≤10s, reporta errores de página).
  Soporta también modo humano: Diego juega en la ventana mientras graba.
- Demo real: agente detectó controles (`START WAVE`, torres $5/$10/$20/$75),
  colocó 2 torres, lanzó wave → `spikes/argon-towers-v2/preview-real.mp4`
  (10s, 720x1280, faststart, 0 errores). Demo: `scripts-gameplay-demo.mjs`.
- Email a Snap Support enviado desde diego.usdz@gmail (draft nativo Mail.app,
  CC diego.aguirre8@icloud.com) → ticket **#277151774**. Gmail API oauth.sh
  quedó listo pero Google bloquea scopes sensibles con el client genérico de
  gcloud — requeriría OAuth client propio en GCP; fallback mailto funciona.
- Pendiente: resultado de la review v2 (¿el audio era la causa?) + respuesta
  del ticket con logs reales.

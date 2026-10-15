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

## Update — v2 APROBADO + simulador Snap + HUD mobile (15 oct 2026)

- **`Argon Towers Test` aprobado por Snap** — el fix `audio.unlock→resume`
  era la causa del Critical Runtime Error. Corre en Snapchat real.
- **Simulador propio del chrome de Snap** (sin Lens Studio): el RE de
  `research/snap-preview-re/` extrajo PNGs pixel-perfect de
  `Lens Studio.app` → `assets/devices_overlays/<Device>/<mode>.png`
  (13 dispositivos × live/sponsored/capture/connected_lenses + without_ui).
  El MCP los sirve vía `/__snapchrome__/` y los inyecta como `<img>` overlay.
- `gameplay_start` ahora: `snapChrome` **default "camera"** (SIEMPRE on en
  dev/playtest; `off` solo para grabar el preview de publicación), viewport
  device-accurate iPhone 14 Pro (393×852 CSS @dpr2, video 720×1560) para que
  el overlay no se deforme. `gameplay_chrome` alterna modos en vivo.
- **Banda jugable medida** (occlusion.mjs sobre el PNG real, CSS 393×852):
  status bar 0–59, icon rows hasta ~y160, carousel ~y680, navbar y770–852 →
  HUD debe vivir entre ~y100–660.
- **HUD mobile polish** aplicado al spike vía media query `max-width:500px`
  en `dist/index.html` (gitignored) + fuente versionada en
  `spikes/mobile-hud-patch.html`: Round/score arriba en el corredor, oro y
  vidas al nivel de las columnas de iconos, dock como card centrada sobre el
  carousel, controles en pill, tooltip centrado con auto-hide, callouts
  clampeados on-screen, gear popover flotante, strings táctiles
  ("Tap a tile", no "Right-Click").
- `weblens_make_icon`: icono 512×512 desde frame real del juego.
- **Skill `.devin/skills/snap-game-ui-adapt/SKILL.md`** creada e integrada en
  `AGENTS.md` y los 4 agentes: mapa de píxeles exacto de Snapchat, distribución
  de 3 puntos en escalera (`Round/bar/score` arriba, `$` al lado de `ⓘ`, `❤️`
  al lado del toolbar), escalado independiente de resolución (`--ux`, `--uy`,
  `--s = min(innerWidth/393, innerHeight/852)`) verificado en 4 resoluciones
  (`375×667` iPhone 8, `393×852` iPhone 14 Pro, `430×932` Pro Max, `720×1280`),
  consistencia de posición en animaciones y checklist funcional touch-first.
- **Update v3 enviado a My Lenses** (15 oct, 3:10 PM): `argon-towers-lens-v3.zip`
  (5.6MB, 0 referencias a `snap-chrome`) + `preview-v3.mp4` (`720×1280` H.264
  faststart, 9.5s de gameplay real posicionando 3 torres en embudo) + `icon.png`.
  Nota: actualizar un Lens existente NO consume del cupo `Non-Lens+` (sigue en
  `19 left`).

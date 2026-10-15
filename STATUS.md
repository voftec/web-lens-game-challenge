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

# Web Lens Game Challenge

Workspace de Devin para construir y publicar un juego web como **Web Lens** en
Snapchat, compitiendo en el Snap Web Lens Game Challenge (Lenslist × Snap,
**deadline 26 oct 2026**).

## Quickstart en una máquina nueva

```bash
git clone git@github.com:voftec/web-lens-game-challenge.git  # o https
cd web-lens-game-challenge
./tools/setup.sh        # node>=20 requerido; instala deps + configura el MCP
```

Después abrir la carpeta en **Devin** — el MCP `mylenses` se carga solo desde
`.devin/mcp_config.local.json` (generado por setup.sh con paths absolutos de la
máquina local; por eso está gitignored).

Para autenticar Snapchat: pedirle a Devin que corra `mylenses_login` → se abre un
Chromium donde te logueás una vez; la sesión queda en
`tools/mylenses-mcp/.browser-profile/` (local, nunca commiteada). Sin passwords en
ningún archivo.

## Layout

```
CONTEXT.md           # brief completo del challenge (reglas, premios, restricciones)
ARGON.md             # playbook Gemini 4 Argon para builds 3D + equivalencias Devin
SPIKE-PORTING.md     # spike real: Argon Towers portado a zip Web Lens válido (5.6MB)
STATUS.md            # estado vivo del proyecto + gates aprobados por Diego
AGENTS.md            # system prompt del harness: roles, pipeline, convenciones
knowledge/           # memoria persistente de los agentes (append-only)
.devin/agents/       # subagentes especialistas (game-designer, threejs-engineer,
                     # visual-critic, qa-playtester, snap-publisher)
.devin/mcp_config.local.json   # MCPs del proyecto (generado por setup.sh)
tools/mylenses-mcp/  # MCP server propio: validate_zip, serve, login, upload, status
spikes/              # experimentos de porting (evidencia + zips)
game/                # el juego (se crea en fase 1)
resources/           # referencias locales gitignored (argon-games clonado)
review/              # reportes de visual-critic y qa-playtester
```

## Dependencias

- **Node.js ≥ 20** y npm
- **Devin Desktop/CLI** (el harness de agentes y los MCP se usan desde ahí)
- MCP del proyecto: `mylenses` (propio, `tools/mylenses-mcp/`)
- MCPs externos usados: `playwright` (navegación/screenshots — viene con Devin
  o se configura igual que otros proyectos de Diego)
- Opcional: `ffmpeg` para el preview video (brew install ffmpeg)

## Convenciones clave

- El Game Director (sesión raíz de Devin) es el único que habla con Diego;
  subagentes en `.devin/agents/` con `model:` pineado (`gemini` = Argon).
- Todo efecto real (upload a My Lenses, forms) requiere GATE registrado en
  `STATUS.md`.
- El juego final vive en `game/`, buildea con Vite `base:'./'` a `dist/`, se
  empaqueta con un zip raíz = contenidos de `dist/`.

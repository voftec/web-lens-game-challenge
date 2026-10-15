# SPIKE-PORTING — Argon Towers → Web Lens (spike de porting)

> **Objetivo:** validar el pipeline de port ANTES de diseñar el juego propio.
> Tomamos `argon-towers` del showcase (el más portable: `index.html` +
> `bundle.js` self-contained, sin `server.py`) y lo convertimos en un zip
> Web Lens-válido, corriéndolo en un viewport portrait con Playwright.
> Fecha: 15 oct 2026.

## Resultado: ✅ el port es viable y barato

| Requisito Web Lens | Estado | Detalle |
|---|---|---|
| `index.html` en raíz del zip | ✅ | estructura ya venía así |
| Paths relativos `./` | ✅ | `index.html` usa `./bundle.js`, `./styles…` (en towers ni siquiera hay styles.css); assets referenciados como `assets/audio/…` relativos |
| Forward slashes en zip | ✅ | `zip -r` en macOS, `unzip -l` verificado, 0 backslashes |
| Zip ≤ 8MB | ✅ | **5.6MB comprimido** (9.4MB sin comprimir; bundle.js solo pesa 5.7MB — el límite de 1MB es solo para index.html, que pesa 1.3KB) |
| Sin red externa | ✅ | los `https://` en bundle.js son comentarios de three.js; todos los fetch son a archivos del zip |
| Sin sensores/cámara/iframes | ✅ | towers no usa nada bloqueado |
| Bootea en portrait 390×844 | ✅ | screenshot `spikes/towers-boot.png` — canvas fill-window, HUD arriba, dock de torres abajo. Se ve nativo. |
| Interacción un-pulgar | ✅ parcial | tap en botón de torre + tap en canvas colocan torres (2 colocadas, gold 20→5) |
| Consola limpia | ⚠️ 1 error | ver bugs abajo |

## Lo que se descartó del build original

- `assets/references/` (1.1MB de screenshots de dev — no los carga el juego)
- `src/` (556KB — sources; el bundle.js ya los incluye compilados)
- `server.py`/`README`/`metadata.json` (no van al zip)

→ **Regla de porting:** los juegos del showcase se puede strippear ~10–30% de
peso solo sacando carpetas de dev. `game-lens/ = index.html + bundle.js + assets
que el bundle realmente referencia`.

## Bugs/encontrados que aplican a NUESTRO juego

1. **P0 — `TypeError: this.audio.unlock is not a function`** en el primer
   pointerdown (`bundle.js:61070`, `unlockAudioOnce`). El juego intenta
   unlock de audio en el gesture pero la API no existe → en el webview de Snap
   el audio simplemente nunca arranca. **Lección: el audio-gesture wiring de
   los juegos Argon no es confiable; hay que revisarlo/reescribirlo** (crear
   `AudioContext` dentro del handler del primer tap y guardar con
   `typeof ctx.resume === 'function'`).
2. **P1 — overlap de HUD en 390px:** el botón "START WAVE 1 ▶" queda tapado por
   el tower dock (`fr-tower-dock` intercepta pointer events). En pantallas
   angostas el dock y el wave-button compiten por el mismo espacio. **Lección:
   en portrait angosto, testear overlaps de HUD elemento por elemento — el
   juego fue diseñado pensando en pantallas más anchas.**
3. **Observación — safe-area:** el HUD superior ($, Round, vidas) empieza en
   y=0. En Snapchat, los primeros ~120px quedan bajo los controles del host
   (close button) → **hay que bajar el HUD o perderlo**. El juego no usa
   `env(safe-area-inset-top)`.
4. **Sin persistencia real:** usa el store de sesión (localStorage); para el
   challenge habría que rewircar high-score/progreso a `snapchat.storage`.
5. **Sin Web Lens API:** ni leaderboards ni Bitmoji — agregarlo sería trabajo
   de `threejs-engineer` sobre el bundle minificado (feo) o re-buildear desde
   `src/` (el repo trae los sources modulares, mejor).

## Conclusión estratégica

Portar un juego Argon existente a Web Lens es **trabajo de horas, no días**:
strippear assets dev, fix de audio-unlock, HUD safe-area, y overlay de Snap API.
PERO para el challenge conviene **juego propio con estas lecciones desde el día
1** (el port serviría para la categoría portfolio/originalidad floja: los terms
exigen trabajo "propio" y no-ganador-previo; un clone del showcase de Ammaar
arriesga descalificación por no ser "your own original work" y ya fue publicado
viralmente).

**El valor real del spike:** ahora sabemos que el pipeline zip→Lens es trivial y
que los constraints verdaderos son *audio-gesture*, *HUD safe-area/overlap* y
*peso de assets*. Diseñar el juego propio ya con estas reglas ahorra una ronda
de porting.

## Artefactos

- `spikes/argon-towers-lens/` — el build strippado (servible con `python3 -m http.server`)
- `spikes/argon-towers-lens-v1.zip` — **5.6MB**, válido para upload a My Lenses
- `spikes/towers-boot.png`, `spikes/towers-midgame.png` — evidencia portrait

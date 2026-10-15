# PUBLISHING.md — Cómo publicar un Web Lens válido en Snap (investigación completa)

> Fuentes: docs oficiales `developers.snap.com/web-lenses/*` + hallazgos empíricos del
> portal My Lenses (submit E2E real, 15 oct 2026). Lo marcado **[empírico]** lo
> descubrimos nosotros y no está (o contradice levemente) la doc.

## 0. TL;DR del flujo

```
build (Vite, base:'./') → zip del CONTENIDO de dist/ → validar zip
→ test en browser portrait + simulación de safe-area
→ My Lenses → Web Lenses → Submit → zip + icono + video + nombre
→ modal "Publishing Lens" → visibility → Submit
→ Processing → review de Snap → Published (link/QR)
→ playtest REAL en Snapchat → iterar (cada upload = nueva review)
→ Lenslist submission con el Lens link
```

## 1. El paquete (zip)

Reglas duras (Platform requirements):

- `index.html` en la **raíz** del zip, **≤ 1 MB**. No zipear la carpeta `dist/`
  — zipear su contenido.
- Todo path relativo (`./a/game.js`, nunca `/a/game.js`). En Vite: `base: './'`.
  Verificar: `grep -E 'src="/|href="/' dist/index.html` → vacío.
- Entradas del zip con `/` forward slash. En Windows NO usar
  `Compress-Archive` ni `ZipFile` de .NET (escriben `\`); usar Node + `archiver`
  (ver `tools/pack.mjs` de referencia en la doc).
- Zip **≤ 8 MB comprimido** (beta; Snap dice que puede cambiar).
- Verificar con `unzip -l` antes de cada upload.

**[empírico]** El portal dice cosas más laxas que la doc:
- Acepta zip de hasta **100 MB** y hasta 150 MB descomprimido / 20.000 archivos.
- Busca `index.html` en raíz O dentro de `dist/`, `build/`, `out/`, `www/`.
- Extrae solo el "build output" — los sources en el zip se ignoran y no cuentan
  contra los 8 MB. Rechaza si el output referencia `.ts/.tsx/.jsx` o `/src/`.
- **Regla práctica: seguir la doc (8MB, index.html en raíz), no el portal.** La
  doc es el contrato estable; el portal acepta más pero la review puede no.

Extensiones soportadas (Snap sirve MIME por extensión, sniffing OFF):
`.html .htm .js .mjs .css .json .wasm .png .jpg .jpeg .gif .webp .svg .mp3 .mp4
.ttf .otf .woff .woff2 .bin .data` — `.glb`/`.ktx2` van por `fetch()` sin
problema. Nada de `/__snap/` (reservado).

## 2. Runtime del webview (diseñar para esto)

- Full-screen, **portrait 9:16**, un pulgar. No intentar lock de orientación.
- `viewport-fit=cover` obligatorio o los safe-area insets leen 0.
- Safe-area **top mucho más grande que el notch** — Snapchat dibuja sus
  controles (botón close ~120px). No hardcodear valor; en dev simular con
  `--inset-top: 120px`.
- OJO CSS: padding en ancestro posicionado NO mueve hijos `position:absolute`;
  poner el `env()` en el elemento mismo.
- `devicePixelRatio` capear a 2 (`Math.min(dpr, 2)`).
- 120 Hz: `requestAnimationFrame` corre al rate del display. Todo el movimiento
  por delta-time o fixed timestep + interpolación; clampear dt tras pausas.
- Input: `pointer events`, `touch-action:none`, `overscroll-behavior:none`,
  suprimir `contextmenu`, normalizar drags por `innerWidth`.
- Audio: crear/resumir `AudioContext` dentro del primer tap. Pausar juego +
  suspender audio en `visibilitychange`; resetear el acumulador de timestep al
  volver.
- `localStorage`/IndexedDB/cookies: funcionan en sesión pero **se borran al
  cerrar el Lens**. Persistencia real = `snapchat.storage`.
- Haptics: `navigator.vibrate` solo Android y solo tras gesture
  (`navigator.userActivation.hasBeenActive`).
- Loading: background de `index.html` igual al clear color (evita flash
  blanco), `<link rel="preload">` para assets grandes, generar en boot solo lo
  de la primera pantalla.

## 3. Restricciones (CSP + permissions policy)

**Todo va en el zip.** Bloqueado: red externa (fetch/XHR/WebSocket/WebRTC),
cámara, micrófono, sensores de movimiento, geolocalización, pagos, USB, MIDI,
iframes (ni embeber ni ser embebido), form submission, `<base>`, manifests,
plugins, storage persistente de browser.

Permitido: inline scripts/styles, `eval`/`new Function`, WebAssembly (incluso
multi-thread, la página es cross-origin isolated), Web Workers (archivo o
`blob:`), `data:`/`blob:` para imágenes, fuentes bundled, vibrate (Android).

## 4. Web Lens API (`@snap/web-lens-api`)

- `await snapchat.init()` una vez al boot; `snapchat.isSupported(cap)` antes de
  cada feature; todo devuelve promises con error codes documentados.
- Capacidades: `leaderboards`, `bitmoji` (3D o imagen), `storage`.
- Fuera de Snapchat corre un stub con canned data (`snapchat.isStub`) — el
  juego debe ser jugable sin API.

## 5. Assets del submit (portal)

**[empírico, UI real de My Lenses]**

| Campo | Spec doc | Spec portal real |
|---|---|---|
| Lens Name | — | **18 chars máx** |
| Lens Icon | 512×512 PNG | PNG ≤8MB, hasta 4096×4096. **Portal pide archivo, no valida 512²** — mandar 512² igual |
| Preview video | 720×1280, 5s, H.264+AAC, 30fps, faststart | Portal dice 5–10s, ≤32MB, min 720×1280 |
| Lens Folder | — | obligatorio (ej. "AR 2025") |
| Game Lens flag | — | checkbox "New": full-screen + distribuible en Chat drawer para jugar con amigos. **Review más estricta.** Marcarlo para el challenge |
| Visibility | — | Public / **Hidden** (QR+link) / Offline. Hidden alcanza para Lenslist (pide "Link to Lens") |
| Payouts | — | toggles Lens+ Payouts / Top Performer (opcionales) |

Icono (doc): sujeto centrado, contenido importante dentro de ~80% del radio del
círculo inscrito (Snapcode cropea esquinas), fondo completo sin transparencia ni
viñeta, un solo sujeto, alto contraste, **sin texto**, juzgar a 100px.

Video (doc): mostrar el pico del loop (no el arranque), un ciclo completo, sin
muertes/transiciones, grabar largo y recortar 5s. `canvas.captureStream()` no
captura HUD en DOM. Comando:
```
ffmpeg -i capture.webm -ss 2 -t 5 -vf "scale=720:1280,fps=30" \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart preview.mp4
```

## 6. Flujo del portal [empírico]

1. `my-lenses.snapchat.com` → login (sesión persistida en el browser profile
   del MCP).
2. Nav **Web Lenses** → radio "Submit a new Web Lens" → elegir Lens Folder →
   `Continue`.
3. Form `Submit a Web Lens`: zip dropzone, "Change Lens Preview" (abre file
   picker de video + modal con **Apply** — sin Apply queda "Invalid"), Lens
   Name (18 chars), icono (file input PNG), flag Game Lens, checklist "Ready to
   submit" en vivo.
4. `Submit` → modal "Publishing Lens": visibility + payouts toggles → Submit
   del modal.
5. Lens aparece en **Lens Folders → <folder>** con estado `Processing`.
   La vista "Home" no lo lista — los Lenses viven dentro de folders.
6. Cada upload nuevo = nueva versión = **nueva review** (24–48hs). Nombrar los
   zips con versión (`my-game-v3.zip`).
7. Submission limits: **20 Non-Lens+ + 10 Lens+** (contador visible; nuestro
   submit lo bajó a 19). No quemar submits en fixes menores — batchar cambios.

Review: mismas Lens submission guidelines que Lens Studio. **No hay forma de
abrir un Web Lens en Snapchat antes de que pase review.** Preview local ≠
webview real: probar portrait, safe-area simulada, audio tras gesture.

## 7. Estado actual

- `Argon Towers Test` — Lens ID `7b660349-db32-4377-97ec-cdf7de42c9cb`,
  folder `AR 2025`, estado `Processing`, visibility `Hidden`. Submit E2E
  probado el 15 oct 2026.
- Selectores funcionales del portal documentados en `STATUS.md` (para
  `mylenses_upload`).

## 8. Checklist pre-submit (correr SIEMPRE)

- [ ] `weblens_validate_zip` PASS (index.html raíz ≤1MB, zip ≤8MB, `/` slashes,
      paths `./`, sin URLs externas, sin `<base>`/manifest/iframe)
- [ ] `viewport-fit=cover` presente
- [ ] Playwright portrait 390×844: boot, loop jugable con taps, HUD fuera de
      safe-area simulada (120px top), sin errores de consola
- [ ] Audio solo tras gesture; `visibilitychange` pausa
- [ ] `snapchat.init()` + fallbacks sin API
- [ ] Icono 512² sin texto, sujeto en 80% central
- [ ] Video 720×1280 ≤10s H.264+AAC faststart mostrando el pico
- [ ] Nombre ≤18 chars
- [ ] Decisión: Game Lens flag + visibility (Hidden para challenge)
- [ ] GATE con Diego antes de Submit


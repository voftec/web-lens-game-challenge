# Web Lens Game Challenge — Documento de Contexto Completo

> **Para quién es este documento:** para Diego, para Devin, y para cualquier agente futuro que retome este proyecto. Leerlo completo antes de escribir una sola línea de código. Contiene todo lo necesario para entender QUÉ se está construyendo, POR QUÉ, CUÁNDO hay que entregarlo, y QUÉ restricciones técnicas y legales aplican.
>
> **Fecha de generación:** 15 de octubre de 2026 (reconstruido via Playwright MCP + webfetch sobre las fuentes oficiales).
> **Deadline crítico: 26 de octubre de 2026, 23:59 CET.**

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Qué es el challenge](#2-qué-es-el-challenge)
3. [Timeline y marco temporal](#3-timeline-y-marco-temporal)
4. [Premios y categorías](#4-premios-y-categorías)
5. [Criterios de evaluación](#5-criterios-de-evaluación)
6. [La tarea: qué hay que construir y entregar](#6-la-tarea-qué-hay-que-construir-y-entregar)
7. [Qué es una Web Lens (contexto técnico de la plataforma)](#7-qué-es-una-web-lens)
8. [Platform requirements del zip](#8-platform-requirements-del-zip)
9. [Runtime environment](#9-runtime-environment)
10. [Capabilities y restrictions del webview](#10-capabilities-y-restrictions-del-webview)
11. [Web Lens API (leaderboards, bitmoji, storage)](#11-web-lens-api)
12. [Publishing: icono y preview video](#12-publishing-icono-y-preview-video)
13. [Elegibilidad y términos legales](#13-elegibilidad-y-términos-legales)
14. [Flujo completo de participación](#14-flujo-completo-de-participación)
15. [Checklist de entrega](#15-checklist-de-entrega)
16. [Estrategia para ganar](#16-estrategia-para-ganar)
17. [Riesgos y trampas conocidas](#17-riesgos-y-trampas-conocidas)
18. [Links de referencia](#18-links-de-referencia)

---

## 1. Resumen ejecutivo

Snap Inc. y Lenslist organizan el **Snap Web Lens Game Challenge**: un hackathon para publicar juegos web dentro de Snapchat usando el nuevo flujo de publicación **Web Lens**. Prize pool total de **USD 30,000** repartido en 5 categorías con 3 ganadores cada una, más 25 menciones honoríficas de USD 200.

La entrega consiste en: **(a)** un juego web empaquetado como zip estático que corre dentro de un webview de Snapchat, **(b)** publicado vía My Lenses con icono + preview video, y **(c)** submiteado en el formulario del challenge de Lenslist. Hoy es **15 de octubre de 2026**; el deadline de submission es **26 de octubre, 23:59 CET**. Quedan ~11 días. Además la aprobación del Lens por Snap puede tardar **24–48 hs**, así que el build final debería subirse a My Lenses a más tardar el **24 de octubre** para tener margen.

Se puede usar **cualquier stack web** (Vite, PlayCanvas, vanilla JS, Three.js, etc.) o **Easy Lens** (herramienta no-code de Snap). También se pueden subir juegos ya existentes del portfolio, siempre que cumplan los requisitos.

---

## 2. Qué es el challenge

- **Nombre oficial:** Snap Web Lens Game Challenge, "Powered by Lenslist".
- **Organizer:** LENSLIST SP. Z O.O. (empresa polaca, Warsaw).
- **Sponsor:** Snap Inc. (Santa Monica, CA).
- **Página oficial:** https://lenslist.co/snap-web-lens-game-challenge
- **Términos:** https://lenslist.co/snap-web-lens-game-challenge/terms (sirve un PDF de 8 páginas directamente — no es una página HTML; en un browser puede verse en blanco, descargarlo con `curl`).
- **Formulario de submission:** https://lenslist.co/snap-web-lens-game-challenge/submit
- **Pitch oficial:** "Publish web games on Snapchat for a chance to win your share of the $30,000 prize pool."
- **Contexto estratégico:** Web Lenses están en **beta**. Snapchat tiene ~1B usuarios con ~300M Snapchatters usando Lenses por día. El challenge existe para poblar el nuevo runtime con juegos — los primeros en publicar tienen ventaja de visibilidad.

---

## 3. Timeline y marco temporal

| Evento | Fecha (hora oficial: Central Europe Time) |
|---|---|
| **Challenge Start** | 5 de octubre de 2026, 20:00 CET |
| **Submission Deadline** | **26 de octubre de 2026, 23:59 CET** |
| **Judging Period** | 27 de octubre 10:00 CET – 9 de noviembre 17:00 CET |
| **Winners Announcement** | ~10 de noviembre de 2026, 14:00 CET |
| **Payout** | Hasta 90 días después del anuncio, tras completar el Awardee Agreement (7 días para devolverlo firmado) |

Notas de timing críticas:

- El clock oficial es el del servidor del Organizer.
- **La review de Snap del Lens publicado puede tardar 24–48 hs** y NO se puede abrir un Web Lens dentro de Snapchat hasta que pase review. Cada re-upload vuelve a pasar por review. Planificar el último upload para ~24 oct o antes.
- Las fechas pueden ser modificadas por Organizer/Sponsor (cláusula de los terms).
- Hoy (15 oct) quedan **~11 días de build**. Plan sugerido: días 1–2 prototipo + setup de pipeline de zip, días 3–7 core loop + polish, días 8–9 integración Web Lens API + icono + video, día 10 upload a My Lenses + submit. Ver [sección 16](#16-estrategia-para-ganar).

---

## 4. Premios y categorías

Prize pool total: **USD 30,000** — 40 premios en total.

### 5 categorías principales (Main Prizes)

En cada categoría los jueces de Snap seleccionan top 3:

| Puesto | Premio |
|---|---|
| 1st | **$2,500** |
| 2nd | **$1,500** |
| 3rd | **$1,000** |

Las 5 categorías:

1. **Best Game Mechanic** — "The most smooth and creative gameplays with a strong core loop."
2. **Most Creative Original Concept** — "A fresh, original idea executed well."
3. **Best Use of Snap's Social Features** — "Most meaningful use of Bitmoji, Leaderboards, and Persistent Storage, shaping the experience to feel native to Snapchat."
4. **Best Game by Metrics: Long Plays** — "Most engaging games based on long play sessions." (judged principalmente por métricas reales de performance del Lens)
5. **Best Game by Metrics: Retention** — "Games Snapchatters return to most often." (ídem, métricas)

### Honorable Mentions

- **25 × $200** para standout games que no ganen categoría principal.

### Implicaciones estratégicas de las categorías

- Un mismo juego puede competir en varias categorías a la vez. Un juego con un core loop adictivo + Bitmoji + Leaderboards + Storage apunta a las 5.
- Las dos categorías "by Metrics" miden **datos reales de uso** una vez publicado el Lens — eso premia juegos que retienen y sesiones largas, y premia publicar TEMPRANO para acumular métricas durante el judging period... (ojo: el judging es post-deadline; las métricas que cuentan probablemente sean las del Lens ya publicado durante ese período).
- "Best Use of Snap's Social Features" es la categoría más ganable por diseño: exige integrar el Web Lens API de forma significativa, no cosmética.

---

## 5. Criterios de evaluación

Según los Terms (§ 6), el judging tiene **dos etapas**:

1. **Stage 1 — filtro binario** "yes/no": solo pasan al stage 2 los Entries marcados "yes". (Traducción práctica: si el Lens no abre, no cumple requisitos, o es low-effort, muere acá.)
2. **Stage 2 — scored**, con tres criterios ponderados **⅓ cada uno**:
   - **Idea Quality (⅓):** ¿Qué tan creativa y original es la idea?
   - **Game Design (⅓):** ¿Qué tan engaging y retentive es el gameplay?
   - **Implementation of Idea (⅓):** ¿Qué tan bien está implementada la idea desde el punto de vista técnico y de diseño?

Para las categorías "by Metrics" (Long Plays, Retention) las métricas de performance son el criterio principal, aunque los 3 criterios de arriba también se consideran.

Otros detalles: empates se resuelven por voto del panel; todas las decisiones son finales; el Organizer puede pedir **source files o proof of work** dentro de 7 días al awardee (¡guardar el repo limpio y presentable!).

---

## 6. La tarea: qué hay que construir y entregar

Texto oficial: "use the Web Lens publishing flow in My Lenses to post your top web games to Snapchat."

Pasos según la página del challenge:

1. **Build a web game** con cualquier web stack (ej. PlayCanvas o Vite). Alternativa: Easy Lens (no-code, describís la idea y te genera un juego publicable).
2. **Cumplir platform requirements:** `index.html` en la raíz del zip, asset paths relativos, límites de tamaño (ver sección 8).
3. **Zipear el build output.**
4. **Crear cuenta de Snapchat** si no se tiene (accounts.snapchat.com/v2/signup).
5. **Subir el zip a My Lenses** (my-lenses.snapchat.com/home) con **Lens icon** y **preview video**.
6. Snap aprueba el Lens (24–48 hs).
7. **Registrar** en el formulario de la página del challenge Y **submit** el Lens en `/submit` (dos formularios distintos — ver sección 14).

"Snapchat handles the rest."

### Entregables concretos (checklist maestro)

- [ ] Repo del juego (cualquier stack) que buildea a un `dist/` estático
- [ ] `dist/` zipeado cumpliendo platform requirements (≤8 MB, `index.html` ≤1 MB en raíz, paths relativos, forward slashes)
- [ ] Integración `@snap/web-lens-api`: leaderboards + bitmoji + storage (apunta a categoría Social Features y mejora retención)
- [ ] Lens icon: PNG 512×512, sujeto centrado, sin texto, fondo opaco
- [ ] Preview video: MP4 720×1280, 5 s, H.264+AAC, 30fps, faststart — para My Lenses; el form de submission pide además un video link (YouTube/Drive) de hasta 60 s
- [ ] Lens publicado y aprobado en My Lenses (Link to your Lens — snapchat.com/lens/... o similar)
- [ ] Registration form completado (lenslist.co/snap-web-lens-game-challenge#register)
- [ ] Submission form completado (lenslist.co/snap-web-lens-game-challenge/submit)

---

## 7. Qué es una Web Lens

Una **Web Lens** es un **zip de un static web build** que Snapchat descomprime y sirve, cargando `index.html` en un **webview full-screen dentro de la app de Snapchat, en teléfono, en portrait**. No es un Lens de AR con cámara — es literalmente una página web empaquetada corriendo dentro de Snapchat.

- No recibe camera feed, no hay sensores de movimiento, no hay red.
- Las features "Snapchat-native" (leaderboards, Bitmoji del jugador, persistent storage) se acceden vía el paquete JS `@snap/web-lens-api`, no por red.
- Todo lo que está en beta: los docs avisan que límites y políticas "can change before public release". Re-chequear los docs antes del upload final.
- Los usuarios encuentran el Lens por nombre o scaneando su Snapcode, como cualquier otro Lens.

**Implicación de diseño #1:** es un juego mobile portrait de una mano (un pulgar), sesiones cortas, time-to-first-play crítico. Pensar "hypercasual" salvo que el concepto pida otra cosa.

---

## 8. Platform requirements del zip

Fuente: https://developers.snap.com/web-lenses/requirements

### Entry point
- `index.html` **en la raíz del zip**, no dentro de una carpeta. Error típico: zipear la carpeta `dist/` en vez de su contenido.
- `index.html` ≤ **1 MB**. Mantenerlo como entry point flaco que referencia archivos separados; no inlinear todo el bundle ni data URLs grandes.

```
my-web-lens.zip          ✅              my-web-lens.zip        ❌
├── index.html                            └── dist/
└── a/                                        ├── index.html
    ├── game.js                               └── a/…
    └── index.css
```

### Relative asset paths
- Toda referencia debe ser relativa: `./a/game.js`, nunca `/a/game.js` (la URL de hosting no se controla y difiere entre review y producción).
- Vite: `base: './'` en `vite.config.js`. Otros bundlers: equivalente public-path.
- Verificación post-build: `grep -E 'src="/|href="/' dist/index.html` — si imprime algo, el Lens va a mostrar pantalla en blanco.
- Misma regla para fetches en runtime: `fetch('./data/levels.json')`.

### Zip path separators
- Los entries del zip deben usar `/`. `Compress-Archive` de PowerShell y `ZipFile` de .NET escriben `\` — no usar. `zip -r` en macOS/Linux está bien; para scripting cross-platform usar `archiver` de npm.
- Verificar con `unzip -l my-web-lens.zip`.

### Size limits
- **Zip ≤ 8 MB** (comprimido).
- `index.html` ≤ 1 MB.
- Cheap wins: no sourcemaps (`build.sourcemap: false`), audio pack en un solo archivo con slices, comprimir texturas, tree-shake el engine, preloads paralelos.

### Checklist oficial pre-upload
- `index.html` en raíz del zip
- Todos los paths empiezan con `./`
- `unzip -l` muestra solo forward slashes
- zip ≤ 8 MB, `index.html` ≤ 1 MB
- Probado en teléfono en portrait, no solo desktop

---

## 9. Runtime environment

Fuente: https://developers.snap.com/web-lenses/runtime-environment

- **Portrait, full screen, 9:16.** Landscape no soportado; no intentar lockear orientación. Canvas sized from window + resize handler. `maxPixelRatio = min(devicePixelRatio, 2)` para cuidar fill-rate en displays 3x.
- **Safe-area insets:** Snapchat dibuja sus controles (incluido botón de close) sobre el contenido; el top inset es **mucho más grande que el notch**. Usar `env(safe-area-inset-*)` via CSS custom properties + `viewport-fit=cover`. Ojo: padding en un ancestor posicionado no mueve hijos `position:absolute` — aplicar el `env()` en el elemento mismo. **No se puede testear el inset real fuera de Snapchat** — simularlo en dev con `--inset-top: 120px`.
- **Refresh rate:** `requestAnimationFrame` corre al display rate (120 Hz posible). Escalar movimiento por delta-time o fixed-timestep con interpolación; clamplear elapsed time tras pausas.
- **Pointer input:** un pulgar en touchscreen. Pointer events (no mouse events), `touch-action: none`, `overscroll-behavior: none`, `preventDefault` en `contextmenu`. Normalizar distancias de drag por `window.innerWidth`.
- **Haptics:** `navigator.vibrate` solo en Android y solo tras primer gesture; no-op en iOS. Guardar con `navigator.userActivation?.hasBeenActive`.
- **Audio:** no arranca antes del primer user gesture — crear/resumir `AudioContext` dentro del primer tap handler. Snapchat puede mandar el webview a background sin unload: pausar juego + suspender audio en `visibilitychange`, resetear el acumulador de fixed-timestep al volver.
- **Storage:** cada launch es un **browsing store fresco y aislado** — `localStorage`/IndexedDB/cookies funcionan dentro de la sesión pero se borran al cerrar el Lens. Para persistencia entre launches usar la capability `storage` del Web Lens API.
- **Loading:** "Snapchatters decide within seconds" — time to first play es la métrica de performance más importante. Zip chico, `<link rel="preload">` para assets críticos, background del `index.html` igual al clear color de la escena (evitar flash blanco), generar en boot solo lo que necesita la primera pantalla.

---

## 10. Capabilities y restrictions del webview

Fuente: https://developers.snap.com/web-lenses/capabilities

**Todo shippea en el zip.** CSP estricto: nada de scripts/styles/fonts/imágenes/audio/video externos. `fetch`/`XHR` solo a archivos dentro del zip. **WebSocket y WebRTC bloqueados.** Sin APIs web, sin remote config, sin analytics, sin game server — diseñar 100% offline.

### Permitido
- Inline scripts y styles (output de bundlers funciona tal cual)
- `eval()` y `new Function()` (engines que los usan funcionan)
- **WebAssembly** incl. streaming compilation; la página es cross-origin isolated → `SharedArrayBuffer` y WASM multi-thread disponibles
- Web Workers (desde archivo del zip o `blob:`)
- Imágenes `data:`/`blob:` (texturas generadas en runtime OK)
- Fonts embebidas en el zip o como `data:` URLs
- `navigator.vibrate` (solo Android webview lo implementa)

### Bloqueado
- **Camera y mic** — el Web Lens no recibe camera feed (no es AR)
- **Sensores de movimiento** (acelerómetro, gyro, magnetómetro) — nada de tilt controls
- Geolocation, payments, USB, MIDI
- **Toda red**, incl. WebRTC
- `<iframe>` (no puede embed ni ser embedded)
- Form submission (forms no pueden enviar datos a ningún lado)
- Elemento `<base>` y web app manifests
- Plugins, `<object>`, `<embed>`
- Persistencia real de `localStorage`/IndexedDB entre sesiones (ver sección 9)

### File types (media type por extensión)
- Soportados con tipo correcto: `.html/.htm`, `.js/.mjs`, `.css`, `.json`, `.wasm`, `.png/.jpg/.jpeg/.gif/.webp/.svg`, `.mp3`, `.mp4`, `.ttf/.otf/.woff/.woff2`, `.bin/.data`
- Scripts DEBEN terminar en `.js`/`.mjs` y styles en `.css` o el browser los rechaza (importante para ES modules).
- Otros assets (`.glb`, `.ktx2`…) se sirven como binary genérico y se leen con `fetch` — OK, el código decide cómo parsearlos.
- **Reserved paths:** nada bajo `/__snap/`.

---

## 11. Web Lens API

Fuente: https://developers.snap.com/web-lenses/web-lens-api (+ páginas de leaderboards, bitmoji, storage, api-reference)

- Paquete npm: `@snap/web-lens-api`. Debe shippear **dentro del zip** (CSP bloquea scripts por URL). Sin bundler: copiar `dist/snap-api.js` del package y `<script src="./snap-api.js">` → expone `window.snapchat`.
- `await snapchat.init()` al startup; luego `snapchat.isSupported('leaderboards')` etc. Chequear capability, no plataforma. El juego debe seguir siendo jugable si una capability falta.
- Capabilities: **leaderboards** (submit score + abrir leaderboard del Lens), **bitmoji** (avatar 3D o imagen del jugador dentro del juego), **storage** (guardar progreso/settings entre launches).
- Errores: promises que reject con códigos en `snapchat.errors` (`ERR_UNKNOWN_CAPABILITY`, `ERR_INVALID_PARAMS`, `ERR_INTERNAL`, `ERR_QUOTA_EXCEEDED`, `ERR_STORAGE_UNAVAILABLE`, `ERR_UNSUPPORTED_HOST`, `ERR_MALFORMED_REQUEST`). Comparar contra códigos, no parsear texto.
- **Stub de desarrollo:** fuera de Snapchat el API responde con stub built-in (`snapchat.isStub === true`), data canned, mismos códigos de error en params malos. NO reproduce: player sin Bitmoji, media URLs expiradas, ERR_INTERNAL, storage que sobrevive restart, límites de calls in-flight, avatar 3D real → codear fallbacks para todo eso.
- PlayCanvas Editor: subir `snap-api.js` como script asset con Loading Type "Before Engine"; NO usar Settings > External Scripts (eso carga por URL → bloqueado).
- La API está en beta; el interface puede cambiar antes de v1.0.

**Estratégicamente:** integrar las 3 capabilities es casi obligatorio — hay una categoría entera de premio dedicada a eso (Best Use of Snap's Social Features) y storage/leaderboards mejoran retención (otras 2 categorías por métricas).

---

## 12. Publishing: icono y preview video

Fuente: https://developers.snap.com/web-lenses/publishing

Upload en **My Lenses** → New Lens → opción "Web Lens" → zip + name + icon + preview video → Submit for review.

- **Review:** mismo proceso que otros Lenses; aplican Lens submission guidelines. No hay forma de abrir un Web Lens dentro de Snapchat antes de aprobación, y **cada upload nuevo repite review**. Batch changes; no submitir fix por fix.
- **Icono:** **512×512 PNG**, se muestra dentro del círculo del Snapcode (esquinas cropeadas). Sujeto centrado, todo lo importante dentro de ~80% del radio; fondo que llene el cuadrado completo (sin transparencia ni vignette); un sujeto claro, silueta fuerte, color saturado, alto contraste; **sin texto**; juzgarlo a ~100px de ancho. Es un anuncio de tap, no un screenshot; no misleading.
- **Preview video:** **720×1280, 5 segundos, H.264 + AAC en MP4, 30fps CFR, flag `faststart`**. Mostrar el momento más excitante del juego (no un arranque de partida fría); un ciclo completo del core loop; sin deaths ni transiciones mid-clip. Comando ffmpeg sugerido en los docs:
  ```
  ffmpeg -i capture.webm -ss 2 -t 5 -vf "scale=720:1280,fps=30" -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart preview.mp4
  ```
  Si el juego dibuja HUD en DOM sobre canvas, `canvas.captureStream()` graba solo el canvas — compositear el HUD o planear clip limpio. Chequear el resultado como contact sheet de frames.
- **Versioning:** versión en el filename (`my-game-v3.zip`); regenerar icon+video cuando cambia el look; re-zip tras cualquier cambio de source.
- El form de submission del challenge pide además un **"Lens Video Preview" link** (YouTube/Google Drive) y los terms exigen demo video **< 60 segundos**.

---

## 13. Elegibilidad y términos legales

Del PDF de Terms (8 págs). Puntos que importan:

### Quién puede participar
- Individuos en edad de mayoría legal de su país de residencia. (Diego: verificar edad/país — la lista de exclusiones está abajo.)
- **No pueden participar** residentes de: American Samoa, Anguilla, Dominica, Fiji, Guam, Palau, Panama, Samoa, Trinidad and Tobago, US Virgin Islands, Vanuatu, Seychelles (lista EU non-cooperative) + países bajo sanciones OFAC — explícitamente **Russia, Belarus, Crimea, Donetsk/Luhansk, Cuba, North Korea, Iran, Syria**.
- No empleados de Snap/Lenslist ni familiares/cohabitantes; government officials solo a título personal.
- **Teams:** permitidos ("Creator Team"); el que submitte es el Team Leader y recibe el premio (Organizer no distribuye entre miembros).

### Requisitos del Entry (§5.8 — descalificación si no cumple)
- Trabajo **original**, creado por vos (o tu team).
- **No** haber sido previamente licenciado, vendido, publicado, distribuido o explotado comercialmente — **PERO** la página del challenge sí permite "top games from your portfolio" y los terms dicen que se aceptan juegos hechos antes del anuncio "provided your Entry fits the Hackathon theme and meets the requirements". Interpretación práctica: juegos previos propios OK si no fueron explotados comercialmente ni ganaron premios.
- No haber ganado ningún award previo.
- Sin infringir IP de terceros; **sin referencias a marcas/productos/servicios de terceros** (nada de logos, trade dress, promoción de brands).
- Materiales en inglés (o con traducción al inglés del video/descripción).
- **Demo video < 60 segundos.**
- El Work debe estar **publicado en la cuenta de Snapchat del Entrant**.
- Seguir Lens Studio Submission Guidelines.
- **Múltiples Entries permitidos** por Entrant, pero deben ser "substantially different" entre sí.

### IP y licencias (§8 — leer bien)
- Los Entries **siguen siendo propiedad intelectual del autor**.
- Al participar se **waive moral rights** y se grantea a Snap/Lenslist una **licencia irrevocable, transferible, sublicensable, no-exclusiva, gratuita, mundial** para reproducir/distribuir/mostrar/editar/crear derivados del Entry y usar nombre/imagen del Entrant — para cualquier propósito incl. publicidad. O sea: conservás la IP pero Snap puede usar tu juego y tu imagen para marketing para siempre.
- El Organizer puede pedir **source files / proof of work** (7 días).
- Pago: Awardee Agreement a devolver firmado en 7 días; pago dentro de 90 días del anuncio; cuenta bancaria válida requerida; impuestos polacos flat-rate 10% (o 20% si actividad artística profesional) salvo certificado de residencia fiscal + treaty (presentar dentro de 45 días del anuncio).
- Datos personales: consentimiento de procesamiento; privacidad de Snap rige también.
- Confirmaciones por email tras registro y submission (checkear spam; reintentar o escribir a info@lenslist.co).

### Formularios del challenge (campos reales, verificados en el DOM)

**Registration** (`#register` en la página principal): First Name, Last Name, Email, Country of Residence (select), Snapchat Username, Instagram handle (opcional), TikTok handle (opcional), "How did you hear about this hackathon?" (select: Social media / Email from Lenslist / Direct message from Lenslist / Discord / Other Lens Creators), 3 checkboxes de consentimiento (Terms, Privacy Policy, data processing).

**Submission** (`/submit`): First Name, Last Name, Email, **Lens Name**, **Link to your Lens**, **Lens Video Preview** (link YouTube/Google Drive), Lens description (opcional), 3 checkboxes de consentimiento.

---

## 14. Flujo completo de participación

```
1. REGISTER        → form en lenslist.co/snap-web-lens-game-challenge#register
2. BUILD GAME      → cualquier stack (Vite/PlayCanvas/vanilla) o Easy Lens
3. SNAP ACCOUNT    → accounts.snapchat.com/v2/signup (si no existe)
4. SNAP-NATIVE     → integrar @snap/web-lens-api (leaderboards/bitmoji/storage)
5. PACKAGE         → zip del dist/ cumpliendo platform requirements
6. PUBLISH         → My Lenses: zip + icon 512² + preview video 720×1280 5s
7. REVIEW          → esperar aprobación de Snap (24–48 hs, iterar si rechaza)
8. PREVIEW VIDEO   → demo <60s subido a YouTube/Drive (link para el form)
9. SUBMIT          → form en lenslist.co/snap-web-lens-game-challenge/submit
                     ANTES del 26 oct 23:59 CET
```

Soporte durante el build: canal **#games en Discord** → https://discord.gg/MAgyD64hte

---

## 15. Checklist de entrega

### Build & zip
- [ ] `index.html` en la RAÍZ del zip, ≤1 MB
- [ ] `base: './'` (Vite) o equivalente; `grep -E 'src="/|href="/' dist/index.html` no devuelve nada
- [ ] Todos los fetches runtime con `./`
- [ ] `unzip -l` → solo `/` en paths
- [ ] Zip ≤ 8 MB
- [ ] Sin sourcemaps, assets comprimidos, preload de críticos
- [ ] Nada externo (no CDN fonts, no analytics, no API calls, no WebSocket)
- [ ] Nada bajo `/__snap/`, sin `<base>`, sin manifest, sin iframes
- [ ] Scripts `.js`/`.mjs`, styles `.css`

### Runtime
- [ ] Portrait 9:16, canvas resize on window resize, pixelRatio ≤2
- [ ] `viewport-fit=cover` + safe-area insets en custom props; HUD testeado con `--inset-top: 120px` simulado
- [ ] Delta-time o fixed timestep (120Hz safe) + clamp post-pausa
- [ ] Pointer events, `touch-action:none`, `overscroll-behavior:none`, contextmenu suprimido
- [ ] Audio arranca dentro del primer gesture; `visibilitychange` pausa juego+audio
- [ ] `navigator.vibrate` guardado (solo Android, post-gesture)
- [ ] Persistencia SOLO via `snapchat.storage` (localStorage no sobrevive launches)
- [ ] Background del HTML = clear color (no white flash); time-to-first-play < ~2s en teléfono

### Snap API
- [ ] `snapchat.init()` + `isSupported()` gating + fallbacks cuando falta capability
- [ ] Leaderboards: submit score + botón para abrir leaderboard
- [ ] Bitmoji: avatar o imagen integrada de forma significativa
- [ ] Storage: progreso/high-score/settings entre launches
- [ ] Manejo de errores por código (`snapchat.errors.*`)

### Publishing
- [ ] Icon 512×512 PNG (sujeto centrado ≤80% radio, sin texto, fondo opaco)
- [ ] Preview video 720×1280 MP4 5s 30fps faststart (mejor momento del loop)
- [ ] Zip filename versionado
- [ ] Lens aprobado en My Lenses (buffer 24–48 hs → subir ≤24 oct)
- [ ] Demo video <60s linkeable (YouTube/Drive)

### Challenge admin
- [ ] Registration form completado (Snapchat username, país, email)
- [ ] Lens publicado en la propia cuenta de Snapchat
- [ ] Submission form completado con link al Lens + link video
- [ ] Emails de confirmación recibidos (x2)
- [ ] Repo/source limpio y archivado (pueden pedirlo en 7 días)

---

## 16. Estrategia para ganar

Considerando los criterios (⅓ idea, ⅓ diseño/retención, ⅓ implementación) y las 5 categorías:

1. **Un solo juego excelente que apunte a todo** > varios juegos mediocres. (Aunque se permiten múltiples entries "substantially different" — si sobra tiempo, un segundo entry chico no cuesta el registro extra.)
2. **Core loop hipercasual adictivo:** una mecánica de un pulgar, sesiones de 30–90s, "one more try" inmediato. Gana Best Game Mechanic + alimenta Long Plays/Retention.
3. **Snap-native de verdad:** Bitmoji del jugador como personaje o avatar visible, leaderboard global/amigos al final de cada run, storage para high-score/progreso/cosméticos. Eso es exactamente lo que pide "Best Use of Snap's Social Features".
4. **Originalidad:** la categoría "Most Creative Original Concept" premia ideas frescas — evitar clones genéricos de Flappy/2048 salvo con twist fuerte.
5. **Time-to-first-play:** la doc de Snap repite que "Snapchatters decide within seconds". Boot instantáneo → primer tap → gameplay. Esto impacta las métricas reales.
6. **Retención por diseño:** daily reward, unlockables, score chasing con leaderboard, streaks — mecanismos que hacen volver (Retention).
7. **Shippear temprano a My Lenses:** buffer para review y para iterar si rechazan. Un Lens aprobado publica y acumula métricas durante el judging period.
8. **Preview video que vende:** 5 segundos del momento peak, es la primera impresión de jueces y usuarios.

---

## 17. Riesgos y trampas conocidas

| Riesgo | Mitigación |
|---|---|
| Zip mal armado (carpeta dist/ adentro, paths absolutos, backslashes) | Checklist sección 8; `unzip -l` + grep post-build; script `tools/pack.mjs` con archiver |
| Review tarda 24–48 hs y cada re-upload repite | Último upload ≤24 oct; testear exhaustivamente antes de subir |
| No se puede probar el Lens real dentro de Snapchat pre-review | Simular inset 120px, testear en browser mobile real del teléfono (servir dist/ en LAN), usar el stub del API |
| Pensar que localStorage persiste | No persiste entre launches — usar `snapchat.storage` |
| Audio no suena | Crear AudioContext dentro del primer tap |
| Juego corre 2× rápido en 120Hz | Delta-time/fixed-timestep |
| Asumir sensores/cámara/red | Todo bloqueado — diseñar alrededor desde el día 1 |
| Los terms prohíben "comercialmente explotado" pero la página permite "portfolio games" | Si se reusa un juego propio: que no haya sido vendido/licenciado ni ganador de premios |
| Licencia amplísima a Snap sobre el Entry (§8.3) | Aceptar conscientemente; no meter IP que no quieras licenciar gratis a Snap |
| Impuestos polacos 10–20% sobre el premio | Si se gana, conseguir certificado de residencia fiscal dentro de 45 días |
| Beta: límites/políticas pueden cambiar antes del release público | Re-leer docs de requirements/capabilities/publishing el día del upload final |
| Sources pueden ser pedidos (7 días) | Repo ordenado, commits limpios, README |
| Form de submission pide video link (YouTube/Drive) además del preview MP4 del Lens | Son dos videos distintos: 5s para My Lenses, <60s demo para el form |

---

## 18. Links de referencia

### Challenge
- Landing: https://lenslist.co/snap-web-lens-game-challenge
- Terms (PDF): https://lenslist.co/snap-web-lens-game-challenge/terms
- Submit form: https://lenslist.co/snap-web-lens-game-challenge/submit
- Discord soporte (#games): https://discord.gg/MAgyD64hte
- Contacto Organizer: info@lenslist.co

### Snap platform
- My Lenses: https://my-lenses.snapchat.com/home
- Signup Snapchat: https://accounts.snapchat.com/v2/signup
- Easy Lens (no-code): https://easylens.snapchat.com/web-lenses
- npm package: `@snap/web-lens-api`

### Docs Snap Web Lenses
- Get started: https://developers.snap.com/web-lenses/get-started
- Platform requirements: https://developers.snap.com/web-lenses/requirements
- Runtime environment: https://developers.snap.com/web-lenses/runtime-environment
- Capabilities & restrictions: https://developers.snap.com/web-lenses/capabilities
- Web Lens API: https://developers.snap.com/web-lenses/web-lens-api
- Leaderboards / Bitmoji / Storage / API reference: bajo https://developers.snap.com/web-lenses/
- Publishing: https://developers.snap.com/web-lenses/publishing
- Lens submission guidelines: https://developers.snap.com/lens-studio/publishing/submitting/submission-guidelines
- Privacy Policy Lenslist: https://media.lenslist.co/wp-content/uploads/2024/11/Privacy-Policy-LENSLIST__v2024.pdf

---

*Documento generado por Devin a partir de extracción en vivo (Playwright MCP sobre lenslist.co + PDF de terms + webfetch sobre developers.snap.com) el 15/10/2026. Si un agente futuro retoma esto cerca del deadline, re-verificar fechas y requirements contra las fuentes — la plataforma está en beta y los docs avisan que pueden cambiar.*

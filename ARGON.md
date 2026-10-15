# ARGON.md — Cómo usar Gemini 4 "Argon" para construir los juegos del Web Lens Challenge

> **Contexto:** Somos senior game devs construyendo un juego web para el Snap Web Lens Game Challenge (ver `CONTEXT.md` primero — deadline **26 oct 2026 23:59 CET**). Este documento condensa la guía oficial de Google "Building 3D Games and Procedural Worlds with Gemini 4 Argon" (publicada 13 oct 2026), el repo open-source `ammaarreshi/argon-games` (clonado en `resources/argon-games/`), y las listas de herramientas curadas en X. Luego los juegos se portan/publican como Web Lenses (Snapchat webview) o eventualmente a Lens Studio.
>
> **⚠️ OJO — Nuestro entorno es DEVIN, no Antigravity.** La guía oficial está escrita para Antigravity (el IDE agéntico de Google) y usa comandos slash propios de ese IDE: `/grill-me` (entrevista clarificadora) y `/goal` (loop autónomo largo). **Nosotros trabajamos en Devin con el modelo Argon** — esos comandos NO existen acá. En cada workflow de abajo está marcado el equivalente en Devin. En resumen:
>
> | Concepto de la guía (Antigravity) | Equivalente en Devin |
> |---|---|
> | `/grill-me` — el agente te entrevista antes de codear | Pedirlo en texto: "entrevistame con preguntas antes de escribir código" — Devin tiene `ask_user_question` y Plan Mode para esto |
> | `/goal` — loop autónomo largo con objetivo medible | Sesión de Devin normal con un brief detallado en el prompt inicial + todo list; Devin ya corre autónomamente |
> | Parallel subagents | `run_subagent` (background) o simplemente milestones secuenciales |
> | Critic subagent adversarial | Pedir "lanzá un subagente crítico que puntúe screenshots" — `run_subagent` con prompt de crítica |
> | `progress.html` screenshot gallery | Igual — Devin levanta el server y saca screenshots via Playwright MCP |
> | Nano Banana (image gen de Google) | No hay MCP de image-gen configurado; Diego puede generar mocks en AI Studio/Gemini app y pegarlos, o se omite el paso |
>
> **Fuentes:**
> - Thread de Ammaar Reshi (Google AI Studio): https://x.com/ammaar/status/2110057926799073462 — 6 juegos hechos con Argon "one shot", con código abierto.
> - Patrick Loeber (Gemini API / AI Studio MTS): https://x.com/patloeber/status/2110404172726047107 — links a las guías oficiales.
> - Guía oficial 3D games: https://aistudio.google.com/learn/building-3d-games-and-worlds-with-gemini-4-argon
> - Dev guide: https://aistudio.google.com/learn/gemini-4-argon-developer-guide
> - What's new + migration checklist: https://aistudio.google.com/docs/latest-model
> - Long decode (1M output): https://aistudio.google.com/docs/long-decode
> - Repo showcase: https://github.com/ammaarreshi/argon-games (clonado en `resources/argon-games/`)
> - Listas de repos de @Mnilax: https://x.com/Mnilax/status/2110039818524660135 (game studio con Claude Code) y https://x.com/Mnilax/status/2109716261160538324 (3D studio open-source).

---

## 1. Qué es Argon y por qué sirve para juegos

**Gemini 4 "Argon"** es el modelo de Google (ID de API: `gemini-4-argon`, SDK: `google-genai`) optimizado para generación de código 3D y builds largos. Tres capacidades lo hacen bueno para juegos según la guía oficial:

1. **1M-token context + output window** — planea, escribe codebases 3D multi-archivo grandes e itera autónomamente por tramos largos sin perder la arquitectura. El long-decode guide documenta outputs de hasta 1M tokens.
2. **Multimodal nativo** — lee fotos, sketches en servilleta, concept mocks y **sus propios screenshots renderizados** para razonar sobre espacio 3D, iluminación y proporciones.
3. **División de trabajo** — vos das dirección creativa y gusto visual; Argon maneja la matemática de coordenadas 3D, física, óptica de cámara y geometría de meshes.

**Dónde usarlo** (de la tabla oficial de la guía):

| Herramienta | Para qué | Stack |
|---|---|---|
| **AI Studio Build Mode** (`ai.studio/build`) | Web games 3D self-contained, escenas procedurales, shaders WebGPU interactivos, prototipos rápidos en el browser | Three.js (WebGL/WebGPURenderer), React Three Fiber, raw WebGPU |
| **Antigravity** (IDE agéntico de Google) | Juegos multi-archivo, loops `/goal` largos, subagentes en paralelo, screenshot checks automatizados, pipelines con Blender local | Vite + Three.js + headless Blender MCP + headless browser screenshots |
| **API / custom harness** | Pipelines multi-agente propios, generación de assets automatizada, workflows dinámicos in-game | `gemini-4-argon` con tool calling + modelos genmedia (Nano Banana para imágenes, Lyria para audio) |
| **Devin (nuestro entorno)** | Equivalente al slot de Antigravity: juegos multi-archivo, sesiones largas autónomas, Playwright MCP para screenshots/verificación | Vite + Three.js en este repo; ver tabla de equivalencias arriba |

**Para nuestro challenge:** trabajamos directo en Devin sobre este repo con Vite + Three.js (lo que el zip del challenge necesita). AI Studio Build Mode queda como opción para prototipos descartables rápidos o concept mocks visuales que Diego genere a mano.

---

## 2. Playbook oficial: los 6 workflows de la guía de Google

Estos son los workflows que los engineers de Google usaron "across hundreds of 3D builds". Los prompts son copy-paste adaptados.

### Workflow 0 — elegir stack: Three.js vs headless Blender MCP

- **Solo Three.js** alcanza para: browser games, paisajes procedurales, mundos low-poly/estilizados, escenas arquitectónicas, visuales shader-heavy (agua, partículas, criaturas bioluminiscentes). Argon genera geometría procedural, iluminación y física sorprendentemente rica en puro código Three.js.
- **Sumar Blender headless** cuando la escena necesita *hero models* bespoke de alto detalle (vehículos esculpidos, tallados arquitectónicos). No necesitás saber Blender: Argon escribe los scripts Python, exporta `.glb` y los carga en Three.js.
- **Para Web Lens:** `.glb` se puede shippear dentro del zip (se sirve como binary, se lee con fetch + GLTFLoader). Pero ojo con el límite de 8MB — preferir procedural/low-poly.

### Workflow 1 — Alinear dirección creativa ANTES de código

Argon corre autónomamente por mucho tiempo — unos minutos de alineación upfront evitan que todo ese esfuerzo vaya a una visión equivocada.

- **Inputs visuales:** subir fotos reales de la escena, sketches, o video walkaround. Si no hay, pedirle a Argon que investigue y genere **concept renders con Nano Banana** para revisar en chat — la forma más rápida de alinear lighting, escala y mood antes de escribir 3D.
- **Entrevista antes de codear:** en Antigravity es `/grill-me`. **En Devin:** pedirlo literal — *"Antes de escribir código, entrevistame con preguntas clarificadoras sobre cámara, escala, mecánicas y estilo"* — y/o arrancar la sesión en **Plan Mode** para que Devin explore y pregunte sin tocar archivos.
- **El brief autónomo largo (≈`/goal`):** en vez de un comando, es el **prompt inicial de la sesión de Devin**: objetivo medible + milestones + constraints. Que el propio agente draftee ese brief una vez alineada la visión ("escribime el brief completo que te voy a pegar en una sesión nueva"). Ahí se puede incluir generación de texturas seamless (madera, metal, asfalto — via Nano Banana si Diego genera las imágenes, o procedural) para que las superficies no parezcan plástico.
- **Prompt template adaptado a Devin:**
  ```
  We're going to build [descripción del juego] using [referencias]. Do NOT write any
  code yet — interview me first with clarifying questions (use ask_user_question).
  Once I approve the concept and answer your questions, write a comprehensive PLAN.md
  with clear milestones, then a self-contained "session brief" I can paste into a fresh
  Devin session to run the build autonomously for a long time.
  ```

### Workflow 2 — Subagentes en paralelo

Pedirle al agente que orqueste parallel subagents para partes independientes del build (mundo, personajes, física, audio, UI). En el ejemplo Desk Racer, Argon orquestó subagents sobre Blender MCP y corrió checks matemáticos de intersección para que 68 pilares apoyaran flush sin clipping.

- **En Devin:** `run_subagent` con `is_background: true` para partes en paralelo con ownership disjunto (ej. un agente hace `src/world.js`, otro `src/audio.js`). O milestones secuenciales si el juego es chico — no sobre-ingenierizar.

### Workflow 3 — Critic subagent adversarial

Decirle a un modelo "mejorá tu trabajo" suele morir en la ronda 2 con auto-congratulación. En cambio: **invocar un Critic subagent separado al final de cada ronda** — parte neutral que inspecciona screenshots renderizados desde múltiples ángulos de cámara, puntúa la escena y la devuelve para fixes hasta que supere una barra alta (ej. 9/10).

- **Prompt template:** pedir explícitamente "spawn a separate critic subagent at the end of each round to inspect rendered screenshots from multiple camera angles, score the scene, and send it back for fixes until it rates 9/10 or higher."
- **En Devin:** `run_subagent` (profile `subagent_explore` alcanza si solo inspecciona y reporta) con un prompt de crítica, screenshots tomados con Playwright MCP del server local corriendo.

### Workflow 4 — Herramientas para mantenerte en el asiento de art director

- **Live screenshot gallery (`progress.html`):** Argon guarda screenshots después de cada milestone en una página HTML simple, con títulos y versiones, para revisar la evolución y corregir dirección.
  ```
  After each milestone, save screenshots from our main camera angles into a progress.html gallery so I can review the creative direction and give feedback. Clearly title all images and versions.
  ```
- **Sliders/debug controls:** pedir on-screen controls precisos (sun angle, light intensity, material roughness, camera distance). Vos tuneás en tiempo real, copiás los settings como JSON (o screenshot), Argon los hardcodea y **remueve los controles antes de ship**.

### Workflow 5 — Nano Banana como target fotorrealista

Tunear lighting/materiales a ciegas se estanca porque el modelo no tiene un target visual con tu framing exacto. Fix:

1. El agente saca screenshots limpios de la escena actual desde ángulos clave — **ocultando todo UI/HUD primero** (el image model puede interpretarlos como carteles flotantes en el mundo 3D). En Devin: Playwright MCP sobre el server local.
2. Cada screenshot → Nano Banana genera versión 2K fotorrealista que mejora lighting, texturas, agua, atmósfera **manteniendo cámara y layout exactos**. **En Devin no hay MCP de image-gen configurado** — Diego lo corre a mano en Gemini/AI Studio y droppea los PNGs en el repo.
3. Esos renders vuelven al agente junto con los screenshots actuales: comparar side-by-side, identificar diferencias, e iterativamente upgradear geometría/materiales/lighting reales hasta matchear el target.

### Workflow 6 — Grounding de proporciones con plano 2D (builds complejos)

- Pedir un **floorplan 2D top-down con medidas en metros** (archivo `.svg`) primero, verificar layout de cuartos/columnas/caminos, y extruir el 3D desde ese plano.
- Overlay de **grid X/Y numerado** sobre fotos de referencia para leer proporciones y alineaciones exactas.
- Calcular **camera angle y horizon line** de la foto antes de modelar, para que el 3D line up 1:1 con el framing original.
- **Prompt template:**
  ```
  Look at these reference photos. Because this build needs to be spatially exact, do not generate 3D meshes yet. First, generate a top-down 2D floorplan as an .svg file with meter dimensions (and overlay a numbered X/Y grid on the reference photos) to map out the exact size and position of every major element. Once we verify the 2D proportions, use those coordinates to build the 3D scene.
  ```

### Caso de estudio: Desk Racer (cómo lo hizo el autor de la guía, en Antigravity)

1. Subió fotos de su escritorio + `/grill-me` → Argon lo entrevistó, Nano Banana mockeó el track design y texturas, salió un plan + `/goal`. *(En Devin: Plan Mode + entrevista + brief de sesión.)*
2. Corrió el `/goal` que Argon drafteó → subagentes paralelos en Blender MCP + checks de intersección matemáticos.
3. Iteró con objetivos más ambiciosos: física de manejo, fidelidad de objetos, lighting de videojuego, expandir la escena al resto del cuarto. Argon verificaba cada iteración con screenshots automatizados.
4. **Truco de escala:** el kart se sentía cramped a escala `1:87`; un prompt lo cambió a `1:150` moviendo la chase camera más cerca — mismo tamaño de kart en pantalla, pista 2× más ancha, objetos de escritorio gigantes. One shot.

---

## 3. El showcase: `argon-games` (repo clonado en `resources/argon-games/`)

6 juegos 3D completos hechos por Ammaar Reshi con Argon en AI Studio Build, todos con Three.js + GLSL custom + Web Audio espacial, **cero dependencias de engine externas** — corren directo en browser. (Nota: el tweet prometía "prompts and code" pero el repo solo trae código + READMEs; los prompts no están publicados.)

| Juego | Género | Tech highlights | Run local |
|---|---|---|---|
| **Argon Tennis** (hero) | Arcade tennis 3D | Shot shaping (topspin/slice/lob/flat), slow-mo serves, replay cam, **companion.html** que convierte un teléfono en racket gyro 60Hz via QR, webcam hand-tracking, 1v1 multiplayer | `cd argon-tennis && python3 server.py --port 8080` |
| **Argon Valley** | Island life sim cozy | Rolling-horizon vertex shader (mundo curvo cilíndrico), day-night sky, fishing/bug-catching/crafting, villagers | `python3 server.py --port 8083` |
| **The Corridor** | Horror psicológico 1ra persona | Three.js + shader post-proc VHS 35mm, cono de flashlight volumétrico, puzzle de foto rota, 5 loops de corredor que mutan | `python3 server.py --port 8085` |
| **Grand Theft Argon** | Open-world cel-shaded 1986 | Ink outlines estilo comic, autos/botes/helicópteros, hotwiring mini-games, policía 6 estrellas, mundo procedural infinito | `python3 -m http.server 8082` |
| **Argon Towers** | Tower defense 2.5D | Cada torreta rerutea el ejército enemigo con A* dinámico en tiempo real, anti-blocking con preview de path, 100 waves | `python3 -m http.server 8084` |
| **Argon Airspace** | Air traffic control 1950s | Drag de approach paths Catmull-Rom multi-touch a runways color-coded, PA callouts, música big-band | `python3 -m http.server 8081` |

Live demos hosteados en `argon-tennis-sandbox-170440.uc.r.appspot.com/<game>/`.

### Patrones del código a robar (vistos en el repo)

- **Vendor three.js local:** cada juego tiene `assets/vendor/three.module.js` — nada de CDN. **Esto es exactamente lo que Web Lens exige** (todo en el zip, cero red).
- **Arquitectura por dominio en `src/`:** archivos separados por responsabilidad (`world_curve_engine.js`, `characters_anim.js`, `flight_kinematics.js`, `spline_input_paths.js`, `traffic_collision_director.js`, `vfx_hud_audio.js`...). Patrón de nombrado: `<dominio>_<subarea>.js`.
- **Mixto bundler/no-bundler:** algunos juegos tienen `vite.config.ts` + `tsconfig.json` + `src/` modular; otros shippean un `bundle.js` plano + `index.html` que corre con `python3 -m http.server` sin build step.
- **Shaders custom GLSL** para look distintivo (rolling world, VHS, cel-shading) — la diferencia visual que separa un juego AI-gen de uno con dirección de arte.
- **Audio procedural/espacial** via Web Audio — no archivos de música pesados.
- `metadata.json`, `Dockerfile`, `server.py` — self-contained y deployable.

### Qué es portable a Web Lens y qué no

- ✅ **Portable tal cual:** juegos Three.js single-player sin server — Argon Valley (menos el chat), Argon Towers, The Corridor, Argon Airspace, GTA single-player. Todos usan assets vendored → zipeables.
- ❌ **No portable a Web Lens:** Argon Tennis usa `server.py` (multiplayer relay), gyro de teléfono companion (los sensores están bloqueados en el webview de Snap), webcam tracking (cámara bloqueada), websockets (bloqueados). 
- ⚠️ **Peso:** los juegos del repo pesan 6–33MB sin comprimir — hay que auditar assets para entrar en 8MB (comprimir texturas, dropear lo que no se use, audio mp3 mono).
- ✅ **Lección clave para el challenge:** los juegos que más viralizaron del thread son mecánicas simples con un twist fuerte (tower defense con rerouting, ATC con drag paths) — no los mundos abiertos. Matchea "Best Game Mechanic".

---

## 4. Arsenal complementario: repos curados (@Mnilax)

Dos listas de 15 repos c/u para convertir agentes en un game/3D studio completo. Relevancia para nosotros: el juego es web (Three.js), así que las secciones "3D on the web", assets y audio son las útiles; Unity/Unreal quedan para el port posterior a Lens Studio si aplica.

### Del tweet "15 repos que convierten Opus 5.5 en un game studio" (2110039818524660135)

- **Web/3D relevantes:**
  - `mrdoob/three.js` — la librería misma
  - `pmndrs/react-three-fiber` — three.js como componentes React
  - `CloudAI-X/threejs-skills` — 10 skills de three.js para Claude Code (shaders a post-processing)
  - `playcanvas/editor-mcp-server` — el agente construye escenas PlayCanvas y verifica que corran (PlayCanvas es stack sugerido por el challenge)
- **Assets/audio:** `ubisoft/ubisoft-laforge-chord` (una imagen → PBR maps completos), `ace-step/ACE-Step` (soundtrack <10s por canción), `Tencent-Hunyuan/HunyuanVideo-Foley` (clip de gameplay → SFX sincronizados — útil para el preview video)
- **Engines para port a Lens Studio/futuro:** `IvanMurzak/Unity-MCP`, `CoplayDev/unity-mcp`, `Coding-Solo/godot-mcp`, `Natfii/UnrealClaude`, `ChiR24/Unreal_mcp`, `kevinpbuckley/VibeUE`, `flopperam/unreal-engine-mcp`, `quodsoler/unreal-engine-skills`, `hi-godot/godot-ai`, `Donchitos/Claude-Code-Game-Studios` (49 agentes: creative director → QA)
- Otros: `Unity-Technologies/ml-agents`, `NVIDIA/Audio2Face-3D`, `Tencent-Hunyuan/Hunyuan-GameCraft-1.0`, `SkyworkAI/Matrix-Game`

### Del tweet "3D studio open-source" (2109716261160538324)

- **Generación de assets 3D:** `microsoft/TRELLIS.2` (imagen → asset 3D texturizado ~3s en H100), `Tencent-Hunyuan/Hunyuan3D-2.1` (assets production-ready con PBR), `Stability-AI/stable-fast-3d` (foto → mesh UV-unwrapped rápido), `meshy-dev/meshy-mcp-server` (texto/imagen → 3D + remesh/retexture/rig/animate desde el agente)
- **Escenas/mundos:** `ahujasid/mcp-for-blender` (Blender por prompt — el Blender MCP de la guía), `Tencent-Hunyuan/HY-World-2.0` (texto/imagen → mundo 3D navegable), `playcanvas/supersplat` (Gaussian splats en browser), `NVIDIA-Omniverse/kit-usd-agents`

**Filtro práctico para el challenge:** los .glb generados por TRELLIS/Hunyuan3D/Meshy entran al zip vía fetch+GLTFLoader (blobs permitidos). Pero los assets AI-gen pesan — presupuestar dentro de 8MB.

---

## 5. Receta de trabajo recomendada para ESTE proyecto

Combinando la guía de Argon con las restricciones de Web Lens (`CONTEXT.md`):

1. **Concepto** (día 1): core loop de un pulgar, sesiones <90s. Opciones fuertes del showcase: mecánica tipo Argon Towers/Airspace (drag paths, rerouting) o algo con Bitmoji del jugador integrado.
2. **Sesión de alineación en Devin (Plan Mode):** Devin entrevista a Diego con `ask_user_question` — cámara (portrait 9:16 fija), controles (un pulgar, pointer events), estilo visual, target de premios (Social Features + Mechanic). Sin escribir código.
3. **PLAN.md + session brief** drafteados por Devin, incluyendo constraints de Web Lens (ver sección 6). El brief se pega en una sesión de build = nuestro equivalente al `/goal` largo.
4. **Build iterativo en Devin** con screenshot gallery por milestone (Playwright MCP → `progress.html`) + critic subagent (`run_subagent`) con barra 9/10.
5. **Restricciones Web Lens desde el prompt inicial** — si el modelo genera un juego que usa red/CDN/localStorage-persistente/sensores, hay que rehacer. Las constraints van en el brief y en un `AGENTS.md` del repo para que toda sesión futura las herede.
6. **Polish visual:** si se quiere subir fidelidad, Diego genera target renders con Nano Banana en AI Studio/Gemini y los droppea al repo; sliders temporales para tunear y hardcodear.
7. **Integración `@snap/web-lens-api`** (leaderboards, bitmoji, storage) — directo en el repo con Devin.
8. **Pipeline de packaging:** Vite `base: './'` → `npm run build` → `tools/pack.mjs` (archiver) → verificar con `unzip -l` + grep de paths absolutos → upload a My Lenses.

---

## 6. Prompt maestro sugerido para generar el juego

Adaptado para una sesión de **Devin** (sin comandos slash — todo en texto plano):

```
We're building a portrait-mode (9:16) hypercasual 3D web game for Snapchat's
Web Lens platform using Three.js + Vite. Do NOT write any code yet — interview me
first with clarifying questions about the core loop, camera, controls, and visual
style (use ask_user_question). Read CONTEXT.md and ARGON.md first.

Hard constraints (Snapchat webview):
- Everything ships in ONE zip: zero network, zero CDN, all assets vendored locally.
  Vendor three.module.js into the project, no ES module CDN imports.
- No camera, no motion sensors, no geolocation, no websockets, no iframes.
- localStorage does NOT persist between sessions — treat all storage as session-only;
  persistence will be wired later via a provided window.snapchat storage API.
- Input: one-thumb pointer events only. touch-action:none, no hover-dependent UX.
- Portrait 9:16, canvas resizes with window, pixelRatio capped at 2.
- Safe-area: leave the top ~120px free of critical HUD (Snapchat draws its close button there).
- Audio: created/resumed inside first user gesture; pause on visibilitychange.
- Delta-time animation (120Hz displays) with clamped elapsed time.
- Budget: total zip ≤ 8MB. Prefer procedural geometry and synthesized audio over assets.
- index.html at zip root, all paths relative (./...).

Once I approve the concept and answer your questions, write PLAN.md with milestones,
then output a self-contained session brief I can paste into a fresh Devin session to
run the build autonomously.
```

---

## 7. Links de archivos locales

- Repo showcase clonado: `resources/argon-games/` (no commitear al repo público si es pesado; está como referencia local)
- Contexto del challenge: `./CONTEXT.md`
- Guías oficiales de Argon:
  - 3D games: https://aistudio.google.com/learn/building-3d-games-and-worlds-with-gemini-4-argon
  - Dev guide: https://aistudio.google.com/learn/gemini-4-argon-developer-guide
  - What's new / migration: https://aistudio.google.com/docs/latest-model
  - Long decode: https://aistudio.google.com/docs/long-decode
  - Build mode: https://ai.studio/build

*Generado por Devin el 15/10/2026 desde Playwright MCP (threads de X en vivo), guía oficial de AI Studio, y el repo clonado.*

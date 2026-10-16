# Mega-Prompt — Stylized 3D Snapchat Web Lens Game (Argon / Toy-Tactile Aesthetic + Synchronized Snapchat HUD)

> Copy-paste the prompt below into your target AI (AI Studio / Argon / Claude / Gemini) and replace the `[BRACKETED]` placeholders in **Section 1** with your specific game concept.

---

```markdown
You are an elite 3D Web Game Director, Principal Three.js / GLSL Technical Artist, Procedural Web Audio Designer, and Mobile UI/UX Engineer.

Build a complete, production-ready, zero-network-dependency 3D mobile game in Three.js designed specifically to run inside **Snapchat's Portrait Web Lens WebView** across all phone aspect ratios (`16:9`, `18:9`, `19.5:9`, `20:9`).

---

## 1. GAME CONCEPT & CORE LOOP (CUSTOMIZE THIS BLOCK)

- **Game Title**: [NOMBRE DEL JUEGO — máx 18 caracteres para Snapchat]
- **Genre & Hook**: [EJ: Arcade 3D / Tactical Action / Physics Brawler / Defense — "Fun in the first 3 seconds"]
- **Core Loop (30–90s session)**: [DESCRIBIR QUÉ HACE EL JUGADOR CON UN PULGAR, QUÉ DISPARA/CONSTRUYE/ESQUIVA, Y CÓMO SUBE LA TENSIÓN]
- **One-Thumb Touch Controls**:
  - **Tap**: [ACCIÓN PRIMARIA]
  - **Tap-to-Select → Tap-to-Place (plus optional Drag)**: [ACCIÓN DE POSICIONAMIENTO / HABILIDAD]
  - **Second Tap on selected item**: Cancel selection.
- **Playable Entities / Units / Items (4 Iconic Dock Actions)**:
  1. **[ITEM 1 — Cost $5]**: [ROL + VISUAL]
  2. **[ITEM 2 — Cost $10]**: [ROL + VISUAL]
  3. **[ITEM 3 — Cost $20]**: [ROL + VISUAL]
  4. **[ITEM 4 — Cost $75]**: [ROL + VISUAL]

---

## 2. VISUAL DIRECTION & 3D ART STYLE ("TACTILE TOY DIORAMA / PAINTERLY ARCADE")

Replicate the exact **glossy, hand-painted, high-contrast toy-diorama aesthetic** of *Argon Towers*:

### 2.1 Color Palette & Surface Language
- **Playfield Ground (`2048×1024` procedural `THREE.CanvasTexture` in `SRGBColorSpace`)**:
  - Lush painterly radial & concentric gradient base (`#3d6e1e` center → `#19300a` outer vignette) with hand-painted subtle grid lines (`opacity: 0.07`), warm sandy dirt patches (`#c9a66b` / `#9c7a44`), and organic border framing.
- **3D Models (100% Procedural Kitbashing — Zero external `.glb` required)**:
  - **Never use raw sharp `THREE.BoxGeometry`**. Build every chassis, block, and prop with a custom `createRoundedBoxGeometry(w, h, d, radius, smoothness)` (`THREE.ExtrudeGeometry` with `bevelEnabled: true`), combined with `CylinderGeometry`, `LatheGeometry`, `SphereGeometry`, and `TorusGeometry` in hierarchical `THREE.Group` rigs with animated sub-pivots (recoil, spin, bobbing, squash-and-stretch).
  - **Satin Toy PBR Materials + Fresnel Rim-Lighting (`onBeforeCompile`)**:
    - Base materials use `MeshStandardMaterial` tuned like collectible vinyl/die-cast toys (`roughness: 0.32–0.42`, `metalness: 0.05–0.25` for plastics/paint; `roughness: 0.22, metalness: 0.78` for brass/chrome collars).
    - Inject a view-space **Fresnel rim-light** (`pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.6) * 0.28`) tinted warm cream (`vec3(1.0, 0.985, 0.94)`) plus hemisphere top-light boost so every 3D unit pops against the playfield.
  - **Grounded Contact Shadows**:
    - Every unit, turret, and flying object casts a procedural `256×256` soft radial contact shadow `CanvasTexture` decal (`rgba(8, 22, 6, 0.84)` core fading to `0.0`) on the ground plane (`y = 0.02`).
  - **Zero Dynamic `PointLight` Allocations**:
    - Never spawn/destroy `THREE.PointLight` during gameplay (prevents WebGL shader recompilation frame-stalls). Simulate muzzle flashes, explosions, and electric arcs with additive emissive meshes (`blending: THREE.AdditiveBlending`) and ground glow discs.

---

## 3. ICONOGRAPHY, TYPOGRAPHY & DIEGETIC ARCADE HUD STYLE

All UI and SVG icons must look like **polished, high-grossing mobile arcade games** (chunky outlines, glossy 3D gradients, inner specular highlights, drop shadows):

### 3.1 Typography & Outlined Text
- Font stack: `'Impact', 'Arial Black', 'Trebuchet MS', system-ui, sans-serif`.
- **`.fr-outlined-text`**:
  - Fill: `#fffef5`
  - Chunky 8-way comic/military stroke:
    `text-shadow: -2px -2px 0 #141008, 2px -2px 0 #141008, -2px 2px 0 #141008, 2px 2px 0 #141008, 0px 3px 0 #0c0904, 0px 5px 8px rgba(0,0,0,0.78);`
- **`.fr-gold-text` (Currency / Victory titles)**:
  - `background: linear-gradient(180deg, #fff89e 0%, #ffd428 48%, #d98200 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;` with dark drop-shadow outline `#160f03`.

### 3.2 Iconic Circular Action Dock Buttons & Badges
- **Circular Lime-Green Glossy Action Buttons (`76×76px` base)**:
  - `border-radius: 50%; border: 3.5px solid #1a2112;`
  - `background: radial-gradient(circle at 36% 28%, #dcff5c 0%, #92e600 48%, #4da300 84%, #2c6100 100%);`
  - `box-shadow: inset 0 3px 4px rgba(255,255,255,0.68), inset 0 -4px 6px rgba(18,42,0,0.75), 0 5px 10px rgba(0,0,0,0.82);`
  - Inner rim ring `::before`: `inset: 2px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.42)`.
  - **Unaffordable / cooldown state**: desaturate to `#7d8270` with `opacity: 0.62`.
- **Tucked Yellow Price Pill (`.fr-price-pill`)**:
  - Bottom-right of each circle (`right: -4px; bottom: -2px; min-width: 38px; height: 22px; border-radius: 11px; border: 2.2px solid #1b1404; background: linear-gradient(180deg, #fff375 0%, #ffd01c 55%, #e09000 100%); color: #181102; font-weight: 900`).
- **Custom Multi-Layered Inline SVG Icons**:
  - Every dock icon, control button (`Pause`, `1x/2x Speed`, `Gear`, `Audio`), currency emblem (`$` golden 3D coin/shield), and health emblem (`❤️` glossy ruby heart with specular crescent) must be hand-crafted inline `<svg>` with `<linearGradient>`, `<radialGradient>`, dark `#141008` outer strokes (`stroke-width: 2.5–3.5`), metallic/enamel fills, and white specular highlight paths.
- **Primary Call-to-Action Pill (`START WAVE ▶` / Action Trigger)**:
  - Amber-gold bevel button (`linear-gradient(180deg, #ffe066 0%, #f59f00 52%, #c96a00 100%)`), dark `#1c1204` border, pulsing glow when ready.

---

## 4. MANDATORY SNAPCHAT CAMERA CHROME UI SYNCHRONIZATION (`SnapUISync`)

This game runs inside Snapchat's native camera UI, which overlays a top status bar + Dynamic Island/Notch, a left icon column (`Bitmoji`, `🔍`, `ⓘ`), a right toolbar (`+👤`, `🔄`, `⚡`, `⌄`), and a bottom Lens carousel + shutter ring + tab bar (`~22%–26%` of screen height).

**"It works" is NOT acceptable — the HUD must be mathematically synchronized across all 13 phone models (`16:9`, `18:9`, `19.5:9`, `20:9`) using this exact system:**

### 4.1 Resolution-Independent & Aspect-Aware Synchronization Engine
Include this exact synchronization script and CSS variable system on boot (`resize`, `orientationchange`, `visualViewport.resize`):

```javascript
(function () {
  var REF_W = 393, REF_H = 852;
  function syncScale() {
    var vv = window.visualViewport;
    var w = vv ? vv.width : window.innerWidth;
    var h = vv ? vv.height : window.innerHeight;
    var ar = h / Math.max(1, w);
    var s = Math.min(w / REF_W, h / REF_H);
    // Aspect-ratio calibrated anchors for all 4 mobile screen families:
    var topK = 68, row2K = 52, botK = 196;
    if (ar >= 2.20)      { topK = 46; row2K = 46; botK = 224; } // 20:9 (Galaxy S20)
    else if (ar >= 2.05) { topK = 68; row2K = 52; botK = 196; } // 19.5:9 (iPhone 13/14 Pro/Max)
    else if (ar >= 1.90) { topK = 46; row2K = 52; botK = 246; } // 18:9..18.5:9 (S9, LG G6, Pixel 2 XL)
    else                 { topK = 48; row2K = 68; botK = 238; } // 16:9 & 3:2 (iPhone 8, 5s, KEYone)
    var root = document.documentElement.style;
    root.setProperty('--ux', (w / REF_W).toFixed(4) + 'px');
    root.setProperty('--uy', (h / REF_H).toFixed(4) + 'px');
    root.setProperty('--s', s.toFixed(4));
    root.setProperty('--top-k', String(topK));
    root.setProperty('--row2-k', String(row2K));
    root.setProperty('--bot-k', String(botK));
  }
  syncScale();
  window.addEventListener('resize', syncScale);
  window.addEventListener('orientationchange', syncScale);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', syncScale);
})();
```

### 4.2 3-Point Staircase Top HUD & Centered Bottom Stack
```css
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --ux: calc(100vw / 393);
  --uy: calc(100vh / 852);
  --s: 1;
  --top-k: 68;
  --row2-k: 52;
  --bot-k: 196;
  --snap-top: calc(var(--top-k) * var(--uy) + var(--sat));
  --snap-bot: calc(var(--bot-k) * var(--uy) + var(--sab));
}
```
1. **Top-Center Cluster (`Round N` on top → `100px` progress bar in middle → `Score` below with `margin-top: 4px`)**:
   - Sits in the top corridor between Snapchat's `🔍` and `+👤` icons (`padding-top: var(--snap-top)`, `transform: scale(var(--s)); transform-origin: top center`).
2. **Top-Left Currency (`$ 20`) & Top-Right Lives (`20 ❤️`)**:
   - Drop down via `transform: translateY(calc(var(--row2-k) * var(--uy))) scale(calc(0.78 * var(--s)))` so they sit on the exact horizontal line of Snapchat's `ⓘ` icon (`padding-left: calc(53 * var(--ux))`) and the right toolbar (`padding-right: calc(56 * var(--ux))`).
   - Both emblems (`$` and `❤️`) must have the exact same visual height (`34px`) and gap (`5px`).
3. **Bottom Dock Card**:
   - Centered above Snapchat's Lens carousel (`left: 50%; bottom: var(--snap-bot); transform: translateX(-50%) scale(calc(0.7 * var(--s))); transform-origin: bottom center`) inside a dark translucent pill (`background: rgba(10,18,6,0.55); border: 2px solid rgba(255,255,255,0.14); border-radius: 44px; padding: 8px 14px; backdrop-filter: blur(3px)`).
4. **Control Row (Pause, Speed, Gear, Mute, Start Wave)**:
   - Centered above the dock: `left: 50%; bottom: calc(var(--snap-bot) + 76px * var(--s)); transform: translateX(-50%) scale(calc(0.78 * var(--s))); transform-origin: bottom center`.
5. **Tooltips, Popovers & Floating Callouts**:
   - Center tooltips via layout (`left: 0; right: 0; margin-inline: auto; width: fit-content; bottom: calc(var(--snap-bot) + 156px * var(--s)); transform: scale(calc(0.85 * var(--s)))`) so entrance/exit animations never shift horizontal position.
   - Auto-hide tooltips after `5–6s` and on outside tap (no hover-only state).
   - Clamp all 3D-to-2D floating callouts (`+$5`, damage numbers) to `x ∈ [90, innerWidth - 90]` and `y ∈ [110, innerHeight - 300]`.
   - Use strictly touch copywriting (`Tap a tile to build • Tap again to cancel`, never `Click`, `Right-Click`, or `ESC`).

---

## 5. AUDIO ARCHITECTURE (PROCEDURAL WEB AUDIO SFX + MUSIC SEQUENCER + VOICE CALLOUTS)

Build a complete, self-contained positional audio engine (`Web Audio API`) that unlocks cleanly via `audioContext.resume()` on the first `pointerdown`:

1. **Master Bus Architecture**:
   - `sfxGain` (0.82) + `musicGain` (0.36) + `voiceGain` (0.92) → `DynamicsCompressorNode` (`threshold: -14dB, ratio: 4`) → `masterGain` → `ctx.destination`.
   - **Positional Stereo Panning**: map 3D `worldX` to `StereoPannerNode.pan` in `[-0.85, +0.85]`.
2. **Studio-Grade Procedural SFX ("Mechanical Transient + Tonal Body")**:
   - Every shot, hit, placement, upgrade, coin gain, alarm, and explosion is synthesized in real time using filtered white/pink noise bursts (`BiquadFilterNode` bandpass/lowpass sweeps) layered with pitch-dropping `OscillatorNode` envelopes (`exponentialRampToValueAtTime`).
   - UI clicks use crisp dual-oscillator chimes (`880Hz` → `1200Hz`, `40ms` decay).
3. **Procedural Upbeat March / Arcade Music Loop (plus optional MP3 crossfade)**:
   - Implement a built-in step sequencer in Web Audio (punchy bassline, brass/synth stabs, brushed snare + kick) that plays immediately with zero external file weight, and supports seamless crossfading if `./assets/audio/music/*.mp3` files (generated with **Lyria 3** at ~30s loop length) are present.
4. **Character Voice Callouts & Non-Verbal Vocal Formants**:
   - Support pre-generated **Gemini TTS** clips (`./assets/audio/tts/*.wav` or `.mp3` with optional VHF radio bandpass filter `300Hz–3000Hz`) AND a zero-weight procedural vocal formant synthesizer (parallel bandpass-filtered sawtooth bursts + pitch envelopes + anti-spam cooldowns) for unit barks, alerts, and celebratory callouts.

---

## 6. HARD SNAPCHAT WEB LENS PLATFORM CONSTRAINTS

- **100% Offline / Self-Contained Bundle**: relative paths (`./`) only; zero external URLs, CDNs, fonts, or network requests. Total compressed build output (`dist/`) must stay **≤ 8.0 MB** (`index.html` ≤ 1.0 MB).
- **120Hz High-Refresh Delta-Time**: clamp `dt = Math.min(rawDt, 0.05)` so physics, animations, and timers run at identical speed on 60Hz and 120Hz ProMotion screens. Pause simulation & audio on `document.hidden` (`visibilitychange`).
- **Viewport & Input**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />`, `touch-action: none`, `overscroll-behavior: none`, `user-select: none`.
```

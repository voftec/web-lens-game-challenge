---
name: snap-game-ui-adapt
description: Distribute, adapt, and polish a web game's UI AND touch functionality to run inside Snapchat's native camera chrome without collision or distortion. Invoke whenever building, porting, reviewing, or playtesting any Web Lens game UI, HUD, tooltips, popovers, callouts, or touch controls.
---

# Snapchat Web Lens — Game UI & Functionality Adaptation Skill

This skill encodes the exact geometry, visual distribution rules, and functional adaptations discovered by reverse-engineering `Lens Studio.app` overlays and shipping a real Web Lens to Snapchat.

---

## 0. Golden Principles (Never Violate)

1. **Minimal, surgical changes**: preserve the game's visual identity and cluster structure. Reposition, scale, and align existing clusters to the Snapchat chrome geometry instead of inventing alien layouts.
2. **Never ship the simulator overlay**: the Snapchat chrome overlay (`/__snapchrome__/<Device>/<mode>.png`) lives **only** in the local Playwright harness (`tools/mylenses-mcp/`). Zero references to `snap-chrome` or `/__snapchrome__/` may ever exist inside `dist/` or the `.zip`.
3. **Always develop & playtest WITH the overlay ON** (`snapChrome: "camera"` on `393×852 @ dpr2` — real iPhone 14 Pro aspect, 19.5:9, matching the `1179×2556` PNG without any stretch). Turn `snapChrome: "off"` **only** when recording the clean `720×1280` preview video for My Lenses submission.
4. **Adapt functionality, not just CSS**: desktop games assume hover, right-click, `ESC`, keyboard shortcuts, and unbounded screen coordinates. Every one of those must be adapted for one-thumb portrait touch.

---

## 1. Exact Pixel Map of Snapchat Camera Chrome (`iPhone 14 Pro`, `393×852` CSS px)

Measured directly from `research/snap-preview-re/assets/devices_overlays/iPhone 14 Pro/live.png` (`1179×2556` native → scale `×0.3333`):

| Region | CSS `y` range | CSS `x` occupied | What is there |
|---|---|---|---|
| Top opaque bar + status + Dynamic Island | `y = 0 .. 59` | full width `0 .. 393` | 9:41 clock, Dynamic Island, signal/Wi-Fi/battery |
| Top icon row 1 (Avatar + Search / Add-Friend + Flip) | `y = 65 .. 103` | Left: `0 .. 96` · Right: `297 .. 393` | **Free center corridor: `x = 96 .. 297` (`201px` wide)** |
| Gap between icon rows | `y = 104 .. 122` | Right toolbar only: `345 .. 393` | Left side is clear |
| Top icon row 2 (`ⓘ` info / `⚡` flash) | `y = 123 .. 145` | Left `ⓘ`: `0 .. 40` · Right toolbar: `345 .. 393` | **Wide corridor: `x = 48 .. 337` (`289px` wide)** |
| Lower right chevron (`⌄`) | `y = 146 .. 180` | Right: `345 .. 393` | Left is clear (`x = 0 .. 345`) |
| **Open playfield band** | **`y = 180 .. 540`** | **`x = 0 .. 393`** | **100% unobstructed 3D/2D gameplay area** |
| Bottom HUD zone (above carousel) | `y = 540 .. 660` | `x = 0 .. 393` | Where game controls + action dock MUST live |
| Lens carousel + shutter ring | `y = 670 .. 769` | full width `0 .. 393` | 7 circular lens icons + center shutter |
| Bottom tab bar + Home Indicator | `y = 770 .. 852` | full width `0 .. 393` | Create / Scan / `✕` / Browse / Explore |

> **Critical insight**: `env(safe-area-inset-bottom)` in Snapchat's webview does **NOT** report the height of the Lens carousel + bottom navbar (`~185px`). You **must** add an explicit bottom offset (`~196px`) in CSS.

---

## 2. Standard 3-Point Top HUD Distribution

Do **not** cram 3 columns into row 1 (`y=65..103`, only `201px` wide) and do **not** collapse everything into a single box. Use the two-level staircase that mirrors Snapchat's own icons:

```
y=68   [Bitmoji][🔍]        Round 1          [+👤][🔄]
                          ═══════════ (bar)
                              0 (score)
y=120  [ⓘ]  $ 20                              20 ❤️  [⚡]
                                                     [⌄]
```

### Exact alignment rules
1. **Top-center status (`Round N` → progress bar → `Score`)**:
   - Sits in the top corridor (`padding-top: calc(68px + env(safe-area-inset-top, 0px))`), horizontally centered at `x = 196.5`.
   - Top edge of `Round N` aligns with the top margin of the `🔍` and `+👤` buttons.
   - Vertical stack order inside the center cluster:
     1. **Primary state label** (`Round 1` / `Wave 1` / `Level 1`) on top (`order: -2`, `font-size: 20px`).
     2. **Progress bar** in the middle (`order: -1`, `width: 100px`).
     3. **Score** below the bar (`font-size: 22px`).
2. **Top-left currency/resource (`$ 20`)**:
   - Drops down (`transform: translateY(52px) scale(0.78)`) so its vertical center (`y ≈ 134`) matches the **`ⓘ` icon** (`y = 123..145`).
   - Horizontal offset: `padding-left: 48px` (`8px` to the right of `ⓘ`, whose right edge is `x = 40px`).
3. **Top-right health/lives (`20 ❤️`)**:
   - Same vertical drop (`transform: translateY(52px) scale(0.78)`) — exact same `y` as `$ 20`.
   - Horizontal offset: `padding-right: 56px` (`8px` to the left of the right toolbar column, whose left edge is `x = 345px`).
4. **Icon size parity**:
   - Currency emblem (`$`) and health emblem (`❤️`) **must have identical visual height** (`34px`) and identical gap (`5px`) to their number so both sides read as a balanced pair.

---

## 3. Bottom HUD Stack (Above the Carousel)

Stack upward from `y = 660` (just above the central shutter circle at `y = 670`):

1. **Primary Action Dock** (e.g. tower buttons, cards, abilities):
   - Centered horizontally (`left: 50%; transform: translateX(-50%) scale(0.7); transform-origin: bottom center`).
   - `bottom: calc(196px + env(safe-area-inset-bottom, 0px))`.
   - Wrapped in a cohesive dark translucent pill (`background: rgba(10,18,6,0.55); border: 2px solid rgba(255,255,255,0.14); border-radius: 44px; padding: 8px 14px; backdrop-filter: blur(3px)`).
2. **Secondary Control Row** (Pause, Speed `1x`, Settings gear, Mute, `START WAVE ▶`):
   - Centered horizontally above the dock: `bottom: calc(272px + env(safe-area-inset-bottom, 0px))`, `transform: translateX(-50%) scale(0.78)`.
3. **Contextual Popovers & Tooltips** (tower info, gear menu):
   - Centered above the control row: `bottom: calc(330px..352px + env(safe-area-inset-bottom, 0px))`.
   - **Never** use `left: 50%; transform: translateX(-50%)` if an entrance/exit animation or scale rule overwrites `transform`. Use layout centering (`left: 0; right: 0; margin-inline: auto; width: fit-content`) so `transform: scale(0.85)` stays pure and the element is at the exact same position in initial, animating, and final states.

---

## 4. Transient & World-Space UI Rules (Animations & Clamping)

1. **Same position across initial → animating → final states**:
   - Any banner, tooltip, or modal that animates in/out must share the exact same horizontal anchor (`left/right/margin-inline`) in base CSS, `.is-visible`, and `@keyframes`. Never mix `translateX(-50%)` in base CSS with a keyframe that only animates `translateY(...)` (which strips `translateX(-50%)` mid-animation and makes the banner jump sideways).
2. **World-to-screen floating callouts (`+$5`, `Start Wave`, damage numbers)**:
   - Always clamp screen coordinates `(sx, sy)` inside the playable band before setting `style.left / style.top`:
     ```js
     const w = window.innerWidth, h = window.innerHeight;
     sx = Math.min(Math.max(sx, 90), w - 90);
     sy = Math.min(Math.max(sy, 110), h - 300);
     ```
   - This prevents callouts near the edges of the 3D board from clipping off-screen or spawning underneath the Snapchat carousel.
3. **Wave / Phase banners**:
   - Place at `top: calc(160px + env(safe-area-inset-top, 0px))`, `max-width: 340px`, clear of both the top HUD and the playfield center.
4. **Achievement toasts**:
   - `top: calc(210px + env(safe-area-inset-top, 0px)); right: 10px; width: 220px` (below the right-hand `⌄` chevron at `y=180`).

---

## 5. Functional Adaptation Checklist (Desktop → Snapchat Mobile)

Whenever adapting or building a game, audit the code for these functional traps:

- [ ] **No hover-only state**: tooltips that open on `pointerenter`/`mouseenter` never close on touch because there is no `mouseleave`. Always add an auto-hide timer (`setTimeout(..., 4000–6000)`) and close on any outside tap or wave start.
- [ ] **Tap-to-select + Tap-to-place** (in addition to drag-and-drop): dragging across a narrow portrait screen with one thumb is error-prone. Selecting a dock item by tap and tapping a target tile/spot must work first-class; tapping the selected dock button again (or tapping invalid ground) cancels selection.
- [ ] **Touch copywriting**: grep the bundle for `Click`, `Right-Click`, `ESC`, `Space`, `Press`, `Hotkey` and replace with touch language (`Tap a tile to build • Tap again to cancel`, `tap "START WAVE"`).
- [ ] **Audio unlock on first pointerdown**: call `audioContext.resume()` inside the first `pointerdown`/`touchend` handler. Never call non-existent methods (`audio.unlock()`) that throw an uncaught `pageerror` during Snap's automated review harness.
- [ ] **Radial / context menus**: when opening a menu around a world object near the screen edge, clamp its center so the ring buttons (`Upgrade`, `Sell`) stay inside `x ∈ [60, W-60]` and `y ∈ [140, H-260]`.

---

## 6. Resolution-Independent Scaling Formula (`--ux`, `--uy`, `--s`)

To make the distribution AND relative element sizes look **identical** across small phones (`iPhone 8` `375×667`), standard notched phones (`iPhone 14 Pro` `393×852`), large phones (`Pro Max` `430×932`, `Galaxy S20`), and `720×1280` preview captures, never use raw `px` for anchor positions or fixed unscaled `scale(...)` factors:

1. **Position anchors (`--ux`, `--uy`)** scale with viewport width/height so HUD clusters stay locked to Snapchat's overlay icons:
   - `--ux: calc(100vw / 393)`
   - `--uy: calc(100vh / 852)`
   - `--snap-top: calc(68 * var(--uy) + env(safe-area-inset-top, 0px))`
   - `--snap-bot: calc(196 * var(--uy) + env(safe-area-inset-bottom, 0px))`
   - Side paddings: `padding-left: calc(53 * var(--ux)); padding-right: calc(56 * var(--ux))` (clears both iPhone 14 Pro `ⓘ` at `10.1%` and iPhone 8 `ⓘ` at `12.7%`).
2. **Uniform element scale (`--s`)** scales every cluster's visual size AND internal vertical stacking gaps (`+ 76px * var(--s)` for controls above dock, `+ 156px * var(--s)` for tooltip) by `min(innerWidth / 393, innerHeight / 852)`:
   ```js
   function syncScale() {
     var s = Math.min(window.innerWidth / 393, window.innerHeight / 852);
     document.documentElement.style.setProperty('--s', s.toFixed(4));
   }
   syncScale();
   window.addEventListener('resize', syncScale);
   ```
   - On `393×852` (`iPhone 14 Pro`): `--ux = 1px`, `--uy = 1px`, `--s = 1` (exact 1:1 reference).
   - On `375×667` (`iPhone 8`): `--s = 0.7829` (buttons shrink 22% so they never crowd the shorter screen or collide with the controls row).
   - On `720×1280`: `--s = 1.5023` (buttons grow 50% so they never look tiny).
3. Canonical snippet lives at `spikes/mobile-hud-patch.html`.

## 7. Verification Workflow (Mandatory Before Saying "Done")

1. Run the build in Playwright at `viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true` with `/__snapchrome__/iPhone 14 Pro/live.png` injected (`chrome-test.mjs` / `gameplay_start`).
2. Capture and visually inspect (`read` tool on the PNG):
   - **Boot / idle state**: verify `Round`, `Score`, `$`, `❤️`, controls, and dock against the pixel map.
   - **Selection / tooltip state**: tap a dock button, verify tooltip centering and touch copywriting.
   - **Active wave + world menu state**: place items, start wave, tap an in-world item to open its radial/upgrade menu, verify zero overlap with Snapchat icons or carousel.
3. Confirm `pageerror` and `console.error` arrays are empty (`[]`).
4. Confirm `grep -rn "snap-chrome\|__snapchrome__" dist/` returns nothing before packaging.

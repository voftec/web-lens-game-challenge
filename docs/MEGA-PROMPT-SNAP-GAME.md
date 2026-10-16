# Mega-Prompt — "Calle del Hambre" (3D Venezuelan Street Food Cart Game for Snapchat Web Lens)

> Copy-paste the prompt below into Google AI Studio / Argon (or any frontier coding AI) to generate or extend **"Calle del Hambre"**.

---

```markdown
You are an elite 3D Web Game Director, Principal Three.js / GLSL Technical Artist, Procedural Web Audio Designer, and Mobile UI/UX Engineer.

Build a complete, production-ready, zero-network-dependency 3D Venezuelan street-food cooking & time-management game in Three.js titled **"Calle del Hambre"** (`Perros & Burgers`), designed specifically to run inside **Snapchat's Portrait Web Lens WebView (`9:16`)** across all phone aspect ratios (`16:9`, `18:9`, `19.5:9`, `20:9`).

---

## 1. GAME CONCEPT, CAMERA POV & CORE LOOP ("LA CALLE DEL HAMBRE — EL PERRERO")

- **Setting**: A bustling, warm-lit night street food cart ("Carrito de Perros Calientes y Hamburguesas") on Caracas's legendary *Calle del Hambre* (Plaza Venezuela / Las Mercedes vibe), rendered with the cozy, rounded, tactile **Animal Crossing / Argon Valley** 3D diorama aesthetic.
- **First-Person / 2.5D Cart Counter POV (Portrait `9:16` — Direct-Touch *Cooking Fever* Layout, ZERO Bottom Button Dock)**:
  - **Top Red Awning Canopy (`y = 60..165` CSS px)**: The cart's glossy red awning frames the top of the screen and acts as the natural backdrop for the 3-point Snapchat-synchronized HUD (`13 👥 · ★ ★ ★ / Score`, `$ 265` next to `ⓘ`, `20 ❤️` next to the right toolbar).
  - **Customer Queue Row (`y = 175..340` CSS px — Exact *Cooking Fever* Layout)**: Across the stainless-steel ledge stand **3 expressive Chibi/Animal-Crossing customers side-by-side** (e.g., blonde girl with green eyes, mustachioed gentleman, boy with round glasses). Beside each customer floats their **Vertical White Speech Bubble (`58×74px`)** with big food/drink icons and a **vertical green patience bar along the right border**.
  - **Interactive 3D Venezuelan Hot Dog & Burger Cart (`y = 340..650` CSS px — Exact replica of the traditional Venezuelan "Carro de Perros Calientes Personalizado" in Red Enamel & Brushed Stainless Steel)**:
    - **The 3D Cart IS the UI** (100% direct raycasted touch on the 3D stations — NO tower-defense button dock):
      1. **Upper-Left Elevated 3-Tray Gastronorm Bridge**: Chrome support legs holding 3 elevated red/stainless pans (`Repollo`, `Zanahoria`, `Queso de Año rallado`).
      2. **Left-Front Baño María Well with Propped Hinged Red Lid**: Open stainless broth well with simmering Wiener & Red Polish sausages and steamed buns.
      3. **Center 2×2 Assembly Trays (4 Square Trays)**: Where up to 4 *Perros Calientes Con Todo* and *Hamburguesas Mixtas* are assembled simultaneously in 3D.
      4. **Front-Recessed 3 Stainless Topping Pans**: Flush in the front red counter (`Cebolla picadita`, `Papitas cabello de ángel`, `Aguacate / Maíz`).
      5. **Back Counter Ledge Sauce Battery ("Teteros") & Drink Cooler**: Row of colorful squeeze bottles (`Ajo`, `Guasacaca`, `Tártara`, `Maíz`, `Rosada`, `Ketchup`, `Mostaza`, `Picante`) + `Malta` and `Frescolita` bottles.
      6. **Right-Side Cast-Iron Flat-Top Grill ("La Plancha")**: Black cast-iron griddle with splash-guard walls where beef patties, chicken, *chuleta ahumada*, melted *queso de mano*, and fried eggs sizzle.
      7. **Lower Stainless Cabinet with 3 Sliding Doors, Recessed Handles, Caster Wheels & Blue Swing-Top Trash Bin** at the lower-left corner (above Snapchat's Lens carousel).

### 1.1 Authentic Venezuelan Menu Archetypes (What Customers Order)
Customers arrive speaking Venezuelan slang (`"¡Buenas noches jefe, dame uno con todo y full salsa de ajo!"`, `"¡Un perro sin cebolla que voy a ver a la jeva — el chancero!"`, `"¡Una Mixta con queso e' mano, huevo y una Malta bien fría!"`) and order combinations from:

1. **Perros Calientes ("Asquerositos")**:
   - **Perro Clásico Con Todo**: Steamed bun + boiled Wiener sausage + cabbage/carrot slaw + diced onion + crispy potato sticks (*papitas cabello de ángel*) + grated *queso de año* + sauces.
   - **Perro "El Chancero" (Sin Cebolla)**: Same, strictly NO onion.
   - **Perro "Forever Alone" (Full Cebolla)**: Double diced raw onion.
   - **Perro Polaco**: Jumbo bun + thick smoked red Polish sausage (*salchicha polaca*).
   - **Súper Perro Especial**: Wiener or Polaca + grilled ham, melted yellow/mano cheese, crispy bacon bits, sweet corn, avocado slices, fried egg, and sauces.
2. **Hamburguesas Callejeras Venezolanas**:
   - **Hamburguesa Sencilla (Carne o Pollo)**: Brioche/sesame bun toasted on the flat-top + 1 grilled protein (beef patty or chicken fillet) + lettuce, tomato, onion, cabbage slaw, potato sticks, cheese, and sauces.
   - **Hamburguesa de Chuleta Ahumada**: Smoked pork chop seared on the flat-top + classic toppings.
   - **Hamburguesa Mixta (Carne + Pollo, or Carne + Chuleta)**: Double protein stack + grilled ham + *queso de mano* + bacon + fried egg + avocado + lettuce, tomato, cabbage, potato sticks, and sauces.
   - **Hamburguesa 4×4 ("La Bestia")**: Beef + Chicken + Smoked Pork Chop + Chorizo/Sausage + fried egg + *queso de mano* + ham + bacon + full toppings & sauces.

---

## 2. THE 4 WORKSTATIONS, 16 INGREDIENTS, 18 SAUCE BOTTLES ("TETEROS") & DRINKS

### Station 1 — FUEGO Y BAÑO MARÍA (Hot Grill & Steamer)
- **Left: Baño María (Seasoned Broth Pot & Bun Steamer)**:
  - Simmering herb broth with rising steam particles (`Salchicha Wiener`, `Salchicha Polaca Roja`) and upper steam rack (`Pan de Perro`, `Pan de Hamburguesa`).
- **Right: La Plancha (Sizzling Cast-Iron Flat-Top Grill with Cooking Gauges)**:
  - Grill slots with semicircular **Temperature / Doneness Gauges** (Blue Raw → Green Perfect Zone → Red Burn Warning, plus `"¡VOLTEA! / ¡LISTO!"` indicator):
    1. `Carne de Res` (6oz beef patty)
    2. `Filete de Pollo` (chicken fillet)
    3. `Chuleta Ahumada` (smoked pork chop)
    4. `Huevo Frito` (cooked inside a round metal ring mold)
    5. `Jamón y Tocineta` (sizzling ham slice & crispy bacon strips)
    6. `Queso de Mano` (soft white Venezuelan cheese melted over hot meat)
  - Includes a pink **Trash Bin (`🗑️ Papelera`)** to discard burnt or wrong items.

### Station 2 — LAS BATEAS DE PICADOS (Pre-Chopped Stainless-Steel Gastronorm Trays)
Everything is pre-chopped in neat stainless-steel trays (`bateas`) arranged around the assembly board. Tapping any tray rains a juicy 3D physics burst of that topping onto the open bun with squash-and-stretch bounce:
1. `Repollo Blanco` (finely shredded white cabbage)
2. `Zanahoria Rallada` (grated orange carrot strips)
3. `Cebolla Picadita` (finely diced white onion cubes in brunoise)
4. `Papitas Cabello de Ángel` (ultra-crispy shoestring potato sticks — mandatory crown!)
5. `Queso de Año Rallado` (finely grated salty white aged cheese)
6. `Lechuga Fresca` (crisp ruffled green lettuce leaf)
7. `Rodajas de Tomate` (juicy red tomato slices)
8. `Maíz Dulce` (golden sweet corn kernels)
9. `Aguacate` (creamy green avocado slices)
10. `Tocineta Picada` (crunchy bacon bits)
11. `Pepinillos` (diced tangy pickles)
12. `Ají Dulce / Jalapeño` (sliced peppers)
- **One-Tap Street Vendor Shortcut Button (`"⚡ ¡CON TODO BASE!"`)**: instantly showers `Repollo + Zanahoria + Cebolla + Papitas + Queso Rallado` in a rapid 0.5s cascade with celebratory crunch SFX.

### Station 3 — LA MEGA SECCIÓN DE SALSAS (18 Color-Coded Squeeze Bottles / "Teteros")
Organized in a paged/scrollable rack of 18 iconic plastic squeeze bottles (`teteros`). When tapped, the 3D squeeze bottle tilts over the sandwich, squashes elastically, and extrudes a glossy 3D zig-zag ribbon (`THREE.TubeGeometry`) in that sauce's exact color:
1. **Ketchup (Tomate)** — `#d61f1f`
2. **Mayonesa ("Bayonesa")** — `#fffdf0`
3. **Mostaza Amarilla** — `#f5b800`
4. **Salsa de Ajo (Garlic Cilantro — The Queen)** — `#eef6df`
5. **Salsa Tártara Venezolana** — `#d7f0c2`
6. **Salsa de Maíz (Sweet Corn Cream)** — `#ffe46b`
7. **Guasacaca (Avocado Herb Sauce)** — `#52b836`
8. **Salsa Rosada (Pink Cocktail Sauce)** — `#ff8ca1`
9. **Salsa de Tocineta (Smoky Bacon)** — `#ebc8a4`
10. **Queso Cheddar Fundido** — `#ff9200`
11. **Salsa Alemana (Capers & Pickles)** — `#e2ebd0`
12. **Pimentón Asado** — `#e8562e`
13. **Salsa de Aceitunas** — `#88a64e`
14. **Salsa de Champiñones** — `#c4ae94`
15. **Curry Maracucho** — `#e3a312`
16. **BBQ Ahumada** — `#592010`
17. **Miel Mostaza** — `#e6981a`
18. **Picante / Ajicero Criollo** — `#ff2200`
- **One-Tap Shortcut (`"⚡ LAS 3 BÁSICAS"`)**: applies Ketchup + Mayonesa + Mostaza in a triple synchronized zig-zag.

### Station 4 — LA CAVA DE BEBIDAS (Ice Cooler)
1. **Malta Bien Fría** (dark amber stubby bottle with foam)
2. **Frescolita / Kolita** (bright red sweet Venezuelan soda)
3. **Refresco Negro (Cola)** (fizzy dark cola cup with ice)
4. **Papelón con Limón** (frosty golden sugarcane & lime cup)

---

## 3. ART DIRECTION: "ARGON VALLEY / ANIMAL CROSSING" 3D CHARM + NO UNCANNY HANDS

1. **Characters (`Characters & Customers` inspired by *Animal Crossing* / *Argon Valley*)**:
   - Build customers procedurally using rounded Chibi proportions: smooth spherical heads, rosy cheeks, button noses, modular hats/hairstyles (`viseras, gorras, moños, lentes`), and procedural fabric textures (`createGinghamTexture`, stripes, streetwear hoodies, grandma cardigans).
   - **2D Expressive `CanvasTexture` Faces (60fps)**: blinking eyes, eyes looking down at the food being assembled, starry eyes (`★_★`) when extra *papitas* and *salsa de ajo* are added, and impatient sweating/frowning if the timer runs low.
   - **Zero Uncanny Multi-Finger Hands**:
     - Do **NOT** model 5-fingered human hands. Use **floating chrome kitchen tongs (`pinzas`)**, **spatulas**, **3D squeeze bottles (`teteros`)**, and **direct physics ingredient showers** with spring bounce.
2. **3D Geometry & Shaders**:
   - Use `createRoundedBoxGeometry(w, h, d, radius, smoothness)` (`THREE.ExtrudeGeometry` with bevels) for the cart, trays, buns, and props — zero raw sharp cubes.
   - Apply **Satin Toy PBR + Fresnel Rim-Lighting (`onBeforeCompile`)** so buns look pillowy, sausages look juicy and glazed, and sauces shine with wet specular highlights (`roughness: 0.15`).
   - Zero dynamic `THREE.PointLight` allocations during gameplay.

---

## 4. MANDATORY SNAPCHAT CAMERA CHROME UI SYNCHRONIZATION (`SnapUISync`)

The HUD must be mathematically synchronized across all 13 phone models (`16:9`, `18:9`, `19.5:9`, `20:9`) so Snapchat's native camera icons never overlap a single button or label:

```javascript
(function () {
  var REF_W = 393, REF_H = 852;
  function syncScale() {
    var vv = window.visualViewport;
    var w = vv ? vv.width : window.innerWidth;
    var h = vv ? vv.height : window.innerHeight;
    var ar = h / Math.max(1, w);
    var s = Math.min(w / REF_W, h / REF_H);
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
```

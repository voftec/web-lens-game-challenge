# PLAN — "Calle del Hambre" (`Perros & Burgers 3D`)

**Título en Snapchat (≤18 chars):** `Calle del Hambre`
**Género:** 3D Street-Food Cooking & Time-Management Arcade (Portrait 9:16, un pulgar)
**Dirección de arte:** *Argon Valley / Animal Crossing* Chibi Diorama + Satin Toy PBR con Fresnel Rim-Light.

---

## 1. Core Loop (Sesiones de 60–90s)
1. **Llega un cliente estilo *Animal Crossing*** a la ventanilla del carrito nocturno de la Calle del Hambre con su globo visual de pedido + frase criolla + barra vertical de paciencia.
2. **Armás la orden en la tabla central 3D** alternando con un pulgar entre las 4 estaciones del carrito:
   - **🔥 Fuego (`Plancha + Baño María`)**: Pan de perro o de hamburguesa + Salchicha (*Wiener / Polaca*) del baño María humeante, o proteínas en la plancha con medidor semicircular azul→verde→rojo (*Carne, Pollo, Chuleta Ahumada, Huevo en aro, Jamón/Tocineta, Queso de Mano*).
   - **🥗 Bateas de Picados (`12 bateas de acero inox`)**: *Repollo, Zanahoria, Cebolla, Papitas cabello de ángel, Queso de año rallado, Lechuga, Tomate, Maíz, Aguacate, Tocineta picada, Pepinillos, Ají dulce* + botón rápido **`⚡ ¡CON TODO!`**.
   - **🧴 La Mega Sección de Salsas (`18 Teteros`)**: los 18 teteros reales (*Ketchup, Mayonesa, Mostaza, Ajo, Tártara, Maíz, Guasacaca, Rosada, Tocineta, Cheddar, Alemana, Pimentón, Aceituna, Champiñón, Curry Maracucho, BBQ, Miel Mostaza, Picante*) + botón rápido **`⚡ 3 Básicas`**. Cada tetero se inclina en 3D y dibuja un cordón zig-zag brillante encima del pan.
   - **🧊 Cava de Bebidas**: *Malta, Frescolita, Cola Negra, Papelón con Limón*.
3. **Tocás `¡SALE! ▶`**: el pedido vuela al cliente, se evalúa precisión + punto de cocción + velocidad, saltan monedas/propinas (`+$`), sube el multiplicador de racha y entra el siguiente cliente.

---

## 2. Sincronización de UI con Snapchat (`SnapUISync`)
- **Top HUD en escalera de 3 puntos**:
  - Centro (`padding-top: var(--snap-top)`): `Orden / Racha` arriba (`order: -2`), barra de progreso del turno al medio (`order: -1`), `Puntos` abajo (`margin-top: 4px`).
  - Izquierda (`53 * --ux`, `translateY(var(--row2-k) * --uy)`): `$ Propinas` alineado al `ⓘ`.
  - Derecha (`56 * --ux`, `translateY(var(--row2-k) * --uy)`): `❤️ Clientes felices` alineado al toolbar derecho.
- **Bottom Stack sobre el carrusel (`var(--snap-bot)`)**:
  - Fila superior (`+76px * --s`): pestañas de estación (`🔥 Fuego`, `🥗 Picados`, `🧴 18 Salsas`, `🧊 Bebidas`) + botón `¡SALE! ▶`.
  - Dock inferior (`var(--snap-bot)`): bandeja de botones circulares/teteros de la estación activa + papelera `🗑️`.

# Snap Preview — reverse engineering del chrome nativo

Objetivo: simular el UI nativo de Snapchat que se superpone a un Web Lens en el
webview, para poder ver localmente (Playwright) exactamente qué zonas del juego
quedan tapadas — sin publicar ni depender de Lens Studio.

Implementación: `tools/mylenses-mcp/snap-chrome.js` — overlay HTML/CSS inyectable
(`snapChrome("camera" | "send" | "off")`). Tools MCP: `gameplay_start` con param
`snapChrome`, y `gameplay_chrome` para alternar en vivo.

## Modos observados

1. **camera** — el Lens abierto en la cámara: status bar, Dynamic Island,
   Bitmoji + iconos a la izquierda, toolbar derecha (add-friend, flip, flash,
   chevron), carousel de Lenses + shutter azul, navbar
   Create/Scan/X/Browse/Explore, home indicator.
2. **send** — vista previa antes de compartir: X de cierre arriba-izq, toolbar
   de edición vertical a la derecha (T, pen, scissors, clip, timer), barra
   inferior speaker/download/share + pill amarillo "Send To", home indicator.

## Zonas tapadas (viewport 720x1280, aproximado de las capturas)

| Elemento | Región tapada (y) | x |
|---|---|---|
| Status bar | 0–54 | todo el ancho |
| Dynamic Island | 12–60 | 275–445 (centro) |
| Iconos izquierda | 150–340 | 16–70 |
| Toolbar derecha | 140–340 | 590–704 |
| Carousel + shutter | ~970–1090 | todo el ancho |
| Navbar | ~1150–1245 | todo el ancho |
| Home bar | ~1260–1272 | 210–510 |

Banda realmente jugable (camera mode): **~340–970** de altura útil libre
(~630px), más los márgenes laterales si hay iconos. En el juego hay que
mantener todo HUD interactivo dentro de esa banda (o usar
`env(safe-area-inset-*)` + margen manual para el carousel/navbar que NO
está cubierto por safe-area).

## Fuentes

- Screenshots de Lens Studio Preview (iPhone 8 / 13 Pro / 14 Pro / 14 Pro Max /
  Galaxy S20) — referencia visual únicamente.
- Captura real de "Argon Towers Test" corriendo aprobado en Snapchat —
  confirma que el carousel+navbar tapan el dock inferior del juego.
- Iconos aproximados con glifos/CSS — la fidelidad de forma no importa, sí la
  posición y el área de oclusión. Mejora futura: recortar los PNG reales de
  los screenshots como sprites.

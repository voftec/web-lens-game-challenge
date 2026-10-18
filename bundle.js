import * as THREE from './assets/vendor/three.module.js';
import { buildReferenceCorner, buildLandmarkTree } from './corner-reference.js';
import { paintReferenceSidewalk, buildReferenceSidewalk } from './sidewalk-reference.js';
import { buildStreetCart, CART_POSITION } from './cart-model.js';
import { createPrepView } from './prep-view.js';
import { createCartCatalogView } from './cart-catalog-view.js';
import { applyPaintedStyle } from './painted-style.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function applySRGB(tex) {
  if (THREE.SRGBColorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================================
// 1. EXACT PHOTOGRAMMETRIC SCALE CALIBRATION FROM REFERENCE CARS
//    Measured directly on ruler-overlay.jpg (1024 x 457 px):
//    - Horizontal sedan in lane 3 (x=480..509, y=333..343): 30 px long x 11 px wide
//    - Vertical sedan on right street (x=949..960, y=98..125): 12 px wide x 28 px long
//    - Standard sedan = 4.50 m x 1.80 m -> 1 meter = 6.67 pixels (1 world unit = 1 meter!)
// ============================================================================

const PX_PER_METER = 6.667; // Estimated from an assumed 4.50m car; not a surveyed metric scale.
const px = (xPx) => (xPx - 512) / PX_PER_METER;
const pz = (yPx) => (yPx - 228.5) / PX_PER_METER;
const pm = (lenPx) => lenPx / PX_PER_METER;

// World bounds covering both the close-up 1024x457 strip AND the surrounding blocks from the wide photo:
// Reference pixel X range: [-340 .. +1260] (1600 px = 240 meters wide)
// Reference pixel Y range: [-80  .. +720]  (800 px  = 120 meters deep)
const MAP_X_MIN_PX = -340;
const MAP_X_MAX_PX = 1260;
const MAP_Y_MIN_PX = -80;
const MAP_Y_MAX_PX = 720;
const MAP_W_M = pm(MAP_X_MAX_PX - MAP_X_MIN_PX); // 240 m
const MAP_H_M = pm(MAP_Y_MAX_PX - MAP_Y_MIN_PX); // 120 m
const MAP_CENTER_X = px((MAP_X_MIN_PX + MAP_X_MAX_PX) * 0.5);
const MAP_CENTER_Z = pz((MAP_Y_MIN_PX + MAP_Y_MAX_PX) * 0.5);

// ============================================================================
// 2. ARGON TOWERS CONCENTRIC-RING TREE CANOPY, BARK & ARCHITECTURAL TEXTURES
// ============================================================================

function createTreeCanopyTexture() {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  const cx = S * 0.5, cy = S * 0.5;

  ctx.fillStyle = '#1b4712';
  ctx.fillRect(0, 0, S, S);

  const drawScallopedRing = (ox, oy, radius, lobes, amp, fillStyle, strokeStyle) => {
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const scallop = 1.0 + amp * Math.abs(Math.cos(a * lobes * 0.5));
      const r = radius * scallop;
      const x = ox + Math.cos(a) * r;
      const y = oy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 4.0;
      ctx.stroke();
    }
  };

  drawScallopedRing(cx, cy, S * 0.45, 14, 0.045, '#256614', '#16400b');
  drawScallopedRing(cx - 8, cy - 8, S * 0.37, 12, 0.04, '#38851c', '#235910');
  drawScallopedRing(cx - 16, cy - 16, S * 0.285, 10, 0.038, '#52ab26', '#337517');
  drawScallopedRing(cx - 24, cy - 24, S * 0.195, 8, 0.032, '#74cc33', '#4e9c21');
  drawScallopedRing(cx - 32, cy - 32, S * 0.105, 6, 0.025, '#9ce848', '#6ec22b');

  ctx.fillStyle = 'rgba(196, 255, 110, 0.55)';
  ctx.beginPath();
  ctx.arc(cx - 38, cy - 38, S * 0.045, 0, Math.PI * 2);
  ctx.fill();

  return applySRGB(new THREE.CanvasTexture(canvas));
}

function createTreeBarkTexture() {
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0.0, '#4d290e');
  g.addColorStop(0.35, '#8a5022');
  g.addColorStop(0.7, '#6e3d18');
  g.addColorStop(1.0, '#3d1f09');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return applySRGB(new THREE.CanvasTexture(canvas));
}

function createSoftShadowTexture() {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(S * 0.5, S * 0.5, S * 0.08, S * 0.5, S * 0.5, S * 0.48);
  g.addColorStop(0.0, 'rgba(8, 12, 10, 0.72)');
  g.addColorStop(0.65, 'rgba(8, 12, 10, 0.34)');
  g.addColorStop(1.0, 'rgba(8, 12, 10, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return applySRGB(new THREE.CanvasTexture(canvas));
}

function createBuildingFacadeTexture({
  wallHex = '#e5ddd3',
  windowHex = '#1e293b',
  frameHex = '#f8fafc',
  bandHex = '#cbbba8',
  floors = 6,
  bays = 5,
}) {
  const W = 512, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  g.fillStyle = wallHex;
  g.fillRect(0, 0, W, H);

  const floorH = H / floors;
  const bayW = W / bays;

  for (let f = 0; f < floors; f++) {
    const y0 = f * floorH;
    // Floor slab spandrel band & balcony ledge
    g.fillStyle = bandHex;
    g.fillRect(0, y0, W, floorH * 0.18);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, y0 + floorH * 0.18, W, 3);

    for (let b = 0; b < bays; b++) {
      const x0 = b * bayW;
      const padX = bayW * 0.14;
      const padY = floorH * 0.26;
      const ww = bayW - padX * 2;
      const wh = floorH - padY - floorH * 0.14;

      // Window frame
      g.fillStyle = frameHex;
      g.fillRect(x0 + padX - 2, y0 + padY - 2, ww + 4, wh + 4);

      // Glass pane with sky reflection gradient
      const glassGrad = g.createLinearGradient(0, y0 + padY, 0, y0 + padY + wh);
      glassGrad.addColorStop(0, '#334155');
      glassGrad.addColorStop(0.5, windowHex);
      glassGrad.addColorStop(1, '#0f172a');
      g.fillStyle = glassGrad;
      g.fillRect(x0 + padX, y0 + padY, ww, wh);

      // Mullion bar
      g.fillStyle = frameHex;
      g.fillRect(x0 + bayW * 0.5 - 1.5, y0 + padY, 3, wh);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return applySRGB(tex);
}

function createClayTileRoofTexture(baseHex = '#b84b32', darkHex = '#7c2b19', lightHex = '#dc6b4e') {
  const W = 256, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = baseHex;
  g.fillRect(0, 0, W, H);

  // Spanish colonial barrel clay tiles ("tejas criollas")
  const colW = 16;
  for (let x = 0; x < W; x += colW) {
    g.fillStyle = (x / colW) % 2 === 0 ? lightHex : baseHex;
    g.fillRect(x, 0, colW * 0.7, H);
    g.fillStyle = darkHex;
    g.fillRect(x + colW * 0.7, 0, colW * 0.3, H);
  }
  for (let y = 0; y < H; y += 22) {
    g.strokeStyle = 'rgba(40, 12, 5, 0.42)';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return applySRGB(tex);
}

// ============================================================================
// 3. PHOTOGRAMMETRIC GROUND CANVAS (EXACT PIXEL COORDINATES FROM RULER-OVERLAY.JPG)
// ============================================================================

function traceWarpedOval(ctx, cx, cy, rx, ry, phase = 0) {
  ctx.beginPath();
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const warp = 1.0 + 0.06 * Math.sin(a * 3 + phase) + 0.04 * Math.cos(a * 5 - phase * 0.7);
    const x = cx + Math.cos(a) * rx * warp;
    const y = cy + Math.sin(a) * ry * warp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function createPhotogrammetricGroundTexture() {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Convert reference pixel (xPx in [-340..1260], yPx in [-80..720]) to canvas pixel
  const tx = (xPx) => ((xPx - MAP_X_MIN_PX) / (MAP_X_MAX_PX - MAP_X_MIN_PX)) * W;
  const ty = (yPx) => ((yPx - MAP_Y_MIN_PX) / (MAP_Y_MAX_PX - MAP_Y_MIN_PX)) * H;
  const tw = (wPx) => (wPx / (MAP_X_MAX_PX - MAP_X_MIN_PX)) * W;
  const th = (hPx) => (hPx / (MAP_Y_MAX_PX - MAP_Y_MIN_PX)) * H;

  // --------------------------------------------------------------------------
  // A. BASE ASPHALT FOR THE 4-CARRIAGEWAY AVENUE (yPx = 190 .. 445) + VERTICAL STREET (xPx = 938 .. 992)
  // --------------------------------------------------------------------------
  ctx.fillStyle = '#6c6864';
  ctx.fillRect(0, 0, W, H);

  const aveGrad = ctx.createLinearGradient(0, ty(188), 0, ty(448));
  aveGrad.addColorStop(0.0, '#78726e');
  aveGrad.addColorStop(0.25, '#6e6864');
  aveGrad.addColorStop(0.5, '#635d59');
  aveGrad.addColorStop(0.78, '#706a66');
  aveGrad.addColorStop(1.0, '#7c7570');
  ctx.fillStyle = aveGrad;
  ctx.fillRect(0, ty(188), W, ty(450) - ty(188));

  // Tire tracks along the 4 exact carriageways measured on ruler-overlay.jpg:
  // Carriageway 1 (North service road, yPx = 190..236 -> 46 px = 6.90 m): center yPx = 213
  // Carriageway 2 (North expressway, yPx = 252..298 -> 46 px = 6.90 m): lanes at yPx = 264, 286
  // Carriageway 3 (South expressway, yPx = 314..362 -> 48 px = 7.20 m): lanes at yPx = 326, 350
  // Carriageway 4 (South service road, yPx = 384..445 -> 61 px = 9.15 m): lanes at yPx = 402, 428
  ctx.strokeStyle = 'rgba(255, 250, 240, 0.08)';
  ctx.lineWidth = th(9);
  for (const ly of [213, 264, 286, 326, 350, 402, 428]) {
    ctx.beginPath();
    ctx.moveTo(0, ty(ly));
    ctx.lineTo(W, ty(ly));
    ctx.stroke();
  }

  // Dashed white lane dividers in Expressway 2 (yPx = 275) and Expressway 3 (yPx = 338)
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 240, 228, 0.5)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([tw(22), tw(18)]);
  for (const dy of [275, 338]) {
    ctx.beginPath();
    ctx.moveTo(0, ty(dy));
    ctx.lineTo(W, ty(dy));
    ctx.stroke();
  }
  ctx.restore();

  // Helper for concentric sandy/ochre ground patches
  const drawDirtPatch = (xPx, yPx, rxPx, ryPx, rot, rings, cols) => {
    ctx.save();
    ctx.translate(tx(xPx), ty(yPx));
    ctx.rotate(rot);
    for (let r = 0; r < rings; r++) {
      const frac = 1.0 - r * (0.64 / rings);
      const c = cols[Math.min(r, cols.length - 1)];
      ctx.fillStyle = c.fill;
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 2.0;
      traceWarpedOval(ctx, r * 1.8, -r * 1.1, tw(rxPx) * frac, th(ryPx) * frac, xPx * 0.1 + yPx * 0.2 + r * 3);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  const ochreCols = [
    { fill: '#99775a', stroke: '#7a5c43' },
    { fill: '#ad8868', stroke: '#8c6b4f' },
    { fill: '#c29c7a', stroke: '#a17d5e' },
    { fill: '#d6b292', stroke: '#b59070' },
  ];
  const calicheCols = [
    { fill: '#a8876a', stroke: '#8a6b50' },
    { fill: '#bfa084', stroke: '#9e8065' },
    { fill: '#d6bba2', stroke: '#b5987e' },
    { fill: '#ebd6c3', stroke: '#cbb29c' },
  ];

  // --------------------------------------------------------------------------
  // B. NORTH-WEST DIAGONAL BUILDING APRON (xPx = -340 .. 48, yPx = -80 .. 190)
  // --------------------------------------------------------------------------
  ctx.fillStyle = '#c8aa8a';
  ctx.fillRect(0, 0, tx(48), ty(190));
  ctx.fillStyle = '#d89b7c';
  ctx.fillRect(tx(-210), ty(85), tw(248), th(105));

  // --------------------------------------------------------------------------
  // C. WALLED VACANT LOT OF "LA CALLE DEL HAMBRE" (xPx = 48 .. 905, yPx = -80 .. 138)
  // --------------------------------------------------------------------------
  ctx.fillStyle = '#8c6d53';
  ctx.fillRect(tx(48), 0, tw(905 - 48), ty(138));

  drawDirtPatch(250, 45, 110, 65, 0.08, 4, ochreCols);
  drawDirtPatch(580, 40, 120, 70, -0.06, 4, ochreCols);
  drawDirtPatch(740, 55, 95,  55, 0.14, 4, calicheCols);
  drawDirtPatch(125, 72, 68,  38, -0.15, 3, calicheCols);

  // Dark vertical fence/trench inside the lot at xPx = 395
  ctx.strokeStyle = 'rgba(38, 30, 24, 0.72)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(tx(395), 0);
  ctx.lineTo(tx(395), ty(138));
  ctx.stroke();

  // --------------------------------------------------------------------------
  // D. Sidewalk traced from the overhead reference, including the indented
  // frontage, yellow apron and side-street return. Shared with the raised mesh.
  // --------------------------------------------------------------------------
  paintReferenceSidewalk(ctx, tx, ty);

  // --------------------------------------------------------------------------
  // E. ZEBRA CROSSWALK AT xPx = 54 .. 76, yPx = 172 .. 236 (EXACT RULER MATCH!)
  //    Plus pedestrian crossing at xPx = 258 .. 282, yPx = 252 .. 360
  // --------------------------------------------------------------------------
  ctx.fillStyle = 'rgba(242, 240, 235, 0.86)';
  for (let yP = 174; yP <= 232; yP += 6.5) {
    ctx.fillRect(tx(54), ty(yP), tw(22), th(3.6));
  }
  ctx.fillStyle = 'rgba(235, 230, 220, 0.28)';
  for (let yP = 256; yP <= 356; yP += 9) {
    ctx.fillRect(tx(258), ty(yP), tw(22), th(4.5));
  }

  // --------------------------------------------------------------------------
  // F. NORTH-EAST COMMERCIAL BLOCK GROUND (xPx = 992 .. 1260, yPx = -80 .. 190)
  // --------------------------------------------------------------------------
  ctx.fillStyle = '#d8c2a8';
  ctx.fillRect(tx(992), 0, W - tx(992), ty(190));

  // --------------------------------------------------------------------------
  // G. SOUTHERN BLOCKS GROUND (yPx = 445 .. 720)
  // --------------------------------------------------------------------------
  // Continuous South sidewalk strip along yPx = 442 .. 462
  ctx.fillStyle = '#cbb69b';
  ctx.fillRect(0, ty(442), W, ty(462) - ty(442));

  // 1. SW Block ground (xPx = -340 .. 50)
  ctx.fillStyle = '#b8a088';
  ctx.fillRect(0, ty(462), tx(50), H - ty(462));

  // 2. South-Central Dense Wooded Lot (xPx = 50 .. 260)
  ctx.fillStyle = '#3d4534';
  ctx.fillRect(tx(50), ty(462), tw(210), H - ty(462));

  // 3. Beige Concrete Courtyard & Basketball Court (xPx = 260 .. 720)
  ctx.fillStyle = '#cbb396';
  ctx.fillRect(tx(260), ty(462), tw(460), H - ty(462));
  ctx.strokeStyle = 'rgba(90, 74, 56, 0.25)';
  ctx.lineWidth = 1.5;
  for (let xP = 270; xP <= 710; xP += 28) {
    ctx.beginPath();
    ctx.moveTo(tx(xP), ty(462));
    ctx.lineTo(tx(xP), H);
    ctx.stroke();
  }

  // Blue Basketball Court at xPx = 580 .. 680, yPx = 610 .. 715
  ctx.fillStyle = '#687894';
  ctx.fillRect(tx(580), ty(610), tw(100), th(105));
  ctx.strokeStyle = 'rgba(240, 246, 255, 0.82)';
  ctx.lineWidth = 2;
  ctx.strokeRect(tx(584), ty(614), tw(92), th(97));

  // 4. SE Wooded Lots (xPx = 960 .. 1260)
  ctx.fillStyle = '#5c4e3e';
  ctx.fillRect(tx(960), ty(462), W - tx(960), H - ty(462));

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return applySRGB(tex);
}

// ============================================================================
// 4. ARCHITECTURAL 3D BUILDING BUILDER (REALISTIC FACADES, PARAPETS, ROOF EQUIPMENT)
// ============================================================================

class ArchitecturalBuildingBuilder {
  constructor() {
    this.matParapetCap = new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.55 });
    this.matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
    this.matACUnit = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.35 });
    this.matWaterTank = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.1 });
    this.matClayRoof = new THREE.MeshStandardMaterial({
      map: createClayTileRoofTexture('#b84b32', '#7c2b19', '#dc6b4e'),
      roughness: 0.65,
    });
  }

  /**
   * Creates a realistic multi-story Venezuelan building with:
   * - Windowed multi-story facades + ground-floor commercial plinth
   * - Recessed roof deck surrounded by a 3D raised parapet wall + coping
   * - Rooftop elevator penthouse, HVAC chiller units, and blue cylindrical water tanks
   */
  createSlabBuilding({
    x1Px, x2Px, y1Px, y2Px,
    heightM = 12,
    floors = 4,
    wallHex = '#e5ddd3',
    roofHex = '#d6cfc7',
    parapetHex = '#f5f2eb',
    windowHex = '#1e293b',
    hasPenthouse = true,
    hasWaterTank = true,
    acCount = 3,
    rotY = 0,
  }) {
    const wM = pm(x2Px - x1Px);
    const dM = pm(y2Px - y1Px);
    const cx = px((x1Px + x2Px) * 0.5);
    const cz = pz((y1Px + y2Px) * 0.5);

    const group = new THREE.Group();
    group.position.set(cx, 0, cz);
    group.rotation.y = rotY;

    const facadeTex = createBuildingFacadeTexture({
      wallHex,
      windowHex,
      floors,
      bays: Math.max(2, Math.round(wM / 3.5)),
    });
    const facadeMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.65 });
    const roofDeckMat = new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.78 });
    const parapetMat = new THREE.MeshStandardMaterial({ color: parapetHex, roughness: 0.55 });

    // 1. Main Building Core with multi-story windowed facades
    const coreH = heightM - 0.45;
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(wM, coreH, dM),
      [facadeMat, facadeMat, roofDeckMat, roofDeckMat, facadeMat, facadeMat]
    );
    core.position.y = coreH * 0.5;
    core.castShadow = true;
    core.receiveShadow = true;
    group.add(core);

    // 2. Ground-Floor Commercial Plinth Trim / Cornice Ledge
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(wM + 0.35, 0.28, dM + 0.35),
      parapetMat
    );
    ledge.position.y = Math.min(3.2, coreH * 0.35);
    group.add(ledge);

    // 3. Raised 3D Perimeter Parapet Walls around the Recessed Roof Deck!
    const pThick = 0.32;
    const pH = 0.55;
    const pY = coreH + pH * 0.5;

    const pNorth = new THREE.Mesh(new THREE.BoxGeometry(wM, pH, pThick), parapetMat);
    pNorth.position.set(0, pY, -dM * 0.5 + pThick * 0.5);
    const pSouth = new THREE.Mesh(new THREE.BoxGeometry(wM, pH, pThick), parapetMat);
    pSouth.position.set(0, pY, dM * 0.5 - pThick * 0.5);
    const pWest = new THREE.Mesh(new THREE.BoxGeometry(pThick, pH, dM - pThick * 2), parapetMat);
    pWest.position.set(-wM * 0.5 + pThick * 0.5, pY, 0);
    const pEast = new THREE.Mesh(new THREE.BoxGeometry(pThick, pH, dM - pThick * 2), parapetMat);
    pEast.position.set(wM * 0.5 - pThick * 0.5, pY, 0);
    group.add(pNorth, pSouth, pWest, pEast);

    // 4. Rooftop Elevator / Stairwell Penthouse Box
    if (hasPenthouse && wM > 5 && dM > 5) {
      const pw = Math.min(3.2, wM * 0.28);
      const pd = Math.min(2.8, dM * 0.28);
      const ph = 2.2;
      const pent = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), parapetMat);
      pent.position.set(-wM * 0.18, coreH + ph * 0.5, -dM * 0.15);
      pent.castShadow = true;
      const pentRoof = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.25, 0.16, pd + 0.25), this.matDarkMetal);
      pentRoof.position.set(-wM * 0.18, coreH + ph + 0.08, -dM * 0.15);
      group.add(pent, pentRoof);
    }

    // 5. Rooftop HVAC / Air-Conditioning Condenser Units
    for (let i = 0; i < acCount; i++) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.75), this.matACUnit);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12), this.matDarkMetal);
      fan.position.y = 0.37;
      ac.add(fan);
      ac.position.set(
        wM * 0.15 + (i % 2) * 1.35,
        coreH + 0.36,
        dM * 0.12 + Math.floor(i / 2) * 1.15
      );
      ac.castShadow = true;
      group.add(ac);
    }

    // 6. Iconic Venezuelan Blue Cylindrical Rooftop Water Tank ("Tanque de Agua")
    if (hasWaterTank && wM > 4.5) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.35, 14), this.matWaterTank);
      tank.position.set(wM * 0.28, coreH + 0.68, -dM * 0.22);
      tank.castShadow = true;
      group.add(tank);
    }

    return group;
  }

  /**
   * Creates a Venezuelan house or commercial pavilion with a pitched Spanish clay-tile roof ("techo de tejas")
   */
  createPitchedTileBuilding({
    x1Px, x2Px, y1Px, y2Px,
    wallHeightM = 4.5,
    roofPeakM = 2.2,
    wallHex = '#f3ead8',
  }) {
    const wM = pm(x2Px - x1Px);
    const dM = pm(y2Px - y1Px);
    const cx = px((x1Px + x2Px) * 0.5);
    const cz = pz((y1Px + y2Px) * 0.5);

    const group = new THREE.Group();
    group.position.set(cx, 0, cz);

    const facadeTex = createBuildingFacadeTexture({
      wallHex,
      windowHex: '#2c1e14',
      floors: 2,
      bays: Math.max(2, Math.round(wM / 3.2)),
    });
    const wallMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.7 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(wM, wallHeightM, dM), wallMat);
    body.position.y = wallHeightM * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Pitched hipped/gable clay tile roof with eaves overhang
    const overhang = 0.45;
    const slopeLen = Math.hypot(dM * 0.5 + overhang, roofPeakM);
    const slopeAngle = Math.atan2(roofPeakM, dM * 0.5 + overhang);

    for (const side of [-1, 1]) {
      const slope = new THREE.Mesh(
        new THREE.BoxGeometry(wM + overhang * 2, 0.16, slopeLen),
        this.matClayRoof
      );
      slope.position.set(0, wallHeightM + roofPeakM * 0.5, side * (dM * 0.25 + overhang * 0.25));
      slope.rotation.x = side * slopeAngle;
      slope.castShadow = true;
      group.add(slope);
    }

    return group;
  }
}

// ============================================================================
// 5. MAIN PHOTOGRAMMETRIC SCENE CONTROLLER
// ============================================================================

class CalleDelHambrePhotogrammetricScene {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.textures = {
      ground: createPhotogrammetricGroundTexture(),
      treeCanopy: createTreeCanopyTexture(),
      treeBark: createTreeBarkTexture(),
      shadow: createSoftShadowTexture(),
    };
    this.archBuilder = new ArchitecturalBuildingBuilder();

    // Default split view keeps the map zoomed around the active cart position.
    this.panX = px(560);
    this.panZ = pz(170);
    this.zoom = 1.5;
    this.viewMode = new URLSearchParams(window.location.search).get('view') || 'cart';
    this.cartOnly = this.viewMode !== 'split';
    if (this.viewMode === 'corner') {
      this.panX = px(720);
      this.panZ = pz(150);
      this.zoom = 2.4;
    }

    this._initThree();
    if (!this.cartOnly) this._buildPhotogrammetricWorld();
    this._bindCameraControls();

    requestAnimationFrame((t) => this._loop(t));
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1b2218);

    const { mapHeight, cartHeight } = this._viewportLayout();
    this.camera = new THREE.PerspectiveCamera(36, window.innerWidth / Math.max(1, mapHeight), 0.5, 450);
    this.prepView = createPrepView();
    this.cartCamera = this.prepView.camera;
    // ?painted=1 → paint-over pipeline: hand-painted plates projected
    // screen-space onto the painted segments (env, cart, grill, tables).
    this._paintedRes = null;
    const urlq = new URLSearchParams(location.search);
    if (urlq.has('painted')) {
      // ?cart=<id> swaps the painted segment from 'cart' to 'cart-<id>'
      const groups = ['env', 'tables', urlq.get('cart') ? 'cart-' + urlq.get('cart') : 'cart'];
      applyPaintedStyle(this.prepView, { canvas: this.canvas, groups }).then(r => { this._paintedRes = r; });
    }
    this.catalogView = this.viewMode === 'carts' ? createCartCatalogView() : null;
    this.cartAnchor = new THREE.Vector3(px(CART_POSITION.xPx), 0.18, pz(CART_POSITION.yPx));
    this._updateCamera();
    this._updateCartCamera();
    if (this.catalogView) this.catalogView.resize(window.innerWidth, window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;

    const hemi = new THREE.HemisphereLight(0xfff8e8, 0x384230, 0.95);
    hemi.position.set(0, 80, 0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4d8, 1.45);
    sun.position.set(45, 75, 55);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 260;
    const d = 95;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    window.addEventListener('resize', () => {
      const { mapHeight, cartHeight } = this._viewportLayout();
      this.camera.aspect = window.innerWidth / Math.max(1, mapHeight);
      this.cartCamera.aspect = window.innerWidth / Math.max(1, cartHeight);
      this._updateCamera();
      this._updateCartCamera();
      if (this.catalogView) this.catalogView.resize(window.innerWidth, window.innerHeight);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this._paintedRes) this._paintedRes.value.set(this.canvas.width, this.canvas.height);
    });
  }

  _viewportLayout() {
    const height = Math.max(1, window.innerHeight);
    if (this.cartOnly) return { mapHeight: 0, cartHeight: height };
    const cartHeight = Math.round(height * 0.46);
    return { mapHeight: height - cartHeight, cartHeight };
  }

  _updateCamera() {
    // At zoom=1.0, frame the exact 1024x457 close-up strip (153.6 meters wide x 68.5 meters high)
    const { mapHeight } = this._viewportLayout();
    const aspect = window.innerWidth / Math.max(1, mapHeight);
    const stripW = pm(1024); // 153.6 m
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const distForWidth = (stripW * 0.5) / (Math.tan(fovRad * 0.5) * aspect);
    const baseDist = Math.max(108, distForWidth);
    const dist = baseDist / this.zoom;
    this.camera.aspect = aspect;
    this.camera.position.set(this.panX, dist, this.panZ + dist * 0.16);
    this.camera.lookAt(this.panX, 0, this.panZ);
    this.camera.updateProjectionMatrix();
  }

  _updateCartCamera() {
    const { cartHeight } = this._viewportLayout();
    this.prepView.resize(window.innerWidth, cartHeight);
  }

  _bindCameraControls() {
    let dragging = false;
    let lastX = 0, lastY = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      dragging = e.clientY < this._viewportLayout().mapHeight;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.panX = clamp(this.panX - dx * 0.14 / this.zoom, -65, 65);
      this.panZ = clamp(this.panZ - dy * 0.14 / this.zoom, -35, 35);
      this._updateCamera();
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    this.canvas.addEventListener('wheel', (e) => {
      if (e.clientY >= this._viewportLayout().mapHeight) return;
      e.preventDefault();
      this.zoom = clamp(this.zoom * (e.deltaY < 0 ? 1.12 : 0.9), 0.62, 3.2);
      this._updateCamera();
    }, { passive: false });
  }

  _buildPhotogrammetricWorld() {
    this.world = new THREE.Group();
    this.scene.add(this.world);

    // 1. Ground Plane (240 m x 120 m, centered at MAP_CENTER_X, MAP_CENTER_Z)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_W_M, MAP_H_M),
      new THREE.MeshStandardMaterial({ map: this.textures.ground, roughness: 0.9, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI * 0.5;
    ground.position.set(MAP_CENTER_X, 0, MAP_CENTER_Z);
    ground.receiveShadow = true;
    this.world.add(ground);
    buildReferenceSidewalk(this.world, { px, pz });
    this.cart = buildStreetCart(this.world, { px, pz });

    // ------------------------------------------------------------------------
    // 2. THE 3 RAISED MEDIAN ISLANDS (EXACT RULER-OVERLAY.JPG PIXEL COORDINATES!)
    // ------------------------------------------------------------------------
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xb8ad9e, roughness: 0.75 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x6e5a44, roughness: 0.88 });

    const addMedianPx = (x1Px, x2Px, y1Px, y2Px) => {
      const lenM = pm(x2Px - x1Px);
      const widM = pm(y2Px - y1Px);
      const cx = px((x1Px + x2Px) * 0.5);
      const cz = pz((y1Px + y2Px) * 0.5);
      const curb = new THREE.Mesh(new THREE.BoxGeometry(lenM, 0.22, widM), curbMat);
      curb.position.set(cx, 0.11, cz);
      curb.receiveShadow = true;
      const soil = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.2, lenM - 0.5), 0.25, widM * 0.62), soilMat);
      soil.position.set(cx, 0.13, cz);
      this.world.add(curb, soil);
    };

    // Median 1 (North service road divider: yPx = 236 .. 252 -> 16 px = 2.40 m wide!)
    addMedianPx(-320, 258, 236, 252);
    addMedianPx( 282, 528, 236, 252);
    addMedianPx( 548, 855, 236, 252);

    // Median 2 (Central main expressway divider: yPx = 298 .. 314 -> 16 px = 2.40 m wide!)
    addMedianPx(-320, 255, 298, 314);
    addMedianPx( 284, 530, 298, 314);
    addMedianPx( 552, 858, 298, 314);
    addMedianPx( 995, 1250, 298, 314);

    // Median 3 (South service road divider: yPx = 362 .. 384 -> 22 px = 3.30 m wide!)
    addMedianPx(-320, 255, 362, 384);
    addMedianPx( 285, 335, 362, 384);
    addMedianPx( 385, 800, 362, 384);
    addMedianPx( 995, 1250, 362, 384);

    // ------------------------------------------------------------------------
    // 3. PERIMETER WALL OF "LA CALLE DEL HAMBRE" (WITH EXACT LEFT RECESS AT x=48..195!)
    // ------------------------------------------------------------------------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x9e9384, roughness: 0.78 });
    const copingMat = new THREE.MeshStandardMaterial({ color: 0xcbc0b0, roughness: 0.62 });

    const addWallSegmentPx = (x1Px, y1Px, x2Px, y2Px, hM = 2.2) => {
      const dx = px(x2Px) - px(x1Px);
      const dz = pz(y2Px) - pz(y1Px);
      const len = Math.hypot(dx, dz);
      const cx = (px(x1Px) + px(x2Px)) * 0.5;
      const cz = (pz(y1Px) + pz(y2Px)) * 0.5;
      const ang = -Math.atan2(dz, dx);

      const w = new THREE.Mesh(new THREE.BoxGeometry(len, hM, 0.35), wallMat);
      w.position.set(cx, hM * 0.5, cz);
      w.rotation.y = ang;
      w.castShadow = true;

      const cap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.16, 0.46), copingMat);
      cap.position.set(cx, hM + 0.08, cz);
      cap.rotation.y = ang;
      this.world.add(w, cap);
    };

    // West wall of lot (xPx = 48, yPx = -80 .. 122)
    addWallSegmentPx(48, -80, 48, 122, 2.2);
    // Recessed plaza wall (xPx = 48 .. 195, yPx = 122)
    addWallSegmentPx(48, 122, 195, 122, 2.2);
    // Step out from y=122 to y=138 at xPx = 195
    addWallSegmentPx(195, 122, 195, 138, 2.2);
    // Main Calle del Hambre wall (xPx = 195 .. 905, yPx = 138 -> 710 px = 106.5 m!)
    addWallSegmentPx(195, 138, 905, 138, 2.2);
    // East wall turning North along the vertical street (xPx = 905, yPx = 138 .. -80)
    addWallSegmentPx(905, 138, 905, -80, 2.2);
    // Internal dividing wall at xPx = 395
    addWallSegmentPx(395, 138, 395, -80, 1.8);

    // ------------------------------------------------------------------------
    // 4. DETAILED ARCHITECTURAL BUILDINGS (NO RANDOM PLAIN BOXES!)
    // ------------------------------------------------------------------------

    // A. West-Edge Building on ruler-overlay.jpg (xPx = -35 .. 38, yPx = -20 .. 145)
    this.world.add(this.archBuilder.createPitchedTileBuilding({
      x1Px: -35, x2Px: 38, y1Px: 20, y2Px: 145,
      wallHeightM: 5.5, roofPeakM: 2.0, wallHex: '#eddcc8',
    }));

    // B. NW Diagonal 8-Story Residential/Commercial Tower (xPx = -240 .. -45, yPx = -70 .. 125)
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: -230, x2Px: -48, y1Px: 15, y2Px: 132,
      heightM: 7.5, floors: 2, wallHex: '#f0e6d8', roofHex: '#dfd7cc',
      hasPenthouse: false, hasWaterTank: true, acCount: 2,
    }));
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: -205, x2Px: -95, y1Px: -45, y2Px: 95,
      heightM: 22.0, floors: 7, wallHex: '#d8cfc4', roofHex: '#6e655f',
      hasPenthouse: true, hasWaterTank: true, acCount: 4, rotY: -0.68,
    }));

    // C. North-East Block Buildings (across the right-hand vertical street, xPx = 995 .. 1255)
    // NE-1: Upper pitched clay-tile roof villas (yPx = -75 .. -10)
    this.world.add(this.archBuilder.createPitchedTileBuilding({
      x1Px: 1010, x2Px: 1135, y1Px: -75, y2Px: -12,
      wallHeightM: 5.0, roofPeakM: 2.2, wallHex: '#f5ebd6',
    }));
    // NE-2: Middle Commercial Building with recessed tan roof & A/C units (yPx = 0 .. 72)
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: 998, x2Px: 1185, y1Px: 0, y2Px: 72,
      heightM: 9.5, floors: 3, wallHex: '#e8dec8', roofHex: '#c9b08e', parapetHex: '#5c4632',
      hasPenthouse: true, hasWaterTank: true, acCount: 3,
    }));
    // Street-level reference shows a low red/cream frontage and palm terrace here.
    buildReferenceCorner(this.world, { px, pz, pm });
    // NE-4: Right-edge 4-story Office Building (xPx = 1190 .. 1255, yPx = -20 .. 148)
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: 1190, x2Px: 1255, y1Px: -20, y2Px: 148,
      heightM: 13.5, floors: 4, wallHex: '#cbd5e1', roofHex: '#94a3b8', parapetHex: '#e2e8f0',
      hasPenthouse: true, hasWaterTank: false, acCount: 3,
    }));

    // D. South-West Block ("Iglesia Avivamiento" & Terracotta Stepped Apartment Tower, xPx = -330 .. 48, yPx = 465 .. 710)
    this.world.add(this.archBuilder.createPitchedTileBuilding({
      x1Px: -330, x2Px: -210, y1Px: 490, y2Px: 705,
      wallHeightM: 7.0, roofPeakM: 2.5, wallHex: '#e2d5c4',
    }));
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: -200, x2Px: -105, y1Px: 468, y2Px: 705,
      heightM: 21.0, floors: 7, wallHex: '#e09880', roofHex: '#c87a62', parapetHex: '#f5d0c4',
      hasPenthouse: true, hasWaterTank: true, acCount: 4,
    }));
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: -100, x2Px: 42, y1Px: 472, y2Px: 705,
      heightM: 11.0, floors: 3, wallHex: '#e2e8f0', roofHex: '#cbd5e1', parapetHex: '#f8fafc',
      hasPenthouse: true, hasWaterTank: true, acCount: 3,
    }));

    // E. South-Central Twin White Buildings + Courtyard Guardhouse (xPx = 265 .. 515, yPx = 468 .. 660)
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: 265, x2Px: 385, y1Px: 468, y2Px: 660,
      heightM: 12.0, floors: 4, wallHex: '#f1f5f9', roofHex: '#d6d3cd', parapetHex: '#ffffff',
      hasPenthouse: true, hasWaterTank: true, acCount: 3,
    }));
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: 392, x2Px: 505, y1Px: 495, y2Px: 645,
      heightM: 10.5, floors: 3, wallHex: '#e2e8f0', roofHex: '#ccc8c2', parapetHex: '#f8fafc',
      hasPenthouse: false, hasWaterTank: true, acCount: 2,
    }));
    // Courtyard utility pavilion
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: 545, x2Px: 590, y1Px: 540, y2Px: 585,
      heightM: 4.5, floors: 1, wallHex: '#d6d3cd', roofHex: '#94a3b8',
      hasPenthouse: false, hasWaterTank: false, acCount: 1,
    }));

    // F. THE ICONIC STEPPED DARK CORPORATE/RESIDENTIAL TOWER AT BOTTOM-RIGHT (xPx = 700 .. 955, yPx = 432 .. 705)
    //    Notice on ruler-overlay.jpg how its North wing juts up to yPx = 432 at xPx = 815..920!
    //    1. North projecting glass-curtain wing (xPx = 815 .. 922, yPx = 432 .. 490)
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: 815, x2Px: 922, y1Px: 432, y2Px: 490,
      heightM: 24.0, floors: 8, wallHex: '#1e293b', roofHex: '#1e2530', parapetHex: '#334155',
      windowHex: '#0f172a', hasPenthouse: false, hasWaterTank: false, acCount: 2,
    }));
    //    2. Main High Tower Mass (xPx = 700 .. 890, yPx = 452 .. 700) with the 2 mint-rimmed elevator cores
    const mainTower = this.archBuilder.createSlabBuilding({
      x1Px: 700, x2Px: 890, y1Px: 452, y2Px: 700,
      heightM: 26.0, floors: 8, wallHex: '#252f3f', roofHex: '#252c38', parapetHex: '#475569',
      windowHex: '#0f172a', hasPenthouse: false, hasWaterTank: false, acCount: 4,
    });
    this.world.add(mainTower);

    // Add the 2 signature mint-green rimmed penthouse cores on top of the main dark tower
    const coreRimMat = new THREE.MeshStandardMaterial({ color: 0xa8d5ba, roughness: 0.45 });
    const coreTopMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc4, roughness: 0.55 });
    for (const [cxP, cyP, wP, dP] of [[775, 535, 65, 52], [790, 600, 72, 58]]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(pm(wP + 6), 2.2, pm(dP + 6)), coreRimMat);
      rim.position.set(px(cxP), 26.8, pz(cyP));
      const top = new THREE.Mesh(new THREE.BoxGeometry(pm(wP), 2.4, pm(dP)), coreTopMat);
      top.position.set(px(cxP), 26.9, pz(cyP));
      this.world.add(rim, top);
    }

    //    3. Eastern stepped terrace tiers (xPx = 890 .. 955, yPx = 470 .. 700)
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: 890, x2Px: 925, y1Px: 470, y2Px: 700,
      heightM: 19.0, floors: 6, wallHex: '#2c3646', roofHex: '#2c3545', parapetHex: '#475569',
      hasPenthouse: false, hasWaterTank: false, acCount: 1,
    }));
    this.world.add(this.archBuilder.createSlabBuilding({
      x1Px: 925, x2Px: 958, y1Px: 480, y2Px: 700,
      heightM: 13.0, floors: 4, wallHex: '#334155', roofHex: '#333d4d', parapetHex: '#64748b',
      hasPenthouse: false, hasWaterTank: true, acCount: 1,
    }));

    // ------------------------------------------------------------------------
    // 5. ALL TREES AT THEIR EXACT PIXEL COORDINATES FROM RULER-OVERLAY.JPG
    // ------------------------------------------------------------------------
    this._buildPhotogrammetricTrees();
  }

  _buildPhotogrammetricTrees() {
    const canopyMat = new THREE.MeshStandardMaterial({
      map: this.textures.treeCanopy,
      roughness: 0.74,
      metalness: 0.02,
    });
    const barkMat = new THREE.MeshStandardMaterial({
      map: this.textures.treeBark,
      roughness: 0.85,
      metalness: 0.04,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.textures.shadow,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    shadowGeo.rotateX(-Math.PI * 0.5);

    const canopyGeo = new THREE.SphereGeometry(1.0, 22, 16);
    const posAttr = canopyGeo.attributes.position;
    const uvAttr = canopyGeo.attributes.uv;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const angle = Math.atan2(vz, vx);
      const horizR = Math.hypot(vx, vz);
      const scallop = 1.0 + 0.055 * Math.cos(angle * 7) * horizR;
      posAttr.setX(i, vx * scallop);
      posAttr.setY(i, vy * 0.76 + (vy < 0 ? 0.12 : 0));
      posAttr.setZ(i, vz * scallop);
      const u = clamp(0.5 + (vx * scallop) * 0.46, 0.02, 0.98);
      const v = clamp(0.5 + (vz * scallop) * 0.46, 0.02, 0.98);
      uvAttr.setXY(i, u, v);
    }
    canopyGeo.computeVertexNormals();

    /**
     * Places a concentric-ring tree at exact reference pixel (xPx, yPx) with canopy diameter in pixels `diamPx`!
     */
    const addTreePx = (xPx, yPx, diamPx = 56) => {
      const radiusM = pm(diamPx * 0.5);
      const scale = radiusM / 1.35;
      const tree = new THREE.Group();
      tree.position.set(px(xPx), 0, pz(yPx));

      const sh = new THREE.Mesh(shadowGeo, shadowMat);
      sh.scale.set(radiusM * 2.3, 1, radiusM * 2.3);
      sh.position.set(0.35, 0.04, 0.35);
      tree.add(sh);

      const trunkH = 1.65 * scale;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24 * scale, 0.40 * scale, trunkH, 9),
        barkMat
      );
      trunk.position.y = trunkH * 0.48;
      tree.add(trunk);

      const mainCrown = new THREE.Mesh(canopyGeo, canopyMat);
      const r1 = 1.22 * scale;
      mainCrown.scale.set(r1, r1, r1);
      mainCrown.position.set(0, trunkH + 0.42 * scale, 0);
      mainCrown.rotation.y = (xPx * 0.17 + yPx * 0.09) % (Math.PI * 2);
      mainCrown.castShadow = true;
      tree.add(mainCrown);

      const subCrown = new THREE.Mesh(canopyGeo, canopyMat);
      const r2 = 1.42 * scale;
      subCrown.scale.set(r2, r2 * 0.72, r2);
      subCrown.position.set(0.06 * scale, trunkH + 0.1 * scale, 0.06 * scale);
      subCrown.rotation.y = mainCrown.rotation.y + 0.5;
      tree.add(subCrown);

      this.world.add(tree);
    };

    // ------------------------------------------------------------------------
    // A. TREES INSIDE THE "CALLE DEL HAMBRE" WALLED LOT (yPx <= 125, strictly behind wall yPx=138!)
    // ------------------------------------------------------------------------
    // Left trees inside lot (xPx = 65..185)
    addTreePx(72,  96,  48);
    addTreePx(118, 65,  54);
    addTreePx(165, 22,  52);

    // Tree at xPx = 278, yPx = 122 (planted inside the wall at y=122; canopy overhangs the sidewalk!)
    addTreePx(278, 122, 66);

    // Dense central grove INSIDE the lot behind the wall (xPx = 415 .. 635, yPx = 35 .. 115)
    addTreePx(425, 92,  64);
    addTreePx(445, 38,  68);
    addTreePx(485, 102, 62);
    addTreePx(535, 95,  68);
    addTreePx(548, 35,  58);
    addTreePx(590, 98,  64);
    addTreePx(625, 55,  54);

    // THE GIANT OVERHANGING TREE AT xPx = 720, yPx = 118 (diameter = 112 px = 16.8 m!):
    // Trunk is inside the wall (yPx = 118 < 138), and its huge canopy overhangs the sidewalk down to yPx = 174!
    buildLandmarkTree(this.world, { px, pz, pm });

    // Right corner grove inside the walled lot (xPx = 815 .. 885, yPx = 45 .. 108)
    addTreePx(818, 88,  66);
    addTreePx(862, 92,  68);
    addTreePx(872, 32,  60);

    // ------------------------------------------------------------------------
    // B. TREES ON THE 3 AVENUE MEDIAN ISLANDS (EXACT RULER-OVERLAY.JPG POSITIONS!)
    // ------------------------------------------------------------------------
    // Median 1 (yPx = 244)
    addTreePx(298, 244, 34);
    addTreePx(356, 244, 38);
    addTreePx(532, 244, 28);

    // Median 2 (Central main expressway median, yPx = 306)
    addTreePx(76,  302, 46);
    addTreePx(158, 300, 56);
    addTreePx(322, 304, 36);
    addTreePx(778, 304, 38);
    addTreePx(818, 302, 48);

    // Median 3 (South service median, yPx = 373)
    addTreePx(288, 374, 32);
    addTreePx(382, 374, 30);
    addTreePx(548, 374, 32);
    addTreePx(752, 372, 64);
    addTreePx(858, 374, 72);

    // South sidewalk tree at xPx = 485, yPx = 445
    addTreePx(485, 445, 44);
    // Broadleaf canopy behind the palms on the commercial terrace.
    addTreePx(1070, 136, 64);

    // ------------------------------------------------------------------------
    // C. SURROUNDING BLOCK TREES (SW Forest Lot & SE Wooded Lot)
    // ------------------------------------------------------------------------
    for (let yP = 490; yP <= 690; yP += 55) {
      for (let xP = 75; xP <= 235; xP += 52) {
        addTreePx(xP + (yP % 2) * 14, yP, 58);
      }
    }
    for (let yP = 490; yP <= 690; yP += 58) {
      for (let xP = 985; xP <= 1220; xP += 62) {
        addTreePx(xP, yP, 60);
      }
    }
  }

  _loop(t = 0) {
    requestAnimationFrame((tt) => this._loop(tt));
    if (document.hidden) { this._lastT = t; return; }
    const dt = Math.min(0.1, Math.max(0, (t - (this._lastT ?? t)) / 1000));
    this._lastT = t;

    if (this.catalogView) {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      this.renderer.clear();
      this.renderer.render(this.catalogView.scene, this.catalogView.camera);
      return;
    }

    const width = window.innerWidth;
    if (this.cartOnly) {
      this.prepView.update?.(dt);
      this.renderer.setViewport(0, 0, width, window.innerHeight);
      this.renderer.setScissor(0, 0, width, window.innerHeight);
      this.renderer.render(this.prepView.scene, this.cartCamera);
      return;
    }
    const { mapHeight, cartHeight } = this._viewportLayout();
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    this.renderer.setViewport(0, cartHeight, width, mapHeight);
    this.renderer.setScissor(0, cartHeight, width, mapHeight);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setViewport(0, 0, width, cartHeight);
    this.renderer.setScissor(0, 0, width, cartHeight);
    this.renderer.render(this.prepView.scene, this.cartCamera);
  }
}

window.game = new CalleDelHambrePhotogrammetricScene();

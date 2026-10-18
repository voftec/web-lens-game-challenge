// cast-characters.js — creature cast for Calle el Hambre. Each character is a
// DIFFERENT body plan (cat / dog / rabbit / robot / ghost / penguin / bear /
// alien / cactus / slime), toon-shaded + outlined, same runtime API:
//   createCharacter(cfg) → {group, bodyPivot, headGroup, update(dt,t,lookAt),
//     setMood(m), setIndicator(kind), talk(), enter(x,dur,delay), leave(x,dur)}
import * as THREE from './assets/vendor/three.module.js';

let _gradientMap = null;
function toonGradient() {
  if (_gradientMap) return _gradientMap;
  const data = new Uint8Array([90, 170, 255]);
  _gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  _gradientMap.needsUpdate = true;
  _gradientMap.minFilter = _gradientMap.magFilter = THREE.NearestFilter;
  return _gradientMap;
}
const toonMat = (color, opts = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts });

const OUTLINE_COLOR = 0x402818;
function addOutline(mesh, thickness = 1.07) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide }));
  o.scale.setScalar(thickness);
  mesh.add(o);
  return o;
}

function deformChibiHeadPoint(x, y, z) {
  let sx = x * 1.06, sy = y * 0.96, sz = z * 0.98;
  const cheekBand = Math.exp(-Math.pow((y + 0.11) / 0.17, 2));
  const frontBias = Math.max(0, (z + 0.15) / 0.55);
  const bulge = 1.0 + 0.085 * cheekBand * (0.55 + 0.45 * frontBias);
  sx *= bulge; sz *= 1.0 + 0.045 * cheekBand;
  const chin = Math.max(0, -(y + 0.06)) / 0.34;
  sx *= 1 - 0.30 * chin; sz *= 1 - 0.16 * chin;
  return [sx, sy, sz];
}
function createChibiHeadGeometry(radius = 0.42) {
  const geo = new THREE.SphereGeometry(radius, 36, 28);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const [nx, ny, nz] = deformChibiHeadPoint(pos.getX(i), pos.getY(i), pos.getZ(i));
    pos.setXYZ(i, nx, ny, nz);
  }
  geo.computeVertexNormals();
  return geo;
}
function createConformingFacePatchGeometry(radius = 0.422, lonSpan = 1.38, latSpan = 1.12) {
  const geo = new THREE.PlaneGeometry(1, 1, 28, 24);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const lon = (u - 0.5) * lonSpan, lat = (v - 0.5) * latSpan;
    const rawX = radius * Math.sin(lon) * Math.cos(lat);
    const rawY = radius * Math.sin(lat);
    const rawZ = radius * Math.cos(lon) * Math.cos(lat);
    const [dx, dy, dz] = deformChibiHeadPoint(rawX, rawY, rawZ);
    pos.setXYZ(i, dx * 1.006, dy * 1.006, dz * 1.006 + 0.002);
  }
  geo.computeVertexNormals();
  return geo;
}

function canvasTex(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// shared face-drawing helpers (512² face patch canvas)
// ---------------------------------------------------------------------------
function drawBrows(ctx, mood, y = 196, span = 74) {
  ctx.strokeStyle = 'rgba(70,45,28,.85)';
  ctx.lineWidth = 11; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const bx = 256 + side * span;
    ctx.beginPath();
    if (mood === 'angry' || mood === 'impatient') { ctx.moveTo(bx - side * 30, y - 22); ctx.lineTo(bx + side * 22, y + 4); }
    else if (mood === 'happy') ctx.arc(bx, y + 8, 30, Math.PI * 1.1, Math.PI * 1.9);
    else ctx.arc(bx, y, 27, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}
function drawBlush(ctx, y = 306, span = 134, color = 'rgba(255,120,130,.5)') {
  ctx.fillStyle = color;
  for (const cx of [256 - span, 256 + span]) { ctx.beginPath(); ctx.ellipse(cx, y, 30, 17, 0, 0, Math.PI * 2); ctx.fill(); }
}
function drawPaintedEyes(ctx, { mood, style = 'round', ey = 246, span = 74, color = '#2a1a12' }) {
  for (const side of [-1, 1]) {
    const ex = 256 + side * span;
    if (style === 'happy' || mood === 'happy') {
      ctx.strokeStyle = color; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(ex, ey + 12, 30, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex, ey, 30, 38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      const pr = mood === 'angry' ? 11 : 15;
      ctx.beginPath(); ctx.ellipse(ex, ey + 4, pr, pr + 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex - 6, ey - 6, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 5, ey + 9, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function drawMouth(ctx, mood, y = 316) {
  ctx.strokeStyle = '#3d2016'; ctx.fillStyle = '#d8505e';
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  if (mood === 'happy') {
    ctx.beginPath(); ctx.arc(256, y - 14, 32, 0.08 * Math.PI, 0.92 * Math.PI); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9aa2';
    ctx.beginPath(); ctx.ellipse(256, y + 18, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'angry') {
    ctx.beginPath(); ctx.arc(256, y + 36, 24, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else if (mood === 'impatient') {
    ctx.beginPath(); ctx.moveTo(230, y + 8);
    ctx.quadraticCurveTo(243, y, 256, y + 8);
    ctx.quadraticCurveTo(269, y + 16, 282, y + 8);
    ctx.stroke();
  } else {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(256 + side * 11, y, 11, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// per-species face painters (mood-aware), painted eyes only when species
// doesn't use the 3D glossy eyeballs
// ---------------------------------------------------------------------------
const FACE = {
  cat: ({ mood }) => canvasTex(512, 512, ctx => {
    drawBrows(ctx, mood);
    ctx.strokeStyle = 'rgba(60,35,20,.7)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const side of [-1, 1]) for (const wy of [-8, 8, 24]) {
      ctx.beginPath();
      ctx.moveTo(256 + side * 96, 300 + wy * 0.4);
      ctx.quadraticCurveTo(256 + side * 150, 296 + wy, 256 + side * 196, 288 + wy * 1.6);
      ctx.stroke();
    }
    ctx.fillStyle = '#e8658a';
    ctx.beginPath(); ctx.moveTo(256, 296); ctx.lineTo(244, 284); ctx.lineTo(268, 284); ctx.closePath(); ctx.fill();
    drawBlush(ctx);
    drawMouth(ctx, mood, 320);
  }),
  dog: ({ mood }) => canvasTex(512, 512, ctx => {
    drawBrows(ctx, mood);
    ctx.fillStyle = 'rgba(255,240,215,.9)';
    ctx.beginPath(); ctx.ellipse(256, 322, 72, 52, 0, 0, Math.PI * 2); ctx.fill(); // muzzle
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath(); ctx.ellipse(256, 296, 16, 11, 0, 0, Math.PI * 2); ctx.fill(); // nose
    ctx.strokeStyle = '#3d2016'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(256, 306); ctx.lineTo(256, 316); ctx.stroke();
    if (mood === 'happy') {
      ctx.fillStyle = '#ff8a94';
      ctx.beginPath(); ctx.ellipse(256, 348, 20, 26, 0, 0, Math.PI * 2); ctx.fill(); // tongue out
      ctx.strokeStyle = '#d8505e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(256, 330); ctx.lineTo(256, 360); ctx.stroke();
    } else drawMouth(ctx, mood, 330);
    drawBlush(ctx, 296);
  }),
  rabbit: ({ mood }) => canvasTex(512, 512, ctx => {
    drawBrows(ctx, mood);
    ctx.fillStyle = '#e8658a';
    ctx.beginPath(); ctx.moveTo(256, 292); ctx.lineTo(245, 281); ctx.lineTo(267, 281); ctx.closePath(); ctx.fill();
    drawBlush(ctx);
    drawMouth(ctx, mood, 312);
    // buck teeth
    ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = '#3d2016'; ctx.lineWidth = 3;
    ctx.fillRect(246, 326, 10, 13); ctx.strokeRect(246, 326, 10, 13);
    ctx.fillRect(256, 326, 10, 13); ctx.strokeRect(256, 326, 10, 13);
  }),
  bear: ({ mood }) => canvasTex(512, 512, ctx => {
    drawBrows(ctx, mood);
    ctx.fillStyle = 'rgba(255,235,200,.9)';
    ctx.beginPath(); ctx.ellipse(256, 316, 60, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath(); ctx.ellipse(256, 294, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
    drawBlush(ctx);
    drawMouth(ctx, mood, 326);
  }),
  robot: ({ mood }) => canvasTex(512, 512, ctx => {
    ctx.fillStyle = '#1a2030'; ctx.fillRect(0, 0, 512, 512); // dark screen face
    const glow = mood === 'angry' ? '#ff5a5a' : mood === 'impatient' ? '#ffd25a' : '#54e8ff';
    ctx.fillStyle = glow;
    for (const side of [-1, 1]) {
      const ex = 256 + side * 76, ey = 246;
      if (mood === 'happy') {
        ctx.strokeStyle = glow; ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ex, ey + 12, 28, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.roundRect(ex - 22, ey - 30, 44, 60, 14); ctx.fill();
        ctx.fillStyle = '#0a1420';
        ctx.beginPath(); ctx.roundRect(ex - 10, ey - 14, 20, 26, 8); ctx.fill();
        ctx.fillStyle = glow;
      }
    }
    // smile slot
    ctx.fillStyle = glow;
    if (mood === 'happy') { ctx.beginPath(); ctx.arc(256, 300, 34, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineTo(256, 300); ctx.fill(); }
    else if (mood === 'angry') { ctx.fillRect(216, 340, 80, 10); }
    else { ctx.beginPath(); ctx.arc(256, 316, 20, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineTo(256, 316); ctx.fill(); }
    // side screws
    ctx.fillStyle = '#8a94a8';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(256 + side * 190, 246, 14, 0, Math.PI * 2); ctx.fill(); }
  }),
  ghost: ({ mood }) => canvasTex(512, 512, ctx => {
    ctx.fillStyle = '#2a1a30';
    for (const side of [-1, 1]) {
      const ex = 256 + side * 66, ey = 250;
      if (mood === 'happy') {
        ctx.strokeStyle = '#2a1a30'; ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ex, ey + 10, 26, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(ex, ey, 24, mood === 'angry' ? 26 : 34, side * -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ex - 6, ey - 10, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1a30';
      }
    }
    ctx.fillStyle = '#2a1a30';
    if (mood === 'angry') { ctx.beginPath(); ctx.ellipse(256, 340, 20, 14, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(256, 330, 16, 22, 0, 0, Math.PI * 2); ctx.fill(); }
    drawBlush(ctx, 300, 140, 'rgba(160,120,220,.5)');
  }),
  alien: ({ mood }) => canvasTex(512, 512, ctx => {
    drawBrows(ctx, mood, 190);
    drawBlush(ctx, 296, 140, 'rgba(120,220,160,.4)');
    drawMouth(ctx, mood, 312);
  }),
  cactus: ({ mood }) => canvasTex(512, 512, ctx => {
    drawBrows(ctx, mood);
    drawBlush(ctx);
    drawMouth(ctx, mood, 314);
  }),
  slime: ({ mood }) => canvasTex(512, 512, ctx => {
    for (const side of [-1, 1]) {
      const ex = 256 + side * 70, ey = 250;
      ctx.fillStyle = '#2a1a12';
      ctx.beginPath(); ctx.ellipse(ex, ey, 26, mood === 'happy' ? 18 : 32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex - 7, ey - 9, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1a12';
    }
    drawBlush(ctx, 300, 136, 'rgba(255,120,130,.55)');
    drawMouth(ctx, mood, 318);
  }),
};

// shirt canvas texture for hooded bodies (robot/alien use suit panels)
function bodyTex(baseHex, kind) {
  return canvasTex(256, 256, ctx => {
    ctx.fillStyle = baseHex; ctx.fillRect(0, 0, 256, 256);
    if (kind === 'belly') { // penguin/bear tummy
      ctx.fillStyle = '#fff4dd';
      ctx.beginPath(); ctx.ellipse(128, 150, 95, 105, 0, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'panel') { // robot chest panel
      ctx.fillStyle = '#1a2030';
      ctx.beginPath(); ctx.roundRect(48, 60, 160, 120, 18); ctx.fill();
      ctx.fillStyle = '#54e8ff';
      for (let i = 0; i < 3; i++) ctx.fillRect(66, 82 + i * 30, 124, 12);
    } else if (kind === 'ribs') { // cactus ribs
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 8;
      for (let x = 40; x < 256; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 10, 128, x, 256); ctx.stroke(); }
    }
  });
}

// mood indicator sprite texture
function createIndicatorTexture(kind) {
  return canvasTex(128, 128, ctx => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'angry') {
      ctx.strokeStyle = '#e8322a'; ctx.lineWidth = 13;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        ctx.beginPath();
        ctx.moveTo(64 + dx * 16 - dy * 12, 64 + dy * 16 + dx * 12);
        ctx.quadraticCurveTo(64 + dx * 34, 64 + dy * 34, 64 + dx * 16 + dy * 12, 64 + dy * 16 - dx * 12);
        ctx.stroke();
      }
    } else if (kind === 'sweat') {
      ctx.fillStyle = '#58b8f0'; ctx.strokeStyle = '#1d6fa8'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(64, 20); ctx.quadraticCurveTo(96, 72, 64, 104); ctx.quadraticCurveTo(32, 72, 64, 20);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(54, 74, 9, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'alert') {
      ctx.fillStyle = '#ffd22e'; ctx.strokeStyle = '#8a6a00'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(64, 14); ctx.lineTo(110, 106); ctx.lineTo(18, 106); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a2417'; ctx.fillRect(58, 44, 12, 34);
      ctx.beginPath(); ctx.arc(64, 92, 8, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'happy') {
      ctx.fillStyle = '#ff7ab0'; ctx.strokeStyle = '#a83366'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(52, 92, 18, 13, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(68, 88); ctx.lineTo(68, 28); ctx.lineTo(96, 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(68, 28); ctx.quadraticCurveTo(88, 26, 98, 46); ctx.stroke();
    }
  });
}

// glossy 3D eyes w/ double catchlights — attach to a head group
function makeEyes(span = 0.082, z = 0.238, r = 0.052) {
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x2a1a1e, roughness: 0.12, clearcoat: 1.0, clearcoatRoughness: 0.08 });
  const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), eyeMat);
    eye.scale.set(0.85, 1.18, 0.55);
    eye.position.set(side * span, 0.005, z);
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.3, 8, 8), catchMat);
    s1.position.set(-0.014, 0.022, 0.036);
    eye.add(s1);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 8), catchMat);
    s2.position.set(0.016, -0.012, 0.037);
    eye.add(s2);
    g.add(eye);
  }
  return g;
}

const stub = (r, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, r * 1.6, 6, 10), mat); m.castShadow = true; addOutline(m, 1.1); return m; };
const ball = (r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat); m.castShadow = true; addOutline(m, 1.08); return m; };

// ---------------------------------------------------------------------------
// SPECIES BUILDERS — each returns {extras} and fills rig.{bodyPivot,headGroup}
// ---------------------------------------------------------------------------
const BUILDERS = {
  // 🐱 cat — big head + ears + whiskers + tail, small body
  cat(rig, cfg) {
    const fur = toonMat(cfg.color ?? 0xe89a5a);
    const inner = toonMat(0xf5b8c4);
    const body = ball(0.26, fur); body.position.y = 0.42; body.scale.set(1, 1.15, 0.9); rig.bodyPivot.add(body);
    for (const side of [-1, 1]) { const l = stub(0.07, fur); l.position.set(side * 0.10, 0.14, 0); rig.bodyPivot.add(l); }
    for (const side of [-1, 1]) { const a = stub(0.055, fur); a.position.set(side * 0.24, 0.44, 0.06); a.rotation.z = side * 0.5; rig.bodyPivot.add(a); }
    // tail — curved
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 16, Math.PI * 0.9), fur);
    tail.position.set(-0.24, 0.30, -0.14); tail.rotation.set(0.4, 0.9, -0.6); tail.castShadow = true;
    rig.bodyPivot.add(tail); addOutline(tail, 1.12);
    const head = new THREE.Mesh(createChibiHeadGeometry(0.30), fur);
    head.scale.set(1.12, 0.95, 0.95); head.castShadow = true;
    rig.headGroup.add(head); addOutline(head, 1.06);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.20, 4), fur);
      ear.position.set(side * 0.20, 0.30, -0.02); ear.rotation.y = Math.PI / 4; ear.rotation.z = -side * 0.15;
      ear.castShadow = true; rig.headGroup.add(ear); addOutline(ear, 1.10);
      const ie = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.11, 4), inner);
      ie.position.set(side * 0.20, 0.29, 0.03); ie.rotation.y = Math.PI / 4; ie.rotation.z = -side * 0.15;
      rig.headGroup.add(ie);
      rig.earPivots.push(ear);
    }
    rig.headGroup.add(makeEyes(0.085, 0.245, 0.055));
    return { walkMode: 'walk' };
  },

  // 🐶 dog — floppy ears + big muzzle + wagging tail
  dog(rig, cfg) {
    const fur = toonMat(cfg.color ?? 0xb8875a);
    const dark = toonMat(0x6a4a30);
    const body = ball(0.26, fur); body.position.y = 0.40; body.scale.set(1.05, 1.1, 0.95); rig.bodyPivot.add(body);
    for (const side of [-1, 1]) { const l = stub(0.07, fur); l.position.set(side * 0.10, 0.13, 0); rig.bodyPivot.add(l); }
    for (const side of [-1, 1]) { const a = stub(0.055, fur); a.position.set(side * 0.25, 0.42, 0.06); a.rotation.z = side * 0.45; rig.bodyPivot.add(a); }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), fur);
    tail.position.set(0, 0.34, -0.28); tail.rotation.x = -0.8; tail.castShadow = true;
    rig.bodyPivot.add(tail); addOutline(tail, 1.12); rig.tail = tail;
    const head = new THREE.Mesh(createChibiHeadGeometry(0.30), fur);
    head.scale.set(1.1, 0.95, 0.98); head.castShadow = true;
    rig.headGroup.add(head); addOutline(head, 1.06);
    for (const side of [-1, 1]) { // floppy ears
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.16, 6, 10), dark);
      ear.position.set(side * 0.30, 0.12, 0.02);
      ear.rotation.z = side * 0.75; ear.rotation.x = 0.15;
      ear.castShadow = true; rig.headGroup.add(ear); addOutline(ear, 1.10);
      rig.earPivots.push(ear);
    }
    rig.headGroup.add(makeEyes(0.085, 0.245, 0.055));
    return { walkMode: 'walk' };
  },

  // 🐰 rabbit — tall ears + hop-ish bob
  rabbit(rig, cfg) {
    const fur = toonMat(cfg.color ?? 0xf0e6f5);
    const inner = toonMat(0xf5a8c8);
    const body = ball(0.24, fur); body.position.y = 0.36; body.scale.set(1, 1.1, 0.9); rig.bodyPivot.add(body);
    for (const side of [-1, 1]) { const f = stub(0.075, fur); f.position.set(side * 0.10, 0.10, 0.06); f.rotation.x = 1.2; rig.bodyPivot.add(f); }
    for (const side of [-1, 1]) { const a = stub(0.05, fur); a.position.set(side * 0.20, 0.40, 0.08); a.rotation.z = side * 0.4; rig.bodyPivot.add(a); }
    const tail = ball(0.08, toonMat(0xffffff)); tail.position.set(0, 0.28, -0.24); rig.bodyPivot.add(tail);
    const head = new THREE.Mesh(createChibiHeadGeometry(0.28), fur);
    head.scale.set(1.05, 0.95, 0.95); head.castShadow = true;
    rig.headGroup.add(head); addOutline(head, 1.06);
    for (const side of [-1, 1]) { // long ears
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.30, 8, 12), fur);
      ear.position.set(side * 0.13, 0.42, -0.02); ear.rotation.z = -side * 0.12;
      ear.castShadow = true; rig.headGroup.add(ear); addOutline(ear, 1.10);
      const ie = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 6, 8), inner);
      ie.position.set(0, -0.02, 0.055); ear.add(ie);
      rig.earPivots.push(ear);
    }
    rig.headGroup.add(makeEyes(0.080, 0.235, 0.055));
    return { walkMode: 'hop' };
  },

  // 🤖 robot — box head on spring neck + antenna + panel body + wheels
  robot(rig, cfg) {
    const metal = toonMat(cfg.color ?? 0x9aa8b8);
    const dark = toonMat(0x4a5568);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.34, 3, 3, 3), toonMat('#ffffff', { map: bodyTex(cfg.colorHex ?? '#9aa8b8', 'panel') }));
    body.position.y = 0.52; body.castShadow = true;
    rig.bodyPivot.add(body); addOutline(body, 1.06);
    // tank-tread feet
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.10, 14), dark);
      w.rotation.z = Math.PI / 2; w.position.set(side * 0.14, 0.09, 0);
      w.castShadow = true; rig.bodyPivot.add(w); addOutline(w, 1.10);
    }
    // claw arms
    for (const side of [-1, 1]) {
      const a = stub(0.05, metal); a.position.set(side * 0.27, 0.56, 0.02); a.rotation.z = side * 0.6; rig.bodyPivot.add(a);
      const claw = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.025, 8, 12, Math.PI * 1.4), metal);
      claw.position.set(side * 0.30, 0.40, 0.06); claw.rotation.z = side * 2.2;
      rig.bodyPivot.add(claw); addOutline(claw, 1.15);
    }
    // head: rounded box + antenna + dark face panel (all faces are screen)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.32, 0.36, 4, 4, 4), metal);
    head.castShadow = true; rig.headGroup.add(head); addOutline(head, 1.06);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.22), rig.faceMat);
    panel.position.set(0, 0.0, 0.185); rig.headGroup.add(panel);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), dark);
    ant.position.set(0, 0.24, 0); rig.headGroup.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0x54e8ff }));
    tip.position.set(0, 0.34, 0); rig.headGroup.add(tip);
    rig.glowTip = tip;
    return { walkMode: 'roll' };
  },

  // 👻 ghost — floating teardrop, no legs, nub arms
  ghost(rig, cfg) {
    const mat = toonMat(cfg.color ?? 0xf0ecff);
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(Math.sin(t * Math.PI * 0.82) * 0.30 * (1 - t * 0.15), t * 0.78)); }
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), mat);
    body.castShadow = true;
    rig.bodyPivot.add(body); addOutline(body, 1.06);
    // wavy hem
    for (let i = 0; i < 6; i++) {
      const h = ball(0.055, mat);
      const a = (i / 6) * Math.PI * 2;
      h.position.set(Math.cos(a) * 0.16, 0.02, Math.sin(a) * 0.16);
      rig.bodyPivot.add(h);
    }
    for (const side of [-1, 1]) { const a = stub(0.05, mat); a.position.set(side * 0.27, 0.44, 0.06); a.rotation.z = side * 0.9; rig.bodyPivot.add(a); }
    // face is painted directly on the body (no separate head mesh)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), rig.faceMat);
    face.position.set(0, 0.55, 0.255); face.rotation.x = -0.12;
    rig.bodyPivot.add(face);
    rig.floats = true;
    return { walkMode: 'float' };
  },

  // 🐧 penguin — pear body + white belly + beak + flippers
  penguin(rig, cfg) {
    const mat = toonMat(cfg.color ?? 0x3a4a5c);
    const orange = toonMat(0xf0942a);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.30, 24, 18), toonMat('#ffffff', { map: bodyTex(cfg.colorHex ?? '#3a4a5c', 'belly') }));
    body.position.y = 0.40; body.scale.set(0.95, 1.18, 0.9);
    body.castShadow = true; rig.bodyPivot.add(body); addOutline(body);
    for (const side of [-1, 1]) { // orange feet
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), orange);
      f.scale.set(1.0, 0.4, 1.4); f.position.set(side * 0.11, 0.03, 0.08);
      f.castShadow = true; rig.bodyPivot.add(f); addOutline(f, 1.12);
    }
    for (const side of [-1, 1]) { // flippers
      const w = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.20, 6, 10), mat);
      w.position.set(side * 0.28, 0.48, 0.02); w.rotation.z = side * 0.55;
      w.castShadow = true; rig.bodyPivot.add(w); addOutline(w, 1.10);
    }
    // head merges w/ body; beak + eyes on upper body
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 10), orange);
    beak.position.set(0, 0.66, 0.28); beak.rotation.x = Math.PI / 2 - 0.25;
    beak.castShadow = true; rig.headGroup.add(beak); addOutline(beak, 1.12);
    rig.headGroup.add(makeEyes(0.10, 0.26, 0.05));
    return { walkMode: 'waddle' };
  },

  // 🐻 bear — stocky + round ears + snout
  bear(rig, cfg) {
    const fur = toonMat(cfg.color ?? 0x8a6242);
    const body = ball(0.30, fur); body.position.y = 0.44; body.scale.set(1.15, 1.05, 1.0); rig.bodyPivot.add(body);
    for (const side of [-1, 1]) { const l = stub(0.09, fur); l.position.set(side * 0.13, 0.13, 0); rig.bodyPivot.add(l); }
    for (const side of [-1, 1]) { const a = stub(0.075, fur); a.position.set(side * 0.30, 0.46, 0.06); a.rotation.z = side * 0.55; rig.bodyPivot.add(a); }
    const head = new THREE.Mesh(createChibiHeadGeometry(0.30), fur);
    head.scale.set(1.08, 0.95, 0.95); head.castShadow = true;
    rig.headGroup.add(head); addOutline(head, 1.06);
    for (const side of [-1, 1]) { // round ears
      const ear = ball(0.09, fur); ear.position.set(side * 0.24, 0.26, -0.02); rig.headGroup.add(ear);
      const ie = ball(0.05, toonMat(0xd8a888)); ie.position.set(side * 0.24, 0.26, 0.045); rig.headGroup.add(ie);
      rig.earPivots.push(ear);
    }
    rig.headGroup.add(makeEyes(0.088, 0.245, 0.055));
    return { walkMode: 'walk' };
  },

  // 👽 alien — big smooth head + antennae + thin body
  alien(rig, cfg) {
    const skin = toonMat(cfg.color ?? 0x8fd8a0);
    const body = stub(0.16, toonMat(cfg.suitHex ?? '#7a5fd0')); body.position.y = 0.40; body.scale.set(1, 1.6, 0.8); rig.bodyPivot.add(body);
    for (const side of [-1, 1]) { const l = stub(0.05, toonMat(cfg.suitHex ?? '#7a5fd0')); l.position.set(side * 0.09, 0.14, 0); rig.bodyPivot.add(l); }
    for (const side of [-1, 1]) { const a = stub(0.04, skin); a.position.set(side * 0.20, 0.52, 0.05); a.rotation.z = side * 0.6; rig.bodyPivot.add(a); }
    const head = new THREE.Mesh(createChibiHeadGeometry(0.32), skin);
    head.scale.set(1.15, 1.0, 0.95); head.castShadow = true;
    rig.headGroup.add(head); addOutline(head, 1.06);
    for (const side of [-1, 1]) { // antennae w/ glow balls
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.22, 8), skin);
      stem.position.set(side * 0.14, 0.38, 0); stem.rotation.z = -side * 0.35;
      rig.headGroup.add(stem);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xa8ff6a }));
      tip.position.set(side * 0.22, 0.49, 0);
      rig.headGroup.add(tip);
      (rig.glowTips ??= []).push(tip);
    }
    // huge almond painted eyes — alien eyes are the paint, no eyeballs
    const eyes = makeEyes(0.105, 0.26, 0.075);
    eyes.children.forEach(e => e.scale.set(0.8, 1.5, 0.4));
    rig.headGroup.add(eyes);
    return { walkMode: 'float' };
  },

  // 🌵 cactus — ribbed green body + little arms + flower
  cactus(rig, cfg) {
    const green = toonMat('#ffffff', { map: bodyTex(cfg.colorHex ?? '#58b868', 'ribs') });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.40, 8, 18), green);
    body.position.y = 0.48; body.scale.set(1, 1.1, 0.9);
    body.castShadow = true; rig.bodyPivot.add(body); addOutline(body);
    for (const side of [-1, 1]) { // cactus arms
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.16, 8, 12), green);
      arm.position.set(side * 0.30, 0.55, 0); arm.rotation.z = side * 1.1;
      arm.castShadow = true; rig.bodyPivot.add(arm); addOutline(arm);
      const nub = ball(0.09, green); nub.position.set(side * 0.36, 0.66, 0); rig.bodyPivot.add(nub);
    }
    for (const side of [-1, 1]) { const f = stub(0.07, green); f.position.set(side * 0.10, 0.09, 0); rig.bodyPivot.add(f); }
    // flower on top
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), toonMat(0xff7ab0));
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.05, 0.93 + Math.sin(a * 2) * 0.01, Math.sin(a) * 0.05);
      p.scale.set(1, 0.5, 1); rig.bodyPivot.add(p);
    }
    const c = ball(0.045, toonMat(0xffd22e)); c.position.set(0, 0.94, 0); rig.bodyPivot.add(c);
    // face on upper body — use a flat patch (no separate head)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.30), rig.faceMat);
    face.position.set(0, 0.62, 0.235); face.rotation.x = -0.1;
    rig.bodyPivot.add(face);
    rig.headGroup.add(makeEyes(0.085, 0.10, 0.048));
    rig.headGroup.position.set(0, 0.62, 0.17);
    return { walkMode: 'waddle' };
  },

  // 🫠 slime — jelly blob w/ big painted face + wobble
  slime(rig, cfg) {
    const mat = toonMat(cfg.color ?? 0x7fd8f0);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 26, 20), mat);
    body.position.y = 0.30; body.scale.set(1.05, 0.82, 1.0);
    body.castShadow = true; rig.bodyPivot.add(body); addOutline(body, 1.05);
    // drips at the bottom
    for (const [x, z] of [[-0.22, 0.12], [0.24, 0.10], [0, -0.26]]) {
      const d = ball(0.07, mat); d.position.set(x, 0.05, z); rig.bodyPivot.add(d);
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), rig.faceMat);
    face.position.set(0, 0.34, 0.315);
    rig.bodyPivot.add(face);
    rig.squishy = true;
    return { walkMode: 'hop' };
  },
};

// ---------------------------------------------------------------------------
export function createCharacter({ species = 'cat', mood = 'neutral', ...cfg } = {}) {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.scale.set(cfg.build?.sx ?? 1, cfg.build?.sy ?? 1, 1);
  group.add(bodyPivot);
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.80, 0.04);
  headGroup.rotation.x = -0.12;
  bodyPivot.add(headGroup);

  const rig = {
    group, bodyPivot, headGroup,
    earPivots: [], floats: false, squishy: false,
    faceMat: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
  };
  const paintFace = FACE[species] ?? FACE.cat;
  rig.faceMat.map = paintFace({ mood });
  rig.faceMat.needsUpdate = true;
  // face patch on head for head-bearing species
  if (['cat', 'dog', 'rabbit', 'bear', 'alien'].includes(species)) {
    const r = species === 'alien' ? 0.322 : 0.302;
    const face = new THREE.Mesh(createConformingFacePatchGeometry(r, 1.50, 1.18), rig.faceMat);
    face.scale.set(species === 'alien' ? 1.15 : 1.12, species === 'alien' ? 1.0 : 0.96, 1.0);
    headGroup.add(face);
  }

  const built = BUILDERS[species](rig, cfg);

  // mood indicator sprite
  const indicatorMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
  const indicator = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), indicatorMat);
  indicator.position.set(0.32, 1.35, 0.1);
  indicator.visible = false;
  bodyPivot.add(indicator);

  const phase = Math.random() * Math.PI * 2;
  let talkTimer = 0, walkT = null, mood_ = mood;

  return {
    group, bodyPivot, headGroup, species,
    setMood(m) {
      mood_ = m;
      rig.faceMat.map = paintFace({ mood: m });
      rig.faceMat.needsUpdate = true;
    },
    setIndicator(kind, side = 1) {
      if (!kind) { indicator.visible = false; return; }
      indicatorMat.map = createIndicatorTexture(kind);
      indicatorMat.needsUpdate = true;
      indicator.position.x = 0.30 * side;
      indicator.visible = true;
      indicatorMat.opacity = 1;
    },
    talk() { talkTimer = 0.95; },
    enter(toX, dur = 1.1, delay = 0) { walkT = { from: group.position.x, to: toX, t: -delay, dur }; },
    leave(toX, dur = 1.0) { walkT = { from: group.position.x, to: toX, t: 0, dur }; },
    update(dt, t, lookAt) {
      const breathe = Math.sin(t * 2.6 + phase) * 0.016;
      let bounceY = rig.floats ? Math.sin(t * 1.9 + phase) * 0.05 + 0.05 : 0;
      if (talkTimer > 0) {
        talkTimer = Math.max(0, talkTimer - dt);
        bounceY += Math.abs(Math.sin(t * 14)) * 0.07;
      }
      let waddle = 0;
      if (walkT) {
        walkT.t += dt;
        if (walkT.t >= 0) {
          const k = Math.min(1, walkT.t / walkT.dur);
          const e = 1 - Math.pow(1 - k, 2.2);
          group.position.x = walkT.from + (walkT.to - walkT.from) * e;
          const amp = built.walkMode === 'hop' ? 0.14 : 0.09;
          bounceY += Math.abs(Math.sin(t * (built.walkMode === 'float' ? 6 : 11))) * amp * (1 - k);
          waddle = Math.sin(t * 9) * (built.walkMode === 'waddle' ? 0.16 : 0.08) * (1 - k);
          if (k >= 1) walkT = null;
        }
      }
      bodyPivot.position.y = bounceY;
      bodyPivot.rotation.z = waddle + (rig.floats ? Math.sin(t * 1.4 + phase) * 0.05 : 0);
      if (rig.squishy) {
        const wob = Math.sin(t * 6 + phase) * 0.05;
        bodyPivot.scale.set((cfg.build?.sx ?? 1) * (1 + wob), (cfg.build?.sy ?? 1) * (1 - wob), 1 + wob);
      } else {
        bodyPivot.scale.set((cfg.build?.sx ?? 1) * (1 - breathe * 0.5), (cfg.build?.sy ?? 1) * (1 + breathe), 1 - breathe * 0.5);
      }

      headGroup.rotation.x = -0.12;
      headGroup.rotation.z = Math.sin(t * 1.8 + phase) * 0.035;
      if (lookAt) {
        const dx = lookAt.x - group.position.x, dz = lookAt.z - group.position.z;
        if (Math.hypot(dx, dz) > 0.2) {
          let rel = Math.atan2(dx, dz) - group.rotation.y;
          while (rel > Math.PI) rel -= Math.PI * 2;
          while (rel < -Math.PI) rel += Math.PI * 2;
          const clamped = Math.max(-0.5, Math.min(0.5, rel * 0.6));
          headGroup.rotation.y += (clamped - headGroup.rotation.y) * Math.min(1, dt * 6);
        }
      } else headGroup.rotation.y *= Math.max(0, 1 - dt * 4);

      const twitch = Math.pow(Math.max(0, Math.sin(t * 3.1 + phase)), 8) * 0.16;
      rig.earPivots.forEach((e, i) => {
        e.userData.baseRz ??= e.rotation.z;
        e.rotation.z = e.userData.baseRz + (i % 2 ? -1 : 1) * twitch * 0.35;
      });

      if (rig.tail) rig.tail.rotation.z = Math.sin(t * 7 + phase) * 0.3;
      if (rig.glowTip) rig.glowTip.material.color.setHSL(0.5 + Math.sin(t * 3) * 0.06, 1, 0.6 + Math.sin(t * 5) * 0.12);
      if (rig.glowTips) rig.glowTips.forEach((g2, i) => { g2.position.y = 0.49 + Math.sin(t * 3 + i + phase) * 0.015; });

      if (indicator.visible) {
        indicator.position.y = 1.35 + Math.sin(t * 4 + phase) * 0.04;
        indicator.rotation.z = Math.sin(t * 3 + phase) * 0.08;
      }
    },
  };
}

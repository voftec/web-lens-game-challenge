// chibi-people.js — Switch-quality cute customers. Toon-shaded (band lighting)
// + inverted-hull outline + glossy 3D eyes w/ real catchlights + canvas face
// patch for mouth/brows/blush. Ported from argon-valley's chibi deform math.
import * as THREE from './assets/vendor/three.module.js';

// ---------------------------------------------------------------------------
// Toon look: 3-step gradient ramp + inverted-hull outline
// ---------------------------------------------------------------------------
let _gradientMap = null;
function toonGradient() {
  if (_gradientMap) return _gradientMap;
  const data = new Uint8Array([90, 170, 255]);
  _gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  _gradientMap.needsUpdate = true;
  _gradientMap.minFilter = _gradientMap.magFilter = THREE.NearestFilter;
  return _gradientMap;
}

function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts });
}

const OUTLINE_COLOR = 0x402818;
function addOutline(mesh, thickness = 1.07) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide }));
  o.scale.setScalar(thickness);
  mesh.add(o); // child → inherits position/rotation/scale of the parent mesh
  return o;
}

function deformChibiHeadPoint(x, y, z) {
  let sx = x * 1.06;
  let sy = y * 0.96;
  let sz = z * 0.98;
  const cheekBand = Math.exp(-Math.pow((y + 0.11) / 0.17, 2));
  const frontBias = Math.max(0, (z + 0.15) / 0.55);
  const bulge = 1.0 + 0.085 * cheekBand * (0.55 + 0.45 * frontBias);
  sx *= bulge;
  sz *= 1.0 + 0.045 * cheekBand;
  // jaw taper — narrows the lower head into a chin (egg shape, not a ball)
  const chin = Math.max(0, -(y + 0.06)) / 0.34;
  sx *= 1 - 0.30 * chin;
  sz *= 1 - 0.16 * chin;
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
  const segX = 28, segY = 24;
  const geo = new THREE.PlaneGeometry(1, 1, segX, segY);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const lon = (u - 0.5) * lonSpan;
    const lat = (v - 0.5) * latSpan;
    const rawX = radius * Math.sin(lon) * Math.cos(lat);
    const rawY = radius * Math.sin(lat);
    const rawZ = radius * Math.cos(lon) * Math.cos(lat);
    const [dx, dy, dz] = deformChibiHeadPoint(rawX, rawY, rawZ);
    pos.setXYZ(i, dx * 1.006, dy * 1.006, dz * 1.006 + 0.002);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Face texture — painted parts ONLY: brows, nose, blush, mouth, accessories,
// and eyes when eyeMode is 'happy' | 'sleepy' (3D eyes show when 'round'/open).
// ---------------------------------------------------------------------------
export function createFaceTexture({ mood = 'neutral', eyes = null, accessory = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  const angry = mood === 'angry';
  const imp = mood === 'impatient';

  // brows — soft short arcs
  ctx.strokeStyle = 'rgba(70,45,28,.85)';
  ctx.lineWidth = 11; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const bx = 256 + side * 74;
    ctx.beginPath();
    if (angry || imp) { ctx.moveTo(bx - side * 30, 174); ctx.lineTo(bx + side * 22, 200); }
    else if (mood === 'happy') ctx.arc(bx, 206, 30, Math.PI * 1.1, Math.PI * 1.9);
    else ctx.arc(bx, 198, 27, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // painted eyes (closed/lidded modes only — 'round' uses 3D glossy eyes)
  for (const side of [-1, 1]) {
    const ex = 256 + side * 74, ey = 246;
    if (eyes === 'happy') {
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(ex, ey + 12, 30, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    } else if (eyes === 'sleepy') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex, ey + 10, 30, 24, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#2a1a12';
      ctx.beginPath(); ctx.ellipse(ex, ey + 13, 13, 14, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex - 5, ey + 9, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(ex - 30, ey - 10); ctx.quadraticCurveTo(ex, ey - 20, ex + 30, ey - 12); ctx.stroke();
    }
  }

  // accessory: round glasses (over whatever eyes are drawn)
  if (accessory === 'glasses') {
    ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 8;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(256 + side * 74, 246, 46, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(256 - 28, 242); ctx.lineTo(256 + 28, 242); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(256 - 74 - 46, 240); ctx.lineTo(256 - 116, 232); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(256 + 74 + 46, 240); ctx.lineTo(256 + 116, 232); ctx.stroke();
  }

  // blush — big soft candy ovals
  ctx.fillStyle = 'rgba(255,120,130,.5)';
  for (const cx of [122, 390]) { ctx.beginPath(); ctx.ellipse(cx, 306, 30, 17, 0, 0, Math.PI * 2); ctx.fill(); }
  if (accessory === 'freckles') {
    ctx.fillStyle = 'rgba(120,70,40,.55)';
    for (const cx of [112, 132, 380, 400]) { ctx.beginPath(); ctx.arc(cx, 292 + (cx % 3) * 8, 5, 0, Math.PI * 2); ctx.fill(); }
  }

  // nose — barely a dot
  ctx.fillStyle = 'rgba(120,70,45,.5)';
  ctx.beginPath(); ctx.arc(256, 292, 5, 0, Math.PI * 2); ctx.fill();

  // mustache
  if (accessory === 'mustache') {
    ctx.fillStyle = '#3a2417';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(256 + side * 24, 320, 28, 13, side * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // mouth — kawaii 'w' cat-mouth for neutral, big open smile for happy
  ctx.strokeStyle = '#3d2016'; ctx.fillStyle = '#d8505e';
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  if (accessory === 'mustache') {
    ctx.beginPath(); ctx.arc(256, 340, 18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else if (mood === 'happy') {
    ctx.beginPath(); ctx.arc(256, 302, 32, 0.08 * Math.PI, 0.92 * Math.PI); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9aa2';
    ctx.beginPath(); ctx.ellipse(256, 334, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
  } else if (angry) {
    ctx.beginPath(); ctx.arc(256, 354, 24, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else if (imp) {
    ctx.beginPath(); ctx.moveTo(230, 326);
    ctx.quadraticCurveTo(243, 318, 256, 326);
    ctx.quadraticCurveTo(269, 334, 282, 326);
    ctx.stroke();
  } else {
    // 'w' mouth — two tiny arcs
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(256 + side * 11, 318, 11, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function canvasTex(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// shirt canvas texture (solid + collar/details) — cheap variation per customer.
function createShirtTexture(baseHex, kind = 'tee') {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex; ctx.fillRect(0, 0, 256, 256);
  if (kind === 'suit') {
    ctx.fillStyle = '#fffdf6';
    ctx.beginPath(); ctx.moveTo(96, 0); ctx.lineTo(128, 90); ctx.lineTo(160, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8442e';
    ctx.beginPath(); ctx.moveTo(120, 18); ctx.lineTo(136, 18); ctx.lineTo(132, 78); ctx.lineTo(128, 88); ctx.lineTo(124, 78); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(96, 0); ctx.lineTo(128, 90); ctx.moveTo(160, 0); ctx.lineTo(128, 90); ctx.stroke();
  } else if (kind === 'stripe') {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let y = 40; y < 256; y += 52) ctx.fillRect(0, y, 256, 18);
  } else if (kind === 'hoodie') {
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.ellipse(128, 6, 54, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(116, 60, 24, 64);
  }
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(128, 4, 42, 17, 0, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// floating mood indicator (💢 💧 ❗ ♪)
export function createIndicatorTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
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
    ctx.beginPath();
    ctx.moveTo(64, 20);
    ctx.quadraticCurveTo(96, 72, 64, 104);
    ctx.quadraticCurveTo(32, 72, 64, 20);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(54, 74, 9, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'alert') {
    ctx.fillStyle = '#ffd22e'; ctx.strokeStyle = '#8a6a00'; ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(64, 14); ctx.lineTo(110, 106); ctx.lineTo(18, 106); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2417';
    ctx.fillRect(58, 44, 12, 34);
    ctx.beginPath(); ctx.arc(64, 92, 8, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'happy') {
    ctx.fillStyle = '#ff7ab0'; ctx.strokeStyle = '#a83366'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(52, 92, 18, 13, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(68, 88); ctx.lineTo(68, 28); ctx.lineTo(96, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(68, 28); ctx.quadraticCurveTo(88, 26, 98, 46); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// hair — smooth merged silhouettes (no more lumpy stacks where avoidable)
function addHair(headGroup, style, colorHex) {
  const mat = toonMat(colorHex);
  const parts = [];
  const put = (geo, x, y, z, s = [1, 1, 1], m = mat) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z); mesh.scale.set(...s); mesh.castShadow = true;
    headGroup.add(mesh); parts.push(mesh); return mesh;
  };
  if (style === 'curly') {
    for (const [x, y, z, r] of [[-0.22, 0.24, -0.02, 0.17], [-0.06, 0.32, -0.02, 0.19], [0.12, 0.31, -0.02, 0.19], [0.28, 0.22, -0.02, 0.16], [-0.33, 0.06, -0.02, 0.15], [0.33, 0.06, -0.02, 0.15], [0.02, 0.30, -0.12, 0.18], [-0.36, -0.12, -0.04, 0.13], [0.36, -0.12, -0.04, 0.13]])
      put(new THREE.SphereGeometry(r, 16, 14), x, y, z);
    put(new THREE.SphereGeometry(0.15, 14, 12), -0.14, 0.22, 0.22);
    put(new THREE.SphereGeometry(0.15, 14, 12), 0.15, 0.23, 0.22);
  } else if (style === 'cap' || style === 'capBack') {
    const capMat = toonMat(colorHex);
    const capG = new THREE.Group();
    if (style === 'capBack') capG.rotation.y = Math.PI;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.40, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
    dome.position.set(0, 0.10, -0.02); dome.castShadow = true;
    const brim = new THREE.Mesh(new THREE.SphereGeometry(0.30, 18, 12), capMat);
    brim.position.set(0, 0.10, 0.34); brim.scale.set(0.75, 0.16, 0.55); brim.castShadow = true;
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), toonMat(0xe8442e));
    btn.position.set(0, 0.50, -0.02);
    capG.add(dome, brim, btn);
    headGroup.add(capG); parts.push(dome, brim, btn);
  } else if (style === 'ponytail') {
    put(new THREE.SphereGeometry(0.40, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 0.09, -0.03);
    // side ponytail — reads in the silhouette from the front too
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.34, 8, 12), mat);
    tail.position.set(0.34, 0.02, -0.18);
    tail.rotation.z = -0.35; tail.rotation.x = 0.3;
    tail.castShadow = true;
    headGroup.add(tail); parts.push(tail);
    const tie = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toonMat(0xe8442e));
    tie.position.set(0.28, 0.28, -0.16);
    headGroup.add(tie); parts.push(tie);
    put(new THREE.SphereGeometry(0.14, 14, 12), -0.15, 0.22, 0.21);
    put(new THREE.SphereGeometry(0.14, 14, 12), 0.14, 0.22, 0.21);
  } else if (style === 'bun') {
    put(new THREE.SphereGeometry(0.41, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.60), 0, 0.06, -0.03);
    put(new THREE.SphereGeometry(0.22, 16, 14), 0, 0.48, -0.08);
    put(new THREE.TorusGeometry(0.13, 0.05, 8, 20), 0, 0.40, -0.07).rotation.x = Math.PI / 2;
    put(new THREE.SphereGeometry(0.15, 14, 12), -0.36, -0.06, -0.02, [0.55, 1.1, 0.7]);
    put(new THREE.SphereGeometry(0.15, 14, 12), 0.36, -0.06, -0.02, [0.55, 1.1, 0.7]);
  } else if (style === 'bob') {
    // smooth rounded helmet — very Nintendo
    const dome = new THREE.SphereGeometry(0.42, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62);
    put(dome, 0, 0.06, -0.03, [1.04, 1.0, 1.0]);
    put(new THREE.SphereGeometry(0.15, 14, 12), -0.36, -0.16, 0.0, [0.6, 1.2, 0.75]);
    put(new THREE.SphereGeometry(0.15, 14, 12), 0.36, -0.16, 0.0, [0.6, 1.2, 0.75]);
    put(new THREE.SphereGeometry(0.14, 14, 12), -0.15, 0.20, 0.22);
    put(new THREE.SphereGeometry(0.14, 14, 12), 0.13, 0.20, 0.22);
  } else if (style === 'pigtails') {
    put(new THREE.SphereGeometry(0.40, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 0.09, -0.03);
    for (const side of [-1, 1]) {
      put(new THREE.SphereGeometry(0.16, 14, 12), side * 0.44, 0.10, -0.04);
      put(new THREE.SphereGeometry(0.14, 14, 12), side * 0.48, -0.10, -0.02);
      put(new THREE.SphereGeometry(0.12, 14, 12), side * 0.50, -0.26, 0.0);
    }
    put(new THREE.SphereGeometry(0.13, 14, 12), -0.14, 0.23, 0.22);
    put(new THREE.SphereGeometry(0.13, 14, 12), 0.13, 0.23, 0.22);
  } else if (style === 'mohawk') {
    for (let i = 0; i < 5; i++) {
      const z = 0.16 - i * 0.10;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.46 - Math.abs(i - 2) * 0.06, 10), mat);
      spike.position.set(0, 0.40 - Math.abs(i - 2) * 0.03, z);
      spike.castShadow = true;
      headGroup.add(spike); parts.push(spike);
    }
    put(new THREE.SphereGeometry(0.40, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.40), 0, 0.04, -0.04, [0.82, 0.7, 0.82]);
  } else if (style === 'afro') {
    put(new THREE.SphereGeometry(0.46, 24, 18), 0, 0.14, -0.06, [1.0, 0.95, 0.9]);
    put(new THREE.SphereGeometry(0.20, 14, 12), -0.34, 0.02, 0.10);
    put(new THREE.SphereGeometry(0.20, 14, 12), 0.34, 0.02, 0.10);
  } else if (style === 'beanie') {
    const beanieMat = toonMat(colorHex);
    put(new THREE.SphereGeometry(0.41, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), 0, 0.06, -0.02, [1, 1, 1], beanieMat);
    const fold = put(new THREE.TorusGeometry(0.385, 0.06, 10, 28), 0, 0.10, -0.02, [1, 1, 1], beanieMat);
    fold.rotation.x = Math.PI / 2;
    put(new THREE.SphereGeometry(0.10, 12, 10), 0, 0.46, -0.02, [1, 1, 1], toonMat(0xf5f0e6));
  } else if (style === 'spiky') {
    for (const [x, z, tilt] of [[-0.18, 0.10, -0.4], [0, 0.16, 0], [0.18, 0.10, 0.4], [-0.10, -0.10, -0.3], [0.10, -0.10, 0.3]]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 10), mat);
      spike.position.set(x, 0.34, z);
      spike.rotation.z = tilt; spike.rotation.x = -0.15;
      spike.castShadow = true;
      headGroup.add(spike); parts.push(spike);
    }
    put(new THREE.SphereGeometry(0.40, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), 0, 0.06, -0.04);
  } else if (style === 'bald') {
    put(new THREE.SphereGeometry(0.10, 10, 8), -0.36, -0.10, 0.04, [0.5, 0.9, 0.5]);
    put(new THREE.SphereGeometry(0.10, 10, 8), 0.36, -0.10, 0.04, [0.5, 0.9, 0.5]);
  } else { // flat / short hair + sideburns
    put(new THREE.SphereGeometry(0.40, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48), 0, 0.08, -0.03);
    put(new THREE.SphereGeometry(0.13, 14, 12), -0.36, 0.02, 0.02, [0.5, 0.8, 0.6]);
    put(new THREE.SphereGeometry(0.13, 14, 12), 0.36, 0.02, 0.02, [0.5, 0.8, 0.6]);
    put(new THREE.SphereGeometry(0.10, 10, 8), -0.37, -0.16, 0.06, [0.45, 0.9, 0.5]);
    put(new THREE.SphereGeometry(0.10, 10, 8), 0.37, -0.16, 0.06, [0.45, 0.9, 0.5]);
  }
  for (const p of parts) addOutline(p, 1.10);
}

// cartoon mitt hand — flattened palm + separated thumb nub
function makeHand(skinMat, side) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), skinMat);
  palm.scale.set(0.85, 1.0, 0.62);
  palm.castShadow = true;
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), skinMat);
  thumb.position.set(-side * 0.045, -0.015, 0.035);
  thumb.castShadow = true;
  g.add(palm, thumb);
  addOutline(palm, 1.14);
  return g;
}

// sneaker — flat sole + rounded upper + toe cap pointing forward
function makeShoe(mats, side) {
  const g = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.26), mats.sole);
  sole.position.set(0, 0.02, 0.09);
  sole.castShadow = true;
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), mats.shoe);
  upper.scale.set(0.75, 0.62, 1.35);
  upper.position.set(0, 0.075, 0.09);
  upper.castShadow = true;
  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), mats.shoe);
  toe.scale.set(0.95, 0.7, 0.9);
  toe.position.set(0, 0.065, 0.21);
  toe.castShadow = true;
  g.add(sole, upper, toe);
  addOutline(upper, 1.12);
  addOutline(toe, 1.12);
  return g;
}

/**
 * createCustomer({skin, hair, hairColor, eyes:'round'|'happy'|'sleepy',
 * accessory, shirt, shirtStyle, pants, shoes, mood, pose:'rest'|'hips',
 * build:{sx,sy,hunch,belly,headScale,shoulderW,armR,legLen},
 * gear:['apron','backpack','cane','headphones']})
 * → {group, bodyPivot, headGroup, update(dt,t,lookAt), setMood, setIndicator,
 *    talk, enter, leave}
 */
export function createCustomer({
  skin = 0xf2b98d, hair = 'flat', hairColor = '#4a382e',
  eyes = 'round', accessory = null,
  shirt = '#6d6d78', shirtStyle = 'tee', pants = 0x4a5568, shoes = 0x8a4a3a,
  mood = 'neutral', pose = 'rest',
  build = { sx: 1, sy: 1 },
  gear = [],
} = {}) {
  const { sx = 1, sy = 1, hunch = 0, belly = 0, headScale = 1, shoulderW = 1, armR = 1, legLen = 1 } = build;
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.scale.set(sx, sy, 1);
  group.add(bodyPivot);

  const skinMat = toonMat(skin);
  const shirtMat = toonMat('#ffffff', { map: createShirtTexture(shirt, shirtStyle) });
  const pantsMat = toonMat(pants);
  const shoeMats = { shoe: toonMat(shoes), sole: toonMat(0xf0e6d8) };

  // torso — tall capsule w/ shoulders; hunch leans it forward
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 8, 18), shirtMat);
  torso.position.set(0, 0.62, hunch * 0.06);
  torso.scale.set(1.18 * shoulderW, 1.0, 0.82);
  torso.rotation.x = hunch * 0.5;
  torso.castShadow = true; torso.receiveShadow = true;
  bodyPivot.add(torso);
  addOutline(torso);

  // belly bulge — gut-forward silhouette (grandma, gordo)
  if (belly > 0) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.20 * belly, 18, 14), shirtMat);
    b.position.set(0, 0.52, 0.13 + belly * 0.05);
    b.scale.set(1.15, 0.9, 0.75);
    b.castShadow = true;
    bodyPivot.add(b);
    addOutline(b, 1.07);
  }

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 6, 10), pantsMat);
    leg.scale.y = legLen;
    leg.position.set(side * 0.11 * shoulderW, 0.26 - (1 - legLen) * 0.11, 0);
    leg.castShadow = true;
    bodyPivot.add(leg); addOutline(leg, 1.10);
    const shoe = makeShoe(shoeMats, side);
    shoe.position.set(side * 0.11 * shoulderW, 0.0, 0);
    bodyPivot.add(shoe);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.10, 0.14, 12), skinMat);
  neck.position.set(0, 0.98, 0.01);
  bodyPivot.add(neck);

  // head — stylized humanoid (not giant chibi); headScale shifts the proportion
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.08 + hunch * 0.10, 0.02 + hunch * 0.16);
  headGroup.rotation.x = -0.12 + hunch * 0.9;
  headGroup.scale.setScalar(headScale);
  bodyPivot.add(headGroup);
  const head = new THREE.Mesh(createChibiHeadGeometry(0.28), skinMat);
  head.scale.set(1.10, 1.02, 0.98);
  head.castShadow = true;
  headGroup.add(head);
  addOutline(head, 1.06);

  // glossy 3D eyes — real catchlights when the head turns
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x2a1a1e, roughness: 0.12, clearcoat: 1.0, clearcoatRoughness: 0.08 });
  const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeballs = new THREE.Group();
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 14), eyeMat);
    eye.scale.set(0.85, 1.18, 0.55);
    eye.position.set(side * 0.082, 0.005, 0.238);
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), catchMat);
    star.position.set(-0.014, 0.022, 0.035);
    eye.add(star);
    const star2 = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), catchMat);
    star2.position.set(0.016, -0.012, 0.036);
    eye.add(star2);
    eyeballs.add(eye);
  }
  headGroup.add(eyeballs);

  // face patch — painted brows/mouth/blush (+ eyes only for non-'round' modes)
  const paintEyes = () => mood === 'happy' ? 'happy' : (eyes === 'round' ? null : eyes);
  const faceMat = new THREE.MeshBasicMaterial({ map: createFaceTexture({ mood, eyes: paintEyes(), accessory }), transparent: true, depthWrite: false });
  const face = new THREE.Mesh(createConformingFacePatchGeometry(0.282, 1.50, 1.18), faceMat);
  face.scale.set(1.10, 1.02, 0.98);
  headGroup.add(face);
  const syncEyes = () => { eyeballs.visible = paintEyes() === null; };
  syncEyes();

  const hairGroup = new THREE.Group();
  hairGroup.scale.setScalar(0.80);
  headGroup.add(hairGroup);
  addHair(hairGroup, hair, hairColor);

  const earPivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.30, -0.02, 0.04);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMat);
    ear.scale.set(0.45, 0.75, 0.6);
    ear.castShadow = true;
    pivot.add(ear);
    headGroup.add(pivot);
    earPivots.push(pivot);
    addOutline(ear, 1.12);
  }

  // arms — shoulder cap (deltoid) + capsule sleeve + mitt hand
  const armGeo = new THREE.CapsuleGeometry(0.055 * armR, 0.26, 8, 12);
  const armMat = toonMat(shirt);
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.085 * armR, 14, 12), armMat);
    shoulder.position.set(side * 0.30 * shoulderW, 0.80, 0.01);
    shoulder.castShadow = true;
    bodyPivot.add(shoulder);
    addOutline(shoulder, 1.10);
    const arm = new THREE.Mesh(armGeo, armMat);
    const hand = makeHand(skinMat, side);
    hand.scale.setScalar(armR * 0.9 + 0.1);
    if (pose === 'hips') {
      arm.position.set(side * 0.31 * shoulderW, 0.62, 0.02);
      arm.rotation.set(0.15, 0, side * 1.25);
      hand.position.set(side * 0.27 * shoulderW, 0.44, 0.08);
      hand.rotation.z = -side * 0.3;
    } else {
      arm.position.set(side * 0.29 * shoulderW, 0.68, 0.03);
      arm.rotation.set(-0.55, 0, side * 0.30);
      hand.position.set(side * 0.16 * shoulderW, 0.42, 0.20);
      hand.rotation.set(-0.5, 0, side * 0.5);
    }
    arm.castShadow = true;
    bodyPivot.add(arm, hand);
    addOutline(arm, 1.10);
  }

  // gear props — silhouette-changing extras
  for (const g of gear) {
    if (g === 'apron') {
      const apron = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), toonMat('#ffffff', { map: canvasTex(128, 128, ctx => {
        ctx.fillStyle = '#e8ecf2'; ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#b0bac8'; ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, 112, 112);
        ctx.fillStyle = '#c8565a'; ctx.fillRect(40, 78, 48, 34); // pocket
      }), side: THREE.DoubleSide }));
      apron.position.set(0, 0.56, 0.245 + belly * 0.06);
      apron.rotation.x = -0.06 - belly * 0.15;
      bodyPivot.add(apron);
    } else if (g === 'backpack') {
      const packMat = toonMat(0x3a8ea8);
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.36, 0.15), packMat);
      pack.position.set(0, 0.62, -0.26);
      pack.castShadow = true;
      bodyPivot.add(pack); addOutline(pack, 1.10);
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.02), packMat);
        strap.position.set(side * 0.10, 0.68, 0.20);
        strap.rotation.x = -0.15;
        bodyPivot.add(strap);
      }
    } else if (g === 'cane') {
      const caneMat = toonMat(0x7a5230);
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.020, 0.58, 8), caneMat);
      cane.position.set(0.30 * shoulderW, 0.28, 0.16);
      cane.rotation.z = -0.12;
      cane.castShadow = true;
      bodyPivot.add(cane); addOutline(cane, 1.15);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 14, Math.PI), caneMat);
      hook.position.set(0.335 * shoulderW, 0.57, 0.16);
      hook.rotation.z = Math.PI;
      bodyPivot.add(hook);
    } else if (g === 'headphones') {
      const hpMat = toonMat(0x2a2e38);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.038, 8, 20, Math.PI), hpMat);
      band.position.set(0, 0.12, -0.02);
      band.rotation.x = -0.25;
      headGroup.add(band); addOutline(band, 1.12);
      for (const side of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 14), hpMat);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(side * 0.34, -0.04, 0.05);
        headGroup.add(cup); addOutline(cup, 1.12);
      }
    }
  }

  const indicatorMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
  const indicator = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), indicatorMat);
  indicator.position.set(0.32, 1.62, 0.1);
  indicator.visible = false;
  bodyPivot.add(indicator);

  const phase = Math.random() * Math.PI * 2;
  let talkTimer = 0;
  let walkT = null;

  return {
    group, bodyPivot, headGroup,
    setMood(m) {
      mood = m;
      faceMat.map = createFaceTexture({ mood, eyes: paintEyes(), accessory });
      faceMat.needsUpdate = true;
      syncEyes();
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
      let bounceY = 0;
      if (talkTimer > 0) {
        talkTimer = Math.max(0, talkTimer - dt);
        bounceY = Math.abs(Math.sin(t * 14)) * 0.07;
      }
      let waddle = 0;
      if (walkT) {
        walkT.t += dt;
        if (walkT.t >= 0) {
          const k = Math.min(1, walkT.t / walkT.dur);
          const e = 1 - Math.pow(1 - k, 2.2);
          group.position.x = walkT.from + (walkT.to - walkT.from) * e;
          bounceY += Math.abs(Math.sin(t * 11)) * 0.09 * (1 - k);
          waddle = Math.sin(t * 11) * 0.10 * (1 - k);
          if (k >= 1) walkT = null;
        }
      }
      bodyPivot.position.y = bounceY;
      bodyPivot.rotation.z = waddle;
      bodyPivot.scale.set((build.sx ?? 1) * (1 - breathe * 0.5), (build.sy ?? 1) * (1 + breathe), 1 - breathe * 0.5);

      headGroup.rotation.x = -0.12 + hunch * 0.9;
      headGroup.rotation.z = Math.sin(t * 1.8 + phase) * 0.035;
      if (lookAt) {
        const dx = lookAt.x - group.position.x;
        const dz = lookAt.z - group.position.z;
        if (Math.hypot(dx, dz) > 0.2) {
          let rel = Math.atan2(dx, dz) - group.rotation.y;
          while (rel > Math.PI) rel -= Math.PI * 2;
          while (rel < -Math.PI) rel += Math.PI * 2;
          const clamped = Math.max(-0.5, Math.min(0.5, rel * 0.6));
          headGroup.rotation.y += (clamped - headGroup.rotation.y) * Math.min(1, dt * 6);
        }
      } else {
        headGroup.rotation.y *= Math.max(0, 1 - dt * 4);
      }

      const twitch = Math.pow(Math.max(0, Math.sin(t * 3.1 + phase)), 8) * 0.16;
      earPivots[0].rotation.z = 0.10 + twitch;
      earPivots[1].rotation.z = -0.10 - twitch;

      if (indicator.visible) {
        indicator.position.y = 1.62 + Math.sin(t * 4 + phase) * 0.04;
        indicator.rotation.z = Math.sin(t * 3 + phase) * 0.08;
      }
    },
  };
}

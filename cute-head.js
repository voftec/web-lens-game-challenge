// cute-head.js — kid-friendly stylised head mounted on a rigged GLB body.
//
// The Quaternius bodies are exported headless (dist/assets/models/city-headless)
// and this module builds the head procedurally on the Head bone:
//   · smooth squashed-egg skull, toon shaded + inverted-hull outline
//   · big 3D glossy eyes: pupils look around, lids blink, squint when happy
//   · 3D cheeks + button nose, painted mouth decal that swaps per mood
//   · hair as soft caps (short, bob, bun, pigtails, curls, cap, spiky, bald)
// API: buildCuteHead({ skin, hair, hairColor, accent, mood }) →
//      { group, setMood, update(dt, t), lookAt(dirX, dirY) }

import * as THREE from './assets/vendor/three.module.js';

let _ramp = null;
function toonRamp() {
  if (_ramp) return _ramp;
  _ramp = new THREE.DataTexture(new Uint8Array([120, 200, 255]), 3, 1, THREE.RedFormat);
  _ramp.needsUpdate = true;
  _ramp.minFilter = _ramp.magFilter = THREE.NearestFilter;
  return _ramp;
}
const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...o });
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x3a2418, side: THREE.BackSide });

function outline(mesh, k = 1.05) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE);
  o.scale.setScalar(k);
  o.renderOrder = -1;
  mesh.add(o);
  return o;
}

// squashed egg: wider at the cheeks, gentle chin, flattened face plane
function skullGeometry(r = 0.30) {
  const g = new THREE.SphereGeometry(r, 36, 28);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ny = y / r;
    // cheeks bulge below the eye line, chin tapers
    const cheek = 1 + 0.10 * Math.exp(-((ny + 0.25) ** 2) / 0.12);
    const chin = ny < -0.3 ? 1 - 0.22 * ((-ny - 0.3) / 0.7) ** 1.6 : 1;
    x *= cheek * chin; z *= cheek * chin;
    // flatten the face a little so the eyes sit on a plane
    if (z > 0) z *= 1 - 0.10 * (z / r) ** 2;
    // slightly taller than wide
    y *= 1.06;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function mouthTexture(mood) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = '#4a2a22'; x.lineWidth = 14;
  if (mood === 'happy') {
    x.fillStyle = '#c9414f';
    x.beginPath(); x.arc(128, 104, 62, 0.1 * Math.PI, 0.9 * Math.PI); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#ff8f9a'; x.beginPath(); x.ellipse(128, 160, 30, 16, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.fillRect(84, 104, 88, 14);
  } else if (mood === 'angry') {
    x.beginPath(); x.arc(128, 190, 54, 1.15 * Math.PI, 1.85 * Math.PI); x.stroke();
  } else if (mood === 'impatient') {
    x.beginPath(); x.moveTo(76, 136); x.quadraticCurveTo(102, 116, 128, 136); x.quadraticCurveTo(154, 156, 180, 136); x.stroke();
  } else if (mood === 'surprised') {
    x.fillStyle = '#4a2a22'; x.beginPath(); x.ellipse(128, 136, 26, 34, 0, 0, Math.PI * 2); x.fill();
  } else { // neutral — little "w" kitten smile
    for (const s of [-1, 1]) { x.beginPath(); x.arc(128 + s * 24, 128, 24, 0.05 * Math.PI, 0.95 * Math.PI); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildHair(style, color, accent, skullR = 0.30) {
  const g = new THREE.Group();
  const m = toon(color, { roughness: 0.9 });
  const m2 = accent != null ? toon(accent) : m;
  const K = skullR / 0.30; // extras are authored for a 0.30 skull
  const put = (geo, x, y, z, sx = 1, sy = 1, sz = 1, mat = m) => {
    const q = new THREE.Mesh(geo, mat);
    q.position.set(x * K, y * K, z * K); q.scale.set(sx * K, sy * K, sz * K); q.castShadow = true;
    outline(q, 1.04); g.add(q); return q;
  };
  if (style === 'bald') return g;

  // ——— Hair shell ———
  // A slightly inflated copy of the skull. For every vertex we evaluate a
  // *hairline* function: where it's "scalp" the vertex is pushed outward
  // (thickness), where it's "face" it's pulled inside the skull so it hides.
  // Styles are just different hairline/thickness functions + a few extras.
  const R = skullR;
  const geo = skullGeometry(R);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const HL = {
    // fringeY: where hair ends on the forehead (-1..1 of R, higher = more
    // forehead); sideY: where sideburns end; backY: nape; wave: fringe scallop
    short:    { fringeY: 0.38, sideY: -0.10, backY: -0.30, thick: 0.06, wave: 0.06, scallops: 5 },
    bob:      { fringeY: 0.40, sideY: -0.55, backY: -0.70, thick: 0.08, wave: 0.05, scallops: 5 },
    bun:      { fringeY: 0.46, sideY: 0.00, backY: -0.20, thick: 0.05, wave: 0.03, scallops: 3 },
    pigtails: { fringeY: 0.42, sideY: -0.05, backY: -0.25, thick: 0.06, wave: 0.07, scallops: 5 },
    curls:    { fringeY: 0.34, sideY: 0.00, backY: -0.30, thick: 0.11, wave: 0.00, scallops: 0, bumpy: true },
    spiky:    { fringeY: 0.45, sideY: 0.10, backY: -0.20, thick: 0.05, wave: 0.10, scallops: 7 },
    cap:      { fringeY: 0.50, sideY: -0.05, backY: -0.30, thick: 0.035, wave: 0.04, scallops: 4 },
  }[style] || { fringeY: 0.38, sideY: 0.05, backY: -0.25, thick: 0.06, wave: 0.06, scallops: 5 };
  const sm = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i);
    const u = y / R;                       // -1 chin .. +1 crown
    const az = Math.atan2(x, z);           // 0 = face front, ±π = back
    const front = Math.cos(az);            // 1 front, -1 back
    // hairline height as a function of azimuth
    const edge = front > 0
      ? HL.fringeY + (HL.sideY - HL.fringeY) * sm(Math.abs(az), 0.35, 1.5)
      : HL.sideY + (HL.backY - HL.sideY) * sm(Math.abs(az), 1.5, Math.PI);
    const scallop = HL.scallops ? HL.wave * Math.cos(az * HL.scallops * 1.0) * sm(front, 0.1, 0.8) : 0;
    const scalp = sm(u, edge + scallop - 0.08, edge + scallop + 0.08); // 0 face .. 1 scalp
    let thick = HL.thick;
    if (HL.bumpy) thick *= 0.75 + 0.35 * Math.abs(Math.sin(az * 6.3) * Math.sin(u * 7.1));
    const off = scalp * thick - (1 - scalp) * 0.06; // scalp out, face sunk inside
    pos.setXYZ(i, x + nx * off, y + ny * off + (scalp * 0.012), z + nz * off);
  }
  geo.computeVertexNormals();
  const shell = new THREE.Mesh(geo, m);
  shell.castShadow = true;
  outline(shell, 1.035);
  g.add(shell);

  // ——— extras per style ———
  const sph = (r, s = 20) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75));
  switch (style) {
    case 'bun':
      put(sph(0.12), 0, 0.37, -0.12, 1, 0.9, 1);
      break;
    case 'pigtails':
      for (const s of [-1, 1]) {
        put(sph(0.10), s * 0.34, 0.08, -0.08, 0.9, 1.25, 0.9);
        put(sph(0.075), s * 0.37, -0.12, -0.08, 0.9, 1.1, 0.9);
      }
      break;
    case 'spiky':
      for (let i = 0; i < 5; i++) {
        const x = -0.16 + i * 0.08;
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.19, 10), m);
        c.position.set(x * K, (0.33 + (i % 2) * 0.03) * K, (-0.05 + 0.03 * Math.abs(i - 2)) * K);
        c.scale.setScalar(K);
        c.rotation.z = -x * 1.4; c.castShadow = true; outline(c, 1.05); g.add(c);
      }
      break;
    case 'cap': {
      const crown = put(sph(0.345, 28), 0, 0.16, -0.03, 1.02, 0.72, 1.02, m2);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.035, 24, 1, false, -Math.PI * 0.5, Math.PI), m2);
      brim.position.set(0, 0.16 * K, 0.08 * K); brim.scale.set(K, K, 1.2 * K); outline(brim, 1.04); g.add(brim);
      put(sph(0.045), 0, 0.40, -0.03, 1, 1, 1, m2);
      void crown;
      break;
    }
  }
  return g;
}

// Rounded stump hand: the forearm simply continues and ends in a soft dome
// (Fall Guys / Rayman style). Canonical frame: origin = wrist, -Y = toward
// the fingertips. `len` = wrist→tip, `wristR` = forearm radius at the wrist.
export function buildCuteHand({ skin = 0xf2c6a6, len = 0.21, wristR = 0.08 } = {}) {
  const g = new THREE.Group();
  const m = toon(skin);
  const r = wristR * 1.02;
  const shaft = len * 0.55;
  // cylinder overlaps the sleeve/forearm so there's no seam, then a dome
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, shaft + 0.02, 18, 1, true), m);
  body.position.y = -shaft / 2 + 0.01; body.castShadow = true; g.add(body);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m);
  dome.position.y = -shaft; dome.scale.set(1, (len - shaft) / r, 1); dome.castShadow = true; g.add(dome);
  // one outline hull for the whole stump (open at the wrist so it doesn't ring the sleeve)
  const hull = new THREE.Group();
  // hull starts below the wrist so its rim never shows as a ring on the forearm
  const ob = new THREE.Mesh(body.geometry, OUTLINE); ob.scale.set(1.06, 0.7, 1.06); ob.position.set(0, -shaft * 0.65, 0);
  const od = new THREE.Mesh(dome.geometry, OUTLINE); od.scale.set(1.06, dome.scale.y * 1.06, 1.06); od.position.copy(dome.position);
  hull.add(ob, od); hull.renderOrder = -1; g.add(hull);
  return g;
}

// MeshToonMaterial clone of a GLB skin material so limbs match the head's cel look
export function toonSkin(color) { return toon(color); }

// ——— Blender-authored hair (dist/assets/models/hair/*.glb) ———
// Unit-skull space (+Y up, face toward +Z); scaled to the head radius at mount.
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';
const _hairCache = new Map();
const _hairLoader = new GLTFLoader();
export const HAIR_GLB = ['m_short', 'm_quiff', 'm_wavy', 'm_buzz', 'm_afro', 'f_bob', 'f_pony', 'f_bun', 'f_pixie'];
export function loadHairGLB(style) {
  if (!_hairCache.has(style)) {
    _hairCache.set(style, new Promise((res, rej) =>
      _hairLoader.load(`./assets/models/hair/${style}.glb`, g => res(g.scene), undefined, rej)));
  }
  return _hairCache.get(style);
}
export function attachHairGLB(headGroup, style, color, R) {
  return loadHairGLB(style).then(src => {
    const g = src.clone(true);
    const m = toon(color, { roughness: 0.9 });
    const meshes = [];
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    for (const o of meshes) { o.material = m; o.castShadow = true; outline(o, 1.03); }
    g.scale.setScalar(R);
    headGroup.add(g);
    return g;
  });
}

export function buildCuteHead({
  skin = 0xf2c6a6, hair = 'short', hairColor = 0x4a2f1c, accent = null,
  mood = 'neutral', eyeColor = 0x2b1b14, cheek = 0xff9aa0, radius = 0.30,
} = {}) {
  const group = new THREE.Group();
  const R = radius;

  const skinMat = toon(skin);
  const skull = new THREE.Mesh(skullGeometry(R), skinMat);
  skull.castShadow = true;
  outline(skull, 1.045);
  group.add(skull);

  // eyes: white + iris/pupil + catchlights, upper lid for blink/squint
  const eyeWhite = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp() });
  const irisMat = new THREE.MeshPhysicalMaterial({ color: eyeColor, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 });
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lidMat = toon(skin);
  const eyes = [];
  const EYE_R = R * 0.235;
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * R * 0.40, R * 0.06, R * 0.78);
    const white = new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 22, 16), eyeWhite);
    white.scale.set(0.95, 1.22, 0.55);
    outline(white, 1.06);
    pivot.add(white);
    const irisPivot = new THREE.Group(); pivot.add(irisPivot);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 0.66, 18, 14), irisMat);
    iris.scale.set(0.95, 1.2, 0.5); iris.position.z = EYE_R * 0.42;
    irisPivot.add(iris);
    const star = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 0.22, 10, 8), starMat);
    star.position.set(-EYE_R * 0.20, EYE_R * 0.30, EYE_R * 0.30); iris.add(star);
    const star2 = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 0.11, 8, 6), starMat);
    star2.position.set(EYE_R * 0.22, -EYE_R * 0.22, EYE_R * 0.32); iris.add(star2);
    // lid: skin-coloured half-dome hinged at the top of the eye
    const lidPivot = new THREE.Group(); lidPivot.position.y = EYE_R * 1.22; pivot.add(lidPivot);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 1.06, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), lidMat);
    lid.scale.set(0.98, 1.22, 0.60); lid.position.y = -EYE_R * 1.22; lid.rotation.x = 0;
    lidPivot.add(lid);
    lidPivot.rotation.x = -Math.PI * 0.62; // open (rotated up/back into the skull)
    group.add(pivot);
    eyes.push({ pivot, irisPivot, lidPivot });
  }

  // brows — bold strokes sitting ON the skull surface so they always read.
  // Each brow is a pivot placed at the skull point for (x, y); the stroke is
  // a flattened capsule tangent to the surface. Mood changes move the pivot
  // up/down along the surface and rotate the stroke (inner end up/down).
  // Hairline is >= 0.56R, brows live in 0.30–0.46R → never hidden by hair.
  const browMat = new THREE.MeshToonMaterial({ color: new THREE.Color(hairColor).multiplyScalar(0.55), gradientMap: toonRamp() });
  const skullSurface = (x, y) => {
    // solve z on the unit skull: skullGeometry maps a sphere point; invert
    // approximately by sampling a sphere direction and applying the same deform
    const ny = y / 1.06;
    const cheekF = 1 + 0.10 * Math.exp(-((ny + 0.25) ** 2) / 0.12);
    const chinF = ny < -0.3 ? 1 - 0.22 * ((-ny - 0.3) / 0.7) ** 1.6 : 1;
    const k = cheekF * chinF;
    const xs = x / k;                         // undo horizontal scaling
    const zs2 = Math.max(0, 1 - xs * xs - ny * ny);
    let z = Math.sqrt(zs2) * k;
    z *= 1 - 0.10 * z * z;                    // face flattening
    return new THREE.Vector3(x, y, z);
  };
  const brows = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const stroke = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.045, R * 0.30, 4, 10), browMat);
    stroke.rotation.z = Math.PI / 2;          // lie horizontal
    stroke.scale.set(1, 1, 0.55);             // flatten against the skull
    stroke.position.z = R * 0.03;
    // slight arch: bend via a second shorter capsule at the inner end
    pivot.add(stroke);
    group.add(pivot);
    brows.push({ pivot, side: s });
  }
  const placeBrow = (b, yR, rot) => {
    const p = skullSurface(b.side * 0.40, yR).multiplyScalar(R);
    b.pivot.position.copy(p);
    // orient so local +Z is the surface normal (approx = position dir with y weighted)
    const n = p.clone().normalize();
    b.pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    // inner end up (+) / down (-): rotate about the local normal
    b.pivot.rotateZ(-b.side * rot);
  };

  // cheeks + nose
  const cheekMat = new THREE.MeshToonMaterial({ color: cheek, gradientMap: toonRamp(), transparent: true, opacity: 0.75 });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(R * 0.13, 14, 10), cheekMat);
    c.position.set(s * R * 0.62, -R * 0.22, R * 0.74); c.scale.set(1.2, 0.75, 0.4); group.add(c);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(R * 0.075, 12, 10), toon(new THREE.Color(skin).multiplyScalar(0.92)));
  nose.position.set(0, -R * 0.12, R * 1.0); group.add(nose);

  // mouth decal
  const mouthMat = new THREE.MeshBasicMaterial({ map: mouthTexture(mood), transparent: true, depthWrite: false });
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.72, R * 0.72), mouthMat);
  mouth.position.set(0, -R * 0.40, R * 0.965);
  mouth.rotation.x = -0.28;
  group.add(mouth);

  // hair: Blender-authored GLB when the style exists, procedural fallback otherwise
  if (HAIR_GLB.includes(hair)) attachHairGLB(group, hair, hairColor, R);
  else group.add(buildHair(hair, hairColor, accent, R));

  // ——— expression state ———
  let mood_ = mood, blinkT = 1.5 + Math.random() * 3, blink = 0, look = { x: 0, y: 0 }, lookTarget = { x: 0, y: 0 };
  let saccadeT = 1 + Math.random() * 2;
  const MOODS = {
    // browY in R units (kept <= 0.46 so the hairline at 0.56 never covers them);
    // browRot > 0 = inner end up (worried/surprised), < 0 = inner end down (angry)
    neutral:   { lid: 0.00, browY: 0.34, browRot: 0.03, squint: 0 },
    happy:     { lid: 0.00, browY: 0.42, browRot: 0.18, squint: 0.55 },
    impatient: { lid: 0.30, browY: 0.33, browRot: -0.30, squint: 0 },
    angry:     { lid: 0.22, browY: 0.29, browRot: -0.60, squint: 0 },
    surprised: { lid: -0.15, browY: 0.46, browRot: 0.22, squint: 0 },
  };
  const applyMood = () => {
    const M = MOODS[mood_] || MOODS.neutral;
    const old = mouthMat.map; mouthMat.map = mouthTexture(mood_); if (old) old.dispose();
    for (const b of brows) placeBrow(b, M.browY, M.browRot);
  };
  applyMood();

  const api = {
    group,
    setMood(m) { mood_ = m; applyMood(); },
    lookAt(dx, dy) { lookTarget.x = Math.max(-1, Math.min(1, dx)); lookTarget.y = Math.max(-1, Math.min(1, dy)); },
    update(dt, t) {
      const M = MOODS[mood_] || MOODS.neutral;
      // blink
      blinkT -= dt;
      if (blinkT <= 0) { blink = 1; blinkT = 2 + Math.random() * 4; }
      if (blink > 0) blink = Math.max(0, blink - dt * 7);
      const closed = Math.min(1, Math.max(0, Math.sin(Math.min(1, 1 - blink) * Math.PI) ));
      // saccades: eyes wander a bit between look targets
      saccadeT -= dt;
      if (saccadeT <= 0) { saccadeT = 0.8 + Math.random() * 2.2; lookTarget.x += (Math.random() - 0.5) * 0.5; lookTarget.y += (Math.random() - 0.5) * 0.3; lookTarget.x *= 0.8; lookTarget.y *= 0.8; }
      look.x += (lookTarget.x - look.x) * Math.min(1, dt * 9);
      look.y += (lookTarget.y - look.y) * Math.min(1, dt * 9);
      const lidBase = M.lid + M.squint;
      for (const e of eyes) {
        e.irisPivot.position.x = look.x * EYE_R * 0.30;
        e.irisPivot.position.y = look.y * EYE_R * 0.28;
        const amt = Math.max(closed, lidBase);
        e.lidPivot.rotation.x = -Math.PI * 0.62 * (1 - amt) - 0.02;
        // happy squint also pushes the lower part up via scaleY of the whole eye
        e.pivot.scale.y = 1 - M.squint * 0.45 * (1 - closed);
      }
    },
  };
  return api;
}

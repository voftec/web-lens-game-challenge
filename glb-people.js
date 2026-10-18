// glb-people.js — rigged-GLB customer engine. Loads authored skinned models
// (KayKit CC0), clones them per customer, drives embedded animation clips for
// idle/walk/gesture, tracks a lookAt point with the head bone, and reuses the
// mood-indicator sprite system. API-compatible with createCustomer:
//   createCustomer({model, mood, scale, lookAtBone}) → {group, update,
//     setMood, setIndicator, talk, enter, leave, ready}
import * as THREE from './assets/vendor/three.module.js';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';
import { clone as skeletonClone } from './assets/vendor/SkeletonUtils.js';
import { createIndicatorTexture } from './chibi-people.js';
import { buildCuteHead, buildCuteHand, toonSkin } from './cute-head.js';

// ---------------------------------------------------------------------------
// Argon-style painted face — big glossy eyes with catchlights on a curved
// patch glued to the Head bone (replaces the stock white-oval 'Face' material)
// ---------------------------------------------------------------------------
function createGLBFaceTexture({ mood = 'neutral' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  const angry = mood === 'angry', imp = mood === 'impatient';

  // brows — skipped for 'happy' (the ^^ eyes are the expression, else they
  // read as a second pair of eyebrows)
  if (mood !== 'happy') {
    ctx.strokeStyle = 'rgba(52,32,18,.95)';
    ctx.lineWidth = 15; ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const bx = 256 + side * 84;
      ctx.beginPath();
      if (angry || imp) { ctx.moveTo(bx - side * 34, 142); ctx.lineTo(bx + side * 26, 172); }
      else ctx.arc(bx, 172, 30, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();
    }
  }

  // eyes — argon look: big white oval + big iris + double catchlight
  for (const side of [-1, 1]) {
    const ex = 256 + side * 84, ey = 226;
    if (mood === 'happy') {
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(ex, ey + 16, 38, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      continue;
    }
    if (mood === 'sleepy') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex, ey + 14, 40, 30, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#2a1a12';
      ctx.beginPath(); ctx.ellipse(ex, ey + 17, 17, 18, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex - 7, ey + 11, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(ex - 38, ey - 8); ctx.quadraticCurveTo(ex, ey - 22, ex + 38, ey - 10); ctx.stroke();
      continue;
    }
    // open glossy eye — oversized for readability at gameplay scale
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(ex, ey, 46, 54, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#241610';
    ctx.beginPath(); ctx.ellipse(ex, ey + 6, 31, 37, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex - 12, ey - 10, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 14, ey + 18, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#241610'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(ex, ey - 3, 49, Math.PI * 1.16, Math.PI * 1.84); ctx.stroke();
  }

  // blush
  ctx.fillStyle = 'rgba(255,118,128,.5)';
  for (const cx of [106, 406]) { ctx.beginPath(); ctx.ellipse(cx, 298, 34, 19, 0, 0, Math.PI * 2); ctx.fill(); }
  // nose dot
  ctx.fillStyle = 'rgba(120,70,45,.5)';
  ctx.beginPath(); ctx.arc(256, 284, 6, 0, Math.PI * 2); ctx.fill();

  // mouth
  ctx.strokeStyle = '#3d2016'; ctx.fillStyle = '#d8505e';
  ctx.lineWidth = 9; ctx.lineCap = 'round';
  if (mood === 'happy') {
    ctx.beginPath(); ctx.arc(256, 290, 30, 0.08 * Math.PI, 0.92 * Math.PI); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9aa2';
    ctx.beginPath(); ctx.ellipse(256, 320, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
  } else if (angry) {
    ctx.beginPath(); ctx.arc(256, 340, 24, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else if (imp) {
    ctx.beginPath(); ctx.moveTo(232, 314);
    ctx.quadraticCurveTo(244, 306, 256, 314);
    ctx.quadraticCurveTo(268, 322, 280, 314);
    ctx.stroke();
  } else {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(256 + side * 11, 306, 11, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// cylindrical decal wrapping the face front (+Z forward): curved around the
// vertical axis to match the head's eye-line cross-section, straight in Y
// (the Quaternius head is a rounded block, not a sphere). Unit radius.
function facePatchGeometry(lonSpan = 1.45, height = 1.2) {
  const geo = new THREE.PlaneGeometry(1, 1, 26, 20);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const lon = (uv.getX(i) - 0.5) * lonSpan;
    const y = (uv.getY(i) - 0.5) * height;
    pos.setXYZ(i, -Math.sin(lon), y, Math.cos(lon));
  }
  geo.computeVertexNormals();
  return geo;
}

// procedural hair — replaces the blocky Quaternius 'Hair' mesh, mounted on
// the Head bone in character space (+Y up, +Z fwd)
function buildHair(style, color, accent) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const m2 = accent ? new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7 }) : m;
  const sph = r => new THREE.SphereGeometry(r, 18, 14);
  const put = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const q = new THREE.Mesh(geo, m);
    q.position.set(x, y, z); q.scale.set(sx, sy, sz);
    q.castShadow = true; g.add(q);
  };
  // head bone origin sits at the neck; head center ≈ +0.30 up, skull radius
  // ≈ 0.30–0.34. Shells must clearly exceed the skull so nothing peeks through.
  // head bone origin sits at the neck; head center ≈ +0.30 up, face front ≈
  // z+0.35. Shells stay behind the face plane; bangs mark the hairline.
  const shell = (r = 0.46, y = 0.34, z = -0.16, sx = 1, sy = 0.95, sz = 1) =>
    put(sph(r), 0, y, z, sx, sy, sz);
  const bangs = (y = 0.44, z = 0.30, r = 0.12) => {
    for (let i = 0; i < 5; i++) {
      const x = -0.26 + i * 0.13;
      put(sph(r), x, y + Math.sin(i / 4 * Math.PI) * 0.05, z - 0.03 * Math.abs(i - 2));
    }
  };
  switch (style) {
    case 'afro': {
      // fluffy cloud of curls — a dome of overlapping puffs, wider than the head
      const puff = (x, y, z, r) => put(sph(r), x, y, z);
      puff(0, 0.50, -0.12, 0.30);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        puff(Math.cos(a) * 0.30, 0.46 + (i % 2) * 0.06, Math.sin(a) * 0.30 - 0.14, 0.17);
      }
      puff(0.36, 0.34, -0.06, 0.15); puff(-0.36, 0.34, -0.06, 0.15);
      puff(0.30, 0.58, -0.10, 0.13); puff(-0.30, 0.58, -0.10, 0.13);
      break;
    }
    case 'rulios':
      shell(0.48, 0.34, -0.14, 1.05, 0.9, 1.05);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        put(sph(0.14), Math.cos(a) * 0.38, 0.32 + (i % 2) * 0.05, Math.sin(a) * 0.38 - 0.10);
      }
      break;
    case 'pigtails':
      shell(0.46, 0.34, -0.14, 1.0, 0.9, 1.0);
      bangs();
      put(sph(0.18), 0.40, 0.40, -0.10); put(sph(0.18), -0.40, 0.40, -0.10);
      put(sph(0.12), 0.42, 0.26, -0.10); put(sph(0.12), -0.42, 0.26, -0.10);
      break;
    case 'bun':
      shell(0.46, 0.34, -0.14, 1.0, 0.9, 1.0);
      bangs();
      put(sph(0.18), 0, 0.62, -0.20);
      break;
    case 'cap': {
      // blonde/strand layer poking out under the cap
      shell(0.44, 0.32, -0.15, 1.02, 0.78, 1.02);
      put(sph(0.13), 0.34, 0.26, -0.04); put(sph(0.13), -0.34, 0.26, -0.04);
      bangs(0.36, 0.33, 0.10);
      // cap on top — accent color
      const cm = m2;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 14), cm);
      crown.position.set(0, 0.48, -0.10); crown.scale.set(1.06, 0.72, 1.06);
      crown.castShadow = true; g.add(crown);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.30), cm);
      brim.position.set(0, 0.46, 0.40); g.add(brim);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), cm);
      btn.position.set(0, 0.66, -0.02); g.add(btn);
      break;
    }
    case 'spiky': {
      shell(0.46, 0.32, -0.14, 1.0, 0.82, 1.0);
      for (let i = 0; i < 6; i++) {
        const x = -0.24 + i * 0.096;
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.30, 8), m);
        c.position.set(x, 0.54 + (i % 2) * 0.04, -0.10);
        c.rotation.z = (x > 0 ? -1 : 1) * 0.18;
        c.castShadow = true; g.add(c);
      }
      break;
    }
    case 'short':
    default:
      shell(0.47, 0.34, -0.14, 1.05, 0.86, 1.05);
      bangs(0.42, 0.32);
      for (let i = 0; i < 4; i++) {
        const x = -0.20 + i * 0.13;
        put(sph(0.13), x, 0.52 + (i % 2) * 0.03, -0.06 - (i % 3) * 0.06);
      }
  }
  return g;
}

// mount an arbitrary world-unit object on the Head bone: oriented to the
// character's facing, scaled to cancel the bone's world scale, lifted `up`
// world units from the bone origin (the neck) to the head centre
function mountOnHead(headBone, obj, fwdQuat, up = 0.30) {
  headBone.updateWorldMatrix(true, false);
  const ws = new THREE.Vector3().setFromMatrixScale(headBone.matrixWorld);
  const s = (ws.x + ws.y + ws.z) / 3 || 1;
  const wf = new THREE.Vector3(0, 0, 1).applyQuaternion(fwdQuat).normalize();
  const wu = new THREE.Vector3(0, 1, 0).applyQuaternion(fwdQuat).normalize();
  const hq = headBone.getWorldQuaternion(new THREE.Quaternion());
  const hqi = hq.clone().invert();
  const fL = wf.clone().applyQuaternion(hqi).normalize();
  const uL = wu.clone().applyQuaternion(hqi).normalize();
  const rL = new THREE.Vector3().crossVectors(uL, fL).normalize();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rL, uL, fL));
  obj.scale.setScalar(1 / s);
  obj.position.copy(uL).multiplyScalar(up / s);
  headBone.add(obj);
  return obj;
}

// Mount a mitten hand on each Fist bone, sized and oriented from the body:
//   · length  = Fist → Fist_end bone length (world)
//   · wristR  = forearm radius measured from skinned vertices near the wrist
//   · fingers → bone +Y, thumb → body forward, palm → toward the body
// (arms-at-rest pose; the rig animates the bone and the hand follows)
function attachCuteHands(inst, skinC, fwdQuat) {
  const skinned = [];
  inst.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
  inst.updateWorldMatrix(true, true);
  const bodyFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(fwdQuat).normalize();
  const bodyRight = new THREE.Vector3(1, 0, 0).applyQuaternion(fwdQuat).normalize();
  const v = new THREE.Vector3();
  inst.traverse(o => {
    if (!o.isBone || !/^Fist[LR]$/.test(o.name)) return;
    const isLeft = o.name.endsWith('L');
    const end = o.children.find(c => c.isBone && /_end$/.test(c.name));
    const lower = o.parent;
    const fp = o.getWorldPosition(new THREE.Vector3());
    const ep = end ? end.getWorldPosition(new THREE.Vector3()) : fp.clone().add(new THREE.Vector3(0, -0.2, 0));
    const lp = lower.getWorldPosition(new THREE.Vector3());
    const len = Math.max(0.12, fp.distanceTo(ep));
    // forearm radius near the wrist
    const armDir = fp.clone().sub(lp).normalize(), armLen = fp.distanceTo(lp);
    const radii = [];
    for (const sk of skinned) {
      const n = sk.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        sk.getVertexPosition(i, v).applyMatrix4(sk.matrixWorld).sub(lp);
        const along = v.dot(armDir);
        if (along < armLen - 0.08 || along > armLen + 0.02) continue;
        const radial = v.addScaledVector(armDir, -along).length();
        if (radial < 0.2) radii.push(radial);
      }
    }
    radii.sort((a, b) => a - b);
    const wristR = radii.length ? radii[Math.floor(radii.length * 0.6)] : 0.08;
    const ws = new THREE.Vector3().setFromMatrixScale(o.matrixWorld);
    const s = (ws.x + ws.y + ws.z) / 3 || 1;
    // orientation basis in bone-local space
    const hqi = o.getWorldQuaternion(new THREE.Quaternion()).invert();
    const yB = new THREE.Vector3(0, 1, 0);                               // bone +Y → fingertips
    const inward = bodyRight.clone().multiplyScalar(isLeft ? 1 : -1);    // left hand: +right is toward the body
    const projOffY = (w) => { const l = w.clone().applyQuaternion(hqi); return l.addScaledVector(yB, -l.dot(yB)).normalize(); };
    const fwdL = projOffY(bodyFwd);
    const inL = projOffY(inward);
    // hand frame: X = side*thumbDir(forward), Z = palm normal (inward), Y = Z×X (should be bone -Y = world up)
    const side = isLeft ? -1 : 1;
    const X = fwdL.clone().multiplyScalar(side);
    const Z = inL.clone().sub(X.clone().multiplyScalar(inL.dot(X))).normalize();
    const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
    // hard constraint: fingers (hand -Y) must run down the bone (+Y). Mirrored
    // left-side bone frames would violate it — flip palm+Y together to keep a
    // right-handed frame with the thumb still pointing forward.
    if (Y.dot(yB) > 0) { Z.negate(); Y.negate(); }
    const hand = buildCuteHand({ skin: skinC, len, wristR });
    hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    hand.scale.setScalar(1 / s);
    o.add(hand);
  });
}

function attachHair(headBone, style, color, fwdQuat, accent) {
  headBone.updateWorldMatrix(true, false);
  const ws = new THREE.Vector3().setFromMatrixScale(headBone.matrixWorld);
  const s = (ws.x + ws.y + ws.z) / 3 || 1;
  const wf = fwdQuat ? new THREE.Vector3(0, 0, 1).applyQuaternion(fwdQuat).normalize() : new THREE.Vector3(0, 0, 1);
  const wu = fwdQuat ? new THREE.Vector3(0, 1, 0).applyQuaternion(fwdQuat).normalize() : new THREE.Vector3(0, 1, 0);
  const hq = new THREE.Quaternion();
  headBone.getWorldQuaternion(hq);
  const hqi = hq.clone().invert();
  const fL = wf.clone().applyQuaternion(hqi).normalize();
  const uL = wu.clone().applyQuaternion(hqi).normalize();
  const rL = new THREE.Vector3().crossVectors(uL, fL).normalize();
  const g = buildHair(style, color, accent);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rL, uL, fL));
  g.scale.setScalar(1 / s);
  headBone.add(g);
  return g;
}

// attach the patch to the head bone in bone-local space, computed from the
// rest pose so it tracks animation + head-yaw for free
function attachFacePatch(headBone, {
  mood = 'neutral',
  // Measured on the Quaternius head (world units at game scale): the eye-line
  // cross-section is an arc of radius ≈0.40 whose centre sits 0.15 ahead of
  // the head-bone axis. The decal is a spherical cap of that same radius so
  // it wraps the face instead of floating as a flat card.
  faceWorldR = 0.41, centerFwd = 0.15, centerUp = 0.278, fwdQuat = null,
} = {}) {
  headBone.updateWorldMatrix(true, false);
  const world = headBone.matrixWorld.clone();
  const headPos = new THREE.Vector3().setFromMatrixPosition(world);
  const ws = new THREE.Vector3().setFromMatrixScale(world);
  const s = (ws.x + ws.y + ws.z) / 3 || 1;

  // character's true facing in world (accounts for group.rotation.y)
  const wf = fwdQuat ? new THREE.Vector3(0, 0, 1).applyQuaternion(fwdQuat).normalize() : new THREE.Vector3(0, 0, 1);
  const wu = fwdQuat ? new THREE.Vector3(0, 1, 0).applyQuaternion(fwdQuat).normalize() : new THREE.Vector3(0, 1, 0);

  // sphere centre = head centre; cap apex lands 1cm proud of the skin
  const faceC = headPos.clone().addScaledVector(wu, centerUp).addScaledVector(wf, centerFwd);
  const localC = headBone.worldToLocal(faceC.clone());

  const hq = new THREE.Quaternion();
  headBone.getWorldQuaternion(hq);
  const hqi = hq.clone().invert();
  const fL = wf.clone().applyQuaternion(hqi).normalize();
  const uL = wu.clone().applyQuaternion(hqi).normalize();
  const rL = new THREE.Vector3().crossVectors(uL, fL).normalize();

  const mat = new THREE.MeshBasicMaterial({
    map: createGLBFaceTexture({ mood }),
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  // arc spans chosen so the painted face keeps its previous on-screen size
  // (0.59 × 0.49 world) while wrapping ±41° around the head curve
  const patch = new THREE.Mesh(facePatchGeometry(1.45, 1.2), mat);
  patch.position.copy(localC);
  patch.scale.setScalar((faceWorldR + 0.012) / s);
  patch.rotation.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rL, uL, fL));
  patch.frustumCulled = false;
  headBone.add(patch);
  return patch;
}

const loader = new GLTFLoader();
const _cache = new Map();

/** load + cache a GLB: returns {scene(template), clips:Map<name,AnimationClip>, height} */
export function loadModel(url) {
  if (_cache.has(url)) return _cache.get(url);
  const p = loader.loadAsync(url).then(gltf => {
    // true posed height comes from bone positions — geometry bind-space is
    // a different unit scale on these FBX-converted rigs
    gltf.scene.updateMatrixWorld(true);
    let boneTop = 0, boneBottom = Infinity;
    const v = new THREE.Vector3();
    gltf.scene.traverse(o => {
      if (o.isBone) {
        o.getWorldPosition(v);
        boneTop = Math.max(boneTop, v.y);
        boneBottom = Math.min(boneBottom, v.y);
      }
    });
    const height = boneTop - Math.min(boneBottom, 0);
    const clips = new Map();
    for (const c of gltf.animations) {
      clips.set(c.name, c);
      // normalise 'Armature|Armature|Idle' → 'Idle'
      const short = c.name.split('|').pop();
      if (short && !clips.has(short)) clips.set(short, c);
    }
    // pre-fatten geometries for inverted-hull outlines (bind-space push along normals)
    const outlineGeos = new Map();
    gltf.scene.traverse(o => {
      if (o.isSkinnedMesh && !outlineGeos.has(o.geometry.uuid)) {
        const g = o.geometry.clone();
        const pos = g.attributes.position, nrm = g.attributes.normal;
        if (nrm) {
          for (let i = 0; i < pos.count; i++) {
            pos.setXYZ(i,
              pos.getX(i) + nrm.getX(i) * 0.010,
              pos.getY(i) + nrm.getY(i) * 0.010,
              pos.getZ(i) + nrm.getZ(i) * 0.010);
          }
        }
        outlineGeos.set(o.geometry.uuid, g);
      }
    });
    return { scene: gltf.scene, clips, height, outlineGeos };
  });
  _cache.set(url, p);
  return p;
}

const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x2a1a12, side: THREE.BackSide });

function prepMesh(obj, tint = {}, { toonAll = false } = {}) {
  const clones = new Map(); // one clone per shared source material per instance
  obj.traverse(o => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true;
      o.frustumCulled = false; // skinned bounds are stale under animation
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const out = mats.map(m => {
        // Quaternius .blend ships material Alpha=0 → force opaque
        m.opacity = 1; m.transparent = false; m.alphaTest = 0;
        const c = tint[m.name];
        if (c == null && !toonAll) return m;
        if (!clones.has(m)) {
          const cl = toonAll ? toonSkin(c ?? m.color.getHex()) : m.clone();
          if (!toonAll) cl.color.set(c);
          cl.name = m.name; cl.skinning = true;
          clones.set(m, cl);
        }
        return clones.get(m);
      });
      o.material = Array.isArray(o.material) ? out : out[0];
    }
  });
  return obj;
}

/** attach an inverted-hull outline SkinnedMesh bound to the same skeleton */
function attachOutline(srcMesh, geo, parent) {
  const o = new THREE.SkinnedMesh(geo, OUTLINE_MAT);
  o.skeleton = srcMesh.skeleton;
  o.bindMatrix.copy(srcMesh.bindMatrix);
  o.bindMatrixInverse.copy(srcMesh.bindMatrixInverse);
  o.frustumCulled = false;
  parent.add(o);
  return o;
}

// mood → gesture clip preference (one-shots layered over the idle loop)
// covers both clip libraries: KayKit (Cheer/Hit_A/…) and Quaternius (Victory/RecieveHit/…)
// small ambient one-shots per mood — fired on a randomized timer so the line
// of customers feels alive instead of statues idling in sync
const AMBIENT = {
  happy: ['Victory', 'PickUp'],
  neutral: ['PickUp'],
  impatient: ['RecieveHit', 'Punch'],
  angry: ['Punch', 'RecieveHit'],
};
const GESTURES = {
  happy: ['Cheer', 'Victory'],
  impatient: ['Hit_A', 'RecieveHit', 'Dodge_Backward'],
  angry: ['Unarmed_Melee_Attack_Punch_A', 'Punch', 'Hit_A'],
  served: ['Cheer', 'Victory'],
};
const IDLE = 'Idle';
const WALKS = ['Walking_A', 'Walk', 'Walk_Carry'];

export function createCustomer({
  model, mood = 'neutral', scale = 1, indicator: initialIndicator = null,
  outline = false, tint = {}, hair = null, cute = null,
} = {}) {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const mixerHolder = { mixer: null, actions: new Map(), current: null };
  const bones = { head: null };
  let clips = new Map();
  let talkTimer = 0, walkT = null, mood_ = mood, facePatch = null, cuteHead = null;
  let ambientT = 3 + Math.random() * 5;
  let faceYaw_ = null, blockedT = 0, seated = false, appliedHeadX = 0;
  let eatT = 0, food = null;
  const eatStart = new THREE.Vector3();
  const lastPos = new THREE.Vector3();
  let groundSpeed = 0, locoWalking = false;
  const phase = Math.random() * Math.PI * 2;

  // mood indicator sprite (shared canvas texture fn)
  const indicatorMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
  const indicator = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), indicatorMat);
  indicator.position.set(0.32, 1.5, 0.1);
  indicator.visible = false;
  bodyPivot.add(indicator);

  // ——— Animation layer ———
  // Two layers: a looping *locomotion* action (Idle or a walk clip) that is
  // ALWAYS driven by measured ground speed, and an optional one-shot gesture
  // on top that is faded out the instant the body starts moving. Nothing
  // else may touch the mixer, so "if it moves, it walks" holds by design.
  const getAction = (name) => {
    const { mixer, actions } = mixerHolder;
    const clip = clips.get(name);
    if (!clip || !mixer) return null;
    let a = actions.get(clip.name);
    if (!a) { a = mixer.clipAction(clip); actions.set(clip.name, a); }
    return a;
  };
  const play = (name, { once = false, fade = 0.25 } = {}) => {
    const action = getAction(name) ?? getAction(IDLE);
    if (!action) return null;
    if (once) {
      // gesture layer
      if (mixerHolder.oneShot && mixerHolder.oneShot !== action) mixerHolder.oneShot.fadeOut(0.15);
      action.reset(); action.timeScale = 1;
      action.setLoop(THREE.LoopOnce); action.clampWhenFinished = true;
      action.setEffectiveWeight(1).fadeIn(fade).play();
      mixerHolder.oneShot = action;
      return action;
    }
    // locomotion layer
    if (mixerHolder.current === action) return action;
    action.reset(); action.timeScale = 1;
    action.setLoop(THREE.LoopRepeat);
    action.time = Math.random() * action.getClip().duration; // desync between customers
    if (mixerHolder.current) mixerHolder.current.crossFadeTo(action, fade, false);
    else action.setEffectiveWeight(1);
    action.play();
    mixerHolder.current = action;
    return action;
  };
  const playFirst = (names, opts) => {
    for (const n of names) { if (clips.has(n)) return play(n, opts); }
    return null;
  };
  const cancelOneShot = (fade = 0.12) => {
    const o = mixerHolder.oneShot;
    if (!o) return;
    o.fadeOut(fade);
    mixerHolder.oneShot = null;
  };
  const walkClipFor = () => [walkT && walkT.clip, ...WALKS].filter(Boolean);

  // Frozen seated pose as the locomotion base: a clone of the SitDown clip
  // held on its last frame, so bite/talk one-shots fade back into sitting
  // instead of standing Idle.
  let sitPoseClip = null;
  const sitPoseAction = () => {
    const src = clips.get('SitDown') || clips.get('Sit_Floor_Down') || clips.get('Sit');
    if (!src || !mixerHolder.mixer) return null;
    if (!sitPoseClip) { sitPoseClip = src.clone(); sitPoseClip.name = '__SitPose'; }
    let a = mixerHolder.actions.get('__SitPose');
    if (!a) { a = mixerHolder.mixer.clipAction(sitPoseClip); mixerHolder.actions.set('__SitPose', a); }
    return a;
  };
  const holdSitPose = (fade = 0.3) => {
    const a = sitPoseAction();
    if (!a || mixerHolder.current === a) return;
    a.reset(); a.timeScale = 1;
    a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true;
    a.time = Math.max(0, sitPoseClip.duration - 1e-3);
    if (mixerHolder.current) mixerHolder.current.crossFadeTo(a, fade, false);
    else a.setEffectiveWeight(1);
    a.play();
    mixerHolder.current = a;
  };

  // two-bone CCD IK (world space): swings UpperArmR/LowerArmR so FistR
  // reaches tgt, then slerps back toward the clip pose by `w`
  const _ikE = new THREE.Vector3(), _ikF = new THREE.Vector3(), _ikT = new THREE.Vector3();
  const _ikQ = new THREE.Quaternion(), _ikW = new THREE.Quaternion(), _ikP = new THREE.Quaternion();
  const _ikD = new THREE.Vector3(), _ikM = new THREE.Vector3(), _ikV = new THREE.Vector3();
  const armIK = (tgt, w) => {
    const saved = { u: bones.uarm.quaternion.clone(), l: bones.larm.quaternion.clone(), f: bones.fist.quaternion.clone() };
    for (let i = 0; i < 6; i++) {
      for (const b of [bones.larm, bones.uarm]) {
        group.updateWorldMatrix(true, true);
        _ikE.setFromMatrixPosition(b.matrixWorld);
        _ikF.setFromMatrixPosition(bones.fist.matrixWorld);
        _ikD.subVectors(_ikF, _ikE).normalize();
        _ikT.subVectors(tgt, _ikE).normalize();
        if (_ikD.dot(_ikT) > 0.9995) continue;
        _ikQ.setFromUnitVectors(_ikD, _ikT);
        b.getWorldQuaternion(_ikW).premultiply(_ikQ);
        b.parent.getWorldQuaternion(_ikP).invert();
        b.quaternion.copy(_ikP.multiply(_ikW));
      }
    }
    bones.uarm.quaternion.slerp(saved.u, 1 - w);
    bones.larm.quaternion.slerp(saved.l, 1 - w);
    bones.fist.quaternion.slerp(saved.f, 1 - w);
    group.updateWorldMatrix(true, true);
  };

  const ready = loadModel(model).then(({ scene, clips: c, height, outlineGeos }) => {
    clips = c;
    const inst = skeletonClone(scene);
    // painted face replaces the stock white-oval Face material
    const skinC = tint.Skin ?? 0xdb9c72;
    prepMesh(inst, { ...tint, Face: skinC }, { toonAll: !!cute });
    if (hair) inst.traverse(o => {
      if ((o.isMesh || o.isSkinnedMesh) && o.material && o.material.name === 'Hair') o.visible = false;
    });
    // normalise to ~1.35 units tall
    const s = scale * (1.35 / Math.max(0.01, height));
    inst.scale.setScalar(s);
    bodyPivot.add(inst);

    // head bone for look-tracking + face patch; right-arm chain for the
    // eating IK (fist carries food from the table to the mouth)
    inst.traverse(o => {
      if (!o.isBone) return;
      if (/head/i.test(o.name) && !bones.head) bones.head = o;
      else if (o.name === 'UpperArmR') bones.uarm = o;
      else if (o.name === 'LowerArmR') bones.larm = o;
      else if (o.name === 'FistR') bones.fist = o;
    });
    if (bones.head) {
      group.updateWorldMatrix(true, false);
      const fq = group.getWorldQuaternion(new THREE.Quaternion());
      if (cute) {
        // headless body + procedural cute head mounted on the Head bone
        cuteHead = buildCuteHead({ skin: skinC, hairColor: tint.Hair ?? 0x4a2f1c, mood: mood_, radius: 0.33, ...cute });
        mountOnHead(bones.head, cuteHead.group, fq, 0.33);
        // wrist stumps are baked into the headless GLBs (Blender); runtime hands off
        if (cute.runtimeHands) attachCuteHands(inst, skinC, fq);
      } else {
        facePatch = attachFacePatch(bones.head, { mood: mood_, fwdQuat: fq });
        if (hair) {
          const hs = typeof hair === 'object' ? hair : { style: hair };
          attachHair(bones.head, hs.style, hs.color ?? tint.Hair ?? 0x4a2f1c, fq, hs.accent);
        }
      }
    }

    // outlines bound to each skinned mesh's skeleton
    if (outline || cute) inst.traverse(o => {
      if (o.isSkinnedMesh) {
        const og = outlineGeos.get(o.geometry.uuid);
        if (og) attachOutline(o, og, o.parent);
      }
    });

    mixerHolder.mixer = new THREE.AnimationMixer(inst);
    // a finished gesture must not keep blending its clamped last pose
    mixerHolder.mixer.addEventListener('finished', (e) => {
      // a seated pose is held (clamped) — everything else fades back to loco
      if (e.action === mixerHolder.oneShot && !(seated && /Sit/.test(e.action.getClip().name))) cancelOneShot(0.2);
    });
    play(IDLE);
    lastPos.copy(group.position);
    if (initialIndicator) api.setIndicator(initialIndicator);
    return api;
  });

  const api = {
    group, bodyPivot,
    get headGroup() { return bones.head; },
    clipNames: () => [...clips.keys()],
    // sit / stand: SitDown holds its last frame (clamped one-shot) until stand()
    sit() { seated = true; cancelOneShot(0.1); playFirst(['SitDown', 'Sit_Floor_Down', 'Sit'], { once: true, fade: 0.25 }); },
    stand() { seated = false; playFirst(['StandUp', 'Sit_Floor_StandUp'], { once: true, fade: 0.2 }); },
    get isSeated() { return seated; },
    bone(name) { let b = null; group.traverse(o => { if (o.isBone && o.name === name) b = o; }); return b; },
    // debug probe: what the mixer is actually doing right now
    animState: () => ({
      loco: mixerHolder.current ? mixerHolder.current.getClip().name : null,
      locoW: mixerHolder.current ? +mixerHolder.current.getEffectiveWeight().toFixed(2) : 0,
      oneShot: mixerHolder.oneShot ? mixerHolder.oneShot.getClip().name : null,
      oneShotW: mixerHolder.oneShot ? +mixerHolder.oneShot.getEffectiveWeight().toFixed(2) : 0,
      speed: +groundSpeed.toFixed(2), walking: locoWalking,
    }),
    ready,
    setMood(m) {
      mood_ = m;
      if (cuteHead) cuteHead.setMood(m);
      if (facePatch) {
        const old = facePatch.material.map;
        facePatch.material.map = createGLBFaceTexture({ mood: m });
        if (old) old.dispose();
      }
      const g = GESTURES[m];
      if (g && !locoWalking && !seated) playFirst(g, { once: true });
    },
    setIndicator(kind, side = 1) {
      if (!kind) { indicator.visible = false; return; }
      indicatorMat.map = createIndicatorTexture(kind);
      indicatorMat.needsUpdate = true;
      indicator.position.x = 0.30 * side;
      indicator.visible = true;
      indicatorMat.opacity = 1;
    },
    talk() {
      talkTimer = 0.95;
      // seated bites run the eat cycle — IK brings the fist + food to the
      // mouth instead of a full-body gesture that reads as stand-up-and-sit
      if (seated) {
        if (eatT <= 0 && bones.fist) { eatT = 2.2; bones.fist.getWorldPosition(eatStart); }
        return;
      }
      if (!locoWalking) playFirst(['Interact', 'Use_Item', 'PickUp'], { once: true });
    },
    // food prop living on the table in front of the seat — carried to the
    // mouth on each bite and put back. null when the seat frees up.
    setFood(mesh) {
      food = mesh ? { mesh, parent: mesh.parent, pos: mesh.position.clone(), quat: mesh.quaternion.clone(), held: false } : null;
    },
    // ——— Locomotion (argon-towers pattern): waypoints + velocity heading ———
    // walkTo(points, { speed, clip, faceYaw, delay }) — points are [{x,z}];
    // the body turns toward its velocity while moving and eases to faceYaw
    // once it arrives. `blocked` (set by the scene) makes it wait in Idle.
    walkTo(points, { speed = 1.6, clip = null, faceYaw = null, delay = 0 } = {}) {
      walkT = { pts: points.map(p => ({ x: p.x, z: p.z })), i: 0, speed, clip, faceYaw, delay, moving: false };
    },
    get isWalking() { return !!walkT; },
    blocked: false,
    radius: 0.42,
    // legacy helpers kept for callers that only know x
    enter(toX, dur = 1.4, delay = 0) {
      api.walkTo([{ x: toX, z: group.position.z }], { speed: Math.abs(toX - group.position.x) / dur, delay, faceYaw: group.rotation.y });
    },
    leave(toX, dur = 1.2, clip = null) {
      api.walkTo([{ x: toX, z: group.position.z }], { speed: Math.abs(toX - group.position.x) / dur, clip });
    },
    update(dt, t, lookAt) {
      if (talkTimer > 0) talkTimer = Math.max(0, talkTimer - dt);

      // 1) steer along the path (writes group.position / rotation)
      if (walkT) {
        // hysteresis so a brief block doesn't flicker Idle/Walk
        blockedT = api.blocked ? blockedT + dt : 0;
        if (walkT.delay > 0) { walkT.delay -= dt; }
        else if (blockedT > 0.12) {
          walkT.moving = false; // someone ahead — wait politely
        } else {
          const wp = walkT.pts[walkT.i];
          const dx = wp.x - group.position.x, dz = wp.z - group.position.z;
          const dist = Math.hypot(dx, dz);
          const last = walkT.i >= walkT.pts.length - 1;
          const arriveR = last ? 0.04 : 0.30; // corner rounding on intermediate points
          if (dist <= arriveR) {
            if (last) { group.position.set(wp.x, 0, wp.z); walkT = null; }
            else walkT.i++;
          } else {
            // ease-out on the final approach so they don't stop dead
            const spd = last ? walkT.speed * Math.min(1, 0.25 + dist / 0.9) : walkT.speed;
            const step = Math.min(dist, spd * dt);
            group.position.x += (dx / dist) * step;
            group.position.z += (dz / dist) * step;
            // heading follows velocity (model forward is +Z)
            const desired = Math.atan2(dx, dz);
            let diff = desired - group.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            group.rotation.y += diff * Math.min(1, dt * 10);
            walkT.moving = true;
          }
        }
      }

      // 2) locomotion from MEASURED displacement — this includes pushes from
      //    collision resolution and slot drift, not just path steering. If the
      //    body moved, it walks. No exceptions.
      if (dt > 0) {
        const moved = Math.hypot(group.position.x - lastPos.x, group.position.z - lastPos.z);
        const inst = moved / dt;
        // asymmetric smoothing: react fast to starting, settle slower to stopping
        groundSpeed += (inst - groundSpeed) * Math.min(1, dt * (inst > groundSpeed ? 30 : 8));
      }
      lastPos.copy(group.position);
      const wantWalk = locoWalking ? groundSpeed > 0.06 : groundSpeed > 0.12;
      if (mixerHolder.mixer) {
        if (wantWalk) {
          if (!locoWalking) { locoWalking = true; cancelOneShot(); }
          const a = playFirst(walkClipFor(), { fade: 0.18 });
          // stride rate follows ground speed so feet don't slide
          if (a) a.timeScale = Math.max(0.55, Math.min(1.7, groundSpeed / 1.5));
        } else {
          if (locoWalking) { locoWalking = false; }
          if (seated) holdSitPose(); else play(IDLE, { fade: 0.3 });
        }
        mixerHolder.mixer.update(dt);
      }

      if (!walkT && faceYaw_ !== null) {
        // settle to the slot's facing once stopped
        let diff = faceYaw_ - group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.rotation.y += diff * Math.min(1, dt * 6);
      }
      if (walkT && walkT.faceYaw !== null) faceYaw_ = walkT.faceYaw;

      // ambient life — occasional mood gesture once they settle into place
      if (!walkT && !locoWalking && !seated && mixerHolder.mixer && !api.blocked) {
        ambientT -= dt;
        if (ambientT <= 0) {
          ambientT = 5 + Math.random() * 8;
          const pool = AMBIENT[mood_];
          if (pool && pool.length) playFirst(pool, { once: true, fade: 0.35 });
        }
      }

      // head-bone tracking — additive yaw on top of the animated pose
      if (bones.head && lookAt && !walkT) {
        const dx = lookAt.x - group.position.x, dz = lookAt.z - group.position.z;
        if (Math.hypot(dx, dz) > 0.2) {
          let rel = Math.atan2(dx, dz) - group.rotation.y;
          while (rel > Math.PI) rel -= Math.PI * 2;
          while (rel < -Math.PI) rel += Math.PI * 2;
          const target = Math.max(-0.55, Math.min(0.55, rel * 0.7));
          bones.head.rotation.y += (target - bones.head.rotation.y) * Math.min(1, dt * 5);
          // eyes lead the head: look toward whatever the neck hasn't covered yet
          if (cuteHead) cuteHead.lookAt((rel - bones.head.rotation.y) * 1.6, -(lookAt.y - 1.75) * 0.6);
        }
      } else if (bones.head) {
        bones.head.rotation.y *= Math.max(0, 1 - dt * 4);
        if (cuteHead) cuteHead.lookAt(0, 0);
      }
      // seated life (the clips don't drive head.rotation.x, so subtract the
      // previous contribution before adding the new one — plain += would
      // accumulate forever): slow breathing pitch + a bite nod during the
      // mouth-hold window of the eat cycle
      if (bones.head) {
        bones.head.rotation.x -= appliedHeadX;
        appliedHeadX = 0;
        if (seated) {
          appliedHeadX = Math.sin(t * 1.9 + phase) * 0.025;
          if (eatT > 0) {
            const p = 1 - eatT / 2.2;
            if (p > 0.58 && p < 0.80) appliedHeadX += Math.sin(((p - 0.58) / 0.22) * Math.PI) * 0.34;
          }
        }
        bones.head.rotation.x += appliedHeadX;
      }
      // eat cycle: right hand reaches the food on the table, carries it to
      // the mouth (bite = head nod) and puts it back — CCD IK over the
      // frozen sit pose. Keys: progress → target + IK weight envelope.
      if (seated && eatT > 0 && bones.uarm && bones.larm && bones.fist) {
        eatT = Math.max(0, eatT - dt);
        const p = 1 - eatT / 2.2;
        const foodPos = food ? food.pos : eatStart;
        bones.head.getWorldPosition(_ikM);
        _ikM.x += Math.sin(group.rotation.y) * 0.09;
        _ikM.y -= 0.05;
        _ikM.z += Math.cos(group.rotation.y) * 0.09;
        let w = 1;
        if (p < 0.08) { w = p / 0.08; _ikV.copy(eatStart).lerp(foodPos, w); }
        else if (p < 0.30) _ikV.copy(foodPos);
        else if (p < 0.60) _ikV.copy(foodPos).lerp(_ikM, (p - 0.30) / 0.30);
        else if (p < 0.80) _ikV.copy(_ikM);
        else if (p < 0.94) _ikV.copy(_ikM).lerp(foodPos, (p - 0.80) / 0.14);
        else { w = 1 - (p - 0.94) / 0.06; _ikV.copy(foodPos); }
        armIK(_ikV, w);
        // the burger rides on top of the fist, kept level
        if (food) {
          const held = p > 0.26 && p < 0.92;
          if (held) {
            food.held = true;
            bones.fist.getWorldPosition(_ikF);
            food.mesh.position.set(_ikF.x, _ikF.y + 0.035, _ikF.z);
          } else if (food.held) {
            food.held = false;
            food.mesh.position.copy(food.pos);
            food.mesh.quaternion.copy(food.quat);
            food.mesh.scale.multiplyScalar(0.8); // bites eat it down
          }
        }
      } else if (food && food.held) {
        food.held = false;
        food.mesh.position.copy(food.pos);
        food.mesh.quaternion.copy(food.quat);
      }
      if (cuteHead) cuteHead.update(dt, t);

      if (indicator.visible) {
        indicator.position.y = 1.5 + Math.sin(t * 4 + phase) * 0.04;
        indicator.rotation.z = Math.sin(t * 3 + phase) * 0.08;
      }
    },
  };
  return api;
}

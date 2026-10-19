import * as THREE from './assets/vendor/three.module.js';
import { createCustomer } from './glb-people.js';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';
import { createCartVariant, makeMats as makeCartMats, CART_VARIANTS } from './cart-catalog-view.js';

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function addBox(parent, name, w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, name, r1, r2, h, x, y, z, material, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, name, r, x, y, z, material, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addTorus(parent, name, r, tube, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 22), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function createCar(parent, x, z, bodyColor, trimColor) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.48, metalness: 0.22 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.55, metalness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x111b25, roughness: 0.18, metalness: 0.04 });
  addBox(group, 'CarBody', 3.15, 0.82, 0.28, 0, 1.18, 0, bodyMat);
  addBox(group, 'CarRoof', 2.20, 0.72, 0.28, -0.05, 1.74, 0, bodyMat);
  addBox(group, 'RearWindow', 0.78, 0.48, 0.04, -0.84, 1.74, 0.17, glassMat);
  addBox(group, 'FrontWindow', 1.02, 0.48, 0.04, 0.55, 1.74, 0.17, glassMat);
  addBox(group, 'WindowDivider', 0.08, 0.60, 0.05, -0.12, 1.74, 0.19, trimMat);
  addBox(group, 'DoorLine', 0.035, 0.72, 0.04, 0.02, 1.15, 0.17, trimMat);
  addBox(group, 'Mirror', 0.20, 0.13, 0.10, 1.18, 1.46, 0.20, trimMat);
  return group;
}

// ingredient pile as a flat image inside the tray container — one textured
// quad per tray instead of 20+ tiny meshes. Matches the painted look.
function pileTexture(kind, colorHex) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const ctx = c.getContext('2d');
  const col = '#' + colorHex.toString(16).padStart(6, '0');
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  const spots = [[54, 50, -0.12], [120, 44, 0.18], [190, 58, -0.08], [80, 108, 0.22], [162, 106, -0.18], [218, 92, 0.10]];
  for (const [px, py, rot] of spots) {
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
    ctx.fillStyle = col;
    ctx.beginPath();
    if (kind === 'square') ctx.rect(-24, -17, 48, 34);
    else if (kind === 'ring') { ctx.arc(0, 0, 20, 0, 7); ctx.moveTo(11, 0); ctx.arc(0, 0, 11, 0, 7, true); }
    else if (kind === 'leaf') ctx.ellipse(0, 0, 28, 15, 0.3, 0, 7);
    else ctx.arc(0, 0, 23, 0, 7); // slice
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function addIngredientTray(parent, x, z, w, items, mat, ing) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x151a1e, roughness: 0.72 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x68727a, metalness: 0.45, roughness: 0.4 });
  addBox(parent, 'Tray', w, 0.10, 0.58, x, 1.28, z, dark);
  addBox(parent, 'TrayLip', w + 0.08, 0.06, 0.66, x, 1.31, z, steel);
  addBox(parent, 'TrayWell', w - 0.06, 0.065, 0.50, x, 1.34, z, dark);
  const kind = items[0][2];
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.10, 0.44),
    new THREE.MeshBasicMaterial({ map: pileTexture(kind, mat.color.getHex()), transparent: true })
  );
  quad.name = 'IngredientPile';
  quad.userData.ing = ing;
  quad.rotation.x = -Math.PI / 2;
  quad.position.set(x, 1.385, z);
  parent.add(quad);
  return quad;
}

function addSauceWell(parent, x, z, sauceMat, ing) {
  // standing squeeze bottle (like the reference: mustard + ketchup upright)
  const body = addCylinder(parent, 'BottleBody', 0.20, 0.24, 0.62, x, 1.62, z, sauceMat, 20);
  body.userData.ing = ing;
  addCylinder(parent, 'BottleNeck', 0.075, 0.13, 0.16, x, 1.98, z, sauceMat, 14);
  addCylinder(parent, 'BottleTip', 0.028, 0.06, 0.12, x, 2.10, z, sauceMat, 10);
  const label = addBox(parent, 'BottleLabel', 0.30, 0.24, 0.03, x, 1.66, z + 0.21, new THREE.MeshStandardMaterial({ color: 0xfffdf6, roughness: 0.7 }));
  label.rotation.x = -0.06;
  return body;
}

// The assembly board: just the board + an open bun — gameplay layers land on
// top of it as the player drags ingredients in. Returns the board mesh (the
// drop target) and the bun top Y so layers stack correctly.
function addAssembledSandwich(parent, mats, dx = 0, dz = 0) {
  const board = addBox(parent, 'CuttingBoard', 1.30, 0.12, 1.15, dx, 1.36, 0.58 + dz, mats.board);
  const bread = addBox(parent, 'SandwichBread', 0.98, 0.13, 0.46, dx, 1.49, 0.58 + dz, mats.bread);
  bread.name = 'AssemblyBun';
  bread.rotation.y = -0.08;
  return { board, bun: bread, bunTopY: 1.49 + 0.065, cx: dx, cz: 0.58 + dz };
}

export function createPrepView() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x23272b);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);

  scene.add(new THREE.HemisphereLight(0xfff6df, 0x405060, 1.25));
  const key = new THREE.DirectionalLight(0xfff0cf, 1.55);
  key.position.set(-4, 7, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const root = new THREE.Group();
  scene.add(root);

  // Segmented part registry — every prop lands in exactly one named group so
  // whole segments can be toggled/re-textured independently (paint-over
  // pipeline: isolate a segment, paint its flat render, project it back).
  //   env    → backdrop (street.glb wall+floor L, ground plane)      [painted]
  //   cart   → counter body + front knobs                          [painted]
  //   grill  → grill plate + grate bars                            [painted]
  //   tables → both terrace tables (fixed furniture)               [painted]
  //   stools → terrace stools (slide when sims sit/stand)          [live 3D]
  //   food   → sausages, sandwich stack, trays, bottles, bread     [live 3D]
  //   chars  → customer queue + passers-by                         [live 3D]
  //   ui     → floating order card                                 [live 3D]
  const parts = {};
  for (const name of ['env', 'cart', 'grill', 'tables', 'stools', 'food', 'chars', 'ui']) {
    const g = new THREE.Group();
    g.name = 'part:' + name;
    parts[name] = g;
    root.add(g);
  }

  const mats = {
    sidewalk: new THREE.MeshStandardMaterial({ color: 0x8f8b86, roughness: 0.95 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x39434c, roughness: 0.68, metalness: 0.12 }),
    counter: new THREE.MeshStandardMaterial({ color: 0xaebbc1, metalness: 0.36, roughness: 0.32 }),
    counterDark: new THREE.MeshStandardMaterial({ color: 0x4f5960, metalness: 0.42, roughness: 0.45 }),
    board: new THREE.MeshStandardMaterial({ color: 0x7b3e2d, roughness: 0.82 }),
    bread: new THREE.MeshStandardMaterial({ color: 0xd8893f, roughness: 0.74 }),
    cheese: new THREE.MeshStandardMaterial({ color: 0xf6b735, roughness: 0.62 }),
    tomato: new THREE.MeshStandardMaterial({ color: 0xc9362d, roughness: 0.62 }),
    onion: new THREE.MeshStandardMaterial({ color: 0x9a4c91, roughness: 0.68 }),
    lettuce: new THREE.MeshStandardMaterial({ color: 0x77b94f, roughness: 0.78 }),
    bacon: new THREE.MeshStandardMaterial({ color: 0xd98f89, roughness: 0.7 }),
    pickle: new THREE.MeshStandardMaterial({ color: 0xb8c94f, roughness: 0.72 }),
    sauceRed: new THREE.MeshStandardMaterial({ color: 0xc92420, roughness: 0.34 }),
    sauceYellow: new THREE.MeshStandardMaterial({ color: 0xe5a719, roughness: 0.38 }),
  };

  // Street backdrop: Blender-authored L mesh (assets/models/street.glb) —
  // brick region of Diego's texture on the wall, sidewalk region tiled on
  // the floor, curb lip at the front. Wall plane at z=-3.2, floor runs to +3.2.
  new GLTFLoader().load('./assets/models/street.glb', gltf => {
    const street = gltf.scene;
    street.name = 'StreetL';
    street.position.set(0, 0, -3.2);
    street.traverse(o => {
      if (o.isMesh) {
        o.receiveShadow = true;
        if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
        o.material.roughness = 0.95; o.material.metalness = 0;
      }
    });
    parts.env.add(street);
  });
  // wide neutral ground beyond the L so the edges never show
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), mats.sidewalk);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.02, -0.2);
  floor.receiveShadow = true;
  parts.env.add(floor);

  // ——— Living customer queue ———
  // They walk in from the right sidewalk, line up behind the counter, the
  // front one gets served (Victory + carries the food away), the line
  // shuffles forward, patience decays into sweat → anger → walk-off.
  // Headless rigged bodies (clothes + animation) + procedural cute heads.
  const CITY = './assets/models/city-headless/';
  const ROSTER = [
    // Blender-authored hair (assets/models/hair/*.glb) — hairline always clears brows/eyes
    { model: CITY + 'Casual_Female.glb',  scale: 1.55, tint: { Skin: 0xf2c6a6, Hair: 0x5a3a22 }, cute: { hair: 'f_bob' } },
    { model: CITY + 'Casual_Male.glb',    scale: 1.50, tint: { Skin: 0xd9a07a, Hair: 0x2a1d14 }, cute: { hair: 'm_short' } },
    { model: CITY + 'Casual2_Female.glb', scale: 1.52, tint: { Skin: 0xa8663f, Hair: 0xf0c84a }, cute: { hair: 'f_pixie' } },
    { model: CITY + 'Worker_Male.glb',    scale: 1.60, tint: { Skin: 0x7a4a2e, Hair: 0x151010 }, cute: { hair: 'm_afro' } },
    { model: CITY + 'Casual3_Female.glb', scale: 1.53, tint: { Skin: 0xe8b48e, Hair: 0xc45a2a }, cute: { hair: 'f_pony' } },
    { model: CITY + 'Casual2_Male.glb',   scale: 1.56, tint: { Skin: 0x8c5a34, Hair: 0x1a1210 }, cute: { hair: 'm_wavy' } },
    { model: CITY + 'Casual3_Male.glb',   scale: 1.58, tint: { Skin: 0xf0c8a0, Hair: 0x8a5a2a }, cute: { hair: 'm_quiff' } },
    { model: CITY + 'Casual2_Female.glb', scale: 1.54, tint: { Skin: 0xc68a5a, Hair: 0x2a1a12 }, cute: { hair: 'f_bun' } },
  ];
  // Sidewalk layout (world units; camera looks toward -z, +x is screen-right):
  //   brick wall z=-3.2 · back lane z=-2.65 (through-traffic) · front lane
  //   z≈-1.85 (the line, right behind the counter's back edge at z=-1.23).
  // Slot [x, z, yaw]: yaw is the facing once stopped (toward the counter/cook).
  const QUEUE_Z = 3.60;            // customers stand right behind the cart (foreground view)
  const Q_SLOTS = [
    [-1.05, QUEUE_Z, 0.30],   // front of the line — being served
    [0.05, QUEUE_Z + 0.10, 0.12],
    [1.20, QUEUE_Z + 0.10, -0.06],
    [2.45, QUEUE_Z, -0.30],   // back of the line (half out of frame, fine)
  ];
  const BACK_LANE_Z = -2.65;
  const ENTER_X = 6.0, LEAVE_X = -6.2;
  const queue = [];               // { api, patience, state, mood, t }
  let spawnT = 0, rosterIdx = 0;
  const hooks = {};               // gameplay attaches frontReady/serve here

  // Route: arrive along the back lane, then cut forward into the slot.
  const routeToSlot = (from, s) => {
    const pts = [];
    if (Math.abs(from.z - BACK_LANE_Z) > 0.3) pts.push({ x: from.x, z: BACK_LANE_Z });
    pts.push({ x: s[0] + 0.55, z: BACK_LANE_Z });
    pts.push({ x: s[0], z: s[1] });
    return pts;
  };
  // Route out: step back into the back lane (behind everyone), walk off left.
  const routeOut = (from) => [
    { x: from.x - 0.25, z: BACK_LANE_Z },
    { x: LEAVE_X, z: BACK_LANE_Z },
  ];

  function spawnCustomer() {
    const def = ROSTER[rosterIdx++ % ROSTER.length];
    const api = createCustomer(def);
    const idx = Math.min(queue.length, Q_SLOTS.length - 1);
    const s = Q_SLOTS[idx];
    api.group.position.set(ENTER_X, 0, BACK_LANE_Z);
    api.group.rotation.y = -Math.PI / 2; // facing -x (walking left)
    parts.chars.add(api.group);
    const m = { api, patience: 0, mood: 'neutral', state: 'wait', slot: idx };
    queue.push(m);
    api.walkTo(routeToSlot(api.group.position, s), { speed: 1.7, faceYaw: s[2] });
  }

  // Shuffle the line forward: each waiting customer walks to its new slot.
  function reflowQueue() {
    let k = 0;
    for (const m of queue) {
      if (m.state !== 'wait' && m.state !== 'served') continue; // seated/leaving are out of the line
      if (m.slot !== k) {
        m.slot = k;
        const s = Q_SLOTS[k];
        const p = m.api.group.position;
        if (p.z < BACK_LANE_Z + 0.35) {
          // still arriving along the back lane — give the full route to the new slot
          m.api.walkTo(routeToSlot(p, s), { speed: 1.7, faceYaw: s[2] });
        } else {
          // already in line — short sidestep along the front lane
          m.api.walkTo([{ x: s[0], z: s[1] }], { speed: 1.2, faceYaw: s[2], delay: k * 0.18 });
        }
      }
      k++;
    }
  }

  // ——— Passers-by: through-traffic on the back lane, both directions ———
  const PED_TINTS = [
    { Skin: 0xf4cdb0, Hair: 0x2b2b2b, Shirt: 0x4a7a4a }, { Skin: 0xc68a5a, Hair: 0x5a3a22, Shirt: 0x9a4a6a },
    { Skin: 0x6b3f23, Hair: 0x111111, Shirt: 0xd8b24a }, { Skin: 0xe9b58c, Hair: 0xb4863c, Shirt: 0x3a5a9a },
  ];
  const PED_HAIR = ['m_wavy', 'f_bun', 'm_buzz', 'f_pony', 'm_short', 'f_bob'];
  const peds = [];
  let pedT = 2.5, pedIdx = 0;
  function spawnPedestrian() {
    const def = ROSTER[(pedIdx * 3 + 1) % ROSTER.length];
    const dir = Math.random() < 0.5 ? 1 : -1;          // +1 → walks left→right
    const api = createCustomer({
      model: def.model, scale: def.scale * (0.94 + Math.random() * 0.1),
      tint: PED_TINTS[pedIdx % PED_TINTS.length], cute: { hair: PED_HAIR[pedIdx % PED_HAIR.length] },
    });
    pedIdx++;
    const z = BACK_LANE_Z - 0.08 - Math.random() * 0.14;  // wall side of the lane, clear of the bricks
    api.group.position.set(dir > 0 ? LEAVE_X : ENTER_X, 0, z);
    api.group.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    api.radius = 0.38;
    parts.chars.add(api.group);
    api.walkTo([{ x: dir > 0 ? ENTER_X : LEAVE_X, z }], { speed: 1.4 + Math.random() * 0.7 });
    peds.push(api);
  }
  function updatePeds(dt) {
    pedT -= dt;
    if (pedT <= 0 && peds.length < 2) { spawnPedestrian(); pedT = 6 + Math.random() * 7; }
    for (let i = peds.length - 1; i >= 0; i--) {
      if (!peds[i].isWalking) { parts.chars.remove(peds[i].group); peds.splice(i, 1); }
    }
  }

  // Separation + yielding across *all* bodies (queue + passers-by):
  //  · overlapping bodies are pushed apart (argon repel); walkers yield more
  //  · a walker stops if someone stands in its look-ahead cone
  //  · an idle customer whose slot is in a walker's way shuffles aside a step
  //    and drifts back home afterwards — like a real sidewalk line
  function resolveBodies(dt) {
    const bodies = [...queue.map(m => m.api), ...peds];
    const n = bodies.length;
    for (const b of bodies) b.blocked = false;
    for (let i = 0; i < n; i++) {
      const a = bodies[i], pa = a.group.position;
      for (let j = i + 1; j < n; j++) {
        const b = bodies[j], pb = b.group.position;
        const dx = pb.x - pa.x, dz = pb.z - pa.z;
        const d = Math.hypot(dx, dz), minD = a.radius + b.radius;
        if (d < minD && d > 1e-4) {
          const push = (minD - d) * 0.5;
          const nx = dx / d, nz = dz / d;
          // seated bodies are furniture — the other side takes the whole push
          const wa = a.isSeated ? 0 : a.isWalking ? 0.8 : 0.35;
          const wb = b.isSeated ? 0 : b.isWalking ? 0.8 : 0.35;
          const ws = wa + wb;
          if (ws > 0) {
            pa.x -= nx * push * 2 * wa / ws; pa.z -= nz * push * 2 * wa / ws;
            pb.x += nx * push * 2 * wb / ws; pb.z += nz * push * 2 * wb / ws;
          }
        }
      }
      if (!a.isWalking) continue;
      const fx = Math.sin(a.group.rotation.y), fz = Math.cos(a.group.rotation.y);
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const b = bodies[j], pb = b.group.position;
        const dx = pb.x - pa.x, dz = pb.z - pa.z;
        const along = dx * fx + dz * fz;
        const sideS = dx * fz - dz * fx;
        const side = Math.abs(sideS);
        if (along > 0 && along < 1.0 && side < 0.5) {
          if (b.isSeated) {
            a.blocked = true;                    // can't ask a sitter to move
          } else if (!b.isWalking) {
            // standing body in the way: ask it to step aside (toward the counter
            // side, away from the lane), and slow down until it clears
            b.nudge = { x: 0, z: 0.32 };
            if (side < 0.32) a.blocked = true;
          } else if (j < i) a.blocked = true;   // two walkers: lower index wins
        }
      }
    }
    // apply nudges + drift idle customers back to their slot
    for (const m of queue) {
      const a = m.api;
      if (a.isWalking || (m.state !== 'wait' && m.state !== 'served')) { a.nudge = null; continue; }
      const s = Q_SLOTS[m.slot], p = a.group.position;
      const tx = s[0] + (a.nudge ? a.nudge.x : 0);
      const tz = s[1] + (a.nudge ? a.nudge.z : 0);
      const k = Math.min(1, dt * (a.nudge ? 5 : 2.2));
      p.x += (tx - p.x) * k; p.z += (tz - p.z) * k;
      a.nudge = null;
    }
  }

  // ——— Terrace: bistro tables + stools at both sidewalk edges ———
  // seat = { yaw (facing), taken, stool, ... }. SitDown ends with the hips
  // ~0.31 behind the rig origin at y≈0.42, so the stand point sits 0.30 in
  // FRONT of the stool centre and the character faces away from the table.
  // one table at the left edge of the frame; chair A faces the camera (we
  // see the face while eating), chair B sits on the far side facing inward
  // Two round plastic tables (Blender: table_plain / table_cloth) as a small
  // terrace in the foreground corners — the only free floor that's visible
  // in portrait (the back band holds the queue + pedestrian lane, and the
  // counter reaches x≈±2.4). Chairs sit left/right of each table in profile.
  const TABLES = [
    // stools: [dx, dz, yaw, usable] — inner + south are seats; the outer one
    // is a prop only (a sim sat there would be half-cropped by the frame).
    { model: 'table_plain', x: -1.60, z: -1.85, stools: [
      [0.72, 0.02, -Math.PI / 2 + 0.35, true],
      [-0.10, 0.68, Math.PI - 0.25, true],
      [-0.80, -0.05, Math.PI / 2 - 0.25, false],
    ] },
    { model: 'table_cloth', x: 1.60, z: -1.85, stools: [
      [-0.72, 0.02, Math.PI / 2 - 0.35, true],
      [0.10, 0.68, Math.PI + 0.25, true],
      [0.80, -0.05, -Math.PI / 2 + 0.25, false],
    ] },
  ];
  const seats = [];
  const foodKit = { src: null, topY: new Map() };
  const furnitureLoader = new GLTFLoader();
  const loadProp = (url) => new Promise(res => furnitureLoader.load(url, g => res(g.scene)));
  Promise.all([loadProp('./assets/models/table_plain.glb'), loadProp('./assets/models/table_cloth.glb'), loadProp('./assets/models/stool.glb'), loadProp('./assets/models/burger.glb')])
    .then(([plainSrc, clothSrc, stoolSrc, burgerSrc]) => {
      const prep = (o) => o.traverse(m => {
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; if (m.material.map) m.material.map.colorSpace = THREE.SRGBColorSpace; }
      });
      foodKit.src = burgerSrc;
      for (const t of TABLES) {
        const table = (t.model === 'table_cloth' ? clothSrc : plainSrc).clone(true); prep(table);
        table.position.set(t.x, 0, t.z); table.rotation.y = Math.random() * Math.PI;
        parts.tables.add(table);
        // tabletop height for the burger — measured off the placed clone
        const topY = new THREE.Box3().setFromObject(table).max.y;
        for (const [dx, dz, yaw, usable] of t.stools) {
          const stool = stoolSrc.clone(true); prep(stool);
          stool.position.set(t.x + dx, 0, t.z + dz);
          stool.rotation.y = yaw;
          parts.stools.add(stool);
          if (!usable) continue;
          const fx = Math.sin(yaw), fz = Math.cos(yaw);
          const side = t.x < 0 ? -2.80 : 2.80;
          const stoolHome = stool.position.clone();
          // south-facing seats must be reached from below the table (front
          // edge), not via the counter corridor — the corridor would walk the
          // sim straight through the tabletop.
          const south = fz < -0.5;
          seats.push({ yaw, taken: false, stool, table, topY, side, fx, fz, stoolHome, south, stoolOff: 0, stoolTarget: 0, food: null });
        }
      }
    });
  const freeSeat = () => seats.find(s => !s.taken) || null;
  // stand point + approach waypoints are computed from the stool's CURRENT
  // position — a stool pushed back by the previous customer becomes the new
  // sit target, so the next sim always lands their hips on the actual seat.
  const standOf = (s) => ({ x: s.stool.position.x + s.fx * 0.30, z: s.stool.position.z + s.fz * 0.30 });
  const routeIn = (s, st) => s.south
    ? [{ x: s.side, z: 1.9 }, { x: s.side, z: 3.35 }, { x: st.x, z: 3.35 }]
    : [{ x: s.side, z: 1.9 }, { x: st.x, z: 1.9 }];
  const routeOut2 = (s, st) => s.south
    ? [{ x: st.x, z: 3.35 }, { x: s.side, z: 3.35 }, { x: s.side, z: 1.9 }]
    : [{ x: st.x, z: 1.9 }, { x: s.side, z: 1.9 }];

  function updateQueue(dt) {
    spawnT -= dt;
    if (queue.filter(m => m.state === 'wait' || m.state === 'served').length < Q_SLOTS.length && spawnT <= 0) {
      spawnCustomer();
      spawnT = 3 + Math.random() * 3;
    }

    // When the front customer reaches the head of the line they place their
    // order (speech bubble via the gameplay hook) and wait to be served.
    // Their own patience (orderT) runs out → they storm off like anyone else.
    const front = queue.find(m => m.state === 'wait' && m.slot === 0);
    if (front && !front.api.isWalking && !front.orderAsked) {
      front.orderAsked = true;
      front.orderT = 45;
      hooks.frontReady?.(front);
    }
    if (front && front.orderAsked && front.orderT !== undefined) {
      front.orderT -= dt;
      if (front.orderT <= 0) {
        hooks.orderExpired?.(front);
        front.state = 'leaving';
        front.orderAsked = false;
        front.api.walkTo(routeOut(front.api.group.position), { speed: 2.1 });
        front.api.setMood('angry');
        front.api.setIndicator('angry', -1);
        reflowQueue();
      }
    }

    for (let i = queue.length - 1; i >= 0; i--) {
      const m = queue[i];
      if (m.state === 'served') {
        m.t -= dt;
        if (m.t <= 0) {
          m.api.setIndicator(null);
          const seat = freeSeat();
          if (seat) {
            // carry the food to a terrace stool: back lane → side corridor →
            // the seat's own approach waypoints (south seats wrap the front
            // edge of the table instead of the counter corridor)
            seat.taken = true; m.seat = seat; m.state = 'toSeat';
            const p = m.api.group.position;
            const st = standOf(seat);
            m.api.walkTo([
              { x: p.x, z: BACK_LANE_Z },
              { x: seat.side, z: BACK_LANE_Z },
              ...routeIn(seat, st),
              st,
            ], { speed: 1.6, clip: 'Walk_Carry', faceYaw: seat.yaw });
          } else {
            m.state = 'leaving';
            m.api.walkTo(routeOut(m.api.group.position), { speed: 1.8, clip: 'Walk_Carry' });
          }
          reflowQueue();
        }
      } else if (m.state === 'toSeat') {
        if (!m.api.isWalking) {
          // settle facing, then sit
          const d = Math.abs(((m.api.group.rotation.y - m.seat.yaw + Math.PI) % (Math.PI * 2)) - Math.PI);
          // tuck the stool under the sitter — a small RELATIVE slide toward
          // the table so it lands beneath the hips wherever it was left
          if (d < 0.12) {
            m.state = 'sitting'; m.t = 1.4; m.api.sit();
            m.seat.stoolTarget = m.seat.stoolOff + 0.04;
            // their order lands on the table edge in front of the stool
            if (foodKit.src && !m.seat.food) {
              const f = foodKit.src.clone(true);
              f.traverse(mm => { if (mm.isMesh) { mm.castShadow = true; } });
              const dx = m.seat.stool.position.x - m.seat.table.position.x;
              const dz = m.seat.stool.position.z - m.seat.table.position.z;
              const dl = Math.hypot(dx, dz) || 1;
              f.position.set(m.seat.table.position.x + dx / dl * 0.27, m.seat.topY, m.seat.table.position.z + dz / dl * 0.27);
              parts.food.add(f);
              m.seat.food = f;
              m.api.setFood(f);
            }
          }
        }
      } else if (m.state === 'sitting') {
        m.t -= dt;
        if (m.t <= 0) { m.state = 'eating'; m.t = 9 + Math.random() * 6; m.biteT = 1.5; }
      } else if (m.state === 'eating') {
        m.t -= dt; m.biteT -= dt;
        if (m.biteT <= 0) { m.biteT = 2.2 + Math.random() * 1.5; m.api.talk(); } // bite gesture
        // standing shoves the stool back out — bounded so repeat use can't
        // drift it away from the table
        if (m.t <= 0) {
          m.state = 'standing'; m.t = 1.3; m.api.stand(); m.api.setMood('neutral');
          m.seat.stoolTarget = Math.max(m.seat.stoolOff - 0.17, -0.20);
          if (m.seat.food) { m.api.setFood(null); parts.food.remove(m.seat.food); m.seat.food = null; }
        }
      } else if (m.state === 'standing') {
        m.t -= dt;
        if (m.t <= 0) {
          const seat = m.seat;
          seat.taken = false; m.seat = null;
          m.state = 'leaving';
          m.api.walkTo([
            ...routeOut2(seat, standOf(seat)),
            { x: seat.side, z: BACK_LANE_Z },
            { x: LEAVE_X, z: BACK_LANE_Z },
          ], { speed: 1.7 });
        }
      } else if (m.state === 'leaving') {
        if (!m.api.isWalking || m.api.group.position.x < LEAVE_X + 0.3) {
          parts.chars.remove(m.api.group);
          queue.splice(i, 1);
        }
      } else if (m.slot > 0) {
        m.patience += dt;
        if (m.patience > 30) {
          m.state = 'leaving';
          m.api.walkTo(routeOut(m.api.group.position), { speed: 2.1 }); // storms off
          m.api.setIndicator(null);
          reflowQueue();
        } else if (m.patience > 18 && m.mood !== 'angry') {
          m.mood = 'angry'; m.api.setMood('angry'); m.api.setIndicator('angry', -1);
        } else if (m.patience > 9 && m.mood === 'neutral') {
          m.mood = 'impatient'; m.api.setMood('impatient'); m.api.setIndicator('sweat', -1);
        }
      }
    }
    updatePeds(dt);
    // stools ease toward their offset target along the sitter's facing, with
    // a small scrape-yaw while sliding — tucked in on sit-down, pushed back
    // on stand-up, and left wherever they end until the next customer sits
    for (const s of seats) {
      if (Math.abs(s.stoolTarget - s.stoolOff) < 1e-4) continue;
      s.stoolOff += (s.stoolTarget - s.stoolOff) * Math.min(1, dt * 9);
      if (Math.abs(s.stoolTarget - s.stoolOff) < 0.002) s.stoolOff = s.stoolTarget;
      s.stool.position.set(s.stoolHome.x + s.fx * s.stoolOff, 0, s.stoolHome.z + s.fz * s.stoolOff);
      s.stool.rotation.y = s.yaw + s.stoolOff * 0.8;
    }
    resolveBodies(dt);
  }
  const lookTarget = new THREE.Vector3(-0.15, 1.55, 0.85); // the sandwich being built

  // Stainless work counter — compacted for portrait, reference layout:
  // grill left | board + bread center | trays 2x2 + sauce wells right.
  addBox(parts.cart, 'CounterDeck', 4.7, 0.16, 2.70, 0, 1.18, 0.12, mats.counter);
  addBox(parts.cart, 'CounterFront', 4.8, 1.08, 0.26, 0, 0.57, 1.53, mats.counterDark);
  addBox(parts.cart, 'CounterLip', 4.85, 0.12, 0.18, 0, 1.30, 1.44, mats.counterDark);

  // Gameplay interaction registry — drag sources and the drop target get
  // userData.ing so the gameplay layer can hit-test them in screen space.
  const interact = { sources: [], board: null, assembly: null };

  // Grill plate with grate bars and 6 sausages (3x2).
  const grate = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.3 });
  const sausageMat = new THREE.MeshStandardMaterial({ color: 0xb84a22, roughness: 0.55 });
  // grill plate + grate bars paint as part of the cart (one plate, no seams)
  const grillPlate = addBox(parts.cart, 'GrillPlate', 1.30, 0.10, 1.75, -1.38, 1.30, 0.05, grate);
  grillPlate.userData.ing = 'sausage';
  interact.sources.push(grillPlate);
  for (let i = 0; i < 5; i++) addBox(parts.cart, 'GrateBar', 0.045, 0.035, 1.60, -1.88 + i * 0.25, 1.36, 0.05, mats.counterDark);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const sau = addCylinder(parts.food, 'Sausage', 0.085, 0.085, 0.52, -1.84 + c * 0.50, 1.45, -0.50 + r * 0.62, sausageMat, 12);
    sau.rotation.z = Math.PI / 2;
  }

  // Assembly board + bread stock at center.
  interact.assembly = addAssembledSandwich(parts.food, mats, -0.15, 0.25);
  interact.board = interact.assembly.board;
  addBox(parts.food, 'BreadTray', 1.30, 0.12, 0.62, -0.15, 1.36, -0.80, mats.counterDark);
  for (let i = 0; i < 4; i++) {
    const roll = addSphere(parts.food, 'BreadRoll', 0.19, -0.60 + i * 0.30, 1.51, -0.80, mats.bread, [0.72, 0.42, 1.65]);
    roll.rotation.z = 0.24;
  }

  // 2x2 topping trays right — fuller piles, like the reference.
  interact.sources.push(
    addIngredientTray(parts.food, 0.95, -0.45, 0.72, [[-0.32,-0.28,'square'],[-0.08,0.05,'square'],[0.18,-0.20,'square'],[0.34,0.22,'square'],[-0.05,-0.35,'square'],[0.20,0.35,'square']], mats.cheese, 'cheese'),
    addIngredientTray(parts.food, 1.78, -0.45, 0.72, [[-0.32,-0.28,'ring'],[-0.08,0.05,'ring'],[0.18,-0.20,'ring'],[0.34,0.22,'ring'],[-0.05,-0.35,'ring'],[0.20,0.35,'ring']], mats.onion, 'onion'),
    addIngredientTray(parts.food, 0.95, 0.42, 0.72, [[-0.32,-0.28,'leaf'],[-0.08,0.05,'leaf'],[0.18,-0.20,'leaf'],[0.34,0.22,'leaf'],[-0.05,-0.35,'leaf'],[0.20,0.35,'leaf']], mats.lettuce, 'lettuce'),
    addIngredientTray(parts.food, 1.78, 0.42, 0.72, [[-0.32,-0.28,'slice'],[-0.08,0.05,'slice'],[0.18,-0.20,'slice'],[0.34,0.22,'slice'],[-0.05,-0.35,'slice'],[0.20,0.35,'slice']], mats.tomato, 'tomato'),
    addSauceWell(parts.food, 0.95, -1.05, mats.sauceRed, 'ketchup'),
    addSauceWell(parts.food, 1.78, -1.05, mats.sauceYellow, 'mustard'),
  );

  // Front controls / knobs under the grill.
  for (let i = 0; i < 3; i++) {
    const x = -1.95 + i * 0.5;
    const knob = addCylinder(parts.cart, 'FrontKnob', 0.12, 0.12, 0.08, x, 0.50, 1.68, mats.counterDark, 20);
    knob.rotation.x = Math.PI / 2;
    addBox(parts.cart, 'KnobHandle', 0.05, 0.20, 0.035, x, 0.54, 1.73, mats.frame);
  }

  // Reference-style layout: the cart sits in the FOREGROUND (bottom of the
  // frame — the player is the vendor), the queue stands right behind it, and
  // the terrace tables live at the back near the wall.
  const CART_SHIFT = 5.5;
  parts.cart.position.z += CART_SHIFT;
  parts.food.position.z += CART_SHIFT;
  parts.ui.position.z += CART_SHIFT;

  // ?cart=<variantId> replaces the fixed counter with a catalog cart type at
  // the same spot, in game perspective — the group lands in parts['cart-<id>']
  // so ?seg=cart-<id> isolates it for the paint-over pipeline and ?painted=1
  // projects its plate back onto it. ?cart=all builds every variant (hidden)
  // for batch capture passes.
  const params = new URLSearchParams(location.search);
  const cartId = params.get('cart');
  if (cartId) {
    const cartMats = makeCartMats();
    const ids = cartId === 'all' ? CART_VARIANTS.map(v => v.id) : [cartId];
    for (const id of ids) {
      const vg = new THREE.Group();
      vg.name = 'cart-' + id;
      const v = createCartVariant(id, cartMats);
      // gameplay decals are not part of the cart — never paint them into a plate
      v.traverse(o => { if (/ring|contactshadow/i.test(o.name)) o.visible = false; });
      const bb = new THREE.Box3().setFromObject(v);
      // deck-height alignment: variant worktop (~y 0.88) lands at counter deck
      // level (y 1.18) so live food/props still sit plausibly on it. ?cs=
      // overrides the scale for tuning per variant. 1A is a small pushcart
      // model (ring/shadow inflate its bbox) so it gets its own scale.
      const SCALE_OVERRIDE = { '1A': 2.55 };
      const s = parseFloat(params.get('cs')) || SCALE_OVERRIDE[id] || 1.34;
      v.scale.setScalar(s);
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      v.position.set(-cx * s, -bb.min.y * s, 0.15 - cz * s);
      vg.add(v);
      vg.visible = id === cartId; // 'all' mode: hidden until ?seg picks one
      vg.position.z = CART_SHIFT;
      parts['cart-' + id] = vg;
      root.add(vg);
    }
    // the variant replaces the counter — its own stations are painted in, so
    // the old counter-positioned food/props get hidden (they'd float mid-air)
    parts.cart.visible = false;
    parts.food.visible = false;
  }

  camera.position.set(0, 6.1, 11.8);
  camera.lookAt(0, 0.85, 0.1);

  // debug: ?nocart=1 hides the food cart (every static prop) to judge the
  // street + customers alone. Customers are added later as Groups, so this
  // only touches the meshes that exist at build time.
  if (new URLSearchParams(location.search).has('nocart')) {
    for (const [k, g] of Object.entries(parts)) if (k !== 'env') g.visible = false;
  }

  // ?seg=<part> isolates one group on a chroma-magenta backdrop for clean-plate
  // captures (paint-over inputs): keyed out later by the plate pipeline.
  // Enforced every frame so late-loading GLBs and spawned sims stay hidden.
  const segOnly = new URLSearchParams(location.search).get('seg');
  if (segOnly) scene.background = new THREE.Color(0xff00ff);

  return {
    scene,
    camera,
    parts,
    get customers() { return queue.map(m => m.api); },
    queue, peds, seats, interact, hooks, mats,
    elapsed: 0,
    update(dt) {
      this.elapsed += dt;
      if (segOnly) for (const [k, g] of Object.entries(parts)) g.visible = (k === segOnly);
      updateQueue(dt);
      for (const m of queue) m.api.update(dt, this.elapsed, lookTarget);
      for (const p of peds) p.update(dt, this.elapsed, null);
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
  };
}

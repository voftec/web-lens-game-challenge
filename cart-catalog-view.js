import * as THREE from './assets/vendor/three.module.js';
import { createStreetCartModel } from './cart-model.js';

function texLabel(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(18,24,28,.88)';
  ctx.beginPath();
  ctx.roundRect(10, 12, 492, 136, 28);
  ctx.fill();
  ctx.fillStyle = '#fff4d7';
  ctx.font = '900 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 70);
  ctx.fillStyle = '#ffd36a';
  ctx.font = '700 30px sans-serif';
  ctx.fillText(subtitle, 256, 116);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeMats() {
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0xbec7ca, metalness: 0.62, roughness: 0.32 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x5d686f, metalness: 0.58, roughness: 0.42 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151719, roughness: 0.82 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x27221f, roughness: 0.9 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xea7623, roughness: 0.52 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb63a2b, roughness: 0.72 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2c6f9f, roughness: 0.62, metalness: 0.22 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xb8dceb, transparent: true, opacity: 0.32, roughness: 0.12, metalness: 0.08 }),
    water: new THREE.MeshStandardMaterial({ color: 0x76aebe, transparent: true, opacity: 0.7, roughness: 0.18 }),
    oil: new THREE.MeshStandardMaterial({ color: 0xd89a27, roughness: 0.3 }),
    sausage: new THREE.MeshStandardMaterial({ color: 0xb15a3d, roughness: 0.72 }),
    grill: new THREE.MeshStandardMaterial({ color: 0x1d2225, metalness: 0.4, roughness: 0.55 }),
    bottleRed: new THREE.MeshStandardMaterial({ color: 0xd9281f, roughness: 0.45 }),
    bottleWhite: new THREE.MeshStandardMaterial({ color: 0xf0e6cf, roughness: 0.5 }),
    bottleYellow: new THREE.MeshStandardMaterial({ color: 0xf5bd24, roughness: 0.5 }),
  };
}

function addBox(parent, w, h, d, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCyl(parent, rTop, rBottom, h, x, y, z, mat, segments = 14) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addTube(parent, ax, ay, bx, by, z, mat) {
  const len = Math.hypot(bx - ax, by - ay);
  const mesh = addCyl(parent, 0.018, 0.018, len, (ax + bx) / 2, (ay + by) / 2, z, mat, 8);
  mesh.rotation.z = -Math.atan2(bx - ax, by - ay);
  return mesh;
}

function addDoors(group, mats, w, d, count) {
  const doorW = w / count - 0.06;
  for (let i = 0; i < count; i++) {
    const x = -w / 2 + w * (i + 0.5) / count;
    addBox(group, doorW, 0.40, 0.025, x, 0.46, d / 2 + 0.018, mats.steelDark);
    addBox(group, 0.10, 0.035, 0.035, x, 0.55, d / 2 + 0.045, mats.black);
  }
}

function addKnobs(group, mats, w, d, count) {
  for (let i = 0; i < count; i++) {
    const x = -w * 0.33 + (count === 1 ? 0 : i * w * 0.33);
    const knob = addCyl(group, 0.045, 0.045, 0.035, x, 0.78, d / 2 + 0.045, mats.black, 16);
    knob.rotation.x = Math.PI / 2;
  }
}

function addWheels(group, mats, w, d) {
  for (const x of [-w * 0.38, w * 0.38]) {
    for (const z of [-d * 0.34, d * 0.34]) {
      const wheel = addCyl(group, 0.065, 0.065, 0.04, x, 0.08, z, mats.rubber, 14);
      wheel.rotation.x = Math.PI / 2;
      addCyl(group, 0.026, 0.026, 0.045, x, 0.08, z + 0.01, mats.orange, 12).rotation.x = Math.PI / 2;
    }
  }
}

function addBainMarie(group, mats, x, z, w = 0.42, d = 0.45, openLid = true) {
  addBox(group, w, 0.10, d, x, 0.95, z, mats.steelDark);
  addBox(group, w - 0.07, 0.025, d - 0.07, x, 1.01, z, mats.water);
  for (let i = 0; i < 3; i++) {
    const sausage = addCyl(group, 0.022, 0.022, w * 0.58, x - w * 0.22 + i * w * 0.22, 1.035, z, mats.sausage, 10);
    sausage.rotation.z = Math.PI / 2;
  }
  if (openLid) {
    const lid = addBox(group, w, 0.035, d, x, 1.18, z - d * 0.42, mats.steel);
    lid.rotation.x = -0.7;
  }
}

function addPlancha(group, mats, x, z, w = 0.48, d = 0.42, hood = true) {
  addBox(group, w, 0.09, d, x, 0.97, z, mats.grill);
  addBox(group, w - 0.05, 0.025, d - 0.05, x, 1.02, z, mats.black);
  for (let i = 0; i < 2; i++) {
    const meat = addCyl(group, 0.09, 0.09, 0.03, x - w * 0.18 + i * w * 0.36, 1.045, z, mats.sausage, 18);
    meat.scale.z = 0.68;
  }
  if (hood) {
    addBox(group, w + 0.05, 0.34, d + 0.02, x, 1.24, z - 0.03, mats.steel);
    addBox(group, w - 0.06, 0.20, 0.035, x, 1.18, z + d * 0.49, mats.steelDark);
  }
}

function addFryer(group, mats, x, z, w = 0.38, d = 0.42) {
  addBox(group, w, 0.12, d, x, 0.97, z, mats.steelDark);
  addBox(group, w - 0.06, 0.025, d - 0.06, x, 1.04, z, mats.oil);
  addBox(group, w * 0.72, 0.10, d * 0.58, x, 1.12, z, mats.steelDark);
  const handle = addCyl(group, 0.018, 0.018, w * 0.72, x + w * 0.44, 1.15, z, mats.black, 8);
  handle.rotation.z = Math.PI / 2;
}

function addGNRow(group, mats, y, z, count, w, colors) {
  for (let i = 0; i < count; i++) {
    const x = -w / 2 + w * (i + 0.5) / count;
    addBox(group, w / count - 0.035, 0.08, 0.18, x, y, z, mats.steelDark);
    addBox(group, w / count - 0.075, 0.025, 0.13, x, y + 0.045, z, colors[i % colors.length]);
  }
}

function addBottles(group, mats, x, z, count) {
  const matsB = [mats.bottleRed, mats.bottleWhite, mats.bottleYellow];
  for (let i = 0; i < count; i++) {
    const px = x + (i - (count - 1) / 2) * 0.13;
    addCyl(group, 0.032, 0.043, 0.20, px, 1.07, z, matsB[i % matsB.length], 12);
    addCyl(group, 0.014, 0.022, 0.055, px, 1.195, z, mats.black, 10);
  }
}

function addGlassCase(group, mats, w, d) {
  for (const x of [-w * 0.43, w * 0.43]) {
    addCyl(group, 0.025, 0.025, 0.68, x, 1.40, -d * 0.25, mats.steelDark, 10);
  }
  addBox(group, w * 0.86, 0.48, 0.05, 0, 1.52, -d * 0.25, mats.glass);
  addBox(group, w * 0.86, 0.48, d * 0.42, 0, 1.52, -d * 0.04, mats.glass);
  addBox(group, w * 0.90, 0.06, d * 0.52, 0, 1.78, -d * 0.04, mats.steel);
}

function addRoof(group, mats, w, d, accent = mats.red) {
  for (const x of [-w * 0.43, w * 0.43]) {
    for (const z of [-d * 0.38, d * 0.38]) {
      addCyl(group, 0.025, 0.025, 1.15, x, 1.48, z, mats.steelDark, 10);
    }
  }
  addBox(group, w * 0.95, 0.12, d * 0.92, 0, 2.07, 0, accent);
  addBox(group, w * 0.99, 0.035, d * 0.98, 0, 2.15, 0, mats.steel);
  const left = addBox(group, w * 0.22, 0.035, d * 0.70, -w * 0.54, 1.90, 0, accent);
  left.rotation.z = -0.28;
  const right = addBox(group, w * 0.22, 0.035, d * 0.70, w * 0.54, 1.90, 0, accent);
  right.rotation.z = 0.28;
}

function createCabinetCart({ name, w, d, doors = 1, knobs = 1, stations = [], case: hasCase = false, roof: hasRoof = false, accent = 'red', sideTable = false, trailer = false }, mats) {
  const group = new THREE.Group();
  group.name = name;
  const accentMat = accent === 'blue' ? mats.blue : mats.red;
  addWheels(group, mats, w, d);
  addBox(group, w, 0.66, d, 0, 0.48, 0, accent === 'blue' ? mats.blue : mats.steel);
  addBox(group, w + 0.05, 0.09, d + 0.05, 0, 0.86, 0, mats.steel);
  addDoors(group, mats, w, d, doors);
  addKnobs(group, mats, w, d, knobs);
  addGNRow(group, mats, 0.90, d / 2 + 0.08, Math.min(5, doors + 3), w * 0.82, [
    mats.bottleYellow, mats.sausage, mats.bottleWhite, mats.orange, mats.oil,
  ]);
  const step = w / (stations.length + 0.4);
  stations.forEach((station, i) => {
    const x = -w / 2 + step * (i + 0.65);
    if (station === 'bain') addBainMarie(group, mats, x, -d * 0.08, step * 0.82, d * 0.55);
    if (station === 'plancha') addPlancha(group, mats, x, -d * 0.08, step * 0.84, d * 0.55, true);
    if (station === 'fryer') addFryer(group, mats, x, -d * 0.08, step * 0.82, d * 0.55);
  });
  addBottles(group, mats, w * 0.43, -d * 0.04, 3);
  if (sideTable) {
    addBox(group, 0.44, 0.07, d * 0.82, w * 0.55, 0.88, 0, mats.steel);
    addTube(group, w * 0.55, 0.84, w * 0.42, 0.38, d * 0.34, mats.steelDark);
  }
  if (trailer) {
    addBox(group, w * 0.92, 0.16, 0.08, 0, 0.28, d * 0.56, accentMat);
    addTube(group, -w * 0.18, 0.28, -w * 0.08, 0.12, d * 0.70, mats.steelDark);
    addTube(group, w * 0.18, 0.28, w * 0.08, 0.12, d * 0.70, mats.steelDark);
    addCyl(group, 0.055, 0.055, 0.08, 0, 0.11, d * 0.72, mats.steelDark, 12).rotation.x = Math.PI / 2;
  }
  if (hasCase) addGlassCase(group, mats, w, d);
  if (hasRoof) addRoof(group, mats, w, d, accentMat);
  return group;
}

function createModuleUnit(name, mats) {
  const group = new THREE.Group();
  group.name = name;
  addBox(group, 0.78, 0.36, 0.54, 0, 0.48, 0, mats.steel);
  addBox(group, 0.84, 0.07, 0.60, 0, 0.70, 0, mats.steelDark);
  addBainMarie(group, mats, 0, 0, 0.66, 0.44, true);
  addKnobs(group, mats, 0.78, 0.54, 1);
  for (const x of [-0.30, 0.30]) {
    for (const z of [-0.18, 0.18]) addCyl(group, 0.025, 0.025, 0.34, x, 0.17, z, mats.steelDark, 10);
  }
  return group;
}

export const CART_VARIANTS = [
  { id: '1A', title: '1A · Tijera', subtitle: '$180 · 45×35 cm' },
  { id: '1B', title: '1B · Gabinete', subtitle: '$235 · 1 puesto' },
  { id: '2A1', title: '2A · Fiestero', subtitle: '$480 · plancha + baño' },
  { id: '2A2', title: '2A · Ensaladera', subtitle: '65×45 · mesa apoyo' },
  { id: '2B', title: '2B · Baño Industrial', subtitle: '40×40 · calibre 18' },
  { id: '2C', title: '2C · Tráiler Azul', subtitle: '200×100 · 2 baños' },
  { id: '3A', title: '3A · Sin Techo', subtitle: '$520 · freidor' },
  { id: '3B1', title: '3B · Con Techo', subtitle: '$660 · 150×60' },
  { id: '3B2', title: '3B · Económico', subtitle: '3 puestos' },
  { id: '3B3', title: '3B · Fiestero', subtitle: 'plancha 40×40' },
  { id: '3B4', title: '3B · Freidor', subtitle: 'plancha + baño' },
  { id: '3C', title: '3C · Doble Freidor', subtitle: 'techo + plancha 40×60' },
];

export function createCartVariant(id, mats) {
  if (id === '1A') {
    const cart = createStreetCartModel();
    cart.scale.setScalar(1.35);
    return cart;
  }
  const config = {
    '1B': { w: 0.82, d: 0.52, doors: 1, knobs: 1, stations: ['bain'] },
    '2A1': { w: 1.18, d: 0.62, doors: 2, knobs: 2, stations: ['plancha', 'bain'] },
    '2A2': { w: 1.22, d: 0.62, doors: 2, knobs: 2, stations: ['plancha', 'bain'], sideTable: true },
    '2C': { w: 1.86, d: 0.78, doors: 2, knobs: 2, stations: ['bain', 'bain'], accent: 'blue', trailer: true },
    '3A': { w: 1.46, d: 0.68, doors: 3, knobs: 3, stations: ['plancha', 'fryer', 'bain'], case: true },
    '3B1': { w: 1.90, d: 0.82, doors: 3, knobs: 3, stations: ['plancha', 'fryer', 'bain'], case: true, roof: true },
    '3B2': { w: 1.42, d: 0.66, doors: 3, knobs: 3, stations: ['plancha', 'bain', 'fryer'] },
    '3B3': { w: 1.34, d: 0.64, doors: 2, knobs: 3, stations: ['plancha', 'bain', 'bain'] },
    '3B4': { w: 1.48, d: 0.68, doors: 3, knobs: 3, stations: ['plancha', 'bain', 'fryer'], case: true },
    '3C': { w: 1.78, d: 0.78, doors: 4, knobs: 4, stations: ['plancha', 'fryer', 'bain', 'fryer'], roof: true, accent: 'blue' },
  }[id];
  return config ? createCabinetCart({ name: id, ...config }, mats) : createModuleUnit(id, mats);
}

export function createCartCatalogView() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x211d18);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
  const mats = makeMats();
  const root = new THREE.Group();
  scene.add(root);

  scene.add(new THREE.HemisphereLight(0xfff0d0, 0x3a2c24, 1.15));
  const key = new THREE.DirectionalLight(0xffe1ae, 1.55);
  key.position.set(-5, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 11),
    new THREE.MeshStandardMaterial({ color: 0x8d7c66, roughness: 0.86 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // group registry for the paint-over pipeline: each cart variant is its own
  // group keyed 'cart-<id>' so it can be isolated (?seg), painted, and
  // projected independently. labels + floor stay live/flat.
  const parts = { labels: new THREE.Group(), floor: new THREE.Group() };
  parts.labels.name = 'labels';
  parts.floor.name = 'floor';
  parts.floor.add(floor);
  root.add(parts.labels, parts.floor);

  const positions = [];
  for (let i = 0; i < CART_VARIANTS.length; i++) {
    positions.push([i % 2 === 0 ? -1.15 : 1.15, -4.15 + Math.floor(i / 2) * 1.62]);
  }
  CART_VARIANTS.forEach((variant, i) => {
    const [x, z] = positions[i];
    const cart = createCartVariant(variant.id, mats);
    cart.name = 'cart-' + variant.id;
    parts['cart-' + variant.id] = cart;
    cart.scale.multiplyScalar(0.60);
    cart.rotation.x = -0.48;
    cart.position.set(x, 0, z);
    root.add(cart);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.62, 0.51),
      new THREE.MeshBasicMaterial({ map: texLabel(variant.title, variant.subtitle), transparent: true })
    );
    label.position.set(x, 0.04, z + 0.72);
    label.rotation.x = -Math.PI / 2;
    parts.labels.add(label);
  });

  camera.up.set(0, 0, -1);
  camera.position.set(0, 10.0, 0.15);
  camera.lookAt(0, 0, 0.15);
  return {
    scene,
    camera,
    parts,
    root,
    resize(width, height) {
      const aspect = width / Math.max(1, height);
      const viewHeight = Math.max(10.4, 4.3 / aspect);
      camera.left = -viewHeight * aspect / 2;
      camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    },
  };
}

import * as THREE from './assets/vendor/three.module.js';

export const CART_POSITION = { xPx: 604, yPx: 168 };

function createCartSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5e7bd';
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#d93624' : '#ffd447';
    ctx.fillRect(i * 32, 0, 32, 34);
    ctx.fillRect(i * 32, 94, 32, 34);
  }
  ctx.fillStyle = '#7f1d1d';
  ctx.font = '900 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HOT DOG', 128, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStreetCartModel() {
  const group = new THREE.Group();
  group.name = 'PlayerCart';

  const materials = {
    steel: new THREE.MeshStandardMaterial({ color: 0xbfc6c9, metalness: 0.58, roughness: 0.32 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x737d82, metalness: 0.62, roughness: 0.42 }),
    black: new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.8 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x26221f, roughness: 0.94 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xe97822, roughness: 0.55 }),
    water: new THREE.MeshStandardMaterial({ color: 0x7fb2bd, roughness: 0.22, metalness: 0.08, transparent: true, opacity: 0.72 }),
    sausage: new THREE.MeshStandardMaterial({ color: 0xb76445, roughness: 0.72 }),
    bread: new THREE.MeshStandardMaterial({ color: 0xe3b76a, roughness: 0.78 }),
    trayRed: new THREE.MeshStandardMaterial({ color: 0xa84d3f, roughness: 0.74 }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x14120e, transparent: true, opacity: 0.23, depthWrite: false }),
  };

  const addBox = (name, w, h, d, x, y, z, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const addCylinder = (name, rTop, rBottom, height, x, y, z, material, radial = 12) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, radial), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const addTube = (name, ax, ay, bx, by, z, material) => {
    const dx = bx - ax, dy = by - ay;
    const mesh = addCylinder(name, 0.014, 0.014, Math.hypot(dx, dy), (ax + bx) / 2, (ay + by) / 2, z, material, 8);
    mesh.rotation.z = -Math.atan2(dx, dy);
    return mesh;
  };

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.68, 28), materials.shadow);
  shadow.name = 'CartContactShadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  const positionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.54, 0.64, 32),
    new THREE.MeshBasicMaterial({ color: 0xffca3a, transparent: true, opacity: 0.48, side: THREE.DoubleSide })
  );
  positionRing.name = 'CartPositionRing';
  positionRing.rotation.x = -Math.PI / 2;
  positionRing.position.y = 0.026;
  group.add(positionRing);

  for (const z of [-0.18, 0.18]) {
    addTube('ScissorTube', -0.31, 0.08, 0.29, 0.55, z, materials.black);
    addTube('ScissorTube', 0.31, 0.08, -0.29, 0.55, z, materials.black);
  }

  for (const x of [-0.29, 0.29]) {
    for (const z of [-0.18, 0.18]) {
      const wheel = addCylinder('CartWheel', 0.055, 0.055, 0.035, x, 0.07, z, materials.rubber, 14);
      wheel.rotation.x = Math.PI / 2;
      addCylinder('WheelHub', 0.02, 0.02, 0.04, x, 0.07, z + 0.002, materials.orange, 10).rotation.x = Math.PI / 2;
    }
  }

  addBox('LowerSteelCabinet', 0.64, 0.34, 0.39, 0, 0.43, 0, materials.steel);
  addBox('FrontInset', 0.56, 0.23, 0.018, 0, 0.43, 0.202, materials.steelDark);
  addBox('TopCounter', 0.72, 0.075, 0.48, 0, 0.64, 0, materials.steel);
  addBox('PrepBoard', 0.25, 0.035, 0.36, -0.18, 0.70, 0.02, materials.trayRed);
  addBox('BainMarieWell', 0.29, 0.10, 0.34, 0.18, 0.70, 0.00, materials.steelDark);
  addBox('BainMarieWater', 0.24, 0.018, 0.29, 0.18, 0.756, 0.00, materials.water);

  for (let i = 0; i < 4; i++) {
    const sausage = addCylinder('SteamedSausage', 0.019, 0.019, 0.20, 0.11 + i * 0.045, 0.775, 0, materials.sausage, 10);
    sausage.rotation.z = Math.PI / 2;
  }

  const lid = addBox('OpenBainMarieLid', 0.31, 0.025, 0.35, 0.18, 0.87, -0.17, materials.steel);
  lid.rotation.x = -0.72;
  addBox('LidHandle', 0.12, 0.025, 0.035, 0.18, 0.98, -0.27, materials.black);

  for (let i = 0; i < 3; i++) {
    addBox('ToppingInsert', 0.12, 0.055, 0.12, -0.23 + i * 0.14, 0.715, 0.20, materials.steelDark);
  }

  const bun = addCylinder('HotDogBun', 0.045, 0.045, 0.24, -0.18, 0.755, 0.02, materials.bread, 12);
  bun.rotation.z = Math.PI / 2;
  const dog = addCylinder('HotDogSausage', 0.018, 0.018, 0.26, -0.18, 0.79, 0.02, materials.sausage, 10);
  dog.rotation.z = Math.PI / 2;

  addBox('BottleTray', 0.13, 0.045, 0.42, 0.43, 0.66, 0, materials.steel);
  const sauceColors = [0xe72d1f, 0xf3e7c2, 0xffc824];
  sauceColors.forEach((color, i) => {
    const bottleMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const z = -0.14 + i * 0.14;
    addCylinder('SqueezeBottle', 0.028, 0.035, 0.16, 0.43, 0.76, z, bottleMat, 12);
    addCylinder('BottleCap', 0.012, 0.018, 0.045, 0.43, 0.86, z, materials.black, 10);
  });

  addTube('PushHandleA', 0.36, 0.62, 0.49, 0.84, -0.20, materials.steelDark);
  addTube('PushHandleB', 0.36, 0.62, 0.49, 0.84, 0.20, materials.steelDark);
  const handle = addCylinder('PushHandleGrip', 0.018, 0.018, 0.40, 0.49, 0.84, 0, materials.black, 10);
  handle.rotation.x = Math.PI / 2;

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.27),
    new THREE.MeshStandardMaterial({ map: createCartSignTexture(), roughness: 0.7 })
  );
  sign.name = 'CartFrontSign';
  sign.position.set(0, 0.39, 0.213);
  sign.castShadow = true;
  group.add(sign);

  return group;
}

export function buildStreetCart(world, { px, pz }) {
  const group = createStreetCartModel();
  group.position.set(px(CART_POSITION.xPx), 0.18, pz(CART_POSITION.yPx));
  world.add(group);
  return group;
}

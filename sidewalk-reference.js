import * as THREE from './assets/vendor/three.module.js';

// Image coordinates in Diego's 1024×457 overhead reference. The curb is a
// continuous edge: the irregular objects beside the wall remain inside it.
export const STREET_EDGE = [
  [-340, 190], [48, 190], [110, 190], [195, 191], [258, 191],
  [330, 192], [418, 194], [505, 195], [586, 196], [674, 196],
  // The curb under the canopy is estimated, but the broad edge remains flat.
  [740, 197], [780, 197], [810, 196], [840, 195],
  [858, 193], [874, 188], [887, 182], [898, 174], [908, 165],
  [918, 155], [928, 145], [936, 135], [941, 126], [942, -80],
];
export const SIDEWALK_POLYGON = [
  [-340, 138], [48, 138], [48, 122], [195, 122], [195, 138],
  [905, 138], [905, -80], ...STREET_EDGE.slice().reverse(),
];
export const LANDMARKS = {
  tree: [720, 118],
  yellow: [
    [790, 160], [817, 158], [828, 164], [832, 176],
    [830, 193], [818, 198], [800, 197], [790, 189], [786, 170],
  ],
  wallCorner: [905, 138],
  sideStreetCurb: [942, 123],
};

// Low remains of the old stall frontage. They sit inside the broad sidewalk;
// they do not cut into the street edge.
export const STALL_REMNANTS = [
  { x1: 505, y1: 143, x2: 560, y2: 192, color: 0xa96352 },
  { x1: 580, y1: 142, x2: 622, y2: 190, color: 0x8b8172 },
  { x1: 635, y1: 143, x2: 674, y2: 190, color: 0x9b6d57 },
];

function path(ctx, points, tx, ty) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(tx(x), ty(y)) : ctx.moveTo(tx(x), ty(y)));
  ctx.closePath();
}

export function paintReferenceSidewalk(ctx, tx, ty) {
  ctx.save();
  path(ctx, SIDEWALK_POLYGON, tx, ty);
  ctx.fillStyle = '#c9b99e';
  ctx.fill();
  ctx.clip();
  const patches = [
    { color: '#cf9c80', points: [[52,124],[195,124],[195,191],[52,191]] },
    { color: '#b7b1a5', points: [[330,140],[418,140],[418,192],[330,192]] },
    { color: '#ce9780', points: [[505,140],[560,140],[560,192],[505,192]] },
    { color: '#938878', points: [[580,140],[622,140],[622,190],[580,190]] },
    { color: '#a9765d', points: [[635,140],[674,140],[674,190],[635,190]] },
    { color: '#c5bba5', points: [[690,138],[790,138],[790,196],[690,196]] },
    { color: '#dbbf64', points: LANDMARKS.yellow },
    { color: '#d5d0bd', points: [[838,156],[858,156],[858,187],[838,187]] },
  ];
  for (const patch of patches) {
    path(ctx, patch.points, tx, ty);
    ctx.fillStyle = patch.color;
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(99,89,74,0.3)';
  ctx.lineWidth = 1;
  for (const x of [195,330,418,505,560,580,622,635,674,690,790,835,880]) {
    ctx.beginPath();
    ctx.moveTo(tx(x), ty(138));
    ctx.lineTo(tx(x), ty(198));
    ctx.stroke();
  }
  ctx.restore();
}

export function buildReferenceSidewalk(world, { px, pz }) {
  const group = new THREE.Group();
  group.name = 'TracedSidewalk';
  const shape = new THREE.Shape();
  SIDEWALK_POLYGON.forEach(([x, y], i) =>
    i ? shape.lineTo(px(x), -pz(y)) : shape.moveTo(px(x), -pz(y)));
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const positions = geometry.attributes.position, uv = geometry.attributes.uv;
  const minX = px(-340), maxX = px(944), minZ = pz(-80), maxZ = pz(198);
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, (positions.getX(i) - minX) / (maxX - minX),
      (maxZ + positions.getY(i)) / (maxZ - minZ));
  }
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  paintReferenceSidewalk(canvas.getContext('2d'),
    x => (x + 340) / 1284 * canvas.width,
    y => (y + 80) / 278 * canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    map: texture, roughness: 0.96,
  }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.18;
  top.receiveShadow = true;
  top.name = 'TracedSidewalkSurface';
  group.add(top);

  for (const pad of STALL_REMNANTS) {
    const material = new THREE.MeshStandardMaterial({ color: pad.color, roughness: 0.92 });
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(px(pad.x2) - px(pad.x1)), 0.07, Math.abs(pz(pad.y2) - pz(pad.y1))),
      material,
    );
    mesh.position.set((px(pad.x1) + px(pad.x2)) / 2, 0.215, (pz(pad.y1) + pz(pad.y2)) / 2);
    mesh.receiveShadow = true;
    mesh.name = 'StallFrontageRemainder';
    group.add(mesh);
  }

  const vertices = [];
  for (let i = 1; i < STREET_EDGE.length; i++) {
    const a = STREET_EDGE[i - 1], b = STREET_EDGE[i];
    const ax = px(a[0]), az = pz(a[1]), bx = px(b[0]), bz = pz(b[1]);
    vertices.push(ax,0,az, bx,0,bz, bx,0.18,bz,
      ax,0,az, bx,0.18,bz, ax,0.18,az);
  }
  const curbGeometry = new THREE.BufferGeometry();
  curbGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  curbGeometry.computeVertexNormals();
  const curb = new THREE.Mesh(curbGeometry, new THREE.MeshStandardMaterial({
    color: 0x9d9482, roughness: 1, side: THREE.DoubleSide,
  }));
  curb.name = 'TracedStreetCurb';
  group.add(curb);
  world.add(group);
  return group;
}

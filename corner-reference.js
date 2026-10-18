import * as THREE from './assets/vendor/three.module.js';

// Coordinates remain registered to the supplied 1024×457 overhead crop.
// Heights and metric scale are estimates; the photographs are not a survey.
export function buildReferenceCorner(world, { px, pz, pm }) {
  const materials = {
    red: new THREE.MeshStandardMaterial({ color: 0x873b32, roughness: 0.85 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xe5ddc9, roughness: 0.85 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xf3f0e6, roughness: 0.92 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x182324, roughness: 0.5 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x75664b, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x617b43, roughness: 1, side: THREE.DoubleSide }),
  };
  const corner = new THREE.Group();
  corner.name = 'ReferenceCorner';
  world.add(corner);
  function box(w, h, d, x, y, z, material, parent = corner) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Broad, low commercial frontage visible opposite the yellow corner.
  const left = px(998), right = px(1185);
  const back = pz(78), front = pz(148);
  const width = right - left, depth = front - back;
  const cx = (left + right) / 2, cz = (front + back) / 2;
  box(width, 4.4, depth, cx, 2.2, cz, materials.red);
  box(width + 0.25, 0.22, depth + 0.25, cx, 4.51, cz, materials.roof);
  box(width, 0.68, 0.22, cx, 4.85, back, materials.red);
  // White cornice and fascia, with recessed dark storefront bays.
  box(width + 0.3, 0.24, 0.45, cx, 3.58, front + 0.12, materials.cream);
  box(width, 0.12, 0.26, cx, 2.98, front + 0.16, materials.cream);
  const bays = 4;
  for (let i = 0; i < bays; i++) {
    const x = left + width * (i + 0.5) / bays;
    box(width / bays - 0.7, 2.65, 0.12, x, 1.38, front + 0.03, materials.glass);
    box(0.18, 2.85, 0.28, x - width / bays / 2 + 0.25, 1.45, front + 0.18, materials.cream);
  }
  // Side elevation visible across the narrow side street.
  box(0.22, 0.24, depth, left - 0.08, 3.58, cz, materials.cream);
  box(0.2, 0.12, depth, left - 0.08, 2.98, cz, materials.cream);
  const apron = box(width + 1, 0.15, pm(36), cx, 0.075, pz(168), materials.red);
  apron.name = 'CommercialFrontApron';

  function palm(x, z, height, phase) {
    const group = new THREE.Group();
    group.name = 'ReferencePalm';
    group.position.set(px(x), 0, pz(z));
    corner.add(group);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.31, height, 9), materials.trunk);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    group.add(trunk);
    for (let i = 0; i < 11; i++) {
      const angle = phase + i * Math.PI * 2 / 11;
      const length = 3.1 + 0.4 * Math.sin(i * 2.4);
      const vertices = [], indices = [];
      for (let j = 0; j <= 9; j++) {
        const t = j / 9;
        const radius = length * t;
        const y = height + 1.8 * Math.sin(t * Math.PI * 0.85) - 1.1 * t;
        const half = 0.48 * Math.sin(Math.PI * t);
        for (const side of [-1, 1]) {
          vertices.push(
            Math.cos(angle) * radius - Math.sin(angle) * half * side,
            y - half * 0.4,
            Math.sin(angle) * radius + Math.cos(angle) * half * side,
          );
        }
        if (j < 9) {
          const n = j * 2;
          indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const frond = new THREE.Mesh(geometry, materials.leaf);
      frond.castShadow = true;
      group.add(frond);
    }
  }
  // Three distinct palm crowns visible on the foreground terrace.
  palm(1012, 172, 4.3, 0.2);
  palm(1053, 178, 3.8, 0.9);
  palm(1130, 174, 4.9, 0.5);

  // Pale low utility cabinet visible on the yellow corner, not a building.
  const cabinet = box(pm(6), 1.15, pm(5), px(847), 0.575, pz(166), materials.cream);
  cabinet.name = 'CornerUtilityCabinet';
  return corner;
}

export function buildLandmarkTree(world, { px, pz, pm }) {
  const tree = new THREE.Group();
  tree.name = 'CornerLandmarkTree';
  tree.position.set(px(720), 0, pz(118));
  world.add(tree);
  const bark = new THREE.MeshStandardMaterial({ color: 0x756f59, roughness: 1 });
  const radius = pm(112) / 2;
  // Branching trunk close to the wall; its broad canopy extends over it.
  for (const [x, z, lean] of [[-0.5, 0, -0.12], [0.25, 0.2, 0.14], [0.6, -0.3, 0.22]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, 5.2, 9), bark);
    trunk.position.set(x, 2.6, z);
    trunk.rotation.z = lean;
    trunk.castShadow = true;
    tree.add(trunk);
  }
  const foliage = [0x506b36, 0x677e3b, 0x778546, 0x465f30].map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 15; i++) {
    const angle = i * 2.39996;
    const r = radius * 0.58 * Math.sqrt(i / 14);
    const crown = new THREE.Mesh(geometry, foliage[i % foliage.length]);
    crown.position.set(Math.cos(angle) * r, 6.2 + 0.8 * Math.sin(i * 1.7), Math.sin(angle) * r);
    crown.scale.set(radius * 0.43, 1.5 + 0.25 * Math.cos(i), radius * 0.36);
    crown.castShadow = true;
    tree.add(crown);
  }
  return tree;
}

// painted-style.js — "paint-over" pipeline for the prep view.
//
// Each painted segment gets its own hand-painted plate (generated offline from
// an isolated flat render, ?seg=<name>). At runtime we swap the segment's
// materials for a screen-space projection material: every fragment samples the
// plate at its own pixel, so the painting hugs the geometry exactly — real
// depth, real occlusion, no UV baking, no perspective distortion. Moving and
// interactive parts (food, stools, chars, order card) stay live 3D on top.
//
// Camera is fixed in this view, so gl_FragCoord projection is equivalent to a
// frozen view-projection matrix — simpler and exact.
import * as THREE from './assets/vendor/three.module.js';

const PAINTED = ['env', 'cart', 'tables'];
const PLATE_DIR = './assets/painted/';

function loadPlate(name) {
  return new Promise((res, rej) => {
    new THREE.TextureLoader().load(PLATE_DIR + name + '.png', (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      res(t);
    }, undefined, rej);
  });
}

// MeshBasicMaterial patched to sample its map in screen space.
// transparent:true — plate pixels with alpha=0 (keyed-out background) let
// whatever is behind show through (e.g. the painted env plate).
function projectedMaterial(tex, resUniform) {
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRes = resUniform;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uRes;')
      .replace('#include <map_fragment>', `
        vec2 puv = gl_FragCoord.xy / uRes;
        diffuseColor *= texture2D(map, puv);
      `);
  };
  m.customProgramCacheKey = () => 'painted-proj';
  return m;
}

// Apply painted plates to the painted segments of a prep view.
// env additionally becomes the scene background (fills frame edges) and its
// meshes are hidden — nothing ever occludes the backdrop anyway, and the plate
// is already pixel-registered to it.
export async function applyPaintedStyle(pv, { groups = PAINTED, canvas } = {}) {
  const size = new THREE.Vector2();
  const resUniform = { value: size };
  const c = canvas || document.querySelector('canvas');
  // read drawingBuffer size lazily: renderer.setSize() hasn't run yet when this
  // is called, so canvas.width is still the 300px default until the first
  // awaited plate resolves.
  const syncSize = () => size.set(c.width, c.height);

  for (const name of groups) {
    const grp = pv.parts && pv.parts[name];
    if (!grp) continue;
    const tex = await loadPlate(name).catch(() => null);
    if (!tex) continue;
    syncSize();
    if (name === 'env') {
      pv.scene.background = tex;
      grp.visible = false;
      continue;
    }
    grp.traverse((o) => {
      if (!o.isMesh) return;
      o.material = projectedMaterial(tex, resUniform);
      o.castShadow = false;
      o.receiveShadow = false;
    });
  }
  return resUniform; // caller may update on resize
}

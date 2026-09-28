// Static batching: merge the meshes of static groups (hand-built landmarks, bridges) into one mesh per material per
// map block. A landmark built from 10 materials costs 10 draw calls (twice with shadows); after batching, every
// landmark in a block shares those calls. Blocks keep frustum culling coarse but effective. Transparent meshes stay
// as they are (they need per-object sorting), and so does anything a caller marks with userData.dynamic.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function batchStatic(scene, roots, { size = 400, name = 'static batch' } = {}) {
  const buckets = new Map(), victims = [];
  const box = new THREE.Box3(), c = new THREE.Vector3();
  for (const root of roots) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
      if (o.material.transparent || o.userData.dynamic || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
      const g = o.geometry;
      const attrs = Object.keys(g.attributes).sort().join(',');
      box.setFromObject(o).getCenter(c);
      const key = `${o.material.uuid}|${attrs}|${g.index ? 'i' : 'n'}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${Math.floor(c.x / size)},${Math.floor(c.z / size)}`;
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
      const w = g.clone().applyMatrix4(o.matrixWorld);
      buckets.get(key).geos.push(w);
      victims.push(o);
    });
  }
  for (const o of victims) o.removeFromParent();
  const group = new THREE.Group();
  group.name = name;
  let meshes = 0;
  for (const b of buckets.values()) {
    const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.cast; m.receiveShadow = b.receive;
    m.matrixAutoUpdate = false;
    group.add(m); meshes++;
    for (const gg of b.geos) if (gg !== merged) gg.dispose();
  }
  scene.add(group);
  return { group, before: victims.length, after: meshes };
}

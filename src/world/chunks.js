// Static instanced props split into spatial chunks, so frustum culling (camera and shadow camera)
// can skip whole chunks instead of drawing every instance in the city.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _s = new THREE.Vector3();

// items: { x, y?, z, rot?, s?: number | Vector3 }
export function chunkedInstances(geo, mat, items, { size = 140, shadow = false, receive = true, colors = null, y = 0 } = {}) {
  const group = new THREE.Group();
  const buckets = new Map();
  items.forEach((it, i) => {
    const k = `${Math.floor(it.x / size)},${Math.floor(it.z / size)}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push([it, i]);
  });
  for (const list of buckets.values()) {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([it, i], j) => {
      const sc = it.s === undefined ? 1 : it.s;
      if (typeof sc === 'number') _s.setScalar(sc); else _s.copy(sc);
      _q.setFromAxisAngle(_up, it.rot || 0);
      mesh.setMatrixAt(j, _m.compose(_p.set(it.x, it.y ?? y, it.z), _q, _s));
      if (colors) mesh.setColorAt(j, colors(it, i));
    });
    mesh.computeBoundingSphere();
    mesh.castShadow = shadow; mesh.receiveShadow = receive;
    group.add(mesh);
  }
  return group;
}

// Static instanced props split into spatial chunks, so frustum culling (camera and shadow camera)
// can skip whole chunks instead of drawing every instance in the city.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _s = new THREE.Vector3();

// items: { x, y?, z, rot?, s?: number | Vector3 }
// Block size follows the mesh weight: every block is a draw call (twice with shadows), so tiny props (bins, bollards,
// lamp parts: a few dozen vertices) use big blocks, while heavy meshes such as trees use small ones so off-screen
// instances are culled rather than drawn.
export function chunkedInstances(geo, mat, items, { size = null, shadow = false, receive = true, colors = null, y = 0 } = {}) {
  if (size === null) size = geo.attributes.position.count > 300 ? 250 : 600;
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
    // static: skip recomposing the (identity) local matrix every frame in the scene-graph update
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  group.matrixAutoUpdate = false;
  return group;
}

// ---------- per-instance culling for heavy props (trees) ----------
// A tree is ~1-2.5k triangles, so drawing whole blocks wastes a lot: a 250 m block half in view draws every tree in
// it, and the shadow pass (which covers ~100 m round the player) drew whole blocks too. Here each set of items gets
// two instanced meshes per part: one for the camera, packed each frame with just the items in view, and one for the
// shadow map, packed with just the items inside the shadow camera's box. Two draw calls per part in all, however big
// the map, and the triangles drawn follow what is on screen.
const packs = [];
const _f = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();

// items: { x, y?, z, rot?, s?: number }; parts: [{ geometry, material }]. Returns { meshes } to add to the scene.
// colors: optional (item) => THREE.Color, a per-instance tint (multiplies the material colour)
export function packedInstances(items, parts, { y = 0, colors = null } = {}) {
  let r = 0, cy = 0;
  for (const p of parts) {
    p.geometry.computeBoundingSphere();
    const bs = p.geometry.boundingSphere;
    r = Math.max(r, bs.radius + Math.hypot(bs.center.x, bs.center.z)); cy = Math.max(cy, bs.center.y);
  }
  const mats = new Float32Array(items.length * 16), spheres = [];
  items.forEach((it, i) => {
    const sc = it.s === undefined ? 1 : it.s;
    _q.setFromAxisAngle(_up, it.rot || 0);
    _m.compose(_p.set(it.x, it.y ?? y, it.z), _q, _s.setScalar(sc)).toArray(mats, i * 16);
    spheres.push({ x: it.x, y: (it.y ?? y) + cy * sc, z: it.z, r: r * sc });
  });
  const pack = { mats, spheres, view: [], shadow: [], cols: null };
  if (colors) { pack.cols = new Float32Array(items.length * 3); items.forEach((it, i) => colors(it).toArray(pack.cols, i * 3)); }
  for (const { geometry, material } of parts) {
    const view = new THREE.InstancedMesh(geometry, material, items.length);
    view.castShadow = false; view.receiveShadow = true;
    const shadow = new THREE.InstancedMesh(geometry, material, items.length);
    shadow.castShadow = true; shadow.receiveShadow = false;
    shadow.visible = false; // only switched on for the shadow pass (see installShadowOnly)
    if (pack.cols) view.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 3), 3);
    for (const m of [view, shadow]) { m.count = 0; m.frustumCulled = false; m.matrixAutoUpdate = false; }
    pack.view.push(view); pack.shadow.push(shadow);
  }
  packs.push(pack);
  pack.meshes = [...pack.view, ...pack.shadow];
  return pack;
}
export function removePack(pack) { const i = packs.indexOf(pack); if (i >= 0) packs.splice(i, 1); }

function fill(meshes, pack, frustum, show) {
  const arr = meshes[0].instanceMatrix.array, cols = show && pack.cols ? meshes[0].instanceColor.array : null;
  let n = 0;
  pack.spheres.forEach((s, i) => {
    _sph.center.set(s.x, s.y, s.z); _sph.radius = s.r;
    if (!frustum.intersectsSphere(_sph)) return;
    arr.set(pack.mats.subarray(i * 16, i * 16 + 16), n * 16);
    if (cols) cols.set(pack.cols.subarray(i * 3, i * 3 + 3), n * 3);
    n++;
  });
  meshes.forEach((m, k) => {
    if (k) m.instanceMatrix.array.set(arr.subarray(0, n * 16));
    if (cols) { if (k) m.instanceColor.array.set(cols.subarray(0, n * 3)); m.instanceColor.clearUpdateRanges(); m.instanceColor.addUpdateRange(0, n * 3); m.instanceColor.needsUpdate = true; }
    m.count = n; if (show) m.visible = n > 0; // an empty instanced mesh would still cost a draw call
    m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, n * 16); m.instanceMatrix.needsUpdate = true;
  });
}
// Once a frame, after the camera has moved: camera = the view camera, shadowCamera = the sun's shadow camera.
export function cullInstances(camera, shadowCamera) {
  if (!packs.length) return;
  camera.updateMatrixWorld();
  _f.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const p of packs) fill(p.view, p, _f, true);
  // the shadow camera's matrices are last frame's (they are updated inside the shadow pass): it moves a few cm a
  // frame, well inside the items' bounding spheres
  _f.setFromProjectionMatrix(_pm.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse));
  for (const p of packs) fill(p.shadow, p, _f, false);
}
// Shadow-only meshes stay hidden in the main pass and are shown just while the shadow map is drawn. (three's shadow
// pass tests layers against the main camera, so layers can't separate them; the main render list is built before
// the shadow pass, which walks the scene again, so visibility can.)
export function installShadowOnly(renderer) {
  const sm = renderer.shadowMap, render = sm.render.bind(sm);
  sm.render = (...a) => {
    for (const p of packs) for (const m of p.shadow) m.visible = m.count > 0;
    render(...a);
    for (const p of packs) for (const m of p.shadow) m.visible = false;
  };
}

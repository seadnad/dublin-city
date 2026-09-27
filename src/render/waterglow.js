// Night reflections on the Liffey and the docks: a soft, rippled streak under each bright light, stretched
// across the water towards the camera (the way real reflections line up with the viewer). Additive quads at
// water level; the quays hide any part that runs under the land, so no clipping is needed.
import * as THREE from 'three';

function streakTexture() {
  const w = 32, h = 128, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  // broken horizontal ripple bands, brightest at the source end (top), fading across the water
  const bands = new Float32Array(h);
  for (let y = 0; y < h; y++) bands[y] = Math.random() < 0.55 ? 0.35 + Math.random() * 0.65 : 0.08;
  for (let y = 0; y < h; y++) {
    const along = Math.pow(1 - y / h, 1.6);
    for (let x = 0; x < w; x++) {
      const across = Math.exp(-Math.pow((x + 0.5 - w / 2) / (w * 0.22), 2));
      const a = along * across * bands[y];
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.min(255, a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// sources: [{ x, z, y (water level), color, width, length }]
export function buildWaterGlow(scene, sources) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2); // lies flat; local +z runs from the light across the water
  const mat = new THREE.MeshBasicMaterial({
    map: streakTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, sources.length));
  mesh.count = sources.length;
  sources.forEach((s, i) => mesh.setColorAt(i, new THREE.Color(s.color).multiplyScalar(2.2))); // over 1: additive, so brighter streaks
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 2;
  scene.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
  let level = 0;
  return {
    count: sources.length,
    setLevel(l) { level = l; mat.opacity = l; mesh.visible = l > 0.01 && sources.length > 0; },
    update(camera) {
      if (!mesh.visible) return;
      const cx = camera.position.x, cz = camera.position.z;
      sources.forEach((s, i) => {
        let dx = cx - s.x, dz = cz - s.z;
        const d = Math.hypot(dx, dz) || 1;
        dx /= d; dz /= d;
        const L = Math.min(s.length, d * 0.9); // never reach past the viewer
        q.setFromAxisAngle(up, Math.atan2(dx, dz));
        p.set(s.x + dx * L / 2, s.y, s.z + dz * L / 2);
        mesh.setMatrixAt(i, m.compose(p, q, sc.set(s.width, 1, L)));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

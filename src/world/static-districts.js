// Defer shader work for static scenery that is wholly beyond the starting view.
// The street/ground, building silhouettes and collision world stay present from the first frame.
import * as THREE from 'three';

const box = new THREE.Box3(), centre = new THREE.Vector3(), size = new THREE.Vector3();
const afterFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const materials = (o) => Array.isArray(o.material) ? o.material : [o.material];

export function createStaticDistricts(scene, roots, start, { exclude = [] } = {}) {
  scene.updateMatrixWorld(true);
  const excluded = new Set(exclude), records = [], usedNear = new Set();
  for (const root of roots) {
    if (excluded.has(root)) continue;
    root.traverse((o) => {
      if ((!o.isMesh && !o.isLine && !o.isPoints) || o.isInstancedMesh || !o.material || !o.geometry || o.userData.dynamic) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      box.setFromObject(o);
      if (box.isEmpty()) return;
      box.getCenter(centre); box.getSize(size);
      const distance = Math.hypot(centre.x - start.x, centre.z - start.z);
      const extent = Math.hypot(size.x, size.z) / 2;
      const far = distance - extent > 760 && extent < 300 && !/loading silhouette/i.test(o.name);
      const record = { object: o, x: centre.x, z: centre.z, extent };
      records.push({ ...record, far });
      if (!far) for (const m of materials(o)) usedNear.add(m.uuid);
    });
  }
  // Shared materials are already warm at the start; only defer materials unique to distant scenery.
  const pending = records.filter((r) => r.far && materials(r.object).every((m) => !usedNear.has(m.uuid)));
  for (const r of pending) r.object.visible = false;
  let active = 0, streaming = null, warmChain = Promise.resolve();
  const inflight = new Map();

  async function reveal(r, renderer, camera, getTarget) {
    active++;
    try {
      // Compile with the real scene's lights before the object can enter a rendered frame.
      // A temporary clone leaves the original hidden throughout shader preparation.
      if (renderer.compileAsync) {
        const probe = r.object.clone(false);
        probe.visible = true;
        const prev = renderer.getRenderTarget();
        let compilation;
        try { renderer.setRenderTarget(getTarget()); compilation = renderer.compileAsync(probe, camera, scene); }
        finally { renderer.setRenderTarget(prev); }
        await compilation;
      }
      r.object.visible = true;
    } finally { active--; }
  }
  function warm(r, renderer, camera, getTarget) {
    const work = warmChain.then(() => reveal(r, renderer, camera, getTarget));
    warmChain = work.catch(() => {});
    inflight.set(r, work);
    return work.finally(() => inflight.delete(r));
  }
  const score = (r, p) => {
    const lead = Math.min(450, Math.max(0, p.speed || 0) * 18);
    const px = p.x + Math.sin(p.heading || 0) * lead, pz = p.z + Math.cos(p.heading || 0) * lead;
    return Math.hypot(r.x - p.x, r.z - p.z) + 0.4 * Math.hypot(r.x - px, r.z - pz);
  };
  function startStreaming(renderer, camera, getTarget, getDrive) {
    if (streaming) return streaming;
    streaming = (async () => {
      while (pending.length) {
        await afterFrame();
        if (!pending.length) break; // a teleport may have warmed the last queued objects
        const drive = getDrive();
        pending.sort((a, b) => score(a, drive) - score(b, drive));
        const r = pending.shift();
        try { await warm(r, renderer, camera, getTarget); }
        catch (e) { r.object.visible = true; console.warn('static district shader warm-up failed', e); }
        // Give play several frames before preparing another distant shader.
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    })();
    return streaming;
  }
  async function warmNear(x, z, radius, renderer, camera, getTarget) {
    // Teleport waits for its destination instead of showing missing landmark detail.
    const near = pending.filter((r) => Math.hypot(r.x - x, r.z - z) - r.extent < radius);
    near.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
    for (const r of near) {
      const i = pending.indexOf(r);
      if (i < 0) continue;
      pending.splice(i, 1);
      await afterFrame();
      try { await warm(r, renderer, camera, getTarget); }
      catch (e) { r.object.visible = true; console.warn('destination shader warm-up failed', e); }
    }
    await Promise.allSettled([...inflight].filter(([r]) => Math.hypot(r.x - x, r.z - z) - r.extent < radius).map(([, work]) => work));
  }
  return { get pendingDistricts() { return pending.length + active; },
    pendingNear(x, z, radius = 650) { return pending.filter((r) => Math.hypot(r.x - x, r.z - z) - r.extent < radius).length; },
    startStreaming, warmNear };
}

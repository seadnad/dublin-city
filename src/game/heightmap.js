// City height field for the helicopter: the tallest solid surface in each ~1.2 m cell of the map, so flight can land
// on roofs and bounce off buildings, spires and trees without per-landmark collision shapes.
//
// It is captured once, the first time someone flies (nobody else pays for it): the static world is drawn from
// straight above with an orthographic camera and a depth-only material, and the depth is read back. Orthographic
// depth is linear in height, and three's RGBA depth packing keeps it to a few millimetres in an 8-bit target
// (which every WebGL device can render to). Heights are kept as centimetres in an Int16Array (~7 MB).
import * as THREE from 'three';

const TOP = 400, NEAR = 1, FAR = 430; // camera height and depth range: y from TOP - NEAR down to TOP - FAR (-30)

// hide: optional (object) => true to leave that object out as well (world/farview.js keeps only the landmarks)
export function captureHeightmap(renderer, scene, bounds, { skip, extra = [], hide: hideIf = null, size = 2048, quiet = false, readAsync = false } = {}) {
  const t0 = performance.now();
  const maxSize = Math.min(size, renderer.capabilities.maxTextureSize);
  const cell = Math.max(bounds.w, bounds.h) / maxSize;
  const W = Math.ceil(bounds.w / cell), H = Math.ceil(bounds.h / cell);
  const cx = bounds.minX + (W * cell) / 2, cz = bounds.minZ + (H * cell) / 2;
  // looking straight down with screen-up = north (-z): screen x is +x, the bottom image row is the south edge
  const cam = new THREE.OrthographicCamera(-W * cell / 2, W * cell / 2, H * cell / 2, -H * cell / 2, NEAR, FAR);
  cam.position.set(cx, TOP, cz);
  cam.up.set(0, 0, -1);
  cam.lookAt(cx, 0, cz);
  cam.updateMatrixWorld(true);

  const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true, type: THREE.UnsignedByteType, format: THREE.RGBAFormat });
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  // only the static city: not the roots in `skip` (vehicles, people), nor the sky dome, rain, glass, lines or sprites
  const hidden = [];
  const hide = (o) => { if (o.visible) { o.visible = false; hidden.push(o); } };
  for (const c of scene.children) if (skip.has(c)) hide(c);
  scene.traverseVisible((o) => {
    if (o.isLine || o.isPoints || o.isSprite || (hideIf && hideIf(o))) hide(o);
    else if (o.isMesh) {
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.depthWrite === false || (o.geometry && o.geometry.parameters && o.geometry.parameters.radius > 1000)) hide(o);
    }
  });
  const prevOverride = scene.overrideMaterial, prevFog = scene.fog, prevTarget = renderer.getRenderTarget();
  const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  const prevShadow = renderer.shadowMap.autoUpdate;
  scene.overrideMaterial = mat; scene.fog = null;
  renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0xffffff, 1);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(W * H * 4);
  // readAsync: read back without stalling the frame (WebGL2 fence), resolving to the height field
  const later = readAsync && renderer.readRenderTargetPixelsAsync;
  if (!later) renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  renderer.shadowMap.autoUpdate = prevShadow;
  scene.overrideMaterial = prevOverride; scene.fog = prevFog;
  for (const o of hidden) o.visible = true;
  if (later) {
    return renderer.readRenderTargetPixelsAsync(rt, 0, 0, W, H, px)
      .then(() => { rt.dispose(); mat.dispose(); return unpack(); })
      .catch(() => { rt.dispose(); mat.dispose(); return null; });
  }
  rt.dispose(); mat.dispose();
  return unpack();

  function unpack() {

  // unpack (three's packDepthToRGBA) and flip rows so row 0 is the north edge
  const h = new Int16Array(W * H);
  const UD = 255 / 256;
  for (let r = 0; r < H; r++) {
    const row = (H - 1 - r) * W;
    for (let c = 0; c < W; c++) {
      const i = (r * W + c) * 4;
      const d = (px[i] / 255) * UD + (px[i + 1] / 255) * (UD / 256) + (px[i + 2] / 255) * (UD / 65536) + (px[i + 3] / 255) / 16777216;
      const y = TOP - (NEAR + d * (FAR - NEAR));
      h[row + c] = Math.max(-3000, Math.min(32000, Math.round(y * 100)));
    }
  }
  // thin tall things the top-down view can miss (a needle only a pixel wide): explicit columns
  for (const e of extra) {
    const r = Math.ceil(e.r / cell);
    const c0 = Math.floor((e.x - bounds.minX) / cell), r0 = Math.floor((e.z - bounds.minZ) / cell);
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const c = c0 + i, rr = r0 + j;
      if (c < 0 || rr < 0 || c >= W || rr >= H) continue;
      h[rr * W + c] = Math.max(h[rr * W + c], Math.round(e.h * 100));
    }
  }
  const ms = Math.round(performance.now() - t0);
  if (!quiet) console.log(`heightmap ${W}x${H} (${cell.toFixed(2)} m cells) captured in ${ms} ms`);

  const x0 = bounds.minX, z0 = bounds.minZ, inv = 1 / cell;
  const at = (x, z) => {
    const c = Math.floor((x - x0) * inv), r = Math.floor((z - z0) * inv);
    if (c < 0 || r < 0 || c >= W || r >= H) return 0;
    return h[r * W + c] * 0.01;
  };
  return {
    cell, W, H, ms, heights: h,
    at,
    // tallest point within a square of half-size `r` around (x, z)
    maxIn(x, z, r) {
      const c0 = Math.max(0, Math.floor((x - r - x0) * inv)), c1 = Math.min(W - 1, Math.floor((x + r - x0) * inv));
      const r0 = Math.max(0, Math.floor((z - r - z0) * inv)), r1 = Math.min(H - 1, Math.floor((z + r - z0) * inv));
      let m = -3000;
      for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) { const v = h[rr * W + c]; if (v > m) m = v; }
      return m * 0.01;
    },
  };
  }
}

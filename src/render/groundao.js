// Baked ground ambient occlusion: building (and landmark) footprints are rasterised once at load into a
// 1 m-per-texel map and blurred, giving how enclosed each patch of ground is by nearby walls. Ground shaders
// (asphalt, paving) sample it once per pixel to darken ambient/sky light at wall bases and in narrow lanes.
// Costs one texture tap at runtime and ~20-40 ms at load; no screen-space pass, so it's free on phones.
import * as THREE from 'three';
import { LAMP_GLSL } from './lamplight.js';

export const groundAOUniforms = {
  uGroundAO: { value: null },
  uAOOrigin: { value: new THREE.Vector2() },
  uAOSize: { value: new THREE.Vector2(1, 1) },
  uAOStrength: { value: 0.6 },
};

// GLSL: returns 1 (open) .. ~0.45 (hard against a wall)
export const GROUND_AO_GLSL = /* glsl */ `
  uniform sampler2D uGroundAO; uniform vec2 uAOOrigin; uniform vec2 uAOSize; uniform float uAOStrength;
  ${LAMP_GLSL}
  float groundAO(vec2 xz) {
    float occ = texture2D(uGroundAO, (xz - uAOOrigin) / uAOSize).r;
    return 1.0 - uAOStrength * occ;
  }
`;

// rects: [{ x, z, w, d, rot }] (rot: THREE-style rotation about y)
export function bakeGroundAO(rects, bounds) {
  const RES = 1; // metres per texel
  const W = Math.ceil(bounds.w / RES), H = Math.ceil(bounds.h / RES);
  const a = new Float32Array(W * H);
  // rasterise each footprint, grown by 0.3 m so the occlusion starts right at the wall line
  for (const r of rects) {
    const c = Math.cos(r.rot), s = Math.sin(r.rot), hx = r.w / 2 + 0.3, hz = r.d / 2 + 0.3;
    const ext = Math.abs(hx * c) + Math.abs(hz * s), extz = Math.abs(hx * s) + Math.abs(hz * c);
    const i0 = Math.max(0, Math.floor((r.x - ext - bounds.minX) / RES)), i1 = Math.min(W - 1, Math.ceil((r.x + ext - bounds.minX) / RES));
    const j0 = Math.max(0, Math.floor((r.z - extz - bounds.minZ) / RES)), j1 = Math.min(H - 1, Math.ceil((r.z + extz - bounds.minZ) / RES));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = bounds.minX + (i + 0.5) * RES - r.x, dz = bounds.minZ + (j + 0.5) * RES - r.z;
      // world -> local (inverse of the rotation about y)
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) <= hx && Math.abs(lz) <= hz) a[j * W + i] = 1;
    }
  }
  // separable box blur, 2 passes (triangle filter), radius 2 texels: occlusion fades out ~3 m from a wall
  const b = new Float32Array(W * H), R = 2, norm = 1 / (2 * R + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < H; j++) {
      let acc = 0;
      for (let k = -R; k <= R; k++) acc += a[j * W + Math.min(W - 1, Math.max(0, k))];
      for (let i = 0; i < W; i++) {
        b[j * W + i] = acc * norm;
        acc += a[j * W + Math.min(W - 1, i + R + 1)] - a[j * W + Math.max(0, i - R)];
      }
    }
    for (let i = 0; i < W; i++) {
      let acc = 0;
      for (let k = -R; k <= R; k++) acc += b[Math.min(H - 1, Math.max(0, k)) * W + i];
      for (let j = 0; j < H; j++) {
        a[j * W + i] = acc * norm;
        acc += b[Math.min(H - 1, j + R + 1) * W + i] - b[Math.max(0, j - R) * W + i];
      }
    }
  }
  // a wall edge blurs to 0.5 coverage: scale so the base of a wall reads ~0.85 and a lane between two walls saturates
  const data = new Uint8Array(W * H);
  for (let k = 0; k < a.length; k++) data[k] = Math.min(255, Math.round(Math.min(1, a[k] * 1.7) * 255));
  const t = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.unpackAlignment = 1; // one byte per texel and the width isn't a multiple of 4
  t.needsUpdate = true;
  groundAOUniforms.uGroundAO.value = t;
  groundAOUniforms.uAOOrigin.value.set(bounds.minX, bounds.minZ);
  groundAOUniforms.uAOSize.value.set(W * RES, H * RES);
  return t;
}

// Shader patch: occlusion reduces sky/ambient light fully and direct sun slightly (contact darkening).
export const GROUND_AO_APPLY = /* glsl */ `
  {
    float gao = groundAO(vWXZ);
    reflectedLight.indirectDiffuse *= gao;
    reflectedLight.indirectSpecular *= gao;
    reflectedLight.directDiffuse *= mix(1.0, gao, 0.45);
    // street lamps (baked): warm light on the ground at night
    reflectedLight.directDiffuse += diffuseColor.rgb * lampLight(vWXZ) * 2.4;
  }
`;

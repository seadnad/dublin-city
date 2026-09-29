// Baked street lighting: every street lamp's light on the ground is rasterised once into a 1 m/texel map.
// Road, pavement and building shaders sample it at night to add warm lamp light (a few real point lights
// near the player add specular and moving-object lighting on top). One texture tap; nothing in daylight.
import * as THREE from 'three';

export const lampUniforms = {
  uLampMap: { value: null },
  uLampOrigin: { value: new THREE.Vector2() },
  uLampSize: { value: new THREE.Vector2(1, 1) },
  uLampLevel: { value: 0 },
  uLampColor: { value: new THREE.Color(1.0, 0.72, 0.42) }, // warm (sodium / warm-white LED mix)
};

export const LAMP_GLSL = /* glsl */ `
  uniform sampler2D uLampMap; uniform vec2 uLampOrigin; uniform vec2 uLampSize; uniform float uLampLevel; uniform vec3 uLampColor;
  vec3 lampLight(vec2 xz) {
    return uLampColor * (texture2D(uLampMap, (xz - uLampOrigin) / uLampSize).r * uLampLevel);
  }
`;

// spots: [{ hx, hz, hy }] lamp head positions
export function bakeLampLight(spots, bounds) {
  // 1 m per texel, or coarser once the map is over 4096 m across (the texture size every phone GPU supports)
  const RES = Math.max(1, Math.max(bounds.w, bounds.h) / 4096);
  const W = Math.ceil(bounds.w / RES), H = Math.ceil(bounds.h / RES);
  const a = new Float32Array(W * H);
  for (const s of spots) {
    const R = (s.hy > 6 ? 14 : 10) / RES; // tall modern poles throw wider pools than heritage lanterns (in texels)
    const ci = (s.hx - bounds.minX) / RES, cj = (s.hz - bounds.minZ) / RES;
    for (let j = Math.max(0, Math.floor(cj - R)); j <= Math.min(H - 1, Math.ceil(cj + R)); j++) {
      for (let i = Math.max(0, Math.floor(ci - R)); i <= Math.min(W - 1, Math.ceil(ci + R)); i++) {
        const d = Math.hypot(i + 0.5 - ci, j + 0.5 - cj) / R;
        if (d >= 1) continue;
        // bright centre, soft wide falloff; overlapping pools add up (clamped below)
        const v = (1 - d) * (1 - d) * (0.55 + 0.45 * (1 - d));
        a[j * W + i] += v;
      }
    }
  }
  const data = new Uint8Array(W * H);
  for (let k = 0; k < a.length; k++) data[k] = Math.round(Math.min(1, a[k] * 0.85) * 255);
  const t = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  lampUniforms.uLampMap.value = t;
  lampUniforms.uLampOrigin.value.set(bounds.minX, bounds.minZ);
  lampUniforms.uLampSize.value.set(W * RES, H * RES);
  return t;
}

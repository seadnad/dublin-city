// Sky dome, lighting, fog and weather/time-of-day presets.
import * as THREE from 'three';
import { IS_MOBILE } from './textures.js';
import { noiseTexture } from './roads.js';

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const skyFrag = /* glsl */ `
uniform vec3 top; uniform vec3 horizon; uniform vec3 cloudA; uniform vec3 cloudB;
uniform float cover; uniform float time;
varying vec3 vDir;
uniform sampler2D uClouds;
// two taps of a baked fbm texture at different scales and drift speeds instead of per-pixel noise
float fbm2(vec2 p, float t){ return texture2D(uClouds, p * 0.23 + vec2(t * 0.0021, t * 0.0007)).r * 0.65 + texture2D(uClouds, p * 0.61 - vec2(t * 0.0011, t * 0.0019)).g * 0.35; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(horizon, top, pow(h, 0.6));
  // cloud layer projected on a plane
  vec2 uv = d.xz / max(d.y + 0.08, 0.02);
  float c = fbm2(uv, time);
  c = smoothstep(0.55 - cover * 0.45, 0.95, c);
  vec3 cc = mix(cloudA, cloudB, smoothstep(0.3, 0.9, texture2D(uClouds, uv * 0.5 + 0.3).g));
  col = mix(col, cc, c * smoothstep(0.0, 0.12, d.y));
  col = mix(col, horizon, smoothstep(0.12, 0.0, d.y)); // haze at the horizon
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ACES compresses mid-tones, so the whole scene sits slightly darker than the preset values assume;
// this lifts every preset by the same amount (presets keep their relative brightness).
const EXPOSURE_BASE = 0.92; // keeps sunlit white paint and pale stone below the ACES shoulder

// Lighting hierarchy per preset (three r186 physical units):
//   sun  - key light: directional, casts shadows, gives objects a lit side and a shade side
//   fill - cheap directional opposite the sun, no shadows: keeps shade sides readable and varied
//   hemi - sky / ground bounce (up-facing surfaces pick up the sky, down-facing the warm pavement)
//   env  - image-based light from the sky (kept low so it doesn't flatten the scene again)
// sunDir points from the ground toward the sun (x east, y up, z south). Dublin afternoon sun is south-west.
export const PRESETS = {
  day: {
    top: 0x6f90b3, horizon: 0xd2d9de, cloudA: 0xf2f1ec, cloudB: 0x98a2ab, cover: 0.55,
    fog: 0xc3cbd1, fogDensity: 0.0022, hemiSky: 0xb9cde4, hemiGround: 0x8c806e, hemi: 0.68,
    sun: 0xfff1dc, sunI: 3.0, sunDir: [-0.55, 0.62, 0.56], fill: 0x9fb6d0, fillI: 0.4,
    exposure: 1.0, lamps: 0, windows: 0.0, wet: 0, env: 0.3,
  },
  rain: {
    top: 0x6b757c, horizon: 0x9ea5a8, cloudA: 0x8a9195, cloudB: 0x5d6569, cover: 1.0,
    fog: 0x9aa1a3, fogDensity: 0.0052, hemiSky: 0xbfc8cc, hemiGround: 0x4f4b44, hemi: 0.85,
    sun: 0xdde6ee, sunI: 0.95, sunDir: [-0.35, 0.85, 0.4], fill: 0xa9b6c2, fillI: 0.28,
    exposure: 1.0, lamps: 0.25, windows: 0.0, wet: 1, env: 0.5,
  },
  evening: {
    top: 0x1a2440, horizon: 0x8a6a6a, cloudA: 0x3d3f55, cloudB: 0x252838, cover: 0.7,
    fog: 0x3a3c4c, fogDensity: 0.0034, hemiSky: 0x5a6a90, hemiGround: 0x2a2420, hemi: 0.38,
    sun: 0xffa86a, sunI: 0.45, sunDir: [-0.88, 0.2, 0.43], fill: 0x5d6f9a, fillI: 0.14,
    exposure: 1.08, lamps: 1, windows: 1, wet: 0, env: 0.3,
  },
};

const RAINY_EVENING = {
  ...PRESETS.evening, top: 0x131a2b, horizon: 0x4c4b58, cloudA: 0x2f3242, cloudB: 0x1d202b, cover: 1,
  fog: 0x2f323d, fogDensity: 0.0058, hemi: 0.42, sunI: 0.2, fillI: 0.12, wet: 1, env: 0.4,
};
export function composePreset({ rain, evening }) {
  if (rain && evening) return RAINY_EVENING;
  return rain ? PRESETS.rain : evening ? PRESETS.evening : PRESETS.day;
}

export function createAtmosphere(scene, renderer) {
  const uniforms = {
    top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
    cloudA: { value: new THREE.Color() }, cloudB: { value: new THREE.Color() },
    cover: { value: 0.8 }, time: { value: 0 }, uClouds: { value: noiseTexture },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, uniforms, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  const S = IS_MOBILE ? 1024 : 2048;
  sun.shadow.mapSize.set(S, S);
  const ext = 90;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 10, far: 600 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3(...PRESETS.day.sunDir).normalize();

  // fill: opposite the sun horizontally, a little above the horizon; no shadows, so it costs one light term
  const fill = new THREE.DirectionalLight(0xffffff, 0.3);
  scene.add(fill, fill.target);
  const fillDir = new THREE.Vector3();

  scene.fog = new THREE.FogExp2(0xffffff, 0.003);

  // environment map from the sky for reflections (regenerated on preset change)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = sky.clone();
  envSky.material = sky.material;
  envScene.add(envSky);
  let envRT = null;

  const state = { rain: false, evening: false, values: null };

  function apply(mode) {
    Object.assign(state, mode);
    const p = composePreset(state);
    state.values = p;
    uniforms.top.value.set(p.top); uniforms.horizon.value.set(p.horizon);
    uniforms.cloudA.value.set(p.cloudA); uniforms.cloudB.value.set(p.cloudB);
    uniforms.cover.value = p.cover;
    scene.fog.color.set(p.fog); scene.fog.density = p.fogDensity;
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemi;
    sun.color.set(p.sun); sun.intensity = p.sunI;
    sunDir.set(...p.sunDir).normalize();
    fillDir.set(-sunDir.x, 0.35, -sunDir.z).normalize();
    fill.color.set(p.fill); fill.intensity = p.fillI;
    renderer.toneMappingExposure = p.exposure * EXPOSURE_BASE;
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.02);
    scene.environment = envRT.texture;
    scene.environmentIntensity = p.env;
    renderer.setClearColor(p.fog);
  }
  apply({ rain: false, evening: false });

  return {
    sun, fill, hemi, uniforms, state, apply,
    update(dt, time, focus) {
      uniforms.time.value = time;
      sky.position.copy(focus);
      // snap the shadow frustum to whole texels so shadows don't shimmer as the car moves
      const texel = (2 * ext) / S;
      const fx = Math.round(focus.x / texel) * texel, fz = Math.round(focus.z / texel) * texel;
      sun.position.set(fx + sunDir.x * 300, sunDir.y * 300, fz + sunDir.z * 300);
      sun.target.position.set(fx, 0, fz);
      fill.position.set(focus.x + fillDir.x * 100, fillDir.y * 100, focus.z + fillDir.z * 100);
      fill.target.position.set(focus.x, 0, focus.z);
    },
  };
}

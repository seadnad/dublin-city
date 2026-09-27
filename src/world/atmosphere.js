// Sky dome, lighting, fog and weather/time-of-day presets.
import * as THREE from 'three';
import { IS_MOBILE } from './textures.js';
import { noiseTexture } from './roads.js';
import { setReflectLevel } from '../render/reflect.js';

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
// ---------------------------------------------------------------- atmospheric fog
// three.js's fog chunks are replaced globally (every material that uses fog picks this up, no per-material setup):
//  - radial distance instead of view depth (no haze swinging as the camera turns)
//  - height falloff: denser near the ground, thinner up high, so rooftops and the Spire read against the sky
//  - aerial perspective: looking toward the sun the haze brightens and warms (Mie forward scatter); the sun's
//    direction and colour come from the first directional light, which lit materials already receive
// Materials without lighting (basic/sprite) just get the height fog.
const FOG_HEIGHT = 70.0; // metres over which the haze thins out
THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying float vFogDepth; varying vec3 vFogView; varying float vFogY;
#endif`;
THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogView = mvPosition.xyz;
  vFogY = cameraPosition.y + ( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).y;
#endif`;
THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth; varying vec3 vFogView; varying float vFogY;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear; uniform float fogFar;
  #endif
#endif`;
THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  float fogDist = length( vFogView );
  #ifdef FOG_EXP2
    float fogH = max( 0.0, 0.5 * ( vFogY + cameraPosition.y ) );
    float fogD = fogDensity * mix( 1.0, exp( - fogH / ${FOG_HEIGHT.toFixed(1)} ), 0.7 );
    float fogFactor = 1.0 - exp( - fogD * fogD * fogDist * fogDist );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, fogDist );
  #endif
  vec3 fogCol = fogColor;
  #if ( defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG ) ) && NUM_DIR_LIGHTS > 0
    float fogSun = max( dot( vFogView / max( fogDist, 1e-3 ), directionalLights[ 0 ].direction ), 0.0 );
    fogCol += directionalLights[ 0 ].color * ( 0.045 * pow( fogSun, 4.0 ) + 0.09 * pow( fogSun, 24.0 ) );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogFactor );
#endif`;

const skyFrag = /* glsl */ `
uniform vec3 top; uniform vec3 horizon; uniform vec3 cloudA; uniform vec3 cloudB;
uniform float cover; uniform float time;
uniform vec3 uFog; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunDisc;
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
  float sd = max(dot(d, uSunDir), 0.0);
  // sun disc and its bright aureole sit behind the cloud layer
  col += uSunCol * (uSunDisc * smoothstep(0.9993, 0.9997, sd) + 0.25 * uSunDisc * pow(sd, 200.0));
  col = mix(col, cc * (1.0 + 0.35 * pow(sd, 8.0)), c * smoothstep(0.0, 0.12, d.y));
  // horizon haze uses the fog colour (plus the same sun glow as the fog) so distant buildings melt into the sky
  vec3 haze = uFog + uSunCol * (0.045 * pow(sd, 4.0) + 0.09 * pow(sd, 24.0));
  col = mix(col, haze, smoothstep(0.16, 0.0, d.y));
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
    fog: 0xbcc7d0, fogDensity: 0.0024, sunDisc: 0.5, hemiSky: 0xb9cde4, hemiGround: 0x8c806e, hemi: 0.68,
    sun: 0xfff1dc, sunI: 3.0, sunDir: [-0.55, 0.62, 0.56], fill: 0x9fb6d0, fillI: 0.4,
    exposure: 1.0, lamps: 0, windows: 0.0, wet: 0, env: 0.3, reflect: 1.0,
    city: 1.0, ground: 0x34363a,
  },
  rain: {
    top: 0x6b757c, horizon: 0x9ea5a8, cloudA: 0x8a9195, cloudB: 0x5d6569, cover: 1.0,
    fog: 0x979fa3, fogDensity: 0.0056, hemiSky: 0xbfc8cc, hemiGround: 0x4f4b44, hemi: 0.85,
    sun: 0xdde6ee, sunI: 0.95, sunDir: [-0.35, 0.85, 0.4], fill: 0xa9b6c2, fillI: 0.28,
    exposure: 1.0, lamps: 0.25, windows: 0.0, wet: 1, env: 0.5, reflect: 1.0,
    city: 0.45, ground: 0x26282b,
  },
  evening: {
    top: 0x1a2440, horizon: 0x8a6a6a, cloudA: 0x3d3f55, cloudB: 0x252838, cover: 0.7,
    fog: 0x4a4250, fogDensity: 0.0032, sunDisc: 0.9, hemiSky: 0x5a6a90, hemiGround: 0x2a2420, hemi: 0.38,
    sun: 0xffa86a, sunI: 0.45, sunDir: [-0.88, 0.2, 0.43], fill: 0x5d6f9a, fillI: 0.14,
    exposure: 1.08, lamps: 1, windows: 1, wet: 0, env: 0.3, reflect: 0.8,
    city: 0.12, ground: 0x121316,
  },
};

const RAINY_EVENING = {
  ...PRESETS.evening, top: 0x131a2b, horizon: 0x4c4b58, cloudA: 0x2f3242, cloudB: 0x1d202b, cover: 1,
  fog: 0x2f323d, fogDensity: 0.0058, sunDisc: 0, hemi: 0.42, sunI: 0.2, fillI: 0.12, wet: 1, env: 0.4, reflect: 0.9, city: 0.1,
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
    uFog: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uSunDisc: { value: 0 },
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
  // Shadows cover the area in front of the camera (see update), not a big square centred on the car:
  // desktop 120 m at 2048 px = 5.9 cm per texel, phones 100 m at 1536 px = 6.5 cm per texel.
  const S = IS_MOBILE ? 1536 : 2048;
  sun.shadow.mapSize.set(S, S);
  const ext = IS_MOBILE ? 50 : 60;
  const texel = (2 * ext) / S;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 40, far: 420 });
  // biases of about one to two texels: enough to avoid acne on large facades without detaching contact shadows
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = texel * 1.4;
  sun.shadow.radius = 2.2; // PCF blur radius in texels (~13 cm penumbra)
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3(...PRESETS.day.sunDir).normalize();

  // fill: opposite the sun horizontally, a little above the horizon; no shadows, so it costs one light term
  const fill = new THREE.DirectionalLight(0xffffff, 0.3);
  scene.add(fill, fill.target);
  const fillDir = new THREE.Vector3();
  const centre = new THREE.Vector3(), lu = new THREE.Vector3(), lv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

  scene.fog = new THREE.FogExp2(0xffffff, 0.003);

  // Environment map for image-based light and reflections, regenerated on preset change: the sky, a dark street
  // below and a ring of building silhouettes at the horizon, so car paint and glass reflect sky / street / road
  // instead of plain haze all round.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = sky.clone();
  envSky.material = sky.material;
  envScene.add(envSky);
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(95, 32).rotateX(-Math.PI / 2), groundMat);
  envGround.position.y = -1.2;
  envScene.add(envGround);
  const cityGeo = (() => {
    // facades on a ring of radius 55 m (a street's width across, compressed), 8-26 m tall; vertex colours give
    // each block a tone and darken the side facing away from the sun
    const parts = [], rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const tones = [[0.42, 0.24, 0.18], [0.5, 0.31, 0.22], [0.66, 0.62, 0.55], [0.55, 0.53, 0.5], [0.72, 0.68, 0.6]];
    for (let a = 0; a < Math.PI * 2; a += 0.21 + rnd() * 0.12) {
      const w = 12 + rnd() * 10, h = 8 + rnd() * 18;
      const g = new THREE.BoxGeometry(w, h, 6);
      g.translate(0, h / 2 - 1.2, 0);
      g.rotateY(-a + Math.PI / 2);
      g.translate(Math.cos(a) * 55, 0, Math.sin(a) * 55);
      const t = tones[Math.floor(rnd() * tones.length)];
      const lit = 0.55 + 0.45 * Math.max(0, Math.cos(a - 2.35)); // facing the south-west sun
      const col = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < col.length; i += 3) { col[i] = t[0] * lit; col[i + 1] = t[1] * lit; col[i + 2] = t[2] * lit; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      parts.push(g.toNonIndexed());
    }
    return parts;
  })();
  const cityMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (const g of cityGeo) envScene.add(new THREE.Mesh(g, cityMat));
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
    uniforms.uFog.value.set(p.fog);
    uniforms.uSunDir.value.copy(sunDir);
    uniforms.uSunCol.value.set(p.sun).multiplyScalar(p.sunI);
    uniforms.uSunDisc.value = p.sunDisc ?? 0;
    renderer.toneMappingExposure = p.exposure * EXPOSURE_BASE;
    if (envRT) envRT.dispose();
    groundMat.color.set(p.ground);
    // silhouettes are unlit, so brightness tracks the preset (sunny day ~ lit brick, night ~ near black)
    cityMat.color.setScalar(1.6 * p.city);
    envRT = pmrem.fromScene(envScene, 0.02, 0.1, 200);
    scene.environment = envRT.texture;
    scene.environmentIntensity = p.env;
    setReflectLevel(p.reflect, p.env);
    renderer.setClearColor(p.fog);
  }
  apply({ rain: false, evening: false });

  return {
    sun, fill, hemi, uniforms, state, apply,
    // focus: the player; view: horizontal camera direction (the shadow area is pushed ahead of the player)
    update(dt, time, focus, view) {
      uniforms.time.value = time;
      sky.position.copy(focus);
      const ahead = view ? ext * 0.55 : 0;
      centre.set(focus.x + (view ? view.x : 0) * ahead, 0, focus.z + (view ? view.z : 0) * ahead);
      // snap the centre to whole texels in the shadow camera's own image plane, so edges don't shimmer
      lu.crossVectors(UP, sunDir).normalize();      // shadow camera x axis
      lv.crossVectors(sunDir, lu);                  // shadow camera y axis
      const su = Math.round(centre.dot(lu) / texel) * texel;
      const sv = Math.round(centre.dot(lv) / texel) * texel;
      const sd = centre.dot(sunDir);
      centre.copy(lu).multiplyScalar(su).addScaledVector(lv, sv).addScaledVector(sunDir, sd);
      sun.position.copy(centre).addScaledVector(sunDir, 250);
      sun.target.position.copy(centre);
      fill.position.set(focus.x + fillDir.x * 100, fillDir.y * 100, focus.z + fillDir.z * 100);
      fill.target.position.set(focus.x, 0, focus.z);
    },
  };
}

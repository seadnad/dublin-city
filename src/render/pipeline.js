// Render pipeline.
//  high:   4x MSAA HDR scene -> bloom -> tone map -> grade (vignette, grain)
//          (GTAO removed: barely visible in this scene for ~half the frame rate; ground AO is baked instead)
//  medium: HDR scene -> bloom (evening / rain only) -> tone map -> grade -> FXAA
//  low:    plain forward render with tone mapping (phones)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.28 }, uSat: { value: 0.92 },
    uContrast: { value: 1.06 }, uTint: { value: new THREE.Vector3(0.99, 1.0, 1.02) }, uGrain: { value: 0.025 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uSat, uContrast, uGrain; uniform vec3 uTint;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      c *= uTint;
      vec2 d = vUv - 0.5;
      c *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      c += (h(vUv * 1000.0) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export const QUALITIES = ['low', 'medium', 'high'];

export function createPipeline(renderer, scene, camera, { quality = 'high' } = {}) {
  let composer = null, bloom = null, grade = null, fxaa = null;
  let current = null;
  const size = new THREE.Vector2();

  function build(q) {
    if (composer) { composer.dispose(); composer = null; }
    current = q;
    if (q === 'low') return;
    renderer.getSize(size);
    const rt = new THREE.WebGLRenderTarget(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio(), {
      type: THREE.HalfFloatType, samples: q === 'high' ? 4 : 0,
    });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.12, 0.45, 0.92);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    fxaa = null;
    if (q === 'medium') {
      fxaa = new ShaderPass(FXAAShader);
      composer.addPass(fxaa);
    }
    updateFxaa();
  }
  function updateFxaa() {
    if (!fxaa) return;
    renderer.getSize(size);
    const pr = renderer.getPixelRatio();
    fxaa.material.uniforms.resolution.value.set(1 / (size.x * pr), 1 / (size.y * pr));
  }
  build(quality);

  return {
    get quality() { return current; },
    setQuality(q) { build(q); },
    // the target the scene is drawn into: shaders compile differently for it (no tone mapping / sRGB out) than for
    // the screen, so warm-up compiles must use the same one
    get sceneTarget() { return composer ? composer.renderTarget1 : null; },
    setSize(w, h) { if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); updateFxaa(); } },
    setPixelRatio() { if (composer) { renderer.getSize(size); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(size.x, size.y); updateFxaa(); } },
    // mode: { evening, rain }
    setMood({ evening, rain }) {
      if (!composer) return;
      bloom.strength = evening ? 0.55 : rain ? 0.18 : 0.1;
      // daytime overcast has nothing bright enough to bloom: skip the pass on medium
      bloom.enabled = current === 'high' || evening || rain;
      bloom.threshold = evening ? 0.75 : 0.92;
      grade.uniforms.uSat.value = rain ? 0.82 : evening ? 0.95 : 0.9;
      grade.uniforms.uTint.value.set(...(evening ? [1.02, 0.99, 1.02] : rain ? [0.97, 0.99, 1.03] : [0.995, 1.0, 1.015]));
      grade.uniforms.uVignette.value = evening ? 0.38 : 0.28;
    },
    render(dt) {
      if (!composer) { renderer.render(scene, camera); return; }
      grade.uniforms.uTime.value = (grade.uniforms.uTime.value + dt) % 100;
      composer.render(dt);
    },
  };
}

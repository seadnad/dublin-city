// Street lamps (instanced), night light pools, and rain.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { chunkedInstances } from './chunks.js';
import { world, v2 } from './geo.js';
import { IS_MOBILE } from './textures.js';
import { addBox } from '../game/collision.js';

// ---------- street lamps ----------
// Heritage lanterns on Georgian streets, the quays, Temple Bar and College Green; modern poles elsewhere.
const HERITAGE = /Merrion|Stephen's Green|Dawson|Kildare|Harcourt|Leeson|Baggot|Clare|Quay|Bachelors|Temple Bar|Fleet|Essex|Eustace|Crown|Anglesea|Sycamore|Fishamble|College Green|Grafton|Westland|Parliament|Wicklow|Exchequer/;

function lampSpots() {
  const spots = [];
  const near = (p) => spots.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 100);
  for (const way of world.ways) {
    if (way.bridge) continue;
    const heritage = HERITAGE.test(way.name) || way.type === 'lane';
    const spacing = way.type === 'lane' ? 20 : heritage ? 24 : 32;
    const off = way.type === 'lane' ? way.width / 2 - 0.3 : way.width / 2 + 0.6;
    let side = 1;
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], b = way.pts[k + 1];
      const L = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a));
      for (let s = spacing / 2; s < L; s += spacing) {
        const n = { x: d.z * side, z: -d.x * side };
        const base = v2.lerp(a, b, s / L);
        const p = { x: base.x + n.x * off, z: base.z + n.z * off };
        // keep clear of junction mouths: must not be inside another road
        const r = world.nearestRoad(p.x, p.z);
        if (r && r.way !== way && r.edgeDist < 0.3) { side = -side; continue; }
        if (!near(p)) spots.push({ ...p, rot: Math.atan2(-n.x, -n.z), heritage });
        side = -side;
      }
    }
  }
  return spots;
}

function heritageGeometry() {
  // fluted cast-iron column on a plinth, scroll bracket and a four-sided lantern
  const parts = [
    new THREE.CylinderGeometry(0.2, 0.24, 0.55, 8).translate(0, 0.27, 0),
    new THREE.CylinderGeometry(0.16, 0.2, 0.18, 8).translate(0, 0.64, 0),
    new THREE.CylinderGeometry(0.075, 0.1, 3.3, 6).translate(0, 2.35, 0),
    new THREE.CylinderGeometry(0.11, 0.11, 0.06, 6).translate(0, 1.2, 0),
    new THREE.CylinderGeometry(0.1, 0.1, 0.06, 6).translate(0, 3.9, 0),
    new THREE.CylinderGeometry(0.06, 0.09, 0.3, 6).translate(0, 4.1, 0),
    new THREE.TorusGeometry(0.28, 0.022, 4, 8, Math.PI).rotateY(Math.PI / 2).translate(0, 3.85, 0.28),
    new THREE.CylinderGeometry(0.05, 0.05, 0.12, 6).translate(0, 4.3, 0),
    new THREE.CylinderGeometry(0.02, 0.14, 0.16, 4).rotateY(Math.PI / 4).translate(0, 4.36, 0), // lantern base
    new THREE.ConeGeometry(0.3, 0.3, 4).rotateY(Math.PI / 4).translate(0, 5.02, 0),           // lantern cap
    new THREE.SphereGeometry(0.06, 6, 4).translate(0, 5.2, 0),
  ];
  const frame = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  const glass = new THREE.CylinderGeometry(0.24, 0.16, 0.5, 4, 1, true).rotateY(Math.PI / 4).translate(0, 4.68, 0);
  return { frame, glass };
}

export function buildLamps(scene) {
  const spots = lampSpots();
  const modern = spots.filter((s) => !s.heritage), heritage = spots.filter((s) => s.heritage);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5b6166, roughness: 0.45, metalness: 0.7 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2723, roughness: 0.5, metalness: 0.5 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf4efe0, emissive: 0xffc98a, emissiveIntensity: 0 });
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xffc070, emissiveIntensity: 0, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const make = (geo, mat, list, shadow = false) => chunkedInstances(geo, mat, list, { shadow });
  const pole = new THREE.CylinderGeometry(0.07, 0.13, 7.6, 8).translate(0, 3.8, 0);
  const arm = new THREE.BoxGeometry(0.09, 0.09, 1.7).translate(0, 7.5, 0.8);
  const head = new THREE.BoxGeometry(0.34, 0.12, 0.72).translate(0, 7.42, 1.55);
  const H = heritageGeometry();
  for (const s of modern) { s.hx = s.x + Math.sin(s.rot) * 1.55; s.hz = s.z + Math.cos(s.rot) * 1.55; s.hy = 7.3; }
  for (const s of heritage) { s.hx = s.x; s.hz = s.z; s.hy = 4.7; }
  const meshes = {
    poles: make(pole, poleMat, modern, true), arms: make(arm, poleMat, modern), heads: make(head, headMat, modern),
    frames: make(H.frame, ironMat, heritage, true), lanterns: make(H.glass, lanternMat, heritage),
  };
  // soft light pools on the ground under each lamp (additive, only visible at night)
  const poolTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,210,150,1)'); g.addColorStop(0.5, 'rgba(255,190,120,0.35)'); g.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; // the gradient's warm tint is an sRGB colour
    return t;
  })();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const pools = chunkedInstances(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2).translate(0, 0.16, 0), poolMat,
    spots.map((s) => ({ x: s.hx, z: s.hz })), { receive: false });
  for (const s of spots) addBox(s.x, s.z, 0.2, 0.2, 0);
  scene.add(...Object.values(meshes), pools);

  // a handful of real point lights that hop to the lamps nearest the player
  const N = IS_MOBILE ? 2 : 3;
  const lights = [];
  for (let i = 0; i < N; i++) {
    const l = new THREE.PointLight(0xffc68a, 0, 24, 1.6);
    scene.add(l); lights.push(l);
  }
  let level = 0, t = 0;
  return {
    count: spots.length,
    setLevel(v) {
      level = v;
      headMat.emissiveIntensity = v * 3;
      lanternMat.emissiveIntensity = 0.05 + v * 3.2;
      poolMat.opacity = v * 0.5;
    },
    update(dt, focus) {
      t -= dt;
      if (t > 0) return;
      t = 0.25;
      if (level <= 0) { for (const l of lights) l.intensity = 0; return; }
      const near = spots
        .map((s) => ({ s, d: (s.hx - focus.x) ** 2 + (s.hz - focus.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, N);
      near.forEach(({ s }, i) => { lights[i].position.set(s.hx, s.hy - 0.4, s.hz); lights[i].intensity = 34 * level; });
    },
  };
}

// ---------- rain ----------
export function buildRain(scene) {
  const N = IS_MOBILE ? 1800 : 5000;
  const pos = new Float32Array(N * 2 * 3), end = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const x = Math.random() * 70, y = Math.random() * 34, z = Math.random() * 70;
    pos.set([x, y, z, x, y, z], i * 6);
    end[i * 2 + 1] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uOpacity: { value: 0.4 }, uColor: { value: new THREE.Color(0xc8d2d8) } },
    vertexShader: /* glsl */ `
      attribute float aEnd; uniform float uTime; uniform vec3 uCam;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTime * 24.0, 34.0) + uCam.y - 14.0;
        p.x = mod(p.x - uCam.x + 35.0, 70.0) - 35.0 + uCam.x;
        p.z = mod(p.z - uCam.z + 35.0, 70.0) - 35.0 + uCam.z;
        p += aEnd * vec3(0.12, 0.9, 0.05);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, uOpacity); }`,
    transparent: true, depthWrite: false,
  });
  const rain = new THREE.LineSegments(geo, mat);
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);
  return {
    mesh: rain,
    set(on, evening) { rain.visible = on; mat.uniforms.uColor.value.set(evening ? 0x8a93a8 : 0xc8d2d8); },
    update(dt, time, camera) { mat.uniforms.uTime.value = time; mat.uniforms.uCam.value.copy(camera.position); },
  };
}


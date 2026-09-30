// Street lamps (instanced), night light pools, and rain.
import * as THREE from 'three';
import { addReflections } from '../render/reflect.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { chunkedInstances } from './chunks.js';
import { world, v2 } from './geo.js';
import { IS_MOBILE } from './textures.js';
import { LITE } from '../render/quality.js';
import { addBox } from '../game/collision.js';
import { underSpan } from './railline.js';

// ---------- street lamps ----------
// Heritage lanterns on Georgian streets, the quays, Temple Bar and College Green; modern poles elsewhere.
const HERITAGE = /Merrion|Stephen's Green|Dawson|Kildare|Harcourt|Leeson|Baggot|Clare|Quay|Bachelors|Temple Bar|Fleet|Essex|Eustace|Crown|Anglesea|Sycamore|Fishamble|College Green|Foster Place|Grafton|Westland|Parliament|Wicklow|Exchequer/;

function lampSpots() {
  const spots = [];
  const near = (p) => spots.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 100);
  for (const way of world.ways) for (const pass of way.type === 'boulevard' ? [1, -1] : [1]) {
    if (way.bridge || way.lamps) continue; // ways with a lighting style of their own (park gas lamps) or unlit
    // cobbled lanes (Temple Bar) are lit by lanterns on scroll brackets fixed to the buildings at first-floor
    // height, about every 12 m, alternating sides (docs/research/temple-bar.md A4: ~70% wall-mounted)
    const wall = way.surface === 'sett';
    const heritage = HERITAGE.test(way.name) || way.type === 'lane';
    // O'Connell Street: the 2006 plan's tall silver double-arm standards on both kerbs, about every 25 real metres
    // (OSM street_lamp nodes; docs/research/oconnell-street.md), so every 13 game m a side rather than alternating
    const iap = way.type === 'boulevard';
    const spacing = wall ? 12 : way.type === 'lane' ? 20 : heritage ? 24 : iap ? 13 : 32;
    const off = wall ? way.width / 2 + way.pave + 0.05 : way.type === 'lane' ? way.width / 2 - 0.3 : way.width / 2 + 0.6;
    let side = pass;
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], b = way.pts[k + 1];
      const L = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a));
      for (let s = spacing / 2; s < L; s += spacing) {
        const n = { x: d.z * side, z: -d.x * side };
        const base = v2.lerp(a, b, s / L);
        const p = { x: base.x + n.x * off, z: base.z + n.z * off };
        // keep clear of junction mouths: must not be inside another road
        const r = world.nearestRoad(p.x, p.z);
        if (r && r.way !== way && r.edgeDist < (wall ? r.way.pave + 0.3 : 0.3)) { if (!iap) side = -side; continue; }
        if (!near(p) && !underSpan(p.x, p.z)) spots.push({ ...p, rot: Math.atan2(-n.x, -n.z), heritage, wall, iap }); // none under the DART's bridges
        if (!iap) side = -side;
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
  const modern = spots.filter((s) => !s.heritage && !s.wall && !s.iap), iapSpots = spots.filter((s) => s.iap), heritage = spots.filter((s) => s.heritage && !s.wall), walls = spots.filter((s) => s.wall);
  // Each lamp kind is one mesh with one material (a draw call per map block, not three): the metal and the glowing
  // head / lantern glass are told apart per vertex. Vertex colours carry the paint, and a two-texel lookup (the uv
  // points at texel 0 for metal, texel 1 for glass) carries roughness, metalness and the emissive mask.
  //   modern:   galvanised steel pole and arm (0x7a8086, rough 0.45, metal 0.9) + head (0xf4efe0, rough 1)
  //   heritage: painted cast iron (0x1f2723, rough 0.4, metal 0) + lantern glass (0xf2e8d4, rough 1, both sides)
  const kitTex = (metal) => {
    const rm = new THREE.DataTexture(new Float32Array([0, metal[0], metal[1], 1, 0, 1, 0, 1]), 2, 1, THREE.RGBAFormat, THREE.FloatType);
    const glow = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]), 2, 1);
    for (const t of [rm, glow]) { t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; }
    return { rm, glow };
  };
  const kitMat = (metal, emissive, reflect) => {
    const t = kitTex(metal);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, roughnessMap: t.rm, metalnessMap: t.rm, emissiveMap: t.glow, emissive, emissiveIntensity: 0 });
    // reflections as before: the metal gets the boosted level, the glass (roughness 1) keeps the plain one
    return addReflections(m, reflect, 'step(roughnessFactor, 0.95)');
  };
  // parts: [[geometry, glass?, colour, twoSided?]] -> one non-indexed geometry with colour and uv per part
  const kit = (parts) => mergeGeometries(parts.map(([g, glass, hex, twoSided]) => {
    let geo = g.index ? g.toNonIndexed() : g.clone();
    if (twoSided) {
      // the inside faces as well (was side: DoubleSide): the same triangles wound the other way, normals flipped
      const back = geo.clone(), p = back.attributes.position, n = back.attributes.normal;
      for (let i = 0; i < p.count; i += 3) for (const a of [p, n]) {
        const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1);
        a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2)); a.setXYZ(i + 2, x, y, z);
      }
      for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
      geo = mergeGeometries([geo, back]);
    }
    const c = new THREE.Color(hex), col = new Float32Array(geo.attributes.position.count * 3), uv = new Float32Array(geo.attributes.position.count * 2);
    for (let i = 0; i < col.length / 3; i++) { col.set([c.r, c.g, c.b], i * 3); uv.set([glass ? 0.75 : 0.25, 0.5], i * 2); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) geo.deleteAttribute(k);
    return geo;
  }));
  const modernMat = kitMat([0.45, 0.9], 0xffc98a, 0.7);
  const heritageMat = kitMat([0.4, 0], 0xffc070, 0.6);
  // Low / Battery saver: lamps don't cast the sun shadow (as with the rest of the street furniture there)
  const make = (geo, mat, list, shadow = false) => chunkedInstances(geo, mat, list, { shadow: shadow && !LITE });
  const pole = new THREE.CylinderGeometry(0.07, 0.13, 7.6, 8).translate(0, 3.8, 0);
  const arm = new THREE.BoxGeometry(0.09, 0.09, 1.7).translate(0, 7.5, 0.8);
  const head = new THREE.BoxGeometry(0.34, 0.12, 0.72).translate(0, 7.42, 1.55);
  const H = heritageGeometry();
  for (const s of modern) { s.hx = s.x + Math.sin(s.rot) * 1.55; s.hz = s.z + Math.cos(s.rot) * 1.55; s.hy = 7.3; }
  // the O'Connell Street standard: a slim tapered silver pole, a long arm high over the road and a short one lower
  // over the footpath, each with a shallow dish head (refs/monuments 06, 07; refs/oconnell-street 22)
  const IAP = (() => {
    const pole = new THREE.CylinderGeometry(0.06, 0.12, 10.4, 8).translate(0, 5.2, 0);
    const armA = new THREE.CylinderGeometry(0.04, 0.05, 2.0, 5).rotateX(Math.PI / 2 - 0.08).translate(0, 10.0, 1.0);
    const armB = new THREE.CylinderGeometry(0.035, 0.045, 1.3, 5).rotateX(-Math.PI / 2 + 0.08).translate(0, 7.9, -0.65);
    const dish = (y, z, r) => [new THREE.CylinderGeometry(r, r * 0.55, 0.14, 12).translate(0, y, z), new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.03, 10).translate(0, y - 0.08, z)];
    const [dA, lA] = dish(9.95, 2.0, 0.42), [dB, lB] = dish(7.85, -1.3, 0.32);
    return { metal: [pole, armA, armB, dA, dB, new THREE.CylinderGeometry(0.16, 0.18, 0.5, 8).translate(0, 0.25, 0)], glow: [lA, lB] };
  })();
  for (const s of iapSpots) { s.hx = s.x + Math.sin(s.rot) * 2.0; s.hz = s.z + Math.cos(s.rot) * 2.0; s.hy = 9.8; }
  for (const s of heritage) { s.hx = s.x; s.hz = s.z; s.hy = 4.7; }
  // wall lanterns: local +z points from the wall into the street, the lantern hangs 0.62 m out at 4.5 m
  for (const s of walls) { s.hx = s.x + Math.sin(s.rot) * 0.62; s.hz = s.z + Math.cos(s.rot) * 0.62; s.hy = 4.5; }
  const W = (() => {
    const frame = mergeGeometries([
      new THREE.BoxGeometry(0.14, 0.34, 0.05).translate(0, 4.95, 0.02),                          // wall plate
      new THREE.BoxGeometry(0.04, 0.04, 0.66).translate(0, 5.08, 0.34),                           // bracket arm
      new THREE.TorusGeometry(0.2, 0.018, 4, 8, Math.PI).rotateY(Math.PI / 2).translate(0, 4.88, 0.24), // scroll
      new THREE.CylinderGeometry(0.012, 0.012, 0.16, 4).translate(0, 5.0, 0.62),                 // hanger
      new THREE.CylinderGeometry(0.03, 0.13, 0.12, 4).rotateY(Math.PI / 4).translate(0, 4.34, 0.62), // lantern base
      new THREE.ConeGeometry(0.22, 0.2, 4).rotateY(Math.PI / 4).translate(0, 4.84, 0.62),         // cap
    ].map((g) => g.toNonIndexed()));
    const glass = new THREE.CylinderGeometry(0.17, 0.12, 0.36, 4, 1, true).rotateY(Math.PI / 4).translate(0, 4.56, 0.62);
    return { frame, glass };
  })();
  // at the wall, facing into the street (instances rotate local +z to s.rot)
  const wallItems = walls.map((s) => ({ x: s.x, z: s.z, rot: s.rot }));
  const STEEL = 0x7a8086, HEAD = 0xf4efe0, IRON = 0x1f2723, GLASS = 0xf2e8d4;
  // (the lanterns are opaque: at 0.85 opacity the blend was invisible but cost sorting and fill on every lantern)
  const meshes = {
    modern: make(kit([[pole, false, STEEL], [arm, false, STEEL], [head, true, HEAD]]), modernMat, modern, true),
    iap: make(kit([...IAP.metal.map((g) => [g, false, 0x9aa1a8]), ...IAP.glow.map((g) => [g, true, 0xf4f4ee])]), modernMat, iapSpots, true),
    heritage: make(kit([[H.frame, false, IRON], [H.glass, true, GLASS, true]]), heritageMat, heritage, true),
    wall: make(kit([[W.frame, false, IRON], [W.glass, true, GLASS, true]]), heritageMat, wallItems),
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
  // On wet ground a lamp's reflection smears into a streak running toward the viewer: stretch each pool along
  // the lamp-to-camera direction (and narrow it) in the vertex shader. uStreak = wetness.
  const streak = { value: 0 };
  poolMat.onBeforeCompile = (sh) => {
    sh.uniforms.uStreak = streak;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uStreak;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 lampW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec2 toCam = cameraPosition.xz - lampW.xz;
          float dc = length(toCam);
          vec2 along = toCam / max(dc, 1e-3), across = vec2(-along.y, along.x);
          float L = 1.0 + uStreak * min(dc * 0.1, 4.0);
          vec2 off = across * transformed.x * mix(1.0, 0.4, uStreak) + along * (transformed.z * L + (L - 1.0) * 5.5);
          transformed.x = off.x; transformed.z = off.y;
        }`);
  };
  const pools = chunkedInstances(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2).translate(0, 0.16, 0), poolMat,
    spots.map((s) => ({ x: s.hx, z: s.hz })), { receive: false });
  for (const s of spots) if (!s.wall) addBox(s.x, s.z, 0.2, 0.2, 0);
  scene.add(...Object.values(meshes), pools);

  // a handful of real point lights that hop to the lamps nearest the player
  const N = LITE ? 2 : 3;
  const lights = [];
  for (let i = 0; i < N; i++) {
    const l = new THREE.PointLight(0xffc68a, 0, 24, 1.6);
    scene.add(l); lights.push(l);
  }
  let level = 0, t = 0, wet = 0;
  return {
    count: spots.length,
    spots,
    setWet(w) { wet = w; streak.value = w; poolMat.opacity = level * (0.12 + 0.75 * w); pools.visible = poolMat.opacity > 0.001; },
    setLevel(v) {
      level = v;
      modernMat.emissiveIntensity = v * 3;
      heritageMat.emissiveIntensity = 0.05 + v * 3.2;
      poolMat.opacity = v * (0.12 + 0.75 * wet);
      // hidden by day: a few hundred 12 m blended quads at zero opacity still cost full fill rate
      pools.visible = poolMat.opacity > 0.001;
    },
    update(dt, focus) {
      t -= dt;
      if (t > 0) return;
      t = 0.25;
      if (level <= 0) { for (const l of lights) l.intensity = 0; return; }
      // the N nearest lamps: one pass keeping a short sorted list (no per-lamp allocation or full sort)
      const best = [], bd = [];
      for (const s of spots) {
        const d = (s.hx - focus.x) ** 2 + (s.hz - focus.z) ** 2;
        if (best.length === N && d >= bd[N - 1]) continue;
        let i = Math.min(best.length, N - 1);
        while (i > 0 && bd[i - 1] > d) { best[i] = best[i - 1]; bd[i] = bd[i - 1]; i--; }
        best[i] = s; bd[i] = d;
      }
      best.forEach((s, i) => { lights[i].position.set(s.hx, s.hy - 0.4, s.hz); lights[i].intensity = 34 * level; });
    },
  };
}

// ---------- rain ----------
export function buildRain(scene) {
  const N = LITE ? 2600 : 7000;
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
        p += aEnd * vec3(0.22, 1.25, 0.1); // wind-slanted streak
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


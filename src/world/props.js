// Street lamps (instanced), night light pools, and rain.
import * as THREE from 'three';
import { world, v2 } from './geo.js';
import { IS_MOBILE } from './textures.js';
import { addBox } from '../game/collision.js';

// ---------- street lamps ----------
function lampSpots() {
  const spots = [];
  const near = (p) => spots.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 100);
  for (const way of world.ways) {
    if (way.bridge) continue;
    const spacing = way.type === 'lane' ? 22 : 30;
    const off = way.width / 2 + 0.6;
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
        if (!near(p)) spots.push({ ...p, rot: Math.atan2(-n.x, -n.z) });
        side = -side;
      }
    }
  }
  return spots;
}

export function buildLamps(scene) {
  const spots = lampSpots();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2f3a36, roughness: 0.6, metalness: 0.5 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf4efe0, emissive: 0xffc98a, emissiveIntensity: 0 });
  const pole = new THREE.CylinderGeometry(0.08, 0.13, 7.2, 6).translate(0, 3.6, 0);
  const arm = new THREE.BoxGeometry(0.1, 0.1, 1.6).translate(0, 7.1, 0.75);
  const head = new THREE.BoxGeometry(0.42, 0.18, 0.7).translate(0, 6.98, 1.45);
  const poles = new THREE.InstancedMesh(pole, poleMat, spots.length);
  const arms = new THREE.InstancedMesh(arm, poleMat, spots.length);
  const heads = new THREE.InstancedMesh(head, headMat, spots.length);
  // soft light pools painted on the ground under each lamp (additive, only visible at night)
  const poolTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,210,150,1)'); g.addColorStop(0.5, 'rgba(255,190,120,0.35)'); g.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const poolGeo = new THREE.PlaneGeometry(13, 13).rotateX(-Math.PI / 2).translate(0, 0.04, 1.5);
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, spots.length);
  pools.frustumCulled = false;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  spots.forEach((s, i) => {
    q.setFromAxisAngle(up, s.rot);
    m.compose(new THREE.Vector3(s.x, 0, s.z), q, one);
    poles.setMatrixAt(i, m); arms.setMatrixAt(i, m); heads.setMatrixAt(i, m); pools.setMatrixAt(i, m);
    addBox(s.x, s.z, 0.18, 0.18, 0);
    // world position of the lamp head, for the dynamic light pool
    s.hx = s.x + Math.sin(s.rot) * 1.45; s.hz = s.z + Math.cos(s.rot) * 1.45;
  });
  poles.castShadow = arms.castShadow = true;
  scene.add(poles, arms, heads, pools);

  // a handful of real point lights that hop to the lamps nearest the player
  const N = IS_MOBILE ? 3 : 6;
  const lights = [];
  for (let i = 0; i < N; i++) {
    const l = new THREE.PointLight(0xffc68a, 0, 26, 1.6);
    scene.add(l); lights.push(l);
  }
  let level = 0, t = 0;
  return {
    count: spots.length,
    setLevel(v) {
      level = v;
      headMat.emissiveIntensity = v * 3;
      poolMat.opacity = v * 0.55;
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
      near.forEach(({ s }, i) => { lights[i].position.set(s.hx, 6.6, s.hz); lights[i].intensity = 30 * level; });
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


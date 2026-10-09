// The aerial intro scene: a lightweight Dublin (Liffey, streets, parks, block massing, the Spire) under a slow
// cinematic orbit, then an eased pan to the starting point. Runs in a worker on an OffscreenCanvas where the browser
// supports it, so the orbit stays smooth while the main thread is busy building the city; otherwise on the page.
// Needs only three.js and the street graph. Time is wall-clock throughout, so a late frame never jumps the camera.
import * as THREE from 'three';
import { world, pointInPolygon } from '../world/geo.js';

const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(() => f(performance.now()), 16);

export function createIntro(canvas, width, height, dpr, fps = 60) {
  const B = world.bounds;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(dpr, 1.5));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const SKY = new THREE.Color(0xbcc7d0);
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 700, 2200);
  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 4000);
  scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x6d6456, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(-0.55, 0.62, 0.56).multiplyScalar(100);
  scene.add(sun);

  const flat = (poly, y, color) => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.z))));
    g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
  };
  const groundGeo = new THREE.PlaneGeometry(B.w + 2400, B.h + 2400).rotateX(-Math.PI / 2).translate(B.minX + B.w / 2, -0.2, B.minZ + B.h / 2);
  scene.add(new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: 0x9a958b })));
  scene.add(flat(world.riverPoly, 0.05, 0x3b5a5a));
  for (const d of world.docks) scene.add(flat(d.poly, 0.05, 0x3b5a5a));
  for (const p of world.parks) scene.add(flat(p.poly, 0.1, 0x5d8a3c));
  { // streets: one merged mesh of flat quads
    const pos = [];
    for (const s of world.segs) {
      const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, L = Math.hypot(dx, dz) || 1, w = s.way.width / 2;
      const nx = (-dz / L) * w, nz = (dx / L) * w, ex = (dx / L) * w * 0.5, ez = (dz / L) * w * 0.5; // overlap at joints
      const a = [s.a.x - ex + nx, s.a.z - ez + nz], b = [s.b.x + ex + nx, s.b.z + ez + nz], c = [s.b.x + ex - nx, s.b.z + ez - nz], d = [s.a.x - ex - nx, s.a.z - ez - nz];
      for (const [x, z] of [a, b, c, a, c, d]) pos.push(x, 0.2, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x3e3f43, side: THREE.DoubleSide })));
  }
  { // block massing: a coarse grid of boxes wherever there is no road, river or park
    const STEP = 13, items = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let z = B.minZ + STEP; z < B.maxZ - STEP; z += STEP) {
      for (let x = B.minX + STEP; x < B.maxX - STEP; x += STEP) {
        const r = world.nearestRoad(x, z);
        if (r && r.edgeDist < r.way.pave + 3) continue;
        const p = { x, z };
        if (pointInPolygon(p, world.riverPoly) || world.parks.some((k) => pointInPolygon(p, k.poly)) || world.docks.some((k) => pointInPolygon(p, k.poly))) continue;
        const docks = x > 300 && z < 150 && z > -280; // as buildings.js: the northern ring is terraces, not Docklands
        items.push({ x, z, h: docks ? 16 + rnd() * 26 : 11 + rnd() * 9, c: rnd() });
      }
    }
    const geo = new THREE.BoxGeometry(STEP - 1.5, 1, STEP - 1.5).translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), items.length);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    const tones = [0x9c5a44, 0xb4704f, 0xcfc6b4, 0xe0d9ca, 0x86867f].map((h) => new THREE.Color(h));
    items.forEach((it, i) => {
      mesh.setMatrixAt(i, m.makeScale(1, it.h, 1).setPosition(it.x, 0, it.z));
      mesh.setColorAt(i, col.copy(tones[Math.floor(it.c * tones.length)]));
    });
    scene.add(mesh);
  }
  { // the Spire: the one thing everyone looks for from above
    const n = world.nodes.get('OC2');
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.4, 120, 12).translate(0, 60, 0), new THREE.MeshLambertMaterial({ color: 0xdfe3e6, emissive: 0x333333 }));
    spire.position.set(n.x, 0, n.z);
    scene.add(spire);
  }

  // ---- camera: slow orbit round the Liffey on wall-clock time, then an eased pan to the start
  const centre = new THREE.Vector3(B.minX + B.w * 0.55, 0, (world.northBank[0].z + world.southBank[0].z) / 2 + 40);
  const orbit = { r: Math.max(B.w, B.h) * 0.42, h: 420 };
  const t0 = performance.now();
  let pan = null, running = true, lastT = 0;
  const stats = { frames: 0, maxGap: 0, over50: 0 }; // frame pacing, reported with the final pose (tests)
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const pose = () => ({ position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov, stats: { ...stats, seconds: Math.round((performance.now() - t0) / 100) / 10 } });
  function tick(now) {
    if (!running) return;
    // On the light profile, leave GPU time for the city and shader preparation behind the intro.
    if (lastT && now - lastT < 1000 / fps - 2) { raf(tick); return; }
    if (lastT) { const g = now - lastT; stats.frames++; stats.maxGap = Math.max(stats.maxGap, Math.round(g)); if (g > 50) stats.over50++; }
    lastT = now;
    const a = -0.6 + ((now - t0) / 1000) * 0.05;
    pos.set(centre.x + Math.sin(a) * orbit.r, orbit.h, centre.z + Math.cos(a) * orbit.r);
    look.copy(centre);
    if (pan) {
      const e = ease(Math.min(1, (now - pan.start) / (pan.dur * 1000)));
      pos.lerpVectors(pan.fromPos, pan.toPos, e);
      look.lerpVectors(pan.fromLook, pan.toLook, e);
    }
    camera.position.copy(pos);
    camera.lookAt(look);
    renderer.render(scene, camera);
    if (pan && pan.done && now - pan.start >= pan.dur * 1000) { const d = pan.done; pan.done = null; d(pose()); }
    raf(tick);
  }
  raf(tick);

  return {
    resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    // pan to a pose above and behind the car; resolves with the final camera pose
    panTo(start, { back = 90, height = 55, dur = 2.6, skip = false } = {}) {
      const fx = Math.sin(start.heading), fz = Math.cos(start.heading);
      const toPos = new THREE.Vector3(start.x - fx * back, height, start.z - fz * back);
      const toLook = new THREE.Vector3(start.x + fx * 25, 0, start.z + fz * 25);
      return new Promise((done) => {
        if (skip) { camera.position.copy(toPos); camera.lookAt(toLook); done(pose()); return; }
        pan = { start: performance.now(), dur, fromPos: camera.position.clone(), fromLook: look.clone(), toPos, toLook, done };
      });
    },
    stop() { running = false; renderer.dispose(); renderer.forceContextLoss(); },
  };
}

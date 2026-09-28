// Boot: a lightweight aerial Dublin shown while the full game loads behind it.
// It needs only three.js and the street graph (geo.js), so it draws within a second: the Liffey, the street
// network, parks and block massing from the road field, and the Spire, under a slow cinematic orbit. The heavy
// modules then load in stages with a frame in between each, so the orbit keeps moving. When the game is ready it
// calls window.__intro.handoff(start): the orbit pans to the starting point, and main.js flies the real camera
// down to the car from the same pose while this canvas fades out.
import * as THREE from 'three';
import { world, pointInPolygon } from './world/geo.js';

const B = world.bounds;
const canvas = document.createElement('canvas');
canvas.id = 'intro';
document.body.appendChild(canvas);
const overlay = document.createElement('div');
overlay.id = 'intro-ui';
overlay.innerHTML = '<h1>DUBLIN</h1><p class="sub">Garda patrol</p><div class="bar"><i></i></div><p class="step">Surveying the city…</p><p class="skip">Tap to skip</p>';
document.body.appendChild(overlay);
const barEl = overlay.querySelector('.bar i'), stepEl = overlay.querySelector('.step');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const SKY = new THREE.Color(0xbcc7d0);
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 700, 2200);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 4000);
scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x6d6456, 1.6));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.position.set(-0.55, 0.62, 0.56).multiplyScalar(100);
scene.add(sun);

const flat = (poly, y, color) => {
  const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.z))));
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
};
// ground, river, docks, parks
const gw = B.w + 2400, gh = B.h + 2400;
const groundGeo = new THREE.PlaneGeometry(gw, gh).rotateX(-Math.PI / 2).translate(B.minX + B.w / 2, -0.2, B.minZ + B.h / 2);
scene.add(new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: 0x9a958b })));
scene.add(flat(world.riverPoly, 0.05, 0x3b5a5a));
for (const d of world.docks) scene.add(flat(d.poly, 0.05, 0x3b5a5a));
for (const p of world.parks) scene.add(flat(p.poly, 0.1, 0x5d8a3c));
// streets: one merged mesh of flat quads
{
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
// block massing: a coarse grid of boxes wherever there is no road, river or park
{
  const STEP = 13, items = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let z = B.minZ + STEP; z < B.maxZ - STEP; z += STEP) {
    for (let x = B.minX + STEP; x < B.maxX - STEP; x += STEP) {
      const r = world.nearestRoad(x, z);
      if (r && r.edgeDist < r.way.pave + 3) continue;
      const p = { x, z };
      if (pointInPolygon(p, world.riverPoly) || world.parks.some((k) => pointInPolygon(p, k.poly)) || world.docks.some((k) => pointInPolygon(p, k.poly))) continue;
      const docks = x > 300 && z < 150;
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
// the Spire: the one thing everyone looks for from above
{
  const n = world.nodes.get('OC2');
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.4, 120, 12).translate(0, 60, 0), new THREE.MeshLambertMaterial({ color: 0xdfe3e6, emissive: 0x333333 }));
  spire.position.set(n.x, 0, n.z);
  scene.add(spire);
}

// ---- camera: slow orbit round the Liffey, then (on handoff) an eased pan to the starting point
const centre = new THREE.Vector3(B.minX + B.w * 0.55, 0, (world.northBank[0].z + world.southBank[0].z) / 2 + 40);
const orbit = { r: Math.max(B.w, B.h) * 0.42, h: 420 };
let angle = -0.6, pan = null, running = true, last = performance.now();
const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
function orbitPose(a, pos, look) {
  pos.set(centre.x + Math.sin(a) * orbit.r, orbit.h, centre.z + Math.cos(a) * orbit.r);
  look.copy(centre);
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function tick(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  angle += dt * 0.05;
  orbitPose(angle, tmpPos, tmpLook);
  if (pan) {
    pan.t = Math.min(1, (now - pan.start) / (pan.dur * 1000)); // wall-clock: slow frames never stretch it
    const e = ease(pan.t);
    tmpPos.lerpVectors(pan.fromPos, pan.toPos, e);
    tmpLook.lerpVectors(pan.fromLook, pan.toLook, e);
    if (pan.t >= 1 && pan.done) { const d = pan.done; pan.done = null; d(); }
  }
  camera.position.copy(tmpPos);
  camera.lookAt(tmpLook);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
});
// the plain loading card underneath is no longer needed once this draws
const loading = document.getElementById('loading');
if (loading) loading.classList.add('gone');

// automated tests (webdriver) and anyone who has seen it can skip straight in
let skip = !!navigator.webdriver && !/[?&]intro/.test(location.search);
const onSkip = () => { skip = true; overlay.classList.add('skipping'); };

window.__intro = {
  skip: () => skip,
  progress(frac, text) {
    barEl.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
    if (text) stepEl.textContent = text;
  },
  // pan to a pose above and behind the car; resolves when there (at once when skipped)
  panTo(start, { back = 90, height = 55, dur = 2.6 } = {}) {
    overlay.classList.add('ready');
    const fx = Math.sin(start.heading), fz = Math.cos(start.heading);
    const toPos = new THREE.Vector3(start.x - fx * back, height, start.z - fz * back);
    const toLook = new THREE.Vector3(start.x + fx * 25, 0, start.z + fz * 25);
    return new Promise((done) => {
      if (skip) { camera.position.copy(toPos); camera.lookAt(toLook); done(); return; }
      pan = { t: 0, start: performance.now(), dur, fromPos: camera.position.clone(), fromLook: tmpLook.clone(), toPos, toLook, done };
    });
  },
  // the pose the real camera starts its descent from
  pose() { return { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov }; },
  // fade out, then free the context
  finish(ms = 900) {
    canvas.classList.add('fade'); overlay.classList.add('fade');
    setTimeout(() => {
      running = false;
      renderer.dispose(); renderer.forceContextLoss();
      canvas.remove(); overlay.remove();
      delete window.__intro;
    }, ms + 100);
  },
};
overlay.addEventListener('pointerdown', onSkip);
addEventListener('keydown', onSkip, { once: true });

// ---- load the game in stages, one frame apart, so the aerial view keeps moving
const nextFrame = () => new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(go); setTimeout(go, 60); });
const stages = [
  ['Laying the streets…', () => import('./world/roads.js')],
  ['Filling the Liffey…', () => import('./world/ground.js')],
  ['Raising the buildings…', () => import('./world/buildings.js')],
  ['Placing the landmarks…', () => import('./world/landmarks.js')],
  ['Waking the city…', () => import('./main.js')],
];
(async () => {
  for (let i = 0; i < stages.length; i++) {
    window.__intro.progress(i / (stages.length + 2), stages[i][0]);
    await nextFrame();
    await stages[i][1]();
  }
})().catch((e) => { console.error(e); stepEl.textContent = 'Something went wrong loading the city.'; });

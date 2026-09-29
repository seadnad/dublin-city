// Statue kit: shared low-poly figures (tools/blender/build_statues.py -> public/models/statues.glb) placed anywhere in
// the city, plus the O'Connell Monument hero (tools/blender/build_oconnell.py -> public/models/oconnell.glb).
//
// API (docs/research/monuments.md, "statue proxy kit"):
//   addStatue({ body, x, z, y = 0, rot = 0, height, finish = 'bronze' })
//     body    one of BODIES below (the Blender node is fig_<body>)
//     x, y, z world position of the feet (y = top of the plinth)
//     rot     heading the figure FACES: it looks along (sin rot, cos rot), the same convention as a site's local +z
//     height  standing height to the top of the head, metres (raised arms and attributes go above it)
//     finish  a key of FINISH: bronze (near-black, green streaks), greenBronze, oliveBronze, darkBronze, portland, limestone
//   Builder.figure(body, x, y, z, { h, ry, finish }) in landmarks.js does the same in a site's local coordinates.
//   buildStatues(scene) is called once (landmarks.js) after everything has queued: it loads the GLB and merges every
//   figure into one mesh per material per 600 m block (2 materials: metal and stone), so the kit costs a few draw calls.
// Patina is painted into the vertex colours at load (base colour x baked AO, verdigris / weathering streaks running
// down the figure), so no textures are needed. Plinths are ordinary Builder geometry in landmarks.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { load } from './heroes.js';

export const BODIES = ['cloaked', 'frock_chest', 'folded', 'orator', 'orator_out', 'friar', 'larkin', 'reader', 'allegory', 'justice', 'classical'];
const NOMINAL = 1.78; // head top of the kit bodies, metres

// colours from docs/research/monuments.md 3.4 (sampled from the reference photos)
export const FINISH = {
  bronze: { metal: true, base: '#343a36', streak: '#5f8b78', amount: 0.14 },      // O'Connell, Custom House, Trinity
  greenBronze: { metal: true, base: '#3b4a41', streak: '#6f9785', amount: 0.28 }, // Grattan, Thomas Moore
  oliveBronze: { metal: true, base: '#3e463d', streak: '#66705f', amount: 0.12 }, // Larkin
  darkBronze: { metal: true, base: '#3a3d36', streak: '#5f8b78', amount: 0.08 },  // Parnell, Davis
  portland: { metal: false, base: '#d8d4c9', streak: '#a9a59a', amount: 0.3 },    // Smith O'Brien, Gray, GPO figures
  limestone: { metal: false, base: '#a4a6a1', streak: '#83857f', amount: 0.25 },  // Father Mathew
};

// near-black bronze is a matte, low-metal surface (the old shiny 0.85 metalness read as polished steel)
export const statueMats = {
  metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }),
  stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: THREE.DoubleSide }),
};

const queue = [];
export function addStatue(spec) { queue.push({ y: 0, rot: 0, finish: 'bronze', ...spec }); }

// ---------- patina ----------
const fract = (v) => v - Math.floor(v);
const hash = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = x - xi, v = y - yi, w = z - zi;
  const s = (t) => t * t * (3 - 2 * t), su = s(u), sv = s(v), sw = s(w);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), su), L(c(0, 1, 0), c(1, 1, 0), su), sv),
    L(L(c(0, 0, 1), c(1, 0, 1), su), L(c(0, 1, 1), c(1, 1, 1), su), sv), sw);
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const _a = new THREE.Color(), _b = new THREE.Color();
// Paint a geometry already in world space: colour = mix(base, streak, runs) x AO. Streaks are stretched vertically
// (low frequency down the figure, high across) and favour upward-facing surfaces, where rain collects and runs off.
export function paint(geo, finish, scale = 1) {
  const F = FINISH[finish] || FINISH.bronze;
  _a.set(F.base); _b.set(F.streak);
  const p = geo.attributes.position, n = geo.attributes.normal, ao = geo.attributes.color;
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / scale, y = p.getY(i) / scale, z = p.getZ(i) / scale;
    const v = vnoise(x * 6.0, y * 0.9, z * 6.0) * 0.65 + vnoise(x * 15, y * 3, z * 15) * 0.35;
    const m = smooth(1 - F.amount * 1.6, 1 - F.amount * 0.4, v + Math.max(0, n ? n.getY(i) : 0) * 0.15);
    let a = 1;
    if (ao) { const r = ao.getX(i); a = 0.3 + 0.7 * Math.pow(Math.max(0, r), 1 / 2.2); }
    // stone darkens a little more in its hollows (grime); bronze keeps its base
    const k = F.metal ? a : a * (0.85 + 0.15 * a);
    out[i * 3] = (_a.r + (_b.r - _a.r) * m) * k;
    out[i * 3 + 1] = (_a.g + (_b.g - _a.g) * m) * k;
    out[i * 3 + 2] = (_a.b + (_b.b - _a.b) * m) * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return geo;
}

function clean(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

// crude stand-in used if the GLB can't be loaded: a plinth-less column-and-head figure of the right height
function proxy() {
  return mergeGeometries([
    new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8).translate(0, 0.75, 0).toNonIndexed(),
    new THREE.SphereGeometry(0.12, 8, 6).translate(0, 1.66, 0).toNonIndexed(),
  ]);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export async function buildStatues(scene) {
  const bodies = {};
  try {
    const gltf = await load('statues');
    gltf.scene.traverse((o) => { const m = /^fig_(\w+)$/.exec(o.name); if (m && o.isMesh) bodies[m[1]] = o.geometry; });
  } catch (e) { console.warn('statues.glb failed to load; using stand-ins', e); }
  const fallback = proxy();
  const buckets = new Map();
  for (const st of queue) {
    const src = bodies[st.body] || (console.warn(`statue body "${st.body}" missing`), fallback);
    const g = clean(src);
    const k = st.height / NOMINAL;
    g.applyMatrix4(_m.compose(_p.set(st.x, st.y, st.z), _q.setFromAxisAngle(_up, st.rot), _s.setScalar(k)));
    paint(g, st.finish, 1);
    const metal = (FINISH[st.finish] || FINISH.bronze).metal;
    const key = `${metal ? 'metal' : 'stone'}:${Math.floor(st.x / 600)},${Math.floor(st.z / 600)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(g);
  }
  const group = new THREE.Group(); group.name = 'Statues';
  for (const [key, geos] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), key.startsWith('metal') ? statueMats.metal : statueMats.stone);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  scene.add(group);
  return group;
}

// ---------- the O'Connell Monument hero ----------
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// pale Dalkey granite ashlar: 2 m tile, 0.5 m courses, fine speckle
let ocMats = null;
function oconnellMaterials() {
  if (ocMats) return ocMats;
  const ashlar = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c4c1b9'; g.fillRect(0, 0, w, h);
    let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,68,64' : '235,233,228'},${0.08 + r() * 0.12})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    g.fillStyle = 'rgba(110,108,102,0.55)';
    for (let row = 0; row < 4; row++) {
      const y = (row * h) / 4; g.fillRect(0, y, w, 2);
      for (let x = (row % 2) * 48 + 20; x < w; x += 96) g.fillRect(x, y, 2, h / 4);
    }
  });
  const decal = canvasTex(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#3d3b37'; g.font = 'bold 84px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText("O'CONNELL", w / 2, h / 2 + 4);
  }, false);
  ocMats = {
    granite: new THREE.MeshStandardMaterial({ map: ashlar, vertexColors: true, roughness: 0.82, side: THREE.DoubleSide }),
    decal: new THREE.MeshStandardMaterial({ map: decal, transparent: false, alphaTest: 0.4, roughness: 0.8 }),
  };
  return ocMats;
}

// Place the monument at site (feet of the steps at site.x/z, facing along site.rot). Resolves to the group, or null.
export async function placeOConnell(group, site) {
  let gltf;
  try { gltf = await load('oconnell'); } catch (e) { console.warn('oconnell model failed to load', e); return null; }
  const M = oconnellMaterials();
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => { if (o.isMesh) parts.push(o); });
  for (const o of parts) {
    const name = o.material.name;
    if (name === 'oc_bronze') {
      // paint the patina in model space (scaled to metres) so the streaks don't move with the placement
      const g = o.geometry.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      paint(g, 'bronze');
      o.geometry = g; o.material = statueMats.metal;
    } else if (name === 'oc_decal') {
      o.material = M.decal;
    } else {
      const g = o.geometry, col = g.attributes.color;
      if (col) { // decode the baked AO like the other heroes (sRGB bytes read as linear)
        const out = new Float32Array(col.count * 3);
        for (let i = 0; i < col.count; i++) { const v = 0.3 + 0.7 * Math.pow(col.getX(i), 1 / 2.2); out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = v; }
        g.setAttribute('color', new THREE.BufferAttribute(out, 3));
      }
      o.material = M.granite;
    }
    o.castShadow = o.material !== M.decal; o.receiveShadow = true;
  }
  root.position.set(0, 0, 0);
  group.add(root);
  group.position.set(site.x, 0, site.z);
  group.rotation.y = site.rot;
  return group;
}

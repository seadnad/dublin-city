// Luas stop kit (docs/research/heuston-v2.md section 10.2): platforms that follow the track, a run of cantilevered
// glass shelter modules on tapered "tree" posts, benches, ticket machines, validators, name totems, an optional low
// granite wall with a wall sign, overhead-line poles with span and contact wires, and a hatched strip between the
// tracks. Real size (the trams are). Everything is merged per material: about 7 draw calls a stop.
//
// buildStopKit(scene, at, cfg): at(d) -> { x, z, dx, dz } samples the route centreline d metres past the stop (dx, dz
// the unit direction of travel); cfg (all optional but name):
//   name        'Heuston'
//   from, to    platform extent along the line, metres relative to the stop (default -13 .. 13)
//   width       platform width (2.4); track = distance of each track from the centreline (1.8)
//   sides       { 1: { shelters: [[d0, modules], ...], wall: bool }, -1: {...} }; side +1 is along (-dz, dx)
//   poles       pitch of the overhead-line poles (0 = none)
//   hatch       paint a hatched island between the tracks
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addReflections } from '../render/reflect.js';
import { addBox } from './collision.js';

const PLAT_H = 0.3, GAP = 0.45, TRAM_HALF = 1.25;
const C = {
  paving: new THREE.Color(0xb9b7b0), tactile: new THREE.Color(0xd4c070), line: new THREE.Color(0xf2f2ee),
  kerb: new THREE.Color(0x9a9890), granite: new THREE.Color(0x9e9c94),
  steel: new THREE.Color(0x5d6166), pole: new THREE.Color(0x8c9196), machine: new THREE.Color(0x7b8288),
  timber: new THREE.Color(0x8a6a4a), yellow: new THREE.Color(0xe8c020), bin: new THREE.Color(0xb8bcc0),
};

// shared materials and night hooks for every kit
let M = null;
const nightMats = [];
function materials() {
  if (M) return M;
  const signs = signCanvas();
  M = {
    ground: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    metal: addReflections(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.6 }), 0.5),
    glass: new THREE.MeshStandardMaterial({ color: 0xa9c0c8, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
    sign: new THREE.MeshStandardMaterial({ map: signs, emissive: 0xffffff, emissiveMap: signs, emissiveIntensity: 0.08, roughness: 0.5 }),
    strip: new THREE.MeshStandardMaterial({ color: 0xdfe6ea, emissive: 0xf4f8ff, emissiveIntensity: 0.0, roughness: 0.3 }),
    hatch: new THREE.MeshStandardMaterial({ map: hatchTexture(), transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    wire: new THREE.LineBasicMaterial({ color: 0x2a2c2e }),
  };
  nightMats.push([M.sign, 0.08, 0.9], [M.strip, 0.0, 1.3]);
  return M;
}
export function setStopNight(level) { for (const [m, day, night] of nightMats) m.emissiveIntensity = day + (night - day) * level; }

// sign atlas: 512 x 256. Name panel (0..256 x 0..256), ticket-machine screen (256..384 x 0..128)
const signCache = new Map();
function signCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2f3337'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#f4f4f0'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#c8102e'; g.fillRect(0, 0, 256, 18); // Red Line band
  g.fillStyle = '#1a1c1e'; g.fillRect(256, 0, 128, 128);
  const scr = g.createLinearGradient(0, 16, 0, 112); scr.addColorStop(0, '#3f7fd0'); scr.addColorStop(1, '#1e4f9a');
  g.fillStyle = scr; g.fillRect(270, 16, 100, 70);
  g.fillStyle = '#e8eef4'; g.fillRect(282, 96, 76, 12);
  // yellow validator head (384..448 x 0..64), a white wall sign strip (256..512 x 128..192)
  g.fillStyle = '#e8c020'; g.fillRect(384, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { canvas: c, names: new Map() };
  return t;
}
// each stop name gets a row in the sign canvas (name totem face and wall sign); rows 128.. are used for the wall sign
function nameUV(name) {
  const t = M.sign.map, { canvas: c, names } = t.userData;
  if (!names.has(name)) {
    const g = c.getContext('2d');
    // totem face: Irish above (smaller), English below
    g.fillStyle = '#2f3337'; g.fillRect(0, 18, 256, 238);
    g.fillStyle = '#f4f4f0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'italic 30px "Segoe UI", Arial, sans-serif'; g.fillText(name, 128, 90);
    g.font = 'bold 40px "Segoe UI", Arial, sans-serif'; g.fillText(name, 128, 150);
    // wall sign
    g.fillStyle = '#2f3337'; g.fillRect(256, 128, 256, 128);
    g.fillStyle = '#c8102e'; g.fillRect(256, 128, 256, 12);
    g.fillStyle = '#f4f4f0'; g.font = 'bold 44px "Segoe UI", Arial, sans-serif'; g.fillText(name, 384, 196);
    names.set(name, true);
    t.needsUpdate = true;
  }
  return { totem: [0, 0, 256, 256], wall: [256, 128, 256, 128], screen: [256, 0, 128, 128], yellow: [384, 0, 64, 64] };
}
function hatchTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(236,236,228,0.85)'; g.lineWidth = 7;
  for (let k = -64; k < 128; k += 22) { g.beginPath(); g.moveTo(k, 64); g.lineTo(k + 64, 0); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- geometry helpers (world space) ----------
function colorize(geo, col) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
function prep(geo) { const g = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; }
// place a local geometry (x across the line to the left, y up, z along travel) at a point of the line
function put(geo, f, side, off, y = 0, along = 0) {
  const g = prep(geo.clone());
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(-f.dz * side, 0, f.dx * side), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.dx, 0, f.dz));
  m.setPosition(f.x + (-f.dz) * off * side + f.dx * along, y, f.z + f.dx * off * side + f.dz * along);
  g.applyMatrix4(m);
  if (side > 0) { // the basis is mirrored on this side: flip the winding back
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 3) for (const k of ['position', 'normal', 'uv', 'color']) {
      const a = g.attributes[k]; if (!a) continue;
      for (let c = 0; c < a.itemSize; c++) { const t = a.getComponent(i + 1, c); a.setComponent(i + 1, c, a.getComponent(i + 2, c)); a.setComponent(i + 2, c, t); }
    }
  }
  return g;
}
const uvRect = (geo, [x, y, w, h], face = null) => { // map a plane's uvs into a sign-atlas rectangle
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * w) / 512, 1 - (y + (1 - uv.getY(i)) * h) / 256);
  return geo;
};

// ---------- the kit ----------
export function buildStopKit(scene, at, cfg) {
  const mat = materials();
  const uvs = nameUV(cfg.name);
  const from = cfg.from ?? -13, to = cfg.to ?? 13, W = cfg.width ?? 2.4, TRACK = cfg.track ?? 1.8;
  const e0 = TRACK + TRAM_HALF + GAP; // platform inner edge
  const ground = [], metal = [], glass = [], signs = [], strips = [], hatch = [], wires = [];
  const frames = [];
  for (let d = from; d <= to + 1e-6; d += 1) frames.push({ d, ...at(d) });
  const F = (d) => at(d);
  for (const side of [1, -1]) {
    const sc = (cfg.sides && cfg.sides[side]) || {};
    // platform: top in lanes (white edge line, tactile strip, paving), the kerb face on the track side and the back
    const lanes = [[0, 0.1, C.line], [0.1, 0.7, C.tactile], [0.7, W, C.paving]];
    const P = (f, o, y) => [f.x - f.dz * o * side, y, f.z + f.dx * o * side];
    const quad = (list, a, b, c, d, col) => { const pos = [...a, ...b, ...c, ...a, ...c, ...d]; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); list.push(colorize(g, col)); };
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i], f1 = frames[i + 1];
      for (const [o0, o1, col] of lanes) {
        const a = P(f0, e0 + o0, PLAT_H), b = P(f1, e0 + o0, PLAT_H), c = P(f1, e0 + o1, PLAT_H), d = P(f0, e0 + o1, PLAT_H);
        side > 0 ? quad(ground, a, d, c, b, col) : quad(ground, a, b, c, d, col);
      }
      // kerb face toward the track, back face
      const k0 = P(f0, e0, 0), k1 = P(f1, e0, 0), k2 = P(f1, e0, PLAT_H), k3 = P(f0, e0, PLAT_H);
      side < 0 ? quad(ground, k0, k1, k2, k3, C.kerb) : quad(ground, k0, k3, k2, k1, C.kerb);
      const b0 = P(f0, e0 + W, 0), b1 = P(f1, e0 + W, 0), b2 = P(f1, e0 + W, PLAT_H), b3 = P(f0, e0 + W, PLAT_H);
      side < 0 ? quad(ground, b0, b3, b2, b1, C.kerb) : quad(ground, b0, b1, b2, b3, C.kerb);
    }
    // ramps at both ends
    for (const [fe, dir] of [[frames[0], -1], [frames[frames.length - 1], 1]]) {
      const tip = { x: fe.x + fe.dx * dir * 2.4, z: fe.z + fe.dz * dir * 2.4, dx: fe.dx, dz: fe.dz };
      const a = P(fe, e0, PLAT_H), b = P(fe, e0 + W, PLAT_H), c = P(tip, e0 + W, 0.02), d = P(tip, e0, 0.02);
      (side * dir < 0) ? quad(ground, a, d, c, b, C.paving) : quad(ground, a, b, c, d, C.paving);
    }
    // collision along the platform's back half (the tram side stays open)
    for (let i = 0; i < frames.length - 1; i += 4) {
      const f = frames[Math.min(i + 2, frames.length - 1)], p = P(f, e0 + W / 2, 0);
      addBox(p[0], p[2], W / 2, 2.1, Math.atan2(f.dx, f.dz));
    }
    // shelter modules: two tapered posts at 4 m, a cantilevered glass canopy 1.8 deep sloping 3.1 -> 2.9 toward the
    // track, a glass back screen with a frit band, a slatted bench, a strip light under the canopy edge
    const post = new THREE.CylinderGeometry(0.07, 0.13, 3.1, 6, 1).translate(0, PLAT_H + 1.55, 0);
    const arm = new THREE.BoxGeometry(1.9, 0.12, 0.14).translate(-0.85, 0, 0);
    for (const [d0, n] of sc.shelters || []) {
      for (let k = 0; k < n; k++) {
        const dm = d0 + k * 5 + 2.5, f = F(dm);
        const back = e0 + W - 0.35;
        for (const o of [-2, 2]) {
          metal.push(colorize(put(post, f, side, back, 0, o), C.steel));
          const armG = arm.clone(); armG.rotateZ(-0.06); metal.push(colorize(put(armG, f, side, back, PLAT_H + 3.0, o), C.steel));
        }
        const canopy = new THREE.BoxGeometry(2.0, 0.04, 5.0).rotateZ(-0.1).translate(-0.8, 0, 0);
        glass.push(put(canopy, f, side, back, PLAT_H + 3.02));
        metal.push(colorize(put(new THREE.BoxGeometry(0.08, 0.14, 5.0).translate(-1.8, 0, 0), f, side, back, PLAT_H + 2.84), C.steel));
        strips.push(put(new THREE.BoxGeometry(0.06, 0.03, 4.6).translate(-1.74, 0, 0), f, side, back, PLAT_H + 2.75));
        glass.push(put(new THREE.BoxGeometry(0.03, 2.2, 4.6), f, side, back + 0.12, PLAT_H + 1.35));
        metal.push(colorize(put(new THREE.BoxGeometry(0.035, 0.2, 4.6), f, side, back + 0.12, PLAT_H + 1.2), C.steel)); // frit band
        metal.push(colorize(put(new THREE.BoxGeometry(0.45, 0.06, 3.0), f, side, back - 0.3, PLAT_H + 0.45), C.timber));
        metal.push(colorize(put(new THREE.BoxGeometry(0.06, 0.45, 2.6), f, side, back - 0.3, PLAT_H + 0.22), C.steel));
      }
    }
    // ticket machines, validators, bin, name totem
    const along = (u) => from + (to - from) * u;
    for (const u of [0.18, 0.82]) {
      const f = F(along(u));
      metal.push(colorize(put(new THREE.BoxGeometry(0.45, 1.9, 0.9), f, side, e0 + W - 0.4, PLAT_H + 0.95), C.machine));
      signs.push(uvRect(put(new THREE.PlaneGeometry(0.62, 0.5).rotateY(-Math.PI / 2), f, side, e0 + W - 0.63, PLAT_H + 1.35), uvs.screen));
      const fv = F(along(u) + 1.4);
      metal.push(colorize(put(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), fv, side, e0 + W - 0.5, PLAT_H + 0.55), C.steel));
      signs.push(uvRect(put(new THREE.BoxGeometry(0.2, 0.25, 0.14), fv, side, e0 + W - 0.5, PLAT_H + 1.2), uvs.yellow));
    }
    { const f = F(along(0.5) + 3); metal.push(colorize(put(new THREE.CylinderGeometry(0.25, 0.22, 0.9, 8), f, side, e0 + W - 0.45, PLAT_H + 0.45), C.bin)); }
    for (const u of [0.05, 0.95]) {
      const f = F(along(u));
      metal.push(colorize(put(new THREE.BoxGeometry(0.12, 2.4, 0.56), f, side, e0 + W - 0.5, PLAT_H + 1.2), C.steel));
      signs.push(uvRect(put(new THREE.PlaneGeometry(0.5, 1.6), f, side, e0 + W - 0.5, PLAT_H + 1.55, 0.29), uvs.totem));
      signs.push(uvRect(put(new THREE.PlaneGeometry(0.5, 1.6).rotateY(Math.PI), f, side, e0 + W - 0.5, PLAT_H + 1.55, -0.29), uvs.totem));
    }
    // a low granite wall along the back edge, with the stop's name on it
    if (sc.wall) {
      for (let i = 0; i < frames.length - 1; i++) {
        const f0 = frames[i], f1 = frames[i + 1], o0 = e0 + W, o1 = e0 + W + 0.45, h = PLAT_H + 0.9;
        const a = P(f0, o0, 0), b = P(f1, o0, 0), c = P(f1, o0, h), d = P(f0, o0, h);
        side > 0 ? quad(ground, a, d, c, b, C.granite) : quad(ground, a, b, c, d, C.granite);
        const e = P(f0, o1, 0), g = P(f1, o1, 0), hh = P(f1, o1, h), k = P(f0, o1, h);
        side > 0 ? quad(ground, e, g, hh, k, C.granite) : quad(ground, e, k, hh, g, C.granite);
        side < 0 ? quad(ground, d, c, hh, k, C.granite) : quad(ground, d, k, hh, c, C.granite);
      }
      const f = F(along(0.5));
      signs.push(uvRect(put(new THREE.PlaneGeometry(1.3, 0.55).rotateY(-Math.PI / 2), f, side, e0 + W - 0.01, PLAT_H + 0.5), uvs.wall));
    }
  }
  // overhead line: poles on both platforms' back edges, a span wire across, a contact wire over each track
  if (cfg.poles) {
    const pole = new THREE.CylinderGeometry(0.12, 0.14, 7.5, 8).translate(0, 3.75, 0);
    const n = Math.max(1, Math.round((to - from) / cfg.poles));
    for (let k = 0; k <= n; k++) {
      const d = from + ((to - from) * k) / n, f = F(d), o = e0 + W - 0.2;
      for (const side of [1, -1]) metal.push(colorize(put(pole, f, side, o), C.pole));
      const L = [f.x + f.dz * o, 6.8, f.z - f.dx * o], R = [f.x - f.dz * o, 6.8, f.z + f.dx * o];
      wires.push(...L, ...R);
    }
    for (const t of [TRACK, -TRACK]) {
      for (let i = 0; i < frames.length - 1; i++) {
        const a = frames[i], b = frames[i + 1];
        wires.push(a.x - a.dz * t, 6.0, a.z + a.dx * t, b.x - b.dz * t, 6.0, b.z + b.dx * t);
      }
    }
  }
  // hatched island between the tracks
  if (cfg.hatch) {
    const pos = [], uv = [];
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i], b = frames[i + 1], h = 0.55;
      const A = [a.x - a.dz * h, 0.03, a.z + a.dx * h], B = [b.x - b.dz * h, 0.03, b.z + b.dx * h], Cc = [b.x + b.dz * h, 0.03, b.z - b.dx * h], D = [a.x + a.dz * h, 0.03, a.z - a.dx * h];
      pos.push(...A, ...D, ...Cc, ...A, ...Cc, ...B);
      const v0 = a.d / 1.1, v1 = b.d / 1.1;
      uv.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    hatch.push(g);
  }
  const group = new THREE.Group(); group.name = `Luas stop ${cfg.name}`;
  const mk = (list, m, shadow) => { if (!list.length) return; const mesh = new THREE.Mesh(mergeGeometries(list.map(prep)), m); mesh.castShadow = shadow; mesh.receiveShadow = true; group.add(mesh); };
  mk(ground, mat.ground, true); mk(metal, mat.metal, true); mk(glass, mat.glass, false); mk(signs, mat.sign, false); mk(strips, mat.strip, false); mk(hatch, mat.hatch, false);
  if (wires.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)); group.add(new THREE.LineSegments(g, mat.wire)); }
  scene.add(group);
  return group;
}

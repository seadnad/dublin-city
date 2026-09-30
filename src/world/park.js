// Phoenix Park (docs/research/phoenix-park.md): the landscape and its furniture.
//  - woods (dense clumps in the OSM wood outlines), roundels and specimen trees on the open plains, the tree rows
//    along Chesterfield Avenue (dark holm-oak clumps by Parkgate), a thick woodland belt hiding the west and north
//    cut edges of the map, the zoo's trees behind its fence, the Áras demesne behind its ha-ha;
//  - mown verges and lawns against rough meadow (a small mask texture read by the park's grass shader);
//  - Victorian gas lamps both sides of Chesterfield Avenue, low black railings behind its footpaths;
//  - the calp boundary wall along Conyngham Road and the Cabra side, the People's Flower Garden beds;
//  - the heroes from tools/blender/build_phoenixpark.py (Wellington Monument, Phoenix column, Papal Cross, the
//    Parkgate piers and lodge, the NCR gate screens and the Áras gates); Áras an Uachtaráin itself and Dublin Zoo
//    (src/world/aras-zoo.js: the house down its vista from Chesterfield Avenue, the zoo's lakes, plains and animals);
//  - a few herds of fallow deer that graze, look up and trot away from the car.
// Trees and the canopy clumps are instanced and chunked; the lamps, railings and deer are one or two draws each.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, rawData, project, v2, pointInPolygon, insetPolygon, closestOnSegment } from './geo.js';
import { fieldAt, KERB_H, FIELD_GLSL, fieldUniforms } from './roads.js';
import { rng } from './textures.js';
import { chunkedInstances } from './chunks.js';
import { plantTrees } from './trees.js';
import { placeParts } from './heroes.js';
import { addBox, addPolyline } from '../game/collision.js';
import { addReflections } from '../render/reflect.js';
import { LITE } from '../render/quality.js';
import { batchStatic } from '../render/batch.js';
import { aras, arasOpen, arasFrameTrees, vistaLawn, zooSouthPoly, zooOpen, islandClumps, buildZooGround, buildAnimals, zooParts, addHeroCollision } from './aras-zoo.js';

const DATA = rawData.parkFeatures && rawData.parkFeatures['Phoenix Park'];
const GREEN = world.greens.find((g) => g.name === 'Phoenix Park');
const P = ([lat, lon]) => project(lat, lon);
const B = world.bounds;

// ---------- where things are (game coordinates) ----------
export const park = DATA && GREEN ? (() => {
  const ringWays = world.ways.filter((w) => w.roundabout === 'PX21');
  const centre = world.nodes.get('PX21');
  let ringR = 0;
  for (const w of ringWays) for (const p of w.pts) ringR = Math.max(ringR, v2.len(v2.sub(p, centre)));
  return {
    poly: GREEN.poly,
    wellington: P(DATA.wellington), phoenix: { x: centre.x, z: centre.z }, papalCross: P(DATA.papalCross),
    aras: P(DATA.aras), arasGate: P(DATA.arasGate), deerfield: P(DATA.deerfield), bandstand: P(DATA.bandstand),
    zoo: DATA.zoo.map(P), demesne: DATA.arasDemesne.map(P), fort: DATA.magazineFort.map(P), woods: DATA.woods.map((w) => w.map(P)),
    ringR, ringWays,
    // the island inside the roundabout: the ring's inner kerb less a margin
    islandR: ringR * Math.cos(Math.PI / 8) - (ringWays[0] ? ringWays[0].width / 2 : 4) - 0.6,
  };
})() : null;

const ponds = world.docks.filter((d) => /Pond|pond/.test(d.name)).map((d) => d.poly);
const inPond = (p, pad = 0) => ponds.some((poly) => pointInPolygon(p, pad ? insetPolygon(poly, -pad) : poly));

// ---------- a mask over the park: R = woodland floor, G = mown lawn ----------
const MASK_RES = 2; // m per texel
function buildMask() {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of park.poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  x0 -= 8; z0 -= 8; x1 += 8; z1 += 8;
  const W = Math.ceil((x1 - x0) / MASK_RES), H = Math.ceil((z1 - z0) / MASK_RES);
  const r = new Float32Array(W * H), g = new Float32Array(W * H);
  const fill = (poly, arr, v = 1) => {
    for (let j = 0; j < H; j++) {
      const z = z0 + (j + 0.5) * MASK_RES, xs = [];
      for (let e = 0, f = poly.length - 1; e < poly.length; f = e++) {
        const a = poly[e], b = poly[f];
        if ((a.z > z) !== (b.z > z)) xs.push(a.x + ((z - a.z) / (b.z - a.z)) * (b.x - a.x));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let i = Math.max(0, Math.floor((xs[k] - x0) / MASK_RES)); i <= Math.min(W - 1, Math.floor((xs[k + 1] - x0) / MASK_RES)); i++) arr[j * W + i] = Math.max(arr[j * W + i], v);
      }
    }
  };
  return { x0, z0, W, H, r, g, fill };
}

// ---------- tree palette ----------
const C = (h) => new THREE.Color(h);
// canopy clump colours (multiplied by the clump's own light-to-dark vertex shading)
const CLUMP = { mixed: [C(0x4f7a30), C(0x5a8434), C(0x44692a), C(0x62893a), C(0x3d6128)], dark: [C(0x2a3d20), C(0x31452a), C(0x283a1f)] };
const HOLM = new THREE.Color(0.6, 0.7, 0.55); // tint on the lime model: a very dark, dense evergreen

// A canopy clump: a lumpy crown (one or two displaced icosahedra) on a short trunk, shaded darker underneath.
// ~90-170 triangles; used by the hundred for woods and belts where individual trees can't be told apart.
function clumpGeometry(seed, lumps) {
  const r = rng(seed);
  const parts = [];
  for (let k = 0; k < lumps; k++) {
    let g = new THREE.IcosahedronGeometry(1, k === 0 ? 1 : 0); // the second lump coarser: ~110 triangles a clump
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const s = 1 + (r() - 0.5) * 0.38;
      p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.82, p.getZ(i) * s);
    }
    const sc = k === 0 ? 1 : 0.7, a = r() * 6.28;
    // low, broad crowns: from the road a wood is a wall of leaves down to head height, not a row of trunks
    g.scale(5.2 * sc, 5.4 * sc, 5.2 * sc).translate(k ? Math.cos(a) * 3.4 : 0, k ? 4.6 : 6.6, k ? Math.sin(a) * 3.4 : 0);
    parts.push(g);
  }
  const trunk = new THREE.CylinderGeometry(0.22, 0.34, 4, 5, 1, true).translate(0, 2, 0);
  trunk.deleteAttribute('uv');
  const crown = mergeGeometries(parts);
  crown.computeVertexNormals();
  // soft foliage lighting: bend normals up and out so the shadow side isn't black
  const n = crown.attributes.normal;
  for (let i = 0; i < n.count; i++) { const v = new THREE.Vector3(n.getX(i), n.getY(i) + 0.55, n.getZ(i)).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  const col = (g, f) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = f(p.getY(i)); c.set([v, v, v], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); };
  col(crown, (y) => 0.45 + 0.55 * THREE.MathUtils.smoothstep(y, 2, 12.5));
  col(trunk, () => 0.28); // dark bark under the canopy (instance colour multiplies it too)
  return mergeGeometries([crown.toNonIndexed(), trunk.toNonIndexed()]);
}

// ---------- gas lamp (Chesterfield Avenue) ----------
// fluted flared base, slender shaft, ladder crossbar, tapered four-sided lantern with a crown and finial (~5 m)
function gasLampGeometry() {
  const parts = [
    new THREE.CylinderGeometry(0.2, 0.27, 0.35, 8).translate(0, 0.17, 0),
    new THREE.CylinderGeometry(0.12, 0.2, 0.8, 8).translate(0, 0.75, 0),
    new THREE.CylinderGeometry(0.15, 0.15, 0.07, 8).translate(0, 1.18, 0),
    new THREE.CylinderGeometry(0.055, 0.075, 2.2, 6).translate(0, 2.3, 0),
    new THREE.CylinderGeometry(0.09, 0.07, 0.14, 6).translate(0, 3.45, 0),     // collar
    new THREE.BoxGeometry(0.72, 0.045, 0.045).translate(0, 3.55, 0),          // ladder bar
    new THREE.CylinderGeometry(0.05, 0.08, 0.3, 6).translate(0, 3.72, 0),
    new THREE.CylinderGeometry(0.12, 0.1, 0.08, 4).rotateY(Math.PI / 4).translate(0, 3.9, 0), // lantern floor
    new THREE.ConeGeometry(0.34, 0.28, 4).rotateY(Math.PI / 4).translate(0, 4.8, 0),         // crown
    new THREE.CylinderGeometry(0.02, 0.05, 0.24, 5).translate(0, 5.05, 0),                   // finial
    new THREE.SphereGeometry(0.045, 5, 3).translate(0, 5.18, 0),
  ];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) parts.push(new THREE.BoxGeometry(0.025, 0.72, 0.025).translate(sx * 0.17, 4.3, sz * 0.17)); // glazing bars
  const frame = mergeGeometries(parts.map((g) => { g.deleteAttribute('uv'); return g.toNonIndexed(); }));
  const glass = new THREE.CylinderGeometry(0.25, 0.14, 0.72, 4, 1, true).rotateY(Math.PI / 4).translate(0, 4.3, 0);
  return { frame, glass };
}

// ---------- canvas textures ----------
function canvasTex(w, h, paint, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
// coursed rough-hewn Dublin calp: dark blue-grey rubble with pale mortar
function calpTexture() {
  const r = rng(907);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8e8c84'; g.fillRect(0, 0, w, h); // lime mortar
    let y = 0;
    while (y < h) {
      const ch = 16 + r() * 14;
      let x = -r() * 30;
      while (x < w) {
        const sw = 22 + r() * 38, l = 36 + r() * 12;
        g.fillStyle = `hsl(${205 + r() * 25}, ${5 + r() * 5}%, ${l}%)`;
        // rough-hewn: each stone an irregular polygon inside its slot
        const j = () => (r() - 0.5) * 4;
        g.beginPath(); g.moveTo(x + 2 + j(), y + 2 + j()); g.lineTo(x + sw - 2 + j(), y + 2 + j()); g.lineTo(x + sw - 1 + j(), y + ch * 0.5);
        g.lineTo(x + sw - 2 + j(), y + ch - 2 + j()); g.lineTo(x + 2 + j(), y + ch - 2 + j()); g.lineTo(x + 1 + j(), y + ch * 0.5); g.fill();
        x += sw;
      }
      y += ch;
    }
    g.globalAlpha = 0.25; g.fillStyle = '#2d302c';
    for (let k = 0; k < 900; k++) g.fillRect(r() * w, r() * h, 2, 2);
    g.globalAlpha = 1;
  });
}
// bedding plants: dense speckle in a neutral light tone (tinted per bed by vertex colour) with green between
function flowersTexture() {
  const r = rng(51);
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4a6a30'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 1400; k++) {
      const l = 70 + r() * 30;
      g.fillStyle = `hsl(0, 0%, ${l}%)`;
      g.beginPath(); g.arc(r() * w, r() * h, 1.2 + r() * 1.6, 0, 6.29); g.fill();
    }
  });
}
// fallow deer coat: fawn with rows of white spots along the flanks, pale belly (a cheap UV-less trick: the coat is
// mapped by the body's own box UVs)
function coatTexture() {
  const r = rng(77);
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,1)';
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#bdbdbd'); grd.addColorStop(0.65, '#ffffff'); grd.addColorStop(1, '#ffffff');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 14; k++) {
      g.fillStyle = 'rgba(255,250,240,0.95)';
      g.beginPath(); g.arc(4 + k * 9 + r() * 3, 12 + row * 9 + r() * 3, 1.6 + r() * 0.8, 0, 6.29); g.fill();
    }
  }, false);
}

// ---------- the park grass: mown verges and lawns, rough meadow, dark woodland floor ----------
export function parkGrassMaterial(base) {
  if (!park) return base;
  const m = base.clone();
  const mask = parkMask();
  const uni = { uParkMask: { value: mask.tex }, uParkOrigin: { value: new THREE.Vector2(mask.x0, mask.z0) }, uParkSize: { value: new THREE.Vector2(mask.W * MASK_RES, mask.H * MASK_RES) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, fieldUniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vWXZ;\nuniform sampler2D uParkMask; uniform vec2 uParkOrigin; uniform vec2 uParkSize;\n${FIELD_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec4 pm = texture2D(uParkMask, (vWXZ - uParkOrigin) / uParkSize);
          float fk = kerbField(vWXZ);
          // mown: verges along the roads and the lawns in the mask; meadow in patches everywhere else
          float mown = max(pm.g, 1.0 - smoothstep(9.0, 26.0, fk));
          float patches = fbm2(vWXZ * 0.018);
          float meadow = (1.0 - mown) * smoothstep(0.25, 0.6, patches + 0.12);
          diffuseColor.rgb *= mix(vec3(0.9, 0.98, 0.84), vec3(1.45, 1.18, 0.55), meadow);
          // mowing stripes on the lawns
          diffuseColor.rgb *= 1.0 + 0.03 * pm.g * sign(sin(vWXZ.x * 0.35 + vWXZ.y * 0.2));
          // woodland floor under the clumps: dark leaf litter and shade
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.36, 0.34, 0.28), pm.r);
        }`);
  };
  m.userData.syncFrom = base; // wet-weather tuning happens on the base material; copied over each frame
  parkGrassMats.push(m);
  return m;
}
const parkGrassMats = [];

let maskCache = null;
function parkMask() {
  if (maskCache) return maskCache;
  const m = buildMask();
  const L = layout();
  for (const w of L.woodPolys) m.fill(w, m.r, 1);
  for (const z of L.zooPolys) m.fill(z, m.r, 0.55);
  for (const b of L.beltPolys) m.fill(b, m.r, 1);
  for (const lawn of L.lawns) m.fill(lawn, m.g, 1);
  // soften the edges (two box-blur passes)
  const blur = (a) => {
    const o = new Float32Array(a.length);
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
      let s = 0, n = 0;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= m.W || jj >= m.H) continue;
        s += a[jj * m.W + ii]; n++;
      }
      o[j * m.W + i] = s / n;
    }
    return o;
  };
  const r = blur(blur(m.r)), g = blur(m.g);
  const data = new Uint8Array(m.W * m.H * 4);
  for (let k = 0; k < m.W * m.H; k++) { data[k * 4] = Math.min(255, r[k] * 255); data[k * 4 + 1] = Math.min(255, g[k] * 255); data[k * 4 + 3] = 255; }
  const tex = new THREE.DataTexture(data, m.W, m.H, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  maskCache = { ...m, tex };
  return maskCache;
}

// ---------- layout: the polygons the trees and lawns come from ----------
let layoutCache = null;
function layout() {
  if (layoutCache) return layoutCache;
  const woodPolys = park.woods;
  const zooPolys = [park.zoo, zooSouthPoly];
  // the belts hiding the map's cut edges: everything within D of the west or north edge of the map
  const D = 70;
  const beltPolys = [
    [{ x: B.minX - 5, z: B.minZ - 5 }, { x: B.minX + D, z: B.minZ - 5 }, { x: B.minX + D, z: B.maxZ }, { x: B.minX - 5, z: B.maxZ }],
    [{ x: B.minX - 5, z: B.minZ - 5 }, { x: -1700, z: B.minZ - 5 }, { x: -1700, z: B.minZ + D }, { x: B.minX - 5, z: B.minZ + D }],
  ];
  // mown lawns: round the Wellington Monument, the People's Garden, the Áras lawns inside the demesne, the island
  const circle = (c, r, n = 20) => Array.from({ length: n }, (_, k) => ({ x: c.x + Math.cos((k / n) * 6.283) * r, z: c.z + Math.sin((k / n) * 6.283) * r }));
  const pond = ponds[0];
  const pondC = pond ? pond.reduce((a, p) => ({ x: a.x + p.x / pond.length, z: a.z + p.z / pond.length }), { x: 0, z: 0 }) : null;
  const lawns = [circle(park.wellington, 48), circle(park.papalCross, 22), park.demesne, vistaLawn()];
  if (pondC) lawns.push(circle({ x: pondC.x + 22, z: pondC.z + 6 }, 62));
  layoutCache = { woodPolys, zooPolys, beltPolys, lawns, pondC };
  return layoutCache;
}

// ---------- build ----------
export function buildPark(scene) {
  if (!park) return null;
  const t0 = performance.now();
  const rand = rng(1747);
  const L = layout();
  const statics = new THREE.Group(); statics.name = 'Phoenix Park';
  const inGreen = (p) => pointInPolygon(p, park.poly);
  const inAny = (p, polys) => polys.some((poly) => pointInPolygon(p, poly));
  const inBelt = (p) => p.x < B.minX + 70 || (p.z < B.minZ + 70 && p.x < -1700);

  // places kept open: the monuments, the gates, the herds' grazing and the People's Garden beds
  const keep = [
    [park.wellington, 36], [park.phoenix, park.ringR + 16], [park.papalCross, 40], [park.arasGate, 26],
    [park.bandstand, 10], ...(L.pondC ? [[{ x: L.pondC.x + 30, z: L.pondC.z + 4 }, 30]] : []),
  ];
  const herds = herdSites(park, L);
  for (const h of herds) keep.push([h, h.r]);
  const kept = (p, pad = 0) => keep.some(([c, r]) => (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < (r + pad) ** 2);
  const ground = (p, clear) => inGreen(p) && fieldAt(p.x, p.z) > clear && !inPond(p, 3);

  const trees = [];   // modelled trees: { x, z, s, species?, tint? }
  const clumps = [];  // canopy clumps: { x, z, s, rot, c }
  const near = (list, p, d) => list.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < d * d);
  const addTree = (p, s, species, tint) => { trees.push({ x: p.x, z: p.z, s, species, tint }); };
  const addClump = (p, s, dark) => {
    const pal = dark ? CLUMP.dark : CLUMP.mixed;
    clumps.push({ x: p.x, z: p.z, s, rot: rand() * 6.28, c: pal[Math.floor(rand() * pal.length)] });
  };
  const bboxOf = (poly) => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); } return { x0, x1, z0, z1 }; };
  // fill a polygon with clumps on a jittered grid
  const fillClumps = (poly, step, { clear = 4.5, dark = false, test = null, s0 = 0.85, s1 = 1.3 } = {}) => {
    const b = bboxOf(poly);
    for (let z = b.z0 + step / 2; z < b.z1; z += step) for (let x = b.x0 + step / 2; x < b.x1; x += step) {
      const p = { x: x + (rand() - 0.5) * step * 0.8, z: z + (rand() - 0.5) * step * 0.8 };
      if (!pointInPolygon(p, poly) || !ground(p, clear) || kept(p) || (test && !test(p))) continue;
      addClump(p, s0 + rand() * (s1 - s0), dark);
    }
  };
  // modelled trees round the edge of a polygon (the fringe you actually see from the road)
  const fringe = (poly, step, inset, { clear = 4, s0 = 0.8, s1 = 1.1, species = null, tint = null } = {}) => {
    const ring = insetPolygon(poly, inset);
    for (let k = 0; k < ring.length; k++) {
      const a = ring[k], b = ring[(k + 1) % ring.length], len = v2.len(v2.sub(b, a));
      for (let t = rand() * step; t < len; t += step * (0.75 + rand() * 0.5)) {
        const q = v2.lerp(a, b, t / len), p = { x: q.x + (rand() - 0.5) * 3, z: q.z + (rand() - 0.5) * 3 };
        if (!ground(p, clear) || kept(p) || near(trees, p, step * 0.55)) continue;
        addTree(p, s0 + rand() * (s1 - s0), species, tint);
      }
    }
  };

  const dense = LITE ? 1.25 : 1; // Low / Battery saver: fewer, bigger clumps (the woods read the same from the road)
  // 1. woods: modelled trees on the fringe, canopy clumps inside
  for (const w of L.woodPolys) {
    fringe(w, 10, 3);
    fillClumps(insetPolygon(w, 5), 7.5 * dense, { s0: 0.9 * dense, s1: 1.35 * dense });
  }
  // 2. the belts along the map's cut edges: deep, dense and dark, a fringe of modelled trees on the park side
  for (const b of L.beltPolys) fillClumps(b, 7 * dense, { clear: 4, test: (p) => inGreen(p) || p.x < B.minX + 70 || p.z < B.minZ + 70, s0: 1 * dense, s1: 1.45 * dense });
  {
    const edgeW = [{ x: B.minX + 72, z: B.minZ + 72 }, { x: B.minX + 72, z: B.maxZ }];
    const edgeN = [{ x: -1700, z: B.minZ + 72 }, { x: B.minX + 72, z: B.minZ + 72 }];
    for (const [a, b] of [edgeW, edgeN]) {
      const len = v2.len(v2.sub(b, a));
      for (let t = 0; t < len; t += 9 + rand() * 4) {
        const q = v2.lerp(a, b, t / len), p = { x: q.x + (rand() - 0.5) * 6, z: q.z + (rand() - 0.5) * 6 };
        if (ground(p, 4) && !kept(p)) addTree(p, 0.95 + rand() * 0.3);
      }
    }
  }
  // 3. the zoo: its trees behind the fence
  for (const z of L.zooPolys) {
    fillClumps(insetPolygon(z, 4), 11 * dense, { s0: 0.8, s1: 1.2 });
    fringe(z, 12, 6);
  }
  for (const p of islandClumps(rand)) addClump(p, 0.75 + rand() * 0.3);
  // 4. the Áras demesne: a belt of trees inside the ha-ha, open lawns in the middle
  {
    const dm = park.demesne, inner = insetPolygon(dm, 16);
    fillClumps(dm, 8 * dense, { test: (p) => !pointInPolygon(p, inner) && (p.x - park.arasGate.x) ** 2 + (p.z - park.arasGate.z) ** 2 > 45 * 45 });
  }
  // 5. belt of trees inside the boundary wall on the Cabra side and along Conyngham Road
  const wallRuns = boundaryWallRuns();
  for (const run of wallRuns) {
    for (let k = 0; k + 1 < run.length; k++) {
      const a = run[k], b = run[k + 1], len = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a)), n = inwardNormal(a, b);
      for (let t = rand() * 8; t < len; t += 8 + rand() * 6) {
        const depth = 5 + rand() * 12;
        const p = { x: a.x + d.x * t + n.x * depth, z: a.z + d.z * t + n.z * depth };
        if (!ground(p, 5) || kept(p) || near(trees, p, 6) || near(clumps, p, 5)) continue;
        if (rand() < 0.45) addTree(p, 0.85 + rand() * 0.3); else addClump(p, 0.9 + rand() * 0.35);
      }
    }
  }
  // 6. Chesterfield Avenue: rows of lime and horse chestnut behind the railings, dark holm oaks by Parkgate
  const avenue = world.ways.filter((w) => w.lamps === 'gas' && w.type === 'primary');
  const gate = world.nodes.get('PX10');
  for (const way of avenue) {
    for (let k = 0; k + 1 < way.pts.length; k++) {
      const a = way.pts[k], b = way.pts[k + 1], len = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a)), n = { x: -d.z, z: d.x };
      for (const side of [-1, 1]) {
        for (let t = 6 + rand() * 4; t < len - 4; t += 11 + rand() * 3) {
          const base = { x: a.x + d.x * t, z: a.z + d.z * t };
          const fromGate = v2.len(v2.sub(base, gate));
          const holm = fromGate < 190;
          for (const off of holm ? [15, 21] : [15]) {
            const o = off + (rand() - 0.5) * 2;
            const p = { x: base.x + n.x * side * o, z: base.z + n.z * side * o };
            if (!ground(p, 6) || kept(p, -6) || near(trees, p, 7)) continue;
            if (holm) addTree(p, 0.95 + rand() * 0.25, 'lime', HOLM);
            else addTree(p, 0.85 + rand() * 0.25, rand() < 0.3 ? 'chestnut' : 'lime'); // horse chestnut is the heaviest model: lime carries the rows
          }
          // behind the rows, canopy clumps thicken the avenue into the wall of trees of refs 05-06 (cheap: ~110 tris each)
          for (const off of [24, 31]) {
            if (rand() < 0.35) continue;
            const o = off + (rand() - 0.5) * 4;
            const p = { x: base.x + n.x * side * o, z: base.z + n.z * side * o };
            if (!ground(p, 8) || kept(p, -4) || near(trees, p, 6) || near(clumps, p, 6)) continue;
            addClump(p, 0.95 + rand() * 0.35, holm);
          }
        }
      }
    }
  }
  // 7. roundels (clumps of 4-9 trees ringed round a centre) and single specimen trees on the open plains
  const openPlain = (p, clear) => ground(p, clear) && !kept(p, 8) && !inAny(p, L.woodPolys) && !inAny(p, L.zooPolys) && !pointInPolygon(p, park.demesne) && !inBelt(p);
  const bb = bboxOf(park.poly);
  const rp = () => ({ x: bb.x0 + rand() * (bb.x1 - bb.x0), z: bb.z0 + rand() * (bb.z1 - bb.z0) });
  let roundels = 0, singles = 0;
  for (let tries = 0; tries < 4000 && roundels < 34; tries++) {
    const c = rp();
    if (!openPlain(c, 30) || near(trees, c, 40)) continue;
    const n = 4 + Math.floor(rand() * 6), R = 4 + n * 0.9;
    const sp = rand() < 0.3 ? 'chestnut' : rand() < 0.6 ? 'lime' : 'plane';
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 6.283 + rand() * 0.5, r = R * (0.5 + rand() * 0.6);
      addTree({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, 0.8 + rand() * 0.35, rand() < 0.7 ? sp : null);
    }
    if (n > 6) addClump(c, 1.1);
    roundels++;
  }
  for (let tries = 0; tries < 4000 && singles < 70; tries++) {
    const p = rp();
    if (!openPlain(p, 14) || near(trees, p, 22)) continue;
    addTree(p, 0.95 + rand() * 0.4); singles++;
  }
  // 8. the People's Garden: a cedar and willows by the pond, specimen trees on its lawns
  if (L.pondC) {
    const c = L.pondC;
    for (const [dx, dz, sp, tint] of [[-34, -16, 'plane', C(0x6d8f86)], [-20, 16, 'birch', C(0xc9e08a)], [8, -14, 'birch', C(0xc9e08a)], [52, -26, 'lime', null], [60, 26, 'chestnut', null], [-6, 34, 'plane', null]]) {
      const p = { x: c.x + dx, z: c.z + dz };
      if (ground(p, 4) && !inPond(p, 2)) addTree(p, 1.05, sp, tint);
    }
  }

  // keep the Áras, its forecourt and its vista open, and the zoo's lakes, plains, houses and animals
  const open = (p) => arasOpen(p) || (inAny(p, L.zooPolys) && zooOpen(p));
  const prune = (list) => { let k = 0; for (const t of list) if (!open(t)) list[k++] = t; list.length = k; };
  prune(trees); prune(clumps);
  for (const t of arasFrameTrees()) addTree(t, t.s, t.species, t.dark ? HOLM : null);

  // --- plant them ---
  const item = (t) => ({ x: t.x, y: KERB_H, z: t.z, rot: rand() * 6.28, s: t.s, species: t.species, tint: t.tint });
  const planting = plantTrees(scene, trees.map(item), { chestnut: 1.2, lime: 4, plane: 1.5, birch: 0.6, young: 1 }, rand);
  // canopy clumps: one geometry (two lumps; rotation and scale vary it), in big blocks (a few draws for all of them)
  const clumpMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const clumpGeo = clumpGeometry(29, 2);
  scene.add(chunkedInstances(clumpGeo, clumpMat, clumps.map((c) => ({ ...c, y: KERB_H })), { size: 400, shadow: !LITE, colors: (it) => it.c })); // Low / Battery saver: the woods' clumps cast no sun shadow
  // distance LOD for the modelled trees: beyond LOD_FAR a block of trees (5 species x bark and leaves: up to ten
  // draws and ~1.5k triangles a tree) swaps for the same trees as canopy clumps in their leaf colour (one draw)
  const lod = treeLod(scene, planting, clumpGeo, clumpMat);
  // trunks you can hit (clumps in the woods too: you can drive into the trees, but not through them)
  for (const t of trees) addBox(t.x, t.z, 0.35, 0.35, 0);
  for (const c of clumps) addBox(c.x, c.z, 0.35 * c.s, 0.35 * c.s, 0);

  // --- railings, walls, fences ---
  const iron = addReflections(new THREE.MeshStandardMaterial({ color: 0x1b1e1f, roughness: 0.45 }), 0.5);
  const whiteIron = new THREE.MeshStandardMaterial({ color: 0xe9e6de, roughness: 0.5 });
  const rail = railingBuilder();
  // Chesterfield: low post-and-bar railings behind both footpaths
  for (const way of avenue) {
    for (const side of [-1, 1]) {
      const off = side * (way.width / 2 + way.pave + 0.35);
      const pts = offsetLine(way.pts, off);
      rail.along(pts, { h: 1.05, step: 2.4, ok: (p) => clearOfOtherRoads(p, way, 0.6) && !kept(p, -20) && v2.len(v2.sub(p, gate)) > 24 });
    }
  }
  // the zoo's railing (with a hedge behind it) and the Áras ha-ha railing (white near the gates)
  const gateGap = (p) => (p.x - zooParts.zooentrance.x) ** 2 + (p.z - zooParts.zooentrance.z) ** 2 > 20 * 20;
  const zooRings = L.zooPolys.map((z) => [...z, z[0]]);
  for (const ring of zooRings) rail.along(ring, { h: 1.9, step: 2.6, ok: (p) => ground(p, 1.5) && gateGap(p) });
  const dmRing = [...park.demesne, park.demesne[0]];
  const nearArasGate = (p) => (p.x - park.arasGate.x) ** 2 + (p.z - park.arasGate.z) ** 2 < 50 * 50;
  rail.along(dmRing, { h: 1.2, step: 2.6, ok: (p) => ground(p, 1.5) && !nearArasGate(p) });
  const whiteRail = railingBuilder();
  whiteRail.along(dmRing, { h: 1.3, step: 2.2, ok: (p) => ground(p, 1.5) && nearArasGate(p) && (p.x - park.arasGate.x) ** 2 + (p.z - park.arasGate.z) ** 2 > 9 * 9 });
  scene.add(...rail.meshes(iron), ...whiteRail.meshes(whiteIron));
  for (const ring of zooRings) statics.add(hedge(ring, (p) => ground(p, 2.5) && gateGap(p)));
  // the ha-ha's sunk wall: a low stone face under the railing
  const calp = new THREE.MeshStandardMaterial({ map: calpTexture(), roughness: 0.92 });
  const coping = new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.85 });
  statics.add(wallMesh(splitRuns(dmRing, (p) => ground(p, 1.5)), 0.55, 0.5, calp, coping, false));
  // the park wall: calp rubble with a coping, along Conyngham Road and the Cabra / North Circular side
  statics.add(wallMesh(wallRuns, 2.3, 0.55, calp, coping, true));
  // the Deerfield (US Ambassador's Residence) wall, a short run facing Chesterfield
  // People's Garden bedding
  if (L.pondC) statics.add(flowerBeds(L.pondC, ground, rand));
  // road closed at the west cut: a field gate across Chesterfield Avenue at the woodland belt
  statics.add(roadEndGates(whiteIron));

  // --- gas lamps ---
  const lamps = gasLamps(scene);

  // --- heroes ---
  const heroSite = { parts: heroParts() };
  const heroesReady = placeParts(scene, 'phoenixpark', heroSite, 'Phoenix Park heroes');
  for (const b of heroSolids(heroSite.parts)) addBox(b.x, b.z, b.hx, b.hz, b.rot);
  // Áras an Uachtaráin and the zoo's buildings (tools/blender/build_aras.py), batched by material: ~20 draws for all
  const arasSite = { parts: { aras: { x: aras.x, z: aras.z, rot: aras.rot }, ...zooParts } };
  const arasReady = placeParts(scene, 'aras', arasSite, 'Áras an Uachtaráin and Dublin Zoo').then((g) => g && batchStatic(scene, [g], { name: 'Áras and zoo (batched)' }));
  addHeroCollision(zooParts);
  const zooGround = buildZooGround(scene);
  const animals = buildAnimals(scene);

  // --- deer ---
  const deer = buildDeer(scene, herds, ground);

  console.log(`Phoenix Park: ${trees.length} trees, ${clumps.length} clumps, ${lamps.spots.length} gas lamps, ${deer.count} deer, ${animals.count} zoo animals (${animals.triangles} tris), ${zooGround.rocks} rocks in ${Math.round(performance.now() - t0)} ms`);
  return {
    group: statics, trees: trees.length, clumps: clumps.length, clumpItems: clumps, lampSpots: lamps.spots, heroesReady, arasReady,
    setNight(level) { lamps.setLevel(level); },
    update(dt, time, car, camera) {
      if (camera) lod.update(camera);
      for (const m of parkGrassMats) { const b = m.userData.syncFrom; m.color.copy(b.color); m.roughness = b.roughness; }
      deer.update(dt, time, car);
    },
  };
}

// ---------- tree LOD ----------
const LEAF = { plane: 0x5f8a3a, lime: 0x6a943e, chestnut: 0x4a7431, birch: 0x86a54c, young: 0x6b9a42 };
const LOD_FAR = LITE ? 120 : 200, LOD_CELL = 250; // LOD_CELL: trees.js blocks heavy meshes on a 250 m grid
function treeLod(scene, planting, geo, mat) {
  const col = new THREE.Color();
  const proxies = chunkedInstances(geo, mat, planting.items.map((it) => ({ ...it, s: it.s * 0.95 })), {
    size: LOD_CELL, shadow: true,
    colors: (it) => col.setHex(LEAF[it.species] || LEAF.lime).multiplyScalar(1.15).multiply(it.tint || new THREE.Color(1, 1, 1)),
  });
  scene.add(proxies);
  const key = (m) => { const c = m.boundingSphere.center; return `${Math.floor(c.x / LOD_CELL)},${Math.floor(c.z / LOD_CELL)}`; };
  let indexed = null, cells = null;
  const index = () => {
    cells = new Map();
    const cell = (k, m) => { if (!cells.has(k)) cells.set(k, { glb: [], proxy: [], c: m.boundingSphere.center.clone(), r: m.boundingSphere.radius }); return cells.get(k); };
    for (const m of proxies.children) cell(key(m), m).proxy.push(m);
    for (const g of planting.groups) for (const m of g.children) if (m.isInstancedMesh) cell(key(m), m).glb.push(m);
    indexed = planting.groups;
  };
  return {
    update(camera) {
      if (indexed !== planting.groups) index();
      const p = camera.position;
      for (const c of cells.values()) {
        const far = Math.hypot(c.c.x - p.x, c.c.z - p.z) - c.r > LOD_FAR;
        for (const m of c.glb) m.visible = !far;
        for (const m of c.proxy) m.visible = far;
      }
    },
  };
}

// ---------- helpers ----------
function offsetLine(pts, d) {
  // plain per-segment offset with mitred joins (the avenue is nearly straight)
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = v2.norm(v2.sub(b, a));
    out.push({ x: pts[i].x - t.z * d, z: pts[i].z + t.x * d });
  }
  return out;
}
function clearOfOtherRoads(p, way, pad) {
  for (const s of world.segsNear(p.x, p.z)) {
    if (s.way === way || (s.way.name === way.name && !s.way.roundabout)) continue;
    const c = closestOnSegment(p, s.a, s.b);
    if (Math.sqrt(c.d2) < s.way.width / 2 + s.way.pave + pad) return false;
  }
  return true;
}
function splitRuns(pts, ok, step = 2) {
  const runs = []; let cur = [];
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k], b = pts[k + 1], len = v2.len(v2.sub(b, a));
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 0; i <= n; i++) {
      if (i === 0 && k > 0) continue;
      const p = v2.lerp(a, b, i / n);
      if (ok(p)) cur.push(p);
      else { if (cur.length > 1) runs.push(cur); cur = []; }
    }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}
function inwardNormal(a, b) {
  const d = v2.norm(v2.sub(b, a));
  const m = v2.lerp(a, b, 0.5), n = { x: -d.z, z: d.x };
  return pointInPolygon({ x: m.x + n.x * 2, z: m.z + n.z * 2 }, park.poly) ? n : { x: -n.x, z: -n.z };
}
// The park wall: the real boundary edges of the green outline (not the map-edge cuts), each point pushed into the park
// until it clears the road and its footpath; where a road crosses (the gates) no clear point is found and the wall
// breaks.
function boundaryWallRuns() {
  const poly = park.poly, n = poly.length;
  const pts = [];
  // edges 1 .. n-3 are real park boundary (the last two and the first are the cut edges at the map's west and north)
  const runs = []; let cur = [];
  const flush = () => { if (cur.length > 1) runs.push(cur); cur = []; };
  for (let k = 1; k < n - 2; k++) {
    const a = poly[k], b = poly[k + 1], len = v2.len(v2.sub(b, a)), nn = inwardNormal(a, b);
    const steps = Math.max(1, Math.ceil(len / 3));
    for (let i = 0; i < steps; i++) {
      const q = v2.lerp(a, b, i / steps);
      let found = null;
      for (let d = 0; d <= 22; d += 0.5) {
        const p = { x: q.x + nn.x * d, z: q.z + nn.z * d };
        if (fieldAt(p.x, p.z) > (d === 0 ? 4.2 : 4.0) && !inPond(p)) { found = p; break; }
      }
      if (!found || (cur.length && v2.len(v2.sub(found, cur[cur.length - 1])) > 9)) flush();
      if (found) cur.push(found);
    }
  }
  flush();
  // smooth the pushed-in points a little so the wall doesn't zigzag along curved kerbs
  for (const r of runs) for (let pass = 0; pass < 2; pass++) for (let i = 1; i < r.length - 1; i++) r[i] = { x: (r[i - 1].x + r[i].x * 2 + r[i + 1].x) / 4, z: (r[i - 1].z + r[i].z * 2 + r[i + 1].z) / 4 };
  void pts;
  return runs.filter((r) => r.length > 2);
}

// Posts and two rails, as two instanced meshes (unit boxes scaled per instance).
function railingBuilder() {
  const posts = [], rails = [];
  return {
    along(pts, { h, step, ok }) {
      for (const run of splitRuns(pts, ok, step)) {
        for (let i = 0; i < run.length; i++) {
          const p = run[i];
          posts.push({ x: p.x, y: KERB_H + h / 2, z: p.z, s: new THREE.Vector3(0.055, h, 0.055) });
          if (i + 1 < run.length) {
            const q = run[i + 1], m = v2.lerp(p, q, 0.5), len = v2.len(v2.sub(q, p)), rot = Math.atan2(q.x - p.x, q.z - p.z);
            for (const y of [h - 0.06, 0.22]) rails.push({ x: m.x, y: KERB_H + y, z: m.z, rot, s: new THREE.Vector3(0.045, 0.045, len) });
            // a thin bar between posts on the taller fences
            if (h > 1.5) rails.push({ x: m.x, y: KERB_H + h / 2, z: m.z, rot, s: new THREE.Vector3(0.03, h - 0.3, 0.03) });
          }
          addBox(p.x, p.z, 0.08, 0.08, 0);
        }
        addPolyline(run);
      }
    },
    meshes(mat) {
      const box = new THREE.BoxGeometry(1, 1, 1);
      box.deleteAttribute('uv');
      return [chunkedInstances(box, mat, posts, { size: 400, shadow: !LITE }), chunkedInstances(box, mat, rails, { size: 400, shadow: !LITE })];
    },
  };
}

// A wall along polyline runs: two faces, a top and end caps, UVs in metres; an optional coping course.
function wallMesh(runs, H, T, mat, copeMat, collide) {
  const g = new THREE.Group();
  const pos = [], uv = [], cpos = [];
  const quad = (arr, uvArr, a, b, c, d, u0, u1, v0, v1) => {
    arr.push(...a, ...b, ...c, ...a, ...c, ...d);
    if (uvArr) uvArr.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
  };
  const box = (arr, uvArr, p, q, y0, y1, t, u) => {
    const d = v2.norm(v2.sub(q, p)), n = { x: -d.z * t / 2, z: d.x * t / 2 }, len = v2.len(v2.sub(q, p));
    const A = [p.x + n.x, p.z + n.z], Bq = [q.x + n.x, q.z + n.z], Cq = [q.x - n.x, q.z - n.z], Dp = [p.x - n.x, p.z - n.z];
    const V = (xz, y) => [xz[0], y, xz[1]];
    const s = 3; // texture metres
    quad(arr, uvArr, V(A, y0), V(Bq, y0), V(Bq, y1), V(A, y1), u / s, (u + len) / s, y0 / s, y1 / s);
    quad(arr, uvArr, V(Cq, y0), V(Dp, y0), V(Dp, y1), V(Cq, y1), (u + len) / s, u / s, y0 / s, y1 / s);
    quad(arr, uvArr, V(A, y1), V(Bq, y1), V(Cq, y1), V(Dp, y1), 0, len / s, 0, t / s);
    return len;
  };
  for (const run of runs) {
    let u = 0;
    for (let i = 0; i + 1 < run.length; i++) {
      const p = run[i], q = run[i + 1];
      // extend each piece a little so the mitres close
      const d = v2.norm(v2.sub(q, p)), e = T / 2;
      const pp = { x: p.x - d.x * e * 0.5, z: p.z - d.z * e * 0.5 }, qq = { x: q.x + d.x * e * 0.5, z: q.z + d.z * e * 0.5 };
      const len = box(pos, uv, pp, qq, 0, H, T, u);
      if (copeMat) box(cpos, null, pp, qq, H, H + 0.14, T + 0.12, u);
      u += len;
    }
    // end caps
    for (const [p, q] of [[run[0], run[1]], [run[run.length - 1], run[run.length - 2]]]) {
      const d = v2.norm(v2.sub(q, p)), n = { x: -d.z * T / 2, z: d.x * T / 2 };
      const a = [p.x + n.x, 0, p.z + n.z], b = [p.x - n.x, 0, p.z - n.z];
      quad(pos, uv, a, b, [b[0], H, b[2]], [a[0], H, a[2]], 0, T / 3, 0, H / 3);
    }
    if (collide) addPolyline(run);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true;
  // quads were wound one way on both faces: render both sides so either face shows
  mat.side = THREE.DoubleSide;
  g.add(m);
  if (copeMat && cpos.length) {
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3)); cg.computeVertexNormals();
    copeMat.side = THREE.DoubleSide;
    const cm = new THREE.Mesh(cg, copeMat); cm.castShadow = cm.receiveShadow = true; g.add(cm);
  }
  return g;
}

// a clipped hedge behind the zoo railings
function hedge(pts, ok) {
  const runs = splitRuns(pts, ok, 3);
  const mat = new THREE.MeshStandardMaterial({ color: 0x33502a, roughness: 0.95 });
  const inner = runs.map((r) => r.map((p) => ({ x: p.x, z: p.z })));
  const g = wallMesh(inner.map((r) => offsetLine(r, 1.4)).filter((r) => r.length > 1), 1.7, 1.3, mat, null, false);
  return g;
}

// People's Flower Garden: raised oval and round beds of bedding plants on the lawns east of the pond
function flowerBeds(pondC, ground, rand) {
  const cols = [0xc0392b, 0xe3b505, 0x6c3a8c, 0xd35b8a, 0xe8e0d0, 0xd9722a].map((h) => new THREE.Color(h));
  const parts = [];
  const beds = [];
  for (let tries = 0; tries < 400 && beds.length < 16; tries++) {
    const p = { x: pondC.x + 8 + rand() * 56, z: pondC.z - 26 + rand() * 50 };
    const rx = 2.2 + rand() * 2.6, rz = 1.4 + rand() * 1.6;
    if (!ground(p, rx + 3) || beds.some((b) => (b.x - p.x) ** 2 + (b.z - p.z) ** 2 < (rx + b.rx + 2.5) ** 2)) continue;
    beds.push({ ...p, rx, rz, rot: rand() * 3.14, c: cols[Math.floor(rand() * cols.length)] });
  }
  for (const b of beds) {
    const top = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    const rim = new THREE.CylinderGeometry(1.06, 1.1, 0.16, 20, 1, true);
    top.scale(b.rx, 1, b.rz).rotateY(b.rot).translate(b.x, KERB_H + 0.2, b.z);
    rim.scale(b.rx, 1, b.rz).rotateY(b.rot).translate(b.x, KERB_H + 0.1, b.z);
    const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.toNonIndexed(); };
    const tp = top.attributes.position, tuv = top.attributes.uv;
    for (let i = 0; i < tp.count; i++) tuv.setXY(i, tp.getX(i) / 2.5, tp.getZ(i) / 2.5);
    parts.push(paint(top, b.c));
    const ruv = rim.attributes.uv; for (let i = 0; i < ruv.count; i++) ruv.setXY(i, 0.99, 0.99);
    parts.push(paint(rim, new THREE.Color(0x3a2c22)));
  }
  const g = new THREE.Group();
  if (!parts.length) return g;
  const m = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ map: flowersTexture(), vertexColors: true, roughness: 0.9 }));
  m.receiveShadow = true;
  g.add(m);
  return g;
}

// Where the park's roads run into the woodland belt at the map's edge: a white field gate across the road
function roadEndGates(mat) {
  const g = new THREE.Group();
  for (const id of ['PX23', 'PX62']) {
    const n = world.nodes.get(id); if (!n) continue;
    const e = n.edges[0]; if (!e) continue;
    const d = v2.norm(v2.sub(n, e.to)), across = { x: -d.z, z: d.x }, w = e.way.width + 1;
    const at = { x: n.x - d.x * 2, z: n.z - d.z * 2 }, rot = Math.atan2(across.x, across.z);
    const bar = (y, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, w), mat); m.position.set(at.x, y, at.z); m.rotation.y = rot; return m; };
    g.add(bar(KERB_H + 1.0, 0.1), bar(KERB_H + 0.55, 0.08), bar(KERB_H + 0.15, 0.06));
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.25, 0.2), mat);
      post.position.set(at.x + across.x * s * w / 2, KERB_H + 0.62, at.z + across.z * s * w / 2); g.add(post);
    }
    addPolyline([{ x: at.x - across.x * w / 2, z: at.z - across.z * w / 2 }, { x: at.x + across.x * w / 2, z: at.z + across.z * w / 2 }]);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}

// ---------- gas lamps ----------
function gasLamps(scene) {
  const spots = [];
  const tooNear = (p) => spots.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 64);
  for (const way of world.ways) {
    if (way.lamps !== 'gas') continue;
    if (way.roundabout) continue; // the island's lamps are placed round the column below
    const spacing = 30, off = way.width / 2 + 0.55;
    let s0 = 8;
    for (let k = 0; k + 1 < way.pts.length; k++) {
      const a = way.pts[k], b = way.pts[k + 1], L = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a));
      let s = s0;
      for (; s < L; s += spacing) {
        for (const side of [-1, 1]) {
          const n = { x: -d.z * side, z: d.x * side };
          const p = { x: a.x + d.x * s + n.x * off, z: a.z + d.z * s + n.z * off };
          const r = world.nearestRoad(p.x, p.z);
          if (r && r.way !== way && r.edgeDist < 0.4) continue; // junction mouth
          if (tooNear(p)) continue;
          spots.push({ x: p.x, z: p.z, hx: p.x, hz: p.z, hy: 4.3, gas: true });
        }
      }
      s0 = s - L;
    }
  }
  // round the Phoenix column's island (ref 10: lamps at the island edge)
  if (park.ringWays.length) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 6.283 + 0.26, r = park.islandR - 1;
    const p = { x: park.phoenix.x + Math.cos(a) * r, z: park.phoenix.z + Math.sin(a) * r };
    spots.push({ x: p.x, z: p.z, hx: p.x, hz: p.z, hy: 4.3, gas: true });
  }
  const G = gasLampGeometry();
  const ironMat = addReflections(new THREE.MeshStandardMaterial({ color: 0x1d2022, roughness: 0.4 }), 0.6);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xe8d9b0, emissive: 0xffb36a, emissiveIntensity: 0.04, roughness: 0.2, side: THREE.DoubleSide });
  const items = spots.map((s) => ({ x: s.x, y: KERB_H, z: s.z, rot: 0 }));
  const frames = chunkedInstances(G.frame, ironMat, items, { shadow: true, size: 500 });
  const lanterns = chunkedInstances(G.glass, glassMat, items, { size: 500 });
  // warm pools on the ground after dark (additive, hidden by day)
  const poolTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d'), gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,190,120,1)'); gr.addColorStop(0.5, 'rgba(255,170,100,0.3)'); gr.addColorStop(1, 'rgba(255,160,90,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const pools = chunkedInstances(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2).translate(0, KERB_H + 0.03, 0), poolMat, items, { receive: false, size: 500 });
  pools.visible = false;
  for (const s of spots) addBox(s.x, s.z, 0.18, 0.18, 0);
  scene.add(frames, lanterns, pools);
  return {
    spots,
    setLevel(v) {
      glassMat.emissiveIntensity = 0.04 + v * 2.6;
      poolMat.opacity = v * 0.5;
      pools.visible = poolMat.opacity > 0.001;
    },
  };
}

// ---------- heroes ----------
// the Blender parts and where they stand (tools/blender/build_phoenixpark.py; origins at ground level)
function heroParts() {
  const parts = {};
  // Wellington Monument: the step square turned ~16 degrees clockwise from north (docs/research §3.1)
  parts.wellington = { x: park.wellington.x, z: park.wellington.z, rot: -16 * Math.PI / 180 };
  parts.phoenix = { x: park.phoenix.x, z: park.phoenix.z, rot: 0 };
  // the Papal Cross faces the Phoenix Monument and Chesterfield Avenue, its steps toward them
  { const d = v2.norm(v2.sub(park.phoenix, park.papalCross)); parts.papalcross = { x: park.papalCross.x, z: park.papalCross.z, rot: Math.atan2(d.x, d.z) }; }
  // Parkgate: four round piers across the mouth of Chesterfield Avenue, just inside the gate (PX10)
  const a = world.nodes.get('PX01'), b = world.nodes.get('PX10'), cw = world.ways.find((w) => w.name === 'Chesterfield Avenue' && w.nodeIds.includes('PX10'));
  if (a && b && cw) {
    const d = v2.norm(v2.sub(b, a)), n = { x: -d.z, z: d.x }, at = v2.lerp(a, b, 0.7), rot = Math.atan2(d.x, d.z);
    const half = cw.width / 2;
    let k = 0;
    for (const o of [-(half + 0.9), -(half + 4.6), half + 0.9, half + 4.6]) parts[`pier${k++}`] = { node: 'pgpier', x: at.x + n.x * o, z: at.z + n.z * o, rot };
    // square-headed pedestrian gateways outside the piers, the pedimented lodge on the north side
    for (const [i, o] of [[0, -(half + 2.75)], [1, half + 2.75]]) parts[`pgate${i}`] = { node: 'pggate', x: at.x + n.x * o, z: at.z + n.z * o, rot };
    // the 1811 pedimented lodge on the Conyngham Road side, its front to the avenue
    const side = Math.sign(v2.dot(n, v2.sub(park.wellington, at))) || -1;
    // (stepped into the park until it clears the roads and footpaths: Conyngham Road runs close behind it)
    const lrot = Math.atan2(-side * n.x, -side * n.z), lc = Math.cos(lrot), ls = Math.sin(lrot);
    const clear = (p) => [[-4, -3.4], [4, -3.4], [4, 3.4], [-4, 3.4], [0, 0]].every(([lx, lz]) => fieldAt(p.x + lx * lc + lz * ls, p.z - lx * ls + lz * lc) > 0.8);
    let lodge = null;
    for (let t = 2; t < 60 && !lodge; t += 1) for (const o of [10.5, 13, 16]) {
      const p = { x: at.x + n.x * side * (half + o) + d.x * t, z: at.z + n.z * side * (half + o) + d.z * t };
      if (clear(p)) { lodge = p; break; }
    }
    if (lodge) parts.pglodge = { x: lodge.x, z: lodge.z, rot: lrot };
  }
  // the North Circular Road gate screens across North Road inside RN50
  const r0 = world.nodes.get('RN50'), r1 = world.nodes.get('PX51'), nw = world.ways.find((w) => w.name === 'North Road' && w.nodeIds.includes('RN50'));
  if (r0 && r1 && nw) {
    const d = v2.norm(v2.sub(r1, r0)), at = v2.lerp(r0, r1, 0.8), n = { x: -d.z, z: d.x };
    for (const [i, s] of [[0, -1], [1, 1]]) parts[`ncr${i}`] = { node: 'ncrgate', x: at.x + n.x * s * (nw.width / 2 + nw.pave + 0.4), z: at.z + n.z * s * (nw.width / 2 + nw.pave + 0.4), rot: Math.atan2(-n.z * s, n.x * s) };
  }
  // the Áras gates: across the avenue at PX48, facing the roundabout
  const g0 = world.nodes.get('PXR1'), g1 = world.nodes.get('PX48');
  if (g0 && g1) {
    const d = v2.norm(v2.sub(g1, g0));
    parts.arasgate = { x: g1.x, z: g1.z, rot: Math.atan2(d.x, d.z) };
  }
  return parts;
}

// collision boxes for the heroes (x, z, half extents, rotation), in each part's own frame
function heroSolids(parts) {
  const out = [];
  const at = (p, lx, lz, hx, hz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); out.push({ x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c, hx, hz, rot: p.rot }); };
  for (const [k, p] of Object.entries(parts)) {
    if (k === 'wellington') at(p, 0, 0, 14.2, 14.2);
    else if (k === 'phoenix') at(p, 0, 0, 3.3, 3.3);
    else if (k === 'papalcross') at(p, 0, 0, 2.2, 2.2);
    else if (p.node === 'pgpier') at(p, 0, 0, 0.8, 0.8);
    else if (p.node === 'pggate') { at(p, -0.9, 0, 0.35, 0.4); at(p, 0.9, 0, 0.35, 0.4); }
    else if (k === 'pglodge') at(p, 0, 0, 3.4, 2.8);
    else if (p.node === 'ncrgate') { at(p, 0, 0, 0.35, 0.35); at(p, 3.1, 0, 3.1, 0.12); }
    else if (k === 'arasgate') { at(p, 0, 0, 5, 0.3); for (const s of [-1, 1]) { at(p, s * 7.7, 0, 3.2, 0.15); at(p, s * 10.2, 2, 2.1, 2.1); } }
  }
  return out;
}

// ---------- fallow deer ----------
function herdSites(pk, L) {
  // Fifteen Acres by the Papal Cross, the lawns south of the Phoenix Monument, the Wellington field
  const want = [
    { x: pk.papalCross.x + 55, z: pk.papalCross.z + 60, n: 16 },
    { x: pk.phoenix.x + 20, z: pk.phoenix.z + 120, n: 12 },
    { x: pk.wellington.x - 70, z: pk.wellington.z - 25, n: 8 },
  ];
  const out = [];
  for (const w of want) {
    // nudge onto open grass
    let best = null;
    for (let r = 0; r < 120 && !best; r += 8) for (let a = 0; a < 6.28 && !best; a += 0.5) {
      const p = { x: w.x + Math.cos(a) * r, z: w.z + Math.sin(a) * r };
      if (pointInPolygon(p, pk.poly) && fieldAt(p.x, p.z) > 26 && !L.woodPolys.some((poly) => pointInPolygon(p, poly)) && !pointInPolygon(p, pk.demesne) && !L.zooPolys.some((z) => pointInPolygon(p, z))) best = p;
    }
    if (best) out.push({ ...best, n: w.n, r: 22 });
  }
  return out;
}

function deerGeometry() {
  // ~130 triangles: body, neck and head, four legs, a white rump patch and tail; built facing +z, feet at y = 0.
  // Legs carry a 'leg' attribute (+1 / -1 for the diagonal pairs) that the walk cycle swings; the head and neck carry
  // 'head' = 1 so grazing can lower them.
  const parts = [];
  const tag = (g, leg, head) => { g = g.toNonIndexed(); const n = g.attributes.position.count; g.setAttribute('aLeg', new THREE.BufferAttribute(new Float32Array(n).fill(leg), 1)); g.setAttribute('aHead', new THREE.BufferAttribute(new Float32Array(n).fill(head), 1)); return g; };
  const body = new THREE.CylinderGeometry(0.3, 0.27, 1.15, 7, 1).rotateX(Math.PI / 2).scale(1, 1.1, 1).translate(0, 0.92, 0);
  parts.push(tag(body, 0, 0));
  const neck = new THREE.CylinderGeometry(0.1, 0.16, 0.62, 5).rotateX(-0.75).translate(0, 1.2, 0.62);
  parts.push(tag(neck, 0, 1));
  const head = new THREE.ConeGeometry(0.11, 0.42, 5).rotateX(Math.PI / 2 + 0.5).translate(0, 1.43, 0.93);
  parts.push(tag(head, 0, 1));
  for (const s of [-1, 1]) parts.push(tag(new THREE.ConeGeometry(0.05, 0.16, 3).translate(s * 0.09, 1.6, 0.8), 0, 1)); // ears
  for (const [x, z, leg] of [[-0.15, 0.4, 1], [0.15, 0.4, -1], [-0.15, -0.42, -1], [0.15, -0.42, 1]]) {
    parts.push(tag(new THREE.CylinderGeometry(0.045, 0.035, 0.8, 4).translate(x, 0.4, z), leg, 0));
  }
  parts.push(tag(new THREE.BoxGeometry(0.34, 0.3, 0.06).translate(0, 0.95, -0.58), 0, 0)); // rump
  for (const g of parts) { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); }
  const geo = mergeGeometries(parts.map((g) => { g.deleteAttribute('normal'); return g; }));
  geo.computeVertexNormals();
  // coat UVs: flank position along the body (u) and height (v)
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getZ(i) * 0.7 + (p.getX(i) > 0 ? 0 : 0.03), 1 - THREE.MathUtils.clamp((p.getY(i) - 0.55) / 0.75, 0, 1));
  return geo;
}

function buildDeer(scene, herds, ground) {
  const rand = rng(1660);
  const coats = [new THREE.Color(0x8f7357), new THREE.Color(0x3a2e26), new THREE.Color(0xcbbfa6)];
  const animals = [];
  for (const h of herds) for (let k = 0; k < h.n; k++) {
    const a = rand() * 6.28, r = rand() * h.r;
    const x = h.x + Math.cos(a) * r, z = h.z + Math.sin(a) * r;
    const coat = rand() < 0.72 ? 0 : rand() < 0.6 ? 1 : 2;
    animals.push({ herd: h, x, z, heading: rand() * 6.28, speed: 0, tx: x, tz: z, wait: rand() * 8, phase: rand() * 6.28, graze: 1, alarm: 0, coat, s: 0.9 + rand() * 0.2 });
  }
  const count = animals.length;
  const geo = deerGeometry();
  const aState = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2); // x: gait phase, y: head (0 up, 1 grazing)
  aState.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aState', aState);
  const mat = new THREE.MeshStandardMaterial({ map: coatTexture(), roughness: 0.9 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLeg; attribute float aHead; attribute vec2 aState;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // walk / trot: diagonal leg pairs swing about the hip; grazing lowers the neck and head about the withers
        float swing = sin(aState.x) * aLeg * 0.55 * step(0.001, abs(aState.x));
        float hy = 0.8 - transformed.y;
        transformed.z += swing * hy * 0.6 * step(0.5, abs(aLeg));
        if (aHead > 0.5) {
          float a = aState.y * 1.05;
          vec2 q = transformed.yz - vec2(1.05, 0.4);
          transformed.yz = vec2(1.05, 0.4) + vec2(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a));
        }`);
  };
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = false; // they move; the bounding sphere would go stale
  animals.forEach((d, i) => mesh.setColorAt(i, coats[d.coat]));
  scene.add(mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const write = (d, i) => {
    q.setFromAxisAngle(up, d.heading);
    mesh.setMatrixAt(i, m4.compose(pv.set(d.x, KERB_H, d.z), q, sv.setScalar(d.s)));
    aState.setXY(i, d.phase, d.graze);
  };
  animals.forEach(write);
  let far = false;
  return {
    count,
    update(dt, time, car) {
      if (!count) return;
      dt = Math.min(dt, 0.1);
      // only animate herds near the player (the far ones just stand and graze)
      const cx = car ? car.pos.x : 0, cz = car ? car.pos.z : 0;
      const anyNear = herds.some((h) => (h.x - cx) ** 2 + (h.z - cz) ** 2 < 450 * 450);
      if (!anyNear) { if (!far) { far = true; } return; }
      far = false;
      const carSpeed = car ? Math.abs(car.speed) : 0;
      animals.forEach((d, i) => {
        const dx = d.x - cx, dz = d.z - cz, dc = Math.hypot(dx, dz);
        // alarm: heads up within ~40 m of a moving car, flight within ~20 m (or when it's coming fast)
        const threat = dc < 20 || (dc < 34 && carSpeed > 8);
        if (threat) { d.alarm = 4 + rand() * 2; d.flee = { x: dx / (dc || 1), z: dz / (dc || 1) }; }
        else if (dc < 42 && carSpeed > 1) d.wait = Math.max(d.wait, 1.5);
        let targetSpeed = 0;
        if (d.alarm > 0) {
          d.alarm -= dt;
          // trot away, curving back toward the herd's ground so they don't scatter across the whole park
          const hx = d.herd.x - d.x, hz = d.herd.z - d.z, hd = Math.hypot(hx, hz) || 1;
          const pull = Math.max(0, hd - d.herd.r * 2.5) / 60;
          const want = Math.atan2(d.flee.x + (hx / hd) * pull, d.flee.z + (hz / hd) * pull);
          d.heading += Math.atan2(Math.sin(want - d.heading), Math.cos(want - d.heading)) * Math.min(1, dt * 4);
          targetSpeed = 5.5;
        } else {
          d.wait -= dt;
          const tx = d.tx - d.x, tz = d.tz - d.z, td = Math.hypot(tx, tz);
          if (d.wait <= 0) {
            // pick a new grazing spot inside the herd's range
            const a = rand() * 6.28, r = rand() * d.herd.r;
            const p = { x: d.herd.x + Math.cos(a) * r, z: d.herd.z + Math.sin(a) * r };
            if (ground(p, 3)) { d.tx = p.x; d.tz = p.z; }
            d.wait = 6 + rand() * 14;
          } else if (td > 0.6) {
            const want = Math.atan2(tx, tz);
            d.heading += Math.atan2(Math.sin(want - d.heading), Math.cos(want - d.heading)) * Math.min(1, dt * 2);
            targetSpeed = 0.55;
          }
        }
        d.speed += (targetSpeed - d.speed) * Math.min(1, dt * 3);
        if (d.speed > 0.02) {
          const nx = d.x + Math.sin(d.heading) * d.speed * dt, nz = d.z + Math.cos(d.heading) * d.speed * dt;
          if (pointInPolygon({ x: nx, z: nz }, park.poly)) { d.x = nx; d.z = nz; } else d.heading += Math.PI * 0.5;
          d.phase += dt * (d.speed > 2 ? 11 : 6) * Math.min(1, d.speed * 1.5 + 0.2);
        } else d.phase = 0;
        // grazing: head down while standing unalarmed; up when walking, alarmed or a car is near
        const up = d.alarm > 0 || d.speed > 0.3 || dc < 42;
        d.graze += ((up ? 0 : 1) - d.graze) * Math.min(1, dt * 2.5);
        write(d, i);
      });
      mesh.instanceMatrix.needsUpdate = true;
      aState.needsUpdate = true;
    },
  };
}

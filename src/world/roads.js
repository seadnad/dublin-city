// Street surfaces as real geometry:
//  - a signed distance field to the carriageways (smooth union → rounded kerb corners) sampled on a 1 m grid,
//  - marching squares on that field → raised pavement blocks (0.13 m) with granite kerb faces,
//  - crisp decal geometry for markings (dashes, double yellows, zebras, stop lines, LOOK RIGHT / LOOK LEFT),
//  - granite sett lanes, the Luas track bed and rails, the O'Connell Street median.
// The field is also uploaded as a texture so shaders know how far each pixel is from the kerb.
import * as THREE from 'three';
import { addReflections } from '../render/reflect.js';
import { groundAOUniforms, GROUND_AO_GLSL, GROUND_AO_APPLY } from '../render/groundao.js';
import { world, v2, PAVEMENT, offsetPolyline, pointInPolygon, hasParking } from './geo.js';
import { IS_MOBILE, fbm } from './textures.js';
import { asphalt, paving, granite, setts, grass } from './surfaces.js';

export const KERB_H = 0.13;
const B = world.bounds;
const G = 1.0; // field resolution (m)
const NX = Math.ceil(B.w / G) + 1, NZ = Math.ceil(B.h / G) + 1;

// ---------------- signed distance field ----------------
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function segDist(px, pz, a, b) {
  const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1e-9;
  let t = ((px - a.x) * abx + (pz - a.z) * abz) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - a.x - abx * t, pz - a.z - abz * t);
}

const field = new Float32Array(NX * NZ).fill(30);
// Rasterise each way's capsule distance into a scratch buffer over its bounding box, then smooth-union it into the
// field; distances beyond REACH don't affect the kerb contour, so they are skipped.
{
  const REACH = 8;
  const gi = (x) => Math.round((x - B.minX) / G), gj = (z) => Math.round((z - B.minZ) / G);
  const scratch = new Float32Array(NX * NZ).fill(Infinity);
  for (const way of world.ways) {
    const r = way.width / 2 + REACH;
    let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], b = way.pts[k + 1];
      const si0 = Math.max(0, gi(Math.min(a.x, b.x) - r)), si1 = Math.min(NX - 1, gi(Math.max(a.x, b.x) + r));
      const sj0 = Math.max(0, gj(Math.min(a.z, b.z) - r)), sj1 = Math.min(NZ - 1, gj(Math.max(a.z, b.z) + r));
      i0 = Math.min(i0, si0); i1 = Math.max(i1, si1); j0 = Math.min(j0, sj0); j1 = Math.max(j1, sj1);
      const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1e-9;
      for (let j = sj0; j <= sj1; j++) {
        const z = B.minZ + j * G;
        for (let i = si0; i <= si1; i++) {
          const x = B.minX + i * G;
          let t = ((x - a.x) * abx + (z - a.z) * abz) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = x - a.x - abx * t, dz = z - a.z - abz * t;
          const d = Math.sqrt(dx * dx + dz * dz) - way.width / 2;
          const k2 = j * NX + i;
          if (d < scratch[k2]) scratch[k2] = d;
        }
      }
    }
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k2 = j * NX + i, d = scratch[k2];
      if (d !== Infinity) { field[k2] = smin(field[k2], d, 5); scratch[k2] = Infinity; }
    }
  }
  // river: scanline inside test per row + distance to nearby bank edges
  const poly = world.riverPoly;
  const rd = new Float32Array(NX * NZ).fill(REACH);
  for (let e = 0, f = poly.length - 1; e < poly.length; f = e++) {
    const a = poly[e], b = poly[f];
    const si0 = Math.max(0, gi(Math.min(a.x, b.x) - REACH)), si1 = Math.min(NX - 1, gi(Math.max(a.x, b.x) + REACH));
    const sj0 = Math.max(0, gj(Math.min(a.z, b.z) - REACH)), sj1 = Math.min(NZ - 1, gj(Math.max(a.z, b.z) + REACH));
    for (let j = sj0; j <= sj1; j++) for (let i = si0; i <= si1; i++) {
      const d = segDist(B.minX + i * G, B.minZ + j * G, a, b);
      if (d < rd[j * NX + i]) rd[j * NX + i] = d;
    }
  }
  let rz0 = Infinity, rz1 = -Infinity;
  for (const p of poly) { rz0 = Math.min(rz0, p.z); rz1 = Math.max(rz1, p.z); }
  for (let j = Math.max(0, gj(rz0) - 1); j <= Math.min(NZ - 1, gj(rz1) + 1); j++) {
    const z = B.minZ + j * G, xs = [];
    for (let e = 0, f = poly.length - 1; e < poly.length; f = e++) {
      const a = poly[e], b = poly[f];
      if ((a.z > z) !== (b.z > z)) xs.push(a.x + ((z - a.z) / (b.z - a.z)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i < NX; i++) {
      const x = B.minX + i * G;
      let inside = false;
      for (let k = 0; k < xs.length && xs[k] <= x; k++) inside = !inside;
      const k2 = j * NX + i;
      if (inside) field[k2] = Math.min(field[k2], -rd[k2]);
      else if (rd[k2] < REACH) field[k2] = Math.min(field[k2], rd[k2]);
    }
  }
  for (let i = 0; i < NX; i++) { field[i] = -1; field[(NZ - 1) * NX + i] = -1; }
  for (let j = 0; j < NZ; j++) { field[j * NX] = -1; field[j * NX + NX - 1] = -1; }
}
export function fieldAt(x, z) {
  const fx = (x - B.minX) / G, fz = (z - B.minZ) / G;
  const i = Math.max(0, Math.min(NX - 2, Math.floor(fx))), j = Math.max(0, Math.min(NZ - 2, Math.floor(fz)));
  const tx = fx - i, tz = fz - j;
  const a = field[j * NX + i], b = field[j * NX + i + 1], c = field[(j + 1) * NX + i], d = field[(j + 1) * NX + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

// Field as a half-float texture for shaders (kerb bands, gutters).
export const fieldTexture = (() => {
  const data = new Uint16Array(NX * NZ);
  for (let k = 0; k < field.length; k++) data[k] = THREE.DataUtils.toHalfFloat(Math.max(-30, Math.min(30, field[k])));
  const t = new THREE.DataTexture(data, NX, NZ, THREE.RedFormat, THREE.HalfFloatType);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
})();
// Shared tileable noise (R: 4-octave fbm, G: a second fbm) so shaders do one texture tap instead of procedural noise.
export const noiseTexture = (() => {
  const a = fbm(256, 4, 301), b = fbm(256, 3, 302);
  const data = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < a.length; i++) { data[i * 4] = a[i] * 255; data[i * 4 + 1] = b[i] * 255; data[i * 4 + 2] = Math.random() * 255; data[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(data, 256, 256);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
})();
export const fieldUniforms = {
  uNoise: { value: noiseTexture },
  uField: { value: fieldTexture },
  uFieldOrigin: { value: new THREE.Vector2(B.minX, B.minZ) },
  uFieldSize: { value: new THREE.Vector2((NX - 1) * G, (NZ - 1) * G) },
  uFieldTexel: { value: new THREE.Vector2(1 / NX, 1 / NZ) },
  uWet: { value: 0 },
  uRainTime: { value: 0 },
};
// GLSL: sample the field in world space (texel centres sit on grid points)
export const FIELD_GLSL = /* glsl */ `
  uniform sampler2D uField; uniform vec2 uFieldOrigin; uniform vec2 uFieldSize; uniform vec2 uFieldTexel; uniform float uWet; uniform float uRainTime;
  uniform sampler2D uNoise;
  float kerbField(vec2 xz) {
    vec2 uv = (xz - uFieldOrigin) / uFieldSize * (1.0 - uFieldTexel) + 0.5 * uFieldTexel;
    return texture2D(uField, uv).r;
  }
  float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  // noise from the shared texture: one tap each
  float fbm2(vec2 p) { return texture2D(uNoise, p * 0.25).r; }
  float vnoise(vec2 p) { return texture2D(uNoise, p * 0.25 + 0.37).g; }
  // Rain ripples: expanding rings in a grid of cells, each cell's drop at its own random phase. Returns an xz slope.
  vec2 rainRipples(vec2 p) {
    vec2 slope = vec2(0.0);
    for (int k = 0; k < 2; k++) {
      vec2 q = p * (k == 0 ? 2.3 : 3.7) + float(k) * 17.1;
      vec2 cell = floor(q), f = fract(q) - 0.5;
      vec2 c = vec2(hash21(cell), hash21(cell + 9.2)) - 0.5;
      float t = fract(uRainTime * 0.9 + hash21(cell + 4.4));
      vec2 d = f - c * 0.6;
      float r = length(d);
      float ring = sin((r - t * 0.55) * 40.0) * smoothstep(0.0, 0.05, t * 0.55 - r + 0.05) * (1.0 - t) * smoothstep(0.5, 0.2, r);
      slope += d / max(r, 1e-3) * ring;
    }
    return slope;
  }
  // flatten the normal toward the surface's own normal (water fills the texture) and add ripples, in view space
  vec3 wetNormal(vec3 n, vec3 flatN, float puddle, vec2 xz) {
    // ripples fade out once they are only a few pixels across (they alias into dark speckle)
    float rfw = length(fwidth(xz));
    vec2 rp = rainRipples(xz) * 0.22 * (1.0 - smoothstep(0.015, 0.05, rfw));
    vec3 rip = (viewMatrix * vec4(rp.x, 0.0, rp.y, 0.0)).xyz;
    return normalize(mix(n, flatN, puddle) + rip * puddle);
  }
`;

// ---------------- marching squares → pavement blocks ----------------
function contours() {
  const segs = new Map(); // edgeId -> [edgeId, ...]
  const pos = new Map();  // edgeId -> {x, z}
  const V = (i, j) => field[j * NX + i];
  const edgePoint = (id, i0, j0, i1, j1) => {
    if (!pos.has(id)) {
      const a = V(i0, j0), b = V(i1, j1), t = a / (a - b);
      pos.set(id, { x: B.minX + (i0 + (i1 - i0) * t) * G, z: B.minZ + (j0 + (j1 - j0) * t) * G });
    }
    return id;
  };
  const link = (a, b) => {
    if (!segs.has(a)) segs.set(a, []);
    if (!segs.has(b)) segs.set(b, []);
    segs.get(a).push(b); segs.get(b).push(a);
  };
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const tl = V(i, j) > 0, tr = V(i + 1, j) > 0, br = V(i + 1, j + 1) > 0, bl = V(i, j + 1) > 0;
    const c = (tl ? 1 : 0) | (tr ? 2 : 0) | (br ? 4 : 0) | (bl ? 8 : 0);
    if (c === 0 || c === 15) continue;
    const e = [];
    const top = () => edgePoint((j * NX + i) * 2, i, j, i + 1, j);
    const bottom = () => edgePoint(((j + 1) * NX + i) * 2, i, j + 1, i + 1, j + 1);
    const left = () => edgePoint((j * NX + i) * 2 + 1, i, j, i, j + 1);
    const right = () => edgePoint((j * NX + i + 1) * 2 + 1, i + 1, j, i + 1, j + 1);
    if (c === 5 || c === 10) {
      const centre = (V(i, j) + V(i + 1, j) + V(i + 1, j + 1) + V(i, j + 1)) / 4 > 0;
      if ((c === 5) === centre) { link(top(), right()); link(bottom(), left()); } else { link(left(), top()); link(right(), bottom()); }
      continue;
    }
    if (tl !== tr) e.push(top());
    if (tr !== br) e.push(right());
    if (bl !== br) e.push(bottom());
    if (tl !== bl) e.push(left());
    link(e[0], e[1]);
  }
  // chain into closed loops
  const loops = [], used = new Set();
  for (const start of segs.keys()) {
    if (used.has(start)) continue;
    const loop = [];
    let prev = null, cur = start;
    while (cur !== undefined && !used.has(cur)) {
      used.add(cur);
      loop.push(pos.get(cur));
      const nb = segs.get(cur);
      const next = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur; cur = next;
    }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = -1, dmax = 0;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i].x, pts[i].z, a, b); if (d > dmax) { dmax = d; idx = i; } }
  if (dmax <= eps) return [a, b];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}
function simplifyLoop(loop, eps) {
  // split the closed loop at its farthest point pair so RDP works on two open chains
  let far = 0, fd = 0;
  for (let i = 1; i < loop.length; i++) { const d = (loop[i].x - loop[0].x) ** 2 + (loop[i].z - loop[0].z) ** 2; if (d > fd) { fd = d; far = i; } }
  const a = rdp(loop.slice(0, far + 1), eps), b = rdp([...loop.slice(far), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; s += p[i].x * q.z - q.x * p[i].z; } return s / 2; };

function buildPavements(mats) {
  const loops = contours().map((l) => simplifyLoop(l, 0.06)).filter((l) => l.length >= 3 && Math.abs(area(l)) > 2);
  // orientation: loops enclosing pavement vs. holes (road islands enclosed by pavement)
  const isOuter = (l) => {
    // probe just inside the loop near its first edge
    const a = l[0], b = l[1], m = v2.lerp(a, b, 0.5), d = v2.norm(v2.sub(b, a));
    const s = Math.sign(area(l)) || 1;
    const inward = { x: -d.z * s, z: d.x * s };
    return fieldAt(m.x + inward.x * 0.4, m.z + inward.z * 0.4) > 0;
  };
  const outers = [], holes = [];
  for (const l of loops) (isOuter(l) ? outers : holes).push(l);
  const shapes = outers.map((l) => ({ shape: new THREE.Shape(l.map((p) => new THREE.Vector2(p.x, -p.z))), loop: l, a: Math.abs(area(l)) }));
  for (const h of holes) {
    let best = null;
    for (const s of shapes) if (pointInPolygon(h[0], s.loop) && (!best || s.a < best.a)) best = s;
    if (best) best.shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, -p.z))));
  }
  const geo = consolidateGroups(new THREE.ExtrudeGeometry(shapes.map((s) => s.shape), { depth: KERB_H, bevelEnabled: false, curveSegments: 1 }));
  geo.rotateX(-Math.PI / 2);
  // world-space UVs: caps from x/z, sides along the kerb
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  const uv1 = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.abs(nor.getY(i)) > 0.5) uv.setXY(i, x / 3.6, z / 3.6);
    else uv.setXY(i, (Math.abs(nor.getX(i)) > Math.abs(nor.getZ(i)) ? z : x), y);
    uv1[i * 2] = x / 12; uv1[i * 2 + 1] = z / 12;
  }
  geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  const mesh = new THREE.Mesh(geo, [mats.paving, mats.kerb]);
  mesh.receiveShadow = true;
  return { mesh, loops: shapes.length + holes.length };
}

// ExtrudeGeometry makes two draw groups per shape; regroup into one group per material.
function consolidateGroups(geo) {
  const names = Object.keys(geo.attributes);
  const mats = [...new Set(geo.groups.map((g) => g.materialIndex))].sort();
  const total = geo.attributes.position.count;
  const out = new THREE.BufferGeometry();
  const arrays = names.map((n) => new Float32Array(total * geo.attributes[n].itemSize));
  let cursor = 0;
  for (const m of mats) {
    const start = cursor;
    for (const g of geo.groups) {
      if (g.materialIndex !== m) continue;
      names.forEach((n, k) => {
        const a = geo.attributes[n], sz = a.itemSize;
        arrays[k].set(a.array.subarray(g.start * sz, (g.start + g.count) * sz), cursor * sz);
      });
      cursor += g.count;
    }
    out.addGroup(start, cursor - start, m);
  }
  names.forEach((n, k) => out.setAttribute(n, new THREE.BufferAttribute(arrays[k], geo.attributes[n].itemSize)));
  geo.dispose();
  return out;
}

// ---------------- ribbons (lanes, track bed, markings) ----------------
class Ribbons {
  constructor() { this.pos = []; this.uv = []; this.col = []; this.idx = []; }
  quad(p0, p1, p2, p3, y, color, uvs) {
    const b = this.pos.length / 3;
    for (const p of [p0, p1, p2, p3]) this.pos.push(p.x, y, p.z);
    this.uv.push(...(uvs || [p0.x / 3, p0.z / 3, p1.x / 3, p1.z / 3, p2.x / 3, p2.z / 3, p3.x / 3, p3.z / 3]));
    if (color) for (let k = 0; k < 4; k++) this.col.push(color.r, color.g, color.b);
    this.idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  // strip of width w centred `off` from a polyline; optional dashes [on, off]
  strip(pts, off, w, y, color, dash) {
    const line = off ? offsetPolyline(pts, off) : pts;
    let acc = 0;
    for (let k = 0; k < line.length - 1; k++) {
      const a = line[k], b = line[k + 1], L = v2.len(v2.sub(b, a));
      if (L < 1e-3) continue;
      const d = v2.scale(v2.sub(b, a), 1 / L), n = { x: -d.z * w / 2, z: d.x * w / 2 };
      const pieces = [];
      if (!dash) pieces.push([0, L]);
      else {
        const period = dash[0] + dash[1];
        let s = 0;
        while (s < L) {
          const ph = (acc + s) % period;
          if (ph < dash[0]) { const e = Math.min(L, s + dash[0] - ph); pieces.push([s, e]); s = e; } else s += period - ph;
        }
      }
      for (const [s0, s1] of pieces) {
        const p = v2.add(a, v2.scale(d, s0)), q = v2.add(a, v2.scale(d, s1));
        this.quad(v2.sub(p, n), v2.sub(q, n), v2.add(q, n), v2.add(p, n), y, color);
      }
      acc += L;
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.col.length) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

function trim(pts, da, db) {
  const out = pts.map((p) => ({ ...p }));
  const cut = (arr, d) => {
    while (arr.length > 1 && d > 0) {
      const L = v2.len(v2.sub(arr[1], arr[0]));
      if (L > d) { arr[0] = v2.lerp(arr[0], arr[1], d / L); return arr; }
      d -= L; arr.shift();
    }
    return arr;
  };
  cut(out, da); out.reverse(); cut(out, db); out.reverse();
  return out.length > 1 && v2.len(v2.sub(out[out.length - 1], out[0])) > 0.5 ? out : null;
}
function junctionClear(node) {
  let w = 0;
  for (const way of node.ways) w = Math.max(w, way.width);
  return node.edges.length > 2 ? w / 2 + 2.5 : 0;
}
// runs of a way between junction nodes
function runs(way) {
  const out = [];
  let start = 0;
  for (let i = 1; i < way.nodeIds.length; i++) {
    const node = world.nodes.get(way.nodeIds[i]);
    if (i < way.nodeIds.length - 1 && node.edges.length <= 2) continue;
    out.push({ pts: way.pts.slice(start, i + 1), a: world.nodes.get(way.nodeIds[start]), b: node });
    start = i;
  }
  return out;
}
// keep only the parts of a polyline that are not on another road's carriageway (for kerb-side lines)
function clipToOwnRoad(pts, way, margin = 0.15) {
  const fine = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1], L = v2.len(v2.sub(b, a)), n = Math.max(1, Math.ceil(L / 0.5));
    for (let s = 0; s < n; s++) fine.push(v2.lerp(a, b, s / n));
  }
  fine.push(pts[pts.length - 1]);
  const out = [];
  let run = [];
  for (const p of fine) {
    const r = world.nearestRoad(p.x, p.z, (w) => w !== way);
    const blocked = (r && r.edgeDist < margin) || fieldAt(p.x, p.z) > 0;
    if (blocked) { if (run.length > 1) out.push(run); run = []; } else run.push(p);
  }
  if (run.length > 1) out.push(run);
  return out;
}

// Text atlas for road text ("LOOK RIGHT" etc.)
const WORDS = ['LOOK RIGHT', 'LOOK LEFT', 'BUS', 'SLOW'];
function wordAtlas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64 * WORDS.length;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 58px Arial Narrow, Arial, sans-serif';
  WORDS.forEach((w, i) => { ctx.save(); ctx.translate(256, i * 64 + 34); ctx.scale(1, 1.1); ctx.fillText(w, 0, 0); ctx.restore(); });
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

function buildMarkings(mat, textMat) {
  const r = new Ribbons(), text = new Ribbons();
  const WHITE = new THREE.Color(0.92, 0.92, 0.88), YELLOW = new THREE.Color(0.9, 0.72, 0.18);
  const Y = 0.012;
  // text quad laid flat: `right` is the reader's left-to-right direction, `up` points away from the reader
  const word = (centre, right, up, w, h, k) => {
    const p = (a, b) => ({ x: centre.x + right.x * a + up.x * b, z: centre.z + right.z * a + up.z * b });
    const v0 = 1 - (k + 1) / WORDS.length, v1 = 1 - k / WORDS.length;
    text.quad(p(-w / 2, -h / 2), p(w / 2, -h / 2), p(w / 2, h / 2), p(-w / 2, h / 2), Y + 0.002, null, [0, v0, 1, v0, 1, v1, 0, v1]);
  };

  for (const way of world.ways) {
    const w = way.width;
    for (const run of runs(way)) {
      const pts = trim(run.pts, junctionClear(run.a), junctionClear(run.b));
      if (!pts) continue;
      if (way.type === 'lane') continue;
      if (way.type === 'boulevard') {
        for (const o of [-8, 8]) r.strip(pts, o, 0.12, Y, WHITE, [3, 6]);
      } else if (w >= 14 && !hasParking(way)) {
        r.strip(pts, 0.12, 0.1, Y, WHITE); r.strip(pts, -0.12, 0.1, Y, WHITE);
        for (const o of [-w / 4, w / 4]) r.strip(pts, o, 0.1, Y, WHITE, [3, 6]);
      } else r.strip(pts, 0, 0.1, Y, WHITE, [3, 6]);
    }
    // double yellow lines along both kerbs (not on bridges, lanes, or O'Connell Street's bus lanes)
    if (way.type !== 'lane' && !way.bridge && way.type !== 'boulevard') {
      for (const side of [1, -1]) {
        const edge = offsetPolyline(way.pts, side * (w / 2 - 0.45));
        for (const run of clipToOwnRoad(edge, way)) {
          r.strip(run, 0, 0.09, Y, YELLOW); r.strip(run, side * 0.2, 0.09, Y, YELLOW);
        }
      }
    }
  }

  // pedestrian crossings on the approaches to junctions: stop line, zebra, LOOK RIGHT / LEFT at the kerbs
  for (const node of world.nodes.values()) {
    if (node.edges.length < 3) continue;
    const clear = junctionClear(node);
    for (const e of node.edges) {
      if (e.way.type === 'lane' || e.way.bridge || e.len < clear + 12) continue;
      const d = v2.norm(v2.sub(e.to, e.from)), n = { x: -d.z, z: d.x };
      const at = clear + 0.5;
      const c = v2.add(e.from, v2.scale(d, at + 1.6));
      const half = e.way.width / 2 - 0.5;
      for (let s = -half; s < half - 0.3; s += 1.0) {
        const a = v2.add(c, v2.scale(n, s)), b = v2.add(c, v2.scale(n, s + 0.5));
        const along = v2.scale(d, 1.5);
        r.quad(v2.sub(a, along), v2.sub(b, along), v2.add(b, along), v2.add(a, along), Y, WHITE);
      }
      // stop line across the inbound lane: traffic heading into the node travels along -d and keeps left,
      // and the left of -d is +n
      const sl = v2.add(e.from, v2.scale(d, at + 4.2));
      r.strip([sl, v2.add(sl, v2.scale(n, e.way.width / 2 - 0.5))], 0, 0.3, Y, WHITE);
      // LOOK RIGHT at both kerbs (with left-hand traffic the nearest lane always comes from the right)
      if (e.way.width >= 9) {
        for (const side of [1, -1]) {
          const reader = v2.scale(n, -side); // direction the pedestrian faces, toward the road
          const right = { x: -reader.z, z: reader.x };
          word(v2.add(c, v2.add(v2.scale(n, side * (half - 0.9)), v2.scale(d, 2.6))), right, reader, 2.2, 0.45, 0);
        }
      }
    }
  }
  const lines = new THREE.Mesh(r.geometry(), mat);
  const words = new THREE.Mesh(text.geometry(), textMat);
  lines.receiveShadow = words.receiveShadow = true;
  return [lines, words];
}

// ---------------- materials ----------------
function worldMaterial(tex, { repeat, color = 0xffffff, rough = 0.9, normalScale = 1 }) {
  tex.map.repeat.set(1 / repeat, 1 / repeat);
  tex.normalMap.repeat.set(1 / repeat, 1 / repeat);
  return new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(normalScale, normalScale), roughness: rough, color });
}

// Asphalt with kerb-side gutter grime, lane wear, repair patches and a macro tone so the tile never repeats visibly.
function patchAsphalt(mat, puddles) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, fieldUniforms, groundAOUniforms, { uPuddles: { value: puddles } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vWXZ;\nuniform sampler2D uPuddles;\n${FIELD_GLSL}\n${GROUND_AO_GLSL}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${GROUND_AO_APPLY}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float fk = kerbField(vWXZ);
        float macro = fbm2(vWXZ * 0.045);
        diffuseColor.rgb *= 0.86 + 0.28 * macro;
        // gutter grime within ~0.7 m of the kerb
        float gut = smoothstep(-0.9, -0.05, fk);
        diffuseColor.rgb *= 1.0 - 0.28 * gut * (0.6 + 0.4 * vnoise(vWXZ * 1.7));
        // repair patches: sharp-edged rectangles of fresher or older tar
        vec2 cell = floor(vWXZ / 7.0);
        float pr = hash21(cell);
        if (pr > 0.8) {
          vec2 lp = fract(vWXZ / 7.0) - 0.5;
          vec2 sz = vec2(0.15 + 0.25 * hash21(cell + 3.1), 0.1 + 0.3 * hash21(cell + 7.7));
          if (abs(lp.x) < sz.x && abs(lp.y) < sz.y) diffuseColor.rgb *= pr > 0.9 ? 0.9 : 1.07;
        }
        // oily centre of each lane
        diffuseColor.rgb *= 1.0 - 0.06 * smoothstep(0.35, 0.65, vnoise(vWXZ * 0.3)) * (1.0 - gut);
        // wet: a thin film everywhere, standing water in dips (dark puddle-map areas) and along the gutters
        float pudTex = texture2D(uPuddles, vWXZ / 12.0).r;
        float puddle = uWet * max(smoothstep(0.62, 0.5, pudTex), 0.85 * smoothstep(-0.5, -0.1, fk));
        float film = uWet;
        diffuseColor.rgb *= 1.0 - 0.28 * film - 0.3 * puddle;
        float wetMask = max(film * 0.55, puddle);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(roughnessFactor, 0.2, film), 0.035, puddle);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // the water film fills the aggregate texture (half-flattened); puddles are flat with ripples
        normal = wetNormal(normal, nonPerturbedNormal, max(puddle, film * 0.5), vWXZ);`);
  };
  return mat;
}

// Paving top: granite kerb band along the edge, weathering near walls, wet darkening.
function patchPaving(mat, kerbTex) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, fieldUniforms, groundAOUniforms, { uKerb: { value: kerbTex } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vWXZ;\nuniform sampler2D uKerb;\n${FIELD_GLSL}\n${GROUND_AO_GLSL}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${GROUND_AO_APPLY}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float fk = kerbField(vWXZ);
        diffuseColor.rgb *= 0.9 + 0.2 * fbm2(vWXZ * 0.08);
        float kerb = 1.0 - smoothstep(0.26, 0.3, fk);
        if (kerb > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uKerb, vWXZ * vec2(1.0, 0.33)).rgb * vec3(0.95, 0.94, 0.92), kerb);
        // wet slabs: film everywhere, small puddles where slabs have settled
        float slabPud = uWet * smoothstep(0.66, 0.78, vnoise(vWXZ * 0.9)) * (1.0 - kerb);
        float wetP = uWet * (0.75 + 0.25 * vnoise(vWXZ * 0.4));
        diffuseColor.rgb *= 1.0 - 0.3 * wetP - 0.2 * slabPud;
        float wetR = max(wetP * 0.5, slabPud);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(roughnessFactor, 0.3, wetP), 0.05, slabPud);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = wetNormal(normal, nonPerturbedNormal, slabPud, vWXZ);`);
  };
  return mat;
}

export function buildStreets(scene, puddles) {
  const t0 = performance.now();
  const A = asphalt(), P = paving(), K = granite(), S = setts(), Gr = grass();
  const asphaltMat = addReflections(patchAsphalt(worldMaterial(A, { repeat: 4, rough: 0.92, normalScale: 0.9 }), puddles), 1.3, 'wetMask');
  const pavingMat = addReflections(patchPaving(worldMaterial(P, { repeat: 1, rough: 0.85, normalScale: 0.8 }), K.map), 1.1, 'wetR');
  K.map.repeat.set(1, 1); K.normalMap.repeat.set(1, 1);
  const kerbMat = new THREE.MeshStandardMaterial({ map: K.map, normalMap: K.normalMap, roughness: 0.7, color: 0xe6e3dc });
  // granite setts polished by tyres and feet: a faint sheen that catches the sky
  const settMat = addReflections(worldMaterial(S, { repeat: 3, rough: 0.55, normalScale: 1.2 }), 0.35);
  settMat.polygonOffset = true; settMat.polygonOffsetFactor = -1; settMat.polygonOffsetUnits = -1;
  const grassMat = worldMaterial(Gr, { repeat: 2, rough: 0.95 });
  grassMat.polygonOffset = true; grassMat.polygonOffsetFactor = -2; grassMat.polygonOffsetUnits = -2;
  const lineMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  lineMat.onBeforeCompile = (sh) => {
    // worn paint: erode lines with world-space noise
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vWXZ;\n${FIELD_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float wear = fbm2(vWXZ * 3.1);
        if (wear < 0.3) discard;
        diffuseColor.rgb *= 0.82 + 0.18 * smoothstep(0.3, 0.6, wear);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.15, uWet);');
    Object.assign(sh.uniforms, fieldUniforms);
  };
  const textMat = new THREE.MeshStandardMaterial({ map: wordAtlas(), transparent: true, alphaTest: 0.4, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false });

  const group = new THREE.Group();
  group.name = 'streets';
  const pave = buildPavements({ paving: pavingMat, kerb: kerbMat });
  group.add(pave.mesh);
  group.add(...buildMarkings(lineMat, textMat));

  // granite setts on the Temple Bar lanes and Grafton Street
  const sr = new Ribbons();
  for (const way of world.ways) {
    if (way.type !== 'lane' && way.name !== 'Grafton Street') continue;
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], b = way.pts[k + 1], d = v2.norm(v2.sub(b, a)), n = { x: -d.z * way.width / 2, z: d.x * way.width / 2 };
      const ext = v2.scale(d, 2);
      const a2 = v2.sub(a, ext), b2 = v2.add(b, ext);
      sr.quad(v2.sub(a2, n), v2.sub(b2, n), v2.add(b2, n), v2.add(a2, n), 0.004, null, null);
    }
  }
  const sg = sr.geometry();
  { const p = sg.attributes.position, uv = sg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i)); }
  const settsMesh = new THREE.Mesh(sg, settMat);
  settsMesh.receiveShadow = true;
  group.add(settsMesh);

  // Luas: concrete track bed and four steel rails
  const lp = world.luas.pts;
  const bed = new Ribbons(), rails = new Ribbons();
  bed.strip(lp, 0, 7.2, 0.006, null);
  for (const off of [-2.52, -1.08, 1.08, 2.52]) rails.strip(lp, off, 0.075, 0.011, null);
  const bedGeo = bed.geometry();
  { const p = bedGeo.attributes.position, uv = bedGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3.6, p.getZ(i) / 3.6); }
  const bedMat = new THREE.MeshStandardMaterial({ map: P.map, normalMap: P.normalMap, color: 0xb9b6ae, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const railMat = addReflections(new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 1, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 1.0);
  group.add(new THREE.Mesh(bedGeo, bedMat), new THREE.Mesh(rails.geometry(), railMat));
  group.children.forEach((m) => { m.receiveShadow = true; });

  scene.add(group);
  console.log(`streets: ${pave.loops} pavement blocks in ${Math.round(performance.now() - t0)} ms`);
  return { group, asphaltMat, pavingMat, kerbMat, grassMat, settMat, asphaltTex: A };
}

// Grass surfaces laid on top of the pavement (parks, lawns).
export function grassPolygon(poly, mat) {
  const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, KERB_H + 0.004, 0);
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

// O'Connell Street's raised central median, split at junctions.
export function buildMedian(mats) {
  const group = new THREE.Group();
  for (const way of world.ways) {
    if (way.type !== 'boulevard') continue;
    for (const run of runs(way)) {
      if (run.a.id === 'NQ8') continue; // bridge end: the monument island is separate
      const pts = trim(run.pts, junctionClear(run.a) + 2, junctionClear(run.b) + 2);
      if (!pts) continue;
      const L = offsetPolyline(pts, 3), R = offsetPolyline(pts, -3).reverse();
      const shape = new THREE.Shape([...L, ...R].map((p) => new THREE.Vector2(p.x, -p.z)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, p.getX(i) / 3.6, p.getZ(i) / 3.6);
      }
      const m = new THREE.Mesh(g, [mats.pavingMat, mats.kerbMat]);
      m.receiveShadow = m.castShadow = true;
      group.add(m);
    }
  }
  return group;
}

export const QUALITY = { mobile: IS_MOBILE };

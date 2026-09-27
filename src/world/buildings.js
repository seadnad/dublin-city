// Procedural filler city: street-frontage lots on an occupancy grid, drawn as one instanced mesh
// whose shader paints brick, sash windows, Georgian doors, shopfronts and curtain walls.
import * as THREE from 'three';
import { world, PAVEMENT, v2 } from './geo.js';
import { parkPolys, campusPolys } from './ground.js';
import { reserved } from './sites.js';
import { rng, fbm } from './textures.js';
import { addBox } from '../game/collision.js';

const B = world.bounds;
const CELL = 0.5;
const GW = Math.ceil(B.w / CELL), GH = Math.ceil(B.h / CELL);
const grid = new Uint8Array(GW * GH);
const rand = rng(1759);

// ---------- occupancy grid ----------
const gi = (x) => Math.floor((x - B.minX) / CELL), gj = (z) => Math.floor((z - B.minZ) / CELL);
function occupied(x, z) {
  const i = gi(x), j = gj(z);
  if (i < 2 || j < 2 || i >= GW - 2 || j >= GH - 2) return true;
  return grid[j * GW + i] !== 0;
}
function fillPolygon(poly, val = 1) {
  let z0 = Infinity, z1 = -Infinity;
  for (const p of poly) { z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  for (let j = Math.max(0, gj(z0)); j <= Math.min(GH - 1, gj(z1)); j++) {
    const z = B.minZ + (j + 0.5) * CELL;
    const xs = [];
    for (let k = 0, m = poly.length - 1; k < poly.length; m = k++) {
      const a = poly[k], b = poly[m];
      if ((a.z > z) !== (b.z > z)) xs.push(a.x + ((z - a.z) / (b.z - a.z)) * (b.x - a.x));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let i = Math.max(0, gi(xs[k])); i <= Math.min(GW - 1, gi(xs[k + 1])); i++) grid[j * GW + i] = val;
    }
  }
}
function fillSegment(a, b, r) {
  const i0 = Math.max(0, gi(Math.min(a.x, b.x) - r)), i1 = Math.min(GW - 1, gi(Math.max(a.x, b.x) + r));
  const j0 = Math.max(0, gj(Math.min(a.z, b.z) - r)), j1 = Math.min(GH - 1, gj(Math.max(a.z, b.z) + r));
  const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1e-9;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = B.minX + (i + 0.5) * CELL, z = B.minZ + (j + 0.5) * CELL;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - a.x - abx * t, dz = z - a.z - abz * t;
    if (dx * dx + dz * dz <= r * r) grid[j * GW + i] = 1;
  }
}
function obbCorners(o, shrink = 0) {
  const c = Math.cos(o.rot), s = Math.sin(o.rot), hx = o.w / 2 - shrink, hz = o.d / 2 - shrink;
  return [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([lx, lz]) => ({ x: o.x + lx * c + lz * s, z: o.z - lx * s + lz * c }));
}
function testOBB(o, shrink = 0.4) {
  const c = Math.cos(o.rot), s = Math.sin(o.rot), hx = o.w / 2 - shrink, hz = o.d / 2 - shrink;
  for (let lx = -hx; lx <= hx + 1e-6; lx += Math.min(CELL, hx)) {
    for (let lz = -hz; lz <= hz + 1e-6; lz += Math.min(CELL, hz)) {
      if (occupied(o.x + lx * c + lz * s, o.z - lx * s + lz * c)) return false;
    }
  }
  return true;
}
const markOBB = (o, shrink = 0.4) => fillPolygon(obbCorners(o, shrink));

// roads + pavements, river, parks, campus, landmarks
for (const s of world.segs) fillSegment(s.a, s.b, s.way.width / 2 + PAVEMENT);
fillPolygon(world.riverPoly);
for (const p of [...parkPolys, ...campusPolys]) fillPolygon(p.poly);
for (const r of reserved) markOBB(r, -1);
// Luas platforms stand in the road; keep an apron clear around the track anyway
for (let i = 1; i < world.luas.pts.length; i++) fillSegment(world.luas.pts[i - 1], world.luas.pts[i], 6);

// ---------- styles ----------
const S = { GEORGIAN: 0, BRICK: 1, STUCCO: 2, TEMPLEBAR: 3, MODERN: 4 };
const hex = (h) => new THREE.Color(h);
const BRICKS = ['#8a3b2a', '#9c4a33', '#7a3a2c', '#a3563b', '#6e3326', '#8f4530', '#a0503a'].map(hex);
const DOORS = ['#b01e23', '#1d3f8a', '#1f6b3a', '#e1b423', '#1a1a1a', '#5b2c6f', '#1f7b7b', '#c2571a', '#f2efe6'].map(hex);
const STUCCO = ['#d8cfb8', '#c9c3b4', '#b7ad99', '#e3dccb', '#9da3a6', '#d6c7a1', '#c4b8a8'].map(hex);
const VIVID = ['#b3261e', '#2f5d8a', '#e0b33a', '#3d7a52', '#7b3f8a', '#e8e0d0', '#d87a3a', '#2a2a2a'].map(hex);
const FASCIA = ['#1e3b2c', '#6b1a1a', '#1a2440', '#2b2b2b', '#8a6a1f', '#3f5f2f', '#732f4a'].map(hex);
const GLASS = ['#5f7887', '#4d5f6a', '#7c93a0', '#6c7f7a'].map(hex);
const PANELS = ['#c8c8c4', '#3a3d40', '#9aa0a3', '#b9b2a4'].map(hex);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const GEORGIAN_ST = /Merrion|Stephen's Green|Dawson|Kildare|Harcourt|Leeson|Baggot|Clare|Gardiner|Westland|Cuffe|King Street|Church Street|Merrion Row/;
const TEMPLE_BAR = /Temple Bar|Fleet|Essex Street|Eustace|Crown Alley|Anglesea|Sycamore|Fishamble|Exchequer|Wicklow/;
const DOCK_ST = /North Wall|Rogerson|City Quay|Mayor|Commons|Memorial|Lombard|Sandwith|Townsend|Pearse|Store|Amiens|Tara|George's Quay/;

function styleFor(x, z, way) {
  const name = way ? way.name : '';
  const docks = x > 300 && z < 150; // Docklands: east of the Custom House, north of Pearse Street
  if (docks && !GEORGIAN_ST.test(name)) return S.MODERN;
  if (x > 200 && DOCK_ST.test(name)) return rand() < 0.65 ? S.MODERN : S.BRICK;
  if (TEMPLE_BAR.test(name)) return S.TEMPLEBAR;
  if (GEORGIAN_ST.test(name)) return rand() < 0.85 ? S.GEORGIAN : S.BRICK;
  if (/Parnell|Capel|Aungier|Talbot|Marlborough/.test(name)) return rand() < 0.5 ? S.GEORGIAN : S.BRICK;
  if (/Quay|Bachelors/.test(name)) return rand() < 0.5 ? S.STUCCO : rand() < 0.5 ? S.BRICK : S.TEMPLEBAR;
  return rand() < 0.55 ? S.STUCCO : S.BRICK;
}

function lotSpec(style) {
  switch (style) {
    case S.GEORGIAN: { const bays = rand() < 0.7 ? 3 : 4; return { w: bays * 2.5 + 0.5, d: 12 + rand() * 5, floors: rand() < 0.7 ? 4 : rand() < 0.5 ? 3 : 5, fh: 3.35, bay: 2.5 }; }
    case S.BRICK: return { w: 7 + rand() * 9, d: 13 + rand() * 7, floors: 4 + Math.floor(rand() * 3), fh: 3.6, bay: 2.9 };
    case S.STUCCO: return { w: 7 + rand() * 10, d: 13 + rand() * 7, floors: 4 + Math.floor(rand() * 3), fh: 3.6, bay: 3.0 };
    case S.TEMPLEBAR: return { w: 5.5 + rand() * 6, d: 9 + rand() * 5, floors: 3 + Math.floor(rand() * 2), fh: 3.2, bay: 2.6 };
    default: return { w: 18 + rand() * 18, d: 16 + rand() * 12, floors: 6 + Math.floor(rand() * 5) + (rand() < 0.2 ? 5 : 0), fh: 3.5, bay: 1.6 };
  }
}

function colorsFor(style) {
  switch (style) {
    case S.GEORGIAN: return [pick(BRICKS), pick(DOORS)];
    case S.BRICK: return [pick(BRICKS), pick(FASCIA)];
    case S.STUCCO: return [pick(STUCCO), pick(FASCIA)];
    case S.TEMPLEBAR: return [pick(VIVID), pick(FASCIA)];
    default: return [pick(GLASS), pick(PANELS)];
  }
}

// ---------- lot placement ----------
const lots = [];
function place(o, style, spec) {
  const [base, trim] = colorsFor(style);
  const parapet = style === S.MODERN ? 0.6 : 0.9;
  const h = spec.floors * spec.fh + parapet;
  lots.push({ ...o, h, style, fh: spec.fh, bay: spec.bay, base, trim, seed: rand() });
  markOBB(o);
}

const priority = { boulevard: 0, primary: 1, quay: 1, secondary: 2, lane: 3 };
const ordered = world.ways.filter((w) => !w.bridge).sort((a, b) => priority[a.type] - priority[b.type]);
for (const way of ordered) {
  for (const side of [1, -1]) {
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], b = way.pts[k + 1];
      const dir = v2.norm(v2.sub(b, a)), L = v2.len(v2.sub(b, a));
      const n = { x: dir.z * side, z: -dir.x * side }; // away from the road
      const setback = way.width / 2 + PAVEMENT + 0.15;
      const rot = Math.atan2(-n.x, -n.z);
      let s = 0;
      while (s < L) {
        const mid = v2.add(a, v2.scale(dir, s));
        const style = styleFor(mid.x, mid.z, way);
        const spec = lotSpec(style);
        if (s + spec.w > L + 3) { s += 2; continue; }
        let placed = false;
        for (const df of [1, 0.7, 0.5]) {
          const d = spec.d * df;
          if (d < 6) break;
          const c = v2.add(a, v2.scale(dir, s + spec.w / 2));
          const o = { x: c.x + n.x * (setback + d / 2), z: c.z + n.z * (setback + d / 2), rot, w: spec.w, d };
          if (testOBB(o)) { place(o, style, spec); placed = true; break; }
        }
        s += placed ? spec.w : 1.5;
      }
    }
  }
}
const frontageCount = lots.length;

// Interior backfill so block cores aren't empty when seen from above or across open ground
for (let z = B.minZ + 10; z < B.maxZ - 10; z += 11) {
  for (let x = B.minX + 10; x < B.maxX - 10; x += 11) {
    if (occupied(x, z)) continue;
    const road = world.nearestRoad(x, z);
    const seg = road ? road.seg : null;
    const rot = seg ? Math.atan2(seg.b.x - seg.a.x, seg.b.z - seg.a.z) : 0;
    const style = x > 300 && z < 150 ? S.MODERN : rand() < 0.5 ? S.BRICK : S.STUCCO;
    for (const size of [14, 10, 7]) {
      const o = { x, z, rot, w: size + rand() * 3, d: size + rand() * 3 };
      if (testOBB(o)) {
        const spec = lotSpec(style);
        spec.floors = Math.max(3, spec.floors - 1);
        place(o, style, spec);
        break;
      }
    }
  }
}

// ---------- instanced mesh ----------
function brickTexture() {
  const size = 256, c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const n = fbm(size, 4, 17);
  const img = ctx.createImageData(size, size);
  const course = size / 26, brick = course * 3;
  const r2 = rng(5);
  const tones = [];
  for (let i = 0; i < 400; i++) tones.push(0.78 + r2() * 0.3);
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / course), fy = y - row * course;
    for (let x = 0; x < size; x++) {
      const xo = x + (row % 2 ? brick / 2 : 0);
      const col = Math.floor(xo / brick), fx = xo - col * brick;
      const mortar = fy < 1.3 || fx < 1.3;
      const v = mortar ? 0.55 : tones[(row * 13 + col) % 400] * (0.9 + n[y * size + x] * 0.2);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v * 230); img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export const buildingUniforms = { uNight: { value: 0 }, uBrick: { value: null }, uWet: { value: 0 } };

function makeMaterial() {
  buildingUniforms.uBrick.value = brickTexture();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, buildingUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aBase; attribute vec3 aTrim; attribute vec4 aStyle;
        varying vec3 vBase; varying vec3 vTrim; varying vec4 vStyle; varying vec4 vFacade; varying float vFace;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        float uu = abs(normal.x) > 0.5 ? (normal.x > 0.0 ? 0.5 - position.z : position.z + 0.5) * sc.z
                                       : (normal.z > 0.0 ? position.x + 0.5 : 0.5 - position.x) * sc.x;
        vFacade = vec4(uu, position.y * sc.y, abs(normal.x) > 0.5 ? sc.z : sc.x, sc.y);
        vFace = normal.y > 0.5 ? 0.0 : normal.z > 0.5 ? 1.0 : normal.z < -0.5 ? 2.0 : 3.0;
        vBase = aBase; vTrim = aTrim; vStyle = aStyle;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight; uniform float uWet; uniform sampler2D uBrick;
        varying vec3 vBase; varying vec3 vTrim; varying vec4 vStyle; varying vec4 vFacade; varying float vFace;
        float bh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float box2(vec2 p, vec2 a, vec2 b){ return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
        float gGlass; vec3 gEmit;
        // A sash / casement window in cell coords (x 0..1 across the bay, y metres within the floor)
        vec3 sashWindow(vec2 q, vec2 size, vec3 wall, vec3 frameCol, float panesX, float panesY, float lit, inout float glass) {
          vec2 w = (q - vec2(0.5 - size.x * 0.5, 0.0)) / size;
          if (w.x < 0.0 || w.x > 1.0 || w.y < 0.0 || w.y > 1.0) return wall;
          vec2 fw = fwidth(w) * 1.2;
          float frame = 1.0 - box2(w, vec2(0.07), vec2(0.93));
          float bars = max(step(fract(w.x * panesX), 0.06 + fw.x * panesX), step(fract(w.y * panesY), 0.05 + fw.y * panesY));
          bars *= 0.75;
          float mid = step(abs(w.y - 0.5), 0.025);
          vec3 g = mix(vec3(0.07, 0.085, 0.1), vec3(0.16, 0.18, 0.2), w.y);
          g = mix(g, vec3(0.6, 0.45, 0.28), lit);
          glass = 1.0 - max(frame, max(bars, mid));
          return mix(g, frameCol, max(frame, max(bars, mid)));
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float style = vStyle.x, fh = vStyle.y, bw = vStyle.z, seed = vStyle.w;
          float u = vFacade.x, v = vFacade.y, W = vFacade.z, H = vFacade.w;
          vec3 col = vBase; gGlass = 0.0; gEmit = vec3(0.0);
          if (vFace < 0.5) {
            col = mix(vec3(0.2, 0.2, 0.21), vec3(0.3, 0.29, 0.28), bh(vec2(seed, 1.0)));
          } else {
            float brickLike = (style < 1.5) ? 1.0 : 0.0;
            float tex = texture2D(uBrick, vec2(u, v) * 0.5).r;
            float blot = texture2D(uBrick, vec2(u, v) * 0.037 + seed).r;
            col *= brickLike > 0.5 ? mix(0.62, 1.12, tex) : mix(0.9, 1.05, blot);
            float nb = max(1.0, floor(W / bw + 0.5));
            float bayW = W / nb;
            float bi = floor(u / bayW), fx = fract(u / bayW);
            float nfl = max(1.0, floor((H - 0.5) / fh));
            float fl = floor(v / fh), fy = v - fl * fh;
            float lit = step(0.5, bh(vec2(bi + seed * 17.0, fl + vFace * 5.0))) * uNight;
            bool front = vFace > 0.5 && vFace < 1.5;
            bool side = vFace > 2.5;
            vec3 white = vec3(0.86, 0.85, 0.8);
            if (v > nfl * fh) {
              // parapet / cornice
              col = style > 3.5 ? vTrim : (v > H - 0.22 ? vec3(0.72, 0.7, 0.66) : col);
            } else if (style > 3.5) {
              // modern curtain wall: glass bands with spandrel panels and mullions
              float spandrel = step(fy, fh * 0.3);
              float mullion = step(fx, 0.05) + step(0.97, fx);
              vec3 g = vBase * 0.55 + vec3(0.02, 0.03, 0.04);
              float litM = step(0.4, bh(vec2(bi * 0.3 + seed * 11.0, fl))) * uNight;
              g = mix(g, vec3(0.55, 0.56, 0.5), litM);
              col = mix(g, vTrim, max(spandrel, 0.0));
              col = mix(col, vec3(0.16, 0.17, 0.18), clamp(mullion, 0.0, 1.0));
              gGlass = (1.0 - spandrel) * (1.0 - clamp(mullion, 0.0, 1.0));
              gEmit = (1.0 - spandrel) * litM * vec3(0.85, 0.88, 0.8) * 0.6;
              if (fl < 0.5) { col = mix(vec3(0.08, 0.1, 0.11), vec3(0.15), step(fy, 0.2)); gGlass = 1.0; gEmit = uNight * vec3(0.9, 0.85, 0.7) * 0.5; }
            } else if (side && W < 11.0) {
              // party wall / gable: plain
            } else {
              bool ground = fl < 0.5;
              if (ground && front && style > 0.5) {
                // shopfront: fascia band above a big glazed front
                if (fy > fh * 0.76 && fy < fh * 0.97) col = vTrim;
                else if (fy <= fh * 0.76) {
                  float pier = step(fx, 0.06) + step(0.94, fx);
                  float stall = step(fy, 0.45);
                  float shopLit = uNight * step(0.3, bh(vec2(bi, seed * 5.0)));
                  vec3 g = mix(vec3(0.06, 0.07, 0.08), vec3(0.55, 0.42, 0.28), shopLit);
                  col = mix(g, vTrim * 0.8, clamp(pier + stall, 0.0, 1.0));
                  gGlass = 1.0 - clamp(pier + stall, 0.0, 1.0);
                  gEmit = gGlass * shopLit * vec3(1.0, 0.72, 0.45) * 0.55;
                }
              } else if (ground && front && style < 0.5 && abs(bi - floor(bh(vec2(seed, 3.0)) * nb)) < 0.5) {
                // Georgian door with a fanlight and stone surround
                vec2 q = vec2((fx - 0.5) * bayW, fy);
                float dw = 0.62, dh = 2.25, fr = dw;
                bool inDoor = abs(q.x) < dw && q.y < dh;
                bool inFan = length(q - vec2(0.0, dh)) < fr && q.y >= dh;
                bool inSurround = abs(q.x) < dw + 0.18 && q.y < dh + fr + 0.18 && !inDoor && !inFan && (q.y < dh || length(q - vec2(0.0, dh)) < fr + 0.18);
                if (inSurround) col = vec3(0.8, 0.78, 0.72);
                if (inDoor) {
                  col = vTrim;
                  vec2 pp = vec2(abs(q.x) / dw, q.y / dh);
                  float panel = box2(fract(pp * vec2(1.0, 3.0)), vec2(0.18), vec2(0.82));
                  col *= mix(0.8, 1.05, panel);
                  if (length(q - vec2(0.12, 1.05)) < 0.04) col = vec3(0.85, 0.7, 0.3); // brass knob
                }
                if (inFan) {
                  float ang = atan(q.y - dh, q.x);
                  float rays = step(0.8, fract(ang * 3.0));
                  col = mix(mix(vec3(0.1, 0.12, 0.14), vec3(1.0, 0.8, 0.5), uNight), white, max(rays, step(fr - 0.07, length(q - vec2(0.0, dh)))));
                  gEmit = uNight * vec3(1.0, 0.75, 0.45) * (1.0 - rays);
                }
                if (v < 0.35) col = vec3(0.55, 0.54, 0.52);
              } else {
                // windows: Georgian proportions diminish as you go up
                vec2 size = vec2(0.42, fh * 0.55);
                float y0 = fh * 0.22;
                if (style < 0.5) {
                  if (fl > 0.5 && fl < 1.5) { size.y = fh * 0.68; y0 = fh * 0.12; }
                  else if (fl > nfl - 1.5) { size.y = fh * 0.4; y0 = fh * 0.28; }
                } else { size.x = 0.5; }
                if (style > 2.5 && style < 3.5) size.x = 0.46;
                vec3 frameCol = style > 2.5 ? vec3(0.9) : white;
                float gl = 0.0;
                vec3 wcol = sashWindow(vec2(fx, fy - y0), vec2(size.x, size.y), col, frameCol, 3.0, 4.0, lit, gl);
                // stone sill / lintel on stucco & commercial
                if (style > 0.5 && abs(fx - 0.5) < size.x * 0.58 && (abs(fy - y0 + 0.08) < 0.08 || abs(fy - y0 - size.y - 0.1) < 0.1)) wcol = vec3(0.78, 0.76, 0.7);
                col = wcol; gGlass = gl; gEmit = gl * lit * vec3(1.0, 0.7, 0.4) * 0.8;
                if (style < 0.5 && v < 0.4) col = vec3(0.55, 0.54, 0.52); // granite plinth
              }
            }
            // ground contact darkening
            col *= 0.72 + 0.28 * smoothstep(0.0, 2.5, v);
          }
          diffuseColor.rgb = col;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor * (1.0 - uWet * 0.35), 0.12, gGlass);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += gEmit;`);
  };
  return mat;
}

export function buildBuildings(scene) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const count = lots.length;
  const aBase = new Float32Array(count * 3), aTrim = new Float32Array(count * 3), aStyle = new Float32Array(count * 4);
  const mesh = new THREE.InstancedMesh(geo, makeMaterial(), count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const chimneys = [];
  lots.forEach((L, i) => {
    q.setFromAxisAngle(up, L.rot);
    m4.compose(new THREE.Vector3(L.x, 0, L.z), q, new THREE.Vector3(L.w, L.h, L.d));
    mesh.setMatrixAt(i, m4);
    aBase.set([L.base.r, L.base.g, L.base.b], i * 3);
    aTrim.set([L.trim.r, L.trim.g, L.trim.b], i * 3);
    aStyle.set([L.style, L.fh, L.bay, L.seed], i * 4);
    addBox(L.x, L.z, L.w / 2, L.d / 2, L.rot);
    if (L.style === S.GEORGIAN || L.style === S.BRICK) {
      // chimney stacks on the party walls
      for (const sx of [-1, 1]) {
        if (rand() < 0.35) continue;
        const lx = sx * (L.w / 2 - 0.45), lz = (rand() - 0.5) * L.d * 0.4;
        const c = Math.cos(L.rot), s = Math.sin(L.rot);
        chimneys.push({ x: L.x + lx * c + lz * s, z: L.z - lx * s + lz * c, y: L.h, rot: L.rot, color: L.base });
      }
    }
  });
  geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(aBase, 3));
  geo.setAttribute('aTrim', new THREE.InstancedBufferAttribute(aTrim, 3));
  geo.setAttribute('aStyle', new THREE.InstancedBufferAttribute(aStyle, 4));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  scene.add(mesh);

  // chimneys (with pots)
  const cgeo = new THREE.BoxGeometry(0.8, 1.7, 2.4);
  cgeo.translate(0, 0.85, 0);
  const cmat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const cm = new THREE.InstancedMesh(cgeo, cmat, chimneys.length);
  chimneys.forEach((c, i) => {
    q.setFromAxisAngle(up, c.rot);
    cm.setMatrixAt(i, m4.compose(new THREE.Vector3(c.x, c.y - 0.2, c.z), q, new THREE.Vector3(1, 1, 1)));
    cm.setColorAt(i, c.color.clone().multiplyScalar(0.85));
  });
  cm.castShadow = true;
  scene.add(cm);

  return { mesh, count, frontageCount, lots };
}

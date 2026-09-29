// Hand-modelled landmarks (low poly, merged per material) and park trees.
import * as THREE from 'three';
import { addReflections } from '../render/reflect.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, v2, pointInPolygon, insetPolygon } from './geo.js';
import { sites, reserved, grounds, extraSites } from './sites.js';
import { parkPolys, campusPolys, stoneTex, WATER_Y, paintArea, COLORS } from './ground.js';
import { rng, makeStoneTexture } from './textures.js';
import { addBox } from '../game/collision.js';
import { chunkedInstances } from './chunks.js';
import { plantTrees } from './trees.js';
import { KERB_H } from './roads.js';
import { placeHapenny, placeParts, setStoneNight } from './heroes.js';
import { buildPark } from './park.js';

const rand = rng(1742);

// ---------- textures ----------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const STONE = '#d8d2c2';
function ashlar(ctx, w, h, rows, color = STONE) {
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(90,85,75,0.28)';
  for (let r = 0; r < rows; r++) ctx.fillRect(0, (r * h) / rows, w, 1.5);
  for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(80,75,65,${Math.random() * 0.06})`; ctx.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 20, 3 + Math.random() * 8); }
}
// one classical window bay: 4 m wide x 4.5 m tall
const facadeTex = canvasTex(128, 144, (ctx, w, h) => {
  ashlar(ctx, w, h, 8);
  const ww = 44, wh = 78, x = (w - ww) / 2, y = 40;
  ctx.fillStyle = '#c9c2b0'; ctx.fillRect(x - 8, y - 16, ww + 16, 10); // hood
  ctx.fillStyle = '#bfb8a6'; ctx.fillRect(x - 5, y + wh, ww + 10, 6); // sill
  ctx.fillStyle = '#eeeae0'; ctx.fillRect(x, y, ww, wh);
  ctx.fillStyle = '#1d2327';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x + 3 + c * 13.3, y + 3 + r * 18.8, 11, 16.5);
});
// Gothic lancet bay: 5 m x 9 m
const gothicTex = canvasTex(128, 230, (ctx, w, h) => {
  ashlar(ctx, w, h, 14, '#b3a893');
  ctx.fillStyle = '#1b1f24';
  ctx.beginPath();
  const x = w / 2, bw = 30, top = 40, bottom = 190;
  ctx.moveTo(x - bw / 2, bottom); ctx.lineTo(x - bw / 2, top + 30);
  ctx.quadraticCurveTo(x - bw / 2, top, x, top - 8); ctx.quadraticCurveTo(x + bw / 2, top, x + bw / 2, top + 30);
  ctx.lineTo(x + bw / 2, bottom); ctx.fill();
  ctx.strokeStyle = '#8f8674'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
});
// blind niche bay for the Bank of Ireland screen walls: 4 m x 11 m
const nicheTex = canvasTex(96, 264, (ctx, w, h) => {
  ashlar(ctx, w, h, 16, '#cfc8b6');
  ctx.fillStyle = '#b3ab97';
  ctx.beginPath(); ctx.moveTo(30, 200); ctx.lineTo(30, 110); ctx.arc(48, 110, 18, Math.PI, 0); ctx.lineTo(66, 200); ctx.fill();
  ctx.fillStyle = '#a39b87'; ctx.fillRect(24, 200, 48, 8);
});
// Ha'penny Bridge ironwork railing
const ironTex = canvasTex(128, 64, (ctx, w, h) => {
  ctx.strokeStyle = '#f4f3ee'; ctx.lineWidth = 4;
  ctx.strokeRect(2, 4, w - 4, h - 8);
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(16 + i * 32, h / 2, 12, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 4); ctx.lineTo(i * 32, h - 4); ctx.stroke(); }
});
const tricolour = canvasTex(96, 48, (ctx, w, h) => {
  ctx.fillStyle = '#169b62'; ctx.fillRect(0, 0, w / 3, h);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(w / 3, 0, w / 3, h);
  ctx.fillStyle = '#ff883e'; ctx.fillRect((2 * w) / 3, 0, w / 3, h);
});

// ---------- materials ----------
const stoneT = makeStoneTexture(256, [214, 208, 194]);
const M = {
  portland: new THREE.MeshStandardMaterial({ color: 0xffffff, map: stoneT, roughness: 0.85 }),
  facade: new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.85 }),
  gothic: new THREE.MeshStandardMaterial({ map: gothicTex, roughness: 0.9 }),
  gothicStone: new THREE.MeshStandardMaterial({ color: 0xb3a893, map: stoneTex, roughness: 0.9 }),
  niche: new THREE.MeshStandardMaterial({ map: nicheTex, roughness: 0.85 }),
  granite: new THREE.MeshStandardMaterial({ color: 0x9d9a93, map: stoneTex, roughness: 0.78 }),
  copper: new THREE.MeshStandardMaterial({ color: 0x5e9c86, roughness: 0.75, metalness: 0 }), // verdigris is mineral, not metal
  slate: new THREE.MeshStandardMaterial({ color: 0x4b5057, roughness: 0.7 }),
  lead: new THREE.MeshStandardMaterial({ color: 0x6b7075, roughness: 0.62, metalness: 0.15 }),
  steel: addReflections(new THREE.MeshStandardMaterial({ color: 0xd6dadd, roughness: 0.2, metalness: 1.0 }), 1.0), // the Spire: brushed stainless
  iron: addReflections(new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.38, metalness: 0 }), 0.6), // painted cast iron
  ironLace: new THREE.MeshStandardMaterial({ map: ironTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.6 }),
  bronze: addReflections(new THREE.MeshStandardMaterial({ color: 0x4f5b47, roughness: 0.45, metalness: 0.85 }), 0.6),
  flag: new THREE.MeshStandardMaterial({ map: tricolour, side: THREE.DoubleSide, roughness: 0.8 }),
  lampGlow: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd9a0, emissiveIntensity: 0.2 }),
  water: new THREE.MeshStandardMaterial({ color: 0x2b4540, roughness: 0.05, metalness: 0.4 }),
};
export const landmarkMaterials = M;

// ---------- builder ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
class Builder {
  constructor(site) { this.parts = new Map(); this.site = site; }
  add(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, sx = s, sy = s, sz = s } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }
  box(w, h, d, mat, o = {}) { return this.add(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), mat, o); }
  // box whose side UVs are in bay units so a facade texture tiles properly; roof uses `roofMat`
  facade(w, h, d, mat, roofMat, o = {}, bay = 4, floor = 4.5) {
    const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0).toNonIndexed();
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const nx = nor.getX(i), nz = nor.getZ(i);
      if (Math.abs(nx) > 0.5) uv.setXY(i, (pos.getZ(i) * -Math.sign(nx) + d / 2) / bay, pos.getY(i) / floor);
      else if (Math.abs(nz) > 0.5) uv.setXY(i, (pos.getX(i) * Math.sign(nz) + w / 2) / bay, pos.getY(i) / floor);
    }
    // split into walls vs top/bottom
    const walls = [], tops = [];
    for (let f = 0; f < 6; f++) {
      const sub = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv']) {
        const a = g.attributes[k];
        sub.setAttribute(k, new THREE.BufferAttribute(a.array.slice(f * 6 * a.itemSize, (f + 1) * 6 * a.itemSize), a.itemSize));
      }
      (f === 2 || f === 3 ? tops : walls).push(sub);
    }
    this.add(mergeGeometries(walls), mat, o);
    this.add(mergeGeometries(tops), roofMat, o);
    return this;
  }
  cyl(rt, rb, h, mat, o = {}, seg = 12) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0);
    const uv = g.attributes.uv, around = (Math.PI * (rt + rb)) / 4;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, around), uv.getY(i) * Math.max(0.25, h / 4));
    return this.add(g, mat, o);
  }
  column(x, z, h, r, mat, y = 0) {
    this.box(r * 2.6, 0.45, r * 2.6, mat, { x, y, z });
    // shafts are smooth dressed stone: the block-textured stone read as stacked bricks on a cylinder
    this.cyl(r * 0.85, r, h - 1.0, mat === M.portland ? M.portlandSmooth : mat, { x, y: y + 0.45, z }, 10);
    this.box(r * 2.5, 0.55, r * 2.5, mat, { x, y: y + h - 0.55, z });
    return this;
  }
  // triangular prism; ExtrudeGeometry UVs are in metres, so scale them to ~4 m per texture tile
  prism(w, h, depth, mat, o = {}) {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    return this.add(g, mat, o);
  }
  pediment(w, h, depth, mat, o = {}) { return this.prism(w, h, depth, mat, o); }
  gable(w, h, len, mat, o = {}) { return this.prism(w, h, len, mat, o); } // ridge along z
  // rooftop balustrade running along local x from x0 to x1
  balustrade(x0, x1, y, z, mat) {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    this.box(len, 0.18, 0.5, mat, { x: cx, y: y + 0.85, z });
    this.box(len, 0.18, 0.5, mat, { x: cx, y, z });
    for (let t = x0 + 0.3; t < x1; t += 0.45) this.cyl(0.08, 0.12, 0.7, mat, { x: t, y: y + 0.16, z }, 6);
    return this;
  }
  statue(x, y, z, s, mat) {
    this.box(0.9 * s, 0.5 * s, 0.9 * s, mat, { x, y, z });
    this.cyl(0.28 * s, 0.4 * s, 1.5 * s, mat, { x, y: y + 0.5 * s, z }, 8);
    this.add(new THREE.SphereGeometry(0.22 * s, 8, 6), mat, { x, y: y + 2.2 * s, z });
    return this;
  }
  dome(r, mat, o = {}, seg = 20) { return this.add(new THREE.SphereGeometry(r, seg, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat, o); }
  archWall(w, h, t, aw, ah, mat, o = {}) {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, h), new THREE.Vector2(-w / 2, h)]);
    const hole = new THREE.Path();
    hole.moveTo(-aw / 2, 0.01); hole.lineTo(-aw / 2, ah - aw / 2); hole.absarc(0, ah - aw / 2, aw / 2, Math.PI, 0, true); hole.lineTo(aw / 2, 0.01); hole.closePath();
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -t / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    return this.add(g, mat, o);
  }
  // collider in local coordinates
  solid(x, z, w, d, ry = 0) {
    const S = this.site, c = Math.cos(S.rot), s = Math.sin(S.rot);
    addBox(S.x + x * c + z * s, S.z - x * s + z * c, w / 2, d / 2, S.rot + ry);
    return this;
  }
  build(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, geos] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
    group.position.set(this.site.x, 0, this.site.z);
    group.rotation.y = this.site.rot;
    return group;
  }
}

// ---------- landmarks ----------
function spire(site) {
  const b = new Builder(site);
  b.cyl(1.4, 1.5, 3, M.bronze, {}, 16);
  b.cyl(0.06, 1.4, 118, M.steel, { y: 3 }, 16);
  b.cyl(0.04, 0.12, 12, M.lampGlow, { y: 106 }, 8);
  b.solid(0, 0, 3.2, 3.2);
  return b.build('The Spire');
}

function oconnellBridge(site) {
  // lamp standards on both parapets, and a central island with triple-headed lamps
  const b = new Builder(site);
  const W = site.w, L = site.d;
  for (const sx of [-1, 1]) for (const t of [-0.35, 0, 0.35]) lampStandard(b, sx * (W / 2 + 0.35), t * L, 7, 1);
  b.box(2.2, 0.2, L * 0.7, M.granite);
  for (const t of [-0.25, 0.25]) lampStandard(b, 0, t * L, 8, 3);
  b.solid(0, 0, 2.2, L * 0.7);
  return b.build("O'Connell Bridge");
}

function lampStandard(b, x, z, h, heads = 1) {
  b.cyl(0.14, 0.24, h, M.bronze, { x, z }, 8);
  b.box(0.55, 0.9, 0.55, M.bronze, { x, z });
  if (heads === 1) b.add(new THREE.SphereGeometry(0.35, 10, 8), M.lampGlow, { x, y: h + 0.3, z });
  else for (let k = 0; k < heads; k++) {
    const a = (k / heads) * Math.PI * 2;
    b.box(1.4, 0.1, 0.1, M.bronze, { x: x + Math.cos(a) * 0.6, y: h - 0.2, z: z + Math.sin(a) * 0.6, ry: -a });
    b.add(new THREE.SphereGeometry(0.32, 10, 8), M.lampGlow, { x: x + Math.cos(a) * 1.2, y: h + 0.2, z: z + Math.sin(a) * 1.2 });
  }
}

function hapenny(site) {
  const b = new Builder(site);
  const L = site.d, W = site.w, rise = 2.6, endY = 1.2;
  const N = 24;
  const arcY = (t) => endY + rise * Math.sin(Math.PI * t);
  // curved deck + lace railings + three cast-iron ribs below
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const z0 = -L / 2 + t0 * L, z1 = -L / 2 + t1 * L, y0 = arcY(t0), y1 = arcY(t1);
    const len = Math.hypot(z1 - z0, y1 - y0), ang = Math.atan2(y1 - y0, z1 - z0);
    const zc = (z0 + z1) / 2, yc = (y0 + y1) / 2;
    b.box(W, 0.18, len + 0.05, M.iron, { y: yc - 0.09, z: zc, rx: -ang });
    for (const sx of [-1, 1]) b.add(new THREE.PlaneGeometry(len + 0.02, 1.15), M.ironLace, { x: sx * W / 2, y: yc + 0.55, z: zc, ry: Math.PI / 2, rz: 0, rx: 0, sx: 1 });
  }
  // ribs: elliptical arch from the quay walls
  for (const sx of [-1, 0, 1]) {
    const pts = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector3(sx * (W / 2 - 0.2), WATER_Y + 0.4 + (arcY(t) - 0.4 - WATER_Y) * Math.pow(Math.sin(Math.PI * t), 0.35), -L / 2 - 1 + t * (L + 2))); }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.16, 6), M.iron);
  }
  // lamp arches
  for (const t of [0.22, 0.5, 0.78]) {
    const z = -L / 2 + t * L, y = arcY(t);
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); pts.push(new THREE.Vector3(Math.cos(a) * (W / 2), y + 1.1 + Math.sin(a) * 1.6, z)); }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.07, 5), M.iron);
    b.add(new THREE.SphereGeometry(0.3, 10, 8), M.lampGlow, { y: y + 2.4, z });
  }
  // the lace railing texture should tile per metre
  return b.build("Ha'penny Bridge");
}

function trinity(site) {
  const b = new Builder(site);
  const W = site.w, D = site.d;
  // wings
  b.facade(W, 15, D, M.trinityFacade, M.slate, { y: 0 }, 4, 15);
  b.box(W + 0.5, 0.8, D + 0.5, M.portland, { y: 15 });
  b.balustrade(-W / 2, W / 2, 15.8, D / 2, M.portland);
  // end pavilions
  for (const sx of [-1, 1]) {
    b.facade(8, 17, D + 1.6, M.trinityFacade, M.slate, { x: sx * (W / 2 - 4) }, 4, 15);
    for (let k = 0; k < 2; k++) b.column(sx * (W / 2 - 5.5 + k * 3), D / 2 + 1.1, 10, 0.45, M.portlandSmooth, 5);
  }
  // central pedimented frontispiece with the arched front gate
  const cz = D / 2 + 1.2;
  b.box(16, 5, 2.4, M.granite, { z: cz - 0.2 }); // rusticated base
  b.facade(16, 17, 2.4, M.trinityFacade, M.portland, { z: cz - 0.2 }, 4, 15);
  b.box(4.4, 5, 0.3, M.timber, { z: D / 2 + 2.45 }); // the oak Front Gate
  b.cyl(2.2, 2.2, 0.3, M.timber, { y: 5, z: D / 2 + 2.45, rx: Math.PI / 2 }, 16);
  b.add(new THREE.CircleGeometry(1.1, 24), M.clock, { y: 19.3, z: cz + 2.05 }); // clock in the pediment
  for (const x of [-W / 2 + 10, -W / 2 + 20, W / 2 - 20, W / 2 - 10]) b.box(1.4, 3, 2.6, M.trinityFacade, { x, y: 15.8, z: -2 }); // chimney stacks
  for (const x of [-6, -2.2, 2.2, 6]) b.column(x, cz + 1.5, 11, 0.5, M.portlandSmooth, 5.2);
  // cobbled forecourt behind railings, open at the gate
  const fz = D / 2 + site.gap - 0.6;
  b.box(6, 0.05, site.gap, M.cobble, { y: KERB_H, z: D / 2 + site.gap / 2 });
  for (const sx of [-1, 1]) {
    b.box(W / 2 - 3, 0.08, site.gap - 1, M.planting, { x: sx * (W / 4 + 1.5), y: KERB_H, z: D / 2 + site.gap / 2 - 0.3 });
    // Burke and Goldsmith on their plinths
    b.box(1.6, 2.2, 1.6, M.graniteSmooth, { x: sx * 7, y: KERB_H, z: D / 2 + site.gap / 2 });
    b.statue(sx * 7, KERB_H + 2.2, D / 2 + site.gap / 2, 1.1, M.bronze);
  }
  railings(b, -W / 2, -3, fz); railings(b, 3, W / 2, fz);
  for (const x of [-3, 3]) b.box(1, 2.8, 1, M.granite, { x, z: fz });
  b.solid(-W / 4 - 1.5, fz, W / 2 - 3, 0.4); b.solid(W / 4 + 1.5, fz, W / 2 - 3, 0.4);
  b.box(16.6, 1.6, 3.4, M.portland, { y: 16.2, z: cz + 0.4 });
  b.pediment(16.8, 3.6, 3.2, M.portland, { y: 17.8, z: cz + 0.4 });
  b.solid(0, 0, W, D + 2);

  // campanile in Front Square
  const c = new Builder(site.campanile);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    c.archWall(9, 9, 1.2, 4.4, 7, M.portland, { x: Math.sin(a) * 3.9, z: Math.cos(a) * 3.9, ry: a });
  }
  c.box(10, 1.2, 10, M.portland, { y: 9 });
  for (const [x, z] of [[-3.3, -3.3], [3.3, -3.3], [3.3, 3.3], [-3.3, 3.3]]) { c.column(x, z, 7, 0.45, M.portland, 10.2); c.column(x * 0.55, z, 7, 0.4, M.portland, 10.2); c.column(x, z * 0.55, 7, 0.4, M.portland, 10.2); }
  c.box(8.4, 1.3, 8.4, M.portland, { y: 17.2 });
  c.cyl(3.3, 3.6, 2.2, M.portland, { y: 18.5 }, 20);
  c.dome(3.4, M.lead, { y: 20.7 });
  c.cyl(0.6, 0.8, 2.8, M.portland, { y: 23.8 }, 10);
  c.add(new THREE.SphereGeometry(0.7, 10, 8), M.lead, { y: 27.1 });
  c.solid(0, 0, 9, 9);

  // Front Square ranges (Chapel & Exam Hall) and the Old Library further in
  const r = new Builder(site);
  for (const sx of [-1, 1]) {
    r.facade(13, 14, 44, M.facade, M.slate, { x: sx * 30, z: -D / 2 - 26 });
    r.gable(13, 4, 44, M.slate, { x: sx * 30, y: 14, z: -D / 2 - 26 });
    r.solid(sx * 30, -D / 2 - 26, 13, 44);
  }
  r.facade(64, 16, 14, M.facade, M.slate, { x: -8, z: -D / 2 - 92, ry: 0 }); // Old Library (much simplified)
  r.box(64.4, 1, 14.4, M.portland, { x: -8, y: 16, z: -D / 2 - 92 });
  r.solid(-8, -D / 2 - 92, 64, 14);
  const grp = new THREE.Group();
  grp.add(b.build('Trinity College'), c.build('Campanile'), r.build('Trinity ranges'));
  return grp;
}

function bankOfIreland(site) {
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 13;
  const court = 11; // depth of the recessed forecourt
  const backZ = D / 2 - court;
  b.facade(W, H, D - court, M.niche, M.lead, { z: -court / 2 }, 4, 11);
  b.box(W + 0.4, 0.9, D - court + 0.4, M.portland, { y: H, z: -court / 2 });
  // U-shaped colonnade: back line + quarter curves + side arms reaching the street
  const path = [];
  const A = 9, R = 7; // back line half-length and corner radius: side arms at x = ±(A + R)
  for (let x = -A; x <= A; x += 3) path.push({ x, z: backZ + 1.8 });
  for (const sx of [1, -1]) {
    for (let k = 1; k <= 4; k++) { const a = (k / 5) * (Math.PI / 2); path.push({ x: sx * (A + Math.sin(a) * R), z: backZ + 1.8 + (1 - Math.cos(a)) * R }); }
    for (let z = backZ + 1.8 + R; z <= D / 2 - 1.5; z += 3) path.push({ x: sx * (A + R), z });
  }
  for (const p of path) { b.column(p.x, p.z, 10, 0.45, M.portland, 0.5); b.solid(p.x, p.z, 1.2, 1.2); }
  b.box(W - 8, 0.5, 5, M.granite, { z: backZ + 1.8 });
  // entablature over the back colonnade and sides
  b.box(2 * A + 2, 1.4, 2.2, M.portland, { y: 10.5, z: backZ + 1.8 });
  for (const sx of [-1, 1]) {
    const z0 = backZ + 1.8 + R, z1 = D / 2 - 1.5;
    b.box(2.2, 1.4, z1 - z0 + 1, M.portland, { x: sx * (A + R), y: 10.5, z: (z0 + z1) / 2 });
    // blind screen wall behind the side colonnade
    b.facade(3, 11, D / 2 - backZ, M.niche, M.portland, { x: sx * (W / 2 - 1.5), z: backZ + (D / 2 - backZ) / 2 }, 4, 11);
    b.solid(sx * (W / 2 - 1.5), backZ + (D / 2 - backZ) / 2, 3, D / 2 - backZ);
  }
  // central portico projecting from the back of the court
  for (let i = 0; i < 4; i++) b.column(-5.4 + i * 3.6, backZ + 5, 10, 0.55, M.portland, 0.5);
  b.box(12.4, 1.6, 4.2, M.portland, { y: 10.5, z: backZ + 4.2 });
  b.pediment(12.6, 3.2, 4.0, M.portland, { y: 12.1, z: backZ + 4.2 });
  b.statue(0, 15.3, backZ + 4.2, 1.1, M.portland);
  b.statue(-6, 12.1, backZ + 5.5, 1.0, M.portland);
  b.statue(6, 12.1, backZ + 5.5, 1.0, M.portland);
  b.solid(0, -court / 2, W, D - court);
  return b.build('Bank of Ireland');
}

function christChurch(site) {
  const b = new Builder(site);
  const G = M.gothic, S = M.gothicStone;
  // nave (west), crossing tower, transepts, choir (east); local +x is east
  b.facade(26, 15, 12, G, M.lead, { x: -10 }, 5, 9);
  b.gable(12, 6, 26, M.lead, { x: -10, y: 15, ry: Math.PI / 2 });
  for (let k = 0; k < 6; k++) for (const sz of [-1, 1]) b.box(1.2, 11, 1.4, S, { x: -21 + k * 4.4, z: sz * 6.4 });
  // transepts
  b.facade(10, 14, 24, G, M.lead, { x: 7 }, 5, 9);
  b.gable(10, 5, 24, M.lead, { x: 7, y: 14 });
  // choir with a polygonal east end
  b.facade(12, 13, 11, G, M.lead, { x: 17 }, 5, 9);
  b.gable(11, 5, 12, M.lead, { x: 17, y: 13, ry: Math.PI / 2 });
  b.cyl(5.5, 5.5, 13, S, { x: 23 }, 7);
  b.add(new THREE.ConeGeometry(5.6, 4.5, 7), M.lead, { x: 23, y: 15.2 });
  // crossing tower with crenellations and corner pinnacles
  b.facade(10, 31, 10, G, M.lead, { x: 7 }, 5, 9);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    b.box(1, 1.3, 0.6, S, { x: 7 - 4 + i * 2, y: 31, z: s * 4.8 });
    b.box(0.6, 1.3, 1, S, { x: 7 + s * 4.8, y: 31, z: -4 + i * 2 });
  }
  for (const [x, z] of [[-4.6, -4.6], [4.6, -4.6], [4.6, 4.6], [-4.6, 4.6]]) b.box(1.2, 4, 1.2, S, { x: 7 + x, y: 30, z });
  // west door
  b.box(0.4, 5, 3, M.dark, { x: -23.1, y: 0 });
  b.solid(-10, 0, 26, 12); b.solid(7, 0, 10, 24); b.solid(19, 0, 16, 11);

  // Synod Hall across Winetavern Street, joined to the cathedral by the covered bridge
  const synod = site.synod;
  const s = new Builder(synod);
  s.facade(16, 13, 18, G, M.lead, {}, 5, 9);
  s.gable(16, 5, 18, M.lead, { y: 13 });
  s.facade(7, 34, 7, G, M.lead, { x: -3, z: 5 }, 5, 9);
  s.add(new THREE.ConeGeometry(4.6, 6, 4), M.lead, { x: -3, y: 34, z: 5, ry: Math.PI / 4 });
  s.solid(0, 0, 16, 18);
  // corridor at first-floor height spanning the street (the road passes underneath)
  const west = toWorld(site, -23, 0), east = toWorld(synod, 8, 0);
  const mid = v2.lerp(west, east, 0.5), len = v2.len(v2.sub(west, east));
  const dir = v2.norm(v2.sub(west, east));
  const br = new Builder({ x: mid.x, z: mid.z, rot: Math.atan2(dir.x, dir.z) });
  br.facade(3.6, 4.5, len + 1, G, M.lead, { y: 7.5 }, 5, 9);
  br.gable(3.6, 1.8, len + 1, M.lead, { y: 12 });
  br.box(3.8, 0.5, len + 1, S, { y: 7.1 });
  const grp = new THREE.Group();
  grp.add(b.build('Christ Church Cathedral'), s.build('Synod Hall'), br.build('Synod Hall bridge'));
  return grp;
}

function toWorld(site, lx, lz) {
  const c = Math.cos(site.rot), s = Math.sin(site.rot);
  return { x: site.x + lx * c + lz * s, z: site.z - lx * s + lz * c };
}

function customHouse(site) {
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 14;
  b.facade(W, H, D, M.facade, M.lead);
  b.box(W + 0.6, 0.9, D + 0.6, M.portland, { y: H });
  b.balustrade(-W / 2, W / 2, H + 0.9, D / 2, M.portland);
  // arcaded ground floor along the river front
  b.box(W, 4.2, 0.6, M.granite, { z: D / 2 + 0.3 });
  // end pavilions with four columns each
  for (const sx of [-1, 1]) {
    b.facade(14, 15.5, D + 2, M.facade, M.lead, { x: sx * (W / 2 - 7) });
    for (let k = 0; k < 4; k++) b.column(sx * (W / 2 - 12.5 + k * 3.6), D / 2 + 1.8, 10, 0.48, M.portland, 4.6);
    b.box(13, 1.2, 1.6, M.portland, { x: sx * (W / 2 - 7), y: 14.6, z: D / 2 + 1.8 });
  }
  // central portico, pediment and statues
  const pz = D / 2 + 2.2;
  b.box(22, 4.3, 3.6, M.granite, { z: D / 2 + 1.6 });
  for (let i = 0; i < 4; i++) b.column(-7.5 + i * 5, pz, 10, 0.62, M.portland, 4.3);
  b.box(22, 1.6, 3.8, M.portland, { y: 14.3, z: D / 2 + 1.6 });
  b.pediment(22.4, 4.4, 3.6, M.portland, { y: 15.9, z: D / 2 + 1.6 });
  for (const x of [-9, -3, 3, 9]) b.statue(x, 15.9, D / 2 + 1, 1.2, M.portland);
  // drum and copper dome over the centre
  b.box(14, 5, 14, M.portland, { y: H + 0.9 });
  b.cyl(5.6, 5.6, 7, M.portland, { y: H + 5.9 }, 24);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; b.cyl(0.35, 0.4, 6.4, M.portland, { x: Math.cos(a) * 6.2, y: H + 5.9, z: Math.sin(a) * 6.2 }, 8); }
  b.cyl(6.8, 6.8, 0.8, M.portland, { y: H + 12.3 }, 24);
  b.dome(6.1, M.copper, { y: H + 13.1 });
  b.cyl(1.2, 1.4, 3, M.portland, { y: H + 18.9 }, 10);
  b.statue(0, H + 21.9, 0, 1.4, M.bronze);
  b.solid(0, 0, W, D + 4);
  return b.build('Custom House');
}

function oconnellMonument() {
  const n0 = world.nodes.get('NQ8'), n1 = world.nodes.get('OC1');
  const d = v2.norm(v2.sub(n1, n0));
  const site = { x: n0.x + d.x * 16, z: n0.z + d.z * 16, rot: Math.atan2(d.x, d.z) + Math.PI };
  const b = new Builder(site);
  b.box(5, 1.2, 5, M.granite);
  b.cyl(2.3, 2.5, 3.2, M.granite, { y: 1.2 }, 16);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; b.statue(Math.cos(a) * 2.9, 1.2, Math.sin(a) * 2.9, 0.9, M.bronze); }
  b.cyl(1.6, 1.9, 4.5, M.bronze, { y: 4.4 }, 14);
  b.cyl(1.1, 1.1, 2.5, M.granite, { y: 8.9 }, 12);
  b.statue(0, 11.4, 0, 1.5, M.bronze);
  b.solid(0, 0, 5.4, 5.4);
  return b.build("O'Connell Monument");
}

// the Fusiliers' Arch stands in the Green's railings at the Grafton Street corner; local +z faces Grafton Street
function fusiliersSite(park) {
  const corner = world.nodes.get('SGNW');
  let best = park.poly[0], bd = Infinity;
  for (const p of park.poly) { const d = (p.x - corner.x) ** 2 + (p.z - corner.z) ** 2; if (d < bd) { bd = d; best = p; } }
  const dir = v2.norm(v2.sub(corner, world.nodes.get('GR2')));
  return { x: best.x + dir.x * 5, z: best.z + dir.z * 5, rot: Math.atan2(-dir.x, -dir.z) };
}

function fusiliersArch(park) {
  // pale granite triumphal arch (1907): rusticated piers with paired pilasters, a moulded archivolt and keystone
  // cartouche, cornice and a tall attic carrying the inscription; iron gates, gate piers with ball finials and
  // ornate lamp standards either side, on a cobbled forecourt behind a row of bollards
  const site = fusiliersSite(park);
  const b = new Builder(site);
  const W = 12, T = 3.4, H = 10.5;
  b.archWall(W, 8.6, T, 5.2, 7.2, M.archStone);
  for (const sx of [-1, 1]) {
    for (const px of [W / 2 - 0.6, W / 2 - 2.4]) b.box(0.8, 7.4, 0.35, M.archSmooth, { x: sx * px, y: 0.6, z: T / 2 + 0.1 }); // pilasters
    b.box(W / 2 - 2.6, 0.6, T + 0.4, M.archSmooth, { x: sx * (W / 4 + 1.3) }); // plinth
  }
  b.add(new THREE.TorusGeometry(2.75, 0.25, 6, 20, Math.PI), M.archSmooth, { y: 4.6, z: T / 2 + 0.1 }); // archivolt
  b.box(1.2, 1.4, 0.6, M.bronze, { y: 7.3, z: T / 2 + 0.2 }); // cartouche on the keystone
  b.box(W + 0.8, 0.9, T + 0.8, M.archSmooth, { y: 8.6 }); // cornice
  b.box(W - 1, 2.6, T - 0.2, M.archStone, { y: 9.5 }); // attic
  b.add(new THREE.PlaneGeometry(W - 3, 1.2), M.inscription, { y: 10.8, z: T / 2 - 0.08 });
  b.box(W - 0.6, 0.5, T + 0.2, M.archSmooth, { y: H + 1.5 });
  // gates in the opening, then gate piers and railings running off along the park edge
  for (const sx of [-1, 1]) {
    railings(b, sx > 0 ? 0.1 : -2.6, sx > 0 ? 2.6 : -0.1, -T / 2 + 0.3, 4.2); // the open iron gates
    b.box(1.3, 3.6, 1.3, M.archStone, { x: sx * (W / 2 + 3.2) });
    b.add(new THREE.SphereGeometry(0.55, 10, 8), M.archSmooth, { x: sx * (W / 2 + 3.2), y: 4.1 });
    railings(b, sx > 0 ? W / 2 : -W / 2 - 2.6, sx > 0 ? W / 2 + 2.6 : -W / 2, 0, 2.2);
    lampStandard(b, sx * (W / 2 + 5.2), 3.5, 5.5, 3);
  }
  b.box(W + 14, 0.05, 9, M.cobble, { y: KERB_H, z: 5.5 });
  for (let x = -W / 2 - 4; x <= W / 2 + 4; x += 2.4) { b.cyl(0.12, 0.14, 1, M.dark, { x, y: KERB_H, z: 9.4 }, 6); b.solid(x, 9.4, 0.3, 0.3); }
  b.solid(-W / 2 + 1.8, 0, 3.6, T + 0.6); b.solid(W / 2 - 1.8, 0, 3.6, T + 0.6);
  return b.build("Fusiliers' Arch");
}

// dense shrubbery behind the Green's railings: lumpy leaf masses in several greens
function plantShrubs(scene, items) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 0.82 + 0.18 * Math.sin(v.x * 5.1 + v.z * 3.7) * Math.cos(v.y * 4.3 - v.x * 2.1) + 0.08 * Math.sin(v.z * 11 + v.y * 9);
    v.multiplyScalar(n); if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.3; // flattened underside
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.translate(0, 0.2, 0);
  const greens = [0x35522a, 0x3f5f2c, 0x4a6b31, 0x2f4a26, 0x55743a].map((c) => new THREE.Color(c));
  const mesh = chunkedInstances(geo, new THREE.MeshStandardMaterial({ roughness: 0.92 }), items, { shadow: true, y: KERB_H, colors: (it) => greens[it.c] });
  scene.add(mesh);
}

// ---------- extended map: Heuston, the Liberties, Docklands ----------
function signTex(text, { bg = '#15181b', fg = '#f1ede2', w = 512, h = 64, font = 'bold 38px Georgia' } = {}) {
  return canvasTex(w, h, (ctx) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}
const signMat = (text, o = {}, emissive = false) => {
  const map = signTex(text, o);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.6, ...(emissive ? { emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.25 } : {}) });
};
// red-brown warehouse brick with a regular window grid (Guinness Storehouse): one bay 4 m x 4.3 m
const warehouseTex = canvasTex(128, 138, (ctx, w, h) => {
  ctx.fillStyle = '#7a4331'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 4) { ctx.fillStyle = 'rgba(40,20,14,0.25)'; ctx.fillRect(0, y, w, 1); }
  for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(${120 + Math.random() * 60},${60 + Math.random() * 30},40,0.12)`; ctx.fillRect(Math.random() * w, Math.random() * h, 8, 3); }
  ctx.fillStyle = '#d9d2c2'; ctx.fillRect(28, 26, 72, 82);
  ctx.fillStyle = '#1b2024';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillRect(32 + c * 22.7, 30 + r * 25.3, 20, 23);
});
// glass curtain wall: 3 m bay x 3.6 m floor
const curtainTex = canvasTex(64, 76, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#39505a'); g.addColorStop(1, '#22343d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#b8c2c6'; ctx.fillRect(0, 0, w, 3); ctx.fillRect(0, 0, 2, h); ctx.fillRect(w / 2, 0, 1, h);
});
// the Marker Hotel's checkerboard: 16 m x 18 m tile of white panels and dark glass
const checkerTex = canvasTex(256, 288, (ctx, w, h) => {
  const r = rng(77);
  const cw = w / 8, ch = h / 8;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const glass = (x + y) % 2 === 0 ? r() < 0.8 : r() < 0.2;
    ctx.fillStyle = glass ? '#1f2a30' : '#eef0ee';
    ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);
  }
  ctx.fillStyle = 'rgba(160,170,172,0.6)';
  for (let x = 0; x <= 8; x++) ctx.fillRect(x * cw - 1, 0, 2, h);
});
const clockTex = canvasTex(128, 128, (ctx, w) => {
  ctx.fillStyle = '#f3efe4'; ctx.beginPath(); ctx.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 5;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a) * 50, w / 2 + Math.sin(a) * 50); ctx.lineTo(w / 2 + Math.cos(a) * 58, w / 2 + Math.sin(a) * 58); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(w / 2, w / 2); ctx.lineTo(w / 2, 22); ctx.moveTo(w / 2, w / 2); ctx.lineTo(w / 2 + 30, w / 2 + 12); ctx.stroke();
}, true);

// bright lights that reflect in the water at night (see render/waterglow.js)
export const waterGlowSources = [];

// Night lighting: materials that glow after dark, scaled by setNight(level)
const neon = [];
const glow = (color, day = 0, night = 2.5) => {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.4 });
  neon.push({ m, day, night });
  return m;
};
Object.assign(M, {
  glass: addReflections(new THREE.MeshStandardMaterial({ color: 0x86a3aa, roughness: 0.06, metalness: 0.7 }), 1.0),
  curtain: addReflections(new THREE.MeshStandardMaterial({ map: curtainTex, roughness: 0.15, metalness: 0.5 }), 0.8),
  warehouse: new THREE.MeshStandardMaterial({ map: warehouseTex, roughness: 0.9 }),
  checker: new THREE.MeshStandardMaterial({ map: checkerTex, roughness: 0.35 }),
  clock: new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.6 }),
  heustonStone: new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.85, color: 0xcfc6b4 }),
  sandstone: new THREE.MeshStandardMaterial({ color: 0xbfa98a, map: stoneT, roughness: 0.85 }),
  cladGrey: new THREE.MeshStandardMaterial({ color: 0x8b9196, roughness: 0.45, metalness: 0.3 }),
  cladDark: new THREE.MeshStandardMaterial({ color: 0x3a3e45, roughness: 0.6, metalness: 0.2 }),
  whiteSteel: addReflections(new THREE.MeshStandardMaterial({ color: 0xf2f3f2, roughness: 0.3, metalness: 0.1 }), 0.6),
  brickChimney: new THREE.MeshStandardMaterial({ color: 0x8a4a34, map: stoneT, roughness: 0.9 }),
  paving: new THREE.MeshStandardMaterial({ color: 0xb8b6ae, map: stoneT, roughness: 0.8 }),
  redResin: new THREE.MeshStandardMaterial({ color: 0x9e2a22, roughness: 0.7 }),
  planter: new THREE.MeshStandardMaterial({ color: 0x55595a, roughness: 0.8 }),
  planting: new THREE.MeshStandardMaterial({ color: 0x5f8a3a, roughness: 0.95 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x6d4f3a, roughness: 0.85 }),
  corten: new THREE.MeshStandardMaterial({ color: 0x7a3f22, roughness: 0.85 }),
  autumn: new THREE.MeshStandardMaterial({ color: 0x9a4a2a, roughness: 0.95 }),
  // after dark: the Convention Centre's drum rings and roof edge, the Beckett harp, the red light-sticks, the 3Arena front
  ccdRing: glow(0xb04cff, 0, 3.2),
  ccdEdge: glow(0x8a5cff, 0, 2.2),
  harpLight: glow(0xdfe8ff, 0, 1.6),
  harpBody: glow(0xf2f3f2, 0, 0.5),
  harpStay: glow(0xe6ecff, 0, 0.7),
  redStick: glow(0xe8321e, 0.15, 2.4),
  arenaGlow: glow(0x4f7dff, 0, 1.6),
});

function heuston(site) {
  // local +z faces east over the forecourt; local x runs north-south
  const b = new Builder(site);
  const W = site.w, D = site.d, hz = D / 2 - 8;
  // Italianate head building with a projecting centre and domed corner towers
  b.facade(W, 13, 16, M.heustonStone, M.lead, { z: hz });
  b.box(W + 0.6, 0.8, 16.6, M.portland, { y: 13, z: hz });
  b.balustrade(-W / 2, W / 2, 13.8, hz + 8, M.portland);
  b.facade(12, 15.5, 2.2, M.heustonStone, M.lead, { z: hz + 9 });
  b.box(12.6, 0.9, 2.8, M.portland, { y: 15.5, z: hz + 9 });
  b.add(new THREE.CircleGeometry(1.3, 24), M.clock, { y: 13.2, z: hz + 10.15 });
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 3);
    b.facade(6.4, 17.5, 6.4, M.heustonStone, M.lead, { x, z: hz + 5 });
    b.box(7, 0.7, 7, M.portland, { x, y: 17.5, z: hz + 5 });
    b.cyl(2.1, 2.4, 3, M.portland, { x, y: 18.2, z: hz + 5 }, 12);
    b.dome(2.2, M.copper, { x, y: 21.2, z: hz + 5 });
  }
  // the train shed behind: three long pitched roofs over granite walls
  const shedL = D - 16, sz = -D / 2 + shedL / 2;
  b.box(W, 8, shedL, M.granite, { z: sz });
  for (let k = 0; k < 3; k++) b.gable(W / 3, 4.5, shedL, M.lead, { x: -W / 3 + k * (W / 3), y: 8, z: sz });
  b.solid(0, 0, W, D);
  return b.build('Heuston Station');
}

function guinness(site) {
  // local +z faces Market Street
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 30;
  b.facade(W, H, D, M.warehouse, M.lead, {}, 4, 4.3);
  b.box(W + 0.5, 1, D + 0.5, M.brickChimney, { y: H });
  // the Gravity Bar: a glass drum on the roof
  b.cyl(9, 9, 5.5, M.glass, { y: H + 1 }, 28);
  b.cyl(9.5, 9.5, 0.6, M.dark, { y: H + 6.5 }, 28);
  b.add(new THREE.PlaneGeometry(24, 2.4), signMat('GUINNESS STOREHOUSE', { font: 'bold 34px Georgia' }, true), { y: 6.5, z: D / 2 + 0.06 });
  // brewery chimney with the name down it
  const cx = W / 2 + 7, cz = -D / 2 - 5;
  b.cyl(1.5, 2.3, 44, M.brickChimney, { x: cx, z: cz }, 14);
  b.add(new THREE.PlaneGeometry(1.4, 14), signMat('GUINNESS', { bg: '#141414', fg: '#e9dfc6', w: 64, h: 512, font: 'bold 40px Georgia' }), { x: cx, y: 30, z: cz + 2.05 });
  b.solid(0, 0, W, D); b.solid(cx, cz, 4.6, 4.6);
  return b.build('Guinness Storehouse');
}

function jamesGate(site) {
  const b = new Builder(site);
  b.archWall(14, 8.5, 1.4, 6, 6.8, M.granite);
  b.box(6, 5.4, 0.25, M.dark, { z: -0.2 });
  b.add(new THREE.PlaneGeometry(9, 1.1), signMat("ST. JAMES'S GATE", { bg: '#1c2a22', fg: '#e8d9a8' }), { y: 7.4, z: 0.72 });
  b.solid(0, 0, 14, 1.6);
  return b.build("St James's Gate");
}

function beckettHarp(site) {
  // local +z runs along the deck from the north bank to the south bank. The white pylon rises from the deck
  // over the round pivot pier near the south end and sweeps up and forward over the main span like a harp;
  // a fan of stays runs from it down to both deck edges, and two backstays tie its tip to the short back span.
  const b = new Builder(site);
  const L = site.d, W = site.w, z0 = L * 0.3, H = 46, reach = 26;
  const pylon = (t) => new THREE.Vector3(0, 0.6 + H * t, z0 - reach * Math.pow(t, 1.55));
  const pts = []; for (let i = 0; i <= 24; i++) pts.push(pylon(i / 24));
  const curve = new THREE.CatmullRomCurve3(pts);
  b.add(new THREE.TubeGeometry(curve, 48, 1.05, 12), M.harpBody);
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0, 7)), 12, 1.7, 12), M.harpBody); // thicker root
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(new THREE.Vector3(0, 0.9, 0.3)))), 48, 0.16, 6), M.harpLight);
  const stay = (a, c, mat, r = 0.06) => b.add(new THREE.TubeGeometry(new THREE.LineCurve3(a, c), 1, r, 4), mat);
  const n = 14;
  for (let i = 0; i < n; i++) {
    const t = 0.28 + (i / (n - 1)) * 0.7, zEnd = z0 - 7 - (i / (n - 1)) * (z0 + L / 2 - 10);
    for (const sx of [-1, 1]) stay(pylon(t), new THREE.Vector3(sx * (W / 2 - 0.8), 1.1, zEnd), M.harpStay);
  }
  for (const sx of [-1, 1]) stay(pylon(1), new THREE.Vector3(sx * 1.5, 0.8, L / 2 + 1), M.harpStay, 0.14);
  for (const t of [-0.3, 0, z0 / L]) waterGlowSources.push({ ...toWorld(site, 0, t * L), y: WATER_Y + 0.05, color: 0xcfdcff, width: 3, length: 60 });
  // the round pivot pier sits under the deck
  b.cyl(6.5, 5.5, -0.9 - WATER_Y + 0.5, M.whiteSteel, { y: WATER_Y - 0.5, z: z0 }, 24);
  b.solid(0, z0, 3.4, 3.4); // only the pylon's root stands on the deck; traffic passes either side
  return b.build('Samuel Beckett Bridge');
}

function convention(site) {
  // local +z faces the river. Stone-clad box with the tilted glass drum (the atrium) at the front
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 26;
  b.facade(W, H, D, M.sandstone, M.cladGrey, {}, 6, 6);
  for (let k = 0; k < 3; k++) b.box(W * 0.35, 1.2, 0.3, M.dark, { x: -W * 0.25, y: 6 + k * 6, z: D / 2 + 0.1 }); // slit windows
  // roofline strips that glow at night
  for (const sz of [-1, 1]) b.box(W + 0.4, 0.5, 0.4, M.ccdEdge, { y: H, z: sz * (D / 2 + 0.1) });
  for (const sx of [-1, 1]) b.box(0.4, 0.5, D + 0.4, M.ccdEdge, { x: sx * (W / 2 + 0.1), y: H });
  // the drum stands proud of the river front and leans back into the building
  const dx = W * 0.18, dz = D / 2 + 1, tilt = -0.3;
  b.cyl(10, 10.5, H + 4, M.glass, { x: dx, y: -1, z: dz, rx: tilt }, 32);
  for (let k = 0; k < 8; k++) {
    const y = 3 + k * 3.4;
    // horizontal light rings, following the drum's lean
    b.add(new THREE.TorusGeometry(10.35 - k * 0.02, 0.16, 5, 40), M.ccdRing, { x: dx, y: -1 + y * Math.cos(tilt), z: dz + y * Math.sin(tilt), rx: Math.PI / 2 + tilt });
  }
  for (const ox of [-6, 0, 6]) waterGlowSources.push({ ...toWorld(site, dx + ox, D / 2 + 36), y: WATER_Y + 0.05, color: 0xb04cff, width: 7, length: 70 });
  waterGlowSources.push({ ...toWorld(site, -W * 0.2, D / 2 + 36), y: WATER_Y + 0.05, color: 0x8a5cff, width: 9, length: 60 });
  b.solid(0, 0, W, D); b.solid(dx, dz, 22, 20);
  return b.build('Convention Centre');
}

function threeArena(site) {
  const b = new Builder(site);
  const W = site.w, D = site.d;
  b.box(W, 18, D - 10, M.cladDark, { z: -5 });
  // shallow barrel roof over the hall
  b.add(new THREE.CylinderGeometry(18, 18, W, 24, 1, false, 0, Math.PI), M.cladGrey, { y: 18, z: -5, rz: Math.PI / 2, sx: 0.32, sz: (D - 10) / 36 });
  // glazed front on the quay with the name
  b.box(W, 22, 10, M.curtain, { z: D / 2 - 5 });
  b.box(W + 0.3, 0.6, 10.3, M.arenaGlow, { y: 22, z: D / 2 - 5 });
  b.add(new THREE.PlaneGeometry(20, 4.5), signMat('3ARENA', { bg: '#101216', fg: '#ffffff', font: 'bold 48px Arial' }, true), { y: 17, z: D / 2 + 0.06 });
  for (const ox of [-20, 0, 20]) waterGlowSources.push({ ...toWorld(site, ox, D / 2 + 26), y: WATER_Y + 0.05, color: 0x4f7dff, width: 8, length: 60 });
  b.solid(0, 0, W, D);
  return b.build('3Arena');
}

function grandCanalTheatre(site) {
  // local +z faces Macken Street (west); the glass front faces the square and the dock (local -z)
  const b = new Builder(site);
  const W = site.w, D = site.d;
  b.box(W, 18, D * 0.62, M.cladGrey, { z: D * 0.19 });
  b.box(W * 0.7, 24, D * 0.35, M.cladGrey, { x: W * 0.1, z: D * 0.05 });
  // the foyer: a tall glass wall leaning out over the square, with white diagonal struts
  const fz = -D / 2 + 9, lean = -0.3;
  b.box(W - 2, 27, 0.5, M.glass, { z: fz, rx: lean });
  for (const [x, a] of [[-8, 0.45], [2, -0.35], [9, 0.5]]) b.box(0.5, 30, 0.6, M.whiteSteel, { x, z: fz - 0.6, rx: lean, rz: a });
  for (const sx of [-1, 1]) b.box(0.5, 24, 9, M.glass, { x: sx * (W / 2 - 1), z: fz - 3 });
  // the sloping roof plane, highest over the glass front
  b.box(W + 4, 1, D + 6, M.cladGrey, { y: 21, z: -3, rx: 0.2 });
  b.add(new THREE.PlaneGeometry(18, 1.8), signMat('BORD GÁIS ENERGY THEATRE', { bg: '#8b9196', fg: '#ffffff', font: 'bold 30px Arial' }, true), { y: 25.5, z: fz - 8.9, ry: Math.PI, rx: 0.2 });
  b.solid(0, 0, W, D);
  return b.build('Grand Canal Theatre');
}

// pale granite paving crossed by grey diagonal bands (the square's 45-degree grid), one tile 12 m
const squarePaveTex = canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#d6d3cb'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(120,118,110,${Math.random() * 0.08})`; ctx.fillRect(Math.random() * w, Math.random() * h, 6, 3); }
  ctx.strokeStyle = '#8f8d87'; ctx.lineWidth = 7;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath(); ctx.moveTo(k * w, 0); ctx.lineTo(k * w + w, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(k * w + w, 0); ctx.lineTo(k * w, h); ctx.stroke();
  }
});
squarePaveTex.repeat.set(1 / 12, 1 / 12);
M.squarePaving = new THREE.MeshStandardMaterial({ map: squarePaveTex, roughness: 0.75 });
M.yellowPlant = new THREE.MeshStandardMaterial({ color: 0xb9a53a, roughness: 0.95 });

// flat triangle (a planted or resin "carpet" tile) in local x/z, raised h above y
function triangle(b, pts, y, h, mat) {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
  b.add(g, mat, { y });
}

function grandCanalSquare(sq) {
  // local +z faces the theatre (west), local -z runs out to the water (east), local +x is south
  const b = new Builder(sq);
  const W = sq.w, D = sq.d, r = rng(314);
  const pave = new THREE.BoxGeometry(W, 0.06, D);
  { const p = pave.attributes.position, uv = pave.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i)); }
  b.add(pave.translate(0, 0.03, 0), M.squarePaving, { y: KERB_H });
  // the red carpet: from the theatre doors diagonally across the square and out over the water as a pointed jetty
  const a = { x: -W * 0.3, z: D / 2 }, c = { x: W * 0.22, z: -D / 2 - 11 };
  const L = Math.hypot(c.x - a.x, c.z - a.z), ry = Math.atan2(c.x - a.x, c.z - a.z), mx = (a.x + c.x) / 2, mz = (a.z + c.z) / 2;
  b.box(7, 0.1, L, M.redResin, { x: mx, y: KERB_H + 0.02, z: mz, ry });
  // the jetty part is a deck on piles over the water
  const jz = -D / 2 - 5.5, jx = a.x + (c.x - a.x) * ((jz - a.z) / (c.z - a.z));
  b.box(7.4, 0.5, 11, M.redResin, { x: jx, y: KERB_H - 0.45, z: jz, ry });
  for (const s of [-1, 1]) for (const t of [-4, 0, 4]) b.cyl(0.2, 0.2, 3.5, M.dark, { x: jx + s * 3 * Math.cos(ry) + t * Math.sin(ry), y: WATER_Y + 0.4, z: jz - s * 3 * Math.sin(ry) + t * Math.cos(ry) }, 6);
  triangle(b, [[c.x - 3.5 * Math.cos(ry), c.z + 2], [c.x + 3.5 * Math.cos(ry), c.z + 2], [c.x + 1.5, c.z - 5]], KERB_H - 0.45, 0.5, M.redResin);
  // tilted red light-sticks bristling along the carpet
  for (let i = 0; i < 44; i++) {
    const t = r(), off = (r() - 0.5) * 6;
    const x = a.x + (c.x - a.x) * t + off * Math.cos(ry), z = a.z + (c.z - a.z) * t - off * Math.sin(ry);
    const base = z < -D / 2 ? KERB_H - 0.2 : KERB_H;
    b.cyl(0.08, 0.11, 6 + r() * 5, M.redStick, { x, y: base, z, rx: (r() - 0.5) * 0.6, rz: (r() - 0.5) * 0.6 }, 6);
  }
  for (const t of [0.75, 0.95]) waterGlowSources.push({ ...toWorld(sq, a.x + (c.x - a.x) * t, a.z + (c.z - a.z) * t), y: WATER_Y + 0.65, color: 0xe8321e, width: 4, length: 40 });
  // the green carpet: planted triangles (grass and yellow-green sedum) across the other diagonal, with bench edges
  const tris = [
    [[2, 12], [12, 4], [12, 16]], [[4, 2], [14, -8], [14, 4]], [[6, -10], [14, -18], [14, -8]],
    [[-12, -4], [-4, -12], [-12, -14]], [[-2, -14], [6, -18], [-2, -19]], [[10, 12], [14, 18], [6, 18]],
  ];
  tris.forEach((t, i) => triangle(b, t, KERB_H, 0.45, i % 2 ? M.yellowPlant : M.planting));
  b.solid(jx, jz, 7, 11); // keep the car off the jetty
  return b.build('Grand Canal Square');
}

function gcsOffice(site) {
  // 1 Grand Canal Square: glass office with an angular, folded glass roof
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 22;
  b.facade(W, H, D, M.curtain, M.cladGrey, {}, 3, 3.6);
  b.box(W + 0.4, 0.6, D + 0.4, M.whiteSteel, { y: H });
  b.prism(W, 5, D * 0.8, M.glass, { y: H + 0.6, ry: Math.PI / 2 });
  b.solid(0, 0, W, D);
  return b.build('1 Grand Canal Square');
}

// precast concrete frame with deep-set windows: one bay 3 m x 3.6 m
const precastTex = canvasTex(96, 116, (ctx, w, h) => {
  ctx.fillStyle = '#cbc3b1'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 200; i++) { ctx.fillStyle = `rgba(90,85,75,${Math.random() * 0.06})`; ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4); }
  ctx.fillStyle = '#9d9585'; ctx.fillRect(10, 18, w - 20, h - 30);
  ctx.fillStyle = '#263036'; ctx.fillRect(14, 22, w - 28, h - 38);
  ctx.fillStyle = '#5b666c'; ctx.fillRect(w / 2 - 1, 22, 2, h - 38);
});
M.precast = new THREE.MeshStandardMaterial({ map: precastTex, roughness: 0.8 });

function grattanOffice(site) {
  // seven-storey precast office on the Grattan Street corner (local +x): set back from Grand Canal Street behind a
  // raised granite forecourt, steps up along the front and round the corner, a recessed glazed ground floor behind
  // the grid's piers, a glazed set-back top floor under a slatted canopy
  const b = new Builder(site);
  const W = site.w, D = site.d, P = 1.2, F = site.plaza, R = 0.3, T = 0.4, n = Math.round(P / R);
  const front = D / 2 + F;
  // podium: under the building, the forecourt and a strip down the corner side
  b.box(W + 3, P, D + F, M.paving, { z: F / 2 });
  for (let k = 0; k < n; k++) {
    const y = k * R, out = (n - k) * T;
    b.box(W + 3, R, T, M.granite, { y, z: front + out - T / 2 }); // front flight
    b.box(T, R, F + 2, M.granite, { x: W / 2 + 1.5 + out - T / 2, y, z: front - F / 2 - 1 }); // corner flight
  }
  // recessed ground floor: glass behind a row of piers
  const G = 4.2;
  b.box(W - 2.4, G, D - 2.4, M.curtain, { y: P });
  for (let x = -W / 2 + 0.4; x <= W / 2 - 0.3; x += W / 5) for (const z of [-D / 2 + 0.4, D / 2 - 0.4]) b.box(0.8, G, 0.8, M.portlandSmooth, { x, y: P, z });
  for (const z of [-D / 4, 0, D / 4]) for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) b.box(0.8, G, 0.8, M.portlandSmooth, { x, y: P, z });
  // the six upper floors of deep precast window grid
  const H = 6 * 3.6, y0 = P + G;
  b.facade(W, H, D, M.precast, M.lead, { y: y0 }, 3, 3.6);
  b.box(W - 3, 3.4, D - 3, M.curtain, { y: y0 + H });
  const top = y0 + H + 3.4;
  for (const sx of [-1, 1]) b.box(0.3, 0.3, D + 4, M.dark, { x: sx * (W / 2 + 1.2), y: top + 0.6 });
  for (let x = -W / 2 - 1.2; x <= W / 2 + 1.2; x += 0.9) b.box(0.12, 0.35, D + 4, M.dark, { x, y: top + 0.9 });
  for (const [x, z] of [[-W / 2 + 0.8, -D / 2 + 0.8], [W / 2 - 0.8, -D / 2 + 0.8], [W / 2 - 0.8, D / 2 - 0.8], [-W / 2 + 0.8, D / 2 - 0.8]]) b.box(0.3, 1.2, 0.3, M.dark, { x, y: top, z });
  // glass balustrade along the forecourt edge beside the steps, and a weathering-steel planter with a small tree
  b.box(W * 0.35, 1, 0.08, M.glass, { x: -W / 2 + W * 0.2, y: P, z: front - 0.1 });
  b.box(5, 0.9, 1.6, M.corten, { x: -W / 6, y: P, z: front - 2.4 });
  b.cyl(0.12, 0.15, 2.4, M.timber, { x: -W / 6 - 1.2, y: P + 0.9, z: front - 2.4 }, 6);
  b.add(new THREE.SphereGeometry(1.3, 10, 8), M.autumn, { x: -W / 6 - 1.2, y: P + 3.6, z: front - 2.4 });
  b.solid(0, 0, W, D);
  return b.build('Grand Canal Street office');
}

function markerHotel(site) {
  const b = new Builder(site);
  const W = site.w, D = site.d;
  b.facade(W, 22, D, M.checker, M.lead, {}, 16, 18);
  b.box(W + 0.2, 4, D + 0.2, M.curtain, {});
  b.solid(0, 0, W, D);
  return b.build('The Marker');
}

// ---------- Dame Street and College Green ----------
// Palladian range (Trinity front): one 4 m bay over the full 15 m height — rusticated ground floor,
// pedimented piano nobile windows, square attic windows, cornice band
const trinityTex = canvasTex(128, 480, (ctx, w, h) => {
  const px = h / 15; // pixels per metre
  ctx.fillStyle = '#b7b2a7'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(70,68,62,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * w, Math.random() * h, 5 + Math.random() * 14, 2 + Math.random() * 5); }
  const y = (m) => h - m * px; // metres above ground -> canvas y
  // rusticated ground floor (granite, deep horizontal channels)
  ctx.fillStyle = '#a19c92'; ctx.fillRect(0, y(5), w, 5 * px);
  ctx.fillStyle = 'rgba(60,58,52,0.45)';
  for (let m = 0.55; m < 5; m += 0.55) ctx.fillRect(0, y(m), w, 2);
  const win = (x0, y0, ww, hh) => {
    ctx.fillStyle = '#e6e2d8'; ctx.fillRect(x0 - 4, y0 - 4, ww + 8, hh + 8);
    ctx.fillStyle = '#23292d'; ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = '#d9d4c8';
    for (let r = 1; r < 3; r++) ctx.fillRect(x0, y0 + (hh * r) / 3, ww, 1.5);
    ctx.fillRect(x0 + ww / 2 - 0.75, y0, 1.5, hh);
  };
  const cx = w / 2, ww = 1.3 * px;
  win(cx - ww / 2, y(3.9), ww, 2.6 * px); // ground floor
  win(cx - ww / 2, y(9.3), ww, 2.9 * px); // piano nobile, with a triangular pediment hood and sill
  ctx.fillStyle = '#ece8de';
  ctx.beginPath(); ctx.moveTo(cx - ww / 2 - 8, y(9.5)); ctx.lineTo(cx + ww / 2 + 8, y(9.5)); ctx.lineTo(cx, y(10.2)); ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - ww / 2 - 6, y(6.25), ww + 12, 5);
  win(cx - ww / 2, y(12.6), ww, 1.4 * px); // attic
  // string courses and the cornice
  ctx.fillStyle = '#e4e0d6'; ctx.fillRect(0, y(5.15), w, 5); ctx.fillRect(0, y(10.6), w, 4);
  ctx.fillStyle = '#dcd8ce'; ctx.fillRect(0, y(15), w, 0.9 * px);
  ctx.fillStyle = 'rgba(40,38,34,0.35)'; ctx.fillRect(0, y(14.1), w, 3);
});
// white painted stucco with two sash windows per 4 m bay, 3.6 m floors (the Olympia and its neighbours)
const stuccoTex = canvasTex(128, 115, (ctx, w, h) => {
  ctx.fillStyle = '#eeece6'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(120,115,105,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * w, Math.random() * h, 6, 3); }
  for (const x of [22, 78]) {
    ctx.fillStyle = '#d8d4ca'; ctx.fillRect(x - 3, 20, 34, 72);
    ctx.fillStyle = '#2a3136'; ctx.fillRect(x, 23, 28, 66);
    ctx.fillStyle = '#f4f2ec'; ctx.fillRect(x, 54, 28, 3); ctx.fillRect(x + 13, 23, 2, 66);
  }
});
// the Olympia's stained-glass canopy dome: coloured fish-scale glass
const scaleGlassTex = canvasTex(128, 64, (ctx, w, h) => {
  const cols = ['#e2a33a', '#5aa6c9', '#7fb86a', '#c95a4a', '#e8d27a', '#6f7fc4'];
  for (let y = -8; y < h + 8; y += 8) for (let x = 0; x < w + 8; x += 10) {
    ctx.fillStyle = cols[(x / 10 + y / 8) % cols.length | 0];
    ctx.beginPath(); ctx.arc(x + ((y / 8) % 2 ? 5 : 0), y, 5.5, 0, Math.PI); ctx.fill();
  }
});
const bladeSign = (text) => canvasTex(64, 512, (ctx, w, h) => {
  ctx.fillStyle = '#a3182a'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f7efe0'; ctx.font = 'bold 50px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const n = text.length;
  [...text].forEach((ch, i) => ctx.fillText(ch, w / 2, ((i + 0.5) / n) * h));
});
Object.assign(M, {
  trinityFacade: new THREE.MeshStandardMaterial({ map: trinityTex, roughness: 0.85 }),
  portlandSmooth: new THREE.MeshStandardMaterial({ color: 0xdcd7ca, roughness: 0.78 }),
  graniteSmooth: new THREE.MeshStandardMaterial({ color: 0x9a978f, roughness: 0.7 }),
  stucco: new THREE.MeshStandardMaterial({ map: stuccoTex, roughness: 0.85 }),
  castleBrick: new THREE.MeshStandardMaterial({ map: warehouseTex, color: 0xd88a70, roughness: 0.9 }),
  cobble: new THREE.MeshStandardMaterial({ color: 0x8e877b, map: stoneT, roughness: 0.9 }),
  gold: addReflections(new THREE.MeshStandardMaterial({ color: 0xd4a53c, roughness: 0.3, metalness: 1 }), 0.8),
  olympiaRed: new THREE.MeshStandardMaterial({ color: 0x9b1b26, roughness: 0.5 }),
  scaleGlass: new THREE.MeshStandardMaterial({ map: scaleGlassTex, roughness: 0.25, emissive: 0xffffff, emissiveMap: scaleGlassTex, emissiveIntensity: 0.15 }),
  bladeTheatre: new THREE.MeshStandardMaterial({ map: bladeSign('THEATRE'), roughness: 0.6, side: THREE.DoubleSide }),
  bladeOlympia: new THREE.MeshStandardMaterial({ map: bladeSign('OLYMPIA'), roughness: 0.6, side: THREE.DoubleSide }),
});

// a run of cast-iron railings along local x at depth z (spear-topped bars and two rails)
function railings(b, x0, x1, z, h = 2) {
  for (let x = x0; x <= x1; x += 0.3) b.cyl(0.025, 0.025, h, M.dark, { x, z }, 4);
  for (const y of [0.15, h - 0.25]) b.box(x1 - x0, 0.06, 0.06, M.dark, { x: (x0 + x1) / 2, y, z });
}

function cityHall(site) {
  // Thomas Cooley's Royal Exchange: a Portland-stone cube with a hexastyle Corinthian front facing up
  // Parliament Street, raised on a balustraded podium; a low dome over the rotunda
  const b = new Builder(site);
  const W = site.w, D = site.d, P = 2; // podium height
  b.box(W + 4, P, D + 2, M.granite, { z: 1 });
  b.balustrade(-W / 2 - 2, -3.2, P, D / 2 + 1.8, M.portland);
  b.balustrade(3.2, W / 2 + 2, P, D / 2 + 1.8, M.portland);
  for (let k = 0; k < 5; k++) b.box(6, 0.4, 0.5, M.granite, { y: k * 0.4, z: D / 2 + 2.25 - k * 0.5 }); // entrance steps
  b.facade(W, 14, D, M.trinityFacade, M.lead, { y: P }, 4, 15);
  // the six-column portico on the north front
  const pz = D / 2 + 1.6;
  for (let i = 0; i < 6; i++) b.column(-9 + i * 3.6, pz, 12, 0.62, M.portlandSmooth, P);
  b.box(21, 1.8, 3.6, M.portland, { y: P + 12, z: pz - 0.3 });
  b.pediment(21.4, 3.6, 3.4, M.portland, { y: P + 13.8, z: pz - 0.3 });
  b.box(W + 0.6, 1, D + 0.6, M.portland, { y: P + 14 });
  b.balustrade(-W / 2, -11, P + 15, D / 2, M.portland); b.balustrade(11, W / 2, P + 15, D / 2, M.portland);
  // lamp standards flanking the steps
  for (const sx of [-1, 1]) lampStandard(b, sx * 4.6, D / 2 + 2.4, 5, 3);
  // drum and dome over the rotunda
  b.cyl(6, 6, 3, M.portland, { y: P + 15 }, 24);
  b.dome(6.2, M.lead, { y: P + 18 });
  b.cyl(0.9, 1.1, 2.2, M.portland, { y: P + 24 }, 10);
  b.solid(0, 1, W + 4, D + 2);
  return b.build('City Hall');
}

function dublinCastle(site) {
  // the Cork Hill gate into the Upper Castle Yard (Justice on top) and the red-brick Georgian range behind it
  const b = new Builder(site);
  b.archWall(8, 8.5, 1.6, 4, 6, M.portland);
  b.box(8.6, 0.8, 2, M.portland, { y: 8.5 });
  b.statue(0, 9.3, 0, 1.1, M.bronze);
  b.box(3.8, 5, 0.1, M.dark, { z: -0.3 });
  railings(b, -18, -4.4, 0.3); railings(b, 4.4, 18, 0.3);
  for (const x of [-18, 18]) b.box(1.2, 2.6, 1.2, M.portland, { x });
  // Upper Yard: red brick, three storeys with a stone cornice, and the Bedford Tower over the far range
  b.facade(40, 13, 12, M.castleBrick, M.slate, { z: -24 }, 4, 4.3);
  b.box(40.5, 0.8, 12.5, M.portland, { y: 13, z: -24 });
  b.facade(7, 18, 7, M.portland, M.lead, { z: -18 });
  b.cyl(2.4, 2.8, 5, M.portland, { y: 18, z: -18 }, 12);
  b.dome(2.5, M.copper, { y: 23, z: -18 });
  b.box(40, 0.05, 20, M.cobble, { y: KERB_H, z: -10 }); // cobbled yard
  b.solid(-9, 0, 2, 1.8); b.solid(9, 0, 2, 1.8); b.solid(-11, 0.3, 14, 0.4); b.solid(11, 0.3, 14, 0.4);
  b.solid(0, -24, 40, 12); b.solid(0, -18, 7, 7);
  return b.build('Dublin Castle');
}

function centralBank(site) {
  // Sam Stephenson's Central Bank (1978): floors hung from the roof as projecting stone "trays",
  // dark suspension members down the front, raised on a plaza with steps to Dame Street
  const b = new Builder(site);
  const W = site.w, D = site.d, P = 1.4;
  const front = D / 2 + site.plaza;
  b.box(W + 8, P, D + site.plaza, M.granite, { z: site.plaza / 2 });
  for (let k = 0; k < 4; k++) b.box(W + 8, 0.35, 0.45, M.granite, { y: k * 0.35, z: front + 1.6 - k * 0.45 });
  b.box(W - 8, 7, D - 8, M.glass, { y: P }); // recessed glazed ground floor
  for (let f = 0; f < 9; f++) {
    const y = P + 7 + f * 3.8;
    b.box(W, 1.1, D, M.portlandSmooth, { y }); // the tray
    b.box(W - 1.6, 2.7, D - 1.6, M.curtain, { y: y + 1.1 }); // glazing set back behind the tray lip
  }
  const top = P + 7 + 9 * 3.8;
  b.box(W, 1.6, D, M.portlandSmooth, { y: top });
  b.box(W - 8, 3, D - 8, M.glass, { y: top + 1.6 }); // rooftop pavilion
  for (const x of [-W / 2 + 2.5, -W / 6, W / 6, W / 2 - 2.5]) for (const z of [D / 2 + 0.3, -D / 2 - 0.3]) b.box(0.5, top - P - 5, 0.4, M.dark, { x, y: P + 7, z });
  // the gilded sculpture on the plaza
  b.add(new THREE.SphereGeometry(1.7, 18, 12), M.gold, { x: W / 2 - 3, y: P + 2.4, z: front - 3 });
  b.cyl(0.4, 0.5, 0.8, M.granite, { x: W / 2 - 3, y: P, z: front - 3 }, 8);
  b.solid(0, 0, W - 4, D - 4);
  return b.build('Central Bank');
}

function olympia(site) {
  // white stucco front, red and gold cast-iron canopy with a stained-glass half dome, red blade signs
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 4 * 3.6;
  b.facade(W, H, D, M.stucco, M.slate, {}, 4, 3.6);
  b.box(W, 3.6, 0.3, M.olympiaRed, { z: D / 2 + 0.05 }); // red ground-floor front
  const cz = D / 2 + 1.7;
  b.box(W - 1, 0.35, 3.4, M.olympiaRed, { y: 3.6, z: cz });
  b.box(W - 1, 0.7, 0.25, M.gold, { y: 3.95, z: cz + 1.6 });
  for (const sx of [-1, 1]) { b.cyl(0.12, 0.16, 3.6, M.olympiaRed, { x: sx * (W / 2 - 1), z: cz + 1.5 }, 8); b.solid(sx * (W / 2 - 1), cz + 1.5, 0.4, 0.4); }
  b.add(new THREE.SphereGeometry(2.4, 18, 8, 0, Math.PI, 0, Math.PI / 2), M.scaleGlass, { y: 3.95, z: cz - 1.2, s: 1, sz: 1.2 });
  b.add(new THREE.PlaneGeometry(1, 7), M.bladeTheatre, { x: -W / 2 + 1.5, y: 8.2, z: D / 2 + 0.8, ry: Math.PI / 2 });
  b.add(new THREE.PlaneGeometry(1, 7), M.bladeOlympia, { x: W / 2 - 1.5, y: 8.2, z: D / 2 + 0.8, ry: Math.PI / 2 });
  b.solid(0, 0, W, D);
  return b.build('Olympia Theatre');
}

function clockCorner(site) {
  // Victorian stone commercial block on the Trinity Street corner, its corner tower topped with a clock
  // stage and a small dome
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 20;
  b.facade(W, H, D, M.heustonStone, M.slate, {}, 4, 4.3);
  b.box(W + 0.5, 0.8, D + 0.5, M.portland, { y: H });
  const tx = W / 2 - 2.5, tz = D / 2 - 2.5;
  b.facade(5.4, 29, 5.4, M.heustonStone, M.lead, { x: tx, z: tz });
  b.box(6, 0.7, 6, M.portland, { x: tx, y: 25 });
  for (const [dx, dz, ry] of [[0, 2.72, 0], [2.72, 0, Math.PI / 2], [0, -2.72, Math.PI], [-2.72, 0, -Math.PI / 2]]) b.add(new THREE.CircleGeometry(1.1, 20), M.clock, { x: tx + dx, y: 27, z: tz + dz, ry });
  b.cyl(2, 2.4, 2, M.portland, { x: tx, y: 29, z: tz }, 10);
  b.dome(2.1, M.lead, { x: tx, y: 31, z: tz });
  b.solid(0, 0, W, D);
  return b.build('Dame Street clock tower');
}

function grattanIsland(site) {
  // Henry Grattan on his granite pedestal, on a kerbed island in the middle of College Green
  const b = new Builder(site);
  b.box(3.2, KERB_H, 16, M.granite);
  b.box(2.8, 0.05, 15.4, M.cobble, { y: KERB_H });
  b.box(2.2, 3.4, 2.2, M.graniteSmooth, { y: KERB_H });
  b.box(2.6, 0.4, 2.6, M.graniteSmooth, { y: KERB_H + 3.4 });
  b.statue(0, KERB_H + 3.8, 0, 1.25, M.bronze);
  b.solid(0, 0, 3.2, 16);
  return b.build('Grattan monument');
}

// ---------- Grafton Street ----------
// shopfront elevations painted to scale (32 px per metre), used on a plane over the building's street face
const PXM = 32;
const frontTex = (wm, hm, draw) => {
  const t = canvasTex(wm * PXM, hm * PXM, (ctx, w, h) => draw(ctx, w, h, (m) => h - m * PXM));
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};
const sashRow = (ctx, w, y0, hh, n, frame = '#f3efe6', glass = '#27303a') => {
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const x = i * bw + bw * 0.28, ww = bw * 0.44;
    ctx.fillStyle = frame; ctx.fillRect(x - 5, y0 - 5, ww + 10, hh + 10);
    ctx.fillStyle = glass; ctx.fillRect(x, y0, ww, hh);
    ctx.fillStyle = frame; ctx.fillRect(x, y0 + hh / 2 - 2, ww, 4); ctx.fillRect(x + ww / 2 - 2, y0, 4, hh);
  }
};
const bewleysTex = frontTex(12, 18, (ctx, w, h, y) => {
  ctx.fillStyle = '#e9e1cf'; ctx.fillRect(0, 0, w, h);
  sashRow(ctx, w, y(16.2), 2.2 * PXM, 3); sashRow(ctx, w, y(12.6), 2.4 * PXM, 3);
  // the Egyptian-style mosaic frieze with its winged disc
  ctx.fillStyle = '#2f5f4a'; ctx.fillRect(0, y(9.6), w, 1.6 * PXM);
  const cols = ['#c8352a', '#e2b53a', '#2c6fb0', '#3f9a5a'];
  for (let x = 0; x < w; x += 12) { ctx.fillStyle = cols[(x / 12) % 4 | 0]; ctx.fillRect(x, y(9.4), 8, 0.5 * PXM); }
  ctx.fillStyle = '#e2b53a'; ctx.beginPath(); ctx.ellipse(w / 2, y(8.6), 70, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8352a'; ctx.beginPath(); ctx.arc(w / 2, y(8.6), 12, 0, Math.PI * 2); ctx.fill();
  // first-floor windows behind the red balcony
  ctx.fillStyle = '#5a2a1e'; ctx.fillRect(0, y(8), w, 3 * PXM);
  ctx.fillStyle = '#26343c'; for (let i = 0; i < 5; i++) ctx.fillRect(12 + i * (w - 24) / 5, y(7.7), (w - 24) / 5 - 10, 2.4 * PXM);
  // the lettered sign band on a checkered border
  ctx.fillStyle = '#ece6d4'; ctx.fillRect(0, y(5), w, 1.2 * PXM);
  for (let x = 0; x < w; x += 8) { ctx.fillStyle = (x / 8) % 2 ? '#1c1c1c' : '#e9e1cf'; ctx.fillRect(x, y(5), 8, 5); ctx.fillRect(x, y(3.95), 8, 5); }
  ctx.fillStyle = '#26221c'; ctx.font = `bold ${0.7 * PXM}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText("BEWLEY'S ORIENTAL CAFÉS Ltd", w / 2, y(4.4));
  // ground floor: dark timber and glass
  ctx.fillStyle = '#4a2a1c'; ctx.fillRect(0, y(3.8), w, 3.8 * PXM);
  ctx.fillStyle = '#2a2622'; ctx.fillRect(20, y(3.4), w * 0.38, 2.8 * PXM); ctx.fillRect(w * 0.58, y(3.4), w * 0.38, 2.8 * PXM);
});
const brownThomasTex = frontTex(28, 18, (ctx, w, h, y) => {
  ctx.fillStyle = '#a4523a'; ctx.fillRect(0, 0, w, h);
  for (let r = 0; r < h; r += 6) { ctx.fillStyle = 'rgba(60,25,18,0.18)'; ctx.fillRect(0, r, w, 1); }
  sashRow(ctx, w, y(16), 2.2 * PXM, 7); sashRow(ctx, w, y(12.4), 2.6 * PXM, 7); sashRow(ctx, w, y(8.6), 2.6 * PXM, 7);
  // white stone shopfront storey with the name, garlanded windows
  ctx.fillStyle = '#efece6'; ctx.fillRect(0, y(5.6), w, 5.6 * PXM);
  ctx.fillStyle = '#3a3530'; ctx.font = `${0.8 * PXM}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('BROWN THOMAS', w * 0.72, y(4.9));
  for (let i = 0; i < 5; i++) {
    const x = 16 + i * (w - 32) / 5, ww = (w - 32) / 5 - 26;
    ctx.fillStyle = '#2d4a2c'; ctx.fillRect(x - 12, y(4.3), ww + 24, 4.3 * PXM); // garland
    for (let k = 0; k < 40; k++) { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - 10 + Math.random() * (ww + 20), y(4.2) + Math.random() * 4.1 * PXM, 3, 3); }
    ctx.fillStyle = '#e7dccb'; ctx.fillRect(x, y(3.8), ww, 3.6 * PXM);
    ctx.fillStyle = '#b89c7a'; ctx.fillRect(x + 8, y(1.2), ww - 16, 1.0 * PXM);
  }
});
const weirTex = frontTex(10, 16, (ctx, w, h, y) => {
  ctx.fillStyle = '#d9d1bf'; ctx.fillRect(0, 0, w, h);
  sashRow(ctx, w, y(14.2), 2.2 * PXM, 3, '#ece6d8'); sashRow(ctx, w, y(10.6), 2.4 * PXM, 3, '#ece6d8'); sashRow(ctx, w, y(7), 2.4 * PXM, 3, '#ece6d8');
  ctx.fillStyle = '#16140f'; ctx.fillRect(0, y(4.4), w, 4.4 * PXM);
  ctx.fillStyle = '#c9a646'; ctx.font = `bold ${0.75 * PXM}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('WEIR & SONS', w / 2, y(3.8));
  ctx.fillStyle = '#f2e3b0'; ctx.fillRect(16, y(3.2), w - 32, 2.6 * PXM);
  ctx.fillStyle = '#16140f'; for (let i = 1; i < 4; i++) ctx.fillRect(16 + i * (w - 32) / 4, y(3.2), 4, 2.6 * PXM);
});
// the shopping centre's white "conservatory" bays: one 4 m bay per 3.5 m storey, two arched windows over a
// lacy balcony rail, slender white piers between
const conservatoryTex = canvasTex(128, 112, (ctx, w, h) => {
  ctx.fillStyle = '#f3f2ee'; ctx.fillRect(0, 0, w, h);
  for (const x0 of [10, 68]) {
    const ww = 50;
    ctx.fillStyle = '#26303a';
    ctx.beginPath(); ctx.moveTo(x0, 86); ctx.lineTo(x0, 34); ctx.arc(x0 + ww / 2, 34, ww / 2, Math.PI, 0); ctx.lineTo(x0 + ww, 86); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f3f2ee'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 + ww / 2, 86); ctx.lineTo(x0 + ww / 2, 10); ctx.moveTo(x0, 52); ctx.lineTo(x0 + ww, 52); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + ww / 2, 34, ww / 2 - 8, Math.PI, 0); ctx.stroke();
  }
  // balcony: white rail with a quatrefoil lace pattern
  ctx.fillStyle = '#e9e7e1'; ctx.fillRect(0, 86, w, 26);
  ctx.strokeStyle = '#b7b3a8'; ctx.lineWidth = 1.5;
  for (let x = 4; x < w; x += 8) { ctx.beginPath(); ctx.arc(x, 99, 3.2, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 86, w, 3); ctx.fillRect(0, 108, w, 4);
});
// ground-floor shopfronts: granite piers, dark glass, a dark green fascia band (one 8 m unit)
const mallShopTex = canvasTex(256, 144, (ctx, w, h) => {
  ctx.fillStyle = '#8f8b84'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1f4a38'; ctx.fillRect(18, 14, w - 36, 22);
  ctx.fillStyle = '#e8e2d2'; for (let x = 40; x < w - 50; x += 14) ctx.fillRect(x, 23, 8, 4);
  ctx.fillStyle = '#20272c'; ctx.fillRect(18, 42, w - 36, h - 42);
  ctx.fillStyle = '#d9d2c4'; for (let i = 0; i < 6; i++) ctx.fillRect(40 + i * 30, 96, 10, 40); // mannequins and stock
  ctx.fillStyle = '#8f8b84'; ctx.fillRect(w / 2 - 3, 42, 6, h - 42);
});
Object.assign(M, {
  mallShop: new THREE.MeshStandardMaterial({ map: mallShopTex, roughness: 0.4 }),
  archStone: new THREE.MeshStandardMaterial({ color: 0xe4e1d9, map: stoneT, roughness: 0.82 }),
  archSmooth: new THREE.MeshStandardMaterial({ color: 0xcfccc4, roughness: 0.78 }),
  inscription: new THREE.MeshStandardMaterial({ map: signTex('FORTISSIMIS SVIS MILITIBVS', { bg: '#bdb9ae', fg: '#6d6a62', w: 512, h: 64, font: '30px Georgia' }), roughness: 0.85 }),
});

Object.assign(M, {
  bewleys: new THREE.MeshStandardMaterial({ map: bewleysTex, roughness: 0.7 }),
  brownThomas: new THREE.MeshStandardMaterial({ map: brownThomasTex, roughness: 0.75, emissive: 0xffffff, emissiveMap: brownThomasTex, emissiveIntensity: 0.05 }),
  weir: new THREE.MeshStandardMaterial({ map: weirTex, roughness: 0.6 }),
  conservatory: new THREE.MeshStandardMaterial({ map: conservatoryTex, roughness: 0.5 }),
  awning: new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.8, side: THREE.DoubleSide }),
  flowers: new THREE.MeshStandardMaterial({ color: 0xb0204a, roughness: 0.9 }),
  festoon: glow(0xffe2a0, 0.25, 2.2),
});

// a plain stucco block with a painted elevation laid over its street face
function shopfront(site, frontMat, H, name) {
  const b = new Builder(site);
  b.facade(site.w, H, site.d, M.stucco, M.slate, {}, 4, 3.6);
  b.add(new THREE.PlaneGeometry(site.w, H), frontMat, { y: H / 2, z: site.d / 2 + 0.03 });
  b.solid(0, 0, site.w, site.d);
  return b;
}
function bewleys(site) {
  const b = shopfront(site, M.bewleys, 18, "Bewley's");
  const W = site.w, D = site.d;
  // red iron balcony with hanging flowers, and the maroon awnings over the café windows
  b.box(W - 1, 0.1, 0.9, M.olympiaRed, { y: 5.2, z: D / 2 + 0.45 });
  for (let x = -W / 2 + 0.7; x < W / 2 - 0.5; x += 0.35) b.box(0.04, 1, 0.04, M.olympiaRed, { x, y: 5.3, z: D / 2 + 0.88 });
  b.box(W - 1, 0.06, 0.06, M.olympiaRed, { y: 6.3, z: D / 2 + 0.88 });
  for (const x of [-W / 2 + 1.2, W / 2 - 1.2]) b.add(new THREE.SphereGeometry(0.55, 8, 6), M.planting, { x, y: 5.9, z: D / 2 + 0.7 });
  for (const x of [-W / 4 - 0.4, W / 4 + 0.4]) b.box(W / 2 - 1.6, 0.08, 1.6, M.awning, { x, y: 3.3, z: D / 2 + 0.7, rx: 0.35 });
  return b.build("Bewley's");
}
function brownThomas(site) {
  const b = shopfront(site, M.brownThomas, 18, 'Brown Thomas');
  for (const x of [-9, -3, 3, 9]) {
    b.cyl(0.04, 0.04, 3, M.dark, { x, y: 8, z: site.d / 2 + 0.1, rx: Math.PI / 2 - 0.5 }, 5);
    b.add(new THREE.PlaneGeometry(1, 1.6), M.flag, { x: x + 0.55, y: 9.2, z: site.d / 2 + 2 });
  }
  return b.build('Brown Thomas');
}
function weirAndSons(site) {
  const b = shopfront(site, M.weir, 16, 'Weir & Sons');
  // the street clock on its post, out on the paving
  const cz = site.d / 2 + 2.2, cx = site.w / 2 + 1;
  b.cyl(0.09, 0.14, 4.2, M.dark, { x: cx, z: cz }, 8);
  b.cyl(0.5, 0.5, 0.18, M.dark, { x: cx, y: 4.2, z: cz, rz: Math.PI / 2 }, 16);
  for (const s of [-1, 1]) b.add(new THREE.CircleGeometry(0.44, 20), M.clock, { x: cx + s * 0.1, y: 4.2, z: cz, ry: (s * Math.PI) / 2 });
  b.solid(cx, cz, 0.4, 0.4);
  return b.build('Weir & Sons');
}
function merchantsHall(site) {
  // local +z faces the quay, local +x is east (E below mirrors the layout so the passage is in the west bay). Rusticated granite ground floor with three round-headed openings -
  // a window (east), the door with its fanlight (centre) and the open passage (west) - two storeys of pedimented
  // sashes in Portland ashlar above, a cornice and parapet. The passage runs right through, vaulted.
  const b = new Builder(site);
  const W = site.w, D = site.d, G = 4.8, H = 13, bay = W / 3, pw = 2.8;
  const E = -1; // west is -x
  const px = E * bay; // passage centre (west bay)
  for (let k = 0; k < 3; k++) b.archWall(bay, G, 0.7, k === 2 ? pw : 2.4, 4.1, M.granite, { x: E * (-bay + k * bay), z: D / 2 - 0.35 });
  // ground-floor mass behind the front wall, split round the passage
  b.box(W - bay - (bay - pw) / 2 + 0.01, G, D - 0.7, M.granite, { x: E * (-(W / 2) + (W - bay - (bay - pw) / 2) / 2), z: -0.35 });
  b.box((bay - pw) / 2, G, D - 0.7, M.granite, { x: E * (W / 2 - (bay - pw) / 4), z: -0.35 });
  b.box(bay, G, 0.7, M.granite, { x: px, z: -D / 2 + 0.35, sx: 1, sy: 1, sz: 1 }); // rear wall piece above the passage mouth
  b.box(pw + 0.02, 0.4, D, M.granite, { x: px, y: 3.9 }); // vault soffit
  // door and window in the other two openings
  b.box(2.2, 3.4, 0.1, M.dark, { x: 0, z: D / 2 - 0.45 });
  b.box(2.2, 3.2, 0.1, M.glass, { x: -E * bay, y: 0.6, z: D / 2 - 0.45 });
  // upper floors
  b.facade(W, H - G, D, M.facade, M.slate, { y: G }, bay, (H - G) / 2);
  b.box(W + 0.6, 0.35, D + 0.4, M.portlandSmooth, { y: G - 0.1 });
  b.box(W + 0.8, 0.7, D + 0.6, M.portlandSmooth, { y: H });
  b.box(W + 0.2, 1.0, 0.3, M.portland, { y: H + 0.7, z: D / 2 - 0.1 });
  // gilt name over the door, window boxes of flowers on the first floor
  b.add(new THREE.PlaneGeometry(4.6, 0.55), signMat("MERCHANTS' HALL", { bg: '#1c1f22', fg: '#d4a63a', font: 'bold 34px Georgia' }), { y: 4.35, z: D / 2 + 0.02 });
  for (let k = 0; k < 3; k++) {
    b.box(1.6, 0.3, 0.35, M.timber, { x: -bay + k * bay, y: G + 0.9, z: D / 2 + 0.18 });
    b.box(1.5, 0.25, 0.3, M.flowers, { x: -bay + k * bay, y: G + 1.2, z: D / 2 + 0.18 });
  }
  b.solid(E * (-(W / 2) + (W - bay - (bay - pw) / 2) / 2), 0, W - bay - (bay - pw) / 2, D);
  b.solid(E * (W / 2 - (bay - pw) / 4), 0, (bay - pw) / 2, D);
  return b.build("Merchants' Hall");
}

function stephensGreenCentre(site) {
  // St Stephen's Green Shopping Centre (1988): a white cast-iron "conservatory" front four storeys high over a
  // granite shop floor, a glazed mansard roof, and the rounded corner facing the Fusiliers' Arch crowned with a
  // glass dome and hung with red flower boxes. Local +z faces King Street South, local -x faces the Green.
  const b = new Builder(site);
  const W = site.w, D = site.d, G = 4.6, F = 3.5, N = 4, H = G + N * F, R = 13;
  const cx = -W / 2 + R, cz = D / 2 - R;
  // shop floor and the conservatory storeys: two boxes that leave the corner quadrant for the drum
  b.facade(W - R, G, D, M.mallShop, M.granite, { x: R / 2 }, 8, G);
  b.facade(R, G, D - R, M.mallShop, M.granite, { x: -W / 2 + R / 2, z: -R / 2 }, 8, G);
  b.facade(W - R, N * F, D, M.conservatory, M.slate, { x: R / 2, y: G }, 4, F);
  b.facade(R, N * F, D - R, M.conservatory, M.slate, { x: -W / 2 + R / 2, y: G, z: -R / 2 }, 4, F);
  const quarter = (h, mat, y, bay, fh) => {
    const g = new THREE.CylinderGeometry(R, R, h, 28, 1, true, -Math.PI / 2, Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Math.PI * R / 2) / bay, uv.getY(i) * h / fh);
    b.add(g.translate(0, h / 2, 0), mat, { x: cx, y, z: cz });
  };
  quarter(G, M.mallShop, 0, 8, G); quarter(N * F, M.conservatory, G, 4, F);
  b.add(new THREE.CircleGeometry(R, 28, Math.PI / 2, Math.PI / 2).rotateX(-Math.PI / 2), M.slate, { x: cx, y: H, z: cz });
  // red flower boxes along the corner balconies
  for (let k = 0; k < N; k++) b.add(new THREE.TorusGeometry(R + 0.3, 0.28, 5, 28, Math.PI / 2), M.flowers, { x: cx, y: G + k * F + 0.35, z: cz, rz: Math.PI / 2, rx: Math.PI / 2 });
  // glazed mansard roof set back behind a white rail, and the dome over the corner
  b.box(W - R - 2, 2.6, D - 4, M.glass, { x: R / 2, y: H, z: -1 });
  b.box(W - R, 0.25, 0.2, M.whiteSteel, { x: R / 2, y: H + 0.9, z: D / 2 - 0.3 });
  b.box(0.2, 0.25, D - R, M.whiteSteel, { x: -W / 2 + 0.3, y: H + 0.9, z: -R / 2 });
  b.cyl(R * 0.62, R * 0.66, 2.2, M.whiteSteel, { x: cx + 2, y: H, z: cz - 2 }, 24);
  b.add(new THREE.SphereGeometry(R * 0.62, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, { x: cx + 2, y: H + 2.2, z: cz - 2, sy: 0.8 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, pts = [];
    for (let i = 0; i <= 8; i++) { const t = (i / 8) * (Math.PI / 2); pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(t) * R * 0.63, Math.sin(t) * R * 0.63 * 0.8, Math.sin(a) * Math.cos(t) * R * 0.63)); }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.08, 4), M.whiteSteel, { x: cx + 2, y: H + 2.2, z: cz - 2 });
  }
  b.solid(0, 0, W, D);
  return b.build("St Stephen's Green Shopping Centre");
}
// Christmas lights strung across Grafton Street, and the wooden planters at its top end
function graftonDressing() {
  const b = new Builder({ x: 0, z: 0, rot: 0 });
  const way = world.ways.find((w) => w.pedestrian);
  const pts = way.pts, half = way.width / 2 + way.pave;
  let acc = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], c = pts[k + 1], L = v2.len(v2.sub(c, a)), d = v2.norm(v2.sub(c, a)), n = { x: -d.z, z: d.x };
    for (let s = 12 - acc; s < L - 6; s += 18) {
      const p = v2.add(a, v2.scale(d, s));
      const ry = Math.atan2(n.x, n.z);
      b.box(0.05, 0.05, half * 2, M.dark, { x: p.x, y: 9, z: p.z, ry });
      for (let t = -half + 0.8; t < half; t += 0.9) b.add(new THREE.SphereGeometry(0.09, 5, 4), M.festoon, { x: p.x + n.x * t, y: 8.85, z: p.z + n.z * t });
      // a hanging chandelier of lights in the middle
      b.add(new THREE.ConeGeometry(0.7, 1.8, 8, 1, true), M.festoon, { x: p.x, y: 7.9, z: p.z, rx: Math.PI });
    }
    acc = (acc + L) % 18;
  }
  // planters with small trees where Grafton Street opens onto the Green
  const a = pts[pts.length - 2], c = pts[pts.length - 1], d = v2.norm(v2.sub(c, a)), n = { x: -d.z, z: d.x };
  for (const s of [8, 20]) for (const side of [-1, 1]) {
    const p = v2.add(v2.sub(c, v2.scale(d, s)), v2.scale(n, side * (way.width / 2 - 1.3)));
    b.box(2, 0.8, 2, M.timber, { x: p.x, y: KERB_H, z: p.z });
    b.cyl(0.08, 0.1, 1.6, M.timber, { x: p.x, y: KERB_H + 0.8, z: p.z }, 5);
    b.add(new THREE.IcosahedronGeometry(1.1, 0), M.planting, { x: p.x, y: KERB_H + 2.6, z: p.z });
    addBox(p.x, p.z, 1, 1, 0);
  }
  return b.build('Grafton Street dressing');
}

// ---------- the GPO ----------
// Portland-stone Palladian bay for the GPO's long front: one 4 m bay over the full 17 m height
const gpoWallTex = canvasTex(128, 544, (ctx, w, h) => {
  const px = h / 17, y = (m) => h - m * px;
  ctx.fillStyle = '#e2dac8'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(90,85,75,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * w, Math.random() * h, 5 + Math.random() * 14, 2 + Math.random() * 5); }
  // rusticated granite ground floor
  ctx.fillStyle = '#cdc5b4'; ctx.fillRect(0, y(5.2), w, 5.2 * px);
  ctx.fillStyle = 'rgba(70,66,58,0.4)'; for (let m = 0.6; m < 5.2; m += 0.6) ctx.fillRect(0, y(m), w, 2);
  const win = (cy, hh, hood) => {
    const ww = 1.3 * px, x0 = (w - ww) / 2;
    ctx.fillStyle = '#efebe1'; ctx.fillRect(x0 - 5, y(cy + hh) - 5, ww + 10, hh * px + 10);
    ctx.fillStyle = '#242a2e'; ctx.fillRect(x0, y(cy + hh), ww, hh * px);
    ctx.fillStyle = '#e4dfd4'; for (let r = 1; r < 3; r++) ctx.fillRect(x0, y(cy + hh) + (hh * px * r) / 3, ww, 1.5);
    ctx.fillRect(x0 + ww / 2 - 1, y(cy + hh), 2, hh * px);
    if (hood) { ctx.fillStyle = '#f1ede4'; ctx.fillRect(x0 - 9, y(cy + hh + 0.35), ww + 18, 0.3 * px); }
  };
  win(1.4, 2.6, false); win(6.6, 3, true); win(11.2, 2.2, true); win(14.3, 1.4, false);
  ctx.fillStyle = '#ece8de'; ctx.fillRect(0, y(5.35), w, 5); ctx.fillRect(0, y(10.6), w, 4);
});
// the wall inside the portico (24 m x 12.5 m): five bays of arched doorways under fanned voussoirs, a clock
// over the centre door, green lanterns, arched windows above, and round dark oculi under the entablature
const gpoPorticoTex = canvasTex(768, 400, (ctx, w, h) => {
  const px = w / 24, y = (m) => h - m * px;
  ctx.fillStyle = '#ddd4c2'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(90,85,75,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * w, Math.random() * h, 8, 3); }
  for (let k = 0; k < 5; k++) {
    const cx = (k + 0.5) * (w / 5);
    // fanned voussoirs round the door arch
    ctx.strokeStyle = 'rgba(110,104,92,0.55)'; ctx.lineWidth = 2;
    for (let a = 0; a <= 12; a++) { const t = Math.PI + (a / 12) * Math.PI; ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * 1.3 * px, y(3.6) + Math.sin(t) * 1.3 * px); ctx.lineTo(cx + Math.cos(t) * 2.3 * px, y(3.6) + Math.sin(t) * 2.3 * px); ctx.stroke(); }
    ctx.fillStyle = '#1e2428';
    ctx.beginPath(); ctx.moveTo(cx - 1.3 * px, y(0)); ctx.lineTo(cx - 1.3 * px, y(3.6)); ctx.arc(cx, y(3.6), 1.3 * px, Math.PI, 0); ctx.lineTo(cx + 1.3 * px, y(0)); ctx.fill();
    ctx.strokeStyle = '#6b6252'; ctx.lineWidth = 2; for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.moveTo(cx - 1.3 * px, y(r * 1.1)); ctx.lineTo(cx + 1.3 * px, y(r * 1.1)); ctx.stroke(); }
    // arched window on the upper floor
    ctx.fillStyle = '#e8e3d8'; ctx.fillRect(cx - 1.05 * px, y(6.2), 2.1 * px, 0.25 * px);
    ctx.fillStyle = '#262d33';
    ctx.beginPath(); ctx.moveTo(cx - 0.8 * px, y(6.4)); ctx.lineTo(cx - 0.8 * px, y(8.6)); ctx.arc(cx, y(8.6), 0.8 * px, Math.PI, 0); ctx.lineTo(cx + 0.8 * px, y(6.4)); ctx.fill();
    ctx.strokeStyle = '#d9d3c6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y(6.4)); ctx.lineTo(cx, y(9.3)); ctx.stroke();
    // oculus
    if (k % 2 === 0) { ctx.fillStyle = '#161b24'; ctx.beginPath(); ctx.arc(cx, y(11), 0.7 * px, 0, Math.PI * 2); ctx.fill(); }
    // green lanterns either side of the doors
    if (k !== 2) { ctx.fillStyle = '#6fa590'; ctx.fillRect(cx - 0.25 * px, y(5.2), 0.5 * px, 0.8 * px); }
  }
  // the clock over the central door
  ctx.fillStyle = '#6a8f89'; ctx.beginPath(); ctx.arc(w / 2, y(5.1), 0.62 * px, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9ece6'; ctx.beginPath(); ctx.arc(w / 2, y(5.1), 0.5 * px, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w / 2, y(5.1)); ctx.lineTo(w / 2, y(5.5)); ctx.moveTo(w / 2, y(5.1)); ctx.lineTo(w / 2 + 0.3 * px, y(5.0)); ctx.stroke();
}, true);
gpoPorticoTex.wrapS = gpoPorticoTex.wrapT = THREE.ClampToEdgeWrapping;
// carved frieze: anthemion and scroll band on the entablature
const gpoFriezeTex = canvasTex(256, 32, (ctx, w, h) => {
  ctx.fillStyle = '#e2ddd1'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#9d9585'; ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath(); ctx.arc(x + 8, h / 2, 6, 0.5, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 24, h / 2, 6, Math.PI * 1.5, Math.PI * 0.8); ctx.stroke();
    for (let f = -2; f <= 2; f++) { ctx.beginPath(); ctx.moveTo(x + 16, h - 5); ctx.lineTo(x + 16 + f * 3, 5); ctx.stroke(); }
  }
});
// fluted shaft: light/shadow stripes, 24 flutes round the column
const flutedTex = canvasTex(96, 8, (ctx, w, h) => {
  for (let i = 0; i < 24; i++) {
    const g = ctx.createLinearGradient(i * 4, 0, i * 4 + 4, 0);
    g.addColorStop(0, '#bdb7a9'); g.addColorStop(0.5, '#ece8de'); g.addColorStop(1, '#d4cfc3');
    ctx.fillStyle = g; ctx.fillRect(i * 4, 0, 4, h);
  }
});
Object.assign(M, {
  gpoWall: new THREE.MeshStandardMaterial({ map: gpoWallTex, roughness: 0.8 }),
  gpoPortico: new THREE.MeshStandardMaterial({ map: gpoPorticoTex, roughness: 0.8 }),
  gpoFrieze: new THREE.MeshStandardMaterial({ map: gpoFriezeTex, roughness: 0.8 }),
  fluted: new THREE.MeshStandardMaterial({ map: flutedTex, roughness: 0.7, color: 0xfff8ea }),
  // the portico ceiling sits in shadow; a little emission stands in for light bounced up off the pavement
  soffit: new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9, emissive: 0x6a6457, emissiveIntensity: 0.35 }),
});

// fluted Ionic column: moulded base, fluted shaft, capital with a volute scroll either side
function ionicColumn(b, x, z, h, r, y = 0) {
  b.box(r * 2.7, 0.35, r * 2.7, M.portlandSmooth, { x, y, z });
  b.cyl(r * 1.2, r * 1.25, 0.3, M.portlandSmooth, { x, y: y + 0.35, z }, 16);
  const shaft = new THREE.CylinderGeometry(r * 0.86, r, h - 1.6, 20, 1, true).translate(0, (h - 1.6) / 2, 0);
  b.add(shaft, M.fluted, { x, y: y + 0.65, z });
  b.cyl(r * 0.95, r * 0.88, 0.3, M.portlandSmooth, { x, y: y + h - 0.95, z }, 16);
  for (const s of [-1, 1]) b.cyl(r * 0.42, r * 0.42, r * 1.9, M.portlandSmooth, { x: x + s * r * 1.05, y: y + h - 0.55, z: z - r * 0.95, rx: Math.PI / 2 }, 12);
  b.box(r * 2.5, 0.28, r * 2.5, M.portlandSmooth, { x, y: y + h - 0.28, z });
}

function gpo(site) {
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 17;
  b.facade(W, H, D, M.gpoWall, M.lead, { z: 0 }, 4, 17);
  b.box(W + 0.6, 0.9, D + 0.6, M.portlandSmooth, { y: H - 0.2 }); // cornice
  b.balustrade(-W / 2, -12.5, H + 0.7, D / 2, M.portland);
  b.balustrade(12.5, W / 2, H + 0.7, D / 2, M.portland);
  b.box(W, 1.2, D - 2, M.lead, { y: H + 0.7 });
  // hexastyle Ionic portico projecting over the footpath
  const pd = 5.4, pz = D / 2 + pd - 1.1, colH = 12.5, base = 0.3, PW = 24;
  b.box(PW + 1, base, pd + 0.6, M.granite, { z: D / 2 + pd / 2 });
  b.add(new THREE.PlaneGeometry(PW, colH), M.gpoPortico, { y: base + colH / 2, z: D / 2 + 0.03 });
  for (let i = 0; i < 6; i++) {
    const x = -10 + i * 4;
    ionicColumn(b, x, pz, colH, 0.72, base);
    b.solid(x, pz, 1.9, 1.9);
    if (i === 0 || i === 5) b.box(1.4, colH, 0.35, M.fluted, { x, y: base, z: D / 2 + 0.2 }); // pilasters behind
  }
  // entablature: architrave, carved frieze, dentil cornice, and the pediment with Hibernia, Mercury and Fidelity
  const ez = D / 2 + pd / 2, ey = base + colH;
  b.box(PW + 0.5, 0.8, pd + 0.3, M.portlandSmooth, { y: ey, z: ez });
  b.add(new THREE.PlaneGeometry(PW, pd + 0.2).rotateX(Math.PI / 2), M.soffit, { y: ey - 0.02, z: ez });
  b.box(PW + 0.5, 0.9, pd + 0.3, M.portlandSmooth, { y: ey + 0.8, z: ez });
  b.add(new THREE.PlaneGeometry(PW + 0.5, 0.9), M.gpoFrieze, { y: ey + 1.25, z: ez + pd / 2 + 0.16 });
  b.box(PW + 1.1, 0.5, pd + 0.8, M.portlandSmooth, { y: ey + 1.7, z: ez });
  for (let x = -PW / 2; x <= PW / 2; x += 0.5) b.box(0.22, 0.2, 0.2, M.portlandSmooth, { x, y: ey + 1.5, z: ez + pd / 2 + 0.2 });
  b.pediment(PW + 1.1, 4.2, pd + 0.4, M.portlandSmooth, { y: ey + 2.2, z: ez });
  b.box(1.6, 1, 1.6, M.portlandSmooth, { y: ey + 6.3, z: pz - 1 });
  b.statue(0, ey + 7.3, pz - 1, 1.5, M.portland); // Hibernia
  b.statue(-PW / 2, ey + 2.2, pz - 1, 1.35, M.portland); // Mercury
  b.statue(PW / 2, ey + 2.2, pz - 1, 1.35, M.portland); // Fidelity
  // flagpole with the tricolour
  b.cyl(0.08, 0.1, 10, M.iron, { x: 0, y: H + 1.2, z: 0 }, 6);
  b.add(new THREE.PlaneGeometry(3.6, 1.8), M.flag, { x: 1.85, y: H + 10, z: 0 });
  b.solid(0, 0, W, D);
  return b.build('GPO');
}

// ---------- Temple Bar (docs/research/temple-bar.md) ----------
// dark Dublin brick with white 2-over-2 sashes and stone sills: one bay 4 m x 3.1 m
const darkBrickTex = canvasTex(128, 100, (ctx, w, h) => {
  ctx.fillStyle = '#5e3a2e'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 4) { ctx.fillStyle = 'rgba(30,15,10,0.35)'; ctx.fillRect(0, y, w, 1); }
  for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(${90 + Math.random() * 50},${50 + Math.random() * 20},35,0.25)`; ctx.fillRect(Math.random() * w, Math.random() * h, 7, 3); }
  ctx.fillStyle = '#b8b0a2'; ctx.fillRect(40, 82, 48, 5);
  ctx.fillStyle = '#f2f0ea'; ctx.fillRect(44, 20, 40, 62);
  ctx.fillStyle = '#26303a'; ctx.fillRect(48, 24, 32, 26); ctx.fillRect(48, 53, 32, 26);
});
// a pub front 16 m x 4.2 m: glossy red joinery, black fascia with gilt lettering, pilasters, lit windows
const pubFrontTex = (name, base = '#b3121b') => canvasTex(1024, 270, (ctx, w, h) => {
  const px = w / 16;
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#141414'; ctx.fillRect(0, 10, w, 0.9 * px);                       // fascia
  ctx.fillStyle = '#d4a63a'; ctx.font = `bold ${0.62 * px}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, w / 2, 10 + 0.45 * px);
  ctx.fillStyle = '#6a0a10'; ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, 10 + 0.9 * px, w, 6);   // cornice shadow
  for (let k = 0; k <= 5; k++) {                                                       // pilasters
    const x = k * (w / 5) - 10;
    ctx.fillStyle = '#8f0e16'; ctx.fillRect(x, 10 + 0.9 * px, 20, h);
    ctx.fillStyle = '#d4a63a'; ctx.fillRect(x + 3, 10 + 0.9 * px + 4, 14, 5);
  }
  for (let k = 0; k < 5; k++) {                                                        // windows / doors
    const x = k * (w / 5) + 22, ww = w / 5 - 44, top = 10 + 0.9 * px + 22, door = k === 1 || k === 3;
    ctx.fillStyle = '#2a1a12'; ctx.fillRect(x, top, ww, h - top - (door ? 0 : 0.7 * px));
    const g = ctx.createLinearGradient(0, top, 0, h); g.addColorStop(0, '#f2b766'); g.addColorStop(1, '#6b3a1c');
    ctx.fillStyle = g; ctx.fillRect(x + 6, top + 6, ww - 12, h - top - (door ? 6 : 0.7 * px + 6));
    ctx.fillStyle = base; if (!door) ctx.fillRect(x, h - 0.7 * px, ww, 0.7 * px);     // stall riser
    ctx.fillStyle = '#141414'; for (let j = 1; j < 3; j++) ctx.fillRect(x + (ww * j) / 3, top, 3, h - top - (door ? 0 : 0.7 * px));
  }
});
const wallNameTex = (name) => canvasTex(1024, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ede6d6'; ctx.font = 'bold 92px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, w / 2, h / 2 + 4);
});
Object.assign(M, {
  darkBrick: new THREE.MeshStandardMaterial({ map: darkBrickTex, roughness: 0.9 }),
  pubRed: new THREE.MeshStandardMaterial({ map: pubFrontTex("CRAMPTON'S BAR"), roughness: 0.35, emissive: 0xffffff, emissiveMap: pubFrontTex("CRAMPTON'S BAR"), emissiveIntensity: 0.04 }),
  pubRedSide: new THREE.MeshStandardMaterial({ map: pubFrontTex('EST. 1840 · MUSIC NIGHTLY'), roughness: 0.35 }),
  wallName: new THREE.MeshStandardMaterial({ map: wallNameTex("CRAMPTON'S BAR"), transparent: true, alphaTest: 0.3, roughness: 0.8, depthWrite: false }),
  basket: new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: 0.95 }),
  basketFlowers: new THREE.MeshStandardMaterial({ color: 0xd63a6a, roughness: 0.9 }),
  neonRed: glow(0xff2a3a, 0.4, 3.2),
  flagsSquare: new THREE.MeshStandardMaterial({ color: 0x9e9c97, map: stoneT, roughness: 0.8 }),
});
// the pub windows glow warmly after dark
neon.push({ m: M.pubRed, day: 0.04, night: 0.7 });

function redPub(site) {
  // The landmark red pub corner (style only, invented name): glossy red ground floor wrapping the corner under a
  // black-and-gilt fascia, three storeys of dark brick with white sashes and painted wall lettering, hanging
  // baskets, scroll lanterns and a neon blade. Local +z faces Temple Bar, local -x faces Temple Lane South.
  const b = new Builder(site);
  const W = site.w, D = site.d, G = 4.2, H = G + 3 * 3.1;
  b.facade(W, H - G, D, M.darkBrick, M.slate, { y: G }, 4, 3.1);
  b.box(W, G, D, M.darkBrick);
  b.add(new THREE.PlaneGeometry(W, G), M.pubRed, { y: G / 2, z: D / 2 + 0.03 });
  b.add(new THREE.PlaneGeometry(D, G), M.pubRedSide, { x: -W / 2 - 0.03, y: G / 2, ry: -Math.PI / 2 });
  b.box(W + 0.3, 0.25, 0.5, M.dark, { y: G, z: D / 2 + 0.1 }); b.box(0.5, 0.25, D + 0.3, M.dark, { x: -W / 2 - 0.1, y: G });
  b.box(W + 0.4, 0.5, D + 0.4, M.portlandSmooth, { y: H });
  b.add(new THREE.PlaneGeometry(W * 0.9, 1.1), M.wallName, { y: H - 1.2, z: D / 2 + 0.04 });
  // baskets over the fascia, lanterns on scroll brackets, the neon blade on the corner
  for (let k = 0; k < 6; k++) {
    const x = -W / 2 + 1.6 + k * ((W - 3.2) / 5);
    b.box(0.03, 0.5, 0.03, M.dark, { x, y: G + 0.4, z: D / 2 + 0.6 });
    b.add(new THREE.IcosahedronGeometry(0.42, 1), M.basket, { x, y: G + 0.25, z: D / 2 + 0.6 });
    b.add(new THREE.IcosahedronGeometry(0.3, 0), M.basketFlowers, { x, y: G + 0.5, z: D / 2 + 0.6 });
  }
  for (const [x, z] of [[-W / 2 + 4, D / 2], [W / 2 - 4, D / 2]]) {
    b.box(0.04, 0.04, 0.6, M.dark, { x, y: G + 1.9, z: z + 0.3 });
    b.add(new THREE.CylinderGeometry(0.16, 0.12, 0.4, 4), M.lampGlow, { x, y: G + 1.5, z: z + 0.6 });
  }
  b.box(0.15, 3.4, 0.9, M.neonRed, { x: -W / 2 - 0.1, y: G + 0.8, z: D / 2 - 1.2 });
  b.solid(0, 0, W, D);
  return b.build("Crampton's Bar");
}

function templeBarSquare(sq) {
  // granite flags wall to wall, benches, a young tree and a modern black lamp column
  const b = new Builder(sq);
  const W = sq.w, D = sq.d;
  b.box(W, 0.05, D, M.flagsSquare, { y: 0.02 });
  for (const x of [-W / 3, -W / 9, W / 9, W / 3]) {
    b.box(1.8, 0.08, 0.5, M.timber, { x, y: 0.45, z: -D / 2 + 1.2 });
    b.box(1.6, 0.45, 0.1, M.dark, { x, y: 0, z: -D / 2 + 1.2 });
  }
  b.cyl(0.12, 0.15, 6, M.dark, { x: W / 4, z: 1 }, 8);
  b.box(0.9, 0.2, 0.35, M.dark, { x: W / 4, y: 6, z: 1 });
  b.cyl(0.06, 0.09, 2.6, M.timber, { x: -W / 4, z: 1 }, 6);
  b.add(new THREE.IcosahedronGeometry(1.6, 1), M.planting, { x: -W / 4, y: 3.6, z: 1 });
  b.solid(W / 4, 1, 0.4, 0.4); b.solid(-W / 4, 1, 0.5, 0.5);
  return b.build('Temple Bar Square');
}

function templeBarDressing() {
  // festoon bulbs strung across the pedestrian lanes, hanging baskets along the cobbled streets
  const b = new Builder({ x: 0, z: 0, rot: 0 });
  const r = rng(1840);
  for (const way of world.ways) {
    if (way.surface !== 'sett' && way.surface !== 'flags') continue;
    if (!/Temple Bar|Temple Lane|Fleet|Essex Street|Eustace|Crown Alley|Anglesea|Sycamore|Cope|Fownes|Merchant/.test(way.name)) continue;
    const festoon = way.access === 'pedestrian' || way.pedestrian;
    const half = way.width / 2 + way.pave;
    let acc = 0;
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], c = way.pts[k + 1], L = v2.len(v2.sub(c, a)), d = v2.norm(v2.sub(c, a)), n = { x: -d.z, z: d.x };
      for (let s = 5 - acc; s < L - 2; s += 5) {
        const p = v2.add(a, v2.scale(d, s)), idx = Math.round((acc + s) / 5);
        if (festoon && idx % 2 === 0) {
          const ry = Math.atan2(n.x, n.z);
          b.box(0.03, 0.03, half * 2, M.dark, { x: p.x, y: 5.6, z: p.z, ry });
          for (let t = -half + 0.5; t < half; t += 0.7) b.add(new THREE.OctahedronGeometry(0.07, 0), M.festoon, { x: p.x + n.x * t, y: 5.5 - 0.25 * Math.cos((t / half) * Math.PI / 2), z: p.z + n.z * t });
        }
        if (r() < 0.55) {
          const side = idx % 2 ? 1 : -1, q = v2.add(p, v2.scale(n, side * (half - 0.35)));
          b.add(new THREE.IcosahedronGeometry(0.34, 0), M.basket, { x: q.x, y: 3.4, z: q.z });
          b.add(new THREE.IcosahedronGeometry(0.24, 0), M.basketFlowers, { x: q.x, y: 3.6, z: q.z });
        }
      }
      acc = (acc + L) % 5;
    }
  }
  const g = b.build('Temple Bar dressing');
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; }); // bulbs and baskets: shadows cost draw calls for nothing
  return g;
}

// ---------- St Patrick's Park and the Iveagh Play Centre (docs/research/st-patricks.md) ----------
Object.assign(M, {
  pavers: new THREE.MeshStandardMaterial({ color: 0x8c5e50, roughness: 0.9 }),
  ochre: new THREE.MeshStandardMaterial({ map: facadeTex, color: 0xe0b765, roughness: 0.85 }),
  parkBrick: new THREE.MeshStandardMaterial({ color: 0xa0493a, map: stoneT, roughness: 0.9 }),
  iveaghBrick: new THREE.MeshStandardMaterial({ map: canvasTex(128, 115, (ctx, w, h) => {
    ctx.fillStyle = '#a7452d'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { ctx.fillStyle = 'rgba(60,20,12,0.3)'; ctx.fillRect(0, y, w, 1); }
    ctx.fillStyle = '#dad4c5'; ctx.fillRect(0, 0, 10, h); ctx.fillRect(w - 10, 0, 10, h); ctx.fillRect(0, h - 10, w, 10); // Portland dressings
    ctx.fillStyle = '#dad4c5'; ctx.fillRect(34, 20, 60, 72);
    ctx.fillStyle = '#26303a'; ctx.fillRect(40, 26, 48, 60);
    ctx.fillStyle = '#dad4c5'; ctx.fillRect(62, 26, 4, 60); ctx.fillRect(40, 52, 48, 4);
  }), roughness: 0.85 }),
});

function stPatricksPark(park) {
  // the formal Edwardian park (1901): an east-west axis of red-brown pavers from the Patrick St gate to the raised
  // brick terrace along Bride St, the Victorian fountain in its round granite-kerbed pool about 45% along, a second
  // small fountain, and the Liberty Bell sculpture; benches along the axis
  const b = new Builder({ x: 0, z: 0, rot: 0 });
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of park.poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const zc = (z0 + z1) / 2, fx = x0 + (x1 - x0) * 0.45, y = KERB_H + 0.012;
  b.box(x1 - x0 - 9, 0.02, 3.2, M.pavers, { x: (x0 + x1 - 9) / 2, y, z: zc });
  // round pool with a two-tier cast bowl
  b.add(new THREE.CylinderGeometry(6.2, 6.2, 0.5, 28).translate(0, 0.25, 0), M.granite, { x: fx, z: zc, sz: 0.7 });
  b.add(new THREE.CylinderGeometry(5.8, 5.8, 0.52, 28).translate(0, 0.26, 0), M.water, { x: fx, z: zc, sz: 0.7 });
  b.cyl(0.35, 0.55, 2.2, M.bronze, { x: fx, y: 0.4, z: zc }, 10);
  b.cyl(1.9, 0.5, 0.45, M.bronze, { x: fx, y: 2.4, z: zc }, 16);
  b.cyl(0.18, 0.22, 1.2, M.bronze, { x: fx, y: 2.8, z: zc }, 8);
  b.cyl(0.9, 0.25, 0.3, M.bronze, { x: fx, y: 3.9, z: zc }, 12);
  b.add(new THREE.SphereGeometry(0.22, 8, 6), M.bronze, { x: fx, y: 4.35, z: zc });
  b.solid(fx, zc, 12, 8.4);
  // second small fountain (a stone drinking-fountain column) and the Liberty Bell (two tall white bell forms)
  const f2 = x0 + (x1 - x0) * 0.72;
  b.cyl(0.35, 0.45, 1.6, M.granite, { x: f2, z: zc }, 8);
  for (const dz of [-2.4, -3.6]) b.add(new THREE.ConeGeometry(0.55, 4.2, 10, 1, true).rotateX(Math.PI), M.iron, { x: f2 + 1.2, y: 4.2, z: zc + dz });
  // the Literary Parade: a raised red-brick terrace along the east edge, alcoves with limestone arches
  const tl = (z1 - z0) * 0.72, tx = x1 - 4.5;
  b.box(6, 2.6, tl, M.parkBrick, { x: tx, z: zc });
  b.box(6.4, 0.25, tl + 0.4, M.portland, { x: tx, y: 2.6, z: zc });
  for (let k = 0; k < 8; k++) {
    const az = zc - tl / 2 + (k + 0.5) * (tl / 8);
    b.add(new THREE.PlaneGeometry(1.6, 1.9), M.dark, { x: tx - 3.02, y: 1.25, z: az, ry: -Math.PI / 2 });
    b.cyl(0.8, 0.8, 0.1, M.portland, { x: tx - 3.0, y: 2.1, z: az, rz: Math.PI / 2 }, 12);
  }
  b.solid(tx, zc, 6, tl);
  // benches along the axis
  for (const bx of [x0 + 8, x0 + 16, fx + 11, fx + 19]) for (const s of [-1, 1]) {
    b.box(1.8, 0.08, 0.5, M.timber, { x: bx, y: KERB_H + 0.45, z: zc + s * 2.6 });
    b.box(1.6, 0.45, 0.1, M.dark, { x: bx, y: KERB_H, z: zc + s * 2.6 });
  }
  return { group: b.build("St Patrick's Park"), fountain: { x: fx, z: zc } };
}

function drSteevens(site) {
  // Dr Steevens' Hospital: a courtyard block of ochre render with grey dressings, a slate mansard with dormers and
  // a small cupola; generic massing only (not a hero)
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 9.5;
  b.facade(W, H, D, M.ochre, M.slate, {}, 4, 4.5);
  b.box(W + 0.4, 0.5, D + 0.4, M.portlandSmooth, { y: H });
  b.box(W - 2, 3.2, D - 2, M.slate, { y: H + 0.5 });
  b.cyl(1.2, 1.4, 2.2, M.portlandSmooth, { y: H + 3.7 }, 8);
  b.dome(1.3, M.lead, { y: H + 5.9 });
  b.solid(0, 0, W, D);
  return b.build("Dr Steevens' Hospital");
}

function iveaghPlayCentre(site) {
  // Iveagh Play Centre / Liberties College (1915): three storeys of red brick with Portland pilasters and banding,
  // a shaped central gable with oculus and balustrade, ball finials, and the green copper cupola. Local +z faces
  // Bull Alley and the park.
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 12;
  b.facade(W, H, D, M.iveaghBrick, M.slate, {}, 4, 4);
  b.box(W + 0.4, 0.5, D + 0.4, M.portland, { y: H });
  b.box(W + 0.2, 0.4, D + 0.2, M.portland, { y: 4 });
  b.balustrade(-W / 2, W / 2, H + 0.5, D / 2, M.portland);
  // the central shaped gable
  b.box(9, 4.5, 0.8, M.iveaghBrick, { y: H, z: D / 2 - 0.3 });
  b.prism(9.4, 2.6, 0.9, M.portland, { y: H + 4.5, z: D / 2 - 0.3 });
  b.cyl(1.0, 1.0, 0.15, M.dark, { y: H + 2.3, z: D / 2 + 0.12, rx: Math.PI / 2 }, 16);
  for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(0.35, 8, 6), M.portland, { x: sx * 4.5, y: H + 4.9, z: D / 2 - 0.3 });
  // copper cupola on a drum
  b.cyl(1.6, 1.8, 2.2, M.portland, { y: H + 0.5 }, 12);
  b.dome(1.9, M.copper, { y: H + 2.7 });
  b.cyl(0.15, 0.25, 1.4, M.copper, { y: H + 4.4 }, 8);
  b.solid(0, 0, W, D);
  return b.build('Iveagh Play Centre');
}

// ---------- trees ----------
// is p inside any reserved landmark footprint (rotated rectangles, 2 m margin)?
function inAnyFootprint(p) {
  for (const r of reserved) {
    const c = Math.cos(r.rot || 0), s = Math.sin(r.rot || 0), dx = p.x - r.x, dz = p.z - r.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < r.w / 2 + 2 && Math.abs(lz) < r.d / 2 + 2) return true;
  }
  return false;
}

function buildTrees(scene) {
  const spots = [];
  const scatter = (poly, n, inset = 5) => {
    const inner = insetPolygon(poly, inset);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of inner) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    let tries = 0;
    while (n > 0 && tries++ < n * 20) {
      const p = { x: minX + rand() * (maxX - minX), z: minZ + rand() * (maxZ - minZ) };
      if (!pointInPolygon(p, inner)) continue;
      if (spots.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 30)) continue;
      if (inAnyFootprint(p)) continue; // not through a landmark standing in the grounds
      if (pondAt && (p.x - pondAt.x) ** 2 / 400 + (p.z - pondAt.z) ** 2 / 100 < 1.4) continue;
      spots.push({ ...p, s: 0.9 + rand() * 0.6 });
      n--;
    }
  };
  let pondAt = null;
  for (const pk of parkPolys) {
    if (pk.name === "St Stephen's Green") {
      const c = sites.stephensGreen;
      pondAt = { x: c.x + 10, z: c.z - 18 };
      const arch = fusiliersSite(pk), clearOfArch = (p) => (p.x - arch.x) ** 2 + (p.z - arch.z) ** 2 > 18 * 18;
      // perimeter belt: two staggered rows of big trees, and a band of shrubs just inside the railings
      const shrubs = [];
      for (const [inset, step, jitter, kind] of [[3.4, 3.2, 0.8, 'shrub'], [7, 8, 2, 'tree'], [13, 10, 3, 'tree']]) {
        const ring = insetPolygon(pk.poly, inset);
        for (let k = 0; k < ring.length; k++) {
          const a = ring[k], bb = ring[(k + 1) % ring.length], L = v2.len(v2.sub(bb, a));
          for (let t = rand() * step; t < L; t += step * (0.8 + rand() * 0.4)) {
            const q = v2.lerp(a, bb, t / L), p = { x: q.x + (rand() - 0.5) * jitter, z: q.z + (rand() - 0.5) * jitter };
            if (!clearOfArch(p)) continue;
            if (kind === 'shrub') shrubs.push({ ...p, rot: rand() * 6.28, s: new THREE.Vector3(2 + rand() * 1.6, 1.6 + rand() * 1.4, 2 + rand() * 1.6), c: Math.floor(rand() * 5) });
            else spots.push({ ...p, s: 1.15 + rand() * 0.45 });
          }
        }
      }
      // shrub clumps scattered through the interior lawns
      const inner = insetPolygon(pk.poly, 20);
      for (let i = 0; i < 90; i++) {
        const k = Math.floor(rand() * inner.length), a = inner[k], bb = inner[(k + 1) % inner.length];
        const q = v2.lerp(v2.lerp(a, bb, rand()), { x: c.x, z: c.z }, rand() * 0.8);
        if ((q.x - pondAt.x) ** 2 / 500 + (q.z - pondAt.z) ** 2 / 150 < 1.4) continue;
        shrubs.push({ ...q, rot: rand() * 6.28, s: new THREE.Vector3(1.6 + rand() * 1.5, 1.2 + rand() * 1.2, 1.6 + rand() * 1.5), c: Math.floor(rand() * 5) });
      }
      plantShrubs(scene, shrubs);
      scatter(pk.poly, 110, 18);
    } else if (pk.name === "St Patrick's Park") {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of pk.poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
      pondAt = { x: x0 + (x1 - x0) * 0.45, z: (z0 + z1) / 2 };
      scatter(pk.poly, 40, 4);
      pondAt = null;
    } else scatter(pk.poly, 70);
  }
  pondAt = null;
  for (const cp of campusPolys) {
    // College Park, the eastern part of the campus
    const east = cp.poly.filter((p) => p.x > sites.trinity.x + 110);
    if (east.length >= 3) scatter(east, 25, 6);
  }
  // trees inside Trinity's railings where College Green bends into Nassau Street
  {
    const c = world.nodes.get('CGC');
    for (const [dx, dz] of [[16, -4], [20, 8], [15, 14]]) spots.push({ x: c.x + dx, z: c.z + dz, s: 1.1 });
  }
  // London planes along the south footpath of College Green
  {
    const a = world.nodes.get('CG0'), c = world.nodes.get('CGT'), way = world.ways.find((w) => w.name === 'College Green');
    const d = v2.norm(v2.sub(c, a)), L = v2.len(v2.sub(c, a)), off = way.width / 2 + way.pave - 1.8;
    for (let s = 6; s < L - 12; s += 11) {
      const p = { x: a.x + d.x * s - d.z * off, z: a.z + d.z * s + d.x * off };
      spots.push({ ...p, s: 0.95, street: true }); addBox(p.x, p.z, 0.4, 0.4, 0);
    }
  }
  // London planes along O'Connell Street's median
  const oc = world.ways.find((w) => w.type === 'boulevard');
  for (let k = 1; k < oc.pts.length - 1; k++) {
    const a = oc.pts[k], b = oc.pts[k + 1];
    const L = v2.len(v2.sub(b, a));
    for (let s = 8; s < L - 8; s += 13) {
      const p = v2.lerp(a, b, s / L);
      if (Math.hypot(p.x - sites.spire.x, p.z - sites.spire.z) < 12) continue;
      spots.push({ ...p, s: 0.75, street: true });
      addBox(p.x, p.z, 0.4, 0.4, 0);
    }
  }
  // parks get a mix of species; O'Connell Street's median is lined with London planes
  const item = (p, k) => ({ x: p.x, y: KERB_H, z: p.z, rot: rand() * 6.28, s: p.s * k * (0.9 + rand() * 0.25) });
  plantTrees(scene, spots.filter((p) => !p.street).map((p) => item(p, 0.85)), { plane: 3, lime: 2, chestnut: 3, birch: 2, young: 1 }, rand);
  plantTrees(scene, spots.filter((p) => p.street).map((p) => item(p, 1.05)), { plane: 1 }, rand);
  return spots.length;
}

export function buildLandmarks(scene) {
  const S = sites;
  const groups = [
    spire(S.spire), gpo(S.gpo), oconnellBridge(S.oconnellBridge), trinity(S.trinity),
    bankOfIreland(S.bankOfIreland), customHouse(S.customHouse),
    oconnellMonument(), fusiliersArch(S.stephensGreen.park),
    cityHall(S.cityHall), dublinCastle(extraSites.castle), centralBank(S.centralBank), olympia(extraSites.olympia),
    clockCorner(extraSites.clockCorner), grattanIsland(extraSites.grattan),
    iveaghPlayCentre(extraSites.iveaghPlay),
    merchantsHall(extraSites.merchantsHall), redPub(extraSites.redPub), templeBarSquare(extraSites.tbSquare), templeBarDressing(),
    bewleys(extraSites.bewleys), brownThomas(extraSites.brownThomas), weirAndSons(extraSites.weir), stephensGreenCentre(extraSites.sgCentre), graftonDressing(),
    drSteevens(extraSites.steevens), guinness(S.guinness), jamesGate(extraSites.jamesGate), beckettHarp(S.beckett), convention(S.convention),
    threeArena(S.threeArena), grattanOffice(S.grandCanalSt), grandCanalTheatre(S.grandCanal), grandCanalSquare(S.grandCanal.square), markerHotel(extraSites.marker), gcsOffice(extraSites.gcsOffice),
  ];
  // Phoenix Park: woods, avenue, lamps, walls, heroes and deer (its static meshes join the landmark batch)
  const phoenixPark = buildPark(scene);
  if (phoenixPark) groups.push(phoenixPark.group);
  for (const g of groups) scene.add(g);
  // Heuston Station (Blender hero; the old procedural model if it can't load)
  placeParts(scene, 'heuston', S.heuston, 'Heuston Station').then((g) => { if (!g) scene.add(heuston(S.heuston)); });
  // St Patrick's Cathedral (Blender hero) and its park dressing
  placeParts(scene, 'stpatricks', S.stPatricks, "St Patrick's Cathedral");
  const spPark = parkPolys.find((p) => p.name === "St Patrick's Park");
  if (spPark) scene.add(stPatricksPark(spPark).group);
  // Christ Church: the Blender hero group (falls back to the old procedural model if it can't load)
  placeParts(scene, 'christchurch', S.christChurch, 'Christ Church Cathedral').then((g) => { if (!g) scene.add(christChurch(S.christChurch)); });
  // Ha'penny Bridge: the Blender hero model (falls back to the procedural bridge if it can't load)
  let hapennyHero = null, nightLevel = 0;
  placeHapenny(scene, S.hapenny).then((h) => {
    if (!h) { scene.add(hapenny(S.hapenny)); return; }
    hapennyHero = h; h.setNight(nightLevel);
  });
  for (const g of grounds) {
    const c = Math.cos(g.rot), s = Math.sin(g.rot), hx = g.w / 2, hz = g.d / 2;
    paintArea([[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([lx, lz]) => ({ x: g.x + lx * c + lz * s, z: g.z - lx * s + lz * c })), COLORS.lawn);
  }

  // pond in St Stephen's Green
  const c = S.stephensGreen;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 40), M.water);
  pond.rotation.x = -Math.PI / 2; pond.scale.set(20, 9, 1);
  pond.position.set(c.x + 10, 0.03, c.z - 18);
  const rim = new THREE.Mesh(new THREE.RingGeometry(1, 1.06, 40), M.granite);
  rim.rotation.x = -Math.PI / 2; rim.scale.set(20, 9, 1); rim.position.set(c.x + 10, 0.05, c.z - 18);
  scene.add(pond, rim);

  const trees = buildTrees(scene);
  // floating place labels were removed from the 3D view (landmarks are on the map instead)
  const labels = new THREE.Group();
  return {
    groups, labels, trees, park: phoenixPark,
    setLabels(on) { labels.visible = on; },
    // docklands lighting after dark (0 = day, 1 = night)
    setNight(level) {
      for (const n of neon) n.m.emissiveIntensity = n.day + (n.night - n.day) * level;
      nightLevel = level; if (hapennyHero) hapennyHero.setNight(level);
      setStoneNight(level);
      if (phoenixPark) phoenixPark.setNight(level);
    },
    update(camera) {
      // hide labels that are far away or behind the camera
      for (const sp of labels.children) {
        const d = camera.position.distanceTo(sp.position);
        sp.material.opacity = THREE.MathUtils.clamp(1.4 - d / 900, 0.25, 1);
      }
    },
  };
}

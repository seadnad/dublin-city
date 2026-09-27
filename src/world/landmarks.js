// Hand-modelled landmarks (low poly, merged per material), park trees, and floating labels.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, v2, pointInPolygon, insetPolygon } from './geo.js';
import { sites, reserved, grounds } from './sites.js';
import { parkPolys, campusPolys, stoneTex, WATER_Y, paintArea, COLORS } from './ground.js';
import { rng, makeLabelTexture, makeStoneTexture } from './textures.js';
import { addBox } from '../game/collision.js';
import { chunkedInstances } from './chunks.js';
import { plantTrees } from './trees.js';
import { KERB_H } from './roads.js';

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
  granite: new THREE.MeshStandardMaterial({ color: 0x9d9a93, map: stoneTex, roughness: 0.9 }),
  copper: new THREE.MeshStandardMaterial({ color: 0x5e9c86, roughness: 0.55, metalness: 0.35 }),
  slate: new THREE.MeshStandardMaterial({ color: 0x4b5057, roughness: 0.7 }),
  lead: new THREE.MeshStandardMaterial({ color: 0x6b7075, roughness: 0.6, metalness: 0.3 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xd6dadd, roughness: 0.18, metalness: 1.0 }),
  iron: new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.45, metalness: 0.3 }),
  ironLace: new THREE.MeshStandardMaterial({ map: ironTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.6 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x4f5b47, roughness: 0.5, metalness: 0.6 }),
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
    this.cyl(r * 0.85, r, h - 1.0, mat, { x, y: y + 0.45, z }, 10);
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

function gpo(site) {
  const b = new Builder(site);
  const W = site.w, D = site.d, H = 17;
  b.facade(W, H, D, M.facade, M.lead, { z: 0 });
  b.box(W + 0.6, 0.9, D + 0.6, M.portland, { y: H - 0.2 }); // cornice
  b.balustrade(-W / 2, W / 2, H + 0.7, D / 2, M.portland);
  b.box(W, 1.2, D - 2, M.lead, { y: H + 0.7 });
  // hexastyle Ionic portico projecting over the footpath
  const pz = D / 2 + 3.4, colH = 12.5, pd = 5.2;
  b.box(24, 0.6, pd, M.granite, { z: D / 2 + pd / 2 });
  for (let i = 0; i < 6; i++) {
    const x = -10 + i * 4;
    b.column(x, pz, colH, 0.72, M.portland, 0.6);
    b.solid(x, pz, 1.9, 1.9);
  }
  b.box(24.5, 2.0, pd + 0.3, M.portland, { y: colH + 0.6, z: D / 2 + pd / 2 });
  b.pediment(24.5, 4.2, pd, M.portland, { y: colH + 2.6, z: D / 2 + pd / 2 });
  b.statue(0, colH + 6.6, pz, 1.3, M.portland);
  b.statue(-11, colH + 2.6, pz, 1.2, M.portland);
  b.statue(11, colH + 2.6, pz, 1.2, M.portland);
  // flagpole with the tricolour
  b.cyl(0.08, 0.1, 10, M.iron, { x: 0, y: H + 1.2, z: 0 }, 6);
  b.add(new THREE.PlaneGeometry(3.6, 1.8), M.flag, { x: 1.85, y: H + 10, z: 0 });
  b.solid(0, 0, W, D);
  return b.build('GPO');
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
  b.facade(W, 15, D, M.facade, M.slate, { y: 0 });
  b.box(W + 0.5, 0.8, D + 0.5, M.portland, { y: 15 });
  b.balustrade(-W / 2, W / 2, 15.8, D / 2, M.portland);
  // end pavilions
  for (const sx of [-1, 1]) {
    b.facade(8, 17, D + 1.6, M.facade, M.slate, { x: sx * (W / 2 - 4) });
    for (let k = 0; k < 2; k++) b.column(sx * (W / 2 - 5.5 + k * 3), D / 2 + 1.1, 10, 0.45, M.portland, 5);
  }
  // central pedimented frontispiece with the arched front gate
  const cz = D / 2 + 1.2;
  b.box(16, 5, 2.4, M.granite, { z: cz - 0.2 }); // rusticated base
  b.facade(16, 17, 2.4, M.portland, M.portland, { z: cz - 0.2 });
  b.box(4.4, 5, 0.3, M.dark, { z: D / 2 + 2.45 }); // gate opening
  b.cyl(2.2, 2.2, 0.3, M.dark, { y: 5, z: D / 2 + 2.45, rx: Math.PI / 2 }, 16);
  for (const x of [-6, -2.2, 2.2, 6]) b.column(x, cz + 1.5, 11, 0.5, M.portland, 5.2);
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
  const synod = reserved[reserved.length - 1];
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

function fusiliersArch(park) {
  // NW corner of St Stephen's Green, facing Grafton Street
  const corner = world.nodes.get('SGNW');
  let best = park.poly[0], bd = Infinity;
  for (const p of park.poly) { const d = (p.x - corner.x) ** 2 + (p.z - corner.z) ** 2; if (d < bd) { bd = d; best = p; } }
  const g = world.nodes.get('GR2');
  const dir = v2.norm(v2.sub(corner, g));
  const site = { x: best.x + dir.x * 5, z: best.z + dir.z * 5, rot: Math.atan2(-dir.x, -dir.z) };
  const b = new Builder(site);
  b.archWall(11, 10, 3, 5, 7.5, M.granite);
  b.box(11.6, 2.2, 3.6, M.granite, { y: 10 });
  for (const sx of [-1, 1]) { b.column(sx * 4.3, 1.8, 8, 0.4, M.granite, 0); }
  b.solid(-4, 0, 3, 3); b.solid(4, 0, 3, 3);
  return b.build("Fusiliers' Arch");
}

// ---------- trees ----------
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
      if (pondAt && (p.x - pondAt.x) ** 2 / 400 + (p.z - pondAt.z) ** 2 / 100 < 1.4) continue;
      spots.push({ ...p, s: 0.8 + rand() * 0.6 });
      n--;
    }
  };
  let pondAt = null;
  for (const pk of parkPolys) {
    if (pk.name === "St Stephen's Green") {
      const c = sites.stephensGreen;
      pondAt = { x: c.x + 10, z: c.z - 18 };
      scatter(pk.poly, 150);
    } else scatter(pk.poly, 70);
  }
  pondAt = null;
  for (const cp of campusPolys) {
    // College Park, the eastern part of the campus
    const east = cp.poly.filter((p) => p.x > sites.trinity.x + 110);
    if (east.length >= 3) scatter(east, 25, 6);
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

// ---------- labels ----------
function buildLabels(scene) {
  const group = new THREE.Group();
  group.name = 'labels';
  for (const s of Object.values(sites)) {
    const { texture, aspect } = makeLabelTexture(s.name);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true, fog: false });
    const sp = new THREE.Sprite(mat);
    sp.center.set(0.5, 0);
    sp.scale.set(0.05 * aspect, 0.05, 1);
    sp.position.set(s.x, s.labelY, s.z);
    sp.renderOrder = 100;
    sp.userData.site = s;
    group.add(sp);
  }
  scene.add(group);
  return group;
}

export function buildLandmarks(scene) {
  const S = sites;
  const groups = [
    spire(S.spire), gpo(S.gpo), oconnellBridge(S.oconnellBridge), hapenny(S.hapenny), trinity(S.trinity),
    bankOfIreland(S.bankOfIreland), christChurch(S.christChurch), customHouse(S.customHouse),
    oconnellMonument(), fusiliersArch(S.stephensGreen.park),
  ];
  for (const g of groups) scene.add(g);
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
  const labels = buildLabels(scene);
  return {
    groups, labels, trees,
    setLabels(on) { labels.visible = on; },
    update(camera) {
      // hide labels that are far away or behind the camera
      for (const sp of labels.children) {
        const d = camera.position.distanceTo(sp.position);
        sp.material.opacity = THREE.MathUtils.clamp(1.4 - d / 900, 0.25, 1);
      }
    },
  };
}

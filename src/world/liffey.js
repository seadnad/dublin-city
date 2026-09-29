// The Liffey's riverside landmarks (docs/research/liffey-quays.md): the Liffey Boardwalk off the north quay walls,
// the Millennium and Seán O'Casey footbridges, Rowan Gillespie's Famine, the Jeanie Johnston and the CHQ building.
// Procedural, merged per material by the landmark Builder (and then by the static batch), so the whole set costs a
// handful of draw calls. Placement: src/world/liffeysites.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v2 } from './geo.js';
import { WATER_Y } from './ground.js';
import { KERB_H } from './roads.js';
import { addBox } from '../game/collision.js';
import { addStatue } from './statues.js';
import { addReflections } from '../render/reflect.js';
import { bankAt, FAMINE, SHIP, CHQ, MILLENNIUM, OCASEY, BOARDWALK } from './liffeysites.js';

// ---------- textures ----------
function canvasTex(w, h, draw, { repeat = true, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const rnd = (() => { let s = 91; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
// weathered hardwood boards laid across the walk: one tile is 1.2 m of boardwalk (8 boards)
const plankTex = () => canvasTex(256, 32, (ctx, w, h) => {
  for (let i = 0; i < 8; i++) {
    const k = 0.86 + rnd() * 0.22;
    ctx.fillStyle = `rgb(${Math.round(128 * k)},${Math.round(106 * k)},${Math.round(84 * k)})`;
    ctx.fillRect(i * 32, 0, 32, h);
    for (let g = 0; g < 6; g++) { ctx.fillStyle = `rgba(60,45,32,${0.08 + rnd() * 0.08})`; ctx.fillRect(i * 32 + rnd() * 30, 0, 1, h); }
    ctx.fillStyle = 'rgba(30,22,16,0.8)'; ctx.fillRect(i * 32 + 30, 0, 2, h);
  }
});
// steel mesh infill of a balustrade: a 0.5 m square tile, transparent between the wires (alpha-tested)
const meshTex = () => canvasTex(64, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#cfd3d4';
  for (let i = 0; i < w; i += 8) { ctx.fillRect(i, 0, 2, h); }
  ctx.fillRect(0, 0, w, 3); ctx.fillRect(0, h - 3, w, 3);
});
// the Jeanie Johnston's hull: black, a white band with painted black gun ports every 1.35 m (one tile), a varnished
// rail on top, antifouling below the waterline. v runs 0 (3 m below the rail) to 1 (the rail's top).
const hullTex = () => canvasTex(64, 128, (ctx, w, h) => {
  ctx.fillStyle = '#161616'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(0, 0, w, 6);             // cap rail
  ctx.fillStyle = '#e9e5da'; ctx.fillRect(0, 24, w, 22);            // the white band
  ctx.fillStyle = '#141414'; ctx.fillRect(22, 28, 22, 15);          // a painted port
  ctx.fillStyle = '#5c2a1f'; ctx.fillRect(0, h - 10, w, 10);        // antifouling (only just shows at the waterline)
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; ctx.fillRect(rnd() * w, 46 + rnd() * 70, 6, 1); }
}, { repeat: false });
const hullTexture = () => { const t = hullTex(); t.wrapS = THREE.RepeatWrapping; return t; };
// CHQ: yellow-brown brick with round-headed windows, one bay 5 m x 6.5 m (refs/liffey-quays 24-26)
const chqTex = () => canvasTex(128, 166, (ctx, w, h) => {
  ctx.fillStyle = '#9a7a52'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { ctx.fillStyle = 'rgba(60,40,24,0.18)'; ctx.fillRect(0, y, w, 1); }
  for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(${130 + rnd() * 60},${95 + rnd() * 40},60,0.15)`; ctx.fillRect(rnd() * w, rnd() * h, 7, 2); }
  ctx.fillStyle = '#6d6b66'; ctx.fillRect(0, h - 22, w, 22);        // calp limestone plinth
  ctx.fillStyle = '#20262a';
  ctx.beginPath(); ctx.moveTo(46, h - 26); ctx.lineTo(46, 70); ctx.arc(64, 70, 18, Math.PI, 0); ctx.lineTo(82, h - 26); ctx.fill();
  ctx.fillStyle = '#b9ab8e'; ctx.fillRect(40, h - 30, 48, 5);
});

// ---------- geometry helpers ----------
const _up = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4();
// a box of cross-section (w, h) from point a to point b (THREE.Vector3s), its h axis kept as close to `up` as it can
function beam(a, b, w, h = w, up = _up) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.BoxGeometry(w, h, L);
  const z = d.clone().normalize(), ref = Math.abs(z.dot(up)) > 0.95 ? new THREE.Vector3(1, 0, 0) : up;
  const x = new THREE.Vector3().crossVectors(ref, z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
  _m.makeBasis(x, y, z).setPosition(a.clone().add(b).multiplyScalar(0.5));
  return g.applyMatrix4(_m);
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// a strip of quads between two polylines of Vector3s (same length); uv u from `us`, v 0 on a, 1 on b
function strip(A, B, us, flip = false) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i < A.length; i++) {
    pos.push(A[i].x, A[i].y, A[i].z, B[i].x, B[i].y, B[i].z);
    uv.push(us[i], 0, us[i], 1);
    if (i) { const k = i * 2; flip ? idx.push(k - 2, k, k - 1, k, k + 1, k - 1) : idx.push(k - 2, k - 1, k, k, k - 1, k + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Returns the groups (the caller adds them to the scene and the static batch) and a night hook.
export function buildLiffey({ Builder, M, glow, waterGlowSources }) {
  const mats = {
    // (after dark the boards pick up a little of the lamps' warm light: an emissive trace of their own texture)
    planks: new THREE.MeshStandardMaterial({ map: null, roughness: 0.85, emissive: 0xffc890, emissiveIntensity: 0 }),
    boardSteel: new THREE.MeshStandardMaterial({ color: 0x6c7276, roughness: 0.5, metalness: 0.6 }),
    stainless: addReflections(new THREE.MeshStandardMaterial({ color: 0xc9cdcf, roughness: 0.3, metalness: 0.85 }), 0.6),
    glassRail: new THREE.MeshStandardMaterial({ color: 0xbfd6d4, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    mesh: new THREE.MeshStandardMaterial({ map: meshTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.5 }),
    greySteel: new THREE.MeshStandardMaterial({ color: 0xb4b9bb, roughness: 0.45, metalness: 0.35 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x4a5055, roughness: 0.55, metalness: 0.4 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x9c9a94, roughness: 0.9 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x5a6064, roughness: 0.5, metalness: 0.6 }),
    hull: new THREE.MeshStandardMaterial({ map: null, roughness: 0.55, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0 }),
    shipDeck: new THREE.MeshStandardMaterial({ color: 0x9b8262, roughness: 0.85 }),
    varnish: new THREE.MeshStandardMaterial({ color: 0x74502e, roughness: 0.5 }),
    spar: new THREE.MeshStandardMaterial({ color: 0xa4855c, roughness: 0.6 }),
    sail: new THREE.MeshStandardMaterial({ color: 0xe6dfcc, roughness: 0.9 }),
    pontoon: new THREE.MeshStandardMaterial({ color: 0x7c8084, roughness: 0.8 }),
    chq: new THREE.MeshStandardMaterial({ map: chqTex(), roughness: 0.9 }),
    chqRoof: new THREE.MeshStandardMaterial({ color: 0x55595d, roughness: 0.6, metalness: 0.2 }),
    // night lights
    boardLamp: glow(0xffe0b0, 0.05, 2.6),
    bridgeLamp: glow(0xdfe8ff, 0.05, 2.4),
    handLed: glow(0xcfe0ff, 0, 1.4),
    shipLamp: glow(0xffd08a, 0.05, 2.8),
    // CHQ's glazed front: dark reflective glass by day, the lit hall behind it after dark
    chqGlass: addReflections(new THREE.MeshStandardMaterial({ color: 0x4d6670, roughness: 0.08, metalness: 0.6, emissive: 0xffdcae, emissiveIntensity: 0 }), 0.9),
  };
  mats.hull.map = mats.hull.emissiveMap = hullTexture();
  mats.planks.map = mats.planks.emissiveMap = plankTex();
  const glass = M.glass;
  const nightMats = [[mats.planks, 0.16]]; // [material, emissive intensity at full night]
  const groups = [];

  // ================= the Liffey Boardwalk =================
  {
    const b = new Builder({ x: 0, z: 0, rot: 0 });
    const W = BOARDWALK.W, top = KERB_H - 0.22, face = 0.35; // the deck's top; the parapet's outer face off the bank line
    const glassPanels = [];
    let lampN = 0;
    for (const [x0, x1] of BOARDWALK.runs) {
      const n = Math.max(2, Math.ceil((x1 - x0) / 1.0));
      const P = [];
      for (let i = 0; i <= n; i++) { const q = bankAt('north', x0 + ((x1 - x0) * i) / n); if (q) P.push(q); }
      if (P.length < 2) continue;
      const at = (q, off, y) => V(q.x + q.n.x * off, y, q.z + q.n.z * off);
      const us = []; let s = 0;
      P.forEach((q, i) => { if (i) s += v2.len(v2.sub(q, P[i - 1])); us.push(s / 1.2); });
      const inner = P.map((q) => at(q, face, top)), outer = P.map((q) => at(q, face + W, top));
      // deck boards (u along the walk), the steel edge beam and the underside
      const deck = strip(inner, outer, us);
      { const uv = deck.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * W / 1.2); }
      b.add(deck, mats.planks);
      b.add(strip(outer, P.map((q) => at(q, face + W, top - 0.5)), us), mats.boardSteel);
      b.add(strip(P.map((q) => at(q, face, top - 0.35)), P.map((q) => at(q, face + W, top - 0.35)), us, true), mats.boardSteel);
      // glass balustrade on the water side: posts every 1.8 m, a stainless handrail, glass between
      const rail = P.map((q) => at(q, face + W - 0.08, top + 1.05));
      for (let i = 1; i < rail.length; i++) b.add(beam(rail[i - 1], rail[i], 0.07, 0.07), mats.stainless);
      glassPanels.push(strip(P.map((q) => at(q, face + W - 0.08, top + 0.12)), P.map((q) => at(q, face + W - 0.08, top + 0.98)), us));
      let run = 0;
      for (let i = 0; i < P.length; i++) {
        if (i) run += v2.len(v2.sub(P[i], P[i - 1]));
        const q = P[i], along = Math.atan2(q.t.x, q.t.z);
        if (i % 2 === 0) b.add(beam(at(q, face + W - 0.08, top), at(q, face + W - 0.08, top + 1.05), 0.06, 0.06), mats.stainless);
        // cantilever brackets down to the quay wall every 3 m
        if (i % 3 === 1) b.add(beam(at(q, face + W - 0.2, top - 0.45), at(q, 0.05, WATER_Y + 1.2), 0.18, 0.12), mats.boardSteel);
        if (i === 0 || i === P.length - 1) continue;
        const k = i % 32;
        if (k === 8 || k === 24) { // a lamp on the rail every 16 m
          const base = at(q, face + W - 0.3, top), head = at(q, face + W - 0.3, top + 4.6);
          b.add(beam(base, head, 0.12, 0.12), mats.boardSteel);
          b.add(new THREE.CylinderGeometry(0.22, 0.14, 0.42, 8), mats.boardSteel, { x: head.x, y: head.y + 0.02, z: head.z });
          b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 8), mats.boardLamp, { x: head.x, y: head.y - 0.3, z: head.z });
          if (lampN++ % 2 === 0) waterGlowSources.push({ x: head.x + q.n.x * 1.2, z: head.z + q.n.z * 1.2, y: WATER_Y + 0.05, color: 0xffd9a8, width: 2.2, length: 24 });
        } else if (k === 14 || k === 29) { // a bench against the parapet, facing the river
          const c = at(q, face + 0.55, top);
          b.box(1.9, 0.07, 0.48, M.timber, { x: c.x, y: top + 0.42, z: c.z, ry: along + Math.PI / 2 });
          b.box(1.9, 0.42, 0.06, M.timber, { x: c.x - q.n.x * 0.22, y: top + 0.52, z: c.z - q.n.z * 0.22, ry: along + Math.PI / 2 });
          for (const e of [-0.75, 0.75]) b.box(0.06, 0.42, 0.44, mats.boardSteel, { x: c.x + q.t.x * e, y: top, z: c.z + q.t.z * e, ry: along + Math.PI / 2 });
        } else if (k === 19 || k === 3) { // a steel planter
          const c = at(q, face + 0.6, top);
          b.box(1.5, 0.75, 0.75, mats.boardSteel, { x: c.x, y: top, z: c.z, ry: along + Math.PI / 2 });
          b.add(new THREE.SphereGeometry(0.55, 7, 5), M.planting, { x: c.x, y: top + 0.8, z: c.z, sx: 1.25, sy: 0.55, sz: 0.6, ry: along + Math.PI / 2 });
        }
      }
    }
    const g = b.build('Liffey Boardwalk');
    const gl = new THREE.Mesh(mergeGeometries(glassPanels), mats.glassRail);
    gl.renderOrder = 1;
    g.add(gl);
    groups.push(g);
  }

  // ================= the footbridges =================
  // shared balustrade: posts, a handrail and mesh infill along both edges of a deck (local z along the span)
  const balustrade = (b, halfW, z0, z1, deckY, { post = mats.stainless, h = 1.15, step = 1.5, led = null } = {}) => {
    for (const sx of [-1, 1]) {
      const x = sx * halfW, zs = [];
      for (let z = z0; z <= z1 + 1e-3; z += (z1 - z0) / Math.ceil((z1 - z0) / step)) zs.push(z);
      const hr = zs.map((z) => V(x, deckY(z) + h, z));
      for (let i = 1; i < hr.length; i++) b.add(beam(hr[i - 1], hr[i], 0.08, 0.06), post);
      for (const z of zs) b.add(beam(V(x, deckY(z), z), V(x, deckY(z) + h, z), 0.07, 0.07), post);
      b.add(strip(zs.map((z) => V(x, deckY(z) + 0.1, z)), zs.map((z) => V(x, deckY(z) + h - 0.05, z)), zs.map((z) => (z - z0) / 0.5)), mats.mesh);
      if (led) for (let i = 1; i < hr.length; i++) b.add(beam(hr[i - 1].clone().add(V(-sx * 0.05, -0.06, 0)), hr[i].clone().add(V(-sx * 0.05, -0.06, 0)), 0.03, 0.03), led);
    }
  };
  // a site-local point to world
  const toWorld = (site, lx, lz) => { const c = Math.cos(site.rot), s = Math.sin(site.rot); return { x: site.x + lx * c + lz * s, z: site.z - lx * s + lz * c }; };

  // ---- the Millennium Bridge (1999): a slender steel portal truss on concrete haunches, 41 m span, 4 m wide ----
  {
    const S = MILLENNIUM, b = new Builder(S), L = S.span + 1.0, hw = 2.0;
    const deckY = (z) => KERB_H + 0.42 * (1 - (2 * z / L) ** 2);
    const depth = (z) => 0.32 + 1.95 * Math.pow(Math.abs(2 * z / L), 2.4); // the truss deepens into the haunches
    const N = 22, zs = Array.from({ length: N + 1 }, (_, i) => -L / 2 + (L * i) / N);
    // deck plate and its steel edge
    b.add(strip(zs.map((z) => V(-hw, deckY(z), z)), zs.map((z) => V(hw, deckY(z), z)), zs.map((z) => z / 2), true), mats.greySteel);
    b.add(strip(zs.map((z) => V(-hw, deckY(z) - 0.18, z)), zs.map((z) => V(hw, deckY(z) - 0.18, z)), zs.map((z) => z / 2)), mats.greySteel);
    for (const sx of [-1, 1]) {
      const x = sx * (hw - 0.1);
      const topC = zs.map((z) => V(x, deckY(z) - 0.12, z)), botC = zs.map((z) => V(x, deckY(z) - depth(z), z));
      for (let i = 1; i <= N; i++) {
        b.add(beam(topC[i - 1], topC[i], 0.14, 0.2), mats.greySteel);
        b.add(beam(botC[i - 1], botC[i], 0.16, 0.16), mats.greySteel);
        b.add(beam(i % 2 ? topC[i - 1] : botC[i - 1], i % 2 ? botC[i] : topC[i], 0.08, 0.08), mats.greySteel); // Warren web
      }
      b.add(beam(topC[N], botC[N], 0.1, 0.1), mats.greySteel); b.add(beam(topC[0], botC[0], 0.1, 0.1), mats.greySteel);
    }
    for (let i = 0; i <= N; i += 2) b.add(beam(V(-hw + 0.1, deckY(zs[i]) - depth(zs[i]), zs[i]), V(hw - 0.1, deckY(zs[i]) - depth(zs[i]), zs[i]), 0.08, 0.08), mats.greySteel);
    balustrade(b, hw, -L / 2, L / 2, deckY, { post: mats.greySteel, step: 1.8 });
    // the concrete haunches it rests on, set into the quay walls
    for (const sz of [-1, 1]) b.box(hw * 2 + 1.2, 2.5, 1.6, mats.concrete, { y: KERB_H - 2.7, z: sz * (L / 2 + 0.3) });
    // tall lamp standards with saucer heads at both landings (ref 16)
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      const x = sx * (hw + 0.7), z = sz * (L / 2 + 1.6);
      b.cyl(0.07, 0.11, 7, mats.stainless, { x, y: KERB_H, z }, 8);
      b.cyl(0.45, 0.06, 0.18, mats.stainless, { x, y: KERB_H + 6.6, z }, 12);
      b.cyl(0.4, 0.4, 0.05, mats.bridgeLamp, { x, y: KERB_H + 6.58, z }, 12);
      const p = toWorld(S, x, z); addBox(p.x, p.z, 0.15, 0.15, 0);
    }
    for (const t of [-0.3, 0.3]) waterGlowSources.push({ ...toWorld(S, 0, t * L), y: WATER_Y + 0.05, color: 0xdfe8ff, width: 3.5, length: 30 });
    groups.push(b.build('Millennium Bridge'));
  }

  // ---- the Seán O'Casey Bridge (2005): a cable-stayed swing bridge, two balanced arms pivoting on piers in the river ----
  {
    const S = OCASEY, b = new Builder(S), L = S.span + 1.0, hw = 2.3;
    const deckY = (z) => KERB_H + 0.55 * (1 - (2 * z / L) ** 2);
    const N = 30, zs = Array.from({ length: N + 1 }, (_, i) => -L / 2 + (L * i) / N);
    b.add(strip(zs.map((z) => V(-hw, deckY(z), z)), zs.map((z) => V(hw, deckY(z), z)), zs.map((z) => z / 2), true), mats.greySteel);
    // the steel box girder: a flat soffit with a round tube spine beneath it
    b.add(strip(zs.map((z) => V(-hw, deckY(z) - 0.3, z)), zs.map((z) => V(hw, deckY(z) - 0.3, z)), zs.map((z) => z / 2)), mats.darkSteel);
    for (const sx of [-1, 1]) b.add(strip(zs.map((z) => V(sx * hw, deckY(z), z)), zs.map((z) => V(sx * hw, deckY(z) - 0.3, z)), zs.map((z) => z / 2), sx > 0), mats.greySteel);
    const spine = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zs.map((z) => V(0, deckY(z) - 0.62, z))), 30, 0.42, 8);
    b.add(spine, mats.darkSteel);
    balustrade(b, hw, -L / 2, L / 2, deckY, { led: mats.handLed, step: 1.6 });
    // the two piers and their pivots; the V of struts on each side of the deck, with stays fanning from the tips
    for (const zp of [-0.25 * L, 0.25 * L]) {
      b.cyl(2.3, 2.5, 1.4 + (-1.2 - WATER_Y), mats.concrete, { y: WATER_Y - 1.4, z: zp }, 16);
      b.cyl(1.0, 1.1, 0.6, mats.darkSteel, { y: -1.25, z: zp }, 12);
      for (const sx of [-1, 1]) {
        const base = V(sx * (hw + 0.35), deckY(zp) - 1.3, zp);
        for (const dir of [-1, 1]) {
          const tip = V(sx * (hw + 0.55), deckY(zp) + 4.2, zp + dir * 8.5);
          b.add(beam(base, tip, 0.45, 0.32), mats.greySteel);
          for (const f of [0.35, 0.62, 0.9]) {
            const zd = zp + dir * (8.5 + f * 9);
            if (Math.abs(zd) > L / 2 - 1) continue;
            b.add(beam(tip, V(sx * hw, deckY(zd) + 0.2, zd), 0.05, 0.05), mats.cable);
          }
          b.add(beam(tip, V(sx * hw, deckY(zp) + 0.2, zp + dir * 2.5), 0.05, 0.05), mats.cable);
        }
      }
    }
    for (const t of [-0.25, 0, 0.25]) waterGlowSources.push({ ...toWorld(S, 0, t * L), y: WATER_Y + 0.05, color: 0xcfe0ff, width: 3, length: 34 });
    groups.push(b.build("Seán O'Casey Bridge"));
  }

  // ================= the Famine (Rowan Gillespie, 1997) =================
  {
    const b = new Builder({ x: 0, z: 0, rot: 0 });
    // the cobbled strip the figures stand on, between the quay footpath and the parapet
    const P = [];
    for (let x = FAMINE.x0; x <= FAMINE.x1 + 1e-3; x += 1.5) P.push(bankAt('north', x));
    const setts = strip(P.map((q) => V(q.x - q.n.x * 0.4, KERB_H + 0.012, q.z - q.n.z * 0.4)), P.map((q) => V(q.x - q.n.x * 3.1, KERB_H + 0.012, q.z - q.n.z * 3.1)), P.map((_, i) => i * 1.5 / 2), true);
    { const uv = setts.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 2.7 / 2); }
    b.add(setts, M.granite);
    for (const f of FAMINE.figs) {
      addStatue({ body: f.body, x: f.x, z: f.z, y: KERB_H + 0.03, rot: f.rot, height: f.height, finish: 'famineBronze' });
      const dog = f.body === 'famine_dog';
      b.cyl(dog ? 0.32 : 0.28, dog ? 0.34 : 0.3, 0.035, M.bronze, { x: f.x, y: KERB_H, z: f.z }, 9); // the thin bronze base plates
      addBox(f.x, f.z, dog ? 0.14 : 0.2, dog ? 0.42 : 0.2, f.rot);
      // the in-ground uplighter in front of each figure (they glow after dark)
      b.cyl(0.1, 0.1, 0.02, mats.boardLamp, { x: f.x + Math.sin(f.rot) * 0.55, y: KERB_H, z: f.z + Math.cos(f.rot) * 0.55 }, 8);
    }
    groups.push(b.build('Famine'));
  }

  // ================= the Jeanie Johnston =================
  {
    const S = SHIP, b = new Builder(S), L = S.L, B = S.B, k = 0.75;
    const wl = WATER_Y;
    // stations from the stern (s 0) to the bow (s 1); half-beam and the rail's height above the water
    const hb = (s) => (B / 2) * (s < 0.22 ? 0.78 + 0.22 * Math.sqrt(s / 0.22) : s <= 0.58 ? 1 : Math.sqrt(Math.max(0, 1 - ((s - 0.58) / 0.42) ** 1.7)));
    const rail = (s) => 2.5 + 0.75 * Math.max(0, (s - 0.5) / 0.5) ** 2 + 0.35 * Math.max(0, (0.3 - s) / 0.3) ** 2;
    const deck = (s) => rail(s) - 0.85;
    const zOf = (s) => -L / 2 + s * L;
    // the section: (across, height) from the keel to the rail, scaled by the station's half-beam
    const SEC = [[0.0, -2.4], [0.5, -2.2], [0.82, -1.5], [0.97, -0.6], [1.0, 0.6], [0.99, 1.0]];
    const NS = 30, cols = [];
    for (let i = 0; i <= NS; i++) {
      const s = i / NS, z = zOf(s), h = hb(s), r = rail(s);
      const half = SEC.map(([a, y], j) => V(a * Math.max(h, 0.04), wl + (j === SEC.length - 1 ? r : Math.min(y, r - 0.4)), z));
      cols.push([...half.slice().reverse().map((p) => V(-p.x, p.y, p.z)), ...half.slice(1)]);
    }
    const M_ = cols[0].length, pos = [], uv = [], idx = [];
    cols.forEach((c, i) => {
      const r = rail(i / NS);
      c.forEach((p) => { pos.push(p.x, p.y, p.z); uv.push(p.z / 1.35, 1 + (p.y - wl - r) / 3.0); });
      if (i) for (let j = 0; j + 1 < M_; j++) { const a = (i - 1) * M_ + j, bb = i * M_ + j; idx.push(a, bb, a + 1, a + 1, bb, bb + 1); }
    });
    const hull = new THREE.BufferGeometry();
    hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    hull.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    hull.setIndex(idx); hull.computeVertexNormals();
    b.add(hull, mats.hull);
    // the transom
    { const c = cols[0], sh = new THREE.Shape(c.map((p) => new THREE.Vector2(p.x, p.y))); b.add(new THREE.ShapeGeometry(sh), M.dark, { z: zOf(0) }); }
    // the deck: a strip inside the bulwarks following the sheer
    const ds = Array.from({ length: NS + 1 }, (_, i) => i / NS).filter((s) => s < 0.985);
    b.add(strip(ds.map((s) => V(-hb(s) + 0.12, wl + deck(s), zOf(s))), ds.map((s) => V(hb(s) - 0.12, wl + deck(s), zOf(s))), ds.map((s) => s * 10), true), mats.shipDeck);
    // deckhouses, hatches and the wheel
    for (const [s, w, h, len] of [[0.13, 3.4, 1.7, 3.6], [0.4, 2.6, 1.5, 4.2], [0.62, 2.0, 0.9, 2.0], [0.83, 1.6, 0.8, 1.6]]) {
      b.box(w, h, len, mats.varnish, { y: wl + deck(s), z: zOf(s) });
      b.box(w + 0.2, 0.1, len + 0.2, mats.shipDeck, { y: wl + deck(s) + h, z: zOf(s) });
    }
    b.cyl(0.45, 0.45, 0.08, mats.varnish, { y: wl + deck(0.06) + 1.1, z: zOf(0.06), rx: Math.PI / 2 }, 10);
    // masts: fore, main and mizzen (from the bow), heights above the water at 0.75 scale
    const masts = [{ s: 0.72, h: 20.5 }, { s: 0.47, h: 21.5 }, { s: 0.21, h: 16.5 }].map((m) => ({ ...m, z: zOf(m.s), y0: wl + deck(m.s) }));
    const rig = [];
    const line = (a, c) => rig.push(a.x, a.y, a.z, c.x, c.y, c.z);
    masts.forEach((m, mi) => {
      const top = wl + m.h, H = top - m.y0;
      b.add(beam(V(0, m.y0, m.z), V(0, m.y0 + H * 0.45, m.z), 0.44, 0.44), mats.spar);            // lower mast
      b.add(beam(V(0, m.y0 + H * 0.4, m.z), V(0, m.y0 + H * 0.75, m.z), 0.3, 0.3), mats.spar);     // topmast
      b.add(beam(V(0, m.y0 + H * 0.72, m.z), V(0, top, m.z), 0.17, 0.17), mats.spar);             // topgallant
      b.box(1.9, 0.12, 1.3, mats.varnish, { y: m.y0 + H * 0.44, z: m.z });                          // the top
      b.box(1.3, 0.08, 0.3, mats.varnish, { y: m.y0 + H * 0.74, z: m.z });                          // crosstrees
      // shrouds to the channels at the rail, and the topmast shrouds from the crosstrees
      const s0 = m.s, rw = hb(s0) + 0.15;
      for (const sx of [-1, 1]) for (const dz of [-1.2, -0.4, 0.4]) {
        line(V(sx * 0.2, m.y0 + H * 0.44, m.z), V(sx * rw, wl + rail(s0) - 0.2, m.z + dz * k));
        line(V(sx * 0.9, m.y0 + H * 0.44, m.z), V(sx * 0.15, m.y0 + H * 0.74, m.z));
        line(V(sx * 0.6, m.y0 + H * 0.74, m.z), V(sx * 0.1, top - 0.6, m.z));
      }
      // backstays
      for (const sx of [-1, 1]) line(V(0, top - 0.8, m.z), V(sx * (hb(s0 - 0.08) + 0.1), wl + rail(s0 - 0.08), zOf(s0 - 0.08)));
      if (mi < 2) {
        // square yards with their sails furled on them
        const lens = [12, 10.6, 9.2, 7.2, 5.4], hs = [0.36, 0.5, 0.62, 0.76, 0.9];
        lens.forEach((len, j) => {
          const y = m.y0 + H * hs[j];
          b.add(beam(V(-len / 2, y, m.z), V(len / 2, y, m.z), 0.16, 0.16), mats.spar);
          b.add(new THREE.CylinderGeometry(0.2, 0.2, len * 0.9, 7), mats.sail, { y: y - 0.17, z: m.z + 0.05, rz: Math.PI / 2 });
          line(V(-len / 2 + 0.2, y, m.z), V(0, y + H * 0.11, m.z)); line(V(len / 2 - 0.2, y, m.z), V(0, y + H * 0.11, m.z)); // lifts
        });
      } else {
        // the mizzen: gaff and boom, the spanker furled on the boom
        const g0 = V(0, m.y0 + H * 0.5, m.z), g1 = V(0, m.y0 + H * 0.5 + 3.2, m.z - 5.2);
        b.add(beam(g0, g1, 0.14, 0.14), mats.spar);
        const b0 = V(0, m.y0 + 1.6, m.z), b1 = V(0, m.y0 + 1.9, zOf(-0.02));
        b.add(beam(b0, b1, 0.18, 0.18), mats.spar);
        b.add(beam(b0.clone().add(V(0, 0.25, -0.6)), b1.clone().add(V(0, 0.25, 0.5)), 0.34, 0.3), mats.sail);
        line(V(0, top - 0.5, m.z), g1); line(g1, b1);
      }
    });
    // the bowsprit and jib-boom, the jibs furled along it; stays from the foremast to its end
    const bs0 = V(0, wl + rail(1) - 0.3, zOf(0.97)), bs1 = V(0, wl + rail(1) + 1.9, zOf(1) + 8.2);
    b.add(beam(bs0, bs1, 0.3, 0.3), mats.spar);
    b.add(beam(bs0.clone().lerp(bs1, 0.25).add(V(0, 0.22, 0)), bs0.clone().lerp(bs1, 0.9).add(V(0, 0.18, 0)), 0.2, 0.2), mats.sail);
    const fore = masts[0], main = masts[1], miz = masts[2];
    line(V(0, wl + fore.h - 0.5, fore.z), bs1); line(V(0, fore.y0 + (wl + fore.h - fore.y0) * 0.44, fore.z), bs0.clone().lerp(bs1, 0.6));
    line(V(0, wl + fore.h - 1.5, fore.z), bs0.clone().lerp(bs1, 0.85));
    line(V(0, wl + main.h - 0.5, main.z), V(0, wl + fore.h - 3, fore.z)); line(V(0, main.y0 + 8, main.z), V(0, fore.y0 + 7, fore.z));
    line(V(0, wl + miz.h - 0.5, miz.z), V(0, wl + main.h - 4, main.z));
    line(bs1, V(0, wl - 0.2, zOf(1) + 0.3)); // bobstay
    // deck lights and the stern lantern (they glow after dark)
    for (const s of [0.06, 0.3, 0.55, 0.8]) for (const sx of [-1, 1]) {
      b.add(new THREE.SphereGeometry(0.13, 6, 4), mats.shipLamp, { x: sx * (hb(s) - 0.1), y: wl + rail(s) + 0.2, z: zOf(s) });
    }
    b.box(0.35, 0.5, 0.35, mats.shipLamp, { y: wl + rail(0) + 0.3, z: zOf(0) + 0.3 });
    // the floating pontoon along the quay wall and the gangways (quay -> pontoon, pontoon -> ship)
    const px = B / 2 + 0.4 + S.pontoon / 2; // local +x is towards the quay? (checked below)
    const qSide = (() => { const p = toWorldS(S, 1, 0), c = { x: S.x, z: S.z }; return v2.dot(v2.sub(p, c), S.bank.n) < 0 ? 1 : -1; })();
    b.box(S.pontoon, 0.55, L * 0.95, mats.pontoon, { x: qSide * px, y: wl - 0.2, z: -0.5 });
    for (let z = -L * 0.45; z <= L * 0.45; z += 2.4) b.cyl(0.035, 0.035, 1.0, mats.stainless, { x: qSide * (px - S.pontoon / 2 + 0.1), y: wl + 0.35, z }, 4);
    b.add(beam(V(qSide * (px - S.pontoon / 2 + 0.1), wl + 1.35, -L * 0.45), V(qSide * (px - S.pontoon / 2 + 0.1), wl + 1.35, L * 0.45), 0.05, 0.05), mats.stainless);
    const gq = V(qSide * (px + S.pontoon / 2 + 1.2), KERB_H + 1.2, -L * 0.3), gp = V(qSide * (px + S.pontoon / 2 - 0.8), wl + 0.4, -L * 0.3 + 6);
    b.add(beam(gq, gp, 1.3, 0.12), mats.greySteel);
    for (const o of [-0.62, 0.62]) b.add(beam(gq.clone().add(V(0, 1, 0)).add(V(0, 0, o)), gp.clone().add(V(0, 1, 0)).add(V(0, 0, o)), 0.05, 0.05), mats.stainless);
    b.add(beam(V(qSide * (px - 0.3), wl + 0.4, -L * 0.3 + 3), V(qSide * (B / 2 - 0.3), wl + rail(0.2), -L * 0.3 + 3), 1.0, 0.1), mats.greySteel);
    const g = b.build('Jeanie Johnston');
    // the running and standing rigging: one line set for the whole ship
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rig, 3));
    const lines = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x2b2722 }));
    lines.userData.dynamic = true;
    g.add(lines);
    groups.push(g);
    for (const t of [-0.35, 0, 0.3]) waterGlowSources.push({ ...toWorldS(S, -qSide * (B / 2 + 0.5), t * L), y: WATER_Y + 0.05, color: 0xffd9a0, width: 2.6, length: 30 });
    nightMats.push([mats.hull, 0.28]);
  }

  // ================= the CHQ building (Stack A, 1820) with its glass front on the quay =================
  {
    const S = CHQ, b = new Builder(S), W = S.w, D = S.d, H = 6.5;
    // brick and calp walls, three parallel roofs on cast-iron trusses with glazed ridges, the glazed quay front
    b.facade(W, H, D - 4, mats.chq, mats.chqRoof, { z: -2 }, 5, 6.5);
    for (let k = 0; k < 3; k++) {
      const x = -W / 3 + k * (W / 3);
      b.gable(W / 3, 3.8, D - 4, mats.chqRoof, { x, y: H, z: -2 });
      b.box(1.2, 0.25, D - 5, glass, { x, y: H + 3.55, z: -2 });
    }
    b.box(W, H + 1.5, 4, mats.chqGlass, { z: D / 2 - 2 });                   // the glazed entrance hall across the quay end
    b.box(W + 0.4, 0.5, 4.4, mats.darkSteel, { y: H + 1.5, z: D / 2 - 2 });
    for (let x = -W / 2; x <= W / 2 + 1e-3; x += 2.5) b.box(0.12, H + 1.5, 0.12, mats.darkSteel, { x, z: D / 2 + 0.02 });
    for (const y of [3.4, H + 1.4]) b.box(W, 0.1, 0.12, mats.darkSteel, { y, z: D / 2 + 0.02 });
    b.solid(0, 0, W, D);
    groups.push(b.build('CHQ'));
    nightMats.push([mats.chqGlass, 0.75]);
    waterGlowSources.push({ x: S.x, z: S.front + 18, y: WATER_Y + 0.05, color: 0xffe0b8, width: 8, length: 40 });
  }

  return {
    groups,
    setNight(level) { for (const [m, k] of nightMats) m.emissiveIntensity = k * level; },
  };
}

function toWorldS(site, lx, lz) { const c = Math.cos(site.rot), s = Math.sin(site.rot); return { x: site.x + lx * c + lz * s, z: site.z - lx * s + lz * c }; }

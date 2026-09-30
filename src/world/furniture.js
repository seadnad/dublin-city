// Dublin street furniture: working traffic signals, bus stops and shelters, bins, An Post pillar boxes,
// corner bollards and trees along the north quays. All instanced.
import * as THREE from 'three';
import { addReflections } from '../render/reflect.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, v2 } from './geo.js';
import { KERB_H, fieldAt } from './roads.js';
import { rng, IS_MOBILE } from './textures.js';
import { LITE } from '../render/quality.js';
import { addBox } from '../game/collision.js';
import { chunkedInstances } from './chunks.js';
import { plantTrees } from './trees.js';
import { FC, sites } from './sites.js';
import { along, chainageOf } from './oconnell.js';
import { project } from './geo.js';
import ocData from '../data/oconnellst.json';

const rand = rng(1847);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
const compose = (x, y, z, rot, s = _one) => _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(_up, rot), s);

// street furniture casts shadows on desktop; on phones the sun shadow is kept to buildings, trees, vehicles and people
function instanced(geo, mat, items, { shadow = !LITE, colors } = {}) {
  return chunkedInstances(geo, mat, items, { shadow, colors, y: KERB_H });
}
const junctionClear = (node) => { let w = 0; for (const way of node.ways) w = Math.max(w, way.width); return node.edges.length > 2 ? w / 2 + 2.5 : 0; };

// ---------------- traffic signals ----------------
export function createSignals(scene) {
  const nodes = [];
  for (const node of world.nodes.values()) {
    if (node.edges.length < 3) continue;
    const big = node.edges.filter((e) => e.way.type !== 'lane' && !e.way.bridge).length;
    if (big < 3) continue;
    // split approaches into two groups by axis: the first edge's axis and everything else
    const a0 = Math.atan2(node.edges[0].to.x - node.x, node.edges[0].to.z - node.z);
    const group = new Map();
    for (const e of node.edges) {
      const a = Math.atan2(e.to.x - node.x, e.to.z - node.z);
      const d = Math.abs(Math.atan2(Math.sin(2 * (a - a0)), Math.cos(2 * (a - a0)))) / 2; // axis difference 0..pi/2
      group.set(e.to, d < Math.PI / 4 ? 0 : 1);
    }
    nodes.push({ node, group, offset: rand() * 30, clear: junctionClear(node), heads: [] });
  }
  const byNode = new Map(nodes.map((s) => [s.node, s]));
  const CYCLE = 30;
  // phase: group 0 green 0-11, amber 11-14, all red 14-15, group 1 green 15-26, amber 26-29, all red 29-30
  const light = (s, g, t) => {
    const u = (t + s.offset) % CYCLE, o = g === 0 ? 0 : 15, v = (u - o + CYCLE) % CYCLE;
    return v < 11 ? 'green' : v < 14 ? 'amber' : 'red';
  };

  // poles + heads on the nearside kerb of each approach, facing oncoming traffic
  const poles = [], heads = [];
  for (const s of nodes) {
    for (const e of s.node.edges) {
      if (e.way.type === 'lane' || e.way.bridge || e.len < s.clear + 10) continue;
      const d = v2.norm(v2.sub(e.to, e.from)), n = { x: -d.z, z: d.x };
      const at = v2.add(e.from, v2.scale(d, s.clear + 4.4));
      const p = v2.add(at, v2.scale(n, e.way.width / 2 + 0.55));
      if (fieldAt(p.x, p.z) < 0.2) continue;
      const rot = Math.atan2(d.x, d.z);
      poles.push({ x: p.x, z: p.z, rot });
      heads.push({ x: p.x, z: p.z, rot, sig: s, g: s.group.get(e.to) });
      addBox(p.x, p.z, 0.12, 0.12, 0);
    }
  }
  const black = addReflections(new THREE.MeshStandardMaterial({ color: 0x151617, roughness: 0.42, metalness: 0 }), 0.6); // painted signal poles
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.07, 3.3, 8).translate(0, 1.65, 0);
  const headGeo = mergeGeometries([
    new THREE.BoxGeometry(0.34, 0.95, 0.24).translate(0, 3.05, 0.05),
    new THREE.BoxGeometry(0.5, 1.1, 0.03).translate(0, 3.05, -0.08), // backboard
  ]);
  // lens: rim and front face (the back face sits inside the signal head and was never seen)
  const lensGeo = mergeGeometries([new THREE.CylinderGeometry(0.1, 0.1, 0.04, 12, 1, true).rotateX(Math.PI / 2), new THREE.CircleGeometry(0.1, 12).translate(0, 0, 0.02)]);
  scene.add(instanced(poleGeo, black, poles), instanced(headGeo, black, heads));
  // lenses: one instanced mesh per map block (culled with the block) rather than one for the whole city
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff }), blocks = new Map();
  for (const h of heads) {
    const k = `${Math.floor(h.x / 500)},${Math.floor(h.z / 500)}`;
    if (!blocks.has(k)) blocks.set(k, []);
    blocks.get(k).push(h);
  }
  for (const list of blocks.values()) {
    const lenses = new THREE.InstancedMesh(lensGeo, lensMat, list.length * 3);
    list.forEach((h, i) => {
      h.lenses = lenses; h.at = i * 3;
      for (let k = 0; k < 3; k++) {
        const y = 3.35 - k * 0.3;
        lenses.setMatrixAt(i * 3 + k, compose(h.x + Math.sin(h.rot) * 0.18, y, h.z + Math.cos(h.rot) * 0.18, h.rot));
        lenses.setColorAt(i * 3 + k, new THREE.Color(0x111111));
      }
    });
    lenses.computeBoundingSphere();
    lenses.matrixAutoUpdate = false;
    scene.add(lenses);
  }
  const ON = [new THREE.Color(3, 0.2, 0.15), new THREE.Color(3, 1.6, 0.1), new THREE.Color(0.2, 3, 1.2)];
  const OFF = [new THREE.Color(0.18, 0.03, 0.03), new THREE.Color(0.18, 0.12, 0.02), new THREE.Color(0.03, 0.14, 0.07)];
  let time = 0;
  const last = new Map();
  return {
    count: heads.length,
    update(dt) {
      time += dt;
      heads.forEach((h, i) => {
        const st = light(h.sig, h.g, time);
        if (last.get(i) === st) return;
        last.set(i, st);
        const lit = st === 'red' ? 0 : st === 'amber' ? 1 : 2;
        for (let k = 0; k < 3; k++) h.lenses.setColorAt(h.at + k, k === lit ? ON[k] : OFF[k]);
        h.lenses.instanceColor.needsUpdate = true;
      });
    },
    // For an AI car on `edge` heading into edge.to: the light it faces and where its stop line is
    stateFor(edge) {
      const s = byNode.get(edge.to);
      if (!s) return null;
      return { state: light(s, s.group.get(edge.from), time), stopBack: s.clear + 4.4 };
    },
  };
}

// ---------------- bus stops, bins, post boxes, bollards ----------------
const BUS_ROUTES = /O'Connell Street|Westmoreland|D'Olier|Dame Street|College Green|Nassau|Eden Quay|Burgh Quay|Aston Quay|Bachelors Walk|Pearse|Parnell|Gardiner|Stephen's Green|Merrion Square|Capel|Lord Edward|High Street|Ormond|Wellington|Custom House Quay|George's Quay|Amiens/;

function stopSign() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#f2c416'; g.fillRect(0, 0, 128, 160);
  g.fillStyle = '#1c2c66'; g.fillRect(0, 0, 128, 48);
  g.fillStyle = '#fff'; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BUS', 64, 25);
  g.fillStyle = '#1c2c66'; g.font = 'bold 22px Arial';
  g.fillText('16  46A', 64, 78); g.fillText('39A  145', 64, 108); g.fillText('C1', 64, 138);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// footpaths kept free of stops, shelters and bins: the Famine figures' strip on Custom House Quay
const CLEAR = [sites.famine].filter(Boolean);
const keepClear = (p) => CLEAR.some((b) => {
  const dx = p.x - b.x, dz = p.z - b.z, c = Math.cos(b.rot), sn = Math.sin(b.rot);
  return Math.abs(dx * c - dz * sn) < b.w / 2 + 4 && Math.abs(dx * sn + dz * c) < b.d / 2 + 3;
});

export function buildFurniture(scene) {
  const stops = [], shelters = [], bins = [], posts = [], bollards = [];
  for (const way of world.ways) {
    if (way.bridge || way.type === 'lane') continue;
    const bus = BUS_ROUTES.test(way.name);
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], b = way.pts[k + 1], L = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a));
      for (const side of [1, -1]) {
        const out = { x: d.z * side, z: -d.x * side }; // away from the road on this side
        const rot = Math.atan2(-out.x, -out.z);        // faces the road
        const at = (s, off) => { const p = v2.add(v2.lerp(a, b, s / L), v2.scale(out, way.width / 2 + off)); return { ...p, rot }; };
        const ok = (p) => fieldAt(p.x, p.z) > 0.4 && (world.nearestRoad(p.x, p.z) || {}).way === way && !keepClear(p);
        if (bus && L > 70) {
          const s = 25 + rand() * (L - 50);
          const pole = at(s, 0.7);
          // (O'Connell Street's stops are placed from OSM below; the draws are kept so the rest of the city is unchanged)
          if (ok(pole) && way.type !== 'boulevard') {
            stops.push(pole);
            if (rand() < 0.6) { const sh = at(s + 4, 2.4); if (ok(sh)) shelters.push(sh); }
          }
        }
        for (let s = 12 + rand() * 30; s < L - 10; s += 45 + rand() * 40) {
          const p = at(s, 0.55);
          if (ok(p)) bins.push(p);
        }
        if (rand() < 0.08 && L > 40) { const p = at(L * 0.5, 0.6); if (ok(p)) posts.push(p); }
      }
    }
  }
  // O'Connell Street: the stops where OSM has them (src/data/oconnellst.json), poles at the kerb; a shelter at the busiest
  // (by the Dublin Bus head office and at the Gresham; refs/oconnell-street 23)
  {
    const street = world.ways.find((w) => w.type === 'boulevard');
    for (const [lat, lon, name, , , off] of ocData.stops) {
      const s = chainageOf(project(lat, lon)), side = off > 0 ? -1 : 1, p = along(s, side * (street.width / 2 + 0.7));
      const out = { x: p.left.x * side, z: p.left.z * side }, rot = Math.atan2(-out.x, -out.z);
      if (stops.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 16)) continue;
      stops.push({ x: p.x, z: p.z, rot });
      if (/Dublin Bus|Gresham|Cathal Brugha/.test(name)) { const q = along(s + 4, side * (street.width / 2 + 2.4)); shelters.push({ x: q.x, z: q.z, rot }); }
    }
  }
  // cast-iron bollards around the corners of busy junctions
  for (const node of world.nodes.values()) {
    if (node.edges.length < 3) continue;
    for (const e of node.edges) {
      if (e.way.type === 'lane' || e.way.bridge) continue;
      const d = v2.norm(v2.sub(e.to, e.from)), n = { x: -d.z, z: d.x };
      for (const side of [1, -1]) for (const s of [1.5, 3]) {
        const p = v2.add(v2.add(node, v2.scale(d, junctionClear(node) + s)), v2.scale(n, side * (e.way.width / 2 + 0.45)));
        if (fieldAt(p.x, p.z) > 0.2 && fieldAt(p.x, p.z) < 1.2) bollards.push({ ...p, rot: 0 });
      }
    }
  }
  for (const list of [stops, bins, posts, bollards]) for (const p of list) addBox(p.x, p.z, 0.18, 0.18, 0);
  for (const p of shelters) addBox(p.x, p.z, 1.9, 0.75, p.rot);

  const metal = addReflections(new THREE.MeshStandardMaterial({ color: 0xa4aab0, roughness: 0.32, metalness: 1 }), 0.85); // stainless / galvanised
  const dark = addReflections(new THREE.MeshStandardMaterial({ color: 0x1c1e20, roughness: 0.5, metalness: 0 }), 0.5); // painted bins, bollards
  // bus stop pole with the yellow and navy flag
  const signMat = new THREE.MeshStandardMaterial({ map: stopSign(), roughness: 0.5 });
  const flag = new THREE.BoxGeometry(0.36, 0.45, 0.04).translate(0, 2.55, 0);
  scene.add(instanced(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8).translate(0, 1.4, 0), metal, stops), instanced(flag, signMat, stops));
  // shelters: frame, glass, roof and an ad panel
  const glass = new THREE.MeshStandardMaterial({ color: 0xa9c0c8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false });
  const frame = mergeGeometries([
    new THREE.BoxGeometry(3.8, 0.1, 1.5).translate(0, 2.45, 0),
    ...[-1.85, 1.85].flatMap((x) => [-0.7, 0.7].map((z) => new THREE.BoxGeometry(0.07, 2.45, 0.07).translate(x, 1.22, z))),
    new THREE.BoxGeometry(2.4, 0.08, 0.35).translate(0.4, 0.5, 0.45),
  ]);
  const panes = mergeGeometries([new THREE.BoxGeometry(3.7, 2.2, 0.02).translate(0, 1.2, 0.7), new THREE.BoxGeometry(0.02, 2.2, 1.35).translate(-1.85, 1.2, 0)]);
  const adC = document.createElement('canvas'); adC.width = 128; adC.height = 256;
  const ag = adC.getContext('2d'); const gr = ag.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#1d5a3a'); gr.addColorStop(1, '#0d2a1b');
  ag.fillStyle = gr; ag.fillRect(0, 0, 128, 256); ag.fillStyle = '#f4efe4'; ag.font = 'bold 22px Georgia'; ag.textAlign = 'center';
  ag.fillText('VISIT', 64, 90); ag.fillText('DUBLIN', 64, 120); ag.font = '14px Georgia'; ag.fillText('céad míle fáilte', 64, 160);
  const adTex = new THREE.CanvasTexture(adC); adTex.colorSpace = THREE.SRGBColorSpace;
  const ad = new THREE.BoxGeometry(0.05, 1.8, 1.2).translate(1.86, 1.25, 0);
  scene.add(instanced(frame, metal, shelters), instanced(panes, glass, shelters, { shadow: false }),
    instanced(ad, new THREE.MeshStandardMaterial({ map: adTex, emissiveMap: adTex, emissive: 0xffffff, emissiveIntensity: 0.25 }), shelters));
  // bins (black with a silver top) and green An Post pillar boxes
  scene.add(instanced(mergeGeometries([new THREE.BoxGeometry(0.62, 1.05, 0.62).translate(0, 0.52, 0), new THREE.BoxGeometry(0.66, 0.12, 0.66).translate(0, 1.1, 0)]), dark, bins));
  const green = addReflections(new THREE.MeshStandardMaterial({ color: 0x1f6b3a, roughness: 0.3, metalness: 0 }), 0.7); // gloss-painted pillar box
  scene.add(instanced(mergeGeometries([
    new THREE.CylinderGeometry(0.27, 0.3, 1.3, 16).translate(0, 0.65, 0),
    new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(0, 1.3, 0),
    new THREE.CylinderGeometry(0.33, 0.33, 0.08, 16).translate(0, 1.3, 0),
  ]), green, posts));
  scene.add(instanced(mergeGeometries([new THREE.CylinderGeometry(0.09, 0.11, 0.9, 6).translate(0, 0.45, 0), new THREE.CylinderGeometry(0.02, 0.1, 0.1, 6).translate(0, 0.95, 0)]), dark, bollards));

  // London planes along the river side of the north quays
  const trees = [];
  for (const way of world.ways) {
    if (!/Bachelors|Ormond|Inns Quay|Eden Quay|Arran/.test(way.name)) continue;
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], b = way.pts[k + 1], L = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a));
      const river = { x: -d.z, z: d.x }; // quays run west to east with the river to the south (+z): right side
      for (let s = 6; s < L - 6; s += 11) {
        const p = v2.add(v2.lerp(a, b, s / L), v2.scale(river, way.width / 2 + 1.7));
        // the view of the Four Courts' portico is kept open across the quay (refs/four-courts 01, 02)
        const fu = (p.x - FC.x) * FC.d.x + (p.z - FC.z) * FC.d.z, fv = (p.x - FC.x) * FC.n.x + (p.z - FC.z) * FC.n.z;
        if (Math.abs(fu) < 9 && fv > -30 && fv < 0) continue;
        if (fieldAt(p.x, p.z) > 0.8) trees.push({ ...p, rot: rand() * 6.28, s: new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + rand() * 0.35) });
      }
    }
  }
  for (const t of trees) addBox(t.x, t.z, 0.25, 0.25, 0);
  plantTrees(scene, trees.map((t) => ({ x: t.x, y: KERB_H, z: t.z, rot: t.rot, s: t.s.x })), { plane: 5, lime: 1 }, rand);

  return { stops: stops.length, shelters: shelters.length, bins: bins.length, posts: posts.length, bollards: bollards.length, trees: trees.length };
}

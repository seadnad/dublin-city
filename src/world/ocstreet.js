// O'Connell Street frontage layout (docs/research/oconnell-street.md 4): the stretches of frontage along both sides
// between the side streets and the GPO / Clerys, and the street's buildings (src/data/oconnellst.json) shared out
// along them. Each building gets a frame: u along its front (left to right as seen from the street), v into the
// building, origin at the middle of its front at ground level. sites.js turns the frames into reserved footprints
// (so the filler leaves the frontage to them); src/world/ocfacades.js builds them.
import { world, v2 } from './geo.js';
import { along, LENGTH } from './oconnell.js';
import data from '../data/oconnellst.json';

const street = world.ways.find((w) => w.type === 'boulevard');
export const SETBACK = street.width / 2 + street.pave + 0.15; // the building line (as the filler's)
const DEPTH = data.depth;

// inside an oriented box (x, z, rot, w, d), grown by pad
function inBox(p, b, pad = 0) {
  const c = Math.cos(b.rot), s = Math.sin(b.rot), dx = p.x - b.x, dz = p.z - b.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) <= b.w / 2 + pad && Math.abs(lz) <= b.d / 2 + pad;
}
// is this point in a side street (its carriageway or footpath, plus a margin)?
function inSideStreet(p, pad) {
  for (const sg of world.segs) {
    if (sg.way === street) continue;
    const r = sg.way.width / 2 + sg.way.pave + pad;
    const ab = v2.sub(sg.b, sg.a), L2 = v2.dot(ab, ab) || 1e-9;
    const t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, sg.a), ab) / L2));
    const q = v2.add(sg.a, v2.scale(ab, t));
    if (v2.len(v2.sub(p, q)) < r) return true;
  }
  return false;
}

// the free stretches of frontage on one side (side +1 = west, the left of northward travel), as [s0, s1] chainages
function runs(side, heroes) {
  const out = [], step = 0.25;
  let s0 = null;
  for (let s = 0; s <= LENGTH + 1e-6; s += step) {
    let free = true;
    for (const dv of [0.3, DEPTH * 0.5, DEPTH - 0.5]) {
      const p = along(s, side * (SETBACK + dv));
      if (inSideStreet(p, 0.3) || heroes.some((h) => inBox(p, h, 0.2))) { free = false; break; }
    }
    if (free && s0 === null) s0 = s;
    if ((!free || s + step > LENGTH) && s0 !== null) { if (s - s0 > 3) out.push([s0 + step, s - step]); s0 = null; }
  }
  return out;
}

// share a run out among its buildings: w = max(min, c * r * k), c chosen so the widths fill the run
function share(list, L) {
  const w = (c) => list.map((b) => Math.max(b.min || 4, c * b.r * (b.k || 1)));
  let lo = 0, hi = 4;
  for (let i = 0; i < 60; i++) { const c = (lo + hi) / 2; if (w(c).reduce((a, b) => a + b, 0) > L) hi = c; else lo = c; }
  const ws = w(lo), sum = ws.reduce((a, b) => a + b, 0);
  return ws.map((x) => (x * L) / sum); // exact fill (if even the minimums overflow, everything is squeezed evenly)
}

// a building frame at chainages [s0, s1] on a side: the front on the chord between the two ends of its front
function frame(s0, s1, side) {
  const A = along(s0, side * SETBACK), B = along(s1, side * SETBACK);
  // u runs left to right as seen from the street: on the west side (facing west) that is north, i.e. from s0 to s1
  const [P, Q] = side > 0 ? [A, B] : [B, A];
  const d = v2.norm(v2.sub(Q, P)), n = { x: -d.z, z: d.x }; // n: into the building (right of d... see below)
  // into the building = away from the centreline
  const mid = v2.lerp(P, Q, 0.5), c = along((s0 + s1) / 2);
  const away = v2.dot(v2.sub(mid, c), n) > 0 ? n : { x: -n.x, z: -n.z };
  const at = (u, v) => ({ x: mid.x + d.x * u + away.x * v, z: mid.z + d.z * u + away.z * v });
  // three.js rotation.y for local x = d, local z = -away (the front faces the street along -v)
  const rot = Math.atan2(-d.z, d.x);
  return { x: mid.x, z: mid.z, d, n: away, rot, w: v2.len(v2.sub(Q, P)), at };
}

// Eason's: in the game the GPO (54 m, from the Spire south) comes to within a few metres of Abbey Street Middle, so
// Eason's stands on the corner: its narrow end on O'Connell Street (with the clock) and a long shallow front along
// the north side of Abbey Street Middle, in front of the GPO's south flank (the real shop runs through to Abbey St).
// The frame runs along Abbey Street Middle, u from west to east (left to right seen from Abbey Street), v north.
function abbeyCorner(b, heroes) {
  const ab = world.ways.find((w) => w.name === 'Abbey Street Middle');
  const i = ab.nodeIds.indexOf('OC1'), A = ab.pts[i], B = ab.pts[i === 0 ? 1 : i - 1];
  const dir = v2.norm(v2.sub(B, A));                       // west along Abbey Street from the junction
  const nrm = { x: dir.z, z: -dir.x };                       // one side of it...
  const north = nrm.z < 0 ? nrm : { x: -nrm.x, z: -nrm.z }; // ...the north side
  const off = ab.width / 2 + ab.pave + 0.15;
  const line = (t) => v2.add(v2.add(A, v2.scale(dir, t)), v2.scale(north, off));
  // where the Abbey Street building line meets O'Connell Street's west building line
  const ocLeft = along(60).left;
  const onOC = (p) => v2.dot(v2.sub(p, along(60, SETBACK)), ocLeft); // > 0: behind the O'Connell building line
  let t0 = 0;
  while (onOC(line(t0)) < 0 && t0 < 40) t0 += 0.05;
  const L = b.len || 26, t1 = t0 + L;
  // depth: north from the Abbey Street line until the GPO (less a gap)
  let depth = 0;
  const probe = (t, v) => v2.add(line(t), v2.scale(north, v));
  while (depth < 14 && ![t0 + 0.2, (t0 + t1) / 2, t1 - 0.2].some((t) => heroes.some((h) => inBox(probe(t, depth + 0.3), h, 0.2)))) depth += 0.1;
  const P = line(t1), Q = line(t0);                        // left (west) to right (east) as seen from Abbey Street
  const d = v2.norm(v2.sub(Q, P)), mid = v2.lerp(P, Q, 0.5);
  const at = (u, v) => ({ x: mid.x + d.x * u + north.x * v, z: mid.z + d.z * u + north.z * v });
  return { x: mid.x, z: mid.z, d, n: north, rot: Math.atan2(-d.z, d.x), w: L, at, depth: Math.max(3, depth) };
}

let layout = null;
// heroes: the footprints already on the frontage (the GPO, Clerys) that the runs stop at
export function oconnellLayout(heroes) {
  if (layout) return layout;
  const buildings = [], problems = [];
  for (const b of data.corners || []) {
    const f = abbeyCorner(b, heroes);
    buildings.push({ ...b, side: 'W', s0: 0, s1: 0, frame: f, depth: f.depth, endL: false, endR: true, runIndex: -1, corner: true });
  }
  for (const [key, side] of [['W', 1], ['E', -1]]) {
    const R = runs(side, heroes), groups = data[key];
    if (R.length !== groups.length) problems.push(`${key}: ${R.length} runs of frontage for ${groups.length} groups: ${JSON.stringify(R.map((r) => r.map((x) => +x.toFixed(1))))}`);
    groups.forEach((list, gi) => {
      const run = R[Math.min(gi, R.length - 1)];
      if (!run) return;
      const ws = share(list, run[1] - run[0]);
      let s = run[0];
      list.forEach((b, i) => {
        const f = frame(s, s + ws[i], side);
        buildings.push({ ...b, side: key, s0: s, s1: s + ws[i], frame: f, depth: b.depth || DEPTH,
          // which ends are exposed (a side street or open ground beside them): dressed as corners
          endL: side > 0 ? i === 0 : i === list.length - 1, endR: side > 0 ? i === list.length - 1 : i === 0,
          runIndex: gi });
        s += ws[i];
      });
    });
  }
  if (problems.length) console.warn("O'Connell Street layout:", problems.join('; '));
  layout = { buildings, problems };
  return layout;
}
// a reserved footprint for each building (a box on its frame, the whole depth)
export const footprintOf = (b) => ({ ...b.frame.at(0, b.depth / 2), rot: b.frame.rot, w: b.frame.w, d: b.depth });

// Luas trams: every line's services (world.luasLines, built in geo.js from streets.json; docs/research/luas.md). Each
// tram is three carriages that drive a run end to end, pausing at the stops, then reverse onto the next run of its
// service (out and back, or round the Green Line's O'Connell Street / Marlborough Street pair). Trams keep a safe
// distance from any tram ahead or across their path (junctions, the Red and Green crossings), and a tram past the
// edge of the map (where the lines run on out of the city) is hidden. All carriages of all trams are drawn with one
// instanced mesh per material, so the whole fleet costs the same few draw calls as a single tram.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, LUAS_TRACK } from '../world/geo.js';
import { tramCarParts } from './vehicles.js';
import { buildStopKit } from './luasStop.js';

const CAR_LEN = 11, GAP = 1.2, N = 3;
const TRAIN = N * CAR_LEN + (N - 1) * GAP; // 35.4 m, front to back
const BERTH = TRAIN + 2; // where a tram's front stands at the start of a run
const VMAX = 13, ACC = 1.3, DEC = 1.1, DWELL = 7, TURN_DWELL = 10;

// Stops dressed with a tuned kit; every other stop gets DEFAULT_KIT. Distances are metres along the stop's leg in the
// leg's own direction (side +1 is to the right of it). A single-track leg has one platform, on the left unless `side`.
const DEFAULT_KIT = { from: -19, to: 19, width: 2.6, poles: 12, sides: { 1: { shelters: [[-12, 2]] }, [-1]: { shelters: [[2, 2]] } } };
const STOP_KITS = {
  // the leg runs south through Heuston: side +1 is the west platform, by the station. Cut to what fits between the
  // river and St John's Road West in the compressed map
  Heuston: { from: -17, to: 5.5, width: 3.0, poles: 11, hatch: true, sides: { 1: { shelters: [[-16.5, 4]] }, [-1]: { shelters: [[-7, 1]], wall: true } } },
  // the terminus (docs/research/three-arena.md): the leg starts at the end of the track, so the platforms run over
  // the whole berth. Side +1 is north (the inbound and event platforms), -1 south, towards the 3Arena's gables
  'The Point': { from: -35, to: 1.5, width: 2.8, poles: 12, sides: { 1: { shelters: [[-30, 3], [-12, 2]] }, [-1]: { shelters: [[-24, 3]] } } },
  // Chancery Street behind the Four Courts (docs/research/four-courts.md 1.3): the leg runs west, side +1 is the
  // north platform (the Chancery Place courthouse side), -1 the courts' side
  'Four Courts': { from: -14, to: 14, width: 2.6, poles: 12, sides: { 1: { shelters: [[-10, 3]] }, [-1]: { shelters: [[-2, 3]] } } },
  // the Connolly spur ends in Amiens Street by the station: the leg starts at the buffers, platforms over the berth
  Connolly: { from: -1.5, to: 37, width: 2.6, poles: 12, sides: { 1: { shelters: [[4, 3]] }, [-1]: { shelters: [[16, 3]] } } },
};
const kitOf = (name) => STOP_KITS[name] || DEFAULT_KIT;

function sampler(run) {
  const { pts, table } = run, last = table.length - 1;
  // point and unit direction at arc d
  return (d, out = {}) => {
    d = d < 0 ? 0 : d > table[last] ? table[last] : d;
    let lo = 0, hi = last;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m] <= d) lo = m; else hi = m; }
    const i = hi;
    const a = pts[i - 1], b = pts[i], L = table[i] - table[i - 1] || 1, t = (d - table[i - 1]) / L;
    out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t; out.dx = (b.x - a.x) / L; out.dz = (b.z - a.z) / L;
    return out;
  };
}

// ---------- stops: one kit per stop, built along the run that drives its leg forwards ----------
// Built with the static city (before the height field and far-view captures). The kits' meshes are then merged per
// material per map block (every stop costs its handful of draw calls only once per block, not per stop).
export function buildLuasStops(scene, lines = world.luasLines, { block = 800 } = {}) {
  const tmp = new THREE.Group();
  for (const line of lines) {
    const done = new Set();
    for (const run of line.runs) {
      for (const rs of run.stops) {
        const st = rs.stop, leg = line.legs[st.leg], key = `${st.leg}/${st.name}`;
        if (rs.rev || done.has(key)) continue;
        done.add(key);
        const at0 = sampler(run), T = leg.single ? 0 : LUAS_TRACK;
        // the leg's centreline d metres past the stop: the run's (left-hand) track shifted back to the right
        const at = (d) => { const f = at0(rs.s + d); return { x: f.x - f.dz * T, z: f.z + f.dx * T, dx: f.dx, dz: f.dz }; };
        const kit = kitOf(st.name);
        const cfg = { ...kit, name: st.name, ga: st.ga, color: line.color, track: T };
        if (leg.single) {
          const side = st.side === 'right' ? 1 : -1;
          cfg.only = [side];
          cfg.sides = { [side]: (kit.sides && (kit.sides[-1] || kit.sides[1])) || {} };
          cfg.hatch = false;
        }
        buildStopKit(tmp, at, cfg);
      }
    }
  }
  // merge (kit geometry is already in world space)
  const buckets = new Map(), box = new THREE.Box3(), c = new THREE.Vector3();
  tmp.traverse((o) => {
    if (!o.isMesh && !o.isLineSegments) return;
    box.setFromBufferAttribute(o.geometry.attributes.position).getCenter(c);
    const k = `${o.material.uuid}|${o.isMesh ? 'm' : 'l'}|${Math.floor(c.x / block)},${Math.floor(c.z / block)}`;
    if (!buckets.has(k)) buckets.set(k, { o, geos: [] });
    buckets.get(k).geos.push(o.geometry);
  });
  const group = new THREE.Group(); group.name = 'Luas stops';
  for (const { o, geos } of buckets.values()) {
    const g = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    const m = o.isMesh ? new THREE.Mesh(g, o.material) : new THREE.LineSegments(g, o.material);
    m.castShadow = o.castShadow; m.receiveShadow = o.receiveShadow; m.matrixAutoUpdate = false;
    group.add(m);
  }
  scene.add(group);
  return group;
}

export function createLuas(scene, lines = world.luasLines) {
  const B = world.bounds;
  const inMap = (x, z) => x > B.minX && x < B.maxX && z > B.minZ && z < B.maxZ;

  // ---------- trams ----------
  const trams = [];
  for (const line of lines) {
    for (const svc of line.services) {
      const runs = svc.runs.map((run) => ({
        run, at: sampler(run), total: run.total,
        // where the front stands for each stop: the tram centred on the platform
        fronts: run.stops.map((rs) => {
          const k = kitOf(rs.stop.name), c = (k.from + k.to) / 2;
          return { name: rs.stop.name, ga: rs.stop.ga, s: rs.s + (rs.rev ? -c : c) + TRAIN / 2 };
        }).filter((f) => f.s > BERTH - 3 && f.s < run.total - 3),
        // stops served by the dwell at either end of the run
        ends: [run.stops.find((rs) => rs.s < 60), run.stops.find((rs) => rs.s > run.total - 60)].map((rs) => rs && rs.stop.name),
      }));
      for (let k = 0; k < svc.trams; k++) {
        trams.push({
          line, svc, runs, ri: 0, s: BERTH, speed: 0, dwell: 2, name: line.name, currentStop: null,
          obstacle: Infinity, blockedBy: null, visible: true,
          carriages: Array.from({ length: N }, (_, i) => ({ x: 0, z: 0, heading: 0, hx: 1.25, hz: CAR_LEN / 2, cab: i === 0 ? 1 : i === N - 1 ? -1 : 0, visible: true })),
        });
      }
    }
  }

  function nextStop(t) {
    const R = t.runs[t.ri];
    for (const f of R.fronts) if (f.s > t.s + 0.05) return f;
    return null;
  }
  // drive one tram (no other trams considered beyond its obstacle distance)
  function drive(t, dt) {
    const R = t.runs[t.ri];
    if (t.dwell > 0) {
      t.dwell -= dt;
      if (t.dwell > 0) return;
      t.currentStop = null;
    }
    const f = nextStop(t), stopAt = f ? f.s : R.total - 1;
    const block = t.obstacle - 4; // stand off 4 m behind a tram in the way
    const target = Math.min(stopAt, t.s + block);
    const dist = target - t.s;
    const want = Math.min(VMAX, Math.sqrt(Math.max(0, dist) * 2 * DEC));
    t.speed += Math.sign(want - t.speed) * Math.min(Math.abs(want - t.speed), (want > t.speed ? ACC : DEC * 2.5) * dt);
    t.speed = Math.max(0, t.speed);
    t.s = Math.min(t.s + t.speed * dt, stopAt);
    if (stopAt - t.s < 0.4 && stopAt <= t.s + block + 0.5) {
      t.speed = 0; t.s = stopAt;
      if (f) { t.dwell = DWELL; t.currentStop = f.name; } else { t.atEnd = true; t.currentStop = R.ends[1] || null; }
    }
  }
  // at the end of a run: reverse onto the next run, once its first berth is clear
  function turn(t) {
    const nr = (t.ri + 1) % t.runs.length, R = t.runs[nr], p = R.at(BERTH * 0.5);
    for (const o of trams) {
      if (o === t) continue;
      for (const c of o.carriages) if ((c.x - p.x) ** 2 + (c.z - p.z) ** 2 < (TRAIN * 0.5 + 8) ** 2) return false;
    }
    t.ri = nr; t.s = BERTH; t.atEnd = false; t.speed = 0;
    t.dwell = TURN_DWELL;
    t.currentStop = R.ends[0] || null;
    return true;
  }
  const tmp = {}, tmp2 = {};
  function place(t) {
    const R = t.runs[t.ri];
    let vis = false;
    for (let i = 0; i < N; i++) {
      const front = t.s - i * (CAR_LEN + GAP);
      const a = R.at(front, tmp), b = R.at(front - CAR_LEN, tmp2);
      const c = t.carriages[i];
      c.x = (a.x + b.x) / 2; c.z = (a.z + b.z) / 2; c.heading = Math.atan2(a.x - b.x, a.z - b.z);
      c.visible = inMap(c.x, c.z); vis = vis || c.visible;
    }
    t.visible = vis;
  }
  // Each tram claims its path from its rear to its stopping distance ahead (points every 2 m, d measured from its
  // front). Where two claims come within 2.6 m of each other (the other track of a pair is 3.6 m away) the trams are
  // in conflict, and the one nearer to it (its body already standing there, or its front closer; the lower index
  // breaking a tie) has the right of way: the other stops short of the conflict. One distance per tram per pair, so
  // two trams can never both wait on each other. Following, crossing and merging all come out of the same rule.
  const STEP = 2, NEAR = 2.6 * 2.6;
  function claim(t) {
    const R = t.runs[t.ri], reach = Math.max(18, (t.speed * t.speed) / (2 * DEC) + 14);
    const c = t.claim || (t.claim = []);
    let n = 0;
    for (let d = -TRAIN; d <= reach; d += STEP) {
      if (t.s + d > R.total) break;
      const p = R.at(t.s + d, c[n] || (c[n] = {}));
      p.d = d; n++;
    }
    c.n = n;
  }
  function lookAhead(t, ti) {
    t.obstacle = Infinity; t.blockedBy = null;
    const A = t.claim, head = t.carriages[0];
    for (let oi = 0; oi < trams.length; oi++) {
      const o = trams[oi];
      if (o === t) continue;
      const oc = o.carriages[0];
      if ((oc.x - head.x) ** 2 + (oc.z - head.z) ** 2 > 200 * 200) continue;
      const Q = o.claim;
      let dt = Infinity, dq = Infinity, first = Infinity; // nearest conflict for each, t's first one ahead
      for (let i = 0; i < A.n; i++) {
        const p = A[i];
        for (let k = 0; k < Q.n; k++) {
          const q = Q[k], dx = p.x - q.x, dz = p.z - q.z;
          if (dx * dx + dz * dz > NEAR) continue;
          if (p.d < dt) dt = p.d;
          if (q.d < dq) dq = q.d;
          if (p.d > 0 && p.d < first) first = p.d;
        }
      }
      if (dt === Infinity || first === Infinity) continue;
      if ((dq < dt - 0.5 || (Math.abs(dq - dt) <= 0.5 && oi < ti)) && first < t.obstacle) { t.obstacle = first; t.blockedBy = o; }
    }
  }

  // spread each service's trams evenly round its cycle: time one tram round, then run each on by its share
  const alone = (t, secs) => { for (let e = 0; e < secs; e += 0.25) { t.obstacle = Infinity; drive(t, 0.25); if (t.atEnd) { t.ri = (t.ri + 1) % t.runs.length; t.s = BERTH; t.atEnd = false; t.dwell = TURN_DWELL; } } };
  for (const line of lines) for (const svc of line.services) {
    const mine = trams.filter((t) => t.svc === svc);
    if (!mine.length) continue;
    const probe = { ...mine[0], ri: 0, s: BERTH, speed: 0, dwell: 0 };
    let T = 0;
    while (T < 20000) { alone(probe, 1); T += 1; if (probe.ri === 0 && probe.s <= BERTH + 1e-6 && probe.dwell > 0 && T > 60) break; }
    svc.cycle = T;
    mine.forEach((t, k) => { alone(t, (k * T) / mine.length); t.speed = 0; t.currentStop = null; });
  }

  // ---------- carriages: one instanced mesh per material, cab parts on the end cars ----------
  // The body meshes share one instance-matrix buffer (every carriage), the cab meshes another (the end cars). Only
  // carriages in (or just outside, for their shadows) the camera's view are written, so the meshes draw nothing
  // when no tram is in sight.
  const count = trams.length * N;
  const bodyM = new THREE.InstancedBufferAttribute(new Float32Array(count * 16), 16).setUsage(THREE.DynamicDrawUsage);
  const cabM = new THREE.InstancedBufferAttribute(new Float32Array(trams.length * 2 * 16), 16).setUsage(THREE.DynamicDrawUsage);
  const bodies = [], cabs = [];
  const addParts = (parts, n, attr, list) => {
    for (const [mat, geos] of parts) {
      const im = new THREE.InstancedMesh(mergeGeometries(geos), mat, n);
      im.instanceMatrix = attr;
      im.castShadow = true; im.receiveShadow = false; im.frustumCulled = false; // culled per carriage below
      scene.add(im); list.push(im);
    }
  };
  addParts(tramCarParts({ len: CAR_LEN }), count, bodyM, bodies);
  addParts(tramCarParts({ len: CAR_LEN, cab: true }), trams.length * 2, cabM, cabs);
  // a rotation about y and a translation
  const put = (arr, o, x, z, h) => {
    const c = Math.cos(h), s = Math.sin(h);
    arr[o] = c; arr[o + 1] = 0; arr[o + 2] = -s; arr[o + 3] = 0;
    arr[o + 4] = 0; arr[o + 5] = 1; arr[o + 6] = 0; arr[o + 7] = 0;
    arr[o + 8] = s; arr[o + 9] = 0; arr[o + 10] = c; arr[o + 11] = 0;
    arr[o + 12] = x; arr[o + 13] = 0; arr[o + 14] = z; arr[o + 15] = 1;
  };
  const frustum = new THREE.Frustum(), PV = new THREE.Matrix4(), sphere = new THREE.Sphere(new THREE.Vector3(), 22);
  let camera = null;
  function writeInstances() {
    let i = 0, j = 0;
    const A = bodyM.array, C = cabM.array;
    if (camera) { camera.updateMatrixWorld(); PV.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(PV); }
    for (const t of trams) {
      for (const c of t.carriages) {
        if (!c.visible) continue;
        if (camera) { sphere.center.set(c.x, 2, c.z); if (!frustum.intersectsSphere(sphere)) continue; } // 22 m: the carriage and its shadow
        put(A, 16 * i++, c.x, c.z, c.heading);
        if (c.cab) put(C, 16 * j++, c.x, c.z, c.cab < 0 ? c.heading + Math.PI : c.heading); // the rear cab faces backwards
      }
    }
    for (const m of bodies) { m.count = i; m.visible = i > 0; }
    for (const m of cabs) { m.count = j; m.visible = j > 0; }
    bodyM.needsUpdate = true; cabM.needsUpdate = true;
  }

  // ---------- the fleet as one tram-like object (HUD, audio, traffic, collisions) ----------
  let near = trams[0];
  const visible = [];
  const fleet = {
    trams,
    // the view the carriages are culled against (main.js hands over its camera)
    set camera(c) { camera = c; },
    get carriages() { return visible; },
    get speed() { return near ? near.speed : 0; },
    get currentStop() { return near && near.visible && visible.length ? near.currentStop : null; },
    get name() { return near ? near.name : ''; },
    update(dt, focus) {
      dt = Math.min(dt, 0.1);
      for (const t of trams) claim(t);
      trams.forEach(lookAhead);
      for (const t of trams) {
        drive(t, dt);
        if (t.atEnd && t.dwell <= 0) { if (t.endWait === undefined) t.endWait = TURN_DWELL * 0.5; t.endWait -= dt; if (t.endWait <= 0 && turn(t)) t.endWait = undefined; }
        place(t);
      }
      writeInstances();
      // nearest visible tram first: the one the HUD stop label and the gong follow
      visible.length = 0;
      if (focus) {
        let bd = Infinity;
        for (const t of trams) { if (!t.visible) continue; const c = t.carriages[0], d = (c.x - focus.x) ** 2 + (c.z - focus.z) ** 2; if (d < bd) { bd = d; near = t; } }
      }
      if (near && near.visible) for (const c of near.carriages) if (c.visible) visible.push(c);
      for (const t of trams) if (t !== near) for (const c of t.carriages) if (c.visible) visible.push(c);
    },
    // circle vs carriage boxes, for the player car
    collide(c, r) {
      let hit = null;
      for (const t of trams) for (const k of t.carriages) {
        if (!k.visible) continue;
        const dx = c.x - k.x, dz = c.z - k.z;
        if (dx * dx + dz * dz > 100) continue;
        const cs = Math.cos(k.heading), sn = Math.sin(k.heading);
        // world -> local (inverse of rotation about y)
        const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
        const qx = Math.max(-k.hx, Math.min(k.hx, lx)), qz = Math.max(-k.hz, Math.min(k.hz, lz));
        let ex = lx - qx, ez = lz - qz, depth;
        const d = Math.hypot(ex, ez);
        if (d > 1e-4) {
          if (d >= r) continue;
          depth = r - d; ex /= d; ez /= d;
        } else {
          // centre inside the box: push out along the shallowest axis
          const px = k.hx - Math.abs(lx), pz = k.hz - Math.abs(lz);
          if (px < pz) { ex = Math.sign(lx) || 1; ez = 0; depth = px + r; } else { ex = 0; ez = Math.sign(lz) || 1; depth = pz + r; }
        }
        // local -> world
        const nx = ex * cs + ez * sn, nz = -ex * sn + ez * cs;
        c.x += nx * depth; c.z += nz * depth;
        if (!hit || depth > hit.depth) hit = { nx, nz, depth };
      }
      return hit;
    },
  };
  for (const t of trams) place(t);
  fleet.update(0);
  return fleet;
}

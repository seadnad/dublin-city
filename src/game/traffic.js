// AI traffic: cars and buses follow the street graph, keeping LEFT, using pure-pursuit steering.
import * as THREE from 'three';
import { world, v2, laneOffset, hasParking } from '../world/geo.js';
import { createFleet } from './fleet.js';
import { rng } from '../world/textures.js';
import { addBox } from './collision.js';

const rand = rng(1916);
// Irish car colours: mostly silver, grey, black and white, a few darker blues, reds and greens
const PAINT = ['#b7babd', '#b7babd', '#8d9195', '#5f6368', '#1a1c1e', '#1a1c1e', '#e9e9e6', '#e9e9e6', '#23345a', '#7d1d1f', '#23402f', '#a99a80', '#6d8196', '#4a3b30']
  .map((h) => new THREE.Color(h));
const paint = () => PAINT[Math.floor(rand() * PAINT.length)];
const pickKind = () => { const r = rand(); return r < 0.34 ? 'hatch' : r < 0.62 ? 'saloon' : r < 0.84 ? 'suv' : 'van'; };
const leftOf = (d) => ({ x: d.z, z: -d.x });

function laneLine(edge, extra = 0) {
  const d = v2.norm(v2.sub(edge.to, edge.from));
  const l = leftOf(d), o = laneOffset(edge.way) + extra;
  return { a: { x: edge.from.x + l.x * o, z: edge.from.z + l.z * o }, b: { x: edge.to.x + l.x * o, z: edge.to.z + l.z * o }, d };
}

function pickNext(edge, isBus) {
  // legal moves only: one-ways, pedestrian zones and (for buses) lanes are respected
  const options = edge.to.edges.filter((e) => e.to !== edge.from && e.car && (!isBus || e.way.type !== 'lane'));
  if (!options.length) return edge.to.edges.find((e) => e.to === edge.from && e.car) || edge.to.edges.find((e) => e.to === edge.from) || edge.to.edges[0];
  // prefer continuing on the same street or bigger roads; access-only streets are rarely used as a through route
  const weights = options.map((e) => (e.way === edge.way ? 2.5 : 1) * (e.way.type === 'lane' ? 0.25 : 1) * (e.way.access === 'destination' ? 0.3 : 1));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) { r -= weights[i]; if (r <= 0) return options[i]; }
  return options[0];
}

const drivable = world.edges.filter((e) => e.len > 15 && e.way.type !== 'lane' && e.car);

class AICar {
  constructor(handle, isBus) {
    this.h = handle;
    this.isBus = isBus;
    this.length = handle.L;
    this.radius = isBus ? 1.3 : 1.0;
    this.pos = { x: 0, z: 0 };
    this.heading = 0;
    this.speed = 0;
    this.stunned = 0;
    this.blockedTime = 0;
    this.ignoreOthers = 0;
  }

  place(edge, s) {
    this.edge = edge;
    this.next = pickNext(edge, this.isBus);
    const L = laneLine(edge);
    const t = Math.min(0.9, s / edge.len);
    this.pos = v2.lerp(L.a, L.b, t);
    this.heading = Math.atan2(L.d.x, L.d.z);
    this.cruise = edge.way.speed * (0.75 + rand() * 0.3) * (this.isBus ? 0.8 : 1);
    this.speed = this.cruise * 0.5;
  }

  // Point `look` metres ahead along the lane path (current edge then the next one).
  target(look) {
    const L1 = laneLine(this.edge, this.pull || 0);
    const c = v2.sub(this.pos, L1.a);
    const along = v2.dot(c, L1.d);
    const len1 = v2.len(v2.sub(L1.b, L1.a));
    const s = along + look;
    if (s < len1) return { p: v2.add(L1.a, v2.scale(L1.d, Math.max(0, s))), along, len1 };
    const L2 = laneLine(this.next, this.pull || 0);
    return { p: v2.add(L2.a, v2.scale(L2.d, Math.min(s - len1, v2.len(v2.sub(L2.b, L2.a))))), along, len1 };
  }

  update(dt, ctx) {
    const look = 5 + this.speed * 0.5;
    const tg = this.target(look);
    if (tg.along > tg.len1 - 0.5) {
      this.edge = this.next;
      this.next = pickNext(this.edge, this.isBus);
      this.cruise = this.edge.way.speed * (0.75 + rand() * 0.3) * (this.isBus ? 0.8 : 1);
    }

    // speed planning: slow for turns and for anything ahead
    let want = this.cruise;
    const remaining = tg.len1 - tg.along;
    const d1 = v2.norm(v2.sub(this.edge.to, this.edge.from)), d2 = v2.norm(v2.sub(this.next.to, this.next.from));
    const turn = 1 - v2.dot(d1, d2); // 0 straight .. 2 u-turn
    if (turn > 0.15 && remaining < 25) want = Math.min(want, 4 + (1 - Math.min(1, turn)) * 6 + remaining * 0.25);
    // traffic lights: stop at the line on red, and on amber if there is room to
    const sig = ctx.signals && ctx.signals.stateFor(this.edge);
    if (sig && sig.state !== 'green') {
      const toLine = remaining - sig.stopBack - this.length / 2;
      if (toLine > -0.5 && (sig.state === 'red' || toLine > 8)) want = Math.min(want, Math.max(0, toLine * 0.55 - 0.3));
    }

    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const clear = ctx.clearAhead(this, fx, fz);
    if (clear.dist < Infinity) {
      want = Math.min(want, Math.max(0, (clear.dist - 3) * 0.7));
      if (want < 0.5 && !clear.player) this.blockedTime += dt;
    } else this.blockedTime = Math.max(0, this.blockedTime - dt);
    if (this.blockedTime > 5) { this.ignoreOthers = 2.5; this.blockedTime = 0; }
    this.ignoreOthers = Math.max(0, this.ignoreOthers - dt);
    if (this.stunned > 0) { this.stunned -= dt; want = 0; }
    // a Garda car coming up behind with the siren on: ease over to the kerb and slow down
    const pl = ctx.player;
    let yielding = false;
    if (pl && pl.siren) {
      const rx = pl.pos.x - this.pos.x, rz = pl.pos.z - this.pos.z;
      const behind = -(rx * fx + rz * fz), lat = Math.abs(rx * fz - rz * fx);
      yielding = behind > 0 && behind < 45 && lat < 6;
    }
    this.pull = (this.pull || 0) + ((yielding ? 1.6 : 0) - (this.pull || 0)) * Math.min(1, dt * 1.5);
    if (yielding) want = Math.min(want, 3);

    const acc = want > this.speed ? 2.6 : 7;
    this.speed += Math.sign(want - this.speed) * Math.min(Math.abs(want - this.speed), acc * dt);

    // pure pursuit steering
    const to = v2.sub(tg.p, this.pos);
    const desired = Math.atan2(to.x, to.z);
    let dh = desired - this.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    const maxYaw = 0.25 + this.speed * 0.12;
    this.heading += Math.max(-maxYaw * dt, Math.min(maxYaw * dt, dh * Math.min(1, dt * 5)));
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;

    ctx.fleet.set(this.h, this.pos.x, this.pos.z, this.heading, this.speed, dt);
  }

  // circles approximating the body, for collisions with the player
  circles() {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const n = this.isBus ? 4 : 2, half = this.length / 2 - this.radius;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0 : -half + (2 * half * i) / (n - 1);
      out.push({ x: this.pos.x + fx * k, z: this.pos.z + fz * k, r: this.radius });
    }
    return out;
  }
}

// Kerbside parking bays along wide streets, away from junction mouths.
function parkingSpots(max) {
  const spots = [];
  for (const way of world.ways) {
    if (!hasParking(way)) continue;
    for (let k = 0; k < way.nodeIds.length - 1; k++) {
      const A = world.nodes.get(way.nodeIds[k]), Bn = world.nodes.get(way.nodeIds[k + 1]);
      const d = v2.norm(v2.sub(Bn, A)), L = v2.len(v2.sub(Bn, A));
      const clearA = A.edges.length > 2 ? 16 : 4, clearB = Bn.edges.length > 2 ? 16 : 4;
      for (const side of [1, -1]) {
        const left = { x: d.z * side, z: -d.x * side };
        const off = way.width / 2 - 1.08;
        for (let s = clearA; s < L - clearB; s += 5.7) {
          if (rand() < 0.22) continue; // gaps between parked cars
          const p = v2.add(v2.lerp(A, Bn, s / L), v2.scale(left, off));
          spots.push({ x: p.x, z: p.z, heading: Math.atan2(d.x * side, d.z * side) });
        }
      }
    }
  }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  return spots.slice(0, max);
}

export function createTraffic(scene, { cars = 16, buses = 4, taxis = 4, parked = 300 } = {}) {
  const spots = parkingSpots(parked);
  // decide every vehicle's kind first so the fleet can size its instanced meshes
  const aiKinds = [];
  for (let i = 0; i < cars; i++) aiKinds.push(i < taxis ? 'taxi' : pickKind());
  const parkedKinds = spots.map(() => pickKind());
  const counts = { hatch: 0, saloon: 0, suv: 0, van: 0, taxi: 0, bus: buses };
  for (const k of [...aiKinds, ...parkedKinds]) counts[k]++;
  const fleet = createFleet(scene, counts);

  const list = [];
  for (let i = 0; i < cars + buses; i++) {
    const isBus = i >= cars;
    const kind = isBus ? 'bus' : aiKinds[i];
    const handle = fleet.add(kind, kind === 'taxi' ? new THREE.Color(rand() < 0.5 ? '#1a1c1e' : '#b7babd') : paint());
    handle.lit = true; // moving vehicles light the road at night
    const ai = new AICar(handle, isBus);
    const e = drivable[Math.floor(rand() * drivable.length)];
    ai.place(e, rand() * e.len);
    list.push(ai);
  }
  spots.forEach((sp, i) => {
    const h = fleet.add(parkedKinds[i], paint());
    fleet.set(h, sp.x, sp.z, sp.heading);
    addBox(sp.x, sp.z, h.W / 2, h.L / 2, sp.heading);
  });

  let player = null, tram = null, signals = null;
  const ctx = {
    fleet,
    get player() { return player; },
    get signals() { return signals; },
    // distance to the nearest thing in our lane ahead (Infinity if clear)
    clearAhead(me, fx, fz) {
      const res = { dist: Infinity, player: false };
      const test = (x, z, extra, isPlayer) => {
        const dx = x - me.pos.x, dz = z - me.pos.z;
        const along = dx * fx + dz * fz;
        if (along <= 0 || along > 26) return;
        if (Math.abs(dx * fz - dz * fx) > 2.4) return; // only things in our lane
        const d = along - me.length / 2 - extra;
        if (d < res.dist) { res.dist = d; res.player = isPlayer; }
      };
      if (player) test(player.pos.x, player.pos.z, 2.2, true);
      if (!me.ignoreOthers) for (const o of list) if (o !== me) test(o.pos.x, o.pos.z, o.length / 2, false);
      if (tram) for (const c of tram.carriages) test(c.x, c.z, 6, false);
      return res;
    },
  };

  const tmp = new THREE.Vector3();
  return {
    list,
    setPlayer(p) { player = p; },
    setTram(t) { tram = t; },
    setSignals(s) { signals = s; },
    fleet,
    parkedCount: spots.length,
    setLights: (v) => fleet.setLights(v),
    update(dt, camera) {
      for (const ai of list) {
        ai.update(dt, ctx);
        // recycle far-away cars to somewhere near the player, out of view
        if (player) {
          const dx = ai.pos.x - player.pos.x, dz = ai.pos.z - player.pos.z;
          if (dx * dx + dz * dz > 380 * 380) {
            for (let tries = 0; tries < 12; tries++) {
              const e = drivable[Math.floor(rand() * drivable.length)];
              const mx = (e.from.x + e.to.x) / 2, mz = (e.from.z + e.to.z) / 2;
              const d = Math.hypot(mx - player.pos.x, mz - player.pos.z);
              tmp.set(mx, 1, mz).project(camera);
              const inView = tmp.z < 1 && Math.abs(tmp.x) < 1.1;
              if (d > 120 && d < 320 && !inView) { ai.place(e, e.len * 0.3); break; }
            }
          }
        }
      }
      fleet.commit();
    },
    // push a circle (player) out of AI vehicles
    collide(c, r) {
      let hit = null;
      for (const ai of list) {
        const dx0 = ai.pos.x - c.x, dz0 = ai.pos.z - c.z;
        if (dx0 * dx0 + dz0 * dz0 > 100) continue;
        for (const k of ai.circles()) {
          let dx = c.x - k.x, dz = c.z - k.z;
          const d = Math.hypot(dx, dz), R = r + k.r;
          if (d >= R || d < 1e-4) continue;
          dx /= d; dz /= d;
          const depth = R - d;
          c.x += dx * depth; c.z += dz * depth;
          if (!hit || depth > hit.depth) hit = { nx: dx, nz: dz, depth };
          ai.stunned = 1.5;
          ai.speed *= 0.5;
        }
      }
      return hit;
    },
  };
}

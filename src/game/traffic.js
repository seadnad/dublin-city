// AI traffic: cars and buses follow the street graph, keeping LEFT, using pure-pursuit steering.
import * as THREE from 'three';
import { world, v2 } from '../world/geo.js';
import { makeCar, makeBus } from './vehicles.js';
import { rng } from '../world/textures.js';

const rand = rng(1916);
const COLORS = [0xb8262b, 0x2b4e8c, 0xe8e8e8, 0x222222, 0x8a8f96, 0x6b2a5e, 0xc9a227, 0x3d6b4a, 0x9fb7c9, 0x5a3a2a];

const laneOffset = (way) => (way.type === 'boulevard' ? 7 : Math.min(way.width / 4, 3));
const leftOf = (d) => ({ x: d.z, z: -d.x });

function laneLine(edge) {
  const d = v2.norm(v2.sub(edge.to, edge.from));
  const l = leftOf(d), o = laneOffset(edge.way);
  return { a: { x: edge.from.x + l.x * o, z: edge.from.z + l.z * o }, b: { x: edge.to.x + l.x * o, z: edge.to.z + l.z * o }, d };
}

function pickNext(edge, isBus) {
  const options = edge.to.edges.filter((e) => e.to !== edge.from && (!isBus || e.way.type !== 'lane'));
  if (!options.length) return edge.to.edges.find((e) => e.to === edge.from) || edge.to.edges[0];
  // prefer continuing on the same street or bigger roads
  const weights = options.map((e) => (e.way === edge.way ? 2.5 : 1) * (e.way.type === 'lane' ? 0.25 : 1));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) { r -= weights[i]; if (r <= 0) return options[i]; }
  return options[0];
}

const drivable = world.edges.filter((e) => e.len > 15 && e.way.type !== 'lane');

class AICar {
  constructor(mesh, isBus) {
    this.mesh = mesh;
    this.isBus = isBus;
    this.length = mesh.userData.length;
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
    const L1 = laneLine(this.edge);
    const c = v2.sub(this.pos, L1.a);
    const along = v2.dot(c, L1.d);
    const len1 = v2.len(v2.sub(L1.b, L1.a));
    const s = along + look;
    if (s < len1) return { p: v2.add(L1.a, v2.scale(L1.d, Math.max(0, s))), along, len1 };
    const L2 = laneLine(this.next);
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

    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const clear = ctx.clearAhead(this, fx, fz);
    if (clear.dist < Infinity) {
      want = Math.min(want, Math.max(0, (clear.dist - 3) * 0.7));
      if (want < 0.5 && !clear.player) this.blockedTime += dt;
    } else this.blockedTime = Math.max(0, this.blockedTime - dt);
    if (this.blockedTime > 5) { this.ignoreOthers = 2.5; this.blockedTime = 0; }
    this.ignoreOthers = Math.max(0, this.ignoreOthers - dt);
    if (this.stunned > 0) { this.stunned -= dt; want = 0; }

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

    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
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

export function createTraffic(scene, { cars = 16, buses = 4 } = {}) {
  const list = [];
  for (let i = 0; i < cars + buses; i++) {
    const isBus = i >= cars;
    const mesh = isBus ? makeBus() : makeCar({ color: COLORS[i % COLORS.length], taxi: i % 5 === 0 });
    scene.add(mesh);
    const ai = new AICar(mesh, isBus);
    const e = drivable[Math.floor(rand() * drivable.length)];
    ai.place(e, rand() * e.len);
    list.push(ai);
  }

  let player = null, tram = null;
  const ctx = {
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

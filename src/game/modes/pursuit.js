// Garda Pursuit: Control radios a callout (a crime on a real street). Get there, and the suspect runs once they see
// or hear you. Take them down: a PIT (nudge a rear corner at speed) spins them out, rams damage the car (smoke,
// slower, and a wrecked car means they run on foot), and a stopped suspect is arrested if you hold them there,
// best boxed in from the front or with backup. Later calls bring quicker, cleverer suspects, backup Garda cars and
// roadblocks. The shift clock gains time for each arrest; lose the suspect for too long and the call is lost.
import { Color } from 'three';
import { world, v2, laneOffset } from '../../world/geo.js';
import { resolveCircle } from '../collision.js';
import { TYPES } from '../fleet.js';
import { pickCallout, hotCallout } from './callouts.js';
import { makeGardaUnit, makeCones, makeRunner, addHazards, setHazards, makeSmoke } from './pursuitkit.js';

// ---- tuning ----
export const TUNE = {
  shiftTime: 210, arrestBonusTime: 60, lostPenaltyTime: 15,
  // the suspect notices you inside these distances (siren on / off) and runs
  spotSiren: 190, spotQuiet: 65,
  // lost them: further than lostDist for lostTime seconds (on foot: footLostDist)
  lostDist: 330, lostTime: 12, footLostDist: 140,
  // suspect top speed (m/s), rising each round; damage takes up to damageSlow of it away
  topSpeed: 18, topPerLevel: 1.5, topMax: 29, damageSlow: 0.4,
  // rams: damage per m/s of closing speed above ramMin; a hard ram (above ramStun) makes them lurch
  ramMin: 2.5, ramDamage: 0.035, ramStun: 8,
  // PIT: a nudge on a rear corner, moving with them, while they're doing at least pitMinSpeed
  pitMinSpeed: 7, pitPush: 0.8, pitDamage: 0.12, pitSpin: 1.25, pitStall: 3.2, pitBonus: 100,
  // arrest: they're (nearly) stopped, you're within arrestDist and slow: hold for arrestTime (boxed in: quicker)
  arrestTime: 2.5, arrestDist: 8, arrestPlayerSpeed: 5, arrestSuspectSpeed: 2.5, boxedRate: 1.7,
  // on foot: stop beside them (footDist, slower than footPlayerSpeed) for footHold seconds
  runSpeed: 6.2, footDist: 4.5, footPlayerSpeed: 3, footHold: 0.7, runnerChance: 0.3,
  // radio call-ins: show the suspect on the map for pingTime s; the dispatch fix lasts as long
  pingCharges: 3, pingTime: 8, sightDist: 260,
  // backup Garda cars by round (index = rounds won so far, last value repeats); roadblocks from round roadblockFrom
  backups: [0, 1, 1, 2], roadblockFrom: 1, roadblockEvery: 26, roadblockLife: 40,
  crashPenalty: 25, crashImpact: 9,
};

const leftOf = (d) => ({ x: d.z, z: -d.x });
const tint = new Color();
const NONE = [];
const open = (e) => !e.way.pedestrian && e.way.access !== 'pedestrian';
const ESCAPE = /Quay|Chesterfield|Canal|Circular|Conyngham|Grand Parade|Mespil|Wilton|Charlemont|Adelaide|Herbert|Percy|Mount Street|Military Road/;
const drivable = world.edges.filter((e) => e.len > 25 && e.car && !e.way.bridge && e.way.type !== 'lane');
const SIZE = { coupe: { L: 4.4, W: 1.86 } };
const sizeOf = (kind) => SIZE[kind] || TYPES[kind] || TYPES.hatch;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
const segDist = (p, e) => {
  const dx = e.to.x - e.from.x, dz = e.to.z - e.from.z, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - e.from.x) * dx + (p.z - e.from.z) * dz) / l2));
  return Math.hypot(p.x - e.from.x - dx * t, p.z - e.from.z - dz * t);
};

// A car (or a runner) following the street graph: keeps its lane (or the pavement), overtakes what blocks it,
// brakes for trams, slides and spins after a PIT, and can't drive through walls.
class Driver {
  constructor(mesh, L, { pave = false } = {}) {
    this.mesh = mesh; this.length = L; this.pave = pave;
    this.pos = { x: 0, z: 0 }; this.heading = 0; this.speed = 0; this.offset = 0;
    this.spin = 0; this.yawRate = 0; this.vel = { x: 0, z: 0 }; this.stall = 0; this.wobble = 0;
    this.blocked = 0; // distance to something right in front that can't be got round (Infinity if clear)
  }
  laneOff(e) { return this.pave ? e.way.width / 2 + 1.3 : laneOffset(e.way); }
  place(edge, t, choose) {
    this.edge = edge;
    const d = v2.norm(v2.sub(edge.to, edge.from)), l = leftOf(d);
    this.offset = this.laneOff(edge);
    const p = v2.lerp(edge.from, edge.to, t);
    this.pos = { x: p.x + l.x * this.offset, z: p.z + l.z * this.offset };
    this.heading = Math.atan2(d.x, d.z);
    this.spin = 0; this.stall = 0; this.speed = 0;
    this.next = choose(edge);
  }
  // after a spin: carry on along whichever nearby edge best matches where the car now points
  reacquire(choose) {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let best = this.edge, bs = Infinity;
    for (const e of [this.edge, this.next, ...this.edge.from.edges, ...this.edge.to.edges]) {
      if (!e || !open(e)) continue;
      const d = v2.norm(v2.sub(e.to, e.from));
      const s = segDist(this.pos, e) + (1 - (d.x * fx + d.z * fz)) * 8;
      if (s < bs) { bs = s; best = e; }
    }
    this.edge = best; this.next = choose(best);
  }
  kick(yawRate, vx, vz, time) { this.spin = time; this.yawRate = yawRate; this.vel.x = vx; this.vel.z = vz; }
  // want: target speed; obstacles: [{ pos, r }]; trams: the Luas fleet
  step(dt, want, choose, obstacles, trams) {
    if (this.spin > 0) {
      this.spin -= dt;
      const k = Math.exp(-dt * 1.8);
      this.vel.x *= k; this.vel.z *= k; this.yawRate *= Math.exp(-dt * 1.6);
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      this.heading += this.yawRate * dt;
      this.speed = Math.hypot(this.vel.x, this.vel.z);
      this.walls();
      if (this.spin <= 0) { this.speed = 0; this.reacquire(choose); }
      this.pose(dt, 0);
      return;
    }
    let e = this.edge;
    let d = v2.norm(v2.sub(e.to, e.from));
    let along = v2.dot(v2.sub(this.pos, e.from), d);
    if (e.len - along < 1.5) {
      this.edge = e = this.next; this.next = choose(e);
      d = v2.norm(v2.sub(e.to, e.from)); along = v2.dot(v2.sub(this.pos, e.from), d);
    }
    const remaining = e.len - along, l = leftOf(d);
    // overtake: something in our lane ahead -> swing into the other lane; right in front in both -> stop
    const baseOff = this.laneOff(e);
    let blockedOwn = false, blockedOther = false, near = Infinity;
    this.bully = Math.max(0, (this.bully || 0) - dt);
    for (const o of obstacles) {
      if (o.soft && this.bully > 0) continue; // stuck in traffic: barge through it (shove() pushes cars aside)
      const rx = o.pos.x - this.pos.x, rz = o.pos.z - this.pos.z;
      const ahead = rx * d.x + rz * d.z;
      if (ahead <= 0 || ahead > 24) continue;
      const lat = rx * l.x + rz * l.z, w = 1.3 + (o.r || 1);
      if (Math.abs(lat - this.offset) < w) { if (ahead < near) near = ahead; }
      if (Math.abs(lat - baseOff) < w) blockedOwn = true;
      if (Math.abs(lat + baseOff * 0.9) < w && ahead < 14) blockedOther = true;
    }
    const wantOff = blockedOwn && !blockedOther && !this.pave ? -baseOff * 0.9 : baseOff;
    this.offset += (wantOff - this.offset) * Math.min(1, dt * 2.5);
    this.blocked = near;
    if (near < Infinity) {
      const w0 = want;
      want = Math.min(want, Math.max(0, (near - this.length * 0.5 - 1.5) * 1.1));
      this.stuck = w0 > 4 && want < 1.5 && this.stall <= 0 ? (this.stuck || 0) + dt : 0;
      if (this.aggressive && this.stuck > 1.2) { this.bully = 2.5; this.stuck = 0; }
    } else this.stuck = 0;
    // the Luas: never into a tram (crossing or ahead)
    if (trams) for (const t of trams.trams) for (const c of t.carriages) {
      if (!c.visible) continue;
      const rx = c.x - this.pos.x, rz = c.z - this.pos.z;
      if (rx * rx + rz * rz > 60 * 60) continue;
      const ahead = rx * d.x + rz * d.z, lat = rx * l.x + rz * l.z;
      if (ahead > -3 && ahead < 10 + this.speed * 1.3 && Math.abs(lat) < 9) want = Math.min(want, Math.max(0, (ahead - 9) * 0.6));
    }
    // corners
    const dn = v2.norm(v2.sub(this.next.to, this.next.from));
    const turn = 1 - v2.dot(d, dn);
    if (!this.pave && turn > 0.2 && remaining < 35) want = Math.min(want, 7 + (1 - Math.min(1, turn)) * 8 + remaining * 0.35);
    if (this.stall > 0) { this.stall -= dt; want = 0; }
    const acc = want > this.speed ? (this.pave ? 5 : 7) : 16;
    this.speed += Math.sign(want - this.speed) * Math.min(Math.abs(want - this.speed), acc * dt);
    // pure pursuit on the lane line, blending into the next edge near the junction
    const look = 5 + Math.max(0, this.speed) * 0.45;
    const s = along + look;
    let target;
    if (s < e.len) target = v2.add(v2.add(e.from, v2.scale(d, s)), v2.scale(l, this.offset));
    else target = v2.add(v2.add(this.next.from, v2.scale(dn, Math.min(s - e.len, this.next.len))), v2.scale(leftOf(dn), this.laneOff(this.next)));
    const to = v2.sub(target, this.pos);
    const dh = Math.atan2(Math.sin(Math.atan2(to.x, to.z) - this.heading), Math.cos(Math.atan2(to.x, to.z) - this.heading));
    const maxYaw = this.pave ? 4 : (0.6 + Math.abs(this.speed) * 0.12) * (1 - this.wobble * 0.3);
    this.heading += Math.max(-maxYaw * dt, Math.min(maxYaw * dt, dh * Math.min(1, dt * 6)));
    if (this.wobble > 0) this.heading += Math.sin(performance.now() / 240) * this.wobble * 0.25 * dt;
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    this.walls();
    this.pose(dt, dh);
  }
  walls() { resolveCircle(this.pos, this.pave ? 0.4 : 0.95); }
  pose(dt, dh) {
    if (this.pave) { this.mesh.position.set(this.pos.x, 0, this.pos.z); this.mesh.rotation.set(0, this.heading, 0); this.mesh.userData.animate(dt, this.speed); return; }
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.set(0, this.heading, Math.max(-0.06, Math.min(0.06, -dh * 0.15)));
    this.mesh.userData.update(this.speed, dt, Math.max(-0.5, Math.min(0.5, dh)));
  }
  circles() {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading), k = Math.max(0.6, this.length / 2 - 0.95);
    return [{ x: this.pos.x + fx * k, z: this.pos.z + fz * k, r: 1.0 }, { x: this.pos.x - fx * k, z: this.pos.z - fz * k, r: 1.0 }];
  }
  get fwd() { return { x: Math.sin(this.heading), z: Math.cos(this.heading) }; }
}

export function createPursuit({ scene, makeSuspectMesh, player, traffic, tram, ui, audio, save, freeze = () => {} }) {
  let active = false, time = 0;
  // shift
  let clock = 0, level = 0, caught = 0, score = 0, charges = 0, lostCount = 0, startLevel = 0;
  // round
  let callout = null, lastCallout = null, stage = 'idle'; // 'unaware' | 'flee' | 'foot' | 'beat'
  let suspect = null, runner = null, mesh = null, kind = null;
  let damage = 0, arrestT = 0, footT = 0, lostT = 0, pits = 0, roundT = 0, roundPenalty = 0, ranAway = false;
  let ping = 0, lastSeen = null, contactCD = 0, crashCD = 0, beatT = 0, beatWin = false, beatResult = null;
  let roadblockT = 0, roadblock = null;
  const meshes = {}, backups = [], obstacles = [], extras = [];
  let units = null, cones = null, runnerMesh = null, smoke = null;

  function ensureProps() {
    if (units) return;
    units = [makeGardaUnit(), makeGardaUnit(), makeGardaUnit()]; // two backups + the roadblock car
    for (const u of units) { u.visible = false; scene.add(u); }
    cones = makeCones(5); cones.visible = false; scene.add(cones);
    runnerMesh = makeRunner(); runnerMesh.visible = false; scene.add(runnerMesh);
    smoke = makeSmoke(scene);
  }
  function suspectMesh(k, color) {
    if (!meshes[k]) {
      const m = makeSuspectMesh(k);
      m.rotation.order = 'YXZ';
      const sz = sizeOf(k);
      addHazards(m, sz.L, sz.W, k === 'van' ? 0.95 : 0.78);
      scene.add(m);
      meshes[k] = m;
    }
    const m = meshes[k];
    if (color && m.userData.body && m.userData.body.instanceColor) { m.userData.body.setColorAt(0, tint.set(color)); m.userData.body.instanceColor.needsUpdate = true; }
    return m;
  }

  // ---- route choices ----
  const threatGain = (e) => {
    // how much further from the player (and the backup cars) this edge takes us
    let g = Math.sqrt(dist2(e.to, player.pos)) - Math.sqrt(dist2(e.from, player.pos));
    for (const b of backups) if (b.on) g += 0.5 * (Math.sqrt(dist2(e.to, b.d.pos)) - Math.sqrt(dist2(e.from, b.d.pos)));
    return g;
  };
  const wayBonus = (e, cut) => {
    const w = e.way;
    let b = ESCAPE.test(w.name) ? 30 : 0;
    if (w.type === 'primary' || w.type === 'quay' || w.type === 'boulevard') b += 18;
    else if (w.type === 'secondary') b += 5;
    else if (w.type === 'lane') b += cut ? 15 : -55;
    return b;
  };
  function flee(edge) {
    const opts = edge.to.edges.filter((e) => e.to !== edge.from && open(e));
    if (!opts.length) return edge.to.edges.find((e) => e.to === edge.from) || edge.to.edges[0];
    const clever = Math.min(1, level / 3);
    const cut = Math.random() < 0.08 + level * 0.05;
    let best = opts[0], bs = -Infinity;
    for (const e of opts) {
      let s = threatGain(e) * 1.2 + wayBonus(e, cut) + Math.random() * (40 - clever * 20) - (e.car ? 0 : 25) + Math.min(e.len, 80) * 0.15;
      if (roadblock && segDist(roadblock.pos, e) < 14) s -= 400 * (0.4 + clever);
      if (clever > 0) { // look one junction further
        let b2 = -Infinity;
        for (const e2 of e.to.edges) if (e2.to !== e.from && open(e2)) b2 = Math.max(b2, threatGain(e2) + wayBonus(e2, cut) * 0.5);
        if (b2 > -Infinity) s += b2 * 0.5 * clever;
      }
      if (s > bs) { bs = s; best = e; }
    }
    return best;
  }
  function wander(edge) { // unaware: legal moves, mostly staying on the callout's streets (joyriders do laps)
    const opts = edge.to.edges.filter((e) => e.to !== edge.from && e.car);
    if (!opts.length) return edge.to.edges.find((e) => e.to === edge.from) || edge.to.edges[0];
    const ways = callout ? callout.ways : [];
    let best = opts[0], bs = -Infinity;
    for (const e of opts) {
      const s = (ways.includes(e.way.name) ? 40 : 0) + (e.way === edge.way ? 15 : 0) + (e.way.type === 'lane' ? -30 : 0) + Math.random() * 30;
      if (s > bs) { bs = s; best = e; }
    }
    return best;
  }
  const choose = (e) => (stage === 'unaware' ? wander(e) : flee(e));
  function runFrom(edge) { // on foot: any street or lane, away from the car
    const opts = edge.to.edges.filter((e) => e.to !== edge.from);
    if (!opts.length) return edge.to.edges[0];
    let best = opts[0], bs = -Infinity;
    for (const e of opts) { const s = threatGain(e) + (e.way.type === 'lane' ? 12 : 0) + Math.random() * 15; if (s > bs) { bs = s; best = e; } }
    return best;
  }
  function chaseTo(target) { // backup cars: towards a point, any open street
    return (edge) => {
      const opts = edge.to.edges.filter((e) => e.to !== edge.from && open(e));
      if (!opts.length) return edge.to.edges[0];
      let best = opts[0], bs = Infinity;
      for (const e of opts) { const s = Math.sqrt(dist2(e.to, target())) + (e.car ? 0 : 15); if (s < bs) { bs = s; best = e; } }
      return best;
    };
  }

  // a car barging through traffic pushes the cars it touches aside (they stop for a moment)
  function shove(d) {
    for (const ai of traffic.list) {
      if (ai.isBus) continue;
      const dx = ai.pos.x - d.pos.x, dz = ai.pos.z - d.pos.z, dd = Math.hypot(dx, dz);
      if (dd > 3.2 || dd < 1e-3) continue;
      const k = (3.2 - dd) * 0.6;
      ai.pos.x += (dx / dd) * k; ai.pos.z += (dz / dd) * k;
      ai.stunned = 1.5; ai.speed *= 0.5;
      d.speed *= 0.985;
    }
  }

  // ---- backups and roadblocks ----
  function spawnBackup(i) {
    const b = backups[i] || (backups[i] = { d: null, on: false, mesh: units[i], i });
    const target = () => suspect ? (i === 0 ? v2.add(suspect.pos, v2.scale(suspect.fwd, 30)) : suspect.pos) : player.pos;
    b.choose = chaseTo(target);
    // somewhere out of sight, preferably ahead of the suspect (to cut them off)
    let pick = null;
    const f = suspect.fwd;
    for (let k = 0; k < 300; k++) {
      const e = drivable[Math.floor(Math.random() * drivable.length)];
      const ds = Math.sqrt(dist2(e.from, suspect.pos)), dp = Math.sqrt(dist2(e.from, player.pos));
      const ahead = (e.from.x - suspect.pos.x) * f.x + (e.from.z - suspect.pos.z) * f.z;
      if (ds > 90 && ds < 230 && dp > 80 && (ahead > ds * 0.4 || k > 200)) { pick = e; break; }
    }
    if (!pick) return;
    b.d = new Driver(b.mesh, TYPES.saloon.L);
    b.d.siren = true; b.d.aggressive = true;
    b.d.place(pick, 0.4, b.choose);
    b.mesh.visible = true; b.on = true;
    if (stage === 'flee') ui.radio(`Garda ${['2', '3'][i]} to Control: joining the pursuit`, 3500);
  }
  function updateBackup(b, dt) {
    const d = b.d, ds = Math.sqrt(dist2(d.pos, suspect.pos));
    if (ds > 420) { spawnBackup(b.i); return; }
    obstacles.length = 0;
    for (const ai of traffic.list) obstacles.push({ pos: ai.pos, r: 1, soft: true });
    // close in: drive alongside and in front (unit 2) or tight behind (unit 3); stop to box a stopped suspect
    let want = ds > 60 ? 34 : Math.max(0, suspect.speed + (b.i === 0 ? 6 : 2));
    if (suspect.speed < 3 && ds < 10) want = 0;
    if (b.i === 1 && ds < 10) want = Math.min(want, suspect.speed);
    d.step(dt, want, b.choose, obstacles, tram);
    shove(d);
    // bump the suspect: they lose speed (and some damage) driving into a Garda car
    for (const k of d.circles()) for (const c of suspect.circles()) {
      const dx = c.x - k.x, dz = c.z - k.z, dd = Math.hypot(dx, dz);
      if (dd < 2 && dd > 1e-4) {
        suspect.pos.x += dx / dd * (2 - dd) * 0.5; suspect.pos.z += dz / dd * (2 - dd) * 0.5;
        if (suspect.speed > 4) { damage = Math.min(1, damage + 0.05); suspect.speed *= 0.6; }
      }
    }
    b.mesh.userData.flash(time + b.i * 0.37, true);
  }
  function placeRoadblock() {
    // two to four junctions ahead of the suspect, on a straight long enough to see it coming
    let e = suspect.next;
    for (let k = 0; k < 3 && e; k++) {
      if (k >= 1 && e.len > 30 && !e.way.bridge && e.car) break;
      e = flee(e);
    }
    if (!e || e.len < 30 || e.way.bridge) return;
    const d = v2.norm(v2.sub(e.to, e.from)), l = leftOf(d), off = laneOffset(e.way);
    const c = v2.lerp(e.from, e.to, 0.55);
    const pos = { x: c.x + l.x * off, z: c.z + l.z * off };
    const u = units[2];
    u.position.set(pos.x, 0, pos.z); u.rotation.set(0, Math.atan2(d.x, d.z) + 1.15, 0); u.visible = true;
    // cones across the lane, the car behind them
    const m = new u.matrix.constructor();
    for (let i = 0; i < 5; i++) {
      const lat = off + (i - 2) * 1.1 - 0.4;
      m.makeTranslation(c.x + l.x * lat - d.x * 4, 0, c.z + l.z * lat - d.z * 4);
      cones.setMatrixAt(i, m);
    }
    cones.instanceMatrix.needsUpdate = true; cones.visible = true;
    roadblock = { pos, edge: e, life: TUNE.roadblockLife, coneAt: { x: c.x + l.x * off - d.x * 4, z: c.z + l.z * off - d.z * 4 } };
    ui.radio(`Control: roadblock going up on ${e.way.name}`, 3500);
  }
  function clearRoadblock() { roadblock = null; if (units) units[2].visible = false; if (cones) cones.visible = false; }

  // ---- rounds ----
  function newCall(hot = false) {
    ensureProps();
    clearRoadblock();
    for (const b of backups) { b.on = false; b.mesh.visible = false; }
    for (const k of Object.keys(meshes)) meshes[k].visible = false;
    runnerMesh.visible = false; runner = null; smoke.hide();
    const pick = (hot && hotCallout(player.pos, player.heading)) || pickCallout(player.pos, lastCallout);
    callout = lastCallout = pick.callout;
    kind = callout.kind;
    mesh = suspectMesh(kind, callout.color || '#a3121a');
    mesh.visible = true;
    stage = 'unaware';
    suspect = new Driver(mesh, sizeOf(kind).L);
    suspect.place(pick.edge, 0.4, wander);
    suspect.speed = 8;
    damage = 0; arrestT = 0; footT = 0; lostT = 0; pits = 0; roundT = 0; roundPenalty = 0; ranAway = false;
    ping = TUNE.pingTime; lastSeen = { ...suspect.pos };
    roadblockT = TUNE.roadblockEvery * 0.6;
    ui.radio(`Control to all units: ${callout.text}.`, 6500);
    audio.cue('beep');
    if (pick.hot) spotted(); // the first call of a shift: close by and already running
  }
  function spotted() {
    if (stage !== 'unaware') return;
    stage = 'flee';
    suspect.next = flee(suspect.edge);
    ui.radio(`${callout.crime} suspect has seen you: they're making a run for it!`, 3500);
    const n = TUNE.backups[Math.min(level, TUNE.backups.length - 1)];
    for (let i = 0; i < n; i++) spawnBackup(i);
  }
  function bail() { // out of the car and away on foot
    stage = 'foot'; footT = 0;
    suspect.speed = 0; suspect.stall = 999;
    runner = new Driver(runnerMesh, 0.6, { pave: true });
    const side = leftOf(suspect.fwd);
    runner.place(suspect.edge, 0.5, runFrom);
    runner.pos = { x: suspect.pos.x + side.x * 1.8, z: suspect.pos.z + side.z * 1.8 };
    runner.heading = suspect.heading;
    runner.speed = 3;
    runnerMesh.visible = true;
    ui.radio(damage >= 1 ? 'Their car is wrecked: suspect running on foot!' : 'Suspect has ditched the car and is running!', 3500);
    audio.cue('beep');
  }
  function endRound(won, how) {
    stage = 'beat'; beatT = won ? 2.8 : 1.6; beatWin = won;
    if (won) {
      caught++; level++;
      const base = 150 + (level - 1) * 25, quick = Math.max(0, Math.round(120 - roundT));
      const pit = pits ? TUNE.pitBonus : 0, foot = how === 'foot' ? 50 : 0, boxed = how === 'boxed' ? 50 : 0;
      const pts = Math.max(0, base + quick + pit + foot + boxed - roundPenalty);
      score += pts; clock += TUNE.arrestBonusTime;
      charges = Math.min(TUNE.pingCharges, charges + 1);
      beatResult = { pts };
      ui.banner('SUSPECT DETAINED', `+${pts}${pit ? ` · PIT bonus ${pit}` : ''}${boxed ? ' · boxed in +50' : ''}${foot ? ' · foot chase +50' : ''}${quick ? ` · quick +${quick}` : ''}${roundPenalty ? ` · crashes −${roundPenalty}` : ''} · +${TUNE.arrestBonusTime} s`, 3200);
      audio.cue('bust');
      if (ui.score) ui.score({ value: caught, icon: '🚔', label: `caught · ${score} pts` }); // the counter pops now, not after the beat
      freeze(true);
    } else {
      lostCount++; clock = Math.max(1, clock - TUNE.lostPenaltyTime);
      ui.banner('LOST THEM', `Control: all units stand down. −${TUNE.lostPenaltyTime} s`, 2600);
      audio.cue('fail');
    }
    for (const b of backups) b.on = false;
    clearRoadblock();
    ui.updatePursuit({ meterLabel: 'DAMAGE', prompt: won ? 'Suspect detained' : 'Lost them', status: won ? 'close' : 'losing', urgent: false, radio: charges, lost: 1 });
  }
  function endShift() {
    const best = save.get('pursuit.best', { caught: 0, score: 0 });
    const record = caught > best.caught || (caught === best.caught && score > best.score);
    if (record) save.set('pursuit.best', { caught, score });
    audio.cue(caught ? 'finish' : 'fail');
    api.stop();
    ui.showResults({
      title: caught ? `Shift over: ${caught} arrest${caught > 1 ? 's' : ''}` : 'Shift over: they all got away',
      lines: [`Shift total ${score} pts${lostCount ? ` · ${lostCount} lost` : ''}`, record ? 'New personal best!' : `Best: ${best.caught} caught · ${best.score} pts`],
      retry: () => api.start(),
    });
  }

  // ---- the player's contact with the suspect: PITs and rams ----
  function contact(c) {
    if (contactCD > 0 || stage === 'beat' || stage === 'foot') return;
    contactCD = 0.35;
    if (stage === 'unaware') spotted();
    const f = suspect.fwd, l = leftOf(f);
    const rx = c.x - suspect.pos.x, rz = c.z - suspect.pos.z, rl = Math.hypot(rx, rz) || 1;
    const along = rx * f.x + rz * f.z, lat = rx * l.x + rz * l.z;
    const nx = -rx / rl, nz = -rz / rl; // push direction, from the player into the suspect
    const sv = { x: f.x * suspect.speed, z: f.z * suspect.speed };
    const push = (player.vel.x - sv.x) * nx + (player.vel.z - sv.z) * nz;
    const pf = { x: Math.sin(player.heading), z: Math.cos(player.heading) };
    const parallel = pf.x * f.x + pf.z * f.z;
    if (suspect.spin <= 0 && along < -0.4 && Math.abs(lat) > 0.45 && suspect.speed > TUNE.pitMinSpeed && parallel > 0.55 && push > TUNE.pitPush) {
      // PIT: the rear is shoved sideways, the car spins out and stalls
      const torque = Math.sign(rz * nx - rx * nz) || 1;
      suspect.kick(torque * (3.4 + Math.random() * 1.4), sv.x * 0.75 + nx * 3, sv.z * 0.75 + nz * 3, TUNE.pitSpin);
      suspect.stall = TUNE.pitStall - Math.min(1.2, level * 0.2);
      damage = Math.min(1, damage + TUNE.pitDamage);
      pits++;
      ui.flash('PIT!');
      audio.cue('checkpoint');
      return;
    }
    if (push > TUNE.ramMin) {
      damage = Math.min(1, damage + (push - TUNE.ramMin) * TUNE.ramDamage);
      suspect.speed *= 0.7;
      if (push > TUNE.ramStun) { suspect.stall = Math.max(suspect.stall, 0.5); ui.flash('RAM!'); }
    }
  }

  // ---- arrest camera: a slow orbit around the stopped car ----
  function cinematic(camera) {
    if (stage !== 'beat' || !beatWin || !suspect) return false;
    const who = runner || suspect, R = runner ? 5.5 : 8.5;
    const a = who.heading + 0.9 + (2.8 - beatT) * 0.35;
    camera.position.set(who.pos.x + Math.sin(a) * R, runner ? 2 : 2.6, who.pos.z + Math.cos(a) * R);
    camera.up.set(0, 1, 0);
    camera.lookAt(who.pos.x, 0.9, who.pos.z);
    return true;
  }

  const api = {
    get active() { return active; },
    get extras() { return extras; },
    TUNE,
    start(opts = {}) {
      active = true; startLevel = opts.level || 0; level = startLevel; caught = 0; score = 0; lostCount = 0;
      clock = TUNE.shiftTime; charges = TUNE.pingCharges; time = 0;
      player.siren = true;
      audio.setSiren(true);
      ui.showMission('pursuit');
      newCall(!opts.cold); // starts hot (opts.cold: the long-range dispatch, for tests)
    },
    stop() {
      active = false; stage = 'idle';
      for (const k of Object.keys(meshes)) meshes[k].visible = false;
      if (units) { for (const u of units) u.visible = false; cones.visible = false; runnerMesh.visible = false; smoke.hide(); }
      for (const b of backups) b.on = false;
      roadblock = null; suspect = null; runner = null;
      extras.length = 0;
      setHazards(false, 0);
      freeze(false);
      player.siren = false;
      audio.setSiren(false);
      ui.hideMission();
    },
    // radio Control for the suspect's location (E / controller D-pad left / the mission panel's radio button)
    radio() {
      if (!active || !suspect || stage === 'beat') return;
      if (charges <= 0) { ui.radio('Control: no units free to help, you\'re on your own.', 2500); return; }
      charges--; ping = TUNE.pingTime;
      const who = stage === 'foot' ? runner : suspect;
      ui.radio(`Control: suspect ${stage === 'foot' ? 'on foot' : 'sighted'} on ${who.edge.way.name}. (${charges} call${charges === 1 ? '' : 's'} left)`, 3500);
      audio.cue('beep');
    },
    update(dt) {
      if (!active || !suspect) return;
      time += dt;
      contactCD = Math.max(0, contactCD - dt); crashCD = Math.max(0, crashCD - dt); ping = Math.max(0, ping - dt);
      if (stage === 'beat') {
        beatT -= dt;
        setHazards(beatWin, time);
        if (beatT <= 0) { freeze(false); if (clock <= 0) { endShift(); return; } newCall(); }
        return;
      }
      clock -= dt; roundT += dt;
      if (clock <= 0) { clock = 0; endShift(); return; }
      const dist = Math.sqrt(dist2(suspect.pos, player.pos));

      // crash penalty: a hard hit on anything but the suspect
      if (player.impact > TUNE.crashImpact && crashCD <= 0 && contactCD < 0.2) {
        crashCD = 1.5; roundPenalty += TUNE.crashPenalty; ui.flash(`Crash −${TUNE.crashPenalty}`);
      }
      if (stage === 'unaware' && dist < (player.siren ? TUNE.spotSiren : TUNE.spotQuiet)) spotted();

      // suspect car
      obstacles.length = 0;
      for (const ai of traffic.list) obstacles.push({ pos: ai.pos, r: ai.isBus ? 1.3 : 1, soft: !ai.isBus });
      for (const b of backups) if (b.on) obstacles.push({ pos: b.d.pos, r: 1 });
      if (roadblock) { obstacles.push({ pos: roadblock.pos, r: 1.6 }, { pos: roadblock.coneAt, r: 2 }); }
      obstacles.push({ pos: player.pos, r: 1.1 });
      const top = Math.min(TUNE.topMax, TUNE.topSpeed + level * TUNE.topPerLevel) * (1 - TUNE.damageSlow * damage);
      let want = stage === 'unaware' ? suspect.edge.way.speed * 1.15 : top * (dist > 220 ? 0.85 : 1) * (suspect.edge.way.type === 'lane' ? 0.65 : 1);
      if (stage === 'foot') want = 0;
      suspect.wobble = Math.max(0, damage - 0.5) * 2;
      suspect.aggressive = stage === 'flee';
      suspect.step(dt, want, choose, obstacles, tram);
      if (suspect.bully > 0) shove(suspect);
      // into the roadblock car: a crash
      if (roadblock && dist2(suspect.pos, roadblock.pos) < 6 && suspect.speed > 4) { damage = Math.min(1, damage + 0.25); suspect.speed = 0; suspect.stall = 2; ui.flash('Into the roadblock!'); }

      // backups and roadblocks
      for (const b of backups) if (b.on) updateBackup(b, dt);
      if (stage === 'flee' && level >= TUNE.roadblockFrom) {
        if (roadblock) {
          roadblock.life -= dt;
          const passed = v2.dot(v2.sub(suspect.pos, roadblock.pos), suspect.fwd) > 60;
          if (roadblock.life <= 0 || passed) clearRoadblock();
        } else if ((roadblockT -= dt) <= 0) { roadblockT = Math.max(14, TUNE.roadblockEvery - level * 3); placeRoadblock(); }
      }
      if (roadblock) units[2].userData.flash(time, true);

      // smoke from a damaged engine
      const bonnet = v2.add(suspect.pos, v2.scale(suspect.fwd, sizeOf(kind).L * 0.35));
      smoke.update(dt, damage > 0.5 ? (damage - 0.5) * 22 : 0, bonnet, damage > 0.8);
      setHazards(stage === 'foot', time);

      // the takedown
      let prompt = '', status = 'far';
      if (stage === 'foot') {
        footT += dt;
        runner.step(dt, Math.max(3.4, TUNE.runSpeed + level * 0.2 - footT * 0.08), runFrom, NONE, null);
        const rd = Math.sqrt(dist2(runner.pos, player.pos));
        if (rd < TUNE.footDist && Math.abs(player.speed) < TUNE.footPlayerSpeed) { arrestT += dt; prompt = 'Hold it…'; } else arrestT = Math.max(0, arrestT - dt * 2);
        if (!prompt) prompt = rd < 15 ? 'Stop beside them to arrest' : 'On foot! Catch them up';
        if (arrestT >= TUNE.footHold) { runner.speed = 0; runnerMesh.userData.animate(0, 0); endRound(true, 'foot'); return; }
        lostT = rd > TUNE.footLostDist ? lostT + dt : Math.max(0, lostT - dt);
        status = rd < 20 ? 'close' : rd < 70 ? 'tail' : 'far';
      } else {
        const slow = Math.abs(suspect.speed) < TUNE.arrestSuspectSpeed && suspect.spin <= 0;
        const near = dist < TUNE.arrestDist && Math.abs(player.speed) < TUNE.arrestPlayerSpeed;
        const inFront = v2.dot(v2.sub(player.pos, suspect.pos), suspect.fwd) > 1.5;
        const boxed = inFront || suspect.blocked < 6 || backups.some((b) => b.on && dist2(b.d.pos, suspect.pos) < 81) || (roadblock && dist2(roadblock.pos, suspect.pos) < 150);
        if (stage === 'flee' && slow && near) {
          arrestT += dt * (boxed ? TUNE.boxedRate : 1);
          // they try to wriggle out: rev away the moment the stall wears off, unless boxed in
          if (!boxed && suspect.stall < 0.3) suspect.stall = 0;
          if (!ranAway && level >= 1 && arrestT > 0.6 && Math.random() < TUNE.runnerChance * dt * 2) { ranAway = true; bail(); }
        } else arrestT = Math.max(0, arrestT - dt * 1.5);
        if (stage === 'flee' && damage >= 1) bail();
        if (stage === 'flee' && arrestT >= TUNE.arrestTime) { suspect.speed = 0; suspect.stall = 999; endRound(true, boxed ? 'boxed' : 'stop'); return; }
        if (stage === 'unaware') prompt = `Respond: ${callout.ways[0]}`;
        else if (arrestT > 0) prompt = `ARREST ${Math.max(1, Math.ceil(TUNE.arrestTime - arrestT))}…`;
        else if (slow && suspect.stall > 0) prompt = dist < 25 ? 'Box them in! Stop in front or beside them' : 'They\'re stopped! Get to them';
        else if (dist < 30 && suspect.speed > TUNE.pitMinSpeed) prompt = 'PIT them: nudge a rear corner';
        else if (dist < 30) prompt = 'Ram them or box them in';
        else prompt = dist > 200 ? 'Losing them! Close the gap' : 'Close the gap';
        if (stage === 'flee') lostT = dist > TUNE.lostDist ? lostT + dt : Math.max(0, lostT - dt * 2);
        status = dist < 40 ? 'close' : dist < 150 ? 'tail' : 'far';
      }
      if (lostT > 0) status = 'losing';
      if (lostT > TUNE.lostTime) { endRound(false); return; }
      const who = stage === 'foot' ? runner : suspect;
      if (Math.sqrt(dist2(who.pos, player.pos)) < TUNE.sightDist || ping > 0) lastSeen = { ...who.pos };

      // traffic sees the suspect, backups and the roadblock
      extras.length = 0;
      extras.push(suspect);
      for (const b of backups) if (b.on) extras.push(b.d);
      if (roadblock) extras.push({ pos: roadblock.pos, length: 4.6 });

      ui.updateMission({
        title: `PURSUIT · CALL ${caught + lostCount + 1}`,
        big: fmt(clock),
        sub: `${callout.crime} · ${stage === 'unaware' ? 'not yet spotted' : `${Math.round(stage === 'foot' ? Math.sqrt(dist2(runner.pos, player.pos)) : dist)} m`} · arrest = +${TUNE.arrestBonusTime} s`,
        meter: damage,
        warn: clock < 20,
        score: { value: caught, icon: '🚔', label: `caught · ${score} pts` },
      });
      ui.updatePursuit({
        meterLabel: stage === 'foot' ? 'ON FOOT' : 'DAMAGE',
        prompt, status, urgent: arrestT > 0 || status === 'losing',
        radio: charges,
        lost: lostT > 0 ? lostT / TUNE.lostTime : 0,
      });
    },
    // the player's car collides with the suspect (and the backups and roadblock car, which just push back)
    collide(c, r) {
      if (!active || !suspect) return null;
      let hit = null;
      const push = (k, onHit) => {
        let dx = c.x - k.x, dz = c.z - k.z;
        const d = Math.hypot(dx, dz), R = r + k.r;
        if (d >= R || d < 1e-4) return;
        dx /= d; dz /= d;
        const depth = R - d;
        c.x += dx * depth; c.z += dz * depth;
        if (!hit || depth > hit.depth) hit = { nx: dx, nz: dz, depth };
        if (onHit) onHit();
      };
      if (stage !== 'beat') for (const k of suspect.circles()) push(k, () => contact(c));
      for (const b of backups) if (b.on) for (const k of b.d.circles()) push(k);
      if (roadblock) push({ x: roadblock.pos.x, z: roadblock.pos.z, r: 1.6 });
      return hit;
    },
    blips() {
      if (!active || !suspect) return [];
      const out = [];
      const who = stage === 'foot' ? runner : suspect;
      const seen = ping > 0 || Math.sqrt(dist2(who.pos, player.pos)) < TUNE.sightDist || stage === 'beat';
      if (seen) out.push({ x: who.pos.x, z: who.pos.z, color: '#ff2d2d', pulse: true });
      else if (lastSeen) out.push({ x: lastSeen.x, z: lastSeen.z, color: '#9aa0a6', pulse: false });
      for (const b of backups) if (b.on) out.push({ x: b.d.pos.x, z: b.d.pos.z, color: '#3a7bff', pulse: false });
      return out;
    },
    cinematic,
    // for the test scenarios
    debug() {
      return { stage, level, caught, score, clock, damage, arrestT, pits, charges, callout: callout && callout.text, kind,
        suspect: suspect && { x: suspect.pos.x, z: suspect.pos.z, heading: suspect.heading, speed: suspect.speed, spin: suspect.spin, stall: suspect.stall },
        runner: runner && { x: runner.pos.x, z: runner.pos.z },
        backups: backups.filter((b) => b.on).map((b) => ({ x: b.d.pos.x, z: b.d.pos.z })), roadblock: roadblock && { ...roadblock.pos } };
    },
    _force: { spotted: () => spotted(), roadblock: () => placeRoadblock(), backup: (i) => spawnBackup(i), bail: () => bail() },
  };
  return api;
}

export function fmt(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

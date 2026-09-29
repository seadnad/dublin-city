// Arcade car physics: punchy, grippy and forgiving. Handbrake drifts, walls you slide along. Heading h: forward = (sin h, cos h) in world x/z; steering right decreases h.
import { resolveCircle } from './collision.js';
import { world, PAVEMENT } from '../world/geo.js';

const P = {
  maxSpeed: 40,        // m/s (~145 km/h)
  accel: 14,
  brake: 30,
  reverseMax: 11,
  rolling: 0.5,
  drag: 0.0035,
  wheelbase: 2.6,
  maxSteer: 0.5,
  grip: 22,            // high: the car goes where it points
  driftGrip: 2.6,      // handbrake: slides, but stays catchable
  align: 5,            // arcade assist: velocity swings toward the nose
  radius: 1.0,
  axleOffset: 1.3,
  // response and feel (these defaults are the original tuning, shared by the Garda cars and the i30 N)
  steerRate: 6,        // how fast the wheel follows the stick (1/s), and returns to centre
  steerReturn: 9,
  steerFade: 0.045,    // steering lock falls off with speed: maxSteer / (1 + v * steerFade)
  turnBase: 6,         // yaw is computed from min(v, turnBase + v * turnGain): less twitchy flat out
  turnGain: 0.55,
  yawResp: 8,          // how fast the yaw rate reaches its target (1/s), normally and on the handbrake
  yawRespHB: 5,
  hbYaw: 1.9,          // extra rotation on the handbrake
  hbDrag: 3,           // handbrake deceleration (m/s²)
  liftOff: 0,          // lift-off / trail-brake rotation: share of the turn the velocity lags the nose by
  liftGrip: 0,         // ...and the share of lateral grip the rear gives up meanwhile
  power: 2.2,          // shape of the power fall-off toward maxSpeed
};

// Per-car overrides. Anything not listed keeps the value above.
export const CAR_PROFILES = {
  // the hot hatch: the fun one. Quicker, faster, sharper on the wheel and stronger on the brakes, with more grip,
  // and a rear that steps out a little when you lift or trail-brake mid-corner (grip gathers it back up)
  gt: {
    maxSpeed: 52, accel: 17.5, brake: 36, drag: 0.0026, power: 2.4,
    maxSteer: 0.56, steerRate: 9.5, steerReturn: 12, steerFade: 0.04, turnBase: 6.5, turnGain: 0.6,
    grip: 26, driftGrip: 2.3, align: 6, yawResp: 11, yawRespHB: 6, hbYaw: 1.85, hbDrag: 2.6,
    liftOff: 0.6, liftGrip: 0.85,
  },
};

export class Car {
  constructor(x, z, heading) {
    this.pos = { x, z };
    this.heading = heading;
    this.vel = { x: 0, z: 0 };
    this.yawRate = 0;
    this.steer = 0;
    this.speed = 0;       // signed forward speed
    this.slip = 0;        // lateral speed (for skid effects)
    this.surface = 'road';
    this.bump = 0;        // vertical bounce offset
    this.bumpV = 0;
    this.roll = 0; this.pitch = 0;
    this.impact = 0;      // last collision strength
    this.street = null;
    this.dynamicObstacles = null; // fn(x, z, r) -> push info
    this.drift = 0;       // seconds spent drifting (for the release boost / scoring)
    this.boost = 0;
    this.lift = 0;        // 0..1: off the throttle mid-corner (lift-off rotation)
    this.setProfile();
  }

  // pick the handling for a car model (gt, ...); unknown names get the standard tuning
  setProfile(name) { this.profile = CAR_PROFILES[name] ? name : 'standard'; this.p = { ...P, ...(CAR_PROFILES[name] || {}) }; }

  // stop dead where it is (no creep while the game holds the car: intro, countdowns)
  hold() { this.vel.x = this.vel.z = 0; this.yawRate = 0; this.speed = 0; this.slip = 0; }

  teleport(x, z, heading) {
    this.pos.x = x; this.pos.z = z; this.heading = heading;
    this.vel.x = this.vel.z = 0; this.yawRate = 0; this.speed = 0;
  }

  update(dt, input) {
    const steps = 3, h = dt / steps;
    for (let i = 0; i < steps; i++) this.step(h, input);
    // suspension spring for kerb bumps
    this.bumpV += (-this.bump * 180 - this.bumpV * 14) * dt;
    this.bump += this.bumpV * dt;
    const targetPitch = -(input.throttle - input.brake) * Math.min(1, Math.abs(this.speed) / 8) * 0.025;
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 5);
    this.roll += (this.slip * 0.012 + this.yawRate * this.speed * 0.0025 - this.roll) * Math.min(1, dt * 6);
    this.roll = Math.max(-0.08, Math.min(0.08, this.roll));
    this.impact *= Math.exp(-dt * 4);
  }

  step(dt, input) {
    const p = this.p;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const sx = Math.cos(this.heading), sz = -Math.sin(this.heading);
    let vLong = this.vel.x * fx + this.vel.z * fz;
    let vLat = this.vel.x * sx + this.vel.z * sz;

    // surface
    const road = world.nearestRoad(this.pos.x, this.pos.z);
    let surface = 'plaza';
    if (road && road.edgeDist < 0) surface = road.way.pedestrian ? 'pavement' : 'road'; // Grafton St is paved
    else if (road && road.edgeDist < PAVEMENT) surface = 'pavement';
    if (surface !== this.surface) {
      if (surface !== 'road' || this.surface !== 'road') {
        // kerb: a jolt and a little speed loss
        const hit = Math.min(1, Math.abs(vLong) / 15);
        this.bumpV += 1.2 * hit + 0.25;
        vLong *= 0.99;
      }
      this.surface = surface;
    }
    this.street = road && road.edgeDist < PAVEMENT ? road.way : this.street;

    // longitudinal forces
    let a = 0;
    const { throttle, brake, handbrake } = input;
    if (throttle > 0) {
      if (vLong < -0.5) a += p.brake * throttle;
      else a += p.accel * throttle * Math.max(0, 1 - Math.pow(Math.max(0, vLong) / p.maxSpeed, p.power));
    }
    if (brake > 0) {
      if (vLong > 0.5) a -= p.brake * brake;
      else if (vLong > -p.reverseMax) a -= p.accel * 0.6 * brake;
    }
    const offroad = surface === 'road' ? 1 : 1.6;
    a -= Math.sign(vLong) * p.rolling * offroad;
    a -= p.drag * vLong * Math.abs(vLong);
    if (handbrake) a -= Math.sign(vLong) * p.hbDrag;
    if (this.boost > 0) { a += 9; this.boost -= dt; }
    const nv = vLong + a * dt;
    // don't let rolling resistance flip direction
    vLong = (throttle === 0 && brake === 0 && Math.sign(nv) !== Math.sign(vLong)) ? 0 : nv;

    // lift-off rotation (cars with liftOff > 0): off the throttle (or trail-braking) with the wheel turned at speed,
    // the rear lets go a little: less grip and assist, the nose tucks in and the velocity lags the heading, so a
    // slip angle opens up. Back on the power, grip returns quickly and gathers it up.
    let liftAmt = 0;
    if (p.liftOff > 0) {
      const lifting = !handbrake && throttle < 0.05 && vLong > 10 && Math.abs(this.steer) > 0.25;
      this.lift += ((lifting ? 1 : 0) - this.lift) * Math.min(1, dt * (lifting ? 4 : 7));
      liftAmt = this.lift * Math.min(1, Math.abs(this.steer) / 0.5);
    }
    // lateral grip: very high normally, low on the handbrake
    const spd0 = Math.abs(vLong);
    let grip = handbrake ? p.driftGrip : p.grip * (1 - p.liftGrip * liftAmt);
    if (surface !== 'road') grip *= 0.9;
    // arcade assist: bleed sideways speed into forward speed instead of just losing it
    const lost = vLat * (1 - Math.exp(-grip * dt));
    vLat -= lost;
    if (!handbrake && vLong > 1) vLong += Math.abs(lost) * 0.3;
    // drift bookkeeping: a well-held drift gives a short boost when released
    const drifting = Math.abs(vLat) > 3 && spd0 > 8;
    if (drifting) this.drift += dt;
    else if (this.drift > 0) { if (this.drift > 0.6 && !handbrake) this.boost = Math.min(1.2, this.drift * 0.5); this.drift = 0; }

    // steering
    const spd = Math.abs(vLong);
    const steerTarget = input.steer;
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * (steerTarget === 0 ? p.steerReturn : p.steerRate));
    // steering stays useful at speed (arcade), and at low speed you can still turn sharply
    const maxSteer = p.maxSteer / (1 + spd * p.steerFade);
    const angle = this.steer * maxSteer;
    const turnSpeed = Math.sign(vLong) * Math.min(spd, p.turnBase + spd * p.turnGain); // less twitchy flat out
    let targetYaw = -(turnSpeed * Math.tan(angle)) / p.wheelbase * (spd < 1 ? spd : 1);
    if (handbrake && spd > 4) targetYaw *= p.hbYaw;
    const lag = p.liftOff * liftAmt;
    if (lag > 0) targetYaw *= 1 + lag * 0.3;
    this.yawRate += (targetYaw - this.yawRate) * Math.min(1, dt * (handbrake ? p.yawRespHB : p.yawResp));

    this.heading += this.yawRate * dt;
    // rebuild velocity against the new heading, so the car carries its speed through turns
    // (on the handbrake the velocity keeps its world direction, so the car slides)
    if (handbrake) {
      this.vel.x = fx * vLong + sx * vLat;
      this.vel.z = fz * vLong + sz * vLat;
    } else {
      const nfx = Math.sin(this.heading), nfz = Math.cos(this.heading);
      const vs = vLat * Math.exp(-p.align * (1 - 0.8 * liftAmt) * dt);
      this.vel.x = nfx * vLong + nfz * vs;
      this.vel.z = nfz * vLong - nfx * vs;
      if (lag > 0) { // keep part of the old direction of travel: a slip angle opens up
        this.vel.x += (fx * vLong + sx * vLat - this.vel.x) * lag;
        this.vel.z += (fz * vLong + sz * vLat - this.vel.z) * lag;
      }
    }
    this.speed = vLong;
    this.slip = vLat;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    this.collide(fx, fz);
  }

  collide(fx, fz) {
    const p = this.p;
    for (const k of [1, -1]) {
      const c = { x: this.pos.x + fx * p.axleOffset * k, z: this.pos.z + fz * p.axleOffset * k };
      let hit = resolveCircle(c, p.radius);
      const dyn = this.dynamicObstacles ? this.dynamicObstacles(c, p.radius) : null;
      if (dyn && (!hit || dyn.depth > hit.depth)) hit = dyn;
      if (!hit) continue;
      const dx = c.x - (this.pos.x + fx * p.axleOffset * k), dz = c.z - (this.pos.z + fz * p.axleOffset * k);
      this.pos.x += dx; this.pos.z += dz;
      const vn = this.vel.x * hit.nx + this.vel.z * hit.nz;
      if (vn < 0) {
        // slide along walls: cancel the inbound part, keep most of the rest
        this.vel.x -= hit.nx * vn * 1.15;
        this.vel.z -= hit.nz * vn * 1.15;
        const head = Math.min(1, -vn / Math.max(1, Math.hypot(this.vel.x, this.vel.z) + -vn)); // 1 = head-on
        const keep = 0.97 - head * 0.3;
        this.vel.x *= keep; this.vel.z *= keep;
        this.impact = Math.max(this.impact, -vn);
        // glancing blows turn the nose to run along the wall instead of grinding into it
        let tx = -hit.nz, tz = hit.nx;
        if (tx * fx + tz * fz < 0) { tx = -tx; tz = -tz; }
        const dh = Math.atan2(Math.sin(Math.atan2(tx, tz) - this.heading), Math.cos(Math.atan2(tx, tz) - this.heading));
        if (Math.abs(dh) < 1.1) { this.heading += dh * 0.35; this.yawRate *= 0.5; }
        this.boost = 0; this.drift = 0;
      }
    }
  }
}

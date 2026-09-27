// Arcade car physics. Heading h: forward = (sin h, cos h) in world x/z; steering right decreases h.
import { resolveCircle } from './collision.js';
import { world, PAVEMENT } from '../world/geo.js';

const P = {
  maxSpeed: 36,        // m/s (~130 km/h)
  accel: 11,
  brake: 24,
  reverseMax: 9,
  rolling: 0.6,
  drag: 0.0042,
  wheelbase: 2.6,
  maxSteer: 0.62,
  grip: 11,
  driftGrip: 1.3,
  radius: 1.0,
  axleOffset: 1.3,
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
  }

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
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const sx = Math.cos(this.heading), sz = -Math.sin(this.heading);
    let vLong = this.vel.x * fx + this.vel.z * fz;
    let vLat = this.vel.x * sx + this.vel.z * sz;

    // surface
    const road = world.nearestRoad(this.pos.x, this.pos.z);
    let surface = 'plaza';
    if (road && road.edgeDist < 0) surface = 'road';
    else if (road && road.edgeDist < PAVEMENT) surface = 'pavement';
    if (surface !== this.surface) {
      if (surface !== 'road' || this.surface !== 'road') {
        // kerb: a jolt and a little speed loss
        const hit = Math.min(1, Math.abs(vLong) / 15);
        this.bumpV += 1.6 * hit + 0.3;
        vLong *= 0.97;
      }
      this.surface = surface;
    }
    this.street = road && road.edgeDist < PAVEMENT ? road.way : this.street;

    // longitudinal forces
    let a = 0;
    const { throttle, brake, handbrake } = input;
    if (throttle > 0) {
      if (vLong < -0.5) a += P.brake * throttle;
      else a += P.accel * throttle * Math.max(0, 1 - Math.pow(Math.max(0, vLong) / P.maxSpeed, 1.6));
    }
    if (brake > 0) {
      if (vLong > 0.5) a -= P.brake * brake;
      else if (vLong > -P.reverseMax) a -= P.accel * 0.6 * brake;
    }
    const offroad = surface === 'road' ? 1 : 2.4;
    a -= Math.sign(vLong) * P.rolling * offroad;
    a -= P.drag * vLong * Math.abs(vLong);
    if (handbrake) a -= Math.sign(vLong) * 6;
    const nv = vLong + a * dt;
    // don't let rolling resistance flip direction
    vLong = (throttle === 0 && brake === 0 && Math.sign(nv) !== Math.sign(vLong)) ? 0 : nv;

    // lateral grip with a simple slip curve: the more it slides, the less it grips
    let grip = handbrake ? P.driftGrip : P.grip / (1 + Math.abs(vLat) * 0.12);
    if (surface !== 'road') grip *= 0.85;
    vLat *= Math.exp(-grip * dt);

    // steering
    const spd = Math.abs(vLong);
    const steerTarget = input.steer;
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * (steerTarget === 0 ? 9 : 6));
    const maxSteer = P.maxSteer / (1 + spd * 0.06);
    const angle = this.steer * maxSteer;
    let targetYaw = -(vLong * Math.tan(angle)) / P.wheelbase;
    if (handbrake && spd > 4) targetYaw *= 1.6;
    // counter-steer helps catch slides
    this.yawRate += (targetYaw - this.yawRate) * Math.min(1, dt * (handbrake ? 4 : 9));

    this.vel.x = fx * vLong + sx * vLat;
    this.vel.z = fz * vLong + sz * vLat;
    this.heading += this.yawRate * dt;
    this.speed = vLong;
    this.slip = vLat;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    this.collide(fx, fz);
  }

  collide(fx, fz) {
    for (const k of [1, -1]) {
      const c = { x: this.pos.x + fx * P.axleOffset * k, z: this.pos.z + fz * P.axleOffset * k };
      let hit = resolveCircle(c, P.radius);
      const dyn = this.dynamicObstacles ? this.dynamicObstacles(c, P.radius) : null;
      if (dyn && (!hit || dyn.depth > hit.depth)) hit = dyn;
      if (!hit) continue;
      const dx = c.x - (this.pos.x + fx * P.axleOffset * k), dz = c.z - (this.pos.z + fz * P.axleOffset * k);
      this.pos.x += dx; this.pos.z += dz;
      const vn = this.vel.x * hit.nx + this.vel.z * hit.nz;
      if (vn < 0) {
        this.vel.x -= hit.nx * vn * 1.25;
        this.vel.z -= hit.nz * vn * 1.25;
        this.vel.x *= 0.92; this.vel.z *= 0.92;
        this.impact = Math.max(this.impact, -vn);
        // glancing blows twist the car a little
        const cross = fx * hit.nz - fz * hit.nx;
        this.yawRate += cross * vn * 0.04 * k;
      }
    }
  }
}

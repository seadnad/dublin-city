// Chase camera with smooth follow and wall avoidance, plus a bonnet camera.
import * as THREE from 'three';
import { raycast } from './collision.js';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'chase';
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.yaw = 0;
    this.dist = 9;
    this.shake = 0;
    this.initialised = false;
  }

  toggle() { this.mode = this.mode === 'chase' ? 'bonnet' : 'chase'; this.initialised = false; }

  snap() { this.initialised = false; }

  // Helicopter chase: behind and above, the yaw lagging the heading; C swaps a near and a far view. The camera
  // looks down a little more the higher it flies, and never dips into the ground or a roof (groundAt: height field).
  updateHeli(dt, heli, groundAt) {
    const cam = this.camera;
    cam.up.set(0, 1, 0);
    let d = heli.heading - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (!this.initialised) { this.yaw = heli.heading; d = 0; this.pos.set(heli.pos.x, heli.pos.y, heli.pos.z); }
    this.yaw += d * Math.min(1, dt * 2.2);
    const far = this.mode === 'bonnet';
    const alt = Math.max(0, heli.alt);
    const dist = (far ? 34 : 17) + Math.min(alt * 0.04, 8);
    const height = (far ? 12 : 5.2) + Math.min(alt * 0.06, 12);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const tx = heli.pos.x - fx * dist, tz = heli.pos.z - fz * dist;
    let ty = heli.pos.y + height;
    if (groundAt) ty = Math.max(ty, groundAt(tx, tz) + 2.5);
    // a soft follow: the view trails a touch as the helicopter accelerates or climbs
    const k = this.initialised ? Math.min(1, dt * 6) : 1;
    this.pos.set(this.pos.x + (tx - this.pos.x) * k, this.pos.y + (ty - this.pos.y) * k, this.pos.z + (tz - this.pos.z) * k);
    this.initialised = true;
    cam.position.copy(this.pos);
    this.shake = Math.max(this.shake * Math.exp(-dt * 6), heli.impact * 0.02);
    if (this.shake > 0.001) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake));
    // look past the helicopter, down toward the city ahead, so it sits in the lower part of the view
    const ahead = 14 + Math.min(alt, 150) * 0.25;
    this.look.set(heli.pos.x + Math.sin(this.yaw) * ahead, heli.pos.y + 1.2 - Math.min(alt, 150) * 0.14, heli.pos.z + Math.cos(this.yaw) * ahead);
    cam.lookAt(this.look);
    cam.fov += (62 + heli.speed * 0.12 - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
  }

  update(dt, car, carMesh) {
    const cam = this.camera;
    const spd = Math.abs(car.speed);
    if (this.mode === 'debug') return;
    if (this.mode === 'bonnet') {
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      cam.position.set(car.pos.x + fx * 0.6, 1.5 + car.bump * 0.1, car.pos.z + fz * 0.6);
      this.look.set(car.pos.x + fx * 20, 1.1, car.pos.z + fz * 20);
      cam.up.set(Math.cos(car.heading) * car.roll, 1, -Math.sin(car.heading) * car.roll).normalize();
      cam.lookAt(this.look);
      cam.fov += (68 + spd * 0.25 - cam.fov) * Math.min(1, dt * 3);
      cam.updateProjectionMatrix();
      return;
    }
    cam.up.set(0, 1, 0);
    // camera yaw lags the car heading; when reversing, don't swing round
    let target = car.heading;
    if (car.speed < -2) target = car.heading; // keep looking forward over the car
    let d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (!this.initialised) { this.yaw = car.heading; d = 0; }
    this.yaw += d * Math.min(1, dt * 4.5);

    // GTA-style: fixed distance and height, only the angle lags behind the car
    this.dist = 8.2;
    const height = 3.1;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let bx = car.pos.x - fx * this.dist, bz = car.pos.z - fz * this.dist;
    // pull the camera in if a wall sits between it and the car
    const t = raycast(car.pos.x, car.pos.z, bx, bz);
    if (t < 1) { const k = Math.max(0.25, t - 0.08); bx = car.pos.x + (bx - car.pos.x) * k; bz = car.pos.z + (bz - car.pos.z) * k; }
    const desired = new THREE.Vector3(bx, height, bz);
    this.initialised = true;
    // follow position exactly (no trailing at speed); ease only the height for kerb bumps
    this.pos.set(desired.x, this.pos.y + (desired.y - this.pos.y) * Math.min(1, dt * 10) || desired.y, desired.z);
    cam.position.copy(this.pos);
    this.shake = Math.max(this.shake * Math.exp(-dt * 6), car.impact * 0.02);
    if (this.shake > 0.001) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake));
    this.look.set(car.pos.x + Math.sin(car.heading) * 4, 1.3, car.pos.z + Math.cos(car.heading) * 4);
    cam.lookAt(this.look);
    cam.fov += (62 + spd * 0.08 - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
  }
}

// Garda Pursuit props: backup / roadblock Garda cars, traffic cones, the suspect on foot, hazard lights and
// engine smoke. All built once on the first pursuit and reused (hidden when idle). No extra scene lights, so
// nothing here changes the light count (no shader recompiles).
import * as THREE from 'three';
import { makePlayerCar, TYPES } from '../fleet.js';

// A marked Garda saloon: white, a yellow and blue band along the sides, a roof bar with alternating blue flashes.
export function makeGardaUnit() {
  const g = makePlayerCar('saloon', '#f1f1ec');
  const t = TYPES.saloon;
  const band = (color, y, h) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, t.L * 0.86), m);
      b.position.set(s * (t.W / 2 + 0.01), y, 0.05);
      g.add(b);
    }
  };
  band('#f5d000', 0.72, 0.16);
  band('#1d3f8f', 0.58, 0.12);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.3), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.4 }));
  bar.position.set(0, t.H + 0.03, -0.3);
  g.add(bar);
  const mats = [0, 1].map(() => new THREE.MeshStandardMaterial({ color: 0x0b2a8c, emissive: 0x2f6bff, emissiveIntensity: 0.05, roughness: 0.2 }));
  [-1, 1].forEach((s, i) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.26), mats[i]);
    l.position.set(s * 0.28, t.H + 0.11, -0.3);
    g.add(l);
  });
  g.rotation.order = 'YXZ';
  g.userData.flash = (time, on) => {
    const p = (time * 2.2) % 1;
    mats[0].emissiveIntensity = on && (p < 0.12 || (p > 0.2 && p < 0.32)) ? 6 : 0.05;
    mats[1].emissiveIntensity = on && ((p > 0.5 && p < 0.62) || (p > 0.7 && p < 0.82)) ? 6 : 0.05;
  };
  return g;
}

export function makeCones(n) {
  const geo = new THREE.ConeGeometry(0.2, 0.62, 10).translate(0, 0.31, 0);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xff5a14, emissive: 0xff3a00, emissiveIntensity: 0.25, roughness: 0.6 }), n);
  m.castShadow = true; m.frustumCulled = false;
  return m;
}

// The suspect on foot: a figure in a dark hoodie, legs and arms swinging as they run.
export function makeRunner() {
  const g = new THREE.Group();
  const hoodie = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.9 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a888, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 8), hoodie);
  torso.position.y = 1.2; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin);
  head.position.y = 1.68; g.add(head);
  const limb = (mat, x, y, len, w) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat); m.position.y = -len / 2; pivot.add(m);
    g.add(pivot); return pivot;
  };
  const legs = [limb(jeans, -0.1, 0.9, 0.88, 0.14), limb(jeans, 0.1, 0.9, 0.88, 0.14)];
  const arms = [limb(hoodie, -0.3, 1.45, 0.62, 0.11), limb(hoodie, 0.3, 1.45, 0.62, 0.11)];
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  let phase = 0;
  g.userData.animate = (dt, speed) => {
    phase += dt * speed * 1.9;
    const a = Math.sin(phase) * Math.min(1, speed / 3) * 0.9;
    legs[0].rotation.x = a; legs[1].rotation.x = -a; arms[0].rotation.x = -a; arms[1].rotation.x = a;
    g.position.y = Math.abs(Math.sin(phase)) * 0.06 * Math.min(1, speed / 3);
  };
  return g;
}

// Four orange corner lamps on a car (hazard lights); returns a setter.
const hazardMat = new THREE.MeshStandardMaterial({ color: 0x8a4a00, emissive: 0xff9a1a, emissiveIntensity: 0 });
const hazardGeo = new THREE.BoxGeometry(0.16, 0.08, 0.06);
export function addHazards(mesh, L, W, y = 0.78) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const b = new THREE.Mesh(hazardGeo, hazardMat);
    b.position.set(sx * (W / 2 - 0.12), y, sz * (L / 2 - 0.02));
    mesh.add(b);
  }
}
export function setHazards(on, time) { hazardMat.emissiveIntensity = on && time % 0.9 < 0.45 ? 5 : 0; }

// Engine smoke from a damaged car: a small pool of soft grey sprites.
export function makeSmoke(scene, n = 10) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const puffs = Array.from({ length: n }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x555555, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false; scene.add(s);
    return { s, life: 0, vx: 0, vz: 0 };
  });
  let acc = 0, next = 0;
  return {
    // rate: puffs per second (0 = none); from: the bonnet position
    update(dt, rate, from, dark) {
      acc += dt * rate;
      while (acc >= 1) {
        acc -= 1;
        const p = puffs[next]; next = (next + 1) % n;
        p.life = 1; p.s.visible = true; p.s.position.set(from.x + (Math.random() - 0.5) * 0.4, 1.0, from.z + (Math.random() - 0.5) * 0.4);
        p.vx = (Math.random() - 0.5) * 0.6; p.vz = (Math.random() - 0.5) * 0.6;
        p.s.material.color.setScalar(dark ? 0.12 : 0.35);
      }
      for (const p of puffs) {
        if (!p.s.visible) continue;
        p.life -= dt * 0.7;
        if (p.life <= 0) { p.s.visible = false; continue; }
        p.s.position.x += p.vx * dt; p.s.position.z += p.vz * dt; p.s.position.y += dt * 1.6;
        const k = 1 - p.life;
        p.s.scale.setScalar(0.8 + k * 3);
        p.s.material.opacity = 0.55 * p.life;
      }
    },
    hide() { for (const p of puffs) p.s.visible = false; acc = 0; },
  };
}

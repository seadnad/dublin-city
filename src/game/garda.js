// Garda kit for the player's car: a roof lightbar with alternating blue flashers. Works with the procedural
// car or a loaded model (pass the roof height).
import * as THREE from 'three';

export function addGardaKit(group, { roofY = 1.47, roofZ = -0.35, width = 1.2 } = {}) {
  const kit = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.32), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.4, metalness: 0.6 }));
  base.position.y = 0.035;
  kit.add(base);
  const lensGeo = new THREE.BoxGeometry(width * 0.46, 0.11, 0.28);
  const mats = [0, 1].map(() => new THREE.MeshStandardMaterial({ color: 0x0b2a8c, emissive: 0x2f6bff, emissiveIntensity: 0.05, transparent: true, opacity: 0.9, roughness: 0.2 }));
  const lenses = [-1, 1].map((s, i) => { const m = new THREE.Mesh(lensGeo, mats[i]); m.position.set(s * width * 0.25, 0.125, 0); kit.add(m); return m; });
  kit.position.set(0, roofY, roofZ);
  group.add(kit);
  // a single blue point light that flickers with the bar (cheap, and lights the street at night)
  const glow = new THREE.PointLight(0x3a6bff, 0, 18, 2);
  glow.position.set(0, roofY + 0.4, roofZ);
  group.add(glow);
  return {
    kit, lenses,
    update(time, on) {
      // Garda pattern: quick double flashes, alternating sides
      const p = (time * 2.2) % 1;
      const left = on && ((p < 0.12) || (p > 0.2 && p < 0.32));
      const right = on && ((p > 0.5 && p < 0.62) || (p > 0.7 && p < 0.82));
      mats[0].emissiveIntensity = left ? 6 : 0.05;
      mats[1].emissiveIntensity = right ? 6 : 0.05;
      glow.intensity = left || right ? 18 : 0;
    },
  };
}

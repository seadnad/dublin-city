// Low-poly vehicle meshes built from boxes, merged per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2328, roughness: 0.15, metalness: 0.6 });
const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
export const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6dd, emissive: 0xfff2cc, emissiveIntensity: 0.3 });
export const tailMat = new THREE.MeshStandardMaterial({ color: 0x8a0d0d, emissive: 0xff1a1a, emissiveIntensity: 0.3 });
const bodyMats = new Map();
function bodyMat(color) {
  if (!bodyMats.has(color)) bodyMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 }));
  return bodyMats.get(color);
}

function box(w, h, d, x, y, z, taper = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (taper) {
    // pull the top face in (front/back) to make a sloped cabin
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setZ(i, p.getZ(i) * (1 - taper));
    g.computeVertexNormals();
  }
  g.translate(x, y, z);
  return g;
}

function wheels(list, r, w) {
  return list.map(([x, z]) => {
    const g = new THREE.CylinderGeometry(r, r, w, 14);
    g.rotateZ(Math.PI / 2);
    g.translate(x, r, z);
    return g;
  });
}

function assemble(parts) {
  const group = new THREE.Group();
  for (const [mat, geos] of parts) {
    if (!geos.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

// Mesh faces +z. Origin at ground centre.
export function makeCar({ color = 0x1f7a4c, taxi = false } = {}) {
  const L = 4.3, W = 1.85;
  const body = [box(W, 0.62, L, 0, 0.62, 0), box(W - 0.1, 0.1, L - 0.2, 0, 0.98, 0)];
  const cabin = [box(W - 0.16, 0.62, 2.3, 0, 1.33, -0.25, 0.22)];
  const glass = [box(W - 0.12, 0.5, 2.2, 0, 1.3, -0.25, 0.24)];
  const trim = [box(W + 0.02, 0.18, 0.3, 0, 0.42, L / 2 - 0.1), box(W + 0.02, 0.18, 0.3, 0, 0.42, -L / 2 + 0.1)];
  if (taxi) trim.push(box(0.7, 0.18, 0.28, 0, 1.73, -0.1));
  const heads = [box(0.4, 0.14, 0.05, -0.62, 0.78, L / 2 + 0.005), box(0.4, 0.14, 0.05, 0.62, 0.78, L / 2 + 0.005)];
  const tails = [box(0.34, 0.14, 0.05, -0.66, 0.8, -L / 2 - 0.005), box(0.34, 0.14, 0.05, 0.66, 0.8, -L / 2 - 0.005)];
  const tyres = wheels([[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]], 0.34, 0.26);
  const g = assemble([
    [bodyMat(color), [...body, ...cabin]], [glassMat, glass], [trimMat, trim], [tyreMat, tyres], [headMat, heads], [tailMat, tails],
  ]);
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.24), new THREE.MeshStandardMaterial({ color: 0xffd23c, emissive: 0xffc400, emissiveIntensity: 0.4 }));
    sign.position.set(0, 1.9, -0.1);
    g.add(sign);
  }
  g.userData = { length: L, width: W };
  return g;
}

// Dublin Bus style double-decker (yellow/blue livery).
export function makeBus() {
  const L = 10.8, W = 2.5;
  const yellow = bodyMat(0xf2c418), blue = bodyMat(0x1e3f8f), grey = bodyMat(0xd9d9d9);
  const g = assemble([
    [blue, [box(W, 0.9, L, 0, 0.75, 0)]],
    [yellow, [box(W, 2.9, L, 0, 2.65, 0)]],
    [grey, [box(W - 0.05, 0.15, L - 0.1, 0, 4.15, 0)]],
    [glassMat, [box(W + 0.02, 0.8, L - 1.2, 0, 1.75, -0.2), box(W + 0.02, 0.8, L - 0.8, 0, 3.35, 0), box(W - 0.3, 1.7, 0.06, 0, 2.5, L / 2 + 0.01)]],
    [tyreMat, wheels([[-1.1, 3.4], [1.1, 3.4], [-1.1, -3.2], [1.1, -3.2]], 0.5, 0.35)],
    [headMat, [box(0.3, 0.2, 0.05, -0.9, 0.7, L / 2 + 0.01), box(0.3, 0.2, 0.05, 0.9, 0.7, L / 2 + 0.01)]],
    [tailMat, [box(0.25, 0.3, 0.05, -1.0, 0.9, -L / 2 - 0.01), box(0.25, 0.3, 0.05, 1.0, 0.9, -L / 2 - 0.01)]],
  ]);
  g.userData = { length: L, width: W };
  return g;
}

// One Luas carriage: silver/grey body, yellow front, pantograph. Faces +z.
export function makeTramCar({ cab = false, len = 11 } = {}) {
  const W = 2.4;
  const silver = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.35, metalness: 0.6 });
  const purple = bodyMat(0x5b2c83), yellow = bodyMat(0xf3d21b);
  const parts = [
    [silver, [box(W, 2.6, len, 0, 1.75, 0)]],
    [purple, [box(W + 0.02, 0.35, len, 0, 0.6, 0)]],
    [glassMat, [box(W + 0.03, 1.1, len - 1.2, 0, 2.15, 0)]],
    [trimMat, [box(0.2, 0.9, 0.6, 0, 3.5, 0), box(1.6, 0.05, 0.3, 0, 4.0, 0)]],
    [tyreMat, [box(W - 0.3, 0.4, len - 1, 0, 0.3, 0)]],
  ];
  if (cab) {
    parts.push([yellow, [box(W, 2.3, 0.3, 0, 1.6, len / 2 + 0.1)]]);
    parts.push([glassMat, [box(W - 0.2, 1.1, 0.1, 0, 2.3, len / 2 + 0.28)]]);
    parts.push([headMat, [box(0.3, 0.15, 0.05, -0.8, 0.9, len / 2 + 0.28), box(0.3, 0.15, 0.05, 0.8, 0.9, len / 2 + 0.28)]]);
  }
  const g = assemble(parts);
  g.userData = { length: len, width: W };
  return g;
}

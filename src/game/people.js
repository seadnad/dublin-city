// Pedestrians: one instanced low-poly figure with a GPU walk cycle, walking the footpaths, crossing at
// junctions, pausing now and then, stepping out of the way of cars and opening umbrellas in the rain.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, v2, offsetPolyline } from '../world/geo.js';
import { KERB_H } from '../world/roads.js';
import { rng } from '../world/textures.js';
import { createContactShadows } from '../render/contact.js';

const rand = rng(2024);
// part ids: 0 coat/top, 1 skin, 2 hair, 3 left leg, 4 right leg, 5 left arm, 6 right arm, 7 shoes, 8 coat skirt
function part(geo, id, pivotY = 0, side = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(n).fill(id), 1));
  g.setAttribute('aPivot', new THREE.Float32BufferAttribute(new Float32Array(n * 2).map((_, i) => (i % 2 ? side : pivotY)), 2));
  g.deleteAttribute('uv');
  return g;
}
function personGeometry() {
  const parts = [];
  const cyl = (rt, rb, h, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, true);
  // torso (slightly tapered), shoulders
  parts.push(part(cyl(0.19, 0.16, 0.58).scale(1, 1, 0.62).translate(0, 1.16, 0), 0));
  parts.push(part(new THREE.SphereGeometry(0.19, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 0.62).translate(0, 1.44, 0), 0));
  // coat skirt (hidden per instance for short jackets)
  parts.push(part(cyl(0.165, 0.2, 0.34).scale(1, 1, 0.66).translate(0, 0.72, 0), 8));
  // neck, head, hair
  parts.push(part(cyl(0.05, 0.055, 0.1, 6).translate(0, 1.52, 0), 1));
  parts.push(part(new THREE.SphereGeometry(0.105, 8, 6).scale(0.92, 1.08, 1).translate(0, 1.64, 0), 1));
  parts.push(part(new THREE.SphereGeometry(0.113, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.95, 1.05, 1.05).translate(0, 1.655, -0.012), 2));
  // legs (pivot at the hip) and shoes
  for (const s of [-1, 1]) {
    parts.push(part(cyl(0.072, 0.055, 0.84).translate(s * 0.09, 0.47, 0), s < 0 ? 3 : 4, 0.9, s));
    parts.push(part(new THREE.BoxGeometry(0.1, 0.07, 0.24).translate(s * 0.09, 0.035, 0.04), 7, 0.9, s));
  }
  // arms (pivot at the shoulder) with hands
  for (const s of [-1, 1]) {
    parts.push(part(cyl(0.055, 0.045, 0.6).rotateZ(s * 0.08).translate(s * 0.225, 1.13, 0), s < 0 ? 5 : 6, 1.42, s));
    parts.push(part(new THREE.SphereGeometry(0.045, 4, 3).translate(s * 0.25, 0.8, 0), 1, 1.42, s));
  }
  // hands and shoes swing with their limbs: tag them via pivot side (limb id from side and pivot height)
  return mergeGeometries(parts);
}

const TOPS = ['#1d2230', '#2b2b2e', '#39414d', '#5a4a3a', '#7b6a55', '#23344f', '#4b5a3a', '#6e2a2a', '#a8a39a', '#1f1f22', '#3d2f4a', '#8a6a3a', '#c9b89a', '#2f5d7c', '#b23a2a', '#d8b43a'];
const BOTTOMS = ['#1b1d24', '#25262b', '#2d3a55', '#3b4a6b', '#4a4a4f', '#5a4d3e', '#1a1a1a', '#6b6f75'];
const SKIN = ['#f1d3bf', '#e8bfa3', '#d9a888', '#c48e6a', '#a26d4c', '#7a4e36', '#5a3826'];
const HAIR = ['#2a1d14', '#3b2a1c', '#5a3e25', '#8a6a42', '#c49a5a', '#b3542a', '#1b1b1b', '#8e8b86', '#d8d2c6'];
const UMBRELLAS = ['#141414', '#141414', '#141414', '#1b2744', '#6b1a1a', '#1d4a33', '#d8b43a', '#b23a2a', '#e8e6e0'];

export function createPeople(scene, { count = 240 } = {}) {
  const contact = createContactShadows(scene, count, { opacity: 0.45, round: true });
  for (let i = 0; i < count; i++) contact.alloc();
  const geo = personGeometry();
  const aTop = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const aBottom = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const aLook = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4); // skin, hair, coat (0/1), umbrella arm (0/1)
  const aWalk = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2); // phase, amount
  aWalk.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aTop', aTop); geo.setAttribute('aBottom', aBottom); geo.setAttribute('aLook', aLook); geo.setAttribute('aWalk', aWalk);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aPart; attribute vec2 aPivot; attribute vec3 aTop; attribute vec3 aBottom; attribute vec4 aLook; attribute vec2 aWalk;
        varying vec3 vPcol;
        vec3 skinCol(float t) {
          vec3 a = vec3(0.95, 0.8, 0.7), b = vec3(0.72, 0.5, 0.36), c = vec3(0.3, 0.18, 0.12);
          return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, t * 2.0 - 1.0);
        }
        vec3 hairCol(float t) {
          vec3 a = vec3(0.07, 0.05, 0.035), b = vec3(0.35, 0.22, 0.12), c = vec3(0.75, 0.6, 0.38), d = vec3(0.62, 0.61, 0.58);
          return t < 0.33 ? mix(a, b, t * 3.0) : t < 0.66 ? mix(b, c, t * 3.0 - 1.0) : mix(c, d, t * 3.0 - 2.0);
        }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = aWalk.x, amt = aWalk.y;
        float side = aPivot.y, pivot = aPivot.x;
        float swing = 0.0;
        if (pivot > 1.0) swing = -sin(ph + (side > 0.0 ? 0.0 : 3.14159)) * 0.42 * amt;      // arms swing against the legs
        else if (pivot > 0.5) swing = sin(ph + (side > 0.0 ? 0.0 : 3.14159)) * 0.5 * amt;   // legs
        // the umbrella arm is raised and still
        if (aLook.w > 0.5 && pivot > 1.0 && side > 0.0) swing = -1.35;
        if (swing != 0.0) {
          float c = cos(swing), s = sin(swing);
          float y = transformed.y - pivot, z = transformed.z;
          transformed.y = pivot + y * c - z * s;
          transformed.z = y * s + z * c;
        }
        if (aPart > 7.5 && aLook.z < 0.5) transformed *= 0.0; // no coat skirt
        transformed.y += abs(sin(ph)) * 0.035 * amt;
        vPcol = aPart < 0.5 || aPart > 7.5 ? aTop : aPart < 1.5 ? skinCol(aLook.x) : aPart < 2.5 ? hairCol(aLook.y)
              : aPart < 4.5 ? aBottom : aPart < 6.5 ? aTop : vec3(0.06);`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPcol;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vPcol;');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);

  // umbrellas
  const ugeo = mergeGeometries([
    new THREE.ConeGeometry(0.55, 0.28, 8, 1, true).translate(0, 2.08, 0).toNonIndexed(),
    new THREE.CylinderGeometry(0.012, 0.012, 0.75, 4).translate(0, 1.72, 0).toNonIndexed(),
  ]);
  const umbrellas = new THREE.InstancedMesh(ugeo, new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }), count);
  umbrellas.castShadow = true; umbrellas.frustumCulled = false;
  scene.add(umbrellas);

  // footpath lanes: each way side, trimmed back from junctions
  const lanes = [];
  for (const way of world.ways) {
    if (way.bridge) continue;
    const weight = /Grafton|Henry|Temple Bar|Fleet|Essex|Anglesea|Crown|Eustace|Westmoreland|College Green|Dame/.test(way.name) ? 4
      : way.type === 'boulevard' ? 4 : way.type === 'lane' ? 3 : way.type === 'primary' || way.type === 'quay' ? 1.6 : 1;
    for (const side of [1, -1]) {
      const off = way.type === 'lane' ? way.width / 2 - 0.9 : way.width / 2 + 1.25;
      lanes.push({ way, side, pts: offsetPolyline(way.pts, side > 0 ? -off : off), weight });
    }
  }
  // lanes near a point, weighted by how busy the street is (refreshed as the player moves)
  let nearby = lanes, nearbyAt = null, nearbyW = 0;
  const segNear = (l, c, r) => l.pts.some((p, i) => i < l.pts.length - 1 && Math.hypot((p.x + l.pts[i + 1].x) / 2 - c.x, (p.z + l.pts[i + 1].z) / 2 - c.z) < r + v2.len(v2.sub(l.pts[i + 1], p)) / 2);
  const refreshNearby = (c) => {
    if (nearbyAt && Math.hypot(c.x - nearbyAt.x, c.z - nearbyAt.z) < 25) return;
    nearbyAt = { x: c.x, z: c.z };
    nearby = lanes.filter((l) => segNear(l, c, 150));
    if (!nearby.length) nearby = lanes;
    nearbyW = nearby.reduce((s, l) => s + l.weight, 0);
  };
  const pickLane = () => {
    let r = rand() * nearbyW;
    for (const l of nearby) { r -= l.weight; if (r <= 0) return l; }
    return nearby[0];
  };
  const lanesAt = new Map(); // nodeId -> lanes touching it
  for (const l of lanes) for (const id of [l.way.nodeIds[0], l.way.nodeIds[l.way.nodeIds.length - 1]]) {
    if (!lanesAt.has(id)) lanesAt.set(id, []);
    lanesAt.get(id).push(l);
  }
  const clearOf = (id) => {
    const n = world.nodes.get(id);
    if (n.edges.length < 3) return 0;
    let w = 0; for (const wy of n.ways) w = Math.max(w, wy.width);
    return w / 2 + 3;
  };
  // point i of a lane, pulled back from junction nodes so people wait at the corner rather than in the road
  const lanePoint = (l, i, dir) => {
    const p = l.pts[i], id = l.way.nodeIds[i];
    const clear = clearOf(id);
    if (!clear) return p;
    const j = Math.max(0, Math.min(l.pts.length - 1, i - dir));
    const d = v2.norm(v2.sub(l.pts[j], p));
    return v2.add(p, v2.scale(d, Math.min(clear, v2.len(v2.sub(l.pts[j], p)) * 0.45)));
  };

  const people = [];
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const p = {
      i, x: 0, z: 0, heading: 0, speed: 1.1 + rand() * 0.55, phase: rand() * 6.28, walk: 1,
      pause: 0, dodge: 0, dodgeX: 0, dodgeZ: 0, jitter: (rand() - 0.5) * 0.7, scale: 0.9 + rand() * 0.18,
      umbrella: rand() < 0.65,
    };
    col.set(TOPS[Math.floor(rand() * TOPS.length)]).toArray(aTop.array, i * 3);
    col.set(BOTTOMS[Math.floor(rand() * BOTTOMS.length)]).toArray(aBottom.array, i * 3);
    aLook.array.set([Math.pow(rand(), 1.8), rand() < 0.12 ? 0.7 + rand() * 0.3 : rand() * 0.6, rand() < 0.45 ? 1 : 0, 0], i * 4);
    umbrellas.setColorAt(i, col.set(UMBRELLAS[Math.floor(rand() * UMBRELLAS.length)]));
    people.push(p);
  }

  function place(p, near) {
    for (let tries = 0; tries < 80; tries++) {
      const l = pickLane();
      const i = Math.floor(rand() * (l.pts.length - 1));
      const t = rand();
      const a = l.pts[i], b = l.pts[i + 1];
      const q = v2.lerp(a, b, t);
      if (near && tries < 79) {
        const d = Math.hypot(q.x - near.x, q.z - near.z);
        if (d < near.min || d > near.max) continue;
      }
      p.lane = l; p.dir = rand() < 0.5 ? 1 : -1; p.idx = p.dir > 0 ? i + 1 : i;
      p.x = q.x; p.z = q.z;
      p.target = lanePoint(l, p.idx, p.dir);
      return;
    }
  }
  function nextTarget(p) {
    const l = p.lane;
    const last = l.pts.length - 1;
    if ((p.dir > 0 && p.idx < last) || (p.dir < 0 && p.idx > 0)) {
      p.idx += p.dir;
      p.target = lanePoint(l, p.idx, p.dir);
      return;
    }
    // end of the street: pick another footpath at this junction (may mean crossing the road)
    const nodeId = l.way.nodeIds[p.idx];
    const options = (lanesAt.get(nodeId) || []).filter((o) => o !== l);
    const o = options.length && rand() < 0.9 ? options[Math.floor(rand() * options.length)] : l;
    p.lane = o;
    const at = o.way.nodeIds.indexOf(nodeId);
    p.dir = at === 0 ? 1 : at === o.pts.length - 1 ? -1 : (rand() < 0.5 ? 1 : -1);
    if (o === l) p.dir = -p.dir;
    p.idx = Math.max(0, Math.min(o.pts.length - 1, at + p.dir));
    p.target = lanePoint(o, at, p.dir);
    p.crossing = true;
    if (rand() < 0.25) p.pause = 1 + rand() * 4; // wait at the kerb
  }

  let raining = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3(), zero = new THREE.Vector3(0, 0, 0);
  let initialised = false;
  return {
    people,
    setRain(on) { raining = on; for (const p of people) aLook.array[p.i * 4 + 3] = on && p.umbrella ? 1 : 0; aLook.needsUpdate = true; },
    update(dt, focus, car) {
      refreshNearby(focus);
      if (!initialised) { for (const p of people) place(p, { x: focus.x, z: focus.z, min: 0, max: 130 }); initialised = true; }
      const cs = car ? Math.abs(car.speed) : 0;
      const cfx = car ? Math.sin(car.heading) : 0, cfz = car ? Math.cos(car.heading) : 0;
      for (const p of people) {
        const dxF = p.x - focus.x, dzF = p.z - focus.z;
        if (dxF * dxF + dzF * dzF > 150 * 150) place(p, { x: focus.x, z: focus.z, min: 70, max: 140 });
        let moving = 0;
        if (p.dodge > 0) {
          p.dodge -= dt;
          p.x += p.dodgeX * dt; p.z += p.dodgeZ * dt;
          moving = 1.6;
        } else if (p.pause > 0) {
          p.pause -= dt;
        } else {
          let tx = p.target.x - p.x, tz = p.target.z - p.z;
          const d = Math.hypot(tx, tz);
          if (d < 0.6) { nextTarget(p); if (p.crossing && rand() < 0.02) p.pause = 2; }
          else {
            const step = Math.min(d, p.speed * dt);
            // side jitter keeps people from walking in single file
            const nx = -tz / d, nz = tx / d;
            p.x += (tx / d) * step + nx * p.jitter * step * 0.02;
            p.z += (tz / d) * step + nz * p.jitter * step * 0.02;
            const want = Math.atan2(tx, tz);
            let dh = Math.atan2(Math.sin(want - p.heading), Math.cos(want - p.heading));
            p.heading += dh * Math.min(1, dt * 6);
            moving = 1;
            if (rand() < dt * 0.02) p.pause = 2 + rand() * 6; // stop to chat / look in a window
          }
        }
        // get out of the way of the player's car
        if (car && cs > 1.5 && p.dodge <= 0) {
          const rx = p.x - car.pos.x, rz = p.z - car.pos.z;
          const along = rx * cfx + rz * cfz, lat = rx * cfz - rz * cfx;
          if (along > -1 && along < 4 + cs * 0.6 && Math.abs(lat) < 2.2) {
            const s = lat >= 0 ? 1 : -1;
            p.dodgeX = cfz * s * 4.5; p.dodgeZ = -cfx * s * 4.5; p.dodge = 0.5; p.pause = 0.8;
          }
        }
        p.phase += dt * (moving ? 6.2 * (p.speed / 1.35) * moving : 0);
        p.walk += ((moving ? 1 : 0) - p.walk) * Math.min(1, dt * 6);
        aWalk.array[p.i * 2] = p.phase; aWalk.array[p.i * 2 + 1] = p.walk;
        // footpath height, or the road when crossing
        const onRoad = world.nearestRoad(p.x, p.z);
        const y = onRoad && onRoad.edgeDist < -0.2 ? 0 : KERB_H;
        q.setFromAxisAngle(up, p.heading);
        mesh.setMatrixAt(p.i, m4.compose(P.set(p.x, y, p.z), q, S.setScalar(p.scale)));
        contact.set(p.i, p.x, y, p.z, p.heading, 0.75 * p.scale, 0.75 * p.scale);
        if (raining && p.umbrella) umbrellas.setMatrixAt(p.i, m4.compose(P.set(p.x + Math.cos(p.heading) * 0.12 * p.scale, y, p.z - Math.sin(p.heading) * 0.12 * p.scale), q, S.setScalar(p.scale)));
        else umbrellas.setMatrixAt(p.i, m4.compose(P, q, zero));
      }
      mesh.instanceMatrix.needsUpdate = true;
      umbrellas.instanceMatrix.needsUpdate = true;
      contact.commit();
      aWalk.needsUpdate = true;
    },
  };
}

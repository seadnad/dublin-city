// Garda Air Support Unit helicopter (EC135 style): the Blender model (public/models/heli.glb, tools/blender/build_heli.py)
// with its livery painted at load, spinning rotors that blur into discs, a night searchlight beam, and arcade flight.
//
// Flight: tilt to move (pitch / roll, auto-levels on release), yaw on the pedals, collective up / down. Momentum is
// gentle, altitude is capped at MAX_ALT, and it settles onto its skids on anything flat (roofs included). The city
// is a height field (heightmap.js): the rotor disc is kept clear of anything taller than the skids, sliding along
// walls rather than crashing.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { addReflections } from '../render/reflect.js';

export const MAX_ALT = 250;
const R_ROTOR = 5.2;   // main rotor radius: the collision ring
const FOOT = 1.7;      // half-size of the skid footprint (square) for the floor under the helicopter
const TILT = 0.3;      // full-stick tilt, radians

// ------------------------------------------------------------------ livery (painted onto the body's side projection)
const WHITE = '#f4f5f3', NAVY = '#16296e', YELLOW = '#e8ee00';
function paintLivery({ len, z0, z1 }) {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  // side A (top half): viewer on the helicopter's left, nose on the left; side B (bottom half): nose on the right
  for (const side of [0, 1]) {
    const X = (s) => (side ? 1 - s / len : s / len) * S;
    const Y = (z) => side * (S / 2) + ((z1 - z) / (z1 - z0)) * (S / 2);
    g.save();
    g.beginPath(); g.rect(0, side * S / 2, S, S / 2); g.clip();
    g.fillStyle = WHITE; g.fillRect(0, side * S / 2, S, S / 2);
    // dark blue below a line that follows the fuselage: under the doors, rising over the rear clamshells to
    // the middle of the boom, the lower half of the fenestron
    const edge = [[0, 1.24], [0.5, 1.16], [1.3, 1.12], [3.8, 1.12], [4.5, 1.3], [5.3, 1.72], [6.2, 1.88], [9.0, 1.98], [len, 2.0]];
    g.beginPath();
    g.moveTo(X(0), Y(z0 - 1));
    for (const [s, z] of edge) g.lineTo(X(s), Y(z));
    g.lineTo(X(len), Y(z0 - 1));
    g.closePath(); g.fillStyle = NAVY; g.fill();
    // yellow band along the top of the blue
    g.beginPath();
    for (const [s, z] of edge) g.lineTo(X(s), Y(z + 0.12));
    for (let i = edge.length - 1; i >= 0; i--) g.lineTo(X(edge[i][0]), Y(edge[i][1]));
    g.closePath(); g.fillStyle = YELLOW; g.fill();
    // fin cap and horizontal stabiliser colour: the top of the fin is blue
    g.fillStyle = NAVY;
    g.fillRect(Math.min(X(9.0), X(len)), Y(3.7), Math.abs(X(len) - X(9.0)), Y(3.42) - Y(3.7));
    // tricolour on the fin, green toward the nose
    const flag = [['#169b62', 9.6], [WHITE, 9.76], ['#ff883e', 9.92]];
    for (const [col, s] of flag) {
      g.fillStyle = col;
      g.fillRect(Math.min(X(s), X(s + 0.16)), Y(3.28), Math.abs(X(s + 0.16) - X(s)), Y(3.02) - Y(3.28));
    }
    g.strokeStyle = '#9aa0a6'; g.lineWidth = 1;
    g.strokeRect(Math.min(X(9.6), X(10.08)), Y(3.28), Math.abs(X(10.08) - X(9.6)), Y(3.02) - Y(3.28));
    // GARDA on the rear cabin door, the crest ahead of it on the front door
    const text = (s, z, str, hM, col, weight = '900') => {
      const px = (hM / (z1 - z0)) * (S / 2);
      g.font = `${weight} ${px}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
      g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      // letters are drawn at their true width in metres: the texture's x scale differs from y
      const sx = (S / len) / ((S / 2) / (z1 - z0));
      g.save(); g.translate(X(s), Y(z)); g.scale(sx, 1); g.fillText(str, 0, 0); g.restore();
    };
    text(2.55, 1.3, 'GARDA', 0.26, NAVY);
    g.beginPath(); g.arc(X(1.62), Y(1.43), (0.11 / (z1 - z0)) * (S / 2), 0, Math.PI * 2);
    g.fillStyle = NAVY; g.fill();
    g.beginPath(); g.arc(X(1.62), Y(1.43), (0.07 / (z1 - z0)) * (S / 2), 0, Math.PI * 2);
    g.fillStyle = '#d7b44a'; g.fill();
    // fleet number on the cowling, ahead of the mast
    text(2.95, 2.62, '272', 0.16, '#1b1c1e', '700');
    // a few panel lines: the door outlines
    g.strokeStyle = 'rgba(40,45,55,0.35)'; g.lineWidth = 1.5;
    for (const [s0, s1] of [[1.36, 2.04], [2.06, 3.04]]) g.strokeRect(Math.min(X(s0), X(s1)), Y(2.36), Math.abs(X(s1) - X(s0)), Y(1.14) - Y(2.36));
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false; // glTF UV convention
  t.anisotropy = 4;
  return t;
}

// a soft ring with faint blade streaks, for the rotor at speed
function discTexture(streaks) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), m = S / 2;
  const grad = g.createRadialGradient(m, m, m * 0.06, m, m, m);
  grad.addColorStop(0, 'rgba(40,42,46,0)');
  grad.addColorStop(0.12, 'rgba(40,42,46,0.16)');
  grad.addColorStop(0.85, 'rgba(50,52,56,0.1)');
  grad.addColorStop(0.97, 'rgba(70,72,76,0.16)');
  grad.addColorStop(1, 'rgba(40,42,46,0)');
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'source-atop';
  for (let k = 0; k < streaks; k++) {
    const a = (k / streaks) * Math.PI * 2;
    g.save(); g.translate(m, m); g.rotate(a);
    const sg = g.createLinearGradient(0, -10, 0, 10);
    sg.addColorStop(0, 'rgba(30,30,34,0)'); sg.addColorStop(0.5, 'rgba(30,30,34,0.14)'); sg.addColorStop(1, 'rgba(30,30,34,0)');
    g.fillStyle = sg; g.fillRect(0, -12, m, 24);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// searchlight beam: an additive cone, bright at the lamp and fading along its length and toward its edges
function beamMesh() {
  const geo = new THREE.CylinderGeometry(0.02, 1, 1, 24, 6, true);
  geo.translate(0, -0.5, 0); geo.rotateX(-Math.PI / 2); // apex at the origin, opening along +z to radius 1 at z = 1
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0xfff2d8) }, uLevel: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vL; varying vec3 vN; varying vec3 vV;
      void main() {
        vL = position.z;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uLevel;
      varying float vL; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float along = pow(1.0 - clamp(vL, 0.0, 1.0), 1.4) * 0.9 + 0.1 * (1.0 - vL);
        gl_FragColor = vec4(uColor * uLevel * edge * along * 0.5, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = 3;
  return m;
}

let gltfPromise = null;
function loadGLB() {
  if (!gltfPromise) {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`));
    gltfPromise = loader.loadAsync(`${import.meta.env.BASE_URL}models/heli.glb`);
  }
  return gltfPromise;
}

// The helicopter's scene graph and its visual controls. Returns null if the model can't be loaded.
export async function loadHeli() {
  let gltf;
  try { gltf = await loadGLB(); } catch (e) { console.warn('heli model failed to load', e); return null; }
  const root = gltf.scene;
  const group = new THREE.Group();
  group.name = 'helicopter';
  group.rotation.order = 'YXZ';
  group.add(root);
  let bodyInfo = null;
  root.traverse((o) => { if (!bodyInfo && o.userData && o.userData.livery_len) bodyInfo = o.userData; });
  const livery = paintLivery({ len: bodyInfo ? bodyInfo.livery_len : 10.5, z0: bodyInfo ? bodyInfo.livery_z0 : 0.55, z1: bodyInfo ? bodyInfo.livery_z1 : 3.55 });

  const std = (o) => new THREE.MeshStandardMaterial(o);
  const lens = std({ color: 0xeef3f6, emissive: 0xfff4dc, emissiveIntensity: 0.3, roughness: 0.2 });
  const navR = std({ color: 0x8a0f0f, emissive: 0xff2010, emissiveIntensity: 1.5, roughness: 0.3 });
  const navG = std({ color: 0x0f6a1f, emissive: 0x20ff50, emissiveIntensity: 1.5, roughness: 0.3 });
  const strobe = std({ color: 0xdddddd, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.3 });
  const table = {
    heli_body: addReflections(new THREE.MeshPhysicalMaterial({ map: livery, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15 }), 0.9),
    heli_glass: addReflections(new THREE.MeshPhysicalMaterial({ color: 0x0c1014, roughness: 0.05, metalness: 0.2, specularIntensity: 1 }), 0.95),
    heli_blade: std({ color: 0x2a2c30, roughness: 0.55 }),
    heli_hub: std({ color: 0xb9bdc2, metalness: 0.9, roughness: 0.35 }),
    heli_skid: std({ color: 0x1d3a8a, roughness: 0.45 }),
    heli_dark: std({ color: 0x17181a, roughness: 0.7 }),
    heli_lens: lens, heli_nav_red: navR, heli_nav_green: navG, heli_strobe: strobe,
  };
  const fallback = std({ color: 0x888888 });
  let rotorMain = null, rotorTail = null, searchlight = null;
  root.traverse((o) => {
    if (o.name === 'rotor_main') rotorMain = o;
    if (o.name === 'rotor_tail') rotorTail = o;
    if (o.name === 'searchlight') searchlight = o;
    if (!o.isMesh) return;
    o.material = table[o.material.name] || fallback;
    o.castShadow = true; o.receiveShadow = true;
  });
  if (!searchlight) { searchlight = new THREE.Object3D(); searchlight.position.set(-0.62, 0.62, 2.1); root.add(searchlight); }

  // rotor discs: shown as the rotor spins up, the blades fade out behind them
  const discMat = new THREE.MeshLambertMaterial({ map: discTexture(4), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.15, 40).rotateX(-Math.PI / 2), discMat);
  const hub = rotorMain ? rotorMain.position : new THREE.Vector3(0, 3.34, 0);
  disc.position.set(hub.x, hub.y + 0.02, hub.z);
  disc.renderOrder = 2;
  const tailMat = new THREE.MeshLambertMaterial({ map: discTexture(10), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
  const tailDisc = new THREE.Mesh(new THREE.CircleGeometry(0.47, 20).rotateY(Math.PI / 2), tailMat);
  if (rotorTail) tailDisc.position.copy(rotorTail.position);
  tailDisc.renderOrder = 2;
  root.add(disc, tailDisc);

  const beam = beamMesh();
  beam.visible = false;

  let spinMain = 0, spinTail = 0, strobeT = 0, night = 0;
  const lp = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
  return {
    group, searchlight, beam,
    // rpm: 0..1 of flight speed
    update(dt, rpm) {
      spinMain -= dt * rpm * 41; // ~395 rpm, clockwise seen from above
      spinTail += dt * rpm * 55;
      if (rotorMain) {
        rotorMain.rotation.y = spinMain;
        // the blades vanish into the disc at speed (at 60 fps they would strobe anyway)
        rotorMain.visible = rpm < 0.8;
      }
      if (rotorTail) { rotorTail.rotation.x = spinTail; rotorTail.visible = rpm < 0.5; }
      discMat.opacity = THREE.MathUtils.clamp((rpm - 0.35) / 0.45, 0, 1);
      disc.visible = discMat.opacity > 0.01;
      disc.rotation.y = spinMain * 0.013; // a slow drift of the streaks
      tailMat.opacity = THREE.MathUtils.clamp((rpm - 0.2) / 0.3, 0, 1) * 0.9;
      tailDisc.visible = tailMat.opacity > 0.01;
      // anti-collision strobe on the fin: a double flash every second while running
      strobeT = (strobeT + dt) % 1.1;
      strobe.emissiveIntensity = rpm > 0.1 && (strobeT < 0.05 || (strobeT > 0.14 && strobeT < 0.19)) ? 12 : 0;
    },
    setNight(level) {
      night = level;
      navR.emissiveIntensity = navG.emissiveIntensity = 1.5 + level * 3;
    },
    // point the beam from the lamp to a world point (or hide it); level 0..1
    aimBeam(on, target, level) {
      beam.visible = on && level > 0.01;
      lens.emissiveIntensity = on ? 0.5 + 6 * Math.max(level, night) : 0.3;
      if (!beam.visible) return;
      searchlight.getWorldPosition(lp);
      dir.subVectors(target, lp);
      const len = dir.length();
      dir.divideScalar(len || 1);
      beam.position.copy(lp);
      beam.quaternion.copy(q.setFromUnitVectors(Z, dir));
      const r = Math.tan(0.07) * len; // ~8 degree beam
      beam.scale.set(r, r, len);
      beam.material.uniforms.uLevel.value = level;
    },
  };
}

// ------------------------------------------------------------------ arcade flight
export class Heli {
  constructor() {
    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.heading = 0; this.yawRate = 0;
    this.pitch = 0; this.roll = 0; // visual tilt: + pitch = nose down, + roll = right side down
    this.rpm = 0; this.landed = true; this.floor = 0; this.water = false;
    this.impact = 0;
    this.speed = 0; // horizontal speed, m/s
    this.street = null;
  }
  get alt() { return this.pos.y - this.floor; }

  place(x, y, z, heading) {
    Object.assign(this.pos, { x, y, z });
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.heading = heading; this.yawRate = 0; this.pitch = this.roll = 0;
    this.landed = true; this.rpm = 0; this.floor = y;
  }

  // inp: { pitch, roll, yaw, lift } in -1..1 (+pitch forward, +roll right, +yaw right, +lift up)
  // env: { hm (height field), bounds, overWater(x, z), waterY, spooling }
  update(dt, inp, env) {
    // rotor spools up over ~2.5 s once running
    this.rpm = Math.min(1, this.rpm + dt * 0.4);
    const steps = dt > 1 / 45 ? 2 : 1, h = dt / steps;
    for (let i = 0; i < steps; i++) this.step(h, inp, env);
    this.impact *= Math.exp(-dt * 4);
  }

  floorAt(x, z, env) {
    let f = env.hm ? env.hm.maxIn(x, z, FOOT) : 0;
    const w = env.overWater(x, z);
    if (w) f = Math.max(f, env.waterY + 2.6); // a cushion of downwash over the river: it won't settle on water
    return { f, w };
  }

  step(dt, inp, env) {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const rx = -fz, rz = fx; // the helicopter's right
    // ---- attitude: stick sets a tilt, released it levels out; on the skids it stays level
    const grounded = this.landed;
    const tp = grounded ? 0 : inp.pitch * TILT, tr = grounded ? 0 : inp.roll * TILT;
    this.pitch += (tp - this.pitch) * Math.min(1, dt * 2.4);
    this.roll += (tr - this.roll) * Math.min(1, dt * 2.4);
    // ---- horizontal: tilt accelerates (arcade: straight from the tilt, no lift vector maths), linear drag
    const aF = (this.pitch / TILT) * 11, aR = (this.roll / TILT) * 8.5;
    const idle = 1 - Math.min(1, Math.abs(inp.pitch) + Math.abs(inp.roll));
    const drag = 0.24 + idle * 0.22;
    this.vel.x += (fx * aF + rx * aR - this.vel.x * drag) * dt;
    this.vel.z += (fz * aF + rz * aR - this.vel.z * drag) * dt;
    if (grounded) { const k = Math.exp(-dt * 6); this.vel.x *= k; this.vel.z *= k; }
    // ---- yaw: pedals, plus a coordinated turn when banking at speed
    const vF = this.vel.x * fx + this.vel.z * fz;
    let yawT = -inp.yaw * (grounded ? 0.6 : 1.25);
    if (!grounded) yawT -= (this.roll / TILT) * Math.min(1, Math.max(0, vF) / 18) * 0.55;
    this.yawRate += (yawT - this.yawRate) * Math.min(1, dt * 3);
    this.heading += this.yawRate * dt;
    // ---- vertical: the collective sets a climb rate; hands off holds altitude
    let vyT = inp.lift > 0 ? inp.lift * 9 : inp.lift * 7;
    if (this.rpm < 0.85) vyT = Math.min(vyT, 0);
    if (this.pos.y > MAX_ALT - 25) vyT = Math.min(vyT, (MAX_ALT - this.pos.y) * 0.4);
    this.vel.y += (vyT - this.vel.y) * Math.min(1, dt * 1.8);

    // ---- move, horizontally first: keep the rotor disc clear of buildings, slide along them
    const ox = this.pos.x, oz = this.pos.z;
    let nx = ox + this.vel.x * dt, nz = oz + this.vel.z * dt;
    const bottom = this.pos.y;
    const blocked = (x, z) => this.floorAt(x, z, env).f > bottom + 3.2; // a wall, not a kerb or a step onto a roof
    if (blocked(nx, nz)) {
      if (!blocked(nx, oz)) { nz = oz; this.bump(0, Math.sign(-this.vel.z) || 1); this.vel.z *= -0.2; }
      else if (!blocked(ox, nz)) { nx = ox; this.bump(Math.sign(-this.vel.x) || 1, 0); this.vel.x *= -0.2; }
      else { nx = ox; nz = oz; this.impact = Math.max(this.impact, Math.hypot(this.vel.x, this.vel.z)); this.vel.x *= -0.2; this.vel.z *= -0.2; }
    }
    this.pos.x = nx; this.pos.z = nz;
    // rotor ring: anything poking above the skids within the disc pushes the helicopter away
    if (env.hm) {
      let px = 0, pz = 0, n = 0;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
        for (const r of [R_ROTOR, R_ROTOR * 0.55]) {
          const hh = env.hm.at(this.pos.x + cx * r, this.pos.z + cz * r);
          const over = hh - (bottom + 1.2);
          if (over > 0) { const w = Math.min(1, over / 2); px -= cx * w; pz -= cz * w; n++; }
        }
      }
      if (n) {
        const l = Math.hypot(px, pz);
        if (l > 1e-3) {
          px /= l; pz /= l;
          const vn = this.vel.x * px + this.vel.z * pz;
          if (vn < 0) { this.vel.x -= px * vn * 1.25; this.vel.z -= pz * vn * 1.25; this.impact = Math.max(this.impact, -vn); }
          const push = Math.min(8, 2 + n * 0.6) * dt;
          this.pos.x += px * push; this.pos.z += pz * push;
        }
      }
    }
    // map edge: a soft wall
    const B = env.bounds, m = 30;
    if (this.pos.x < B.minX + m) { this.pos.x += (B.minX + m - this.pos.x) * Math.min(1, dt * 3); this.vel.x = Math.max(this.vel.x, 0); }
    if (this.pos.x > B.maxX - m) { this.pos.x -= (this.pos.x - (B.maxX - m)) * Math.min(1, dt * 3); this.vel.x = Math.min(this.vel.x, 0); }
    if (this.pos.z < B.minZ + m) { this.pos.z += (B.minZ + m - this.pos.z) * Math.min(1, dt * 3); this.vel.z = Math.max(this.vel.z, 0); }
    if (this.pos.z > B.maxZ - m) { this.pos.z -= (this.pos.z - (B.maxZ - m)) * Math.min(1, dt * 3); this.vel.z = Math.min(this.vel.z, 0); }

    // ---- vertical: ground effect near the floor, settle onto the skids
    const { f, w } = this.floorAt(this.pos.x, this.pos.z, env);
    this.floor = f; this.water = w;
    const alt = this.pos.y - f;
    if (this.vel.y < 0 && alt < 8) this.vel.y = Math.max(this.vel.y, -(0.7 + alt * 0.8)); // cushion
    if (this.landed && inp.lift > 0.05 && this.rpm >= 0.85) this.landed = false;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= f) {
      // stepping onto something (a roof edge, a kerb): rise onto it gently instead of snapping
      const under = f - this.pos.y;
      this.pos.y = under > 0.4 ? this.pos.y + Math.min(under, dt * 6) : f;
      if (this.vel.y < 0) this.vel.y = 0;
      if (!w && inp.lift <= 0.05 && Math.hypot(this.vel.x, this.vel.z) < 6) this.landed = true;
    } else if (alt > 0.3) this.landed = false;
    if (this.landed) { this.pos.y = Math.max(this.pos.y, f); this.vel.y = Math.max(0, this.vel.y); }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
  }

  bump(sx, sz) { this.impact = Math.max(this.impact, 2); }
}

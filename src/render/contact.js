// Soft contact shadows: a dark, blurred rounded-rectangle under each vehicle and a round one under each person.
// They ground objects where the sun shadow can't: in the shade of buildings, beyond the shadow map's range,
// and in overcast rain / at night. One instanced mesh per system; each instance is a flat quad.
// (alphaMap reads the green channel, so the shapes are drawn white on transparent.)
import * as THREE from 'three';

function blobTexture() {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  // rounded-rectangle core with a wide soft falloff (drawn as stacked blurred rects)
  g.filter = 'blur(14px)';
  g.fillStyle = 'rgba(255,255,255,1)';
  g.beginPath(); g.roundRect(30, 22, S - 60, S - 44, 26); g.fill();
  g.filter = 'blur(5px)';
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath(); g.roundRect(38, 30, S - 76, S - 60, 18); g.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}

// A car's footprint: a very soft body-sized blob plus darker, tighter pools where the tyres meet the road
// (proportions of the i40: 2.5 m x 5.3 m quad, track 1.59 m, axles +1.46 / -1.31 m).
function carTexture() {
  const W = 128, H = 256, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.filter = 'blur(16px)';
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath(); g.roundRect(28, 30, W - 56, H - 60, 30); g.fill();
  g.filter = 'blur(7px)';
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.beginPath(); g.roundRect(36, 46, W - 72, H - 92, 20); g.fill();
  g.filter = 'blur(4px)';
  g.fillStyle = 'rgba(255,255,255,1)';
  for (const v of [0.5 - 1.457 / 5.3, 0.5 + 1.3125 / 5.3]) for (const u of [0.5 - 0.318, 0.5 + 0.318]) {
    g.beginPath(); g.ellipse(u * W, v * H, 8, 20, 0, 0, Math.PI * 2); g.fill();
  }
  return new THREE.CanvasTexture(c);
}

export function createContactShadows(scene, max, { opacity = 0.55, round = false, color = 0x000000, additive = false, shape = null } = {}) {
  let tex;
  if (shape === 'car') tex = carTexture();
  else if (round) {
    const S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    tex = new THREE.CanvasTexture(c);
  } else tex = blobTexture();
  const mat = new THREE.MeshBasicMaterial({
    color, alphaMap: tex, transparent: true, opacity, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let dirty = false;
  return {
    mesh,
    alloc() { const i = mesh.count++; mesh.setMatrixAt(i, m.makeScale(0, 0, 0)); dirty = true; return i; },
    // footprint w (across) x l (along), slightly larger than the object so the falloff shows round it
    set(i, x, y, z, heading, w, l) {
      q.setFromAxisAngle(up, heading);
      mesh.setMatrixAt(i, m.compose(p.set(x, y + 0.02, z), q, s.set(w, 1, l)));
      dirty = true;
    },
    hide(i) { mesh.setMatrixAt(i, m.makeScale(0, 0, 0)); dirty = true; },
    commit() { if (dirty) { mesh.instanceMatrix.needsUpdate = true; dirty = false; } },
    setOpacity(o) { mat.opacity = o; },
  };
}

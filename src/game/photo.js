// Photo mode: a free camera for good shots. The world freezes (or keeps moving, "Live"), the game HUD hides and a
// slim bar offers the lens (field of view), live / frozen, hide the car, a slow auto-orbit for filming, and Snap,
// which saves a sharper PNG (the share sheet on phones, so it can go straight to Photos).
// Mouse: drag orbits, right-drag (or Shift-drag) pans, wheel zooms. Touch: one finger orbits, two pinch and pan.
// Keys: WASD / arrows move, PageUp / PageDown raise and lower, [ ] lens, Space snap, P or Esc exits.
// Controller (click the right stick to enter): left stick moves, right stick orbits, LT / RT zoom, LB / RB lens,
// A snaps, B exits.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createPhotoMode({ camera, canvas, onEnter, onExit, getPad }) {
  const st = { active: false, live: false, orbit: false, hideCar: false, snap: false };
  const target = new THREE.Vector3();
  let yaw = 0, pitch = 0.3, dist = 12, fov = 55;
  const keys = new Set();

  const bar = document.createElement('div');
  bar.id = 'photo';
  bar.hidden = true;
  bar.innerHTML = `
    <p class="hint">Drag to orbit · scroll or pinch to zoom · right-drag or two fingers to pan · WASD to move</p>
    <div class="photo-bar">
      <button data-p="exit" title="Exit photo mode (P)">✕ Exit</button>
      <label class="lens" title="Lens ([ ])">Lens <input type="range" min="20" max="95" step="1" value="55" aria-label="Field of view"></label>
      <button data-p="live" title="Keep the city moving">Live</button>
      <button data-p="car" title="Hide your car">Hide car</button>
      <button data-p="orbit" title="Slow auto-orbit, for filming">Orbit</button>
      <button data-p="snap" class="snap" title="Save a picture (Space)">📷 Snap</button>
    </div>`;
  document.body.appendChild(bar);
  const lens = bar.querySelector('input');
  const setBtn = (k, on) => bar.querySelector(`[data-p="${k}"]`).classList.toggle('on', on);
  lens.addEventListener('input', () => { fov = +lens.value; });
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    const k = b.dataset.p;
    if (k === 'exit') exit();
    else if (k === 'snap') st.snap = true;
    else if (k === 'live') setBtn('live', (st.live = !st.live));
    else if (k === 'car') setBtn('car', (st.hideCar = !st.hideCar));
    else if (k === 'orbit') setBtn('orbit', (st.orbit = !st.orbit));
    b.blur();
  });

  function enter(focus) {
    if (st.active) return;
    st.active = true; bar.hidden = false;
    // start from wherever the game camera is, orbiting the car
    target.set(focus.x, focus.y ?? 1.2, focus.z);
    const off = camera.position.clone().sub(target);
    dist = clamp(off.length(), 2, 600);
    yaw = Math.atan2(off.x, off.z);
    pitch = clamp(Math.asin(off.y / dist), -0.2, 1.55);
    fov = Math.round(camera.fov); lens.value = fov;
    camera.up.set(0, 1, 0);
    onEnter && onEnter();
  }
  function exit() {
    if (!st.active) return;
    st.active = false; bar.hidden = true; keys.clear(); pointers.clear();
    onExit && onExit();
  }

  // ---- pointer: orbit / pan / pinch on the game canvas
  const pointers = new Map();
  let pinch = null;
  const pan = (dx, dy) => {
    const k = dist * 0.0016 * (fov / 55);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw); // camera right, on the ground
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // camera forward, on the ground
    target.x += (-dx * rx + dy * fx) * k;
    target.z += (-dx * rz + dy * fz) * k;
  };
  canvas.addEventListener('contextmenu', (e) => { if (st.active) e.preventDefault(); });
  canvas.addEventListener('pointerdown', (e) => {
    if (!st.active) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey });
    pinch = null;
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!st.active || !p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinch) { dist = clamp(dist * (pinch.d / Math.max(d, 1)), 1.5, 600); pan(m.x - pinch.m.x, m.y - pinch.m.y); }
      pinch = { d, m };
    } else if (p.button === 2 || p.shift) pan(dx, dy);
    else { yaw -= dx * 0.005; pitch = clamp(pitch + dy * 0.004, -0.2, 1.55); }
  });
  const up = (e) => { pointers.delete(e.pointerId); pinch = null; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    if (!st.active) return;
    e.preventDefault();
    dist = clamp(dist * Math.exp(e.deltaY * 0.001), 1.5, 600);
  }, { passive: false });

  // ---- keys (the game's own key actions still work: N night, R rain, X siren)
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!st.active) return;
    if (k === 'escape') exit();
    else if (k === ' ') { e.preventDefault(); if (!e.repeat) st.snap = true; }
    else if (k === '[') { fov = clamp(fov - 3, 20, 95); lens.value = fov; }
    else if (k === ']') { fov = clamp(fov + 3, 20, 95); lens.value = fov; }
    keys.add(k);
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  const padPrev = [];
  const look = new THREE.Vector3();
  function update(dt) {
    if (!st.active) return;
    // keyboard movement, faster when zoomed out
    const speed = (8 + dist * 0.9) * dt * (keys.has('shift') ? 3 : 1);
    const mv = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const st2 = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const lift = (keys.has('pageup') ? 1 : 0) - (keys.has('pagedown') ? 1 : 0);
    // controller
    const g = getPad && getPad();
    let zoom = 0, fovIn = 0, mvP = 0, stP = 0, orbX = 0, orbY = 0;
    if (g) {
      const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
      stP = dz(g.axes[0] || 0); mvP = -dz(g.axes[1] || 0); orbX = dz(g.axes[2] || 0); orbY = dz(g.axes[3] || 0);
      const b = (i) => (g.buttons[i] ? g.buttons[i].value || (g.buttons[i].pressed ? 1 : 0) : 0);
      zoom = b(6) - b(7); fovIn = (b(5) > 0.5 ? 1 : 0) - (b(4) > 0.5 ? 1 : 0);
      if (b(0) > 0.5 && !padPrev[0]) st.snap = true;
      if (b(1) > 0.5 && !padPrev[1]) { exit(); }
      for (let i = 0; i < g.buttons.length; i++) padPrev[i] = b(i) > 0.5;
    }
    const f = mv + mvP, s = st2 + stP;
    if (f || s) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      target.x += (fx * f + rx * s) * speed; target.z += (fz * f + rz * s) * speed;
    }
    target.y = clamp(target.y + lift * speed * 0.6, 0.3, 320);
    yaw -= orbX * dt * 1.8; pitch = clamp(pitch + orbY * dt * 1.2, -0.2, 1.55);
    if (zoom) dist = clamp(dist * Math.exp(zoom * dt * 1.5), 1.5, 600);
    if (fovIn) { fov = clamp(fov + fovIn * dt * 25, 20, 95); lens.value = Math.round(fov); }
    if (st.orbit) yaw += dt * 0.12;
    // place the camera, never below the street
    const cp = Math.cos(pitch);
    camera.position.set(target.x + Math.sin(yaw) * cp * dist, Math.max(0.35, target.y + Math.sin(pitch) * dist), target.z + Math.cos(yaw) * cp * dist);
    look.copy(target);
    camera.lookAt(look);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  const snapBtn = bar.querySelector('.snap');
  let flashT = 0;
  function flash(msg) { snapBtn.textContent = msg; clearTimeout(flashT); flashT = setTimeout(() => { snapBtn.textContent = '📷 Snap'; }, 1500); }
  // called by the game loop right after rendering, while the frame is still in the drawing buffer
  function capture() {
    st.snap = false;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const name = `dublin-${stamp}.png`;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], name, { type: 'image/png' });
      // phones: the share sheet (Save to Photos, send to a friend); elsewhere a download
      if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ files: [file], title: 'Dublin' }); flash('Shared ✓'); return; } catch (err) { if (err.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      flash('Saved ✓');
    }, 'image/png');
  }

  return {
    get active() { return st.active; },
    get live() { return st.live; },
    get hideCar() { return st.active && st.hideCar; },
    get wantsSnap() { return st.active && st.snap; },
    enter, exit, update, capture,
    // scripted shots (video capture): set the orbit directly
    pose(p) { if (p.target) target.set(...p.target); if (p.yaw != null) yaw = p.yaw; if (p.pitch != null) pitch = p.pitch; if (p.dist != null) dist = p.dist; if (p.fov != null) { fov = p.fov; lens.value = fov; } },
    get state() { return { target: target.toArray(), yaw, pitch, dist, fov }; },
  };
}

// Keyboard + on-screen touch controls, merged into one analogue-ish input state.
import { IS_MOBILE } from '../world/textures.js';

const keys = new Set();
const actions = new Map(); // key -> callback for one-shot toggles
const touch = { left: 0, right: 0, gas: 0, brake: 0, hand: 0, up: 0, down: 0, yawl: 0, yawr: 0 };
const stick = { x: 0, y: 0 }; // helicopter touch stick, -1..1 (y: forward)

export const input = { throttle: 0, brake: 0, steer: 0, handbrake: false, heli: { pitch: 0, roll: 0, yaw: 0, lift: 0 } };
// 'car' or 'heli': which touch layout shows and how a controller's sticks map
let mode = 'car', touchWrap = null;
export function setInputMode(m) { mode = m; if (touchWrap) touchWrap.classList.toggle('heli', m === 'heli'); }

const isTyping = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');

window.addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (!e.repeat && actions.has(k)) actions.get(k)();
  keys.add(k);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('pointerdown', () => document.documentElement.classList.remove('pad'));
window.addEventListener('blur', () => keys.clear());

export function onKey(key, fn) { actions.set(key.toLowerCase(), fn); }

// ---- game controllers (standard mapping: Xbox / PlayStation / most Bluetooth pads)
// Driving: left stick steers, RT / R2 accelerates, LT / L2 brakes and reverses (both analogue), A / Cross or B /
// Circle is the handbrake. Buttons: Y / Triangle siren, X / Square camera, LB / L1 siren tone, RB / R1 night,
// View / Share map, Menu / Options play menu, D-pad up rain, D-pad down places, D-pad right helicopter / car, right stick click photo mode. In a menu the D-pad (or left stick)
// moves between buttons, A / Cross presses, B / Circle closes.
// Flying: left stick tilts (forward / back / bank), right stick yaws, RT climbs, LT descends.
const PAD_ACTIONS = { 11: 'p', 3: 'x', 2: 'c', 4: 'z', 5: 'n', 8: 'm', 9: 'g', 12: 'r', 13: 't', 14: 'e', 15: 'l' }; // (D-pad left: radio Control in a Garda Pursuit)
const padPrev = [];
export const pad = { connected: false, name: '' };
let padSeen = false;
window.addEventListener('gamepadconnected', (e) => { padSeen = true; pad.connected = true; pad.name = e.gamepad.id; if (pad.onConnect) pad.onConnect(e.gamepad.id); });
window.addEventListener('gamepaddisconnected', () => { pad.connected = false; });
const dead = (v, d = 0.14) => (Math.abs(v) < d ? 0 : Math.sign(v) * (Math.abs(v) - d) / (1 - d));
const btn = (g, i) => (g.buttons[i] ? g.buttons[i].value || (g.buttons[i].pressed ? 1 : 0) : 0);
export function readPad() {
  if (!padSeen || !navigator.getGamepads) return null;
  for (const g of navigator.getGamepads()) if (g && g.connected) return g;
  return null;
}
// the menu a controller is steering (the first open one), and its buttons
function openMenu() {
  const el = ['#results:not([hidden])', '#play:not([hidden])', '.sheet:not([hidden])', '.worldmap:not([hidden])'].map((s) => document.querySelector(s)).find(Boolean);
  return el || null;
}
function menuStep(dir) {
  const menu = openMenu();
  if (!menu) return false;
  const items = [...menu.querySelectorAll('button, [tabindex="0"]')].filter((b) => b.offsetParent !== null);
  if (!items.length) return true;
  const i = items.indexOf(document.activeElement);
  const next = items[(i + dir + items.length) % items.length] || items[0];
  next.focus(); next.scrollIntoView({ block: 'nearest' });
  return true;
}
let stickHeld = 0;

let steerSmooth = 0;
export function updateInput(dt) {
  const up = keys.has('w') || keys.has('arrowup') || touch.gas;
  const down = keys.has('s') || keys.has('arrowdown') || touch.brake;
  const left = keys.has('a') || keys.has('arrowleft') || touch.left;
  const right = keys.has('d') || keys.has('arrowright') || touch.right;
  input.throttle = up ? 1 : 0;
  input.brake = down ? 1 : 0;
  input.handbrake = keys.has(' ') || !!touch.hand;
  const target = (right ? 1 : 0) - (left ? 1 : 0);
  // keyboard steering ramps in so small taps give small corrections
  steerSmooth += (target - steerSmooth) * Math.min(1, dt * (target === 0 ? 12 : 6));
  input.steer = Math.abs(steerSmooth) < 0.01 ? 0 : steerSmooth;
  // helicopter: W / S (up / down arrows) tilt forward / back, left / right arrows bank, A / D yaw,
  // Space climbs, Shift descends; on a phone the stick on the left and the buttons on the right
  const hi = input.heli;
  hi.pitch = Math.max(-1, Math.min(1, (up && !touch.gas ? 1 : 0) - (down && !touch.brake ? 1 : 0) + stick.y));
  hi.roll = Math.max(-1, Math.min(1, (keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0) + stick.x));
  hi.yaw = (keys.has('d') || touch.yawr ? 1 : 0) - (keys.has('a') || touch.yawl ? 1 : 0);
  hi.lift = (keys.has(' ') || keys.has('pageup') || touch.up ? 1 : 0) - (keys.has('shift') || keys.has('pagedown') || touch.down ? 1 : 0);

  const g = readPad();
  if (!g) return;
  // controller in use: show a focus ring on menu buttons (hidden for mouse users)
  if (g.buttons.some((b) => b.pressed) || g.axes.some((a) => Math.abs(a) > 0.5)) document.documentElement.classList.add('pad');
  const menu = openMenu();
  const pressed = (i) => btn(g, i) > 0.5 && !padPrev[i];
  if (menu) {
    // menu navigation: D-pad / stick moves focus, A presses, B closes
    const sy = dead(g.axes[1] || 0, 0.5);
    if (pressed(12) || pressed(14) || (sy < 0 && stickHeld <= 0)) menuStep(-1);
    if (pressed(13) || pressed(15) || (sy > 0 && stickHeld <= 0)) menuStep(1);
    stickHeld = sy ? (stickHeld <= 0 ? 0.28 : stickHeld - dt) : 0;
    if (pressed(0) && document.activeElement && menu.contains(document.activeElement)) document.activeElement.click();
    if (pressed(1) && actions.has('escape')) actions.get('escape')();
    if (pressed(9) && actions.has('g')) actions.get('g')();
    if (pressed(8) && actions.has('m')) actions.get('m')();
  } else if (mode === 'heli') {
    // flying: left stick tilts, right stick yaws, triggers climb and descend (all analogue)
    const hi = input.heli, sx = dead(g.axes[0] || 0), sy = dead(g.axes[1] || 0), yx = dead(g.axes[2] || 0);
    const rt = btn(g, 7), lt = btn(g, 6);
    if (sx) hi.roll = sx;
    if (sy) hi.pitch = -sy;
    if (yx) hi.yaw = yx;
    if (rt > 0.05 || lt > 0.05) hi.lift = rt - lt;
    for (const [i, key] of Object.entries(PAD_ACTIONS)) if (pressed(+i) && actions.has(key)) actions.get(key)();
  } else {
    // driving: analogue triggers and stick take over from the keys when used
    const rt = btn(g, 7), lt = btn(g, 6), sx = dead(g.axes[0] || 0);
    if (rt > 0.05) input.throttle = Math.max(input.throttle, rt);
    if (lt > 0.05) input.brake = Math.max(input.brake, lt);
    if (sx !== 0) input.steer = Math.sign(sx) * Math.pow(Math.abs(sx), 1.4); // finer control near the centre
    if (btn(g, 0) > 0.5 || btn(g, 1) > 0.5) input.handbrake = true;
    for (const [i, key] of Object.entries(PAD_ACTIONS)) if (pressed(+i) && actions.has(key)) actions.get(key)();
  }
  for (let i = 0; i < g.buttons.length; i++) padPrev[i] = btn(g, i) > 0.5;
}

export function buildTouchControls(container) {
  const show = IS_MOBILE || 'ontouchstart' in window;
  const wrap = document.createElement('div');
  wrap.className = 'touch' + (show ? ' on' : '');
  wrap.innerHTML = `
    <div class="pad left">
      <button data-k="left" aria-label="Steer left">&#9664;</button>
      <button data-k="right" aria-label="Steer right">&#9654;</button>
    </div>
    <div class="pad right">
      <button data-k="hand" class="small" aria-label="Handbrake">HB</button>
      <button data-k="brake" aria-label="Brake / reverse">&#9660;</button>
      <button data-k="gas" class="gas" aria-label="Accelerate">&#9650;</button>
    </div>
    <div class="hpad left"><div class="stick" aria-label="Tilt: forward, back and bank"><i></i></div></div>
    <div class="hpad right">
      <button data-k="yawl" class="small" aria-label="Yaw left">&#8634;</button>
      <button data-k="yawr" class="small" aria-label="Yaw right">&#8635;</button>
      <button data-k="down" aria-label="Descend">&#9660;</button>
      <button data-k="up" class="gas" aria-label="Climb">&#9650;</button>
    </div>`;
  container.appendChild(wrap);
  touchWrap = wrap;
  wrap.classList.toggle('heli', mode === 'heli');
  // helicopter stick: drag from the centre, up to the ring's radius
  const pad = wrap.querySelector('.stick'), knob = pad.querySelector('i');
  let stickId = null;
  const moveStick = (e) => {
    const r = pad.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    stick.x = Math.abs(dx) < 0.12 ? 0 : dx; stick.y = Math.abs(dy) < 0.12 ? 0 : -dy;
    knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); stickId = e.pointerId; pad.setPointerCapture(e.pointerId); moveStick(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  const stickEnd = (e) => { if (e.pointerId !== stickId) return; stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', stickEnd);
  pad.addEventListener('pointercancel', stickEnd);
  // Multi-touch: track which button each pointer is over, so sliding between buttons works.
  const active = new Map();
  const refresh = () => {
    for (const k of Object.keys(touch)) touch[k] = 0;
    for (const k of active.values()) if (k) touch[k] = 1;
    wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('down', !!touch[b.dataset.k]));
  };
  const hitKey = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el && el.dataset && el.dataset.k ? el.dataset.k : null;
  };
  wrap.addEventListener('pointerdown', (e) => {
    const k = hitKey(e.clientX, e.clientY);
    if (!k) return;
    e.preventDefault();
    active.set(e.pointerId, k);
    refresh();
  });
  window.addEventListener('pointermove', (e) => {
    if (!active.has(e.pointerId)) return;
    active.set(e.pointerId, hitKey(e.clientX, e.clientY));
    refresh();
  });
  const end = (e) => { if (active.delete(e.pointerId)) refresh(); };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  return wrap;
}

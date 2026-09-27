// Keyboard + on-screen touch controls, merged into one analogue-ish input state.
import { IS_MOBILE } from '../world/textures.js';

const keys = new Set();
const actions = new Map(); // key -> callback for one-shot toggles
const touch = { left: 0, right: 0, gas: 0, brake: 0, hand: 0 };

export const input = { throttle: 0, brake: 0, steer: 0, handbrake: false };

const isTyping = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');

window.addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (!e.repeat && actions.has(k)) actions.get(k)();
  keys.add(k);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

export function onKey(key, fn) { actions.set(key.toLowerCase(), fn); }

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
  steerSmooth += (target - steerSmooth) * Math.min(1, dt * (target === 0 ? 14 : 10));
  input.steer = Math.abs(steerSmooth) < 0.01 ? 0 : steerSmooth;
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
    </div>`;
  container.appendChild(wrap);
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

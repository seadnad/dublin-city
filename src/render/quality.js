// Graphics settings: the player's choice (Auto / High / Medium / Low / Battery saver), a first guess for Auto from the
// GPU's name, and what Auto learned last time on this device. Decided once at load, before the world is built, so
// load-time costs (crowd and traffic counts, shadow map size) can follow it too.
//
// Profiles
//   tier    post-processing pipeline tier ('low' draws straight to the screen)
//   maxDpr  pixel-ratio ceiling (the adaptive loop moves between 0.6 and this)
//   lite    fewer cars / people and a smaller shadow map (applies from the next load)
//   fpsCap  frame-rate cap (Battery saver)
import { IS_MOBILE } from '../world/textures.js';

const read = (k, d) => { try { const v = localStorage.getItem(`dublin.${k}`); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(`dublin.${k}`, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export const MODES = ['auto', 'high', 'medium', 'low', 'saver'];
export const MODE_NAMES = { auto: 'Auto', high: 'High', medium: 'Medium', low: 'Low', saver: 'Battery saver' };

// The GPU's name, where the browser exposes it (Chrome and Edge do; Safari and Firefox mostly mask it)
function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return String(name || '');
  } catch { return ''; }
}
// integrated graphics that share memory with the CPU, and software renderers
const WEAK = /Intel\(R\) (HD|UHD|Iris)|Intel.*(HD|UHD|Iris)|AMD Radeon\(TM\)( Vega)? Graphics|Radeon.*Vega [0-9]+|Radeon\(TM\) [0-9]+M|Radeon Graphics|Mali-[GT][0-9]{2}\b|Adreno \(TM\) [3-5][0-9]{2}|PowerVR|SwiftShader|llvmpipe|Microsoft Basic|Mesa Intel/i;

export const GPU = gpuName();
export const WEAK_GPU = WEAK.test(GPU);

export let mode = read('gfx', 'auto');
if (!MODES.includes(mode)) mode = 'auto';
// what Auto settled on last time on this device: { tier, dpr }
const learned = read('gfx.auto', null);

function profileFor(m) {
  const dev = Math.min(window.devicePixelRatio || 1, 2);
  switch (m) {
    case 'high': return { tier: 'high', maxDpr: Math.min(dev, 2), lite: false, fpsCap: 0 };
    case 'medium': return { tier: 'medium', maxDpr: Math.min(dev, 1.5), lite: false, fpsCap: 0 };
    case 'low': return { tier: 'low', maxDpr: Math.min(dev, IS_MOBILE ? 1.5 : 1.25), lite: true, fpsCap: 0 };
    case 'saver': return { tier: 'low', maxDpr: Math.min(dev, 0.85), lite: true, fpsCap: 30 };
    default: {
      // Auto: phones and integrated / software GPUs start on the phone settings; others on medium. What Auto learned
      // on this device last time wins over the guess (it has measured frames, the guess has only a name).
      const weak = IS_MOBILE || WEAK_GPU;
      const base = { tier: weak ? 'low' : 'medium', maxDpr: Math.min(dev, weak ? (IS_MOBILE ? 1.5 : 1.25) : 2), lite: weak, fpsCap: 0 };
      if (learned && ['low', 'medium', 'high'].includes(learned.tier)) {
        base.tier = learned.tier;
        base.startDpr = Math.min(base.maxDpr, learned.dpr || base.maxDpr);
        base.lite = base.lite || learned.tier === 'low';
      }
      return base;
    }
  }
}

export let profile = profileFor(mode);
// load-time choices (counts, shadow map size) follow this for the whole session
export const LITE = profile.lite;

export function setMode(m) {
  mode = m; write('gfx', m);
  profile = profileFor(m);
  return profile;
}
export function learn(tier, dpr) { write('gfx.auto', { tier, dpr: Math.round(dpr * 100) / 100 }); }
export function forget() { try { localStorage.removeItem('dublin.gfx.auto'); } catch { /* */ } }

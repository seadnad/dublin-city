// Small Web Audio helpers shared by the audio modules.
import { FILES } from './assets.js';

export function gain(ctx, value = 0, dest = null) {
  const g = ctx.createGain(); g.gain.value = value;
  if (dest) g.connect(dest);
  return g;
}

export function filter(ctx, type, freq, q = 0.7, dest = null) {
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  if (dest) f.connect(dest);
  return f;
}

// StereoPanner is missing on old Safari; fall back to a pass-through gain there
export function panner(ctx, dest) {
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  p.connect(dest);
  return p;
}

// Start a looping source over the file's seamless loop region, `offset` seconds into the loop.
export function loopSource(ctx, name, buffer, dest, offset = 0) {
  const [a, b] = FILES[name].loop;
  const s = ctx.createBufferSource();
  s.buffer = buffer; s.loop = true; s.loopStart = a; s.loopEnd = b;
  s.connect(dest);
  s.start(ctx.currentTime, a + (offset % (b - a)));
  return s;
}

// smooth parameter change without zipper noise (per-frame targets are fine: each replaces the last)
export const ramp = (param, value, t, tau = 0.05) => param.setTargetAtTime(value, t, tau);
export const clamp01 = (v) => Math.max(0, Math.min(1, v));

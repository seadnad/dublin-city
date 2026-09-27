// Game audio: recorded engine, Garda siren, city ambience and street events (see src/game/audio/).
// Nothing is created or downloaded until the first user gesture (browser autoplay rules; iOS needs a touchend/click),
// then the files in public/audio stream in, most important first. Sounds join as their files arrive.
import { LOAD_ORDER } from './audio/assets.js';
import { gain, filter } from './audio/nodes.js';
import { createEngine } from './audio/engine.js';
import { createSiren, SIREN_MODES } from './audio/siren.js';
import { createCity } from './audio/city.js';

const MASTER = 0.8;
let ctx = null, master, engine, siren, city;
let muted = false, hidden = document.hidden, lastT = 0, lastResume = 0;
let sirenOn = false, sirenMode = 'auto', env = { rain: false, night: false }, worldRef = null;
const loaded = [], failed = [];

function create() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC({ latencyHint: 'interactive' });
  // gentle limiter on the mix: siren + horns + engine can stack up
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8; limiter.knee.value = 6; limiter.ratio.value = 6; limiter.attack.value = 0.004; limiter.release.value = 0.25;
  limiter.connect(ctx.destination);
  master = gain(ctx, muted ? 0 : MASTER, limiter);
  // one shared street echo (a short slapback off the buildings) for the siren and horns: cheaper than a convolver
  const echoIn = gain(ctx, 1);
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.13;
  const tone = filter(ctx, 'lowpass', 2400, 0.5);
  const fb = gain(ctx, 0.28);
  echoIn.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay);
  tone.connect(gain(ctx, 0.3, master));

  engine = createEngine(ctx, gain(ctx, 1, master));
  const sirenOut = gain(ctx, 0.3, master);
  sirenOut.connect(gain(ctx, 0.5, echoIn));
  siren = createSiren(ctx, sirenOut);
  siren.set(sirenOn); siren.setMode(sirenMode);
  city = createCity(ctx, master, echoIn);
  city.setEnv(env);
  if (worldRef) city.setWorld(worldRef.world, worldRef.signals);
  load();
}

function decode(data) {
  // Safari < 14.1 only has the callback form
  return new Promise((res, rej) => { const p = ctx.decodeAudioData(data, res, rej); if (p && p.then) p.then(res, rej); });
}
async function load() {
  const base = import.meta.env.BASE_URL || './';
  const queue = [...LOAD_ORDER];
  const worker = async () => {
    for (let name; (name = queue.shift());) {
      try {
        const r = await fetch(`${base}audio/${name}.mp3`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = await decode(await r.arrayBuffer());
        engine.attach(name, buf); siren.attach(name, buf); city.attach(name, buf);
        loaded.push(name);
      } catch (e) {
        failed.push(name);
        console.warn(`audio: ${name} unavailable (${e && e.message})`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

// Create/resume on a gesture. Listeners stay until the context is actually running (iOS can refuse the first one).
function unlock() {
  if (!ctx) { try { create(); } catch { ctx = null; return; } if (!ctx) return; }
  if (ctx.state !== 'running' && !hidden && !muted) ctx.resume().catch(() => {});
  if (!unlock.primed) {
    // iOS: starting any buffer inside the gesture unlocks output
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
    unlock.primed = true;
  }
  if (ctx.state === 'running') for (const ev of GESTURES) window.removeEventListener(ev, unlock, true);
}
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
for (const ev of GESTURES) window.addEventListener(ev, unlock, true);

// hidden tab: stop the audio clock entirely (saves battery; nothing should play behind other tabs)
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden;
  if (!ctx) return;
  if (hidden) ctx.suspend().catch(() => {});
  else if (!muted) ctx.resume().catch(() => {});
});

export const audio = {
  toggle() {
    muted = !muted;
    if (ctx) {
      master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.05);
      // muted: suspend after the fade so the audio thread sleeps; unmuting happens on a click, so resume is allowed
      if (muted) setTimeout(() => { if (muted && ctx) ctx.suspend().catch(() => {}); }, 250);
      else ctx.resume().catch(() => {});
    }
    return !muted;
  },
  get muted() { return muted; },
  setSiren(on) { sirenOn = !!on; if (siren) siren.set(sirenOn); },
  // cycle the siren tone: auto (wail when fast, yelp when slow) -> wail -> yelp -> hi-lo
  cycleSirenTone() { sirenMode = SIREN_MODES[(SIREN_MODES.indexOf(sirenMode) + 1) % SIREN_MODES.length]; if (siren) siren.setMode(sirenMode); return sirenMode; },
  get sirenTone() { return sirenMode; },
  // the street graph and traffic signals, for pedestrian-crossing sounds at signalised junctions
  setWorld(world, signals) { worldRef = { world, signals }; if (city) city.setWorld(world, signals); },
  // one-shot cues: 'go', 'checkpoint', 'finish', 'bust', 'fail', 'beep'
  cue(kind) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = { beep: [[660, 0.15]], go: [[990, 0.35]], checkpoint: [[880, 0.08], [1320, 0.12]], finish: [[784, 0.12], [988, 0.12], [1175, 0.3]], bust: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.35]], fail: [[392, 0.25], [311, 0.45]] }[kind] || [];
    let at = t;
    for (const [f, d] of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.25, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
      o.connect(g).connect(master); o.start(at); o.stop(at + d + 0.02);
      at += d * 0.9;
    }
  },
  // Per frame. `world` is { rain, night, traffic, tram, paused } (a bare boolean is still read as the rain flag).
  update(car, input, world = {}) {
    if (!ctx) return;
    if (ctx.state !== 'running') {
      // e.g. iOS interrupted us (a call, another app): try again now and then
      const now = performance.now();
      if (ctx.state !== 'closed' && !hidden && !muted && now - lastResume > 1000) { lastResume = now; ctx.resume().catch(() => {}); }
      return;
    }
    const w = typeof world === 'boolean' ? { rain: world } : world;
    const t = ctx.currentTime, dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    if (!!w.rain !== env.rain || !!w.night !== env.night) { env = { rain: !!w.rain, night: !!w.night }; city.setEnv(env); }
    engine.update(car, input, dt);
    siren.update(dt, car.speed);
    city.update(w.paused ? 0 : dt, car, w.traffic, w.tram, sirenOn);
  },
  // for the headless tests: fire a one-shot at the listener (e.g. testPlay('horns', 'single'))
  testPlay(file, part) { return !!city && city.play(file, part, 0, 0, { vol: 0 }); },
  debug() {
    if (!ctx) return { created: false, loaded: [...loaded], failed: [...failed] };
    return {
      created: true, state: ctx.state, sampleRate: ctx.sampleRate, loaded: [...loaded], failed: [...failed],
      master: master.gain.value, siren: { on: siren.on, mode: siren.mode, tone: siren.tone, gains: siren.gains() },
      engine: { rpm: Math.round(engine.state.rpm), gear: engine.state.gear },
      env: { ...city.env }, targets: { ...city.levels }, gains: city.gains(), events: { ...city.stats },
    };
  },
};

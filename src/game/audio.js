// Small procedural soundscape: engine note, tyre squeal, bumps, rain hiss. Starts on first input.
let ctx = null, master, engine, engine2, engFilter, engGain, skidGain, rainGain, noiseBuf;
let sirenOsc = null, sirenGain = null, sirenOn = false, sirenPhase = 0;
let muted = false;

function noise(seconds = 2) {
  const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function loop(buffer, filterType, freq, q = 0.7) {
  const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(f).connect(g).connect(master); src.start();
  return g;
}

function start() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    engFilter = ctx.createBiquadFilter(); engFilter.type = 'lowpass'; engFilter.frequency.value = 600;
    engGain = ctx.createGain(); engGain.gain.value = 0.0;
    engine = ctx.createOscillator(); engine.type = 'sawtooth';
    engine2 = ctx.createOscillator(); engine2.type = 'square';
    engine.connect(engFilter); engine2.connect(engFilter); engFilter.connect(engGain).connect(master);
    engine.start(); engine2.start();
    noiseBuf = noise();
    skidGain = loop(noiseBuf, 'bandpass', 1800, 3);
    rainGain = loop(noiseBuf, 'lowpass', 1400, 0.3);
    // Garda two-tone siren
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'square';
    const sf = ctx.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 2200;
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
    sirenOsc.connect(sf).connect(sirenGain).connect(master); sirenOsc.start();
  } catch { ctx = null; }
}
window.addEventListener('keydown', start, { once: true });
window.addEventListener('pointerdown', start, { once: true });

export const audio = {
  toggle() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.05);
    return !muted;
  },
  get muted() { return muted; },
  setSiren(on) { sirenOn = on; },
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
  update(car, input, raining) {
    if (!ctx || ctx.state !== 'running') { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    const t = ctx.currentTime, spd = Math.abs(car.speed);
    // fake gearbox: revs climb within each "gear"
    const gear = Math.min(4, Math.floor(spd / 9));
    const rev = (spd - gear * 9) / 9;
    const f = 38 + gear * 6 + rev * 34 + input.throttle * 8;
    engine.frequency.setTargetAtTime(f, t, 0.05);
    engine2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    engFilter.frequency.setTargetAtTime(350 + rev * 500 + input.throttle * 500, t, 0.08);
    engGain.gain.setTargetAtTime(0.05 + input.throttle * 0.05 + Math.min(spd, 30) * 0.001, t, 0.08);
    const skid = Math.max(0, Math.min(1, (Math.abs(car.slip) - 2.5) / 6)) * (spd > 3 ? 1 : 0);
    skidGain.gain.setTargetAtTime(skid * 0.12, t, 0.05);
    rainGain.gain.setTargetAtTime(raining ? 0.07 : 0, t, 0.5);
    if (sirenOsc) {
      sirenPhase = (t * 1.25) % 1; // hi-lo, 0.4 s each
      sirenOsc.frequency.setTargetAtTime(sirenPhase < 0.5 ? 960 : 720, t, 0.01);
      sirenGain.gain.setTargetAtTime(sirenOn ? 0.07 : 0, t, 0.08);
    }
    if (car.impact > 3 && !this._thud) {
      this._thud = true;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 220;
      const g = ctx.createGain(); g.gain.setValueAtTime(Math.min(0.6, car.impact * 0.05), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      src.connect(f2).connect(g).connect(master); src.start(t); src.stop(t + 0.4);
    }
    if (car.impact < 1) this._thud = false;
  },
};

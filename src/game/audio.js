// Small procedural soundscape: engine note, tyre squeal, bumps, rain hiss. Starts on first input.
let ctx = null, master, engine, engine2, engFilter, engGain, skidGain, rainGain, noiseBuf;
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

// Garda siren. Current Garda cars carry an electronic siren amplifier with wail, yelp and hi-lo tones:
// wail (a slow ~5 s rise-and-fall) on open road, yelp (the same sweep ~2.6 times a second) in traffic and at junctions,
// hi-lo as a two-tone alternative. Wail and yelp are recordings of a Whelen amplifier (EQ'd for a roof speaker);
// hi-lo is synthesised here with the same speaker voicing.
// Mode 'auto' switches like a driver would: wail when moving fast, yelp when slow.
import { FILES } from './assets.js';
import { gain } from './nodes.js';

export const SIREN_MODES = ['auto', 'wail', 'yelp', 'hilo'];

// roof-speaker magnitude response: horn drivers have little below ~420 Hz, roll off above ~5 kHz, presence around 1.7 kHz
function speaker(f) {
  const hp = 1 / Math.sqrt(1 + (420 / f) ** 8), lp = 1 / Math.sqrt(1 + (f / 5000) ** 8);
  return hp * lp * (1 + 0.4 * Math.exp(-(Math.log2(f / 1700) ** 2) / 0.5));
}

// One second of hi-lo: 960 / 720 Hz (a fourth apart), half a second each, as a phase-continuous square-ish wave.
// The mean frequency is 840 Hz, so the phase comes back to the start after exactly 1 s and the buffer loops cleanly.
function makeHiLo(ctx) {
  const sr = ctx.sampleRate, n = sr, buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
  const HI = 960, LO = 720, MID = (HI + LO) / 2, AMP = (HI - LO) / 2, K = 30;
  let ph = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.tanh(K * Math.sin(2 * Math.PI * i / n)) / Math.tanh(K); // ~square with ~5 ms glides between tones
    const f = MID + AMP * s;
    let v = 0;
    for (let k = 1; k * f < 7000; k++) v += (k % 2 ? 1 : 0.22) / k * speaker(k * f) * Math.sin(k * ph);
    d[i] = v; peak = Math.max(peak, Math.abs(v));
    ph += 2 * Math.PI * f / sr;
  }
  for (let i = 0; i < n; i++) d[i] *= 0.3 / peak; // about the loudness of the recorded tones
  return buf;
}

export function createSiren(ctx, out) {
  const bus = gain(ctx, 1, out);
  const tones = {
    wail: { g: gain(ctx, 0, bus), buf: null, src: null, file: 'siren_wail' },
    yelp: { g: gain(ctx, 0, bus), buf: null, src: null, file: 'siren_yelp' },
    hilo: { g: gain(ctx, 0, bus), buf: makeHiLo(ctx), src: null },
  };
  let on = false, mode = 'auto', current = null, held = 0;

  function start(name) {
    const T = tones[name], t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = T.buf; s.loop = true;
    if (T.file) { [s.loopStart, s.loopEnd] = FILES[T.file].loop; }
    // a switched-on wail starts from the bottom of its sweep, like the real amplifier winding up
    const at = name === 'wail' ? FILES.siren_wail.low : T.file ? FILES[T.file].loop[0] : 0;
    s.connect(T.g); s.start(t, at);
    T.g.gain.cancelScheduledValues(t); T.g.gain.setValueAtTime(0, t); T.g.gain.linearRampToValueAtTime(1, t + 0.03);
    T.src = s;
  }
  function stop(name) {
    const T = tones[name], t = ctx.currentTime;
    if (!T.src) return;
    T.g.gain.cancelScheduledValues(t); T.g.gain.setValueAtTime(T.g.gain.value, t); T.g.gain.linearRampToValueAtTime(0, t + 0.04);
    T.src.stop(t + 0.06); T.src = null;
  }

  return {
    get on() { return on; },
    get mode() { return mode; },
    get tone() { return current; },
    set(v) { on = !!v; },
    setMode(m) { if (SIREN_MODES.includes(m)) mode = m; held = 99; },
    gains: () => Object.fromEntries(Object.entries(tones).map(([k, T]) => [k, T.g.gain.value])),
    attach(name, buffer) { for (const T of Object.values(tones)) if (T.file === name) T.buf = buffer; },
    update(dt, speed) {
      held += dt;
      let want = null;
      if (on) {
        want = mode;
        if (mode === 'auto') {
          const v = Math.abs(speed);
          want = current === 'wail' || current === 'yelp' ? current : v > 12 ? 'wail' : 'yelp';
          // hysteresis plus a minimum hold, so it doesn't flap at one speed
          if (held > 2.5) { if (current === 'yelp' && v > 15) want = 'wail'; else if (current === 'wail' && v < 9) want = 'yelp'; }
        }
        if (!tones[want].buf) want = 'hilo'; // recordings still loading (or failed): the synthesised tone always works
      }
      if (want !== current) {
        if (current) stop(current);
        if (want) start(want);
        current = want; held = 0;
      }
    },
  };
}

// Player car: recorded diesel engine loops crossfaded by rpm, a simple gearbox, tyre squeal and impact thuds.
// Two voices: 'diesel' (the Garda i40 and the i30 N, as recorded) and 'sport' for the GT hot hatch: a six-speed
// petrol that revs to 7,000, made from the same recordings pitched into a higher band plus a small synthesised
// four-cylinder layer (sawtooth / square at the firing frequency, soft-clipped), with crackles on the overrun when
// you lift off at high revs and a blip on flat-out upshifts. No extra files; the synth only runs for the sport voice.
import { FILES } from './assets.js';
import { gain, filter, loopSource, ramp, clamp01 } from './nodes.js';

// rpm per m/s in each gear. The car accelerates hard (arcade), so gears are long enough that shifts come
// every second or two rather than whining up forever; each upshift drops the revs by about a third.
const VOICES = {
  diesel: { ratio: [0, 367, 194, 132, 100, 82], reverse: 300, idle: 820, upEasy: 2300, upHard: 3300, down: 1250, max: 3900, launch: 1700, sample: 1, synth: 0, pops: false },
  // sample: real rpm -> the recordings' rpm (so 7,000 plays the 2,040 rpm loop about 1.2x up)
  sport: { ratio: [0, 520, 340, 250, 195, 160, 135], reverse: 420, idle: 950, upEasy: 3600, upHard: 6600, down: 2400, max: 7000, launch: 3400, sample: 0.36, synth: 1, pops: true },
};
const LAYERS = ['engine_idle', 'engine_low', 'engine_mid']; // recorded at 840 / 1470 / 2040 rpm

export function createEngine(ctx, out) {
  // engine -> lowpass (opens with load: bright on throttle, dull on the overrun) -> bus
  const bus = gain(ctx, 0, out);
  const tone = filter(ctx, 'lowpass', 1200, 0.5, bus);
  const layers = LAYERS.map((name) => ({ name, rpm: FILES[name].rpm, g: gain(ctx, 0, tone), src: null }));
  const skidG = gain(ctx, 0, out);
  let skidSrc = null, noise = null, crackle = null, synth = null;
  let V = VOICES.diesel;
  const st = { gear: 1, rpm: V.idle, load: 0, shift: 0, ready: false, voice: 'diesel', lastThrottle: 0, pops: 0 };

  // ---- the sport voice's synthesised layer (built on first use, stopped when another car is chosen)
  function startSynth() {
    if (synth) return;
    const g = gain(ctx, 0, tone);
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(2.2 * x); }
    shaper.curve = curve;
    const band = filter(ctx, 'bandpass', 400, 0.7, g);
    shaper.connect(band);
    const osc = (type, level) => { const o = ctx.createOscillator(); o.type = type; const og = gain(ctx, level, shaper); o.connect(og); o.start(); return o; };
    synth = { g, band, oscs: [osc('sawtooth', 0.5), osc('square', 0.35), osc('sawtooth', 0.18)] };
  }
  function stopSynth() {
    if (!synth) return;
    const s = synth; synth = null;
    const t = ctx.currentTime;
    ramp(s.g.gain, 0, t, 0.05);
    for (const o of s.oscs) o.stop(t + 0.4);
    setTimeout(() => s.g.disconnect(), 600);
  }
  // one crackle: a short burst of noise through a random band (straight to the output, not the engine's lowpass)
  function pop(at, level) {
    if (!crackle) {
      crackle = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.06), ctx.sampleRate);
      const d = crackle.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.25));
    }
    const src = ctx.createBufferSource(); src.buffer = crackle;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = filter(ctx, 'bandpass', 500 + Math.random() * 1100, 1.1);
    const g = gain(ctx, 0, out);
    g.gain.setValueAtTime(level, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.05 + Math.random() * 0.04);
    src.connect(f).connect(g); src.start(at); src.stop(at + 0.1);
  }

  return {
    state: st,
    setVoice(name) {
      const v = VOICES[name] ? name : 'diesel';
      if (v === st.voice) return;
      st.voice = v; V = VOICES[v];
      st.gear = Math.min(st.gear, V.ratio.length - 1);
      if (V.synth) startSynth(); else stopSynth();
    },
    attach(name, buffer) {
      const l = layers.find((x) => x.name === name);
      if (l && !l.src) l.src = loopSource(ctx, name, buffer, l.g, Math.random() * 2);
      if (name === 'skid' && !skidSrc) skidSrc = loopSource(ctx, name, buffer, skidG);
      st.ready = layers.every((x) => x.src);
    },
    update(car, input, dt, muffled) {
      const t = ctx.currentTime;
      const v = Math.abs(car.speed), throttle = input.throttle || 0;
      // gearbox
      let ratio, shifted = false;
      if (car.speed < -0.5) { ratio = V.reverse; st.gear = 1; } else {
        const upAt = V.upEasy + (V.upHard - V.upEasy) * throttle;
        if (st.gear < V.ratio.length - 1 && v * V.ratio[st.gear] > upAt && st.shift <= 0) { st.gear++; st.shift = 0.3; shifted = true; }
        else if (st.gear > 1 && v * V.ratio[st.gear] < V.down) st.gear--;
        ratio = V.ratio[st.gear];
      }
      let target = Math.max(V.idle, v * ratio);
      // clutch slipping at a launch (or revving on the spot): revs float up with the throttle
      if (st.gear === 1 && v < 5) target = Math.max(target, V.idle + throttle * V.launch * (1 - v / 7));
      target = Math.min(V.max, target);
      if (st.shift > 0) st.shift -= dt;
      // revs fall fast into the next gear, rise a little slower (flywheel; the sport engine spins up quicker)
      st.rpm += (target - st.rpm) * Math.min(1, dt * (target < st.rpm ? 9 : V.synth ? 8 : 6));
      const loadTarget = st.shift > 0 ? 0 : throttle;
      st.load += (loadTarget - st.load) * Math.min(1, dt * (st.shift > 0 ? 20 : 7));

      // crossfade neighbouring layers (equal power) and pitch each to the current rpm
      const r = st.rpm * V.sample;
      const w = r <= layers[1].rpm
        ? [1 - clamp01((r - layers[0].rpm) / (layers[1].rpm - layers[0].rpm)), clamp01((r - layers[0].rpm) / (layers[1].rpm - layers[0].rpm)), 0]
        : [0, 1 - clamp01((r - layers[1].rpm) / (layers[2].rpm - layers[1].rpm)), clamp01((r - layers[1].rpm) / (layers[2].rpm - layers[1].rpm))];
      const sampleMix = V.synth ? 0.75 : 1;
      layers.forEach((l, i) => {
        ramp(l.g.gain, Math.sin(w[i] * Math.PI / 2) * sampleMix, t, 0.04);
        if (l.src) ramp(l.src.playbackRate, Math.max(0.5, Math.min(2, r / l.rpm)), t, 0.03);
      });
      const rev = clamp01((st.rpm - V.idle) / (V.max - V.idle));
      if (synth) {
        const f = st.rpm / 30; // four-cylinder firing frequency
        ramp(synth.oscs[0].frequency, f, t, 0.03);
        ramp(synth.oscs[1].frequency, f * 0.5, t, 0.03);
        ramp(synth.oscs[2].frequency, f * 2.01, t, 0.03);
        ramp(synth.band.frequency, 180 + f * 3.2, t, 0.05);
        ramp(synth.g.gain, 0.2 + st.load * 0.28 + rev * 0.12, t, 0.05);
      }
      ramp(tone.frequency, (700 + st.load * 2400 + rev * (V.synth ? 2600 : 1400)) * (muffled ? 0.7 : 1), t, 0.06);
      ramp(bus.gain, st.ready && !st.mute ? 0.2 + st.load * 0.14 + rev * 0.12 : 0, t, st.mute ? 0.3 : 0.08);

      // sport voice: crackles on the overrun after a lift at high revs, and a blip on flat-out upshifts
      if (V.pops && st.ready && !st.mute) {
        if (st.lastThrottle > 0.6 && throttle === 0 && st.rpm > 3800) st.pops = 0.45 + Math.random() * 0.35;
        if (st.pops > 0) {
          st.pops -= dt;
          if (Math.random() < dt * 14) pop(t + Math.random() * 0.03, 0.12 + Math.random() * 0.22);
        }
        if (shifted && throttle > 0.8 && st.rpm > 5000) pop(t, 0.3);
      }
      st.lastThrottle = throttle;

      // tyre squeal: sliding sideways at speed, harder on the handbrake
      const slide = clamp01((Math.abs(car.slip) - 2.5) / 6) * clamp01((v - 3) / 3);
      if (skidSrc) {
        ramp(skidG.gain, slide * 0.3, t, 0.05);
        ramp(skidSrc.playbackRate, 0.88 + slide * 0.18 + Math.min(v, 30) * 0.002, t, 0.1);
      }

      // a dull thud for each fresh impact
      if (car.impact > 3 && !st.thud) {
        st.thud = true;
        if (!noise) {
          noise = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
          const d = noise.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        }
        const src = ctx.createBufferSource(); src.buffer = noise;
        const f = filter(ctx, 'lowpass', 220, 0.7);
        const g = gain(ctx, 0, out);
        g.gain.setValueAtTime(Math.min(0.7, car.impact * 0.06), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        src.connect(f).connect(g); src.start(t); src.stop(t + 0.4);
      }
      if (car.impact < 1) st.thud = false;
    },
  };
}

// Helicopter rotor, synthesised (no recording): the main rotor's blade slap is band-passed noise pulsed at the
// blade-passing rate (4 blades at ~395 rpm = 26 Hz), under a low thump; the fenestron adds its tonal whine and the
// turbines a thin high whistle. Spool-up raises the rate and the level together; climbing and hard tilts load the
// rotor and deepen the slap.
import { gain, filter, ramp } from './nodes.js';

export function createRotor(ctx, out) {
  const bus = gain(ctx, 0, out);
  // shared noise
  const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = n; noise.loop = true;

  // blade slap: noise -> band pass -> VCA driven by a sharpened sawtooth at the blade rate
  const slapBand = filter(ctx, 'bandpass', 180, 0.9);
  const slapVca = gain(ctx, 0.05);
  const slapOut = gain(ctx, 1.4, bus);
  noise.connect(slapBand); slapBand.connect(slapVca); slapVca.connect(slapOut);
  const lfo = ctx.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = 26;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = (i / 255) * 2 - 1; curve[i] = Math.pow(Math.max(0, x), 5); } // a short pulse per cycle
  shaper.curve = curve;
  const depth = gain(ctx, 0.9);
  lfo.connect(shaper); shaper.connect(depth); depth.connect(slapVca.gain);
  // low thump in step with the slap
  const thump = ctx.createOscillator(); thump.type = 'sine'; thump.frequency.value = 52;
  const thumpVca = gain(ctx, 0);
  const thumpDepth = gain(ctx, 0.5);
  shaper.connect(thumpDepth); thumpDepth.connect(thumpVca.gain);
  thump.connect(thumpVca); thumpVca.connect(gain(ctx, 0.55, bus));
  // broadband rotor wash
  const wash = filter(ctx, 'lowpass', 700, 0.5);
  const washG = gain(ctx, 0.07, bus);
  noise.connect(wash); wash.connect(washG);
  // fenestron whine (~10 blades at ~3600 rpm) and turbine whistle
  const fen = ctx.createOscillator(); fen.type = 'sawtooth'; fen.frequency.value = 600;
  const fenF = filter(ctx, 'lowpass', 1400, 0.8);
  const fenG = gain(ctx, 0.018, bus);
  fen.connect(fenF); fenF.connect(fenG);
  const tur = ctx.createOscillator(); tur.type = 'sine'; tur.frequency.value = 3900;
  const turG = gain(ctx, 0.006, bus);
  tur.connect(turG);
  const t0 = ctx.currentTime;
  for (const s of [noise, lfo, thump, fen, tur]) s.start(t0);

  let on = false;
  return {
    // s: { on, rpm 0..1, load 0..1 }
    update(s) {
      const t = ctx.currentTime;
      on = !!(s && s.on);
      const rpm = on ? s.rpm : 0, load = on ? s.load : 0;
      ramp(bus.gain, on ? 0.12 + rpm * 0.5 : 0, t, on ? 0.15 : 0.4);
      ramp(lfo.frequency, 4 + rpm * 22.5, t, 0.2);
      ramp(thump.frequency, 40 + rpm * 14, t, 0.2);
      ramp(depth.gain, 0.5 + load * 0.9, t, 0.15);
      ramp(slapBand.frequency, 150 + load * 90 + rpm * 40, t, 0.15);
      ramp(washG.gain, 0.03 + rpm * 0.06 + load * 0.04, t, 0.2);
      ramp(fen.frequency, 180 + rpm * 440, t, 0.2);
      ramp(tur.frequency, 1800 + rpm * 2200, t, 0.3);
      ramp(turG.gain, 0.002 + rpm * 0.006, t, 0.3);
    },
    get on() { return on; },
  };
}

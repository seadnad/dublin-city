// Rebuilds public/audio/*.mp3 (and CREDITS.md) from CC0 recordings on Freesound.
// Usage: node tools/audio/build.mjs      (needs ffmpeg on PATH; downloads land in tools/audio/cache, which is gitignored)
//
// Every source is CC0 and re-checked against its Freesound page before use. We use Freesound's HQ previews
// (128 kbps MP3, no login needed), which carry the same licence as the originals.
//
// Loops are made seamless in two steps:
//  1. crossfade the tail of the cut into its head (the loop length is searched for the best match on tonal sounds);
//  2. write the loop with a periodic pre-roll and post-roll around it, so the file is periodic well beyond the loop.
//     MP3 decoders add a variable delay (encoder padding), so the loop points we give Web Audio can land a few ms
//     off; with the padding they still fall inside periodic audio and the loop stays click-free on every browser.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const CACHE = path.join(ROOT, 'tools/audio/cache');
const OUT = path.join(ROOT, 'public/audio');
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// ---- sources (all CC0 1.0) ----
const SRC = {
  401552: { author: 'GiocoSound', title: 'SFX_Car_Engine_Outside_Idle.wav', note: 'BMW 120d diesel, outside, idle' },
  401556: { author: 'GiocoSound', title: 'SFX_Car_Engine_Outside_RPMLow.wav', note: 'BMW 120d diesel, outside, low revs' },
  401555: { author: 'GiocoSound', title: 'SFX_Car_Engine_Outside_RPMMed.wav', note: 'BMW 120d diesel, outside, medium revs' },
  157867: { author: 'Jefflix', title: 'Whelen Wail.wav', note: 'Whelen siren amplifier, wail tone, recorded direct from the box' },
  157866: { author: 'Jefflix', title: 'Whelen Yelp.wav', note: 'Whelen siren amplifier, yelp tone, recorded direct from the box' },
  703785: { author: 'susdennehy', title: 'LOMBARD STREET JUNCTION ATMOS W TRAFFIC AND TRAIN.wav', note: 'busy junction in Dublin city centre' },
  869038: { author: 'SignatureSoundsOrg', title: "St_Stephen's_Green_Ambiance_Dublin_Ireland_2", note: "footsteps and voices, St Stephen's Green, Dublin" },
  595717: { author: '_lynks', title: 'Soft Rain Loop', note: 'light rain, England' },
  457425: { author: 'boedie', title: 'boedie_alfa_romeo_MiTo_honking_car_horn.wav', note: 'Alfa Romeo MiTo horn' },
  349922: { author: 'DeVern', title: 'Car Horn Honk.wav', note: 'stationary car horn' },
  423990: { author: 'AmishRob', title: 'Car horn beep beep two beeps honk honk', note: 'small car double beep' },
  607820: { author: 'PostProdDog', title: 'bus air brakes and drive away', note: 'city bus air brake release' },
  454420: { author: 'kyles', title: 'bus coach ext pull up brake air release idle.wav', note: 'coach air brake release' },
  239646: { author: 'mdayalan', title: "Dublin's Luas Tram Arriving and Departing", note: 'Luas at Dundrum; we use the gong strike' },
  509105: { author: 'wlabarron', title: 'Irish pedestrian crossing', note: 'Dublin pedestrian crossing, green-man ticking' },
  71739: { author: 'audible-edge', title: 'Chrysler LHS tire squeal 04 (04-25-2009).wav', note: 'tyre squeal' },
};
const pageUrl = (id) => `https://freesound.org/s/${id}/`;

async function fetchSource(id) {
  const file = path.join(CACHE, `${id}.mp3`);
  if (fs.existsSync(file)) return file;
  const html = await (await fetch(pageUrl(id), { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  const lic = (html.match(/full license text" href="([^"]+)"/) || [])[1] || '';
  if (!/publicdomain\/zero\/1\.0/.test(lic)) throw new Error(`${id}: licence is not CC0 (${lic})`);
  const mp3 = (html.match(/https:\/\/cdn\.freesound\.org\/previews\/[^"]+-hq\.mp3/) || [])[0];
  if (!mp3) throw new Error(`${id}: no preview found`);
  fs.writeFileSync(file, Buffer.from(await (await fetch(mp3)).arrayBuffer()));
  return file;
}

// decode a cut to mono float32 at `sr`, through an optional ffmpeg filter chain
function decode(id, ss, dur, sr, af) {
  const args = ['-v', 'error', '-ss', String(ss), '-t', String(dur), '-i', path.join(CACHE, `${id}.mp3`)];
  if (af) args.push('-af', af);
  args.push('-ac', '1', '-ar', String(sr), '-f', 'f32le', '-');
  const raw = execFileSync('ffmpeg', args, { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
}

// best loop length in [lo, hi] samples: the tail after L should resemble the head (normalised correlation)
function bestLoop(x, X, lo, hi) {
  let best = -2, bestL = hi;
  let e0 = 0; for (let i = 0; i < X; i++) e0 += x[i] * x[i];
  for (let L = lo; L <= hi; L++) {
    let c = 0, e1 = 0;
    for (let i = 0; i < X; i++) { c += x[i] * x[L + i]; e1 += x[L + i] * x[L + i]; }
    const r = c / Math.sqrt(e0 * e1 + 1e-12);
    if (r > best) { best = r; bestL = L; }
  }
  return { L: bestL, r: best };
}

function makeLoop(x, sr, { xf, period, equalPower }) {
  const X = Math.round(xf * sr);
  let L = x.length - X, r = null;
  if (period) ({ L, r } = bestLoop(x, X, Math.round(period[0] * sr), Math.min(Math.round(period[1] * sr), x.length - X)));
  const y = new Float32Array(L);
  for (let n = 0; n < L; n++) {
    const a = x[n + X];
    if (n < L - X) { y[n] = a; continue; }
    const t = (n - (L - X)) / X, b = x[n + X - L];
    y[n] = equalPower ? a * Math.cos(t * Math.PI / 2) + b * Math.sin(t * Math.PI / 2) : a * (1 - t) + b * t;
  }
  return { y, r };
}

const rms = (y) => { let e = 0; for (const v of y) e += v * v; return Math.sqrt(e / y.length); };
const peak = (y) => { let p = 0; for (const v of y) p = Math.max(p, Math.abs(v)); return p; };
// scale to a target RMS (dBFS) but never past -1 dBFS peak
function level(y, rmsDb, peakDb = -1) {
  const g = Math.min(10 ** (rmsDb / 20) / (rms(y) + 1e-9), 10 ** (peakDb / 20) / (peak(y) + 1e-9));
  for (let i = 0; i < y.length; i++) y[i] *= g;
  return y;
}
function fade(y, sr, inS, outS) {
  const a = Math.round(inS * sr), b = Math.round(outS * sr);
  for (let i = 0; i < a && i < y.length; i++) y[i] *= i / a;
  for (let i = 0; i < b && i < y.length; i++) y[y.length - 1 - i] *= i / b;
  return y;
}

function encode(name, y, sr, kbps) {
  const tmp = path.join(CACHE, `${name}.f32`);
  fs.writeFileSync(tmp, Buffer.from(y.buffer, y.byteOffset, y.byteLength));
  const out = path.join(OUT, `${name}.mp3`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', `${kbps}k`, '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', out]);
  fs.unlinkSync(tmp);
  return fs.statSync(out).size;
}

// ---- loops ----
// pad: periodic pre/post-roll in seconds around the loop (see top comment)
const PAD = 0.12;
const LOOPS = [
  // engine: steady revs, from the outside of a BMW 120d (a 4-cylinder diesel, like the Garda i40's 1.7 CRDi)
  { name: 'engine_idle', src: 401552, ss: 0.15, dur: 2.9, sr: 48000, kbps: 64, af: 'highpass=f=25', xf: 0.1, period: [2.2, 2.7], rms: -18, rpm: 840 },
  { name: 'engine_low', src: 401556, ss: 0.15, dur: 1.9, sr: 48000, kbps: 64, af: 'highpass=f=25', xf: 0.1, period: [1.3, 1.75], rms: -18, rpm: 1470 },
  { name: 'engine_mid', src: 401555, ss: 0.15, dur: 2.6, sr: 48000, kbps: 64, af: 'highpass=f=25', xf: 0.1, period: [1.9, 2.45], rms: -18, rpm: 2040 },
  // siren: the amplifier was recorded straight from its output, so we add what a roof speaker does to it:
  // a horn driver has little below ~400 Hz and rolls off above ~5 kHz, with a presence bump around 1.5-2 kHz
  { name: 'siren_wail', src: 157867, ss: 2.0, dur: 5.35, sr: 48000, kbps: 64, af: SPEAKER(), xf: 0.06, period: [4.8, 5.15], rms: -16 },
  { name: 'siren_yelp', src: 157866, ss: 3.0, dur: 1.75, sr: 48000, kbps: 64, af: SPEAKER(), xf: 0.03, period: [1.45, 1.55], rms: -16 },
  // city beds
  { name: 'city_traffic', src: 703785, ss: 178, dur: 36, sr: 32000, kbps: 40, af: 'highpass=f=40', xf: 2.0, equalPower: true, rms: -20 },
  { name: 'city_people', src: 869038, ss: 118, dur: 28, sr: 32000, kbps: 40, af: 'highpass=f=120', xf: 2.0, equalPower: true, rms: -22 },
  { name: 'rain', src: 595717, ss: 0.2, dur: 22.2, sr: 32000, kbps: 40, af: 'highpass=f=80', xf: 1.5, equalPower: true, rms: -20 },
  { name: 'skid', src: 71739, ss: 5.0, dur: 3.4, sr: 48000, kbps: 56, af: 'highpass=f=500', xf: 0.25, equalPower: true, rms: -16 },
];
function SPEAKER() { return 'highpass=f=420,highpass=f=420,lowpass=f=5000,lowpass=f=5000,equalizer=f=1700:t=q:w=1.2:g=3'; }

// ---- one-shot sprites: [src, start, dur, fadeOut] ----
const SPRITES = [
  { name: 'horns', sr: 44100, kbps: 64, af: 'highpass=f=150', peakDb: -1, parts: {
    single: [457425, 1.07, 0.42, 0.08], double: [457425, 2.84, 0.4, 0.06], long: [457425, 4.28, 0.58, 0.08],
    tap: [349922, 1.38, 0.6, 0.06], blare: [349922, 2.47, 0.58, 0.08], beepbeep: [423990, 0.07, 0.55, 0.06],
  } },
  { name: 'bus', sr: 44100, kbps: 56, af: 'highpass=f=200', peakDb: -2, parts: {
    hiss: [607820, 2.95, 1.45, 0.6], hiss2: [454420, 4.15, 1.3, 0.5],
  } },
  { name: 'luas', sr: 44100, kbps: 64, af: 'highpass=f=450,afftdn=nf=-40', peakDb: -1, parts: {
    gong: [239646, 47.27, 1.05, 0.45],
  } },
  { name: 'crossing', sr: 32000, kbps: 48, af: 'highpass=f=300', peakDb: -2, parts: {
    go: [509105, 21.85, 6.1, 0.15],
  } },
];

// ---- build ----
for (const id of Object.keys(SRC)) await fetchSource(id);
const manifest = {};
let total = 0;
for (const l of LOOPS) {
  const x = decode(l.src, l.ss, l.dur, l.sr, l.af);
  const { y, r } = makeLoop(x, l.sr, l);
  level(y, l.rms);
  const P = Math.round(PAD * l.sr), L = y.length;
  const file = new Float32Array(P + L + P);
  for (let n = 0; n < file.length; n++) file[n] = y[(((n - P) % L) + L) % L];
  const size = encode(l.name, file, l.sr, l.kbps);
  total += size;
  manifest[l.name] = { loop: [+(P / l.sr).toFixed(5), +((P + L) / l.sr).toFixed(5)], ...(l.rpm ? { rpm: l.rpm } : {}) };
  console.log(`${l.name}: loop ${(L / l.sr).toFixed(3)} s${r != null ? `, match ${r.toFixed(3)}` : ''}, ${(size / 1024).toFixed(0)} KB`);
}
for (const s of SPRITES) {
  const gap = Math.round(0.25 * s.sr);
  const chunks = [new Float32Array(gap)], parts = {};
  let at = gap;
  for (const [k, [src, ss, dur, fo]] of Object.entries(s.parts)) {
    const y = fade(decode(src, ss, dur, s.sr, s.af), s.sr, 0.004, fo);
    level(y, 0, s.peakDb); // peak-normalise
    parts[k] = [+(at / s.sr).toFixed(4), +(y.length / s.sr).toFixed(4)];
    chunks.push(y, new Float32Array(gap));
    at += y.length + gap;
  }
  const all = new Float32Array(at);
  let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  const size = encode(s.name, all, s.sr, s.kbps);
  total += size;
  manifest[s.name] = parts;
  console.log(`${s.name}: ${Object.keys(parts).join(', ')}, ${(size / 1024).toFixed(0)} KB`);
}
console.log(`total ${(total / 1024).toFixed(0)} KB`);
console.log('manifest (paste into src/game/audio/assets.js):\n' + JSON.stringify(manifest));

// ---- credits ----
const used = (id) => [...LOOPS.filter((l) => l.src == id).map((l) => l.name), ...SPRITES.filter((s) => Object.values(s.parts).some((p) => p[0] == id)).map((s) => s.name)];
const rows = Object.entries(SRC).sort(([a], [b]) => used(a)[0].localeCompare(used(b)[0])).map(([id, s]) => `| ${used(id).map((n) => `\`${n}.mp3\``).join(', ')} | [${s.title}](https://freesound.org/people/${encodeURIComponent(s.author)}/sounds/${id}/) | ${s.author} | CC0 1.0 | ${s.note} |`);
fs.writeFileSync(path.join(OUT, 'CREDITS.md'), `# Audio credits

All recordings below are released under **Creative Commons 0 (CC0 1.0 Universal, public domain dedication)**:
https://creativecommons.org/publicdomain/zero/1.0/ . No attribution is required, but we credit the recordists anyway.
Each licence was checked on the sound's Freesound page when the files were built.

The files here were cut, looped, filtered and re-encoded by \`tools/audio/build.mjs\` from Freesound's preview MP3s.
Run \`node tools/audio/build.mjs\` to rebuild them.

| File | Source | Author | Licence | Notes |
|---|---|---|---|---|
${rows.join('\n')}

Synthesised in code, no recording: the siren's hi-lo tone (\`src/game/audio/siren.js\`), the impact thud
(\`src/game/audio/engine.js\`) and the game-mode cue beeps (\`src/game/audio.js\`).
`);

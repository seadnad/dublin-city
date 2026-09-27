// Audio files in public/audio (built by tools/audio/build.mjs; sources and licences in public/audio/CREDITS.md).
// loop: [start, end] seconds of the seamless loop inside the file (the file has periodic padding either side,
// so MP3 decoder delay can't push the loop points onto a click). Sprites: name -> [offset, duration] seconds.
export const FILES = {
  engine_idle: { loop: [0.12, 2.484], rpm: 840 },
  engine_low: { loop: [0.12, 1.4215], rpm: 1470 },
  engine_mid: { loop: [0.12, 2.56846], rpm: 2040 },
  siren_wail: { loop: [0.12, 5.16763], low: 3.06 }, // low: file offset where the sweep restarts from the bottom
  siren_yelp: { loop: [0.12, 1.63646] },
  city_traffic: { loop: [0.12, 34.12] },
  city_people: { loop: [0.12, 26.12] },
  rain: { loop: [0.12, 20.82] },
  skid: { loop: [0.12, 3.27] },
  horns: { sprite: { single: [0.25, 0.42], double: [0.92, 0.4], long: [1.57, 0.58], tap: [2.4, 0.6], blare: [3.25, 0.58], beepbeep: [4.08, 0.55] } },
  bus: { sprite: { hiss: [0.25, 1.45], hiss2: [1.95, 1.3] } },
  luas: { sprite: { gong: [0.25, 1.05] } },
  crossing: { sprite: { go: [0.25, 6.1] } },
};

// load order: what you hear first (engine, siren) before the long ambience beds
export const LOAD_ORDER = ['engine_idle', 'engine_low', 'engine_mid', 'siren_wail', 'siren_yelp', 'skid', 'city_traffic', 'rain', 'city_people', 'horns', 'bus', 'luas', 'crossing'];

// Runs the aerial intro on an OffscreenCanvas off the main thread, so it keeps moving while the city is built.
import { createIntro } from './scene.js';

let intro = null;
self.onmessage = async (e) => {
  const m = e.data;
  if (m.type === 'init') {
    // some browsers can transfer a canvas but not create WebGL in a worker: report it so the page takes over
    try { intro = createIntro(m.canvas, m.width, m.height, m.dpr, m.fps); self.postMessage({ type: 'ready' }); } catch (err) { self.postMessage({ type: 'failed', error: String(err) }); }
  }
  else if (!intro) return;
  else if (m.type === 'resize') intro.resize(m.width, m.height);
  else if (m.type === 'pan') { const pose = await intro.panTo(m.start, { skip: m.skip }); self.postMessage({ type: 'panned', pose }); }
  else if (m.type === 'stop') { intro.stop(); self.close(); }
};

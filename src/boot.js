// Boot: a lightweight aerial Dublin (src/intro/scene.js) shown while the full game loads behind it, then a cinematic
// pan to the starting point. Where the browser supports it (OffscreenCanvas + module workers: Chrome, Edge, recent
// Safari and Firefox) the intro renders in a worker, so it stays smooth while the main thread builds the city; the
// title and progress bar are plain HTML on top. Otherwise it renders on the page as before.
// main.js drives it through window.__intro: progress(), panTo(start), pose(), finish().
import { profile } from './render/quality.js';

// The aerial preview uses a second WebGL context while the full city is built. On the light profile,
// give the game that GPU/CPU time and memory instead; the existing loading card shows stage progress.
const lightLoadingText = profile.lite ? document.querySelector('#loading p') : null;
if (!profile.lite) {
const [THREE, { createIntro }] = await Promise.all([import('three'), import('./intro/scene.js')]);
let canvas = document.createElement('canvas');
canvas.id = 'intro';
document.body.appendChild(canvas);
const overlay = document.createElement('div');
overlay.id = 'intro-ui';
overlay.innerHTML = '<h1>DUBLIN</h1><div class="bar"><i></i></div><p class="step">Surveying the city…</p><p class="skip">Tap to skip</p>';
document.body.appendChild(overlay);
const barEl = overlay.querySelector('.bar i'), stepEl = overlay.querySelector('.step');
const size = () => ({ width: window.innerWidth, height: window.innerHeight });
const introDpr = Math.min(window.devicePixelRatio, profile.lite ? 1 : 1.5);
const introFps = profile.lite ? 30 : 60;
canvas.width = Math.round(window.innerWidth * introDpr);
canvas.height = Math.round(window.innerHeight * introDpr);

// ---- the renderer: a worker when possible, the page otherwise. Both expose resize / panTo / stop.
let runner;
function onPage(cv) { return createIntro(cv, window.innerWidth, window.innerHeight, introDpr, introFps); }
const offscreen = typeof canvas.transferControlToOffscreen === 'function' && typeof Worker === 'function' && !/[?&]intro=page/.test(location.search);
if (offscreen) {
  const worker = new Worker(new URL('./intro/worker.js', import.meta.url), { type: 'module' });
  const off = canvas.transferControlToOffscreen();
  worker.postMessage({ type: 'init', canvas: off, ...size(), dpr: introDpr, fps: introFps }, [off]);
  let panned = null, ready = false, pending = null;
  // if the worker can't draw (no WebGL in workers, or it fails to load), swap in a fresh canvas and draw on the page
  const fallBack = (why) => {
    if (runner.page) return;
    console.warn('intro: worker unavailable, drawing on the page', why || '');
    worker.terminate();
    const cv = document.createElement('canvas'); cv.id = 'intro';
    canvas.replaceWith(cv); canvas = cv;
    const page = onPage(cv);
    runner = { ...page, page: true };
    if (pending) { const [start, o, done] = pending; pending = null; page.panTo(start, o).then(done); }
  };
  worker.onmessage = (e) => {
    if (e.data.type === 'ready') ready = true;
    else if (e.data.type === 'failed') fallBack(e.data.error);
    else if (e.data.type === 'panned' && panned) { panned(e.data.pose); panned = null; }
  };
  worker.onerror = (e) => fallBack(e.message);
  setTimeout(() => { if (!ready) fallBack('no response'); }, 4000);
  runner = {
    resize: (w, h) => worker.postMessage({ type: 'resize', width: w, height: h }),
    panTo: (start, o) => new Promise((done) => {
      if (!ready) { pending = [start, o, done]; return; }
      panned = done; worker.postMessage({ type: 'pan', start, skip: o.skip });
    }),
    stop: () => worker.postMessage({ type: 'stop' }),
  };
} else {
  runner = onPage(canvas);
}
addEventListener('resize', () => runner.resize(window.innerWidth, window.innerHeight));
// the plain loading card underneath is no longer needed once this draws
const loading = document.getElementById('loading');
if (loading) loading.classList.add('gone');

// automated tests (webdriver) and anyone who has seen it can skip straight in
let skip = !!navigator.webdriver && !/[?&]intro/.test(location.search);
const onSkip = () => { skip = true; overlay.classList.add('skipping'); };
let lastPose = null;

window.__intro = {
  skip: () => skip,
  progress(frac, text) {
    barEl.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
    if (text) stepEl.textContent = text;
  },
  // pan to a pose above and behind the car; resolves when there (at once when skipped)
  async panTo(start) {
    overlay.classList.add('ready');
    lastPose = await runner.panTo({ x: start.x, z: start.z, heading: start.heading }, { skip });
    window.__introStats = { ...lastPose.stats, renderer: offscreen ? 'worker' : 'page' };
    console.log('intro frames', JSON.stringify(window.__introStats));
  },
  // the pose the real camera starts its descent from
  pose() {
    return { position: new THREE.Vector3().fromArray(lastPose.position), quaternion: new THREE.Quaternion().fromArray(lastPose.quaternion), fov: lastPose.fov };
  },
  // fade out, then free the renderer
  finish(ms = 900) {
    canvas.classList.add('fade'); overlay.classList.add('fade');
    setTimeout(() => { runner.stop(); canvas.remove(); overlay.remove(); delete window.__intro; }, ms + 100);
  },
};
overlay.addEventListener('pointerdown', onSkip);
addEventListener('keydown', onSkip, { once: true });
}

// ---- load the game in stages, with a frame between each so the progress text updates
const nextFrame = () => new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(go); setTimeout(go, 60); });
const stages = [
  ['Laying the streets…', () => import('./world/roads.js')],
  ['Filling the Liffey…', () => import('./world/ground.js')],
  ['Raising the buildings…', () => import('./world/buildings.js')],
  ['Placing the landmarks…', () => import('./world/landmarks.js')],
  ['Waking the city…', () => import('./main.js')],
];
const bootStart = performance.now();
(async () => {
  for (let i = 0; i < stages.length; i++) {
    if (window.__intro) window.__intro.progress(i / (stages.length + 2), stages[i][0]);
    else if (lightLoadingText) lightLoadingText.textContent = stages[i][0];
    await nextFrame();
    const started = performance.now();
    await stages[i][1]();
    console.log(`startup ${stages[i][0]}: ${Math.round(performance.now() - started)} ms`);
  }
  console.log(`startup modules and city: ${Math.round(performance.now() - bootStart)} ms`);
})().catch((e) => { console.error(e); const text = document.querySelector(profile.lite ? '#loading p' : '#intro-ui .step'); if (text) text.textContent = 'Something went wrong loading the city.'; });

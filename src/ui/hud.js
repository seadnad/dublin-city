// HUD: street sign, speedo, minimap, toolbar, landmark list, help panel and toasts.
import { world } from '../world/geo.js';
import { layoutCanvas, PPM } from '../world/ground.js';
import { IS_MOBILE } from '../world/textures.js';

const B = world.bounds;
const ICONS = {
  rain: '<path d="M7 15a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 8a3.5 3.5 0 0 1 .5 7H7Z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  camera: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  pin: '<path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7v.5M12 17h.01"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  photo: '<circle cx="12" cy="12" r="9"/><path d="M12 3l3.5 6M21 12h-7M16.5 19.8 13 14M7.5 19.8 11 13.8M3 12h7M7.5 4.2 11 10"/>',
  map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

const BLURBS = {
  spire: 'Monument of Light, 120 m of steel on O’Connell Street',
  gpo: 'General Post Office, HQ of the 1916 Rising',
  oconnellBridge: 'As wide as it is long, over the Liffey',
  hapenny: 'Cast-iron footbridge from 1816',
  trinity: 'Front gate on College Green, campanile in Front Square',
  bankOfIreland: 'Pearce’s 1729 Parliament House and Gandon’s Lords portico; a bank since 1803',
  cityHall: 'The Royal Exchange at the top of Parliament Street',
  centralBank: 'Floors hung from the roof, on Central Plaza',
  christChurch: 'Medieval cathedral and the Synod Hall bridge',
  stPatricks: "Minot's Tower and the granite spire over the park",
  customHouse: 'Gandon’s domed masterpiece on the quays',
  stephensGreen: 'Victorian park, entered by the Fusiliers’ Arch',
  heuston: 'Kingsbridge terminus, where the western quays end',
  guinness: 'Seven storeys of stout, Gravity Bar on top',
  beckett: 'Calatrava’s harp over the docklands',
  convention: 'The tilted glass drum on North Wall Quay',
  threeArena: 'The old Point Depot at the mouth of the Liffey',
  grandCanal: 'Libeskind’s theatre and the red light-sticks',
  grandCanalSt: 'Offices between Merrion Square and the docks',
  aviva: 'Lansdowne Road’s louvred glass wave, with the DART crossing at its door',
  ccj: 'The courts’ glass drum, at the Parkgate end of the Phoenix Park',
};

export function createHUD({ sites, actions }) {
  const hud = document.getElementById('hud');
  hud.insertAdjacentHTML('beforeend', `
    <div class="street" id="street"></div>
    <div class="speedo"><b id="speed">0</b><span>km/h</span><span class="alt" id="alt" hidden></span></div>
    <div class="toolbar panel" role="toolbar" aria-label="Game options">
      <button data-a="play" title="Play (G)" class="play-btn">${svg('play')}<span>Play</span><kbd>G</kbd></button>
      <button data-a="rain" title="Rain (R)">${svg('rain')}<span>Rain</span><kbd>R</kbd></button>
      <button data-a="evening" title="Night (N)">${svg('moon')}<span>Night</span><kbd>N</kbd></button>
      <button data-a="camera" title="Camera (C)">${svg('camera')}<span>Camera</span><kbd>C</kbd></button>
      <button data-a="photo" title="Photo mode (P)">${svg('photo')}<span>Photo</span><kbd>P</kbd></button>
      <button data-a="map" title="Map (M)">${svg('map')}<span>Map</span><kbd>M</kbd></button>
      <button data-a="places" title="Landmarks (T)">${svg('pin')}<span>Places</span><kbd>T</kbd></button>
      <button data-a="sound" title="Sound (V)">${svg('sound')}<span>Sound</span><kbd>V</kbd></button>
      <button data-a="help" title="Help (H)">${svg('help')}<span>Help</span><kbd>H</kbd></button>
    </div>
    <canvas class="minimap" id="minimap" aria-label="Minimap, click to open the map" title="Open the map (M)"></canvas>
    <div class="waypoint" id="waypoint"></div>
    <div class="tram-stop" id="tramstop"></div>
    <div class="panel sheet places" id="places" hidden>
      <header><h2>Landmarks</h2><button class="close" data-a="places" aria-label="Close">&times;</button></header>
      <ol>${Object.entries(sites).map(([k, s], i) => `<li><button data-go="${k}"><kbd>${i + 1}</kbd><span><b>${s.name}</b><small>${BLURBS[k] || ''}</small></span></button></li>`).join('')}</ol>
    </div>
    <div class="panel sheet help" id="help" hidden>
      <header><h2>Dublin Drive</h2><button class="close" data-a="help" aria-label="Close">&times;</button></header>
      <p class="lede">A compressed central Dublin: the quays, O’Connell Street, College Green, Temple Bar and St Stephen’s Green. Traffic drives on the <b>left</b>.</p>
      <table>
        <tr><td><kbd>W</kbd> <kbd>&uarr;</kbd></td><td>Accelerate</td></tr>
        <tr><td><kbd>S</kbd> <kbd>&darr;</kbd></td><td>Brake / reverse</td></tr>
        <tr><td><kbd>A</kbd> <kbd>D</kbd> <kbd>&larr;</kbd> <kbd>&rarr;</kbd></td><td>Steer</td></tr>
        <tr><td><kbd>Space</kbd></td><td>Handbrake (drift)</td></tr>
        <tr><td><kbd>C</kbd></td><td>Chase / bonnet camera</td></tr>
        <tr><td><kbd>R</kbd> <kbd>N</kbd></td><td>Rain / night</td></tr>
        <tr><td><kbd>G</kbd></td><td>Play: Garda Pursuit, Time Trials</td></tr>
        <tr><td><kbd>X</kbd> <kbd>Z</kbd></td><td>Siren and blue lights / siren tone</td></tr>
        <tr><td><kbd>M</kbd></td><td>World map (click streets for a waypoint)</td></tr>
        <tr><td><kbd>T</kbd> <kbd>1</kbd>&ndash;<kbd>9</kbd></td><td>Landmark list / teleport</td></tr>
        <tr><td><kbd>P</kbd></td><td>Photo mode: drag to orbit, scroll to zoom, right-drag to pan, WASD to move, Space to snap</td></tr>
        <tr><td><kbd>Backspace</kbd></td><td>Reset car onto the road</td></tr>
        <tr><td><kbd>L</kbd></td><td>Garda helicopter / back to the car (also in Play)</td></tr>
        <tr><td>🚁</td><td>Flying: <kbd>W</kbd> <kbd>S</kbd> tilt forward / back, <kbd>A</kbd> <kbd>D</kbd> turn, <kbd>&larr;</kbd> <kbd>&rarr;</kbd> bank, <kbd>Space</kbd> climb, <kbd>Shift</kbd> descend (hands off to hover, descend to land), <kbd>X</kbd> searchlight, <kbd>C</kbd> near / far camera</td></tr>
        <tr><td>🎮</td><td>Controller: stick steers, RT go, LT brake / reverse, A or B handbrake, Y siren, X camera, LB siren tone, RB night, View map, Menu play, right stick click photo mode, D-pad right helicopter (flying: left stick tilts, right stick turns, RT / LT climb / descend, Y searchlight); in menus D-pad + A, B back</td></tr><tr><td><kbd>Q</kbd></td><td>Graphics: Auto / High / Medium / Low / Battery saver (also in Play)</td></tr>
        <tr><td><kbd>V</kbd> <kbd>F</kbd></td><td>Sound / frame rate</td></tr>
      </table>
      <p class="touch-note">On a phone: steer with the left pad, pedals on the right, <b>HB</b> is the handbrake. Flying: tilt with the stick on the left; climb, descend and turn on the right.</p>
    </div>
    <div class="toast" id="toast"></div>
    <div class="fps" id="fps" hidden></div>
  `);
  const $ = (id) => document.getElementById(id);
  const streetEl = $('street'), speedEl = $('speed'), toastEl = $('toast'), fpsEl = $('fps'), stopEl = $('tramstop'), altEl = $('alt');
  const places = $('places'), help = $('help');

  const panels = { places, help };
  function togglePanel(name, force) {
    for (const [k, el] of Object.entries(panels)) {
      const show = k === name ? (force ?? el.hidden) : false;
      el.hidden = !show;
    }
    hud.querySelector('[data-a="places"]').classList.toggle('on', !places.hidden);
    hud.querySelector('[data-a="help"]').classList.toggle('on', !help.hidden);
  }
  hud.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { actions.teleport(go.dataset.go); togglePanel(null); return; }
    const a = e.target.closest('[data-a]');
    if (!a) return;
    const k = a.dataset.a;
    if (k === 'places' || k === 'help') togglePanel(k);
    else actions[k]();
    a.blur();
  });

  let toastTimer = 0;
  function toast(msg, ms = 1800) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }
  function setOn(action, on) { const b = hud.querySelector(`.toolbar [data-a="${action}"]`); if (b) b.classList.toggle('on', on); }

  // ---------- minimap ----------
  const map = $('minimap');
  map.addEventListener('click', () => actions.map());
  const wpEl = $('waypoint');
  let waypoint = null;
  let getBlips = () => [];
  const size = IS_MOBILE ? 118 : 190;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  map.width = map.height = size * dpr;
  map.style.width = map.style.height = `${size}px`;
  const mctx = map.getContext('2d');
  // the layout canvas itself (already capped at 4096 px: a second full-map copy would break iPhone canvas limits)
  const MPP = PPM, mini = layoutCanvas;
  const radiusM = IS_MOBILE ? 150 : 170;
  const siteList = Object.values(sites);

  function drawMinimap(car, traffic, tram) {
    const W = map.width, R = W / 2, k = R / radiusM; // px per metre
    const th = -Math.PI / 2 - Math.atan2(Math.cos(car.heading), Math.sin(car.heading));
    const c = Math.cos(th), s = Math.sin(th);
    const toScreen = (x, z) => {
      const dx = (x - car.pos.x) * k, dz = (z - car.pos.z) * k;
      return [R + dx * c - dz * s, R + dx * s + dz * c];
    };
    mctx.save();
    mctx.clearRect(0, 0, W, W);
    mctx.beginPath(); mctx.arc(R, R, R - 2 * dpr, 0, Math.PI * 2); mctx.clip();
    mctx.fillStyle = '#5f5d58'; mctx.fillRect(0, 0, W, W);
    mctx.translate(R, R); mctx.rotate(th); mctx.scale(k / MPP, k / MPP);
    mctx.translate(-(car.pos.x - B.minX) * MPP, -(car.pos.z - B.minZ) * MPP);
    mctx.drawImage(mini, 0, 0);
    mctx.restore();
    mctx.save();
    mctx.beginPath(); mctx.arc(R, R, R - 2 * dpr, 0, Math.PI * 2); mctx.clip();
    // traffic + tram
    mctx.fillStyle = '#e8e4da';
    for (const ai of traffic.list) {
      const [x, y] = toScreen(ai.pos.x, ai.pos.z);
      mctx.fillRect(x - 2 * dpr, y - 2 * dpr, 4 * dpr, 4 * dpr);
    }
    mctx.fillStyle = '#b07bd6';
    for (const t of tram.carriages) { const [x, y] = toScreen(t.x, t.z); mctx.beginPath(); mctx.arc(x, y, 3.4 * dpr, 0, 7); mctx.fill(); }
    mctx.restore();
    // landmark pins (clamped to the rim when off-map)
    for (const st of siteList) {
      let [x, y] = toScreen(st.x, st.z);
      const dx = x - R, dy = y - R, d = Math.hypot(dx, dy), lim = R - 9 * dpr;
      const off = d > lim;
      if (off) { x = R + (dx / d) * lim; y = R + (dy / d) * lim; }
      mctx.beginPath(); mctx.arc(x, y, (off ? 4 : 5.5) * dpr, 0, 7);
      mctx.fillStyle = off ? 'rgba(242,182,50,0.8)' : '#f2b632'; mctx.fill();
      mctx.lineWidth = 1.5 * dpr; mctx.strokeStyle = '#fff'; mctx.stroke();
    }
    // waypoint (clamped to the rim when off the minimap)
    if (waypoint) {
      let [x, y] = toScreen(waypoint.x, waypoint.z);
      const dx = x - R, dy = y - R, d = Math.hypot(dx, dy), lim = R - 9 * dpr;
      if (d > lim) { x = R + (dx / d) * lim; y = R + (dy / d) * lim; }
      mctx.save(); mctx.translate(x, y); mctx.rotate(Math.PI / 4);
      mctx.fillStyle = '#ff883e'; mctx.fillRect(-6 * dpr, -6 * dpr, 12 * dpr, 12 * dpr);
      mctx.lineWidth = 2 * dpr; mctx.strokeStyle = '#fff'; mctx.strokeRect(-6 * dpr, -6 * dpr, 12 * dpr, 12 * dpr);
      mctx.restore();
    }
    // mission blips (pulsing), clamped to the rim with a direction pip when off the map
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
    for (const b of getBlips()) {
      let [x, y] = toScreen(b.x, b.z);
      const dx = x - R, dy = y - R, d = Math.hypot(dx, dy), lim = R - 10 * dpr;
      const off = d > lim;
      if (off) { x = R + (dx / d) * lim; y = R + (dy / d) * lim; }
      if (b.pulse) { mctx.beginPath(); mctx.arc(x, y, (8 + pulse * 6) * dpr, 0, 7); mctx.fillStyle = b.color + '55'; mctx.fill(); }
      mctx.beginPath(); mctx.arc(x, y, (off ? 5 : 6.5) * dpr, 0, 7);
      mctx.fillStyle = b.color; mctx.fill(); mctx.lineWidth = 1.5 * dpr; mctx.strokeStyle = '#fff'; mctx.stroke();
    }
    // north marker
    const [nx, ny] = (() => { const dx = 0, dz = -1; return [R + (dx * c - dz * s) * (R - 11 * dpr), R + (dx * s + dz * c) * (R - 11 * dpr)]; })();
    mctx.font = `bold ${11 * dpr}px system-ui, sans-serif`; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
    mctx.fillStyle = 'rgba(0,0,0,0.55)'; mctx.beginPath(); mctx.arc(nx, ny, 8 * dpr, 0, 7); mctx.fill();
    mctx.fillStyle = '#fff'; mctx.fillText('N', nx, ny + 0.5);
    // player arrow
    mctx.save(); mctx.translate(R, R);
    mctx.beginPath(); mctx.moveTo(0, -8 * dpr); mctx.lineTo(6 * dpr, 7 * dpr); mctx.lineTo(0, 4 * dpr); mctx.lineTo(-6 * dpr, 7 * dpr); mctx.closePath();
    mctx.fillStyle = '#ff883e'; mctx.fill(); mctx.lineWidth = 1.5 * dpr; mctx.strokeStyle = '#fff'; mctx.stroke();
    mctx.restore();
    // rim
    mctx.beginPath(); mctx.arc(R, R, R - 1.5 * dpr, 0, Math.PI * 2);
    mctx.lineWidth = 3 * dpr; mctx.strokeStyle = 'rgba(244,241,234,0.9)'; mctx.stroke();
  }

  let lastStreet = null, mapT = 0, fpsFrames = 0, fpsT = 0;
  return {
    toast, setOn, togglePanel,
    setBlips(fn) { getBlips = fn; },
    setWaypoint(p) { waypoint = p; if (!p) { wpEl.textContent = ''; wpEl.classList.remove('show'); } },
    isPanelOpen: () => !places.hidden || !help.hidden,
    toggleFps() { fpsEl.hidden = !fpsEl.hidden; },
    update(dt, { car, traffic, tram }) {
      const name = car.street ? car.street.name : '';
      if (name !== lastStreet) {
        streetEl.textContent = name; lastStreet = name;
        streetEl.classList.remove('flip'); void streetEl.offsetWidth; streetEl.classList.add('flip');
      }
      speedEl.textContent = Math.round(Math.abs(car.speed) * 3.6);
      // flying: height above the ground (or roof) below
      const alt = car.alt != null ? `▲ ${Math.max(0, Math.round(car.alt))} m` : '';
      if (altEl.textContent !== alt) { altEl.textContent = alt; altEl.hidden = !alt; }
      if (waypoint) {
        const d = Math.hypot(waypoint.x - car.pos.x, waypoint.z - car.pos.z);
        if (d < 18) { toast(`Arrived: ${waypoint.name}`, 2500); this.setWaypoint(null); actions.waypointReached && actions.waypointReached(); }
        else { wpEl.textContent = `${waypoint.name} · ${d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1) + ' km'}`; wpEl.classList.add('show'); }
      }
      mapT -= dt;
      if (mapT <= 0) { drawMinimap(car, traffic, tram); mapT = IS_MOBILE ? 1 / 24 : 1 / 45; }
      // Luas stop announcement when the player is near a stopped tram
      let stop = '';
      if (tram.currentStop) {
        const t = tram.carriages[0];
        if ((t.x - car.pos.x) ** 2 + (t.z - car.pos.z) ** 2 < 90 * 90) stop = `Luas • ${tram.currentStop}`;
      }
      if (stopEl.textContent !== stop) { stopEl.textContent = stop; stopEl.classList.toggle('show', !!stop); }
      fpsFrames++; fpsT += dt;
      if (fpsT > 0.5) { fpsEl.textContent = `${Math.round(fpsFrames / fpsT)} fps`; fpsFrames = 0; fpsT = 0; }
    },
  };
}

import * as THREE from 'three';
import { world, v2, laneOffset, pointInPolygon } from './world/geo.js';
import { buildGround, isOverWater, setWet, WATER_Y, dockPolys } from './world/ground.js';
import { createAtmosphere } from './world/atmosphere.js';
import { buildBuildings, buildingUniforms } from './world/buildings.js';
import { buildLandmarks, landmarkMaterials, waterGlowSources } from './world/landmarks.js';
import { buildWaterGlow } from './render/waterglow.js';
import { buildLamps, buildRain } from './world/props.js';
import { buildFurniture, createSignals } from './world/furniture.js';
import { sites } from './world/sites.js';
import { IS_MOBILE } from './world/textures.js';
import { segmentCount } from './game/collision.js';
import { Car } from './game/car.js';
import { makePlayerCar } from './game/fleet.js';
import { input, updateInput, onKey, buildTouchControls } from './game/input.js';
import { CameraRig } from './game/camera.js';
import { createTraffic } from './game/traffic.js';
import { createLuas, combineTrams } from './game/luas.js';
import { createPeople } from './game/people.js';
import { audio } from './game/audio.js';
import { createHUD } from './ui/hud.js';
import { createWorldMap } from './ui/worldmap.js';
import { createGameUI, save } from './ui/gameui.js';
import { createPursuit } from './game/modes/pursuit.js';
import { createTrial } from './game/modes/trial.js';
import { addGardaKit } from './game/garda.js';
import { loadCar } from './game/models.js';
import { loadTrees } from './world/trees.js';
import { createPipeline, QUALITIES } from './render/pipeline.js';
import { applyTextureQuality } from './render/texquality.js';
import { createContactShadows } from './render/contact.js';
import { bakeGroundAO, groundAOUniforms } from './render/groundao.js';
import { bakeLampLight, lampUniforms } from './render/lamplight.js';
import { reserved as landmarkFootprints } from './world/sites.js';
import { KERB_H } from './world/roads.js';

const canvas = document.getElementById('scene');
// ---- renderer baseline (three r186) ----
// MSAA on for every device: phones render straight to the screen, so this is their only anti-aliasing.
// Tile-based mobile GPUs resolve MSAA on-chip, which keeps it cheap at our capped pixel ratio.
THREE.ColorManagement.enabled = true; // colours given in sRGB (hex, CSS) are converted to linear for lighting
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
// pixel ratio: 1.5 on phones (a 3x phone screen would otherwise shade 4x the pixels), 2 on desktop;
// the adaptive loop below steps it down further if frames run long
const maxDpr = Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2);
let dpr = maxDpr;
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
// ACES Filmic: filmic highlight roll-off (whites and sky don't clip) and stronger mid-tone contrast.
// Exposure is set per weather / time-of-day preset in atmosphere.js.
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.4, 950);

// ---------- world ----------
const t0 = performance.now();
const atmosphere = createAtmosphere(scene, renderer);
const ground = buildGround(scene);
const buildings = buildBuildings(scene);
{ const t = performance.now(); bakeGroundAO([...buildings.lots, ...landmarkFootprints], world.bounds); console.log(`ground AO baked in ${Math.round(performance.now() - t)} ms`); }
const landmarks = buildLandmarks(scene);
const lamps = buildLamps(scene);
// reflections of quay lamps and the docklands lights on the water after dark
const nearWater = (x, z) => [[7, 0], [-7, 0], [0, 7], [0, -7]].some(([dx, dz]) => isOverWater(x + dx, z + dz));
const waterGlow = buildWaterGlow(scene, [
  ...lamps.spots.filter((s) => nearWater(s.hx, s.hz)).map((s) => ({
    x: s.hx, z: s.hz, y: WATER_Y + (dockPolys.some((dk) => [[7, 0], [-7, 0], [0, 7], [0, -7]].some(([dx, dz]) => pointInPolygon({ x: s.hx + dx, z: s.hz + dz }, dk.poly))) ? 0.65 : 0.05),
    color: 0xffb25e, width: 1.8, length: 30,
  })),
  ...waterGlowSources,
]);
{ const t = performance.now(); bakeLampLight(lamps.spots, world.bounds); console.log(`lamp light baked in ${Math.round(performance.now() - t)} ms`); }
const rain = buildRain(scene);
const furniture = buildFurniture(scene);
const signals = createSignals(scene);
console.log('furniture', JSON.stringify(furniture), 'signal heads', signals.count);
console.log(`world built in ${Math.round(performance.now() - t0)} ms: ${buildings.count} buildings, ${lamps.count} lamps, ${landmarks.trees} trees, ${segmentCount()} collision segments`);

// ---------- player ----------
function laneSpot(edge, t) {
  const d = v2.norm(v2.sub(edge.to, edge.from));
  const off = laneOffset(edge.way);
  const p = v2.lerp(edge.from, edge.to, t);
  return { x: p.x + d.z * off, z: p.z - d.x * off, heading: Math.atan2(d.x, d.z) };
}
const start = laneSpot(world.nodes.get('NQ8').edges.find((e) => e.to.id === 'OC1'), 0.2);
const car = new Car(start.x, start.z, start.heading);
// the player drives a Garda patrol car
// (a procedural stand-in until the Blender model has loaded)
let carMesh = makePlayerCar('hatch', 0xeeeeea);
let garda = addGardaKit(carMesh);
car.siren = false;
carMesh.rotation.order = 'YXZ';
scene.add(carMesh);
const headlight = new THREE.SpotLight(0xfff1d6, 0, 70, 0.5, 0.5, 1.2);
headlight.position.set(0, 0.8, 2.2);
headlight.target.position.set(0, 0, 14);
carMesh.add(headlight, headlight.target);
const rig = new CameraRig(camera);
const playerContact = createContactShadows(scene, 1, { opacity: 0.7, shape: 'car' });
playerContact.alloc();

// Put the car back on the nearest road lane.
function respawnNearRoad() {
  let best = null, bd = Infinity;
  for (const e of world.edges) {
    if (e.way.bridge) continue;
    const c = v2.lerp(e.from, e.to, 0.5);
    const d = (c.x - car.pos.x) ** 2 + (c.z - car.pos.z) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  const s = laneSpot(best, 0.5);
  car.teleport(s.x, s.z, s.heading);
  rig.snap();
}

// ---------- traffic + Luas ----------
const traffic = createTraffic(scene, IS_MOBILE ? { cars: 12, buses: 3, taxis: 3, parked: 120 } : { cars: 26, buses: 6, taxis: 5, parked: 320 });
const tram = combineTrams(world.luasLines.map((line) => createLuas(scene, line)));
const people = createPeople(scene, { count: IS_MOBILE ? 110 : 300 });
traffic.setPlayer(car);
traffic.setTram(tram);
traffic.setSignals(signals);
audio.setWorld(world, signals); // audio: pedestrian-crossing sounds at signalised junctions
car.dynamicObstacles = (c, r) => {
  let best = null;
  for (const f of [traffic.collide, tram.collide, (cc, rr) => pursuit.collide(cc, rr)]) {
    const h = f(c, r);
    if (h && (!best || h.depth > best.depth)) best = h;
  }
  return best;
};

let time = 0;

// ---------- modes ----------
const mode = { rain: false, evening: false };
let lastSwitch = 0, wetTarget = 0, wetNow = 0;
function applyMode() {
  lastSwitch = time;
  atmosphere.apply(mode);
  const p = atmosphere.state.values;
  wetTarget = p.wet;
  buildingUniforms.uNight.value = p.windows;

  lamps.setLevel(p.lamps);
  landmarks.setNight(mode.evening ? p.lamps : 0);
  waterGlow.setLevel(mode.evening ? p.lamps * (mode.rain ? 0.7 : 1) : 0);
  lampUniforms.uLampLevel.value = mode.evening ? p.lamps : 0; // baked lamp light only after dark
  landmarkMaterials.lampGlow.emissiveIntensity = 0.2 + p.lamps * 3;
  traffic.setLights(p.lamps);
  carMesh.userData.setLights(p.lamps);
  headlight.intensity = mode.evening ? 90 : mode.rain ? 15 : 0;
  headlight.distance = mode.evening ? 85 : 70;
  rain.set(mode.rain, mode.evening);
  people.setRain(mode.rain);
  pipeline.setMood(mode);
  hud.setOn('rain', mode.rain); hud.setOn('evening', mode.evening);
}

// ---------- HUD + input ----------
const siteKeys = Object.keys(sites);
function teleportTo(key) {
  const v = sites[key].view;
  car.teleport(v.x, v.z, v.heading);
  rig.snap();
  hud.toast(sites[key].name);
}
const actions = {
  rain: () => { mode.rain = !mode.rain; applyMode(); hud.toast(mode.rain ? 'Rain' : 'Dry'); },
  evening: () => { mode.evening = !mode.evening; applyMode(); hud.toast(mode.evening ? 'Night' : 'Daytime'); },
  camera: () => { rig.toggle(); hud.toast(rig.mode === 'chase' ? 'Chase camera' : 'Bonnet camera'); },
  sound: () => { const on = audio.toggle(); hud.setOn('sound', on); hud.toast(on ? 'Sound on' : 'Sound off'); },
  teleport: teleportTo,
  map: () => worldMap.toggle(),
  play: () => gameUI.togglePlay(),
};
const hud = createHUD({ sites, actions });
// Desktop starts at medium and steps up to high (ambient occlusion) if there is frame-time headroom.
const pipeline = createPipeline(renderer, scene, camera, { quality: IS_MOBILE ? 'low' : 'medium' });
const failed = { high: false, medium: false };
let userQuality = false;
onKey('q', () => {
  const q = QUALITIES[(QUALITIES.indexOf(pipeline.quality) + 1) % QUALITIES.length];
  pipeline.setQuality(q); pipeline.setMood(mode); lastSwitch = time; userQuality = true;
  hud.toast(`Graphics: ${q}`);
});
hud.setOn('sound', true);
buildTouchControls(document.getElementById('hud'));
onKey('r', actions.rain);
onKey('n', actions.evening);
onKey('c', actions.camera);
onKey('v', actions.sound);
const worldMap = createWorldMap({
  sites, lots: buildings.lots,
  getLive: () => ({
    player: { x: car.pos.x, z: car.pos.z, heading: car.heading },
    traffic: traffic.list.map((a) => a.pos),
    blips: [...pursuit.blips(), ...trial.blips()],
    tram: tram.carriages,
  }),
  onTeleport: (k) => teleportTo(k),
  onWaypoint: (p) => { hud.setWaypoint(p); if (p) hud.toast(`Waypoint: ${p.name}`); },
});
onKey('m', actions.map);

// ---------- game modes ----------
let frozen = false;
const gameUI = createGameUI({
  onPursuit: () => { trial.stop(); pursuit.start(); },
  onTrial: (r) => { pursuit.stop(); trial.start(r); rig.snap(); },
  onFree: () => { pursuit.stop(); trial.stop(); hud.toast('Free roam'); },
  onCar: (name) => actions.car(name),
  trialInfo: (r) => trial.info(r),
  toast: (m, ms) => hud.toast(m, ms),
});
const pursuit = createPursuit({
  scene, player: car, traffic, ui: gameUI, audio, save,
  makeSuspectMesh: () => {
    // one suspect at a time, so the loaded model itself is used (pursuit keeps and reuses this mesh)
    const m = suspectModel || makePlayerCar('hatch', 0xa3121a);
    m.rotation.order = 'YXZ';
    return m;
  },
});
const trial = createTrial({ scene, player: car, playerMesh: carMesh, ui: gameUI, audio, save, freeze: (f) => { frozen = f; } });
hud.setBlips(() => [...pursuit.blips(), ...trial.blips()]);

// ---------- Blender hero cars: swap in when loaded ----------
let suspectModel = null;
// swap the player's car for a loaded model: 'garda' (default) or 'hatch'
async function useCar(name) {
  const m = await loadCar(name);
  if (!m) return;
  m.rotation.order = 'YXZ';
  m.add(headlight, headlight.target);
  scene.remove(carMesh);
  carMesh = m;
  scene.add(carMesh);
  // the model has its own lightbar: flash its lenses instead of adding the procedural kit
  const bars = m.userData.lightbar;
  if (m.userData.flash) {
    // Garda i40: alternating left / right quad flash on the light bar, grille and rear-screen flashers, with a
    // small blue light at each end of the bar that flickers in sync and washes the road and nearby walls.
    // (The model faces +z, so the car's left is +x.)
    const lampL = new THREE.PointLight(0x2f5dff, 0, 14, 2), lampR = new THREE.PointLight(0x2f5dff, 0, 14, 2);
    lampL.position.set(0.5, 1.62, -0.15); lampR.position.set(-0.5, 1.62, -0.15);
    m.add(lampL, lampR);
    garda = { update(t, on) {
      let l = 0, r = 0;
      if (on) {
        const p = t % 0.9, q = p % 0.45, lit = q < 0.36 && q % 0.09 < 0.045 ? 1 : 0; // four 45 ms pulses per side
        if (p < 0.45) l = lit; else r = lit;
      }
      m.userData.flash(l, r);
      const k = mode.evening ? 34 : 14;
      lampL.intensity = l * k; lampR.intensity = r * k;
    } };
  } else {
    const glow = new THREE.PointLight(0x3a6bff, 0, 18, 2); glow.position.set(0, 2.0, -0.3); m.add(glow);
    garda = { update(t, on) {
      const p = (t * 2.2) % 1;
      const a = on && (p < 0.12 || (p > 0.2 && p < 0.32)), b = on && ((p > 0.5 && p < 0.62) || (p > 0.7 && p < 0.82));
      // lenses glow a saturated blue when flashing, and sit as glossy dark-blue plastic between flashes
      bars.forEach((mat, i) => { mat.emissiveIntensity = (i % 2 ? b : a) ? 5 : 0.25; });
      glow.intensity = a || b ? (mode.evening ? 40 : 18) : 0;
    } };
    if (!bars.length) garda = { update() {} };
  }
  carMesh.userData.setLights(atmosphere.state.values.lamps);
  save.set('car', name);
}
const carReady = useCar(save.get('car', 'garda'));
const CAR_NAMES = { garda: 'Garda Hyundai i40 patrol car', garda_rp: 'Garda Roads Policing i40', hatch: 'Hyundai i30 N' };
actions.car = (name) => { useCar(name); hud.toast(CAR_NAMES[name] || name); };
loadCar('coupe').then((m) => { suspectModel = m; });
const treesReady = loadTrees().then((s) => console.log('trees loaded:', s.join(', ')));
onKey('g', actions.play);
onKey('x', () => { if (pursuit.active) return; car.siren = !car.siren; audio.setSiren(car.siren); hud.toast(car.siren ? 'Siren on' : 'Siren off'); });
// audio: siren tone (auto / wail / yelp / hi-lo)
onKey('z', () => { const m = audio.cycleSirenTone(); hud.toast(`Siren tone: ${{ auto: 'auto (wail / yelp)', wail: 'wail', yelp: 'yelp', hilo: 'hi-lo' }[m]}`); });
onKey('h', () => hud.togglePanel('help'));
onKey('t', () => hud.togglePanel('places'));
onKey('escape', () => { hud.togglePanel(null); worldMap.close(); if (gameUI.playOpen) gameUI.togglePlay(false); });
onKey('f', () => hud.toggleFps());
onKey('backspace', respawnNearRoad);
siteKeys.forEach((k, i) => onKey(String(i + 1), () => { teleportTo(k); hud.togglePanel(null); }));
applyMode();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  pipeline.setSize(window.innerWidth, window.innerHeight);
});

// ---------- loop ----------
const timer = new THREE.Timer();
let slowTime = 0, fastTime = 0, rideY = 0;
let frameNo = 0;
const prof = { car: 0, traffic: 0, people: 0, other: 0, render: 0, n: 0 };
const focus = new THREE.Vector3(), viewDir = new THREE.Vector3();
function frame() {
  timer.update();
  const rawDt = timer.getDelta();
  // the world pauses while the map is open
  const dt = worldMap.isOpen ? 0 : Math.min(rawDt, 0.05);
  time += dt;

  const tp0 = performance.now();
  updateInput(dt);
  car.update(dt, frozen ? { throttle: 0, brake: 1, steer: 0, handbrake: true } : input);
  pursuit.update(dt);
  trial.update(dt);
  garda.update(time, car.siren);
  // brake lamps while slowing under braking, reversing lamps when backing up
  if (carMesh.userData.setBrake) { carMesh.userData.setBrake(input.brake > 0 && car.speed > 0.3); carMesh.userData.setReverse(car.speed < -0.3); }
  if (isOverWater(car.pos.x, car.pos.z)) respawnNearRoad();
  const tp1 = performance.now();
  traffic.update(dt, camera);
  const tp2 = performance.now();
  tram.update(dt, car.pos);
  signals.update(dt);
  const tp3 = performance.now();
  people.update(dt, car.pos, car);
  const tp4 = performance.now();
  // ride up onto the raised pavement
  rideY += ((car.surface === 'road' ? 0 : KERB_H) - rideY) * Math.min(1, dt * 18);
  carMesh.position.set(car.pos.x, rideY + car.bump * 0.12, car.pos.z);
  carMesh.rotation.set(car.pitch, car.heading, car.roll);
  carMesh.userData.update(car.speed, dt, car.steer * 0.5);
  playerContact.set(0, car.pos.x, rideY, car.pos.z, car.heading, 2.5, 5.3); playerContact.commit();
  rig.update(dt, car, carMesh);
  focus.set(car.pos.x, 0, car.pos.z);
  ground.update(dt, time);
  // the city gets wet over a few seconds when rain starts and dries more slowly
  if (wetNow !== wetTarget) {
    const rate = wetTarget > wetNow ? 0.35 : 0.12;
    wetNow = wetTarget > wetNow ? Math.min(wetTarget, wetNow + rate * dt) : Math.max(wetTarget, wetNow - rate * dt);
    setWet(wetNow); buildingUniforms.uWet.value = wetNow; lamps.setWet(wetNow);
  }
  camera.getWorldDirection(viewDir); viewDir.y = 0; viewDir.normalize();
  atmosphere.update(dt, time, focus, viewDir);
  landmarks.update(camera);
  waterGlow.update(camera);
  lamps.update(dt, focus);
  rain.update(dt, time, camera);
  hud.update(dt, { car, traffic, tram });
  // audio reads the city state it needs (weather, traffic, tram) rather than being called from those modules
  audio.update(car, input, { rain: mode.rain, night: mode.evening, traffic: traffic.list, tram, paused: worldMap.isOpen });

  const tp5 = performance.now();
  // shadow map every frame: with half-rate updates the car's own shadow lagged and jittered at speed
  renderer.shadowMap.needsUpdate = true;
  pipeline.render(dt);
  const tp6 = performance.now();
  prof.car += tp1 - tp0; prof.traffic += tp2 - tp1; prof.people += tp4 - tp3; prof.other += tp5 - tp4; prof.render += tp6 - tp5; prof.n++;

  // adaptive resolution: drop pixel ratio if we're persistently slow, restore when there's headroom
  // (ignores the first seconds and one-off hitches such as shader compiles after a mode switch)
  if (time < 4 || time - lastSwitch < 2.5 || rawDt > 0.2) { /* skip */ } else if (rawDt > 1 / 45) { slowTime += rawDt; fastTime = 0; } else if (rawDt < 1 / 58) { fastTime += rawDt; slowTime = Math.max(0, slowTime - rawDt); }
  // step down: high -> medium -> low (phones start at low), then resolution; step back up in reverse
  const setQ = (q) => { pipeline.setQuality(q); pipeline.setMood(mode); lastSwitch = time; slowTime = fastTime = 0; };
  if (slowTime > 1.5) {
    if (!userQuality && pipeline.quality === 'high') { failed.high = true; setQ('medium'); }
    else if (!userQuality && pipeline.quality === 'medium') { failed.medium = true; setQ('low'); }
    else if (dpr > 0.7) { dpr = Math.max(0.7, dpr - 0.25); renderer.setPixelRatio(dpr); pipeline.setPixelRatio(); slowTime = 0; }
  } else if (fastTime > 6) {
    if (dpr < maxDpr) { dpr = Math.min(maxDpr, dpr + 0.25); renderer.setPixelRatio(dpr); pipeline.setPixelRatio(); fastTime = 0; }
    else if (!userQuality && !IS_MOBILE && pipeline.quality === 'low' && !failed.medium) setQ('medium');
    else if (!userQuality && !IS_MOBILE && pipeline.quality === 'medium' && !failed.high) setQ('high');
  }

  requestAnimationFrame(frame);
}
console.log('texture quality', JSON.stringify(applyTextureQuality(scene, renderer)));
// Compile every shader before the first frame. On Windows, Chrome translates each program through Direct3D, and
// compiling ~100 of them synchronously inside the first render froze the page for 15+ s on a cold cache.
// compileAsync hands them to the driver in parallel (KHR_parallel_shader_compile) and keeps the page responsive
// behind the loading screen; if it isn't available the first frame simply compiles as before.
const loadingText = document.querySelector('#loading p');
if (loadingText) loadingText.textContent = 'Preparing shaders…';
const tc = performance.now();
// wait (briefly) for the player's car and the trees too, so their shaders join the batch instead of stalling a
// frame just after the loading screen lifts
const settle = (p, ms) => Promise.race([p.catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
settle(Promise.all([carReady, treesReady]), 8000).then(() => {
  renderer.setRenderTarget(pipeline.sceneTarget);
  return renderer.compileAsync ? renderer.compileAsync(scene, camera) : null;
}).catch(() => {}).then(() => {
  renderer.setRenderTarget(null);
  console.log(`shaders compiled in ${Math.round(performance.now() - tc)} ms`);
  const tf = performance.now();
  frame();
  console.log(`first frame took ${Math.round(performance.now() - tf)} ms`);
  document.getElementById('loading').classList.add('gone');
  window.__dublin.ready = true;
});
setTimeout(() => hud.toast(IS_MOBILE ? 'Tap ? for help' : 'Press H for controls, T for landmarks', 4500), 600);

// hooks for the headless smoke test
window.__dublin = {
  ready: false, // set once shaders are compiled and the first frame has drawn
  THREE, scene, camera, world, carMesh: () => carMesh, renderer, pipeline, groundAOUniforms, atmosphere, car, input, rig, traffic, tram, people, pursuit, trial, gameUI, buildings, landmarks, sites, teleportTo, actions, mode, audio,
  lockQuality(q, d) { userQuality = true; dpr = d; renderer.setPixelRatio(d); pipeline.setQuality(q); pipeline.setMood(mode); slowTime = fastTime = 0; lastSwitch = time + 1e9; },
  profile() { const o = {}; for (const k of Object.keys(prof)) if (k !== 'n') o[k] = +(prof[k] / Math.max(1, prof.n)).toFixed(2); for (const k of Object.keys(prof)) prof[k] = 0; return o; },
  stats: () => ({ ...renderer.info.render, dpr, segments: segmentCount(), car: { ...car.pos, speed: car.speed, street: car.street && car.street.name } }),
};

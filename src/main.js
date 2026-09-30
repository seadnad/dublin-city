import * as THREE from 'three';
import { world, v2, laneOffset, pointInPolygon } from './world/geo.js';
import { buildGround, isOverWater, setWet, WATER_Y, dockPolys } from './world/ground.js';
import { createAtmosphere, fogAirBlend, fogHeightTerm } from './world/atmosphere.js';
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
import { input, updateInput, onKey, buildTouchControls, pad, readPad, setInputMode } from './game/input.js';
import { createPhotoMode } from './game/photo.js';
import { CameraRig } from './game/camera.js';
import { createTraffic } from './game/traffic.js';
import { createLuas, buildLuasStops } from './game/luas.js';
import { setStopNight } from './game/luasStop.js';
import { createDart } from './game/dart.js';
import { createPeople } from './game/people.js';
import { graftonPeople } from './world/graftonquarter.js';
import { audio } from './game/audio.js';
import { createHUD } from './ui/hud.js';
import { createWorldMap } from './ui/worldmap.js';
import { createGameUI, save } from './ui/gameui.js';
import { createPursuit } from './game/modes/pursuit.js';
import { createTrial } from './game/modes/trial.js';
import { addGardaKit } from './game/garda.js';
import { loadCar } from './game/models.js';
import { CARS, paintFor } from './game/carlist.js';
import { loadTrees } from './world/trees.js';
import { createPipeline } from './render/pipeline.js';
import { batchStatic } from './render/batch.js';
import { cullInstances, installShadowOnly, setViewCut } from './world/chunks.js';
import { createFarView } from './world/farview.js';
import { profile, LITE, mode as gfxModeNow, setMode as setGfxMode, learn as learnGfx, forget as forgetGfx, MODES as GFX_MODES, MODE_NAMES as GFX_NAMES, GPU, WEAK_GPU } from './render/quality.js';
import { applyTextureQuality } from './render/texquality.js';
import { createContactShadows } from './render/contact.js';
import { bakeGroundAO, groundAOUniforms } from './render/groundao.js';
import { bakeLampLight, lampUniforms } from './render/lamplight.js';
import { reserved as landmarkFootprints } from './world/sites.js';
import { KERB_H } from './world/roads.js';
import { Heli, loadHeli, MAX_ALT } from './game/heli.js';
import { captureHeightmap } from './game/heightmap.js';

const canvas = document.getElementById('scene');
// ---- renderer baseline (three r186) ----
// MSAA on for every device: phones render straight to the screen, so this is their only anti-aliasing.
// Tile-based mobile GPUs resolve MSAA on-chip, which keeps it cheap at our capped pixel ratio.
THREE.ColorManagement.enabled = true; // colours given in sRGB (hex, CSS) are converted to linear for lighting
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
// pixel ratio and pipeline tier come from the graphics setting (render/quality.js): Auto starts phones and integrated
// GPUs on the phone settings, and the adaptive loop below steps down quickly if frames still run long
let maxDpr = profile.maxDpr;
let dpr = profile.startDpr ?? maxDpr;
console.log('graphics', JSON.stringify({ mode: gfxModeNow, ...profile, gpu: GPU, weak: WEAK_GPU }));
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
installShadowOnly(renderer); // shadow-only instanced meshes (trees culled for the shadow map: world/chunks.js)
// ACES Filmic: filmic highlight roll-off (whites and sky don't clip) and stronger mid-tone contrast.
// Exposure is set per weather / time-of-day preset in atmosphere.js.
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
// lite profile: 500 m view distance (fewer draw calls on the busy quays; draw-call overhead is what limits
// integrated-GPU laptops, not pixels), with slightly thicker fog so the edge doesn't pop
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.4, LITE ? 500 : 950);

// ---------- world ----------
// The aerial intro (boot.js) keeps animating while this builds: report progress and give it a frame between steps.
const intro = window.__intro || null;
const nextFrame = () => new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(go); setTimeout(go, 60); });
const step = async (frac, text) => { if (!intro) return; intro.progress(frac, text); await nextFrame(); };
const t0 = performance.now();
const atmosphere = createAtmosphere(scene, renderer);
const ground = buildGround(scene);
const start = laneSpot(world.nodes.get('NQ8').edges.find((e) => e.to.id === 'OC1'), 0.2);
await step(0.62, 'Raising the buildings…');
const buildings = buildBuildings(scene);
{ const t = performance.now(); bakeGroundAO([...buildings.lots, ...landmarkFootprints], world.bounds); console.log(`ground AO baked in ${Math.round(performance.now() - t)} ms`); }
await step(0.68, 'Placing the landmarks…');
const landmarks = buildLandmarks(scene, { start });
{
  const t = performance.now();
  const b = batchStatic(scene, [...landmarks.groups, ...ground.group.children.filter((c) => c.isGroup)], { name: 'landmarks (batched)' });
  console.log(`static batch: ${b.before} meshes -> ${b.after} in ${Math.round(performance.now() - t)} ms`);
}
await step(0.72, 'Lighting the streets…');
const lamps = buildLamps(scene);
// the Phoenix Park gas lamps light the ground (baked) and borrow the nearest-lamp point lights like the city's
if (landmarks.park) lamps.spots.push(...landmarks.park.lampSpots);
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
await step(0.76, 'Setting out the furniture…');
const rain = buildRain(scene);
const furniture = buildFurniture(scene);
buildLuasStops(scene, world.luasLines); // the Luas stops belong to the static city (height field, far view)
const signals = createSignals(scene);
console.log('furniture', JSON.stringify(furniture), 'signal heads', signals.count);
const worldRoots = new Set(scene.children); // the static city (the helicopter's height field is drawn from these)
// beyond the main far plane: the sky, the Poolbeg chimneys and, from the air, the whole city, the bay and the hills
const far = createFarView({ renderer, atmosphere, buildings, landmarks, lite: LITE });
scene.add(far.apron);
// renderer.info counts every pass of a frame (the far view, the city, post-processing), reset once a frame
renderer.info.autoReset = false;
console.log(`world built in ${Math.round(performance.now() - t0)} ms: ${buildings.count} buildings, ${lamps.count} lamps, ${landmarks.trees} trees, ${segmentCount()} collision segments`);

// ---------- player ----------
function laneSpot(edge, t) {
  const d = v2.norm(v2.sub(edge.to, edge.from));
  const off = laneOffset(edge.way);
  const p = v2.lerp(edge.from, edge.to, t);
  return { x: p.x + d.z * off, z: p.z - d.x * off, heading: Math.atan2(d.x, d.z) };
}
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
await step(0.8, 'Starting the traffic…');
const trafficStart = performance.now();
const traffic = createTraffic(scene, LITE ? { cars: 12, buses: 3, taxis: 3, parked: 120 } : { cars: 26, buses: 6, taxis: 5, parked: 320 });
console.log(`traffic built in ${Math.round(performance.now() - trafficStart)} ms`);
const tram = createLuas(scene, world.luasLines);
tram.camera = camera; // trams out of view draw nothing
const dart = createDart(scene); // the DART on the Loop Line viaduct (no collision: it runs overhead)
// (plus the Grafton quarter's buskers, their crowds, the flower sellers and the café tables, who stay put)
const people = createPeople(scene, { count: LITE ? 110 : 300, fixed: graftonPeople() });
// everything added since the world was built moves (player, traffic, trams, people): not part of the height field
const dynamicRoots = scene.children.filter((c) => !worldRoots.has(c));
const farSkip = new Set([...dynamicRoots, rain.mesh].filter(Boolean)); // left out of the far view's captures
far.attach(scene, farSkip, () => pipeline.sceneTarget);
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
  far.sync();
  const p = atmosphere.state.values;
  wetTarget = p.wet;
  buildingUniforms.uNight.value = p.windows;

  lamps.setLevel(p.lamps);
  landmarks.setNight(mode.evening ? p.lamps : 0);
  setStopNight(mode.evening ? p.lamps : 0);
  dart.setNight(mode.evening ? p.lamps : 0);
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
  if (flying) { heli.place(v.x, groundAt(v.x, v.z) + 40, v.z, v.heading); heli.rpm = 1; heli.landed = false; }
  rig.snap();
  hud.toast(sites[key].name);
}
const actions = {
  rain: () => { mode.rain = !mode.rain; applyMode(); hud.toast(mode.rain ? 'Rain' : 'Dry'); },
  evening: () => { mode.evening = !mode.evening; applyMode(); hud.toast(mode.evening ? 'Night' : 'Daytime'); },
  camera: () => { rig.toggle(); hud.toast(flying ? (rig.mode === 'chase' ? 'Near camera' : 'Far camera') : rig.mode === 'chase' ? 'Chase camera' : 'Bonnet camera'); },
  sound: () => { const on = audio.toggle(); hud.setOn('sound', on); hud.toast(on ? 'Sound on' : 'Sound off'); },
  teleport: teleportTo,
  map: () => worldMap.toggle(),
  play: () => gameUI.togglePlay(),
};
const hud = createHUD({ sites, actions });
// photo mode: free camera, frozen (or live) world, the HUD hidden
const hudEl = document.getElementById('hud');
const photo = createPhotoMode({
  camera, canvas: renderer.domElement, getPad: readPad,
  onEnter: () => { hudEl.classList.add('photo-hidden'); far.prepare(); },
  onExit: () => { hudEl.classList.remove('photo-hidden'); carMesh.visible = true; camera.fov = 62; camera.updateProjectionMatrix(); rig.snap(); },
});
actions.photo = () => { if (photo.active) photo.exit(); else if (!flight && !worldMap.isOpen) photo.enter(flying ? { x: heli.pos.x, y: heli.pos.y + 1.6, z: heli.pos.z } : car.pos); };
onKey('p', actions.photo);
const pipeline = createPipeline(renderer, scene, camera, { quality: profile.tier, far });
const failed = { high: false, medium: false };
let userQuality = gfxModeNow !== 'auto', fpsCap = profile.fpsCap, gfxMode = gfxModeNow;
// switch graphics mode live (tier and resolution now; crowd counts and shadow size from the next load)
function applyGfx(m) {
  const p = setGfxMode(m);
  gfxMode = m; userQuality = m !== 'auto'; fpsCap = p.fpsCap;
  if (m === 'auto') { forgetGfx(); failed.high = failed.medium = false; }
  maxDpr = p.maxDpr; dpr = p.startDpr ?? maxDpr;
  renderer.setPixelRatio(dpr); pipeline.setQuality(p.tier); pipeline.setMood(mode); pipeline.setPixelRatio();
  lastSwitch = time; slowTime = fastTime = 0;
  const reload = p.lite !== LITE ? ' (reload for the full effect)' : '';
  hud.toast(`Graphics: ${GFX_NAMES[m]}${reload}`);
}
actions.gfx = applyGfx;
onKey('q', () => applyGfx(GFX_MODES[(GFX_MODES.indexOf(gfxMode) + 1) % GFX_MODES.length]));
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
// intro descent: blends from the aerial intro's camera pose into the chase rig's pose, eased, then hands over
let flight = null;
const flightQ = new THREE.Quaternion();
function applyFlight() {
  // wall-clock, so a slow first few frames (late shader work) never stretch the descent
  flight.t = flight.skip ? 1 : Math.min(1, (performance.now() - flight.start) / (flight.dur * 1000));
  const t = flight.t, e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  // position eases in a little later than rotation, so the view tips down toward the car before closing in
  const ep = Math.min(1, e * e * (3 - 2 * e));
  camera.position.lerpVectors(flight.pos, camera.position, ep);
  flightQ.copy(flight.quat).slerp(camera.quaternion, e);
  camera.quaternion.copy(flightQ);
  camera.fov = flight.fov + (62 - flight.fov) * e; camera.updateProjectionMatrix();
  if (t >= 1) { flight = null; frozen = false; document.getElementById('hud').classList.remove('intro-hidden'); camera.fov = 62; camera.updateProjectionMatrix(); window.__dublin.ready = true; }
}
const gameUI = createGameUI({
  gfx: { modes: GFX_MODES, names: GFX_NAMES, get: () => gfxMode, set: (m) => applyGfx(m) },
  onPursuit: () => { trial.stop(); pursuit.start(); },
  onTrial: (r) => { pursuit.stop(); exitHeli(); trial.start(r); rig.snap(); },
  onFree: () => { pursuit.stop(); trial.stop(); hud.toast('Free roam'); },
  onCar: (name) => actions.car(name),
  // paint choice for the current car (saved per car; applied now if that car is on the road)
  onPaint: (name, id) => {
    save.set(`paint.${name}`, id);
    const p = paintFor(name, id);
    if (p && carMesh.userData.model === name && carMesh.userData.setPaint) carMesh.userData.setPaint(p);
  },
  flying: () => flying || heliBusy,
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
// swap the player's car for a loaded model: 'garda' (default), 'garda_rp', 'hatch' or 'gt'
async function useCar(name) {
  const m = await loadCar(name);
  if (!m) return;
  car.setProfile(name); // handling (car.js CAR_PROFILES) and engine voice follow the model
  audio.setCar(name);
  const paint = paintFor(name, save.get(`paint.${name}`, null));
  if (paint) m.userData.setPaint(paint);
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
const CAR_NAMES = Object.fromEntries(Object.entries(CARS).map(([k, c]) => [k, c.name]));
actions.car = (name) => {
  if (name === 'heli') { enterHeli(); return; }
  exitHeli();
  useCar(name); hud.toast(CAR_NAMES[name] || name);
};
loadCar('coupe').then((m) => { suspectModel = m; });
const treesReady = loadTrees().then((s) => console.log('trees loaded:', s.join(', ')));
// ---------- Garda Air Support Unit helicopter ----------
// Switching lifts off from where the car is; switching back puts the car on the nearest road below. The car stays
// in the scene with its bodywork hidden (its lights keep the scene's light count, so no shader recompiles), and its
// position follows the helicopter so traffic recycling, people, the minimap and the pursuit all track the player.
const heli = new Heli();
let heliVis = null, heightField = null, flying = false, heliBusy = false, beamPref = null;
let districtLoading = null;
function startDistrictStreaming() {
  if (!LITE) return Promise.resolve();
  if (!districtLoading) districtLoading = landmarks.streamDistricts(renderer, camera, () => pipeline.sceneTarget,
    () => ({ x: car.pos.x, z: car.pos.z, heading: car.heading, speed: car.speed }),
    () => far.refreshHeroes()).catch((e) => console.warn('district streaming stopped', e));
  return districtLoading;
}
const heliEnv = { hm: null, bounds: world.bounds, overWater: isOverWater, waterY: WATER_Y };
const NO_STICK = { pitch: 0, roll: 0, yaw: 0, lift: 0 };
const BASE_FAR = camera.far;
const headlightDefaults = { angle: headlight.angle, penumbra: headlight.penumbra, decay: headlight.decay };
const groundAt = (x, z) => (heightField ? heightField.at(x, z) : 0);
function setCarBodyVisible(v) { for (const c of carMesh.children) if (!c.isLight && c !== headlight.target) c.visible = v; }
async function enterHeli() {
  if (flying || heliBusy) return;
  heliBusy = true;
  // The helicopter's height field is captured once from visible buildings. Finish any
  // queued models first so a late roof cannot appear above that collision surface.
  if (LITE && landmarks.pendingDistricts) { hud.toast('Preparing the city for flight', 3500); await startDistrictStreaming(); }
  far.prepare(); // the far view builds in the background while the rotor spins up
  if (!heliVis) {
    heliVis = await loadHeli();
    if (!heliVis) { heliBusy = false; hud.toast('Helicopter unavailable'); return; }
    // compile its shaders off the main thread where the driver allows, before the first frame that draws it
    const probe = new THREE.Group(); probe.add(heliVis.group, heliVis.beam); heliVis.beam.visible = true;
    renderer.setRenderTarget(pipeline.sceneTarget);
    try { if (renderer.compileAsync) await renderer.compileAsync(probe, camera, scene); } catch { /* compiles on first draw instead */ }
    renderer.setRenderTarget(null);
    probe.remove(heliVis.group, heliVis.beam); heliVis.beam.visible = false;
  }
  if (!heightField) {
    heightField = captureHeightmap(renderer, scene, world.bounds, {
      skip: new Set([...dynamicRoots, carMesh, heliVis.group, heliVis.beam, ...(suspectModel ? [suspectModel] : [])]),
      // the Spire's needle is thinner than a cell near the top: a column for it
      extra: [{ x: sites.spire.x, z: sites.spire.z, r: 1.5, h: 121 }],
    });
    heliEnv.hm = heightField;
  }
  if (trial.active) trial.stop();
  car.siren = false; audio.setSiren(false);
  heli.place(car.pos.x, heightField.maxIn(car.pos.x, car.pos.z, 1.7), car.pos.z, car.heading);
  scene.add(heliVis.group, heliVis.beam);
  farSkip.add(heliVis.group); farSkip.add(heliVis.beam);
  setCarBodyVisible(false);
  // the car's headlight becomes the searchlight (one light either way: no shader recompiles)
  heliVis.searchlight.add(headlight, headlight.target);
  headlight.position.set(0, 0, 0);
  Object.assign(headlight, { angle: 0.13, penumbra: 0.45, decay: 1.1, distance: 420 });
  flying = true; heliBusy = false; car.airborne = true;
  heliVis.setNight(atmosphere.state.values.lamps);
  setInputMode('heli');
  rig.mode = 'chase'; rig.snap();
  hud.toast('Garda Air Support Unit: Space to climb, W A S D to fly', 3500);
}
function exitHeli() {
  if (!flying) return;
  flying = false; car.airborne = false;
  scene.remove(heliVis.group, heliVis.beam);
  setCarBodyVisible(true);
  carMesh.add(headlight, headlight.target);
  headlight.position.set(0, 0.8, 2.2); headlight.target.position.set(0, 0, 14);
  Object.assign(headlight, headlightDefaults);
  applyMode(); // headlight intensity and distance for the car
  car.pos.x = heli.pos.x; car.pos.z = heli.pos.z; car.heading = heli.heading;
  respawnNearRoad();
  setInputMode('car');
  heliVis.aimBeam(false);
}
actions.heli = () => { if (flying) { exitHeli(); hud.toast(CAR_NAMES[save.get('car', 'garda')] || 'Car'); } else enterHeli(); };
onKey('l', actions.heli);
const beamTarget = new THREE.Vector3(), beamFrom = new THREE.Vector3();
// the searchlight: ahead and below the nose, or on the suspect during a pursuit; marched along the height field
function updateHeliBeam() {
  const auto = mode.evening ? 1 : mode.rain ? 0.35 : 0;
  const level = beamPref === null ? auto : beamPref ? Math.max(auto, 0.6) : 0;
  heliVis.searchlight.getWorldPosition(beamFrom);
  let dx = Math.sin(heli.heading) * 0.8, dz = Math.cos(heli.heading) * 0.8, dy = -0.6;
  const blip = pursuit.active && pursuit.blips()[0];
  if (blip && Math.hypot(blip.x - beamFrom.x, blip.z - beamFrom.z) < 320) {
    dx = blip.x - beamFrom.x; dz = blip.z - beamFrom.z; dy = groundAt(blip.x, blip.z) + 0.8 - beamFrom.y;
  }
  const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
  let t = 4;
  for (; t < 420; t += 3) if (beamFrom.y + dy * t <= groundAt(beamFrom.x + dx * t, beamFrom.z + dz * t)) break;
  beamTarget.set(beamFrom.x + dx * t, beamFrom.y + dy * t, beamFrom.z + dz * t);
  heliVis.aimBeam(level > 0, beamTarget, level);
  headlight.intensity = level * 900; headlight.distance = 420;
  heliVis.setNight(atmosphere.state.values.lamps);
  headlight.target.position.copy(heliVis.searchlight.worldToLocal(beamTarget.clone()));
}
// View with height (the helicopter and the photo camera): the detailed city's far plane reaches a little further
// (up to +50 % at the ceiling) and the far view (world/farview.js) carries on beyond it to the bay and the
// mountains; the haze thins from the street's wall of fog to a gentle exponential falloff (half-way to the fog
// colour at `haze` metres from 250 m up), and the shadowed area widens (fading out at its edge).
const heliTune = { far: 0.5, shadow: LITE ? 0.8 : 1.2, haze: 4500 }; // (the perf scenarios vary these)
let viewAir = false;
function updateView() {
  const camY = camera.position.y;
  if (!(flying || photo.active) || camY < 12) {
    if (viewAir) {
      viewAir = false;
      camera.far = BASE_FAR; camera.updateProjectionMatrix();
      atmosphere.setShadowExtent(0); atmosphere.setFogScale(1); setViewCut(0); far.setTreeCut(0);
    }
    return;
  }
  viewAir = true;
  const alt = THREE.MathUtils.clamp(camY, 0, MAX_ALT);
  const farNow = BASE_FAR * (1 + (alt / MAX_ALT) * heliTune.far);
  if (Math.abs(camera.far - farNow) > 5) { camera.far = farNow; camera.updateProjectionMatrix(); }
  // fog: the distance at which it is half-way (on the ground below), from the street's to the aerial one; the
  // density that gives it under the shader's blend of exp2 and exp (atmosphere.js fog_fragment)
  const hf = fogHeightTerm(camY), a = fogAirBlend(camY), LN2 = Math.LN2;
  const half0 = Math.sqrt(LN2) / (atmosphere.fogDensity * hf);
  const haze = heliTune.haze * (0.0024 / atmosphere.state.values.fogDensity) ** 0.7; // thicker in the rain (the presets' own haze)
  const half = half0 + (Math.max(half0, haze) - half0) * THREE.MathUtils.smoothstep(camY, 12, 220);
  const x = a >= 0.999 ? LN2 : (-a + Math.sqrt(a * a + 4 * (1 - a) * LN2)) / (2 * (1 - a));
  atmosphere.setFogScale(x / (half * hf * atmosphere.fogDensity));
  atmosphere.setShadowExtent(60 + alt * heliTune.shadow);
  // Low / Battery saver: the modelled trees (1-2.5k triangles each) within 400 m, blobs beyond
  const cut = LITE ? 400 : 0;
  setViewCut(far.setTreeCut(cut) ? cut : 0);
}
onKey('g', actions.play);
onKey('x', () => {
  if (flying) { const on = beamPref === null ? !(mode.evening || mode.rain) : !beamPref; beamPref = on; hud.toast(on ? 'Searchlight on' : 'Searchlight off'); return; }
  if (pursuit.active) return; car.siren = !car.siren; audio.setSiren(car.siren); hud.toast(car.siren ? 'Siren on' : 'Siren off'); });
// audio: siren tone (auto / wail / yelp / hi-lo)
onKey('z', () => { const m = audio.cycleSirenTone(); hud.toast(`Siren tone: ${{ auto: 'auto (wail / yelp)', wail: 'wail', yelp: 'yelp', hilo: 'hi-lo' }[m]}`); });
onKey('h', () => hud.togglePanel('help'));
pad.onConnect = (name) => hud.toast(`Controller connected: ${/xbox|xinput/i.test(name) ? 'Xbox' : /054c|dualshock|dualsense|playstation/i.test(name) ? 'PlayStation' : 'gamepad'}`);
onKey('t', () => hud.togglePanel('places'));
onKey('escape', () => { hud.togglePanel(null); worldMap.close(); if (gameUI.playOpen) gameUI.togglePlay(false); });
onKey('f', () => hud.toggleFps());
onKey('backspace', () => { if (!flying) respawnNearRoad(); });
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
let lastFrameAt = 0, learnT = 0;
function frame() {
  // Battery saver: cap the frame rate (skip whole frames, so the CPU and GPU both rest)
  if (fpsCap) {
    const now = performance.now();
    if (now - lastFrameAt < 1000 / fpsCap - 2) { requestAnimationFrame(frame); return; }
    lastFrameAt = now;
  }
  timer.update();
  const rawDt = timer.getDelta();
  // the world pauses while the map is open
  const still = worldMap.isOpen || (photo.active && !photo.live);
  const dt = still ? 0 : Math.min(rawDt, 0.05);
  time += dt;

  const tp0 = performance.now();
  updateInput(dt);
  const held = frozen || photo.active;
  if (flying) {
    heli.update(dt, held ? NO_STICK : input.heli, heliEnv);
    // the (hidden) car follows, for everything that tracks the player
    car.pos.x = heli.pos.x; car.pos.z = heli.pos.z; car.heading = heli.heading; car.hold();
    car.airborne = heli.pos.y > 2.5; // traffic stops for it only while it sits in the street
  } else {
    if (held) car.hold();
    car.update(dt, held ? { throttle: 0, brake: 0, steer: 0, handbrake: true } : input);
    if (held) car.hold();
  }
  pursuit.update(dt);
  trial.update(dt);
  garda.update(time, car.siren && !flying);
  if (flying && car.siren) { car.siren = false; audio.setSiren(false); } // no siren in the air (a pursuit switches it on)
  // brake lamps while slowing under braking, reversing lamps when backing up
  if (carMesh.userData.setBrake) { carMesh.userData.setBrake(input.brake > 0 && car.speed > 0.3); carMesh.userData.setReverse(car.speed < -0.3); }
  if (!flying && isOverWater(car.pos.x, car.pos.z)) respawnNearRoad();
  const tp1 = performance.now();
  traffic.update(dt, camera);
  const tp2 = performance.now();
  tram.update(dt, car.pos);
  dart.update(dt);
  signals.update(dt);
  const tp3 = performance.now();
  people.update(dt, car.pos, car);
  const tp4 = performance.now();
  // ride up onto the raised pavement
  rideY += ((car.surface === 'road' ? 0 : KERB_H) - rideY) * Math.min(1, dt * 18);
  carMesh.position.set(car.pos.x, rideY + car.bump * 0.12, car.pos.z);
  carMesh.rotation.set(car.pitch, car.heading, car.roll);
  carMesh.userData.update(car.speed, dt, car.steer * 0.5);
  carMesh.visible = !photo.hideCar;
  if (flying) {
    const g = heliVis.group, a = Math.max(0, heli.alt), k = photo.hideCar || a > 25 ? 0.01 : 1 - a / 30;
    g.position.set(heli.pos.x, heli.pos.y, heli.pos.z);
    g.rotation.set(heli.pitch, heli.heading, heli.roll);
    g.visible = !photo.hideCar;
    heliVis.update(dt, heli.rpm);
    playerContact.set(0, heli.pos.x, heli.floor, heli.pos.z, heli.heading, 2.6 * k, 5 * k);
  } else playerContact.set(0, car.pos.x, rideY, car.pos.z, car.heading, photo.hideCar ? 0.01 : 2.5, photo.hideCar ? 0.01 : 5.3);
  playerContact.commit();
  if (photo.active) photo.update(Math.min(rawDt, 0.1));
  else if (flying) rig.updateHeli(dt, heli, groundAt);
  else rig.update(dt, car, carMesh);
  if (flying) updateHeliBeam();
  updateView();
  if (flight) applyFlight();
  focus.set(car.pos.x, 0, car.pos.z);
  // per-instance culling now the camera has moved for this frame: parked cars, and trees (view and shadow map)
  traffic.cull(camera, focus);
  cullInstances(camera, atmosphere.sun.shadow.camera);
  ground.update(dt, time);
  // the city gets wet over a few seconds when rain starts and dries more slowly
  if (wetNow !== wetTarget) {
    const rate = wetTarget > wetNow ? 0.35 : 0.12;
    wetNow = wetTarget > wetNow ? Math.min(wetTarget, wetNow + rate * dt) : Math.max(wetTarget, wetNow - rate * dt);
    setWet(wetNow); buildingUniforms.uWet.value = wetNow; lamps.setWet(wetNow);
    far.setWet(wetNow);
    if (wetNow === wetTarget) far.wetSettled(); // recapture the ground wet (or dry) once it has settled
  }
  camera.getWorldDirection(viewDir); viewDir.y = 0; viewDir.normalize();
  atmosphere.update(dt, time, focus, viewDir);
  landmarks.update(camera);
  if (landmarks.park) landmarks.park.update(dt, time, car, camera);
  waterGlow.update(camera);
  lamps.update(dt, focus);
  rain.update(dt, time, camera);
  hud.update(dt, { car: flying ? heli : car, traffic, tram });
  // audio reads the city state it needs (weather, traffic, tram) rather than being called from those modules
  audio.update(car, input, { rain: mode.rain, night: mode.evening, traffic: traffic.list, tram, paused: still,
    heli: flying ? { on: true, rpm: heli.rpm, alt: heli.alt, load: Math.min(1, Math.abs(heli.vel.y) / 9 + (Math.abs(heli.pitch) + Math.abs(heli.roll)) * 1.5) } : null });

  const tp5 = performance.now();
  // shadow map every frame: with half-rate updates the car's own shadow lagged and jittered at speed.
  // Low / Battery saver, flying above 40 m: every other frame (the shadowed square is hundreds of metres across and
  // the view drifts slowly over it; the only moving shadows are specks)
  frameNo++;
  if (!(flying && heli.alt > 40 && pipeline.quality === 'low' && (frameNo & 1))) renderer.shadowMap.needsUpdate = true;
  far.update(camera, camera.far);
  renderer.info.reset();
  pipeline.render(dt);
  // photo snap: re-render this frame at a higher resolution and read it back before the browser presents it
  if (photo.wantsSnap) {
    const hi = Math.min(2, Math.max(dpr, window.devicePixelRatio));
    if (hi > dpr) { renderer.setPixelRatio(hi); pipeline.setPixelRatio(); renderer.shadowMap.needsUpdate = true; pipeline.render(0); }
    photo.capture();
    if (hi > dpr) { renderer.setPixelRatio(dpr); pipeline.setPixelRatio(); }
  }
  const tp6 = performance.now();
  prof.car += tp1 - tp0; prof.traffic += tp2 - tp1; prof.people += tp4 - tp3; prof.other += tp5 - tp4; prof.render += tp6 - tp5; prof.n++;

  // adaptive quality (Auto) and resolution (all modes but Battery saver). Very slow frames count too (capped): a
  // machine running at 3 fps used to be ignored as "one-off hitches" and never stepped down. The first second
  // after the intro and after each switch is skipped (shader compiles).
  const settled = !flight && time > 1.5 && time - lastSwitch > 1.0;
  const fdt = Math.min(rawDt, 0.25);
  // Auto on a light-profile device favours a sharp image at roughly 30 fps over a blurry
  // image at 45 fps. Explicit profiles keep their existing responsiveness target.
  const targetFps = !userQuality && LITE ? 30 : 45;
  if (!settled || worldMap.isOpen || photo.active || fpsCap) { /* skip */ }
  else if (fdt > 1 / targetFps) { slowTime += fdt * (fdt > 1 / 20 ? 2 : 1); fastTime = 0; }
  else if (fdt < 1 / (targetFps + 13)) { fastTime += fdt; slowTime = Math.max(0, slowTime - fdt); }
  const setQ = (q) => { pipeline.setQuality(q); pipeline.setMood(mode); lastSwitch = time; slowTime = fastTime = 0; };
  const setDpr = (v) => { dpr = v; renderer.setPixelRatio(dpr); pipeline.setPixelRatio(); lastSwitch = time; slowTime = fastTime = 0; };
  if (slowTime > 0.8) {
    // step down: high -> medium -> low, then resolution (a big step if frames are very slow)
    if (!userQuality && pipeline.quality === 'high') { failed.high = true; setQ('medium'); }
    else if (!userQuality && pipeline.quality === 'medium') { failed.medium = true; setQ('low'); }
    else {
      const minDpr = !userQuality ? Math.min(maxDpr, IS_MOBILE ? 1 : 0.8) : 0.6;
      if (dpr > minDpr) setDpr(Math.max(minDpr, dpr - (fdt > 1 / 20 ? 0.4 : 0.2)));
    }
  } else if (fastTime > 6) {
    if (dpr < maxDpr) setDpr(Math.min(maxDpr, dpr + 0.2));
    else if (!userQuality && pipeline.quality === 'low' && !failed.medium && !LITE) setQ('medium');
    else if (!userQuality && pipeline.quality === 'medium' && !failed.high) setQ('high');
  }
  // Auto remembers where it settled, so the next visit starts there instead of learning again
  if (!userQuality && settled && (learnT += fdt) > 10) { learnT = 0; learnGfx(pipeline.quality, dpr); }

  requestAnimationFrame(frame);
}
console.log('texture quality', JSON.stringify(applyTextureQuality(scene, renderer)));
// Compile every shader before the first frame. On Windows, Chrome translates each program through Direct3D, and
// compiling ~100 of them synchronously inside the first render froze the page for 15+ s on a cold cache.
// compileAsync hands them to the driver in parallel (KHR_parallel_shader_compile) and keeps the page responsive
// behind the loading screen; if it isn't available the first frame simply compiles as before.
const loadingText = document.querySelector('#loading p');
if (loadingText) loadingText.textContent = 'Preparing shaders…';
if (intro) intro.progress(0.86, 'Preparing shaders…');
const tc = performance.now();
// wait (briefly) for the player's car and the trees too, so their shaders join the batch instead of stalling a
// frame just after the loading screen lifts
const settle = (p, ms) => Promise.race([p.catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
settle(Promise.all([carReady, treesReady]), 8000).then(() => {
  renderer.setRenderTarget(pipeline.sceneTarget);
  return renderer.compileAsync ? Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(far.scene, far.camera)]) : null;
}).catch(() => {}).then(() => {
  renderer.setRenderTarget(null);
  console.log(`shaders compiled in ${Math.round(performance.now() - tc)} ms`);
  const tf = performance.now();
  frame();
  console.log(`first frame took ${Math.round(performance.now() - tf)} ms`);
  if (LITE) setTimeout(startDistrictStreaming, 2500);
  document.getElementById('loading').classList.add('gone');
  if (!intro) { window.__dublin.ready = true; return; }
  // the aerial view pans to the start, then the real camera descends from that pose to the chase view
  intro.progress(1, 'Ready');
  frozen = true;
  document.getElementById('hud').classList.add('intro-hidden');
  intro.panTo({ x: car.pos.x, z: car.pos.z, heading: car.heading }).then(() => {
    const p = intro.pose();
    flight = { t: 0, skip: intro.skip(), start: performance.now(), dur: 2.6, pos: p.position, quat: p.quaternion, fov: p.fov };
    intro.finish(intro.skip() ? 250 : 1100);
  });
});
setTimeout(() => hud.toast(IS_MOBILE ? 'Tap ? for help' : 'Press H for controls, T for landmarks', 4500), 600);

// hooks for the headless smoke test
window.__dublin = {
  photo, far,
  ready: false, // set once shaders are compiled and the first frame has drawn
  heli, heliState: () => ({ flying, x: +heli.pos.x.toFixed(1), y: +heli.pos.y.toFixed(1), z: +heli.pos.z.toFixed(1), alt: +heli.alt.toFixed(1), speed: +heli.speed.toFixed(1), heading: +heli.heading.toFixed(2), rpm: +heli.rpm.toFixed(2), landed: heli.landed, floor: +heli.floor.toFixed(1), hm: heightField ? { W: heightField.W, H: heightField.H, cell: +heightField.cell.toFixed(2), ms: heightField.ms } : null, shadowExt: atmosphere.shadowExtent, far: Math.round(camera.far), fog: +scene.fog.density.toFixed(5) }),
  groundAt: (x, z) => groundAt(x, z), heliTune, heliEnv,
  THREE, scene, camera, world, carMesh: () => carMesh, renderer, pipeline, groundAOUniforms, atmosphere, car, input, rig, traffic, tram, dart, people, pursuit, trial, gameUI, buildings, landmarks, sites, teleportTo, actions, mode, audio,
  gfx: () => ({ mode: gfxMode, tier: pipeline.quality, dpr, maxDpr, lite: LITE, fpsCap }),
  lockQuality(q, d) { userQuality = true; dpr = d; renderer.setPixelRatio(d); pipeline.setQuality(q); pipeline.setMood(mode); slowTime = fastTime = 0; lastSwitch = time + 1e9; },
  profile() { const o = {}; for (const k of Object.keys(prof)) if (k !== 'n') o[k] = +(prof[k] / Math.max(1, prof.n)).toFixed(2); for (const k of Object.keys(prof)) prof[k] = 0; return o; },
  stats: () => ({ ...renderer.info.render, dpr, segments: segmentCount(), car: { ...car.pos, speed: car.speed, street: car.street && car.street.name } }),
};

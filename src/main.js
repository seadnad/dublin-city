import * as THREE from 'three';
import { world, v2 } from './world/geo.js';
import { buildGround, isOverWater, setWet } from './world/ground.js';
import { createAtmosphere } from './world/atmosphere.js';
import { buildBuildings, buildingUniforms } from './world/buildings.js';
import { buildLandmarks, landmarkMaterials } from './world/landmarks.js';
import { buildLamps, buildRain } from './world/props.js';
import { sites } from './world/sites.js';
import { IS_MOBILE } from './world/textures.js';
import { segmentCount } from './game/collision.js';
import { Car } from './game/car.js';
import { makeCar, headMat, tailMat } from './game/vehicles.js';
import { input, updateInput, onKey, buildTouchControls } from './game/input.js';
import { CameraRig } from './game/camera.js';
import { createTraffic } from './game/traffic.js';
import { createLuas } from './game/luas.js';
import { audio } from './game/audio.js';
import { createHUD } from './ui/hud.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_MOBILE, powerPreference: 'high-performance' });
const maxDpr = Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2);
let dpr = maxDpr;
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 2500);

// ---------- world ----------
const t0 = performance.now();
const atmosphere = createAtmosphere(scene, renderer);
const ground = buildGround(scene);
const buildings = buildBuildings(scene);
const landmarks = buildLandmarks(scene);
const lamps = buildLamps(scene);
const rain = buildRain(scene);
console.log(`world built in ${Math.round(performance.now() - t0)} ms: ${buildings.count} buildings, ${lamps.count} lamps, ${landmarks.trees} trees, ${segmentCount()} collision segments`);

// ---------- player ----------
function laneSpot(edge, t) {
  const d = v2.norm(v2.sub(edge.to, edge.from));
  const off = edge.way.type === 'boulevard' ? 7 : edge.way.width / 4;
  const p = v2.lerp(edge.from, edge.to, t);
  return { x: p.x + d.z * off, z: p.z - d.x * off, heading: Math.atan2(d.x, d.z) };
}
const start = laneSpot(world.nodes.get('NQ8').edges.find((e) => e.to.id === 'OC1'), 0.2);
const car = new Car(start.x, start.z, start.heading);
const carMesh = makeCar({ color: 0x169b62 });
carMesh.rotation.order = 'YXZ';
scene.add(carMesh);
const headlight = new THREE.SpotLight(0xfff1d6, 0, 70, 0.5, 0.5, 1.2);
headlight.position.set(0, 0.8, 2.2);
headlight.target.position.set(0, 0, 14);
carMesh.add(headlight, headlight.target);
const rig = new CameraRig(camera);

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
const traffic = createTraffic(scene, { cars: IS_MOBILE ? 10 : 16, buses: IS_MOBILE ? 2 : 4 });
const tram = createLuas(scene);
traffic.setPlayer(car);
traffic.setTram(tram);
car.dynamicObstacles = (c, r) => {
  const a = traffic.collide(c, r), b = tram.collide(c, r);
  return a && b ? (a.depth > b.depth ? a : b) : a || b;
};

let time = 0;

// ---------- modes ----------
const mode = { rain: false, evening: false };
let lastSwitch = 0;
function applyMode() {
  lastSwitch = time;
  atmosphere.apply(mode);
  const p = atmosphere.state.values;
  setWet(mode.rain);
  buildingUniforms.uNight.value = p.windows;
  buildingUniforms.uWet.value = p.wet;
  lamps.setLevel(p.lamps);
  landmarkMaterials.lampGlow.emissiveIntensity = 0.2 + p.lamps * 3;
  headMat.emissiveIntensity = 0.3 + p.lamps * 2.5;
  tailMat.emissiveIntensity = 0.3 + p.lamps * 1.5;
  headlight.intensity = mode.evening ? 60 : mode.rain ? 15 : 0;
  rain.set(mode.rain, mode.evening);
  hud.setOn('rain', mode.rain); hud.setOn('evening', mode.evening);
}

// ---------- HUD + input ----------
let labelsOn = true;
const siteKeys = Object.keys(sites);
function teleportTo(key) {
  const v = sites[key].view;
  car.teleport(v.x, v.z, v.heading);
  rig.snap();
  hud.toast(sites[key].name);
}
const actions = {
  rain: () => { mode.rain = !mode.rain; applyMode(); hud.toast(mode.rain ? 'Rain' : 'Dry'); },
  evening: () => { mode.evening = !mode.evening; applyMode(); hud.toast(mode.evening ? 'Evening' : 'Daytime'); },
  camera: () => { rig.toggle(); hud.toast(rig.mode === 'chase' ? 'Chase camera' : 'Bonnet camera'); },
  labels: () => { labelsOn = !labelsOn; landmarks.setLabels(labelsOn); hud.setOn('labels', labelsOn); },
  sound: () => { const on = audio.toggle(); hud.setOn('sound', on); hud.toast(on ? 'Sound on' : 'Sound off'); },
  teleport: teleportTo,
};
const hud = createHUD({ sites, actions });
hud.setOn('sound', true);
buildTouchControls(document.getElementById('hud'));
onKey('r', actions.rain);
onKey('n', actions.evening);
onKey('c', actions.camera);
onKey('l', actions.labels);
onKey('m', actions.sound);
onKey('h', () => hud.togglePanel('help'));
onKey('t', () => hud.togglePanel('places'));
onKey('escape', () => hud.togglePanel(null));
onKey('f', () => hud.toggleFps());
onKey('backspace', respawnNearRoad);
siteKeys.forEach((k, i) => onKey(String(i + 1), () => { teleportTo(k); hud.togglePanel(null); }));
applyMode();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- loop ----------
const timer = new THREE.Timer();
let slowTime = 0, fastTime = 0;
const focus = new THREE.Vector3();
function frame() {
  timer.update();
  const rawDt = timer.getDelta();
  const dt = Math.min(rawDt, 0.05);
  time += dt;

  updateInput(dt);
  car.update(dt, input);
  if (isOverWater(car.pos.x, car.pos.z)) respawnNearRoad();
  traffic.update(dt, camera);
  tram.update(dt);
  carMesh.position.set(car.pos.x, car.bump * 0.12, car.pos.z);
  carMesh.rotation.set(car.pitch, car.heading, car.roll);
  rig.update(dt, car, carMesh);
  focus.set(car.pos.x, 0, car.pos.z);
  ground.update(dt, time);
  atmosphere.update(dt, time, focus);
  landmarks.update(camera);
  lamps.update(dt, focus);
  rain.update(dt, time, camera);
  hud.update(dt, { car, traffic, tram });
  audio.update(car, input, mode.rain);

  renderer.render(scene, camera);

  // adaptive resolution: drop pixel ratio if we're persistently slow, restore when there's headroom
  // (ignores the first seconds and one-off hitches such as shader compiles after a mode switch)
  if (time < 4 || time - lastSwitch < 2.5 || rawDt > 0.2) { /* skip */ } else if (rawDt > 1 / 45) { slowTime += rawDt; fastTime = 0; } else if (rawDt < 1 / 58) { fastTime += rawDt; slowTime = Math.max(0, slowTime - rawDt); }
  if (slowTime > 2 && dpr > 0.7) { dpr = Math.max(0.7, dpr - 0.25); renderer.setPixelRatio(dpr); slowTime = 0; }
  if (fastTime > 6 && dpr < maxDpr) { dpr = Math.min(maxDpr, dpr + 0.25); renderer.setPixelRatio(dpr); fastTime = 0; }

  requestAnimationFrame(frame);
}
frame();
document.getElementById('loading').classList.add('gone');
setTimeout(() => hud.toast(IS_MOBILE ? 'Tap ? for help' : 'Press H for controls, T for landmarks', 4500), 600);

// hooks for the headless smoke test
window.__dublin = {
  THREE, scene, camera, world, renderer, atmosphere, car, input, rig, traffic, tram, buildings, landmarks, sites, teleportTo, actions, mode,
  stats: () => ({ ...renderer.info.render, dpr, segments: segmentCount(), car: { ...car.pos, speed: car.speed, street: car.street && car.street.name } }),
};

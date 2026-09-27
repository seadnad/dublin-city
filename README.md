# Dublin Drive

A browser driving game set in a stylised, compressed central Dublin. Three.js (WebGL2) + Vite, plain JavaScript, no game engine or physics library, and no external model or texture files: everything is built in code at load time.

## Controls

| Key | Action |
| --- | --- |
| `G` | Play menu: Garda Pursuit, Time Trials, choose your car |
| `X` | Siren and blue lights (traffic pulls over) |
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake, then reverse |
| `A` `D` / `←` `→` | Steer |
| `Space` | Handbrake (drift) |
| `C` | Chase / bonnet camera |
| `R` | Rain (wet, reflective roads) |
| `N` | Evening (lit windows, street lamps, headlights) |
| `L` | Landmark labels |
| `T`, `1`–`9` | Landmark list / teleport |
| `H` | Help |
| `Q` | Graphics quality: low / medium / high |
| `M` | World map (click a landmark to go there, or a street for a waypoint) |
| `V` | Sound |
| `F` | Frame-rate counter |
| `Backspace` | Put the car back on the road |

On phones, on-screen controls appear automatically: steering on the left, brake, accelerator and handbrake (**HB**) on the right. The toolbar buttons do the same as the keys.

Traffic drives on the **left**.

## Game modes

- **Garda Pursuit**: a suspect (the red blip on the minimap and map) flees through the city, choosing escape routes away from you and overtaking traffic. Stay close or ram them to fill the bust meter before the clock runs out. Each catch adds 40 seconds and the next suspect is faster. Your best is saved.
- **Time Trials**: checkpoint routes (Liffey Loop, Georgian Sprint, Temple Bar & Christ Church), plus a **Daily Route** generated from the date, so everyone gets the same one each day. There's a countdown, split times against your best, bronze, silver and gold medals, and a ghost car of your best run to race.

## Cars

The Garda patrol car (with its Battenburg livery and lightbar), a hot hatch and the suspect's coupe are modelled in Blender by a Python script, [`tools/blender/build_cars.py`](tools/blender/build_cars.py), and exported to `public/models/*.glb`. To rebuild them:

```bash
blender -b --factory-startup -P tools/blender/build_cars.py -- public/models
blender -b --factory-startup -P tools/blender/preview.py -- public/models tools/shots   # optional renders
```

Traffic, buses and parked cars are still generated in code.

## What's in it

- **Area**: roughly 2.2 km × 1.9 km of the city centre from Smithfield to the Docklands and from Parnell Street to St Stephen's Green, compressed to 50% (about 1.15 km × 1.05 km of game world). Road widths are not compressed, so streets keep their proportions.
- **Streets**: a hand-authored graph in [`src/data/streets.json`](src/data/streets.json) (lat/lon nodes, named ways), traced against OpenStreetMap geometry. It includes both sets of quays, O'Connell St, Westmoreland St, D'Olier St, College Green, Dame St, Grafton St, Nassau St, the Christ Church area, the Temple Bar lanes and the St Stephen's Green perimeter.
- **Landmarks**: the Spire, GPO, O'Connell Bridge and O'Connell Monument, Ha'penny Bridge, Trinity College front and campanile, Bank of Ireland, Christ Church Cathedral with the Synod Hall bridge, the Custom House, and St Stephen's Green with its pond and Fusiliers' Arch.
- **Filler city**: about 5,700 procedurally placed buildings in one instanced draw call. Its facade shader paints Flemish-bond brick with bump shading, recessed sash windows with interior-mapped rooms and curtains behind the glass (lit at night), Georgian granite ground floors with fanlit doors, shopfronts with named fascias, colourful Temple Bar render and glass curtain walls toward the Docklands. Georgian terraces get railings, basement areas and granite steps.
- **Streets**: raised pavements are real geometry, with granite kerbs and rounded corners contoured from a distance field of the road network. Asphalt, concrete slabs, granite setts (Temple Bar, Grafton St) and grass use high-resolution procedural textures with normal maps. Markings are crisp decals: dashes, double yellows, zebras, stop lines and LOOK RIGHT. Rain makes gutters and dips glossy.
- **Traffic**: instanced hatchbacks, saloons, SUVs, vans and taxis (with the yellow and blue roof sign and Irish plates), Enviro400-style Dublin Bus double-deckers in the yellow and navy livery with LED destination displays, and about 300 parked cars. AI cars follow the street graph, keep left and stop at working traffic lights. A three-car Luas Red Line tram runs between Mayor Square and Smithfield (Abbey Street, Jervis and the Inns Quay stretch of the quays) and stops at each stop.
- **People**: about 300 pedestrians with a GPU walk cycle. They walk the footpaths, cross at junctions, pause, step out of the way of your car, and open umbrellas when it rains.
- **Street furniture**: heritage lanterns on Georgian streets and the quays, bus stops and shelters, bins, An Post pillar boxes, cast-iron bollards and trees along the north quays.
- **Atmosphere**: an overcast Irish sky by default, rain with wet reflective streets, and evening with lit windows, lanterns and headlights. Soft shadows and fog throughout.
- **Rendering**: the high tier renders an MSAA HDR scene, then ambient occlusion (GTAO), bloom, tone mapping and a colour grade. Medium drops the AO and MSAA. Phones use a plain forward render. Quality and resolution adapt to the frame rate automatically, or you can pick a tier with Q.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run check     # headless smoke test (needs Chrome or Edge installed)
```

`tools/check.mjs` starts Vite, opens the game in headless Chrome, reports console errors and frame rate, and saves screenshots to `tools/shots/`. Pass a scenario (for example `node tools/check.mjs tools/scenarios/stage5.mjs`) to drive the car, toggle modes and teleport. Add `--build` to test the production bundle, or `--mobile` to emulate a phone.

## Layout

```
src/
  data/streets.json      street graph, river quays, parks, Luas route
  world/geo.js           projection, road graph, spatial lookups
  world/ground.js        painted ground texture (also the minimap), river, quay walls, bridges
  world/buildings.js     lot placement on an occupancy grid + instanced facade shader
  world/sites.js         landmark footprints anchored to street nodes
  world/landmarks.js     hand-modelled landmarks, park trees, labels
  world/props.js         street lamps, rain
  world/atmosphere.js    sky, fog, lighting presets
  game/car.js            arcade car physics
  game/collision.js      segment-based collision (buildings, quay walls, railings)
  game/traffic.js        AI traffic
  game/luas.js           the tram
  game/camera.js         chase and bonnet cameras
  ui/hud.js              minimap, street sign, toolbar, landmark list, help
```

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). The Vite `base` is relative, so the build works at any sub-path.

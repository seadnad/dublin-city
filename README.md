# Dublin Drive

A browser driving game set in a stylised, compressed central Dublin. Three.js (WebGL2) + Vite, plain JavaScript, no game engine or physics library, and no external model or texture files: everything is built in code at load time.

## Controls

| Key | Action |
| --- | --- |
| `G` | Play menu: Garda Pursuit, Time Trials, choose your car |
| `X` | Siren and blue lights (traffic pulls over) |
| `E` | Garda Pursuit: radio Control for the suspect's location (3 calls a shift, one back per arrest; controller D-pad left; the 📻 button on a phone) |
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake, then reverse |
| `A` `D` / `←` `→` | Steer |
| `Space` | Handbrake (drift) |
| `C` | Chase / bonnet camera |
| `R` | Rain (wet, reflective roads) |
| `N` | Evening (lit windows, street lamps, headlights) |
| `L` | Garda helicopter (take off from where the car is) / back to the car on the nearest road |
| `T`, `1`–`9` | Landmark list / teleport |
| `H` | Help |
| `Q` | Graphics quality: low / medium / high |
| `M` | World map (click a landmark to go there, or a street for a waypoint) |
| `V` | Sound |
| `F` | Frame-rate counter |
| `Backspace` | Put the car back on the road |

On phones, on-screen controls appear automatically: steering on the left, brake, accelerator and handbrake (**HB**) on the right. The toolbar buttons do the same as the keys.

### Flying the Garda helicopter

Press `L` (or pick **Helicopter** in the Play menu, or D-pad right on a controller) to swap the car for the Garda Air Support Unit EC135. The rotor spools up for a couple of seconds before it will lift.

| Key | Action |
| --- | --- |
| `Space` / `Shift` | Climb / descend (hands off holds height; descend onto anything flat to land, roofs included) |
| `W` `S` / `↑` `↓` | Tilt forward / back (it levels itself when you let go) |
| `A` `D` | Turn (yaw) |
| `←` `→` | Bank left / right (turns as well at speed) |
| `X` | Searchlight on / off (on by itself at night; during a Garda Pursuit it follows the suspect) |
| `C` | Near / far chase camera |
| `P` | Photo mode works in the air too |

The ceiling is 250 m. Buildings, spires and trees push you away rather than crash you. Phones: a tilt stick on the left; climb, descend and turn buttons on the right. Controller: left stick tilts, right stick turns, RT / LT climb / descend, Y searchlight.

Traffic drives on the **left**.

## Game modes

- **Garda Pursuit**: a shift of callouts. Control radios a crime on a real street ("Joyrider doing laps of Merrion Square", "Stolen car spotted on the North Wall Quay", ...) and the suspect starts there, a few hundred metres off. They drive normally until they see or hear you (switch the siren off with `X` to creep closer), then run: main roads, the quays, the canal and Chesterfield Avenue, the odd cut through a lane, round traffic, roadblocks and trams. Take them down:
  - **PIT**: nudge a rear corner while running alongside at speed and they spin out and stall (bonus points).
  - **Rams** damage their car (smoke, slower, wobbly); a wrecked car means they run **on foot**: stop beside them to arrest.
  - **Arrest**: when they're stopped and you're close and slow, hold them for the countdown; boxed in (you in front, backup or a roadblock) it's quicker. Left unboxed, they rev away when the stall wears off.
  - The red blip shows only when they're in sight, for a few seconds after a callout, or after a radio call (`E`); otherwise a grey "last seen" mark. Too far for too long and you've **lost them** (time penalty). Hard crashes cost points.
  - Later calls: quicker, cleverer suspects, backup Garda cars that try to box them in, and roadblocks (a Garda car and cones) ahead of them. Each arrest adds a minute to the shift; your best shift is saved.
- **Time Trials**: checkpoint routes (Liffey Loop, Georgian Sprint, Temple Bar & Christ Church), plus a **Daily Route** generated from the date, so everyone gets the same one each day. There's a countdown, split times against your best, bronze, silver and gold medals, and a ghost car of your best run to race.

## Cars and trees (Blender)

The hero cars are modelled after real ones from reference photos by a Blender Python script, [`tools/blender/build_cars.py`](tools/blender/build_cars.py):

- **Garda Hyundai i40 Tourer**, in the standard patrol livery (yellow waist band edged in blue, GARDA on the doors, yellow and orange rear chevrons, roof lightbar)
- **Garda Roads Policing i40**, with the blue and yellow Battenburg sides and a yellow bonnet
- **Hyundai i30 N** style hot hatch
- **Liffey GT**, a hot hatch in the classic mould (short upright five-door, thick C-pillar, honeycomb grilles with a thin red line into the LED headlights, roof spoiler, diffuser and twin tailpipes, dark alloys over red calipers), in Flame red, white, dark grey or blue. It is the fun one: quicker, faster (about 160 km/h against 120), sharper steering, stronger brakes, and a tail that steps out when you lift off mid-corner. Its engine is a revvier six-speed petrol voice with crackles on the overrun. Pick it, and its colour, in the Play menu (`G`). Original name and a plain badge; references in [`refs/gt/sources.json`](refs/gt/sources.json), notes in [`docs/research/gt.md`](docs/research/gt.md).
- the pursuit suspect's **coupe**

Bodies are extruded side profiles with wheel arches and tumblehome. Lights, grilles, glazing, livery and lettering are *projected decals*: 2D outlines raycast onto the bodywork so they follow its curves. The same technique can paint livery onto an imported mesh.

[`tools/blender/build_trees.py`](tools/blender/build_trees.py) grows five tree species (London plane, lime, horse chestnut, silver birch, young street tree) with branching limbs and colour-varied clumped canopies. Parks get a mix; the quays and O'Connell Street get plane trees.

```bash
blender -b --factory-startup -P tools/blender/build_cars.py -- public/models            # all cars (or name some: hatch coupe gt)
blender -b --factory-startup -P tools/blender/build_trees.py -- public/models tools/shots
blender -b --factory-startup -P tools/blender/preview.py -- public/models tools/shots     # optional car renders
```

The **Garda helicopter** (Airbus EC135 style, ~3k triangles) comes from [`tools/blender/build_heli.py`](tools/blender/build_heli.py); its livery is painted onto a side-projected texture at load ([`src/game/heli.js`](src/game/heli.js)). Reference photos and their licences: [`refs/heli/sources.json`](refs/heli/sources.json).

```bash
blender -b --factory-startup -P tools/blender/build_heli.py -- public/models
```

Traffic, buses and parked cars are still generated in code.

## What's in it

- **Area**: Dublin inside the canal ring, from the Royal Canal and the North Circular Road to the Grand Canal, plus the eastern Phoenix Park and the Aviva: about 7.5 km × 4.5 km of city at 50% (about 3.5 km × 2.2 km of game world). The park is squeezed further east-west so Chesterfield Avenue stays one long straight. Road widths are not compressed, so streets keep their proportions.
- **Streets**: a hand-authored graph in [`src/data/streets.json`](src/data/streets.json) (lat/lon nodes, named ways), traced against OpenStreetMap geometry. It includes both sets of quays, O'Connell St, College Green, Dame St, Grafton St, Temple Bar, the Liberties, Camden St and Harcourt St, Parnell Square, Dorset St, Mountjoy Square, the North and South Circular Roads, Phibsborough, the canal roads and bridges, Chesterfield Avenue and Ballsbridge. The Grand and Royal Canals and the Dodder have their bridges, locks and grassy banks.
- **Landmarks**: the Spire, GPO, O'Connell Bridge and the O'Connell Street monuments (O'Connell, Smith O'Brien, Gray, Larkin, Father Mathew, Parnell), Ha'penny Bridge, Trinity College, the old Parliament House (Bank of Ireland), Christ Church and St Patrick's, the Custom House, St Stephen's Green, Heuston Station and Seán Heuston Bridge, Croke Park, the Aviva Stadium with the Lansdowne Road level crossing, and Phoenix Park with the Wellington Monument, the Phoenix Column, the Papal Cross, its gas lamps and fallow deer.
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

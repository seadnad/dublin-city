# Guinness Storehouse and the St James's Gate skyline (`guinness`): research and build

Scope: the Guinness Storehouse (the 1902-04 fermentation plant, now the visitor centre) and the Gravity Bar on its roof, plus the brewery's other skyline cues: the Power House and its four stacks, the fermenter banks by Victoria Quay, St Patrick's Tower (the smock-windmill tower off Thomas Street), and the brewery's boundary wall on Victoria Quay.

- Raw OSM: `data/osm/guinness.json`. Overpass `out geom`, bbox **S 53.3400, W -6.2935, N 53.3452, E -6.2800**. It holds buildings, building:parts, building relations, highways, man_made (chimneys, storage tanks, windmill), tourism, landuse, historic and the Gravity Bar node. Snapshot `timestamp_osm_base` 2026-09-29T13:49:32Z, 1,258 elements. The request used the generic UA `DublinDriveResearch/1.0 (hobby game research)`.
- References: `refs/guinness/` holds 12 images from Wikimedia Commons (several of them geograph uploads). Credits are in section 2 and `refs/guinness/sources.json`.
- Game coordinates come from `project()` in `src/world/geo.js` (both stretch bands and the Phoenix Park squeeze). Everything here is west of the College Green band, so x carries the constant west shift.

---

## 1. Map data

### 1.1 The Storehouse (VERIFIED, OSM way 44597908)

`building=yes`, `building:levels=7`, **`height=42.5`**, `heritage=4`, `addr:street=Market Street South`, wikidata Q261012.

| Corner | lat, lon | Game (x, z) |
|---|---|---|
| NW | 53.3420656, -6.2871209 | -1055.0, 289.7 |
| NE | 53.3420527, -6.2863312 | -1028.7, 290.4 |
| SE | 53.3416373, -6.2863504 | -1029.4, 313.5 |
| SW | 53.3416452, -6.2871386 | -1055.6, 313.1 |

- The footprint is a near-square **~54 m E-W x ~48 m N-S**, square to the compass (edges within about 1 degree of E-W and N-S). Its centre is 53.341851, -6.286735, game (-1042.2, 301.6).
- **The Gravity Bar** (`node 629750018`, `amenity=bar`, `level=7`) is at 53.3419024, -6.286488, game (-1034.0, 298.8). That is **~11 m in from the east (Bellevue) front, centred N-S**. Ref 01 confirms it sits at the building's edge.
- **Streets:** Market Street South runs along the south front (the game's BV1-MK1, "Market Street South"). Bellevue runs along the east front and is not in the game. Crane Street (CR1-BV1) is ~80 m further east. The real south face (z 313.5) would sit on the game's Market Street pavement, so the model's south front goes on the building line instead (z 309.6, see 5.2).
- **Old game placement:** `beside('BV1', 'MK1', 0.55, -1, 40, 34)` put a 40 x 34 box centred at about x -1015, **~27 m east of the real footprint**. Filler stood where the Storehouse really is (the Market Street west end, the "Doyle's Bar" corner).

### 1.2 Heights

| Element | Value | Status |
|---|---|---|
| Storehouse overall (OSM `height`) | 42.5 m | OSM. Taken as the top of the Gravity Bar roof |
| Floors | "seven floors", the Gravity Bar on the seventh (Wikipedia) | Verified. So six brick floors plus the bar |
| Parapet of the brick block | ~34 m | Estimate: 42.5 m less the bar (~8.5 m from roof to its roof disc, ref 01) |
| Gravity Bar glass | ~4 m tall, ~24 m across, on a dark slab over a narrower service drum | Estimate from ref 01 |
| St Patrick's Tower (way 44597921) | **45.7 m** incl. a 5 m onion roof (`roof:height=5`), base ~11 m across | OSM |
| Power House stacks | ~44 m (the two brick stacks), ~42 m (steel), ~31 m (cream) | Estimate from refs 06/07/08 against the 4-5 storey Power House |
| Fermenters | not tagged | Estimate: roughly 4 diameters tall, 18-25 m for the 6 m tanks (refs 08, 12) |

### 1.3 The brewery skyline around it (OSM)

- **Power House** (`way 352819252`, `building=industrial`, `heritage=4`): ~37 x 63 m, long axis N-S, turned ~9.7 degrees. Centre 53.34408, -6.28585, game (-1011.5, 174.5). It lies north of James's Street, behind the James's Street houses. The "Powerhouse Bar" node (53.34389, -6.28571) is inside it. **Four `man_made=chimney` nodes:** 2989865725 (53.3443512, -6.2861451) and 2989865726 (53.3443912, -6.2857052) at its north corners, 5827403777 (53.3440781, -6.2859364) in the middle and 4711077901 (53.3447048, -6.2855102) to the north. Ref 07 shows the row: tall brick, steel with a red band, tall brick behind the central tower, short cream. The large **GUINNESS** is in cream letters on the parapet of the front range (ref 07).
- **"The chimney with GUINNESS down it":** not found in any CC reference. The lettering is on the Power House front and on the white brewhouse/grain building by Victoria Quay (refs 06, 08). The model puts it where the photos show it. **Open question.**
- **Storage tanks:** 195 `man_made=storage_tank` (most also `building=yes`, many `content=beer`) in clusters. The big fermenter bank has 111 tanks of 3-6 m at 53.3446-53.3452, -6.2856 to -6.2885, game x -1102..-1029, z 91..148. Beside the Power House there are 29, 7 west of it and 13 behind the Storehouse, plus others on Crane Street and south of Market Street. The ones used are in `src/data/guinness-tanks.json` (5.1).
- **St Patrick's Tower** (`way 44597921`, `man_made=windmill`, `building:colour=brown`, `roof:shape=onion`, `roof:colour=#99ff99`, `heritage=4`): centre 53.344049, -6.284071, game (-953.6, 179.2), in the Digital Hub / Roe & Co yard between Thomas Street and Watling Street.
- **Also in the area (not built):** the Guinness Quarter apartment blocks on Market Street west (Stevedore 11 levels, Rupee Bridge 12, Shipwright 13, ways 1124889677-80), which are new and would out-top the Storehouse. There is also the Rutland Obelisk fountain on James's Street (node 2024552457) and the white brewhouse with GUINNESS on its top by Victoria Quay (refs 06, 08; OSM has no tagged height).

### 1.4 The Victoria Quay frontage

The brewery owns the whole south side of Victoria Quay from Watling Street to St John's Road. The frontage is a **brick boundary wall on a granite plinth with granite piers**, black GUINNESS gates, low sheds and the modern black "harp" block (ref 09). Behind it, **the fermenters and stacks are the skyline** (refs 08, 12). The game had 4-6 storey Georgian filler right up to the quay, which hid everything.

---

## 2. Reference images (`refs/guinness/`)

All are from Wikimedia Commons as 960 px thumbnails. Several are geograph uploads.

| File | Source | Author | Licence | What it shows |
|---|---|---|---|---|
| 01-gravity-bar-over-brewery-roofs.jpg | [Guinness Storehouse, The Liberties.JPG](https://commons.wikimedia.org/wiki/File:Guinness_Storehouse,_The_Liberties.JPG) | MikeBarry1989 | CC BY-SA 4.0 | **Key view of the bar**: glass drum, dark slab with sloping soffit, pale roof disc, set-back service drum; the Storehouse's upper floors (window grid, stone bands, arched top windows, corbel table) |
| 02-market-st-south-facade.jpg | [Guinness Storehouses, geograph 6017988](https://commons.wikimedia.org/wiki/File:Guinness_Storehouses_-_geograph.org.uk_-_6017988.jpg) | N Chadwick | CC BY-SA 2.0 | **Market Street front**: ground-floor arcade with stone imposts, dark-brick pilasters, tiers of tall blind panels, the steel footbridge over the street |
| 03-storehouse-corner-blind-arches.jpg | [Guinness Storehouse exterior 2.jpg](https://commons.wikimedia.org/wiki/File:Guinness_Storehouse_exterior_2.jpg) | Steven Lek | CC BY-SA 4.0 | Corner detail: blind arched panels, blue-brick piers, attic storey windows, corbelling |
| 04-bellevue-oriels-and-bridge.jpg | [Guinness Storehouse exterior 3.jpg](https://commons.wikimedia.org/wiki/File:Guinness_Storehouse_exterior_3.jpg) | Steven Lek | CC BY-SA 4.0 | Bellevue: limestone base, stone oriels, footbridge, the black GUINNESS hoarding |
| 05-bellevue-looking-north.jpg | [Guinness Storehouse exterior 1.jpg](https://commons.wikimedia.org/wiki/File:Guinness_Storehouse_exterior_1.jpg) | Steven Lek | CC BY-SA 4.0 | Brewery street with footbridges, silos behind |
| 06-skyline-chimneys-and-grain-store.jpg | [Guinness Brewery in Dublin cityscape.jpg](https://commons.wikimedia.org/wiki/File:Guinness_Brewery_in_Dublin_cityscape.jpg) | Metro Centric | CC BY 2.0 | **Skyline**: two tall brick stacks, steel stack, domed fermenters, white brewhouse with GUINNESS |
| 07-power-house-chimneys.jpg | [geograph 5198787](https://commons.wikimedia.org/wiki/File:Guinness_St_James%27s_Gate_Brewery_(geograph_5198787).jpg) | David Dixon | CC BY-SA 2.0 | **Power House**: GUINNESS on the parapet, central tower, the four stacks |
| 08-silos-from-victoria-quay.jpg | [geograph 6003696](https://commons.wikimedia.org/wiki/File:Guinness_Brewery_-_geograph.org.uk_-_6003696.jpg) | N Chadwick | CC BY-SA 2.0 | **From the north quay**: quay wall, brewery wall, fermenter bank, brick stack, the GUINNESS brewhouse |
| 09-victoria-quay-harp-tower.jpg | [geograph 5199575](https://commons.wikimedia.org/wiki/File:Guinness_St_James%27s_Gate_Brewery_(Victoria_Quay_Frontage)_(geograph_5199575).jpg) | David Dixon | CC BY-SA 2.0 | Victoria Quay frontage: the black harp block, GUINNESS glazing, gates |
| 10-st-patricks-tower.jpg | [St. Patrick's Tower.jpg](https://commons.wikimedia.org/wiki/File:St._Patrick%27s_Tower.jpg) | William Murphy | CC BY-SA 2.0 | **The tower**: tapering dark brick shaft, small windows climbing it, cornice, verdigris onion cupola with finial |
| 11-st-patricks-tower-from-storehouse.jpg | [St Patricks mill Dublin from Guinness storehouse.JPG](https://commons.wikimedia.org/wiki/File:St_Patricks_mill_Dublin_from_Guinness_storehouse.JPG) | Bkwillwm | CC BY-SA 3.0 | The tower from the Gravity Bar, over the Liberties roofs |
| 12-silos-close.jpg | [geograph 6003723](https://commons.wikimedia.org/wiki/File:Guinness_Brewery_-_geograph.org.uk_-_6003723.jpg) | N Chadwick | CC BY-SA 2.0 | Fermenters: domed tops with railings, tall slim tanks with ladders, brick stack |

Useful but not downloaded: Russell Yarwood's "Top of Storehouse (27824068/27824334)" and "Smoke Stack (27820091)" (CC BY-SA 2.0), psyberartist's "View from Gravity Bar" series (CC BY 2.0), and "Guinness Storehouse (8339936791)" by Mack Male (CC BY-SA 2.0). No CC night photo of the bar was found.

---

## 3. Recognisable cues

**From a distance (the quays, Heuston, the air):**
1. The **glass drum on the roof**: a flat "puck" with a pale roof disc and a dark slab under the glass. It is the one thing that says "Storehouse". At night it is a warm lit ring.
2. The **red-brown block** under it: squat, flat-topped, darker than the Georgian filler.
3. The **brewery's industrial skyline** to the north: the two tall brick stacks with the steel red-banded one between, the massed aluminium fermenters with domed tops, the brewery wall along the quay, and the green cupola of St Patrick's Tower to the east.

**From the street (Market Street, James's Street):**
1. The **ground-floor arcade**: round arches with iron grilles and stone impost blocks.
2. **Dark engineering-brick pilasters** on each bay line, and **tall blind panels** in dark-brick frames on the Market Street front.
3. The **black steel footbridge** high over Market Street.
4. The **corbel table** under the parapet.
5. From James's Street, the bar shows over the houses by St James's Gate.

---

## 4. Palette (sRGB, as painted in `src/world/heroes.js` GS)

Brick `#95523a`; dark engineering brick (pilasters, frames) `#56322a`; stone dressings `#b3ac9f`; window glass `#1d2327` with frames `#d7d3c9`; bar slab and service drum charcoal `0x2b2e31`; bar roof and fascia pale metal `0xc9cccd`; Power House brick `#8d4b36`; tower shaft `#3d332b`; cupola verdigris `0x78ad98`; fermenter aluminium `#aeb4b6`-`#dfe2e2`.

---

## 5. Build brief and what was built

### 5.1 Model: `tools/blender/build_guinness.py` -> `public/models/guinness.glb` (46 KB, Draco)

Real metres. Each part is built round its own origin and placed from OSM positions. **Heights are real** (like St Patrick's and Heuston): the skyline is the point.

| Root | Plan scale | Triangles | Contents |
|---|---|---|---|
| `storehouse` | 0.6 (32.4 x 28.8 m) | 1,288 | Walls with the elevation tile; pilasters on every 6 m bay; stone plinth, string course, cornice and coping; parapet; roof with plant, lift overrun and atrium rooflight; the footbridge over Market Street; the Gravity Bar (48-sided: service drum, slab with sloping soffit, glass drum 23.8 m across, roof disc) |
| `storehouse_far` | 0.6 | 332 | Four walls, coping, a 16-sided bar (LOD beyond 320 m, 220 m on Low / Battery saver) |
| `powerhouse` | 0.5 (fills its OSM footprint) | 40 | Boiler-house block, front range with the GUINNESS lettering, central tower |
| `stack_w`, `stack_e`, `stack_steel`, `stack_cream` | 0.8 | 416 | Tapering stacks with caps (brick, steel with red band, cream) |
| `tower` | 0.8 | 660 | St Patrick's Tower: tapering shaft with plinth and cornice, onion cupola and finial |

Near total: **2,404 triangles in the GLB**. Add the instanced fermenters (built at load): ~160 tanks x 40 triangles (8-sided body and a domed top, 6-sided on Low) ≈ **6.4k**. The whole set is **~8.8k**.

**Materials** (painted at load, no image files; `lightFog(0.5)` on all so they cut through the haze like the Aviva):
- `gs_brick` is one 1024 x 2048 tile of 4 bays x 34 m. The top half is the Market Street elevation: arcade, two tiers of blind panels, top-floor paired windows, corbel table. The bottom half is the windowed brewery sides: three windows a bay on five floors, stone sill bands, arched top floor. The south and west fronts get the first; the north and east get the second.
- `gs_glass` is the bar glazing (sky by day). Its emissive twin is the lit bar with silhouettes.
- Night: the bar glass emissive runs 0.02 to 2.4, the Storehouse windows light, the Power House windows and GUINNESS letters light, and an additive halo sprite sits over the drum. Low / Battery saver paint the textures at half size and use 6-sided tanks.
- At load the static parts merge into **one mesh per material** (`mergeByMaterial`), a pure draw-call saving.

### 5.2 Placement (`src/world/sites.js` `sites.guinness`)

- **Storehouse:** centred on the OSM footprint centre in x (-1042.2). Its south front sits on Market Street's building line (road edge less 0.4 m), which gives z = 295.3 in place of the real 301.6. Market Street is drawn ~6 m further north than the real one relative to the footprint.
- **`parts`:** the Power House at its OSM centroid turned 0.169 rad; the four stacks on their OSM chimney nodes; the tower on its OSM centroid. `bar` gives the halo position.
- **`tanks`:** from `src/data/guinness-tanks.json`. This is 162 OSM tanks in 5 banks (Victoria Quay, beside and west of the Power House, behind the Storehouse). The Crane Street vats would land on the road in the compressed map, and the singles and the vats south of Market Street are left out. Tanks inside the Power House are dropped. Each bank's box is reserved (no filler) and solid.
- **Reserved and solid:** the Storehouse, the Power House, three free-standing stacks, the tower and the tank banks.
- **Brewery wall** (`landmarks.js breweryWall`, `extraSites.breweryWall0/1`): a 4.3 m brick wall with granite plinth, piers every 9 m and coping along Victoria Quay from Watling Street to St John's Road West, with a black GUINNESS gate. A 14 m yard strip behind it is reserved.
- **Brewery filler** (`buildings.js inBrewery`): north of James's Street, west of Watling Street, back from Victoria Quay, the filler is 1-2 storeys in the block interior (2-3 on street fronts). The fermenters, stacks and Storehouse now read over the wall, as in refs 06/08. There are no extra `rand()` calls, so the rest of the city's filler is unchanged.
- **Fallback:** the old procedural `guinness()` block and chimney is still added if the GLB fails to load.

### 5.3 Verification

- `tools/scenarios/footprints.mjs`: **0 footprints on roads**. `tools/scenarios/bridges.mjs`: **`bad: {}`**. No console errors, desktop or `--mobile`.
- **Sightlines:** `tools/scenarios/guinness.mjs` casts a ray from every ~12 m of road to the glass drum. At a 3 m eye it finds the drum **unobstructed from**:
  - Wolfe Tone Quay (10 of 21 samples) and Frank Sherwin Bridge (4/5)
  - Victoria Quay (4/20) and Seán Heuston Bridge (2/6); Parkgate and Benburb Streets
  - Down the river from Upper and Lower Ormond Quay, O'Connell Bridge, Eden Quay and Custom House Quay (0.6-1.3 km; fog-thinned by day, the lit ring at night)
  - James's Street by St James's Gate

  It is **not** visible from Usher's Quay, Usher's Island, Ellis Quay, Thomas Street, Steevens Lane or St John's Road West: 5-6 storey houses or the fermenters are in the way.
- **Frame cost:** `tools/scenarios/guinnessperf.mjs`, Low tier, dpr 1, headless, with other agents' Chrome sharing the GPU.

  | Spot | Draw calls | Triangles | GPU time |
  |---|---|---|---|
  | Market Street (near LOD) | +14 | +12k | within noise (+0.2-0.6 ms) |
  | Victoria Quay (far LOD + fermenters) | +8 | +6k | ≈ 0 |
  | Frank Sherwin Bridge | +12 | +6k | ≈ 0 |

  Draw calls include the shadow pass. The High-tier numbers can't be read this way (the composer's last pass is all `renderer.info` shows), the same limitation as `avivaperf.mjs`.
- **Comparison:** `docs/research/guinness-compare.png`, reference left and game right: the bar over the roofs, Market Street, the skyline from the north quay, the fermenters across the river, the Power House and St Patrick's Tower.

---

## 6. Open questions

1. **Exact heights.** Is OSM's 42.5 m the bar roof or the brick parapet? Wikipedia's "seventh floor houses the Gravity Bar" suggests the bar is included. The stack and fermenter heights are photo estimates.
2. **The "GUINNESS down the chimney".** No CC photo shows lettering on a stack. The letters are built on the Power House front.
3. **The white brewhouse / grain building** with GUINNESS on top by Victoria Quay (refs 06, 08). It is a strong quay-side cue and ~40 m tall, but OSM has no height or clear footprint for it. Not built.
4. **The black "harp" block** on Victoria Quay (ref 09). Not built.
5. **Market Street's position.** The game street runs ~6 m north of the real line relative to the Storehouse, so the model's south front sits ~6 m north of the real one. Moving MK1/BV1 would need a streets.json edit (and dupcheck).
6. **The Liberties filler** (5-6 storeys) hides the bar from Usher's Quay and Thomas Street. Reality is probably similar; left alone.
7. **The Guinness Quarter towers** on Market Street west (11-13 storeys, 2020s). Not built.

## 7. Sources

- OpenStreetMap contributors (ODbL), via Overpass: `data/osm/guinness.json`.
- Wikipedia, "Guinness Storehouse" (text via the MediaWiki API, generic UA): seven floors, the Gravity Bar on the seventh, built 1902, Chicago School, first multi-storey steel-framed building in Ireland, fermentation plant until 1988, opened as the Storehouse on 2 December 2000 (Imagination with RKD).
- Wikimedia Commons images as listed in section 2 and `refs/guinness/sources.json`.

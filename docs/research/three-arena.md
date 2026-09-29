# 3Arena / the Point Depot (`threeArena`): research and build

Scope: the 3Arena (the 1878 Point Depot goods shed and the 2008 hall built into it) at the east end of North Wall Quay, its forecourt, the Point Village plaza behind it, the Luas Red Line terminus "The Point", and the neighbours that frame it (the Exo tower, North Dock One and Two, Point Square and the Gibson Hotel, Tom Clarke Bridge).

- Raw OSM: `data/osm/three-arena.json`. Overpass `out geom`, bbox **S 53.3458, W -6.2335, N 53.3500, E -6.2255**. Snapshot `timestamp_osm_base` 2026-09-29T13:48:31Z. It holds buildings and parts, highways, railway (tram, platforms), public transport, amenities, man_made, landuse and leisure. The historic-boundary relations the bbox caught were dropped, which leaves 436 elements.
- References: `refs/three-arena/` holds 14 images from Wikimedia Commons (CC0, CC BY, CC BY-SA or public domain). Credits are in §2 and `refs/three-arena/sources.json`.
- Every request used the generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`.
- Game coordinates come from `project()` in `src/world/geo.js`. This area is east of the Dame Street stretch band and north of the quays band, so x = 0.5 x the east offset, and z = -0.5 x the north offset minus a constant 44.5 m shift.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 The building (OSM `way 23722561`, VERIFIED)

`amenity=theatre`, `name=3Arena`, `name:1988-2007=The Point Depot`, `name:2008-2014=O2Arena`, `capacity=13000`, `heritage=4`, operator Live Nation.

| Corner | Real lat, lon | Game (x, z), plain projection |
|---|---|---|
| Quay front, east end | 53.34704, -6.22793 | 1037.4, -31.4 |
| Quay front of the old block, west end | 53.34698, -6.22883 | 1007.3, -28.3 |
| West part (2008), set back, SW corner | 53.34712, -6.22910 | 998.6, -36.2 |
| NW corner | 53.34803, -6.22894 | 1003.9, -86.8 |
| NE corner (East Wall Road) | 53.34799, -6.22775 | 1043.4, -84.6 |

- The footprint is **~90 m east-west by ~125 m north-south** in real metres (45 x 62 game m). It is square to the quay: the front edge runs about 6 degrees off east, the same as the game's NQ18 to NQ19.
- The **old front block** fills the quay front from -6.22883 to -6.22793 (**~60 m**). The **2008 extension** is the west strip (-6.22910 to -6.22883), set back ~14 m from the quay front.
- Directly east is **East Wall Road** (R131, a dual carriageway, OSM `233082086` and others) and the **East-Link roundabout** at the north end of Tom Clarke Bridge.

### 1.2 Neighbours (OSM)

| Feature | OSM | Real position | Notes |
|---|---|---|---|
| **The Exo** | `way 946426430` (+ parts `1167524474/5`) | 53.34714-53.34816, -6.22773..-6.22726 | 73 m (73.8 m on Wikipedia), 17 floors, 2021, Shay Cleary Architects. Glass tower in a **bright blue steel exoskeleton** of big diagonals (refs 11, 13). An 8-storey podium runs south to the quay. It stands between the arena and East Wall Road. |
| North Dock One / Two | `1009564193`, `1183596061` | -6.22997..-6.22917, quay to 53.34773 | 8-storey offices west of the arena, between it and North Wall Avenue |
| Beckett Locke hotel etc. | `relation 13516982` | 53.34771-53.34811, -6.2298..-6.2291 | behind North Dock Two |
| **Luas: The Point** stop | `node 4683372264/5`, `566891066`; platforms `way 278820348/50/51` | 53.34823-53.34840, **-6.22966 .. -6.22885** | **Terminus.** Three platforms: **Outbound, Inbound and an "Event Platform"** (for crowds after concerts), all with shelters. The track runs east-west ~15-20 m north of the arena's rear gables and ends just east of the platforms (-6.22878). A crossover lies west of the stop (`388108407/8`). |
| Point Square | `relation 3077604` | 53.34847-53.34970, -6.22881..-6.22718 | Retail and leisure (Odeon, Starbucks, Eddie Rocket's, Dunnes), 850-space underground car park |
| **Gibson Hotel** | `node 1711793159` | 53.34862, -6.22827 | On the west side of Point Square, north of the Luas stop. Opened June 2010. |
| Point Campus | `relation 9851551` | north of the stop | student residence |
| Tom Clarke (East Link) Bridge | `way 1082558265` etc. | -6.2274 | lifting bascule, 1984 |
| Bus stops | `1163627564` "North Wall Quay (3Arena)", `9933585412` "Point Village", `2415245411` "Convention Centre / 3Arena" | | |
| Dublin Bikes "The Point" | `2679055630` | 53.34686, -6.23076 | 40 docks on the quay |

### 1.3 What the game had (before this pass)

- `sites.threeArena = beside('NQ18', 'NQ19', 0.5, 1, 70, 46, { gap: 3 })` was a **70 m x 46 m** box centred mid-block. That is 1.5x too wide: it swallowed the North Dock sites to the west.
- `threeArena()` in `landmarks.js` was a dark box with a barrel roof and a 22 m glazed front on the quay with "3ARENA". **None of that is right.** The quay front is a two-storey 1878 stone-and-brick goods shed, and the hall above it is silver-clad, not dark.
- The Luas Red Line in the game stopped at **Mayor Square (MY2)**. The real line runs on along Mayor Street Upper through **Spencer Dock** to **The Point**.

**The quay nodes are nudged ~10 m (real) north** (streets.json meta). The game's North Wall Quay therefore sits ~15 game m north of the real one, and the arena's real footprint overlaps the carriageway. The hero is anchored to the road instead: its front stands 2.2 m behind the back of the north footpath of NQ18-NQ19, at t = 0.617 along it. That puts the east wall just clear of East Wall Road.

---

## 2. Reference images (`refs/three-arena/`)

All come from Wikimedia Commons (1000 px thumbnails, or the original if smaller). None are from Google.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-front-2025.jpg | [3 Arena (Dublin) in 2025.01.jpg](https://commons.wikimedia.org/wiki/File:3_Arena_(Dublin)_in_2025.01.jpg) | CAPTAIN RAJU | CC0 | 2025-03-16 | **Current look** from the quay (SW): the front block, the rooftop **3Arena** sign (the "3" and coloured bars) on its steel frame, the pixel-panel cladding above, the railings on limestone piers, North Dock One at left |
| 02-front-2009.jpg | [O2 Dublin frontage, 2009.jpg](https://commons.wikimedia.org/wiki/File:O2_Dublin_frontage,_2009.jpg) | William Murphy | CC BY-SA 4.0 | 2009-08-03 | **Key elevation**, straight on: the arcade (3 + door + 3 + door + 3), the red-brick upper floor with its row of windows, the limestone frieze and cornice, the chimneys, the cladding band behind, "The O2" on its frame |
| 03-front-2017-geograph.jpg | [3Arena, Dublin (geograph 5417559)](https://commons.wikimedia.org/wiki/File:3Arena,_Dublin_(geograph_5417559).jpg) | David Dixon | CC BY-SA 2.0 | 2017-05-27 | **Night**, from above the East-Link roundabout: the floodlit stone, the hall's cladding glowing with a pixel pattern, the lit sign, the Exo site under cranes |
| 04-from-east-link-2010.jpg | [O2Dublin july2010.jpg](https://commons.wikimedia.org/wiki/File:O2Dublin_july2010.jpg) | Tonkie | CC BY-SA 3.0 | 2010-07-31 | From the East Link bridge: the front block, the east wall, the stepped silver hall, the lightship |
| 05-across-liffey-2010.jpg | [View across the Liffey towards the O2 arena (geograph 2169064)](https://commons.wikimedia.org/wiki/File:View_across_the_Liffey_towards_the_O2_arena_-_geograph.org.uk_-_2169064.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-11-13 | **Across the river** from Sir John Rogerson's Quay: the front block low on the quay, the white hall rising behind (the Wheel of Dublin was temporary, 2010-11) |
| 06-dusk-maritime-festival-2010.jpg | [The O2 At The Point - Dublin Docklands (4670582832)](https://commons.wikimedia.org/wiki/File:The_O2_At_The_Point_-_Dublin_Docklands_(4670582832).jpg) | William Murphy | CC BY-SA 2.0 | 2010-06-04 | From the south-west across the river: the hall's **west face comes down to the ground**, white, with the logo high up; the old block at right |
| 07-point-depot-1983.jpg | [The (CIE) Point Depot, Dublin (1983)](https://commons.wikimedia.org/wiki/File:The_(CIE)_Point_Depot,_Dublin_(1983).jpg) | Albert Bridge | CC BY-SA 2.0 | 1983-08-29 | The CIÉ depot before conversion: the same arcade with timber goods doors, "POINT DEPOT" and "C.I.E." boards |
| 08-under-reconstruction.jpg | [Point Depot under reconstruction.jpg](https://commons.wikimedia.org/wiki/File:Point_Depot_under_reconstruction.jpg) | Jnestorius | Public domain | c.2008 | The **2008 rebuild**: the front block kept as a shell while the new steel hall goes up behind it and above it. "POINT DEPOT 1878" is carved on the frieze. |
| 09-from-mayor-street-2009.jpg | [The O2 - Spencer Dock Area Of Dublin (3412407809)](https://commons.wikimedia.org/wiki/File:The_O2_-_Spencer_Dock_Area_Of_Dublin_(3412407809).jpg) | William Murphy | CC BY-SA 2.0 | 2009-04-04 | **North gables**, close: rock-faced limestone, red-brick oculi and segmental windows, the hall's **vertical silver planks with grey mesh panels** |
| 10-arena-2013-geograph.jpg | [The O2 Arena at The Point (geograph 3527461)](https://commons.wikimedia.org/wiki/File:The_O2_Arena_at_The_Point_-_geograph.org.uk_-_3527461.jpg) | Eric Jones | CC BY-SA 2.0 | 2013-06-19 | **The triple-gabled north end** from the plaza: an arcade of three arches in each gable, windows, oculi, the east wall at left |
| 11-luas-the-point-2024.jpg | [The Point Luas Stop.jpg](https://commons.wikimedia.org/wiki/File:The_Point_Luas_Stop.jpg) | Jacobfrid | CC0 | 2024-05-01 | The terminus now: tram 3018, the platforms and shelters, the gables with the 3 logo, the Exo, Point Campus |
| 12-luas-terminus-2010.jpg | [The Point-Tosta na Rinne tram terminus (geograph 2124842)](https://commons.wikimedia.org/wiki/File:The_Point-Tosta_na_Rinne_tram_terminus,_Mayor_Street_-_geograph.org.uk_-_2124842.jpg) | P L Chadwick | CC BY-SA 2.0 | 2010-09-10 | The terminus looking east: two trams, sett track bed, shelters, the gables and the plain silver back of the hall |
| 13-exo-from-point-square-2021.jpg | [The Exo, Dublin Docklands, June 2021.jpg](https://commons.wikimedia.org/wiki/File:The_Exo,_Dublin_Docklands,_June_2021.jpg) | DylanGLC2017 | CC0 | 2021-06-19 | The Exo's blue exoskeleton from Point Square, the arena's gables at right |
| 14-front-2010-murphy.jpg | [The O2 At The Point - Dublin.jpg](https://commons.wikimedia.org/wiki/File:The_O2_At_The_Point_-_Dublin.jpg) | William Murphy | CC BY-SA 2.0 | 2010-10-30 | **Driver's eye** from North Wall Quay at the East-Link roundabout: the front and the whole **east wall** (rock-faced limestone, segmental openings in red brick), the pixel-clad hall stepping up behind |

Candidates not downloaded: `The O2 At The Point - Dublin Docklands (4670582832)` (full size), `A Visit to Dublin Docklands - The O2.jpg`, `The O2 In Dublin (5864444928).jpg`, `Tosta na Rinne-The Point LUAS Station` (geograph 2198217, 2257478), `Luas tram 4008 at The Point.jpg`, `The Point Rocket.JPG`. Commons had no night photo of the current 3Arena signage across the river.

---

## 3. Landmark profile

### 3.1 Facts (verified)

- **1878.** Built as a railway goods depot (terminus) at the end of the North Wall. Archiseek and other sources say for the **Great Southern & Western Railway**. It was later a CIÉ goods depot (ref 07). **NIAH 50011169** ("The 02", Regional) dates it 1875-1880 ("dated 1878"), and ref 08 shows "POINT DEPOT 1878" on the frieze.
- **1988.** Converted into a concert and exhibition venue, **The Point** / Point Theatre / Point Depot (6,300 seated or 8,500 standing).
- **2007-08.** Rebuilt as **The O2** by Live Nation and Harry Crosbie for **EUR 80 m**. Architect **HOK Sport (now Populous)**, structural engineer BuroHappold, contractor Walls. Capacity **9,300 seated / 13,000-14,000 standing**, seats in a fan, and no seat more than 60 m from the stage. Opened December 2008. NIAH: *"Gutted and extended above roof and to west c.2008, with front block retained and east and north elevations to triple-gabled shed retained."* Only the outer walls survive.
- **Names.** The O2 (2008-14; O2 paid EUR 25 m for 10 years), then **3Arena from 4 September 2014** after Three bought O2 Ireland.
- **Luas.** The Red Line extension from Connolly/Busáras to **The Point** opened on **8 December 2009**. The Point is the eastern terminus.

### 3.2 Architecture (NIAH 50011169 plus refs)

- **Front block on the quay:** detached, **sixteen bays, two storeys**.
  - **Ground floor:** coursed smooth **limestone ashlar**, a deep moulded limestone cornice above, and **rusticated limestone quoins** at both ends. It is an **arcade in three sets of three arches**, with moulded archivolts on impost mouldings and robust Doric piers, all re-glazed in powder-coated steel screens. **Between the sets stand two round-headed doors in Doric doorcases** (engaged columns, a full entablature) with a **perron** (a limestone platform and steps) and round-headed **sidelights** either side.
  - **First floor:** **red brick in Flemish bond** with a row of windows (16 in ref 14), a **limestone ashlar frieze and parapet cornice**, a red-brick parapet with limestone coping, a **pitched slate roof** and **six red-brick chimneystacks** with limestone caps.
- **East side (East Wall Road), sixteen bays, and the north end:** **random coursed squared rock-faced limestone**, a limestone ashlar plinth and a moulded brick eaves course. **Segmental-headed windows and doors in red-brick surrounds** with limestone sills. A tripartite opening in the middle of the east side has a riveted iron I-beam on two cast-iron Doric columns. The north end is **triple-gabled**, with **an arcade of three arches in smooth limestone in each gable** (ref 10), red-brick **oculi** in the apexes and limestone copings.
- **Forecourt:** stone and concrete paving, **replacement steel railings on six original rusticated limestone piers** with profiled caps (ref 01).
- **The 2008 hall:** a big steel box rising out of the shed and down to the ground on the west. Its cladding is **vertical silver-white translucent planks with scattered grey perforated-mesh panels** in loose diagonals (refs 01, 09, 10), with a plain box-profile metal back towards the Luas (ref 12). It carries the **rooftop sign on a steel frame** over the front: "The O2" in 2009, now **the Three "3" with ARENA and teal, green and pink bars** (ref 01). The logo also appears on the middle north gable and high on the west face (refs 06, 11).
- **Heights** (estimated from the photos against the known front length; no surveyed figure): front block parapet ≈ 14.5 m real (arcade ≈ 7 m, brick floor ≈ 5.5 m, frieze and parapet ≈ 2 m); shed eaves ≈ 10.5 m; gable apexes ≈ 16 m; **the hall ≈ 32-35 m** (refs 04, 06, 14); the sign ≈ 7 m more.

### 3.3 Colours (hex estimates)

| Surface | Hex | Note |
|---|---|---|
| Limestone ashlar (arcade, cornices, piers) | `#c3c2bb` | pale grey (sunlit ref 01 `#cfccc4`, overcast ref 02 `#a9aaa6`) |
| Red brick | `#b25a3c` | orange-red (ref 02) with pale mortar |
| Rock-faced limestone | `#9d9c96` | mid grey with darker blocks (refs 09, 10) |
| Slate | `#4f545a` | |
| Window and screen frames | `#3b3f43` | dark grey powder coat; glazing `#2b343b` |
| Hall cladding | planks `#d5d9db`, mesh panels `#b3b8bb` | silver-white. At night it glows cool white-blue (ref 03). |
| Sign | white "3" and ARENA outlined in black; bars teal `#12a9b4`, green `#86bd3c`, pink `#d8337a` | |

### 3.4 Five recognisable cues

1. The **long two-storey front on the quay**: a **pale limestone arcade** under **red brick**, three sets of three arches with doorcases between (refs 01, 02, 14).
2. The **silver pixel-clad hall** rising well above and behind the old block, at twice its height (refs 04, 05, 14).
3. The **3Arena sign** on its frame on the roof (ref 01).
4. The **rock-faced limestone east wall and triple-gabled north end** with red-brick openings (refs 09, 10, 14).
5. At night: the **floodlit stone, glowing arcade and the LED-lit cladding**, reflected in the Liffey (ref 03).

---

## 4. Build brief, and what was built

### Built (this pass)

**Hero: `tools/blender/build_threearena.py` → `public/models/threearena.glb`** (48 KB Draco, **3,170 triangles**, 8 materials/draw calls, AO baked into vertex colours).

- Built in game metres. Plan: 44 m along the quay (the real footprint at half scale is 45 m) by 54 m deep (62 at half scale; the Luas needs the room). The front block is widened a little relative to the 2008 wing so the arcade keeps its proportions. Heights ≈ 0.72 of real: arcade 5.0 m, parapet 10.8 m, ridge 12.6 m, shed eaves 7.5 m, gables 11.8 m, hall 23.5 m (west wing 21 m), sign top ≈ 29 m.
- **Front block:** real openings with reveals for the 9 arches (glazed screens, moulded archivolts, impost blocks), 2 doorcases (half-round engaged columns, entablature, cornice, perron) with sidelights, and 16 first-floor windows with limestone sills. Also a plinth, rusticated quoins, the ground-floor cornice, the frieze and parapet cornice (swept profiles), brick parapet and coping, slate roof, 6 chimneys, and the rock-faced east gable end.
- **East wall:** 13 bays of segmental doors and windows (atlas decals with their brick surrounds), the tripartite opening, the eaves course and the strip of old roof against the hall.
- **North end:** three rock-faced gables with limestone copings, three-arch arcades, windows, oculi and the Three badge.
- **2008 hall:** a clad box over the shed, the west wing down to the ground with a glazed entrance and canopy, louvres, the **rooftop 3Arena sign on its steel frame**, and the wordmark on the wing.
- **Forecourt:** paving, **six rusticated limestone piers** with caps, and railings (alpha). A paved **plaza** runs out to the Luas.
- **Game side, `src/world/threearena.js`:** paints the tiles (limestone, Flemish-bond brick, rock-faced limestone, slate, paving, cladding) and a 1024 atlas with a matching **night canvas**: warm arcade and windows, the cladding's **LED glow**, and the lit sign. The stone walls take the shared **uplight** (heroes.js, driven by `setStoneNight`). Textures are painted at half size on Low / Battery saver (LITE).
- **Placement:** `sites.js` `arenaFront` / `arenaAt(u, v)`, anchored to NQ18-NQ19 (§1.3). `sites.threeArena` is now 44 x 56.2 m plus a reserved plaza. `landmarks.js` adds the colliders and **five water-glow streaks** (warm under the arcade, cool under the hall) whether or not the model loads, and falls back to the old procedural `threeArena()` if the GLB fails.
- **Luas to The Point:** the Red Line now starts at **PTE → PT (The Point) → MU3 → MU2 → SPD (Spencer Dock) → GS1 → MY2**. The new nodes are PT, PTE and SPD. The route runs straight along Mayor Street Upper and on east past North Wall Avenue, ~7 m north of the gables. The Point has a **stop kit** (`luas.js` STOP_KITS): platforms over the whole berth, shelters, poles and wires. Two related changes:
  - **Terminus logic:** a stop within a tram length of the end of the line is served by the terminus dwell, so trams no longer stop short and then creep to the end (this also affected Mayor Square before).
  - **Sign atlas:** `luasStop.js` now gives each kitted stop its own row, so Heuston's and The Point's signs no longer overwrite each other (up to 4 names).

**Frame cost** (areaperf at the phone default: Low, dpr 1; noisy because other agents share the GPU; p10 GPU ms, hero vs stand-in):

| Spot | Hero | Stand-in |
|---|---|---|
| North Wall Quay looking east | 13.6 ms, 202 calls | 13.3 ms, 194 calls |
| Tom Clarke Bridge looking NW | 16.4 ms, 319 calls | 14.8 ms, 313 calls |
| The Point Luas stop | 19.0 ms, 175 calls | 20.6 ms, 165 calls |

Triangles are unchanged at 0.5-0.9 M. The draw-call increase is the hero's 8 materials plus the stop kit.

### Not built / next

- **The Exo** (73 m, blue exoskeleton), a strong skyline cue from across the river and the East Link. The game's East Wall Road (14 m wide) plus the arena leave no room for it at its real position, and it would need a slimmer footprint or a road tweak. Filler covers the spot for now.
- **The Gibson Hotel and Point Square** stay generic filler.
- **Event platform:** the stop kit builds two platforms, not three.
- **Tom Clarke Bridge** is still the generic bridge: no bascule, and no toll plaza (removed 2016 anyway).

---

## 5. Open questions

1. **Heights.** No surveyed heights exist for the hall or the front block. The figures in §3.2 are photo estimates (±15%).
2. **Front window count.** NIAH says sixteen bays and ref 14 shows ~16 first-floor windows. Ref 02 (straight on, cropped) is consistent. Built as 16.
3. **The Exo:** move East Wall Road's west kerb or slim the tower? See §4.
4. **Luas topology:** the real stop has three platforms and a crossover west of it (`388108407/8`). The game has two tracks and no crossover (trams swap tracks at the end).
5. **Point Village plaza:** the real plaza north of the gables is much larger (the stop sits ~15-20 m from the gables). Game plan compression leaves ~7 m.

## Sources

- OSM via Overpass (ODbL): `data/osm/three-arena.json`
- [NIAH 50011169, The 02, North Wall Quay](https://www.buildingsofireland.ie/buildings-search/building/50011169/the-02-north-wall-quay-east-wall-road-dublin-dublin)
- [3Arena, Wikipedia](https://en.wikipedia.org/wiki/3Arena_(Dublin))
- [Archiseek, 1878 Point Depot, North Wall Quay](https://www.archiseek.com/1878-point-depot-north-wall-quay-dublin/) (found by search; the page itself returned HTTP 429)
- [The Exo Building, Wikipedia](https://en.wikipedia.org/wiki/The_Exo_Building)
- [Point Village, Wikipedia](https://en.wikipedia.org/wiki/Point_Village)
- Wikimedia Commons images as listed in §2

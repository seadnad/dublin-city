# Dublin's tallest buildings and structures

Source list: Wikipedia, "List of tallest buildings and structures in Dublin" (wikitext fetched 2026-09-29): tallest habitable buildings over 50 m, tallest churches, tallest non-building structures, approved and under construction, cancelled. Positions and footprints come from OpenStreetMap (ODbL), Overpass, 2026-09-29. Heights come from the list; where OSM tags a height, it is given in brackets.

The game map is `src/data/streets.json` `meta.bounds`: 53.328-53.3672 N, 6.336-6.22 W. In practice it covers the city inside the canal ring, the eastern Phoenix Park, the Aviva/Ballsbridge edge and the Docklands out to the Point. "In map" below means inside that playable area; a point can be inside the bounds box but still off the street graph.

`tools/scenarios/tallprobe.mjs` prints where each entry lands in game coordinates, which landmark is nearby, the filler heights and the nearest road. `tools/scenarios/tallsites.mjs` prints the roads round each site and takes a top-down shot of it.

## 1. The survey

### Tallest habitable buildings (over 50 m)

| # | Name | Height | Floors | Year | OSM centre | In map? | In the game before | Now |
|---|------|--------|--------|------|-----------|---------|------------------|-----|
| 1 | College Square (tower) | 82.1 m (OSM 83) | 21-22 | 2025 | 53.34665, -6.25545 (way 1536347599; office part 1218589255, 43 m / 11 fl) | yes: Tara St, on the old Hawkins House site | filler, 3 lots, 22 m or lower | **built** |
| 2 | Capital Dock | 79 m | 22 | 2018 | 53.34501, -6.23118 (way 753585705; parts 1271279149-54) | yes: Sir John Rogerson's Quay | filler, up to 32 m | **built** |
| 3 | The Exo Building | 73.8 m (OSM 73) | 17 | 2022 | 53.34765, -6.22749 (way 946426430; tower part 1167524475) | yes: the Point, beside the 3Arena | nothing (the arena's forecourt, the filler north of it) | **built** (tower part, slimmer) |
| 4 | Google Docks (Montevetro) | 65.6 m (OSM 67) | 15 | 2010 | 53.33972, -6.23718 | yes: Barrow St | filler | handled elsewhere (Barrow St / Google campus agent) |
| 5 | Castleforbes Block C2 | 60.7 m | 18 | 2025 | ~53.3505, -6.2310 (construction site, no building in OSM yet) | yes: Docklands north of Mayor St | filler, up to 36 m | not built: no footprint to place it from |
| 6 | Liberty Hall | 60.2 m (OSM 59.4) | 17 (OSM 16) | 1965 | 53.34846, -6.25534 (way 42266091; parts 1488412997-1494460014) | yes: Eden Quay and Beresford Place | filler, 22 m or lower | **built** |
| 7 | One George's Quay Plaza | 59 m (OSM 58.8) | 13 | 2002 | 53.34675, -6.25335 (way 177562798; parts 1488401186-1205) | yes: George's Quay | filler, 22 m or lower | **built** |
| 8 | Sandyford Central, Block D | 57 m | 17 | 2023 | Sandyford, ~53.277, -6.21 | no (southern suburbs) | - | - |
| 9 | Convention Centre Dublin | 55 m | 6 | 2010 | 53.34777, -6.2396 | yes | already built (`sites.convention`) | - |
| 10 | Boland's Quay 1 | 54 m | 13 | 2025 | 53.3394, -6.2354 | yes | filler | handled elsewhere (Barrow St / Grand Canal Quay agent) |
| 11 | Moxy Dublin Docklands (East Wharf) | 52.7 m | 15 | 2024 | 53.35782, -6.23361 (way 1280966368) | inside the bounds box, but in East Wall north of the Royal Canal, 238 m from the nearest street node | outside the street graph (filler backfill only) | not built: off the playable area |
| 12 | Metro Hotel, Ballymun | 52.1 m | 15 | 2005 | Santry Cross, ~53.40, -6.26 | no | - | - |
| 13 | Marshall Yards Block D2 | 51.9 m | 15 | 2025 (topped out) | Castleforbes, not in OSM | yes | filler | not built (as #5) |
| 14 | Castleforbes Block B3C3 | 51.2 m | 15 | 2025 (topped out) | Castleforbes, not in OSM | yes | filler | not built (as #5) |
| 15 | Alto Vetro | 51 m (OSM 52) | 16 (OSM 15) | 2008 | 53.34224, -6.23872 (way 48897785) | yes: Grand Canal Quay and Ringsend Road, where the canal enters the basin | filler, 22 m or lower | **built** |

### Tallest churches

| # | Name | Height | Year | OSM | In map? | Before | Now |
|---|------|--------|------|-----|---------|--------|-----|
| 1 | John's Lane Church (SS Augustine and John), Thomas St | 70.4 m | 1895 | way 49921390, 53.34315, -6.27752 | yes | filler, 23 m or lower | **built** |
| 2 | St Patrick's Cathedral | 66.4 m | spire 1749 | - | yes | already built (Blender hero) | - |
| 3 | St George's Church, Hardwicke Place | 61 m | 1802 | way 42239607, 53.35737, -6.26278 | yes (Hardwicke Place is not in the street graph; the church stands inside its block) | filler, 19 m or lower | **built** |
| 4 | Abbey Presbyterian (Findlater's), Parnell Square | 54.9 m | 1864 | way 231793851, 53.35457, -6.26391 | yes | filler, 22 m or lower | **built** |

### Tallest non-building structures

| # | Name | Height | In map? | In the game |
|---|------|--------|---------|------|
| 1-2 | Poolbeg chimneys | 207.8 / 207.5 m | no (east of the map) | already built (`src/world/farview.js`, seen from the street and the air) |
| 3 | Three Rock transmitter | 152.4 m | no (the mountains) | - |
| 4 | Spire of Dublin | 120 m | yes | already built |
| 5 | Donnybrook (RTÉ Montrose) transmitter | 109.7 m | no (south of the Aviva edge, ~53.318 N) | - |
| 6 | Dublin Airport control tower | 87.7 m | no | - |

### Approved or under construction

| Name | Height | Status | In map? | Now |
|------|--------|--------|---------|-----|
| 26 Parkgate Street | 102 m, 30 fl | permission granted | yes (Parkgate St by Heuston) | not built: it isn't standing yet |
| Tara House (Aqua Vetro), Tara St / George's Quay | 88 m, 22 fl | permission granted | yes | not built: not standing (the old Tara House site is filler) |
| 1/2 Grand Canal Quay | 64.1 m, 15 fl | under construction | yes | handled elsewhere (Grand Canal Quay) |

Cancelled (the Watchtower at the Point, Heuston Gate, the U2 Tower at Britain Quay): not applicable.

### Others the brief named

- **Millennium Tower**, Charlotte Quay (1998). OSM way 48898702 has 63 m and 13 levels; it is usually given as 16 storeys. It is not on Wikipedia's list, but it is a Grand Canal Dock landmark on the east side of the basin, so it is **built**.
- **Hawkins House** was demolished; College Square stands on its site.
- **Heuston South Quarter** (One HSQ, OSM 38 m), **Clarion Quay** (8 fl), **Spencer Dock** (9 fl) and **Hanover Quay/Riverside** (7 fl) are all under 50 m. The Docklands filler already builds 6-15 storeys, so they are left to it.
- **The Gasworks** (Grand Canal St Upper, 53.338, -6.2375) is in the Barrow St area, so it is handled elsewhere.
- **Beckett House**: the OSM feature of that name is low-rise flats on Summerhill, so there is nothing tall to build.
- **St Audoen's** and **St Paul's, Arran Quay** are in the map but well under 50 m. They are candidates for later church work.
- **Rathmines church dome** (Mary Immaculate, 53.32796) lies just south of the map's southern bound (53.328), so it is out of map.
- **Central Bank**, **O'Connell Bridge House**, **Croke Park**, **Aviva**, **Guinness Storehouse / St Patrick's Tower**, **Heuston**, **Four Courts**, **Custom House**, **Christ Church**, **CCJ**, **3Arena** and the **Wellington Monument** already exist.
- **Grand Canal Square** (the Marker, the Hibernian Rd / Misery Hill offices, the theatre) is handled elsewhere.
- Seen in OSM, not on the list, candidates for later: the **Jameson distillery chimney**, Bow St (56 m, way 310207793), and the **Tara Street fire station tower** (40 m, way 1534687394).

## 2. What was built (src/world/towers.js, placed in src/world/sites.js `tall`)

Everything is procedural, in the landmark `Builder`: boxes, prisms and cylinders. Each building has its own painted curtain-wall texture, drawn as three canvases (colour, roughness/metalness, lit windows) covering several bays by several floors so the lit windows don't repeat every bay. This follows O'Connell Bridge House.

All ten buildings are merged into **one mesh per material across the city** (26 meshes, so 26 draw calls). Plans are ~0.55-0.6 of real (0.5 would read too thin beside the uncompressed roads); heights are real.

- **Placement.** Each building starts on its OSM centre and `slideClear()` moves it in 0.25 m steps along the given bearings, taking the shortest clear move. A spot is clear when every sample point is off the carriageways and their footpaths (plus 0.4 m), off the river and the docks, and off any listed neighbour (the 3Arena and its forecourt for the Exo, the Custom House for Liberty Hall, O'Connell Bridge House for College Square). `pull` first draws a street-fronting building back toward its street, so it ends up against its footpath.
- **Materials.** Every tower material carries `FOG_SCALE 0.75`, the Croke Park mechanism, so the towers read on the skyline through the haze. After dark the lit-window maps come up through `setNight()`, and the church stone and lancets are floodlit and glowing.
- **Filler, collision, Places.** Every part is in `reserved` (the filler keeps off it), has a collision box, and is checked by `footprints.mjs`. Eight new Places entries: Liberty Hall, George's Quay Plaza, College Square, Capital Dock, The Exo Building, John's Lane Church, St George's Church, Findlater's Church.
- **From the air.** The aerial far layer (`farview.js` `buildColumns`) captures everything that is not filler, trees or props into its landmark columns. The towers join it automatically; no list needed changing.

| Building | Game footprint | Height | Look |
|----------|----------------|--------|------|
| Liberty Hall | 10.2 x 10.2 m tower + 13 x 11 m theatre wing | 59.4 m | recessed glazed ground floor on white piers; 15 office floors of blue-grey glass between proud white slab edges (the odd warm blind); recessed top floor; the folded verdigris-copper crown (a zig-zag fascia all round) and plant room. After dark the offices light and the top floor and crown glow |
| George's Quay Plaza | 7 blocks, 8.6 m square, stepped diagonally | roofs 31/38/45/52/45/38/31 + 7 m pyramids (59 m) | blue-green glass in a pale grid, stone corner piers and cornice, dark zinc pyramids |
| College Square | tower 15.6 x 13.2 m; office 24 x 18 m | 83 m (79 m + open crown frame); office 43 m | dark bronze frame (two storeys by three bays) over dark glass; the step at the eighth floor; the open frame crown over the roof terrace. Office: two bronze floors, white fins, set-back top |
| Capital Dock | 10 x 10.3 m (22 fl) + 10.2 x 9.7 m (19 fl) + 19.5 x 24.5 m (10 fl) + 7.8 x 7.2 m (9 fl) | 79 / 66 / 36 / 33 m | dark brown brick piers, a pale band every second floor; the towers' top three floors are long glazing |
| The Exo | 9.4 x 20.8 m (slim: 0.5 across) | 73 m | glass box lifted over a recessed ground floor, the sky-blue exoskeleton on both long faces (two tiers of diagonals, verticals at the quarter points), glass screen on the roof. The eight-storey south wing is left out: here it would stand in East Wall Road |
| Millennium Tower | 11.2 x 10.2 m | 63 m to the mast | brick base, cream panels with paired windows, glass balconies stacked on the water-side corners, set-back top, zinc pyramid, mast |
| Alto Vetro | 5.3 x 11.5 m | 52 m | floor-to-ceiling glass, dark slab edges, dark cantilevered balcony boxes staggered up the long faces, glass rail and roof pavilion |
| John's Lane Church | 13.4 x 27.7 m | 70.4 m | granite nave with lancets and a slate roof; the tower on Thomas Street with pale quoins, portal, paired belfry lancets, gablets, four pinnacles and the octagonal spire |
| St George's Church | 13.2 x 22 m | 61 m | pale stone body, Ionic tetrastyle portico and pediment; the steeple (clock stage, belfry with paired corner columns, two octagonal stages, spire) |
| Findlater's Church | 10 x 21.5 m | 54.9 m | limestone nave and slate roof, big traceried gable window to the square; the corner tower (clock, belfry lancets, gablets, pinnacles, spire) and the slate-coned turret on the other corner |

Triangles: about 5.1k for all ten (`towers tris` in `towersperf.mjs`), in 29 merged meshes. Textures: 11 small curtain-wall canvases (up to 256 x 528 px), 3 stone tiles, the lancet and clock canvases. The raw OSM pull is in `data/osm/tallest-buildings.json`.

## 3. Reference images (refs/tallest/, credits in sources.json)

| File | Subject | Author | Licence |
|------|---------|--------|---------|
| libertyhall-1.jpg | Liberty Hall Dublin.jpg | User:O'Dea | CC BY-SA 4.0 |
| libertyhall-2.jpg | Dublin - Liberty Hall - 20081213140315.jpg | KevForkan | CC BY-SA 4.0 |
| libertyhall-3.jpg | The Custom House and Liberty Hall (geograph 3103289) | Eric Jones | CC BY-SA 2.0 |
| libertyhall-4.jpg | Dublin - Eden Quay - SIPTU Liberty Hall (geograph 3966455) | Suzanne Mischyshyn | CC BY-SA 2.0 |
| gqplaza-1.jpg | George's Quay and Ulster Bank across Liffey.jpg | Lumijaguaari | CC BY-SA 3.0 |
| gqplaza-2.jpg | The Ulster Bank Group HQ, George's Quay Plaza (geograph 1743476) | Eric Jones | CC BY-SA 2.0 |
| collegesq-1.jpg | College Square topped out as of September 2025.jpg | Thatguy101ong | CC BY 4.0 |
| collegesq-2.jpg | College Square Under Construction.jpg | SANDROID18 | CC BY 4.0 |
| capitaldock-1.jpg | Capital Dock, Dublin Docklands, June 2021.jpg | DylanGLC2017 | CC0 |
| capitaldock-2.jpg | Capital dock.jpg | William Murphy | CC BY-SA 2.0 |
| exo-1.jpg | The Exo, Dublin Docklands, June 2021.jpg | DylanGLC2017 | CC0 |
| exo-2.jpg | Exo Building.jpg | Andreas Wolf 01 | CC0 |
| millennium-2.jpg | Grand Canal Dock (Charlotte Quay) - panoramio.jpg | William Murphy | CC BY-SA 3.0 |
| altovetro-1.jpg | Alto Vetro.jpg | Sarah777 | CC0 |
| johnslane-1.jpg | NCAD, Dublin, facade on Thomas Street, looking east.jpg | Twilson r | CC BY-SA 4.0 |
| stgeorges-1.jpg | ST. GEORGE'S CHURCH (DUBLIN CITY) REF-1085778.jpg | William Murphy | CC BY-SA 2.0 |
| stgeorges-2.jpg | ST GEORGE'S CHURCH ON GEORGE PLACE (...)-157904.jpg | William Murphy | CC BY-SA 2.0 |
| findlaters-1.jpg | Findlater's church, Parnell Square, Dublin.jpg | Marek Ślusarczyk (Tupungato) | CC BY 2.5 |
| findlaters-2.jpg | Dublin Findlaters Church.JPG | Bernd Haeuser | CC BY 2.5 |

What the references show, and what the models follow:

- **Liberty Hall.** White slab bands with glass ribbons between them. The recessed top storey sits under a scalloped, overhanging verdigris roof, with a small copper plant room on top.
- **George's Quay Plaza.** Blue-green reflective glass framed by pale grey stone corners, with dark zinc pyramid caps. Granite four-storey buildings stand in front on the quay; the filler takes that role.
- **College Square.** Black-bronze two-storey frame modules. The frame runs past the roof as an open crown.
- **Capital Dock.** Dark brown brick with pale bands every two floors, and tall glazing in the top three floors.
- **Exo.** Blue-grey glass with the sky-blue exoskeleton on its long faces, lifted over a recessed base.
- **Alto Vetro.** A thin glass slab with black box balconies.
- **Millennium Tower.** Cream cladding over a brick base, with stacked balconies.
- **The churches.** Grey granite and limestone with pale dressings.

## 4. Checks and numbers

- `footprints.mjs`: 0 footprints on roads. `bridges.mjs`: clean. `streets.json` is untouched.
- Views: `look.mjs` from O'Connell Bridge, the Ha'penny Bridge, the Beckett Bridge, D'Olier St and each building; day and night; `--mobile`. `aerial.mjs` from the helicopter. The sheet is `tallest-buildings-compare.png`.
- Frame cost: `PERF=1 node tools/check.mjs tools/scenarios/towersperf.mjs` shows and hides the towers in the same run. It ran at Low tier, headless, with other sessions sharing the GPU, so the fps numbers are noisy.

  | View | Calls without / with | Triangles without / with |
  |------|----------------------|--------------------------|
  | O'Connell Bridge, looking east | 350 / 369 | 1.224M / 1.232M |
  | Quays, looking east to Capital Dock | 293 / 335 | 1.020M / 1.026M |
  | Helicopter, 200 m, looking east | 480 / 518 | 1.413M / 1.420M |

  The towers add 19 to 42 draw calls (the main pass plus the shadow pass) and under 10k triangles. fps did not change beyond the noise.

## 5. Not done / later

- The Castleforbes / Marshall Yards blocks (#5, #13, #14): no OSM footprints yet, only the construction-site outline.
- The Exo's eight-storey south wing, which here would stand in East Wall Road.
- The Moxy at East Wharf: north of the Royal Canal, off the street graph. It could join the far-view suburbs.
- Tara House / Aqua Vetro and 26 Parkgate Street, if and when they are built.
- The Jameson chimney and the Tara Street fire station tower (not on the list, but skyline features in the map).
- Blender heroes with AO for the three churches, if they are ever to be seen close up. The procedural spires are made for the skyline.

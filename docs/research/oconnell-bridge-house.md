# O'Connell Bridge House (`oconnellBridgeHouse`): research and build

Scope: O'Connell Bridge House, "the Heineken building", the 1960s office tower on the corner of D'Olier Street and Burgh Quay at the south end of O'Connell Bridge, with its extension down D'Olier Street and its illuminated sign.

- Raw OSM: `data/osm/oconnell-bridge-house.json`. Overpass `out geom` (mirror overpass.kumi.systems; the main instance was busy), bbox **S 53.3458, W -6.2600, N 53.3475, E -6.2570** plus a name search. Snapshot `timestamp_osm_base` 2026-06-01T08:52:28Z, 240 elements: buildings and building:parts, highways, bridges, advertising.
- References: `refs/oconnell-bridge-house/` holds 12 images from Wikimedia Commons (credits in §2 and `sources.json`).
- Game coordinates below come from re-implementing `project()` in `src/world/geo.js`. This corner is north of the N-S stretch band and east of the E-W one, so it is a plain 50% projection plus the band's constant northward shift.
- Every request used the generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`. Wikipedia and archiseek text was read through the fetch tool. No personal data was sent.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 The building in OSM (VERIFIED)

`way 903225744`: `building=commercial`, `name=O'Connell Bridge House`, `addr:housenumber=26`, `addr:street=D'Olier Street`, `building:levels=12`, `height=44.2`, `wikipedia=en:O'Connell Bridge House`. The outline covers the tower and the extension together. It is a long wedge running SSE down the east side of D'Olier Street from the Burgh Quay corner, about 60 m long.

| Part (OSM way) | Tags | Real extent | What it is |
|---|---|---|---|
| 109446021 | 12 levels, height 38 | ≈31 m along D'Olier St x ≈15-20 m | **The tower.** A near-rectangle square to D'Olier St (long edges at bearing ≈140°/320°), with its NW end at the Burgh Quay corner |
| 1482828472 | height 42 | the tower's roof | Main roof level |
| 1482818357 | height 42, `roof:colour=aquamarine` | strip on the D'Olier side | Roof edge / plant screen |
| 1482818358 | min 42, height 44.2 | set-back block on the roof | Plant floor (the 44.2 m top) |
| 1482818356 | height 38 | strip along D'Olier St | The 38 m eaves of the D'Olier face |
| 311992340 | 7 levels, height 21 | ≈24 m x ≈15 m, SE of the tower | **The extension** down D'Olier St |
| 1482818359 / 1482818360 | height 24 / 27 | on the extension | Its set-back top floor and the service core |

Tower corner positions (real → game, plain projection):

| Corner | lat, lon | Game (x, z) |
|---|---|---|
| NW tip (D'Olier / Burgh Quay corner) | 53.346871, -6.258497 | 21.7, -22.3 |
| N (Burgh Quay front, east end) | 53.346991, -6.258282 | 28.8, -29.0 |
| E (back, on D'Olier's line) | 53.346777, -6.257979 | 38.9, -17.1 |
| S (D'Olier face, south end) | 53.346665, -6.258205 | 31.4, -10.8 |

- **The front faces the river (NNW), not D'Olier Street.** It is the tower's short end, ≈20 m wide, looking across Burgh Quay to the Liffey, O'Connell Bridge and up O'Connell Street. Its bearing (≈47°) is 25° off Burgh Quay's (≈72°), so a wedge of pavement opens in front of the tower's west half (ref 03 shows it with planters and birches).
- **The long side (≈31 m) is the D'Olier Street face**, looking WSW across D'Olier St to the Lafayette Building and Westmoreland St.
- **Neighbours.** 1-3 Burgh Quay (4 storeys, protected structures, RPS 1014-1016; J.R. Mahon's etc.) adjoin the tower's back on the quay. The Scotch House and Poolbeg House come after them. Down D'Olier St the extension adjoins the Dublin Gas Company building (No. 24, now TCD School of Nursing).
- Highways: D'Olier St (`514848250`, `375737373`, one-way, 3 lanes) starts at 53.34701, -6.25879. Burgh Quay (`1310767085`, `730418127`) is one-way westbound, 2-3 lanes plus a two-way cycle track on the river side. O'Connell Bridge (`23920383`, `369897003` etc.) has 4 lanes plus links.
- No `advertising=*` objects are mapped for the sign.

### 1.2 What the game had

- Only filler buildings (`src/world/buildings.js`) stood in the wedge between D'Olier St (SQ8→DO1) and Burgh Quay (SQ8→SQ9). They were 4-6 storeys, so the view south over the bridge ended in a flat row.
- The game's road graph puts the junction (node SQ8, -1.7/-12.8) ≈25 m SW of OSM's. Its D'Olier St leaves at bearing ≈140° (real ≈144°) and its Burgh Quay at ≈80° (real ≈72°). A building placed from raw OSM coordinates would sit in the middle of the game's Burgh Quay and on the bridge head. **The build places the tower from the game's own roads** (§4.1). Its centre ends up ≈24 m south of the plain projection of the OSM tower, which is consistent with the shifted junction.

---

## 2. Reference images (`refs/oconnell-bridge-house/`)

All are from Wikimedia Commons (1000 px thumbnails, or the original if smaller). None come from Google. Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-front-from-oconnell-bridge-2023.jpg | [O'Connell Bridge House.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Bridge_House.jpg) | Conoronmaps | CC BY-SA 4.0 | 2023-08-30 | **Key elevation.** The river front from the north bank: the glass front, the stone pier with clock, letters and star, the Burgh Quay terrace adjoining, the bridge |
| 02-dolier-street-side-and-extension-2023.jpg | [O'Connell Bridge House extension.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Bridge_House_extension.jpg) | Conoronmaps | CC BY-SA 4.0 | 2023-08-30 | **D'Olier St face**: the full-height grid of narrow bays, the blank stone service core, the 7-storey extension with its set-back top and rail |
| 03-sign-close-2025-a.jpg | [Heineken Building (Dublin) in 2025.01.jpg](https://commons.wikimedia.org/wiki/File:Heineken_Building_(Dublin)_in_2025.01.jpg) | CAPTAIN RAJU | CC0 | 2025-08-16 | **Current sign** (still Heineken): clock, letters and star, the roof mast, the corner pavement with planters |
| 04-sign-close-2025-b.jpg | [Heineken Building (Dublin) in 2025.02.jpg](https://commons.wikimedia.org/wiki/File:Heineken_Building_(Dublin)_in_2025.02.jpg) | CAPTAIN RAJU | CC0 | 2025-08-16 | Same, second frame |
| 05-night-sign-2008.jpg | [Heineken soviet star Dublin night.jpg](https://commons.wikimedia.org/wiki/File:Heineken_soviet_star_Dublin_night.jpg) | Andrius Burlėga | CC BY-SA 3.0 | 2008-12 | **Night**: green neon letters, red star, unlit clock, reflections in the Liffey |
| 06-driver-view-crossing-bridge-2018.jpg | [Crossing O'Connell Bridge - geograph 6053714](https://commons.wikimedia.org/wiki/File:Crossing_O%27Connell_Bridge_-_geograph.org.uk_-_6053714.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | **Eye level from the bridge** looking south: the front, the pier and sign, the ground-floor bar |
| 07-burgh-quay-from-bridge-south-end-2011.jpg | [Burgh Quay from the southern end of O'Connell Bridge - geograph 2264141](https://commons.wikimedia.org/wiki/File:Burgh_Quay_from_the_southern_end_of_O%27Connell_Bridge_-_geograph.org.uk_-_2264141.jpg) | Eric Jones | CC BY-SA 2.0 | 2011-01-21 | Burgh Quay running east from the corner |
| 08-corner-from-westmoreland-2009.jpg | [O'Connell Bridge House, or the Heineken Building - geograph 1578573](https://commons.wikimedia.org/wiki/File:O%27Connell_Bridge_House,_or_the_Heineken_Building_-_geograph.org.uk_-_1578573.jpg) | Stephen Sweeney | CC BY-SA 2.0 | 2009-11-09 | The corner from the Westmoreland side |
| 09-across-the-liffey-2023.jpg | [A View of a Part of River Liffey.jpg](https://commons.wikimedia.org/wiki/File:A_View_of_a_Part_of_River_Liffey.jpg) | XaetaRhythm | CC BY-SA 4.0 | 2023-02-26 | From the Eden Quay boardwalk: the front obliquely, the sign, the bridge, the Ballast Office |
| 10-tower-from-below-2017.jpg | [Dublin Heinken.jpg](https://commons.wikimedia.org/wiki/File:Dublin_Heinken.jpg) | Azerifactory | CC BY-SA 4.0 | 2017-06-22 | Looking up the tower (grid detail) |
| 11-bridge-and-quays-2011.jpg | [Dublin - O'Connell Bridge - 110507 182412.jpg](https://commons.wikimedia.org/wiki/File:Dublin_-_O%27Connell_Bridge_-_110507_182412.jpg) | Barcex | CC BY-SA 3.0 | 2011-05-07 | Bridge and quays context |
| 12-oconnell-street-from-pillar-1964.jpg | [O'Connell Street from Nelson's Pillar in 1964.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Street_from_Nelson%27s_Pillar_in_1964.jpg) | Phillip Capper | CC BY 2.0 | 1964 | O'Connell St south from the Pillar; a tower frame going up at the far end on the left (probably OBH under construction; unconfirmed) |

Not downloaded: `Heineken soviet star Dublin 2.jpg`, `Dublin Heineken Building.jpg` (2006), `Heineken building - panoramio.jpg`, `20130807 dublin08x/09x.JPG` (Jean Housen series), `Dublin (14167263529).jpg`, `Straße in Dublin, Irland (21849510584).jpg`, `2002-05-...Heineken-Building.jpg`.

---

## 3. Landmark profile

### 3.1 Facts
- Architect **Desmond FitzGerald**. Developer John Byrne (Carlisle Trust). It cost about £1 million, and the site was bought in 1961 for £53,000. It replaced **Carlisle House** (1779, Wide Streets Commissioners; a twin of the Ballast Office across the bridge), demolished in 1962. Completed 1964 and opened January 1965. It had a rooftop restaurant until July 1966. Built without parking. Kevin Duff called it "probably the single most brutal intrusion into Dublin's urban design". A loyalist bomb exploded outside in November 1972 (Wikipedia; archiseek).
- **Height** 41.45 m (136 ft) (Wikipedia). OSM has 38 m eaves, 42 m roof and 44.2 m plant top. **12 storeys** (archiseek says 11 above ground). About 45,000 sq ft of offices.
- Structure: "a 12-storey concrete and glass tower faced in Portland stone".

### 3.2 The sign: which, where, history
- **It is not a rooftop sign.** The sign runs **vertically down a blank Portland stone pier** at the west end of the river front (the corner nearest the bridge and D'Olier St), almost the full height of the tower: a **clock** of twelve bold bars and two hands (no dial disc) at the top, **"Heineken."** in upright channel letters stacked one above another, and the **red Heineken star** at the foot (refs 01, 03, 05, 06). It faces NNW, straight at O'Connell Bridge and down O'Connell Street.
- Brands over the years: **Guinness** first (at opening the Guinness sign's lease reportedly earned more than all the office space), then **Sony** and **Coca-Cola**, then **Heineken**, still in place in August 2025 (ref 03, CC0). Exact changeover dates were not found. The Guinness-era arrangement (clock plus vertical name?) is not documented in the sources checked (§5).
- Colours: at night (2008, ref 05) the letters are **green neon** (≈#3dff6e glow; Heineken green is ≈#008200 to #00a13a), the star **red** (≈#e8262b) and the clock unlit. By day in 2023-2025 the letters read as **grey/silver metal** on the pale stone (refs 01, 03, 06); the star is also metal by day.
- Size (from refs 03/06, pier ≈5 m of the ≈20 m front): letters ≈2.5 m tall each, ≈22 m for the stack; clock ≈4 m across; star ≈2.5 m.

### 3.3 Facades
- **River front** (≈20 m): about three quarters is a curtain wall of dark blue-grey glass in slim white frames, in 5 main bays of 2 panes. Each floor has a tall vision pane over a short spandrel pane. The rest is the solid stone **pier** with the sign. A Portland stone frame runs round the edge and a parapet with slots sits on top.
- **D'Olier St face** (≈31 m): ≈17 narrow bays between **full-height Portland stone fins**, each bay 2 panes. The same floor rhythm with a stone parapet.
- **Ground floor**: recessed glazed shopfronts (the corner bar, "River Bar"; shops down D'Olier St, a SPAR) behind stone piers, under a stone fascia band.
- **Roof**: a set-back plant floor, a lattice mast and aerials; the **blank stone service core** at the tower's SE end rises above the roof (ref 02).
- **Extension** (7 storeys): a tall glazed ground floor and first floor, five floors of the same curtain wall in wider stone frames (3-pane bays), a set-back glazed top floor behind a steel rail.
- Colours: stone ≈#d3cdc0 to #dcd7ca (weathered Portland); glass ≈#26323a to #4d6270; frames ≈#e4e2dc.

### 3.4 Five recognisable cues
1. A pale stone and dark glass slab, far taller than anything round it, closing the view south across O'Connell Bridge on the left of Westmoreland St.
2. The solid stone pier on the river front's west end, full height.
3. "Heineken." stacked vertically down the pier, green at night, with the red star below.
4. The bar clock at the top of the pier.
5. The fine vertical grid of stone fins down the long D'Olier St face.

---

## 4. Build (done: procedural, `src/world/landmarks.js` `oconnellBridgeHouse()`)

A gridded block suits the procedural `Builder` (like `grattanOffice` and `gcsOffice`), so no Blender hero was made.

### 4.1 Placement (`src/world/sites.js`, `obh`)
- The tower is square to the **game's** D'Olier St (SQ8→DO1). Its D'Olier face is set back by the road's half width, the footpath and 1.2 m. It slides down D'Olier St until its front corner on the quay side clears Burgh Quay's footpath by 1.2 m. So the tower sits in the wedge whatever the road widths, and the skew to the quay leaves the corner pavement wedge as in reality.
- Local frame: +z is the river front (NNW), +x is the D'Olier St side. The site came out at about (35.9, 3.7), rot -2.44.
- **Plan scale ≈0.65** (tower 12.8 x 20.8 m against a real ≈20 x 31 m). This is a compromise between the half-scale map and the real **height**, which is kept: 4.6 m ground floor + 11 x 3.3 m = 40.9 m, parapet to 41.8 m, plant floor to ≈44.4 m. At half scale the plan read as a needle.
- The extension (`extraSites.obhExtension`) is 13.6 x 15 m behind the tower down D'Olier St, 21.6 m to the parapet plus a set-back top floor (≈25 m).
- `reserved` gets the tower, the extension and a 6.4 x 6 m corner pavement wedge (so the filler leaves the corner open). Colliders cover the tower and the extension. `footprints.mjs` reports 0 on roads; `bridges.mjs` is clean.
- **Places** entry `oconnellBridgeHouse` (appended last, so keys 1-9 are unchanged). Its view is southbound on O'Connell St near the bridge (`spot('OC1','NQ8',0.35)`), with the tower and sign closing the view past the O'Connell Monument. Blurb: "The 1965 tower at the end of the bridge, and its Heineken sign".

### 4.2 Model
- Curtain wall: one 512x528 canvas covering 16 bays x 11 floors (1.6 m bay: a stone fin plus two panes; 3.3 m floor: vision pane over spandrel), mapped by `Builder.facade()` UVs. The same grid is drawn into a roughness/metalness map, so the env reflections (`addReflections`, 0.8) sit on the glass and not the stone. It is also drawn into an emissive map of randomly lit offices (≈26%), which the night level fades in.
- The **pier** is 3.3 x 4.2 m of `portlandSmooth` to the roof. The **sign** is an opaque 3.3 x 34 m panel on its face, painted on the pier's own stone colour (no alpha test, so the letters don't break up at a distance or on phones). It has the bar clock, "Heineken." in bold serif green and the red star. A second canvas holding only the letters and star is the emissive map: 0.12 by day, 1.9 at night, and the clock stays dark.
- Also modelled: the recessed ground floor (dark glass, a warm glow at night) behind stone piers and fascia, stone corner strips and parapet, a plant floor, the stone core rising at the back, a small lattice mast, and the extension (shop floor, the same curtain wall at 3.4 m floors, stone fins, parapet, set-back glazed top, rail).
- **Water glow**: a green streak (width 3.2, length 55) under the letters and a red one (1.8 x 30) under the star, placed on the Liffey due north of the pier (`waterGlowSources`).
- **Cost**: ≈50 boxes plus one plane, about 600 triangles. There are three new materials (glass, sign, shopfront); the rest share landmark materials, so after static batching it adds about 3-5 draw calls in its block. At the key view (headless Chrome on this machine), GPU median was 14.5 ms with it and 13.9-14.0 ms with its own meshes hidden by day; at night the difference was lost in the noise. It is ~0.5 ms of pixel cost where the tower replaces sky; there are no extra lights or passes.

### 4.3 Deliberate deviations
- **Daytime letters are Heineken green, not the real grey/silver metal**, because the owner asked for "the iconic Heineken look". At night they glow green like the neon (ref 05).
- The plan is ≈0.65 scale (see 4.1). The Burgh Quay terrace adjoining the tower is left to the filler.

---

## 5. Open questions
- Exact dates of the Guinness → Sony → Coca-Cola → Heineken changes, and the layout of the original Guinness sign (was there already a clock?).
- Whether the letters are still lit at night in 2025-26 (the 2023-25 day photos show plain metal letters; no recent night photo was found on Commons).
- Whether ref 12 (1964) shows OBH under construction.
- Real floor-to-floor height (the 41.45 m / 12 storeys suggests ≈3.2-3.3 m above a taller ground floor; not confirmed).

## Sources
- OpenStreetMap contributors, ODbL (ways 903225744, 109446021, 311992340, 1482818356-60, 1482828472; highways listed in §1.1).
- Wikipedia, "O'Connell Bridge House" (architect, dates, height, cladding, the sign brands and revenue, Duff quote, the 1972 bomb).
- Archiseek, "1965 – O'Connell Bridge House, D'Olier Street, Dublin" (FitzGerald, Carlisle House, parking, advertising revenue).
- 3D Design Bureau blog, "O'Connell Bridge House: Unraveling its Fascinating History" (rooftop restaurant, Coca-Cola among the brands).
- Wikimedia Commons images as credited in §2.

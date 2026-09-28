# St Patrick's Cathedral: Phase 1 research

Slug: `st-patricks`. Scope: the cathedral, St Patrick's Park to the north of it, the close, Marsh's Library, Patrick St / Nicholas St, Bride St, Kevin St Upper/Lower, St Patrick's Close, Bull Alley St, the Iveagh Trust estate, and the link north to Christchurch Place / High St.

Outputs:
- `data/osm/st-patricks.json`: raw Overpass JSON, 2,239 elements, 3.5 MB. Bbox **53.3368, -6.2760, 53.3422, -6.2670** (S, W, N, E), about 300 m round the cathedral. It contains buildings, building:part, leisure, landuse, amenity, natural, barriers, all highways, trees, street lamps, signals, crossings, bus stops, historic/tourism/man_made nodes and bus route relations (`out geom`). A second small query covered highways in 53.3415..53.3440 / -6.2745..-6.2690 for the Christchurch link. It was not saved; its coordinates are quoted below.
- `refs/st-patricks/*.jpg`: 19 Commons images (see section B).

All "real" distances below are measured from the OSM geometry with an equirectangular approximation at lat 53.3395. "Game" coordinates come from `project()` in `src/world/geo.js`. The site is west of the stretch band, so it gets the uniform 0.5 compression plus a constant westward shift.

---

## A. Map data and comparison with the game

### A1. Is it inside the playable area?
Yes. `meta.bounds` has south = 53.3345 and west = -6.2975. The cathedral centroid is at 53.33957, -6.27164, the park spans 53.3398–53.3406, and Kevin St / New St South reach 53.3363. All of it lies well inside the bounds.

Projected game positions (x east, z south):

| Point | lat, lon | game x, z |
|---|---|---|
| Cathedral west front | 53.33955, -6.27216 | -557.9, 429.7 |
| Cathedral east end (Lady Chapel) | 53.33955, -6.27080 | -512.7, 429.7 |
| Minot's Tower centre | 53.33970, -6.27204 | -553.9, 421.3 |
| Park NW / NE / SE / SW | see A4 | (-555,373) (-492,375) (-484,415) (-556,413) |
| Existing `HS1` (High St / Nicholas St) | 53.34305, -6.2718 | -545.9, 234.9 |
| Existing `NI1` (current end of "Nicholas Street") | 53.3408, -6.2709 | -516.0, 360.1 |

At game scale the cathedral is about 45 m long (real 91 m × 0.5). The park measures about 63 × 40 m, and Patrick St to Bride St is about 75 m.

### A2. What the game has now
Only three street-graph elements come near the site: `Christchurch Place` (LE1–CC1–HS1), `High Street`, and a single "Nicholas Street" way (`CC1`→`NI1`, secondary). Aungier St (`SGG2`–`CU1`) and Cuffe St lie about 250 m east.

**Bug: the existing "Nicholas Street" is in the wrong place.** In OSM, Nicholas Street leaves the High St / Christchurch Place junction at **53.34286, -6.27179**, which is where the game's `HS1` already is. It then runs due south at **lon -6.2722/-6.2723**. The game's way starts at `CC1` (-6.2706) and ends at `NI1` (-6.2709), about 95–100 m (real) too far east. That line actually runs through the Iveagh Trust blocks and the Iveagh Play Centre / Liberties College site. It should be deleted and replaced by `HS1 → NC1 → NC2 → …` (see A6).

Everything south of about 53.341 between Francis St and Aungier St is currently empty: there are no ways, no park, and no landmark. The procedural filler (`buildings.js`) places lots along street frontages, so this block will stay blank until streets are added.

Note: node IDs `PS1`, `PS2`, `NS1`–`NS3` and `NW2` **already exist** (Trinity: Pearse St, Nassau St). The IDs proposed below avoid them; I checked every proposed ID against `streets.json`.

### A3. Streets from OSM (real-world facts)

| Street | OSM class / ref | Lanes, direction | Notes |
|---|---|---|---|
| **Patrick Street** | secondary, R137, 50 km/h | 53.3389–53.3402: **4 lanes, two-way**. 53.3406–53.3415: **dual carriageway**, two 2-lane one-way carriageways with centrelines about 9 m apart (SB at -6.27224, NB at -6.27238) | Cycle lanes both sides; cycle track on the east side along the park. Signals at Bull Alley (53.3406) and at Bride Rd / St Nicholas Pl (53.3415). |
| **Nicholas Street** | secondary, R137 | Pair of one-ways, 2 + 3 lanes, NB/SB split at Back Lane (53.3422) and merging at High St (53.34286, -6.27179) | Continues Patrick St north to Christchurch Place / High St |
| **New Street South** | secondary, R137 | one-way pairs, 2–3 lanes | South from the "Four Corners" (53.3389, -6.27266). Bus lane shared with bikes (`cycleway:left=share_busway`) on the SB section south of 53.3378 |
| **Kevin Street Upper** | secondary, R110 | 4 lanes (2 fwd / 1 back + extra); a separate 1-way service arm on its north side | Four Corners → east to Bride St (53.33815, -6.26930) |
| **Kevin Street Lower** | secondary, R110 | 2–3 lanes | Bride St → east to Aungier / Cuffe junction (game `CU1`) |
| **Dean Street → The Coombe** | secondary, R110 | 2–3 lanes | West from the Four Corners |
| **Bride Street** | tertiary, 30 km/h | 2–3 lanes, two-way south of Bull Alley; one-way northbound pieces near Bride Rd | Cycle tracks; share_busway on the section beside the park (53.3393–53.3404) |
| **Bull Alley Street** | tertiary | **one-way westbound** (Bride St → Patrick St), 1–2 lanes | North edge of the park; Iveagh Play Centre / Liberties College on its north side |
| **Bride Road** | tertiary | one-way westbound, 2 lanes | Bride St → Patrick St at 53.3415, past Iveagh Baths |
| **St Patrick's Close** | unclassified, `access=destination` | **one-way**, from Patrick St (53.33937, -6.27257) east past the cathedral's south side, then south to Kevin St Upper (53.33836, -6.27072) | Setts (`surface=sett`) at the Patrick St mouth. Marsh's Library and the Deanery sit on it |
| Werburgh St | tertiary | one-way | Bride St north end (53.34212, -6.26998) → Christchurch Place (53.34319, -6.26994) |
| Golden Lane, Peter St, Chancery Lane, Ross Rd, Bride Close, John Field Rd | tertiary / residential | minor | Optional side streets |

- Widths: no `width` tags exist on the main roads. Suggested game widths (streets.json widths are uncompressed metres): Patrick St 16, Nicholas St 14, Kevin St Upper 14, Bride St 10, Bull Alley / Bride Rd 8, St Patrick's Close `lane` (6, reads as setts).
- **The game does not model one-ways.** No way has an `oneway` key and `geo.js` has no support for one. Nicholas St, Bull Alley, Bride Rd and the Close will be two-way unless that feature is added (open question).
- Bus: the stop **"Patrick's Cathedral"** (53.33943, -6.27265, west kerb, southbound) has `route_ref` 27; 49; 54a; 56a; 74; 77a; 150; 151. Route relations crossing the bbox include 27, 56a, 77a, 74, BusConnects F1/F2/F3, 783 (Airport) and the Hop-On Hop-Off tour. Patrick Street is a busy radial with frequent double-deckers, but it has **no bus lane tagged** in OSM. Only Bride St (beside the park) and New St South carry `share_busway`.
- Traffic signals (OSM): Patrick/Bull Alley (53.34065, -6.27242), Patrick/Bride Rd (53.3415), Four Corners cluster (53.3387–53.3391), Bride/Bull Alley (53.3406, -6.2702) and Bride Rd/Bride St.
- Street lamps: 252 `street_lamp` nodes in the bbox (178 on poles, 59 on walls). Photos (15, 16) show ornate cast-iron lamp standards painted silver-grey, with a scroll bracket and crest, on the Patrick St pavement in front of the west door. There are also plain modern poles.

### A4. The park polygon (OSM way 19830551, `leisure=park` + `barrier=fence`, start_date 1901)
- Area **10,812 m²** (measured). About 126 m E–W × 75–83 m N–S; a trapezoid whose NE corner is chamfered by the Bride St curve.
- Real corners, simplified:
  - NW 53.34057, -6.27208 (Patrick St × Bull Alley)
  - NE 53.34054, -6.27019 (Bull Alley × Bride St)
  - E 53.33988, -6.26993 (Bride St, beside the tea-rooms)
  - SE 53.33981, -6.27009
  - SW 53.33985, -6.27210 (Patrick St, at the cathedral railings)
- South edge: there is **no street** there. The park meets the cathedral's north lawn (`landuse=recreation_ground` strip, 114 × 12 m) along a 2 m black metal railing (way 345209790, `fence_type=railing`, `height=2`, `colour=black`).
- In-game ring (parks are rings of node IDs, inset by the adjacent road width): **`PK1 → BD3 → BD2 → PK2`**. PK2 and BD2 are extra shape nodes on Patrick St and Bride St at lat 53.3399. The south edge PK2–BD2 has no road, so `roadInsetFor` gives it the default 5 + 3.5 = 8.5 m inset. That is slightly too much: the park should almost touch the cathedral grounds. Either accept it or add a per-park override (open question).
- Contents (OSM + NIAH 50080682 + photos):
  - **Main fountain.** The basin (`natural=water`, named "Saint Patrick's Well") is 15 × 10 m, centred at 53.34022, -6.27118, with a ring path round it. The fountain itself is a Victorian two-tier cast-iron / stone bowl on a pedestal, dark bronze-grey, in a low granite-kerbed round pool (08, 11).
  - **Second smaller fountain** on the E–W axis at 53.34020, -6.27055 (smaller ring path; photo 18 shows a slim stone drinking-fountain column).
  - **Main axis**: a straight E–W path from the Patrick St gate (about 53.3402, -6.2722) to the east terrace steps (53.3402, -6.2704). There are curved paths and a perimeter path, all laid in **red-brown clay pavers** with granite kerbs (NIAH: "bounded by granite setts").
  - **East terrace ("Literary Parade")**: a raised brick terrace along the Bride St edge (retaining wall 345008075, 88 m long) with elliptical-headed alcoves in red brick and limestone. NIAH says it served as a bandstand and sheltered seating. The alcoves hold the Dublin Millennium 1988 **Literary Parade** bronze plaques (photos 09, 20). Steps at each end have 19 and 13 steps per OSM `step_count`, so the terrace is about 2.5–3 m high.
  - SE corner: the park constable's lodge (red brick, now "The Tram Café" / tea-rooms, 53.33987, -6.2703; photo 07) and public toilets.
  - Artworks: **Liberty Bell** by Vivienne Roche, 1988 (53.33999, -6.27053), a pair of tall white/steel bell shapes (photo 18, left); **Sentinel** by Vivienne Roche, 1994 (53.33990, -6.27213, at the Patrick St gate); a playground strip on the west side (6 × 17 m); a St Patrick's Well plaque.
  - Railings: NIAH records **cast-iron railings with fleur-de-lis heads**, painted black, on a low granite plinth round the whole perimeter.
  - Trees: OSM maps only 14 in or near the park, untagged, at the edges (53.3400–53.3406). Photos show large mature broadleaves along Bull Alley and Patrick St (lime/plane-like, 15–20 m), weeping willows / birches beside the cathedral's north side (01, 04), a pink flowering cherry (02) and clipped Irish yews / conifers (03, 07). Species are unverified.
- Bench nodes: 5 mapped. Photos show many timber-slat benches on black cast-iron ends along the paths, plus black litter bins.

### A5. Buildings (OSM)

| Building | OSM | Real footprint | Height / levels | Material / notes |
|---|---|---|---|---|
| **St Patrick's Cathedral** | way 43981182, 50-point outline | **90.7 m E–W × 46.5 m N–S**, 2,682 m² | parts below | Grey calp limestone; `heritage=4` |
| Nave (main vessel) | part 1483654281 | 46.2 × 11.8 m | **16.7 m**, gabled, `roof:colour=darkgrey` | 7 bays (NIAH) |
| Nave aisles N / S | parts 1483654302 / 1483654291 | about 43 × 6.6 m / 32 × 6.6 m | skillion (lean-to) | |
| Transept arms N / S | 1483654283 / 1483654282 | each about 11 m wide, 23 m long | 16.7 m, gabled | Across the transepts: 46.5 m (OSM), 160 ft = 48.8 m (Wikipedia) |
| Choir | 1483654284 | 24.5 × 11.1 m | 16.7 m, gabled | |
| Lady Chapel (east end) | 1483654295 | 13.2 × 11.4 m | gabled | c.1270 (NIAH) |
| **Minot's Tower** | 756391815 / 1483654306-10 | about 12.2 × 12.4 m at the NW corner | tower **40 m**, 4 corner turrets **43 m**, spire part **65 m** total with `roof:height=25`, `roof:material=stone` | `ref:dove=12646` (bells) |
| **Marsh's Library** | 229658261 | 35 × 32 m L-plan, 452 m² | no tag; photos show 2 tall storeys + hipped slate roof (about 10–11 m) | Red brick, 1701–1710, Sir William Robinson (Wikipedia) |
| The Deanery | 229658265 | 30 × 19 m | – | Kevin St Upper / Close |
| Cathedral Grammar / Choir School | 664944806 + 664944040-44 | small blocks at the SW corner | 1–4 levels, hipped | on Patrick St south of the Close |
| **Iveagh Play Centre / Liberties College** | 227816946 (building), 495994503 (college) | **67 × 29 m** | 3 levels, `height=12`, brick | Faces the park across Bull Alley (photo 11) |
| Iveagh Trust Blocks A–H | 517301260/263, 517306012/014/015, rel 15462263/64, 19731697 | each about 22–25 × 18–22 m | **5 levels**, `building:material=brick`, `roof:shape=mansard`, `roof:colour=darkgrey` | A–D on Patrick St east side (53.3407–53.3414), E–H on Bride St |
| Iveagh Trust North Block | 229316776 | 56 × 30 m | 4 levels + roof level | |
| Iveagh Baths | 229316754 | 54 × 18 m | – | Bride Rd |
| Patrick St west side, opposite the cathedral | 227816933 | 72 × 110 m | **6 levels, gabled** | Modern brick apartments (red / buff, balconies; photos 04, 15) |
| Patrick St west, opposite the park | 227816947, 227816926 | 22 × 84 m, 15 × 65 m | 4–5 levels | Apartments |
| St Nicholas of Myra | 227816935 | 51 × 36 m | – | RC church, Francis St |
| Garda Divisional HQ / former Kevin St station | 555953959 / 74578293 | 30 × 103 m, 44 × 47 m | 5 levels | Bride St / Kevin St |
| Hotels | 1512628994 (citizenM, Bride St), 472789981 (Maldron, Kevin St), 466918379 (Hyatt Centric, Dean St) | large | 5 levels | modern |

Level data: of 289 buildings in the inner area, 139 carry `building:levels` (mostly 2–5). The other 150 are untagged; treat them as 3–4.

### A6. Proposed road-layout additions (OSM coordinates, simplified)

New node IDs (all free) with their game projections:

```
NC1   [53.34224,-6.27222]  (-559.9, 280.0)  Nicholas St × Back Lane
NC2   [53.34150,-6.27228]  (-561.9, 321.2)  Nicholas/Patrick × Bride Rd × St Nicholas Pl
PK1   [53.34065,-6.27230]  (-562.5, 368.5)  Patrick St × Bull Alley (park NW)
PK2   [53.33990,-6.27240]  (-565.9, 410.2)  Patrick St at park SW / cathedral railings (shape node)
PK3   [53.33935,-6.27257]  (-571.5, 440.8)  Patrick St × St Patrick's Close (west door)
PK4   [53.33890,-6.27266]  (-574.5, 465.9)  "Four Corners": Kevin St Upper / Dean St / New St South
NSS1  [53.33755,-6.27245]  (-567.5, 541.0)  New Street South
NSS2  [53.33632,-6.27315]  (-590.8, 609.5)  New Street South (continue to bounds if wanted)
KV1   [53.33846,-6.27118]  (-525.3, 490.4)  Kevin St Upper
KV2   [53.33836,-6.27072]  (-510.0, 495.9)  Kevin St Upper × St Patrick's Close (S end)
KV3   [53.33815,-6.26930]  (-462.9, 507.6)  Kevin St × Bride St × New Bride St
KV4   [53.33773,-6.26830]  (-429.6, 531.0)  Kevin St Lower  (then → existing CU1)
BD1   [53.33923,-6.26930]  (-462.9, 447.5)  Bride St × Peter St
BD2   [53.33990,-6.26965]  (-474.5, 410.2)  Bride St at park SE (shape node)
BD3   [53.34059,-6.27005]  (-487.8, 371.8)  Bride St × Bull Alley × Golden Lane (park NE)
BD4   [53.34150,-6.27008]  (-488.8, 321.2)  Bride St × Bride Rd × Chancery Lane
BD5   [53.34212,-6.26998]  (-485.4, 286.6)  Bride St → Werburgh St
WB1   [53.34319,-6.26994]  (-484.1, 227.1)  Werburgh St × Christchurch Place (insert into LE1–CC1)
SC1   [53.33931,-6.27218]  (-558.5, 443.1)  St Patrick's Close (SW of cathedral)
SC2   [53.33889,-6.27071]  (-509.7, 466.4)  St Patrick's Close (bend by Marsh's Library)
DN1   [53.33914,-6.27347]  (-601.4, 452.5)  Dean St
CB1   [53.33940,-6.27473]  (-643.3, 438.0)  The Coombe
PT1   [53.33939,-6.26698]  (-375.4, 438.6)  Peter St east end (toward Whitefriar / Aungier)
```

Ways, with real and game lengths:

| Priority | Way | Nodes | type / width | real → game m |
|---|---|---|---|---|
| 1 | **Delete** "Nicholas Street" CC1–NI1 (and node NI1 if unused) | | | |
| 1 | Nicholas Street | HS1, NC1, NC2 | secondary, 14 | 177 → 88 |
| 1 | Patrick Street | NC2, PK1, PK2, PK3, PK4 | primary, 16 | 291 → 146 |
| 1 | Bull Alley Street | BD3, PK1 | secondary, 8 | 150 → 75 |
| 1 | Bride Street | KV3, BD1, BD2, BD3, BD4, BD5 | secondary, 10 | 450 → 225 |
| 1 | Werburgh Street | BD5, WB1 (and insert WB1 into Christchurch Place between LE1 and CC1) | secondary | 119 → 60 |
| 1 | Kevin Street Upper | PK4, KV1, KV2, KV3 | primary, 14 | 240 → 120 |
| 1 | Kevin Street Lower | KV3, KV4, CU1 | secondary | 281 → 184 (partly in the stretch band) |
| 2 | St Patrick's Close | PK3, SC1, SC2, KV2 | lane (setts) | 194 → 97 |
| 2 | Bride Road | BD4, NC2 | secondary, 8 | 146 → 73 |
| 2 | New Street South | PK4, NSS1, NSS2 | primary | 296 → 148 |
| 3 | Dean St / The Coombe | PK4, DN1, CB1 | secondary | 149 → 74 |
| 3 | Peter St | BD1, PT1 | lane | 155 → 88 |
| 3 | Golden Lane / Stephen St Upper, Francis St, Back Lane | – | lane | optional connectors west and east |

Park entry for `streets.json` `parks`: `"St Patrick's Park": ["PK1","BD3","BD2","PK2"]`.

Relationship between the cathedral and Patrick St (real): the west front (lon -6.27216) is **about 24 m** east of the Patrick St centreline (about -6.27252 at lat 53.3395). Behind the pavement there is a narrow forecourt with black railings on a dwarf wall, bollards and Sheffield bike stands (photos 05, 15). The tower occupies the NW corner, so from Patrick St the tower stands on the **left** of the west front for a southbound driver and on the right for a northbound one. The west front is directly on axis with St Patrick's Close. In game units, with Patrick St at width 16 + 3.5 m pavement, the west front should sit about **2–3 m behind the back of the pavement** (railings on the line).

---

## B. Reference images (`refs/st-patricks/`)

All are from Wikimedia Commons, downloaded at 1280 px (the `iiurlwidth=1000` thumb bucket), and licensed CC0, CC BY or CC BY-SA. I viewed every image.

| File | Source | Author | Licence | Shows |
|---|---|---|---|---|
| 01-cathedral-from-park-diliff.jpg | [Commons](https://commons.wikimedia.org/wiki/File:St_Patrick%27s_Cathedral_Exterior,_Dublin,_Ireland_-_Diliff.jpg) | Diliff | CC BY-SA 3.0 | **Classic view** from the NE across the park: north transept gable with triple lancet, pinnacled flying buttresses, tower + spire, main fountain, brick paths, benches |
| 02-cathedral-park-panorama.jpg | [Commons](https://commons.wikimedia.org/wiki/File:St_Patrick%27s_Cathedral_and_St_Patrick%27s_Park_(42089473071).jpg) | Sonse | CC BY 2.0 | Wide panorama: Iveagh Play Centre (red brick, copper cupola) on the left, park, fountain, cathedral, red-brick flats on Patrick St |
| 03-park-yair-haklai.jpg | [Commons](https://commons.wikimedia.org/wiki/File:St._Patrick%27s_Park,_Dublin.jpg) | Yair Haklai | CC BY-SA 4.0 | From the raised east terrace, looking W over the second fountain / paths to the cathedral |
| 04-tower-zairon-1.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_St._Patrick%27s_Cathedral_Exterior_Tower_1.jpg) | Zairon | CC BY 4.0 | Minot's Tower + granite spire close-up: crenellated corner turrets, louvred belfry lancets, clock, weeping tree, railings |
| 05-facade-zairon-2.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_St._Patrick%27s_Cathedral_Exterior_Facade_2.jpg) | Zairon | CC BY 4.0 | **West front from the Patrick St pavement**: triple lancet, blue west door, clock face, railings, bollards, bike stands |
| 06-choir-zairon-1.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_St._Patrick%27s_Cathedral_Exterior_Choir_1.jpg) | Zairon | CC BY 4.0 | East end: Lady Chapel, pinnacles, slate roofs, pale quoins against dark rubble |
| 07-park-zairon-1.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_St._Patrick%27s_Park_1.jpg) | Zairon | CC BY 4.0 | From the SE of the park: brick lodge / tea-room, balustrade, planting, spire |
| 08-park-fountain.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Fountain_in_St_Patrick%27s_Park,_Dublin_-_geograph.org.uk_-_7591287.jpg) | Marathon | CC BY-SA 2.0 | Main fountain bowl and pool, north transept behind |
| 09-park-plaque.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Plaque_in_St_Patrick%27s_Park_in_Dublin_-_geograph.org.uk_-_7591299.jpg) | Marathon | CC BY-SA 2.0 | Literary Parade 988–1988 bronze plaque on limestone |
| 10-bull-alley-park.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_-_Bull_Alley_Street_-_St_Patrick%27s_Park_-_geograph.org.uk_-_3965991.jpg) | Suzanne Mischyshyn | CC BY-SA 2.0 | North part of the park: big trees, shrub banks, benches, steps to the terrace |
| 11-liberties-college-bull-alley.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Liberties_College,_Bull_Alley.JPG) | DubhEire | CC0 | **Iveagh Play Centre** facade across the park axis: red brick, Portland stone, copper cupola; fountain + paver axis in the foreground |
| 12-iveagh-buildings.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Iveagh_Buildings_Dublin.jpg) | Andreas Wolf 01 | CC0 | Iveagh Trust inner street (Bride Close) with red brick flats; spire in the distance |
| 13-iveagh-trust-geograph.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Iveagh_Trust_Buildings_-_geograph.org.uk_-_7534700.jpg) | Gerald England | CC BY-SA 2.0 | Iveagh Trust block from the street: red brick, orange terracotta bands, slate mansard + dormers, black railings; traffic |
| 14-marshs-library.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Marsh%C2%B4s_Library.jpg) | Sitomon | CC BY-SA 2.0 | Marsh's Library entrance: red brick, hipped slate roof, pedimented porch, steps from the Close |
| 15-west-facade-patrick-st-borchert.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_St._Patrick%27s_Cathedral_West_Fa%C3%A7ade_at_Patrick_Street_2012_09_26.jpg) | Andreas F. Borchert | CC BY-SA 4.0 | **Driver's-eye**: west front + tower from the Patrick St / Dean St corner with traffic and an ornate lamp standard |
| 16-cathedral-milo.jpg | [Commons](https://commons.wikimedia.org/wiki/File:St._Patrick_Cathedral_-_Dublin,_Ireland_-_Travel_photography_(40128098514).jpg) | Giuseppe Milo | CC BY 2.0 | **Night**: floodlit cathedral (green, for St Patrick's Day) with bus light trails on Patrick St |
| 18-st-patricks-close.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_-_St_Patrick_Close_-_St_Patrick%27s_Cathedral_1254-1270)_-_geograph.org.uk_-_3965969.jpg) | Suzanne Mischyshyn | CC BY-SA 2.0 | Actually taken in the park: stone drinking fountain, Liberty Bell sculpture (left), brick paving, cathedral |
| 19-nicholas-street-zairon.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_Nicholas_Street_22.jpg) | Zairon | CC BY 4.0 | Texture reference: orange-red Victorian brick, moulded brick bands, red door (Nicholas St) |
| 20-park-panoramio-strip.jpg | [Commons](https://commons.wikimedia.org/wiki/File:St._Patrick%27s_Cathedral_Park_-_panoramio.jpg) | FinlayCox143 | CC BY-SA 3.0 | Panorama from the east terrace: brick alcove arcade (Literary Parade) on both sides, Play Centre, Iveagh blocks |

- Not downloaded: four small geograph originals ("St Patricks Cathedral – 70974", "88442", "The northern end of Nicholas Street – 3150203", "Liberties College from St Patrick's Park – 3150176"). upload.wikimedia.org kept returning HTTP 429. They are listed on Commons if needed later.
- Excluded: "Aerial view of the Iveagh Trust Buildings" (PNG). It looks like a screenshot of commercial 3D imagery, so there is no freely licensed aerial. Also excluded: "St Patrick's Tower" (a different landmark, the Thomas St windmill) and interior shots.
- **Mapillary**: not used, because it needs an API token and none is available. OSM links Mapillary image 1932682054173214 on Minot's Tower.
- **Panoramax** (open street-level imagery) has three photos linked from the OSM objects, taken 2025-10-10 by "jg13". They are **Etalab-2.0**, which is CC BY-compatible but not on the approved list, so **I did not download them**:
  - `e01ee691-90b1-4b39-a4bd-e6804da35130` at 53.33986, -6.27224, azimuth 196: **south along Patrick St, driver's-eye**
  - `91ea56c7-bc12-4085-b384-be29d1114907`, azimuth 107: at the tower
  - `f37e25a1-b97c-49e1-a793-85693a63c33e`, from inside the park, azimuth 80
  - URL pattern: `https://panoramax.ign.fr/api/pictures/<id>/sd.jpg`

---

## C. Landmark profile

### C1. Cathedral architecture (sources inline)
- **Style / dates.** Early English Gothic, built 1191–1270 (Wikipedia). NIAH 50080680 dates the fabric to c.1220–1260 and describes a "freestanding cruciform-plan … seven-bay nave, full-height gabled transepts to north and south, side aisles to nave and transepts, lady chapel to east end added c.1270, square-profile five-stage bell tower to north-west corner added c.1400, steeple added c.1749". Wikipedia says the tower and west nave were rebuilt 1362–70 under Archbishop Minot, and that the current appearance is largely the Benjamin Lee Guinness restoration of 1860–65.
- **Dimensions.**
  - Length: 300 ft = 91.4 m external, 287 ft internal (Wikipedia infobox). OSM gives 90.7 m.
  - Width across the transepts: 160 ft = 48.8 m (Wikipedia). OSM gives 46.5 m.
  - Nave with aisles: about 25 m wide (OSM parts: 11.8 m nave + 2 × 6.6 m aisles). Nave vessel about 46 m long, choir about 24.5 m, Lady Chapel about 13 m (OSM parts).
  - Main roof / wall height: 16.7 m (OSM `height` on the nave, transept and choir parts). Ridge estimated at about 22–23 m from photo 05 proportions against the 40 m tower; this is an estimate.
- **Minot's Tower + spire.**
  - Tower "147-foot" = 44.8 m, "walls ten feet thick", Irish limestone. Granite spire "101 feet high, designed by George Semple … 1749". Two clock dials, 8 ft (2.4 m) diameter, on the **W and N** faces. Source: [stpatrickscathedral.ie/the-cathedral-tower](https://www.stpatrickscathedral.ie/the-cathedral-tower/).
  - Overall height **66.4 m / 218 ft** (Wikipedia, *List of tallest buildings and structures in Dublin*). OSM: tower 40 m, turrets 43 m, spire top 65 m (`roof:height` 25 m). Wikidata Q846365 gives height 43 m, which is the tower.
  - The figures conflict: 147 + 101 ft = 75 m, which disagrees with 66 m. **Use 40 m to the parapet, 43 m to the turret tops, 66 m to the cross.**
  - Photos 04 and 15 show the tower: 5 stages marked by string courses, **crenellated parapet with four taller crenellated corner turrets**, paired louvred belfry lancets with tracery, and a clock with black face and gold numerals on the W and N faces.
  - The spire rises from inside the parapet. It is pale grey granite, slender and faceted (appears octagonal), with a gilt cross.
- **Walls.** NIAH: "snecked calp limestone walls with cut limestone quoins, corbel tables, and string courses". Also "dark calp limestone with the lighter limestone used for the dressings". Roofs are "pitched slate roofs … crenellated battlements". Windows are "lancet openings … dressed limestone surrounds … hood mouldings".
- **Visible features** (photos 01, 05, 06, 15):
  - The west front is a gabled centre block hidden behind a crenellated screen, with square corner turrets. It has a big triple lancet over a deep, moulded, pointed west door painted **royal blue**, and lower traceried windows to the aisles.
  - The north transept has a triple-lancet gable with crenellated corner turrets.
  - The clerestory has **flying buttresses with pinnacles** along the nave and choir, and slender spirelet pinnacles at the choir / transept corners.
  - Aisle buttresses have gabled offsets. The ashlar quoins read much paler than the rubble walls, a strong "striped" edge effect.
- **Colours** (hex estimates by eye from photos 01, 04, 05, 06, 15; not measured):
  - Calp rubble walls: `#76726B` (range `#5E5B56`–`#8A857D`)
  - Limestone dressings / quoins: `#B0ACA3`
  - Granite spire: `#A8A59D` (warmer and lighter than the tower)
  - Slate roofs: `#4F545A`
  - Lead / dark window glass: `#2A2D33`
  - West door: `#2C3E9A`
  - Clock face: `#15171A` with gold `#C9A441`
  - Railings: `#141414`
- Surroundings: churchyard lawns N and S; the south graveyard is `amenity=grave_yard`, 893 m². The **Benjamin Lee Guinness statue** (J.H. Foley) stands outside the south door (OSM node at 53.33937, -6.27178; Wikipedia). There are black railings on a dwarf wall along Patrick St and the Close.

### C2. The park (NIAH 50080682, OSM, photos)
- Laid out in 1901 by Lord Iveagh (Edward Cecil Guinness) on cleared slum housing (Wikipedia, Iveagh Trust). Opened July 1902 by Edward VII. Landscaping by Mr Crasp of Chester (NIAH).
- Layout: rectangular, formal, on an E–W axis. The main fountain sits in a round pool, a second fountain further east, and a raised brick terrace with alcoves at the east end (the Literary Parade plaques, 1988). Paths are red-brown clay pavers edged with granite kerbs; flower beds; a lodge / tea-room at the SE corner.
- Boundary: black cast-iron railings with fleur-de-lis heads (NIAH) on a granite plinth, about 1.5–2 m. The cathedral side has a 2 m black railing (OSM).
- Colours (estimates):
  - Grass `#5E8F3B`
  - Paver path `#8C5E50`
  - Granite kerbs `#9A968E`
  - Fountain bronze / iron `#4A4640`
  - Terrace brick `#A0493A` with limestone `#C9C3B6`

### C3. Neighbours
- **Iveagh Play Centre / Liberties College** (Bull Alley, facing the park; photos 02, 11): 3 storeys, 12 m. Red brick with **Portland stone** banded pilasters, a shaped central Baroque gable with oculus and balustrade, ball finials, and a **green copper cupola**. Portland `#DAD4C5`, brick `#A7452D`, copper `#5F9E8B`.
- **Iveagh Trust flats** (1890s–1900s; photos 12, 13): 5 storeys, bright orange-red brick `#B0502F` with orange **terracotta** string courses and gables `#C96A3C`, slate **mansard** roofs with dormers and tall chimneys (OSM `roof:shape=mansard`, `roof:colour=darkgrey`), black railings.
- **Marsh's Library** (1701–1710; photo 14): red brick, 2 tall storeys, hipped slate roof, pedimented porch. It lies behind a wall off the Close and is barely visible from traffic, so it counts as secondary.
- Patrick St west side: modern 4–6 storey brick apartment blocks (buff / red with balconies), a Spar and pubs at the Four Corners ("The Fourth Corner", 50 Patrick St).

### C4. Instantly recognisable cues (checked against the photos)
1. **The tall pale granite spire on a crenellated square tower** at the cathedral's NW corner, with turrets at four corners and a clock. Seen from Patrick St and over the trees of the park (01, 04, 15). At 66 m it is the second-tallest object in the game after The Spire, so it will read from far up Nicholas St.
2. **The long grey Gothic cathedral seen across an open formal park** with a Victorian fountain in the foreground: the classic postcard view from the NE (01, 03, 08).
3. **The west front right on Patrick St**: triple lancet, blue door and black railings, at the end of the 4-lane road (05, 15).
4. **Red brick with Portland stone and a copper cupola** on the Iveagh Play Centre across Bull Alley, plus the orange-red Iveagh flats with mansards along Patrick St / Bride St. This is the warm red backdrop against the grey cathedral (02, 11, 13).
5. Pale ashlar quoins and flying buttresses with pinnacles against dark rubble: the texture that separates it from Christ Church.

### C5. Traffic and street furniture
- Patrick St / Nicholas St is part of the R137 north–south route (Christchurch → Kevin St / New St). It is 4 lanes with signals and a dual carriageway north of Bull Alley. Many Dublin Bus double-deckers use it (8 routes at the cathedral stop).
- Wikipedia (Patrick Street) notes the road widening that fragmented the medieval area. The Four Corners (Patrick / Kevin / Dean / New St) was historically "the Four Corners of Hell" and "Cross Poddle".
- Furniture:
  - Ornate silver-grey cast-iron lamp standards along the cathedral frontage (15)
  - Black steel bollards and Sheffield bike stands (05, OSM `bicycle_parking` ×4)
  - Bus shelter at the cathedral stop (`bench=yes`, `bin=yes`)
  - Painted utility-cabinet murals (Dublin Canvas, OSM)
  - Black litter bins, timber benches
- Night: the cathedral is floodlit (16).

---

## D. Build brief

### D1. Prioritised checklist
1. **Road layout (streets.json).**
   - Delete the misplaced Nicholas St (CC1–NI1).
   - Add the P1 ways from A6: Nicholas St, Patrick St, Bull Alley, Bride St, Werburgh St, Kevin St Upper / Lower.
   - Insert WB1 into Christchurch Place.
   - Then add the P2 ways: Close, Bride Rd, New St South.
   - Run the game and check that the junction at `HS1` still resolves (Nicholas St, High St and Christchurch Place all meet there).
2. **Park.** Add `"St Patrick's Park": ["PK1","BD3","BD2","PK2"]`. Railings come for free via `buildRailings`. The default cross-path renderer draws a perimeter path plus one diagonal. The real layout wants an **E–W axis path, a round pool with the fountain at about 45% from the west, and the raised east terrace**, which needs a small custom park dressing (like `fusiliersArch` for Stephen's Green).
3. **Hero GLB: St Patrick's Cathedral.** 12k–18k tris, one 2048² atlas, bevelled edges, baked AO.
   - Footprint at game scale: **about 50 × 24 m**, roughly ×0.55 E–W and ×0.5 N–S. This matches the existing Christ Church model (46 × 22). A ×0.6 N–S footprint collides with the Close and the park inset.
   - Heights: **keep real heights**, as the game does for The Spire (121 m) and filler storeys. Walls 16.7 m, aisle eaves about 9 m, tower parapet 40 m, turrets 43 m, spire tip 66 m (+ 2 m cross).
   - Orientation: long axis E–W. Tower at the **NW** corner, west front facing Patrick St, north transept facing the park.
   - Parts: nave + clerestory, lean-to aisles, N/S transepts with crenellated turret gables, choir, lower Lady Chapel at the east, flying buttresses with pinnacles (instance them), west front screen + triple lancet + blue door, tower with 4 turrets, louvred lancets, 2 clock faces (W, N), faceted granite spire + gilt cross.
   - Atlas regions: calp rubble with pale quoin edge strips, ashlar dressings, slate, granite spire courses, lancet window (dark glass with tracery, emissive at night), door, clock.
   - Anchor it `beside('PK3','PK2', …)` or at `project(53.33955,-6.27150)` with the west front 2–3 m behind the Patrick St pavement.
   - Night: warm floodlight on the tower / spire.
4. **Surrounding buildings.**
   - **Iveagh Play Centre**: a small custom landmark, about 3–4k tris. A red-brick box with Portland pilasters, central shaped gable, cupola; 67 × 29 m real → about 34 × 15 m game, 12 m tall. It faces the park across Bull Alley.
   - **Iveagh Trust blocks** on Patrick St east (A–D) and Bride St (E–H): use the filler `BRICK` style forced to orange-red brick, 5 floors, with a mansard / dormer roof if the filler supports it.
   - Patrick St west side: generic 5–6 storey modern brick apartments (OSM levels 4–6).
   - Marsh's Library: a simple hipped red-brick box (about 18 × 16 m game, 11 m) set back behind a wall on the Close (low priority).
   - Cathedral Grammar School / Deanery: generic 2–3 storey.
5. **Park dressing.**
   - Main fountain in a 15 × 10 m (real) round pool, about 800 tris.
   - Second small fountain, about 300.
   - Liberty Bell sculpture, about 300.
   - East brick terrace with 8–10 alcoves and steps, about 1.5k.
   - SE lodge / tea-room, about 400.
   - Benches and bins (reuse existing props).
   - Trees: mature broadleaves along Bull Alley / Patrick St, 2–3 weeping trees near the cathedral railing, 1 pink cherry, a few clipped yews.
6. **Street furniture on Patrick St.** Ornate silver lamp standards in front of the cathedral, bollards, bike stands, a bus shelter + stop sign at PK3 (west kerb), and signals at PK1 / NC2 / PK4.
7. **Teleport site.** `view: spot('PK1','PK3', …)` looking south along Patrick St at the tower. A second candidate is from Bull Alley looking SW across the park.

### D2. What to texture vs keep generic
- **Texture (unique):** cathedral atlas, Play Centre facade, fountain / terrace details.
- **Parametric / filler:** Iveagh flats (brick style), apartments, hotels, school, Deanery.
- **Generic:** roads, pavements, railings (existing), trees, benches, lamps (existing ornate standard if the game has one).

### D3. Triangle budget for the area
| Item | Budget |
|---|---|
| Cathedral hero GLB | 12k–18k |
| Iveagh Play Centre | 3k–4k |
| Park dressing (fountains, bell, terrace, lodge) | 3k |
| Marsh's Library + Deanery (simple) | 1k |
| Filler buildings (instanced, existing system) | existing budget |
| Trees / props (instanced) | existing budget |
| **Total new unique geometry** | **about 20k–26k** |

### D4. Open questions
1. **One-way streets.** Nicholas St, Bull Alley, Bride Rd and the Close are one-way in reality, but the game has no one-way support. Keep them two-way, or add a `oneway` flag for AI traffic?
2. **Patrick St dual carriageway** north of Bull Alley. Model it as one wide way (16–18 m), or as a boulevard with a median? The existing median logic is only for `boulevard`, which is 30 m and too wide.
3. **Park south-edge inset.** `roadInsetFor` uses a default 8.5 m on the non-road edge PK2–BD2. Accept that gap as the cathedral's north lawn (it matches reality: a lawn strip sits between the park railing and the cathedral), or allow a per-edge override?
4. **Heights vs footprint.** The cathedral at real height (66 m spire) on a halved footprint will look slender. That is right for the spire but may make the nave look tall. Consider scaling walls ×0.85 while keeping the tower / spire at real height, and compare with Christ Church in-game (its tower is modelled at 31 m).
5. **Tower height sources disagree.** The cathedral site gives 147 ft tower + 101 ft spire = 75 m. Wikipedia's list gives 66.4 m and OSM gives 65 m. I recommend 66 m total; confirm if precision matters.
6. **Spire section.** It appears octagonal in photos 04 and 15. Confirm from a closer photo before modelling.
7. **Tree species** in the park are untagged in OSM. The large trees along Bull Alley and the weeping trees by the cathedral need confirming (lime / plane? willow vs birch?) if species-specific models exist.
8. **Panoramax Etalab-2.0 images.** The driver's-eye view south along Patrick St would be a useful reference. Is Etalab-2.0 acceptable?
9. **Extent south.** New Street South and Clanbrassil St continue to the bounds (53.3345). How far should P2 go? I suggest stopping at NSS2 (53.3363).
10. **Werburgh St node.** WB1 must be inserted into the existing Christchurch Place way (LE1–WB1–CC1). Check that this doesn't disturb the Christ Church / Synod Hall bridge placement, which uses `HS1`, `SQ2` and a corridor across Winetavern St.

### Sources
- OSM via Overpass (`data/osm/st-patricks.json`; way IDs cited inline)
- NIAH: [St Patrick's Cathedral 50080680](https://www.buildingsofireland.ie/buildings-search/building/50080680/saint-patricks-cathedral-patrick-street-saint-patricks-close-dublin-8-dublin), [St Patrick's Park 50080682](http://www.buildingsofireland.ie/niah/search.jsp?type=record&county=DU&regno=50080682)
- [St Patrick's Cathedral: The Cathedral Tower](https://www.stpatrickscathedral.ie/the-cathedral-tower/)
- Wikipedia: [St Patrick's Cathedral, Dublin](https://en.wikipedia.org/wiki/St_Patrick%27s_Cathedral,_Dublin) (infobox length / width, history), [List of tallest buildings and structures in Dublin](https://en.wikipedia.org/wiki/List_of_tallest_buildings_and_structures_in_Dublin) (66.4 m), [Iveagh Trust](https://en.wikipedia.org/wiki/Iveagh_Trust), [Marsh's Library](https://en.wikipedia.org/wiki/Marsh%27s_Library), [Patrick Street, Dublin](https://en.wikipedia.org/wiki/Patrick_Street,_Dublin)
- Wikidata [Q846365](https://www.wikidata.org/wiki/Q846365) (height 43 m, material limestone)
- Wikimedia Commons images as listed in section B

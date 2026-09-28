# Heuston Station (`heuston`): Phase 1 research

Scope: Heuston Station (the Kingsbridge head building and train shed), the forecourt and Heuston Luas stop, Seán Heuston Bridge, Frank Sherwin Bridge, Victoria Quay, Wolfe Tone Quay and Parkgate Street, St John's Road West, Steevens Lane, Military Road, and Dr Steevens' Hospital.

- Raw OSM: `data/osm/heuston.json`. Overpass `out geom`, bbox **S 53.3435, W -6.2975, N 53.3490, E -6.2875** (about 660 m E-W by 610 m N-S, centred on the head building). Snapshot `timestamp_osm_base` 2026-09-28T16:18:06Z, 1,497 elements. It holds buildings and building:parts, highways, railway (tram, rail, platform), public_transport, bridges, water, landuse and leisure, trees, taxi, bus stops and historic features.
- References: `refs/heuston/` holds 16 images from Wikimedia Commons (credits in §2).
- Mapillary: **not used**. It needs an API token and none is available. OSM does carry Mapillary IDs on a few Parkgate Street buildings (for example `725471786255233`, `593702332569590`) if a token turns up later.
- Game coordinates below come from re-implementing `project()` in `src/world/geo.js` (origin 53.34727/-6.25915, SCALE 0.5, the 1.6x stretch band, then a constant west shift). Everything in this area is west of the band, so **x is shifted about 0.6x(band width) further west than a plain 50% projection. Game x/z below already include that.**

---

## 1. Map data: what is really there, and how the game differs

### 1.1 Where the station sits (VERIFIED)

**The station lies NORTH of St John's Road West, between the road and the Liffey.** The game has it the wrong way round.

| Element | Real position (OSM) | Game (x, z) |
|---|---|---|
| Head-building east front, centre | 53.34656, -6.29220 | -1223.7, 39.5 |
| East front, north end (wing corner) | 53.34684, -6.29236 | -1229.1, 23.9 |
| East front, south end (wing corner) | 53.34627, -6.29225 | -1225.4, 55.7 |
| Train shed / station polygon, west end | ~53.34655, -6.2960 | -1350, 40 |
| Liffey south bank beside the station | 53.34717 (-6.2919) to 53.34668 (-6.2945) | z ≈ 6 to 33 |
| St John's Road West beside the station | 53.34597-53.34614 | z ≈ 63-72 |

- The station polygon (`way 23007779`, `building=train_station`, "Dublin Heuston", granite, start_date 1846) is ~260 m E-W and ~94 m N-S, and covers the head building plus the shed. A small separate west annexe is `way 60357539`.
- **The head building faces EAST.** Its principal front runs roughly N-S (edge bearing about 172°/352°, so it looks about 8° north of due east) onto the forecourt. The Luas platforms sit in that forecourt, and beyond them are the Victoria Quay / St John's Road West / Steevens Lane junction and Frank Sherwin Bridge. NIAH also calls this the "front (east) elevation". It does **not** face north onto the road.
- **The north side** runs along the Liffey. A service road, the set-down area and a car park lie between the building and the river wall (`way 353368592/3/5`, one-way, 10 km/h, permissive access). This side is not a public through-road.
- **The south side** faces St John's Road West, across a single-storey granite arcaded range (booking office and former restaurant; ref 09). The taxi rank (`node 975320532`, 53.34608, -6.29405) and the "Heuston Station" bus stops 2637/135101 are on this side.
- **Dr Steevens' Hospital** (`relation 1643349`, HSE head office, ochre render, slate mansard) stands directly south of St John's Road West, across the road from the SE corner of the station. Its footprint is lat 53.34505-53.34570, lon -6.29294 to -6.29163, and a lawn and garden (`way 46542025`) lie between it and the road. **This is exactly where the game currently puts Heuston.**

### 1.2 What the game does now (src/world/sites.js, landmarks.js)

- `heustonAt()` offsets the site by `south = {x: dir.z, z: -dir.x}`, where dir runs SJ1 to SJ3 (westward). That vector points **+z, which is south**. The site centre comes out at about (-1266, 103) and the head front at about (-1215, 92). The true front centre is (-1224, 40). **The station is about 52 game m (≈105 m real) too far south, on top of Dr Steevens' Hospital and its lawn.** The fix is to use the north side (negate `south`), or better, place it from absolute OSM coordinates.
- The along-road offset is roughly right (the front sits ~22 game m west of SJ1; the real figure is ~20).
- The comment "head building facing east over a forecourt to Steevens Lane" is half right. It faces east, but the forecourt is the Luas stop, bus bays and a lawn, and Steevens Lane is **not** open to cars at its north end (see 1.4).
- The `heuston()` model has these errors:
  1. **"Domed corner towers."** The model puts 6.4 m-square, 17.5 m towers with drums and **copper** domes at the front corners of the main block. Really there are **two small square open bellcotes** (belfries). They stand on the **recessed single-storey wings** either side of the main block, ~16 m out from it, not at its corners. Each has round-headed openings, corner columns, small pediments and a **stone** dome with oculi and an acorn finial (NIAH; refs 01, 05, 06). They are stone grey, not copper.
  2. **Massing.** The model makes the whole 34 m width one 13 m block with a 12 m projecting centre. Really it is a **9-bay, two-storey main block plus attic, 107 ft (32.6 m) wide and ≈19 m to the top of the parapet**, flanked by **3-bay single-storey wings, each 53 ft (16.2 m) wide** and set back about 4-5 m. The whole front is ≈65 m.
  3. **No projecting centre and no clock.** The front is flat, articulated by 8 three-quarter Corinthian columns plus end pilasters. There is no clock on the east front (checked in refs 01, 02, 03, 07). The attic carries four carved coats of arms and the inscription panels "VIII VIC" and "AD 1844".
  4. **Train shed.** The model has three equal gables on 8 m granite walls. Really it is a **multiple-pile pitched roof of corrugated iron and glass on cast-iron arcades and steel trusses, with red-brick walls in Flemish bond, a blind arcade on the north side and granite coping** (NIAH 50080031). The shed runs ~200 m+ west of the head building; the model's shed is ~88 game m.
  5. **Colour and material.** `0xcfc6b4` with the generic facade texture is too warm and light. The granite is a neutral mid-grey (§3.3).

### 1.3 Luas Red Line (currently stops at Smithfield/AQ1 in the game)

Real route west of Smithfield (OSM ways 352511043, 317127413, 352511216, 338055463/1125052320/4937056 on the bridge, 278157012/013 through the stop, 344548754/351689346 down Steevens Lane):

| Proposed node | Real lat, lon | Game x, z | Notes |
|---|---|---|---|
| (Smithfield stop, real) | 53.34715, -6.27778 | - | The game's AQ1 is at 53.34625, -6.2774, which is **not** the real stop position. Leave that to the Smithfield researcher. |
| BB0 Queen St / Benburb St | 53.34717, -6.28016 | -823.7, 5.6 | The line leaves Queen St here and runs west along **Benburb Street** |
| BB1 **Museum** stop | 53.34787, -6.28673 | -1042.0, -33.4 | Beside Collins Barracks (National Museum) |
| BB2 Benburb St west | 53.34797, -6.28924 | -1125.4, -39.0 | Benburb St is paved and access=no here (trams, pedestrians, emergency vehicles) |
| BB3 curve at Parkgate St | 53.34793, -6.29146 | -1199.2, -36.7 | Tight curve south onto the bridge (10 km/h) |
| HB0 Seán Heuston Bridge, N | 53.34768, -6.29186 | -1212.5, -22.8 | ≈ the game's WT3 (-1213.4, -40.6); reuse WT3 |
| HB1 Seán Heuston Bridge, S | 53.34710, -6.29180 | -1210.5, 9.5 | North end of the stop |
| HS **Heuston** stop (centre) | 53.34666, -6.29172 | -1207.8, 34.0 | Platforms run 53.34640-53.34710 |
| HS2 crosses St John's Rd W | 53.34619, -6.29162 | -1204.5, 60.1 | ≈ SJ1 (-1202.2, 51.8) |
| SL1 Steevens Lane | 53.34527, -6.29150 | -1200.5, 111.3 | Cars can only use Steevens Lane from here south |
| SL2 Steevens Lane | 53.34367, -6.29124 | -1191.9, 200.4 | |
| JS3 (existing) | 53.34325, -6.2914 | -1197.2, 223.8 | Then west along James's St towards James's stop (outside this brief) |

- The line is **N-S through the forecourt**, not along the quays. From Benburb Street it curves south across Seán Heuston Bridge, runs through the stop in front of the east facade, crosses St John's Road West at SJ1, and goes south up Steevens Lane.
- **Stop layout** (OSM platforms `way 232338755`, `278157011`, `232338761`, plus ref 11): **two tracks with three platform strips.** There is a west side platform (≈53 m x 5-7 m) next to the station and bus bays, a narrow central island between the tracks (≈40 m x 4 m, hatched), and an east side platform (≈52 m x 5-6 m) backed by a low granite wall and the lawn. Three shelters (`way 904142597/8/9`) are tagged height 3 m: 10 m x 3.5 m, 8.5 m x 3.3 m and 7 m x 1.3 m, all glass on a steel frame. There are ticket machines, grey OCS poles with span wires, and "Heuston" nameplates.
- There is a crossover south of the bridge (`way 352511215`).

### 1.4 Roads: corrections and additions

The game has no `oneway` field. The one-way notes below are for AI traffic direction in a later phase.

| Game way | Reality (OSM) | Action |
|---|---|---|
| **St John's Road West** VQ2-SJ1-SJ2-SJ3, width 14 | Positions match OSM well. It is a **dual carriageway**: westbound 2 lanes (`332207648`, `4402007`, 1 bus lane) and eastbound 2 lanes (`33854097`, `372838333`), cycle lanes and track, 50 km/h (60 km/h west of Military Rd). Between VQ2 and SJ1 it swings N-S past the east side of the Luas stop. | Keep the nodes. Widen to ~16 m with a thin median. **Put the station on its north side.** |
| **Steevens Lane** SJ1-JS3 (secondary) | **Wrong for cars at the north end.** From SJ1 to 53.34527 (≈100 m real) it is the Luas alignment plus `service=emergency_access, access=no` (`way 1465735223`). The public road (`23347664`, unclassified, 2 lanes, 30 km/h) runs from James's St only as far north as Dr Steevens' gate at 53.34527. | Split it at a new node SL1 (53.34527, -6.29150). Make SJ1-SL1 tram/pedestrian only (`pedestrian: true`, or leave it out of the road graph). Keep SL1-JS3 as a `lane` of about 7 m. |
| **Frank Sherwin Bridge** WT2-VQ2, width 14 | Real deck ≈27 m wide x ≈42 m long, three-span reinforced concrete (1982). **One-way northbound**: 2 lanes plus a slip lane, a cycle track and a footway. It is R148 and carries the quays system (south quays westbound, north quays eastbound). | Nodes fine. Width ≈18-20. Flat 3-span deck with plain concrete parapets and steel railings. |
| **Victoria Quay** UI1-VQ1-VQ2 | One-way westbound (R148), 2 lanes (1 bus lane) plus a cycle track. A short spur (`162745571`, "Victoria Quay", 3 lanes) continues west to the forecourt at 53.34705, -6.29163. | Optional spur VQ2 to FC1. |
| **Wolfe Tone Quay** SQY-WT1-WT2-WT3 | East of WT2 it is one-way **eastbound** (R148). West of WT2 (WT2-WT3, 53.34759 to 53.34778) it is **two-way**, 3 lanes (R109), and continues as Parkgate St. | Fine. |
| **Parkgate Street** WT3-PG1 | R109, two-way, 3 lanes (2 west, 1 east incl. bus lane). A parallel one-way service road runs on the north side (`1117941878`, `161736182`). | Fine. |
| *missing* **Seán Heuston Bridge** | Pedestrians plus Luas only (`way 43332025`/`344548756`, `access=no` for vehicles). Deck from 53.34717, -6.29182 to 53.34765, -6.29186; OSM bridge outline ≈52 m long x ≈10-11 m wide. | Add WT3 to HB1 as a `bridge` way with `pedestrian: true`, width ≈9. It needs an arch profile (not the generic one) and Luas rails on the deck. |
| *missing* **forecourt PSV loop** | One-way southbound bus/taxi road hard against the east front: FC1 53.34697, -6.29224 to 53.34675, -6.29211 to 53.34657, -6.29204 to FC2 53.34624, -6.29186, joining St John's Rd W (`6273592`, `1374865048`, `908947161`, `488652979`, `psv=yes`). Bus stops 4319, 4320 and 4425 are on it. | Add as a `lane` (~6 m). Treat it as a bus and taxi place, not a driving route. |
| *missing* **north service road / set-down** | 53.34697, -6.29224 west to 53.34663, -6.29512 along the river (two one-way lines plus a "Set-down area" drive-through). | Optional `lane`. It gives the station's north side a visible road edge along the river. |
| *missing* **Military Road** | Tertiary, 2 lanes, 30 km/h. It leaves St John's Rd W at 53.34583, -6.29617 (game -1355.7, 80.2) and runs south to 53.34425, -6.29656 (game -1368.6, 168.1), then on to the Royal Hospital Kilmainham. | Optional: add node MR1 on SJ2-SJ3 and a short stub. |
| *missing* **Benburb Street** | West part is pedestrian plus Luas (`49036343`); see 1.3. | Add as `pedestrian: true` (a Luas corridor). |

**The river.** `geo.js` pins the first north and south bank points (WT3, VQ2) to `bounds.minX`, so west of Frank Sherwin Bridge the game Liffey is a straight channel at constant z. Really, the river west of Seán Heuston Bridge **narrows to ≈35-45 m and bends south-west**:
- south bank: 53.34717 at -6.2919, 53.34700 at -6.2926, 53.34677 at -6.2936, 53.34668 at -6.2945, 53.34683 at -6.2960, 53.34709 at -6.2971
- north bank: 53.34764 at -6.2920, 53.34742 at -6.2927, 53.34709 at -6.2938, 53.34703 at -6.2946, 53.34718 at -6.2959, 53.34738 at -6.2975

The game's straight channel runs from about z -31 to z +19 (north bank at WT3 z plus quay half-width, south bank at VQ2 z minus it). That leaves room for the station (north edge at about z 23). It is an acceptable simplification, but a proper bend would help the shot from the north bank (ref 04). **Open question** (§5).

**Other context from OSM:**
- Trees: 16 in the forecourt area. Silver birches (*Betula*) flank the east front at 53.34676/-6.29223, 53.34683/-6.29226, 53.34638/-6.29213 and 53.34632/-6.29210. A row of five stands on the island at 53.34660-53.34683, -6.29152.
- A grass strip (`232338759`) lies between the east Luas platform and the SJRW carriageway, with low hedges and trees in front of it (ref 03).
- Pedestrian paved areas: `904142594`, `904142596`.
- A covered cycle shelter for 200 bikes stands at the west end (53.3466, -6.2973).
- Dublin Bikes station, Galway Hooker outdoor seating at the north wing.

---

## 2. Reference images (`refs/heuston/`)

All are from Wikimedia Commons at 1000 px thumbnails (or the original if smaller), and all are CC BY-SA. None come from Google. Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-east-front-from-luas-platform.jpg | [Heuston Station Dublin 2018.jpg](https://commons.wikimedia.org/wiki/File:Heuston_Station_Dublin_2018.jpg) | Antony-22 | CC BY-SA 4.0 | 2018-05-03 | **Key elevation.** Straight-on east front from the east Luas platform: the 9 bays, both bellcotes, the attic with arms and VIII VIC / AD 1844, the shelters, a double-deck bus in the PSV bay |
| 02-east-front-with-buses.jpg | [Dublin - Heuston Station - East front - geograph 4276070](https://commons.wikimedia.org/wiki/File:Dublin_-_Heuston_Station_-_East_front_-_geograph.org.uk_-_4276070.jpg) | Colin Park | CC BY-SA 2.0 | 2014-05-13 | East front, 3/4 from the SE, with the south bellcote, buses and shelters |
| 03-driver-view-from-frank-sherwin-junction.jpg | [Heuston Station - geograph 6423021](https://commons.wikimedia.org/wiki/File:Heuston_Station_-_geograph.org.uk_-_6423021.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | **Driver's eye** from the Victoria Quay / Frank Sherwin junction looking west, dusk, facade floodlit green. Shows the lawn, hedges and trees in front |
| 04-from-north-bank-across-liffey.jpg | [Dublin, Heuston Railway Station - geograph 5199574](https://commons.wikimedia.org/wiki/File:Dublin,_Heuston_Railway_Station_-_geograph.org.uk_-_5199574.jpg) | David Dixon | CC BY-SA 2.0 | 2016-07-12 | From the north bank across the river: the front with both bellcotes, the quay wall, Seán Heuston Bridge railing |
| 05-ne-corner-north-wing-bellcote.jpg | [Heuston Station, Dublin - geograph 375413](https://commons.wikimedia.org/wiki/File:Heuston_Station,_Dublin_-_geograph.org.uk_-_375413.jpg) | Peter Gerken | CC BY-SA 2.0 | 2007-02-15 | The main block from the NE, the recessed north wing with bellcote and balustrade, the two-storey north return with chimneys |
| 06-bellcote-and-central-block-detail.jpg | [Heuston Station - geograph 6007826](https://commons.wikimedia.org/wiki/File:Heuston_Station_-_geograph.org.uk_-_6007826.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | **Bellcote detail**: open arches, pediments, stone dome, finial; wing doorway; rusticated arcade; Corinthian columns; swags |
| 07-attic-inscriptions-swags-detail.jpg | [Heuston Station Facade - geograph 6021904](https://commons.wikimedia.org/wiki/File:Heuston_Station_Facade_-_geograph.org.uk_-_6021904.jpg) | kevin higgins | CC BY-SA 2.0 | 2019-01-11 | Frontal detail of the upper storeys, attic cartouches and ground arcade (texture source) |
| 08-south-side-from-st-johns-road-west.jpg | [Dublin Heuston railway station - 2025-11-23](https://commons.wikimedia.org/wiki/File:Dublin_Heuston_railway_station_-_2025-11-23.jpg) | 瑞丽江的河水 | CC BY-SA 4.0 | 2025-11-23 | From St John's Road West (SE): the south bellcote, the long single-storey south range running west, guard railing |
| 09-arcaded-range-and-railings.jpg | [Heuston Station - geograph 3730267](https://commons.wikimedia.org/wiki/File:Heuston_Station_-_geograph.org.uk_-_3730267.jpg) | Darrin Antrobus | CC BY-SA 2.0 | 2013-08-14 | The south-side Tuscan-column arcade (booking office range) on St John's Rd W, with granite chimneys and pedestrian guard rail |
| 10-train-shed-interior.jpg | [The train shed at Dublin Heuston station - geograph 4911699](https://commons.wikimedia.org/wiki/File:The_train_shed_at_Dublin_Heuston_station_-_geograph.org.uk_-_4911699.jpg) | John Lucas | CC BY-SA 2.0 | 2016-04-14 | Shed interior: iron trusses, glazed ridge strips, cast-iron columns |
| 11-luas-stop-two-trams.jpg | [Dublin, Heuston tram stop - geograph 2507485](https://commons.wikimedia.org/wiki/File:Dublin,_Heuston_tram_stop_-_geograph.org.uk_-_2507485.jpg) | Dr Neil Clifton | CC BY-SA 2.0 | 2011-07-09 | Stop looking south: two tracks, hatched central island, west platform and shelters (right), east platform wall (left), Dr Steevens' behind |
| 12-sean-heuston-bridge-elevation.jpg | [Sean Heuston Bridge - geograph 6026986](https://commons.wikimedia.org/wiki/File:Sean_Heuston_Bridge_-_geograph.org.uk_-_6026986.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | **Bridge elevation** from the south bank: white cast-iron arch with dark rib, crown and scroll spandrel panels, "1821" plate, granite abutments and piers, lamps |
| 13-luas-on-sean-heuston-bridge-parapet.jpg | [Luas tram crossing Sean Heuston Bridge - geograph 6007811](https://commons.wikimedia.org/wiki/File:Luas_tram_crossing_Sean_Heuston_Bridge_-_geograph.org.uk_-_6007811.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | Deck: tram, embedded rails in granite setts, openwork cast-iron parapet, Guinness silos to the east |
| 14-frank-sherwin-bridge.jpg | [Frank Sherwin Bridge Dublin.JPG](https://commons.wikimedia.org/wiki/File:Frank_Sherwin_Bridge_Dublin.JPG) | YvonneM | CC BY-SA 3.0 | 2011-09-12 | Frank Sherwin Bridge from the west: flat three-span concrete deck on slim piers |
| 15-frank-sherwin-bridge-road-level.jpg | [R148, Frank Sherwin Bridge - geograph 6000211](https://commons.wikimedia.org/wiki/File:R148,_Frank_Sherwin_Bridge_-_geograph.org.uk_-_6000211.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-02 | Road level on the bridge looking south: yellow box junction, concrete parapets with railings, Heuston (right), Dr Steevens' (ahead) |
| 16-dr-steevens-hospital.jpg | [Dr Steevens' Hospital - geograph 5199450](https://commons.wikimedia.org/wiki/File:Dr_Steevens%27_Hospital_-_geograph.org.uk_-_5199450.jpg) | David Dixon | CC BY-SA 2.0 | 2016-07-12 | Dr Steevens' north front: ochre render, grey dressings, slate roof with dormers, cupola, lawn to the road |

Useful Commons candidates not downloaded: `Dublin Heuston station at night.jpeg`, `Dublin Heuston railway station.jpeg` (ground arcade close-up, Thoslee, CC BY-SA 4.0), `Heuston Station - geograph 6007821/6007824`, `Sean Heuston Bridge Dublin.JPG`, and `Tram lines, Sean Heuston Bridge - geograph 6423030`.

---

## 3. Landmark profile

### 3.1 Facts (verified)

- **Architect:** Sancton Wood (London-born), **verified** (Wikipedia; NIAH 50080035; plaque on site).
- **Engineer for the train shed:** Sir John MacNeill. Ironwork by J & R Mallet (NIAH 50080031).
- **Dates:** The GS&WR bought the site in Oct 1845, and the station **opened 4 August 1846** as Kingsbridge. NIAH dates the head building "c.1850", and OSM has `construction_date=1855`. **The attic panels read "VIII VIC" and "AD 1844"** (the regnal year and the company's founding year, ref 01). So "1846, Sancton Wood" holds for the station and architect. The head building itself was finished a few years after opening; the exact date is not settled.
- **Names:** Kingsbridge (after King's Bridge, 1828) until 1966, then Heuston, after Seán Heuston, executed 1916, who had worked in the station offices. It is the head office of CIÉ.
- **Maurice Craig** (quoted on Wikipedia): "a renaissance palazzo, gay and full-blooded, with fruity swags and little domed towers on the wings".

### 3.2 Architecture of the head building (east front)

From NIAH 50080035, Archiseek (after the 1846 Irish Builder / Dublin Penny Journal description) and refs 01, 03, 05, 06, 07.

- **Main block:** **9 bays, 2 storeys plus an attic**. **107 ft ≈ 32.6 m** wide (Archiseek). This matches OSM: the building:parts for the main block, `1495289269-72`, are 32 m N-S by ≈20-22 m deep and tagged height 12. **Treat that OSM height as wrong.**
  - **Ground floor:** channelled (rusticated) granite forming a **segmental-arched arcade** of round-headed openings, mostly glazed entrance doors, with channelled voussoirs and dropped keystones. A central doorcase carries a small pediment. "Tuscan order, rusticated and corniced", with Tuscan-column breakfronts. Measured height ≈7 m to the string course.
  - **First floor (piano nobile):** **8 three-quarter Corinthian columns + 2 end pilasters (paired at the corners)** on pedestals. **Round-headed sash windows with alternating triangular and segmental pediments**, a small wrought-iron balconette to each, and **carved swags (garlands) between the capitals**. Measured height ≈8.5-9 m.
  - **Entablature:** a heavy bracketed (modillion) cornice with **carved lions' heads**.
  - **Attic and parapet:** a **balustraded parapet** over the outer bays, and a **solid attic over the central 5 bays** carrying four carved **coats of arms** in cartouches plus **"VIII VIC"** (north) and **"AD 1844"** (south) inscription panels. Measured height ≈2.5-3 m. Granite chimneystacks show behind the parapet, and there are **three flagpoles** on the roof.
  - **Height:** cornice ≈16.5 m; top of parapet/attic ≈19 m. This is estimated from refs 01 and 03 by scaling the 32.6 m frontage, ±1.5 m. There is no authoritative source; see open questions.
- **Wings:** **3-bay single-storey**, **53 ft ≈ 16.2 m each** (Archiseek). OSM gives ~16-17 m. They are recessed ≈4-5 m behind the main front. Each has a pedimented central doorway with Tuscan columns, a balustraded parapet at ≈7 m, and a **central bellcote**.
- **Bellcotes ("domed campaniles"):** **square-profile, ≈4-5 m wide** (the OSM parts `1499136254`/`1499136265` are ≈6 x 6 m at the base). An open stage of round-headed arches with corner columns and a small pediment on each face sits under a **stone dome with oculi and an acorn finial**. The finial top is ≈16-17 m above ground, **just below the main cornice** (refs 03, 06). They sit on the wings, **not** on the main block. Both carry the same granite grey.
- **Returns:** a two-storey return to the north, with hipped slate roof and chimneys (ref 05). To the south, a long single-storey office range with a **stepped façade and Tuscan-column arcade** runs west along St John's Road West (refs 08, 09).
- **Roofs:** hipped slate on the head building, mostly hidden by the parapet.
- **Train shed:** multiple-pile pitched roofs of corrugated iron with glazed strips, on steel trusses and **cast-iron arcades**. Outer walls are **red brick, Flemish bond**, with a blind round-arched arcade (north), granite coping and quoins (NIAH 50080031; ref 10). OSM gives the station polygon ~260 m long x ~94 m wide including the head building. Tracks and platforms 1-8 run E-W inside.

### 3.3 Colours (hex estimates)

Sampled from refs 01, 06, 07, 08 and 12, then corrected by eye for overcast exposure.

| Surface | Hex | Note |
|---|---|---|
| Granite ashlar, lit | `#a9a69d` | neutral warm grey (sunlit ref 08 gives ~`#b5b0a3`; overcast ref 01 ~`#7d7d79`) |
| Granite, weathered / shadowed | `#8a8983` | cornice undersides, column flutes |
| Rustication joints / dirt | `#5c5d5a` | |
| Window glass | `#2a3136` | sashes painted off-white `#e6e3da` |
| Entrance doors (glazed) | `#3a4a52` | modern glazed doors in the arches |
| Slate roof | `#4a4f55` | |
| Bellcote domes | `#8f8e88` | stone, **not copper** |
| Shed brick | `#8a4a36` | red brick, Flemish bond |
| Shed roof | `#6e7378` / glazing `#9fb3bd` | |
| Dr Steevens' render | `#c9a24a` (overcast ~`#9c7f52`) | ochre with grey stone dressings `#9a9892`, slate `#4e5358` |
| Seán Heuston Br. ironwork | `#dcdcd6` | off-white; arch rib, intrados and spandrel ornament dark `#1f2530` |
| Seán Heuston Br. granite | `#9e9c94` | abutments and piers |
| Frank Sherwin Br. concrete | `#9a9a95` | parapet railings grey `#6f7478` |
| Luas platforms | `#b9b7b0` paving | tactile strips yellow/grey; OCS poles `#8c9196` |

### 3.4 Luas stop

Two tracks run N-S. There are three platform strips (west ≈53 m, central island ≈40 m hatched, east ≈52 m). Three glass-and-steel shelters stand about 3 m high, with ticket machines, bins and benches. The span-wire overhead line hangs from grey tubular poles. Trams run through the stop, which is not a terminus: they continue south to Saggart/Tallaght and north-east to The Point/Connolly. The platforms sit ≈16 m in front of the facade, and the PSV bus/taxi lane and bus shelters lie between.

### 3.5 Seán Heuston Bridge (formerly King's Bridge / Sarsfield Bridge)

- **Cast-iron single-span arch.** Designed by George Papworth; foundation stone laid 12 Dec 1827, completed 1828. Castings came from the Royal Phoenix Iron Works on Parkgate Street.
- Span ≈30 m (98 ft). **Seven cast-iron ribs.** Roadway 29.5 ft; overall width "just under 9 m" (Wikipedia, bridgesofdublin.ie, archiseek). OSM's bridge outline is ≈52 m x 10-11 m including abutments.
- Painted **off-white** with a **dark arch rib and intrados**. The spandrel panels carry a **crown and scroll/anthemion** relief. There is a **"1821"** plate at the crown, which commemorates George IV's visit, not the build date. The parapet is openwork cast iron between granite dies. **Granite abutments** carry rusticated piers topped by ornate lamps, and a solid granite pier-house stands at each end.
- Road traffic stopped when Frank Sherwin Bridge opened in 1982. It was restored in 2003 and now carries **pedestrians and the Luas only**, with rails in granite setts (ref 13).

### 3.6 Frank Sherwin Bridge

Dublin Corporation Road Design Division, **1982**. It is a **three-span reinforced-concrete beam** bridge: flat, plain, slim piers, concrete parapets with steel railings (refs 14, 15). It is **one-way northbound**, carrying R148 traffic from St John's Road West and Victoria Quay onto Wolfe Tone Quay. It is named after Frank Sherwin (1905-1981).

### 3.7 Five recognisable cues (checked against the photos)

1. **The 9-bay granite palazzo front** with engaged Corinthian columns, alternating pediments over round-headed windows, and **swags between the capitals** (refs 01, 07).
2. **Two small open-arched bellcotes with stone domes**, standing on the **low recessed wings** either side of the taller main block. This silhouette is the giveaway (refs 01, 03, 05, 06).
3. **Balustraded parapet with a solid central attic** carrying carved arms and "VIII VIC / AD 1844", with **three flagpoles** above (refs 01, 03, 07).
4. **The Luas stop directly in front**: grey trams, shelters and overhead wires, with double-deck buses in the bay against the rusticated arcade (refs 01, 02, 11).
5. **The white cast-iron arch of Seán Heuston Bridge** carrying Luas tracks, next to the plain concrete Frank Sherwin Bridge (refs 12, 13, 14).

### 3.8 Context

- **Traffic:** R148 is a heavy radial route. Westbound quay traffic comes along Victoria Quay, swings past the forecourt onto St John's Road West, and heads for Kilmainham, the N4 and N7. Eastbound traffic comes along St John's Road West, turns north over Frank Sherwin Bridge, and goes onto Wolfe Tone Quay. Parkgate Street and Conyngham Road (R109) run along the north bank towards the Phoenix Park. The area has constant **Dublin Bus double-deckers** (145 terminus and others; the older yellow/blue livery in the refs, the NTA green livery now), **Bus Éireann and private coaches**, a **taxi rank** on the south side, **Luas every few minutes**, and plenty of cyclists (segregated tracks).
- **Neighbours:**
  - **Dr Steevens' Hospital**, south across St John's Rd W (1720s, Thomas Burgh): two storeys plus a mansard with dormers, ochre render, a small cupola, a courtyard plan, and a lawn to the road. About 87 x 72 m.
  - **Heuston South Quarter** to the SW. One HSQ is 38 m (OSM); the Brunel Building has 8 levels.
  - **The Criminal Courts of Justice** (2010) across the river to the NW, a circular glass drum at 53.3483-53.3491, -6.2950 to -6.2964. It is prominent in ref 12.
  - **Ionad Seán Heuston**, north-bank buildings right at the bridge (53.34726-53.34792, -6.2935 to -6.2922).
  - **Collins Barracks** (National Museum) to the NE on Benburb St.
  - The **Guinness brewery** silos and St James's Gate to the east and south-east, visible down the river (ref 13). The Royal Hospital Kilmainham is to the SW via Military Road.
- **Street furniture:** grey galvanised pedestrian guard rails along St John's Rd W, stainless bollards along the front, standard Dublin lamp columns, tall grey Luas OCS poles, bus shelters, a Dublin Bikes station, silver birches against the front, and a lawn with low hedges on the east of the stop.

---

## 4. Build brief (prioritised)

### P0: fix placement and roads (data plus sites.js; next phase)

1. **Move the Heuston site to the north side of St John's Road West.** Anchor it on OSM, not an offset from the road.
   - Head-building front centre: **53.34656, -6.29220** (game -1223.7, 39.5).
   - Front direction: local +z = east, rotated about 8° to the north (facade bearing 82°).
   - Main block 32.6 x ~21 m deep (real). Wings 16.2 m each, set back ~4.5 m. Shed westward to about -6.2960 (game x ≈ -1350), N-S extent 53.34600-53.34685 (game z ≈ 23-70).
   - Decide on footprint scale (open question 1).
2. **Stop Steevens Lane being a car route at its north end.** Split it at SL1 (53.34527, -6.29150). SJ1-SL1 becomes the Luas corridor only; SL1-JS3 becomes a 2-lane `lane`.
3. **Stop placing the forecourt** with `heustonAt(8+7, 34, 14)`. Replace it with a real forecourt plate from x ≈ -1225 to -1195, z ≈ 17-57 in game coordinates. It holds the PSV lane, bus bays, three Luas platform strips and the lawn strip.
4. Add a **Dr Steevens' Hospital** block (generic, ochre render, mansard) where the station wrongly sits now: lat 53.34505-53.34570, lon -6.29294 to -6.29163, facing north over its lawn. It is not a hero model.

### P1: Luas extension

5. Extend `luas.route` past AQ1 with the nodes BB0 → BB1 (**Museum**) → BB2 → BB3 → WT3 → HB1 → HS (**Heuston**) → HS2 (≈SJ1) → SL1 → SL2 → JS3 (coordinates in §1.3).
   - Add stops `BB1: "Museum"` and `HS: "Heuston"`.
   - The `line()` builder in geo.js only needs node IDs in `data.nodes`, so orphan nodes should work. **Check luas.js** for any assumption that route nodes are on roads.
   - Add **Benburb Street** as a pedestrian/tram way.
6. Model the stop platforms: 3 strips, ~0.3 m high, paved `#b9b7b0` with tactile edges. Add 3 shelters (glass canopy on steel), OCS poles every ~25-30 m with span wires, and "Heuston" nameplates. Reuse any existing Luas stop kit if there is one.

### P1: hero GLB (Blender, `tools/blender/`, like the cars)

7. **Heuston head building plus shed**, one 2048 atlas, bevelled edges, baked AO. Budget **~16k tris** (ceiling 20k):

| Part | Tris | Modelling notes |
|---|---|---|
| Main block (9 bays) | ~6,500 | Real geometry: the 8 engaged Corinthian columns and end pilasters (8-sided shafts, capital as a textured flared box), the window pediments (alternating triangle and segment, extruded), the projecting cornice with a modillion strip, the balustrade on its outer bays (quads with alpha balusters, or a low-poly baluster instanced), the solid central attic with raised cartouches. Rustication, swags, lions' heads, sashes and balconettes go in the texture and normal map. |
| Wings x2 | ~1,000 | Single storey, pedimented door, balustraded parapet |
| Bellcotes x2 | ~2,400 | Square base, 4 open arches (real openings, visible sky), corner columns, 4 small pediments, dome (16-24 segments) with oculi in the texture, finial |
| North return + south range | ~2,000 | South range: 2-storey stepped block, then the single-storey Tuscan arcade along SJRW with chimneys |
| Train shed | ~3,000 | 3-4 long pitched piles with glazed ridge strips, brick perimeter walls with blind arcade texture, gable screens at the west end |
| Chimneys, flagpoles, roof | ~800 | |

   - Atlas regions (2048²):
     - one piano-nobile bay (column + window + pediment + swag), 512 x 768
     - rusticated arcade bay, 512 x 512
     - attic cartouche strip with VIII VIC and AD 1844, 1024 x 256
     - cornice and modillion strip, balustrade (alpha), bellcote arch face, wing bay
     - brick blind arcade, corrugated roof and glazing strip, slate
   - Palette: §3.3. The granite needs subtle vertical streaking. Lighting glows at night: the first-floor windows are floodlit in photos (green on national days).
8. **Seán Heuston Bridge**, a separate small GLB (~2,500 tris), or a special case in `ground.js buildBridge`.
   - A segmental arch rib, span ≈30 m real, with 7 ribs (show 2 fascia ribs; hide the inner ones).
   - Spandrel panels are a texture: off-white with dark crown and scroll ornament and a "1821" plate. The parapet is openwork cast iron as an alpha texture between granite dies.
   - Granite abutment piers carry lamps. The deck is granite setts with embedded rails.
   - It carries no cars.

### P2: smaller items

9. **Frank Sherwin Bridge.** Widen to ~18-20. Use the existing generic flat bridge, but give it **3 spans on slim piers** and concrete parapets with a top rail. No hero model.
10. **Forecourt dressing:** silver birches against the east front, a row of 5 trees and a lawn with low hedge east of the stop, bus shelters, bollards, grey guard rails along St John's Rd W, and a taxi rank on the south side. Add bus spawns for the 145 terminus if the fleet system supports it (`fleet.js` already lists "145 Heuston Stn").
11. **Rivers:** optionally let the south bank west of HB1 follow the OSM line (§1.4) instead of the straight pinned channel.
12. **Neighbours, all generic boxes:** the CCJ glass drum (NW, across the river), Ionad Seán Heuston, the Parkgate Street terrace (3-storey, heritage), HSQ offices (SW, up to 38 m).

**Textured:** head building, bellcotes, Seán Heuston Bridge spandrels and parapet, shed brick and roof.
**Generic:** Dr Steevens' Hospital (coloured box, mansard and cupola only), Frank Sherwin Bridge, all neighbouring blocks, platforms and shelters (shared kit).

**Triangle budget for the area:** head building and shed ~16k, Seán Heuston Bridge ~2.5k, Luas stop kit ~1.5k, Dr Steevens' ~0.8k, dressing ~1k. **Total ≈22k.**

---

## 5. Open questions

1. **Footprint scale.** Existing landmarks compress footprints inconsistently (the GPO uses w=54 against ~67 m real; the current Heuston w=34 for a ~65 m front). Should the hero GLB use real metres, 0.5x (the map scale), or something in between such as ~0.75x? At 0.5x, the main block is 16 m wide by 19 m tall, which reads as a tower, not a palazzo. My recommendation: keep heights real, scale plan by ~0.7, and shorten the shed hardest (it is ~130 game m long at 0.5x).
2. **Exact heights.** There is no surveyed height. OSM building:part heights (12 m main block, 5-10 m bellcotes) conflict with the photos. My photogrammetric estimate is cornice ≈16.5 m, parapet ≈19 m, bellcote finial ≈16-17 m, wings ≈7 m. A Mapillary token or a street-level measurement would settle it.
3. **Shed pile count.** NIAH says only "multiple-pile". From above there appear to be three to four principal spans plus lower later additions on the south (platforms 6-8). This needs aerial imagery with a compatible licence. Ortho imagery was not checked.
4. **The head building's date.** It is c.1846-1850 (opened 1846; NIAH says c.1850; OSM says 1855). The "AD 1844" panel is the company's founding year. This matters only for the HUD blurb.
5. **Smithfield/AQ1 alignment.** The real Smithfield stop is at 53.34715, -6.27778, and the line then runs up Queen St and along Benburb St. The game's AQ1 is on the quay at 53.34625. Coordinate with whoever researches Smithfield before extending `luas.route`.
6. **Luas beyond Heuston.** The Red Line continues from Steevens Lane west along James's St to the James's stop (St James's Hospital, inside the map bounds). Is that in scope for this landmark or a separate pass?
7. **River bend.** Should the Liffey west of Frank Sherwin Bridge follow the real narrowing and bend (≈35-45 m wide), or stay a straight pinned channel? A bend changes the view of the station from the north bank.
8. **One-way traffic.** The game has no `oneway` support. Should Frank Sherwin Bridge (northbound only) and the quays' one-way pairs be encoded now as data (ignored by the game), or deferred?
9. **Luas stop topology.** OSM has three platform polygons. Ref 11 shows the central strip hatched and apparently used as a platform. Confirm whether the central island is in passenger use (it matters only for placing shelters and props).

## Sources

- OSM via Overpass (ODbL): `data/osm/heuston.json`
- [Heuston station, Wikipedia](https://en.wikipedia.org/wiki/Heuston_station)
- [Seán Heuston Bridge, Wikipedia](https://en.wikipedia.org/wiki/Se%C3%A1n_Heuston_Bridge)
- [Frank Sherwin Bridge, Wikipedia](https://en.wikipedia.org/wiki/Frank_Sherwin_Bridge)
- [Dr Steevens' Hospital, Wikipedia](https://en.wikipedia.org/wiki/Dr_Steevens%27_Hospital)
- [NIAH 50080035, Heuston Station (head building)](https://buildingsofireland.ie/niah/search.jsp?county=DU&regno=50080035&type=record)
- [NIAH 50080031, Heuston Station train shed](https://www.buildingsofireland.ie/buildings-search/building/50080031/heuston-station-saint-johns-road-west-dublin-8-dublin)
- [NIAH 50080033, Seán Heuston Bridge](https://www.buildingsofireland.ie/buildings-search/building/50080033/sean-heuston-bridge-steevenss-lane-wolfe-tone-quay-victoria-quay-dublin-8-co-dublin)
- [Archiseek, 1846 Heuston Station](https://www.archiseek.com/1846-heuston-station-dublin/)
- [Bridges of Dublin, Seán Heuston Bridge design](http://www.bridgesofdublin.ie/bridges/sean-heuston-bridge/design-and-engineering)
- Wikimedia Commons images as listed in §2

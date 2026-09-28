# Christ Church Cathedral — research profile (`christ-church`)

This is Phase 1 research only, and no game code was changed. Sources:
- OpenStreetMap, via Overpass, fetched 2026-09-28
- 15 Wikimedia Commons photos, all under free licences
- English Wikipedia
- NIAH (National Inventory of Architectural Heritage, buildingsofireland.ie) records **50080532** (the cathedral) and **50080530** (Dublinia / Synod Hall)
- Open-Meteo elevation API, a coarse DEM used for the Winetavern St fall

Mapillary was not used because its API needs a token. Google imagery was not used.

- Raw OSM: `data/osm/christ-church.json` (1.06 MB, `out geom`). **bbox (S,W,N,E) = 53.3410, -6.2755, 53.3455, -6.2665**, which is about 500 x 600 m centred on the cathedral. The query took `building`, `building:part`, `man_made=bridge`, `highway`, `landuse`, `leisure`, `amenity`, `natural`, `barrier`, `historic`, `tourism` and `area:highway`. I removed 157 historic `boundary=*` relations (parishes and constituencies) that added 7 MB of noise. The query and bbox are recorded in the file's `research` key. It holds 2,303 elements, including 202 trees and 292 street lamps.
- Photos: `refs/christ-church/*`, with the per-image record (URL, author, licence, date, description) in `refs/christ-church/sources.json`.

**Frame used below.** Real metres in a local frame with origin **53.3432, -6.2710** (the cathedral's south grounds): x is east and y is **north**. None of the real distances are compressed. The cathedral is at lon about -6.2712, which is **west of the 1.6x stretch band** (-6.2675 to -6.2612), so the only warp here is a uniform shift. Relative positions in this area are simply **0.5x real on both axes** in game metres, with no east-west distortion. Road widths in `streets.json` are uncompressed. For comparison, the landmark buildings in the game are modelled at roughly 0.75 to 0.9x real size: the Custom House is `w:100` against about 114 m real.

---

## a) Map data: OSM compared with `streets.json`

### A1. The real street network (OSM)

The defining fact: **Christchurch Place is a dual carriageway wrapped around the south and east of the cathedral grounds**. It is not a single street. Traffic circulates one-way round the precinct, and the whole area slopes down hard to the quays on the north.

| Street | OSM way(s) | Geometry (local x,y m) | Lanes / direction | Notes |
|---|---|---|---|---|
| **Christchurch Place, west-bound (south) arm** | 143866298 | (17,-14) → (1,-23) → (-27,-33) → (-53,-38) | 2 lanes + cycle lane, **one-way W** | Curves down past the Leonardo Hotel (ex-Jurys Inn) to the High St / Nicholas St junction |
| **Christchurch Place, east-bound (north) arm** | 128570043, 369622779 | (-53,-27) → (-1,-18) → (17,-14) | 2 lanes + cycle lane, **one-way E** | Runs along the cathedral's south railings. The two arms are 5–15 m apart with traffic islands between them (1310403814, 1428765206) |
| **Christchurch Place, two-way** | 52881222, 1061460111, 369622780, 317003246 | (17,-14) → (38,-4) → (49,7) → (57,25) → (64,44) | **4 lanes, two-way** | A 90° sweep round the SE corner of the grounds, turning north into Lord Edward St. Werburgh St and Castle St join at (49..71, 0) |
| **Lord Edward Street** | 5976028 | (64,44) → (81,52) → (159,76) → (210,94) | 2 lanes, two-way, 30 km/h | Starts at the NE corner of the grounds and runs ENE to Cork Hill / Dame St. Facade to facade is about **19 m** (very consistent) |
| **Fishamble Street** | 1254511878/80, 971955846, 372226859, 1254511870-72 | (67,45) → (58,60) → (57,71) → (71,100) → (83,122) → (78,148) → (71,192) → (67,215) | 1–2 lanes, **one-way uphill (south)**, sett/asphalt, `incline=up` | Leaves the NE corner of the grounds, bends and drops to Wood Quay. A contraflow cycle track runs alongside |
| **St Michael's Hill** (the top of Winetavern St, **under the bridge**) | 4290616, 666554135 (`tunnel=building_passage`, y 4→9), 666554134 | (-53,-27) → (-52,-5) → (-53,4) → (-53,9) → (-56,38) | **1 lane, width=4.4, one-way DOWN (north)** + cycle lane | The bridge crosses at **y 4 to 9** |
| St Michael's Hill, up lane | 1097683893/4/5 | (-52,38) → (-49,9) → (-49,4) → (-53,-27) | `highway=service`, 1 lane, **one-way UP (south)** | A separate restricted upward lane about 4 m east of the down lane, also passing under the bridge |
| **Winetavern Street** | 127546529, 1155449048/49, 1179643854-56 | (-56,38) → (-54,80) → (-57,112) → (-61,130) → (-71,181) → (-72,198) | 2 lanes **one-way down (north)** + cycle lane; 3 lanes two-way for the last 15 m at the quay | Up lane 1155449046/50 (`service`) parallel on the east. The Civic Offices sit on the east side |
| **High Street** | 360313822, 143866308, 227767349, 360313821, 375778083 | from (-53,-27/-38) → (-90,-20) → (-165,4) → (-233,9) | 3 lanes, one-way pairs in places, busy bus route | Runs WNW past St Audoen's towards Cornmarket |
| **Nicholas Street** | 143866302 (4 lanes, y -38→-27), 750258565, 10564223, 68748484, 909788395, 973221250 | (-53,-38) → (-52,-57) → (-76,-107) → (-88,-154) → (-89,-188) | Dual one-way 2+2 lanes, splitting around a central strip; 50 km/h | Heads **SSW** to Patrick St and St Patrick's Cathedral. Facade to facade is about **45–52 m** because it is a wide dual carriageway |
| **Werburgh Street** (missing in the game) | 1374276455/56, 60010826, 1315965287 | (68,0) → (71,-8) → (78,-46) → (76,-71) → (68,-121) | 1–2 lanes, **one-way (southbound)**, cycle tracks | Runs south from the SE bend past St Werburgh's Church to Bride St / Ship St |
| Castle Street | 1374276457, 372226836… | (71,-1) → (107,7) → (141,21) → (229,61) | 1 lane, one-way **up/east** towards Dublin Castle | |
| **Cook Street** (missing) | 129211789 | (-57,112) → (-151,110) → (-273,107) | 2 lanes, two-way, concrete | Runs west off Winetavern St under the old city wall (St Audoen's Arch) |
| **Back Lane** (missing) | 129211782, 129211781 | (-87,-109) → (-145,-78) → (-233,9) | residential/service, one-way (service) | Links Nicholas St to High St at the Tailors' Hall |
| Wood Quay | 1179643848-50, 13907388 | y ≈ 199–215 | 2–3 lanes, one-way W | |

**Gradient.** The game world is flat, but the real one isn't. Open-Meteo DEM heights are coarse (about 30–90 m cells):

| Location | Height |
|---|---|
| Cathedral | 17 m |
| High St junction | 16 m |
| Mid Winetavern St | 9 m |
| Wood Quay | 5 m |
| High St, further west | 19 m |

So Winetavern St / St Michael's Hill drops about **11–12 m over about 230 m, roughly 5%, and steeper at the top**. Fishamble St falls about the same. The OSM benchmark by the bridge (node 7276368409) is tagged `ele:1913=50.7`, which is probably feet above the old Poolbeg datum, or about 15.5 m. The Synod Hall "is prominently sited in an elevated position" (NIAH).

### A2. How the game currently compares

The game's nodes, converted to the same local frame, compared with OSM:

| Node | Game lat/lon | Real equivalent | Error |
|---|---|---|---|
| HS1 | 53.34305, -6.2718 → (-53, -17) | The junction is at (-53, -27…-38) | 10–20 m too far north. Acceptable |
| CC1 | 53.3430, -6.2706 → (27, -22) | The arms merge at (17,-14) | About 12 m off. OK |
| LE1 | 53.3435, -6.2693 → (113, 33) | Lord Edward St / Fishamble start at **(64, 44)** | **About 50 m too far east** |
| EW1 | → (93, 150) | Fishamble at y=150 is at x≈78 | 15 m east |
| SQ2 | 53.34485, -6.2719 → (-60, 184) | Winetavern meets the quay at (-72, 198) | OK |
| NI1 | 53.3408, -6.2709 → (7, -267) | Patrick St at y=-267 is at x≈**-83** | **90 m too far east**. Nicholas St is also attached at CC1, about 80 m east of where it really starts (-53,-38) |

Problems with the road layout:
1. **Christchurch Place is modelled as one straight two-node street, HS1→CC1→LE1**, running diagonally NE, which cuts across where the east half of the grounds should be. In reality it is (a) a split one-way pair along the south side and (b) a 4-lane two-way road that **sweeps round the SE corner and turns north** into Lord Edward St at (64,44). The cathedral block is therefore bounded on the south and east by one continuous curved road. Because the game's LE1 is 50 m east, the game block is too wide east-west and its NE corner is in the wrong place. Moving LE1 also moves `extraSites.castle`, which is `beside('DM3','LE1')`, so check the Castle gate after any change.
2. **Nicholas Street starts at the wrong junction.** It should leave from the High St / St Michael's Hill junction (HS1) and run SSW, not from CC1 heading due south. NI1 should be about 90 m further west, and 45 m in game units. Check what else hangs off NI1 first (the world-map label "THE LIBERTIES" uses NI1).
3. **Winetavern St** is modelled as one straight `secondary` from SQ2 to HS1 with no one-way flag. In reality it is **one-way northbound (downhill)** for general traffic, with a separate restricted up lane. Both pass **under the bridge at y 4–9**, which is about 22–27 m north of HS1 in real metres, or **11–13 game m north of HS1**. The time trial path `…LE1, CC1, HS1, SQ2…` already drives it in the legal direction.
4. **Lord Edward St** DM3→LE1 is straight. The real street is almost straight but starts further west, as above.
5. **Missing streets:** Werburgh St, Cook St, Back Lane and Castle St, plus a Nicholas St that starts at the right place. Werburgh St and Cook St are the most visible from a car. Werburgh St is the obvious "turn right at the cathedral" gap, and Cook St leads off the Winetavern descent past the city wall.
6. **Fishamble Street** is typed `lane` (6 m) and is two-way in the graph. The real street is **one-way uphill (southbound)**, 1–2 lanes of about 7–8 m of carriageway with footpaths, facade to facade about 21 m, with the Civic Offices park on its west side.
7. **Widths.** These are uncompressed real carriageway estimates from lane counts: 3.25 m lanes and 1.5 m cycle lanes.

| Street | Game width | Real estimate | Change |
|---|---|---|---|
| Christchurch Place | `primary` default 12 m | Each one-way arm about 8–9.5 m; 4-lane two-way section about 14 m | Model as two ways, or one ~16–18 m road with a median, to keep the graph simple |
| Winetavern St | `secondary` 9 m | St Michael's Hill down lane is 4.4 m (tagged) + the up lane about 3.5 m + island ≈ **9–10 m kerb to kerb under the bridge**; lower Winetavern about 9 m | Width is fine. **Add `oneway`** |
| Nicholas St | 9 m | 2+2 lanes, about 15–17 m | Needs `width: 16` |
| Lord Edward St | 12 m | 2 lanes + cycle lanes, about 10–11 m; 19 m facade to facade | |
| High St | 12 m | 3 lanes, about 11–12 m | OK |

### A3. The cathedral and its buildings (OSM footprints, measured)

All values come from the OSM polygons. The cathedral outline is way 27291101. There are 30+ `building:part` ways (1483603113…1483640679), mapped in 2026 with heights.

| Element | Footprint (x, y) | Size | Height (OSM) | Notes |
|---|---|---|---|---|
| **Whole cathedral** | x -44 → 17.7, y 4 → 43.3 | **62 m W–E × 31 m across the transepts** (39 m including the SW link block) | — | Axis: the nave's south wall runs from (-42.5,20.1) to (-11.9,22.7), so the **east end is rotated about 5° north of due east** (bearing about 85°) |
| Nave (clerestory) | x -43 → -12, y 20 → 33 | **31 × 13 m** | 16.7 m, gabled | Six-bay nave (NIAH) |
| South aisle | x -43 → -11, y 15 → 23 | 32 × ~5 m | 9 m, skillion (lean-to) | Flying buttresses spring from here to the clerestory |
| North aisle | x -44 → -13, y 31 → 39 | 31 × ~5 m | 9 m, skillion | The north wall "visibly leans" and is medieval (1230s) |
| **Crossing tower** | x -12 → -2, y 24 → 33 | **10 × 9 m** | **35 m, pyramidal** | Corner turrets (4 tiny parts) are tagged 28 m, which is the parapet/turret top. So **parapet about 28 m, pyramid apex 35 m**, plus a weathercock of about 2 m. The photos agree: the visible pyramid is about 0.6 × the tower width |
| South transept | x -12 → -1, y 12 → 23 | 11 × 11 m | 16.7 m, gabled | Romanesque round-headed windows, rose in the gable |
| North transept | x -13 → -2, y 33 → 43 | 11 × 10 m | 16.7 m, gabled | |
| Choir / east end | x -1 → 17.7, y 14 → 40 | about 19 m long | not tagged (chapels gabled or skillion) | An ambulatory with polygonal-plan towers and several chapels (NIAH). The conical turrets are about 12 m (parts 1483603124/25, `pyramidal`) |
| SW link block (to the bridge) | x -44 → -35, y 4 → 15 | 9 × 11 m | gabled | Low block with oculus windows (photo 04, left). **The bridge lands here, not on the west front** |
| Ancillary "church" buildings N/NE | 332268848 (x -3→17, y 33→46), 332268850 (x 16→42, y 35→50) | 20 × 13 and 26 × 15 m | — | Chapter house / offices / choir-related buildings on the NE of the precinct |
| **Chapter-house ruins** | 332275452: x -11 → 4, y 1 → 9 | **15 × 8 m** | ruin walls about 1–1.5 m | Sunken rectangle south of the south transept, with a railing on top (photo 16) |
| **Bridge** | 332268849: x -60 → -39, y 3 → 9 | **21 m long, about 5 m wide** | **height 10, min_height 4**, gabled, layer 1 | Spans the **two** St Michael's Hill lanes plus pavements. Underside 4 m is OSM's figure; see the open questions |
| **Synod Hall (Dublinia)** | 143866325: x -86 → -58, y -20 → 23 | **28 m W–E × 43 m N–S** (long axis N–S), 810 m² | parts 7 m (2-storey wings) and 10 m (main blocks) | Irregular: the SE corner is chamfered along the High St junction. Its "front" (east) faces St Michael's Hill |
| **Synod Hall tower** (St Michael's) | 1485119232: x -85 → -76, y -5 → 4 | **7.4 × 7.4 m** (rotated about 18°) | 20 m + `roof:height 4`, pyramidal | **At the rear (west) centre**, not at the front. NIAH: "square-profile five-stage tower… pyramidal slate roof… cut limestone crenellations". 96 steps to the top (Dublinia website), which puts the viewing level at about 18 m. From photos, parapet ≈ 22–25 m and apex ≈ 28–31 m. OSM's 20 m is probably low |
| SW turret of the Synod Hall | 1485119231 | 4 × 4 m | 10 m, pyramidal | Small conical/pyramid-capped stair turret (NIAH: "American slates remain on… the south-west turret") |

**The grounds.** `landuse=religious` 746745210 covers x -48 → 52, y -17 → 50, about **100 × 67 m** and 4,800 m². It is ringed by a **cast-iron railing on a granite plinth** (way 283941551, which also traces the east and south sides). Inside it:
- **gardens** on the south and west: 332275606 (x -38→25, y -17→2) and 332275607 (x -45→-38)
- **lawns**: 332270484 (x -31→-18, y -4→10), and 332275453 (x 5→26, y 0→27) east of the south transept
- a **circular paved piazza** SW of the south transept (the footway loop 229999828, photo 04, with benches)
- **trees**: 6–8 inside the railings (for example at (-2,-8), (26,26), (37,11), (18,-29)), plus the north lawn trees

North of the cathedral, beyond a wall (332438231), is the **Civic Offices park**: `leisure=park` x -44→36, y 45→102, a sloping lawn with mature trees. Beyond that are the **Civic Offices "bunkers"**: Block 2 (x -5→29, y 84→118, **38 m**) and Block 1 (x 28→62, y 103→137, **42 m**), both granite-clad with chamfered roofs. The glass Phase 2 blocks (Blocks 3 and 4, about 20 m) front Wood Quay.

**The game's cathedral compared with this:**

| | Game (`sites.js`) | Real (OSM) projected into game space |
|---|---|---|
| Centre, relative to HS1 | **(+34, -36)** | Centroid **(+20, -22)**. The west front is at +5.1 and the east end at +35. So the game building sits 14 game m east and 14 game m north of the real one |
| Footprint | `w:46, d:22`, rot 0 | Real 62 × 31 m (nave with aisles 25 m wide). At the 0.75 landmark scale that is **about 46 × 23**, so the size is already consistent |
| Rotation | 0 | About **+5°** (east end turned north) |
| Synod Hall | `HS1.x - 17, cc.z - 2`, which is about 38 game m north of HS1 | Real centroid **(-9.4, -9.4)** from HS1 and tower (-14, -8): **about 29 game m too far north** |
| Bridge | From the cathedral's west door (nave axis) east to the Synod Hall | Real bridge centre **(+1.6, -11.4)** from HS1. It crosses at **the south end of the cathedral** (about 20 m real, or 10 game m, south of the nave axis) and meets the **north end of the Synod Hall's east face** |

In the compressed map the real block is only about 35–50 game m wide between Winetavern St (x≈0 from HS1) and the Christchurch Place bend (x≈+51). The 46 m game building therefore cannot sit at the true centroid without its west end reaching the road. The hand-tuned +14 m east shift is a scale compromise. With LE1 corrected, the recommended placement is the west front about 7–8 game m east of the Winetavern centreline (half-width 4.5 + pavement 3.5) and the building centre at about (+30, -24). That is roughly 12 m further south than now, which matches the real "cathedral sits right on Christchurch Place" relationship. The Synod Hall moves south to about (-12, -8) and the bridge sits at about z -11 from HS1.

### A4. Street furniture and details (OSM)

- **Railings:** cast-iron with scroll tops on a low granite plinth wall (NIAH; photos 01, 02, 03), with granite gate piers (the gates at (38,5) and (-39,-17)).
- **Bollards:** the black removable bollard lines 1425565141 along Lord Edward St and 1428537505/1428765206.
- **Dublinbikes station 06 "Christchurch Place"** at (64,15), 20 docks.
- Bicycle stands at (51,-5) and (72,11). A guidepost / fingerpost at (68,7) and (-43,-17). A post box at (73,5).
- **Timothy Schmalz's bronze "Homeless Jesus" bench** in the south grounds at (26,12) (visible in photo 06).
- The **Millennium Child** sculpture at (-30,-43) in the Peace Park.
- Hammond Lane lamp standards (Dublin "Victorian" double-arm lamps, visible in photos 08, 12, 20).
- Traffic signals at the High St, St Michael's Hill and Nicholas St junction.
- The Viking/medieval **khachkar** memorial stone at (-43,0) by the bridge.

---

## b) Reference images (`refs/christ-church/`)

All are from Wikimedia Commons, with full records in `sources.json`. None are Google imagery. Mapillary was not used because it needs a token.

| File | Author / licence | Shows |
|---|---|---|
| `01-west-facade-zairon.jpg` | Zairon, CC BY 4.0 | West front from St Michael's Hill: stepped 5-light lancets with cream shafts, rose window in the gable, double portal with tympanum, pinnacled turrets, railings on the plinth, and a flying buttress arch on the right |
| `02-west-facade-2-zairon.jpg` | Zairon, CC BY 4.0 | West front, wider view. **Flying buttresses on both flanks**, and the tower pyramid behind |
| `03-south-side-01-zairon.jpg` | Zairon, CC BY 4.0 | **Driver's-eye hero view** from the Christchurch Place / Nicholas St crossing: the whole south elevation, the tower with its pyramid, the south transept with rose and turrets, the stepped-crenellation parapets, the bridge and the Synod Hall at left |
| `04-south-side-05-zairon.jpg` | Zairon, CC BY 4.0 | South nave from the paved piazza: flyers over the lean-to aisle, clerestory lancet groups, crenellations, and the SW link block with oculi |
| `05-south-transept-zairon.jpg` | Zairon, CC BY 4.0 | South transept (Romanesque round-headed windows, wheel window, octagonal stair turret with slate spirelet) and the crossing tower with its green slate pyramid and weathercock |
| `06-choir-east-zairon.jpg` | Zairon, CC BY 4.0 | East end from the SE lawn: polygonal chapels with crenellated parapets and pyramid roofs, the conical turret, and the tower |
| `07-north-side-zairon.jpg` | Zairon, CC BY 4.0 | North side seen from the NW pedestrian area off Winetavern St. The bridge arch is on the right |
| `08-synod-hall-bridge-sweeney.jpg` | Stephen Sweeney, CC BY-SA 2.0 (geograph 1585038) | **Synod Hall east face from Christchurch Place**, with the tower behind, the bridge at right, a Dublin Bus double-decker on High St, and the granite gate piers and railings of the cathedral |
| `11-winetavern-looking-south-jones.jpg` | Eric Jones, CC BY-SA 2.0 (geograph 2199903) | Looking **up Winetavern St** from the Civic Offices (Phase 2 portico column): the cathedral on the hill, the bridge arch framing the street, red-brick corner building at right |
| `12-synod-hall-southeast-dxr.jpg` | DXR, CC BY-SA 4.0 | **Synod Hall from the SE junction**: south and east fronts, tower with crenellations and spire-like pyramid, chimneys, and the bridge springing east at right |
| `13-crossing-tower-closeup-zairon.jpg` | Zairon, CC BY 4.0 | Close-up of the **cathedral crossing tower**: stepped crenellations, corner turrets, louvred belfry lancets. The Commons title says "Dublinia Tower", but the weathercock and belfry openings identify the cathedral tower |
| `14-aerial-1-ridiculopathy.png` | Ridiculopathy, CC BY-SA 4.0 (own drone, 2020) | Oblique aerial of the tower, the nave roof with the flyer run, and the transept. Good for roof pitch and massing |
| `15-aerial-2-se-ridiculopathy.png` | Ridiculopathy, CC BY-SA 4.0 | Aerial looking SE: the whole cathedral, the bridge at right, Christchurch Place, the red-brick Leonardo Hotel and apartments behind |
| `16-chapter-house-ruins-fagerving.jpg` | Alicia Fagerving, CC BY-SA 3.0 | Chapter-house ruin walls: low rubble and ashlar walls with a sunken gravel floor and a tubular railing |
| `20-synod-hall-haklai.jpg` | Yair Haklai, CC BY-SA 4.0 | Synod Hall south/east from the junction: tower, dormers with patterned gablets, cylindrical chimney stacks, and the Dublinia banners |

**Not downloaded** because upload.wikimedia.org kept returning HTTP 429. All four are CC BY-SA 2.0 and worth fetching later:
- "Christ Church Cathedral, Bridge over Winetavern Street – geograph 5198633" (David Dixon), the **best bridge-from-below view**
- "Christ Church Cathedral (from Winetavern Street) – geograph 5198637" (Dixon)
- "Christchurch Cathedral – geograph 2856701" (Graham Hogg)
- "Dublin Corporation Civic Offices, Wood Quay – geograph 2196105" (Eric Jones)

Photos 07, 11 and 12 show the bridge side-on and at distance in the meantime.

---

## c) Landmark profile

### C1. Architecture

- **History in one line:** founded around 1030 by Sitric Silkenbeard and rebuilt in stone from 1172 under Strongbow. The nave dates from the 1230s (English "western school" Gothic, with Dundry oolite dressings). The south nave wall collapsed in 1562. **George Edmund Street almost totally rebuilt it in 1871–78**, paid for by the distiller Henry Roe (Wikipedia). What you see today is essentially Street's.
- **Street's work** (Wikipedia and NIAH):
  - The 14th-century long choir was demolished and a new east end built over the crypt, with an ambulatory, polygonal-plan towers and radiating chapels.
  - The **tower was rebuilt**.
  - The south nave arcade was rebuilt.
  - **Flying buttresses were added "as a decorative feature"** (lean-to aisles with flyers on both sides).
  - The north porch was replaced by a baptistery.
  - He built the **Synod Hall** on the site of St Michael's church, keeping its tower, and linked it by the **covered bridge**.
- **Style mix:**
  - The **transepts are Romanesque** (round-headed windows and doorways with cream roll mouldings, wheel windows in the gables).
  - The **nave and west front are Early English Gothic**: lancets in stepped groups, a stepped 5-light west window, and pointed-arch portals with colonnettes.
  - There are **stepped ("Irish") crenellations** everywhere: on the tower, the nave clerestory parapet, the aisle parapets and the east chapels.
- **Crossing tower:**
  - Square, about 10 × 9 m on plan.
  - Two stages above the roofs, each face with a **tall 2-light louvred belfry lancet** under a hood mould.
  - Corbel table and stepped-crenellated parapet with **four square crenellated corner turrets** at about 28 m.
  - A **steep pyramidal slate roof** (green-grey) rising inside the parapet to about 35 m, with an iron cross and **weathercock** finial.
  - Uncoursed calp rubble with limestone quoins and dressings.
  - It is not a spire, but it is not flat either. **The current game tower's flat crenellated top is its biggest silhouette error.**
- **West front:**
  - Gable with a **rose/wheel window**.
  - A **5-light stepped lancet group** with cream (Bath/Caen-type) shafts.
  - A deep **double portal** under one pointed arch with a carved tympanum roundel.
  - Two octagonal turrets with slate spirelets, one each side ("twin octagonal towers flanking west gable", NIAH).
  - Stepped buttresses and slate-weathered offsets.
- **Transept gables:** a rose window high in the gable, two tiers of round-headed windows, and an **octagonal stair turret with a conical slate spirelet** at one corner of the south transept.
- **East end:** a cluster of polygonal chapels with crenellated parapets and low pyramid roofs, conical turret caps, and lancet pairs.
- **Synod Hall (c.1875, Street):**
  - Rusticated snecked limestone.
  - Steep slate roofs with gabled dormers (copper bargeboards and fishscale shingles).
  - **Cylindrical carved limestone chimney stacks**, in pairs.
  - A central gabled breakfront with a rose and 2-light geometric windows.
  - A three-arch entrance arcade at the SE corner.
  - A bow-fronted bay on the south.
- **St Michael's tower (on the Synod Hall):**
  - A five-stage rubble tower with corner buttresses.
  - A crenellated parapet with corner turrets.
  - A **tall pyramidal slate roof** (steeper and more spire-like than the cathedral's) with a cross.
  - Flagpoles on the parapet (Irish tricolour and others, visible in the photos).
- **Bridge:**
  - A covered stone passage at first-floor level on **a single wide pointed/segmental arch** spanning St Michael's Hill.
  - Each side has an **arcade of about 5–6 pointed-arch windows with small roundels (oculi)** in the spandrels, under a gabled slate roof with a central cross gablet.
  - It is the same stone as the Synod Hall. Inside, there are stained-glass windows (Commons "Passage to Synod Hall").

### Stone and colour

The hex values are sRGB estimates, pixel-averaged from the daylight photos with some judgement.

| Material | Where | Hex |
|---|---|---|
| Calp limestone rubble / snecked walling (Kimmage, Rathgar) | Main walls, tower | **#6e6b6c** (dry) to #5d5a55 (shade or wet) |
| Faced limestone ashlar (Ardbraccan, Sheephouse; later Lecarrow) | Quoins, buttresses, dressings, parapets | **#b5a797** sunlit, #9d9890 overcast |
| Cream oolite / Bath / Caen stone | Window shafts, arch mouldings, roll mouldings, portal | **#d9c9a0** |
| Westmorland green slate (reslated 1973; American "Eureka" olive-green slates survive on the tower) | All roofs, tower pyramid | **#6a6d64** (general), **#6f8a80** tower pyramid, which reads greener |
| Synod Hall rusticated limestone | Walls | #8f8a82 (a touch lighter and warmer than the cathedral) |
| Cast iron | Railings, lamps | #1d1f1e |
| Granite | Plinth walls, gate piers | #9c9a93 |
| Grounds | Lawn / paving | #5f8a3c / #b5b4b4 |
| Context red brick | Leonardo Hotel, Lord Edward St, High St | #9a4f3a |
| Civic Offices granite | Bunker blocks | #c8c3ba |

The current game uses `M.lead` (#6b7075, metallic) for every roof. **Real roofs are slate, not lead.** Use a matte green-grey with roughness about 0.8 and no metalness.

### C2. Instantly recognisable cues (checked against the photos)

1. **The covered stone bridge arching over the road** between the cathedral and the Synod Hall, seen framing Winetavern St from below (photo 11) or side-on from Christchurch Place (photos 03, 08, 12). This is the single most distinctive feature and it is on a driven road.
2. **Two towers with pyramid roofs**: the cathedral's squat, crenellated, turreted tower with a green slate pyramid, and **the Synod Hall's taller-looking, slimmer tower with a sharper pyramid/spire and a cross**, facing each other across the bridge.
3. **A long nave with a run of flying buttresses** and stepped crenellations along every parapet line (photos 03, 04, 14).
4. **Grey stone in green grounds behind black railings** on a granite plinth, set on the brow of a hill above a wide, curving, traffic-heavy dual carriageway.
5. **Rose windows in the gables** (west, transepts) and cream-shafted lancet groups against grey rubble.

### C3. Context and traffic

- **Buildings:**
  - South of Christchurch Place: the **Leonardo Hotel** (ex-Jurys Christchurch Inn), 6 storeys of red brick with a corner turret. Photo 11 shows the red-brick corner block at Winetavern St.
  - Red-brick 4–5-storey apartments on the corners of Werburgh St and Nicholas St.
  - Victorian and Georgian blocks on High St.
  - Lord Edward St: 4–5-storey red brick with ground-floor bars and hotels.
  - North, downhill: the **Civic Offices** (Stephenson's granite bunkers of 1976–86, 38–42 m, chamfered roofs, deep slit windows; Scott Tallon Walker's glass and stone Phase 2 on the quay with a big portico column).
  - West: St Audoen's (C of I and RC), and the city wall at Cook St.
- **Traffic:** a primary cross-city corridor.
  - Christchurch Place and High St carry heavy **Dublin Bus double-decker** traffic (photo 08), tourist coaches that set down for the cathedral and Dublinia, and taxis (the hotel taxi rank at (13,-27)).
  - Winetavern St is the main descent to the quays.
  - Speed limit 30 km/h on Christchurch Place and 50 km/h on High St and Winetavern St.
  - Cycle lanes almost everywhere.
- **Street furniture:** a Dublinbikes station, Hammond Lane double-arm lamp standards, black bollards, fingerposts, traffic signals on galvanised poles, and yellow-and-black Belisha-style keep-left bollards on the traffic islands (photo 03).

---

## d) Build brief (prioritised)

### P1: Road layout (`streets.json`)

The suggested lat/lon values come from OSM and match the node IDs where possible, so the time trial path still works.
1. **Christchurch Place loop.**
   - Keep HS1 but move it to **[53.34291, -6.2718]**, the actual junction.
   - Keep CC1 at the merge, **[53.34307, -6.27074]**.
   - Add the bend nodes **CC2 [53.34320, -6.27037]**, **CC3 [53.34326, -6.27026]** (Werburgh / Castle St junction) and **CC4 [53.34342, -6.27014]**.
   - Move **LE1 to [53.34360, -6.27004]**.
   - Choose between two options:
     - (a) one road, `width` about 17, with an optional median, HS1→CC1; or
     - (b) the real one-way pair, with the E-bound arm via **[53.34301, -6.27130]** and the W-bound arm via **[53.34290, -6.27141]**, if the graph supports one-way ways.
   - The 4-lane section CC1→LE1 should be about 14 m.
2. **Nicholas Street.** Re-anchor it at HS1 and route it via **[53.34250, -6.27195]**, **[53.34222, -6.27231]** and **[53.34151, -6.27234]** (Patrick St), with `width: 16`. Move NI1 west accordingly and check its dependants.
3. **Winetavern St.**
   - Add `oneway` (northbound, downhill), with a mid node **WT1 at the bridge [53.34325, -6.27180]** so the bridge can be placed on it exactly.
   - Add a node at Cook St, **[53.34421, -6.27186]**.
   - Set width about 10 (both lanes pass under the bridge). Mark the bridge span in data if the renderer needs a clearance or underpass.
4. **Fishamble St.** Move it west to the real line: LE1 → [53.34383, -6.27013] → [53.34425, -6.26978] → [53.34453, -6.26983] → SQ3. Make it `oneway` (southbound, up) and `secondary`/`lane` at about 7.5 m.
5. **Add Werburgh St** from CC3 → [53.34256, -6.26986] → [53.34211, -6.26998] (`lane`/`secondary`, one-way southbound). **Add Cook St** from the Winetavern mid node → [53.34419, -6.27327] → [53.34416, -6.27511]. Back Lane ([53.3425,-6.27318] → [53.34328,-6.27451]) is optional.
6. The world is flat: **do not attempt the 5% slope**. You could hint at it by stepping the grounds' plinth wall and making the north (Civic Offices) lawn a gentle ramp.

### P2: Hero GLB (cathedral + Synod Hall + bridge), 12k–18k tris total, one 2048² atlas

Scale the whole group at about **0.75 real**, matching `w:46`. Use a single origin at the real bridge centre, so the three parts keep their true relative positions:
- cathedral centroid (+37, +21)
- Synod Hall centroid (-22, -4)
- bridge (0, 0)

These offsets are in real metres (x east, y north) from the bridge. Multiply by 0.75 and then place the group in game space.

The model uses **real internal proportions** even though the map is compressed. The group then needs the cathedral pushed about 8 game m east relative to the Synod Hall so it fits the compressed block. The bridge is the elastic element: **model it with a stretchable middle span** (separate mesh or node) so its length can be set to whatever gap the game road needs, about 15–18 game m.

**Cathedral, about 9–11k tris:**
- Cruciform massing:
  - nave 31 × 13 m, ridge 16.7 m, parapet about 13.5 m
  - lean-to aisles at 9 m
  - transepts 11 m wide with 16.7 m ridges
  - east end about 19 m of polygonal chapels
- Crossing tower 10 × 9 m to a 28 m parapet with 4 corner turrets (+1.5 m) and a pyramid to 35 m, plus a finial.
- **Flying buttresses: 6 per side** (quarter-arch slabs with pinnacle tops over the aisles). These are cheap and a key cue.
- **Stepped crenellations** as a single strip mesh per parapet run. Bake them into the atlas with alpha for the far LOD.
- West front:
  - a gable with a rose (a disc with alpha tracery)
  - the 5-lancet stepped group
  - a double portal recess
  - **two octagonal turrets with spirelets**
- South transept octagonal stair turret with a spirelet, and the east-end conical turrets.
- The SW link block with oculi, which is where the bridge attaches.
- Bevel all corners (about 5 cm) and bake AO into the atlas.

**Synod Hall, about 3–4k tris:**
- Irregular block 28 × 43 m (chamfered SE corner), eaves about 10 m, ridges about 16–17 m.
- The east breakfront gable with a rose, 3–4 gabled dormers, and 2 pairs of cylindrical chimney stacks.
- The SE three-arch porch.
- Tower 7.4 m square at the **rear centre-west**: parapet about 24 m, corner turrets, pyramid to about 30 m, and a cross.

**Bridge, about 800–1,200 tris:**
- About 5 m wide, underside ≥ **5.0 m** for game buses (OSM says 4 m, but the game's double-deckers need 4.4 m or more), top of parapet or eaves about 9 m, ridge about 10.5 m.
- Arcade of 5–6 pointed windows with oculi on each side.
- A single span arch, with a gabled slate roof.

### P3: Textures (a single 2048 atlas)

- Tileable calp rubble with ashlar quoin trim: about 40% of the atlas.
- A lancet window (dark glass with cream surrounds) and a round-headed Romanesque window.
- A rose window with alpha.
- A louvred belfry opening.
- Slate roof, green-grey, about 15%.
- A crenellation strip.
- A Synod Hall rusticated limestone variant, from a hue shift or its own tile.
- A 2-light geometric window.
- A dormer gablet.

### P4: Grounds and props (instanced or generic)

- A railing on a granite plinth (instanced segment) around the precinct, about 100 × 67 m real, with 2–3 granite gate piers.
- Lawn and garden patches, a paved circular piazza SW, and 8–10 trees inside plus 10–15 on the north (Civic Offices) lawn.
- The sunken chapter-house ruin: a low wall ring, 15 × 8 m, cheap.
- The Homeless Jesus bench (a generic bench is fine), Hammond Lane lamps, a Dublinbikes rack, bus stops on Christchurch Place and High St, and the keep-left bollards on the islands.

### P5: What stays generic

- Leonardo Hotel and the High St, Lord Edward St and Werburgh St blocks: generic red-brick 4–6-storey filler.
- The Civic Offices bunkers: two plain granite-coloured boxes (38–42 m) with chamfered tops. This is a worthwhile cheap cue from the quays, but it is not a hero.
- St Audoen's and St Werburgh's churches: generic or deferred.

### Triangle / texture budget

- Cathedral about 10k, Synod Hall about 3.5k, bridge about 1k, which comes to **about 14.5k** including turrets and flyers. A low LOD at about 3k (massing, pyramids and flyers kept as silhouettes).
- One 2048² atlas with baked AO, plus the shared railing and tree instances.
- It replaces three `Builder` groups (`christChurch()` in `landmarks.js`) and the `reserved[reserved.length-1]` Synod Hall footprint in `sites.js`, which will need new w/d (about 21 × 32 at 0.75).

### What is wrong or missing in the current `christChurch()` model (summary)

- **The tower has no pyramid roof.** Its crenellations sit flat at 31 m. Real: turrets at 28 m, apex 35 m.
- **There are no aisles.** The nave is a single 12 m box with ridge 21 m (too tall); real is 13 m + 2 × 5 m aisles, ridge 16.7 m.
- **There are no flying buttresses.** Vertical box buttresses sit on the nave wall instead.
- **There is no west front.** It is just a dark door box: no rose, lancets or turrets.
- The transept gables are plain, with no rose windows or stair turret.
- The east end is a cylinder with a cone (it should be polygonal chapels with crenellations).
- All roofs are metallic lead; real is matte green-grey slate.
- **The Synod Hall is too small** (16 × 18 against 28 × 43 real), **its tower is at the wrong corner and too tall** (34 m shaft + 6 m cone = 40 m against about 30 m real), and it is about 29 game m too far north.
- **The bridge runs along the nave axis to the west door.** It should leave the SW link block about 20 m real south of the axis, spanning Winetavern St about 11–13 game m north of HS1.
- There are no grounds, railings, chapter-house ruin or trees. The reserved 60 × 44 area is empty.

---

## Open questions

1. **Bridge clearance.** OSM tags `min_height=4` and `height=10`, and I could not get the Dixon geograph photos (HTTP 429) to verify. Does game traffic, especially double-deckers, use Winetavern St under it? If so, keep the underside at 5 m or more regardless.
2. **Synod Hall tower height.** OSM says 20 m + 4 m roof, NIAH gives no figure, the 96 steps suggest a viewing level of about 18 m, and photo proportions suggest parapet 22–25 m and apex 28–31 m. A measured source (Street's drawings, or the Dublinia or Christ Church technical info) would settle it.
3. **Cathedral heights** are from OSM building parts (nave 16.7 m, tower 35 m, turrets 28 m), which a mapper likely estimated. The photos are consistent with them, but none of these figures is surveyed.
4. **One-way modelling.** Can `streets.json` express one-way ways and split carriageways? The realistic Christchurch Place is a one-way pair plus a 4-lane two-way section. If not, use a single wide road.
5. **Placement compromise.** Should the cathedral be shifted to fit the compressed block (about 8 game m east of the true projected position), or should the block be widened by moving LE1 and Fishamble less than the real values? Moving LE1 about 45 game m west also shifts the Castle gate (`extraSites.castle`).
6. **Nicholas St / NI1.** Moving NI1 about 45 game m west affects "THE LIBERTIES" map label and anything built south of it (St Patrick's Cathedral area). Is that area in scope?
7. **Slope.** Should the Winetavern / Fishamble drop to the quays be faked (for example a raised cathedral plinth and a stepped retaining wall on the north lawn), or ignored?
8. Four reference photos, including the best "under the bridge" shot, still need downloading once Wikimedia's rate limit clears (titles listed in section b).

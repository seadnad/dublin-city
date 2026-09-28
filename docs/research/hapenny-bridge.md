# Ha'penny Bridge: landmark research (Phase 1)

Slug: `hapenny-bridge`. Research only: nothing under `src/`, `public/` or `tools/` was changed.

- Raw OSM: `data/osm/hapenny-bridge.json`
- Reference photos, with licences in `refs/hapenny-bridge/sources.json`: `refs/hapenny-bridge/*.jpg`
- Units: **real metres** unless marked *game m*. The game compresses positions by 0.5, and this area lies inside the 1.6x east–west stretch band (lon -6.2675 to -6.2612; the bridge is at lon -6.2631). Road and object widths in the game are not compressed.

---

## 1. Map data (OpenStreetMap)

### 1.1 Query
- Endpoint: `https://overpass-api.de/api/interpreter`, run 2026-09-28. The OSM base timestamp in the file is 2026-07-24.
- **BBox (S,W,N,E): `53.3437,-6.2676,53.3491,-6.2586`**. That is about ±300 m round the bridge (53.3463, -6.2631), from Grattan Bridge in the west to O'Connell Bridge in the east, and from Temple Bar/Dame St in the south to Middle Abbey St in the north.
- Pulled with `out geom;`: `building`, `building:part`, `highway` ways, `area:highway`, `bridge`, `man_made=bridge`, `natural=water`, `waterway`, `leisure` park/garden, `landuse`, `natural=tree`/`tree_row`, `railway`, `highway=street_lamp`, `historic` (without `boundary`, which excludes huge historic constituency relations), `tourism`, `barrier`, benches/bins/bike parking, bus stops, `public_transport`.
- Result: 2,455 elements, 1.8 MB. It includes 760 building/part footprints, of which 204 have `building:levels`, 43 have `height` and 43 have `roof:shape`. It also has 104 trees within 320 m, and about 40 DCC street lamps with names.
- Note: my first attempt was overwritten by a parallel agent's query file in the shared `%TEMP%`, and it returned Heuston data. That run was thrown away and the query re-run from a private scratch dir. The saved file is the correct area. You can check this: way 399007550 (Ha'penny Bridge) is present.

### 1.2 The bridge in OSM

| Element | OSM id | Key tags | Measured from geometry |
|---|---|---|---|
| Bridge outline | way **399007550** | `man_made=bridge`, `bridge:structure=arch`, `name=Ha'penny Bridge`, `alt_name=Liffey Bridge`, `old_name=Wellington Bridge`, `start_date=1816`, `tourism=attraction`, `wheelchair=no`, wikidata Q1034624 | Overall 53.7 m end to end, including landings. The narrow iron deck runs from 4.6 m to 47.4 m along the axis, so **~42.8 m**, which matches the 43 m span. The outline is **~3.6–4.0 m** wide over the deck and **flares to ~8 m** at each landing |
| Deck footway | way **808122953** | `highway=footway`, `bridge=yes`, `material=iron`, `surface=asphalt`, `width=4`, `layer=1` | 39.8 m, **bearing 160.5°** (NNW→SSE) |
| North steps | way **43325910** | `highway=steps`, `step_count=16`, `steps=17`, `width=4`, `surface=stone`, `handrail=yes` | 6.7 m run |
| South steps | way **49710631** | `highway=steps`, `step_count=16`, `steps=14`, `width=4`, `surface=stone` | 4.7 m run |
| Bridge lamps | nodes 12894627862 / 863 / 864 | `highway=street_lamp`, `name=LIFFEY BRIDGE (C)`, `operator=Dublin City Council` | Exactly **3 lamps on the centreline**, at **−13.0, 0.0 and +13.0 m** from mid-deck (±0.5 m) |
| Plaques | nodes 5376912544/5/6 | `historic=memorial`, `memorial=plaque` | One at the south landing and two at the north landing |

The bridge is **square to the river**. The river runs at a bearing of about 70.5° here (north quays 68–76°, south quays 248–256°), and the deck bearing of 160.5° is exactly perpendicular to that.

**River width at the bridge** (OSM water multipolygon relation 5736599, measured perpendicular to the river): **51.8 m** at the bridge, and 47–52 m within ±150 m either side.

**Quay road centrelines along the bridge axis**, measured from the top of the north steps:
- North: Ormond Quay Lower/Bachelors Walk centreline at −7.4 m, cycle track at −3.1 m.
- Water from 0 to 51.8 m.
- South: Wellington Quay centreline at +57.8 m.
- Merchant's Arch building face at +65.2 m.

So the quays are **65 m apart centreline to centreline**. On the south side the whole street (footpath, carriageway and footpath) from the quay wall to the Merchant's Hall façade is only **~13.4 m** wide.

### 1.3 Streets round the bridge (OSM)

| Street | OSM ways (main) | Real layout |
|---|---|---|
| Ormond Quay Lower (N, west of bridge) | 3791905, 1555337751/2; cycle track 1064203154/1064203151 | `secondary`, **one-way eastbound**, 2 (to 3) lanes, separate cycle track on the river side |
| Bachelors Walk (N, east of bridge) | 1330444412, 3790724, 25094727, 1555337753; cycle track 1064203150 (`width=1`) | `secondary`, **one-way eastbound**, 2–3 lanes, `psv` (bus) lane towards O'Connell St |
| Wellington Quay (S, west) | 3791747, 1288829647/8, 556390402, 1288829638… | `secondary`, **one-way westbound**, 2–3 lanes, `psv=yes` with `cycleway=share_busway` (bus lane) |
| **Crampton Quay** (S, directly east of the bridge, about 47 m long) | 13907389 | `secondary`, one-way westbound, 2 lanes, bus lane. Wellington Quay ends at Asdill's Row (53.346148, −6.262550) |
| Aston Quay (S, east) | 800772121, 1313723589… | `secondary`, one-way westbound, 2 lanes plus bus lane |
| Liffey Street Lower | 4396046 (one-way **southbound**, asphalt), **1258013806 (`pedestrian`, southern 64 m to the quay)** | Meets the north quay at 53.346628, −6.263200, right at the north landing, bearing **348.6°** |
| Merchant's Arch | 43984172 / 4401567 (`pedestrian`, paving), steps 43984171 | Runs from the quay at 53.346003, −6.262920 **through the arch** to Temple Bar at 53.345612, −6.262843. It lines up with the south landing, which is 4.4 m west of it |
| Asdill's Row | 25631021 | Sett lane, one-way, Crampton Quay → Temple Bar |
| Fownes Street Lower | 25631112 | Pedestrian, setts, off Wellington Quay |
| Liffey Boardwalk | 43319604 (O'Connell Br → Ha'penny), 43325903 (Ha'penny → Millennium), 43325905 | `footway`, `bridge=yes`, `surface=wood`. A **timber boardwalk cantilevered off the north quay wall** that stops on each side of the bridge landing |
| Millennium Bridge | 31028727 / outline 568699876 | Steel footbridge (1999), `width=4`, 46 m, about 135 m upstream. The **Millennium Walkway** (316644270) runs north from it into the Italian Quarter (Bloom Lane 228762865) |
| Great Strand Street, Middle Abbey St, Abbey Cottages, Bachelor's Way | 18927706, 37722122, … | Streets one block behind the north quays |

**Luas:** no tram tracks within about 150 m. The Red Line is on Abbey Street (~200 m north) and the Green Line is on O'Connell Bridge/Westmoreland St (~250 m east).

**Bus stops at the bridge:**
- "Ha'penny Bridge" on Wellington Quay (node 5143815722, stop 135101), about 75 m west of the south landing.
- Crampton Quay stop (5376849355).
- Aston Quay stops, and several Bachelors Walk stops (5631333855, 10282456768 …).

### 1.4 Street furniture and features in OSM
- **Street lamps:** about 40 DCC lamps, named by street:
  - The lamps along the north quays form rows about 13–14 m apart. For example, BACHELORS WALK (C) sits on a line 26 m east of the bridge axis.
  - MERCHANT'S ARCH (SE) lamps line the arch passage.
- **Trees:** 104 `natural=tree` nodes within 320 m, none with species tagged. The bridge-area rows are:
  - Bachelors Walk: a line of 8 trees from 9 m to 69 m east of the bridge. They sit close to the road centreline, so it is not clear which kerb they are on.
  - Ormond Quay Lower: west of the bridge.
  - Photos 06, 09 and 15 show large planes on the **river side** of both north quays.
  - South quays near the bridge: only scattered trees.
- **Artwork:** "Meeting Place" ("The Hags with the Bags", Jackie McKenna, node 631823520), a bronze of two women on a bench at the Liffey St Lower corner, about 22 m west and 49 m north of mid-bridge.
- **Benches** (backrest) on the boardwalk: nodes 10004421190, 10004459617, 10004439487.
- **Traffic islands / `area:highway`** round the landings: 1526445114 (raised), 553864229, 1320104439.

### 1.5 Buildings near the bridge (OSM footprints)

`building:levels` is sparse. The levels below come from OSM where tagged; otherwise they are counted from the photos.

| Building | OSM id | Levels | Notes |
|---|---|---|---|
| **Merchants' Hall / Merchant's Arch**, 48–49 Wellington Quay | way 281683058 (186 m²) | 3 (from photos 12/13) | Frederick Darley, 1821 (Archiseek). Granite ashlar, 3 bays, rusticated ground floor with 3 round-headed openings: window, pub door, and the **open archway**. `heritage=4` |
| 47 Wellington Quay | 281683060 | 3 (photo) | Pale grey render, round-arched recesses, blue doors (photo 12) |
| 50 Wellington Quay | 281683062 | 4 (photo) | Red brick, black shopfront (photo 13) |
| Ha'penny Bridge Inn, 42 Wellington Quay | 281685663 | **3** (OSM) | `heritage=4` |
| 1–3 Bachelors Walk (Liffey St corner) | 233804867, 233804852 | 4–5 (photo 04: brick corner block with a teal "Book Value" shop) | |
| 7 / 15 Bachelors Walk | 233804875 / 233804881 | **5 / 4** (OSM) | Brick Georgian terrace |
| The Winding Stair, 40 Ormond Quay Lower | 660336977 | 4 (photo) | **Ochre render with a top floor of round-arched windows**, bookshop and restaurant. A very recognisable backdrop for the north landing (photos 04, 07, 16, 17) |
| 42 Ormond Quay Lower | 557516204 | 4 (photo) | White/cream render (photo 04) |
| Zanzibar Locke / Hapenny Bridge House | 256728269 etc. | – | Further west on Ormond Quay Lower |
| 1–9 Aston Quay | 274036075–80 | **4** (OSM), `roof:shape=flat` | Abigail's Hostel at 7–9 |
| The Grand Social, 35 Liffey St Lower | 233804973 | – | |

Skyline landmarks seen from the bridge (photos 02 and 19): **Liberty Hall** (tall white tower, east), the **Custom House dome**, and the **Central Bank** (brutalist, south-east, in photos 01 and 05).

---

## 2. How the game compares

### 2.1 How the bridge is built in the game now
- `src/world/sites.js`:
  - The bridge axis is **`NQ6 → SQ6`**, and the span is whatever part of that line lies over `world.riverPoly`.
  - `w: 3.2`, `d: water length + 2`.
  - `view: spot('SQ7','SQ6',0.15)`.
- `src/world/landmarks.js` `hapenny()`:
  - A curved deck in 24 box segments (rise 2.6, end height 1.2).
  - Deck edges use `ironLace`, a **canvas texture of rings and verticals**.
  - Three `TubeGeometry` ribs spring from the water.
  - Three lamp arches are **semicircles as wide as the deck** with a glowing sphere on top, placed at t = 0.22 / 0.5 / 0.78.
  - There are no steps, abutments or wing walls.
- `src/world/ground.js`: the quay walls are generic stone, with a granite parapet box (0.7 × 1.0 m) along both banks. There is **no gap in the parapet** at the Ha'penny Bridge, because it is not a road `bridge` way.
- `src/world/furniture.js`: London planes are already placed on the river side of `Bachelors|Ormond…` quays. That is correct.

### 2.2 Differences

**Geometry and alignment** (source data from streets.json, compared with the OSM values):

| # | Issue | Game | Real (OSM) | Impact |
|---|---|---|---|---|
| G1 | **Bridge bearing** | NQ6 (53.34695, −6.26315) → SQ6 (53.34595, −6.2631): 178.3° raw, **177.3° in the game frame** | 160.5°, square to the river | In the game frame the quays run at 76–80°, so the game bridge is **~10° off square** to its own river. Because of the warp shear, the real bearing projects to 150.7°, so it cannot simply be copied |
| G2 | **South landing is misplaced** | SQ6 lands about **9.6 game m (~12 m real after the stretch) west** of the arch | The south landing is directly in front of **Merchant's Arch**; TBQ (53.34561, −6.26284) already matches the arch's south end | You lose the signature view down the bridge into the arch |
| G3 | North quay pushed away from the river | NQ5/NQ6/NQ7 are 28–32 m (real) north of the OSM centrelines. SQ5/SQ6 are 18/8 m south, SQ7 is 5 m south | – | Deliberate (keeps the Liffey readable). The game water here is about **36.7 game m ≈ 73 m real-equivalent** against the real 52 m (1.4x) |
| G4 | Liffey Street angle | NQ6→AB2 353.9° (game frame) | 348.6° | Small. AB2 sits about 40 m north of the real Abbey St junction, the same offset as the quay nudge |
| G5 | **Quay width** | `quay` type: 11 m road + 2 × 3.5 m pave = **18 m** | South quay at the bridge: **~13.4 m** kerb to building (wall to façade). North: about 18 m including the cycle track | The south quay reads too wide in front of Merchant's Arch |
| G6 | **One-way quays** | Every way is two-way; AI uses both directions | North quays one-way **eastbound**, south quays one-way **westbound**, each 2–3 lanes plus a bus lane | Traffic behaviour and lane markings are wrong along the whole Liffey, not only here |
| G7 | Street names | Wellington Quay `SQ4–SQ5–SQ6`, Aston Quay `SQ6–SQ7–SQ8` | Wellington Quay → **Crampton Quay** (the 47 m next to the bridge, east side) → Aston Quay | Only affects street-name HUD labels |

**Missing features:**
- **Merchant's Arch** pedestrian passage from the south quay to `TBQ`.
- Liffey St Lower's pedestrianised southern 64 m, so the north landing opens onto a pedestrian plaza.
- **Liffey Boardwalk.** This is the most visible missing piece of quay context: a timber deck about 4 m wide (photo estimate), cantilevered over the water off the north quay wall on steel brackets, with stainless-steel rail and long timber benches.
- Millennium Bridge (135 m upstream).
- Asdill's Row, Fownes St Lower, Bedford Row, Aston Place: minor lanes.

**Bridge model compared with reality:**

| Feature | Game | Real | Source |
|---|---|---|---|
| Span | about 38.7 game m (water plus 2) | **43 m** | Wikipedia infobox (citing Phillips & Hamilton); OSM outline 42.8 m |
| Deck width | 3.2 m | **3.66 m** (OSM `width=4`, outline 3.6–4.0 m) | Wikipedia; OSM |
| Rise | 2.6 m above end height, crown 3.8 m above the quay | **3.35 m** | Wikipedia (citing Structurae) |
| Rise:span | ≈ 1:15 | ≈ **1:12.8**, a shallow segmental/elliptical arch | derived |
| Ends | Deck ends in mid-air at y = 1.2, no steps | **Stone steps**: 17 at the north end (6.7 m run), 14 at the south (4.7 m), 4 m wide, between **granite wing walls that sweep down in curves** onto flared landings about 8 m wide | OSM steps ways; photos 01, 04, 05 |
| Railing | "Lace" of circles and verticals | **Plain close-set vertical round bars** with top and bottom rails and small spear finials. Big **urn-topped newel posts** at the ends | photos 03, 11, 16 |
| Spandrel band (rib to deck) | None (ribs are free tubes) | A deep band of **rectangular cells, each with an X/diagonal lattice**, running the full length on both faces. This is the main side-elevation motif | photos 02, 17, 18, 19, 20 |
| Ribs | 3 round tubes springing from the water | Cast-iron ribs made in **18 sections** (Wikipedia). Seen from below: several ribs tied by **diagonal lattice bracing**. They spring from **granite abutments at water level**, not from the water | Wikipedia; photos 01, 10, 17 |
| Lamp standards | 3 semicircular arches the full deck width, sphere lamp | 3 **openwork pointed/ogee arches** made of scrolled members from each railing. They rise to a central finial carrying **one lantern** (square-ish lantern with a cap, white). Positions **−13 / 0 / +13 m** from centre, i.e. t ≈ 0.20 / 0.50 / 0.80 of the 43 m span | OSM lamp nodes; Archiseek ("three lamps supported by curved ironwork over the walkway"); photo 03 |
| Colour | `0xf2f1ec` | Warm off-white, see §3.3. The original white colour was restored in 2001 | Wikipedia |
| Deck surface | iron colour | **Dark grey asphalt** (OSM `surface=asphalt`) | OSM; photo 16 |
| Parapet gap | Quay parapet runs straight across the landings | The granite quay parapet stops at both landings, and the landings open onto the footpath and crossing | photos 04, 05 |

---

## 3. Landmark profile

### 3.1 History (for the HUD or flavour)
- Opened **May 1816** as the *Wellington Bridge*. The official name has been *Liffey Bridge* since 1922.
- Cast by the **Coalbrookdale Company** in Shropshire. Designer and erector John Windsor.
- A ha'penny toll was charged until 1919, with turnstiles at each end.
- Restored in 2001 by Harland & Wolff. This brought back the original white paint, and "changes made at the two ends to allow standing room for pedestrians" (Archiseek). Those are the flared landings.
- Sources: Wikipedia "Ha'penny Bridge"; Archiseek "1816 – Ha'penny Bridge".

### 3.2 Recognition cues, checked against the photos

| Cue | Verdict |
|---|---|
| 1. **White cast-iron single, very shallow arch** across the whole river, much lighter than the stone road bridges on either side | ✅ confirmed (02, 17–20) |
| 2. **Three lamps on openwork ironwork arches over the deck**, one at the crown and two at the quarter points | ✅ confirmed (01, 03, 16, 19). They are pointed/ogee openwork, **not** simple semicircles |
| 3. **The side-elevation band of X-latticed rectangular cells** between rib and deck | ✅ confirmed. This reads more strongly at driving distance than the railing |
| 4. Railing | ⚠️ The prompt's "lattice/lace railing" is **wrong**. The walking railing is plain vertical bars. The "lace" is the spandrel band (cue 3) |
| 5. **Stone steps between curved granite wing walls** at both ends, landing straight onto a pedestrian crossing | ✅ confirmed (04, 05, 11) |
| 6. **Merchant's Arch** as the terminating view south, and **Liffey St / The Winding Stair** north | ✅ confirmed (05, 12, 13; 04, 07, 17) |

### 3.3 Materials and colours

Where a value is marked "sampled", it was averaged from pixels in the listed photo. Other values are visual estimates. Lighting differs between photos, so the ranges are wide.

| Surface | Hex | Source |
|---|---|---|
| Bridge paint, lit | **#ECE6DD** (overcast) to #F2EEE2 | sampled 01, 02 |
| Bridge paint, shade | #E0D8CE | sampled 01 |
| Deck surface | #3E3E3E | sampled 16 |
| Lantern glass by day | #8F9AAD (reflects sky) | sampled 03 |
| Granite wing walls and landings (clean) | #867E7A to #8A8580 | sampled 01, 04 |
| Granite steps (worn) | #585555 | sampled 05 |
| Quay wall (weathered granite with a dark water stain) | #3F3832 to #4E4339; a dark green algae band at the waterline | sampled 01, 02, 17 |
| Liffey water | #485758 to #777980 (grey-green) | sampled 02, 17 |
| Merchants' Hall granite ashlar | #948F7F upper, #6E6F5D rusticated ground floor in shade | sampled 12 |
| Render next door (47 Wellington Quay) | #A1A6A2; doors #24437A | sampled 12 |
| Georgian red brick (Wellington Quay / Bachelors Walk) | #8E5F4F | sampled 13 |
| Winding Stair ochre | ~#D9A441 | visual estimate, 04/17 |
| Boardwalk timber | #5C5858, weathered grey | sampled 01 |
| Litter bins (DCC) | #1F2225, dark green-black | sampled 01 |
| Road asphalt / footpath | #646E7A / #827D7B | sampled 12 |

### 3.4 Dimensions for the model (with sources)
- **Span 43 m, width 3.66 m, rise 3.35 m.** Source: Wikipedia infobox (Phillips & Hamilton; Structurae).
- **Deck length 42.8 m, and 53.7 m including the landings.** Measured from OSM outline 399007550.
- **Deck width 3.6–4.0 m, landings flaring to ~8 m.** Measured from the OSM outline.
- **North steps: 17 steps, 6.7 m. South steps: 14 steps, 4.7 m. Both 4 m wide.** Source: OSM ways 43325910 / 49710631. The rise per step is not recorded, see the open questions.
- **Lamp spacing: 13.0 m, lamps on the centreline.** Measured from OSM DCC lamp nodes.
- **Railing height about 1.1–1.2 m.** Estimated from photos 11 and 16 by comparing with adults. Unverified.
- **Lamp-arch apex about 2.5–3 m above the deck, lantern top about 3.5–4 m.** Estimated from photos 01, 16, 19. Unverified.
- **Spandrel band depth about 0.6–0.8 m at the crown.** Estimated from photos 17 and 20. Unverified.

### 3.5 Surroundings
- **North landing:** a signalised crossing of Ormond Quay/Bachelors Walk (east-bound traffic) onto pedestrianised Liffey St Lower.
  - Yellow box and traffic signals (photo 05).
  - The "Meeting Place" bronze on the corner.
  - The boardwalk breaks either side of the landing, and there is a kiosk on the boardwalk next to the landing (red in 2018, green in 2010: photos 06, 15).
  - Planes on the river side.
  - The 4–5 storey brick terrace of Bachelors Walk to the east, The Winding Stair (ochre) to the west.
- **South landing:** a narrow footpath, then a signalised crossing of Wellington/Crampton Quay (west-bound, bus lane), with "LOOK RIGHT"-style road markings (photo 12). Straight ahead is **Merchant's Arch**, and to the east Asdill's Row and the 4-storey Aston Quay terrace.
- **Quay walls:** vertical granite/limestone walls about 3–4 m above normal water. The south side has a **granite parapet about 1 m high** with iron railing sections. The north side has the boardwalk out over the water, with stainless handrail and inclined steel struts (photos 09, 10, 15).
- **Quay lighting:** tall grey single-arm lamp columns with sodium or white lanterns (photo 08). There are also tall white **flagpoles** on the south quay and at the north landing (photos 02, 07, 19).
- **Traffic:**
  - Double-deck Dublin Bus and coaches on both quays.
  - Bus lanes on the south quays.
  - A cycle track on the north side.
  - Heavy pedestrian flow across the bridge (27,000 per day in 2001, Wikipedia).
  - **No vehicles on the bridge.**
- **River:** tour boats (Spirit of the Liffey), kayaks and swans (photos 02, 19).

---

## 4. Reference images (`refs/hapenny-bridge/`)

All come from Wikimedia Commons. Items 05–06 and 09–20 are geograph.org.uk images that Commons mirrors. Those files were downloaded from geograph's own copy (same image, same author, same CC BY-SA 2.0 licence) because upload.wikimedia.org kept returning HTTP 429 for this IP. The geograph copies are 640–1024 px and carry geograph's attribution stamp. The Commons thumbnails are 1280 px: Wikimedia now only serves standard thumbnail steps, so a 1000 px width was not available. Full metadata is in `sources.json`.

| File | Author | Licence | Shows / camera position |
|---|---|---|---|
| 01-elevation-2023.jpg | Olliebailie | CC BY-SA 4.0 | From the north boardwalk, looking SW at the north landing. Wing wall sweep, steps, lamp arches, underside bracing, Merchants' Hall behind. **Best single model reference** |
| 02-evening-2023.jpg | Olliebailie | CC BY-SA 4.0 | Full elevation from the west (Millennium Br.). Arch profile, spandrel band, abutments; O'Connell Br., Liberty Hall and Custom House behind |
| 03-lamp-railing-detail.jpg | Sean MacEntee | CC BY 2.0 | Close-up of a lamp arch and lantern, and the vertical-bar railing |
| 04-deck-looking-north.jpg | Sean MacEntee | CC BY 2.0 | From the Wellington Quay crossing looking north up the south steps. Granite wing walls, Winding Stair, Liffey St |
| 05-from-liffey-st-lower.jpg | Eric Jones | CC BY-SA 2.0 | Driver/pedestrian view from the Bachelors Walk crossing looking south. Steps, crown lamp, Merchants' Hall and Central Bank behind |
| 06-from-ormond-quay.jpg | Eric Jones | CC BY-SA 2.0 | **From a car on Ormond Quay Lower looking east.** Planes, quay parapet, kiosk, bridge side |
| 07-from-crampton-quay.jpg | Joseph Mischyshyn | CC BY-SA 2.0 | From the south quay, east of the bridge, looking NW. Elevation plus the north frontage (Winding Stair) |
| 08-wellington-quay.jpg | Robert Linsdell | CC BY 2.0 | Dusk, looking east down the river from Grattan Bridge. Quay walls, quay lamps, flagpoles, the bridge's underside uplighting |
| 09-from-oconnell-bridge-west.jpg | Stephen Sweeney | CC BY-SA 2.0 | **From O'Connell Bridge looking west.** Boardwalk (right), south quay wall and buses (left), bridge in the distance |
| 10-bachelors-walk.jpg | John Sutton | CC BY-SA 2.0 | From the south-east looking NW. Rib, spandrel cells and lattice underside; Bachelors Walk brick terrace and boardwalk struts |
| 11-north-end.jpg | Eric Jones | CC BY-SA 2.0 | From the top of the north steps looking up Liffey St Lower. Railing bars and urn newels |
| 12-merchants-arch.jpg | Thomas Nugent | CC BY-SA 2.0 | Merchants' Hall front, face-on from the south landing |
| 13-merchants-arch-2.jpg | N Chadwick | CC BY-SA 2.0 | Merchants' Hall, oblique; No. 50 brick neighbour |
| 14-bus-wellington-quay.jpg | Richard Vince | CC BY-SA 2.0 | **1997**, Wellington/Aston Quay street scene. Historic liveries, so use only for building frontages |
| 15-boardwalk.jpg | N Chadwick | CC BY-SA 2.0 | Liffey Boardwalk on Bachelors Walk: timber deck, benches, rail, kiosk |
| 16-crossing-deck.jpg | N Chadwick | CC BY-SA 2.0 | On the deck looking north. Deck surface, railing, lamp arch, urn newels |
| 17-bridge-2018-a.jpg | N Chadwick | CC BY-SA 2.0 | Oblique from the south-west. Spandrel X-cells, underside lattice |
| 18-bridge-2018-b.jpg | N Chadwick | CC BY-SA 2.0 | Oblique from the south-east. Full span, north abutment |
| 19-bridge-2019.jpg | Thomas Nugent | CC BY-SA 2.0 | Elevation from the west. Lamp arches in profile, Liberty Hall, Custom House |
| 20-from-crampton-2016.jpg | Chris Morgan | CC BY-SA 2.0 | Oblique from the south-east. Clear spandrel cells, the north boardwalk under the bridge |

Not used:
- **Mapillary** needs an API access token, which I don't have, so it was not used and not worked around.
- **Google Street View / Maps** were not used.
- Commons files under FAL, or with a bare "Attribution" licence, were skipped.

---

## 5. Build brief (prioritised checklist)

### P0: road layout (`src/data/streets.json`)
- [ ] **Re-aim the bridge axis.** Add a south landing node **`HPS` ≈ [53.345993, −6.26292]** on the Wellington/Aston quay line, between SQ6 and SQ7 (about 10% along it), opposite Merchant's Arch. The line from HPS square to the game quays (bearing ~347° in the game frame) lands **exactly on `NQ6`** (computed intersection 53.34695, −6.263152). So use `NQ6 → HPS` as the bridge axis in `sites.js` instead of `NQ6 → SQ6`. That gives a perpendicular bridge, a correct view into the arch, and the Liffey St landing unchanged.
- [ ] Add **Merchant's Arch** as a `lane` with `pedestrian: true` from `HPS` to the existing **`TBQ`**, which already sits at the real south end of the arch. Model the arch building over it.
- [ ] Optionally split the south quay at HPS and one node about 47 m east, and name that stretch **Crampton Quay**.
- [ ] Mark the southern block of **Liffey Street** (NQ6 → about 64 m north) `pedestrian: true`, or give it a plaza/pave treatment.
- [ ] Longer-term, Liffey-wide: **one-way quays** (north eastbound, south westbound), plus a narrower south quay near the bridge (real kerb-to-façade about 13 m, against 18 m in the game). This needs a one-way flag in `geo.js`; flag it to whoever owns traffic.
- [ ] Leave the Liffey width nudges alone (they are deliberate).

### P1: hero model (GLB, replacing `hapenny()` in landmarks.js)
Target **12k–16k triangles**, one **2048² atlas**, with alpha-tested cut-outs for the ironwork.

Scale: fit the span to the game water, about 37 game m between the quay walls. Keep the **real deck width, 3.66 m**, and a **rise of about 3.0 m**, which keeps the real 1:12.8 ratio at the stretched span.

1. **Main arch structure**, one piece (~3k tris): two outer elevation faces carrying the X-cell **spandrel band** on an alpha card with a depth offset, plus the rib soffit.
2. **Underside:** 3 or more ribs and the diagonal lattice bracing, as alpha cards (~1k tris).
3. **Deck:** a curved strip with a dark asphalt top and an iron fascia (~0.5k).
4. **Railings:** an alpha-card strip per side, repeated vertical bars with top and bottom rails and spear tips (~0.8k). Add 4 **urn newel posts** at the landings, modelled at about 300 tris each.
5. **3 lamp arches:** openwork ogee arches as alpha cards set across the deck, crossed double cards (~0.6k). Add 3 **lanterns** as real geometry (~250 tris each), with an emissive night map.
6. **Abutments and landings, both ends** (~4k): granite pier blocks at water level, **curved sweeping wing walls**, stone steps (17 at the north end, 14 at the south; can be compressed to about 8–10 visual treads each to fit the game pavement), and the flared landings, about 8 m wide.
7. Collision: the deck should not be drivable. The steps block cars, so add collision boxes at the landings. The player can drive the quays past it.

### P2: textures
- A 2048 atlas holding:
  - white painted iron with subtle grime in the recesses
  - the spandrel X-cell cut-out
  - the railing-bar cut-out
  - the lamp-arch filigree cut-out
  - granite ashlar for the wing walls and steps
  - dark asphalt
  - a lantern emissive
- For the **granite quay wall near the bridge**, reuse the existing stone material, darkened toward #3F3832 and with a green-black algae band at the waterline (global, `ground.js`).

### P3: context to model
- **Merchants' Hall / Merchant's Arch** (48–49 Wellington Quay) as a mid-detail building (3–5k tris, same atlas or a second 1024): 3 storeys, 3 bays, granite ashlar, rusticated ground floor with 3 round-headed openings, the right-hand one an open walk-through arch. Gold "MERCHANTS ARCH" lettering and window-box flowers.
- **Liffey Boardwalk** from O'Connell Bridge to Grattan Bridge on the north side: an instanced timber deck strip about 4 m wide, cantilevered off the north quay wall, with stainless rail, struts and long benches. It breaks at each bridge landing. It is procedural along `river.north`, so it can be global.
- **Parapet gap** at the Ha'penny landings in `ground.js`: extend `inBridgeGap` to cover the Ha'penny site.
- The Winding Stair (ochre, arched top floor) and the 47/50 Wellington Quay neighbours as **textured façade overrides** on the procedural filler.

### P4: generic is fine
- Bachelors Walk / Aston Quay / Ormond Quay terraces: procedural brick, 4–5 storeys. OSM 7 and 15 Bachelors Walk: 5 and 4 levels; 1–9 Aston Quay: 4 levels, flat roofs.
- Planes on the north quays: already handled by `furniture.js`.
- Quay lamp columns, bins, bus stops, signals at the two crossings, flagpoles: reuse existing props.
- The Millennium Bridge (steel, 46 m × 4 m) could be a small separate prop later.

### Triangle budget summary
| Item | Tris |
|---|---|
| Arch + spandrel + deck | ~4.5k |
| Underside ribs/bracing | ~1k |
| Railings + newels | ~2k |
| Lamp arches + lanterns | ~1.4k |
| Abutments, wing walls, steps (×2) | ~4k |
| **Hero total** | **~13k** (fits the 8k–20k target) |
| Merchants' Hall (separate, optional) | 3–5k |

---

## 6. Open questions
1. **Rib count and section layout.** Wikipedia says the ribs were cast in 18 sections. The common reading is 3 ribs × 6 sections, but I could not confirm it from a primary source (DCC Bridges of Dublin site did not respond; Structurae is behind a JS challenge). Photos show several ribs tied by lattice bracing.
2. **Number of spandrel cells per face**, and the exact cell pattern (X-cross compared with rings). From the photos it looks like about 25–30 X-braced rectangles per face; count this from a higher-resolution Commons original once rate limiting clears.
3. **Lamp and railing heights** are photo estimates (railing about 1.1–1.2 m, lantern about 3.5–4 m above the deck). No published measurement was found.
4. **Rise definition:** is the 3.35 m (Structurae) measured from the springing or from the quay level? It affects how high the crown sits above the quay road.
5. **Step fit:** the real steps (4.7–6.7 m runs) can't fit in the game's 3.5 m pavement at 50% compression. Should we compress the treads, or let the landings push into the footpath and parapet line?
6. **Liffey St Lower pedestrianisation:** OSM now tags the southern 64 m `pedestrian`, but the 2010–11 photos show cars. Confirm this is current, and whether you want cars there in the game.
7. **One-way quays:** changing this is Liffey-wide and affects AI traffic and spawn logic. Is that in scope for this landmark pass?
8. **The kiosk at the north landing** has changed colour and operator over time. Probably leave it out.

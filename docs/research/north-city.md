# North city: Clerys, Parnell Square and Busáras (`north-city`)

Scope: three hero groups north of the river that were still generic filler.

- **Clerys**, O'Connell Street Lower, opposite the GPO, with the Clerys clock over its entrance.
- **The Parnell Square block** at the top of O'Connell Street: the Rotunda Hospital, the Ambassador (the old Rotunda), the Gate Theatre and the Garden of Remembrance with the Children of Lir. Findlater's Church is already built by the tallest-buildings work (`towers.js`, `sites.js tall.findlaters`) and was left alone. The Hugh Lane was not built (see §6).
- **Busáras**, Store Street / Beresford Place, beside the Custom House.

Data and references:

- Raw OSM: `data/osm/north-city.json`. It is an Overpass `out geom` pull, bbox **S 53.3486, W -6.2668, N 53.3556, E -6.2495**: buildings and building parts, the garden, water, artworks, historic nodes, clocks, highways, rail and tram, and the bus station. Snapshot `timestamp_osm_base` **2026-07-28T02:16:18Z**, served by overpass.private.coffee (overpass-api.de timed out). 2,531 elements. ODbL.
- References: `refs/north-city/` holds 20 images from Wikimedia Commons / geograph, all CC BY or CC BY-SA. Credits are in §2 and in `refs/north-city/sources.json`. Nos. 17-20 are copies of the Parnell Square refs gathered for `docs/research/canal-north.md` §2.
- Parnell Square background: `docs/research/canal-north.md` §3.1 (hero pack A), and the streets RN01-RN04 already in `src/data/streets.json`.
- Game coordinates come from the game's `project()`: half scale, the 1.6x east-west stretch band (Parnell Square West is inside it), and the north-south band shift (everything here is north of it).
- Tags: **VERIFIED** = read from OSM or a cited source. **est.** = my estimate.

---

## 1. Positions and footprints (VERIFIED, OSM)

| Feature | OSM | Real size | Position (lat, lon) | Game (x, z) |
|---|---|---|---|---|
| Clerys Quarter (18-27 O'Connell St Lower) | way 353983474, `building:levels` 6, stone, white | front on O'Connell St **49 m** (53.34894 to 53.34937), block 96 x 106 m back to Marlborough St | front centre ≈53.34916, -6.25968 | the OSM front falls **on the game's carriageway** (x ≈ -20 against a kerb at ≈ -14). The game O'Connell St is not where OSM puts it, so Clerys is placed off the street geometry (§5) |
| Clerys clock | node 1348371011, `amenity=clock`, Stokes, 3 faces, wall-mounted | – | 53.3492209, -6.2596962 | -18.1, -153.1 |
| Jim Larkin | node 603833916 (Oisín Kelly, 1979) | – | 53.3490908, -6.2599455 | on the O'Connell St median, already built (`oconnell.js CHAIN.larkin`) |
| Rotunda Hospital | relation 3586976 (whole campus) | bbox 170 x 129 m | 53.35202-53.35317, -6.26456 to -6.26200 | centre ≈ -178.7, -341.0 |
| Ambassador Theatre | way 250720712 | drum plus annexes 52 x 46 m; the drum ≈ 24-26 m across (est. from the curved edges) | drum centre ≈53.35283, -6.26213 | ≈ -118, -354 |
| Gate Theatre and Assembly Rooms | way 250718214 | 41 x 45 m | front on Cavendish Row, 53.35295-53.35335 | ≈ -120, -372 (its front edge falls on the game's Cavendish Row, 10 m inside the kerb) |
| Garden of Remembrance | way 14047792 (Dáithí Hanly) | 114 x 107 m bbox; the long south edge is 99 m at a bearing of 232° | 53.35324-53.35420, -6.26503 to -6.26332 | centre ≈ -226, -403.5 |
| The pool | way 228763406 (`natural=water`, `tourism=artwork`) | long arm 34.4 m x ≈4.5 m, cross arms 7.4 m each at the west end | 53.35368-53.35397 | ≈ -218, -409 |
| Children of Lir | node 2892010420 (Oisín Kelly, 1966/71, bronze) | – | 53.35362, -6.2645653 | -247.0, -398.0 (the west end of the pool) |
| Hugh Lane Gallery (Charlemont House) | way 357707494 | 70 x 87 m | 53.35409-53.35487, **north of** Parnell Sq North | ≈ -264, -446 (across the road from the garden) |
| Dublin Writers Museum / Irish Writers Centre | ways 281253912, 281253909 | 21 x 22 m, 16 x 17 m | 18-19 Parnell Sq North | ≈ -220, -440 |
| Busáras | way 318097724 (Michael Scott), `building:levels` 7, `layer` 1 | 88 x 65 m bbox. The west edge on Store St is 60 m at 24°/204°; the north edge is 66 m at 294°; a 5 m notch and a curved bay (the concourse's glass drum) on the south edge | 53.34953-53.35011, -6.25251 to -6.25119 | centre 242.6, -186.5 |
| Busáras driveways | ways 98070111, 932628055/6 (`access=private`, `bus=yes`) | – | along the south and east sides | – |
| Loop Line viaduct | ways 340514361-354358287 (`bridge=viaduct`, layers 1-2) | – | from the river just east of Butt Bridge, north over Beresford Place (game x ≈155), then north-east **across Store Street at ≈(208, -224)**, north of the Store St / Amiens St leg, to Connolly (≈304, -307) | clear of the Busáras block |
| Luas Red Line (Busáras stop, the Connolly spur) | ways 351689337-339 and others | – | along Store St and Beresford Place | the game's Luas runs along Beresford Place (BP2 "Busáras") |

**Heights (est.):** Clerys ≈24 m to the parapet: six storeys, with a giant order over three of them (refs 01, 07). The Rotunda Hospital's eaves are ≈15 m and its tower ≈33 m (canal-north §3.1). The Ambassador drum is ≈14 m to the blocking course (ref 17). The Gate's cornice is ≈15 m. Busáras's slab is seven storeys plus the penthouse, ≈25 m, and the Store St wing four storeys (refs 13, 14).

---

## 2. Reference images (`refs/north-city/`)

All are from Wikimedia Commons, downloaded at 1280 px or smaller. The generic User-Agent `DublinDriveResearch/1.0 (hobby game research)` was used. No Google imagery. One "No known restrictions" NLI photo of the clock was seen but **not** used, because it is not a CC licence.

| File | Author | Licence | Shows |
|---|---|---|---|
| 01-clerys-front-2010.jpg ([source](https://commons.wikimedia.org/wiki/File:Clerys,_Dublin,_October_2010.JPG)) | Ardfern | CC BY-SA 3.0 | Close up of the front: fluted Ionic columns, the metal-framed windows with green bronze balconettes, the dentil cornice with rosettes, the clock on its bracket, the CLERY & Co fascia over the doors |
| 02-clerys-2009.jpg ([source](https://commons.wikimedia.org/wiki/File:2009-09-27_Ireland_Dublin_Clerys_020a.jpg)) | Sir James | CC BY-SA 3.0 | Oblique of the front |
| 03-clerys-psyberartist.jpg ([source](https://commons.wikimedia.org/wiki/File:Clerys_(8197432472).jpg)) | psyberartist | CC BY 2.0 | Front detail |
| 04-clerys-clock.jpg ([source](https://commons.wikimedia.org/wiki/File:Clerys_(8111411237).jpg)) | psyberartist | CC BY 2.0 | **The clock**: a square black case with a green dial, gold Roman numerals and hands, CLERYS gilt on the top rail, oval side dials, four lanterns, a pendant; STOKES CORK |
| 05-clerys-geograph-2257511.jpg ([source](https://commons.wikimedia.org/wiki/File:Clery%27s_Department_Store_in_O%27Connell_Street_-_geograph.org.uk_-_2257511.jpg)) | Eric Jones | CC BY-SA 2.0 | From the footpath |
| 06-clerys-across-oconnell-2265077.jpg ([source](https://commons.wikimedia.org/wiki/File:View_across_O%27Connell_Street_towards_Clerys_Department_Store_-_geograph.org.uk_-_2265077.jpg)) | Eric Jones | CC BY-SA 2.0 | **Driver's eye** across the street: the planes, the median, the long white front |
| 07-clerys-imperial-2016.jpg ([source](https://commons.wikimedia.org/wiki/File:Imperial-Hotel-(old-Clerys-building)-1-Dublin-Sep2016.jpg)) | Offdaw | CC BY-SA 4.0 | **Key elevation**: end bays, the colonnade, the attic, the balustraded parapet with the raised CLERY & CO LTD panel, flagpoles, and the clock right of centre |
| 08-busaras-2009.jpg ([source](https://commons.wikimedia.org/wiki/File:Busaras-2.jpg)) | Superbass | CC BY-SA 3.0 | **The wavy canopy**: a thin concrete slab folded into waves with green-edged crests, the curved glass concourse bay, a band of blue and white triangle mosaic, the blue curtain-walled slab behind |
| 09-busaras-2011.jpg ([source](https://commons.wikimedia.org/wiki/File:Busaras_2011.jpg)) | Cianboy | CC BY-SA 4.0 | The slab |
| 10-busaras-mosaic-2011.jpg ([source](https://commons.wikimedia.org/wiki/File:Mosaic_Busaras_2011.jpg)) | Cianboy | CC BY-SA 4.0 | The blue mosaic |
| 11-busaras-from-beresford-place.jpg ([source](https://commons.wikimedia.org/wiki/File:Busaras_As_Seen_From_Beresford_Place_(Dublin)_-_panoramio.jpg)) | William Murphy | CC BY-SA 3.0 | From Beresford Place: the glazed slab, a stone end wall, the brick base |
| 12-busaras-blume-2017.jpg ([source](https://commons.wikimedia.org/wiki/File:Busaras,_Dublin_(_DSC6356).jpg)) | Matti Blume | CC BY-SA 4.0 | 2017 view |
| 13-busaras-from-east-1973903.jpg ([source](https://commons.wikimedia.org/wiki/File:Bus_Aras_from_the_East_-_geograph.org.uk_-_1973903.jpg)) | Eric Jones | CC BY-SA 2.0 | **From Amiens St**: the lower glazed block with the canopy over the bus bays, the tall slab end-on (Portland stone end wall on a brick base) |
| 14-busaras-dusk.jpg ([source](https://commons.wikimedia.org/wiki/File:Bus%C3%A1ras_at_dusk.jpg)) | Alan Grant | CC BY 2.0 | **Night look**: the lit concourse under the downlit canopy, the offices lit, the penthouse pavilions with cantilevered roofs |
| 15-busaras-2002.jpg ([source](https://commons.wikimedia.org/wiki/File:2002-05-Busaras-Dublin.jpg)) | Gunnar Klack | CC BY-SA 4.0 | 2002 view |
| 16-busaras-2023.jpg ([source](https://commons.wikimedia.org/wiki/File:Bus%C3%A1ras,_Dublin.jpg)) | Conoronmaps | CC BY-SA 4.0 | 2023 view |
| 17-ambassador-gate-parnell-sq-east.jpg ([source](https://commons.wikimedia.org/wiki/File:The_Ambassador_Theatre,_the_Gate_Theatre_and_Parnell_Square_East_-_geograph.org.uk_-_2261305.jpg)) | Eric Jones | CC BY-SA 2.0 | **The top of O'Connell St**: the Ambassador drum, the Gate, Findlater's spire |
| 18-rotunda-hospital.jpg ([source](https://commons.wikimedia.org/wiki/File:The_Rotunda_Hospital,_Parnell_Square_-_geograph.org.uk_-_2261257.jpg)) | Eric Jones | CC BY-SA 2.0 | The Rotunda Hospital front |
| 19-children-of-lir.jpg ([source](https://commons.wikimedia.org/wiki/File:Dublin_-_Garden_of_Remembrance_-_20191126163217.jpg)) | Oliver Gargan | CC BY-SA 4.0 | The Children of Lir, the marble apse, the wave plinth |
| 20-garden-of-remembrance.jpg ([source](https://commons.wikimedia.org/wiki/File:Garden_Of_Remembrance_-_Statue_Of_The_Children_of_Lir_by_Ois%C3%ADn_Kelly_(Rebirth_%5E_Resurrection)_-_panoramio.jpg)) | William Murphy | CC BY-SA 3.0 | The garden: granite walls, steps, lawns, the pool, Findlater's |

---

## 3. Landmark profiles

### 3.1 Clerys (VERIFIED: Wikipedia; NIAH / DCC RPS; refs 01, 04, 07)

- Built 1919-22 by Robert Atkinson (with Ashlin & Coleman) after the 1916 Rising burned the old store. It was modelled on Selfridges.
- The store closed in 2015. It reopened as the **Clerys Quarter** (a hotel, offices and shops) behind the retained front.
- The front (ref 07):
  - Ground-floor shopfronts between stone piers.
  - A balcony course.
  - A **giant order of fluted Ionic columns through three storeys**, with big metal-framed windows between them and green bronze balconettes.
  - A dentilled cornice with a row of rosettes in the frieze.
  - An attic storey.
  - A **balustraded parapet** with a raised central panel lettered **CLERY & CO LTD**.
  - Flagpoles.
  - The end bays are solid pavilions with single windows.
- **The clock** (ref 04) is by Stokes of Cork. It is a square black case with green dials, gold Roman numerals and "CLERYS" on the top rail, four lanterns and a pendant. It hangs on a bracket from the first floor over the main entrance, right of centre on the front. "Meet me under Clerys clock" was the classic Dublin rendezvous.

### 3.2 The Parnell Square block

See canal-north §3.1 for the history. Cues from refs 17-20:

- **The Rotunda Hospital** (Richard Cassels, 1751-57):
  - A granite front on Parnell St: seven bays and three storeys over a rusticated ground floor with round-headed windows.
  - The three middle bays sit under a **pediment on four engaged columns**.
  - The **three-stage tower with its copper cupola** stands behind the pediment.
  - A curved block and a pavilion to the west. A railed forecourt with gate piers.
- **The Ambassador** (James Ensor, 1764-67):
  - A buff **drum** with blind panels and windows, the **Coade-stone swag and ox-skull frieze**, a cornice and blocking course, and a very low dome with a green rim.
  - A lower curved entrance range faces the corner. It stands in the vista up O'Connell St.
- **The Gate** (Richard Johnston, 1784-86): on Cavendish Row, four **giant engaged columns under a pediment** across the whole front, a rusticated ground floor, and **GATE** in big letters on a parapet block (ref 17).
- **The Garden of Remembrance** (Dáithí Hanly, 1966):
  - Railings on a granite wall along Parnell Sq North. Lawns and trees.
  - A **sunken paved court with the cruciform pool**, whose floor is a blue mosaic of broken spears, swords and shields.
  - At the west end, a curved **marble apse** with Oisín Kelly's **Children of Lir** (1971): the four children falling forward while four swans rise behind them with spread wings, on a wave-carved plinth. The tricolour flies behind.

### 3.3 Busáras (VERIFIED: Wikipedia, DIA, refs 08-16)

- Michael Scott (Scott & Partners), 1945-53. It is Dublin's first major modernist building and is on the Record of Protected Structures.
- The central bus station occupies the ground floor. The Department of Social Protection has offices above.
- Massing (OSM footprint plus refs 13 and 14):
  - A **seven-storey office slab along the north**, with curtain walls of glass, white floor bands and **blue mosaic spandrels**.
  - Portland-stone end walls on a brick base.
  - **Penthouse pavilions with cantilevered flat roofs** on top.
  - A **four-storey wing on Store St**.
  - A **single-storey glazed concourse** in the angle, with a **curved glass bay** onto Beresford Place and a band of **blue and white triangle mosaic**.
- The famous **wavy canopy**: a thin concrete slab whose edge rises and falls in waves, with a green edge on the crests (ref 08). It shelters the concourse front and the bus bays.
- The bus yard opens to the east, towards Amiens St and Memorial Road.

### 3.4 Colours (hex, estimated from the refs)

| Surface | Hex |
|---|---|
| Clerys stone (Portland-type) | `#d9d4c8` |
| Clerys window frames, balconettes | `#5a6a5e` / `#5e6b5c` (green bronze) |
| Clerys clock | case `#121513`, dial `#1f4a3a`, gilt `#d4a93c` |
| Rotunda / Gate granite | `#b3ab9c`, rusticated `#a8a092` |
| Ambassador render | `#bdb096`, swags `#e6dcc6` |
| Copper (cupola, dome rim, canopy crests) | `#6fa596` |
| Pool mosaic | `#2c5f8e` with pale motifs |
| Children of Lir bronze | `#55605a` (weathered), against marble `#dcdad3` |
| Busáras curtain wall | glass `#6f8ba6`→`#2f455c`, spandrels hsl(208-222, 60%, 38-56%), bands `#eef0ee` |
| Busáras concrete | `#e4e2dc`; brick `#9a4b33` |

### 3.5 Recognisable cues

1. The long white Clerys front with its giant columns, facing the GPO across the median, and the **clock over the door**, lit at night.
2. **The Ambassador drum closing the vista up O'Connell St**, with the Gate's portico beside it.
3. The Rotunda's **cupola tower** over Parnell St.
4. The sunken **cruciform blue pool** and the **Children of Lir** against the marble apse.
5. **Busáras's wavy canopy** under the glass-and-mosaic slab, beside the Custom House.

---

## 4. Build brief (as built)

- **One GLB** (`tools/blender/build_northcity.py` → `public/models/northcity.glb`, **158 KB**, Draco).
  - It has six roots: `clerys`, `rotunda`, `ambassador`, `gate`, `garden`, `busaras`. Each is built in game metres in its own front frame.
  - The shared numbers (widths, depths, the garden's trapezoid, the Rotunda link) are in `src/data/northcity.json`, which both the build and `sites.js` read.
- **Materials and textures** (`src/world/northcity.js`): all painted at load, about 14 materials in total.
  - Stone, granite, rustic, render, brick, slate, pave and concrete use `stoneTile`s in true metres.
  - Busáras's curtain wall is a 6.2 m tile (two storeys by four bays) with a night twin.
  - A 1024 atlas holds windows, shopfronts, the clock faces, lettering (CLERY & CO LTD, GATE, AMBASSADOR, BUSÁRAS), balustrades, railings, the swag frieze, the pool mosaic, the marble, the swans' wings, the wave relief and the tricolour. It has a half-size night canvas.
  - Low / Battery saver paint the textures at half size (the `LITE` path, as for the 3Arena).
- **Triangles** (after the AO subdivision; the AO is baked into vertex colour):

| Root | Tris |
|---|---|
| Clerys | 1,758 |
| Rotunda Hospital | 2,277 |
| Ambassador | 1,412 |
| Gate | 679 |
| Garden (incl. the Children of Lir ≈450) | 734 |
| Busáras | 1,772 |
| **Total** | **≈8.6k** |

- **Night:**
  - The stone, granite, render and concrete use the shared `uplit` floodlight (`setStoneNight`).
  - The atlas emissive lights the Clerys windows and shopfronts, the **clock's three dials and four lanterns**, the Rotunda / Gate sashes (random), the Busáras concourse, and the GATE, AMBASSADOR and BUSÁRAS lettering.
  - Busáras's curtain wall lights its offices, some left dark.
- **Draw calls:** the four Parnell Square roots are merged into one mesh per material after placement, which takes about 30 draw calls down to 13. This is pure efficiency, so it applies on every profile. Clerys and Busáras are ~400 m apart and keep their own meshes so each is culled separately.

## 5. Placement (`src/world/sites.js`, `NC`)

- **Clerys.**
  - The front stands on the east footpath's back edge (`along(s, -(15 + 3.5 + 0.2))`), facing south along O'Connell St.
  - `s` is the chainage of the OSM clock node + 5 m, so the clock (bay 6 of 8) lands at its OSM chainage, 7 m north of Larkin's statue, and faces the GPO's south half as in reality.
  - W 34 x D 24 game m (half-scale plan ≈0.7 of the real 49 m front; roads are real width, so a true half reads thin next to the GPO's 54 m).
  - The clock case is 1.6 m and hangs 2 m out over the footpath at 6.9-8.6 m.
- **Parnell Square.** The block's inset corners are computed from the street graph: each road's half width + footpath from RN01, OC4, RN04, RN03 and RN02.
  - The **Rotunda** front stands 4.5 m behind the Parnell St footpath (the railed forecourt), with the main block's centre 26.5 m in from the west corner. Its link range runs east to the Ambassador (`linkU` 24.5).
  - The **Ambassador** drum (R 9.5) sits in the corner, tangent to both footpaths + 0.6 m, and faces up O'Connell St.
  - The **Gate** fronts Cavendish Row, its north end at the bend into Parnell Square East.
  - The **Garden** is a trapezoid (91 m along Parnell Sq North, 46 m deep). Its west end runs parallel to Parnell Sq West (0.464 m per m); the east end is square.
  - The OSM garden projects inside this block to within a few metres. The real garden is sunken, but the game ground can't be cut, so the lawns stand on a 1.1 m terrace with the court and the pool at street level. From the railings it reads the same, stepping down to the water.
- **Busáras.** It is squared to the game's Store St (which runs due north here; the real street is at 24°), with its SW corner at the Store St / Beresford Place footpaths. W 40 x D 34 (≈0.6 of real).
  - The bus yard (22 m) east of it is kept open (`extraSites.busarasYard`, not solid).
  - The Loop Line (OSM) crosses Store St north of the block, and Amiens St is left clear for the railway work.
- **Reserved / collision:**
  - Reserved boxes: Clerys, the Rotunda front and rear, the Ambassador, the Gate, the garden (two slabs), Busáras and its yard.
  - Collision: boxes for the buildings, a 20-sided ring round the drum (+ the entrance range), and the garden's trapezoid as a closed polyline.
  - `footprints.mjs` and `bridges.mjs` are clean.
- **Places:** Clerys, "Parnell Square and the Rotunda", Garden of Remembrance, Busáras (with blurbs in `hud.js` and map glyphs).

## 6. Not done / open

- **The Hugh Lane** (Charlemont House) and the Writers Museum stand on the *north* side of Parnell Sq North, outside the block. They are still generic Georgian filler.
- **The Children of Lir** is a low-poly suggestion: tapered bronze prisms and cut-out wing cards, not the statue kit. It reads at driving distance but not up close.
- **Clerys** is only as deep as the front block (24 m); the Clerys Quarter's rear buildings to Marlborough St are filler.
- **The Rotunda's rear** is two plain brick ranges. The Pillar Room, the chapel and the modern hospital blocks are not modelled.
- **Busáras's real orientation** (24° off the game's Store St) is squared to the road; the south canopy leg runs along Beresford Place rather than the real concourse front.

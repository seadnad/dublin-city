# Aviva Stadium and its approaches (`aviva`): Phase 1 research

Scope: the Aviva Stadium (Lansdowne Road) and the streets that tie it to the existing map and to the Grand Canal (south) network. That covers:
- Grand Canal Street Upper, Clanwilliam Place, Haddington Road (east of Northumberland Rd), Northumberland Road (south of Haddington Rd), Pembroke Road to Ballsbridge, Shelbourne Road, Lansdowne Road with the DART level crossing, Bath Avenue, London Bridge / Londonbridge Road, Tritonville Road and Newbridge Avenue (the loop east of the Dodder), and South Lotts Road.
- The Grand Canal from Huband Bridge (lock C3) east past Mount Street Bridge (C2) and Macquay's Bridge (C1) into Grand Canal Dock's inner basin, and the sea locks.
- The River Dodder along the east side of the stadium.

Data and method:
- **Raw OSM:** `data/osm/aviva.json`. Overpass `out geom`, bbox **S 53.3290, W -6.2475, N 53.3440, E -6.2220** (≈1.7 km E-W by 1.7 km N-S). Snapshot `timestamp_osm_base` **2026-09-28T22:54:02Z**, 3,600 elements. It holds:
  - highways, railways, waterways and water areas, leisure, landuse, man_made, diplomatic and historic features across the whole bbox
  - buildings, building:parts, entrances and barriers only in the stadium box (53.3325-53.3380, -6.2320 to -6.2250)
- **References:** `refs/aviva/` holds 16 images from Wikimedia Commons, geograph and panoramio. Credits are in §2 and in `refs/aviva/sources.json`.
- **Mapillary:** not used (no API token).
- **Coordinates:** everything below is **lat/lon**. No game coordinates are given, because the outer ring may get its own compression.
- **Status tags:** facts carry **VERIFIED** (with source) or **est.** (my estimate from photos or OSM geometry).
- **Neighbour status:** the canal-south researcher's network is already in the working copy of `src/data/streets.json` (`GXS*` nodes). This brief stitches onto it. Their hand-off notes are in `docs/research/canal-south.md` §5 Q1.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 The stadium on the ground (VERIFIED, OSM)

The building is OSM relation `3357396`: `building=stadium`, `building:levels=7`, `covered=yes`, `old_name=Lansdowne Road Stadium`. Its outer ring is way `249663148`. The inner ring (`249663147`) is the roof opening. The whole site is way `128521419` (`leisure=stadium`, "Aviva Stadium", `alt_name` "Dublin Arena"). OSM has **no height tags and no building:parts**.

| Element | lat, lon | Note |
|---|---|---|
| **Pitch centre** (the anchor) | **53.33519, -6.22827** | Centroid of the roof opening. It matches the pitch polygon `228122478` to within 1 m. |
| **Pitch axis** | bearing **344°** (±2°) | The north end points 16° west of true north. This comes from the pitch polygon's end mid-points. The roof opening's long axis agrees. |
| North tip of outer ring | 53.33589, -6.22860 | 80.5 m from the centre (the north stand is shallow) |
| South tip of outer ring | 53.33426, -6.22782 | 108.4 m from the centre. It stands ≈5 m from the Lansdowne Rd centreline. |
| East extreme (Dodder side) | 53.33545, -6.22674 | 105.7 m |
| West extreme (railway side) | 53.33492, -6.22983 | 108.1 m |
| Roof opening, N / S ends | 53.33580, -6.22856 / 53.33460, -6.22798 | The opening is **139 m** along the axis by **96 m** across |
| Pitch (grass incl. run-off) | corners ±42 m across by ±65 m along | ≈85 x 131 m of grass. Wikipedia gives the playing area as **106 x 68 m** (VERIFIED). |

**Plan extents from OSM, in the pitch frame:** 189 m along the axis by 214 m across. The published figures (VERIFIED: irishrugby.ie "A Numbers Game", 2010; World Construction Network) are **189.9 m north-south by 203 m east-west**, "excluding podium and grand stairs". The OSM ring includes some podium, which explains the 11 m difference.

**Polar profile of the plan.** θ is measured clockwise from the north end: 0° = north end, 90° = east (Dodder) side, 180° = south (Lansdowne Rd), 270° = west (railway). R is the outer ring and r is the roof opening, both in metres from the pitch centre. This is the lofting input for the Blender build.

| θ | 0 | 15 | 30 | 45 | 60 | 75 | 90 | 105 | 120 | 135 | 150 | 165 | 180 | 195 | 210 | 225 | 240 | 255 | 270 | 285 | 300 | 315 | 330 | 345 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R | 80 | 83 | 91 | 102 | 106 | 105 | 105 | 108 | 113 | 117 | 115 | 111 | 108 | 111 | 117 | 118 | 113 | 110 | 108 | 108 | 108 | 104 | 91 | 83 |
| r | 70 | 71 | 69 | 59 | 53 | 49 | 48 | 50 | 55 | 63 | 69 | 70 | 69 | 70 | 68 | 62 | 54 | 49 | 48 | 49 | 53 | 61 | 70 | 71 |

The plan is a rounded "cushion". It is fullest at the SE and SW shoulders (θ 135° and 225°, R ≈118 m), and it pinches in hard at the north end (R 80 m), where the single-tier stand is.

**Entrances (OSM nodes):**
- `11816365194` "Entrance C": 53.33417, -6.22850. This is the south plaza on Lansdowne Rd.
- `5117626142` "Stadium Entrance E": 53.33421, -6.22895, by the level crossing.
- Unnamed: 53.33462, -6.22674 (SE, Dodder side), 53.33456, -6.22957 (W), 53.33408, -6.22978 (SW), 53.33380/53.33384, -6.22899 (the station side of the crossing).
- Ref 11 shows **Entrance A**, glazed doors marked "A" under the louvres with silver "AVIVA STADIUM" letters, "next to Lansdowne Road DART station".

**Immediate neighbours (OSM):**
- **Havelock Square** (`37770162`-`74055983`, single-lane residential loops) sits hard against the **north** end. Its south houses are at 53.33588, only ≈12 m beyond the north tip. It has a small green (`43633643`).
- **Bath Avenue** runs E-W ≈180 m north of the pitch centre.
- **Lansdowne FC back pitch** (`228122481`, rugby, artificial) lies east, between the stadium and the Dodder. Beside it are the **Lansdowne Rugby Football Club** (`228122482`, 3 levels) and the **Stadium Management Building** (`357837447`, 3 levels) at the SE corner.
- **Lansdowne Tennis Club** is north-east, by London Bridge.

### 1.2 The DART under the West Stand and the Lansdowne Road level crossing (VERIFIED, OSM)

The railway runs **NW to SE along the west side** of the stadium and passes **under the west podium in a covered way**:
- Ways `23013780` and `311960796` are tagged `covered=yes`, `layer=-1`.
- The covered way runs from **53.33509, -6.23044** to **53.33424, -6.22933** (≈125 m).
- It clips the SW corner of the site, ≈30 m outside the stand's outer ring.

Wikipedia (Lansdowne Road) says the old stadium's West Stand also straddled the line: "passed directly underneath the West Stand". World Construction Network says the new build needed "a new access podium over the railway line". Ref 03 shows the podium, the grand stairs and the covered way.

**The line from Grand Canal Dock to the stadium:**

| Point | lat, lon | Notes |
|---|---|---|
| Grand Canal Dock station | 53.33970, -6.23800 | On a viaduct / embankment. Platforms on `layer=1`. |
| Over **Barrow St** (UBR 59, viaduct) | 53.33910, -6.23665 | Barrow St drops to **one lane, `oneway=alternating`**, under it (`80390832`, `1477816561`) |
| Embankment | 53.33792, -6.23447 | |
| Over **South Lotts Rd** (UBR 60) | 53.33757, -6.23389 | Low steel bridge |
| Over **Bath Avenue** (UBR 61) | 53.33722, -6.23332 | Low steel bridge |
| Descends to grade | 53.33538, -6.23084 | |
| Covered way (under the podium) | 53.33509, -6.23044 → 53.33424, -6.22933 | |
| **Level crossing XR001** on Lansdowne Rd | **53.33406, -6.22910** | Nodes `97230007` / `3177396832`, `railway=level_crossing`, **`crossing:barrier=double_half`** |
| Lansdowne Road station | building node 53.33377, -6.22871; platforms 53.33396 → 53.33264 | **Two side platforms, ≈150 m.** Platform 1 is on the west side. The platforms are joined by a subway, with separate entrances each side of the crossing (Wikipedia). |
| Over the **Dodder** (UBR 63C) | 53.33312, -6.22786 | |
| Onward to Sandymount | 53.32776, -6.22087 | |

- **Crossing details** (ref 07, looking east along Lansdowne Rd; the stadium is on the left):
  - red-and-white striped barrier booms
  - wig-wag lights and signal heads
  - a stone boundary wall
  - a **small hipped-roof hut** (cabin or station building) on the south side
  - the Poolbeg chimneys on the skyline
  - rails set in the road, two tracks, **overhead catenary** (`electrified=contact_line`)
  - `maxheight=5` is tagged on Lansdowne Rd (`945535910`) right at the crossing
- **Station** (ref 12): low red-brick platform buildings with canopies on cast-iron columns, a wooden-clad signal box or office, and tall green DART EMUs.
- The Wikipedia opening date conflicts (1870 infobox / 1872 text). It only matters for a HUD blurb.

### 1.3 The River Dodder (VERIFIED, OSM)

- **Setting:** the Dodder runs up the **east side** of the stadium in a **canalised channel with stone and concrete walls** (refs 09, 10). It meets the Liffey at Ringsend, just east of the Grand Canal Dock sea locks.
- **Width:** ≈27-43 m real between walls (water polygon `30466180`).
- **Tidal:** below the weir at Lansdowne Rd; mud banks show at low tide (ref 10).

**Centreline**, upstream to downstream (OSM waterway ways `124755288`/`124755300`/`317312601`/`124755294`/`317101096`/`124755290`/`124755293`):
```
[53.33309,-6.22779], [53.33374,-6.22732], [53.33401,-6.22666], [53.33438,-6.22558],
[53.33473,-6.22508], [53.33500,-6.22503], [53.33547,-6.22534], [53.33761,-6.22661],
[53.33946,-6.22784], [53.34166,-6.22899], [53.34382,-6.22962], [53.34439,-6.22970], [53.34500,-6.22950]
```

**Water polygon**, simplified from `30466180`, running from Lansdowne Rd bridge to Ringsend (ends at 53.3438):
```
[[53.34384,-6.22995],[53.34169,-6.22935],[53.34143,-6.22916],[53.33766,-6.22687],[53.33733,-6.22675],
 [53.33624,-6.22612],[53.33522,-6.22531],[53.33482,-6.22527],[53.33447,-6.22564],[53.33430,-6.22528],
 [53.33456,-6.22502],[53.33510,-6.22489],[53.34164,-6.22875],[53.34373,-6.22914],[53.34384,-6.22926]]
```

South of Lansdowne Rd, the stretch to the rail bridge (`302167826`):
```
[[53.33359,-6.22735],[53.33335,-6.22767],[53.33342,-6.22784],[53.33371,-6.22755],[53.33395,-6.22706],
 [53.33441,-6.22576],[53.33447,-6.22564],[53.33434,-6.22537],[53.33394,-6.22663]]
```

**Bridges in scope:**

| Bridge | Position | Details |
|---|---|---|
| **Lansdowne Rd bridge** (OSM `bridge:name=Newbridge`) | 53.33445,-6.22571 → 53.33430,-6.22543 | 2 lanes |
| **London Bridge** | 53.33762,-6.22693 → 53.33768,-6.22639 | **One lane, `oneway=alternating`**. Stone, 2 arches (ref: "River Dodder, Bridge at Bath Avenue", geograph 5417723, not kept). |
| **Ringsend Bridge** (Bridge St) | 53.34168,-6.22875 → 53.34164,-6.22925 | |
| DART UBR 63C | 53.33312, -6.22786 | Rail only |

### 1.4 The existing game map near here, and how it differs

The existing SE corner of the map is **offset about 90-150 m north of reality** around Grand Canal Street. The canal cannot be added cleanly without fixing that.

| Game node | Game lat, lon | Real position | Problem |
|---|---|---|---|
| `GCB` (end of Grand Canal St Lower / start of Upper) | 53.33978, -6.2382 | **Clanwilliam Pl / GCS Lower junction, 53.33871, -6.23911**, the north end of Macquay's Bridge | 118 m too far N. It sits on the south tip of the inner dock basin (53.33972, -6.23780) and next to Grand Canal Dock station. |
| `BW1` (GCS Upper × Barrow St) | 53.33947, -6.2368 | **53.33809, -6.23694** | 150 m too far N. That puts it on the Barrow St rail underpass. |
| `MT1` (end of the old way `Mount Street Lower` MSNE→GT0→MT1) | 53.33866, -6.2385 | Real Mount St Lower ends at **Mount Street Bridge (GXSMS1)**. MT1 is really on Macquay's Bridge (canal-south §5 Q1). | Now superseded by `GT0→GXSMS1`. The GT0→MT1 leg is a duplicate "Mount Street Lower" dead end. |
| `Barrow Street` `BW1→RR1` | lon -6.2368/-6.237 | Real lon -6.2363 to -6.2369 | ≈40-50 m too far W. Fine once BW1 is re-pinned. |
| `SD1` (Ringsend Rd end) | 53.3416, -6.2314 | 53.34151, -6.23142 (Ringsend Rd / Bridge St / South Lotts Rd / South Dock Rd) | Correct. South Lotts Rd joins here. |
| `docks` "Grand Canal Dock" | 53.34254-53.34413 | Outer basin only | The **inner basin** (53.33972-53.34216, south of Ringsend Rd / MacMahon Bridge) is missing. |
| `meta.bounds.east` | -6.2255 | The Dodder and the east loop reach -6.2221 | See §4 P0. |

**Canal-south hand-off** (already in the working copy):
- `GXSMS1` 53.33775, -6.24075 (Mount St Bridge N / Mount St Lower / Warrington Pl)
- `GXSMS2` 53.33733, -6.23992 (bridge S / Percy Pl / Northumberland Rd)
- `GXSHD2` 53.33614, -6.23813 (Haddington Rd / Northumberland Rd; both ways currently **dead-end** here)
- `GXSPB1` 53.33291, -6.24257 (Baggot St Upper / Pembroke Rd / Waterloo Rd; **dead end**)
- The canal centreline `canals["Grand Canal"].pts` ends at **[53.33860, -6.23875]** (Macquay's Bridge). Its locks list stops at C2.

### 1.5 Streets: facts from OSM

| Street | OSM facts | Game treatment |
|---|---|---|
| **Grand Canal St Upper** | Secondary, 2 lanes, 50 km/h. Runs from the Clanwilliam junction over **Macquay's Bridge** (`4934597`/`317312607`, over lock C1) → Barrow St (53.33809,-6.23694) → the 5-way **Beggars Bush** junction (53.33722,-6.23466). | Re-pin GCB/BW1. Add the bridge. Continue to AVJ1. |
| **Clanwilliam Place** | Tertiary, 2 lanes, 30 km/h. North bank of the canal from Mount St Bridge (53.33767,-6.24060) to GCS (53.33871,-6.23911). Georgian terrace on the north side, canal verge and towpath on the south. | New way GXSMS1 → GCB, pushed ≈36 m (18 game m) from the canal centreline like the GXS bank roads |
| **Haddington Road** (east part) | Secondary, 2 lanes, 50 km/h. Northumberland Rd (53.33614,-6.23814) → Lansdowne Park (53.33645,-6.23712) → Beggars Bush (53.33722,-6.23466). Victorian red brick. **Beggars Bush Barracks** (1827, granite walls) is on the NE corner at Shelbourne Rd. | GXSHD2 → AVHR1 → AVJ1 |
| **Northumberland Road** (south part) | Secondary, **3 lanes**, 50 km/h. Haddington Rd → St Mary's Rd (53.33472,-6.23708) → Lansdowne Park (53.33312,-6.23598) → Lansdowne Rd / Pembroke Rd (53.33232,-6.23542). Wide Victorian red-brick villas behind railings and hedges (ref 16). **Embassies:** Italy (63-65), Czech Republic (57). The 1967 **Lansdowne House** office block is on the Lansdowne Rd corner. | GXSHD2 → AVNM → AVNL → AVNP, width 12 |
| **Pembroke Road** | Secondary, 2-5 lanes, 50 km/h. From Baggot St Upper (GXSPB1) via Wellington Rd (53.33258,-6.24041) and Raglan Rd (53.33229,-6.23761) to the Northumberland / Lansdowne junction. Then SE, 3-5 lanes, via Elgin Rd to **Ballsbridge** (Shelbourne Rd / Merrion Rd / Ball's Bridge, 53.32953,-6.23201). **Embassies:** UAE (45), and on Elgin Rd the **US Embassy** (the round drum, John Johansen, 1964, 53.3301-53.3304, -6.2340 to -6.2335), Belgium, Ukraine, Kenya. | GXSPB1 → AVPR1 → AVPR2 → AVNP → AVPR3 → AVBB |
| **Shelbourne Road** | Secondary, 2 lanes, 50 km/h. Beggars Bush → Shelbourne Pl → Lansdowne Park / Lansdowne Lane → **Lansdowne Rd (53.33386,-6.23187)** → Crampton Ave → Ballsbridge. Malaysian embassy (Shelbourne House). Ref 08 looks from here along Lansdowne Lane to the west facade. | AVJ1 → … → AVBB |
| **Lansdowne Road** | Tertiary, 2 lanes, **30 km/h**, `maxweight=3`. At the west end it splits into a one-way pair: eastbound 1 lane from Northumberland Rd (`110445435`), westbound 2 lanes onto Pembroke Rd (`128521555`). It crosses Shelbourne Rd, passes the **station** and the **level crossing** (53.33406,-6.22910), runs along the south face of the stadium past Entrance C, then over the Dodder (Newbridge) to Herbert Rd / Newbridge Ave (53.33415,-6.22508). | One two-way way. The one-way split is ignored (≈30 m). |
| **Bath Avenue** | Secondary, 2 lanes, 50 km/h. From Shelbourne Rd (15 m south of the Beggars Bush node, merged into it here), **under the DART bridge UBR 61**, past Havelock Sq (53.33745,-6.22957), to **London Bridge**. Red-brick artisan terraces, 2 storeys. | AVJ1 → … → AVLBW |
| **London Bridge / Londonbridge Road / Tritonville Rd / Newbridge Ave** | London Bridge is single-lane with alternating traffic lights. Londonbridge Rd: 2 lanes, secondary. Tritonville: tertiary, 30 km/h. Newbridge Ave: tertiary, 30 km/h. | Closes the loop east of the Dodder |
| **South Lotts Road** | Tertiary, 2 lanes, 50 km/h. Beggars Bush → **under DART UBR 60** → Gordon St → South Dock St → Ringsend Rd (SD1). **Shelbourne Park** greyhound stadium is on its east side (53.3396-53.3413). | AVJ1 → … → SD1 |
| **Barrow Street** | Tertiary, 30 km/h. **One lane, alternating, under the DART** (53.33905-53.33942). Google's Dublin campus is along it. | Existing way. Optional underpass narrowing. |
| **Grand Canal Quay** | A living street / unclassified along the west side of the inner basin, from GCS Lower (53.33889,-6.23970) to Pearse St (PS5). | P2 access road |

### 1.6 Proposed street-graph additions (JSON)

**Conventions:**
- IDs all start with `AV`. None exist in the current `src/data/streets.json`; this was checked against the working copy.
- Coordinates are real OSM junction positions except `AVCP`, which is pushed off the canal like the GXS bank roads.
- Widths follow the neighbouring GXS ways.
- The core loop is **AVJ1 → Shelbourne Rd → Lansdowne Rd → Newbridge → Newbridge Ave → Tritonville Rd → Londonbridge Rd → London Bridge → Bath Ave → AVJ1**. It rings the stadium.
- **Dead-end check:** every new way ends on a junction of degree ≥2, and the existing dead ends GXSHD2 (×2) and GXSPB1 are closed.

**Existing nodes to re-pin (P0):**
```json
"GCB": [53.33871, -6.23911],
"BW1": [53.33809, -6.23694]
```
**Existing ways to delete (P0):**
- Shorten the existing `{ "name": "Mount Street Lower", "nodes": ["MSNE", "GT0", "MT1"] }` to `["MSNE", "GT0"]`, then delete node `MT1`. The GT0→MT1 leg is superseded by canal-south's GT0→GXSMS1.
- `{ "name": "Grand Canal Street Upper", "nodes": ["GCB", "BW1"] }`. It is replaced below.

**New nodes:**
```json
"AVCP":  [53.33823, -6.24004],
"AVGB":  [53.33851, -6.23848],
"AVJ1":  [53.33722, -6.23466],
"AVHR1": [53.33645, -6.23712],
"AVNM":  [53.33472, -6.23708],
"AVNL":  [53.33312, -6.23598],
"AVNP":  [53.33232, -6.23542],
"AVPR1": [53.33258, -6.24041],
"AVPR2": [53.33229, -6.23761],
"AVPR3": [53.33177, -6.23490],
"AVBB":  [53.32955, -6.23205],
"AVSH1": [53.33544, -6.23247],
"AVSH2": [53.33473, -6.23220],
"AVLS":  [53.33386, -6.23187],
"AVSH3": [53.33231, -6.23173],
"AVL0":  [53.33257, -6.23504],
"AVL1":  [53.33329, -6.23341],
"AVL2":  [53.33394, -6.23074],
"AVLX":  [53.33406, -6.22910],
"AVL3":  [53.33423, -6.22752],
"AVL4":  [53.33446, -6.22575],
"AVLB":  [53.33430, -6.22543],
"AVLH":  [53.33415, -6.22508],
"AVNA2": [53.33481, -6.22459],
"AVNA1": [53.33540, -6.22357],
"AVTN":  [53.33615, -6.22209],
"AVTR1": [53.33673, -6.22220],
"AVLT":  [53.33794, -6.22251],
"AVLR1": [53.33781, -6.22460],
"AVLBE": [53.33768, -6.22639],
"AVLBW": [53.33762, -6.22693],
"AVBA3": [53.33752, -6.22836],
"AVBH":  [53.33745, -6.22957],
"AVBA2": [53.33739, -6.23043],
"AVBA1": [53.33721, -6.23356],
"AVSL1": [53.33762, -6.23377],
"AVSL2": [53.33918, -6.23275],
"AVSL3": [53.34058, -6.23196]
```

| Node | What it is |
|---|---|
| AVCP | Clanwilliam Pl mid-point, pushed NW off the canal (real road ≈25 m from the water) |
| AVGB | Macquay's Bridge, south end |
| AVJ1 | **Beggars Bush**: GCS Upper / Haddington Rd / Shelbourne Rd / South Lotts Rd, with Bath Ave merged in (really 15 m S) |
| AVHR1 | Haddington Rd × Lansdowne Park / Cranmer Lane |
| AVNM, AVNL | Northumberland Rd × St Mary's Rd; × Lansdowne Park |
| AVNP | Northumberland Rd / Lansdowne Rd / Pembroke Rd (the one-way pair merged) |
| AVPR1, AVPR2, AVPR3 | Pembroke Rd × Wellington Rd; × Raglan Rd; shape point |
| AVBB | **Ballsbridge**: Pembroke Rd / Shelbourne Rd / Elgin Rd (Ball's Bridge and Merrion Rd continue SE) |
| AVSH1, AVSH2, AVSH3 | Shelbourne Rd × Shelbourne Pl; × Lansdowne Park / Lane; × Crampton Ave |
| AVLS | Shelbourne Rd × Lansdowne Rd |
| AVL0, AVL1, AVL2 | Lansdowne Rd shape points (AVL2 is opposite the station entrance) |
| **AVLX** | **Level crossing XR001**, where the DART crosses the road |
| AVL3 | Lansdowne Rd at Entrance C / the south plaza |
| AVL4, AVLB | Lansdowne Rd bridge over the Dodder ("Newbridge"), W and E ends |
| AVLH | Lansdowne Rd / Herbert Rd / Newbridge Ave |
| AVNA1, AVNA2 | Newbridge Ave shape points (Lansdowne Village junctions) |
| AVTN, AVTR1 | Tritonville Rd × Newbridge Ave; shape point |
| AVLT | Londonbridge Rd / Tritonville Rd / Irishtown Rd / Church Ave |
| AVLR1 | Londonbridge Rd × Londonbridge Drive |
| AVLBE, AVLBW | London Bridge, E and W ends |
| AVBA3, AVBH, AVBA2 | Bath Ave × O'Connell Gdns; × Havelock Sq; × Bath Ave Gdns |
| AVBA1 | Bath Ave under DART bridge UBR 61 |
| AVSL1 | South Lotts Rd under DART bridge UBR 60 |
| AVSL2, AVSL3 | South Lotts Rd × Gordon St; × South Dock St |

**New ways (P0 / P1):**
```json
{ "name": "Clanwilliam Place", "type": "secondary", "width": 7, "nodes": ["GXSMS1", "AVCP", "GCB"] },
{ "name": "Macquay Bridge", "type": "bridge", "width": 12, "nodes": ["GCB", "AVGB"] },
{ "name": "Grand Canal Street Upper", "type": "primary", "width": 12, "nodes": ["AVGB", "BW1", "AVJ1"] },
{ "name": "Haddington Road", "type": "secondary", "width": 10, "nodes": ["GXSHD2", "AVHR1", "AVJ1"] },
{ "name": "Northumberland Road", "type": "secondary", "width": 12, "nodes": ["GXSHD2", "AVNM", "AVNL", "AVNP"] },
{ "name": "Pembroke Road", "type": "secondary", "width": 12, "nodes": ["GXSPB1", "AVPR1", "AVPR2", "AVNP"] },
{ "name": "Pembroke Road", "type": "secondary", "width": 14, "nodes": ["AVNP", "AVPR3", "AVBB"] },
{ "name": "Shelbourne Road", "type": "secondary", "width": 9, "nodes": ["AVJ1", "AVSH1", "AVSH2", "AVLS", "AVSH3", "AVBB"] },
{ "name": "Lansdowne Road", "type": "secondary", "width": 9, "nodes": ["AVNP", "AVL0", "AVL1", "AVLS", "AVL2", "AVLX", "AVL3", "AVL4"] },
{ "name": "Lansdowne Road Bridge", "type": "bridge", "width": 10, "nodes": ["AVL4", "AVLB"] },
{ "name": "Lansdowne Road", "type": "secondary", "width": 9, "nodes": ["AVLB", "AVLH"] },
{ "name": "Newbridge Avenue", "type": "secondary", "width": 8, "nodes": ["AVLH", "AVNA2", "AVNA1", "AVTN"] },
{ "name": "Tritonville Road", "type": "secondary", "width": 8, "nodes": ["AVTN", "AVTR1", "AVLT"] },
{ "name": "Londonbridge Road", "type": "secondary", "width": 9, "nodes": ["AVLT", "AVLR1", "AVLBE"] },
{ "name": "London Bridge", "type": "bridge", "width": 6, "nodes": ["AVLBE", "AVLBW"] },
{ "name": "Bath Avenue", "type": "secondary", "width": 9, "nodes": ["AVLBW", "AVBA3", "AVBH", "AVBA2", "AVBA1", "AVJ1"] },
{ "name": "South Lotts Road", "type": "secondary", "width": 9, "nodes": ["AVJ1", "AVSL1", "AVSL2", "AVSL3", "SD1"] }
```

**Optional (P2): a second loop to Ringsend, and the inner-basin quay.**

Nodes:
```json
"AVIR1": [53.33959, -6.22333],
"AVIR2": [53.34052, -6.22462],
"AVIR3": [53.34126, -6.22586],
"AVBS":  [53.34185, -6.22697],
"AVRBE": [53.34168, -6.22875],
"AVRBW": [53.34164, -6.22925],
"AVGQ0": [53.33889, -6.23970],
"AVGQ1": [53.34022, -6.23935],
"AVGQ2": [53.34216, -6.23887]
```

Ways:
```json
{ "name": "Irishtown Road", "type": "secondary", "width": 8, "nodes": ["AVLT", "AVIR1", "AVIR2", "AVIR3"] },
{ "name": "Thomas Street", "type": "secondary", "width": 8, "nodes": ["AVIR3", "AVBS"] },
{ "name": "Bridge Street", "type": "secondary", "width": 9, "nodes": ["AVBS", "AVRBE"] },
{ "name": "Ringsend Bridge", "type": "bridge", "width": 10, "nodes": ["AVRBE", "AVRBW"] },
{ "name": "Bridge Street", "type": "secondary", "width": 9, "nodes": ["AVRBW", "SD1"] },
{ "name": "Grand Canal Quay", "type": "lane", "width": 7, "access": "destination", "nodes": ["AVGQ0", "AVGQ1", "AVGQ2", "PS5"] }
```

`AVGQ0` must be inserted into the existing `Grand Canal Street Lower` way, between GCM and GCB.

**One-way and access notes** (the game has `oneway` now):
- **London Bridge** and the **Barrow St underpass** are single-lane with alternating signals. Keep them two-way in data, width 6.
- **Lansdowne Rd**'s west end one-way pair is merged into one two-way way.
- **Havelock Square** and **Lansdowne Village** are residential cul-de-sac loops. They are not in the graph; dress them as filler terraces.
- On **match days** Lansdowne Rd and Havelock Sq close to traffic. That could be an event toggle, but it is out of scope.

### 1.7 The Grand Canal east of Huband Bridge, and Grand Canal Dock (VERIFIED, OSM)

**Locks and bridges, west to east:**

| Feature | lat, lon | Owner | Notes |
|---|---|---|---|
| Lock **C3** + **Huband Bridge** | lock 53.33610, -6.24255; bridge 53.33625, -6.24232 | canal-south (GXSHU1/2) | Huband Bridge (ref 15) is a granite hump-backed single arch. It has a **balustraded central panel with carved plaques**; the other agent owns the detail. |
| Lock **C2** + **Mount Street (McKenny's) Bridge** | lock chamber 53.33732-53.33750; bridge 53.33756, -6.24037 | canal-south (GXSMS1/2) | The 1916 **Battle of Mount Street Bridge** memorial stele is at 53.33742, -6.24030 (OSM `5279599321`) |
| Pool C2→C1 | between the locks, ≈190 m | **this brief** | Water ≈10-14 m wide. Clanwilliam Pl is on the N bank; a towpath and grass verge are on the S bank. |
| Lock **C1** + **Macquay's Bridge** (Grand Canal St) | **lock 53.33844, -6.23900** (gates `27012400` 53.33838,-6.23909 and `1251111265` 53.33849,-6.23892); bridge 53.33860, -6.23870 | **this brief** | Black timber balance beams with white tips, stone lock walls (ref 14) |
| Channel to the dock | 53.3387 → 53.3401, lon ≈-6.2391 | **this brief** | ≈12-15 m wide (`110542365`) |
| Victoria Bridge (DART, UBR 57) | 53.3403, -6.2392 | rail only | Crosses the channel mouth |
| **Inner basin** | 53.33972 → 53.34216 | **this brief** | ≈75-90 m wide. Grand Canal Quay on the W side, Google/Barrow St on the E side. |
| MacMahon Bridge (Ringsend Rd) | 53.3423, -6.2380 | existing PS5→RR1 | |
| Outer basin | 53.3425 → 53.3441 | existing `docks` | |
| **Sea locks** to the Liffey | Westmoreland Lock 53.34354-53.34391, -6.23095 to -6.23075; Buckingham Lock 53.34356-53.34387, -6.23074 to -6.23056; the wide ship lock (Camden Lock) 53.34338-53.34392, -6.23065 to -6.23021 | P2 | Three parallel chambers under Britain Quay (existing SQ18 → TCS). The two stone **Graving Docks** are at 53.3426, -6.2303. |

**Canal centreline patch.** Append to `canals["Grand Canal"]` after the existing last point [53.33860, -6.23875]:
```json
"pts":   [ ..., [53.33860, -6.23875], [53.33880, -6.23868], [53.33900, -6.23909], [53.33930, -6.23921], [53.33970, -6.23915], [53.34008, -6.23906] ],
"locks": [ ..., [53.33844, -6.23900] ]
```

**Inner-basin dock polygon.** Add as `docks["Grand Canal Dock (inner basin)"]`. It stops 25 m south of Ringsend Rd, so MacMahon Bridge keeps its deck.
```json
[[53.34205,-6.23869],[53.34120,-6.23887],[53.34029,-6.23907],[53.33972,-6.23780],[53.34029,-6.23768],[53.34094,-6.23754],[53.34156,-6.23739],[53.34205,-6.23729]]
```

**Real water outlines** for reference (simplified OSM; the game builds canal water from the centreline):

C3→C2 pool (`737060364`):
```
[[53.33735,-6.24068],[53.33725,-6.24071],[53.33703,-6.24103],[53.33629,-6.24217],[53.33617,-6.24240],
 [53.33619,-6.24246],[53.33638,-6.24223],[53.33732,-6.24080]]
```

Lock C2 chamber (`737060362`), ≈27 x 5 m:
```
[[53.33750,-6.24046],[53.33746,-6.24041],[53.33732,-6.24063],[53.33735,-6.24068]]
```

C2→C1 pool incl. lock C1 (`737060363`):
```
[[53.33746,-6.24041],[53.33750,-6.24046],[53.33769,-6.24023],[53.33840,-6.23911],[53.33870,-6.23873],
 [53.33865,-6.23856],[53.33853,-6.23880],[53.33762,-6.24012]]
```

Channel to the dock (`110542365`):
```
[[53.34006,-6.23900],[53.33924,-6.23914],[53.33882,-6.23851],[53.33865,-6.23856],[53.33879,-6.23884],
 [53.33897,-6.23935],[53.34012,-6.23913]]
```

**Canal character here:**
- Grass verges and mature trees (planes and limes) line both banks. The towpaths are granite-kerbed.
- The lock walls are limestone and granite. The balance beams are black with white-painted ends (refs 13, 14).
- **Percy Place / Herbert Place / Warrington Place / Clanwilliam Place** are 1830s-40s Georgian terraces: 3-4 storeys over basement, red-brown brick, granite steps, fanlit doors and railings. These belong to canal-south except Clanwilliam Pl.
- Around lock C1 the backdrop is modern offices and apartments (ref 14).

---

## 2. Reference images (`refs/aviva/`)

All images come from Wikimedia Commons (several originate on geograph or panoramio) and none from Google. They are resized to 1000 px wide, or kept at the original size if smaller. Three geograph originals were fetched from geograph's own server because Commons was rate-limiting. Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-aerial-from-north-over-havelock-sq.jpg | [Dublin aviva stadium.jpg](https://commons.wikimedia.org/wiki/File:Dublin_aviva_stadium.jpg) | Arne Müseler | CC BY-SA 3.0 de | 2023-07-30 | **Key aerial**, looking S. Radial roof sheets and ribs, louvred wall, pale plinth, the white leading-edge truss, green seats with **"AVIVA" in white seats**, the Lansdowne FC back pitch (E, left), terraces pressed against the north end |
| 02-aerial-from-south-looking-north-dodder.jpg | [arne mueseler 00090](https://commons.wikimedia.org/wiki/File:2023_07_30_arne_mueseler_00090-Verbessert-RR_(53106672195).jpg) | Arne Müseler | CC BY-SA 2.0 | 2023-07-30 | Looking N from above Lansdowne Rd. **High south end** in front, the **low north end with the exposed white truss** beyond, the Dodder in its walled channel (right), Bath Ave terraces, "AVIVA STADIUM" letters on the SE face |
| 03-aerial-from-sw-west-podium-railway.jpg | [arne mueseler 00092](https://commons.wikimedia.org/wiki/File:2023_07_30_arne_mueseler_00092-Verbessert-RR_(53106466174).jpg) | Arne Müseler | CC BY-SA 2.0 | 2023-07-30 | Looking NE. The **west podium and grand stairs** over the railway, the level crossing and station (bottom), the Dodder, the port and Poolbeg beyond |
| 04-dusk-from-west-low-north-end-truss.jpg | [Aviva Stadium and Dublin City at Dusk](https://commons.wikimedia.org/wiki/File:Aviva_Stadium_and_Dublin_City_at_Dusk.jpg) | David Kernan | CC BY 4.0 | 2024-11-24 | **Silhouette reference.** From an elevated point to the W: the wave rising from the low north end (left, **truss arch exposed**) to the high south end with the blue "AVIVA STADIUM" letters; the concourse lit behind the louvres |
| 05-night-glow-exterior.jpg | [Aviva Stadium by Night](https://commons.wikimedia.org/wiki/File:Aviva_Stadium_by_Night.jpg) | Hoops341 | CC BY 3.0 | 2010-08-04 | **Night look.** The skin glows from within (lit concourse bands), the roof is dark with a lit truss over the low end, the "AVIVA STADIUM" sign is lit **blue**, low houses in front |
| 06-interior-night-leading-edge-truss.jpg | [Heimspiel Irland Aviva Stadion (126472289)](https://commons.wikimedia.org/wiki/File:Heimspiel_Irland_Aviva_Stadion_(126472289).jpeg) | Dronepicr | CC BY 3.0 | 2015-10-08 | Interior at night. The **wavy white triangulated leading-edge truss with floodlight banks set into it**, two tiers of green seats, the yellow Aviva fascia band |
| 07-lansdowne-rd-level-crossing-xr001.jpg | [LansdownRoadRailwayCrossingWithAviva.jpg](https://commons.wikimedia.org/wiki/File:LansdownRoadRailwayCrossingWithAviva.jpg) | Autarch (en.wikipedia) | CC BY 3.0 | 2010-06-21 | **Driver's eye** E along Lansdowne Rd: the **XR001 level crossing** with red-white booms, wig-wags, catenary, the station hut; the curved louvred wall on the left over a **beige render plinth** |
| 08-west-facade-from-shelbourne-rd-lansdowne-lane.jpg | [Aviva Stadium from Shelbourne Road](https://commons.wikimedia.org/wiki/File:Aviva_Stadium_from_Shelbourne_Road.jpg) | Autarch (en.wikipedia) | CC BY-SA 3.0 | 2010-06-28 | The **west face over the rooftops** of Lansdowne Lane: "AVIVA STADIUM" + tricolour, the ribbed dome-like mass towering over 2-storey houses |
| 09-from-fitzwilliam-quay-across-dodder.jpg | [Aviva Stadium(Dublin Arena).JPG](https://commons.wikimedia.org/wiki/File:Aviva_Stadium(Dublin_Arena).JPG) | Tarafuku10 | Public domain | 2010-08-02 | From the NE across the Dodder: the **saddle dip** at the north end with the exposed truss, the Dodder quay walls |
| 10-from-londonbridge-rd-across-dodder.jpg | [Aviva Stadium, Viewed From Londbridge Road](https://commons.wikimedia.org/wiki/File:Aviva_Stadium,_Viewed_From_Londbridge_Road_(Dublin)_-_panoramio.jpg) | William Murphy | CC BY-SA 3.0 | 2012-05-11 | From the E bank by London Bridge: the high SE end with the sign (left), the **low north end and truss arch** (right), the Dodder wall and an old stone store in front |
| 11-louvre-skin-and-entrance-a-detail.jpg | [Aviva Stadium, Lansdowne Road, Dublin (2024)](https://commons.wikimedia.org/wiki/File:Aviva_Stadium,_Lansdowne_Road,_Dublin_(2024).jpg) | Darren J. Prior | CC BY 4.0 | 2024-05-02 | **Texture source.** Overlapping clear polycarbonate louvre shingles with **rows of bolts** on steel rails; the glass curtain-wall ground floor; "AVIVA STADIUM" silver letters; Entrance A doors |
| 12-lansdowne-road-dart-station.jpg | [Lansdowne Road Railway Station (geograph 1854436)](https://commons.wikimedia.org/wiki/File:Lansdowne_Road_Railway_Station_(geograph_1854436).jpg) | Sarah777 | CC BY-SA 2.0 | 2009-05-30 | Station: a green DART 8100, low brick platform buildings, a timber box, signals, catenary |
| 13-grand-canal-from-mount-st-bridge-lock-c2.jpg | [The Grand Canal (geograph 1470818)](https://commons.wikimedia.org/wiki/File:The_Grand_Canal_-_geograph.org.uk_-_1470818.jpg) | Simon Huguet | CC BY-SA 2.0 | 2009-08-12 | From Mount St Bridge looking W: **lock C2**, grass verges, tree-lined banks, Percy Pl (left) and Warrington Pl (right) |
| 14-lock-c2-balance-beams.jpg | [Lock C2 on the Grand Canal (geograph 2855992)](https://commons.wikimedia.org/wiki/File:Lock_C2_on_the_Grand_Canal_-_geograph.org.uk_-_2855992.jpg) | Graham Hogg | CC BY-SA 2.0 | 2012-03-14 | Lock gates: black balance beams with white ends, stone copings, offices behind (Mount St Lower side) |
| 15-huband-bridge.jpg | [GrandCanal-5-HubandBridge.JPG](https://commons.wikimedia.org/wiki/File:GrandCanal-5-HubandBridge.JPG) | Deitel55 | CC BY-SA 3.0 | 2012-02-03 | Huband Bridge (shared boundary with canal-south): granite arch, balustrade panel, lock C3 overflow |
| 16-northumberland-road-red-brick.jpg | [Northumberland Road (geograph 1470793)](https://commons.wikimedia.org/wiki/File:Northumberland_Road_-_geograph.org.uk_-_1470793.jpg) | Simon Huguet | CC BY-SA 2.0 | 2009-08-11 | Victorian red-brick villas with bay windows, granite steps, railings and hedges |

**Useful Commons candidates not kept:**
- *River Dodder, Bridge at Bath Avenue and Aviva Stadium* (geograph 5417723): London Bridge, two stone arches
- *The River Dodder and the Aviva Stadium in Lansdowne Road* (geograph 2176201)
- *Aviva Stadium, Dublin.jpg* (CC0, DaviMurph)
- *Clouds on Aviva Stadium.jpg* (CC0)
- *Grand Canal Lock in Dublin – panoramio (1)*: a canal lock close-up, location unconfirmed
- *Lansdowne Road DART station – geograph 1007608*: the old West Stand tunnel, 1992
- *DART lines under Lansdowne Road West Stand – geograph 189860* (2006, old stand)
- Arne Müseler aerials 00081/00084/00086

---

## 3. Landmark profile: the Aviva Stadium

### 3.1 Facts

| Fact | Value | Status |
|---|---|---|
| Architects | **Populous** (then HOK Sport) with **Scott Tallon Walker** | VERIFIED (Wikipedia; Populous) |
| Structural / civil engineer | **Buro Happold** | VERIFIED (Wikipedia; Buro Happold) |
| Contractor | Sisk Group | VERIFIED (Wikipedia) |
| Dates | Old ground demolished from 17 May 2007. Construction 2007-2010. **Opened 14 May 2010.** | VERIFIED (Wikipedia) |
| Predecessor | Lansdowne Road, first rugby international **11 March 1878**, "the world's oldest rugby union Test venue". The DART "passed directly underneath the West Stand". | VERIFIED (Wikipedia, Lansdowne Road) |
| Capacity | **51,711** (51,700) all-seated; 65,000 for concerts. UEFA name "Dublin Arena". | VERIFIED (Wikipedia; Populous) |
| Cost | €410 m | VERIFIED (Wikipedia) |
| **Height** | **47.65 m above the pitch** at the highest point | VERIFIED (irishrugby.ie; WCN) |
| **Plan** | **189.9 m N-S x 203 m E-W** excl. podium and grand stairs | VERIFIED (irishrugby.ie; WCN); OSM ring 189 x 214 m |
| Site | 6.4 ha (63,802 m²) | VERIFIED (irishrugby.ie) |
| Roof | ≈19,000 m² (irishrugby.ie, WCN); "about 200 m diameter", 23,000 m² covered (search summary of the Buro Happold page) | VERIFIED (19,000) |
| Skin | **4,251 polycarbonate panels** (irishrugby.ie); "4,000 individual panels", each "individually placed and rotated" on "double rotation" cast-aluminium brackets (e-architect); 19,000-20,000 m² of polycarbonate | VERIFIED |
| Roof sheet | Palram SUNTUF corrugated polycarbonate, **3 mm**, clear and matte, **86% / 84% light transmission**, laid **perpendicular to the roof slope** | VERIFIED (Palram) |
| Steel | 5,000 t structural steel (irishrugby.ie); 3,500 t members (e-architect) | VERIFIED (sources differ) |
| **Tiers** | "A **single tier on the north** grows to **four tiers** in different heights along the south, east and west sides" | VERIFIED (WCN) |
| **North end height** | **≈15 m** at the north stand; **≈40 m** on the east and west sides; the south "slightly lower" | **Reported, not directly verified.** It comes from a search-engine summary that cites the NCE 2009 article, which was not reachable (HTTP 403). It is consistent with refs 02, 04, 09, 10. |
| Why it is low at the north | Planning: residents' **rights to light**. The north (and to a lesser extent south) ends drop so neighbouring houses are not overshadowed. Populous: the form "rises in the east and west … lowers north and south". Buro Happold: the roof "dips down to the southern sky while dropping dramatically to the north". | VERIFIED (Populous; Buro Happold) |
| **Roof structure** | A **horseshoe-shaped main steel truss** round the south, east and west, "**supported on two columns at the north end**", giving "the roof in suspension, hanging above the seating tiers". An **independent shell** covers the low north stand, carried on tapering concrete super-columns. The roof cantilevers at ≈150 kg/m². | VERIFIED (Populous; WCN; Buro Happold) |
| Floodlighting | 3,000 lux; the banks are set into the leading-edge truss (ref 06) | VERIFIED (irishrugby.ie; photo) |
| Railway | The Dublin-Wexford (DART) line runs under a **new access podium** at the SW | VERIFIED (WCN; OSM) |
| Materials palette | Polycarbonate louvres **and glass**; the skin "reflects sky and light conditions", producing an "ever changing" shimmer | VERIFIED (Populous; WCN) |

### 3.2 The form, in modelling terms

**One continuous skin.** There is no separate wall and roof. The louvred skin rises from a pale plinth, bulges gently outward, rolls over a rounded "shoulder", and becomes the roof, which slopes gently down and inward to the opening. The rim line (the shoulder) undulates like a wave: high on the east and west sides and the SE/SW shoulders, dipping slightly at the south end, and dropping **steeply** at the north end.

**Rim height profile** (θ as in §1.1). Anchors: 47.65 m max (VERIFIED), ≈40 m E/W and ≈15 m N (reported). The shape is fitted to refs 02, 04, 09 and 10 (est., ±3 m):

| θ | 0 (N) | 20 | 40 | 60 | 90 (E) | 120 | 145 | 165 | 180 (S) | then mirror on W |
|---|---|---|---|---|---|---|---|---|---|---|
| Rim height m | 15 | 17 | 24 | 34 | 42 | 46 | **47.6** | 45 | 43 | |
| Leading edge (opening) height m | 14 | 15 | 20 | 28 | 34 | 37 | 38 | 37 | 36 | |

**Plinth and podium:**
- **Plinth:** ≈4-6 m high, pale **beige/stone render** (ref 07), with glazed entrance bays.
- **West podium:** a raised plaza over the railway covered way, with broad concrete **grand stairs** stepping down towards Lansdowne Rd and the station (ref 03).

**Facade skin:**
- **Clear polycarbonate louvre shingles** in horizontal courses, each ≈1.2-1.5 m tall (est. from ref 11). Each course overlaps the one below like fish scales and is bolted to steel rails, giving **bright horizontal bolt lines**.
- The louvres are **individually rotated**, so the skin sparkles unevenly.
- Behind them (≈2-4 m in) you see the **concourse floors, stair cores and columns**. This is what makes the building read translucent grey-green by day and lit from within at night.

**Roof:**
- Long **radial clear corrugated sheets** (between purlins) separated by **silver radial rafters/ribs** that sweep from the shoulder to the opening. They read as a fine radial pinstripe from above (refs 01-03).
- From the street, the roof is a pale silver-grey dome.

**Leading-edge truss:**
- A **white, triangulated Warren/W truss** rings the opening. Along the sides it undulates with the roof (ref 06) and carries the **floodlight banks**.
- **Over the low north end it stands proud as an exposed white arch**, because the north roof shell is small and low. From Bath Ave, London Bridge and the Dodder (refs 04, 09, 10) this arch is **the most recognisable detail after the overall wave**.
- The **two north columns** stand either side of the north stand, est. at ±40 m across the axis.

**Bowl:**
- Two to four tiers of **dark green seats** with a thin **yellow fascia band** at the tier fronts (Aviva yellow), a row of boxes and a white lettering band.
- **"AVIVA" in white seats** in the lower south tier (ref 01), and also along a side stand (a84, not kept).

**Signage:**
- Large **"AVIVA STADIUM"** letters on the facade at mid-height, **blue** (lit blue at night). Photographs show them on the **SE/E face** (ref 10), the **SW/W face** (refs 04, 08; ref 08 has a tricolour beside them) and the south (ref 02, SE).
- Smaller **silver "AVIVA STADIUM"** letters over Entrance A at ground level (ref 11).

**Night (ref 05):**
- The concourse is lit **warm white to pale green**, glowing through the louvres, so the lower two-thirds of the skin becomes a lantern.
- The roof reads darker, with the floodlit truss and interior glowing over the rim at the low north end.
- The blue sign glows.

### 3.3 Colours (hex, sampled from refs, corrected by eye)

| Surface | Hex | Note |
|---|---|---|
| Roof sheets, day | `#b9bcb8` | Samples `#a5a8a2` to `#c3c3c1`. Pale silver-grey, takes the sky colour. |
| Roof ribs | `#e3e6e7` | Silver, a bit brighter than the sheets |
| Louvre skin, lit | `#8fb0b3` | Clear with a green-blue edge tint (ref 11) |
| Louvre skin, mid (overall facade tone) | `#7f8683` | Ref 01 samples `#7a7f7d` to `#848885`; ref 07 `#8f9a96` |
| Concourse behind the skin | `#2c3a36` | Dark glass and steel (ref 11 `#293c34`) |
| Leading-edge truss | `#f0f0ec` | White steel |
| Plinth render | `#b3a68c` | Ref 07. Concrete podium and stairs `#a39e93`. |
| Seats | `#1f6e3a` | Ireland green. Highlights under floodlights `#8eb148`. |
| Tier fascia band | `#f2c500` | Aviva yellow |
| Sign letters | `#2a56b8` by day, emissive `#5d86e0` at night | Ref 05 samples `#627cc9` |
| Pitch | `#4a6b1c` | Mown stripes ±8% |
| Concourse glow, night | `#ffe9c8` | Warm white; some bays greener `#d6f0dc` |
| Havelock Sq terraces | brick `#8a4b35`, render `#d8d2c4`, slate `#4d5358` | 2-storey artisan houses |

### 3.4 Recognisable cues (from a car and from a distance)

1. **The wave silhouette.** A single glassy "pebble" whose rim rises from ≈15 m at the north end to ≈47 m at the SE/SW shoulders. From the side it reads as a breaking wave or a tilted bowl, not a box with a roof (refs 04, 09, 10).
2. **The white truss arch exposed over the low north end.** It is seen from Bath Ave, London Bridge, the Dodder and Havelock Sq (refs 02, 04, 09, 10).
3. **The translucent louvred skin** with bright horizontal bolt lines and the concourse floors showing through. By day it is grey-green and sky-reflective; at night it glows as a lantern (refs 05, 11).
4. **Blue "AVIVA STADIUM" letters** high on the SW and SE faces.
5. **Scale contrast:** it looms over 2-storey red-brick terraces (Havelock Sq, Bath Ave, Lansdowne Lane; ref 08). The DART level crossing, with red-white booms and catenary, is right at its SW corner (ref 07), and the walled Dodder runs along its east side.

### 3.5 Context and neighbours

- **Traffic:** Lansdowne Rd and Shelbourne Rd are busy on match days (closed to cars around the stadium then). Otherwise they are 30-50 km/h residential streets. The main arteries are Northumberland Rd / Pembroke Rd (N11 approach), GCS Upper / Haddington Rd, and Bath Ave. DART trains run every few minutes, so the booms drop often.
- **Buildings:**
  - **Beggars Bush Barracks** (granite walls, AVJ1 NE corner)
  - **Shelbourne Park** greyhound stadium (a long low stand off South Lotts Rd)
  - **Lansdowne House** (1967 office slab, Northumberland Rd / Lansdowne Rd corner)
  - the **US Embassy drum** at Ballsbridge (Elgin Rd / Pembroke Rd)
  - red-brick Victorian villas on Northumberland, Pembroke and Haddington Rds (embassies)
  - Georgian terraces on Clanwilliam, Warrington, Percy and Herbert Places
  - artisan terraces on Bath Ave, Havelock Sq, Lansdowne Village and Irishtown
  - Grand Canal Dock's glass offices to the north (Google on Barrow St)
- **Street furniture:** Dublin granite kerbs, ornate lamp standards along Lansdowne Rd (ref 07), black railings, street trees (plane trees on Northumberland/Pembroke), and match-day crowd barriers.

---

## 4. Build brief (prioritised)

### P0: roads and water (data only; `streets.json`)

1. **Re-pin GCB and BW1** to their real positions (§1.6). **Trim** `Mount Street Lower` to MSNE→GT0 (dropping MT1), and **delete** the old `GCB→BW1` way.
   - Check `sites.js` "Grand Canal Street" (`beside('GT1','GCM', …)`): it does not reference GCB, so it should be unaffected.
2. **Add the P0/P1 ways and nodes** in §1.6. They close the GXSHD2 and GXSPB1 dead ends and form the stadium loop.
3. **Extend `meta.bounds.east`** from -6.2255 to **≈-6.2200**, so Tritonville Rd (-6.2221) and the Dodder fit. Also check the river code: the Liffey `extendToEdges` pins the south bank to `bounds.maxX`, so moving the east bound stretches the Liffey's last segment east of TCS.
4. **Canal patch** (§1.7): append the centreline and lock C1, and add the inner-basin `docks` polygon.
5. **Dodder** (§1.3): add it as a water body. It could be a second `canals` entry with no locks (width ≈16-18 game m, since roads are not compressed and 30-40 m real would eat the east side), or a `docks`-style traced polygon. It needs bridges at Lansdowne Rd (AVL4-AVLB), London Bridge (AVLBW-AVLBE) and, for P2, Ringsend (AVRBW-AVRBE).

### P1: the hero GLB (`tools/blender/build_aviva.py`, `public/models/aviva.glb`)

**Scale and placement:**
- **Plan scale 0.6 across (E-W) x 0.55 along the axis (N-S), height 0.8.** In game metres:
  - ≈122 m across, 104 m along
  - rim peak ≈38 m, north end ≈12 m
  - opening ≈58 x 83 m
- Why:
  - At the map's 0.5 the bowl is 95 x 102 m and 38-48 m high. That reads as a helmet rather than the long low wave.
  - A little extra plan width keeps it dominant against filler (typically 10-25 m) and keeps the aspect close to real (h/w 0.31 against real 0.23).
  - 0.8 height matches past practice (0.85) but keeps the rim low enough that the north dip stays dramatic.
- **Anchor:** the pitch centre, 53.33519, -6.22827. **Shift the model ≈12 game m north along its axis.** Roads are not compressed, and the real south face is only ≈5 m from the Lansdowne Rd centreline. At 0.55 the south tip (59.6 m from the centre) would otherwise sit on the road. Target: the south face ≥9 game m north of the Lansdowne Rd centreline.
- The southernmost Havelock Sq filler (within ≈10 game m of the north tip) must give way.
- **Rotation:** local +Y (north end) to bearing **344°**, i.e. rotated 16° anticlockwise from game north (-z).
- **Clearances at that scale** (from the projected pitch centre):
  - the W extreme ≈65 game m sits over the railway covered way; the podium roofs it anyway
  - the E extreme ≈63 game m is well clear of the Dodder at ≈95 game m
  - the level crossing (≈-44, -53 game m) stays ≈6 x 19 game m outside the SW shoulder
- **Build frame:** real metres, origin at the pitch centre at ground level, **+Y = north end, +X = east side**. Then `kit.finish(objs, (0.6, 0.55), 0.8)`. `finish` scales before placement rotation, so anisotropic plan scaling along the pitch axes is correct.

**Modelling method (fits `kit.py`):**
- **Lofted skin.**
  - Sample R(θ) and r(θ) from the §1.1 table with a periodic Catmull-Rom spline, and H(θ) and Hle(θ) from the §3.2 table.
  - Loft a (θ, s) grid: **128 segments around** x rows at:
    - plinth top (z = 5, radius R-3)
    - three facade rows bulging to R at 0.55·H
    - the shoulder (R-4, H)
    - four roof rows easing inward and down to the leading edge (r+2, Hle)
  - Write the quads straight into a `Part`. It needs a helper `loft(rings)` in the build script (not in kit.py) and per-vertex UVs:
    - u = θ·R / 4 m (tiling)
    - v = arc length / 4 m
  - Keep the facade and roof bands in **separate Parts** so they get different materials.
- **Louvre courses (real geometry).** On the facade band, lay **8 rows of shingle strips**. Each is a quad offset 0.35 m out from the skin and tilted ≈12° outward at its lower edge, overlapping the next row down. Use a louvre texture with alpha edges and bolt lines. This is what gives the sparkle and the horizontal banding. A flat texture alone looks like a glass dome.
- **Roof ribs:** 48 radial rafters as thin raised strips (top plus 2 sides) following the roof rows from shoulder to leading edge.
- **Concourse core:** a vertical ring ≈3 m inside the facade band, 3 quads high, with the concourse texture (slabs, columns, stair cores). Its emissive mask lets it glow at night. It is what shows through the translucent skin.
- **Leading-edge truss:**
  - top and bottom chords as 4-sided tubes following the opening (128 segments), ≈2.5-3 m deep
  - the web as a **double-sided alpha card** (W-truss texture)
  - at the north end the truss rises as a **free arch** over the low north stand, landing on **2 tapered concrete columns** (±40 m across the axis, est.)
  - floodlight banks: emissive quads on the truss underside, ≈48 of them
- **North stand shell:** a separate low curved shell over the single tier, ≈14 m, with 16 x 3 quads.
- **Bowl:** lower and upper tier rings (raked quads, seat texture) plus a box/fascia band (yellow). Two "AVIVA" seat-letter decals: the south lower tier and one side.
- **Pitch:** 1 quad plus a surround strip.
- **Plinth and podium:**
  - ring wall 0-5 m (render) with entrance glazing decals and letter plates A-…
  - the **west podium deck** with the stepped **grand stairs** (ref 03) over the railway
  - the south plaza by Entrance C
- **Signage:** "AVIVA STADIUM" letter decals, each curved over 4 skin segments, at θ ≈ 120° (SE/E) and θ ≈ 235° (SW/W), mid-facade at ≈0.6·H. The small silver version goes over Entrance A (south-west, near the station).
- **Night glow cone:** an open truncated cone (32 segments) rising ≈15 m above the opening, additive, depth-write off. It fakes the floodlight haze that makes the bowl glow from a distance.
- **AO bake:** exclude the louvre/alpha Parts and the glow cone from `kit.bake_ao_vertex` occlusion. Name them `…decal`, since the kit only hides names ending in `decal`, or extend the kit. Otherwise the concourse and truss behind them bake near-black.

**Triangle budget.** Target ≈14k, ceiling 20k. The brief allowed 25k; 20k is plenty.

| Part | Tris | Notes |
|---|---|---|
| Skin: facade band + shoulder + roof (128 x 9 rows) | ~2,300 | The silhouette carrier |
| Louvre courses (128 x 8 strips) | ~2,050 | Alpha texture |
| Roof ribs (48 x 5 x 3 faces) | ~1,450 | |
| Concourse core ring | ~770 | Emissive mask |
| Leading-edge truss: chords + web card + north arch + 2 columns | ~2,700 | White |
| North stand shell | ~100 | |
| Bowl tiers, fascia, seat letters | ~1,600 | |
| Pitch + surround | ~20 | |
| Floodlight quads | ~100 | Emissive |
| Plinth ring, entrances, west podium + grand stairs, south plaza | ~1,800 | |
| Signage decals, glow cone | ~130 | |
| **Total** | **≈13.0k** | |

**Why this budget:**
- It is the largest single object on the map, seen from 500+ m down Bath Ave, Shelbourne Rd, Pembroke Rd and across the Dodder.
- Its silhouette is a smooth doubly curved surface: 128 segments are needed to stop the rim and the north dip from faceting.
- The louvre courses are the cheapest way to get the key material read.
- A **far LOD (~3k)** should be exported as a second node (`aviva_far`): 64-segment skin, truss as a single card ring, no louvres, ribs, bowl or podium. Switch beyond ≈350 game m with `THREE.LOD` in `heroes.js`.
- For comparison, the existing hero GLBs are 2.3-4.2k each (BUILD-REPORT). This one is ≈3x that and is justified as the stand-out.

**Materials and atlas.** This needs its own material set in `heroes.js`, like the Ha'penny's. `byName()` strips the prefix and would otherwise send `av_skin` to `rubble`.

| Material | Look | Notes |
|---|---|---|
| `av_skin` (roof) | `#b9bcb8`, roughness 0.25, metalness 0.2, slight env reflection | **Opaque** (mobile-friendly). Tiled corrugation texture. |
| `av_facade` (skin under the louvres) | `#7f8683`, roughness 0.3 | |
| `av_louvre` | Atlas, alphaTest 0.5, emissive `#d6efe6` at night 0.25·l | Double-sided |
| `av_core` | Concourse texture; emissive `#ffe9c8`, emissiveMap = mask, 1.2·l | |
| `av_rib` | `#e3e6e7`, metalness 0.6 | |
| `av_truss` | `#f0f0ec`, plus the truss card alphaTest | |
| `av_flood` | Emissive `#ffffff`, 0.1 + 3·l | |
| `av_concrete` | `#b3a68c` render, `#a39e93` podium | |
| `av_seat` | Atlas green `#1f6e3a` + yellow `#f2c500` band | |
| `av_pitch` | Stripes `#4a6b1c` | |
| `av_sign` | Atlas, alphaTest; `#2a56b8`, emissive `#5d86e0` 2·l | |
| `av_glow` | Additive, `#fff4dc`, opacity 0.12·l, depthWrite false | Off by day |

Use a `setNight(l)` hook as for the Ha'penny lanterns.

**Atlas:** 1024², painted at load (like `hp_` and `DECALS`) or baked to a PNG. Regions in px:

| Region | Rect | Content |
|---|---|---|
| louvre | (0, 0, 512, 256) | 4 overlapping clear shingle rows, bolt lines, alpha feathered lower edge; tiles in u |
| concourse | (512, 0, 512, 256) | Slabs, columns, stair cores, lit bays; alpha = emissive mask |
| roofpanel | (0, 256, 256, 256) | Corrugated clear sheet between purlins; tiles radially |
| truss | (256, 256, 512, 128) | White W-truss web on transparent |
| seatletters | (256, 384, 512, 128) | "AVIVA" white letters on green seats |
| seats | (768, 256, 256, 256) | Green seat rows, aisles, tier-front yellow band |
| sign | (0, 512, 512, 96) | "AVIVA STADIUM" blue letters on transparent (+ tricolour at 512-560) |
| entrance | (512, 512, 256, 128) | Glazed doors with "A" and "C" letters |
| pitch | (768, 512, 256, 256) | Mowing stripes and markings |
| flood | (512, 640, 128, 64) | Floodlight bank |
| stairs | (640, 640, 128, 128) | Podium grand-stair treads |

**Night behaviour** (checked against ref 05):
- The lower 2/3 of the skin glows (core emissive seen through the louvre alpha, plus a faint louvre emissive).
- The roof stays darker.
- The truss and floodlights are bright, especially visible over the low north end.
- The sign glows blue, and the glow cone adds a halo above the bowl.
- Optional match-night mode: floodlights at full, a greener concourse tint. Unverified; see open questions.

### P1: DART level crossing and railway (props; no rail system exists in the game)

6. **Level crossing at AVLX:**
   - 2 tracks of rails set into the carriageway, crossing Lansdowne Rd at ≈45°. The track bearing is ≈136°/316°, NW-SE.
   - Red-and-white booms (half barriers each side), wig-wag signals and yellow box markings.
   - The station hut on the south side, with catenary masts and wires over the crossing.
   - A brick-and-glass footbridge or subway entrance is not needed.
7. **Rail corridor:** a low ballast strip with rails and catenary masts every ≈50 m.
   - It runs from the level crossing SE along the platforms (two ≈75 game m side platforms, brick huts, canopies) to the Dodder bridge.
   - It runs NW into the **covered way under the west podium**, then onto a grassy **embankment** to Grand Canal Dock station.
   - The embankment carries **steel bridges over Bath Ave (AVBA1) and South Lotts Rd (AVSL1)**, with ≈4.5-5 m clearance and plain steel girder sides.
   - Optional: a green DART EMU that crosses on a timer while the booms are down.

### P2

8. **The Dodder:** stone and concrete walls with a railing along the top; London Bridge as a 2-arch stone bridge (single lane); the Lansdowne Rd bridge as a plain single span.
9. **Beggars Bush Barracks** (granite wall with a gate at AVJ1), **Shelbourne Park** (a long low grandstand), **Lansdowne House** (8-storey 1960s slab), the **US Embassy** drum at Ballsbridge (round, 5 storeys, precast lattice), and the **Mount Street Bridge 1916 memorial** stele. All are generic or low-poly.
10. **Canal dressing** from Huband to C1: verge trees (instanced, capped by distance), lock C1 beams and gates (reuse the canal-south lock kit), towpath kerbs.
11. **Inner basin quay** (Grand Canal Quay) and the **three sea locks and two graving docks** at Ringsend.
12. **Filler character:**
    - red-brick Victorian villas on Northumberland, Pembroke and Haddington Rds (3 storeys over basement, bays, granite steps, railings, hedges)
    - Georgian terrace on Clanwilliam Pl
    - 2-storey artisan terraces on Bath Ave, Havelock Sq and Irishtown
    - modern offices at Grand Canal Dock

**Textured:** stadium skin, louvres, concourse, truss, seats, sign, pitch.
**Generic:** podium and plinth (render), level-crossing kit, platforms, embankment, neighbours.

**Area triangle budget:** stadium ≈13k (+3k far LOD), crossing and rail kit ≈1.5k, Dodder bridges ≈0.8k, neighbours ≈1.5k. **Total ≈17k.**

---

## 5. Open questions

1. **Re-pinning GCB/BW1** moves the existing Grand Canal St junctions 110-150 m south to reality. That is needed for the canal and the inner basin to meet the road at Macquay's Bridge. Is the owner happy to move them, and does anything besides `streets.json` (sites, trial routes, photo-mode spots) reference their old positions?
2. **Exact heights.** Only the 47.65 m peak is verified. The ≈15 m north and ≈40 m east/west figures come from a secondary summary of NCE 2009, which was not reachable. The rim-height table in §3.2 is a photo fit (±3 m). A Populous or Buro Happold section drawing or a surveyed LiDAR tile would settle it.
3. **North columns and the truss arch geometry.** Two columns at the north end are verified, but not their exact positions. The ±40 m used here is an estimate.
4. **Scale.** Is plan 0.6 x 0.55 with height 0.8 acceptable? The alternative is 0.5 x 0.5 with height 0.85, which fits trivially but reads as a helmet.
5. **Bounds east.** Extending to -6.2200 brings in part of Ringsend and Irishtown. Is that in the canal-ring plan, or should the east loop be cut? Without it, Lansdowne Rd over the Dodder dead-ends.
6. **Dodder representation.** Should it be a `canals`-style centreline with width (no locks, so a single pool) or a traced polygon? It meets the Liffey right at the existing TCS / Britain Quay corner.
7. **The rail line.** There is no railway system in the game. Is a static crossing plus corridor (and optionally a timed train) enough? The DART also runs through the existing map (Pearse → Grand Canal Dock), where it is currently absent.
8. **Match-night lighting.** Photos show white/green-tinted concourse glow and a blue sign. Whether the facade ever takes coloured event lighting was not verified. Keep it white/neutral unless a source turns up.
9. **Shared streets.** Percy Place, Huband Bridge, Herbert Place, Warrington Place and Haddington Rd west of Northumberland Rd are already in canal-south's GXS network. This brief does not duplicate them.
10. **Privacy note.** One early Overpass request in this session sent a User-Agent containing the owner's email address. All later requests used a generic UA.

## Sources

- OSM via Overpass (ODbL): `data/osm/aviva.json`
- [Aviva Stadium, Wikipedia](https://en.wikipedia.org/wiki/Aviva_Stadium)
- [Lansdowne Road, Wikipedia](https://en.wikipedia.org/wiki/Lansdowne_Road)
- [Lansdowne Road railway station, Wikipedia](https://en.wikipedia.org/wiki/Lansdowne_Road_railway_station)
- [Aviva Stadium – A Numbers Game, IRFU (irishrugby.ie), 14 May 2010](https://www.irishrugby.ie/2010/05/14/aviva-stadium-a-numbers-game)
- [Aviva Stadium, World Construction Network](https://www.worldconstructionnetwork.com/projects/aviva-stadium/)
- [Aviva Stadium, Populous](https://populous.com/showcases/aviva-stadium)
- [Aviva Stadium, Buro Happold](https://www.burohappold.com/projects/aviva-stadium/)
- [Aviva Stadium, e-architect](https://www.e-architect.com/dublin/aviva-stadium)
- [Aviva Stadium, Palram (polycarbonate case study)](https://www.palram.com/project/aviva-stadium-ireland/)
- [Aviva Stadium, Football Ground Guide](https://footballgroundguide.com/leagues/others/aviva-stadium-dublin.html)
- [Aviva Stadium, Football-Stadiums.co.uk](https://www.football-stadiums.co.uk/grounds/ireland/aviva-stadium/)
- [Aviva Stadium: Luck of the Irish, New Civil Engineer (2009)](https://www.newcivilengineer.com/archive/aviva-stadium-luck-of-the-irish-08-10-2009/): not reachable (403), cited via search summary only
- `docs/research/canal-south.md` (neighbouring network and hand-off)
- Wikimedia Commons / geograph images as listed in §2 and `refs/aviva/sources.json`

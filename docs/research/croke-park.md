# Croke Park (`croke-park`): Phase 1 research

Scope: Croke Park stadium (Hogan, Cusack and Davin stands, Dineen Hill 16 and the Nally Terrace, roof, trusses, floodlights, GAA Museum, Skyline walk, pitch), plus the streets around it:
- Jones's Road, Russell Street and Bloody Sunday Bridge
- Clonliffe Road and Saint Joseph's Avenue
- Drumcondra Road Lower from Binns Bridge to Clonliffe Road
- Ballybough Road, Clarke's Bridge and Summerhill Parade
- the North Circular Road (NCR) from Russell Street to Summerhill Parade
- the Royal Canal reach from Binns Bridge to Clarke's Bridge

Housing character is covered too.

- **Raw OSM:** `data/osm/croke-park.json`.
  - Overpass `out geom`, bbox **S 53.3565, W -6.2620, N 53.3650, E -6.2405** (about 1.43 km E-W by 0.95 km N-S).
  - Snapshot `timestamp_osm_base` 2026-09-28T22:46Z, 6,033 elements.
  - Contents: buildings and building:parts, all highways, railways, waterways and water, leisure, landuse, amenity, tourism, man_made and trees.
- **References:** `refs/croke-park/` holds 16 images from Wikimedia Commons, including geograph uploads. Credits are in §2 and `refs/croke-park/sources.json`.
- **Mapillary:** not used, because no token is available.
- **Coordinates:** everything is given as **lat/lon**, as asked. No game coordinates are computed, because the outer ring may get its own compression.
- **Stadium local frame.** For the Blender build, stadium geometry is also given in a metric local frame (§3.2):
  - Origin: **pitch centre, 53.360753, -6.251130**.
  - **+a** runs along the pitch axis towards Hill 16, bearing **N19.3°E**.
  - **+b** runs across the pitch towards the Cusack Stand, bearing **N109.3°E** (ESE).
  - Values are real metres, before any game scaling.

Throughout this doc, **VERIFIED** means the fact is backed by the named source or the OSM geometry. **est.** means an estimate: photogrammetry from the refs, or inference.

---

## 1. Map data

### 1.1 Orientation of the stadium (VERIFIED, OSM)

The stadium is a **U-shaped bowl open to the north-north-east**. Three roofed stands form a continuous U with curved corners, and the low, open Railway End terrace closes the fourth side.

| End or side | Direction from the pitch | Stand | What is behind it |
|---|---|---|---|
| West long side | WNW | **Hogan Stand** (main stand, trophy presentation, media) | **Jones's Road**. The rear facade is ~8 m from the road centreline. |
| East long side | ESE | **Cusack Stand** (GAA Museum at its south end) | Saint Joseph's Ave, Sackville Ave, Ardilaun Rd, the National Handball Centre, then Ballybough Road |
| South end | SSW | **Davin Stand**, the Canal End | The **Royal Canal and the MGWR railway, which pass *under* its rear** (below) |
| North end | NNE | **Dineen Hill 16 and the Nally Terrace**, the Railway End. It is standing terrace with no roof. | The **GSWR railway embankment**, which runs diagonally just behind it, then Clonliffe Road |

Sources for the table:
- The stand names come from OSM `highway=pedestrian` areas: "Hogan Stand Entrance" (west), "Cusack Stand Entrance" (east) and "Davin Stand Entrance" (south).
- The Hill 16 position comes from Wikipedia ("Railway End"). OSM's `man_made=video_wall` (the big screen) is at the north end.

**Pitch** (`way 4541251`, leisure=pitch, gaelic_games):
- corners 53.36027/-6.25209, 53.36149/-6.25138, 53.36123/-6.25017, 53.36002/-6.25088
- measured **143.3 x 85 m**, long axis **N19.3°E**
- Wikipedia gives **145 x 88 m** (VERIFIED). The pitch was rotated ~8° in the redevelopment to line up with the railway and canal (European Springs, VERIFIED).

**Stadium building** (`relation 3235289`, building=stadium, layer 10):
- **Outer ring:** plan area **49,260 m²**. It measures **270 m along the axis (a -158 to +112) by 244 m across (b -131 to +113)**.
- **Inner ring** (the front of the lower tier / grass area): **158 x 100 m** (a -80 to +78, b -49 to +51). The tiers therefore start ~7 m behind the touchlines and goal lines.
- **No stand building:parts or heights are mapped.**

**Site boundary** (`way 564099741`, leisure=stadium): capacity 82,300, start_date 1913, name:ga "Páirc an Chrócaigh". It extends south of the canal to 53.3588 to take in the **Davin Stand entrance plaza** between the canal and the NCR / Russell Street side.

### 1.2 The Royal Canal and the two railways (VERIFIED, OSM; refs 04, 05, 06)

- **Royal Canal:**
  - Route: from **Binns Bridge / 2nd Lock** on Drumcondra Road (53.3615, -6.2597) SE past the stadium to **Clarke's Bridge** on Ballybough Road / Summerhill Parade (53.3582, -6.2474), then on to the **1st Lock** (53.3567, -6.2446).
  - Water width **~10-15 m** (est., from the OSM water polygons `238961314` and `314594591`; canal-north.md measures ≈10 m for the Newcomen–Croke Park pool).
  - Stone-walled. A towpath / Royal Canal Greenway runs on the **south** bank.
- **The canal passes under the rear of the Davin Stand.** The canal centreline sits at a ≈ -122 to -130, but the stand's rear stair towers reach a ≈ -158. OSM tags the waterway `layer=-1` from Bloody Sunday Bridge (53.36009, -6.25356) to 53.35927, -6.24995 (`way 372341253`).
  - Ref 05 shows it: concrete stair towers with circular landings stand on the north bank, footbridges cross the water into the stand, and a fenced towpath runs opposite.
  - The Davin Stand is entered **from the south** across these footbridges (OSM "Davin Stand Entrance", "Davin Stand Access Route" off Russell Street).
- **MGWR North Wall branch** (`way 23013753`): in a **cutting on the canal's north bank**. It passes **under the Canal End** (ref 06, layer -1). It runs west along the canal to Binns Bridge.
- **GSWR North Wall branch:**
  - It runs **on an embankment behind Hill 16**: 53.36184/-6.25192 → 53.36147/-6.24796 → 53.36063/-6.24334. It passes within ~5-10 m of the Hill 16 NW corner.
  - Bridges carry it over the roads, each a hero-worthy low steel or masonry bridge:
    - **Jones's Road** (UBO 20, ≈53.3619, -6.2526)
    - **Drumcondra Road Lower** at **Drumcondra station** (UBO 16, ≈53.3630, -6.2584; platforms west of the road)
    - **Saint James' Avenue** (UBO 23)
    - **Ballybough Road** (UBO 25, ≈53.3607, -6.2436; a riveted iron girder bridge on fluted cast-iron columns)
  - It continues SE to Connolly as the Dublin Loop Line.

### 1.3 Streets: what OSM says

The game map currently stops at 53.3535, so **none of these streets exist yet**. All are two-way unless noted (VERIFIED, OSM tags).

| Street | OSM | Character |
|---|---|---|
| **Russell Street** (NCR to Bloody Sunday Bridge) | tertiary, 2 lanes, 50 km/h (`20484463`, `1077291753`) | Short, straight, climbs to the canal bridge. Old 2-3 storey brick on the west side. The Davin Stand plaza is on the east. |
| **Bloody Sunday Bridge** | tertiary bridge, 2 lanes (`20484464`, `905928189`) | Formerly **Clonliffe Bridge**, known as Russell Street Bridge. **Renamed 20 Nov 2023** (RTÉ, Irish Times, VERIFIED). A humped masonry canal bridge that also spans the MGWR cutting, with a clear view of the canal running under the Canal End. |
| **Jones's Road** | tertiary, 2 lanes (`20484465`, `366887650`) | West side: **Croke Park Hotel** (relation `1836390`, 53.3604-53.3610) and 2-storey red-brick Victorian/Edwardian houses (ref 08). East side: **the full height of the Hogan Stand** hard against the footpath. Passes under the GSWR bridge at ≈53.3619 before reaching Clonliffe Rd. |
| **Clonliffe Road** (Drumcondra Rd to Ballybough Rd) | secondary R131, 2 lanes (`4541289`, `371391166`, `317697975`) | Long, straight, residential. 2-storey red-brick terraces with front gardens and railings. The new **Maldron Hotel** (red brick, 2026, `way 1382325167`) is at 53.3626-53.3632 / -6.2520. It is the main match-day walking route from Drumcondra (ref 15). |
| **Saint Joseph's Avenue** (OSM "Saint Josephs Avenue") | residential, 2 lanes, 30 km/h, concrete (`700758894`, `700758895`) | Cul-de-sac south from Clonliffe Rd, ending at the Cusack Stand / GAA Museum gate (OSM museum address). There is a different St Joseph's Avenue in Drumcondra, which is out of scope. |
| **Drumcondra Road Lower** (Binns Bridge to Clonliffe Rd) | secondary R132 | Binns Bridge (`4937068`, `740743747`, 6 lanes) crosses the canal and 2nd Lock. It is a **one-way pair (3+3 lanes)** from the bridge to 53.36285, then 4 lanes two-way. Passes under the **GSWR bridge at Drumcondra station** (≈53.3630), then meets Clonliffe Rd at 53.36342, -6.25791. |
| **Ballybough Road** (Clarke's Bridge to Poplar Row / Fairview Strand) | secondary R803, **4 lanes** (`4541293`, `1553775474`, `372341252`, `363394751`) | Wide, busy. Mixed 2-3 storey shops, flats and terraces. Passes under the GSWR iron bridge at ≈53.3607. |
| **Clarke's Bridge** | R803 bridge, 4 lanes (`4937393`, `416906946`, `317697974`) | Canal bridge. Ballybough "begins" here (ref 16). |
| **Summerhill Parade** (Clarke's Bridge to the NCR) | R803, 4 lanes (`4937392`, `541741587`) | Meets the NCR and Portland Row at 53.35701, -6.24977. |
| **North Circular Road** (Russell St to Summerhill Pde) | secondary R101, 2 lanes (`556290239`, `1082293199/200`, `547766101`) | Tree-lined residential road with 3-storey red-brick terraces. **It runs SOUTH of the canal.** The stadium block is separated from the NCR by the canal and the Davin plaza. The Hogan Stand pub is at NCR no. 514. |

**Other streets in the block:**
- Fitzroy Avenue and Russell Avenue: narrow terraces running west from Jones's Rd.
- Sackville Avenue, Ardilaun Road/Square, Saint James' Avenue, Clonliffe Avenue and Foster Terrace: terraces east of the Cusack Stand.
- Distillery Road and Richmond Road: north of Clonliffe Rd. Richmond Road leads towards the Tolka and Tolka Park, out of scope.

**Housing (VERIFIED from OSM tags and refs):**
- 334 of the tagged buildings are 2 levels, 70 are 3 levels and 22 are 1 level. Materials where tagged are brick.
- The dominant type is the **red/orange-brick 2-storey terrace** with slate roofs and big brick chimney stacks with buff pots (refs 07, 08, 16).
- Two variants:
  - **Single-storey artisan cottages** close to the Cusack and Hill 16 ends (refs 07, 11).
  - **3-storey Georgian/Victorian brick** on the NCR and Russell St.

### 1.4 Proposed street-graph additions

All new node IDs start with `KP`. None exist in `src/data/streets.json`; this was checked by script, along with no orphan or missing nodes. Coordinates are OSM centrelines. Widths are suggestions. Nothing here is one-way except as noted: OSM tags Drumcondra Rd's two carriageways separately, and I have merged them into one centreline with width 18 and a median.

```json
{
  "nodes": {
    "KP1": [53.35839, -6.2546],   "KP2": [53.35912, -6.2542],   "KP3": [53.35971, -6.25388],
    "KP4": [53.35997, -6.25375],  "KP5": [53.36028, -6.25358],  "KP6": [53.36096, -6.25322],
    "KP7": [53.36122, -6.25306],  "KP8": [53.36162, -6.25284],  "KP9": [53.36193, -6.25268],
    "KP10": [53.36261, -6.25229], "KP11": [53.36342, -6.25791], "KP12": [53.36307, -6.25569],
    "KP13": [53.36284, -6.25392], "KP14": [53.36235, -6.2503],  "KP15": [53.36213, -6.24868],
    "KP16": [53.362, -6.24771],   "KP17": [53.3618, -6.24629],  "KP18": [53.36149, -6.24406],
    "KP19": [53.36137, -6.24277], "KP20": [53.36098, -6.24318], "KP21": [53.3606, -6.24364],
    "KP22": [53.36039, -6.24392], "KP23": [53.35946, -6.24542], "KP24": [53.35878, -6.24654],
    "KP25": [53.35835, -6.24718], "KP26": [53.35814, -6.24753], "KP27": [53.35753, -6.24871],
    "KP28": [53.35701, -6.24977], "KP29": [53.35749, -6.25045], "KP30": [53.35763, -6.25094],
    "KP31": [53.35793, -6.25236], "KP32": [53.35815, -6.25348], "KP33": [53.36141, -6.25972],
    "KP34": [53.36167, -6.25951], "KP35": [53.36252, -6.25873], "KP36": [53.36285, -6.25844],
    "KP37": [53.36301, -6.25827], "KP38": [53.36149, -6.24891], "KP39": [53.361, -6.2491],
    "KP40": [53.36216, -6.25702], "KP41": [53.36184, -6.2547],  "KP42": [53.3615, -6.25489],
    "KP43": [53.36166, -6.25623], "KP44": [53.36183, -6.2574],  "KP45": [53.3592, -6.24719],
    "KP46": [53.35987, -6.24834], "KP47": [53.36027, -6.24802], "KP48": [53.36103, -6.24805],
    "KP49": [53.36099, -6.24657], "KP50": [53.3608, -6.24521]
  },
  "ways": [
    { "name": "Russell Street", "type": "secondary", "width": 9, "nodes": ["KP1", "KP2", "KP3", "KP4"] },
    { "name": "Bloody Sunday Bridge", "type": "bridge", "width": 10, "nodes": ["KP4", "KP5"] },
    { "name": "Jones's Road", "type": "secondary", "width": 9, "nodes": ["KP5", "KP6", "KP7", "KP8", "KP9", "KP10"] },
    { "name": "Clonliffe Road", "type": "secondary", "width": 10, "nodes": ["KP11", "KP12", "KP13", "KP10", "KP14", "KP15", "KP16", "KP17", "KP18", "KP19"] },
    { "name": "Ballybough Road", "type": "primary", "width": 14, "nodes": ["KP19", "KP20", "KP21", "KP22", "KP23", "KP24", "KP25"] },
    { "name": "Clarke's Bridge", "type": "bridge", "width": 14, "nodes": ["KP25", "KP26"] },
    { "name": "Summerhill Parade", "type": "primary", "width": 14, "nodes": ["KP26", "KP27", "KP28"] },
    { "name": "North Circular Road", "type": "primary", "width": 12, "nodes": ["KP28", "KP29", "KP30", "KP31", "KP32", "KP1"] },
    { "name": "Binns Bridge", "type": "bridge", "width": 20, "nodes": ["KP33", "KP34"] },
    { "name": "Drumcondra Road Lower", "type": "primary", "width": 18, "nodes": ["KP34", "KP35", "KP36", "KP37", "KP11"] },
    { "name": "Saint Joseph's Avenue", "type": "lane", "width": 7, "nodes": ["KP15", "KP38", "KP39"] },
    { "name": "Fitzroy Avenue", "type": "lane", "width": 6, "nodes": ["KP35", "KP40", "KP41", "KP8"] },
    { "name": "Russell Avenue", "type": "lane", "width": 6, "nodes": ["KP7", "KP42", "KP43", "KP44"] },
    { "name": "Sackville Avenue", "type": "lane", "width": 7, "nodes": ["KP24", "KP45", "KP46"] },
    { "name": "Ardilaun Road", "type": "lane", "width": 7, "nodes": ["KP46", "KP47"] },
    { "name": "Saint James' Avenue", "type": "lane", "width": 7, "nodes": ["KP47", "KP48", "KP16"] },
    { "name": "Clonliffe Avenue", "type": "lane", "width": 7, "nodes": ["KP17", "KP49", "KP50", "KP22"] }
  ],
  "docks": {
    "Royal Canal (Binns Bridge to 1st Lock) - centreline, water ~12-15 m": [[53.36148, -6.25955], [53.36055, -6.2557], [53.36021, -6.2541], [53.36013, -6.25371], [53.35988, -6.25278], [53.35944, -6.25073], [53.35927, -6.24995], [53.35888, -6.24881], [53.35854, -6.24811], [53.35821, -6.24745], [53.35685, -6.24488]]
  }
}
```

Notes on the snippet:
- Real lengths: Russell St 185 m, Jones's Rd 273 m, Clonliffe Rd 1,032 m, Ballybough Rd 447 m, NCR stretch 364 m, Drumcondra Rd stretch 222 m.
- **Node meanings:**
  - KP9: Jones's Rd under the GSWR bridge.
  - KP21: Ballybough Rd under the GSWR bridge.
  - KP37: Drumcondra Rd under the GSWR bridge at Drumcondra station.
  - KP39: the St Joseph's Ave dead end at the Cusack/Museum gate.
  - KP44: the Russell Ave west end, where it meets Whitworth Ave (not added).
- The canal is given as a **centreline** because the `docks` format is a polygon. Buffer it by ~6-7 m each side, or convert it to a river-style pair of bank lines. From Bloody Sunday Bridge to about 53.3593, -6.2500, it runs **under the Davin Stand** (§4, P0-3).
- **Match-day:** Jones's Road, Russell Street, Clonliffe Road and St Joseph's Ave are closed to general traffic around big games, with a Garda cordon. This is est., common knowledge and not verified. If a match-day mode exists, give those ways `access: "destination"` then.

### 1.5 Stitch points with the northern ring roads (NCR / Dorset St / Phibsborough agent)

| Junction | Lat, lon | OSM node | My node |
|---|---|---|---|
| **NCR × Russell Street** | 53.35839, -6.25460 | 1419098342 | KP1 |
| **NCR × Summerhill Parade × Portland Row** | 53.35701, -6.24977 | 12117928 | KP28 |
| **Drumcondra Rd Lower / Dorset St Lower at Binns Bridge, south abutment** | 53.36141, -6.25972 | 32529246 | KP33 |
| **Drumcondra Rd Lower × Clonliffe Road** (north limit of my Drumcondra stretch) | 53.36342, -6.25791 | 28256484 | KP11 |
| **Clonliffe Rd × Ballybough Rd × Poplar Row × Fairview Strand** (east limit) | 53.36137, -6.24277 | 28257211 | KP19 |
| Royal Canal at Binns Bridge, west limit of my canal reach | 53.36148, -6.25955 | – | – |
| Royal Canal at Clarke's Bridge / 1st Lock, east limit | 53.35821, -6.24745 / 53.35678, -6.24473 | – | – |

- If the ring agent already has nodes at KP1, KP28, KP33, KP11 or KP19, **replace my KP node with theirs**; the coordinates are OSM junction nodes.
- The NCR west of Russell Street, Dorset Street, Portland Row and Poplar Row / Fairview Strand belong to the ring agent.

### 1.6 Reconciliation with `canal-north.md` (read after writing §1.4)

The northern-ring research (`docs/research/canal-north.md`) already defines several of these streets, using `RN` nodes on the same OSM junctions. **Its nodes should win.**

**Node equivalents.** Drop my KP node and use the RN node.

| Mine | Theirs | Where |
|---|---|---|
| KP1 | RN59 | NCR x Russell St |
| KP4 | RN61 | Bloody Sunday Bridge S |
| KP5 | RN62 | Bloody Sunday Bridge N / Jones's Rd |
| KP28 | RN21 | NCR x Summerhill Pde |
| KP26 | RN22 | Clarke's Bridge S |
| KP25 | RN23 | Clarke's Bridge N |
| KP19 | RN24 | Ballybough Rd x Clonliffe Rd x Poplar Row |
| KP34 | RN19 | Drumcondra Rd x Whitworth Rd, north end of Binns Bridge. Theirs is 9 m further north; use it. |
| KP33 | – | Their Binns Bridge is RN18 → RN19. Drop KP33. |

**Duplicate ways to drop from my snippet:** Russell Street, Bloody Sunday Bridge, North Circular Road, Summerhill Parade, Clarke's Bridge, Binns Bridge and Ballybough Road. Keep theirs.

**But insert these intermediate nodes into their ways**, because my side streets need them:
- **Ballybough Road** RN23 → RN24 becomes **RN23, KP24, KP23, KP22, KP21, KP20, RN24**. KP24 is the Sackville Ave junction and KP22 the Clonliffe Ave junction; KP21 is under the GSWR bridge.
- **Russell Street** RN59 → RN61 can take KP2 and KP3 (the Davin Stand access road). This is optional.
- **NCR** RN60 → RN21: KP29-KP32 are not needed unless North Richmond St is added.

**What stays mine:** Jones's Road (RN62 → KP6 … KP10), Clonliffe Road (KP11 … KP10 … RN24), Drumcondra Road Lower (RN19 → KP35 → KP36 → KP37 → KP11), Saint Joseph's Avenue and the side avenues, plus the stadium.

**The canal.** `canal-north.md` also covers the Royal Canal (pools of about 10 m wide between Newcomen and Croke Park). Use its canal geometry. Its only special requirement from me is the **opening under the Davin Stand** (§4, P0-3).

---

## 2. Reference images (`refs/croke-park/`)

All come from Wikimedia Commons (several are geograph.org.uk uploads). They were saved at 960-1,920 px, or at the original size when smaller. **Exception:** 04 and 14 are 400 px thumbnails because Commons rate-limited the download. Their originals are only 640 px; re-fetch later from the linked pages. None are from Google. All are CC BY, CC BY-SA or public domain; three Free Art Licence photos were deliberately **not** used. Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-skyline-from-phibsborough.jpg | [Croke Park stadium, viewed from Phibsborough](https://commons.wikimedia.org/wiki/File:Croke_Park_stadium,_viewed_from_Phibsborough.jpg) | O'Dea | CC BY-SA 4.0 | 2015-11-03 | **The far view.** A long flat band crowned by a regular row of white A-frame masts above the rooftops, with Howth behind. This is the silhouette to get right. |
| 02-panorama-from-summerhill-parade.jpg | [Croke-summerhill.jpg](https://commons.wikimedia.org/wiki/File:Croke-summerhill.jpg) | KGGucwa | Public domain | 2008-02-02 | **The whole Cusack Stand rear** from the SE across the canal. About 13 masts, stacked concourse decks and zig-zag ramps, a dark clad hospitality block, the "Welcome to Croke Park" panel, the curved corner wrapping into the Davin Stand |
| 03-bowl-overview-from-upper-tier.jpg | [Croke Park panorama](https://commons.wikimedia.org/wiki/File:Croke_Park_panorama.jpg) | Rob Hurson | CC BY-SA 2.0 | 2014-08-24 | **Overview of the bowl** from the upper tier. Pitch stripes, red perimeter, seat colour, the open Hill 16 end, roof bays |
| 04-canal-end-cusack-corner-from-royal-canal.jpg | [Croke Park Stadium from the Royal Canal - geograph 395735](https://commons.wikimedia.org/wiki/File:Croke_Park_Stadium_from_the_Royal_Canal_-_geograph.org.uk_-_395735.jpg) | JP | CC BY-SA 2.0 | 2007-04-06 | **The SE corner (Cusack/Davin) from the towpath.** Giant white masts and trusses, spiral stair turrets with round landings, a navy-grey clad drum, the "Welcome to Croke Park / Fáilte go Páirc an Chrócaigh" panel, the footbridge |
| 05-royal-canal-alongside-canal-end.jpg | [Croke Park (48139486223)](https://commons.wikimedia.org/wiki/File:Croke_Park_(48139486223).jpg) | Metro Centric | CC BY 2.0 | 2019-06-09 | The **canal running along and under the Canal End**. Stair towers on the north bank, footbridges and link bridges across, the fenced towpath |
| 06-railway-passing-under-canal-end.jpg | [Croke park tracks](https://commons.wikimedia.org/wiki/File:Croke_park_tracks.jpg) | Jérôme | CC BY-SA 3.0 | 2008-06-21 | The MGWR line in its cutting **passing under the stand**, the canal beside it, masts above (probably from Bloody Sunday Bridge looking east) |
| 07-stand-rear-over-redbrick-terrace.jpg | [Croke Park (48139459926)](https://commons.wikimedia.org/wiki/File:Croke_Park_(48139459926).jpg) | Metro Centric | CC BY 2.0 | 2019-06-09 | **The best rear-elevation detail.** Raked underside of the upper tier, Y-shaped concrete columns, white A-frame masts with tie rods, the lattice roof edge, the blue-grey clad band with dark glazing. Single-storey red-brick cottages in front. |
| 08-hogan-stand-from-jones-road.jpg | [Jones's Road, Clonliffe](https://commons.wikimedia.org/wiki/File:Jones%27s_Road,_Clonliffe.jpg) | William Murphy | CC BY-SA 2.0 | Sept (year n/k) | **Driver's view on Jones's Road.** 2-storey red-brick houses under the towering raked stand, Y-frame and trusses |
| 09-stair-towers-and-hospitality-cladding.jpg | [Croke Park (48139486498)](https://commons.wikimedia.org/wiki/File:Croke_Park_(48139486498).jpg) | Metro Centric | CC BY 2.0 | 2019-06-09 | Stacked cantilevered concourse decks and stair landings, the dark clad glazed block, a lamp post, a brick house |
| 10-hogan-turnstiles-signage.jpg | [Croke Park (48139551682)](https://commons.wikimedia.org/wiki/File:Croke_Park_(48139551682).jpg) | Metro Centric | CC BY 2.0 | 2019-06-09 | **Street-level turnstile wall.** Navy panelled turnstile block, sky-blue sign band "HOGAN LOWER & UPPER TIERS / Ardán Íochtarach & Uachtarach, SECTIONS 322-336 / 722-736", F-numbered gates, bollards |
| 11-roof-cantilever-end-profile.jpg | [Croke Park stadium, Dublin - geograph 5345386](https://commons.wikimedia.org/wiki/File:Croke_Park_stadium,_Dublin_-_geograph.org.uk_-_5345386.jpg) | Gareth James | CC BY-SA 2.0 | 2017-04-08 | **The roof in section.** The north end of a long stand, probably the Cusack seen from the St Joseph's Ave side. The dark wedge roof rises to a thin tip cantilevered far out over the Hill 16 corner, with a mast and top truss. Also the raking concrete end frame, and the Hill 16 rear (right) with horizontal banding. |
| 12-hill-16-terrace-screen-and-mast.jpg | [Hill 16, Croke Park, Dublin - geograph 7555104](https://commons.wikimedia.org/wiki/File:Hill_16,_Croke_Park,_Dublin_-_geograph.org.uk_-_7555104.jpg) | John S Turner | CC BY-SA 2.0 | 2014-09-29 | **Hill 16:** open grey terrace with crush barriers, the white scoreboard block with the big screen, **the lattice floodlight mast behind**, the city beyond, the end of the Cusack roof with its roof-top light gantry |
| 13-interior-roof-bays-and-floodlights.jpg | [Croke Park.jpg](https://commons.wikimedia.org/wiki/File:Croke_Park.jpg) | Johnjake | CC BY-SA 3.0 | 2014-04-10 | Interior: **the scalloped roof front** (a row of shallow arched bays), translucent roof panels, **floodlight clusters on each bay crown**, the "GAA MUSEUM" fascia, ad bands between tiers, blue-grey seats |
| 14-night-floodlit-match.jpg | [Six nations match, Croke Park - geograph 704827](https://commons.wikimedia.org/wiki/File:Six_nations_match,_Croke_Park_-_geograph.org.uk_-_704827.jpg) | Lisa Jarvis | CC BY-SA 2.0 | 2008-02-23 | **Night:** a continuous line of floodlights along the roof leading edge, lit pitch, big screen at the end, full crowd |
| 15-matchday-clonliffe-road.jpg | [On the way to the match - geograph 714095](https://commons.wikimedia.org/wiki/File:On_the_way_to_the_match_-_geograph.org.uk_-_714095.jpg) | Lisa Jarvis | CC BY-SA 2.0 | 2008-02-23 | **Match day:** crowds walking down Clonliffe Road between parked cars and 2-storey red-brick terraces |
| 16-ballybough-terraces-by-the-canal.jpg | [Ballybough .jpg](https://commons.wikimedia.org/wiki/File:Ballybough_.jpg) | BallyboughDublin | CC BY-SA 4.0 | 2018-09-06 | **Housing character:** orange-red brick 2-storey terrace, slate roofs, tall chimney stacks, the graffiti canal wall and bank near Clarke's Bridge |

Commons candidates not downloaded (all acceptable licences):
- `Croke Park (145836317).jpeg`: B&W, from the canal.
- `Croke park hogan stand.jpg` (PD) and `Croke park.jpg` (CC BY-SA 3.0): 2005-06 interiors that read more saturated blue.
- `Croke Park Panoramic 2009.jpg`: a night interior panorama, CC BY 2.0.
- `Croke Park 2018.jpg`: an interior panorama, CC BY 2.0.
- `Royal-Canal-Stadion.jpg` (PD): canal, stadium and Georgian houses.
- `Royal Canal and railway line at Binns' Bridge - geograph 5946994`.
- `Clonliffe Road at Drumcondra Road, Dublin.jpg`: dusk, CC BY 2.0.
- `Ballybough Road Bridge - 20210930145716.jpg`: the GSWR iron bridge.
- `Croke Park on match day - geograph 22055`.
- `TRAIN APPROACHING CLONLIFFE BRIDGE...-136744.jpg`: Bloody Sunday Bridge.
- `Maldron Hotel Croke Park,.jpg`.
- **No licence-compatible true aerial photo was found on Commons.** The footprint comes from OSM.

---

## 3. Landmark profile

### 3.1 Facts

| Item | Fact | Status |
|---|---|---|
| Owner / operator | GAA (Croke Park Teoranta). Headquarters of Gaelic games. | VERIFIED (Wikipedia, OSM) |
| Capacity | **82,300** (69,100 seated + 13,200 terrace). Record attendance 90,556 (1961). | VERIFIED (Wikipedia, OSM `capacity`) |
| Architects | **Gilroy McMahon** with **HOK Sport**. Structural engineers **Horgan Lynch**. Built in 4 phases, 1993-2005. | VERIFIED (Archiseek, Horgan Lynch) |
| Phase 1: **Cusack Stand** | Lower deck 1994, upper 1995 (opened fully 1996). **180 m long, 35 m high**, 3 viewing tiers (lower, premium/hospitality, upper), 46 hospitality suites. Capacity ~27,000 (Wikipedia says 25,000-27,000). | VERIFIED (Wikipedia) |
| Phase 2: **Davin Stand** (Canal End) | Replaced the Canal End terrace (late 1990s). Named after Maurice Davin, first GAA president. The "Ali tunnel" commemorates Muhammad Ali's 1972 fight here. | VERIFIED (Wikipedia) |
| Phase 3: **Hogan Stand** | Rebuilt to match the Cusack (completed 2002). Main stand: presidential box, media, trophy presentation. Named after Michael Hogan, killed on Bloody Sunday. | VERIFIED (Wikipedia); height est. equal to the Cusack |
| Phase 4: **Dineen Hill 16 + Nally Terrace** | Railway End terrace. Officially opened **14 March 2005**. Standing, **~13,000** capacity, **no roof**. Renamed "Dineen Hill 16" in 2006 after Frank Dineen. The old **Nally Stand** (1952) stood alongside Hill 16 at the north end; it was demolished in 2003 and rebuilt in Carrickmore, Co. Tyrone. | VERIFIED (Wikipedia, HoganStand, Irish Examiner) |
| Structure | A **leaning frame**: tiers pitched out towards the pitch, carried on **Y-shaped ("tree") concrete columns**. The concrete flows into a **cantilevered steel roof truss**. | VERIFIED (Archiseek via search, European Springs, JS McCarthy) |
| **Skyline** roof walk | Opened 1 June 2012. A **0.6 km** metal walkway around the roof, **44 m above the ground** (17 storeys), with 5 viewing platforms. Also a walkway suspended over the pitch. Starts from the GAA Museum. | VERIFIED (Wikipedia, doylecollection, irelandbylocals) |
| **GAA Museum** | In the **Cusack Stand**, entered from Saint Joseph's Avenue at the south-east (Cusack/Davin) end. OSM node 53.36000, -6.25013. The **Michael Cusack statue** (bronze) is at 53.36027, -6.24952. | VERIFIED (OSM, crokepark.ie) |
| **Floodlights** | First used **3 Feb 2007** (Dublin v Tyrone). **463 lamps: 435 on the roof, 28 on a mast behind Hill 16**, 2 kW each (original Thorn system). Replaced by **LED in 2025** (€2 m, debut 28 Sep 2025 NFL game). | VERIFIED (Wikipedia, Irish Examiner 27 May 2025) |
| Pitch | 145 x 88 m (Wikipedia); OSM polygon 143 x 85 m. Rotated ~8° in the redevelopment to align with the railway and canal. | VERIFIED |
| Bloody Sunday | 21 Nov 1920: 14 killed. Shots were fired from the canal bridge, now **Bloody Sunday Bridge** (renamed 20 Nov 2023). | VERIFIED |
| Heights not in any source | No stand building:parts or heights in OSM, and no published roof height except "Cusack 35 m high" and "Skyline 44 m". | See §3.2 |

### 3.2 Massing and dimensions (stadium local frame; real metres)

**Plan**, simplified from OSM relation 3235289 (4 m tolerance):
- **a** runs along the pitch towards Hill 16 (N19.3°E). **b** runs across towards the Cusack (ESE).
- The pitch is a ±72, b ±42.5. The inner (front-of-tier) edge is a -80 to +78, b ±50.

| Part | Plan extent (a, b) | Depth behind the tier front | Notes |
|---|---|---|---|
| **Hogan Stand** (W) | a -78 to +54, rear face **b = -130**. A small recess at a -37 to -21 (b -122). The north end steps in to b -96 at a 59-71. | **~80 m** | The rear face is ~8 m from the Jones's Rd centreline. Full-height concourse ramps and turnstile blocks along Jones's Rd. |
| **Cusack Stand** (E) | a -84 to +47. Main rear **b ≈ 96**, with **stair-tower/ramp projections to b ≈ 112** at a -83…-43 and a +4…+44. | **~46-62 m** | The museum and main entrance plaza are at the south-east. |
| **Davin Stand** (S) | Rear **a ≈ -132** across b -38…+37, **plus stair towers to a -142…-158** that reach over the canal (§1.2). | **~52 m, 78 m to the tower tips** | The canal and MGWR railway pass beneath (a ≈ -122 to -130). |
| **Corners** | **SW:** a chamfer/curve from (-121,-76) to (-91,-97). **SE:** a curve from (-112,85) to (-123,72). | – | Roofed and continuous with the stands: the U is one sweep of roof. |
| **Hill 16 + Nally** (N) | Rear from (88,-77) via (92,-28), (100,-26), (112,48), (104,71) to (73,85). | **~25-34 m** | Low open terrace. The big screen block is at the west-of-centre (a 93, b -37; OSM video_wall). The **Nally Terrace is the Hogan-side (west) section** (est.; ref 12 shows the screen block in that corner). The GSWR embankment passes just outside the NW corner (a 97, b -90). |

**Heights** (above pitch/street level; the site is essentially flat):

| Element | Height | Status |
|---|---|---|
| Lower tier rake (front to back) | 1 → ~10 m | est. (refs 03, 13) |
| Premium/hospitality band (clad, glazed, boxes) | ~11-19 m | est. (refs 07, 13) |
| Upper tier rake | ~19 → **~33-35 m** at its rear | Cusack "35 m high" (Wikipedia, VERIFIED) read as the stand body |
| Roof top chord / Skyline walkway | **~44 m** | VERIFIED as "44 m above the ground" (Skyline). The roof front edge sits a little lower, ~40 m est. |
| Roof leading edge (underside) | ~36-38 m | est. The roof **rises towards the pitch** (ref 11). |
| Mast (A-frame) tips | **~50-52 m** | est. The masts stand ~7-8 m proud of the top chord (refs 02, 07, 11). |
| Roof cantilever depth (back truss to front edge) | ~40-45 m | est. It covers the upper and most of the premium tier. The lower tier front rows are open (ref 03). |
| Roof overhang beyond stand ends at the Hill 16 corners | ~25-30 m | est. (ref 11, a dramatic blade) |
| Hill 16 terrace rear | ~12-14 m | est. (refs 11, 12) |
| Scoreboard/screen block (Hill 16 west) | ~16-18 m | est. (ref 12) |
| Floodlight mast behind Hill 16 | ~40-45 m | est. (ref 12) |
| Canal level | ~3-5 m below the street at Bloody Sunday Bridge; the railway cutting a further ~4-5 m | est. (refs 05, 06) |

### 3.3 Construction and recognisable features (from the refs)

1. **The crown of white A-frame masts.** Along the roof's back edge, every **~14 m** (13 masts along the 180 m Cusack in ref 02; est. ~40 around the U), pairs of white tubes rise in an A/V shape ~7-8 m above the roof. Thin tie rods fan down to the roof on both sides.
   - A continuous **white lattice truss** runs along the roof perimeter between them.
   - From a distance this reads as a **serrated crown** on a long flat band. It is *the* far-view cue (refs 01, 02).
2. **The exposed back of the upper tier.** Behind the clad band, the underside of the upper tier is left open. It shows a sawtooth of light-grey concrete steps, carried on huge **Y-shaped concrete "tree" columns** with raking struts (refs 07, 08, 11).
3. **Stacked concourse decks, ramps and stair towers.** Horizontal light-grey concrete bands (open concourses, like a multi-storey car park) are stacked 4-5 high. **Zig-zag ramps** and **cylindrical stair turrets with round cantilevered landings** stand out from the Cusack and Canal End (refs 02, 04, 05, 09).
4. **A dark navy/slate clad band.** The premium level is wrapped in dark blue-grey metal panels with ribbon glazing, curved "drum" corners and a raked-out glass wall at the SE corner (refs 04, 07, 09).
5. **The roof itself.**
   - A dark grey sheet roof (top) with **translucent strips**. The underside is light.
   - From inside, the leading edge is a row of **shallow arched (scalloped) bays**, each crowned with a **floodlight cluster** (ref 13).
   - At the Hill 16 end the roof **projects as a sharp blade** beyond the stand (ref 11).
6. **The U shape with an open north end.** The **low Hill 16 terrace**, the white screen block and the single lattice floodlight mast break the bowl (refs 03, 12).
7. **The pitch and seats.** Striped green turf and a **terracotta/red perimeter strip**. **Seats are a muted slate blue-grey**, not bright blue and not pure grey:
   - They read grey-blue in 2014-2019 photos (refs 03, 13).
   - Older 2005-06 photos read more saturated blue.
   - Coloured sponsor/LED bands run between the tiers.
8. **Street furniture:**
   - Navy turnstile blocks with **sky-blue bilingual sign bands** ("HOGAN LOWER & UPPER TIERS / Ardán Íochtarach & Uachtarach", ref 10).
   - Palisade fences, bollards, and "Welcome to Croke Park / Fáilte go Páirc an Chrócaigh" panels (ref 04).
   - **Large exterior "CROKE PARK / PÁIRC AN CHRÓCAIGH" lettering is NOT confirmed in any ref.** Only the smaller welcome panel is. Treat a big wordmark as creative licence (§5).

### 3.4 Colours (hex estimates from refs 02-13, corrected for overcast exposure)

| Surface | Hex | Note |
|---|---|---|
| Masts, roof trusses, tie rods | `#e6e9ea` lit / `#b7bdc2` shade | painted white/very light grey steel (JS McCarthy: epoxy + polyurethane system) |
| Structural concrete (Y-columns, rakers, decks, stair towers) | `#bdb9b0` lit / `#8e8b85` shade | light warm grey, fair-faced |
| Underside of upper tier (sawtooth) | `#a9a79f` with `#77756f` step shadows | |
| Clad band (premium level) | `#3c4a5d` | dark slate blue-grey panels |
| Ribbon glazing | `#2a3542` (day), warm `#ffd9a0` when lit | |
| Turnstile blocks | `#2b3b52` panels, `#5d6b7c` seams | ref 10 |
| Sign band | `#2e98dc` with white text | ref 10 |
| Roof top | `#8d949a` | metal sheet |
| Roof underside / translucent panels | `#d8dbd6` | ref 13 |
| Seats | `#5a6980` lit / `#3a4658` shade | slate blue-grey (VERIFIED as the colour family from refs 03 and 13; older photos lean blue `#40598a`) |
| Pitch | `#3f7d2e` / `#4c9138` stripes | ~6 m mowing stripes across the pitch |
| Perimeter strip | `#a3533d` | terracotta surround (refs 03, 12) |
| Hill 16 terrace | `#9b988f` steps, `#d9d7cf` barriers | |
| Ad/LED bands | `#c8322b`, `#1f4fa0`, `#f2f2f2` | ribbons between the tiers |
| Local brick terraces | `#a4492f` (red) / `#b9643f` (orange-red, Ballybough) | slate `#4f555b`, chimney pots `#c9a77a` |
| Canal water | `#3b4a44` | stone walls `#8e8a80`, towpath `#b8b0a0` |

### 3.5 Normal day, match day and night

- **Normal day:**
  - Gates are shut and the bowl is empty (blue-grey seats).
  - Tourist groups gather at the museum, and small figures are on the Skyline walkway (optional, tiny).
  - Jones's Rd and Clonliffe Rd are quiet residential streets, with parked cars on both sides.
- **Match day** (All-Ireland finals Aug-Sept; concerts in summer):
  - Crowds of 80k fill the streets 1-2 h before throw-in. Most walk up Clonliffe Rd from Drumcondra (ref 15), or up Russell St and Jones's Rd from the city.
  - County colours (for example Dublin sky-blue/navy, Kerry green/gold, Mayo green/red) and flag sellers.
  - Gardaí and stewards. Jones's Rd, Russell St and St Joseph's Ave are closed to traffic (est.).
  - Pubs on the NCR and Drumcondra Rd overflow onto the pavement: The Hogan Stand pub at NCR no. 514 and Cusack's on North Strand Road (both in OSM).
  - Inside, the seat texture becomes a crowd speckle, and Hill 16 is a "sea of blue" when Dublin play (Wikipedia).
- **Night / floodlit:**
  - A continuous **line of LED floodlights along the roof leading edge** of all three stands, plus the lattice mast behind Hill 16.
  - The pitch glows bright green, and the roof underside and inner bowl are lit.
  - From outside, the bowl emits a **halo above the roofline**, and the concourse decks show rows of cool-white strip lights (ref 02 shows them lit even by day).
  - Clad-band windows glow warm, and the big screen is lit.
  - Concerts add coloured stage light (for example U2 360°, 2009).

---

## 4. Build brief (prioritised)

### P0: data, placement and scale

1. **Street graph.** Add the §1.4 snippet, merging stitch nodes with the ring agent's (§1.5). Classify:
   - Ballybough Rd, Summerhill Pde, NCR and Drumcondra Rd as `primary`
   - Clonliffe Rd, Jones's Rd and Russell St as `secondary`
   - the avenues as `lane`
2. **Anchor the stadium from OSM, not from a road offset.**
   - Pitch centre **53.360753, -6.251130**. Pitch long axis bearing **19.3°** (Hill 16 end NNE).
   - In Blender (X east, Y north), build with +Y towards Hill 16, then rotate the root by **-19.3° about Z** (clockwise from above) so +Y points N19.3°E.
   - The building origin is the pitch centre at ground level.
3. **The canal under the Canal End.**
   - The Davin Stand's rear must **bridge over the canal and the railway cutting**: stair towers on the north bank, a deck spanning the water, footbridges to the south-bank plaza (refs 05, 06).
   - Leave a clear opening ~25 m wide (real) under the stand's SE rear, between a ≈ -122 and -140. The canal ribbon passes through it.
   - In the game this is a signature moment: crossing Bloody Sunday Bridge, you see the canal and rails slide under the stadium.
4. **Scale recommendation: plan 0.5 (map-locked) x height 0.85, masts at 0.95.**
   - **Plan 0.5, no inflation.** The stadium is boxed in by Jones's Rd (~8 m off the Hogan rear), the canal (under the Davin) and the railway (behind Hill 16). Any plan inflation pushes it onto those roads. At the map's 0.5 it fills its block exactly as in reality, and it is still by far the biggest footprint north of the river: **~135 m x 122 m**, more than twice the GPO frontage.
   - **Height 0.85**, as for past heroes. Game heights come out as: stand rear ~29 m, roof edge ~33-37 m, **mast tips ~43-45 m**.
   - **Masts at 0.95.** Scale them slightly less than the stand (i.e. make them relatively taller) so the crown stays crisp at distance.
   - Because the plan halves and the height does not, the section gets steeper (the rakes read steeper). That helps the street view and is acceptable.
   - **Carriageway clearance.** At 0.5, the Hogan rear sits only ~4 game-m from the Jones's Rd centreline, but the road needs ~8 m (4.5 half-width + 3.5 pavement). **Trim the Hogan's rear concourse by ~9 m real (to b = -121) before scaling**, or nudge KP5-KP10 ~4-5 m west. Otherwise `footprints.mjs` will flag it. Check the same for the Cusack stair towers against St Joseph's Ave (KP39 sits at a 71, b 118: clear) and for the Hill 16 NW corner against the GSWR embankment if it is modelled.
   - The pitch becomes ~72 x 43 m in game. It is a view, not a drivable area; keep the gates closed.

### P1: hero GLB, `tools/blender/build_crokepark.py` (kit.py pipeline)

**Budget: ~20k tris target, 25k ceiling.** That is above the 8-20k per-landmark norm, and justified:
- It is the largest structure in the game by a wide margin, and seen from 500 m+ (the NCR, Drumcondra, the rooftops).
- The far-view identity depends on ~40 repeated mast units and a continuous U of roof, which cannot be faked with a few boxes.
- It replaces what would otherwise be dozens of filler blocks in its footprint.

**Strongly recommended:** a separate **far LOD (~2.5k tris)**, used above ~350 game-m. It keeps the U roof slab, the rim band and simplified A-frame masts as crossed quads. At the lite fog distance (~600 m) only this LOD shows.

**Parts:**

| Part | Tris | Geometry vs texture |
|---|---|---|
| **Seating bowl** (3 stands + 2 curved corners) | ~2,500 | Geometry: lower tier, premium band and upper tier as 3 sloped strips per stand (a rake quad per stand face, with the corners faceted every ~7.5°), vomitory notches and tier fronts. Texture: seat rows (tileable, empty / crowd variants), aisles, ad bands. |
| **Hill 16 / Nally terrace** | ~800 | Geometry: stepped rake as 6-8 big steps, rear wall with horizontal banding, screen block (box + emissive screen), perimeter wall. Texture: terrace steps with crush barriers. |
| **Rear elevations: decks, ramps, stair towers** | ~5,500 | Geometry: stacked concourse slabs (4-5 levels, thin boxes along the rear), zig-zag ramps on the Cusack, **6-8 cylindrical stair turrets** (12-sided) with round landings, the clad premium band with curved drum corners, the SE glass wall, turnstile blocks along Jones's Rd / Russell St / St Joseph's Ave. Texture: deck edges with strip lights, glazing, turnstile/sign band. |
| **Y-columns and raking struts** | ~2,000 | Geometry: ~26 Y-frames on the stand rears (8-sided legs and forks). This is what makes it Croke Park from the street; do not texture it. |
| **Upper-tier underside** | ~800 | Geometry: one sloped quad strip per stand. Texture: the sawtooth underside and step shadows (refs 07, 08). |
| **Roof** | ~2,200 | Geometry: a continuous wedge slab round the U. Thin at the front, 3-4 m deep at the back truss, **rising towards the pitch**, scalloped leading edge (one arch per mast bay, ~14 m real), and **blade overhangs** past the stand ends at Hill 16. Texture: top sheet with translucent strips; underside panels. |
| **Masts + perimeter truss** | ~5,000 | Geometry: **~40 A-frame masts**. Each is 2 legs (6-sided) plus a cross-tie plus 4 tie rods as 3-sided prisms, ~110 tris. The top chord is a continuous tube. Texture: the lattice web between chords as an alpha strip (reuse on the back edge). |
| **Floodlight rig** | ~400 | Geometry: emissive strip along the roof leading edge (a quad band) with clusters on the bay crowns, plus the lattice mast behind Hill 16 (4-sided tapered + head, 28-lamp panel). |
| **Pitch, perimeter, goals** | ~500 | Geometry: pitch plate, perimeter strip, 2 sets of H-posts (tall GAA posts ~13 m, 8-sided). Texture: stripes and markings (13 m, 20 m and 45 m lines, the D). |
| **Canal crossing** | ~600 | Geometry: stand deck spanning the canal/railway opening, 2-3 footbridges with railings (alpha), bridge link to the south plaza. |
| **Signage** | ~200 | Decals: sky-blue sign bands, "Welcome to Croke Park / Fáilte go Páirc an Chrócaigh", stand names (HOGAN / CUSACK / DAVIN / HILL 16) at the entrances, optional wordmark. |
| **Total** | **~20,500** | |

**Atlas** (new, 1024², painted at load like the Ha'penny atlas; the stone decal atlas in `kit.DECAL` is full):

| Region | Size (px) | Content |
|---|---|---|
| `seats` | 256x256 | Tileable seat rows, slate blue-grey, with aisles |
| `crowd` | 256x256 | The same rows with a coloured speckle crowd (match-day swap) |
| `terrace` | 256x128 | Hill 16 steps with crush barriers |
| `lattice` | 512x64 | Alpha truss web (white) |
| `underside` | 256x128 | Sawtooth underside of the upper tier |
| `deck` | 256x64 | Concourse deck edge: grey slab, dark gap, strip lights (emissive mask) |
| `clad` | 256x128 | Slate panels with ribbon glazing (emissive windows) |
| `turnstile` | 512x64 | Navy turnstile block and the sky-blue bilingual sign band |
| `roofunder` | 256x128 | Translucent roof panel bays |
| `adband` | 512x32 | LED / ad ribbon (emissive) |
| `screen` | 128x64 | The big screen (emissive) |
| `sign` | 512x64 | "CROKE PARK · PÁIRC AN CHRÓCAIGH" / "Fáilte" panel |
| `pitch` | 256x256 | Stripes and markings, or vertex-coloured stripes with only the markings in the atlas |

**Materials.** Keep the `kit.material` naming so `heroes.js byName()` can map on the name suffix.
- `cp_white`: trusses and masts, `#e6e9ea`. Maps to the existing `white`.
- `cp_concrete`: `#bdb9b0`. **New key.**
- `cp_clad`: `#3c4a5d`. **New key.**
- `cp_roof`: `#8d949a`. Existing `roof`.
- `cp_glass`: existing.
- `cp_turf`: **new**.
- `cp_decal`: the new atlas, with an emissive map.
- `cp_flood`: emissive white, **new**.

Unknown suffixes currently fall back to `rubble`, so the new keys must be added in `heroes.js` (a later phase; not touched here). AO is baked into vertex colours as usual. With decals hidden from the bake, the huge roof will cast a strong occlusion band on the upper tiers, which is correct.

**Night lighting:**
- `cp_flood` and the atlas emissive (windows, deck strip lights, screen, ad bands) ramp with the existing night emissive factor.
- Add **one cheap upward glow card** or a sprite halo over the bowl for the far view.
- Optionally add a few point lights inside (not shadow-casting), or none: a bright pitch material at night can fake the floodlit turf.
- The LED floodlights (2025) are cool white, ~`#f4f7ff`.

### P2: surroundings

- **Terraced housing:** the filler generator's red-brick 2-storey terrace with chimney stacks, at a higher density on Clonliffe Rd, Jones's Rd (west side), Russell Ave, Fitzroy Ave, Sackville Ave, St James' Ave, Clonliffe Ave and Ballybough.
  - Add a **single-storey cottage** variant for the lanes near the Cusack and Hill 16 (refs 07, 11).
  - Add 3-storey Georgian/Victorian brick on the NCR and Russell St.
  - Use orange-red brick `#b9643f` in Ballybough and deeper red `#a4492f` elsewhere.
- **Croke Park Hotel** on Jones's Rd (west side, 53.3604-53.3610 / -6.2536 to -6.2549): a modern 5-6 storey block, generic.
- **Maldron Hotel**, Clonliffe Rd: red brick, ~6 storeys, 2026, generic.
- **GSWR railway embankment and bridges** over Jones's Rd (KP9), Drumcondra Rd (KP37, with Drumcondra station platforms) and Ballybough Rd (KP21; fluted cast-iron columns). There are no trains in the game, so these are just low bridges; they give Jones's Rd and Ballybough Rd a gateway feel.
- **Royal Canal:**
  - water ribbon with stone walls and the towpath/greenway on the south bank
  - **Binns Bridge and the 2nd Lock** (lock gates and balance beams; a Brendan Behan statue on the bench at 53.36171, -6.26025)
  - Clarke's Bridge
  - the canal lock at the 1st Lock just south of Clarke's Bridge
- **Match-day dressing** (if a mode exists): crowd instances on the closed streets, flags, programme stalls, Garda vans, a coloured crowd texture swap, and Hill 16 blue.

**Triangle budget for the area:** stadium ~20.5k plus far LOD ~2.5k (not drawn at the same time), GSWR bridges ~1.2k, canal bridges and lock ~1k, hotels generic ~0.5k. **Total ≈23k drawn**, plus filler housing from the existing generator.

---

## 5. Open questions

1. **Scale.**
   - I recommend plan 0.5 (map-locked), heights 0.85, masts 0.95, with the Hogan rear concourse trimmed ~9 m to clear Jones's Rd.
   - Would you rather inflate the plan (0.55-0.6) for extra presence? That means moving Jones's Rd and St Joseph's Ave outwards and fudging the canal.
2. **Outer-ring compression.** If the northern ring gets extra compression, the stadium anchor (pitch centre) and the stitch nodes should go through the same warp. The stadium itself should keep its own 0.5 plan scale, not the warped one, or the bowl will distort.
3. **The canal under the stand.** Do you want the true arrangement (the canal and railway cutting passing beneath the Canal End), or a simplification with the canal skirting just south of the stand? The true version needs an opening in the stand base and a bridge deck, but it is very recognisable.
4. **Railways.** Should the GSWR and MGWR lines exist at all (embankment, cutting, bridges), or only the road bridges as props?
5. **Far LOD / view distance.** On the lite tier, fog at ~600 m hides the stadium from O'Connell Street (~650 game-m away). Is a far-LOD silhouette exempt from fog or given lighter fog, so the crown can read from the city centre?
6. **Match-day mode.** Is there, or will there be, a match-day toggle (crowd texture, street closures, walking crowds)? It changes whether `crowd` and `access` variants are worth building.
7. **Signage.** No big exterior "CROKE PARK / PÁIRC AN CHRÓCAIGH" wordmark is confirmed in the refs; only the bilingual welcome panel and the stand sign bands are. Is a stylised wordmark on the Canal End or the Jones's Rd side acceptable as creative licence?
8. **Heights.** Only "Cusack 35 m" and "Skyline 44 m" are published. Mast tips (~50 m), roof edge, Hill 16 rear (~12-14 m) and the floodlight mast (~40-45 m) are my estimates. An ortho or photogrammetry source would tighten them.
9. **Nally Terrace side.** Sources say only "alongside Hill 16 at the northern end". I have placed it at the Hogan-side (west) section, next to the screen block; this is not verified.
10. **Seat colour.** Photos from 2014-19 read slate blue-grey (`#5a6980`) and 2005-06 photos read bluer. Pick one; I recommend the grey-blue.

## Sources

- OSM via Overpass (ODbL): `data/osm/croke-park.json`. Key IDs:
  - stadium relation 3235289, site way 564099741, pitch 4541251
  - canal 372341253 (layer -1) and 238961314
  - railways 23013753 (MGWR) and 4541383/48499739 (GSWR at Jones's Rd)
  - Croke Park Hotel relation 1836390, Maldron 1382325167
- [Croke Park, Wikipedia](https://en.wikipedia.org/wiki/Croke_Park): capacity, stands, phases, Cusack 180 m x 35 m, pitch, floodlights 2007, Skyline 44 m
- [Hill 16, Wikipedia](https://en.wikipedia.org/wiki/Hill_16)
- [Archiseek: Gilroy McMahon Architects, Croke Park](https://www.archiseek.com/gilroy-mcmahon-architects-croke-park-stadium-dublin/): leaning frame, tree-like concrete into the roof truss (via search summary; the page returned 429 on direct fetch)
- [Horgan Lynch: Redevelopment of Croke Park](https://www.horganlynch.ie/property/redevelopment-croke-park/): HOK / Gilroy McMahon, civil and structural engineers
- [European Springs: The engineering behind the home of Irish sport](https://www.europeansprings.ie/the-engineering-behind-the-home-of-irish-sport/): Y-shaped supports, pitch rotated 8°
- [JS McCarthy: Roof steelwork, Cusack Stand](https://www.jsmccarthy.ie/projects-completed/roof-steelwork-cusack-stand-croke-park/): trusses, bracing, raking columns, paint system
- [Irish Examiner, 27 May 2025: Croke Park's new €2m floodlights](https://www.irishexaminer.com/sport/gaa/arid-41640256.html): 463 lamps (435 roof, 28 mast behind Hill 16), LED
- [RTÉ: Bridge near Croke Park renamed Bloody Sunday Bridge (20 Nov 2023)](https://www.rte.ie/news/dublin/2023/1120/1417519-bloody-sunday-bridge/) and [Irish Times](https://www.irishtimes.com/ireland/dublin/2023/11/20/bridge-near-croke-park-named-after-the-events-of-bloody-sunday-in-1920/)
- [HoganStand: Hill 16 and Nally End Terrace officially re-opened](https://www.hoganstand.com/article/index/43562); [Irish Examiner on the Nally Stand](https://www.irishexaminer.com/sport-columnists/arid-30934848.html)
- [Doyle Collection: Croke Park Skyline Tour](https://www.doylecollection.com/blog/croke-park-skyline-tour-dublin); [Ireland by Locals: Skyline review](https://www.irelandbylocals.com/dublin-croke-park-skyline-tour/): 0.6 km walkway, 5 platforms
- Wikimedia Commons images as listed in §2

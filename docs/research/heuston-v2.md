# Heuston Station v2 (`heuston-v2`): gap analysis and hero-model brief

This builds on `docs/research/heuston.md` (Phase 1 research) and the Phase 2 build (`tools/blender/build_heuston.py` → `public/models/heuston.glb`, 2.3k tris, 35 KB). The placement, road and Luas-routing work in Phase 1 stands and is not repeated here. This document covers four things:

- what the v1 model actually contains;
- every visible difference from the real building, ranked;
- a much more detailed v2 build brief (head building, forecourt, Luas stop kit, Seán Heuston Bridge);
- 8 new reference images (`refs/heuston/v2-*.jpg`, credits in §12).

Method:
- I read `build_heuston.py`, `kit.py`, `heroes.js` (atlas painting, materials, night hook), `sites.js` and `landmarks.js` line by line.
- I studied `heuston-compare.png` and sampled its pixels.
- I re-measured the elevation from the old and new references, scaling by the 32.4 m frontage and the 3.6 m bay.
- I rotated the OSM building:parts (`data/osm/heuston.json`) into façade-aligned metres.
- Nothing was run: no game, no Chrome, no Blender. Triangle splits for v1 are counted from the script.

Axes follow `kit.py`: **u** runs east (out of the front), **v** runs north along the front, and **z** is up. Metres are **real** unless marked *game*.

---

## 0. Corrections to the Phase 1 research

| Item | Phase 1 said | Actually (evidence) |
|---|---|---|
| Inscription sides | "VIII VIC" north, "AD 1844" south | **VIII VIC is at the south end** (bay 3 counted from the south) and **AD 1844 at the north end** (bay 7). Looking west at the front, left is south (refs 01, v2-02, v2-05). The v1 decal already has the right order. |
| Pediment order | "alternating triangular and segmental" | **Odd bays (1, 3, 5, 7, 9) are segmental, even bays (2, 4, 6, 8) triangular.** The centre bay over the doorcase is segmental (v2-02, ref 07, v2-05). **v1 has it inverted** (`k % 2 == 0` → triangle). |
| Main-block depth | ≈20–22 m (model uses `D = 21`) | **17.7 m.** From the OSM parts `1495289269-72` rotated to the façade: u = −17.7 to 0. |
| Wing set-back | ≈4.5 m | **7.5–7.7 m for the outer wing bays.** The central bellcote bay of each wing is a **breakfront at −5.8 m**, 6.2 m wide (station outline `way 23007779`). |
| Bellcote position and size | wing centre, "≈4–5 m" | Centre at v = ±24.3 m, i.e. 8 m out from the main-block corner (the middle of the wing). **Its front face is flush with the wing breakfront (u −5.8), not set back behind it.** Base 6.0 × 6.3 m, open stage ≈5.2 × 4.4 m, dome ≈2.7 m diameter (OSM parts `1499136254/55/61`, `1499136265/72`). |
| Storeys | "2 storeys plus an attic" | Correct, but the **attic is only a parapet zone. There is no attic storey of windows.** Above the piano-nobile windows come pediments, then **swags between the capitals**, then the entablature. |
| Flanks | not described | **The main block's north and south flanks carry the full order** (4 windowed bays each, columns, pediments, cornice, balustrade returning). The wings only hide their ground floor behind the set-back (refs 05, 08, v2-05, v2-06). |
| Heights | cornice ≈16.5, parapet ≈19 | Re-measured (±0.7 m): **cornice top 17.3, balustrade 18.4, attic panels 18.8–19.3, dies 19.8, piano-nobile sill band 7.9, capital top 15.3; bellcote finial ≈17.3 (level with the main cornice).** See §3. |
| Columns | "Corinthian" | **Unfluted shafts** with visible drum joints. The capitals are Corinthian/composite with **lion masks**. The cornice has **bracket modillions with lion-mask heads** and breaks forward (ressaut) over every column (v2-04). |
| Shed | NIAH blind arcade on the north side | Unchanged. Note that v1 uses the `round` decal (a **glazed** window) for the blind arcade. |
| `refs/heuston/sources.json` | BUILD-REPORT says each area has one | **It does not exist for Heuston.** Credits live only in the .md files. |

---

## 1. What v1 is: modelled geometry vs atlas

`build_heuston.py` builds at real size, then `kit.finish(objs, (0.6, 0.5), 0.85)` scales u by 0.6, v by 0.5 and z by 0.85. The game materials come from `heroes.js stoneMaterials()` by name (`hs_granite` → `granite` tile and so on). The Blender base colours are ignored.

### 1.1 Geometry (approximate tris, counted from the script; AO subdivision adds about 0.4k)

| Part | What is modelled | Tris |
|---|---|---|
| Main block shell | One box, 42.6 × 32.6 m, 16.5 m, no top. Slate **4-sided pyramid** roof 16.5 → 21.0 m (4.5 m tall). | ~12 |
| Cornice | One plain slab 16.5–17.4 m, projecting 0.6 m. No profile, modillions or ressauts. | 10 |
| Columns | 8 × **8-sided prisms** r 0.42, **z 6.0 → 15.4** (no pedestal, no entablature above). The "capital" and "base" are 1.1 × 0.95 m boxes. Two end pilasters as flat boxes. | ~360 |
| Pediments | 9 bays. Triangles are **single flat triangles** 0.2 m proud over 0.2 m sill boxes. "Segmental" ones are **plain boxes** 2.0 × 0.5 m. Order inverted (§0). | ~95 |
| Balustrade | Over the outer **3** bays each side (v ±16.0 → ±5.2). Two rails and **60 square box balusters** 0.14 m at 0.36 m centres (**0.07 m at 0.18 m in game**). No dies. | ~640 (**26% of the model**) |
| Attic | One solid box, 10.4 m wide (≈2.9 bays), 17.4 → **21.4 m** (2.4 m above the balustrade). | 10 |
| Flagpoles | 3 boxes at v = −4, 0, +4, from 21.4 to 27 m. | 30 |
| Wings | Two boxes 16.2 wide × 7 m, set back 4.5 m, with a coping slab. No breakfront, door surround or balustrade. | ~40 |
| Bellcotes | Base box 3.8 m square. **Four 0.8 m square posts** (no arches). Entablature box. 4 flat triangle "pediments". 16-sided drum. **16-sided cone "dome"** (1.8 m tall on r 1.7, a spike). 8-sided finial. | ~270 |
| North return | Box 18 × 14 m, 10 m tall, pyramid slate roof. No chimneys. | ~12 |
| South range | Box 60 × 7 m, 6.5 m. 12 chimney boxes. | ~130 |
| Train shed | Brick box 168 × 47 m, 8 m. Three `gable_x` piles to 13.5 m. Glass boxes on the ridges. West gable ends. | ~55 |

### 1.2 Atlas and tiles (the "detail is texture" part)

Decals come from the **shared** 1024 stone atlas (`heroes.js paintDecals`, regions in `kit.DECAL`):

| Region | Used for | What it paints |
|---|---|---|
| `arcade` 256² | 9 ground bays (full bay × 0–6 m), wing centre bays, 12 south-range bays | Grey fill, faint 3 px horizontal lines (the "rustication"), one dark round-headed opening with one white glazing bar |
| `sash` 128 × 192 | 9 first-floor windows (8.0–12.2 m), **9 "attic-storey" windows (13.8–15.8 m, not real)**, 4 wing windows | A **square-headed** white frame with 2 dark panes |
| `attic` 512 × 128 | Attic front | Grey panel, "VIII VIC" and "A.D. 1844" side by side in the middle, two grey ellipses at the ends |
| `round` 128 × 256 | Shed blind arcade (40 decals) | A dressed round-headed **glazed** window |

- Tiles: `granite` (256 px, 7 courses per 4 m tile, `#a8a59d`), `slate`, `brick` (16 courses per 4 m, so 0.25 m courses), `roof` and `glass` (flat colours).
- UVs are computed **before** the 0.5/0.85 scale, so every course and block is squashed horizontally too.

**Nothing in the atlas represents:**
- swags
- capitals
- modillions or lion masks
- paterae
- balconettes
- voussoirs and keystones
- the central doorcase
- the cartouches of arms (they are grey ellipses)
- bellcote oculi
- Flemish bond

### 1.3 Night

`setStoneNight` raises the decal material's emissive (`0xffc27a × decal map × 0.9·level`). Because the emissive map *is* the colour map, the result is inverted:
- **white sash frames glow and the dark glass stays dark**;
- **the grey attic panel and the grey arcade stone glow orange like lamps**;
- the granite itself is never lit.

The real building is **floodlit**: uplighters wash the window architraves, pediments and the cornice soffit (warm white, or green / pink / tricolour on occasions), and the ground-floor arches glow from the shops inside (refs 03, v2-08).

### 1.4 Proportion and scale

The front is 32.6 × 0.5 = **16.3 m wide** and 19 × 0.85 = **16.2 m to the balustrade** (18.2 m to the attic), so its aspect is 1.0.

The real front is **1.68 wide for 1 high** (32.4 m to the attic top at 19.3 m). The horizontal/vertical distortion is 0.85/0.5 = **1.7×**, which causes:
- round arches become tall ellipses;
- 0.84 m columns become 0.42 m sticks;
- the bellcote becomes a 1.9 m-wide pinnacle;
- windows become 4.5:1 slots (real 2:1).

This single decision drives most of the "office block" read.

### 1.5 What the compare sheet shows (`heuston-compare.png`)

Measured mean colour of the upper façade:

| Crop | Mean sRGB |
|---|---|
| Ref 01, overcast | **(128,128,125)** |
| Ref 03, dusk | **(80,84,90)** |
| Game, all three panels | **(41,43,45) to (44,46,47)** |

The game façade is **about 3× too dark**, darker than the neighbouring filler blocks in the same light. The most likely causes, to check:
1. **Coarse vertex AO.** `bake_ao_vertex` cuts edges over 3 m only once, so a 32 m wall has a handful of vertices. The ground-contact and cornice-overhang darkness is interpolated across the whole face.
2. The 0.35-alpha darker course fills in the `granite` tile.
3. The dark decal glass covering roughly 35% of the front.
4. The east face being in shadow in the capture.

Other points visible in the sheet:
- the building reads as a dark 4-storey office block with slit windows and a rooftop penthouse (the attic);
- the bellcotes read as thin spires;
- the flank seen from the junction is a blank slab;
- the forecourt is empty paving with a bare kerb slab: no lawn, hedges, trees, shelters, canopies or OCS poles.

(The HUD label reads "O'Connell Street" in all three game panels. That is not a model issue, but worth checking.)

---

## 2. Gap list, ranked

Views:
- **J** = driver at the Frank Sherwin / Victoria Quay junction (VQ2). The front is ~37 game m away and seen ~17° off-axis from the north-east, so the north flank shows.
- **R** = across the river from Wolfe Tone Quay / Parkgate St, 70–100 game m. Silhouette dominates.

Rank = harm to recognisability.

| # | Gap | v1 | Reality | Hurts | Fix (§) |
|---|---|---|---|---|---|
| 1 | **Proportion / scale distortion** | 16.3 w × 18.2 h, aspect 1.0; distortion 1.7× | Palazzo 32.4 × 19.3, aspect 1.68 | J R: the whole read ("tower", not "palazzo") | 4 |
| 2 | **Fake attic storey + slit square windows** | Two tiers of square sashes (8–12.2 and 13.8–15.8 m) | One tier of tall **round-headed** sashes (sill 8.3, head 11.5), with pediments, then swags | J: turns it into an office block | 5.2 |
| 3 | **Façade far too dark / flat** | Mean (42,44,46) | ≈(128,128,125) overcast; warm cream in sun (ref 08) | J R | 6, 7, 5.9 |
| 4 | **Bellcotes: spike dome, no arches, too small** | 1.9 m game base, square posts, 16-sided **cone** | Chunky 6 m base with balustrade; **round-arched openings** with paired corner columns; pediment each face; **hemispherical ribbed dome with 4 oculi**; ball finial level with the main cornice | R J: the #1 silhouette cue | 5.5 |
| 5 | **Roofline: attic, balustrade, dies, chimneys** | Attic 10.4 m wide, 2.4 m proud (a penthouse); 3\|3\|3 split; box balusters shimmer; no dies; no chimneys; 4.5 m pyramid roof shows | **2\|5\|2 split**: balustrade over bays 1–2 and 8–9, solid attic over bays 3–7 only ~0.5–1 m above the balustrade; dies with carved panels over every column; 2 tall stacks behind the parapet at v ≈ ±10.8; roof hidden | R J | 5.4 |
| 6 | **Entablature and cornice** | Plain 0.9 m slab, 0.6 m projection, columns run into it | Architrave + frieze (1.1 m) + modillion cornice (0.9 m, projecting ~1.0 m), **breaking forward over each column**, lion masks | J (the strongest horizontal shadow line), R | 5.3 |
| 7 | **Forecourt empty** (trees, lawn, hedges, shelters, OCS) | Bare paving | Birches against the front; a row of 5 trees and a lawn with a clipped hedge and round mounds east of the stop; glass canopy run on the west platform; poles and wires | J: in ref 03 the trees and hedge frame the lower half | 9, 10 |
| 8 | **Columns: no pedestals, too tall, box capitals, no swags** | 8-sided sticks 6.0 → 16.0 m | Unfluted 0.95 m shafts 8.0 → 14.6, Corinthian capital to 15.3, **on pedestals** on a heavy balcony cornice; **fruit swags between capitals** | J | 5.2 |
| 9 | **Flanks blank** | Plain granite side faces | Full order on 4 bays each side above the wing roof | J (north flank faces the junction), R | 5.6 |
| 10 | **Ground floor: no depth, no balcony band** | One flat 6 m decal per bay; faint lines | Deep channelled rustication; **9 real arches** (glazed entrances, arched sash windows at the ends, a **pedimented doorcase** in bay 5); voussoirs and keystones; paterae frieze; heavy modillioned **balcony cornice 6.9–7.7 m** carrying balconettes | J (lower half, when not hidden by buses and trees) | 5.1 |
| 11 | **Window pediments inverted and flat** | Flat triangles / boxes, triangles on odd bays | Segmental on odd bays, triangular on even; raking cornice mouldings on consoles, 0.3 m projection | J | 5.2 |
| 12 | **Wings** | Plain 7 m boxes, 4.5 m set-back, 5 m arch decal in the middle | 7.5 m set-back with a **6.2 m breakfront** at −5.8: Tuscan columns, **pedimented door** (dark red-brown), balustrade under the bellcote; round-headed windows in the outer bays | J R | 5.5 |
| 13 | **Night: wrong things glow** | Frames and stone panels glow orange | Floodlit reveals and cornice soffit; lit ground-floor shops | J at night | 8 |
| 14 | **Luas stop kit** | Generic 26 m × 2.4 m platforms (shorter than the 35 m tram), tiny shelter | 3 platform strips, long canopy run, ticket machines, nameplates, OCS poles and span wires, low granite wall | J | 10 (P1) |
| 15 | **Seán Heuston Bridge** | Generic white extruded arch, box parapets | White cast-iron segmental arch, **dark rib with openwork band**, framed **crown-and-scroll spandrel panels**, openwork ring parapet between cream dies, "1821" plate, granite abutments with lamps | R (it is in the foreground of every river view) | 11 (P2) |
| 16 | **North return** | 10 m box, no chimneys | Two storeys (~11 m) with hipped slate and **2–3 massive stacks with pots** | R J | 5.7 |
| 17 | **South range** | Flat arcade decals on a box | Deep **Tuscan loggia** (freestanding columns, ref 09), taller stepped pavilion with a lunette window, blocking course and chimneys | SJRW drive-by | 5.7 |
| 18 | **Flagpoles** | ±4 m apart, standing on the attic | ±7.6 m apart, standing on the roof behind the attic, tops ~25 m | R | 5.4 |
| 19 | **Attic content** | Two ellipses at the ends, both texts together in the middle | VIII VIC (bay 3), three arms cartouches (bays 4–6), AD 1844 (bay 7), each panel between dies; segmental hoods over the two inscriptions | J (close) | 5.4, 6 |
| 20 | **Shed** | Glazed "round" decals on brick, ~0.25 m brick courses, flat glass boxes | Blind brick arcade in Flemish bond; raised glazed ridge lanterns | R (the north wall faces the river) | 5.8 |
| 21 | **Depth** | 21 m | 17.7 m | minor | 3 |

**The top eight to fix first** (they account for nearly all the "doesn't look like Heuston"): 1, 2, 3, 4, 5, 6, 7, 8.

---

## 3. Measurements (real) and v2 game values

**How the heights were measured:**
- Bay-width scaling on v2-02 (straight-on; bay = 3.6 m).
- Cross-checked on ref 01. Its ground line sits behind the platform at ≈y 696 of 960, at 24.85 px/m.
- Also checked against refs 03 and 04 for the bellcote.

**Plan dimensions** come from OSM parts rotated to the façade (bearing 82°).

**Game scale (§4):** u × 0.6, v × 0.64, z × 0.75 for the main block, bellcotes and returns.

| Element | Real (m) | v2 game (m) | v1 game (m) |
|---|---|---|---|
| Main block width (v) | 32.4 (9 bays at 3.6) | 20.7 | 16.3 |
| Main block depth (u) | 17.7 | 10.6 | 12.6 |
| Plinth | 0–0.45, projecting 0.12 | 0–0.34 | – |
| Arch opening (bays 2–4, 6–8) | 2.5 wide, springing 3.9, crown 5.15 (semicircular) | 1.6 w, crown 3.86 | decal |
| Voussoir ring top / keystone | 5.6 / keystone 0.55 tall, projecting 0.12 | 4.2 | – |
| Rusticated pier between arches | 1.1 wide; channels 0.55 m courses | 0.70 | – |
| Frieze band with paterae (0.45 dia) | 5.9–6.6 | 4.4–5.0 | – |
| Balcony cornice (block modillions below) | 6.9–7.7, projecting 0.45 | 5.2–5.8 | – |
| Pedestals under columns | 7.7–8.0 (plus balconette posts to 8.6 with ball finials) | 5.8–6.0 | – |
| Column base / shaft / capital | 8.0–8.3 / 8.3–14.6 (dia 0.95 → 0.82) / 14.6–15.3 (abacus 1.2 square) | 6.0 / 11.0 / 11.5 | 6.0–15.4, capital 15.4–16.0 (then ×0.85) |
| Column projection | Centre 0.30 in front of the wall (three-quarter engaged) | 0.18 | 0.25 |
| Window (piano nobile) | 1.6 w × 3.2 h, sill 8.3, head 11.5; architrave 0.2 with keystone | 1.02 × 2.4 | 0.8 × 3.6 (×2 tiers) |
| Pediment | 2.4 w, 11.9–12.8 (triangle apex) / 12.6 (segmental), projecting 0.30, on consoles | 1.54 w, 8.9–9.6 | 1.05 w, flat |
| Swag | ~2.0 w, 0.55 drop, hanging 13.7–14.3 between capitals | 1.3 w | – |
| Architrave + frieze | 15.3–16.4 | 11.5–12.3 | – |
| Cornice | 16.4–17.3, projecting 1.0; modillions 0.22 w at 0.62 centres; ressaut +0.35 over each column | 12.3–13.0 | 14.0–14.8 |
| Balustrade (bays 1–2, 8–9) | Plinth 17.3–17.55, balusters 0.75, rail to 18.4; baluster pitch 0.33 | 13.0–13.8 | 14.8–16.2 |
| Dies (over the 10 supports) | 1.2 w, to 19.8 incl. cap | 0.77 w, 14.85 | – |
| Attic (bays 3–7) | 17.3–18.8, inscription panel hoods to 19.3 | 13.0–14.5 | 14.8–18.2 |
| Chimney stacks (front pair) | v ±10.8, u −6, 1.2 × 2.6, top 21 + pots 0.6 | – | none |
| Flagpoles | v 0, ±7.6, u ≈ −3, top ≈25 | 18.8 | 23 |
| Wings: outer bays | Front at u −7.6, height 7.8 (cornice) + 0.9 parapet | u −4.6, 5.9 | u −2.7, 6.0 |
| Wing breakfront (under the bellcote) | u −5.8, 6.2 wide | u −3.5, 4.0 | – |
| Bellcote base (with balustrade) | 6.0 × 6.3, top 9.3; balustrade 8.2–9.0 on its front | 3.8 × 3.9 | 1.9 × 2.3 |
| Bellcote open stage | 5.2 × 4.4, 9.3–13.5; arch 1.4 w, crown 12.8; paired corner columns 0.5 dia | 3.3 w, 7.0–10.1 | – |
| Bellcote entablature / pediments | 13.5–14.1 / apex 14.9 | 10.1–11.2 | – |
| Bellcote drum (oculi) + dome | Drum 14.1–15.3; dome r 1.35, 15.3–16.6; finial ball to 17.3 | top 13.0 | 13.0 (cone) |
| North return | 2 storeys, ~11.0 to eaves; hip to 13.5; stacks to 15.5 | 8.3 / 11.6 | 8.5 |
| South range | Loggia 6.5 plus blocking to 7.3; pavilion 9.5 | – | 5.5 |

Figures marked ±: all heights ±0.7 m. There is still no surveyed elevation (Phase 1 open question 2).

---

## 4. Scale strategy (fixes gap 1)

- **Constraint:** N–S the whole front must stay ≈32.5 game m. It sits between the game's straight south bank and St John's Road West (`sites.js`: `w: 32.5`, north end ≈1 m inside the bank; the footprint test depends on it).
- **v1 approach:** it met this with a 0.5 plan scale and kept height at 0.85. That is the distortion.
- **v2 approach:**
  - **Near-uniform scale on the main block and bellcotes: u 0.6, v 0.64, z 0.75.**
    - Distortion drops to 1.17×. Arches stay round, columns stay round, the bellcote stays chunky.
    - Front aspect becomes 20.7 / 14.5 = **1.43** (real 1.68, v1 1.0).
  - **Make the wings fit by cutting bays, not by squashing.** Each wing keeps its **breakfront (door and bellcote, 6.2 m) plus one outer window bay (3.0 m)**, so 9.2 m real becomes 5.9 game. The total is 20.7 + 2 × 5.9 = 32.5.
  - The north return and south range start behind the wings as now.
- **Height trade-off:** v2 is ~3.7 m lower at the attic than v1 (14.5 vs 18.2 game) but 27% wider. If it then feels too small in the driver's frame:
  - z can go to 0.8 (attic 15.4, aspect 1.34);
  - going beyond 0.8 brings back the tower read.
  - Neighbouring filler is not a reason to keep it tall; the real station is lower than Heuston South Quarter too.
- **Implementation:** apply the scale **inside the Part helpers** (or scale the vertices before computing world UVs), so the tiles stay in true metres and courses are not squashed. v1 computes UVs pre-scale.

---

## 5. v2 build brief: head building (`build_heuston.py`)

**Budget: ~13.5k tris, ceiling 16k**, ~7 draw calls:
- `granite`
- `hs_rustic`
- `slate`
- `brick`
- `roof`
- `glass`
- `hs_atlas` (alpha-tested)

Expected GLB about 150–200 KB with Draco (v1 is 35 KB). Build at real metres with the §4 scale. Keep the node name `station` (`sites.js parts.station`).

| Part | Tris | Notes |
|---|---|---|
| Ground floor, front (9 bays) | 800 | Real arches and doorcase |
| Balcony band, frieze, pedestals, balconettes | 450 | |
| Columns (8) + corner pilasters (2) | 1,300 | |
| Windows + pediments (9) | 1,000 | |
| Swags (8) | 100 | |
| Entablature with ressauts + modillions | 950 | |
| Parapet: dies, balustrade cards, attic, cartouches | 600 | |
| Flanks (2 × 4 bays) | 1,400 | Simplified order |
| Roof, chimneys (4), flagpoles (3) | 350 | |
| Wings × 2 | 700 | |
| Bellcotes × 2 | 2,000 | |
| North return | 300 | |
| South range (loggia + pavilion) | 1,200 | |
| Train shed | 1,300 | |
| AO tessellation overhead | ~1,000 | |
| **Total** | **~13.5k** | |

### 5.1 Ground floor (east front)

- **Wall:** a separate material `hs_rustic` (world-UV tile, §6) on the ground-floor faces, 0–5.9 m.
- **Piers:** the 10 piers under the supports project 0.12 m as breakfronts (real geometry) so the channels catch the light at the edges.
- **Arches:** 7 real openings (bays 2–4, 6–8, plus 1 and 9 as windows), built with `arch_wall` (§6.1):
  - round head of 8 segments; reveal depth 0.6 m (0.36 game) with a soffit;
  - back plane carries an atlas infill: `hs_doorglaz` for bays 2–4 and 6–8 (modern glazed doors with transom, interior lit at night), `hs_archwin` for bays 1 and 9 (white sash with fanlight).
- **Keystones:** a real box keystone (0.55 × 0.45 × 0.12) on each arch. The voussoir fan is painted into the `hs_rustic` overlay decal `hs_vous` (alpha ring).
- **Bay 5 doorcase:**
  - flat-headed opening 1.6 × 3.2, reveal 0.4;
  - aedicule of two pilaster strips with **consoles**;
  - **segmental pediment** 2.6 wide, top 5.3 m (6-segment arc extruded 0.25);
  - ~80 tris.
- **Frieze band:** 5.9–6.6 m, flat, with `hs_patera` roundel decals over each pier.
- **Balcony cornice:**
  - extruded 4-step profile, 6.9–7.7 m, projecting 0.45;
  - the underside carries **block modillions** as real geometry: 18 blocks, 2 per pier, 0.35 × 0.3 × 0.3 (v2-04 shows them big).

### 5.2 Piano nobile

- **Pedestals:** 10 boxes 1.2 × 0.5 × 0.6 (7.7–8.0) under the supports.
- **Balconettes:** between each pair of pedestals, two stubby posts with **ball finials** (4-sided post + 6-sided ball) and an **alpha card** `hs_balcon` (scrolled wrought iron, near black).
- **Columns (×8):** `lathe` (§6.1) with an 8-segment arc of 270° (three-quarter engaged; the back hidden in the wall):
  - base: 2 rings (torus approximation), 8.0–8.3;
  - shaft: 12 sides, 3 rings for entasis, dia 0.95 → 0.82, 8.3–14.6;
  - **capital: a flared bell** (dia 0.82 → 1.15, 14.6–15.2) wrapped with `hs_capital` (acanthus + lion mask, cylindrical UV), then an **abacus** box 1.2 × 1.2 × 0.12 with bevelled corners.
  - about 130 tris each.
- **Corner pilasters:** square, 1.0 m, with a simplified capital box plus a `hs_capital` flat decal. The corner reads as pilaster + column (v2-05).
- **Windows (×9):**
  - `arch_wall` recess 0.25 deep (6-segment head);
  - a raised **architrave strip** 0.2 wide, 0.06 proud, with ears at the springing;
  - a keystone;
  - glass/sash on the back plane: `hs_win` (arched top sash with radial bars, 6-pane lower sash, white frames).
- **Pediments (odd bays segmental, even bays triangular):**
  - triangular: extruded triangle with a 2-step raking cornice (projection 0.30, 0.12) plus a horizontal cornice, ~30 tris;
  - segmental: 6-segment arc extruded with the same profile, ~40 tris;
  - two consoles (0.2 × 0.3 × 0.5 boxes) under each.
- **Swags (×8):** a bent strip of 6 quads (catenary, 2.0 wide, 0.55 drop, 0.1 proud, slightly convex), carrying `hs_swag` (fruit and ribbon, alpha), at 13.7–14.3 between the capitals. Real geometry is cheap here and gives a shadow; a decal alone is invisible at 37 m.

### 5.3 Entablature and cornice

- **Build it as `extrude_profile` along a path with ressauts.** The path steps out 0.35 m for each of the 10 supports, 1.2 m wide, and runs round both flank corners to the rear.
- **Profile, bottom to top:**
  - architrave: 3 fasciae, 15.3–15.75;
  - frieze: flat, 15.75–16.4;
  - bed mould;
  - **modillion zone** 16.4–16.75 (soffit projection 1.0);
  - corona 16.75–17.05;
  - cyma to 17.3.
  - About 7 profile segments.
- **Modillions (front only):** 52 real brackets, 0.22 wide × 0.35 × 0.6 deep, at 0.62 centres (8 tris each, 3 visible faces + bottom). On the flanks, paint `hs_modsoffit` on the soffit instead.
- **Lion masks:** one `hs_lion` decal on the cyma of each ressaut (10).

### 5.4 Parapet, attic, roofline

- **Plinth course:** 17.3–17.55, full perimeter.
- **Dies:** 10 on the front plus 3 on each flank, 1.2 × 0.9, to 19.4, each with a cap box to 19.8. Carved panels are painted as `hs_diepanel` on the attic dies only.
- **Balustrade (bays 1–2, 8–9; flanks bays 1–2):**
  - bottom rail and top rail as boxes;
  - balusters as a **double-sided alpha card** `hs_balus` (vase balusters at 0.33 pitch, alphaTest). A 2.1 m run is one quad per side.
  - This replaces v1's 640 tris of aliasing boxes with ~40 tris.
  - Optional on the east front only: real 8-sided lathe balusters at 16 tris (~70 × 16 = 1.1k). **Don't**, unless the alpha card fails the compare.
- **Attic (bays 3–7):**
  - solid granite, 17.55–18.8;
  - 5 panels recessed 0.12 between the dies;
  - bay 3 `hs_vic` "VIII VIC" and bay 7 `hs_ad` "AD 1844" (serif caps, dark-grey incised), each under a **segmental hood** (6-segment arc, 0.2 proud) rising to 19.3;
  - bays 4–6 carry a **raised oval cartouche** (8-sided disc, 1.3 × 1.0, 0.15 proud) with `hs_arms` on its face (a crowned shield in scrolls; do not attempt the real heraldry, see §13).
- **Roof:** a **hipped slate roof, 2.5 m high** (17.3 → 19.8), set 1.5 m inside the parapet so that it barely shows over the dies. **Remove the 4.5 m pyramid.**
- **Chimneys:**
  - two front stacks at v ±10.8, u −6 (1.2 × 2.6, to 21.0) with a cornice cap and 3 pots each (6-sided, 0.3 dia × 0.6, buff);
  - two rear stacks at v ±12, u −15;
  - ~60 tris each.
- **Flagpoles:** 3 at v 0 and ±7.6, u −3, from the roof (17.5) to 25.0. 6-sided, tapered, 0.12 → 0.07, with a ball finial. White.

### 5.5 Wings and bellcotes

- **Wing outer bay** (1 each side, 3.0 real):
  - front at u −7.6, 0–7.8 plus a parapet to 8.7 (solid, with a short `hs_balus` run);
  - one `arch_wall` round-headed window (1.3 × 2.8, sill 1.4) with an architrave;
  - an end pilaster;
  - `hs_rustic` below sill level, `granite` above.
- **Wing breakfront** (6.2 wide, u −5.8):
  - two **Tuscan columns** (10-sided lathe, dia 0.75, 0–6.6, plain capital);
  - a central door: panelled timber `hs_door` (`#5b2b20`), 1.5 × 3.0, in an aedicule with scroll **consoles** and a **segmental pediment** (v2-07, ref 06);
  - entablature at 6.6–7.8 as a profile;
  - above it the bellcote base.
- **Bellcote (×2), about 1,000 tris each:**
  1. **Base:** box 6.0 × 6.3, 7.8–9.3, with a cornice profile. A `hs_balus` card balustrade (8.2–9.0) runs across its front and sides between corner blocks (refs 01, 06, v2-07).
  2. **Open stage:** 9.3–13.5.
     - Four faces, each an `arch_wall` panel 5.2 (front/back) or 4.4 (sides) wide and 0.5 thick, with a **real round-headed opening** 1.4 w, springing 11.9, crown 12.8, **visible sky through it** (the key cue in every photo).
     - Reveal soffits as real geometry.
     - At each corner, a **pair of three-quarter columns** (8-sided, dia 0.5) with simple capitals.
  3. **Entablature:** 13.5–14.1, profile round all four sides with corner ressauts.
  4. **Pediments:** 4 triangular, apex 14.9, extruded 0.35 with a raking cornice.
  5. **Drum/attic:** 14.1–15.3, square with chamfered corners and 4 corner **scroll consoles** (curved 4-quad strips). Four **oculi**: 6-sided short tubes 0.5 dia, 0.2 proud, dark inside (`hs_oculus`).
  6. **Dome:** 16 sides × 5 rings, **hemispherical, slightly raised** (r 1.35, 15.3–16.6), with 8 ribs painted in the granite tile.
  7. **Finial:** a small drum 0.4 dia × 0.3 + ball 0.35 + spike, to 17.3.
  - No copper anywhere. Everything is `granite`.

### 5.6 Flanks (north and south faces of the main block)

- Same order as the front, **4 bays of 4.4 m**.
- Above the wing roof (7.8 m) the whole piano nobile, entablature and parapet are visible, so those zones need real geometry:
  - columns simplified to 8-sided lathe (60 tris);
  - pediments;
  - windows as shallow recesses with `hs_win`.
- The ground floor only shows in the first 7.6 m (u 0 → −7.6, before the wing). Give it 2 arch bays: `hs_archwin` in bay 1 and a blind arch in bay 2 (v2-05).
- The rear (west) face abuts the shed: leave it plain.

### 5.7 North return and south range

- **North return:**
  - behind the north wing, 2 storeys, 11.0 m to the eaves, hipped slate to 13.5;
  - sash decals in 2 rows (the square-headed `sash` region is correct here);
  - a cornice profile;
  - **2–3 tall stacks with pots** to 15.5 (ref 05, v2-06).
- **South range along SJRW:**
  - a real **loggia**: 12 freestanding Tuscan columns (10-sided, dia 0.7, 0–4.8) in front of a back wall set 3.0 m in, spanned by round arches (an `arch_wall` front skin with 12 openings);
  - a flat entablature;
  - a blocking course at 6.5–7.3;
  - chimney blocks as in v1 (ref 09);
  - the back wall carries `hs_loggia` (arched window, radial fanlight, iron grille);
  - one **taller pavilion** (9.5 m) with a lunette window where the range steps (refs 08, v2-05).

### 5.8 Train shed

- Keep 3 piles and the v1 length.
- **Brick:** Flemish-bond `brick` tile at true course size (75 mm).
- **Blind arcade:** a new `hs_blind` decal (recessed brick arch, no glass) on the **north wall facing the river**, 0.15 m recessed panels as geometry every 8.2 m if the budget allows.
- **Roofs:** the glazed ridge strips become **raised lanterns** (box with sloped glass sides, 1.2 m high) instead of flat boxes.
- **Gables:** add granite coping on the gable ends.

### 5.9 Material and AO fixes (gap 3)

- **Tessellation:** planar faces over 1.5 m get a regular grid before the AO bake (vertex AO needs vertices).
- **AO levels:** clamp the baked AO so that open wall stays ≥ 0.85 and only real re-entrant corners go below 0.6.
- **Occluders:** exclude alpha cards (balustrades, balconettes, swags) from the bake as occluders, as the decals are now.
- **Brightness check:** re-sample the compare crop. The target mean for the upper façade, in the same overcast preset, is **≈ (115–130)**.

---

## 6. Pipeline additions (describe only; do not edit here)

### 6.1 `kit.py` helpers needed

- **`Part.lathe(cx, cy, profile=[(r, z), ...], sides, arc=(a0, a1), axis_rot=0)`** for columns (270° arcs), balusters, domes, finials, pots and flagpoles. Cylindrical UVs, so `hs_capital` wraps.
- **`Part.extrude_profile(path=[(u, v), ...], profile=[(out, z), ...], closed=False)`** for cornices, string courses and plinths, with mitred corners at ressauts.
- **`Part.arch_wall(axis, c, facing, u0, u1, z0, z1, opening=(uc, w, spring, segs), depth, back_region=None)`**: a wall panel with a round-headed (or flat) opening. It builds the frame faces around the opening, the reveal and soffit quads, and optionally a back-plane decal quad (or leaves it open for the bellcotes).
- **`Part.pediment(kind='tri'|'seg', u0, u1, z, h, proj, profile)`**.
- **Scale inside `Part.face`:** apply (SU, SV, SZ) before computing world UVs, so tiles stay in metres. Drop the post-hoc `finish()` scaling, or keep it only for placement.
- **`DECAL_HS` dict and `hs_atlas`:** a separate 2048 × 1024 atlas, with its own dict mirrored in `heroes.js` (as the Ha'penny does). It needs its own emissive canvas `hs_emit` in the same layout (glass and lit areas only).
- **Flood mask in `COLOR_0.a`:**
  - AO stays in RGB;
  - the exporter already writes COLOR_0 (`export_vertex_color='ACTIVE'`). **Verify it keeps alpha.**
  - `heroes.js prepare()` must decode RGB only and pass alpha through.

### 6.2 `heroes.js` changes needed

- `paintHeuston(g, N)` for the new atlas and `hs_emit`.
- A `hs_rustic` tile: channelled ashlar with deep horizontal V-channels.
- A Flemish-bond brick tile.
- A night hook `setHeustonNight(level, tint)`.

---

## 7. Atlas `hs_atlas` (2048 × 1024) and tiles

Painted at load like the others (canvas; no image files). Regions, px:

| Region | Size | Paint notes (refs) |
|---|---|---|
| `hs_win` | 192 × 384 | Round-headed sash: white frames `#eceae3`. Arched top sash with 3 radial bars (sunburst), lower sash 2 × 3 panes, dark glass `#1f272d` with faint sky reflection gradient. Moulded reveal border (v2-04, v2-03) |
| `hs_archwin` | 256 × 384 | Arched white sash with a fanlight, in a reveal (ref 07 end bays, v2-02 bay 1) |
| `hs_doorglaz` | 256 × 384 | Modern glazed entrance: aluminium transom at 60%, glass doors, dim interior with signage-blue and warm spots (v2-03, v2-08) |
| `hs_door` | 128 × 256 | Panelled timber door `#5b2b20`, 6 panels, plain fanlight (v2-07) |
| `hs_vous` | 256 × 192 | Alpha ring of 11 radiating voussoirs with V-joints around a semicircle; keystone left blank (geometry) |
| `hs_capital` | 256 × 128 | Two tiers of acanthus leaves, volutes, lion mask centre, on transparent/stone. Wraps 270° (v2-04) |
| `hs_swag` | 256 × 96 | Fruit and leaf festoon with ribbon ends, alpha, stone colour with dark crevices (v2-02, ref 07) |
| `hs_modsoffit` | 512 × 64 | Modillion brackets with coffers between, for flank soffits |
| `hs_lion` | 64 × 64 | Lion mask |
| `hs_patera` | 64 × 64 | Rosette roundel |
| `hs_balcon` | 128 × 64 | Wrought-iron scroll balconette, `#1b1c1e`, alpha |
| `hs_balus` | 512 × 96 | 8 vase balusters per repeat, with shading, alpha |
| `hs_vic` / `hs_ad` | 256 × 128 each | Recessed panel, incised serif "VIII.VIC" / "AD.1844" (the dot is on the stone) |
| `hs_arms` | 128 × 128 | Crowned shield in scrolled cartouche, relief-shaded |
| `hs_diepanel` | 64 × 128 | Carved vertical panel (trophy) for the attic dies |
| `hs_oculus` | 64 × 64 | Dark round with moulded ring |
| `hs_wingwin` | 128 × 256 | Round-headed sash with architrave (wings, flanks' ground floor) |
| `hs_loggia` | 192 × 320 | Arched window with radial fanlight and iron grille (ref 09) |
| `hs_blind` | 128 × 256 | Blind brick arch in Flemish bond with a granite impost |
| `hs_1821` | 128 × 64 | Cast plate "1821" (the bridge; shares the atlas, §11) |
| `hs_spandrel` | 512 × 160 | Bridge spandrel panel: crown in a roundel, scrolls and anthemion, dark on off-white (§11) |
| `hs_ring` | 256 × 96 | Bridge parapet: interlocking rings and quatrefoils, alpha (ref 13) |

**Tiles (world UV, true metres):**
- `granite`: keep, but lighten and de-noise it (§8). Ashlar courses 0.45 m, blocks 0.9–1.4 m, very fine joints.
- `hs_rustic`: 512 × 256 over 3.3 × 1.65 m; courses 0.55 m with **dark 25 mm horizontal channels** and faint verticals.
- `brick`: Flemish bond, 75 mm courses.
- `slate`, `roof` (corrugated): keep.

---

## 8. Palette (sRGB albedo targets)

| Surface | Hex | Note |
|---|---|---|
| Granite ashlar | `#aca89e` | Tile base. Course variation ±4% lightness only (v1's 35%-alpha dark fills halve the brightness) |
| Granite in sun (look check) | `#c9bfa8` | Ref 08, v2-05: warm cream |
| Rustication channels | `#5f5e59` | |
| Cornice soffit / modillion shade | via AO | No darker albedo |
| Sash frames | `#eceae3` | |
| Glass (day) | `#1f272d` | |
| Entrance glazing | `#2e3b43` | Lit interior at night `#fff1d6` |
| Wing doors | `#5b2b20` | |
| Balconettes / iron | `#1b1c1e` | |
| Slate | `#4a4f55` | |
| Chimney pots | `#a07a5c` | Buff / terracotta |
| Flagpoles | `#e8e8e6` | |
| Shed brick | `#8a4a36` | Mortar `#b8b0a0` |
| Corrugated roof | `#6e7378` | Glazing `#9fb3bd` |
| Bellcote dome | = granite | Not copper |
| Birch bark / foliage | `#e6e2d8` / `#7f9a4a` | Forecourt |
| Lawn / hedge | `#5f7f3a` / `#3f5a2c` | |
| Luas steel (poles, shelters) | `#8c9196` / `#5d6166` | |
| Platform paving | `#b9b7b0` | Tactile strip `#d4c070` |
| Bridge iron white / rib dark / granite | `#dcdcd6` / `#1f2530` / `#9e9c94` | |
| Bridge parapet iron | `#2a2620` | Gilt accents `#9a7a3a` |

---

## 9. Night floodlighting

**What the references show** (refs 03, v2-08; Commons "Heuston Station Tricolour 1916 Tribute.jpg" and "Entrance of Heuston Stn"):
- Uplighters on the balcony band wash **each window's architrave, reveal and pediment**.
- A continuous wash lights the **cornice soffit and modillions**.
- Columns catch light only at the base and shaft edges.
- Attic, balustrade and bellcotes stay dark-ish against the sky.
- Ground-floor arches glow **cool white from the shops**.
- **Colour:**
  - default warm white;
  - green for St Patrick's Day (ref 03);
  - pink/red for events (v2-08);
  - tricolour for commemorations.

**Implementation, emissive only (no extra lights):**
1. **Flood mask:** in Blender, write a per-vertex flood value into `COLOR_0.a`:
   - 1.0 on window reveals, architraves and pediment faces;
   - 0.8 on the cornice soffit;
   - 0.5 on the lower column shafts, fading to 0 by the capitals;
   - 0.15 on open wall between 8 and 12 m;
   - 0 elsewhere.
2. **Shader:** in `heroes.js`, the `granite` material for Heuston gets `onBeforeCompile`:
   - `emissive += floodTint * vColor.a * nightLevel * 0.55`;
   - `floodTint` uniform, default `#ffe2b8`;
   - optionally switched to `#3cff6a` on 17 March, as a small date check.
3. **`hs_emit` canvas (the emissive map for the atlas):**
   - glass areas only, so sash frames no longer glow;
   - `hs_doorglaz` and `hs_archwin` bright (interior);
   - `hs_win` glass dim warm (0.3);
   - stone panels (attic, arms) **black**.
   - This fixes the §1.3 inversion.
4. **Street:** the forecourt lamp columns and the Luas shelter strip lights use the existing lamp and light-pool system.

---

## 10. P1: forecourt and Luas stop kit

### 10.1 Forecourt

- **Placement:** the existing forecourt plate is `{ x: heustonFront.x + 16, z: heustonFront.z + 4, w: 30, d: 44, rot: 0.14 }`. Local u runs east from the main front.
- **Sizes:** people, buses and trams are real size, so these are game metres at ~real widths.
- **The Luas centreline (HS)** is ~16 game m east of the front (§1.3 of Phase 1).

| u (game) | Strip | Content |
|---|---|---|
| 0–3.5 | Apron along the front | Granite flags `#a19d93`, 0.6 m grid. **Stainless bollards** 0.9 m × 0.12 dia at 1.6 m pitch along u 2.8 (v2-02, v2-08). Continues in front of the wings. |
| 3.5–9.5 | PSV lane | Southbound bus/taxi lane (already a `lane` way): asphalt, yellow bus-bay boxes. Bus stops 4319/4320/4425 with **2 Dublin Bus shelters** (4.2 × 1.4 × 2.5, glass + ad panel) on its east edge. Parked double-deckers are the biggest single "station" cue after the building (refs 01, 02, v2-01). |
| 9.5–13 | West Luas platform | Kit below, with the **canopy run** |
| 13–19 | Two tracks | Existing, TRACK 1.8. Hatched paint strip between them (ref 11) |
| 19–22 | East Luas platform | Kit, with a **low granite wall** 0.9 m high on its back edge carrying the "Heuston" wall sign (ref 11) |
| 22–30 | Lawn | Lawn `#5f7f3a` with a **clipped hedge** 0.9 m high along the SJRW edge and **3–4 rounded clipped mounds** (ref 04). The **row of 5 trees** (OSM, at -6.29152, 53.34660–53.34683) at u ≈ 22.6, 8–10 m tall, broad crowns. These are what hide the ground floor in ref 03. |
| – | Front corners | **4 silver birches** (weeping habit, white bark) at the wing / main-block re-entrant corners (OSM 53.34676/-6.29223, 53.34683/-6.29226, 53.34638/-6.29213, 53.34632/-6.29210) |
| – | SJRW kerb | Galvanised **pedestrian guard rail** 1.0 m (vertical bars) along both kerbs at the junction (refs 03, 08, 09) |

- **"The canopy":** there is no porte-cochère.
  - The long glass canopy seen across the front in refs 01 and v2-01 is the **Luas west-platform shelter run** (5 m modules on tapered steel arms).
  - Model it as part of the stop kit, not the building.
  - The green-canopied café kiosks at the north wing (v2-06) are optional dressing.
- **Budget:** ~600 tris of paving, hedge, bollards (instanced) and rail. Trees come from the existing tree instancer.

### 10.2 Luas stop kit (reusable for Museum and others)

- **Where:** a function in `src/game/luas.js` replacing the per-stop 26 m platform and single shelter, with a per-stop config: `{ length, width, shelters: [{side, from, modules}], wall, name }`.
- **Sizes:** real size, because the trams are 3 × 11 m + gaps = **35.4 m**.

| Component | Spec |
|---|---|
| Platform | **38 m** long, 0.30 high, width 3.0 (Heuston) / 2.4 (default). 0.6 m tactile edge strip `#d4c070` and a 0.1 m white edge line. 2.4 m ramps at the ends |
| Shelter module (5 m) | Two **tapered steel "tree" posts** (0.15 × 0.30 section, `#5d6166`) at 4 m centres. A **cantilevered glass canopy** 1.8 deep, sloping 3.1 → 2.9 m. Glass back screen 2.2 m with a frit band. Timber-slat bench 3 m. Strip light under the canopy edge (emissive). Heuston: **west platform 3 + 2 modules, east platform 1 module** (OSM shelters 10 m, 8.5 m, 7 m) |
| Ticket machine | 0.9 × 0.45 × 1.9, body `#7b8288`, blue/white screen. 2 per platform |
| Validator | Post 0.12 dia × 1.3 with a yellow head. 2 per platform |
| Name totem | 0.5 × 2.4 dark grey panel with white "Heuston" (Irish above, English below, both "Heuston"). One per platform, plus a 1.3 × 0.55 wall sign on the east wall |
| OCS poles | Tubular, 0.27 dia × 7.5 m, `#8c9196`, both sides of the trackbed at ~25 m pitch (every 25 game m). Some carry a lamp bracket (ref 11) |
| Span wires / contact wires | Span wire at 6.8 m between opposing poles. Contact wire at 6.0 m over each track, as 4-sided boxes 0.025 m or `LineSegments` (one draw call for the whole line if merged) |
| Bins | Stainless cylinders |

- **Budget:** ~1.2k tris per stop.
- **Draw calls:** 4 per stop with merged geometry (paving, steel, glass, sign atlas), or instanced across stops.
- **The central island** (≈4 m real, ref 11) does not fit with the global `TRACK = 1.8`. Paint it as a hatched strip. Widening the track spacing locally would need a per-stop offset in `luas.js` (optional, §13).

---

## 11. P2: Seán Heuston Bridge (`heustonbridge.glb`, ~2k tris)

- **Replace** the generic body and parapets from `ground.js buildBridge` for `/Heuston/`. Keep the deck, the rails and the collision segments.
- **Scale:** build at real size across the 9 m width (pedestrians and trams are real size). Refs: 12, 13.

| Part | Spec |
|---|---|
| Arch | Segmental. Real span 30 m, rise ≈4.4 m (span/rise ≈6.8, measured on ref 12). The game has water only 2.6 m below the deck (`WATER_Y`). Spring the arch at `WATER_Y − 0.3` (hidden) with the crown soffit at −0.55. **Don't stretch the rib to a wider game channel:** fill the extra width with granite abutment blocks and quay-wall returns |
| Ribs | 3 modelled (2 fascia ribs plus 1 inner for the soffit silhouette; the real bridge has 7). Each is an I-section, 0.5 deep at the crown and 0.9 at the springing, 24 segments, `#1f2530`. Between the fascia rib's flanges, an alpha **openwork band of rings** |
| Spandrels | Off-white `#dcdcd6` cast-iron face, 0.1 proud of the rib plane. **One framed panel near each abutment**, a quadrilateral following the rib, with the **crown-and-scroll relief** (`hs_spandrel`) and dark frame mouldings. Plain white fascia over the crown zone |
| Deck fascia | White cornice band, 0.4 m |
| Parapet | 1.1 m **openwork cast-iron alpha card** (`hs_ring`, interlocking rings and quatrefoils, `#2a2620` with gilt) between **cream square dies** (0.5 × 0.5 × 1.3 with cap) at ~5 m pitch, 6 per side. The crown die carries the **"1821"** plate (`hs_1821`) |
| Abutments | Granite `#9e9c94`, rusticated piers 3.2 × 2.5 at each corner, rising 1.3 m above the deck. Each carries an **ornate cast-iron lamp standard** (lathe, 4 m, lantern emissive at night; 4 total). A solid granite pier-house at the north end |
| Deck | Granite slab paving with embedded rails (the Luas trackbed look of ref 13) |

**Budget:** ribs ~300, soffit 50, spandrels and fascia ~100, parapet cards and dies ~280, abutments ~160, lamps ~600, total **~1.5–2k**.

**Frank Sherwin Bridge** stays generic (Phase 1 §4.9).

---

## 12. New references (`refs/heuston/v2-*`)

All from Wikimedia Commons, downloaded at 1280 px wide (or the original if smaller). Credit these if shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| v2-01-front-elevation-with-luas-canopies.jpg | [Heusten Railway Station, Dublin - geograph 5163548](https://commons.wikimedia.org/wiki/File:Heusten_Railway_Station,_Dublin_-_geograph.org.uk_-_5163548.jpg) | Chris Morgan | CC BY-SA 2.0 | 2016-10-11 | Near-frontal whole front in good light: full roofline, both-end dies, south bellcote, Luas canopy run, double-decker |
| v2-02-front-straight-on-bays-2-7-attic.jpg | [Heuston Station - geograph 6007824](https://commons.wikimedia.org/wiki/File:Heuston_Station_-_geograph.org.uk_-_6007824.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | **Measurement source.** Straight-on bays 1–7: pediment alternation, swags, attic panels (VIII VIC, 3 cartouches), dies, balcony band, paterae, arches, bay-5 doorcase |
| v2-03-ground-arcade-and-piano-nobile-closeup.jpg | [Dublin Heuston railway station.jpeg](https://commons.wikimedia.org/wiki/File:Dublin_Heuston_railway_station.jpeg) | Thoslee | CC BY-SA 4.0 | 2023-02-03 | Wide-angle close-up: channelled rustication, voussoirs and keystones, doorcase, glazed entrances, balcony cornice with modillions, capitals, pediments, cornice ressauts |
| v2-04-capitals-cornice-modillions-window.jpg | [Heuston7 (8194718830)](https://commons.wikimedia.org/wiki/File:Heuston7_(8194718830).jpg) | psyberartist | CC BY 2.0 | 2012-09-04 | **Detail source.** Capitals with lion masks, unfluted shafts, modillion cornice with lion masks and ressauts, triangular pediment, arched sash, balconette with ball-finial posts, balcony-band blocks, patera |
| v2-05-roofline-and-south-flank-from-se.jpg | [HEUSTON STATION DUBLIN IRELAND JULY 2013](https://commons.wikimedia.org/wiki/File:HEUSTON_STATION_DUBLIN_IRELAND_JULY_2013_(9201126796).jpg) | calflier001 | CC BY-SA 2.0 | 2013-07-02 | From the SE: the roofline (balustrade/attic split, dies, cartouches, flagpoles), the articulated **south flank**, corner pilaster + column, ground-floor arches on the flank |
| v2-06-north-flank-bellcote-dome-chimneys-from-ne.jpg | [394 Train Station, Dublin](https://commons.wikimedia.org/wiki/File:394_Train_Station,_Dublin.jpg) | XeresNelro | CC BY-SA 4.0 | 2009-08-15 | From the NE in sun: **north flank** order, north bellcote (arches, pediments, oculi, ribbed dome, finial), wing breakfront and balustrade, **north-return stacks**, café kiosks |
| v2-07-bellcote-base-and-wing-doorway.jpg | [Heuston4 (8194727422)](https://commons.wikimedia.org/wiki/File:Heuston4_(8194727422).jpg) | psyberartist | CC BY 2.0 | 2012-09-04 | Bellcote open stage (arch, corner columns), base balustrade, wing breakfront: Tuscan column, door aedicule with consoles and segmental pediment |
| v2-08-night-floodlit-front.jpg | [Dublin Heuston station at night.jpeg](https://commons.wikimedia.org/wiki/File:Dublin_Heuston_station_at_night.jpeg) | Thoslee | CC BY-SA 4.0 | 2024-03-01 | **Night reference:** pink floodlit architraves, pediments and cornice soffit; dark attic; lit ground-floor shops; bollards |

**Also useful, not downloaded:**
- "Heuston Station Tricolour 1916 Tribute.jpg" (CC BY-SA 4.0): night tricolour wash.
- "Entrance of Heuston Stn, Dublin.jpg" (CC0): night red wash from below.
- "Heuston Station - geograph.org.uk - 6423026" (CC BY-SA 2.0): dusk green, lawn and hedge from the junction.
- Heuston2 and Heuston6 (psyberartist, CC BY 2.0): bellcote arch and balustrade close-ups.
- Heuston1 (psyberartist, CC BY 2.0): south-range pavilion lunette.

The Commons category is "Dublin Heuston railway station".

---

## 13. Acceptance checks and open questions

**Checks for v2** (the same three compare spots, plus the north bank, plus night):
1. Main-block aspect in a frontal frame is 1.4–1.5, and the arches are visibly round.
2. There is one tier of arched windows. Pediments are segmental on the centre bay and alternate outward.
3. Upper-façade mean sRGB is ≥ 110 under the overcast preset (v1: 42).
4. Bellcotes show **sky through the arches** from the junction and from the north bank. The dome is round and the finial sits at cornice height.
5. The attic spans 5 bays and is less than 1 m proud of the balustrade. Two chimney stacks show. Flagpoles are ±7.6 m apart.
6. The cornice casts a continuous deep shadow with a visible modillion rhythm at 37 m.
7. At night the frames and stone panels are not glowing; the reveals and cornice are washed and the ground-floor arches are lit.
8. The model stays under 16k tris and ≤ 7 draw calls. Re-run `areaperf.mjs` at Heuston (v1: 46 fps / 9.0 ms, the most headroom of the five areas).

**Open questions:**
1. **Height scale 0.75 vs 0.8:** a taste call once seen in the driver's frame (§4).
2. **The arms in the attic cartouches.** The heraldry is unidentified (possibly the cities served by the GS&WR). Use a generic crowned shield until someone checks on site.
3. **Flank bay count** (4 at 4.4 m assumed from refs 05, 08, v2-05, v2-06) and the exact wing set-back (7.6 from OSM; the breakfront at 5.8).
4. **Central Luas island:** paint only, or add a per-stop track offset in `luas.js`?
5. **Bridge proportions:** the arch is flatter in game (the water is only 2.6 m down). Accept it, or lower the water locally under the bridge?
6. **HUD label** "O'Connell Street" in the compare captures at Heuston: check which way/zone the HUD resolves there.

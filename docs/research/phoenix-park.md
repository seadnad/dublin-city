# Phoenix Park, eastern part (`phoenix-park`): Phase 1 research

Scope: the eastern ~60% of the Phoenix Park, from the Parkgate Street main entrance to the Phoenix Monument, the Áras an Uachtaráin gates, the Papal Cross and the US Ambassador's Residence. That covers Chesterfield Avenue, Wellington Road, Military Road, Acres Road, Khyber Road, Fountain Road, Zoo Road and North Road, plus the Wellington Monument, the People's Flower Gardens, the Dublin Zoo edge and the Magazine Fort. Connections: Parkgate Street and Conyngham Road to the Heuston area, the North Circular Road gate for the north ring, and Islandbridge (the north end of the South Circular Road) for the south ring.

- **Raw OSM:** `data/osm/phoenix-park.json` (3.5 MB). Overpass `out geom`, bbox **S 53.3440, W -6.3400, N 53.3700, E -6.2920**. Snapshot `timestamp_osm_base` 2026-09-28T22:51:01Z, 7,515 elements after filtering.
  - Kept: all highways; street lamps, crossings and signals; barriers and gates; historic, man_made and tourism features; water, waterways, woods and scrub; landuse and leisure; amenities (police, parking, cafe and similar); railway; and the park relation `4423275`, whose full outer ring (220 points, 7.03 km²) is included.
  - Trees: only trees inside the park.
  - Buildings: only those inside the park, on the Parkgate/Conyngham Road fringe, or carrying a name or heritage tag. The Stoneybatter/Cabra/Chapelizod housing was dropped.
  - Dropped: the historic boundary relations (constituencies and wards, 10.5 MB).
- **References:** `refs/phoenix-park/` holds 16 images from Wikimedia Commons (geograph and own work, all CC BY-SA). Credits are in §2 and `refs/phoenix-park/sources.json`.
- **Coordinates:** everything below is **lat/lon**, because the park is meant to get extra compression (§1.2). Distances are **real metres** unless marked "game m".
- **Status tags:** facts are marked **VERIFIED** (with source) or **est.**. OSM-derived positions are VERIFIED against OSM, not a survey.
- **Mapillary:** not used (no token).

---

## 1. Map data and the key design question

### 1.1 How big it is (VERIFIED)

- The whole park is **707 ha / 7.07 km²** with an **11 km perimeter wall** (Wikipedia). The OSM relation ring measures 7.03 km², spanning lon -6.2949 to -6.3562 and lat 53.3463 to 53.3712.
- **Chesterfield Avenue** runs dead straight from Parkgate Street to the Castleknock Gate, **≈4.17 km** (straight-line Parkgate gate to Castleknock Gate, OSM).
  - Parkgate gate (PX10) to the Phoenix Monument roundabout (PX21): **2,286 m**.
  - Phoenix Monument to Castleknock Gate: **1,849 m**.
  - The only kinks are the small People's Garden roundabout (PX12) and the Phoenix Monument roundabout. The longest unbroken run is PX16 to PX20, **1,202 m**, at a bearing of about 35° north of west.
- **Key distances from the Parkgate gate:**

| From | To | Real m |
|---|---|---|
| Parkgate gate | Wellington Monument | 419 |
| Parkgate gate | NCR gate | 433 |
| Parkgate gate | Islandbridge Gate | 982 |
| Parkgate gate | Phoenix Monument | 2,326 |
| Parkgate gate | Castleknock Gate | 4,174 |
| NCR gate | People's Garden roundabout | 393 |
| Phoenix Monument | Áras main gate | 110 |
| Phoenix Monument | Papal Cross | 445 |
| Phoenix Monument | US Ambassador's Residence | 556 |
| Phoenix Monument | Visitor Centre | 741 |
| Wellington Monument | Magazine Fort | 871 |

- **Existing game edge:** when this research started, `bounds.west` was -6.2975. The canal-ring commit has since moved it to -6.30 and `bounds.north` to 53.3672.
  - The game's `PG1` (Parkgate St / Infirmary Rd junction) is at 53.34812, -6.2942. **The real junction is at 53.34813, -6.29500, ≈53 m further west.**
  - Likewise `IR1` (53.34885, -6.294) sits ≈70 m east of the real Infirmary Road (53.34885, -6.29500).
  - The park's east wall runs up the west side of Infirmary Road.

### 1.2 Which part to include

| Option | West limit | Area (real) | Includes | Leaves out |
|---|---|---|---|---|
| A: compact | lon -6.319 | ≈1.6 km E-W, ≈1.5 km² | Parkgate, Wellington Monument, People's Garden, Zoo front, NCR gate, Islandbridge Gate, Magazine Fort. Chesterfield Ave only ≈1.3 km | Phoenix Monument, Áras gates, Papal Cross. The "long straight" is cut in half |
| **B: recommended** | **lon -6.3345, lat ≤ 53.365** | **2.63 km E-W x 2.08 km N-S, 3.97 km² (56% of the park)** | All of A, plus the whole Chesterfield run to the **Phoenix Monument** roundabout and 0.55 km beyond it to Furze Road (PX23), the **Áras gates** (110 m from the monument), the **Papal Cross** (445 m), the **US Ambassador's Residence (Deerfield)** (556 m), Acres Road, Military Road and Chapelizod Road along the south edge | Visitor Centre/Ashtown Castle (741 m NW of the monument, just outside), Fifteen Acres' west half, Farmleigh, the Castleknock and Knockmaroon gates |
| C: full avenue | lon -6.349 | ≈3.6 km E-W | All of B, plus Chesterfield Ave to the Castleknock Gate (4.17 km), Visitor Centre, Ashtown Castle, Fifteen Acres | Doubles the park size again for mostly empty grass |

**Recommendation: B.** It keeps every hero (Wellington Monument, Phoenix Monument, Áras gates, Papal Cross) and the whole Parkgate-to-Phoenix straight, and it ends on a natural full stop: the Phoenix roundabout and the next junction at Furze Road.

**Is the Papal Cross too far?** No. It stands on Fifteen Acres only 445 m from the Phoenix Monument (135-225 game m) and is visible from the roundabout. It is a 35 m white steel cross (VERIFIED, Wikipedia; OSM `height=35`) and is cheap to build (P2). Acres Road passes 250 m east of it (PX42).

### 1.3 Compression

The park must not wreck the stitch with the north ring (the NCR gate is right on the east edge) or bend the long straight. The options, with lengths computed with the PX nodes below (existing east-side warps don't affect these lengths):

| Route | Real m | 0.5 (as the map) | X-band net 0.4 | **X-band net 0.35** | X-band net 0.3 | Uniform 0.3 |
|---|---|---|---|---|---|---|
| Chesterfield: gate → Phoenix Monument | 2,286 | 1,143 | 998 | **931** | 868 | 678 |
| Chesterfield: gate → Furze Rd (PX23) | 2,849 | 1,425 | 1,244 | **1,160** | 1,081 | 847 |
| Longest straight PX16 → PX20 | 1,202 | 601 | 523 | **487** | 454 | 361 |
| Wellington Road PX12 → PX34 | 772 | 386 | 329 | **301** | 273 | 232 |
| Conyngham Road PG1 → Islandbridge | 941 | 471 | 405 | **373** | 340 | 318 |
| Loop: Parkgate → Chesterfield → Phoenix → Acres Rd → Military Rd → Wellington/Khyber → Conyngham Rd | 6,450 | 3,225 | 2,824 | **2,631** | 2,445 | 1,949 |
| Park extent E-W (game m) | | 1,236 | 1,004 | **≈890** | 773 | 751 |
| Chesterfield bearing (35° real) | | 35° | 41° | **45°** | 49° | 35° |

- **Recommended: an X-only band west of lon -6.2985 with k = 0.7**, giving net 0.35 of real east-west. It mirrors `warpX` in `geo.js`: for `u < a`, `u' = a' - (a - u) * 0.7`. North-south stays at 0.5.
  - It is continuous, so nothing jumps at the seam.
  - The NCR gate junction (existing node **RN50**, lon -6.2981) and everything east of it are untouched, so the north-ring agent can stitch at the real coordinate.
  - Straight lines stay straight (the band is affine), so Chesterfield is still one straight. It just turns about 10° further north.
- **Uniform 0.3 is not recommended.** A 2D scale about the Parkgate gate moves the NCR gate cluster by ≈80 game m relative to the NCR, which tears the stitch. It also makes the straight shortest.
- **Drive times at the recommended net 0.35:**

| Speed | Gate → Phoenix Monument (931 m) | Loop (2.6 km) |
|---|---|---|
| Player cruise 30 m/s (108 km/h) | ≈31 s | ≈1.5 min |
| Player top speed 40 m/s (`car.js maxSpeed`) | ≈23 s | |
| AI at the real 30 km/h limit | ≈2 min | |

  For comparison, the current map's longest straights (quays, O'Connell St) are under 600 game m, so Chesterfield would be the longest straight in the game by a wide margin. At plain 0.5 it would be 38 s at 30 m/s: more epic, but the park then takes as much ground as the whole existing city.

### 1.4 Roads inside the park (VERIFIED from OSM unless noted)

**Speed limit:** all park roads are `maxspeed=30`. The 30 km/h limit was introduced in **February 2022** (Irish Times, 2026-08-08). Outside the park: Conyngham Road, Infirmary Road and the NCR are 50 km/h; Chapelizod Road is 60 km/h west of 53.3473, -6.3157.

| Road | Real line | Character | Rules |
|---|---|---|---|
| **Chesterfield Avenue** (tertiary) | Parkgate (53.34818, -6.29615) → People's Garden mini-roundabout (53.35086, -6.30357) → Phoenix Monument roundabout (53.36013, -6.32584) → Castleknock Gate | 2 lanes with a hatched centre, cycle tracks both sides (the old hard shoulders, converted during Covid), grass verges, gas lamps both sides, low black railings, walls of mature trees (refs 05, 06). Kerb to kerb est. 14-16 m | Two-way. At the Parkgate piers it splits into a one-way pair round a cobbled island: inbound `935165795`, outbound `1067394353` |
| **Wellington Road** | People's Garden roundabout → past the Wellington Monument's north side → Khyber Rd junction (53.34890, -6.31318) | Narrow (5.8 m), unlit, 1 lane | **One-way westbound** (away from Chesterfield). OSM `name:en` / logainm call it "Military Road"; see §5 |
| **Khyber Road** | Wellington Rd junction → Islandbridge Gate (53.34807, -6.31167) → Chapelizod Rd (53.34796, -6.31161) | 7.4 m, unlit | Last 29 m one-way **out** to Chapelizod Rd. Its northern arm (to 53.35026, -6.31530) is bollarded and is a cycleway beyond |
| **Military Road** (in park) | Khyber Rd junction → south of the Magazine Fort → 53.34779, -6.32487 | 2 lanes, unlit | Bollards at 53.34779, -6.32487 and 53.34739, -6.32713 (`motor_vehicle=permissive`, see fixme). West of them it continues to Acres Rd / Chapelizod Gate |
| **Acres Road** | Phoenix Monument → south across Fifteen Acres' east edge → Chapelizod Gate (53.34731, -6.33681) | 2 lanes, unlit | Two-way. Chapelizod Gate stub one-way |
| **Fountain Road** | People's Garden roundabout → NE → Garda HQ junction | 2 lanes | NE half is a one-way couplet with North Rd round the Garda HQ triangle |
| **Zoo Road** | 53.35220, -6.30192 → 53.35315, -6.30153 | Short | One-way northbound |
| **North Road** | NCR gate (53.35213, -6.29856) → Garda HQ → up the Zoo's east side → Cabra Gate (53.36311, -6.31492) → Ashtown | 2 lanes near the gate | One-way **toward the NCR gate** between Zoo Rd and the HQ junction. **One-way south-east from the Cabra Gate to the Zoo's NE corner** (OSM `3753962`; "North Road became one-way", Irish Times) |
| **Lords Walk / Spa Road** | Chesterfield (53.35238, -6.30729) → north behind the Zoo/Polo grounds; Spa Rd east to North Rd | 2 lanes | Spa Rd has a bollard at its west end (footway link to Lords Walk) |
| **Odd Lamp Road** | Phoenix Monument → north to the Visitor Centre side | | Bollards `access=no` at 53.36354 and 53.36073 |
| **Áras avenue** | From the Phoenix roundabout NE through the gates (53.36063, -6.32441) | | Private beyond the gates |
| **Army Road, Camogie Road** | | | Service roads; Army Rd gated at 53.35092, -6.31040 |

**Traffic rules and closures:**
- In March 2020 the OPW shut all gates except **Parkgate Street and Castleknock**, keeping Chesterfield Avenue a through-route.
- Later reporting: the peripheral gates stay closed to cars, "with the exception of the Parkgate Street, Castleknock and North Circular Road gates" (Irish Times 2026-08-08; OPW press release). So **cars enter at Parkgate, Castleknock and NCR only**.
- The Islandbridge, Chapelizod, Cabra, Ashtown, Knockmaroon and White's gates are **believed closed to cars** (est.; OSM does not tag them closed, see §5).
- **Traffic:** ≈25,000 vehicles/day, mostly through-traffic (Irish Times).
- **Bus 99** (Parkgate St ↔ Visitor Centre, OSM relations `16466850/1`) stops "Dublin Zoo" on Chesterfield at 53.35162, -6.30527.

### 1.5 Gates and their characters

| Gate | Where | Character | Status |
|---|---|---|---|
| **Parkgate Street (main)** | Piers at 53.3484-53.3486, -6.2970 to -6.2977; Chesterfield mouth PX01 | **Four round-plan ashlar piers** in two pairs (inbound/outbound) with **gadrooned (ribbed) dome caps and wrought-iron lanterns**. A cobbled island with flower planters between. Square-headed ashlar pedestrian gateways at each side. c.1810, dismantled 1932 for the Eucharistic Congress, re-erected 1986 with different pier spacing (NIAH 50060017). Two 1811 gate lodges beside: a single-cell pedimented lodge fronting Chesterfield with its back on Conyngham Rd (NIAH 50060015), and a 3-bay hipped-roof lodge on Parkgate St (NIAH 50060016). Refs 07, 08 | Open |
| **North Circular Road** | Junction **RN50** (existing; OSM 53.35220, -6.29810); gate screens 53.35213-53.35216, -6.29827 ("In"/"Out" gates in OSM) | **White-painted ornate cast-iron gate screens and openwork piers** with lantern tops, "IN"/"OUT" plates. The NCR runs off east as a plane-lined avenue (ref 15). Garda HQ is immediately inside | Open to cars |
| **Islandbridge** | 53.34807, -6.31167 on Khyber Rd; lodge `391790302` at 53.34816, -6.31155 | Gate lodge plus piers on Chapelizod Rd, opposite the South Circular Road / Sarah Bridge junction | Believed car-closed (est.) |
| **Chapelizod** | 53.34686, -6.33691 (Acres Rd end) | Decimus Burton's "architecturally significant" lodge (Wikipedia) | Outside area B |
| **Cabra** | 53.36313, -6.31462 (North Road) | Lodge and gates | Believed car-closed; OSM one-way inbound |
| **Áras an Uachtaráin** | 53.36063, -6.32441 | **White wrought-iron double gates between granite piers with urns and lamps**, flanked by **two small granite lodges with pyramidal slate roofs**, white railings and **white-painted lamp standards**. Tricolour and EU flags (ref 11) | Private |

### 1.6 Connections and stitch points

| Stitch | Coordinates | Notes |
|---|---|---|
| **Parkgate / Heuston** | Chesterfield Ave meets Conyngham Rd at **PX01 53.34819, -6.29645** (in/out mouths 53.34818, -6.29615 and 53.34819, -6.29671) | New way **Conyngham Road** PG1 → PX01 → … → Islandbridge PX05, R109, 3-4 lanes. This extends the existing Parkgate Street `WT3-PG1`. Consider moving PG1 to the real 53.34813, -6.29500 (§1.1) |
| **North Circular Road gate** | **RN50 [53.3522, -6.2981]**. This node is already in `streets.json` from the north-ring work: the NCR (R101) meets Infirmary Road (R101) and North Road (the park). The gate itself is PX51 53.35214, -6.29840 | The snippet stitches to RN50 directly (North Road RN50 → PX51 → PX52). RN50 is east of the compression band, so it keeps its normal projection |
| **Infirmary Road** | Already in `streets.json` as PG1 → IR1 → RN64 → RN50 (RN64 = the real 53.35011, -6.29614) | Nothing to add |
| **South Circular Road / Islandbridge** (for the south-ring agent) | **PX05 53.34824, -6.30835**, where Conyngham Road becomes Chapelizod Road. SCR runs south over **Sarah Bridge** (Islandbridge, deck ≈53.34746 → 53.34700, -6.3083) | This is the **north end of the South Circular Road**. The south ring can run SCR from here via Kilmainham to Dolphin's Barn and Portobello. PX05 is inside the X band (lon -6.30835), so the south agent must use the same warp |
| **Liffey** | North bank ≈53.3474-53.3478 from -6.2975 to -6.3095; channel only **25-35 m wide**; Islandbridge weir just upstream of Sarah Bridge; bends SW to the War Memorial Gardens | Conyngham Rd runs 50-100 m north of the river with a strip of houses and apartments between (Wellington House, Kingsbridge House, Bridgewater Quay). The game's straight pinned channel should be extended west to about -6.311 |

### 1.7 Landscape: what reads as "Phoenix Park" rather than "a park"

- **Scale of openness.** Big mown or rough grass plains (Fifteen Acres, the Wellington lawns, the Polo grounds), with **tree clumps** (roundels) and belts rather than continuous forest.
  - OSM woods in area B: **43 polygons totalling 0.73 km², 18% of the area**. The largest are north of Chesterfield between the Zoo and the Phoenix Monument (`473824708`, 11 ha) and the belt west of the monument (`1025236956`, 7 ha).
- **Chesterfield Avenue as a green corridor.**
  - Dense **dark evergreen clumps near Parkgate**. These look like **holm oak** (*Quercus ilex*): very dark, rounded, dense crowns in refs 05-07. est.; the park's tree trail lists holm oak.
  - Burton planted **English elm and red-twigged lime** along the avenue. These were later replanted with **horse chestnut and beech**, some of which remain (RTÉ Brainstorm / phoenixpark.ie). Horse chestnuts in flower appear in ref 16.
  - Other park species: ash, oak, lime, beech, sycamore, hawthorn. OSM's tagged trees in the east are mostly *Fraxinus* (27 of 77 tagged by genus), plus *Quercus*, *Acer*, *Pinus*, *Cupressus*, *Taxus*, one *Sequoiadendron* and one *Cedrus* (in the People's Garden).
- **Victorian gas lamps along Chesterfield.**
  - **224 gas lamps** are maintained along Chesterfield Avenue and nearby paths, and are still lit by hand-wound timers and a family of lamplighters (visitdublin.com, VERIFIED). There were 300+ in 1880.
  - Posts are ornate black cast iron, about 5 m to the finial (est. from ref 06), set at the kerb on both sides, **about every 30-35 m** (est., refs 05, 06; consistent with 224 lamps over ≈4 km x 2 sides plus paths).
  - The light is "a reddish glow" in "warm pools".
- **Railings.** Low (≈1.1 m) black cast-iron post-and-bar railings behind the footpaths on both sides of Chesterfield (refs 05, 06). The People's Garden has hoop-top railings (ref 14).
- **Deer.** A herd of **400-450 fallow deer** (*Dama dama*), descended from animals introduced in the 1660s (Wikipedia, VERIFIED).
  - Usually seen on **Fifteen Acres / the Papal Cross area**, around the Phoenix Monument and the Áras lawns (est., from Commons "Deer by papal cross" and ref 13).
  - Summer coat fawn with white spots; some **melanistic (dark brown)** and pale animals. Bucks carry palmate antlers (ref 13).
  - They are tame and crowd people for food. That makes them a strong ambient feature.
- **Water.**

| Pond | Where | Size | Notes |
|---|---|---|---|
| **People's Garden pond** | 53.3511-53.3517, -6.2994 to -6.3014 | 3,990 m² + a 585 m² arm | Willows, reeds, railings; Wellington obelisk behind (ref 04) |
| **Dog Pond** | 53.35143, -6.30855 | 6,190 m² | OSM `description`: a WWII bomb crater |
| **Zoo lakes** | Inside the zoo | Small | Chimpanzee and Mangabey islands |

  There is no "Citadel Pond" in OSM within area B (§5).
- **Ha-ha and walls.**
  - The Áras demesne is set in its own grounds (OSM relation `6742850`, ≈51 ha), fenced and sunk-fenced from the park (est.).
  - Deerfield (US Residence) has a wall (`38510936`, `barrier=wall`, `landuse=grass`).
  - The park boundary is a stone wall of rough calp with coping along Conyngham Road (NIAH 50060015 describes the "coursed rough-hewn Dublin calp wall").
- **Other features on the ground.**
  - The **People's Flower Gardens** (9 ha of Victorian bedding, 1864; Wikipedia) sit between the Parkgate entrance, the pond and the roundabout.
  - **The Hollow bandstand** is at 53.35225, -6.30351.
  - **Phoenix Park Tea Rooms** are at 53.35210, -6.30474.
  - **Garda HQ**, **Dublin Zoo** (relation `8808835`, ≈14 ha in OSM), the **Phoenix Cricket Club** (53.35253, -6.31160) and the **All Ireland Polo Club** (53.35665, -6.31023).
  - The **Magazine Fort** (1734; NIAH 50060115; star-shaped bastioned fort, OSM `34886541`, ≈8,000 m² on a knoll at 53.3484-53.3492, -6.3151 to -6.3172).
- **Ground textures.**
  - Close-mown amenity grass near roads and gardens: `#637847`.
  - Rougher, yellower meadow on Fifteen Acres and the Wellington fields in summer: `#8a8a4c`, est.
  - Tarmac paths `#838488`; granite setts at the gate island and the Phoenix roundabout `#787879`.
  - Tree-clump understorey very dark: `#1b1f15`.

### 1.8 Proposed street-graph additions (JSON)

New IDs all start with `PX`; none exist in `src/data/streets.json` (checked). `PG1` and `RN50` are existing nodes (RN50 came from the north-ring commit). All coordinates are real lat/lon; apply the park compression in `project()`, not in the data.

Choices made in the snippet:

- **Chesterfield Avenue:** `primary`, width 15, not `boulevard`. The game's `boulevard` draws a median (`ground.js` offsets ±8) and `landmarks.js:1742` looks up "the" boulevard. Chesterfield has no median, only a hatched centre.
- **New builder style:** the avenue needs a style of its own (gas lamps every ~30 m, black railings, tree rows, no filler buildings, low pedestrian density). I suggest a new optional way field `"style": "park-avenue"` (§4).
- **Parkgate one-way pair:** simplified to a single node pair PX01-PX10. The builder can split it round the cobbled island.
- **Garda HQ couplet:** kept as one-ways (Zoo Rd north, North Rd SE back to the gate). Fountain Rd is two-way in the snippet for simplicity; really its NE end is one-way.
- **The 250 m bollarded stretch of Military Road** (PX40-PX72) is `access: "pedestrian"`. Opening it closes a nice driving loop (§1.3); the game's call.
- **PXB0-PXB17** is the park boundary clipped to area B: west cut at lon -6.3345, north cut at lat 53.365, simplified to 12 m. The Garda HQ notch at PXB6-PXB9 is kept.
  - The west and north cut edges (PXB15 → PXB16 → PXB17 → PXB0) are **not real walls**. They need a tree-belt or fog treatment (§5).
  - `ground.js` gives parks a perimeter path and cross paths, which is wrong at this size.

```json
{
  "nodes": {
    "PX01": [53.34819, -6.29645],
    "PX02": [53.34821, -6.2975],
    "PX03": [53.34832, -6.30389],
    "PX04": [53.34835, -6.30609],
    "PX05": [53.34824, -6.30835],
    "PX06": [53.34796, -6.31161],
    "PX07": [53.34774, -6.31313],
    "PX08": [53.34729, -6.31573],
    "PX09": [53.34632, -6.32964],
    "PXS1": [53.34746, -6.30832],
    "PXS2": [53.347, -6.30829],
    "PX10": [53.34859, -6.29739],
    "PX11": [53.35009, -6.30151],
    "PX12": [53.35086, -6.30357],
    "PX13": [53.35154, -6.30527],
    "PX14": [53.35187, -6.30607],
    "PX15": [53.35238, -6.30729],
    "PX16": [53.35296, -6.30868],
    "PX17": [53.3544, -6.31215],
    "PX18": [53.35586, -6.3156],
    "PX19": [53.35728, -6.31899],
    "PX20": [53.35915, -6.3235],
    "PX21": [53.36013, -6.32584],
    "PX22": [53.362, -6.33029],
    "PX23": [53.36304, -6.33277],
    "PX30": [53.34932, -6.30461],
    "PX31": [53.3488, -6.30642],
    "PX32": [53.34855, -6.30941],
    "PX33": [53.34877, -6.31169],
    "PX34": [53.3489, -6.31318],
    "PX35": [53.34864, -6.31239],
    "PX36": [53.34821, -6.31174],
    "PX37": [53.34806, -6.31461],
    "PX38": [53.34772, -6.31728],
    "PX39": [53.34735, -6.32121],
    "PX40": [53.34779, -6.32487],
    "PX41": [53.35753, -6.32535],
    "PX42": [53.35614, -6.32471],
    "PX43": [53.35252, -6.32797],
    "PX44": [53.34954, -6.33292],
    "PX45": [53.34816, -6.33333],
    "PX46": [53.36191, -6.32571],
    "PX48": [53.36063, -6.32441],
    "PX51": [53.35214, -6.2984],
    "PX52": [53.35239, -6.29991],
    "PX53": [53.35228, -6.3006],
    "PX54": [53.3518, -6.30212],
    "PX55": [53.3527, -6.30162],
    "PX56": [53.35315, -6.30153],
    "PX57": [53.35268, -6.3008],
    "PX58": [53.35461, -6.30261],
    "PX59": [53.35704, -6.30384],
    "PX60": [53.3595, -6.30682],
    "PX61": [53.36157, -6.31065],
    "PX62": [53.36311, -6.31492],
    "PX65": [53.35383, -6.30667],
    "PX66": [53.35461, -6.30658],
    "PX67": [53.35572, -6.30689],
    "PX68": [53.35681, -6.31019],
    "PX69": [53.35659, -6.31328],
    "PX70": [53.35693, -6.30672],
    "PX71": [53.35683, -6.30494],
    "PX72": [53.34739, -6.32713],
    "PX73": [53.34693, -6.32947],
    "PXB0": [53.365, -6.31986],
    "PXB1": [53.36485, -6.31883],
    "PXB2": [53.36164, -6.31054],
    "PXB3": [53.35801, -6.30386],
    "PXB4": [53.35556, -6.30148],
    "PXB5": [53.35516, -6.30261],
    "PXB6": [53.35339, -6.30158],
    "PXB7": [53.35252, -6.30022],
    "PXB8": [53.3522, -6.29829],
    "PXB9": [53.34854, -6.29491],
    "PXB10": [53.34813, -6.295],
    "PXB11": [53.34841, -6.30368],
    "PXB12": [53.34832, -6.30906],
    "PXB13": [53.34802, -6.31183],
    "PXB14": [53.34677, -6.31944],
    "PXB15": [53.3463, -6.32692],
    "PXB16": [53.34666, -6.3345],
    "PXB17": [53.365, -6.3345]
  },
  "ways": [
    {"name": "Conyngham Road", "type": "primary", "width": 13, "nodes": ["PG1", "PX01", "PX02", "PX03", "PX04", "PX05"]},
    {"name": "Chapelizod Road", "type": "primary", "width": 11, "nodes": ["PX05", "PX06", "PX07", "PX08", "PX09"]},
    {"name": "South Circular Road", "type": "secondary", "width": 11, "nodes": ["PX05", "PXS1"]},
    {"name": "Sarah Bridge", "type": "bridge", "width": 12, "nodes": ["PXS1", "PXS2"]},
    {"name": "Chesterfield Avenue", "type": "primary", "width": 15, "nodes": ["PX01", "PX10", "PX11", "PX12", "PX13", "PX14", "PX15", "PX16", "PX17", "PX18", "PX19", "PX20", "PX21", "PX22", "PX23"]},
    {"name": "Wellington Road", "type": "lane", "width": 6, "oneway": 1, "nodes": ["PX12", "PX30", "PX31", "PX32", "PX33", "PX34"]},
    {"name": "Khyber Road", "type": "lane", "width": 7, "nodes": ["PX34", "PX35", "PX36"]},
    {"name": "Khyber Road", "type": "lane", "width": 6, "oneway": 1, "nodes": ["PX36", "PX06"]},
    {"name": "Military Road", "type": "lane", "width": 7, "nodes": ["PX34", "PX37", "PX38", "PX39", "PX40"]},
    {"name": "Acres Road", "type": "lane", "width": 7, "nodes": ["PX21", "PX41", "PX42", "PX43", "PX44", "PX45"]},
    {"name": "Military Road", "type": "lane", "width": 7, "access": "pedestrian", "nodes": ["PX40", "PX72"]},
    {"name": "Military Road", "type": "lane", "width": 7, "nodes": ["PX72", "PX73", "PX45"]},
    {"name": "Odd Lamp Road", "type": "lane", "width": 7, "nodes": ["PX21", "PX46"]},
    {"name": "Áras an Uachtaráin (gates)", "type": "lane", "width": 7, "access": "destination", "nodes": ["PX21", "PX48"]},
    {"name": "North Road", "type": "secondary", "width": 8, "nodes": ["RN50", "PX51", "PX52"]},
    {"name": "Fountain Road", "type": "lane", "width": 7, "nodes": ["PX52", "PX53", "PX54", "PX12"]},
    {"name": "Zoo Road", "type": "lane", "width": 6, "oneway": 1, "nodes": ["PX54", "PX55", "PX56"]},
    {"name": "North Road", "type": "lane", "width": 6, "oneway": 1, "nodes": ["PX56", "PX57", "PX52"]},
    {"name": "North Road", "type": "secondary", "width": 8, "nodes": ["PX56", "PX58", "PX59"]},
    {"name": "North Road", "type": "secondary", "width": 7, "oneway": -1, "nodes": ["PX59", "PX60", "PX61", "PX62"]},
    {"name": "Lords Walk", "type": "lane", "width": 7, "nodes": ["PX15", "PX65", "PX66", "PX67", "PX68", "PX69"]},
    {"name": "Spa Road", "type": "lane", "width": 6, "nodes": ["PX70", "PX71", "PX59"]}
  ],
  "parks": {
    "Phoenix Park": ["PXB0", "PXB1", "PXB2", "PXB3", "PXB4", "PXB5", "PXB6", "PXB7", "PXB8", "PXB9", "PXB10", "PXB11", "PXB12", "PXB13", "PXB14", "PXB15", "PXB16", "PXB17"]
  }
}
```

**Other polygons** (lat/lon, for a new `parkFeatures`-style key; converting them into node-ID polygons would bloat `nodes`):

```json
{
  "wellingtonMonumentFootprint": [[53.34925,-6.30329],[53.34916,-6.30278],[53.34884,-6.30294],[53.34894,-6.30346]],
  "peoplesGardenPond": [[53.35142,-6.29935],[53.35122,-6.29941],[53.35112,-6.30036],[53.35126,-6.30105],[53.35142,-6.30133],[53.35152,-6.30115],[53.35164,-6.3014],[53.35167,-6.30134],[53.35158,-6.30072],[53.35151,-6.30039],[53.35138,-6.3004],[53.35138,-6.3],[53.35145,-6.29986],[53.3514,-6.29979],[53.35132,-6.29991],[53.35127,-6.29983],[53.35132,-6.29954],[53.35147,-6.29956]],
  "dogPond": [[53.35117,-6.30942],[53.35137,-6.30945],[53.35149,-6.30922],[53.35178,-6.30805],[53.35172,-6.30784],[53.35156,-6.30754],[53.35127,-6.30783],[53.35117,-6.30808],[53.35109,-6.30895]],
  "zoo": [[53.35696,-6.30761],[53.35705,-6.30771],[53.35676,-6.30911],[53.35691,-6.3102],[53.3568,-6.31118],[53.35702,-6.31225],[53.35828,-6.31119],[53.36111,-6.30989],[53.36094,-6.30954],[53.35817,-6.30488],[53.35735,-6.3042],[53.35708,-6.30445],[53.35689,-6.30516],[53.35704,-6.30702]],
  "arasDemesne": [[53.36041,-6.32439],[53.3612,-6.32527],[53.36344,-6.32462],[53.36469,-6.32291],[53.36498,-6.32174],[53.36471,-6.32004],[53.36158,-6.31108],[53.36111,-6.30989],[53.35763,-6.31178],[53.35886,-6.31632],[53.35801,-6.3168],[53.35791,-6.31739],[53.35945,-6.32156],[53.36007,-6.32398]],
  "magazineFort": [[53.34903,-6.31723],[53.349,-6.31621],[53.34912,-6.31618],[53.3492,-6.31582],[53.34904,-6.31583],[53.34887,-6.31514],[53.34855,-6.3156],[53.34836,-6.31553],[53.34839,-6.31656],[53.34828,-6.31658],[53.34818,-6.31693],[53.3488,-6.31689],[53.34882,-6.31707]]
}
```

- The **zoo** outline is the OSM relation, simplified to 10 m, ≈13.8 ha. Its southern boundary is set back from Chesterfield Avenue: the People's Garden, the Hollow and the zoo entrance (`391812262` at 53.35269, -6.30506) lie between.
- **Point landmarks:**

| Landmark | Lat, lon | Source |
|---|---|---|
| Wellington Monument centre | 53.34905, -6.30311 | OSM |
| Phoenix Monument | 53.36013, -6.32584 | NIAH / OSM |
| Papal Cross | 53.35665, -6.32913 | OSM `109491573` |
| Áras an Uachtaráin house | 53.35985, -6.31730 | OSM |
| US Ambassador's Residence | 53.35821, -6.33356 | OSM |
| Hollow bandstand | 53.35225, -6.30351 | OSM |
| Tea Rooms | 53.35210, -6.30474 | OSM |
| Garda HQ | 53.35249, -6.29991 | OSM |
| Garda Monument of Remembrance | 53.35364, -6.30142 | OSM |

**Largest woods in area B** (top 14 of 43 by area, simplified to 8 m; the rest are in the OSM file as `natural=wood`):

```json
{
  "w473824708": [[53.36099,-6.32398],[53.36066,-6.32506],[53.36132,-6.32522],[53.36113,-6.32566],[53.36159,-6.32567],[53.36201,-6.32525],[53.36225,-6.3254],[53.36405,-6.32402],[53.36363,-6.32384],[53.36358,-6.32324],[53.36369,-6.3231],[53.36337,-6.32168],[53.36341,-6.32046],[53.36316,-6.31895],[53.36385,-6.3187],[53.36377,-6.31844],[53.36326,-6.31878],[53.36296,-6.31788],[53.36286,-6.31671],[53.36296,-6.31632],[53.36328,-6.31557],[53.36179,-6.31151],[53.36136,-6.31163],[53.36266,-6.31606],[53.36251,-6.31684],[53.36267,-6.31825],[53.36243,-6.3189],[53.36146,-6.31926],[53.36155,-6.31955],[53.36226,-6.31959],[53.36247,-6.32019],[53.36315,-6.3209],[53.36307,-6.32122],[53.36285,-6.32122],[53.36198,-6.32016],[53.36206,-6.3215],[53.36175,-6.32264],[53.36147,-6.32289],[53.3614,-6.32352],[53.36118,-6.32395]],
  "w1025236956": [[53.35951,-6.32749],[53.35958,-6.32677],[53.35976,-6.32641],[53.36001,-6.32638],[53.36036,-6.32688],[53.36101,-6.32849],[53.36078,-6.32892],[53.36059,-6.32881],[53.36133,-6.3324],[53.36168,-6.33558],[53.36142,-6.33684],[53.36043,-6.33773],[53.35876,-6.33844],[53.35824,-6.33855],[53.3576,-6.33836],[53.35742,-6.33813],[53.35727,-6.3337],[53.35754,-6.33378],[53.35767,-6.33431],[53.35758,-6.33446],[53.3573,-6.3344],[53.35739,-6.33459],[53.35763,-6.33464],[53.35799,-6.33432],[53.35833,-6.33455],[53.35822,-6.33505],[53.35843,-6.33538],[53.35825,-6.33551],[53.35759,-6.33509],[53.35749,-6.33526],[53.35755,-6.33609],[53.35773,-6.33623],[53.3577,-6.33714],[53.35797,-6.33752],[53.35823,-6.33757],[53.35826,-6.33721],[53.35849,-6.3371],[53.35876,-6.33733],[53.35878,-6.33787],[53.35915,-6.33788],[53.35982,-6.33749],[53.3599,-6.33719],[53.36003,-6.3374],[53.36104,-6.33677],[53.36099,-6.33649],[53.36122,-6.33666],[53.36144,-6.3361],[53.36146,-6.33527],[53.36099,-6.33273],[53.36112,-6.33236],[53.361,-6.33199],[53.36062,-6.33225],[53.36062,-6.33197],[53.36085,-6.33181],[53.36081,-6.33154],[53.36031,-6.3319],[53.36017,-6.33233],[53.36004,-6.33211],[53.35889,-6.33231],[53.35897,-6.33142],[53.35914,-6.33164],[53.35968,-6.33173],[53.35978,-6.33155],[53.35999,-6.33182],[53.36079,-6.33115],[53.36019,-6.32831],[53.36,-6.32785],[53.35967,-6.32798]],
  "w41678607": [[53.3479,-6.31479],[53.34879,-6.31341],[53.34879,-6.31312],[53.34844,-6.31218],[53.34802,-6.31183],[53.34681,-6.31909],[53.34655,-6.32209],[53.34631,-6.32758],[53.34644,-6.32827],[53.34656,-6.32825],[53.34685,-6.32811],[53.34711,-6.32733],[53.34669,-6.3272],[53.34684,-6.32502],[53.3473,-6.32494],[53.34711,-6.32434],[53.34684,-6.3242],[53.34676,-6.32392],[53.34705,-6.31946],[53.34776,-6.31543],[53.34778,-6.31458],[53.34768,-6.31426],[53.34781,-6.3134],[53.34785,-6.31399],[53.34802,-6.31385],[53.34814,-6.31415],[53.34793,-6.31442]],
  "w1041793455": [[53.36083,-6.32275],[53.36092,-6.32263],[53.36069,-6.32244],[53.36074,-6.32223],[53.36049,-6.32137],[53.36091,-6.3217],[53.36087,-6.32227],[53.36107,-6.3223],[53.36117,-6.32215],[53.36106,-6.32165],[53.36114,-6.32127],[53.36146,-6.32093],[53.36109,-6.3202],[53.36104,-6.32045],[53.36076,-6.32034],[53.36054,-6.32075],[53.36054,-6.32036],[53.36032,-6.32039],[53.36003,-6.32074],[53.35979,-6.32155],[53.35966,-6.32101],[53.3592,-6.32015],[53.35961,-6.31982],[53.35957,-6.31962],[53.35984,-6.31958],[53.35995,-6.31908],[53.35967,-6.3188],[53.35906,-6.31925],[53.35875,-6.3182],[53.35841,-6.31842],[53.3588,-6.31979],[53.35966,-6.32188],[53.35978,-6.3227],[53.36037,-6.32439],[53.36068,-6.32399],[53.36064,-6.32382],[53.36081,-6.32341],[53.36056,-6.32328],[53.36076,-6.32314],[53.36051,-6.32281],[53.36083,-6.32287]],
  "w473824709": [[53.35858,-6.32701],[53.358,-6.32751],[53.35779,-6.32815],[53.35805,-6.33024],[53.35796,-6.33079],[53.35752,-6.33192],[53.35731,-6.33301],[53.35764,-6.33293],[53.3577,-6.33239],[53.35784,-6.33264],[53.35813,-6.33247],[53.35811,-6.33187],[53.35785,-6.33162],[53.35839,-6.32954],[53.35833,-6.32925],[53.35818,-6.32926],[53.35816,-6.32822],[53.35826,-6.32778],[53.35869,-6.32752],[53.35875,-6.32786],[53.35918,-6.32765],[53.35935,-6.32736],[53.35938,-6.32638],[53.35923,-6.32615],[53.35724,-6.32532],[53.35681,-6.32567],[53.35712,-6.32572],[53.35722,-6.32609],[53.35703,-6.32646],[53.35738,-6.32629],[53.35746,-6.32675],[53.35728,-6.32719],[53.35756,-6.32707],[53.35773,-6.32757],[53.35793,-6.32732],[53.35807,-6.3262],[53.35827,-6.32645],[53.35834,-6.32684],[53.35862,-6.32677]],
  "w1025236958": [[53.36165,-6.32903],[53.36078,-6.32684],[53.36098,-6.32708],[53.36116,-6.32689],[53.36094,-6.32649],[53.3609,-6.32604],[53.36147,-6.326],[53.36276,-6.32546],[53.36276,-6.3257],[53.36229,-6.32629],[53.36228,-6.32652],[53.36252,-6.3262],[53.36284,-6.32611],[53.36296,-6.32639],[53.36289,-6.32667],[53.36231,-6.32684],[53.36234,-6.32714],[53.36264,-6.32722],[53.36263,-6.32765],[53.36275,-6.3279],[53.3625,-6.32923],[53.36212,-6.32934],[53.36198,-6.32898]],
  "w41678685": [[53.35504,-6.32287],[53.3547,-6.32231],[53.3542,-6.32222],[53.35411,-6.32258],[53.3539,-6.32207],[53.35409,-6.32161],[53.35553,-6.32097],[53.35614,-6.32138],[53.35626,-6.32184],[53.35618,-6.32375],[53.35601,-6.3243],[53.35504,-6.32377],[53.35452,-6.32322]],
  "w651252741": [[53.34724,-6.33668],[53.34768,-6.33573],[53.34764,-6.33549],[53.34785,-6.33513],[53.34782,-6.33469],[53.3476,-6.3345],[53.34743,-6.33402],[53.34715,-6.33382],[53.34697,-6.33331],[53.3471,-6.33288],[53.34724,-6.33283],[53.3471,-6.33257],[53.34717,-6.33195],[53.34707,-6.33178],[53.34686,-6.33191],[53.34682,-6.33154],[53.34677,-6.33186],[53.34669,-6.33167],[53.34681,-6.33125],[53.34675,-6.33108],[53.34689,-6.33072],[53.34667,-6.33021],[53.34645,-6.33082],[53.34663,-6.33402],[53.34692,-6.33405],[53.34684,-6.33427],[53.34693,-6.33469],[53.34709,-6.33479],[53.34707,-6.33499],[53.34724,-6.33498],[53.34713,-6.33553],[53.347,-6.33555],[53.34703,-6.33513],[53.3467,-6.33498],[53.3468,-6.33634],[53.34709,-6.3367]],
  "w41678684": [[53.35568,-6.32443],[53.35575,-6.32466],[53.35502,-6.32521],[53.3545,-6.32554],[53.35417,-6.32546],[53.35392,-6.32494],[53.35384,-6.32392],[53.35354,-6.3231],[53.35352,-6.3226],[53.35365,-6.3224],[53.355,-6.32407]],
  "w1278340227": [[53.35733,-6.31244],[53.35733,-6.31331],[53.35792,-6.31596],[53.35822,-6.31672],[53.35779,-6.31689],[53.35763,-6.31662],[53.35735,-6.31527],[53.35697,-6.31393],[53.35687,-6.31192],[53.35698,-6.31231],[53.35729,-6.31211]],
  "w651252743": [[53.34943,-6.33294],[53.34926,-6.33256],[53.34851,-6.3317],[53.34815,-6.32973],[53.34805,-6.33003],[53.3478,-6.33013],[53.34812,-6.3312],[53.34826,-6.33161],[53.34813,-6.33208],[53.34817,-6.33245],[53.348,-6.33267],[53.34812,-6.33302],[53.34871,-6.33299],[53.34923,-6.33374],[53.34932,-6.3337]],
  "w41678749": [[53.35244,-6.31949],[53.35257,-6.31957],[53.35273,-6.32031],[53.35284,-6.32033],[53.35315,-6.32217],[53.35305,-6.32237],[53.35267,-6.32209],[53.35203,-6.32075],[53.35184,-6.32005],[53.35224,-6.31953]],
  "w246783369": [[53.34942,-6.30437],[53.34894,-6.30531],[53.3486,-6.30722],[53.34845,-6.30719],[53.34838,-6.30195],[53.34841,-6.30168],[53.34859,-6.30185],[53.34877,-6.30321],[53.34871,-6.30421],[53.34898,-6.30483],[53.34915,-6.30449],[53.34942,-6.30422]],
  "w41678688": [[53.35529,-6.31697],[53.3549,-6.31699],[53.35474,-6.31765],[53.35416,-6.31795],[53.35394,-6.3184],[53.35368,-6.31853],[53.35371,-6.31888],[53.35415,-6.31891],[53.35441,-6.31834],[53.35458,-6.31826],[53.35566,-6.31833],[53.35566,-6.31775]]
}
```

---

## 2. Reference images (`refs/phoenix-park/`)

All are from Wikimedia Commons, downloaded as 960 px or 1280 px thumbnails. **None come from Google.** Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-wellington-monument-from-road.jpg | [geograph 6000396](https://commons.wikimedia.org/wiki/File:Wellington_Monument,_Phoenix_Park_-_geograph.org.uk_-_6000396.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | **Key elevation** from beside Chesterfield/Wellington Rd, overcast. Stepped pyramid base, two-stage pedestal with a bronze panel, upper plinth, shaft, pyramidion; black railings in front |
| 02-wellington-monument-aerial-stepped-base.jpg | [geograph 4689923](https://commons.wikimedia.org/wiki/File:Wellington_Monument,_Phoenix_Park,_Dublin,_aerial_2015_-_geograph.org.uk_-_4689923.jpg) | Chris | CC BY-SA 2.0 | 2015-10-02 | **Aerial from the south**: the obelisk on its lawn, tree belts, Chesterfield Ave behind, Conyngham Rd, the Liffey strip and Heuston yards in front. Shows the park's clump-and-lawn texture |
| 03-wellington-monument-pedestal-plaques.jpg | [geograph 7877426](https://commons.wikimedia.org/wiki/File:The_Wellington_Monument,_Phoenix_Park,_Dublin_-_geograph.org.uk_-_7877426.jpg) | Marathon | CC BY-SA 2.0 | 2024-08-03 | **Pedestal detail**, sunlit: two bronze relief panels, the stepped plinths, the raking steps all round, battle names cut into the shaft |
| 04-wellington-obelisk-peoples-garden-pond.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Wellington_obelisk_and_People%27s_Garden_pond.jpg) | Laurel Lodged | CC BY-SA 4.0 | 2021-04-03 | People's Garden pond with willow, rolling lawns, the obelisk over the trees |
| 05-chesterfield-avenue-lamps.jpg | [geograph 6000374](https://commons.wikimedia.org/wiki/File:Chesterfield_Avenue,_Phoenix_Park_-_geograph.org.uk_-_6000374.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | **Road-level Chesterfield Ave**: 2 lanes, hatched centre, cycle lane, gas lamps both sides, black railings, dark tree wall |
| 06-chesterfield-avenue-view-west.jpg | [geograph 3233867](https://commons.wikimedia.org/wiki/File:View_west_along_Chesterfield_Avenue,_Phoenix_Park_-_geograph.org.uk_-_3233867.jpg) | Eric Jones | CC BY-SA 2.0 | 2012-07-25 | **Driver's eye, the long straight west**: lamps, railings, the tree tunnel. Before the cycle-track conversion |
| 07-parkgate-entrance-gates.jpg | [geograph 6000369](https://commons.wikimedia.org/wiki/File:Gates_to_Phoenix_Park,_Chesterfield_Avenue_-_geograph.org.uk_-_6000369.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | **Parkgate piers from inside**: 4 round piers with ribbed domes and lanterns, cobbled island with planters, square pedestrian gateways |
| 08-parkgate-street-entrance-2022.jpg | [Commons](https://commons.wikimedia.org/wiki/File:01_Parkgate_Street_entrance_2022.jpg) | Laurel Lodged | CC BY-SA 4.0 | 2022-02-06 | **Pier close-up** from outside: ashlar coursing, moulded cornice, gadrooned cap, lantern; Parkgate St beyond |
| 09-phoenix-monument-roundabout.jpg | [geograph 3233925](https://commons.wikimedia.org/wiki/File:The_Phoenix_Monument,_Phoenix_Park_-_geograph.org.uk_-_3233925.jpg) | Eric Jones | CC BY-SA 2.0 | 2012-07-25 | **Driver's approach** to the Phoenix roundabout: the column on its cobbled island, a keep-left bollard, hatched splitter |
| 10-phoenix-monument-column.jpg | [geograph 6004581](https://commons.wikimedia.org/wiki/File:Phoenix_Park_Monument_-_geograph.org.uk_-_6004581.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | **Column elevation**: fluted shaft, Corinthian capital, phoenix, inscribed pedestal, stepped base with squat plinths (partly sheeted for works), setts |
| 11-aras-an-uachtarain-entrance.jpg | [geograph 6004802](https://commons.wikimedia.org/wiki/File:Entrance_to_%C3%81ras_an_Uachtar%C3%A1in_-_geograph.org.uk_-_6004802.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | **Áras gates**: white gates between granite piers with urns, two granite lodges, white railings and lamps, flags |
| 12-papal-cross.jpg | [geograph 6016465](https://commons.wikimedia.org/wiki/File:Papal_Cross,_Phoenix_Park_-_geograph.org.uk_-_6016465.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | The Papal Cross on its mound across Fifteen Acres, during setup for the 2018 papal Mass (crane, fencing). Shows the open-plain scale |
| 13-fallow-deer-herd.jpg | [geograph 6016502](https://commons.wikimedia.org/wiki/File:Herd_of_Fallow_Deer,_Phoenix_Park_-_geograph.org.uk_-_6016502.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | **Fallow deer herd** on Fifteen Acres (bucks, spotted and dark coats), goalposts, **the Wellington obelisk on the skyline ≈2 km away** |
| 14-peoples-garden.jpg | [geograph 2577180](https://commons.wikimedia.org/wiki/File:People%27s_Garden,_Phoenix_Park,_Dublin_-_geograph.org.uk_-_2577180.jpg) | P L Chadwick | CC BY-SA 2.0 | 2010-09-12 | People's Garden: pond, hoop-top railings, sloping lawns, specimen trees, parked cars on Chesterfield behind |
| 15-north-circular-road-entrance-2022.jpg | [Commons](https://commons.wikimedia.org/wiki/File:03_North_Circular_Road_entrance_2022.jpg) | Laurel Lodged | CC BY-SA 4.0 | 2022-02-06 | **NCR gate**: white cast-iron screens, "IN" plate, lanterns; the NCR as a plane-lined avenue; the gate lodge left |
| 16-park-fingerpost-magazine-fort-sign.jpg | [Commons](https://commons.wikimedia.org/wiki/File:The_Magazine_Fort_-_Phoenix_Park_-_Dublin_(2506197173).jpg) | William Murphy | CC BY-SA 2.0 | 2008-05-11 | **Not the fort itself.** The OPW bilingual fingerpost ("Dún na hArmlainne / Magazine Fort", white plate with pointing hand, black post with ball finial) and horse chestnuts in flower. Good for park signage |

Useful Commons candidates not downloaded (Commons rate-limited this session):
- `Wellington Monument, Phoenix Park - geograph 6000388/6000394` (portrait, plaques)
- `The Wellington Monument … geograph 7877427/7877428`
- `Chesterfield Avenue … geograph 6002067/6004578/6004836`
- `Phoenix Park Gates, Chesterfield Avenue - geograph 5199560`
- `Gates of Áras an Uachtaráin.jpg` (CC BY 2.0)
- `Papal Cross … geograph 6016486` and `Papal Cross, Phoenix Park viewed from side.jpg` (2026)
- `Poenix Park Magazine sud est.jpg` (the actual fort, CC BY-SA 3.0)
- `Dublin Magazine Fort, Phoenix Park, aerial 2015 - geograph 4689877`
- `Wellington Monument aerial 2015 - geograph 4689930`
- `Deer by papal cross.jpg`
- the Category "Deer in Phoenix Park" (40 files)

---

## 3. Landmark profiles

### 3.1 Wellington Monument (Wellington Testimonial)

**Facts (VERIFIED):**
- A freestanding **granite obelisk, 62 m (203 ft)**, the tallest obelisk in Europe. Designed by **Sir Robert Smirke**. Foundation stone **1817**, shaft raised **1822**, completed and opened **18 June 1861** (Wikipedia; NIAH 50060116).
- Geometry: "a tapering, four-sided shaft with pyramidal apex, on three-stepped monumental pedestal". The pedestal stands on "a square-plan stylobate of **nine raking steps** on raised flat-topped earthen mound", reached on the **east** side by **eight granite steps with closed granite strings** (NIAH).
- The pedestal is **56 ft (17.1 m) square and 24 ft (7.3 m) high** (Victorian Web / Curious Ireland, after the 19th-century description).
- **Four bronze plaques cast from cannon captured at Waterloo:**

| Face | Subject | Sculptor |
|---|---|---|
| North | *Waterloo* | Thomas Farrell |
| West | *Civil and Religious Liberty* | John Hogan |
| South | *Indian Wars* (sieges and battles in India) | Joseph R. Kirk |
| East | Inscription panel | |

  The east inscription reads: "Asia and Europe, saved by thee, proclaim / Invincible in war thy deathless name, / Now round thy brow the civic oak we twine / That every earthly glory may be thine." (NIAH, Wikipedia).
- A planned equestrian statue flanked by lions was never made.
- Battle names are cut into the shaft faces (ref 03).

**Position and orientation (VERIFIED from OSM):**
- Centre 53.34905, -6.30311, about 200 m south-west of the People's Garden roundabout. The lawn runs down to Conyngham Road; Wellington Road passes its north side.
- The OSM outline (`40498842`, 1,300 m²) is the outer step square, **≈35.5 m a side, rotated ≈16° clockwise**: the "north" face normal bears ≈016°, the east face ≈106°.

**Dimensions (est. from refs 01 and 03, scaled to 62 m total and the 17.1 m pedestal; ±10%):**

| Part | Height | Plan | Note |
|---|---|---|---|
| Earth mound + 9 raking steps | ≈3 m | 35.5 m square at the foot, ≈19 m at the top | Rise ≈0.3 m, tread ≈0.9 m |
| Pedestal, lower plinth course | ≈2 m | 17.1 m | Plain ashlar |
| Pedestal die with the 4 bronze panels | ≈4.5 m | ≈15 m | Panels ≈9 m x 1.6 m, dark bronze in a slightly recessed frame |
| Pedestal cornice | ≈0.8 m | ≈16 m | Simple projecting cornice |
| Upper plinth (shaft base block) | ≈2.5 m | ≈10.5 m | Two setbacks |
| Shaft | ≈46 m | ≈8.8 m at the base tapering to ≈3.5 m | Visible horizontal ashlar courses (≈0.6-0.8 m), inscribed names |
| Pyramidion | ≈3 m | | Plain |

**Colours** (sampled from refs 01 and 03, then adjusted):

| Surface | Hex |
|---|---|
| Granite, sunlit | `#b0b2a9` |
| Granite, overcast | `#8c8c84` |
| Granite, shadow side | `#5c5f5e` |
| Weathered steps (lichen streaks) | `#72736a` |
| Bronze plaques | `#1c1f1e` with verdigris hints `#3d4c44` |
| Lawn | `#637847` |

### 3.2 Phoenix Monument (Phoenix Column)

**Facts (VERIFIED, NIAH 50060100 and Archiseek):**
- A freestanding **Portland stone Corinthian column, erected 1747** by the **4th Earl of Chesterfield**, "surmounted by stone phoenix and set on stepped base".
  - A "full-height fluted" shaft and a Corinthian capital.
  - A plinth with **inscribed marble plaques east and west** and **carved coats of arms north and south**.
  - A **granite ashlar stepped base with four squat Portland limestone plinths framing bowed stepped sections**.
  - It sits "within circular-plan platform of stone setts" at the centre of the Chesterfield/Acres Road/Odd Lamp Road roundabout.
- The column is "**thirty feet**" (9.1 m) (Wikipedia, Archiseek).
- History: repositioned in the 1830s onto Burton's axis. **Moved in 1929** to a lawn near the Áras demesne for the motor races. **Returned to the roundabout** under the 1986 management plan (in the 1990s).
- The OPW has floodlit it (gov.ie press release).

**Dimensions (est. from ref 10, taking 9.1 m as the column shaft):**

| Part | Height / size |
|---|---|
| Stepped base | ≈2.5 m, ≈8 m across; 4 squat corner plinths ≈1.2 m high |
| Pedestal | ≈3.4 m high, ≈2.2 m square |
| Column with capital | ≈9.1 m, shaft ≈0.9 m diameter |
| Phoenix | ≈2 m |
| **Total** | **≈17 m** |

- The sett roundabout island is ≈40 m across (OSM ring radius ≈20 m).
- Gas lamps stand at the island edge (ref 10).

**Colours:**

| Surface | Hex |
|---|---|
| Portland stone (lit) | `#c9c4b8` (est.) |
| Portland stone (overcast) | `#88857e` |
| Weathered grey streaks | `#54514e` |
| Setts | `#787879` |

### 3.3 Parkgate entrance and lodges

- **Piers (VERIFIED, NIAH 50060017, ref 08):** "two pairs of round-plan ashlar limestone piers" with "simple moulded plinths and cornices, gadrooned caps and … electrified wrought-metal and glass lanterns".
  - Built c.1810; dismantled 1932; re-erected 1986.
  - Est. sizes: pier diameter ≈1.5 m, cornice ≈4 m, dome cap ≈1 m, lantern ≈1.2 m, **total ≈6.3 m**.
  - The inbound and outbound pairs frame two ≈6-7 m carriageways either side of a ≈8 m cobbled island (ref 07).
  - The square-headed pedestrian gateways at each side are ≈4 m high, of rusticated ashlar with a flat lintel.
- **Lodges (VERIFIED, NIAH 50060015/50060016):** single-storey, 1811, painted render, natural slate hipped roofs, pedimented fronts or breakfronts, tall rendered chimney, 8-over-8 sashes. The pedimented one-cell lodge (MDCCCXI date stone) sits inside railings on Chesterfield with its back to Conyngham Road.
- **Colours:**

| Surface | Hex |
|---|---|
| Limestone ashlar, lit | `#8f8f8c` |
| Limestone ashlar, overcast | `#79797b` |
| Limestone ashlar, dark courses | `#484744` |
| Lantern ironwork | `#1d2022` |
| Lodge render | `#d8d2c2` (est.) |
| Slate | `#4a4f55` |

### 3.4 Victorian lamp standard (Chesterfield Avenue)

- **Facts:** gas; ornate cast iron; 224 in service; lit at dusk by the Flanagan family of lamplighters, with 1920s clockwork timers wound every 14 days; restored in the 1980s (visitdublin.com, VERIFIED).
- **Form (est. from refs 05-07):**
  - A fluted, flared base ≈0.5 m across and ≈1 m high.
  - A slender shaft of ≈0.12 m tapering to a collar at ≈3.3 m.
  - A **ladder crossbar** under the lantern.
  - A **4-sided tapered glass lantern** (≈0.4 m square at the top, ≈0.9 m tall) with a crown cap and finial.
  - **Total ≈5 m.**
- Paint black (`#1d2022`; lit ≈`#31363b`).
- **Spacing:** ≈30-35 m, both kerbs, roughly opposite each other.
- **Night look:** warm, slightly reddish gas light `#ffb36a` at low intensity (the lamplighter's "reddish glow"). Soft ground pools ≈8 m across, much dimmer than the city's LED heads. **No real lights**: use an emissive lantern plus an instanced decal pool.

### 3.5 Other landmarks

- **Áras an Uachtaráin:** built 1754 (Wikipedia). The house (OSM 53.35985, -6.31730) lies ≈570 m ENE of the Phoenix Monument in its demesne and is **not visible from Chesterfield** through the trees. It is not worth modelling. The hero is **the gate group at the roundabout** (§1.5, ref 11).
- **US Ambassador's Residence (Deerfield):** built 1776; the US residence since 1927 (Wikipedia). At 53.35821, -6.33356, behind its wall, 556 m SW of the monument. A generic Georgian house block behind trees and a wall is enough.
- **Papal Cross:** 35 m (VERIFIED), erected for Pope John Paul II's Mass on 29 September 1979. Architect Ronnie Tallon (OSM). A white-painted steel cross on a grassed mound.
- **People's Flower Gardens:** 9 ha, laid out from 1840, opened 1864 (Wikipedia). Victorian bedding, the pond, specimen trees, hoop-top railings. Its gates face Chesterfield near PX11-PX12.
- **Magazine Fort:** built 1734 on the site of the 1611 Phoenix Lodge, and raided in the 1939 Christmas Raid (Wikipedia). OSM tags it NIAH 50060115, heritage 4, "Access via the Visitor Centre". A star-plan earthwork and walled fort on a knoll, with low single-storey buildings inside.
- **Dublin Zoo:** a Victorian ticket building at 53.35269, -6.30506 on the zoo side. A good generic "entrance" set piece, not a hero.

### 3.6 Five recognisable cues

1. **The 62 m granite obelisk on its stepped pyramid base.** It is visible over the trees from Chesterfield, Conyngham Road and the quays, and even from Fifteen Acres 2 km away (refs 01, 02, 04, 13).
2. **Chesterfield Avenue's dead-straight tree tunnel.** Black Victorian gas lamps on both kerbs every ~30 m, low black railings, a hatched centre line, green walls of trees (refs 05, 06).
3. **The Phoenix column** standing alone on a cobbled roundabout at the park's centre (refs 09, 10).
4. **The Parkgate piers:** four round stone drums with ribbed domes and lanterns, and a cobbled island (refs 07, 08).
5. **Fallow deer herds on open grass**, with **white gates** at the Áras and the NCR (refs 11, 13, 15).

---

## 4. Build brief (prioritised)

### P0: data and projection (next phase)

1. **Projection.** Add a park band to `geo.js`: an X-only band west of lon -6.2985 with k = 0.7 (net 0.35 of real). It stacks with the existing `warpX` west shift. Tell the NCR, SCR and quays agents: **RN50 (NCR gate) is outside the band; PX05 (Islandbridge/SCR) is inside it.**
2. **Streets.** Add the §1.8 nodes and ways.
   - `bounds` are now west -6.30 and north 53.3672. Extend `bounds.west` to about -6.335 for area B.
   - Optionally move `PG1` and `IR1` to the real Infirmary Road line (-6.2950).
3. **Park polygon** "Phoenix Park" (PXB0-PXB17).
   - Suppress the generic perimeter path and cross paths for this park.
   - Give the cut edges (PXB15 → PXB0) a dense tree-belt treatment so the map edge reads as woodland, not a wall.
4. **New way style `park-avenue`** for Chesterfield and optionally Conyngham Road:
   - gas lamps both sides every ~30 game m (instanced);
   - black railing strips behind the footpath;
   - tree rows 6-10 m back from the kerb, mixing lime, horse chestnut, beech and dark holm-oak clumps near Parkgate;
   - no filler buildings (the park polygon already blocks them);
   - `people.js` density ≈0.3;
   - AI at 30 km/h (≈8 m/s).
   - Other park lanes get lamps only on Chesterfield, North Road near the gate and Fountain Road. Wellington, Khyber, Military and Acres Roads are **unlit** (OSM `lit=no`), which makes a dark, atmospheric night drive.
5. **Water:** the People's Garden pond and the Dog Pond as small ponds with reeds.
6. **Liffey:** extend the channel west to Islandbridge, ≈30 m wide, 50-100 m south of Conyngham Road.

### P1: hero GLBs (Blender, `tools/blender/`, same kit as `build_heuston.py`)

7. **Wellington Monument** (`wellington.glb`). **Budget ≈5k tris, ceiling 8k.**
   - Build at real size.
   - Keep heights real (62 m: this is the park's skyline marker and should be seen from the city).
   - Scale plan ≈0.8 (the step square becomes ≈28 m); the tall thin shaft survives compression.
   - Origin at the centre of the base at ground level. Rotate faces ≈16° clockwise (north face normal bearing 016°).
   - Materials: `wm_granite`, `wm_bronze`, `wm_decal`. AO baked into vertex colour as in `kit.bake_ao_vertex`.

| Part | Tris | Notes |
|---|---|---|
| Mound + 9 raking steps all round | ~450 | Each ring = 4 risers + 4 treads with mitred corners; a low 4-sided earth apron below (grass material) |
| East flight of 8 steps with closed strings | ~250 | Sits on the pedestal's east face |
| Pedestal: lower plinth, die, cornice, 2-stage upper plinth | ~1,000 | Chamfered edges (`kit` bevel) and a cornice profile of 3-4 stacked mouldings |
| 4 bronze panels | ~200 | Slightly recessed frames with the relief as **texture plus normal map**, not geometry. Decal regions: N *Waterloo* (Farrell), W *Civil and Religious Liberty* (Hogan), S *Indian Wars* (Kirk), E inscription. Each 1024 x 192 in a 1024² plaque atlas |
| Shaft | ~800 | 4 faces, 12 horizontal segments for AO banding and course lines, bevelled arrises. World-projected granite with course joints every 0.7 m; a battle-name inscription strip decal on each face |
| Pyramidion | ~50 | |
| LOD1 (beyond ~400 m) | ~300 | Obelisk + stepped box. This matters: it is visible from much of the map |

   **Night:** real floodlighting is unconfirmed (§5). Suggest a subtle warm uplight (vertex-colour gradient or a cheap emissive term on the lower shaft) so the silhouette reads against the night sky.
8. **Phoenix Monument** (`phoenixcolumn.glb`). **Budget ≈2.5k tris.**

| Part | Tris | Notes |
|---|---|---|
| Circular sett platform | ~100 | Roundabout island is the road builder's job |
| Granite stepped base with 4 squat plinths and bowed steps | ~500 | |
| Pedestal with plaques and arms | ~250 | Decals |
| Fluted column | ~500 | 20-sided with a flute normal map, slight entasis, torus base |
| Corinthian capital | ~400 | Flared block with acanthus as alpha cards or texture |
| Phoenix | ~600 | Low-poly sculpt: wings raised, rising from a flame nest. Or a crossed pair of alpha cards if the budget is tight |

   **Night:** OPW floodlighting (VERIFIED) in white, plus gas lamps around the island.
9. **Park gates kit** (`parkgates.glb`, shared). **≈4k tris total.**

| Piece | Tris | Notes |
|---|---|---|
| Parkgate round pier (x4 instances) | ~350 each | Drum, moulded base and cornice, 16-segment gadrooned dome (ribs in the normal map), lantern |
| Parkgate pedestrian gateway (x2) | ~150 each | Rusticated square-headed gateway |
| 1811 pedimented lodge | ~400 | |
| 3-bay hipped lodge | ~500 | |
| NCR gate screens | ~400 | White cast iron as **alpha cards**: openwork piers with lanterns, "IN"/"OUT" plates |
| Áras gate group | ~1,200 | 2 granite piers with urns, white wrought-iron double gates (alpha), 2 small granite lodges with pyramid roofs and chimneys, white railings (alpha strip), 4 white lamp standards (recolour the Victorian lamp) |

10. **Victorian lamp standard** (`gaslamp.glb`). **LOD0 ≈300 tris, LOD1 ≈60.**
    - One InstancedMesh for posts and one for the emissive lanterns.
    - Colours: black `#1d2022`, glass `#e8d9b0` by day and emissive `#ffb36a` at night.
    - Build the pool decal instances in the same batch (cf. BUILD-REPORT's note that lamps and light pools are an instancing hotspot).

### P1: ambient deer

11. **Fallow deer.**
    - Low-poly deer (~350 tris; LOD1 a 40-tri silhouette) with 3 coat variants: fawn with white spots `#8f7357`, dark melanistic `#3a2e26`, pale `#cbbfa6`. Bucks with palmate antlers (~60 tris extra).
    - Herds of 8-20 grazing on open grass: Fifteen Acres' east edge and the Papal Cross, the lawns south of the Phoenix Monument, and occasionally the Wellington field.
    - Simple boids behaviour:
      - graze and wander ≤0.5 m/s;
      - lift heads and bunch when the car is within ~40 m;
      - trot away at ~5 m/s when it is within ~20 m off-road or honking;
      - occasionally cross Chesterfield or Acres Road in a line, so AI traffic stops.
    - 2-3 herds of about 40 animals in total are enough. Animate with a vertex-shader walk cycle (no skinning) to stay cheap.
    - Sound (later): rutting groans in October.

### P2: set dressing

12. **Papal Cross:** 35 m white steel cross (two box beams, ~100 tris) on a grassy mound with steps.
13. **Magazine Fort:** a star-shaped earth rampart (extruded OSM outline) with a low wall and 2-3 roof blocks, on a knoll. Generic.
14. **Zoo edge:** a boundary railing and hedge along the OSM outline, the Victorian ticket lodge at the entrance, and treetops beyond. Generic.
15. **People's Garden:** colourful bedding patches (instanced flowerbed quads, red `#c0392b`, yellow `#e3b505`, purple `#6c3a8c`), hoop-top railings, the pond, a *Cedrus* and a willow.
16. **Bandstand in the Hollow, Tea Rooms, Garda HQ, Deerfield house:** generic blocks and props.
17. **Fingerposts:** white plates with black Gaelic-script and Roman text and a pointing hand, on black posts with ball finials (ref 16).

**Textured:** Wellington Monument (granite courses, plaques, inscriptions), Phoenix column (flutes, capital), pier caps, lantern glass, gate ironwork alphas.
**Generic:** lodges, Deerfield, zoo lodge, Tea Rooms, Garda HQ, Magazine Fort, bandstand.

**Triangle budget for the area:**

| Item | Tris |
|---|---|
| Wellington Monument | ~5k |
| Phoenix Monument | ~2.5k |
| Gates kit | ~4k |
| Lamps (≈80 visible x 300 at LOD0, instanced) | ~24k, but a single draw call |
| Deer (40 x 350) | ~14k in 1-2 draws |
| Dressing | ~3k |
| **Unique hero geometry** | **≈14.5k** |

The draw calls to watch are the tree clumps. At 18% woodland over ≈0.9 x 1.0 game km, use a woodland-clump impostor (a big textured canopy mesh per clump) rather than per-tree instances beyond ~150 m.

---

## 5. Open questions

1. **Compression choice.** X-only band net 0.35 is recommended (keeps the NCR stitch exact, keeps the straight straight). Do we accept that Chesterfield turns from 35° to 45° off east, and that the park looks N-S elongated? The alternative is a lat band as well (north of 53.3525, west of -6.2985 only), but that makes a non-separable warp and needs the north-ring agent's agreement.
2. **Where does the map end?** The west cut at lon -6.3345 (just past Furze Road) and the north cut at lat 53.365 are not real walls. Options: a dense woodland belt plus "road closed" barriers on Chesterfield (PX23), Acres Road (PX45) and North Road (PX62), or fog. Should the Castleknock end be a future extension?
3. **Wellington Road vs Military Road.** OSM names way `521080916` "Wellington Road" but tags `name:en=Military Road` and links logainm 1425107 (Bóthar na Míleata), with a fixme. Which name should the HUD show? Suggest "Wellington Road" (the common name) until checked on site.
4. **Gate status for cars.** Press reports say only Parkgate, Castleknock and NCR are open to cars. OSM does not mark the Islandbridge, Cabra or Chapelizod gates closed, and marks Military Road's bollards as `motor_vehicle=permissive` (fixme). Should the game treat these as `access: "pedestrian"` (player can still drive through slowly) or open them for driving loops?
5. **Night floodlighting.** The Phoenix column's OPW floodlighting is VERIFIED. Is the Wellington Monument lit at night? Not confirmed; needs a night photo.
6. **"Citadel Pond"** was named in the brief but does not exist in OSM in area B. Candidates are the People's Garden pond and the Dog Pond. Confirm which pond is meant.
7. **Exact heights.** The obelisk subdivision (§3.1) and the Phoenix column total (≈17 m) are photo estimates. A survey drawing or measured photo would settle them.
8. **Chesterfield width and lamp spacing.** Kerb-to-kerb and lamp spacing are estimates (14-16 m; 30-35 m). Aerial imagery with a compatible licence, or Mapillary, would settle them.
9. **Hero scale.** Should the obelisk keep real height with plan x0.8, in line with the other heroes (plan 0.5-0.6x, heights ≈real)? The thin shaft tolerates less plan compression than a building.
10. **Liffey/Conyngham strip.** The houses and apartments between Conyngham Road and the river (Wellington House, Kingsbridge House, Bridgewater Quay): do they come from the filler generator, or should that strip stay open to show the river?
11. **Tree species along Chesterfield.** Horse chestnut and beech (post-Burton) and lime are documented; the dark clumps near Parkgate look like holm oak. Confirm on site before painting the tree atlas.

## Sources

- OSM via Overpass (ODbL): `data/osm/phoenix-park.json` (park relation `4423275`, roads, gates, woods, water, landmarks)
- [Phoenix Park, Wikipedia](https://en.wikipedia.org/wiki/Phoenix_Park): area, wall, deer, Phoenix Monument, Papal Cross, People's Garden, Magazine Fort, Áras, Deerfield, Burton lodges
- [Wellington Monument, Dublin, Wikipedia](https://en.wikipedia.org/wiki/Wellington_Monument,_Dublin)
- [NIAH 50060116, Wellington Monument](https://www.buildingsofireland.ie/buildings-search/building/50060116/wellington-monument-phoenix-park-chapelizod-dublin-dublin-city)
- [Victorian Web, Wellington Testimonial by Robert Smirke](https://victorianweb.org/art/architecture/smirke/1.html) and [Curious Ireland, The Wellington Testimonial](https://curiousireland.ie/the-wellington-testimonial/): pedestal 56 ft square x 24 ft
- [NIAH 50060100, The Phoenix Monument](https://www.buildingsofireland.ie/buildings-search/building/50060100/the-phoenix-monument-castleknock-within-phoenix-park-dublin-city)
- [Archiseek, 1747 Phoenix Monument](https://www.archiseek.com/1747-phoenix-monument-phoenix-park-dublin/)
- [OPW, lighting up the Phoenix Column](https://www.gov.ie/en/office-of-public-works/press-releases/opw-announces-the-lighting-up-of-the-iconic-phoenix-column-in-the-phoenix-park/)
- [NIAH 50060017, Park Gate, Chesterfield Avenue](https://buildingsofireland.ie/niah/search.jsp?county=du&regno=50060017&type=record) (gate piers, via search summary)
- [NIAH 50060015, gate lodge, Chesterfield Avenue / Conyngham Road](https://www.buildingsofireland.ie/buildings-search/building/50060015/phoenix-park-chesterfield-avenue-conyngham-road-castleknock-within-phoenix-park-dublin-8-dublin-city)
- [NIAH 50060016, gate lodge, Park Gate Street](https://www.buildingsofireland.ie/buildings-search/building/50060016/phoenix-park-park-gate-street-dublin-8-dublin)
- [Archiseek, 1811 Main Entrance, Phoenix Park](https://archiseek.com/2010/1811-main-entrance-phoenix-park-dublin)
- [Visit Dublin, Phoenix Park lamplighters](https://www.visitdublin.com/guides/phoenix-park-lamplighters): 224 gas lamps, timers, light character
- [Irish Times, The future of Phoenix Park (2026-08-08)](https://www.irishtimes.com/ireland/dublin/2026/08/08/the-future-of-phoenix-park-how-historic-park-is-facing-challenge-of-an-expanding-city/): 30 km/h since Feb 2022, gate policy, 25,000 vehicles/day, North Road one-way
- [Irish Times, Phoenix Park gates to stay shut](https://www.irishtimes.com/news/environment/phoenix-park-gates-to-remain-closed-to-traffic-with-no-date-set-for-reopening-1.4289345) and [OPW press release on side gates](https://www.gov.ie/en/office-of-public-works/press-releases/opw-to-keep-side-gates-to-phoenix-park-closed-and-encourages-pedestrians-and-cyclists-to-enjoy-the-natural-landscape-of-the-park/) (403 to automated fetch; cited from search summary)
- [RTÉ Brainstorm, A potted history of change in the Phoenix Park](https://www.rte.ie/brainstorm/2019/0701/1059540-a-potted-history-of-change-in-the-phoenix-park/) and [phoenixpark.ie History](https://www.phoenixpark.ie/history/): Burton's avenue planting (elm, red-twigged lime; later horse chestnut and beech)
- Wikimedia Commons images as listed in §2 (`refs/phoenix-park/sources.json`)

# Southern canal ring (`canal-south`): Phase 1 research

Scope: the Camden Street nightlife strip (Wexford St, Camden St Lower/Upper, Richmond St South) down to La Touche (Portobello) Bridge; Harcourt Street with the Luas Green Line, the old Harcourt Street station, Harcourt Rd, Adelaide Rd and Hatch St; the Grand Canal from Robert Emmet (Harold's Cross) Bridge east to Mount Street (McKenny) Bridge, with its locks, bridges and canal-side roads on both banks; the South Circular Road / Harrington St and Clanbrassil St back up to the St Patrick's area; and the spokes back into the existing map (Leeson St, Baggot St, Fitzwilliam St, Mount St Upper, New Bride St / Heytesbury St).

- Raw OSM: `data/osm/canal-south.json`. Overpass `out geom`, main bbox **S 53.3280, W -6.2810, N 53.3395, E -6.2370** (about 2.9 km E-W by 1.3 km N-S). Snapshot `timestamp_osm_base` 2026-09-28T22:53:01Z, 7,792 elements. It holds highways (all drivable classes, plus footways/paths near the canal and all foot bridges), tram/rail and platforms, tram stops and crossings, waterways, canal/lock water polygons, lock gates, named buildings, every building in four small boxes (old Harcourt St station, Portobello House, Camden St, Harcourt St east side), historic/artwork nodes, pubs/bars/clubs, parks and trees.
- References: `refs/canal-south/` holds 16 images from Wikimedia Commons (credits in §2 and `refs/canal-south/sources.json`).
- Mapillary: **not used** (no token). OSM carries Mapillary IDs on Portobello House (`1182168040675873`) and the Richmond St South terrace (`1292472042308120`, `1118757780450193` and others) if a token turns up.
- Game coordinates come from re-implementing `project()` in `src/world/geo.js` (origin 53.34727/-6.25915, SCALE 0.5, the x1.6 E-W stretch band from -6.2675 to -6.2612, the N-S band which does not reach this far south). **Camden St (-6.2652) and Harcourt St (-6.2630) sit inside the E-W stretch band, so the gap between them is 1.6x wider in game than a plain half-scale map. Clanbrassil St and everything west of -6.2675 are shifted west.** Game x/z below already include this.
- The current map's south bound is 53.3345 (game z 711). This area needs **south = 53.3285** (z ≈ 1045); west and east bounds can stay.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 Seams with the existing map (VERIFIED against OSM)

The existing south-edge nodes were hand-placed and several are well off their real positions. New streets must either bend to them or the nodes should move.

| Node | Game has (lat, lon) | Real position (OSM) | Game error | Recommendation |
|---|---|---|---|---|
| `HC1` (Harcourt St, current Luas terminus) | 53.3352, -6.2624 | 53.33520, **-6.26322** | 44 game m too far east (the stretch band amplifies the 55 m real error) | **Move HC1 to 53.33520, -6.26322.** Otherwise Harcourt St kinks 33 m west at GXSHC2. |
| `HC0` (Harcourt St north end) | 53.3368, -6.2610, on the middle of SG South | Harcourt St leaves the **SW corner** of the Green, 53.33754, -6.26270 | The street starts 70 game m east of the real corner | Optional: re-home Harcourt St to `SGSW`. The Luas route already runs SGSW→HC0→HC1, so dropping HC0 from the street costs nothing. |
| `HC1` Luas stop "Harcourt" | at HC1 (53.3352) | Real Harcourt stop **53.33337, -6.26265**, in front of the old station | 100 game m too far north | Move the stop label to the new node `GXSHCS`. |
| `LE2` (Leeson St Lower end) | 53.3353, -6.2546 | Leeson St at that latitude is -6.2562 | 53 game m east | The new way LE2→GXSLE1 bends 22 m west over 50 m. That is acceptable; moving LE2 to 53.3353, -6.2562 is cleaner. |
| `SGSE` | 53.3366, -6.2554 | Real SE corner (Leeson St / Earlsfort Tce) 53.33614, -6.25726 | 62 game m east (the game Green is squared off) | Leave it. This is why Earlsfort Terrace is only proposed south of Hatch St. |
| `CU1` (Aungier / Cuffe / Kevin / Wexford) | 53.3376, -6.2653 | 53.33763, -6.26579 | ≈15 game m | Fine. |
| `NSS2` (New St South end) | 53.33632, -6.27315 | Clanbrassil St Lower starts at 53.33631, -6.27301 | ≈3 m | Reuse as-is. |
| `KV3` (Kevin St / Bride St) | 53.33815, -6.2693 | Kevin St Cross leaves at 53.33815, -6.26930 | exact | Reuse. |
| `BG1` (Baggot St Lower end) | 53.3374, -6.2498 | Baggot St at 53.3374 is -6.2502 | ≈15 m | Reuse. |
| `MSSE` (Merrion Sq SE) | 53.338, -6.2469 | Mount St Upper / Fitzwilliam St Lower corner 53.33823, -6.24771 | ≈30 m | Reuse. |
| `GT0`→`MT1` "Mount Street Lower" | MT1 = 53.33866, -6.2385 | Real Mount St Lower ends at **Mount Street Bridge, 53.33767, -6.24060**. MT1 sits on the real **Macquay's Bridge** (Grand Canal St, 53.33860, -6.23873). | The existing way leads to the wrong bridge | See §5 Q1. I propose a new `Mount Street Lower` way GT0→GXSMS1, and the east/Aviva researcher should re-label GT0→MT1. |

### 1.2 Street network (VERIFIED from OSM tags; one-way direction taken from node order)

**Camden spine (R114).**
- **Wexford St** runs CU1 → 53.33645, -6.26546 (Whelan's / Camden Row / Montague St corner). It is two-way, 2 lanes (`5826349`, `532427445`).
- **Camden St Lower** is two-way, 3-4 lanes, and ends at Charlotte Way / Grantham St, 53.334 (`1504018543`, `77616869`, `4628792`, `75741007`).
- **Camden St Upper** (53.33347 → 53.33260) is **one-way northbound**, 3 lanes (`4628793`, `1418028514`). The short piece between Charlotte Way and Camden St Upper (`59416356`) is also northbound only. **Southbound traffic on Camden St Lower must turn left into Charlotte Way** (one-way eastbound, `59416359`), go down Harcourt St and back west along Harcourt Rd.
- **Richmond St South** is two-way (split tagging: 1 lane south, 2 north, then 3 lanes shared) and runs to La Touche Bridge at 53.33023.
- **La Touche Bridge** (`4628799` etc.) runs 53.33023 → 53.32995. **Rathmines Road Lower** continues south from 53.32995, -6.26429.

**Harcourt Street (VERIFIED: OSM plus Wikipedia, "traffic is in a single direction only outwards from the intersection with Charlotte Way").**
- **North of Charlotte Way / Hatch St** (53.33409 → the Green) it is one-way **northbound**, 1 lane, tertiary (`4074526`, `317003251`), with the Luas on the carriageway.
- **South of Charlotte Way** (53.33375 → 53.33273) it is one-way **southbound**, 2 lanes, R114 (`4628791`).
- The street is ~21 m building line to building line (Wikipedia) and "a little over 0.6 km" long.
- **Harcourt Rd** is one-way **westbound** (R114/R811, 2-4 lanes) from Adelaide Rd (53.33276, -6.26141) to the Camden/Richmond junction (53.33260, -6.26486).
- **Adelaide Rd** is westbound-only for its west end (53.33274,-6.25887 → Harcourt Rd). It is two-way east of Earlsfort Tce to Leeson St (`525228766`).
- **Earlsfort Tce** south of Hatch St is southbound only (`23719580`).
- **Hatch St Upper / Lower** are two-way (R811 / tertiary) and link Harcourt St to Leeson St past the National Concert Hall.

**The Grand Canal and its bank roads (VERIFIED OSM; "north/south bank" by latitude).** In the city the canal runs WSW→ENE, so the banks are really NW and SE.

| Stretch | North (city) bank | South bank |
|---|---|---|
| Harold's Cross → Portobello | Portobello Rd / Portobello Harbour (residential lanes, no through road) | **Grove Road** (R111, two-way, 2 lanes) |
| Portobello → Charlemont | **Charlemont Mall** (one-way **westbound**, 1 lane, `13873188`) | **Canal Road** (R111, two-way) |
| Charlemont → Leeson | **Charlemont Place** (east to the Luas bridge, then Harcourt Terrace; beyond that only a towpath) | **Grand Parade** (R111, two-way) |
| Leeson → Baggot | **Wilton Terrace** (tertiary, two-way except a 40 m eastbound-only stub at Leeson St) | **Mespil Road** (R111, two-way) |
| Baggot → Huband | **Herbert Place** (tertiary, two-way) | **Haddington Rd** (R111) runs inland; **Percy Place** (residential) is on the bank |
| Huband → Mount St | **Warrington Place** (tertiary) | **Percy Place** → Northumberland Rd |

R111 on the south bank (Parnell Rd, Grove Rd, Canal Rd, Grand Parade, Mespil Rd, Haddington Rd) is the continuous two-way "canal road". It is the natural driving route for the ring.

**South Circular Road.**
- SCR (R811) runs from Clanbrassil St (53.33224, -6.27521) east to Heytesbury St (53.33246, -6.26832). There it becomes **Harrington St** (4 lanes) to the Camden / Richmond / Harcourt Rd junction.
- Both are two-way.
- The SCR west of Clanbrassil (53.33196, -6.27695 → 53.33152, -6.28364 and on) is covered in §4 P2.

**Clanbrassil St (R137).**
- It runs from NSS2 south to SCR, split into a one-way pair (2+2 lanes) north of 53.3341 and 3 lanes shared south of it.
- **Clanbrassil St Upper** continues to **Robert Emmet Bridge** (Harold's Cross Bridge, 53.32977 → 53.32951). South of the bridge are Harold's Cross Rd (south), Parnell Rd (west) and Grove Rd (east).

**Other spokes (VERIFIED).**
- **Kevin Street Cross → New Bride St → Heytesbury St** runs straight from KV3 south to the SCR (-6.2693 → -6.2683). It is two-way and tertiary.
- **Long Lane** (one-way westbound) joins it to NSS2 / Clanbrassil. **Camden Row** (one-way westbound from Camden St) joins it to Wexford St.
- **Leeson St Lower** is two-way, 3 lanes. It crosses **Eustace Bridge** (4 lanes) to Leeson St Upper, which becomes a one-way pair south of the bridge.
- **Baggot St Lower** south-east of Fitzwilliam St is two-way (split one-lane carriageways). North-west of Pembroke St it is eastbound only, which matters for the existing MR1–BG1 way (§5 Q6). It crosses **Macartney Bridge** (3 lanes, `4934592`) to Baggot St Upper / Haddington Rd / Mespil Rd.
- **Fitzwilliam St Lower / Upper** are two-way, tertiary. **Mount St Upper** is two-way to St Stephen's (Pepper Canister) Church. **Mount St Crescent** runs one-way both ways around the church to Huband Bridge.

### 1.3 Luas Green Line: HC1 → Harcourt → Charlemont (VERIFIED OSM ways `427356336`, `338061801`, `13897799`, `338075321`, `338108671`, `6186893`)

| Node | Real lat, lon | Game x, z | Notes |
|---|---|---|---|
| HC1 (existing) | 53.3352, -6.2624 | -131.9, 671.8 | Move to 53.33520, -6.26322 (§1.1) |
| GXSHC2 | 53.33400, -6.26302 | -164.9, 738.6 | Harcourt St / Hatch St / Charlotte Way; tram level crossing at 53.33409 |
| **GXSHCS "Harcourt"** | 53.33337, -6.26265 | -145.2, 773.7 | **Island platform between the two tracks** (Wikipedia: "a rarity for Luas stops"; ref 08). OSM platform `272696234` is 53.33313-53.33358, ≈50 m x 4 m. The tracks run on granite setts, the old station colonnade is on the east side, and the 2-lane southbound road is on the west side (refs 06-08). |
| GXSLU1 | 53.33280, -6.26210 | -116.0, 805.4 | The line curves east off Harcourt St, cutting the corner before the Charlemont St junction |
| GXSHR1 | 53.33277, -6.26141 | -79.3, 807.1 | It runs **eastbound along westbound-only Harcourt Rd** on its own reserved track |
| GXSLU2 | 53.33263, -6.26049 | -44.5, 814.9 | Leaves the road onto the old Harcourt St railway alignment, crossing Peter Place / Adelaide Rd at level |
| GXSLU3 | 53.33214, -6.26031 | -38.5, 842.1 | Reserved track behind Iveagh Court / Harcourt Green |
| GXSLU4 | 53.33174, -6.25945 | -10.0, 864.4 | Curve |
| GXSLU5 | 53.33127, -6.25900 | 5.0, 890.6 | Start of the elevated section (OSM bridge, layer 2, from 53.33129) |
| **GXSCHL "Charlemont"** | 53.33070, -6.25870 | 15.0, 922.3 | **Two side platforms (≈40 m) on a steel-and-concrete beam bridge directly over the canal. The shelters stand above the water.** Stairs and lift go down to Grand Parade (south) and Charlemont Place (north) (Wikipedia; OSM `105584732/738`). It is not the old railway bridge: the viaduct *south* of the stop is on the 1854 Harcourt St line alignment. |
| GXSLU6 | 53.33047, -6.25850 | 21.6, 935.1 | South end of the bridge, over Grand Parade |
| GXSLU7 | 53.32956, -6.25766 | 49.5, 985.7 | The line continues SSE on the old viaduct towards Ranelagh stop (≈53.3262, -6.2560, outside the new bound; **not trivial**, so stop here at the map edge) |

The tram-only curve GXSLU1 and the section GXSLU2 → GXSLU7 are not on roads. `line()` in geo.js only needs the node IDs to exist, as Heuston already relies on.

### 1.4 The canal: centreline, width, locks and bridges

**Water.** OSM water polygons (`natural=water`, `water=canal/lock`) measured perpendicular to the centreline:
- pools **10-16 m wide** (typically 11-13 m west of Charlemont, 14-16 m Leeson → Baggot)
- lock chambers **4.3-4.8 m wide x ≈21-22 m long** (C7 and C6 measured from the OSM lock ways)

Treat these as VERIFIED from OSM geometry to ±1 m. The towpaths are grass verges with mature trees; OSM species where tagged are mostly *Tilia* (lime) with some *Platanus*. The canal is ≈3.5 km from the west edge of the bbox to Grand Canal Dock.

**Proposed `canals` entry**, in the new format `buildCanal()` reads in the working-tree geo.js: a W→E centreline (upper end first, down towards the Liffey), a width in game metres uncompressed, and the lock positions. I suggest **width 12, verge 4**.

```json
"canals": {
  "Grand Canal": {
    "width": 12, "verge": 4,
    "pts": [[53.33069,-6.28401],[53.33044,-6.28242],[53.33012,-6.28025],[53.32991,-6.27867],[53.32976,-6.27716],
            [53.32972,-6.27582],[53.32968,-6.27520],[53.32960,-6.27366],[53.32965,-6.27189],[53.32985,-6.26884],
            [53.32999,-6.26579],[53.33006,-6.26477],[53.33008,-6.26428],[53.33008,-6.26398],[53.33014,-6.26216],
            [53.33031,-6.26081],[53.33046,-6.26017],[53.33064,-6.25932],[53.33100,-6.25773],[53.33132,-6.25624],
            [53.33153,-6.25531],[53.33186,-6.25373],[53.33206,-6.25279],[53.33241,-6.25157],[53.33306,-6.24929],
            [53.33343,-6.24811],[53.33377,-6.24702],[53.33404,-6.24606],[53.33433,-6.24526],[53.33459,-6.24474],
            [53.33502,-6.24416],[53.33554,-6.24342],[53.33603,-6.24266],[53.33631,-6.24222],[53.33720,-6.24085],
            [53.33764,-6.24018],[53.33838,-6.23909],[53.33860,-6.23875]],
    "locks": [[53.33007,-6.26460],[53.33040,-6.26046],[53.33199,-6.25315],[53.33373,-6.24716],[53.33610,-6.24255],[53.33740,-6.24055]]
  }
}
```

The line continues east past Macquay's Bridge (lock C1 at 53.33844, -6.23900) to Grand Canal Dock. That stretch belongs to the east/Aviva researcher; the last two points above are the hand-off. The first point is the bbox's west edge. Trim it to the new map bound or carry on for the P2 SCR extension.

**Locks (VERIFIED OSM `lock_ref` / `lock_name`; NIAH refs from the OSM `ref:IE:niah` tag).** Every city lock sits hard against a bridge except C4.

| Lock | Centre (lat, lon) | Game x, z | Beside | NIAH |
|---|---|---|---|---|
| C7 | 53.33007, -6.26460 | -248.9, 957.4 | West side of La Touche Br; Portobello House on its north bank | 50110274 |
| C6 | 53.33040, -6.26046 | -43.5, 939.0 | West side of Charlemont Br. OSM building "Lock 6" (`284823846`) is the small single-storey house on Canal Rd | 50110160 |
| C5 "Eustace Lock" | 53.33199, -6.25315 | 199.4, 850.5 | West side of Eustace (Leeson St) Br | 50110527 |
| C4 | 53.33373, -6.24716 | 398.4, 753.6 | **Mid-stretch, ≈130 m west of Macartney (Baggot) Br**, 80 m east of the Kavanagh bench. Its gates are OSM foot bridges (`23949994`, `80186152`: wood, "vehicle=no") | 50930322 |
| C3 | 53.33610, -6.24255 | 551.6, 621.7 | South (downstream) side of Huband Br | 50100595 |
| C2 "McKenney Bridge Lock" | 53.33740, -6.24055 | 618.0, 549.4 | South side of Mount St Br; 1916 Battle of Mount Street Bridge stele at 53.33742, -6.24030 | 50100536 |
| C1 | 53.33844, -6.23900 | 669.5, 491.5 | Macquay's Br (east researcher) | 50080103 |

**Bridges, W→E.**
- Names, streets and dates are VERIFIED from Wikipedia *List of Dublin bridges and tunnels*, NIAH 50100594 and the plaques in the refs.
- Deck profiles are estimated from photos.
- **No city canal bridge is a true humpback except Huband.** The rest are gently cambered masonry arches or flat 20th-century decks.

| Bridge | Carries | Real centre | Game x, z | Built / rebuilt | Profile and look | Crown rise over approach (est.) |
|---|---|---|---|---|---|---|
| **Robert Emmet Bridge** (Harold's Cross / orig. Clanbrassil Br) | Clanbrassil St Upper ↔ Harold's Cross Rd (R137) | 53.32971, -6.27548 | -668.2, 977.4 | 1791; rebuilt 1935-36 | Flat, plain granite/concrete parapets | 0.3 m |
| **La Touche Bridge** (Portobello Br) | Richmond St S ↔ Rathmines Rd Lower (R114) | 53.33008, -6.26428 | -231.9, 956.8 | 1791; widened 1928 | **Flat riveted-iron girder deck, fascia and openwork cast-iron railing painted plum/magenta**, granite end piers, calp rubble abutments, roundel plaque "La Touche Bridge 1791" (ref 15) | 0.4 m |
| **Charlemont Bridge** (often mis-called Ranelagh Br) | Charlemont St ↔ Ranelagh Rd (R117) | 53.33046, -6.26017 | -33.9, 935.6 | reconstructed 1940 | Flat, plain | 0.3 m |
| **Luas Charlemont bridge** | Luas only | 53.33047-53.33129, ≈-6.2587 | 13, 914 (stop) | 2004 | Elevated concrete deck on **dark-red steel girders**, grey concrete piers, glass/steel parapets, a spiral stair tower to Grand Parade (ref 09). Deck ≈6-7 m above the road (est.) | n/a |
| **Eustace Bridge** (Leeson St Br) | Leeson St Lower ↔ Upper (R138) | 53.33207, -6.25279 | 211.3, 846.0 | 1791; tram tracks added 1870 | Segmental masonry arch, calp and brick with orange-brick repairs, and a **large black water main arching over the canal face** (ref 12). Granite coping, chained bollards | 0.8 m |
| **Macartney Bridge** (Baggot St Br) | Baggot St Lower ↔ Upper (R816) | 53.33424, -6.24546 | 454.9, 725.2 | 1791 (est.; not in the Wikipedia list) | Wide masonry arch, low parapets | 0.6 m |
| **Huband Bridge** | Mount St Crescent / Herbert Pl ↔ Percy Place (residential) | 53.33625, -6.24232 | 559.2, 613.4 | **dated 1791**, built 1790-95 and privately paid for by Joseph Huband (NIAH 50100594) | **The ornate one.** Single segmental arch, granite ashlar, **granite parapet with a central cast-iron baluster panel** and a carved limestone plaque "Huband Bridge 1791" flanked by rosettes, panelled limestone end piers (ref 13) | **1.5 m (true humpback)** |
| **Mount Street Bridge** (McKenny's / orig. Conyngham Br) | Mount St Lower ↔ Northumberland Rd (R118) | 53.33752, -6.24035 | 624.7, 542.7 | 1791; widened before 1916 and 1956 | Masonry arch, widened; 1916 memorial beside it | 0.5 m |

The game's `buildCanal()` treats every crossing as a flat bridge. A profile of **+rise at the canal centreline, eased to 0 over ±12 game m** gives the humpback read. It is worth doing for Huband and Eustace at least.

### 1.5 Half-scale fit: the bank roads must move out (important)

In reality Grove Rd, Canal Rd, Grand Parade and Charlemont Mall run **10-15 m** from the canal centreline, which is only 5-8 game m. With real-width roads (half-width + 3.5 m footpath ≈ 8 game m), the carriageway would sit on top of a 12 m-wide canal, and the new `buildCanal()` does not clip pools against parallel roads.

So every bank node in the snippet below has been **pushed out perpendicular to 18 game m from the canal centreline** (canal half-width 6 + footpath + ~4 m grass verge). They are marked "(pushed)" in the table and are 10-25 m real off their OSM position. Checked by script:
- no non-bridge way comes closer than its half-width + 3.5 + 6 m (Canal Rd is the tightest at 14.3 against a need of 14.0)
- exactly the 7 bridge ways cross the centreline
- no new way crosses another away from a shared node

Side effect: canal bridges come out ≈32-36 game m long, against a real ≈20-30 m.

### 1.6 Proposed street-graph additions

All new node IDs use the prefix **`GXS`** (GX + South, to avoid collisions with the other ring researchers). None exist in `src/data/streets.json` (checked).
- **Reused existing nodes:** CU1, HC1, LE2, BG1, MSSE, NSS2, KV3, GT0.
- **Widths** are real carriageway metres, as the game uses them: types default to TYPE_WIDTH, and explicit widths are my estimates from lane counts x ~3-3.3 m. Treat them as estimates.
- **One-way:** `oneway: 1` means travel only in node order (VERIFIED directions, §1.2).

| Node | Real lat, lon | Game x, z | What it is |
|---|---|---|---|
| GXSCR1 | 53.33645, -6.26546 | -294.6, 602.2 | Wexford St / Camden St Lower / Camden Row / Montague St (Whelan's corner) |
| GXSCM1 | 53.33548, -6.26521 | -281.3, 656.2 | Camden St Lower / Pleasants St / Camden Place (Devitt's) |
| GXSCM2 | 53.33395, -6.26518 | -279.7, 741.4 | Camden St Lower / Charlotte Way / Grantham St |
| GXSCM3 | 53.33260, -6.26486 | -262.7, 816.5 | Camden St Upper / Harrington St / Harcourt Rd / Richmond St S |
| GXSRS1 | 53.33136, -6.26461 | -249.4, 885.6 | Richmond St S / Lennox St |
| GXSLT1 | 53.33040, -6.26431 (pushed) | -233.5, 939.0 | La Touche Br north end / Charlemont Mall / Portobello Harbour |
| GXSLT2 | 53.32976, -6.26428 (pushed) | -231.9, 974.6 | La Touche Br south end / Grove Rd / Canal Rd / Rathmines Rd Lower |
| GXSHC2 | 53.33400, -6.26302 | -164.9, 738.6 | Harcourt St / Hatch St Upper / Charlotte Way |
| GXSHCS | 53.33337, -6.26265 | -145.2, 773.7 | Harcourt St at the Harcourt Luas stop |
| GXSHC3 | 53.33273, -6.26287 | -156.9, 809.3 | Harcourt St south end / Harcourt Rd / Charlemont St |
| GXSHR1 | 53.33277, -6.26141 | -79.3, 807.1 | Harcourt Rd / Adelaide Rd |
| GXSAD1 | 53.33274, -6.25880 | 11.6, 808.7 | Adelaide Rd / Earlsfort Tce / Peter Place |
| GXSHT2 | 53.33386, -6.25862 | 17.6, 746.4 | Hatch St / Earlsfort Tce (National Concert Hall corner) |
| GXSLE1 | 53.33440, -6.25526 | 129.3, 716.3 | Leeson St Lower / Hatch St Lower / Pembroke St Upper |
| GXSLE3 | 53.33235, -6.25305 | 202.7, 830.4 | Eustace Br north end / Adelaide Rd / Wilton Tce |
| GXSLE4 | 53.33178, -6.25251 (pushed) | 220.6, 862.2 | Eustace Br south end / Leeson St Upper / Grand Parade / Mespil Rd |
| GXSCH1 | 53.33075, -6.26043 (pushed) | -42.5, 919.5 | Charlemont Br north end / Charlemont St / Charlemont Mall / Charlemont Pl |
| GXSCH2 | 53.33017, -6.25995 (pushed) | -26.6, 951.8 | Charlemont Br south end / Grand Parade / Canal Rd / Ranelagh Rd |
| GXSCL1 | 53.33046, -6.26218 (pushed) | -120.2, 935.6 | Charlemont Mall mid |
| GXSGP1 | 53.33042, -6.25875 (pushed) | 13.3, 937.9 | Grand Parade under the Luas bridge |
| GXSGP2 | 53.33130, -6.25477 (pushed) | 145.5, 888.9 | Grand Parade east |
| GXSCN1 | 53.32988, -6.26171 (pushed) | -95.2, 967.9 | Canal Rd |
| GXSCN2 | 53.32979, -6.26299 (pushed) | -163.3, 972.9 | Canal Rd west |
| GXSGR1 | 53.32944, -6.27015 (pushed) | -491.1, 992.4 | Grove Rd |
| GXSGR2 | 53.32928, -6.27371 (pushed) | -609.4, 1001.3 | Grove Rd west (follows the canal's southward bow) |
| GXSHX1 | 53.33002, -6.27542 (pushed) | -666.2, 960.1 | Robert Emmet Br north end / Clanbrassil St Upper / Windsor Tce |
| GXSHX2 | 53.32938, -6.27558 (pushed) | -671.5, 995.8 | Robert Emmet Br south end / Grove Rd / Parnell Rd / Harold's Cross Rd |
| GXSCB1 | 53.33515, -6.27390 | -615.7, 674.6 | Clanbrassil St Lower (Clanbrassil Tce) |
| GXSCB2 | 53.33224, -6.27521 | -659.2, 836.6 | Clanbrassil St / South Circular Rd |
| GXSSC1 | 53.33253, -6.26693 | -372.7, 820.4 | Harrington St / Synge St |
| GXSSC2 | 53.33246, -6.26832 | -430.3, 824.3 | Harrington St / SCR / Heytesbury St / Stamer St |
| GXSSC3 | 53.33236, -6.27170 | -542.6, 829.9 | SCR (Victoria St / Bloomfield Ave) |
| GXSKV1 | 53.33765, -6.26917 | -458.5, 535.4 | Kevin St Cross / New Bride St |
| GXSKV2 | 53.33620, -6.26893 | -450.6, 616.2 | New Bride St / Heytesbury St / Long Lane / Camden Row |
| GXSWT1 | 53.33355, -6.24889 (pushed) | 340.9, 763.7 | Wilton Tce at Wilton Place (Kavanagh bench) |
| GXSMP1 | 53.33285, -6.24880 (pushed) | 343.9, 802.6 | Mespil Rd |
| GXSBG1 | 53.33686, -6.24907 | 334.9, 579.4 | Baggot St Lower / Fitzwilliam St |
| GXSBG2 | 53.33451, -6.24580 (pushed) | 443.6, 710.2 | Macartney Br north end / Wilton Tce / Herbert Pl |
| GXSBG3 | 53.33400, -6.24514 | 465.5, 738.6 | Macartney Br south end / Mespil Rd / Haddington Rd / Baggot St Upper |
| GXSHD1 | 53.33442, -6.24388 | 507.4, 715.2 | Haddington Rd / Percy Place |
| GXSHP1 | 53.33547, -6.24423 (pushed) | 495.7, 656.8 | Herbert Place mid |
| GXSPP1 | 53.33520, -6.24300 | 536.6, 671.8 | Percy Place mid |
| GXSSP1 | 53.33698, -6.24421 | 496.4, 572.7 | Mount St Upper at St Stephen's (Pepper Canister) Church |
| GXSHU1 | 53.33647, -6.24271 (pushed) | 546.3, 601.1 | Huband Br north end / Herbert Pl / Warrington Pl / Mount St Crescent |
| GXSHU2 | 53.33603, -6.24192 (pushed) | 572.5, 625.6 | Huband Br south end / Percy Place |
| **GXSMS1** | 53.33775, -6.24075 (pushed) | 611.4, 529.9 | **EAST EDGE:** Mount St Br north end / Mount St Lower / Warrington Pl |
| **GXSMS2** | 53.33733, -6.23992 (pushed) | 639.0, 553.3 | **EAST EDGE:** Mount St Br south end / Percy Pl / Northumberland Rd |
| **GXSHD2** | 53.33614, -6.23813 | 698.4, 619.5 | **EAST EDGE:** Haddington Rd / Northumberland Rd |
| **GXSPB1** | 53.33291, -6.24257 | 550.9, 799.3 | **EAST EDGE:** Baggot St Upper / Pembroke Rd / Waterloo Rd (the only dead end until the Aviva network joins it) |
| GXSLU1-7, GXSCHL | see §1.3 | | Luas only |

**JSON snippet** (merge into `nodes` / `ways`. It **replaces** `luasGreen`; also set `"oneway": -1` on the existing `Harcourt Street` way HC0→HC1, because north of Charlotte Way it is northbound only):

```json
{
  "nodes": {
    "GXSCR1": [53.33645, -6.26546],
    "GXSCM1": [53.33548, -6.26521],
    "GXSCM2": [53.33395, -6.26518],
    "GXSCM3": [53.33260, -6.26486],
    "GXSRS1": [53.33136, -6.26461],
    "GXSLT1": [53.33040, -6.26431],
    "GXSLT2": [53.32976, -6.26428],
    "GXSHC2": [53.33400, -6.26302],
    "GXSHCS": [53.33337, -6.26265],
    "GXSHC3": [53.33273, -6.26287],
    "GXSHR1": [53.33277, -6.26141],
    "GXSAD1": [53.33274, -6.25880],
    "GXSHT2": [53.33386, -6.25862],
    "GXSLE1": [53.33440, -6.25526],
    "GXSLE3": [53.33235, -6.25305],
    "GXSLE4": [53.33178, -6.25251],
    "GXSCH1": [53.33075, -6.26043],
    "GXSCH2": [53.33017, -6.25995],
    "GXSCL1": [53.33046, -6.26218],
    "GXSGP1": [53.33042, -6.25875],
    "GXSGP2": [53.33130, -6.25477],
    "GXSCN1": [53.32988, -6.26171],
    "GXSCN2": [53.32979, -6.26299],
    "GXSGR1": [53.32944, -6.27015],
    "GXSGR2": [53.32928, -6.27371],
    "GXSHX1": [53.33002, -6.27542],
    "GXSHX2": [53.32938, -6.27558],
    "GXSCB1": [53.33515, -6.27390],
    "GXSCB2": [53.33224, -6.27521],
    "GXSSC1": [53.33253, -6.26693],
    "GXSSC2": [53.33246, -6.26832],
    "GXSSC3": [53.33236, -6.27170],
    "GXSKV1": [53.33765, -6.26917],
    "GXSKV2": [53.33620, -6.26893],
    "GXSWT1": [53.33355, -6.24889],
    "GXSMP1": [53.33285, -6.24880],
    "GXSBG1": [53.33686, -6.24907],
    "GXSBG2": [53.33451, -6.24580],
    "GXSBG3": [53.33400, -6.24514],
    "GXSHD1": [53.33442, -6.24388],
    "GXSHD2": [53.33614, -6.23813],
    "GXSPB1": [53.33291, -6.24257],
    "GXSSP1": [53.33698, -6.24421],
    "GXSHP1": [53.33547, -6.24423],
    "GXSPP1": [53.33520, -6.24300],
    "GXSHU1": [53.33647, -6.24271],
    "GXSHU2": [53.33603, -6.24192],
    "GXSMS1": [53.33775, -6.24075],
    "GXSMS2": [53.33733, -6.23992],
    "GXSLU1": [53.33280, -6.26210],
    "GXSLU2": [53.33263, -6.26049],
    "GXSLU3": [53.33214, -6.26031],
    "GXSLU4": [53.33174, -6.25945],
    "GXSLU5": [53.33127, -6.25900],
    "GXSCHL": [53.33070, -6.25870],
    "GXSLU6": [53.33047, -6.25850],
    "GXSLU7": [53.32956, -6.25766]
  },
  "ways": [
    { "name": "Wexford Street", "type": "secondary", "width": 10, "nodes": ["CU1", "GXSCR1"] },
    { "name": "Camden Street Lower", "type": "secondary", "width": 12, "nodes": ["GXSCR1", "GXSCM1", "GXSCM2"] },
    { "name": "Camden Street Upper", "type": "secondary", "width": 12, "oneway": 1, "nodes": ["GXSCM3", "GXSCM2"] },
    { "name": "Richmond Street South", "type": "secondary", "width": 12, "nodes": ["GXSCM3", "GXSRS1", "GXSLT1"] },
    { "name": "La Touche Bridge", "type": "bridge", "width": 14, "nodes": ["GXSLT1", "GXSLT2"] },
    { "name": "Harcourt Street", "type": "secondary", "width": 13, "oneway": -1, "nodes": ["HC1", "GXSHC2"] },
    { "name": "Harcourt Street", "type": "secondary", "width": 15, "oneway": 1, "nodes": ["GXSHC2", "GXSHCS", "GXSHC3"] },
    { "name": "Charlotte Way", "type": "secondary", "width": 11, "oneway": 1, "nodes": ["GXSCM2", "GXSHC2"] },
    { "name": "Hatch Street Upper", "type": "secondary", "width": 10, "nodes": ["GXSHC2", "GXSHT2"] },
    { "name": "Hatch Street Lower", "type": "secondary", "width": 10, "nodes": ["GXSHT2", "GXSLE1"] },
    { "name": "Harcourt Road", "type": "secondary", "width": 12, "oneway": 1, "nodes": ["GXSHR1", "GXSHC3", "GXSCM3"] },
    { "name": "Adelaide Road", "type": "secondary", "width": 10, "oneway": 1, "nodes": ["GXSAD1", "GXSHR1"] },
    { "name": "Adelaide Road", "type": "secondary", "width": 10, "nodes": ["GXSLE3", "GXSAD1"] },
    { "name": "Earlsfort Terrace", "type": "secondary", "width": 11, "oneway": 1, "nodes": ["GXSHT2", "GXSAD1"] },
    { "name": "Leeson Street Lower", "type": "secondary", "width": 13, "nodes": ["LE2", "GXSLE1", "GXSLE3"] },
    { "name": "Eustace Bridge", "type": "bridge", "width": 16, "nodes": ["GXSLE3", "GXSLE4"] },
    { "name": "Charlemont Street", "type": "secondary", "width": 11, "nodes": ["GXSHC3", "GXSCH1"] },
    { "name": "Charlemont Bridge", "type": "bridge", "width": 13, "nodes": ["GXSCH1", "GXSCH2"] },
    { "name": "Charlemont Mall", "type": "secondary", "width": 7, "oneway": 1, "nodes": ["GXSCH1", "GXSCL1", "GXSLT1"] },
    { "name": "Canal Road", "type": "secondary", "width": 9, "nodes": ["GXSCH2", "GXSCN1", "GXSCN2", "GXSLT2"] },
    { "name": "Grand Parade", "type": "secondary", "width": 9, "nodes": ["GXSCH2", "GXSGP1", "GXSGP2", "GXSLE4"] },
    { "name": "Grove Road", "type": "secondary", "width": 9, "nodes": ["GXSLT2", "GXSGR1", "GXSGR2", "GXSHX2"] },
    { "name": "Robert Emmet Bridge", "type": "bridge", "width": 14, "nodes": ["GXSHX1", "GXSHX2"] },
    { "name": "Clanbrassil Street Lower", "type": "primary", "width": 14, "nodes": ["NSS2", "GXSCB1", "GXSCB2"] },
    { "name": "Clanbrassil Street Upper", "type": "secondary", "width": 12, "nodes": ["GXSCB2", "GXSHX1"] },
    { "name": "South Circular Road", "type": "secondary", "width": 11, "nodes": ["GXSCB2", "GXSSC3", "GXSSC2"] },
    { "name": "Harrington Street", "type": "secondary", "width": 13, "nodes": ["GXSSC2", "GXSSC1", "GXSCM3"] },
    { "name": "New Bride Street", "type": "secondary", "width": 9, "nodes": ["KV3", "GXSKV1", "GXSKV2"] },
    { "name": "Heytesbury Street", "type": "secondary", "width": 9, "nodes": ["GXSKV2", "GXSSC2"] },
    { "name": "Long Lane", "type": "lane", "width": 6, "oneway": 1, "nodes": ["GXSKV2", "NSS2"] },
    { "name": "Camden Row", "type": "lane", "width": 6, "oneway": -1, "nodes": ["GXSKV2", "GXSCR1"] },
    { "name": "Wilton Terrace", "type": "secondary", "width": 8, "nodes": ["GXSLE3", "GXSWT1", "GXSBG2"] },
    { "name": "Mespil Road", "type": "secondary", "width": 9, "nodes": ["GXSLE4", "GXSMP1", "GXSBG3"] },
    { "name": "Baggot Street Lower", "type": "secondary", "width": 12, "nodes": ["BG1", "GXSBG1", "GXSBG2"] },
    { "name": "Macartney Bridge", "type": "bridge", "width": 16, "nodes": ["GXSBG2", "GXSBG3"] },
    { "name": "Baggot Street Upper", "type": "secondary", "width": 13, "nodes": ["GXSBG3", "GXSPB1"] },
    { "name": "Haddington Road", "type": "secondary", "width": 10, "nodes": ["GXSBG3", "GXSHD1", "GXSHD2"] },
    { "name": "Herbert Place", "type": "secondary", "width": 7, "nodes": ["GXSBG2", "GXSHP1", "GXSHU1"] },
    { "name": "Percy Place", "type": "secondary", "width": 7, "nodes": ["GXSHD1", "GXSPP1", "GXSHU2", "GXSMS2"] },
    { "name": "Huband Bridge", "type": "bridge", "width": 7, "access": "destination", "nodes": ["GXSHU1", "GXSHU2"] },
    { "name": "Fitzwilliam Street Lower", "type": "secondary", "width": 11, "nodes": ["MSSE", "GXSBG1"] },
    { "name": "Mount Street Upper", "type": "secondary", "width": 12, "nodes": ["MSSE", "GXSSP1"] },
    { "name": "Mount Street Crescent", "type": "secondary", "width": 8, "nodes": ["GXSSP1", "GXSHU1"] },
    { "name": "Warrington Place", "type": "secondary", "width": 7, "nodes": ["GXSHU1", "GXSMS1"] },
    { "name": "Mount Street Bridge", "type": "bridge", "width": 14, "nodes": ["GXSMS1", "GXSMS2"] },
    { "name": "Mount Street Lower", "type": "secondary", "width": 13, "nodes": ["GT0", "GXSMS1"] },
    { "name": "Northumberland Road", "type": "secondary", "width": 12, "nodes": ["GXSMS2", "GXSHD2"] }
  ],
  "luasGreen": {
    "name": "Luas Green Line",
    "route": ["WM1", "CG1", "CGM", "CGT", "CGC", "CG3", "NS1", "DSM", "DS1", "SGNW", "SGW", "SGSW", "HC0", "HC1", "GXSHC2", "GXSHCS", "GXSLU1", "GXSHR1", "GXSLU2", "GXSLU3", "GXSLU4", "GXSLU5", "GXSCHL", "GXSLU6", "GXSLU7"],
    "stops": { "WM1": "Westmoreland", "CGM": "Trinity", "DSM": "Dawson", "SGW": "St. Stephen's Green", "GXSHCS": "Harcourt", "GXSCHL": "Charlemont" }
  }
}
```

Loops this creates (no dead ends except GXSPB1, checked by script):
1. Green → Camden → Charlotte Way → Harcourt St → Harcourt Rd → Richmond St → canal
2. The south-bank canal road (Robert Emmet Br → Grove Rd → Canal Rd → Grand Parade → Mespil Rd → Haddington Rd), with every bridge a rung back north
3. Clanbrassil → SCR → Harrington → Camden
4. New Bride St → Heytesbury → SCR
5. Leeson → Hatch → Harcourt
6. Baggot → Herbert Pl → Huband → Percy Pl → Mount St

**Edge stubs (optional).** Add these if roads may end at the map edge like Parkgate St. Rathmines Rd Lower matters most, because the green copper dome of Mary Immaculate church (53.32797, -6.26390; game -211.7, 1074) closes the view south over La Touche Bridge.

| Stub | From | To (real) |
|---|---|---|
| Rathmines Road Lower | GXSLT2 | 53.32850, -6.26455 |
| Ranelagh Road | GXSCH2 | 53.32960, -6.25930 (est.) |
| Harold's Cross Road | GXSHX2 | 53.32904, -6.27592 |
| Parnell Road | GXSHX2 | 53.32976, -6.27836 |
| Leeson Street Upper | GXSLE4 | 53.33105, -6.25220 |

**P2 infill (not in the snippet):**
- Grantham St (GXSCM2 → Synge St → Heytesbury)
- Synge St (Grantham → GXSSC1)
- Pleasants St
- Lennox St (Richmond St → Synge St)
- Charlemont Place + Harcourt Terrace (GXSCH1 → 53.33121, -6.25747 → Adelaide Rd 53.33270, -6.25795). Check first whether Harcourt Terrace is a through road.
- the Pembroke St Lower → Fitzwilliam Sq W → Pembroke St Upper one-way chain from Baggot St to GXSLE1 (R138 southbound)
- Fitzwilliam Square
- Earlsfort Tce north of Hatch St (blocked by the SGSE seam)

### 1.7 Other OSM context

- **Iveagh Gardens** (`275449345`, 53.33403-53.33651, -6.26228 to -6.25945) lie behind the east side of Harcourt St, between it and the National Concert Hall. There is no road frontage. Use a tree mass behind the terrace roofs, not a park polygon.
- **Nightlife POIs (OSM nodes, VERIFIED names and positions):**
  - Camden / Wexford St:
    - Whelan's (Wexford St, footprint 53.33644-53.33667)
    - The Jar, Barebone, The Landmark (Wexford St)
    - Ryan's (Camden St Lower corner of Camden Row)
    - The Camden, Huck's, Camden Bites & Brews
    - Devitt's (53.33551-53.33560)
    - Anseo, Porters
    - Camden Exchange (53.33511, -6.26543) and Tucker Reilly's
    - **The Bleeding Horse** (Camden St Upper east side at Charlotte Way, footprint 53.33338-53.33360, -6.26493 to -6.26452)
    - Keavan's Port
    - C Central
  - Richmond St S: J. O'Connell, The Portobello Bar, Rain.
  - Canal:
    - The Barge (Charlemont St, north-west of Charlemont Br)
    - The Lower Deck (Portobello Harbour)
    - Charlemont Bar
  - Harcourt St:
    - Copper Face Jacks (53.33544, -6.26351, east side; the club is in the Jackson Court Hotel building)
    - Dicey's Garden (53.33591)
    - Krystle
    - Everleigh Garden
    - D-Two (53.33445)
    - Ohana
    - Odeon (in the old station)
  - Leeson St "the Strip": House Dublin, Leggs, Hartigan's, Madigans.
  - Baggot St: Toner's, Searsons, The Waterloo, Bar Eile, Sally McLennane's.
  - Clanbrassil: The Harold House, Board, Kavanagh's (New St S), Peadar Browns.
- **Street art:** OSM lists 30+ murals along Camden St, Richmond St, Portobello and the canal (e.g. "Swanning Along" at Charlemont Br, "Portobello Harbour" mural, "Love Mór"). Painted gable-end murals are a cheap, strong cue for this area.
- **Monuments on the route:**
  - Patrick Kavanagh bench (53.33360, -6.24794)
  - 1916 Mount Street Bridge stele (53.33742, -6.24030)
  - "Memories of Mount Street" sculpture (53.33653, -6.24326)
  - Catherine McAuley statue (Baggot St, 53.33535, -6.24650)
  - Township of Rathmines 1847 boundary stone (53.33210, -6.25162)

---

## 2. Reference images (`refs/canal-south/`)

All are from Wikimedia Commons (including geograph and Flickr mirrors), at 1000-1280 px thumbnails or the original where it is smaller. None come from Google. Full URLs are in `refs/canal-south/sources.json`.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-camden-st-lower-driver-view.jpg | [Camden Street Lower, Dublin – geograph 4794974](https://commons.wikimedia.org/wiki/File:Camden_Street_Lower,_Dublin._-_geograph.org.uk_-_4794974.jpg) | Ian S | CC BY-SA 2.0 | 2016-01-14 | **Driver's eye** north-west on Camden St Lower: red Ryan's front, 3-4 storey brick and painted render terrace, ornate double-lantern lamp columns, keg lorry, bus lane |
| 02-camden-st-evening-2025.jpg | [Camden Street, Dublin – 2025-06-01](https://commons.wikimedia.org/wiki/File:Camden_Street,_Dublin_-_2025-06-01.jpg) | 瑞丽江的河水 | CC BY-SA 4.0 | 2025-06-01 | **Driver's eye** north up Camden St Upper from the Harrington St junction (top deck of a bus): Georgian brick terrace with railings on the left, Bleeding Horse on the right, wand-separated cycle lane, 3 northbound lanes |
| 03-camden-st-lower-shopfronts.jpg | [Shops on Camden Street Lower – geograph 4794918](https://commons.wikimedia.org/wiki/File:Shops_on_Camden_Street_Lower,_Dublin_-_geograph.org.uk_-_4794918.jpg) | Ian S | CC BY-SA 2.0 | 2016-01-14 | Shopfront mix: lime-green Devitt's lounge bar on a red-brick corner, white-rendered 3-bay house with red striped awning (Jerusalem), blue travel agent fascia |
| 04-devitts-pub-front.jpg | [Devitt's on Camden Street Lower – geograph 4794887](https://commons.wikimedia.org/wiki/File:Devitt%27s_on_Camden_Street,_Lower,_Dublin_-_geograph.org.uk_-_4794887.jpg) | Ian S | CC BY-SA 2.0 | 2016-01-14 | Pub-front detail (texture source) |
| 05-bleeding-horse-corner.jpg | [The Bleeding Horse, Dublin 01](https://commons.wikimedia.org/wiki/File:The_Bleeding_Horse,_Dublin_01.jpg) | Joehawkins | CC BY-SA 4.0 | 2016-08-14 | **The Bleeding Horse corner:** 2-storey plus parapet, near-black painted timber/stucco ground floor and pilasters, brown brick upper floor, black Carlsberg awnings, gilt lettering, painted horse panel "1649"; curved yellow-brick Camden Court Hotel beyond |
| 06-harcourt-st-station-facade.jpg | [Dublin, Harcourt Street station – geograph 2506312](https://commons.wikimedia.org/wiki/File:Dublin,_Harcourt_Street_station_-_geograph.org.uk_-_2506312.jpg) | Dr Neil Clifton | CC BY-SA 2.0 | 2011-07-09 | **Key elevation:** Doric colonnade, central pedimented brick block with the great granite arch and "A.D. MDCCCLIX" panel, three flagpoles, island Luas platform and "Harcourt" nameplate in front |
| 07-tram-outside-harcourt-st-station.jpg | [Tram outside Harcourt Street station – geograph 2506324](https://commons.wikimedia.org/wiki/File:Dublin,_Tram_outside_Harcourt_Street_station_-_geograph.org.uk_-_2506324.jpg) | Dr Neil Clifton | CC BY-SA 2.0 | 2011-07-09 | Citadis tram on setts at the stop; the 2-lane southbound carriageway; 1990s-2000s office blocks south of the station |
| 08-harcourt-luas-stop-2018.jpg | [Harcourt Street tram stop (Feb 2018)](https://commons.wikimedia.org/wiki/File:HARCOURT_STREET_TRAM_STOP_(DUBLIN_FEBRUARY_2018)-137140.jpg) | William Murphy | CC BY-SA 2.0 | 2018-02-13 | **Island platform** layout looking south: track, island with shelters, track, road; colonnade steps on the left |
| 09-charlemont-luas-bridge.jpg | [GrandCanal-8-LuasBridge](https://commons.wikimedia.org/wiki/File:GrandCanal-8-LuasBridge.JPG) | Deitel55 | CC BY-SA 3.0 | 2012-02-03 | The Luas bridge over Grand Parade: red steel girders, grey concrete piers, glazed parapets, stair tower |
| 10-eustace-bridge-and-lock.jpg | [Eustace Bridge and Lock – geograph 889628](https://commons.wikimedia.org/wiki/File:Eustace_Bridge_and_Lock,_Dublin_-_geograph.org.uk_-_889628.jpg) | John Gibson | CC BY-SA 2.0 | 2006-09-29 | **Lock kit reference:** chamber with stone copings, closed mitre gates, black balance beams, black-and-white bollards, sett surround, bridge arch behind |
| 11-eustace-lock-balance-beams.jpg | [Eustace Lock, Grand Canal – geograph 889619](https://commons.wikimedia.org/wiki/File:Eustace_Lock,_Grand_Canal,_Dublin_-_geograph.org.uk_-_889619.jpg) | John Gibson | CC BY-SA 2.0 | 2006-09-29 | Lock from the other end: gate walkway, beams, bollards, guard railing, the canal and trees beyond |
| 12-eustace-bridge-elevation.jpg | [GrandCanal-7-EustaceBridge](https://commons.wikimedia.org/wiki/File:GrandCanal-7-EustaceBridge.JPG) | Deitel55 | CC BY-SA 3.0 | 2012-02-03 | Eustace Br elevation: masonry arch, brick patching, the black water main over the arch, grass towpath; road rising over the crown (right) |
| 13-huband-bridge.jpg | [GrandCanal-5-HubandBridge](https://commons.wikimedia.org/wiki/File:GrandCanal-5-HubandBridge.JPG) | Deitel55 | CC BY-SA 3.0 | 2012-02-03 | **Humpback kit reference:** granite segmental arch, parapet with carved panels and a central baluster section, the lock C3 weir spilling through |
| 14-kavanagh-statue.jpg | [Patrick Kavanagh monument at Grand Canal](https://commons.wikimedia.org/wiki/File:Patrick_Kavanagh_monument_at_Grand_Canal,_Dublin.jpg) | Peierls | CC BY-SA 3.0 | 2012-04-28 | Bronze Kavanagh on the cast-iron bench, paved pad, tarmac towpath, row of huge limes, moored barge, more benches |
| 15-la-touche-bridge-portobello.jpg | [Portobello – La Touche Bridge (7087799947)](https://commons.wikimedia.org/wiki/File:Portobello_In_Dublin_-_Latouch_Bridge_Over_The_Grand_Canal_(7087799947).jpg) | William Murphy | CC BY-SA 2.0 | 2012-04-16 | La Touche Br: plum-painted riveted girder and cast-iron railing, granite pier, calp wall with "La Touche Bridge 1791" roundel, the lock C7 beam and paddle gear in the foreground |
| 16-portobello-house-from-canal.jpg | [A walk along the Grand Canal (Portobello)-155763](https://commons.wikimedia.org/wiki/File:A_WALK_ALONG_THE_GRAND_CANAL_(PORTOBELLO_BRIDGE_TO_HAROLD%27S_CROSS_BRIDGE)-155763.jpg) | William Murphy | CC BY-SA 2.0 | 2019-09-13 | **Portobello House** across the harbour: 3-storey buff render, white quoined centre bay with pediment, clock and green-domed cupola, Doric porch and balcony, chained bollards on the quay, swans and gulls, lock C7 beams and a yellow double-decker on La Touche Br (right) |

Useful candidates not downloaded:
- `Harcourt Street Station (6606631529).jpg`
- `Bleeding-horse-Dublin-10-January-2011.jpg`
- `Portobello (8224097998).jpg` (NLI, 1940s tram on La Touche Br, no known restrictions)
- `Huband Bridge (6337098348).jpg` (NLI 1966)
- `Grand Canal Charlemont.jpg`
- `Grand Canal with valve casings – geograph 5179591`
- `Dublin - Grand Canal - Poet Patrick Kavanagh – geograph 1616492`
- `Grand Canal, the lock at Leeson Street Bridge – geograph 862763`

---

## 3. Landmark profiles

### 3.1 Old Harcourt Street station (now Odeon / nightlife)

- **Facts (VERIFIED, Wikipedia):**
  - Architect **George Wilkinson**; opened **7 Feb 1859**; closed **31 Dec 1958**.
  - Facade: "a central arch and a colonnade of Doric columns".
  - The line ran on an embankment **25 ft (7.6 m) above street level**, with a single 597 ft platform and a 48 ft turntable at the Hatch St end.
  - A Gilbey's bonded warehouse filled the undercroft.
  - The panel reads **"A.D. MDCCCLIX"** (ref 06).
  - The building is now bars and venues, including the Odeon (OSM `280186862`: `old_name=Harcourt Street Station`, `disused:amenity=pub`).
- **Position (VERIFIED OSM):**
  - The frontage block (`280186862`) covers 53.33326-53.33366, -6.26262 to -6.26210, ≈44 m N-S x 35 m deep, on the **east side of Harcourt St, facing west**.
  - The full station/vaults polygon (`25638922`) runs 53.33311-53.33400.
  - Front centre ≈ 53.33346, -6.26258 (game ≈ -143.6, 768.7), directly behind the island stop GXSHCS.
- **Massing (estimated from refs 06-08 at a 44 m frontage, ±15%):**
  - **Colonnade:** a single-storey granite Tuscan/Doric colonnade runs the full front, raised on **5-6 steps** (≈1 m podium). Round unfluted columns ≈0.8 m diameter, ≈5.5 m high, at ≈3.2 m centres, carrying a plain entablature and cornice at ≈7.5 m. The colonnade is ≈4 m deep, with a rendered back wall holding tall doors and windows. There are ≈5-6 columns each side of the centre, and the centre pair are doubled at the arch.
  - **Central pavilion:** ≈14 m wide, brown/buff brick with granite quoins, rising to a **pediment apex ≈17 m**. It is filled by a **huge semicircular granite arch** (≈7 m span, crown ≈13 m) with a recessed glazed/timber entrance screen. Big scrolled granite consoles flank the arch at cornice level. The inscription panel sits in the tympanum above the arch.
  - **Behind the colonnade:** plain brick upper storey/walls (the former platform level) to ≈10-11 m, with a parapet. **Three flagpoles** stand on the colonnade roof (refs 06, 07).
  - **Neighbours:** 6-8 storey glass-and-stone offices (One/Two Park Place, `25638928`, 8 levels) tower behind and to the south. This contrast is part of the look.
- **Colours** (from refs 06-08, overcast):

| Surface | Hex |
|---|---|
| granite (columns, entablature, arch) | `#a19d93`, shadow `#7c7a73` |
| brick | `#7a5e4a` |
| rendered colonnade back wall | `#cfc6b4` |
| doors / timber | `#5a3a22` |
| flags | green `#2f7d4a` |

### 3.2 Portobello House (former Grand Canal Hotel)

- **Facts (VERIFIED, Wikipedia *Portobello, Dublin*):**
  - Opened **1807** as the Grand Canal Company's hotel; architect **James Colbourne**. The harbour opened in 1801.
  - Later uses: 1858 an asylum for blind girls, then a hotel (~100 guests) again, a 20th-century nursing home, and now a language school (OSM `building:use=language_school`, `old_name=Portobello Hotel`, ref 16 "Atlas Language School").
  - OSM `233845082` is tagged 3 levels, heritage.
- **Position (VERIFIED OSM):** footprint 53.33029-53.33044, -6.26491 to -6.26445, ≈31 m E-W x 17 m. Centre game ≈ (-253, 941). It sits on the **north bank immediately west of La Touche Bridge, facing south over lock C7 and the harbour quay.** GXSLT1 was pushed to 18 game m off the canal, so check this fit (§5 Q4).
- **Massing (from ref 16, estimated):**
  - **Front and bays:** 3 storeys, ≈12-13 m to the eaves. Hipped slate roof with big brick chimney stacks at the ends. **7-bay canal front (3 + 1 + 3)**.
  - **Centre bay:** projects slightly, has **white quoins** and a **pediment with a clock**. It is topped by a **square base and an open columned cupola with a green copper dome and weathervane** (top ≈20 m). A **Doric porch with a balcony above** frames the door.
  - **Side elevation:** 3 bays (west side), with blind windows on one side.
  - **Quay:** low iron railings and **chained bollards** along the harbour quay edge.
- **Colours:**

| Surface | Hex |
|---|---|
| render (sunlit) | `#cdb89e`, shade `#a8937a` |
| quoins, sills, porch | `#eeece6` |
| sashes | white `#f2f1ec` |
| cupola dome | `#6f9b86` |
| slate | `#4d5359` |
| chimney brick | `#8a5a44` |

### 3.3 Camden / Wexford St strip

- **Character (refs 01-05):**
  - An unbroken 3-4 storey terrace. Georgian and Victorian red/brown brick alternates with painted render (white, cream, pale grey) and a few 1990s-2000s infill blocks (e.g. the curved yellow-brick Camden Court Hotel).
  - Every ground floor is a shopfront or pub: bold painted timber pub fronts, big fascia lettering, awnings, hanging baskets and flags.
  - Lamps are the ornate double-lantern Dublin columns. There is a bus lane, cycle lane wands and constant deliveries.
- **The Bleeding Horse:**
  - VERIFIED: Camden St Upper / Charlotte Way corner, east side.
  - It claims to be licensed **1649**; the name comes from a horse wounded at the Battle of Rathmines (Wikipedia, Portobello).
  - Two storeys plus parapet and a cornice with "THE BLEEDING HORSE" in gilt.
  - Near-black painted ground floor and pilasters, brown brick upper floor, black Carlsberg awnings, the horse painting panel over the door.
- **Whelan's** (VERIFIED OSM): Wexford St, footprint 53.33644-53.33667, west side at the Camden Row corner. Venue famous since 1989; front colours not verified in a CC photo (§5).
- **Camden Exchange** (OSM node 53.33511, -6.26543, west side of Camden St Lower). The user's "The Deer" name could not be verified in OSM.
- **Shopfront palette** for a pub-front atlas (from refs 01, 03, 04, 05):

| Front | Hex |
|---|---|
| Ryan's red | `#c62b2b` |
| Devitt's lime | `#8cc63e` |
| Bleeding Horse black | `#1d2022`, gilt `#c8a24a` |
| bottle green | `#1f4a35` |
| oxblood | `#6e1f22` |
| navy | `#1f2d4f` |
| cream render | `#e9e3d2` |
| white render | `#f0efea` |
| pale grey render | `#c9c8c3` |
| red brick | `#8e4a36` |
| brown brick | `#7a5a44` |
| awning, red/cream stripe | `#b2323a`/`#efe6d2` |
| awning, black | `#141414` |

### 3.4 Harcourt Street

- **VERIFIED:**
  - Begun **1777** by John Hatch; on maps from 1784; named after Simon Harcourt, 1st Earl Harcourt.
  - "A largely intact Georgian" street, **21 m** wide.
  - The River Stein is culverted under its upper end (Wikipedia).
- **Look (refs 06-08, plus OSM building names):**
  - A long, gently curving terrace of 4-storey-over-basement red-brick houses with granite steps, fanlit doors and railings on the north part. Several are hotels: Harcourt Hotel, Pinebrook House, Harrington Hall, and the Jackson Court Hotel / Copper Face Jacks.
  - The south end past Hatch St turns into large stone-and-glass offices (Harcourt Centre, Iveagh Court, Europa House, Styne House), with the old station on the east side.
  - The Luas runs on **grey granite setts**, with grey tubular OCS poles and span wires.
- **Curve:** the street's bearing turns from ≈155° at the Green to ≈175° south of Hatch St (VERIFIED from the OSM tram geometry).

### 3.5 Patrick Kavanagh bench statue

- **VERIFIED:**
  - Sculptor **John Coll**, unveiled **June 1991** by President Mary Robinson for Dublin's European City of Culture year.
  - Inspired by "Lines Written on a Seat on the Grand Canal".
  - The bronze figure sits on a bench **you can sit beside**.
  - OSM `259552573` places it at **53.33360, -6.24794 on the north bank (the Wilton Terrace towpath)**, between Eustace and Macartney bridges, 80 m west of lock C4. Game ≈ (372.5, 760.9), just east of GXSWT1.
  - Sources that say "Mespil Road" are loose: Mespil Rd is the **south** bank. The separate 1968 "Kavanagh seat" (wood and granite, Michael Farrell) is on the south bank near lock C4.
- **Look (ref 14):**
  - A seated, cross-legged, bespectacled figure, arms folded, facing the water.
  - Verdigris bronze `#4f6f63` with dark patina `#2c3a35`.
  - The bench is ornate cast iron with slatted seat and back, in the same bronze.
  - It stands on a small **block-paved pad** beside the tarmac towpath, under a row of massive limes, with plain towpath benches nearby.
  - Bench ≈1.6 m long; figure life-size.

### 3.6 Canal locks and balance beams (the kit)

- **VERIFIED:**
  - Lock walls are **cut limestone with iron- and lead-pinned copings**, "curved to south end". Each lock has **two sets of double-leaf timber gates** with iron hinge fixings and cast-iron gear (NIAH 50100595).
  - The Circular Line opened 1790-96 (Wikipedia).
  - OSM gives chamber ≈4.5 m wide x ≈22 m long, and lock-gate foot walkways (wood).
- **From refs 10, 11, 15:**
  - **Balance beams** are heavy squared timbers, ≈5.5-6 m long and ≈0.35 m square, **painted black**, laid horizontally at ≈1.1 m over the coping. They swing each gate leaf, two per end and four per lock.
  - **Bollards:** short white cylindrical bollards with black caps and bands stand at the corners, with more along the lockside.
  - **Other furniture:** a narrow plank walkway with a handrail on the top of the gates; black ratchet paddle gear stands; setts around the chamber; galvanised guard railing on the road side.
  - The widely cited "black and white" look is **black beams + white bollards** (and in places white-painted beam ends; not consistently seen in the refs).
  - Where the lock is shut, water spills as a small weir through the upper gates (ref 13).

### 3.7 Five recognisable cues (checked against the photos)

1. **The Doric colonnade and great arch of the old Harcourt St station, with a Luas at the island stop in front** (refs 06-08).
2. **Camden St's chaotic, colourful pub fronts** (red Ryan's, lime Devitt's, black Bleeding Horse) under brick terraces and ornate double-lantern lamps (refs 01-05).
3. **Black lock beams, white bollards and a low bridge** at every canal crossing, with water stepping down through the gates (refs 10, 11, 13, 15).
4. **The tree-lined canal with its grass towpath**, and the bronze Kavanagh on his bench (ref 14).
5. **Portobello House's green-domed cupola over the harbour**, next to the plum-painted La Touche Bridge (refs 15, 16). Add the Luas gliding over the canal on the red-girdered Charlemont bridge (ref 09).

---

## 4. Build brief (prioritised)

### P0: data (streets.json; next phase)

1. **Extend `meta.bounds.south` to 53.3285.**
2. Merge the §1.6 snippet: 57 nodes and 47 ways.
3. Set `oneway: -1` on the existing HC0→HC1 Harcourt Street way.
4. **Move HC1 to 53.33520, -6.26322** (or accept the kink).
5. Replace `luasGreen` with the new route and stops ("Harcourt" at GXSHCS, "Charlemont" at GXSCHL).
6. Add the `canals` entry (§1.4) with width 12 / verge 4.
7. Run the existing `footprints.mjs` / `bridges.mjs` tests. Check that each bridge way gets a gap and that Canal Rd (14.3 m clearance) does not nick the water.
8. Agree the east seam at GXSMS1/GXSMS2/GXSHD2/GXSPB1 with the east/Aviva researcher (§5 Q1).

### P1: hero GLBs (Blender, `tools/blender/`, kit.py conventions: real size, then `finish()` plan/height scale; decals from the shared atlas; AO baked to vertex colour)

**Harcourt St station, ~6k tris.**

| Part | Tris | Notes |
|---|---|---|
| Podium + steps | 400 | 44 x 6 m plinth, 5 steps |
| Colonnade (12-14 columns, 8-sided shafts with simple bases/capitals) + entablature | 2,800 | Columns ≈0.8 m dia, 5.5 m; entablature/cornice at 7.5 m |
| Central pavilion | 1,500 | Brick box with quoins, pediment, real recessed arch (16-segment intrados), consoles as extruded profiles; inscription as a decal |
| Rear brick block + parapet | 600 | ≈10.5 m high, plain |
| Flagpoles x3, lamps | 300 | |
| Decals | 400 | Door/window screens (`door`, `sash`), the "A.D. MDCCCLIX" panel (new `attic`-style strip) |

**Portobello House, ~4k tris.** 3-storey hipped block, 7 + 3 bays (`sash` decals), quoin strips, pedimented centre with clock (`clock` decal), cupola (square base, 6-8 columns, 16-segment dome, finial), Doric porch with balcony, 4 chimney stacks. Place it facing south onto the lock at 53.33037, -6.26468.

**Canal lock kit, ~900 tris per lock**, instanced x6 (C2-C7). Dimensions in real metres:
- chamber: 22 m long x 4.5 m wide inside
- lock walls: 0.6 m coping, 1.0 m below road level down to water; the chamber is the gap the canal code leaves (`LOCK_DROP` 0.3 m)
- gates: 2 mitre pairs, each leaf 2.4 m wide, 0.3 m thick, dark timber `#2a2622`
- balance beams: 4 per lock, 5.8 m x 0.35 m x 0.35 m, black `#161616`, at 1.1 m
- bollards: 6 per lock, 0.6 m high x 0.3 m dia, white `#f1f1ee` with black top band
- gate walkways: 0.5 m wide planks with a 1 m tubular handrail
- paddle gear: 2 black ratchet stands
- surround: a sett apron (`surface: sett` texture) 3 m each side
- optional: water spilling over the upper gates (a white-foam alpha strip)

**Bridge kit**, replacing the flat default for these seven crossings:
- **(a) Masonry arch**, for Eustace, Macartney and Mount St:
  - deck width = way width + footpaths
  - arch span ≈6 m real (≈ canal width at the bridge)
  - calp/granite faces `#8d8a84` with brick patches `#a3563d`
  - parapet 1.1 m granite, coping `#b0ada5`
  - camber +0.5-0.8 m
  - Eustace gets the black water main over its west face
- **(b) Humpback**, for Huband only:
  - 7 m-wide deck, +1.5 m crown, ramps over ±12 game m
  - granite parapet with a 3 m cast-iron baluster panel at the crown (alpha) and a carved plaque decal "HUBAND BRIDGE 1791"
  - limestone end piers
  - narrow and access=destination (residential)
- **(c) Iron girder**, for La Touche: riveted girder fascia and openwork cast-iron railing, plum `#8e3b67`; granite piers; roundel plaque decal.
- **(d) Plain concrete**, for Charlemont and Robert Emmet: flat deck, plain parapet.
- **Luas viaduct** (Charlemont): concrete deck on dark-red steel girders `#7a2a26`, grey piers, glazed parapets, two side platforms with shelters over the water, and a stair tower to Grand Parade. ≈2k tris, or reuse the Luas stop kit on a raised deck.

**Kavanagh bench statue, ~1.5k tris.** Low-poly seated figure plus bench in verdigris bronze on a 3 x 2 m block-paved pad, north towpath at 53.33360, -6.24794, facing the water (south-east).

### P1: filler and dressing

- **Camden / Wexford / Richmond St terrace type.**
  - 3-4 storeys, 5-7 m plots, parapet roofline with chimney stacks.
  - Fronts alternate: 60% brick (red and brown), 40% painted render (white, cream, grey, occasional pastel).
  - Every ground floor is a shop or pub front from the §3.3 palette. Awnings on ~25% of fronts, flags and hanging baskets on pubs, and 1-2 painted gable murals per block.
  - Bleeding Horse and Devitt's are worth bespoke fronts (decals) at their OSM spots.
- **Georgian terrace type** (Harcourt St north part, Camden St Upper west, Leeson St, Baggot St, Fitzwilliam St, Herbert Pl, Wilton Tce, Percy Pl, Warrington Pl, Mount St Upper):
  - 4 storeys over basement, red-brown brick `#7e4f3c`, granite steps and plinth, fanlight doors (coloured doors: red, blue, green, black, yellow), black railings to the areas.
  - Reuse the existing Merrion Sq terrace generator.
  - **Mount St Upper frames St Stephen's "Pepper Canister" Church** (53.33679, -6.24370; OSM `51218691`) at its end. Add at least a generic pedimented church with a pepper-pot cupola. It is the key vista of the P2 east spoke.
- **Modern office type** (Harcourt Rd, south Harcourt St, Adelaide Rd, Charlemont, Mespil / Baggot Plaza): 5-8 storeys, stone and glass, setback top floors. OSM gives levels for many (One/Two Park Place 8, Block 1 Miesian Plaza 9, Hilton Charlemont 6, WeWork 7).
- **Canal dressing:**
  - grass verges with a single row of large limes / planes every ~8-10 m (game spacing) on both banks
  - tarmac towpath on the north bank
  - black-painted steel railing along road edges
  - benches, and moored barges (1-2 near Portobello and Baggot)
  - **swans, ducks and gulls** on the water (Portobello Harbour especially; ref 16)
  - reeds at pool edges (ref 12)
  - the 1916 stele at Mount St Br
- **Street furniture:**
  - ornate double-lantern Dublin lamp columns on Camden, Harcourt and Leeson Sts; standard columns on the canal roads
  - grey tubular Luas OCS poles every ~25-30 m with span wires on Harcourt St
  - wand bollards on Camden St Upper
  - Dublin Bikes stations
  - bus shelters on Camden St / Richmond St S and Leeson St

### P2

- **Infill streets** in §1.6 (Grantham, Synge, Pleasants, Lennox, Charlemont Pl / Harcourt Tce, Pembroke St chain, Fitzwilliam Sq).
- **Edge stubs** (Rathmines Rd Lower with the Mary Immaculate dome as backdrop, Ranelagh Rd, Harold's Cross Rd, Parnell Rd, Leeson St Upper).
- **Iveagh Gardens** tree mass. National Concert Hall (granite, 53.33397-53.33548 on Earlsfort Tce / Hatch St) as a generic classical block.
- **SCR west to Dolphin's Barn / Rialto / Kilmainham (assessment):**
  - **Distances (OSM `125873172` and Parnell Rd `39523885`):**
    - SCR from Clanbrassil (-6.2752) to Dolphin's Barn (≈-6.2925) is ≈1.15 km real; the canal / Parnell Rd reaches Dolphin's Barn Bridge (53.33187, -6.29276) over the same distance.
    - Rialto (≈-6.2965) is ≈0.3 km further.
    - From there, SCR north to Kilmainham plus Kilmainham to Heuston is ≈1.8 km more.
  - **Total** ≈3.2 km real ≈ 1.6 km game, all west of the current `bounds.west`-driven detail. Dolphin's Barn and Rialto are inside the current west bound (-6.2975); Kilmainham (≈-6.305) is not.
  - **Verdict:** only the **SCR + Parnell Rd to Dolphin's Barn** (≈0.6 km game each, making a loop via Dolphin's Barn Bridge) is worth it in the next pass.
    - It closes a second canal loop.
    - Cork St runs from Dolphin's Barn back NE to the Coombe, near the existing St Patrick's area, so the loop can close without Kilmainham.
    - Going on to Heuston via Rialto/Kilmainham is long, low-landmark residential road. Leave it until the Phoenix Park / Heuston west side is built.
  - None of this was surveyed in detail. It needs its own Overpass pull west of -6.281.

**Triangle budget for the area:**

| Item | Tris |
|---|---|
| Harcourt St station | ~6k |
| Portobello House | ~4k |
| Lock kit (6 x 0.9k) | ~5.4k |
| Special bridges | ~4k |
| Luas viaduct + stop | ~2.5k |
| Kavanagh | ~1.5k |
| **Heroes total** | **≈23k** |

Everything else is filler / instanced props. The canal adds ~2.8 km of verge trees. **Instance the trees and cap them by distance** (the BUILD-REPORT flags instanced props as the main GPU cost).

---

## 5. Open questions

1. **East seam / Mount Street.**
   - The existing way `Mount Street Lower` GT0→MT1 ends at MT1 (53.33866, -6.2385), which is really **Macquay's Bridge** on Grand Canal St, not Mount Street Bridge.
   - I propose a new `Mount Street Lower` GT0 → GXSMS1 (Mount St Bridge north, 53.33775, -6.24075).
   - The east/Aviva researcher should rename or rethink GT0→MT1 and pick up GXSMS2 (Northumberland Rd), GXSHD2 (Haddington Rd / Northumberland Rd, 53.33614, -6.23813) and GXSPB1 (Baggot St Upper / Pembroke Rd, 53.33291, -6.24257).
   - The canal centreline hand-off point is 53.33838, -6.23909 (lock C1) → 53.33860, -6.23875.
2. **Move HC1 / HC0?** Moving HC1 44 game m west straightens Harcourt St. Re-homing the street's north end to SGSW would match reality (the street leaves the SW corner of the Green). Both touch the Luas route and the Georgian Sprint trial path (`trial.js` uses HC0 on SG South, which is unaffected if HC0 stays).
3. **Bank-road push-out.** Is 18 game m from the canal centreline (≈36 m real, against a real 10-30 m) acceptable? It keeps the water readable at half scale, but it lengthens every canal bridge to ~32-36 game m and moves Portobello House's frontage road. The alternative is a narrower canal (width 9) with roads at 15 m.
4. **Portobello House fit.** Its real front is ≈8 m from the lock. With GXSLT1 pushed to 18 m, and Charlemont Mall / Portobello Harbour ending there, check that its footprint (plan-scaled) still sits between Richmond St S and the Portobello Harbour lane without hitting either.
5. **Charlemont Place / Harcourt Terrace.** Is it a through road for cars? OSM has an unclassified link and a pedestrian "Charlemont Walk / Square" beside it. Include it only if Mapillary or a visit confirms.
6. **Baggot St Lower one-way.** The existing MR1–BG1 way is two-way in the game, but reality is **eastbound-only** from Merrion Row to Pembroke St (OSM `3792491`, `230483150`). Encode `oneway: 1` on MR1→BG1? AI traffic would then have to use Fitzwilliam St / Mount St to get back north, which works with the snippet.
7. **Heights.** No surveyed heights exist for the station colonnade, pavilion or Portobello House. All are photo estimates (±15%).
8. **Whelan's and Camden Exchange fronts.** No CC photo of either was found. "The Deer" is not in OSM. A Mapillary token or a street visit would pin the colours.
9. **Rathmines Rd / Ranelagh extension.** The Luas to Ranelagh stop (≈53.3262) and Rathmines village (the church dome) lie ~300-400 m beyond the proposed bound. Extend the bound to ≈53.3260 for them, or keep them as backdrop?

## Sources

- OSM via Overpass (ODbL): `data/osm/canal-south.json`
- [Harcourt Street railway station, Wikipedia](https://en.wikipedia.org/wiki/Harcourt_Street_railway_station)
- [Harcourt Street, Wikipedia](https://en.wikipedia.org/wiki/Harcourt_Street)
- [Charlemont Luas stop, Wikipedia](https://en.wikipedia.org/wiki/Charlemont_Luas_stop)
- [Portobello, Dublin, Wikipedia](https://en.wikipedia.org/wiki/Portobello,_Dublin) (Portobello House, La Touche Bridge, Bleeding Horse)
- [Grand Canal (Ireland), Wikipedia](https://en.wikipedia.org/wiki/Grand_Canal_(Ireland))
- [List of Dublin bridges and tunnels, Wikipedia](https://en.wikipedia.org/wiki/List_of_Dublin_bridges_and_tunnels)
- [NIAH 50100594, Huband Bridge](https://www.buildingsofireland.ie/buildings-search/building/50100594/huband-bridge-warrington-place-percy-place-dublin-2-dublin)
- [NIAH 50100595, Huband Bridge lock](https://www.buildingsofireland.ie/buildings-search/building/50100595/huband-bridge-grand-canal-dublin-2-dublin)
- [NIAH 50100536, McKenney Bridge Lock](https://www.buildingsofireland.ie/buildings-search/building/50100536/mckenney-bridge-lock-grand-canal-dublin-2-dublin)
- [Kavanagh statue: excellentstreetimages.com ("north bank of Grand Canal on Mespil Road")](https://www.excellentstreetimages.com/in-the-year-twentytwenty/all-forms-and-styles-of-public-art/patrick-kavanagh/), [RTÉ Archives, 1991 unveiling](https://www.rte.ie/archives/2016/0523/790403-patrick-kavanagh-statue/), [John Coll sculptures](http://www.johncollsculptures.com/patrick-kavanagh.html), [Come Here To Me, Kavanagh's two seats](https://comeheretome.com/2010/11/30/kavanaghs-two-dublin-seats-and-an-international-resting-spot/)
- Wikimedia Commons images as listed in §2

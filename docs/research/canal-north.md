# Northern ring: Parnell Square to the Royal Canal and the NCR (`canal-north`): Phase 1 research

Scope: the spokes from the current north edge (Parnell Street, top of O'Connell Street, Amiens Street, Sheriff Street) up to the North Circular Road (NCR) and the Royal Canal. That takes in Parnell Square (the Rotunda, the Gate, the Garden of Remembrance, the Hugh Lane), Frederick St, Dorset St to Binns Bridge, Gardiner St, Mountjoy Square, Summerhill and Ballybough, Amiens St and North Strand to Newcomen Bridge, and Sheriff St / Seville Place / Spencer Dock. It also covers the NCR from Portland Row west through Phibsborough and Hanlon's Corner to the Phoenix Park gate, the Royal Canal from the Liffey to Cross Guns Bridge, and the Luas Green Line from O'Connell St to Cabra.

- Raw OSM: `data/osm/canal-north.json`. Overpass `out geom`, bbox **S 53.3490, W -6.3075, N 53.3665, E -6.2220** (about 5.6 km E-W by 1.95 km N-S). Snapshot `timestamp_osm_base` **2026-05-31T22:37:44Z** (served by the overpass.kumi.systems mirror; overpass-api.de was overloaded). 7,863 elements, 6.4 MB. It holds all drivable highways (service included), rail, tram, stops and platforms, waterways, water polygons, lock gates, bridges, named buildings, hospitals, prisons, theatres, churches, pubs, parks, walls, historic and artwork nodes, and levelled buildings in the Parnell Sq to Phibsborough core.
- References: `refs/canal-north/` holds 16 images from Wikimedia Commons (credits in §2).
- Mapillary: **not used** (no token).
- Game coordinates come from re-implementing `project()` in `src/world/geo.js`: origin 53.34727/-6.25915, SCALE 0.5, the E-W stretch band (x1.6), and the N-S stretch band (x1.4, Dame St to the quays). Everything here is north of the N-S band, so **z is shifted a constant ≈ -44.5 game m north** of a plain 50% projection. The west end (NCR gate) is also west of the E-W band, so its x carries the band shift. Game x/z below include both. They will change if the outer ring gets extra compression (open question 1).
- Tags: **VERIFIED** = read from OSM or a cited source. **est.** = my estimate.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 The existing north edge is displaced (VERIFIED against OSM)

The hand-traced graph is accurate at O'Connell St but drifts badly to the east and west along Parnell St. New streets at real coordinates will not mesh cleanly unless a few edge nodes are re-seated first.

| Node | Game [lat, lon] | Real junction it stands for | Off by (real m) | Game x,z now → re-seated | Recommendation |
|---|---|---|---|---|---|
| OC4 | 53.3525, -6.2615 | O'Connell St Upper × Parnell St (53.3525, -6.2615) | 0 | -84.1, -335.6 | Keep |
| PN4 | 53.3527, -6.2585 | Really **Seán MacDermott St Upper × Cumberland St N**, not Parnell St | 20 | 21.6, -346.8 | Keep the node. **Rename** way leg OC4-PN4-GA2 to "Cathal Brugha Street / Seán MacDermott Street" (OSM: Cathal Brugha St 53.3519-53.3527; Seán MacDermott St Upper 53.3527-53.3530, Lower 53.3530-53.3543) |
| GA2 | 53.3529, -6.2548 | Gardiner St Lower × Seán MacDermott St (53.35303, -6.25604) | 84 | 144.5, -357.9 → 103.3, -365.1 | **Re-seat.** Gardiner St then runs straight TB1 → GA2 → RN06, as it really does |
| AM | 53.35095, -6.2511 | Amiens St × Talbot St (53.35137, -6.25006) | 84 | 267.5, -249.4 → 302.0, -272.7 | **Re-seat** |
| AM2 | 53.353, -6.2496 | Amiens St × Buckingham St Lower (53.35279, -6.24880) | 58 | 317.3, -363.5 → 343.9, -351.8 | **Re-seat** |
| CM2 | 53.3505, -6.2459 | Commons St × Sheriff St Lower (53.35091, -6.24555) | 51 | 440.3, -224.3 → 451.9, -247.1 | **Re-seat** (then Sheriff St Lower passes through it) |
| MB3 | 53.3512, -6.2588 | Marlborough St, on line | 7 | 11.6, -263.3 | Keep; it currently dead-ends. Extend to Parnell St (RN05) |
| PN0 | 53.35115, -6.269 | Best read as **Capel St × Bolton St × N King St** (53.35107, -6.27007). Real Capel × Parnell is 53.34963, -6.26922 | 72 (or 169) | -452.9, -260.5 | Keep. Bolton St starts here. See open question 2 |
| JV2 | 53.35165, -6.2668 | Jervis St × Parnell St (53.35019, -6.26721) | **165** | -365.8, -288.3 | Leave (open question 2) |
| PN2 | 53.3521, -6.2642 | Parnell St × Dominick St Lower (53.35099, -6.26462) | **127** | -227.6, -313.4 | Leave. Dominick St Lower ends here |
| CS2 | 53.3499, -6.275 | Church St × N King St (53.35014, -6.27454) | 41 | -652.2, -190.9 | Keep. Church St Upper continues north from here |
| BH1, GS2 | exact | Stoneybatter × N King St; Seville Pl × Sheriff St × Guild St | 0 | | Keep |

The west half of the game's Parnell Street (PN0-JV2-PN2) lies 120-170 m north of the real street. It runs roughly where Bolton St / King's Inns St / Dominick St Lower are. The Dominick St, Bolton St and Parnell Sq West proposals below attach to the existing nodes regardless, and the kinks are ≤ 40 game m.

### 1.2 One-way and lane facts (VERIFIED, OSM oneway/lanes tags, length-weighted)

| Street | Reality | Model as |
|---|---|---|
| **Parnell Square** | A **clockwise one-way loop** around the Rotunda block: W side northbound (2 lanes), N side eastbound (1 lane), E side and Cavendish Row southbound (2 lanes, 1 bus lane) | `oneway` on all four sides |
| Granby Row | One-way **westbound**, 3 lanes (Parnell Sq NW → Dorset St) | oneway |
| **Dorset St Upper** | Two-way, 2-4 lanes | two-way, 15 m |
| **Dorset St Lower** | **Dual carriageway**: separate one-way northbound (510 m) and southbound (512 m) ways of 2-3 lanes each, 6 lanes on Binns Bridge | one wide two-way (20 m) or a narrow boulevard |
| **Gardiner St Lower** | **Two-way in this snapshot** (2-3 lanes). Only a 44 m one-way piece at Beresford Place remains. Middle and Upper are two-way | two-way |
| Dominick St Lower / Upper | One-way for cars towards Parnell St (Lower) and towards Bolton St (Upper). The Luas runs both ways along both | oneway 1 |
| St Mary's Place (round the Black Church) | One-way westbound | oneway |
| Blessington St | One-way eastbound (Mountjoy St → Dorset St) | oneway |
| Marlborough St | One-way southbound, 1 lane, plus the southbound Luas | oneway -1 on MB3→RN05 |
| Buckingham St Lower/Upper | One-way northbound | (P2, not in the snippet) |
| Killarney St | One-way westbound | (not included) |
| Summerhill | A mixture: 304 m one-way in each direction (split carriageway at the east end) plus 265 m two-way | two-way, 15 m |
| Church St Upper, Constitution Hill | Split one-way pairs, 2-3 lanes | two-way, 13 m |
| NCR | Two-way throughout, **2 lanes** (3-4 lanes at Phibsborough), 50 km/h, secondary (R101/R147 sections) | two-way primary, 12 m |
| Phibsborough Rd, North Strand Rd, Amiens St, Ballybough Rd, Bolton St | Two-way, 3-5 lanes | two-way, 14-16 m |

Widths in the snippet are **est.** kerb-to-kerb from lane counts (≈3.2 m/lane plus parking/cycle). OSM carries almost no `width` tags here.

### 1.3 The Royal Canal (VERIFIED, OSM waterway/water/lock ways)

- **Route (Liffey → Cross Guns):**
  - It enters the Liffey under North Wall Quay at **≈53.3479, -6.2405**, between game nodes NQ15 and NQ16. The existing **Guild Street runs right beside it** on the west.
  - It runs north up **Spencer Dock**, passing under the existing Mayor St Upper (Luas Spencer Dock Bridge, 53.3490) and the existing Sheriff St Upper (a lifting bridge, 53.35056, -6.2401).
  - It goes under the big GNR/Loop Line viaducts (≈53.3552, -6.2424).
  - **1st Lock** at **Newcomen Bridge** (North Strand Rd).
  - It turns WNW past Clarke's Bridge (Summerhill Parade/Ballybough Rd). It then runs **under Croke Park's south stand**: OSM tags the stretch from 53.35927, -6.24995 to 53.36009, -6.25356 as `layer=-1`, and the stadium polygon reaches 53.3588, south of the canal.
  - Then Bloody Sunday Bridge (Russell St/Jones's Rd), **2nd Lock under Binns Bridge** (Dorset St/Drumcondra Rd), **3rd and 4th Locks** in the open stretch behind Mountjoy Prison, **5th Lock at Cross Guns Bridge** (Phibsborough Rd), and the **6th Lock** (double) just west of it.
- **The NCR and the canal are separate lines.** From Ballybough to Dorset St the canal runs **100-250 m north of the NCR**, parallel. The Irish rail line (GSWR North Wall branch) runs along its north bank. West of Binns Bridge the canal swings NW to Cross Guns, **≈400 m north** of the NCR at Doyle's Corner. **Whitworth Road** follows the north bank from Binns Bridge to Cross Guns, which makes the natural northern road edge. West of Cross Guns the canal leaves the scope towards Broombridge; it never reaches the Phoenix Park.
- **The Broadstone branch is gone.** It ran south from Cross Guns to Broadstone and was filled in. Its line is now the **Royal Canal Bank** linear park, and **Blaquiere Bridge** on the NCR (53.3607, -6.2712) crosses dry ground. **Blessington Street Basin** (relation 270012, 53.3573, -6.2709) was its reservoir: a pretty railed pond park.
- **Locks** (OSM `lock=yes`, NIAH refs). Lock positions are chamber centres:

| Lock | Position | OSM `lock:height` | Notes |
|---|---|---|---|
| Sea lock (Spencer Dock) | ≈53.3479, -6.2405 | – | New sea locks c.2008 under North Wall Quay (Commons "New Sea Locks at Spencer Dock"). Not tagged as a lock in OSM |
| 1st | 53.35670, -6.24458 | – | Newcomen Bridge; NIAH 50060480. Gates at 53.35662/53.35678 |
| 2nd | 53.36159, -6.26006 | 6.6 | **Directly under Binns Bridge** (NIAH 50060188, ref 12). Double lock. The lower chamber sits beneath the bridge |
| 3rd | 53.36255, -6.26414 | 5.4 | NIAH 50060187, ref 13 |
| 4th | 53.36332, -6.26746 | 5.35 | NIAH 50060186 |
| 5th | 53.36450, -6.27239 | 5.5 | At Cross Guns Bridge; NIAH 50060184, ref 14 |
| 6th | 53.36551, -6.27621 | 5.3 | Double lock; timber footbridges on its top, middle and bottom gates; NIAH 50060182 |

The `lock:height` values look like chamber depth rather than rise: 5-6 m per lock is far more than the real ~3 m rises (est.). The game's stylised 0.3 m per lock step (`LOCK_DROP`) is fine.
- **Widths (from OSM water polygons, area ÷ length):**
  - Canal pools 10-14.5 m (Newcomen–Croke Park ≈10 m, Binns–3rd ≈14.5 m, 4th–5th ≈12.6 m).
  - Lock chambers ≈4.5-6 m. The navigation limit is 13 ft 3 in / 4.04 m beam (Wikipedia, Royal Canal).
  - **Spencer Dock ≈27 m** (15,468 m² over ≈560 m).
- **Towpaths:** the **Royal Canal Greenway** (asphalt cycle/foot path, 4 m) runs along the south bank from Spencer Dock to Cross Guns. It has new ramp bridges at the 1st Lock (2024) and Bloody Sunday Bridge. Timber boardwalks run beside the locks (refs 13, 14) and grass banks elsewhere.

### 1.4 Luas Green Line north of O'Connell Bridge (VERIFIED, OSM tram ways)

The game's `luasGreen` stops at Westmoreland (WM1). Really, **northbound trams run up O'Connell St** and turn west into Parnell St. **Southbound trams come east along Parnell St past the "Parnell" stop and down Marlborough St.** From Parnell St the line turns up **Dominick St Lower** (Dominick stop), crosses the Bolton/Dorset junction, goes up **Dominick St Upper**, then swings west to **Broadstone – University** stop. There it turns north through the Broadstone/Grangegorman campus on the old Midland railway alignment (**Grangegorman** stop), passes **under the NCR** at 53.35952, -6.27817, reaches **Phibsborough** (in the cutting beside Cabra Rd) and **Cabra**, then goes on to Broombridge (out of scope, 53.3725).

| Stop | OSM position | Game node |
|---|---|---|
| O'Connell – GPO | ≈53.3497 (just south of bbox) | OC2 |
| O'Connell Upper | 53.35159, -6.26106 | OC3 |
| Parnell (southbound only) | 53.35308, -6.26047 | on RN05 leg (skip in a single-track model) |
| Marlborough (southbound only) | 53.34918, -6.25776 | AB1 area (skip) |
| Dominick | 53.35142, -6.26573 | RNL1 |
| Broadstone – University | 53.35406, -6.27377 | RNL3 |
| Grangegorman | 53.35710, -6.27736 | RNL5 |
| Phibsborough | 53.36042, -6.27893 | RNL7 |
| Cabra | 53.36412, -6.28182 | RNL8 |

**Red Line:** the Connolly spur (Busáras → Connolly stop, 53.35091, -6.24996, under the station's Amiens St frontage) is also missing from the game. It is a P2 item (open question 8).

---

## 1.5 Proposed street graph (`RN*` nodes)

- All IDs are checked against `src/data/streets.json`: no clashes. Every way resolves.
- The only endpoints that need another party are **RN62** (Jones's Rd, Croke Park agent) and two inserts into existing ways: **RN01** into Parnell Street (PN0, JV2, PN2, **RN01**, OC4, …) and **RN30** into Amiens Street (BP3, AM, **RN30**, AM2).
- Length: ≈10.7 km of game road (52 ways). The P0 core (§4) is about half of that.

**Loops this creates (no dead ends):**
- **Parnell Sq one-way ring:** O'Connell St → Parnell St → Parnell Sq W → N → E → Cavendish Row → O'Connell St.
- **Dorset St loop:** Dorset St → NCR → Phibsborough Rd → Constitution Hill → Church St → N King St/Bolton St → Dorset St.
- **Canal-bank loop:** Dorset St Lower → Binns Bridge → Whitworth Rd → Cross Guns Bridge → Phibsborough Rd → NCR.
- **Gardiner/Mountjoy loop:** Gardiner St → Mountjoy Sq → Gardiner St Upper → Dorset St Lower → NCR → Fitzgibbon St → Mountjoy Sq.
- **East loop:** NCR → Summerhill Parade → Clarke's Bridge → Ballybough Rd → Poplar Row → North Strand (Newcomen Bridge) → Five Lamps → Portland Row → NCR.
- **Docks loop:** Amiens St → Sheriff St Lower → Seville Place → Five Lamps.
- **West loop:** NCR → Hanlon's Corner → Prussia St/Stoneybatter → BH1 → Arbour Hill/Blackhall Pl → quays → Infirmary Rd → NCR gate.

#### Nodes

| ID | lat, lon | Game x, z | Junction |
|---|---|---|---|
| RN01 | 53.35190, -6.26309 | -168.6, -302.2 | Parnell St x Parnell Sq West (insert into existing Parnell Street between PN2 and OC4) |
| RN02 | 53.35351, -6.26543 | -293, -391.8 | Parnell Sq West x Parnell Sq North x Granby Row (NW corner) |
| RN03 | 53.35453, -6.26353 | -192, -448.6 | Parnell Sq North x Parnell Sq East x Frederick St N x Gardiner Row (NE corner, Findlater's Church) |
| RN04 | 53.35318, -6.26193 | -106.9, -373.5 | Parnell Sq East / Cavendish Row at Rutland Place (Gate Theatre) |
| RN05 | 53.35337, -6.25968 | -17.6, -384.1 | Parnell St x Marlborough St |
| RN06 | 53.35421, -6.25689 | 75.1, -430.8 | Parnell St x Gardiner St x Summerhill |
| RN07 | 53.35549, -6.25782 | 44.2, -502.1 | Gardiner St Middle x Mountjoy Sq (SW corner) |
| RN08 | 53.35679, -6.25910 | 1.7, -574.4 | Mountjoy Sq NW corner x Gardiner Place x Gardiner St Upper |
| RN09 | 53.35753, -6.25710 | 68.1, -615.6 | Mountjoy Sq NE corner x Fitzgibbon St x Belvedere Place |
| RN10 | 53.35640, -6.25590 | 108, -552.7 | Mountjoy Sq SE corner (Great Charles St) |
| RN11 | 53.35581, -6.26098 | -60.8, -519.9 | Great Denmark St x Gardiner Place x Temple St N x Hill St |
| RN12 | 53.35899, -6.26189 | -104.8, -696.9 | Dorset St Lower x Gardiner St Upper |
| RN13 | 53.35602, -6.26525 | -283.4, -531.6 | Dorset St Upper x Frederick St N x Blessington St |
| RN14 | 53.35296, -6.26830 | -429.6, -361.2 | Bolton St x Dorset St Upper x Dominick St Upper/Lower (Luas Green crosses) |
| RN15 | 53.35421, -6.26692 | -372.2, -430.8 | Dorset St Upper x Granby Row x St Mary's Place |
| RN16 | 53.35754, -6.26386 | -209.5, -616.2 | Dorset St x Eccles St x Hardwicke Place (St George's) |
| RN17 | 53.35974, -6.26120 | -68.1, -738.6 | NCR x Dorset St Lower  [STITCH croke-park] |
| RN18 | 53.36147, -6.25967 | -17.3, -834.9 | Binns Bridge crown (2nd Lock under the arch) |
| RN19 | 53.36175, -6.25949 | -11.3, -850.5 | Drumcondra Rd Lower x Whitworth Rd, north end of Binns Bridge  [STITCH croke-park] |
| RN20 | 53.35632, -6.25120 | 264.2, -548.3 | Summerhill x Buckingham St Upper |
| RN21 | 53.35701, -6.24977 | 311.7, -586.7 | NCR east end x Summerhill x Portland Row x Summerhill Parade  [STITCH croke-park] |
| RN22 | 53.35814, -6.24753 | 386.1, -649.6 | Clarke's Bridge, south end |
| RN23 | 53.35835, -6.24718 | 397.7, -661.2 | Clarke's Bridge, north end = Ballybough Rd |
| RN24 | 53.36137, -6.24277 | 544.3, -829.3 | Ballybough Rd x Poplar Row x Fairview Strand x Clonliffe Rd  [STITCH croke-park] |
| RN25 | 53.35470, -6.24669 | 414, -458.1 | Five Lamps: Amiens St x North Strand Rd x Portland Row x Seville Place |
| RN26 | 53.35652, -6.24425 | 495.1, -559.4 | Newcomen Bridge crown (North Strand Rd over the canal, 1st Lock) |
| RN27 | 53.35863, -6.24117 | 597.4, -676.8 | North Strand Rd x Northbrook Ave (under the rail bridge) |
| RN28 | 53.36062, -6.23903 | 668.5, -787.6 | North Strand Rd x Annesley Bridge Rd x East Wall Rd x Poplar Row |
| RN29 | 53.35237, -6.24354 | 518.7, -328.4 | Seville Place x Oriel St |
| RN30 | 53.35178, -6.24979 | 311, -295.6 | Amiens St x Sheriff St Lower (insert into existing Amiens Street between AM and AM2) |
| RN31 | 53.35071, -6.24234 | 558.5, -236 | Sheriff St Lower at Spencer Dock (west side) |
| RN32 | 53.35183, -6.27347 | -601.4, -298.3 | Church St Upper x Constitution Hill |
| RN33 | 53.35349, -6.27297 | -584.8, -390.7 | Constitution Hill x Broadstone (Luas stop) |
| RN34 | 53.35445, -6.27328 | -595.1, -444.2 | Constitution Hill x Phibsborough Rd x Western Way |
| RN35 | 53.35868, -6.27324 | -593.8, -679.6 | Phibsborough Rd x Monck Place |
| RN36 | 53.36079, -6.27269 | -575.5, -797.1 | Doyle's Corner: NCR x Phibsborough Rd |
| RN37 | 53.36253, -6.27269 | -575.5, -893.9 | Phibsborough Rd x Connaught St (shopping centre) |
| RN38 | 53.36426, -6.27186 | -547.9, -990.2 | Cross Guns Bridge, south end x Royal Canal Bank |
| RN39 | 53.36464, -6.27177 | -544.9, -1011.3 | Cross Guns Bridge, north end x Whitworth Rd x Prospect Rd |
| RN40 | 53.35464, -6.27242 | -566.5, -454.7 | Western Way x Dominick St Upper (Luas) |
| RN41 | 53.35475, -6.26880 | -446.2, -460.9 | Western Way x Mountjoy St x St Mary's Place N (Black Church) |
| RN42 | 53.35677, -6.26793 | -417.3, -573.3 | Mountjoy St x Blessington St x Berkeley St |
| RN43 | 53.35924, -6.26980 | -479.5, -710.8 | Berkeley Rd x Eccles St |
| RN44 | 53.36057, -6.26967 | -475.1, -784.8 | NCR x Berkeley Rd (Mountjoy Prison approach) |
| RN50 | 53.35220, -6.29810 | -1419.8, -318.9 | NCR x Infirmary Rd = Phoenix Park NCR Gate  [STITCH phoenix-park] |
| RN51 | 53.35497, -6.29368 | -1272.9, -473.1 | NCR x Oxmantown Rd x Marlborough Rd (McKee Barracks) |
| RN52 | 53.35578, -6.29241 | -1230.7, -518.2 | NCR x Aughrim St x Blackhorse Ave |
| RN53 | 53.35722, -6.28881 | -1111.1, -598.3 | Hanlon's Corner: NCR x Prussia St x Old Cabra Rd |
| RN54 | 53.35868, -6.28243 | -899.1, -679.6 | NCR x Grangegorman Upper |
| RN55 | 53.35980, -6.27845 | -766.9, -741.9 | NCR bridge over the Luas cutting |
| RN56 | 53.36078, -6.27512 | -656.2, -796.5 | NCR x Cabra Rd (Dalymount) |
| RN57 | 53.36030, -6.26608 | -327.6, -769.8 | NCR at the Mater (hospital set-down) |
| RN58 | 53.35920, -6.25870 | 15, -708.6 | NCR x Belvedere Rd/Place |
| RN59 | 53.35839, -6.25460 | 151.2, -663.5 | NCR x Russell St x Fitzgibbon St  [STITCH croke-park] |
| RN60 | 53.35787, -6.25211 | 233.9, -634.5 | NCR x Great Charles St |
| RN61 | 53.35997, -6.25375 | 179.4, -751.4 | Bloody Sunday Bridge, south end (Russell St) |
| RN62 | 53.36028, -6.25358 | 185.1, -768.7 | Bloody Sunday Bridge, north end = Jones's Rd  [STITCH croke-park] |
| RN63 | 53.35356, -6.28560 | -1004.5, -394.6 | Manor St x Prussia St x Aughrim St |
| RN64 | 53.35011, -6.29614 | -1354.7, -202.6 | Infirmary Rd x Montpelier Gardens |
| RN65 | 53.36329, -6.26597 | -321.7, -936.2 | Whitworth Rd x Claude Rd (shape) |
| RNL1 | 53.35142, -6.26573 | -308.9, -275.5 | Luas: Dominick stop (Dominick St Lower) |
| RNL2 | 53.35441, -6.27230 | -562.5, -441.9 | Luas: Dominick St Upper curve |
| RNL3 | 53.35406, -6.27377 | -611.4, -422.5 | Luas: Broadstone - University stop |
| RNL4 | 53.35467, -6.27591 | -682.5, -456.4 | Luas: Broadstone curve into Grangegorman |
| RNL5 | 53.35710, -6.27736 | -730.7, -591.7 | Luas: Grangegorman stop |
| RNL6 | 53.35952, -6.27817 | -757.6, -726.4 | Luas: under the NCR bridge |
| RNL7 | 53.36042, -6.27893 | -782.8, -776.5 | Luas: Phibsborough stop |
| RNL8 | 53.36412, -6.28182 | -878.9, -982.4 | Luas: Cabra stop |
| RNL9 | 53.36657, -6.28378 | -944, -1118.8 | Luas: line end toward Broombridge |

#### Ways

| Name | type | width | nodes | one-way | game length | notes |
|---|---|---|---|---|---|---|
| Parnell Square West | secondary | 11 | RN01 → RN02 | oneway 1 | 153 | one-way northbound |
| Parnell Square North | secondary | 10 | RN02 → RN03 | oneway 1 | 116 | one-way eastbound |
| Parnell Square East | secondary | 12 | RN03 → RN04 | oneway 1 | 113 | one-way southbound, bus lane |
| Cavendish Row | secondary | 13 | RN04 → OC4 | oneway 1 | 44 | one-way southbound into O'Connell St |
| Granby Row | secondary | 11 | RN02 → RN15 | oneway 1 | 88 | one-way westbound, 3 lanes |
| Frederick Street North | secondary | 12 | RN03 → RN13 | two-way | 123 | two-way |
| Great Denmark Street | secondary | 11 | RN03 → RN11 | two-way | 149 | Gardiner Row + Great Denmark St (Belvedere College) |
| Gardiner Place | secondary | 11 | RN11 → RN08 | two-way | 83 |  |
| Parnell Street | primary | 14 | OC4 → RN05 → RN06 | two-way | 186 | real east leg; Luas Green southbound track OC4-RN05 |
| Marlborough Street | lane | 8 | MB3 → RN05 | oneway -1 | 124 | one-way southbound (nodes run north, so -1); Luas southbound |
| Gardiner Street Lower | primary | 15 | GA2 → RN06 | two-way | 101 | continues the existing way |
| Gardiner Street Middle | primary | 14 | RN06 → RN07 | two-way | 78 |  |
| Mountjoy Square West | secondary | 10 | RN07 → RN08 | two-way | 84 |  |
| Mountjoy Square North | secondary | 10 | RN08 → RN09 | two-way | 78 |  |
| Mountjoy Square East | secondary | 10 | RN09 → RN10 | two-way | 74 |  |
| Mountjoy Square South | secondary | 10 | RN10 → RN07 | two-way | 81 |  |
| Gardiner Street Upper | primary | 14 | RN08 → RN12 | two-way | 162 | St Francis Xavier church at the top |
| Fitzgibbon Street | secondary | 10 | RN09 → RN59 | two-way | 96 | to the NCR and Croke Park |
| Bolton Street | primary | 15 | PN0 → RN14 | two-way | 103 | 4 lanes |
| Dorset Street Upper | primary | 15 | RN14 → RN15 → RN13 → RN16 | two-way | 337 | two-way, 2-4 lanes |
| Dorset Street Lower | primary | 20 | RN16 → RN12 → RN17 → RN18 | two-way | 297 | dual carriageway (one-way pairs, 2-3 lanes each) |
| Binns Bridge | bridge | 20 | RN18 → RN19 | two-way | 17 | humpback over the 2nd Lock, 6 lanes |
| Whitworth Road | secondary | 9 | RN19 → RN65 → RN39 | two-way | 558 | canal north bank; closes the Binns - Cross Guns loop |
| Phibsborough Road | primary | 14 | RN34 → RN35 → RN36 → RN37 → RN38 | two-way | 551 | 3-4 lanes |
| Cross Guns Bridge | bridge | 14 | RN38 → RN39 | two-way | 21 | over the 5th Lock |
| Church Street Upper | primary | 13 | CS2 → RN32 | two-way | 119 | dual one-way lines in reality |
| Constitution Hill | primary | 13 | RN32 → RN33 → RN34 | two-way | 148 | King's Inns to the west |
| Western Way | secondary | 9 | RN34 → RN40 → RN41 | two-way | 151 | King's Inns park wall |
| Dominick Street Upper | secondary | 9 | RN40 → RN14 | oneway 1 | 166 | cars eastbound only; Luas both ways |
| Dominick Street Lower | secondary | 10 | RN14 → PN2 | oneway 1 | 208 | cars toward Parnell St only; Luas both ways |
| Saint Mary's Place | secondary | 9 | RN15 → RN41 | oneway 1 | 80 | one-way westbound round the Black Church |
| Mountjoy Street | secondary | 9 | RN41 → RN42 | two-way | 116 |  |
| Blessington Street | secondary | 10 | RN42 → RN13 | oneway 1 | 140 | one-way eastbound; Blessington Basin at the west end |
| Berkeley Road | secondary | 10 | RN42 → RN43 → RN44 | two-way | 225 | Berkeley St + Berkeley Rd |
| Eccles Street | secondary | 14 | RN43 → RN16 | two-way | 286 | Mater front on the north side |
| North Circular Road | primary | 12 | RN50 → RN51 → RN52 → RN53 → RN54 → RN55 → RN56 → RN36 → RN44 → RN57 → RN17 → RN58 → RN59 → RN60 → RN21 | two-way | 1918 | 2 lanes + parking/cycle, 50 km/h |
| Russell Street | secondary | 9 | RN59 → RN61 | two-way | 92 | to Croke Park |
| Bloody Sunday Bridge | bridge | 10 | RN61 → RN62 | two-way | 18 | north end is Jones's Rd |
| Summerhill | primary | 15 | RN06 → RN20 → RN21 | two-way | 284 | R803 |
| Summerhill Parade | primary | 14 | RN21 → RN22 | two-way | 97 |  |
| Clarke's Bridge | bridge | 14 | RN22 → RN23 | two-way | 16 | humpback, 4 lanes |
| Ballybough Road | primary | 14 | RN23 → RN24 | two-way | 223 | R803, 4 lanes |
| Poplar Row | primary | 13 | RN24 → RN28 | two-way | 131 |  |
| Portland Row | secondary | 11 | RN21 → RN25 | two-way | 164 |  |
| Amiens Street | primary | 16 | AM2 → RN25 | two-way | 135 | extends the existing way |
| North Strand Road | primary | 15 | RN25 → RN26 → RN27 → RN28 | two-way | 417 | R105; humpback Newcomen Bridge at RN26 |
| Seville Place | secondary | 10 | GS2 → RN29 → RN25 | two-way | 298 | under the rail bridges |
| Sheriff Street Lower | secondary | 10 | RN30 → CM2 → RN31 → GS2 | two-way | 311 | Commons St stops being a dead end |
| Prussia Street | secondary | 10 | BH1 → RN63 → RN53 | two-way | 465 | Stoneybatter + Manor St + Prussia St |
| Aughrim Street | secondary | 9 | RN63 → RN52 | two-way | 258 | P2 |
| Infirmary Road | secondary | 10 | RN50 → RN64 → PG1 | two-way | 261 | to Parkgate St |
| Great Charles Street | lane | 7 | RN10 → RN60 | two-way | 150 | P2 |

#### JSON snippet (append to `nodes` / `ways`)

Apply the §1.1 re-seats (GA2, AM, AM2, CM2) and the two inserts (RN01 into Parnell Street between PN2 and OC4; RN30 into Amiens Street between AM and AM2). Also rename the existing Parnell Street leg OC4-PN4-GA2 to "Seán MacDermott Street" (or split it: OC4-PN4 "Cathal Brugha Street", PN4-GA2 "Seán MacDermott Street").

```json
{
  "nodes": {
    "RN01": [53.35190, -6.26309],
    "RN02": [53.35351, -6.26543],
    "RN03": [53.35453, -6.26353],
    "RN04": [53.35318, -6.26193],
    "RN05": [53.35337, -6.25968],
    "RN06": [53.35421, -6.25689],
    "RN07": [53.35549, -6.25782],
    "RN08": [53.35679, -6.25910],
    "RN09": [53.35753, -6.25710],
    "RN10": [53.35640, -6.25590],
    "RN11": [53.35581, -6.26098],
    "RN12": [53.35899, -6.26189],
    "RN13": [53.35602, -6.26525],
    "RN14": [53.35296, -6.26830],
    "RN15": [53.35421, -6.26692],
    "RN16": [53.35754, -6.26386],
    "RN17": [53.35974, -6.26120],
    "RN18": [53.36147, -6.25967],
    "RN19": [53.36175, -6.25949],
    "RN20": [53.35632, -6.25120],
    "RN21": [53.35701, -6.24977],
    "RN22": [53.35814, -6.24753],
    "RN23": [53.35835, -6.24718],
    "RN24": [53.36137, -6.24277],
    "RN25": [53.35470, -6.24669],
    "RN26": [53.35652, -6.24425],
    "RN27": [53.35863, -6.24117],
    "RN28": [53.36062, -6.23903],
    "RN29": [53.35237, -6.24354],
    "RN30": [53.35178, -6.24979],
    "RN31": [53.35071, -6.24234],
    "RN32": [53.35183, -6.27347],
    "RN33": [53.35349, -6.27297],
    "RN34": [53.35445, -6.27328],
    "RN35": [53.35868, -6.27324],
    "RN36": [53.36079, -6.27269],
    "RN37": [53.36253, -6.27269],
    "RN38": [53.36426, -6.27186],
    "RN39": [53.36464, -6.27177],
    "RN40": [53.35464, -6.27242],
    "RN41": [53.35475, -6.26880],
    "RN42": [53.35677, -6.26793],
    "RN43": [53.35924, -6.26980],
    "RN44": [53.36057, -6.26967],
    "RN50": [53.35220, -6.29810],
    "RN51": [53.35497, -6.29368],
    "RN52": [53.35578, -6.29241],
    "RN53": [53.35722, -6.28881],
    "RN54": [53.35868, -6.28243],
    "RN55": [53.35980, -6.27845],
    "RN56": [53.36078, -6.27512],
    "RN57": [53.36030, -6.26608],
    "RN58": [53.35920, -6.25870],
    "RN59": [53.35839, -6.25460],
    "RN60": [53.35787, -6.25211],
    "RN61": [53.35997, -6.25375],
    "RN62": [53.36028, -6.25358],
    "RN63": [53.35356, -6.28560],
    "RN64": [53.35011, -6.29614],
    "RN65": [53.36329, -6.26597],
    "RNL1": [53.35142, -6.26573],
    "RNL2": [53.35441, -6.27230],
    "RNL3": [53.35406, -6.27377],
    "RNL4": [53.35467, -6.27591],
    "RNL5": [53.35710, -6.27736],
    "RNL6": [53.35952, -6.27817],
    "RNL7": [53.36042, -6.27893],
    "RNL8": [53.36412, -6.28182],
    "RNL9": [53.36657, -6.28378]
  },
  "ways": [
    {"name":"Parnell Square West","type":"secondary","width":11,"nodes":["RN01","RN02"],"oneway":1},
    {"name":"Parnell Square North","type":"secondary","width":10,"nodes":["RN02","RN03"],"oneway":1},
    {"name":"Parnell Square East","type":"secondary","width":12,"nodes":["RN03","RN04"],"oneway":1},
    {"name":"Cavendish Row","type":"secondary","width":13,"nodes":["RN04","OC4"],"oneway":1},
    {"name":"Granby Row","type":"secondary","width":11,"nodes":["RN02","RN15"],"oneway":1},
    {"name":"Frederick Street North","type":"secondary","width":12,"nodes":["RN03","RN13"]},
    {"name":"Great Denmark Street","type":"secondary","width":11,"nodes":["RN03","RN11"]},
    {"name":"Gardiner Place","type":"secondary","width":11,"nodes":["RN11","RN08"]},
    {"name":"Parnell Street","type":"primary","width":14,"nodes":["OC4","RN05","RN06"]},
    {"name":"Marlborough Street","type":"lane","width":8,"nodes":["MB3","RN05"],"oneway":-1},
    {"name":"Gardiner Street Lower","type":"primary","width":15,"nodes":["GA2","RN06"]},
    {"name":"Gardiner Street Middle","type":"primary","width":14,"nodes":["RN06","RN07"]},
    {"name":"Mountjoy Square West","type":"secondary","width":10,"nodes":["RN07","RN08"]},
    {"name":"Mountjoy Square North","type":"secondary","width":10,"nodes":["RN08","RN09"]},
    {"name":"Mountjoy Square East","type":"secondary","width":10,"nodes":["RN09","RN10"]},
    {"name":"Mountjoy Square South","type":"secondary","width":10,"nodes":["RN10","RN07"]},
    {"name":"Gardiner Street Upper","type":"primary","width":14,"nodes":["RN08","RN12"]},
    {"name":"Fitzgibbon Street","type":"secondary","width":10,"nodes":["RN09","RN59"]},
    {"name":"Bolton Street","type":"primary","width":15,"nodes":["PN0","RN14"]},
    {"name":"Dorset Street Upper","type":"primary","width":15,"nodes":["RN14","RN15","RN13","RN16"]},
    {"name":"Dorset Street Lower","type":"primary","width":20,"nodes":["RN16","RN12","RN17","RN18"]},
    {"name":"Binns Bridge","type":"bridge","width":20,"nodes":["RN18","RN19"]},
    {"name":"Whitworth Road","type":"secondary","width":9,"nodes":["RN19","RN65","RN39"]},
    {"name":"Phibsborough Road","type":"primary","width":14,"nodes":["RN34","RN35","RN36","RN37","RN38"]},
    {"name":"Cross Guns Bridge","type":"bridge","width":14,"nodes":["RN38","RN39"]},
    {"name":"Church Street Upper","type":"primary","width":13,"nodes":["CS2","RN32"]},
    {"name":"Constitution Hill","type":"primary","width":13,"nodes":["RN32","RN33","RN34"]},
    {"name":"Western Way","type":"secondary","width":9,"nodes":["RN34","RN40","RN41"]},
    {"name":"Dominick Street Upper","type":"secondary","width":9,"nodes":["RN40","RN14"],"oneway":1},
    {"name":"Dominick Street Lower","type":"secondary","width":10,"nodes":["RN14","PN2"],"oneway":1},
    {"name":"Saint Mary's Place","type":"secondary","width":9,"nodes":["RN15","RN41"],"oneway":1},
    {"name":"Mountjoy Street","type":"secondary","width":9,"nodes":["RN41","RN42"]},
    {"name":"Blessington Street","type":"secondary","width":10,"nodes":["RN42","RN13"],"oneway":1},
    {"name":"Berkeley Road","type":"secondary","width":10,"nodes":["RN42","RN43","RN44"]},
    {"name":"Eccles Street","type":"secondary","width":14,"nodes":["RN43","RN16"]},
    {"name":"North Circular Road","type":"primary","width":12,"nodes":["RN50","RN51","RN52","RN53","RN54","RN55","RN56","RN36","RN44","RN57","RN17","RN58","RN59","RN60","RN21"]},
    {"name":"Russell Street","type":"secondary","width":9,"nodes":["RN59","RN61"]},
    {"name":"Bloody Sunday Bridge","type":"bridge","width":10,"nodes":["RN61","RN62"]},
    {"name":"Summerhill","type":"primary","width":15,"nodes":["RN06","RN20","RN21"]},
    {"name":"Summerhill Parade","type":"primary","width":14,"nodes":["RN21","RN22"]},
    {"name":"Clarke's Bridge","type":"bridge","width":14,"nodes":["RN22","RN23"]},
    {"name":"Ballybough Road","type":"primary","width":14,"nodes":["RN23","RN24"]},
    {"name":"Poplar Row","type":"primary","width":13,"nodes":["RN24","RN28"]},
    {"name":"Portland Row","type":"secondary","width":11,"nodes":["RN21","RN25"]},
    {"name":"Amiens Street","type":"primary","width":16,"nodes":["AM2","RN25"]},
    {"name":"North Strand Road","type":"primary","width":15,"nodes":["RN25","RN26","RN27","RN28"]},
    {"name":"Seville Place","type":"secondary","width":10,"nodes":["GS2","RN29","RN25"]},
    {"name":"Sheriff Street Lower","type":"secondary","width":10,"nodes":["RN30","CM2","RN31","GS2"]},
    {"name":"Prussia Street","type":"secondary","width":10,"nodes":["BH1","RN63","RN53"]},
    {"name":"Aughrim Street","type":"secondary","width":9,"nodes":["RN63","RN52"]},
    {"name":"Infirmary Road","type":"secondary","width":10,"nodes":["RN50","RN64","PG1"]},
    {"name":"Great Charles Street","type":"lane","width":7,"nodes":["RN10","RN60"]}
  ]
}
```

#### Luas Green extension (P2)

Prepend to `luasGreen.route`, which currently starts `"WM1", "CG1", …`. Orphan RNL nodes are fine: `geo.js line()` only needs node IDs, and `buildings.js` clears a 6 m corridor along the line.

```json
"route": ["RNL9","RNL8","RNL7","RNL6","RNL5","RNL4","RNL3","RNL2","RN14","RNL1","PN2","RN01","OC4","OC3","OC2","OC1","NQ8","SQ8","WM1","CG1", "…existing…"],
"stops": { "RNL8": "Cabra", "RNL7": "Phibsborough", "RNL5": "Grangegorman", "RNL3": "Broadstone – University",
           "RNL1": "Dominick", "OC3": "O'Connell Upper", "OC2": "O'Connell – GPO", "…existing…": "" }
```

Check that the tram does not clip the Parnell Sq West corner: RN01 is on the line. Also check the Bolton St crossing at RN14: the tram crosses the junction diagonally there.

#### Royal Canal data (for the `canals` block that `geo.js buildCanal` reads)

`pts` run from the upper end down to the Liffey (Douglas-Peucker simplified at 3 m from the chained OSM centreline, 3.58 km real). Road crossings, and so the bridge gaps, come from the street graph automatically.

```json
"canals": {
  "Royal Canal": {
    "width": 11, "verge": 5,
    "pts": [[53.36619,-6.27870],[53.36392,-6.27012],[53.36341,-6.26782],[53.36309,-6.26663],[53.36218,-6.26243],
            [53.36055,-6.25570],[53.35927,-6.24995],[53.35888,-6.24881],[53.35801,-6.24707],[53.35619,-6.24364],
            [53.35448,-6.24151],[53.35331,-6.24048],[53.35257,-6.24016],[53.35174,-6.24002],[53.35059,-6.24007],
            [53.34814,-6.24046]],
    "locks": [[53.36551,-6.27621],[53.36450,-6.27239],[53.36332,-6.26746],[53.36255,-6.26414],[53.36159,-6.26006],
              [53.35670,-6.24458],[53.34790,-6.24046]]
  }
}
```

- The last lock is the sea lock (est. position).
- **Spencer Dock is ≈27 m wide**, not 11. Either widen the canal per segment (a builder change), or add the dock as a traced `docks` outline. The dock is crossed by Mayor St Upper and Sheriff St Upper, and dock polygons do not yet know about crossings (open question 5). Simplified OSM outline (way 346963327, water from 53.3482 to 53.3538):
  `[[53.35380,-6.24056],[53.35372,-6.24101],[53.35283,-6.24047],[53.35250,-6.24033],[53.35187,-6.24017],[53.35072,-6.24021],[53.35050,-6.24016],[53.35041,-6.24034],[53.34826,-6.24067],[53.34823,-6.24025],[53.35039,-6.23987],[53.35083,-6.23991],[53.35143,-6.23990],[53.35234,-6.23996],[53.35295,-6.24013],[53.35303,-6.24010]]`
- **Under Croke Park** (53.35927-53.36009): the canal is roofed by the south stand. Either stop the water short (culvert mouth) or let the stadium model bridge it. Coordinate with the Croke Park agent.
- Full water polygons (pools and lock chambers) are OSM ways 238961314, 314594591/2/4/6/9, 314594601/3, 314596885/7, 231765178, relation 2452891, if a traced version is ever wanted.

### 1.6 Stitch points for other agents

| For | Point | lat, lon | Game x, z | Node |
|---|---|---|---|---|
| **croke-park** | NCR × Russell St (Jones's Rd continues north over Bloody Sunday Bridge) | 53.35839, -6.25460 | 151.2, -663.5 | RN59 |
| croke-park | Bloody Sunday Bridge north end = Jones's Rd south end | 53.36028, -6.25358 | 185.1, -768.7 | RN62 |
| croke-park | NCR × Summerhill Parade × Portland Row (Ballybough Rd starts at Clarke's Bridge N, RN23 53.35835, -6.24718) | 53.35701, -6.24977 | 311.7, -586.7 | RN21 |
| croke-park | Ballybough Rd × Clonliffe Rd × Poplar Row × Fairview Strand | 53.36137, -6.24277 | 544.3, -829.3 | RN24 |
| croke-park | NCR × Dorset St Lower | 53.35974, -6.26120 | -68.1, -738.6 | RN17 |
| croke-park | Binns Bridge north end: Drumcondra Rd Lower × Whitworth Rd (Clonliffe Rd leaves Drumcondra Rd at 53.36342, -6.25791) | 53.36175, -6.25949 | -11.3, -850.5 | RN19 |
| **phoenix-park** | **NCR Gate**: NCR × Infirmary Rd. The park's North Road starts at 53.35213, -6.29856, 30 m west | 53.35220, -6.29810 | -1419.8, -318.9 | RN50 |
| phoenix-park | Infirmary Rd reaches Parkgate St at PG1 (existing; real junction 53.34894, -6.29501) | | | PG1 |
| docklands / canal-south | Canal mouth at the Liffey (between NQ15 and NQ16); Sheriff St Upper lifting bridge; East Wall Rd north end RN28 (optional closure EW2 → RN28, 1.3 km) | 53.3479, -6.2405 | 621, -93 | – |

Note for croke-park: the stadium is **not** bounded by the NCR. Its southern edge is the canal and rail line, which the south stand straddles. Between the canal and the NCR lie the Russell St / Ballybough terraces (in my scope).

---

## 2. Reference images (`refs/canal-north/`)

All are from Wikimedia Commons, downloaded at 1280 px (or the original if smaller). None come from Google. Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-ambassador-gate-parnell-sq-east.jpg | [geograph 2261305](https://commons.wikimedia.org/wiki/File:The_Ambassador_Theatre,_the_Gate_Theatre_and_Parnell_Square_East_-_geograph.org.uk_-_2261305.jpg) | Eric Jones | CC BY-SA 2.0 | 2011-01-21 | **Driver's eye from the top of O'Connell St**: the Rotunda drum (Ambassador) with its swagged frieze, and the Gate with giant columns and "GATE" on the parapet. Parnell Sq East runs north to Findlater's spire. Double-deck buses |
| 02-rotunda-hospital-parnell-square.jpg | [geograph 2261257](https://commons.wikimedia.org/wiki/File:The_Rotunda_Hospital,_Parnell_Square_-_geograph.org.uk_-_2261257.jpg) | Eric Jones | CC BY-SA 2.0 | 2011-01-21 | **Key elevation**: Cassels' granite front on Parnell St. Pedimented centre on 4 engaged columns, rusticated arcaded ground floor, 3-stage tower with copper cupola, curved quadrant wing (left), railings |
| 03-parnell-square-east-facing-north.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Parnell_Square_East_(facing_North),_Dublin,_2014.jpg) | William Murphy | CC BY-SA 2.0 | 2014-10 | Parnell Sq East: red-brick 4-storey Georgian terrace with fanlight doors and railings; the garden railing and trees opposite; Findlater's spire |
| 04-children-of-lir.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dublin_-_Garden_of_Remembrance_-_20191126163217.jpg) | Oliver Gargan | CC BY-SA 4.0 | 2019-11-26 | **Children of Lir** bronze (four figures becoming swans) against the curved marble apse wall, wave-relief plinth, tricolour flagpole |
| 05-garden-of-remembrance-findlaters-church.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Garden_Of_Remembrance_-_Statue_Of_The_Children_of_Lir_by_Ois%C3%ADn_Kelly_(Rebirth_%5E_Resurrection)_-_panoramio.jpg) | William Murphy | CC BY-SA 3.0 | – | The sunken garden: granite retaining walls, steps, lawns, the pool, **Findlater's (Abbey Presbyterian) Church** spire, Parnell Sq North terrace (Hugh Lane side), bus |
| 06-dorset-street-st-georges-steeple.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Dorset_Street_with_steeple_of_St._George%27s_Church.jpg) | William Murphy | CC BY-SA 2.0 | – | Dorset St at dusk: bus lane, planted median with trees, Georgian brick terraces, **St George's spire** on the skyline |
| 07-lower-dorset-street.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Lwr_Dorset_St_Dublin.jpg) | Rwxrwxrwx | CC BY-SA 4.0 | 2016-04-09 | Lower Dorset St, driver level |
| 08-mountjoy-square-west.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Mountjoy_Square_West.jpg) | infomatique (William Murphy) | CC BY-SA 2.0 | 2018-09-29 | Mountjoy Sq West terrace: brick, doorcases, railings |
| 09-ncr-from-berkeley-road.jpg | [geograph 1898279](https://commons.wikimedia.org/wiki/File:North_Circular_Road_from_the_corner_of_Berkeley_Road_-_geograph.org.uk_-_1898279.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-05-28 | **The NCR character shot**: 2-lane road, red-brick 2-storey Victorian terraces with front gardens and bay windows, corner shops, trees |
| 10-ncr-phibsborough-road-doyles-corner.jpg | [geograph 1897299](https://commons.wikimedia.org/wiki/File:The_intersection_of_North_Circular_Road_and_Phibsborough_Road_-_geograph.org.uk_-_1897299.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-05-28 | **Doyle's Corner**: 3-storey red-brick corner block with Dutch-gable pediments and bay windows; **Dalymount Park floodlight pylon** behind |
| 11-mater-front-berkeley-street.jpg | [geograph 1897907](https://commons.wikimedia.org/wiki/File:The_front_of_the_Mater_Hospital_from_Berkeley_Street_-_geograph.org.uk_-_1897907.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-05-28 | **Mater Eccles St front**: long 3-storey granite range with pedimented windows, giant **Ionic portico under a pediment** inscribed MATER MISERICORDIAE HOSPITAL, cast-iron lamp standards, railings |
| 12-binns-bridge-royal-canal.jpg | [geograph 857703](https://commons.wikimedia.org/wiki/File:Binn%27s_Bridge_on_the_Royal_Canal,_Drumcondra,_Dublin._-_geograph.org.uk_-_857703.jpg) | JP | CC BY-SA 2.0 | 2008-06-22 | **Binns Bridge from the east**: elliptical arch with the 2nd Lock gates inside it, oval plaque, pipes on the face, the **double-arch rail bridge** abutting to the right |
| 13-lock-3-royal-canal.jpg | [geograph 5947013](https://commons.wikimedia.org/wiki/File:Lock_No._3_on_the_Royal_Canal_in_Dublin_-_geograph.org.uk_-_5947013.jpg) | Gareth James | CC BY-SA 2.0 | 2018-10-14 | **Lock kit reference**: black balance beams with **white-painted ends**, cascading gate leakage, limestone chamber walls, timber boardwalk with black posts and a steel handrail, grass banks |
| 14-cross-guns-bridge.jpg | [geograph 5947032](https://commons.wikimedia.org/wiki/File:Royal_Canal_at_Cross_Guns_Bridge_in_Dublin_-_geograph.org.uk_-_5947032.jpg) | Gareth James | CC BY-SA 2.0 | 2018-10-14 | Cross Guns Bridge from the east: **green-painted open steel parapet between granite piers** over the 5th Lock; the stone mill building (Cross Guns / Mill) behind; boardwalk |
| 15-newcomen-bridge.jpg | [Commons](https://commons.wikimedia.org/wiki/File:County_Dublin_-_Newcomen_Bridge_(Dublin)_-_20180902102851.jpg) | Javilara001 | CC BY-SA 4.0 | 2018-09-02 | **Newcomen Bridge**: ashlar face, segmental main arch with carved keystone, **two pointed side arches**, oval plaque, 1st Lock beam in front |
| 16-phibsborough-road.jpg | [Commons](https://commons.wikimedia.org/wiki/File:Phibsborough_Road,_Phibsborough.jpg) | William Murphy | CC BY-SA 2.0 | – | Phibsborough Rd: the **brutalist Phibsborough Tower** (9 storeys, concrete grid) over the shopping centre, a red-brick terrace, cast-iron railings |

Useful Commons candidates not downloaded:
- `Rotunda Hospital, Parnell Street, Dublin - geograph 247224` (640 px)
- `Dublin Ireland Gate Theater 2009-09-27.JPG`
- `Mountjoy Prison.jpg` / `Mountjoy Prison gate.jpg`
- `New Sea Locks at Spencer Dock - geograph 847789`
- `Hardwicke Street with St. George's Church at end` (NLI, c.1912, no restrictions)
- `Lock on the Royal Canal at Drumcondra - geograph 3761116`
- `The corner of Summerhill and North Circular Road - geograph 3762022`
- `Hanlon's Corner and North Circular Road.jpg` (NLI, 1945)
- `Upper Dorset Street A.JPG`
- `Doyle's Corner, Phibsborough, Dublin (32224811865).jpg`

---

## 3. Landmark profile

### 3.1 Parnell Square: the Rotunda block (hero pack A)

The block is bounded by Parnell St (S), Parnell Sq West, North and East, and Cavendish Row. It is the **terminating vista at the top of O'Connell St** (ref 01). OSM footprints: Rotunda Hospital way 79498864 (the whole south range), Ambassador 250720712, Gate 250718214, Garden of Remembrance 14047792, pool 228763406.

- **Rotunda Hospital** (VERIFIED, Wikipedia):
  - Richard **Cassels**; foundation stone laid 24 May 1751; the current building is dated 1757. Faced with **Leinster and Kilgobbin granite**. The first purpose-built maternity hospital in the British Isles.
  - It faces **south onto Parnell St**, set back behind railings and a car-park forecourt (ref 02).
  - From ref 02: a 3-storey main block (rusticated ground floor with round-headed windows; first and second floors with pedimented windows). The central 3 bays sit under a **pediment on 4 engaged columns**. A **3-stage square tower** carries a copper cupola and cross. **Curved quadrant wings** join end pavilions.
  - Eaves ≈15 m, tower top ≈33 m (est. from ref 02 by scaling the 7-bay front). The front is ≈60-70 m wide (est. from OSM).
  - The chapel (1762) inside has celebrated stucco (not visible).
- **The Rotunda (Ambassador Theatre)** (VERIFIED, Wikipedia):
  - James **Ensor**, completed **October 1767**. A frieze, blocking course and cornice were added in 1787, with **Coade-stone** swags and ox-skull panels.
  - A **round drum ≈24 m across** (est.; the OSM building with annexes is 52 x 46 m), rendered/stone, with blind panels, swagged frieze and a very low dome with a pale green rim (ref 01).
  - It stands on the **SE corner of the block, facing up O'Connell St**. It has been a cinema, a theatre and an exhibition venue.
- **The Gate Theatre / New Assembly Rooms** (VERIFIED, Wikipedia):
  - Richard **Johnston**, 1784-86, completed 1791; the Gate company since 1930.
  - It faces **east onto Cavendish Row** with a **pedimented portico of giant engaged columns**. "GATE" lettering stands on the parapet (ref 01). Granite and render.
- **Garden of Remembrance** (VERIFIED, Wikipedia):
  - Dáithí **Hanly**; opened **10 April 1966** (the 50th anniversary of 1916).
  - A **sunken cruciform pool** of granite and limestone, its floor mosaic showing **broken spears, shields and swords**.
  - **Children of Lir** by Oisín **Kelly**, cast in Florence, unveiled 1971. It stands at the head of the pool against a curved wall (refs 04, 05).
  - The garden occupies the **north part of the block** (OSM polygon ≈114 x 107 m bbox). The pool (OSM) is ≈48 m long on a NE-SW axis, with an ≈20 m cross arm. Granite retaining walls, flights of steps and lawns step down to the pool. Low railings and a hedge run along Parnell Sq North.
- **Around the square:**
  - **Hugh Lane Gallery** (Charlemont House, Sir William Chambers, 1760s; OSM 357707494) and the **Dublin Writers Museum** on Parnell Sq North.
  - **Findlater's / Abbey Presbyterian Church** (Gothic, 1864, tall limestone spire; OSM 231793851) at the **NE corner, facing down Parnell Sq East**. It is visible from O'Connell St (refs 01, 03, 05).
  - Everything else is 4-storey red-brick Georgian terraces.

### 3.2 St George's Church, Hardwicke Place (hero candidate B, cheap and high value)

- Francis **Johnston**, begun 1802, opened 1813; closed 1990, now offices (VERIFIED, Wikipedia).
- A **Portland-stone spire 200 ft (61 m)**. A Greek-inscribed portico (ΔΟΞΑ ΕΝ ΥΨΙΣΤΟΙΣ ΘΕΩ) with an Ionic tetrastyle (est. from photos).
- It closes the vista from **Eccles St** and from **Hardwicke St** and dominates the Dorset St skyline (ref 06). Footprint 53.3572-53.3575, -6.2625 to -6.2631 (OSM 42239607).
- At 61 m it is the tallest thing on the northern ring until the Croke Park stands. It works as the navigation beacon for the whole north side, like the Spire in the centre.

### 3.3 The Mater, Eccles St front (hero candidate C, textured facade rather than full hero)

- John **Bourke**, built 1857-61, opened **24 September 1861** (VERIFIED, Wikipedia / DIA / Archiseek).
- The Eccles St front (ref 11) is a long granite range: 3 storeys over basement, pedimented windows, and a **giant Ionic portico under a pediment** inscribed "MATER MISERICORDIAE HOSPITAL" (column count not verified; 4 in antis, est.). Railings sit on a granite plinth.
- The campus fills the block **Eccles St (S) / Berkeley Rd (W) / NCR (N)** (OSM 33005181, ≈350 x 280 m). Modern glass blocks stand behind: the Whitty Building on the NCR side.
- Nos. 30-37 Eccles St (Georgian c.1795, NIAH 50060279) are part of the hospital. The street is James Joyce's "7 Eccles Street".

### 3.4 Other character anchors (verified positions, OSM)

- **Mountjoy Square:**
  - The only "true" Georgian square: **140 m a side**, 2 ha, built 1792-1818 by Luke Gardiner (VERIFIED, Wikipedia).
  - 18-19 red-brick houses per side, 4 storeys over basement.
  - The park is railed, with mature trees and a playground (OSM 681881138). The square is rotated ~40° from north.
  - At half scale it becomes 70 game m a side, which is still a good urban room.
- **Mountjoy Prison:**
  - A large walled compound **north of the NCR** between Berkeley Rd and Dorset St Lower, backing onto the canal (OSM 129068605, ≈380 x 310 m).
  - The Female Prison / Dóchas front building is at 53.3609, -6.2683.
  - From the road it reads as **high grey limestone walls** (≈6 m est.), a gatehouse and an avenue.
- **Phibsborough:**
  - **Doyle's Corner** (ref 10) is the red-brick Dutch-gabled corner block.
  - **Phibsborough Tower** is a brutalist concrete office tower, **9 storeys**, 37 x 18 m (OSM 82092765), over the low 1960s/70s shopping centre.
  - **St Peter's Church** (Gothic, tall spire, 53.3606, -6.2765) stands at the NCR/Cabra Rd junction.
  - **Dalymount Park** (Bohemians FC) has lattice floodlight pylons (ref 10).
- **Hanlon's Corner:** the NCR / Prussia St / Old Cabra Rd junction, with "Graingers Hanlons Corner" pub (OSM 307150002).
- **The NCR west of Phibsborough:** TU Dublin Grangegorman (Park House, 8 storeys), **McKee Barracks** (red-brick Victorian military, on Blackhorse Ave, set back), and St Bricin's Military Hospital near the gate.
- **King's Inns** (Gandon) lies west of Constitution Hill in its own park (OSM 131248846). Western Way runs along its wall.
- **The Black Church** (St Mary's Chapel of Ease, 1830, dark calp limestone; OSM 51954983) sits on an island in St Mary's Place, with one-way traffic round it.
- **Dorset St pubs and shops**, Summerhill flats, North Strand terraces. The **Five Lamps** (a cast-iron five-lantern lamp standard) stands at Amiens St / North Strand / Portland Row / Seville Place (RN25). It is a small, distinctive P2 prop.
- **Connolly Station** frontage on Amiens St (Italianate tower) is just in scope. The Loop Line bridge crosses Amiens St/Talbot St; it is probably already handled.

### 3.5 Canal kit (shared with canal-south)

- **Humpback bridges**, all late-18th-century masonry with a single arch springing from the canal walls:
  - **Binns Bridge**, c.1795 (NIAH 50060189): an **elliptical arch** with moulded granite voussoirs and a **vermiculated granite keystone**; a **rubble limestone parapet** with a dressed string course and granite coping; a **carved oval limestone plaque** on each face. The 2nd Lock sits under the arch. A c.1864 **double-arch rail bridge** abuts the north side (VERIFIED, NIAH; ref 12).
  - **Newcomen Bridge**: ashlar, a segmental arch over the 1st Lock, flanked by **two pointed (Gothic) side arches**, with an oval plaque (ref 15).
  - **Clarke's Bridge** (Summerhill Parade) and **Bloody Sunday Bridge** (the former Russell St bridge; OSM `bridge:name`) are similar single-arch stone bridges.
  - **Cross Guns Bridge** (the first works of the canal, May 1790, originally Westmoreland Bridge; VERIFIED, Wikipedia) now shows a **green steel open parapet between granite piers** on its canal face (ref 14).
- **Hump (est.):** crown ≈1.0-1.5 m above the approach, over ≈20-25 m (real). At half-scale plan with real heights, that becomes a noticeable launch over ~10-12 game m. It is a fun driving feature; keep the crown ≤ 1.2 m so cars don't bottom out.
- **Locks:**
  - Dressed limestone chamber walls with coping and gate recesses.
  - Timber-and-steel mitre gates with **black timber balance beams with white-painted ends** (refs 13, 15; NIAH 50060188). They are not striped.
  - Water cascades over the upper gates (ref 13).
  - Stop-gate recesses and a small timber footbridge on the gates at the 6th Lock.
- **Banks:** grass verges, a Greenway asphalt path on the south side, timber boardwalks with black posts at locks, steel tube handrails, mature trees (ash, willow, birch, plane). The rail line runs on the north bank from Newcomen to Binns.

### 3.6 Colours (hex estimates from refs)

| Surface | Hex | Note |
|---|---|---|
| Rotunda / Mater granite | `#b3ab9c` lit, `#8e887d` shade | warm grey (refs 02, 11) |
| Ambassador drum | `#b8ad96` | buff, swags a shade lighter; dome rim `#7fa596` |
| Rotunda cupola copper | `#6fa596` | verdigris (ref 02) |
| Georgian brick | `#9a4b33` (sun `#b0583c`) | Parnell Sq, Mountjoy Sq, Dorset St (refs 03, 08) |
| Victorian red brick (NCR) | `#8f3f2e` | darker, with cream brick/stone bands (ref 09) |
| Doyle's Corner brick | `#b45a3c` | orange-red terracotta dressings (ref 10) |
| Georgian doors | `#1f3b5c` / `#6b1d1d` / `#1e3d2a` | with fanlights, painted doorcases `#e8e2d4` |
| Railings | `#15171a` | black cast iron |
| Canal stone (limestone) | `#7d7a72` | wet base `#4d4c47` |
| Canal water | `#3a3a2c` | dark peaty, reflective |
| Balance beams | `#1c1a18` + ends `#e8e6e0` | matches `canals.js` materials |
| Cross Guns parapet | `#7fa38c` | green steel |
| Children of Lir bronze | `#3b403d` | against pale marble apse `#d8d6cf` |
| St George's spire | `#d6d1c4` | Portland stone |
| Phibsborough Tower | `#8d8f8c` | concrete grid, dark glazing `#2c3338` |
| Prison wall | `#8c8a84` | limestone, rubble |

### 3.7 Five recognisable cues

1. **The top of O'Connell St**: the Rotunda drum with its swagged frieze beside the columned Gate, closing the vista (ref 01).
2. **The Rotunda hospital's cupola tower** above Parnell St, and **Findlater's spire** on the NE corner of the square (refs 02, 05).
3. **St George's 61 m spire** seen down Eccles St / Hardwicke St and over Dorset St (ref 06).
4. **Canal locks with black-and-white balance beams under humpback stone bridges** (Binns, Newcomen; refs 12, 13, 15).
5. **The NCR**: 2-lane road between long red-brick Victorian terraces with front gardens, ending at **Doyle's Corner**'s Dutch gables and the Phibsborough tower (refs 09, 10, 16).

---

## 4. Build brief (prioritised)

### P0: road graph and canal (data; next phase)

1. **Re-seat GA2, AM, AM2, CM2** (§1.1).
   - Rename the OC4-PN4-GA2 leg to Cathal Brugha St / Seán MacDermott St.
   - Insert RN01 into Parnell Street and RN30 into Amiens Street.
2. Add the **core spokes and the ring** (≈5.5 km game):
   - Parnell Square ring (RN01-RN04, OC4)
   - Parnell St east + Summerhill (RN05, RN06, RN20, RN21) and the Marlborough St link
   - Gardiner St + Mountjoy Square ring (RN06-RN10) + Gardiner St Upper
   - Frederick St, Granby Row, Dorset St Upper/Lower, Binns Bridge, Whitworth Rd
   - Bolton St, Church St Upper, Constitution Hill, Phibsborough Rd, Cross Guns Bridge
   - **the full NCR** RN50 → RN21
   - Summerhill Parade, Clarke's Bridge, Ballybough Rd, Poplar Row, North Strand Rd, Portland Row, Amiens St extension, Seville Place, Sheriff St Lower
   - Prussia St and Infirmary Rd.
3. Add the **Royal Canal** `canals` entry (§1.5). The existing `buildCanal` then generates pools, banks, lock steps and bridge gaps.
   - The bridges will be flat until item 5.
   - Decide Spencer Dock's width (open question 5) and the Croke Park culvert.
4. **Extend `meta.bounds`**: north to ≈53.3670 (Cross Guns plus margin) and west to ≈-6.2990 (NCR gate). That is the phoenix-park agent's call for the west.

### P1: kits and heroes

5. **Humpback canal bridge kit (shared with canal-south)**, ~600-900 tris each:
   - A deck profile with a crown ≤ 1.2 m.
   - An arch mouth (elliptical or segmental) over the water or lock, with voussoir and keystone decals and an oval plaque decal.
   - Rubble parapets with granite coping. Variant flags: `sideArches` (Newcomen: two pointed arches), `steelParapet` (Cross Guns, green), `railArch` (Binns: the twin-arch rail bridge beside it).
   - Road-height collision must follow the hump.
6. **Lock kit**: a limestone chamber (sunk box, coping), 2 gate pairs (mitre gates as thin boxes), **black beams with white tips** (already in `canals.js`), a cascade quad over the upper gate (animated alpha), and boardwalk plus handrail. About 300 tris per lock, instanced.
7. **Hero pack A: "Top of O'Connell St / Parnell Square"**, one GLB of ~12-14k tris (ceiling 18k):

| Part | Tris | Notes |
|---|---|---|
| Rotunda drum (Ambassador) | ~1,800 | 24-32-sided drum, frieze band (swag decal), cornice, blocking course, low dome with a copper rim, entrance annexe on Parnell St |
| Gate Theatre | ~1,500 | Block with giant-order portico (4 columns, 8-sided), pediment, "GATE" letters on the parapet, sash decals |
| Rotunda Hospital south front | ~5,000 | 3 storeys: rusticated arcaded ground floor, pedimented centre on 4 engaged columns, **3-stage tower with a copper cupola** (≈33 m, est.), curved quadrant wings and end pavilions, chimneys. Rear ranges as plain blocks |
| Garden of Remembrance | ~2,500 | Sunken plate (−2 m) with granite walls and steps, cruciform pool with a mosaic decal, curved marble apse wall, **Children of Lir** as a low-poly bronze silhouette (~800 tris or alpha cards), flagpole |
| Findlater's Church | ~1,500 | Gothic nave box, tower and spire (≈55 m, est.), window decals |

   - Atlas: rusticated granite bay, pedimented sash, swag frieze, "GATE" letters, mosaic, marble joints, Gothic lancet. Palette per §3.6.
   - The Hugh Lane and the Writers Museum are **generic Georgian filler** with a textured doorcase at most.
8. **Hero B: St George's Church**, ~2,000 tris: temple block with an Ionic tetrastyle portico and pediment, then a **4-stage tower and spire to 61 m** (square stage, octagonal stages, needle spire). Its footprint centre is ≈53.35737, -6.26280, ≈75 m ESE of RN16 inside the Hardwicke Place crescent. It stands on the axis of both **Eccles St** (seen from the WNW) and **Hardwicke St** (seen from Frederick St, from the SW; NLI c.1912 photo). The portico and spire front Hardwicke Place. Which way the portico faces exactly is open question 9. This is the landmark for the whole north side; floodlight it at night.

### P2: textured facades, filler and props

9. **The Mater Eccles St front**: a textured long block (granite, pedimented windows, Ionic portico decal on a shallow projection), ≈1,200 tris. Glass modern blocks behind as plain boxes.
10. **Filler types for the area** (extend `buildings.js` street-name styles):
    - **Georgian 4-storey brick with fanlit doorcases and area railings**: Parnell Sq, Mountjoy Sq, Gardiner St, Eccles St, Dorset St Upper, N Great George's St. Reuse `S.GEORGIAN`; add the street names to its regex.
    - **Victorian 2-storey red-brick terrace with a bay window and a 3-5 m front garden behind railings/hedge**: the NCR, Russell St, Ballybough, Summerhill Parade, North Strand side streets, Phibsborough. This is a **new type**; it is the defining look of the ring road. Set back from the kerb, with a small garden plot.
    - **Victorian commercial corner blocks** (3 storeys, Dutch gables, shopfronts) at Doyle's Corner, Hanlon's Corner, Dorset St/NCR and Summerhill/NCR.
    - **Local-authority flats** (4-5 storey brick deck-access blocks) on Summerhill, Dominick St and Sheriff St.
    - **Institutional walls**: Mountjoy Prison (grey limestone, ≈6 m, est.), King's Inns park wall, McKee Barracks, Grangegorman.
    - **Brutalist**: the Phibsborough Tower (9 storeys, 37 x 18 m real) plus a 1-2 storey shopping-centre podium.
11. **Props:** the Five Lamps standard (RN25); Dalymount floodlight pylons (4, lattice, ≈35 m, est.); Blessington Street Basin as a small railed pond park; Mountjoy Sq park trees; plane trees on the Dorset St Lower median (ref 06); canal-side trees; Dublin Bus stops on the NCR, Dorset St and Phibsborough Rd; Luas OCS poles on Dominick St/Parnell St/O'Connell St.
12. **Luas Green extension** (§1.5) and the Red Line Connolly spur (open question 8).
13. Optional **East Wall Rd** (EW2 → RN28) and **Aughrim St / Great Charles St** loops.

**Triangle budget for the area:** pack A ~13k, St George's ~2k, Mater front ~1.2k, 6 bridges × ~0.8k ≈ 5k, 8 locks × 0.3k ≈ 2.4k, props ~2k. **Total ≈ 26k**, plus filler (instanced/merged as today).

**Performance note:** the area roughly doubles the road network. The NCR terraces and canal trees should go through the existing chunking (`chunks.js`) and instancing, and the GPU split from BUILD-REPORT suggests lamps and trees are the cost to watch. Don't give every NCR lane-lamp its own light pool.

---

## 5. Open questions

1. **Outer-ring compression.** At the current projection the northern ring adds ≈ 700 game m of depth (z -391 to -1100) and ≈ 2.1 km of width (x -1420 to +670), and the NCR alone is ≈1.9 km of game road. Should the band north of Parnell St (lat > 53.3535) get extra N-S compression (say 0.7x)? That would keep Mountjoy Sq and Parnell Sq readable but tighten the NCR/canal gap (100-250 m real). All coordinates above are lat/lon, so a latitude warp in `project()` (like the existing `warpN`) can be added without changing the data.
2. **The existing Parnell Street is off by up to 170 m at its west end** (PN0/JV2/PN2). Re-seat it now (it moves existing buildings, the Luas Red Line's Jervis/Capel context, and Capel St's north end), or leave it and accept kinks at Dominick St and Bolton St?
3. **Dorset St Lower as a dual carriageway.** Model it as one 20 m two-way road (the snippet), a `boulevard` with a median (real median with trees, ref 06), or two one-way ways?
4. **Humpback bridges vs the canal builder.** `buildCanal` currently makes flat bridges. Is a hump (≤1.2 m crown) acceptable for physics and AI traffic, and should the lock under Binns Bridge (the 2nd Lock is literally under the arch) be allowed to coincide with a bridge gap?
5. **Spencer Dock width.** The canal is 11 m, the dock ≈27 m. Should the builder get per-segment widths, or should the dock be a `docks` outline, which needs dock crossings at Mayor St Upper and Sheriff St Upper (the lifting bridge)? Does another agent (docklands) own Spencer Dock?
6. **Croke Park and the canal.** The south stand spans the canal and the rail line (OSM `layer=-1` over 53.3593-53.3601). The croke-park agent needs to know that the stadium's footprint crosses the water. Who builds the culvert mouths?
7. **Scope with croke-park.** I included Russell St, Bloody Sunday Bridge, Summerhill Parade, Clarke's Bridge and Ballybough Rd up to Clonliffe Rd/Poplar Row (RN21-RN24, RN59-RN62). If croke-park also proposes them, keep one set. Jones's Rd (RN62 north) and Clonliffe Rd are theirs. Without them, RN62 is a dead end: then stop Russell St at the canal or drop RN61/RN62.
8. **Luas.** `luasLines` supports only `luas` and `luasGreen`, one route each. The Red Line's Connolly spur (Busáras → Connolly) and The Point/Spencer Dock branch need either a third line or a branch model. The Green Line single-track simplification ignores the separate southbound route via Parnell St east and Marlborough St.
9. **Mater portico column count, St George's portico orientation, Rotunda tower height** are not verified. Photos suggest a 4-column portico for the Mater and a tower of ≈33 m for the Rotunda. NIAH records 50010xxx (Rotunda) and the DIA entry for St George's would settle them; Archiseek rate-limited during this pass.
10. **Lock heights.** OSM `lock:height` gives 5.3-6.6 m, which seems to be chamber depth. The game's 0.3 m per-lock step is stylised anyway; should the Royal Canal step down 7 times (sea lock included) from −0.75 to the −1.9 floor (`CANAL_MIN`)? It will hit the floor after 4 locks.
11. **Gardiner St Lower one-way status.** This OSM snapshot shows it mostly two-way. It was historically a northbound one-way street, and signage may lag. Treat as two-way unless the owner knows otherwise.

## Sources

- OSM via Overpass (ODbL): `data/osm/canal-north.json`
- [Royal Canal, Wikipedia](https://en.wikipedia.org/wiki/Royal_Canal): 4.04 m beam limit, Spencer Dock sea lock, works begun May 1790 at Cross Guns
- [NIAH 50060189, Binns Bridge](https://www.buildingsofireland.ie/buildings-search/building/50060189/binns-bridge-drumcondra-road-lower-dorset-street-lower-dublin-7-dublin-city)
- [NIAH 50060188, 2nd Lock](https://www.buildingsofireland.ie/buildings-search/building/50060188/2nd-lock-royal-canal-dorset-street-lower-drumcondra-road-lower-dublin-7-dublin-city)
- [NIAH 50060279, Mater Hospital 30-37 Eccles St](https://www.buildingsofireland.ie/buildings-search/building/50060279/mater-hospital-30-37-eccles-street-dublin-7-dublin)
- [Rotunda Hospital, Wikipedia](https://en.wikipedia.org/wiki/Rotunda_Hospital)
- [Gate Theatre, Wikipedia](https://en.wikipedia.org/wiki/Gate_Theatre)
- [Garden of Remembrance (Dublin), Wikipedia](https://en.wikipedia.org/wiki/Garden_of_Remembrance_(Dublin))
- [Mountjoy Square, Wikipedia](https://en.wikipedia.org/wiki/Mountjoy_Square)
- [St. George's Church, Dublin, Wikipedia](https://en.wikipedia.org/wiki/St._George%27s_Church,_Dublin)
- [Mater Misericordiae University Hospital, Wikipedia](https://en.wikipedia.org/wiki/Mater_Misericordiae_University_Hospital); [Archiseek, 1861 Mater Misericordiae Hospital](https://www.archiseek.com/1861-mater-misericordiae-hospital-dublin/); [DIA, John Bourke](https://dia.ie/architects/view/553/BOURKE,+JOHN+%5B2%5D)
- [Irish waterways history: Newcomen Bridge](https://irishwaterwayshistory.com/tag/newcomen-bridge/), [The Broadstone Line](https://irishwaterwayshistory.com/abandoned-or-little-used-irish-waterways/waterways-in-dublin/the-broadstone-line-of-the-royal-canal/)
- Wikimedia Commons images as listed in §2
- Code read (not modified): `src/world/geo.js` (projection, `buildCanal`), `src/world/canals.js`, `src/data/streets.json`, `docs/research/heuston.md`, `docs/research/BUILD-REPORT.md`

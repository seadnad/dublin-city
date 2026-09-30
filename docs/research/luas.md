# The Luas: both lines, end to end

The owner's report: "A random Luas line starts from nowhere near O'Connell Bridge." The Parliament House rebuild had cut the Green Line so it started at SQ8, the south end of O'Connell Bridge. The Red Line also stopped dead at James's Street, and the Green Line stopped at the canal. This pass rebuilds both lines. They follow the real network wherever the game's streets allow, and they run to the edge of the map or to a real terminus.

- Raw OSM: `data/osm/luas.json` (ODbL). Overpass `out body geom`, bbox S 53.325, W -6.34, N 53.37, E -6.215. It holds `railway=tram` ways, `railway=tram_stop` nodes, tram stop positions and tram platforms: 203 ways and 68 nodes, snapshot `timestamp_osm_base` 2026-09-29T21:07:21Z. A second pull of named highways was used only to measure where the tracks sit across each street (§1.3). It was not kept.
- Every web request used the generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`. No personal data was sent.
- Figures: `luas-compare.png` puts the real network (OSM, drawn with the game's own `project()`) beside the game, for the whole map and for the city-centre loop. `luas-before-after.png` shows main before this change beside the rebuilt lines.
- Tools (all `node tools/check.mjs tools/scenarios/<x>.mjs`):

| Scenario | What it does |
|---|---|
| `luasrun.mjs` | Steps the fleet on its own (SIM seconds, default 2 h) and reports, per tram, the runs it finished, the stops it served, its longest hold and any overlaps. Also times `fleet.update()` |
| `luascheck.mjs` | Samples every rendered track across its bed, every metre. Fails on track over water off a bridge, on track through a landmark footprint, or on track over O'Connell Street's islands |
| `luasview.mjs` | The screenshot set below |
| `luasplot.mjs` | Plan views of the game's streets and tracks against the OSM tram ways |
| `luascompare.mjs` | Draws `luas-compare.png` |
| `luasperf.mjs` | Draw calls, triangles and fps at nine spots on the lines |

---

## 1. The real network and the game

### 1.1 Green Line (Cross City since December 2017)

| Real (OSM) | Game now | Game before |
|---|---|---|
| Ranelagh and south (off the map) | The track runs on past Charlemont along the old Harcourt Street railway alignment (OSM geometry) and off the south edge. Trams reverse out of sight | Ended at GXSLU7, 50 m short of the edge |
| Charlemont, Harcourt, Harcourt St, St Stephen's Green West, Dawson St | Same streets, double track. Stops: **Charlemont** (south of the canal, which the line crosses on its own bridge), **Harcourt**, **St. Stephen's Green** (at its real position, the north-west corner), **Dawson**. On Harcourt Street the tracks keep to the east side | Same streets, centred |
| Nassau St / Grafton St corner, College Green (both directions) | Same, double track, keeping to the Trinity side as the real one does | Same |
| **Northbound only**: Westmoreland St, O'Connell Bridge, O'Connell St (west carriageway), left into Parnell St | Single track `nb`. Westmoreland St: the west lane, with **Westmoreland** stop. O'Connell Bridge: moving over to the carriageway. O'Connell St: the lane beside the median, 7 m west of the centreline, well clear of the O'Connell Monument, the Spire and the island trees. Stops **O'Connell - GPO** (platform in front of the GPO) and **O'Connell Upper** | Ended at SQ8 (the owner's bug). Nothing north of the river |
| **Southbound only**: Parnell St east, Marlborough St, Rosie Hackett Bridge, Hawkins St, College St | Single track `sb`. Stops **Parnell** (Parnell St between O'Connell St and Marlborough St), **Marlborough**, **Trinity** (College St). Crosses the Red Line at Abbey St | none |
| Parnell St west, Dominick St Lower and Upper, Broadstone | Double track `north`. Stops **Dominick** and **Broadstone - University** (west of Constitution Hill) | none |
| Grangegorman, Phibsborough, Cabra, Broombridge (off the map) | The OSM alignment through the Grangegorman campus and the old Midland railway cutting, across the NCR and off the north edge. Stops **Grangegorman**, **Phibsborough**, **Cabra** | none |

### 1.2 Red Line

| Real (OSM) | Game now | Game before |
|---|---|---|
| **The Point** terminus | Same (the tuned 3Arena kit) | Same |
| Mayor St Upper, Spencer Dock, Mayor Square - NCI, George's Dock | Same streets. Stops **Spencer Dock**, **Mayor Square - NCI**, **George's Dock** (new) | No George's Dock stop |
| Harbourmaster Place, then left into Store St past Busáras | A Luas-only diagonal from Mayor St Lower, across Amiens St, into Store St. Stop **Busáras** on Store St (north of the bus station, as in reality) | Ran round Beresford Place and Mayor St Lower. "Busáras" stop in Beresford Place |
| **Connolly spur**: Store St, Amiens St, Connolly | A double-track spur up Amiens St, with the **Connolly** terminus in the street outside the station (§3). A second service runs Connolly to the south-west edge | none |
| Abbey St Lower, Middle, Upper; Jervis; Mary's Abbey; Chancery St; Smithfield; Benburb St; Heuston | Same streets. Stops **Abbey Street** (moved to its real spot between O'Connell St and Marlborough St), **Jervis** (real spot), **Four Courts**, **Smithfield**, **Museum** (real spot), **Heuston** (tuned kit). The tracks keep to the south side of Abbey St Lower and the north side of Middle Abbey St, as the OSM ways do | Same streets; stops at the junction nodes |
| Steevens Lane, James's St, St James's Hospital, Fatima, Rialto, the old Grand Canal bed to Suir Road, Goldenbridge, Drimnagh, Blackhorse, Bluebell, Red Cow (off the map) | OSM alignment (simplified to 0.6 m) from James's St off the south-west edge. It runs on a grassed reservation (§2.4) through the filler. Stops **James's**, **Fatima**, **Rialto**, **Suir Road**, **Goldenbridge**, **Drimnagh**, **Blackhorse**, **Bluebell** | Ended at James's St |

All 35 stops in the map have platforms and the full stop kit. Each kit has its name totems and wall sign in English and Irish (OSM `name:ga`; Smithfield's "Margadh na Feirme" is from the stop signage) and a band in its line's colour.

### 1.3 Where the tracks sit across the street (measured)

The lateral offset was measured for every OSM tram way against the nearest named OSM street centreline (real metres, sign = to the right of the tram's travel):

- O'Connell St Lower / Upper, northbound: +3.7 to +6.4 from the west carriageway's own centreline, i.e. the lane nearest the median.
- Westmoreland St, northbound: 6.9 m east.
- Abbey St Lower (both tracks): 5-8 m south. Middle Abbey St: 3.5-6.7 m north.
- Harcourt St: 4-7 m east.
- Hawkins St: 2-3 m west.
- College Green and Dawson St: 1-3.5 m, which is noise at game scale.

The game follows these where they are safe (O'Connell St, Abbey St, Harcourt St). **Westmoreland St** is the exception. Real Westmoreland St carries northbound traffic, but the game's is two-way, so an east-side track would meet oncoming AI cars head on. The northbound track keeps to the west (with-flow) half instead. The same keep-with-traffic rule puts the single tracks on Marlborough St, Parnell St east, Hawkins St, Rosie Hackett Bridge and College St in the left-hand lane.

---

## 2. What changed

### 2.1 Data: `src/data/streets.json` `luas` / `luasGreen`

A line is now **legs** plus **services**:

- **Leg.** A centreline through node ids or `[lat, lon]` points (the off-street OSM stretches are inline, not new nodes). A leg is double track unless `"single": true`.
  - `shift` moves the centreline sideways, in metres to the left of the leg's direction. It is keyed by node id or `"id+metres"` / `"id-metres"` and interpolated between keys (for example `'NQ8+4': 7, 'OC4-6': 7` holds the northbound track in the O'Connell St lane from 4 m north of the bridge to 6 m short of Parnell St).
  - `stops` are `{ name, ga, at }`, where `at` is a node, a `[lat, lon]` (projected onto the leg) or `[node, metres along]`.
- **Service.** A number of trams and the **runs** they drive in turn, reversing at the end of each. A run is a list of legs; `-leg` means against the leg's direction. The services are:
  - Red Line, The Point service: 4 trams, `point,west` then `-west,-point`.
  - Red Line, Connolly service: 3 trams, `connolly,west` then `-west,-connolly`.
  - Green Line: 5 trams, `-south,nb,north` then `-north,sb,south`. This is the loop round O'Connell St and Marlborough St, with double track at both ends.

New ways, for the merge to reconcile (§4): **Rosie Hackett Bridge** (NQ9 to SQ9: a bridge, 13 m, `access: destination`, so buses and taxis only in spirit), **Hawkins Street** (SQ9 to CS1, 10 m) and **Charlemont Luas Bridge** (GXSLU5 to GXSLU6: a paved tram-only lane, `pedestrian`, unlit). The last one exists so the Grand Canal stops short of the tracks. The old line ran its Charlemont stop straight over the canal water. No node was added, moved or renamed. `dupcheck` is clean and the file was written with `streets-fmt`.

### 2.2 Geometry: `src/world/geo.js` `buildLuasLine`

Each run becomes one polyline:

1. Concatenate the legs' vertices.
2. Fillet every corner (radius 14 m, less where the segments are short).
3. Resample at 1 m.
4. Offset each point to the left by the interpolated shift, plus 1.8 m on double track (trams keep left, so the two directions of a double leg land 3.6 m apart automatically).

The **rendered tracks** are the runs' polylines with the stretches another run already laid dropped (the Point and Connolly services share everything west of Store St). They are clipped to the map and simplified (Douglas-Peucker, 3 cm) for drawing. Points on off-street stretches are flagged `open`.

The world also gains `luasNear(x, z, r)`, a segment hash that the tall-building placer now uses to keep towers off the tracks (§2.5).

### 2.3 Trams: `src/game/luas.js`

- **Movement.** Each tram is three 11 m carriages. It drives a run end to end and stops with the tram centred on each platform (7 s dwell). At the end of a run it waits until the next run's first berth is clear, then reverses onto it (10 s). Carriages past the map edge are hidden and take no part in collisions, so a line that runs off the map turns back out of sight.
- **Spacing.** Each service's trams start evenly spaced round their cycle. Measured cycles: Red Line Point service 1304 s (5.4 min headway), Connolly 1098 s (6.1 min, so about 3 min combined west of Store St), Green 939 s (3.1 min).
- **Right of way.** Each tram claims its path from its rear to its stopping distance ahead. Where two claims come within 2.6 m, the tram nearer to the conflict (body already there, or front closer) goes and the other stops short. One distance per tram per pair means two trams can never wait on each other. The same rule covers following, crossing (Red and Green at Abbey St / O'Connell St and at Abbey St / Marlborough St) and merging (the Connolly spur at Store St; the Green Line's two single tracks at College Green and Parnell St).
- **One fleet.** It exposes `carriages`, `speed`, `currentStop`, `name`, `update` and `collide`, as before, so the HUD stop label ("Luas - Trinity"), the gong, the traffic and the player's collisions work unchanged. The minimap and world map read the visible carriages.
- **Stops.** `buildLuasStops()` builds every kit with the static city (so the stops are in the height field and far view) and merges them per material per 800 m block.

### 2.4 Rendering

- `roads.js` draws a 3.7 m concrete bed and two rails (standard gauge) per track, instead of one 7.2 m bed per line centreline.
- Off the street grid, a grass verge runs along the outer side of each track: the Red Line past Rialto, the Green Line to Broombridge and Ranelagh. It stops short of road crossings.
- `ground.js` paints the same bed, rails and verges into the layout (minimap, far view).
- `buildings.js` keeps 6.5 m clear of every track.
- The Rosie Hackett Bridge is drawn as a modern flat deck.
- `worldmap.js` draws each line in its own colour (Red #d6212b, Green #00a651), and the legend lists both lines.

### 2.5 Other code touched

- `luasStop.js`:
  - `only: [side]` gives single-track stops one platform, with its poles and span wire on that side and one contact wire.
  - The sign atlas is now 1024 x 1280 in 256 x 128 cells, enough for 39 stop names; it was 4 before, so every kit after the fourth reused one name.
  - Names are fitted to width, Irish above English, with the line colour band.
- `vehicles.js`: `tramCarParts()` returns a carriage's parts per material for instancing.
- `sites.js`: `clearSpot` also avoids the Luas (4.5 m). The Exo building used to be slid clear of roads only and stood across the end of the track at The Point. It is now slid clear of the terminus too.
- `main.js`: builds the stops with the static city, creates the fleet, and hands it the camera.

---

## 3. Remaining compromises

1. **Streets that are not where the real ones are.** The tracks follow the game's streets, not OSM, wherever the two disagree.
   - The game's Abbey St runs 10-20 game m north of the real one. Its Store St and Amiens St junction sits about 75 m north of the real Busáras junction.
   - Parnell St west is displaced 120-170 m north (canal-north.md 1.1). The Dominick stop is on the game's Dominick St Lower, near its Parnell St end.
   - `luas-compare.png` shows how much the shapes differ.
2. **Harbourmaster Place** is a Luas-only diagonal, not a street: the game has no Harbourmaster Place for traffic.
3. **Connolly.** The real stop is on a ramp into the station. The game's stop is in Amiens St, outside where the station stands (between RN30 and AM2), because another agent is building Connolly Station and the station footprint was not settled. If the station leaves room, the spur can be moved off-street by editing the `connolly` leg.
4. **Westmoreland St** northbound runs on the west side, not the east (§1.3), because the game's Westmoreland St is two-way.
5. **Grade-separated crossings are at grade.** The Green Line passes under the NCR and runs in a cutting at Phibsborough, and it crosses Constitution Hill. The Red Line crosses Amiens St. All are flat crossings in the game.
6. **Filler to the edges.** The south-west and north stretches run through the filler that covers the whole map. The corridor is cleared (12-13 m plus a grass verge), but no real streets are there.
7. **Termini.** A reversing tram jumps sideways onto the other track at The Point and Connolly, as before. There is no crossover animation.
8. **One tram length.** Trams are three short cars (35 m), not the real 45 m and 55 m Citadis sets, and they run at up to 13 m/s everywhere.
9. **Traffic shares the lanes.** AI cars share the tram lanes (they queue behind trams), and the platforms of single-track stops stand in the kerb lane.
10. **Rosie Hackett Bridge** is added minimally here: a plain modern deck, `access: destination`.

---

## 4. For the merge

- **Rosie Hackett Bridge / Hawkins Street.** The Custom House Quay agent was building the bridge. If their way lands too, keep one of each. The Green Line's `sb` leg only needs nodes NQ9, SQ9 and CS1 in that order along a street, so rename or retarget freely. If they give the bridge a hero model, drop `Rosie Hackett` from the `modern` regex in `ground.js`.
- **College Green / Davis fountain.** The tracks run CG1, CGM, CGT, CGC, CG3 on the Trinity (east) side of College Green. A fountain on the College Green island should keep 4.5 m from them; `world.luasNear(x, z, 4.5)` answers that directly.
- **Connolly Station.** The spur's end is the inline point `luas.legs.connolly.route[0]` (0.86 of the way from RN30 to AM2 on Amiens St); move it, and the Connolly stop's `at`, if the station wants the street clear.
- **Anything placed near the lines** (tall buildings through `slideClear`, filler through `buildings.js`) is kept clear automatically. Hand-placed sites are not. Run `luascheck.mjs`: it lists any site box the tracks cross.

---

## 5. Checks and cost

- **`luasrun.mjs`, 8 simulated hours.** All 12 trams ran end to end. Every one of the 35 stops was served. No tram ever overlapped another. The longest hold away from a stop was 26 s, a Red Line tram waiting for the Green Line at the Abbey St crossing.
- **`luascheck.mjs`.** 47,607 samples: no track over water off a bridge, no track through a landmark footprint, none over O'Connell Street's islands.
- **`footprints.mjs`.** 0 footprints on roads.
- **`bridges.mjs`.** Run in chunks, because the single evaluate times out on this loaded machine: no road over water, including the three new ways.
- **Frame cost** (`luasperf.mjs`, nine spots on the lines, headless, means):

| | draw calls | triangles | fps (noisy) |
|---|---|---|---|
| main before | 356 | 1,126,939 | 21 |
| this branch | 373 | 1,153,110 | 26 |

- The extra calls are 35 full stop kits where there were 3 kits and 7 simple platforms, merged per material per 800 m block.
- **Trams.** All 36 carriages are drawn with 8 instanced meshes in total. Only carriages within 22 m of the view frustum are written, so the meshes draw nothing when no tram is in sight. Before, each tram cost 21 meshes.
- **Track meshes** are simplified to 3 cm. `fleet.update()` costs 0.03-0.17 ms per frame for the whole fleet.
- **Quality profiles.** All of this is pure efficiency; nothing trades looks for speed, so no Low / Battery saver changes were needed.

Screenshots: `luas-before-after.png` has the owner's view at the south end of O'Connell Bridge (continuous track, tram at Westmoreland), O'Connell St, Marlborough St and the Rosie Hackett Bridge, Parnell St, Rialto, Phibsborough and the world map with both lines. `tools/scenarios/luasview.mjs` retakes the full set, which adds the GPO stop, Hawkins St and Trinity, Connolly and Busáras, The Point, Heuston, Harcourt, College Green and Broadstone.

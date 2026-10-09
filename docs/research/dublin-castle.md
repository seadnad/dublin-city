# Dublin Castle, the George's Street Arcade and Dame Street details

Build notes for WP-D1 / WP-D2 of `docs/research/hotspots-green-templebar-dame.md` (sources, OSM pulls and CC photo credits
are listed there, §2.3, §3.3 and §7; photos in `refs/dame-castle-audit/`). Coordinator decision: the Upper Yard is
pedestrian (the gates are bollarded) but is seen through the Cork Hill (Justice) gate.

- **Hero** `tools/blender/build_dublincastle.py` -> `public/models/dublincastle.glb` (148 KB): nodes `castle` (~8.6k tris),
  `arcade` (~1.5k tris), `mosaic`. Built in game metres (castle origin (-380, 250), no rotation); shared stone kit, AO in
  vertex colours; castle brick/calp/limestone/Portland/render are floodlit after dark (`heroes.js` k* materials).
  New decal regions in the shared atlas: tracery, shop, mosaic, gate (`kit.py` DECAL = `heroes.js` DECAL).
- **Castle**: Upper Yard (setts, flag bands), Bedford Tower block with the clock stage, open belfry and copper cupola,
  the Gates of Fortitude and Justice with statue-kit figures (landmarks.js `dublinCastle`), brick ranges round the yard,
  State Apartments (Portland centrepiece, colonnade, pale garden front), Record Tower (corbelled battlements),
  Bermingham Tower, Chapel Royal (buttresses, pinnacles, tracery, carved heads, battlements), Lower Yard with the
  Treasury, the Stamping Building and the shut Palace St gate, Dubh Linn Garden (round lawn, serpent paths, touchdown
  ring), Chester Beatty clock-tower building and glass annex, Coach House, precinct walls on Ship St / Stephen St Upper.
  The old 40 m stub (`dublinCastle(site)`, `extraSites.castle`) is removed. Places: "Dublin Castle", "George's Street
  Arcade", "The Stag's Head".
- **Arcade**: the 1881 block on George's St between Exchequer St and Fade St (front, gabled dormers, entrance bay with
  double arch, traceried window, rose and pinnacled turrets, corner turrets, shopfronts and awnings, glazed hall roof).
- **Stag's Head**: pub-kit spec in `pubsites.js` (Dame Court at Dame Lane) plus the footpath mosaic at Dame Court's mouth.
- **Streets** (prefix DC, dupcheck ok): Cork Hill (DC1-DC2, sett, one-way), Castle Street (DC2-DC5-CC3, one-way west),
  Ship Street Great / Little, Stephen Street Upper (one-way east), Golden Lane, Palace Street, Dame Lane, Dame Court
  (pedestrian), Fade Street. Nodes inserted into Lord Edward St (DC1), George's St (DC11, DC16) and Dame St (DC14);
  the Long Hall spec now uses SGG1-DC16, `tools/scenarios/dame.mjs` uses LE1-DC1.
- **Style**: Exchequer St no longer Temple Bar colour; George's St, Exchequer, the Castle lanes and Stephen St use a
  Victorian red-brick / render rule (`buildings.js VICTORIAN_ST`).
- **Checks**: footprints.mjs 0 on roads, bridges.mjs clean, no console errors. Day and night look shots taken
  (Cork Hill gate, through the gate, the yard, the garden, the arcade, the Stag's Head, aerial).

## Status (paused)

Paused by the coordinator (usage limit). Done: everything listed above, committed and working.
Left: `docs/research/dublin-castle-compare.png`; frame-cost measurement (headless fps looked unchanged, not measured
properly); --mobile shots; Dame St frontage pass (ornate Victorian fronts) and Aungier St character; Dubh Linn paths
could read stronger; Fade St ends at the Drury St line (x -205) waiting for the Grafton agent's Drury St (join DC17);
Dame Lane ends at x -158 (Trinity St not in the game).
Known issues (not breakage): game George's St/Exchequer St sit ~40 m west / 17 m south of reality (pre-existing), so
the arcade block is 33.5 m long instead of ~47; City Hall's site sits ~15 m south of reality, so the yard is shifted
south a few metres to clear it.

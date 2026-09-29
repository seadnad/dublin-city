# Five landmark areas: build report (Phase 2)

Research for each area is in `docs/research/<area>.md` (Phase 1). This report covers what was built from it, what still differs from reality, and the budget.

Comparison sheets (reference photo on the left, game on the right):
- `hapenny-bridge-compare.png`
- `temple-bar-compare.png`
- `christ-church-compare.png`
- `st-patricks-compare.png`
- `heuston-compare.png`

## Shared changes

- **Street data model.** Ways gain `oneway` (1 / -1), `access` (`pedestrian` / `destination`) and `surface` (`sett` / `flags`).
  - AI traffic obeys one-ways and keeps out of pedestrian zones.
  - The player can still drive anything, slowly, on the cobbles.
  - Setts follow `surface`, not access, so the pedestrian core keeps its cobbles.
- **North–south stretch band (x1.4)** from Dame Street to the south quays. At half scale with real-width roads there was no room for Merchant's Arch and the quay-front buildings between Temple Bar and the quay (research open question). It depends on latitude only, so north–south streets stay straight.
- **River banks** now follow each quay's own width, so Wellington Quay narrows to its real ~13 m kerb-to-facade.
- **Tests:**
  - `footprints.mjs`: no landmark on a carriageway.
  - `bridges.mjs`: no road over water.
  - Both are clean.
- **HUD street names** match the OSM names in every review shot (Temple Bar, Crown Alley, Eustace Street, Fleet Street, Essex Street East, Merchant's Arch, Aston Quay, Lower Ormond Quay, Liffey Street, Bull Alley Street, Victoria Quay, …).

## Per area

| Area | Roads | Hero model (tris, file) | Other |
|---|---|---|---|
| Ha'penny Bridge | Bridge re-aimed square to the river, landing opposite Merchant's Arch (new node `HPS`) | `hapenny.glb`: 4.2k tris, 25 KB. White shallow arch, X-cell spandrel band, 3 ribs with bracing, bar railings with urn newels, 3 openwork ogee lamp arches (lanterns light at night), granite abutments, steps and wing walls | Quay parapet opens at both landings; steps block cars |
| Temple Bar | Spine re-traced to the real junctions (20–45 m north); Eustace/Sycamore/Anglesea/Crown Alley straightened; Cope St, Temple Lane S, Fownes St Upper, Merchant's Arch added; real widths; one-way loops; pedestrian core; Parliament St pedestrianised | Merchants' Hall with a walk-through vaulted passage; red pub corner (now the real Temple Bar pub, docs/research/pubs.md); Temple Bar Square | Wall-bracket lanterns every 12 m, festoon bulbs over the pedestrian lanes, hanging baskets |
| Christ Church | Christchurch Place as the curve round the precinct; LE1 and Fishamble St on the real line (Fishamble one-way up); Winetavern St one-way down with a node at the bridge; Cook St added; Nicholas St re-anchored at HS1 | `christchurch.glb`: cathedral 3.1k + Synod Hall 0.8k + bridge 0.1k tris, 63 KB. Aisles with 5 flying buttresses a side, stepped crenellations, crossing tower with corner turrets and the green slate pyramid, west front (rose, 5-lancet group, portal, octagonal turrets), transept roses, polygonal east end; Synod Hall with rear tower, dormers, chimneys; the covered bridge with its arcade, stretched to the gap | Railed grounds with lawn and trees |
| St Patrick's | Nicholas St → Patrick St → New St South; Bull Alley, Bride Rd, Bride St, Werburgh St, Kevin St Upper/Lower, St Patrick's Close (cobbled, access only) | `stpatricks.glb`: 4.1k tris, 57 KB. Nave with aisles and pinnacled flyers, transepts with triple lancets and crenellated turrets, choir, Lady Chapel, west front with triple lancet and blue door, Minot's Tower (clocks W/N, turrets) and the 66 m granite spire | The park (pavers axis, fountain in its pool, second fountain, Liberty Bell, Literary Parade terrace, benches, trees), Iveagh Play Centre with copper cupola |
| Heuston | Station moved to the **north** of St John's Rd W, facing east; Steevens Lane north end tram/emergency only; Benburb St and Seán Heuston Bridge added; Frank Sherwin widened to 19 m and made a flat 3-span deck; **Luas Red Line extended** Smithfield → Queen St → Benburb St (Museum) → Seán Heuston Bridge → Heuston → Steevens Lane → James's St | `heuston.glb`: 2.3k tris, 35 KB. 9-bay granite front with engaged columns, alternating pediments, balustrade, attic with arms and "VIII VIC · A.D. 1844", 3 flagpoles; low wings with open stone-domed bellcotes; north return; arcaded south range; brick shed with 3 corrugated piles and glazed ridges | Dr Steevens' Hospital across the road (generic); forecourt kept open |

**Textures:**
- The stone landmarks share one 1024 decal atlas (lancets, stepped lancet group, rose, louvre, clock, portal, oculus, sash, attic, arcade) and small tileable stone textures, all painted at load.
- Ambient occlusion is baked into vertex colours, so there are no unique UVs or image files to ship.
- The Ha'penny Bridge has its own 1024 atlas (X-cell, railing, filigree, granite).

**Total new hero geometry:** about 15k triangles across four GLBs (183 KB), well under the 8–20k per landmark budget. I chose the lower end for phones.

## Performance

These figures come from Chrome emulating a phone (Pixel-class viewport, low tier, dpr 1) on this laptop's AMD Vega 8. **No physical mid-range Android phone was measured.** The before and after runs use identical camera spots (`tools/scenarios/areaperf.mjs`).

| Area | Before fps / GPU ms / calls / tris | After fps / GPU ms / calls / tris |
|---|---|---|
| Ha'penny Bridge | 48–55 / 12.3 / 637 / 1.68M | 29–32 / 15.6 / 690 / 1.59M |
| Temple Bar | 55 / 12.0 / 428 / 1.23M | 32 / 16.3 / 530 / 1.33M |
| Christ Church | 57–58 / 11.4 / 342 / 1.03M | 33–39 / 14.5 / 456 / 1.14M |
| St Patrick's | 71 / 9.5 / 160 / 0.78M | 40–47 / 12.7 / 234 / 0.86M |
| Heuston | 77 / 8.5 / 186 / 0.74M | 46 / 9.0 / 220 / 0.78M |

**GPU time rose by 3–4 ms** in the four central areas.

A split at Temple Bar (`gpusplit.mjs`) shows where the cost is:
- The hero models cost about 0.3 ms.
- The Temple Bar dressing costs about 0.8 ms.
- Instanced props as a whole cost about 5.7 ms (287 draw calls). That group includes lamps (lanes now have a lantern every 12 m instead of 20), traffic, people and trees.

The area is simply denser now: more lanes, lamps, trees and parks.

**Not yet done:** consolidating the per-lane lamp and light-pool instances, and a distance cut-off for the wall lanterns. Those are the obvious next steps.

## What still differs from reality

- **Scale.** The map is half size. Hero footprints are 0.5–0.6x plan with real (or 0.85x) heights, so buildings read slightly tall and narrow. The Temple Bar–quay block needed the stretch band.
- **Detail is texture, not geometry.** Windows, roses, louvres, the Heuston attic and arcades are decals. There are no carved statues, swags, Corinthian capitals, traceried roses or the Ha'penny spandrel ornament in relief.
- **Christ Church.** The west front turrets and choir are simplified. There is no chapter-house ruin, Homeless Jesus bench, Hammond Lane lamps or Civic Offices bunkers. The 5% slope down to the quays is ignored (flat world).
- **St Patrick's.** There is no Benjamin Lee Guinness statue, Marsh's Library, Deanery or floodlighting. The Iveagh Trust flats use the generic red-brick filler.
- **Heuston.**
  - There is no Luas stop kit (platforms, shelters, overhead poles).
  - The Luas uses the generic stop platforms.
  - Seán Heuston Bridge is a generic single white arch, not the cast-iron ribs and spandrel panels.
  - The Liffey west of Frank Sherwin is still a straight channel.
  - The shed is shortened to about 115 m.
- **Temple Bar.**
  - Meeting House Square, Crow St, Cecilia St, Curved St and Essex Gate were not added.
  - Filler shopfronts use the existing generic names and colours, not the proposed pub-front atlas.
  - No neon beyond the one blade sign.
- **Buildings from OSM footprints** (the brief's "extrude from OSM") were not done. At half scale the footprints can't be placed literally. The filler generator keeps its procedural lots along the corrected street lines instead.
- **Quays one-way** (north eastbound, south westbound) was not applied Liffey-wide.
- **Mapillary** was not used in research (no API token).

## Sources

Per-area source lists are in each research file. All reference images come from Wikimedia Commons / geograph (CC0, CC BY, CC BY-SA), with `refs/<area>/sources.json`. OSM data comes via Overpass (ODbL), in `data/osm/`.

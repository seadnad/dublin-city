# Áras an Uachtaráin and Dublin Zoo (`aras-zoo`): research and build notes

Scope: the President's house (the long white Palladian house, its south garden front with the Ionic portico, the terrace, the yews, the wings, the north entrance front), its lawn, ha-ha and the public vista from Chesterfield Avenue; Dublin Zoo's park-side entrance, both halves of its grounds, the lakes and islands, the African Plains and a few animals. The Wellington Monument, the Áras gates and the demesne outline already existed (`docs/research/phoenix-park.md`).

- **Raw OSM:** `data/osm/aras-zoo.json` (376 KB, 633 elements, ODbL). Two Overpass `out geom` pulls: bbox S 53.3555, W -6.3380, N 53.3660, E -6.3020 (Áras, Deerfield, the zoo's north half) and S 53.3515, W -6.3090, N 53.3560, E -6.3015 (the zoo's south half and entrance), snapshots 2026-09-29T23:11Z. Filtered to the demesne (padded), Deerfield and the two zoo rings; street lamps, bus stops, trees, benches and houses outside the park dropped.
- **Game data:** `src/data/aras-zoo.json`, the simplified outlines (~1.5 m) and positions the game uses.
- **References:** `refs/aras-zoo/` holds 18 images, Wikimedia Commons and geograph, CC BY / CC BY-SA (§2, and `refs/aras-zoo/sources.json`).
- **Mapillary:** not used (no token).
- Facts are **VERIFIED** (OSM / Wikipedia) or **est.**

---

## 1. Map data

### 1.1 Áras an Uachtaráin (VERIFIED, OSM way `26636056`)

| Element | Real (lat, lon) | Game (x, z) |
|---|---|---|
| South front, west end of the main range | 53.35969, -6.31801 | -1886.9, -735.8 |
| South front, east end of the main range | 53.35941, -6.31695 | -1862.2, -720.4 |
| South portico centre (front of the columns) | 53.35952, -6.31750 | -1874.9, -726.6 |
| North (entrance) portico | 53.35977, -6.31731 (OSM `entrance=main`) | -1870.6, -740.3 |
| East range end (1911 wing) | ~53.35943, -6.31610 | -1842.5, -721.3 |
| West wing end (Garda stables block beyond) | ~53.35998, -6.31851 | -1898.6, -752.0 |
| Áras gates (existing) | 53.36063, -6.32441 | -2035.7, -788.1 |
| Chesterfield Ave where the house's vista meets it | ~53.3574, -6.3193 | ~-1905, -606 |

- The main range's south front is **≈77 m** long (real) and faces **bearing ≈204° (SSW)**, down a mown vista to Chesterfield Avenue ≈300 m away. The whole house with the east (1911) range and west wing is **≈165 m x 55 m** (OSM bbox 53.35937-53.36032, -6.31854..-6.31606).
- Ha-ha: OSM `44987526` (`barrier=ditch, ditch=ha_ha`) runs from 53.35831, -6.31669 round the south lawn and west to the gates. Garden walls `456135010`, `456135016`; the formal gardens `148567190`, `301626802` east of the house; three fountains.
- The Garda Mounted Unit's stables (`148567171`, `amenity=police`) adjoin the west wing.
- Heights (est. from refs 01-03 against a 1.8 m person): ground floor + first floor ≈11 m to the cornice, the portico columns ≈8.5 m on a terrace ≈1 m up, pediment apex ≈15 m, the chimney stacks ≈4-5 m above the roof, central flagpole ≈10 m above the ridge.

### 1.2 The squeeze and how the model compensates (the key design point)

West of lon -6.2985 the park is squeezed east-west by `PARK_X` (0.7, so **0.35 of real** overall; north-south stays 0.5). The Áras front runs WNW-ESE, nearly east-west, so projected:

- The 128 m OSM south-front line becomes **46.6 game m**, and its bearing turns from 105.6° to 111.7°; the 77 m main range would be **≈28 m** long under real-height walls: a tall square box, not a long low Palladian front.
- **Compensation:** the house is built in game metres at **0.64 of real along the front, 0.55 in depth, 0.7 in height** (main range 49.6 m x 12.9 m, cornice 11.4 m, pediment apex 15 m). That keeps the front's length-to-height ratio at ~4.3 (real ≈4.4), so it reads long and low from the avenue. The wings are shortened more (east range 32 m, west wing 28 m) so the whole house (≈110 m) stays inside the demesne and clear of the gardens.
- **Orientation:** the model faces straight down its *projected* axis (the real 204° bearing through the squeeze comes out ≈17° west of south in the game), so from the avenue the portico is square on, as in the photos. `src/data/aras-zoo.json` `aras.front` / `aras.axisEnd` define it.
- The house's centre is placed at the projected centre of the real south front, so it sits where the demesne, ha-ha and lawns expect it.

### 1.3 Dublin Zoo (VERIFIED, OSM relation `8808835`, 24.7 ha in two outer rings)

The game only had the **north ring** (`parkFeatures.zoo`, 14 ha: the African Plains, the lake, the gorilla rainforest). The **south ring** (10.7 ha: the original 1831 gardens by the Hollow, the entrance, the lake with the flamingos, the Kaziranga elephant trail, Haughton House) was missing and is now added (`zooSouth`).

| Element | Real (lat, lon) | Game (x, z) | OSM |
|---|---|---|---|
| **Entrance building** (the lettered granite wall; ticket hall; Zoovenir shop) | 53.35271-53.35317, -6.30504..-6.30434 | -1585, -347 to -1569, -373 | `8808834`, main entrance node `1107974701` at 53.35279, -6.30485 |
| 1833 thatched entrance lodge (cottage orné) | 53.35328, -6.30430 | at the building's east end | `391812261` (heritage) |
| Ticket kiosk (old Victorian booth) | 53.35266, -6.30516 | -1588.0, -344.5 | `391812262` |
| The Hollow bandstand / Tea Rooms (existing) | 53.35221, -6.30358 / 53.35210, -6.30474 | -1549.6, -321.7 / -1578.2, -313.4 | |
| South lake (flamingos at 53.35541, -6.30533) | 53.3527-53.3555, -6.3045..-6.3062 | round -1596, -419 | `5884527`, 9 islets |
| North lake (Chimpanzee and Mangabey islands) | 53.3571-53.3607, -6.3052..-6.3098 | round -1650, -650 | `10795933` |
| African Plains (sand, `zoo=enclosure`) | 53.3572-53.3585, -6.3117..-6.3087 | round -1710, -615 | `40007113`, `236891726`, `10582431` |
| Giraffe (OSM attraction) | 53.35744, -6.31083 | -1719.9, -610.6 | node |
| Elephant house (Kaziranga) | 53.35641-53.35672, -6.30435..-6.30388 | round -1562, -540 | `95475098` |
| Hippo house | 53.35811-53.35857, -6.3093..-6.3086 | | `236891729` |

- **Entrance position verified:** the entrance is on the zoo's south tip, facing the **Hollow** (the lawn with the bandstand), 60-70 m north of Chesterfield Avenue (PX13-PX14). No road reaches it; visitors walk up from the avenue past the Tea Rooms. The phoenix-park doc's "Victorian ticket building at 53.35269, -6.30506" is the old kiosk beside the new building.
- Opened 1831 (the third-oldest public zoo in Europe; Wikipedia).

### 1.4 Deerfield (US Ambassador's Residence) — not built

53.35821, -6.33356 (`parkFeatures.deerfield`), 1.9 km west of the Áras, walled (`38510936`). Left for a later pass; the elements are in the OSM pull.

## 2. References (`refs/aras-zoo/`)

| File | Source | Author | Licence | Shows |
|---|---|---|---|---|
| 01-south-front-frontal.jpg | Commons: Dublin-14-Praesidentenpalais-2017-gje.jpg | Gerd Eichmann | CC BY-SA 4.0 | South front square on: portico, terrace, yews, five stacks |
| 02-portico-close.jpg | Commons: Phoenix Park, Dublin, Ireland - panoramio.jpg | K.ristof | CC BY-SA 3.0 | Portico close: unfluted Ionic columns, dentil pediment, recessed panels |
| 03-south-front-wide.jpg | Commons: Aras as uachtarain.jpg | jaqian | CC BY 2.0 | West pavilion, portico, east range, EU flagpole |
| 04-vista-evening.jpg | Commons: Áras an Uachtaráin-2011.jpg | Erin Costa | CC BY 2.0 | From the park lawn, framed by conifers |
| 05-vista-mown-strip.jpg | geograph 5199543 | David Dixon | CC BY-SA 2.0 | The mown vista through the meadow (public view) |
| 06-vista-summer.jpg | geograph 6004577 | N Chadwick | CC BY-SA 2.0 | The vista in summer |
| 07-sunset.jpg | Commons: Áras an Uachtaráin at sunset.jpg | John Flanagan | CC BY 2.0 | Sunset, tricolour |
| 08-terrace-steps.jpg | Commons: Áras an Uachtaráin 2007.jpg | Joe Anderson | CC BY-SA 2.0 | Terrace, steps, gravel |
| 09-east-range.jpg | Commons: Áras an Uachtaráin 2007 2.jpg | Joe Anderson | CC BY-SA 2.0 | East range, EU flagpole |
| 10-autumn-lawn.jpg | Commons: Áras an Uachtaráin 2011.jpg | michael kooiman | CC BY-SA 2.0 | Lawn and portico |
| 11-zoo-entrance-letters.jpg | Commons: DublinZooEntrance.jpg | Rory Parle | CC BY-SA 3.0 | Raised DUBLIN ZOO letters, glazed band, timber soffit |
| 12-zoo-entrance.jpg | geograph 5948326 | Anthony Parkes | CC BY-SA 2.0 | Entrance building and turnstile passage |
| 13-zoo-lodge-1833.jpg | Commons: Dublin Zoo house.jpg | DamienSlattery | CC BY-SA 3.0 | 1833 thatched lodge |
| 14-zoo-lake.jpg | Commons: Dublin Zoo (4489665594).jpg | Sean MacEntee | CC BY 2.0 | The lake |
| 15-elephant-house.jpg | Commons: Dublin Zoo (7054179863).jpg | Sean MacEntee | CC BY 2.0 | Elephant house |
| 16-african-plains-lake.jpg | Commons: Dublin Zoo (6908141688).jpg | Sean MacEntee | CC BY 2.0 | Plains lake and houses |
| 17-african-plains.jpg | Commons: Dublin Zoo (6908245256).jpg | Sean MacEntee | CC BY 2.0 | Sand and boulder walls |
| 18-giraffes.jpg | Commons: Dublin Zoo (7054451849).jpg | Sean MacEntee | CC BY 2.0 | Giraffes on the plains |

## 3. Cues

1. **Long, low, white.** Painted stucco, near white (`#eeebe3`), grey-green slate hips, a blocking course over a strong cornice; two floors of plain sash windows.
2. **The tetrastyle Ionic portico** on the south front, unfluted columns, plain pediment, rising from a balustraded terrace with a flight of steps to a gravel sweep; round-headed tall windows either side of it; slightly advanced end pavilions.
3. **Tall clipped yew hedges** either side of the terrace and two topiary drums by the steps (every photo).
4. **Five tall white chimney stacks** along the ridge, and the **tricolour** on a tall central flagpole (the EU flag on a second pole to the east).
5. **Seen across a lawn** down a mown vista, framed by tall conifers and broadleaves; the wings are mostly hidden.
6. **At night:** the house is floodlit and a **lamp is kept lit in a window** (the tradition started by President Mary Robinson in 1990 for the Irish abroad; which window is est.).
7. **Zoo entrance:** a pale granite wall with raised **DUBLIN ZOO** letters, a glazed band above, a deep flat roof with a timber soffit; the thatched 1833 lodge beside it.
8. **From the air:** two lakes with wooded islands, the pale sand of the African Plains with low boulder walls, dense trees.

## 4. What was built

- `tools/blender/build_aras.py` → `public/models/aras.glb` (111 KB, Draco) / `models/aras.blend`. Nodes and triangles: **aras 4,334**, zooentrance 762, zoolodge 185, elephanthouse 180, giraffehouse 100 (**5,561** total), AO baked into vertex colours. The Áras: main range with advanced pavilions, cornice/blocking course, hipped slate roofs, the portico (four Ionic columns with cut-out volutes from the Parliament House atlas, entablature, pediment), terrace with balustrades, urns and steps, gravel, sash and round-headed windows (shared decal atlas), seven chimney stacks, the flag, the east range with the EU flagpole, the west wing, the north ranges and the north Doric entrance portico, the yew hedges and topiary. Zoo: the entrance building with extruded letters, mullioned glazing and a canopy over the turnstiles; the thatched lodge; the elephant house (curved lead roof); a timber giraffe house.
- `src/world/aras-zoo.js`: placement from absolute coordinates, the vista clearing and lawn, framing trees, the zoo's south ring, lakes (heroes and roads kept clear), islands with clumps, the plains' sand and boulder walls, the elephants' yard, 40 animals (giraffes, zebras, rhinos, ostriches, oryx, elephants, hippos, 16 flamingos; one merged mesh), collision boxes, the two Places views.
- `src/world/park.js`: plants/prunes round them, fences and hedges both zoo rings (a gap at the entrance), places the GLB and batches it (`batchStatic`: one draw per material for all five heroes).
- `src/world/heroes.js`: new park materials (stucco floodlit, candle, yew, gravel, flag colours, zoo granite uplit, glazing lit at night, timber, thatch, cladding).
- Places: **"Áras an Uachtaráin"** (on Chesterfield Avenue where the vista meets it, facing up the lawn; no tree belt needed thinning beyond the vista clearing) and **"Dublin Zoo"** (no road reaches the entrance, so the car waits on the Hollow in front of the lettered wall). Map glyphs Á and Z, HUD blurbs.
- `tools/scenarios/places.mjs` (Places views day/night, `PLACES=`), `tools/scenarios/arasperf.mjs` (frame cost, additions shown vs hidden).

## 5. Checks and cost

- `footprints.mjs`: 0 on roads. `bridges.mjs`: clean. No console errors (desktop and `--mobile`).
- `arasperf.mjs` (headless, GPU p25, additions shown / hidden; noisy on this machine, the differences are within noise):

| Tier | Spot | Shown | Hidden |
|---|---|---|---|
| Low | Áras view | 26.3 ms, 205 calls, 1.11 M tris | 28.3 ms, 186 calls, 1.10 M |
| Low | Zoo view | 28.7 ms, 248 calls, 1.61 M | 36.9 ms, 212 calls, 1.59 M |
| Low | Chesterfield by the zoo | 26.5 ms, 208 calls, 1.60 M | 31.1 ms, 198 calls, 1.58 M |
| High | Áras view | 44.4 ms, 232 calls, 1.65 M | 45.4 ms, 212 calls, 1.63 M |
| High | Zoo view | 54.5 ms, 304 calls, 2.64 M | 55.3 ms, 269 calls, 2.62 M |
| High | Chesterfield | 53.1 ms, 226 calls, 2.17 M | 53.0 ms, 216 calls, 2.16 M |

  Cost: +10-35 draw calls and ~15-20 k triangles where they are in view; no measurable GPU time. Nothing trades looks for speed, so there is nothing Low-only.
- Comparison: `docs/research/aras-zoo-compare.png` (reference left, game right).

## 6. Not done / open

- Deerfield (the US Ambassador's residence) not built.
- The north front is simplified (est.: no good CC photo of it); the formal gardens east of the house and the Garda stables are not modelled.
- Zoo: no gorilla/chimp houses, Haughton House or Roberts House; the old Victorian kiosk is not separate; animals are static.
- The house is not squeezed with the map, by design (§1.2): it is wider than the projected OSM footprint.

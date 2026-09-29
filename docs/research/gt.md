# Liffey GT: the hot hatch

The fun car. Inspired by the Mk7 / Mk8-era Golf GTI silhouette, but with an original name ("Liffey GT") and a
plain round badge: no maker's logos, badges or trademark names on the car or in the UI.

- Model: `public/models/gt.glb`, built by `GT` / `gt_extras` in [`tools/blender/build_cars.py`](../../tools/blender/build_cars.py)
  (`blender -b --factory-startup -P tools/blender/build_cars.py -- public/models gt`). About 15.7k triangles,
  160 KB (Draco), against the i30 N's 14.4k and 414 KB.
- Handling: `CAR_PROFILES.gt` in [`src/game/car.js`](../../src/game/car.js). Engine voice: `sport` in
  [`src/game/audio/engine.js`](../../src/game/audio/engine.js). Menu entry, blurb and colours:
  [`src/game/carlist.js`](../../src/game/carlist.js).
- Screenshots: [`gt-sheet.png`](gt-sheet.png). Scenarios: `tools/scenarios/gt.mjs` (menu, views, day and night
  drive, colours), `tools/scenarios/handling-compare.mjs` (the numbers below).

## What was modelled, from the references

- Proportions: 4.27 m long, 1.80 m wide, 1.44 m tall, 2.63 m wheelbase, short overhangs (0.87 m front, 0.77 m
  rear), 18-inch wheels (0.644 m tyres) with tight arch gaps for the lowered stance.
- Side: belt line just above 0.9 m, the long glasshouse ending in a thick forward-leaning C-pillar above the rear
  wheel, black window surrounds, a small quarter-light divider, a crease under the shoulder, black sill.
- Front: a thin honeycomb grille between the headlights with the red line running along its bottom edge and on
  into the headlights; headlights with two projector lenses in chrome rings and an LED wing along the top edge;
  a wide honeycomb lower intake, side intakes with three fins and a small lamp, a black splitter.
- Rear: wraparound tail lights (lens, an LED line graphic, a reversing lamp inboard), body-colour roof spoiler
  with the high-level brake light under its lip, black diffuser with fins, a chrome tailpipe each side.
- Wheels: dark gunmetal twin five-spoke alloys with a lip, a brake disc visible through the spokes and red
  calipers. The front calipers steer with the wheel but don't spin (`caliper_front_*` nodes, see `models.js`).
- Tartan seats were left out: the car glass in this game is opaque tinted glass (no interior is modelled).

Builder improvements that came with it (all optional per car; the i30 N and coupe export byte-identical): extra
vertex columns across the width so the nose, tail and windscreen curve in plan; a C-pillar line that ends the
side glazing; a revolved, open-centred tyre so the brakes show; tapered, dished spokes; hexagonal honeycomb
grilles with shared walls; quad-strip decals for long thin bands (no dropped slivers); Draco export.
The outlines are drawn inside the visible surface by the bevel (0.075 m body, 0.09 m cabin), which grows them back.

## Handling (fixed 60 Hz step on the real physics, `handling-compare.mjs`)

| | Garda i40 / i30 N (standard) | Liffey GT |
|---|---|---|
| 0-100 km/h | 2.83 s | 1.85 s |
| Top speed | 121 km/h | 159 km/h |
| 100-0 km/h | 11.9 m | 10.1 m |
| Full lock at 50 km/h (lateral) | 4.1 g, 12.6 m radius | 6.9 g, 11.6 m radius |
| Full lock at 90 km/h (lateral) | 4.9 g | 8.2 g |
| Steering response (90 % yaw, half lock) | 0.58 s | 0.42 s |
| Handbrake flick at 60 km/h (0.65 s) | 59° rotation | 88° rotation |
| Drift recovery after the flick | 0.10 s | 0.08 s |
| Lift off mid-corner at 80 km/h (0.8 s) | no slip | 4.7 m/s slip, yaw 1.47 -> 1.72 rad/s |
| Back on the power | n/a | slip gathered in 0.27 s |

These are arcade numbers (the game's physics is deliberately grippy); what matters is the ratio. The lift-off
rotation is new and only the GT has it (`liftOff`, `liftGrip`): off the throttle or trail-braking with the wheel
turned above 36 km/h, the rear gives up some grip and the velocity lags the nose, so the tail steps out; throttle
brings the grip back within a few tenths. A long enough slide counts as a drift for the release boost.

## Sound

No new files. The sport voice pitches the existing recordings into a higher band (a six-speed petrol that revs to
7,000, upshifting at 6,600 flat out) and adds a small synthesised four-cylinder layer (sawtooth and square at the
firing frequency, soft-clipped, band-passed with the revs), plus short noise-burst crackles on the overrun when you
lift above 3,800 rpm and a blip on flat-out upshifts. The synth only runs while the GT is the player's car.

## References (Wikimedia Commons; licences in [`refs/gt/sources.json`](../../refs/gt/sources.json))

| File | Author | Licence | Used for |
|---|---|---|---|
| [Volkswagen Golf VII GTI (KW P 36).jpg](https://commons.wikimedia.org/wiki/File:Volkswagen_Golf_VII_GTI_(KW_P_36).jpg) | Midnight Runner | CC BY-SA 4.0 | front: grille line, headlights, intakes |
| [VW Golf VII GTi CS Seite.JPG](https://commons.wikimedia.org/wiki/File:VW_Golf_VII_GTi_CS_Seite.JPG) | KarleHorn | CC BY-SA 4.0 | side profile, C-pillar, stance, wheels |
| [VW Golf VII GTi CS Front.JPG](https://commons.wikimedia.org/wiki/File:VW_Golf_VII_GTi_CS_Front.JPG) | KarleHorn | CC BY-SA 3.0 | front close-up |
| [VW Golf VIII GTI Clubsport Heck.jpg](https://commons.wikimedia.org/wiki/File:VW_Golf_VIII_GTI_Clubsport_Heck.jpg) | Thomas doerfer | CC BY-SA 4.0 | rear: lights, spoiler, diffuser, tailpipes |
| [Volkswagen Golf VIII GTI Facelift IMG 9693.jpg](https://commons.wikimedia.org/wiki/File:Volkswagen_Golf_VIII_GTI_Facelift_IMG_9693.jpg) | Alexander-93 | CC BY-SA 4.0 | rear: tail-light graphic, tailgate |
| [Volkswagen Golf GTI (Mk VII) Washington DC Metro Area, USA (2).jpg](https://commons.wikimedia.org/wiki/File:Volkswagen_Golf_GTI_(Mk_VII)_Washington_DC_Metro_Area,_USA_(2).jpg) | OWS Photography | CC BY 4.0 | glazing, pillars, dark alloys |

Downloaded through the Commons API with a generic User-Agent (`DublinDriveResearch/1.0 (hobby game research)`).

## Known limits

- The body is still an extruded side profile: flat flanks with a single crease, and the tailgate is narrower than
  the rear shoulders (a small ledge above the tail lights), so it reads a touch more estate-like side-on than the
  real thing.
- Decals are flat projections: the honeycomb has no depth and the grille line is painted on.
- The handling numbers above are the physics' own; the in-game feel also depends on the frame rate (the step is
  capped at 50 ms).

"""Heuston Station (Kingsbridge, Sancton Wood, 1846): the granite head building, its bellcotes and the train shed.

Run headless:  blender -b --factory-startup -P tools/blender/build_heuston.py -- public/models models

Sources: docs/research/heuston.md - the east front is a 9-bay, two-storey Italianate palazzo 32.6 m wide, ~16.5 m
to the cornice and ~19 m to the balustrade, with 8 engaged Corinthian columns over a rusticated arcade, a solid
central attic with arms and "VIII VIC / AD 1844", three flagpoles; single-storey wings 16.2 m wide set back ~4.5 m,
each carrying a small open bellcote with a stone dome; a two-storey north return, a long single-storey arcaded
range along St John's Road West, and the train shed behind (red brick in Flemish bond, multiple-pile roofs of
corrugated iron with glazed strips).
Built at real size, scaled 0.6 east-west, 0.5 north-south, 0.85 in height to fit between the Liffey and St John's
Road West in the half-scale map. Origin: the middle of the east front at ground level; the front faces +X (east).
Materials: hs_granite, hs_slate, hs_brick, hs_roof, hs_glass, hs_decal
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Decals

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)
M = dict(granite=kit.material('hs_granite', (0.4, 0.39, 0.36)), slate=kit.material('hs_slate', (0.07, 0.08, 0.09)),
         brick=kit.material('hs_brick', (0.26, 0.07, 0.04)), roof=kit.material('hs_roof', (0.16, 0.17, 0.18)),
         glass=kit.material('hs_glass', (0.34, 0.45, 0.51)), decal=kit.material('hs_decal', (1, 1, 1)))
gra, sla, bri, roo, gla, dec = Part('hs_granite'), Part('hs_slate'), Part('hs_brick'), Part('hs_roof'), Part('hs_glass'), Decals('hs_decal')

HW, D, CORN, PARA = 16.3, 21.0, 16.5, 19.0      # main block half-width (N-S), depth, cornice, balustrade top
WHW, WSET, WH = 16.2, 4.5, 7.0                   # wing width, set-back, height
BAY = 2 * HW / 9

# ---- main block: rusticated arcade below, columns and pedimented windows above, cornice, balustrade, attic
gra.box(-D, 0, -HW, HW, 0, CORN, top=False)
sla.pyramid(-D / 2, 0, CORN, D / 2 - 0.5, HW - 0.5, CORN + 4.5)
gra.box(-D - 0.3, 0.6, -HW - 0.3, HW + 0.3, CORN, CORN + 0.9)          # projecting cornice
for k in range(9):
    y = -HW + (k + 0.5) * BAY
    dec.on('arcade', 'x', 0, 1, y - BAY / 2 + 0.1, y + BAY / 2 - 0.1, 0.0, 6.0)
    dec.on('sash', 'x', 0, 1, y - 0.8, y + 0.8, 8.0, 12.2)
    # alternating triangular and segmental pediments over the first-floor windows
    if k % 2 == 0:
        gra.face([(0.2, y - 1.05, 12.5), (0.2, y + 1.05, 12.5), (0.2, y, 13.3)][::-1])
        gra.box(0, 0.25, y - 1.05, y + 1.05, 12.3, 12.5)
    else:
        gra.box(0, 0.3, y - 1.0, y + 1.0, 12.3, 12.8)
    dec.on('sash', 'x', 0, 1, y - 0.55, y + 0.55, 13.8, 15.8)   # attic-storey windows
for k in range(1, 9):
    y = -HW + k * BAY
    gra.prism(0.25, y, 0.42, 6.0, 15.4, 8)                        # engaged Corinthian column
    gra.box(-0.2, 0.75, y - 0.55, y + 0.55, 15.4, 16.0)           # capital
    gra.box(-0.2, 0.75, y - 0.55, y + 0.55, 5.7, 6.0)             # base
gra.box(-0.2, 0.6, -HW - 0.1, -HW + 0.6, 0, CORN)                 # end pilasters
gra.box(-0.2, 0.6, HW - 0.6, HW + 0.1, 0, CORN)
# balustrade on the outer bays, solid attic in the middle with the arms and inscriptions, three flagpoles
for s in (-1, 1):
    y0, y1 = (-HW + 0.3, -5.2) if s < 0 else (5.2, HW - 0.3)
    gra.box(0.1, 0.6, y0, y1, CORN + 0.9, CORN + 1.1)
    gra.box(0.1, 0.6, y0, y1, PARA - 0.25, PARA)
    y = y0
    while y < y1:
        gra.box(0.2, 0.5, y, y + 0.14, CORN + 1.1, PARA - 0.25)
        y += 0.36
gra.box(-0.6, 0.7, -5.2, 5.2, CORN + 0.9, PARA + 2.4)
dec.on('attic', 'x', 0.7, 1, -5.0, 5.0, CORN + 1.2, PARA + 2.1)
for y in (-4.0, 0.0, 4.0):
    gra.box(-0.3, -0.18, y - 0.06, y + 0.06, PARA + 2.4, PARA + 8.0)

# ---- the wings, set back, with a balustraded parapet and a pedimented doorway; each carries an open bellcote
for s in (-1, 1):
    y0, y1 = (HW, HW + WHW) if s > 0 else (-HW - WHW, -HW)
    gra.box(-D, -WSET, y0, y1, 0, WH, top=True)
    gra.box(-D, -WSET + 0.3, y0, y1, WH, WH + 0.35)
    for k in range(3):
        y = y0 + (k + 0.5) * (WHW / 3)
        dec.on('arcade', 'x', -WSET, 1, y - 2.5, y + 2.5, 0.0, 6.0) if k == 1 else dec.on('sash', 'x', -WSET, 1, y - 0.9, y + 0.9, 1.6, 5.4)
    # bellcote: four piers round an open belfry, small pediments, a stone dome and finial
    cy, cx, b = s * (HW + WHW / 2), -WSET - 5.0, 1.9
    gra.box(cx - b, cx + b, cy - b, cy + b, WH, WH + 1.2)
    for px, py in ((cx - b, cy - b), (cx + b, cy - b), (cx + b, cy + b), (cx - b, cy + b)):
        gra.box(px - 0.4, px + 0.4, py - 0.4, py + 0.4, WH + 1.2, WH + 4.4)
    gra.box(cx - b - 0.2, cx + b + 0.2, cy - b - 0.2, cy + b + 0.2, WH + 4.4, WH + 5.0)
    for axis in ('x', 'y'):
        for f in (-1, 1):
            if axis == 'x':
                gra.face([(cx + f * (b + 0.2), cy - b, WH + 5.0), (cx + f * (b + 0.2), cy + b, WH + 5.0), (cx + f * (b + 0.2), cy, WH + 5.9)][::(1 if f > 0 else -1)])
            else:
                gra.face([(cx + b, cy + f * (b + 0.2), WH + 5.0), (cx - b, cy + f * (b + 0.2), WH + 5.0), (cx, cy + f * (b + 0.2), WH + 5.9)][::(1 if f > 0 else -1)])
    gra.prism(cx, cy, 1.6, WH + 5.0, WH + 5.6, 16, cap=False)
    gra.pyramid(cx, cy, WH + 5.6, 1.7, 1.7, WH + 7.4, sides=16, rot=0)
    gra.prism(cx, cy, 0.18, WH + 7.4, WH + 8.3, 8)

# ---- north return (two storeys, hipped slate) and the south range along St John's Road West (arcaded, one storey)
gra.box(-D - 18, -D, HW + 2, HW + WHW, 0, 10.0, top=False)
sla.pyramid(-D - 9, HW + 2 + (WHW - 2) / 2, 10.0, 9, (WHW - 2) / 2, 13.0)
gra.box(-D - 60, -D, -HW - WHW, -HW - WHW + 7, 0, 6.5)
for k in range(12):
    x = -D - 3 - k * 4.8
    dec.on('arcade', 'y', -HW - WHW, -1, x - 2.0, x + 2.0, 0.0, 5.2)
    gra.box(x - 0.3, x + 0.3, -HW - WHW + 3.5, -HW - WHW + 4.1, 6.5, 8.0)  # chimneys

# ---- the train shed: red-brick perimeter walls with a blind arcade, three long piles of corrugated iron with
# glazed ridge strips (shortened hardest: it runs ~200 m west in reality)
SX0, SX1, SY = -D - 2, -D - 170, HW + WHW - 2
bri.box(SX1, SX0, -SY + 7, SY - 7, 0, 8.0, top=False)
for s in (-1, 1):
    for k in range(20):
        x = SX0 - 4 - k * 8.2
        if x < SX1 + 3:
            break
        dec.on('round', 'y', s * (SY - 7), s, x - 1.4, x + 1.4, 1.0, 6.0)
pile = (2 * SY - 14) / 3
for k in range(3):
    y0 = -SY + 7 + k * pile
    roo.gable_x(SX1, SX0, y0, y0 + pile, 8.0, 13.5)
    gla.box(SX1, SX0, y0 + pile / 2 - 1.6, y0 + pile / 2 + 1.6, 13.0, 13.7)
    bri.gable_end_x(SX1, y0, y0 + pile, 8.0, 13.5, -1)

objs = [gra.build(M['granite']), sla.build(M['slate']), bri.build(M['brick']), roo.build(M['roof']), gla.build(M['glass']), dec.build(M['decal'])]
kit.finish(objs, (0.6, 0.5), 0.85)
kit.bake_ao_vertex(objs)
root = bpy.data.objects.new('station', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs))
kit.export(os.path.join(OUT, 'heuston.glb'), os.path.join(SRC, 'heuston.blend'))
print('DONE')

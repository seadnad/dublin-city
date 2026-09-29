"""3Arena (the Point Depot, 1878; rebuilt as The O2 by HOK Sport, 2008): the retained railway goods-shed front block on
North Wall Quay, its rock-faced limestone east wall and triple-gabled north end, and the silver-clad 2008 hall that
rises out of and behind them, with the rooftop 3Arena sign.

Run headless:  blender -b --factory-startup -P tools/blender/build_threearena.py -- public/models models

Sources: docs/research/three-arena.md (NIAH 50011169, refs/three-arena/*). Built straight in game metres: the plan is
the half-scale OSM footprint widened a little east-west so the arcade keeps its proportions (the whole building is
44 m along the quay, 54 m deep), heights are about 0.72 of real (the front block's parapet at 10.8 m, the hall at 23.5 m).

Axes: u (Blender X) east along the quay, v (Blender Y) north away from it, z up. Origin: the middle of the front on the
quay, at ground level. The front block runs u -13.5 .. 21.5 and v 0 .. 8; the 2008 west wing u -22.5 .. -13.5 comes
down to the ground, set back to v 5; the old shed walls run back to the triple gables at v 54.

Materials (painted and set up at load in src/world/heroes.js, placeThreeArena):
  ta_lime   smooth limestone ashlar (ground floor, cornices, piers)   ta_brick  red brick in Flemish bond (first floor)
  ta_rock   rock-faced coursed limestone (east wall, gables)          ta_slate  slate roofs
  ta_clad   the 2008 hall's silver cladding with the pixel mesh panels (LED at night)
  ta_metal  flat roofs, sign frame, railings' posts                   ta_pave   forecourt and the rear plaza
  ta_dec    atlas (TA_ATLAS, 1024 x 1024): glazing, doors, windows, signs, railings - cut out, lit at night
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Atlas, WF, rect, block, arc_pts, opening, band, extrude_profile

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)

# atlas regions, px in 1024 x 1024 (must match TA_ATLAS in src/world/heroes.js)
TA_ATLAS = dict(
    arch=(0, 0, 256, 256), door=(256, 0, 128, 256), side=(384, 0, 64, 128), win=(448, 0, 128, 256),
    seg=(576, 0, 128, 128), segdoor=(704, 0, 128, 256), oculus=(832, 0, 128, 128),
    garch=(0, 256, 256, 256), rail=(256, 256, 512, 128), entry=(768, 256, 256, 256),
    logo=(0, 512, 512, 256), word=(512, 512, 512, 128), badge=(512, 640, 256, 256), vent=(768, 640, 128, 256),
)

MAT = {n: kit.material('ta_' + n, c) for n, c in dict(lime=(0.55, 0.55, 0.52), brick=(0.5, 0.15, 0.08), rock=(0.2, 0.2, 0.19),
                                                     slate=(0.07, 0.08, 0.09), clad=(0.7, 0.72, 0.73), metal=(0.35, 0.37, 0.38),
                                                     pave=(0.45, 0.44, 0.42), dec=(1, 1, 1)).items()}
lime, brick, rock, slate, clad, metal, pave = (Part('ta_' + n) for n in ('lime', 'brick', 'rock', 'slate', 'clad', 'metal', 'pave'))
lime.tile, brick.tile, rock.tile, clad.tile, pave.tile = 4.0, 2.0, 4.0, 12.0, 4.0
dec = Atlas('ta_atlas', TA_ATLAS, 1024, 1024)   # object name ends in 'atlas': kept out of the AO bake

# ---------------- dimensions (game metres) ----------------
FU0, FU1, FD = -13.5, 21.5, 8.0          # front block: u range, depth
WU0 = -22.5                               # west wing's west face
WV0 = 5.0                                 # west wing's south face (set back from the quay front)
GF, GCOR, F1, FRZ, CORN, PAR = 5.0, 5.4, 9.0, 9.6, 10.0, 10.8   # ground floor, its cornice, brick top, frieze, cornice, parapet
RIDGE = 12.6
SV1 = 54.0                                # the north gables
EAVE, APEX = 7.5, 11.8                    # shed eaves and gable apex
BU1, BV0, BV1, BTOP = 19.5, 6.5, 50.0, 23.5   # the 2008 hall: east face, south face, north face, top
WTOP = 21.0                               # the west wing's top
front = WF(0, 0, 0, -1)                   # s = u
east = WF(FU1, 0, 1, 0)                   # s = v
north = WF(0, SV1, 0, 1)                  # s = -u
westw = WF(WU0, 0, -1, 0)                 # s = -v


def mark(what):
    print('MARK', what, sum(len(p.bm.faces) for p in (lime, brick, rock, slate, clad, metal, pave, dec)))


# =============== front block on the quay ===============
# ground floor: limestone ashlar, three sets of three arches with a doorcase between each set (NIAH 50011169)
BAYW, DOORW, MARG = 2.75, 4.2, 0.9
units = []
u = FU0 + MARG
for grp in range(3):
    for k in range(3):
        units.append(('arch', u, u + BAYW)); u += BAYW
    if grp < 2:
        units.append(('door', u, u + DOORW)); u += DOORW
rect(lime, front, FU0, FU0 + MARG, 0, GF)
rect(lime, front, u, FU1, 0, GF)
for kind, a, b in units:
    c = (a + b) / 2
    if kind == 'arch':
        ring = opening(lime, front, a, b, 0.0, GF, c, 2.3, 0.0, 3.05, segs=8, depth=0.45, back=('decal', dec, 'arch'))
        # moulded archivolt from impost to impost, and the impost blocks on the piers
        band(lime, front, arc_pts(c, 3.05, 1.15, 8), 0.28, 0.1)
        for sg in (-1, 1):
            block(lime, front, c + sg * 1.15 - 0.2, c + sg * 1.15 + 0.2, 2.85, 3.05, 0, 0.1, top=True, bottom=True)
    else:
        # round-headed door in a Doric doorcase, round-headed sidelights either side, a limestone perron in front
        rect(lime, front, a, c - 1.75, 0, GF)
        rect(lime, front, c + 1.75, b, 0, GF)
        for sg in (-1, 1):
            s0, s1 = (c - 1.75, c - 0.75) if sg < 0 else (c + 0.75, c + 1.75)
            opening(lime, front, s0, s1, 0.0, GF, (s0 + s1) / 2, 0.55, 1.1, 2.9, segs=5, depth=0.3, back=('decal', dec, 'side'))
        opening(lime, front, c - 0.75, c + 0.75, 0.0, GF, c, 1.1, 0.4, 2.9, segs=6, depth=0.35, back=('decal', dec, 'door'))
        for sg in (-1, 1):                                         # engaged Doric columns
            x = c + sg * 0.72
            kit.lathe(lime, x, -0.12, [(0.15, 0.4), (0.13, 3.35)], sides=6, a0=0, a1=-math.pi)
        block(lime, front, c - 0.95, c + 0.95, 3.35, 3.75, 0, 0.3, top=True, bottom=True)   # entablature
        block(lime, front, c - 1.1, c + 1.1, 3.75, 3.9, 0, 0.38, top=True, bottom=True)     # its cornice
        block(pave, front, c - 1.3, c + 1.3, 0, 0.4, 0, 1.0, top=True)                      # perron
# plinth, rusticated quoins at both ends, the deep ground-floor cornice
block(lime, front, FU0, FU1, 0, 0.35, 0, 0.08, top=True, sides=False)
for a, b in ((FU0, FU0 + 0.7), (FU1 - 0.7, FU1)):
    for k in range(7):
        z0 = k * GF / 7
        block(lime, front, a - (0.12 if k % 2 else 0), b + (0.12 if k % 2 else 0), z0 + 0.03, z0 + GF / 7 - 0.03, 0, 0.1, top=True, bottom=True)
extrude_profile(lime, [(FU0, 0.0), (FU1, 0.0)], [(0, GF),(0.12, GF + 0.1), (0.32, GF + 0.3), (0.32, GCOR), (0, GCOR)])
mark('ground floor')

# first floor: red brick in Flemish bond, sixteen windows with limestone sills
NW = 16
pitch = (FU1 - FU0) / NW
for k in range(NW):
    a = FU0 + k * pitch
    c = a + pitch / 2
    opening(brick, front, a, a + pitch, GCOR, F1, c, 1.0, 6.0, 7.9, segs=4, depth=0.25, rise=0.22, back=('decal', dec, 'win'))
    block(lime, front, c - 0.62, c + 0.62, 5.85, 6.0, 0, 0.12, top=True, bottom=True)
# limestone frieze and parapet cornice, brick parapet with a limestone coping
rect(lime, front, FU0, FU1, F1, FRZ, 0.04)
extrude_profile(lime, [(FU0, 0.0), (FU1, 0.0)], [(0, FRZ), (0.1, FRZ + 0.08), (0.36, CORN - 0.08), (0.36, CORN), (0, CORN)])
rect(brick, front, FU0, FU1, CORN, PAR)
block(lime, front, FU0 - 0.05, FU1 + 0.05, PAR, PAR + 0.16, -0.25, 0.08, top=True, bottom=True)
mark('first floor')

# returns: the east end of the front block is rock-faced limestone to a gable; the west end shows only above the wing
rock.facen([(FU1, 0, 0), (FU1, FD, 0), (FU1, FD, PAR), (FU1, 0, PAR)], (1, 0, 0))
rock.facen([(FU1, 0, PAR), (FU1, FD, PAR), (FU1, FD / 2, RIDGE)], (1, 0, 0))
brick.facen([(FU0, 0, GCOR), (FU0, 0, PAR), (FU0, WV0, PAR), (FU0, WV0, GCOR)], (-1, 0, 0))
lime.facen([(FU0, 0, 0), (FU0, 0, GCOR), (FU0, WV0, GCOR), (FU0, WV0, 0)], (-1, 0, 0))
# the pitched slate roof behind the parapet, and six red-brick chimneystacks with limestone caps on the ridge
slate.gable_x(FU0, FU1, 0.35, FD - 0.2, PAR - 0.3, RIDGE)
for k in range(6):
    cx = FU0 + 2.6 + k * (FU1 - FU0 - 5.2) / 5
    brick.box(cx - 0.45, cx + 0.45, FD / 2 - 0.6, FD / 2 + 0.6, RIDGE - 1.0, RIDGE + 1.3, top=False)
    lime.box(cx - 0.55, cx + 0.55, FD / 2 - 0.7, FD / 2 + 0.7, RIDGE + 1.3, RIDGE + 1.5)
    metal.box(cx - 0.18, cx + 0.18, FD / 2 - 0.18, FD / 2 + 0.18, RIDGE + 1.5, RIDGE + 1.9)
mark('front block')

# =============== east wall (East Wall Road): rock-faced limestone, sixteen bays ===============
rect(rock, east, FD, SV1, 0, EAVE)
# ground floor: segmental-headed doors in red brick; above them segmental windows (decals with their brick surrounds)
NB = 13
epitch = (SV1 - FD - 1.0) / NB
for k in range(NB):
    c = FD + 0.5 + (k + 0.5) * epitch
    if k == NB // 2:   # the tripartite opening: an iron beam on two cast-iron columns, glazed
        dec.wall('entry', east, c - 1.6, c + 1.6, 0.0, 3.4, d=0.03)
    else:
        dec.wall('segdoor', east, c - 0.75, c + 0.75, 0.0, 3.3, d=0.03)
    dec.wall('seg', east, c - 0.7, c + 0.7, 4.3, 6.2, d=0.03)
# brick eaves course and the strip of old shed roof left between the wall and the hall
block(brick, east, FD, SV1, EAVE - 0.3, EAVE, 0, 0.12, top=True, sides=True)
slate.facen([(FU1, FD, EAVE), (FU1, SV1, EAVE), (BU1, SV1 - 4, EAVE + 1.4), (BU1, FD, EAVE + 1.4)], (1, 0, 1))
mark('east wall')

# =============== the triple-gabled north end, onto the plaza and the Luas ===============
GW = (FU1 - FU0) / 3
for k in range(3):
    g0 = FU0 + k * GW                     # u range of this gable
    g1, gm = g0 + GW, g0 + GW / 2
    rock.facen([(g0, SV1, 0), (g1, SV1, 0), (g1, SV1, EAVE), (g0, SV1, EAVE)], (0, 1, 0))
    rock.facen([(g0, SV1, EAVE), (g1, SV1, EAVE), (gm, SV1, APEX)], (0, 1, 0))
    # limestone coping up the verges, a short metal roof back to the hall
    band(lime, north, [(-g1 - 0.05, EAVE - 0.05), (-gm, APEX), (-g0 + 0.05, EAVE - 0.05)], 0.3, 0.15)
    metal.gable_y(g0, g1, BV1, SV1, EAVE, APEX)
    rock.facen([(g0, BV1, EAVE), (g1, BV1, EAVE), (gm, BV1, APEX)], (0, -1, 0))
    # an arcade of three arches in smooth limestone, windows either side, an oculus in the apex
    for j in (-1, 0, 1):
        a = gm + j * 2.3
        dec.wall('garch', north, -a - 1.05, -a + 1.05, 0.0, 3.6, d=0.03)
    for j in (-1, 1):
        dec.wall('seg', north, -(gm + j * 4.6) - 0.55, -(gm + j * 4.6) + 0.55, 1.2, 2.9, d=0.03)
        dec.wall('seg', north, -(gm + j * 2.3) - 0.55, -(gm + j * 2.3) + 0.55, 4.5, 6.3, d=0.03)
    dec.wall('oculus', north, -gm - 0.55, -gm + 0.55, 8.6, 9.7, d=0.03)
# the 3Arena roundel on the middle gable
dec.wall('badge', north, -(FU0 + 1.5 * GW) - 1.4, -(FU0 + 1.5 * GW) + 1.4, 5.0, 7.8, d=0.06)
mark('north gables')

# =============== the 2008 hall ===============
# main volume over the old shed: south face behind the front block's ridge, east face set back from the old wall
def cladbox(u0, u1, v0, v1, z0, z1, faces=('s', 'e', 'n', 'w'), top=True):
    if 's' in faces: clad.facen([(u0, v0, z0), (u1, v0, z0), (u1, v0, z1), (u0, v0, z1)], (0, -1, 0))
    if 'n' in faces: clad.facen([(u1, v1, z0), (u0, v1, z0), (u0, v1, z1), (u1, v1, z1)], (0, 1, 0))
    if 'e' in faces: clad.facen([(u1, v0, z0), (u1, v1, z0), (u1, v1, z1), (u1, v0, z1)], (1, 0, 0))
    if 'w' in faces: clad.facen([(u0, v1, z0), (u0, v0, z0), (u0, v0, z1), (u0, v1, z1)], (-1, 0, 0))
    if top: metal.facen([(u0, v0, z1), (u1, v0, z1), (u1, v1, z1), (u0, v1, z1)], (0, 0, 1))


cladbox(FU0, BU1, BV0, BV1, EAVE, BTOP, faces=('s', 'e', 'n'))
clad.facen([(FU0, BV1, WTOP), (FU0, BV0, WTOP), (FU0, BV0, BTOP), (FU0, BV1, BTOP)], (-1, 0, 0))   # the step down to the wing
# a darker, deeper upper band on the south face (the lit glazed strip in the night photos), and a coping
block(metal, front, FU0, BU1, BTOP, BTOP + 0.35, -BV0 - 0.15, -BV0 + 0.1, top=True, bottom=True)
# west wing: down to the ground, a glazed entrance at its foot facing the quay
cladbox(WU0, FU0, WV0, SV1, 4.2, WTOP, faces=('s', 'w'))
cladbox(WU0, FU0, WV0, SV1, 0.0, WTOP, faces=('n',))
clad.facen([(WU0, SV1, 0), (WU0, WV0, 0), (WU0, WV0, 4.2), (WU0, SV1, 4.2)], (-1, 0, 0))
metal.facen([(WU0, WV0, WTOP), (FU0, WV0, WTOP), (FU0, SV1, WTOP), (WU0, SV1, WTOP)], (0, 0, 1))
for k in range(3):
    a = WU0 + 0.3 + k * (FU0 - WU0 - 0.6) / 3
    dec.wall('entry', front, a, a + (FU0 - WU0 - 0.6) / 3, 0.0, 4.2, d=-WV0 + 0.02)
block(metal, front, WU0 - 0.2, FU0, 4.2, 4.55, -WV0, -WV0 + 2.2, top=True, bottom=True)   # canopy
# ventilation louvres on the west face and the wing's south face (the grey panels in refs 06 and 12)
for v in (14.0, 30.0, 44.0):
    dec.wall('vent', westw, -v - 1.2, -v + 1.2, 6.0, 12.0, d=0.04)
mark('hall')

# signs: 3Arena on a steel frame on the hall's front edge, the wordmark high on the wing's south face
SX, SW_, SZ = -3.0, 8.4, BTOP + 0.3
for x in (SX - 3.0, SX + 3.0):
    metal.box(x - 0.12, x + 0.12, BV0 + 1.0, BV0 + 1.24, BTOP, SZ + 1.2)
    metal.box(x - 0.1, x + 0.1, BV0 + 1.2, BV0 + 3.2, BTOP, BTOP + 0.2)
metal.box(SX - 3.4, SX + 3.4, BV0 + 1.0, BV0 + 1.2, SZ + 1.0, SZ + 1.2)
dec.facen([(SX - SW_ / 2, BV0 + 0.95, SZ + 0.6), (SX + SW_ / 2, BV0 + 0.95, SZ + 0.6), (SX + SW_ / 2, BV0 + 0.95, SZ + 5.3), (SX - SW_ / 2, BV0 + 0.95, SZ + 5.3)],
          (0, -1, 0), [dec.tc('logo', 0, 1), dec.tc('logo', 1, 1), dec.tc('logo', 1, 0), dec.tc('logo', 0, 0)])
dec.wall('word', front, WU0 + 0.8, FU0 - 0.8, 15.0, 17.0, d=-WV0 + 0.05)
mark('signs')

# =============== forecourt: paving, six rusticated limestone piers, railings ===============
FC = 2.2
pave.facen([(FU0, -FC, 0.15), (FU1, -FC, 0.15), (FU1, 0, 0.15), (FU0, 0, 0.15)], (0, 0, 1))
PIERS = [FU0 + 0.5, FU0 + 9.1, 0.0 + 1.5, 7.0, 14.0, FU1 - 0.5]
for p in PIERS:
    lime.box(p - 0.45, p + 0.45, -FC, -FC + 0.9, 0.0, 2.3)
    lime.box(p - 0.55, p + 0.55, -FC - 0.1, -FC + 1.0, 2.3, 2.55)
    kit.lathe(lime, p, -FC + 0.45, [(0.5, 2.55), (0.15, 2.85)], sides=4, a0=math.pi / 4, a1=math.pi / 4 + math.tau)
ps = sorted(PIERS)
for a, b in zip(ps, ps[1:]):
    dec.facen([(a + 0.45, -FC + 0.45, 0.05), (b - 0.45, -FC + 0.45, 0.05), (b - 0.45, -FC + 0.45, 2.0), (a + 0.45, -FC + 0.45, 2.0)], (0, -1, 0),
              [dec.tc('rail', 0, 1), dec.tc('rail', 1, 1), dec.tc('rail', 1, 0), dec.tc('rail', 0, 0)])
# the rear plaza (Point Village): paving out to the Luas
pave.facen([(WU0, SV1, 0.15), (FU1, SV1, 0.15), (FU1, SV1 + 5.0, 0.15), (WU0, SV1 + 5.0, 0.15)], (0, 0, 1))
mark('forecourt')

# =============== finish ===============
parts = [(lime, 'lime'), (brick, 'brick'), (rock, 'rock'), (slate, 'slate'), (clad, 'clad'), (metal, 'metal'), (pave, 'pave'), (dec, 'dec')]
objs = [p.build(MAT[m]) for p, m in parts]
print('TRIANGLES before AO', kit.tris(objs))
kit.bake_ao_vertex(objs, distance=1.6, samples=24, cell=3.5, passes=1, skip=[o for o in objs if o.name in ('ta_clad', 'ta_pave')])
root = bpy.data.objects.new('threearena', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs), {o.name: kit.tris([o]) for o in objs})
kit.export(os.path.join(OUT, 'threearena.glb'), os.path.join(SRC, 'threearena.blend'))
print('DONE')

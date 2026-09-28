"""St Patrick's Cathedral: Early English Gothic, Minot's Tower and Semple's granite spire at the NW corner.

Run headless:  blender -b --factory-startup -P tools/blender/build_stpatricks.py -- public/models models

Sources: docs/research/st-patricks.md - OSM building parts (nave 46 x 11.8 m at 16.7 m, aisles 6.6 m, transepts 11 m
wide across 46.5 m, choir 24.5 m, Lady Chapel 13.2 m; tower 12.2 x 12.4 m, parapet 40 m, turrets 43 m, spire to 66 m),
NIAH 50080680, and the reference photos (west front triple lancet and blue door, pinnacled flying buttresses, pale
quoins on dark calp rubble, crenellated gables with corner turrets, clocks on the W and N tower faces).
Built at real size, scaled 0.56 east-west and 0.52 north-south to fit the half-scale block; heights stay real.
Origin: the west front on the nave axis, +X east, +Y north.
Materials: sp_rubble, sp_ashlar, sp_slate, sp_granite (spire), sp_door (blue), sp_decal (shared stone atlas)
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Decals

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)
M = dict(rubble=kit.material('sp_rubble', (0.17, 0.16, 0.15)), ashlar=kit.material('sp_ashlar', (0.43, 0.41, 0.38)),
         slate=kit.material('sp_slate', (0.08, 0.09, 0.1)), granite=kit.material('sp_granite', (0.39, 0.37, 0.34)),
         door=kit.material('sp_door', (0.03, 0.05, 0.3)), decal=kit.material('sp_decal', (1, 1, 1)))

rub, ash, sla, gra, door, dec = (Part('sp_' + n) for n in ('rubble', 'ashlar', 'slate', 'granite', 'door')), None, None, None, None, None
rub, ash, sla, gra, door = Part('stp_rubble'), Part('stp_ashlar'), Part('stp_slate'), Part('stp_granite'), Part('stp_door')
dec = Decals('stp_decal')

NW, AW, WALL, RIDGE = 5.9, 12.5, 16.7, 22.5
X_T0, X_T1, X_C1, X_L1, TY = 43.0, 54.0, 78.0, 90.7, 23.25


def quoins(x, y0, y1, z1, sx, sy):
    """pale ashlar strips on a corner (the striped edge effect against the dark rubble)"""
    ash.box(x - 0.35, x + 0.35, y0 - 0.35, y0 + 0.35, 0, z1)


# ---- nave with lean-to aisles, clerestory, pinnacled flying buttresses
rub.box(0, X_T0, -NW, NW, 0, WALL, top=False)
sla.gable_x(0, X_T0, -NW - 0.3, NW + 0.3, WALL, RIDGE)
for s in (-1, 1):
    y0, y1 = (NW, AW) if s > 0 else (-AW, -NW)
    rub.box(12.3 if s > 0 else 0, X_T0, y0, y1, 0, 9.5, top=False)
    sla.lean_to(12.3 if s > 0 else 0, X_T0, s * AW, s * NW, 9.5, 12.0)
    ash.crenellate([(12.5 if s > 0 else 0.3, s * AW), (X_T0 - 0.3, s * AW)], 9.5, h=0.6)
    ash.crenellate([(0.3, s * NW), (X_T0 - 0.3, s * NW)], WALL, h=0.8)
    for k in range(7):
        x = 3.0 + k * 6.0
        if not (s > 0 and x < 12.5):
            dec.on('lancet', 'y', s * AW, s, x - 0.9, x + 0.9, 2.6, 8.2)
        dec.on('lancet', 'y', s * NW, s, x - 0.7, x + 0.7, 12.6, 15.8)
        bx = x + 3.0
        if bx < X_T0 - 1 and not (s > 0 and bx < 13):
            ash.box(bx - 0.5, bx + 0.5, min(s * AW, s * (AW + 1.0)), max(s * AW, s * (AW + 1.0)), 0, 12.0)
            ash.pyramid(bx, s * (AW + 0.5), 12.0, 0.5, 0.5, 14.8)
            ash.quad((bx - 0.25, s * AW, 11.0), (bx + 0.25, s * AW, 11.0), (bx + 0.25, s * NW, 14.8), (bx - 0.25, s * NW, 14.8))
            ash.quad((bx + 0.25, s * AW, 11.8), (bx - 0.25, s * AW, 11.8), (bx - 0.25, s * NW, 15.6), (bx + 0.25, s * NW, 15.6))

# ---- west front: crenellated screen with corner turrets over a gabled centre, the big triple lancet, the blue door
rub.gable_end_x(0, -NW, NW, WALL, RIDGE, -1)
ash.crenellate([(0, -NW), (0, NW)], WALL, h=1.0, t=0.6)
dec.on('lancet3', 'x', 0, -1, -4.6, 4.6, 7.2, 15.6)
door.box(-0.35, 0.05, -1.5, 1.5, 0, 5.0)
ash.box(-0.6, -0.3, -2.3, 2.3, 0, 0.4); ash.box(-0.6, -0.3, -2.3, -1.7, 0, 5.6); ash.box(-0.6, -0.3, 1.7, 2.3, 0, 5.6)
ash.box(-0.6, -0.3, -2.3, 2.3, 5.2, 6.4)
for y in (-NW, NW):
    ash.box(-0.8, 0.8, y - 0.8, y + 0.8, 0, WALL + 2.5)
    ash.pyramid(0, y, WALL + 2.5, 0.8, 0.8, WALL + 4.5)
dec.on('lancet', 'x', 0, -1, -AW + 2.5, -AW + 5.0, 2.4, 8.4)
quoins(0, -AW, -AW, 9.5, -1, -1)

# ---- transepts: triple-lancet gables with crenellated corner turrets
for s in (-1, 1):
    y0, y1 = (AW, TY) if s > 0 else (-TY, -AW)
    rub.box(X_T0, X_T1, y0, y1, 0, WALL, top=False)
    sla.gable_y(X_T0 - 0.3, X_T1 + 0.3, y0, y1, WALL, RIDGE)
    ye = s * TY
    rub.gable_end_y(ye, X_T0, X_T1, WALL, RIDGE, s)
    dec.on('lancet3', 'y', ye, s, X_T0 + 1.2, X_T1 - 1.2, 5.0, 14.5)
    dec.on('lancet', 'y', ye, s, (X_T0 + X_T1) / 2 - 0.8, (X_T0 + X_T1) / 2 + 0.8, 16.5, 20.5)
    for x in (X_T0, X_T1):
        ash.box(x - 0.9, x + 0.9, ye - s * 1.8, ye, 0, WALL + 3.0) if s > 0 else ash.box(x - 0.9, x + 0.9, ye, ye + 1.8, 0, WALL + 3.0)
        ash.crenellate([(x - 0.9, ye - s * 0.9), (x + 0.9, ye - s * 0.9)], WALL + 3.0, h=0.6, t=1.6, merlon=0.5, gap=0.4)

# ---- choir with aisles, pinnacles, and the lower Lady Chapel at the east end
rub.box(X_T1, X_C1, -5.55, 5.55, 0, WALL, top=False)
sla.gable_x(X_T1, X_C1, -5.85, 5.85, WALL, RIDGE - 0.5)
for s in (-1, 1):
    rub.box(X_T1, X_C1, min(s * 5.55, s * 11.0), max(s * 5.55, s * 11.0), 0, 9.0, top=False)
    sla.lean_to(X_T1, X_C1, s * 11.0, s * 5.55, 9.0, 11.5)
    ash.crenellate([(X_T1 + 0.3, s * 5.55), (X_C1 - 0.3, s * 5.55)], WALL, h=0.7)
    for x in (58.0, 64.0, 70.0, 76.0):
        dec.on('lancet', 'y', s * 11.0, s, x - 0.8, x + 0.8, 2.6, 7.6)
        dec.on('lancet', 'y', s * 5.55, s, x - 0.6, x + 0.6, 12.2, 15.6)
        ash.box(x + 2.4, x + 3.4, min(s * 11, s * 11.9), max(s * 11, s * 11.9), 0, 11.0)
        ash.pyramid(x + 2.9, s * 11.45, 11.0, 0.45, 0.45, 13.8)
rub.box(X_C1, X_L1, -5.7, 5.7, 0, 12.0, top=False)
sla.gable_x(X_C1, X_L1, -6.0, 6.0, 12.0, 16.5)
rub.gable_end_x(X_L1, -5.7, 5.7, 12.0, 16.5, 1)
rub.gable_end_x(X_C1, -5.55, 5.55, WALL, RIDGE - 0.5, 1)
dec.on('lancet3', 'x', X_L1, 1, -3.6, 3.6, 3.0, 11.0)
for s in (-1, 1):
    for x in (81.0, 85.0, 89.0):
        dec.on('lancet', 'y', s * 5.7, s, x - 0.7, x + 0.7, 3.0, 9.5)
    ash.box(X_L1 - 0.9, X_L1 + 0.5, s * 5.7 - 0.7, s * 5.7 + 0.7, 0, 13.5)
    ash.pyramid(X_L1 - 0.2, s * 5.7, 13.5, 0.7, 0.7, 16.5)

# ---- Minot's Tower (NW corner): five stages, paired louvred belfry lancets, clocks W and N, crenellated parapet
# with four taller crenellated corner turrets; Semple's octagonal granite spire rising inside the parapet
tx0, tx1, ty0, ty1 = 0.0, 12.2, NW + 0.1, NW + 12.5
tcx, tcy = (tx0 + tx1) / 2, (ty0 + ty1) / 2
rub.box(tx0, tx1, ty0, ty1, 0, 40.0, top=False)
for z in (9.5, 17.0, 24.5, 32.0):
    ash.box(tx0 - 0.2, tx1 + 0.2, ty0 - 0.2, ty1 + 0.2, z, z + 0.35, top=True)
for axis, c, f, u0, u1 in (('x', tx0, -1, ty0, ty1), ('y', ty1, 1, tx0, tx1), ('x', tx1, 1, ty0, ty1), ('y', ty0, -1, tx0, tx1)):
    m = (u0 + u1) / 2
    for du in (-1.8, 1.8):
        dec.on('louvre', axis, c, f, m + du - 0.9, m + du + 0.9, 33.0, 39.0)
    if (axis, f) in (('x', -1), ('y', 1)):
        dec.on('clock', axis, c, f, m - 1.25, m + 1.25, 26.2, 28.7)
    dec.on('lancet', axis, c, f, m - 0.7, m + 0.7, 18.0, 23.0)
ash.box(tx0 - 0.3, tx1 + 0.3, ty0 - 0.3, ty1 + 0.3, 39.4, 40.0)
ash.crenellate([(tx0, ty0), (tx1, ty0), (tx1, ty1), (tx0, ty1), (tx0, ty0)], 40.0, h=1.0, t=0.6)
for cx, cy in ((tx0, ty0), (tx1, ty0), (tx1, ty1), (tx0, ty1)):
    ash.box(cx - 1.1, cx + 1.1, cy - 1.1, cy + 1.1, 36.0, 42.2)
    ash.crenellate([(cx - 1.1, cy - 1.1), (cx + 1.1, cy - 1.1), (cx + 1.1, cy + 1.1), (cx - 1.1, cy + 1.1), (cx - 1.1, cy - 1.1)], 42.2, h=0.8, t=0.4, merlon=0.6, gap=0.4)
gra.prism(tcx, tcy, 3.4, 40.0, 41.5, 8, cap=False)
gra.pyramid(tcx, tcy, 41.5, 3.3, 3.3, 66.0, sides=8, rot=math.pi / 8)
ash.box(tcx - 0.1, tcx + 0.1, tcy - 0.1, tcy + 0.1, 66.0, 68.2)
ash.box(tcx - 0.55, tcx + 0.55, tcy - 0.07, tcy + 0.07, 67.2, 67.4)

objs = [rub.build(M['rubble']), ash.build(M['ashlar']), sla.build(M['slate']), gra.build(M['granite']), door.build(M['door']), dec.build(M['decal'])]
kit.finish(objs, (0.56, 0.52), 1.0)
kit.bake_ao_vertex(objs)
root = bpy.data.objects.new('cathedral', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs))
kit.export(os.path.join(OUT, 'stpatricks.glb'), os.path.join(SRC, 'stpatricks.blend'))
print('DONE')

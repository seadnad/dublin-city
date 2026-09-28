"""Christ Church Cathedral, the Synod Hall (Dublinia) and the covered bridge between them.

Run headless:  blender -b --factory-startup -P tools/blender/build_christchurch.py -- public/models models

Sources: docs/research/christ-church.md (OSM building parts, NIAH, photos). Built at real size, then the
cathedral and Synod Hall are scaled 0.6 in plan and 0.85 in height to fit the half-scale precinct (the brief's
placement compromise); the bridge keeps real heights (buses pass under it) and is 1 m long in X so the game
stretches it to whatever gap the road leaves.

Objects (each with its own origin, exported in one GLB):
  cathedral  origin at the west front on the nave axis; +X east along the nave, +Y north
  synod      origin at the middle of its east face (the face on Winetavern St)
  bridge     origin at mid-span, underside at z 5; X from -0.5 to 0.5 (stretched in game), Y across
Materials: cc_rubble (calp limestone), cc_ashlar (dressings, quoins, parapets), cc_slate (green-grey roofs),
cc_synod (the Synod Hall's rusticated limestone), cc_decal (atlas: lancets, roses, louvres, doors), cc_dark
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Decals

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)
M = dict(rubble=kit.material('cc_rubble', (0.16, 0.15, 0.15)), ashlar=kit.material('cc_ashlar', (0.45, 0.4, 0.33)),
         slate=kit.material('cc_slate', (0.14, 0.15, 0.13)), synod=kit.material('cc_synod', (0.27, 0.25, 0.22)),
         decal=kit.material('cc_decal', (1, 1, 1)), dark=kit.material('cc_dark', (0.02, 0.02, 0.02)))


def cathedral():
    rub, ash, sla, dec = Part('cathedral_rubble'), Part('cathedral_ashlar'), Part('cathedral_slate'), Decals('cathedral_decal')
    NW, AW = 6.5, 11.5          # nave half-width, aisle outer half-width
    NL = 31.0                   # nave length (west front x=0 to the crossing)
    TX0, TX1, TY = 31.0, 41.0, 15.5   # transepts
    CX1 = 53.0                  # choir east wall (shortened for the compressed block)
    # ---- nave, aisles, clerestory
    rub.box(0, NL, -NW, NW, 0, 13.5, top=False)
    sla.gable_x(0, NL, -NW - 0.3, NW + 0.3, 13.5, 18.0)
    for s in (-1, 1):
        y0, y1 = (NW, AW) if s > 0 else (-AW, -NW)
        rub.box(0, NL, y0, y1, 0, 9.0, top=False)
        sla.lean_to(0, NL, s * AW, s * NW, 9.0, 11.0)
        ash.crenellate([(0.3, s * AW), (NL - 0.3, s * AW)], 9.0, h=0.6)
        ash.crenellate([(0.3, s * NW), (NL - 0.3, s * NW)], 13.5, h=0.7)
        # six bays: aisle lancets, clerestory lancets, and a flying buttress per bay
        for k in range(6):
            x = 2.6 + k * 5.0
            dec.on('lancet', 'y', s * AW, s, x - 0.7, x + 0.7, 2.5, 7.3)
            dec.on('lancet', 'y', s * NW, s, x - 0.55, x + 0.55, 11.1, 13.1)
            bx = x + 2.5
            if bx < NL - 1:
                ash.box(bx - 0.45, bx + 0.45, s * AW - (0.9 if s > 0 else 0), s * AW + (0 if s > 0 else 0.9), 0, 11.0)  # pier
                ash.pyramid(bx, s * (AW + 0.45) - s * 0.45, 11.0, 0.45, 0.45, 12.6)                              # pinnacle
                # the flyer: a slab leaning from the pier head to the clerestory wall
                y_out, y_in = s * AW, s * NW
                ash.quad((bx - 0.25, y_out, 10.2), (bx + 0.25, y_out, 10.2), (bx + 0.25, y_in, 12.2), (bx - 0.25, y_in, 12.2))
                ash.quad((bx + 0.25, y_out, 10.9), (bx - 0.25, y_out, 10.9), (bx - 0.25, y_in, 12.9), (bx + 0.25, y_in, 12.9))
    # ---- west front: gable with the rose, the stepped five-lancet group, the double portal, two octagonal turrets
    rub.gable_end_x(0, -NW, NW, 13.5, 18.0, -1)
    dec.on('rose', 'x', 0, -1, -2.2, 2.2, 13.6, 17.4)
    dec.on('lancet3', 'x', 0, -1, -4.4, 4.4, 6.2, 12.6)
    dec.on('portal', 'x', 0, -1, -2.4, 2.4, 0, 5.6)
    for s in (-1, 1):
        rub.prism(-0.2, s * (NW + 0.4), 1.5, 0, 17.0, 8, cap=False)
        ash.crenellate([(-1.7, s * (NW + 0.4)), (1.3, s * (NW + 0.4))], 17.0, h=0.5, t=0.5)
        sla.pyramid(-0.2, s * (NW + 0.4), 17.0, 1.55, 1.55, 21.5, sides=8, rot=0)
        dec.on('lancet', 'x', 0, -1, s * AW - s * 2.6 - 0.8, s * AW - s * 2.6 + 0.8, 2.2, 6.6)
    # ---- the SW link block the bridge lands on (low, gabled, with oculi)
    rub.box(0, 9, -22.5, -AW, 0, 9.0, top=False)
    sla.gable_x(0, 9, -22.8, -AW + 0.3, 9.0, 12.0)
    rub.gable_end_x(0, -22.5, -AW, 9.0, 12.0, -1); rub.gable_end_x(9, -22.5, -AW, 9.0, 12.0, 1)
    for x in (2.0, 5.0, 8.0):
        dec.on('oculus', 'y', -22.5, -1, x - 0.6, x + 0.6, 6.0, 7.2)
    # ---- transepts, Romanesque: round-headed windows in two tiers, a rose in each gable, a stair turret (south)
    for s in (-1, 1):
        y0, y1 = (AW, TY) if s > 0 else (-TY, -AW)
        rub.box(TX0, TX1, y0, y1, 0, 14.0, top=False)
        sla.gable_y(TX0 - 0.3, TX1 + 0.3, y0, y1, 14.0, 18.5)
        ye = s * TY
        rub.gable_end_y(ye, TX0, TX1, 14.0, 18.5, s)
        dec.on('rose', 'y', ye, s, 34.2, 37.8, 13.2, 16.8)
        for x in (33.0, 36.0, 39.0):
            dec.on('round', 'y', ye, s, x - 0.6, x + 0.6, 2.0, 5.0)
            dec.on('round', 'y', ye, s, x - 0.6, x + 0.6, 7.0, 10.6)
        ash.crenellate([(TX0 + 0.2, ye), (TX1 - 0.2, ye)], 14.0, h=0.6)
    rub.prism(TX1 + 0.6, -TY + 0.6, 1.3, 0, 20.0, 8, cap=False)
    sla.pyramid(TX1 + 0.6, -TY + 0.6, 20.0, 1.35, 1.35, 24.0, sides=8, rot=0)
    # ---- choir and east end: gabled choir, a polygonal apse of chapels with crenellated parapets
    rub.box(TX1, CX1, -7.0, 7.0, 0, 12.0, top=False)
    sla.gable_x(TX1, CX1, -7.3, 7.3, 12.0, 16.0)
    ash.crenellate([(TX1 + 0.3, -7.0), (CX1, -7.0)], 12.0, h=0.6)
    ash.crenellate([(TX1 + 0.3, 7.0), (CX1, 7.0)], 12.0, h=0.6)
    rub.prism(CX1, 0, 7.0, 0, 11.0, 8, cap=False)
    sla.pyramid(CX1, 0, 11.0, 7.1, 7.1, 14.5, sides=8, rot=0)
    for k in range(-2, 3):
        a = k * math.pi / 8
        x, y = CX1 + math.cos(a) * 7.02, math.sin(a) * 7.02
        dec.free('lancet', (x - math.sin(a) * 0.55, y + math.cos(a) * 0.55 * -1 + 0, 3.0), (x + math.sin(a) * 0.55, y - math.cos(a) * 0.55 * -1, 3.0),
                 (x + math.sin(a) * 0.55, y - math.cos(a) * 0.55 * -1, 8.0), (x - math.sin(a) * 0.55, y + math.cos(a) * 0.55 * -1, 8.0))
    for s in (-1, 1):
        for x in (44.0, 48.0):
            dec.on('lancet', 'y', s * 7.0, s, x - 0.6, x + 0.6, 3.0, 8.5)
        rub.prism(CX1 - 1, s * 6.4, 1.2, 0, 15.5, 8, cap=False)
        sla.pyramid(CX1 - 1, s * 6.4, 15.5, 1.25, 1.25, 18.5, sides=8, rot=0)
    # ---- crossing tower: two stages of paired louvred belfry lancets, corbelled crenellated parapet with corner
    # turrets, and the green slate pyramid inside the parapet (the silhouette cue)
    tx0, tx1, ty = TX0, TX1, 4.5
    rub.box(tx0, tx1, -ty, ty, 0, 28.0, top=False)
    ash.box(tx0 - 0.25, tx1 + 0.25, -ty - 0.25, ty + 0.25, 27.2, 27.7, top=True)
    for s in (-1, 1):
        for u in (-1.6, 1.6):
            dec.on('louvre', 'y', s * ty, s, (tx0 + tx1) / 2 + u - 0.7, (tx0 + tx1) / 2 + u + 0.7, 20.0, 25.5)
            dec.on('louvre', 'x', tx0 if s < 0 else tx1, s, u - 0.7, u + 0.7, 20.0, 25.5)
    ring = [(tx0, -ty), (tx1, -ty), (tx1, ty), (tx0, ty), (tx0, -ty)]
    ash.crenellate(ring, 27.7, h=0.8, t=0.5)
    for cx, cy in ((tx0, -ty), (tx1, -ty), (tx1, ty), (tx0, ty)):
        ash.box(cx - 0.8, cx + 0.8, cy - 0.8, cy + 0.8, 26.5, 29.5)
        ash.crenellate([(cx - 0.8, cy - 0.8), (cx + 0.8, cy - 0.8), (cx + 0.8, cy + 0.8), (cx - 0.8, cy + 0.8), (cx - 0.8, cy - 0.8)], 29.5, h=0.5, t=0.3, merlon=0.5, gap=0.35)
    sla.pyramid((tx0 + tx1) / 2, 0, 27.7, 3.6, 3.3, 35.0)
    ash.box((tx0 + tx1) / 2 - 0.08, (tx0 + tx1) / 2 + 0.08, -0.08, 0.08, 35.0, 37.0)
    ash.box((tx0 + tx1) / 2 - 0.5, (tx0 + tx1) / 2 + 0.5, -0.06, 0.06, 36.2, 36.35)
    return [rub.build(M['rubble']), ash.build(M['ashlar']), sla.build(M['slate']), dec.build(M['decal'])]


def synod():
    # origin at the middle of the east face; the hall extends west (-X), 28 x 43 m
    wal, ash, sla, dec = Part('synod_wall'), Part('synod_ashlar'), Part('synod_slate'), Decals('synod_decal')
    W, H2 = 28.0, 21.5
    wal.box(-W, 0, -H2, H2, 0, 10.0, top=False)
    sla.gable_y(-W - 0.3, 0.3, -H2 - 0.3, H2 + 0.3, 10.0, 16.5)
    wal.gable_end_y(-H2, -W, 0, 10.0, 16.5, -1); wal.gable_end_y(H2, -W, 0, 10.0, 16.5, 1)
    # east breakfront with its gable and rose, gabled dormers either side, sash windows along the front
    wal.box(-1.0, 1.2, -6.0, 6.0, 0, 13.0, top=False)
    sla.gable_x(-1.0, 1.5, -6.3, 6.3, 13.0, 17.5)
    wal.gable_end_x(1.2, -6.0, 6.0, 13.0, 17.5, 1)
    dec.on('rose', 'x', 1.2, 1, -1.8, 1.8, 13.0, 16.4)
    dec.on('lancet3', 'x', 1.2, 1, -3.6, 3.6, 5.0, 11.0)
    for y in (-17, -12, 12, 17):
        dec.on('lancet', 'x', 0, 1, y - 0.7, y + 0.7, 2.5, 7.8)
        wal.box(-2.0, 0.2, y - 1.4, y + 1.4, 10.0, 12.6, top=False)
        sla.gable_x(-2.0, 0.5, y - 1.6, y + 1.6, 12.6, 14.2)
        wal.gable_end_x(0.2, y - 1.4, y + 1.4, 12.6, 14.2, 1)
    # the SE three-arch entrance arcade, cylindrical carved chimneys in pairs
    for k in range(3):
        dec.on('door', 'y', -H2, -1, -6.0 - k * 3.0, -3.6 - k * 3.0, 0, 4.2)
    for cx in (-9.0, -19.0):
        for dy in (-0.6, 0.6):
            ash.prism(cx, H2 - 3 + dy, 0.45, 14.0, 19.0, 8)
            ash.prism(cx, -H2 + 3 + dy, 0.45, 14.0, 19.0, 8)
    # St Michael's tower at the rear (west) centre: five stages, crenellated parapet with corner turrets, a steep
    # pyramid and a cross
    t0, t1 = -W - 3.7, -W + 3.7
    wal.box(t0, t1, -3.7, 3.7, 0, 24.0, top=False)
    for s in (-1, 1):
        dec.on('louvre', 'y', s * 3.7, s, -W - 0.8, -W + 0.8, 17.0, 22.0)
        dec.on('louvre', 'x', t0 if s < 0 else t1, s, -0.8, 0.8, 17.0, 22.0)
    dec.on('clock', 'x', t1, 1, -1.0, 1.0, 13.0, 15.0)
    ash.box(t0 - 0.2, t1 + 0.2, -3.9, 3.9, 23.6, 24.0)
    ash.crenellate([(t0, -3.7), (t1, -3.7), (t1, 3.7), (t0, 3.7), (t0, -3.7)], 24.0, h=0.7, t=0.45)
    for cx, cy in ((t0, -3.7), (t1, -3.7), (t1, 3.7), (t0, 3.7)):
        ash.box(cx - 0.6, cx + 0.6, cy - 0.6, cy + 0.6, 23.0, 25.6)
    sla.pyramid(-W, 0, 24.0, 3.0, 3.0, 32.0)
    ash.box(-W - 0.07, -W + 0.07, -0.07, 0.07, 32.0, 34.0)
    ash.box(-W - 0.45, -W + 0.45, -0.05, 0.05, 33.1, 33.25)
    return [wal.build(M['synod']), ash.build(M['ashlar']), sla.build(M['slate']), dec.build(M['decal'])]


def bridge():
    # built 18 m long (X from -9 to 9; the game rescales it to the gap), 5 m wide; underside 5 m, eaves 9 m, ridge
    # 10.5 m. An arcade of six pointed windows each side, a shallow arch beam under each face. No end caps: the ends
    # are buried in the Synod Hall and the cathedral's link block.
    wal, sla, dec = Part('bridge_wall'), Part('bridge_slate'), Decals('bridge_decal')
    hw, L = 2.5, 9.0
    for s in (-1, 1):
        y = s * hw
        q = [(-L, y, 5.0), (L, y, 5.0), (L, y, 9.0), (-L, y, 9.0)]
        wal.face(q if s < 0 else q[::-1])
        for k in range(6):
            x = -L + 1.5 + k * 3.0
            dec.on('lancet', 'y', y, s, x - 0.7, x + 0.7, 5.6, 8.6)
        # arch beam: deeper at the ends, springing down past the deck line
        for k in range(8):
            x0, x1 = -L + k * 2 * L / 8, -L + (k + 1) * 2 * L / 8
            d0, d1 = 1.2 * (abs(x0) / L) ** 2, 1.2 * (abs(x1) / L) ** 2
            q = [(x0, y, 5.0 - d0), (x1, y, 5.0 - d1), (x1, y, 5.0), (x0, y, 5.0)]
            wal.face(q if s < 0 else q[::-1])
    wal.face([(-L, hw, 5.0), (L, hw, 5.0), (L, -hw, 5.0), (-L, -hw, 5.0)])  # soffit
    sla.gable_x(-L, L, -hw - 0.3, hw + 0.3, 9.0, 10.6)
    return [wal.build(M['synod']), sla.build(M['slate']), dec.build(M['decal'])]


def group(name, objs):
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for o in objs:
        o.parent = root
    return root


cat = cathedral(); syn = synod(); br = bridge()
kit.finish(cat + syn, 0.6, 0.85)
kit.bake_ao_vertex(cat + syn + br)
group('cathedral', cat); group('synod', syn); group('bridge', br)
print('TRIANGLES', kit.tris(cat), kit.tris(syn), kit.tris(br))
kit.export(os.path.join(OUT, 'christchurch.glb'), os.path.join(SRC, 'christchurch.blend'))
print('DONE')

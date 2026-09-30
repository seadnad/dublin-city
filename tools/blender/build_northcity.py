"""North city heroes: Clerys (O'Connell St Lower), Parnell Square (the Rotunda Hospital, the Ambassador drum, the Gate
Theatre, the Garden of Remembrance with the Children of Lir) and Busaras (Store St / Beresford Place).

Run headless:  blender -b --factory-startup -P tools/blender/build_northcity.py -- public/models models

Sources: docs/research/north-city.md, refs/north-city/*, refs in docs/research/canal-north.md (Parnell Square).
Everything is built in game metres. Each building is its own root, built in its own front frame: u (Blender X) along
the front, v (Blender Y) into the building, z up, origin at the middle of the front at ground level (the Ambassador:
at the drum's centre, its frame turned with Parnell Street). src/world/sites.js (NC) places them; the shared numbers
are in src/data/northcity.json.

Materials (painted and set up at load in src/world/northcity.js):
  nc_stone    Portland-type ashlar (Clerys, Busaras' end walls)    nc_granite  Cassels' granite (Rotunda, Gate)
  nc_rustic   rusticated granite ground floors                     nc_render   the Ambassador's buff drum
  nc_brick    red brick (the Rotunda's rear ranges, Busaras' base) nc_slate    slate roofs
  nc_copper   verdigris (the cupola, the dome's rim, the canopy's top)
  nc_metal    flat roofs, frames, the clock's body, flagpoles      nc_pave     paving, steps, forecourts
  nc_lawn     the garden's lawns                                   nc_bronze   the Children of Lir
  nc_conc     Busaras' white concrete (the canopy, the slab's frame)
  nc_curtain  Busaras' curtain wall (glass, white bands, blue mosaic spandrels): 6.2 m tile, lit at night
  nc_atlas    atlas (NC_ATLAS, 1024 x 1024): windows, shopfronts, the clock, lettering, railings, balustrades, the
              swag frieze, the pool mosaic, the swans' wings, the flag - cut out, lit at night
"""
import bpy, math, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Atlas, WF, rect, block, arc_pts, opening, band, extrude_profile, hip

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
HERE = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(HERE, '..', '..', 'src', 'data', 'northcity.json'), encoding='utf8'))

bpy.ops.wm.read_factory_settings(use_empty=True)

# atlas regions, px in 1024 x 1024 (must match NC in src/world/northcity.js)
NC_ATLAS = dict(
    cwin=(0, 0, 128, 256), cshop=(128, 0, 256, 128), cdoor=(128, 128, 256, 128), cattic=(384, 0, 64, 64),
    cname=(448, 0, 256, 64), clock=(704, 0, 128, 128), balus=(384, 64, 256, 64), cside=(832, 0, 64, 128),
    sash=(0, 256, 64, 128), arch=(64, 256, 64, 128), gate=(128, 256, 256, 64), swag=(128, 320, 256, 64),
    blind=(384, 256, 64, 128), door=(448, 256, 64, 128), lamp=(512, 256, 64, 64), amb=(576, 256, 256, 64),
    rail=(0, 384, 512, 64), mosaic=(512, 384, 256, 256), wing=(768, 384, 256, 256),
    conc=(0, 448, 256, 256), tri=(256, 448, 256, 64), bname=(256, 512, 256, 64), marble=(256, 576, 256, 128),
    flag=(768, 640, 128, 64), wave=(896, 640, 128, 64), hwin=(0, 704, 128, 128),
)
MATS = dict(stone=(0.62, 0.6, 0.55), granite=(0.45, 0.43, 0.39), rustic=(0.4, 0.38, 0.35), render=(0.5, 0.45, 0.36),
            brick=(0.4, 0.14, 0.08), slate=(0.08, 0.09, 0.1), copper=(0.2, 0.4, 0.34), metal=(0.2, 0.21, 0.22),
            pave=(0.45, 0.44, 0.42), lawn=(0.1, 0.25, 0.06), bronze=(0.05, 0.06, 0.055), conc=(0.7, 0.7, 0.68),
            curtain=(0.3, 0.35, 0.4), dec=(1, 1, 1))
MAT = {n: kit.material('nc_' + n, c) for n, c in MATS.items()}
TILES = dict(stone=4.0, granite=4.0, rustic=3.0, render=4.0, brick=2.0, slate=4.0, copper=2.0, metal=4.0, pave=4.0,
             lawn=8.0, bronze=2.0, conc=4.0, curtain=6.2)


def parts(tag):
    """A fresh set of per-material accumulators for one root."""
    P = {}
    for n in MATS:
        if n == 'dec':
            P[n] = Atlas('%s_atlas' % tag, NC_ATLAS, 1024, 1024)
        else:
            P[n] = Part('%s_%s' % (tag, n), TILES[n])
    return P


def finish(tag, P, skip=('pave', 'lawn', 'curtain', 'bronze')):
    objs = []
    for n, p in P.items():
        if not p.bm.faces:
            p.bm.free(); continue
        objs.append((p.build(MAT[n]), n))
    kit.bake_ao_vertex([o for o, _ in objs], distance=1.5, samples=20, cell=3.0, passes=1, skip=[o for o, n in objs if n in skip])
    root = bpy.data.objects.new(tag, None); bpy.context.collection.objects.link(root)
    for o, _ in objs:
        o.parent = root
    print('TRIANGLES', tag, kit.tris([o for o, _ in objs]), {n: kit.tris([o]) for o, n in objs})
    return root


def quad_uv(dec, region, pts, crop=(0, 1, 0, 1), n=None):
    """A decal quad from 4 points (bottom-left, bottom-right, top-right, top-left as seen from the front)."""
    a0, a1, t0, t1 = crop
    uvs = [dec.tc(region, a0, t1), dec.tc(region, a1, t1), dec.tc(region, a1, t0), dec.tc(region, a0, t0)]
    return dec.facen(pts, n, uvs) if n else dec.face(pts, uvs)


def column(part, wf, s, d, z0, z1, r, sides=8, cap=None):
    """An engaged column (a half+ prism standing out of the wall) with a base block and a capital block."""
    p = wf.p(s, 0, d)
    kit.lathe(part, p[0], p[1], [(r * 1.15, z0), (r * 1.15, z0 + 0.35), (r, z0 + 0.4), (r * 0.9, z1)], sides=sides)
    if cap:
        block(part, wf, s - r * 1.35, s + r * 1.35, z1, z1 + cap, d - r * 1.3, d + r * 1.3, top=True, bottom=True, back=True)


def tilted(part, base, top, r0, r1, sides=6):
    """A tapered prism from point base to point top (figures, swans' necks)."""
    bx, by, bz = base; tx, ty, tz = top
    ax = (tx - bx, ty - by, tz - bz); la = math.sqrt(sum(c * c for c in ax))
    ax = tuple(c / la for c in ax)
    ref = (1, 0, 0) if abs(ax[0]) < 0.9 else (0, 1, 0)
    e1 = (ax[1] * ref[2] - ax[2] * ref[1], ax[2] * ref[0] - ax[0] * ref[2], ax[0] * ref[1] - ax[1] * ref[0])
    l1 = math.sqrt(sum(c * c for c in e1)); e1 = tuple(c / l1 for c in e1)
    e2 = (ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0])
    ring = lambda c, r: [tuple(c[i] + r * (math.cos(k / sides * math.tau) * e1[i] + math.sin(k / sides * math.tau) * e2[i]) for i in range(3)) for k in range(sides)]
    A, B = ring(base, r0), ring(top, r1)
    for k in range(sides):
        j = (k + 1) % sides
        m = ((A[k][0] + A[j][0]) / 2 - bx, (A[k][1] + A[j][1]) / 2 - by, (A[k][2] + A[j][2]) / 2 - bz)
        part.facen([A[k], A[j], B[j], B[k]], m)
    part.facen(B, ax)


# ======================================================================================================================
# CLERYS: the 1922 front. Ground-floor shopfronts, a giant Ionic order over three storeys of big metal-framed windows
# with bronze balconettes, a dentilled entablature with rosettes, an attic storey, a balustraded parapet with the
# "CLERY & CO LTD" panel, and the Stokes clock hung over the main entrance.
# ======================================================================================================================
def clerys():
    P = parts('clerys'); st, dec, mt = P['stone'], P['dec'], P['metal']
    W, D = L['clerys']['w'], L['clerys']['d']
    U0, U1 = -W / 2, W / 2
    front = WF(0, 0, 0, -1)
    GF, PL, C0, C1, E1, CO, AT, PA = 5.2, 6.0, 6.0, 16.4, 18.4, 19.1, 21.9, 23.1
    PAV = 2.6                     # end pavilions
    NB = 8
    pitch = (W - 2 * PAV) / NB
    cols = [U0 + PAV + k * pitch for k in range(NB + 1)]
    REC = 0.55                    # window wall set back behind the column line
    # ground floor: stone piers and shopfronts; the entrance bay (the clock's) has the doors under the name fascia
    ent = 5
    for k in range(NB):
        a, b = cols[k], cols[k + 1]
        rect(st, front, a - 0.45, a + 0.45, 0, GF, 0.12)
        block(st, front, a - 0.45, a + 0.45, 0, GF, 0, 0.12, top=False)
        dec.wall('cdoor' if k == ent else 'cshop', front, a + 0.45, b - 0.45, 0.0, GF - 0.3, d=0.02)
        rect(st, front, a + 0.45, b - 0.45, GF - 0.3, GF)
    block(st, front, cols[-1] - 0.45, cols[-1] + 0.45, 0, GF, 0, 0.12, top=False)
    for a, b in ((U0, cols[0] - 0.45), (cols[-1] + 0.45, U1)):   # the pavilions' ground floors: a door each
        rect(st, front, a, b, 0, GF)
        dec.wall('door', front, (a + b) / 2 - 0.7, (a + b) / 2 + 0.7, 0.0, 3.2, d=0.02)
    # the ground-floor cornice / balcony course the order stands on
    extrude_profile(st, [(U1, 0.0), (U0, 0.0)][::-1], [(0, GF), (0.3, GF + 0.15), (0.35, PL - 0.2), (0.45, PL - 0.1), (0.45, PL), (0, PL)])
    # the colonnade: window walls set back between the columns (decals), columns on the front line
    for k in range(NB):
        a, b = cols[k], cols[k + 1]
        st.facen([front.p(a, PL, -REC), front.p(b, PL, -REC), front.p(b, C1, -REC), front.p(a, C1, -REC)], front.n3)
        dec.wall('cwin', front, a + 0.5, b - 0.5, PL + 0.1, C1 - 0.2, d=-REC + 0.02)
        st.facen([front.p(a, C1, -REC), front.p(b, C1, -REC), front.p(b, C1, 0), front.p(a, C1, 0)], (0, 0, -1))  # soffit
        st.facen([front.p(a, PL, 0), front.p(b, PL, 0), front.p(b, PL, -REC), front.p(a, PL, -REC)], (0, 0, 1))
    for k, u in enumerate(cols):
        # the end columns are square pilasters against the pavilions; the rest round, engaged
        if k in (0, NB):
            block(st, front, u - 0.45, u + 0.45, PL, C1, 0, 0.3, top=False)
        else:
            column(st, front, u, -0.05, PL, C1, 0.42, sides=10)
        block(st, front, u - 0.62, u + 0.62, C1, C1 + 0.55, -0.1, 0.5, top=True, bottom=True)   # Ionic capital
        for sg in (-1, 1):                                                                      # volutes
            kit.lathe(st, front.p(u + sg * 0.55, 0, 0.35)[0], front.p(u + sg * 0.55, 0, 0.35)[1], [(0.2, C1 + 0.05), (0.2, C1 + 0.45)], sides=6, cap=True)
    for a, b in ((U0, cols[0]), (cols[-1], U1)):   # pavilions: solid stone with one window a floor
        rect(st, front, a, b, PL, C1, 0.3 if a == U0 else 0.3)
        for z0 in (7.0, 10.3, 13.6):
            dec.wall('hwin', front, (a + b) / 2 - 0.6, (a + b) / 2 + 0.6, z0, z0 + 2.2, d=0.32)
        for s0 in (a, b):
            st.facen([front.p(s0, PL, 0), front.p(s0, PL, 0.3), front.p(s0, C1, 0.3), front.p(s0, C1, 0)], front.dir(-1 if s0 == a else 1, 0, 0))
    # entablature: architrave, frieze (rosettes as small drums), dentilled cornice
    rect(st, front, U0, U1, C1, E1, 0.35)
    extrude_profile(st, [(U0 - 0.2, 0.0), (U1 + 0.2, 0.0)], [(0.35, E1 - 0.1), (0.5, E1), (0.95, CO - 0.2), (1.05, CO), (0.35, CO + 0.05)])
    # attic storey with small windows, a moulded top, the balustrade, the raised name panel
    rect(st, front, U0, U1, CO, AT, 0.2)
    for k in range(NB):
        c = (cols[k] + cols[k + 1]) / 2
        dec.wall('cattic', front, c - 0.75, c + 0.75, CO + 0.6, AT - 0.6, d=0.22)
    extrude_profile(st, [(U0 - 0.1, 0.0), (U1 + 0.1, 0.0)], [(0.2, AT), (0.45, AT + 0.15), (0.45, AT + 0.35), (0.2, AT + 0.35)])
    for u in cols + [U0 + 0.4, U1 - 0.4]:
        block(st, front, u - 0.35, u + 0.35, AT + 0.35, PA, 0.0, 0.4, top=True)
    rect(st, front, U0, U1, AT + 0.35, AT + 0.5, 0.15)
    dec.wall('balus', front, U0 + 0.4, U1 - 0.4, AT + 0.5, PA - 0.15, d=0.2)
    block(st, front, U0, U1, PA - 0.15, PA, -0.2, 0.42, top=True, bottom=True)
    cu = (cols[3] + cols[5]) / 2 + 0.0
    block(st, front, cu - 3.6, cu + 3.6, AT + 0.35, PA + 1.2, -0.3, 0.45, top=True)
    dec.wall('cname', front, cu - 3.2, cu + 3.2, AT + 0.8, PA + 0.8, d=0.47)
    block(st, front, cu - 3.8, cu + 3.8, PA + 1.2, PA + 1.45, -0.3, 0.6, top=True, bottom=True)
    # flagpoles on the parapet (three, as in refs 01 and 07)
    for u in (U0 + 3, cu, U1 - 3):
        kit.lathe(mt, u, 1.0, [(0.06, PA), (0.04, PA + 6.5)], sides=5)
    # returns, back and roof
    for s_, sg in ((U0, -1), (U1, 1)):
        st.facen([(s_, 0, 0), (s_, D, 0), (s_, D, PA), (s_, 0, PA)], (sg, 0, 0))
    P['brick'].facen([(U1, D, 0), (U0, D, 0), (U0, D, PA), (U1, D, PA)], (0, 1, 0))
    mt.facen([(U0, 0.3, PA - 0.4), (U1, 0.3, PA - 0.4), (U1, D, PA - 0.4), (U0, D, PA - 0.4)], (0, 0, 1))
    mt.box(cu - 6, cu + 6, 6, 16, PA - 0.4, PA + 2.2)   # plant room behind the parapet
    # the clock: a square case with three faces, a pendant, a cap and four lanterns, on a bracket over the entrance
    cc = (cols[ent] + cols[ent + 1]) / 2
    CZ, CS = 6.9, 1.6
    cy0, cy1 = -2.0, -2.0 + CS
    x0, x1 = cc - CS / 2, cc + CS / 2
    z0, z1 = CZ, CZ + 1.75
    mt.box(x0, x1, cy0, cy1, z0, z1, top=True, bottom=True)
    quad_uv(dec, 'clock', [(x0 + 0.05, cy0 - 0.02, z0 + 0.1), (x1 - 0.05, cy0 - 0.02, z0 + 0.1), (x1 - 0.05, cy0 - 0.02, z1 - 0.05), (x0 + 0.05, cy0 - 0.02, z1 - 0.05)], n=(0, -1, 0))
    for xs, sg in ((x0, -1), (x1, 1)):
        ya, yb = (cy1 - 0.05, cy0 + 0.05) if sg < 0 else (cy0 + 0.05, cy1 - 0.05)
        quad_uv(dec, 'cside', [(xs + sg * 0.02, ya, z0 + 0.1), (xs + sg * 0.02, yb, z0 + 0.1), (xs + sg * 0.02, yb, z1 - 0.05), (xs + sg * 0.02, ya, z1 - 0.05)], n=(sg, 0, 0))
    kit.lathe(mt, cc, (cy0 + cy1) / 2, [(0.62, z0), (0.3, z0 - 0.55), (0.08, z0 - 0.95), (0.0, z0 - 1.05)], sides=8, a0=math.pi / 8, a1=math.pi / 8 + math.tau)
    kit.lathe(mt, cc, (cy0 + cy1) / 2, [(0.75, z1), (0.5, z1 + 0.25), (0.0, z1 + 0.4)], sides=8, a0=math.pi / 8, a1=math.pi / 8 + math.tau)
    for lx, ly in ((x0, cy0), (x1, cy0), (x0, cy1), (x1, cy1)):
        dec.facen([(lx - 0.1, ly, z1 + 0.05), (lx + 0.1, ly, z1 + 0.05), (lx + 0.1, ly, z1 + 0.4), (lx - 0.1, ly, z1 + 0.4)], (0, -1, 0),
                  [dec.tc('lamp', 0, 1), dec.tc('lamp', 1, 1), dec.tc('lamp', 1, 0), dec.tc('lamp', 0, 0)])
    mt.box(cc - 0.06, cc + 0.06, cy1, -REC, z1 - 0.2, z1 - 0.05)          # the bracket arm into the wall
    mt.box(cc - 0.05, cc + 0.05, cy1, -0.3, z0 + 0.4, z0 + 0.5)
    return finish('clerys', P)


# ======================================================================================================================
# THE ROTUNDA HOSPITAL (Richard Cassels, 1751-57): a seven-bay granite front on Parnell Street over a rusticated ground
# floor, the three middle bays under a pediment on four engaged columns, the three-stage tower and copper cupola behind
# it; a curved quadrant block and an end pavilion to the west (ref 02), a plain link east to the Ambassador, brick
# ranges behind, and the railed forecourt.
# ======================================================================================================================
def rotunda():
    P = parts('rotunda'); gr, ru, dec, sl, cu, br, pv = P['granite'], P['rustic'], P['dec'], P['slate'], P['copper'], P['brick'], P['pave']
    front = WF(0, 0, 0, -1)
    U0, U1, D = -13.0, 13.0, 14.0
    GF, F1, F2, CO = 5.0, 9.2, 12.6, 13.4
    NB = 7
    pitch = (U1 - U0) / NB
    bays = [U0 + (k + 0.5) * pitch for k in range(NB)]
    # rusticated ground floor: round-headed windows, the middle one the door
    for k, c in enumerate(bays):
        a, b = c - pitch / 2, c + pitch / 2
        opening(ru, front, a, b, 0.0, GF, c, 1.5, 0.9 if k != 3 else 0.0, 3.4, segs=6, depth=0.3, back=('decal', dec, 'arch' if k != 3 else 'door'))
    rect(gr, front, U0, U1, GF, GF + 0.35, 0.12)                       # string course
    # first and second floors: pedimented windows on the first floor, plain on the second
    for k, c in enumerate(bays):
        a, b = c - pitch / 2, c + pitch / 2
        rect(gr, front, a, b, GF + 0.35, F1)
        dec.wall('sash', front, c - 0.62, c + 0.62, GF + 1.0, F1 - 0.6, d=0.02)
        band(gr, front, [(c - 0.95, F1 - 0.4), (c, F1 + 0.15), (c + 0.95, F1 - 0.4)], 0.18, 0.12)
        rect(gr, front, a, b, F1, F2)
        dec.wall('sash', front, c - 0.6, c + 0.6, F1 + 0.6, F2 - 0.5, d=0.02)
    # the engaged columns on the three middle bays, the entablature and the pediment
    for u in (bays[2] - pitch / 2, bays[3] - pitch / 2, bays[4] - pitch / 2, bays[5] - pitch / 2):
        column(gr, front, u, 0.1, GF + 0.35, F2 - 0.2, 0.38, sides=8, cap=0.35)
    extrude_profile(gr, [(U0 - 0.1, 0.0), (U1 + 0.1, 0.0)], [(0, F2), (0.25, F2 + 0.2), (0.3, CO - 0.25), (0.65, CO), (0, CO)])
    pw = pitch * 1.5 + 0.8
    gr.facen([front.p(-pw, CO, 0.5), front.p(pw, CO, 0.5), front.p(0, CO + 3.0, 0.5)], front.n3)
    band(gr, front, [(-pw - 0.3, CO), (0, CO + 3.25), (pw + 0.3, CO)], 0.3, 0.7)
    for sg in (-1, 1):
        gr.facen([front.p(sg * pw, CO, 0), front.p(sg * pw, CO, 0.5), front.p(0, CO + 3.0, 0.5), front.p(0, CO + 3.0, 0)], front.dir(sg, 1, 0))
    # returns, back, roof and chimneys
    for s_, sg in ((U0, -1), (U1, 1)):
        gr.facen([(s_, 0, 0), (s_, D, 0), (s_, D, CO), (s_, 0, CO)], (sg, 0, 0))
    gr.facen([(U1, D, 0), (U0, D, 0), (U0, D, CO), (U1, D, CO)], (0, 1, 0))
    hip(sl, U0 + 0.2, U1 - 0.2, 0.3, D - 0.2, CO - 0.2, CO + 3.6)
    for x in (U0 + 3.5, U1 - 3.5):
        gr.box(x - 0.7, x + 0.7, D / 2 - 1.2, D / 2 + 1.2, CO + 1.5, CO + 5.2)
        gr.box(x - 0.85, x + 0.85, D / 2 - 1.35, D / 2 + 1.35, CO + 5.2, CO + 5.5)
    # the tower: a square stage with a round-headed window, a narrower arcaded belfry, an octagon, the copper cupola
    TY = 11.0
    gr.box(-2.7, 2.7, TY - 2.7, TY + 2.7, CO, 19.6)
    for wf_ in (WF(0, TY - 2.7, 0, -1), WF(0, TY + 2.7, 0, 1), WF(-2.7, TY, -1, 0), WF(2.7, TY, 1, 0)):
        dec.wall('arch', wf_, -0.8, 0.8, 15.6, 18.8, d=0.02)
    gr.box(-3.0, 3.0, TY - 3.0, TY + 3.0, 19.6, 20.1, bottom=True)
    gr.box(-2.3, 2.3, TY - 2.3, TY + 2.3, 20.1, 24.3)
    for wf_ in (WF(0, TY - 2.3, 0, -1), WF(0, TY + 2.3, 0, 1), WF(-2.3, TY, -1, 0), WF(2.3, TY, 1, 0)):
        dec.wall('arch', wf_, -0.75, 0.75, 20.8, 23.6, d=0.02)
        for s in (-1.9, 1.9):
            p = wf_.p(s, 0, 0.12)
            kit.lathe(gr, p[0], p[1], [(0.2, 20.1), (0.18, 24.0)], sides=6)
    gr.box(-2.6, 2.6, TY - 2.6, TY + 2.6, 24.3, 24.8, bottom=True)
    kit.lathe(gr, 0, TY, [(1.9, 24.8), (1.9, 27.2), (2.15, 27.4), (2.15, 27.7)], sides=8, a0=math.pi / 8, a1=math.pi / 8 + math.tau)
    for k in range(8):
        a = math.pi / 8 + (k + 0.5) * math.tau / 8
        wf_ = WF(math.cos(a) * 1.85, TY + math.sin(a) * 1.85, math.cos(a), math.sin(a))
        dec.wall('arch', wf_, -0.35, 0.35, 25.2, 26.9, d=0.03)
    kit.lathe(cu, 0, TY, [(2.05, 27.7), (1.95, 28.6), (1.6, 29.5), (1.0, 30.2), (0.35, 30.55), (0.22, 30.9), (0.12, 31.6), (0.0, 31.8)], sides=12)
    kit.lathe(P['metal'], 0, TY, [(0.05, 31.6), (0.05, 33.0)], sides=4)
    P['metal'].box(-0.35, 0.35, TY - 0.04, TY + 0.04, 32.3, 32.4)
    # the west quadrant (a curved three-storey block) and the end pavilion; the plain link east
    QR, QC = 7.0, (U0, 7.0)
    kit.lathe(gr, QC[0], QC[1], [(QR, 0), (QR, 12.0)], sides=8, a0=math.pi, a1=1.5 * math.pi)
    kit.lathe(gr, QC[0], QC[1], [(QR, 12.0), (QR + 0.35, 12.3), (QR + 0.35, 12.7), (0.0, 12.7)], sides=8, a0=math.pi, a1=1.5 * math.pi)
    for k in range(4):
        a = math.pi + (k + 0.5) * (0.5 * math.pi) / 4
        wf_ = WF(QC[0] + math.cos(a) * QR, QC[1] + math.sin(a) * QR, math.cos(a), math.sin(a))
        for z0, reg in ((1.0, 'arch'), (5.8, 'sash'), (9.2, 'sash')):
            dec.wall(reg, wf_, -0.55, 0.55, z0, z0 + 2.3, d=0.03)
    pav = WF(0, 7.0, 0, -1)
    rect(gr, pav, -26.0, -20.0, 0, 12.6)
    for c in (-24.6, -21.4):
        for z0, reg in ((1.0, 'arch'), (5.8, 'sash'), (9.2, 'sash')):
            dec.wall(reg, pav, c - 0.55, c + 0.55, z0, z0 + 2.3, d=0.02)
    gr.facen([(-26, 7, 0), (-26, 19, 0), (-26, 19, 12.6), (-26, 7, 12.6)], (-1, 0, 0))
    hip(sl, -26.2, -19.8, 6.8, 19.2, 12.6, 15.0)
    LU = L['parnell']['linkU']                    # the link runs on to the Ambassador's entrance range
    link = WF(0, 0, 0, -1)
    rect(gr, link, U1, LU, 0, 12.0)
    nl = int((LU - U1) / 3.0)
    for k in range(nl):
        c = U1 + (k + 0.5) * (LU - U1) / nl
        for z0, reg in ((1.0, 'arch'), (5.8, 'sash'), (9.0, 'sash')):
            dec.wall(reg, link, c - 0.55, c + 0.55, z0, z0 + 2.3, d=0.02)
    gr.facen([(LU, 0, 0), (LU, 12, 0), (LU, 12, 12), (LU, 0, 12)], (1, 0, 0))
    hip(sl, U1, LU + 0.2, -0.1, 12.2, 12.0, 14.0)
    # the brick ranges behind (the hospital's later blocks), plain with sash windows on the sides that show
    for (a, b, v0, v1, h) in ((-24.0, -4.0, 14.0, 32.0, 13.0), (2.0, 16.0, 14.0, 33.5, 11.0)):
        br.box(a, b, v0, v1, 0, h, top=False)
        sl.gable_x(a - 0.2, b + 0.2, v0 - 0.2, v1 + 0.2, h, h + 3.2)
        for wf_, s0, s1 in ((WF(a, 0, -1, 0), -v1, -v0), (WF(0, v1, 0, 1), -b, -a), (WF(b, 0, 1, 0), v0, v1)):
            n = int((s1 - s0) / 3.2)
            for k in range(n):
                c = s0 + (k + 0.5) * (s1 - s0) / n
                for z0 in range(1, int(h) - 2, 3):
                    dec.wall('sash', wf_, c - 0.55, c + 0.55, z0 + 0.4, z0 + 2.3, d=0.02)
    # the forecourt: paving, gate piers and railings on the back of the footpath
    FC = L['parnell']['forecourt']
    pv.facen([(-26, -FC, 0.08), (LU - 3, -FC, 0.08), (LU - 3, 0, 0.08), (-26, 0, 0.08)], (0, 0, 1))
    piers = [-26.0, -8.0, -3.0, 3.0, 8.0, 19.0]
    for p in piers:
        gr.box(p - 0.4, p + 0.4, -FC - 0.4, -FC + 0.4, 0, 2.1)
        gr.box(p - 0.5, p + 0.5, -FC - 0.5, -FC + 0.5, 2.1, 2.3)
    for a, b in zip(piers, piers[1:]):
        if a == -3.0:
            continue                               # the open gateway on the axis
        quad_uv(dec, 'rail', [(a + 0.4, -FC, 0.05), (b - 0.4, -FC, 0.05), (b - 0.4, -FC, 1.6), (a + 0.4, -FC, 1.6)], n=(0, -1, 0))
    return finish('rotunda', P)


# ======================================================================================================================
# THE AMBASSADOR (the Rotunda, James Ensor 1764-67; Gandon's frieze 1786): a buff drum with blind panels and windows,
# the Coade-stone swag frieze, a cornice and blocking course and a low dome with a green rim; the lower curved
# entrance range round its Parnell Street side. Origin at the drum's centre; u along Parnell Street, v into the block.
# ======================================================================================================================
def ambassador():
    P = parts('ambassador'); rd, dec, sl, cu, gr = P['render'], P['dec'], P['slate'], P['copper'], P['granite']
    R = L['parnell']['drumR']
    NS = 32
    kit.lathe(gr, 0, 0, [(R + 0.15, 0), (R + 0.15, 0.7), (R, 0.75)], sides=NS)
    kit.lathe(rd, 0, 0, [(R, 0.75), (R, 10.4)], sides=NS)
    for k in range(NS):   # the swag frieze, one swag a facet
        a0, a1 = k * math.tau / NS, (k + 1) * math.tau / NS
        kit.lathe(dec, 0, 0, [(R + 0.03, 10.4), (R + 0.03, 11.7)], sides=1, a0=a0, a1=a1, region='swag')
    kit.lathe(rd, 0, 0, [(R, 11.7), (R + 0.4, 11.9), (R + 0.45, 12.3), (R, 12.35), (R, 13.3), (R + 0.12, 13.45), (R - 0.2, 13.5)], sides=NS)
    kit.lathe(sl, 0, 0, [(R - 0.2, 13.5), (R - 1.5, 14.4), (R - 4.5, 15.6), (1.5, 16.1), (0.0, 16.2)], sides=NS)
    kit.lathe(cu, 0, 0, [(R - 0.15, 13.5), (R - 0.9, 14.0), (R - 1.0, 14.1)], sides=NS)
    # blind panels and windows round the drum: a window on the upper level, a blind panel below, every other facet
    for k in range(0, NS, 2):
        a = (k + 1) * math.tau / NS
        wf_ = WF(math.cos(a) * R, math.sin(a) * R, math.cos(a), math.sin(a))
        dec.wall('blind', wf_, -0.8, 0.8, 1.8, 5.2, d=0.03)
        dec.wall('sash', wf_, -0.55, 0.55, 6.6, 9.4, d=0.03)
    # the lower curved entrance range on the Parnell Street / O'Connell Street side, with arched windows and the sign
    R2, H2 = R + 2.2, 5.4
    A0, A1 = 1.02 * math.pi, 1.98 * math.pi
    kit.lathe(rd, 0, 0, [(R2, 0), (R2, H2), (R2 + 0.3, H2 + 0.15), (R2 + 0.3, H2 + 0.5), (R, H2 + 0.5)], sides=14, a0=A0, a1=A1)
    for a in (A0, A1):
        rd.facen([(math.cos(a) * R, math.sin(a) * R, 0), (math.cos(a) * R2, math.sin(a) * R2, 0), (math.cos(a) * R2, math.sin(a) * R2, H2 + 0.5), (math.cos(a) * R, math.sin(a) * R, H2 + 0.5)], (math.sin(a), -math.cos(a), 0) if a == A0 else (-math.sin(a), math.cos(a), 0))
    for k in range(7):
        a = A0 + (k + 0.5) * (A1 - A0) / 7
        wf_ = WF(math.cos(a) * R2, math.sin(a) * R2, math.cos(a), math.sin(a))
        dec.wall('arch' if k != 3 else 'door', wf_, -0.7, 0.7, 0.6 if k != 3 else 0.0, 3.9, d=0.03)
    a = A0 + 0.72 * (A1 - A0)
    wf_ = WF(math.cos(a) * (R2 + 0.3), math.sin(a) * (R2 + 0.3), math.cos(a), math.sin(a))
    dec.wall('amb', wf_, -2.4, 2.4, H2 - 0.1, H2 + 0.55, d=0.03)
    return finish('ambassador', P)


# ======================================================================================================================
# THE GATE THEATRE (Richard Johnston's New Assembly Rooms, 1784-86): the front on Cavendish Row with four giant engaged
# columns under a pediment across the whole front, a rusticated ground floor, the "GATE" letters on the parapet.
# ======================================================================================================================
def gate():
    P = parts('gate'); gr, ru, dec, sl, rd = P['granite'], P['rustic'], P['dec'], P['slate'], P['render']
    W, D = L['parnell']['gateW'], L['parnell']['gateD']
    U0, U1 = -W / 2, W / 2
    front = WF(0, 0, 0, -1)
    GF, C1, E1, H = 4.6, 13.0, 14.3, 14.3
    # rusticated ground floor: three doors
    for k, c in enumerate((-3.3, 0.0, 3.3)):
        opening(ru, front, c - 1.65 if k else U0, c + 1.65 if k < 2 else U1, 0.0, GF, c, 1.3, 0.0, 3.0, segs=6, depth=0.3, back=('decal', dec, 'door'))
    rect(gr, front, U0, U1, GF, GF + 0.4, 0.1)
    # upper walls with windows, four engaged columns spanning them
    rect(rd, front, U0, U1, GF + 0.4, C1)
    for c in (-4.1, 0.0, 4.1):
        dec.wall('sash', front, c - 0.65, c + 0.65, GF + 1.2, GF + 4.0, d=0.02)
        dec.wall('sash', front, c - 0.6, c + 0.6, GF + 5.0, C1 - 0.9, d=0.02)
    for u in (-5.3, -2.05, 2.05, 5.3):
        column(gr, front, u, 0.15, GF + 0.4, C1, 0.42, sides=10, cap=0.4)
    extrude_profile(gr, [(U0 - 0.1, 0.0), (U1 + 0.1, 0.0)], [(0.0, C1 + 0.4), (0.45, C1 + 0.45), (0.5, E1 - 0.3), (0.85, E1), (0.0, E1)])
    gr.facen([front.p(U0 - 0.2, E1, 0.6), front.p(U1 + 0.2, E1, 0.6), front.p(0, E1 + 3.0, 0.6)], front.n3)
    band(gr, front, [(U0 - 0.5, E1), (0, E1 + 3.25), (U1 + 0.5, E1)], 0.3, 0.8)
    for sg in (-1, 1):
        gr.facen([front.p(sg * (U1 + 0.2), E1, 0), front.p(sg * (U1 + 0.2), E1, 0.6), front.p(0, E1 + 3.0, 0.6), front.p(0, E1 + 3.0, 0)], front.dir(sg, 1, 0))
    # returns (the south one shows from O'Connell Street), back, roof
    side = WF(U0, 0, -1, 0)
    rd.facen([(U0, 0, 0), (U0, D, 0), (U0, D, H), (U0, 0, H)], (-1, 0, 0))
    for c in (-4, -9, -14, -19):
        for z0 in (1.2, 5.6, 9.4):
            dec.wall('sash', side, c - 0.55, c + 0.55, z0, z0 + 2.3, d=0.02)
    rd.facen([(U1, 0, 0), (U1, D, 0), (U1, D, H), (U1, 0, H)], (1, 0, 0))
    rd.facen([(U1, D, 0), (U0, D, 0), (U0, D, H), (U1, D, H)], (0, 1, 0))
    sl.gable_y(U0, U1, 0.8, D, H, H + 3.0)
    rd.facen([(U0, 0.8, H), (U1, 0.8, H), (0, 0.8, H + 3.0)], (0, -1, 0))
    # the parapet block with GATE over the south end (ref 01)
    P['brick'].box(U0 + 0.3, U0 + 5.2, 1.6, 3.2, H, H + 3.4)
    dec.wall('gate', WF(0, 1.6, 0, -1), U0 + 0.4, U0 + 5.1, H + 1.3, H + 3.1, d=0.03)
    return finish('gate', P)


# ======================================================================================================================
# THE GARDEN OF REMEMBRANCE (Daithi Hanly, 1966): behind railings on Parnell Square North, lawns on a raised terrace
# round a sunken paved court with the cruciform pool (its floor a mosaic of broken spears and shields), the curved
# marble apse at the west end with Oisin Kelly's Children of Lir (1971) and the tricolour behind. u runs west along
# Parnell Square North, v south into the square. (The ground can't be cut, so the lawns stand 1.1 m up instead and the
# court and the pool sit at street level: from the railings it reads the same, stepping down to the water.)
# ======================================================================================================================
def garden():
    P = parts('garden'); gr, pv, lw, dec, bz, mt, st = P['granite'], P['pave'], P['lawn'], P['dec'], P['bronze'], P['metal'], P['stone']
    W, D, KW = L['parnell']['gardenW'], L['parnell']['gardenD'], L['parnell']['gardenKW']
    U0, U1 = -W / 2, W / 2
    uw = lambda v: U1 - KW * v                   # the west end runs parallel to Parnell Square West
    T = 1.1                                       # the terrace
    CU0, CU1, CV0, CV1 = U0 + 12, U0 + 64, 12.0, D - 12.0   # the sunken court
    # the terrace: a granite retaining wall round the trapezoid, coping, lawns on top, a path inside the railings
    ring = [(U0, 0), (U1, 0), (uw(D), D), (U0, D)]
    outs = [(0, -1, 0), (1, KW, 0), (0, 1, 0), (-1, 0, 0)]
    for i in range(4):
        (xa, ya), (xb, yb) = ring[i], ring[(i + 1) % 4]
        gr.facen([(xa, ya, 0), (xb, yb, 0), (xb, yb, T + 0.5), (xa, ya, T + 0.5)], outs[i])
    inner = [(U0 + 0.5, 0.5), (uw(0.5) - 0.5, 0.5), (uw(D - 0.5) - 0.5, D - 0.5), (U0 + 0.5, D - 0.5)]
    for i in range(4):
        (xa, ya), (xb, yb) = ring[i], ring[(i + 1) % 4]
        (ia, ja), (ib, jb) = inner[i], inner[(i + 1) % 4]
        gr.facen([(xa, ya, T + 0.5), (xb, yb, T + 0.5), (ib, jb, T + 0.5), (ia, ja, T + 0.5)], (0, 0, 1))
        gr.facen([(ib, jb, T), (ia, ja, T), (ia, ja, T + 0.5), (ib, jb, T + 0.5)], (-outs[i][0], -outs[i][1], 0))
    # railings on the coping along the street and the west end (the entrance gap at the east end, on Parnell Sq East)
    quad_uv(dec, 'rail', [(U0 + 7, -0.05, T + 0.5), (U1 - 0.3, -0.05, T + 0.5), (U1 - 0.3, -0.05, T + 1.9), (U0 + 7, -0.05, T + 1.9)], n=(0, -1, 0))
    for k in range(3):
        v0, v1 = 0.3 + k * (D - 0.6) / 3, 0.3 + (k + 1) * (D - 0.6) / 3
        quad_uv(dec, 'rail', [(uw(v0) + 0.05, v0, T + 0.5), (uw(v1) + 0.05, v1, T + 0.5), (uw(v1) + 0.05, v1, T + 1.9), (uw(v0) + 0.05, v0, T + 1.9)], crop=(0, 0.6, 0, 1), n=(1, KW, 0))
    quad_uv(dec, 'rail', [(U0 - 0.05, D - 0.3, T + 0.5), (U0 - 0.05, 12.0, T + 0.5), (U0 - 0.05, 12.0, T + 1.9), (U0 - 0.05, D - 0.3, T + 1.9)], crop=(0, 0.6, 0, 1), n=(-1, 0, 0))
    # terrace top: a path inside the street railings and down the east end, lawns round the court
    pv.facen([(U0 + 0.5, 0.5, T), (uw(0.5) - 0.5, 0.5, T), (uw(3.0) - 0.5, 3.0, T), (U0 + 0.5, 3.0, T)], (0, 0, 1))
    pv.facen([(U0 + 0.5, 3.0, T), (U0 + 4.0, 3.0, T), (U0 + 4.0, D - 0.5, T), (U0 + 0.5, D - 0.5, T)], (0, 0, 1))
    for (a, b, c, e) in ((U0 + 4.0, CU0, 3.0, D - 0.5), (CU0, CU1, 3.0, CV0), (CU0, CU1, CV1, D - 0.5)):
        lw.facen([(a, c, T), (b, c, T), (b, e, T), (a, e, T)], (0, 0, 1))
    lw.facen([(CU1, 3.0, T), (uw(3.0) - 0.5, 3.0, T), (uw(D - 0.5) - 0.5, D - 0.5, T), (CU1, D - 0.5, T)], (0, 0, 1))
    # the court: paving, granite retaining walls with coping, steps down at the east end
    pv.facen([(CU0, CV0, 0.12), (CU1, CV0, 0.12), (CU1, CV1, 0.12), (CU0, CV1, 0.12)], (0, 0, 1))
    for (a, b, c, e, n) in ((CU0, CU1, CV0, CV0, (0, 1, 0)), (CU1, CU0, CV1, CV1, (0, -1, 0))):
        gr.facen([(a, c, 0.12), (b, e, 0.12), (b, e, T), (a, e, T)], n)
    gr.facen([(CU1, CV1, 0.12), (CU1, CV0, 0.12), (CU1, CV0, T), (CU1, CV1, T)], (-1, 0, 0))
    for k in range(4):   # the steps down from the east lawn
        z = T - (k + 1) * T / 4
        u = CU0 - 2.4 + k * 0.6
        pv.facen([(u, CV0 + 1, z + T / 4), (u + 0.6, CV0 + 1, z + T / 4), (u + 0.6, CV1 - 1, z + T / 4), (u, CV1 - 1, z + T / 4)], (0, 0, 1))
        pv.facen([(u + 0.6, CV0 + 1, z), (u + 0.6, CV1 - 1, z), (u + 0.6, CV1 - 1, z + T / 4), (u + 0.6, CV0 + 1, z + T / 4)], (1, 0, 0))
    gr.facen([(CU0, CV0, 0.12), (CU0, CV0 + 1, 0.12), (CU0, CV0 + 1, T), (CU0, CV0, T)], (1, 0, 0))
    gr.facen([(CU0, CV1 - 1, 0.12), (CU0, CV1, 0.12), (CU0, CV1, T), (CU0, CV1 - 1, T)], (1, 0, 0))
    # the cruciform pool: a long arm down the court and a cross arm near the west end, granite coping, mosaic floor
    VM = (CV0 + CV1) / 2
    arms = [(CU0 + 2, CU1 - 2, VM - 2.3, VM + 2.3), (CU1 - 9.5, CU1 - 5.5, CV0 + 1.2, CV1 - 1.2)]
    for (a, b, c, e) in arms:
        nseg = max(1, round((b - a) / 6))
        for j in range(nseg):   # the mosaic in 6 m panels
            x0, x1 = a + (b - a) * j / nseg, a + (b - a) * (j + 1) / nseg
            quad_uv(dec, 'mosaic', [(x0, c, 0.3), (x1, c, 0.3), (x1, e, 0.3), (x0, e, 0.3)], crop=(0, 1, 0, min(1, (e - c) / (x1 - x0))), n=(0, 0, 1))
        for (p0, p1, n) in (((a, c), (b, c), (0, -1, 0)), ((b, e), (a, e), (0, 1, 0)), ((a, e), (a, c), (-1, 0, 0)), ((b, c), (b, e), (1, 0, 0))):
            gr.facen([(*p0, 0.12), (*p1, 0.12), (*p1, 0.45), (*p0, 0.45)], n)
        gr.facen([(a - 0.35, c - 0.35, 0.45), (b + 0.35, c - 0.35, 0.45), (b + 0.35, c, 0.45), (a - 0.35, c, 0.45)], (0, 0, 1))
        gr.facen([(a - 0.35, e, 0.45), (b + 0.35, e, 0.45), (b + 0.35, e + 0.35, 0.45), (a - 0.35, e + 0.35, 0.45)], (0, 0, 1))
    # the apse at the west end of the court: a curved wall faced in pale marble, the sculpture before it
    AX, AR = CU1 - 1.0, 5.5
    kit.lathe(st, AX, VM, [(AR, 0.12), (AR, 4.2)], sides=10, a0=-0.5 * math.pi, a1=0.5 * math.pi)
    kit.lathe(gr, AX, VM, [(AR, 4.2), (AR + 0.5, 4.2), (AR + 0.5, 4.5), (AR, 4.5)], sides=10, a0=-0.5 * math.pi, a1=0.5 * math.pi)
    for k in range(10):
        a0, a1 = -0.5 * math.pi + k * math.pi / 10, -0.5 * math.pi + (k + 1) * math.pi / 10
        pts = [(AX + math.cos(a) * (AR - 0.03), VM + math.sin(a) * (AR - 0.03), z) for a, z in ((a1, 0.3), (a0, 0.3), (a0, 4.1), (a1, 4.1))]
        dec.facen(pts, (-math.cos((a0 + a1) / 2), -math.sin((a0 + a1) / 2), 0), [dec.tc('marble', 0, 1), dec.tc('marble', 1, 1), dec.tc('marble', 1, 0), dec.tc('marble', 0, 0)])
    # the Children of Lir: a wave-carved plinth, the four children falling, the four swans rising behind them
    SX = AX - 2.4
    gr.box(SX - 1.6, SX + 1.6, VM - 1.9, VM + 1.9, 0.12, 1.3)
    quad_uv(dec, 'wave', [(SX - 1.62, VM + 1.9, 0.5), (SX - 1.62, VM - 1.9, 0.5), (SX - 1.62, VM - 1.9, 1.25), (SX - 1.62, VM + 1.9, 1.25)], n=(-1, 0, 0))
    B = 1.3
    # (the children bow forward and down over the front of the plinth, the lowest almost on all fours: ref 04)
    kids = [((SX + 0.5, VM - 1.0, B), (SX - 1.0, VM - 1.2, B + 1.9)), ((SX + 0.4, VM + 0.1, B), (SX - 1.2, VM + 0.0, B + 2.2)),
            ((SX + 0.6, VM + 1.0, B), (SX - 0.8, VM + 1.3, B + 1.7)), ((SX + 0.3, VM - 0.3, B), (SX - 1.45, VM - 0.4, B + 0.75))]
    for base, top in kids:
        mid = (base[0] * 0.45 + top[0] * 0.55 + 0.25, base[1] * 0.5 + top[1] * 0.5, base[2] * 0.4 + top[2] * 0.6)
        tilted(bz, base, mid, 0.55, 0.4, sides=6)      # robes to the hips
        tilted(bz, mid, top, 0.4, 0.26, sides=6)       # the bowed back and shoulders
        tilted(bz, top, (top[0] - 0.25, top[1], top[2] + 0.35), 0.22, 0.2, sides=5)    # the head, bowed
        tilted(bz, (top[0] + 0.1, top[1] - 0.25, top[2] - 0.2), (top[0] - 0.7, top[1] - 0.35, top[2] - 1.2), 0.09, 0.07, sides=4)   # arms hanging
        tilted(bz, (top[0] + 0.1, top[1] + 0.25, top[2] - 0.2), (top[0] - 0.7, top[1] + 0.35, top[2] - 1.2), 0.09, 0.07, sides=4)
    swans = [(SX + 0.4, VM - 1.0, 4.4), (SX + 0.7, VM + 0.4, 5.4), (SX + 0.2, VM + 1.2, 4.0), (SX + 0.9, VM - 0.2, 6.2)]
    for (x, y, z) in swans:
        tilted(bz, (x + 0.2, y, z - 1.2), (x, y, z), 0.3, 0.26, sides=6)                 # body, rising
        tilted(bz, (x, y, z), (x - 0.25, y, z + 1.5), 0.1, 0.07, sides=4)                  # neck
        tilted(bz, (x - 0.25, y, z + 1.5), (x - 0.5, y, z + 1.55), 0.08, 0.04, sides=4)    # head
        for sg in (-1, 1):   # wings: raised, spread, feathered cut-outs
            root_ = (x, y + sg * 0.2, z - 0.4)
            pts = [root_, (x + 0.3, y + sg * 2.0, z + 0.1), (x + 0.6, y + sg * 2.4, z + 1.6), (x + 0.2, y + sg * 0.3, z + 0.6)]
            uv = [dec.tc('wing', 0, 1), dec.tc('wing', 1, 1), dec.tc('wing', 1, 0), dec.tc('wing', 0, 0)]
            dec.facen(pts, (-1, 0, 0.2), uv)
            dec.facen(pts[::-1], (1, 0, -0.2), uv[::-1])
        tilted(bz, (x + 0.2, y, z - 1.2), (SX + 0.2, y * 0.5 + VM * 0.5, B + 0.2), 0.16, 0.2, sides=4)   # into the group
    # the flagpole and tricolour behind the apse
    FX = AX + AR + 1.6
    kit.lathe(mt, FX, VM, [(0.09, T), (0.05, T + 11.0)], sides=6)
    quad_uv(dec, 'flag', [(FX, VM - 0.05, T + 8.6), (FX, VM - 3.0, T + 8.6), (FX, VM - 3.0, T + 10.6), (FX, VM - 0.05, T + 10.6)], n=(-1, 0, 0))
    quad_uv(dec, 'flag', [(FX, VM - 3.0, T + 8.6), (FX, VM - 0.05, T + 8.6), (FX, VM - 0.05, T + 10.6), (FX, VM - 3.0, T + 10.6)], crop=(1, 0, 0, 1), n=(1, 0, 0))
    return finish('garden', P, skip=('pave', 'lawn', 'bronze', 'granite'))


# ======================================================================================================================
# BUSARAS (Michael Scott, 1953): the seven-storey office slab along the north with its penthouse pavilions, curtain walls
# of glass, white bands and blue mosaic spandrels, Portland-stone end walls on a brick base; the four-storey wing on
# Store Street; the glazed single-storey concourse in the angle with its curved glass bay, and the famous wavy concrete
# canopy along its Beresford Place and bus-yard sides. u east (along Beresford Place), v north (away from it).
# ======================================================================================================================
def busaras():
    P = parts('busaras'); st, br, cw, dec, cc, mt, cu, pv = P['stone'], P['brick'], P['curtain'], P['dec'], P['conc'], P['metal'], P['copper'], P['pave']
    W, D = L['busaras']['w'], L['busaras']['d']
    U0, U1 = -W / 2, W / 2
    GF, FH = 4.65, 3.1
    TOP = GF + 6 * FH                    # 23.25
    SV0 = D - 10.0                       # the slab: v SV0 .. D
    WU1 = U0 + 9.0                       # the Store Street wing: u U0 .. WU1
    WTOP = GF + 3 * FH                   # 13.95
    CV0, CH = 6.0, 5.2                   # the concourse's front line and height
    # the slab: curtain walls north and south from the first floor, stone end walls, a brick and glass ground floor
    cw.facen([(U0, SV0, GF), (U1, SV0, GF), (U1, SV0, TOP), (U0, SV0, TOP)], (0, -1, 0))
    cw.facen([(U1, D, GF), (U0, D, GF), (U0, D, TOP), (U1, D, TOP)], (0, 1, 0))
    for u, n in ((U0, -1), (U1, 1)):
        st.facen([(u, SV0, GF), (u, D, GF), (u, D, TOP + 0.6), (u, SV0, TOP + 0.6)], (n, 0, 0))
        br.facen([(u, SV0 if n > 0 else CV0, 0), (u, D, 0), (u, D, GF), (u, SV0 if n > 0 else CV0, GF)], (n, 0, 0))
    br.facen([(U1, D, 0), (U0, D, 0), (U0, D, GF), (U1, D, GF)], (0, 1, 0))
    # the white concrete frame: the slab's edges and floor slabs standing proud of the glass on the south face
    for k in range(7):
        z = GF + k * FH
        block(cc, WF(0, SV0, 0, -1), U0, U1, z - 0.18, z + 0.12, 0, 0.35, top=True, bottom=True)
    for u in (U0 + 0.25, U1 - 0.25):
        cc.box(u - 0.25, u + 0.25, SV0 - 0.35, SV0, GF, TOP + 0.6)
    cc.facen([(U0, SV0 - 0.35, TOP + 0.6), (U1, SV0 - 0.35, TOP + 0.6), (U1, D, TOP + 0.6), (U0, D, TOP + 0.6)], (0, 0, 1))
    cc.facen([(U0, SV0 - 0.35, TOP + 0.2), (U1, SV0 - 0.35, TOP + 0.2), (U1, SV0 - 0.35, TOP + 0.6), (U0, SV0 - 0.35, TOP + 0.6)], (0, -1, 0))
    # the penthouse: a row of pavilions with cantilevered flat roofs (the "hats" of ref 14), railings between
    for k in range(6):
        c = U0 + 3.5 + k * (W - 7) / 5
        mt.box(c - 2.0, c + 2.0, SV0 + 2.5, D - 1.5, TOP + 0.6, TOP + 3.1, top=False)
        dec.wall('conc', WF(0, SV0 + 2.5, 0, -1), c - 1.9, c + 1.9, TOP + 0.7, TOP + 3.0, d=0.02, crop=(0, 0.5, 0.3, 1))
        cc.box(c - 2.9, c + 2.9, SV0 + 1.2, D - 0.6, TOP + 3.1, TOP + 3.5, bottom=True)
    # the tall Portland stone chimney stack rising from the west end wall (ref 12)
    st.box(U0 - 0.2, U0 + 1.4, SV0 + 3.0, SV0 + 6.2, TOP + 0.6, TOP + 8.5)
    quad_uv(dec, 'rail', [(U0 + 0.2, SV0 + 0.1, TOP + 0.6), (U1 - 0.2, SV0 + 0.1, TOP + 0.6), (U1 - 0.2, SV0 + 0.1, TOP + 1.7), (U0 + 0.2, SV0 + 0.1, TOP + 1.7)], n=(0, -1, 0))
    # the ground floor under the slab, north of the concourse: glazed to the bus yard
    dec.wall('conc', WF(U1, 0, 1, 0), SV0, D - 0.4, 0.0, GF - 0.2, d=0.02)
    # the Store Street wing: curtain walls west and east (above the concourse roof), stone south end
    cw.facen([(U0, SV0, GF), (U0, 0, GF), (U0, 0, WTOP), (U0, SV0, WTOP)], (-1, 0, 0))
    cw.facen([(WU1, 0, CH), (WU1, SV0, CH), (WU1, SV0, WTOP), (WU1, 0, WTOP)], (1, 0, 0))
    st.facen([(U0, 0, GF), (WU1, 0, GF), (WU1, 0, WTOP + 0.4), (U0, 0, WTOP + 0.4)], (0, -1, 0))
    dec.wall('bname', WF(0, 0, 0, -1), U0 + 1.0, WU1 - 1.0, WTOP - 2.2, WTOP - 1.0, d=0.03)
    mosaic = WF(0, 0, 0, -1)
    dec.wall('tri', mosaic, U0 + 0.8, WU1 - 0.8, GF + 1.5, GF + 5.5, d=0.03, crop=(0, 1, 0, 1))
    cc.facen([(U0, 0, WTOP + 0.4), (WU1, 0, WTOP + 0.4), (WU1, SV0, WTOP + 0.4), (U0, SV0, WTOP + 0.4)], (0, 0, 1))
    for k in range(4):
        z = GF + k * FH
        block(cc, WF(U0, 0, -1, 0), -SV0, 0, z - 0.15, z + 0.1, 0, 0.3, top=True, bottom=True)
    # its ground floor on Store Street: glass under a brick fascia; the concourse doors at the south end
    dec.wall('conc', WF(U0, 0, -1, 0), -SV0 + 0.5, -0.5, 0.0, GF - 0.5, d=0.02)
    br.facen([(U0, 0, GF - 0.5), (U0, SV0, GF - 0.5), (U0, SV0, GF), (U0, 0, GF)], (-1, 0, 0))
    br.facen([(U0, 0, 0), (WU1, 0, 0), (WU1, 0, GF), (U0, 0, GF)], (0, -1, 0))
    dec.wall('conc', WF(0, 0, 0, -1), U0 + 0.8, WU1 - 0.8, 0.0, GF - 0.6, d=0.02)
    # the concourse: glazed to the south and the east, a flat roof, the curved glass bay on the Beresford Place side
    dec.wall('conc', WF(0, CV0, 0, -1), WU1, U1, 0.0, CH - 0.3, d=0.0)
    dec.wall('conc', WF(U1, 0, 1, 0), CV0, SV0, 0.0, CH - 0.3, d=0.0)
    cc.facen([(WU1, CV0, CH - 0.3), (U1, CV0, CH - 0.3), (U1, CV0, CH), (WU1, CV0, CH)], (0, -1, 0))
    mt.facen([(WU1, CV0, CH), (U1, CV0, CH), (U1, SV0, CH), (WU1, SV0, CH)], (0, 0, 1))
    BX, BR = 4.0, 4.2
    kit.lathe(dec, BX, CV0, [(BR, 0.0), (BR, CH - 0.3)], sides=8, a0=math.pi, a1=2 * math.pi, region='conc')
    kit.lathe(dec, BX, CV0, [(BR + 0.02, 2.2), (BR + 0.02, 3.0)], sides=8, a0=math.pi, a1=2 * math.pi, region='tri')
    kit.lathe(cc, BX, CV0, [(BR, CH - 0.3), (BR, CH), (0, CH)], sides=8, a0=math.pi, a1=2 * math.pi)
    # the wavy canopy: a folded concrete slab whose edge rises and falls, along the south front and the bus-yard side
    # (a folded plate: the folds run from the wall out to the edge, rising towards the edge; white concrete, refs 08, 14)
    def canopy(p0, p1, depth, wl=3.6, amp=0.95, z=6.2, t=0.4):
        L_ = math.hypot(p1[0] - p0[0], p1[1] - p0[1]); dx, dy = (p1[0] - p0[0]) / L_, (p1[1] - p0[1]) / L_
        nx, ny = dy, -dx                                     # out, to the right of the run
        n = max(4, int(L_ / (wl / 6)))
        pts = []
        for k in range(n + 1):
            s = L_ * k / n
            h = z + amp * math.cos(math.tau * s / wl)
            pts.append(((p0[0] + dx * s, p0[1] + dy * s), h))
        for k in range(n):
            (a, ha), (b, hb) = pts[k], pts[k + 1]
            ia, ib = z - 0.6 + (ha - z) * 0.45, z - 0.6 + (hb - z) * 0.45     # the folds, shallower at the wall
            A0, B0 = (a[0], a[1], ia), (b[0], b[1], ib)
            A1, B1 = (a[0] + nx * depth, a[1] + ny * depth, ha), (b[0] + nx * depth, b[1] + ny * depth, hb)
            cc.facen([(A0[0], A0[1], A0[2] + t), (B0[0], B0[1], B0[2] + t), (B1[0], B1[1], B1[2] + t), (A1[0], A1[1], A1[2] + t)], (0, 0, 1))  # the top
            cc.facen([A0, B0, B1, A1], (0, 0, -1))                                                           # the soffit
            cc.facen([A1, B1, (B1[0], B1[1], B1[2] + t), (A1[0], A1[1], A1[2] + t)], (nx, ny, 0))            # the edge
            cu.facen([(A1[0], A1[1], A1[2] + t), (B1[0], B1[1], B1[2] + t), (B1[0] - nx * 0.25, B1[1] - ny * 0.25, B1[2] + t + 0.02), (A1[0] - nx * 0.25, A1[1] - ny * 0.25, A1[2] + t + 0.02)], (0, 0, 1))  # the lip's flashing
        return pts
    canopy((WU1 - 0.5, CV0), (U1 + 5.5, CV0), CV0 - 0.4)
    canopy((U1, CV0), (U1, SV0 - 1), 5.5)
    for k in range(5):   # slim columns under the outer edge
        cc.box(WU1 + 3 + k * 6.5 - 0.15, WU1 + 3 + k * 6.5 + 0.15, 1.2, 1.5, 0, 5.4)
    # the bus yard: paving, three raised boarding islands
    YU1 = U1 + 22
    pv.facen([(U1, 0, 0.06), (YU1, 0, 0.06), (YU1, D, 0.06), (U1, D, 0.06)], (0, 0, 1))
    for k in range(3):
        u = U1 + 7 + k * 5
        pv.box(u, u + 1.4, 6.0, SV0 - 2, 0, 0.2)
    return finish('busaras', P)


roots = [clerys(), rotunda(), ambassador(), gate(), garden(), busaras()]
kit.export(os.path.join(OUT, 'northcity.glb'), os.path.join(SRC, 'northcity.blend'))
print('DONE')

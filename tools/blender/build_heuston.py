"""Heuston Station (Kingsbridge, Sancton Wood, 1846), v2: the granite head building, its wings and bellcotes, the
north return, the arcaded south range along St John's Road West and the train shed.

Run headless:  blender -b --factory-startup -P tools/blender/build_heuston.py -- public/models models

Sources: docs/research/heuston-v2.md (measurements in section 3, build brief in section 5) and refs/heuston/*.
The east front is a 9-bay Italianate palazzo, 32.4 m wide: a rusticated arcade with a pedimented doorcase in the
middle bay, a heavy balcony cornice, then one tier of tall round-headed windows between 8 engaged Corinthian columns
on pedestals, pediments alternating segmental (odd bays, the centre one too) and triangular, fruit swags between the
capitals, an entablature that breaks forward over every column, and a parapet: balustrades over the two outer bays
each side, a solid attic over the middle five (VIII VIC, three cartouches, AD 1844) between dies. The order returns
along both flanks (4 bays). Single-storey wings with a bellcote each (open round arches, pediments, a drum with oculi,
a stone dome), a two-storey north return, a long arcaded range along St John's Road West, and the shed behind.

Built at real size (u east out of the front, v north, z up; origin the middle of the east front at ground level) and
squeezed by kit.SCALE = (0.6, 0.64, 0.75) as the points are added, so the texture tiles stay in true (game) metres and
the arches and columns stay round. The wings keep their breakfront and one outer bay (the rest is cut) so the whole
front stays 32.5 game m, between the river and St John's Road West.

Materials: hs_granite, hs_rustic, hs_slate, hs_brick, hs_roof, hs_glass, hs_atlas (see src/world/heuston.js; the
atlas regions below must match HS_ATLAS there). The AO bake goes in COLOR_0.rgb and a floodlight mask in COLOR_0.a.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Atlas, WF, rect, block, arc_pts, opening, band, lathe, extrude_profile, hip
from heuston_atlas import HS_ATLAS

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')


bpy.ops.wm.read_factory_settings(use_empty=True)
kit.SCALE[:] = [0.6, 0.64, 0.75]
MAT = {n: kit.material('hs_' + n, c) for n, c in dict(granite=(0.42, 0.41, 0.38), rustic=(0.4, 0.39, 0.36), slate=(0.07, 0.08, 0.09),
                                                     brick=(0.26, 0.07, 0.04), roof=(0.16, 0.17, 0.18), glass=(0.34, 0.45, 0.51), atlas=(1, 1, 1)).items()}
gra, rus, sla, bri, roo, gla = (Part('hs_' + n) for n in ('granite', 'rustic', 'slate', 'brick', 'roof', 'glass'))
rus.tile = 3.3
atl = Atlas('hs_atlas', HS_ATLAS, 2048, 1024)

# ---------------- dimensions (real metres, docs/research/heuston-v2.md section 3) ----------------
HW, D, BAY = 16.2, 17.7, 3.6                  # main block half-width, depth, bay
SUP = [-HW + BAY * j for j in range(10)]      # the 10 supports (corner pilasters at the ends, 8 columns between)
BAYC = [-HW + BAY / 2 + BAY * k for k in range(9)]
FB = D / 4                                    # flank bay
GF, FRIEZE0, BAL0, BAL1 = 5.9, 5.9, 6.9, 7.7  # ground floor top, frieze band, balcony cornice
CAP0, ENT0, CORN1 = 14.6, 15.3, 17.3          # capitals, entablature bottom, cornice top
BF_U, WING_U, WING_V = -5.8, -7.6, 25.4       # wing breakfront face, outer bay face, wing outer edge
BF_V = HW + 6.2                               # breakfront runs HW .. BF_V
front = WF(0, 0, 1, 0)                         # s = v
north = WF(0, HW, 0, 1)                        # s = -u
south = WF(0, -HW, 0, -1)                      # s = u
rear = WF(-D, 0, -1, 0)                        # s = -v
ENT_FLOOD = [0, 0, 0, 0, 0, 0.35, 0.8, 0.8, 0.8, 0.4, 0.2, 0.1, 0.0]


def pediment(wf, sc, z, w, kind, proj=0.3, part=None):
    """Window pediment on consoles: horizontal cornice at z, triangular or segmental raking cornice above."""
    p = part or gra
    keep = p.flood; p.flood = 1.0
    block(p, wf, sc - w / 2, sc + w / 2, z, z + 0.2, 0, proj, top=True, bottom=True)
    zb, half = z + 0.2, w / 2 - 0.05
    if kind == 'tri':
        pts = [(sc - half, zb), (sc, zb + 0.72 * w / 2.4), (sc + half, zb)]
    else:
        rise = 0.5 * w / 2.4
        R = (half * half + rise * rise) / (2 * rise)
        a = math.asin(half / R)
        pts = arc_pts(sc, zb + rise - R, R, 6, math.pi / 2 + a, math.pi / 2 - a)
    p.facen([wf.p(s, zz, proj * 0.45) for s, zz in pts], wf.n3)          # tympanum
    band(p, wf, pts, 0.16, proj, ends=True)                                   # raking cornice
    for sg in (-1, 1):                                                        # consoles
        c = sc + sg * (w / 2 - 0.16)
        block(p, wf, c - 0.1, c + 0.1, z - 0.45, z, 0, proj * 0.7, top=False, bottom=True)
    p.flood = keep


def column(cx, cy, facing, sides=9, simple=False):
    """Three-quarter engaged Corinthian column on the piano nobile: base, entasis shaft, acanthus bell (atlas), abacus."""
    a = math.atan2(facing[1], facing[0])
    a0, a1 = a - 0.75 * math.pi, a + 0.75 * math.pi
    if simple:
        lathe(gra, cx, cy, [(0.6, 8.0), (0.475, 8.3), (0.44, 11.4), (0.41, CAP0)], sides, a0, a1, floods=[0.5, 0.3, 0.1])
    else:
        lathe(gra, cx, cy, [(0.62, 8.0), (0.55, 8.15), (0.475, 8.3), (0.46, 11.2), (0.41, CAP0)],
              sides, a0, a1, floods=[0.5, 0.5, 0.4, 0.1])
    lathe(atl, cx, cy, [(0.41, CAP0), (0.5, 14.95), (0.585, 15.2)], sides, a0, a1, region='capital')
    gra.box(cx - 0.62, cx + 0.62, cy - 0.62, cy + 0.62, 15.2, ENT0, top=False, bottom=True)


def swag(wf, sc, z0=13.7, w=2.0, h=0.62):
    pts = [(sc - w / 2, z0, 0.04), (sc, z0, 0.14), (sc + w / 2, z0, 0.04)]
    for (s0, _, d0), (s1, _, d1), t0, t1 in ((pts[0], pts[1], 0, 0.5), (pts[1], pts[2], 0.5, 1)):
        q = [wf.p(s0, z0, d0), wf.p(s1, z0, d1), wf.p(s1, z0 + h, d1), wf.p(s0, z0 + h, d0)]
        atl.facen(q, wf.n3, [atl.tc('swag', t0, 1), atl.tc('swag', t1, 1), atl.tc('swag', t1, 0), atl.tc('swag', t0, 0)])


def window(wf, s0, s1, sc, kind, arch=True, simple=False):
    """Piano-nobile bay s0..s1: the wall from the balcony cornice to the entablature with a round-headed window
    (recess, sash in the atlas), architrave, keystone, sill and pediment, and a swag under the capitals."""
    gra.flood = 0.15
    opening(gra, wf, s0, s1, BAL1, ENT0, sc, 1.6, 8.3, 10.7, segs=6, depth=0.25, back=('decal', atl, 'win'), rflood=1.0)
    gra.flood = 1.0
    ring = [(sc - 0.8, 8.3), (sc - 0.8, 10.7)] + arc_pts(sc, 10.7, 0.8, 6)[1:-1] + [(sc + 0.8, 10.7), (sc + 0.8, 8.3)]
    if not simple:
        band(gra, wf, ring, 0.2, 0.07)
    block(gra, wf, sc - 0.17, sc + 0.17, 11.35, 11.85, 0, 0.12, top=True, bottom=True)   # keystone
    block(gra, wf, sc - 1.0, sc + 1.0, 8.12, 8.3, 0, 0.14, top=True, bottom=True)        # sill
    gra.flood = 0.0
    pediment(wf, sc, 11.9, 2.4, kind)
    swag(wf, sc)


def balconette(wf, sc):
    for sg in (-1, 1):
        c = sc + sg * 0.95
        block(gra, wf, c - 0.13, c + 0.13, BAL1, 8.45, 0.02, 0.3, top=True)
        cx = wf.p(c, 0, 0.16)
        lathe(gra, cx[0], cx[1], [(0.0, 8.45), (0.13, 8.58), (0.0, 8.74)], 4, math.pi / 4, math.pi / 4 + math.tau)
    atl.wall('balcon', wf, sc - 0.82, sc + 0.82, BAL1, 8.4, d=0.16)


_last = [0]


def mark(label):
    t = sum(sum(len(f.verts) - 2 for f in p.bm.faces) for p in (gra, rus, sla, bri, roo, gla, atl))
    print('TRIS', label, t - _last[0]); _last[0] = t


# =============== MAIN BLOCK ===============
# ---- ground floor, east front: channelled rustication with 9 round arches (glazed entrances, arched windows in the
# end bays, a flat-headed doorcase under a segmental pediment in the middle bay), voussoirs, keystones
for k in range(9):
    s0, s1, sc = SUP[k], SUP[k + 1], BAYC[k]
    if k == 4:   # the doorcase
        opening(rus, front, s0, s1, 0.45, GF, sc, 1.6, 0.0, 3.2, segs=0, depth=0.4, back=('decal', atl, 'doorglaz'))
        for sg in (-1, 1):
            block(gra, front, sc + sg * 0.8 - 0.14, sc + sg * 0.8 + 0.14, 0.45, 3.4, 0, 0.1, top=False)       # pilaster strips
            block(gra, front, sc + sg * 1.02 - 0.12, sc + sg * 1.02 + 0.12, 3.0, 3.6, 0, 0.22, top=False, bottom=True)  # consoles
        block(gra, front, sc - 1.3, sc + 1.3, 3.6, 3.8, 0, 0.28, top=True, bottom=True)
        R, a = 1.69, math.asin(1.25 / 1.69)
        pts = arc_pts(sc, 3.8 + 0.5 - R, R, 6, math.pi / 2 + a, math.pi / 2 - a)
        gra.facen([front.p(s, z, 0.1) for s, z in pts], front.n3)
        band(gra, front, pts, 0.16, 0.26)
        continue
    region = 'archwin' if k in (0, 8) else 'doorglaz'
    sill = 0.9 if k in (0, 8) else 0.0
    opening(rus, front, s0, s1, 0.45 if sill else 0.0, GF, sc, 2.5, sill, 3.9, segs=8, depth=0.36, back=('decal', atl, region))
    atl.wall('vous', front, sc - 1.72, sc + 1.72, 3.9, 5.62, d=0.012)
    block(gra, front, sc - 0.24, sc + 0.24, 5.02, 5.66, 0, 0.12, top=True, bottom=True)       # keystone
mark('ground front')
# ---- the flanks' ground floor where it shows in front of the wings (one arched window each)
for wf, sg in ((north, 1), (south, -1)):
    s_of = (lambda u: -u) if sg > 0 else (lambda u: u)
    a, b = sorted((s_of(0.0), s_of(BF_U)))
    c = s_of(-2.3)
    opening(rus, wf, a, b, 0.45, GF, c, 2.2, 0.9, 3.9, segs=8, depth=0.36, back=('decal', atl, 'archwin'))
    atl.wall('vous', wf, c - 1.55, c + 1.55, 3.9, 5.45, d=0.012)
    block(gra, wf, c - 0.22, c + 0.22, 4.9, 5.5, 0, 0.12, top=True, bottom=True)
# plinth, frieze band with paterae, balcony cornice with block modillions: round the front and the exposed flanks
GPATH = [(BF_U, -HW), (0, -HW), (0, HW), (BF_U, HW)]
# plinth: under the piers and the end-bay windows, not across the entrances
cuts = [(BAYC[k] - 1.25, BAYC[k] + 1.25) for k in (1, 2, 3, 5, 6, 7)] + [(BAYC[4] - 0.8, BAYC[4] + 0.8)]
edges = sorted([-HW - 0.14] + [x for c in cuts for x in c] + [HW + 0.14])
for a, b in zip(edges[::2], edges[1::2]):
    block(gra, front, a, b, 0.0, 0.45, 0.0, 0.14, top=True, sides=True)
for wf, sg in ((north, 1), (south, -1)):
    a, b = sorted(((0.0 if sg > 0 else BF_U), (-BF_U if sg > 0 else 0.0)))
    block(gra, wf, a, b, 0.0, 0.45, 0.0, 0.14, top=True, sides=True)
extrude_profile(gra, GPATH, [(0.0, FRIEZE0), (0.08, FRIEZE0), (0.08, 6.6), (0.0, 6.6)])
extrude_profile(gra, GPATH, [(0.0, 6.6), (0.12, 6.6), (0.12, 7.2), (0.48, 7.2), (0.48, 7.5), (0.52, 7.55), (0.52, BAL1), (0.0, BAL1)],
                floods=[0, 0, 0.5, 0, 0, 0, 0])
for j in range(10):
    atl.wall('patera', front, SUP[j] - 0.24, SUP[j] + 0.24, 6.02, 6.5, d=0.09)
    for o in (-0.45, 0.45):
        block(gra, front, SUP[j] + o - 0.17, SUP[j] + o + 0.17, 6.62, 7.2, 0.0, 0.34, top=False, bottom=True)

mark('ground bands')
# ---- piano nobile, east front
for k in range(9):
    window(front, SUP[k], SUP[k + 1], BAYC[k], 'seg' if k % 2 == 0 else 'tri')
    balconette(front, BAYC[k])
for j in range(10):
    s = SUP[j]
    lo, hi = (s - 0.62, s + 0.62) if 0 < j < 9 else ((s - 0.7, s + 0.12) if j == 0 else (s - 0.12, s + 0.7))
    block(gra, front, lo, hi, BAL1, 8.0, 0.0, 0.7, top=True)                                  # pedestals
    if 0 < j < 9:
        column(0.3, s, (1, 0))
# corner pilasters: a square pier on each front corner, the capital painted on
for sg in (-1, 1):
    v0, v1 = (HW - 0.95, HW + 0.12) if sg > 0 else (-HW - 0.12, -HW + 0.95)
    gra.flood = 0.3
    gra.box(-0.95, 0.12, v0, v1, 8.0, CAP0, top=False)
    gra.flood = 0.0
    for wf, s0, s1 in ((front, v0, v1),):
        atl.wall('capital', wf, s0, s1, CAP0, ENT0 - 0.1, d=0.13, crop=(0.3, 0.7, 0, 1))
    gra.box(-1.05, 0.2, v0 - (0.08 if sg < 0 else 0), v1 + (0.08 if sg > 0 else 0), CAP0, ENT0, top=False, bottom=True)
mark('front piano')
# ---- piano nobile, flanks: 4 bays, the full order
for wf, sg in ((north, 1), (south, -1)):
    s_of = (lambda u: -u) if sg > 0 else (lambda u: u)
    for i in range(4):
        u0, u1 = -FB * i, -FB * (i + 1)
        a, b = sorted((s_of(u0), s_of(u1)))
        window(wf, a, b, (a + b) / 2, 'seg' if i % 2 == 0 else 'tri', simple=True)
        balconette(wf, (a + b) / 2)
    for i in range(1, 5):
        u = -FB * i
        c = s_of(u)
        block(gra, wf, c - 0.62, c + 0.62, BAL1, 8.0, 0.0, 0.7, top=True)
        if i < 4:
            p = wf.p(c, 0, 0.3)
            column(p[0], p[1], wf.n, sides=6, simple=True)
        else:
            gra.box(-D - 0.12, -D + 0.95, *( (HW - 0.95, HW + 0.12) if sg > 0 else (-HW - 0.12, -HW + 0.95)), 8.0, CAP0, top=False)
            gra.box(-D - 0.2, -D + 1.05, *( (HW - 1.0, HW + 0.2) if sg > 0 else (-HW - 0.2, -HW + 1.0)), CAP0, ENT0, top=False, bottom=True)
    # the corner pilaster seen from the flank side
    c = s_of(-0.4)
    atl.wall('capital', wf, c - 0.55, c + 0.55, CAP0, ENT0 - 0.1, d=0.13, crop=(0.3, 0.7, 0, 1))
# rear wall (against the shed)
rect(gra, rear, -HW, HW, 0, CORN1)

mark('flank piano')
# ---- entablature: architrave, frieze, modillion cornice; breaks forward (ressaut) over every column
UPATH = [(-D, -HW), (0, -HW), (0, HW), (-D, HW)]
ENT = [(0, ENT0), (0.12, ENT0), (0.12, 15.55), (0.16, 15.55), (0.16, 15.78), (0.08, 15.8), (0.08, 16.4), (0.28, 16.5),
       (0.28, 16.72), (1.0, 16.72), (1.0, 17.02), (1.12, 17.12), (1.12, CORN1), (0.0, CORN1)]
extrude_profile(gra, UPATH, ENT, floods=ENT_FLOOD)
RES = [(0, ENT0), (0.14, ENT0), (0.14, 16.45), (0.28, 16.55), (0.28, 16.72), (1.05, 16.72), (1.05, CORN1), (0, CORN1)]
RES_FLOOD = [0, 0.2, 0, 0.8, 0.8, 0.3, 0]
RO = 0.35
for j in range(10):
    s = SUP[j]
    if j == 0:
        path = [(-1.3, -HW), (-1.3, -HW - RO), (RO, -HW - RO), (RO, s + 0.62), (0, s + 0.62)]
    elif j == 9:
        path = [(0, s - 0.62), (RO, s - 0.62), (RO, HW + RO), (-1.3, HW + RO), (-1.3, HW)]
    else:
        path = [(-0.05, s - 0.62), (RO, s - 0.62), (RO, s + 0.62), (-0.05, s + 0.62)]
    extrude_profile(gra, path, RES, floods=RES_FLOOD)
    atl.wall('lion', front, s - 0.24, s + 0.24, 16.78, 17.24, d=1.05 + RO + 0.01) if 0 < j < 9 else None
for i in range(1, 5):
    u = -FB * i
    extrude_profile(gra, [(u + 0.62, HW - 0.05), (u + 0.62, HW + RO), (u - 0.62, HW + RO), (u - 0.62, HW - 0.05)] if i < 4 else
                    [(u + 0.62, HW - 0.05), (u + 0.62, HW + RO), (u - 0.2, HW + RO), (u - 0.2, HW - 0.05)], RES, floods=RES_FLOOD)
    extrude_profile(gra, [(u - 0.62, -HW + 0.05), (u - 0.62, -HW - RO), (u + 0.62, -HW - RO), (u + 0.62, -HW + 0.05)] if i < 4 else
                    [(u - 0.2, -HW + 0.05), (u - 0.2, -HW - RO), (u + 0.62, -HW - RO), (u + 0.62, -HW + 0.05)], RES, floods=RES_FLOOD)
# modillions: real brackets on the front, painted on the flank soffits
gra.flood = 0.8
s = -HW + 0.7
while s < HW - 0.6:
    near = min(abs(s - q) for q in SUP)
    if near > 0.8:
        block(gra, front, s - 0.11, s + 0.11, 16.46, 16.72, 0.28, 0.95, top=False, bottom=True, sides=False)
    s += 0.62
for j in range(1, 9):
    for o in (-0.3, 0.3):
        block(gra, front, SUP[j] + o - 0.11, SUP[j] + o + 0.11, 16.46, 16.72, 0.28 + RO, 0.95 + RO, top=False, bottom=True, sides=False)
gra.flood = 0.0
for sg in (-1, 1):
    y0, y1 = sg * (HW + 0.28), sg * (HW + 1.0)
    for u0, u1 in ((-D + 0.8, -0.8),):
        pts = [(u1, y0, 16.715), (u0, y0, 16.715), (u0, y1, 16.715), (u1, y1, 16.715)]
        L = (u1 - u0) / 4.2
        atl.facen(pts, (0, 0, -1), [atl.tc('modsoffit', 0, 1), atl.tc('modsoffit', L, 1), atl.tc('modsoffit', L, 0), atl.tc('modsoffit', 0, 0)])

mark('entablature')
# ---- parapet: plinth course, dies over the supports, balustrades over bays 1-2 and 8-9 (and the flanks' front
# bays), a solid attic over bays 3-7 with the inscriptions and three cartouches under segmental hoods
extrude_profile(gra, [(-D, -HW), (0, -HW), (0, HW), (-D, HW)], [(0.0, CORN1), (0.12, CORN1), (0.12, 17.55), (0.0, 17.55)], closed=True)
DIE0, DIE1 = 17.55, 19.0


def die(wf, s, corner=False, panel=False):
    lo, hi = (s - 0.5, s + 0.5)
    block(gra, wf, lo, hi, DIE0, DIE1, -0.8, 0.25, top=False, back=corner)
    block(gra, wf, lo - 0.08, hi + 0.08, DIE1, DIE1 + 0.12, -0.88, 0.33, top=False, bottom=True, back=True)
    block(gra, wf, lo - 0.02, hi + 0.02, DIE1 + 0.12, 19.35, -0.82, 0.27, top=True, back=True)
    if panel:
        atl.wall('diepanel', wf, s - 0.3, s + 0.3, 17.75, 18.85, d=0.26)


for j in range(10):
    die(front, SUP[j], corner=j in (0, 9), panel=2 <= j <= 7)
for wf, sg in ((north, 1), (south, -1)):
    s_of = (lambda u: -u) if sg > 0 else (lambda u: u)
    for i in (1, 2, 3, 4):
        die(wf, s_of(-FB * i + (0.5 if i == 4 else 0)), corner=(i == 4))


def balustrade(wf, s0, s1, z0=DIE0, d=-0.3):
    block(gra, wf, s0, s1, z0, z0 + 0.14, d - 0.25, d + 0.25, top=True)
    block(gra, wf, s0, s1, z0 + 0.72, z0 + 0.86, d - 0.28, d + 0.28, top=True, bottom=True, back=True)
    atl.wall('balus', wf, s0, s1, z0 + 0.14, z0 + 0.72, d=d, crop=(0, min(1, (s1 - s0) / 2.64), 0, 1))


for j in (0, 1, 7, 8):
    balustrade(front, SUP[j] + 0.5, SUP[j + 1] - 0.5)
for wf, sg in ((north, 1), (south, -1)):
    s_of = (lambda u: -u) if sg > 0 else (lambda u: u)
    for i in range(4):
        a, b = sorted((s_of(-FB * i), s_of(-FB * (i + 1))))
        a, b = a + 0.5, b - 0.5
        if i < 2:
            balustrade(wf, a, b)
        else:
            block(gra, wf, a, b, DIE0, 18.4, -0.55, 0.0, top=True, back=True)
# attic
ATT1 = 18.8
block(gra, front, SUP[2] + 0.5, SUP[7] - 0.5, DIE0, ATT1, -1.0, 0.0, top=True, sides=True)
for k in range(2, 7):
    sc = BAYC[k]
    gra.flood = 0.0
    R, a = 1.4, math.asin(1.1 / 1.4)
    pts = arc_pts(sc, ATT1 + 0.45 - R, R, 6, math.pi / 2 + a, math.pi / 2 - a)
    gra.facen([front.p(s, z, 0.0) for s, z in pts], front.n3)
    band(gra, front, pts, 0.14, 0.2)
    if k == 2:
        atl.wall('vic', front, sc - 1.05, sc + 1.05, 17.85, 18.6, d=0.01)
    elif k == 6:
        atl.wall('ad', front, sc - 1.05, sc + 1.05, 17.85, 18.6, d=0.01)
    else:   # a raised oval cartouche with a crowned shield
        ring = [(sc + 0.66 * math.cos(t * math.tau / 8), 18.22 + 0.5 * math.sin(t * math.tau / 8)) for t in range(8)]
        for (p, q) in zip(ring, ring[1:] + ring[:1]):
            m = ((p[0] + q[0]) / 2 - sc, (p[1] + q[1]) / 2 - 18.22)
            gra.facen([front.p(p[0], p[1], 0), front.p(q[0], q[1], 0), front.p(q[0], q[1], 0.16), front.p(p[0], p[1], 0.16)], front.dir(m[0], m[1], 0))
        atl.poly('arms', front, ring, 0.16, (sc - 0.66, sc + 0.66, 17.72, 18.72))

mark('parapet')
# ---- roof: a low hipped slate roof inside the parapet, chimney stacks, three flagpoles
sla.facen([(-D, -HW, 17.3), (0, -HW, 17.3), (0, HW, 17.3), (-D, HW, 17.3)], (0, 0, 1))
hip(sla, -D + 2.5, -2.5, -HW + 2.5, HW - 2.5, 17.3, 18.9)
for (cu, cv) in ((-6.0, 10.8), (-6.0, -10.8), (-15.0, 12.0), (-15.0, -12.0)):
    gra.box(cu - 0.6, cu + 0.6, cv - 1.3, cv + 1.3, 17.3, 21.0, top=False)
    gra.box(cu - 0.72, cu + 0.72, cv - 1.42, cv + 1.42, 21.0, 21.3, top=True, bottom=True)
    for o in (-0.8, 0.0, 0.8):
        bri.prism(cu, cv + o, 0.16, 21.3, 21.95, 6)
for fv in (-7.6, 0.0, 7.6):
    lathe(atl, -3.0, fv, [(0.12, 17.5), (0.07, 25.0), (0.14, 25.12), (0.1, 25.26), (0.0, 25.3)], 6, region='white')

mark('roof')
# =============== WINGS AND BELLCOTES ===============
WFR = WF(BF_U, 0, 1, 0)       # breakfront face, s = v
WOB = WF(WING_U, 0, 1, 0)     # outer bay face
for sg in (1, -1):
    lo, hi = sorted((sg * HW, sg * BF_V))
    olo, ohi = sorted((sg * BF_V, sg * WING_V))
    dc = sg * (HW + 3.1)    # breakfront / bellcote centre line
    # breakfront: rusticated wall, a panelled door in an aedicule (pilaster strips, scroll consoles, segmental
    # pediment), a Tuscan column at each end, entablature
    opening(rus, WFR, lo, hi, 0.0, 6.6, dc, 1.5, 0.0, 3.0, segs=0, depth=0.3, back=('decal', atl, 'door'))
    for o in (-1, 1):
        block(gra, WFR, dc + o * 0.9 - 0.13, dc + o * 0.9 + 0.13, 0.0, 3.2, 0, 0.1, top=False)
        block(gra, WFR, dc + o * 1.1 - 0.12, dc + o * 1.1 + 0.12, 2.5, 3.3, 0, 0.26, top=False, bottom=True)
    block(gra, WFR, dc - 1.35, dc + 1.35, 3.3, 3.5, 0, 0.3, top=True, bottom=True)
    R, a = 1.69, math.asin(1.25 / 1.69)
    pts = arc_pts(dc, 3.5 + 0.5 - R, R, 6, math.pi / 2 + a, math.pi / 2 - a)
    gra.facen([WFR.p(s, z, 0.1) for s, z in pts], WFR.n3)
    band(gra, WFR, pts, 0.16, 0.28)
    for cv in (lo + 0.55, hi - 0.55):
        lathe(gra, BF_U + 0.12, cv, [(0.5, 0.0), (0.38, 0.35), (0.33, 5.95), (0.44, 6.2), (0.44, 6.6)], 8,
              -0.75 * math.pi, 0.75 * math.pi, floods=[0.4, 0.4, 0.3, 0.1, 0, 0])
    # the step back to the outer bay, the outer bay with its arched window, the wing's outer side
    stepf = WF(0, sg * BF_V, 0, sg)
    a, b = sorted(((-BF_U if sg > 0 else BF_U), (-WING_U if sg > 0 else WING_U)))
    rect(rus, stepf, a, b, 0, 6.6)
    oc = (olo + ohi) / 2
    opening(rus, WOB, olo, ohi, 0.0, 6.6, oc, 1.3, 1.4, 3.55, segs=6, depth=0.3, back=('decal', atl, 'wingwin'))
    band(gra, WOB, [(oc - 0.65, 1.4), (oc - 0.65, 3.55)] + arc_pts(oc, 3.55, 0.65, 6)[1:-1] + [(oc + 0.65, 3.55), (oc + 0.65, 1.4)], 0.16, 0.06)
    block(gra, WOB, oc - 0.8, oc + 0.8, 1.25, 1.4, 0, 0.12, top=True, bottom=True)
    block(gra, WOB, (ohi - 0.5) if sg > 0 else olo, ohi if sg > 0 else (olo + 0.5), 0, 6.6, 0, 0.08, top=False)
    side = WF(0, sg * WING_V, 0, sg)
    a, b = sorted(((-WING_U if sg > 0 else WING_U), (D if sg > 0 else -D)))
    rect(rus, side, a, b, 0, 6.6)
    for u in (-11.5, -15.2):
        c = -u if sg > 0 else u
        atl.wall('wingwin', side, c - 0.65, c + 0.65, 1.4, 4.2, d=0.02)
    # entablature and parapet round the wing; flat roof
    if sg > 0:
        epath = [(BF_U, HW), (BF_U, BF_V), (WING_U, BF_V), (WING_U, WING_V), (-D, WING_V)]
        ppath = [(WING_U, BF_V), (WING_U, WING_V), (-D, WING_V)]
    else:
        epath = [(-D, -WING_V), (WING_U, -WING_V), (WING_U, -BF_V), (BF_U, -BF_V), (BF_U, -HW)]
        ppath = [(-D, -WING_V), (WING_U, -WING_V), (WING_U, -BF_V)]
    extrude_profile(gra, epath, [(0, 6.6), (0.1, 6.6), (0.1, 7.2), (0.36, 7.4), (0.36, 7.8), (0, 7.8)], floods=[0, 0, 0.5, 0, 0])
    extrude_profile(gra, ppath, [(0, 7.8), (0.05, 7.8), (0.05, 8.7), (-0.4, 8.7), (-0.4, 7.8)])
    atl.wall('balus', WOB, olo + 0.3, ohi - 0.3, 7.95, 8.55, d=0.06, crop=(0, (ohi - olo - 0.6) / 2.64, 0, 1))
    roo.facen([(-D, lo if sg > 0 else -WING_V, 7.8), (WING_U, lo if sg > 0 else -WING_V, 7.8), (WING_U, WING_V if sg > 0 else hi, 7.8), (-D, WING_V if sg > 0 else hi, 7.8)], (0, 0, 1))

    # ---- bellcote on the breakfront
    cu, cv = BF_U - 3.0, dc
    gra.box(BF_U - 6.0, BF_U, lo, hi, 7.8, 8.2, top=True)
    # balustrade round the podium between corner blocks (front and both sides)
    bu0, bu1, bv0, bv1 = BF_U - 6.0 + 0.2, BF_U - 0.2, lo + 0.2, hi - 0.2
    for (pu, pv) in ((bu1, bv0), (bu1, bv1), (bu0, bv0), (bu0, bv1)):
        gra.box(pu - 0.28, pu + 0.28, pv - 0.28, pv + 0.28, 8.2, 9.15, top=True)
    rails = [(WF(bu1, 0, 1, 0), bv0 + 0.28, bv1 - 0.28)]   # front, and the outer side (the inner side meets the main block)
    rails.append((WF(0, bv1, 0, 1), -bu1 + 0.28, -bu0 - 0.28) if sg > 0 else (WF(0, bv0, 0, -1), bu0 + 0.28, bu1 - 0.28))
    for wfp, a, b in rails:
        block(gra, wfp, a, b, 8.78, 8.95, -0.2, 0.2, top=True, bottom=True, back=True)
        atl.wall('balus', wfp, a, b, 8.2, 8.78, d=0.0, crop=(0, min(1, (b - a) / 2.64), 0, 1))
    # the stage: 4 walls with open round arches (sky shows through), paired corner columns
    su0, su1, sv0, sv1 = cu - 2.2, cu + 2.2, cv - 2.6, cv + 2.6
    gra.box(su0, su1, sv0, sv1, 8.2, 9.3, top=True)
    faces = [(WF(su1, 0, 1, 0), sv0, sv1, cv), (WF(su0, 0, -1, 0), -sv1, -sv0, -cv),
             (WF(0, sv1, 0, 1), -su1, -su0, -cu), (WF(0, sv0, 0, -1), su0, su1, cu)]
    for wf, a, b, c in faces:
        opening(gra, wf, a, b, 9.3, 13.5, c, 1.9, 9.45, 11.75, segs=6, depth=0.5, through=0.5)
        band(gra, wf, [(c - 0.95, 9.45), (c - 0.95, 11.75)] + arc_pts(c, 11.75, 0.95, 6)[1:-1] + [(c + 0.95, 11.75), (c + 0.95, 9.45)], 0.16, 0.07)
    gra.facen([(su0, sv0, 13.5), (su1, sv0, 13.5), (su1, sv1, 13.5), (su0, sv1, 13.5)], (0, 0, -1))   # ceiling
    for (pu, pv, du_, dv2) in ((su1, sv0, 1, -1), (su1, sv1, 1, 1), (su0, sv0, -1, -1), (su0, sv1, -1, 1)):
        for (ou, ov) in ((0.12 * du_, -0.42 * dv2), (-0.42 * du_, 0.12 * dv2)):
            lathe(gra, pu + ou, pv + ov, [(0.3, 9.3), (0.21, 13.05), (0.3, 13.3), (0.3, 13.5)], 6)
    extrude_profile(gra, [(su0, sv1), (su0, sv0), (su1, sv0), (su1, sv1)],
                    [(0, 13.5), (0.3, 13.5), (0.3, 13.85), (0.45, 13.95), (0.45, 14.1), (0, 14.1)], closed=True)
    # four pediments over a low stone roof that rises to the drum
    hip(gra, su0, su1, sv0, sv1, 14.1, 14.8)
    for wf, a, b, c in faces:
        half = (b - a) / 2 + 0.35
        pts = [(c - half, 14.1), (c, 14.95), (c + half, 14.1)]
        gra.facen([wf.p(s, z, 0.2) for s, z in pts], wf.n3)
        band(gra, wf, pts, 0.14, 0.42, d0=0.0)
    # drum with oculi, dome, finial
    lathe(gra, cu, cv, [(1.75, 14.1), (1.75, 15.1), (1.9, 15.18), (1.9, 15.3), (1.4, 15.3)], 8, math.pi / 8, math.pi / 8 + math.tau)
    flat = 1.75 * math.cos(math.pi / 8)
    for wf, c in ((WF(cu + flat, cv, 1, 0), 0), (WF(cu - flat, cv, -1, 0), 0), (WF(cu, cv + flat, 0, 1), 0), (WF(cu, cv - flat, 0, -1), 0)):
        atl.wall('oculus', wf, -0.3, 0.3, 14.4, 15.0, d=0.02)
        ring = arc_pts(0, 14.7, 0.3, 6, math.pi, -math.pi)
        band(gra, wf, ring, 0.1, 0.16, ends=False)
    lathe(gra, cu, cv, [(1.4, 15.3), (1.37, 15.62), (1.24, 15.95), (1.0, 16.25), (0.62, 16.5), (0.0, 16.62)], 16)
    lathe(gra, cu, cv, [(0.2, 16.6), (0.2, 16.88), (0.1, 16.92), (0.18, 17.05), (0.06, 17.18), (0.0, 17.45)], 6)

mark('wings+bellcotes')
# =============== NORTH RETURN (two storeys, hipped slate, big stacks) ===============
NU0, NU1, NV0, NV1 = -38.0, -D, HW + 0.8, WING_V - 0.1
gra.box(NU0, NU1, NV0, NV1, 0, 11.0, top=False)
extrude_profile(gra, [(NU1, NV1), (NU0, NV1), (NU0, NV0)], [(0, 10.4), (0.3, 10.5), (0.3, 11.0), (0, 11.0)])
extrude_profile(gra, [(NU1, NV0 + 0.1), (NU1, NV1)], [(0, 10.4), (0.3, 10.5), (0.3, 11.0), (0, 11.0)])
sla.facen([(NU0, NV0, 11.0), (NU1, NV0, 11.0), (NU1, NV1, 11.0), (NU0, NV1, 11.0)], (0, 0, 1))
hip(sla, NU0 - 0.3, NU1 + 0.3, NV0 - 0.3, NV1 + 0.3, 11.0, 13.5)
rn = WF(0, NV1, 0, 1)
for k in range(5):
    c = -NU1 + 2.2 + k * ((NU1 - NU0) - 4.4) / 4
    atl.wall('sash', rn, c - 0.75, c + 0.75, 1.6, 4.4, d=0.02)
    atl.wall('sash', rn, c - 0.75, c + 0.75, 6.4, 9.2, d=0.02)
re = WF(NU1, 0, 1, 0)
for c in (NV0 + 2.2, NV1 - 2.2):
    atl.wall('sash', re, c - 0.7, c + 0.7, 8.9, 10.2, d=0.02, crop=(0, 1, 0, 0.55))
for cu in (-22.5, -29.0, -35.0):
    gra.box(cu - 0.55, cu + 0.55, (NV0 + NV1) / 2 - 1.2, (NV0 + NV1) / 2 + 1.2, 12.0, 15.5, top=False)
    gra.box(cu - 0.66, cu + 0.66, (NV0 + NV1) / 2 - 1.32, (NV0 + NV1) / 2 + 1.32, 15.5, 15.75, top=True, bottom=True)
    for o in (-0.7, 0.0, 0.7):
        bri.prism(cu, (NV0 + NV1) / 2 + o, 0.15, 15.75, 16.35, 6)

mark('north return')
# =============== SOUTH RANGE ALONG ST JOHN'S ROAD WEST ===============
SV0, SV1 = -WING_V + 0.05, -HW - 2.2        # front (south) face, back
PU0, PU1 = -D, -27.0                         # the taller pavilion
LU1 = -79.8                                  # west end of the loggia
sf = WF(0, SV0, 0, -1)                       # s = u
# pavilion: an arched window below, a lunette above, cornice and blocking course
pc = (PU0 + PU1) / 2
opening(gra, sf, PU1, PU0, 0.0, 9.5, pc, 2.4, 0.6, 3.6, segs=8, depth=0.3, back=('decal', atl, 'archwin'))
atl.wall('lunette', sf, pc - 1.7, pc + 1.7, 6.2, 7.9, d=0.02)
band(gra, sf, [(pc - 1.7, 6.2)] + arc_pts(pc, 6.2, 1.7, 8)[1:-1] + [(pc + 1.7, 6.2)], 0.2, 0.08)
extrude_profile(gra, [(PU1, SV1), (PU1, SV0), (PU0, SV0)],
                [(0, 8.6), (0.3, 8.7), (0.3, 9.5), (0, 9.5)])
gra.box(PU1, PU0, SV0, SV1, 9.5, 10.3, top=True)
rect(gra, WF(PU1, 0, -1, 0), -SV1, -SV0, 0, 9.5)
rect(gra, WF(PU0, 0, 1, 0), SV0, SV1, 7.8, 10.3)
# loggia: a front skin of 12 open arches on piers with engaged Tuscan columns, the back wall with arched windows
NB = 12
LB = (PU1 - LU1) / NB
for k in range(NB):
    a = LU1 + k * LB
    b, c = a + LB, a + LB / 2
    opening(gra, sf, a, b, 0.0, 6.5, c, LB - 1.3, 0.0, 3.2, segs=6, depth=0.6, rflood=0.0)
    atl.wall('loggia', WF(0, SV0 + 3.0, 0, -1), c - 1.1, c + 1.1, 0.4, 4.0, d=0.02)
for k in range(NB + 1):
    u = LU1 + k * LB
    p = sf.p(u, 0, 0.32)
    lathe(gra, p[0], p[1], [(0.42, 0.0), (0.3, 0.35), (0.3, 4.4), (0.44, 4.75)], 6)
    gra.box(p[0] - 0.46, p[0] + 0.46, p[1] - 0.46, p[1] + 0.46, 4.75, 4.95, top=True, bottom=True)
rect(gra, WF(0, SV0 + 3.0, 0, -1), LU1, PU1, 0, 6.5)
gra.facen([(LU1, SV0 + 0.6, 4.9), (PU1, SV0 + 0.6, 4.9), (PU1, SV0 + 3.0, 4.9), (LU1, SV0 + 3.0, 4.9)], (0, 0, -1))
rect(gra, WF(LU1, 0, -1, 0), -SV1, -SV0, 0, 6.5)
extrude_profile(gra, [(LU1, SV1), (LU1, SV0), (PU1, SV0)],
                [(0, 4.95), (0.2, 5.0), (0.2, 5.6), (0.35, 5.75), (0.35, 6.5), (0.1, 6.5), (0.1, 7.3), (0, 7.3)])
roo.facen([(LU1, SV0, 6.5), (PU1, SV0, 6.5), (PU1, SV1, 6.5), (LU1, SV1, 6.5)], (0, 0, 1))
for k in range(NB):
    u = LU1 + (k + 0.5) * LB
    gra.box(u - 0.35, u + 0.35, SV0 + 0.1, SV0 + 0.7, 7.3, 8.2, top=True)

mark('south range')
# =============== TRAIN SHED ===============
SU0, SU1, SW = -D - 1.8, -190.0, HW + 2.2
bri.tile = 3.0
for wf, a, b in ((WF(0, SW, 0, 1), -SU0, -SU1), (WF(0, -SW, 0, -1), SU1, SU0)):
    rect(bri, wf, a, b, 0, 8.0)
    extrude_profile(gra, [(SU0, SW), (SU1, SW)] if wf.n[1] > 0 else [(SU1, -SW), (SU0, -SW)], [(0, 7.6), (0.2, 7.6), (0.2, 8.0), (0, 8.0)])
    c = a + 5.0
    while c < b - 3:
        if not (wf.n[1] < 0 and c > LU1 - 2) and not (wf.n[1] > 0 and c < -NU0 + 1):
            atl.wall('blind', wf, c - 1.5, c + 1.5, 0.8, 6.6, d=0.02)
        c += 8.2
pile = 2 * SW / 3
for k in range(3):
    y0 = -SW + k * pile
    ym = y0 + pile / 2
    roo.gable_x(SU1, SU0, y0, y0 + pile, 8.0, 13.0)
    # raised glazed lantern along each ridge
    zr = 13.0 - (1.8 / (pile / 2)) * 5.0
    for sgn in (-1, 1):
        gla.facen([(SU1 + 4, ym + sgn * 1.8, zr), (SU0 - 4, ym + sgn * 1.8, zr), (SU0 - 4, ym + sgn * 1.8, 13.9), (SU1 + 4, ym + sgn * 1.8, 13.9)], (0, sgn, 0))
    roo.gable_x(SU1 + 4, SU0 - 4, ym - 2.0, ym + 2.0, 13.9, 14.5)
    for x, f in ((SU1 + 4, -1), (SU0 - 4, 1)):
        gla.facen([(x, ym - 1.8, zr), (x, ym + 1.8, zr), (x, ym + 1.8, 13.9), (x, ym - 1.8, 13.9)], (f, 0, 0))
    for x, f in ((SU1, -1), (SU0, 1)):
        bri.facen([(x, y0, 8.0), (x, y0 + pile, 8.0), (x, ym, 13.0)], (f, 0, 0))
    band(gra, WF(SU1, 0, -1, 0), [(-(y0 + pile) - 0.1, 8.0), (-ym, 13.0), (-y0 + 0.1, 8.0)], 0.3, 0.2)
rect(bri, WF(SU1, 0, -1, 0), -SW, SW, 0, 8.0)

mark('shed')
# =============== finish ===============
parts = [(gra, 'granite'), (rus, 'rustic'), (sla, 'slate'), (bri, 'brick'), (roo, 'roof'), (gla, 'glass'), (atl, 'atlas')]
objs = [p.build(MAT[m]) for p, m in parts]
print('TRIANGLES before AO', kit.tris(objs))
kit.bake_ao_vertex(objs, distance=1.6, samples=32, cell=3.0, passes=1, flood=True)
root = bpy.data.objects.new('station', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs), {o.name: kit.tris([o]) for o in objs})
kit.export(os.path.join(OUT, 'heuston.glb'), os.path.join(SRC, 'heuston.blend'))
print('DONE')

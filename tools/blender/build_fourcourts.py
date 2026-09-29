"""The Four Courts, Inns Quay (Thomas Cooley 1776-84, James Gandon 1785-1802; rebuilt 1924-31 after 1922).

Run headless:  blender -b --factory-startup -P tools/blender/build_fourcourts.py -- public/models models

Sources: docs/research/four-courts.md (OSM relation 4264774, NIAH 50070269, Archiseek, refs/four-courts/).
- The central block (a 140 ft square): a hexastyle Corinthian portico of white Portland stone on a stepped platform,
  one return column each side, entablature and pediment (Moses on the apex, Justice and Mercy on its ends are statue-
  kit figures placed by the game); granite walls, rusticated below, a Portland entablature and balustrade round the
  top, coupled engaged Corinthian columns at the front corners (Wisdom and Authority stand over them).
- The drum: a plain granite podium, a peristyle of 24 Portland Corinthian columns round a drum wall with 12 windows,
  a Portland entablature ring, a granite attic, and the pale green copper stepped saucer dome.
- Either side, a courtyard closed to the river by an arcaded screen: open round arches on a rusticated granite base
  (railings in them), a Portland cornice and balustrade, a triumphal-arch gateway in the middle carrying a trophy.
- Three-storey granite pavilions at both ends (the fronts of the L-plan wings) and the back ranges, hipped slate roofs.

Built directly in game metres (no anisotropic scale): the central block and the drum at 0.8 of real in plan, the
courtyards and wings squeezed to ~0.55 so the 84 m front fits between Church Street and Chancery Place; heights are
given at 0.85 of real and stretched by 1.1 as they are added (kit.SCALE), so the dome crown is at ~36.5 m. Frame: X = u east along the river front, Y = v north into the building, Z up; origin on the screens' front
face on the dome axis. The game turns it parallel to Inns Quay (sites.js fourCourts).

Materials (game keys after the prefix, src/world/heroes.js stoneMaterials): fc_fportland (floodlit Portland stone),
fc_fgranite, fc_frustic, fc_fcopper, fc_slate, fc_lead, fc_dark, fc_decal (the shared window atlas: windows glow after
dark) and fc_fcut (the Parliament House atlas: capitals, balusters, railings, niches, the arms; alpha cut-outs).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

# the Parliament House decal atlas (px in 512; must match src/world/heroes.js PDECAL)
PATLAS = 512
PDECAL = dict(
    niche=(0, 0, 128, 256), roundel=(128, 0, 128, 128), coffer=(128, 128, 128, 128), ionic=(256, 0, 128, 64),
    corinth=(256, 64, 128, 128), lamp=(384, 0, 64, 64), door=(448, 0, 64, 128), blind=(384, 128, 128, 128),
    arms=(0, 256, 256, 128), balust=(256, 256, 256, 64), railing=(256, 320, 256, 64), triumph=(256, 384, 128, 128),
)


def pv(region, s, t):
    u0, v0, w, h = PDECAL[region]
    return ((u0 + s * w) / PATLAS, 1 - (v0 + t * h) / PATLAS)


REGP = lambda r: [pv(r, 0, 1), pv(r, 1, 1), pv(r, 1, 0), pv(r, 0, 0)]
REGD = lambda r: [kit.dv(r, 0, 1), kit.dv(r, 1, 1), kit.dv(r, 1, 0), kit.dv(r, 0, 0)]

bpy.ops.wm.read_factory_settings(use_empty=True)
# heights: the numbers below are 0.85 of real; everything is stretched 1.1 in height as it is added (0.94 of real) so
# the dome stands clear of the half-scale-plan, full-height quay terraces (sites.js FC.zs must match)
ZS_ = 1.1
kit.SCALE[:] = [1.0, 1.0, ZS_]
M = dict(portland=kit.material('fc_fportland', (0.72, 0.7, 0.66)), granite=kit.material('fc_fgranite', (0.45, 0.43, 0.4)),
         rustic=kit.material('fc_frustic', (0.36, 0.34, 0.31)), copper=kit.material('fc_fcopper', (0.25, 0.4, 0.33)),
         slate=kit.material('fc_slate', (0.08, 0.09, 0.1)), lead=kit.material('fc_lead', (0.15, 0.16, 0.17)),
         dark=kit.material('fc_dark', (0.01, 0.01, 0.01)), decal=kit.material('fc_decal', (1, 1, 1)), cut=kit.material('fc_fcut', (1, 1, 1)))
por, col, gra, rus = Part('fc_portland', 3.0), Part('fc_columns', 3.0), Part('fc_granite', 3.0), Part('fc_rustic', 2.6)
cop, sla, lea, drk = Part('fc_copper', 2.0), Part('fc_slate', 3.0), Part('fc_lead'), Part('fc_dark')
dec, cut = Part('fc_decal'), Part('fc_cut_decal')


# ---------------------------------------------------------------- geometry helpers (after build_parliament.py)
def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def oq(part, pts, n, uvs=None):
    """Polygon oriented so its normal points along n."""
    c = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]))
    if len(pts) > 3 and dot(c, c) < 1e-12:
        c = cross(sub(pts[2], pts[0]), sub(pts[3], pts[0]))
    if dot(c, n) < 0:
        pts = pts[::-1]
        uvs = uvs[::-1] if uvs else None
    return part.face(pts, uvs)


def box(part, x0, x1, y0, y1, z0, z1, faces='nsewt'):
    x0, x1 = min(x0, x1), max(x0, x1)
    y0, y1 = min(y0, y1), max(y0, y1)
    if 's' in faces: oq(part, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0))
    if 'n' in faces: oq(part, [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (0, 1, 0))
    if 'w' in faces: oq(part, [(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], (-1, 0, 0))
    if 'e' in faces: oq(part, [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], (1, 0, 0))
    if 't' in faces: oq(part, [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1))
    if 'b' in faces: oq(part, [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (0, 0, -1))


def dy(part, region, x0, x1, y, z0, z1, facing, atlas='d'):
    """A decal on a y-plane wall, read left to right from outside."""
    R = REGD(region) if atlas == 'd' else REGP(region)
    if facing < 0:
        oq(part, [(x0, y - 0.03, z0), (x1, y - 0.03, z0), (x1, y - 0.03, z1), (x0, y - 0.03, z1)], (0, -1, 0), R)
    else:
        oq(part, [(x1, y + 0.03, z0), (x0, y + 0.03, z0), (x0, y + 0.03, z1), (x1, y + 0.03, z1)], (0, 1, 0), R)


def dx(part, region, x, y0, y1, z0, z1, facing, atlas='d'):
    R = REGD(region) if atlas == 'd' else REGP(region)
    if facing > 0:
        oq(part, [(x + 0.03, y0, z0), (x + 0.03, y1, z0), (x + 0.03, y1, z1), (x + 0.03, y0, z1)], (1, 0, 0), R)
    else:
        oq(part, [(x - 0.03, y1, z0), (x - 0.03, y0, z0), (x - 0.03, y0, z1), (x - 0.03, y1, z1)], (-1, 0, 0), R)


def ring(part, x, y, r0, r1, z0, z1, n=10, cap=False, uvface=None, tile=3.0, a0=0.0):
    """Tapered prism r0 -> r1 (n sides, first vertex at angle a0). uvface: a Parliament-atlas region per side."""
    P0 = [(x + math.cos(a0 + k / n * math.tau) * r0, y + math.sin(a0 + k / n * math.tau) * r0) for k in range(n)]
    P1 = [(x + math.cos(a0 + k / n * math.tau) * r1, y + math.sin(a0 + k / n * math.tau) * r1) for k in range(n)]
    for k in range(n):
        j = (k + 1) % n
        a = a0 + (k + 0.5) / n * math.tau
        nr = (math.cos(a) * (z1 - z0), math.sin(a) * (z1 - z0), r0 - r1)
        if uvface:
            uv = REGP(uvface)
        else:
            c = math.tau * max(r0, r1) / n
            uv = [(k * c / tile, z0 / tile), ((k + 1) * c / tile, z0 / tile), ((k + 1) * c / tile, z1 / tile), (k * c / tile, z1 / tile)]
        oq(part, [(*P0[k], z0), (*P0[j], z0), (*P1[j], z1), (*P1[k], z1)], nr, uv)
    if cap:
        oq(part, [(*p, z1) for p in P1], (0, 0, 1))


def annulus(part, x, y, r0, r1, z, n, up=True, a0=0.0):
    """Flat ring between radii r0 < r1 at height z (a soffit if up=False)."""
    for k in range(n):
        a, b = a0 + k / n * math.tau, a0 + (k + 1) / n * math.tau
        pts = [(x + math.cos(a) * r0, y + math.sin(a) * r0, z), (x + math.cos(b) * r0, y + math.sin(b) * r0, z),
               (x + math.cos(b) * r1, y + math.sin(b) * r1, z), (x + math.cos(a) * r1, y + math.sin(a) * r1, z)]
        oq(part, pts, (0, 0, 1 if up else -1))


def sqr(part, x, y, h, z0, z1, faces='nsewt'):
    box(part, x - h, x + h, y - h, y + h, z0, z1, faces)


COUNT = [0]


def column(x, y, z0, zc, r, sides=10, cap_sides=None, plinth=True):
    """A Corinthian column: square plinth, base torus, tapered shaft, bell with a cut-out acanthus band, abacus."""
    COUNT[0] += 1
    cs = cap_sides or sides
    cap_h = 2.5 * r
    zb = z0
    if plinth:
        sqr(col, x, y, r * 1.32, z0, z0 + 0.8 * r, 'nsewt')
        zb = z0 + 0.8 * r
    ring(col, x, y, r * 1.2, r * 1.04, zb, zb + 0.55 * r, cs)
    ring(col, x, y, r, r * 0.87, zb + 0.55 * r, zc - cap_h, sides)
    ring(col, x, y, r * 0.87, r * 1.2, zc - cap_h, zc - 0.45 * r, cs)
    ring(cut, x, y, r * 0.95, r * 1.3, zc - cap_h, zc - 0.35 * r, cs, uvface='corinth')
    sqr(col, x, y, r * 1.42, zc - 0.45 * r, zc, 'nsewb')


class Frame:
    """Local frame on the ground: l along the face, d outwards (f), z up."""
    def __init__(self, ox, oy, fx, fy):
        L = math.hypot(fx, fy)
        self.o, self.f, self.t = (ox, oy), (fx / L, fy / L), (fy / L, -fx / L)

    def p(self, l, d, z):
        return (self.o[0] + self.t[0] * l + self.f[0] * d, self.o[1] + self.t[1] * l + self.f[1] * d, z)

    def n(self, nl, nd, nz):
        return (self.t[0] * nl + self.f[0] * nd, self.t[1] * nl + self.f[1] * nd, nz)


def lbox(part, F, l0, l1, d0, d1, z0, z1, faces='fbltr'):
    P = F.p
    if 'f' in faces: oq(part, [P(l0, d1, z0), P(l1, d1, z0), P(l1, d1, z1), P(l0, d1, z1)], F.n(0, 1, 0))
    if 'b' in faces: oq(part, [P(l0, d0, z0), P(l1, d0, z0), P(l1, d0, z1), P(l0, d0, z1)], F.n(0, -1, 0))
    if 'l' in faces: oq(part, [P(l0, d0, z0), P(l0, d1, z0), P(l0, d1, z1), P(l0, d0, z1)], F.n(-1, 0, 0))
    if 'r' in faces: oq(part, [P(l1, d0, z0), P(l1, d1, z0), P(l1, d1, z1), P(l1, d0, z1)], F.n(1, 0, 0))
    if 't' in faces: oq(part, [P(l0, d0, z1), P(l1, d0, z1), P(l1, d1, z1), P(l0, d1, z1)], (0, 0, 1))
    if 'u' in faces: oq(part, [P(l0, d0, z0), P(l1, d0, z0), P(l1, d1, z0), P(l0, d1, z0)], (0, 0, -1))


def ldecal(part, F, region, l0, l1, d, z0, z1, atlas='p'):
    """A decal quad in a frame's face plane at depth d, facing +d, read left to right from outside."""
    P = F.p
    R = REGP(region) if atlas == 'p' else REGD(region)
    # l runs to the right of the facing direction as seen from outside: flip so the image reads correctly
    oq(part, [P(l1, d, z0), P(l0, d, z0), P(l0, d, z1), P(l1, d, z1)], F.n(0, 1, 0), R)


def pediment(F, l0, l1, df, db, zb, apex, rake=0.45, tymp=0.3):
    """Pediment in a frame: tympanum recessed `tymp` behind the raking cornice at d = df, roof back to db."""
    lm = (l0 + l1) / 2
    P = F.p
    oq(gra, [P(l0 + rake, df - tymp, zb), P(l1 - rake, df - tymp, zb), P(lm, df - tymp, apex - rake)], F.n(0, 1, 0))
    oq(lea, [P(l0, df, zb), P(l0, db, zb), P(lm, db, apex), P(lm, df, apex)], F.n(-(apex - zb), 0, lm - l0))
    oq(lea, [P(l1, df, zb), P(l1, db, zb), P(lm, db, apex), P(lm, df, apex)], F.n(apex - zb, 0, lm - l0))
    k = rake * math.hypot(lm - l0, apex - zb) / (lm - l0)
    p = por
    for s0, s1 in ((l0, lm), (l1, lm)):
        sg = 1 if s0 < s1 else -1
        a, b = P(s0, df, zb), P(s1, df, apex)
        ai, bi = P(s0 + sg * rake * 1.6, df, zb), P(s1, df, apex - k)
        oq(p, [a, b, bi, ai], F.n(0, 1, 0))
        oq(p, [ai, bi, P(s1, df - tymp, apex - k), P(s0 + sg * rake * 1.6, df - tymp, zb)], F.n(0, 0, -1))
    oq(p, [P(l0, db, zb), P(l1, db, zb), P(lm, db, apex)], F.n(0, -1, 0))


def balustrade(F, l0, l1, z, bay=2.2, ped=None, depth=0.0, h=1.7):
    """Portland balustrade on a frame line: plinth, cut-out balusters, rail, optional pedestals every `ped` m."""
    lbox(por, F, l0, l1, depth - 0.3, depth + 0.3, z, z + 0.3, 'fbt')
    lbox(por, F, l0, l1, depth - 0.28, depth + 0.28, z + h - 0.28, z + h, 'fbtu')
    n = max(1, round((l1 - l0) / bay))
    for k in range(n):
        a, b = l0 + (l1 - l0) * k / n, l0 + (l1 - l0) * (k + 1) / n
        ldecal(cut, F, 'balust', a, b, depth, z + 0.3, z + h - 0.28)
    if ped:
        m = max(1, round((l1 - l0) / ped))
        for k in range(m + 1):
            l = l0 + (l1 - l0) * k / m
            lbox(por, F, l - 0.38, l + 0.38, depth - 0.38, depth + 0.38, z + 0.3, z + h - 0.28, 'fblr')


def arcade_wall(part, F, l0, l1, t, z0, z1, arches, spring, sill, rail=True, reveal=None):
    """A wall on frame F from l0 to l1, thickness t (from d = 0 back to d = -t), with open round arches: arches =
    [(centre, width), ...] springing at `spring`, from `sill`. Both faces, the reveals, railings in the openings."""
    P = F.p
    rv = reveal or part
    segs = 8
    for d, sgn in ((0.0, 1), (-t, -1)):
        nrm = F.n(0, sgn, 0)
        edges = [l0] + [e for c, w in arches for e in (c - w / 2, c + w / 2)] + [l1]
        # full-height piers between the openings
        for k in range(0, len(edges), 2):
            a, b = edges[k], edges[k + 1]
            if b - a > 1e-3:
                oq(part, [P(a, d, z0), P(b, d, z0), P(b, d, z1), P(a, d, z1)], nrm)
        for c, w in arches:
            r = w / 2
            oq(part, [P(c - r, d, z0), P(c + r, d, z0), P(c + r, d, sill), P(c - r, d, sill)], nrm)
            head = [(c - r * math.cos(math.pi * i / segs), spring + r * math.sin(math.pi * i / segs)) for i in range(segs + 1)]
            for (a, za), (b, zb) in zip(head, head[1:]):
                oq(part, [P(a, d, za), P(b, d, zb), P(b, d, z1), P(a, d, z1)], nrm)
            # spandrel strips beside the springing: the opening's straight jambs are open below `spring`
    for c, w in arches:
        r = w / 2
        head = [(c - r * math.cos(math.pi * i / segs), spring + r * math.sin(math.pi * i / segs)) for i in range(segs + 1)]
        ring_pts = [(c - r, sill), (c - r, spring)] + head[1:-1] + [(c + r, spring), (c + r, sill)]
        for (a, za), (b, zb) in zip(ring_pts, ring_pts[1:]):
            mz = (za + zb) / 2
            n = F.n(c - (a + b) / 2, 0, (spring if mz > spring + 1e-3 else mz) - mz)
            oq(rv, [P(a, 0, za), P(b, 0, zb), P(b, -t, zb), P(a, -t, za)], n)
        oq(rv, [P(c - r, 0, sill), P(c + r, 0, sill), P(c + r, -t, sill), P(c - r, -t, sill)], (0, 0, 1))
        if rail:
            ldecal(cut, F, 'railing', c - r, c + r, -t / 2, sill, sill + min(2.0, spring - sill))
    # top of the wall
    oq(part, [P(l0, 0, z1), P(l1, 0, z1), P(l1, -t, z1), P(l0, -t, z1)], (0, 0, 1))
    for l, s in ((l0, -1), (l1, 1)):
        oq(part, [P(l, 0, z0), P(l, -t, z0), P(l, -t, z1), P(l, 0, z1)], F.n(s, 0, 0))


# ---------------------------------------------------------------- key dimensions (game metres)
HB, VB0, VB1 = 17.5, 0.3, 35.3          # central block: half-width, front and back faces
DC = (0.0, 17.8)                        # the dome axis
ZP = 0.85                               # portico platform
ZC = 10.7                               # portico capitals top / architrave underside
ZA, ZE, ZBAL = 11.75, 12.4, 14.1        # frieze top, cornice top, balustrade top
ZAPEX = 15.6
ZR = 5.2                                # top of the rusticated storey
PORT_U = [-6.2, -3.72, -1.24, 1.24, 3.72, 6.2]
VPF, VPR = -2.4, 0.0                    # portico front and return column rows
RP = 0.5                                # portico column radius
US0, US1 = HB, 32.0                     # screen: from the block to the pavilion
UP1 = 42.0                              # pavilion outer face
VCB = 22.0                              # courtyard back (the back range's front)
VR = 49.0                               # the back of the complex (Chancery Street is just behind)
ZW, ZWR = 13.0, 16.4                    # wings: eaves, roof ridge

FS = Frame(0, 0, 0, -1)                 # facing south (the river): l runs west, d = -v

# ---------------------------------------------------------------- the portico
# platform with two steps
box(gra, -7.7, 7.7, VPF - 1.2, VB0, 0, 0.3, 'swet')
box(gra, -7.4, 7.4, VPF - 0.85, VB0, 0.3, 0.58, 'swet')
box(gra, -7.1, 7.1, VPF - 0.55, VB0, 0.58, ZP, 'swet')
for u in PORT_U:
    column(u, VPF, ZP, ZC, RP, 12, 10)
for u in (-6.2, 6.2):
    column(u, VPR, ZP, ZC, RP, 12, 10)
# entablature: architrave + frieze, cornice; coffered soffit
box(por, -6.95, 6.95, VPF - 0.6, VB0, ZC, ZA, 'sewb')
box(por, -7.35, 7.35, VPF - 0.95, VB0, ZA, ZE, 'sewb')
for k in range(4):
    u0 = -6.2 + k * 12.4 / 4
    oq(cut, [(u0 + 0.1, VPF + 0.5, ZC - 0.02), (u0 + 12.4 / 4 - 0.1, VPF + 0.5, ZC - 0.02), (u0 + 12.4 / 4 - 0.1, VB0 - 0.05, ZC - 0.02), (u0 + 0.1, VB0 - 0.05, ZC - 0.02)], (0, 0, -1), REGP('coffer'))
pediment(FS, -7.35, 7.35, -(VPF - 0.95), -(VB0 + 2.5), ZE, ZAPEX)
sqr(por, 0, VPF - 0.4, 0.5, ZAPEX - 0.35, ZAPEX + 0.5, 'nsewt')            # Moses's pedestal
for u in (-7.0, 7.0):
    sqr(por, u, VPF - 0.4, 0.45, ZE, ZE + 0.7, 'nsewt')                    # Justice, Mercy
# behind the portico: the round-headed door, two windows, three niches over
dy(cut, 'door', -1.3, 1.3, VB0, ZP, ZP + 5.2, -1, 'p')
for u in (-3.72, 3.72):
    dy(dec, 'sash', u - 0.75, u + 0.75, VB0, 1.9, 4.6, -1)
for u in (-3.72, 0, 3.72):
    dy(cut, 'niche', u - 0.8, u + 0.8, VB0, 6.0, 9.5, -1, 'p')
# railings between the columns on the platform
for a, b in zip(PORT_U, PORT_U[1:]):
    if abs(a) < 2 and abs(b) < 2:
        continue                                                            # the middle bay is open
    oq(cut, [(a + RP * 1.1, VPF, ZP), (b - RP * 1.1, VPF, ZP), (b - RP * 1.1, VPF, ZP + 2.1), (a + RP * 1.1, VPF, ZP + 2.1)], (0, -1, 0), REGP('railing'))

# ---------------------------------------------------------------- the central block
# front face either side of the portico, the side and back faces: rusticated storey, a platband, ashlar above
for s in (-1, 1):
    x0, x1 = sorted((s * 7.1, s * HB))
    box(rus, x0, x1, VB0, VB0, 0, ZR, 's')
    box(gra, x0, x1, VB0, VB0, ZR + 0.35, ZC, 's')
box(rus, -7.1, 7.1, VB0, VB0, 0, ZP, 's')
box(rus, -7.1, 7.1, VB0, VB0, ZP, ZR, 's')
box(gra, -7.1, 7.1, VB0, VB0, ZR + 0.35, ZC, 's')
box(por, -HB - 0.15, HB + 0.15, VB0 - 0.25, VB1 + 0.15, ZR, ZR + 0.35, 'sewnbt')        # platband
box(rus, -HB, HB, VB0, VB1, 0, ZR, 'ewn')
box(gra, -HB, HB, VB0, VB1, ZR + 0.35, ZC, 'ewn')
box(por, -HB - 0.1, HB + 0.1, VB0 - 0.1, VB1 + 0.1, ZC, ZA, 'sewnb')                     # frieze all round
box(por, -HB - 0.45, HB + 0.45, VB0 - 0.45, VB1 + 0.45, ZA, ZE, 'sewnbt')                 # cornice
box(lea, -HB, HB, VB0, VB1, ZE - 0.02, ZE - 0.02, 't')
# the front side bays: a window each storey, the upper one with a cornice; coupled engaged columns at the corners
for s in (-1, 1):
    u = s * 11.3
    dy(dec, 'sash', u - 0.8, u + 0.8, VB0, 1.4, 4.4, -1)
    dy(dec, 'sash', u - 0.8, u + 0.8, VB0, 6.3, 9.3, -1)
    box(por, u - 1.05, u + 1.05, VB0 - 0.25, VB0, 9.4, 9.65, 'sewbt')
    for uc in (s * 15.4, s * 16.75):
        column(uc, VB0 - 0.15, 0.0, ZC, 0.42, 8, 8)
    # Wisdom / Authority's pedestal over the coupled columns
    box(por, s * 15.1, s * 17.05, VB0 - 0.7, VB0 + 0.9, ZE, ZE + 0.8, 'sewnt')
# side and back windows (two storeys), five bays
for s in (-1, 1):
    for v in (4.0, 11.0, 18.0):
        for z0, z1 in ((1.4, 4.2), (6.3, 9.3)):
            dx(dec, 'sash', s * HB, v - 0.75, v + 0.75, z0, z1, s)
for u in (-12, -6, 0, 6, 12):
    for z0, z1 in ((6.3, 9.3),):
        dy(dec, 'sash', u - 0.75, u + 0.75, VB1, z0, z1, 1)
# the balustrade round the top (pedestals every few metres), broken by the pediment
for F, l0, l1 in ((Frame(0, VB0 - 0.1, 0, -1), -HB, -7.6), (Frame(0, VB0 - 0.1, 0, -1), 7.6, HB),
                  (Frame(HB + 0.1, 0, 1, 0), -VB1, -VB0), (Frame(-HB - 0.1, 0, -1, 0), VB0, VB1), (Frame(0, VB1 + 0.1, 0, 1), -HB, HB)):
    balustrade(F, l0, l1, ZE, ped=4.0)

# ---------------------------------------------------------------- the drum and dome
cx, cy = DC
Z_POD, Z_COL0, Z_COL1, Z_ENT, Z_ATT = ZE, 19.5, 25.3, 26.5, 27.9
R_POD, R_WALL, R_COL, R_ENT = 9.0, 7.4, 8.4, 9.05
N = 48
ring(gra, cx, cy, R_POD, R_POD, Z_POD, 18.8, N)                          # the plain podium
ring(por, cx, cy, R_POD + 0.35, R_POD + 0.35, 18.8, Z_COL0, N)           # its cornice / the colonnade platform
annulus(por, cx, cy, R_POD, R_POD + 0.35, 18.8, N, up=False)
annulus(por, cx, cy, R_WALL, R_POD + 0.35, Z_COL0, N)
ring(gra, cx, cy, R_WALL, R_WALL, Z_COL0, Z_ENT, 24)                     # the drum wall (behind the columns)
for k in range(24):                                                     # 24 Corinthian columns
    a = k / 24 * math.tau
    column(cx + math.cos(a) * R_COL, cy + math.sin(a) * R_COL, Z_COL0, Z_COL1, 0.36, 8, 8, plinth=False)
for j in range(12):                                                     # 12 windows, in alternate bays
    a = (j * 2 + 0.5) / 24 * math.tau
    ca, sa = math.cos(a), math.sin(a)
    wx, wy = cx + ca * (R_WALL * math.cos(math.pi / 24) + 0.04), cy + sa * (R_WALL * math.cos(math.pi / 24) + 0.04)
    tx, ty = -sa, ca
    w = 0.62
    oq(dec, [(wx - tx * w, wy - ty * w, 20.6), (wx + tx * w, wy + ty * w, 20.6), (wx + tx * w, wy + ty * w, 23.6), (wx - tx * w, wy - ty * w, 23.6)], (ca, sa, 0), REGD('sash'))
ring(por, cx, cy, R_ENT, R_ENT, Z_COL1, Z_ENT, N)                        # the entablature ring over the columns
annulus(por, cx, cy, R_WALL, R_ENT, Z_COL1, N, up=False)
ring(por, cx, cy, R_ENT + 0.3, R_ENT + 0.3, Z_ENT - 0.4, Z_ENT, N)       # its cornice
annulus(por, cx, cy, R_ENT, R_ENT + 0.3, Z_ENT - 0.4, N, up=False)
annulus(por, cx, cy, 8.3, R_ENT + 0.3, Z_ENT, N)
ring(gra, cx, cy, 8.3, 8.3, Z_ENT, Z_ATT, N)                             # the attic
annulus(por, cx, cy, 8.0, 8.45, Z_ATT, N)
ring(por, cx, cy, 8.45, 8.45, Z_ATT - 0.3, Z_ATT, N)
# the stepped copper saucer
steps = [(8.0, Z_ATT, 7.75, Z_ATT + 0.35), (7.75, Z_ATT + 0.35, 7.45, Z_ATT + 0.4), (7.45, Z_ATT + 0.4, 7.3, Z_ATT + 0.75)]
for r0, z0, r1, z1 in steps:
    ring(cop, cx, cy, r0, r1, z0, z1, N)
R_S, H_S = 7.3, 4.6                                                     # the saucer: base radius, rise
RS = (R_S ** 2 + H_S ** 2) / (2 * H_S)
Z_SP = Z_ATT + 0.75
prof = []
for i in range(8):
    r = R_S * (1 - i / 8)
    prof.append((r, Z_SP + math.sqrt(max(0.0, RS * RS - r * r)) - (RS - H_S)))
prof.append((0.0, Z_SP + H_S))
for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
    if r1 < 1e-6:
        for k in range(N):
            a, b = k / N * math.tau, (k + 1) / N * math.tau
            oq(cop, [(cx + math.cos(a) * r0, cy + math.sin(a) * r0, z0), (cx + math.cos(b) * r0, cy + math.sin(b) * r0, z0), (cx, cy, z1)], (math.cos(a), math.sin(a), 3))
    else:
        ring(cop, cx, cy, r0, r1, z0, z1, N)
# the small finial ring at the crown
ring(por, cx, cy, 0.55, 0.45, Z_SP + H_S - 0.08, Z_SP + H_S + 0.35, 10, cap=True)

# ---------------------------------------------------------------- the courtyard screens, triumphal arches
T = 0.9                                                                 # screen thickness (v 0 .. T)
ZS, ZSC = 6.2, 6.65                                                     # rusticated arcade top, cornice top
for s in (-1, 1):
    um = s * (US0 + US1) / 2                                            # the gateway centre
    F = Frame(0, 0, 0, -1)                                              # l = -u
    L = lambda u: -u
    lo, hi = sorted((L(s * US0), L(s * US1)))
    lm = L(um)
    half = (US1 - US0) / 2
    # arches: two each side of the gate
    arches = []
    for k in (1, 2):
        off = 2.7 + 0.89 + (k - 1) * 2.28
        arches += [(lm - off, 1.78), (lm + off, 1.78)]
    arches.sort()
    arcade_wall(rus, F, lo, lm - 2.2, T, 0, ZS, [a for a in arches if a[0] < lm], 3.6, 0.35)
    arcade_wall(rus, F, lm + 2.2, hi, T, 0, ZS, [a for a in arches if a[0] > lm], 3.6, 0.35)
    # the gateway: a wider, taller arch between rusticated piers, an attic with the arms and a trophy
    arcade_wall(rus, F, lm - 2.2, lm + 2.2, T + 0.3, 0, 8.4, [(lm, 2.9)], 4.3, 0.02, rail=False)
    box(por, um - 2.4, um + 2.4, -0.25, T + 0.35, 8.4, 8.85, 'sewnt')
    box(gra, um - 1.6, um + 1.6, -0.05, T + 0.1, 8.85, 10.3, 'sewnt')
    dy(cut, 'arms', um - 1.35, um + 1.35, -0.05, 8.95, 10.2, -1, 'p')
    box(gra, um - 0.55, um + 0.55, 0.1, T - 0.1, 10.3, 11.0, 'sewnt')
    ring(por, um, T / 2, 0.45, 0.2, 11.0, 12.1, 8, cap=True)           # the trophy, as a stone urn-and-arms stack
    for p in (-1.95, 1.95):
        box(por, um + p - 0.12, um + p + 0.12, -0.12, 0.0, 0.3, 8.4, 'sewt')   # pilaster strips on the piers
    # cornice and balustrade over the arcade either side of the gate
    for a, b in ((lo, lm - 2.4), (lm + 2.4, hi)):
        lbox(por, F, a, b, -(T + 0.25), 0.3, ZS, ZSC, 'fbtu')
        balustrade(Frame(0, T / 2, 0, -1), a, b, ZSC, bay=1.6, depth=0.0, h=1.3)
    # the courtyard floor, seen through the arches
    x0, x1 = sorted((s * US0, s * US1))
    box(gra, x0, x1, T, VCB, 0.02, 0.02, 't')

# ---------------------------------------------------------------- pavilions, wings and back ranges
def range_block(x0, x1, y0, y1, z1, faces='nsew', roof='hip', win=()):
    """A three-storey granite range: rusticated ground floor, ashlar above, a Portland cornice, slate roof."""
    box(rus, x0, x1, y0, y1, 0, 4.4, faces)
    box(gra, x0, x1, y0, y1, 4.4, z1, faces)
    box(por, x0 - 0.3, x1 + 0.3, y0 - 0.3, y1 + 0.3, z1, z1 + 0.45, 'nsewbt')
    if roof == 'hip':
        kit.hip(sla, x0, x1, y0, y1, z1 + 0.45, ZWR)
    else:
        sla.gable_x(x0, x1, y0, y1, z1 + 0.45, ZWR - 1.2)
        sla.gable_end_x(x0, y0, y1, z1 + 0.45, ZWR - 1.2, -1)
        sla.gable_end_x(x1, y0, y1, z1 + 0.45, ZWR - 1.2, 1)


for s in (-1, 1):
    xa, xb = sorted((s * US1, s * UP1))
    range_block(xa, xb, 0.0, VR, ZW, 'nsew')
    # the river front of the pavilion: arched ground floor, two storeys of windows
    for k in range(3):
        u = s * (US1 + (UP1 - US1) * (k + 0.5) / 3)
        dy(dec, 'arcade', u - 1.1, u + 1.1, 0.0, 0.3, 3.9, -1)
        dy(dec, 'sash', u - 0.7, u + 0.7, 0.0, 5.4, 8.0, -1)
        dy(dec, 'sash', u - 0.7, u + 0.7, 0.0, 9.3, 11.8, -1)
    box(por, xa - 0.3, xb + 0.3, -0.25, VR + 0.3, 4.4, 4.7, 'sewnt')   # platband
    # the outer flank (Church Street / Chancery Place) and the courtyard side: windows
    xo, xi = s * UP1, s * US1
    for v in [3.0 + 6.0 * k for k in range(8)]:
        for z0, z1 in ((1.3, 3.6), (5.4, 8.0), (9.3, 11.8)):
            dx(dec, 'sash', xo, v - 0.7, v + 0.7, z0, z1, s)
        if v > VCB + 1:
            continue
        for z0, z1 in ((5.4, 8.0), (9.3, 11.8)):
            dx(dec, 'sash', xi, v - 0.7, v + 0.7, z0, z1, -s)
    # the back range across the courtyard (between the block and the wing)
    xa2, xb2 = sorted((s * HB, s * US1))
    range_block(xa2, xb2, VCB, VR, ZW - 0.6, 'sn', roof='gable')
    for u in (s * 20.5, s * 24.75, s * 29.0):
        for z0, z1 in ((1.3, 3.6), (5.2, 7.8), (8.9, 11.2)):
            dy(dec, 'sash', u - 0.7, u + 0.7, VCB, z0, z1, -1)
# behind the central block: a lower range to the back line
box(rus, -HB, HB, VB1, VR, 0, 4.4, 'n')
box(gra, -HB, HB, VB1, VR, 4.4, 11.5, 'n')
box(por, -HB, HB, VR, VR + 0.3, 11.5, 11.9, 'nt')
box(lea, -HB, HB, VB1, VR, 11.5, 11.5, 't')
# granite chimney stacks along the wings' ridges (ref 05)
for s in (-1, 1):
    for v in (8.0, 20.0, 34.0):
        u = s * (US1 + UP1) / 2
        box(gra, u - 0.9, u + 0.9, v - 0.5, v + 0.5, ZWR - 1.6, ZWR + 1.3, 'nsewt')
        box(por, u - 1.05, u + 1.05, v - 0.62, v + 0.62, ZWR + 1.3, ZWR + 1.5, 'nsewtb')
for u in (-13, -8, -3, 3, 8, 13):
    for z0, z1 in ((1.3, 3.6), (5.2, 7.8), (8.4, 10.8)):
        dy(dec, 'sash', u - 0.7, u + 0.7, VR, z0, z1, 1)

objs = [por.build(M['portland']), col.build(M['portland']), gra.build(M['granite']), rus.build(M['rustic']),
        cop.build(M['copper']), sla.build(M['slate']), lea.build(M['lead']), dec.build(M['decal']), cut.build(M['cut'])]
if len(drk.bm.faces):
    objs.append(drk.build(M['dark']))
print('COLUMNS', COUNT[0])
print('TRIANGLES before bake', kit.tris(objs))
kit.bake_ao_vertex(objs, nosub=('fc_columns', 'fc_copper'), cell=4.0)
root = bpy.data.objects.new('fourcourts', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs))
kit.export(os.path.join(OUT, 'fourcourts.glb'), os.path.join(SRC, 'fourcourts.blend'))
print('DONE')

"""Parliament House / Bank of Ireland, College Green (Pearce 1729-39, Gandon 1785-89, Parke 1787-94, Johnston 1803).

Run headless:  blender -b --factory-startup -P tools/blender/build_parliament.py -- public/models models

Sources: docs/research/parliament-house.md (OSM column circles, NIAH, the 1767 Omer plan, refs/parliament-house/).
- The College Green front: an open rectangular piazza (33 x 13 m) behind bowed Kennan railings, ringed by an Ionic
  colonnade (4 + 4 on the back row, 2 more on each arm) with the tetrastyle pedimented portico in the middle carrying
  Hibernia, Fidelity and Commerce over the royal arms; an arch pavilion (a round arch between two columns under a
  pediment) at the front of each arm; then the two convex quadrant screen walls, windowless, 12 detached Ionic
  columns each, rusticated granite below the platband, blind niches above, entablature and Portland balustrade.
- East (Westmoreland St): Gandon's deep Corinthian House of Lords portico, 6 across plus one on each return, statues
  of Fortitude, Justice and Liberty; blind arcade and pedimented niches behind; the copper dome of the rotunda.
- West (Foster Place): Parke's shallow Ionic tetrastyle portico with a plain pediment.
- White Portland stone columns and dressings against grey granite walls; night uplighting is done in the game.

Local frame, real metres: X east along the front (u'), Y north into the building (v'), Z up. Origin: the middle of
the piazza front on the colonnade line (the arm-end columns). Scaled 0.43 east-west, 0.62 north-south and 0.9 in
height to fit between Foster Place and Westmoreland Street in the half-scale map. Columns, plinths and capitals are
built pre-compensated (elliptical in the model) so they come out round after the anisotropic scale.
Materials (game keys after the prefix): pr_portland, pr_pgranite, pr_prustic, pr_lead, pr_slate, pr_copper,
pr_dark, pr_pdecal, pr_pcut (alpha cut-outs, double-sided), pr_plamp. Parliament atlas: heroes.js PDECAL.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

SX, SY, SZ = 0.43, 0.62, 0.9

# parliament decal atlas (px in a 512 atlas; must match src/world/heroes.js PDECAL)
PATLAS = 512
PDECAL = dict(
    niche=(0, 0, 128, 256), roundel=(128, 0, 128, 128), coffer=(128, 128, 128, 128), ionic=(256, 0, 128, 64),
    corinth=(256, 64, 128, 128), lamp=(384, 0, 64, 64), door=(448, 0, 64, 128), blind=(384, 128, 128, 128),
    arms=(0, 256, 256, 128), balust=(256, 256, 256, 64), railing=(256, 320, 256, 64), triumph=(256, 384, 128, 128),
)


def pv(region, s, t):
    u0, v0, w, h = PDECAL[region]
    return ((u0 + s * w) / PATLAS, 1 - (v0 + t * h) / PATLAS)


REG = lambda r: [pv(r, 0, 1), pv(r, 1, 1), pv(r, 1, 0), pv(r, 0, 0)]

bpy.ops.wm.read_factory_settings(use_empty=True)
M = dict(portland=kit.material('pr_portland', (0.72, 0.7, 0.66)), granite=kit.material('pr_pgranite', (0.45, 0.43, 0.4)),
         rustic=kit.material('pr_prustic', (0.36, 0.34, 0.31)), lead=kit.material('pr_lead', (0.15, 0.16, 0.17)),
         slate=kit.material('pr_slate', (0.08, 0.09, 0.1)), copper=kit.material('pr_copper', (0.15, 0.38, 0.3)),
         dark=kit.material('pr_dark', (0.01, 0.01, 0.01)), decal=kit.material('pr_pdecal', (1, 1, 1)),
         cut=kit.material('pr_pcut', (1, 1, 1)), lamp=kit.material('pr_plamp', (1, 0.85, 0.6)))
por, col, gra, rus = Part('pr_portland', 3.0), Part('pr_columns', 3.0), Part('pr_pgranite', 3.0), Part('pr_prustic', 3.0)
lea, sla, cop, drk = Part('pr_lead'), Part('pr_slate', 3.0), Part('pr_copper'), Part('pr_dark')
dec, cut, lmp = Part('pr_pdecal'), Part('pr_cut_decal'), Part('pr_plamp')


# ---------------------------------------------------------------- geometry helpers
def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def oq(part, pts, n, uvs=None):
    """Polygon oriented so its normal points along n (any winding in, the right winding out)."""
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
    """Box in a frame: f(ront, +d), b(ack), l(eft, -l), r(ight, +l), t(op), u(nder)."""
    P = F.p
    if 'f' in faces: oq(part, [P(l0, d1, z0), P(l1, d1, z0), P(l1, d1, z1), P(l0, d1, z1)], F.n(0, 1, 0))
    if 'b' in faces: oq(part, [P(l0, d0, z0), P(l1, d0, z0), P(l1, d0, z1), P(l0, d0, z1)], F.n(0, -1, 0))
    if 'l' in faces: oq(part, [P(l0, d0, z0), P(l0, d1, z0), P(l0, d1, z1), P(l0, d0, z1)], F.n(-1, 0, 0))
    if 'r' in faces: oq(part, [P(l1, d0, z0), P(l1, d1, z0), P(l1, d1, z1), P(l1, d0, z1)], F.n(1, 0, 0))
    if 't' in faces: oq(part, [P(l0, d0, z1), P(l1, d0, z1), P(l1, d1, z1), P(l0, d1, z1)], (0, 0, 1))
    if 'u' in faces: oq(part, [P(l0, d0, z0), P(l1, d0, z0), P(l1, d1, z0), P(l0, d1, z0)], (0, 0, -1))


def ldecal(part, F, region, l0, l1, d, z0, z1):
    """Decal quad in a frame's face plane at depth d, facing +d."""
    P = F.p
    oq(part, [P(l0, d, z0), P(l1, d, z0), P(l1, d, z1), P(l0, d, z1)], F.n(0, 1, 0), REG(region))


def arc(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def arc_solid(part, cx, cy, r0, r1, a0, a1, n, z0, z1, faces='ot', tile=3.0):
    """Annular sector (a0 < a1, radians): o(uter), i(nner), t(op), u(nder), e(nds). Explicit metre UVs."""
    I, O = arc(cx, cy, r0, a0, a1, n), arc(cx, cy, r1, a0, a1, n)
    s = 0.0
    for k in range(n):
        seg = math.hypot(O[k + 1][0] - O[k][0], O[k + 1][1] - O[k][1])
        am = a0 + (a1 - a0) * (k + 0.5) / n
        nr = (math.cos(am), math.sin(am), 0)
        uv = [(s / tile, z0 / tile), ((s + seg) / tile, z0 / tile), ((s + seg) / tile, z1 / tile), (s / tile, z1 / tile)]
        if 'o' in faces: oq(part, [(*O[k], z0), (*O[k + 1], z0), (*O[k + 1], z1), (*O[k], z1)], nr, uv)
        if 'i' in faces: oq(part, [(*I[k], z0), (*I[k + 1], z0), (*I[k + 1], z1), (*I[k], z1)], (-nr[0], -nr[1], 0), uv)
        if 't' in faces: oq(part, [(*I[k], z1), (*O[k], z1), (*O[k + 1], z1), (*I[k + 1], z1)], (0, 0, 1))
        if 'u' in faces: oq(part, [(*I[k], z0), (*O[k], z0), (*O[k + 1], z0), (*I[k + 1], z0)], (0, 0, -1))
        s += seg
    if 'e' in faces:
        for k, sg in ((0, -1), (n, 1)):
            a = a0 if k == 0 else a1
            tn = (-math.sin(a) * sg, math.cos(a) * sg, 0)
            oq(part, [(*I[k], z0), (*O[k], z0), (*O[k], z1), (*I[k], z1)], tn)


def ring(part, x, y, r0, r1, z0, z1, n=10, cap=False, uvface=None, tile=3.0):
    """Tapered prism with final (post-scale) radii r0 -> r1: elliptical in the model so it scales round.
    uvface: an atlas region mapped once per side (acanthus leaves)."""
    P0 = [(x + math.cos(k / n * math.tau) * r0 / SX, y + math.sin(k / n * math.tau) * r0 / SY) for k in range(n)]
    P1 = [(x + math.cos(k / n * math.tau) * r1 / SX, y + math.sin(k / n * math.tau) * r1 / SY) for k in range(n)]
    for k in range(n):
        j = (k + 1) % n
        a = (k + 0.5) / n * math.tau
        nr = (math.cos(a) / SX, math.sin(a) / SY, 0)
        if uvface:
            uv = REG(uvface)
        else:
            c = math.tau * r0 / n
            uv = [(k * c / tile, z0 / tile), ((k + 1) * c / tile, z0 / tile), ((k + 1) * c / tile, z1 / tile), (k * c / tile, z1 / tile)]
        oq(part, [(*P0[k], z0), (*P0[j], z0), (*P1[j], z1), (*P1[k], z1)], nr, uv)
    if cap:
        oq(part, [(*p, z1) for p in P1], (0, 0, 1))


def sqr(part, x, y, h, z0, z1, faces='nsewt'):
    """Square block of final half-size h (pre-compensated)."""
    box(part, x - h / SX, x + h / SX, y - h / SY, y + h / SY, z0, z1, faces)


def fdir(fx, fy):
    """A final-space unit direction for a model-space normal (fx, fy)."""
    gx, gy = fx / SX, fy / SY
    L = math.hypot(gx, gy)
    return gx / L, gy / L


RF = 0.37  # final column radius at the base (game metres)
ZC = 10.6  # top of the capitals / underside of the architrave
COUNT = dict(ionic=0, corinthian=0)


def column(x, y, z0=0.0, order='ionic', face=(0, -1), both=True, zc=ZC):
    """A free-standing column: square plinth, torus, tapered shaft, capital. face: model-space outward normal."""
    COUNT[order] += 1
    sqr(col, x, y, RF * 1.32, z0, z0 + 0.45, 'nsewt')
    ring(col, x, y, RF * 1.2, RF * 1.05, z0 + 0.45, z0 + 0.8, 8)
    cap_h = 1.2 if order == 'corinthian' else 0.7
    ring(col, x, y, RF, RF * 0.86, z0 + 0.8, zc - cap_h, 10)
    fx, fy = fdir(*face)
    if order == 'ionic':
        sqr(col, x, y, RF * 1.28, zc - 0.28, zc, 'nsewb')
        # volutes: a cut-out strip across the capital, front (and back), wider than the shaft
        for sg in ((1, -1) if both else (1,)):
            cxf, cyf = fx * RF * 0.95 * sg, fy * RF * 0.95 * sg
            tx, ty = -fy, fx
            w = RF * 1.45
            pts = [(x + (cxf - tx * w) / SX, y + (cyf - ty * w) / SY, zc - 0.78), (x + (cxf + tx * w) / SX, y + (cyf + ty * w) / SY, zc - 0.78),
                   (x + (cxf + tx * w) / SX, y + (cyf + ty * w) / SY, zc - 0.22), (x + (cxf - tx * w) / SX, y + (cyf - ty * w) / SY, zc - 0.22)]
            oq(cut, pts, (fx * sg, fy * sg, 0), REG('ionic'))
    else:
        ring(col, x, y, RF * 0.86, RF * 1.22, zc - cap_h, zc - 0.25, 10)
        ring(cut, x, y, RF * 0.92, RF * 1.3, zc - cap_h, zc - 0.2, 10, uvface='corinth')
        sqr(col, x, y, RF * 1.42, zc - 0.25, zc, 'nsewb')


def pediment(part, F, l0, l1, df, db, zb, apex, rake=0.5, tymp=0.3):
    """Pediment in a frame: tympanum recessed `tymp` behind the raking cornice at d = df, roof back to db."""
    lm = (l0 + l1) / 2
    P = F.p
    oq(part, [P(l0, df - tymp, zb), P(l1, df - tymp, zb), P(lm, df - tymp, apex - rake)], F.n(0, 1, 0))
    # roof slopes
    oq(part, [P(l0, df, zb), P(l0, db, zb), P(lm, db, apex), P(lm, df, apex)], F.n(-(apex - zb), 0, lm - l0))
    oq(part, [P(l1, df, zb), P(l1, db, zb), P(lm, db, apex), P(lm, df, apex)], F.n(apex - zb, 0, lm - l0))
    # raking cornices: front faces and soffits
    k = rake * math.hypot(lm - l0, apex - zb) / (lm - l0)
    for s0, s1 in ((l0, lm), (l1, lm)):
        sg = 1 if s0 < s1 else -1
        a, b = P(s0, df, zb), P(s1, df, apex)
        ai, bi = P(s0 + sg * rake * 1.6, df, zb), P(s1, df, apex - k)
        oq(part, [a, b, bi, ai], F.n(0, 1, 0))
        oq(part, [ai, bi, P(s1, df - tymp, apex - k), P(s0 + sg * rake * 1.6, df - tymp, zb)], F.n(sg * 0, 0, -1))
    # back gable (seen from behind over lower roofs)
    oq(part, [P(l0, db, zb), P(l1, db, zb), P(lm, db, apex)], F.n(0, -1, 0))


def statue(x, y, z0, face, attr=None, h=2.4):
    """Proxy robed figure (Portland): skirt, torso, head, a raised arm, and an attribute (spear, anchor, scales)."""
    fx, fy = fdir(*face)
    ring(por, x, y, 0.36, 0.26, z0, z0 + h * 0.52, 6)
    ring(por, x, y, 0.26, 0.2, z0 + h * 0.52, z0 + h * 0.8, 6)
    ring(por, x, y, 0.12, 0.13, z0 + h * 0.8, z0 + h * 0.86, 6)
    ring(por, x, y, 0.15, 0.12, z0 + h * 0.86, z0 + h, 6, cap=True)
    tx, ty = -fy, fx
    ax, ay = x + tx * 0.3 / SX + fx * 0.08 / SX, y + ty * 0.3 / SY + fy * 0.08 / SY
    box(por, ax - 0.07 / SX, ax + 0.07 / SX, ay - 0.07 / SY, ay + 0.07 / SY, z0 + h * 0.55, z0 + h * 0.95)  # raised forearm
    if attr == 'spear':
        box(por, ax - 0.04 / SX, ax + 0.04 / SX, ay - 0.04 / SY, ay + 0.04 / SY, z0, z0 + h * 1.25)
    elif attr == 'anchor':
        bx, by = x - tx * 0.42 / SX, y - ty * 0.42 / SY
        box(por, bx - 0.05 / SX, bx + 0.05 / SX, by - 0.05 / SY, by + 0.05 / SY, z0, z0 + h * 0.6)
        box(por, bx - 0.25 * abs(tx) / SX - 0.05 / SX, bx + 0.25 * abs(tx) / SX + 0.05 / SX, by - 0.25 * abs(ty) / SY - 0.05 / SY, by + 0.25 * abs(ty) / SY + 0.05 / SY, z0 + h * 0.08, z0 + h * 0.15)
    elif attr == 'scales':
        box(por, ax - 0.3 * abs(tx) / SX - 0.03 / SX, ax + 0.3 * abs(tx) / SX + 0.03 / SX, ay - 0.3 * abs(ty) / SY - 0.03 / SY, ay + 0.3 * abs(ty) / SY + 0.03 / SY, z0 + h * 0.93, z0 + h * 0.97)
    elif attr == 'harp':
        bx, by = x - tx * 0.4 / SX + fx * 0.1 / SX, y - ty * 0.4 / SY + fy * 0.1 / SY
        box(por, bx - 0.08 / SX, bx + 0.08 / SX, by - 0.08 / SY, by + 0.08 / SY, z0 + h * 0.2, z0 + h * 0.6)


def balustrade_line(F, l0, l1, z, bay=2.6, ped=None, depth=0.0):
    """Straight Portland balustrade on a frame line: plinth, cut-out balusters, rail, pedestals every `ped` metres."""
    lbox(por, F, l0, l1, depth - 0.45, depth + 0.45, z, z + 0.45, 'fbt')
    lbox(por, F, l0, l1, depth - 0.4, depth + 0.4, z + 1.55, z + 2.0, 'fbtu')
    n = max(1, round((l1 - l0) / bay))
    for k in range(n):
        a, b = l0 + (l1 - l0) * k / n, l0 + (l1 - l0) * (k + 1) / n
        ldecal(cut, F, 'balust', a, b, depth, z + 0.45, z + 1.55)
    if ped:
        m = max(1, round((l1 - l0) / ped))
        for k in range(m + 1):
            l = l0 + (l1 - l0) * k / m
            lbox(por, F, l - 0.55, l + 0.55, depth - 0.55, depth + 0.55, z + 0.45, z + 1.55, 'fblr')


def railing_path(pts, z0=0.0, h=1.55, plinth=0.45):
    """Kennan railings: a granite plinth strip and a cut-out cast-iron railing, along a polyline (x, y)."""
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, by - ay)
        if L < 1e-3:
            continue
        F = Frame(ax, ay, (by - ay) / L, -(bx - ax) / L)  # f = right of travel, so l runs backwards along it
        lbox(gra, F, -L, 0, -0.3, 0.3, z0, z0 + plinth, 'fbt')
        ldecal(cut, F, 'railing', -L, 0, 0, z0 + plinth, z0 + plinth + h)


def lamp_standard(x, y, z0):
    ring(drk, x, y, 0.09, 0.07, z0, z0 + 2.4, 6)
    sqr(lmp, x, y, 0.2, z0 + 2.4, z0 + 3.05, 'nsew')
    sqr(drk, x, y, 0.25, z0 + 3.05, z0 + 3.2, 'nsewtb')


# ---------------------------------------------------------------- key levels (real metres; x0.9 in height)
ZP = 0.8          # piazza floor
ZA = 12.2         # top of architrave + frieze
ZE = 12.8         # top of the cornice
ZB = 14.8         # top of the balustrade
ZT = 16.2         # top of the main block's attic

# ---------------------------------------------------------------- piazza: floor, back row, arms, central portico
box(gra, -15.4, 15.4, -1.4, 17, 0, ZP, 'st')                     # piazza floor (the pavilions' bases flank it)
for s in (-1, 1):
    box(gra, *sorted((s * 15.4, s * 21)), 3.0, 17, 0, ZP, 't')      # the arms' walkways
box(gra, -12.2, 12.2, -2.1, -1.4, 0, ZP / 2, 'sewt')            # the step up from the gates
BACK = [16.55, 13.4, 10.25, 7.1]
for s in (-1, 1):
    for u in BACK:
        column(s * u, 13.0, ZP)
    for v in (4.33, 8.67):
        column(s * 16.55, v, ZP, face=(-s, 0))
for u in (-5.25, -2.05, 2.05, 5.25):
    column(u, 10.0, ZP)
# the walkways behind the colonnade: entablature, coffered soffits
box(por, -17.3, 17.3, 12.2, 17, ZC, ZA, 'sewb')
box(por, -17.8, 17.8, 11.8, 17, ZA, ZE, 'sewt')
for s in (-1, 1):
    box(por, *sorted((s * 6.8, s * 17.8)), 11.8, 12.2, ZA, ZA, 'b')   # cornice soffit beside the portico
    x0, x1 = sorted((s * 15.55, s * 21))
    box(por, x0, x1, 3.0, 12.2, ZC, ZA, 'ewb')
    xo0, xo1 = sorted((s * 15.15, s * 21))
    box(por, xo0, xo1, 3.0, 11.8, ZA, ZE, 'ewtb')
    # plain attic parapet over the arms
    xa0, xa1 = sorted((s * 15.9, s * 21))
    box(gra, xa0, xa1, 3.0, 17, ZE, ZE + 1.5, 'ewtn')
    for k in range(3):
        y0, y1 = 3.2 + k * 3.2, 3.2 + (k + 1) * 3.2
        oq(dec, [(s * 16.9, y0, ZC - 0.02), (s * 20.9, y0, ZC - 0.02), (s * 20.9, y1, ZC - 0.02), (s * 16.9, y1, ZC - 0.02)], (0, 0, -1), REG('coffer'))
    # the arm's back wall (seen through the columns), rusticated below
    box(rus, s * 21, s * 21, 2.8, 17, ZP, 5.5, 'e' if s < 0 else 'w')
    box(gra, s * 21, s * 21, 2.8, 17, 5.5, ZC, 'e' if s < 0 else 'w')
    for v in (6.5, 10.8):
        oq(dec, [(s * 20.97, v - 1.2, 5.9), (s * 20.97, v + 1.2, 5.9), (s * 20.97, v + 1.2, 9.6), (s * 20.97, v - 1.2, 9.6)], (-s, 0, 0), REG('niche'))
box(gra, -17.3, 17.3, 12.6, 17, ZE, ZE + 1.5, 'st')
for k in range(8):
    x0 = -16.55 + k * 33.1 / 8
    oq(dec, [(x0 + 0.2, 13.4, ZC - 0.02), (x0 + 33.1 / 8 - 0.2, 13.4, ZC - 0.02), (x0 + 33.1 / 8 - 0.2, 16.9, ZC - 0.02), (x0 + 0.2, 16.9, ZC - 0.02)], (0, 0, -1), REG('coffer'))
# central portico: projecting entablature, pediment with the royal arms, statues
box(por, -6.3, 6.3, 9.3, 12.2, ZC, ZA, 'sewb')
box(por, -6.8, 6.8, 8.9, 11.8, ZA, ZE, 'sewb')
FS = Frame(0, 0, 0, -1)                                      # facing south, l runs west
pediment(por, FS, -6.8, 6.8, -8.9, -13.0, ZE, 15.8)
oq(dec, [(-3.7, 9.18, 13.0), (3.7, 9.18, 13.0), (3.7, 9.18, 14.9), (-3.7, 9.18, 14.9)], (0, -1, 0), REG('arms'))
sqr(por, 0, 9.6, 0.45, 15.3, 16.1, 'nsewt'); statue(0, 9.6, 16.1, (0, -1), 'spear')            # Hibernia
sqr(por, -6.2, 9.4, 0.45, ZE, 13.5, 'nsewt'); statue(-6.2, 9.4, 13.5, (0, -1), 'harp')          # Fidelity
sqr(por, 6.2, 9.4, 0.45, ZE, 13.5, 'nsewt'); statue(6.2, 9.4, 13.5, (0, -1), 'anchor')          # Commerce
for k in range(3):
    x0 = -5.0 + k * 10.0 / 3
    oq(dec, [(x0 + 0.1, 9.6, ZC - 0.02), (x0 + 10 / 3 - 0.1, 9.6, ZC - 0.02), (x0 + 10 / 3 - 0.1, 12.1, ZC - 0.02), (x0 + 0.1, 12.1, ZC - 0.02)], (0, 0, -1), REG('coffer'))

# ---------------------------------------------------------------- the main block behind: doors and niches under the
# colonnade, a plain ashlar attic above it, a low slate roof
box(rus, -21, 21, 17, 17, ZP, 5.5, 's')
box(gra, -21, 21, 17, 17, 5.5, ZT - 0.5, 's')
box(gra, -21, 21, 17, 79, ZE, ZT - 0.5, 'ew')
box(gra, -21, 21, 79, 79, ZE, ZT - 0.5, 'n')
box(por, -21.3, 21.3, 16.7, 79, ZT - 0.5, ZT, 'sewtb')
for u in (-8.7, 0, 8.7):
    oq(dec, [(u - 1.4, 16.97, ZP), (u + 1.4, 16.97, ZP), (u + 1.4, 16.97, ZP + 4.6), (u - 1.4, 16.97, ZP + 4.6)], (0, -1, 0), REG('door'))
for u in (-13.0, -4.35, 4.35, 13.0):
    oq(dec, [(u - 1.3, 16.97, 5.7), (u + 1.3, 16.97, 5.7), (u + 1.3, 16.97, 9.4), (u - 1.3, 16.97, 9.4)], (0, -1, 0), REG('niche'))
sla.pyramid(0, 48, ZT, 20.5, 30.5, ZT + 3.2)

# ---------------------------------------------------------------- arch pavilions at the front of each arm
AW = 4.2                                       # arch width (model)
ARISE = AW / 2 * SX / SZ                       # a round arch after the anisotropic scale
ASPR = 6.6                                     # springing line
for s in (-1, 1):
    X = lambda u: s * u
    xa0, xa1 = sorted((X(17.45), X(17.45 + AW)))
    # piers either side of the arch, full height to the architrave
    box(gra, *sorted((X(15.6), X(17.45))), -0.2, 3.0, 0, ZC, 'nsew')
    box(gra, *sorted((X(17.45 + AW), X(23.5))), -0.2, 3.0, 0, ZC, 'nsew')
    # spandrel over the arch (front and back faces), and the barrel intrados
    A = [(xa0 + (xa1 - xa0) * (1 - math.cos(math.pi * i / 10)) / 2, ASPR + ARISE * math.sin(math.pi * i / 10)) for i in range(11)]
    for yf, nd in ((-0.2, -1), (3.0, 1)):
        for i in range(10):
            (x0, z0), (x1, z1) = A[i], A[i + 1]
            oq(gra, [(x0, yf, z0), (x1, yf, z1), (x1, yf, ZC), (x0, yf, ZC)], (0, nd, 0))
    for i in range(10):
        (x0, z0), (x1, z1) = A[i], A[i + 1]
        mx, mz = (x0 + x1) / 2 - (xa0 + xa1) / 2, (z0 + z1) / 2 - ASPR
        oq(gra, [(x0, -0.2, z0), (x1, -0.2, z1), (x1, 3.0, z1), (x0, 3.0, z0)], (-mx, 0, -mz))
    oq(por, [(xa0 - 0.3, -0.25, ASPR - 0.3), (xa1 + 0.3, -0.25, ASPR - 0.3), (xa1 + 0.3, -0.25, ASPR), (xa0 - 0.3, -0.25, ASPR)], (0, -1, 0))  # impost band
    for u in (16.55, 22.55):
        column(X(u), -0.75, ZP, face=(0, -1))
    box(gra, *sorted((X(15.4), X(23.7))), -1.5, 3.0, 0, ZP, 'swt' if s < 0 else 'set')
    # entablature, pediment and the raised attic behind it
    box(por, *sorted((X(15.2), X(23.9))), -1.4, 3.0, ZC, ZA, 'sewb')
    box(por, *sorted((X(15.0), X(24.1))), -1.75, 3.0, ZA, ZE, 'sewb')
    F = Frame(0, 0, 0, -1)
    l0, l1 = sorted((-X(15.0), -X(24.1)))
    pediment(por, F, l0, l1, 1.75, -1.0, ZE, 15.1)
    box(gra, *sorted((X(15.3), X(23.8))), -0.4, 3.0, ZE, 15.4, 'sewn')
    box(por, *sorted((X(15.15), X(23.95))), -0.55, 3.15, 15.4, 15.7, 'sewnt')

# ---------------------------------------------------------------- quadrant screen walls
QR, QW = 31.0, 29.6                              # column line and wall radii
QCY = 31.4
Q = {-1: (math.radians(-168), math.radians(-90)), 1: (math.radians(-90), math.radians(-12))}
NQ = 16
for s in (-1, 1):
    cx = s * 23.35
    a0, a1 = Q[s]
    arc_solid(gra, cx, QCY, QW - 0.4, QW + 0.5, a0, a1, NQ, 0, 0.5, 'ot')        # granite plinth course
    arc_solid(rus, cx, QCY, QW - 0.4, QW, a0, a1, NQ, 0.5, 5.5, 'o', 3.0)      # rusticated lower storey
    arc_solid(por, cx, QCY, QW - 0.4, QW + 0.3, a0, a1, NQ, 5.5, 5.9, 'otu')    # platband
    arc_solid(gra, cx, QCY, QW - 0.4, QW, a0, a1, NQ, 5.9, ZC, 'o', 3.0)       # ashlar upper storey
    arc_solid(por, cx, QCY, QW - 0.4, QR + 1.0, a0, a1, NQ, ZC, ZA, 'ou')       # architrave + frieze
    arc_solid(por, cx, QCY, QW - 0.4, QR + 1.45, a0, a1, NQ, ZA, ZE, 'otu')     # cornice
    # the flat roof behind the screen wall (a sector reaching back to the straight wings)
    ext = (math.radians(-180), a1) if s < 0 else (a0, math.radians(0))
    rr = arc(cx, QCY, QW - 0.4, ext[0], ext[1], NQ + 2)
    for (x0, y0), (x1, y1) in zip(rr, rr[1:]):
        oq(lea, [(cx, QCY, ZE - 0.1), (x0, y0, ZE - 0.1), (x1, y1, ZE - 0.1)], (0, 0, 1))
    # balustrade over the curve: plinth, balusters, rail, a pedestal over each column
    arc_solid(por, cx, QCY, QR - 0.2, QR + 0.8, a0, a1, NQ, ZE, ZE + 0.45, 'ot')
    arc_solid(por, cx, QCY, QR - 0.1, QR + 0.7, a0, a1, NQ, ZB - 0.45, ZB, 'otiu')
    B = arc(cx, QCY, QR + 0.3, a0, a1, NQ)
    for k in range(NQ):
        (x0, y0), (x1, y1) = B[k], B[k + 1]
        am = a0 + (a1 - a0) * (k + 0.5) / NQ
        oq(cut, [(x0, y0, ZE + 0.45), (x1, y1, ZE + 0.45), (x1, y1, ZB - 0.45), (x0, y0, ZB - 0.45)], (math.cos(am), math.sin(am), 0), REG('balust'))
    # 12 detached Ionic columns and the niche bays between them
    c0, c1 = (math.radians(-165), math.radians(-94)) if s < 0 else (math.radians(-86), math.radians(-15))
    angs = [c0 + (c1 - c0) * k / 11 for k in range(12)]
    for a in angs:
        column(cx + QR * math.cos(a), QCY + QR * math.sin(a), 0.0, face=(math.cos(a), math.sin(a)), both=False)
        F = Frame(cx + (QR + 0.3) * math.cos(a), QCY + (QR + 0.3) * math.sin(a), math.cos(a), math.sin(a))
        lbox(por, F, -0.7, 0.7, -0.6, 0.6, ZE + 0.45, ZB - 0.45, 'fblr')
    for k in range(11):
        a = (angs[k] + angs[k + 1]) / 2
        ca, sa = math.cos(a), math.sin(a)
        F = Frame(cx + QW * ca, QCY + QW * sa, ca, sa)
        tx, ty = -sa, ca
        w = 1.05 / math.hypot(tx * SX, ty * SY)          # a niche frame ~1.05 m wide after scaling
        ldecal(dec, F, 'niche', -w / 2, w / 2, 0.03, 6.0, 9.55)
        lbox(por, F, -w / 2 - 0.25, w / 2 + 0.25, 0, 0.4, 9.55, 9.9, 'fltr')

# ---------------------------------------------------------------- corner blocks, west (Foster Place) and east fronts
def flank(xw, face, y0, y1, bays=(), roundels=(), niche_ped=(), bands=True):
    """A straight flank wall in the plane x = xw facing `face` (+1 east / -1 west) from y0 to y1."""
    fs = 'e' if face > 0 else 'w'
    box(rus, xw, xw, y0, y1, 0, 5.5, fs)
    box(por, xw, xw + face * 0.3, y0, y1, 5.5, 5.9, fs + 'tbns')
    box(gra, xw, xw, y0, y1, 5.9, ZC, fs)
    if bands:                                                   # (a portico's own entablature covers these)
        box(por, xw, xw + face * 0.45, y0, y1, ZC, ZA, fs + 'bns')
        box(por, xw, xw + face * 0.8, y0, y1, ZA, ZE, fs + 'tbns')
    F = Frame(xw, 0, face, 0)
    for v in bays:
        l = F.t[1] * v
        ldecal(dec, F, 'niche', l - 1.2, l + 1.2, 0.03, 6.0, 9.55)
        lbox(por, F, l - 1.45, l + 1.45, 0, 0.4, 9.55, 9.9, 'fltr')
    for v in niche_ped:                                         # pedimented niches
        l = F.t[1] * v
        ldecal(dec, F, 'niche', l - 1.2, l + 1.2, 0.03, 6.0, 9.4)
        lbox(por, F, l - 1.45, l + 1.45, 0, 0.35, 9.4, 9.6, 'fltr')
        pediment(por, F, l - 1.5, l + 1.5, 0.4, 0.0, 9.6, 10.35, rake=0.18, tymp=0.12)
    for v in roundels:
        l = F.t[1] * v
        ldecal(dec, F, 'roundel', l - 0.9, l + 0.9, 0.03, 7.3, 8.55)    # round after the 0.62 / 0.9 scale


# west corner block and the Foster Place front (portico in the middle)
box(rus, -55.4, -51.4, 23.5, 23.5, 0, 5.5, 's')
box(gra, -55.4, -51.4, 23.5, 23.5, 5.5, ZE, 's')
box(lea, -55.4, -21, 23.5, 79, ZE - 0.05, ZE - 0.05, 't')
flank(-55.4, -1, 23.5, 33.0, bays=(28.2,))
flank(-55.4, -1, 33.0, 45.6, bands=False)
flank(-55.4, -1, 45.6, 79, bays=(51, 56.5, 62), roundels=(53.8, 59.2))
F = Frame(-55.4, 0, -1, 0)
ldecal(dec, F, 'triumph', F.t[1] * 69.5 - 3.6, F.t[1] * 69.5 + 3.6, 0.03, 0.0, 9.9)
# Foster Place portico: shallow, Ionic tetrastyle, plain pediment
for v in (33.1, 37.23, 41.37, 45.5):
    column(-59.55, v, 0.35, face=(-1, 0))
box(gra, -61.0, -55.4, 31.7, 46.9, 0, 0.35, 'nswt')
box(por, -60.45, -55.4, 32.3, 46.3, ZC, ZA, 'nswb')
box(por, -60.85, -55.4, 31.9, 46.7, ZA, ZE, 'nswb')
FW = Frame(0, 0, -1, 0)                                     # facing west: l = +v
pediment(por, FW, 31.9, 46.7, 60.85, 55.4, ZE, 15.5)
for k in range(3):
    y0 = 33.3 + k * 4.0
    oq(dec, [(-59.0, y0, ZC - 0.02), (-55.6, y0, ZC - 0.02), (-55.6, y0 + 3.9, ZC - 0.02), (-59.0, y0 + 3.9, ZC - 0.02)], (0, 0, -1), REG('coffer'))
for v in (35.2, 39.3, 43.4):
    oq(dec, [(-55.37, v - 1.7, 0.35), (-55.37, v + 1.7, 0.35), (-55.37, v + 1.7, 5.3), (-55.37, v - 1.7, 5.3)], (-1, 0, 0), REG('blind' if v != 39.3 else 'door'))
for v in (35.2, 43.4):
    oq(dec, [(-55.37, v - 1.2, 6.0), (-55.37, v + 1.2, 6.0), (-55.37, v + 1.2, 9.4), (-55.37, v - 1.2, 9.4)], (-1, 0, 0), REG('niche'))
FWn = Frame(-55.4, 0, -1, 0)
for v in (35.2, 43.4):
    l = FWn.t[1] * v
    lbox(por, FWn, l - 1.45, l + 1.45, 0, 0.35, 9.4, 9.6, 'fltr')
    pediment(por, FWn, l - 1.5, l + 1.5, 0.4, 0.0, 9.6, 10.35, rake=0.18, tymp=0.12)

# east corner block, the House of Lords portico, the east front north of it
box(rus, 51.4, 55.4, 23.5, 23.5, 0, 5.5, 's')
box(gra, 51.4, 55.4, 23.5, 23.5, 5.5, ZE, 's')
box(lea, 21, 55.4, 23.5, 79, ZE - 0.05, ZE - 0.05, 't')
flank(55.4, 1, 23.5, 37.0, niche_ped=(27.0, 33.2))
box(rus, 51.85, 55.4, 37.0, 37.0, 0, 5.5, 'n')             # the corner block's return inside the portico
box(gra, 51.85, 55.4, 37.0, 37.0, 5.5, ZC, 'n')
flank(51.85, 1, 37.0, 57.4, bands=False)
flank(51.85, 1, 57.4, 79, bays=(62.5,), roundels=(66.0,))
F = Frame(51.85, 0, 1, 0)
ldecal(dec, F, 'triumph', F.t[1] * 72.5 - 3.6, F.t[1] * 72.5 + 3.6, 0.03, 0.0, 9.9)
LORDS = [38.0 + k * 3.66 for k in range(6)]
for v in LORDS:
    column(61.95, v, 0.0, order='corinthian', face=(1, 0))
for v in (LORDS[0], LORDS[-1]):
    column(57.0, v, 0.0, order='corinthian', face=(0, 1 if v > 47 else -1))
box(gra, 51.85, 63.1, 36.8, 57.6, 0, 0.3, 'nset')
box(por, 51.85, 62.85, 37.2, 57.2, ZC, ZA, 'nseb')
box(por, 51.85, 63.3, 36.8, 57.6, ZA, ZE, 'nseb')
FE = Frame(0, 0, 1, 0)                                      # facing east: l = -v
pediment(por, FE, -57.6, -36.8, 63.3, 51.85, ZE, 16.0)
sqr(por, 62.4, 47.2, 0.45, 15.5, 16.3, 'nsewt'); statue(62.4, 47.2, 16.3, (1, 0), 'scales')    # Justice
sqr(por, 62.4, 37.3, 0.45, ZE, 13.5, 'nsewt'); statue(62.4, 37.3, 13.5, (1, 0), 'spear')       # Fortitude
sqr(por, 62.4, 57.1, 0.45, ZE, 13.5, 'nsewt'); statue(62.4, 57.1, 13.5, (1, 0), 'spear')       # Liberty (with her pole)
for i in range(2):
    for k in range(5):
        x0, y0 = 52.2 + i * 4.9, 37.5 + k * 3.95
        oq(dec, [(x0, y0, ZC - 0.02), (x0 + 4.7, y0, ZC - 0.02), (x0 + 4.7, y0 + 3.8, ZC - 0.02), (x0, y0 + 3.8, ZC - 0.02)], (0, 0, -1), REG('coffer'))
FEw = Frame(51.85, 0, 1, 0)
for v in (39.2, 43.2, 47.2, 51.2, 55.2):
    l = FEw.t[1] * v
    ldecal(dec, FEw, 'door' if v == 47.2 else 'blind', l - 1.7, l + 1.7, 0.03, 0.3, 5.3)
    ldecal(dec, FEw, 'niche', l - 1.2, l + 1.2, 0.03, 6.0, 9.4)
    lbox(por, FEw, l - 1.45, l + 1.45, 0, 0.35, 9.4, 9.6, 'fltr')
    pediment(por, FEw, l - 1.5, l + 1.5, 0.4, 0.0, 9.6, 10.35, rake=0.18, tymp=0.12)
for v in (44.6, 49.8):                                      # lanterns either side of the door
    l = FEw.t[1] * v
    lbox(drk, FEw, l - 0.08, l + 0.08, 0, 0.7, 4.3, 4.45, 'fltru')
    lbox(lmp, FEw, l - 0.25, l + 0.25, 0.45, 0.95, 3.7, 4.4, 'fltru')

# balustrades along the flanks and the north wall
balustrade_line(Frame(-55.1, 0, -1, 0), 23.5, 31.9, ZE, ped=7)
balustrade_line(Frame(-55.1, 0, -1, 0), 46.7, 79, ZE, ped=7)
balustrade_line(Frame(55.1, 0, 1, 0), -37.0, -23.5, ZE, ped=6.8)
balustrade_line(Frame(51.55, 0, 1, 0), -79, -57.6, ZE, ped=7)
box(gra, -55.4, 51.85, 79, 79, 0, ZE, 'n')
box(por, -55.4, 51.85, 79, 79.4, ZA, ZE, 'ntb')
for s in (-1, 1):                                          # the corner blocks' own caps
    box(por, *sorted((s * 51.4, s * 55.4)), 23.3, 23.5 + 0.01, ZC, ZE, 's')

# copper dome over the east rotunda (seen from Westmoreland Street)
ring(gra, 43.85, 47.3, 2.3, 2.3, ZE - 0.1, 15.2, 16)
ring(por, 43.85, 47.3, 2.45, 2.45, 15.2, 15.5, 16, cap=False)
for i in range(4):
    a0, a1 = math.pi / 2 * i / 4, math.pi / 2 * (i + 1) / 4
    ring(cop, 43.85, 47.3, 2.35 * math.cos(a0), 2.35 * math.cos(a1) + (0.25 if i == 3 else 0), 15.5 + 2.4 * math.sin(a0), 15.5 + 2.4 * math.sin(a1), 16, cap=(i == 3))
ring(por, 43.85, 47.3, 0.3, 0.3, 17.9, 18.5, 8, cap=True)

# ---------------------------------------------------------------- Kennan railings, gate piers and lamp standards
RR = QR + 2.7
wq = arc(-23.35, QCY, RR, math.radians(-168), math.radians(-90), 12)
eq = arc(23.35, QCY, RR, math.radians(-90), math.radians(-12), 12)
bow_r = (12.2 ** 2 + 3.1 ** 2) / (2 * 3.1)                   # the bow: through (+-12.2, -2.3) and (0, -5.4)
bow = [(x, (-5.4 + bow_r) - math.sqrt(bow_r ** 2 - x ** 2)) for x in (-12.2 + 24.4 * i / 8 for i in range(9))]
railing_path(wq + [(-16.2, wq[-1][1])])
railing_path([(16.2, eq[0][1])] + eq)
railing_path(bow)
railing_path([(53.9, 57.8), (53.9, 78.8)])
for u in (-16.2, -12.2, 12.2, 16.2):
    sqr(gra, u, -2.3, 0.4, 0, 2.2, 'nsewt')
    lamp_standard(u, -2.3, 2.2)

objs = [por.build(M['portland']), col.build(M['portland']), gra.build(M['granite']), rus.build(M['rustic']),
        lea.build(M['lead']), sla.build(M['slate']), cop.build(M['copper']), drk.build(M['dark']),
        dec.build(M['decal']), cut.build(M['cut']), lmp.build(M['lamp'])]
print('COLUMNS', COUNT)
print('TRIANGLES before bake', kit.tris(objs))
kit.finish(objs, (SX, SY), SZ)
kit.bake_ao_vertex(objs, nosub=('pr_columns', 'pr_plamp', 'pr_dark'))
root = bpy.data.objects.new('parliament', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs))
kit.export(os.path.join(OUT, 'parliament.glb'), os.path.join(SRC, 'parliament.blend'))
print('DONE')

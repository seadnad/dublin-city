"""Kilmainham: the Gaol (1796, east wing 1862) and its Courthouse (1820) on Inchicore Road; the Royal Hospital (1680-84,
tower and spire 1701) with its Garden House; and the Richmond Tower (Johnston, 1812; moved 1846) at the avenue's end.

Run headless:  blender -b --factory-startup -P tools/blender/build_kilmainham.py -- public/models models

Sources: docs/research/kilmainham.md and refs/kilmainham/*. Everything is built in GAME metres (plan already scaled,
real heights), so the world-projected texture tiles and the decals come out true in the game:
  gaol        plan 0.55 of the OSM wall ring (way 41662413), turned 5.8 degrees so its front runs along x. Origin: the
              ring's first node (53.3420594, -6.3097445). x east, y north (into the road is +y).
  courthouse  plan 0.45 x 0.5 (33 x 25 m real), origin its centre, front to +y (Inchicore Road).
  rhk         plan 0.55 (outer 89 x 94 m, courtyard 62 x 63 m real), origin the courtyard centre, x along the building's
              east axis, y north. The tower is built nearer real size (a 0.55 shaft would read as a stick).
  gardenhouse origin its centre.
  richmond    origin the middle of the arch on the ground; x along the avenue (east, out of the arch on the grounds
              side), y north. The arch is ~6 m wide so a car passes (real ~4.5 m); the block is 1:1 north-south.
One root per node. Materials (painted at load in src/world/kilmainham.js): <node>_ashlar, _rubble, _render, _dress,
_slate, _copper, _atlas (UVs into KM_ATLAS below: must match src/world/kilmainham.js), _cut (alpha-tested railings).
AO is baked into COLOR_0.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Atlas, WF, rect, block, arc_pts, opening, band, lathe

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)

# atlas regions, px (x, y, w, h) in 1024 x 1024 - keep in step with KM_ATLAS in src/world/kilmainham.js
KM_ATLAS = dict(
    sash=(0, 0, 64, 128), tallarch=(64, 0, 64, 192), rose=(128, 0, 128, 256), dormer=(256, 0, 64, 64),
    rhkdoor=(320, 0, 64, 128), arcback=(384, 0, 128, 128), clock=(512, 0, 128, 128), sundial=(640, 0, 64, 96),
    arms=(704, 0, 128, 128), belfry=(832, 0, 64, 128), pilaster=(896, 0, 32, 256), capital=(928, 0, 64, 32),
    gaolwin=(0, 256, 64, 128), gaoldoor=(64, 256, 128, 192), gaolarch=(192, 256, 64, 128), cellwin=(256, 256, 64, 64),
    barwin=(320, 256, 64, 96), blindarch=(384, 256, 128, 128), courtwin=(512, 256, 64, 128), courtdoor=(576, 256, 64, 128),
    rtwin=(640, 256, 64, 64), corbel=(704, 256, 256, 64), slit=(960, 256, 32, 96), lantern=(992, 256, 32, 64),
    railing=(0, 448, 256, 64), gate=(256, 448, 128, 128), court=(512, 512, 512, 512), gravel=(0, 576, 128, 128),
    iron=(384, 448, 32, 32), glass=(416, 448, 32, 32), lead=(448, 448, 32, 32), pot=(480, 448, 32, 32),
    brick=(384, 480, 32, 32), yard=(416, 480, 32, 32), flagpole=(448, 480, 32, 32),
    cross=(128, 576, 64, 128), gardenwin=(192, 576, 64, 96), gardendoor=(256, 576, 64, 128), crest=(832, 128, 128, 128),
    sashd=(960, 32, 64, 128),
)
W = 1024

MATS = {}


def mat(name):
    if name not in MATS:
        MATS[name] = kit.material(name, (0.7, 0.7, 0.7))
    return MATS[name]


class Node:
    """One placed building: a Part per material, built on demand."""
    def __init__(self, name):
        self.name = name
        self.parts = {}

    def __getattr__(self, k):
        if k in ('ashlar', 'rubble', 'render', 'dress', 'slate', 'copper'):
            if k not in self.parts:
                self.parts[k] = Part(f'{self.name}_{k}', {'ashlar': 2.4, 'rubble': 3.0, 'render': 3.0, 'dress': 2.0, 'slate': 2.0, 'copper': 1.5}[k])
            return self.parts[k]
        if k == 'atl':
            if 'atlas' not in self.parts:
                self.parts['atlas'] = Atlas(f'{self.name}_atlas', KM_ATLAS, W, W)
            return self.parts['atlas']
        if k == 'cut':
            if 'cut' not in self.parts:
                self.parts['cut'] = Atlas(f'{self.name}_cut_atlas', KM_ATLAS, W, W)
            return self.parts['cut']
        raise AttributeError(k)

    def flat(self, region):
        return kit.Flat(self.atl, region)

    def build(self):
        objs = []
        for k, p in self.parts.items():
            m = 'km_cut' if k == 'cut' else f'km_{k}'
            objs.append(p.build(mat(m)))
        return objs


# ------------------------------------------------------------------ generic helpers
def box(part, x0, x1, y0, y1, z0, z1, top=True, bottom=False):
    part.box(min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1), z0, z1, top, bottom)


def norm2(dx, dy):
    L = math.hypot(dx, dy) or 1.0
    return dx / L, dy / L


def offset_path(pts, d, closed):
    """Offset a plan polyline to the RIGHT of travel by d (mitred)."""
    n = len(pts)
    out = []
    for i in range(n):
        if not closed and i == 0:
            a, b = pts[0], pts[1]
            tx, ty = norm2(b[0] - a[0], b[1] - a[1]); m = (ty, -tx); k = 1.0
        elif not closed and i == n - 1:
            a, b = pts[-2], pts[-1]
            tx, ty = norm2(b[0] - a[0], b[1] - a[1]); m = (ty, -tx); k = 1.0
        else:
            a, p, b = pts[(i - 1) % n], pts[i], pts[(i + 1) % n]
            t1 = norm2(p[0] - a[0], p[1] - a[1]); t2 = norm2(b[0] - p[0], b[1] - p[1])
            n1, n2 = (t1[1], -t1[0]), (t2[1], -t2[0])
            mx, my = norm2(n1[0] + n2[0], n1[1] + n2[1])
            k = 1.0 / max(0.35, mx * n1[0] + my * n1[1]); m = (mx, my)
        out.append((pts[i][0] + m[0] * d * k, pts[i][1] + m[1] * d * k))
    return out


def wall_path(part, pts, t, z0, z1, closed=False, top=None, caps=True):
    """A free-standing wall of thickness t along a plan polyline (centred), both faces, a top and end caps."""
    L, R = offset_path(pts, -t / 2, closed), offset_path(pts, t / 2, closed)
    n = len(pts)
    segs = n if closed else n - 1
    tp = top or part
    for i in range(segs):
        j = (i + 1) % n
        dx, dy = norm2(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1])
        rn, ln = (dy, -dx, 0), (-dy, dx, 0)
        part.facen([(*R[i], z0), (*R[j], z0), (*R[j], z1), (*R[i], z1)], rn)
        part.facen([(*L[i], z0), (*L[j], z0), (*L[j], z1), (*L[i], z1)], ln)
        tp.facen([(*L[i], z1), (*L[j], z1), (*R[j], z1), (*R[i], z1)], (0, 0, 1))
    if caps and not closed:
        for i, s in ((0, -1), (n - 1, 1)):
            a, b = (pts[0], pts[1]) if i == 0 else (pts[-2], pts[-1])
            dx, dy = norm2(b[0] - a[0], b[1] - a[1])
            part.facen([(*L[i], z0), (*R[i], z0), (*R[i], z1), (*L[i], z1)], (dx * s, dy * s, 0))


def ring_band(part, pts, z0, z1, proj):
    """A moulding round a closed plan outline listed anticlockwise (outside to the right of travel): front, top, soffit."""
    O = offset_path(pts, proj, True)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        dx, dy = norm2(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1])
        part.facen([(*O[i], z0), (*O[j], z0), (*O[j], z1), (*O[i], z1)], (dy, -dx, 0))
        part.facen([(*pts[i], z1), (*pts[j], z1), (*O[j], z1), (*O[i], z1)], (0, 0, 1))
        part.facen([(*pts[i], z0), (*pts[j], z0), (*O[j], z0), (*O[i], z0)], (0, 0, -1))


def gable_roof_x(slate, end, x0, x1, y0, y1, z0, ridge, ends=(True, True), ov=0.3):
    """Pitched roof over x0..x1 x y0..y1, ridge along x; gable walls (on `end`) at the ends asked for."""
    ym = (y0 + y1) / 2
    slate.facen([(x0, y0 - ov, z0 - ov * 0.6), (x1, y0 - ov, z0 - ov * 0.6), (x1, ym, ridge), (x0, ym, ridge)], (0, -1, 1))
    slate.facen([(x0, y1 + ov, z0 - ov * 0.6), (x1, y1 + ov, z0 - ov * 0.6), (x1, ym, ridge), (x0, ym, ridge)], (0, 1, 1))
    for on, x, f in ((ends[0], x0, -1), (ends[1], x1, 1)):
        if on:
            end.facen([(x, y0, z0), (x, y1, z0), (x, ym, ridge)], (f, 0, 0))


def gable_roof_y(slate, end, x0, x1, y0, y1, z0, ridge, ends=(True, True), ov=0.3):
    xm = (x0 + x1) / 2
    slate.facen([(x0 - ov, y0, z0 - ov * 0.6), (x0 - ov, y1, z0 - ov * 0.6), (xm, y1, ridge), (xm, y0, ridge)], (-1, 0, 1))
    slate.facen([(x1 + ov, y0, z0 - ov * 0.6), (x1 + ov, y1, z0 - ov * 0.6), (xm, y1, ridge), (xm, y0, ridge)], (1, 0, 1))
    for on, y, f in ((ends[0], y0, -1), (ends[1], y1, 1)):
        if on:
            end.facen([(x0, y, z0), (x1, y, z0), (xm, y, ridge)], (0, f, 0))


def hip_roof(slate, x0, x1, y0, y1, z0, z1, ov=0.3):
    kit.hip(slate, x0 - ov, x1 + ov, y0 - ov, y1 + ov, z0 - ov * 0.5, z1)


def walls4(part, x0, x1, y0, y1, z0, z1, skip=()):
    """The four outside walls of a rectangular block (faces only)."""
    if 's' not in skip:
        part.facen([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0))
    if 'n' not in skip:
        part.facen([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (0, 1, 0))
    if 'w' not in skip:
        part.facen([(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], (-1, 0, 0))
    if 'e' not in skip:
        part.facen([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], (1, 0, 0))


def pointed_head(sc, zs, w, apex, segs=5):
    """Points of a pointed (two-centred) arch head from the left springing over the apex to the right springing."""
    h = apex - zs
    c = max(0.0, (h * h - w * w / 4) / w)
    R = c + w / 2
    th = math.atan2(h, -c)
    left = [(sc + c + R * math.cos(math.pi + (th - math.pi) * k / segs), zs + R * math.sin(math.pi + (th - math.pi) * k / segs)) for k in range(segs + 1)]
    right = [(2 * sc - s, z) for s, z in reversed(left)]
    return left + right[1:]


def arch_face(part, wf, s0, s1, z0, z1, head, d=0.0):
    """A wall panel s0..s1 x z0..z1 with an opening from the ground whose head is `head` (left to right)."""
    sl, sr = head[0][0], head[-1][0]
    rect(part, wf, s0, sl, z0, z1, d)
    rect(part, wf, sr, s1, z0, z1, d)
    for (a, za), (b, zb) in zip(head, head[1:]):
        part.facen([wf.p(a, za, d), wf.p(b, zb, d), wf.p(b, z1, d), wf.p(a, z1, d)], wf.n3)


def arch_soffit(part, wf, head, z0, depth):
    """The reveal of a through-arch: jambs and the soffit, from the face (d=0) back to d=-depth."""
    ring = [(head[0][0], z0)] + head + [(head[-1][0], z0)]
    cs, zs = (head[0][0] + head[-1][0]) / 2, head[0][1]
    for (a, za), (b, zb) in zip(ring, ring[1:]):
        mz = (za + zb) / 2
        n = wf.dir(cs - (a + b) / 2, (zs - mz) if mz > zs + 1e-3 else 0.0, 0)
        part.facen([wf.p(a, za, 0), wf.p(b, zb, 0), wf.p(b, zb, -depth), wf.p(a, za, -depth)], n)


def poly_uv(atl, region, pts, z, n=(0, 0, 1)):
    """A flat polygon at height z with UVs stretched over `region` by its bounding box."""
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    atl.facen([(x, y, z) for x, y in pts], n, [atl.tc(region, (x - x0) / (x1 - x0), 1 - (y - y0) / (y1 - y0)) for x, y in pts])


def pediment_roof(slate, axis, sign, face, half, zp, depth, eave):
    """The little gabled roof behind a pediment on a wall at `face` (x or y = face), running `depth` into the roof."""
    if axis == 'y':   # a wall facing +-y: the ridge runs along y
        y0, y1 = (face - depth, face + 0.15) if sign > 0 else (face - 0.15, face + depth)
        gable_roof_y(slate, None, -half, half, y0, y1, eave, zp, ends=(False, False), ov=0.15)
    else:
        x0, x1 = (face - depth, face + 0.15) if sign > 0 else (face - 0.15, face + depth)
        gable_roof_x(slate, None, x0, x1, -half, half, eave, zp, ends=(False, False), ov=0.15)


def sashr(s, z):
    """The sash region for a window: about a third of them lit after dark ('sash'), the rest dark ('sashd')."""
    h = math.sin(s * 12.9898 + z * 78.233) * 43758.5453
    return 'sash' if h - math.floor(h) < 0.34 else 'sashd'


def chimney(node, x, y, z0, z1, w=1.2, d=0.8, mat='render', pots=3):
    p = getattr(node, mat)
    box(p, x - w / 2, x + w / 2, y - d / 2, y + d / 2, z0, z1)
    box(node.dress, x - w / 2 - 0.08, x + w / 2 + 0.08, y - d / 2 - 0.08, y + d / 2 + 0.08, z1, z1 + 0.22)
    pot = node.flat('pot')
    for k in range(pots):
        px = x - w / 2 + (k + 0.5) * w / pots
        box(pot, px - 0.13, px + 0.13, y - 0.13, y + 0.13, z1 + 0.22, z1 + 0.75)


# ================================================================== THE GAOL
K = 0.55
TH = math.radians(5.8)  # the front runs 5.8 degrees south of east: turn it square to x


def gp(x, y):
    """Real metres in the OSM wall frame -> the model: turned square, scaled 0.55."""
    return ((x * math.cos(TH) - y * math.sin(TH)) * K, (x * math.sin(TH) + y * math.cos(TH)) * K)


RING = [(0, 0), (-1.7, 0.8), (-19.2, 2.6), (-30.0, 3.7), (-34.7, 2.7), (-36.7, 0.9), (-37.8, -2.1), (-38.2, -6.5), (-32.4, -7.1),
        (-33.3, -15.5), (-32.7, -17.9), (-33.9, -26.8), (-37.0, -55.4), (-38.3, -55.2), (-39.7, -65.7), (-28.3, -67.0), (34.0, -73.6),
        (45.8, -75.8), (57.0, -64.5), (57.2, -62.1), (61.9, -15.0), (62.1, -12.8), (61.8, -10.7), (60.5, -8.5), (57.7, -7.4),
        (55.9, -6.2), (41.9, -4.4), (23.7, -2.3)]
ring = [gp(*p) for p in RING]
gaol = Node('gaol')
g = gaol
FY = 0.62            # the flanking blocks' fronts (a little proud of the wall line)
RY = -6.13           # the recessed centre's face
WB0, WB1 = -6.6, 0.07     # west block
EB0, EB1 = 11.5, 18.2     # east block
Q = 2.75             # radius of the quadrant corners
HF = 14.0            # front parapet top
BACK = -12.1         # the flanking blocks run back to the west wing

# perimeter wall (calp rubble, ashlar coping): from inside the east block, east and round to inside the west block
# (the stretch across the front notch is the recessed centre and its railings)
WALL_H = 7.2
wall_path(g.rubble, list(reversed(ring)), 0.8, 0, WALL_H, top=g.ashlar)
# the yard floor inside the ring
poly_uv(g.cut, 'gravel', ring, 0.16)


def quadrant_block(x0, x1, curve_at):
    """A flanking block from its front (FY) back to BACK, with a convex quadrant at its inner front corner."""
    a = g.ashlar
    if curve_at == 'e':   # west block: the curve on its east (inner) front corner
        cx, cy = x1 - Q, FY - Q
        arc = [(cx + Q * math.cos(math.pi / 2 - k * math.pi / 12), cy + Q * math.sin(math.pi / 2 - k * math.pi / 12)) for k in range(7)]
        outline = [(x0, BACK), (x0, FY)] + arc + [(x1, BACK)]
    else:                 # east block: the curve on its west front corner
        cx, cy = x0 + Q, FY - Q
        arc = [(cx + Q * math.cos(math.pi - k * math.pi / 12), cy + Q * math.sin(math.pi - k * math.pi / 12)) for k in range(7)]
        outline = [(x0, BACK)] + arc + [(x1, FY), (x1, BACK)]
    # outline runs clockwise seen from above (x0,BACK) -> up the west side -> across the front -> down the east side
    for (p, q) in zip(outline, outline[1:]):
        dx, dy = norm2(q[0] - p[0], q[1] - p[1])
        a.facen([(p[0], p[1], 0), (q[0], q[1], 0), (q[0], q[1], HF), (p[0], p[1], HF)], (-dy, dx, 0))
    # plinth, a string course, the parapet coping
    for z0, z1, pr in ((0, 0.6, 0.12), (6.0, 6.3, 0.1), (HF - 0.9, HF - 0.6, 0.14), (HF - 0.12, HF, 0.1)):
        for (p, q) in zip(outline, outline[1:]):
            dx, dy = norm2(q[0] - p[0], q[1] - p[1]); nx, ny = -dy, dx
            P0, P1 = (p[0] + nx * pr, p[1] + ny * pr), (q[0] + nx * pr, q[1] + ny * pr)
            g.ashlar.facen([(*P0, z0), (*P1, z0), (*P1, z1), (*P0, z1)], (nx, ny, 0))
            g.ashlar.facen([(*p, z1), (*q, z1), (*P1, z1), (*P0, z1)], (0, 0, 1))
    g.flat('lead').facen([(x, y, HF - 0.3) for x, y in outline], (0, 0, 1))
    return outline


quadrant_block(WB0, WB1, 'e')
quadrant_block(EB0, EB1, 'w')
fr = WF(0, FY, 0, 1)  # the blocks' fronts, s = -x
for x0, x1 in ((WB0, WB1 - Q), (EB0 + Q, EB1)):
    xc = (x0 + x1) / 2
    g.atl.wall('barwin', fr, -xc - 0.55, -xc + 0.55, 8.6, 10.2, d=0.03)       # the barred window high up
    g.atl.wall('gaolarch', fr, -xc - 0.8, -xc + 0.8, 1.2, 4.6, d=0.03)       # a blind opening low down
# the east block's outer (east) face: a big blind arch (ref 09) and small corbels under the parapet
ef = WF(EB1, 0, 1, 0)  # s = y
g.atl.wall('blindarch', ef, (BACK + FY) / 2 - 2.4, (BACK + FY) / 2 + 2.4, 0.6, 6.4, d=0.03)
g.atl.wall('corbel', ef, BACK, FY, HF - 2.0, HF - 1.2, d=0.03)
wf_w = WF(WB0, 0, -1, 0)
g.atl.wall('barwin', wf_w, -(BACK + FY) / 2 - 0.55, -(BACK + FY) / 2 + 0.55, 8.6, 10.2, d=0.03)

# the recessed centre: three bays, ground-floor arches (the middle one the door), tall arched recesses above
rc = WF(0, RY, 0, 1)
X0, X1 = WB1, EB0
bay = (X1 - X0) / 3
for k in range(3):
    xa, xb = X0 + k * bay, X0 + (k + 1) * bay
    sc = -(xa + xb) / 2
    # ground floor: round-headed recess 2.2 wide to 4.9 (the door in the middle), rusticated voussoirs are painted
    opening(g.ashlar, rc, -xb, -xa, 0, 6.1, sc, 2.3, 0.0, 3.75, segs=6, depth=0.45, back=('decal', g.atl, 'gaoldoor' if k == 1 else 'gaolarch'))
    # first floor: a tall arched recess with the barred window and its balconette
    opening(g.ashlar, rc, -xb, -xa, 6.1, HF - 0.8, sc, 2.5, 6.4, 11.0, segs=6, depth=0.35, back=('decal', g.atl, 'gaolwin'))
    # balconette: an iron slab and rail on the recess floor
    box(g.flat('iron'), -sc - 0.95, -sc + 0.95, RY, RY + 0.55, 7.05, 7.12)
    g.cut.wall('railing', WF(0, RY + 0.55, 0, 1), sc - 0.95, sc + 0.95, 7.12, 8.0, d=0.0)
rect(g.ashlar, rc, -X1, -X0, HF - 0.8, HF, 0)
for z0, z1, pr in ((5.9, 6.2, 0.1), (HF - 0.12, HF, 0.1)):
    block(g.ashlar, rc, -X1, -X0, z0, z1, 0, pr, top=True, bottom=True)
g.flat('lead').facen([(X0, BACK, HF - 0.3), (X1, BACK, HF - 0.3), (X1, RY, HF - 0.3), (X0, RY, HF - 0.3)], (0, 0, 1))
# the lantern over the door
box(g.flat('iron'), (X0 + X1) / 2 - 0.04, (X0 + X1) / 2 + 0.04, RY, RY + 0.6, 4.25, 4.3)
box(g.flat('lantern'), (X0 + X1) / 2 - 0.16, (X0 + X1) / 2 + 0.16, RY + 0.44, RY + 0.76, 3.7, 4.2)
# railings across the forecourt in the recess, on the wall line, with a gate in the middle (they meet the curves)
RLY = FY - 0.9
reach = math.sqrt(Q * Q - (RLY - (FY - Q)) ** 2)
rl0, rl1 = (WB1 - Q) + reach, (EB0 + Q) - reach
XM = (X0 + X1) / 2
rlf = WF(0, RLY, 0, 1)  # s = -x
g.cut.wall('railing', rlf, -rl1, -XM - 1.1, 0, 2.3, d=0.0)
g.cut.wall('railing', rlf, -XM + 1.1, -rl0, 0, 2.3, d=0.0)
g.cut.wall('gate', rlf, -XM - 1.1, -XM + 1.1, 0, 2.3, d=0.0)

# ---- the west wing (1796): four three-storey ranges round a small court
WW = dict(x0=-13.2, x1=11.0, y0=-31.9, y1=BACK, cx0=-8.25, cx1=1.1, cy0=-25.3, cy1=-17.6)
EAVE_W, RIDGE_W = 12.0, 15.8
ranges = [(WW['x0'], WW['cx0'], WW['y0'], WW['y1'], 'y'), (WW['cx1'], WW['x1'], WW['y0'], WW['y1'], 'y'),
          (WW['cx0'], WW['cx1'], WW['cy1'], WW['y1'], 'x'), (WW['cx0'], WW['cx1'], WW['y0'], WW['cy0'], 'x')]
for x0, x1, y0, y1, ax in ranges:
    walls4(g.rubble, x0, x1, y0, y1, 0, EAVE_W)
    if ax == 'y':
        gable_roof_y(g.slate, g.rubble, x0, x1, y0, y1, EAVE_W, RIDGE_W, ends=(True, False))
    else:
        gable_roof_x(g.slate, g.rubble, x0, x1, y0, y1, EAVE_W, RIDGE_W - 0.8, ends=(False, False))
# gables' oculi, cell windows on the outer faces (three tiers)
for x0, x1, y0, y1, ax in ranges[:2]:
    xm = (x0 + x1) / 2
    g.atl.wall('cellwin', WF(0, WW['y0'], 0, -1), xm - 0.5, xm + 0.5, 13.0, 14.0, d=0.03)
sw = WF(0, WW['y0'], 0, -1)
xx = WW['x0'] + 1.4
while xx < WW['x1'] - 1:
    for z in (2.2, 5.9, 9.4):
        g.atl.wall('cellwin', sw, xx - 0.42, xx + 0.42, z, z + 0.85, d=0.03)
    xx += 2.2
wwf = WF(WW['x0'], 0, -1, 0)
yy = WW['y0'] + 1.4
while yy < WW['y1'] - 1:
    for z in (2.2, 5.9, 9.4):
        g.atl.wall('cellwin', wwf, -yy - 0.42, -yy + 0.42, z, z + 0.85, d=0.03)
    yy += 2.2
for x, y in ((WW['x0'] + 2.4, (WW['y0'] + WW['y1']) / 2), (WW['x1'] - 2.4, (WW['y0'] + WW['y1']) / 2), (-3.5, WW['cy1'] + 2.7), (-3.5, WW['cy0'] - 3.2)):
    chimney(g, x, y, RIDGE_W - 1.2, RIDGE_W + 1.6, 1.0, 0.7, 'rubble', 3)

# ---- the Victorian east wing (1862): a D-shaped hall, three tiers of cells, a hipped / conical roof, a glazed lantern
EX0, EX1, EY0, EY1 = 11.0, 23.1, -31.35, -18.15
ECY, ER = (EY0 + EY1) / 2, (EY1 - EY0) / 2
EAVE_E, RIDGE_E = 13.0, 19.2
ea = g.ashlar
ea.facen([(EX0, EY0, 0), (EX1, EY0, 0), (EX1, EY0, EAVE_E), (EX0, EY0, EAVE_E)], (0, -1, 0))
ea.facen([(EX0, EY1, 0), (EX1, EY1, 0), (EX1, EY1, EAVE_E), (EX0, EY1, EAVE_E)], (0, 1, 0))
NA = 10
apse = [(EX1 + ER * math.cos(-math.pi / 2 + math.pi * k / NA), ECY + ER * math.sin(-math.pi / 2 + math.pi * k / NA)) for k in range(NA + 1)]
for p, q in zip(apse, apse[1:]):
    dx, dy = norm2(q[0] - p[0], q[1] - p[1])
    ea.facen([(*p, 0), (*q, 0), (*q, EAVE_E), (*p, EAVE_E)], (dy, -dx, 0))
# its west end stands over the older wing's roof: the wall and gable there
ea.facen([(EX0, EY0, EAVE_W - 1), (EX0, EY1, EAVE_W - 1), (EX0, EY1, EAVE_E), (EX0, EY0, EAVE_E)], (-1, 0, 0))
ea.facen([(EX0, EY0 - 0.35, EAVE_E - 0.2), (EX0, EY1 + 0.35, EAVE_E - 0.2), (EX0, ECY, RIDGE_E + 1.1)], (-1, 0, 0))
# the eaves band and the roof: two slopes along the hall, a half cone over the apse
rr = ER + 0.35
g.slate.facen([(EX0, EY0 - 0.35, EAVE_E - 0.2), (EX1, EY0 - 0.35, EAVE_E - 0.2), (EX1, ECY - 1.0, RIDGE_E), (EX0, ECY - 1.0, RIDGE_E)], (0, -1, 1))
g.slate.facen([(EX0, EY1 + 0.35, EAVE_E - 0.2), (EX1, EY1 + 0.35, EAVE_E - 0.2), (EX1, ECY + 1.0, RIDGE_E), (EX0, ECY + 1.0, RIDGE_E)], (0, 1, 1))
cone = [(EX1 + rr * math.cos(-math.pi / 2 + math.pi * k / NA), ECY + rr * math.sin(-math.pi / 2 + math.pi * k / NA)) for k in range(NA + 1)]
tip = [(EX1 + 1.0 * math.cos(-math.pi / 2 + math.pi * k / NA), ECY + 1.0 * math.sin(-math.pi / 2 + math.pi * k / NA)) for k in range(NA + 1)]
for k in range(NA):
    a, b, c, d = cone[k], cone[k + 1], tip[k + 1], tip[k]
    m = (math.cos(-math.pi / 2 + math.pi * (k + 0.5) / NA), math.sin(-math.pi / 2 + math.pi * (k + 0.5) / NA))
    g.slate.facen([(*a, EAVE_E - 0.2), (*b, EAVE_E - 0.2), (*c, RIDGE_E), (*d, RIDGE_E)], (m[0], m[1], 1))
# the glazed lantern along the ridge and round the apse top
gl = g.flat('glass')
for sy in (-1, 1):
    gl.facen([(EX0 + 0.5, ECY + sy * 1.0, RIDGE_E), (EX1, ECY + sy * 1.0, RIDGE_E), (EX1, ECY + sy * 0.6, RIDGE_E + 1.1), (EX0 + 0.5, ECY + sy * 0.6, RIDGE_E + 1.1)], (0, sy, 1))
for k in range(NA):
    a, b = tip[k], tip[k + 1]
    m = (math.cos(-math.pi / 2 + math.pi * (k + 0.5) / NA), math.sin(-math.pi / 2 + math.pi * (k + 0.5) / NA))
    gl.facen([(*a, RIDGE_E), (*b, RIDGE_E), (EX1 + (b[0] - EX1) * 0.6, ECY + (b[1] - ECY) * 0.6, RIDGE_E + 1.1), (EX1 + (a[0] - EX1) * 0.6, ECY + (a[1] - ECY) * 0.6, RIDGE_E + 1.1)], (m[0], m[1], 1))
g.flat('lead').facen([(EX0 + 0.5, ECY - 0.6, RIDGE_E + 1.1), (EX1, ECY - 0.6, RIDGE_E + 1.1), (EX1, ECY + 0.6, RIDGE_E + 1.1), (EX0 + 0.5, ECY + 0.6, RIDGE_E + 1.1)], (0, 0, 1))
# cell windows: three tiers of small segmental openings, and the row under the eaves that shows over the wall
for wf, s0, s1 in ((WF(0, EY0, 0, -1), EX0 + 1.0, EX1), (WF(0, EY1, 0, 1), -EX1, -EX0 - 1.0)):
    s = s0 + 0.9
    while s < s1 - 0.4:
        for z in (2.6, 6.2, 9.9):
            g.atl.wall('cellwin', wf, s - 0.36, s + 0.36, z, z + 0.72, d=0.03)
        s += 1.9
for k in range(NA):
    a, b = apse[k], apse[k + 1]
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    nx, ny = norm2(mx - EX1, my - ECY)
    wf = WF(mx, my, nx, ny)
    for z in (2.6, 6.2, 9.9):
        g.atl.wall('cellwin', wf, -0.36, 0.36, z, z + 0.72, d=0.03)
for x, y in ((EX0 + 3.2, EY0 + 0.4), (EX0 + 3.2, EY1 - 0.4)):
    chimney(g, x, y, EAVE_E - 1, RIDGE_E + 1.4, 1.1, 0.8, 'dress', 2)

# ---- the Stonebreakers' Yard: high rubble walls in the south-east corner, a door, the cross
SYX, SYY = 18.2, -32.4


def ring_y_at(x, south=True):
    """The wall ring's y where it crosses x (its south side, or north)."""
    best = None
    for p, q in zip(ring, ring[1:] + ring[:1]):
        if (p[0] - x) * (q[0] - x) <= 0 and p[0] != q[0]:
            y = p[1] + (q[1] - p[1]) * (x - p[0]) / (q[0] - p[0])
            if best is None or (y < best if south else y > best):
                best = y
    return best


EASTX = max(p[0] for p in ring[18:22]) - 0.5   # the east wall's inner face near the yard
wall_path(g.rubble, [(SYX, ring_y_at(SYX) + 0.3), (SYX, SYY), (EASTX, SYY)], 0.9, 0, 8.0, top=g.ashlar)
south_y = ring_y_at(SYX)
g.atl.wall('arcback', WF(SYX + 0.46, (SYY + south_y) / 2, 1, 0), -1.0, 1.0, 0, 2.6, d=0.02)  # the yard door (a dark doorway)
g.atl.wall('cross', WF(SYX + 5.0, SYY - 0.46, 0, -1), -0.4, 0.4, 0, 1.4, d=0.02)
box(g.flat('flagpole'), SYX + 3.0, SYX + 3.08, SYY - 2.1, SYY - 2.02, 0, 6.5)

# ================================================================== THE COURTHOUSE (plan 0.45 x 0.5)
ch = Node('courthouse')
CW, CD = 7.4, 6.25
CC = 4.1            # half-width of the pedimented centre
walls4(ch.ashlar, -CC, CC, -CD, CD, 0, 11.0)
for x0, x1 in ((-CW, -CC), (CC, CW)):
    walls4(ch.ashlar, x0, x1, -CD + 0.6, CD - 0.4, 0, 8.8)
    hip_roof(ch.slate, x0, x1, -CD + 0.6, CD - 0.4, 8.8, 10.4, ov=0.2)
hip_roof(ch.slate, -CC, CC, -CD, CD - 1.2, 11.0, 13.6, ov=0.25)
front = WF(0, CD, 0, 1)   # s = -x
# the pediment over the centre
ch.ashlar.facen([(-CC, CD, 11.0), (CC, CD, 11.0), (0, CD, 13.3)], (0, 1, 0))
band(ch.ashlar, front, [(-CC - 0.1, 11.0), (0, 13.35), (CC + 0.1, 11.0)], 0.25, 0.25)
block(ch.ashlar, front, -CC - 0.15, CC + 0.15, 10.7, 11.0, 0, 0.3, top=True, bottom=True)
block(ch.ashlar, front, -CC, CC, 4.3, 4.6, 0, 0.18, top=True, bottom=True)
ch.cut.wall('crest', WF(0, CD - 0.2, 0, 1), -0.9, 0.9, 13.0, 14.6, d=0.0)       # the royal arms on the apex
for k in (-1, 0, 1):
    ch.atl.wall('courtwin', front, k * 2.4 - 0.8, k * 2.4 + 0.8, 5.4, 9.8, d=0.03)
ch.atl.wall('courtdoor', front, -0.8, 0.8, 0, 3.6, d=0.03)
for k in (-1, 1):
    ch.atl.wall('gaolarch', front, k * 2.4 - 0.75, k * 2.4 + 0.75, 0.6, 3.6, d=0.03)
    ch.atl.wall('courtwin', WF(0, CD - 0.4, 0, 1), -k * (CC + (CW - CC) / 2) - 0.9, -k * (CC + (CW - CC) / 2) + 0.9, 4.8, 7.8, d=0.03)
    ch.atl.wall('sashd', WF(0, CD - 0.4, 0, 1), -k * (CC + (CW - CC) / 2) - 0.6, -k * (CC + (CW - CC) / 2) + 0.6, 1.0, 3.4, d=0.03)
for s in (-4.0, 0.0, 4.0):
    ch.atl.wall('sashd', WF(CW, 0, 1, 0), s - 0.55, s + 0.55, 5.0, 7.4, d=0.03)
    ch.atl.wall('sashd', WF(-CW, 0, -1, 0), s - 0.55, s + 0.55, 5.0, 7.4, d=0.03)
chimney(ch, -CC + 0.8, 0, 11.5, 14.4, 0.9, 0.7, 'ashlar', 2)
chimney(ch, CC - 0.8, 0, 11.5, 14.4, 0.9, 0.7, 'ashlar', 2)
# railings in front of it
ch.cut.wall('railing', WF(0, CD + 2.4, 0, 1), -CW, -1.1, 0, 1.6, d=0.0)
ch.cut.wall('railing', WF(0, CD + 2.4, 0, 1), 1.1, CW, 0, 1.6, d=0.0)

# ================================================================== THE ROYAL HOSPITAL (plan 0.55)
rh = Node('rhk')
OX, OY, IX, IY = 24.5, 26.0, 17.05, 17.3
EAVE, RIDGE = 10.5, 15.0
PX, PY = 5.95, 29.2              # the north front's pedimented centre (projects 3.2)
RX, RY_ = (OX + IX) / 2, (OY + IY) / 2  # the ridge ring
BAYW = 2.62
rn = rh.render
# outer walls, anticlockwise plan: SW, SE, NE, (the projection), NW
outer = [(-OX, -OY), (OX, -OY), (OX, OY), (PX, OY), (PX, PY), (-PX, PY), (-PX, OY), (-OX, OY)]
for p, q in zip(outer, outer[1:] + outer[:1]):
    dx, dy = norm2(q[0] - p[0], q[1] - p[1])
    rn.facen([(*p, 0), (*q, 0), (*q, EAVE), (*p, EAVE)], (dy, -dx, 0))
inner = [(-IX, -IY), (-IX, IY), (IX, IY), (IX, -IY)]   # the courtyard, walked round with the courtyard on the right
# plinth, first-floor string, eaves cornice (outside); dressed quoin strips at the corners
ring_band(rh.dress, outer, 0, 0.55, 0.12)
ring_band(rh.dress, outer, 4.55, 4.8, 0.08)
ring_band(rh.dress, outer, EAVE - 0.45, EAVE, 0.32)
for x, y in ((-OX, -OY), (OX, -OY), (OX, OY), (-OX, OY)):
    sx, sy = (1 if x > 0 else -1), (1 if y > 0 else -1)
    rh.dress.facen([(x, y + sy * 0.02, 0.55), (x - sx * 0.6, y + sy * 0.02, 0.55), (x - sx * 0.6, y + sy * 0.02, EAVE - 0.45), (x, y + sy * 0.02, EAVE - 0.45)], (0, sy, 0))
    rh.dress.facen([(x + sx * 0.02, y, 0.55), (x + sx * 0.02, y - sy * 0.6, 0.55), (x + sx * 0.02, y - sy * 0.6, EAVE - 0.45), (x + sx * 0.02, y, EAVE - 0.45)], (sx, 0, 0))

# ---- the courtyard faces: arcades on the east, west and south ranges; the hall and chapel on the north
NB = 13
arc_regions = []
court_walls = [('s', WF(0, -IY, 0, 1), -IX, IX), ('e', WF(IX, 0, -1, 0), -IY, IY), ('w', WF(-IX, 0, 1, 0), -IY, IY)]
for key, wf, a0, a1 in court_walls:
    # s runs: south face (normal +y): h = (-1, 0) so s = -x; east face (normal -x): h = (0,-1) so s = -y; west: s = y
    L = a1 - a0
    bw = L / NB
    for k in range(NB):
        s0, s1 = -a1 + k * bw, -a1 + (k + 1) * bw
        sc = (s0 + s1) / 2
        opening(rn, wf, s0, s1, 0, 4.55, sc, bw * 0.66, 0.0, 2.55, segs=6, depth=1.8, reveal=rh.dress,
                back=('decal', rh.atl, 'arcback'))
        rh.atl.wall(sashr(sc + a0, 5.5), wf, sc - 0.55, sc + 0.55, 5.5, 8.0, d=0.03)
    rect(rn, wf, -a1, -a0, 4.55, EAVE)
    block(rh.dress, wf, -a1, -a0, 4.35, 4.6, 0, 0.1, top=True, bottom=True)
    block(rh.dress, wf, -a1, -a0, EAVE - 0.4, EAVE, 0, 0.28, top=True, bottom=True)
nf = WF(0, IY, 0, -1)      # the north range's courtyard face, s = x
rect(rn, nf, -IX, IX, 0, EAVE)
block(rh.dress, nf, -IX, IX, EAVE - 0.4, EAVE, 0, 0.28, top=True, bottom=True)
block(rh.dress, nf, -IX, IX, 0, 0.5, 0, 0.1, top=True)
PC = 7.6                   # half-width of the pedimented centre on the courtyard
block(rh.dress, nf, -PC, PC, 10.1, 10.5, 0, 0.35, top=True, bottom=True)
rn.facen([nf.p(-PC, EAVE), nf.p(PC, EAVE), nf.p(0, 13.9)], nf.n3)
band(rh.dress, nf, [(-PC - 0.1, EAVE), (0, 13.95), (PC + 0.1, EAVE)], 0.25, 0.3)
rh.atl.wall('sundial', nf, -0.7, 0.7, 11.1, 13.0, d=0.04)
pediment_roof(rh.slate, 'y', -1, IY, PC + 0.1, 13.95, 4.6, EAVE)
for s in (-5.7, -3.0, 3.0, 5.7):
    rh.atl.wall('tallarch', nf, s - 0.95, s + 0.95, 1.4, 8.9, d=0.03)
rh.atl.wall('rhkdoor', nf, -0.85, 0.85, 0.4, 4.0, d=0.03)
rh.atl.wall(sashr(0.3, 5.4), nf, -0.55, 0.55, 5.4, 7.8, d=0.03)
for s in (-15.4, -12.8, -10.2, 10.2, 12.8, 15.4):
    rh.atl.wall(sashr(s, 1.2), nf, s - 0.55, s + 0.55, 1.2, 3.6, d=0.03)
    rh.atl.wall(sashr(s, 5.5), nf, s - 0.55, s + 0.55, 5.5, 8.0, d=0.03)
# the arcade walks' flagged floors (the grounds' grass would otherwise show under the arches)
fl = kit.Flat(rh.cut, 'yard')
for x0, x1, y0, y1 in ((-IX, IX, -IY - 1.8, -IY), (IX, IX + 1.8, -IY - 1.8, IY), (-IX - 1.8, -IX, -IY - 1.8, IY)):
    fl.facen([(x0, y0, 0.4), (x1, y0, 0.4), (x1, y1, 0.4), (x0, y1, 0.4)], (0, 0, 1))
# the courtyard floor: cobbles and the flagged cross
rh.cut.facen([(-IX, -IY, 0.4), (IX, -IY, 0.4), (IX, IY, 0.4), (-IX, IY, 0.4)], (0, 0, 1),
             [rh.cut.tc('court', 0, 1), rh.cut.tc('court', 1, 1), rh.cut.tc('court', 1, 0), rh.cut.tc('court', 0, 0)])

# ---- the outside faces
def sashes(wf, s_from, s_to, skip=()):
    s = s_from
    while s <= s_to + 1e-6:
        if not any(a <= s <= b for a, b in skip):
            rh.atl.wall(sashr(s + wf.o[0] * 0.37, 1.35), wf, s - 0.55, s + 0.55, 1.35, 3.75, d=0.03)
            rh.atl.wall(sashr(s + wf.o[1] * 0.29, 5.6), wf, s - 0.55, s + 0.55, 5.6, 8.1, d=0.03)
        s += BAYW


def centrepiece(wf, half, zp, door=True):
    """A shallow pedimented centre on an outside front: dressed pilaster strips, a pediment, the door."""
    block(rh.dress, wf, -half, -half + 0.6, 0.55, EAVE - 0.45, 0, 0.12, top=False)
    block(rh.dress, wf, half - 0.6, half, 0.55, EAVE - 0.45, 0, 0.12, top=False)
    rn.facen([wf.p(-half, EAVE, 0.12), wf.p(half, EAVE, 0.12), wf.p(0, zp, 0.12)], wf.n3)
    band(rh.dress, wf, [(-half - 0.1, EAVE), (0, zp + 0.05), (half + 0.1, EAVE)], 0.25, 0.4)
    if door:
        rh.atl.wall('rhkdoor', wf, -0.85, 0.85, 0.5, 4.2, d=0.15)
        rh.atl.wall(sashr(wf.o[0] + wf.o[1], 5.6), wf, -0.55, 0.55, 5.6, 8.1, d=0.15)


east, west, south = WF(OX, 0, 1, 0), WF(-OX, 0, -1, 0), WF(0, -OY, 0, -1)   # s = y, s = -y, s = x
centrepiece(east, 4.0, 13.2)
pediment_roof(rh.slate, 'x', 1, OX, 4.1, 13.2, 3.4, EAVE)
pediment_roof(rh.slate, 'x', -1, -OX, 4.1, 13.2, 3.4, EAVE)
pediment_roof(rh.slate, 'y', -1, -OY, 4.1, 13.2, 3.4, EAVE)
sashes(east, -OY + 1.8, 15.0, skip=((-4.3, 4.3),))
rh.atl.wall('rose', east, 18.3, 24.3, 1.2, 9.6, d=0.05)          # the chapel's great east window (ref 32)
band(rh.dress, east, [(18.1, 1.2)] + arc_pts(21.3, 6.6, 3.2, 8) + [(24.5, 1.2)], 0.3, 0.12, ends=True)
centrepiece(west, 4.0, 13.2)
sashes(west, -OY + 1.8, OY - 1.8, skip=((-4.3, 4.3),))
centrepiece(south, 4.0, 13.2)
sashes(south, -OX + 1.8, OX - 1.8, skip=((-4.3, 4.3),))
# the north (garden) front: the hall and chapel windows, and the pedimented centre with Corinthian pilasters
north = WF(0, OY, 0, 1)   # s = -x
for k in range(5):
    for sg in (-1, 1):
        s = sg * (8.4 + k * 2.95)
        rh.atl.wall('tallarch', north, s - 0.95, s + 0.95, 2.0, 9.1, d=0.03)
pn = WF(0, PY, 0, 1)
for s in (-5.35, -1.75, 1.75, 5.35):
    block(rh.dress, pn, s - 0.36, s + 0.36, 0.55, 9.4, 0, 0.2, top=False)
    rh.atl.wall('capital', pn, s - 0.46, s + 0.46, 8.9, 9.45, d=0.22)
for s in (-3.55, 3.55):
    rh.atl.wall('tallarch', pn, s - 0.95, s + 0.95, 2.0, 8.6, d=0.03)
block(rh.dress, pn, -PX - 0.1, PX + 0.1, 9.4, EAVE, 0, 0.35, top=True, bottom=True)
rh.dress.facen([pn.p(-PX, EAVE, 0.2), pn.p(PX, EAVE, 0.2), pn.p(0, 14.6, 0.2)], pn.n3)
band(rh.dress, pn, [(-PX - 0.15, EAVE), (0, 14.65), (PX + 0.15, EAVE)], 0.3, 0.45)
rh.atl.wall('arms', pn, -1.0, 1.0, 6.2, 8.6, d=0.05)
rh.atl.wall('rhkdoor', pn, -0.9, 0.9, 1.0, 5.2, d=0.05)
for k in range(4):                                    # the steps down to the garden
    box(rh.dress, -2.2 - k * 0.3, 2.2 + k * 0.3, PY, PY + 0.8 + k * 0.7, 0, 1.0 - k * 0.25)
gable_roof_y(rh.slate, rh.render, -PX, PX, OY - 2.0, PY, EAVE, 14.6, ends=(False, False), ov=0.2)

# ---- the roof: one ring of slopes (outer eaves -> ridge -> courtyard eaves), dormers, chimneys
sl = rh.slate
OV = 0.35
o = [(-OX - OV, -OY - OV), (OX + OV, -OY - OV), (OX + OV, OY + OV), (-OX - OV, OY + OV)]
r = [(-RX, -RY_), (RX, -RY_), (RX, RY_), (-RX, RY_)]
i_ = [(-IX + OV, -IY + OV), (IX - OV, -IY + OV), (IX - OV, IY - OV), (-IX + OV, IY - OV)]
ZO = EAVE - 0.2
for k in range(4):
    a, b = k, (k + 1) % 4
    mx, my = (o[a][0] + o[b][0]) / 2, (o[a][1] + o[b][1]) / 2
    sl.facen([(*o[a], ZO), (*o[b], ZO), (*r[b], RIDGE), (*r[a], RIDGE)], (mx, my, 30))
    sl.facen([(*i_[a], ZO), (*i_[b], ZO), (*r[b], RIDGE), (*r[a], RIDGE)], (-mx, -my, 30))


def dormer(x, y, nx, ny):
    """A small dormer on the slope facing (nx, ny), its front at (x, y) (on the eaves line pulled in 0.9)."""
    hx, hy = -ny, nx
    w, z0, z1 = 0.55, EAVE + 0.35, EAVE + 1.75
    fx, fy = x - nx * 0.9, y - ny * 0.9
    depth = (z1 - ZO) * ((RX - IX) / (RIDGE - ZO)) + 0.3
    bx, by = fx - nx * depth, fy - ny * depth
    A = (fx - hx * w, fy - hy * w); B = (fx + hx * w, fy + hy * w)
    rn.facen([(*A, z0), (*B, z0), (*B, z1), (*A, z1)], (nx, ny, 0))
    rh.atl.facen([(A[0] + nx * 0.02, A[1] + ny * 0.02, z0 + 0.1), (B[0] + nx * 0.02, B[1] + ny * 0.02, z0 + 0.1), (B[0] + nx * 0.02, B[1] + ny * 0.02, z1 - 0.1), (A[0] + nx * 0.02, A[1] + ny * 0.02, z1 - 0.1)],
                 (nx, ny, 0), [rh.atl.tc('dormer', 0, 1), rh.atl.tc('dormer', 1, 1), rh.atl.tc('dormer', 1, 0), rh.atl.tc('dormer', 0, 0)])
    for P, sg in ((A, -1), (B, 1)):
        rn.facen([(*P, z0), (P[0] - nx * depth, P[1] - ny * depth, z1), (*P, z1)], (hx * sg, hy * sg, 0))
    apex = z1 + 0.55
    C = (fx, fy)
    sl.facen([(A[0] + nx * 0.1, A[1] + ny * 0.1, z1), (A[0] - nx * depth, A[1] - ny * depth, z1), (C[0] - nx * depth, C[1] - ny * depth, apex), (C[0] + nx * 0.1, C[1] + ny * 0.1, apex)], (-hx, -hy, 1))
    sl.facen([(B[0] + nx * 0.1, B[1] + ny * 0.1, z1), (B[0] - nx * depth, B[1] - ny * depth, z1), (C[0] - nx * depth, C[1] - ny * depth, apex), (C[0] + nx * 0.1, C[1] + ny * 0.1, apex)], (hx, hy, 1))
    rn.facen([(*A, z1), (*B, z1), (*C, apex)], (nx, ny, 0))


for s in [-OY + 3.2 + k * BAYW * 2 for k in range(10)]:
    if abs(s) < 5 or s > OY - 3:
        continue
    dormer(OX, s, 1, 0)
    dormer(-OX, s, -1, 0)
for s in [-OX + 3.2 + k * BAYW * 2 for k in range(9)]:
    if abs(s) < 5 or s > OX - 3:
        continue
    dormer(s, -OY, 0, -1)
    if abs(s) > 8:
        dormer(s, OY, 0, 1)
for s in [-IY + 2.6 + k * BAYW * 2 for k in range(7)]:
    if s > IY - 2:
        continue
    dormer(IX, s, -1, 0)
    dormer(-IX, s, 1, 0)
for s in [-IX + 2.6 + k * BAYW * 2 for k in range(7)]:
    if s > IX - 2:
        continue
    dormer(s, -IY, 0, 1)
    if abs(s) > 9:
        dormer(s, IY, 0, -1)
for x, y in [(-RX, -12), (-RX, 0), (-RX, 12), (RX, -12), (RX, 0), (RX, 12), (-12, -RY_), (0, -RY_), (12, -RY_), (-12, RY_), (12, RY_), (-RX, -RY_), (RX, -RY_), (RX, RY_), (-RX, RY_)]:
    chimney(rh, x, y, RIDGE - 1.6, RIDGE + 2.3, 1.25, 0.85, 'render', 3)

# ---- the tower and spire over the north range's centre (refs 20, 21, 23, 30)
TY = RY_ + 0.2
TS = 2.6                    # half-width of the calp shaft
rb = rh.rubble
walls4(rb, -TS, TS, TY - TS, TY + TS, EAVE, 25.0)
for sx in (-1, 1):          # limestone quoins up the corners
    for sy in (-1, 1):
        x, y = sx * TS, TY + sy * TS
        box(rh.dress, x - sx * 0.34, x + sx * 0.05, y - sy * 0.34, y + sy * 0.05, RIDGE - 1.0, 24.6, top=False)
for wf in (WF(0, TY + TS, 0, 1), WF(0, TY - TS, 0, -1), WF(TS, TY, 1, 0), WF(-TS, TY, -1, 0)):
    rh.atl.wall('belfry', wf, -0.85, 0.85, 19.2, 23.6, d=0.04)
ring_band(rh.dress, [(-TS, TY - TS), (TS, TY - TS), (TS, TY + TS), (-TS, TY + TS)], 24.6, 25.5, 0.35)
cop = rh.copper
CS = 1.95
walls4(cop, -CS, CS, TY - CS, TY + CS, 25.5, 29.6)
box(cop, -CS - 0.25, CS + 0.25, TY - CS - 0.25, TY + CS + 0.25, 29.6, 30.2, top=True, bottom=True)
for wf in (WF(0, TY + CS, 0, 1), WF(0, TY - CS, 0, -1), WF(CS, TY, 1, 0), WF(-CS, TY, -1, 0)):
    rh.atl.wall('clock', wf, -1.3, 1.3, 26.6, 29.2, d=0.03)
for x in (-TS + 0.35, TS - 0.35):  # the urns on the tower's corners
    for y in (TY - TS + 0.35, TY + TS - 0.35):
        lathe(rh.dress, x, y, [(0.22, 25.5), (0.34, 25.8), (0.3, 26.3), (0.12, 26.55), (0.18, 26.7), (0.0, 26.95)], 6)
lathe(cop, 0, TY, [(1.75, 30.2), (1.55, 30.8), (0.12, 38.2), (0.0, 38.3)], 8)
lathe(rh.flat('lead'), 0, TY, [(0.0, 38.2), (0.22, 38.4), (0.2, 38.65), (0.0, 38.85)], 6)
box(rh.flat('iron'), -0.04, 0.04, TY - 0.04, TY + 0.04, 38.8, 39.8)
box(rh.flat('iron'), -0.6, 0.6, TY - 0.03, TY + 0.03, 39.3, 39.4)

# ================================================================== THE GARDEN HOUSE
gh = Node('gardenhouse')
GW = 3.7
walls4(gh.render, -GW, GW, -GW, GW, 0, 7.4)
ring_band(gh.dress, [(-GW, -GW), (GW, -GW), (GW, GW), (-GW, GW)], 7.0, 7.4, 0.25)
ring_band(gh.dress, [(-GW, -GW), (GW, -GW), (GW, GW), (-GW, GW)], 0, 0.45, 0.1)
hip_roof(gh.slate, -GW, GW, -GW, GW, 7.4, 10.6, ov=0.35)
for wf in (WF(0, -GW, 0, -1), WF(0, GW, 0, 1), WF(GW, 0, 1, 0), WF(-GW, 0, -1, 0)):
    gh.atl.wall('gardenwin', wf, -2.1, -1.1, 4.3, 6.2, d=0.03)
    gh.atl.wall('gardenwin', wf, 1.1, 2.1, 4.3, 6.2, d=0.03)
    gh.atl.wall('gardendoor', wf, -0.8, 0.8, 0.45, 3.6, d=0.03)
    for s in (-GW + 0.02, GW - 0.32):
        block(gh.dress, wf, s, s + 0.3, 0.45, 7.0, 0, 0.05, top=False)
chimney(gh, 0, 0, 9.4, 11.6, 0.9, 0.9, 'render', 2)

# ================================================================== THE RICHMOND TOWER
rt = Node('richmond')
BX, BY = 3.0, 6.5           # half depth (along the avenue) and half width of the gate block
AW, ASP, AAP = 6.0, 4.3, 8.3  # the arch: width, springing, apex
TOP = 11.0
rub = rt.rubble
head = pointed_head(0, ASP, AW, AAP, 6)
wfw, wfe = WF(-BX, 0, -1, 0), WF(BX, 0, 1, 0)   # west (SCR) face: s = -y; east face: s = y
# west face: s = -y so the arch head (s from -3 to 3) is the same; the panel runs -BY..BY
arch_face(rub, wfw, -BY, BY, 0, TOP, head)
arch_face(rub, wfe, -BY, BY, 0, TOP, head)
rub.facen([(-BX, BY, 0), (BX, BY, 0), (BX, BY, TOP), (-BX, BY, TOP)], (0, 1, 0))
rub.facen([(-BX, -BY, 0), (BX, -BY, 0), (BX, -BY, TOP), (-BX, -BY, TOP)], (0, -1, 0))
arch_soffit(rt.ashlar, wfw, head, 0, 2 * BX)
rt.flat('lead').facen([(-BX, -BY, TOP - 0.4), (BX, -BY, TOP - 0.4), (BX, BY, TOP - 0.4), (-BX, BY, TOP - 0.4)], (0, 0, 1))
# a dressed hood over the arch, the corbel table, the little window and the arms, the battlements
for wf in (wfw, wfe):
    band(rt.ashlar, wf, [(p[0] * 1.08, ASP + (p[1] - ASP) * 1.06) for p in head], 0.3, 0.12, ends=True)
    rt.atl.wall('corbel', wf, -BY, BY, 9.3, 10.3, d=0.03)
    block(rt.ashlar, wf, -BY - 0.15, BY + 0.15, 10.3, TOP, 0, 0.3, top=False, bottom=True)
rt.atl.wall('rtwin', wfw, -0.7, 0.7, 8.6, 9.25, d=0.03)
rt.atl.wall('arms', wfe, -0.7, 0.7, 8.45, 9.25, d=0.03)
rt.atl.wall('rtwin', wfe, -2.6, -2.0, 6.0, 6.8, d=0.03)
rt.atl.wall('rtwin', wfe, 2.0, 2.6, 6.0, 6.8, d=0.03)
par = [(-BX - 0.15, -BY - 0.15), (BX + 0.15, -BY - 0.15), (BX + 0.15, BY + 0.15), (-BX - 0.15, BY + 0.15), (-BX - 0.15, -BY - 0.15)]
wall_path(rub, par, 0.4, TOP, TOP + 0.5, closed=False, top=rt.ashlar, caps=False)
rub.crenellate([(x, y) for x, y in par], TOP + 0.5, h=0.75, t=0.4, merlon=0.9, gap=0.7)
# the north corner pier, rising over the battlements
box(rub, -BX - 0.3, -BX + 1.7, BY - 1.7, BY + 0.3, 0, TOP + 1.8)
rub.crenellate([(-BX - 0.3, BY - 1.7), (-BX + 1.7, BY - 1.7), (-BX + 1.7, BY + 0.3), (-BX - 0.3, BY + 0.3), (-BX - 0.3, BY - 1.7)], TOP + 1.8, h=0.6, t=0.35, merlon=0.6, gap=0.5)
# the round turret at the south corner, its corbelled parapet and battlements, arrow slits
TCX, TCY, TR = -0.6, -BY - 1.4, 2.6
lathe(rub, TCX, TCY, [(TR, 0), (TR, 13.6)], 14)
lathe(rt.ashlar, TCX, TCY, [(TR, 13.6), (TR + 0.35, 14.1), (TR + 0.35, 15.2)], 14)
rt.flat('lead').facen([(TCX + (TR + 0.1) * math.cos(a * math.tau / 14), TCY + (TR + 0.1) * math.sin(a * math.tau / 14), 15.0) for a in range(14)], (0, 0, 1))
tpts = [(TCX + (TR + 0.17) * math.cos(a * math.tau / 28), TCY + (TR + 0.17) * math.sin(a * math.tau / 28)) for a in range(29)]
rub.crenellate(tpts, 15.2, h=0.8, t=0.35, merlon=0.7, gap=0.55)
for a, z in ((math.pi * 1.0, 5.0), (math.pi * 1.35, 9.0), (math.pi * 0.7, 11.2), (math.pi * 1.7, 7.0)):
    wf = WF(TCX + TR * math.cos(a), TCY + TR * math.sin(a), math.cos(a), math.sin(a))
    rt.atl.wall('slit', wf, -0.18, 0.18, z, z + 1.1, d=0.03)
# gates in the arch (open, folded back against the jambs) and short flanking walls towards the boundary wall
for sg in (-1, 1):
    y = sg * (AW / 2 - 0.12)
    rt.cut.facen([(BX - 0.3, y, 0), (BX - 2.9, y, 0), (BX - 2.9, y, 3.6), (BX - 0.3, y, 3.6)], (0, -sg, 0),
                 [rt.cut.tc('gate', 0, 1), rt.cut.tc('gate', 1, 1), rt.cut.tc('gate', 1, 0), rt.cut.tc('gate', 0, 0)])
wall_path(rub, [(-0.8, BY + 0.2), (-0.8, BY + 7.0)], 0.6, 0, 3.6, top=rt.ashlar)
wall_path(rub, [(-0.8, TCY - TR + 0.2), (-0.8, TCY - TR - 1.6)], 0.6, 0, 3.6, top=rt.ashlar)

# ================================================================== finish
roots = {}
all_objs = []
for node in (gaol, ch, rh, gh, rt):
    objs = node.build()
    roots[node.name] = objs
    all_objs += objs
print('TRIANGLES before AO', kit.tris(all_objs), {n: kit.tris(o) for n, o in roots.items()})
kit.bake_ao_vertex(all_objs, distance=2.0, samples=24, cell=3.2, passes=1,
                   nosub=tuple(o.name for o in all_objs if o.name.endswith(('_copper', '_dress'))))
for name, objs in roots.items():
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root)
    for o in objs:
        o.parent = root
print('TRIANGLES', kit.tris(all_objs), {n: kit.tris(o) for n, o in roots.items()})
kit.export(os.path.join(OUT, 'kilmainham.glb'), os.path.join(SRC, 'kilmainham.blend') if os.path.isdir(SRC) else None)
print('DONE')

"""Áras an Uachtaráin and the Dublin Zoo heroes: the President's house (south garden front, portico, terrace, yews,
wings, the north entrance portico), the zoo's entrance building and its 1833 thatched lodge, the Kaziranga elephant
house and a giraffe house on the African Plains.

Run headless:  blender -b --factory-startup -P tools/blender/build_aras.py -- public/models models

Sources: docs/research/aras-zoo.md (OSM way 26636056, refs/aras-zoo/*).
Built directly in game metres. The park squeezes east-west to 0.35 of real (0.5 x PARK_X 0.7), which would make the
77 m south front 28 m long under real-height walls; instead the house is built at 0.64 of real along the front,
0.55 in depth and 0.7 in height, so the long low Palladian front keeps its proportions (docs §3.2). Each hero is its
own node (an empty at its ground-level origin); nodes are spread along X only for the AO bake.
Axes: X along the front (west -> east), Y back into the building, Z up. Fronts face -Y; the game turns local -Y
(three's +Z) to face the lawn / the path.
Materials (heroes.js parkMaterials; stoneMaterials where the park has none): pk_stucco (floodlit), pk_slate,
pk_decal (sash windows; glow at night), pk_pdecal, pk_pcut (the Parliament atlas: balusters, Ionic volutes), pk_candle
(the light in the window), pk_hedge, pk_gravel, pk_white, pk_flaggreen, pk_flagorange, pk_zgranite, pk_zglass,
pk_timber, pk_fascia, pk_thatch, pk_render, pk_dark, pk_clad, pk_lead.
"""
import bpy, bmesh, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Decals

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

# the Parliament House atlas (px in 512; must match heroes.js PDECAL)
PDECAL = dict(ionic=(256, 0, 128, 64), door=(448, 0, 64, 128), balust=(256, 256, 256, 64), blind=(384, 128, 128, 128))


def pv(region, s, t):
    u0, v0, w, h = PDECAL[region]
    return ((u0 + s * w) / 512, 1 - (v0 + t * h) / 512)


PREG = lambda r: [pv(r, 0, 1), pv(r, 1, 1), pv(r, 1, 0), pv(r, 0, 0)]

bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}
for k, c in dict(stucco=(0.85, 0.84, 0.8), slate=(0.07, 0.08, 0.09), decal=(1, 1, 1), pdecal=(1, 1, 1), pcut=(1, 1, 1),
                 candle=(0.9, 0.8, 0.6), hedge=(0.05, 0.1, 0.04), gravel=(0.5, 0.47, 0.42), white=(0.85, 0.84, 0.8),
                 flaggreen=(0.0, 0.35, 0.15), flagorange=(0.9, 0.4, 0.05), zgranite=(0.6, 0.59, 0.56), zglass=(0.2, 0.25, 0.26),
                 timber=(0.35, 0.22, 0.12), fascia=(0.2, 0.21, 0.22), thatch=(0.3, 0.22, 0.13), render=(0.7, 0.67, 0.6),
                 dark=(0.02, 0.02, 0.02), clad=(0.6, 0.57, 0.5), lead=(0.2, 0.21, 0.22)).items():
    MATS[k] = kit.material('pk_' + k, c)


class Node:
    """A hero: one Part per material, parented to an empty named after the node."""
    def __init__(self, name):
        self.name, self.parts, self.extra = name, {}, []

    def __getattr__(self, key):
        if key.startswith('__'):
            raise AttributeError(key)
        if key not in self.parts:
            # cut-outs, decals and the candle skip the AO bake (kit hides objects whose name ends in 'decal')
            skip = key in ('decal', 'pdecal', 'pcut', 'candle')
            self.parts[key] = (Decals if key == 'decal' else Part)(f'{self.name}_{key}' + ('decal' if skip and key != 'decal' else ''), tile=3.0)
        return self.parts[key]

    def build(self, x):
        root = bpy.data.objects.new(self.name, None)
        bpy.context.collection.objects.link(root)
        objs = []
        for key, part in self.parts.items():
            ob = part.build(MATS[key])
            ob.parent = root
            objs.append(ob)
        for ob in self.extra:
            ob.parent = root
            objs.append(ob)
        root.location = (x, 0, 0)
        return root, objs


# ---------------------------------------------------------------- helpers
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


def hip(part, x0, x1, y0, y1, z0, z1):
    kit.hip(part, x0, x1, y0, y1, z0, z1)


def lathe(part, profile, sides, cx=0.0, cy=0.0, cap=True):
    """Surface of revolution: profile = [(r, z), ...] bottom to top."""
    rings = [[(cx + math.cos(k / sides * math.tau) * r, cy + math.sin(k / sides * math.tau) * r, z) for k in range(sides)] for r, z in profile]
    for a, b in zip(rings, rings[1:]):
        for k in range(sides):
            j = (k + 1) % sides
            am = (k + 0.5) / sides * math.tau
            oq(part, [a[k], a[j], b[j], b[k]] if a[k] != a[j] else [a[k], b[j], b[k]], (math.cos(am), math.sin(am), 0.3))
    if cap and profile[-1][0] > 0:
        oq(part, rings[-1], (0, 0, 1))


def win(n, region, face, c, u0, u1, z0, z1):
    """A window decal on an axis wall: face 's' (y = c, facing -Y), 'n', 'e' (x = c, facing +X), 'w'."""
    axis, facing = {'s': ('y', -1), 'n': ('y', 1), 'e': ('x', 1), 'w': ('x', -1)}[face]
    n.decal.on(region, axis, c, facing, u0, u1, z0, z1)


def pdecal(part, region, face, c, u0, u1, z0, z1, off=0.03):
    """A quad with Parliament-atlas UVs on an axis plane (like Decals.on)."""
    if face == 's':
        y = c - off; oq(part, [(u0, y, z0), (u1, y, z0), (u1, y, z1), (u0, y, z1)], (0, -1, 0), PREG(region))
    elif face == 'n':
        y = c + off; oq(part, [(u1, y, z0), (u0, y, z0), (u0, y, z1), (u1, y, z1)], (0, 1, 0), PREG(region))
    elif face == 'e':
        x = c + off; oq(part, [(x, u0, z0), (x, u1, z0), (x, u1, z1), (x, u0, z1)], (1, 0, 0), PREG(region))
    else:
        x = c - off; oq(part, [(x, u1, z0), (x, u0, z0), (x, u0, z1), (x, u1, z1)], (-1, 0, 0), PREG(region))


def balustrade(n, a, b, z, h=1.0, bay=1.6):
    """A straight balustrade from a to b (x, y): plinth, cut-out balusters (both faces), rail."""
    (ax, ay), (bx, by) = a, b
    L = math.hypot(bx - ax, by - ay)
    dx, dy = (bx - ax) / L, (by - ay) / L
    nx, ny = -dy, dx
    t = 0.2
    def slab(z0, z1, w):
        p = lambda s, o, zz: (ax + dx * s + nx * o, ay + dy * s + ny * o, zz)
        for o, sg in ((w, 1), (-w, -1)):
            oq(n.stucco, [p(0, o, z0), p(L, o, z0), p(L, o, z1), p(0, o, z1)], (nx * sg, ny * sg, 0))
        oq(n.stucco, [p(0, -w, z1), p(L, -w, z1), p(L, w, z1), p(0, w, z1)], (0, 0, 1))
        oq(n.stucco, [p(0, -w, z0), p(L, -w, z0), p(L, w, z0), p(0, w, z0)], (0, 0, -1))
    slab(z, z + 0.2, t)
    slab(z + h - 0.16, z + h, t + 0.03)
    k = max(1, round(L / bay))
    for i in range(k):
        s0, s1 = L * i / k, L * (i + 1) / k
        for sg in (1, -1):
            q = [(ax + dx * s0, ay + dy * s0, z + 0.2), (ax + dx * s1, ay + dy * s1, z + 0.2), (ax + dx * s1, ay + dy * s1, z + h - 0.16), (ax + dx * s0, ay + dy * s0, z + h - 0.16)]
            oq(n.pcut, q if sg > 0 else [q[1], q[0], q[3], q[2]], (nx * sg, ny * sg, 0), PREG('balust') if sg > 0 else [pv('balust', 1, 1), pv('balust', 0, 1), pv('balust', 0, 0), pv('balust', 1, 0)])


def pedestal(n, x, y, z0, z1, h=0.32, urn=False):
    box(n.stucco, x - h, x + h, y - h, y + h, z0, z1)
    box(n.stucco, x - h - 0.06, x + h + 0.06, y - h - 0.06, y + h + 0.06, z1, z1 + 0.12)
    if urn:
        lathe(n.stucco, [(0.14, z1 + 0.12), (0.26, z1 + 0.3), (0.28, z1 + 0.55), (0.14, z1 + 0.72), (0.18, z1 + 0.78), (0.0, z1 + 0.9)], 8, x, y, cap=False)


def column(n, x, y, z0, z1, r0, r1, order='ionic'):
    """A free-standing column: square plinth, torus, tapered shaft, capital (Ionic volutes as a cut-out band)."""
    box(n.stucco, x - r0 * 1.3, x + r0 * 1.3, y - r0 * 1.3, y + r0 * 1.3, z0, z0 + 0.28)
    lathe(n.stucco, [(r0 * 1.18, z0 + 0.28), (r0 * 1.2, z0 + 0.4), (r0 * 1.05, z0 + 0.55), (r0, z0 + 0.6)], 12, x, y, cap=False)
    zc = z1 - (0.55 if order == 'ionic' else 0.45)
    lathe(n.stucco, [(r0, z0 + 0.6), (r0 * 0.99, z0 + (zc - z0) * 0.35), (r1, zc)], 12, x, y, cap=False)
    if order == 'ionic':
        lathe(n.stucco, [(r1, zc), (r1 * 1.12, zc + 0.12)], 12, x, y, cap=False)
        box(n.stucco, x - r0 * 1.35, x + r0 * 1.35, y - r0 * 1.2, y + r0 * 1.2, z1 - 0.18, z1, 'nsewtb')
        for sg in (-1, 1):  # the volutes, front and back
            yy = y + sg * r0 * 1.02
            q = [(x - r0 * 1.7, yy, zc - 0.1), (x + r0 * 1.7, yy, zc - 0.1), (x + r0 * 1.7, yy, z1 - 0.12), (x - r0 * 1.7, yy, z1 - 0.12)]
            oq(n.pcut, q, (0, sg, 0), PREG('ionic'))
        box(n.stucco, x - r0 * 1.0, x + r0 * 1.0, y - r0 * 1.0, y + r0 * 1.0, zc + 0.05, z1 - 0.18, 'ew')  # the bolster sides
    else:  # Tuscan / Doric: echinus and abacus
        lathe(n.stucco, [(r1, zc), (r1 * 1.1, zc + 0.12), (r1 * 1.3, zc + 0.25)], 12, x, y, cap=False)
        box(n.stucco, x - r0 * 1.35, x + r0 * 1.35, y - r0 * 1.35, y + r0 * 1.35, zc + 0.25, z1, 'nsewtb')


def pediment(n, x0, x1, yf, yb, zb, apex, rake=0.32, tymp=0.22):
    """A pediment: tympanum recessed behind the raking cornice at y = yf, the roof slopes running back to yb."""
    xm = (x0 + x1) / 2
    oq(n.stucco, [(x0 + 0.4, yf + tymp, zb), (x1 - 0.4, yf + tymp, zb), (xm, yf + tymp, apex - rake)], (0, -1, 0))
    for s0, s1 in ((x0, xm), (x1, xm)):
        sg = 1 if s0 < s1 else -1
        a, b = (s0, yf, zb), (s1, yf, apex)
        ai, bi = (s0 + sg * 0.5, yf, zb), (s1, yf, apex - rake)
        oq(n.stucco, [a, b, bi, ai], (0, -1, 0))                                   # raking cornice face
        oq(n.stucco, [ai, bi, (s1, yf + tymp, apex - rake), (s0 + sg * 0.5, yf + tymp, zb)], (0, 0, -1))  # its soffit
        oq(n.slate, [(s0, yf, zb), (s1, yf, apex), (s1, yb, apex), (s0, yb, zb)], (-sg * (apex - zb), 0, abs(s1 - s0)))  # roof slope
    oq(n.stucco, [(x0, yf, zb - 0.02), (x1, yf, zb - 0.02), (x1, yf + tymp, zb - 0.02), (x0, yf + tymp, zb - 0.02)], (0, 0, 1))


def chimney(n, x, y, z0, z1, hx=0.5, hy=0.8, pots=2):
    box(n.stucco, x - hx, x + hx, y - hy, y + hy, z0, z1, 'nsew')
    box(n.stucco, x - hx - 0.12, x + hx + 0.12, y - hy - 0.12, y + hy + 0.12, z1, z1 + 0.28)
    for k in range(pots):
        py = y + (k - (pots - 1) / 2) * hy * 0.9
        lathe(n.render, [(0.17, z1 + 0.28), (0.14, z1 + 0.62), (0.18, z1 + 0.68)], 6, x, py, cap=True)


def windows_row(n, face, c, xs, z0, z1, w, region='sash'):
    for x in xs:
        win(n, region, face, c, x - w / 2, x + w / 2, z0, z1)


# ================================================================= Áras an Uachtaráin
A = Node('aras')
TZ = 1.05                  # terrace / ground-floor level
ZE = 9.65                  # capitals top = architrave bottom
ZC = 11.4                  # main cornice top
ZB = 11.8                  # blocking course top
HC, HP = 16.3, 24.8        # half-widths: centre block, whole main range (pavilions 16.3 .. 24.8)
PAV = 1.4                  # the pavilions stand this far forward of the centre block
D = 11.5                   # depth of the main range
# walls (the centre block has no end walls: the pavilions close it)
box(A.stucco, -HC, HC, 0.0, D, -0.3, ZC, 'sn')
for s in (-1, 1):
    x0, x1 = sorted((s * HC, s * HP))
    box(A.stucco, x0, x1, -PAV, D, -0.3, ZC, 'snew')
# base course, first-floor string course, the cornice (projecting) and the blocking course
for (x0, x1, y0) in ((-HC, HC, 0.0), (-HP, -HC, -PAV), (HC, HP, -PAV)):
    box(A.stucco, x0 - (0.1 if x0 == -HP else 0), x1 + (0.1 if x1 == HP else 0), y0 - 0.1, y0, -0.3, 0.9, 's')
    box(A.stucco, x0, x1, y0 - 0.12, y0, 5.55, 5.8, 'stb')
    box(A.stucco, x0, x1, y0 - 0.38, y0, ZC - 0.5, ZC, 'stb')
    box(A.stucco, x0, x1, y0 - 0.06, y0, ZC, ZB, 'st')
for s in (-1, 1):  # cornice returns round the pavilions' fronts and the ends
    x = s * HP
    box(A.stucco, min(x, x + s * 0.38), max(x, x + s * 0.38), -PAV - 0.38, D + 0.38, ZC - 0.5, ZC, 'ewtbsn')
    box(A.stucco, s * HC - (0.0 if s > 0 else 0.38), s * HC + (0.38 if s > 0 else 0.0), -PAV - 0.38, 0.0, ZC - 0.5, ZC, 'ewtb')
box(A.stucco, -HP, HP, D, D + 0.38, ZC - 0.5, ZC, 'ntb')
# roofs: a hip over the centre block, one over each pavilion (ridges front to back)
hip(A.slate, -HC - 0.3, HC + 0.3, -0.35, D + 0.35, ZB, ZB + 3.4)
for s in (-1, 1):
    x0, x1 = sorted((s * (HC - 0.3), s * (HP + 0.4)))
    hip(A.slate, x0, x1, -PAV - 0.4, D + 0.4, ZB, ZB + 2.6)
# the portico: four giant Ionic columns on the terrace, entablature, pediment
CY = -2.6
for x in (-6.7, -2.23, 2.23, 6.7):
    column(A, x, CY, TZ, ZE, 0.46, 0.4)
box(A.stucco, -7.45, 7.45, CY - 0.55, 0.0, ZE, ZC - 0.5, 'sewb')              # architrave + frieze
box(A.stucco, -7.75, 7.75, CY - 0.85, 0.0, ZC - 0.5, ZC, 'sewtb')              # cornice
box(A.stucco, -7.45, 7.45, CY - 0.6, CY - 0.55, ZE + 0.62, ZE + 0.68, 's')      # architrave fascia line
pediment(A, -7.75, 7.75, CY - 0.85, 3.2, ZC, ZC + 3.6)
for x in (-6.7, 6.7):  # pilasters on the wall behind the end columns
    box(A.stucco, x - 0.42, x + 0.42, -0.14, 0.0, TZ, ZE, 'sew')
# the terrace, its balustrade and the steps down to the gravel
TX, TY = 8.8, -4.6
box(A.stucco, -TX, TX, TY, 0.0, -0.3, TZ, 'sewt')
box(A.gravel, -TX + 0.1, TX - 0.1, TY + 0.1, -0.1, TZ + 0.005, TZ + 0.01, 't')
for s in (-1, 1):
    balustrade(A, (s * 3.6, TY + 0.25), (s * (TX - 0.35), TY + 0.25), TZ)
    balustrade(A, (s * (TX - 0.25), TY + 0.35), (s * (TX - 0.25), -0.2), TZ)
    pedestal(A, s * 3.3, TY + 0.25, TZ, TZ + 1.05, urn=False)
    pedestal(A, s * (TX - 0.3), TY + 0.3, TZ, TZ + 1.05, urn=True)
for k in range(5):
    y1 = TY - k * 0.45
    box(A.stucco, -3.6, 3.6, y1 - 0.45, y1, -0.3, TZ - (k + 1) * TZ / 5.5, 'sewt')
box(A.gravel, -9.4, 9.4, -11.0, TY - 2.25, -0.3, 0.03, 't')    # the gravel sweep between the yews
# windows. Under the portico: tall ground-floor sashes, first-floor sashes; the flanking bays of the centre block have
# the tall round-headed windows; the pavilions two bays each
for x in (-4.47, 0.0, 4.47):
    win(A, 'sash', 's', 0.0, x - 0.7, x + 0.7, TZ + 0.3, TZ + 3.4)
    win(A, 'sash', 's', 0.0, x - 0.65, x + 0.65, 6.45, 8.0)
    box(A.stucco, x - 0.75, x + 0.75, -0.05, 0.0, 4.95, 5.35, 's')       # the recessed panels read as raised aprons
for s in (-1, 1):
    x = s * 11.6
    win(A, 'round', 's', 0.0, x - 1.25, x + 1.25, TZ + 0.2, TZ + 4.1)
    box(A.stucco, x - 1.55, x + 1.55, -0.08, 0.0, TZ + 0.1, TZ + 0.3, 's')
    win(A, 'sash', 's', 0.0, x - 0.65, x + 0.65, 6.45, 8.0)
    for x in (s * 18.9, s * 22.4):
        win(A, 'sash', 's', -PAV, x - 0.65, x + 0.65, TZ + 0.45, TZ + 3.2)
    for x in (s * 18.9, s * 22.4):
        if s > 0 and x > 22:
            continue  # the east pavilion's outer first-floor window carries the candle (below)
        win(A, 'sash', 's', -PAV, x - 0.65, x + 0.65, 6.45, 8.0)
    for y in (1.6, 5.2, 8.8):
        win(A, 'sash', 'e' if s > 0 else 'w', s * HP, y - 0.65, y + 0.65, TZ + 0.45, TZ + 3.2)
        win(A, 'sash', 'e' if s > 0 else 'w', s * HP, y - 0.65, y + 0.65, 6.45, 8.0)
# the light in the window (a lamp kept lit for the Irish abroad, since 1990; which window is est.): the east pavilion's
# outer first-floor window, above the yews, so it shows from the avenue
win(A, 'sash', 's', -PAV, 22.4 - 0.65, 22.4 + 0.65, 6.45, 8.0)
oq(A.candle, [(22.4 - 0.43, -PAV - 0.05, 6.62), (22.4 + 0.43, -PAV - 0.05, 6.62), (22.4 + 0.43, -PAV - 0.05, 7.83), (22.4 - 0.43, -PAV - 0.05, 7.83)], (0, -1, 0))
# the north (entrance) front
windows_row(A, 'n', D, [x for x in (-22.4, -18.9, -13.5, -10.0, 10.0, 13.5, 18.9, 22.4)], TZ + 0.45, TZ + 3.2, 1.3)
windows_row(A, 'n', D, [x for x in (-22.4, -18.9, -13.5, -10.0, -6.2, 6.2, 10.0, 13.5, 18.9, 22.4)], 6.45, 8.0, 1.3)
# chimney stacks (tall, white, along the roofs; refs 01, 04) and the flagpoles with the tricolour
for x, y in ((-14.6, 3.2), (-6.3, 5.75), (3.8, 5.75), (7.0, 5.75), (14.8, 3.2), (-20.55, 7.5), (20.55, 7.5)):
    chimney(A, x, y, ZB + 1.0, ZB + 5.9)


def flagpole(n, x, y, z0, z1, flag=True):
    lathe(n.white, [(0.09, z0), (0.05, z1), (0.09, z1 + 0.05), (0.0, z1 + 0.2)], 6, x, y, cap=False)
    if not flag:
        return
    L, H = 2.8, 1.4
    for k, key in enumerate(('flaggreen', 'white', 'flagorange')):
        u0, u1 = k / 3, (k + 1) / 3
        pts = []
        for u in (u0, u1):
            wav = math.sin(u * 5.0) * 0.18 * u
            pts.append((x + 0.08 + u * L, y + wav, z1 - H))
        q = [pts[0], pts[1], (pts[1][0], pts[1][1], z1 - 0.05), (pts[0][0], pts[0][1], z1 - 0.05)]
        part = getattr(n, key)
        oq(part, q, (0, -1, 0)); oq(part, q[::-1], (0, 1, 0))


flagpole(A, 0.0, 4.6, ZB + 2.6, 25.5)
# the east range (set back; the EU flag over it) and the west wing, lower
box(A.stucco, HP, 56.8, 7.7, 17.7, -0.3, 9.6, 'snet')
box(A.stucco, HP, 56.8, 7.7 - 0.3, 7.7, 9.2, 9.6, 'st')
hip(A.slate, HP - 0.3, 57.1, 7.4, 18.0, 9.6, 12.2)
windows_row(A, 's', 7.7, [HP + 2.6 + 3.2 * k for k in range(10)], TZ + 0.2, TZ + 2.9, 1.2)
windows_row(A, 's', 7.7, [HP + 2.6 + 3.2 * k for k in range(10)], 5.6, 7.1, 1.2)
chimney(A, 36.0, 12.7, 10.8, 14.2); chimney(A, 50.0, 12.7, 10.8, 14.2)
flagpole(A, 44.0, 12.7, 12.0, 20.5, flag=False)
box(A.stucco, -52.8, -HP, 6.3, 12.5, -0.3, 7.5, 'snwt')
box(A.stucco, -52.8, -HP, 6.0, 6.3, 7.1, 7.5, 'st')
hip(A.slate, -53.1, -HP + 0.3, 6.0, 12.8, 7.5, 9.6)
windows_row(A, 's', 6.3, [-HP - 2.4 - 3.1 * k for k in range(9)], TZ + 0.1, TZ + 2.5, 1.1)
windows_row(A, 's', 6.3, [-HP - 2.4 - 3.1 * k for k in range(9)], 4.4, 5.8, 1.1)
chimney(A, -40.0, 9.4, 8.6, 11.6, pots=3)
# the north ranges behind (offices, the 1911 wing) and the north entrance portico (Doric, est.)
box(A.stucco, -HP, -8.0, D, 26.0, -0.3, 9.0, 'nwet')
hip(A.slate, -HP - 0.3, -7.7, D - 0.3, 26.3, 9.0, 11.6)
windows_row(A, 'e', -8.0, [14.5 + 3.2 * k for k in range(4)], TZ + 0.3, TZ + 3.0, 1.2)
windows_row(A, 'e', -8.0, [14.5 + 3.2 * k for k in range(4)], 5.8, 7.2, 1.2)
box(A.stucco, 12.3, 40.4, D, 19.8, -0.3, 9.0, 'nwet')
hip(A.slate, 12.0, 40.7, D - 0.3, 20.1, 9.0, 11.4)
windows_row(A, 'n', 19.8, [14.5 + 3.3 * k for k in range(8)], TZ + 0.3, TZ + 3.0, 1.2)
windows_row(A, 'n', 19.8, [14.5 + 3.3 * k for k in range(8)], 5.8, 7.2, 1.2)
NY = D + 2.4
for x in (-2.1, -0.7, 0.7, 2.1):
    column(A, x, NY, TZ, 6.4, 0.3, 0.27, order='doric')
box(A.stucco, -2.7, 2.7, D, NY + 0.45, 6.4, 7.5, 'newtb')
box(A.stucco, -2.7, 2.7, D, NY + 0.45, -0.3, TZ, 'newt')
oq(A.stucco, [(2.9, NY + 0.6, 7.5), (-2.9, NY + 0.6, 7.5), (0.0, NY + 0.6, 9.0)], (0, 1, 0))
oq(A.slate, [(-2.9, NY + 0.6, 7.5), (0.0, NY + 0.6, 9.0), (0.0, D, 9.0), (-2.9, D, 7.5)], (-1.5, 0, 2.9))
oq(A.slate, [(2.9, NY + 0.6, 7.5), (0.0, NY + 0.6, 9.0), (0.0, D, 9.0), (2.9, D, 7.5)], (1.5, 0, 2.9))
pdecal(A.pdecal, 'door', 'n', D, -0.8, 0.8, TZ, TZ + 3.1)
for k in range(3):
    box(A.stucco, -2.4, 2.4, NY + 0.45 + k * 0.4, NY + 0.85 + k * 0.4, -0.3, TZ - (k + 1) * TZ / 3.5, 'newt')
# the yews: tall clipped hedges either side of the terrace hiding the pavilions' ground floors, topiary drums by the
# steps (refs 01, 02, 04)
for s in (-1, 1):
    x0, x1 = sorted((s * 9.4, s * 27.0))
    box(A.hedge, x0, x1, -7.2, -2.3, -0.3, 3.6, 'snew')
    box(A.hedge, x0 + 0.35, x1 - 0.35, -6.85, -2.65, 3.6, 4.2, 'snewt')
    lathe(A.hedge, [(1.0, -0.2), (1.05, 2.6), (0.9, 3.1), (0.45, 3.4), (0.0, 3.45)], 8, s * 4.6, TY - 2.9, cap=False)

# ================================================================= Dublin Zoo: the entrance building (2010s)
# a long low pavilion on the zoo's edge by the Hollow: a pale granite wall with DUBLIN ZOO in raised letters, a glazed
# band above it, a deep flat roof with a timber soffit; the turnstile passage under the canopy at the west end
# (refs 11, 12). Built along X, the lettered wall faces -Y (the park).
Z = Node('zooentrance')
ZL = 14.0
box(Z.zgranite, -ZL, ZL, 0.0, 0.7, -0.3, 2.6, 'snewt')
for k in range(1, 4):  # the block coursing reads as shallow joints
    box(Z.zgranite, -ZL, ZL, -0.015, 0.0, k * 0.65 - 0.02, k * 0.65 + 0.02, 's')
box(Z.zglass, -ZL, ZL, 0.9, 5.8, -0.3, 4.3, 'snew')
for k in range(15):  # mullions on the glazing, front and back
    x = -ZL + 1.0 + k * 1.95
    box(Z.fascia, x - 0.05, x + 0.05, 0.84, 0.9, 2.6, 4.3, 's')
    box(Z.fascia, x - 0.05, x + 0.05, 5.8, 5.86, 0.0, 4.3, 'n')
box(Z.zgranite, -ZL, -ZL + 1.0, 0.7, 5.8, -0.3, 4.3, 'snew')
box(Z.fascia, -ZL - 7.0, ZL + 0.8, -1.5, 6.8, 4.3, 4.72, 'snewt')
box(Z.timber, -ZL - 6.9, ZL + 0.7, -1.4, 6.7, 4.29, 4.3, 'b')
for x in (-ZL - 6.3, -ZL - 3.2):  # canopy posts over the turnstiles
    box(Z.fascia, x - 0.1, x + 0.1, 0.2, 0.4, 0.0, 4.3, 'snew')
for k in range(4):   # turnstiles and the gate
    x = -ZL - 5.9 + k * 1.3
    box(Z.dark, x - 0.3, x + 0.3, 1.6, 2.4, 0.0, 1.05, 'snewt')
box(Z.zgranite, -ZL - 7.0, -ZL - 6.4, 0.0, 6.0, -0.3, 1.2, 'snewt')
# the letters (Blender's built-in sans, extruded; standing proud of the wall)
cu = bpy.data.curves.new('zooletters', 'FONT')
cu.body = 'DUBLIN ZOO'
cu.size = 1.25
cu.align_x = 'CENTER'
cu.extrude = 0.035
cu.resolution_u = 2
cu.fill_mode = 'BOTH'
tob = bpy.data.objects.new('zooletters', cu)
bpy.context.collection.objects.link(tob)
dg = bpy.context.evaluated_depsgraph_get()
me = bpy.data.meshes.new_from_object(tob.evaluated_get(dg))
bpy.data.objects.remove(tob, do_unlink=True)
bm = bmesh.new(); bm.from_mesh(me)
for v in bm.verts:
    x, y, z = v.co
    v.co = (x + 3.0, -0.04 - z, y + 0.75)   # stand it up on the wall face (y = 0), facing -Y
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bm.to_mesh(me); bm.free()
lob = bpy.data.objects.new('zooentrance_letters', me)
bpy.context.collection.objects.link(lob)
lob.data.materials.append(MATS['zgranite'])
Z.extra.append(lob)

# the 1833 entrance lodge: a thatched cottage orné, half-timbered, a bay window, lattice windows (ref 13)
Lg = Node('zoolodge')
LX, LY, LH = 2.4, 3.3, 2.6
box(Lg.render, -LX, LX, -LY, LY, -0.3, LH, 'snew')
for x in (-LX, -LX / 3, LX / 3, LX):   # timber posts and rails on the long faces
    for y, f in ((-LY, 's'), (LY, 'n')):
        box(Lg.timber, x - 0.09, x + 0.09, y - 0.05 if f == 's' else y, y if f == 's' else y + 0.05, 0.0, LH, 's' if f == 's' else 'n')
for y, f in ((-LY, 's'), (LY, 'n')):
    for z in (0.55, LH - 0.12):
        box(Lg.timber, -LX, LX, y - 0.05 if f == 's' else y, y if f == 's' else y + 0.05, z - 0.07, z + 0.07, f)
for x in (-LX, LX):
    for y in (-LY, 0.0, LY):
        box(Lg.timber, x - 0.05 if x < 0 else x, x if x < 0 else x + 0.05, y - 0.09, y + 0.09, 0.0, LH, 'w' if x < 0 else 'e')
for x in (-1.0, 1.0):
    win(Lg, 'sash', 's', -LY, x - 0.35, x + 0.35, 0.95, 2.0)
win(Lg, 'sash', 'e', LX, -1.9, -1.1, 0.95, 2.0)
win(Lg, 'door', 'w', -LX, -0.45, 0.45, 0.0, 2.1)
box(Lg.render, -1.9, -0.6, -LY - 0.9, -LY, 0.3, LH - 0.4, 'sewt')   # the bay window
box(Lg.timber, -1.9, -0.6, -LY - 0.95, -LY - 0.9, 0.3, 0.45, 's')
win(Lg, 'sash', 's', -LY - 0.9, -1.75, -0.75, 0.9, 1.95)
hip(Lg.thatch, -LX - 0.95, LX + 0.95, -LY - 0.95, LY + 0.95, LH - 0.35, LH + 1.35)
hip(Lg.thatch, -LX - 0.35, LX + 0.35, -LY - 0.35, LY + 0.35, LH + 1.0, LH + 3.0)
box(Lg.render, -0.3, 0.3, 1.0, 1.6, LH + 1.5, LH + 3.6)
lathe(Lg.dark, [(0.06, LH + 2.9), (0.03, LH + 3.6), (0.0, LH + 3.8)], 5, 0.0, 0.0, cap=False)

# ================================================================= the Kaziranga elephant house (pale cladding, curved roof)
E = Node('elephanthouse')
EX, EY, EH = 6.5, 8.5, 6.2
box(E.clad, -EX, EX, -EY, EY, -0.3, EH, 'snew')
for k in range(1, 6):
    box(E.clad, -EX - 0.03, EX + 0.03, -EY - 0.03, EY + 0.03, k * 1.1, k * 1.1 + 0.05, 'snew')
N_ = 8
prof = [(math.cos(math.pi * (1 - i / N_)) * (EX + 0.5), EH + math.sin(math.pi * i / N_) * 2.6) for i in range(N_ + 1)]
for (x0, z0), (x1, z1) in zip(prof, prof[1:]):
    oq(E.lead, [(x0, -EY - 0.5, z0), (x1, -EY - 0.5, z1), (x1, EY + 0.5, z1), (x0, EY + 0.5, z0)], (-(z1 - z0), 0, x1 - x0))
for y, sg in ((-EY, -1), (EY, 1)):
    pts = [(x, y, z) for x, z in prof]
    oq(E.clad, pts, (0, sg, 0))
box(E.dark, -2.2, 2.2, -EY - 0.05, -EY, 0.0, 4.4, 's')   # the big elephant door

# ================================================================= a giraffe house on the African Plains: tall, timber-clad
G = Node('giraffehouse')
GX, GY, GH = 4.5, 3.4, 6.8
box(G.timber, -GX, GX, -GY, GY, -0.3, GH, 'snew')
for k in range(-4, 5):
    box(G.dark, k * 1.0 - 0.04, k * 1.0 + 0.04, -GY - 0.04, -GY, 0.0, GH, 's')
G.thatch.gable_x(-GX - 0.6, GX + 0.6, -GY - 0.7, GY + 0.7, GH, GH + 2.6)
G.timber.gable_end_x(-GX, -GY, GY, GH, GH + 2.6, -1)
G.timber.gable_end_x(GX, -GY, GY, GH, GH + 2.6, 1)
for x in (-2.2, 2.2):
    box(G.dark, x - 0.9, x + 0.9, -GY - 0.05, -GY, 0.0, 5.2, 's')   # the tall doors

nodes = [A, Z, Lg, E, G]

# ---- build, bake, export
all_objs, roots = [], []
for i, n in enumerate(nodes):
    root, objs = n.build(i * 150.0)
    roots.append(root); all_objs += objs
bpy.context.view_layer.update()
kit.bake_ao_vertex(all_objs, subdiv=2.5)
for n, root in zip(nodes, roots):
    print('TRIANGLES', n.name, kit.tris([o for o in all_objs if o.parent == root]))
print('TRIANGLES total', kit.tris(all_objs))
kit.export(os.path.join(OUT, 'aras.glb'), os.path.join(SRC, 'aras.blend'))
print('DONE')

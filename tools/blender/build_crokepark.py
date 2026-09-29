"""Croke Park (Gilroy McMahon / HOK Sport, 1993-2005) as a hero GLB with a far LOD.

Run headless:  blender -b --factory-startup -P tools/blender/build_crokepark.py -- public/models models

Sources: docs/research/croke-park.md. A U of three roofed stands (Hogan W, Davin S over the Royal Canal, Cusack E)
with curved corners round a 145 x 88 m pitch, and the open Hill 16 / Nally terrace at the north end. Leaning
concrete frame on Y-shaped "tree" columns; a continuous cantilevered roof whose front edge is a row of shallow
arched bays with floodlights, crowned along its back by white A-frame masts every ~14 m and a lattice truss.

Frame (research doc 3.2): origin at the pitch centre on the ground; Blender +Y = "a", along the pitch towards Hill 16
(N19.3E in the world); +X = "b", across towards the Cusack Stand. Real metres, then plan x0.5 (map-locked, no
inflation) and heights x0.85; the masts are drawn 0.95/0.85 taller so they end up at x0.95. The game turns the
model by -19.3 degrees about the vertical (src/world/sites.js).

The Hogan Stand's rear is trimmed from b = -130 to -118 so it clears Jones's Road. The Royal Canal (in the game
11 m wide + 5 m verges, i.e. 22 + 10 m in this frame) runs under the back of the Davin Stand: the stand's base stops
at the north water edge, and its rear block spans the water on piers with arched openings, with stair towers and
footbridges on the south bank.

Two root nodes: 'stadium' (full detail, AO baked into COLOR_0) and 'stadium_far' (~2k-triangle silhouette).
UVs: cp_tile uses a 1024 x 2048 tiling texture of 8 horizontal bands (repeats along u only; see TILE below),
cp_decal a 1024 atlas (DECAL below), cp_turf one 640 x 1024 pitch image; all painted at load in src/world/heroes.js.
Materials: cp_tile, cp_concrete, cp_white, cp_decal, cp_turf, cp_flood
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
os.makedirs(OUT, exist_ok=True); os.makedirs(SRC, exist_ok=True)

PLAN, HEIGHT, MAST = 0.5, 0.85, 0.95
MK = MAST / HEIGHT          # mast heights are drawn this much taller before the x0.85
PK = 1 / PLAN               # plan-thickness compensation: a tube drawn r*PK ends up r wide in the game

# ---- tiling texture bands (px rows in a 1024 x 2048 canvas; 8 px padding inside each 256 px band) ----
TILE_H = 2048
BAND = dict(seatlo=0, seathi=1, under=2, deck=3, clad=4, terrace=5, ads=6, roof=7)


def tv(band, t):
    """v (Blender convention) for fraction t (0 = top of the band as painted) of a band."""
    y = BAND[band] * 256 + 8 + t * 240
    return 1 - y / TILE_H


# ---- decal atlas regions (px in 1024; must match heroes.js CP_DECAL) ----
DECAL = dict(
    lattice=(0, 0, 1024, 64), wordmark=(0, 64, 1024, 128), welcome=(0, 192, 512, 96), museum=(512, 192, 512, 96),
    hogan=(0, 288, 512, 48), cusack=(0, 336, 512, 48), davin=(0, 384, 512, 48), hill=(0, 432, 512, 48),
    turnstile=(512, 288, 512, 192), screen=(0, 480, 256, 128), lamps=(256, 480, 128, 64),
)


def dv(region, s, t):
    u0, v0, w, h = DECAL[region]
    return ((u0 + s * w) / 1024, 1 - (v0 + t * h) / 1024)


bpy.ops.wm.read_factory_settings(use_empty=True)
M = dict(tile=kit.material('cp_tile', (0.5, 0.5, 0.5)), concrete=kit.material('cp_concrete', (0.51, 0.5, 0.46)),
         white=kit.material('cp_white', (0.8, 0.82, 0.83)), decal=kit.material('cp_decal', (1, 1, 1)),
         turf=kit.material('cp_turf', (0.1, 0.3, 0.08)), flood=kit.material('cp_flood', (1, 1, 1)))


class P(Part):
    def f(self, pts, uvs=None, want=None):
        """Face with its winding chosen so the normal points along `want` (the side that is seen)."""
        if want is not None:
            a, b, c = Vector(pts[0]), Vector(pts[1]), Vector(pts[-1])
            n = Vector((0, 0, 0))
            for i in range(len(pts)):  # Newell normal (robust for ngons)
                p, q = Vector(pts[i]), Vector(pts[(i + 1) % len(pts)])
                n += Vector(((p.y - q.y) * (p.z + q.z), (p.z - q.z) * (p.x + q.x), (p.x - q.x) * (p.y + q.y)))
            if n.dot(Vector(want)) < 0:
                pts = pts[::-1]
                uvs = uvs[::-1] if uvs else None
        return self.face(pts, uvs)

    def tube(self, p0, p1, r, sides=6, cap=False):
        """A prism of radius r (plan-compensated) from p0 to p1."""
        a, b = Vector(p0), Vector(p1)
        ax = (b - a).normalized()
        ref = Vector((0, 0, 1)) if abs(ax.z) < 0.9 else Vector((1, 0, 0))
        u = ax.cross(ref).normalized(); w = ax.cross(u).normalized()
        ring = lambda c: [c + (u * math.cos(k / sides * math.tau) + w * math.sin(k / sides * math.tau)) * r for k in range(sides)]
        ra, rb = ring(a), ring(b)
        # plan-compensate: stretch horizontal offsets by PK
        fix = lambda c, v: Vector((c.x + (v.x - c.x) * PK, c.y + (v.y - c.y) * PK, v.z))
        ra = [fix(a, v) for v in ra]; rb = [fix(b, v) for v in rb]
        for k in range(sides):
            q = [ra[k], ra[(k + 1) % sides], rb[(k + 1) % sides], rb[k]]
            mid = (a + b) / 2
            self.f([tuple(v) for v in q], [(0.5, 0.5)] * 4, want=tuple(((q[0] + q[2]) / 2) - mid))
        if cap:
            self.f([tuple(v) for v in rb], None, want=tuple(b - a))

    def cyl(self, cx, cy, r, z0, z1, sides=12, top=True, bottom=False):
        pts = [(cx + math.cos(k / sides * math.tau) * r, cy + math.sin(k / sides * math.tau) * r) for k in range(sides)]
        for i in range(sides):
            (ax, ay), (bx, by) = pts[i], pts[(i + 1) % sides]
            self.f([(ax, ay, z0), (bx, by, z0), (bx, by, z1), (ax, ay, z1)], None, want=((ax + bx) / 2 - cx, (ay + by) / 2 - cy, 0))
        if top:
            self.f([(x, y, z1) for x, y in pts], None, want=(0, 0, 1))
        if bottom:
            self.f([(x, y, z0) for x, y in pts], None, want=(0, 0, -1))

    def obox(self, c, t, n, hl, d0, d1, z0, z1, top=True, bottom=False, ends=True):
        """Box aligned to a path frame: centre c (x, y), tangent t, outward normal n; hl half-length along t,
        d0..d1 along n, z0..z1."""
        P_ = lambda s, d, z: (c[0] + t[0] * s + n[0] * d, c[1] + t[1] * s + n[1] * d, z)
        faces = [
            ([P_(-hl, d1, z0), P_(hl, d1, z0), P_(hl, d1, z1), P_(-hl, d1, z1)], (n[0], n[1], 0)),
            ([P_(-hl, d0, z0), P_(hl, d0, z0), P_(hl, d0, z1), P_(-hl, d0, z1)], (-n[0], -n[1], 0)),
        ]
        if ends:
            faces += [([P_(hl, d0, z0), P_(hl, d1, z0), P_(hl, d1, z1), P_(hl, d0, z1)], (t[0], t[1], 0)),
                      ([P_(-hl, d0, z0), P_(-hl, d1, z0), P_(-hl, d1, z1), P_(-hl, d0, z1)], (-t[0], -t[1], 0))]
        if top:
            faces.append(([P_(-hl, d0, z1), P_(hl, d0, z1), P_(hl, d1, z1), P_(-hl, d1, z1)], (0, 0, 1)))
        if bottom:
            faces.append(([P_(-hl, d0, z0), P_(hl, d0, z0), P_(hl, d1, z0), P_(-hl, d1, z0)], (0, 0, -1)))
        for pts, want in faces:
            self.f(pts, None, want=want)


def abox(part, a0, a1, b0, b1, z0, z1, **kw):
    """Axis-aligned box in the stadium frame (x = b, y = a)."""
    part.obox(((b0 + b1) / 2, (a0 + a1) / 2), (0, 1), (1, 0), (a1 - a0) / 2, -(b1 - b0) / 2, (b1 - b0) / 2, z0, z1, **kw)


tile, con, wht, dec, turf, fl = P('cp_tile'), P('cp_concrete'), P('cp_white'), P('cp_decal'), P('cp_turf'), P('cp_flood')

# ------------------------------------------------------------------------------------------------ the path
# The tier front (inner edge) of the U, from the Hogan Stand's north end, south along the Hogan, round the SW corner,
# along the Davin, round the SE corner and north along the Cusack. Samples every quarter bay; masts on the bays.
R_IN = 12.0
HOGAN_N, CUSACK_N, BLADE = 54.0, 47.0, 2   # stand ends (a) and roof blade bays past them
path = []  # dict(x, y, nx, ny, tx, ty, L, th, mast, stand)


def add(x, y, nx, ny, L, th, mast, stand):
    path.append(dict(x=x, y=y, nx=nx, ny=ny, tx=ny, ty=-nx, L=L, th=th, mast=mast, stand=stand))


def build_path():
    L, th = 0.0, 0.0
    # blade past the Hogan end, then the Hogan (b = -50) southwards; n = -X, travel -Y
    bay = (HOGAN_N + 68) / 9
    y0 = HOGAN_N + BLADE * bay
    for k in range((9 + BLADE) * 4):
        y = y0 - k * bay / 4
        add(-50, y, -1, 0, L, th, k % 4 == 0, 'blade' if y > HOGAN_N + 0.01 else 'hogan'); L += bay / 4
    for k in range(24):  # SW corner, centre (-38, -68), angle 180 -> 270
        a = math.radians(180 + k * 3.75)
        add(-38 + math.cos(a) * R_IN, -68 + math.sin(a) * R_IN, math.cos(a), math.sin(a), L, th, k % 4 == 0, 'sw'); th += math.radians(3.75)
    bay = 76 / 5
    for k in range(5 * 4):
        add(-38 + k * bay / 4, -80, 0, -1, L, th, k % 4 == 0, 'davin'); L += bay / 4
    for k in range(24):  # SE corner, centre (38, -68), 270 -> 360
        a = math.radians(270 + k * 3.75)
        add(38 + math.cos(a) * R_IN, -68 + math.sin(a) * R_IN, math.cos(a), math.sin(a), L, th, k % 4 == 0, 'se'); th += math.radians(3.75)
    bay = (CUSACK_N + 68) / 8
    for k in range((8 + BLADE) * 4 + 1):
        y = -68 + k * bay / 4
        add(50, y, 1, 0, L, th, k % 4 == 0, 'blade' if y > CUSACK_N + 0.01 else 'cusack'); L += bay / 4


build_path()


def pos(p, d, z):
    return (p['x'] + p['nx'] * d, p['y'] + p['ny'] * d, z)


def arc(p, d):
    """Arc length along the path at offset d from the tier front (corners are longer further out)."""
    return p['L'] + p['th'] * (R_IN + d)


# ------------------------------------------------------------------------------------------------ the bowl
# Section (d = metres out from the tier front, z up): lower tier, premium level with boxes, upper tier, then the rear:
# the underside of the upper tier, the clad premium band and the open concourse decks under it.
SEC_TOP = [  # (d, z, band or material, v at start, v at end, tile u metres, want (dn, dz))
    ((0, 0), (0, 1.3), 'ads', 0.55, 1.0, 24, (-1, 0)),
    ((0, 1.3), (22, 11), 'seatlo', 1.0, 0.0, 12, (-0.4, 1)),
    ((22, 11), (22, 12.4), 'ads', 0.5, 0.0, 24, (-1, 0)),
    ((22, 12.4), (27.5, 16.2), 'seathi', 1.0, 0.72, 12, (-0.4, 1)),
    ((27.5, 16.2), (27.5, 19.2), 'clad', 0.72, 0.28, 8, (-1, 0)),
    ((27.5, 19.2), (46, 34.5), 'seathi', 0.72, 0.0, 12, (-0.4, 1)),
]
SEC_REAR = [
    ((46, 34.5), (46.8, 34.5), None, 0, 0, 0, (0, 1)),
    ((46.8, 34.5), (46.8, 32.6), None, 0, 0, 0, (1, 0)),
    ((46.8, 32.6), (34, 22), 'under', 0.0, 1.0, 14, (1, -1)),
    ((34, 22), (34, 11), 'clad', 0.0, 1.0, 8, (1, 0)),
    ((34, 11), (34, 0), 'deck', 0.25, 1.0, 10, (1, 0)),
]


def sweep(i0, i1, section, part_tile, part_plain, rear_skip=None):
    for i in range(i0, i1):
        p, q = path[i], path[i + 1]
        if p['stand'] == 'blade' or q['stand'] == 'blade':
            continue
        for (d0, z0), (d1, z1), band, v0, v1, tu, (wn, wz) in section:
            if rear_skip and rear_skip(p, (d0, z0), (d1, z1)):
                continue
            pts = [pos(p, d0, z0), pos(q, d0, z0), pos(q, d1, z1), pos(p, d1, z1)]
            want = ((p['nx'] + q['nx']) / 2 * wn, (p['ny'] + q['ny']) / 2 * wn, wz)
            if band:
                ua, ub = arc(p, d0) / tu, arc(q, d0) / tu
                uc, ud = arc(q, d1) / tu, arc(p, d1) / tu
                part_tile.f(pts, [(ua, tv(band, v0)), (ub, tv(band, v0)), (uc, tv(band, v1)), (ud, tv(band, v1))], want=want)
            else:
                part_plain.f(pts, None, want=want)


def hogan_rear_hidden(p, a, b):
    # behind the Hogan's rear block (z < 14.5 at d = 34) the concourse decks are hidden
    return p['stand'] == 'hogan' and a[0] == 34 and b[0] == 34 and max(a[1], b[1]) <= 11.01


N = len(path) - 1
sweep(0, N, SEC_TOP, tile, con)
sweep(0, N, SEC_REAR, tile, con, rear_skip=hogan_rear_hidden)

# stand ends (Hogan north end at index of HOGAN_N, Cusack north end): the section outline as an end wall
PROFILE = [(0, 0), (0, 1.3), (22, 11), (22, 12.4), (27.5, 16.2), (27.5, 19.2), (46, 34.5), (46.8, 34.5), (46.8, 32.6), (34, 22), (34, 0)]
ends = [i for i in range(N) if path[i]['stand'] != 'blade' and (path[i - 1]['stand'] == 'blade' if i else False)]
ends += [i for i in range(N) if path[i]['stand'] != 'blade' and path[i + 1]['stand'] == 'blade']
for i in ends:
    p = path[i]
    outward = (0, 1, 0)  # both ends face north (+a)
    con.f([pos(p, d, z) for d, z in PROFILE], None, want=outward)

# ------------------------------------------------------------------------------------------------ the roof
RF_D0, RF_D1 = 8.0, 47.0
rtop = lambda d: 43.5 + (d - RF_D0) / (RF_D1 - RF_D0) * (41.5 - 43.5)
rund = lambda d: 42.3 + (d - RF_D0) / (RF_D1 - RF_D0) * (37.6 - 42.3)
for i in range(N):
    p, q = path[i], path[i + 1]
    tu = 14
    u = lambda pp, d: arc(pp, d) / tu
    # top sheet (upper half of the roof band) and the underside panels (lower half)
    tile.f([pos(p, RF_D0, rtop(RF_D0)), pos(q, RF_D0, rtop(RF_D0)), pos(q, RF_D1, rtop(RF_D1)), pos(p, RF_D1, rtop(RF_D1))],
           [(u(p, RF_D0), tv('roof', 0)), (u(q, RF_D0), tv('roof', 0)), (u(q, RF_D1), tv('roof', 0.48)), (u(p, RF_D1), tv('roof', 0.48))], want=(0, 0, 1))
    tile.f([pos(p, RF_D0, rund(RF_D0)), pos(q, RF_D0, rund(RF_D0)), pos(q, RF_D1, rund(RF_D1)), pos(p, RF_D1, rund(RF_D1))],
           [(u(p, RF_D0), tv('roof', 0.52)), (u(q, RF_D0), tv('roof', 0.52)), (u(q, RF_D1), tv('roof', 1)), (u(p, RF_D1), tv('roof', 1))], want=(0, 0, -1))
    # back face
    nb = ((p['nx'] + q['nx']) / 2, (p['ny'] + q['ny']) / 2, 0)
    con.f([pos(p, RF_D1, rund(RF_D1)), pos(q, RF_D1, rund(RF_D1)), pos(q, RF_D1, rtop(RF_D1)), pos(p, RF_D1, rtop(RF_D1))], None, want=nb)
    # front fascia: scalloped, one shallow arch per bay (sub-sample k of 4 within the bay)
    k = i % 4
    zb = lambda kk: 40.5 + 1.6 * math.sin(math.pi * kk / 4)
    fp = [pos(p, RF_D0, zb(k)), pos(q, RF_D0, zb(k + 1)), pos(q, RF_D0, rtop(RF_D0)), pos(p, RF_D0, rtop(RF_D0))]
    con.f(fp, None, want=(-nb[0], -nb[1], 0))
    con.f(fp, None, want=nb)  # its back, seen from the upper tier
    # the floodlight strip along the underside of the leading edge
    fl.f([pos(p, RF_D0 + 0.3, zb(k) + 0.05), pos(q, RF_D0 + 0.3, zb(k + 1) + 0.05), pos(q, RF_D0 + 1.6, rund(RF_D0 + 1.6) - 0.05), pos(p, RF_D0 + 1.6, rund(RF_D0 + 1.6) - 0.05)], None, want=(0, 0, -1))
    # floodlight clusters on the bay crowns (on top of the roof edge, facing the pitch)
    if k == 2:
        c = (q['x'] + q['nx'] * (RF_D0 + 1.2), q['y'] + q['ny'] * (RF_D0 + 1.2))
        fl.obox(c, (q['tx'], q['ty']), (q['nx'], q['ny']), 1.8, -0.6, 0.6, rtop(RF_D0) - 0.1, rtop(RF_D0) + 1.4)
# blade ends: close the roof slab
for i in (0, N):
    p = path[i]
    t = (p['tx'], p['ty'], 0) if i == 0 else (-p['tx'], -p['ty'], 0)
    con.f([pos(p, RF_D0, rund(RF_D0)), pos(p, RF_D1, rund(RF_D1)), pos(p, RF_D1, rtop(RF_D1)), pos(p, RF_D0, rtop(RF_D0))], None, want=(-t[0], -t[1], 0))

# ------------------------------------------------------------------------------------------------ crown: truss + masts
TR_D, TR_Z0, TR_Z1 = 45.0, 41.7, 44.8
masts = [i for i in range(N + 1) if path[i]['mast']]
for a_, b_ in zip(masts, masts[1:]):
    p, q = path[a_], path[b_]
    # top and bottom chords, and the lattice web between them (alpha decal, double-sided in the game)
    wht.tube(pos(p, TR_D, TR_Z1), pos(q, TR_D, TR_Z1), 0.22, 4)
    wht.tube(pos(p, TR_D, TR_Z0), pos(q, TR_D, TR_Z0), 0.18, 4)
    L = math.dist(pos(p, TR_D, 0), pos(q, TR_D, 0))
    rep = max(1, round(L / 6))
    dec.f([pos(p, TR_D, TR_Z0), pos(q, TR_D, TR_Z0), pos(q, TR_D, TR_Z1), pos(p, TR_D, TR_Z1)],
          [(0, dv('lattice', 0, 1)[1]), (rep, dv('lattice', 0, 1)[1]), (rep, dv('lattice', 0, 0)[1]), (0, dv('lattice', 0, 0)[1])],
          want=(p['nx'], p['ny'], 0))
for i in masts:
    p = path[i]
    t = (p['tx'], p['ty'])
    base = lambda s: (p['x'] + p['nx'] * TR_D + t[0] * s, p['y'] + p['ny'] * TR_D + t[1] * s, TR_Z1)
    apex = pos(p, TR_D + 0.6, TR_Z1 + 8.6 * MK)
    wht.tube(base(-2.6), apex, 0.34, 6)
    wht.tube(base(2.6), apex, 0.34, 6)
    mid = lambda s: (p['x'] + p['nx'] * (TR_D + 0.3) + t[0] * s, p['y'] + p['ny'] * (TR_D + 0.3) + t[1] * s, TR_Z1 + 4.2 * MK)
    wht.tube(mid(-1.35), mid(1.35), 0.14, 4)
    # tie rods fanning down to the roof in front and to the stand's back behind
    for d, z in ((26, rtop(26)), (11, rtop(11))):
        wht.tube(apex, pos(p, d, z), 0.07, 3)
    for s in (-3.2, 3.2):
        wht.tube(apex, (p['x'] + p['nx'] * 47.2 + t[0] * s, p['y'] + p['ny'] * 47.2 + t[1] * s, 34.3), 0.07, 3)

# ------------------------------------------------------------------------------------------------ Y columns
# the leaning frame's "tree" columns under the back of the upper tier (not on the blades)
for i in masts:
    p = path[i]
    if p['stand'] == 'blade':
        continue
    zb0 = 14.5 if p['stand'] == 'hogan' else (-2.5 if p['stand'] == 'davin' else 0)
    trunk_top = pos(p, 40.2, 17.5)
    con.tube(pos(p, 39.2, zb0), trunk_top, 0.75, 6)
    con.tube(trunk_top, pos(p, 36.0, 23.6), 0.55, 6)
    con.tube(trunk_top, pos(p, 45.8, 32.0), 0.55, 6)
    con.tube(pos(p, 46.4, 34.2), pos(p, 46.9, RF_D1 and rund(RF_D1)), 0.4, 4)  # raking strut up to the roof's back

# ------------------------------------------------------------------------------------------------ Hogan rear
# stacked concourse decks behind the stand, turnstile blocks along Jones's Road (rear face trimmed to b = -118)
HB_OUT, HB_IN, HB_Z = -112.0, -84.0, 14.5


def deckbox(a0, a1, b0, b1, z0, z1, levels=4, faces=('w', 'e', 's', 'n')):
    """Box with the deck band on its sides (v scaled so each level is one painted level) and a concrete top."""
    vb = 1 - levels / 4
    sides = dict(w=((b0, a0), (b0, a1), (-1, 0)), e=((b1, a1), (b1, a0), (1, 0)), s=((b1, a0), (b0, a0), (0, -1)), n=((b0, a1), (b1, a1), (0, 1)))
    for k in faces:
        (xa, ya), (xb, yb), (wx, wy) = sides[k]
        L = math.hypot(xb - xa, yb - ya)
        tile.f([(xa, ya, z0), (xb, yb, z0), (xb, yb, z1), (xa, ya, z1)],
               [(0, tv('deck', 1)), (L / 10, tv('deck', 1)), (L / 10, tv('deck', vb)), (0, tv('deck', vb))], want=(wx, wy, 0))
    con.f([(b0, a0, z1), (b1, a0, z1), (b1, a1, z1), (b0, a1, z1)], None, want=(0, 0, 1))


deckbox(-68, HOGAN_N, HB_OUT, HB_IN, 0, HB_Z, faces=('w', 'n'))
deckbox(-100, -68, HB_OUT, -72, 0, HB_Z, faces=('w', 's', 'e'))
for a0, a1 in ((-62, -42), (-22, -2), (14, 34), (40, 52)):
    abox(con, a0, a1, -118, HB_OUT, 0, 4.6)
    dec.f([(-118.05, a0, 0), (-118.05, a1, 0), (-118.05, a1, 4.2), (-118.05, a0, 4.2)],
          [dv('turnstile', 1, 1), dv('turnstile', 0, 1), dv('turnstile', 0, 0), dv('turnstile', 1, 0)], want=(-1, 0, 0))
    dec.f([(-118.3, a0, 4.25), (-118.3, a1, 4.25), (-118.3, a1, 5.35), (-118.3, a0, 5.35)],
          [dv('hogan', 1, 1), dv('hogan', 0, 1), dv('hogan', 0, 0), dv('hogan', 1, 0)], want=(-1, 0, 0))
# two stair turrets on the Hogan's back
for a in (-30, 8):
    con.cyl(-114.5, a, 2.6, 0, 18.5, 10)

# ------------------------------------------------------------------------------------------------ Cusack rear
# two projections of stacked concourse decks with zig-zag ramps, the dark hospitality block between them
CB_IN = 84.0
for a0, a1 in ((-68, -43), (4, 44)):
    deckbox(a0, a1, CB_IN, 108, 0, 17.6, faces=('e', 's', 'n'))
    for zl in (4.4, 8.8, 13.2, 17.6):
        abox(con, a0 - 0.8, a1 + 0.8, 107.6, 109.2, zl - 0.45, zl + 0.1)
    # zig-zag ramps on the face
    for k in range(4):
        y0, y1 = (a0 + 2, a1 - 2) if k % 2 == 0 else (a1 - 2, a0 + 2)
        z0, z1 = k * 4.4, k * 4.4 + 4.4
        for x0, x1 in ((109.3, 111.6),):
            pts = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z1), (x0, y1, z1)]
            con.f(pts, None, want=(0, 0, 1))
            con.f([(x0, y0, z0 - 0.5), (x1, y0, z0 - 0.5), (x1, y1, z1 - 0.5), (x0, y1, z1 - 0.5)], None, want=(0, 0, -1))
            con.f([(x1, y0, z0 - 0.5), (x1, y1, z1 - 0.5), (x1, y1, z1), (x1, y0, z0)], None, want=(1, 0, 0))
tile.f([(96, -42.5, 7), (96, 3.5, 7), (96, 3.5, 20), (96, -42.5, 20)], [(0, tv('clad', 1)), (47 / 8, tv('clad', 1)), (47 / 8, tv('clad', 0)), (0, tv('clad', 0))], want=(1, 0, 0))
con.f([(CB_IN, -42.5, 20), (96, -42.5, 20), (96, 3.5, 20), (CB_IN, 3.5, 20)], None, want=(0, 0, 1))
con.f([(CB_IN, -42.5, 7), (96, -42.5, 7), (96, 3.5, 7), (CB_IN, 3.5, 7)], None, want=(0, 0, -1))
for a in (-42.5, 3.5):
    s = -1 if a < 0 else 1
    tile.f([(CB_IN, a, 7), (96, a, 7), (96, a, 20), (CB_IN, a, 20)], [(0, tv('clad', 1)), (12 / 8, tv('clad', 1)), (12 / 8, tv('clad', 0)), (0, tv('clad', 0))], want=(0, -s, 0))
for a in (-6.0, 52.0):
    con.cyl(100 if a < 0 else 90, a, 2.6, 0, 20.0, 10)
# museum and welcome panels at the Cusack's south end (the GAA Museum entrance, St Joseph's Avenue side)
dec.f([(96, -68.05, 1.2), (108, -68.05, 1.2), (108, -68.05, 3.6), (96, -68.05, 3.6)], [dv('museum', 0, 1), dv('museum', 1, 1), dv('museum', 1, 0), dv('museum', 0, 0)], want=(0, -1, 0))
dec.f([(106, -42.9, 2.4), (92, -42.9, 2.4), (92, -42.9, 4.8), (106, -42.9, 4.8)], [dv('welcome', 0, 1), dv('welcome', 1, 1), dv('welcome', 1, 0), dv('welcome', 0, 0)], want=(0, 1, 0))
for a0 in (-66, 6, 26):
    dec.f([(108.1, a0, 3.2), (108.1, a0 + 14, 3.2), (108.1, a0 + 14, 4.3), (108.1, a0, 4.3)], [dv('cusack', 1, 1), dv('cusack', 0, 1), dv('cusack', 0, 0), dv('cusack', 1, 0)], want=(1, 0, 0))

# ------------------------------------------------------------------------------------------------ Davin over the canal
# The canal in the game frame: centre a(b) = -121.7 - 0.0201 (b + 279), 22 m wide (11 game metres).
ac = lambda b: -121.7 - 0.0201 * (b + 279)
DB0, DB1, DZ0, DZ1 = 34.2, 58.0, 6.0, 20.0     # the block spans d 35..58 (a -115..-138), soffit 6 m, top 20 m
DW = 38.0
TOWERS = (-34.0, 34.0)   # stair towers on the south bank, either side of the wordmark
bays = 6
pier_b = [-DW + k * (2 * DW / bays) for k in range(bays + 1)]
# the block: a clad front with ribbon glazing over the water, soffit, ends, roof terrace
tile.f([(-DW, -80 - DB1, DZ0), (DW, -80 - DB1, DZ0), (DW, -80 - DB1, DZ1), (-DW, -80 - DB1, DZ1)],
       [(0, tv('clad', 1)), (2 * DW / 8, tv('clad', 1)), (2 * DW / 8, tv('clad', 0)), (0, tv('clad', 0))], want=(0, -1, 0))
con.f([(-DW, -80 - DB0, DZ0), (DW, -80 - DB0, DZ0), (DW, -80 - DB1, DZ0), (-DW, -80 - DB1, DZ0)], None, want=(0, 0, -1))
con.f([(-DW, -80 - DB0, DZ1), (DW, -80 - DB0, DZ1), (DW, -80 - DB1, DZ1), (-DW, -80 - DB1, DZ1)], None, want=(0, 0, 1))
for s in (-1, 1):
    tile.f([(s * DW, -80 - DB0, DZ0), (s * DW, -80 - DB1, DZ0), (s * DW, -80 - DB1, DZ1), (s * DW, -80 - DB0, DZ1)],
           [(0, tv('clad', 1)), (23 / 8, tv('clad', 1)), (23 / 8, tv('clad', 0)), (0, tv('clad', 0))], want=(s, 0, 0))
# the wordmark across the front, and the stand name
dec.f([(-27, -80 - DB1 - 0.08, 14.9), (27, -80 - DB1 - 0.08, 14.9), (27, -80 - DB1 - 0.08, 19.2), (-27, -80 - DB1 - 0.08, 19.2)],
      [dv('wordmark', 0, 1), dv('wordmark', 1, 1), dv('wordmark', 1, 0), dv('wordmark', 0, 0)], want=(0, -1, 0))
dec.f([(-12, -80 - DB1 - 0.08, 6.4), (12, -80 - DB1 - 0.08, 6.4), (12, -80 - DB1 - 0.08, 7.8), (-12, -80 - DB1 - 0.08, 7.8)],
      [dv('davin', 0, 1), dv('davin', 1, 1), dv('davin', 1, 0), dv('davin', 0, 0)], want=(0, -1, 0))
# piers standing in the water along the south edge, with arched openings between them (front and both ends)
PZ0 = -3.0
for b in pier_b:
    abox(con, -80 - DB1 + 0.2, -80 - DB1 + 2.6, b - 1.2, b + 1.2, PZ0, DZ0, top=False)


def arch_face(p0, p1, z_spring, z_crown, z_top, want, seg=8):
    """A wall face from z_top down to a segmental arch between p0 and p1 (plan points)."""
    for k in range(seg):
        t0, t1 = k / seg, (k + 1) / seg
        a = [p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0]
        b = [p0[0] + (p1[0] - p0[0]) * t1, p0[1] + (p1[1] - p0[1]) * t1]
        za = z_spring + (z_crown - z_spring) * math.sqrt(max(0.0, 1 - (2 * t0 - 1) ** 2))  # round-headed
        zb_ = z_spring + (z_crown - z_spring) * math.sqrt(max(0.0, 1 - (2 * t1 - 1) ** 2))
        con.f([(a[0], a[1], za), (b[0], b[1], zb_), (b[0], b[1], z_top), (a[0], a[1], z_top)], None, want=want)


yF = -80 - DB1 - 0.02
for b0, b1 in zip(pier_b, pier_b[1:]):
    arch_face((b0 + 1.2, yF), (b1 - 1.2, yF), 1.2, 4.6, DZ0, (0, -1, 0))
# the canal goes in and out under the stand at both ends of the block
for s in (-1, 1):
    x = s * (DW + 0.02)
    arch_face((x, -80 - DB0), (x, -80 - DB1 + 2.6), 1.2, 4.9, DZ0, (s, 0, 0))
# stair towers with round landings on the south bank, footbridges over the water into the stand
for b in TOWERS:
    ya = ac(b) - 11 - 5.5
    con.cyl(b, ya, 3.0, 0, 24.5, 12)
    for zl in (6.5, 13.0, 19.5):
        con.cyl(b, ya, 5.2, zl - 0.55, zl, 12, top=True, bottom=True)
    for zl in (6.5, 13.0):
        abox(con, ya + 3.0, -80 - DB1, b - 1.4, b + 1.4, zl - 0.6, zl, bottom=True)
        for s in (-1, 1):  # parapet walls
            abox(con, ya + 3.0, -80 - DB1, b + s * 1.4 - 0.12, b + s * 1.4 + 0.12, zl, zl + 1.05, bottom=False)

# ------------------------------------------------------------------------------------------------ Hill 16 and the Nally terrace
def resample(poly, n):
    L = [0.0]
    for a, b in zip(poly, poly[1:]):
        L.append(L[-1] + math.dist(a, b))
    out = []
    for k in range(n):
        s = L[-1] * k / (n - 1)
        i = 1
        while i < len(L) - 1 and L[i] < s:
            i += 1
        t = (s - L[i - 1]) / ((L[i] - L[i - 1]) or 1)
        a, b = poly[i - 1], poly[i]
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


IN = [(-50, HOGAN_N), (-50, 66)] + [(-38 + math.cos(math.radians(180 - k * 15)) * 12, 66 + math.sin(math.radians(180 - k * 15)) * 12) for k in range(1, 6)] + \
     [(-38, 78), (38, 78)] + [(38 + math.cos(math.radians(90 - k * 15)) * 12, 66 + math.sin(math.radians(90 - k * 15)) * 12) for k in range(1, 6)] + [(50, 66), (50, CUSACK_N)]
OUTL = [(HB_OUT, HOGAN_N), (HB_OUT, 59), (-96, 59), (-96, 71), (-77, 88), (-28, 92), (-26, 100), (48, 112), (71, 104), (85, 73), (CB_IN, CUSACK_N)]
NH = 30
ri, ro = resample(IN, NH), resample(OUTL, NH)
H_IN, H_OUT = 1.2, 12.5
Lh = 0.0
for k in range(NH - 1):
    a0, a1, b0, b1 = ri[k], ri[k + 1], ro[k], ro[k + 1]
    ln = math.dist(a0, a1)
    pts = [(a0[0], a0[1], H_IN), (a1[0], a1[1], H_IN), (b1[0], b1[1], H_OUT), (b0[0], b0[1], H_OUT)]
    tile.f(pts, [(Lh / 12, tv('terrace', 1)), ((Lh + ln) / 12, tv('terrace', 1)), ((Lh + ln) / 12, tv('terrace', 0)), (Lh / 12, tv('terrace', 0))], want=(0, 0, 1))
    Lh += ln
    # pitch-side wall
    tile.f([(a0[0], a0[1], 0), (a1[0], a1[1], 0), (a1[0], a1[1], H_IN), (a0[0], a0[1], H_IN)],
           [(Lh / 24, tv('ads', 1)), ((Lh + ln) / 24, tv('ads', 1)), ((Lh + ln) / 24, tv('ads', 0.55)), (Lh / 24, tv('ads', 0.55))], want=(-(a0[0] + a1[0]) / 2, -(a0[1] + a1[1]) / 2, 0))
for pa, pb in zip(OUTL, OUTL[1:]):
    L = math.dist(pa, pb)
    mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
    tile.f([(pa[0], pa[1], 0), (pb[0], pb[1], 0), (pb[0], pb[1], H_OUT + 1.1), (pa[0], pa[1], H_OUT + 1.1)],
           [(0, tv('deck', 1)), (L / 10, tv('deck', 1)), (L / 10, tv('deck', 0.25)), (0, tv('deck', 0.25))], want=(mid[0], mid[1] - 70, 0))
    # parapet on the rear
    con.f([(pa[0], pa[1], H_OUT), (pb[0], pb[1], H_OUT), (pb[0], pb[1], H_OUT + 1.1), (pa[0], pa[1], H_OUT + 1.1)], None, want=(-mid[0], -(mid[1] - 70), 0))
# the big screen block (white) at the Nally end, screen facing the pitch; the floodlight mast behind the Hill
abox(wht, 89.5, 95.5, -49, -25, 0, 19.0)
dec.f([(-47, 89.4, 12.9), (-27, 89.4, 12.9), (-27, 89.4, 18.3), (-47, 89.4, 18.3)], [dv('screen', 0, 1), dv('screen', 1, 1), dv('screen', 1, 0), dv('screen', 0, 0)], want=(0, -1, 0))
dec.f([(-36, 95.6, 12), (-26, 95.6, 12), (-26, 95.6, 13.2), (-36, 95.6, 13.2)], [dv('hill', 1, 1), dv('hill', 0, 1), dv('hill', 0, 0), dv('hill', 1, 0)], want=(0, 1, 0))
MX, MY, MH = -5.0, 110.0, 40.0
corner = lambda s, h: [(MX + sx * s, MY + sy * s, h) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
cb, ct = corner(1.6, 0), corner(0.7, MH)
for k in range(4):
    wht.tube(cb[k], ct[k], 0.16, 3)
    q = [cb[k], cb[(k + 1) % 4], ct[(k + 1) % 4], ct[k]]
    L = MH / 6
    dec.f(q, [(0, dv('lattice', 0, 1)[1]), (0, dv('lattice', 0, 0)[1]), (L, dv('lattice', 0, 0)[1]), (L, dv('lattice', 0, 1)[1])], want=(q[0][0] + q[1][0] - 2 * MX, q[0][1] + q[1][1] - 2 * MY, 0))
abox(wht, MY - 1.2, MY + 0.2, MX - 4.5, MX + 4.5, MH - 1, MH + 4.5)
dec.f([(MX - 4.4, MY - 1.25, MH - 0.8), (MX + 4.4, MY - 1.25, MH - 0.8), (MX + 4.4, MY - 1.25, MH + 4.3), (MX - 4.4, MY - 1.25, MH + 4.3)],
      [dv('lamps', 0, 1), dv('lamps', 1, 1), dv('lamps', 1, 0), dv('lamps', 0, 0)], want=(0, -1, 0))

# ------------------------------------------------------------------------------------------------ pitch and goals
ring = [(p['x'], p['y']) for p in path if p['stand'] != 'blade'] + ri[::-1][1:-1]
TX0, TX1, TY0, TY1 = -50.0, 50.0, -81.0, 79.0
turf.f([(x, y, 0.3) for x, y in ring], [((x - TX0) / (TX1 - TX0), 1 - (TY1 - y) / (TY1 - TY0)) for x, y in ring], want=(0, 0, 1))
for ya in (-72.0, 72.0):
    for xb in (-3.25, 3.25):
        wht.tube((xb, ya, 0), (xb, ya, 13.0), 0.1, 6)
    wht.tube((-3.25, ya, 2.5), (3.25, ya, 2.5), 0.08, 4)

near = [tile.build(M['tile']), con.build(M['concrete']), wht.build(M['white']), dec.build(M['decal']), turf.build(M['turf']), fl.build(M['flood'])]
print('TRIANGLES NEAR (pre-bake)', kit.tris(near))
kit.finish(near, PLAN, HEIGHT)
kit.bake_ao_vertex(near, distance=5.0, samples=24, subdiv=9.0, skip=[near[-1]])
print('TRIANGLES NEAR', kit.tris(near))
root = bpy.data.objects.new('stadium', None); bpy.context.collection.objects.link(root)
for o in near:
    o.parent = root

# ------------------------------------------------------------------------------------------------ far LOD
ftile, fcon, fwht, fturf, ffl = P('cpf_tile'), P('cpf_concrete'), P('cpf_white'), P('cpf_turf'), P('cpf_flood')
fm = [i for i in range(N + 1) if path[i]['mast']]
SEC_F = [((0, 1.3), (22, 11), 'seatlo', 1.0, 0.0, 12, (-0.4, 1)), ((22, 11), (27.5, 19.2), 'seathi', 1.0, 0.72, 12, (-0.4, 1)),
         ((27.5, 19.2), (46, 34.5), 'seathi', 0.72, 0.0, 12, (-0.4, 1))]
SEC_FR = [((46.8, 34.5), (34, 22), 'under', 0.0, 1.0, 14, (1, -1)), ((34, 22), (34, 0), 'clad', 0.0, 1.0, 20, (1, 0))]
for a_, b_ in zip(fm, fm[1:]):
    p, q = path[a_], path[b_]
    for sec in (SEC_F,) if (p['stand'] == 'blade' or q['stand'] == 'blade') else (SEC_F, SEC_FR):
        if p['stand'] == 'blade' or q['stand'] == 'blade':
            break
        for (d0, z0), (d1, z1), band, v0, v1, tu, (wn, wz) in sec:
            pts = [pos(p, d0, z0), pos(q, d0, z0), pos(q, d1, z1), pos(p, d1, z1)]
            want = ((p['nx'] + q['nx']) / 2 * wn, (p['ny'] + q['ny']) / 2 * wn, wz)
            ftile.f(pts, [(arc(p, d0) / tu, tv(band, v0)), (arc(q, d0) / tu, tv(band, v0)), (arc(q, d1) / tu, tv(band, v1)), (arc(p, d1) / tu, tv(band, v1))], want=want)
    nb = ((p['nx'] + q['nx']) / 2, (p['ny'] + q['ny']) / 2, 0)
    ftile.f([pos(p, RF_D0, rtop(RF_D0)), pos(q, RF_D0, rtop(RF_D0)), pos(q, RF_D1, rtop(RF_D1)), pos(p, RF_D1, rtop(RF_D1))],
            [(arc(p, 8) / 14, tv('roof', 0)), (arc(q, 8) / 14, tv('roof', 0)), (arc(q, 47) / 14, tv('roof', 0.48)), (arc(p, 47) / 14, tv('roof', 0.48))], want=(0, 0, 1))
    fcon.f([pos(p, RF_D0, rund(RF_D0)), pos(q, RF_D0, rund(RF_D0)), pos(q, RF_D1, rund(RF_D1)), pos(p, RF_D1, rund(RF_D1))], None, want=(0, 0, -1))
    fcon.f([pos(p, RF_D0, 40.8), pos(q, RF_D0, 40.8), pos(q, RF_D0, rtop(RF_D0)), pos(p, RF_D0, rtop(RF_D0))], None, want=(-nb[0], -nb[1], 0))
    fcon.f([pos(p, RF_D1, rund(RF_D1)), pos(q, RF_D1, rund(RF_D1)), pos(q, RF_D1, rtop(RF_D1)), pos(p, RF_D1, rtop(RF_D1))], None, want=nb)
    # the white crown band (the lattice truss read as a solid band at distance) and the floodlight strip
    fwht.f([pos(p, TR_D, TR_Z0), pos(q, TR_D, TR_Z0), pos(q, TR_D, TR_Z1), pos(p, TR_D, TR_Z1)], None, want=nb)
    fwht.f([pos(p, TR_D, TR_Z0), pos(q, TR_D, TR_Z0), pos(q, TR_D, TR_Z1), pos(p, TR_D, TR_Z1)], None, want=(-nb[0], -nb[1], 0))
    ffl.f([pos(p, RF_D0 + 0.3, 40.85), pos(q, RF_D0 + 0.3, 40.85), pos(q, RF_D0 + 1.6, rund(9.6) - 0.05), pos(p, RF_D0 + 1.6, rund(9.6) - 0.05)], None, want=(0, 0, -1))
    for w in (-1, 1):
        ffl.f([pos(p, RF_D0 + 1.2, 43.6), pos(q, RF_D0 + 1.2, 43.6), pos(q, RF_D0 + 1.2, 44.9), pos(p, RF_D0 + 1.2, 44.9)], None, want=(w * nb[0], w * nb[1], 0))
for i in fm:  # masts: two legs (3-sided, thick enough to read at 500 m) and a cross-tie
    p = path[i]
    t = (p['tx'], p['ty'])
    base = lambda s: (p['x'] + p['nx'] * TR_D + t[0] * s, p['y'] + p['ny'] * TR_D + t[1] * s, TR_Z1)
    apex = pos(p, TR_D + 0.6, TR_Z1 + 8.6 * MK)
    fwht.tube(base(-2.8), apex, 1.1, 3)
    fwht.tube(base(2.8), apex, 1.1, 3)
for i in (0, N):
    p = path[i]
    t = (p['tx'], p['ty'], 0) if i == 0 else (-p['tx'], -p['ty'], 0)
    fcon.f([pos(p, RF_D0, rund(RF_D0)), pos(p, RF_D1, rund(RF_D1)), pos(p, RF_D1, rtop(RF_D1)), pos(p, RF_D0, rtop(RF_D0))], None, want=(-t[0], -t[1], 0))
for i in ends:
    fcon.f([pos(path[i], d, z) for d, z in PROFILE], None, want=(0, 1, 0))
# blocks: Hogan rear, Cusack projections, the Davin over the water, stair towers
abox(fcon, -100, HOGAN_N, -118, HB_IN, 0, HB_Z, ends=True)
for a0, a1 in ((-68, -43), (4, 44)):
    abox(fcon, a0, a1, CB_IN, 109, 0, 17.6)
abox(fcon, -80 - DB1, -80 - DB0, -DW, DW, DZ0, DZ1, bottom=True)
for b in pier_b[::2]:
    abox(fcon, -80 - DB1 + 0.2, -80 - DB1 + 2.6, b - 1.2, b + 1.2, PZ0, DZ0, top=False)
for b in TOWERS:
    fcon.cyl(b, ac(b) - 16.5, 3.0, 0, 24.5, 6)
# Hill 16 coarse, screen, mast
rif, rof = resample(IN, 9), resample(OUTL, 9)
for k in range(8):
    a0, a1, b0, b1 = rif[k], rif[k + 1], rof[k], rof[k + 1]
    ftile.f([(a0[0], a0[1], H_IN), (a1[0], a1[1], H_IN), (b1[0], b1[1], H_OUT), (b0[0], b0[1], H_OUT)],
            [(0, tv('terrace', 1)), (3, tv('terrace', 1)), (3, tv('terrace', 0)), (0, tv('terrace', 0))], want=(0, 0, 1))
    mid = ((b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2)
    fcon.f([(b0[0], b0[1], 0), (b1[0], b1[1], 0), (b1[0], b1[1], H_OUT + 1.1), (b0[0], b0[1], H_OUT + 1.1)], None, want=(mid[0], mid[1] - 70, 0))
abox(fwht, 89.5, 95.5, -49, -25, 0, 19.0)
fwht.tube((MX, MY, 0), (MX, MY, MH), 1.4, 4)
abox(fwht, MY - 1.2, MY + 0.2, MX - 4.5, MX + 4.5, MH - 1, MH + 4.5)
fring = [(path[i]['x'], path[i]['y']) for i in fm if path[i]['stand'] != 'blade'] + rif[::-1][1:-1]
fturf.f([(x, y, 0.3) for x, y in fring], [((x - TX0) / (TX1 - TX0), 1 - (TY1 - y) / (TY1 - TY0)) for x, y in fring], want=(0, 0, 1))

far = [ftile.build(M['tile']), fcon.build(M['concrete']), fwht.build(M['white']), fturf.build(M['turf']), ffl.build(M['flood'])]
kit.finish(far, PLAN, HEIGHT)
print('TRIANGLES FAR', kit.tris(far))
froot = bpy.data.objects.new('stadium_far', None); bpy.context.collection.objects.link(froot)
for o in far:
    o.parent = froot
kit.export(os.path.join(OUT, 'crokepark.glb'), os.path.join(SRC, 'crokepark.blend'))
print('DONE')

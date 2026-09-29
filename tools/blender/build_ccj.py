"""Criminal Courts of Justice (Henry J Lyons, 2010), Parkgate Street: the glass drum at the Phoenix Park end.

Run headless:  blender -b --factory-startup -P tools/blender/build_ccj.py -- public/models models

Sources: docs/research/criminal-courts.md and refs/criminal-courts/*. The plan is the OSM footprint (way 46671353):
a circle of radius 41.4 m on the south half and ~37.5 m on the north, fitted here as R(bearing) = 39.45 - 1.95 cos.
Round it, from the ground: a recessed glazed ground storey; four tiers of "saw-toothed" glazing (each tier leans out
at its foot, each pane steps in plan, white frames at every step: the double-height courtrooms behind); a set-back
glazed top storey under a thin white roof edge, and a glass roof over the central atrium. The drum is cut by bronze-
clad slots (two piers and a recessed louvred face) where the stair and lift cores reach the facade. At the south-east
corner, facing the Parkgate Street / Infirmary Road junction: the double-height glazed lobby behind two limestone
columns under a bronze fascia, a glass canopy, a fan of granite steps, and the curved limestone screen wall with the
bronze Justice figure and "Na Cuirteanna Breithiunais Coiriula / The Criminal Courts of Justice" (on a calp plinth).

Built at real size (x east, y north, z up; origin the drum centre at ground level), then scaled 0.58 in plan and
0.85 in height (kit.finish). One root node `ccj`. Materials (painted at load in src/world/ccj.js):
  ccj_glass  the tier glazing: UVs into a 8 x 4 pane texture (u: facet mod 8, v: tier), with a night emissive twin
  ccj_atlas  everything else opaque: UVs into the 1024 atlas CCJ_ATLAS below (must match src/world/ccj.js)
  ccj_decal  the Justice figure, lettering, harp and flags (same atlas, alpha-tested, double-sided)
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)

# atlas regions, px (x, y, w, h) in 1024 x 1024 - keep in step with CCJ_ATLAS in src/world/ccj.js
A = dict(
    white=(0, 0, 64, 64), roof=(64, 0, 64, 64), steps=(128, 0, 64, 64), canopy=(192, 0, 64, 64),
    bronze=(0, 64, 256, 192), ground=(256, 0, 256, 128), top=(256, 128, 256, 128),
    louvre=(512, 0, 256, 512), lobby=(768, 0, 256, 256), skylight=(768, 256, 256, 256),
    stone=(0, 256, 256, 512), calp=(256, 256, 256, 128), core=(256, 384, 256, 384),
    justice=(512, 512, 256, 256), text=(0, 768, 1024, 128), harp=(768, 512, 64, 128),
    flagie=(832, 512, 192, 96), flageu=(832, 608, 192, 96),
)
W = 1024.0


def tc(region, s, t):
    """UV of (s across, t down) inside a region, inset half a texel so neighbours don't bleed."""
    x, y, w, h = A[region]
    s = 0.5 / w + s * (1 - 1 / w); t = 0.5 / h + t * (1 - 1 / h)
    return ((x + s * w) / W, 1 - (y + t * h) / W)


class Mesh:
    def __init__(self, name):
        self.name, self.v, self.f, self.uv = name, [], [], []

    def face(self, pts, uvs, n=None):
        """A face with explicit UVs; if n is given the winding is flipped as needed so it faces along n."""
        if n is not None:
            m = kit.newell(pts)
            if m[0] * n[0] + m[1] * n[1] + m[2] * n[2] < 0:
                pts, uvs = pts[::-1], uvs[::-1]
        i0 = len(self.v)
        self.v.extend(tuple(p) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts))))
        self.uv.append(list(uvs))

    def rface(self, region, pts, st, n=None):
        self.face(pts, [tc(region, s, t) for s, t in st], n)

    def build(self, material):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        uvl = me.uv_layers.new(name='UVMap')
        uvl.data.foreach_set('uv', [c for uvs in self.uv for p in uvs for c in p])
        me.update()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.collection.objects.link(ob)
        ob.data.materials.append(material)
        for p in ob.data.polygons:
            p.use_smooth = False
        return ob


glass, atl, dec = Mesh('ccj_glass'), Mesh('ccj_atlas'), Mesh('ccj_decal')
MAT = {n: kit.material(n, (0.8, 0.8, 0.8)) for n in ('ccj_glass', 'ccj_atlas', 'ccj_decal')}

# ------------------------------------------------------------------ plan
N = 72                      # facets round the drum (5 degrees, ~3.5 m panes)
DEG = math.pi / 180


def R(b):
    """Glazing line radius at bearing b (degrees clockwise from north)."""
    return 39.45 - 1.95 * math.cos(b * DEG)


def P(b, r, z):
    return (r * math.sin(b * DEG), r * math.cos(b * DEG), z)


def out(b):
    """Unit outward normal (plan) at bearing b."""
    return (math.sin(b * DEG), math.cos(b * DEG), 0.0)


def tang(b):
    """Unit tangent in the direction of increasing bearing (clockwise from above)."""
    return (math.cos(b * DEG), -math.sin(b * DEG), 0.0)


Z_G, TIER, NT = 5.0, 5.25, 4          # ground storey, tier height, tiers
Z_T = Z_G + TIER * NT                  # 26.0: top of the drum
Z_TOP, Z_ROOF = 30.4, 31.0             # top storey, roof edge
LEAN_B, LEAN_T, SAW = 0.55, -0.3, 0.35  # each tier leans out at its foot; each pane steps in plan
R_GROUND, R_TOPST = -1.2, -1.8         # set-backs of the ground and top storeys (from R)

# openings round the drum (bearing ranges, whole facets)
LOBBY = (130, 160)
SLOTS = [(120, 130), (20, 30), (235, 245), (300, 310)]   # bronze-framed louvred slots (stair / lift cores)
WALL = (85, 120)                                          # the limestone screen wall stands in front of these
CORE_N = 9                                                # limestone stair tower on the north side (OSM spike)
WING = (277, 297)                                         # the low service wing (custody entrance) to the north-west


def in_range(b0, b1, rng):
    return b0 >= rng[0] - 1e-6 and b1 <= rng[1] + 1e-6


def kind(k):
    b0, b1 = k * 360 / N, (k + 1) * 360 / N
    if in_range(b0, b1, LOBBY):
        return 'lobby'
    if any(in_range(b0, b1, s) for s in SLOTS):
        return 'slot'
    return 'drum'


# ------------------------------------------------------------------ the tiers
def off(edge, z_rel):
    """Offset from R of a pane corner: edge 0 = the pane's start (proud), 1 = its end (tucked in); z_rel 0 foot, 1 head."""
    return (SAW if edge == 0 else -SAW) + (LEAN_B + (LEAN_T - LEAN_B) * z_rel)


for k in range(N):
    kd = kind(k)
    if kd == 'slot':
        continue
    b0, b1 = k * 360 / N, (k + 1) * 360 / N
    u0 = (k % 8) / 8.0
    for j in range(NT):
        if kd == 'lobby' and j == 0:
            continue
        z0, z1 = Z_G + j * TIER, Z_G + (j + 1) * TIER
        pts = [P(b0, R(b0) + off(0, 0), z0), P(b1, R(b1) + off(1, 0), z0), P(b1, R(b1) + off(1, 1), z1), P(b0, R(b0) + off(0, 1), z1)]
        v0, v1 = 1 - (j + 1) / NT, 1 - j / NT
        glass.face(pts, [(u0, v0), (u0 + 1 / 8, v0), (u0 + 1 / 8, v1), (u0, v1)], out((b0 + b1) / 2))
        # the white return where the next pane steps out again (faces back against increasing bearing)
        if kind((k + 1) % N) != 'slot':
            t = tang(b1)
            atl.rface('white', [P(b1, R(b1) + off(1, 0), z0), P(b1, R(b1) + off(0, 0), z0), P(b1, R(b1) + off(0, 1), z1), P(b1, R(b1) + off(1, 1), z1)],
                      [(0, 1), (1, 1), (1, 0), (0, 0)], (-t[0], -t[1], 0))
        # the soffit under the foot of the tier (white frame), back to the head of the tier below or the ground storey
        inner = (R_GROUND, R_GROUND) if j == 0 else (off(0, 1), off(1, 1))
        atl.rface('white', [P(b0, R(b0) + inner[0], z0), P(b1, R(b1) + inner[1], z0), P(b1, R(b1) + off(1, 0), z0), P(b0, R(b0) + off(0, 0), z0)],
                  [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, -1))
    # the ledge on top of the drum, back to the top storey
    atl.rface('white', [P(b0, R(b0) + off(0, 1), Z_T), P(b1, R(b1) + off(1, 1), Z_T), P(b1, R(b1) + R_TOPST, Z_T), P(b0, R(b0) + R_TOPST, Z_T)],
              [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, 1))

# ------------------------------------------------------------------ ground storey, top storey, roof, atrium
for k in range(N):
    kd = kind(k)
    b0, b1 = k * 360 / N, (k + 1) * 360 / N
    bm = (b0 + b1) / 2
    if kd != 'lobby':
        # recessed ground-storey glazing (behind the screen wall it is hidden, so leave it out)
        if not in_range(b0, b1, WALL):
            atl.rface('ground', [P(b0, R(b0) + R_GROUND, 0), P(b1, R(b1) + R_GROUND, 0), P(b1, R(b1) + R_GROUND, Z_G), P(b0, R(b0) + R_GROUND, Z_G)],
                      [(0, 1), (1, 1), (1, 0), (0, 0)], out(bm))
    # top storey glazing, the white roof edge with its soffit, the roof
    rt = (R(b0) + R_TOPST, R(b1) + R_TOPST)
    atl.rface('top', [P(b0, rt[0], Z_T), P(b1, rt[1], Z_T), P(b1, rt[1], Z_TOP), P(b0, rt[0], Z_TOP)], [(0, 1), (1, 1), (1, 0), (0, 0)], out(bm))
    re = (R(b0) - 0.9, R(b1) - 0.9)
    atl.rface('white', [P(b0, rt[0], Z_TOP), P(b1, rt[1], Z_TOP), P(b1, re[1], Z_TOP), P(b0, re[0], Z_TOP)], [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, -1))
    atl.rface('white', [P(b0, re[0], Z_TOP), P(b1, re[1], Z_TOP), P(b1, re[1], Z_ROOF), P(b0, re[0], Z_ROOF)], [(0, 1), (1, 1), (1, 0), (0, 0)], out(bm))
    RA = 13.0  # the atrium's glass roof
    atl.rface('roof', [P(b0, re[0], Z_ROOF), P(b1, re[1], Z_ROOF), P(b1, RA, Z_ROOF), P(b0, RA, Z_ROOF)], [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, 1))
    if k % 2 == 0:
        c0, c1 = b0, b0 + 10
        atl.rface('skylight', [P(c0, RA, Z_ROOF), P(c1, RA, Z_ROOF), P(c1, 5.0, Z_ROOF + 2.2), P(c0, 5.0, Z_ROOF + 2.2)],
                  [(0, 1), (1, 1), (1, 0.4), (0, 0.4)], (0, 0, 1))
        atl.rface('skylight', [P(c0, 5.0, Z_ROOF + 2.2), P(c1, 5.0, Z_ROOF + 2.2), (0, 0, Z_ROOF + 2.6)], [(0, 0.4), (1, 0.4), (0.5, 0)], (0, 0, 1))
    # a low upstand round the atrium roof
    atl.rface('white', [P(b0, RA, Z_ROOF), P(b1, RA, Z_ROOF), P(b1, RA, Z_ROOF + 0.5), P(b0, RA, Z_ROOF + 0.5)], [(0, 1), (1, 1), (1, 0), (0, 0)], out(bm))

# plant on the roof: two low screened enclosures
for b, r, w, d, h in ((200, 22, 9, 6, 2.4), (330, 24, 7, 5, 2.0)):
    c, n = P(b, r, 0), out(b)
    t = tang(b)
    corner = lambda a, e, z: (c[0] + t[0] * a + n[0] * e, c[1] + t[1] * a + n[1] * e, z)
    z0, z1 = Z_ROOF, Z_ROOF + h
    for (a0, e0), (a1, e1), nn in (((-w / 2, -d / 2), (w / 2, -d / 2), (-n[0], -n[1], 0)), ((w / 2, -d / 2), (w / 2, d / 2), t),
                                   ((w / 2, d / 2), (-w / 2, d / 2), n), ((-w / 2, d / 2), (-w / 2, -d / 2), (-t[0], -t[1], 0))):
        atl.rface('bronze', [corner(a0, e0, z0), corner(a1, e1, z0), corner(a1, e1, z1), corner(a0, e0, z1)], [(0, 1), (1, 1), (1, 0.6), (0, 0.6)], nn)
    atl.rface('roof', [corner(-w / 2, -d / 2, z1), corner(w / 2, -d / 2, z1), corner(w / 2, d / 2, z1), corner(-w / 2, d / 2, z1)], [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, 1))


# ------------------------------------------------------------------ boxes in a radial frame
def rbox(region, b, r0, r1, w, z0, z1, top=True, st=None, fronts=('out', 'in', 'l', 'r')):
    """A box centred on bearing b, from radius r0 to r1, w wide (tangential), z0..z1. st: UV rect (s0, s1, t0, t1)."""
    c = P(b, 0, 0); n = out(b); t = tang(b)
    Q = lambda a, e, z: (n[0] * e + t[0] * a, n[1] * e + t[1] * a, z)
    s0, s1, t0, t1 = st or (0, 1, 0, 1)
    uv = [(s0, t1), (s1, t1), (s1, t0), (s0, t0)]
    if 'out' in fronts:
        atl.rface(region, [Q(-w / 2, r1, z0), Q(w / 2, r1, z0), Q(w / 2, r1, z1), Q(-w / 2, r1, z1)], uv, n)
    if 'in' in fronts:
        atl.rface(region, [Q(w / 2, r0, z0), Q(-w / 2, r0, z0), Q(-w / 2, r0, z1), Q(w / 2, r0, z1)], uv, (-n[0], -n[1], 0))
    if 'l' in fronts:
        atl.rface(region, [Q(-w / 2, r0, z0), Q(-w / 2, r1, z0), Q(-w / 2, r1, z1), Q(-w / 2, r0, z1)], uv, (-t[0], -t[1], 0))
    if 'r' in fronts:
        atl.rface(region, [Q(w / 2, r1, z0), Q(w / 2, r0, z0), Q(w / 2, r0, z1), Q(w / 2, r1, z1)], uv, t)
    if top:
        atl.rface(region, [Q(-w / 2, r0, z1), Q(w / 2, r0, z1), Q(w / 2, r1, z1), Q(-w / 2, r1, z1)], [(s0, t0), (s1, t0), (s1, t0 + 0.05), (s0, t0 + 0.05)], (0, 0, 1))


# ------------------------------------------------------------------ bronze slots
for s0, s1 in SLOTS:
    # the recessed louvred face (a flat chord) and the ground storey under it
    rr = min(R(s0), R(s1)) - 1.0
    atl.rface('louvre', [P(s0, rr, Z_G), P(s1, rr, Z_G), P(s1, rr, Z_T + 1.0), P(s0, rr, Z_T + 1.0)], [(0, 1), (1, 1), (1, 0), (0, 0)], out((s0 + s1) / 2))
    atl.rface('ground', [P(s0, rr, 0), P(s1, rr, 0), P(s1, rr, Z_G), P(s0, rr, Z_G)], [(0, 1), (1, 1), (1, 0), (0, 0)], out((s0 + s1) / 2))
    for b in (s0, s1):
        rbox('bronze', b, R(b) - 1.9, R(b) + 1.0, 1.6, 0, Z_T + 1.4, st=(0, 1, 0, 1))
    # a bronze sill and head across the slot
    for z in (Z_G - 0.6, Z_T + 0.6):
        for a, bb in ((s0, s0 + 5), (s0 + 5, s1)):
            atl.rface('bronze', [P(a, rr, z), P(bb, rr, z), P(bb, R(bb) + 0.5, z), P(a, R(a) + 0.5, z)], [(0, 0), (1, 0), (1, 0.1), (0, 0.1)], (0, 0, 1 if z < 10 else -1))
            atl.rface('bronze', [P(a, R(a) + 0.5, z), P(bb, R(bb) + 0.5, z), P(bb, R(bb) + 0.5, z + 0.6), P(a, R(a) + 0.5, z + 0.6)], [(0, 1), (1, 1), (1, 0.8), (0, 0.8)], out((a + bb) / 2))

# ------------------------------------------------------------------ the entrance (south-east)
L0, L1 = LOBBY
Z_FL, Z_LB = 1.2, 8.8          # lobby floor (top of the steps), lobby head
RL = -3.0                      # lobby glazing set back from R
for k in range(N):
    b0, b1 = k * 360 / N, (k + 1) * 360 / N
    if kind(k) != 'lobby':
        continue
    bm = (b0 + b1) / 2
    atl.rface('lobby', [P(b0, R(b0) + RL, Z_FL), P(b1, R(b1) + RL, Z_FL), P(b1, R(b1) + RL, Z_LB), P(b0, R(b0) + RL, Z_LB)], [(0, 1), (1, 1), (1, 0), (0, 0)], out(bm))
    atl.rface('lobby', [P(b0, R(b0) + RL, 0), P(b1, R(b1) + RL, 0), P(b1, R(b1) + RL, Z_FL), P(b0, R(b0) + RL, Z_FL)], [(0, 1), (1, 1), (1, 0.95), (0, 0.95)], out(bm))
    # ceiling of the lobby porch, then the bronze fascia up to the foot of the tiers
    atl.rface('white', [P(b0, R(b0) + RL, Z_LB), P(b1, R(b1) + RL, Z_LB), P(b1, R(b1) + 0.6, Z_LB), P(b0, R(b0) + 0.6, Z_LB)], [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, -1))
    atl.rface('bronze', [P(b0, R(b0) + 0.6, Z_LB), P(b1, R(b1) + 0.6, Z_LB), P(b1, R(b1) + 0.6, Z_G + TIER), P(b0, R(b0) + 0.6, Z_G + TIER)],
              [(0, 1), (1, 1), (1, 0.55), (0, 0.55)], out(bm))
    # the porch floor (landing) from the glazing out to the top step
    atl.rface('steps', [P(b0, R(b0) + RL, Z_FL), P(b1, R(b1) + RL, Z_FL), P(b1, R(b1) + 1.5, Z_FL), P(b0, R(b0) + 1.5, Z_FL)], [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, 1))
# fascia return ends
for b, sg in ((L0, -1), (L1, 1)):
    t = tang(b)
    atl.rface('bronze', [P(b, R(b) + RL, Z_LB), P(b, R(b) + 0.6, Z_LB), P(b, R(b) + 0.6, Z_G + TIER), P(b, R(b) + RL, Z_G + TIER)], [(0, 1), (1, 1), (1, 0.6), (0, 0.6)], (t[0] * sg, t[1] * sg, 0))
    atl.rface('ground', [P(b, R(b) + RL, 0), P(b, R(b) + R_GROUND, 0), P(b, R(b) + R_GROUND, Z_LB), P(b, R(b) + RL, Z_LB)], [(0, 1), (0.3, 1), (0.3, 0), (0, 0)], (t[0] * sg, t[1] * sg, 0))

# two limestone columns carrying the fascia (ref 01, 05)
COLS = 12
for b in (136.5, 153.5):
    cx, cy, _ = P(b, R(b) + 0.2, 0)
    for i in range(COLS):
        a0, a1 = i / COLS * math.tau, (i + 1) / COLS * math.tau
        p = lambda a, z: (cx + 0.55 * math.cos(a), cy + 0.55 * math.sin(a), z)
        atl.rface('stone', [p(a0, Z_FL), p(a1, Z_FL), p(a1, Z_LB), p(a0, Z_LB)], [(i / COLS, 1), ((i + 1) / COLS, 1), ((i + 1) / COLS, 0), (i / COLS, 0)],
                  (math.cos((a0 + a1) / 2), math.sin((a0 + a1) / 2), 0))

# the glass canopy over the steps: a thin slab cantilevered from the lobby, 5.3 m up
for a, bb in ((137, 142), (142, 147), (147, 152), (152, 157)):
    z0, z1 = 5.2, 5.45
    r0a, r0b, r1a, r1b = R(a) + RL, R(bb) + RL, R(a) + 6.0, R(bb) + 6.0
    atl.rface('canopy', [P(a, r0a, z1), P(bb, r0b, z1), P(bb, r1b, z1), P(a, r1a, z1)], [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, 1))
    atl.rface('canopy', [P(a, r0a, z0), P(bb, r0b, z0), P(bb, r1b, z0), P(a, r1a, z0)], [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, -1))
    atl.rface('white', [P(a, r1a, z0), P(bb, r1b, z0), P(bb, r1b, z1), P(a, r1a, z1)], [(0, 1), (1, 1), (1, 0), (0, 0)], out((a + bb) / 2))
for b in (137, 157):
    t = tang(b); sg = -1 if b < 150 else 1
    atl.rface('white', [P(b, R(b) + RL, 5.2), P(b, R(b) + 6.0, 5.2), P(b, R(b) + 6.0, 5.45), P(b, R(b) + RL, 5.45)], [(0, 1), (1, 1), (1, 0), (0, 0)], (t[0] * sg, t[1] * sg, 0))

# the fan of granite steps down to the footpath: 6 risers from the landing (R + 1.5, 1.2 m) out to R + 8.1
SB0, SB1, NS = 124, 168, 6
for i in range(NS):
    ra, rb = 1.5 + i * 1.1, 1.5 + (i + 1) * 1.1   # this step's tread runs ra..rb (out from R)
    z = Z_FL - (i + 1) * (Z_FL / NS)
    zt = z + Z_FL / NS  # tread level of the step above (= this riser's top)
    segs = 8
    for m in range(segs):
        a, bb = SB0 + (SB1 - SB0) * m / segs, SB0 + (SB1 - SB0) * (m + 1) / segs
        atl.rface('steps', [P(a, R(a) + ra, zt), P(bb, R(bb) + ra, zt), P(bb, R(bb) + ra, z), P(a, R(a) + ra, z)], [(0, 0.1), (1, 0.1), (1, 0.3), (0, 0.3)], out((a + bb) / 2))
        atl.rface('steps', [P(a, R(a) + ra, z), P(bb, R(bb) + ra, z), P(bb, R(bb) + rb, z), P(a, R(a) + rb, z)], [(0, 0.3), (1, 0.3), (1, 1), (0, 1)], (0, 0, 1))
    # the fan's ends: the risers' side faces
    for b, sg in ((SB0, -1), (SB1, 1)):
        t = tang(b)
        atl.rface('steps', [P(b, R(b) + ra, z), P(b, R(b) + rb, z), P(b, R(b) + rb, 0), P(b, R(b) + ra, 0)], [(0, 0), (1, 0), (1, 0.2), (0, 0.2)], (t[0] * sg, t[1] * sg, 0))
# under the landing to the ground (the fan's inner face is hidden by the lobby)

# ------------------------------------------------------------------ the curved limestone screen wall
W0, W1, WR, WT, WH, CALP = 86, 122, 3.4, 0.55, 9.2, 0.9
ws = 12
for m in range(ws):
    a, bb = W0 + (W1 - W0) * m / ws, W0 + (W1 - W0) * (m + 1) / ws
    ra, rb = R(a) + WR, R(bb) + WR
    bm = (a + bb) / 2
    # outer face: calp plinth, then limestone (one ~2.5 m segment = one stone tile across)
    atl.rface('calp', [P(a, ra + 0.04, 0), P(bb, rb + 0.04, 0), P(bb, rb + 0.04, CALP), P(a, ra + 0.04, CALP)], [(0, 1), (1, 1), (1, 0), (0, 0)], out(bm))
    atl.rface('stone', [P(a, ra, CALP), P(bb, rb, CALP), P(bb, rb, WH), P(a, ra, WH)], [(0, 1), (1, 1), (1, 0.1), (0, 0.1)], out(bm))
    atl.rface('stone', [P(bb, rb - WT, 0), P(a, ra - WT, 0), P(a, ra - WT, WH), P(bb, rb - WT, WH)], [(0, 1), (1, 1), (1, 0.1), (0, 0.1)], (-out(bm)[0], -out(bm)[1], 0))
    atl.rface('stone', [P(a, ra - WT, WH), P(bb, rb - WT, WH), P(bb, rb, WH), P(a, ra, WH)], [(0, 0), (1, 0), (1, 0.05), (0, 0.05)], (0, 0, 1))
for b, sg in ((W0, -1), (W1, 1)):
    t = tang(b)
    atl.rface('stone', [P(b, R(b) + WR - WT, 0), P(b, R(b) + WR, 0), P(b, R(b) + WR, WH), P(b, R(b) + WR - WT, WH)], [(0, 1), (0.14, 1), (0.14, 0.1), (0, 0.1)], (t[0] * sg, t[1] * sg, 0))
# the roof between the wall and the drum (a flat stone-coped terrace behind the parapet)
for m in range(6):
    a, bb = W0 + (W1 - W0) * m / 6, W0 + (W1 - W0) * (m + 1) / 6
    atl.rface('roof', [P(a, R(a) + R_GROUND, WH - 0.3), P(bb, R(bb) + R_GROUND, WH - 0.3), P(bb, R(bb) + WR - WT, WH - 0.3), P(a, R(a) + WR - WT, WH - 0.3)],
              [(0, 0), (1, 0), (1, 1), (0, 1)], (0, 0, 1))


# decals on the wall's outer face, following the curve
def curved_decal(region, b0, b1, z0, z1, r_extra, segs=4):
    for m in range(segs):
        a, bb = b0 + (b1 - b0) * m / segs, b0 + (b1 - b0) * (m + 1) / segs
        # bearings increase clockwise from above, so seen from outside the higher bearing is on the left: s runs from
        # 0 at b1 to 1 at b0
        sa, sb = (b1 - a) / (b1 - b0), (b1 - bb) / (b1 - b0)
        dec.rface(region, [P(bb, R(bb) + r_extra, z0), P(a, R(a) + r_extra, z0), P(a, R(a) + r_extra, z1), P(bb, R(bb) + r_extra, z1)],
                  [(sb, 1), (sa, 1), (sa, 0), (sb, 0)], out((a + bb) / 2))


curved_decal('justice', 107.5, 115.0, 4.4, 8.9, WR + 0.12, 2)

# the glazed stair enclosures rising at a slant from behind the screen wall to the drum (refs 01, 04, 05): three
# sloping glass planes on dark frames
for c in (92.0, 101.0, 110.0):
    a, bb = c - 3.2, c + 3.2
    lo, hi = WR - WT - 0.2, R_GROUND
    zl, zh = WH - 0.2, WH + 5.5
    atl.rface('canopy', [P(a, R(a) + lo, zl), P(bb, R(bb) + lo, zl), P(bb, R(bb) + hi, zh), P(a, R(a) + hi, zh)], [(0, 1), (1, 1), (1, 0), (0, 0)], (out(c)[0], out(c)[1], 0.8))
    for b, sg in ((a, -1), (bb, 1)):
        t = tang(b)
        atl.rface('bronze', [P(b, R(b) + lo, zl), P(b, R(b) + hi, zl), P(b, R(b) + hi, zh)], [(0, 1), (1, 1), (1, 0)], (t[0] * sg, t[1] * sg, 0))
curved_decal('text', 104.0, 118.0, 1.9, 3.1, WR + 0.05, 6)
curved_decal('harp', 118.4, 119.7, 1.8, 3.2, WR + 0.05, 1)

# ------------------------------------------------------------------ the north stair tower and the north-west wing
rbox('core', CORE_N, R(CORE_N) - 2.0, R(CORE_N) + 8.5, 6.5, 0, Z_TOP - 0.6)
rbox('calp', CORE_N, R(CORE_N) - 2.0, R(CORE_N) + 8.55, 6.55, 0, CALP, top=False, fronts=('out', 'l', 'r'))
wb = (WING[0] + WING[1]) / 2
wr0, wr1 = R(wb) - 1.5, R(wb) + 8.5
ww = 2 * R(wb) * math.sin((WING[1] - WING[0]) / 2 * DEG)
rbox('stone', wb, wr0, wr1, ww, 0, 8.0, st=(0, 1, 0.1, 0.62))
rbox('calp', wb, wr0, wr1 + 0.05, ww + 0.05, 0, CALP, top=False, fronts=('out', 'l', 'r'))
rbox('bronze', wb, wr1 - 0.2, wr1 + 0.3, ww + 0.4, 8.0, 9.0, st=(0, 1, 0.8, 1))
rbox('ground', wb, wr1, wr1 + 0.02, 7.0, 0.9, 4.2, top=False, fronts=('out',))   # the vehicle gate

# ------------------------------------------------------------------ low limestone planter wall and flagpoles on the south terrace
for m in range(10):
    a, bb = 170 + 45 * m / 10, 170 + 45 * (m + 1) / 10
    ra, rb = R(a) + 3.0, R(bb) + 3.0
    bm = (a + bb) / 2
    atl.rface('stone', [P(a, ra, 0), P(bb, rb, 0), P(bb, rb, 1.1), P(a, ra, 1.1)], [(0, 1), (1, 1), (1, 0.86), (0, 0.86)], out(bm))
    atl.rface('stone', [P(a, ra - 0.4, 1.1), P(bb, rb - 0.4, 1.1), P(bb, rb, 1.1), P(a, ra, 1.1)], [(0, 0.86), (1, 0.86), (1, 0.88), (0, 0.88)], (0, 0, 1))
for i, b in enumerate((163.5, 167.0, 170.5)):
    x, y, _ = P(b, R(b) + 3.6, 0)
    H = 12.0
    for q in range(4):
        a0, a1 = q / 4 * math.tau + math.pi / 4, (q + 1) / 4 * math.tau + math.pi / 4
        p = lambda a, z, r=0.08: (x + r * math.cos(a), y + r * math.sin(a), z)
        atl.rface('white', [p(a0, 0), p(a1, 0), p(a1, H), p(a0, H)], [(0, 1), (1, 1), (1, 0), (0, 0)], (math.cos((a0 + a1) / 2), math.sin((a0 + a1) / 2), 0))
    # the flag, hanging off the pole towards the east (the prevailing westerly), double-sided in the material
    region = 'flageu' if i == 1 else 'flagie'
    fx, fy = x + 2.0 * 0.97, y + 2.0 * 0.24
    dec.rface(region, [(x, y, H - 1.25), (fx, fy, H - 1.35), (fx, fy, H - 0.1), (x, y, H - 0.05)], [(0, 1), (1, 1), (1, 0), (0, 0)])

# ------------------------------------------------------------------ finish
objs = [glass.build(MAT['ccj_glass']), atl.build(MAT['ccj_atlas']), dec.build(MAT['ccj_decal'])]
kit.finish(objs, 0.58, 0.85)
root = bpy.data.objects.new('ccj', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs), {o.name: kit.tris([o]) for o in objs})
kit.export(os.path.join(OUT, 'ccj.glb'), os.path.join(SRC, 'ccj.blend'))
print('DONE')

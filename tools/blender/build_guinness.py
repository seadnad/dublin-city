"""The Guinness Storehouse (1904, the brewery's steel-framed fermentation plant, now the visitor centre) with the Gravity
Bar on its roof, and the St James's Gate skyline around it: the Power House and its four stacks, and St Patrick's Tower
(the 1757 smock-windmill tower off Thomas Street with its copper cupola).

Run headless:  blender -b --factory-startup -P tools/blender/build_guinness.py -- public/models models

Sources: docs/research/guinness.md. Real metres, Blender X east, Y north, Z up; each part is built round its own
origin and placed from absolute (OSM) coordinates in src/world/sites.js, so the parts are scaled separately:
  storehouse   54 x 48 m footprint (OSM way 44597908), parapet 34 m, Gravity Bar roof 42.6 m (OSM height 42.5); plan x0.6
  powerhouse   the Power House block (OSM way 352819252, ~37 x 63 m); plan x0.5 (it fills its mapped footprint)
  stack_*      the four Power House stacks at the OSM chimney nodes; plan x0.8
  tower        St Patrick's Tower, 45.7 m to the finial (OSM way 44597921); plan x0.8
  Heights are real throughout (as for St Patrick's Cathedral and Heuston): the skyline is what this model is for.

Root nodes: storehouse (near), storehouse_far (a ~330-triangle silhouette for the skyline; three.js LOD in heroes.js),
powerhouse, stack_w, stack_e, stack_steel, stack_cream, tower.
Materials (all painted / set up at load in src/world/heroes.js, GS_* there):
  gs_brick    storehouse elevations, a 1024 x 2048 tile of 4 bays (24 m) by the full 34 m height, two elevations
              stacked: top half the blind-arched Market Street front, bottom half the windowed brewery sides
  gs_stone    plinth, string courses, cornice and coping      gs_roof   flat roofs
  gs_glass    Gravity Bar glazing (one 8 m run of panels)       gs_dark   bar slab, base drum, footbridge, skylight
  gs_metal    bar roof and fascia, roof plant                   gs_plain  Power House brick with steel windows
  gs_stacks   the stacks: three columns (brick, steel, cream) by the stack height
  gs_sign     GUINNESS letters (alpha)                          gs_tower  St Patrick's Tower courses and windows
  gs_copper   the cupola
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
os.makedirs(OUT, exist_ok=True); os.makedirs(SRC, exist_ok=True)
TAU = math.tau

bpy.ops.wm.read_factory_settings(use_empty=True)


# ------------------------------------------------------------------ mesh builder
class Mesh:
    def __init__(self, name):
        self.name, self.v, self.f, self.uv, self.smooth = name, [], [], [], []

    def vert(self, p):
        self.v.append(tuple(p)); return len(self.v) - 1

    def face(self, pts, uvs, want=None, smooth=False):
        """A face from points (new vertices), winding fixed so its normal points along `want` if given."""
        if want is not None:
            n = kit.newell(pts)
            if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0:
                pts, uvs = pts[::-1], uvs[::-1]
        self.f.append(tuple(self.vert(p) for p in pts)); self.uv.append(list(uvs)); self.smooth.append(smooth)

    def build(self, material):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        uvl = me.uv_layers.new(name='UVMap')
        uvl.data.foreach_set('uv', [c for uvs in self.uv for p in uvs for c in p])
        me.polygons.foreach_set('use_smooth', self.smooth)
        me.update()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.collection.objects.link(ob)
        ob.data.materials.append(material)
        return ob


MATS = {}


def mat(name):
    if name not in MATS:
        MATS[name] = kit.material(name, (0.8, 0.8, 0.8))
    return MATS[name]


def planar(p, n, tile=4.0):
    """World-projected UV (metres / tile) by the dominant axis of n."""
    ax = max(range(3), key=lambda i: abs(n[i]))
    if ax == 2:
        return (p[0] / tile, p[1] / tile)
    return ((p[1] if ax == 0 else p[0]) / tile, p[2] / tile)


def box(m, x0, x1, y0, y1, z0, z1, uvf=None, top=True, bottom=False, sides='nsew'):
    """Axis-aligned box; uvf(p, n) gives each vertex's UV (planar metres/4 by default)."""
    uvf = uvf or planar
    F = []
    if 's' in sides: F.append(([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0)))
    if 'n' in sides: F.append(([(x1, y1, z0), (x0, y1, z0), (x0, y1, z1), (x1, y1, z1)], (0, 1, 0)))
    if 'w' in sides: F.append(([(x0, y1, z0), (x0, y0, z0), (x0, y0, z1), (x0, y1, z1)], (-1, 0, 0)))
    if 'e' in sides: F.append(([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], (1, 0, 0)))
    if top: F.append(([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1)))
    if bottom: F.append(([(x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (x0, y0, z0)], (0, 0, -1)))
    for pts, n in F:
        m.face(pts, [uvf(p, n) for p in pts], want=n)


def ring_box(m, hx, hy, d, z0, z1, uvf=None, inner=False):
    """A band round a hx x hy rectangle (half sizes), standing d proud of it, z0..z1 (top and outer faces)."""
    X, Y = hx + d, hy + d
    box(m, -X, X, -Y, Y, z0, z1, uvf, top=not inner, bottom=d > 0.01)


def lathe(m, cx, cy, prof, sides, uvf, smooth=True, a0=0.0):
    """Surface of revolution: prof = [(r, z), ...] bottom to top; faces face outward (or up for a flat top ring)."""
    ang = [a0 + k / sides * TAU for k in range(sides + 1)]
    for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
        for k in range(sides):
            a, b = ang[k], ang[k + 1]
            P = lambda r, z, t: (cx + math.cos(t) * r, cy + math.sin(t) * r, z)
            pts = [P(r0, z0, a), P(r0, z0, b), P(r1, z1, b), P(r1, z1, a)]
            if r0 < 1e-6 and r1 < 1e-6:
                continue
            if r1 < 1e-6:
                pts = pts[:3]; uvs = [uvf(r0, z0, a, k), uvf(r0, z0, b, k + 1), uvf(r1, z1, (a + b) / 2, k + 0.5)]
            elif r0 < 1e-6:
                pts = [pts[0], pts[2], pts[3]]; uvs = [uvf(r0, z0, (a + b) / 2, k + 0.5), uvf(r1, z1, b, k + 1), uvf(r1, z1, a, k)]
            else:
                uvs = [uvf(r0, z0, a, k), uvf(r0, z0, b, k + 1), uvf(r1, z1, b, k + 1), uvf(r1, z1, a, k)]
            mid = (a + b) / 2
            dr, dz = r1 - r0, z1 - z0
            # outward normal of the profile segment (rotate the segment direction by -90 degrees in the r-z plane)
            nr, nz = dz, -dr
            want = (math.cos(mid) * nr, math.sin(mid) * nr, nz)
            m.face(pts, uvs, want=want, smooth=smooth and abs(dz) > 1e-6)


def disc(m, cx, cy, r, z, sides, uvf, up=True):
    pts = [(cx + math.cos(k / sides * TAU) * r, cy + math.sin(k / sides * TAU) * r, z) for k in range(sides)]
    m.face(pts, [uvf(p) for p in pts], want=(0, 0, 1 if up else -1))


# ================================================================== the Storehouse
HX, HY = 27.0, 24.0          # half footprint (54 x 48 m), OSM way 44597908
H_TOP = 34.0                 # top of the parapet coping (the elevation tile spans 0..H_TOP)
BAY = 6.0                    # bay, pilaster to pilaster
Z_PLINTH, Z_GROUND, Z_CORNICE0, Z_CORNICE1, Z_ROOF = 0.8, 7.4, 30.2, 31.0, 33.3
BX, BY = 14.6, 0.0           # Gravity Bar centre (OSM node 629750018: ~11 m in from the east front, centred N-S)

# facades: (outward normal, origin at the left corner seen from outside, run direction h, length, elevation)
FACADES = dict(
    s=((0, -1), (-HX, -HY), (1, 0), 2 * HX, 'blind'),   # Market Street South
    w=((-1, 0), (-HX, HY), (0, -1), 2 * HY, 'blind'),
    n=((0, 1), (HX, HY), (-1, 0), 2 * HX, 'win'),        # the brewery yard
    e=((1, 0), (HX, -HY), (0, 1), 2 * HY, 'win'),        # Bellevue
)


def elev_v(z, elev):
    t = max(0.0, min(1.0, z / H_TOP))
    return 0.502 + 0.496 * t if elev == 'blind' else 0.002 + 0.496 * t


def facade_uv(key):
    n, o, h, L, elev = FACADES[key]

    def f(p, _n=None):
        s = (p[0] - o[0]) * h[0] + (p[1] - o[1]) * h[1]
        return (s / (4 * BAY), elev_v(p[2], elev))
    return f


def storehouse(far=False):
    tag = '_far' if far else ''
    objs = []
    brick = Mesh('walls' + tag)
    for key, (n, o, h, L, elev) in FACADES.items():
        uv = facade_uv(key)
        a = o; b = (o[0] + h[0] * L, o[1] + h[1] * L)
        pts = [(a[0], a[1], 0.0), (b[0], b[1], 0.0), (b[0], b[1], H_TOP), (a[0], a[1], H_TOP)]
        brick.face(pts, [uv(p) for p in pts], want=(n[0], n[1], 0))
        if far:
            continue
        # pilasters (dark engineering brick in the tile) at each bay line, and wider piers at the corners
        nb = int(round(L / BAY))
        for k in range(0, nb + 1):
            s = k * BAY
            w = 0.8 if 0 < k < nb else 1.3
            d = 0.35
            c = (o[0] + h[0] * s, o[1] + h[1] * s)
            s0, s1 = (-w, w) if 0 < k < nb else ((0, w + 0.0) if k == 0 else (-w, 0))
            q = lambda ss, dd, z: (c[0] + h[0] * ss + n[0] * dd, c[1] + h[1] * ss + n[1] * dd, z)
            for z0, z1 in ((Z_PLINTH, Z_CORNICE0),):
                F = [([q(s0, d, z0), q(s1, d, z0), q(s1, d, z1), q(s0, d, z1)], (n[0], n[1], 0)),
                     ([q(s0, 0, z0), q(s0, d, z0), q(s0, d, z1), q(s0, 0, z1)], (-h[0], -h[1], 0)),
                     ([q(s1, d, z0), q(s1, 0, z0), q(s1, 0, z1), q(s1, d, z1)], (h[0], h[1], 0)),
                     ([q(s0, 0, z1), q(s1, 0, z1), q(s1, d, z1), q(s0, d, z1)], (0, 0, 1))]
                for pts, want in F:
                    brick.face(pts, [uv(p) for p in pts], want=want)
    objs.append(brick.build(mat('gs_brick')))

    stone = Mesh('stone' + tag)
    if not far:
        ring_box(stone, HX, HY, 0.2, 0.0, Z_PLINTH)                         # plinth
        ring_box(stone, HX, HY, 0.5, Z_CORNICE0, Z_CORNICE1)               # cornice over the pilasters
        ring_box(stone, HX, HY, 0.18, Z_GROUND - 0.35, Z_GROUND)           # string course over the ground-floor arcade
    ring_box(stone, HX, HY, 0.22, H_TOP - 0.4, H_TOP)                      # coping
    # parapet inner faces
    t = 0.45
    for pts, n in (([(-HX + t, -HY + t, Z_ROOF), (HX - t, -HY + t, Z_ROOF), (HX - t, -HY + t, H_TOP), (-HX + t, -HY + t, H_TOP)], (0, 1, 0)),
                   ([(-HX + t, HY - t, Z_ROOF), (HX - t, HY - t, Z_ROOF), (HX - t, HY - t, H_TOP), (-HX + t, HY - t, H_TOP)], (0, -1, 0)),
                   ([(-HX + t, -HY + t, Z_ROOF), (-HX + t, HY - t, Z_ROOF), (-HX + t, HY - t, H_TOP), (-HX + t, -HY + t, H_TOP)], (1, 0, 0)),
                   ([(HX - t, -HY + t, Z_ROOF), (HX - t, HY - t, Z_ROOF), (HX - t, HY - t, H_TOP), (HX - t, -HY + t, H_TOP)], (-1, 0, 0))):
        stone.face(pts, [planar(p, n) for p in pts], want=n)
    # the coping's top over the parapet thickness
    for pts in (([(-HX, -HY, H_TOP), (HX, -HY, H_TOP), (HX - t, -HY + t, H_TOP), (-HX + t, -HY + t, H_TOP)]),
                ([(HX, -HY, H_TOP), (HX, HY, H_TOP), (HX - t, HY - t, H_TOP), (HX - t, -HY + t, H_TOP)]),
                ([(HX, HY, H_TOP), (-HX, HY, H_TOP), (-HX + t, HY - t, H_TOP), (HX - t, HY - t, H_TOP)]),
                ([(-HX, HY, H_TOP), (-HX, -HY, H_TOP), (-HX + t, -HY + t, H_TOP), (-HX + t, HY - t, H_TOP)])):
        stone.face(pts, [planar(p, (0, 0, 1)) for p in pts], want=(0, 0, 1))
    objs.append(stone.build(mat('gs_stone')))

    roof = Mesh('roof' + tag)
    pts = [(-HX + t, -HY + t, Z_ROOF), (HX - t, -HY + t, Z_ROOF), (HX - t, HY - t, Z_ROOF), (-HX + t, HY - t, Z_ROOF)]
    roof.face(pts, [planar(p, (0, 0, 1)) for p in pts], want=(0, 0, 1))
    objs.append(roof.build(mat('gs_roof')))

    # ---- the Gravity Bar: a dark service drum rising out of the roof, a dark floor slab with a sloping soffit that
    # oversails it, the glass drum (floor-to-ceiling panels) and a thin pale roof disc (ref 01)
    S = 16 if far else 48
    R_BASE, R_SLAB, R_GLASS, R_ROOF = 7.6, 12.3, 11.9, 12.2
    Z_B0, Z_B1, Z_S1, Z_G1, Z_R1 = Z_ROOF, 36.4, 37.9, 42.1, 42.6
    dark = Mesh('bar_dark' + tag)
    duv = lambda r, z, a, k: (a * r / 4.0, z / 4.0)
    lathe(dark, BX, BY, [(R_BASE, Z_B0), (R_BASE, Z_B1)], S // 2 if not far else 12, duv)
    lathe(dark, BX, BY, [(R_BASE, Z_B1), (R_SLAB - 0.3, Z_B1 + 0.9), (R_SLAB, Z_B1 + 1.0), (R_SLAB, Z_S1)], S, duv, smooth=False)
    # slab top: the ledge round the foot of the glass
    lathe(dark, BX, BY, [(R_SLAB, Z_S1), (R_GLASS, Z_S1)], S, duv, smooth=False)
    objs.append(dark.build(mat('gs_dark')))

    glass = Mesh('bar_glass' + tag)
    guv = lambda r, z, a, k: (a * r / 8.0, 1.0 - (Z_G1 - z) / (Z_G1 - Z_S1) if z > Z_S1 else 0.0)
    lathe(glass, BX, BY, [(R_GLASS, Z_S1), (R_GLASS, Z_G1)], S, guv)
    objs.append(glass.build(mat('gs_glass')))

    metal = Mesh('bar_roof' + tag)
    muv = lambda r, z, a, k: (a * r / 4.0, z / 4.0)
    lathe(metal, BX, BY, [(R_GLASS - 0.2, Z_G1), (R_ROOF, Z_G1), (R_ROOF, Z_R1), (R_ROOF - 0.5, Z_R1 + 0.05)], S, muv, smooth=False)
    disc(metal, BX, BY, R_ROOF - 0.5, Z_R1 + 0.05, S, lambda p: planar(p, (0, 0, 1)))
    if not far:
        # roof plant and the lift overrun beside the bar
        box(metal, -6.0, 1.5, -5.0, 5.0, Z_ROOF, Z_ROOF + 2.6)
        box(metal, -22.0, -16.0, 10.0, 18.0, Z_ROOF, Z_ROOF + 1.8)
        box(metal, -21.0, -17.0, -18.0, -12.0, Z_ROOF, Z_ROOF + 1.4)
    objs.append(metal.build(mat('gs_metal')))

    if not far:
        # the atrium rooflight (the head of the "pint glass") and the steel footbridge over Market Street to the
        # brewery on the south side (refs 02, 04)
        dk = Mesh('bridge')
        box(dk, -17.0, -3.0, -9.0, 9.0, Z_ROOF, Z_ROOF + 0.9)
        box(dk, -11.0, -7.4, -HY - 28.0, -HY - 0.2, 10.5, 13.8, top=True, bottom=True, sides='ew')
        objs.append(dk.build(mat('gs_dark')))
    return objs


# ================================================================== the Power House (OSM way 352819252) and its stacks
PW, PD = 36.8, 63.4           # real footprint, front (the GUINNESS lettering) to the south


def powerhouse():
    objs = []
    wall = Mesh('ph_walls')
    puv = lambda p, n: planar(p, n, tile=1.0) if n[2] else ((p[1] if abs(n[0]) > 0.5 else p[0]) / 6.0, p[2] / 4.5)
    X, Y = PW / 2, PD / 2
    box(wall, -X, X, -Y, Y, 0, 13.5, puv)                                   # the long boiler house block
    box(wall, -13.0, 13.0, -Y, -Y + 16.0, 13.5, 18.5, puv)                  # front range (the lettering on its parapet)
    box(wall, -5.5, 5.5, -Y + 2.0, -Y + 12.0, 18.5, 25.0, puv)              # central tower
    box(wall, -X, -13.0, -Y, -Y + 9.0, 0, 9.0, puv, top=False, sides='s')    # lower flanking wings (their fronts)
    objs.append(wall.build(mat('gs_plain')))
    rf = Mesh('ph_roof')
    for x0, x1, y0, y1, z in ((-X, X, -Y, Y, 13.52), (-13, 13, -Y, -Y + 16, 18.52), (-5.5, 5.5, -Y + 2, -Y + 12, 25.02)):
        pts = [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]
        rf.face(pts, [planar(p, (0, 0, 1)) for p in pts], want=(0, 0, 1))
    objs.append(rf.build(mat('gs_roof')))
    sg = Mesh('ph_sign')
    y = -Y - 0.05
    pts = [(-9.5, y, 14.6), (9.5, y, 14.6), (9.5, y, 17.4), (-9.5, y, 17.4)]
    sg.face(pts, [(0, 0), (1, 0), (1, 1), (0, 1)], want=(0, -1, 0))
    objs.append(sg.build(mat('gs_sign')))
    return objs


def stack(name, col, r0, r1, H, sides=14):
    """A tapering round stack; col picks the gs_stacks column (0 brick, 1 steel, 2 cream); v runs up its height."""
    m = Mesh(name + '_m')
    uvf = lambda r, z, a, k: ((col + k / sides) / 3.0, z / H * 0.98 + 0.01)
    lathe(m, 0, 0, [(r0, 0.0), (r1, H)], sides, uvf)
    cap = [(r1 * 1.08, H), (r1 * 1.08, H + 0.9), (r1 * 0.8, H + 0.9)]
    lathe(m, 0, 0, [(r1, H - 0.01)] + cap, sides, lambda r, z, a, k: ((col + 0.5) / 3.0, 0.995), smooth=False)
    return [m.build(mat('gs_stacks'))]


# ================================================================== St Patrick's Tower
def tower():
    objs = []
    t = Mesh('tw_shaft')
    R0, R1, H = 6.2, 3.1, 39.0
    tuv = lambda r, z, a, k: (k / 20.0 * 4.0, z / H)
    lathe(t, 0, 0, [(R0 + 0.35, 0.0), (R0 + 0.35, 1.2), (R0, 1.2), (R1, H), (R1 + 0.45, H), (R1 + 0.45, H + 0.8), (R1 - 0.1, H + 0.8), (R1 - 0.1, H + 1.8)], 20,
          tuv, smooth=True)
    objs.append(t.build(mat('gs_tower')))
    c = Mesh('tw_cupola')
    z0 = H + 1.8
    prof = [(R1 + 0.05, z0), (R1 + 0.45, z0 + 1.2), (R1 + 0.5, z0 + 2.0), (R1 + 0.2, z0 + 2.9), (R1 - 0.6, z0 + 3.7), (1.2, z0 + 4.4),
            (0.35, z0 + 4.9), (0.2, z0 + 5.3), (0.32, z0 + 5.5), (0.1, z0 + 6.4), (0.0, z0 + 6.5)]
    lathe(c, 0, 0, prof, 20, lambda r, z, a, k: (k / 20.0, (z - z0) / 6.5))
    objs.append(c.build(mat('gs_copper')))
    return objs


# ------------------------------------------------------------------ build, scale, export
groups = {
    'storehouse': (storehouse(), (0.6, 0.6), 1.0),
    'storehouse_far': (storehouse(far=True), (0.6, 0.6), 1.0),
    'powerhouse': (powerhouse(), (0.5, 0.5), 1.0),
    'stack_w': (stack('stack_w', 0, 2.5, 1.7, 44.0), (0.8, 0.8), 1.0),
    'stack_e': (stack('stack_e', 0, 2.5, 1.7, 44.0), (0.8, 0.8), 1.0),
    'stack_steel': (stack('stack_steel', 1, 1.35, 1.35, 42.0, sides=12), (0.8, 0.8), 1.0),
    'stack_cream': (stack('stack_cream', 2, 1.9, 1.75, 31.0, sides=12), (0.8, 0.8), 1.0),
    'tower': (tower(), (0.8, 0.8), 1.0),
}
total = 0
for name, (objs, plan, height) in groups.items():
    kit.finish(objs, plan, height)
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root)
    for o in objs:
        o.parent = root
    n = kit.tris(objs); total += n if name != 'storehouse_far' else 0
    print('TRIANGLES', name, n, {o.name: len(o.data.loop_triangles) for o in objs})
print('TRIANGLES near total', total)
kit.export(os.path.join(OUT, 'guinness.glb'), os.path.join(SRC, 'guinness.blend'))
print('DONE')

"""Barrow Street, the Google campus and Boland's Quay (docs/research/barrow-street.md): Google Docks (the old
Montevetro) with its yellow east end, Gordon House and Gasworks House and the skybridge over Barrow Street, the two
Boland's Quay towers behind the restored calp-limestone Boland's Mills (twin gables and the BOLANDS FLOUR MILLS
lettering to the basin), the stone warehouses along the basin's east side, the marina in the inner basin, the
Waterways Ireland visitor centre on its stilts, and the DART embankment with Grand Canal Dock station and the low bridge
over Barrow Street.

Run headless:  blender -b --factory-startup -P tools/blender/build_barrowst.py -- public/models models

Layout: src/data/barrowst.json (shared with src/world/sites.js), in game metres (x east, z south; the plan is already at
the map's half scale and squeezed clear of the roads), heights real. Everything is built in one frame whose origin is the
layout's `origin` (Blender X = x - ox, Y = -(z - oz)), exported as one root `barrowst`; the game places it there and
merges it by material.

Materials (painted at load in src/world/barrowst.js; the module sizes MOD here must match it):
  bs_mv     Google Docks curtain wall: black frame grid, blue-green glass (4 bays x 4 floors per tile)
  bs_mvy    its east end: the yellow spandrel strip             bs_glass  plain office glass (Gordon, Gasworks, Grand Mill Quay, skybridge)
  bs_bol    Boland's Quay's pale panels and window slots        bs_cu     its copper-red fins
  bs_stone  calp limestone with sash windows (the mills)        bs_calp   plain calp (gables, embankment, parapets)
  bs_dec    atlas: lettering, signs, chevrons, flat swatches (Alto Vetro is src/world/towers.js's)
"""
import bpy, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
os.makedirs(OUT, exist_ok=True); os.makedirs(SRC, exist_ok=True)
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
L = json.load(open(os.path.join(ROOT, 'src', 'data', 'barrowst.json'), encoding='utf-8'))
OX, OZ = L['origin']

bpy.ops.wm.read_factory_settings(use_empty=True)

# facade modules (metres across, metres up) per tiled material: must match MOD in src/world/barrowst.js
MOD = dict(mv=(14.4, 17.5), mvy=(7.2, 17.5), glass=(12.0, 15.2), bol=(12.0, 15.6), cu=(6.0, 15.6), stone=(4.8, 6.6), calp=(4.0, 4.0))
# the atlas (px, 1024 x 1024): must match DEC in src/world/barrowst.js
DEC = dict(letters=(0, 0, 1024, 256), sign=(0, 256, 512, 128), chevron=(512, 256, 512, 64), roundel=(512, 320, 64, 64),
           gordon=(0, 384, 512, 64))
SW = ['roof', 'dark', 'white', 'slate', 'gravel', 'conc', 'rail', 'pave', 'glassd', 'steel', 'copper', 'balc', 'stilt', 'wood',
      'hullg', 'hullr', 'cream']
for i, k in enumerate(SW):
    DEC[k] = (i * 64 % 1024, 448 + (i * 64 // 1024) * 64, 64, 64)


def tc(region, s, t):
    x, y, w, h = DEC[region]
    return ((x + s * w) / 1024, 1 - (y + t * h) / 1024)


def B(x, z, y=0.0):
    """Game (x, z) and height -> Blender point."""
    return (x - OX, -(z - OZ), y)


class Mesh:
    def __init__(self, name):
        self.name, self.v, self.f, self.uv = name, [], [], []

    def face(self, pts, uvs, want=None):
        if want is not None:
            n = kit.newell(pts)
            if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0:
                pts, uvs = pts[::-1], uvs[::-1]
        base = len(self.v)
        self.v.extend(tuple(p) for p in pts)
        self.f.append(tuple(range(base, base + len(pts)))); self.uv.append(list(uvs))

    def build(self, material):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        uvl = me.uv_layers.new(name='UVMap')
        uvl.data.foreach_set('uv', [c for uvs in self.uv for p in uvs for c in p])
        me.validate(); me.update()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.collection.objects.link(ob)
        ob.data.materials.append(material)
        return ob


def mat(name):
    return kit.material(name, (0.6, 0.6, 0.6))


M = {k: Mesh('bs_' + k) for k in list(MOD) + ['dec']}


def swatch(k):
    return tc(k, 0.5, 0.5)


def wall(m, a, b, z0, z1, s0=0.0, top1=None):
    """A vertical wall face from plan point a to b (game x, z), z0..z1 (top may slope to top1 at b), facing to the
    LEFT of a->b as seen on the map (north up), so outlines run clockwise on the map (the north face west to east).
    Tiled by MOD from s0 metres along."""
    Lg = math.hypot(b[0] - a[0], b[1] - a[1])
    if Lg < 1e-4:
        return s0
    t1 = z1 if top1 is None else top1
    pts = [B(a[0], a[1], z0), B(b[0], b[1], z0), B(b[0], b[1], t1), B(a[0], a[1], z1)]
    # outward: left of travel on the map is (dz, -dx) in game coords (x east, z south); in Blender Y = -z
    dx, dz = (b[0] - a[0]) / Lg, (b[1] - a[1]) / Lg
    want = (dz, dx, 0.0)
    if m is M['dec']:
        uv = [swatch(m.sw)] * 4
    else:
        W, H = MOD[m.name[3:]]
        uv = [(s0 / W, z0 / H), ((s0 + Lg) / W, z0 / H), ((s0 + Lg) / W, t1 / H), (s0 / W, z1 / H)]
    m.face(pts, uv, want)
    return s0 + Lg


def flat(key, pts_game, y, up=True):
    """A horizontal face in an atlas swatch."""
    m = M['dec']
    m.face([B(x, z, y) for x, z in pts_game], [swatch(key)] * len(pts_game), (0, 0, 1 if up else -1))


def slope(key, pts3, want):
    """A sloping (roof) face from game (x, z, y) points, in an atlas swatch or a tiled material."""
    if key in MOD:
        m = M[key]; W, H = MOD[key]
        pts = [B(x, z, y) for x, z, y in pts3]
        # tile across the slope: u along the first edge, v up the slope
        import mathutils
        p0 = mathutils.Vector(pts[0]); e = (mathutils.Vector(pts[1]) - p0).normalized()
        n = mathutils.Vector(kit.newell(pts)).normalized(); up = n.cross(e)
        uv = [((mathutils.Vector(p) - p0).dot(e) / W, (mathutils.Vector(p) - p0).dot(up) / H) for p in pts]
        m.face(pts, uv, want)
    else:
        M['dec'].face([B(x, z, y) for x, z, y in pts3], [swatch(key)] * len(pts3), want)


def frame(b):
    c, s = math.cos(b['rot']), math.sin(b['rot'])
    return lambda lx, lz: (b['x'] + lx * c + lz * s, b['z'] - lx * s + lz * c)


def rect(b, inset=0.0):
    """The box's corners clockwise on the map from the NW: NW, NE, SE, SW (local -x/-z is north-west)."""
    P, hx, hz = frame(b), b['w'] / 2 - inset, b['d'] / 2 - inset
    return [P(-hx, -hz), P(hx, -hz), P(hx, hz), P(-hx, hz)]


def prism(key, poly, z0, z1, keys=None):
    """Walls round a clockwise (on the map) outline; keys: an optional material per edge."""
    s = 0.0
    for i, a in enumerate(poly):
        bb = poly[(i + 1) % len(poly)]
        k = keys[i] if keys else key
        s = wall(M[k] if k in MOD else dec_sw(k), a, bb, z0, z1, s)
    return s


def dec_sw(k):
    M['dec'].sw = k
    return M['dec']


def cap(key, poly, y):
    flat(key, poly, y)


def box(key, b, z0, z1, top='roof', keys=None):
    r = rect(b)
    prism(key, r, z0, z1, keys)
    if top:
        cap(top, r, z1)
    return r


def dbox(key, P, lx0, lx1, lz0, lz1, z0, z1):
    """A small box in a local frame P, all in one atlas swatch (balconies, posts, plant)."""
    r = [P(lx0, lz0), P(lx1, lz0), P(lx1, lz1), P(lx0, lz1)]
    prism(key, r, z0, z1)
    cap(key, r, z1)
    flat(key, r, z0, up=False)


def gabled(key, b, eave, apex, ridge='x', gables=1, roofk='slate', gablek='calp'):
    """Walls to the eaves, then `gables` parallel pitched roofs with ridges along local x or z and the gable triangles."""
    P = frame(b)
    hx, hz = b['w'] / 2, b['d'] / 2
    prism(key, rect(b), 0, eave)
    along, across = (hx, hz) if ridge == 'x' else (hz, hx)
    n = gables
    for g in range(n):
        a0 = -across + 2 * across * g / n
        a1 = a0 + 2 * across / n
        am = (a0 + a1) / 2
        Q = (lambda u, v: P(u, v)) if ridge == 'x' else (lambda u, v: P(v, u))
        for sgn in (-1, 1):  # the two slopes
            e0, e1 = (a0, am) if sgn < 0 else (a1, am)
            pts = [(*Q(-along, e0), eave), (*Q(along, e0), eave), (*Q(along, e1), apex), (*Q(-along, e1), apex)]
            nx, nz = (0, sgn) if ridge == 'x' else (sgn, 0)
            w = P(nx, nz); o = P(0, 0)
            slope(roofk, pts, (w[0] - o[0], -(w[1] - o[1]), 1.0))
        for end in (-1, 1):  # gable triangles, flush with the end walls
            tri = [(*Q(end * along, a0), eave), (*Q(end * along, a1), eave), (*Q(end * along, am), apex)]
            w = Q(end, 0); o = P(0, 0)
            kk = gablek
            if kk in MOD:
                W, H = MOD[kk]
                pts = [B(x, z, y) for x, z, y in tri]
                uv = [(0, eave / H), (2 * across / n / W, eave / H), (across / n / W, apex / H)]
                M[kk].face(pts, uv, (w[0] - o[0], -(w[1] - o[1]), 0))
            else:
                M['dec'].face([B(x, z, y) for x, z, y in tri], [swatch(kk)] * 3, (w[0] - o[0], -(w[1] - o[1]), 0))


def decal(region, P, lx0, lx1, lz, z0, z1, face_dir, crop=(0, 1, 0, 1)):
    """An atlas quad on a local wall plane (constant local z = lz, spanning local x) facing face_dir (+1: local +z)."""
    a0, a1, t0, t1 = crop
    pts = [(*P(lx0, lz), z0), (*P(lx1, lz), z0), (*P(lx1, lz), z1), (*P(lx0, lz), z1)]
    uv = [tc(region, a0, t1), tc(region, a1, t1), tc(region, a1, t0), tc(region, a0, t0)]
    n = P(0, face_dir); o = P(0, 0)
    M['dec'].face([B(x, z, y) for x, z, y in pts], uv, (n[0] - o[0], -(n[1] - o[1]), 0))


BX = L['boxes']

# =============== Boland's Mills (1830s calp warehouses) ===============
mw = BX['millw']
gabled('stone', mw, mw['h'], mw['h'] + 5.2, ridge='x', gables=2)
# BOLANDS / FLOUR MILLS across the twin gables to the basin (the west face: local x = -w/2); built in the frame
# turned so the letters read from the water
Pw = frame(mw)
pts = [(*Pw(-mw['w'] / 2 - 0.06, -mw['d'] / 2 + 0.9), 9.6), (*Pw(-mw['w'] / 2 - 0.06, mw['d'] / 2 - 0.9), 9.6),
       (*Pw(-mw['w'] / 2 - 0.06, mw['d'] / 2 - 0.9), 14.4), (*Pw(-mw['w'] / 2 - 0.06, -mw['d'] / 2 + 0.9), 14.4)]
o, wv = Pw(0, 0), Pw(-1, 0)
M['dec'].face([B(x, z, y) for x, z, y in pts], [tc('letters', 0, 1), tc('letters', 1, 1), tc('letters', 1, 0), tc('letters', 0, 0)],
              (wv[0] - o[0], -(wv[1] - o[1]), 0))
mr = BX['millr']
gabled('stone', mr, mr['h'], mr['h'] + 4.6, ridge='x', gables=1)
# the long north front's rainwater downpipes (dark), every few bays
Pr = frame(mr)
for k in range(5):
    u = -mr['w'] / 2 + 1.2 + k * (mr['w'] - 2.4) / 4
    dbox('dark', Pr, u - 0.08, u + 0.08, -mr['d'] / 2 - 0.16, -mr['d'] / 2, 0, mr['h'])

# =============== Boland's Quay towers ===============
for key, south_cu in (('bol1', True), ('bol2', False)):
    b = BX[key]
    r = rect(b)
    h, h2 = b['h'], b['h'] - 3.0
    # N and W faces pale panels; E (Barrow St side) copper fins, and the S face of BOL1 which looks on to BOL2
    keys = ['bol', 'cu', 'cu' if south_cu else 'bol', 'bol']
    # the tops slope down to the south by 3 m (refs 10, 12): walls follow
    tops = [(h, h), (h, h2), (h2, h2), (h2, h)]
    s = 0.0
    for i, a in enumerate(r):
        bb = r[(i + 1) % 4]
        s = wall(M[keys[i]], a, bb, 0, tops[i][0], s, tops[i][1])
    slope('roof', [(*r[0], h), (*r[1], h), (*r[2], h2), (*r[3], h2)], (0, 0, 1))
    # a dark glazed ground floor band set into the base, and a slim roof crown
    P = frame(b)
    dbox('glassd', P, -b['w'] / 2 - 0.05, b['w'] / 2 + 0.05, -b['d'] / 2 - 0.05, -b['d'] / 2 + 0.3, 0, 4.2)
    dbox('steel', P, -b['w'] / 2 + 3, b['w'] / 2 - 5, -b['d'] / 2 + 2, b['d'] / 2 - 4, h2, h2 + 2.4)
# the glazed link between them, high up
b1, b2 = BX['bol1'], BX['bol2']
P1 = frame(b1)
dbox('glassd', P1, -3.5, 1.5, b1['d'] / 2, b1['d'] / 2 + (b2['z'] - b1['z']) - b2['d'] / 2 - b1['d'] / 2 + 0.3, 30.0, 33.6)

# the balconied stone warehouse on the dock edge (ref 12), ridge north-south, balconies to the water
sw_ = BX['stonewh']
gabled('stone', sw_, sw_['h'], sw_['h'] + 3.4, ridge='z', gables=1)
Ps = frame(sw_)
for fl in range(1, 5):
    for k in range(3):
        u = -sw_['d'] / 2 + 2.2 + k * (sw_['d'] - 4.4) / 2
        dbox('balc', lambda a, c: Ps(-c, a), u - 0.9, u + 0.9, sw_['w'] / 2, sw_['w'] / 2 + 1.1, fl * 3.3 + 0.1, fl * 3.3 + 1.2)

# the old stores between Boland's and Google Docks: The Warehouse and the Dock Mill (stone, gabled to the basin), and
# Grand Mill Quay (glass)
wh = BX['warehouse']
gabled('stone', wh, wh['h'], wh['h'] + 4.0, ridge='x', gables=1)
dm = BX['dockmill']
Pd = frame(dm)
west = dict(dm, x=Pd(-dm['w'] / 4, 0)[0], z=Pd(-dm['w'] / 4, 0)[1], w=dm['w'] / 2)
east = dict(dm, x=Pd(dm['w'] / 4, 0)[0], z=Pd(dm['w'] / 4, 0)[1], w=dm['w'] / 2, h=dm['h'] + 3.3)
gabled('stone', west, dm['h'], dm['h'] + 4.2, ridge='x', gables=2)
box('glass', east, 0, east['h'])
gm = BX['grandmill']
box('glass', gm, 0, gm['h'])

# =============== the Google campus ===============
mv = L['montevetro']
poly = [tuple(p) for p in mv['poly']]
edge_keys = ['mvy' if (a[0] >= 736 and poly[(i + 1) % len(poly)][0] >= 736) else 'mv' for i, a in enumerate(poly)]


def clip_x(poly, x0):
    """Keep the part of a polygon with x >= x0 (Sutherland-Hodgman against one line)."""
    out = []
    for i, a in enumerate(poly):
        b = poly[(i + 1) % len(poly)]
        ina, inb = a[0] >= x0, b[0] >= x0
        if ina:
            out.append(a)
        if ina != inb:
            t = (x0 - a[0]) / (b[0] - a[0])
            out.append((x0, a[1] + t * (b[1] - a[1])))
    return out


prism('mv', poly, 0, mv['hs'], edge_keys)
up = clip_x(poly, poly[0][0] + mv['shoulder'])
up_keys = ['mvy' if (a[0] >= 736 and up[(i + 1) % len(up)][0] >= 736) else 'mv' for i, a in enumerate(up)]
s = 0.0
for i, a in enumerate(up):
    bb = up[(i + 1) % len(up)]
    s = wall(M[up_keys[i]], a, bb, mv['hs'], mv['h'], s)
# the shoulder's roof (the part of the lower prism not under the upper one) and the top
x0 = poly[0][0] + mv['shoulder']
low = [p for p in poly if p[0] < x0]
low_roof = clip_x([(-p[0], p[1]) for p in poly], -x0)
flat('roof', [(-x, z) for x, z in low_roof], mv['hs'])
flat('roof', up, mv['h'])
# roof plant and the window-cleaning gantry (ref 01)
cx = sum(p[0] for p in up) / len(up); cz = sum(p[1] for p in up) / len(up)
Pm = lambda u, v: (cx + u, cz + v)
dbox('steel', Pm, -7, 5, -3, 3, mv['h'], mv['h'] + 3.2)
dbox('dark', Pm, -12, 12, -5.2, -4.8, mv['h'] + 3.6, mv['h'] + 4.0)

gd = BX['gordon']
box('glass', gd, 0, gd['h'])
Pg = frame(gd)
dbox('steel', Pg, -gd['w'] / 2 + 4, gd['w'] / 2 - 4, -gd['d'] / 2 + 4, gd['d'] / 2 - 4, gd['h'], gd['h'] + 2.6)
# GORDON HOUSE, in steel letters on the Barrow Street (west) front near the north corner
pts = [(*Pg(-gd['w'] / 2 - 0.06, -gd['d'] / 2 + 1.5), 9.0), (*Pg(-gd['w'] / 2 - 0.06, -gd['d'] / 2 + 12.5), 9.0),
       (*Pg(-gd['w'] / 2 - 0.06, -gd['d'] / 2 + 12.5), 10.4), (*Pg(-gd['w'] / 2 - 0.06, -gd['d'] / 2 + 1.5), 10.4)]
o, wv = Pg(0, 0), Pg(-1, 0)
M['dec'].face([B(x, z, y) for x, z, y in pts], [tc('gordon', 0, 1), tc('gordon', 1, 1), tc('gordon', 1, 0), tc('gordon', 0, 0)],
              (wv[0] - o[0], -(wv[1] - o[1]), 0))
gw = BX['gasworks']
box('glass', gw, 0, gw['h'])
dbox('steel', frame(gw), -5, 5, -8, 8, gw['h'], gw['h'] + 2.4)

# the skybridge over Barrow Street: a curved glazed tube between Google Docks and Gordon House at the second floor
sk = L['skybridge']
curve = []
for k in range(9):
    t = k / 8
    a, b, c = sk
    curve.append(((1 - t) ** 2 * a[0] + 2 * t * (1 - t) * b[0] + t * t * c[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * b[1] + t * t * c[1]))
Z0, Z1, HW = 8.2, 11.6, 1.8
sL, sR = [], []
for i, p in enumerate(curve):
    q0, q1 = curve[max(0, i - 1)], curve[min(len(curve) - 1, i + 1)]
    dx, dz = q1[0] - q0[0], q1[1] - q0[1]; ll = math.hypot(dx, dz)
    nx, nz = -dz / ll, dx / ll
    sL.append((p[0] - nx * HW, p[1] - nz * HW)); sR.append((p[0] + nx * HW, p[1] + nz * HW))
s1 = s2 = 0.0
for i in range(len(curve) - 1):
    s1 = wall(M['glass'], sR[i + 1], sR[i], Z0 + 0.6, Z1, s1)
    s2 = wall(M['glass'], sL[i], sL[i + 1], Z0 + 0.6, Z1, s2)
    wall(dec_sw('dark'), sR[i + 1], sR[i], Z0, Z0 + 0.6)
    wall(dec_sw('dark'), sL[i], sL[i + 1], Z0, Z0 + 0.6)
    flat('dark', [sL[i], sL[i + 1], sR[i + 1], sR[i]], Z1)
    flat('dark', [sL[i], sL[i + 1], sR[i + 1], sR[i]], Z0, up=False)

# =============== Waterways Ireland visitor centre (white box on stilts in the basin) ===============
ww = L['waterways']
Pv = frame(ww)
dbox('white', Pv, -ww['w'] / 2, ww['w'] / 2, -ww['d'] / 2, ww['d'] / 2, 0.8, 7.4)
dbox('glassd', Pv, -ww['w'] / 2 - 0.05, -ww['w'] / 2 + 0.2, -3.2, 3.2, 1.2, 6.2)   # the glass-block wall to the quay
for sx in (-1, 1):
    for sz in (-1, 1):
        dbox('stilt', Pv, sx * 3.2 - 0.25, sx * 3.2 + 0.25, sz * 3.2 - 0.25, sz * 3.2 + 0.25, -3.5, 0.8)
dbox('wood', Pv, -ww['w'] / 2 - 11.5, -ww['w'] / 2, -0.9, 0.9, -0.1, 0.35)            # the walkway to the quay

# the marina in the inner basin (ref 22): a long pontoon south from the visitor centre with finger berths either side,
# and a few narrowboats and barges moored along it (the water is at -2.0)
PY = -1.55
Pm0 = lambda u, v: (694.0 + u, 312.0 + v)
dbox('wood', Pm0, -0.9, 0.9, 0, 50, PY - 0.35, PY)
for k in range(8):
    v = 4 + k * 6
    for side in (-1,):
        dbox('wood', Pm0, side * 0.9 if side > 0 else -6.0, 6.0 if side > 0 else -0.9, v, v + 0.8, PY - 0.3, PY)
for (u, v, bl, hull) in ((2.1, 2, 10, "hullg"), (2.1, 14, 12, "hullr"), (2.1, 28, 9, "hullg"), (2.1, 39, 10, "hullr")):
    dbox(hull, Pm0, u - 0.95, u + 0.95, v, v + bl, -2.3, -1.2)                     # hull
    dbox('cream', Pm0, u - 0.75, u + 0.75, v + 1.4, v + bl - 1.6, -1.2, -0.25)     # cabin
    flat('dark', [Pm0(u - 0.8, v + 1.3), Pm0(u + 0.8, v + 1.3), Pm0(u + 0.8, v + bl - 1.5), Pm0(u - 0.8, v + bl - 1.5)], -0.2)

# =============== the DART: embankment, Grand Canal Dock station, the bridges ===============
R = L['rail']
line = [tuple(p) for p in R['line']]
DECK, HALF = R['deck'], R['half']


def cut(line, xa, xb):
    """The part of the polyline with xa <= x <= xb (the line runs west to east)."""
    out = []
    for i in range(len(line) - 1):
        a, b = line[i], line[i + 1]
        lo, hi = max(xa, a[0]), min(xb, b[0])
        if lo >= hi:
            continue
        f = lambda x: (x, a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1]))
        p, q = f(lo), f(hi)
        if not out or math.hypot(out[-1][0] - p[0], out[-1][1] - p[1]) > 1e-6:
            out.append(p)
        out.append(q)
    return out


def offset(pl, d):
    out = []
    for i, p in enumerate(pl):
        a, b = pl[max(0, i - 1)], pl[min(len(pl) - 1, i + 1)]
        dx, dz = b[0] - a[0], b[1] - a[1]; ll = math.hypot(dx, dz)
        nx, nz = dz / ll, -dx / ll      # left of travel on the map (the north side for an eastbound line)
        out.append((p[0] + nx * d, p[1] + nz * d))
    return out


spans = R['spans']
x_start, x_end = line[0][0], line[-1][0]
solid = []
xa = x_start
for s0, s1 in spans:
    solid.append((xa, s0)); xa = s1
solid.append((xa, x_end))
for xa, xb in solid:
    c = cut(line, xa, xb)
    nL, nR = offset(c, HALF), offset(c, -HALF)
    # the side walls (calp), their parapets, the end walls, the deck (ballast)
    s = 0.0
    for i in range(len(c) - 1, 0, -1):
        s = wall(M['calp'], nR[i], nR[i - 1], 0, DECK + 1.0, s)          # south side, facing south
    s = 0.0
    for i in range(len(c) - 1):
        s = wall(M['calp'], nL[i], nL[i + 1], 0, DECK + 1.0, s)          # north side
    wall(M['calp'], nR[0], nL[0], 0, DECK + 1.0)                          # west end
    wall(M['calp'], nL[-1], nR[-1], 0, DECK + 1.0)                        # east end
    iL, iR = offset(c, HALF - 0.5), offset(c, -HALF + 0.5)
    for i in range(len(c) - 1):
        flat('gravel', [iL[i], iL[i + 1], iR[i + 1], iR[i]], DECK)
        flat('conc', [nL[i], nL[i + 1], iL[i + 1], iL[i]], DECK + 1.0)
        flat('conc', [iR[i], iR[i + 1], nR[i + 1], nR[i]], DECK + 1.0)
    # parapet inner faces
    for i in range(len(c) - 1):
        wall(M['calp'], iL[i + 1], iL[i], DECK, DECK + 1.0)
        wall(M['calp'], iR[i], iR[i + 1], DECK, DECK + 1.0)
# the bridges: a steel-girder deck on the abutments, the chevron height bar on both faces over the roads
for s0, s1 in spans:
    c = cut(line, s0, s1)
    nL, nR = offset(c, HALF), offset(c, -HALF)
    for i in range(len(c) - 1):
        wall(dec_sw('dark'), nR[i + 1], nR[i], DECK - 1.5, DECK + 1.0)
        wall(dec_sw('dark'), nL[i], nL[i + 1], DECK - 1.5, DECK + 1.0)
        flat('gravel', [nL[i], nL[i + 1], nR[i + 1], nR[i]], DECK)
        flat('dark', [nL[i], nL[i + 1], nR[i + 1], nR[i]], DECK - 1.5, up=False)
    # the chevron bar and the 3.67 m roundel on the road faces (Barrow Street's bridge and the Grand Canal Quay tunnel)
    for side, pl in ((1, nL), (-1, nR)):
        a, b = pl[0], pl[-1]
        dx, dz = b[0] - a[0], b[1] - a[1]; ll = math.hypot(dx, dz)
        nx, nz = (dz / ll, -dx / ll) if side > 0 else (-dz / ll, dx / ll)   # outward (game)
        off = 0.05
        q = [(a[0] + nx * off, a[1] + nz * off), (b[0] + nx * off, b[1] + nz * off)]
        if side > 0:
            q = q[::-1]   # text runs from the viewer's left
        pts = [B(q[0][0], q[0][1], DECK - 1.45), B(q[1][0], q[1][1], DECK - 1.45), B(q[1][0], q[1][1], DECK - 0.75), B(q[0][0], q[0][1], DECK - 0.75)]
        M['dec'].face(pts, [tc('chevron', 0, 1), tc('chevron', 1, 1), tc('chevron', 1, 0), tc('chevron', 0, 0)], (nx, -nz, 0))
        mid = ((q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2)
        ux, uz = (q[1][0] - q[0][0]) / ll, (q[1][1] - q[0][1]) / ll
        rp = [(mid[0] - ux * 0.45 + nx * 0.03, mid[1] - uz * 0.45 + nz * 0.03), (mid[0] + ux * 0.45 + nx * 0.03, mid[1] + uz * 0.45 + nz * 0.03)]
        M['dec'].face([B(rp[0][0], rp[0][1], DECK - 0.72), B(rp[1][0], rp[1][1], DECK - 0.72), B(rp[1][0], rp[1][1], DECK + 0.18), B(rp[0][0], rp[0][1], DECK + 0.18)],
                      [tc('roundel', 0, 1), tc('roundel', 1, 1), tc('roundel', 1, 0), tc('roundel', 0, 0)], (nx, -nz, 0))
# rails: two tracks along the whole line
full = cut(line, x_start, x_end)
for tr in (-2.25, 2.25):
    for rr in (-0.72, 0.72):
        a_ = offset(full, tr + rr - 0.06); b_ = offset(full, tr + rr + 0.06)
        for i in range(len(full) - 1):
            flat('rail', [b_[i], b_[i + 1], a_[i + 1], a_[i]], DECK + 0.16)
# Grand Canal Dock station: the platforms (north, island between the tracks is left as ballast, south), canopies and
# the name boards
st0, st1 = R['station']
c = cut(line, st0, st1)
for d_in, d_out in ((4.0, HALF - 0.5), (-4.0, -(HALF - 0.5))):
    north = d_in > 0
    pe, po = offset(c, d_in), offset(c, d_out)
    lo, hi = min(d_in, d_out), max(d_in, d_out)
    for i in range(len(c) - 1):
        flat('pave', [pe[i], pe[i + 1], po[i + 1], po[i]], DECK + 0.9)
        # the platform edge faces the tracks: south for the north platform, north for the south one
        if north:
            wall(dec_sw('conc'), pe[i + 1], pe[i], DECK, DECK + 0.9)
        else:
            wall(dec_sw('conc'), pe[i], pe[i + 1], DECK, DECK + 0.9)
    # canopy: a dark sheet on posts over the middle of each platform
    ca, cb = cut(line, st0 + 12, st0 + 34), None
    qa, qb = offset(ca, hi + 0.2), offset(ca, lo - 0.2)
    for i in range(len(ca) - 1):
        flat('steel', [qa[i], qa[i + 1], qb[i + 1], qb[i]], DECK + 4.2)
        flat('dark', [qa[i], qa[i + 1], qb[i + 1], qb[i]], DECK + 4.0, up=False)
    mid = offset(ca, (hi + lo) / 2)
    for p in (mid[0], mid[-1]):
        Pp = lambda u, v, p=p: (p[0] + u, p[1] + v)
        dbox('dark', Pp, -0.12, 0.12, -0.12, 0.12, DECK + 0.9, DECK + 4.0)
    # the name board on two posts, facing the tracks
    sb = cut(line, st0 + 40, st0 + 44)
    ra, rb = offset(sb, (hi + lo) / 2), None
    a, b = ra[0], ra[-1]
    q = (a, b) if north else (b, a)   # the north platform's board faces south, the south one's north
    dx, dz = q[1][0] - q[0][0], q[1][1] - q[0][1]; ll = math.hypot(dx, dz)
    want = (-dz / ll, dx / ll)
    M['dec'].face([B(q[0][0], q[0][1], DECK + 2.3), B(q[1][0], q[1][1], DECK + 2.3), B(q[1][0], q[1][1], DECK + 3.3), B(q[0][0], q[0][1], DECK + 3.3)],
                  [tc('sign', 0, 1), tc('sign', 1, 1), tc('sign', 1, 0), tc('sign', 0, 0)], (want[0], -want[1], 0))
    back = [(q[1][0], q[1][1]), (q[0][0], q[0][1])]
    M['dec'].face([B(back[0][0], back[0][1], DECK + 2.3), B(back[1][0], back[1][1], DECK + 2.3), B(back[1][0], back[1][1], DECK + 3.3), B(back[0][0], back[0][1], DECK + 3.3)],
                  [tc('sign', 0, 1), tc('sign', 1, 1), tc('sign', 1, 0), tc('sign', 0, 0)], (-want[0], want[1], 0))
    for p in (a, b):
        Pp = lambda u, v, p=p: (p[0] + u, p[1] + v)
        dbox('dark', Pp, -0.07, 0.07, -0.07, 0.07, DECK + 0.9, DECK + 2.3)
# the stair and lift tower down to Barrow Street, north of the bridge (the station entrance)
Pe = lambda u, v: (737.0 + u, 434.4 + v)
dbox('steel', Pe, -2.2, 2.2, -2.2, 2.2, 0, DECK + 4.6)
dbox('glassd', Pe, -2.25, 2.25, -1.4, 1.4, 1.0, DECK + 4.0)

# ------------------------------------------------------------------ build and export
materials = {k: mat('bs_' + k) for k in M}
objs = []
for k, m in M.items():
    if m.f:
        objs.append(m.build(materials[k]))
root = bpy.data.objects.new('barrowst', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
n = kit.tris(objs)
print('TRIANGLES', n, {o.name: len(o.data.loop_triangles) for o in objs})
kit.export(os.path.join(OUT, 'barrowst.glb'), os.path.join(SRC, 'barrowst.blend'))
print('DONE')

"""Grand Canal Square: the Bord Gais Energy Theatre (Libeskind, 2010), the Marker hotel (Aires Mateus, 2013), 4-5 Grand
Canal Square across Misery Hill (Libeskind, 2010: the leaning glass prow) and 2 Grand Canal Square south of the
theatre (Libeskind, 2010).

Run headless:  blender -b --factory-startup -P tools/blender/build_gcsquare.py -- public/models models

Sources: docs/research/grand-canal-square.md and refs/grand-canal-square/*. Built straight in game metres, placed from
absolute game coordinates: every footprint below is written as game (x, z) (x east, z south), taken from the OSM
footprints projected by src/world/geo.js and nudged clear of Misery Hill (streets.json MC1-MH1-MH2-MH3-HQ1). Plans are
the half-scale footprints (the Marker's depth carries the quays' N stretch); heights are real (the city's filler uses real
storey heights): the Marker 28.7 m to the fins, the theatre 40 m at the fly tower, the office blocks 31-33 m.

Blender axes: X = game x - 640, Y = 150 - game z (north), Z up. The root `gcsquare` is placed at game (640, 0, 150)
with no rotation (src/world/gcsquare.js).

Materials (painted at load in src/world/gcsquare.js):
  gcs_glass  office curtain walling: UVs tile a 4-bay x 4-floor pane texture (6 m x 14 m), night twin
  gcs_lobby  the theatre's leaning lobby glass: tiled 6 m x 12 m, green steel lattice, warm lobby at night
  gcs_clad   the theatre's stainless rainscreen in diagonal courses: tiled 16 m
  gcs_main   everything else: UVs into the 1024 atlas GCS_ATLAS (swatches, windows, glazing panels, signs)
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)

# atlas regions, px (x, y, w, h) in 1024 x 1024 - keep in step with GCS_ATLAS in src/world/gcsquare.js
A = dict(
    grc=(0, 0, 64, 64), frame=(64, 0, 64, 64), steel=(128, 0, 64, 64), white=(192, 0, 64, 64),
    granite=(256, 0, 64, 64), paving=(320, 0, 64, 64), lawn=(384, 0, 64, 64), void=(448, 0, 64, 64),
    soffit=(512, 0, 64, 64), greyglass=(576, 0, 64, 64), roof=(640, 0, 64, 64), planting=(704, 0, 64, 64),
    louvreback=(768, 0, 64, 64), mesh=(832, 0, 64, 64), clad=(896, 0, 64, 64), dark=(960, 0, 64, 64),
    win0=(0, 64, 128, 128), win1=(128, 64, 128, 128), win2=(256, 64, 128, 128), win3=(384, 64, 128, 128),
    bar=(512, 64, 128, 128), grnd=(640, 64, 128, 256), base=(768, 64, 128, 256), door=(896, 64, 128, 256),
    name=(0, 448, 1024, 96), marker=(0, 544, 512, 96), gcsign=(512, 544, 512, 96), canopy=(0, 192, 64, 64),
)
W = 1024.0
O = (640.0, 150.0)       # game (x, z) of the Blender origin


def G(x, z, h=0.0):
    """Game (x, z) at height h -> Blender (X, Y, Z)."""
    return (x - O[0], O[1] - z, h)


def tc(region, s, t):
    """UV of (s across, t down) inside a region, inset half a texel so neighbours don't bleed."""
    x, y, w, h = A[region]
    s = 0.5 / w + s * (1 - 1 / w); t = 0.5 / h + t * (1 - 1 / h)
    return ((x + s * w) / W, 1 - (y + t * h) / W)


def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def mul(a, k): return (a[0] * k, a[1] * k, a[2] * k)
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def norm(a):
    L = math.sqrt(dot(a, a)) or 1.0
    return (a[0] / L, a[1] / L, a[2] / L)
def lerp(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(len(a)))


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

    def swatch(self, region, pts, n=None):
        """Flat colour: every corner at the middle of a swatch region."""
        self.face(pts, [tc(region, 0.5, 0.5)] * len(pts), n)

    def decal(self, region, pts, n=None, crop=(0, 1, 0, 1)):
        """A quad (bottom-left, bottom-right, top-right, top-left as seen from outside) showing a whole region."""
        s0, s1, t0, t1 = crop
        self.face(pts, [tc(region, s0, t1), tc(region, s1, t1), tc(region, s1, t0), tc(region, s0, t0)], n)

    def tiled(self, pts, TW, TH, n=None, plane=None):
        """Tiled material: planar UVs in metres / tile, u along the horizontal of the face, v up its slope. plane: the
        normal to project with (so the two halves of a warped quad share one mapping)."""
        nn = norm(plane or n or kit.newell(pts))
        if abs(nn[2]) > 0.95:
            uvs = [(p[0] / TW, p[1] / TW) for p in pts]
        else:
            hz = norm((-nn[1], nn[0], 0.0))
            up = norm(cross(nn, hz))
            if up[2] < 0: up = mul(up, -1)
            uvs = [(dot(p, hz) / TW, dot(p, up) / TH) for p in pts]
        self.face(pts, uvs, n)

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


glass, lobby, clad, main = Mesh('gcs_glass'), Mesh('gcs_lobby'), Mesh('gcs_clad'), Mesh('gcs_main')
MAT = {n: kit.material(n, (0.8, 0.8, 0.8)) for n in ('gcs_glass', 'gcs_lobby', 'gcs_clad', 'gcs_main')}
GTW, GTH = 6.0, 14.0     # office glass tile: 4 bays of 1.5 m x 4 floors of 3.5 m
LTW, LTH = 6.0, 12.0     # lobby glass tile
CT = 16.0                # cladding tile (courses 1 m, panels 4 m)


def hnorm(a, b):
    """Outward normal (Blender, horizontal) of a wall running a -> b with the inside on its left (anticlockwise plan)."""
    d = norm(sub(b, a))
    return (d[1], -d[0], 0.0)


def wall_box(mesh, region, a, b, h0, h1, out, n=None):
    """Vertical quad on the line a-b (Blender points) between h0 and h1, pushed `out` along n."""
    a0, b0 = add(a, mul(n, out)), add(b, mul(n, out))
    mesh.swatch(region, [(a0[0], a0[1], h0), (b0[0], b0[1], h0), (b0[0], b0[1], h1), (a0[0], a0[1], h1)], n)


def prism(mesh, region, poly, h0, h1, top=True, bottom=False, sides=True):
    """A vertical prism over a plan polygon (Blender XY points, any winding) with swatch UVs."""
    ccw = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))) > 0
    P = poly if ccw else poly[::-1]
    if sides:
        for i in range(len(P)):
            a, b = P[i], P[(i + 1) % len(P)]
            n = (b[1] - a[1], -(b[0] - a[0]), 0.0)
            mesh.swatch(region, [(a[0], a[1], h0), (b[0], b[1], h0), (b[0], b[1], h1), (a[0], a[1], h1)], n)
    if top:
        mesh.swatch(region, [(p[0], p[1], h1) for p in P], (0, 0, 1))
    if bottom:
        mesh.swatch(region, [(p[0], p[1], h0) for p in P], (0, 0, -1))


def mark(what):
    print('MARK', what, {m.name: len(m.f) for m in (glass, lobby, clad, main)})


# =====================================================================================================================
# THE MARKER (refs 01, 02, 05, 07): a parallelogram in plan, its front on Misery Hill's paved section facing the square.
# 13 columns along the front and back, 5 across each end; above a 6 m glazed ground floor set 1.4 m back: a soffit row
# whose solid cells hang down as faceted inverted pyramids, five chequer rows of deep-set windows, and a top row whose
# solid cells rise as fins round the rooftop bar's glazing.
# =====================================================================================================================
MF0, MF1 = (647.0, 148.0), (685.5, 155.4)          # front corners (west, east), game x, z
ME = (1.5, -14.6)                                   # from a front corner back along the end walls (game)
MB0, MB1 = (MF0[0] + ME[0], MF0[1] + ME[1]), (MF1[0] + ME[0], MF1[1] + ME[1])
H_SOFF, H_APEX, H_R0 = 7.2, 6.1, 9.1                # soffit plane, pyramid tips, top of the soffit row
ROW = 3.1
H_TOP0 = H_R0 + 5 * ROW                             # 24.6: bottom of the top row
H_ROOF, H_FIN = H_TOP0 + ROW, H_TOP0 + ROW + 1.0    # 27.7 roof / parapet, 28.7 fin tops
INSET_G, WIN_D, SOFF_D, BAR_D = 1.4, 0.55, 0.9, 1.5

# faces anticlockwise in plan (Blender): front (west->east), east end, back (east->west), west end
m_corners = [G(*MF0), G(*MF1), G(*MB1), G(*MB0)]
m_faces = [(m_corners[i], m_corners[(i + 1) % 4], 13 if i % 2 == 0 else 5) for i in range(4)]


def inset_corners(corners, d):
    """Corners of the plan polygon offset inwards by d (anticlockwise polygon, Blender XY)."""
    out = []
    n_ = len(corners)
    for i in range(n_):
        p0, p1, p2 = corners[i - 1], corners[i], corners[(i + 1) % n_]
        n1, n2 = hnorm(p0, p1), hnorm(p1, p2)
        # intersection of the two offset lines
        a1 = add(p0, mul(n1, -d)); d1 = sub(p1, p0)
        a2 = add(p1, mul(n2, -d)); d2 = sub(p2, p1)
        den = d1[0] * d2[1] - d1[1] * d2[0]
        t = ((a2[0] - a1[0]) * d2[1] - (a2[1] - a1[1]) * d2[0]) / den
        out.append((a1[0] + d1[0] * t, a1[1] + d1[1] * t, 0.0))
    return out


def at(p, n, s_dir, s, d, h):
    return (p[0] + s_dir[0] * s + n[0] * d, p[1] + s_dir[1] * s + n[1] * d, h)


col = 0
win_hash = 0
m_inG = inset_corners(m_corners, INSET_G)
for fi, (a, b, ncol) in enumerate(m_faces):
    n = hnorm(a, b)
    L = math.dist(a[:2], b[:2])
    u = norm(sub(b, a))
    cw = L / ncol
    ia, ib = m_inG[fi], m_inG[(fi + 1) % 4]
    for k in range(ncol):
        s0, s1 = k * cw, (k + 1) * cw
        P = lambda s, d, h: at(a, n, u, s, d, h)
        gk = col + k
        # ---- ground floor: glazing panels on the inset line, under the soffit
        g0, g1 = lerp(ia, ib, k / ncol), lerp(ia, ib, (k + 1) / ncol)
        main.decal('grnd', [(g0[0], g0[1], 0.0), (g1[0], g1[1], 0.0), (g1[0], g1[1], H_SOFF), (g0[0], g0[1], H_SOFF)], n)
        # ---- soffit row
        if (gk + 0) % 2 == 0:
            # solid: a pentagon on the face, and an inverted pyramid under it back to the glass line
            m = (s0 + s1) / 2
            main.swatch('grc', [P(s0, 0, H_SOFF), P(m, 0, H_APEX), P(s1, 0, H_SOFF), P(s1, 0, H_R0), P(s0, 0, H_R0)], n)
            tip = P(m, 0, H_APEX)
            bl, br = P(s0, -INSET_G, H_SOFF), P(s1, -INSET_G, H_SOFF)
            main.swatch('grc', [P(s0, 0, H_SOFF), tip, bl], add(mul(n, 0.3), (-u[0], -u[1], -1)))
            main.swatch('grc', [tip, P(s1, 0, H_SOFF), br], add(mul(n, 0.3), (u[0], u[1], -1)))
            main.swatch('grc', [tip, br, bl], (n[0], n[1], -1.2))
        else:
            # a recessed GRC panel over a flat soffit
            main.swatch('grc', [P(s0, -SOFF_D, H_SOFF), P(s1, -SOFF_D, H_SOFF), P(s1, -SOFF_D, H_R0), P(s0, -SOFF_D, H_R0)], n)
            main.swatch('grc', [P(s0, 0, H_R0), P(s1, 0, H_R0), P(s1, -SOFF_D, H_R0), P(s0, -SOFF_D, H_R0)], (0, 0, -1))
            main.swatch('grc', [P(s0, 0, H_SOFF), P(s0, -SOFF_D, H_SOFF), P(s0, -SOFF_D, H_R0), P(s0, 0, H_R0)], (u[0], u[1], 0))
            main.swatch('grc', [P(s1, 0, H_SOFF), P(s1, -SOFF_D, H_SOFF), P(s1, -SOFF_D, H_R0), P(s1, 0, H_R0)], (-u[0], -u[1], 0))
            main.swatch('grc', [P(s0, 0, H_SOFF), P(s1, 0, H_SOFF), P(s1, -INSET_G, H_SOFF), P(s0, -INSET_G, H_SOFF)], (0, 0, -1))
        # ---- five chequer rows: solid cells flush, windows set deep with GRC reveals
        for r in range(1, 6):
            z0, z1 = H_R0 + (r - 1) * ROW, H_R0 + r * ROW
            if (gk + r) % 2 == 0:
                main.swatch('grc', [P(s0, 0, z0), P(s1, 0, z0), P(s1, 0, z1), P(s0, 0, z1)], n)
            else:
                win_hash = (win_hash * 1103515245 + 12345 + gk * 7 + r * 13) & 0x7fffffff
                reg = 'win%d' % ((win_hash >> 8) % 4)
                main.decal(reg, [P(s0, -WIN_D, z0), P(s1, -WIN_D, z0), P(s1, -WIN_D, z1), P(s0, -WIN_D, z1)], n)
                main.swatch('grc', [P(s0, 0, z0), P(s1, 0, z0), P(s1, -WIN_D, z0), P(s0, -WIN_D, z0)], (0, 0, 1))
                main.swatch('grc', [P(s0, 0, z1), P(s1, 0, z1), P(s1, -WIN_D, z1), P(s0, -WIN_D, z1)], (0, 0, -1))
                main.swatch('grc', [P(s0, 0, z0), P(s0, -WIN_D, z0), P(s0, -WIN_D, z1), P(s0, 0, z1)], (u[0], u[1], 0))
                main.swatch('grc', [P(s1, 0, z0), P(s1, -WIN_D, z0), P(s1, -WIN_D, z1), P(s1, 0, z1)], (-u[0], -u[1], 0))
        # ---- top row: fins, and the rooftop bar's glazing set back between them
        if (gk + 6) % 2 == 0:
            z0, z1 = H_TOP0, H_FIN
            main.swatch('grc', [P(s0, 0, z0), P(s1, 0, z0), P(s1, 0, z1), P(s0, 0, z1)], n)
            main.swatch('grc', [P(s0, 0, z1), P(s1, 0, z1), P(s1, -BAR_D, z1), P(s0, -BAR_D, z1)], (0, 0, 1))
            main.swatch('grc', [P(s0, 0, z0), P(s0, -BAR_D, z0), P(s0, -BAR_D, z1), P(s0, 0, z1)], (-u[0], -u[1], 0))
            main.swatch('grc', [P(s1, 0, z0), P(s1, -BAR_D, z0), P(s1, -BAR_D, z1), P(s1, 0, z1)], (u[0], u[1], 0))
            main.swatch('grc', [P(s0, -BAR_D, H_ROOF), P(s1, -BAR_D, H_ROOF), P(s1, -BAR_D, z1), P(s0, -BAR_D, z1)], mul(n, -1))
        else:
            main.decal('bar', [P(s0, -BAR_D, H_TOP0), P(s1, -BAR_D, H_TOP0), P(s1, -BAR_D, H_ROOF), P(s0, -BAR_D, H_ROOF)], n)
            main.swatch('grc', [P(s0, 0, H_TOP0), P(s1, 0, H_TOP0), P(s1, -BAR_D, H_TOP0), P(s0, -BAR_D, H_TOP0)], (0, 0, 1))
    col += ncol
# the roof inside the fins, and a plant screen on it
m_inR = inset_corners(m_corners, BAR_D)
main.swatch('roof', [(p[0], p[1], H_ROOF) for p in m_inR], (0, 0, 1))
mc = lerp(lerp(m_corners[0], m_corners[2], 0.5), m_corners[3], 0.0)
prism(main, 'roof', [(mc[0] + dx, mc[1] + dy) for dx, dy in ((-6, -3), (6, -1.8), (6.6, 1.8), (-5.4, 3))], H_ROOF, H_ROOF + 2.2)
# the black steel porte-cochere at the entrance near the east end, the name on it
fa, fb = m_corners[0], m_corners[1]
fu, fn = norm(sub(fb, fa)), hnorm(fa, fb)
PC = lambda s, d, h: at(fa, fn, fu, s, d, h)
p0, p1 = 30.3, 33.9
prism(main, 'dark', [PC(p0, -INSET_G, 0)[:2], PC(p1, -INSET_G, 0)[:2], PC(p1, 3.0, 0)[:2], PC(p0, 3.0, 0)[:2]], 3.9, 4.6, bottom=True)
for s in (p0 + 0.2, p1 - 0.2):
    prism(main, 'dark', [PC(s - 0.15, 2.6, 0)[:2], PC(s + 0.15, 2.6, 0)[:2], PC(s + 0.15, 2.9, 0)[:2], PC(s - 0.15, 2.9, 0)[:2]], 0.0, 3.9)
main.decal('marker', [PC(p0 + 0.3, 3.03, 3.95), PC(p1 - 0.3, 3.03, 3.95), PC(p1 - 0.3, 3.03, 4.55), PC(p0 + 0.3, 3.03, 4.55)], fn)
# the lawn terrace along the front: granite-kerbed beds, a gap at the entrance
for s0, s1 in ((1.0, 13.5), (15.0, 29.4), (34.8, 38.6)):
    prism(main, 'granite', [PC(s0, 0.4, 0)[:2], PC(s1, 0.4, 0)[:2], PC(s1, 3.2, 0)[:2], PC(s0, 3.2, 0)[:2]], 0.0, 0.45, top=False)
    main.swatch('lawn' if s0 != 15.0 else 'planting', [PC(s0, 0.4, 0.45), PC(s1, 0.4, 0.45), PC(s1, 3.2, 0.45), PC(s0, 3.2, 0.45)], (0, 0, 1))
mark('marker')

# =====================================================================================================================
# BORD GAIS ENERGY THEATRE (refs 08, 10, 12-17): a folded crystal. The lobby's four-storey glass front in three pleated
# facets (the north one leaning far out to the canopy, the south one near plumb under a deep white soffit), the white
# box-section V and diagonals over it, the lobby's balcony tiers behind; a deep white canopy with the name on its
# fascia, a sharp prow rising at the north-east corner (ref 15) and a white wedge hanging from its south end (refs 08,
# 14); the roof rising in folded planes from the canopy to a high back edge over the fly tower at the west (refs 12,
# 17); stainless rainscreen in diagonal courses on the sides; on Misery Hill a louvred mass overhangs the upper west part
# and a black triangular get-in opening the lower wall.
#
# Plan: the OSM footprint at half scale, run west to the Macken Street footpath (4.2 m more depth than the plain
# projection, where the 2 GCS strip along Macken Street would be) so the roof's rise is less compressed east-west.
# Heights stay real: glass tops 21.6-24 m, fascia 25.4-27.6 m, the NE prow 30.5 m, the back edge 34-40 m with the
# fly tower's peak at 43 m (photo estimates from refs 12, 16, 17 against the Marker's 28.7 m and 1 GCS's 23 m).
# =====================================================================================================================
T0, T1, T2, T4 = (614.8, 156.57), (657.5, 164.0), (650.6, 190.8), (614.8, 173.8)    # NW, NE, SE, SW (game)
fdir = norm((T2[0] - T1[0], T2[1] - T1[1], 0.0))
NF = (fdir[1], -fdir[0])                              # front outward normal (game x, z): east-ish
NF = (NF[0], NF[1]) if NF[0] > 0 else (-NF[0], -NF[1])
FA = (0.0, 0.36, 0.7, 1.0)                            # the pleats' folds along the foot, north to south
LEAN = (5.0, 3.2, 0.8, 0.2)                           # top of the glass: out from the ground line
H_GL = (24.0, 23.2, 22.2, 21.6)                       # glass top heights
CAN = (6.4, 5.6, 6.6, 7.6)                            # the canopy's front edge, out from the ground line
H_FB = (25.7, 24.8, 24.0, 23.6)                       # fascia bottom (the soffit rises outwards to it)
H_RF = (27.6, 26.6, 25.8, 25.4)                       # fascia top / roof edge
H_NW, H_SW, H_RB = 40.0, 34.0, 43.0                   # the back (west) edge: NW / SW corners, the fly tower's peak
RB = (614.8, 162.6)                                   # the peak, on the back edge (game)
NFP = len(FA)


def gp(p, off, h):
    """Game point p pushed `off` along the front normal, at height h -> Blender."""
    return G(p[0] + NF[0] * off, p[1] + NF[1] * off, h)


FP = [lerp(T1, T2, a) for a in FA]                                        # the foot's fold points (game)
gb = [G(*p) for p in FP]                                                  # glass foot
gt = [gp(FP[i], LEAN[i], H_GL[i]) for i in range(NFP)]                    # glass top
cb = [gp(FP[i], CAN[i], H_FB[i]) for i in range(NFP)]                     # canopy: fascia bottom edge
ct = [gp(FP[i], CAN[i], H_RF[i]) for i in range(NFP)]                     # fascia top / roof edge
fo = (NF[0], -NF[1], 0.0)                             # front normal in Blender
NN = (0.171, -0.985)                                  # north wall outward normal (game)
nno = (NN[0], -NN[1], 0.0)                            # ...in Blender
# the NE prow: the canopy's north end runs on past the north wall and rises to a point (ref 15)
prow_b = add(cb[0], (nno[0] * 3.4 + fo[0] * 0.8, nno[1] * 3.4 + fo[1] * 0.8, 0.9))
prow_t = add(ct[0], (nno[0] * 3.4 + fo[0] * 0.8, nno[1] * 3.4 + fo[1] * 0.8, 2.9))
for i in range(NFP - 1):
    # each pleat as two triangles, one mapping for both
    pl = kit.newell([gb[i], gb[i + 1], gt[i + 1], gt[i]])
    lobby.tiled([gb[i], gb[i + 1], gt[i + 1]], LTW, LTH, fo, plane=pl)
    lobby.tiled([gb[i], gt[i + 1], gt[i]], LTW, LTH, fo, plane=pl)
    # the soffit (white, rising outwards) and the fascia
    main.swatch('canopy', [gt[i], gt[i + 1], cb[i + 1]], (0, 0, -1)); main.swatch('canopy', [gt[i], cb[i + 1], cb[i]], (0, 0, -1))
    main.swatch('canopy', [cb[i], cb[i + 1], ct[i + 1]], fo); main.swatch('canopy', [cb[i], ct[i + 1], ct[i]], fo)
    # a dark steel edge along the fascia's top (the roof's gutter line, refs 08, 13)
    main.swatch('frame', [ct[i], ct[i + 1], add(ct[i + 1], (0, 0, 0.35)), add(ct[i], (0, 0, 0.35))], fo)
# the prow: its fascia, its white underside, and its back closed against the north wall
main.swatch('canopy', [cb[0], prow_b, prow_t, ct[0]], add(fo, mul(nno, 0.6)))
main.swatch('canopy', [gt[0], cb[0], prow_b], (0, 0, -1))
main.swatch('canopy', [gt[0], prow_b, prow_t], add(mul(nno, 1.0), mul(fo, -0.5)))
# the canopy runs on CAN_S past the glass's south corner, out over the paving at 21.6-25.4 m, so the front reads as
# wide as the real one does against the Marker (refs 08, 12); a white wedge hangs from its south end back down to the
# glass's south corner (refs 08, 14), 0.7 m thick
sd_ = (fdir[0], -fdir[1], 0.0)                        # south along the front, Blender
CAN_S = 3.6
ext = mul(sd_, CAN_S)
iT = (gt[-1][0], gt[-1][1], H_RF[-1])
gS, cbS, ctS, iTS = add(gt[-1], ext), add(cb[-1], ext), add(ct[-1], ext), add(iT, ext)
main.swatch('canopy', [cb[-1], cbS, ctS, ct[-1]], fo)
main.swatch('frame', [ct[-1], ctS, add(ctS, (0, 0, 0.35)), add(ct[-1], (0, 0, 0.35))], fo)
main.swatch('canopy', [gt[-1], gS, cbS, cb[-1]], (0, 0, -1))
clad.tiled([ct[-1], ctS, iTS, iT], CT, CT, (0, 0, 1))
main.swatch('canopy', [gS, cbS, ctS, iTS], sd_)
main.swatch('canopy', [gt[-1], gS, iTS, iT], mul(fo, -1))
w_lo = gp(FP[-1], 0.35, 12.5)
wf = [cbS, gS, w_lo]
wn_ = norm(kit.newell(wf))
if dot(wn_, sd_) < 0: wn_ = mul(wn_, -1)
wi = [add(p, mul(wn_, -0.7)) for p in wf]
main.swatch('canopy', wf, wn_)
main.swatch('canopy', wi, mul(wn_, -1))
main.swatch('canopy', [cbS, wi[0], wi[2], w_lo], add(fo, (0, 0, -0.8)))
main.swatch('canopy', [gS, w_lo, wi[2], wi[1]], mul(fo, -1))
# the name on the fascia over the north pleat (ref 08)
nb0, nb1 = lerp(cb[0], cb[1], 0.06), lerp(cb[0], cb[1], 0.94)
nt0, nt1 = lerp(ct[0], ct[1], 0.06), lerp(ct[0], ct[1], 0.94)
off = mul(fo, 0.04)
main.decal('name', [add(lerp(nb1, nt1, 0.2), off), add(lerp(nb0, nt0, 0.2), off), add(lerp(nb0, nt0, 0.8), off), add(lerp(nb1, nt1, 0.8), off)], fo)


def front_pt(a, t, out=0.0):
    """A point on the leaning glass: a 0..1 along the foot from north to south, t 0..1 up, pushed out."""
    i = 0
    while i < NFP - 2 and a > FA[i + 1]:
        i += 1
    k = (a - FA[i]) / (FA[i + 1] - FA[i])
    p = lerp(lerp(gb[i], gb[i + 1], k), lerp(gt[i], gt[i + 1], k), t)
    return add(p, mul(fo, out))


def strut(a0, t0, a1, t1, w=0.7, dep=0.45):
    """A white box-section member lying on the glass from (a0, t0) to (a1, t1), in pieces across the pleats."""
    cuts = [a0] + [f for f in FA[1:-1] if min(a0, a1) < f < max(a0, a1)][:: 1 if a1 > a0 else -1] + [a1]
    for j in range(len(cuts) - 1):
        ta = t0 + (t1 - t0) * (cuts[j] - a0) / ((a1 - a0) or 1)
        tb = t0 + (t1 - t0) * (cuts[j + 1] - a0) / ((a1 - a0) or 1)
        p, q = front_pt(cuts[j], ta, 0.05), front_pt(cuts[j + 1], tb, 0.05)
        d = norm(sub(q, p))
        side = norm(cross(d, fo))
        hw = mul(side, w / 2)
        o = mul(fo, dep)
        c = [sub(p, hw), add(p, hw), add(q, hw), sub(q, hw)]
        main.swatch('white', [add(x, o) for x in c], fo)
        main.swatch('white', [c[1], c[2], add(c[2], o), add(c[1], o)], side)
        main.swatch('white', [c[0], c[3], add(c[3], o), add(c[0], o)], mul(side, -1))


# the white V (apex low in the middle, ref 08) and the big diagonals rising north (ref 13), then the lesser lattice
for s in ((0.46, 0.0, 0.04, 1.0), (0.46, 0.0, 0.84, 1.0), (0.7, 0.0, 1.0, 0.66), (0.0, 0.3, 0.2, 1.0),
          (0.22, 0.0, 0.0, 0.24), (0.88, 0.0, 0.99, 0.22), (0.62, 0.0, 0.3, 1.0)):
    strut(*s, w=0.85, dep=0.5)
for s in ((0.1, 0.0, 0.36, 1.0), (0.3, 0.0, 0.6, 1.0), (0.56, 0.0, 0.72, 0.55), (0.76, 0.3, 0.96, 1.0), (1.0, 0.1, 0.8, 1.0)):
    strut(*s, w=0.34, dep=0.25)
# glazed doors along the foot of the front (dark bays in the glass)
for a in (0.3, 0.5, 0.74):
    p, q = front_pt(a - 0.05, 0.0, 0.06), front_pt(a + 0.05, 0.0, 0.06)
    main.decal('door', [p, q, add(q, (0, 0, 3.2)), add(p, (0, 0, 3.2))], fo)
mark('theatre front')

# the walls: north (Misery Hill), west (Macken Street), south (against 2 GCS); stainless cladding
nw0, nw1 = G(*T0), G(*T1)
sw0, sw1 = G(*T4), G(*T2)
RN, RS = (nw0[0], nw0[1], H_NW), (sw0[0], sw0[1], H_SW)
clad.tiled([nw0, nw1, gt[0], RN], CT, CT, nno)
clad.tiled([RN, gt[0], prow_t], CT, CT, add(nno, (0, 0, 0.2)))
sn = hnorm(G(*T4), G(*T2))
clad.tiled([sw1, sw0, RS, gt[-1]], CT, CT, sn)
clad.tiled([gt[-1], RS, ct[-1]], CT, CT, add(sn, (0, 0, 0.2)))
clad.tiled([gt[-1], ct[-1], cb[-1]], CT, CT, sn)
rbk = G(*RB)
RBt = (rbk[0], rbk[1], H_RB)
clad.tiled([nw0, sw0, RS, RBt, RN], CT, CT, (-1, 0, 0))
# the roof: folded planes from the fascia up to the back edge, the folds running from the pleats' tops to the peak
clad.tiled([ct[0], RBt, RN], CT, CT, (0, 0, 1)); clad.tiled([ct[0], ct[1], RBt], CT, CT, (0, 0, 1))
clad.tiled([ct[0], RN, prow_t], CT, CT, (0, 0, 1))
clad.tiled([ct[1], ct[2], RBt], CT, CT, (0, 0, 1))
clad.tiled([ct[2], ct[3], RS], CT, CT, (0, 0, 1)); clad.tiled([ct[2], RS, RBt], CT, CT, (0, 0, 1))
# strips of rooflight along the folds (refs 08, 12)
for a_, b_, f0, f1 in ((ct[1], RBt, 0.2, 0.62), (ct[2], RBt, 0.35, 0.7)):
    rl0, rl1 = lerp(a_, b_, f0), lerp(a_, b_, f1)
    rw = mul(norm(cross(sub(rl1, rl0), (0, 0, 1))), 0.8)
    main.swatch('dark', [add(sub(rl0, rw), (0, 0, 0.06)), add(add(rl0, rw), (0, 0, 0.06)), add(add(rl1, rw), (0, 0, 0.06)), add(sub(rl1, rw), (0, 0, 0.06))], (0, 0, 1))

# Misery Hill side: the louvred mass over the upper west part, overhanging the pavement by 1.6 m
nwd = norm(sub(nw1, nw0))
LV_LEN, LV_OUT = 27.0, 1.6
LN = math.dist(nw0[:2], gt[0][:2])
top_h = lambda s: H_NW + (H_GL[0] - H_NW) * s / LN
bot_h = lambda s: 17.0 + 0.28 * s
WP = lambda s, d, h: (nw0[0] + nwd[0] * s + nno[0] * d, nw0[1] + nwd[1] * s + nno[1] * d, h)
main.swatch('louvreback', [WP(0, 0.15, bot_h(0)), WP(LV_LEN, 0.15, bot_h(LV_LEN)), WP(LV_LEN, 0.15, top_h(LV_LEN)), WP(0, 0.15, top_h(0))], nno)
main.swatch('soffit', [WP(0, 0, bot_h(0)), WP(LV_LEN, 0, bot_h(LV_LEN)), WP(LV_LEN, LV_OUT, bot_h(LV_LEN)), WP(0, LV_OUT, bot_h(0))], (0, 0, -1))
main.swatch('steel', [WP(LV_LEN, 0, bot_h(LV_LEN)), WP(LV_LEN, LV_OUT, bot_h(LV_LEN)), WP(LV_LEN, LV_OUT, top_h(LV_LEN)), WP(LV_LEN, 0, top_h(LV_LEN))], nwd)
h = bot_h(0) + 0.3
while h < top_h(0) - 0.2:
    # the slat runs from the west end to where the sloping bottom edge or the falling top edge cuts it
    s1 = min(LV_LEN, (h - 17.0) / 0.28, (H_NW - h - 0.12) * LN / (H_NW - H_GL[0]))
    if s1 > 0.5:
        main.swatch('steel', [WP(0, LV_OUT, h), WP(s1, LV_OUT, h), WP(s1, LV_OUT, h + 0.12), WP(0, LV_OUT, h + 0.12)], nno)
        main.swatch('steel', [WP(0, 0.15, h + 0.12), WP(s1, 0.15, h + 0.12), WP(s1, LV_OUT, h + 0.12), WP(0, LV_OUT, h + 0.12)], (0, 0, 1))
        main.swatch('steel', [WP(0, 0.15, h), WP(s1, 0.15, h), WP(s1, LV_OUT, h), WP(0, LV_OUT, h)], (0, 0, -1))
    h += 0.6
# the west end of the louvred mass (on Macken Street) and its slats' ends
main.swatch('steel', [WP(0, 0, bot_h(0)), WP(0, LV_OUT, bot_h(0)), WP(0, LV_OUT, top_h(0)), WP(0, 0, top_h(0))], mul(nwd, -1))
# the get-in: a black triangular opening in the lower wall, with a steel edge
tri_s0, tri_s1, tri_h = 22.2, 34.7, 12.0
main.swatch('void', [WP(tri_s0, 0.04, 0.0), WP(tri_s1, 0.04, 0.0), WP(tri_s1, 0.04, tri_h)], nno)
hyp = norm(sub(WP(tri_s1, 0, tri_h), WP(tri_s0, 0, 0)))
e_up = mul(norm(cross(nno, hyp)), 0.35)
if e_up[2] < 0: e_up = mul(e_up, -1)
main.swatch('steel', [WP(tri_s0, 0.08, 0.0), WP(tri_s1, 0.08, tri_h), add(WP(tri_s1, 0.08, tri_h), e_up), add(WP(tri_s0, 0.08, 0.0), e_up)], nno)
main.swatch('steel', [WP(tri_s1, 0.08, 0.0), WP(tri_s1 + 0.35, 0.08, 0.0), WP(tri_s1 + 0.35, 0.08, tri_h + 0.4), WP(tri_s1, 0.08, tri_h + 0.4)], nno)
# a stage door and the theatre's name board on Macken Street (the west wall)
wn = (-1.0, 0.0, 0.0)
WX = T0[0] - 0.05
main.decal('door', [G(WX, 168.0, 0), G(WX, 170.5, 0), G(WX, 170.5, 3.4), G(WX, 168.0, 3.4)], wn)
main.decal('name', [G(WX - 0.05, 160.5, 5.4), G(WX - 0.05, 170.0, 5.4), G(WX - 0.05, 170.0, 6.3), G(WX - 0.05, 160.5, 6.3)], wn)
mark('theatre')

# the stainless-mesh wedge on the square at the theatre's NE corner (the car park stair, ref 09)
WG = [G(660.2, 166.8), G(667.5, 168.0), G(666.4, 173.4), G(659.6, 171.6)]
WH = [3.6, 2.2, 2.6, 3.9]
for i in range(4):
    a, b = WG[i], WG[(i + 1) % 4]
    n = hnorm(a, b)
    ccw = sum(WG[j][0] * WG[(j + 1) % 4][1] - WG[(j + 1) % 4][0] * WG[j][1] for j in range(4)) > 0
    if not ccw: n = mul(n, -1)
    main.face([(a[0], a[1], 0), (b[0], b[1], 0), (b[0], b[1], WH[(i + 1) % 4]), (a[0], a[1], WH[i])],
              [tc('mesh', 0, 1), tc('mesh', 1, 1), tc('mesh', 1, 1 - WH[(i + 1) % 4] / 4), tc('mesh', 0, 1 - WH[i] / 4)], n)
main.face([(p[0], p[1], WH[i]) for i, p in enumerate(WG)], [tc('mesh', 0.5, 0.5)] * 4, (0, 0, 1))
mark('wedge')

# =====================================================================================================================
# 4-5 GRAND CANAL SQUARE (the north block): eight floors of glass across Misery Hill from the theatre. The upper floors
# lean out and fold into a faceted prow over the south-west corner, cantilevered over a recessed two-storey glazed
# base, an entrance notch with granite steps, and a granite plinth along the street. A grey glass stair blade near
# Hibernian Road.
# =====================================================================================================================
N_SW8, N_SE, N_NE, N_NW = (621.0, 139.0), (641.5, 146.4), (644.0, 100.0), (621.8, 89.6)    # the upper floors at 8 m
N_SWT = (617.0, 142.6)                                # ...and the prow's top corner: the facade leans out 4.8 m
H_B, H_N = 8.0, 32.6
N_P1, N_P2, N_P3 = (634.0, 143.7), (627.0, 135.5), (621.05, 136.0)                         # the entrance notch
u8 = [G(*N_SW8), G(*N_SE), G(*N_NE), G(*N_NW)]
ut = [G(*N_SWT), G(*N_SE), G(*N_NE), G(*N_NW)]
# upper walls: south and west warp (their SW corner moves out going up), east and north are plumb
for i in range(4):
    a8, b8 = u8[i], u8[(i + 1) % 4]
    at_, bt = ut[i], ut[(i + 1) % 4]
    q = [(a8[0], a8[1], H_B), (b8[0], b8[1], H_B), (bt[0], bt[1], H_N), (at_[0], at_[1], H_N)]
    pl = kit.newell(q)
    n = hnorm(a8, b8)
    if pl[0] * n[0] + pl[1] * n[1] < 0: pl = mul(pl, -1)
    glass.tiled([q[0], q[1], q[2]], GTW, GTH, pl, plane=pl)
    glass.tiled([q[0], q[2], q[3]], GTW, GTH, pl, plane=pl)
main.swatch('roof', [(p[0], p[1], H_N) for p in ut], (0, 0, 1))
# parapet cap and a plant room
for i in range(4):
    a, b = ut[i], ut[(i + 1) % 4]
    n = hnorm(a, b)
    main.swatch('frame', [(a[0], a[1], H_N), (b[0], b[1], H_N), (b[0] - n[0] * 0.5, b[1] - n[1] * 0.5, H_N + 0.9), (a[0] - n[0] * 0.5, a[1] - n[1] * 0.5, H_N + 0.9)], add(n, (0, 0, 0.5)))
    main.swatch('frame', [(a[0] - n[0] * 0.5, a[1] - n[1] * 0.5, H_N + 0.9), (b[0] - n[0] * 0.5, b[1] - n[1] * 0.5, H_N + 0.9), (b[0] - n[0] * 0.8, b[1] - n[1] * 0.8, H_N), (a[0] - n[0] * 0.8, a[1] - n[1] * 0.8, H_N)], add(mul(n, -1), (0, 0, 0.5)))
prism(main, 'roof', [G(627, 112)[:2], G(638, 114)[:2], G(637, 126)[:2], G(626, 124)[:2]], H_N, H_N + 3.2)
# the base: two storeys of glazing on the outline less the notch, in 3 m panels
base = [G(*N_SE), G(*N_NE), G(*N_NW), G(*N_P3), G(*N_P2), G(*N_P1)]     # anticlockwise in Blender
for i in range(len(base)):
    a, b = base[i], base[(i + 1) % len(base)]
    L = math.dist(a[:2], b[:2])
    k = max(1, round(L / 3.2))
    n = hnorm(a, b)
    for j in range(k):
        p, q = lerp(a, b, j / k), lerp(a, b, (j + 1) / k)
        main.decal('base', [(p[0], p[1], 0.0), (q[0], q[1], 0.0), (q[0], q[1], H_B), (p[0], p[1], H_B)], n)
# the floor plate over the notch (the dark soffit with downlights) and the slab edge round the base
main.swatch('soffit', [(p[0], p[1], H_B) for p in (G(*N_SW8), G(*N_P1), G(*N_P2), G(*N_P3))], (0, 0, -1))
for i in range(4):
    a, b = u8[i], u8[(i + 1) % 4]
    n = hnorm(a, b)
    main.swatch('frame', [(a[0], a[1], H_B - 0.5), (b[0], b[1], H_B - 0.5), (b[0], b[1], H_B), (a[0], a[1], H_B)], n)
# granite: the platform in the notch, two steps down to the street, a plinth along Misery Hill
prism(main, 'granite', [G(*N_SW8)[:2], G(*N_P1)[:2], G(*N_P2)[:2], G(*N_P3)[:2]], 0.0, 0.6)
sd = hnorm(G(*N_SW8), G(*N_P1))
for k, (dd, hh) in enumerate(((0.45, 0.4), (0.9, 0.2))):
    a, b = G(*N_SW8), G(*N_P1)
    prism(main, 'granite', [a[:2], b[:2], (b[0] + sd[0] * dd, b[1] + sd[1] * dd), (a[0] + sd[0] * dd, a[1] + sd[1] * dd)], 0.0, hh)
a, b = G(*N_P1), G(*N_SE)
prism(main, 'granite', [a[:2], b[:2], (b[0] + sd[0] * 0.35, b[1] + sd[1] * 0.35), (a[0] + sd[0] * 0.35, a[1] + sd[1] * 0.35)], 0.0, 0.9)
a, b = G(*N_NW), G(*N_P3)
wd = hnorm(a, b)
prism(main, 'granite', [a[:2], b[:2], (b[0] + wd[0] * 0.35, b[1] + wd[1] * 0.35), (a[0] + wd[0] * 0.35, a[1] + wd[1] * 0.35)], 0.0, 0.7)
# the stair blade: grey glass, standing proud of the Misery Hill face near Hibernian Road
bl0, bl1 = lerp(G(*N_SW8), G(*N_SE), 0.72), lerp(G(*N_SW8), G(*N_SE), 0.84)
prism(main, 'greyglass', [bl0[:2], bl1[:2], (bl1[0] + sd[0] * 1.1, bl1[1] + sd[1] * 1.1), (bl0[0] + sd[0] * 1.1, bl0[1] + sd[1] * 1.1)], H_B - 0.5, H_N + 1.6)
# the office sign by the entrance
nsd = mul(sd, 1.0)
s0p, s1p = lerp(G(*N_P1), G(*N_SE), 0.15), lerp(G(*N_P1), G(*N_SE), 0.55)
main.decal('gcsign', [(s0p[0] + sd[0] * 0.38, s0p[1] + sd[1] * 0.38, 0.95), (s1p[0] + sd[0] * 0.38, s1p[1] + sd[1] * 0.38, 0.95),
                      (s1p[0] + sd[0] * 0.38, s1p[1] + sd[1] * 0.38, 1.55), (s0p[0] + sd[0] * 0.38, s0p[1] + sd[1] * 0.38, 1.55)], sd)
mark('4-5 GCS')

# =====================================================================================================================
# 2 GRAND CANAL SQUARE (the south block): eight floors of glass behind the theatre, on Macken Street; its east face leans
# out towards the square at the top and the roof slopes up to the north-east corner.
# =====================================================================================================================
S_NW, S_NE, S_SE, S_SW = (614.0, 173.8), (642.0, 185.9), (640.5, 210.5), (612.5, 207.5)
S_NET = (643.6, 186.6)
HS = {S_NW: 30.0, S_NE: 33.0, S_SE: 29.0, S_SW: 29.0}
HB2 = 5.2
s8 = [G(*S_NW), G(*S_SW), G(*S_SE), G(*S_NE)]      # anticlockwise in Blender (north is +Y)
st = [G(*S_NW, HS[S_NW]), G(*S_SW, HS[S_SW]), G(*S_SE, HS[S_SE]), G(*S_NET, HS[S_NE])]
for i in range(4):
    a, b = s8[i], s8[(i + 1) % 4]
    q = [(a[0], a[1], HB2), (b[0], b[1], HB2), st[(i + 1) % 4], st[i]]
    n = hnorm(a, b)
    pl = kit.newell(q)
    if pl[0] * n[0] + pl[1] * n[1] < 0: pl = mul(pl, -1)
    glass.tiled([q[0], q[1], q[2]], GTW, GTH, pl, plane=pl)
    glass.tiled([q[0], q[2], q[3]], GTW, GTH, pl, plane=pl)
    L = math.dist(a[:2], b[:2])
    k = max(1, round(L / 3.2))
    for j in range(k):
        p, r = lerp(a, b, j / k), lerp(a, b, (j + 1) / k)
        main.decal('base', [(p[0], p[1], 0.0), (r[0], r[1], 0.0), (r[0], r[1], HB2), (p[0], p[1], HB2)], n)
    main.swatch('frame', [(a[0], a[1], HB2 - 0.4), (b[0], b[1], HB2 - 0.4), (b[0], b[1], HB2), (a[0], a[1], HB2)], n)
main.swatch('roof', [st[0], st[1], st[2]], (0, 0, 1))
main.swatch('roof', [st[0], st[2], st[3]], (0, 0, 1))
prism(main, 'roof', [G(620, 190)[:2], G(632, 194)[:2], G(631, 202)[:2], G(619, 199)[:2]], 27.0, 32.5, top=True)
mark('2 GCS')

# =====================================================================================================================
# 1 GRAND CANAL SQUARE (DMOD, 2006): an all-glass box of five office floors round an atrium over ground-floor shops, on
# the square's south side, its north face angled to the square.
# =====================================================================================================================
O_NW, O_NE, O_SE, O_SW = (649.4, 195.6), (676.8, 208.1), (674.3, 227.0), (645.8, 223.3)
HB1, HT1 = 5.0, 23.2
o8 = [G(*O_NW), G(*O_SW), G(*O_SE), G(*O_NE)]      # anticlockwise in Blender
for i in range(4):
    a, b = o8[i], o8[(i + 1) % 4]
    n = hnorm(a, b)
    glass.tiled([(a[0], a[1], HB1), (b[0], b[1], HB1), (b[0], b[1], HT1), (a[0], a[1], HT1)], GTW, GTH, n)
    L = math.dist(a[:2], b[:2])
    k = max(1, round(L / 3.2))
    for j in range(k):
        p, r = lerp(a, b, j / k), lerp(a, b, (j + 1) / k)
        main.decal('base', [(p[0], p[1], 0.0), (r[0], r[1], 0.0), (r[0], r[1], HB1), (p[0], p[1], HB1)], n, crop=(0, 1, 0.35, 1))
    # a slab edge over the shops and a thin white roof edge
    main.swatch('frame', [(a[0], a[1], HB1 - 0.45), (b[0], b[1], HB1 - 0.45), (b[0], b[1], HB1), (a[0], a[1], HB1)], n)
    main.swatch('white', [(a[0], a[1], HT1), (b[0], b[1], HT1), (b[0], b[1], HT1 + 0.7), (a[0], a[1], HT1 + 0.7)], n)
main.swatch('roof', [(p[0], p[1], HT1 + 0.7) for p in o8], (0, 0, 1))
oc = lerp(lerp(o8[0], o8[2], 0.5), o8[0], 0.0)
prism(main, 'greyglass', [(oc[0] + dx, oc[1] + dy) for dx, dy in ((-8, -5), (8, -5), (8, 5), (-8, 5))], HT1 + 0.7, HT1 + 2.4)   # the atrium rooflight
mark('1 GCS')

# ------------------------------------------------------------------ finish
objs = [glass.build(MAT['gcs_glass']), lobby.build(MAT['gcs_lobby']), clad.build(MAT['gcs_clad']), main.build(MAT['gcs_main'])]
print('TRIANGLES before AO', kit.tris(objs))
# ambient occlusion in the vertex colours of the opaque parts (the Marker's reveals and soffit above all)
kit.bake_ao_vertex(objs, distance=2.0, samples=24, cell=3.2, passes=1, skip=[o for o in objs if o.name in ('gcs_glass', 'gcs_lobby')])
root = bpy.data.objects.new('gcsquare', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs), {o.name: kit.tris([o]) for o in objs})
kit.export(os.path.join(OUT, 'gcsquare.glb'), os.path.join(SRC, 'gcsquare.blend'))
print('DONE')

"""Aviva Stadium (Populous with Scott Tallon Walker, Buro Happold, 2010): the continuous louvred "wave" skin, the
white horseshoe truss standing proud over the low north end, the bowl, and a far LOD.

Run headless:  blender -b --factory-startup -P tools/blender/build_aviva.py -- public/models models

Sources: docs/research/aviva.md. The plan is the polar outline of the OSM footprint (R: outer ring, r: roof opening,
every 15 degrees, theta clockwise from the north end), the rim is the photo-fitted height table of 3.2 (47.65 m peak,
~15 m at the north end). Built at real size with the origin at the pitch centre on the ground, +Y towards the north end
and +X towards the Dodder (east) side, then scaled 0.6 across, 0.55 along the axis and 0.8 in height.

Two root nodes: `aviva` (near, ~12k triangles) and `aviva_far` (~2k, beyond ~350 m; three.js LOD in heroes.js).
Materials (painted and set up at load in src/world/heroes.js):
  av_plinth   render plinth with glazed entrance bays        av_core    the concourse floors seen through the skin
  av_louvre   translucent polycarbonate louvre courses       av_roof    radial corrugated roof sheets
  av_truss    white leading-edge truss chords, its two north columns and the roof rafters
  av_web      the truss web (alpha card)                     av_flood   floodlight banks
  av_seat     seat rakes                                     av_fascia  yellow tier-front band with the boxes
  av_pitch    the pitch                                      av_sign    AVIVA STADIUM letters and the AVIVA seat letters
  av_glow     additive haze cone over the bowl at night      av_farfacade  far LOD facade (core + louvres in one)
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
TAU = math.tau

bpy.ops.wm.read_factory_settings(use_empty=True)

# ------------------------------------------------------------------ profiles (degrees, clockwise from north)
R_T = [80, 83, 91, 102, 106, 105, 105, 108, 113, 117, 115, 111, 108, 111, 117, 118, 113, 110, 108, 108, 108, 104, 91, 83]
r_T = [70, 71, 69, 59, 53, 49, 48, 50, 55, 63, 69, 70, 69, 70, 68, 62, 54, 49, 48, 49, 53, 61, 70, 71]
H_HALF = [(0, 15), (20, 17), (40, 24), (60, 34), (90, 42), (120, 46), (145, 47.6), (165, 45), (180, 43)]
HLE_HALF = [(0, 14), (20, 15), (40, 20), (60, 28), (90, 34), (120, 37), (145, 38), (165, 37), (180, 36)]


def mirror(half):
    return half + [(360 - d, v) for d, v in reversed(half[1:-1])]


def periodic(knots):
    """Cubic Hermite through (deg, value) knots on a circle, finite-difference tangents (smooth, no overshoot to speak of)."""
    n = len(knots)
    xs = [k[0] for k in knots]; ys = [k[1] for k in knots]

    def X(i):
        return xs[i % n] + 360 * (i // n)

    def tan(i):
        return (ys[(i + 1) % n] - ys[(i - 1) % n]) / (X(i + 1) - X(i - 1))

    def f(deg):
        d = deg % 360
        i = max(k for k in range(n) if xs[k] <= d)
        x0, x1 = X(i), X(i + 1)
        h = x1 - x0; t = (d - x0) / h
        y0, y1 = ys[i], ys[(i + 1) % n]
        m0, m1 = tan(i) * h, tan(i + 1) * h
        t2, t3 = t * t, t * t * t
        return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1
    return f


R = periodic([(i * 15, v) for i, v in enumerate(R_T)])
r = periodic([(i * 15, v) for i, v in enumerate(r_T)])
H = periodic(mirror(H_HALF))
HLE = periodic(mirror(HLE_HALF))


def sym(deg):
    """0 at the north end, 180 at the south end (either side)."""
    d = deg % 360
    return d if d <= 180 else 360 - d


def smooth(e0, e1, x):
    t = min(1, max(0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def truss_top(deg):
    """The leading-edge truss follows the roof edge round the sides, and over the low north end it stays up as a free
    arch (~26 m) instead of dropping with the small north roof."""
    s = sym(deg)
    arch = 28.0 + (HLE(76) + 0.6 - 28.0) * (s / 76) ** 2
    return max(HLE(deg) + 0.6, arch if s < 76 else 0)


def truss_depth(deg):
    return 3.4 + 7.0 * max(0.0, 1 - sym(deg) / 80) ** 1.3


def pitch_edge(deg):
    a = math.radians(deg); s, c = abs(math.sin(a)), abs(math.cos(a))
    return 1 / ((s / 43.0) ** 4 + (c / 66.0) ** 4) ** 0.25


def P(deg, rho, z):
    a = math.radians(deg)
    return (rho * math.sin(a), rho * math.cos(a), z)


def facade_rows(deg):
    """(rho, z) up the facade: plinth top, bulge out to R at 0.55 H, roll in over the shoulder."""
    Rv, Hv = R(deg), H(deg)
    zb = 0.55 * Hv
    return [(Rv - 3.0, 5.0), (Rv - 1.1, 5.0 + 0.5 * (zb - 5.0)), (Rv, zb), (Rv - 0.7, 0.78 * Hv), (Rv - 2.2, 0.92 * Hv)]


def roof_rows(deg, ts=(0.0, 0.12, 0.35, 0.6, 0.82, 1.0)):
    Rv, Hv, rv, hl = R(deg), H(deg), r(deg), HLE(deg)
    rows = [(Rv - 2.2, 0.92 * Hv)]
    for t in ts:
        rho = (Rv - 4.0) + ((rv + 1.0) - (Rv - 4.0)) * t
        z = Hv - (Hv - hl) * (t ** 1.15)
        rows.append((rho, z))
    return rows


def rho_at(rows, z):
    for (r0, z0), (r1, z1) in zip(rows, rows[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return rows[-1][0]


# ------------------------------------------------------------------ mesh builder with shared vertices (smooth lofts)
class Mesh:
    def __init__(self, name):
        self.name, self.v, self.f, self.uv, self.col, self.smooth = name, [], [], [], [], []

    def vert(self, p):
        self.v.append(tuple(p)); return len(self.v) - 1

    def face(self, idx, uvs, cols=None, smooth=False):
        self.f.append(tuple(idx)); self.uv.append(uvs); self.col.append(cols or [(1, 1, 1)] * len(idx)); self.smooth.append(smooth)

    def quad(self, a, b, c, d, uvs=((0, 0), (1, 0), (1, 1), (0, 1)), cols=None, smooth=False):
        self.face([self.vert(a), self.vert(b), self.vert(c), self.vert(d)], uvs, cols, smooth)

    def grid(self, rings, uvf, colf=None, closed=True, smooth=True, flip=False):
        """rings[j][i]: point i (around) on row j (bottom up). Faces face outward when rows rise and i runs clockwise
        seen from above (theta increasing)."""
        nr, n = len(rings), len(rings[0])
        ids = [[self.vert(p) for p in ring] for ring in rings]
        segs = n if closed else n - 1
        for j in range(nr - 1):
            for i in range(segs):
                i1 = (i + 1) % n
                q = [(ids[j][i], i, j), (ids[j][i1], i + 1, j), (ids[j + 1][i1], i + 1, j + 1), (ids[j + 1][i], i, j + 1)]
                if flip:
                    q = q[::-1]
                self.face([a for a, _, _ in q], [uvf(ii, jj) for _, ii, jj in q], [colf(ii, jj) for _, ii, jj in q] if colf else None, smooth)

    def build(self, material, vertex_colors=False):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        uvl = me.uv_layers.new(name='UVMap')
        flat_uv = [c for uvs in self.uv for p in uvs for c in p]
        uvl.data.foreach_set('uv', flat_uv)
        if vertex_colors:
            ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
            ca.data.foreach_set('color', [c for cols in self.col for p in cols for c in (*p, 1.0)])
            me.color_attributes.active_color = ca
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


# ------------------------------------------------------------------ the stadium at a given resolution
def degs(n):
    return [i * 360 / n for i in range(n)]


def build(N, far=False):
    tag = '_far' if far else ''
    objs = []
    D = degs(N)
    arc = lambda deg, rho: math.radians(deg) * rho  # arc length along the ring

    # plinth: vertical render wall 0-5 m, set 3 m in under the bulge
    m = Mesh('plinth' + tag)
    rings = [[P(d, R(d) - 3.0, z) for d in D] for z in (0.0, 5.0)]
    m.grid(rings, lambda i, j: (math.radians(i * 360 / N) * 105 / 12.0, j), flip=True)
    objs.append(m.build(mat('av_plinth')))

    # facade band (the concourse behind the louvres); v by height (one floor = 4.5 m), u by arc (one bay = 8 m)
    rowsF = [facade_rows(d) for d in D]
    if far:
        rowsF = [[rr[0], rr[2], rr[4]] for rr in rowsF]
    m = Mesh('facade' + tag)
    rings = [[P(D[i], rowsF[i][j][0], rowsF[i][j][1]) for i in range(N)] for j in range(len(rowsF[0]))]
    def fuv(i, j):
        k = i % N
        return (math.radians(i * 360 / N) * 108 / 8.0, rowsF[k][j][1] / (4.5 if not far else 1.0))
    if far:
        # far facade: v runs 0 (plinth top) to 1 (shoulder) so its baked texture holds the whole band
        fuv = lambda i, j: (math.radians(i * 360 / N) * 108 / 16.0, j / (len(rowsF[0]) - 1))
    m.grid(rings, fuv, flip=True)
    objs.append(m.build(mat('av_farfacade' if far else 'av_core')))

    # roof: shoulder to the leading edge; u = angle (the sheets run radially), v = slope distance / 6 m
    rowsR = [roof_rows(d) if not far else roof_rows(d, (0.0, 0.5, 1.0)) for d in D]
    m = Mesh('roof' + tag)
    rings = [[P(D[i], rowsR[i][j][0], rowsR[i][j][1]) for i in range(N)] for j in range(len(rowsR[0]))]
    slope = []
    for rr in rowsR:
        acc = [0.0]
        for (a0, b0), (a1, b1) in zip(rr, rr[1:]):
            acc.append(acc[-1] + math.hypot(a1 - a0, b1 - b0))
        slope.append(acc)
    m.grid(rings, lambda i, j: (i * 96 / N, slope[i % N][j] / 6.0), flip=True)
    objs.append(m.build(mat('av_roof')))

    # the leading-edge truss
    TT = [truss_top(d) for d in D]
    TD = [truss_depth(d) for d in D]
    top = [P(D[i], r(D[i]) + 0.3, TT[i]) for i in range(N)]
    bot = [P(D[i], r(D[i]) + 1.3, TT[i] - TD[i]) for i in range(N)]
    # web card: one W panel per segment (per two on the far LOD)
    m = Mesh('web' + tag)
    per = 1 if not far else 2
    m.grid([bot, top], lambda i, j: (i / per, j), smooth=False)
    objs.append(m.build(mat('av_web')))
    if not far:
        # chords: square tubes, flat shaded
        m = Mesh('truss')
        for path, rad in ((top, 0.85), (bot, 0.7)):
            rings = []
            for k, (d, p) in enumerate(zip(D, path)):
                a = math.radians(d); ox, oy = math.sin(a), math.cos(a)
                rings.append([(p[0] + ox * dx, p[1] + oy * dx, p[2] + dz) for dx, dz in ((-rad, -rad), (rad, -rad), (rad, rad), (-rad, rad))])
            ids = [[m.vert(q) for q in ring] for ring in rings]
            for i in range(N):
                i1 = (i + 1) % N
                for s in range(4):
                    s1 = (s + 1) % 4
                    m.face([ids[i][s], ids[i1][s], ids[i1][s1], ids[i][s1]][::-1], [(0, 0), (1, 0), (1, 1), (0, 1)])
        # two tapered concrete-clad columns carry the arch at the north end
        for d in (35.0, 325.0):
            k = int(round(d / 360 * N)) % N
            bx, by, bz = bot[k]
            sides = 8
            ring0 = [(bx + math.cos(s * TAU / sides) * 2.2, by + math.sin(s * TAU / sides) * 2.2, 0.0) for s in range(sides)]
            ring1 = [(bx + math.cos(s * TAU / sides) * 1.0, by + math.sin(s * TAU / sides) * 1.0, bz) for s in range(sides)]
            for s in range(sides):
                s1 = (s + 1) % sides
                m.face([m.vert(ring0[s]), m.vert(ring0[s1]), m.vert(ring1[s1]), m.vert(ring1[s])], [(0, 0), (1, 0), (1, 1), (0, 1)])
        truss = m  # the roof rafters join it below: one white-steel mesh, one draw

        # floodlight banks hung under the bottom chord round the sides and the south
        m = Mesh('flood')
        for i in range(0, N, 2):
            d = D[i]
            if sym(d) < 45:
                continue
            a = math.radians(d); ox, oy = math.sin(a), math.cos(a); tx, ty = math.cos(a), -math.sin(a)
            bx, by, bz = bot[i]
            w, h = 1.6, 0.9
            c = (bx - ox * 0.6, by - oy * 0.6, bz - 0.6)
            # tilted to face down into the bowl
            p0 = (c[0] - tx * w - ox * h * 0.5, c[1] - ty * w - oy * h * 0.5, c[2] - h * 0.5)
            p1 = (c[0] + tx * w - ox * h * 0.5, c[1] + ty * w - oy * h * 0.5, c[2] - h * 0.5)
            p2 = (c[0] + tx * w + ox * h * 0.5, c[1] + ty * w + oy * h * 0.5, c[2] + h * 0.5)
            p3 = (c[0] - tx * w + ox * h * 0.5, c[1] - ty * w + oy * h * 0.5, c[2] + h * 0.5)
            m.quad(p0, p1, p2, p3)
        objs.append(m.build(mat('av_flood')))

        # louvre courses: 8 overlapping shingle bands on the facade, each kicked out at its lower edge
        m = Mesh('louvre')
        NC = 8
        for c in range(NC):
            lo, hi = [], []
            for i, d in enumerate(D):
                rows = rowsF[i]
                z0, z1 = rows[0][1], rows[-1][1]
                za = z0 + (z1 - z0) * c / NC - 0.25 * (z1 - z0) / NC * (c > 0)
                zb = z0 + (z1 - z0) * (c + 1) / NC
                lo.append(P(d, rho_at(rows, za) + 0.75, za))
                hi.append(P(d, rho_at(rows, zb) + 0.3, zb))
            rings = [lo, hi]
            m.grid(rings, lambda i, j, rings=rings: (math.radians(i * 360 / N) * 108 / 3.0, rings[j][i % N][2] / 1.4), flip=True)
        objs.append(m.build(mat('av_louvre')))

        # rafters: raised strips from the shoulder to the leading edge (same white steel as the truss)
        m = truss
        NR = 48
        for k in range(NR):
            d = k * 360 / NR
            rr = roof_rows(d)[2:]  # from just inside the shoulder, so they don't stand proud of the silhouette
            a = math.radians(d); tx, ty = math.cos(a), -math.sin(a)
            w, h = 0.45, 0.4
            pts = [P(d, rho, z) for rho, z in rr]
            for p, q in zip(pts, pts[1:]):
                L = [(p[0] - tx * w, p[1] - ty * w, p[2]), (p[0] + tx * w, p[1] + ty * w, p[2])]
                Q = [(q[0] - tx * w, q[1] - ty * w, q[2]), (q[0] + tx * w, q[1] + ty * w, q[2])]
                up = lambda v: (v[0], v[1], v[2] + h)
                m.quad(L[0], Q[0], up(Q[0]), up(L[0]))
                m.quad(Q[1], L[1], up(L[1]), up(Q[1]))
                m.quad(up(L[0]), up(Q[0]), up(Q[1]), up(L[1]))
        objs.append(m.build(mat('av_truss')))

    # the bowl: lower tier, fascia (with the boxes), upper tier; vertex colour darkens the seats under the roof
    rowsB = []
    for d in D:
        pe, Rv, Hv = pitch_edge(d), R(d), H(d)
        b = Rv - 8.0
        s0 = (pe + 2.0, 1.0)
        L1 = 0.42 * (b - s0[0])
        s1 = (s0[0] + L1, 1.0 + 0.55 * L1)
        fas = 3.2 * smooth(25, 55, sym(d))
        s2 = (s1[0] + 0.3, s1[1] + fas)
        hb = min(0.78 * Hv, s2[1] + 0.62 * (b - s2[0]))
        rowsB.append([s0, s1, s2, (b, max(hb, s2[1] + 0.5))])
    shade = lambda i, j: (lambda k: (lambda t: (t, t, t))(1.0 - 0.55 * smooth(0, 1, (rowsB[k][j][0] - r(D[k])) / max(4.0, rowsB[k][3][0] - r(D[k])))))(i % N)
    m = Mesh('seat' + tag)
    for j0 in ((0, 2) if not far else (0,)):
        rings = [[P(D[i], rowsB[i][j][0], rowsB[i][j][1]) for i in range(N)] for j in ((j0, j0 + 1) if not far else (0, 3))]
        jj = (j0, j0 + 1) if not far else (0, 3)
        m.grid(rings, lambda i, j, jj=jj: (i * 40 / N, math.hypot(rowsB[i % N][jj[j]][0] - rowsB[i % N][jj[0]][0], rowsB[i % N][jj[j]][1] - rowsB[i % N][jj[0]][1]) / 6.4),
               colf=lambda i, j, jj=jj: shade(i, jj[j]), smooth=False)
    objs.append(m.build(mat('av_seat'), vertex_colors=True))
    if not far:
        m = Mesh('fascia')
        rings = [[P(D[i], rowsB[i][j][0], rowsB[i][j][1]) for i in range(N)] for j in (1, 2)]
        m.grid(rings, lambda i, j: (i * 40 / N, j), smooth=False)
        objs.append(m.build(mat('av_fascia')))

    # pitch (a fan out to the seats) - UVs map the 90 x 136 m texture over the playing area and run-off
    m = Mesh('pitch' + tag)
    ctr = m.vert((0, 0, 0.3))
    ring = [m.vert(P(d, rowsB[i][0][0] + 0.5, 0.3)) for i, d in enumerate(D)]
    for i in range(N):
        a, b = ring[i], ring[(i + 1) % N]
        pa, pb = m.v[a], m.v[b]
        m.face([ctr, b, a], [(0.5, 0.5), (0.5 + pb[0] / 90, 0.5 + pb[1] / 136), (0.5 + pa[0] / 90, 0.5 + pa[1] / 136)])
    objs.append(m.build(mat('av_pitch')))

    # signage: AVIVA STADIUM on the SE and SW faces (sign atlas top half), AVIVA in white seats on the south lower tier
    m = Mesh('sign' + tag)
    for dc in (123.0, 237.0):
        span = 46.0 / R(dc)  # radians of arc for ~46 m of lettering
        n = 8
        zc = 0.62 * H(dc)
        for k in range(n):
            d0 = dc + math.degrees(span * (k / n - 0.5)); d1 = dc + math.degrees(span * ((k + 1) / n - 0.5))
            q = []
            for d, z in ((d0, zc - 2.6), (d1, zc - 2.6), (d1, zc + 2.6), (d0, zc + 2.6)):
                q.append(P(d, rho_at(facade_rows(d), z) + (1.3 if not far else 0.9), z))
            u0, u1 = 1 - k / n, 1 - (k + 1) / n  # text reads left to right from outside (theta runs right to left)
            m.quad(q[1], q[0], q[3], q[2], [(u1, 0.5), (u0, 0.5), (u0, 1.0), (u1, 1.0)])
    if not far:
        # AVIVA seat letters, lying on the south lower tier and read from the north end
        i0 = int(round(180 / 360 * N))
        (sa, za), (sb, zb) = rowsB[i0][0], rowsB[i0][1]
        f0, f1 = 0.15, 0.85
        ra, rb = sa + (sb - sa) * f0, sa + (sb - sa) * f1
        ha, hb2 = za + (zb - za) * f0 + 0.15, za + (zb - za) * f1 + 0.15
        wx = 26.0
        m.quad((wx, -ra, ha), (-wx, -ra, ha), (-wx, -rb, hb2), (wx, -rb, hb2), [(0, 0.0), (1, 0.0), (1, 0.5), (0, 0.5)])
    objs.append(m.build(mat('av_sign')))

    # night haze: an open cone of light rising out of the bowl (32 segments), off by day
    m = Mesh('glow' + tag)
    G = 32
    Dg = degs(G)
    lo = [P(d, r(d) * 0.9, HLE(d) - 6.0) for d in Dg]
    hi = [P(d, r(d) * 1.25, truss_top(d) + 18.0) for d in Dg]
    m.grid([lo, hi], lambda i, j: (i / G, j), smooth=False)
    objs.append(m.build(mat('av_glow')))
    return objs


near = build(128)
far = build(64, far=True)
kit.finish(near + far, (0.6, 0.55), 0.8)
for name, objs in (('aviva', near), ('aviva_far', far)):
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root)
    for o in objs:
        o.parent = root
    print('TRIANGLES', name, kit.tris(objs), {o.name: len(o.data.loop_triangles) for o in objs})
kit.export(os.path.join(OUT, 'aviva.glb'), os.path.join(SRC, 'aviva.blend'))
print('DONE')

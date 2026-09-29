"""Shared helpers for the stone landmark builds (Christ Church, St Patrick's, Heuston).

Geometry goes into per-material accumulators (Part). Walls, roofs and dressings get world-projected UVs in metres
(the game's materials tile a texture every few metres); windows, roses, louvres and crenellation strips are decal
quads with UVs into a small shared atlas painted at load (src/world/heroes.js, DECALS). Ambient occlusion is baked
into vertex colours (no unique UVs needed), exported as COLOR_0 and multiplied in by the game.

Axes: X east, Y north, Z up, metres. Build real-size, then `finish()` scales plan and height separately.
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

# decal atlas regions (px in a 1024 atlas; see heroes.js paintDecals)
ATLAS = 1024
DECAL = dict(
    lancet=(0, 0, 128, 384), lancet3=(128, 0, 384, 384), round=(512, 0, 128, 256), rose=(640, 0, 256, 256),
    louvre=(896, 0, 128, 384), cren=(0, 384, 512, 64), clock=(512, 384, 128, 128), door=(640, 256, 128, 256),
    oculus=(768, 256, 128, 128), sash=(896, 384, 128, 192), portal=(0, 448, 256, 320),
    attic=(512, 576, 512, 128), arcade=(256, 448, 256, 256),
)


def dv(region, s, t):
    u0, v0, w, h = DECAL[region]
    return ((u0 + s * w) / ATLAS, 1 - (v0 + t * h) / ATLAS)


# Optional build-time scale (u, v, z) applied to every point as it is added, before the world UVs are computed, so
# tiles stay in true metres on a model built at real size and squeezed to fit the map (Heuston). Default: none.
SCALE = [1.0, 1.0, 1.0]


def newell(pts):
    """Polygon normal (unnormalised) by Newell's method: robust for n-gons and slivers."""
    n = [0.0, 0.0, 0.0]
    for i, a in enumerate(pts):
        b = pts[(i + 1) % len(pts)]
        n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1])
    return n


class Part:
    def __init__(self, name, tile=4.0):
        self.name, self.tile = name, tile
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.fl = self.bm.faces.layers.float.new('flood')  # night floodlight mask per face (see bake_ao_vertex)
        self.flood = 0.0

    def facen(self, pts, n, uvs=None):
        """A face whose winding is fixed so that it faces along n (given in the unscaled build space)."""
        m = newell(pts)
        if m[0] * n[0] + m[1] * n[1] + m[2] * n[2] < 0:
            pts = pts[::-1]
            uvs = uvs[::-1] if uvs else uvs
        return self.face(pts, uvs)

    def face(self, pts, uvs=None):
        sx, sy, sz = SCALE
        if (sx, sy, sz) != (1.0, 1.0, 1.0):
            pts = [(p[0] * sx, p[1] * sy, p[2] * sz) for p in pts]
        vs = [self.bm.verts.new(Vector(p)) for p in pts]
        try:
            f = self.bm.faces.new(vs)
        except ValueError:
            return None
        f[self.fl] = self.flood
        if uvs is None:
            # planar projection by dominant normal, metres / tile
            n = newell(pts)
            ax = max(range(3), key=lambda i: abs(n[i]))
            a, b = [i for i in range(3) if i != ax]
            if ax == 2:
                uvs = [(p[0] / self.tile, p[1] / self.tile) for p in pts]
            else:
                h = 0 if ax == 1 else 1  # horizontal axis along the wall
                uvs = [(p[h] / self.tile, p[2] / self.tile) for p in pts]
        for i, l in enumerate(f.loops):
            l[self.uv].uv = uvs[i]
        return f

    def quad(self, a, b, c, d, uvs=None):
        return self.face([a, b, c, d], uvs)

    def box(self, x0, x1, y0, y1, z0, z1, top=True, bottom=False):
        P = lambda x, y, z: (x, y, z)
        self.quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1))  # south
        self.quad(P(x1, y1, z0), P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1))  # north
        self.quad(P(x0, y1, z0), P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1))  # west
        self.quad(P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1))  # east
        if top:
            self.quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1))
        if bottom:
            self.quad(P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0), P(x0, y0, z0))

    def gable_x(self, x0, x1, y0, y1, z0, ridge):
        """Pitched roof, ridge along X."""
        ym = (y0 + y1) / 2
        self.quad((x0, y0, z0), (x1, y0, z0), (x1, ym, ridge), (x0, ym, ridge))
        self.quad((x1, y1, z0), (x0, y1, z0), (x0, ym, ridge), (x1, ym, ridge))

    def gable_y(self, x0, x1, y0, y1, z0, ridge):
        xm = (x0 + x1) / 2
        self.quad((x1, y0, z0), (x1, y1, z0), (xm, y1, ridge), (xm, y0, ridge))
        self.quad((x0, y1, z0), (x0, y0, z0), (xm, y0, ridge), (xm, y1, ridge))

    def gable_end_x(self, x, y0, y1, z0, ridge, facing):
        """Triangular gable wall in the plane x = const."""
        ym = (y0 + y1) / 2
        pts = [(x, y0, z0), (x, y1, z0), (x, ym, ridge)]
        self.face(pts if facing > 0 else pts[::-1])

    def gable_end_y(self, y, x0, x1, z0, ridge, facing):
        xm = (x0 + x1) / 2
        pts = [(x1, y, z0), (x0, y, z0), (xm, y, ridge)]
        self.face(pts if facing > 0 else pts[::-1])

    def lean_to(self, x0, x1, y_low, y_high, z_low, z_high):
        self.quad((x0, y_low, z_low), (x1, y_low, z_low), (x1, y_high, z_high), (x0, y_high, z_high)) if y_high > y_low else \
            self.quad((x1, y_low, z_low), (x0, y_low, z_low), (x0, y_high, z_high), (x1, y_high, z_high))

    def pyramid(self, cx, cy, z0, hx, hy, apex, sides=4, rot=math.pi / 4):
        r = math.hypot(hx, hy) if sides != 4 else None
        pts = []
        for k in range(sides):
            a = rot + k / sides * math.tau
            if sides == 4:
                pts.append((cx + math.copysign(hx, math.cos(a)), cy + math.copysign(hy, math.sin(a)), z0))
            else:
                pts.append((cx + math.cos(a) * hx, cy + math.sin(a) * hy, z0))
        for i in range(sides):
            a, b = pts[i], pts[(i + 1) % sides]
            self.face([a, b, (cx, cy, apex)])

    def prism(self, cx, cy, r, z0, z1, sides=8, cap=True):
        pts = [(cx + math.cos(k / sides * math.tau) * r, cy + math.sin(k / sides * math.tau) * r) for k in range(sides)]
        for i in range(sides):
            (ax, ay), (bx, by) = pts[i], pts[(i + 1) % sides]
            self.quad((ax, ay, z0), (bx, by, z0), (bx, by, z1), (ax, ay, z1))
        if cap:
            self.face([(x, y, z1) for x, y in pts])

    def crenellate(self, pts, z, h=0.7, t=0.45, merlon=0.8, gap=0.6):
        """Stepped battlements along a polyline at height z: merlon blocks on a parapet course."""
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            L = math.hypot(bx - ax, by - ay)
            if L < 1e-3:
                continue
            dx, dy = (bx - ax) / L, (by - ay) / L
            nx, ny = -dy * t / 2, dx * t / 2
            s = 0.0
            while s < L - 0.05:
                e = min(L, s + merlon)
                x0, y0, x1, y1 = ax + dx * s, ay + dy * s, ax + dx * e, ay + dy * e
                c = [(x0 - nx, y0 - ny), (x1 - nx, y1 - ny), (x1 + nx, y1 + ny), (x0 + nx, y0 + ny)]
                zt = z + h
                self.quad((*c[0], z), (*c[1], z), (*c[1], zt), (*c[0], zt))
                self.quad((*c[2], z), (*c[3], z), (*c[3], zt), (*c[2], zt))
                self.quad((*c[3], z), (*c[0], z), (*c[0], zt), (*c[3], zt))
                self.quad((*c[1], z), (*c[2], z), (*c[2], zt), (*c[1], zt))
                self.quad((*c[0], zt), (*c[1], zt), (*c[2], zt), (*c[3], zt))
                s = e + gap

    def build(self, material):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts[:], dist=1e-5)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:]) if False else None
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me); self.bm.free()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.collection.objects.link(ob)
        ob.data.materials.append(material)
        for p in ob.data.polygons:
            p.use_smooth = False
        return ob


class Decals(Part):
    """Quads on a wall plane with atlas UVs. Wall given by axis 'x' (plane x = c, facing +/-X) or 'y'."""
    def on(self, region, axis, c, facing, u0, u1, z0, z1, off=0.03):
        if axis == 'x':
            x = c + facing * off
            a, b = ((x, u0, z0), (x, u1, z0)) if facing > 0 else ((x, u1, z0), (x, u0, z0))
            c2, d = (b[0], b[1], z1), (a[0], a[1], z1)
        else:
            y = c + facing * off
            a, b = ((u1, y, z0), (u0, y, z0)) if facing > 0 else ((u0, y, z0), (u1, y, z0))
            c2, d = (b[0], b[1], z1), (a[0], a[1], z1)
        self.quad(a, b, c2, d, [dv(region, 0, 1), dv(region, 1, 1), dv(region, 1, 0), dv(region, 0, 0)])

    def free(self, region, a, b, c, d):
        self.quad(a, b, c, d, [dv(region, 0, 1), dv(region, 1, 1), dv(region, 1, 0), dv(region, 0, 0)])


class Atlas(Part):
    """Faces with UVs into a named atlas (regions px (x, y, w, h) in a W x H canvas). tc(region, s, t): s across,
    t down the region (0 top)."""
    def __init__(self, name, regions, W, H):
        super().__init__(name)
        self.R, self.W, self.H = regions, W, H

    def tc(self, region, s, t):
        x, y, w, h = self.R[region]
        return ((x + s * w) / self.W, 1 - (y + t * h) / self.H)

    def wall(self, region, wf, s0, s1, z0, z1, d=0.02, crop=(0, 1, 0, 1)):
        """A decal quad on a wall frame, facing out. crop = (s0, s1, t0, t1) of the region."""
        a0, a1, t0, t1 = crop
        pts = [wf.p(s0, z0, d), wf.p(s1, z0, d), wf.p(s1, z1, d), wf.p(s0, z1, d)]
        uvs = [self.tc(region, a0, t1), self.tc(region, a1, t1), self.tc(region, a1, t0), self.tc(region, a0, t0)]
        return self.facen(pts, wf.n3, uvs)

    def poly(self, region, wf, pts2, d, box):
        """A decal n-gon on a wall frame: pts2 (s, z) mapped into the region by the bounding box (s0, s1, z0, z1)."""
        s0, s1, z0, z1 = box
        pts = [wf.p(s, z, d) for s, z in pts2]
        uvs = [self.tc(region, (s - s0) / (s1 - s0), 1 - (z - z0) / (z1 - z0)) for s, z in pts2]
        return self.facen(pts, wf.n3, uvs)


class Flat(Part):
    """Flat-coloured surfaces drawn into an Atlas at a solid swatch (no extra material, no extra draw call)."""
    def __init__(self, atlas, region):
        self.atl, self.uvc, self.flood = atlas, atlas.tc(region, 0.5, 0.5), 0.0

    def face(self, pts, uvs=None):
        return self.atl.face(pts, [self.uvc] * len(pts))


# ---------------- architectural helpers (Heuston v2) ----------------
# Everything below works in real metres; Part.face applies SCALE. A wall frame WF puts a wall in plan: origin (u, v)
# on the wall face, outward normal n (unit, in plan); s runs along the wall (h = up x n, so a face drawn with s and z
# increasing is seen counter-clockwise from outside), z is height and d the distance out from the face.

class WF:
    def __init__(self, ou, ov, nx, ny):
        self.o, self.n = (ou, ov), (nx, ny)
        self.h = (-ny, nx)
        self.n3 = (nx, ny, 0.0)
        self.h3 = (-ny, nx, 0.0)

    def p(self, s, z, d=0.0):
        return (self.o[0] + self.h[0] * s + self.n[0] * d, self.o[1] + self.h[1] * s + self.n[1] * d, z)

    def dir(self, ds, dz, dd):
        """A direction in the frame as a 3D vector (for expected normals)."""
        return (self.h[0] * ds + self.n[0] * dd, self.h[1] * ds + self.n[1] * dd, dz)


def rect(part, wf, s0, s1, z0, z1, d=0.0):
    if s1 - s0 < 1e-4 or z1 - z0 < 1e-4:
        return None
    return part.facen([wf.p(s0, z0, d), wf.p(s1, z0, d), wf.p(s1, z1, d), wf.p(s0, z1, d)], wf.n3)


def block(part, wf, s0, s1, z0, z1, d0, d1, top=True, bottom=False, sides=True, back=False):
    """A box in a wall frame: s0..s1 along, z0..z1 up, d0..d1 out. The face on the wall (d0) is skipped unless back."""
    P = wf.p
    part.facen([P(s0, z0, d1), P(s1, z0, d1), P(s1, z1, d1), P(s0, z1, d1)], wf.n3)
    if sides:
        part.facen([P(s0, z0, d0), P(s0, z0, d1), P(s0, z1, d1), P(s0, z1, d0)], wf.dir(-1, 0, 0))
        part.facen([P(s1, z0, d0), P(s1, z0, d1), P(s1, z1, d1), P(s1, z1, d0)], wf.dir(1, 0, 0))
    if top:
        part.facen([P(s0, z1, d0), P(s1, z1, d0), P(s1, z1, d1), P(s0, z1, d1)], (0, 0, 1))
    if bottom:
        part.facen([P(s0, z0, d0), P(s1, z0, d0), P(s1, z0, d1), P(s0, z0, d1)], (0, 0, -1))
    if back:
        part.facen([P(s0, z0, d0), P(s1, z0, d0), P(s1, z1, d0), P(s0, z1, d0)], wf.dir(0, 0, -1))


def arc_pts(sc, zs, r, segs, a0=math.pi, a1=0.0, rz=None):
    """Points on a (possibly elliptical) arc in the wall plane from angle a0 to a1."""
    rz = r if rz is None else rz
    return [(sc + r * math.cos(a0 + (a1 - a0) * i / segs), zs + rz * math.sin(a0 + (a1 - a0) * i / segs)) for i in range(segs + 1)]


def opening(wall, wf, s0, s1, z0, z1, sc, w, zb, zs, segs=8, depth=0.3, reveal=None, back=None, through=None, rise=None, rflood=None):
    """A wall panel s0..s1 x z0..z1 on frame wf with an opening centred at sc, width w, from zb (sill) to the
    springing zs and a round head (segs segments; 0 = flat head at zs; rise = segmental head). Builds the wall
    faces around the opening and the reveal (on `reveal`, default the wall part, flood 1). back: None (nothing),
    ('decal', atlas_part, region) for a back plane in an atlas, or 'wall'. through=t: the opening goes right through a
    wall t thick, and the inside face is built too (bellcotes)."""
    r = w / 2
    head = arc_pts(sc, zs, r, segs, rz=rise) if segs else [(sc - r, zs), (sc + r, zs)]
    faces = []
    for d, nrm in ((0.0, 1),) + (((-through, -1),) if through else ()):
        n3 = wf.n3 if nrm > 0 else wf.dir(0, 0, -1)
        def R(a, b, c, e):
            if b - a > 1e-4 and e - c > 1e-4:
                wall.facen([wf.p(a, c, d), wf.p(b, c, d), wf.p(b, e, d), wf.p(a, e, d)], n3)
        R(s0, sc - r, z0, z1)
        R(sc + r, s1, z0, z1)
        R(sc - r, sc + r, z0, zb)
        for (a, za), (b, zb2) in zip(head, head[1:]):
            if z1 - max(za, zb2) > 1e-4:
                wall.facen([wf.p(a, za, d), wf.p(b, zb2, d), wf.p(b, z1, d), wf.p(a, z1, d)], n3)
    # reveal: every edge of the opening, pushed back to the back plane
    rv = reveal or wall
    keep = rv.flood
    if rflood is not None:
        rv.flood = rflood
    dep = through if through else depth
    if segs == 0:
        ring = [(sc - r, zb), (sc + r, zb), (sc + r, zs), (sc - r, zs)]
    else:
        ring = [(sc - r, zb), (sc + r, zb)] + head[::-1]
    cx, cz = sc, (zb + zs) / 2
    for i in range(len(ring)):
        (a, za), (b, zb2) = ring[i], ring[(i + 1) % len(ring)]
        if abs(a - b) < 1e-5 and abs(za - zb2) < 1e-5:
            continue
        mz = (za + zb2) / 2
        tz = zs if mz > zs + 1e-3 else cz  # arch segments face the arch centre
        n = wf.dir(cx - (a + b) / 2, tz - mz, 0)
        rv.facen([wf.p(a, za, 0), wf.p(b, zb2, 0), wf.p(b, zb2, -dep), wf.p(a, za, -dep)], n)
    rv.flood = keep
    if back == 'wall':
        wall.facen([wf.p(s, z, -depth) for s, z in ring], wf.n3)
    elif back:
        _, atl, region = back
        atl.poly(region, wf, ring, -depth + 0.01, (sc - r, sc + r, zb, max(z for _, z in ring)))
    return ring


def band(part, wf, pts, w, proj, off=0.0, ends=True, front=True, inner=False, d0=0.0):
    """A raised moulding following a polyline pts (s, z) in the wall plane: from off to off + w to the LEFT of the
    direction of travel (so trace arches and pediments left to right over the top), standing proj out of the wall.
    Mitred at the joints."""
    n = len(pts)
    segn = []
    for i in range(n - 1):
        ds, dz = pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]
        L = math.hypot(ds, dz) or 1
        segn.append((-dz / L, ds / L))
    def miter(i):
        if i == 0:
            return segn[0]
        if i == n - 1:
            return segn[-1]
        a, b = segn[i - 1], segn[i]
        k = 1 + a[0] * b[0] + a[1] * b[1]
        return ((a[0] + b[0]) / k, (a[1] + b[1]) / k)
    I, O = [], []
    for i, (s, z) in enumerate(pts):
        m = miter(i)
        I.append((s + m[0] * off, z + m[1] * off)); O.append((s + m[0] * (off + w), z + m[1] * (off + w)))
    P = wf.p
    for i in range(n - 1):
        (a, b), (c, e) = I[i], I[i + 1]
        (f, g), (h, k) = O[i], O[i + 1]
        nm = segn[i]
        if front:
            part.facen([P(a, b, d0 + proj), P(c, e, d0 + proj), P(h, k, d0 + proj), P(f, g, d0 + proj)], wf.n3)
        part.facen([P(f, g, d0), P(h, k, d0), P(h, k, d0 + proj), P(f, g, d0 + proj)], wf.dir(nm[0], nm[1], 0))
        if inner:
            part.facen([P(a, b, d0), P(c, e, d0), P(c, e, d0 + proj), P(a, b, d0 + proj)], wf.dir(-nm[0], -nm[1], 0))
    if ends:
        for i, sg in ((0, -1), (n - 1, 1)):
            j = 0 if i == 0 else n - 2
            ds, dz = pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]
            (a, b), (f, g) = I[i], O[i]
            part.facen([P(a, b, d0), P(f, g, d0), P(f, g, d0 + proj), P(a, b, d0 + proj)], wf.dir(ds * sg, dz * sg, 0))
    return I, O


def lathe(part, cx, cy, prof, sides=12, a0=0.0, a1=math.tau, cap=False, region=None, floods=None, rx=1.0, ry=1.0):
    """A surface of revolution about the vertical axis at (cx, cy): prof = [(r, z), ...] bottom to top. a0..a1 is the
    arc swept (angles from +u towards +v); rx/ry stretch it. region: atlas UVs (s round the arc, t down the profile)
    for Atlas parts. floods: per profile segment."""
    full = abs((a1 - a0) - math.tau) < 1e-6
    ang = [a0 + (a1 - a0) * k / sides for k in range(sides + 1)]
    z0, z1 = prof[0][1], prof[-1][1]
    keep = part.flood
    for j in range(len(prof) - 1):
        (ra, za), (rb, zb) = prof[j], prof[j + 1]
        if floods:
            part.flood = floods[j]
        for k in range(sides):
            p, q = ang[k], ang[k + 1]
            m = (p + q) / 2
            pts = [(cx + math.cos(p) * ra * rx, cy + math.sin(p) * ra * ry, za), (cx + math.cos(q) * ra * rx, cy + math.sin(q) * ra * ry, za),
                   (cx + math.cos(q) * rb * rx, cy + math.sin(q) * rb * ry, zb), (cx + math.cos(p) * rb * rx, cy + math.sin(p) * rb * ry, zb)]
            if rb < 1e-6:
                pts = pts[:3]
            elif ra < 1e-6:
                pts = [pts[0], pts[2], pts[3]]
            # outward normal of the profile segment, rotated to this facet
            dr, dz = rb - ra, zb - za
            nrm = (math.cos(m) * dz, math.sin(m) * dz, -dr)
            if region is not None:
                t = lambda z: (z1 - z) / (z1 - z0 or 1)
                s = lambda a: (a - a0) / (a1 - a0)
                uvs = [part.tc(region, s(p), t(za)), part.tc(region, s(q), t(za)), part.tc(region, s(q), t(zb)), part.tc(region, s(p), t(zb))]
                if rb < 1e-6:
                    uvs = uvs[:3]
                elif ra < 1e-6:
                    uvs = [uvs[0], uvs[2], uvs[3]]
                part.facen(pts, nrm, uvs)
            else:
                part.facen(pts, nrm)
    part.flood = keep
    if cap and prof[-1][0] > 1e-6:
        r, z = prof[-1]
        pts = [(cx + math.cos(a) * r * rx, cy + math.sin(a) * r * ry, z) for a in ang[:-1 if full else None]]
        if not full:
            pts.append((cx, cy, z))
        part.facen(pts, (0, 0, 1))


def extrude_profile(part, path, prof, closed=False, caps=True, floods=None):
    """Sweep a moulding profile along a plan path (u, v): prof = [(out, z), ...] bottom to top, `out` measured to
    the RIGHT of the direction of travel (so run a building's perimeter anticlockwise in plan, u east / v north). Mitred corners."""
    n = len(path)
    segs = n if closed else n - 1
    segn = []
    for i in range(segs):
        a, b = path[i], path[(i + 1) % n]
        du, dv_ = b[0] - a[0], b[1] - a[1]
        L = math.hypot(du, dv_) or 1
        segn.append((dv_ / L, -du / L))
    def miter(i):
        if not closed and i == 0:
            return segn[0]
        if not closed and i == n - 1:
            return segn[-1]
        a, b = segn[(i - 1) % segs], segn[i % segs]
        k = 1 + a[0] * b[0] + a[1] * b[1]
        return ((a[0] + b[0]) / k, (a[1] + b[1]) / k)
    M = [miter(i) for i in range(n)]
    V = [[(path[i][0] + M[i][0] * o, path[i][1] + M[i][1] * o, z) for o, z in prof] for i in range(n)]
    keep = part.flood
    for i in range(segs):
        j = (i + 1) % n
        nu, nv = segn[i]
        for k in range(len(prof) - 1):
            if floods:
                part.flood = floods[k]
            (oa, za), (ob, zb) = prof[k], prof[k + 1]
            nz2 = (zb - za, -(ob - oa))  # outward in the profile plane
            nrm = (nu * nz2[0], nv * nz2[0], nz2[1])
            part.facen([V[i][k], V[j][k], V[j][k + 1], V[i][k + 1]], nrm)
    part.flood = keep
    if caps and not closed:
        for i, sg in ((0, -1), (n - 1, 1)):
            a, b = path[0 if i == 0 else n - 2], path[1 if i == 0 else n - 1]
            d = (b[0] - a[0], b[1] - a[1])
            pts = V[i] if prof[0][0] < 1e-6 and prof[-1][0] < 1e-6 else V[i] + [(path[i][0], path[i][1], prof[-1][1]), (path[i][0], path[i][1], prof[0][1])]
            part.facen(pts, (d[0] * sg, d[1] * sg, 0))


def hip(part, u0, u1, v0, v1, z0, z1):
    """Hipped roof over a rectangle, ridge along the longer side."""
    du, dv_ = u1 - u0, v1 - v0
    if dv_ >= du:
        h = du / 2
        r0, r1 = (u0 + h, v0 + h, z1), (u0 + h, v1 - h, z1)
    else:
        h = dv_ / 2
        r0, r1 = (u0 + h, v0 + h, z1), (u1 - h, v0 + h, z1)
    A, B, C, D = (u0, v0, z0), (u1, v0, z0), (u1, v1, z0), (u0, v1, z0)
    if dv_ >= du:
        part.facen([A, B, r0], (0, -1, 1)); part.facen([C, D, r1], (0, 1, 1))
        part.facen([B, C, r1, r0], (1, 0, 1)); part.facen([D, A, r0, r1], (-1, 0, 1))
    else:
        part.facen([D, A, r0], (-1, 0, 1)); part.facen([B, C, r1], (1, 0, 1))
        part.facen([A, B, r1, r0], (0, -1, 1)); part.facen([C, D, r0, r1], (0, 1, 1))


def material(name, rgb, rough=0.8):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    return m


def bake_ao_vertex(objs, distance=3.0, samples=24, cell=3.0, passes=1, flood=False):
    """Bake ambient occlusion into a vertex colour layer on every object (Cycles). Edges longer than `cell` are
    split (up to `passes` times) so the per-vertex AO has somewhere to live. flood=True also writes each face's
    'flood' value (Part.flood) into the colour's alpha, for a floodlit night look."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    if sc.world is None:
        sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = distance
    # a ground plane so bases darken
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=400)
    me = bpy.data.meshes.new('ground'); bm.to_mesh(me); bm.free()
    ground = bpy.data.objects.new('ground', me); bpy.context.collection.objects.link(ground)
    # decal quads sit a few cm off the walls: they must not occlude (the walls behind them baked near black)
    decals = [o for o in objs if o.name.endswith('decal') or o.name.endswith('atlas')]
    for o in decals:
        o.hide_render = True
    for ob in objs:
        if ob in decals:
            continue
        me = ob.data
        # subdivide big faces a little so the per-vertex AO has somewhere to live
        bm = bmesh.new(); bm.from_mesh(me)
        for _ in range(passes):
            long = [e for e in bm.edges if e.calc_length() > cell]
            if not long:
                break
            bmesh.ops.subdivide_edges(bm, edges=long, cuts=1, use_grid_fill=True)
        bm.to_mesh(me); bm.free()
        if 'AO' not in me.color_attributes:
            me.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER')
        me.color_attributes.active_color = me.color_attributes['AO']
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        sc.render.bake.target = 'VERTEX_COLORS'
        bpy.ops.object.bake(type='AO')
        if flood and 'flood' in me.attributes:
            fl, col = me.attributes['flood'].data, me.color_attributes['AO'].data
            for p in me.polygons:
                a = fl[p.index].value
                for li in p.loop_indices:
                    c = col[li].color
                    col[li].color = (c[0], c[1], c[2], a)
    bpy.data.objects.remove(ground, do_unlink=True)
    for o in decals:
        o.hide_render = False


def finish(objs, plan, height):
    sx, sy = plan if isinstance(plan, (tuple, list)) else (plan, plan)
    for ob in objs:
        ob.scale = (sx, sy, height)
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def tris(objs):
    t = 0
    for ob in objs:
        ob.data.calc_loop_triangles(); t += len(ob.data.loop_triangles)
    return t


def export(path, blend=None):
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    print('EXPORTED', path, os.path.getsize(path))

"""Statue figure kit: low-poly sculpture proxies built from a stick skeleton (Skin modifier + one subdivision level),
with drapery lathed round the body (cloaks, frock coats, habits, dresses), simple heads, wings and attributes.

Used by build_statues.py (the shared statues.glb) and build_oconnell.py (the O'Connell Monument hero).
Conventions: metres at a nominal 1.8 m figure (head top ~1.78 m), feet at z = 0, the figure FACES -Y (the glTF export
turns that into three.js +Z), figure's right hand is at -X. Scale to the real height when placing.

A body is made with `Fig()`, then `fig.body(joints)` for the skeleton, `fig.lathe(...)` for drapery, `fig.head(...)`,
`fig.wing(...)`, and the small `fig.box/cyl/sphere` helpers for attributes; `fig.to_object(name, mat)` builds it.
Poses are just joint positions: see `pose()` and the BODIES table in build_statues.py.
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix

BONES = [('pelvis', 'belly'), ('belly', 'chest'), ('chest', 'neck'), ('neck', 'head'),
         ('chest', 'rsh'), ('rsh', 'rel'), ('rel', 'rwr'), ('rwr', 'rha'),
         ('chest', 'lsh'), ('lsh', 'lel'), ('lel', 'lwr'), ('lwr', 'lha'),
         ('pelvis', 'rhip'), ('rhip', 'rkn'), ('rkn', 'ran'), ('ran', 'rto'),
         ('pelvis', 'lhip'), ('lhip', 'lkn'), ('lkn', 'lan'), ('lan', 'lto')]


def pose(female=False, **over):
    """Standing skeleton {joint: ((x, y, z), (rx, ry))}; keyword overrides give a joint a new position (a 3-tuple)
    or a new (position, radii) pair. Left-side joints mirror the right unless given."""
    sh, hp = (0.17, 0.115) if female else (0.19, 0.1)
    J = dict(
        pelvis=((0, 0, 0.98), (0.17 if female else 0.15, 0.115)),
        belly=((0, 0, 1.13), (0.13, 0.1)),
        chest=((0, 0, 1.33), (0.145 if female else 0.16, 0.11)),
        neck=((0, 0, 1.5), (0.055, 0.055)),
        head=((0, 0, 1.56), (0.05, 0.05)),
        rsh=((-sh, 0, 1.43), (0.07, 0.07)), rel=((-sh - 0.04, 0.02, 1.16), (0.058, 0.058)),
        rwr=((-sh - 0.05, 0, 0.92), (0.042, 0.038)), rha=((-sh - 0.05, -0.01, 0.83), (0.05, 0.034)),
        rhip=((-hp, 0, 0.9), (0.1, 0.1)), rkn=((-hp - 0.01, -0.02, 0.5), (0.07, 0.07)),
        ran=((-hp - 0.02, 0.02, 0.09), (0.052, 0.052)), rto=((-hp - 0.03, -0.12, 0.035), (0.05, 0.035)),
    )
    for k in list(J):
        if k[0] == 'r':
            (x, y, z), r = J[k]
            J['l' + k[1:]] = ((-x, y, z), r)
    for k, v in over.items():
        if isinstance(v[0], (int, float)):
            J[k] = (tuple(v), J[k][1])
        else:
            J[k] = (tuple(v[0]), tuple(v[1]))
    return J


def lean(J, amount, pivot_z=0.95, keys=None):
    """Tilt the upper body forward (towards -Y) by `amount` metres per metre above the pivot."""
    out = {}
    for k, ((x, y, z), r) in J.items():
        if z > pivot_z and (keys is None or k in keys) and not k.endswith(('hip', 'kn', 'an', 'to')) and k != 'pelvis':
            y -= (z - pivot_z) * amount
        out[k] = ((x, y, z), r)
    return out


class Fig:
    def __init__(self):
        self.bm = bmesh.new()

    # ---- merging helpers
    def _append_mesh(self, me, matrix=Matrix()):
        src = bmesh.new(); src.from_mesh(me)
        src.transform(matrix)
        vmap = {}
        for v in src.verts:
            vmap[v] = self.bm.verts.new(v.co)
        for f in src.faces:
            try:
                self.bm.faces.new([vmap[v] for v in f.verts])
            except ValueError:
                pass
        src.free()

    def body(self, J, subdiv=1, skip=()):
        """Skin-modifier body from a skeleton dict (see pose()). `skip` drops joints (e.g. toes under a long robe)."""
        names = [k for k in J if k not in skip]
        idx = {k: i for i, k in enumerate(names)}
        edges = [(idx[a], idx[b]) for a, b in BONES if a in idx and b in idx]
        me = bpy.data.meshes.new('skel')
        me.from_pydata([J[k][0] for k in names], edges, [])
        ob = bpy.data.objects.new('skel', me)
        bpy.context.collection.objects.link(ob)
        mod = ob.modifiers.new('skin', 'SKIN')
        mod.branch_smoothing = 0.4
        sv = me.skin_vertices[0].data
        for k, i in idx.items():
            sv[i].radius = J[k][1]
        sv[idx['pelvis'] if 'pelvis' in idx else 0].use_root = True
        if subdiv:
            s = ob.modifiers.new('sub', 'SUBSURF'); s.levels = subdiv; s.render_levels = subdiv
        dg = bpy.context.evaluated_depsgraph_get()
        nm = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        self._append_mesh(nm)
        bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.meshes.remove(me); bpy.data.meshes.remove(nm)
        return self

    def lathe(self, rings, sides=14, folds=0, fold_amp=0.0, fold_phase=0.0, cap=False, front=-math.pi / 2):
        """Drapery: rings of (z, rx, ry, cx, cy, gap) from top to bottom. `gap` is the half-angle (radians) of an opening
        centred on the front; folds push the surface out in `folds` vertical ridges, growing towards the hem."""
        bm = self.bm
        rows = []
        n = len(rings)
        for i, ring in enumerate(rings):
            z, rx, ry = ring[0], ring[1], ring[2]
            cx = ring[3] if len(ring) > 3 else 0.0
            cy = ring[4] if len(ring) > 4 else 0.0
            gap = ring[5] if len(ring) > 5 else 0.0
            depth = i / max(1, n - 1)
            row = []
            # every row has sides + 1 vertices from one edge of the opening round to the other; a closed row's two
            # ends coincide and are welded in to_object(), so open and closed rows join cleanly
            for k in range(sides + 1):
                a = front + gap + (math.tau - 2 * gap) * k / sides
                f = 1.0 + fold_amp * (0.3 + 0.7 * depth) * math.cos(folds * a + fold_phase) if folds else 1.0
                row.append(bm.verts.new((cx + math.cos(a) * rx * f, cy + math.sin(a) * ry * f, z)))
            rows.append(row)
        for r0, r1 in zip(rows, rows[1:]):
            for k in range(sides):
                try:
                    bm.faces.new((r0[k], r1[k], r1[k + 1], r0[k + 1]))
                except ValueError:
                    pass
        if cap:
            try:
                bm.faces.new(rows[-1][:-1][::-1])
            except ValueError:
                pass
        return self

    def head(self, c, r=(0.095, 0.11, 0.12), nose=True, hair=0.0, crown=None):
        m = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((*r, 1))
        bmesh.ops.create_uvsphere(self.bm, u_segments=8, v_segments=6, radius=1.0, matrix=m)
        if nose:
            x, y, z = c
            fy = y - r[1]
            v = [self.bm.verts.new(p) for p in ((x - 0.022, fy + 0.012, z + 0.0), (x + 0.022, fy + 0.012, z + 0.0),
                                                (x, fy - 0.03, z - 0.02), (x, fy + 0.01, z + 0.05))]
            for tri in ((0, 2, 3), (2, 1, 3), (0, 1, 2)):
                try:
                    self.bm.faces.new([v[i] for i in tri])
                except ValueError:
                    pass
        if crown:  # laurel wreath / band: a torus round the head
            rr, t = crown
            self.torus((c[0], c[1] + 0.005, c[2] + r[2] * 0.35), rr, t, seg=10, sides=3)
        return self

    def torus(self, c, R, r, seg=10, sides=4, axis='z'):
        bm = self.bm
        rows = []
        for i in range(seg):
            a = i / seg * math.tau
            row = []
            for j in range(sides):
                b = j / sides * math.tau
                rad = R + r * math.cos(b)
                p = Vector((math.cos(a) * rad, math.sin(a) * rad, r * math.sin(b)))
                if axis == 'y':
                    p = Vector((p.x, p.z, p.y))
                row.append(bm.verts.new(Vector(c) + p))
            rows.append(row)
        for i in range(seg):
            for j in range(sides):
                a, b = rows[i][j], rows[(i + 1) % seg][j]
                c2, d = rows[(i + 1) % seg][(j + 1) % sides], rows[i][(j + 1) % sides]
                self.bm.faces.new((a, b, c2, d))
        return self

    def box(self, c, size, rot=(0, 0, 0)):
        m = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X') @ Matrix.Diagonal((*size, 1))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        return self

    def cyl(self, a, b, r1, r2=None, seg=6):
        """Tapered cylinder from point a to point b."""
        a, b = Vector(a), Vector(b)
        d = b - a
        L = d.length
        q = d.normalized().to_track_quat('Z', 'Y')
        m = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
        bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2 if r2 is not None else r1, depth=L, matrix=m)
        return self

    def sphere(self, c, r, seg=6):
        rr = r if isinstance(r, (tuple, list)) else (r, r, r)
        bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(3, seg - 2), radius=1.0,
                                  matrix=Matrix.Translation(Vector(c)) @ Matrix.Diagonal((*rr, 1)))
        return self

    def tube(self, pts, radii, sides=5):
        """A tube along a polyline (serpents, cords, scrolls)."""
        pts = [Vector(p) for p in pts]
        rings = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            x = t.cross(Vector((0, 0, 1)))
            if x.length < 1e-3:
                x = t.cross(Vector((1, 0, 0)))
            x.normalize(); y = t.cross(x)
            r = radii[i] if isinstance(radii, (list, tuple)) else radii
            rings.append([self.bm.verts.new(p + (x * math.cos(a) + y * math.sin(a)) * r) for a in (k / sides * math.tau for k in range(sides))])
        for r0, r1 in zip(rings, rings[1:]):
            for k in range(sides):
                self.bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))
        return self

    def wing(self, s, root, tip, n=7, droop=(0.15, 0.25, -1.0), rise=(0.55, 0.2, 0.8), lens=(0.55, 0.65, 0.25), bulge=0.06):
        """A half-spread wing on side s (+1 figure's left, -1 right): a curved leading edge from `root` to `tip`, with
        feathers hanging off it (stepped trailing edge). ~4 tris per step."""
        R, T = Vector(root), Vector(tip)
        d0, d1 = Vector((s * droop[0], droop[1], droop[2])).normalized(), Vector((s * rise[0], rise[1], rise[2])).normalized()
        lead, mid, trail, notch = [], [], [], []
        for i in range(n + 1):
            t = i / n
            L = R.lerp(T, t) + Vector((s * bulge, bulge, bulge)) * math.sin(math.pi * t)
            D = d0.lerp(d1, t ** 1.5).normalized()
            ln = lens[0] * (1 - t) + lens[2] * t + (lens[1] - (lens[0] + lens[2]) / 2) * 2 * math.sin(math.pi * t) * 0.5
            back = Vector((0, 0.07, 0)) * math.sin(math.pi * t)
            lead.append(L)
            mid.append(L + D * ln * 0.5 + back)
            trail.append(L + D * ln + back * 0.5)
            if i < n:
                t2 = (i + 0.5) / n
                L2 = R.lerp(T, t2) + Vector((s * bulge, bulge, bulge)) * math.sin(math.pi * t2)
                D2 = d0.lerp(d1, t2 ** 1.5).normalized()
                ln2 = lens[0] * (1 - t2) + lens[2] * t2 + (lens[1] - (lens[0] + lens[2]) / 2) * math.sin(math.pi * t2)
                notch.append(L2 + D2 * ln2 * 0.82)
        V = lambda p: self.bm.verts.new(p)
        vl, vm, vt, vn = [V(p) for p in lead], [V(p) for p in mid], [V(p) for p in trail], [V(p) for p in notch]
        for i in range(n):
            for f in ((vl[i], vl[i + 1], vm[i + 1], vm[i]), (vm[i], vm[i + 1], vt[i + 1], vn[i]), (vm[i], vn[i], vt[i])):
                try:
                    self.bm.faces.new(f if s > 0 else f[::-1])
                except ValueError:
                    pass
        return self

    def flatten(self, sy):
        """Squash depth (relief figures)."""
        for v in self.bm.verts:
            v.co.y *= sy
        return self

    def to_object(self, name, mat, target=None, smooth=True):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts[:], dist=1e-5)
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me); self.bm.free()
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        ob.data.materials.append(mat)
        if target:
            me.calc_loop_triangles()
            n = len(me.loop_triangles)
            if n > target:
                dm = ob.modifiers.new('dec', 'DECIMATE'); dm.ratio = target / n
                dg = bpy.context.evaluated_depsgraph_get()
                nm = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
                ob.modifiers.clear(); ob.data = nm
                ob.data.materials.clear(); ob.data.materials.append(mat)
        for p in ob.data.polygons:
            p.use_smooth = smooth
        return ob


def transform(ob, matrix):
    ob.data.transform(matrix)
    ob.data.update()
    return ob

"""Build the Garda Air Support Unit helicopter (Airbus EC135 T2 style) and export public/models/heli.glb.

Run headless:  blender -b --factory-startup -P tools/blender/build_heli.py -- public/models

Reference: refs/heli (Wikimedia Commons, CC BY-SA; see refs/heli/sources.json). Stylised, low poly (~6k triangles):
  - fuselage: one loft of superellipse rings from the nose to the tail boom, plus the engine cowling hump;
    faces in the windscreen / door-window areas take the glass material;
  - livery: the body carries a side-projected UV (u along the length, v up; each side mapped into its own half of
    the texture so lettering reads correctly from both sides). The game paints the texture at load
    (src/game/heli.js): white over dark blue, a yellow band, GARDA on the doors, the tricolour on the fin.
    The projection bounds go out as glTF extras on the body (livery_len, livery_z0, livery_z1, livery_nose);
  - rotor_main (4 blades + hub, spins about its local up) and rotor_tail (the fenestron fan, spins about local x)
    are separate nodes with their origin on the spin axis; searchlight is a node at the lamp's lens.
Axes: Blender X = width (the helicopter's left is +X), -Y = forward (exports to glTF +Z), +Z = up.
Origin: on the ground between the skids, under the main rotor mast.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
os.makedirs(OUT, exist_ok=True)

NOSE = 3.3      # the nose tip is 3.3 m ahead of the mast (Blender y = -3.3)
LEN = 10.5      # nose tip to the back of the fenestron
Z0, Z1 = 0.55, 3.55  # livery projection: height range


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mat(name, hexcol, metal=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(hexcol), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)

M = {
    'body': mat('heli_body', '#f2f3f1', rough=0.35),
    'glass': mat('heli_glass', '#10161c', metal=0.2, rough=0.06),
    'blade': mat('heli_blade', '#26282b', rough=0.6),
    'hub': mat('heli_hub', '#b9bdc2', metal=0.9, rough=0.35),
    'skid': mat('heli_skid', '#1d3a8a', rough=0.45),
    'dark': mat('heli_dark', '#17181a', rough=0.7),
    'lens': mat('heli_lens', '#eef3f6', emit='#fff4dc', strength=1.0),
    'nav_red': mat('heli_nav_red', '#8a0f0f', emit='#ff2010', strength=1.0),
    'nav_green': mat('heli_nav_green', '#0f6a1f', emit='#20ff50', strength=1.0),
    'strobe': mat('heli_strobe', '#dddddd', emit='#ffffff', strength=1.0),
}


class Part:
    """Faces with per-face material, collected into one bmesh."""

    def __init__(self, name, mats):
        self.name = name
        self.mats = mats  # material keys, index = face material_index
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')

    def face(self, pts, m=0):
        vs = [self.bm.verts.new(Vector(p)) for p in pts]
        try:
            f = self.bm.faces.new(vs)
        except ValueError:
            return None
        f.material_index = m
        f.smooth = True
        return f

    def finish(self, origin=(0, 0, 0), smooth_angle=38, livery=False):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-4)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        if livery:
            livery_uv(self.bm, self.uv, self.mats)
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for k in self.mats:
            me.materials.append(M[k])
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.collection.objects.link(ob)
        if hasattr(me, 'set_sharp_from_angle'):
            me.set_sharp_from_angle(angle=math.radians(smooth_angle))
        if origin != (0, 0, 0):
            me.transform(Matrix.Translation(-Vector(origin)))
            ob.location = origin
        return ob


def livery_uv(bm, uv, mats):
    """Side projection for body faces: +X side into the top half of the texture, -X side into the bottom half,
    each laid out so the texture reads left to right as a viewer on that side sees it."""
    body = mats.index('body') if 'body' in mats else -1
    for f in bm.faces:
        if f.material_index != body:
            for l in f.loops:
                l[uv].uv = (0.0, 0.0)
            continue
        side = 1 if f.normal.x >= 0 else -1
        for l in f.loops:
            p = l.vert.co
            s = (p.y + NOSE) / LEN
            zn = min(1, max(0, (Z1 - p.z) / (Z1 - Z0)))  # 0 at the top
            if side > 0:
                # viewer on +X looking toward -X: their right is +Y (the tail), so the nose is on the left
                l[uv].uv = (s, 1 - 0.5 * zn)
            else:
                l[uv].uv = (1 - s, 0.5 - 0.5 * zn)


def superellipse(n_seg, w, zb, zt, ex, x0=0.0):
    """Ring points (x, z), starting at the top and going round via +X."""
    zc, hz = (zt + zb) / 2, (zt - zb) / 2
    pts = []
    for i in range(n_seg):
        a = i / n_seg * math.tau
        s, c = math.sin(a), math.cos(a)
        e = ex if c < 0 else ex * 0.85  # a flatter belly, a rounder roof
        x = x0 + w * math.copysign(abs(s) ** (2 / e), s)
        z = zc + hz * math.copysign(abs(c) ** (2 / e), c)
        pts.append((x, z))
    return pts


def lerp_table(table, s):
    """table: [(s, a, b, c, ...)] -> interpolated tuple at s (smoothstep between keys)."""
    if s <= table[0][0]:
        return table[0][1:]
    for k in range(len(table) - 1):
        a, b = table[k], table[k + 1]
        if a[0] <= s <= b[0]:
            t = (s - a[0]) / (b[0] - a[0])
            t = t * t * (3 - 2 * t)
            return tuple(a[i] + (b[i] - a[i]) * t for i in range(1, len(a)))
    return table[-1][1:]


def loft(part, stations, ring, glass=None, cap0=True, cap1=True):
    """stations: list of s; ring(s) -> [(x, z)]. glass(s, x, z) -> bool for face centres."""
    rings = []
    for s in stations:
        y = s - NOSE
        rings.append([(x, y, z) for (x, z) in ring(s)])
    n = len(rings[0])
    gi = part.mats.index('glass') if 'glass' in part.mats else 0
    for k in range(len(rings) - 1):
        A, B = rings[k], rings[k + 1]
        for i in range(n):
            j = (i + 1) % n
            q = [A[i], A[j], B[j], B[i]]
            m = 0
            if glass:
                cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4; cz = sum(p[2] for p in q) / 4
                if glass(cy + NOSE, cx, cz):
                    m = gi
            part.face(q, m)
    if cap0:
        part.face(list(reversed(rings[0])))
    if cap1:
        part.face(rings[-1])


# ------------------------------------------------------------------ fuselage + tail boom
# (s aft of the nose, half width, bottom z, top z, squareness)
FUSE = [
    (0.00, 0.06, 1.30, 1.42, 2.2),
    (0.12, 0.40, 1.02, 1.74, 2.3),
    (0.40, 0.63, 0.86, 2.04, 2.5),
    (0.85, 0.76, 0.78, 2.34, 2.8),
    (1.35, 0.80, 0.75, 2.52, 3.0),
    (2.20, 0.81, 0.75, 2.58, 3.1),
    (3.30, 0.80, 0.77, 2.58, 3.1),
    (3.90, 0.76, 0.84, 2.55, 3.0),
    (4.45, 0.64, 1.02, 2.46, 2.8),
    (5.00, 0.46, 1.32, 2.32, 2.5),
    (5.55, 0.30, 1.56, 2.18, 2.2),
    (6.20, 0.25, 1.64, 2.14, 2.0),
    (9.30, 0.16, 1.84, 2.16, 2.0),
]


def fuse_glass(s, x, z):
    if s < 0.18:
        return False
    _, zb, zt, _ = lerp_table(FUSE, s)
    if s < 1.30:  # the wrap-round windscreen, with a chin panel below it
        return z > 1.28 + 0.1 * s and z < zt - 0.1 and abs(x) > 0.02
    for s0, s1, z0, z1 in ((1.42, 2.00, 1.42, 2.32), (2.10, 3.00, 1.50, 2.30), (3.10, 3.55, 1.72, 2.22)):
        if s0 < s < s1 and z0 < z < z1:
            return True
    return False


part = Part('heli_body', ['body', 'glass', 'dark', 'skid'])
stations = [0.0, 0.04, 0.12, 0.22, 0.34, 0.48, 0.62, 0.78, 0.95, 1.12, 1.30, 1.42, 1.56, 1.72, 1.86, 2.0, 2.1, 2.24,
            2.4, 2.56, 2.72, 2.88, 3.0, 3.1, 3.3, 3.55, 3.75, 3.95, 4.2, 4.45, 4.75, 5.0, 5.3, 5.55, 5.9, 6.4, 7.2, 8.1, 9.3]
loft(part, stations, lambda s: superellipse(22, *lerp_table(FUSE, s)), glass=fuse_glass)

# engine / gearbox cowling on the roof (runs down onto the top of the boom)
COWL = [
    (1.45, 0.20, 2.40, 2.55, 2.6),
    (1.90, 0.55, 2.40, 2.84, 3.0),
    (2.80, 0.62, 2.40, 2.96, 3.2),
    (4.30, 0.56, 2.30, 2.92, 3.0),
    (5.20, 0.40, 2.10, 2.66, 2.6),
    (6.10, 0.18, 2.00, 2.26, 2.2),
]
loft(part, [1.45, 1.6, 1.9, 2.3, 2.8, 3.4, 3.9, 4.3, 4.8, 5.2, 5.6, 6.1], lambda s: superellipse(14, *lerp_table(COWL, s)))
# engine exhausts: two short dark stubs aft of the cowling
for sx in (-1, 1):
    y0 = 4.55 - NOSE
    for k in range(8):
        a0, a1 = k / 8 * math.tau, (k + 1) / 8 * math.tau
        r = 0.13
        c = (sx * 0.42, y0, 2.62)
        p = lambda a, dy: (c[0] + math.cos(a) * r, c[1] + dy, c[2] + math.sin(a) * r)
        part.face([p(a0, 0), p(a1, 0), p(a1, 0.35), p(a0, 0.35)], 2)

# mast fairing
def cyl(part, c, r0, r1, h, seg, m, cap=True, axis='z'):
    ring0, ring1 = [], []
    for k in range(seg):
        a = k / seg * math.tau
        if axis == 'z':
            ring0.append((c[0] + math.cos(a) * r0, c[1] + math.sin(a) * r0, c[2]))
            ring1.append((c[0] + math.cos(a) * r1, c[1] + math.sin(a) * r1, c[2] + h))
        elif axis == 'x':
            ring0.append((c[0], c[1] + math.cos(a) * r0, c[2] + math.sin(a) * r0))
            ring1.append((c[0] + h, c[1] + math.cos(a) * r1, c[2] + math.sin(a) * r1))
        else:  # y
            ring0.append((c[0] + math.cos(a) * r0, c[1], c[2] + math.sin(a) * r0))
            ring1.append((c[0] + math.cos(a) * r1, c[1] + h, c[2] + math.sin(a) * r1))
    for k in range(seg):
        j = (k + 1) % seg
        part.face([ring0[k], ring0[j], ring1[j], ring1[k]], m)
    if cap:
        part.face(list(reversed(ring0)), m)
        part.face(ring1, m)


cyl(part, (0, 0, 2.85), 0.30, 0.2, 0.42, 12, 0)

# ---- fenestron shroud: a thick disc with the duct through it, white over blue (painted), plus fins
FC = (0.0, 9.72 - NOSE, 2.02)   # duct centre
R_OUT, R_IN, T = 0.78, 0.50, 0.17
seg = 24
outer_p, outer_n, inner_p, inner_n = [], [], [], []
for k in range(seg):
    a = k / seg * math.tau
    # the shroud is taller than it is long: stretch it vertically, and flatten its trailing edge
    ca, sa = math.cos(a), math.sin(a)
    ro = (ca * R_OUT * (0.92 if ca > 0 else 1.0), sa * R_OUT * 1.12)
    ri = (ca * R_IN, sa * R_IN)
    outer_p.append((T, FC[1] + ro[0], FC[2] + ro[1])); outer_n.append((-T, FC[1] + ro[0], FC[2] + ro[1]))
    inner_p.append((T * 0.8, FC[1] + ri[0], FC[2] + ri[1])); inner_n.append((-T * 0.8, FC[1] + ri[0], FC[2] + ri[1]))
for k in range(seg):
    j = (k + 1) % seg
    part.face([outer_p[k], outer_p[j], outer_n[j], outer_n[k]])          # rim
    part.face([outer_p[j], outer_p[k], inner_p[k], inner_p[j]])          # +X face
    part.face([outer_n[k], outer_n[j], inner_n[j], inner_n[k]])          # -X face
    part.face([inner_p[k], inner_n[k], inner_n[j], inner_p[j]], 2)       # duct wall (dark)
# stator hub inside the duct and three struts
cyl(part, (-0.1, FC[1], FC[2]), 0.1, 0.1, 0.2, 8, 2, axis='x')
for a in (0.3, 2.4, 4.4):
    ca, sa = math.cos(a), math.sin(a)
    p0 = (FC[1] + ca * 0.1, FC[2] + sa * 0.1); p1 = (FC[1] + ca * R_IN, FC[2] + sa * R_IN)
    part.face([(-0.08, p0[0], p0[1]), (-0.08, p1[0], p1[1]), (-0.08, p1[0] + 0.03, p1[1] + 0.03), (-0.08, p0[0] + 0.03, p0[1] + 0.03)], 2)

# vertical fin above the shroud and a small ventral fin below: thin tapered slabs
def slab(part, pts_yz, half_t, m=0, x0=0.0):
    """Closed (y, z) outline extruded +-half_t in X."""
    n = len(pts_yz)
    P = [(x0 + half_t, y, z) for (y, z) in pts_yz]
    N = [(x0 - half_t, y, z) for (y, z) in pts_yz]
    part.face(P, m)
    part.face(list(reversed(N)), m)
    for k in range(n):
        j = (k + 1) % n
        part.face([P[j], P[k], N[k], N[j]], m)


slab(part, [(9.05 - NOSE, 2.70), (9.78 - NOSE, 2.78), (10.20 - NOSE, 3.62), (9.62 - NOSE, 3.62)], 0.05)
slab(part, [(9.35 - NOSE, 1.25), (10.10 - NOSE, 1.20), (10.20 - NOSE, 0.95), (9.80 - NOSE, 0.92)], 0.04)
# horizontal stabiliser with end plates
hs_y0, hs_y1, hs_z = 7.95 - NOSE, 8.45 - NOSE, 1.98
part.face([(1.3, hs_y0, hs_z), (-1.3, hs_y0, hs_z), (-1.3, hs_y1, hs_z + 0.02), (1.3, hs_y1, hs_z + 0.02)], 3)
part.face([(1.3, hs_y1, hs_z - 0.04), (-1.3, hs_y1, hs_z - 0.04), (-1.3, hs_y0, hs_z - 0.06), (1.3, hs_y0, hs_z - 0.06)], 3)
part.face([(1.3, hs_y0, hs_z - 0.06), (-1.3, hs_y0, hs_z - 0.06), (-1.3, hs_y0, hs_z), (1.3, hs_y0, hs_z)], 3)
part.face([(-1.3, hs_y1, hs_z - 0.04), (1.3, hs_y1, hs_z - 0.04), (1.3, hs_y1, hs_z + 0.02), (-1.3, hs_y1, hs_z + 0.02)], 3)
for sx in (-1, 1):
    slab(part, [(hs_y0 - 0.12, hs_z - 0.35), (hs_y1 + 0.1, hs_z - 0.3), (hs_y1 + 0.16, hs_z + 0.35), (hs_y0 + 0.05, hs_z + 0.3)], 0.025, 3, x0=sx * 1.32)

# ---- skids: two tubes with an upturned front and two curved cross tubes
def tube(part, path, r, m, seg=6):
    rings = []
    for i, p in enumerate(path):
        p = Vector(p)
        d = (Vector(path[min(i + 1, len(path) - 1)]) - Vector(path[max(i - 1, 0)])).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        a = d.cross(up).normalized(); b = a.cross(d).normalized()
        rings.append([p + (a * math.cos(k / seg * math.tau) + b * math.sin(k / seg * math.tau)) * r for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg):
            j = (k + 1) % seg
            part.face([rings[i][k], rings[i][j], rings[i + 1][j], rings[i + 1][k]], m)


for sx in (-1, 1):
    x = sx * 1.02
    tube(part, [(x, 1.45, 0.06), (x, -1.9, 0.06), (x, -2.25, 0.1), (x, -2.45, 0.22), (x, -2.52, 0.34)], 0.045, 3)
    for yc in (-1.05, 0.95):
        tube(part, [(x, yc, 0.06), (x * 0.97, yc, 0.4), (x * 0.82, yc, 0.68), (x * 0.52, yc, 0.8)], 0.05, 3)
# camera turret (FLIR ball) under the nose
def ball(part, c, r, m, seg=10, rings=6):
    pts = [[(c[0] + r * math.sin(math.pi * i / rings) * math.cos(k / seg * math.tau),
             c[1] + r * math.sin(math.pi * i / rings) * math.sin(k / seg * math.tau),
             c[2] + r * math.cos(math.pi * i / rings)) for k in range(seg)] for i in range(rings + 1)]
    for i in range(rings):
        for k in range(seg):
            j = (k + 1) % seg
            part.face([pts[i][k], pts[i + 1][k], pts[i + 1][j], pts[i][j]], m)


ball(part, (0.0, 0.45 - NOSE, 0.84), 0.2, 2)
# searchlight housing: a short drum under the cabin on the right side (-X), lens facing forward (-Y)
SL = (-0.62, 1.2 - NOSE, 0.62)
cyl(part, (SL[0], SL[1] + 0.32, SL[2]), 0.15, 0.15, -0.3, 10, 2, axis='y')
cyl(part, (SL[0], SL[1] + 0.34, SL[2] + 0.05), 0.05, 0.05, 0.25, 6, 3)   # mount
body = part.finish(livery=True)
body['livery_len'] = LEN
body['livery_z0'] = Z0
body['livery_z1'] = Z1
body['livery_nose'] = NOSE

# small lights: lens of the searchlight, nav lights (red on the left... the helicopter's left is +X), tail strobe
lamps = Part('heli_lamps', ['lens', 'nav_red', 'nav_green', 'strobe'])
cyl(lamps, (SL[0], SL[1] + 0.02, SL[2]), 0.13, 0.13, -0.01, 10, 0, axis='y')
ball(lamps, (0.82, 2.0 - NOSE, 2.4), 0.05, 1, 6, 3)
ball(lamps, (-0.82, 2.0 - NOSE, 2.4), 0.05, 2, 6, 3)
ball(lamps, (0.0, 10.18 - NOSE, 3.64), 0.05, 3, 6, 3)
lamps.finish()

# searchlight node: at the lens, for the game to hang its beam on
sl = bpy.data.objects.new('searchlight', None)
sl.location = (SL[0], SL[1] - 0.02, SL[2])
bpy.context.collection.objects.link(sl)

# ------------------------------------------------------------------ main rotor: hub + 4 blades
HUB = (0.0, 0.0, 3.34)
rot = Part('rotor_main', ['blade', 'hub'])
cyl(rot, (0, 0, 3.22), 0.16, 0.16, 0.14, 10, 1)
# dome cap on the hub
for i in range(3):
    z0 = 3.36 + i * 0.05; z1 = z0 + 0.05
    r0 = 0.34 * math.cos(i / 3 * math.pi / 2); r1 = 0.34 * math.cos((i + 1) / 3 * math.pi / 2)
    cyl(rot, (0, 0, z0), r0, max(r1, 0.02), 0.05, 12, 1, cap=(i == 2))
for k in range(4):
    a = k * math.pi / 2 + math.pi / 4
    d = Vector((math.cos(a), math.sin(a), 0)); n = Vector((-math.sin(a), math.cos(a), 0))
    r0, r1, chord, th = 0.3, 5.1, 0.29, 0.035
    # blades droop a touch at rest (the game levels them with rotor speed? no: kept flat, reads fine spinning)
    pts = []
    for r, c, z in ((r0, chord * 0.7, 3.36), (0.9, chord, 3.37), (r1 - 0.25, chord, 3.36), (r1, chord * 0.55, 3.35)):
        pts.append((d * r + n * (c / 2), d * r - n * (c / 2), z))
    for i in range(len(pts) - 1):
        (a0, b0, z0), (a1, b1, z1) = pts[i], pts[i + 1]
        top = [Vector((a0.x, a0.y, z0 + th / 2)), Vector((b0.x, b0.y, z0 + th / 2)), Vector((b1.x, b1.y, z1 + th / 2)), Vector((a1.x, a1.y, z1 + th / 2))]
        bot = [Vector((p.x, p.y, p.z - th)) for p in top]
        rot.face(top, 0)
        rot.face(list(reversed(bot)), 0)
        rot.face([top[0], top[3], bot[3], bot[0]], 0)
        rot.face([top[2], top[1], bot[1], bot[2]], 0)
    a1_, b1_, z1_ = pts[-1]
    rot.face([Vector((a1_.x, a1_.y, z1_ + th / 2)), Vector((b1_.x, b1_.y, z1_ + th / 2)), Vector((b1_.x, b1_.y, z1_ - th / 2)), Vector((a1_.x, a1_.y, z1_ - th / 2))], 0)
rot.finish(origin=HUB, smooth_angle=25)

# ------------------------------------------------------------------ fenestron fan: 10 blades about the duct axis (X)
fan = Part('rotor_tail', ['blade', 'hub'])
for k in range(10):
    a = k / 10 * math.tau
    ca, sa = math.cos(a), math.sin(a)
    na, nb = -sa, ca
    r0, r1, w = 0.1, R_IN - 0.03, 0.06
    y = lambda r, o: FC[1] + ca * r + na * o
    z = lambda r, o: FC[2] + sa * r + nb * o
    # a slight pitch: leading edge at +x
    fan.face([(0.03, y(r0, -w), z(r0, -w)), (0.03, y(r1, -w), z(r1, -w)), (-0.03, y(r1, w), z(r1, w)), (-0.03, y(r0, w), z(r0, w))], 0)
    fan.face([(-0.03, y(r0, w), z(r0, w)), (-0.03, y(r1, w), z(r1, w)), (0.03, y(r1, -w), z(r1, -w)), (0.03, y(r0, -w), z(r0, -w))], 0)
cyl(fan, (-0.07, FC[1], FC[2]), 0.09, 0.09, 0.14, 8, 1, axis='x')
fan.finish(origin=(0.0, FC[1], FC[2]), smooth_angle=20)

tri = sum(len(p.vertices) - 2 for ob in bpy.data.objects if ob.type == 'MESH' for p in ob.data.polygons)
print('TRIANGLES', tri)

path = os.path.join(OUT, 'heli.glb')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                          export_extras=True, export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=6, export_draco_position_quantization=14,
                          export_draco_normal_quantization=10, export_draco_texcoord_quantization=12)
print('EXPORTED', path, os.path.getsize(path))

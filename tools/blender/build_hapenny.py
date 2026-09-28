"""Ha'penny Bridge (Liffey Bridge, 1816) as a hero GLB.

Run headless:  blender -b --factory-startup -P tools/blender/build_hapenny.py -- public/models models

Sources (docs/research/hapenny-bridge.md): span 43 m, deck 3.66 m wide, rise ~3 m (1:12.8 at the stretched
span); three lamps on openwork ogee arches at -13 / 0 / +13 m; a band of X-latticed cells between rib and deck on
both faces; plain vertical-bar railings with urn newels; ribs tied by lattice bracing, springing from granite
abutments at water level; stone steps between curved granite wing walls onto the quays.

Axes: Blender +Y runs along the deck from the north (Liffey St) landing to the south (Merchant's Arch) landing,
X across, Z up; origin at mid-span on the quay-level datum (the game's y = 0). Water is at Z = -2.6.
UVs point into a 1024 atlas the game paints at load (src/world/heroes.js):
  [0,0,256,160] X-cell tile   [256,0,256,256] railing tile   [512,0,512,512] lamp-arch filigree
  [0,512,512,512] granite
Materials: hp_iron (white paint), hp_cut (alpha cut-outs), hp_granite, hp_asphalt, hp_lantern.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
os.makedirs(OUT, exist_ok=True); os.makedirs(SRC, exist_ok=True)

SPAN, W, END, RISE, WATER = 43.0, 3.66, 1.0, 3.0, -2.6
HS = SPAN / 2
ATLAS = 1024
REG = dict(xcell=(0, 0, 256, 160), rail=(256, 0, 256, 256), fili=(512, 0, 512, 512), granite=(0, 512, 512, 512))


def deck_y(y):
    t = max(-1.0, min(1.0, y / HS))
    return END + RISE * (1 - t * t)


def rib_y(y):
    # springs from the abutments just above the water, rising to 0.75 m under the deck crown
    t = max(-1.0, min(1.0, y / (HS + 0.6)))
    lo, hi = WATER + 0.5, deck_y(0) - 0.75
    return lo + (hi - lo) * (1 - t * t) ** 0.62


def uv(region, s, t):
    """s, t in 0..1 within the region (t = 0 at the top of the region as painted)."""
    u0, v0, w, h = REG[region]
    return ((u0 + s * w) / ATLAS, 1 - (v0 + t * h) / ATLAS)


class Mesh:
    """Accumulates quads/tris for one material."""
    def __init__(self, name):
        self.name, self.bm = name, bmesh.new()
        self.uvl = self.bm.loops.layers.uv.new('UVMap')

    def poly(self, pts, uvs=None):
        vs = [self.bm.verts.new(p) for p in pts]
        f = self.bm.faces.new(vs)
        for i, l in enumerate(f.loops):
            l[self.uvl].uv = uvs[i] if uvs else (0.99, 0.01)
        return f

    def box(self, c, size, rot=None):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
            if rot is not None:
                v.co = rot @ v.co
            v.co += Vector(c)
        for f in bm.faces:
            self.poly([v.co.copy() for v in f.verts])
        bm.free()

    def cyl(self, c, r_bot, r_top, h, seg=10):
        pts = []
        for k in range(seg):
            a0, a1 = k / seg * math.tau, (k + 1) / seg * math.tau
            p = lambda a, r, z: (c[0] + math.cos(a) * r, c[1] + math.sin(a) * r, c[2] + z)
            self.poly([p(a0, r_bot, 0), p(a1, r_bot, 0), p(a1, r_top, h), p(a0, r_top, h)])
        self.poly([(c[0] + math.cos(k / seg * math.tau) * r_top, c[1] + math.sin(k / seg * math.tau) * r_top, c[2] + h) for k in range(seg)])

    def build(self, material, smooth=30):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts[:], dist=1e-5)
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me); self.bm.free()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.collection.objects.link(ob)
        ob.data.materials.append(material)
        for p in ob.data.polygons:
            p.use_smooth = True
        if hasattr(ob.data, 'set_sharp_from_angle'):
            ob.data.set_sharp_from_angle(angle=math.radians(smooth))
        return ob


def mat(name, rgb, rough=0.5, metal=0.0, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 1.0
    return m


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = dict(iron=mat('hp_iron', (0.84, 0.8, 0.74), 0.4), cut=mat('hp_cut', (1, 1, 1), 0.45),
             granite=mat('hp_granite', (0.26, 0.24, 0.22), 0.8), asphalt=mat('hp_asphalt', (0.05, 0.05, 0.05), 0.85),
             lantern=mat('hp_lantern', (0.6, 0.62, 0.66), 0.1, emit=(1.0, 0.8, 0.55)))
    iron, cut, granite, asphalt, lantern = (Mesh(n) for n in ('iron', 'cut', 'granite', 'asphalt', 'lantern'))
    N = 44
    ys = [-HS + SPAN * i / N for i in range(N + 1)]

    # ---- deck: asphalt walking surface on an iron slab with a fascia each side
    for a, b in zip(ys, ys[1:]):
        za, zb = deck_y(a), deck_y(b)
        asphalt.poly([(-W / 2, a, za), (W / 2, a, za), (W / 2, b, zb), (-W / 2, b, zb)])
        iron.poly([(-W / 2, b, zb - 0.25), (W / 2, b, zb - 0.25), (W / 2, a, za - 0.25), (-W / 2, a, za - 0.25)])
        for s in (-1, 1):
            x = s * W / 2
            q = [(x, a, za - 0.25), (x, b, zb - 0.25), (x, b, zb + 0.06), (x, a, za + 0.06)]
            iron.poly(q if s > 0 else q[::-1])

    # ---- spandrel band: X-latticed cells between rib and deck, one tile per 1.2 m x 0.7 m cell
    cell_w, cell_h = 1.2, 0.7
    ncell = int(SPAN / cell_w)
    for i in range(ncell):
        a, b = -HS + i * SPAN / ncell, -HS + (i + 1) * SPAN / ncell
        top_a, top_b = deck_y(a) - 0.25, deck_y(b) - 0.25
        bot = max(rib_y(a), rib_y(b))
        z = min(top_a, top_b)
        rows = []
        while z - cell_h > bot - 0.2:
            rows.append((z - cell_h, z)); z -= cell_h
        rows.append((min(rib_y(a), rib_y(b)), z)) if z > bot else None
        for s in (-1, 1):
            x = s * (W / 2 - 0.05)
            for k, (z0, z1) in enumerate(rows):
                za1 = top_a if k == 0 else z1
                zb1 = top_b if k == 0 else z1
                za0 = max(z0, rib_y(a)); zb0 = max(z0, rib_y(b))
                frac = (z1 - z0) / cell_h
                q = [(x, a, za0), (x, b, zb0), (x, b, zb1), (x, a, za1)]
                u = [uv('xcell', 0, frac), uv('xcell', 1, frac), uv('xcell', 1, 0), uv('xcell', 0, 0)]
                cut.poly(q if s > 0 else q[::-1], u if s > 0 else u[::-1])

    # ---- ribs: three box-section cast-iron ribs under the deck, joined by transverse ties
    for x in (-W / 2 + 0.12, 0.0, W / 2 - 0.12):
        for a, b in zip(ys, ys[1:]):
            za, zb = rib_y(a), rib_y(b)
            for dx0, dx1, dz0, dz1 in ((-0.08, 0.08, 0, 0), ):
                iron.poly([(x - 0.08, a, za), (x + 0.08, a, za), (x + 0.08, b, zb), (x - 0.08, b, zb)])
                iron.poly([(x + 0.08, a, za - 0.35), (x - 0.08, a, za - 0.35), (x - 0.08, b, zb - 0.35), (x + 0.08, b, zb - 0.35)])
                for sx in (-1, 1):
                    q = [(x + sx * 0.08, a, za - 0.35), (x + sx * 0.08, b, zb - 0.35), (x + sx * 0.08, b, zb), (x + sx * 0.08, a, za)]
                    iron.poly(q if sx > 0 else q[::-1])
    for y in [-HS + SPAN * i / 12 for i in range(1, 12)]:
        iron.box((0, y, rib_y(y) - 0.2), (W - 0.3, 0.08, 0.08))
        # diagonal lattice bracing between the ribs: two ties crossing between each pair of transverse ties
        for s_ in (-1, 1):
            y2 = y + SPAN / 24
            p0 = Vector((-W / 2 + 0.12, y, rib_y(y) - 0.2)); p1 = Vector((W / 2 - 0.12, y2, rib_y(y2) - 0.2))
            if s_ < 0: p0.x, p1.x = -p0.x, -p1.x
            d = p1 - p0
            iron.box(tuple((p0 + p1) / 2), (0.05, d.length, 0.05), d.to_track_quat('Y', 'Z').to_matrix())

    # ---- railings: one tile of bars per metre, both sides, top rail and handrail as solid iron
    for s in (-1, 1):
        x = s * (W / 2 - 0.03)
        for a, b in zip(ys, ys[1:]):
            za, zb = deck_y(a), deck_y(b)
            q = [(x, a, za), (x, b, zb), (x, b, zb + 1.15), (x, a, za + 1.15)]
            u = [uv('rail', 0, 1), uv('rail', 1, 1), uv('rail', 1, 0), uv('rail', 0, 0)]
            cut.poly(q if s > 0 else q[::-1], u if s > 0 else u[::-1])
            iron.box((x, (a + b) / 2, (za + zb) / 2 + 1.16), (0.07, abs(b - a) + 0.02, 0.06), Matrix.Rotation(math.atan2(zb - za, b - a), 3, 'X'))
        # urn-topped newel posts at the four ends of the deck
        for yend in (-HS, HS):
            c = (x, yend, deck_y(yend))
            iron.box((c[0], c[1], c[2] + 0.45), (0.28, 0.28, 0.9))
            iron.cyl((c[0], c[1], c[2] + 0.9), 0.1, 0.16, 0.18, 8)
            iron.cyl((c[0], c[1], c[2] + 1.08), 0.16, 0.08, 0.22, 8)
            iron.cyl((c[0], c[1], c[2] + 1.3), 0.08, 0.02, 0.14, 8)

    # ---- lamp arches: openwork ogee filigree across the deck (double card) and a lantern at the apex
    for y in (-13.0, 0.0, 13.0):
        z0 = deck_y(y)
        for dy in (-0.04, 0.04):
            q = [(-W / 2, y + dy, z0 + 1.1), (W / 2, y + dy, z0 + 1.1), (W / 2, y + dy, z0 + 3.4), (-W / 2, y + dy, z0 + 3.4)]
            u = [uv('fili', 0, 1), uv('fili', 1, 1), uv('fili', 1, 0), uv('fili', 0, 0)]
            cut.poly(q, u)
            cut.poly(q[::-1], u[::-1])
        lz = z0 + 3.4
        iron.box((0, y, lz + 0.05), (0.22, 0.22, 0.1))
        lantern.box((0, y, lz + 0.35), (0.3, 0.3, 0.5))
        for sx in (-1, 1):
            for sy in (-1, 1):
                iron.box((sx * 0.16, y + sy * 0.16, lz + 0.35), (0.03, 0.03, 0.52))
        iron.cyl((0, y, lz + 0.6), 0.24, 0.02, 0.3, 4)
        iron.cyl((0, y, lz + 0.9), 0.04, 0.02, 0.12, 6)

    # ---- abutments, wing walls, steps (granite): at each end, from the quay wall line back onto the footpath
    def gpoly(pts, scale=2.0):
        # granite UVs from world position (planar by dominant axis), wrapped into the granite tile
        e1, e2 = Vector(pts[1]) - Vector(pts[0]), Vector(pts[2]) - Vector(pts[0])
        n = e1.cross(e2)
        ax = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(0, 1, 2)[i] for i in range(3) if i != ax]
        us = [uv('granite', (p[a] / scale) % 1.0 * 0.98 + 0.01, (p[b] / scale) % 1.0 * 0.98 + 0.01) for p in pts]
        granite.poly(pts, us)

    def gbox(c, size):
        x0, x1, y0, y1, z0, z1 = c[0] - size[0] / 2, c[0] + size[0] / 2, c[1] - size[1] / 2, c[1] + size[1] / 2, c[2], c[2] + size[2]
        V = lambda i, j, k: (x1 if i else x0, y1 if j else y0, z1 if k else z0)
        faces = [((0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)), ((0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)),
                 ((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)), ((1, 1, 0), (0, 1, 0), (0, 1, 1), (1, 1, 1)),
                 ((0, 1, 0), (0, 0, 0), (0, 0, 1), (0, 1, 1)), ((1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1))]
        for f in faces:
            gpoly([V(*v) for v in f])

    for s in (-1, 1):  # -1 north end, +1 south end
        wall = s * HS
        # abutment pier against the quay wall, down to the water
        gbox((0, wall - s * 0.6, WATER - 0.4), (W + 1.4, 1.2, END - WATER + 0.3))
        # steps from the deck end down onto the quay footpath (compressed: the game footpath is ~2.4 m)
        nst, run = 7, 2.2
        for k in range(nst):
            h = END - (k + 1) * END / nst
            y0 = wall + s * k * run / nst
            gbox((0, y0 + s * run / nst / 2, -0.02), (W + 0.4, run / nst, h + 0.02 + END / nst))
        # curved wing walls sweeping down beside the steps
        for sx in (-1, 1):
            for k in range(8):
                t0, t1 = k / 8, (k + 1) / 8
                r = 1.6
                a0, a1 = t0 * math.pi / 2, t1 * math.pi / 2
                p0 = (sx * (W / 2 + 0.2 + r * (1 - math.cos(a0))), wall + s * r * math.sin(a0))
                p1 = (sx * (W / 2 + 0.2 + r * (1 - math.cos(a1))), wall + s * r * math.sin(a1))
                h0 = END + 0.9 - (END + 0.6) * t0
                h1 = END + 0.9 - (END + 0.6) * t1
                th = 0.35
                for off in (0, th):
                    pass
                q = [(p0[0], p0[1], -0.05), (p1[0], p1[1], -0.05), (p1[0], p1[1], h1), (p0[0], p0[1], h0)]
                gpoly(q if sx * s > 0 else q[::-1])
                qi = [(p0[0] - sx * th, p0[1], -0.05), (p0[0] - sx * th, p0[1], h0), (p1[0] - sx * th, p1[1], h1), (p1[0] - sx * th, p1[1], -0.05)]
                gpoly(qi if sx * s > 0 else qi[::-1])
                gpoly([(p0[0], p0[1], h0), (p1[0], p1[1], h1), (p1[0] - sx * th, p1[1], h1), (p0[0] - sx * th, p0[1], h0)][::(1 if sx * s > 0 else -1)])

    objs = [iron.build(M['iron']), cut.build(M['cut'], 80), granite.build(M['granite']), asphalt.build(M['asphalt']), lantern.build(M['lantern'])]
    tris = 0
    for ob in objs:
        me = ob.data; me.calc_loop_triangles(); tris += len(me.loop_triangles)
    print('TRIANGLES', tris)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC, 'hapenny.blend'))
    path = os.path.join(OUT, 'hapenny.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    print('EXPORTED', path, os.path.getsize(path))


build()
print('DONE')

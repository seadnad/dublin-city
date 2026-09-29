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


class Part:
    def __init__(self, name, tile=4.0):
        self.name, self.tile = name, tile
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')

    def face(self, pts, uvs=None):
        vs = [self.bm.verts.new(Vector(p)) for p in pts]
        try:
            f = self.bm.faces.new(vs)
        except ValueError:
            return None
        if uvs is None:
            # planar projection by dominant normal, metres / tile
            n = (Vector(pts[1]) - Vector(pts[0])).cross(Vector(pts[2]) - Vector(pts[0]))
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


def material(name, rgb, rough=0.8):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    return m


def bake_ao_vertex(objs, distance=3.0, samples=24, subdiv=3.0, skip=()):
    """Bake ambient occlusion into a vertex colour layer on every object (Cycles). Edges longer than `subdiv` metres
    are split once first so the AO has vertices to live on (None: no split). Objects in `skip` get no bake."""
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
    decals = [o for o in objs if o.name.endswith('decal')]
    for o in decals:
        o.hide_render = True
    for ob in objs:
        if ob in decals or ob in skip:
            continue
        me = ob.data
        # subdivide big faces a little so the per-vertex AO has somewhere to live
        bm = bmesh.new(); bm.from_mesh(me)
        long = [e for e in bm.edges if e.calc_length() > subdiv] if subdiv else []
        if long:
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

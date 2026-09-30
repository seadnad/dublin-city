"""Build the Garda Hyundai i40 Tourer patrol car and export it as a Draco-compressed GLB.

Run headless:
  blender -b --factory-startup -P tools/blender/build_garda.py -- public/models models

Outputs  public/models/garda.glb     the car (one model; the livery is painted at runtime onto the body atlas)
         public/models/garda_ao.png  ambient occlusion baked onto the body atlas (multiplied into the livery)
         models/garda.blend          the source scene

Construction (i40 Tourer, 4.775 x 1.815 x 1.47 m, wheelbase 2.77 m, 215/55 R16):
  - body shell: ONE lofted mesh through ~55 cross-sections. Each section runs from the underbody up the rocker,
    out to the widest point, over a sharp shoulder crease (headlight to tail light, rising to the rear), in to the
    belt and up a tumbled-home glasshouse to the roof. Over the bonnet and below the tailgate the glasshouse
    points collapse onto a crowned panel, so windscreen, roof, tailgate and bonnet are all one surface.
    Plan-view taper rounds the nose and tail; the lower body flares over the wheels.
  - wheel arches are cut into the shell. Lamps, grille and plates are projected as shallow layers, avoiding
    pinched Boolean triangles across the bonnet and tailgate while keeping their outlines crisp.
  - glazing and small trim are projected onto the shell (raycast), so they follow its curvature exactly.
  - UVs: every body face is planar-projected by its dominant direction into an atlas region (sides, top, front,
    rear). The layout is exported as glTF extras on the body so the game paints the livery with the same maps.
Axes: Blender X = width, +Y = forward, +Z = up; origin at ground centre. The glTF export turns +Y into -Z and the
game turns the model round to face +Z, like every other car.
"""
import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
os.makedirs(OUT, exist_ok=True); os.makedirs(SRC, exist_ok=True)

# ------------------------------------------------------------------ dimensions
L, HW = 4.775, 0.9075            # length, half width
HL = L / 2
YF, YR = 1.4575, -1.3125         # axle positions (front overhang 0.93, wheelbase 2.77)
R, TW, TRACK = 0.325, 0.215, 0.795  # tyre radius, tyre width, half track
ARCH_R, ARCH_Z = 0.385, R + 0.03


def clamp(v, a, b): return max(a, min(b, v))
def lerp(a, b, t): return a + (b - a) * t
def sstep(a, b, x):
    t = clamp((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def curve(knots):
    """Monotone cubic (Fritsch-Carlson) through [(y, z)] knots: smooth, no overshoot."""
    xs = [k[0] for k in knots]; ys = [k[1] for k in knots]
    n = len(xs)
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0]] + [0.0 if d[i - 1] * d[i] <= 0 else (d[i - 1] + d[i]) / 2 for i in range(1, n - 1)] + [d[-1]]
    for i in range(n - 1):
        if d[i] == 0:
            m[i] = m[i + 1] = 0
        else:
            a, b = m[i] / d[i], m[i + 1] / d[i]
            s = a * a + b * b
            if s > 9:
                t = 3 / math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]

    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = max(k for k in range(n - 1) if xs[k] <= x)
        h = xs[i + 1] - xs[i]; t = (x - xs[i]) / h
        h00 = 2 * t ** 3 - 3 * t ** 2 + 1; h10 = t ** 3 - 2 * t ** 2 + t; h01 = -2 * t ** 3 + 3 * t ** 2; h11 = t ** 3 - t ** 2
        return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]
    return f


# side-view lines of the car (y from tail -2.3875 to nose +2.3875)
ztop = curve([(-HL, 0.86), (-2.36, 0.94), (-2.32, 1.01), (-2.27, 1.13), (-2.2, 1.30), (-2.13, 1.395), (-2.02, 1.43),
              (-1.6, 1.448), (-0.8, 1.462), (-0.2, 1.458), (0.1, 1.44), (0.45, 1.30), (0.75, 1.135), (0.97, 0.995),
              (1.3, 0.945), (1.8, 0.875), (2.15, 0.805), (2.3, 0.755), (HL, 0.70)])
zbelt = curve([(-HL, 1.04), (-1.9, 1.035), (-1.0, 1.012), (0.0, 0.992), (0.97, 0.978), (HL, 0.95)])
zcrease = curve([(-HL, 0.905), (-2.2, 0.915), (-1.5, 0.893), (0.0, 0.855), (1.2, 0.815), (2.0, 0.785), (HL, 0.745)])
zbot = curve([(-HL, 0.34), (-2.2, 0.30), (-1.95, 0.21), (-1.7, 0.175), (1.9, 0.175), (2.15, 0.23), (HL, 0.30)])


def plan(y):
    """Plan-view half-width factor: rounds the nose and tail."""
    sf = clamp((y - 1.85) / (HL - 1.85), 0, 1)
    sr = clamp((-1.95 - y) / (HL - 1.95), 0, 1)
    p = 1 - 0.10 * sf ** 2 - 0.07 * sr ** 2
    e = clamp((abs(y) - (HL - 0.09)) / 0.09, 0, 1)
    return p * (1 - 0.05 * e ** 0.6)


def upper_taper(y):
    sf = clamp((y - 1.6) / (HL - 1.6), 0, 1)
    sr = clamp((-2.0 - y) / (HL - 2.0), 0, 1)
    return 1 - 0.09 * sf ** 1.5 - 0.04 * sr ** 1.5


def flare(y):
    return 0.024 * max(math.exp(-((y - YF) / 0.5) ** 2), math.exp(-((y - YR) / 0.5) ** 2))


def roof_hw(y):
    return 0.655 - 0.03 * clamp((-1.4 - y) / 0.7, 0, 1)


def section(y):
    """Right-hand half cross-section: 15 (x, z) points from underbody centre to roof centre."""
    hw = HW * plan(y)
    fl = 1 + flare(y)
    zt = ztop(y); zb0 = zbot(y); zs = zb0 + 0.08
    zbl = zbelt(y)
    hwsh = hw * 0.955 * upper_taper(y)
    edge = min(zbl, zt - 0.045)
    zc = min(zcrease(y), edge - 0.05)
    zm = clamp(0.56, zs + 0.08, zc - 0.08)
    lower = [(0.0, zb0), (hw * 0.80, zb0), (hw * 0.955, zs - 0.02), (hw * 0.99 * fl, zs + 0.10), (hw * fl, zm),
             (hw * 0.998 * fl, zc - 0.06), (hw * 1.006 * fl, zc), (hw * 0.978, zc + 0.02), (hw * 0.962, edge - 0.03)]
    hg = zt - zbl
    k = sstep(0.0, 0.14, hg)
    bonnet = [(hwsh * t, zt - (zt - edge) * t ** 2) for t in (1.0, 0.9, 0.72, 0.5, 0.25, 0.0)]
    hrt = roof_hw(y)
    glass = [(hwsh, edge), (hwsh - 0.045, zbl + 0.012), (hrt, zt - 0.075), (hrt - 0.07, zt - 0.022), (hrt * 0.5, zt - 0.004), (0.0, zt)]
    upper = [(lerp(b[0], g[0], k), lerp(b[1], g[1], k)) for b, g in zip(bonnet, glass)]
    pts = lower + upper
    out = [pts[0]]
    for x, z in pts[1:]:
        out.append((x, max(z, out[-1][1] + 0.002)))
    return out


def stations():
    ys = [-HL, -2.375, -2.36, -2.34, -2.315, -2.285, -2.25, -2.21, -2.165, -2.115, -2.06, -2.0, -1.92]
    y = -1.8
    while y < 0.9:
        ys.append(round(y, 4)); y += 0.12
    ys += [0.9, 0.97, 1.05, 1.15]
    y = 1.27
    while y < 2.1:
        ys.append(round(y, 4)); y += 0.12
    ys += [2.1, 2.17, 2.23, 2.28, 2.32, 2.35, 2.37, 2.38, HL]
    return sorted(set(ys))


# ------------------------------------------------------------------ Blender helpers
def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


MATS = {}


def mat(name, hexcol, metal=0.0, rough=0.5, emit=None, strength=0.0, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(hexcol), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    MATS[name] = m
    return m


def link(ob):
    bpy.context.collection.objects.link(ob)
    return ob


def mesh_obj(name, bm, material, smooth_angle=40):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me))
    if material:
        ob.data.materials.append(material)
    set_smooth(ob, smooth_angle)
    return ob


def set_smooth(ob, angle):
    for p in ob.data.polygons:
        p.use_smooth = True
    if hasattr(ob.data, 'set_sharp_from_angle'):
        ob.data.set_sharp_from_angle(angle=math.radians(angle))


def activate(ob):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)


def boolean(target, cutter, op='DIFFERENCE'):
    mod = target.modifiers.new('bool', 'BOOLEAN')
    mod.operation = op
    mod.solver = 'EXACT'
    mod.object = cutter
    activate(target)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def box(name, size, loc, material, bevel=0.0, rot=(0, 0, 0), segs=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segs, affect='EDGES', profile=0.5)
    ob = mesh_obj(name, bm, material, 30)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def lathe(name, profile, segs, material, loc, side=1, smooth_angle=45):
    """Revolve [(radius, lateral offset)] about the X axis (lateral offset * side along X)."""
    bm = bmesh.new()
    rings = []
    for r, dx in profile:
        ring = []
        for s in range(segs):
            a = s / segs * math.tau
            ring.append(bm.verts.new((dx * side, math.cos(a) * r, math.sin(a) * r)))
        rings.append(ring)
    for ra, rb in zip(rings, rings[1:]):
        for s in range(segs):
            t = (s + 1) % segs
            bm.faces.new((ra[s], ra[t], rb[t], rb[s]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ob = mesh_obj(name, bm, material, smooth_angle)
    ob.location = loc
    return ob


def join(objs, name):
    activate(objs[0])
    for o in objs:
        o.select_set(True)
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob


def apply_transforms(ob):
    activate(ob)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


# ------------------------------------------------------------------ projection (raycast) helpers
# 2D coordinates per view: front/rear -> (x, z); right/left -> (y, z); top -> (x, y)
VIEWS = {
    'front': (lambda a, b: Vector((a, 8.0, b)), Vector((0, -1, 0))),
    'rear': (lambda a, b: Vector((a, -8.0, b)), Vector((0, 1, 0))),
    'right': (lambda a, b: Vector((8.0, a, b)), Vector((-1, 0, 0))),
    'left': (lambda a, b: Vector((-8.0, a, b)), Vector((1, 0, 0))),
    'top': (lambda a, b: Vector((a, b, 8.0)), Vector((0, 0, -1))),
}


class Surface:
    """Raycast target built from objects (world space)."""
    def __init__(self, objs):
        self.trees = []
        dg = bpy.context.evaluated_depsgraph_get()
        for ob in objs:
            bm = bmesh.new(); bm.from_object(ob, dg); bm.transform(ob.matrix_world)
            self.trees.append(BVHTree.FromBMesh(bm)); bm.free()

    def cast(self, origin, direction):
        best = None
        for t in self.trees:
            loc, nrm, _, dist = t.ray_cast(origin, direction)
            if loc is not None and (best is None or dist < best[2]):
                best = (loc, nrm, dist)
        return best


def poly_grid(poly, cuts=3):
    bm = bmesh.new()
    vs = [bm.verts.new((a, b, 0)) for a, b in poly]
    edges = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges)
    if cuts:
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    return bm


def project(bm, view, surf, offset, min_facing=0.2):
    """Move a 2D bmesh onto the surface; returns {vert: normal}. Faces with a missing/grazing hit are removed."""
    to3, direction = VIEWS[view]
    bad, normals = set(), {}
    for v in bm.verts:
        h = surf.cast(to3(v.co.x, v.co.y), direction)
        if h is None or h[1].dot(-direction) < min_facing:
            bad.add(v); continue
        normals[v] = h[1].copy()
        v.co = h[0] + h[1] * offset
    for f in [f for f in bm.faces if any(v in bad for v in f.verts)]:
        bm.faces.remove(f)
    for v in [v for v in bm.verts if not v.link_faces]:
        bm.verts.remove(v)
    bm.normal_update()
    flip = [f for f in bm.faces if f.normal.dot(sum((normals.get(v, Vector()) for v in f.verts), Vector())) < 0]
    if flip:
        bmesh.ops.reverse_faces(bm, faces=flip)
    return normals


def decal(name, poly, view, surf, material, offset=0.004, cuts=3, min_facing=0.2):
    bm = poly_grid(poly, cuts)
    project(bm, view, surf, offset, min_facing)
    return mesh_obj(name, bm, material, 60)


def cutter(poly, view, surf, depth, out=0.06, cuts=2, min_facing=0.15):
    """Closed solid following the surface inside a 2D outline: from `out` above it to `depth` below it."""
    grid = poly_grid(poly, cuts)
    to3, direction = VIEWS[view]
    hits = {}
    for v in grid.verts:
        h = surf.cast(to3(v.co.x, v.co.y), direction)
        if h is not None and h[1].dot(-direction) >= min_facing:
            hits[v] = h
    bm = bmesh.new()
    top, bot = {}, {}
    faces = [f for f in grid.faces if all(v in hits for v in f.verts)]
    for f in faces:
        for v in f.verts:
            if v not in top:
                p, n = hits[v][0], hits[v][1]
                top[v] = bm.verts.new(p + n * out)
                bot[v] = bm.verts.new(p - n * depth)
    for f in faces:
        vs = list(f.verts)
        bm.faces.new([top[v] for v in vs])
        bm.faces.new([bot[v] for v in reversed(vs)])
    fs = set(faces)
    for e in grid.edges:
        lf = [f for f in e.link_faces if f in fs]
        if len(lf) != 1:
            continue
        f = lf[0]
        loop = next(l for l in f.loops if l.edge == e)
        a, b = loop.vert, loop.link_loop_next.vert
        bm.faces.new((top[b], top[a], bot[a], bot[b]))
    grid.free()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def mirror_x(poly):
    return [(-a, b) for a, b in reversed(poly)]


def clip(poly, x0, x1, y0, y1):
    def inside(p, k, val, g): return (p[k] >= val) if g else (p[k] <= val)
    def cut(a, b, k, val):
        t = (val - a[k]) / (b[k] - a[k])
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    out = poly
    for k, val, g in ((0, x0, True), (0, x1, False), (1, y0, True), (1, y1, False)):
        src, out = out, []
        for i in range(len(src)):
            a, b = src[i - 1], src[i]
            ina, inb = inside(a, k, val, g), inside(b, k, val, g)
            if inb:
                if not ina: out.append(cut(a, b, k, val))
                out.append(b)
            elif ina:
                out.append(cut(a, b, k, val))
        if not out: return []
    return out


def ellipse(cx, cz, rx, rz, n=18):
    return [(cx + math.cos(a) * rx, cz + math.sin(a) * rz) for a in [k / n * math.tau for k in range(n)]]


# ------------------------------------------------------------------ atlas (px, 2048, origin top-left)
S = 320  # px per metre
ATLAS = dict(
    size=2048, ppm=S,
    # each region maps world (a, b) to px: u = u0 + (a - a0) * du, v = v0 + (b - b0) * dv
    right=dict(axes='yz', u0=0, a0=-2.45, du=S, v0=0, b0=1.55, dv=-S, rect=[0, 0, 1568, 496]),
    left=dict(axes='yz', u0=0, a0=2.45, du=-S, v0=496, b0=1.55, dv=-S, rect=[0, 496, 1568, 496]),
    top=dict(axes='yx', u0=0, a0=-2.45, du=S, v0=992, b0=0.95, dv=-S, rect=[0, 992, 1568, 608]),
    rear=dict(axes='zx', u0=1568, a0=0.1, du=S, v0=0, b0=-0.95, dv=S, rect=[1568, 0, 480, 608]),
    front=dict(axes='zx', u0=1568, a0=0.1, du=S, v0=640, b0=0.95, dv=-S, rect=[1568, 640, 480, 608]),
    plate_rear=[1568, 1280, 480, 102], plate_front=[1568, 1400, 480, 102],
    lightbar=[1568, 1520, 480, 60],
    under=[2000, 2000, 32, 32],
)


def region_uv(reg, co):
    comp = {'x': co.x, 'y': co.y, 'z': co.z}
    a, b = comp[reg['axes'][0]], comp[reg['axes'][1]]
    return (reg['u0'] + (a - reg['a0']) * reg['du'], reg['v0'] + (b - reg['b0']) * reg['dv'])


def to_uv(px):
    return (px[0] / ATLAS['size'], 1 - px[1] / ATLAS['size'])


def unwrap_body(ob):
    me = ob.data
    uvl = me.uv_layers.new(name='UVMap')
    mw = ob.matrix_world
    for p in me.polygons:
        n = p.normal
        c = mw @ p.center
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        # only painted faces get livery space: arch liners and lamp reveals (trim / gloss) share one tiny patch,
        # otherwise they overlap the outer skin in the atlas and their occlusion bakes onto it
        if p.material_index != 0 or (az >= ax and az >= ay and n.z < 0):
            reg = None
        elif az >= ax and az >= ay:
            reg = ATLAS['top']
        elif ax >= ay:
            reg = ATLAS['right'] if c.x >= 0 else ATLAS['left']
        else:
            reg = ATLAS['front'] if n.y > 0 else ATLAS['rear']
        for li in p.loop_indices:
            co = mw @ me.vertices[me.loops[li].vertex_index].co
            if reg is None:
                u0, v0, w, h = ATLAS['under']
                px = (u0 + w / 2 + (co.x % 0.3) * 20, v0 + h / 2 + (co.y % 0.3) * 20)
            else:
                px = region_uv(reg, co)
            uvl.data[li].uv = to_uv(px)


def rect_uv(ob, rect, view):
    """Map a flat patch (a plate, the lightbar panel) onto an atlas rect using its extent in the view plane."""
    me = ob.data
    uvl = me.uv_layers.new(name='UVMap')
    ax = {'rear': (0, 2), 'front': (0, 2)}[view]
    cos = [v.co for v in me.vertices]
    a0, a1 = min(c[ax[0]] for c in cos), max(c[ax[0]] for c in cos)
    b0, b1 = min(c[ax[1]] for c in cos), max(c[ax[1]] for c in cos)
    u0, v0, w, h = rect
    for p in me.polygons:
        for li in p.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            s = (c[ax[0]] - a0) / (a1 - a0)
            if view == 'front':
                s = 1 - s  # a viewer in front sees +x on their left
            t = (b1 - c[ax[1]]) / (b1 - b0)
            uvl.data[li].uv = to_uv((u0 + s * w, v0 + t * h))


# ------------------------------------------------------------------ materials
def materials():
    return dict(
        body=mat('body_paint', '#f4f5f2', rough=0.35),
        paint=mat('paint_white', '#f4f5f2', rough=0.35),
        trim=mat('trim', '#1b1c1e', rough=0.7),
        gloss=mat('gloss_black', '#0b0c0d', rough=0.15),
        chrome=mat('chrome', '#dfe3e7', metal=1.0, rough=0.12),
        alu=mat('alu', '#b9bdc2', metal=1.0, rough=0.3),
        glass=mat('glass', '#0c1014', metal=0.2, rough=0.05),
        tail=mat('tail_red', '#7a0b0b', rough=0.12, emit='#ff1a10', strength=0.5),
        reverse=mat('tail_reverse', '#d9dcdf', rough=0.08, emit='#ffffff', strength=0.0),
        head_refl=mat('head_reflector', '#e4e8ec', metal=1.0, rough=0.1),
        head_lamp=mat('head_lamp', '#f2f4f6', rough=0.2, emit='#fff6e6', strength=0.3),
        head_lens=mat('head_lens', '#e8eef2', rough=0.03, alpha=0.2),
        ind=mat('indicator', '#c96a12', rough=0.15, emit='#ff8a1c', strength=0.2),
        plate=mat('plate', '#ffffff', rough=0.4),
        tyre=mat('tyre', '#1d1d1d', rough=0.9),
        rim=mat('rim', '#c3c8cd', metal=1.0, rough=0.28),
        barrel=mat('rim_barrel', '#24262a', metal=0.6, rough=0.5),
        disc=mat('brake_disc', '#6b6e72', metal=0.9, rough=0.4),
        lb_base=mat('lightbar_base', '#141518', rough=0.5),
        lb_housing=mat('lightbar_housing', '#e8eef4', rough=0.04, alpha=0.3),
        lb_L=mat('lightbar_L', '#0a2a9a', rough=0.2, emit='#1f5bff', strength=0.3),
        lb_R=mat('lightbar_R', '#0a2a9a', rough=0.2, emit='#1f5bff', strength=0.3),
        lb_panel=mat('lightbar_panel', '#ffffff', rough=0.35),
    )


# ------------------------------------------------------------------ the body shell
def build_shell(M):
    ys = stations()
    bm = bmesh.new()
    rows = []
    for y in ys:
        sec = section(y)
        right = [bm.verts.new((x, y, z)) for x, z in sec]
        left = [bm.verts.new((-x, y, z)) for x, z in sec[1:-1]]
        rows.append(right + left[::-1])
    n = len(rows[0])
    for a, b in zip(rows, rows[1:]):
        for j in range(n):
            k = (j + 1) % n
            bm.faces.new((a[j], a[k], b[k], b[j]))
    for ring in (rows[0], rows[-1]):
        f = bm.faces.new(ring)
        bmesh.ops.inset_region(bm, faces=[f], thickness=0.03, depth=0.0)  # a flat ring: clean triangles, no pyramid
        bmesh.ops.triangulate(bm, faces=[f])
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    body = mesh_obj('body', bm, M['body'], 32)
    body.data.materials.append(M['trim'])
    body.data.materials.append(M['gloss'])
    # wheel arches: cylinders across the whole car
    for yc in (YF, YR):
        c = bmesh.new()
        bmesh.ops.create_cone(c, cap_ends=True, segments=40, radius1=ARCH_R, radius2=ARCH_R, depth=2.6)
        bmesh.ops.rotate(c, verts=c.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
        bmesh.ops.translate(c, verts=c.verts, vec=(0, yc, ARCH_Z))
        boolean(body, mesh_obj('arch_cut', c, None))
    return body


# ------------------------------------------------------------------ lamps, grille, plate: outlines
# rear view (x, z); right-hand shapes, mirrored for the left
TAIL = [(0.36, 1.005), (0.62, 1.0), (0.8, 0.985), (0.865, 0.958), (0.865, 0.905), (0.72, 0.905), (0.5, 0.93), (0.36, 0.955)]
TAIL_REV = [(0.52, 0.95), (0.66, 0.935), (0.66, 0.915), (0.52, 0.93)]
TAIL_SIDE = [(-2.39, 0.99), (-2.23, 0.975), (-2.12, 0.962), (-2.12, 0.94), (-2.25, 0.93), (-2.39, 0.9)]  # side view (y, z)
REAR_PLATE = (0.66, 0.26, 0.068)   # centre z, half width, half height of the plate recess
HEAD = [(0.48, 0.725), (0.53, 0.765), (0.66, 0.815), (0.81, 0.84), (0.91, 0.82), (0.91, 0.76), (0.81, 0.715), (0.63, 0.70)]
GRILLE = [(-0.42, 0.70), (0.42, 0.70), (0.50, 0.65), (0.48, 0.55), (0.40, 0.39), (-0.40, 0.39), (-0.48, 0.55), (-0.50, 0.65)]
INTAKE = [(-0.62, 0.305), (0.62, 0.305), (0.66, 0.335), (-0.66, 0.335)]  # black lower lip
FOG = [(0.66, 0.36), (0.84, 0.37), (0.87, 0.47), (0.69, 0.45)]
FRONT_PLATE_Z = 0.45  # on the lower grille, standing proud of it on its bracket


def build(M):
    body = build_shell(M)
    surf = Surface([body])
    parts = []

    pz, phw, phh = REAR_PLATE

    # ---- things that sit inside the recesses / on the surface (projected before cutting)
    for side, view in ((1, 'right'), (-1, 'left')):
        sh = (lambda p: p) if side > 0 else mirror_x
        parts.append(decal(f'tail_surround_{side}', sh(TAIL), 'rear', surf, M['gloss'], 0.004, cuts=2))
        parts.append(decal(f'tail_{side}', sh(TAIL), 'rear', surf, M['tail'], 0.009, cuts=2))
        parts.append(decal(f'tail_rev_{side}', sh(TAIL_REV), 'rear', surf, M['reverse'], 0.013, cuts=1))
        parts.append(decal(f'tail_side_{side}', TAIL_SIDE, view, surf, M['tail'], 0.009, cuts=2))
        parts.append(decal(f'head_surround_{side}', sh(HEAD), 'front', surf, M['gloss'], 0.004, cuts=2, min_facing=0.1))
        parts.append(decal(f'head_refl_{side}', sh(HEAD), 'front', surf, M['head_refl'], 0.009, cuts=2, min_facing=0.1))
        parts.append(decal(f'head_lens_{side}', sh(HEAD), 'front', surf, M['head_lens'], 0.023, cuts=2, min_facing=0.1))
        # The curved front corner makes a projected projector distort at driving distance.
        # The reflector and lens carry the swept shape; the lower lamps remain illuminated.
        parts.append(decal(f'head_ind_{side}', sh([(0.84, 0.78), (0.9, 0.77), (0.9, 0.755), (0.84, 0.765)]), 'front', surf, M['ind'], 0.017, cuts=1))
        # blue grille flashers either side of the grille
        parts.append(decal(f'grille_blue_{side}', sh([(0.3, 0.44), (0.4, 0.44), (0.4, 0.47), (0.3, 0.47)]), 'front', surf, M['lb_L' if side < 0 else 'lb_R'], 0.016, cuts=1))
        parts.append(decal(f'fog_surround_{side}', sh(FOG), 'front', surf, M['gloss'], 0.004, cuts=1))
        parts.append(decal(f'fog_{side}', ellipse(0.775 * side, 0.415, 0.035, 0.03, 12), 'front', surf, M['head_lamp'], 0.012, cuts=1))
        parts.append(decal(f'reflector_{side}', sh([(0.68, 0.37), (0.84, 0.37), (0.84, 0.395), (0.68, 0.395)]), 'rear', surf, M['tail'], 0.004, cuts=1))
    # grille: dark insert, chrome surround and horizontal bars
    parts.append(decal('grille_black', GRILLE, 'front', surf, M['gloss'], 0.004, cuts=3))
    for i in range(len(GRILLE)):
        a, b = Vector((*GRILLE[i], 0)), Vector((*GRILLE[(i + 1) % len(GRILLE)], 0))
        d = (b - a).normalized(); nrm = Vector((d.y, -d.x, 0)) * 0.018
        parts.append(decal(f'grille_rim_{i}', [(a.x, a.y), (b.x, b.y), (b.x + nrm.x, b.y + nrm.y), (a.x + nrm.x, a.y + nrm.y)], 'front', surf, M['chrome'], 0.013, cuts=1))
    for k, z in enumerate((0.45, 0.52, 0.59, 0.66)):
        bar = clip([(-0.6, z), (0.6, z), (0.6, z + 0.014), (-0.6, z + 0.014)], -0.54, 0.54, 0.39, 0.705)
        parts.append(decal(f'grille_bar_{k}', bar, 'front', surf, M['chrome'], 0.014, cuts=1))
    parts.append(decal('lower_lip', INTAKE, 'front', surf, M['trim'], 0.003, cuts=2))
    parts.append(decal('logo_front', ellipse(0, 0.675, 0.07, 0.035), 'front', surf, M['chrome'], 0.006, cuts=1))
    parts.append(decal('logo_rear', ellipse(0, 0.84, 0.06, 0.03), 'rear', surf, M['chrome'], 0.004, cuts=1))
    # number plates
    rp = decal('plate_rear', [(-0.26, pz - 0.055), (0.26, pz - 0.055), (0.26, pz + 0.055), (-0.26, pz + 0.055)], 'rear', surf, M['plate'], 0.012, cuts=1)
    fp = decal('plate_front', [(-0.26, FRONT_PLATE_Z - 0.055), (0.26, FRONT_PLATE_Z - 0.055), (0.26, FRONT_PLATE_Z + 0.055), (-0.26, FRONT_PLATE_Z + 0.055)], 'front', surf, M['plate'], 0.012, cuts=1)
    rect_uv(rp, ATLAS['plate_rear'], 'rear'); rect_uv(fp, ATLAS['plate_front'], 'front')
    parts += [rp, fp]

    # ---- glazing: windscreen, side daylight opening, rear screen, with black pillars and a chrome surround
    def dlo_top(y): return ztop(y) - 0.085
    ys = [-1.97 + i * (0.96 + 1.97) / 32 for i in range(33)]

    def front_edge(z):  # A-pillar: from the mirror sail (y 0.9 at the belt) up to y 0.1 at the roof
        return lerp(0.86, 0.12, (z - zbelt(0.9)) / (dlo_top(0.12) - zbelt(0.9)))
    dlo = []
    for y in ys:
        zt = dlo_top(y)
        if y > 0.12 and zt > zbelt(y) + 0.02:
            zt = min(zt, lerp(zbelt(0.86), dlo_top(0.12), (0.86 - y) / 0.74))
        dlo.append((y, zt))
    rear_top = dlo_top(-1.8)
    glass_poly = [(y, z) for y, z in dlo if z > zbelt(y) + 0.02] + [(y, zbelt(y) + 0.028) for y, _ in reversed(dlo) if dlo_top(y) > zbelt(y) + 0.02]
    for view, s in (('right', 1), ('left', -1)):
        parts.append(decal(f'side_glass_{s}', [p for p in glass_poly if p[0] < 0.86], view, surf, M['glass'], 0.007, cuts=2, min_facing=0.02))
        for yp, wp in ((0.02, 0.11), (-1.0, 0.075)):  # B and C pillars
            parts.append(decal(f'pillar_{yp}_{s}', [(yp - wp / 2, zbelt(yp) + 0.02), (yp + wp / 2, zbelt(yp) + 0.02), (yp + wp / 2, dlo_top(yp) + 0.01), (yp - wp / 2, dlo_top(yp) + 0.01)], view, surf, M['gloss'], 0.007, cuts=2))
        top_line = [(y, z + 0.004) for y, z in dlo if z > zbelt(y) + 0.02]
        parts.append(decal(f'dlo_chrome_{s}', top_line + [(y, z + 0.022) for y, z in reversed(top_line)], view, surf, M['chrome'], 0.006, cuts=0))
        parts.append(decal(f'belt_chrome_{s}', [(y, zbelt(y) + 0.012) for y in ys] + [(y, zbelt(y) + 0.028) for y in reversed(ys)], view, surf, M['chrome'], 0.006, cuts=0))
    ws = [(-0.67, 1.02), (0.67, 1.02), (0.56, 1.385), (-0.56, 1.385)]
    parts.append(decal('windscreen', ws, 'front', surf, M['glass'], 0.008, cuts=8, min_facing=0.05))
    rs = [(-0.64, 1.075), (0.64, 1.075), (0.55, 1.335), (-0.55, 1.335)]
    parts.append(decal('rear_screen', rs, 'rear', surf, M['glass'], 0.008, cuts=8, min_facing=0.05))
    # blue flashers in the top corners of the rear screen
    for side in (1, -1):
        parts.append(decal(f'rear_blue_{side}', [(0.36 * side, 1.325), (0.52 * side, 1.325), (0.52 * side, 1.345), (0.36 * side, 1.345)], 'rear', surf, M['lb_L' if side < 0 else 'lb_R'], 0.007, cuts=1))
    # high-level brake light in the spoiler
    parts.append(decal('hmsl', [(-0.2, 1.365), (0.2, 1.365), (0.2, 1.378), (-0.2, 1.378)], 'rear', surf, M['tail'], 0.012, cuts=1))

    # Keep the painted shell continuous. Lamp and grille details are shallow layers above it.
    arches = [(YF, ARCH_Z), (YR, ARCH_Z)]
    for p in body.data.polygons:
        c = p.center
        mi = 0
        # arch liners, the underbody and the lowest lip of the bumpers are black plastic
        if any(abs(math.hypot(c.y - ay, c.z - az) - ARCH_R) < 4e-3 for ay, az in arches) or p.normal.z < -0.6 or c.z < zbot(c.y) + 0.035 \
                or (c.y < -2.2 and c.z < 0.44) or (c.y > 2.2 and c.z < 0.335):
            mi = 1
        p.material_index = mi
    unwrap_body(body)
    return body, parts


# ------------------------------------------------------------------ wheels (16" twin five-spoke alloys)
def wheel(name, x, y, side, M):
    loc = (x, y, R)
    tyre = lathe(f'{name}_tyre', [(0.215, -0.1), (0.262, -0.107), (0.3, -0.103), (0.318, -0.093), (0.325, -0.07), (0.325, 0.07), (0.318, 0.093), (0.3, 0.103), (0.262, 0.107), (0.215, 0.1)], 24, M['tyre'], loc, side)
    rim = lathe(f'{name}_lip', [(0.212, 0.092), (0.214, 0.1), (0.198, 0.104), (0.188, 0.094)], 24, M['rim'], loc, side)
    barrel = lathe(f'{name}_barrel', [(0.188, 0.094), (0.19, -0.08), (0.12, -0.085)], 20, M['barrel'], loc, side)
    hub = lathe(f'{name}_hub', [(0.075, 0.07), (0.07, 0.095), (0.04, 0.104), (0.0, 0.106)], 14, M['rim'], loc, side)
    disc = lathe(f'{name}_disc', [(0.16, 0.0), (0.16, 0.025), (0.06, 0.025)], 18, M['disc'], loc, side)
    caliper = box(f'{name}_caliper', (0.05, 0.1, 0.07), (x - side * 0.01, y - 0.06, R + 0.13), M['barrel'], 0.012, segs=1)
    # Broad, tapered five-spoke alloys. Each spoke is one small prism, and the dark barrel
    # remains visible between them. The wheel pivot and materials stay compatible with runtime spin.
    spokes = []
    for k in range(5):
        a = (k + 0.5) / 5 * math.tau
        bm = bmesh.new()
        rings = []
        for radius, half_angle, dx in ((0.064, 0.26, 0.102), (0.175, 0.19, 0.104),
                                       (0.186, 0.19, 0.088), (0.064, 0.26, 0.086)):
            rings.append([bm.verts.new((side * dx, math.cos(a + sign * half_angle) * radius,
                                        math.sin(a + sign * half_angle) * radius)) for sign in (-1, 1)])
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((rings[i][0], rings[i][1], rings[j][1], rings[j][0]))
        bm.faces.new((rings[0][0], rings[1][0], rings[2][0], rings[3][0]))
        bm.faces.new((rings[3][1], rings[2][1], rings[1][1], rings[0][1]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        spokes.append(mesh_obj(f'{name}_spoke_{k}', bm, M['rim'], 30))
        spokes[-1].location = loc
    w = join([tyre, rim, barrel, hub, disc, caliper] + spokes, name)
    bpy.context.scene.cursor.location = loc
    activate(w)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return w


# ------------------------------------------------------------------ roof kit, mirrors, handles, light bar
def extras(M):
    objs = []
    # silver roof rails on the roof edges, with feet
    for s in (-1, 1):
        cu = bpy.data.curves.new(f'rail_{s}', 'CURVE')
        cu.dimensions = '3D'; cu.bevel_depth = 0.014; cu.bevel_resolution = 1; cu.resolution_u = 2
        sp = cu.splines.new('POLY')
        yr = [-1.9 + i * 0.1 for i in range(22)]
        sp.points.add(len(yr) - 1)
        for i, y in enumerate(yr):
            lift = 0.035 * math.sin(math.pi * clamp((y + 1.9) / 2.1, 0, 1)) ** 0.3
            sp.points[i].co = (s * (roof_hw(y) - 0.075), y, ztop(y) - 0.02 + lift, 1)
        ob = link(bpy.data.objects.new(f'rail_{s}', cu))
        ob.data.materials.append(M['alu'])
        activate(ob); bpy.ops.object.convert(target='MESH'); objs.append(bpy.context.active_object)
        for y in (-1.88, 0.18):
            objs.append(box(f'rail_foot_{s}_{y}', (0.03, 0.08, 0.03), (s * (roof_hw(y) - 0.075), y, ztop(y) - 0.005), M['trim'], 0.008, segs=1))
    # shark-fin antenna and the tailgate spoiler
    objs.append(box('antenna', (0.05, 0.16, 0.06), (0, -1.75, ztop(-1.75) + 0.02), M['trim'], 0.02))
    objs.append(box('spoiler', (1.1, 0.18, 0.035), (0, -2.1, ztop(-2.1) + 0.005), M['paint'], 0.018, rot=(0.12, 0, 0)))
    # mirrors: body-colour caps on black bases, with indicator repeaters
    for s in (-1, 1):
        y0, z0 = 0.82, zbelt(0.82) + 0.1
        x0 = s * (HW * 0.955 * upper_taper(0.82) + 0.09)
        objs.append(box(f'mirror_{s}', (0.2, 0.11, 0.13), (x0, y0, z0), M['paint'], 0.035))
        objs.append(box(f'mirror_glass_{s}', (0.16, 0.01, 0.1), (x0, y0 - 0.056, z0), M['glass'], 0.01, segs=1))
        objs.append(box(f'mirror_base_{s}', (0.12, 0.09, 0.05), (x0 - s * 0.09, y0 + 0.01, z0 - 0.07), M['trim'], 0.015, segs=1))
        objs.append(box(f'mirror_ind_{s}', (0.11, 0.02, 0.018), (x0 + s * 0.01, y0 + 0.05, z0 - 0.045), M['ind'], 0.004, segs=1))
        # door handles (body colour, just above the shoulder crease)
        for yh in (0.42, -0.62):
            zh = zcrease(yh) + 0.035
            objs.append(box(f'handle_{s}_{yh}', (0.03, 0.17, 0.035), (s * (HW * plan(yh) * 0.985), yh, zh), M['paint'], 0.012, segs=1))
    # low-profile LED light bar: dark base, clear polycarbonate housing, four blue LED modules per side facing
    # front and back, and the white GARDA panel in the middle
    by = -0.15
    bz = ztop(by) + 0.012
    objs.append(box('lightbar_base', (1.16, 0.26, 0.03), (0, by, bz + 0.015), M['lb_base'], 0.01))
    for s in (-1, 1):
        for k in range(4):
            x = s * (0.19 + k * 0.1)
            for face in (1, -1):
                objs.append(box(f'lb_led_{s}_{k}_{face}', (0.085, 0.03, 0.035), (x, by + face * 0.085, bz + 0.055), M['lb_L' if s < 0 else 'lb_R'], 0.006, segs=1))
    panel = []
    for face in (1, -1):
        bm = bmesh.new()
        vs = [bm.verts.new((x, by + face * 0.1, z)) for x, z in ((-0.13, bz + 0.035), (0.13, bz + 0.035), (0.13, bz + 0.075), (-0.13, bz + 0.075))]
        bm.faces.new(vs if face > 0 else vs[::-1])
        p = mesh_obj(f'lightbar_panel_{face}', bm, M['lb_panel'], 10)
        me = p.data; uvl = me.uv_layers.new(name='UVMap')
        u0, v0, w, h = ATLAS['lightbar']
        for poly in me.polygons:
            for li in poly.loop_indices:
                c = me.vertices[me.loops[li].vertex_index].co
                s_ = (c.x + 0.13) / 0.26
                if face > 0: s_ = 1 - s_
                t = (bz + 0.075 - c.z) / 0.04
                uvl.data[li].uv = to_uv((u0 + s_ * w, v0 + t * h))
        panel.append(p)
    objs += panel
    objs.append(box('lightbar_housing', (1.14, 0.24, 0.07), (0, by, bz + 0.058), M['lb_housing'], 0.03, segs=3))
    return objs


# ------------------------------------------------------------------ AO bake (Cycles) onto the body atlas
def bake_ao(body, size=1024):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 48
    if sc.world is None:
        sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = 0.45
    img = bpy.data.images.new('garda_ao', size, size, alpha=False)
    nodes = []
    for m in body.data.materials:
        if m is None:
            continue
        n = m.node_tree.nodes.new('ShaderNodeTexImage')
        n.image = img
        m.node_tree.nodes.active = n
        nodes.append((m, n))
    activate(body)
    bpy.ops.object.bake(type='AO', margin=8, use_clear=True)
    path = os.path.join(OUT, 'garda_ao.png')
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    for m, n in nodes:
        m.node_tree.nodes.remove(n)
    print('BAKED', path, os.path.getsize(path))


# ------------------------------------------------------------------ guides for the livery painter
def guides():
    ys = [-2.4 + i * 0.05 for i in range(97)]
    return dict(
        y=[round(y, 3) for y in ys],
        crease=[round(min(zcrease(y), min(zbelt(y), ztop(y) - 0.045) - 0.05), 4) for y in ys],
        belt=[round(zbelt(y), 4) for y in ys],
        top=[round(ztop(y), 4) for y in ys],
        bottom=[round(zbot(y), 4) for y in ys],
        halfWidth=[round(HW * plan(y), 4) for y in ys],
        arches=[[YF, ARCH_Z, ARCH_R], [YR, ARCH_Z, ARCH_R]],
        rearPlate=list(REAR_PLATE), tail=TAIL, length=L,
    )


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = materials()
    body, parts = build(M)
    objs = [body] + parts + extras(M)
    for tag, y in (('front', YF), ('rear', YR)):
        for s in (-1, 1):
            objs.append(wheel(f'wheel_{tag}_{"l" if s < 0 else "r"}', s * TRACK, y, s, M))
    body['atlas'] = json.dumps(ATLAS)
    body['guides'] = json.dumps(guides())
    tris = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            e = ob.evaluated_get(dg); me = e.to_mesh()
            me.calc_loop_triangles(); tris += len(me.loop_triangles); e.to_mesh_clear()
    print('TRIANGLES', tris)
    bake_ao(body)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC, 'garda.blend'))
    path = os.path.join(OUT, 'garda.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_extras=True, export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=6, export_draco_position_quantization=14,
                              export_draco_normal_quantization=10, export_draco_texcoord_quantization=12)
    print('EXPORTED', path, os.path.getsize(path))


main()
print('DONE')

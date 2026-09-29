"""Build the game's hero cars in Blender and export them as GLB.

Run headless:  blender -b --factory-startup -P tools/blender/build_cars.py -- public/models [names...]

Modelled after real cars from reference photos (all procedural, no downloaded assets):
  garda     - Hyundai i40 Tourer, An Garda Siochana standard patrol livery
  garda_rp  - Hyundai i40 Tourer, Roads Policing Battenburg livery
  hatch     - Hyundai i30 N style hot hatch in Performance Blue
  coupe     - fastback coupe (the pursuit suspect)
  gt        - "Liffey GT": a hot hatch inspired by the Mk7 / Mk8-era GTI silhouette (original name, plain badge)

Technique:
  - lower body: a filled 2D side profile with wheel arches, extruded with a rounded bevel, pinched in plan view
    at the nose and tail and flared over the wheels; the belt line can rise toward the rear;
  - cabin: a narrower rounded extrusion of the glasshouse profile with tumblehome;
  - details are projected decals: 2D outlines (front / rear / side / top view) triangulated, subdivided and
    raycast onto the bodywork, so lights, grilles, glazing, livery and lettering wrap the real curvature
    (the same projection works on any imported mesh);
  - wheels: tyre, spoked alloy, barrel and brake disc joined into wheel_* objects (the game spins and steers them);
    front brake calipers are caliper_front_* objects pivoting at the wheel centre (the game steers them, no spin);
  - optional per car: extra vertex columns across the width (xcuts) so the nose, tail and windscreen can curve in
    plan (bow), a C-pillar line that ends the side glazing, honeycomb grilles, Draco compression.
Axes: Blender X = width, +Y = forward, +Z = up.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
ONLY = ARGS[1:]
os.makedirs(OUT, exist_ok=True)


# ------------------------------------------------------------------ basics
def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mat(name, hexcol, metal=0.0, rough=0.5, emit=None, strength=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(hexcol), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for d in list(coll):
            coll.remove(d)


def smooth(ob, angle=35):
    for p in ob.data.polygons:
        p.use_smooth = True
    if hasattr(ob.data, 'set_sharp_from_angle'):
        ob.data.set_sharp_from_angle(angle=math.radians(angle))


def add_obj(name, me, material):
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if material:
        ob.data.materials.append(material)
    return ob


def extrude_profile(name, pts, half_width, bevel, material, deform=None, xcuts=(), res=5):
    """pts: closed (y, z) outline -> mesh extruded symmetrically along X with rounded edges.
    The bevel grows the outline outward by `bevel`. xcuts: X positions of extra vertex columns across the width,
    so a deform can curve the nose, tail or windscreen in plan (otherwise each strip spans the car in one quad)."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = max(0.001, half_width - bevel)
    cu.bevel_depth = bevel
    cu.bevel_resolution = res
    cu.resolution_u = 1
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, (y, z) in enumerate(pts):
        sp.points[i].co = (y, z, 0, 1)
    sp.use_cyclic_u = True
    ob = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    if xcuts:
        # only the strips toward the ends (outside ycut) are cut: that's where the plan curvature is
        cuts, (y_lo, y_hi) = (xcuts, (-99, 99)) if not isinstance(xcuts[0], (tuple, list)) else xcuts
        bm = bmesh.new(); bm.from_mesh(ob.data)
        for xc in cuts:
            fs = [f for f in bm.faces if not (y_lo < f.calc_center_median().x < y_hi)]
            es = list({e for f in fs for e in f.edges}); vs = list({v for f in fs for v in f.verts})
            bmesh.ops.bisect_plane(bm, geom=vs + es + fs, dist=1e-5, plane_co=(0, 0, xc), plane_no=(0, 0, 1))
        bm.to_mesh(ob.data); bm.free()
    for v in ob.data.vertices:
        a, b, c = v.co
        co = Vector((c, a, b))
        v.co = deform(co) if deform else co
    ob.data.update()
    ob.data.materials.clear()
    ob.data.materials.append(material)
    smooth(ob, 40)
    ob.select_set(False)
    return ob


def box(name, size, loc, material, bevel=0.0, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=3, affect='EDGES', profile=0.5)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = add_obj(name, me, material)
    ob.location = loc
    ob.rotation_euler = rot
    smooth(ob, 30)
    return ob


def cylinder(name, r, depth, loc, material, verts=32, bevel=0.0, axis='X'):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=depth)
    if bevel:
        rim = [e for e in bm.edges if any(len(f.verts) > 4 for f in e.link_faces)]
        bmesh.ops.bevel(bm, geom=rim, offset=bevel, segments=4, affect='EDGES', profile=0.5)
    if axis == 'X':
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    elif axis == 'Y':
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = add_obj(name, me, material)
    ob.location = loc
    smooth(ob, 50)
    return ob


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob


# ------------------------------------------------------------------ projected decals
# 2D coordinates are world axes for the view: front/rear -> (x, z); left/right -> (y, z); top -> (x, y)
VIEWS = {
    'front': (lambda a, b: Vector((a, 8.0, b)), Vector((0, -1, 0))),
    'rear': (lambda a, b: Vector((a, -8.0, b)), Vector((0, 1, 0))),
    'right': (lambda a, b: Vector((8.0, a, b)), Vector((-1, 0, 0))),
    'left': (lambda a, b: Vector((-8.0, a, b)), Vector((1, 0, 0))),
    'top': (lambda a, b: Vector((a, b, 8.0)), Vector((0, 0, -1))),
}


def raycast(targets, origin, direction):
    best = None
    for ob in targets:
        hit, loc, nrm, _ = ob.ray_cast(origin, direction)
        if hit and (best is None or (loc - origin).length < (best[0] - origin).length):
            best = (loc, nrm)
    return best


def project_bm(name, bm, view, targets, material, offset=0.006, min_facing=0.3):
    """bm: bmesh whose vertices hold 2D view coordinates in (co.x, co.y). Projects them onto the targets.
    Hits on surfaces that face away from the view (grazing) are dropped so decals don't smear round corners."""
    to3, direction = VIEWS[view]
    targets = [bpy.data.objects[t] for t in targets]
    bad, normals = set(), {}
    for v in bm.verts:
        h = raycast(targets, to3(v.co.x, v.co.y), direction)
        if h is None or h[1].dot(-direction) < min_facing:
            bad.add(v)
            continue
        v.co = h[0] + h[1] * offset
        normals[v] = h[1]
    for f in [f for f in bm.faces if any(v in bad for v in f.verts)]:
        bm.faces.remove(f)
    for v in [v for v in bm.verts if not v.link_faces]:
        bm.verts.remove(v)
    bm.normal_update()
    flip = []
    for f in bm.faces:
        avg = sum((normals.get(v, Vector()) for v in f.verts), Vector())
        if f.normal.dot(avg) < 0:
            flip.append(f)
    if flip:
        bmesh.ops.reverse_faces(bm, faces=flip)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = add_obj(name, me, material)
    smooth(ob, 60)
    return ob


def decal(name, poly, view, targets, material, offset=0.006, cuts=3):
    """Filled 2D polygon (concave allowed) projected onto the bodywork."""
    bm = bmesh.new()
    vs = [bm.verts.new((a, b, 0)) for a, b in poly]
    edges = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges)
    if cuts:
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    return project_bm(name, bm, view, targets, material, offset)


def strip(name, ys, lo, hi, view, targets, material, offset=0.007, rows=2):
    """A band between the curves lo(y) and hi(y), built as a quad strip (no slivers on curved panels)."""
    bm = bmesh.new()
    grid = []
    for y in ys:
        a, b = lo(y), hi(y)
        grid.append([bm.verts.new((y, a + (b - a) * k / rows, 0)) for k in range(rows + 1)])
    for i in range(len(ys) - 1):
        for k in range(rows):
            bm.faces.new((grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]))
    return project_bm(name, bm, view, targets, material, offset)


def mirror_x(poly):
    return [(-a, b) for a, b in reversed(poly)]


def text_decal(name, s, size, centre, view, targets, material, offset=0.008, italic=False, stretch=1.0):
    """Lettering laid onto the bodywork, reading correctly for someone looking from `view`."""
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = s
    cu.size = size
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.shear = 0.18 if italic else 0.0
    cu.offset = 0.02 * size
    ob = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bpy.data.objects.remove(ob, do_unlink=True)
    # the direction the text's +u (reading) and +v (up) run in the view's 2D axes
    su, sv = {'front': (-1, 1), 'rear': (1, 1), 'right': (1, 1), 'left': (-1, 1), 'top': (-1, -1)}[view]
    for v in bm.verts:
        u, w = v.co.x * stretch, v.co.y
        v.co = Vector((centre[0] + su * u, centre[1] + sv * w, 0))
    return project_bm(name, bm, view, targets, material, offset)


def clip(poly, x0, x1, y0, y1):
    """Sutherland-Hodgman clip of a polygon to an axis-aligned rectangle."""
    def inside(p, k, val, keep_greater):
        return (p[k] >= val) if keep_greater else (p[k] <= val)

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
                if not ina:
                    out.append(cut(a, b, k, val))
                out.append(b)
            elif ina:
                out.append(cut(a, b, k, val))
        if not out:
            return []
    return out


def clip_half(poly, keep):
    """Clip a polygon to the half-plane where keep(p) >= 0 (keep is linear in p)."""
    out = []
    for i in range(len(poly)):
        a, b = poly[i - 1], poly[i]
        ka, kb = keep(a), keep(b)
        if kb >= 0:
            if ka < 0:
                t = ka / (ka - kb)
                out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            out.append(b)
        elif ka >= 0:
            t = ka / (ka - kb)
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def chaikin(pts, n=2, hard=()):
    """Corner-cutting smoothing of an open polyline; the ends and the indices in `hard` stay sharp."""
    keep = [i == 0 or i == len(pts) - 1 or i in hard for i in range(len(pts))]
    for _ in range(n):
        out, ok = [pts[0]], [True]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            q = (a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25)
            r = (a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75)
            if i > 0 and not keep[i]:
                out.append(q); ok.append(False)
            elif i > 0:
                out.append(a); ok.append(True)
            if i + 1 < len(pts) - 1 and not keep[i + 1]:
                out.append(r); ok.append(False)
        out.append(pts[-1]); ok.append(True)
        pts, keep = out, ok
    return pts


def inside(poly, p):
    c = False
    for i in range(len(poly)):
        a, b = poly[i - 1], poly[i]
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < a[0] + (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]):
            c = not c
    return c


def honeycomb(name, poly, pitch, wall, view, targets, material, offset=0.014):
    """Hexagonal mesh (the cell walls) filling a 2D outline: whole cells only, pointy-top rows staggered.
    Neighbouring cells share a wall, so each wall is drawn once (a quad centred on the cell edge)."""
    s = pitch / math.sqrt(3)  # cell radius: the distance from centre to corner
    xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
    corner = lambda cx, cz, k, rr: (cx + math.cos(math.pi / 2 + k * math.pi / 3) * rr, cz + math.sin(math.pi / 2 + k * math.pi / 3) * rr)
    cells, row, z = set(), 0, min(zs) + s
    while z < max(zs):
        x = min(xs) + (pitch / 2 if row % 2 else 0)
        col = 0
        while x < max(xs):
            if all(inside(poly, corner(x, z, k, s)) for k in range(6)):
                cells.add((round(x, 5), round(z, 5)))
            x += pitch; col += 1
        z += s * 1.5; row += 1
    # the neighbour across edge k (between corners k and k+1) lies at 60k + 120 degrees
    nb = [(math.cos(math.radians(60 * k + 120)) * pitch, math.sin(math.radians(60 * k + 120)) * pitch) for k in range(6)]
    bm = bmesh.new()
    for (cx, cz) in cells:
        for k in range(6):
            other = (round(cx + nb[k][0], 5), round(cz + nb[k][1], 5))
            if k >= 3 and other in cells:
                continue  # that neighbour draws this wall
            a, b = corner(cx, cz, k, s + wall * 0.5), corner(cx, cz, k + 1, s + wall * 0.5)
            c, d = corner(cx, cz, k + 1, s - wall * 0.5), corner(cx, cz, k, s - wall * 0.5)
            bm.faces.new([bm.verts.new((u, w, 0)) for u, w in (a, b, c, d)])
    return project_bm(name, bm, view, targets, material, offset)


def ring_decal(name, c, r0, r1, view, targets, material, offset=0.012, n=24, sx=1.0):
    """An annulus (r0 inner, r1 outer; r0 = 0 gives a disc) projected onto the bodywork."""
    bm = bmesh.new()
    inner = [bm.verts.new((c[0] + math.cos(k / n * math.tau) * r0 * sx, c[1] + math.sin(k / n * math.tau) * r0, 0)) for k in range(n)] if r0 > 0 else None
    outer = [bm.verts.new((c[0] + math.cos(k / n * math.tau) * r1 * sx, c[1] + math.sin(k / n * math.tau) * r1, 0)) for k in range(n)]
    if inner:
        for k in range(n):
            bm.faces.new((outer[k], outer[(k + 1) % n], inner[(k + 1) % n], inner[k]))
    else:
        mid = bm.verts.new((c[0], c[1], 0))
        for k in range(n):
            bm.faces.new((outer[k], outer[(k + 1) % n], mid))
    return project_bm(name, bm, view, targets, material, offset)


def annulus(name, r0, r1, depth, loc, material, n=32, a0=0.0, a1=math.tau, axis_x=True):
    """A flat ring (or a sector of one, a0..a1) of thickness `depth`, facing X, in the (y, z) plane."""
    bm = bmesh.new()
    full = abs(a1 - a0 - math.tau) < 1e-6
    steps = n if full else max(2, int(n * (a1 - a0) / math.tau))
    rings = []
    for x in (-depth / 2, depth / 2):
        ring = []
        for k in range(steps + (0 if full else 1)):
            a = a0 + (a1 - a0) * k / steps
            ring.append((bm.verts.new((x, math.cos(a) * r0, math.sin(a) * r0)), bm.verts.new((x, math.cos(a) * r1, math.sin(a) * r1))))
        rings.append(ring)
    m = len(rings[0])
    for k in range(m if full else m - 1):
        j = (k + 1) % m
        (a_i, a_o), (b_i, b_o) = rings[0][k], rings[0][j]
        (c_i, c_o), (d_i, d_o) = rings[1][k], rings[1][j]
        bm.faces.new((a_i, b_i, b_o, a_o)); bm.faces.new((c_o, d_o, d_i, c_i))
        bm.faces.new((a_o, b_o, d_o, c_o)); bm.faces.new((c_i, d_i, b_i, a_i))
    if not full:
        for k in (0, m - 1):
            (a_i, a_o), (c_i, c_o) = rings[0][k], rings[1][k]
            f = bm.faces.new((a_i, a_o, c_o, c_i))
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = add_obj(name, me, material)
    ob.location = loc
    smooth(ob, 40)
    return ob


def spoke(name, side, face, y, zc, a_hub, a_rim, r_hub, r_rim, w_hub, w_rim, depth, dish, material):
    """A tapered spoke from the hub (angle a_hub) to the rim (angle a_rim), dished: the hub end sits further out."""
    bm = bmesh.new()
    def pt(a, rr, off, x):
        d = Vector((0, math.cos(a), math.sin(a))); n = Vector((0, -math.sin(a), math.cos(a)))
        return Vector((x, y, zc)) + d * rr + n * off
    vs = []
    for a, rr, w, x in ((a_hub, r_hub, w_hub, face + side * dish), (a_rim, r_rim, w_rim, face)):
        for off in (-w / 2, w / 2):
            for dx in (0, -side * depth):
                vs.append(bm.verts.new(pt(a, rr, off, x + dx)))
    # vs index: [end][off][dx] -> end*4 + off*2 + dx
    V = lambda e, o, d: vs[e * 4 + o * 2 + d]
    for f in ((V(0, 0, 0), V(1, 0, 0), V(1, 1, 0), V(0, 1, 0)),  # front
              (V(0, 0, 1), V(0, 1, 1), V(1, 1, 1), V(1, 0, 1)),  # back
              (V(0, 0, 0), V(0, 0, 1), V(1, 0, 1), V(1, 0, 0)),
              (V(0, 1, 0), V(1, 1, 0), V(1, 1, 1), V(0, 1, 1)),
              (V(1, 0, 0), V(1, 0, 1), V(1, 1, 1), V(1, 1, 0))):
        bm.faces.new(f)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = add_obj(name, me, material)
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob


def tyre_ring(name, r, width, loc, material, n=36, rim=0.72):
    """A tyre as a revolved section (open in the middle, so the brake shows through the spokes): rounded
    shoulders and a slightly bulged low-profile sidewall."""
    h = width / 2
    sec = [(-h, r * rim), (-h - 0.008, r * 0.86), (-h + 0.01, r * 0.97), (-h + 0.04, r),
           (h - 0.04, r), (h - 0.01, r * 0.97), (h + 0.008, r * 0.86), (h, r * rim)]
    bm = bmesh.new()
    rings = [[bm.verts.new((dx, math.cos(k / n * math.tau) * rr, math.sin(k / n * math.tau) * rr)) for dx, rr in sec] for k in range(n)]
    m = len(sec)
    for k in range(n):
        a, b = rings[k], rings[(k + 1) % n]
        for i in range(m):  # (the last pair closes the section across the inner barrel)
            j = (i + 1) % m
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = add_obj(name, me, material)
    ob.location = loc
    smooth(ob, 50)
    return ob


def wheel_gt(name, x, y, r, width, M, rim_mat, side, front):
    """Low-profile tyre on a dark twin-spoke alloy with a machined lip, a visible brake disc and a red caliper.
    The caliper doesn't spin: it is its own object (caliper_front_* steer with the wheel; the rear ones are fixed)."""
    face = x + side * width / 2
    parts = [
        tyre_ring(f'{name}_tyre', r, width, (x, y, r), M['tyre'], 30),
        annulus(f'{name}_barrel', r * 0.6, r * 0.73, 0.012, (face - side * 0.012, y, r), M['barrel'], 24),
        cylinder(f'{name}_back', r * 0.73, 0.01, (face - side * 0.11, y, r), M['tyre'], 24),
        annulus(f'{name}_disc', r * 0.2, r * 0.53, 0.022, (face - side * 0.055, y, r), M['disc'], 20),
        annulus(f'{name}_lip', r * 0.655, r * 0.725, 0.022, (face + side * 0.004, y, r), rim_mat, 30),
        cylinder(f'{name}_hub', r * 0.17, 0.05, (face - side * 0.004, y, r), rim_mat, 12),
        cylinder(f'{name}_cap', r * 0.075, 0.012, (face + side * 0.024, y, r), rim_mat, 12),
    ]
    for k in range(5):
        a = k / 5 * math.tau + 0.3
        for j, d in enumerate((-1, 1)):
            parts.append(spoke(f'{name}_spoke{k}_{j}', side, face + side * 0.004, y, r, a + d * 0.1, a + d * 0.2,
                               r * 0.15, r * 0.67, 0.044, 0.032, 0.03, 0.02, rim_mat))
    w = join(parts, name)
    bpy.context.scene.cursor.location = (x, y, r)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    # the caliper grips the rear of the disc, just inside the spokes
    ca = math.pi - 0.45  # toward the back of the car, a little above the axle
    cal = annulus(f'caliper_{"front" if front else "rr"}_{name[-1]}', r * 0.34, r * 0.56, 0.05,
                  (face - side * 0.036, y, r), M['caliper'], 24, ca - 0.5, ca + 0.5)
    bpy.context.view_layer.objects.active = cal
    bpy.ops.object.select_all(action='DESELECT'); cal.select_set(True)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return w


def wheel(name, x, y, r, width, M, rim_mat, spokes, side, paired=False):
    face = x + side * width / 2
    parts = [
        cylinder(f'{name}_tyre', r, width, (x, y, r), M['tyre'], 40, bevel=r * 0.2),
        cylinder(f'{name}_barrel', r * 0.7, 0.01, (face + side * 0.002, y, r), M['barrel'], 36),
        cylinder(f'{name}_disc', r * 0.52, 0.02, (face - side * 0.04, y, r), M['disc'], 28),
    ]
    angles = []
    for k in range(spokes):
        a = k / spokes * math.tau
        angles += [a - 0.1, a + 0.1] if paired else [a]
    thick = 0.05 if paired else (0.07 if spokes <= 6 else 0.042)
    for i, a in enumerate(angles):
        rr = r * 0.37
        parts.append(box(f'{name}_spoke{i}', (0.03, r * 0.62, r * thick * 3.2),
                         (face + side * 0.012, y + math.cos(a) * rr, r + math.sin(a) * rr), rim_mat, rot=(a, 0, 0)))
    for k in range(28):
        a = k / 28 * math.tau
        parts.append(box(f'{name}_lip{k}', (0.03, r * 0.17, 0.035), (face + side * 0.01, y + math.cos(a) * r * 0.71, r + math.sin(a) * r * 0.71), rim_mat, rot=(a + math.pi / 2, 0, 0)))
    parts.append(cylinder(f'{name}_hub', r * 0.15, 0.05, (face + side * 0.016, y, r), rim_mat, 16))
    w = join(parts, name)
    bpy.context.scene.cursor.location = (x, y, r)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return w


def common():
    return dict(
        glass=mat('glass', '#10151a', metal=0.3, rough=0.03),
        trim=mat('trim', '#131416', rough=0.5),
        gloss_black=mat('gloss_black', '#0b0c0d', rough=0.12),
        chrome=mat('chrome', '#dfe3e7', metal=1.0, rough=0.1),
        tyre=mat('tyre', '#171717', rough=0.9),
        barrel=mat('rim_barrel', '#18191b', metal=0.5, rough=0.5),
        disc=mat('brake_disc', '#6b6e72', metal=0.9, rough=0.35),
        rim=mat('rim', '#c3c8cd', metal=1.0, rough=0.22),
        head=mat('headlight', '#cfd6db', metal=0.6, rough=0.06, emit='#fff4dc', strength=0.4),
        drl=mat('drl', '#ffffff', emit='#ffffff', strength=3.0),
        tail=mat('taillight', '#6e0a0a', rough=0.12, emit='#ff1e12', strength=0.8),
        ind=mat('indicator', '#c96a12', rough=0.2, emit='#ff8a1c', strength=0.3),
        plate=mat('plate', '#f1f1ec', rough=0.4),
        plate_band=mat('plate_band', '#2a4aa8', rough=0.4),
        plate_text=mat('plate_text', '#111111', rough=0.5),
        caliper=mat('caliper_red', '#c4121c', rough=0.3),  # (only exported by cars that use it)
    )


# ------------------------------------------------------------------ car builder
def build(spec):
    clear_scene()
    M = common()
    paint = spec['paint']()
    L, W, r = spec['L'], spec['W'], spec['r']
    hw = W / 2
    yr, yf = spec['wheels']
    ar = r + spec.get('arch_gap', 0.07)
    b_r, b_f = spec['belt']

    def belt(y):  # belt line height, rising toward the rear
        t = max(0.0, min(1.0, (y + L / 2) / L))
        return b_r + (b_f - b_r) * t

    top = spec['lower']
    bottom = [(top[-1][0], spec['sill'])]
    for yc in (yf, yr):
        bottom.append((yc + ar, spec['sill']))
        for k in range(1, 14):
            a = k / 14 * math.pi
            bottom.append((yc + math.cos(a) * ar, max(spec['sill'], r + math.sin(a) * ar)))
        bottom.append((yc - ar, spec['sill']))
    bottom.append((top[0][0], spec['sill']))

    bow_f, bow_r = spec.get('bow', (0.0, 0.0))
    roll_from = spec.get('roll_from', 0.2)

    def top_z(y):  # the body outline's upper edge (before the bevel grows it)
        best = -1.0
        for a, b in zip(top, top[1:]):
            if min(a[0], b[0]) <= y <= max(a[0], b[0]) and abs(b[0] - a[0]) > 1e-6:
                best = max(best, a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]))
        return best

    def plan(v, half):
        """Plan-view shaping shared by the body and (optionally) the cabin: the corners of the nose and tail sweep
        back so the ends read rounded (bow), and the sides pull in toward the ends (pinch)."""
        if bow_f or bow_r:
            k = (v.x / half) ** 2
            tf = max(0.0, min(1.0, (v.y - yf - ar) / (L / 2 - yf - ar)))
            tr = max(0.0, min(1.0, (yr - ar - v.y) / (L / 2 + yr - ar)))
            v.y += -bow_f * k * tf ** 1.6 + bow_r * k * tr ** 1.6
        end = min(v.y + L / 2, L / 2 - v.y)
        return 1 - spec.get('pinch', 0.1) * (1 - min(1, end / 0.75)) ** 2

    crown = spec.get('crown')  # (y0, y1, height): the bonnet domes up between the wings

    def body_deform(v):
        x0 = v.x
        pinch = plan(v, hw)
        if crown and crown[0] < v.y < crown[1]:
            y0, y1, hc = crown
            ramp = min(1.0, (v.y - y0) / 0.25, (y1 - v.y) / 0.2)
            surf = max(0.0, min(1.0, (v.z - (top_z(v.y) - 0.05)) / 0.12))
            v.z += hc * ramp * surf * (1 - (x0 / hw) ** 2)
        near = max(math.exp(-((v.y - yf) / 0.55) ** 2), math.exp(-((v.y - yr) / 0.55) ** 2))
        flare = 1 + spec.get('flare', 0.03) * near * max(0, 1 - abs(v.z - r - 0.1) / 0.6)
        roll = 1 - 0.06 * min(1, max(0, (v.z - (belt(v.y) - roll_from)) / roll_from))  # the shoulder turns in
        v.x *= pinch * flare * roll
        return v

    extrude_profile('body', top + bottom, hw, 0.075, paint, body_deform, spec.get('xcuts', ()), spec.get('bevel_res', 5))

    cab = spec['cabin']
    roof = max(p[1] for p in cab)
    chw = hw * spec.get('cabin_w', 0.84)
    tumble = spec.get('tumble', 0.16)
    blo = min(b_r, b_f)

    def cab_x(z):
        return chw * (1 - tumble * max(0, min(1, (z - blo) / (roof - blo))))

    cbow = spec.get('cab_bow', 0.0)
    ws_from = spec.get('cab_bow_from', 0.0)

    follow = spec.get('cab_follow', False)  # the cabin takes the body's plan shape at the ends (no ledge)

    cbow_r, cbow_r_from, cbow_r_z = spec.get('cab_bow_r', (0.0, 0.0, 0.0))

    def cabin_deform(v):
        if cbow_r:  # the tailgate glass wraps forward at its sides in plan (above cbow_r_z, so it still meets the body)
            v.y += cbow_r * (v.x / chw) ** 2 * max(0.0, min(1.0, (cbow_r_from - v.y) / 0.35)) * max(0.0, min(1.0, (v.z - cbow_r_z) / 0.25))
        if follow:
            v.x *= plan(v, chw)
        if cbow:  # the windscreen curves back toward the A-pillars in plan
            v.y -= cbow * (v.x / chw) ** 2 * max(0.0, min(1.0, (v.y - ws_from) / 0.6))
        v.x *= cab_x(v.z) / chw
        return v

    extrude_profile('cabin', cab, chw, spec.get('cab_bevel', 0.09), paint, cabin_deform, spec.get('cab_xcuts', ()), spec.get('bevel_res', 5))

    def edge_z(y):
        best = -1.0
        for a, b in zip(cab, cab[1:]):
            if min(a[0], b[0]) <= y <= max(a[0], b[0]) and abs(b[0] - a[0]) > 1e-6:
                t = (y - a[0]) / (b[0] - a[0])
                best = max(best, a[1] + (b[1] - a[1]) * t)
        return best

    # ---- side glazing (daylight opening) with chrome surround and black pillars
    inset = spec.get('dlo_inset', 0.075)
    ys = [cab[0][0] + i * (cab[-1][0] - cab[0][0]) / 120 for i in range(121)]
    if cbow:  # the side of the cabin is swept back by the windscreen's curvature
        side_z = lambda y: edge_z(y + cbow * 0.8 * max(0.0, min(1.0, (y - ws_from) / 0.6)))
    else:
        side_z = edge_z
    cap = spec.get('dlo_drop')  # ((y0, z0), (y1, z1)): the top of the side glass falls toward the rear from y0
    if cap:
        (cy0, cz0), (cy1, cz1) = cap
        dlo_top = lambda y: min(side_z(y) - inset, cz0 + (cz1 - cz0) * max(0.0, (cy0 - y) / (cy0 - cy1)))
    else:
        dlo_top = lambda y: side_z(y) - inset
    dlo = [(y, dlo_top(y)) for y in ys if dlo_top(y) > belt(y) + 0.1]
    glass_poly = dlo + [(y, belt(y) + 0.045) for y, _ in reversed(dlo)]
    cp = spec.get('c_pillar')  # ((y, z) at the belt, (y, z) at the top): the glazing ends at this line
    yline = (lambda z: cp[0][0] + (cp[1][0] - cp[0][0]) * (z - cp[0][1]) / (cp[1][1] - cp[0][1])) if cp else (lambda z: -99)
    if cp:
        glass_poly = clip_half(glass_poly, lambda p: p[0] - yline(p[1]))
    dlo_mat = M[spec.get('dlo_trim', 'chrome')]
    for view, s in (('right', 1), ('left', -1)):
        decal(f'side_glass_{s}', glass_poly, view, ['cabin'], M['glass'], 0.004, cuts=spec.get('glass_cuts', 2))
        dtop = dict(dlo)
        bys = [y for y, _ in dlo if y >= yline(belt(y) + 0.03)]
        tys = [y for y, _ in dlo if y >= yline(dtop[y])]
        strip(f'dlo_chrome_bot_{s}', bys, lambda y: belt(y) + 0.02, lambda y: belt(y) + 0.045, view, ['cabin', 'body'], dlo_mat, 0.006, rows=1)
        strip(f'dlo_chrome_top_{s}', tys, lambda y: dtop[y], lambda y: dtop[y] + 0.025, view, ['cabin'], dlo_mat, 0.006, rows=1)
        if cp:  # a trim edge down the front of the C-pillar
            zb, zt = belt(cp[0][0]) + 0.02, dtop.get(min(tys, default=cp[1][0]), cp[1][1]) + 0.025
            decal(f'dlo_c_{s}', [(yline(zb) - 0.022, zb), (yline(zb), zb), (yline(zt), zt), (yline(zt) - 0.022, zt)], view, ['cabin'], dlo_mat, 0.006, cuts=2)
        for yp, wp in spec['pillars']:
            decal(f'pillar_{yp}_{s}', [(yp - wp / 2, belt(yp) + 0.04), (yp + wp / 2, belt(yp) + 0.04), (yp + wp / 2, dlo_top(yp) + 0.01), (yp - wp / 2, dlo_top(yp) + 0.01)],
                  view, ['cabin'], M['gloss_black'], 0.008, cuts=2)
        hd = spec.get('handle_drop', 0.0)
        for yh in spec.get('handles', []):
            decal(f'handle_{yh}_{s}', [(yh - 0.1, belt(yh) - 0.1 - hd), (yh + 0.1, belt(yh) - 0.1 - hd), (yh + 0.1, belt(yh) - 0.065 - hd), (yh - 0.1, belt(yh) - 0.065 - hd)], view, ['body'], M['trim'], 0.012, cuts=1)
        decal(f'skirt_{s}', [(yr + ar + 0.02, spec['sill'] + 0.01), (yf - ar - 0.02, spec['sill'] + 0.01), (yf - ar - 0.02, spec['sill'] + 0.1), (yr + ar + 0.02, spec['sill'] + 0.1)],
              view, ['body'], M['trim'], 0.005, cuts=2)

    # ---- windscreen and rear screen (projected from the front / rear onto the cabin)
    fb, rb = cab[-1], cab[0]
    zt_f = spec.get('windscreen_top', roof - 0.1)
    zb_f = fb[1] + 0.06
    ws = [(-cab_x(zb_f) + 0.07, zb_f), (cab_x(zb_f) - 0.07, zb_f), (cab_x(zt_f) - 0.08, zt_f), (-cab_x(zt_f) + 0.08, zt_f)]
    decal('windscreen', ws, 'front', ['cabin'], M['glass'], spec.get('screen_offset', 0.004), cuts=spec.get('screen_cuts', 3))
    zt_r = spec.get('rear_screen_top', roof - 0.1)
    zb_r = spec.get('rear_screen_bottom', rb[1] + 0.08)
    rs = [(-cab_x(zb_r) + 0.1, zb_r), (cab_x(zb_r) - 0.1, zb_r), (cab_x(zt_r) - 0.12, zt_r), (-cab_x(zt_r) + 0.12, zt_r)]
    decal('rear_screen', rs, 'rear', ['cabin'], M['glass'], spec.get('screen_offset', 0.004), cuts=spec.get('screen_cuts', 3))

    for s in (-1, 1):
        my = spec.get('mirror_y', fb[0] - 0.1)  # (the mirror sits on the door, just behind the A-pillar base)
        mz = belt(fb[0]) if 'mirror_y' not in spec else belt(my)
        box(f'mirror_{s}', (0.22, 0.13, 0.12), (s * (hw + 0.06), my, mz + 0.11), paint, 0.04)
        box(f'mirror_arm_{s}', (0.12, 0.07, 0.035), (s * (hw - 0.01), my + 0.02, mz + 0.07), M['trim'])
        box(f'mirror_ind_{s}', (0.12, 0.02, 0.02), (s * (hw + 0.1), my + 0.07, mz + 0.09), M['ind'])

    # ---- front and rear details: 2D outlines (right-hand shapes are mirrored for the left)
    front, rear = spec['front'], spec['rear']
    for part, material, off in (('grille_surround', 'chrome', 0.006), ('grille', 'gloss_black', 0.01), ('intake', 'trim', 0.006), ('headlight', 'head', 0.008), ('drl', 'drl', 0.012), ('fog', 'trim', 0.008)):
        for i, poly in enumerate(front.get(part, [])):
            decal(f'{part}_{i}', poly, 'front', ['body'], M[material], off)
            if poly[0][0] > 0.05:
                decal(f'{part}_{i}_m', mirror_x(poly), 'front', ['body'], M[material], off)
    for i, bar in enumerate(front.get('slats', [])):
        decal(f'slat_{i}', bar, 'front', ['body'], M['chrome'], 0.014, cuts=1)
    if 'logo' in front:
        cx, cz, rx, rz = front['logo']
        decal('logo', [(cx + math.cos(a) * rx, cz + math.sin(a) * rz) for a in [k / 20 * math.tau for k in range(20)]], 'front', ['body'], M['chrome'], 0.016, cuts=1)
    for part, material, off in (('tail', 'tail', 0.008), ('reflector', 'tail', 0.006), ('diffuser', 'trim', 0.006)):
        for i, poly in enumerate(rear.get(part, [])):
            decal(f'r_{part}_{i}', poly, 'rear', ['body', 'cabin'], M[material], off)
            if poly[0][0] > 0.05:
                decal(f'r_{part}_{i}_m', mirror_x(poly), 'rear', ['body', 'cabin'], M[material], off)
    for view, (pz, reg) in (('front', front['plate']), ('rear', rear['plate'])):
        # the IRL band is on the viewer's left: -x from behind, +x seen from the front
        bx = 0.235 if view == 'front' else -0.235
        decal(f'plate_{view}', [(-0.26, pz - 0.055), (0.26, pz - 0.055), (0.26, pz + 0.055), (-0.26, pz + 0.055)], view, ['body'], M['plate'], 0.014, cuts=2)
        decal(f'plate_band_{view}', [(bx - 0.025, pz - 0.055), (bx + 0.025, pz - 0.055), (bx + 0.025, pz + 0.055), (bx - 0.025, pz + 0.055)], view, ['body'], M['plate_band'], 0.018, cuts=1)
        text_decal(f'plate_text_{view}', reg, 0.075, (-bx * 0.1, pz - 0.005), view, ['body'], M['plate_text'], 0.02, stretch=0.82)

    rim_mat = spec['rim']() if 'rim' in spec else M['rim']
    for yc, tag in ((yr, 'rear'), (yf, 'front')):
        for s in (-1, 1):
            if 'wheel_fn' in spec:
                spec['wheel_fn'](f'wheel_{tag}_{"l" if s < 0 else "r"}', s * (hw - spec['tyre_w'] / 2 - spec.get('wheel_inset', 0.03)), yc, r, spec['tyre_w'], M, rim_mat, s, tag == 'front')
                continue
            wheel(f'wheel_{tag}_{"l" if s < 0 else "r"}', s * (hw - spec['tyre_w'] / 2 - 0.03), yc, r, spec['tyre_w'], M, rim_mat, spec.get('spokes', 5), s, spec.get('paired', False))
    if 'extras' in spec:
        spec['extras'](M, paint, dict(belt=belt, edge_z=edge_z, cab_x=cab_x, roof=roof, hw=hw, L=L))

    path = os.path.join(OUT, f"{spec['name']}.glb")
    bpy.ops.object.select_all(action='SELECT')
    draco = dict(export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_draco_position_quantization=14,
                 export_draco_normal_quantization=10, export_draco_texcoord_quantization=12) if spec.get('draco') else {}
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, **draco)
    print('EXPORTED', path, os.path.getsize(path))


# ------------------------------------------------------------------ Hyundai i40 Tourer
I40 = dict(
    L=4.78, W=1.815, sill=0.27, r=0.33, tyre_w=0.23, wheels=(-1.31, 1.46), belt=(1.0, 0.93), pinch=0.13, flare=0.035,
    lower=[(-2.39, 0.42), (-2.41, 0.64), (-2.39, 0.92), (-2.31, 1.02), (-1.2, 0.99), (0.95, 0.94), (1.6, 0.86), (2.12, 0.77), (2.35, 0.67), (2.39, 0.5), (2.36, 0.34)],
    cabin=[(-2.33, 1.0), (-2.2, 1.36), (-1.98, 1.45), (-0.3, 1.48), (0.32, 1.46), (0.6, 1.4), (1.2, 0.94)],
    cabin_w=0.87, tumble=0.15, spokes=5, paired=True,
    pillars=[(0.02, 0.1), (-1.1, 0.07)],
    handles=[0.45, -0.72],
    windscreen_top=1.36, rear_screen_top=1.36, rear_screen_bottom=1.08,
    front=dict(
        grille_surround=[[(-0.5, 0.735), (0.5, 0.735), (0.585, 0.63), (0.47, 0.37), (-0.47, 0.37), (-0.585, 0.63)]],
        grille=[[(-0.47, 0.715), (0.47, 0.715), (0.55, 0.63), (0.445, 0.39), (-0.445, 0.39), (-0.55, 0.63)]],
        slats=[[(-0.5, z), (0.5, z), (0.5, z + 0.012), (-0.5, z + 0.012)] for z in (0.48, 0.55, 0.62)],
        logo=(0, 0.675, 0.075, 0.037),
        headlight=[[(0.55, 0.735), (0.66, 0.78), (0.86, 0.82), (0.93, 0.78), (0.9, 0.71), (0.6, 0.69)]],
        drl=[[(0.62, 0.705), (0.88, 0.725), (0.88, 0.738), (0.62, 0.72)]],
        intake=[[(-0.62, 0.24), (0.62, 0.24), (0.66, 0.33), (-0.66, 0.33)]],
        fog=[[(0.68, 0.36), (0.82, 0.37), (0.84, 0.45), (0.7, 0.44)]],
        plate=(0.3, '161-D-27917'),
    ),
    rear=dict(
        tail=[[(0.28, 1.0), (0.8, 0.99), (0.9, 0.95), (0.9, 0.87), (0.56, 0.88), (0.3, 0.93)]],
        reflector=[[(0.66, 0.36), (0.82, 0.36), (0.82, 0.39), (0.66, 0.39)]],
        diffuser=[[(-0.7, 0.27), (0.7, 0.27), (0.7, 0.34), (-0.7, 0.34)]],
        plate=(0.72, '142-D-10189'),
    ),
)


def roof_kit(M, geom, bar_y=-0.3):
    """Roof rails and the Garda lightbar (blue lenses either side of a white GARDA panel)."""
    edge_z, cab_x = geom['edge_z'], geom['cab_x']
    for s in (-1, 1):
        for i in range(12):
            y = -1.95 + i * 0.19
            z = edge_z(y)
            box(f'rail_{s}_{i}', (0.035, 0.2, 0.035), (s * (cab_x(z) - 0.12), y, z + 0.025), M['trim'], 0.01)
    z = edge_z(bar_y)
    box('lightbar_base', (1.25, 0.3, 0.05), (0, bar_y, z + 0.04), M['trim'], 0.02)
    for i, s in enumerate((-1, 1)):
        lb = mat(f'lightbar_{i}', '#0b2a8c', rough=0.08, emit='#2f6bff', strength=0.2)
        box(f'lightbar_lens_{i}', (0.46, 0.27, 0.11), (s * 0.35, bar_y, z + 0.12), lb, 0.04)
    box('lightbar_centre', (0.24, 0.27, 0.11), (0, bar_y, z + 0.12), mat('lightbar_panel', '#f4f4f0', rough=0.3), 0.02)
    blue = bpy.data.materials.get('garda_blue') or mat('garda_blue', '#1a3aa0', rough=0.35)
    for view in ('front', 'rear'):
        text_decal(f'lightbar_text_{view}', 'GARDA', 0.05, (0, z + 0.12), view, ['lightbar_centre'], blue, 0.004)


def garda_patrol_extras(M, paint, geom):
    belt = geom['belt']
    yellow = mat('garda_yellow', '#e6f000', rough=0.35, emit='#e6f000', strength=0.18)
    blue = mat('garda_blue', '#1a3aa0', rough=0.35)
    orange = mat('chevron_orange', '#ff5a1f', rough=0.35, emit='#ff5a1f', strength=0.12)
    # waist band: fluorescent yellow edged in blue, from the tail to behind the headlights
    samples = [-2.3 + 4.5 * i / 60 for i in range(61)]
    lo = lambda y: belt(y) - 0.2
    hi = lambda y: belt(y) - 0.09
    for view, s in (('right', 1), ('left', -1)):
        strip(f'band_{s}', samples, lo, hi, view, ['body'], yellow, 0.007, rows=3)
        strip(f'band_top_{s}', samples, hi, lambda y: hi(y) + 0.022, view, ['body'], blue, 0.009, rows=1)
        strip(f'band_bot_{s}', samples, lambda y: lo(y) - 0.022, lo, view, ['body'], blue, 0.009, rows=1)
        text_decal(f'garda_door_{s}', 'GARDA', 0.2, (0.55 * s, belt(0.55) - 0.36), view, ['body'], blue, 0.01, italic=True)
        text_decal(f'www_{s}', 'www.garda.ie', 0.06, (-0.75 * s, belt(-0.75) - 0.3), view, ['body'], blue, 0.01, italic=True)
        decal(f'crest_{s}', [(0.95 + math.cos(a) * 0.05, belt(0.95) - 0.145 + math.sin(a) * 0.065) for a in [k / 16 * math.tau for k in range(16)]], view, ['body'], blue, 0.012, cuts=1)
    # rear: yellow / orange chevrons pointing up across the tailgate, GARDA on a yellow bumper band
    x0, x1, z0, z1 = 0.0, 0.88, 0.47, 0.86
    k, w, slope = 0, 0.13, 0.75
    c = z0 - 0.1
    while c < z1 + slope * x1:
        poly = clip([(0, c), (2, c - 2 * slope), (2, c + w - 2 * slope), (0, c + w)], x0, x1, z0, z1)
        if len(poly) >= 3:
            m = yellow if k % 2 == 0 else orange
            decal(f'chev_{k}', poly, 'rear', ['body', 'cabin'], m, 0.007, cuts=2)
            decal(f'chev_{k}_m', mirror_x(poly), 'rear', ['body', 'cabin'], m, 0.007, cuts=2)
        c += w; k += 1
    decal('rear_band', [(-0.86, 0.36), (0.86, 0.36), (0.86, 0.46), (-0.86, 0.46)], 'rear', ['body'], yellow, 0.007, cuts=2)
    text_decal('garda_rear', 'GARDA', 0.1, (0, 0.41), 'rear', ['body'], blue, 0.011, stretch=1.25)
    text_decal('garda_bonnet', 'GARDA', 0.17, (0, 1.75), 'top', ['body'], blue, 0.008, stretch=1.1)
    roof_kit(M, geom)


def garda_rp_extras(M, paint, geom):
    belt = geom['belt']
    yellow = mat('garda_yellow', '#e6f000', rough=0.35, emit='#e6f000', strength=0.18)
    blue = mat('garda_blue', '#1a3aa0', rough=0.35)
    # Battenburg: two rows of blue / yellow blocks along both flanks
    y_a, y_b, n = -2.3, 1.84, 9
    cw = (y_b - y_a) / n
    for view, s in (('right', 1), ('left', -1)):
        for i in range(n):
            ya, yb = y_a + i * cw, y_a + (i + 1) * cw
            ys_ = [ya + (yb - ya) * t / 4 for t in range(5)]
            for row in (0, 1):
                m = yellow if (i + row) % 2 == 0 else blue
                za = (lambda y: 0.34) if row == 0 else (lambda y: 0.34 + (belt(y) - 0.34) / 2)
                zb = (lambda y: 0.34 + (belt(y) - 0.34) / 2) if row == 0 else (lambda y: belt(y) - 0.005)
                strip(f'bb_{s}_{i}_{row}', ys_, za, zb, view, ['body'], m, 0.007, rows=4)
        text_decal(f'garda_door_{s}', 'GARDA', 0.18, (0.55 * s, 0.47), view, ['body'], mat(f'garda_white_{s}', '#f4f4f1', rough=0.3), 0.011, italic=True)
    decal('bonnet_yellow', [(-0.75, 1.05), (0.75, 1.05), (0.72, 2.2), (-0.72, 2.2)], 'top', ['body'], yellow, 0.006, cuts=4)
    text_decal('garda_bonnet', 'GARDA', 0.17, (0, 1.85), 'top', ['body'], blue, 0.009, stretch=1.1)
    text_decal('rp_bonnet', 'ROADS POLICING', 0.075, (0, 1.62), 'top', ['body'], blue, 0.009)
    decal('rear_band', [(-0.86, 0.36), (0.86, 0.36), (0.86, 0.86), (-0.86, 0.86)], 'rear', ['body', 'cabin'], yellow, 0.007, cuts=3)
    text_decal('garda_rear', 'GARDA', 0.1, (0, 0.44), 'rear', ['body'], blue, 0.011, stretch=1.25)
    roof_kit(M, geom)


WHITE = lambda: mat('paint_white', '#f4f4f1', metal=0.12, rough=0.26, coat=0.9)
GARDA = dict(I40, name='garda', paint=WHITE, extras=garda_patrol_extras)
GARDA_RP = dict(I40, name='garda_rp', paint=WHITE, extras=garda_rp_extras)


# ------------------------------------------------------------------ i30 N style hot hatch
def i30n_extras(M, paint, geom):
    red = mat('n_red', '#d0112b', rough=0.3)
    decal('lip_red', [(-0.8, 0.265), (0.8, 0.265), (0.8, 0.285), (-0.8, 0.285)], 'front', ['body'], red, 0.012, cuts=2)
    for view in ('right', 'left'):
        decal(f'skirt_red_{view}', [(-1.0, 0.3), (0.95, 0.3), (0.95, 0.315), (-1.0, 0.315)], view, ['body'], red, 0.012, cuts=2)
    z = geom['edge_z'](-1.95)
    box('roof_spoiler', (1.3, 0.3, 0.05), (0, -1.98, z + 0.01), M['gloss_black'], 0.02)
    box('spoiler_light', (0.3, 0.03, 0.03), (0, -2.12, z - 0.005), M['tail'])
    for s in (-1, 1):
        cylinder(f'exhaust_{s}', 0.055, 0.14, (s * 0.55, -2.15, 0.33), M['chrome'], 20, axis='Y')
    text_decal('n_badge', 'N', 0.09, (0.0, 0.6), 'front', ['body'], red, 0.02)


HATCH = dict(
    name='hatch', L=4.34, W=1.8, sill=0.27, r=0.34, tyre_w=0.24, wheels=(-1.26, 1.39), belt=(0.99, 0.92), pinch=0.14, flare=0.06,
    paint=lambda: mat('paint_blue', '#2c5ea8', metal=0.45, rough=0.22, coat=1.0),
    rim=lambda: mat('rim_grey', '#4a4e54', metal=1.0, rough=0.25),
    lower=[(-2.15, 0.4), (-2.17, 0.66), (-2.14, 0.93), (-2.05, 1.0), (0.95, 0.93), (1.6, 0.84), (2.05, 0.73), (2.16, 0.6), (2.17, 0.46), (2.13, 0.33)],
    cabin=[(-2.07, 0.99), (-1.8, 1.36), (-1.5, 1.44), (-0.15, 1.45), (0.3, 1.38), (1.05, 0.93)],
    cabin_w=0.86, tumble=0.18, spokes=5,
    pillars=[(-0.25, 0.1)],
    handles=[0.3],
    windscreen_top=1.33, rear_screen_top=1.33, rear_screen_bottom=1.06,
    front=dict(
        grille_surround=[[(-0.44, 0.66), (0.44, 0.66), (0.52, 0.56), (0.46, 0.32), (-0.46, 0.32), (-0.52, 0.56)]],
        grille=[[(-0.42, 0.645), (0.42, 0.645), (0.5, 0.56), (0.44, 0.34), (-0.44, 0.34), (-0.5, 0.56)]],
        headlight=[[(0.5, 0.66), (0.63, 0.72), (0.84, 0.76), (0.9, 0.71), (0.86, 0.65), (0.56, 0.63)]],
        drl=[[(0.58, 0.645), (0.84, 0.665), (0.84, 0.677), (0.58, 0.658)]],
        intake=[[(0.6, 0.3), (0.84, 0.32), (0.86, 0.46), (0.64, 0.44)]],
        plate=(0.28, '231-D-4410'),
    ),
    rear=dict(
        tail=[[(0.42, 0.98), (0.82, 0.97), (0.89, 0.93), (0.88, 0.86), (0.6, 0.88), (0.44, 0.92)]],
        diffuser=[[(-0.72, 0.28), (0.72, 0.28), (0.72, 0.36), (-0.72, 0.36)]],
        reflector=[[(0.74, 0.38), (0.84, 0.38), (0.84, 0.44), (0.74, 0.44)]],
        plate=(0.6, '232-D-1789'),
    ),
    extras=i30n_extras,
)


# ------------------------------------------------------------------ suspect coupe
def coupe_extras(M, paint, geom):
    box('ducktail', (1.7, 0.26, 0.05), (0, -2.14, 0.9), paint, 0.025)
    for s in (-1, 1):
        cylinder(f'exhaust_{s}', 0.055, 0.14, (s * 0.52, -2.3, 0.32), M['chrome'], 16, axis='Y')


COUPE = dict(
    name='coupe', L=4.55, W=1.94, sill=0.24, r=0.35, tyre_w=0.28, wheels=(-1.36, 1.4), belt=(0.82, 0.79), pinch=0.14, flare=0.07,
    paint=lambda: mat('paint_red', '#8c0e1b', metal=0.55, rough=0.2, coat=1.0),
    rim=lambda: mat('rim_dark', '#26282c', metal=1.0, rough=0.28),
    lower=[(-2.27, 0.34), (-2.3, 0.78), (-2.22, 0.86), (0.5, 0.8), (1.7, 0.7), (2.2, 0.58), (2.28, 0.45), (2.25, 0.32)],
    cabin=[(-2.08, 0.82), (-1.3, 1.08), (-0.6, 1.22), (0.1, 1.23), (0.5, 1.15), (1.15, 0.8)],
    cabin_w=0.8, tumble=0.2, spokes=10,
    pillars=[(-0.45, 0.09)],
    handles=[0.2],
    windscreen_top=1.13, rear_screen_top=1.02, rear_screen_bottom=0.86,
    front=dict(
        grille=[[(-0.5, 0.42), (0.5, 0.42), (0.58, 0.32), (-0.58, 0.32)]],
        headlight=[[(0.5, 0.58), (0.7, 0.62), (0.9, 0.6), (0.9, 0.55), (0.55, 0.53)]],
        drl=[[(0.55, 0.545), (0.88, 0.565), (0.88, 0.575), (0.55, 0.556)]],
        plate=(0.37, '08-KE-1127'),
    ),
    rear=dict(
        tail=[[(0.05, 0.84), (0.9, 0.82), (0.92, 0.77), (0.05, 0.79)]],
        diffuser=[[(-0.8, 0.25), (0.8, 0.25), (0.8, 0.35), (-0.8, 0.35)]],
        plate=(0.55, '191-D-2847'),
    ),
    extras=coupe_extras,
)

# ------------------------------------------------------------------ GT: a hot hatch in the classic mould
# Inspired by the Mk7 / Mk8-era hot hatch silhouette (reference photos: refs/hot-hatch/sources.json): a short,
# upright five-door with a thick forward-leaning C-pillar, low stance, honeycomb grilles with a thin red line
# running across the grille into the LED headlights, roof spoiler, black diffuser with a tailpipe each side,
# dark twin-spoke alloys over red calipers. Original name and a plain badge: no maker's marks.
GT_L = 4.27
GT_BELT = (1.025, 0.884)  # the visible belt line (DLO bottom) at the tail and nose: 1.0 above the rear axle, 0.93 at the A-pillar


def gt_belt(y):
    return GT_BELT[0] + (GT_BELT[1] - GT_BELT[0]) * (y + GT_L / 2) / GT_L


def gt_extras(M, paint, geom):
    accent = mat('accent_red', '#d0101c', rough=0.25)
    void = mat('grille_void', '#050506', rough=0.9)
    led = mat('taillight_led', '#ff5a48', rough=0.1, emit='#ff2a1a', strength=1.6)
    rev = mat('reverse_lamp', '#dde1e4', rough=0.08, emit='#ffffff', strength=0.0)
    refl = accent  # (the red reflectors share the grille line's material: one draw call fewer)
    gb, B = M['gloss_black'], ['body']

    def both(name, poly, view, targets, material, off, cuts=3):
        decal(name, poly, view, targets, material, off, cuts)
        decal(f'{name}_m', mirror_x(poly), view, targets, material, off, cuts)

    # ---- front: upper honeycomb grille between the headlights, the red line under it, plain round badge
    ug = [(-0.45, 0.655), (0.45, 0.655), (0.475, 0.70), (0.455, 0.728), (-0.455, 0.728), (-0.475, 0.70)]
    decal('grille_up', ug, 'front', B, void, 0.008)
    honeycomb('grille_up_hex', ug, 0.028, 0.005, 'front', B, gb, 0.011)
    xs = [-0.64 + 1.28 * i / 16 for i in range(17)]
    strip('red_line', xs, lambda x: 0.643, lambda x: 0.657, 'front', B, accent, 0.018, rows=1)
    ring_decal('badge_f_ring', (0, 0.69), 0.046, 0.058, 'front', B, M['chrome'], 0.024, 28)
    ring_decal('badge_f', (0, 0.69), 0, 0.047, 'front', B, gb, 0.022, 28)
    decal('badge_f_bar', [(-0.03, 0.686), (0.03, 0.686), (0.03, 0.694), (-0.03, 0.694)], 'front', B, M['chrome'], 0.027, cuts=1)
    # headlights: dark housing, two projector lenses in chrome rings, an LED wing along the top edge
    hl = [(0.44, 0.645), (0.475, 0.70), (0.505, 0.737), (0.66, 0.757), (0.80, 0.762), (0.872, 0.738), (0.888, 0.69), (0.862, 0.65), (0.62, 0.641)]
    both('head_housing', hl, 'front', B, gb, 0.009)
    for i, (cx, cz, rr) in enumerate(((0.575, 0.694, 0.03), (0.765, 0.7, 0.036))):
        for sx in (1, -1):
            ring_decal(f'head_ring_{i}_{sx}', (cx * sx, cz), rr, rr + 0.009, 'front', B, M['chrome'], 0.013, 20)
            ring_decal(f'head_lens_{i}_{sx}', (cx * sx, cz), 0, rr, 'front', B, M['head'], 0.013, 20)
    both('head_drl', [(0.50, 0.724), (0.66, 0.744), (0.80, 0.749), (0.862, 0.728), (0.866, 0.716), (0.80, 0.737), (0.66, 0.733), (0.505, 0.713)], 'front', B, M['drl'], 0.015)
    # lower bumper: wide honeycomb intake, side intakes with three fins, black splitter
    li = [(-0.55, 0.25), (0.55, 0.25), (0.60, 0.30), (0.545, 0.455), (-0.545, 0.455), (-0.60, 0.30)]
    decal('intake_frame', [(-0.575, 0.232), (0.575, 0.232), (0.63, 0.30), (0.565, 0.472), (-0.565, 0.472), (-0.63, 0.30)], 'front', B, gb, 0.006)
    decal('intake', li, 'front', B, void, 0.009)
    honeycomb('intake_hex', li, 0.042, 0.0075, 'front', B, gb, 0.011)
    # side intakes: tall, framed in gloss black, reaching round the bumper corners
    si = [(0.665, 0.255), (0.845, 0.27), (0.885, 0.32), (0.89, 0.50), (0.70, 0.50), (0.655, 0.37)]
    both('side_intake_frame', [(0.645, 0.235), (0.86, 0.25), (0.91, 0.31), (0.915, 0.525), (0.68, 0.525), (0.63, 0.37)], 'front', B, gb, 0.006)
    both('side_intake', si, 'front', B, void, 0.009)
    for k, z in enumerate((0.31, 0.36, 0.41)):
        both(f'fin_{k}', [(0.665, z), (0.885, z + 0.014), (0.885, z + 0.03), (0.67, z + 0.016)], 'front', B, gb, 0.016, cuts=1)
    both('fog', [(0.73, 0.462), (0.85, 0.466), (0.852, 0.484), (0.735, 0.482)], 'front', B, M['head'], 0.018, cuts=1)
    strip('splitter', [-0.87 + 1.74 * i / 14 for i in range(15)], lambda x: 0.2, lambda x: 0.24, 'front', B, M['trim'], 0.01, rows=2)
    # wing badge: a plain red and chrome bar behind the front wheel arch
    for view in ('right', 'left'):
        decal(f'wing_badge_{view}', [(0.78, 0.765), (0.9, 0.765), (0.9, 0.778), (0.78, 0.778)], view, B, accent, 0.012, cuts=1)

    # ---- rear: wraparound LED tail lights, plain badge, black diffuser, a tailpipe each side
    RB = ['body', 'cabin']
    # tail lights sit on the shoulder just under the rear screen, reach in onto the tailgate and wrap round the corners
    tl = [(0.30, 0.895), (0.33, 0.955), (0.58, 0.978), (0.84, 0.978), (0.905, 0.955), (0.92, 0.89), (0.84, 0.862), (0.40, 0.868)]
    both('r_tail', tl, 'rear', RB, M['tail'], 0.008)
    both('r_tail_led', [(0.38, 0.93), (0.60, 0.952), (0.875, 0.952), (0.875, 0.94), (0.60, 0.94), (0.39, 0.918)], 'rear', RB, led, 0.013, cuts=1)
    both('r_tail_led_v', [(0.875, 0.878), (0.888, 0.878), (0.888, 0.952), (0.875, 0.952)], 'rear', RB, led, 0.013, cuts=1)
    both('r_reverse', [(0.37, 0.884), (0.50, 0.886), (0.50, 0.906), (0.38, 0.906)], 'rear', RB, rev, 0.013, cuts=1)
    for view in ('right', 'left'):
        decal(f'r_tail_side_{view}', [(-2.14, 0.868), (-1.96, 0.895), (-1.96, 0.955), (-2.14, 0.975)], view, B, M['tail'], 0.008)
        decal(f'r_tail_side_led_{view}', [(-2.14, 0.94), (-1.99, 0.942), (-1.99, 0.952), (-2.14, 0.952)], view, B, led, 0.012, cuts=1)
    ring_decal('badge_r_ring', (0, 0.885), 0.044, 0.055, 'rear', RB, M['chrome'], 0.02, 28)
    ring_decal('badge_r', (0, 0.885), 0, 0.045, 'rear', RB, gb, 0.018, 28)
    decal('badge_r_bar', [(-0.028, 0.881), (0.028, 0.881), (0.028, 0.889), (-0.028, 0.889)], 'rear', RB, M['chrome'], 0.023, cuts=1)
    strip('diffuser', [-0.87 + 1.74 * i / 14 for i in range(15)], lambda x: 0.24, lambda x: 0.40, 'rear', B, M['trim'], 0.008, rows=3)
    for k, x in enumerate((-0.3, -0.15, 0.0, 0.15, 0.3)):
        decal(f'diffuser_fin_{k}', [(x - 0.012, 0.235), (x + 0.012, 0.235), (x + 0.012, 0.35), (x - 0.012, 0.35)], 'rear', B, gb, 0.013, cuts=1)
    both('r_reflector', [(0.66, 0.43), (0.845, 0.43), (0.845, 0.447), (0.66, 0.447)], 'rear', B, refl, 0.01, cuts=1)
    for s in (-1, 1):
        ring_decal(f'exhaust_surround_{s}', (s * 0.64, 0.30), 0.05, 0.062, 'rear', B, gb, 0.014, 20)
        cylinder(f'exhaust_{s}', 0.05, 0.12, (s * 0.64, -2.07, 0.30), M['chrome'], 24, axis='Y')
        cylinder(f'exhaust_in_{s}', 0.04, 0.12, (s * 0.64, -2.073, 0.30), void, 20, axis='Y')
    # roof spoiler in body colour over the tailgate, with the high-level brake light under its lip
    spoiler = [(-1.50, 1.424), (-1.72, 1.426), (-1.90, 1.414), (-1.985, 1.395), (-1.98, 1.384), (-1.90, 1.378), (-1.76, 1.392), (-1.52, 1.414)]
    extrude_profile('spoiler', spoiler, 0.53, 0.02, paint)
    box('hmsl', (0.36, 0.02, 0.014), (0, -1.94, 1.368), M['tail'])


def offset_line(pts, d):
    """Move an open (y, z) polyline d to its right (inside, for an outline drawn rear -> over the top -> front):
    the extrusion bevel grows it back out by d, so the visible surface lands on the drawn line."""
    out = []
    for i, (y, z) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        dy, dz = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dy, dz) or 1.0
        out.append((y + dz / n * d, z - dy / n * d))
    return out


# Visible side profile (metres; y forward from the middle of the car, z up), traced from the side reference with
# the wheel centres aligned (2.63 m wheelbase) and the ends corrected for perspective, checked against the
# published size: 4.27 m long, 1.45 m tall, 0.88 m front / 0.76 m rear overhang, 225/40 R18 tyres.
GT_BODY = [(-1.96, 0.25), (-2.05, 0.31), (-2.105, 0.42), (-2.125, 0.56), (-2.12, 0.68), (-2.10, 0.80), (-2.075, 0.90),
           (-2.045, 0.962), (-2.0, 0.995), (-1.9, gt_belt(-1.9)), (-1.37, gt_belt(-1.37)), (-0.6, gt_belt(-0.6)), (0.0, gt_belt(0.0)),
           (0.75, gt_belt(0.75)), (1.0, 0.912), (1.35, 0.885), (1.65, 0.85), (1.85, 0.812), (1.97, 0.775), (2.05, 0.725),
           (2.1, 0.66), (2.125, 0.58), (2.135, 0.47), (2.125, 0.36), (2.1, 0.27), (2.06, 0.205), (2.0, 0.185)]
# the glasshouse: a gently falling roof, the rear screen leaning into a near-vertical tailgate, then the windscreen
GT_CABIN = [(-2.045, 0.90), (-2.035, 1.0), (-1.98, 1.11), (-1.92, 1.22), (-1.865, 1.31), (-1.815, 1.36), (-1.75, 1.39),
            (-1.6, 1.418), (-1.3, 1.432), (-0.9, 1.446), (-0.4, 1.452), (-0.1, 1.447), (0.1, 1.43), (0.22, 1.40), (0.6, 1.185),
            (0.98, 0.965), (1.06, 0.92)]

GT = dict(
    name='gt', L=GT_L, W=1.82, sill=0.26, r=0.324, tyre_w=0.235, wheels=(-1.375, 1.255), belt=GT_BELT, pinch=0.12, flare=0.035,
    arch_gap=0.1, wheel_inset=-0.03, roll_from=0.1, bow=(0.2, 0.12), cab_bow=0.1, cab_bow_from=0.0, cab_follow=True, cab_bow_r=(0.16, -1.6, 1.0),
    crown=(0.9, 2.08, 0.06), mirror_y=0.68,
    draco=True, bevel_res=3, glass_cuts=0, screen_offset=0.009, screen_cuts=5,
    xcuts=((-0.72, -0.5, -0.25, 0.0, 0.25, 0.5, 0.72), (-1.6, 0.85)), cab_xcuts=((-0.5, -0.25, 0.0, 0.25, 0.5), (-1.55, -0.3)),
    paint=lambda: mat('paint_red', '#c3141d', metal=0.0, rough=0.25, coat=1.0),
    rim=lambda: mat('rim_dark', '#4d5157', metal=1.0, rough=0.3),
    lower=offset_line(chaikin(GT_BODY, 2), 0.075),
    cabin=offset_line(chaikin(GT_CABIN, 2), 0.09),
    cabin_w=0.975, tumble=0.36, dlo_inset=-0.02, dlo_drop=((-0.4, 1.385), (-1.22, 1.30)),
    pillars=[(-0.36, 0.075), (-1.06, 0.025)],
    c_pillar=((-1.33, 1.0), (-1.13, 1.30)),
    dlo_trim='gloss_black',
    handles=[-0.235, -1.15], handle_drop=0.04,
    windscreen_top=1.37, rear_screen_top=1.33, rear_screen_bottom=1.02,
    wheel_fn=lambda name, x, y, r, w, M, rim_mat, side, front: wheel_gt(name, x, y, r, w, M, rim_mat, side, front),
    front=dict(plate=(0.515, '241-D-1976')),
    rear=dict(plate=(0.68, '241-D-1976')),
    extras=gt_extras,
)

bpy.ops.wm.read_factory_settings(use_empty=True)
# the Garda i40 is built by tools/blender/build_garda.py (one model, livery painted at runtime)
for spec in (HATCH, COUPE, GT):
    if ONLY and spec['name'] not in ONLY:
        continue
    build(spec)
print('DONE')

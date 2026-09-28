"""Build the game's hero cars in Blender and export them as GLB.

Run headless:  blender -b --factory-startup -P tools/blender/build_cars.py -- public/models [names...]

Modelled after real cars from reference photos (all procedural, no downloaded assets):
  garda     - Hyundai i40 Tourer, An Garda Siochana standard patrol livery
  garda_rp  - Hyundai i40 Tourer, Roads Policing Battenburg livery
  hatch     - Hyundai i30 N style hot hatch in Performance Blue
  coupe     - fastback coupe (the pursuit suspect)

Technique:
  - lower body: a filled 2D side profile with wheel arches, extruded with a rounded bevel, pinched in plan view
    at the nose and tail and flared over the wheels; the belt line can rise toward the rear;
  - cabin: a narrower rounded extrusion of the glasshouse profile with tumblehome;
  - details are projected decals: 2D outlines (front / rear / side / top view) triangulated, subdivided and
    raycast onto the bodywork, so lights, grilles, glazing, livery and lettering wrap the real curvature
    (the same projection works on any imported mesh);
  - wheels: tyre, spoked alloy, barrel and brake disc joined into wheel_* objects (the game spins and steers them).
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


def extrude_profile(name, pts, half_width, bevel, material, deform=None):
    """pts: closed (y, z) outline -> mesh extruded symmetrically along X with rounded edges."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = max(0.001, half_width - bevel)
    cu.bevel_depth = bevel
    cu.bevel_resolution = 5
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
    )


# ------------------------------------------------------------------ car builder
def build(spec):
    clear_scene()
    M = common()
    paint = spec['paint']()
    L, W, r = spec['L'], spec['W'], spec['r']
    hw = W / 2
    yr, yf = spec['wheels']
    ar = r + 0.07
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

    def body_deform(v):
        end = min(v.y + L / 2, L / 2 - v.y)
        pinch = 1 - spec.get('pinch', 0.1) * (1 - min(1, end / 0.75)) ** 2
        near = max(math.exp(-((v.y - yf) / 0.55) ** 2), math.exp(-((v.y - yr) / 0.55) ** 2))
        flare = 1 + spec.get('flare', 0.03) * near * max(0, 1 - abs(v.z - r - 0.1) / 0.6)
        roll = 1 - 0.06 * min(1, max(0, (v.z - (belt(v.y) - 0.2)) / 0.2))
        v.x *= pinch * flare * roll
        return v

    extrude_profile('body', top + bottom, hw, 0.075, paint, body_deform)

    cab = spec['cabin']
    roof = max(p[1] for p in cab)
    chw = hw * spec.get('cabin_w', 0.84)
    tumble = spec.get('tumble', 0.16)
    blo = min(b_r, b_f)

    def cab_x(z):
        return chw * (1 - tumble * max(0, min(1, (z - blo) / (roof - blo))))

    def cabin_deform(v):
        v.x *= cab_x(v.z) / chw
        return v

    extrude_profile('cabin', cab, chw, 0.09, paint, cabin_deform)

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
    dlo = [(y, edge_z(y) - inset) for y in ys if edge_z(y) - inset > belt(y) + 0.1]
    glass_poly = dlo + [(y, belt(y) + 0.045) for y, _ in reversed(dlo)]
    for view, s in (('right', 1), ('left', -1)):
        decal(f'side_glass_{s}', glass_poly, view, ['cabin'], M['glass'], 0.004, cuts=2)
        dys = [y for y, _ in dlo]
        dtop = dict(dlo)
        strip(f'dlo_chrome_bot_{s}', dys, lambda y: belt(y) + 0.02, lambda y: belt(y) + 0.045, view, ['cabin', 'body'], M['chrome'], 0.006, rows=1)
        strip(f'dlo_chrome_top_{s}', dys, lambda y: dtop[y], lambda y: dtop[y] + 0.025, view, ['cabin'], M['chrome'], 0.006, rows=1)
        for yp, wp in spec['pillars']:
            decal(f'pillar_{yp}_{s}', [(yp - wp / 2, belt(yp) + 0.04), (yp + wp / 2, belt(yp) + 0.04), (yp + wp / 2, edge_z(yp) - inset + 0.01), (yp - wp / 2, edge_z(yp) - inset + 0.01)],
                  view, ['cabin'], M['gloss_black'], 0.008, cuts=2)
        for yh in spec.get('handles', []):
            decal(f'handle_{yh}_{s}', [(yh - 0.1, belt(yh) - 0.1), (yh + 0.1, belt(yh) - 0.1), (yh + 0.1, belt(yh) - 0.065), (yh - 0.1, belt(yh) - 0.065)], view, ['body'], M['trim'], 0.012, cuts=1)
        decal(f'skirt_{s}', [(yr + ar + 0.02, spec['sill'] + 0.01), (yf - ar - 0.02, spec['sill'] + 0.01), (yf - ar - 0.02, spec['sill'] + 0.1), (yr + ar + 0.02, spec['sill'] + 0.1)],
              view, ['body'], M['trim'], 0.005, cuts=2)

    # ---- windscreen and rear screen (projected from the front / rear onto the cabin)
    fb, rb = cab[-1], cab[0]
    zt_f = spec.get('windscreen_top', roof - 0.1)
    zb_f = fb[1] + 0.06
    ws = [(-cab_x(zb_f) + 0.07, zb_f), (cab_x(zb_f) - 0.07, zb_f), (cab_x(zt_f) - 0.08, zt_f), (-cab_x(zt_f) + 0.08, zt_f)]
    decal('windscreen', ws, 'front', ['cabin'], M['glass'], 0.004, cuts=3)
    zt_r = spec.get('rear_screen_top', roof - 0.1)
    zb_r = spec.get('rear_screen_bottom', rb[1] + 0.08)
    rs = [(-cab_x(zb_r) + 0.1, zb_r), (cab_x(zb_r) - 0.1, zb_r), (cab_x(zt_r) - 0.12, zt_r), (-cab_x(zt_r) + 0.12, zt_r)]
    decal('rear_screen', rs, 'rear', ['cabin'], M['glass'], 0.004, cuts=3)

    for s in (-1, 1):
        box(f'mirror_{s}', (0.22, 0.13, 0.12), (s * (hw + 0.06), fb[0] - 0.1, belt(fb[0]) + 0.11), paint, 0.04)
        box(f'mirror_arm_{s}', (0.12, 0.07, 0.035), (s * (hw - 0.01), fb[0] - 0.08, belt(fb[0]) + 0.07), M['trim'])
        box(f'mirror_ind_{s}', (0.12, 0.02, 0.02), (s * (hw + 0.1), fb[0] - 0.03, belt(fb[0]) + 0.09), M['ind'])

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
            wheel(f'wheel_{tag}_{"l" if s < 0 else "r"}', s * (hw - spec['tyre_w'] / 2 - 0.03), yc, r, spec['tyre_w'], M, rim_mat, spec.get('spokes', 5), s, spec.get('paired', False))
    if 'extras' in spec:
        spec['extras'](M, paint, dict(belt=belt, edge_z=edge_z, cab_x=cab_x, roof=roof, hw=hw, L=L))

    path = os.path.join(OUT, f"{spec['name']}.glb")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
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

bpy.ops.wm.read_factory_settings(use_empty=True)
# the Garda i40 is built by tools/blender/build_garda.py (one model, livery painted at runtime)
for spec in (HATCH, COUPE):
    if ONLY and spec['name'] not in ONLY:
        continue
    build(spec)
print('DONE')

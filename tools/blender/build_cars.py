"""Build the game's hero cars in Blender and export them as GLB.

Run headless:  blender -b --factory-startup -P tools/blender/build_cars.py -- public/models

Technique (all procedural, no downloaded assets):
  - lower body: a filled 2D side profile with wheel-arch cut-outs, extruded to the car's width with a rounded
    bevel, then pinched in plan view at the nose and tail and flared over the wheels;
  - cabin: a narrower rounded extrusion of the glasshouse profile with tumblehome (sides lean in toward the roof);
  - glazing: windscreen, rear screen and side windows (split by the B-pillar) laid just proud of the cabin;
  - wheels: tyre, dark barrel, spoked rim, hub and brake disc joined into objects named wheel_* so the game can
    spin and steer them; lights, grille, plates and per-car extras (Garda Battenburg livery and lightbar).
Axes: Blender X = width, +Y = forward, +Z = up.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'public/models')
os.makedirs(OUT, exist_ok=True)


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
    """pts: closed (y, z) outline. Returns a mesh object extruded symmetrically along X with rounded edges."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = max(0.001, half_width - bevel)
    cu.bevel_depth = bevel
    cu.bevel_resolution = 4
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
    # curve space (a, b, c) = (forward, up, across) -> Blender (X, Y, Z) = (across, forward, up)
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


def wheel(name, x, y, r, width, M, rim_mat, spokes, side):
    """A wheel centred at (x, y, r) with its outer face toward `side` (+1 right / -1 left)."""
    face = x + side * width / 2
    parts = [
        cylinder(f'{name}_tyre', r, width, (x, y, r), M['tyre'], 36, bevel=r * 0.2),
        cylinder(f'{name}_barrel', r * 0.68, 0.01, (face + side * 0.002, y, r), M['barrel'], 32),
        cylinder(f'{name}_disc', r * 0.5, 0.02, (face - side * 0.04, y, r), M['disc'], 28),
    ]
    thick = 0.07 if spokes <= 6 else 0.042
    for k in range(spokes):
        a = k / spokes * math.tau
        rr = r * 0.36
        parts.append(box(f'{name}_spoke{k}', (0.03, r * 0.62, r * thick * 3.2),
                         (face + side * 0.012, y + math.cos(a) * rr, r + math.sin(a) * rr), rim_mat, rot=(a, 0, 0)))
    # rim lip: a thin ring of short boxes around the edge
    for k in range(24):
        a = k / 24 * math.tau
        parts.append(box(f'{name}_lip{k}', (0.03, r * 0.19, 0.035), (face + side * 0.01, y + math.cos(a) * r * 0.69, r + math.sin(a) * r * 0.69), rim_mat, rot=(a + math.pi / 2, 0, 0)))
    parts.append(cylinder(f'{name}_hub', r * 0.16, 0.05, (face + side * 0.015, y, r), rim_mat, 16))
    w = join(parts, name)
    bpy.context.scene.cursor.location = (x, y, r)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return w


def text(name, s, size, loc, rot, material, extrude=0.003):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = s
    cu.size = size
    cu.extrude = extrude
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    ob = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.clear()
    ob.data.materials.append(material)
    ob.select_set(False)
    return ob


def surface_x(obj_name, y, z, side):
    """Where the car's side surface is at (y, z): raycast inward from outside the car."""
    ob = bpy.data.objects[obj_name]
    hit, loc, nrm, _ = ob.ray_cast(Vector((side * 5.0, y, z)), Vector((-side, 0, 0)))
    return loc.x if hit else None


def surface_y(obj_name, x, z, end):
    """Front (end=+1) or rear (end=-1) surface of the body at (x, z)."""
    ob = bpy.data.objects[obj_name]
    hit, loc, nrm, _ = ob.ray_cast(Vector((x, end * 8.0, z)), Vector((0, -end, 0)))
    return loc.y if hit else None


def surface_z(obj_name, x, y):
    ob = bpy.data.objects[obj_name]
    hit, loc, nrm, _ = ob.ray_cast(Vector((x, y, 5.0)), Vector((0, 0, -1)))
    return loc.z if hit else None


def common():
    return dict(
        glass=mat('glass', '#141a20', metal=0.3, rough=0.03),
        trim=mat('trim', '#131416', rough=0.5),
        chrome=mat('chrome', '#dfe3e7', metal=1.0, rough=0.1),
        tyre=mat('tyre', '#171717', rough=0.9),
        barrel=mat('rim_barrel', '#18191b', metal=0.5, rough=0.5),
        disc=mat('brake_disc', '#6b6e72', metal=0.9, rough=0.35),
        rim=mat('rim', '#c3c8cd', metal=1.0, rough=0.22),
        head=mat('headlight', '#eef3f6', rough=0.04, emit='#fff4dc', strength=0.6),
        drl=mat('drl', '#ffffff', emit='#ffffff', strength=3.0),
        tail=mat('taillight', '#6e0a0a', rough=0.15, emit='#ff1e12', strength=0.8),
        ind=mat('indicator', '#c96a12', rough=0.2, emit='#ff8a1c', strength=0.3),
        plate=mat('plate', '#f1f1ec', rough=0.4),
        plate_band=mat('plate_band', '#2a4aa8', rough=0.4),
    )


def build(spec):
    clear_scene()
    M = common()
    paint = spec['paint']()
    L, W, r = spec['L'], spec['W'], spec['r']
    hw = W / 2
    yr, yf = spec['wheels']
    ar = r + 0.07
    belt = spec['belt']

    # ---- lower body: the top outline (rear -> front) then the underside with wheel arches (front -> rear)
    top = spec['lower']
    bottom = [(top[-1][0], spec['sill'])]
    for yc in (yf, yr):
        bottom.append((yc + ar, spec['sill']))
        for k in range(1, 12):
            a = k / 12 * math.pi
            bottom.append((yc + math.cos(a) * ar, max(spec['sill'], r + math.sin(a) * ar)))
        bottom.append((yc - ar, spec['sill']))
    bottom.append((top[0][0], spec['sill']))

    def body_deform(v):
        end = min(v.y + L / 2, L / 2 - v.y)
        pinch = 1 - spec.get('pinch', 0.1) * (1 - min(1, end / 0.7)) ** 2
        near = max(math.exp(-((v.y - yf) / 0.55) ** 2), math.exp(-((v.y - yr) / 0.55) ** 2))
        flare = 1 + spec.get('flare', 0.03) * near * max(0, 1 - abs(v.z - r - 0.1) / 0.6)
        roll = 1 - 0.06 * min(1, max(0, (v.z - (belt - 0.2)) / 0.2))
        v.x *= pinch * flare * roll
        return v

    extrude_profile('body', top + bottom, hw, 0.07, paint, body_deform)

    # ---- cabin with tumblehome
    cab = spec['cabin']
    roof = max(p[1] for p in cab)
    chw = hw * spec.get('cabin_w', 0.84)
    tumble = spec.get('tumble', 0.16)

    def cab_x(z):
        return chw * (1 - tumble * max(0, min(1, (z - belt) / (roof - belt))))

    def cabin_deform(v):
        v.x *= cab_x(v.z) / chw
        return v

    extrude_profile('cabin', cab, chw, 0.08, paint, cabin_deform)

    def edge_z(y):
        best = belt
        for a, b in zip(cab, cab[1:]):
            if min(a[0], b[0]) <= y <= max(a[0], b[0]) and abs(b[0] - a[0]) > 1e-6:
                t = (y - a[0]) / (b[0] - a[0])
                best = max(best, a[1] + (b[1] - a[1]) * t)
        return best

    def side_window(y0, y1, s, name, inset=0.075):
        pts = []
        n = 16
        for i in range(n + 1):
            y = y0 + (y1 - y0) * i / n
            pts.append((y, max(belt + 0.07, edge_z(y) - inset)))
        pts += [(y1, belt + 0.07), (y0, belt + 0.07)]
        verts = [(s * (cab_x(z) + 0.006), y, z) for y, z in pts]
        me = bpy.data.meshes.new(name)
        idx = list(range(len(verts)))
        me.from_pydata(verts, [], [idx if s > 0 else idx[::-1]])
        me.update()
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
        return add_obj(name, me, M['glass'])

    rear_bottom, front_bottom = cab[0], cab[-1]
    roofline = [p for p in cab if p[1] > roof - 0.07]
    bp = spec['b_pillar']
    for s in (-1, 1):
        side_window(rear_bottom[0] + 0.12, bp - 0.07, s, f'win_rear_{s}')
        side_window(bp + 0.07, front_bottom[0] - 0.14, s, f'win_front_{s}')

    def screen(p_bot, p_top, name, front):
        a, b = Vector((0, *p_bot)), Vector((0, *p_top))
        d = (b - a).normalized()
        n = Vector((0, d.z, -d.y)) if front else Vector((0, -d.z, d.y))  # outward in the YZ plane
        a0, a1 = a + d * 0.06 + n * 0.012, b - d * 0.06 + n * 0.012
        verts = [(-cab_x(a0.z) + 0.06, a0.y, a0.z), (cab_x(a0.z) - 0.06, a0.y, a0.z), (cab_x(a1.z) - 0.07, a1.y, a1.z), (-cab_x(a1.z) + 0.07, a1.y, a1.z)]
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], [[0, 1, 2, 3] if front else [3, 2, 1, 0]]); me.update()
        return add_obj(name, me, M['glass'])

    screen(front_bottom, roofline[-1], 'windscreen', True)
    screen(rear_bottom, roofline[0], 'rear_screen', False)

    # ---- details
    h, t = spec['lights']['head'], spec['lights']['tail']
    # front and rear fittings sit on the actual nose / tail surface
    fy = lambda x, z: (surface_y('body', x, z, 1) or L / 2)
    ry = lambda x, z: (surface_y('body', x, z, -1) or -L / 2)
    for s in (-1, 1):
        box(f'head_{s}', (0.38, 0.1, 0.11), (s * (hw - 0.3), fy(s * (hw - 0.3), h[1]) - 0.03, h[1]), M['head'], 0.03)
        box(f'drl_{s}', (0.34, 0.02, 0.022), (s * (hw - 0.3), fy(s * (hw - 0.3), h[1] - 0.07) + 0.005, h[1] - 0.07), M['drl'])
        box(f'tail_{s}', (0.42, 0.08, 0.1), (s * (hw - 0.27), ry(s * (hw - 0.27), t[1]) + 0.025, t[1]), M['tail'], 0.03)
        box(f'ind_{s}', (0.05, 0.12, 0.04), (s * (hw - 0.02), h[0] - 0.55, h[1] - 0.02), M['ind'], 0.01)
        box(f'mirror_{s}', (0.2, 0.12, 0.1), (s * (hw + 0.05), front_bottom[0] - 0.12, belt + 0.1), paint, 0.03)
        box(f'mirror_arm_{s}', (0.12, 0.06, 0.03), (s * (hw - 0.02), front_bottom[0] - 0.1, belt + 0.06), M['trim'])
    gz = (h[1] + spec['plate_z']) / 2 + 0.02
    box('grille', (W * 0.46, 0.06, 0.15), (0, fy(0, gz) - 0.015, gz), M['trim'], 0.03)
    box('splitter', (W * 0.86, 0.14, 0.05), (0, fy(0, spec['sill'] + 0.1) - 0.05, spec['sill'] + 0.02), M['trim'], 0.02)
    box('diffuser', (W * 0.8, 0.14, 0.08), (0, ry(0, spec['sill'] + 0.1) + 0.05, spec['sill'] + 0.04), M['trim'], 0.02)
    pz = spec['plate_z']
    for s, y in ((1, fy(0, pz)), (-1, ry(0, pz))):
        box(f'plate_{s}', (0.52, 0.02, 0.11), (0, y + s * 0.006, pz), M['plate'], 0.004)
        box(f'plate_band_{s}', (0.06, 0.024, 0.11), (-0.23 * s, y + s * 0.009, pz), M['plate_band'])
    rim_mat = spec['rim']() if 'rim' in spec else M['rim']
    for yc, tag in ((yr, 'rear'), (yf, 'front')):
        for s in (-1, 1):
            wheel(f'wheel_{tag}_{"l" if s < 0 else "r"}', s * (hw - spec['tyre_w'] / 2 - 0.03), yc, r, spec['tyre_w'], M, rim_mat, spec.get('spokes', 5), s)
    if 'extras' in spec:
        spec['extras'](M, paint)

    path = os.path.join(OUT, f"{spec['name']}.glb")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    print('EXPORTED', path, os.path.getsize(path))


# ---------------------------------------------------------------- the cars

def garda_extras(M, paint):
    L, W = GARDA['L'], GARDA['W']
    hw = W / 2
    yellow = mat('battenburg_yellow', '#f6d400', rough=0.35, emit='#f6d400', strength=0.12)
    blue = mat('battenburg_blue', '#16338f', rough=0.35)
    # Battenburg checks along both flanks: two rows below the belt
    n, y0, y1 = 12, -L / 2 + 0.5, L / 2 - 0.6
    cw = (y1 - y0) / n
    for s in (-1, 1):
        for i in range(n):
            for row in (0, 1):
                m = yellow if (i + row) % 2 == 0 else blue
                y, z = y0 + cw * (i + 0.5), 0.5 + row * 0.172
                x = surface_x('body', y, z, s)
                if x is None:
                    continue  # over a wheel arch
                box(f'check_{s}_{i}_{row}', (0.012, cw - 0.004, 0.17), (x + s * 0.004, y, z), m)
        x = surface_x('body', 0.3, 0.84, s)
        text(f'garda_side_{s}', 'GARDA', 0.13, (x + s * 0.004, 0.3, 0.84), (math.pi / 2, 0, s * math.pi / 2), blue)
    zb = surface_z('body', 0, L / 2 - 0.35)
    text('garda_bonnet', 'GARDA', 0.16, (0, L / 2 - 0.35, zb + 0.004), (0, 0, 0), blue)
    # roof lightbar: black base and two blue lenses (materials named lightbar_* so the game can flash them)
    box('lightbar_base', (1.18, 0.3, 0.06), (0, -0.35, 1.53), M['trim'], 0.02)
    for i, s in enumerate((-1, 1)):
        lb = mat(f'lightbar_{i}', '#0b2a8c', rough=0.1, emit='#2f6bff', strength=0.2)
        box(f'lightbar_lens_{i}', (0.54, 0.26, 0.1), (s * 0.29, -0.35, 1.6), lb, 0.035)


GARDA = dict(
    name='garda', L=4.72, W=1.84, sill=0.28, belt=0.95, r=0.33, tyre_w=0.23, wheels=(-1.38, 1.45), plate_z=0.44,
    paint=lambda: mat('paint_white', '#f3f3f0', metal=0.15, rough=0.28, coat=0.8),
    lower=[(-2.36, 0.4), (-2.36, 0.95), (-2.3, 0.99), (1.02, 1.0), (1.95, 0.86), (2.3, 0.78), (2.36, 0.62), (2.34, 0.42)],
    cabin=[(-2.28, 0.97), (-2.24, 1.43), (-2.05, 1.5), (0.2, 1.51), (0.55, 1.45), (1.12, 0.98)],
    b_pillar=-0.3, cabin_w=0.86, tumble=0.14, spokes=6,
    lights=dict(head=(2.25, 0.8), tail=(-2.34, 0.95)),
    extras=garda_extras,
)


def hatch_extras(M, paint):
    white = mat('stripe_white', '#f2f2ee', rough=0.3)
    # racing stripes laid onto the bonnet and roof, following their height
    for s in (-1, 1):
        for obj, y0, y1 in (('body', 0.95, 2.0), ('cabin', -1.4, 0.15)):
            n = 24
            for i in range(n):
                ya, yb = y0 + (y1 - y0) * i / n, y0 + (y1 - y0) * (i + 1) / n
                za, zb = surface_z(obj, s * 0.16, ya), surface_z(obj, s * 0.16, yb)
                if za is None or zb is None:
                    continue
                seg = math.hypot(yb - ya, zb - za)
                # each piece is tilted to lie flat on the panel beneath it
                box(f'stripe_{obj}_{s}_{i}', (0.11, seg + 0.004, 0.008), (s * 0.16, (ya + yb) / 2, (za + zb) / 2 + 0.004), white,
                    rot=(math.atan2(zb - za, yb - ya), 0, 0))
    box('roof_spoiler', (1.3, 0.3, 0.05), (0, -1.86, 1.44), paint, 0.02)
    for s in (-1, 1):
        cylinder(f'exhaust_{s}', 0.05, 0.14, (s * 0.35, -2.1, 0.34), M['chrome'], 16, axis='Y')


HATCH = dict(
    name='hatch', L=4.2, W=1.82, sill=0.3, belt=0.94, r=0.33, tyre_w=0.23, wheels=(-1.3, 1.32), plate_z=0.46,
    paint=lambda: mat('paint_green', '#0e5a36', metal=0.55, rough=0.24, coat=1.0),
    lower=[(-2.08, 0.4), (-2.1, 0.92), (-2.0, 0.96), (0.9, 0.96), (1.55, 0.84), (2.0, 0.68), (2.1, 0.5), (2.06, 0.38)],
    cabin=[(-2.0, 0.95), (-1.72, 1.33), (-1.42, 1.41), (-0.15, 1.42), (0.25, 1.35), (0.98, 0.96)],
    b_pillar=-0.55, cabin_w=0.85, tumble=0.18, spokes=5, flare=0.06, pinch=0.17,
    lights=dict(head=(1.97, 0.74), tail=(-2.07, 0.98)),
    extras=hatch_extras,
)


def coupe_extras(M, paint):
    box('ducktail', (1.7, 0.26, 0.05), (0, -2.14, 0.9), paint, 0.025)
    for s in (-1, 1):
        cylinder(f'exhaust_{s}', 0.055, 0.14, (s * 0.52, -2.3, 0.32), M['chrome'], 16, axis='Y')
        box(f'intake_{s}', (0.02, 0.4, 0.14), (s * 0.97, -0.75, 0.6), M['trim'], 0.01)
    box('bonnet_vent', (0.5, 0.35, 0.012), (0, 1.3, 0.8), M['trim'], 0.005)


COUPE = dict(
    name='coupe', L=4.55, W=1.94, sill=0.24, belt=0.8, r=0.35, tyre_w=0.28, wheels=(-1.36, 1.4), plate_z=0.4, pinch=0.14, flare=0.07,
    paint=lambda: mat('paint_red', '#8c0e1b', metal=0.55, rough=0.2, coat=1.0),
    rim=lambda: mat('rim_dark', '#26282c', metal=1.0, rough=0.28),
    lower=[(-2.27, 0.34), (-2.3, 0.78), (-2.22, 0.86), (0.5, 0.8), (1.7, 0.7), (2.2, 0.58), (2.28, 0.45), (2.25, 0.32)],
    cabin=[(-2.08, 0.82), (-1.3, 1.08), (-0.6, 1.22), (0.1, 1.23), (0.5, 1.15), (1.15, 0.8)],
    b_pillar=-0.45, cabin_w=0.8, tumble=0.2, spokes=10,
    lights=dict(head=(2.16, 0.64), tail=(-2.26, 0.8)),
    extras=coupe_extras,
)

bpy.ops.wm.read_factory_settings(use_empty=True)
for spec in (GARDA, HATCH, COUPE):
    build(spec)
print('DONE')

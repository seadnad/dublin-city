"""The O'Connell Monument (J. H. Foley, finished by Thomas Brock, 1882-83), O'Connell Street Lower.

Run headless:  blender -b --factory-startup -P tools/blender/build_oconnell.py -- public/models models [preview.png]

Sources: docs/research/monuments.md section 3.1 (dimensions measured off ref 01, scaled to the verified 40 ft):
three granite steps on a 7.3 m square to 1.2 m, a 6 m square base block with chamfered corners to 2.7 m, four winged
seated Victories on dark blocks at the corners, a 2.7 m granite drum with provincial shields and "O'CONNELL" to 5.3 m,
the bronze frieze of figures (Erin in the middle of the south face, right arm raised) to 7.6 m, a granite cornice and
round pedestal to 9 m, and the cloaked O'Connell (3.2 m) facing south to O'Connell Bridge. 12.2 m overall.
Built at real size (monuments are not compressed). Origin: centre of the base at ground; the front faces Blender -Y.
Victories: Fidelity (wolfhound) SE is confirmed by ref 01; Patriotism SW, Courage NE and Eloquence NW are a guess.
Materials: oc_granite (pale Dalkey granite), oc_bronze (the game paints patina), oc_decal (inscription).
"""
import bpy, bmesh, math, os, sys
from mathutils import Matrix, Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part
import statue_bodies as B

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
PREVIEW = ARGS[2] if len(ARGS) > 2 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
M = dict(granite=kit.material('oc_granite', (0.55, 0.54, 0.51)), bronze=kit.material('oc_bronze', (0.03, 0.035, 0.03), 0.6),
         decal=kit.material('oc_decal', (1, 1, 1)))
gra, brz, dec = Part('oc_granite', tile=2.0), Part('oc_bronze', tile=2.0), Part('oc_decal')
SIDES = 24


def lathe(part, prof, sides=SIDES, cap=True):
    """Solid of revolution from a (r, z) profile, bottom to top."""
    ring = lambda r, z: [(math.cos(k / sides * math.tau) * r, math.sin(k / sides * math.tau) * r, z) for k in range(sides)]
    rings = [ring(r, z) for r, z in prof]
    for a, b in zip(rings, rings[1:]):
        for k in range(sides):
            part.quad(a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k])
    if cap:
        part.face(rings[-1])


def octagon_block(part, half, cham, z0, z1):
    """A square block with chamfered corners."""
    h, c = half, cham
    pts = [(h - c, -h), (h, -h + c), (h, h - c), (h - c, h), (-h + c, h), (-h, h - c), (-h, -h + c), (-h + c, -h)]
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        part.quad((ax, ay, z0), (bx, by, z0), (bx, by, z1), (ax, ay, z1))
    part.face([(x, y, z1) for x, y in pts])


# ---- granite: steps, base block, lower drum, cornice and upper pedestal
for k, (half, z0, z1) in enumerate([(3.65, 0.0, 0.42), (3.4, 0.42, 0.82), (3.15, 0.82, 1.2)]):
    gra.box(-half, half, -half, half, z0, z1)
octagon_block(gra, 3.05, 0.75, 1.2, 1.38)          # plinth course
octagon_block(gra, 2.95, 0.7, 1.38, 2.52)          # the base block (wreaths on its faces)
octagon_block(gra, 3.08, 0.76, 2.52, 2.7)          # capping course
lathe(gra, [(1.52, 2.7), (1.52, 2.82), (1.4, 2.9), (1.36, 2.95), (1.36, 4.9), (1.46, 4.95), (1.46, 5.1), (1.52, 5.14), (1.52, 5.3)])
lathe(gra, [(1.2, 7.58), (1.26, 7.62), (1.5, 7.78), (1.53, 7.8), (1.53, 7.95), (1.34, 8.0), (1.12, 8.0), (1.12, 8.55), (1.22, 8.58),
            (1.22, 8.72), (1.06, 8.75), (1.06, 8.88)], cap=True)
# dentil course under the cornice
for k in range(36):
    a = k / 36 * math.tau
    c, s = math.cos(a), math.sin(a)
    t = (-s, c)
    p0 = (c * 1.21, s * 1.21); p1 = (c * 1.33, s * 1.33)
    w = 0.07
    q = [(p0[0] - t[0] * w, p0[1] - t[1] * w), (p1[0] - t[0] * w, p1[1] - t[1] * w), (p1[0] + t[0] * w, p1[1] + t[1] * w), (p0[0] + t[0] * w, p0[1] + t[1] * w)]
    gra.quad((*q[1], 7.52), (*q[2], 7.52), (*q[2], 7.64), (*q[1], 7.64))
    gra.quad((*q[0], 7.52), (*q[1], 7.52), (*q[1], 7.64), (*q[0], 7.64))
    gra.quad((*q[2], 7.52), (*q[3], 7.52), (*q[3], 7.64), (*q[2], 7.64))

# ---- bronze: frieze drum core, the base ring the figures stand on, the disc under O'Connell, the Victories' blocks
lathe(brz, [(1.54, 5.3), (1.54, 5.42), (1.16, 5.42), (1.16, 7.58)], cap=False)
lathe(brz, [(1.0, 8.88), (1.0, 9.0)], sides=16)
CORNERS = dict(se=(1, -1, 'fidelity'), sw=(-1, -1, 'patriotism'), ne=(1, 1, 'courage'), nw=(-1, 1, 'eloquence'))
for key, (sx, sy, attr) in CORNERS.items():
    a = math.atan2(sy, sx)
    d, t = Vector((math.cos(a), math.sin(a), 0)), Vector((-math.sin(a), math.cos(a), 0))
    c = d * 2.55
    pts = [c + d * dd + t * tt for dd, tt in ((-0.75, -0.5), (0.75, -0.5), (0.75, 0.5), (-0.75, 0.5))]
    z0, z1 = 2.7, 3.0
    for p, q in zip(pts, pts[1:] + pts[:1]):
        brz.quad((p.x, p.y, z0), (q.x, q.y, z0), (q.x, q.y, z1), (p.x, p.y, z1))
    brz.face([(p.x, p.y, z1) for p in pts])

# provincial shields on the drum between the Victories (S, E, N, W) and laurel wreaths on the base faces
for k in range(4):
    a = -math.pi / 2 + k * math.pi / 2
    d, t = Vector((math.cos(a), math.sin(a), 0)), Vector((-math.sin(a), math.cos(a), 0))
    o = d * 1.39
    outline = [(-0.28, 0.32), (0.28, 0.32), (0.28, -0.05), (0.14, -0.26), (0.0, -0.34), (-0.14, -0.26), (-0.28, -0.05)]
    zc = 4.15
    front = [o + d * 0.06 + t * u + Vector((0, 0, zc + v)) for u, v in outline]
    back = [o + t * u + Vector((0, 0, zc + v)) for u, v in outline]
    brz.face([tuple(p) for p in front][::-1] if k % 2 else [tuple(p) for p in front])
    for i in range(len(outline)):
        p, q = back[i], back[(i + 1) % len(outline)]
        P, Q = front[i], front[(i + 1) % len(outline)]
        brz.quad(tuple(p), tuple(q), tuple(Q), tuple(P))

wreaths = []
for k in range(4):
    a = -math.pi / 2 + k * math.pi / 2
    wreaths.append((math.cos(a) * 2.97, math.sin(a) * 2.97, 1.95, a))

# the inscription: a curved strip on the drum's south face
for i in range(6):
    a0, a1 = -math.pi / 2 - 0.5 + i / 6, -math.pi / 2 - 0.5 + (i + 1) / 6
    r = 1.375
    p0, p1 = (math.cos(a0) * r, math.sin(a0) * r), (math.cos(a1) * r, math.sin(a1) * r)
    u0, u1 = i / 6, (i + 1) / 6
    dec.quad((*p0, 3.05), (*p1, 3.05), (*p1, 3.4), (*p0, 3.4), [(u0, 0), (u1, 0), (u1, 1), (u0, 1)])

objs = [gra.build(M['granite']), brz.build(M['bronze']), dec.build(M['decal'])]


def place(fig, name, target, scale, rot, loc, flat=None):
    if flat:
        fig.flatten(flat)
    ob = fig.to_object(name, M['bronze'], target=target)
    ob.data.transform(Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Scale(scale, 4))
    ob.data.calc_loop_triangles(); print('FIG', name, len(ob.data.loop_triangles))
    return ob


figs = []
# O'Connell: 3.2 m, facing south, books at his feet
oc = B.cloaked()
oc.box((0.28, -0.22, 0.06), (0.26, 0.2, 0.12), rot=(0, 0, 0.3)); oc.box((0.3, -0.2, 0.17), (0.22, 0.17, 0.1), rot=(0, 0, -0.2))
figs.append(place(oc, 'oconnell', 1400, 3.2 / 1.78, 0, (0, 0, 9.0)))
# the Victories: seated on the corner blocks, facing diagonally out
for key, (sx, sy, attr) in CORNERS.items():
    a = math.atan2(sy, sx)
    # the figure faces -Y; turn it to face outwards along the diagonal
    figs.append(place(B.victory(attr), f'victory_{key}', 850, 1.72, a + math.pi / 2, (math.cos(a) * 2.35, math.sin(a) * 2.35, 3.0)))
# the frieze: Erin in the middle of the south face, a crowd of figures in high relief round the drum
KINDS = ['robe', 'gesture', 'bishop', 'child', 'coat', 'robe', 'gesture', 'coat', 'child', 'robe', 'coat', 'bishop', 'gesture', 'coat', 'robe']
N = len(KINDS) + 1
for i in range(N):
    a = -math.pi / 2 + i / N * math.tau
    kind = 'erin' if i == 0 else KINDS[i - 1]
    s = 2.15 / 1.78 * (0.72 if kind == 'child' else 1.0) * (1.05 if kind == 'erin' else 1.0)
    r = 1.36 + (0.1 if kind in ('erin', 'child') else 0.05 * (i % 2))
    f = B.relief('robe' if kind == 'coat' else kind, seed=i)
    figs.append(place(f, f'frieze_{i}', 190, s, a + math.pi / 2, (math.cos(a) * r, math.sin(a) * r, 5.42), flat=0.8))
from figures import Fig
for x, y, z, a in wreaths:
    d = Vector((math.cos(a), math.sin(a), 0))
    # a laurel ring standing on the base face, its axis along the face normal
    ring = Fig(); ring.torus((0, 0, 0), 0.27, 0.045, seg=12, sides=4, axis='y')
    ob = ring.to_object('wreath', M['bronze'])
    ob.data.transform(Matrix.Translation(Vector((x + d.x * 0.04, y + d.y * 0.04, z))) @ Matrix.Rotation(a + math.pi / 2, 4, 'Z'))
    figs.append(ob)

# join the figures into the bronze object
bpy.ops.object.select_all(action='DESELECT')
for o in figs:
    o.select_set(True)
objs[1].select_set(True)
bpy.context.view_layer.objects.active = objs[1]
bpy.ops.object.join()
bronze = objs[1]
for p in bronze.data.polygons:
    p.use_smooth = True
kit.bake_ao_vertex(objs, distance=1.2, samples=24)
root = bpy.data.objects.new('oconnell', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
for o in objs:
    o.data.calc_loop_triangles(); print('PART', o.name, len(o.data.loop_triangles))
print('TRIANGLES', kit.tris(objs))

if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 900, 1300
    w = bpy.data.worlds.get('w') or bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.65, 0.8, 1)
    for m in (M['granite'], M['bronze']):
        nt = m.node_tree; vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'AO'
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
        mx.inputs[7].default_value = nt.nodes['Principled BSDF'].inputs['Base Color'].default_value[:]
        nt.links.new(vc.outputs['Color'], mx.inputs[6]); nt.links.new(mx.outputs[2], nt.nodes['Principled BSDF'].inputs['Base Color'])
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 4
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35)); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.location = (-9, -24, 3.0); cam.data.lens = 50
    cam.rotation_euler = (Vector((0, 0, 6.4)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.filepath = os.path.abspath(PREVIEW)
    bpy.ops.render.render(write_still=True)
    print('PREVIEW', sc.render.filepath)
    raise SystemExit  # preview builds don't export (the preview nodes would leak into the GLB)

kit.export(os.path.join(OUT, 'oconnell.glb'), os.path.join(SRC, 'oconnell.blend'))
print('DONE')

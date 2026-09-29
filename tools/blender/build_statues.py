"""The shared statue kit: one GLB (public/models/statues.glb) with a node per body type, AO baked into vertex colours.

Run headless:  blender -b --factory-startup -P tools/blender/build_statues.py -- public/models models [preview.png]

Bodies (statue_bodies.py): cloaked, frock_chest, folded, orator, orator_out, friar, larkin, reader, allegory, justice,
classical. Each node is named `fig_<body>`, built at a nominal 1.8 m (head top ~1.78 m), feet at the origin, facing
Blender -Y (three.js +Z). One material (`st_figure`); the game assigns bronze or stone per statue and paints patina
into the vertex colours at load (src/world/statues.js). Budget ~1.2k tris per body (one Skin subdivision level).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
import statue_bodies as B

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
PREVIEW = ARGS[2] if len(ARGS) > 2 else None

BODIES = ['cloaked', 'frock_chest', 'folded', 'orator', 'orator_out', 'friar', 'larkin', 'reader', 'allegory', 'justice', 'classical']
TARGET = 1400

bpy.ops.wm.read_factory_settings(use_empty=True)
mat = kit.material('st_figure', (0.5, 0.5, 0.5), 0.6)
objs = []
for i, name in enumerate(BODIES):
    ob = getattr(B, name)().to_object(f'fig_{name}', mat, target=TARGET)
    ob.location.x = i * 2.2
    objs.append(ob)
    ob.data.calc_loop_triangles()
    print('BODY', name, len(ob.data.loop_triangles))

kit.bake_ao_vertex(objs, distance=0.45, samples=24)
print('TRIANGLES', kit.tris(objs))

if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1800, 1100
    for i, ob in enumerate(objs):  # preview grid: two rows, the second lifted
        ob.location = ((i % 6) * 1.5, 0, 0 if i < 6 else 2.4)
        ob.rotation_euler = (0, 0, math.radians(-25))
    w = bpy.data.worlds.get('w') or bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.66, 0.7, 1)
    # show the baked AO: vertex colour into the base colour
    nt = mat.node_tree; vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'AO'
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
    mx.inputs[7].default_value = (0.35, 0.36, 0.34, 1)
    nt.links.new(vc.outputs['Color'], mx.inputs[6]); nt.links.new(mx.outputs[2], nt.nodes['Principled BSDF'].inputs['Base Color'])
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30)); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 8.6
    cam.location = (3.75, -30, 2.2); cam.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = cam
    sc.render.filepath = os.path.abspath(PREVIEW)
    bpy.ops.render.render(write_still=True)
    print('PREVIEW', sc.render.filepath)
    nt.nodes.remove(vc)

for ob in objs:
    ob.location = (0, 0, 0); ob.rotation_euler = (0, 0, 0)
kit.export(os.path.join(OUT, 'statues.glb'), os.path.join(SRC, 'statues.blend'))
print('DONE')

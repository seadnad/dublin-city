"""Rowan Gillespie's "Famine" for the statue kit: public/models/famine.glb, one node per body (fig_famine_*), AO baked
into vertex colours. The game loads it next to statues.glb (src/world/statues.js) and treats the bodies like any other
kit body: addStatue({ body: 'famine_shawl', ... }).

Run headless:  blender -b --factory-startup -P tools/blender/build_famine.py -- public/models models [preview.png]
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
import famine_bodies as B

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
PREVIEW = ARGS[2] if len(ARGS) > 2 else None

BODIES = ['famine_carrier', 'famine_shawl', 'famine_bundle', 'famine_sack', 'famine_dog']
TARGET = 1200

bpy.ops.wm.read_factory_settings(use_empty=True)
mat = kit.material('st_figure', (0.5, 0.5, 0.5), 0.6)
objs = []
for i, name in enumerate(BODIES):
    ob = getattr(B, name)().to_object(f'fig_{name}', mat, target=TARGET)
    objs.append(ob)
    ob.data.calc_loop_triangles()
    print('BODY', name, len(ob.data.loop_triangles))

kit.bake_ao_vertex(objs, distance=0.45, samples=24)
print('TRIANGLES', kit.tris(objs))

if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1800, 1000
    # two rows: front three-quarter view on top, side view (walking direction to the left) below
    for i, ob in enumerate(objs):
        ob.location = (i * 1.2, 0, 0)
        ob.rotation_euler = (0, 0, math.radians(-30))
    dup = []
    for i, ob in enumerate(objs):
        d = ob.copy(); d.data = ob.data; sc.collection.objects.link(d)
        d.location = (i * 1.2, 0, 2.3); d.rotation_euler = (0, 0, math.radians(-90)); dup.append(d)
    w = bpy.data.worlds.get('w') or bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.66, 0.7, 1)
    nt = mat.node_tree; vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'AO'
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
    mx.inputs[7].default_value = (0.42, 0.34, 0.22, 1)
    nt.links.new(vc.outputs['Color'], mx.inputs[6]); nt.links.new(mx.outputs[2], nt.nodes['Principled BSDF'].inputs['Base Color'])
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30)); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 6.4
    cam.location = (2.4, -30, 2.1); cam.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = cam
    sc.render.filepath = os.path.abspath(PREVIEW)
    bpy.ops.render.render(write_still=True)
    print('PREVIEW', sc.render.filepath)
    nt.nodes.remove(vc)
    for d in dup:
        bpy.data.objects.remove(d, do_unlink=True)

for ob in objs:
    ob.location = (0, 0, 0); ob.rotation_euler = (0, 0, 0)
kit.export(os.path.join(OUT, 'famine.glb'), os.path.join(SRC, 'famine.blend'))
print('DONE')

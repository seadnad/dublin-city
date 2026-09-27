"""Render a 3/4 preview of each exported car.  blender -b -P tools/blender/preview.py -- public/models tools/shots"""
import bpy, math, os, sys

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = (os.path.abspath(a) for a in args[:2])
os.makedirs(OUT, exist_ok=True)
for name in (sys.argv[sys.argv.index('--') + 3:] or ['garda', 'garda_rp', 'hatch', 'coupe']):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, f'{name}.glb'))
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 900, 560
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.66, 0.7, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.2
    bpy.ops.mesh.primitive_plane_add(size=40)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3
    sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
    # imported glTF models face Blender -Y here
    for view, (x, y, z) in {'front': (4.4, -5.4, 2.0), 'rear': (-4.6, 5.2, 2.1), 'side': (6.5, 0.0, 1.2)}.items():
        # glTF import turns the model back to Blender axes: the car faces +Y... after import it faces -Y
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
        cam.location = (x, y, z)
        d = cam.location.copy(); d.z -= 0.7
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = 45
        sc.camera = cam
        sc.render.filepath = os.path.join(OUT, f'car-{name}-{view}.png')
        bpy.ops.render.render(write_still=True)
print('PREVIEWS DONE')

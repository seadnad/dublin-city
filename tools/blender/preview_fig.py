"""Render one or more kit bodies for checking:  blender -b -P tools/blender/preview_fig.py -- out.png body [body...]
Body names are statue_bodies functions; 'victory:fidelity' passes an argument."""
import bpy, math, os, sys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, statue_bodies as B

args = sys.argv[sys.argv.index('--') + 1:]
out, names = os.path.abspath(args[0]), args[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
mat = kit.material('m', (0.25, 0.26, 0.25), 0.6)
for i, n in enumerate(names):
    fn, _, arg = n.partition(':')
    f = getattr(B, fn)(arg) if arg else getattr(B, fn)()
    ob = f.to_object(n, mat)
    ob.data.calc_loop_triangles(); print('BODY', n, len(ob.data.loop_triangles))
    ob.location.x = i * 2.0
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 700 * len(names), 800
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.7, 0.75, 0.8, 1)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 4
sun.rotation_euler = (math.radians(45), 0, math.radians(-30)); sc.collection.objects.link(sun)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
cx = (len(names) - 1)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(2.4, 2.0 * len(names))
cam.location = (cx - 6, -9, 2.6)
cam.rotation_euler = (Vector((cx, 0, 1.0)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
sc.render.filepath = out
bpy.ops.render.render(write_still=True)

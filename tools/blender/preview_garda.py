"""Quick shape previews of models/garda.blend (Workbench, studio light).
blender -b models/garda.blend -P tools/blender/preview_garda.py -- <out dir>"""
import bpy, math, os, sys
from mathutils import Vector
OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'MATERIAL'
sc.display.shading.show_cavity = True
sc.display.shading.show_shadows = True
sc.render.resolution_x, sc.render.resolution_y = 1100, 640
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 50
for name, pos in (('front34', (-4.5, 5.6, 1.9)), ('rear34', (4.4, -5.8, 2.0)), ('side', (7.5, 0.0, 1.0)), ('front', (0, 8, 0.9)), ('rear', (0, -8, 1.0)), ('top', (0.01, 0, 9))):
    cam.location = pos
    d = Vector((0, 0, 0.75)) - Vector(pos)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(OUT, f'blender-{name}.png')
    bpy.ops.render.render(write_still=True)
print('PREVIEWS', OUT)

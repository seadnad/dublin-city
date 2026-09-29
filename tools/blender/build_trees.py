"""Grow a set of low-poly trees in Blender and export them as one GLB (public/models/trees.glb).

Run headless:  blender -b --factory-startup -P tools/blender/build_trees.py -- public/models

Each variant is grown procedurally: a tapering trunk that splits recursively into limbs (with some droop and
random twist), leaf clumps at the branch tips made of noise-displaced icospheres, and per-vertex colour
variation in the foliage. Species are tuned by silhouette:
  plane    - London plane: tall, open, broad crown with mottled bark (Dublin's quays and squares)
  lime     - common lime: taller, oval crown
  chestnut - horse chestnut: dense, rounded dome, low branching
  birch    - silver birch: slender, airy, pale bark
  young    - a young street tree with a small crown
  rowan    - mountain ash: a small upright street tree with orange-red berry clusters (O'Connell Street's islands)
Objects are named tree_<variant>_bark and tree_<variant>_leaves; the game instances each one.
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Matrix, noise

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
os.makedirs(OUT, exist_ok=True)


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name, hexcol, rough=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    b = nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(hexcol), 1)
    b.inputs['Roughness'].default_value = rough
    # multiply by vertex colour so the variation exports (glTF COLOR_0)
    vc = nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Col'
    mix = nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    mix.inputs[6].default_value = (*srgb(hexcol), 1)
    m.node_tree.links.new(vc.outputs['Color'], mix.inputs[7])
    m.node_tree.links.new(mix.outputs[2], b.inputs['Base Color'])
    return m


SPECIES = {
    'plane': dict(height=9.0, trunk_r=0.32, split=3.2, depth=4, kids=(2, 3), spread=0.62, droop=0.05, shrink=0.72,
                  clump=(1.6, 2.4), clumps_per_tip=1, leaf='#5f8a3a', leaf_var=0.22, bark='#8d8272', mottled=True, seed=11),
    'lime': dict(height=11.0, trunk_r=0.3, split=3.8, depth=4, kids=(2, 3), spread=0.42, droop=0.0, shrink=0.74,
                 clump=(1.4, 2.0), clumps_per_tip=1, leaf='#6a943e', leaf_var=0.18, bark='#5e554a', seed=23),
    'chestnut': dict(height=8.0, trunk_r=0.36, split=2.2, depth=4, kids=(3, 3), spread=0.8, droop=0.12, shrink=0.68,
                     clump=(1.8, 2.6), clumps_per_tip=1, leaf='#4a7431', leaf_var=0.2, bark='#4f473f', seed=37),
    'birch': dict(height=9.5, trunk_r=0.17, split=3.5, depth=4, kids=(2, 2), spread=0.38, droop=0.18, shrink=0.72,
                  clump=(0.9, 1.4), clumps_per_tip=1, leaf='#86a54c', leaf_var=0.25, bark='#d9d6cc', birch=True, seed=51),
    'young': dict(height=5.5, trunk_r=0.12, split=2.4, depth=3, kids=(2, 3), spread=0.5, droop=0.02, shrink=0.72,
                  clump=(1.0, 1.4), clumps_per_tip=1, leaf='#6b9a42', leaf_var=0.2, bark='#6a5f52', seed=67),
    'rowan': dict(height=6.5, trunk_r=0.14, split=2.3, depth=3, kids=(2, 3), spread=0.36, droop=0.0, shrink=0.72,
                  clump=(0.9, 1.25), clumps_per_tip=1, leaf='#ffffff', leaf_vc='#5a8a3e', leaf_var=0.16, bark='#77726a', berries=0.1, seed=83),
}


def grow(sp):
    rnd = random.Random(sp['seed'])
    bark = bmesh.new()
    leaves = bmesh.new()
    col_b = bark.loops.layers.color.new('Col')
    col_l = leaves.loops.layers.color.new('Col')

    def limb(start, direction, length, r0, r1, depth):
        """A tapered 7-sided cylinder along `direction`; returns the tip."""
        end = start + direction * length
        segs = 5
        z = direction.normalized()
        x = z.cross(Vector((0, 0, 1)) if abs(z.z) < 0.95 else Vector((1, 0, 0))).normalized()
        y = z.cross(x)
        ring0 = [bark.verts.new(start + (x * math.cos(a) + y * math.sin(a)) * r0) for a in [k / segs * math.tau for k in range(segs)]]
        ring1 = [bark.verts.new(end + (x * math.cos(a) + y * math.sin(a)) * r1) for a in [k / segs * math.tau for k in range(segs)]]
        for k in range(segs):
            f = bark.faces.new((ring0[k], ring0[(k + 1) % segs], ring1[(k + 1) % segs], ring1[k]))
            for loop in f.loops:
                p = loop.vert.co
                # mottled plane bark / birch stripes / plain, as vertex colour
                if sp.get('mottled'):
                    n = noise.noise(p * 2.3)
                    v = 0.85 + 0.35 * n
                    c = (v * 1.05, v, v * 0.85, 1)
                elif sp.get('birch'):
                    band = noise.noise(Vector((p.x * 0.3, p.y * 0.3, p.z * 6.0)))
                    v = 0.25 if band > 0.35 else 1.0
                    c = (v, v, v, 1)
                else:
                    v = 0.85 + 0.2 * noise.noise(p * 3.1)
                    c = (v, v, v, 1)
                loop[col_b] = c
        return end

    def clump(centre, radius):
        m = Matrix.Translation(centre) @ Matrix.Scale(radius, 4)
        res = bmesh.ops.create_icosphere(leaves, subdivisions=1, radius=1.0, matrix=m)
        vs = res['verts']
        base = Vector(srgb(sp['leaf']))
        seed = rnd.random() * 100
        for v in vs:
            d = (v.co - centre)
            # lumpy canopy: displace along the normal with noise, flatten the underside a little
            n = noise.noise(v.co * (1.6 / radius) + Vector((seed, 0, 0)))
            d *= 1.0 + 0.28 * n
            if d.z < 0:
                d.z *= 0.72
            v.co = centre + d
        faces = {f for v in vs for f in v.link_faces}
        tint = 1.0 + (rnd.random() - 0.5) * 2 * sp['leaf_var']
        warm = (rnd.random() - 0.5) * 0.15
        for f in faces:
            for loop in f.loops:
                p = loop.vert.co
                shade = 0.72 + 0.28 * max(0.0, min(1.0, (p.z - centre.z + radius) / (2 * radius)))  # darker underneath
                speck = 0.9 + 0.2 * noise.noise(p * 3.7)
                k = tint * shade * speck
                loop[col_l] = (min(1, k * (1 + warm)), min(1, k), min(1, k * (1 - warm)), 1)
                if sp.get('leaf_vc'):  # the leaf colour lives in the vertex colours (the material is white) so berries can be orange
                    lc = [int(sp['leaf_vc'][i:i + 2], 16) / 255 for i in (1, 3, 5)]  # byte colours are stored sRGB
                    loop[col_l] = (min(1, k * (1 + warm) * lc[0]), min(1, k * lc[1]), min(1, k * (1 - warm) * lc[2]), 1)
                if sp.get('berries') and noise.noise(p * 6.1) > 0.62 - sp['berries'] * 1.5:
                    # berry clusters: orange-red against the leaf tint (the colour is multiplied by the leaf colour)
                    loop[col_l] = (0.72 * shade, 0.2 * shade, 0.08 * shade, 1)

    def branch(start, direction, length, radius, depth):
        # gentle droop and wander along the limb
        end = limb(start, direction, length, radius, radius * sp['shrink'], depth)
        if depth == 1 and rnd.random() < 0.5:
            # inner foliage along the upper limbs so the crown isn't hollow
            mid = start + (end - start) * 0.7
            clump(mid + Vector((rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), 0.2)), rnd.uniform(*sp['clump']) * 1.15)
        if depth == 0:
            for _ in range(sp['clumps_per_tip']):
                r = rnd.uniform(*sp['clump']) * 1.3  # one larger cluster per branch tip keeps the crown full
                off = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.3, 0.8))) * r * 0.45
                clump(end + off, r)
            return
        kids = rnd.randint(*sp['kids'])
        phase = rnd.random() * math.tau
        for i in range(kids):
            az = phase + i / kids * math.tau + rnd.uniform(-0.35, 0.35)
            tilt = sp['spread'] * rnd.uniform(0.75, 1.2)
            d = direction.normalized()
            side = Vector((math.cos(az), math.sin(az), 0))
            nd = (d * math.cos(tilt) + side * math.sin(tilt)).normalized()
            nd.z -= sp['droop'] * (sp['depth'] - depth) / sp['depth']
            nl = length * rnd.uniform(0.62, 0.82)
            branch(end, nd.normalized(), nl, radius * sp['shrink'], depth - 1)

    # trunk with a slight lean, then the crown
    lean = Vector((rnd.uniform(-0.08, 0.08), rnd.uniform(-0.08, 0.08), 1)).normalized()
    top = limb(Vector((0, 0, -0.2)), lean, sp['split'] + 0.2, sp['trunk_r'] * 1.25, sp['trunk_r'], 0)
    crown_len = (sp['height'] - sp['split']) * 0.5
    branch(top, lean, crown_len, sp['trunk_r'], sp['depth'])
    return bark, leaves


def to_object(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


bpy.ops.wm.read_factory_settings(use_empty=True)
leaf_mat = material('leaves', '#ffffff', 0.9)
for i, (name, sp) in enumerate(SPECIES.items()):
    bark_mat = material(f'bark_{name}', sp['bark'], 0.95)
    lm = material(f'leaves_{name}', sp['leaf'], 0.9)
    b, l = grow(sp)
    ob_b = to_object(f'tree_{name}_bark', b, bark_mat)
    ob_l = to_object(f'tree_{name}_leaves', l, lm)
    # spread them out so the preview shows them side by side; the game resets positions
    for ob in (ob_b, ob_l):
        ob.location.x = i * 14
    print(name, 'bark tris', sum(len(p.vertices) - 2 for p in ob_b.data.polygons), 'leaf tris', sum(len(p.vertices) - 2 for p in ob_l.data.polygons))

path = os.path.join(OUT, 'trees.glb')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
print('EXPORTED', path, os.path.getsize(path))

# optional preview render
if len(ARGS) > 1:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1400, 560
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.66, 0.7, 1)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(28, 0, 0))
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3
    sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.location = (28, -68, 7); cam.rotation_euler = (math.radians(86), 0, 0); cam.data.lens = 38
    sc.camera = cam
    sc.render.filepath = os.path.join(os.path.abspath(ARGS[1]), 'trees.png')
    bpy.ops.render.render(write_still=True)
    print('PREVIEW', sc.render.filepath)

"""Connolly Station's front on Amiens Street (William Deane Butler for the Dublin & Drogheda Railway, 1844-46; Wicklow
granite; docs/research/railway.md, refs 10-12): a two-storey Italianate range with a colonnade on the ground floor and
a balustraded balcony over it, the tall central campanile (a clock stage and an open belfry under a bracketed cornice),
and a smaller tower at each end with a triplet of round-headed windows.

Run headless:  blender -b --factory-startup -P tools/blender/build_connolly.py -- public/models models

Built in game metres, about 0.8 of real height and squeezed to the site's 40 m frontage (sites.js `connolly`).
Local frame: X along the front (south to north, i.e. the viewer's left to right from Amiens Street), the front at
Y = -8.5 facing -Y (the site's local +z, towards the street), depth to Y = +8.5. One root `connolly`, placed by
heroes.js placeParts with the shared stone materials (cn_granite, cn_slate, cn_dark, cn_decal).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Decals

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
os.makedirs(OUT, exist_ok=True); os.makedirs(SRC, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

gra, sla, drk, dec = Part('cn_granite', 3.0), Part('cn_slate', 3.0), Part('cn_dark'), Decals('cn_decal')
X0, X1, YF, YB = -19.5, 19.5, -8.5, 8.5
GF, F1, BAL = 6.0, 11.4, 12.4          # ground-floor top, first-floor top (cornice), balustrade top
CT = (-6.0, 0.0)                        # the campanile's X range; it stands 1 m proud of the front
ENDS = ((X0, X0 + 4.2), (X1 - 4.2, X1))  # the end towers


def cornice(part, x0, x1, y0, y1, z, h=0.45, out=0.35):
    part.box(x0 - out, x1 + out, y0 - out, y1 + out, z, z + h)


# ---------------- the main range ----------------
gra.box(X0, X1, YF, YB, 0, F1)
cornice(gra, X0, X1, YF, YB, F1)
gra.box(X0, X1, YF, YF + 0.1, 0, 0.6)   # plinth
# balustrade on the parapet: posts and a rail (blocky, it reads from the street)
for y in (YF - 0.15,):
    gra.box(X0, X1, y, y + 0.35, F1 + 0.45, F1 + 0.6)
    gra.box(X0, X1, y, y + 0.35, BAL - 0.15, BAL)
    x = X0 + 0.3
    while x < X1 - 0.2:
        gra.box(x, x + 0.18, y + 0.08, y + 0.27, F1 + 0.6, BAL - 0.15)
        x += 0.5
# slate roof: a low hipped roof behind the balustrade
kit.hip(sla, X0 + 0.5, X1 - 0.5, YF + 0.5, YB - 0.5, F1 + 0.45, F1 + 3.6)

# ground floor: a colonnade of 12 columns either side of the campanile (the loggia in front of the booking hall),
# round-headed windows and doors behind; the balcony over it (a slab with a balustrade)
def colonnade(xa, xb, n):
    pitch = (xb - xa) / n
    for k in range(n + 1):
        cx = xa + k * pitch
        kit.lathe(gra, cx, YF - 1.3, [(0.38, 0.0), (0.38, 0.5), (0.27, 0.6), (0.24, GF - 0.9), (0.34, GF - 0.6), (0.4, GF - 0.45)], sides=10)
        gra.box(cx - 0.45, cx + 0.45, YF - 1.75, YF - 0.85, GF - 0.45, GF - 0.25)
    for k in range(n):
        c = xa + (k + 0.5) * pitch
        dec.on('round' if k % 2 else 'door', 'y', YF, -1, c - 0.75, c + 0.75, 0.3, 4.6)
    gra.box(xa - 0.5, xb + 0.5, YF - 1.9, YF, GF - 0.25, GF + 0.25)        # the entablature / balcony slab
    gra.box(xa - 0.5, xb + 0.5, YF - 1.9, YF - 1.6, GF + 0.25, GF + 1.2)  # its balustrade (solid, pierced by decals)
    gra.box(xa - 0.5, xb + 0.5, YF - 1.95, YF - 1.55, GF + 1.2, GF + 1.35)


colonnade(X0 + 5.2, CT[0] - 1.0, 5)
colonnade(CT[1] + 1.0, X1 - 5.2, 6)
gra.box(X0, X1, YF - 1.9, YF, 0, 0.3)   # the loggia's floor (the steps up from the footpath)
# first floor: tall sash windows with pediments every 2.6 m
x = X0 + 5.6
while x < X1 - 5.4:
    if not (CT[0] - 1.2 < x < CT[1] + 1.2):
        dec.on('sash', 'y', YF, -1, x - 0.6, x + 0.6, GF + 1.5, F1 - 1.2)
        gra.box(x - 0.85, x + 0.85, YF - 0.25, YF, F1 - 1.05, F1 - 0.8)
    x += 2.6

# ---------------- the end towers ----------------
for (a, b) in ENDS:
    gra.box(a, b, YF - 0.6, YF + 5.0, 0, 17.0)
    cornice(gra, a, b, YF - 0.6, YF + 5.0, 17.0, 0.6, 0.45)
    kit.hip(sla, a - 0.3, b + 0.3, YF - 0.9, YF + 5.3, 17.6, 18.6)
    c = (a + b) / 2
    dec.on('round', 'y', YF - 0.6, -1, c - 0.9, c + 0.9, 0.8, 4.8)
    dec.on('sash', 'y', YF - 0.6, -1, c - 0.7, c + 0.7, GF + 1.4, F1 - 1.0)
    for o in (-1.2, 0, 1.2):   # the triplet of round-headed windows in the top stage
        dec.on('round', 'y', YF - 0.6, -1, c + o - 0.45, c + o + 0.45, 13.0, 16.2)
    gra.box(a - 0.15, b + 0.15, YF - 0.8, YF + 5.2, F1, F1 + 0.5)   # a string course at the main cornice
    gra.box(a - 0.1, b + 0.1, YF - 0.75, YF + 5.15, 12.4, 12.7)

# ---------------- the campanile ----------------
a, b = CT
yf, yb = YF - 1.0, YF + 5.0
gra.box(a, b, yf, yb, 0, 19.0)
cornice(gra, a, b, yf, yb, 12.4, 0.4, 0.3)
cornice(gra, a, b, yf, yb, 19.0, 0.6, 0.45)
c = (a + b) / 2
dec.on('portal' if False else 'door', 'y', yf, -1, c - 1.3, c + 1.3, 0.3, 5.6)       # the arched entrance
dec.on('round', 'y', yf, -1, c - 1.4, c + 1.4, 7.0, 11.8)                                # the great arched window
dec.on('clock', 'y', yf, -1, c - 0.95, c + 0.95, 13.4, 15.3)
dec.on('round', 'y', yf, -1, c - 0.8, c + 0.8, 15.8, 18.5)
# a balustraded platform with the open belfry: four corner piers under a heavy bracketed cornice, a dark interior
gra.box(a - 0.3, b + 0.3, yf - 0.3, yb + 0.3, 19.6, 20.2)
bh0, bh1 = 20.2, 25.0
for (px, py) in ((a, yf), (b - 1.1, yf), (a, yb - 1.1), (b - 1.1, yb - 1.1)):
    gra.box(px, px + 1.1, py, py + 1.1, bh0, bh1)
drk.box(a + 0.9, b - 0.9, yf + 0.9, yb - 0.9, bh0, bh1)
for (x0, x1, y0, y1) in ((a + 1.1, b - 1.1, yf + 0.1, yf + 0.3), (a + 1.1, b - 1.1, yb - 0.3, yb - 0.1)):
    gra.box(x0, x1, y0, y1, bh0, bh0 + 1.0)   # the sill balustrades
for (x0, x1, y0, y1) in ((a + 0.1, a + 0.3, yf + 1.1, yb - 1.1), (b - 0.3, b - 0.1, yf + 1.1, yb - 1.1)):
    gra.box(x0, x1, y0, y1, bh0, bh0 + 1.0)
gra.box(a - 0.5, b + 0.5, yf - 0.5, yb + 0.5, bh1, bh1 + 0.9)
gra.box(a - 0.2, b + 0.2, yf - 0.2, yb + 0.2, bh1 + 0.9, bh1 + 1.3)
kit.hip(sla, a - 0.2, b + 0.2, yf - 0.2, yb + 0.2, bh1 + 1.3, bh1 + 2.3)
gra.box(c - 0.05, c + 0.05, (yf + yb) / 2 - 0.05, (yf + yb) / 2 + 0.05, bh1 + 2.3, bh1 + 4.5)   # the flagpole

# ---------------- finish ----------------
objs = [gra.build(kit.material('cn_granite', (0.5, 0.49, 0.46))), sla.build(kit.material('cn_slate', (0.1, 0.11, 0.12))),
        drk.build(kit.material('cn_dark', (0.02, 0.02, 0.02))), dec.build(kit.material('cn_decal', (1, 1, 1)))]
print('TRIANGLES before AO', kit.tris(objs))
kit.bake_ao_vertex(objs, distance=1.6, samples=20, cell=2.5, passes=1)
root = bpy.data.objects.new('connolly', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs), {o.name: kit.tris([o]) for o in objs})
kit.export(os.path.join(OUT, 'connolly.glb'), os.path.join(SRC, 'connolly.blend'))
print('DONE')

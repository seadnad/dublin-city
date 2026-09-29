"""Sean Heuston Bridge (1821, cast iron): a single segmental arch with dark fascia ribs, off-white spandrels with a
framed crown-and-scroll panel near each abutment, an openwork ring parapet between cream dies (the crown die carries
the 1821 plate), granite corner piers with lamp standards, and granite abutments out to the quay walls.

Run headless:  blender -b --factory-startup -P tools/blender/build_heustonbridge.py -- public/models models

Sources: docs/research/heuston-v2.md section 11, refs/heuston/12, 13. Built at game size (the deck is 9 m, as in the
street graph; trams and people are real size): X runs along the span, Y across, Z up with the deck at 0. The game's
water is only 2.6 m down, so the 30 m arch is much flatter than the real one (accepted); the river channel under the
bridge is 51.3 m, so granite abutments fill out to the quays. src/world/heuston.js places it on the bridge's deck and
scales it to the span. Materials: hb_iron, hb_rib, hb_lantern, hs_granite, hs_atlas (the Heuston atlas).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Atlas, WF, rect, block, arc_pts, band, lathe
from heuston_atlas import HS_ATLAS

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)
MAT = {n: kit.material(n, c) for n, c in dict(hb_iron=(0.72, 0.72, 0.69), hb_rib=(0.02, 0.025, 0.035), hb_lantern=(0.8, 0.7, 0.5),
                                              hs_granite=(0.4, 0.39, 0.36), hs_atlas=(1, 1, 1)).items()}
iron, rib, lan, gra = Part('hb_iron'), Part('hb_rib'), Part('hb_lantern'), Part('hs_granite')
atl = Atlas('hs_atlas', HS_ATLAS, 2048, 1024)

LB = 51.34                     # the river channel under the bridge in the game (ground.js bridges)
HALF = LB / 2
S = 15.0                       # half span of the arch
W2 = 4.5                       # half deck width
EDGE = W2 + 0.8                # outer face of the deck cornice (the game's deck plane is W + 1.6 wide)
PAR = W2 + 0.35                # parapet line (as the old parapet: collision segments stay in ground.js)
SPRING, CROWN = -2.9, -0.95    # intrados: springing hidden under the water, crown soffit
FASC0 = -0.45                  # deck fascia bottom
R = (S * S + (CROWN - SPRING) ** 2) / (2 * (CROWN - SPRING))
ZC = CROWN - R
A = math.asin(S / R)
N = 24
intr = [(R * math.sin(-A + 2 * A * i / N), ZC + R * math.cos(-A + 2 * A * i / N)) for i in range(N + 1)]
depth = lambda x: 0.5 + 0.4 * (abs(x) / S) ** 2
extr = [(x + (x / R) * depth(x), z + ((z - ZC) / R) * depth(x)) for x, z in intr]
PIER0, PIER1 = S, S + 3.2      # granite corner piers

for sg in (-1, 1):
    y = sg * EDGE
    n = (0, sg, 0)
    # dark fascia rib: its face, and its underside along the intrados
    for i in range(N):
        (xa, za), (xb, zb) = intr[i], intr[i + 1]
        (xc, zc), (xd, zd) = extr[i + 1], extr[i]
        rib.facen([(xa, y - sg * 0.1, za), (xb, y - sg * 0.1, zb), (xc, y - sg * 0.1, zc), (xd, y - sg * 0.1, zd)], n)
        rib.facen([(xa, y - sg * 0.1, za), (xb, y - sg * 0.1, zb), (xb, y - sg * 0.45, zb), (xa, y - sg * 0.45, za)], (0, 0, -1))
    # off-white spandrels between the rib and the deck fascia, a framed panel near each abutment
    for i in range(N):
        (xa, za), (xb, zb) = extr[i], extr[i + 1]
        if min(za, zb) < FASC0 - 0.02:
            iron.facen([(xa, y - sg * 0.05, za), (xb, y - sg * 0.05, zb), (xb, y - sg * 0.05, FASC0), (xa, y - sg * 0.05, FASC0)], n)
    for px0, px1 in ((-14.2, -8.6), (8.6, 14.2)):
        zb0 = next(z for x, z in extr if x >= px0) + 0.12
        zb1 = next(z for x, z in extr if x >= px1) + 0.12
        pts = [(px0, y - sg * 0.02, zb0), (px1, y - sg * 0.02, zb1), (px1, y - sg * 0.02, FASC0 - 0.08), (px0, y - sg * 0.02, FASC0 - 0.08)]
        atl.facen(pts, n, [atl.tc('spandrel', 0, 1), atl.tc('spandrel', 1, 1), atl.tc('spandrel', 1, 0), atl.tc('spandrel', 0, 0)])
    # deck fascia and cornice
    iron.facen([(-PIER0, y, FASC0), (PIER0, y, FASC0), (PIER0, y, 0.05), (-PIER0, y, 0.05)], n)
    iron.facen([(-PIER0, y, FASC0), (PIER0, y, FASC0), (PIER0, y - sg * 0.3, FASC0), (-PIER0, y - sg * 0.3, FASC0)], (0, 0, -1))
    iron.facen([(-PIER0, y, 0.05), (PIER0, y, 0.05), (PIER0, y - sg * 0.45, 0.05), (-PIER0, y - sg * 0.45, 0.05)], (0, 0, 1))
    # parapet: cream dies at 4 m, openwork ring panels between, the 1821 plate on the crown die
    dies = [-12.0, -8.0, -4.0, 0.0, 4.0, 8.0, 12.0]
    for x in dies:
        iron.box(x - 0.25, x + 0.25, sg * PAR - 0.25, sg * PAR + 0.25, 0.05, 1.2)
        iron.box(x - 0.31, x + 0.31, sg * PAR - 0.31, sg * PAR + 0.31, 1.2, 1.32, top=True, bottom=True)
    atl.facen([(-0.26, sg * (PAR + 0.26), 0.55), (0.26, sg * (PAR + 0.26), 0.55), (0.26, sg * (PAR + 0.26), 0.8), (-0.26, sg * (PAR + 0.26), 0.8)], n,
              [atl.tc('plate1821', 0, 1), atl.tc('plate1821', 1, 1), atl.tc('plate1821', 1, 0), atl.tc('plate1821', 0, 0)])
    stops = [-PIER0] + dies + [PIER0]
    for a, b in zip(stops, stops[1:]):
        a0, b0 = a + (0.25 if a != -PIER0 else 0.0), b - (0.25 if b != PIER0 else 0.0)
        k = max(1, math.ceil((b0 - a0) / 2.9))
        for j in range(k):
            s0, s1 = a0 + (b0 - a0) * j / k, a0 + (b0 - a0) * (j + 1) / k
            t = (s1 - s0) / 2.93
            atl.facen([(s0, sg * PAR, 0.05), (s1, sg * PAR, 0.05), (s1, sg * PAR, 1.1), (s0, sg * PAR, 1.1)], n,
                      [atl.tc('ring', 0, 1), atl.tc('ring', t, 1), atl.tc('ring', t, 0), atl.tc('ring', 0, 0)])
        iron.box(a0, b0, sg * PAR - 0.06, sg * PAR + 0.06, 1.05, 1.15, top=True, bottom=True)
# the soffit between the ribs
for i in range(N):
    (xa, za), (xb, zb) = intr[i], intr[i + 1]
    iron.facen([(xa, -EDGE + 0.45, za), (xa, EDGE - 0.45, za), (xb, EDGE - 0.45, zb), (xb, -EDGE + 0.45, zb)], (0, 0, -1))

# granite corner piers (rusticated, rising 1.3 m above the deck) with lamp standards, and the abutments out to the quays
for sx in (-1, 1):
    x0, x1 = sorted((sx * PIER0, sx * PIER1))
    gra.box(x0, x1, -EDGE - 0.3, EDGE + 0.3, -3.4, -0.1, top=False)       # abutment under the deck
    for sy in (-1, 1):
        y0, y1 = sorted((sy * (EDGE + 0.3), sy * (EDGE - 2.2)))
        gra.box(x0, x1, y0, y1, -3.4, 1.3, top=False)
        gra.box(x0 - 0.12, x1 + 0.12, y0 - 0.12, y1 + 0.12, 1.3, 1.55, top=True, bottom=True)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        lathe(iron, cx, cy, [(0.3, 1.55), (0.22, 1.9), (0.1, 2.05), (0.08, 4.6), (0.16, 4.72), (0.0, 4.8)], 6)
        lathe(lan, cx, cy, [(0.1, 4.78), (0.26, 5.0), (0.22, 5.4), (0.07, 5.55), (0.0, 5.7)], 6)
    # abutment walls from the pier to the quay: granite, with a solid parapet continuing the line
    xa, xb = sorted((sx * PIER1, sx * HALF))
    gra.box(xa, xb, -EDGE, EDGE, -3.4, -0.1, top=False)
    for sy in (-1, 1):
        gra.box(xa, xb, sy * PAR - 0.28, sy * PAR + 0.28, 0.0, 1.1, top=True)
        gra.box(xa, xb, sy * PAR - 0.36, sy * PAR + 0.36, 1.1, 1.22, top=True, bottom=True)

objs = [p.build(MAT[m]) for p, m in ((iron, 'hb_iron'), (rib, 'hb_rib'), (lan, 'hb_lantern'), (gra, 'hs_granite'), (atl, 'hs_atlas'))]
kit.bake_ao_vertex(objs, distance=1.5, samples=24, cell=3.0, passes=1)
root = bpy.data.objects.new('bridge', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs))
kit.export(os.path.join(OUT, 'heustonbridge.glb'), os.path.join(SRC, 'heustonbridge.blend'))
print('DONE')

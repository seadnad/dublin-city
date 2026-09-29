"""Phoenix Park heroes: the Wellington Monument, the Phoenix column, the Papal Cross, the Parkgate piers, pedestrian
gateway and lodge, the North Circular Road gate screen and the Áras an Uachtaráin gates.

Run headless:  blender -b --factory-startup -P tools/blender/build_phoenixpark.py -- public/models models

Sources: docs/research/phoenix-park.md (§3.1 Wellington, §3.2 Phoenix Monument, §3.3 Parkgate, §1.5 gates, §3.5 the
Papal Cross) and refs/phoenix-park/*.
Built directly in game units: heights real, plans squeezed where the half-scale map needs it (the obelisk's step
square x0.8, the column's base x0.8, the gate pieces x0.85). Each hero is its own node (an empty at its ground-level
origin) so the game places them independently; nodes are spread along X only for the AO bake.
Axes: X east, Y north, Z up. Where a piece relates to a road, the road runs along Y and the game turns local -Y (three's
+Z) to face along it.
Materials (heroes.js stoneMaterials): pk_granite, pk_portland, pk_limestone, pk_bronze + pk_cut (the park atlas,
PARK below), pk_white, pk_slate, pk_render, pk_lantern, pk_grass, pk_sett, pk_dark, pk_decal (the shared decal atlas).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Decals

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

# park atlas regions (px in 1024; must match heroes.js PARK)
PARK = dict(waterloo=(0, 0, 1024, 192), liberty=(0, 192, 1024, 192), india=(0, 384, 1024, 192), inscr=(0, 576, 1024, 192),
            ncr=(0, 768, 256, 256), aras=(256, 768, 256, 256), phx=(512, 768, 256, 128), arms=(512, 896, 256, 128),
            names=(768, 768, 256, 256))


def pv(region, s, t):
    u0, v0, w, h = PARK[region]
    return ((u0 + s * w) / 1024, 1 - (v0 + t * h) / 1024)


bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}
def mat(key, rgb, rough=0.8):
    if key not in MATS:
        MATS[key] = kit.material('pk_' + key, rgb, rough)
    return MATS[key]
for k, c in dict(granite=(0.42, 0.42, 0.39), portland=(0.6, 0.58, 0.53), limestone=(0.33, 0.33, 0.32), bronze=(0.05, 0.06, 0.06),
                 cut=(0.9, 0.9, 0.88), white=(0.85, 0.84, 0.8), slate=(0.07, 0.08, 0.09), render=(0.7, 0.67, 0.6),
                 lantern=(0.8, 0.75, 0.6), grass=(0.12, 0.2, 0.07), sett=(0.2, 0.2, 0.2), dark=(0.02, 0.02, 0.02), decal=(1, 1, 1)).items():
    mat(k, c)


class Node:
    """A hero: one Part per material, parented to an empty named after the node."""
    def __init__(self, name):
        self.name, self.parts = name, {}

    def __getattr__(self, key):
        if key.startswith('__'):
            raise AttributeError(key)
        if key not in self.parts:
            # alpha cards and bronze panels skip the AO bake (kit hides objects whose name ends in 'decal')
            skip = key in ('decal', 'bronze', 'cut')
            self.parts[key] = (Decals if key == 'decal' else Part)(f'{self.name}_{key}' + ('decal' if skip and key != 'decal' else ''), tile=4.0)
        return self.parts[key]

    def build(self, x):
        root = bpy.data.objects.new(self.name, None)
        bpy.context.collection.objects.link(root)
        objs = []
        for key, part in self.parts.items():
            ob = part.build(MATS[key])
            ob.parent = root
            objs.append(ob)
        root.location = (x, 0, 0)
        return root, objs


def card(part, region, a, b, h0, h1, tiles=1.0):
    """A vertical alpha card from a to b (x, y), both faces, the region tiled `tiles` times along it."""
    (ax, ay), (bx, by) = a, b
    for s, e in ((0, 1), (1, 0)):
        p0, p1 = (a, b) if s == 0 else (b, a)
        u0, u1 = (0, tiles) if s == 0 else (tiles, 0)
        pts = [(p0[0], p0[1], h0), (p1[0], p1[1], h0), (p1[0], p1[1], h1), (p0[0], p0[1], h1)]
        uvs = [pv(region, u0, 1), pv(region, u1, 1), pv(region, u1, 0), pv(region, u0, 0)]
        # tiled: the region repeats by wrapping s beyond 1 isn't possible in an atlas, so split into whole tiles
        if tiles == 1.0:
            part.face(pts, uvs)
        else:
            n = int(round(tiles))
            for k in range(n):
                q0 = (p0[0] + (p1[0] - p0[0]) * k / n, p0[1] + (p1[1] - p0[1]) * k / n)
                q1 = (p0[0] + (p1[0] - p0[0]) * (k + 1) / n, p0[1] + (p1[1] - p0[1]) * (k + 1) / n)
                part.face([(q0[0], q0[1], h0), (q1[0], q1[1], h0), (q1[0], q1[1], h1), (q0[0], q0[1], h1)],
                          [pv(region, 0, 1), pv(region, 1, 1), pv(region, 1, 0), pv(region, 0, 0)])


def frustum(part, hx0, hy0, hx1, hy1, z0, z1, cx=0.0, cy=0.0, chamfer=0.0, cap=False):
    """A tapered square (optionally chamfered = octagonal) section from z0 to z1."""
    def ring(hx, hy, z):
        c = min(chamfer, hx * 0.4, hy * 0.4)
        if c <= 0:
            return [(cx - hx, cy - hy, z), (cx + hx, cy - hy, z), (cx + hx, cy + hy, z), (cx - hx, cy + hy, z)]
        return [(cx - hx + c, cy - hy, z), (cx + hx - c, cy - hy, z), (cx + hx, cy - hy + c, z), (cx + hx, cy + hy - c, z),
                (cx + hx - c, cy + hy, z), (cx - hx + c, cy + hy, z), (cx - hx, cy + hy - c, z), (cx - hx, cy - hy + c, z)]
    r0, r1 = ring(hx0, hy0, z0), ring(hx1, hy1, z1)
    n = len(r0)
    for i in range(n):
        j = (i + 1) % n
        part.quad(r0[i], r0[j], r1[j], r1[i])
    if cap:
        part.face(r1)


def lathe(part, profile, sides, cx=0.0, cy=0.0, cap=True):
    """Surface of revolution: profile = [(r, z), ...] bottom to top."""
    rings = [[(cx + math.cos(k / sides * math.tau) * r, cy + math.sin(k / sides * math.tau) * r, z) for k in range(sides)] for r, z in profile]
    for a, b in zip(rings, rings[1:]):
        for k in range(sides):
            j = (k + 1) % sides
            if a[k] == a[j] and b[k] == b[j]:
                continue
            if a[k] == a[j]:
                part.face([a[k], b[j], b[k]])
            elif b[k] == b[j]:
                part.face([a[k], a[j], b[k]])
            else:
                part.face([a[k], a[j], b[j], b[k]])
    if cap and profile[-1][0] > 0:
        part.face(rings[-1])


nodes = []

# ============ Wellington Monument (Smirke; 1817-61) ============
# 62 m granite obelisk: nine raking steps on a mound, a pedestal with bronze panels on N, W and S and the inscription on
# E, a cornice, a two-stage upper plinth, the tapering shaft with battle names, a pyramidion. Plan x0.8.
W = Node('wellington')
S = 0.8
# mound apron and nine raking steps (35.5 m square at the foot -> 19 m at the top, 3 m high)
frustum(W.grass, 20.5 * S, 20.5 * S, 17.9 * S, 17.9 * S, -0.3, 0.25)
for k in range(9):
    h = (17.75 - k * 0.92) * S
    W.granite.box(-h, h, -h, h, 0.25 + k * 0.31, 0.25 + (k + 1) * 0.31)
Z0 = 3.04
# east flight: eight steps between closed granite strings up to the lower plinth
for k in range(8):
    x0 = 8.55 * S + (8 - k) * 0.45
    W.granite.box(8.55 * S, x0, -2.6, 2.6, Z0 + k * 0.25, Z0 + (k + 1) * 0.25)
for s in (-1, 1):
    y0, y1 = sorted((s * 2.6, s * 2.95))
    W.granite.box(8.55 * S, 8.55 * S + 3.9, y0, y1, Z0, Z0 + 2.2)
# pedestal: lower plinth, die, cornice (three mouldings), upper plinth in two setbacks
W.granite.box(-8.55 * S, 8.55 * S, -8.55 * S, 8.55 * S, Z0, Z0 + 2.0)
D0, D1 = Z0 + 2.0, Z0 + 6.5
W.granite.box(-7.5 * S, 7.5 * S, -7.5 * S, 7.5 * S, D0, D1, top=False)
for hz0, hz1, hh in ((D1, D1 + 0.25, 7.75), (D1 + 0.25, D1 + 0.6, 8.05), (D1 + 0.6, D1 + 0.8, 7.8)):
    W.granite.box(-hh * S, hh * S, -hh * S, hh * S, hz0, hz1)
U0 = D1 + 0.8
W.granite.box(-5.25 * S, 5.25 * S, -5.25 * S, 5.25 * S, U0, U0 + 1.2)
W.granite.box(-4.8 * S, 4.8 * S, -4.8 * S, 4.8 * S, U0 + 1.2, U0 + 2.5)
# the bronze panels in shallow granite frames (N Waterloo, W Civil and Religious Liberty, S Indian Wars, E inscription)
PW, PZ0, PZ1 = 4.5 * S * 1.6, D0 + 1.15, D0 + 3.35
h = 7.5 * S
for face, region in (('n', 'waterloo'), ('w', 'liberty'), ('s', 'india'), ('e', 'inscr')):
    fr = 0.16
    if face in 'ns':
        y = h if face == 'n' else -h
        sgn = 1 if face == 'n' else -1
        W.granite.box(-PW - fr, PW + fr, y - 0.02 if sgn > 0 else y - 0.12, y + 0.12 if sgn > 0 else y + 0.02, PZ0 - fr, PZ0)
        W.granite.box(-PW - fr, PW + fr, y - 0.02 if sgn > 0 else y - 0.12, y + 0.12 if sgn > 0 else y + 0.02, PZ1, PZ1 + fr)
        yy = y + sgn * 0.03
        a, b = ((PW, yy), (-PW, yy)) if sgn > 0 else ((-PW, yy), (PW, yy))
    else:
        x = h if face == 'e' else -h
        sgn = 1 if face == 'e' else -1
        W.granite.box(x - 0.02 if sgn > 0 else x - 0.12, x + 0.12 if sgn > 0 else x + 0.02, -PW - fr, PW + fr, PZ0 - fr, PZ0)
        W.granite.box(x - 0.02 if sgn > 0 else x - 0.12, x + 0.12 if sgn > 0 else x + 0.02, -PW - fr, PW + fr, PZ1, PZ1 + fr)
        xx = x + sgn * 0.03
        a, b = ((xx, -PW), (xx, PW)) if sgn > 0 else ((xx, PW), (xx, -PW))
    W.bronze.face([(a[0], a[1], PZ0), (b[0], b[1], PZ0), (b[0], b[1], PZ1), (a[0], a[1], PZ1)],
                  [pv(region, 0, 1), pv(region, 1, 1), pv(region, 1, 0), pv(region, 0, 0)])
# shaft: 46 m, 8.8 m square at the base tapering to 3.5 m, chamfered arrises, in 14 courses for the AO banding
Z1 = U0 + 2.5
H = 46.0
B0, B1 = 4.4 * S * 1.05, 1.75 * S * 1.05
N = 14
for k in range(N):
    t0, t1 = k / N, (k + 1) / N
    frustum(W.granite, B0 + (B1 - B0) * t0, B0 + (B1 - B0) * t0, B0 + (B1 - B0) * t1, B0 + (B1 - B0) * t1, Z1 + H * t0, Z1 + H * t1, chamfer=0.22)
# pyramidion
frustum(W.granite, B1, B1, 0.02, 0.02, Z1 + H, 62.0, chamfer=0.1, cap=True)
# battle names cut into the lower shaft, each face
NZ0, NZ1 = Z1 + 1.5, Z1 + 9.5
for face in 'nesw':
    tA, tB = (NZ0 - Z1) / H, (NZ1 - Z1) / H
    ha, hb = B0 + (B1 - B0) * tA - 0.6, B0 + (B1 - B0) * tB - 0.6
    ra, rb = B0 + (B1 - B0) * tA + 0.03, B0 + (B1 - B0) * tB + 0.03
    if face == 'n':
        q = [(ha, ra, NZ0), (-ha, ra, NZ0), (-hb, rb, NZ1), (hb, rb, NZ1)]
    elif face == 's':
        q = [(-ha, -ra, NZ0), (ha, -ra, NZ0), (hb, -rb, NZ1), (-hb, -rb, NZ1)]
    elif face == 'e':
        q = [(ra, -ha, NZ0), (ra, ha, NZ0), (rb, hb, NZ1), (rb, -hb, NZ1)]
    else:
        q = [(-ra, ha, NZ0), (-ra, -ha, NZ0), (-rb, -hb, NZ1), (-rb, hb, NZ1)]
    W.bronze.face(q, [pv('names', 0, 1), pv('names', 1, 1), pv('names', 1, 0), pv('names', 0, 0)])
nodes.append(W)

# ============ Phoenix Monument (1747) ============
# Portland stone Corinthian column with a phoenix on its nest, on an inscribed pedestal and a granite stepped base with
# four squat corner plinths, standing on a round platform of setts in the middle of the roundabout. Plan x0.8.
X = Node('phoenix')
lathe(X.sett, [(9.1, 0.02), (9.3, 0.32), (0.0, 0.32)], 32, cap=False)
for k, (hw, z0, z1) in enumerate(((3.3, 0.16, 0.6), (2.85, 0.6, 1.05), (2.4, 1.05, 1.5))):
    frustum(X.granite, hw, hw, hw, hw, z0, z1, chamfer=0.9 - k * 0.2, cap=True)
for sx in (-1, 1):
    for sy in (-1, 1):
        X.portland.box(sx * 2.0 - 0.45, sx * 2.0 + 0.45, sy * 2.0 - 0.45, sy * 2.0 + 0.45, 1.5, 2.6)
# pedestal with base and cornice mouldings
X.portland.box(-1.2, 1.2, -1.2, 1.2, 1.5, 2.0)
X.portland.box(-0.95, 0.95, -0.95, 0.95, 2.0, 4.6, top=False)
X.portland.box(-1.15, 1.15, -1.15, 1.15, 4.6, 4.95)
for face, region in (('e', 'phx'), ('w', 'phx'), ('n', 'arms'), ('s', 'arms')):
    o = 0.97
    if face == 'e':
        q = [(o, -0.7, 2.6), (o, 0.7, 2.6), (o, 0.7, 4.1), (o, -0.7, 4.1)]
    elif face == 'w':
        q = [(-o, 0.7, 2.6), (-o, -0.7, 2.6), (-o, -0.7, 4.1), (-o, 0.7, 4.1)]
    elif face == 'n':
        q = [(0.7, o, 2.6), (-0.7, o, 2.6), (-0.7, o, 4.1), (0.7, o, 4.1)]
    else:
        q = [(-0.7, -o, 2.6), (0.7, -o, 2.6), (0.7, -o, 4.1), (-0.7, -o, 4.1)]
    X.bronze.face(q, [pv(region, 0, 1), pv(region, 1, 1), pv(region, 1, 0), pv(region, 0, 0)])
# column: torus base, fluted shaft (20 sides, slight entasis), Corinthian capital (flared bell + abacus)
C0 = 4.95
lathe(X.portland, [(0.62, C0), (0.66, C0 + 0.12), (0.6, C0 + 0.28), (0.5, C0 + 0.36)], 20, cap=False)
shaft = [(0.46, C0 + 0.36), (0.465, C0 + 2.5), (0.45, C0 + 5.0), (0.41, C0 + 7.6)]
lathe(X.portland, shaft, 20, cap=False)
lathe(X.portland, [(0.44, C0 + 7.6), (0.47, C0 + 7.75), (0.52, C0 + 8.1), (0.68, C0 + 8.6), (0.0, C0 + 8.6)], 12, cap=False)
X.portland.box(-0.78, 0.78, -0.78, 0.78, C0 + 8.6, C0 + 8.95)
# the phoenix rising from its flaming nest (a low-poly sculpt: body, raised wings, neck and head, tail)
P0 = C0 + 8.95
lathe(X.portland, [(0.55, P0), (0.62, P0 + 0.3), (0.35, P0 + 0.55), (0.0, P0 + 0.6)], 8, cap=False)
for k in range(6):
    a = k / 6 * math.tau
    X.portland.face([(math.cos(a) * 0.55, math.sin(a) * 0.55, P0 + 0.25), (math.cos(a + 0.5) * 0.55, math.sin(a + 0.5) * 0.55, P0 + 0.25), (math.cos(a + 0.25) * 0.4, math.sin(a + 0.25) * 0.4, P0 + 0.95)])
    X.portland.face([(math.cos(a + 0.5) * 0.55, math.sin(a + 0.5) * 0.55, P0 + 0.25), (math.cos(a) * 0.55, math.sin(a) * 0.55, P0 + 0.25), (math.cos(a + 0.25) * 0.4, math.sin(a + 0.25) * 0.4, P0 + 0.95)])
lathe(X.portland, [(0.0, P0 + 0.55), (0.24, P0 + 0.7), (0.26, P0 + 1.05), (0.16, P0 + 1.35), (0.0, P0 + 1.45)], 8, cap=False)
lathe(X.portland, [(0.0, P0 + 1.35), (0.1, P0 + 1.45), (0.09, P0 + 1.8), (0.13, P0 + 1.9), (0.0, P0 + 2.1)], 6, cap=False)
X.portland.face([(0.0, 0.12, P0 + 1.95), (0.0, 0.4, P0 + 1.85), (0.0, 0.12, P0 + 1.9)])  # beak
X.portland.face([(0.0, 0.12, P0 + 1.9), (0.0, 0.4, P0 + 1.85), (0.0, 0.12, P0 + 1.95)])
for s in (-1, 1):  # wings raised in a V
    wing = [(s * 0.2, 0.05, P0 + 1.1), (s * 1.05, -0.1, P0 + 2.0), (s * 0.95, 0.05, P0 + 1.55), (s * 0.7, 0.0, P0 + 1.25)]
    X.portland.face(wing); X.portland.face(wing[::-1])
tail = [(0.0, -0.2, P0 + 0.9), (-0.25, -0.75, P0 + 0.7), (0.25, -0.75, P0 + 0.7)]
X.portland.face(tail); X.portland.face(tail[::-1])
nodes.append(X)

# ============ Papal Cross (Ronnie Tallon, 1979): 35 m white steel cross on a grassy mound ============
Q = Node('papalcross')
lathe(Q.grass, [(15.0, -0.2), (12.0, 0.9), (6.0, 1.8), (0.0, 1.9)], 24, cap=False)
Q.granite.box(-2.2, 2.2, -2.2, 2.2, 1.6, 2.1)
for k in range(5):  # steps up the mound on the front
    Q.granite.box(-1.6, 1.6, -6.5 - (4 - k) * 1.1, -2.2, 0.0, 0.4 * (k + 1))
Q.white.box(-0.7, 0.7, -0.7, 0.7, 2.1, 37.0)
Q.white.box(-7.5, 7.5, -0.6, 0.6, 26.0, 27.3)
nodes.append(Q)

# ============ Parkgate: a round pier, a pedestrian gateway, the pedimented lodge (x0.85) ============
G = Node('pgpier')
lathe(G.limestone, [(0.8, 0.0), (0.8, 0.45), (0.66, 0.55), (0.62, 0.62), (0.62, 3.55), (0.72, 3.65), (0.78, 3.85), (0.7, 3.95)], 16, cap=True)
# gadrooned dome cap: ribs as a 16-lobed profile
for k in range(16):
    a0, a1 = k / 16 * math.tau, (k + 1) / 16 * math.tau
    am = (a0 + a1) / 2
    for (r0, z0), (r1, z1) in (((0.66, 3.95), (0.5, 4.45)), ((0.5, 4.45), (0.12, 4.8))):
        rm0, rm1 = r0 * 1.08, r1 * 1.08
        p = lambda r, a, z: (math.cos(a) * r, math.sin(a) * r, z)
        G.limestone.face([p(r0, a0, z0), p(rm0, am, z0), p(rm1, am, z1), p(r1, a0, z1)])
        G.limestone.face([p(rm0, am, z0), p(r0, a1, z0), p(r1, a1, z1), p(rm1, am, z1)])
lathe(G.dark, [(0.08, 4.8), (0.08, 5.1), (0.14, 5.15)], 6, cap=False)
frustum(G.dark, 0.14, 0.14, 0.24, 0.24, 5.15, 5.2, cap=False)
frustum(G.lantern, 0.2, 0.2, 0.27, 0.27, 5.2, 5.85)
frustum(G.dark, 0.3, 0.3, 0.02, 0.02, 5.85, 6.25, cap=True)
nodes.append(G)

PG = Node('pggate')  # square-headed rusticated pedestrian gateway; the path runs through it along Y
for x0, x1 in ((-1.2, -0.55), (0.55, 1.2)):
    PG.limestone.box(x0, x1, -0.4, 0.4, 0.0, 3.0)
PG.limestone.box(-1.3, 1.3, -0.45, 0.45, 3.0, 3.6)
PG.limestone.box(-1.4, 1.4, -0.5, 0.5, 3.6, 3.8)
for z in (0.6, 1.2, 1.8, 2.4):  # rustication grooves
    PG.dark.box(-1.21, -0.55, -0.41, 0.41, z, z + 0.04)
    PG.dark.box(0.55, 1.21, -0.41, 0.41, z, z + 0.04)
nodes.append(PG)

L = Node('pglodge')  # single-cell pedimented lodge, 1811: rendered, slate hipped roof, front (pediment) facing -Y
LW, LD, LH = 3.4, 2.8, 3.6
L.render.box(-LW, LW, -LD, LD, 0.0, LH, top=False)
L.slate.pyramid(0, 0, LH, LW + 0.25, LD + 0.25, LH + 2.2)
L.render.box(-LW - 0.15, LW + 0.15, -LD - 0.15, LD + 0.15, LH - 0.3, LH)
L.render.face([(-LW - 0.2, -LD - 0.2, LH), (LW + 0.2, -LD - 0.2, LH), (0.0, -LD - 0.2, LH + 1.3)])  # pediment
L.slate.face([(-LW - 0.3, -LD - 0.3, LH), (0.0, -LD - 0.3, LH + 1.35), (0.0, 0.0, LH + 1.35)])
L.slate.face([(0.0, -LD - 0.3, LH + 1.35), (LW + 0.3, -LD - 0.3, LH), (0.0, 0.0, LH + 1.35)])
L.render.box(-0.4, 0.4, 0.6, 1.4, LH + 1.2, LH + 3.2)  # tall rendered chimney
L.decal.on('door', 'y', -LD, -1, -0.6, 0.6, 0.0, 2.4)
for x in (-2.2, 2.2):
    L.decal.on('sash', 'y', -LD, -1, x - 0.55, x + 0.55, 0.9, 2.9)
for y in (-1.0, 1.0):
    L.decal.on('sash', 'x', LW, 1, y - 0.5, y + 0.5, 0.9, 2.8)
    L.decal.on('sash', 'x', -LW, -1, y - 0.5, y + 0.5, 0.9, 2.8)
nodes.append(L)

# ============ North Circular Road gate: white openwork cast-iron pier with a lantern, and its screen (+X) ============
R = Node('ncrgate')
for x0, w, h in ((0.0, 0.34, 3.4), (6.2, 0.26, 2.8)):
    for (a, b) in (((x0 - w, -w), (x0 + w, -w)), ((x0 + w, w), (x0 - w, w)), ((x0 - w, w), (x0 - w, -w)), ((x0 + w, -w), (x0 + w, w))):
        card(R.cut, 'ncr', a, b, 0.25, h, 1.0)
    R.white.box(x0 - w - 0.05, x0 + w + 0.05, -w - 0.05, w + 0.05, 0.0, 0.25)
    R.white.box(x0 - w - 0.06, x0 + w + 0.06, -w - 0.06, w + 0.06, h, h + 0.12)
    lathe(R.white, [(0.12, h + 0.12), (0.06, h + 0.4), (0.12, h + 0.5)], 6, cx=x0, cap=False)
    frustum(R.lantern, 0.13, 0.13, 0.19, 0.19, h + 0.5, h + 0.95, cx=x0)
    frustum(R.white, 0.22, 0.22, 0.02, 0.02, h + 0.95, h + 1.25, cx=x0, cap=True)
card(R.cut, 'ncr', (0.34, 0.0), (5.94, 0.0), 0.2, 2.2, 3.0)
R.white.box(0.34, 5.94, -0.04, 0.04, 2.2, 2.3)
R.white.box(0.34, 5.94, -0.08, 0.08, 0.0, 0.2)
nodes.append(R)

# ============ Áras an Uachtaráin gates: granite piers with urns, white gates, two lodges, white lamps ============
A = Node('arasgate')
for s in (-1, 1):
    x = s * 4.4
    A.granite.box(x - 0.5, x + 0.5, -0.5, 0.5, 0.0, 3.1)
    A.granite.box(x - 0.6, x + 0.6, -0.6, 0.6, 3.1, 3.35)
    lathe(A.granite, [(0.18, 3.35), (0.32, 3.55), (0.36, 3.85), (0.2, 4.1), (0.26, 4.2), (0.0, 4.35)], 10, cx=x, cap=False)  # urn
    # the white double gates (closed), and white railings out to the lodges
    card(A.cut, 'aras', (x - s * 0.5, 0.0), (0.0, 0.0), 0.05, 2.6, 2.0)
    card(A.cut, 'ncr', (x + s * 0.5, 0.0), (x + s * 7.0, 0.0), 0.05, 1.4, 3.0)
    # a granite lodge with a pyramidal slate roof and chimney, set back behind the railings
    lx, ly = s * 10.2, -2.0
    A.granite.box(lx - 2.1, lx + 2.1, ly - 2.1, ly + 2.1, 0.0, 3.0, top=False)
    A.slate.pyramid(lx, ly, 3.0, 2.4, 2.4, 5.0)
    A.granite.box(lx - 0.3, lx + 0.3, ly - 0.3, ly + 0.3, 4.2, 5.6)
    A.decal.on('sash', 'y', ly + 2.1, 1, lx - 0.5, lx + 0.5, 0.8, 2.5)
    A.decal.on('door', 'x', lx - s * 2.1, -s, ly - 0.55, ly + 0.55, 0.0, 2.3)
    # white lamp standards in front of the piers
    lp = (s * 5.6, 1.2)
    lathe(A.white, [(0.16, 0.0), (0.12, 0.6), (0.06, 0.7), (0.05, 3.2), (0.1, 3.3)], 6, cx=lp[0], cy=lp[1], cap=False)
    frustum(A.lantern, 0.14, 0.14, 0.2, 0.2, 3.3, 3.8, cx=lp[0], cy=lp[1])
    frustum(A.white, 0.23, 0.23, 0.02, 0.02, 3.8, 4.1, cx=lp[0], cy=lp[1], cap=True)
nodes.append(A)

# ---- build, bake, export
all_objs, roots = [], []
for i, n in enumerate(nodes):
    root, objs = n.build(i * 90.0)
    roots.append(root); all_objs += objs
bpy.context.view_layer.update()
kit.bake_ao_vertex(all_objs)
for n, root in zip(nodes, roots):
    print('TRIANGLES', n.name, kit.tris([o for o in all_objs if o.parent == root]))
print('TRIANGLES total', kit.tris(all_objs))
kit.export(os.path.join(OUT, 'phoenixpark.glb'), os.path.join(SRC, 'phoenixpark.blend'))
print('DONE')

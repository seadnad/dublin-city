"""Kildare Street and Merrion Street: Leinster House, the National Library and Museum, the Natural History Museum,
the National Gallery's Merrion Square front, Government Buildings and the Shelbourne Hotel. One hero, one node.

Run headless:  blender -b --factory-startup -P tools/blender/build_kildare.py -- public/models models

Sources: docs/research/kildare-street.md (OSM footprints in the Kildare Street frame, refs/kildare-street/).
Frame (game metres in plan, real metres in height): u runs south along Kildare Street from node KDK1, v east away
from its centreline; Blender X = v, Y = -u (the game turns the node by KD_ROT, src/world/kildare.js). The street's
footpath ends at v 9.5; St Stephen's Green North / Merrion Row run along u ~128 (their footpath from u 118); Merrion
Street Upper along v ~122 (its footpath from v ~113). Positions follow OSM (the Leinster group within a few metres);
Government Buildings is squeezed north-south to 0.7 and the Shelbourne moved ~30 m north to fit the game's
St Stephen's Green, which sits ~25 m north of the real one.

Materials (game keys after the prefix, src/world/heroes.js stoneMaterials): kd_portland and kd_pgranite (floodlit
at night), kd_ashlar (the Library and Museum's buff sandstone), kd_brick, kd_white (stucco), kd_slate, kd_lead,
kd_copper, kd_glass, kd_dark, kd_decal (windows, lit at night), kd_pcut (railings and balustrades), kd_plamp.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)
MAT = {k: kit.material('kd_' + k, c) for k, c in dict(
    portland=(0.72, 0.7, 0.66), pgranite=(0.45, 0.43, 0.4), ashlar=(0.55, 0.5, 0.42), brick=(0.4, 0.14, 0.08),
    white=(0.8, 0.78, 0.72), slate=(0.1, 0.11, 0.12), lead=(0.2, 0.21, 0.22), copper=(0.2, 0.4, 0.33),
    glass=(0.3, 0.35, 0.38), dark=(0.02, 0.02, 0.02), decal=(1, 1, 1), pcut=(1, 1, 1), plamp=(1, 0.85, 0.6)).items()}
P = {k: Part('kd_' + k, 3.0) for k in MAT if k not in ('decal', 'pcut')}
P['decal'] = Part('kd_decal'); P['pcut'] = Part('kd_cut_decal')

# parliament atlas (512; heroes.js PDECAL) for railings and balusters
PD = dict(balust=(256, 256, 256, 64), railing=(256, 320, 256, 64), ionic=(256, 0, 128, 64), corinth=(256, 64, 128, 128))
def pv(r, s, t):
    x, y, w, h = PD[r]
    return ((x + s * w) / 512, 1 - (y + t * h) / 512)


def W(u, v, z):
    return (v, -u, z)


def oq(part, pts, n, uvs=None):
    a, b, c = pts[0], pts[1], pts[2]
    cr = ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
          (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
    if cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0:
        pts = pts[::-1]; uvs = uvs[::-1] if uvs else None
    part.face(pts, uvs)


# face normals in Blender space for the four sides of a (u, v) box
NW_, NE_, NN_, NS_ = (-1, 0, 0), (1, 0, 0), (0, 1, 0), (0, -1, 0)   # west (v0), east (v1), north (u0), south (u1)


def box(part, u0, u1, v0, v1, z0, z1, faces='wensT'):
    if 'w' in faces: oq(part, [W(u0, v0, z0), W(u1, v0, z0), W(u1, v0, z1), W(u0, v0, z1)], NW_)
    if 'e' in faces: oq(part, [W(u0, v1, z0), W(u1, v1, z0), W(u1, v1, z1), W(u0, v1, z1)], NE_)
    if 'n' in faces: oq(part, [W(u0, v0, z0), W(u0, v1, z0), W(u0, v1, z1), W(u0, v0, z1)], NN_)
    if 's' in faces: oq(part, [W(u1, v0, z0), W(u1, v1, z0), W(u1, v1, z1), W(u1, v0, z1)], NS_)
    if 'T' in faces: oq(part, [W(u0, v0, z1), W(u1, v0, z1), W(u1, v1, z1), W(u0, v1, z1)], (0, 0, 1))


def hip(part, u0, u1, v0, v1, z0, z1):
    x0, x1, y0, y1 = v0, v1, -u1, -u0
    kit.hip(part, x0, x1, y0, y1, z0, z1)


def dv(r, s, t):
    return kit.dv(r, s, t)


def decal(face, c, s0, s1, z0, z1, region='sash', off=0.04):
    """A decal quad on a box side: face 'w'/'e' at v = c (s along u), 'n'/'s' at u = c (s along v)."""
    uv = [dv(region, 0, 1), dv(region, 1, 1), dv(region, 1, 0), dv(region, 0, 0)]
    if face == 'w':
        pts, n = [W(s1, c - off, z0), W(s0, c - off, z0), W(s0, c - off, z1), W(s1, c - off, z1)], NW_
    elif face == 'e':
        pts, n = [W(s0, c + off, z0), W(s1, c + off, z0), W(s1, c + off, z1), W(s0, c + off, z1)], NE_
    elif face == 'n':
        pts, n = [W(c - off, s0, z0), W(c - off, s1, z0), W(c - off, s1, z1), W(c - off, s0, z1)], NN_
    else:
        pts, n = [W(c + off, s1, z0), W(c + off, s0, z0), W(c + off, s0, z1), W(c + off, s1, z1)], NS_
    # decal UVs run left to right as seen from outside: fix the winding first, then the UVs follow the points
    P['decal'].face(pts if _faces(pts, n) else pts[::-1], uv)


def _faces(pts, n):
    a, b, c = pts[0], pts[1], pts[2]
    cr = ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
          (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
    return cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] > 0


def windows(face, c, s0, s1, n, rows, w=1.1, region='sash'):
    """n bays of windows evenly across s0..s1, one per row: rows = [(z0, z1), ...]."""
    step = (s1 - s0) / n
    for i in range(n):
        m = s0 + step * (i + 0.5)
        for z0, z1 in rows:
            decal(face, c, m - w / 2, m + w / 2, z0, z1, region)


def cornice(part, u0, u1, v0, v1, z, h=0.6, out=0.35):
    box(part, u0 - out, u1 + out, v0 - out, v1 + out, z, z + h, 'wensT')


def column(part, u, v, z0, h, r, seg=10):
    kit.lathe(part, v, -u, [(r * 1.25, z0), (r * 1.25, z0 + 0.35), (r, z0 + 0.4), (r * 0.88, z0 + h - 0.5), (r * 1.2, z0 + h - 0.3), (r * 1.3, z0 + h)], sides=seg, cap=True)


def balustrade(face, c, s0, s1, z, h=1.0):
    """Cut-out balusters on a face line (railings too, with region='railing')."""
    rail_strip(face, c, s0, s1, z, z + h, 'balust', 1.2)


def rail_strip(face, c, s0, s1, z0, z1, region, tile):
    part = P['pcut']
    L = s1 - s0
    n = max(1, round(L / tile))
    for i in range(n):
        a, b = s0 + L * i / n, s0 + L * (i + 1) / n
        uv = [pv(region, 0, 1), pv(region, 1, 1), pv(region, 1, 0), pv(region, 0, 0)]
        if face in 'we':
            pts = [W(a, c, z0), W(b, c, z0), W(b, c, z1), W(a, c, z1)]
        else:
            pts = [W(c, a, z0), W(c, b, z0), W(c, b, z1), W(c, a, z1)]
        part.face(pts, uv)


def pediment(part, face, c, s0, s1, z, rise, depth=1.0):
    """Triangular pediment on a face: a prism standing `depth` out of the wall."""
    m = (s0 + s1) / 2
    if face in 'we':
        sg = -1 if face == 'w' else 1
        a, b, t = W(s0, c + sg * depth, z), W(s1, c + sg * depth, z), W(m, c + sg * depth, z + rise)
        a2, b2, t2 = W(s0, c, z), W(s1, c, z), W(m, c, z + rise)
        oq(part, [a, b, t], NW_ if face == 'w' else NE_)
    else:
        sg = -1 if face == 'n' else 1
        a, b, t = W(c + sg * depth, s0, z), W(c + sg * depth, s1, z), W(c + sg * depth, m, z + rise)
        a2, b2, t2 = W(c, s0, z), W(c, s1, z), W(c, m, z + rise)
        oq(part, [a, b, t], NN_ if face == 'n' else NS_)
    oq(P['slate'], [a, t, t2, a2], (0, 0, 1)); oq(P['slate'], [t, b, b2, t2], (0, 0, 1))


def rotunda(part, u, v, facing, r, z0):
    """The Library / Museum entrance: a half-round two-tier drum facing the forecourt (facing = +1 south, -1 north):
    a podium, an open colonnade of paired columns to 8.5 m, the upper drum with oculi, a balustrade, a low lead dome."""
    a0, a1 = (-math.pi / 2, math.pi / 2) if facing > 0 else (math.pi / 2, 1.5 * math.pi)
    cx, cy = v, -u   # Blender centre; the half faces -Y (south, +u) when facing > 0
    if facing > 0:
        a0, a1 = math.pi, 2 * math.pi
    else:
        a0, a1 = 0.0, math.pi
    kit.lathe(part, cx, cy, [(r + 0.6, z0), (r + 0.6, z0 + 1.2)], sides=12, a0=a0, a1=a1, cap=True)
    kit.lathe(part, cx, cy, [(r - 1.2, z0 + 1.2), (r - 1.2, z0 + 8.4)], sides=12, a0=a0, a1=a1)   # the wall behind
    for k in range(9):
        a = a0 + (a1 - a0) * (k + 0.5) / 9
        column(P['portland'], -(cy + math.sin(a) * r), cx + math.cos(a) * r, z0 + 1.2, 7.2, 0.32, seg=8)
    kit.lathe(part, cx, cy, [(r + 0.3, z0 + 8.4), (r + 0.3, z0 + 9.4), (r - 0.8, z0 + 9.4), (r - 0.8, z0 + 14.5), (r - 0.4, z0 + 14.5), (r - 0.4, z0 + 15.1)],
              sides=12, a0=a0, a1=a1, cap=True)
    kit.lathe(P['lead'], cx, cy, [(r - 0.8, z0 + 15.1), (r * 0.6, z0 + 17.2), (0.01, z0 + 18.2)], sides=12, a0=a0, a1=a1)
    for k in range(5):  # oculi round the upper drum
        a = a0 + (a1 - a0) * (k + 0.5) / 5
        x, y = cx + math.cos(a) * (r - 0.75), cy + math.sin(a) * (r - 0.75)
        tx, ty = -math.sin(a), math.cos(a)
        q = [(x - tx * 0.6, y - ty * 0.6, z0 + 10.8), (x + tx * 0.6, y + ty * 0.6, z0 + 10.8), (x + tx * 0.6, y + ty * 0.6, z0 + 12.0), (x - tx * 0.6, y - ty * 0.6, z0 + 12.0)]
        n = (math.cos(a), math.sin(a), 0)
        P['decal'].face(q if _faces(q, n) else q[::-1], [dv('oculus', 0, 1), dv('oculus', 1, 1), dv('oculus', 1, 0), dv('oculus', 0, 0)])


# ================================================================ the Leinster group (Kildare Street)
V0 = 9.8          # the Kildare Street building line
UC = 39.4         # Leinster House's axis
def museum_block(u0, u1, towards):
    """The Library (towards = +1, the rotunda on its south side) or the Museum (-1): Deane & Deane, 1885-90, buff
    sandstone, two tall storeys with an attic, the end pavilion to Kildare Street pedimented."""
    a = P['ashlar']
    box(a, u0, u1, V0, 31, 0, 16.5)
    cornice(P['portland'], u0, u1, V0, 31, 16.5, 0.7, 0.3)
    hip(P['slate'], u0 - 0.2, u1 + 0.2, V0 - 0.2, 31.2, 17.2, 21.5)
    windows('w', V0, u0 + 1, u1 - 1, 5, [(1.6, 4.4), (7.4, 11.6), (13.2, 15.2)], region='round')
    windows('e', 31, u0 + 1, u1 - 1, 5, [(1.6, 4.4), (7.4, 11.6)])
    windows('n' if towards < 0 else 's', u0 if towards < 0 else u1, V0 + 3, 29, 6, [(1.6, 4.4), (7.4, 11.6)], region='round')
    windows('s' if towards < 0 else 'n', u1 if towards < 0 else u0, V0 + 1, 30, 7, [(1.6, 4.4), (7.4, 11.6)])
    # the pedimented street pavilion
    box(a, u0 + 3, u1 - 3, V0 - 0.6, V0, 0, 17.2, 'wnsT')
    pediment(P['portland'], 'w', V0 - 0.6, u0 + 3, u1 - 3, 17.2, 2.6, 0.8)
    for s in (u0 + 3.6, u1 - 3.6):
        column(P['portland'], s, V0 - 0.9, 6.2, 10.4, 0.35, seg=8)
    rotunda(a, u1 if towards > 0 else u0, 20.5, towards, 6.2, 0)


museum_block(6.0, 24.0, +1)    # the National Library
museum_block(54.8, 72.8, -1)   # the National Museum (Archaeology)

# Leinster House (Richard Cassels, 1745): 11 bays, three storeys, Ardbraccan limestone; the Kildare Street front's
# centre breaks forward under a pediment on four engaged Corinthian columns over the rusticated ground floor
g = P['pgranite']
LU0, LU1, LV0, LV1 = UC - 11.5, UC + 11.5, 43.0, 55.0
box(g, LU0, LU1, LV0, LV1, 0, 17.0)
cornice(P['pgranite'], LU0, LU1, LV0, LV1, 16.4, 0.7, 0.35)
hip(P['slate'], LU0 - 0.3, LU1 + 0.3, LV0 - 0.3, LV1 + 0.3, 17.1, 21.0)
for s in (LU0 + 4, LU1 - 4):
    box(g, s - 0.6, s + 0.6, LV0 + 3, LV0 + 4.2, 20, 23)         # chimney stacks
box(g, UC - 4.2, UC + 4.2, LV0 - 0.7, LV0, 0, 16.4, 'wnsT')        # the centre break
pediment(P['pgranite'], 'w', LV0 - 0.7, UC - 4.4, UC + 4.4, 16.4, 2.4, 0.9)
for k in range(4):
    column(P['pgranite'], UC - 3.3 + k * 2.2, LV0 - 0.95, 4.6, 11.8, 0.3, seg=8)
bay = 23.0 / 11
for i in range(11):
    m = LU0 + bay * (i + 0.5)
    decal('w', LV0 - (0.7 if abs(m - UC) < 4 else 0), m - 0.55, m + 0.55, 1.1, 3.4)
    decal('w', LV0 - (0.7 if abs(m - UC) < 4 else 0), m - 0.55, m + 0.55, 5.8, 9.0)
    decal('w', LV0 - (0.7 if abs(m - UC) < 4 else 0), m - 0.5, m + 0.5, 11.6, 13.4)
    decal('e', LV1, m - 0.55, m + 0.55, 1.1, 3.4); decal('e', LV1, m - 0.55, m + 0.55, 5.8, 9.0); decal('e', LV1, m - 0.5, m + 0.5, 11.6, 13.4)
decal('w', LV0 - 0.75, UC - 0.7, UC + 0.7, 0.4, 3.6, 'door')
balustrade('w', LV0 - 1.0, UC - 3.2, UC + 3.2, 4.6, 0.8)
box(g, UC - 5, UC + 5, LV0 - 3.2, LV0 - 0.7, 0, 0.6, 'wnsT')        # the steps
windows('n', LU0, LV0 + 1, LV1 - 1, 5, [(1.1, 3.4), (5.8, 9.0), (11.6, 13.4)])
windows('s', LU1, LV0 + 1, LV1 - 1, 5, [(1.1, 3.4), (5.8, 9.0), (11.6, 13.4)])
# the flagpole and the tricolour's staff on the roof
kit.lathe(P['white'], LV0 + 6, -UC, [(0.06, 21.0), (0.04, 27.5)], sides=5)
# the Seanad wing and the link south to the Natural History Museum; the modern north link to the Library
box(g, LU1, 70, 40, 60, 0, 14.0); hip(P['slate'], LU1, 70, 40, 60, 14.0, 16.5)
windows('w', 40, LU1 + 1, 53, 3, [(1.2, 3.6), (6.0, 9.2)]); windows('e', 60, LU1 + 1, 69, 6, [(1.2, 3.6), (6.0, 9.2)])
box(g, 20, LU0, 45, 54, 0, 12.0); hip(P['slate'], 20, LU0, 45, 54, 12.0, 14.0)
windows('w', 45, 20.5, LU0 - 0.5, 3, [(1.2, 3.6), (6.0, 9.2)])
# the forecourt: railings on granite plinths along Kildare Street with the gate piers, a raised terrace
rail_strip('w', V0, 24.0, 54.8, 0.45, 2.6, 'railing', 1.6)
box(P['pgranite'], 24.0, 54.8, V0 - 0.25, V0 + 0.25, 0, 0.45, 'wenT')
for s in (24.6, UC - 3.2, UC + 3.2, 54.2):
    box(P['pgranite'], s - 0.55, s + 0.55, V0 - 0.55, V0 + 0.55, 0, 3.6)
    box(P['pgranite'], s - 0.7, s + 0.7, V0 - 0.7, V0 + 0.7, 3.6, 3.9)
box(P['pgranite'], 27, 52, 32, 43, 0, 0.6, 'wnsT')

# ================================================================ Leinster Lawn and the Merrion Square fronts
# the cenotaph (1950, rebuilt 1950s): a granite obelisk on a stepped base, 18.3 m (OSM way 1483591051)
OU, OV = 41.3, 84.4
box(P['pgranite'], OU - 1.8, OU + 1.8, OV - 1.8, OV + 1.8, 0, 0.5); box(P['pgranite'], OU - 1.2, OU + 1.2, OV - 1.2, OV + 1.2, 0.5, 1.6)
kit.lathe(P['pgranite'], OV, -OU, [(0.95, 1.6), (0.6, 16.6), (0.01, 18.3)], sides=4, a0=math.pi / 4, a1=math.pi / 4 + math.tau, cap=False)

# the Natural History Museum (1856, Frederick Clarendon): two storeys of granite, a hipped roof, its end to the square
a = P['portland']
box(a, 63, 75, 64, 101, 0, 13.0); cornice(a, 63, 75, 64, 101, 12.4, 0.6, 0.3); hip(P['slate'], 63, 75, 64, 101, 13.0, 16.0)
windows('n', 63, 65, 100, 9, [(1.4, 4.4), (7.2, 10.6)], region='round')
windows('s', 75, 65, 100, 9, [(1.4, 4.4), (7.2, 10.6)])
windows('e', 101, 64, 74, 3, [(7.2, 10.6)], region='round')
decal('e', 101.05, 67.8, 70.2, 0.3, 4.6, 'door')
# the National Gallery: the Dargan wing mirrors the museum across the lawn, the Milltown wing behind it
box(a, 7, 21, 72, 118, 0, 13.0); cornice(a, 7, 21, 72, 118, 12.4, 0.6, 0.3); hip(P['slate'], 7, 21, 72, 118, 13.0, 16.0)
windows('s', 21, 74, 117, 10, [(1.4, 4.4), (7.2, 10.6)], region='round')
windows('e', 118, 8, 20, 3, [(7.2, 10.6)], region='round')
box(a, 12.2, 15.8, 118, 119.5, 0, 12.4, 'ensT'); pediment(a, 'e', 119.5, 12.0, 16.0, 12.4, 1.8, 0.6)
decal('e', 119.55, 12.9, 15.1, 0.3, 4.6, 'door')
for s in (12.5, 15.5):
    column(a, s, 119.9, 0.4, 11.4, 0.3, seg=8)
box(a, -12, 7, 70, 112, 0, 14.0); hip(P['slate'], -12, 7, 70, 112, 14.0, 17.0)
windows('e', 112, -11, 6, 5, [(7.4, 11.0)]); windows('n', -12, 71, 111, 10, [(1.4, 4.4), (7.4, 11.0)])

# ================================================================ Government Buildings (Aston Webb, 1904-22)
# Portland stone. Two wings run east to Merrion Street Upper either side of the courtyard, the central block with its
# pedimented centre, clock drum and lead dome closes the west side, and the street is screened by paired giant
# columns carrying an entablature and balustrade over the iron gates (refs 09-12).
p = P['portland']
GU0, GU1, GV0, GV1 = 77.5, 119.3, 64.0, 112.0
WING = 10.0
for u0, u1 in ((GU0, GU0 + WING), (GU1 - WING, GU1)):
    box(p, u0, u1, 76, GV1, 0, 17.5)
    cornice(p, u0, u1, 76, GV1, 17.5, 0.8, 0.35)
    box(P['lead'], u0 + 0.8, u1 - 0.8, 77, GV1 - 0.8, 18.3, 20.2)                  # attic storey behind the balustrade
    balustrade('e', GV1 + 0.35, u0, u1, 18.3, 1.1)
    windows('e', GV1, u0 + 0.8, u1 - 0.8, 3, [(1.6, 4.4), (6.4, 10.2), (12.2, 15.2)])
    windows('s' if u0 == GU0 else 'n', u1 if u0 == GU0 else u0, 77, GV1 - 1, 12, [(1.6, 4.4), (6.4, 10.2), (12.2, 15.2)])
    windows('n' if u0 == GU0 else 's', u0 if u0 == GU0 else u1, 77, GV1 - 1, 12, [(1.6, 4.4), (6.4, 10.2), (12.2, 15.2)])
    box(p, u0 - 0.3, u1 + 0.3, GV1 - 1.6, GV1 + 0.4, 0, 2.2, 'wensT')                 # rusticated base course
box(p, GU0, GU1, GV0, 78, 0, 19.0)
cornice(p, GU0, GU1, GV0, 78, 19.0, 0.8, 0.35)
hip(P['lead'], GU0, GU1, GV0, 78, 19.8, 22.0)
windows('e', 78, GU0 + WING + 0.8, GU1 - WING - 0.8, 8, [(1.6, 4.4), (6.4, 10.2), (12.6, 16.0)])
windows('w', GV0, GU0 + 1, GU1 - 1, 14, [(1.6, 4.4), (6.4, 10.2), (12.6, 16.0)])
GC = (GU0 + GU1) / 2
box(p, GC - 6, GC + 6, 78, 79.6, 0, 19.0, 'ensT')
pediment(p, 'e', 79.6, GC - 6.2, GC + 6.2, 19.0, 3.0, 0.9)
for k in range(4):
    column(p, GC - 4.5 + k * 3.0, 80.0, 4.2, 14.0, 0.45, seg=10)
decal('e', 80.2, GC - 1.2, GC + 1.2, 0.3, 4.2, 'door')
# the drum with its clock faces and the lead dome with a lantern
DV = 71.0
kit.lathe(p, DV, -GC, [(5.6, 21.5), (5.6, 22.5), (5.0, 22.5), (5.0, 28.0), (5.5, 28.0), (5.5, 28.8)], sides=16, cap=True)
kit.lathe(P['lead'], DV, -GC, [(5.2, 28.8), (4.6, 31.4), (3.2, 33.5), (1.4, 34.6), (0.9, 34.8)], sides=16, cap=True)
kit.lathe(p, DV, -GC, [(0.9, 34.8), (0.8, 37.0), (1.0, 37.2), (0.4, 37.8), (0.05, 38.8)], sides=8)
for a_ in range(4):
    a = a_ * math.pi / 2
    x, y = DV + math.cos(a) * 5.05, -GC + math.sin(a) * 5.05
    tx, ty = -math.sin(a), math.cos(a)
    region = 'clock' if a_ == 0 else 'oculus'
    q = [(x - tx * 1.0, y - ty * 1.0, 24.4), (x + tx * 1.0, y + ty * 1.0, 24.4), (x + tx * 1.0, y + ty * 1.0, 26.4), (x - tx * 1.0, y - ty * 1.0, 26.4)]
    n = (math.cos(a), math.sin(a), 0)
    P['decal'].face(q if _faces(q, n) else q[::-1], [dv(region, 0, 1), dv(region, 1, 1), dv(region, 1, 0), dv(region, 0, 0)])
# the courtyard and the Merrion Street screen
box(P['pgranite'], GU0 + WING, GU1 - WING, 78, GV1, 0, 0.12, 'T')
SV = GV1 + 0.6
cols = [GU0 + WING + 0.8, GC - 5.6, GC - 3.9, GC + 3.9, GC + 5.6, GU1 - WING - 0.8]
for s in cols:
    column(p, s, SV, 0.3, 9.6, 0.5, seg=10)
box(p, GU0 + WING, GU1 - WING, SV - 0.8, SV + 0.8, 9.9, 11.4, 'wensT')              # entablature
cornice(p, GU0 + WING, GU1 - WING, SV - 0.8, SV + 0.8, 11.4, 0.4, 0.2)
balustrade('e', SV + 0.3, GU0 + WING, GU1 - WING, 11.8, 1.0)
for s in (GC - 4.75, GC + 4.75):                                                   # the carved pedestals with urns
    box(p, s - 1.2, s + 1.2, SV - 0.7, SV + 0.7, 11.8, 13.4)
    kit.lathe(p, SV, -s, [(0.35, 13.4), (0.55, 13.9), (0.3, 14.6), (0.12, 15.1)], sides=8, cap=True)
rail_strip('e', SV, GU0 + WING + 1.3, GC - 6.1, 0.4, 2.8, 'railing', 1.5)
rail_strip('e', SV, GC - 3.4, GC + 3.4, 0.2, 4.6, 'railing', 1.7)
rail_strip('e', SV, GC + 6.1, GU1 - WING - 1.3, 0.4, 2.8, 'railing', 1.5)

# ================================================================ the Shelbourne (John McCurdy, 1867)
# red brick with cream stucco dressings, five storeys and a dormered mansard; the glazed iron canopy over the entrance
# on St Stephen's Green North with a balustraded balcony, the bronze torch-bearers either side (placed by the game)
SU0, SU1, SV0, SV1 = 100.0, 117.5, 9.8, 42.0
b, wh = P['brick'], P['white']
box(b, SU0, SU1, SV0, SV1, 0, 21.0)
box(wh, SU0 - 0.05, SU1 + 0.05, SV0 - 0.05, SV1 + 0.05, 0, 4.8, 'wensT')             # stucco ground floor
for z in (8.4, 12.2, 15.8):                                                           # string courses
    box(wh, SU0 - 0.12, SU1 + 0.12, SV0 - 0.12, SV1 + 0.12, z, z + 0.45, 'wens')
cornice(wh, SU0, SU1, SV0, SV1, 21.0, 0.7, 0.4)
box(P['slate'], SU0 + 0.3, SU1 - 0.3, SV0 + 0.3, SV1 - 0.3, 21.7, 24.2, 'wensT')
for k in range(9):                                                                    # dormers on the front
    s = SV0 + 1.8 + k * (SV1 - SV0 - 3.6) / 8
    box(wh, SU1 - 1.2, SU1 - 0.1, s - 0.8, s + 0.8, 21.7, 24.3, 'wensT')
    pediment(wh, 's', SU1 - 0.1, s - 0.9, s + 0.9, 24.3, 0.8, 0.2)
    decal('s', SU1 - 0.1, s - 0.45, s + 0.45, 22.1, 23.9)
rows = [(1.4, 4.2), (5.8, 8.2), (9.4, 11.8), (13.1, 15.4), (17.0, 19.4)]
windows('s', SU1 + 0.07, SV0 + 0.6, SV1 - 0.6, 13, rows, w=1.0, region='round')
windows('w', SV0 - 0.07, SU0 + 0.6, SU1 - 0.6, 7, rows, w=1.0)
windows('n', SU0, SV0 + 0.6, SV1 - 0.6, 11, rows[1:], w=0.9)
windows('e', SV1, SU0 + 0.6, SU1 - 0.6, 7, rows[1:], w=0.9)
# canopy: slim iron posts, a glass roof, the fascia; the balcony over it
CV0, CV1 = 18.0, 29.0
for s in (CV0, (CV0 + CV1) / 2, CV1):
    kit.lathe(P['dark'], s, -(SU1 + 3.0), [(0.08, 0), (0.08, 4.0)], sides=6)
box(P['dark'], SU1, SU1 + 3.2, CV0 - 0.2, CV1 + 0.2, 4.0, 4.7, 'wensT')
box(P['glass'], SU1 + 0.1, SU1 + 3.1, CV0, CV1, 4.7, 5.0, 'T')
box(wh, SU1, SU1 + 1.4, CV0 + 1.5, CV1 - 1.5, 5.4, 5.7, 'wensT')
balustrade('s', SU1 + 1.4, CV0 + 1.5, CV1 - 1.5, 5.7, 0.9)
decal('s', SU1 + 0.05, (CV0 + CV1) / 2 - 1.1, (CV0 + CV1) / 2 + 1.1, 0.2, 3.6, 'door')
# the area railings along the front
rail_strip('s', SU1 + 0.9, SV0 + 0.5, CV0 - 1.0, 0.0, 1.3, 'railing', 1.4)
rail_strip('s', SU1 + 0.9, CV1 + 1.0, SV1 - 0.5, 0.0, 1.3, 'railing', 1.4)
for s in (CV0 - 1.4, CV0 - 0.4, CV1 + 0.4, CV1 + 1.4):                                 # the statues' pedestals
    box(P['pgranite'], SU1 + 0.5, SU1 + 1.4, s - 0.45, s + 0.45, 0, 1.2)
for s in (CV0 + 1.0, CV1 - 1.0):                                                    # canopy lanterns
    box(P['plamp'], SU1 + 2.9, SU1 + 3.3, s - 0.2, s + 0.2, 3.3, 3.95)

objs = [P[k].build(MAT[k if k != 'decal' else 'decal']) for k in P if k not in ('decal', 'pcut')]
objs += [P['decal'].build(MAT['decal']), P['pcut'].build(MAT['pcut'])]
keep = [o for o in objs if len(o.data.polygons)]
for o in objs:
    if o not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
objs = keep
print('TRIANGLES before bake', kit.tris(objs))
kit.bake_ao_vertex(objs, nosub=('kd_plamp', 'kd_dark', 'kd_glass'), subdiv=4.0)
root = bpy.data.objects.new('kildare', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs))
kit.export(os.path.join(OUT, 'kildare.glb'), os.path.join(SRC, 'kildare.blend'))
print('DONE')

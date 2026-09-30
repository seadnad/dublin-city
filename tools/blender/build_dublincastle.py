"""Dublin Castle, the George's Street Arcade (South City Markets) and the Stag's Head mosaic.

Run headless:  blender -b --factory-startup -P tools/blender/build_dublincastle.py -- public/models models

Sources: docs/research/dublin-castle.md, docs/research/hotspots-green-templebar-dame.md 2.3, OSM (data/osm/
temple-bar-dame-audit.json: way 350242806 the Castle, 868152749 the Chapel Royal, 74600932 Dubh Linn Garden, 74600954
the Coach House, the Justice / Fortitude / Bedford Tower nodes), refs/dame-castle-audit/ (CC photos).

Built directly in GAME metres (the half-scale plan of src/world/geo.js, heights about 0.85 of real), so every wall can
be laid against the street graph (sites.js DUBLIN_CASTLE / ARCADE hold the same numbers):

  castle   origin at game (x, z) = (-380, 250), no rotation. Blender X = game x + 380, Blender Y = 250 - game z (north).
           The Upper Yard (cobbled, pedestrian) behind the Bedford Tower with its cupola between the Gate of Fortitude
           and the Gate of Justice (the statues are statue-kit figures placed by the game); the red-brick ranges round
           the yard; the State Apartments with their Portland centrepiece and pale garden front; the Record Tower (the
           round calp keep with its corbelled battlements), the Bermingham Tower; the Chapel Royal (Johnston's Gothic
           Revival in grey limestone: buttresses and crocketed pinnacles, traceried windows, carved heads, battlements);
           the Lower Yard and the Treasury by the Palace Street gate; Dubh Linn Garden (the round lawn with its
           serpent paths, which doubles as a helipad); the Chester Beatty's Clock Tower building and glass annex; the
           Coach House (a castellated toy fort); the precinct walls along Castle St, Ship St and Stephen St Upper.
  arcade   origin on George's Street's building line at mid-block; Blender X = east (into the block), Y = north.
           The 1881 red-brick and terracotta block: three storeys and a steep slate roof with gabled dormers, paired
           round-arched windows, the tall Gothic entrance bay with its traceried window, gable, double arch and two
           pinnacled octagonal turrets, corner turrets with spires, shopfronts with green awnings, the glazed market
           hall roof behind.
  mosaic   the Stag's Head mosaic in the Dame Street footpath (a 1.7 x 1.2 m panel; origin at its centre).

Materials (game keys after the prefix, src/world/heroes.js stoneMaterials): k* are floodlit after dark (kbrick,
kcalp, klime, kport, krender), cobble, lawn, gravel, abrick, aterra, agreen, slate, fcopper, glass, dark, decal.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part, Decals

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}


def mat(key, rgb):
    if key not in MATS:
        MATS[key] = kit.material('dc_' + key, rgb)
    return MATS[key]


# ---------------------------------------------------------------- game-frame helpers
OX, OZ = -380.0, 250.0


def P(x, z, h):
    """game (x, z) and height -> Blender point in the castle frame"""
    return (x - OX, OZ - z, h)


def gbox(part, x0, x1, z0, z1, h0, h1, faces='nsewt'):
    """An axis-aligned box in game coordinates; faces: n (game -z), s (+z), e (+x), w (-x), t, b."""
    if 'n' in faces: part.facen([P(x0, z0, h0), P(x1, z0, h0), P(x1, z0, h1), P(x0, z0, h1)], (0, 1, 0))
    if 's' in faces: part.facen([P(x0, z1, h0), P(x1, z1, h0), P(x1, z1, h1), P(x0, z1, h1)], (0, -1, 0))
    if 'e' in faces: part.facen([P(x1, z0, h0), P(x1, z1, h0), P(x1, z1, h1), P(x1, z0, h1)], (1, 0, 0))
    if 'w' in faces: part.facen([P(x0, z0, h0), P(x0, z1, h0), P(x0, z1, h1), P(x0, z0, h1)], (-1, 0, 0))
    if 't' in faces: part.facen([P(x0, z0, h1), P(x1, z0, h1), P(x1, z1, h1), P(x0, z1, h1)], (0, 0, 1))
    if 'b' in faces: part.facen([P(x0, z0, h0), P(x1, z0, h0), P(x1, z1, h0), P(x0, z1, h0)], (0, 0, -1))


def gdec(dec, region, face, c, a0, a1, h0, h1):
    """A decal on a game-axis wall: face 'n'/'s' (plane z = c, a0..a1 along x) or 'e'/'w' (plane x = c, a0..a1 along z)."""
    if face in 'ns':
        dec.on(region, 'y', OZ - c, 1 if face == 'n' else -1, a0 - OX, a1 - OX, h0, h1)
    else:
        dec.on(region, 'x', c - OX, 1 if face == 'e' else -1, OZ - a1, OZ - a0, h0, h1)


def ghip(part, x0, x1, z0, z1, h0, h1):
    kit.hip(part, x0 - OX, x1 - OX, OZ - z1, OZ - z0, h0, h1)


def gflat(part, pts, h, n=(0, 0, 1)):
    part.facen([P(x, z, h) for x, z in pts], n)


def gwall(part, cap, a, b, h, t=0.7, h0=0.0):
    """A free-standing wall from game point a to b, t thick, with a coping course (cap part)."""
    (ax, az), (bx, bz) = a, b
    L = math.hypot(bx - ax, bz - az)
    dx, dz = (bx - ax) / L, (bz - az) / L
    nx, nz = -dz * t / 2, dx * t / 2
    c = [(ax - nx, az - nz), (bx - nx, bz - nz), (bx + nx, bz + nz), (ax + nx, az + nz)]
    def side(p, q, h0_, h1_, prt):
        n = ((q[1] - p[1]), -(q[0] - p[0]))  # game-plan outward normal -> Blender: (nx, -nz)
        prt.facen([P(*p, h0_), P(*q, h0_), P(*q, h1_), P(*p, h1_)], (n[0], -n[1], 0))
    for p, q, prt in ((c[0], c[1], part), (c[2], c[3], part), (c[1], c[2], part), (c[3], c[0], part)):
        side(p, q, h0, h, prt)
    # coping, a little proud
    e = 0.12
    cc = [(ax - nx * (1 + 2 * e / t) - dx * e, az - nz * (1 + 2 * e / t) - dz * e), (bx - nx * (1 + 2 * e / t) + dx * e, bz - nz * (1 + 2 * e / t) + dz * e),
          (bx + nx * (1 + 2 * e / t) + dx * e, bz + nz * (1 + 2 * e / t) + dz * e), (ax + nx * (1 + 2 * e / t) - dx * e, az + nz * (1 + 2 * e / t) - dz * e)]
    for p, q in ((cc[0], cc[1]), (cc[1], cc[2]), (cc[2], cc[3]), (cc[3], cc[0])):
        side(p, q, h, h + 0.35, cap)
    cap.facen([P(*p, h + 0.35) for p in cc], (0, 0, 1))


def gcren(part, pts, zz, **kw):
    part.crenellate([(x - OX, OZ - z) for x, z in pts], zz, **kw)


def disc(part, cx, cz, r, h, segs=40):
    pts = [(cx + math.cos(a) * r, cz + math.sin(a) * r) for a in [k / segs * math.tau for k in range(segs)]]
    gflat(part, pts[::-1], h)


def ring(part, cx, cz, r0, r1, h, segs=48):
    for k in range(segs):
        a, b = k / segs * math.tau, (k + 1) / segs * math.tau
        q = [(cx + math.cos(a) * r0, cz + math.sin(a) * r0), (cx + math.cos(b) * r0, cz + math.sin(b) * r0),
             (cx + math.cos(b) * r1, cz + math.sin(b) * r1), (cx + math.cos(a) * r1, cz + math.sin(a) * r1)]
        part.facen([P(x, z, h) for x, z in q], (0, 0, 1))


def strip(part, pts, w, h):
    """A flat band of width w along a game-plan polyline (garden paths)."""
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, bz - az) or 1
        nx, nz = -(bz - az) / L * w / 2, (bx - ax) / L * w / 2
        part.facen([P(ax - nx, az - nz, h), P(bx - nx, bz - nz, h), P(bx + nx, bz + nz, h), P(ax + nx, az + nz, h)], (0, 0, 1))


def cylinder(part, cx, cz, r, h0, h1, sides=16, cap=False):
    part.prism(cx - OX, OZ - cz, r, h0, h1, sides, cap=cap)


# ---------------------------------------------------------------- the castle
brick, calp, lime, port, rend = Part('dc_brick', 3.0), Part('dc_calp', 3.0), Part('dc_lime', 2.5), Part('dc_port', 2.5), Part('dc_render', 3.0)
slate, copper, cob, lawn, grav = Part('dc_slate', 3.0), Part('dc_copper', 2.0), Part('dc_cobble', 2.0), Part('dc_lawn', 4.0), Part('dc_gravel', 3.0)
glass, dark, dec = Part('dc_glass', 3.0), Part('dc_dark', 3.0), Decals('dc_decal')
for p in (brick, calp, lime, port, rend, copper):
    p.flood = 1.0

G0 = 0.18  # ground surfaces sit just above the kerb (0.13)

# ---- ground: the Upper Yard's setts, the forecourt at the Cork Hill gate, the Lower Yard, the garden
YX0, YX1, YZ0, YZ1 = -421.0, -362.0, 221.0, 240.0          # the Upper Yard
gflat(cob, [(YX0, YZ1), (YX1, YZ1), (YX1, YZ0), (YX0, YZ0)], G0)
gflat(cob, [(-405.5, 214.0), (-395.0, 214.0), (-395.0, 201.5), (-405.5, 201.5)], G0)   # Cork Hill gate forecourt
gflat(cob, [(-421.0, 221.0), (-415.0, 221.0), (-415.0, 212.5), (-421.0, 212.5)], G0)   # through the Fortitude gate
gflat(grav, [(-367.0, 234.5), (-301.0, 234.5), (-301.0, 201.0), (-367.0, 201.0)], G0)  # Lower Yard
gflat(grav, [(-392.0, 312.0), (-322.0, 312.0), (-322.0, 252.5), (-392.0, 252.5)], G0)  # round the garden
# the yard's paving lines (the flag bands across the setts, ref dublin-castle-06)
for x in (-406.0, -392.0, -378.0):
    strip(port, [(x, YZ0 + 0.3), (x, YZ1 - 0.3)], 0.5, G0 + 0.01)
strip(port, [(YX0 + 0.3, 230.5), (YX1 - 0.3, 230.5)], 0.5, G0 + 0.01)

# ---- Dubh Linn Garden: the round lawn with the serpent paths cut in it, a ring path round it
GCX, GCZ, GR = -362.0, 278.0, 18.5
disc(lawn, GCX, GCZ, GR, G0 + 0.03, 56)
ring(grav, GCX, GCZ, GR, GR + 2.2, G0 + 0.02, 56)
ring(grav, GCX, GCZ, 7.5, 7.9, G0 + 0.05, 40)     # the inner circle (the helipad's touchdown ring)
# the serpents: four S-shaped paths interlacing across the lawn (the Celtic knot)
for k in range(4):
    a0 = k * math.pi / 2 + 0.35
    pts = []
    for i in range(25):
        t = i / 24
        a = a0 + t * 2.4
        r = GR - 0.4 - t * (GR - 3.5) + math.sin(t * math.pi * 2) * 2.2
        pts.append((GCX + math.cos(a) * r, GCZ + math.sin(a) * r))
    strip(grav, pts, 0.45, G0 + 0.05)
    pts = []
    for i in range(17):
        t = i / 16
        a = a0 + 1.4 - t * 1.9
        r = 8.5 + t * 8.0 + math.sin(t * math.pi) * 1.5
        pts.append((GCX + math.cos(a) * r, GCZ + math.sin(a) * r))
    strip(grav, pts, 0.45, G0 + 0.05)
# the garden's hedged borders and the terrace wall under the State Apartments
for (x0, x1, z0, z1) in ((-392.0, -330.0, 253.0, 254.3), (-392.0, -386.0, 256.0, 309.0), (-338.0, -331.0, 256.0, 297.0)):
    gbox(lawn, x0, x1, z0, z1, 0, 1.2, 'nsewt')


def sash_row(face, c, a0, a1, bay, floors, inset=1.2):
    """Georgian sash windows along a range face, floors = [(h0, h1), ...]."""
    n = max(1, int((a1 - a0 - 2 * inset) // bay) + 1)
    span = (n - 1) * bay
    s0 = (a0 + a1) / 2 - span / 2
    for i in range(n):
        u = s0 + i * bay
        for h0, h1 in floors:
            gdec(dec, 'sash', face, c, u - 0.6, u + 0.6, h0, h1)


FLOORS3 = [(1.4, 3.6), (5.1, 7.6), (8.8, 10.7)]


def range_(x0, x1, z0, z1, H, faces, wall=None, roof=True, bays=3.0, bands=True, winfaces=None):
    """A red-brick Georgian range: walls, a Portland string course and cornice, a hipped slate roof, sash windows."""
    wall = wall or brick
    gbox(wall, x0, x1, z0, z1, 0, H, faces)
    if bands:
        for h, t in ((4.3, 0.3), (H - 0.6, 0.6)):
            gbox(port, x0 - 0.12, x1 + 0.12, z0 - 0.12, z1 + 0.12, h, h + t, ''.join(f for f in faces if f in 'nsew') + 'b' * 0 + ('t' if h > H - 1 else ''))
    if roof:
        ghip(slate, x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2, H, H + min(3.2, 0.3 * min(x1 - x0, z1 - z0) + 1.0))
    for f in (winfaces if winfaces is not None else faces):
        if f == 'n': sash_row('n', z0, x0, x1, bays, FLOORS3)
        if f == 's': sash_row('s', z1, x0, x1, bays, FLOORS3)
        if f == 'e': sash_row('e', x1, z0, z1, bays, FLOORS3)
        if f == 'w': sash_row('w', x0, z0, z1, bays, FLOORS3)


# ---- the ranges round the Upper Yard
range_(-436.0, -421.0, 216.0, 240.0, 12.5, 'nsew', winfaces='enw')                       # west range
range_(-397.0, -362.0, 217.4, 221.0, 12.0, 'sew', winfaces='s')                           # north range behind City Hall
range_(-362.0, -354.0, 217.4, 240.0, 12.5, 'nsew', winfaces='we')                         # east range
# the State Apartments: the long south range, brick to the yard, a pale rendered garden front
SAZ0, SAZ1, SAH = 240.0, 252.0, 13.5
gbox(brick, -436.0, -354.0, SAZ0, SAZ1, 0, SAH, 'new')
gbox(rend, -436.0, -354.0, SAZ0, SAZ1, 0, SAH, 's')
for h, t in ((4.4, 0.3), (SAH - 0.6, 0.6)):
    gbox(port, -436.1, -353.9, SAZ0 - 0.12, SAZ1 + 0.12, h, h + t, 'nsewt' if t > 0.5 else 'nsew')
ghip(slate, -436.3, -353.7, SAZ0 - 0.2, SAZ1 + 0.2, SAH, SAH + 3.4)
sash_row('n', SAZ0, -436.0, -398.0, 3.0, [(1.4, 3.6), (5.4, 8.2), (9.4, 11.6)])
sash_row('n', SAZ0, -382.0, -354.0, 3.0, [(5.4, 8.2), (9.4, 11.6)])
sash_row('s', SAZ1, -436.0, -354.0, 3.2, [(1.6, 3.9), (5.4, 8.4), (9.4, 11.8)])
# ...the Portland centrepiece (three arches, pilasters, a pediment) on the yard front
CX0, CX1 = -397.5, -382.5
gbox(port, CX0, CX1, SAZ0 - 0.6, SAZ0, 0, SAH + 0.4, 'nsewt')
for i, x in enumerate((-394.5, -390.0, -385.5)):
    gdec(dec, 'arcade', 'n', SAZ0 - 0.6, x - 1.9, x + 1.9, 0, 4.4)
    gdec(dec, 'sash', 'n', SAZ0 - 0.6, x - 0.65, x + 0.65, 5.4, 8.4)
    gdec(dec, 'sash', 'n', SAZ0 - 0.6, x - 0.6, x + 0.6, 9.4, 11.6)
for x in (CX0 + 0.4, -392.2, -387.8, CX1 - 0.4):
    gbox(port, x - 0.35, x + 0.35, SAZ0 - 1.0, SAZ0 - 0.6, 4.6, SAH - 0.4, 'nsew')
pz = SAZ0 - 0.8
port.facen([P(CX0 - 0.3, pz, SAH + 0.4), P(CX1 + 0.3, pz, SAH + 0.4), P((CX0 + CX1) / 2, pz, SAH + 3.0)], (0, 1, 0))
slate.facen([P(CX0 - 0.3, pz, SAH + 0.4), P((CX0 + CX1) / 2, pz, SAH + 3.0), P((CX0 + CX1) / 2, SAZ0 + 3, SAH + 3.0), P(CX0 - 0.3, SAZ0 + 3, SAH + 0.4)], (-1, 1, 3))
slate.facen([P(CX1 + 0.3, pz, SAH + 0.4), P(CX1 + 0.3, SAZ0 + 3, SAH + 0.4), P((CX0 + CX1) / 2, SAZ0 + 3, SAH + 3.0), P((CX0 + CX1) / 2, pz, SAH + 3.0)], (1, 1, 3))
# ...the Georgian colonnade along the yard front east of the centrepiece
for i in range(9):
    x = -380.0 + i * 2.9
    cylinder(port, x, SAZ0 - 1.6, 0.28, 0, 4.2, 10)
gbox(port, -381.0, -356.0, SAZ0 - 2.1, SAZ0, 4.2, 4.9, 'nsewt')
gbox(dark, -381.0, -356.0, SAZ0 - 0.02, SAZ0, 0.2, 4.0, 'n')   # the shade under the colonnade
for x in range(-380, -356, 3):
    gdec(dec, 'door', 'n', SAZ0 - 0.03, x + 0.9, x + 2.1, 0.2, 3.6)
# chimneys along the ridges
for x in (-430.0, -410.0, -372.0, -360.0):
    gbox(brick, x - 0.7, x + 0.7, 245.3, 246.7, SAH + 1.5, SAH + 5.2, 'nsewt')
for z in (224.0, 234.0):
    gbox(brick, -429.2, -427.8, z - 0.6, z + 0.6, 13.5, 16.5, 'nsewt')

# ---- the Bedford Tower block between the two gates (1761): rusticated arcade, Ionic portico, pediment, the tower
BX0, BX1, BZ0, BZ1, BH = -414.5, -403.5, 212.5, 222.0, 12.5
BXC = (BX0 + BX1) / 2
gbox(brick, BX0, BX1, BZ0, BZ1, 4.6, BH, 'nsew')
gbox(calp, BX0, BX1, BZ0, BZ1, 0, 4.6, 'nsew')
for f, c in (('n', BZ0), ('s', BZ1)):
    for x in (BXC - 3.3, BXC, BXC + 3.3):
        gdec(dec, 'arcade', f, c, x - 1.6, x + 1.6, 0, 4.4)
    for x in (BX0 + 1.3, BX1 - 1.3):
        gdec(dec, 'sash', f, c, x - 0.55, x + 0.55, 6.0, 9.2)
# the portico over the arcade on the yard side: four Ionic columns, entablature, pediment
for x in (BXC - 3.9, BXC - 1.3, BXC + 1.3, BXC + 3.9):
    cylinder(port, x, BZ1 + 1.0, 0.33, 4.6, 10.4, 12)
gbox(port, BX0 - 0.1, BX1 + 0.1, BZ0 - 0.2, BZ1 + 1.6, 4.3, 4.7, 'nsewt')
gbox(port, BX0 - 0.1, BX1 + 0.1, BZ0 - 0.2, BZ1 + 1.6, 10.4, BH, 'nsewt')
for zc, n in ((BZ1 + 1.6, -1), (BZ0 - 0.2, 1)):
    port.facen([P(BX0 - 0.1, zc, BH), P(BX1 + 0.1, zc, BH), P(BXC, zc, BH + 2.6)], (0, n, 0))
slate.facen([P(BX0 - 0.1, BZ1 + 1.6, BH), P(BXC, BZ1 + 1.6, BH + 2.6), P(BXC, BZ0 - 0.2, BH + 2.6), P(BX0 - 0.1, BZ0 - 0.2, BH)], (-1, 0, 2))
slate.facen([P(BX1 + 0.1, BZ0 - 0.2, BH), P(BXC, BZ0 - 0.2, BH + 2.6), P(BXC, BZ1 + 1.6, BH + 2.6), P(BX1 + 0.1, BZ1 + 1.6, BH)], (1, 0, 2))
# the tower: a Portland square stage, the octagonal clock stage with its columns, the open belfry, the copper cupola
TZ = (BZ0 + BZ1) / 2
gbox(port, BXC - 2.6, BXC + 2.6, TZ - 2.6, TZ + 2.6, BH + 1.0, BH + 5.2, 'nsewt')
for f in 'nsew':
    c = {'n': TZ - 2.6, 's': TZ + 2.6, 'e': BXC + 2.6, 'w': BXC - 2.6}[f]
    a = (BXC - 1.0, BXC + 1.0) if f in 'ns' else (TZ - 1.0, TZ + 1.0)
    gdec(dec, 'oculus', f, c, a[0], a[1], BH + 2.2, BH + 4.2)
bxc, byc = BXC - OX, OZ - TZ
lathe_prof = [(2.25, BH + 5.2), (2.25, BH + 9.2), (2.45, BH + 9.2), (2.45, BH + 9.8)]
kit.lathe(port, bxc, byc, lathe_prof, sides=8, a0=math.pi / 8, a1=math.pi / 8 + math.tau, cap=True)
for k in range(8):
    a = math.pi / 8 + k * math.pi / 4 + math.pi / 8
    port.prism(bxc + math.cos(a) * 2.4, byc + math.sin(a) * 2.4, 0.16, BH + 5.2, BH + 9.2, 6)
for f in 'nsew':  # the four clock faces
    c = {'n': TZ - 2.1, 's': TZ + 2.1, 'e': BXC + 2.1, 'w': BXC - 2.1}[f]
    a = (BXC - 0.9, BXC + 0.9) if f in 'ns' else (TZ - 0.9, TZ + 0.9)
    gdec(dec, 'clock', f, c + (0.05 if f in 'se' else -0.05), a[0], a[1], BH + 6.2, BH + 8.0)
kit.lathe(port, bxc, byc, [(1.85, BH + 9.8), (1.85, BH + 12.6), (2.05, BH + 12.6), (2.05, BH + 13.1)], sides=8, a0=math.pi / 8, a1=math.pi / 8 + math.tau, cap=True)
for k in range(8):
    a = math.pi / 8 + k * math.pi / 4 + math.pi / 8
    x, y = bxc + math.cos(a) * 1.86, byc + math.sin(a) * 1.86
    tx, ty = -math.sin(a), math.cos(a)
    dec.free('louvre', (x - tx * 0.55, y - ty * 0.55, BH + 10.1), (x + tx * 0.55, y + ty * 0.55, BH + 10.1),
             (x + tx * 0.55, y + ty * 0.55, BH + 12.4), (x - tx * 0.55, y - ty * 0.55, BH + 12.4))
dome = [(2.0, BH + 13.1)] + [(2.0 * math.cos(t * math.pi / 2), BH + 13.1 + 3.3 * math.sin(t * math.pi / 2)) for t in (0.2, 0.4, 0.6, 0.8)] + [(0.45, BH + 16.3)]
kit.lathe(copper, bxc, byc, dome, sides=12)
kit.lathe(copper, bxc, byc, [(0.45, BH + 16.3), (0.45, BH + 17.4), (0.6, BH + 17.4), (0.0, BH + 18.4)], sides=8)
copper.prism(bxc, byc, 0.06, BH + 18.2, BH + 19.4, 4)

# ---- the two gates: rusticated piers, a round arch, an entablature, the statue plinth (figures placed by the game)
def gate(x0, x1, z0, z1):
    xc = (x0 + x1) / 2
    ow, oh = 3.3, 5.6
    # piers either side of the passage
    gbox(calp, x0, xc - ow / 2, z0, z1, 0, 7.4, 'nsewt' if False else 'nsew')
    gbox(calp, xc + ow / 2, x1, z0, z1, 0, 7.4, 'nsew')
    # the arch over the passage: a soffit and the spandrel faces
    head = kit.arc_pts(xc, oh - ow / 2, ow / 2, 8)
    for zc, nrm in ((z0, (0, 1, 0)), (z1, (0, -1, 0))):
        for (a, za), (b, zb) in zip(head, head[1:]):
            calp.facen([P(a, zc, za), P(b, zc, zb), P(b, zc, 7.4), P(a, zc, 7.4)], nrm)
    for (a, za), (b, zb) in zip(head, head[1:]):
        calp.facen([P(a, z0, za), P(b, z0, zb), P(b, z1, zb), P(a, z1, za)], (0, 0, -1))
    for xx in (xc - ow / 2, xc + ow / 2):
        calp.facen([P(xx, z0, 0), P(xx, z1, 0), P(xx, z1, oh - ow / 2), P(xx, z0, oh - ow / 2)], (1 if xx < xc else -1, 0, 0))
    # Doric pilasters, the entablature and a small pediment on each face
    for zc, s in ((z0, -1), (z1, 1)):
        for x in (x0 + 0.45, x1 - 0.45):
            gbox(port, x - 0.35, x + 0.35, min(zc, zc + s * 0.35), max(zc, zc + s * 0.35), 0.3, 7.0, 'nsew'.replace('n' if s > 0 else 's', ''))
    gbox(port, x0 - 0.15, x1 + 0.15, z0 - 0.45, z1 + 0.45, 7.4, 8.3, 'nsewt')
    gbox(port, xc - 1.0, xc + 1.0, (z0 + z1) / 2 - 1.0, (z0 + z1) / 2 + 1.0, 8.3, 9.1, 'nsewt')
    # the bollards that keep cars out of the pedestrian yard
    for k in range(3):
        dark.prism(xc - 1.1 + k * 1.1 - OX, OZ - (z0 + 0.6), 0.14, 0, 0.95, 6, cap=True)


gate(-421.0, -414.5, 213.0, 221.0)   # the Gate of Fortitude (to Castle Street)
gate(-403.5, -397.0, 213.0, 221.0)   # the Gate of Justice (to Cork Hill)
# the brick screen walls that close the forecourt either side of the gates, and the railings on Castle Street
gbox(brick, -397.0, -393.4, 213.6, 221.0, 0, 6.0, 'nsewt')
gwall(calp, port, (-421.0, 213.4), (-426.0, 216.0), 4.0)

# ---- the Record Tower: the 13th-century round keep of calp, corbelled battlements, a few pointed windows
RCX, RCZ, RR, RH = -352.0, 244.5, 5.8, 19.5
cylinder(calp, RCX, RCZ, RR, 0, RH, 20)
kit.lathe(calp, RCX - OX, OZ - RCZ, [(RR, RH), (RR + 0.55, RH + 1.0), (RR + 0.55, RH + 1.1)], sides=20)
cylinder(calp, RCX, RCZ, RR + 0.55, RH + 1.1, RH + 1.9, 20)
calp.facen([P(RCX + math.cos(k / 20 * math.tau) * (RR + 0.2), RCZ - math.sin(k / 20 * math.tau) * (RR + 0.2), RH + 1.2) for k in range(20)], (0, 0, 1))
rp = [(RCX + math.cos(k / 20 * math.tau) * (RR + 0.35), RCZ + math.sin(k / 20 * math.tau) * (RR + 0.35)) for k in range(21)]
gcren(calp, rp, RH + 1.9, h=0.8, t=0.45, merlon=0.9, gap=0.7)
for k, (a, h) in enumerate(((math.pi * 0.9, 13.5), (math.pi * 0.55, 13.5), (math.pi * 0.2, 9.0), (math.pi * 1.25, 5.0), (math.pi * 0.5, 4.5))):
    x, z = RCX + math.cos(a) * (RR + 0.04), RCZ + math.sin(a) * (RR + 0.04)
    tx, tz = -math.sin(a), math.cos(a)
    w = 0.9 if h > 10 else 0.5
    dec.free('sash' if h > 10 else 'lancet', P(x - tx * w, z - tz * w, h), P(x + tx * w, z + tz * w, h), P(x + tx * w, z + tz * w, h + 2.0), P(x - tx * w, z - tz * w, h + 2.0))
# ...and the Bermingham Tower at the yard's SW corner (rebuilt 1777, crenellated)
cylinder(calp, -437.5, 249.0, 3.9, 0, 15.0, 16)
cylinder(calp, -437.5, 249.0, 4.2, 15.0, 15.6, 16, cap=True)
gcren(calp, [(-437.5 + math.cos(k / 16 * math.tau) * 4.05, 249.0 + math.sin(k / 16 * math.tau) * 4.05) for k in range(17)], 15.6, h=0.7, t=0.35, merlon=0.8, gap=0.6)
for a in (math.pi * 0.8, math.pi * 1.15):
    x, z = -437.5 + math.cos(a) * 3.95, 249.0 + math.sin(a) * 3.95
    tx, tz = -math.sin(a), math.cos(a)
    dec.free('lancet', P(x - tx * 0.5, z - tz * 0.5, 9.5), P(x + tx * 0.5, z + tz * 0.5, 9.5), P(x + tx * 0.5, z + tz * 0.5, 12.2), P(x - tx * 0.5, z - tz * 0.5, 12.2))

# ---- the Chapel Royal (Francis Johnston, 1807-14): grey limestone Gothic, buttresses and pinnacles, battlements
CH0, CH1, CZ0, CZ1, CHH = -346.5, -322.0, 236.0, 245.0, 11.0
gbox(lime, CH0, CH1, CZ0, CZ1, 0, CHH, 'nset')
slate.facen([P(CH0, CZ0 + 0.3, CHH), P(CH1, CZ0 + 0.3, CHH), P(CH1, (CZ0 + CZ1) / 2, CHH + 2.0), P(CH0, (CZ0 + CZ1) / 2, CHH + 2.0)], (0, 1, 1))
slate.facen([P(CH1, CZ1 - 0.3, CHH), P(CH0, CZ1 - 0.3, CHH), P(CH0, (CZ0 + CZ1) / 2, CHH + 2.0), P(CH1, (CZ0 + CZ1) / 2, CHH + 2.0)], (0, -1, 1))
gbox(lime, CH0, CH1, CZ0 - 0.2, CZ1 + 0.2, CHH - 0.5, CHH, 'nse')
gcren(lime, [(CH0, CZ0 - 0.1), (CH1 + 0.1, CZ0 - 0.1), (CH1 + 0.1, CZ1 + 0.1), (CH0, CZ1 + 0.1)], CHH, h=0.8, t=0.4, merlon=0.7, gap=0.55)
bx = [CH0 + 1.2 + i * 3.4 for i in range(8)]
for f, zc, s in (('n', CZ0, -1), ('s', CZ1, 1)):
    for i, x in enumerate(bx):
        if x > CH1 - 0.4:
            continue
        z0, z1 = (zc - 0.8, zc) if s < 0 else (zc, zc + 0.8)
        gbox(lime, x - 0.4, x + 0.4, z0, z1, 0, CHH + 0.7, 'nsewt'.replace('s' if s < 0 else 'n', ''))
        # the crocketed pinnacle: a slim shaft and a spire
        lime.pyramid(x - OX, OZ - (zc + s * 0.4), CHH + 0.7, 0.32, 0.32, CHH + 3.4)
        if i < len(bx) - 1 and bx[i + 1] < CH1:
            xm = (x + bx[i + 1]) / 2
            gdec(dec, 'tracery', f, zc, xm - 1.0, xm + 1.0, 2.6, 9.6)
            # the carved heads at the ends of the hood moulds (Johnston's kings, saints and prelates)
            for hx in (xm - 1.15, xm + 1.15):
                gbox(port, hx - 0.18, hx + 0.18, min(zc, zc + s * 0.3), max(zc, zc + s * 0.3), 8.3, 8.7, 'nsewtb'.replace('s' if s < 0 else 'n', ''))
# the east end: the big traceried window between two octagonal turrets with pinnacles
gdec(dec, 'tracery', 'e', CH1, 238.0, 243.0, 2.5, 10.2)
gdec(dec, 'door', 'e', CH1, 239.6, 241.4, 0, 2.6)
for z in (CZ0 - 0.2, CZ1 + 0.2):
    cylinder(lime, CH1 - 0.2, z, 0.85, 0, CHH + 2.2, 8, cap=True)
    lime.pyramid(CH1 - 0.2 - OX, OZ - z, CHH + 2.2, 0.8, 0.8, CHH + 5.0, sides=8, rot=0)
# the north porch (the door to the Lower Yard) with its gable
gbox(lime, -336.0, -332.0, CZ0 - 2.2, CZ0, 0, 5.2, 'nsewt')
gdec(dec, 'door', 'n', CZ0 - 2.2, -335.0, -333.0, 0, 3.4)
lime.facen([P(-336.2, CZ0 - 2.2, 5.2), P(-331.8, CZ0 - 2.2, 5.2), P(-334.0, CZ0 - 2.2, 7.0)], (0, 1, 0))

# ---- the Lower Yard: the Treasury building (1717) by the Palace Street gate, the gate and the precinct walls
range_(-357.0, -327.0, 201.2, 209.0, 10.5, 'nsew', winfaces='ns', bays=3.2)
for x in (-327.0, -317.5):                         # the Palace Street gate piers
    gbox(port, x - 0.8, x + 0.8, 200.9, 202.5, 0, 4.4, 'nsewt')
    gbox(port, x - 1.0, x + 1.0, 200.7, 202.7, 4.4, 4.8, 'nsewtb')
for i in range(22):                                # the iron gates (shut)
    x = -326.0 + i * 0.36
    dark.prism(x - OX, OZ - 201.7, 0.035, 0, 3.4, 4)
gbox(dark, -326.1, -318.3, 201.62, 201.78, 3.2, 3.35, 'nsewt')
gbox(dark, -326.1, -318.3, 201.62, 201.78, 0.3, 0.42, 'nsewt')
gwall(brick, port, (-316.7, 201.7), (-301.0, 201.7), 3.6, 0.5)
gwall(brick, port, (-301.0, 201.7), (-301.0, 246.0), 3.6, 0.5)
gwall(brick, port, (-367.0, 201.5), (-357.0, 201.5), 3.6, 0.5)
gwall(brick, port, (-367.0, 201.5), (-367.0, 216.8), 3.6, 0.5)
# the Stamping Building (Revenue, rendered, four storeys) closing the Lower Yard's east side
gbox(rend, -318.0, -302.0, 205.0, 232.0, 0, 14.5, 'nsew')
gbox(slate, -318.2, -301.8, 204.8, 232.2, 14.5, 14.8, 't')
sash_row('w', -318.0, 205.0, 232.0, 3.0, [(1.4, 3.6), (4.8, 7.0), (8.2, 10.4), (11.4, 13.4)])
sash_row('n', 205.0, -318.0, -302.0, 3.0, [(4.8, 7.0), (8.2, 10.4), (11.4, 13.4)])
# the Garda / Printworks range along the precinct's east side, and the stable ranges behind
range_(-318.0, -302.0, 246.0, 300.0, 11.5, 'nsew', winfaces='w', bays=3.3)
range_(-330.0, -318.0, 236.0, 246.0, 9.5, 'nsew', winfaces='nw', bays=3.0)

# ---- the Chester Beatty: the Clock Tower building and the glass annex on the garden's west side
gbox(rend, -410.0, -394.0, 256.0, 276.0, 0, 11.5, 'nsew')
ghip(slate, -410.3, -393.7, 255.7, 276.3, 11.5, 14.2)
gbox(port, -410.1, -393.9, 255.9, 276.1, 11.0, 11.5, 'nsew')
sash_row('e', -394.0, 256.0, 276.0, 3.0, [(1.5, 3.7), (4.9, 7.3), (8.2, 10.2)])
sash_row('n', 256.0, -410.0, -394.0, 3.0, [(4.9, 7.3), (8.2, 10.2)])
gbox(rend, -403.8, -400.2, 254.5, 258.0, 11.5, 17.0, 'nsewt')
gdec(dec, 'clock', 'e', -400.2, 255.4, 257.2, 14.2, 16.0)
gdec(dec, 'clock', 'n', 254.5, -402.9, -401.1, 14.2, 16.0)
kit.lathe(copper, -402.0 - OX, OZ - 256.25, [(1.5, 17.0), (1.3, 18.0), (0.7, 19.2), (0.0, 20.2)], sides=8)
gbox(glass, -408.0, -394.0, 276.0, 290.0, 0, 9.0, 'nsewt')
for x in (-406.0, -402.5, -399.0, -395.5):
    gbox(rend, x - 0.2, x + 0.2, 275.8, 290.2, 0, 9.1, 'nsewt')
gbox(rend, -408.2, -393.8, 275.8, 290.2, 8.8, 9.4, 'nsewt')

# ---- the Coach House: a castellated Gothic toy fort (1830s), grey, battlements and corner turrets
gbox(rend, -372.0, -344.0, 299.0, 306.0, 0, 6.8, 'nsewt')
gcren(rend, [(-372.0, 299.0), (-344.0, 299.0), (-344.0, 306.0), (-372.0, 306.0), (-372.0, 299.0)], 6.8, h=0.7, t=0.4, merlon=0.7, gap=0.55)
for x, z in ((-372.0, 299.0), (-344.0, 299.0), (-372.0, 306.0), (-344.0, 306.0), (-358.0, 299.0)):
    cylinder(rend, x, z, 1.1, 0, 8.6, 8, cap=True)
    gcren(rend, [(x + math.cos(k / 8 * math.tau) * 1.0, z + math.sin(k / 8 * math.tau) * 1.0) for k in range(9)], 8.6, h=0.5, t=0.25, merlon=0.4, gap=0.35)
for x in (-368.0, -363.5, -352.5, -348.0):
    gdec(dec, 'lancet', 'n', 299.0, x - 0.6, x + 0.6, 2.0, 5.2)
gdec(dec, 'portal', 'n', 299.0, -359.6, -356.4, 0, 4.4)

# ---- the precinct walls: along Ship Street Great (the old castle wall), Stephen Street Upper, the west side
WALLS = [((-442.0, 221.5), (-442.0, 262.0)), ((-433.5, 265.5), (-369.5, 340.5)), ((-375.5, 338.5), (-329.5, 315.5)),
         ((-329.5, 315.5), (-318.5, 315.5)), ((-318.5, 315.5), (-318.5, 300.5)), ((-436.0, 216.4), (-442.0, 221.5))]
for a, b in WALLS:
    gwall(calp, port, a, b, 4.2)
# the Ship Street gate where the wall turns (piers and a round-headed arch, shut)
gbox(calp, -441.0, -436.5, 262.2, 265.4, 0, 6.0, 'nsewt')
gdec(dec, 'portal', 'w', -441.0, 262.6, 265.0, 0, 5.0)

castle_objs = [o for o in (brick.build(mat('kbrick', (0.35, 0.12, 0.08))), calp.build(mat('kcalp', (0.2, 0.2, 0.2))),
               lime.build(mat('klime', (0.35, 0.34, 0.32))), port.build(mat('kport', (0.7, 0.68, 0.64))),
               rend.build(mat('krender', (0.7, 0.68, 0.62))), slate.build(mat('slate', (0.08, 0.09, 0.1))),
               copper.build(mat('fcopper', (0.25, 0.4, 0.33))), cob.build(mat('cobble', (0.25, 0.24, 0.23))),
               lawn.build(mat('lawn', (0.12, 0.25, 0.06))), grav.build(mat('gravel', (0.45, 0.42, 0.38))),
               glass.build(mat('glass', (0.3, 0.35, 0.4))), dark.build(mat('dark', (0.01, 0.01, 0.01))),
               dec.build(mat('decal', (1, 1, 1))))]


# ---------------------------------------------------------------- the George's Street Arcade
# local frame: X east into the block (0 = the George's Street building line), Y north; the block is AD x 2*AH
AD, AH = 36.0, 16.75
ab, at, asl, ad, agl, agr, adk = Part('ar_brick', 3.0), Part('ar_terra', 2.0), Part('ar_slate', 3.0), Decals('ar_decal'), Part('ar_glass', 3.0), Part('ar_green', 2.0), Part('ar_dark', 2.0)
E1, E2, EH = 4.2, 8.2, 12.2        # floor lines and the eaves
FR = 11.0                          # the front range's depth


def abox(part, x0, x1, y0, y1, z0, z1, faces='nsewt'):
    """box in the arcade frame; faces n (+Y), s (-Y), e (+X), w (-X, the street), t, b"""
    if 'n' in faces: part.facen([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (0, 1, 0))
    if 's' in faces: part.facen([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0))
    if 'e' in faces: part.facen([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], (1, 0, 0))
    if 'w' in faces: part.facen([(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], (-1, 0, 0))
    if 't' in faces: part.facen([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1))
    if 'b' in faces: part.facen([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (0, 0, -1))


def spire_turret(cx, cy, r, z0, z1, top, sides=8):
    at.prism(cx, cy, r + 0.12, z0 - 0.5, z0, sides, cap=False)           # the corbel ring
    ab.prism(cx, cy, r, z0, z1, sides, cap=False)
    for zz in (E2, z1 - 0.4):
        if z0 < zz < z1:
            at.prism(cx, cy, r + 0.08, zz, zz + 0.3, sides, cap=False)
    at.prism(cx, cy, r + 0.15, z1, z1 + 0.35, sides, cap=True)
    asl.pyramid(cx, cy, z1 + 0.35, r + 0.1, r + 0.1, top, sides=sides, rot=math.pi / sides)
    at.pyramid(cx, cy, top - 0.1, 0.12, 0.12, top + 0.9)                    # the finial


# the ranges: front (George's St), north (Exchequer St), south (Fade St), back; the market hall roof between
abox(ab, 0, FR, -AH, AH, 0, EH, 'wsn')
abox(ab, FR, AD, AH - 5.0, AH, 0, EH, 'nes')
abox(ab, FR, AD, -AH, -AH + 5.0, 0, EH, 'nes')
abox(ab, AD - 5.5, AD, -AH + 5.0, AH - 5.0, 0, EH, 'ew')
abox(ab, FR, AD - 5.5, -AH + 5.0, AH - 5.0, 0, 8.5, 't')
# terracotta string courses and the cornice round the outside
for z, t, pr in ((E1 - 0.15, 0.35, 0.18), (E2 - 0.1, 0.3, 0.15), (EH - 0.5, 0.5, 0.3)):
    abox(at, -pr, AD + pr, -AH - pr, AH + pr, z, z + t, 'wnset')
# steep slate roofs: the front range (ridge along Y), the side ranges (ridges along X)
asl.gable_y(-0.4, FR + 0.4, -AH - 0.4, AH + 0.4, EH, EH + 5.2)
for y0, y1 in ((AH - 5.0, AH + 0.4), (-AH - 0.4, -AH + 5.0)):
    asl.gable_x(FR, AD + 0.4, y0, y1, EH, EH + 3.2)
asl.gable_y(AD - 5.5, AD + 0.4, -AH + 5.0, AH - 5.0, EH, EH + 3.0)
for y in (AH, -AH):
    ab.gable_end_y(y + (0.001 if y > 0 else -0.001), -0.4, FR + 0.4, EH, EH + 5.2, 1 if y > 0 else -1)
# the market hall's glazed roof on its iron trusses
agl.gable_x(FR, AD - 5.5, -AH + 5.0, AH - 5.0, 8.5, 13.0)
for x in range(int(FR) + 2, int(AD - 5.5), 3):
    abox(adk, x - 0.1, x + 0.1, -AH + 5.0, AH - 5.0, 8.4, 8.7, 'nsewt')

# windows: paired round-arched windows over the shops, all round
def windows_w(y0, y1, step=3.4, skip=()):
    y = y0 + step / 2
    while y < y1 - step / 2 + 0.01:
        if not any(a <= y <= b for a, b in skip):
            for z0, z1 in ((E1 + 0.9, E2 - 0.5), (E2 + 0.7, EH - 1.0)):
                ad.on('round', 'x', 0, -1, y - 0.75, y + 0.75, z0, z1)
        y += step


ENT0, ENT1 = -3.2, 7.2            # the entrance bay (Y)
windows_w(-AH + 0.6, ENT0 - 1.4)
windows_w(ENT1 + 1.4, AH - 0.6)
for s in (-1, 1):
    x = 2.0
    while x < AD - 1.5:
        for z0, z1 in ((E1 + 0.9, E2 - 0.5), (E2 + 0.7, EH - 1.0)):
            ad.on('round', 'y', s * AH, s, x - 0.75, x + 0.75, z0, z1)
        x += 3.4
    for x in range(3, int(AD) - 3, 6):
        ad.on('shop', 'y', s * AH, s, x - 2.3, x + 2.3, 0.2, 3.8)
# the shopfronts along George's Street between terracotta piers, green awnings over some
y = -AH + 0.4
k = 0
while y < AH - 4.0:
    if not (ENT0 - 1.6 < y + 2.3 < ENT1 + 1.6):
        ad.on('shop', 'x', 0, -1, y + 0.3, y + 4.3, 0.2, 3.8)
        if k % 3 != 1:
            agr.facen([(-0.02, y + 0.3, 3.55), (-0.02, y + 4.3, 3.55), (-1.4, y + 4.3, 2.75), (-1.4, y + 0.3, 2.75)], (-1, 0, 1))
            agr.facen([(-1.4, y + 0.3, 2.75), (-1.4, y + 4.3, 2.75), (-1.4, y + 4.3, 2.45), (-1.4, y + 0.3, 2.45)], (-1, 0, 0))
        k += 1
    abox(at, -0.25, 0, y - 0.25, y + 0.25, 0, E1, 'wnst')
    y += 4.6
# gabled dormers along the front roof, each with a pair of round windows and a finial
for yc in (-12.3, -8.0, 11.2):
    ab.facen([(0, yc - 1.7, EH), (0, yc + 1.7, EH), (0, yc + 1.7, EH + 2.4), (0, yc, EH + 4.1), (0, yc - 1.7, EH + 2.4)], (-1, 0, 0))
    ab.facen([(0, yc - 1.7, EH), (0, yc - 1.7, EH + 2.4), (2.4, yc - 1.7, EH + 2.4), (2.4, yc - 1.7, EH + 1.0)], (0, -1, 0))
    ab.facen([(0, yc + 1.7, EH), (2.4, yc + 1.7, EH + 1.0), (2.4, yc + 1.7, EH + 2.4), (0, yc + 1.7, EH + 2.4)], (0, 1, 0))
    asl.facen([(0, yc - 1.8, EH + 2.4), (0, yc, EH + 4.2), (3.4, yc, EH + 4.2), (3.4, yc - 1.8, EH + 2.4)], (0, -1, 1))
    asl.facen([(0, yc + 1.8, EH + 2.4), (3.4, yc + 1.8, EH + 2.4), (3.4, yc, EH + 4.2), (0, yc, EH + 4.2)], (0, 1, 1))
    ad.on('round', 'x', 0, -1, yc - 0.9, yc + 0.9, EH + 0.4, EH + 2.9)
    at.pyramid(-0.05, yc, EH + 4.0, 0.15, 0.15, EH + 5.1)
# the entrance bay: taller, projecting, the double arch, the traceried window, the gable with its rose
EX = -0.9
abox(ab, EX, 0, ENT0, ENT1, 0, 16.2, 'wns')
abox(at, EX - 0.3, 0, ENT0, ENT1, E1 - 0.15, E1 + 0.35, 'wnst')
abox(at, EX - 0.3, 0, ENT0, ENT1, 16.0, 16.5, 'wnst')
ad.on('gate', 'x', EX, -1, ENT0 + 0.8, ENT1 - 0.8, 0, 7.6)
ad.on('tracery', 'x', EX, -1, ENT0 + 2.2, ENT1 - 2.2, 8.4, 15.4)
ab.facen([(EX, ENT0, 16.5), (EX, ENT1, 16.5), (EX, (ENT0 + ENT1) / 2, 21.4)], (-1, 0, 0))
ad.on('rose', 'x', EX, -1, (ENT0 + ENT1) / 2 - 1.1, (ENT0 + ENT1) / 2 + 1.1, 17.2, 19.4)
asl.facen([(EX - 0.2, ENT0 - 0.2, 16.5), (EX - 0.2, (ENT0 + ENT1) / 2, 21.6), (FR / 2, (ENT0 + ENT1) / 2, 21.6), (FR / 2, ENT0 - 0.2, 16.5)], (0, -1, 1))
asl.facen([(EX - 0.2, ENT1 + 0.2, 16.5), (FR / 2, ENT1 + 0.2, 16.5), (FR / 2, (ENT0 + ENT1) / 2, 21.6), (EX - 0.2, (ENT0 + ENT1) / 2, 21.6)], (0, 1, 1))
# (gable coping) terracotta edge along the rakes
for s in (-1, 1):
    y0, y1 = (ENT0 if s < 0 else ENT1), (ENT0 + ENT1) / 2
    at.facen([(EX - 0.35, y0, 16.5), (EX - 0.35, y1, 21.4), (EX - 0.35, y1, 21.9), (EX - 0.35, y0, 17.0)], (-1, 0, 0))
at.pyramid(EX - 0.1, (ENT0 + ENT1) / 2, 21.4, 0.25, 0.25, 23.2)
for yc in (ENT0 - 0.3, ENT1 + 0.3):                  # the pinnacled octagonal turrets either side
    spire_turret(EX - 0.3, yc, 1.25, E1 + 0.5, 17.8, 23.8)
    ab.prism(EX - 0.3, yc, 1.25, 0, E1 + 0.5, 8, cap=False)
# corner turrets on the Exchequer St and Fade St corners
for yc in (AH - 0.6, -AH + 0.6):
    spire_turret(0.6, yc, 1.7, E1 + 0.2, EH + 2.6, EH + 8.8)
# tall brick chimney stacks on the ridges
for yc in (-12.0, -1.0, 12.5):
    abox(ab, FR / 2 - 0.7, FR / 2 + 0.7, yc - 1.2, yc + 1.2, EH + 3.0, EH + 7.4, 'nsewt')
    abox(at, FR / 2 - 0.85, FR / 2 + 0.85, yc - 1.35, yc + 1.35, EH + 7.0, EH + 7.4, 'nsewtb')
for x in (22.0, 34.0):
    for yc in (AH - 2.5, -AH + 2.5):
        abox(ab, x - 0.6, x + 0.6, yc - 0.6, yc + 0.6, EH + 1.5, EH + 5.0, 'nsewt')
# lanterns on brackets either side of the entrance
for yc in (ENT0 + 0.3, ENT1 - 0.3):
    abox(adk, EX - 1.0, EX, yc - 0.05, yc + 0.05, 5.6, 5.7, 'nsewt')
    abox(agl, EX - 1.25, EX - 0.75, yc - 0.25, yc + 0.25, 4.9, 5.6, 'nsewt')

arcade_objs = [ab.build(mat('abrick', (0.45, 0.16, 0.08))), at.build(mat('aterra', (0.6, 0.35, 0.22))), asl.build(mat('slate', (0.08, 0.09, 0.1))),
               agl.build(mat('glass', (0.3, 0.35, 0.4))), agr.build(mat('agreen', (0.05, 0.25, 0.1))), adk.build(mat('dark', (0.01, 0.01, 0.01))),
               ad.build(mat('decal', (1, 1, 1)))]

# ---------------------------------------------------------------- the Stag's Head mosaic in the Dame Street footpath
mz = Decals('mo_decal')
mz.free('mosaic', (-0.85, -0.6, 0.14), (0.85, -0.6, 0.14), (0.85, 0.6, 0.14), (-0.85, 0.6, 0.14))
mosaic_objs = [mz.build(mat('mosaic', (1, 1, 1)))]

print('TRIANGLES before bake', kit.tris(castle_objs), kit.tris(arcade_objs))
kit.bake_ao_vertex(castle_objs + arcade_objs, cell=4.0, skip=(), nosub=('dc_copper', 'dc_lawn', 'dc_gravel', 'dc_cobble'))


def group(name, objs):
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for o in objs:
        o.parent = root
    return root


group('castle', castle_objs); group('arcade', arcade_objs); group('mosaic', mosaic_objs)
print('TRIANGLES', kit.tris(castle_objs), kit.tris(arcade_objs))
kit.export(os.path.join(OUT, 'dublincastle.glb'), os.path.join(SRC, 'dublincastle.blend'))
print('DONE')

"""The Loopline Bridge (1889-91, John Chaloner Smith for the City of Dublin Junction Railway; docs/research/railway.md):
wrought-iron lattice through-girders on a double row of piers, five spans over George's Quay, the Liffey and Custom
House Quay, and the lattice span over Beresford Place north of it. The river piers are pairs of cast-iron cylinders,
banded black and gold with a shield on the upper drum, rising through the girders (refs 01, 03, 04), each pair joined
under the deck by an arched cross-frame.

Run headless:  blender -b --factory-startup -P tools/blender/build_loopline.py -- public/models models
First:         node tools/railway-layout.mjs   (writes models/railway-layout.json from src/world/railline.js)

Built in world (game) metres along the line's samples: Blender X = game x, Y = -game z, Z up. The floor under the
ballast, the track and the columns on Beresford Place are the game's own (src/world/railway.js); this is the ironwork.
Exported as one root `loopline`; the game batches it by map block.

Materials (set up in src/world/railway.js placeLoopline):
  ll_iron   the lattice and chords (grey-green paint)     ll_atlas  pier drums (bands, shields) and swatches (u, v into an atlas)
  ll_dark   the cross-frames and the pier bases            ll_stone  (unused: kept for the piers' footings)
"""
import bpy, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import Part

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'public/models')
SRC = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'models')
os.makedirs(OUT, exist_ok=True); os.makedirs(SRC, exist_ok=True)
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
L = json.load(open(os.path.join(ROOT, 'models', 'railway-layout.json'), encoding='utf-8'))
SAMP = L['samples']   # [s, x, z, deck, half, track]
WATER = -2.6          # src/world/ground.js WATER_Y

bpy.ops.wm.read_factory_settings(use_empty=True)


def at(s):
    """Point, direction and left normal (game x, z) and deck, half at chainage s (linear between 1 m samples)."""
    i = max(0, min(len(SAMP) - 2, int(s)))
    a, b = SAMP[i], SAMP[i + 1]
    t = (s - a[0]) / ((b[0] - a[0]) or 1)
    x, z = a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
    dx, dz = b[1] - a[1], b[2] - a[2]
    ll = math.hypot(dx, dz) or 1
    dx, dz = dx / ll, dz / ll
    return dict(x=x, z=z, dx=dx, dz=dz, nx=dz, nz=-dx, deck=a[3] + (b[3] - a[3]) * t, half=a[4] + (b[4] - a[4]) * t)


def P(s, q, y):
    """Blender point at chainage s, offset q across (left +), height y."""
    f = at(s)
    return (f['x'] + f['nx'] * q, -(f['z'] + f['nz'] * q), y)


def dirB(s, ds, dq, dy):
    f = at(s)
    return (f['dx'] * ds + f['nx'] * dq, -(f['dz'] * ds + f['nz'] * dq), dy)


iron, atlas, dark = Part('ll_iron', tile=4.0), Part('ll_atlas'), Part('ll_dark', tile=4.0)
# atlas (1024 x 256, flipY false: v = y / 256 from the top): the drum band 0..512 wide, swatches from 512
def auv(u_px, v_px):
    return (u_px / 1024, v_px / 256)


def bar(part, s0, s1, q, y0, y1, w, t):
    """A flat bar in the girder's plane from (s0, y0) to (s1, y1), w wide (in the plane), t thick (across)."""
    ds, dy = s1 - s0, y1 - y0
    ll = math.hypot(ds, dy) or 1
    # the bar's width direction in the (s, y) plane
    ws, wy = -dy / ll * w / 2, ds / ll * w / 2
    c = [(s0 + ws, y0 + wy), (s1 + ws, y1 + wy), (s1 - ws, y1 - wy), (s0 - ws, y0 - wy)]
    for side in (-1, 1):
        qq = q + side * t / 2
        pts = [P(s, qq, y) for s, y in c]
        part.facen(pts, dirB((s0 + s1) / 2, 0, side, 0))
    # the edges (the bar's thickness), so it reads edge-on
    for i in range(4):
        (sa, ya), (sb, yb) = c[i], c[(i + 1) % 4]
        pts = [P(sa, q - t / 2, ya), P(sb, q - t / 2, yb), P(sb, q + t / 2, yb), P(sa, q + t / 2, ya)]
        ms, my = (sa + sb) / 2 - (s0 + s1) / 2, (ya + yb) / 2 - (y0 + y1) / 2
        part.facen(pts, dirB((s0 + s1) / 2, ms, 0, my))


def chord(part, s0, s1, q0, q1, y0, y1, step=2.0):
    """A box section running along the line (a chord): q0..q1 across, y0..y1 up."""
    n = max(1, int(math.ceil((s1 - s0) / step)))
    ss = [s0 + (s1 - s0) * k / n for k in range(n + 1)]
    for a, b in zip(ss, ss[1:]):
        m = (a + b) / 2
        part.facen([P(a, q0, y0), P(b, q0, y0), P(b, q0, y1), P(a, q0, y1)], dirB(m, 0, -1, 0))
        part.facen([P(a, q1, y0), P(b, q1, y0), P(b, q1, y1), P(a, q1, y1)], dirB(m, 0, 1, 0))
        part.facen([P(a, q0, y1), P(b, q0, y1), P(b, q1, y1), P(a, q1, y1)], (0, 0, 1))
        part.facen([P(a, q0, y0), P(b, q0, y0), P(b, q1, y0), P(a, q1, y0)], (0, 0, -1))
    for s, k in ((s0, -1), (s1, 1)):
        part.facen([P(s, q0, y0), P(s, q1, y0), P(s, q1, y1), P(s, q0, y1)], dirB(s, k, 0, 0))


def cylinder(part, s, q, r, y0, y1, sides=16, uvband=None):
    """A vertical cylinder at (s, q); uvband = (v_top_px, v_bot_px) maps it round the drum atlas."""
    f = at(s)
    cx, cy = f['x'] + f['nx'] * q, -(f['z'] + f['nz'] * q)
    for k in range(sides):
        a0, a1 = k / sides * math.tau, (k + 1) / sides * math.tau
        am = (a0 + a1) / 2
        pts = [(cx + math.cos(a0) * r, cy + math.sin(a0) * r, y0), (cx + math.cos(a1) * r, cy + math.sin(a1) * r, y0),
               (cx + math.cos(a1) * r, cy + math.sin(a1) * r, y1), (cx + math.cos(a0) * r, cy + math.sin(a0) * r, y1)]
        if uvband:
            vt, vb = uvband
            u0, u1 = k / sides * 512, (k + 1) / sides * 512
            part.facen(pts, (math.cos(am), math.sin(am), 0), [auv(u0, vb), auv(u1, vb), auv(u1, vt), auv(u0, vt)])
        else:
            part.facen(pts, (math.cos(am), math.sin(am), 0))
    return cx, cy


def disc(part, cx, cy, r, y, up=True, uv=None, sides=16):
    pts = [(cx + math.cos(k / sides * math.tau) * r, cy + math.sin(k / sides * math.tau) * r, y) for k in range(sides)]
    part.facen(pts, (0, 0, 1 if up else -1), [uv] * sides if uv else None)


def ring(part, cx, cy, r0, r1, y0, y1, uv, sides=16):
    """A frustum band from radius r0 at y0 to r1 at y1 (a flare or a moulding), one atlas swatch."""
    for k in range(sides):
        a0, a1 = k / sides * math.tau, (k + 1) / sides * math.tau
        am = (a0 + a1) / 2
        pts = [(cx + math.cos(a0) * r0, cy + math.sin(a0) * r0, y0), (cx + math.cos(a1) * r0, cy + math.sin(a1) * r0, y0),
               (cx + math.cos(a1) * r1, cy + math.sin(a1) * r1, y1), (cx + math.cos(a0) * r1, cy + math.sin(a0) * r1, y1)]
        part.facen(pts, (math.cos(am), math.sin(am), (r0 - r1) / max(1e-3, y1 - y0)), [uv] * 4)


GOLD, BLACK, PAINT = auv(512 + 3 * 128 + 64, 64), auv(512 + 0 * 128 + 64, 192), auv(512 + 64, 64)
BOT, TOP = 1.3, 1.8   # the girders: bottom chord this far below the deck (ballast top), top chord this far above

# =============== the lattice girders ===============
for sp in L['spans']:
    if sp['style'] != 'lattice':
        continue
    s0, s1 = sp['s0'], sp['s1']
    for side in (-1, 1):
        def Q(s, inset=0.0):
            return side * (at(s)['half'] - 0.18 - inset)
        # chords: a bottom and a top boom (angle-and-plate box sections), the bottom one deeper
        n = max(1, int(math.ceil((s1 - s0) / 2.0)))
        ss = [s0 + (s1 - s0) * k / n for k in range(n + 1)]
        for a, b in zip(ss, ss[1:]):
            qa = Q((a + b) / 2)
            chord(iron, a, b, qa - 0.2, qa + 0.2, at(a)['deck'] - BOT, at(a)['deck'] - BOT + 0.45, step=10)
            chord(iron, a, b, qa - 0.2, qa + 0.2, at(a)['deck'] + TOP - 0.3, at(a)['deck'] + TOP, step=10)
        # the lattice: crossed diagonals in 3 m bays (the diamonds of refs 01, 04), a vertical at every bay
        bay = 3.0
        nb = max(1, int(round((s1 - s0) / bay)))
        bay = (s1 - s0) / nb
        for k in range(nb):
            a, b = s0 + k * bay, s0 + (k + 1) * bay
            q = Q((a + b) / 2)
            yb, yt = at(a)['deck'] - BOT + 0.45, at(a)['deck'] + TOP - 0.3
            bar(iron, a, b, q, yb, yt, 0.2, 0.06)
            bar(iron, b, a, q, yb, yt, 0.2, 0.06)
            # the finer second lattice (half a bay out of step), a little lighter
            h = bay / 2
            bar(iron, a + h, min(s1, b + h), q + side * 0.07, yb, yt, 0.12, 0.04) if b + h <= s1 + 1e-6 else None
            bar(iron, a - h, a + h, q + side * 0.07, yb, yt, 0.12, 0.04) if a - h >= s0 - 1e-6 else None
            bar(iron, a, a, q, yb, yt, 0.24, 0.1)
        bar(iron, s1, s1, Q(s1), at(s1)['deck'] - BOT + 0.45, at(s1)['deck'] + TOP - 0.3, 0.5, 0.2)   # the end posts
        bar(iron, s0, s0, Q(s0), at(s0)['deck'] - BOT + 0.45, at(s0)['deck'] + TOP - 0.3, 0.5, 0.2)
    kit_mark = sum(len(p.bm.faces) for p in (iron, atlas, dark))
    print('MARK lattice', sp['s0'], kit_mark)

# =============== the river piers ===============
# each row: a cylinder under each girder, rising through it to a drum above the top boom; an arched cross-frame between
for pr in L['piers']:
    s = pr['s']
    f = at(s)
    deck, half = f['deck'], f['half']
    cs = []
    for side in (-1, 1):
        q = side * (half - 0.18)
        cx, cy = cylinder(atlas, s, q, 0.95, WATER - 0.8, deck - BOT - 0.6, uvband=(200, 256))     # the lower drum
        ring(atlas, cx, cy, 0.95, 1.12, deck - BOT - 0.6, deck - BOT - 0.25, GOLD)                   # the gilt capital
        ring(atlas, cx, cy, 1.12, 0.8, deck - BOT - 0.25, deck - BOT, BLACK)
        cylinder(atlas, s, q, 0.8, deck - BOT, deck + TOP + 0.5, uvband=(0, 180))                   # the upper drum
        ring(atlas, cx, cy, 0.8, 0.95, deck + TOP + 0.5, deck + TOP + 0.75, GOLD)
        ring(atlas, cx, cy, 0.95, 0.5, deck + TOP + 0.75, deck + TOP + 1.0, BLACK)
        disc(atlas, cx, cy, 0.5, deck + TOP + 1.0, uv=BLACK)
        cs.append(q)
    # the cross-frame: a plate girder between the drums under the floor, with an arched soffit
    q0, q1 = cs[0] + 0.8, cs[1] - 0.8
    chord(dark, s - 0.25, s + 0.25, q0, q1, deck - BOT - 0.9, deck - BOT, step=1)
    N = 8
    for k in range(N):
        t0, t1 = k / N, (k + 1) / N
        qa, qb = q0 + (q1 - q0) * t0, q0 + (q1 - q0) * t1
        ya = deck - BOT - 0.9 - 1.6 * (1 - math.sin(math.pi * t0) ** 0.6)
        yb = deck - BOT - 0.9 - 1.6 * (1 - math.sin(math.pi * t1) ** 0.6)
        for k2 in (-1, 1):
            dark.facen([P(s + k2 * 0.25, qa, ya), P(s + k2 * 0.25, qb, yb), P(s + k2 * 0.25, qb, deck - BOT - 0.9), P(s + k2 * 0.25, qa, deck - BOT - 0.9)], dirB(s, k2, 0, 0))
        dark.facen([P(s - 0.25, qa, ya), P(s + 0.25, qa, ya), P(s + 0.25, qb, yb), P(s - 0.25, qb, yb)], (0, 0, -1))
    print('MARK pier', s)

# =============== finish ===============
objs = [iron.build(kit.material('ll_iron', (0.37, 0.42, 0.4), 0.55)), atlas.build(kit.material('ll_atlas', (0.1, 0.1, 0.1), 0.45)),
        dark.build(kit.material('ll_dark', (0.1, 0.11, 0.12), 0.7))]
print('TRIANGLES before AO', kit.tris(objs))
kit.bake_ao_vertex(objs, distance=1.5, samples=16, cell=2.5, passes=1, nosub=('ll_atlas',))
root = bpy.data.objects.new('loopline', None); bpy.context.collection.objects.link(root)
for o in objs:
    o.parent = root
print('TRIANGLES', kit.tris(objs), {o.name: kit.tris([o]) for o in objs})
kit.export(os.path.join(OUT, 'loopline.glb'), os.path.join(SRC, 'loopline.blend'))
print('DONE')

"""Body types for the statue kit (docs/research/monuments.md section 4, "statue proxy kit").

Each function returns a filled figures.Fig (not yet built). All at a nominal 1.8 m (head top ~1.78 m), feet at z 0,
facing -Y, figure's right at -X. Seated Victories sit on z 0 (the top of their block).

  cloaked      standing, full cloak open at the front, left hand at the chest, right hand down with a scroll (O'Connell)
  frock_chest  frock coat to the knees, right hand on the chest, left hand at the side with a scroll (Gray, Burke)
  folded       frock coat, arms folded across the chest (Smith O'Brien)
  orator       tail coat and breeches, right arm thrust up and forward (Grattan)
  orator_out   long coat, right arm outstretched forward in mid-speech (Parnell)
  friar        habit with cord and hood, right arm raised high, left arm out (Father Mathew)
  larkin       open jacket flying, right arm straight up, left arm flung out sideways, leaning forward (Larkin)
  reader       frock coat, book held open in both hands (Goldsmith)
  allegory     classical female, long chiton and mantle, left hand on a tall staff (GPO Hibernia, Custom House)
  justice      classical female, sword raised in the right hand, scales in the left (Dublin Castle gate)
  classical    classical male in a short tunic and cloak with a staff (GPO Mercury)
  victory_*    seated winged Victory with an attribute: patriotism, fidelity, courage, eloquence (O'Connell Monument)
  relief_*     low-poly flattened figures for the O'Connell frieze
"""
import math
from figures import Fig, pose, lean

TAU = math.tau


def _head(f, J, **kw):
    x, y, z = J['head'][0]
    f.head((x, y - 0.01, z + 0.1), **kw)


def _frock(f, hem=0.5, sides=14, open_from=1.05, tails=False):
    rings = [(1.53, 0.1, 0.085, 0, 0.005, 0), (1.45, 0.225, 0.13, 0, 0.01, 0), (1.3, 0.21, 0.135, 0, 0.005, 0),
             (1.12, 0.19, 0.13, 0, 0.005, 0.12), (open_from, 0.195, 0.135, 0, 0.01, 0.35),
             (0.85, 0.21, 0.15, 0, 0.02, 0.7 if not tails else 1.3), (hem, 0.225, 0.165, 0, 0.03, 0.85 if not tails else 1.9)]
    f.lathe(rings, sides, folds=5, fold_amp=0.05)


def _legs_trousers(**over):
    # trousers: a little fuller than the bare skeleton
    base = dict(rhip=((-0.1, 0, 0.9), (0.105, 0.105)), rkn=((-0.11, -0.02, 0.5), (0.078, 0.078)), ran=((-0.12, 0.02, 0.09), (0.06, 0.06)),
                lhip=((0.1, 0, 0.9), (0.105, 0.105)), lkn=((0.11, -0.02, 0.5), (0.078, 0.078)), lan=((0.12, 0.02, 0.09), (0.06, 0.06)))
    base.update(over)
    return base


def cloaked():
    f = Fig()
    J = pose(**_legs_trousers(),
             lel=(0.2, -0.1, 1.17), lwr=(0.09, -0.17, 1.27), lha=((0.04, -0.18, 1.3), (0.045, 0.03)),
             rel=(-0.23, -0.04, 1.15), rwr=(-0.22, -0.16, 0.98), rha=((-0.21, -0.2, 0.94), (0.044, 0.035)))
    f.body(J)
    _head(f, J)
    _frock(f, hem=0.55, open_from=1.0)
    # the cloak: over both shoulders, open at the front, heavy vertical folds, fuller on the left where it is held
    f.lathe([(1.54, 0.12, 0.1, 0, 0.01, 0.0), (1.45, 0.28, 0.165, 0, 0.02, 0.32), (1.27, 0.32, 0.21, 0.01, 0.035, 0.52),
             (0.95, 0.31, 0.22, 0.02, 0.045, 0.66), (0.55, 0.3, 0.22, 0.025, 0.05, 0.72), (0.1, 0.3, 0.22, 0.03, 0.06, 0.76)],
            sides=18, folds=7, fold_amp=0.075, fold_phase=0.4)
    f.cyl((-0.21, -0.21, 0.86), (-0.2, -0.23, 1.02), 0.03, seg=6)  # the scroll
    return f


def frock_chest():
    f = Fig()
    J = pose(**_legs_trousers(),
             rel=(-0.2, -0.1, 1.17), rwr=(-0.09, -0.17, 1.28), rha=((-0.04, -0.18, 1.31), (0.045, 0.03)),
             lel=(0.25, 0.0, 1.15), lwr=(0.28, -0.07, 0.93), lha=((0.29, -0.1, 0.86), (0.044, 0.035)))
    f.body(J)
    _head(f, J)
    _frock(f, hem=0.5)
    f.cyl((0.29, -0.13, 0.8), (0.3, -0.2, 0.95), 0.028, seg=6)
    return f


def folded():
    f = Fig()
    J = pose(**_legs_trousers(rkn=((-0.12, -0.03, 0.5), (0.066, 0.066)), ran=((-0.15, 0.0, 0.09), (0.05, 0.05))),
             rel=(-0.23, -0.06, 1.17), rwr=(0.06, -0.19, 1.25), rha=((0.13, -0.17, 1.27), (0.045, 0.03)),
             lel=(0.23, -0.08, 1.19), lwr=(-0.05, -0.21, 1.29), lha=((-0.12, -0.2, 1.3), (0.045, 0.03)))
    f.body(J)
    _head(f, J)
    _frock(f, hem=0.45)
    return f


def orator():
    f = Fig()
    J = pose(**_legs_trousers(lkn=((0.11, -0.06, 0.5), (0.062, 0.062)), lan=((0.13, -0.12, 0.09), (0.045, 0.045)),
                              lto=((0.14, -0.24, 0.035), (0.042, 0.03))),
             rel=(-0.28, -0.14, 1.6), rwr=(-0.33, -0.3, 1.8), rha=((-0.35, -0.35, 1.86), (0.045, 0.03)),
             lel=(0.25, 0.02, 1.15), lwr=(0.27, -0.05, 0.93), lha=((0.28, -0.08, 0.86), (0.044, 0.035)))
    f.body(J)
    _head(f, J)
    _frock(f, hem=0.6, tails=True)
    return f


def orator_out():
    f = Fig()
    J = pose(**_legs_trousers(),
             rel=(-0.42, -0.12, 1.36), rwr=(-0.64, -0.24, 1.31), rha=((-0.71, -0.28, 1.3), (0.045, 0.03)),
             lel=(0.25, 0.02, 1.15), lwr=(0.27, -0.05, 0.93), lha=((0.28, -0.08, 0.86), (0.044, 0.035)))
    f.body(J)
    _head(f, J)
    _frock(f, hem=0.42)
    return f


def friar():
    f = Fig()
    thick = lambda p, r: (p, (r, r))
    J = pose(rel=thick((-0.25, -0.02, 1.7), 0.07), rwr=thick((-0.27, -0.06, 1.96), 0.055), rha=((-0.27, -0.07, 2.05), (0.045, 0.03)),
             lel=thick((0.33, -0.14, 1.3), 0.07), lwr=thick((0.45, -0.34, 1.24), 0.055), lha=((0.48, -0.4, 1.23), (0.045, 0.03)))
    f.body(J, skip=('rto', 'lto'))
    _head(f, J)
    # the habit: closed to the feet, full folds; the hood bunched behind the neck; the cord at the waist
    f.lathe([(1.52, 0.1, 0.09, 0, 0.01), (1.44, 0.23, 0.14, 0, 0.01), (1.25, 0.21, 0.15, 0, 0.01), (1.0, 0.2, 0.15, 0, 0.01),
             (0.6, 0.25, 0.2, 0, 0.0), (0.05, 0.31, 0.25, 0, 0.0)], sides=16, folds=7, fold_amp=0.06, cap=True)
    f.lathe([(1.58, 0.1, 0.08, 0, 0.07), (1.5, 0.17, 0.12, 0, 0.06), (1.4, 0.2, 0.12, 0, 0.05)], sides=10)
    f.torus((0, 0.0, 0.98), 0.205, 0.018, seg=12, sides=3)
    f.cyl((0.12, -0.16, 0.98), (0.1, -0.2, 0.45), 0.014, seg=4)
    return f


def larkin():
    f = Fig()
    J = pose(**_legs_trousers(rkn=((-0.13, 0.04, 0.5), (0.066, 0.066)), ran=((-0.15, 0.12, 0.09), (0.05, 0.05)), rto=((-0.16, 0.0, 0.035), (0.042, 0.03)),
                              lkn=((0.12, -0.12, 0.52), (0.066, 0.066)), lan=((0.13, -0.16, 0.09), (0.05, 0.05)), lto=((0.14, -0.28, 0.035), (0.042, 0.03))),
             rel=(-0.21, 0.0, 1.73), rwr=(-0.19, 0.02, 2.0), rha=((-0.19, 0.02, 2.1), (0.05, 0.03)),
             lel=(0.44, -0.06, 1.46), lwr=(0.7, -0.12, 1.5), lha=((0.8, -0.13, 1.51), (0.05, 0.03)))
    J = lean(J, 0.18)
    f.body(J)
    _head(f, J)
    # open jacket, the back flying out behind
    f.lathe([(1.5, 0.12, 0.09, 0, -0.05), (1.42, 0.23, 0.14, 0, -0.04, 0.2), (1.2, 0.21, 0.15, 0, -0.01, 0.5),
             (0.95, 0.22, 0.17, 0, 0.04, 0.8), (0.75, 0.25, 0.2, 0, 0.1, 1.1)], sides=14, folds=4, fold_amp=0.06)
    return f


def reader():
    f = Fig()
    J = pose(**_legs_trousers(),
             rel=(-0.22, -0.08, 1.12), rwr=(-0.12, -0.25, 1.17), rha=((-0.08, -0.29, 1.19), (0.045, 0.03)),
             lel=(0.22, -0.08, 1.12), lwr=(0.12, -0.25, 1.17), lha=((0.08, -0.29, 1.19), (0.045, 0.03)))
    f.body(J)
    _head(f, J)
    _frock(f, hem=0.5)
    f.box((0, -0.3, 1.22), (0.26, 0.18, 0.03), rot=(0.5, 0, 0))
    return f


def _classical_female(J, mantle=True):
    f = Fig()
    f.body(J, skip=('rto', 'lto'))
    _head(f, J, r=(0.09, 0.105, 0.115))
    # chiton: bodice from the shoulders, a belt, then the skirt to the feet
    f.lathe([(1.5, 0.09, 0.08), (1.43, 0.2, 0.13), (1.3, 0.18, 0.14), (1.12, 0.15, 0.115)], sides=14, folds=6, fold_amp=0.04)
    f.lathe([(1.12, 0.16, 0.12), (0.8, 0.22, 0.17), (0.4, 0.26, 0.21), (0.02, 0.3, 0.25)], sides=16, folds=9, fold_amp=0.06, cap=True)
    if mantle:  # a mantle slung across the hips
        f.lathe([(1.05, 0.2, 0.15, 0, 0.0), (0.8, 0.25, 0.19, 0, 0.0), (0.55, 0.27, 0.21, 0, 0.0, 0.5)], sides=14, folds=5, fold_amp=0.07)
    return f


def allegory():
    J = pose(female=True,
             lel=(0.26, -0.06, 1.25), lwr=(0.3, -0.12, 1.45), lha=((0.31, -0.13, 1.52), (0.04, 0.03)),
             rel=(-0.22, 0.02, 1.16), rwr=(-0.24, -0.05, 0.95), rha=((-0.24, -0.07, 0.88), (0.04, 0.03)))
    f = _classical_female(J)
    f.cyl((0.31, -0.13, 0.0), (0.31, -0.13, 2.1), 0.02, seg=5)  # staff / spear
    f.sphere((0.31, -0.13, 2.12), (0.03, 0.03, 0.07), seg=5)
    return f


def justice():
    J = pose(female=True,
             rel=(-0.28, -0.05, 1.62), rwr=(-0.3, -0.1, 1.86), rha=((-0.3, -0.11, 1.93), (0.04, 0.03)),
             lel=(0.27, -0.12, 1.2), lwr=(0.33, -0.33, 1.25), lha=((0.34, -0.38, 1.26), (0.04, 0.03)))
    f = _classical_female(J)
    f.cyl((-0.3, -0.11, 1.88), (-0.3, -0.11, 2.6), 0.018, seg=4)  # sword
    f.box((-0.3, -0.11, 1.96), (0.2, 0.03, 0.03))  # guard
    f.cyl((0.34, -0.4, 1.26), (0.34, -0.4, 1.12), 0.008, seg=3)
    f.box((0.34, -0.4, 1.12), (0.34, 0.02, 0.02))  # beam
    for sx in (-0.16, 0.16):
        f.cyl((0.34 + sx, -0.4, 1.12), (0.34 + sx, -0.4, 0.95), 0.005, seg=3)
        f.lathe([(0.95, 0.07, 0.07, 0.34 + sx, -0.4), (0.92, 0.04, 0.04, 0.34 + sx, -0.4)], sides=8, cap=True)
    return f


def classical():
    f = Fig()
    J = pose(rel=(-0.24, -0.02, 1.16), rwr=(-0.26, -0.12, 0.98), rha=((-0.26, -0.15, 0.93), (0.044, 0.03)),
             lel=(0.26, -0.08, 1.24), lwr=(0.3, -0.16, 1.42), lha=((0.31, -0.17, 1.48), (0.044, 0.03)))
    f.body(J)
    _head(f, J)
    f.lathe([(1.45, 0.21, 0.13), (1.25, 0.2, 0.14), (0.95, 0.2, 0.15), (0.72, 0.23, 0.17)], sides=14, folds=6, fold_amp=0.05)
    f.lathe([(1.5, 0.12, 0.1, 0.02, 0.03), (1.42, 0.25, 0.16, 0.03, 0.04, 1.2), (1.0, 0.28, 0.2, 0.05, 0.06, 1.4), (0.55, 0.3, 0.2, 0.06, 0.08, 1.6)],
            sides=12, folds=4, fold_amp=0.06)
    f.cyl((0.31, -0.17, 0.2), (0.31, -0.17, 1.9), 0.018, seg=5)  # caduceus / staff
    f.sphere((0.31, -0.17, 1.93), 0.045, seg=5)
    return f


# ---------- seated winged Victory (O'Connell Monument) ----------
def victory(attr):
    """Seated on z 0 (the top of the block), facing -Y. ~1.4 m to the head top at nominal size (scale ~1.45 in the hero)."""
    f = Fig()
    arms = dict(
        patriotism=dict(rel=(-0.26, -0.12, 0.72), rwr=(-0.26, -0.3, 0.62), rha=((-0.26, -0.34, 0.6), (0.04, 0.03)),
                        lel=(0.28, -0.02, 0.72), lwr=(0.36, -0.12, 0.55), lha=((0.38, -0.15, 0.5), (0.04, 0.03))),
        fidelity=dict(rel=(-0.2, -0.12, 0.72), rwr=(-0.08, -0.17, 0.86), rha=((-0.03, -0.18, 0.89), (0.04, 0.03)),
                      lel=(0.28, -0.1, 0.72), lwr=(0.36, -0.3, 0.62), lha=((0.38, -0.36, 0.6), (0.04, 0.03))),
        courage=dict(rel=(-0.28, -0.1, 0.7), rwr=(-0.34, -0.3, 0.6), rha=((-0.36, -0.35, 0.58), (0.04, 0.03)),
                     lel=(0.27, -0.02, 0.74), lwr=(0.32, -0.08, 0.95), lha=((0.33, -0.09, 1.0), (0.04, 0.03))),
        eloquence=dict(rel=(-0.26, -0.12, 0.74), rwr=(-0.3, -0.32, 0.88), rha=((-0.31, -0.36, 0.93), (0.04, 0.03)),
                       lel=(0.24, -0.12, 0.7), lwr=(0.12, -0.33, 0.6), lha=((0.08, -0.37, 0.6), (0.04, 0.03))),
    )[attr]
    J = pose(female=True,
             pelvis=((0, 0.06, 0.45), (0.17, 0.13)), belly=((0, 0.05, 0.6), (0.13, 0.1)), chest=((0, 0.03, 0.8), (0.145, 0.11)),
             neck=((0, 0.01, 0.97), (0.055, 0.055)), head=((0, 0.0, 1.03), (0.05, 0.05)),
             rsh=(-0.17, 0.03, 0.9), lsh=(0.17, 0.03, 0.9),
             rhip=(-0.11, 0.02, 0.4), rkn=(-0.13, -0.44, 0.44), ran=(-0.14, -0.5, 0.07), rto=(-0.14, -0.62, 0.035),
             lhip=(0.11, 0.02, 0.4), lkn=(0.14, -0.4, 0.46), lan=(0.17, -0.46, 0.07), lto=(0.18, -0.58, 0.035),
             **arms)
    f.body(J, skip=('rto', 'lto'))
    hx, hy, hz = J['head'][0]
    f.head((hx, hy - 0.01, hz + 0.1), r=(0.09, 0.105, 0.115), crown=(0.088, 0.02))
    # chiton bodice, then the heavy lap drapery falling over the knees to the ground in front
    f.lathe([(0.97, 0.09, 0.08, 0, 0.02), (0.9, 0.2, 0.13, 0, 0.03), (0.76, 0.17, 0.14, 0, 0.03), (0.58, 0.16, 0.13, 0, 0.04)], sides=14, folds=6, fold_amp=0.04)
    f.lathe([(0.6, 0.18, 0.14, 0, 0.03), (0.5, 0.27, 0.3, 0, -0.14), (0.4, 0.3, 0.3, 0, -0.3), (0.2, 0.31, 0.2, 0, -0.44),
             (0.02, 0.33, 0.2, 0, -0.47)], sides=16, folds=8, fold_amp=0.07, cap=True)
    # wings: raised and half spread behind the shoulders
    for s in (1, -1):
        f.wing(s, root=(s * 0.1, 0.15, 0.86), tip=(s * 0.6, 0.3, 1.46), n=6, lens=(0.38, 0.48, 0.2), droop=(0.25, 0.35, -1.0), rise=(0.4, 0.3, 1.0))
    if attr == 'patriotism':
        f.cyl((-0.26, -0.36, 0.62), (-0.26, -0.44, 0.02), 0.018, seg=4)          # sword, point down
        f.box((-0.26, -0.35, 0.56), (0.16, 0.03, 0.03))
        f.lathe([(0.75, 0.2, 0.05, 0.42, -0.12), (0.45, 0.24, 0.06, 0.42, -0.12), (0.15, 0.2, 0.05, 0.42, -0.12)], sides=10, cap=True)  # shield
    elif attr == 'fidelity':  # the Irish wolfhound seated at her left side
        f.cyl((0.42, -0.35, 0.02), (0.42, -0.3, 0.42), 0.09, 0.11, seg=6)       # haunch/chest
        f.cyl((0.42, -0.3, 0.42), (0.42, -0.4, 0.62), 0.08, 0.06, seg=6)        # neck
        f.cyl((0.42, -0.42, 0.62), (0.42, -0.6, 0.6), 0.055, 0.035, seg=6)      # muzzle
        f.cyl((0.42, -0.1, 0.02), (0.42, -0.2, 0.3), 0.12, 0.1, seg=6)          # seated rump
        f.cyl((0.36, -0.45, 0.02), (0.38, -0.38, 0.35), 0.03, seg=4)            # forelegs
        f.cyl((0.48, -0.45, 0.02), (0.46, -0.38, 0.35), 0.03, seg=4)
    elif attr == 'courage':
        # the serpent coiled at her feet, its head raised in her right hand; the fasces behind her left side
        pts, rad = [], []
        for i in range(22):
            t = i / 21
            a = t * TAU * 1.6
            r = 0.34 - 0.1 * t
            pts.append((math.cos(a) * r * 0.9, -0.42 + math.sin(a) * r * 0.5, 0.04 + t * 0.05))
            rad.append(0.03)
        pts += [(-0.34, -0.4, 0.3), (-0.36, -0.37, 0.58)]; rad += [0.025, 0.02]
        f.tube(pts, rad, sides=4)
        f.cyl((0.36, 0.05, 0.02), (0.36, 0.0, 1.0), 0.07, seg=7)
        f.box((0.36, -0.08, 0.98), (0.03, 0.14, 0.1))                             # the axe head
    elif attr == 'eloquence':
        f.box((0.08, -0.4, 0.58), (0.24, 0.17, 0.04), rot=(0.2, 0, 0))          # the book on her lap
    return f


# ---------- frieze figures (O'Connell Monument): cheap, flattened, no subdivision ----------
def relief(kind, seed=0):
    f = Fig()
    r = (seed * 0.37) % 1.0
    if kind == 'erin':
        J = pose(female=True, rel=(-0.22, -0.02, 1.7), rwr=(-0.21, -0.02, 1.98), rha=((-0.21, -0.02, 2.08), (0.04, 0.03)))
    elif kind == 'child':
        J = pose(rel=(-0.22, -0.08, 1.14), rwr=(-0.15, -0.2, 1.1))
    elif kind == 'gesture':
        J = pose(rel=(-0.3, -0.12, 1.3), rwr=(-0.4, -0.25, 1.45), rha=((-0.42, -0.28, 1.5), (0.04, 0.03)))
    else:
        J = pose(rel=(-0.22, -0.06 - 0.06 * r, 1.16), rwr=(-0.12 - 0.1 * r, -0.18, 1.2 + 0.1 * r))
    f.body(J, subdiv=0, skip=('rto', 'lto', 'rha', 'lha', 'belly'))
    hx, hy, hz = J['head'][0]
    f.sphere((hx, hy, hz + 0.1), (0.09, 0.1, 0.115), seg=6)
    hem = 0.05 if kind in ('erin', 'robe', 'bishop') else 0.55
    f.lathe([(1.46, 0.2, 0.13), (1.0, 0.2, 0.15), (hem, 0.25 + 0.03 * r, 0.19)], sides=8, folds=3, fold_amp=0.06, fold_phase=seed)
    if kind == 'bishop':
        f.cyl((hx, hy, hz + 0.18), (hx, hy, hz + 0.36), 0.08, 0.02, seg=4)       # mitre
        f.cyl((0.25, -0.1, 0.0), (0.25, -0.1, 2.0), 0.015, seg=3)               # crozier
    if kind == 'child':
        pass
    return f

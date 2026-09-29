"""Rowan Gillespie's "Famine" (1997, Custom House Quay) for the statue kit: gaunt, elongated walking figures and the
starving dog (docs/research/liffey-quays.md section 2, refs/liffey-quays 01-06).

Same conventions as statue_bodies.py: nominal 1.8 m (head top ~1.78 m), feet at z 0, facing -Y (they walk that way),
figure's right at -X. The dog is modelled at its real size (about 0.55 m at the shoulder), so place it with the
nominal height (1.78) to keep that size.

  famine_carrier  a man carrying a limp figure across his shoulders, one arm and the head hanging on his left
  famine_shawl    a hooded woman in a long shawl, hands clasped at her chest, a little stooped
  famine_bundle   a man in a hat holding a bundled child against his chest
  famine_sack     a tall man bent forward under a bundle on his back, the other arm hanging long
  famine_dog      the dog: thin, head down, following the last figure
"""
import math
from figures import Fig, pose, lean


def _gaunt(J, limbs=0.7, torso=0.8):
    """Starved proportions: every joint thinner except the head (the skull stays full size, so it reads big)."""
    out = {}
    for k, (p, r) in J.items():
        s = 1.0 if k == 'head' else torso if k in ('pelvis', 'belly', 'chest', 'neck') else limbs
        out[k] = (p, (r[0] * s, r[1] * s))
    return out


def _stretch(J, k=1.04):
    """Elongate: raise everything above the knees a little (Gillespie's figures are drawn out, long-legged)."""
    return {n: ((p[0], p[1], p[2] * k if p[2] > 0.5 else p[2]), r) for n, (p, r) in J.items()}


def _head(f, J, r=(0.082, 0.1, 0.118), dy=-0.01):
    x, y, z = J['head'][0]
    f.head((x, y + dy, z + 0.1), r=r)


def _rags(f, top=1.52, hem=0.62, w=0.2, d=0.13, lean_y=0.0, folds=6, amp=0.09, sides=12):
    """A loose ragged shirt / coat: big irregular folds that grow towards a torn hem."""
    f.lathe([(top, w * 0.55, d * 0.7, 0, lean_y * 0.1), (top - 0.08, w, d, 0, lean_y * 0.3), (top - 0.35, w * 0.86, d * 0.95, 0, lean_y * 0.55),
             ((top + hem) / 2, w * 0.84, d * 1.0, 0, lean_y * 0.8), (hem, w * 0.96, d * 1.12, 0, lean_y)],
            sides=sides, folds=folds, fold_amp=amp, fold_phase=0.7)


def famine_carrier():
    f = Fig()
    J = pose(rhip=((-0.09, 0, 0.9), (0.09, 0.09)), lhip=((0.09, 0, 0.9), (0.09, 0.09)),
             rkn=((-0.1, 0.02, 0.5), (0.07, 0.07)), ran=((-0.11, 0.1, 0.09), (0.05, 0.05)), rto=((-0.12, -0.02, 0.035), (0.045, 0.03)),
             lkn=((0.1, -0.1, 0.52), (0.07, 0.07)), lan=((0.11, -0.14, 0.09), (0.05, 0.05)), lto=((0.12, -0.26, 0.035), (0.045, 0.03)),
             # both hands up at the shoulders holding the body there: the right grips a dangling leg, the left an arm
             rel=(-0.3, -0.08, 1.3), rwr=(-0.24, -0.16, 1.46), rha=((-0.22, -0.16, 1.5), (0.045, 0.03)),
             lel=(0.3, -0.1, 1.28), lwr=(0.25, -0.17, 1.44), lha=((0.23, -0.17, 1.48), (0.045, 0.03)))
    J = lean(_stretch(_gaunt(J)), 0.14)
    f.body(J)
    _head(f, J, dy=-0.03)
    _rags(f, top=1.56, hem=0.72, w=0.18, d=0.12, lean_y=-0.08, amp=0.1)
    # the carried figure lies across his shoulders behind the neck: its body along X, head hanging on his left,
    # an arm dangling down in front, the legs hanging on his right
    cy, cz = 0.02, 1.66
    f.tube([(-0.36, cy + 0.02, cz - 0.04), (-0.2, cy, cz + 0.02), (0.02, cy - 0.01, cz + 0.05), (0.22, cy, cz + 0.02), (0.34, cy - 0.02, cz - 0.03)],
           [0.08, 0.1, 0.11, 0.1, 0.08], sides=6)
    f.sphere((0.42, cy - 0.06, cz - 0.16), (0.075, 0.085, 0.09), seg=6)                     # the hanging head
    f.cyl((0.3, cy - 0.08, cz - 0.02), (0.28, cy - 0.2, cz - 0.42), 0.035, 0.028, seg=5)    # arm over his shoulder
    f.cyl((0.28, cy - 0.2, cz - 0.42), (0.27, cy - 0.22, cz - 0.7), 0.028, 0.022, seg=5)
    f.sphere((0.27, cy - 0.22, cz - 0.74), (0.03, 0.02, 0.05), seg=4)                        # the limp hand
    for sx in (-0.02, 0.06):                                                                # the legs, hanging
        f.cyl((-0.34 + sx, cy + 0.01, cz - 0.02), (-0.36 + sx, cy - 0.08, cz - 0.42), 0.045, 0.035, seg=5)
        f.cyl((-0.36 + sx, cy - 0.08, cz - 0.42), (-0.34 + sx, cy - 0.12, cz - 0.82), 0.035, 0.028, seg=5)
    return f


def famine_shawl():
    f = Fig()
    J = pose(female=True,
             rkn=((-0.1, -0.04, 0.5), (0.065, 0.065)), ran=((-0.11, 0.04, 0.09), (0.05, 0.05)),
             lkn=((0.1, -0.08, 0.5), (0.065, 0.065)), lan=((0.11, -0.12, 0.09), (0.05, 0.05)), lto=((0.12, -0.24, 0.035), (0.045, 0.03)),
             rel=(-0.19, -0.1, 1.18), rwr=(-0.07, -0.17, 1.3), rha=((-0.03, -0.18, 1.33), (0.045, 0.03)),
             lel=(0.19, -0.1, 1.18), lwr=(0.07, -0.18, 1.31), lha=((0.03, -0.19, 1.34), (0.045, 0.03)))
    J = lean(_stretch(_gaunt(J, limbs=0.72, torso=0.78)), 0.07)
    f.body(J, skip=('rto',))
    _head(f, J, r=(0.078, 0.095, 0.112), dy=-0.02)
    hx, hy, hz = J['head'][0]
    # the shawl: over the head as a hood, round the shoulders and down past the knees, open at the face and the hands
    f.lathe([(hz + 0.24, 0.07, 0.07, hx, hy + 0.01), (hz + 0.18, 0.115, 0.125, hx, hy + 0.02, 0.5), (hz + 0.02, 0.12, 0.13, hx, hy + 0.03, 0.55),
             (1.46, 0.2, 0.15, 0, hy * 0.6, 0.35), (1.25, 0.23, 0.17, 0, hy * 0.4, 0.3), (0.95, 0.24, 0.18, 0, hy * 0.2, 0.2), (0.62, 0.25, 0.19, 0, 0.0, 0.1)],
            sides=14, folds=7, fold_amp=0.08, fold_phase=0.3)
    # the skirt beneath, to the ankles
    f.lathe([(1.0, 0.16, 0.13), (0.6, 0.2, 0.17), (0.12, 0.22, 0.19)], sides=12, folds=6, fold_amp=0.07, cap=True)
    return f


def famine_bundle():
    f = Fig()
    J = pose(rkn=((-0.1, -0.08, 0.5), (0.07, 0.07)), ran=((-0.11, -0.12, 0.09), (0.05, 0.05)), rto=((-0.12, -0.24, 0.035), (0.045, 0.03)),
             lkn=((0.1, 0.02, 0.5), (0.07, 0.07)), lan=((0.11, 0.1, 0.09), (0.05, 0.05)), lto=((0.12, -0.02, 0.035), (0.045, 0.03)),
             rel=(-0.2, -0.1, 1.12), rwr=(-0.1, -0.22, 1.16), rha=((-0.05, -0.24, 1.2), (0.045, 0.03)),
             lel=(0.2, -0.12, 1.16), lwr=(0.09, -0.22, 1.3), lha=((0.05, -0.23, 1.34), (0.045, 0.03)))
    J = lean(_stretch(_gaunt(J)), 0.08)
    f.body(J)
    _head(f, J, dy=-0.02)
    hx, hy, hz = J['head'][0]
    # a battered hat: low crown and a drooping brim
    f.cyl((hx, hy - 0.01, hz + 0.16), (hx, hy - 0.01, hz + 0.29), 0.1, 0.085, seg=8)
    f.lathe([(hz + 0.17, 0.17, 0.18, hx, hy - 0.02), (hz + 0.14, 0.18, 0.19, hx, hy - 0.02)], sides=10, cap=True)
    _rags(f, top=1.56, hem=0.58, w=0.2, d=0.13, lean_y=-0.05, amp=0.08)
    # the bundled child held against his chest
    f.sphere((0, -0.24, 1.24), (0.12, 0.1, 0.19), seg=7)
    f.sphere((0.02, -0.26, 1.44), (0.06, 0.06, 0.065), seg=5)
    return f


def famine_sack():
    f = Fig()
    J = pose(rkn=((-0.1, -0.1, 0.5), (0.07, 0.07)), ran=((-0.11, -0.12, 0.09), (0.05, 0.05)), rto=((-0.12, -0.24, 0.035), (0.045, 0.03)),
             lkn=((0.1, 0.04, 0.5), (0.07, 0.07)), lan=((0.11, 0.12, 0.09), (0.05, 0.05)), lto=((0.12, 0.0, 0.035), (0.045, 0.03)),
             # right hand over the shoulder holding the bundle's neck; the left arm hangs long and loose
             rel=(-0.28, -0.1, 1.5), rwr=(-0.2, 0.02, 1.62), rha=((-0.15, 0.08, 1.62), (0.045, 0.03)),
             lel=(0.23, -0.02, 1.08), lwr=(0.25, -0.06, 0.8), lha=((0.25, -0.07, 0.7), (0.045, 0.035)))
    J = lean(_stretch(_gaunt(J, limbs=0.66, torso=0.76), 1.07), 0.26)
    f.body(J)
    _head(f, J, dy=-0.03)
    _rags(f, top=1.58, hem=0.66, w=0.18, d=0.12, lean_y=-0.18, amp=0.1)
    # the bundle on his back
    f.sphere((-0.02, 0.12, 1.42), (0.2, 0.15, 0.24), seg=7)
    f.cyl((-0.12, 0.1, 1.62), (-0.15, 0.08, 1.66), 0.05, 0.03, seg=5)
    return f


def famine_dog():
    """Real size: ~0.95 m nose to tail, 0.55 m at the shoulder; head down at knee height, sniffing the ground."""
    f = Fig()
    sh, hip = (0, -0.22, 0.52), (0, 0.24, 0.5)
    # a thin arched spine (the ribs and hips show), neck dropping to the lowered head
    f.tube([(0, 0.36, 0.5), hip, (0, 0.02, 0.56), sh, (0, -0.34, 0.42), (0, -0.42, 0.3)], [0.03, 0.07, 0.085, 0.08, 0.05, 0.04], sides=7)
    f.sphere((0, 0.0, 0.52), (0.08, 0.2, 0.1), seg=7)                         # the ribcage
    f.sphere((0, -0.48, 0.24), (0.055, 0.08, 0.06), seg=6)                    # head
    f.cyl((0, -0.52, 0.22), (0, -0.64, 0.14), 0.035, 0.02, seg=5)             # muzzle, pointing at the ground
    for sx in (-1, 1):
        f.cyl((sx * 0.035, -0.46, 0.29), (sx * 0.05, -0.43, 0.34), 0.02, 0.01, seg=3)                  # ears
        f.cyl((sx * 0.05, -0.24, 0.5), (sx * 0.055, -0.3, 0.26), 0.028, 0.02, seg=5)                  # fore legs
        f.cyl((sx * 0.055, -0.3, 0.26), (sx * 0.055, -0.33, 0.02), 0.018, 0.016, seg=4)
        f.cyl((sx * 0.055, 0.24, 0.48), (sx * 0.06, 0.34, 0.26), 0.035, 0.022, seg=5)                 # hind legs (hocks back)
        f.cyl((sx * 0.06, 0.34, 0.26), (sx * 0.06, 0.3, 0.02), 0.018, 0.016, seg=4)
    f.tube([(0, 0.36, 0.5), (0, 0.44, 0.42), (0, 0.48, 0.3), (0, 0.46, 0.2)], [0.022, 0.018, 0.014, 0.008], sides=4)  # tail
    return f

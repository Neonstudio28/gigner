"""Locomotion cycles (in place; the engine moves the figure at META speed x playback rate)."""
from npc_clips import P, mir, over, clip


def cycle(dur, a, a2, b):
    """Contact (left foot forward), loading, passing; the second half is the mirror image."""
    return [(0, a), (dur * 0.125, a2), (dur * 0.25, b), (dur * 0.5, mir(a)), (dur * 0.625, mir(a2)), (dur * 0.75, mir(b))]


def gait(step=28, back=22, lift=58, arm=24, elbow=12, lean=0, bob=0.025, twist=7, extra=None):
    e = extra or {}
    a = P(tL=step, sL=-6, ftL=12, tR=-back, sR=-18, ftR=-16, aL=(-arm, 0, -6), fL=elbow, aR=(arm + 2, 0, 6), fR=elbow + 22,
          hip=(0, -twist, 0), ch=(0, twist * 1.8, 0), sp=lean, hd=(-lean * 0.6, -twist * 0.8, 0), at=(0, 0, -bob))
    a2 = P(tL=step * 0.62, sL=-16, ftL=0, tR=-back * 0.6, sR=-46, ftR=-24, aL=(-arm * 0.6, 0, -6), fL=elbow, aR=(arm * 0.6, 0, 6), fR=elbow + 14,
           hip=(0, -twist * 0.5, 0), ch=(0, twist, 0), sp=lean, hd=(-lean * 0.6, -twist * 0.4, 0), at=(0, 0, -bob * 1.5))
    b = P(tL=3, sL=-4, ftL=0, tR=step * 0.62, sR=-lift, ftR=-10, aL=(2, 0, -6), fL=elbow + 4, aR=(2, 0, 6), fR=elbow + 6,
          hip=(0, 0, 2), ch=(0, 0, -3), sp=lean, hd=(-lean * 0.6, 0, 0), at=(0.012, 0, bob * 0.5))
    for p in (a, a2, b):
        p.update(e)
    return a, a2, b


def make(rig):
    clip(rig, 'walk', 1.0, cycle(1.0, *gait()), speed=1.38)
    clip(rig, 'stroll', 1.25, cycle(1.25, *gait(step=22, back=17, lift=44, arm=14, bob=0.018, twist=5)), speed=0.85)
    clip(rig, 'walk_old', 1.3, cycle(1.3, *gait(step=18, back=13, lift=36, arm=10, elbow=22, lean=-13, bob=0.012, twist=4)), speed=0.68)
    hold = P(aL=(22, 0, -6), fL=(84, -18, 0), aR=(22, 0, 6), fR=(84, 18, 0))
    clip(rig, 'walk_carry', 1.05, cycle(1.05, *gait(step=25, back=20, arm=0, lean=4, twist=4, extra=hold)), speed=1.22, prop='both')
    bag = P(aR=(3, 0, 9), fR=6)
    clip(rig, 'walk_bag', 1.0, [(t, {**p, **bag}) for t, p in cycle(1.0, *gait())], speed=1.3, prop='hand.R')
    # mirrored halves would swap the phone hand, so the phone arm is pinned on both halves
    ph = P(aL=(34, 0, -22), fL=(142, 0, 16), hd=(0, 0, 10))
    ks = cycle(1.05, *gait(step=24, back=19, arm=16, twist=4))
    clip(rig, 'walk_phone', 1.05, [(t, {**p, **ph}) for t, p in ks], speed=1.15, prop='hand.L')
    um = P(aR=(14, 0, 8), fR=(82, 8, 0))
    clip(rig, 'walk_umbrella', 1.0, [(t, {**p, **um}) for t, p in cycle(1.0, *gait(arm=14))], speed=1.3, prop='hand.R')
    clip(rig, 'jog', 0.74, cycle(0.74, *gait(step=38, back=26, lift=88, arm=36, elbow=72, lean=-7, bob=0.04, twist=9)), speed=2.6)
    clip(rig, 'run', 0.6, cycle(0.6, *gait(step=50, back=32, lift=112, arm=50, elbow=84, lean=-13, bob=0.05, twist=11)), speed=4.2)
    # sidestep out of somebody's way, and a slow turn on the spot
    clip(rig, 'sidestep', 0.8, [(0, {}), (0.25, P(tL=(4, 0, -16), sL=-22, at=(0.03, 0, -0.02), sp=(0, 0, 4))),
                                (0.5, P(tL=(0, 0, -9), tR=(0, 0, -9), at=(0.0, 0, -0.01))), (0.8, {})], loop=False)

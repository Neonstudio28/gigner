"""Standing idles and small solo actions."""
from npc_clips import P, mir, over, clip, REL

HIPS = P(aL=(-18, 0, -42), fL=(25, 0, 100), aR=(-18, 0, 42), fR=(25, 0, -100))
CROSS = P(aL=(32, 0, -4), fL=(98, -78, 0), aR=(32, 0, 4), fR=(86, 78, 0))
SHIFT = P(at=(0.04, 0, -0.006), tL=(0, 0, 3), tR=(5, 0, 3), sR=-9, sp=(0, 0, -3), hd=(0, 0, 2))
BREATH = P(ch=1.6, sp=0.6, hd=-1.2)


def make(rig):
    b = lambda base, **kw: over({**base, **BREATH}, **kw)
    clip(rig, 'idle', 4.0, [(0, {}), (2.0, b({}, aL=(4, 0, -9), aR=(4, 0, 9)))])
    clip(rig, 'idle_shift', 7.0, [(0, {}), (1.4, SHIFT), (3.2, {**SHIFT, **BREATH}), (4.6, mir(SHIFT)), (6.2, mir(SHIFT))])
    clip(rig, 'look_around', 6.0, [(0, {}), (1.0, P(hd=(0, 42, 0), ch=(0, 10, 0))), (2.4, P(hd=(4, 38, 0), ch=(0, 10, 0))),
                                   (3.4, P(hd=(0, -36, 0), ch=(0, -9, 0))), (5.0, P(hd=(-3, -40, 0), ch=(0, -9, 0)))])
    clip(rig, 'hips', 5.0, [(0, HIPS), (1.6, {**HIPS, **SHIFT, **BREATH}), (3.4, {**HIPS, **mir(SHIFT)})], base=HIPS)
    clip(rig, 'cross', 5.0, [(0, CROSS), (2.0, over({**CROSS, **BREATH}, hd=(0, 14, 0))), (3.6, over(CROSS, hd=(-4, -10, 0)))], base=CROSS)
    lean = over(CROSS, sp=7, at=(0, 0.035, -0.02), tR=28, sR=-74, hd=-4)
    clip(rig, 'lean', 5.0, [(0, lean), (2.2, over(lean, hd=(-2, 26, 0), ch=1.5)), (3.8, over(lean, hd=(-8, -12, 0)))], base=lean, wall=True)
    look = P(aL=(34, 0, -10), fL=(104, -58, 0), hd=(-24, 12, 0), sp=-3)
    clip(rig, 'watch', 3.0, [(0, {}), (0.7, look), (2.1, look), (3.0, {})], loop=False)
    up = P(aL=(168, 0, -22), aR=(168, 0, 22), fL=8, fR=8, sp=9, hd=16, at=(0, 0, 0.01))
    clip(rig, 'stretch', 4.0, [(0, {}), (1.1, up), (2.4, over(up, sp=(9, 0, 5))), (3.2, P(aL=(60, 0, -60), aR=(60, 0, 60))), (4.0, {})], loop=False)
    ear = P(aL=(36, 0, -22), fL=(144, 0, 16), hd=(0, 0, 9))
    clip(rig, 'phone', 6.0, [(0, ear), (1.5, over(ear, aR=(18, 0, 10), fR=(70, 20, 0), hd=(0, 10, 9))), (3.0, over(ear, hd=(-6, -8, 9), sp=(0, 0, -2))),
                             (4.5, over(ear, aR=(10, 0, 14), fR=(48, 30, 0)))], base=ear, prop='hand.L')
    txt = P(aL=(22, 0, -5), fL=(92, -34, 0), aR=(22, 0, 5), fR=(92, 34, 0), hd=-27, sp=-3)
    clip(rig, 'text', 5.0, [(0, txt), (1.2, over(txt, hR=(12, 0, 0), hd=-29)), (2.4, over(txt, hL=(12, 0, 0))), (3.6, over(txt, hd=(-20, 6, 0)))], base=txt, prop='hand.R')
    puff = P(aR=(46, 0, 12), fR=(132, 12, 0), hd=-3)
    down = P(aR=(8, 0, 12), fR=(30, 0, 0))
    clip(rig, 'smoke', 7.0, [(0, down), (1.0, puff), (2.2, puff), (3.2, over(down, hd=(10, 14, 0))), (5.4, over(down, hd=(0, -12, 0)))], base=down, prop='hand.R')
    sip = P(aR=(50, 0, 10), fR=(128, 14, 0), hd=10)
    held = P(aR=(14, 0, 8), fR=(82, 8, 0))
    clip(rig, 'drink_stand', 6.0, [(0, held), (1.0, sip), (2.0, sip), (3.0, held), (4.5, over(held, hd=(0, 22, 0)))], base=held, prop='hand.R')
    scr = P(aR=(120, 0, 38), fR=(118, 0, -30), hd=(-8, 0, -6))
    clip(rig, 'scratch_head', 3.0, [(0, {}), (0.8, scr), (1.3, over(scr, fR=(108, 0, -30))), (1.8, scr), (3.0, {})], loop=False)
    wait = P(aL=(-12, 0, -4), fL=(20, 0, 52), aR=(-12, 0, 4), fR=(20, 0, -52))      # hands clasped behind the back
    clip(rig, 'wait', 6.0, [(0, wait), (1.5, over(wait, at=(0, 0, 0.015), ftL=-6, ftR=-6)), (2.2, wait), (4.0, over(wait, hd=(6, 30, 0)))], base=wait)

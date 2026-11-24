"""Work routines and reactions."""
from npc_clips import P, mir, over, clip, REL

SQUAT = P(at=(0, 0.2, -0.47), tL=(95, 0, -8), tR=(95, 0, 8), sL=-120, sR=-120, ftL=25, ftR=25)
CROUCH = P(at=(0, 0.17, -0.33), tL=70, tR=70, sL=-100, sR=-100, ftL=30, ftR=30)


def make(rig):
    s1 = P(sp=-14, ch=(0, 18, 0), aL=(42, 0, -5), fL=(58, -30, 0), aR=(22, 0, 5), fR=(96, 40, 0), hd=-12)
    s2 = P(sp=-16, ch=(0, -16, 0), aL=(30, 0, -5), fL=(74, -36, 0), aR=(34, 0, 5), fR=(80, 34, 0), hd=-12)
    clip(rig, 'sweep', 1.8, [(0, s1), (0.9, s2)], base=s1, prop='both')
    r1 = P(sp=-20, aL=(62, 0, -4), fL=(30, -20, 0), aR=(46, 0, 4), fR=(52, 26, 0), hd=-8, tL=14, sL=-10, tR=-10, sR=-8, at=(0, 0, -0.02))
    r2 = P(sp=-8, aL=(26, 0, -4), fL=(88, -28, 0), aR=(8, 0, 4), fR=(102, 32, 0), hd=-14, tL=14, sL=-10, tR=-10, sR=-8, at=(0, 0, -0.02))
    clip(rig, 'rake', 2.0, [(0, r1), (1.0, r2)], base=r1, prop='both')
    h1 = P(sp=-10, aR=(44, 0, 6), fR=(124, 0, 0), aL=(34, 0, -6), fL=(60, -20, 0), hd=-14)
    h2 = P(sp=-13, aR=(50, 0, 6), fR=(38, 0, 0), aL=(34, 0, -6), fL=(60, -20, 0), hd=-16)
    clip(rig, 'hammer', 0.9, [(0, h1), (0.3, h2), (0.45, over(h2, fR=(52, 0, 0)))], base=h1, prop='hand.R')
    wr = P(aL=(22, 0, -5), fL=(94, -30, 0), aR=(26, 0, 5), fR=(96, 36, 0), hd=-24, sp=-2)
    clip(rig, 'write', 5.0, [(0, wr), (0.8, over(wr, fR=(96, 26, 0))), (1.6, over(wr, fR=(92, 38, 0))), (2.4, over(wr, fR=(96, 28, 0))),
                             (3.4, over(wr, hd=(4, 0, 0), fR=(70, 10, 0))), (4.4, wr)], base=wr, prop='both')
    hold = P(aL=(22, 0, -6), fL=(84, -18, 0), aR=(22, 0, 6), fR=(84, 18, 0), sp=4)
    clip(rig, 'carry_box', 4.0, [(0, hold), (2.0, over(hold, ch=1.5, hd=(0, 16, 0)))], base=hold, prop='both')
    grab = {**SQUAT, **P(sp=-34, aL=(70, 0, -4), fL=(20, -14, 0), aR=(70, 0, 4), fR=(20, 14, 0), hd=6)}
    clip(rig, 'pickup', 2.6, [(0, {}), (0.9, grab), (1.3, grab), (2.2, hold), (2.6, hold)], loop=False, prop='both')
    clip(rig, 'putdown', 2.6, [(0, hold), (0.9, grab), (1.3, grab), (2.2, {}), (2.6, {})], loop=False, prop='both')
    g1 = {**SQUAT, **P(sp=-30, aL=(64, 0, -6), fL=(26, -16, 0), aR=(58, 0, 6), fR=(34, 16, 0), hd=-4)}
    g2 = {**SQUAT, **P(sp=-36, aL=(58, 0, -6), fL=(40, -22, 0), aR=(70, 0, 6), fR=(14, 10, 0), hd=-6)}
    clip(rig, 'garden', 2.4, [(0, g1), (1.2, g2)], base=g1)
    rod = P(aR=(30, 0, 6), fR=(72, 10, 0), aL=(22, 0, -6), fL=(84, -34, 0), hd=-2)
    clip(rig, 'fish', 8.0, [(0, rod), (3.0, over(rod, hd=(0, 20, 0), ch=1.5)), (5.0, rod), (5.4, over(rod, aR=(46, 0, 6), fR=(104, 10, 0), sp=5)), (6.2, rod)], base=rod, prop='hand.R')
    wp = P(sp=-17, aR=(52, 0, 10), fR=(40, 26, 0), aL=(18, 0, -10), fL=(50, 0, 0), hd=-12)
    clip(rig, 'wipe', 1.6, [(0, wp), (0.4, over(wp, aR=(60, 0, 2), fR=(30, -4, 0))), (0.8, over(wp, aR=(50, 0, -4), fR=(44, -24, 0))), (1.2, over(wp, aR=(44, 0, 6), fR=(56, 6, 0)))], base=wp, prop='hand.R')
    tray = P(aL=(12, 0, -8), fL=(94, 12, 0), aR=(6, 0, 8), fR=20)
    clip(rig, 'serve', 5.0, [(0, tray), (2.0, over(tray, hd=(0, -20, 0), ch=1.5)), (3.6, over(tray, hd=(-6, 14, 0)))], base=tray, prop='hand.L')
    till = P(aL=(26, 0, -4), fL=(70, -10, 0), aR=(30, 0, 4), fR=(66, 12, 0), hd=-14)
    clip(rig, 'counter', 5.0, [(0, till), (0.6, over(till, fR=(58, 4, 0))), (1.2, till), (1.8, over(till, fL=(60, -4, 0))), (3.0, over(till, hd=(0, 0, 0), aR=(8, 0, 8), fR=24)), (4.2, till)], base=till)
    # ---- reactions -------------------------------------------------------------------------------------------
    sh = P(sp=12, aL=(96, 0, -18), fL=(92, -30, 0), aR=(104, 0, 18), fR=(96, 30, 0), hd=(8, 0, 0), tR=-14, sR=-6, tL=10, at=(0, 0.1, -0.02))
    clip(rig, 'flinch', 1.3, [(0, {}), (0.22, sh), (0.7, sh), (1.3, {})], loop=False)
    cw = {**CROUCH, **P(sp=-30, aL=(150, 0, -18), fL=(112, 0, 30), aR=(150, 0, 18), fR=(112, 0, -30), hd=-22)}
    clip(rig, 'cower', 1.6, [(0, cw), (0.8, over(cw, sp=-33, hd=-26))], base=cw)
    look = P(aR=(120, 0, 30), fR=(110, 30, 0), hd=(10, 0, 0), sp=4)     # shading the eyes, looking up at the sky
    clip(rig, 'look_sky', 3.0, [(0, {}), (0.7, look), (2.2, over(look, hd=(12, 16, 0))), (3.0, {})], loop=False)
    cold = P(aL=(34, 0, -2), fL=(104, -80, 0), aR=(34, 0, 2), fR=(92, 80, 0), sp=-6, hd=-8, ch=-2)   # huddled in the rain
    clip(rig, 'huddle', 3.0, [(0, cold), (0.75, over(cold, at=(0.01, 0, 0))), (1.5, cold), (2.25, over(cold, at=(-0.01, 0, 0)))], base=cold)

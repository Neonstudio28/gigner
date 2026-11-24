"""Hand-held extras: separate assets with the origin at the grip.

Carried props (briefcase, shopping_bag, guitar_case, umbrella_closed) hang below the origin with the handle running
front to back (Y), so they drop straight into a hand that hangs at the side. coffee_cup and newspaper are held in a
raised hand: origin in the middle of the part the fingers wrap.
"""
import math
from people_geo import *

PROPS = {}
STEEL, BRASS = ('metal', '#b4b2ac'), ('metal', '#c9a441')


def prop(fn):
    PROPS[fn.__name__] = fn
    return fn


def done(p, name, **ex):
    return p.obj(name, (0, 0, 0)), ex


def handle(p, span, rise, r, spec, n=6, z0=0.0, lugs=None):
    """Arched carry handle along Y whose top bar passes through z=0; ends drop to -rise + z0."""
    h = span / 2
    path = [V(0, -h, -rise), V(0, -h, -r * 1.2), V(0, -h + r * 2.4, 0), V(0, h - r * 2.4, 0), V(0, h, -r * 1.2), V(0, h, -rise)]
    p.tube([q + V(0, 0, z0) for q in path], [r] * 6, spec, n=n, e=2.2, up=X)
    if lugs:
        for sg in (-1, 1):
            p.box(V(0, sg * h, -rise + z0), (r * 3.4, r * 3.6, r * 2.0), lugs, r * .5)


@prop
def coffee_cup():
    p = Part()
    n = 12
    prof = [(-.058, .029), (-.054, .031), (.038, .040), (.046, .0425), (.052, .0425), (.056, .040)]
    rr = [ring(V(0, 0, z), r, r, n, 2.0) for z, r in prof]
    p.loft(rr[:3], '#ece8df')
    p.loft(rr[2:], '#f4f2ec', cap0=False)
    p.loft([ring(V(0, 0, z), r, r, n, 2.0) for z, r in ((-.022, .0372), (-.020, .0384), (.022, .0420), (.024, .0408))], '#9a6a3c')   # sleeve
    p.loft([ring(V(0, 0, z), r, r, n, 2.0) for z, r in ((.056, .036), (.062, .033), (.062, .012))], '#f4f2ec', cap0=False)        # lid top
    p.box(V(0, -.024, .0635), (.016, .010, .004), '#3a2a20', .001)                                                                # sip hole
    p.slab(V(0, -.0425, 0), (.030, .004, .020), '#b23a32', .002)                                                                  # label block
    return done(p, 'coffee_cup', hold='hand', axis='z', note='origin on the cup axis at mid height')


@prop
def briefcase():
    p = Part()
    w, d, h, top = .44, .105, .315, -.058
    zc = top - h / 2
    body = '#5a3b28'
    p.box(V(0, 0, zc), (d, w, h), body, .016, segs=2)
    p.box(V(0, 0, top - .085), (d + .006, w + .006, .010), '#3f281a', .002)                 # lid seam
    for sy in (-1, 1):
        for sz in (-1, 1):                                                                # corner guards
            p.box(V(0, sy * (w / 2 - .020), zc + sz * (h / 2 - .020)), (d + .008, .046, .046), '#3f281a', .010)
        p.box(V(-d / 2 - .002, sy * .125, top - .060), (.010, .036, .048), BRASS, .003)      # latches
        p.box(V(-d / 2 - .004, sy * .125, top - .090), (.010, .022, .014), BRASS, .002)
        p.box(V(d / 2, sy * .130, top - .085), (.010, .050, .020), BRASS, .003)              # hinges
        for sx in (-1, 1):
            p.box(V(sx * .030, sy * .165, top - h - .004), (.020, .020, .010), STEEL, .003)   # feet
    p.box(V(-d / 2 - .002, 0, top - .060), (.008, .050, .030), BRASS, .003)                  # lock plate
    handle(p, .150, .060, .0105, '#2f1f15', lugs=BRASS)
    return done(p, 'briefcase', hold='hang', axis='y')


@prop
def shopping_bag():
    p = Part()
    top, h = -.150, .330
    rr = [[V(sx * a, sy * b, z) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))] for z, a, b in
          ((top - h, .060, .130), (top - h * .5, .066, .136), (top, .052, .140))]
    p.loft(rr, '#c9a36a', cap1=False)
    p.loft([rr[2], [q * .93 + V(0, 0, -.004 - q.z * .07) for q in rr[2]]], '#8f7146', cap0=False)       # dark inside
    for sx in (-1, 1):
        c = V(sx * .0535, 0, top - .020)
        p.slab(c, (.240, .006, .036), '#b8905a', 0, rot=rot('Z', 90 * sx))                              # folded rim
        p.slab(V(sx * .0625, 0, top - h * .52), (.150, .006, .110), '#b23a32', .012, rot=rot('Z', 90 * sx))   # print block
        p.slab(V(sx * .0655, 0, top - h * .52), (.086, .006, .050), '#ece8df', .008, rot=rot('Z', 90 * sx))
        path = [V(sx * .050, -.055, top - .030), V(sx * .046, -.052, top + .050), V(sx * .012, -.030, -.004),
                V(sx * .012, .030, -.004), V(sx * .046, .052, top + .050), V(sx * .050, .055, top - .030)]
        p.tube(path, [.0055] * 6, '#ece8df', n=5, up=X)
    # groceries peeking out
    p.box(V(.008, -.060, top + .020), (.060, .085, .110), '#6f8f4a', .008)
    p.tube([V(-.004, .050, top - .06), V(-.010, .062, top + .11)], [.026, .024], '#d9c9a0', n=8)       # baguette
    p.ball(V(-.010, .062, top + .11), (.024, .024, .020), '#c9a36a', n=8)
    p.ball(V(.012, .004, top + .012), (.038, .038, .032), '#d8503c', n=8)
    return done(p, 'shopping_bag', hold='hang', axis='y')


@prop
def newspaper():
    p = Part()
    L, W = .300, .110
    pap, ink = '#e4dfd0', '#55524c'
    for i, (z, k) in enumerate(((-.012, 1.0), (-.004, .985), (.004, .97), (.012, .985))):       # folded leaves, rounded spine
        p.box(V(0, -.020, z), (W * k, L, .0085), pap if i % 2 == 0 else '#d6d0bf', .003)
    p.tube([V(-W / 2 + .004, -.020 - L / 2 + .004, 0), V(-W / 2 + .004, -.020 + L / 2 - .004, 0)], [(.0165, .009)] * 2, pap, n=6, up=Z)
    top = .0165
    p.slab(V(.004, -.135, top), (.080, .003, .030), ink, .002, rot=rot('X', 90))               # masthead
    p.slab(V(-.022, -.060, top), (.034, .003, .090), ink, 0, rot=rot('X', 90))                 # columns
    p.slab(V(.024, -.075, top), (.040, .003, .060), '#8f8a7e', .002, rot=rot('X', 90))        # photo
    p.slab(V(.024, -.022, top), (.040, .003, .020), ink, 0, rot=rot('X', 90))
    p.slab(V(0, .050, top), (.084, .003, .060), ink, 0, rot=rot('X', 90))
    p.slab(V(0, -.020, -top), (.084, .003, .220), '#8f8a7e', .004, rot=rot('X', -90))
    return done(p, 'newspaper', hold='hand', axis='y', note='folded paper, long axis Y, origin 13 cm from the back end')


@prop
def guitar_case():
    p = Part()
    d, top = .135, -.062
    shell, trim = '#2b2a2c', '#4a3324'
    # outline in the YZ plane: body at +Y (back), neck towards -Y (front); rows (y, z_top, z_bottom)
    prof = [(-.62, -.020, -.150), (-.60, -.004, -.168), (-.44, .0, -.176), (-.20, .0, -.190), (-.10, .0, -.250), (.0, .0, -.330),
            (.12, .0, -.385), (.26, .0, -.400), (.37, -.012, -.375), (.43, -.060, -.300), (.445, -.130, -.220)]
    def sec(k, grow=0.0, half=d / 2):
        y, zt, zb = prof[k]
        zt, zb = zt + top + grow, zb + top - grow
        b = .018
        return [V(-half, y, zt - b), V(-half + b, y, zt), V(half - b, y, zt), V(half, y, zt - b),
                V(half, y, zb + b), V(half - b, y, zb), V(-half + b, y, zb), V(-half, y, zb + b)]
    p.loft([sec(k) for k in range(len(prof))], shell)
    for k0, k1 in ((0, 1), (len(prof) - 2, len(prof) - 1)):                                    # end bumpers
        p.loft([[q + V(0, (-.004 if k0 == 0 else .004), 0) for q in sec(k0, .004, d / 2 + .004)], sec(k1, .004, d / 2 + .004)][::1], trim)
    for k in range(1, len(prof) - 2):                                                          # lid seam + piping
        a, b = prof[k], prof[k + 1]
        for zt in (0, 1):
            za, zb = (a[1], b[1]) if zt else (a[2], b[2])
            p.tube([V(-.022, a[0], za + top), V(-.022, b[0], zb + top)], [.006, .006], trim, n=4)
    for y in (-.40, -.05, .28):
        p.box(V(-.022, y, top + .002), (.030, .040, .012), BRASS, .003)                        # latches
    for y in (-.50, .30):
        zb = interp([(a, c) for a, _, c in prof], y)[0] + top
        p.box(V(.030, y, zb - .004), (.024, .030, .012), STEEL, .003)                          # feet
        p.box(V(-.030, y, zb - .004), (.024, .030, .012), STEEL, .003)
    handle(p, .150, .062, .011, trim, lugs=BRASS)
    return done(p, 'guitar_case', hold='hang', axis='y', note='neck end points forward (-Y)')


@prop
def umbrella_closed():
    p = Part()
    wood, cloth = '#6a4528', '#2f4f7a'
    # crook handle: grip is the straight part through the origin
    path = [V(0, .070, -.035), V(0, .074, .020), V(0, .050, .058), V(0, .016, .056), V(0, 0, .030), V(0, 0, -.060)]
    p.tube(path, [.0115, .012, .012, .012, .012, .0125], wood, n=7, up=X)
    p.ball(path[0], .0115, wood, n=7)
    p.tube([V(0, 0, -.060), V(0, 0, -.074)], [.015, .015], BRASS, n=8)                          # collar
    n = 8
    prof = [(-.074, .012), (-.090, .030), (-.20, .034), (-.44, .028), (-.60, .017), (-.625, .009)]
    rr = []
    for i, (z, r) in enumerate(prof):                                                          # pleated wrap
        tw = math.radians(i * 9)
        rr.append([V(r * (1.0 if k % 2 else .78) * math.cos(tw + k * math.pi / n),
                     r * (1.0 if k % 2 else .78) * math.sin(tw + k * math.pi / n), z) for k in range(2 * n)])
    p.loft(rr, cloth)
    p.tube([V(0, 0, -.260), V(0, 0, -.282)], [.0335, .0330], '#22385a', n=10)                   # strap
    p.box(V(0, -.033, -.271), (.014, .008, .014), BRASS, .003)
    p.tube([V(0, 0, -.625), V(0, 0, -.650), V(0, 0, -.700)], [.008, .0065, .0045], STEEL, n=6)  # ferrule
    for k in range(4):                                                                         # rib tips
        a = k * math.pi / 2 + .4
        p.ball(V(.030 * math.cos(a), .030 * math.sin(a), -.092), .005, STEEL, n=4)
    return done(p, 'umbrella_closed', hold='hang', axis='z', note='carried by the crook like a cane; tip 0.70 m below the grip')

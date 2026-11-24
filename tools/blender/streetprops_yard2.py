"""Yard and work props, part 2: crates, drums, tanks, hose reel, donation bin, garden and play things."""
import math
from streetprops_kit import *
from streetprops_furniture import STEEL, DARK, BLACK, CREAM, BODY, body_mat, legs
from streetprops_furniture2 import lerp, wire

F12 = math.cos(math.radians(15))          # facet distance of a 12-sided lathe with phase 0.5 (a flat facet faces -Y)


@asset('yard2')
def crates():
    a = Asset('crate_wood_a')
    w1, w2, w3 = P('#b08a5b'), P('#9c7a4f'), P('#8a6a44')
    W, D, H = 0.6, 0.4, 0.34
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(w3, 0.04, 0.04, H, (sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), H / 2))
    for i in range(3):
        z = 0.06 + i * 0.11
        for sy in (-1, 1):
            a.box(w1 if i % 2 == 0 else w2, W + 0.02, 0.014, 0.09, (0, sy * (D / 2 + 0.005), z), 0.003, 'x')
        for sx in (-1, 1):
            a.box(w2 if i % 2 == 0 else w1, 0.014, D, 0.09, (sx * (W / 2 + 0.005), 0, z), 0.003, 'y')
    for i in range(4):
        a.box(w2, W - 0.02, 0.085, 0.012, (0, lerp(-0.14, 0.14, i / 3), 0.02))
    a.decal('stencil_b', 0.24, 0.09, (0, -D / 2 - 0.0155, 0.17))
    for i, (x, y, c) in enumerate(((-0.17, -0.07, '#b8372b'), (0.0, -0.08, '#c8442f'), (0.17, -0.06, '#b8372b'), (-0.09, 0.08, '#c8442f'), (0.1, 0.08, '#a82f26'))):
        a.sphere(P(c), 0.075, (x, y, 0.26 + 0.02 * rnd(i, 4)), 7, 4)
    b = Asset('crate_wood_b')
    S = 0.8
    b.box(w3, 0.1, S - 0.1, 0.05, (-0.26, 0, 0.025))                          # skids
    b.box(w3, 0.1, S - 0.1, 0.05, (0.26, 0, 0.025))
    with b.at((0, 0, 0.05)):
        b.box(w2, S - 0.04, S - 0.04, S - 0.04, (0, 0, S / 2))
        for i in range(4):
            with b.at(rot=(0, 0, 90 * i)):
                y = -S / 2 + 0.012
                b.rim(w1, S if i % 2 == 0 else S - 0.048, S, (0, y, S / 2), 0.09 if i % 2 == 0 else 0.066, 0.024)
                b.bar(w3, [(-S / 2 + 0.09, y, 0.1), (S / 2 - 0.09, y, S - 0.1)], 0.08, 0.02, up=(0, 1, 0))
        b.rim(w1, S - 0.048, S - 0.048, (0, 0, S - 0.012), 0.066, 0.024, (90, 0, 0))
        b.box(w3, S - 0.18, 0.09, 0.02, (0, 0, S - 0.012))
        b.decal('stencil_a', 0.3, 0.1125, (0.14, -S / 2 + 0.0165, 0.25))
    return [a, b]


def drum(a, m, at=(0, 0, 0), rot=(0, 0, 0), r=0.29, h=0.88, label=True, lid=None):
    with a.at(at, rot):
        prof = [(0, 0.012), (r - 0.012, 0.012), (r - 0.012, 0), (r + 0.006, 0), (r + 0.006, 0.02), (r, 0.03)]
        for z in (h * 0.33, h * 0.67):
            prof += [(r, z - 0.03), (r + 0.012, z - 0.012), (r + 0.012, z + 0.012), (r, z + 0.03)]
        prof += [(r, h - 0.03), (r + 0.006, h - 0.02), (r + 0.006, h), (r - 0.012, h), (r - 0.012, h - 0.02), (0, h - 0.02)]
        a.lathe(m, prof, 12, phase=0.5)
        a.lathe(lid or m, [(r - 0.013, h - 0.019), (0, h - 0.019)], 12, phase=0.5, caps=False)
        a.cz(MT('#b9bec2'), 0.035, h - 0.02, h - 0.006, x=0.0, y=-r * 0.6, n=8)
        a.cz(MT('#b9bec2'), 0.018, h - 0.02, h - 0.008, x=0.0, y=r * 0.62, n=6)
        if label:
            a.decal('drum_lbl', 0.14, 0.14, (0, -r * F12 - 0.0035, h * 0.5))


@asset('yard2')
def barrels():
    a = Asset('barrel_steel')
    drum(a, body_mat(), lid=P('#3a3d42'))
    a.extras['tints'] = {'body': ['#2a559b', '#b8281f', '#2f6a49', '#e3b62e']}
    r_ = Asset('barrel_steel_rusty')
    drum(r_, P('#8a4f2d'), label=False, lid=P('#6f3f25'))
    r_.lathe(P('#a8623a'), [(0.2915, 0.36), (0.2915, 0.5)], 12, phase=0.5, caps=False)
    r_.lathe(P('#2a2420'), [(0.2, 0.862), (0, 0.862)], 10, caps=False)               # standing water in the lid
    b = Asset('barrel_wood')
    wood, wood2, hoop = P('#8a5f3a'), P('#74502f'), MT('#4f5356')
    R = lambda z: 0.25 + 0.085 * math.sin(math.pi * z / 0.9)
    zs = [0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9]
    b.lathe(wood, [(0, 0.03), (R(0) - 0.02, 0.03), (R(0) - 0.02, 0)] + [(R(z), z) for z in zs] + [(R(0.9) - 0.02, 0.9), (R(0.9) - 0.02, 0.87), (0, 0.87)], 14)
    b.lathe(wood2, [(R(0.9) - 0.021, 0.871), (0, 0.871)], 14, caps=False)
    for z in (0.06, 0.24, 0.66, 0.84):
        b.lathe(hoop, [(R(z - 0.025) + 0.004, z - 0.025), (R(z + 0.025) + 0.004, z + 0.025)], 14, caps=False)
    b.cyl(wood2, 0.03, (0, -R(0.45), 0.45), (0, -R(0.45) - 0.02, 0.45), 8)
    return [a, r_, b]


@asset('yard2')
def propane_tank():
    a = Asset('propane_tank')
    wh, wh2, bz = P('#e4e2da'), P('#cfcdc4'), MT('#b08a3c')
    r = 0.155
    a.lathe(wh2, [(0.11, 0), (0.115, 0), (0.115, 0.05), (0.11, 0.05)], 12, phase=0.5, loop=True)
    a.lathe(wh, [(0, 0.03), (0.08, 0.035), (0.135, 0.07), (r, 0.12), (r, 0.33), (0.135, 0.38), (0.08, 0.415), (0, 0.42)], 12, phase=0.5)
    a.lathe(P('#b9b7ae'), [(r + 0.002, 0.215), (r + 0.002, 0.235)], 12, phase=0.5, caps=False)
    # collar: three quarters of a ring with a hand slot
    pts = [(0.105 * math.cos(rad(t)), 0.105 * math.sin(rad(t))) for t in range(-45, 226, 30)]
    k = len(pts)
    vv = [(x, y, 0.39) for x, y in pts] + [(x, y, 0.5) for x, y in pts]
    a.mesh(wh2, vv, [[i, i + 1, k + i + 1, k + i] for i in range(k - 1)], closed=False)
    a.mesh(wh, [(x * 0.97, y * 0.97, z) for x, y, z in vv], [[i + 1, i, k + i, k + i + 1] for i in range(k - 1)], closed=False)
    a.cz(bz, 0.022, 0.415, 0.47, n=6)
    a.cyl(bz, 0.014, (0, 0, 0.455), (0, -0.07, 0.455), 6)
    a.lathe(P('#3f8f6a'), [(0, 0.47), (0.04, 0.47), (0.045, 0.485), (0.03, 0.5), (0, 0.5)], 6)
    a.decal('flammable', 0.076, 0.057, (0, -r * F12 - 0.0035, 0.28))
    return a


@asset('yard2')
def gas_can():
    a = Asset('gas_can')
    red, ye, bk = P('#b8281f'), P('#e3b62e'), P(BLACK)
    a.box(red, 0.24, 0.34, 0.3, (0, 0, 0.15), 0.03)
    a.box(P('#9c2019'), 0.245, 0.3, 0.012, (0, 0, 0.1))
    a.box(P('#9c2019'), 0.245, 0.3, 0.012, (0, 0, 0.2))
    a.prism(red, [(-0.14, 0.29), (0.1, 0.29), (0.1, 0.33), (0.02, 0.37), (-0.14, 0.37)], -0.035, 0.035, 'yz', 0.008)
    a.tube(ye, [(0, 0.1, 0.3), (0, 0.13, 0.36), (0, 0.24, 0.44)], 0.016, 6)
    a.cyl(bk, 0.024, (0, 0.1, 0.295), (0, 0.118, 0.33), 8)
    a.cz(bk, 0.022, 0.37, 0.39, y=-0.09, n=8)
    a.decal('gascan', 0.13, 0.13, (-0.1235, 0, 0.15), (0, 0, -90))
    a.decal('gascan', 0.13, 0.13, (0.1235, 0, 0.15), (0, 0, 90))
    return a


@asset('yard2')
def garden_hose_reel():
    a = Asset('garden_hose_reel')
    gy, gr, st = P('#6d757a'), P('#2f8f4f'), MT('#b9bec2')
    zc = 0.42
    for s in a.mx():
        a.cyl(gy, 0.25, (0.17, 0, zc), (0.185, 0, zc), 12, bev=0.006)
        a.tube(st, fillet([(0.2, -0.26, 0), (0.2, -0.08, zc + 0.3), (0.2, 0.08, zc + 0.3), (0.2, 0.26, 0)], 0.05, 2), 0.013, 6)
        a.box(RB(), 0.04, 0.06, 0.02, (0.2, -0.26, 0.01))
        a.box(RB(), 0.04, 0.06, 0.02, (0.2, 0.26, 0.01))
    a.cyl(gy, 0.09, (-0.17, 0, zc), (0.17, 0, zc), 10, caps=False)
    for i in range(5):
        x = -0.13 + i * 0.065
        a.torus(gr, 0.17, 0.034, (x, 0, zc), (0, 90, 0), 12, 5)
    a.cyl(st, 0.012, (0.185, 0, zc), (0.25, 0, zc), 6)
    a.tube(st, [(0.24, 0, zc), (0.24, 0.1, zc - 0.06), (0.3, 0.1, zc - 0.06)], 0.009, 5)
    a.cyl(P(BLACK), 0.016, (0.26, 0.1, zc - 0.06), (0.33, 0.1, zc - 0.06), 6)
    a.cyl(st, 0.011, (-0.2, 0, zc + 0.3), (0.2, 0, zc + 0.3), 6)
    a.cyl(P(BLACK), 0.017, (-0.12, 0, zc + 0.3), (0.12, 0, zc + 0.3), 6)
    # loose end with nozzle on the ground
    a.tube(gr, fillet([(-0.1, -0.16, zc - 0.1), (-0.12, -0.3, 0.03), (0.1, -0.5, 0.022), (0.36, -0.44, 0.022)], 0.12, 3), 0.02, 6)
    a.cyl(MT('#b08a3c'), 0.024, (0.36, -0.44, 0.022), (0.44, -0.42, 0.03), 6, r2=0.014)
    return a


@asset('yard2')
def donation_bin():
    a = Asset('donation_bin')
    gr, dk, st, wh = P('#2f7a5a'), P('#235e45'), MT('#8f979c'), P('#eeebe2')
    W, D = 1.2, 1.05
    for s in a.mx():
        a.box(dk, 0.1, D - 0.1, 0.08, (W / 2 - 0.12, 0, 0.04))
    a.prism(gr, [(-D / 2, 0.08), (D / 2, 0.08), (D / 2, 1.95), (-0.1, 1.95), (-D / 2, 1.6)], -W / 2, W / 2, 'yz', 0.02)
    a.box(dk, W + 0.04, D + 0.04, 0.03, (0, 0, 0.1))
    # hopper door: pull-down chute with a handle
    a.box(dk, 0.84, 0.03, 0.44, (0, -D / 2 - 0.005, 1.33), 0.01, 'xz')
    with a.at((0, -D / 2 - 0.02, 1.13), (-14, 0, 0)):
        a.box(st, 0.76, 0.02, 0.4, (0, -0.01, 0.2), 0.008, 'xz')
        a.handle(MT('#c9cdd0'), (-0.2, -0.02, 0.33), (0.2, -0.02, 0.33), (0, -0.05, 0), 0.01)
    a.decal('donate', 0.72, 0.66, (0, -D / 2 - 0.0035, 0.66))
    a.rim(wh, 0.78, 0.72, (0, -D / 2 - 0.004, 0.66), 0.03, 0.01)
    for s in a.mx():
        a.bolts(st, [(W / 2 - 0.06, -D / 2 - 0.002, z) for z in (0.3, 1.0)], 0.016, 0.01)
    a.decal('donate', 0.6, 0.55, (-W / 2 - 0.0035, 0.04, 0.95), (0, 0, -90))
    a.decal('donate', 0.6, 0.55, (W / 2 + 0.0035, 0.04, 0.95), (0, 0, 90))
    # service door on the back with a padlock hasp
    a.box(dk, 0.8, 0.02, 1.2, (0, D / 2 + 0.008, 0.8), 0.01, 'xz')
    a.box(st, 0.1, 0.03, 0.05, (0.3, D / 2 + 0.03, 0.8))
    a.box(MT('#b08a3c'), 0.05, 0.02, 0.06, (0.3, D / 2 + 0.05, 0.75))
    return a


# ------------------------------------------------------------------ garden and play
@asset('yard2')
def doghouse():
    a = Asset('doghouse')
    wall, wall2, trim, dk = P('#b5553c'), P('#9c4631'), P('#eeebe2'), P('#1e1b18')
    r1, r2, r3 = P('#4a4f52'), P('#5a6063'), P('#3d4245')
    a.box(P('#7b5d40'), 0.86, 1.06, 0.05, (0, 0, 0.025), 0.008)
    a.prism(wall, [(-0.4, 0.04), (0.4, 0.04), (0.4, 0.55), (0, 0.9), (-0.4, 0.55)], -0.5, 0.5, 'xz')
    for z in (0.17, 0.3, 0.43):
        a.box(wall2, 0.806, 1.006, 0.012, (0, 0, z))
    for s in a.mx():
        for t in a.mx(1):
            a.box(trim, 0.045, 0.045, 0.5, (0.395, 0.495, 0.3))
    top = [(0.16 * math.cos(rad(t)), 0.36 + 0.16 * math.sin(rad(t))) for t in range(0, 181, 30)]
    a.prism(dk, [(-0.16, 0.05), (0.16, 0.05)] + top, -0.512, -0.49, 'xz')
    a.tube(trim, [(0.175, -0.515, 0.05)] + [(x * 1.09, -0.515, 0.36 + (z - 0.36) * 1.09) for x, z in top] + [(-0.175, -0.515, 0.05)], 0.02, 4, phase=0.5)
    a.box(trim, 0.24, 0.012, 0.1, (0, -0.504, 0.66), 0.006, 'xz')
    a.decal('dog_name', 0.2, 0.075, (0, -0.5135, 0.66))
    ang = math.degrees(math.atan2(0.35, 0.4))
    for s in a.mx():
        with a.at((0, 0, 0.9), (0, ang, 0)):
            a.box(r1, 0.68, 1.16, 0.035, (0.33, 0, 0.02), 0.006, 'y')
            for i in range(4):
                a.box(r2 if i % 2 else r3, 0.166, 1.17, 0.014, (0.085 + i * 0.165, 0, 0.042 + 0.004 * (i % 2)))
            a.box(r1, 0.11, 1.18, 0.02, (0.045, 0, 0.062))
    # food bowl
    a.lathe(P('#b8281f'), [(0, 0), (0.1, 0), (0.085, 0.05), (0.07, 0.05), (0.066, 0.02), (0, 0.02)], 10, at=(0.3, -0.68, 0))
    a.lathe(P('#7b5132'), [(0.068, 0.036), (0, 0.036)], 10, at=(0.3, -0.68, 0), caps=False)
    return a


@asset('yard2')
def clothesline():
    a = Asset('clothesline')
    st, st2, ln = MT('#a3aaae'), MT('#8b9296'), P('#e9e6dc')
    H, X = 1.9, 1.6
    ys = (-0.45, -0.15, 0.15, 0.45)
    for s in a.mx():
        a.cz(P('#a39e93'), 0.11, 0, 0.03, x=X, n=8)
        a.cz(st, 0.03, 0.03, H, x=X, n=8, caps=False)
        a.cyl(st, 0.024, (X, -0.55, H), (X, 0.55, H), 8)
        for t in a.mx(1):
            a.tube(st2, [(X, 0.0, H - 0.4), (X, 0.38, H - 0.01)], 0.012, 5)
            for y in ys[2:]:
                a.torus(st2, 0.014, 0.004, (X - 0.03, y, H), (0, 0, 0), 6, 4)
    for y in ys:
        wire(a, ln, (-X, y, H - 0.02), (X, y, H - 0.02), 0.004)
    # laundry: (x centre, line, width, drop, colour)
    wash = [(-0.75, 0, 1.1, 1.05, '#e9e4d6'), (0.55, 0, 0.5, 0.75, '#c85a4a'), (-1.0, 1, 0.42, 0.6, '#4a78a8'), (-0.3, 1, 0.5, 0.8, '#e3b62e'),
            (0.75, 1, 0.75, 0.55, '#7fb08a'), (-0.5, 2, 0.6, 0.7, '#d9d3c2'), (0.45, 2, 0.4, 0.5, '#b8372b'), (0.2, 3, 0.9, 0.95, '#9cc2d6'),
            (-0.95, 3, 0.36, 0.45, '#e9e4d6')]
    for i, (x, li, w, drop, c) in enumerate(wash):
        y, z = ys[li], H - 0.02
        sw = (rnd(i, 1) - 0.5) * 7
        with a.at((x, y, z), (sw, 0, 0)):
            a.box(P(c), w, 0.008, drop, (0, 0.006, -drop / 2 + 0.004))
            a.box(P(c), w, 0.008, 0.09, (0, -0.006, -0.041))
            a.box(P(c), w, 0.02, 0.008, (0, 0, 0.008))
        for px in (-w * 0.38, w * 0.38):
            a.box(P('#b08a5b'), 0.012, 0.022, 0.06, (x + px, y, z - 0.005))
    return a


@asset('yard2')
def kiddie_pool():
    a = Asset('kiddie_pool')
    bl, bl2 = P('#3f8fd0'), P('#2f74b5')
    a.lathe(bl, [(0, 0), (0.72, 0), (0.76, 0.04), (0.77, 0.3), (0.79, 0.31), (0.79, 0.335), (0.75, 0.335), (0.74, 0.06), (0.7, 0.025), (0, 0.025)], 16)
    for z0, z1, m in ((0.07, 0.11, bl2), (0.15, 0.2, P('#f1efe6')), (0.24, 0.27, bl2)):
        a.lathe(m, [(0.7625 + z0 * 0.03, z0), (0.7625 + z1 * 0.03, z1)], 16, caps=False)
    a.lathe(LB('gloss', 'water', '#7fd0e6'), [(0.744, 0.21), (0, 0.21)], 16, caps=False)
    # rubber duck and a beach ball
    ye = P('#f2c531')
    a.sphere(ye, 0.07, (0.25, -0.2, 0.235), 8, 4, (1, 1.3, 0.75), (0, 0, 30))
    a.sphere(ye, 0.042, (0.22, -0.255, 0.3), 8, 4)
    a.box(P('#e8742a'), 0.03, 0.035, 0.012, (0.2, -0.295, 0.295), 0.004, rot=(0, 0, 30))
    a.box(ye, 0.03, 0.04, 0.03, (0.285, -0.135, 0.265), 0.008, rot=(-30, 0, 30))
    a.sphere(P('#f1efe6'), 0.13, (-0.3, 0.15, 0.3), 10, 5, rot=(20, 10, 0))
    a.lathe(P('#e3342b'), [(0.132 * math.sin(rad(t)), -0.132 * math.cos(rad(t))) for t in (62, 90, 118)], 10, at=(-0.3, 0.15, 0.3), rot=(20, 10, 0), caps=False)
    return a


@asset('yard2')
def sandbox():
    a = Asset('sandbox')
    wood, wood2, sand, sand2 = P('#b08a5b'), P('#9c7a4f'), P('#e2cf9c'), P('#d2bd88')
    a.rim(wood, 1.5, 1.5, (0, 0, 0.11), 0.07, 0.22, (90, 0, 0), 0.006)
    a.box(sand, 1.37, 1.37, 0.15, (0, 0, 0.075))
    for s in a.mx():
        for t in a.mx(1):
            a.prism(wood2, [(0.77, 0.77), (0.42, 0.77), (0.77, 0.42)], 0.22, 0.25, 'xy')
            a.bolts(MT('#8f979c'), [(0.69, 0.69, 0.25)], 0.012, 0.004, (0, 0, 1))
    for i, (x, y, r) in enumerate(((-0.3, 0.25, 0.26), (0.28, -0.3, 0.2), (0.3, 0.35, 0.16), (-0.4, -0.35, 0.18))):
        a.sphere(sand2 if i % 2 else sand, r, (x, y, 0.14), 8, 3, (1, 1, 0.3), a0=90, a1=180)
    # castle, bucket, spade
    a.cyl(sand2, 0.1, (-0.3, 0.25, 0.2), (-0.3, 0.25, 0.34), 8, r2=0.075)
    for i in range(4):
        a.box(sand2, 0.035, 0.035, 0.03, (-0.3 + 0.05 * math.cos(rad(45 + 90 * i)), 0.25 + 0.05 * math.sin(rad(45 + 90 * i)), 0.355))
    with a.at((0.1, -0.05, 0.145), (0, 0, 20)):
        a.lathe(P('#e3342b'), [(0, 0), (0.07, 0), (0.095, 0.16), (0.1, 0.165), (0.088, 0.165), (0.066, 0.012), (0, 0.012)], 10)
        a.tube(P('#f1efe6'), [(-0.097, 0, 0.15)] + arc((0, 0, 0.15), 0.1, 200, 340, 4, 'xz')[1:-1] + [(0.097, 0, 0.15)], 0.005, 4)
    with a.at((0.36, 0.0, 0.15), (0, 0, -35)):
        a.box(P('#2a559b'), 0.07, 0.1, 0.008, (0, 0, 0.006), 0.003, 'z')
        a.box(P('#e3b62e'), 0.02, 0.18, 0.016, (0, 0.13, 0.014), 0.004)
    return a


@asset('yard2')
def garden_gnome():
    a = Asset('garden_gnome')
    red, blue, skin, wh, bk = P('#c2362c'), P('#2f6aa8'), P('#e8b596'), P('#f1efe6'), P(BLACK)
    a.lathe(P('#6f8f5a'), [(0, 0), (0.105, 0), (0.105, 0.018), (0.095, 0.025), (0, 0.025)], 10)
    for s in a.mx():
        a.sphere(P('#4a3626'), 0.036, (0.042, -0.035, 0.05), 8, 4, (1, 1.5, 0.8))
        a.tube(blue, [(0.08, 0, 0.235), (0.105, -0.02, 0.175), (0.085, -0.065, 0.15)], 0.024, 6)
        a.sphere(skin, 0.024, (0.082, -0.072, 0.146), 6, 4)
    a.lathe(blue, [(0, 0.04), (0.07, 0.04), (0.092, 0.1), (0.097, 0.16), (0.085, 0.23), (0.055, 0.27), (0, 0.275)], 10)
    a.lathe(bk, [(0.097, 0.118), (0.1, 0.132), (0.097, 0.146)], 10, caps=False)
    a.box(P('#e3b62e'), 0.035, 0.012, 0.035, (0, -0.097, 0.132), 0.004, 'xz')
    a.sphere(skin, 0.066, (0, 0, 0.305), 10, 5)
    a.sphere(wh, 0.07, (0, -0.03, 0.262), 10, 5, (1.0, 0.75, 1.15))
    a.sphere(P('#e09a80'), 0.02, (0, -0.066, 0.305), 6, 4)
    for s in a.mx():
        a.box(bk, 0.012, 0.006, 0.014, (0.026, -0.058, 0.325), rot=(0, 0, 20))
        a.sphere(P('#e79f8a'), 0.016, (0.044, -0.046, 0.3), 6, 3)
    with a.at((0, 0.005, 0.325), (6, 0, 0)):
        a.lathe(red, [(0.07, 0), (0.078, 0.012), (0.06, 0.06), (0.032, 0.125), (0.012, 0.17), (0, 0.185)], 10, caps=(True, False))
    return a


@asset('yard2')
def bird_bath():
    a = Asset('bird_bath')
    st, st2 = P('#b9b4a7'), P('#a6a194')
    a.lathe(st2, [(0, 0), (0.2, 0), (0.2, 0.04), (0.16, 0.07), (0.1, 0.1)], 12, caps=(True, False))
    a.lathe(st, [(0.1, 0.1), (0.075, 0.14), (0.06, 0.3), (0.07, 0.34), (0.055, 0.38), (0.06, 0.5), (0.085, 0.56), (0.11, 0.58)], 12, caps=False)
    a.lathe(st, [(0.11, 0.58), (0.2, 0.62), (0.3, 0.68), (0.31, 0.72), (0.29, 0.72), (0.27, 0.69), (0.15, 0.655), (0, 0.65)], 14, caps=False)
    a.lathe(st2, [(0.062, 0.3), (0.075, 0.315), (0.062, 0.33)], 12, caps=False)
    a.lathe(LB('gloss', 'water', '#7fd0e6'), [(0.276, 0.7), (0, 0.7)], 14, caps=False)
    # a small bird on the rim
    with a.at((0.3, 0, 0.72), (0, 0, 115)):
        br = P('#8a5f3a')
        a.sphere(br, 0.035, (0, 0, 0.045), 8, 4, (0.8, 1.3, 0.85), (20, 0, 0))
        a.sphere(br, 0.022, (0, -0.036, 0.075), 6, 4)
        a.cyl(P('#e3b62e'), 0.007, (0, -0.055, 0.074), (0, -0.075, 0.07), 4, r2=0.001)
        a.box(P('#6b4628'), 0.025, 0.05, 0.006, (0, 0.055, 0.045), rot=(-15, 0, 0))
        a.sphere(P('#d9c9a8'), 0.026, (0, -0.012, 0.038), 6, 3, (0.8, 1.1, 0.8))
        for sx in (-0.01, 0.01):
            a.cz(P('#3a2a1c'), 0.003, 0.0, 0.022, x=sx, n=4)
    return a


@asset('yard2')
def satellite_dish_yard():
    a = Asset('satellite_dish_yard')
    wh, gy, st, dk = P('#dcdcd6'), P('#a9aca8'), MT('#8b9296'), P('#3a3d42')
    a.box(P('#a39e93'), 0.6, 0.6, 0.1, (0, 0, 0.05), 0.02, 'xyT')
    a.bolts(st, [(sx * 0.1, sy * 0.1, 0.12) for sx in (-1, 1) for sy in (-1, 1)], 0.014, 0.012, (0, 0, 1))
    a.box(st, 0.28, 0.28, 0.02, (0, 0, 0.11))
    a.cz(st, 0.055, 0.12, 1.76, n=8)
    a.box(gy, 0.16, 0.2, 0.22, (0, 0.0, 1.72), 0.02)
    a.cyl(st, 0.03, (0, -0.06, 0.95), (0, -0.25, 1.26), 6)
    a.cyl(MT('#c9cdd0'), 0.016, (0, -0.25, 1.26), (0, -0.4, 1.5), 6)
    a.box(dk, 0.07, 0.1, 0.09, (0, -0.07, 0.92), 0.012)
    f, R = 0.95, 1.2
    zf = lambda r: r * r / (4 * f)
    with a.at((0, -0.1, 1.85), (55, 0, 0)):
        rs = (0.3, 0.6, 0.9, 1.2)
        prof = [(0, -0.03)] + [(r, zf(r) - 0.03) for r in rs] + [(R + 0.015, zf(R) - 0.01), (R + 0.015, zf(R) + 0.01)] + [(r, zf(r)) for r in reversed(rs)] + [(0, 0)]
        a.lathe(wh, prof, 16)
        for i in range(8):
            with a.at(rot=(0, 0, 45 * i + 22.5)):
                a.bar(gy, [(0.16, 0, zf(0.16) - 0.06), (0.7, 0, zf(0.7) - 0.055), (1.19, 0, zf(1.19) - 0.045)], 0.03, 0.035, up=(0, 0, 1))
        a.lathe(gy, [(0, -0.13), (0.2, -0.13), (0.22, -0.11), (0.22, -0.025)], 10, caps=(True, False))
        a.lathe(gy, [(0.55, zf(0.55) - 0.085), (0.58, zf(0.58) - 0.085), (0.58, zf(0.58) - 0.035), (0.55, zf(0.55) - 0.035)], 16, loop=True)
        zt = f * 0.93
        for ang in (90, 210, 330):
            c, s_ = math.cos(rad(ang)), math.sin(rad(ang))
            a.tube(st, [(1.17 * c, 1.17 * s_, zf(1.17)), (0.07 * c, 0.07 * s_, zt)], 0.012, 5)
        a.cz(gy, 0.11, zt - 0.05, zt - 0.03, n=10)
        a.cz(dk, 0.065, zt - 0.03, zt + 0.1, n=8, bev=0.012)
        a.box(wh, 0.07, 0.12, 0.07, (0, 0.06, zt + 0.07), 0.012)
    return a

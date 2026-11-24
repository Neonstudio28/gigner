"""Waste: dumpsters, bins, bags, cardboard, litter, tyres."""
import math
from streetprops_kit import *

CARD, CARD_D, TAPE, PAPER = '#b98f5e', '#8a6a45', '#d9caa2', '#e6e1d3'
BAGK, BAGW = '#1d1e21', '#dcdcd6'


# ------------------------------------------------------------------ reusable bits (also used by other modules)
def bag(a, at=(0, 0, 0), r=0.22, h=0.45, seed=0, col=BAGK, rot=(0, 0, 0), tie='#c8b03a'):
    """Lumpy tied rubbish bag: an 8-sided loft with hashed radii, faceted on purpose."""
    m, n = P(col), 8
    levels = [(0.0, 0.5), (0.1, 0.9), (0.33, 1.0), (0.56, 0.86), (0.76, 0.52), (0.9, 0.17)]
    rings = []
    for i, (zf, rf) in enumerate(levels):
        ring_ = []
        for j in range(n):
            rr = r * rf * (0.86 + 0.28 * rnd(seed, i, j))
            ring_.append((rr * math.cos(j * math.tau / n), rr * math.sin(j * math.tau / n), h * zf))
        rings.append(ring_)
    with a.at(at, rot):
        a.loft(m, rings)
        if tie:
            a.cz(P(tie), r * 0.16, h * 0.885, h * 0.915, n=6)
            a.cyl(m, r * 0.1, (0, 0, h * 0.9), (r * 0.08, r * 0.05, h * 1.02), n=6, r2=r * 0.26)


def carton(a, w, d, h, at=(0, 0, 0), rz=0.0, tape=True, label=True, marks=True, col=CARD):
    with a.at(at, (0, 0, rz)):
        a.box(P(col), w, d, h, (0, 0, h / 2), 0.006)
        if tape:
            a.box(P(TAPE), w + 0.005, 0.05, 0.004, (0, 0, h))
            for s in (-1, 1):
                a.box(P(TAPE), 0.004, 0.05, 0.09, (s * w / 2, 0, h - 0.045))
        if label:
            a.decal('ship_label', 0.11, 0.0825, (w * 0.2, -d / 2 - 0.003, h * 0.62))
        if marks:
            a.decal('box_marks', 0.168, 0.072, (-w * 0.18, -d / 2 - 0.003, h * 0.28))


def carton_open(a, w, d, h, at=(0, 0, 0), rz=0.0, flaps=(130, 35, 150, 105), col=CARD):
    t, m, mi = 0.008, P(col), P(CARD_D)
    with a.at(at, (0, 0, rz)):
        for s in (-1, 1):
            a.box(m, w, t, h, (0, s * (d - t) / 2, h / 2))
            a.box(m, t, d - 2 * t, h, (s * (w - t) / 2, 0, h / 2))
        a.box(mi, w - 2 * t, d - 2 * t, t, (0, 0, t / 2 + 0.002))
        fl = d / 2
        with a.at((0, -d / 2, h), (flaps[0], 0, 0)):
            a.box(m, w - 0.012, t, fl, (0, 0, fl / 2))
        with a.at((0, d / 2, h), (-flaps[1], 0, 0)):
            a.box(m, w - 0.012, t, fl, (0, 0, fl / 2))
        with a.at((w / 2, 0, h), (0, flaps[2], 0)):
            a.box(m, t, d - 0.012, fl, (0, 0, fl / 2))
        with a.at((-w / 2, 0, h), (0, -flaps[3], 0)):
            a.box(m, t, d - 0.012, fl, (0, 0, fl / 2))
        a.decal('box_marks', 0.168, 0.072, (-w * 0.15, -d / 2 - 0.003, h * 0.4))


def tyre(a, at=(0, 0, 0), rot=(0, 0, 0), R=0.31, w=0.2, n=14):
    """Loose car tyre, axis along local Z, centred on `at`."""
    h = w / 2
    prof = [(R - 0.115, -h * 0.72), (R - 0.07, -h), (R - 0.022, -h * 0.94), (R, -h * 0.68), (R, h * 0.68), (R - 0.022, h * 0.94),
            (R - 0.07, h), (R - 0.115, h * 0.72)]
    a.lathe(RB(), prof, n, at, rot, loop=True)
    a.lathe(RB('#2a2a2d'), [(R + 0.003, -h * 0.3), (R + 0.003, -h * 0.12)], n, at, rot, caps=False)
    a.lathe(RB('#2a2a2d'), [(R + 0.003, h * 0.12), (R + 0.003, h * 0.3)], n, at, rot, caps=False)


def cup(a, at=(0, 0, 0), rot=(0, 0, 0), band='#c8372f', lid=True):
    wh = P('#ecebe4')
    with a.at(at, rot):
        a.cyl(wh, 0.030, (0, 0, 0), (0, 0, 0.03), 10, r2=0.033)
        a.cyl(P(band), 0.033, (0, 0, 0.03), (0, 0, 0.085), 10, r2=0.039, caps=False)
        a.cyl(wh, 0.039, (0, 0, 0.085), (0, 0, 0.115), 10, r2=0.042)
        if lid:
            a.cyl(P('#f6f6f2'), 0.0445, (0, 0, 0.113), (0, 0, 0.124), 10, bev=0.003)
            a.cyl(P(band), 0.0035, (0.012, 0, 0.12), (0.03, 0, 0.2), 5)


def can(a, at=(0, 0, 0), rot=(0, 0, 0), col='#c8372f', squash=1.0):
    with a.at(at, rot, (1, squash, 1)):
        a.cyl(MT('#b9bec2'), 0.027, (0, 0, 0), (0, 0, 0.01), 10, r2=0.033)
        a.cyl(P(col), 0.033, (0, 0, 0.01), (0, 0, 0.066), 10, caps=False)
        a.cyl(P('#f1efe8'), 0.033, (0, 0, 0.066), (0, 0, 0.082), 10, caps=False)
        a.cyl(P(col), 0.033, (0, 0, 0.082), (0, 0, 0.112), 10, caps=False)
        a.cyl(MT('#b9bec2'), 0.033, (0, 0, 0.112), (0, 0, 0.122), 10, r2=0.027)


def bottle(a, at=(0, 0, 0), rot=(0, 0, 0), col='#5b3a1b', label='#e8dcb8', cap='#c9a437'):
    with a.at(at, rot):
        a.lathe(GLS(col), [(0, 0), (0.028, 0), (0.032, 0.008), (0.032, 0.12), (0.024, 0.155), (0.013, 0.185), (0.013, 0.222), (0, 0.222)], 10)
        a.cyl(P(label), 0.0328, (0, 0, 0.045), (0, 0, 0.1), 10, caps=False)
        a.cyl(MT(cap), 0.0155, (0, 0, 0.218), (0, 0, 0.234), 10)


def paper_ball(a, at=(0, 0, 0), r=0.045, seed=3, col=PAPER):
    bag(a, at, r, r * 1.5, seed, col, tie=None)


def caster(a, at, r=0.065):
    x, y, z = at
    a.wheel(r, 0.045, (x, y, z + r), n=10)
    for s in (-1, 1):
        a.box(MT('#6f7579'), 0.008, 0.05, r + 0.03, (x + s * 0.03, y, z + r + 0.02))
    a.box(MT('#6f7579'), 0.085, 0.085, 0.012, (x, y, z + 2 * r + 0.012))


# ------------------------------------------------------------------ dumpsters
def _lid(a, w, L, m, rib):
    """Dumpster lid in its own frame: hinge line on local Y = L, top surface up, front lip at Y = 0."""
    a.box(m, w, L, 0.04, (0, L / 2, 0.045), 0.012, 'xyT')
    for i in (-1, 0, 1):
        a.box(rib, 0.085, L - 0.16, 0.022, (i * w * 0.3, L / 2, 0.072), 0.008, 'xyT')
    a.box(m, w, 0.035, 0.06, (0, -0.005, 0.03), 0.008, 'x')
    a.handle(MT('#8f979c'), (-0.09, -0.023, 0.03), (0.09, -0.023, 0.03), (0, -0.035, 0), 0.008)


def _dumpster(name, col, dark, open_):
    a = Asset(name)
    body, dk, lidm, rib, steel = P(col), P(dark), P('#25272a'), P('#303336'), MT('#7b8286')
    W, zb = 1.8, 0.15
    prof = [(-0.47, zb), (0.50, zb), (0.55, 1.22), (-0.55, 1.0)]          # side outline (y, z)
    if not open_:
        a.prism(body, prof, -W / 2, W / 2, 'yz', 0.02)
    else:
        t = 0.045
        for s in (-1, 1):
            a.prism(body, prof, s * W / 2, s * (W / 2 - t), 'yz', 0.012)
        a.prism(body, [(-0.47, zb), (-0.47 + t, zb), (-0.55 + t, 1.0), (-0.55, 1.0)], -W / 2 + t, W / 2 - t, 'yz')
        a.prism(body, [(0.50 - t, zb), (0.50, zb), (0.55, 1.22), (0.55 - t, 1.22)], -W / 2 + t, W / 2 - t, 'yz')
        a.box(body, W - 2 * t, 0.97 - 2 * t, t, (0, 0.015, zb + t / 2))
        a.quad(P('#17181a'), (-0.86, -0.49, 0.7), (0.86, -0.49, 0.7), (0.86, 0.5, 0.7), (-0.86, 0.5, 0.7))
    # rim
    a.box(body, W + 0.07, 0.07, 0.075, (0, -0.565, 0.985), 0.012, 'x')
    a.box(body, W + 0.07, 0.07, 0.075, (0, 0.565, 1.205), 0.012, 'x')
    for s in a.mx():
        a.bar(body, [(0.905, -0.56, 0.985), (0.905, 0.56, 1.205)], 0.06, 0.075)
        # fork pocket
        a.box(body, 0.11, 1.02, 0.17, (0.955, 0.0, 0.62), 0.012, 'y')
        a.box(dk, 0.075, 0.012, 0.115, (0.955, -0.51, 0.62))
        a.box(dk, 0.075, 0.012, 0.115, (0.955, 0.51, 0.62))
        for y in (-0.28, 0.28):
            a.box(body, 0.035, 0.08, 0.34, (0.905, y, 0.35), 0.01, 'z')
        # front face parts sit in the tilted frame of the front wall
        with a.at((0, -0.47, zb), (5.3, 0, 0)):
            a.box(body, 0.085, 0.035, 0.78, (0.52, -0.012, 0.42), 0.01, 'z')
        for y in (-0.36, 0.38):
            caster(a, (0.72, y, 0.0))
    with a.at((0, -0.47, zb), (5.3, 0, 0)):
        a.plate(P('#e3c23a'), 0.3, 0.125, (0.0, -0.005, 0.5))
        a.decal('lid_label', 0.27, 0.1125, (0.0, -0.0125, 0.5))
        a.plate(P('#e9e6dc'), 0.16, 0.1, (-0.78, -0.005, 0.72))
        a.cyl(steel, 0.022, (0.7, 0.0, 0.07), (0.7, -0.03, 0.07), 8)
    slope = math.degrees(math.atan2(0.22, 1.1))
    L = math.hypot(1.1, 0.22) + 0.03
    if not open_:
        with a.at((0, -0.565, 0.995), (slope, 0, 0)):
            for s in (-1, 1):
                with a.at((s * 0.455, 0, 0)):
                    _lid(a, 0.89, L, lidm, rib)
            a.tube(steel, [(-0.93, L + 0.02, 0.045), (0.93, L + 0.02, 0.045)], 0.018, 8)
            for x in (-0.9, 0.0, 0.9):
                a.box(body, 0.05, 0.07, 0.07, (x, L + 0.02, 0.035))
    else:
        # lids thrown back, hanging behind the rear wall
        for s, tilt in ((-1, 93.0), (1, 97.0)):
            with a.at((s * 0.455, 0.625, 1.25), (tilt, 0, 0)):
                with a.at((0, -L, -0.03)):
                    _lid(a, 0.89, L, lidm, rib)
        a.tube(steel, [(-0.93, 0.61, 1.25), (0.93, 0.61, 1.25)], 0.018, 8)
        for x in (-0.9, 0.0, 0.9):
            a.box(body, 0.05, 0.07, 0.07, (x, 0.6, 1.24))
        bag(a, (-0.5, -0.05, 0.68), 0.3, 0.52, 1)
        bag(a, (0.05, 0.2, 0.68), 0.27, 0.5, 2, BAGW, tie='#b8433a')
        bag(a, (-0.1, -0.22, 0.68), 0.22, 0.4, 5)
        carton(a, 0.5, 0.36, 0.34, (0.52, 0.1, 0.66), 18, label=False)
        with a.at((0.45, -0.3, 0.72), (62, 8, 0)):
            a.box(P(CARD), 0.52, 0.014, 0.6, (0, 0, 0.3))
    return a


@asset('waste')
def dumpster_green():
    return _dumpster('dumpster_green', '#2f6a49', '#18241d', False)


@asset('waste')
def dumpster_blue_open():
    return _dumpster('dumpster_blue_open', '#2c5c8f', '#16212c', True)


# ------------------------------------------------------------------ bins
@asset('waste')
def wheelie_bin():
    a = Asset('wheelie_bin')
    body, dk = LB('paint', 'body', '#2a559b'), P('#202327')
    sec = lambda w, d: rrect(w, d, 0.06, 3)
    a.loft(body, [ring(sec(0.43, 0.5), 0.06, cy=0.03), ring(sec(0.5, 0.6), 0.55, cy=0.01), ring(sec(0.55, 0.67), 0.94)])
    a.loft(body, [ring(sec(0.6, 0.72), 0.925), ring(sec(0.6, 0.72), 0.975)])
    with a.at((0, 0.36, 0.975), (3.5, 0, 0)):
        a.box(body, 0.62, 0.75, 0.05, (0, -0.37, 0.025), 0.018, 'xyT')
        a.box(body, 0.42, 0.5, 0.022, (0, -0.37, 0.058), 0.012, 'xyT')
        a.box(body, 0.3, 0.03, 0.035, (0, -0.752, 0.01), 0.008, 'x')
    a.tube(dk, [(-0.25, 0.42, 0.985), (0.25, 0.42, 0.985)], 0.017, 8)
    for s in a.mx():
        a.box(body, 0.05, 0.1, 0.06, (0.2, 0.385, 0.975), 0.01, 'x')
        a.wheel(0.1, 0.05, (0.275, 0.27, 0.1), hub=P('#c9ccce'))
    a.tube(MT('#6f7579'), [(-0.25, 0.27, 0.1), (0.25, 0.27, 0.1)], 0.012, 6)
    a.box(body, 0.34, 0.06, 0.06, (0, -0.16, 0.03), 0.01, 'y')
    with a.at((0, -0.22, 0.06), (6.2, 0, 0)):
        a.plate(P('#e9e6dc'), 0.2, 0.14, (0, -0.006, 0.52))
        a.box(body, 0.32, 0.022, 0.035, (0, -0.008, 0.78), 0.008, 'x')
    a.extras['tints'] = {'body': ['#2a559b', '#2f6a49', '#4a4e52']}
    return a


@asset('waste')
def trash_can_street():
    a = Asset('trash_can_street')
    grn, dk, liner = P('#2e5644'), P('#17181a'), MT('#7d8488')
    n = 16
    a.lathe(grn, [(0.225, 0.07), (0.275, 0.07), (0.275, 0.13), (0.225, 0.13)], n, loop=True)
    a.lathe(grn, [(0.245, 0.45), (0.272, 0.45), (0.272, 0.485), (0.245, 0.485)], n, loop=True)
    a.lathe(grn, [(0.225, 0.8), (0.285, 0.8), (0.292, 0.83), (0.292, 0.875), (0.27, 0.895), (0.225, 0.895)], n, loop=True)
    for i in range(n):
        ang = (i + 0.5) * 360 / n
        a.box(grn, 0.03, 0.008, 0.69, (0.262 * math.cos(rad(ang)), 0.262 * math.sin(rad(ang)), 0.465), rot=(0, 0, ang + 90))
    a.lathe(liner, [(0, 0.1), (0.22, 0.1), (0.232, 0.86), (0.214, 0.86)], n, caps=(True, False))
    a.lathe(dk, [(0.214, 0.86), (0.2, 0.62), (0, 0.62)], n, caps=False)
    for i in range(3):
        ang = 90 + i * 120
        a.box(grn, 0.06, 0.05, 0.075, (0.22 * math.cos(rad(ang)), 0.22 * math.sin(rad(ang)), 0.0375), 0.008, 'z', rot=(0, 0, ang))
    a.plate(P('#e3c23a'), 0.16, 0.09, (0, -0.268, 0.64))
    paper_ball(a, (0.05, -0.02, 0.6), 0.07, 4)
    cup(a, (-0.07, 0.05, 0.63), (20, 25, 0))
    return a


def _can_body(a, m, dk):
    prof = [(0, 0.0), (0.205, 0.0), (0.205, 0.03), (0.213, 0.045), (0.224, 0.2), (0.232, 0.215), (0.232, 0.255), (0.228, 0.27),
            (0.238, 0.44), (0.246, 0.455), (0.246, 0.495), (0.242, 0.51), (0.252, 0.655), (0.262, 0.66), (0.262, 0.69), (0.243, 0.69)]
    a.lathe(m, prof, 14, caps=(True, False))
    a.lathe(dk, [(0.243, 0.69), (0.2, 0.05), (0, 0.05)], 14, caps=False)
    for s in a.mx():
        a.box(m, 0.012, 0.07, 0.04, (0.252, 0, 0.55))
        a.handle(MT('#6f7579'), (0.256, -0.05, 0.56), (0.256, 0.05, 0.56), (0.03, 0, -0.035), 0.007)


def _can_lid(a, m):
    a.lathe(m, [(0.268, 0.0), (0.274, 0.012), (0.27, 0.04), (0.2, 0.064), (0.07, 0.086), (0, 0.089)], 14)
    a.box(m, 0.03, 0.05, 0.012, (-0.055, 0, 0.088))
    a.box(m, 0.03, 0.05, 0.012, (0.055, 0, 0.088))
    a.handle(MT('#6f7579'), (-0.055, 0, 0.09), (0.055, 0, 0.09), (0, 0, 0.04), 0.008)


@asset('waste')
def trash_can_metal():
    a = Asset('trash_can_metal')
    m = MT('#9aa1a5')
    _can_body(a, m, P('#3c4043'))
    with a.at((0, 0, 0.665)):
        _can_lid(a, m)
    return a


@asset('waste')
def trash_can_metal_tipped():
    a = Asset('trash_can_metal_tipped')
    m = MT('#9aa1a5')
    with a.at((-0.42, 0.05, 0.208), (0, 85.6, 0)):
        with a.at(rot=(0, 0, 40)):
            _can_body(a, m, P('#3c4043'))
    with a.at((0.36, -0.42, 0.0), (0, 0, 25)):
        _can_lid(a, m)
    bag(a, (0.45, 0.12, 0.0), 0.2, 0.34, 7, rot=(0, 0, 40))
    paper_ball(a, (0.3, -0.12, 0.0), 0.05, 9)
    can(a, (0.62, -0.2, 0.033), (90, 0, 30))
    cup(a, (0.2, 0.3, 0.04), (0, 92, 140))
    a.decal('flyer_a', 0.16, 0.2, (0.72, 0.3, 0.006), (-90, 0, 20), fold=8)
    return a


# ------------------------------------------------------------------ bags, cardboard
@asset('waste')
def trash_bags():
    a = Asset('trash_bag_a')
    bag(a, (0, 0, 0), 0.24, 0.5, 11)
    b = Asset('trash_bag_b')
    bag(b, (0, 0, 0), 0.3, 0.44, 12, BAGW, tie='#b8433a')
    c = Asset('trash_bag_c')
    bag(c, (-0.16, 0.05, 0), 0.26, 0.52, 13)
    bag(c, (0.24, -0.06, 0), 0.2, 0.36, 14, rot=(0, 0, 60))
    bag(c, (0.1, 0.3, 0), 0.22, 0.4, 15, '#2b2d31', rot=(0, 0, 200))
    return [a, b, c]


@asset('waste')
def cardboard_boxes():
    a = Asset('cardboard_box_closed')
    carton(a, 0.5, 0.4, 0.36)
    b = Asset('cardboard_box_open')
    carton_open(b, 0.5, 0.4, 0.36)
    c = Asset('cardboard_box_flat')
    m, t = P(CARD), 0.016
    c.box(m, 0.5, 0.42, t, (-0.21, 0, t / 2))
    c.box(m, 0.4, 0.42, t, (0.245, 0, t / 2), rot=(0, 0, 1.2))
    for x, w_, yy, rz, tilt in ((-0.335, 0.24, 1, 2, 3), (-0.085, 0.24, 1, -3, 0), (0.245, 0.39, 1, 1, 5), (-0.21, 0.49, -1, -2, 0), (0.245, 0.39, -1, 3, 4)):
        with c.at((x, yy * 0.214, t / 2), (yy * tilt, 0, rz)):
            c.box(m, w_, 0.2, t * 0.6, (0, yy * 0.1, 0))
    c.box(P(TAPE), 0.05, 0.3, 0.003, (0.04, 0, t + 0.0005), rot=(0, 0, 1))
    c.decal('box_marks', 0.168, 0.072, (-0.22, -0.08, t + 0.003), (-90, 0, 0))
    c.decal('ship_label', 0.11, 0.0825, (0.27, 0.07, t + 0.003), (-90, 0, 92))
    s = Asset('cardboard_box_stack')
    carton(s, 0.62, 0.46, 0.42, (-0.05, 0.05, 0), 4)
    carton(s, 0.46, 0.36, 0.3, (-0.09, 0.03, 0.42), -14, col='#c29a69')
    carton(s, 0.4, 0.32, 0.27, (0.52, -0.1, 0), 24, col='#ad8454', marks=False)
    carton(s, 0.3, 0.24, 0.2, (0.5, -0.11, 0.27), -8, tape=True, label=False)
    return [a, b, c, s]


# ------------------------------------------------------------------ litter
@asset('waste')
def litter():
    out = []
    a = Asset('litter_paper_a')
    paper_ball(a, (0, 0, 0), 0.055, 21)
    out.append(a)
    a = Asset('litter_paper_b')
    a.decal('flyer_a', 0.2, 0.25, (0, 0, 0.008), (-90, 0, 12), fold=14, back=P(PAPER))
    out.append(a)
    a = Asset('litter_paper_c')
    with a.at((0, 0, 0.06), (0, 0, -18)):
        a.decal('paper_fold', 0.34, 0.234, (0, -0.085, 0), (-52, 0, 0), back=P(PAPER))
        a.decal('news_b', 0.34, 0.234, (0, 0.085, 0), (52, 0, 180), back=P(PAPER), shape=[(0, 0.4), (1, 0.4), (1, 1), (0, 1)])
    out.append(a)
    a = Asset('litter_paper_d')
    a.decal('flyer_b', 0.18, 0.225, (-0.16, 0.05, 0.006), (-90, 0, -25), fold=6, back=P(PAPER))
    a.decal('news_c', 0.26, 0.345, (0.14, -0.02, 0.01), (-90, 0, 38), fold=10, back=P(PAPER))
    a.decal('flyer_a', 0.16, 0.2, (0.02, 0.24, 0.005), (-90, 0, 100), back=P(PAPER))
    paper_ball(a, (-0.05, -0.2, 0), 0.04, 23)
    out.append(a)
    a = Asset('litter_cup')
    cup(a, (0, 0, 0.041), (0, 94, 25))
    out.append(a)
    a = Asset('litter_can')
    can(a, (-0.06, 0, 0.026), (0, 90, -20), squash=0.78)
    out.append(a)
    a = Asset('litter_bottle')
    bottle(a, (-0.11, 0, 0.032), (0, 90, 15))
    out.append(a)
    return out


@asset('waste')
def pizza_box():
    a = Asset('pizza_box')
    card = P('#e2dac6')
    a.box(card, 0.34, 0.34, 0.04, (0, 0, 0.02), 0.004, 'z')
    with a.at((0, 0.17, 0.042), (-9, 0, 0)):
        a.box(card, 0.345, 0.345, 0.006, (0, -0.1725, 0.003))
        a.box(card, 0.345, 0.006, 0.034, (0, -0.345, -0.014))
        a.decal('pizza', 0.31, 0.31, (0, -0.1725, 0.0095), (-90, 0, 0))
    return a


@asset('waste')
def newspaper_pile():
    a = Asset('newspaper_pile')
    cols = ('#e6e1d3', '#d9d3c2', '#ece8dc', '#d2ccba')
    z = 0.0
    for i in range(7):
        h = 0.024 + 0.006 * rnd(i, 3)
        a.box(P(cols[i % 4]), 0.3, 0.39, h, ((rnd(i, 1) - 0.5) * 0.02, (rnd(i, 2) - 0.5) * 0.02, z + h / 2), rot=(0, 0, (rnd(i, 5) - 0.5) * 7))
        z += h
    a.decal('paper_fold', 0.29, 0.2, (0, -0.09, z + 0.003), (-90, 0, 0))
    tw = P('#8c7a55')
    a.box(tw, 0.008, 0.402, z + 0.006, (0.03, 0, z / 2 + 0.001))
    a.box(tw, 0.312, 0.008, z + 0.006, (0, 0.06, z / 2 + 0.001))
    return a


@asset('waste')
def tyres():
    a = Asset('tyre')
    tyre(a, (0, 0, 0.1))
    b = Asset('tyre_stack')
    tyre(b, (0, 0, 0.1))
    tyre(b, (0.03, -0.02, 0.3), (0, 0, 20))
    tyre(b, (-0.02, 0.03, 0.5), (0, 0, 50), R=0.3)
    tyre(b, (0.47, 0.05, 0.305), (0, 72, 8), R=0.31)
    return [a, b]

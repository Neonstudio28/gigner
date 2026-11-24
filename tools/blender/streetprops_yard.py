"""Yard and work props, part 1: fences and gates, garden machines, ladders, tools, pallets."""
import math
from streetprops_kit import *
from streetprops_furniture import STEEL, DARK, BLACK, CREAM
from streetprops_furniture2 import lerp, wire

WHITE, BOARD, BOARD2, GALV, GALV2 = '#eeebe2', '#8a6a4a', '#7b5d40', '#a3aaae', '#8b9296'


def _pickets(a, x0, x1, n, z0=0.06, z1=0.98, y=-0.03, m=None):
    m = m or P(WHITE)
    for i in range(n):
        x = lerp(x0, x1, (i + 0.5) / n)
        a.prism(m, [(x - 0.04, z0), (x + 0.04, z0), (x + 0.04, z1 - 0.06), (x, z1), (x - 0.04, z1 - 0.06)], y - 0.01, y + 0.01, 'xz')


def _picket_post(a, x, h=1.12):
    wh = P(WHITE)
    a.box(wh, 0.1, 0.1, h, (x, 0.02, h / 2), 0.008, 'z')
    a.box(wh, 0.13, 0.13, 0.03, (x, 0.02, h + 0.015), 0.006, 'xy')
    a.lathe(wh, [(0.075, h + 0.03), (0, h + 0.1)], 4, at=(x, 0.02, 0), phase=0.5, caps=False)


@asset('yard')
def fence_picket():
    a = Asset('fence_picket')
    wh2 = P('#dedad0')
    for z in (0.28, 0.78):
        a.box(wh2, 2.0, 0.035, 0.075, (0, 0, z), 0.006, 'x')
    _pickets(a, -1.0, 1.0, 13)
    a.extras['length'] = 2.0
    p = Asset('fence_picket_post')
    with p.at((0, -0.02, 0)):
        _picket_post(p, 0)
    g = Asset('fence_picket_gate')
    for x in (-0.6, 0.6):
        _picket_post(g, x)
    lf = g.child('leaf', (-0.55, -0.03, 0))
    for z in (0.28, 0.78):
        lf.box(wh2, 1.06, 0.035, 0.075, (0, -0.02, z), 0.006, 'x')
    lf.bar(wh2, [(-0.5, -0.02, 0.3), (0.5, -0.02, 0.76)], 0.07, 0.03, up=(0, 1, 0))
    _pickets(lf, -0.53, 0.53, 7, 0.08, 0.98, -0.05)
    for z in (0.28, 0.78):
        lf.box(P(BLACK), 0.18, 0.008, 0.03, (-0.47, -0.064, z))
        lf.cz(P(BLACK), 0.012, z - 0.03, z + 0.03, x=-0.552, y=-0.06, n=6)
    lf.box(P(BLACK), 0.1, 0.02, 0.03, (0.5, -0.066, 0.78))
    lf.torus(P(BLACK), 0.03, 0.006, (0.46, -0.07, 0.74), (90, 0, 0), 8, 4)
    g.extras['length'] = 1.3
    g.extras['hinge'] = {'part': 'leaf', 'axis': 'z'}
    return [a, p, g]


@asset('yard')
def fence_board():
    a = Asset('fence_board')
    b1, b2, dk = P(BOARD), P(BOARD2), P('#6b5038')
    for x in (-1.0, 1.0):
        a.box(dk, 0.1, 0.1, 1.86, (x, 0.07, 0.93), 0.008, 'z')
    for z in (0.3, 0.95, 1.55):
        a.box(dk, 2.0, 0.04, 0.09, (0, 0.0, z), 0.006, 'x')
    n = 13
    for i in range(n):
        x = lerp(-1.0, 1.0, (i + 0.5) / n)
        top = 1.8 - 0.012 * rnd(i, 3)
        w = 0.073
        a.prism(b1 if i % 2 == 0 else b2, [(x - w, 0.04), (x + w, 0.04), (x + w, top - 0.03), (x + w - 0.03, top), (x - w + 0.03, top), (x - w, top - 0.03)],
                -0.04, -0.02, 'xz')
        a.bolts(MT('#55595c'), [(x, -0.04, 0.95)], 0.007, 0.003, n=4)
    a.extras['length'] = 2.0
    return a


def _chain(a, x0, x1, z0, z1, pitch=0.12, y=0.0, m=None):
    """Chain-link infill: crossed diagonal wires clipped to the rectangle."""
    m = m or MT('#b4babd')
    w, h = x1 - x0, z1 - z0
    step = pitch * math.sqrt(2)
    k = -h
    while k < w:
        for sgn in (1, -1):
            # line u - v = k (rising) for sgn 1, mirrored for -1; u in 0..w, v in 0..h
            ua, ub = max(k, 0.0), min(k + h, w)
            if ub - ua > 0.03:
                va, vb = ua - k, ub - k
                if sgn > 0:
                    wire(a, m, (x0 + ua, y, z0 + va), (x0 + ub, y, z0 + vb), 0.0045)
                else:
                    wire(a, m, (x1 - ua, y + 0.006, z0 + va), (x1 - ub, y + 0.006, z0 + vb), 0.0045)
        k += step


def _cl_post(a, x, h=1.95, r=0.03):
    st = MT(GALV)
    a.cz(st, r, 0, h, x=x, n=8, caps=False)
    a.lathe(MT(GALV2), [(r + 0.006, h - 0.02), (r + 0.006, h), (r * 0.6, h + 0.03), (0, h + 0.04)], 8, at=(x, 0, 0), caps=False)
    a.cz(P('#a39e93'), r + 0.05, 0, 0.02, x=x, n=8)


@asset('yard')
def fence_chainlink():
    a = Asset('fence_chainlink')
    st = MT(GALV)
    for x in (-1.5, 1.5):
        _cl_post(a, x)
    a.tube(st, [(-1.5, 0, 1.86), (1.5, 0, 1.86)], 0.021, 6)
    wire(a, st, (-1.5, 0, 0.08), (1.5, 0, 0.08), 0.006)
    _chain(a, -1.47, 1.47, 0.06, 1.84)
    for x in (-1.5, 1.5):
        for z in (0.3, 0.95, 1.6):
            a.lathe(MT(GALV2), [(0.034, z - 0.015), (0.034, z + 0.015)], 8, at=(x, 0, 0), caps=False)
    a.extras['length'] = 3.0
    g = Asset('fence_chainlink_gate')
    for x in (-0.68, 0.68):
        _cl_post(g, x, 2.0, 0.036)
    lf = g.child('leaf', (-0.68, 0, 0))
    lf.tube(st, fillet([(-0.6, 0, 0.08), (0.6, 0, 0.08), (0.6, 0, 1.86), (-0.6, 0, 1.86), (-0.6, 0, 0.08)], 0.05, 2)[:-1], 0.02, 6, closed=True)
    lf.tube(st, [(-0.6, 0, 0.97), (0.6, 0, 0.97)], 0.016, 6)
    _chain(lf, -0.58, 0.58, 0.1, 1.84)
    for z in (0.35, 1.6):
        lf.box(MT(GALV2), 0.09, 0.03, 0.05, (-0.64, 0, z))
    lf.box(MT(GALV2), 0.1, 0.02, 0.04, (0.64, -0.02, 1.0))
    lf.box(MT(GALV2), 0.02, 0.05, 0.12, (0.6, -0.03, 1.0))
    g.extras['length'] = 1.36
    g.extras['hinge'] = {'part': 'leaf', 'axis': 'z'}
    return [a, g]


@asset('yard')
def fence_rail_ranch():
    a = Asset('fence_rail_ranch')
    wh, wh2 = P(WHITE), P('#dedad0')
    for x in (-1.5, 0.0, 1.5):
        a.box(wh, 0.12, 0.12, 1.3, (x, 0.03, 0.65), 0.01, 'z')
        a.lathe(wh, [(0.085, 1.3), (0, 1.36)], 4, at=(x, 0.03, 0), phase=0.5, caps=False)
    for i, z in enumerate((0.35, 0.72, 1.09)):
        a.box(wh if i != 1 else wh2, 3.0, 0.03, 0.14, (0, -0.045, z), 0.006, 'x')
        a.bolts(MT('#8f979c'), [(x, -0.06, z + dz) for x in (-1.5, 0.0, 1.5) for dz in (-0.035, 0.035)], 0.008, 0.004)
    a.extras['length'] = 3.0
    return a


@asset('yard')
def fence_wire_farm():
    a = Asset('fence_wire_farm')
    wood, st, w_ = P('#7a6149'), P('#3f5a46'), MT('#9aa0a4')
    for x in (-1.5, 1.5):
        a.cyl(wood, 0.065, (x, 0, 0), (x + 0.01 * x, 0, 1.4), 8, r2=0.055, bev=0.012)
    a.prism(st, [(-0.02, 0.012), (0.02, 0.012), (0.004, 0.0), (0.004, -0.03), (-0.004, -0.03), (-0.004, 0.0)], 0, 1.3, 'xy')
    a.prism(P(WHITE), [(-0.021, 0.013), (0.021, 0.013), (0.005, 0.0), (0.005, -0.031), (-0.005, -0.031), (-0.005, 0.0)], 1.3, 1.45, 'xy')
    for z in (0.12, 0.3, 0.5, 0.72, 0.95, 1.12):
        wire(a, w_, (-1.5, -0.035, z), (1.5, -0.035, z), 0.004)
    for i in range(1, 10):
        x = -1.5 + i * 0.3
        wire(a, w_, (x, -0.035, 0.12), (x, -0.035, 1.12), 0.003)
    # barbed top strand
    wire(a, w_, (-1.5, -0.035, 1.28), (1.5, -0.035, 1.28), 0.004)
    for i in range(12):
        x = -1.38 + i * 0.25
        wire(a, w_, (x - 0.02, -0.05, 1.265), (x + 0.02, -0.02, 1.295), 0.003)
    for x in (-1.5, 1.5):
        for z in (0.3, 0.72, 1.12):
            a.box(MT('#6f7579'), 0.02, 0.012, 0.03, (x, -0.066, z))
    a.extras['length'] = 3.0
    return a


# ------------------------------------------------------------------ garden machines
@asset('yard')
def bbq_grill():
    a = Asset('bbq_grill')
    bk, st, wood = G('#1c1d1f'), MT('#b9bec2'), P('#8a6a4a')
    zc = 0.72
    a.sphere(bk, 0.29, (0, 0, zc), 12, 4, (1, 1, 0.75), a0=0, a1=90)
    a.lathe(st, [(0.292, zc - 0.006), (0.3, zc), (0.292, zc + 0.006)], 12, caps=False)
    a.sphere(bk, 0.292, (0, 0, zc + 0.006), 12, 4, (1, 1, 0.62), a0=90, a1=180)
    a.cz(st, 0.035, zc + 0.185, zc + 0.195, x=0.1, n=8)
    a.handle(st, (-0.07, 0, zc + 0.18), (0.07, 0, zc + 0.18), (0, 0, 0.06), 0.008)
    a.box(wood, 0.12, 0.03, 0.025, (0, 0, zc + 0.245), 0.008, 'x')
    for s in a.mx():
        a.handle(st, (0.285, -0.06, zc - 0.05), (0.285, 0.06, zc - 0.05), (0.05, 0, 0), 0.007)
        a.box(wood, 0.025, 0.1, 0.025, (0.338, 0, zc - 0.05), 0.006, 'y')
    legs = [(-90, 0.36), (30, 0.4), (150, 0.4)]
    for ang, rr in legs:
        c, s_ = math.cos(rad(ang)), math.sin(rad(ang))
        z0 = 0.0 if ang == -90 else 0.07
        a.tube(st, [(0.2 * c, 0.2 * s_, zc - 0.14), (rr * c, rr * s_, z0)], 0.012, 6)
    a.cyl(st, 0.008, (0.4 * math.cos(rad(30)) + 0.03, 0.2, 0.07), (0.4 * math.cos(rad(150)) - 0.03, 0.2, 0.07), 5)
    for sx in (-1, 1):
        a.wheel(0.07, 0.03, (sx * 0.38, 0.2, 0.07), n=10, hub=P('#e9e6dc'))
    a.lathe(st, [(0, 0.44), (0.1, 0.44), (0.12, 0.46), (0.12, 0.47)], 10)
    a.cz(st, 0.03, 0.47, 0.52, n=6)
    for i in range(3):
        c0, s0 = math.cos(rad(legs[i][0])), math.sin(rad(legs[i][0]))
        c1, s1 = math.cos(rad(legs[(i + 1) % 3][0])), math.sin(rad(legs[(i + 1) % 3][0]))
        wire(a, st, (0.3 * c0, 0.3 * s0, 0.28), (0.3 * c1, 0.3 * s1, 0.28), 0.005)
    return a


@asset('yard')
def lawn_mower():
    a = Asset('lawn_mower')
    red, bk, st, dk = G('#b8281f'), P(BLACK), MT('#b9bec2'), P('#3a3d42')
    a.loft(red, [ring(rrect(0.5, 0.6, 0.08), 0.07), ring(rrect(0.54, 0.64, 0.1), 0.13), ring(rrect(0.5, 0.58, 0.12), 0.2), ring(rrect(0.34, 0.4, 0.1), 0.23)])
    a.box(red, 0.16, 0.2, 0.09, (0.29, 0.05, 0.14), 0.02)                                      # discharge chute
    for sx in (-1, 1):
        for y, r in ((-0.24, 0.085), (0.26, 0.1)):
            a.wheel(r, 0.045, (sx * 0.295, y, r), n=10, hub=P('#e9e6dc'), hub_r=0.5)
    # engine
    a.box(dk, 0.22, 0.24, 0.12, (0, -0.02, 0.29), 0.02)
    a.cz(P('#e9e6dc'), 0.105, 0.35, 0.39, y=-0.02, n=10, bev=0.012)
    a.cz(bk, 0.04, 0.39, 0.405, y=-0.02, n=8)
    a.cz(red, 0.04, 0.23, 0.33, x=-0.15, y=0.08, n=8, bev=0.008)
    a.cz(bk, 0.03, 0.33, 0.35, x=-0.15, y=0.08, n=8)
    a.cyl(st, 0.03, (0.11, 0.0, 0.3), (0.2, 0.0, 0.3), 8)
    a.box(st, 0.07, 0.1, 0.06, (0.14, -0.13, 0.28), 0.012)
    for i in range(4):
        a.box(MT('#8f979c'), 0.2, 0.006, 0.1, (0, -0.145 - 0.0 * i, 0.29)) if i == 0 else a.box(MT('#8f979c'), 0.23, 0.2, 0.006, (0, -0.02, 0.25 + i * 0.022))
    # handle
    for s in a.mx():
        a.tube(st, fillet([(0.22, 0.24, 0.2), (0.22, 0.72, 0.84), (0.22, 0.86, 0.92)], 0.08, 2), 0.012, 6)
        a.box(bk, 0.03, 0.04, 0.04, (0.22, 0.25, 0.2))
    a.cyl(st, 0.012, (-0.22, 0.86, 0.92), (0.22, 0.86, 0.92), 6)
    a.cyl(bk, 0.017, (-0.2, 0.86, 0.92), (0.2, 0.86, 0.92), 6)
    a.cyl(st, 0.008, (-0.22, 0.6, 0.68), (0.22, 0.6, 0.68), 5)
    wire(a, bk, (0.1, 0.84, 0.9), (0.08, 0.02, 0.36), 0.005)
    a.box(bk, 0.05, 0.02, 0.04, (0.1, 0.82, 0.9))
    return a


@asset('yard')
def wheelbarrow():
    a = Asset('wheelbarrow')
    gr, st, wood = P('#2f6a49'), MT('#8f979c'), P('#8a6a4a')
    sec = lambda w, d: rrect(w, d, min(w, d) * 0.22)
    lv = [(0.36, 0.5, 0.32), (0.52, 0.74, 0.44), (0.62, 0.9, 0.58)]
    rings = [ring(sec(w, d), z, cy=(z - 0.32) * -0.35) for w, d, z in lv]
    rings += [ring(sec(w - 0.03, d - 0.03), z if i else z - 0.0, cy=(z - 0.32) * -0.35) for i, (w, d, z) in enumerate(reversed(lv))]
    rings[-1] = ring(sec(0.33, 0.47), 0.335)
    a.loft(gr, rings)
    for s in a.mx():
        a.tube(wood, [(0.27, 0.95, 0.56), (0.2, 0.2, 0.3), (0.06, -0.62, 0.2)], 0.02, 6)
        a.cyl(RB(), 0.026, (0.27, 0.95, 0.56), (0.275, 1.07, 0.6), 6)
        a.tube(st, fillet([(0.21, 0.28, 0.32), (0.24, 0.42, 0.0), (0.24, 0.52, 0.0)], 0.04, 2), 0.012, 5)
        a.tube(st, [(0.1, -0.42, 0.23), (0.2, -0.2, 0.4)], 0.01, 5)
    a.cyl(st, 0.01, (-0.24, 0.47, 0.012), (0.24, 0.47, 0.012), 5)
    a.wheel(0.19, 0.08, (0, -0.56, 0.19), n=12, hub=P('#b8281f'), hub_r=0.5)
    a.cyl(st, 0.012, (-0.075, -0.56, 0.19), (0.075, -0.56, 0.19), 6)
    return a


# ------------------------------------------------------------------ ladders
@asset('yard')
def ladders():
    a = Asset('ladder_step')
    al, al2, og = MT('#c3c8cb'), MT('#a9afb3'), P('#e8742a')
    H, sp = 1.75, 0.5
    for s in a.mx():
        a.bar(al, [(0.3, -sp, 0), (0.2, -0.04, H)], 0.03, 0.075, up=(1, 0, 0))
        a.bar(al2, [(0.28, sp, 0), (0.19, 0.03, H - 0.02)], 0.025, 0.05, up=(1, 0, 0))
        a.box(RB(), 0.05, 0.1, 0.02, (0.3, -sp, 0.01))
        a.box(RB(), 0.045, 0.08, 0.02, (0.28, sp, 0.01))
        a.bar(al2, [(0.262, -0.3, 0.7), (0.245, 0.3, 0.68)], 0.006, 0.03, up=(1, 0, 0))
    for i in range(1, 6):
        f = i / 6
        y, z, hw = lerp(-sp, -0.04, f), H * f, lerp(0.3, 0.2, f)
        a.box(al, hw * 2 - 0.02, 0.085, 0.022, (0, y + 0.01, z), 0.004, 'x')
    for f in (0.25, 0.6):
        a.box(al2, lerp(0.28, 0.19, f) * 2, 0.02, 0.04, (0, lerp(sp, 0.03, f), (H - 0.02) * f))
    a.bar(al2, [(-0.25, sp * 0.75, (H - 0.02) * 0.25), (0.2, sp * 0.4, (H - 0.02) * 0.6)], 0.035, 0.012, up=(0, 1, 0))
    a.box(og, 0.46, 0.17, 0.05, (0, 0, H + 0.01), 0.012)
    a.box(og, 0.36, 0.2, 0.015, (0, 0.2, 1.22), 0.004)
    b = Asset('ladder_long')
    L, lean = 4.2, 15.0
    with b.at((0, 0, 0), (-lean, 0, 0)):
        for s in b.mx():
            b.box(al, 0.03, 0.07, 2.5, (0.22, 0, 1.25), 0.006, 'z')
            b.box(al2, 0.028, 0.06, 2.5, (0.185, 0.07, L - 1.25), 0.006, 'z')
            b.box(P('#b8281f'), 0.04, 0.085, 0.06, (0.22, 0, 2.52))
            b.box(al2, 0.05, 0.03, 0.14, (0.2, 0.05, 2.2))
        for i in range(8):
            b.cyl(al2, 0.016, (-0.22, 0, 0.3 + i * 0.3), (0.22, 0, 0.3 + i * 0.3), 6, caps=False)
            b.cyl(al, 0.015, (-0.185, 0.07, L - 2.3 + i * 0.3), (0.185, 0.07, L - 2.3 + i * 0.3), 6, caps=False)
        wire(b, P('#d9d3c2'), (0.12, 0.04, 0.5), (0.12, 0.11, L - 0.3), 0.006)
    for sx in (-1, 1):
        b.box(RB(), 0.06, 0.12, 0.03, (sx * 0.22, 0, 0.015))
    b.extras['lean'] = {'deg': lean, 'top': [0, round(L * math.sin(rad(lean)), 3), round(L * math.cos(rad(lean)), 3)]}
    return [a, b]


# ------------------------------------------------------------------ small work props
def paint_can(a, at, col=None, label=True, rz=0.0, r=0.085, h=0.19):
    st = MT('#c3c8cb')
    with a.at(at, (0, 0, rz)):
        a.lathe(st, [(0, 0), (r, 0), (r, h - 0.006), (r + 0.004, h), (r - 0.012, h), (r - 0.012, h - 0.012)], 12, phase=0.5, caps=(True, False))
        if col:
            a.lathe(P(col), [(r - 0.012, h - 0.035), (0, h - 0.035)], 12, phase=0.5, caps=False)
            a.box(P(col), 0.03, 0.006, 0.09, (r * 0.5, -r * 0.966 - 0.001, h - 0.05), rot=(0, 8, 0))
        else:
            a.lathe(st, [(r - 0.012, h - 0.012), (r - 0.03, h - 0.004), (0, h - 0.004)], 12, phase=0.5, caps=False)
        if label:
            fw = 2 * r * math.sin(rad(15))                                   # the label wraps three facets of the 12-sided can
            for i in (-1, 0, 1):
                u = (i + 1) / 3
                with a.at(rot=(0, 0, 30 * i)):
                    a.decal('paint_lbl', 3 * fw, h * 0.6, (-i * fw, -r * 0.966 - 0.003, h * 0.47), shape=[(u, 0), (u + 1 / 3, 0), (u + 1 / 3, 1), (u, 1)])
        a.tube(MT('#8f979c'), [(-r - 0.004, 0, h * 0.75)] + arc((0, 0, h * 0.75), r + 0.03, 200, 340, 4, 'xz')[1:-1] + [(r + 0.004, 0, h * 0.75)], 0.003, 4, caps=False)


@asset('yard')
def paint_cans():
    a = Asset('paint_cans')
    paint_can(a, (-0.11, 0.04, 0), None, True, -15)
    paint_can(a, (0.1, 0.0, 0), '#3f8fbf', True, 10)
    paint_can(a, (-0.08, 0.03, 0.19), None, True, 25, 0.06, 0.13)
    paint_can(a, (0.02, -0.2, 0), '#e9e6dc', False, 40, 0.055, 0.12)
    # brush across the open can, drop cloth
    with a.at((0.1, 0.0, 0.197), (0, 0, 35)):
        a.box(P('#8a6a4a'), 0.03, 0.14, 0.012, (0, -0.07, 0.006), 0.004)
        a.box(MT('#b9bec2'), 0.055, 0.03, 0.014, (0, 0.012, 0.007))
        a.box(P('#3f8fbf'), 0.055, 0.06, 0.012, (0, 0.055, 0.007), 0.004, 'y')
    a.box(P('#d9d3c2'), 0.62, 0.52, 0.006, (0, -0.04, 0.003), rot=(0, 0, 8))
    a.box(P('#3f8fbf'), 0.07, 0.05, 0.002, (0.24, -0.1, 0.0075), rot=(0, 0, 30))
    return a


@asset('yard')
def toolbox():
    a = Asset('toolbox')
    red, st = G('#b8281f'), MT('#b9bec2')
    a.box(red, 0.5, 0.21, 0.16, (0, 0, 0.08), 0.012)
    a.prism(red, [(-0.105, 0.165), (0.105, 0.165), (0.105, 0.2), (0.05, 0.245), (-0.05, 0.245), (-0.105, 0.2)], -0.25, 0.25, 'yz', 0.01)
    a.box(P('#8f1f18'), 0.505, 0.215, 0.008, (0, 0, 0.1625))
    a.handle(st, (-0.1, 0, 0.245), (0.1, 0, 0.245), (0, 0, 0.035), 0.007)
    for x in (-0.16, 0.16):
        a.box(st, 0.04, 0.012, 0.07, (x, -0.108, 0.165), 0.004, 'xz')
        a.box(st, 0.05, 0.01, 0.012, (x, -0.114, 0.19))
    a.box(st, 0.04, 0.014, 0.03, (0, -0.108, 0.14))
    return a


@asset('yard')
def sawhorse():
    a = Asset('sawhorse')
    wood, wood2 = P('#b08a5b'), P('#9c7a4f')
    a.box(wood, 1.05, 0.09, 0.09, (0, 0, 0.73), 0.008, 'x')
    for s in a.mx():
        for t in a.mx(1):
            a.bar(wood2, [(0.44, 0.3, 0), (0.4, 0.05, 0.72)], 0.035, 0.085, up=(1, 0, 0))
        a.box(wood, 0.02, 0.44, 0.08, (0.455, 0, 0.3), 0.004, 'y')
    for t in a.mx(1):
        a.bar(wood, [(-0.43, 0.2, 0.3), (0.43, 0.2, 0.3)], 0.018, 0.07, up=(0, 0, 1))
    return a


def pallet(a, at=(0, 0, 0), rot=(0, 0, 0), seed=0):
    w1, w2, w3 = P('#b3925f'), P('#a3824f'), P('#8f7146')
    with a.at(at, rot):
        for i in range(7):
            y = lerp(-0.45, 0.45, i / 6)
            a.box((w1, w2)[int(rnd(seed, i) * 2)], 1.2, 0.1 + 0.02 * rnd(seed, i, 2), 0.02, (0, y, 0.134), 0.004, 'x')
        for x in (-0.55, 0, 0.55):
            a.box(w3, 0.09, 1.0, 0.09, (x, 0, 0.07))
        for y in (-0.44, 0, 0.44):
            a.box(w2, 1.2, 0.12, 0.02, (0, y, 0.012))


@asset('yard')
def pallets():
    a = Asset('pallet')
    pallet(a)
    b = Asset('pallet_stack')
    for i in range(4):
        pallet(b, ((rnd(i, 1) - 0.5) * 0.06, (rnd(i, 2) - 0.5) * 0.06, i * 0.146), (0, 0, (rnd(i, 3) - 0.5) * 9), i + 1)
    pallet(b, (0.0, -0.64, 0.5), (76, 0, 0), 9)
    return [a, b]

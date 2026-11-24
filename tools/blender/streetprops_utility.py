"""Lighting and utilities: street lamps, traffic signals, utility poles, cabinets, meters, wall lights, camera."""
import math
from streetprops_kit import *
from streetprops_furniture import STEEL, DARK, BLACK, CREAM
from streetprops_furniture2 import lerp, wire

GALV, GALV2, POLE, POLE2, GREEN = '#a3aaae', '#8b9296', '#6e5642', '#5d4836', '#3f5a4c'


def _base(a, m, r=0.2, h=0.03, n=4, bolt_r=0.15):
    a.box(m, r * 2, r * 2, h, (0, 0, h / 2), 0.02, 'z')
    a.bolts(MT('#c9cdd0'), [(sx * bolt_r, sy * bolt_r, h) for sx in (-1, 1) for sy in (-1, 1)], 0.018, 0.02, (0, 0, 1))


def _cobra(a, tip, d=(1, 0)):
    """Cobra-head luminaire hanging at the end of an arm; `tip` = arm end, d = outward direction in XY."""
    ang = math.degrees(math.atan2(d[1], d[0]))
    with a.at(tip, (0, 0, ang)):
        st = MT(GALV2)
        a.loft(st, [ring(rrect(0.1, 0.1, 0.03), 0), ring(rrect(0.16, 0.2, 0.05), 0.12, cx=0), ring(rrect(0.3, 0.3, 0.09), 0.34), ring(rrect(0.2, 0.26, 0.08), 0.62),
                    ring(rrect(0.06, 0.1, 0.03), 0.7)], at=(-0.04, 0, 0.02), rot=(0, 90, 0))
        a.sphere(LT('lamp', '#fff1c4'), 0.13, (0.36, 0, -0.045), 10, 3, (1.35, 0.95, 0.55), a0=0, a1=90)
        a.box(st, 0.05, 0.05, 0.05, (0.2, 0, 0.11), 0.01)
        a.cz(P('#3b6ea8'), 0.03, 0.135, 0.17, x=0.2, n=8)


def _lamp_pole(a, h=9.0):
    st = MT(GALV)
    _base(a, MT(GALV2), 0.22, 0.03, bolt_r=0.16)
    a.lathe(st, [(0.15, 0.03), (0.15, 0.3), (0.12, 0.36), (0.11, 0.4)], 10, caps=False)
    a.box(MT(GALV2), 0.1, 0.01, 0.16, (0, -0.146, 0.18))
    a.cyl(st, 0.11, (0, 0, 0.4), (0, 0, h - 1.0), 10, r2=0.065, caps=False)
    a.cyl(st, 0.065, (0, 0, h - 1.0), (0, 0, h - 0.4), 10, r2=0.06, caps=(False, True))


def _arm(a, h, reach, sgn=1):
    st = MT(GALV)
    pts = [(0, 0, h - 1.6), (sgn * 0.35, 0, h - 0.75), (sgn * 1.1, 0, h - 0.18), (sgn * reach, 0, h - 0.05)]
    a.tube(st, fillet(pts, 0.9, 4), 0.04, 8)
    a.tube(st, [(0, 0, h - 0.75), (sgn * 0.55, 0, h - 0.5)], 0.018, 5)
    a.lathe(MT(GALV2), [(0.085, h - 1.68), (0.085, h - 1.52)], 10, caps=False)
    _cobra(a, (sgn * reach, 0, h - 0.05), (sgn, 0))


@asset('utility')
def street_lamps():
    a = Asset('street_lamp_cobra')
    _lamp_pole(a, 9.0)
    _arm(a, 9.0, 2.1, 1)
    a.sphere(MT(GALV2), 0.062, (0, 0, 8.6), 10, 3, a0=90, a1=180)
    b = Asset('street_lamp_double')
    _lamp_pole(b, 9.0)
    _arm(b, 9.0, 2.1, 1)
    _arm(b, 9.0, 2.1, -1)
    b.sphere(MT(GALV2), 0.062, (0, 0, 8.6), 10, 3, a0=90, a1=180)
    # old town-square lamp: fluted cast post, lantern
    c = Asset('street_lamp_old')
    ir, ir2 = P('#232a27'), P('#2f3a35')
    c.lathe(ir, [(0, 0), (0.2, 0), (0.2, 0.06), (0.16, 0.1), (0.15, 0.36), (0.17, 0.4), (0.17, 0.44), (0.11, 0.52), (0.09, 0.7), (0.105, 0.74), (0.075, 0.8)], 10)
    sec = [((0.07 if i % 2 == 0 else 0.058) * math.cos(math.tau * i / 16), (0.07 if i % 2 == 0 else 0.058) * math.sin(math.tau * i / 16)) for i in range(16)]
    c.loft(ir2, [ring(sec, 0.8), ring(sec, 3.0, 0.72)], caps=False)
    c.lathe(ir, [(0.05, 3.0), (0.08, 3.03), (0.08, 3.07), (0.05, 3.1), (0.05, 3.2), (0.1, 3.27), (0.16, 3.3), (0.16, 3.33)], 10, caps=(False, True))
    for s in c.mx():
        c.tube(ir, [(0.05, 0, 2.72), (0.34, 0, 2.72)], 0.014, 5)
        c.sphere(ir, 0.028, (0.36, 0, 2.72), 6, 4)
    # lantern: four tapering panes, frame bars, roof, finial
    for i in range(4):
        with c.at((0, 0, 3.33), (0, 0, 90 * i)):
            c.mesh(LT('lamp', '#ffe9b0'), [(-0.1, -0.1, 0), (0.1, -0.1, 0), (0.17, -0.17, 0.42), (-0.17, -0.17, 0.42)], [[0, 1, 2, 3]], closed=False)
            c.bar(ir, [(-0.1, -0.1, 0), (-0.17, -0.17, 0.42)], 0.02, 0.02, up=(0, 1, 0))
    c.lathe(ir, [(0.26, 3.75), (0.27, 3.78), (0.12, 3.92), (0.05, 3.95), (0.05, 3.99), (0.03, 4.02), (0.045, 4.06), (0, 4.1)], 4, phase=0.5, caps=(True, False))
    c.cz(P('#fff6d8'), 0.045, 3.36, 3.6, n=6)
    return [a, b, c]


# ------------------------------------------------------------------ traffic signals
def _head(a, at, rz=0.0, ped=False, col='#d9a81e'):
    """Three-light signal head (or a ped head) facing -Y after rz; `at` = centre."""
    ye, bk = P(col), P(BLACK)
    with a.at(at, (0, 0, rz)):
        if ped:
            a.box(ye, 0.38, 0.2, 0.4, (0, 0, 0), 0.02)
            a.box(bk, 0.32, 0.012, 0.34, (0, -0.103, 0))
            a.plate(LT('walk', '#f4f1e4'), 0.12, 0.2, (0.07, -0.109, 0), t=0.004)
            a.prism(LT('dont_walk', '#e8632a'), [(-0.13, -0.09), (-0.03, -0.09), (-0.03, 0.02), (-0.045, 0.1), (-0.115, 0.1), (-0.13, 0.02)], -0.113, -0.109, 'xz')
            a.box(ye, 0.4, 0.12, 0.012, (0, -0.15, 0.2), rot=(8, 0, 0))
            return
        a.box(ye, 0.32, 0.2, 1.0, (0, 0, 0), 0.025)
        a.box(bk, 0.5, 0.012, 1.2, (0, 0.07, 0), 0.06, 'y')
        for i, (lab, c) in enumerate((('red', '#e3342b'), ('amber', '#f2b632'), ('green', '#3fd07a'))):
            z = 0.32 - i * 0.32
            a.cyl(LT(lab, c), 0.105, (0, -0.1, z), (0, -0.112, z), 10)
            # visor: half tube open at the bottom
            pts = [(0.125 * math.cos(rad(t)), 0.125 * math.sin(rad(t))) for t in range(-20, 201, 44)]
            vv = [(x, -0.1, z + zz) for x, zz in pts] + [(x * 0.96, -0.3, z + zz * 0.96 - 0.01) for x, zz in pts]
            k = len(pts)
            a.mesh(ye, vv, [[j, k + j, k + j + 1, j + 1] for j in range(k - 1)], closed=False)
            a.mesh(bk, [(x, y, zz - 0.004) for x, y, zz in vv], [[j + 1, k + j + 1, k + j, j] for j in range(k - 1)], closed=False)


@asset('utility')
def traffic_signals():
    a = Asset('traffic_signal_mast')
    st, dk = MT(GALV), MT(GALV2)
    _base(a, dk, 0.26, 0.04, bolt_r=0.19)
    a.lathe(st, [(0.17, 0.04), (0.17, 0.4), (0.14, 0.46)], 10, caps=False)
    a.cyl(st, 0.14, (0, 0, 0.46), (0, 0, 6.6), 10, r2=0.1, caps=(False, True))
    a.cyl(dk, 0.115, (0, 0, 6.6), (0, 0, 6.66), 10, bev=0.02)
    # mast arm reaches 7 m along -X... kept on +X: heads face -Y (oncoming traffic)
    L = 7.0
    a.cyl(st, 0.085, (0, 0, 6.0), (L, 0, 6.35), 8, r2=0.045)
    a.lathe(dk, [(0.16, 5.85), (0.16, 6.12)], 10, caps=False)
    a.tube(st, [(0, 0, 5.2), (1.3, 0, 6.02)], 0.03, 6)
    for x in (3.6, 6.4):
        z = 6.0 + 0.35 * x / L
        a.box(dk, 0.06, 0.06, 0.2, (x, 0, z - 0.1))
        _head(a, (x, 0, z - 0.75))
    # side-mounted head and ped head on the pole, push button, cabinet box
    a.box(dk, 0.05, 0.22, 0.05, (0, -0.2, 3.9))
    _head(a, (0, -0.33, 3.5))
    a.box(dk, 0.2, 0.05, 0.05, (0.2, 0, 2.75))
    _head(a, (0.42, 0, 2.6), 90, ped=True)
    a.box(P('#d9a81e'), 0.11, 0.05, 0.16, (0, -0.16, 1.15), 0.012)
    a.cyl(MT('#c9cdd0'), 0.022, (0, -0.185, 1.13), (0, -0.2, 1.13), 8)
    a.plate(P(BLACK), 0.07, 0.04, (0, -0.186, 1.19), t=0.004)
    a.extras['lights'] = ['red', 'amber', 'green', 'walk', 'dont_walk']
    b = Asset('traffic_signal_post')
    _base(b, dk, 0.2, 0.03, bolt_r=0.14)
    b.lathe(st, [(0.13, 0.03), (0.13, 0.34), (0.1, 0.4), (0.075, 0.44)], 10, caps=False)
    b.cyl(st, 0.075, (0, 0, 0.44), (0, 0, 3.7), 10, r2=0.06, caps=False)
    b.cyl(dk, 0.075, (0, 0, 3.7), (0, 0, 3.76), 10, bev=0.012)
    _head(b, (0, 0, 4.3))
    b.cz(dk, 0.03, 3.76, 3.8, n=6)
    b.box(dk, 0.2, 0.05, 0.05, (-0.16, 0, 2.6))
    _head(b, (-0.36, 0, 2.45), -90, ped=True)
    b.box(P('#d9a81e'), 0.11, 0.05, 0.16, (0, -0.1, 1.15), 0.012)
    b.cyl(MT('#c9cdd0'), 0.022, (0, -0.125, 1.13), (0, -0.14, 1.13), 8)
    b.extras['lights'] = a.extras['lights']
    return [a, b]


# ------------------------------------------------------------------ utility poles
def _insulator(a, at, col='#7c5a44'):
    x, y, z = at
    a.cz(MT('#6f7579'), 0.012, z, z + 0.06, x=x, y=y, n=5, caps=False)
    a.lathe(P(col), [(0.02, z + 0.05), (0.055, z + 0.06), (0.055, z + 0.085), (0.03, z + 0.1), (0.045, z + 0.115), (0.03, z + 0.14), (0, z + 0.145)], 8,
            at=(x, y, 0), caps=(True, False))


def _pole(a, h=11.0, arms=((10.3, 2.4),), pegs=True):
    wood, wood2, st = P(POLE), P(POLE2), MT('#6f7579')
    a.cyl(wood, 0.17, (0, 0, 0), (0, 0, h), 10, r2=0.11, caps=(False, True))
    a.lathe(wood2, [(0.172, 0), (0.168, 0.5)], 10, caps=False)
    a.box(MT('#b9bec2'), 0.09, 0.006, 0.06, (0, -0.164, 1.7))                 # pole number tag
    a.decal('idtag', 0.085, 0.032, (0, -0.1675, 1.7))
    if pegs:
        for i in range(12):
            z = 3.0 + i * 0.55
            sgn = 1 if i % 2 == 0 else -1
            r = lerp(0.17, 0.11, z / h)
            a.cyl(st, 0.011, (sgn * (r - 0.02), 0, z), (sgn * (r + 0.13), 0, z), 5)
    for z, w in arms:
        a.box(wood2, w, 0.1, 0.12, (0, -0.16, z), 0.012, 'x')
        a.bolts(st, [(0, -0.215, z)], 0.02, 0.012)
        for s in a.mx():
            a.bar(st, [(0.1, -0.13, z - 0.55), (w * 0.33, -0.2, z - 0.05)], 0.008, 0.035, up=(0, 1, 0))
            for f in (0.44, 0.2) if w > 1.6 else (0.4,):
                _insulator(a, (w * f, -0.16, z + 0.06))
    _insulator(a, (0, 0, h - 0.01))
    # ground wire down the pole, guy-wire eye
    wire(a, MT('#8b6b3a'), (0.0, 0.158, 0.3), (0.0, 0.118, h - 1.0), 0.006)


@asset('utility')
def utility_poles():
    a = Asset('utility_pole')
    _pole(a, 11.0, ((10.3, 2.4), (9.2, 1.4)))
    b = Asset('utility_pole_transformer')
    _pole(b, 11.0, ((10.3, 2.4),))
    gy, dk, st = P('#8d959a'), P('#6d757a'), MT('#6f7579')
    with b.at((0, 0.42, 8.2)):
        b.lathe(gy, [(0, 0), (0.26, 0), (0.28, 0.03), (0.28, 0.82), (0.26, 0.86), (0.2, 0.9), (0, 0.9)], 12)
        b.lathe(dk, [(0.285, 0.74), (0.285, 0.78)], 12, caps=False)
        for i in range(8):
            ang = rad(100 + i * 160 / 7)
            b.box(dk, 0.012, 0.06, 0.5, (0.3 * math.cos(ang - math.pi / 2), 0.3 * math.sin(ang - math.pi / 2) * -1, 0.4), rot=(0, 0, math.degrees(ang)))
        for x in (-0.1, 0.1):
            b.lathe(P('#7c5a44'), [(0.035, 0.9), (0.05, 0.93), (0.03, 0.96), (0.05, 0.99), (0.03, 1.02), (0.05, 1.05), (0.02, 1.1), (0, 1.1)], 8, at=(x, 0, 0), caps=(False, False))
        b.box(st, 0.1, 0.2, 0.06, (0, -0.28, 0.72))
        b.box(st, 0.1, 0.2, 0.06, (0, -0.28, 0.16))
    b.decal('danger', 0.3, 0.125, (0, -0.172, 2.2))
    wire(b, P(BLACK), (0.1, 0.42, 9.3), (0.5, -0.16, 10.42), 0.008)
    wire(b, P(BLACK), (-0.1, 0.42, 9.3), (-0.5, -0.16, 10.42), 0.008)
    c = Asset('utility_pole_light')
    _pole(c, 11.0, ((10.3, 2.4),))
    c.tube(MT(GALV), fillet([(0, -0.12, 7.2), (0, -0.7, 7.75), (0, -1.5, 7.9)], 0.5, 3), 0.03, 6)
    c.box(MT(GALV2), 0.08, 0.02, 0.3, (0, -0.15, 7.25))
    _cobra(c, (0, -1.5, 7.9), (0, -1))
    return [a, b, c]


# ------------------------------------------------------------------ cabinets and meters
@asset('utility')
def electric_box():
    a = Asset('electric_box')
    gr, dk, st = P(GREEN), P('#324a3e'), MT('#6f7579')
    a.box(P('#a39e93'), 0.9, 0.56, 0.1, (0, 0, 0.05), 0.02, 'xyT')
    a.box(gr, 0.78, 0.44, 1.2, (0, 0, 0.7), 0.015)
    a.box(gr, 0.84, 0.5, 0.04, (0, 0, 1.31), 0.012, 'xyB')
    for s in a.mx():
        a.box(dk, 0.36, 0.012, 1.08, (0.185, -0.224, 0.7), 0.008, 'xz')
        a.slats(dk, 0.05, 0.32, 0.98, 1.16, -0.232, 4, 0.02, 0.01)
        a.bolts(st, [(0.345, -0.23, z) for z in (0.3, 1.1)], 0.014, 0.01)
    a.handle(st, (0.03, -0.232, 0.62), (0.03, -0.232, 0.78), (0, -0.03, 0), 0.008)
    a.cyl(st, 0.02, (-0.04, -0.23, 0.7), (-0.04, -0.245, 0.7), 8)
    a.decal('danger', 0.24, 0.1, (-0.19, -0.2305, 0.86))
    a.decal('warn', 0.12, 0.12, (0.19, -0.2305, 0.6))
    with a.at(rot=(0, 0, 90)):
        a.slats(dk, -0.15, 0.15, 0.3, 0.6, -0.392, 5, 0.02, 0.008)
    return a


@asset('utility')
def transformer_pad():
    a = Asset('transformer_pad')
    gr, dk, st = P('#4a6658'), P('#3a5346'), MT('#6f7579')
    a.box(P('#a39e93'), 1.5, 1.3, 0.12, (0, 0, 0.06), 0.02, 'xyT')
    a.box(gr, 1.2, 0.62, 0.95, (0, 0.2, 0.595), 0.015)
    a.prism(gr, [(-0.48, 0.12), (-0.11, 0.12), (-0.11, 1.07), (-0.2, 1.07), (-0.48, 0.92)], -0.6, 0.6, 'yz', 0.012)
    for i in range(9):                                                   # cooling fins on the back
        a.box(dk, 0.02, 0.1, 0.7, (-0.5 + i * 0.125, 0.55, 0.6))
    for s in a.mx():
        a.box(dk, 0.56, 0.012, 0.74, (0.295, -0.484, 0.52), 0.008, 'xz')
        a.bolts(st, [(0.52, -0.49, 0.25), (0.52, -0.49, 0.78)], 0.014, 0.01)
    a.handle(st, (0.06, -0.492, 0.44), (0.06, -0.492, 0.6), (0, -0.03, 0), 0.008)
    a.decal('danger', 0.3, 0.125, (-0.29, -0.4905, 0.7))
    a.decal('warn', 0.14, 0.14, (0.3, -0.4905, 0.62))
    a.box(st, 0.1, 0.1, 0.06, (0.4, 0.2, 1.1), 0.01)
    return a


@asset('utility')
def water_meter():
    """Meter pit lid set in the pavement plus a short riser with a brass meter."""
    a = Asset('water_meter')
    iron, bz, bl = MT('#5b5f62'), MT('#b08a3c'), P('#2a559b')
    a.box(P('#a39e93'), 0.52, 0.4, 0.02, (0, 0, 0.01), 0.01, 'xyT')
    a.box(iron, 0.4, 0.28, 0.012, (0, 0, 0.026), 0.02, 'z')
    a.plate(MT('#494c4f'), 0.14, 0.05, (0, 0, 0.0325), (90, 0, 0), t=0.003)
    for s in a.mx():
        a.tube(MT('#8f979c'), fillet([(0.17, 0.26, 0), (0.17, 0.26, 0.3), (0.06, 0.26, 0.3)], 0.05, 2), 0.022, 6)
        a.cyl(bz, 0.03, (0.06, 0.26, 0.3), (0.1, 0.26, 0.3), 6)
    a.lathe(bz, [(0, 0.25), (0.06, 0.25), (0.075, 0.27), (0.075, 0.33), (0.06, 0.35), (0, 0.35)], 10, at=(0, 0.26, 0))
    a.lathe(bl, [(0.062, 0.35), (0.062, 0.375), (0.05, 0.385), (0, 0.385)], 10, at=(0, 0.26, 0), caps=(False, True))
    a.box(P('#b8281f'), 0.09, 0.02, 0.012, (0.165, 0.26, 0.34), rot=(0, 0, 30))
    a.cz(bz, 0.012, 0.3, 0.34, x=0.165, y=0.26, n=5)
    return a


@asset('utility')
def gas_meter():
    """Wall mounted: origin on the ground at the wall, the wall is the plane y = 0."""
    a = Asset('gas_meter')
    gy, dk, pipe = P('#9aa2a6'), P('#7c858a'), MT('#77705f')
    a.tube(pipe, fillet([(-0.2, -0.1, 0), (-0.2, -0.1, 0.78), (-0.09, -0.1, 0.78), (-0.09, -0.1, 0.66)], 0.04, 2), 0.02, 6)
    a.tube(pipe, fillet([(0.09, -0.1, 0.66), (0.09, -0.1, 0.9), (0.09, 0.0, 0.9)], 0.04, 2), 0.02, 6)
    a.lathe(P('#8a5a2c'), [(0, 0), (0.07, 0), (0.09, 0.02), (0.09, 0.05), (0.03, 0.08), (0, 0.08)], 10, at=(-0.2, -0.1, 0.42), rot=(0, 0, 0))
    a.cyl(dk, 0.03, (-0.2, -0.1, 0.5), (-0.2, -0.1, 0.56), 6)
    a.box(P('#b8281f'), 0.03, 0.1, 0.014, (-0.2, -0.14, 0.3), 0.004)
    a.cyl(MT('#b08a3c'), 0.028, (-0.2, -0.1, 0.27), (-0.2, -0.1, 0.33), 6)
    a.box(gy, 0.3, 0.17, 0.3, (0, -0.1, 0.5), 0.03)
    a.box(gy, 0.26, 0.15, 0.04, (0, -0.1, 0.66), 0.012)
    a.box(dk, 0.3, 0.176, 0.02, (0, -0.1, 0.5))
    a.decal('gas_dial', 0.16, 0.1, (0, -0.1885, 0.57))
    a.rim(dk, 0.18, 0.12, (0, -0.19, 0.57), 0.012, 0.01)
    a.plate(P('#e3b62e'), 0.1, 0.04, (0, -0.186, 0.42), t=0.004)
    for x in (-0.09, 0.09):
        a.cyl(dk, 0.028, (x, -0.1, 0.68), (x, -0.1, 0.72), 6)
    a.box(MT('#6f7579'), 0.06, 0.1, 0.03, (0.09, -0.05, 0.9))
    a.extras['mount'] = 'wall-floor'
    return a


@asset('utility')
def fire_alarm_box():
    a = Asset('fire_alarm_box')
    red, dk, wh = P('#b8281f'), P('#8f1f18'), P('#f1efe6')
    a.lathe(red, [(0, 0), (0.13, 0), (0.13, 0.05), (0.09, 0.1), (0.07, 0.14), (0.055, 0.2)], 10)
    a.cyl(red, 0.055, (0, 0, 0.2), (0, 0, 1.2), 10, caps=False)
    a.lathe(dk, [(0.058, 0.72), (0.07, 0.74), (0.07, 0.78), (0.058, 0.8)], 10, caps=False)
    a.lathe(red, [(0.055, 1.2), (0.09, 1.24), (0.09, 1.27)], 10, caps=False)
    # gabled box
    a.prism(red, [(-0.14, 1.27), (0.14, 1.27), (0.14, 1.62), (0, 1.74), (-0.14, 1.62)], -0.09, 0.09, 'xz', 0.012)
    a.prism(dk, [(-0.17, 1.6), (0, 1.75), (0.17, 1.6), (0.17, 1.63), (0, 1.78), (-0.17, 1.63)], -0.11, 0.11, 'xz')
    a.box(dk, 0.21, 0.012, 0.27, (0, -0.094, 1.44), 0.01, 'xz')
    a.decal('fire_lbl', 0.15, 0.2, (0, -0.1015, 1.45))
    a.box(wh, 0.07, 0.02, 0.022, (0, -0.108, 1.395), 0.005, 'x')
    a.sphere(LT('lamp', '#ff5a3c'), 0.035, (0, 0, 1.79), 8, 4)
    a.cz(dk, 0.02, 1.74, 1.77, n=6)
    return a


# ------------------------------------------------------------------ wall lights, camera
@asset('utility')
def wall_lights():
    """Wall mounted: origin on the wall at the mounting plate, the wall is the plane y = 0."""
    a = Asset('wall_light_gooseneck')
    a.ground = False
    dk, gr = P('#2b302d'), P('#2f4a3d')
    a.cyl(dk, 0.055, (0, 0, 0), (0, -0.02, 0), 10, bev=0.006)
    a.tube(dk, fillet([(0, -0.02, 0), (0, -0.16, 0.0), (0, -0.3, 0.2), (0, -0.52, 0.2), (0, -0.6, 0.06)], 0.12, 3), 0.014, 6)
    with a.at((0, -0.6, 0.06), (25, 0, 0)):
        a.lathe(gr, [(0.03, 0.0), (0.045, -0.04), (0.2, -0.12), (0.21, -0.14)], 12, caps=False)
        a.lathe(P('#e9e6dc'), [(0.205, -0.138), (0.195, -0.118), (0.04, -0.04)], 12, caps=False)
        a.cz(dk, 0.032, -0.01, 0.03, n=8)
        a.sphere(LT('lamp', '#fff1c4'), 0.045, (0, 0, -0.085), 8, 4, (1, 1, 1.3))
    a.extras['mount'] = 'wall'
    b = Asset('wall_light_box')
    b.ground = False
    gy = P('#6d757a')
    b.box(gy, 0.3, 0.06, 0.2, (0, -0.03, 0), 0.012)
    b.prism(gy, [(0.0, 0.11), (-0.22, 0.11), (-0.22, 0.04), (-0.06, -0.1), (0.0, -0.1)], -0.16, 0.16, 'yz', 0.012)
    with b.at((0, -0.14, -0.03), (-48.8, 0, 0)):
        b.rim(P('#4f565a'), 0.3, 0.2, (0, -0.006, 0), 0.02, 0.012)
        b.plate(LT('lamp', '#fff1c4'), 0.27, 0.17, (0, -0.002, 0), t=0.006)
        for x in (-0.07, 0.0, 0.07):
            b.box(P('#4f565a'), 0.008, 0.008, 0.17, (x, -0.012, 0))
    b.cz(P('#4f565a'), 0.02, 0.11, 0.135, x=0.09, y=-0.1, n=6)
    b.extras['mount'] = 'wall'
    c = Asset('security_camera')
    c.ground = False
    wh, dk = P('#d9dcdc'), P(BLACK)
    c.box(wh, 0.1, 0.012, 0.14, (0, -0.006, 0), 0.01, 'y')
    c.bolts(MT('#6f7579'), [(sx * 0.03, -0.012, sz * 0.05) for sx in (-1, 1) for sz in (-1, 1)], 0.007, 0.005)
    c.tube(wh, fillet([(0, -0.012, 0), (0, -0.2, 0), (0, -0.24, -0.06)], 0.04, 2), 0.016, 6)
    c.sphere(wh, 0.03, (0, -0.24, -0.07), 8, 4)
    with c.at((0, -0.24, -0.1), (-18, 0, 28)):
        c.box(wh, 0.1, 0.3, 0.09, (0, -0.06, -0.03), 0.012)
        c.box(P('#c3c7c7'), 0.125, 0.36, 0.012, (0, -0.085, 0.022), 0.004, 'y')
        c.cyl(dk, 0.036, (0, -0.21, -0.03), (0, -0.25, -0.03), 10)
        c.cyl(GLS(), 0.026, (0, -0.25, -0.03), (0, -0.254, -0.03), 10)
        c.plate(LT('led', '#ff3b30'), 0.012, 0.012, (0.03, -0.211, 0.0), t=0.003)
        wire(c, dk, (0, 0.09, -0.03), (0, 0.13, -0.0), 0.006)
    c.extras['mount'] = 'wall'
    return [a, b, c]

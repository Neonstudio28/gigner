"""Gas station props: 1980s pump, air pump, pump island, oil rack, squeegee stand, tyre rack."""
import math
from streetprops_kit import *
from streetprops_furniture import STEEL, DARK, BLACK, CREAM, body_mat
from streetprops_furniture2 import lerp, wire
from streetprops_waste import tyre

CONC, YEL = '#a39e93', '#e3b62e'


@asset('gas')
def gas_pump_80s():
    a = Asset('gas_pump_80s')
    body, wh, dk, st, ch = body_mat(), P('#ecebe4'), P('#2b2e33'), MT('#b9bec2'), CH()
    W, D = 0.74, 0.46
    a.box(dk, W + 0.06, D + 0.06, 0.08, (0, 0, 0.04), 0.012)
    a.box(wh, W, D, 0.76, (0, 0, 0.46), 0.015)                                   # lower cabinet
    a.box(ch, W + 0.012, D + 0.012, 0.03, (0, 0, 0.855))
    a.box(body, W, D, 0.6, (0, 0, 1.17), 0.015)                                  # dial housing
    a.box(ch, W + 0.012, D + 0.012, 0.025, (0, 0, 1.4825))
    a.box(wh, W + 0.08, 0.3, 0.2, (0, 0, 1.595), 0.02)                           # lit header
    for i in range(2):
        with a.at(rot=(0, 0, 180 * i)):
            y = -D / 2
            a.box(body, W - 0.1, 0.012, 0.44, (0, y - 0.004, 0.56), 0.008, 'xz')
            a.decal('pump_grade', 0.5, 0.148, (0, y - 0.0115, 0.66))
            a.slats(dk, -0.24, 0.24, 0.38, 0.52, y - 0.012, 4, 0.016, 0.006)
            a.box(dk, W - 0.1, 0.01, 0.08, (0, y - 0.003, 0.2), 0.006, 'xz')
            a.cyl(st, 0.014, (0.26, y - 0.008, 0.2), (0.26, y - 0.016, 0.2), 6)
            a.decal('pump_face', 0.5, 0.568, (0, y - 0.0035, 1.17))
            a.rim(ch, 0.54, 0.6, (0, y - 0.006, 1.17), 0.022, 0.014)
            a.plate(LT('panel', '#fff6dc'), 0.7, 0.13, (0, -0.152, 1.595), t=0.006)
            a.rim(ch, 0.74, 0.16, (0, -0.154, 1.595), 0.016, 0.01)
            a.box(P('#c9372c'), 0.5, 0.004, 0.035, (0, -0.157, 1.595))
    # nozzle boot, nozzle and hose on the +X side; reset crank on the -X side
    a.box(dk, 0.05, 0.14, 0.2, (W / 2 + 0.02, -0.08, 1.2), 0.012)
    a.box(st, 0.012, 0.16, 0.26, (W / 2 + 0.004, -0.08, 1.2))
    nz = (W / 2 + 0.075, -0.08)
    a.tube(st, [(nz[0] - 0.035, nz[1], 1.25), (nz[0], nz[1], 1.2), (nz[0], nz[1], 1.1)], 0.014, 6)
    a.box(P('#c9372c'), 0.05, 0.06, 0.15, (nz[0], nz[1], 1.03), 0.012)
    a.handle(st, (nz[0] + 0.012, nz[1] - 0.0, 1.09), (nz[0] + 0.012, nz[1], 0.97), (0.04, 0, 0), 0.005)
    a.cyl(st, 0.02, (nz[0], nz[1], 0.955), (nz[0], nz[1], 0.92), 6)
    a.tube(RB(), fillet([(nz[0], nz[1], 0.93), (nz[0] + 0.02, nz[1], 0.5), (nz[0] + 0.04, 0.0, 0.2), (nz[0] + 0.03, 0.1, 0.5), (nz[0], 0.12, 1.3),
                         (W / 2 - 0.02, 0.12, 1.38)], 0.09, 3), 0.017, 6)
    a.cyl(st, 0.024, (W / 2 - 0.0, 0.12, 1.38), (W / 2 + 0.03, 0.12, 1.375), 6)
    a.cyl(st, 0.012, (-W / 2, 0.0, 1.0), (-W / 2 - 0.04, 0.0, 1.0), 6)
    a.tube(st, [(-W / 2 - 0.035, 0, 1.0), (-W / 2 - 0.035, 0.0, 0.92), (-W / 2 - 0.08, 0.0, 0.92)], 0.008, 5)
    a.cyl(dk, 0.014, (-W / 2 - 0.05, 0, 0.92), (-W / 2 - 0.1, 0, 0.92), 6)
    a.decal('self_serve', 0.3, 0.169, (-W / 2 - 0.0035, 0, 0.5), (0, 0, -90))
    a.extras['tints'] = {'body': ['#c9372c', '#2a559b', '#2f7a5a', '#e3b62e']}
    a.extras['lights'] = ['panel']
    return a


@asset('gas')
def air_pump():
    a = Asset('air_pump')
    red, dk, st, ch = G('#c2362c'), P('#2b2e33'), MT('#b9bec2'), CH()
    a.box(MT('#8b9296'), 0.34, 0.34, 0.03, (0, 0, 0.015), 0.01, 'z')
    a.bolts(st, [(sx * 0.13, sy * 0.13, 0.03) for sx in (-1, 1) for sy in (-1, 1)], 0.014, 0.012, (0, 0, 1))
    a.lathe(red, [(0.1, 0.03), (0.1, 0.1), (0.07, 0.14), (0.07, 0.72), (0.1, 0.78)], 10, caps=False)
    a.box(red, 0.38, 0.28, 0.56, (0, 0, 1.06), 0.03)
    a.box(ch, 0.4, 0.3, 0.02, (0, 0, 1.345), 0.006)
    a.sphere(red, 0.16, (0, 0, 1.355), 10, 3, (1.1, 0.8, 0.45), a0=90, a1=180)
    a.decal('air', 0.2, 0.2, (0, -0.1435, 1.19))
    a.rim(ch, 0.23, 0.23, (0, -0.146, 1.19), 0.014, 0.012)
    # pressure gauge, coin slot, bell button
    a.cyl(ch, 0.075, (-0.07, -0.14, 0.95), (-0.07, -0.16, 0.95), 12, bev=0.006)
    a.cyl(P('#f1efe6'), 0.062, (-0.07, -0.16, 0.95), (-0.07, -0.163, 0.95), 12)
    a.box(P('#c9372c'), 0.006, 0.004, 0.05, (-0.062, -0.165, 0.962), rot=(0, 35, 0))
    a.cyl(dk, 0.01, (-0.07, -0.163, 0.95), (-0.07, -0.168, 0.95), 6)
    a.box(st, 0.09, 0.012, 0.12, (0.1, -0.142, 0.95), 0.006, 'xz')
    a.box(dk, 0.008, 0.006, 0.04, (0.1, -0.147, 0.975))
    a.box(dk, 0.05, 0.006, 0.03, (0.1, -0.147, 0.915))
    # hose coil on a side hook
    a.cyl(st, 0.012, (0.19, 0, 1.2), (0.3, 0, 1.2), 6)
    a.cyl(st, 0.03, (0.295, 0, 1.2), (0.305, 0, 1.2), 8)
    for i in range(3):
        a.torus(RB(), 0.15, 0.017, (0.215 + i * 0.03, 0, 1.06 + 0.006 * i), (0, 90, 0), 12, 5)
    a.tube(RB(), fillet([(0.26, -0.15, 1.06), (0.27, -0.2, 0.8), (0.26, -0.16, 0.62)], 0.08, 2), 0.015, 6)
    a.cyl(MT('#b08a3c'), 0.016, (0.26, -0.16, 0.62), (0.255, -0.15, 0.55), 6)
    a.cyl(MT('#b08a3c'), 0.012, (0.255, -0.15, 0.56), (0.255, -0.2, 0.55), 6)
    a.tube(st, [(0.07, 0.14, 0.8), (0.07, 0.19, 0.8), (0.07, 0.19, 0.03)], 0.012, 6)
    return a


@asset('gas')
def pump_island():
    a = Asset('pump_island')
    conc, ye, st = P(CONC), P(YEL), MT('#8b9296')
    L, Wd = 4.4, 1.2
    a.prism(ye, rrect(L, Wd, 0.5, 4), 0.0, 0.14, 'xy')
    a.prism(conc, rrect(L - 0.03, Wd - 0.03, 0.485, 4), 0.1, 0.16, 'xy', 0.012)
    a.prism(P('#8f8a80'), rrect(L - 0.5, Wd - 0.5, 0.2, 2), 0.16, 0.163, 'xy')
    slots = []
    for s in a.mx():
        a.box(P('#8f8a80'), 0.9, 0.6, 0.03, (0.85, 0, 0.175), 0.008)
        a.bolts(st, [(0.85 + sx * 0.4, sy * 0.25, 0.19) for sx in (-1, 1) for sy in (-1, 1)], 0.016, 0.012, (0, 0, 1))
        # end guard: yellow pipe hoop
        a.tube(ye, fillet([(1.88, -0.36, 0.16), (1.88, -0.36, 0.95), (1.88, 0.36, 0.95), (1.88, 0.36, 0.16)], 0.14, 3), 0.045, 8)
        for y in (-0.36, 0.36):
            a.cz(st, 0.08, 0.16, 0.175, x=1.88, y=y, n=8)
            a.lathe(P(BLACK), [(0.047, 0.5), (0.047, 0.58)], 8, at=(1.88, y, 0), caps=False)
    for sx in (-1, 1):
        slots.append([sx * 0.85, 0, 0.19])
    # centre sign post
    a.box(st, 0.16, 0.16, 0.012, (0, 0, 0.166))
    a.box(MT('#a3aaae'), 0.06, 0.06, 2.3, (0, 0, 1.31))
    a.box(P('#ecebe4'), 0.7, 0.05, 0.42, (0, 0, 2.3), 0.012)
    a.decal('self_serve', 0.64, 0.36, (0, -0.0285, 2.3))
    a.decal('self_serve', 0.64, 0.36, (0, 0.0285, 2.3), (0, 0, 180))
    a.box(P('#c9372c'), 0.24, 0.24, 0.3, (0, 0, 0.9), 0.02)                      # fire extinguisher cabinet
    a.box(P('#ecebe4'), 0.16, 0.004, 0.2, (0, -0.122, 0.9))
    a.box(P('#c9372c'), 0.05, 0.006, 0.12, (0, -0.125, 0.9))
    a.extras['slots'] = slots
    a.extras['note'] = 'slots = pump positions on the island (stand a gas_pump_80s on each)'
    return a


def oil_can(a, at, i=0):
    x, y, z = at
    col = ('#f1efe6', '#1f4f8f', '#e3b62e')[i % 3]
    a.lathe(P(col), [(0, 0), (0.05, 0), (0.05, 0.13), (0.044, 0.136), (0, 0.136)], 8, at=(x, y, z), phase=0.5)
    a.decal('oil_a' if i % 2 == 0 else 'oil_b', 0.037, 0.0493, (x, y - 0.05 * math.cos(rad(22.5)) - 0.0035, z + 0.066))


@asset('gas')
def oil_rack():
    a = Asset('oil_rack')
    st, dk = MT('#3a3d42'), P('#2b2e33')
    W, D = 0.86, 0.34
    for s in a.mx():
        for t in a.mx(1):
            a.tube(st, [(W / 2, D / 2, 0), (W / 2, D / 2, 1.32)], 0.011, 5)
            a.cz(RB(), 0.018, 0, 0.012, x=W / 2, y=D / 2, n=6)
        a.tube(st, [(W / 2, -D / 2, 1.3), (W / 2, D / 2, 1.3)], 0.008, 4)
        a.tube(st, [(W / 2, -D / 2, 0.12), (W / 2, D / 2, 0.5)], 0.006, 4)
    k = 0
    for j, z in enumerate((0.18, 0.5, 0.8)):
        a.box(dk, W, D, 0.014, (0, 0, z), 0.004)
        wire(a, st, (-W / 2, -D / 2, z + 0.045), (W / 2, -D / 2, z + 0.045), 0.005)
        wire(a, st, (-W / 2, D / 2, z + 0.045), (W / 2, D / 2, z + 0.045), 0.005)
        a.box(P('#e3b62e'), 0.14, 0.004, 0.035, (-0.25 + 0.25 * j, -D / 2 - 0.006, z + 0.0), 0.0)        # price tag
        if j == 0:
            for i in range(4):                                                   # antifreeze / washer jugs
                x = -0.31 + i * 0.207
                c = P('#2f8fbf') if i < 2 else P('#e8742a')
                a.box(c, 0.15, 0.2, 0.2, (x, -0.02, z + 0.107), 0.025)
                a.cz(P('#f1efe6'), 0.022, z + 0.207, z + 0.235, x=x - 0.035, y=-0.02, n=8)
                a.handle(c, (x + 0.01, -0.02, z + 0.2), (x + 0.065, -0.02, z + 0.16), (0.0, 0, 0.035), 0.01)
                a.plate(P('#f1efe6'), 0.1, 0.1, (x, -0.1215, z + 0.1), t=0.003)
        else:
            for row, y in enumerate((-0.085, 0.07)):
                for i in range(7):
                    if rnd(i, j, row) < 0.12 and row == 0:
                        k += 1
                        continue
                    oil_can(a, (-0.345 + i * 0.115, y, z + 0.007), k)
                    k += 1
    a.box(P('#ecebe4'), 0.8, 0.02, 0.2, (0, 0, 1.2), 0.008, 'xz')
    a.decal('oil_head', 0.76, 0.171, (0, -0.0135, 1.2))
    a.decal('oil_head', 0.76, 0.171, (0, 0.0135, 1.2), (0, 0, 180))
    return a


@asset('gas')
def squeegee_bucket():
    a = Asset('squeegee_bucket')
    st, bl, wh, dk = MT('#a3aaae'), P('#2a559b'), P('#ecebe4'), P('#2b2e33')
    a.box(MT('#8b9296'), 0.42, 0.42, 0.02, (0, 0, 0.01), 0.008, 'z')
    a.bolts(st, [(sx * 0.16, sy * 0.16, 0.02) for sx in (-1, 1) for sy in (-1, 1)], 0.012, 0.01, (0, 0, 1))
    a.box(st, 0.05, 0.05, 1.42, (0, 0, 0.73))
    a.box(dk, 0.062, 0.062, 0.03, (0, 0, 1.455), 0.008)
    # bucket on a bracket
    a.box(st, 0.3, 0.04, 0.03, (0, -0.04, 0.5))
    a.loft(bl, [ring(rrect(0.3, 0.2, 0.03), 0.5, cy=-0.15), ring(rrect(0.36, 0.25, 0.035), 0.82, cy=-0.165)])
    a.loft(P('#1f4279'), [ring(rrect(0.38, 0.27, 0.04), 0.8, cy=-0.165), ring(rrect(0.38, 0.27, 0.04), 0.83, cy=-0.165)], caps=False)
    a.prism(P('#1b2a33'), rrect(0.335, 0.225, 0.03), 0.8205, 0.8215, 'xy', at=(0, -0.165, 0))
    a.plate(wh, 0.2, 0.09, (0, -0.2785, 0.66), (-2.7, 0, 0), t=0.004)
    # squeegee and brush standing in the bucket
    a.tube(P('#e3b62e'), [(0.09, -0.17, 0.62), (0.15, -0.21, 1.3)], 0.012, 6)
    a.box(dk, 0.03, 0.03, 0.1, (0.153, -0.212, 1.33), 0.008, rot=(4, 5, 0))
    a.tube(P('#8a6a4a'), [(-0.09, -0.16, 0.62), (-0.14, -0.14, 1.2)], 0.011, 6)
    # paper towel dispenser and a small notice plate
    a.box(wh, 0.3, 0.14, 0.34, (0, -0.095, 1.2), 0.015)
    a.box(P('#c9ccc9'), 0.305, 0.145, 0.012, (0, -0.095, 1.3))
    a.box(dk, 0.18, 0.02, 0.02, (0, -0.16, 1.05))
    a.box(P('#dfe6ea'), 0.15, 0.004, 0.09, (0, -0.165, 1.0), rot=(8, 0, 0))
    a.plate(bl, 0.2, 0.12, (0, -0.167, 1.24), t=0.004)
    a.cyl(st, 0.012, (0.04, -0.166, 1.12), (0.04, -0.174, 1.12), 6)
    # litter bin ring on the back
    a.lathe(dk, [(0, 0.3), (0.13, 0.3), (0.16, 0.72), (0.165, 0.72), (0.165, 0.74), (0.145, 0.74), (0.12, 0.32), (0, 0.32)], 10, at=(0, 0.2, 0))
    a.box(st, 0.04, 0.06, 0.03, (0, 0.04, 0.68))
    return a


@asset('gas')
def tyre_rack():
    a = Asset('tyre_rack')
    st, st2 = MT('#3a3d42'), MT('#55595c')
    X, Y = 0.6, 0.24
    for s in a.mx():
        a.tube(st, fillet([(X, -Y, 0), (X, -Y, 1.78), (X, Y, 1.78), (X, Y, 0)], 0.06, 2), 0.018, 6)
        for y in (-Y, Y):
            a.box(RB(), 0.07, 0.07, 0.016, (X, y, 0.008))
        for z in (0.1, 0.82):
            a.tube(st2, [(X, -Y, z), (X, Y, z)], 0.012, 5)
    for z in (0.12, 0.84):
        for y in (-0.17, 0.17):
            a.tube(st2, [(-X, y, z), (X, y, z)], 0.014, 6)
        wire(a, st2, (-X, Y, z + 0.42), (X, Y, z + 0.42), 0.008)
    R = 0.31
    rise = math.sqrt((R + 0.014) ** 2 - 0.17 ** 2)
    for j, z in enumerate((0.12, 0.84)):
        for i in range(4):
            x = -0.375 + i * 0.25
            tyre(a, (x, (rnd(i, j) - 0.5) * 0.02, z + rise), ((rnd(i, j, 2) - 0.5) * 6, 90, 0), R=R, w=0.2, n=12)
        a.box(P('#e3b62e'), 0.16, 0.004, 0.1, (0.375 - 0.75 * j, -R - 0.004, z + rise + 0.0), 0.0)
    a.box(P('#ecebe4'), 1.2, 0.02, 0.29, (0, 0, 1.63), 0.008, 'xz')
    a.decal('tires_head', 1.14, 0.261, (0, -0.0135, 1.63))
    a.decal('tires_head', 1.14, 0.261, (0, 0.0135, 1.63), (0, 0, 180))
    return a

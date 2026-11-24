"""Rooftop and wall gear. Roof items: origin on the roof plane. Wall items: origin on the wall plane (y = 0), the part
sticks out towards -Y; `anchor` in the manifest says whether the origin is at the item's bottom, centre or top."""
import math
from structures_kit import Kit, circle, rrect, offset_poly, corr_profile

G = 'roof'


def louvres(k, mat, x, y, z0, w, h, n, depth=0.05, tilt=-32, t=0.012):
    """Slats across an opening on a -Y face."""
    for i in range(n):
        k.cbox(mat, x, y, z0 + h * (i + 0.5) / n, w, depth, t, rx=tilt)


def fan_top(k, x, y, z, r, guard='dsteel', n=12):
    """Upward condenser fan: shroud ring, dark well, hub, blades and a wire guard."""
    k.lathe('lgrey', [(r + 0.05, z), (r + 0.05, z + 0.05), (r + 0.02, z + 0.07), (r, z + 0.07), (r, z)], n, x, y, closed=True)
    k.cyl('black', x, y, z - 0.002, r, 0.012, n)
    k.cyl('dgrey', x, y, z + 0.01, r * 0.22, 0.05, 8, 0.01)
    for i in range(4):
        k.cbox('dgrey', x + r * 0.55 * math.cos(math.radians(i * 90 + 20)), y + r * 0.55 * math.sin(math.radians(i * 90 + 20)), z + 0.035,
               r * 0.7, r * 0.3, 0.008, rz=i * 90 + 20, rx=14)
    for rr in (r * 0.5, r * 0.98):
        k.tube(guard, [(x + rr * math.cos(math.radians(a * 360 / n)), y + rr * math.sin(math.radians(a * 360 / n)), z + 0.085) for a in range(n)], 0, closed=True, sq=(0.012, 0.012))
    for i in range(4):
        k.cbox(guard, x, y, z + 0.09, 2 * r, 0.012, 0.012, rz=i * 45)


def feet(k, pts, w=0.1, d=0.1, h=0.1, mat='wood3'):
    for x, y, L, along in pts:
        k.box(mat, x, y, 0, L if along == 'X' else w, w if along == 'X' else L, h, 0.01)


def ac_unit_roof_a():
    k = Kit('ac_unit_roof_a')
    feet(k, [(0, -0.5, 2.3, 'X'), (0, 0.5, 2.3, 'X')], 0.12, h=0.12, mat='dsteel')
    k.box('lgrey', 0, 0, 0.12, 2.2, 1.3, 1.05, 0.03)
    k.box('grey', 0, 0, 0.12, 2.22, 1.32, 0.1, 0.01)
    fan_top(k, -0.5, 0, 1.17, 0.42)
    k.box('grey', 0.6, 0, 1.17, 0.85, 1.1, 0.03, 0.01)
    k.box('black', -0.5, -0.655, 0.36, 0.95, 0.02, 0.66)
    louvres(k, 'grey', -0.5, -0.665, 0.36, 0.95, 0.66, 9)
    k.frame('lgrey', -0.5, -0.66, 0.31, 1.05, 0.76, 0.05, 0.03)
    k.box('grey', 0.6, -0.655, 0.3, 0.8, 0.02, 0.78, 0.008)
    for z in (0.48, 0.9):
        k.box('dsteel', 0.92, -0.67, z, 0.03, 0.03, 0.12)
    k.box('yellow', 0.38, -0.668, 0.84, 0.16, 0.006, 0.1)
    k.box('black', 1.105, 0, 0.4, 0.02, 0.9, 0.6)
    with k.at(1.11, 0, 0, rz=90):
        louvres(k, 'grey', 0, -0.006, 0.4, 0.9, 0.6, 8)
    k.box('dgrey', -1.16, 0.3, 0.3, 0.14, 0.3, 0.4, 0.02)
    k.tube('galv', [(-1.2, 0.3, 0.3), (-1.2, 0.3, 0.06), (-1.6, 0.3, 0.06)], 0.025, 6)
    k.tube('brass', [(-1.1, -0.3, 0.5), (-1.3, -0.3, 0.5), (-1.3, -0.3, 0.02)], 0.02, 6)
    return k.done(G, 'roof')


def ac_unit_roof_b():
    k = Kit('ac_unit_roof_b')
    feet(k, [(-0.36, 0, 1.0, 'Y'), (0.36, 0, 1.0, 'Y')], 0.12, h=0.1)
    k.box('cream', 0, 0, 0.1, 0.95, 0.95, 0.12, 0.02)
    k.box('cream', 0, 0, 0.86, 0.95, 0.95, 0.1, 0.02)
    k.box('black', 0, 0, 0.2, 0.84, 0.84, 0.68)
    for rz in (0, 90, 180, 270):
        with k.at(0, 0, 0, rz=rz):
            for i in range(8):
                k.box('cream', 0, -0.44, 0.22 + i * 0.082, 0.9, 0.03, 0.045, rx=-25)
            for sx in (-1, 1):
                k.box('cream', sx * 0.44, -0.44, 0.2, 0.07, 0.07, 0.68, 0.01)
    fan_top(k, 0, 0, 0.96, 0.36)
    k.box('dgrey', 0.5, 0.2, 0.3, 0.08, 0.22, 0.3, 0.015)
    k.tube('brass', [(0.52, 0.2, 0.3), (0.52, 0.2, 0.05), (0.9, 0.2, 0.05)], 0.018, 6)
    return k.done(G, 'roof')


def ac_unit_roof_c():
    k = Kit('ac_unit_roof_c')
    feet(k, [(-1.1, 0, 1.3, 'Y'), (0, 0, 1.3, 'Y'), (1.1, 0, 1.3, 'Y')], 0.12, h=0.14, mat='dsteel')
    k.box('lgrey', 0, 0, 0.14, 3.0, 1.2, 0.85, 0.03)
    k.box('dgrey', 0, 0, 0.14, 3.02, 1.22, 0.08, 0.01)
    for x in (-0.95, 0.0):
        fan_top(k, x, 0, 0.99, 0.4)
    k.box('grey', 1.05, 0, 0.99, 0.8, 1.05, 0.04, 0.01)
    for x in (-0.95, 0.0):
        k.box('black', x, -0.605, 0.32, 0.8, 0.02, 0.55)
        louvres(k, 'grey', x, -0.615, 0.32, 0.8, 0.55, 7)
        k.frame('lgrey', x, -0.61, 0.28, 0.88, 0.63, 0.04, 0.03)
    k.box('grey', 1.05, -0.605, 0.3, 0.7, 0.02, 0.6, 0.008)
    k.box('dsteel', 1.3, -0.62, 0.55, 0.03, 0.03, 0.12)
    k.box('red', 0.8, -0.618, 0.74, 0.12, 0.006, 0.08)
    # supply duct: out of the end, elbow down through a roof curb
    k.prism('galv', [(1.5, 0.3), (2.15, 0.3), (2.15, 0.9), (1.5, 0.9)], -0.35, 0.35, 'XZ', 0.0)
    k.box('galv', 2.0, 0, 0.0, 0.62, 0.74, 0.32, 0.01)
    k.box('zinc', 2.0, 0, 0, 0.8, 0.9, 0.1, 0.02)
    for x in (1.62,):
        k.box('zinc', x, 0, 0.27, 0.04, 0.76, 0.66)
    k.box('zinc', 2.0, 0, 0.3, 0.68, 0.78, 0.04)
    return k.done(G, 'roof')


def ac_unit_window():
    k = Kit('ac_unit_window')
    k.box('white', 0, -0.3, 0, 0.72, 0.6, 0.46, 0.025)
    k.box('black', 0, -0.602, 0.07, 0.58, 0.012, 0.32)
    louvres(k, 'lgrey', 0, -0.61, 0.07, 0.58, 0.32, 7, 0.035)
    k.frame('white', 0, -0.605, 0.04, 0.66, 0.38, 0.04, 0.03)
    for sx in (-1, 1):
        k.box('black', sx * 0.361, -0.3, 0.1, 0.006, 0.36, 0.26)
        with k.at(sx * 0.366, -0.3, 0, rz=90 * sx):
            louvres(k, 'lgrey', 0, 0, 0.1, 0.36, 0.26, 5, 0.03)
        k.box('dsteel', sx * 0.3, -0.3, -0.03, 0.035, 0.6, 0.03)
        k.beam('dsteel', (sx * 0.3, -0.55, -0.03), (sx * 0.3, -0.02, -0.42), 0.03, 0.03)
        k.box('dsteel', sx * 0.3, -0.015, -0.45, 0.035, 0.03, 0.45)
    k.tube('lgrey', [(0.2, -0.45, 0.0), (0.2, -0.45, -0.2)], 0.012, 5)
    return k.done(G, 'wall', anchor='bottom')


def roof_vent_turbine():
    k = Kit('roof_vent_turbine')
    k.box('zinc', 0, 0, 0, 0.6, 0.6, 0.02, 0.0)
    k.lathe('zinc', [(0.24, 0.02), (0.15, 0.2), (0.15, 0.42)], 12)
    k.lathe('dsteel', [(0.16, 0.4), (0.16, 0.45)], 12)
    globe = [(0.15, 0.45), (0.25, 0.52), (0.31, 0.64), (0.29, 0.77), (0.19, 0.86), (0.0, 0.88)]
    k.lathe('galv', globe, 12)
    for i in range(12):
        a = math.radians(i * 30 + 15)
        k.tube('alu', [((r + 0.012) * math.cos(a + j * 0.1), (r + 0.012) * math.sin(a + j * 0.1), z) for j, (r, z) in enumerate(globe[:-1])], 0, sq=(0.05, 0.012))
    k.cyl('zinc', 0, 0, 0.87, 0.07, 0.04, 8, 0.01)
    return k.done(G, 'roof')


def roof_vent_box():
    k = Kit('roof_vent_box')
    k.box('zinc', 0, 0, 0, 0.9, 0.9, 0.04, 0.01)
    k.box('galv', 0, 0, 0.04, 0.66, 0.66, 0.16, 0.01)
    k.box('black', 0, 0, 0.2, 0.6, 0.6, 0.34)
    for rz in (0, 90, 180, 270):
        with k.at(0, 0, 0, rz=rz):
            for i in range(5):
                k.box('galv', 0, -0.31, 0.21 + i * 0.066, 0.66, 0.035, 0.04, rx=-30)
            k.box('galv', -0.31, -0.31, 0.2, 0.06, 0.06, 0.34)
    k.lathe('zinc', [(0.56, 0.54), (0.56, 0.58), (0.0, 0.78)], 4, a0=45)
    k.lathe('galv', [(0.47, 0.5), (0.47, 0.54)], 4, a0=45)
    return k.done(G, 'roof')


def exhaust_stack():
    k = Kit('exhaust_stack')
    k.box('zinc', 0, 0, 0, 0.8, 0.8, 0.03, 0.0)
    k.lathe('zinc', [(0.36, 0.03), (0.22, 0.3), (0.22, 0.34)], 12)
    k.cyl('galv', 0, 0, 0.3, 0.19, 2.2, 12)
    for z in (0.95, 1.7):
        k.lathe('zinc', [(0.2, z), (0.215, z), (0.215, z + 0.06), (0.2, z + 0.06)], 12, closed=True)
    k.lathe('dsteel', [(0.2, 2.42), (0.23, 2.42), (0.23, 2.5), (0.2, 2.5)], 12, closed=True)
    for i in range(3):
        a = math.radians(i * 120 + 30)
        k.box('dsteel', 0.19 * math.cos(a), 0.19 * math.sin(a), 2.48, 0.03, 0.03, 0.2)
        k.rod('dsteel', (0.22 * math.cos(a), 0.22 * math.sin(a), 1.74), (0.85 * math.cos(a), 0.85 * math.sin(a), 0.02), 0.008, 4)
    k.lathe('galv', [(0.34, 2.66), (0.34, 2.69), (0.0, 2.84)], 12)
    k.lathe('black', [(0.185, 2.495), (0.0, 2.495)], 12)
    return k.done(G, 'roof')


def roof_hatch():
    k = Kit('roof_hatch')
    k.box('zinc', 0, 0, 0, 1.2, 1.05, 0.03, 0.0)
    k.box('galv', 0, 0, 0.03, 0.92, 0.78, 0.3, 0.01)
    lid = k.part('lid', 0, 0.42, 0.34)
    lid.box('galv', 0, -0.42, -0.01, 1.0, 0.86, 0.07, 0.015)
    lid.box('zinc', 0, -0.42, 0.06, 0.8, 0.66, 0.012, 0.004)
    lid.box('dsteel', 0, -0.87, 0.0, 0.2, 0.03, 0.035, 0.005)
    lid.tube('dsteel', [(-0.12, -0.72, 0.07), (-0.12, -0.72, 0.11), (0.12, -0.72, 0.11), (0.12, -0.72, 0.07)], 0.012, 5)
    for sx in (-1, 1):
        k.cyl('dsteel', sx * 0.3 - 0.06, 0.43, 0.34, 0.022, 0.12, 6, axis='X')
        k.box('dsteel', sx * 0.3, 0.4, 0.24, 0.1, 0.012, 0.1)
    k.box('yellow', 0, -0.396, 0.12, 0.3, 0.006, 0.1)
    return k.done(G, 'roof')


def skylight():
    k = Kit('skylight')
    W, D, hc, rise = 1.8, 1.2, 0.22, 0.34
    k.box('zinc', 0, 0, 0, W + 0.24, D + 0.24, 0.03, 0.0)
    k.box('lgrey', 0, 0, 0.03, W, D, hc, 0.012)
    k.box('dgrey', 0, 0, 0.1, W - 0.12, D - 0.12, hc - 0.05)
    z = hc + 0.03
    k.prism('glass', [(-D / 2 + 0.03, z), (0, z + rise), (D / 2 - 0.03, z), (D / 2 - 0.03, z + 0.02), (0, z + rise + 0.02), (-D / 2 + 0.03, z + 0.02)], -W / 2 + 0.03, W / 2 - 0.03, 'YZ')
    for sx in (-1, 1):
        k.prism('glass', [(-D / 2 + 0.05, z), (D / 2 - 0.05, z), (0, z + rise - 0.03)], sx * (W / 2 - 0.035) - 0.008, sx * (W / 2 - 0.035) + 0.008, 'YZ')
    k.box('alu', 0, 0, z + rise + 0.0, W + 0.02, 0.07, 0.05, 0.01)
    for sy in (-1, 1):
        k.box('alu', 0, sy * (D / 2 - 0.02), z - 0.01, W + 0.02, 0.05, 0.05, 0.008)
        for i in range(5):
            x = -W / 2 + 0.02 + i * (W - 0.04) / 4
            k.beam('alu', (x, sy * (D / 2 - 0.02), z + 0.035), (x, 0, z + rise + 0.035), 0.045, 0.035)
    return k.done(G, 'roof')


def duct_run():
    k = Kit('duct_run')
    z0, w, h = 0.38, 0.55, 0.42
    k.box('galv', -0.2, 0, z0, 2.6, w, h, 0.012)
    for x in (-1.5, -0.65, 0.2, 1.1):
        k.box('zinc', x, 0, z0 - 0.02, 0.035, w + 0.05, h + 0.04)
    k.box('zinc', -1.52, 0, z0 + 0.04, 0.02, w - 0.08, h - 0.08)
    for i in range(4):
        k.box('dsteel', -1.535, 0, z0 + 0.08 + i * 0.07, 0.012, w - 0.12, 0.03, ry=25)
    k.prism('galv', [(1.08, z0), (1.5, z0), (1.5, 0.12), (0.95, 0.12), (0.95, 0.25), (1.08, z0 - 0.0)], -w / 2, w / 2, 'XZ', 0.0)
    k.prism('galv', [(1.08, z0), (1.08, z0 + h), (1.3, z0 + h), (1.5, z0 + h - 0.2), (1.5, z0)], -w / 2, w / 2, 'XZ', 0.0)
    k.box('zinc', 1.22, 0, 0, 0.75, w + 0.22, 0.12, 0.02)
    for x in (-1.1, 0.5):
        for sy in (-1, 1):
            k.box('dsteel', x, sy * (w / 2 + 0.05), 0.04, 0.04, 0.04, z0 - 0.04)
            k.box('wood3', x, sy * (w / 2 + 0.05), 0, 0.3, 0.14, 0.05, 0.008)
        k.box('dsteel', x, 0, z0 - 0.05, 0.05, w + 0.16, 0.04)
    for x in (-1.07, -0.22, 0.65):
        k.beam('zinc', (x - 0.38, -w / 2 - 0.004, z0 + 0.03), (x + 0.38, -w / 2 - 0.004, z0 + h - 0.03), 0.02, 0.006)
        k.beam('zinc', (x - 0.38, -w / 2 - 0.004, z0 + h - 0.03), (x + 0.38, -w / 2 - 0.004, z0 + 0.03), 0.02, 0.006)
    return k.done(G, 'roof')


def brick_courses(k, x, y, z0, w, d, h, course=0.24, mats=('brick', 'brick2'), mortar='mortar'):
    n = max(1, round(h / course))
    c = h / n
    k.box(mortar, x, y, z0, w - 0.02, d - 0.02, h)
    for i in range(n):
        k.box(mats[0] if (i * 5) % 3 else mats[1], x, y, z0 + i * c + 0.012, w, d, c - 0.024, 0.008)


def chimney_brick_a():
    k = Kit('chimney_brick_a')
    k.box('zinc', 0, 0, 0, 0.9, 0.9, 0.025, 0.0)
    k.box('zinc', 0, 0, 0.02, 0.7, 0.7, 0.14, 0.01)
    brick_courses(k, 0, 0, 0.1, 0.62, 0.62, 1.2)
    k.box('brick2', 0, 0, 1.3, 0.7, 0.7, 0.1, 0.008)
    k.box('brick', 0, 0, 1.4, 0.78, 0.78, 0.1, 0.008)
    k.box('conc', 0, 0, 1.5, 0.86, 0.86, 0.09, 0.03)
    k.lathe('orange', [(0.17, 1.59), (0.14, 1.66), (0.14, 1.95), (0.17, 1.98), (0.17, 2.02), (0.12, 2.02), (0.12, 1.75)], 10)
    k.lathe('black', [(0.12, 1.8), (0.0, 1.8)], 10)
    return k.done(G, 'roof')


def chimney_brick_b():
    k = Kit('chimney_brick_b')
    k.box('zinc', 0, 0, 0, 1.5, 0.85, 0.025, 0.0)
    k.box('zinc', 0, 0, 0.02, 1.3, 0.66, 0.14, 0.01)
    brick_courses(k, 0, 0, 0.1, 1.22, 0.58, 0.72, mats=('brick2', 'brick'))
    k.loft('brick', [[(-0.61, -0.29, 0.82), (0.61, -0.29, 0.82), (0.61, 0.29, 0.82), (-0.61, 0.29, 0.82)],
                     [(-0.45, -0.29, 1.12), (0.45, -0.29, 1.12), (0.45, 0.29, 1.12), (-0.45, 0.29, 1.12)]])
    brick_courses(k, 0, 0, 1.12, 0.9, 0.58, 0.96, mats=('brick2', 'brick'))
    k.box('brick', 0, 0, 2.08, 0.98, 0.66, 0.1, 0.008)
    k.box('brick2', 0, 0, 2.18, 1.06, 0.74, 0.1, 0.008)
    k.box('stone', 0, 0, 2.28, 1.14, 0.82, 0.08, 0.025)
    for sx in (-1, 1):
        k.box('orange', sx * 0.24, 0, 2.36, 0.3, 0.3, 0.2, 0.02)
        k.box('black', sx * 0.24, 0, 2.5, 0.22, 0.22, 0.065)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('dsteel', sx * 0.45, sy * 0.22, 2.36, 0.03, 0.03, 0.32)
    k.box('dsteel', 0, 0, 2.68, 1.04, 0.56, 0.03, 0.008)
    return k.done(G, 'roof')


def chimney_metal():
    k = Kit('chimney_metal')
    k.box('zinc', 0, 0, 0, 0.6, 0.6, 0.02, 0.0)
    k.lathe('zinc', [(0.25, 0.02), (0.14, 0.24), (0.14, 0.28)], 12)
    k.cyl('galv', 0, 0, 0.24, 0.115, 1.2, 12)
    k.lathe('zinc', [(0.115, 0.3), (0.19, 0.27), (0.19, 0.3), (0.12, 0.34)], 12)
    k.lathe('zinc', [(0.12, 0.9), (0.13, 0.9), (0.13, 0.94), (0.12, 0.94)], 12, closed=True)
    k.cyl('black', 0, 0, 1.44, 0.1, 0.14, 12)
    for i in range(6):
        a = math.radians(i * 60)
        k.box('dsteel', 0.115 * math.cos(a), 0.115 * math.sin(a), 1.42, 0.02, 0.03, 0.18, rz=i * 60)
    k.lathe('galv', [(0.2, 1.58), (0.2, 1.61), (0.06, 1.68), (0.0, 1.68)], 12)
    k.lathe('galv', [(0.16, 1.4), (0.16, 1.44), (0.115, 1.46)], 12)
    return k.done(G, 'roof')


def antenna_tv():
    k = Kit('antenna_tv')
    k.box('zinc', 0, 0, 0, 0.3, 0.3, 0.02, 0.0)
    for i in range(3):
        a = math.radians(i * 120 + 90)
        k.rod('dsteel', (0.45 * math.cos(a), 0.45 * math.sin(a), 0.01), (0, 0, 0.8), 0.014, 5)
        k.box('zinc', 0.45 * math.cos(a), 0.45 * math.sin(a), 0, 0.12, 0.12, 0.015)
    k.cyl('galv', 0, 0, 0.02, 0.022, 3.2, 6)
    k.box('dsteel', 0, 0, 2.86, 0.07, 0.09, 0.07, 0.005)
    k.box('alu', 0, -0.1, 2.88, 0.028, 1.9, 0.028)
    ys = [0.75, 0.55, 0.3, 0.05, -0.2, -0.42, -0.62, -0.8, -0.96]
    for i, y in enumerate(ys):
        L = 1.5 - i * 0.13 if i > 1 else (1.7, 1.6)[i]
        k.cbox('alu', 0, y, 2.92, L, 0.012, 0.012)
    for sx in (-1, 1):   # folded dipole and rear reflector vee
        k.rod('alu', (0, 0.42, 2.93), (sx * 0.62, 0.52, 3.06), 0.007, 4)
        k.rod('alu', (0, 0.42, 2.87), (sx * 0.62, 0.52, 2.76), 0.007, 4)
    k.box('black', 0, 0.42, 2.83, 0.06, 0.08, 0.05, 0.005)
    k.tube('black', [(0, 0.42, 2.84), (0.03, 0.2, 2.7), (0.03, 0.03, 2.5), (0.03, 0.03, 0.05)], 0.006, 4)
    k.cyl('galv', 0, 0, 2.2, 0.03, 0.06, 6)
    return k.done(G, 'roof')


def satellite_dish():
    k = Kit('satellite_dish')
    k.box('zinc', 0, 0, 0, 0.7, 0.7, 0.03, 0.01)
    k.cyl('dsteel', 0, 0, 0.03, 0.05, 1.05, 8)
    for i in range(3):
        a = math.radians(i * 120 + 90)
        k.rod('dsteel', (0.3 * math.cos(a), 0.3 * math.sin(a), 0.03), (0, 0, 0.6), 0.015, 5)
    k.box('dsteel', 0, 0.02, 1.0, 0.16, 0.2, 0.2, 0.02)
    with k.at(0, -0.06, 1.15, rx=52):
        R = 0.9
        prof = [(0.0, 0.03)] + [(R * t, 0.03 + 0.26 * t * t) for t in (0.34, 0.67, 1.0)] + [(R + 0.02, 0.28), (R, 0.25)] + [(R * t, 0.26 * t * t - 0.005) for t in (0.67, 0.34)] + [(0.0, -0.01)]
        k.lathe('lgrey', prof, 16)
        k.lathe('white', [(R - 0.01, 0.262), (R + 0.025, 0.285), (R + 0.025, 0.3), (R - 0.01, 0.3)], 16, closed=True)
        for i in range(3):
            a = math.radians(i * 120 - 90)
            k.rod('dsteel', (0.8 * math.cos(a), 0.8 * math.sin(a), 0.2), (0, 0, 0.92), 0.012, 5)
        k.cyl('dgrey', 0, 0, 0.82, 0.05, 0.16, 8, 0.01)
        k.cyl('white', 0, 0, 0.76, 0.07, 0.07, 8, 0.01)
        k.box('dsteel', 0, 0, -0.14, 0.3, 0.3, 0.15, 0.02)
        for sx in (-1, 1):
            k.beam('dsteel', (sx * 0.4, 0.3, 0.06), (sx * 0.1, 0, -0.1), 0.03, 0.03)
    k.tube('black', [(0.08, 0.1, 1.0), (0.08, 0.1, 0.05), (0.4, 0.1, 0.05)], 0.008, 4)
    return k.done(G, 'roof')


def roof_ladder_cage():
    k = Kit('roof_ladder_cage')
    H = 4.2
    k.ladder('dsteel', 0, -0.2, 0.25, H + 1.05, 0.45, 0.3, cage=True, cage_from=2.3, standoff=0.2)
    for sx in (-1, 1):   # walk-through rails over the parapet
        k.tube('dsteel', [(sx * 0.225, -0.2, H + 1.05), (sx * 0.225, 0.0, H + 1.15), (sx * 0.225, 0.4, H + 1.15), (sx * 0.225, 0.5, H + 1.05), (sx * 0.225, 0.5, H + 0.05)], 0, sq=(0.045, 0.022))
        k.box('dsteel', sx * 0.225, 0.5, H + 0.0, 0.1, 0.1, 0.012)
        k.box('dsteel', sx * 0.225, -0.012, 0.6, 0.12, 0.024, 0.12)
    k.box('yellow', 0, -0.215, 0.25, 0.5, 0.012, 0.06)
    return k.done(G, 'wall', anchor='bottom', height=H)


def fire_escape():
    k = Kit('fire_escape')
    W, D, S = 3.2, 1.2, 3.6
    x0, x1 = -0.9, 1.25         # stair well in the outer lane
    yl = -0.62
    # platform frame and slatted floor (inner walkway + two end landings)
    for y in (-0.03, -D + 0.03):
        k.box('iron', 0, y, -0.08, W, 0.06, 0.08, 0.008)
    for x in (-W / 2 + 0.03, W / 2 - 0.03):
        k.box('iron', x, -D / 2, -0.08, 0.06, D, 0.08, 0.008)
    k.box('iron', (x0 + x1) / 2, yl, -0.07, x1 - x0, 0.05, 0.07)
    for x in (x0, x1):
        k.box('iron', x, (yl - D) / 2, -0.07, 0.05, D + yl, 0.07)
    n = 21
    for i in range(n):
        x = -W / 2 + 0.1 + i * (W - 0.2) / (n - 1)
        if x0 < x < x1:
            k.ext('dsteel', x - 0.045, x + 0.045, yl + 0.03, -0.06, -0.025, 0.0)
        else:
            k.ext('dsteel', x - 0.045, x + 0.045, -D + 0.06, -0.06, -0.025, 0.0)
    # wall brackets
    for x in (-1.3, 0, 1.3):
        k.beam('iron', (x, -D + 0.1, -0.08), (x, -0.03, -0.9), 0.05, 0.05)
        k.box('iron', x, -0.02, -0.95, 0.1, 0.04, 0.95, 0.005)
    # railing: outer side and both ends
    def rail(p0, p1, posts):
        for zz in (1.0, 0.55):
            k.beam('iron', (p0[0], p0[1], zz), (p1[0], p1[1], zz), 0.05 if zz > 0.9 else 0.03, 0.04 if zz > 0.9 else 0.03)
        for i in range(posts + 1):
            t = i / posts
            k.box('iron', p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, 0, 0.028, 0.028, 1.0)
    rail((-W / 2 + 0.03, -D + 0.03), (W / 2 - 0.03, -D + 0.03), 12)
    rail((-W / 2 + 0.03, -D + 0.03), (-W / 2 + 0.03, -0.03), 4)
    rail((W / 2 - 0.03, -D + 0.03), (W / 2 - 0.03, -0.03), 4)
    rail((x0, yl), (x1 - 0.5, yl), 5)
    # stair down to the next platform: top at x1, bottom at x0
    ns = 14
    for sy in (yl - 0.04, -D + 0.1):
        k.beam('iron', (x1, sy, -0.04), (x0 + 0.1, sy, -S - 0.0), 0.16, 0.03)
        k.beam('iron', (x1, sy, 0.95), (x0 + 0.1, sy, -S + 0.95), 0.04, 0.04)
        for t in (0.0, 0.33, 0.66, 1.0):
            xx, zz = x1 + (x0 + 0.1 - x1) * t, -S * t
            k.box('iron', xx, sy, zz, 0.028, 0.028, 0.95)
    for i in range(1, ns):
        t = i / ns
        k.box('dsteel', x1 + (x0 + 0.1 - x1) * t, (yl - D + 0.06) / 2, -S * t - 0.012, 0.2, D + yl - 0.14, 0.025)
    return k.done(G, 'wall', anchor='platform', storey=S)


def fire_escape_ladder():
    k = Kit('fire_escape_ladder')
    k.ladder('iron', 0, -0.95, -2.9, 1.1, 0.45, 0.3)
    for sx in (-1, 1):
        k.tube('iron', [(sx * 0.225, -0.95, 1.1), (sx * 0.225, -0.85, 1.2), (sx * 0.225, -0.75, 1.1)], 0, sq=(0.045, 0.022))
        k.box('iron', sx * 0.3, -0.5, 0.86, 0.03, 1.0, 0.04)
        k.box('iron', sx * 0.3, -0.5, 0.2, 0.03, 1.0, 0.04)
        k.box('iron', sx * 0.3, -0.02, 0.15, 0.08, 0.04, 0.8, 0.005)
        k.box('iron', sx * 0.3, -0.93, 0.15, 0.03, 0.06, 0.8)
    k.cyl('iron', 0.42, -0.5, 0.92, 0.07, 0.04, 8, axis='X')
    k.box('iron', 0.44, -0.5, 0.3, 0.08, 0.1, 0.22, 0.02)
    k.tube('dsteel', [(0.44, -0.9, 0.9), (0.44, -0.5, 1.0), (0.44, -0.5, 0.5)], 0.008, 4)
    return k.done(G, 'wall', anchor='platform')


def downpipe():
    k = Kit('downpipe')
    H = 3.5
    k.tube('galv', [(0, -0.26, H), (0, -0.26, H - 0.12), (0, -0.075, H - 0.42), (0, -0.075, 0.26), (0, -0.2, 0.1), (0, -0.3, 0.07)], 0.045, 8)
    k.lathe('zinc', [(0.05, H - 0.05), (0.075, H - 0.02), (0.075, H + 0.02), (0.05, H + 0.02)], 8, 0, -0.26, closed=True)
    for z in (0.5, 1.75, 2.9):
        k.box('zinc', 0, -0.075, z, 0.13, 0.11, 0.035, 0.004)
        k.box('zinc', 0, -0.012, z - 0.02, 0.2, 0.024, 0.075, 0.004)
    for z in (1.1, 2.3):
        k.lathe('zinc', [(0.046, z), (0.052, z), (0.052, z + 0.05), (0.046, z + 0.05)], 8, 0, -0.075, closed=True)
    k.box('conc', 0, -0.36, 0, 0.3, 0.5, 0.05, 0.01)
    return k.done(G, 'wall', anchor='bottom', height=H)


def gutter():
    k = Kit('gutter')
    L = 3.0
    prof = [(0.0, 0.0), (0.0, -0.09), (-0.02, -0.11), (-0.1, -0.11), (-0.13, -0.08), (-0.14, 0.0), (-0.155, 0.0), (-0.155, 0.012),
            (-0.126, 0.012), (-0.118, -0.075), (-0.095, -0.097), (-0.025, -0.097), (-0.012, -0.085), (-0.012, 0.0)]
    k.prism('white', prof, -L / 2, L / 2, 'YZ')
    for sx in (-1, 1):
        k.prism('white', [(0.0, 0.0), (0.0, -0.09), (-0.02, -0.11), (-0.1, -0.11), (-0.13, -0.08), (-0.14, 0.0)], sx * L / 2 - 0.006 * (1 + sx), sx * L / 2 + 0.006 * (1 - sx), 'YZ')
    for i in range(5):
        x = -L / 2 + 0.2 + i * (L - 0.4) / 4
        k.box('lgrey', x, -0.07, 0.008, 0.03, 0.15, 0.012)
        k.box('lgrey', x, -0.004, -0.14, 0.03, 0.008, 0.15)
    k.cyl('white', L / 2 - 0.3, -0.07, -0.19, 0.045, 0.085, 8)
    return k.done(G, 'wall', anchor='top', length=L)


def electric_meter_mast():
    k = Kit('electric_meter_mast')
    k.tube('galv', [(0, -0.06, 1.75), (0, -0.06, 4.4), (0, -0.12, 4.55), (0, -0.2, 4.5)], 0.03, 8)
    k.lathe('dgrey', [(0.0, 0.0), (0.06, 0.02), (0.075, 0.1), (0.05, 0.2), (0.0, 0.22)], 8, 0, -0.14, 4.5, axis=(0, -1, -0.5))
    for z in (2.3, 3.2, 4.0):
        k.box('zinc', 0, -0.03, z, 0.14, 0.06, 0.03, 0.004)
    k.box('dsteel', 0, -0.1, 4.05, 0.04, 0.04, 0.3)
    for z in (4.1, 4.2, 4.3):
        k.cyl('white', 0, -0.17, z, 0.03, 0.05, 8, 0.008)
        k.box('dsteel', 0, -0.13, z + 0.015, 0.02, 0.08, 0.02)
    k.box('grey', 0, -0.07, 1.3, 0.3, 0.14, 0.46, 0.015)
    k.cyl('dsteel', 0, -0.14, 1.56, 0.11, 0.03, 12, axis='-Y')
    k.lathe('glass', [(0.095, 0.0), (0.095, 0.07), (0.07, 0.1), (0.0, 0.1)], 12, 0, -0.17, 1.56, axis='-Y')
    k.cyl('white', 0, -0.171, 1.56, 0.07, 0.03, 10, axis='-Y')
    k.box('grey', 0.42, -0.06, 1.1, 0.34, 0.12, 0.6, 0.015)
    k.box('lgrey', 0.42, -0.125, 1.14, 0.28, 0.012, 0.52, 0.004)
    k.box('dsteel', 0.52, -0.135, 1.36, 0.02, 0.02, 0.1)
    k.tube('galv', [(0.15, -0.05, 1.42), (0.25, -0.05, 1.42)], 0.02, 6)
    k.tube('galv', [(0, -0.05, 1.3), (0, -0.05, 0.02)], 0.022, 6)
    k.tube('galv', [(0.42, -0.05, 1.1), (0.42, -0.05, 0.02)], 0.018, 6)
    for z in (0.5,):
        k.box('zinc', 0, -0.03, z, 0.1, 0.06, 0.025)
        k.box('zinc', 0.42, -0.03, z, 0.1, 0.06, 0.025)
    return k.done(G, 'wall', anchor='bottom')


def wall_vent():
    k = Kit('wall_vent')
    k.frame('white', 0, -0.02, -0.3, 0.6, 0.6, 0.06, 0.05, 0.008)
    k.box('black', 0, -0.006, -0.25, 0.5, 0.012, 0.5)
    for i in range(7):
        k.box('lgrey', 0, -0.025, -0.24 + i * 0.07, 0.5, 0.05, 0.012, rx=-35)
    k.box('white', 0, -0.03, -0.24, 0.025, 0.03, 0.48)
    return k.done(G, 'wall', anchor='center')


def awning_striped():
    k = Kit('awning_striped')
    W, P, Dp, n = 2.0, 1.25, 0.62, 8
    sw = W / n
    for i in range(n):
        m = 'fabric' if i % 2 == 0 else 'fabric2'
        xa, xb = -W / 2 + i * sw, -W / 2 + (i + 1) * sw
        k.prism(m, [(0.0, 0.0), (-P, -Dp), (-P, -Dp - 0.03), (0.0, -0.035)], xa, xb, 'YZ')
        xc = (xa + xb) / 2
        sc = [(xa, -Dp + 0.0), (xa, -Dp - 0.2)] + [(xc - sw / 2 * math.cos(math.radians(a)), -Dp - 0.2 - 0.08 * math.sin(math.radians(a))) for a in (36, 72, 108, 144)] + [(xb, -Dp - 0.2), (xb, -Dp)]
        k.prism(m, sc, -P - 0.025, -P - 0.0, 'XZ')
    for sx in (-1, 1):
        x = sx * (W / 2 - 0.02)
        k.beam('dsteel', (x, -0.01, -Dp - 0.02), (x, -P + 0.02, -Dp - 0.02), 0.025, 0.025)
        k.beam('dsteel', (x, -0.01, -0.05), (x, -P + 0.02, -Dp - 0.03), 0.025, 0.025)
        k.box('dsteel', x, -0.008, -Dp - 0.08, 0.06, 0.016, 0.12)
    k.box('dsteel', 0, -P + 0.03, -Dp - 0.045, W - 0.02, 0.025, 0.025)
    k.box('dsteel', 0, -0.02, -0.035, W, 0.04, 0.04, 0.005)
    return k.done(G, 'wall', anchor='top', length=W)


def awning_flat_metal():
    k = Kit('awning_flat_metal')
    W, P = 3.0, 1.5
    k.box('lgrey', 0, -P / 2, 0.0, W, P, 0.05, 0.0)
    k.box('white', 0, -P - 0.0 + 0.02, -0.02, W + 0.04, 0.06, 0.26, 0.012)
    k.box('stripe', 0, -P - 0.012, 0.04, W, 0.008, 0.07)
    for sx in (-1, 1):
        k.box('white', sx * (W / 2), -P / 2, -0.02, 0.06, P, 0.26, 0.012)
    for i in range(13):
        k.box('zinc', -W / 2 + 0.12 + i * (W - 0.24) / 12, -P / 2, 0.05, 0.04, P - 0.08, 0.035)
    k.box('zinc', 0, -P / 2, 0.05, W - 0.08, P - 0.08, 0.012)
    for sx in (-1, 1):
        k.rod('dsteel', (sx * 1.2, -P + 0.12, 0.1), (sx * 1.2, -0.02, 1.0), 0.014, 6)
        k.box('dsteel', sx * 1.2, -0.012, 0.94, 0.1, 0.024, 0.14, 0.004)
        k.box('dsteel', sx * 1.2, -P + 0.12, 0.06, 0.08, 0.08, 0.04)
    for x in (-0.9, 0.9):
        k.box('white', x, -P / 2, -0.035, 0.9, 0.22, 0.035, 0.008)
        k.box('lamp', x, -P / 2, -0.042, 0.8, 0.14, 0.01)
    return k.done(G, 'wall', anchor='bottom', length=W)


def cupola_barn():
    k = Kit('cupola_barn')
    B = 1.3
    k.box('white', 0, 0, -0.55, B, B, 1.85, 0.015)
    k.box('white', 0, 0, 0.2, B + 0.1, B + 0.1, 0.1, 0.015)
    for rz in (0, 90, 180, 270):
        with k.at(0, 0, 0, rz=rz):
            k.box('black', 0, -B / 2 - 0.004, 0.45, 0.8, 0.01, 0.7)
            louvres(k, 'white', 0, -B / 2 - 0.02, 0.45, 0.8, 0.7, 7, 0.06, -30)
            k.frame('white', 0, -B / 2 - 0.02, 0.39, 0.94, 0.82, 0.07, 0.05, 0.008)
    k.box('white', 0, 0, 1.3, B + 0.16, B + 0.16, 0.1, 0.02)
    e = (B + 0.5) / 2 * math.sqrt(2)
    k.lathe('roof', [(e, 1.4), (e, 1.46), (e * 0.5, 1.75), (0.06, 2.55), (0.0, 2.55)], 4, a0=45)
    k.sphere('brass', 0, 0, 2.6, 0.08, 8, 4)
    k.cyl('brass', 0, 0, 2.62, 0.015, 0.3, 5)
    return k.done(G, 'roof', sink=0.55)


def weather_vane():
    k = Kit('weather_vane')
    k.lathe('dsteel', [(0.1, 0), (0.1, 0.03), (0.04, 0.08), (0.018, 0.12), (0.018, 0.5)], 8)
    k.sphere('brass', 0, 0, 0.42, 0.06, 8, 4)
    for i in range(4):
        with k.at(0, 0, 0.62, rz=i * 90):
            k.cbox('dsteel', 0.17, 0, 0, 0.34, 0.012, 0.012)
            k.cbox('brass', 0.37, 0, 0, 0.07, 0.012, 0.07, ry=45 if i % 2 else 0)
    k.cyl('dsteel', 0, 0, 0.5, 0.012, 0.42, 6)
    k.sphere('brass', 0, 0, 0.74, 0.04, 6, 4)
    v = k.part('vane', 0, 0, 0.92)
    v.cbox('dsteel', 0, 0, 0, 0.9, 0.014, 0.014)
    v.prism('brass', [(-0.45, 0), (-0.3, 0.07), (-0.3, -0.07)], -0.006, 0.006, 'XZ')
    v.prism('brass', [(0.28, 0), (0.48, 0.1), (0.42, 0), (0.48, -0.1)], -0.006, 0.006, 'XZ')
    rooster = [(-0.16, 0.01), (0.12, 0.01), (0.2, 0.12), (0.3, 0.22), (0.24, 0.3), (0.14, 0.26), (0.1, 0.16), (0.02, 0.12), (-0.02, 0.2), (-0.03, 0.34), (-0.08, 0.4),
               (-0.13, 0.36), (-0.2, 0.33), (-0.14, 0.3), (-0.15, 0.2), (-0.2, 0.1)]
    v.prism('brass', rooster, -0.008, 0.008, 'XZ')
    v.cyl('dsteel', 0, 0, -0.06, 0.02, 0.08, 6)
    return k.done(G, 'roof')


ALL = (ac_unit_roof_a, ac_unit_roof_b, ac_unit_roof_c, ac_unit_window, roof_vent_turbine, roof_vent_box, exhaust_stack, roof_hatch, skylight, duct_run,
       chimney_brick_a, chimney_brick_b, chimney_metal, antenna_tv, satellite_dish, roof_ladder_cage, fire_escape, fire_escape_ladder, downpipe, gutter,
       electric_meter_mast, wall_vent, awning_striped, awning_flat_metal, cupola_barn, weather_vane)

SHEETS = [
    ('roof_a', ['ac_unit_roof_a', 'ac_unit_roof_b', 'ac_unit_roof_c', 'roof_hatch', 'skylight', 'duct_run'], 'shot', dict(gap=0.5, elev=24, cols=3)),
    ('roof_b', ['roof_vent_turbine', 'roof_vent_box', 'exhaust_stack', 'chimney_brick_a', 'chimney_brick_b', 'chimney_metal', 'cupola_barn', 'weather_vane', 'satellite_dish', 'antenna_tv'], 'shot', dict(gap=0.4, elev=14)),
    ('wall_a', ['fire_escape', 'fire_escape_ladder', 'roof_ladder_cage', 'downpipe', 'electric_meter_mast'], 'shot', dict(gap=0.6, elev=10, azim=-38)),
    ('wall_b', ['awning_striped', 'awning_flat_metal', 'gutter'], 'shot', dict(gap=0.4, elev=22, azim=-32)),
    ('wall_c', ['ac_unit_window', 'wall_vent', 'clock_face'], 'shot', dict(gap=0.3, elev=8, azim=-28)),
]


def build():
    for f in ALL:
        f()

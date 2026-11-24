"""Pool, playground, pier and boats, market and party strings.
Pool: origin at coping level, the shell hangs below z = 0. Pier pieces: z = 0 is the water level, deck top at 0.9.
Boats: origin under the keel amidships, bow towards -Y."""
import math
from structures_kit import Kit, circle, rrect

G = 'lake'


def pool_inground():
    k = Kit('pool_inground')
    L, W, c = 8.0, 4.0, 0.4
    k.prism('pool', [(-4, -1.0), (-1.2, -1.1), (1.2, -2.2), (4, -2.2), (4, -2.32), (-4, -2.32)], -W / 2, W / 2, 'XZ')
    for sy in (-1, 1):
        k.ext('pool', -L / 2 - 0.12, L / 2 + 0.12, sy * W / 2, sy * (W / 2 + 0.12), -2.32, -0.02)
        k.ext('blue', -L / 2, L / 2, sy * (W / 2 - 0.012), sy * W / 2, -0.32, -0.02)
        k.ext('dconc', -L / 2 - c, L / 2 + c, sy * (W / 2 - 0.02), sy * (W / 2 + c), -0.02, 0.03)
        for i in range(16):
            x0 = -L / 2 - c + i * (L + 2 * c) / 16
            k.ext('tile' if i % 2 else 'tile2', x0 + 0.008, x0 + (L + 2 * c) / 16 - 0.008, sy * (W / 2 - 0.04), sy * (W / 2 + c), 0.0, 0.06)
    for sx in (-1, 1):
        k.ext('pool', sx * L / 2, sx * (L / 2 + 0.12), -W / 2, W / 2, -2.32, -0.02)
        k.ext('blue', sx * (L / 2 - 0.012), sx * L / 2, -W / 2, W / 2, -0.32, -0.02)
        k.ext('dconc', sx * (L / 2 - 0.02), sx * (L / 2 + c), -W / 2 + 0.02, W / 2 - 0.02, -0.02, 0.03)
        for i in range(8):
            y0 = -W / 2 + 0.04 + i * (W - 0.08) / 8
            k.ext('tile2' if i % 2 else 'tile', sx * (L / 2 - 0.04), sx * (L / 2 + c), y0 + 0.008, y0 + (W - 0.08) / 8 - 0.008, 0.0, 0.06)
    k.ext('water', -L / 2 + 0.005, L / 2 - 0.005, -W / 2 + 0.005, W / 2 - 0.005, -0.17, -0.15)
    for i in range(3):
        k.ext('white', -L / 2, -L / 2 + 0.36 * (i + 1), -W / 2, -0.7, -0.26 * (i + 2) if i < 2 else -1.04, -0.26 * (i + 1), 0.012)
    for dx in (-0.25, 0.25):
        x = 2.6 + dx
        k.tube('chrome', [(x, W / 2 + 0.3, 0.06), (x, W / 2 + 0.3, 0.78), (x, W / 2 + 0.12, 0.92), (x, W / 2 - 0.07, 0.78), (x, W / 2 - 0.07, -1.25)], 0.022, 6)
    for z in (-0.35, -0.65, -0.95):
        k.cbox('white', 2.6, W / 2 - 0.08, z, 0.5, 0.09, 0.03, 0.006)
    for i in range(11):
        y = -W / 2 + 0.2 + i * (W - 0.4) / 10
        k.sphere('red' if i % 2 else 'white', -0.8, y, -0.15, 0.07, 6, 4)
    k.ext('rope', -0.81, -0.79, -W / 2, W / 2, -0.16, -0.14)
    k.cyl('dgrey', 2.8, 0, -2.2, 0.16, 0.012, 8)
    k.cyl('lamp', L / 2 - 0.012, 0, -1.0, 0.12, 0.012, 8, axis='-X')
    for x in (-2.0, 2.0):
        k.ext('white', x - 0.14, x + 0.14, -W / 2 - 0.34, -W / 2 - 0.08, 0.06, 0.068)
    return k.done(G, basin=[L, W], water_z=-0.15, depth=[1.0, 2.2], coping=c)


def pool_diving_board():
    k = Kit('pool_diving_board')
    zb = 0.72
    k.box('white', 0, 1.0, 0, 0.56, 0.46, zb, 0.03)
    k.box('white', 0, -0.2, 0, 0.62, 0.2, zb - 0.07, 0.025)
    k.cyl('chrome', -0.3, -0.2, zb - 0.04, 0.04, 0.6, 8, axis='X')
    k.prism('lblue', [(-0.25, 1.25), (0.25, 1.25), (0.25, -2.25), (0.17, -2.42), (-0.17, -2.42), (-0.25, -2.25)], zb, zb + 0.05, 'XY', 0.012)
    for i in range(7):
        k.ext('white', -0.2, 0.2, -2.3 + i * 0.16, -2.24 + i * 0.16, zb + 0.05, zb + 0.056)
    for x in (-0.12, 0.12):
        k.cyl('chrome', x, 1.05, zb + 0.05, 0.03, 0.02, 6)
    for sx in (-1, 1):
        x = sx * 0.36
        k.tube('chrome', [(x, 1.7, 0.0), (x, 1.25, zb + 0.85), (x, 0.3, zb + 0.85), (x, 0.05, zb + 0.6), (x, 0.05, 0.0)], 0.022, 6)
        k.beam('white', (x * 0.9, 1.72, 0.0), (x * 0.9, 1.26, zb), 0.03, 0.1)
    for i in range(3):
        t = (i + 1) / 4
        k.cbox('white', 0, 1.72 - 0.46 * t, zb * t, 0.64, 0.16, 0.03, 0.008)
    return k.done(G, board_z=zb + 0.05, reach=2.42)


def playground_swing():
    k = Kit('playground_swing')
    H, hw = 2.4, 1.7
    k.cyl('blue', -hw - 0.1, 0, H, 0.04, 2 * hw + 0.2, 8, axis='X')
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.rod('blue', (sx * hw, 0, H), (sx * (hw + 0.2), sy * 1.0, 0.0), 0.035, 7)
            k.cyl('dconc', sx * (hw + 0.2), sy * 1.0, 0, 0.09, 0.03, 7)
        k.cyl('blue', sx * (hw + 0.125), -0.375, 0.9, 0.025, 0.75, 6, axis='Y')
        k.cbox('dsteel', sx * hw, 0, H, 0.1, 0.12, 0.12, 0.015)
    for name, x, col in (('seat_a', -0.75, 'yellow'), ('seat_b', 0.75, 'red')):
        s = k.part(name, x, 0, H - 0.04)
        for sx in (-1, 1):
            s.cbox('dsteel', sx * 0.22, 0, 0.0, 0.05, 0.09, 0.07, 0.008)
            s.rod('steel', (sx * 0.22, 0, -0.03), (sx * 0.22, 0, -1.83), 0.009, 4)
        s.cbox(col, 0, 0, -1.85, 0.54, 0.17, 0.035, 0.012)
    return k.done(G, parts_pivot='top bar, swing about X')


def playground_slide():
    k = Kit('playground_slide')
    hp = 1.8
    path = [(0.32, hp), (0.0, hp - 0.02), (-2.2, 0.42), (-2.7, 0.3), (-3.05, 0.3)]
    k.tube('chrome', [(0, y, z) for y, z in path], 0, sq=(0.5, 0.03))
    for sx in (-1, 1):
        k.tube('red', [(sx * 0.265, y, z + 0.055) for y, z in path], 0, sq=(0.035, 0.15))
        k.beam('blue', (sx * 0.25, 1.4, 0.0), (sx * 0.25, 0.6, hp), 0.04, 0.09)
        k.tube('blue', [(sx * 0.29, 0.62, hp - 0.1), (sx * 0.29, 0.56, hp + 0.7), (sx * 0.29, 0.3, hp + 0.82), (sx * 0.29, 0.0, hp + 0.55), (sx * 0.29, -0.15, hp + 0.1)], 0.02, 6)
        k.cyl('blue', sx * 0.27, 0.3, 0.0, 0.025, hp - 0.02, 6)
        k.rod('blue', (sx * 0.24, -1.2, 0.0), (sx * 0.24, -1.2, 1.04), 0.022, 6)
        k.cyl('dconc', sx * 0.27, 0.3, 0, 0.07, 0.02, 6)
    k.ext('steel', -0.3, 0.3, 0.3, 0.64, hp - 0.03, hp, 0.006)
    k.cyl('blue', -0.24, -1.2, 0.98, 0.018, 0.48, 5, axis='X')
    for i in range(1, 7):
        t = i / 7
        k.cbox('yellow', 0, 1.4 - 0.8 * t, hp * t, 0.48, 0.14, 0.03, 0.006)
    return k.done(G, height=hp)


def seesaw():
    k = Kit('seesaw')
    zp, tilt = 0.55, 11.0
    for sy in (-1, 1):
        k.tube('green', [(-0.3, sy * 0.2, 0.0), (-0.06, sy * 0.2, zp + 0.06), (0.06, sy * 0.2, zp + 0.06), (0.3, sy * 0.2, 0.0)], 0.028, 6)
    k.cyl('dsteel', 0, -0.25, zp, 0.022, 0.5, 6, axis='Y')
    for sx in (-1, 1):
        k.box('rubber', sx * 1.55, 0, 0, 0.3, 0.3, 0.1, 0.03)
    b = k.part('beam', 0, 0, zp)
    with b.at(ry=tilt):
        b.ext('red', -1.8, 1.8, -0.11, 0.11, 0.03, 0.08, 0.012)
        b.cbox('dsteel', 0, 0, 0.02, 0.24, 0.3, 0.06, 0.01)
        for sx in (-1, 1):
            b.ext('yellow', sx * 1.76, sx * 1.36, -0.13, 0.13, 0.08, 0.11, 0.012)
            b.tube('yellow', [(sx * 1.25, -0.11, 0.08), (sx * 1.25, -0.11, 0.32), (sx * 1.25, 0.11, 0.32), (sx * 1.25, 0.11, 0.08)], 0.016, 6)
    return k.done(G, tilt=tilt, pivot_axis='y')


def basketball_hoop():
    k = Kit('basketball_hoop')
    k.cyl('dconc', 0, 0, 0, 0.22, 0.05, 10, 0.015)
    k.tube('dsteel', [(0, 0, 0.04), (0, 0, 2.75), (0, -0.3, 3.3), (0, -0.82, 3.3)], 0.06, 8)
    k.cyl('blue', 0, 0, 0.3, 0.1, 1.5, 8, 0.03)
    yb = -0.85
    k.cbox('white', 0, yb, 3.42, 1.8, 0.045, 1.05, 0.012)
    k.cbox('dsteel', 0, yb + 0.04, 3.3, 0.5, 0.05, 0.4, 0.01)
    fr = yb - 0.026
    for z in (2.915, 3.925):
        k.cbox('red', 0, fr, z, 1.78, 0.008, 0.04)
    for sx in (-1, 1):
        k.cbox('red', sx * 0.87, fr, 3.42, 0.04, 0.008, 1.01)
        k.cbox('red', sx * 0.3, fr, 3.3, 0.04, 0.008, 0.45)
    for z in (3.095, 3.505):
        k.cbox('red', 0, fr, z, 0.64, 0.008, 0.04)
    yr, zr, R = yb - 0.15 - 0.225, 3.05, 0.225
    k.torus('orange', 0, yr, zr, R, 0.012, 12, 4)
    k.cbox('orange', 0, yb - 0.09, zr - 0.03, 0.14, 0.16, 0.07, 0.008)
    for i in range(8):
        a, a2 = math.radians(i * 45), math.radians(i * 45 + 22.5)
        k.rod('white', (R * math.cos(a), yr + R * math.sin(a), zr), (0.13 * math.cos(a2), yr + 0.13 * math.sin(a2), zr - 0.4), 0.006, 3)
    k.torus('white', 0, yr, zr - 0.4, 0.13, 0.006, 8, 3)
    return k.done(G, rim_z=zr, rim_y=round(yr, 3))


def skate_ramp_quarter():
    k = Kit('skate_ramp_quarter')
    W, H, R = 2.4, 1.2, 1.9
    am = math.acos(1 - H / R)
    y0 = -R * math.sin(am)
    arc = [(y0 + R * math.sin(am * i / 8), R - R * math.cos(am * i / 8)) for i in range(9)]
    k.prism('wood2', [(y0 - 0.02, 0.0)] + arc + [(0.7, H), (0.7, 0.0)], -W / 2, W / 2, 'YZ')
    k.prism('ply', arc + [(0.0, H + 0.02)] + [(y, z + 0.02) for y, z in reversed(arc)], -W / 2 + 0.01, W / 2 - 0.01, 'YZ')
    k.ext('ply', -W / 2 + 0.01, W / 2 - 0.01, 0.0, 0.7, H, H + 0.02)
    k.cyl('chrome', -W / 2, 0, H + 0.005, 0.03, W, 8, axis='X')
    k.beam('steel', (0, y0 - 0.16, 0.004), (0, y0 + 0.14, 0.03), W - 0.02, 0.008)
    for sx in (-1, 1):
        x = sx * (W / 2 + 0.008)
        for y in (-1.2, -0.6, 0.0, 0.66):
            h = H if y >= 0 else R - math.sqrt(R * R - (y - y0) ** 2)
            k.ext('wood3', x - 0.012, x + 0.012, y - 0.04, y + 0.04, 0.0, h)
        k.ext('wood3', x - 0.012, x + 0.012, y0 + 0.2, 0.7, 0.0, 0.08)
        k.box('dsteel', sx * (W / 2 - 0.03), 0.67, H, 0.04, 0.04, 1.0)
    k.box('dsteel', 0, 0.67, H, 0.04, 0.04, 1.0)
    for z in (H + 0.5, H + 1.0):
        k.ext('dsteel', -W / 2, W / 2, 0.65, 0.69, z - 0.02, z + 0.02)
    return k.done(G, height=H, width=W)


def pier_section():
    k = Kit('pier_section')
    L, W, zd = 4.0, 2.0, 0.9
    for y in (-1.0, 1.0):
        for sx in (-1, 1):
            k.cyl('wood4', sx * 1.08, y, -2.2, 0.13, 3.55, 8, 0.0, r2=0.115)
            k.cyl('wold', sx * 1.08, y, 1.35, 0.12, 0.05, 8, r2=0.07)
        k.ext('wood3', -1.25, 1.25, y - 0.07, y + 0.07, zd - 0.42, zd - 0.24, 0.008)
        k.beam('wood3', (-1.0, y + 0.09, -0.5), (1.0, y + 0.09, zd - 0.45), 0.05, 0.12)
        k.beam('wood3', (-1.0, y - 0.09, zd - 0.45), (1.0, y - 0.09, -0.5), 0.05, 0.12)
    for x in (-0.85, 0.0, 0.85):
        k.ext('wood3', x - 0.04, x + 0.04, -L / 2, L / 2, zd - 0.24, zd - 0.045)
    k.planks('wood2', -W / 2, W / 2, -L / 2, L / 2, zd - 0.045, 0.045, 16, 0.012, along='X', b=0.008, alt='wold')
    k.torus('rubber', -1.22, 0.3, zd - 0.45, 0.2, 0.08, 10, 5, axis='X')
    k.rod('rope', (-1.22, 0.3, zd - 0.25), (-1.1, 0.3, zd - 0.02), 0.012, 4)
    k.torus('white', 1.215, -1.0, 0.95, 0.2, 0.05, 10, 5, axis='X')
    for a in (45, 135, 225, 315):
        k.cbox('red', 1.215, -1.0 + 0.2 * math.cos(math.radians(a)), 0.95 + 0.2 * math.sin(math.radians(a)), 0.112, 0.09, 0.09, 0.02, rx=a)
    k.cbox('dsteel', 0.8, 1.5, zd + 0.03, 0.08, 0.3, 0.035, 0.01)
    for y in (1.42, 1.58):
        k.cbox('dsteel', 0.8, y, zd + 0.012, 0.05, 0.05, 0.03)
    return k.done(G, length=L, width=W, deck_z=zd, water_z=0.0)


def pier_end_ladder():
    k = Kit('pier_end_ladder')
    zd = 0.9
    for sx in (-1, 1):
        x = sx * 0.26
        k.tube('galv', [(x, 0.4, zd), (x, 0.4, zd + 0.8), (x, 0.2, zd + 0.95), (x, -0.1, zd + 0.8), (x, -0.1, -1.3)], 0.022, 6)
        k.cyl('galv', x, 0.4, zd, 0.05, 0.015, 6)
        for z in (zd - 0.2, -0.6):
            k.ext('galv', x - 0.02, x + 0.02, -0.1, 0.0, z - 0.02, z + 0.02)
    for i in range(7):
        k.cbox('wood2', 0, -0.1, zd - 0.25 - i * 0.3, 0.5, 0.09, 0.03, 0.006)
    return k.done(G, deck_z=zd, water_z=0.0)


def hull(k, mat, st, t=0.03):
    """Open boat shell lofted through stations (y, half width, sheer z, keel z); bow first."""
    rings, outer = [], []
    for y, w, gz, kz in st:
        tt = min(t, w * 0.45)
        cz = kz + (gz - kz) * 0.34
        o = [(-w, y, gz), (-w * 0.84, y, cz), (-w * 0.3, y, kz), (w * 0.3, y, kz), (w * 0.84, y, cz), (w, y, gz)]
        i = [(w - tt, y, gz), (w * 0.84 - tt, y, cz + tt), (w * 0.3 - tt * 0.5, y, kz + tt), (-(w * 0.3 - tt * 0.5), y, kz + tt), (-(w * 0.84 - tt), y, cz + tt), (-(w - tt), y, gz)]
        rings.append(o + i)
        outer.append(o)
    k.loft(mat, rings)
    y, w, gz, kz = st[-1]
    k.prism(mat, [(p[0], p[2]) for p in outer[-1]], y - 0.04, y, 'XZ')


def rowboat():
    k = Kit('rowboat')
    st = [(-1.8, 0.04, 0.62, 0.36), (-1.5, 0.3, 0.57, 0.13), (-0.9, 0.55, 0.51, 0.03), (0.0, 0.66, 0.47, 0.0), (0.9, 0.61, 0.48, 0.01), (1.55, 0.5, 0.5, 0.05), (1.8, 0.45, 0.52, 0.1)]
    hull(k, 'hull', st)
    for sx in (-1, 1):
        k.tube('wood2', [(sx * (w - 0.01), y, gz + 0.012) for y, w, gz, kz in st], 0, sq=(0.05, 0.03))
        k.tube('stripe', [(sx * (w * 0.97 + 0.004), y, gz - 0.09) for y, w, gz, kz in st], 0, sq=(0.012, 0.07))
        k.cbox('dsteel', sx * 0.66, 0.1, 0.51, 0.04, 0.06, 0.06, 0.008)
    for y, w in ((-1.0, 0.5), (0.0, 0.63), (1.15, 0.56)):
        k.ext('wood1', -w + 0.02, w - 0.02, y - 0.12, y + 0.12, 0.3, 0.335, 0.008)
    k.tube('wood2', [(0, y, kz - 0.005) for y, w, gz, kz in st], 0, sq=(0.05, 0.04))
    for sx in (-1, 1):
        k.rod('wood1', (sx * 0.2, -1.1, 0.36), (sx * 0.32, 1.25, 0.37), 0.02, 6)
        k.beam('red', (sx * 0.32, 1.2, 0.37), (sx * 0.35, 1.7, 0.4), 0.14, 0.02, 0.006)
    return k.done(G, length=3.6, waterline=0.14)


def motorboat_small():
    k = Kit('motorboat_small')
    st = [(-2.3, 0.05, 0.96, 0.62), (-1.9, 0.45, 0.91, 0.3), (-1.2, 0.75, 0.86, 0.1), (0.0, 0.88, 0.81, 0.0), (1.2, 0.86, 0.79, 0.0), (2.2, 0.8, 0.78, 0.03)]
    hull(k, 'hull', st, 0.035)
    deck = [(y, w, gz) for y, w, gz, kz in st[:3]] + [(-0.85, 0.8, 0.845)]
    k.loft('hull', [[(-w, y, gz - 0.012), (w, y, gz - 0.012), (w * 0.5, y, gz + 0.06), (-w * 0.5, y, gz + 0.06)] for y, w, gz in deck])
    for sx in (-1, 1):
        k.tube('stripe', [(sx * (w * 0.975 + 0.004), y, gz - 0.12) for y, w, gz, kz in st], 0, sq=(0.012, 0.09))
        k.tube('lgrey', [(sx * (w - 0.05), y, gz + 0.012) for y, w, gz, kz in st[2:]], 0, sq=(0.13, 0.03))
        k.box('lgrey', sx * 0.38, -0.15, 0.16, 0.14, 0.14, 0.2)
        k.box('stripe', sx * 0.38, -0.15, 0.34, 0.46, 0.46, 0.1, 0.03)
        k.box('fabric2', sx * 0.38, 0.06, 0.4, 0.46, 0.09, 0.44, 0.03, rx=-8)
        k.cbox('chrome', sx * 0.6, -1.85, 0.99, 0.04, 0.18, 0.04, 0.01)
    k.ext('lgrey', -0.42, 0.42, -0.6, 2.16, 0.17, 0.2)
    k.box('dgrey', 0, -0.82, 0.5, 1.5, 0.16, 0.36, 0.02)
    k.beam('glass', (0, -0.86, 0.9), (0, -0.62, 1.24), 1.36, 0.012)
    k.beam('chrome', (0, -0.615, 1.245), (0, -0.605, 1.265), 1.4, 0.03)
    for sx in (-1, 1):
        k.beam('chrome', (sx * 0.69, -0.87, 0.9), (sx * 0.69, -0.615, 1.255), 0.03, 0.03)
    k.torus('black', -0.38, -0.66, 0.84, 0.13, 0.014, 10, 4, axis=(0, 1, -0.45))
    k.rod('dsteel', (-0.38, -0.66, 0.84), (-0.38, -0.76, 0.8), 0.015, 5)
    k.box('stripe', 0, 1.72, 0.16, 1.44, 0.44, 0.22, 0.03)
    k.box('fabric2', 0, 1.98, 0.3, 1.44, 0.09, 0.42, 0.03)
    k.cyl('redlamp', 0, -2.12, 0.99, 0.03, 0.05, 6)
    m = k.part('motor', 0, 2.22, 0.78)
    m.box('dsteel', 0, 0.03, -0.26, 0.2, 0.1, 0.3, 0.01)
    m.box('dgrey', 0, 0.22, 0.02, 0.3, 0.46, 0.32, 0.05)
    m.cbox('stripe', 0, 0.22, 0.1, 0.305, 0.465, 0.05)
    m.box('lgrey', 0, 0.22, -0.66, 0.09, 0.16, 0.7, 0.02)
    m.box('lgrey', 0, 0.27, -0.5, 0.26, 0.36, 0.02, 0.006)
    m.cyl('lgrey', 0, 0.1, -0.62, 0.055, 0.32, 7, 0.012, axis='Y')
    m.prism('lgrey', [(0.14, -0.66), (0.3, -0.66), (0.26, -0.78), (0.2, -0.78)], -0.012, 0.012, 'YZ')
    for a in (0, 120, 240):
        m.cbox('brass', 0.09 * math.cos(math.radians(a)), 0.44, -0.62 + 0.09 * math.sin(math.radians(a)), 0.13, 0.012, 0.07, ry=-a + 25)
    m.rod('black', (0, 0.02, 0.2), (0, -0.42, 0.28), 0.018, 5)
    return k.done(G, length=4.6, waterline=0.2)


def boat_trailer():
    k = Kit('boat_trailer')
    zf = 0.42
    k.ext('galv', -0.04, 0.04, -3.3, 0.9, zf - 0.05, zf + 0.05, 0.008)
    for sx in (-1, 1):
        k.beam('galv', (sx * 0.05, -1.5, zf), (sx * 0.8, 0.2, zf), 0.07, 0.09)
        k.ext('galv', sx * 0.8 - 0.035, sx * 0.8 + 0.035, 0.2, 1.9, zf - 0.045, zf + 0.045, 0.008)
        k.cyl('rubber', sx * 1.0 - 0.09, 0.9, 0.3, 0.3, 0.18, 12, 0.035, axis='X')
        k.cyl('white', sx * 1.0 - 0.095, 0.9, 0.3, 0.16, 0.19, 8, axis='X')
        k.prism('white', [(0.9 + 0.42 * math.cos(math.radians(a)), 0.3 + 0.4 * math.sin(math.radians(a))) for a in range(0, 181, 30)] + [(0.9 + 0.38 * math.cos(math.radians(a)), 0.3 + 0.36 * math.sin(math.radians(a))) for a in range(180, -1, -30)], sx * 1.0 - 0.12, sx * 1.0 + 0.12, 'YZ')
        for y in (-0.3, 1.5):
            k.box('galv', sx * 0.5, y, zf, 0.05, 0.05, 0.2)
        k.ext('dgrey', sx * 0.5 - 0.07, sx * 0.5 + 0.07, -0.7, 1.9, zf + 0.2, zf + 0.26, 0.012)
        k.cbox('redlamp', sx * 0.8, 1.91, zf, 0.1, 0.03, 0.07, 0.008)
    for y in (0.2, 0.9, 1.86):
        k.ext('galv', -0.83, 0.83, y - 0.035, y + 0.035, zf - 0.045, zf + 0.045)
    k.cyl('dsteel', -0.95, 0.9, 0.3, 0.025, 1.9, 6, axis='X')
    for y in (-0.9, 0.2, 1.86):
        k.cyl('black', -0.1, y, zf + 0.12, 0.05, 0.2, 8, axis='X')
        k.box('galv', 0, y, zf + 0.04, 0.26, 0.04, 0.04)
    k.box('galv', 0, -2.1, zf, 0.06, 0.08, 0.75, 0.006)
    k.beam('galv', (0, -2.5, zf + 0.05), (0, -2.13, zf + 0.5), 0.05, 0.05)
    k.cbox('dsteel', 0, -2.18, zf + 0.62, 0.14, 0.16, 0.16, 0.015)
    k.cyl('yellow', -0.08, -2.02, zf + 0.76, 0.05, 0.16, 8, axis='X')
    k.rod('dsteel', (0.07, -2.18, zf + 0.62), (0.2, -2.18, zf + 0.72), 0.01, 4)
    k.cbox('dsteel', 0, -3.32, zf, 0.1, 0.16, 0.09, 0.02)
    k.cyl('galv', 0.09, -2.8, 0.14, 0.022, zf + 0.2, 6)
    k.cyl('rubber', 0.07, -2.8, 0.08, 0.08, 0.04, 8, axis='X')
    k.cbox('white', 0, 1.9, zf - 0.1, 0.3, 0.012, 0.15)
    return k.done(G, length=5.2, bunk_z=zf + 0.26, hitch=[0, -3.35, zf])


def buoy():
    k = Kit('buoy')
    k.cyl('dsteel', 0, 0, -1.0, 0.09, 0.8, 8)
    k.cyl('dsteel', 0, 0, -1.1, 0.2, 0.12, 8, 0.02)
    k.lathe('red', [(0.3, -0.3), (0.62, -0.18), (0.66, 0.0), (0.62, 0.14), (0.4, 0.22), (0.3, 0.3), (0.2, 1.25), (0.2, 1.3)], 10)
    k.cyl('white', 0, 0, 0.72, 0.262, 0.2, 10, r2=0.24)
    for a in range(0, 360, 90):
        k.rod('dsteel', (0.19 * math.cos(math.radians(a)), 0.19 * math.sin(math.radians(a)), 1.3), (0.08 * math.cos(math.radians(a)), 0.08 * math.sin(math.radians(a)), 1.62), 0.014, 4)
    k.cyl('dsteel', 0, 0, 1.6, 0.1, 0.03, 8)
    k.cyl('lamp', 0, 0, 1.63, 0.06, 0.1, 8, r2=0.045)
    k.cyl('dsteel', 0, 0, 1.73, 0.065, 0.02, 8)
    for sx in (-1, 1):
        k.cbox('dsteel', sx * 0.52, 0, 0.2, 0.06, 0.03, 0.08, 0.008)
    return k.done(G, water_z=0.0)


def lifeguard_chair():
    k = Kit('lifeguard_chair')
    zp = 1.9
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.beam('white', (sx * 0.75, sy * 0.7, 0.0), (sx * 0.47, sy * 0.42, zp), 0.09, 0.09, 0.008)
        k.beam('white', (sx * 0.72, -0.66, 0.25), (sx * 0.5, 0.45, zp - 0.2), 0.03, 0.08)
        k.ext('white', sx * 0.52 - 0.02, sx * 0.52 + 0.02, -0.05, 0.42, zp + 0.06, zp + 0.42, 0.006)
        k.ext('white', sx * 0.52 - 0.04, sx * 0.52 + 0.04, -0.1, 0.46, zp + 0.68, zp + 0.72, 0.008)
        k.box('white', sx * 0.52, -0.06, zp + 0.42, 0.04, 0.05, 0.27)
    for i in range(5):
        z = 0.3 + i * 0.34
        f = z / zp
        k.cbox('white', 0, -(0.7 - 0.28 * f), z, 2 * (0.75 - 0.28 * f), 0.07, 0.035, 0.006)
    k.cbox('white', 0, 0.7 - 0.28 * 0.45, zp * 0.45, 2 * (0.75 - 0.28 * 0.45), 0.035, 0.09)
    k.planks('white', -0.6, 0.6, -0.55, 0.52, zp, 0.05, 5, 0.012, along='X', b=0.008)
    k.ext('white', -0.52, 0.52, -0.08, 0.44, zp + 0.42, zp + 0.47, 0.01)
    for i in range(5):
        k.box('white', -0.4 + i * 0.2, 0.46, zp + 0.47, 0.17, 0.03, 0.6, 0.006, rx=-7)
    k.ext('white', -0.5, 0.5, -0.52, -0.36, zp - 0.5, zp - 0.46, 0.008)
    k.cyl('galv', 0.45, 0.48, zp, 0.02, 2.0, 6)
    k.lathe('fabric', [(1.05, zp + 1.72), (1.05, zp + 1.75), (0.08, zp + 2.04), (0.0, zp + 2.06)], 8, 0.45, 0.48)
    k.lathe('fabric2', [(1.065, zp + 1.6), (1.065, zp + 1.735)], 8, 0.45, 0.48)
    k.cbox('orange', -0.66, -0.2, 1.45, 0.13, 0.13, 0.55, 0.045)
    k.rod('rope', (-0.6, -0.2, 1.7), (-0.52, -0.2, zp + 0.05), 0.01, 4)
    return k.done(G, seat_z=zp + 0.47)


def tent_market():
    k = Kit('tent_market')
    h, s = 2.0, 1.5
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('alu', sx * (s - 0.03), sy * (s - 0.03), 0, 0.045, 0.045, h)
            k.box('conc', sx * (s - 0.03), sy * (s - 0.03), 0, 0.26, 0.26, 0.12, 0.03)
            k.rod('alu', (sx * (s - 0.03), sy * (s - 0.03), h - 0.02), (0, 0, h + 0.85), 0.014, 4)
    k.lathe('fabric', [(2.14, h), (2.14, h + 0.03), (0.2, h + 0.9)], 4, a0=45)
    k.lathe('fabric2', [(0.24, h + 0.88), (0.0, h + 1.0)], 4, a0=45)
    for q in range(4):
        with k.at(rz=q * 90):
            for j in range(6):
                x0 = -s + j * 0.5
                k.prism('fabric2' if j % 2 else 'fabric', [(x0, h + 0.02), (x0 + 0.5, h + 0.02), (x0 + 0.5, h - 0.16), (x0 + 0.25, h - 0.25), (x0, h - 0.16)], -s - 0.014, -s - 0.002, 'XZ')
    # trestle table with produce crates
    k.ext('wood1', -1.1, 1.1, -0.2, 0.55, 0.74, 0.78, 0.008)
    for x in (-0.8, 0.8):
        for sy in (-1, 1):
            k.beam('wood3', (x, 0.175 + sy * 0.4, 0.0), (x, 0.175 + sy * 0.12, 0.74), 0.06, 0.05)
        k.ext('wood3', x - 0.03, x + 0.03, -0.1, 0.45, 0.35, 0.4)
    cols = (('red', 'lgreen'), ('orange', 'orange'), ('lgreen', 'yellow'))
    for i, x in enumerate((-0.72, 0.0, 0.72)):
        k.box('wood2', x, 0.18, 0.78, 0.6, 0.44, 0.2, 0.012, rx=0)
        k.box(cols[i][0], x, 0.18, 0.97, 0.54, 0.38, 0.03)
        for j in range(6):
            k.sphere(cols[i][j % 2], x - 0.19 + (j % 3) * 0.19, 0.09 + (j // 3) * 0.18, 1.02, 0.075, 5, 3)
    return k.done(G, footprint=[3.0, 3.0])


def sag_pts(L, sag, n):
    return [(-L / 2 + L * i / n, 0.0, -sag * (1 - (2 * i / n - 1) ** 2)) for i in range(n + 1)]


def pennant_string():
    k = Kit('pennant_string')
    L, sag, n = 10.0, 0.5, 26
    k.tube('rope', sag_pts(L, sag, 20), 0.008, 4)
    cols = ('flag', 'fabric2', 'yellow', 'blue', 'green', 'orange')
    for i in range(n):
        x = -L / 2 + L * (i + 0.5) / n
        z = -sag * (1 - (2 * x / L) ** 2) - 0.004
        k.prism(cols[i % 6], [(x - 0.15, z), (x + 0.15, z), (x, z - 0.38)], -0.004, 0.004, 'XZ')
    return k.done(G, 'wall', anchor='ends', ends=[[-L / 2, 0, 0], [L / 2, 0, 0]], sag=sag, length=L)


def string_lights():
    k = Kit('string_lights')
    L, sag, n = 6.0, 0.35, 14
    k.tube('black', sag_pts(L, sag, 14), 0.008, 4)
    for i in range(n):
        x = -L / 2 + L * (i + 0.5) / n
        z = -sag * (1 - (2 * x / L) ** 2)
        k.cbox('black', x, 0, z - 0.025, 0.032, 0.032, 0.05)
        k.sphere('bulb', x, 0, z - 0.085, 0.045, 6, 4, 1.15)
    return k.done(G, 'wall', anchor='ends', ends=[[-L / 2, 0, 0], [L / 2, 0, 0]], sag=sag, length=L)


ALL = (pool_inground, pool_diving_board, playground_swing, playground_slide, seesaw, basketball_hoop, skate_ramp_quarter, pier_section, pier_end_ladder,
       rowboat, motorboat_small, boat_trailer, buoy, lifeguard_chair, tent_market, pennant_string, string_lights)

SHEETS = [
    ('lake_pool', ['pool_inground'], 'shot', dict(elev=32, azim=-30)),
    ('lake_pool_b', ['pool_diving_board', 'seesaw', 'skate_ramp_quarter'], 'shot', dict(gap=0.6, elev=16, azim=-38)),
    ('lake_play', ['playground_swing', 'playground_slide', 'basketball_hoop'], 'shot', dict(gap=0.5, elev=14, azim=-34)),
    ('lake_pier', ['pier_section', 'pier_end_ladder', 'buoy', 'lifeguard_chair'], 'shot', dict(gap=0.6, elev=16, azim=-34)),
    ('lake_boats', ['rowboat', 'motorboat_small', 'boat_trailer'], 'shot', dict(gap=1.3, elev=24, azim=-36)),
    ('lake_market', ['tent_market'], 'shot', dict(elev=10, azim=-30)),
    ('lake_strings', ['string_lights', 'pennant_string'], 'shot', dict(gap=0.3, elev=4, azim=-12)),
]


def build():
    for f in ALL:
        f()

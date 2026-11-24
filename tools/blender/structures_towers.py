"""Landmarks: billboards, water towers, windmill, silos."""
import math, random
from structures_kit import Kit, circle, rrect, offset_poly, corr_profile
from structures_landmarks import base_plate

G = 'towers'


def lattice(k, mat, z0, z1, w0, w1, bays, leg=0.09, br=0.045, d0=None, d1=None, x=0.0, y=0.0, cross=True, girt=None, power=1.0):
    """Four-legged braced tower between heights z0 and z1, tapering from w0 x d0 to w1 x d1."""
    d0 = w0 if d0 is None else d0
    d1 = w1 if d1 is None else d1
    girt = girt or br * 1.3

    def c(t, sx, sy):
        return (x + sx * (w0 + (w1 - w0) * t) / 2, y + sy * (d0 + (d1 - d0) * t) / 2, z0 + (z1 - z0) * t)
    cs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    ts = [1 - (1 - i / bays) ** power for i in range(bays + 1)]
    for sx, sy in cs:
        k.beam(mat, c(0, sx, sy), c(1, sx, sy), leg, leg, ext=0.0)
    for i in range(bays + 1):
        for j in range(4):
            a, b = cs[j], cs[(j + 1) % 4]
            if i > 0:
                k.beam(mat, c(ts[i], *a), c(ts[i], *b), girt, girt)
            if i < bays:
                k.beam(mat, c(ts[i], *a), c(ts[i + 1], *b), br, br * 0.6)
                if cross:
                    k.beam(mat, c(ts[i], *b), c(ts[i + 1], *a), br, br * 0.6)


def catwalk(k, x0, x1, y0, y1, z, rail_sides=('-y',), mat='dsteel', deck='steel', h=1.0):
    """Grating deck with a pipe handrail on the listed sides."""
    k.ext(deck, x0, x1, y0, y1, z, z + 0.05, 0.008)
    n = max(2, round((x1 - x0) / 0.5))
    for i in range(n + 1):
        k.ext(mat, x0 + (x1 - x0) * i / n - 0.015, x0 + (x1 - x0) * i / n + 0.015, y0, y1, z + 0.05, z + 0.058)
    for s in rail_sides:
        if s in ('-y', '+y'):
            yy = y0 + 0.03 if s == '-y' else y1 - 0.03
            m = max(1, round((x1 - x0) / 1.5))
            for i in range(m + 1):
                k.box(mat, x0 + 0.03 + (x1 - x0 - 0.06) * i / m, yy, z + 0.05, 0.04, 0.04, h)
            for zz in (z + 0.05 + h, z + 0.05 + h * 0.5):
                k.ext(mat, x0, x1, yy - 0.02, yy + 0.02, zz - 0.02, zz + 0.02)
        else:
            xx = x0 + 0.03 if s == '-x' else x1 - 0.03
            for zz in (z + 0.05 + h, z + 0.05 + h * 0.5):
                k.ext(mat, xx - 0.02, xx + 0.02, y0, y1, zz - 0.02, zz + 0.02)


def sign_lamps(k, xs, y, z, reach=0.9, mat='dsteel'):
    """Billboard floodlights on arms reaching out in -Y from (y, z), aimed back up at the face."""
    for x in xs:
        k.tube(mat, [(x, y, z), (x, y - reach, z), (x, y - reach - 0.12, z + 0.14)], 0.022, 6)
        k.box(mat, x, y - reach - 0.16, z + 0.1, 0.34, 0.16, 0.12, 0.02, rx=-35)
        k.cbox('lamp', x, y - reach - 0.115, z + 0.215, 0.28, 0.1, 0.02, rx=-35)


def roof_billboard():
    k = Kit('roof_billboard')
    W, H, zb = 6.0, 3.0, 1.1
    k.sign(0, -0.1, zb + H / 2, W, H, 0.16, 0.1, 'dsteel', back=False)
    k.cbox('wold', 0, -0.01, zb + H / 2, W + 0.1, 0.02, H + 0.1)
    for i in range(5):
        x = -2.6 + i * 1.3
        k.box('steel', x, 0.08, 0, 0.12, 0.14, zb + H + 0.25, 0.01)
        k.beam('steel', (x, 2.1, 0.08), (x, 0.15, zb + H * 0.72), 0.09, 0.09)
        k.beam('steel', (x, 1.15, 0.08), (x, 0.15, zb + 0.2), 0.07, 0.07)
        k.box('dsteel', x, 1.1, 0, 0.16, 2.3, 0.08, 0.01)
        base_plate(k, x, 2.1, 0.26)
        base_plate(k, x, 0.08, 0.3)
    for z in (0.55, zb + 0.35, zb + 1.2, zb + 2.05, zb + H - 0.1):
        k.box('steel', 0, 0.19, z, W + 0.5, 0.07, 0.09, 0.008)
    for i in range(4):
        x0, x1 = -2.6 + i * 1.3, -1.3 + i * 1.3
        a, b = ((x0, 0.2, 0.6), (x1, 0.2, zb + 0.35)) if i % 2 == 0 else ((x1, 0.2, 0.6), (x0, 0.2, zb + 0.35))
        k.beam('steel', a, b, 0.05, 0.05)
    k.box('steel', 0, 2.1, 0.5, 5.4, 0.06, 0.06)
    catwalk(k, -3.1, 3.1, -0.75, -0.2, zb - 0.32, ('-y',))
    for x in (-2.6, 0, 2.6):
        k.beam('dsteel', (x, 0.05, zb - 0.75), (x, -0.7, zb - 0.3), 0.05, 0.05)
    sign_lamps(k, (-2.0, 0, 2.0), -0.72, zb - 0.2, 0.55)
    return k.done(G, 'roof')


def highway_billboard():
    k = Kit('highway_billboard')
    W, H, zb = 12.0, 4.0, 6.0
    k.sign(0, -0.14, zb + H / 2, W, H, 0.2, 0.14, 'dgreen', back=False)
    k.cbox('wold', 0, -0.02, zb + H / 2, W + 0.2, 0.03, H + 0.2)
    for x in (-4.2, 0, 4.2):
        k.box('conc', x, 0.25, 0, 1.1, 1.1, 0.3, 0.05)
        k.box('wood3', x, 0.25, 0.3, 0.42, 0.42, zb + H - 0.2, 0.03)
        k.beam('wood3', (x, 2.6, 0.2), (x, 0.4, zb + 1.6), 0.24, 0.24)
        k.box('conc', x, 2.7, 0, 0.8, 0.8, 0.25, 0.04)
        base_plate(k, x, 0.25, 0.7)
    for z in (zb + 0.25, zb + 1.45, zb + 2.65, zb + 3.75):
        k.box('wood2', 0, 0.06, z, W + 0.1, 0.1, 0.18, 0.01)
    for x in (-4.2, 0):
        k.beam('dsteel', (x, 0.5, 1.2), (x + 4.2, 0.5, zb - 0.6), 0.07, 0.07)
        k.beam('dsteel', (x + 4.2, 0.52, 1.2), (x, 0.52, zb - 0.6), 0.07, 0.07)
    k.box('wood3', 0, 0.5, zb - 0.72, 8.9, 0.14, 0.2, 0.01)
    catwalk(k, -6.2, 6.2, -1.1, -0.26, zb - 0.45, ('-y', '-x', '+x'))
    for x in (-5.6, -2.8, 0, 2.8, 5.6):
        k.beam('dsteel', (x, 0.0, zb - 1.3), (x, -1.05, zb - 0.45), 0.06, 0.06)
        k.box('dsteel', x, -0.1, zb - 1.35, 0.08, 0.3, 0.9)
    sign_lamps(k, (-4.5, -1.5, 1.5, 4.5), -1.08, zb - 0.3, 0.6)
    k.ladder('dsteel', 5.3, 0.33, 0.4, zb - 0.4, 0.42, 0.3, cage=False)
    k.box('dgreen', 0, -0.18, zb + H + 0.14, 3.2, 0.12, 0.5, 0.03)
    k.cbox('signface', 0, -0.245, zb + H + 0.39, 2.9, 0.012, 0.32)
    k.note_face(0, -0.252, zb + H + 0.39, 2.9, 0.32)
    return k.done(G)


def water_tower_town():
    k = Kit('water_tower_town')
    n, R0, R1, zt = 6, 5.4, 3.75, 20.0
    levels = [0.0, 0.34, 0.67, 1.0]

    def leg(i, t):
        a = math.radians(i * 60)
        r = R0 + (R1 - R0) * t
        return (r * math.cos(a), r * math.sin(a), zt * t)
    for i in range(n):
        p = leg(i, 0)
        k.cyl('conc', p[0], p[1], 0, 0.75, 0.4, 8, 0.05)
        k.cyl('dsteel', p[0], p[1], 0.4, 0.42, 0.06, 8)
        k.rod('white', leg(i, 0.02), leg(i, 1.03), 0.24, 8)
        for li in range(3):
            t0, t1 = levels[li], levels[li + 1]
            j = (i + 1) % n
            k.rod('white', leg(i, t1), leg(j, t1), 0.11, 6)
            k.rod('steel', leg(i, t0 + 0.01), leg(j, t1), 0.04, 4)
            k.rod('steel', leg(j, t0 + 0.01), leg(i, t1), 0.04, 4)
    # tank: bowl, shell, roof
    prof = [(0.75, 17.9), (2.4, 18.35), (3.6, 19.3), (4.25, 20.6), (4.25, 26.1), (4.33, 26.1), (4.33, 26.3), (4.1, 26.45), (2.9, 27.75), (1.3, 28.6), (0.35, 28.85)]
    k.lathe('white', prof, 24)
    k.lathe('stripe', [(4.28, 22.6), (4.28, 24.2)], 24)
    k.lathe('lblue', [(4.275, 22.3), (4.275, 22.6)], 24)
    k.lathe('lblue', [(4.275, 24.2), (4.275, 24.5)], 24)
    k.cyl('white', 0, 0, 28.8, 0.4, 0.5, 10, 0.03)
    k.cyl('dsteel', 0, 0, 29.3, 0.55, 0.1, 10, 0.02)
    k.sphere('redlamp', 0, 0, 29.62, 0.2, 8, 5)
    k.cyl('white', 0, 0, 0.35, 0.78, 17.7, 12)
    k.cyl('conc', 0, 0, 0, 1.3, 0.4, 12, 0.06)
    for z in (4.5, 9.0, 13.5):
        k.cyl('lgrey', 0, 0, z, 0.84, 0.16, 12, 0.02)
    k.box('white', 0, -0.84, 0.4, 0.9, 0.4, 1.9, 0.03)
    k.box('dsteel', 0, -1.05, 0.5, 0.7, 0.03, 1.65, 0.0)
    # catwalk ring and rail
    k.lathe('steel', [(4.25, 20.25), (5.15, 20.25), (5.15, 20.33), (4.25, 20.33)], 24, closed=True)
    k.lathe('dsteel', [(5.05, 20.1), (5.2, 20.1), (5.2, 20.25), (5.05, 20.25)], 24, closed=True)
    for zz in (20.9, 21.4):
        k.tube('dsteel', [(5.1 * math.cos(math.radians(a * 15)), 5.1 * math.sin(math.radians(a * 15)), zz) for a in range(24)], 0.03, 4, closed=True)
    for a in range(24):
        c, s = math.cos(math.radians(a * 15)), math.sin(math.radians(a * 15))
        k.box('dsteel', 5.1 * c, 5.1 * s, 20.33, 0.05, 0.05, 1.07, rz=a * 15)
        if a % 2 == 0:
            k.beam('dsteel', (4.2 * c, 4.2 * s, 19.6), (5.1 * c, 5.1 * s, 20.25), 0.05, 0.05)
    # ladders: ground to catwalk in a cage, then up the shell to the roof hatch
    k.ladder('dsteel', 0, -5.22, 0.3, 21.5, 0.45, 0.3, cage=True, cage_from=2.6)
    for z, t in ((6.8, 0.34), (13.4, 0.67)):
        yy = -(R0 + (R1 - R0) * t) * math.cos(math.radians(30))
        for sx in (-1, 1):
            k.beam('dsteel', (sx * 0.22, -5.2, z), (sx * 0.22, yy, z), 0.04, 0.04)
    k.ladder('dsteel', 0, -4.36, 20.33, 26.6, 0.42, 0.3, standoff=0.1)
    k.box('dsteel', 0, -3.6, 26.95, 0.7, 0.7, 0.12, 0.02, rx=-42)
    return k.done(G)


def staved_tank(k, r, z0, h, n=20, mats=('wood2', 'wood3'), hoops=4, hoop='dsteel'):
    w = 2 * r * math.tan(math.pi / n) + 0.004
    for i in range(n):
        a = 360.0 * i / n
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        k.box(mats[i % len(mats)] if (i * 7) % 5 else mats[0], (r - 0.03) * c, (r - 0.03) * s, z0, 0.06, w, h + (0.02 if i % 3 == 0 else 0), rz=a)
    for i in range(hoops):
        z = z0 + 0.18 + (h - 0.36) * i / (hoops - 1)
        k.lathe(hoop, [(r + 0.002, z - 0.025), (r + 0.018, z - 0.025), (r + 0.018, z + 0.025), (r + 0.002, z + 0.025)], n, closed=True)
        k.box(hoop, (r + 0.03) * math.cos(0.5 + i), (r + 0.03) * math.sin(0.5 + i), z - 0.04, 0.05, 0.12, 0.08, rz=math.degrees(0.5 + i))


def water_tank_roof():
    k = Kit('water_tank_roof')
    r, zf, h = 1.5, 2.3, 2.9
    lattice(k, 'dsteel', 0.06, zf - 0.22, 2.9, 2.5, 2, leg=0.13, br=0.05)
    for sx in (-1, 1):
        for sy in (-1, 1):
            base_plate(k, sx * 1.45, sy * 1.45, 0.34)
    for i in range(5):
        k.box('dsteel', 0, -1.2 + i * 0.6, zf - 0.22, 2.9, 0.1, 0.16, 0.01)
    k.cyl('wood4', 0, 0, zf - 0.06, r + 0.1, 0.06, 20)
    staved_tank(k, r, zf, h)
    k.cyl('wood4', 0, 0, zf + h - 0.2, r - 0.08, 0.1, 20)
    k.lathe('wood3', [(r + 0.16, zf + h + 0.0), (r + 0.16, zf + h + 0.06), (0.12, zf + h + 0.95), (0.0, zf + h + 0.95)], 20)
    k.lathe('wood4', [(r + 0.1, zf + h - 0.03), (r + 0.17, zf + h - 0.03), (r + 0.17, zf + h + 0.0), (r + 0.1, zf + h + 0.0)], 20, closed=True)
    k.cyl('dsteel', 0, 0, zf + h + 0.92, 0.1, 0.16, 8, 0.02)
    k.sphere('dsteel', 0, 0, zf + h + 1.14, 0.09, 8, 4)
    k.ladder('dsteel', 0, -r - 0.13, 0.05, zf + h + 0.45, 0.4, 0.3, standoff=0.11)
    k.tube('galv', [(0.5, 0.3, zf - 0.1), (0.5, 0.3, 0.9), (0.5, 0.3, 0.12)], 0.07, 8)
    k.cyl('red', 0.5, 0.3, 0.75, 0.1, 0.16, 8, 0.02)
    k.tube('galv', [(r + 0.06, 0.6, zf + h - 0.35), (r + 0.3, 0.6, zf + h - 0.35), (r + 0.3, 0.6, 0.1)], 0.04, 6)
    return k.done(G, 'roof')


def farm_water_tank():
    k = Kit('farm_water_tank')
    r, zf, h = 1.35, 5.2, 2.3
    lattice(k, 'wood3', 0.25, zf - 0.3, 3.0, 2.4, 3, leg=0.2, br=0.1, girt=0.12)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('conc', sx * 1.5, sy * 1.5, 0, 0.55, 0.55, 0.3, 0.04)
    for i in range(6):
        k.box('wood2', 0, -1.25 + i * 0.5, zf - 0.3, 3.0, 0.14, 0.14, 0.01)
    k.planks('wood1', -1.55, 1.55, -1.55, 1.55, zf - 0.16, 0.06, 9, 0.012, 'X', alt='wood2')
    k.box('wood3', 0, -1.52, zf - 0.1, 3.1, 0.06, 0.06)
    prof = [(r - 0.02, zf - 0.1), (r, zf - 0.1)]
    nb = 12
    for i in range(nb):
        z = zf - 0.1 + h * i / nb
        prof += [(r, z + 0.02), (r + 0.035, z + h / nb * 0.3), (r + 0.035, z + h / nb * 0.7), (r, z + h / nb - 0.02)]
    prof += [(r, zf - 0.1 + h)]
    k.lathe('galv', prof, 20)
    k.lathe('zinc', [(r + 0.12, zf + h - 0.14), (r + 0.12, zf + h - 0.08), (0.14, zf + h + 0.55), (0.0, zf + h + 0.55)], 20)
    k.cyl('zinc', 0, 0, zf + h + 0.5, 0.14, 0.14, 8, 0.02)
    k.ladder('wood2', -0.6, -1.63, 0.1, zf + 0.4, 0.42, 0.34)
    k.tube('dsteel', [(0.9, 0.2, zf - 0.2), (0.9, 0.2, 0.9), (0.9, -0.5, 0.9), (0.9, -0.5, 0.55)], 0.05, 8)
    k.cyl('brass', 0.9, 0.2, 1.3, 0.075, 0.14, 8, 0.01)
    k.tube('dsteel', [(-r - 0.02, 0.5, zf + h - 0.3), (-r - 0.25, 0.5, zf + h - 0.3), (-r - 0.25, 0.5, zf + 0.2)], 0.035, 6)
    return k.done(G)


def windmill_farm():
    k = Kit('windmill_farm')
    H = 11.2
    lattice(k, 'galv', 0.2, H, 2.7, 0.42, 7, leg=0.075, br=0.035, girt=0.05, power=0.9)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('conc', sx * 1.35, sy * 1.35, 0, 0.42, 0.42, 0.25, 0.04)
    k.box('wood2', 0, 0, 9.35, 1.5, 1.5, 0.06, 0.01)
    for sx, sy in ((-1, 0), (1, 0), (0, 1)):
        k.box('galv', sx * 0.72, sy * 0.72, 9.41, 1.5 if sy else 0.04, 0.04 if sy else 1.5, 0.04)
    k.ladder('galv', 0.5, -0.62, 0.3, 9.4, 0.36, 0.34)
    # pump rod, well head
    k.cyl('dsteel', 0, 0, 0.5, 0.025, H - 0.4, 6)
    k.cyl('conc', 0, 0, 0, 0.5, 0.3, 10, 0.04)
    k.cyl('dsteel', 0, 0, 0.3, 0.12, 0.5, 8, 0.02)
    k.tube('dsteel', [(0, 0, 0.6), (0.9, 0, 0.6), (0.9, 0, 0.3)], 0.045, 6)
    # head: gearbox, turntable, tail
    hz = H + 0.5
    k.cyl('galv', 0, 0, H - 0.05, 0.2, 0.3, 10, 0.02)
    k.box('red', 0, 0.05, hz - 0.25, 0.4, 0.75, 0.5, 0.06)
    k.cyl('dsteel', 0, -0.55, hz, 0.06, 0.3, 8, axis='Y')
    k.beam('galv', (0, 0.4, hz), (0, 2.5, hz + 0.05), 0.06, 0.06)
    k.beam('galv', (0, 0.4, hz - 0.2), (0, 2.2, hz - 0.35), 0.03, 0.03)
    tail = [(1.9, hz - 0.75), (3.5, hz - 0.95), (3.75, hz - 0.2), (3.75, hz + 0.3), (3.5, hz + 1.05), (1.9, hz + 0.85)]
    k.prism('white', tail, -0.015, 0.015, 'YZ', 0.0)
    k.prism('red', [(3.3, hz - 0.93), (3.5, hz - 0.95), (3.75, hz - 0.2), (3.75, hz + 0.3), (3.5, hz + 1.05), (3.3, hz + 1.03)], -0.019, 0.019, 'YZ', 0.0)
    k.box('galv', 0, 2.8, hz - 0.03, 0.045, 1.9, 0.06)
    # rotor child, origin on the hub, spins about Y
    r = k.part('rotor', 0, -0.62, hz)
    r.cyl('red', 0, -0.12, 0, 0.16, 0.26, 10, 0.03, axis='Y')
    R, nb = 1.75, 18
    for rr in (0.62, 1.42):
        r.tube('galv', [(rr * math.cos(math.radians(a * 20)), 0.0, rr * math.sin(math.radians(a * 20))) for a in range(18)], 0, closed=True, sq=(0.03, 0.03))
    for i in range(nb):
        a = 360.0 * i / nb
        hl = (R - 0.5) / 2
        with r.at(0, -0.02, 0, ry=a):
            with r.at(0, 0, 0.5 + hl, rz=24):
                r.prism('galv' if i % 2 else 'alu', [(-0.07, -hl), (0.07, -hl), (0.25, hl), (-0.25, hl)], -0.008, 0.008, 'XZ', 0.0)
        if i % 3 == 0:
            c, s = math.cos(math.radians(a + 10)), math.sin(math.radians(a + 10))
            r.beam('dsteel', (0.1 * c, 0.02, 0.1 * s), (1.42 * c, 0.02, 1.42 * s), 0.025, 0.025)
    return k.done(G)


def silo_shell(k, x, y, r, h, mat='conc', n=20, hoops=8, hoop='lgrey', z0=0.0):
    k.cyl('dconc', x, y, z0, r + 0.12, 0.35, n, 0.04)
    k.cyl(mat, x, y, z0 + 0.35, r, h - 0.35, n)
    for i in range(hoops):
        z = z0 + 0.9 + (h - 1.4) * i / (hoops - 1)
        k.lathe(hoop, [(r + 0.003, z - 0.05), (r + 0.03, z - 0.05), (r + 0.03, z + 0.05), (r + 0.003, z + 0.05)], n, x, y, closed=True)


def grain_silo():
    k = Kit('grain_silo')
    r, h = 2.4, 15.0
    silo_shell(k, 0, 0, r, h, 'conc', 20, 11)
    k.lathe('dsteel', [(r + 0.06, h - 0.02), (r + 0.06, h + 0.1), (r - 0.05, h + 0.2)], 20)
    dome = [(r - 0.05, h + 0.2)] + [(r * 0.98 * math.cos(math.radians(a)), h + 0.2 + r * 0.92 * math.sin(math.radians(a))) for a in (18, 36, 54, 72, 84)] + [(0.0, h + 0.2 + r * 0.92)]
    k.lathe('galv', dome, 20)
    for i in range(10):
        a = math.radians(i * 36 + 9)
        k.tube('zinc', [(rr * math.cos(a), rr * math.sin(a), zz + 0.012) for rr, zz in dome[:-1]], 0, sq=(0.05, 0.03))
    k.cyl('zinc', 0, 0, h + 0.2 + r * 0.9, 0.3, 0.3, 10, 0.03)
    k.lathe('zinc', [(0.42, h + 0.48 + r * 0.9), (0.0, h + 0.75 + r * 0.9)], 10)
    # unloading chute up the front, ladder in a cage beside it
    k.box('galv', 0, -r - 0.32, 0.4, 0.95, 0.7, h - 0.3, 0.05)
    for i in range(9):
        k.box('dsteel', 0, -r - 0.68, 1.2 + i * 1.6, 0.6, 0.03, 0.6, 0.0)
    k.prism('galv', [(-r - 0.67, h + 0.1), (-r + 0.4, h + 0.1), (-r + 0.4, h + 1.0), (-r - 0.67, h + 0.5)], -0.47, 0.47, 'YZ', 0.03)
    a = math.radians(-58)
    with k.at(0, 0, 0, rz=32):
        k.ladder('dsteel', 0, -r - 0.14, 0.4, h + 0.9, 0.42, 0.32, cage=True, cage_from=2.6, standoff=0.12)
    k.box('dgreen', 0, -r - 0.3, 0, 1.3, 1.2, 0.5, 0.04)
    return k.done(G)


def corr_wall(k, mat, r, z0, h, n=24, pitch=0.22, x=0.0, y=0.0, depth=0.03):
    m = max(1, round(h / pitch))
    p = h / m
    prof = [(r, z0)]
    for i in range(m):
        z = z0 + i * p
        prof += [(r + depth, z + p * 0.3), (r + depth, z + p * 0.7), (r, z + p)]
    k.lathe(mat, prof, n, x, y)


def cone_roof(k, mat, r, z, rise, n=24, ribs=12, rib='zinc', cap=0.45, x=0.0, y=0.0, over=0.12):
    k.lathe(mat, [(r - 0.1, z - 0.02), (r + over, z - 0.02), (r + over, z + 0.03), (cap, z + rise), (0.0, z + rise)], n, x, y)
    for i in range(ribs):
        a = math.radians(360.0 * i / ribs + 180.0 / n)
        c, s = math.cos(a), math.sin(a)
        k.beam(rib, (x + (r + over) * c, y + (r + over) * s, z + 0.05), (x + cap * c, y + cap * s, z + rise + 0.02), 0.05, 0.04)
    k.cyl(rib, x, y, z + rise - 0.02, cap + 0.06, 0.22, 12, 0.03)
    k.lathe(rib, [(cap + 0.22, z + rise + 0.2), (cap + 0.22, z + rise + 0.24), (0.0, z + rise + 0.42)], 12, x, y)


def grain_bin():
    k = Kit('grain_bin')
    r, h = 2.75, 4.6
    k.cyl('conc', 0, 0, 0, r + 0.25, 0.3, 24, 0.04)
    corr_wall(k, 'galv', r, 0.3, h, 24, 0.23)
    for i in range(12):
        a = 30 * i + 15
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        k.box('zinc', (r + 0.04) * c, (r + 0.04) * s, 0.3, 0.05, 0.09, h, rz=a)
    cone_roof(k, 'galv', r, 0.3 + h, 1.6, 24, 12)
    k.box('zinc', 0, -r - 0.05, 0.45, 0.85, 0.14, 1.75, 0.02)
    k.box('galv', 0, -r - 0.11, 0.55, 0.68, 0.06, 1.55, 0.015)
    for z in (0.9, 1.35, 1.8):
        k.box('dsteel', 0, -r - 0.15, z, 0.74, 0.03, 0.05)
    k.cyl('dsteel', 0.25, -r - 0.2, 1.3, 0.035, 0.05, 6, axis='-Y')
    with k.at(0, 0, 0, rz=38):
        k.ladder('dsteel', 0, -r - 0.16, 0.35, h + 0.75, 0.4, 0.32, standoff=0.12)
    with k.at(0, 0, 0, rz=-70):
        k.box('red', 0, -r - 0.35, 0.3, 0.55, 0.6, 0.5, 0.05)
        k.cyl('dsteel', 0, -r - 0.67, 0.55, 0.2, 0.06, 10, axis='-Y')
        k.box('zinc', 0, -r - 0.05, 0.32, 0.7, 0.3, 0.34, 0.02)
    k.box('zinc', 0.9, -1.35, 0.3 + h + 0.72, 0.6, 0.6, 0.14, 0.02, rx=-30, rz=34)
    return k.done(G)


def silo_pair_elevator():
    k = Kit('silo_pair_elevator')
    r, h = 3.0, 17.0
    for sx in (-1, 1):
        silo_shell(k, sx * 3.05, 0, r, h, 'cream', 20, 6, 'stone2')
        k.lathe('stone2', [(r + 0.1, h - 0.3), (r + 0.1, h), (r - 0.3, h + 0.12)], 20, sx * 3.05, 0)
        k.cyl('dconc', sx * 3.05, 0, h, r - 0.3, 0.12, 20)
    k.box('cream', 0, 0, 0.35, 2.4, 3.6, h - 0.35, 0.04)
    # head house across the top with a gable roof
    k.box('white', 0, 0, h + 0.1, 10.6, 3.4, 2.8, 0.05)
    k.gable('roof', 3.4, 10.6, h + 2.9, 0.9, 0.3, 0.1, 'YZ', b=0.0)
    for x in (-3.9, -1.3, 1.3, 3.9):
        k.box('dglass', x, -1.705, h + 1.3, 0.9, 0.03, 1.0)
        k.frame('white', x, -1.72, h + 1.24, 1.02, 1.12, 0.07, 0.05)
        k.box('white', x, -1.725, h + 1.3, 0.04, 0.04, 1.0)
    for sx in (-1, 1):
        k.prism('white', [(-1.7, h + 2.9), (1.7, h + 2.9), (0, h + 3.78)], sx * 5.3 - 0.02, sx * 5.3 + 0.02, 'YZ')
    # elevator leg (tall box) with head, spouts down to both silos
    k.box('galv', 0, -2.3, 0, 1.0, 1.0, h + 6.2, 0.04)
    for z in range(2, int(h + 6), 3):
        k.box('zinc', 0, -2.3, z, 1.08, 1.08, 0.12, 0.01)
    k.box('red', 0, -2.2, h + 6.2, 1.7, 1.9, 1.5, 0.12)
    k.box('white', 0, -3.16, h + 6.6, 1.0, 0.03, 0.6)
    k.note_face(0, -3.18, h + 6.9, 1.0, 0.6)
    for sx in (-1, 1):
        k.rod('galv', (sx * 0.6, -1.9, h + 6.3), (sx * 3.4, -0.4, h + 3.55), 0.2, 8)
    k.box('white', 0, -2.9, 0, 3.4, 2.4, 3.2, 0.05)
    k.prism('roof', [(-1.9, 3.2), (1.9, 3.2), (1.9, 3.3), (0, 3.95), (-1.9, 3.3)], -4.25, -1.6, 'XZ', 0.02)
    k.box('door', 0, -4.115, 0, 2.2, 0.06, 2.6, 0.01)
    for z in (0.5, 1.1, 1.7, 2.3):
        k.box('dgreen', 0, -4.15, z, 2.2, 0.02, 0.04)
    k.ladder('dsteel', 0.9, -2.83, 3.3, h + 6.3, 0.4, 0.32, cage=True, cage_from=5.5, standoff=0.03)
    k.cbox('signface', 0, -1.81, 8.5, 2.0, 0.03, 1.4)
    k.frame('dred', 0, -1.83, 7.72, 2.16, 1.56, 0.08, 0.05)
    k.note_face(0, -1.83, 8.5, 2.0, 1.4)
    return k.done(G)


SHEETS = [
    ('towers_billboards', ['roof_billboard', 'highway_billboard'], 'shot', dict(gap=2.0, elev=12)),
    ('towers_water', ['water_tower_town', 'water_tank_roof', 'farm_water_tank', 'windmill_farm'], 'shot', dict(gap=2.5, elev=10)),
    ('towers_silos', ['grain_silo', 'grain_bin', 'silo_pair_elevator'], 'shot', dict(gap=2.5, elev=12)),
]


def build():
    for f in (roof_billboard, highway_billboard, water_tower_town, water_tank_roof, farm_water_tank, windmill_farm, grain_silo, grain_bin, silo_pair_elevator):
        f()

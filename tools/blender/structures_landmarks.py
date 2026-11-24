"""Landmarks: signs, towers, farm and civic set pieces."""
import math, random
from structures_kit import Kit, circle, rrect, offset_poly, corr_profile

G = 'landmarks'


def base_plate(k, x, y, s=0.5, mat='dsteel', bolts=True):
    """Flange with anchor bolts under a steel post."""
    k.box(mat, x, y, 0, s, s, 0.03, 0.006)
    if bolts:
        for sx in (-1, 1):
            for sy in (-1, 1):
                k.cyl('galv', x + sx * s * 0.36, y + sy * s * 0.36, 0.03, 0.022, 0.035, 6)


def disc_sign(k, x, y, z, d, t=0.3, rim='red', n=24):
    """Round two-sided blank sign: chamfered rim ring and recessed faces, axis along Y."""
    r = d / 2
    ring = [(r - 0.16, -t / 2), (r - 0.03, -t / 2), (r, -t / 2 + 0.03), (r, t / 2 - 0.03), (r - 0.03, t / 2), (r - 0.16, t / 2)]
    k.lathe(rim, ring, n, x, y, z, axis='Y', closed=True)
    k.cyl('signface', x, y - t / 2 + 0.03, z, r - 0.15, t - 0.06, n, axis='Y')
    k.note_face(x, y - t / 2 + 0.03, z, d - 0.3, d - 0.3)
    k.note_face(x, y + t / 2 - 0.03, z, d - 0.3, d - 0.3, 180.0)


def giant_donut_sign():
    k = Kit('giant_donut_sign')
    R, r, cz = 1.2, 0.55, 2.65
    k.torus('dough', 0, 0, cz, R, r, 24, 10, axis='Y')
    rings = []
    for i in range(24):
        th = 2 * math.pi * i / 24
        e = 96 + 20 * math.sin(5 * th) + 9 * math.sin(3 * th + 1.0)
        ring = []
        for rr, sgn in ((r + 0.04, 1), (r - 0.08, -1)):
            for j in range(7):
                ps = math.radians(-90 + sgn * (-e + 2 * e * j / 6))
                rad = R + rr * math.cos(ps)
                ring.append((rad * math.cos(th), rr * math.sin(ps), cz + rad * math.sin(th)))
        rings.append(ring)
    k.loft('pink', rings, closed=True)
    rnd = random.Random(7)
    cols = ['white', 'yellow', 'lblue', 'red', 'lgreen']
    for i in range(34):
        th = 2 * math.pi * (i + rnd.random() * 0.7) / 34
        ps = math.radians(-90 + rnd.uniform(-48, 48))
        rad = R + (r + 0.05) * math.cos(ps)
        k.cbox(cols[i % 5], rad * math.cos(th), (r + 0.05) * math.sin(ps), cz + rad * math.sin(th), 0.2, 0.06, 0.06, 0.012,
               ry=rnd.uniform(0, 180), rx=math.degrees(ps) + 90)
    # steel roof stand behind the donut
    for sx in (-1, 1):
        x = sx * 0.95
        k.box('dsteel', x, 0.95, 0, 0.14, 2.3, 0.1, 0.01)
        k.box('steel', x, 0.66, 0.1, 0.12, 0.12, 3.5, 0.01)
        k.beam('steel', (x, 1.95, 0.12), (x, 0.7, 2.7), 0.08, 0.08)
        k.beam('steel', (x, 0.66, 2.3), (x * 0.9, 0.3, 2.3 + sx * 0), 0.07, 0.07)
        for z in (1.75, 3.45):
            k.cyl('steel', x, 0.66, z, 0.045, 0.3, 8, axis='-Y')
        base_plate(k, x, 1.95, 0.3)
    for z in (0.5, 1.9, 3.3):
        k.box('steel', 0, 0.66, z, 2.0, 0.08, 0.08, 0.008)
    k.beam('steel', (-0.9, 0.66, 0.58), (0.9, 0.66, 1.9), 0.05, 0.05)
    k.beam('steel', (0.9, 0.68, 0.58), (-0.9, 0.68, 1.9), 0.05, 0.05)
    for a in (-1, 1):
        k.cyl('steel', a * 0.95, 0.62, 1.94, 0.05, 0.36, 8, axis='-Y')
    return k.done(G, 'roof')


def gas_price_pylon():
    k = Kit('gas_price_pylon')
    k.box('conc', 0, 0, 0, 3.0, 0.9, 0.35, 0.04)
    k.box('yellow', 0, 0, 0.35, 2.8, 0.7, 0.08, 0.02)
    for sx in (-1, 1):
        k.box('white', sx * 1.05, 0, 0.35, 0.28, 0.28, 7.4, 0.02)
        k.box('stripe', sx * 1.05, 0, 0.9, 0.3, 0.3, 0.5, 0.01)
        base_plate(k, sx * 1.05, 0, 0.5)
    disc_sign(k, 0, 0, 8.45, 3.1, 0.36, 'stripe')
    k.box('white', 0, 0, 6.72, 2.4, 0.2, 0.34, 0.02)
    k.sign(0, 0, 6.05, 1.7, 0.95, 0.24, 0.08, 'white')
    for i, z in enumerate((5.0, 4.25, 3.5)):
        k.sign(0, 0, z, 1.7, 0.52, 0.2, 0.06, 'dsteel')
    k.box('white', 0, 0, 2.86, 2.1, 0.16, 0.2, 0.02)
    k.box('stripe', 0, 0, 2.5, 1.82, 0.1, 0.3, 0.015)
    return k.done(G, round_faces=[0, 1])


def gas_canopy():
    k = Kit('gas_canopy')
    W, D, z0, fh = 12.0, 8.0, 4.5, 0.95
    k.box('white', 0, 0, z0, W, D, fh, 0.05)
    k.box('dsteel', 0, 0, z0 + fh - 0.01, W - 0.3, D - 0.3, 0.08, 0.02)
    for sy in (-1, 1):
        k.box('stripe', 0, sy * (D / 2 + 0.006), z0 + 0.2, W - 0.12, 0.02, 0.26)
        k.cbox('signface', 0, sy * (D / 2 + 0.008), z0 + 0.66, 4.2, 0.03, 0.4)
        k.note_face(0, sy * (D / 2 + 0.024), z0 + 0.66, 4.2, 0.4, 0.0 if sy < 0 else 180.0)
    for sx in (-1, 1):
        k.box('stripe', sx * (W / 2 + 0.006), 0, z0 + 0.2, 0.02, D - 0.12, 0.26)
    k.box('lgrey', 0, 0, z0 - 0.04, W - 0.5, D - 0.5, 0.05, 0.01)
    for ix in range(-3, 4):
        k.box('grey', ix * 1.6, 0, z0 - 0.05, 0.03, D - 0.6, 0.02)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * 3.6, sy * 2.1
            k.box('conc', x, y, 0, 0.9, 0.9, 0.2, 0.04)
            k.box('white', x, y, 0.2, 0.5, 0.5, z0 - 0.2, 0.03)
            k.box('stripe', x, y, 0.75, 0.53, 0.53, 0.45, 0.012)
            k.box('white', x, y, z0 - 0.3, 0.8, 0.8, 0.28, 0.06)
            for dx in (-1, 1):
                k.cyl('yellow', x + dx * 0.36, y - sy * 0.62, 0, 0.06, 0.95, 8, 0.015)
        for iy in (-1, 0, 1):
            k.box('alu', sx * 3.6 + 0, iy * 2.6, z0 - 0.1, 1.5, 0.75, 0.07, 0.015)
            k.box('lpanel', sx * 3.6, iy * 2.6, z0 - 0.115, 1.34, 0.6, 0.02)
        k.box('lpanel', 0, sx * 2.6, z0 - 0.115, 1.34, 0.6, 0.02)
        k.box('alu', 0, sx * 2.6, z0 - 0.1, 1.5, 0.75, 0.07, 0.015)
        k.tube('galv', [(sx * 3.6 + 0.3, 2.1 + 0.3, z0 - 0.3), (sx * 3.6 + 0.3, 2.1 + 0.3, 0.25)], 0.04, 6)
    return k.done(G)


def motel_arrow_sign():
    k = Kit('motel_arrow_sign')
    for sx in (-1, 1):
        k.box('teal', sx * 0.8, 0, 0, 0.2, 0.2, 6.3, 0.02)
        base_plate(k, sx * 0.8, 0, 0.42)
    k.box('conc', 0, 0, 0, 2.6, 0.7, 0.3, 0.04)
    k.sign(0, 0, 4.9, 3.0, 1.3, 0.3, 0.09, 'teal')
    k.sign(0, 0, 3.6, 1.9, 0.45, 0.2, 0.06, 'dsteel')
    k.box('teal', 0, 0, 2.95, 1.8, 0.12, 0.12, 0.01)
    arrow = [(1.9, 6.05), (1.9, 6.75), (-1.2, 6.75), (-1.2, 7.25), (-2.5, 6.4), (-1.2, 5.55), (-1.2, 6.05)]
    k.prism('yellow', arrow, -0.17, 0.17, 'XZ', 0.03)
    k.prism('red', offset_poly(arrow, -0.2), -0.185, 0.185, 'XZ', 0.0)
    inner = offset_poly(arrow, -0.1)
    pts = []
    for i in range(len(inner)):
        a, b = inner[i], inner[(i + 1) % len(inner)]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        n = max(1, round(L / 0.3))
        pts += [(a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n) for j in range(n)]
    k.bulbs([(u, -0.19, v) for u, v in pts], 0.05)
    k.bulbs([(u, 0.19, v) for u, v in pts], 0.05)
    for x in (-0.8, 0.8):
        k.box('teal', x, 0, 5.64, 0.14, 0.14, 0.45)
    return k.done(G)


def drive_in_sign():
    k = Kit('drive_in_sign')
    k.box('conc', 0, 0, 0, 1.6, 1.0, 0.3, 0.04)
    k.prism('cream', [(-0.32, 0.3), (0.32, 0.3), (0.2, 4.6), (-0.2, 4.6)], -0.16, 0.16, 'XZ', 0.03)
    k.box('dsteel', 0, 0, 4.5, 0.16, 0.16, 3.9, 0.01)
    boom = [(-2.3, 5.2), (0.2, 4.55), (2.5, 5.9), (2.2, 6.75), (0.1, 5.75), (-2.1, 6.3)]
    k.prism('red', boom, -0.2, 0.2, 'XZ', 0.04)
    k.prism('yellow', offset_poly(boom, 0.09), -0.14, 0.14, 'XZ', 0.0)
    k.sign(0, 0, 7.45, 2.9, 1.15, 0.34, 0.09, 'red')
    k.sign(0.1, 0, 3.75, 1.7, 0.6, 0.24, 0.07, 'dred')
    star = [((0.62 if i % 2 == 0 else 0.26) * math.cos(math.radians(90 + i * 22.5)), 8.95 + (0.62 if i % 2 == 0 else 0.26) * math.sin(math.radians(90 + i * 22.5))) for i in range(16)]
    k.prism('yellow', star, -0.07, 0.07, 'XZ', 0.02)
    k.sphere('bulb', 0, -0.1, 8.95, 0.12, 8, 4)
    k.sphere('bulb', 0, 0.1, 8.95, 0.12, 8, 4)
    k.box('dsteel', 0, 0, 8.08, 0.1, 0.1, 0.45)
    k.bulbs([(-1.45 + i * 0.29, -0.2, 6.78) for i in range(11)], 0.045)
    k.bulbs([(-1.45 + i * 0.29, 0.2, 6.78) for i in range(11)], 0.045)
    return k.done(G)


def pole_sign_round():
    k = Kit('pole_sign_round')
    base_plate(k, 0, 0, 0.5)
    k.cyl('conc', 0, 0, 0, 0.42, 0.18, 12, 0.03)
    k.cyl('white', 0, 0, 0.18, 0.1, 4.3, 10)
    k.cyl('dsteel', 0, 0, 0.18, 0.13, 0.5, 10, 0.02)
    disc_sign(k, 0, 0, 5.35, 1.9, 0.24, 'blue', 20)
    k.box('white', 0, 0, 4.3, 0.3, 0.2, 0.16, 0.02)
    return k.done(G, round_faces=[0, 1])


def pole_sign_rect():
    k = Kit('pole_sign_rect')
    base_plate(k, 0, 0, 0.5)
    k.cyl('conc', 0, 0, 0, 0.42, 0.18, 12, 0.03)
    k.box('dsteel', 0, 0, 0.18, 0.18, 0.18, 5.9, 0.015)
    k.sign(0, 0, 5.2, 2.5, 1.25, 0.3, 0.08, 'white')
    k.sign(0, 0, 3.95, 1.7, 0.5, 0.2, 0.06, 'white')
    for z in (4.32, 3.52):
        k.box('dsteel', 0, 0, z, 0.5, 0.24, 0.07, 0.01)
    return k.done(G)


SHEETS = [
    ('landmark_signs', ['giant_donut_sign', 'gas_price_pylon', 'motel_arrow_sign', 'drive_in_sign', 'pole_sign_round', 'pole_sign_rect'], 'shot', dict(gap=1.5)),
    ('landmark_canopy', ['gas_canopy'], 'shot', dict(elev=8)),
]


def build():
    for f in (giant_donut_sign, gas_price_pylon, gas_canopy, motel_arrow_sign, drive_in_sign, pole_sign_round, pole_sign_rect):
        f()

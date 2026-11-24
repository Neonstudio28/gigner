"""Street furniture, part 2: seating, tables, bikes, carts, planters, flag, bus stop."""
import math
from streetprops_kit import *
from streetprops_furniture import STEEL, DARK, BLACK, CREAM

WOOD, WOOD2, IRON = '#9a6f44', '#87603a', '#26302b'


def lerp(a, b, t):
    return a + (b - a) * t


def wire(a, m, p0, p1, r=0.005):
    """Thin four-sided rod without end caps (baskets, grilles, fence wire)."""
    a.tube(m, [p0, p1], r, 4, caps=False)


def bush(a, at, r, seed=0, cols=('#3f7a3a', '#2f6230', '#58924a')):
    """Clipped shrub: three overlapping faceted blobs in two greens."""
    x, y, z = at
    for i in range(3):
        k = 0.75 + 0.4 * rnd(seed, i)
        ang = math.tau * (i / 3 + rnd(seed, i, 5))
        o = r * 0.45 * (i > 0)
        a.sphere(P(cols[i % len(cols)]), r * k, (x + o * math.cos(ang), y + o * math.sin(ang), z + r * k * 0.55), 7, 4,
                 (1, 1, 0.8), (0, 0, 360 * rnd(seed, i, 9)))


def flowers(a, pts, cols=('#d8433a', '#efc23c', '#e9e6dc', '#d86aa0')):
    for i, (x, y, z) in enumerate(pts):
        a.cyl(P('#3f7a3a'), 0.006, (x, y, z), (x, y, z + 0.1), 4, caps=False)
        a.sphere(P(cols[i % len(cols)]), 0.035, (x, y, z + 0.115), 6, 3, (1, 1, 0.6))


# ------------------------------------------------------------------ benches and tables
@asset('furniture2')
def bench_wood():
    a = Asset('bench_wood')
    wood, iron, steel = P(WOOD), P(IRON), MT('#6f7579')
    for s in a.mx():
        x = 0.74
        a.bar(iron, [(x, 0.33, 0), (x, 0.19, 0.42), (x, 0.31, 0.9)], 0.05, 0.045, up=(1, 0, 0))
        a.bar(iron, [(x, -0.2, 0), (x, -0.22, 0.42)], 0.05, 0.045, up=(1, 0, 0))
        a.bar(iron, [(x, -0.25, 0.4), (x, 0.2, 0.4)], 0.05, 0.045, up=(1, 0, 0))
        a.bar(iron, fillet([(x, -0.23, 0.42), (x, -0.28, 0.65), (x, 0.26, 0.67)], 0.06, 3), 0.04, 0.05, up=(1, 0, 0))
        a.bar(iron, [(x, -0.2, 0.14), (x, 0.3, 0.14)], 0.03, 0.03, up=(1, 0, 0))
        a.box(iron, 0.07, 0.09, 0.012, (x, 0.335, 0.006))
        a.box(iron, 0.07, 0.09, 0.012, (x, -0.2, 0.006))
    for i in range(5):
        y = -0.215 + i * 0.094
        a.box(wood if i % 2 == 0 else P(WOOD2), 1.62, 0.082, 0.032, (0, y, 0.44), 0.006, 'x')
        a.bolts(steel, [(sx * 0.74, y, 0.456) for sx in (-1, 1)], 0.009, 0.005, (0, 0, 1))
    with a.at((0, 0.19, 0.42), (-14, 0, 0)):
        for i in range(4):
            z = 0.13 + i * 0.105
            a.box(wood if i % 2 else P(WOOD2), 1.62, 0.03, 0.09, (0, -0.04, z), 0.006, 'x')
            a.bolts(steel, [(sx * 0.74, -0.055, z) for sx in (-1, 1)], 0.009, 0.005)
    a.box(iron, 0.04, 0.46, 0.03, (0, -0.02, 0.41))
    return a


@asset('furniture2')
def bench_metal():
    a = Asset('bench_metal')
    gr, dk = P('#2f6a49'), P('#22503a')
    prof = fillet([(-0.27, 0.4), (-0.24, 0.45), (0.14, 0.43), (0.25, 0.82), (0.28, 0.86)], 0.07, 3)
    for s in a.mx():
        x = 0.86
        a.bar(dk, [(x, y, z) for y, z in prof], 0.014, 0.05, up=(1, 0, 0))
        a.tube(dk, fillet([(x, -0.22, 0), (x, -0.22, 0.4), (x, 0.2, 0.4), (x, 0.3, 0)], 0.05, 2), 0.02, 6)
        a.tube(dk, fillet([(x, -0.24, 0.45), (x, -0.27, 0.66), (x, 0.2, 0.68)], 0.05, 2), 0.016, 6)
        a.cz(dk, 0.04, 0, 0.012, x=x, y=-0.22, n=8)
        a.cz(dk, 0.04, 0, 0.012, x=x, y=0.3, n=8)
    # slats follow the seat profile
    seg = []
    for (y0, z0), (y1, z1) in zip(prof, prof[1:]):
        L = math.hypot(y1 - y0, z1 - z0)
        seg.append((y0, z0, y1, z1, L))
    total = sum(s[4] for s in seg)
    n = 13
    for i in range(n):
        dist, acc = total * (i + 0.5) / n, 0.0
        for y0, z0, y1, z1, L in seg:
            if acc + L >= dist:
                t = (dist - acc) / L
                ang = math.degrees(math.atan2(z1 - z0, y1 - y0))
                a.box(gr, 1.74, 0.05, 0.012, (0, lerp(y0, y1, t), lerp(z0, z1, t)), rot=(ang, 0, 0))
                break
            acc += L
    a.tube(dk, [(-0.86, 0.02, 0.4), (0.86, 0.02, 0.4)], 0.016, 6)
    a.box(dk, 0.014, 0.5, 0.05, (0, -0.03, 0.41))
    return a


@asset('furniture2')
def picnic_table():
    a = Asset('picnic_table')
    wood, wood2, steel = P('#a57a4d'), P('#93693f'), MT('#6f7579')
    for i in range(5):
        y = (i - 2) * 0.152
        a.box(wood if i % 2 == 0 else wood2, 1.83, 0.14, 0.04, (0, y, 0.74), 0.006, 'x')
    for s in a.mx(1):
        for i in range(2):
            a.box(wood2 if i else wood, 1.83, 0.14, 0.04, (0, 0.6 + i * 0.152, 0.45), 0.006, 'x')
    for s in a.mx():
        x = 0.62
        for t in a.mx(1):
            a.bar(wood2, [(x, 0.62, 0), (x, 0.22, 0.72)], 0.04, 0.1, up=(1, 0, 0))
            a.bolts(steel, [(x + 0.022, 0.39, 0.41), (x + 0.022, 0.25, 0.68)], 0.012, 0.006, (1, 0, 0))
        a.box(wood, 0.04, 1.56, 0.1, (x - 0.04, 0, 0.38), 0.005, 'y')
        a.box(wood, 0.04, 0.74, 0.08, (x - 0.04, 0, 0.68), 0.005, 'y')
        a.bar(wood2, [(x - 0.06, 0, 0.36), (0.2, 0, 0.71)], 0.08, 0.035, up=(0, 1, 0))
    a.box(wood2, 0.04, 0.72, 0.06, (0, 0, 0.69))
    return a


def _patio_table(a, col='#e9e6dc'):
    wh, dk = P(col), P('#b9b5a8')
    a.lathe(wh, [(0, 0.7), (0.5, 0.7), (0.52, 0.715), (0.52, 0.735), (0.5, 0.75), (0, 0.75)], 14)
    a.lathe(dk, [(0.42, 0.66), (0.44, 0.7)], 14, caps=False)
    for i in range(4):
        ang = rad(45 + 90 * i)
        c, s = math.cos(ang), math.sin(ang)
        a.tube(wh, fillet([(0.4 * c, 0.4 * s, 0), (0.3 * c, 0.3 * s, 0.6), (0.12 * c, 0.12 * s, 0.7)], 0.08, 2), 0.016, 6)
        a.cz(dk, 0.028, 0, 0.012, x=0.4 * c, y=0.4 * s, n=6)
    a.torus(wh, 0.27, 0.012, (0, 0, 0.3), n=12, k=4)
    # umbrella pole, weighted base
    a.lathe(P('#8d9296'), [(0, 0), (0.2, 0), (0.2, 0.03), (0.17, 0.06), (0.05, 0.08), (0.05, 0.16), (0, 0.16)], 10)
    a.cz(MT('#c9cdd0'), 0.02, 0.16, 2.28, n=8)
    a.cz(MT('#8f979c'), 0.03, 0.75, 0.78, n=8)


@asset('furniture2')
def patio_tables():
    fab, wh, steel = LB('paint', 'fabric', '#c5362c'), P('#eeeae0'), MT('#c9cdd0')
    a = Asset('patio_table_umbrella')
    _patio_table(a)
    # closed: pleated bundle hanging from the hub
    n = 8
    def star(r_out, r_in, z, tw=0.0):
        return [((r_out if i % 2 == 0 else r_in) * math.cos(math.tau * i / (2 * n) + tw),
                 (r_out if i % 2 == 0 else r_in) * math.sin(math.tau * i / (2 * n) + tw), z) for i in range(2 * n)]
    a.loft(fab, [star(0.05, 0.03, 1.1), star(0.1, 0.045, 1.2, 0.1), star(0.115, 0.05, 1.7, 0.25), star(0.07, 0.04, 2.15, 0.35), star(0.03, 0.025, 2.27, 0.4)])
    a.lathe(wh, [(0.085, 1.44), (0.1, 1.46), (0.1, 1.5), (0.085, 1.52)], 8, caps=False)
    a.lathe(steel, [(0, 2.27), (0.035, 2.27), (0.035, 2.3), (0.015, 2.33), (0, 2.34)], 8)
    a.extras['tints'] = {'fabric': ['#c5362c', '#2a559b', '#2f6a49', '#e3b62e']}
    b = Asset('patio_table_umbrella_open')
    _patio_table(b)
    R, ze, zt, drop = 1.25, 2.0, 2.3, 0.11
    rim = [(R * math.cos(math.tau * i / n), R * math.sin(math.tau * i / n)) for i in range(n)]
    for i in range(n):
        (x0, y0), (x1, y1) = rim[i], rim[(i + 1) % n]
        m = fab if i % 2 == 0 else wh
        top = (0, 0, zt)
        b.mesh(m, [top, (x0, y0, ze), (x1, y1, ze), (x0, y0, ze - drop), (x1, y1, ze - drop)], [[0, 1, 2], [1, 3, 4, 2]], closed=False)
        ins = P('#9c2a23') if i % 2 == 0 else P('#cbc7bc')
        b.mesh(ins, [(0, 0, zt - 0.012), (x0 * 0.995, y0 * 0.995, ze - 0.01), (x1 * 0.995, y1 * 0.995, ze - 0.01),
                     (x0 * 0.995, y0 * 0.995, ze - drop), (x1 * 0.995, y1 * 0.995, ze - drop)], [[0, 2, 1], [1, 2, 4, 3]], closed=False)
        b.tube(steel, [(0.04 * x0, 0.04 * y0, zt - 0.03), (x0 * 0.99, y0 * 0.99, ze - 0.02)], 0.008, 4, caps=False)
        b.tube(steel, [(0.05 * x0, 0.05 * y0, 1.75), (x0 * 0.5, y0 * 0.5, zt - 0.03 - 0.5 * (zt - ze) - 0.012)], 0.007, 4, caps=False)
    b.cz(steel, 0.04, 1.72, 1.78, n=8)
    b.lathe(steel, [(0, zt - 0.01), (0.05, zt - 0.01), (0.05, zt + 0.02), (0.02, zt + 0.06), (0, zt + 0.07)], 8)
    b.extras['tints'] = a.extras['tints']
    return [a, b]


@asset('furniture2')
def patio_chair():
    a = Asset('patio_chair')
    wh, strap, strap2 = MT('#c9cdd0'), P('#2f8f6a'), P('#e9e6dc')
    for s in a.mx():
        x = 0.26
        # one bent tube: front leg, seat rail, back upright; second: rear leg + armrest
        a.tube(wh, fillet([(x, -0.26, 0), (x, -0.24, 0.42), (x, 0.2, 0.4), (x, 0.32, 0.88)], 0.05, 2), 0.012, 6)
        a.tube(wh, fillet([(x, 0.3, 0), (x, 0.16, 0.41), (x, 0.18, 0.62), (x, -0.25, 0.62), (x, -0.25, 0.42)], 0.04, 2), 0.012, 6)
        a.box(P('#d9d5c8'), 0.045, 0.3, 0.02, (x, -0.06, 0.635), 0.006, 'y')
    a.tube(wh, [(-0.26, -0.24, 0.42), (0.26, -0.24, 0.42)], 0.012, 6)
    a.tube(wh, [(-0.26, 0.2, 0.4), (0.26, 0.2, 0.4)], 0.012, 6)
    a.tube(wh, [(-0.26, 0.32, 0.88), (0.26, 0.32, 0.88)], 0.012, 6)
    a.tube(wh, [(-0.26, -0.255, 0.12), (0.26, -0.255, 0.12)], 0.01, 6)
    for i in range(6):
        y = -0.2 + i * 0.07
        a.box(strap if i % 2 == 0 else strap2, 0.54, 0.055, 0.008, (0, y, 0.425 - 0.02 * (i / 5) - 0.012 * math.sin(math.pi * i / 5)))
    with a.at((0, 0.2, 0.4), (-14, 0, 0)):
        for i in range(5):
            a.box(strap if i % 2 == 0 else strap2, 0.54, 0.008, 0.06, (0, -0.014, 0.12 + i * 0.075))
    return a


# ------------------------------------------------------------------ bikes
def _spoked(a, c, R, tr, rim_c='#b9bec2', n=14, spokes=4, tyre_c='#1d1d1f', wall=None):
    """Bicycle wheel in the local XZ plane (axle along Y)."""
    a.torus(RB(tyre_c), R - tr, tr, c, (90, 0, 0), n, 5)
    if wall:
        a.lathe(P(wall), [(R - tr * 1.75, -tr * 0.72), (R - tr * 0.9, -tr * 1.02)], n, c, (90, 0, 0), caps=False)
        a.lathe(P(wall), [(R - tr * 0.9, tr * 1.02), (R - tr * 1.75, tr * 0.72)], n, c, (90, 0, 0), caps=False)
    a.lathe(MT(rim_c), [(R - 2 * tr - 0.012, -0.011), (R - 2 * tr + 0.004, -0.011), (R - 2 * tr + 0.004, 0.011), (R - 2 * tr - 0.012, 0.011)],
            n, c, (90, 0, 0), loop=True)
    a.cyl(MT('#8f979c'), 0.022, (c[0], c[1] - 0.04, c[2]), (c[0], c[1] + 0.04, c[2]), 6)
    rr = R - 2 * tr - 0.006
    for i in range(spokes):
        ang = math.pi * (i + 0.25) / spokes
        dx, dz = rr * math.cos(ang), rr * math.sin(ang)
        for sy in (-1, 1):
            wire(a, MT('#c9cdd0'), (c[0] - dx, c[1] + sy * 0.004, c[2] - dz), (c[0], c[1] + sy * 0.03, c[2]), 0.0035)
            wire(a, MT('#c9cdd0'), (c[0], c[1] + sy * 0.03, c[2]), (c[0] + dx, c[1] + sy * 0.004, c[2] + dz), 0.0035)


def _drive(a, bb, rear, ring_r, crank=0.16, pedal='#1d1d1f'):
    steel, dk = MT('#c9cdd0'), RB(pedal)
    a.cyl(steel, 0.024, (bb[0], -0.05, bb[2]), (bb[0], 0.05, bb[2]), 8)
    a.cyl(steel, ring_r, (bb[0], -0.05, bb[2]), (bb[0], -0.056, bb[2]), 12)
    a.cyl(steel, 0.04, (rear[0], -0.036, rear[2]), (rear[0], -0.044, rear[2]), 8)
    for dz in (ring_r - 0.004, -ring_r + 0.004):
        k = 0.04 / ring_r
        wire(a, MT('#55595c'), (bb[0], -0.05, bb[2] + dz), (rear[0], -0.04, rear[2] + dz * k), 0.005)
    for sgn, sy in ((1, -1), (-1, 1)):
        ex, ez = bb[0] + sgn * crank * 0.7, bb[2] - sgn * crank * 0.7
        a.bar(steel, [(bb[0], sy * 0.062, bb[2]), (ex, sy * 0.066, ez)], 0.012, 0.022, up=(0, 1, 0))
        a.box(dk, 0.085, 0.075, 0.02, (ex, sy * 0.11, ez), 0.005, 'y')


def _bike(a, col, R, tr, wb, seat_h, bar_h, bmx=False):
    fr, steel, dk = G(col), MT('#c9cdd0'), RB()
    rear, front = (-wb / 2, 0, R), (wb / 2, 0, R)
    bb = (-wb * 0.09, 0, R * (0.92 if bmx else 0.82))
    seat = (-wb * 0.24, 0, seat_h - 0.13)
    ht_top = (wb * 0.3, 0, bar_h - (0.26 if bmx else 0.1))
    ht_bot = (wb * 0.335, 0, ht_top[2] - (0.1 if bmx else 0.14))
    _spoked(a, rear, R, tr, wall='#d9c9a0' if not bmx else None, spokes=3 if bmx else 4)
    _spoked(a, front, R, tr, wall='#d9c9a0' if not bmx else None, spokes=3 if bmx else 4)
    t = 0.017 if bmx else 0.014
    a.tube(fr, [bb, seat], t, 6)
    a.tube(fr, [seat, ht_top], t, 6)
    a.tube(fr, [bb, ht_bot], t * 1.15, 6)
    a.tube(fr, [ht_bot, (ht_top[0] - 0.012, 0, ht_top[2] + 0.03)], t * 1.3, 6)
    for s in a.mx(1):
        a.tube(fr, [(seat[0], 0.012, seat[2] - 0.02), (rear[0], 0.05, rear[2])], 0.008, 5)
        a.tube(fr, [(bb[0], 0.02, bb[2]), (rear[0], 0.05, rear[2])], 0.009, 5)
        a.tube(fr, fillet([(ht_bot[0], 0.02, ht_bot[2]), (ht_bot[0] + 0.03, 0.045, ht_bot[2] - 0.06), (front[0], 0.045, front[2])], 0.1, 2), 0.01, 5)
    # seat post and saddle
    sp = (seat[0] - 0.035, 0, seat_h - 0.03)
    a.tube(steel, [seat, sp], 0.011, 6)
    a.box(RB('#2a211c') if not bmx else RB(), 0.25, 0.14, 0.04, (sp[0] - 0.02, 0, seat_h), 0.014, 'xyB')
    a.prism(RB('#2a211c') if not bmx else RB(), [(sp[0] + 0.09, -0.045), (sp[0] + 0.19, -0.018), (sp[0] + 0.19, 0.018), (sp[0] + 0.09, 0.045)],
            seat_h - 0.018, seat_h + 0.02, 'xy')
    # stem and bars
    st = (ht_top[0] - 0.03, 0, ht_top[2] + 0.1)
    a.tube(steel, [(ht_top[0] - 0.012, 0, ht_top[2] + 0.02), st, (st[0] + 0.07, 0, st[2] + 0.01)], 0.011, 6)
    bx_ = st[0] + 0.07
    if bmx:
        for s in a.mx(1):
            a.tube(steel, fillet([(bx_, 0, st[2] + 0.01), (bx_, 0.1, st[2] + 0.01), (bx_ - 0.02, 0.2, bar_h), (bx_ - 0.05, 0.33, bar_h)], 0.04, 2), 0.011, 6)
            a.cyl(dk, 0.016, (bx_ - 0.05, 0.22, bar_h), (bx_ - 0.05, 0.34, bar_h), 6)
        a.cyl(P('#e3b62e'), 0.026, (bx_ - 0.012, -0.15, bar_h - 0.07), (bx_ - 0.012, 0.15, bar_h - 0.07), 8, bev=0.006)
        a.tube(steel, [(bx_ - 0.012, -0.17, bar_h - 0.07), (bx_ - 0.012, 0.17, bar_h - 0.07)], 0.008, 5)
        a.cyl(P('#e3b62e'), 0.024, (seat[0] + 0.06, 0, seat[2] + 0.004), (ht_top[0] - 0.07, 0, ht_top[2] + 0.004), 8, bev=0.006)
        # number plate, pegs
        a.box(P('#e9e6dc'), 0.012, 0.2, 0.17, (bx_ + 0.03, 0, bar_h - 0.16), 0.02, 'x', rot=(0, -12, 0))
        a.box(P(BLACK), 0.004, 0.09, 0.09, (bx_ + 0.04, 0, bar_h - 0.16), rot=(0, -12, 0))
        for s in a.mx(1):
            a.cyl(steel, 0.016, (rear[0], 0.05, rear[2]), (rear[0], 0.13, rear[2]), 6)
    else:
        for s in a.mx(1):
            a.tube(steel, fillet([(bx_, 0, st[2] + 0.01), (bx_, 0.19, st[2] + 0.01), (bx_ + 0.06, 0.21, st[2] - 0.02), (bx_ + 0.07, 0.21, st[2] - 0.1),
                                  (bx_ - 0.02, 0.21, st[2] - 0.14)], 0.035, 2), 0.01, 6)
            a.cyl(P(BLACK), 0.013, (bx_ + 0.07, 0.21, st[2] - 0.06), (bx_ + 0.02, 0.21, st[2] - 0.135), 6)
        # mudguards, rack, reflector, kickstand
        for c, a0, a1 in ((rear, 20, 150), (front, 60, 150)):
            pts = arc(c, R + 0.02, a0, a1, 6)
            a.bar(fr, pts, 0.045, 0.006, up=(0, 1, 0))
        a.bar(steel, [(seat[0] - 0.03, 0, R * 2 + 0.06), (rear[0] - 0.2, 0, R * 2 + 0.06)], 0.11, 0.01)
        for s in a.mx(1):
            wire(a, steel, (rear[0] - 0.15, 0.05, R * 2 + 0.055), (rear[0], 0.05, rear[2]), 0.005)
        a.box(G('#d8231d'), 0.012, 0.06, 0.035, (rear[0] - 0.2, 0, R * 2 + 0.035))
        a.tube(steel, [(bb[0] - 0.06, 0.03, bb[2] - 0.02), (bb[0] - 0.12, 0.2, 0.01)], 0.007, 5)
        a.cyl(P('#e9e6dc'), 0.035, (bx_ + 0.04, 0, st[2] - 0.05), (bx_ + 0.075, 0, st[2] - 0.05), 8, r2=0.045)
    _drive(a, bb, rear, 0.085 if not bmx else 0.07, 0.165 if not bmx else 0.15)


@asset('furniture2')
def bikes():
    a = Asset('bicycle')
    with a.at(rot=(0, 0, -90)):
        _bike(a, '#2f6a8f', 0.335, 0.016, 1.02, 0.92, 0.98)
    b = Asset('bmx_bike')
    with b.at(rot=(0, 0, -90)):
        _bike(b, '#c5262b', 0.255, 0.024, 0.9, 0.7, 0.95, bmx=True)
    return [a, b]


@asset('furniture2')
def bike_rack():
    a = Asset('bike_rack')
    st = MT('#9aa0a4')
    for i in range(5):
        x = (i - 2) * 0.42
        a.tube(st, fillet([(x - 0.14, 0, 0.03), (x - 0.14, 0, 0.82), (x + 0.14, 0, 0.82), (x + 0.14, 0, 0.03)], 0.13, 3), 0.024, 6)
    a.box(st, 2.1, 0.07, 0.03, (0, 0, 0.015), 0.008, 'x')
    for x in (-0.95, 0, 0.95):
        a.box(st, 0.09, 0.5, 0.02, (x, 0, 0.01), 0.006, 'y')
        a.bolts(MT('#6f7579'), [(x, sy * 0.2, 0.02) for sy in (-1, 1)], 0.014, 0.01, (0, 0, 1))
    return a


# ------------------------------------------------------------------ carts
@asset('furniture2')
def shopping_cart():
    a = Asset('shopping_cart')
    st, w_, red = MT('#b9bec2'), MT('#a9afb3'), P('#c5262b')
    yr, yf, wr, wf, zt, zbr, zbf = 0.4, -0.5, 0.56, 0.42, 1.0, 0.5, 0.58

    def pt(sx, fy, fz):
        zb = lerp(zbr, zbf, fy)
        return (sx * lerp(wr, wf, fy) / 2, lerp(yr, yf, fy), lerp(zb, zt, fz))
    # basket rim and bottom edge tubes
    a.tube(st, [pt(-1, 0, 1), pt(-1, 1, 1), pt(1, 1, 1), pt(1, 0, 1)], 0.011, 5)
    a.tube(st, [pt(-1, 0, 0), pt(-1, 1, 0), pt(1, 1, 0), pt(1, 0, 0)], 0.009, 5, closed=True)
    for sx in (-1, 1):
        a.tube(st, [pt(sx, 1, 0), pt(sx, 1, 1)], 0.008, 5)
        for i in range(1, 5):
            wire(a, w_, pt(sx, 0, i / 5), pt(sx, 1, i / 5))
        for i in range(1, 9):
            wire(a, w_, pt(sx, i / 9, 0), pt(sx, i / 9, 1))
    for i in range(1, 5):
        wire(a, w_, pt(-1, 1, i / 5), pt(1, 1, i / 5))
        wire(a, w_, pt(-1, 0, i / 5), pt(1, 0, i / 5))
    for i in range(1, 6):
        f = i / 6 * 2 - 1
        wire(a, w_, pt(f, 1, 0), pt(f, 1, 1))
        wire(a, w_, pt(f, 0, 0), pt(f, 0, 1))
        wire(a, w_, pt(f, 0, 0), pt(f, 1, 0))
    for i in range(1, 6):
        wire(a, w_, pt(-1, i / 6, 0), pt(1, i / 6, 0))
    # child seat flap, handle
    a.box(red, 0.5, 0.012, 0.16, (0, yr - 0.1, 0.8), rot=(-25, 0, 0))
    for sx in (-1, 1):
        a.tube(st, fillet([pt(sx, 0, 1), (sx * 0.28, yr + 0.02, 1.0), (sx * 0.28, yr + 0.12, 1.04)], 0.03, 2), 0.011, 5)
    a.cyl(red, 0.018, (-0.27, yr + 0.12, 1.04), (0.27, yr + 0.12, 1.04), 8, bev=0.004)
    # chassis
    for sx in (-1, 1):
        a.tube(st, fillet([(sx * 0.27, yr + 0.02, 0.98), (sx * 0.27, yr + 0.03, 0.2), (sx * 0.2, yf + 0.06, 0.16)], 0.06, 2), 0.013, 5)
        a.tube(st, [(sx * 0.27, yr - 0.06, 0.5), (sx * 0.27, yr + 0.028, 0.34)], 0.009, 5)
        for y, x in ((yr + 0.0, 0.27), (yf + 0.1, 0.2)):
            a.box(st, 0.03, 0.04, 0.07, (sx * x, y, 0.135))
            a.wheel(0.055, 0.03, (sx * x, y + 0.02, 0.055), n=10, hub=P('#c9cdd0'))
    a.tube(st, [(-0.2, yf + 0.06, 0.16), (0.2, yf + 0.06, 0.16)], 0.013, 5)
    for i in range(1, 5):
        f = i / 5
        wire(a, w_, (-lerp(0.27, 0.2, f), lerp(yr + 0.03, yf + 0.06, f), lerp(0.2, 0.16, f)), (lerp(0.27, 0.2, f), lerp(yr + 0.03, yf + 0.06, f), lerp(0.2, 0.16, f)))
    a.plate(red, 0.2, 0.07, (0, yf - 0.012, 0.86))
    return a


@asset('furniture2')
def hand_truck():
    a = Asset('hand_truck')
    red, st = P('#b8281f'), MT('#8f979c')
    with a.at(rot=(-6, 0, 0)):
        a.tube(red, fillet([(-0.17, 0, 0.03), (-0.17, 0, 1.2), (-0.1, 0.06, 1.3), (0.1, 0.06, 1.3), (0.17, 0, 1.2), (0.17, 0, 0.03)], 0.06, 2), 0.015, 6)
        for z in (0.3, 0.62, 0.94):
            a.bar(red, [(-0.17, 0, z), (0.17, 0, z)], 0.04, 0.012, up=(0, 1, 0))
        a.bar(red, [(0, 0, 0.3), (0, 0, 0.94)], 0.035, 0.01, up=(0, 1, 0))
        a.box(st, 0.4, 0.22, 0.012, (0, -0.11, 0.022), 0.02, 'z')
        a.box(st, 0.4, 0.012, 0.07, (0, 0, 0.05))
        for s in a.mx():
            a.prism(red, [(0, 0.03), (0.13, 0.11), (0.13, 0.15), (0, 0.24)], 0.16, 0.172, 'yz')
        a.cyl(st, 0.012, (-0.24, 0.12, 0.125), (0.24, 0.12, 0.125), 6)
        for sx in (-1, 1):
            a.wheel(0.125, 0.055, (sx * 0.225, 0.12, 0.125), n=12, hub=P('#c9cdd0'), hub_r=0.5)
        a.cyl(RB(), 0.02, (-0.07, 0.06, 1.3), (0.07, 0.06, 1.3), 6)
    return a


# ------------------------------------------------------------------ planters
@asset('furniture2')
def planters():
    a = Asset('planter_box')
    wood, wood2, soil = P('#7d5a3c'), P('#6c4d33'), P('#3d2f25')
    W, D, H = 1.3, 0.46, 0.46
    a.box(wood2, W - 0.06, D - 0.06, H - 0.06, (0, 0, (H - 0.06) / 2 + 0.03))
    for i in range(4):
        z = 0.085 + i * 0.1
        for sy in (-1, 1):
            a.box(wood if i % 2 == 0 else wood2, W - 0.04, 0.03, 0.092, (0, sy * (D / 2 - 0.02), z), 0.005, 'x')
        for sx in (-1, 1):
            a.box(wood if i % 2 else wood2, 0.03, D - 0.08, 0.092, (sx * (W / 2 - 0.02), 0, z), 0.005, 'y')
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(wood, 0.07, 0.07, H, (sx * (W / 2 - 0.035), sy * (D / 2 - 0.035), H / 2), 0.008, 'z')
    a.rim(wood, W + 0.04, D + 0.04, (0, 0, H), 0.07, 0.03, (90, 0, 0))
    a.box(soil, W - 0.1, D - 0.1, 0.02, (0, 0, H - 0.03))
    for i, x in enumerate((-0.42, 0.0, 0.42)):
        bush(a, (x, 0.02 * (i - 1), H - 0.04), 0.2 + 0.03 * (i == 1), i)
    flowers(a, [(-0.22, -0.12, H - 0.03), (0.2, -0.13, H - 0.03), (0.55, 0.1, H - 0.03), (-0.56, 0.11, H - 0.03), (0.02, -0.15, H - 0.03)])
    b = Asset('planter_round')
    con, con2 = P('#b3ada1'), P('#9b958a')
    b.lathe(con, [(0, 0), (0.3, 0), (0.31, 0.04), (0.33, 0.06), (0.45, 0.5), (0.47, 0.52), (0.47, 0.58), (0.45, 0.6), (0.41, 0.6), (0.4, 0.54), (0, 0.54)], 12)
    b.lathe(con2, [(0.345, 0.1), (0.36, 0.11), (0.375, 0.16), (0.365, 0.17)], 12, caps=False)
    b.lathe(soil, [(0.4, 0.55), (0, 0.55)], 12, caps=False)
    bush(b, (0, 0, 0.52), 0.3, 7)
    bush(b, (0.18, -0.14, 0.52), 0.16, 8, ('#58924a', '#3f7a3a', '#2f6230'))
    flowers(b, [(0.3 * math.cos(rad(t)), 0.3 * math.sin(rad(t)), 0.55) for t in (20, 100, 170, 250, 310)])
    return [a, b]


# ------------------------------------------------------------------ flag, bus stop
@asset('furniture2')
def flag_pole_wall():
    """Wall mounted: origin on the wall at the bracket, the wall is the plane y = 0, the pole leans out along -Y."""
    a = Asset('flag_pole_wall')
    a.ground = False
    st, wh = MT('#b9bec2'), P('#e9e6dc')
    a.box(st, 0.1, 0.012, 0.16, (0, -0.006, 0), 0.01, 'y')
    a.bolts(MT('#6f7579'), [(sx * 0.03, -0.012, sz * 0.06) for sx in (-1, 1) for sz in (-1, 1)], 0.008, 0.006)
    ang = 40.0
    c, s = math.cos(rad(ang)), math.sin(rad(ang))
    L = 1.7
    a.cyl(st, 0.024, (0, -0.01, -0.01), (0, -0.01 - 0.13 * c, -0.01 + 0.13 * s), 8)
    a.cyl(wh, 0.014, (0, -0.01, -0.01), (0, -0.01 - L * c, -0.01 + L * s), 8)
    tip = (0, -0.01 - L * c, -0.01 + L * s)
    a.sphere(MT('#d8b24a'), 0.035, (tip[0], tip[1] - 0.02 * c, tip[2] + 0.02 * s), 8, 4)
    # flag hangs from the outer part of the pole, in a soft wave, modelled both sides
    fw, fh = 1.25, 0.77
    n = 6
    cols = []
    for i in range(n + 1):
        f = i / n
        d = L - 0.06 - fw * f * 0.62                       # distance along the pole of the hoist edge point
        y, z = -0.01 - d * c, -0.01 + d * s
        x = 0.05 * math.sin(f * 5.0) * (0.3 + f)
        cols.append(((x, y, z - 0.012), (x * 1.6 + 0.02 * f, y + 0.05 * f, z - 0.012 - fh * (0.82 + 0.18 * (1 - f)))))
    u0, v0, u1, v1 = UV['flag']
    a.has_uv = True
    for i in range(n):
        (t0, b0), (t1, b1) = cols[i], cols[i + 1]
        fa, fb = 1 - i / n, 1 - (i + 1) / n          # the hoist (pole tip side) is the left edge of the print
        uv = [(lerp(u0, u1, 1 - fa), v0), (lerp(u0, u1, 1 - fb), v0), (lerp(u0, u1, 1 - fb), v1), (lerp(u0, u1, 1 - fa), v1)]
        a._emit([b0, b1, t1, t0], [[0, 1, 2, 3]], ATL(), None, False, [uv])
        a._emit([b0, b1, t1, t0], [[3, 2, 1, 0]], ATL(), None, False, [uv[::-1]])
    a.extras['mount'] = 'wall'
    return a


@asset('furniture2')
def bus_stop_sign():
    a = Asset('bus_stop_sign')
    st = MT('#9aa0a4')
    a.cz(MT('#6f7579'), 0.07, 0, 0.02, n=10)
    a.cz(st, 0.03, 0.02, 2.75, n=8)
    a.cz(st, 0.034, 2.75, 2.77, n=8)
    a.box(P('#e9e6dc'), 0.47, 0.012, 0.62, (0, -0.036, 2.38), 0.03, 'y')
    a.decal('bus', 0.45, 0.6, (0, -0.0425, 2.38))
    a.box(P('#1f4f8f'), 0.47, 0.01, 0.62, (0, -0.025, 2.38), 0.03, 'y')
    a.box(st, 0.34, 0.012, 0.44, (0, -0.036, 1.5), 0.01, 'y')
    a.decal('route_map', 0.3, 0.4, (0, -0.0425, 1.5))
    a.plate(CLR(), 0.31, 0.41, (0, -0.046, 1.5), t=0.004)
    for z in (2.15, 2.6, 1.35, 1.65):
        a.box(st, 0.08, 0.05, 0.03, (0, -0.01, z))
    return a


@asset('furniture2')
def bus_shelter():
    a = Asset('bus_shelter')
    fr, dk, wood = P('#5a3f31'), P('#3f2c22'), P(WOOD)
    W, D, H = 3.3, 1.45, 2.45
    xs, yb, yf_ = W / 2 - 0.06, D / 2 - 0.06, -D / 2 + 0.06
    for sx in (-1, 1):
        for y in (yb, yf_):
            a.box(fr, 0.08, 0.08, H - 0.12, (sx * xs, y, (H - 0.12) / 2), 0.008, 'z')
            a.box(dk, 0.14, 0.14, 0.02, (sx * xs, y, 0.01), 0.01, 'z')
    a.box(fr, 0.07, 0.07, H - 0.12, (0, yb, (H - 0.12) / 2), 0.008, 'z')
    # roof: shallow barrel vault with fascia
    prof = [(-D / 2 - 0.12, H - 0.12), (D / 2 + 0.12, H - 0.12), (D / 2 + 0.12, H - 0.02)] + \
           [((D / 2 + 0.12) * math.cos(rad(t)), H - 0.02 + 0.16 * math.sin(rad(t))) for t in (30, 60, 90, 120, 150)] + [(-D / 2 - 0.12, H - 0.02)]
    a.prism(fr, prof, -W / 2 - 0.1, W / 2 + 0.1, 'yz', 0.012)
    a.box(P('#e9e6dc'), W - 0.3, 0.012, 0.08, (0, -D / 2 - 0.122, H - 0.07))
    a.plate(LT('lamp', '#fff3c9'), 1.2, 0.16, (0, 0, H - 0.125), (90, 0, 0), t=0.012)
    # back glazing: two bays, mid rail
    for sx in (-1, 1):
        x = sx * xs / 2
        a.rim(fr, xs - 0.07, 1.9, (x, yb, 1.25), 0.045, 0.04)
        a.box(fr, xs - 0.16, 0.03, 0.04, (x, yb, 0.95))
        a.box(CLR(), xs - 0.16, 0.008, 1.81, (x, yb, 1.25))
    # glazed end wall (left) and poster case (right)
    a.rim(fr, D - 0.2, 1.9, (-xs, 0, 1.25), 0.045, 0.04, (0, 0, 90))
    a.box(CLR(), 0.008, D - 0.29, 1.81, (-xs, 0, 1.25))
    a.box(dk, 0.1, D - 0.2, 1.9, (xs, 0, 1.25), 0.012, 'xy')
    a.decal('poster', 1.0, 1.611, (xs - 0.0515, 0, 1.25), (0, 0, -90))
    a.decal('poster', 1.0, 1.611, (xs + 0.0515, 0, 1.25), (0, 0, 90))
    for sgn, rz in ((-1, -90), (1, 90)):
        a.rim(P('#c9cdd0'), 1.06, 1.67, (xs + sgn * 0.056, 0, 1.25), 0.03, 0.012, (0, 0, rz))
    # bench
    for i in range(3):
        a.box(wood if i != 1 else P(WOOD2), W - 0.5, 0.11, 0.035, (0, yb - 0.2 - i * 0.12, 0.47), 0.006, 'x')
    for x in (-1.1, 0, 1.1):
        a.box(dk, 0.05, 0.4, 0.04, (x, yb - 0.3, 0.435))
        a.box(dk, 0.05, 0.05, 0.42, (x, yb - 0.2, 0.21))
        a.bar(dk, [(x, yb - 0.02, 0.3), (x, yb - 0.45, 0.42)], 0.04, 0.04, up=(1, 0, 0))
    a.box(wood, W - 0.5, 0.03, 0.12, (0, yb - 0.06, 0.78), 0.006, 'x')
    # route map and stop flag on the front right post
    a.box(dk, 0.36, 0.02, 0.48, (xs - 0.3, yb - 0.035, 1.5))
    a.decal('route_map', 0.33, 0.44, (xs - 0.3, yb - 0.0465, 1.5))
    a.box(P('#e9e6dc'), 0.012, 0.36, 0.46, (xs + 0.0, yf_ - 0.24, H - 0.42), 0.02, 'x')
    a.decal('bus', 0.33, 0.44, (xs - 0.0065, yf_ - 0.24, H - 0.42), (0, 0, -90))
    a.decal('bus', 0.33, 0.44, (xs + 0.0065, yf_ - 0.24, H - 0.42), (0, 0, 90))
    return a

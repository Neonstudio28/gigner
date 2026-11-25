"""Suburban back yards: in-ground pools on paved patios, decks, pergola, garden beds, play sets and patio furniture."""
import math, random
import structures_kit as K
from structures_kit import Kit

G = 'backyard'
K.PAL.update({
    'by_tc1': ('paint', '#a8573f'), 'by_tc2': ('paint', '#b4654a'), 'by_tc3': ('paint', '#9a4c38'), 'by_grout': ('paint', '#7d4233'),
    'by_cope': ('paint', '#d8ccb0'), 'by_cope2': ('paint', '#c9bc9c'), 'by_tile': ('gloss', '#3f6f8a'), 'by_tile2': ('gloss', '#6f9fb4'),
    'by_water': ('gloss', '#4f9fc0'), 'by_conc': ('paint', '#c2beb3'), 'by_conc2': ('paint', '#b0aca1'), 'by_joint': ('paint', '#8f8b82'),
    'by_wood': ('paint', '#9a6a44'), 'by_wood2': ('paint', '#7d5334'), 'by_wood3': ('paint', '#b98a5c'), 'by_cedar': ('paint', '#a8623c'),
    'by_white': ('paint', '#ecebe4'), 'by_chrome': ('chrome', '#cfd3d6'), 'by_blk': ('paint', '#232427'), 'by_soil': ('paint', '#4f3a2a'),
    'by_leaf': ('paint', '#4f8f3c'), 'by_leaf2': ('paint', '#6aa648'), 'by_tom': ('paint', '#c93a2c'), 'by_red': ('paint', '#b8352c'),
    'by_blue': ('paint', '#3c6fb4'), 'by_yellow': ('paint', '#e2b53a'), 'by_green': ('paint', '#3f7a46'), 'by_canvas': ('paint', '#d9d2bc'),
    'by_sand': ('paint', '#dcc890'), 'by_stone': ('paint', '#8d877c'), 'by_stone2': ('paint', '#a39c8f'), 'by_glassg': ('gloss', '#23402c'),
    'by_gold': ('metal', '#c9a24a'), 'by_glass': ('clear', '#dfe9ec'), 'by_pizza': ('paint', '#d9a04a'), 'by_cheese': ('paint', '#e8c25a'),
    'by_pep': ('paint', '#a5362a'), 'by_paper': ('paint', '#e9e7df'), 'by_ink': ('paint', '#6f7377'), 'by_galv': ('paint', '#a3a8ab'),
    'by_acr': ('gloss', '#e6e2d6'), 'by_orange': ('paint', '#dd7a2c'), 'by_rub': ('paint', '#2a2a2c'), 'by_cush': ('paint', '#4f7f9a'),
})
TC = ('by_tc1', 'by_tc2', 'by_tc3')
DECK = 0.2          # patio height above the lawn
WATER = 0.1


def kidney(a, b, dent=0.3, n=40, grow=0.0):
    """Bean outline (CCW): an a x b ellipse with a soft dent on its +y side, pushed out by `grow`."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = (a * b) / math.hypot(b * math.cos(t), a * math.sin(t))
        d = math.atan2(math.sin(t - math.pi / 2), math.cos(t - math.pi / 2))
        r *= 1 - dent * math.exp(-(d / 0.75) ** 2)
        pts.append(((r + grow) * math.cos(t), (r + grow) * math.sin(t)))
    return pts


def rrect_n(w, h, r, n):
    """Rounded rectangle resampled to n points starting on +x (CCW), to pair point for point with a star outline."""
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s = math.cos(t), math.sin(t)
        k = min((w / 2) / abs(c) if abs(c) > 1e-6 else 1e9, (h / 2) / abs(s) if abs(s) > 1e-6 else 1e9)
        x, y = c * k, s * k
        # pull the corners in to a radius
        cx, cy = w / 2 - r, h / 2 - r
        if abs(x) > cx and abs(y) > cy:
            dx, dy = abs(x) - cx, abs(y) - cy
            m = math.hypot(dx, dy)
            x = math.copysign(cx + dx / m * r, x)
            y = math.copysign(cy + dy / m * r, y)
        out.append((x, y))
    return out


def rrect_arc(w, h, r, n):
    """Rounded rectangle as n points evenly spaced along its outline, starting on +x (CCW)."""
    dense = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(13):
            a = math.radians(a0 + 90 * i / 12)
            dense.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    dense = [(w / 2, 0.0)] + dense + [(w / 2, 0.0)]
    acc = [0.0]
    for i in range(1, len(dense)):
        acc.append(acc[-1] + math.dist(dense[i - 1], dense[i]))
    out, j = [], 0
    for i in range(n):
        d = acc[-1] * i / n
        while acc[j + 1] < d:
            j += 1
        f = (d - acc[j]) / max(1e-9, acc[j + 1] - acc[j])
        out.append((dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f))
    return out


def band(k, mat, inner, outer, z0, z1, ox=0.0, oy=0.0):
    """Flat ring between two outlines of equal point count, with both walls and the underside."""
    R = lambda pts, z: [(x + ox, y + oy, z) for x, y in pts]
    k.loft(mat, [R(outer, z0), R(outer, z1), R(inner, z1), R(inner, z0)], caps=False, closed=True)


def inside(pts, x, y):
    c = False
    n = len(pts)
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            c = not c
    return c


def pavers(k, W, L, hole, size=0.6, mats=TC, seed=1, z=DECK, ox=0.0, oy=0.0, gap=0.03):
    """Square pavers over a W x L slab, left out wherever one would touch the `hole` outline."""
    rnd = random.Random(seed)
    nx, ny = int(W / size), int(L / size)
    sx, sy = W / nx, L / ny
    for i in range(nx):
        for j in range(ny):
            x, y = -W / 2 + (i + 0.5) * sx, -L / 2 + (j + 0.5) * sy
            if hole and any(inside(hole, x + dx * sx / 2, y + dy * sy / 2) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                continue
            k.box(rnd.choice(mats), x + ox, y + oy, z - 0.004, sx - gap, sy - gap, 0.016 + rnd.random() * 0.006)


def pool_shell(k, shape, ox=0.0, oy=0.0, cope=0.42, mat='by_cope'):
    """Water, the blue waterline tile band and a chamfered coping round `shape` (a function of grow -> outline)."""
    edge = shape(0.0)
    k.prism('by_water', [(x + ox, y + oy) for x, y in edge], WATER - 0.04, WATER)
    # two courses of waterline tile, the lower one darker, then the pool wall below the surface
    band(k, 'by_tile', edge, shape(0.03), WATER - 0.02, DECK - 0.045, ox, oy)
    band(k, 'by_tile2', shape(-0.012), shape(0.03), DECK - 0.075, DECK - 0.03, ox, oy)
    # coping: bull-nosed stones, cut every other one a shade darker
    n = len(edge)
    top = DECK + 0.05
    inn, out, tin, tout = shape(-0.05), shape(cope), shape(-0.02), shape(cope - 0.03)

    def quad(I, O, i, j, z, g=0.012):
        """Stone i's corners on outlines I (inner) and O (outer), shrunk by the joint width along the run."""
        def cut(P, Q):
            d = max(1e-6, math.dist(P, Q))
            return (P[0] + (Q[0] - P[0]) * g / d + ox, P[1] + (Q[1] - P[1]) * g / d + oy, z)
        return [cut(I[i], I[j]), cut(I[j], I[i]), cut(O[j], O[i]), cut(O[i], O[j])]
    for i in range(n):
        j = (i + 1) % n
        k.loft(mat if i % 2 else mat + '2', [quad(inn, out, i, j, DECK - 0.03), quad(inn, out, i, j, top - 0.02), quad(tin, tout, i, j, top)])
    return edge


def ladder(k, x, y, rz):
    """Chrome grab rails curving over the coping, with three treads under the water."""
    c, s = math.cos(math.radians(rz)), math.sin(math.radians(rz))
    P = lambda u, v, z: (x + u * c - v * s, y + u * s + v * c, z)
    for u in (-0.26, 0.26):
        k.tube('by_chrome', [P(u, 0.5, DECK), P(u, 0.5, DECK + 0.75), P(u, 0.3, DECK + 0.9), P(u, -0.05, DECK + 0.9), P(u, -0.22, DECK + 0.72), P(u, -0.22, WATER - 0.02)], 0.022, 6)
        k.cyl('by_chrome', *P(u, 0.5, DECK + 0.045), 0.05, 0.02, 8)
    k.beam('by_white', P(-0.26, -0.22, WATER + 0.06), P(0.26, -0.22, WATER + 0.06), 0.07, 0.03)


def slab(k, W, L, r, shape_out, n, ox=0.0, oy=0.0, mat='by_grout', skirt=0.35, rect=rrect_n):
    """The patio slab round a pool: from the coping out to a rounded rectangle, standing on a skirt sunk in the lawn."""
    band(k, mat, shape_out, rect(W, L, r, n), -skirt, DECK, 0, 0)


def yard_pool_kidney():
    """Kidney pool set in a terracotta paver patio, like the reference back yard: 10.4 x 7.6 m."""
    k = Kit('yard_pool_kidney')
    N = 44
    shape = lambda g: kidney(3.7, 2.35, 0.32, N, g)
    W, L = 10.4, 7.6
    slab(k, W, L, 0.25, shape(0.40), N)
    pool_shell(k, shape)
    pavers(k, W - 0.1, L - 0.1, shape(0.5), 0.62, seed=3)
    ladder(k, -3.55, -0.5, -70)
    # a sunken step you can see through the water at the shallow end
    k.prism('by_tile2', [(x * 0.34 + 2.35, y * 0.5 - 0.35) for x, y in kidney(3.7, 2.35, 0.1, 16)], WATER - 0.035, WATER + 0.004)
    return k.done(G, height=1.2, pool=[0, 0, 3.9, 2.5])


def yard_pool_rect():
    """Lap pool with rounded corners in a brushed-concrete deck, diving board at the deep end: 11.4 x 6.6 m."""
    k = Kit('yard_pool_rect')
    N = 56
    shape = lambda g: rrect_arc(8.2 + 2 * g, 3.9 + 2 * g, 0.8 + g, N)
    W, L = 11.4, 6.6
    slab(k, W, L, 0.15, shape(0.40), N, mat='by_conc', rect=rrect_arc)
    pool_shell(k, shape, mat='by_conc')
    # expansion joints saw-cut across the deck
    for i in range(-4, 5):
        x = i * 1.27
        for sy in (-1, 1):
            k.ext('by_joint', x - 0.012, x + 0.012, sy * 2.42, sy * (L / 2 - 0.02), DECK - 0.01, DECK + 0.003)
    for sx in (-1, 1):
        k.ext('by_joint', sx * 4.56, sx * (W / 2 - 0.02), -0.012, 0.012, DECK - 0.01, DECK + 0.003)
    # lane line tiles on the floor and a rope of floats at the shallow break
    for y in (-0.9, 0.9):
        k.ext('by_tile', -3.4, 3.4, y - 0.09, y + 0.09, WATER - 0.03, WATER + 0.003)
    for i in range(9):
        k.cyl('by_white' if i % 2 else 'by_blue', 1.6, -1.7 + i * 0.425, WATER + 0.03, 0.07, 0.2, 8, axis='Y')
    ladder(k, 1.0, 2.0, 180)
    # diving board on a steel stand
    k.box('by_conc2', -5.0, 0, DECK, 0.7, 0.8, 0.06)
    for y in (-0.2, 0.2):
        k.tube('by_chrome', [(-5.25, y, DECK + 0.06), (-5.25, y, DECK + 0.5), (-4.6, y, DECK + 0.5), (-4.6, y, DECK + 0.06)], 0.025, 6)
    k.beam('by_acr', (-5.45, 0, DECK + 0.55), (-3.3, 0, DECK + 0.6), 0.46, 0.06, 0.015)
    k.beam('by_blue', (-4.4, 0, DECK + 0.585), (-3.32, 0, DECK + 0.61), 0.4, 0.05)
    return k.done(G, height=1.2, pool=[0, 0, 4.3, 2.2])


def yard_patio():
    """Terracotta paver patio off the back door: 5.4 x 4.2 m."""
    k = Kit('yard_patio')
    W, L = 5.4, 4.2
    k.ext('by_grout', -W / 2, W / 2, -L / 2, L / 2, -0.3, 0.07)
    pavers(k, W - 0.06, L - 0.06, None, 0.6, seed=7, z=0.07)
    return k.done(G, height=0.1)


def yard_patio_conc():
    """Poured concrete patio in four saw-cut bays, a little stained: 5 x 4 m."""
    k = Kit('yard_patio_conc')
    W, L = 5.0, 4.0
    k.ext('by_conc', -W / 2, W / 2, -L / 2, L / 2, -0.3, 0.07, 0.01)
    k.ext('by_joint', -0.012, 0.012, -L / 2 + 0.02, L / 2 - 0.02, 0.06, 0.073)
    k.ext('by_joint', -W / 2 + 0.02, W / 2 - 0.02, -0.012, 0.012, 0.06, 0.073)
    k.cyl('by_conc2', 1.1, -0.8, 0.068, 0.55, 0.004, 10)
    k.cyl('by_conc2', -1.4, 0.9, 0.068, 0.35, 0.004, 8)
    return k.done(G, height=0.1)


def yard_deck():
    """Raised cedar deck with a railing on three sides and steps down to the lawn: 5 x 3.6 m, 0.55 m high.
    The open side (+y) goes against the house."""
    k = Kit('yard_deck')
    W, L, H = 5.0, 3.6, 0.55
    for x in (-W / 2 + 0.1, 0, W / 2 - 0.1):
        for y in (-L / 2 + 0.1, L / 2 - 0.1):
            k.box('by_wood2', x, y, -0.3, 0.12, 0.12, H + 0.26)
    k.ext('by_wood2', -W / 2, W / 2, -L / 2, -L / 2 + 0.05, H - 0.2, H - 0.03)
    for sx in (-1, 1):
        k.ext('by_wood2', sx * W / 2, sx * (W / 2 - 0.05), -L / 2, L / 2, H - 0.2, H - 0.03)
    # lattice skirt under the front edge
    for i in range(16):
        x = -W / 2 + 0.2 + i * (W - 0.4) / 15
        k.beam('by_wood3', (x - 0.14, -L / 2 + 0.02, 0.0), (x + 0.14, -L / 2 + 0.02, H - 0.2), 0.03, 0.012)
        k.beam('by_wood3', (x + 0.14, -L / 2 + 0.03, 0.0), (x - 0.14, -L / 2 + 0.03, H - 0.2), 0.03, 0.012)
    k.planks('by_cedar', -W / 2 - 0.04, W / 2 + 0.04, -L / 2 - 0.04, L / 2, H - 0.03, 0.035, 24, 0.012, 'X', 0.004, 'by_wood', 4)
    # railing: posts, top and bottom rails, square balusters; a gap for the steps
    gap = (0.6, 2.0)
    T = H + 0.005
    def rail(p0, p1, n):
        k.beam('by_wood2', (p0[0], p0[1], T + 0.95), (p1[0], p1[1], T + 0.95), 0.11, 0.04, 0.006)
        k.beam('by_wood2', (p0[0], p0[1], T + 0.12), (p1[0], p1[1], T + 0.12), 0.05, 0.04)
        for i in range(n + 1):
            t = i / n
            x, y = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t
            if i in (0, n):
                k.box('by_wood2', x, y, T, 0.1, 0.1, 1.02, 0.008)
            else:
                k.box('by_wood3', x, y, T + 0.12, 0.035, 0.035, 0.83)
    rail((-W / 2 + 0.05, L / 2 - 0.05), (-W / 2 + 0.05, -L / 2 + 0.05), 24)
    rail((W / 2 - 0.05, -L / 2 + 0.05), (W / 2 - 0.05, L / 2 - 0.05), 24)
    rail((-W / 2 + 0.05, -L / 2 + 0.05), (gap[0], -L / 2 + 0.05), 20)
    rail((gap[1], -L / 2 + 0.05), (W / 2 - 0.05, -L / 2 + 0.05), 4)
    for i in range(3):
        z = H - 0.03 - (i + 1) * 0.175
        k.ext('by_cedar', gap[0] + 0.05, gap[1] - 0.05, -L / 2 - 0.05 - (i + 1) * 0.28, -L / 2 - 0.05 - i * 0.28, z, z + 0.04, 0.004)
        k.ext('by_wood2', gap[0] + 0.05, gap[1] - 0.05, -L / 2 - 0.05 - (i + 1) * 0.28 + 0.02, -L / 2 - 0.03 - i * 0.28, -0.2, z)
    return k.done(G, height=H + 1.05, top=H)


def pergola():
    """Timber pergola over a patio: four posts, doubled beams, notched rafters and thin purlins. 4.4 x 3.4 m."""
    k = Kit('pergola')
    W, L, H = 4.4, 3.4, 2.45
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (W / 2 - 0.3), sy * (L / 2 - 0.3)
            k.box('by_conc2', x, y, -0.1, 0.26, 0.26, 0.2, 0.02)
            k.box('by_wood', x, y, 0.1, 0.15, 0.15, H - 0.1, 0.012)
            for d in (-1, 1):       # knee braces
                k.beam('by_wood', (x, y, H - 0.55), (x - sx * 0.5, y, H - 0.03), 0.06, 0.09) if d < 0 else k.beam('by_wood', (x, y, H - 0.55), (x, y - sy * 0.5, H - 0.03), 0.06, 0.09)
        for dx in (-0.1, 0.1):
            k.beam('by_wood2', (sx * (W / 2 - 0.3) + dx, -L / 2 - 0.25, H + 0.08), (sx * (W / 2 - 0.3) + dx, L / 2 + 0.25, H + 0.08), 0.045, 0.19, 0.008)
    for i in range(9):
        y = -L / 2 + 0.05 + i * (L - 0.1) / 8
        k.beam('by_wood', (-W / 2 - 0.3, y, H + 0.25), (W / 2 + 0.3, y, H + 0.25), 0.045, 0.15, 0.008)
    for i in range(12):
        x = -W / 2 + 0.1 + i * (W - 0.2) / 11
        k.beam('by_wood3', (x, -L / 2 - 0.2, H + 0.345), (x, L / 2 + 0.2, H + 0.345), 0.04, 0.04)
    return k.done(G, height=H + 0.4)


def _picnic(k, wood='by_wood', dark='by_wood2'):
    """A-frame picnic table: 1.85 m long, top at 0.76."""
    Lh = 0.92
    k.planks(wood, -Lh, Lh, -0.38, 0.38, 0.72, 0.04, 5, 0.012, 'X', 0.005, 'by_wood3', 2)
    for sy in (-1, 1):
        k.planks(wood, -Lh, Lh, sy * 0.74 - 0.14, sy * 0.74 + 0.14, 0.42, 0.04, 2, 0.012, 'X', 0.005)
    for sx in (-1, 1):
        x = sx * 0.62
        for sy in (-1, 1):
            k.beam(dark, (x, sy * 0.72, 0.0), (x, sy * 0.2, 0.72), 0.045, 0.09)
        k.beam(dark, (x, -0.86, 0.4), (x, 0.86, 0.4), 0.045, 0.09)
        k.beam(dark, (x, -0.36, 0.7), (x, 0.36, 0.7), 0.045, 0.07)
        k.beam(dark, (x, 0, 0.42), (x - sx * 0.42, 0, 0.7), 0.04, 0.07)


def picnic_table_yard():
    k = Kit('picnic_table_yard')
    _picnic(k)
    return k.done(G, height=0.76, surface=0.76)


def picnic_table_party():
    """The reference table: sparkling wine and two flutes on a black tray, a pizza on a plate, a magazine left open."""
    k = Kit('picnic_table_party')
    _picnic(k)
    T = 0.762
    k.cyl('by_blk', -0.3, 0.05, T, 0.2, 0.012, 14)
    k.torus('by_blk', -0.3, 0.05, T + 0.014, 0.2, 0.012, 14, 4)
    k.lathe('by_glassg', [(0.0, 0), (0.042, 0), (0.042, 0.17), (0.03, 0.22), (0.014, 0.27), (0.014, 0.3)], 10, -0.36, 0.05, T + 0.012)
    k.cyl('by_gold', -0.36, 0.05, T + 0.3, 0.017, 0.045, 8)
    k.box('by_paper', -0.36, 0.008, T + 0.07, 0.05, 0.004, 0.07)
    for dx, dy in ((-0.22, 0.0), (-0.2, 0.11)):
        k.cyl('by_glass', dx, dy, T + 0.012, 0.03, 0.004, 8)
        k.cyl('by_glass', dx, dy, T + 0.014, 0.004, 0.09, 6)
        k.lathe('by_glass', [(0.004, 0), (0.022, 0.03), (0.026, 0.11), (0.022, 0.11), (0.018, 0.035), (0.0, 0.012)], 8, dx, dy, T + 0.1)
    k.cyl('by_paper', 0.22, -0.08, T, 0.17, 0.012, 16)
    k.cyl('by_pizza', 0.22, -0.08, T + 0.012, 0.145, 0.014, 16)
    k.cyl('by_cheese', 0.22, -0.08, T + 0.026, 0.125, 0.004, 16)
    rnd = random.Random(5)
    for i in range(9):
        a, r = rnd.random() * 6.28, 0.03 + rnd.random() * 0.08
        k.cyl('by_pep', 0.22 + math.cos(a) * r, -0.08 + math.sin(a) * r, T + 0.03, 0.016, 0.003, 6)
    # magazine, slightly turned
    k.box('by_paper', 0.62, -0.2, T, 0.3, 0.21, 0.012, rz=-14)
    for j, (m, w) in enumerate((('by_ink', 0.2), ('by_ink', 0.24), ('by_blue', 0.1), ('by_yellow', 0.07), ('by_ink', 0.16))):
        c, sn = math.cos(math.radians(-14)), math.sin(math.radians(-14))
        u, v = -0.02 + (0.06 if j in (2, 3) else 0) * (1 if j == 2 else -1.2), 0.07 - j * 0.032
        k.box(m, 0.62 + u * c - v * sn, -0.2 + u * sn + v * c, T + 0.012, w, 0.016 if j not in (2, 3) else 0.03, 0.002, rz=-14)
    return k.done(G, height=1.1, surface=0.76)


def sun_lounger():
    """Poolside chaise: white frame, slatted bed with a raised back and a blue cushion."""
    k = Kit('sun_lounger')
    for sx in (-1, 1):
        k.beam('by_white', (sx * 0.3, -0.95, 0.3), (sx * 0.3, 0.45, 0.3), 0.04, 0.05)
        for y in (-0.85, 0.3):
            k.box('by_white', sx * 0.3, y, 0, 0.04, 0.05, 0.3)
        k.beam('by_white', (sx * 0.3, 0.42, 0.31), (sx * 0.3, 0.95, 0.68), 0.04, 0.05)
        k.beam('by_white', (sx * 0.3, 0.8, 0.0), (sx * 0.3, 0.8, 0.56), 0.035, 0.04)
    for i in range(12):
        k.ext('by_white', -0.3, 0.3, -0.95 + i * 0.115, -0.95 + i * 0.115 + 0.085, 0.325, 0.345)
    for i in range(5):
        y = 0.47 + i * 0.105
        k.beam('by_white', (-0.3, y, 0.345 + (y - 0.42) * 0.7), (0.3, y, 0.345 + (y - 0.42) * 0.7), 0.085, 0.02, roll=35)
    k.ext('by_cush', -0.27, 0.27, -0.92, 0.4, 0.345, 0.41, 0.02)
    k.beam('by_cush', (0, 0.44, 0.4), (0, 0.93, 0.74), 0.54, 0.07, 0.02)
    k.ext('by_white', -0.2, 0.2, 0.62, 0.86, 0.6, 0.66, 0.02) if False else None
    return k.done(G, height=0.8)


def adirondack_chair():
    """Slatted cedar garden chair with wide arms and a fan back."""
    k = Kit('adirondack_chair')
    for sx in (-1, 1):
        k.beam('by_cedar', (sx * 0.27, -0.42, 0.36), (sx * 0.27, 0.42, 0.14), 0.03, 0.1)
        k.box('by_cedar', sx * 0.3, -0.36, 0, 0.035, 0.09, 0.56)
        k.ext('by_cedar', sx * 0.33 - 0.07, sx * 0.33 + 0.07, -0.44, 0.3, 0.56, 0.585, 0.006)
        k.beam('by_cedar', (sx * 0.3, 0.24, 0.0), (sx * 0.3, 0.3, 0.56), 0.035, 0.07)
    for i in range(5):
        y = -0.4 + i * 0.13
        k.beam('by_cedar', (-0.27, y, 0.41 - (y + 0.42) * 0.26), (0.27, y, 0.41 - (y + 0.42) * 0.26), 0.11, 0.022, roll=-15)
    for i in range(5):
        x = (i - 2) * 0.11
        h = 0.98 - abs(i - 2) * 0.07
        k.beam('by_cedar', (x, 0.2, 0.2), (x * 1.25, 0.5, h), 0.1, 0.022)
    k.beam('by_cedar', (-0.3, 0.36, 0.6), (0.3, 0.36, 0.6), 0.03, 0.07)
    return k.done(G, height=1.0)


def swing_set_yard():
    """Back-yard play set: green A-frame with two belt swings, a glider and a yellow slide off one end."""
    k = Kit('swing_set_yard')
    W, H = 3.0, 2.15
    k.rod('by_green', (-W / 2, 0, H), (W / 2, 0, H), 0.035, 8)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.rod('by_green', (sx * W / 2, 0, H), (sx * (W / 2 + 0.15), sy * 0.95, 0), 0.03, 8)
        k.rod('by_green', (sx * (W / 2 + 0.07), -0.45, 1.1), (sx * (W / 2 + 0.07), 0.45, 1.1), 0.02, 6)
    for x in (-0.95, -0.2):
        for dx in (-0.2, 0.2):
            k.rod('by_galv', (x + dx, 0, H - 0.03), (x + dx, 0, 0.52), 0.008, 4)
        k.box('by_rub', x, 0, 0.48, 0.46, 0.16, 0.035, 0.01)
    # glider
    for dx in (-0.25, 0.25):
        for dy in (-0.3, 0.3):
            k.rod('by_galv', (0.85 + dx, 0, H - 0.03), (0.85 + dx, dy, 0.4), 0.008, 4)
    k.ext('by_red', 0.55, 1.15, -0.34, -0.26, 0.36, 0.42)
    k.ext('by_red', 0.55, 1.15, 0.26, 0.34, 0.36, 0.42)
    k.ext('by_red', 0.82, 0.88, -0.3, 0.3, 0.3, 0.36)
    # slide
    x0 = W / 2 + 0.5
    for sy in (-1, 1):
        k.rod('by_green', (x0, sy * 0.22, 0), (x0, sy * 0.22, 1.5), 0.02, 6)
    for i in range(5):
        k.rod('by_green', (x0, -0.22, 0.25 + i * 0.26), (x0, 0.22, 0.25 + i * 0.26), 0.014, 5)
    k.beam('by_yellow', (x0 + 0.05, 0, 1.3), (x0 + 2.1, 0, 0.12), 0.44, 0.03)
    for sy in (-1, 1):
        k.beam('by_yellow', (x0 + 0.05, sy * 0.22, 1.36), (x0 + 2.1, sy * 0.22, 0.18), 0.03, 0.12)
    k.ext('by_yellow', x0 + 2.05, x0 + 2.4, -0.22, 0.22, 0.1, 0.13)
    return k.done(G, height=H + 0.1)


def _bed(k, x, y, w, l, h=0.3, mat='by_wood2'):
    k.ext(mat, x - w / 2, x + w / 2, y - l / 2, y - l / 2 + 0.04, 0, h)
    k.ext(mat, x - w / 2, x + w / 2, y + l / 2 - 0.04, y + l / 2, 0, h)
    k.ext(mat, x - w / 2, x - w / 2 + 0.04, y - l / 2, y + l / 2, 0, h)
    k.ext(mat, x + w / 2 - 0.04, x + w / 2, y - l / 2, y + l / 2, 0, h)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('by_wood', x + sx * (w / 2 - 0.02), y + sy * (l / 2 - 0.02), 0, 0.08, 0.08, h + 0.04)
    k.ext('by_soil', x - w / 2 + 0.04, x + w / 2 - 0.04, y - l / 2 + 0.04, y + l / 2 - 0.04, 0.02, h - 0.05)


def raised_beds():
    """Kitchen garden: two timber raised beds, staked tomatoes in one and rows of greens in the other, a can and a spade."""
    k = Kit('raised_beds')
    rnd = random.Random(11)
    _bed(k, -0.85, 0, 1.2, 2.6)
    _bed(k, 0.85, 0, 1.2, 2.6)
    for i in range(4):
        for dx in (-0.28, 0.28):
            x, y = -0.85 + dx, -0.95 + i * 0.63
            k.box('by_wood3', x, y, 0.25, 0.025, 0.025, 1.15)
            for j in range(4):
                z = 0.36 + j * 0.24
                k.cbox('by_leaf' if j % 2 else 'by_leaf2', x + rnd.uniform(-0.06, 0.06), y + rnd.uniform(-0.06, 0.06), z, 0.3 - j * 0.04, 0.3 - j * 0.04, 0.2, 0.05, rz=rnd.uniform(0, 90))
                if rnd.random() < 0.7:
                    k.cbox('by_tom', x + rnd.choice((-0.14, 0.14)), y + rnd.uniform(-0.1, 0.1), z - 0.04, 0.07, 0.07, 0.07, 0.02)
    for r in range(3):
        for i in range(8):
            x, y = 0.85 + (r - 1) * 0.33, -1.1 + i * 0.31
            s0 = rnd.uniform(0.16, 0.24)
            k.cbox(('by_leaf2', 'by_leaf', 'by_green')[r], x, y, 0.25 + s0 / 2, s0, s0, s0 * 0.8, 0.05, rz=rnd.uniform(0, 90))
    # watering can and a spade stuck in the soil
    k.cyl('by_galv', 0.0, -1.0, 0, 0.11, 0.24, 10)
    k.rod('by_galv', (0.08, -1.0, 0.12), (0.3, -1.0, 0.27), 0.018, 6)
    k.torus('by_galv', -0.02, -1.0, 0.25, 0.09, 0.012, 10, 4, axis='Y')
    k.rod('by_wood3', (0.02, 1.05, 0.1), (0.06, 1.05, 0.95), 0.016, 6)
    k.box('by_galv', 0.016, 1.05, -0.08, 0.16, 0.012, 0.24)
    return k.done(G, height=1.4)


def hot_tub():
    """Cedar-skirted spa: 2.1 m square with an acrylic lip, bubbling water, steps and a folded cover."""
    k = Kit('hot_tub')
    S, H = 2.1, 0.86
    k.planks('by_cedar', -S / 2, S / 2, -S / 2, S / 2, 0, 0.001, 1) if False else None
    for i in range(14):
        x = -S / 2 + (i + 0.5) * S / 14
        for sy in (-1, 1):
            k.ext('by_cedar' if i % 3 else 'by_wood', x - S / 28 + 0.004, x + S / 28 - 0.004, sy * S / 2 - 0.02, sy * S / 2 + 0.02, 0.04, H - 0.06)
            k.ext('by_cedar' if i % 3 else 'by_wood', sy * S / 2 - 0.02, sy * S / 2 + 0.02, x - S / 28 + 0.004, x + S / 28 - 0.004, 0.04, H - 0.06)
    k.ext('by_blk', -S / 2 - 0.01, S / 2 + 0.01, -S / 2 - 0.01, S / 2 + 0.01, 0, 0.05)
    N = 28
    band(k, 'by_acr', K.rrect(S - 0.5, S - 0.5, 0.35, 6), K.rrect(S + 0.06, S + 0.06, 0.12, 6), H - 0.07, H)
    k.prism('by_water', K.rrect(S - 0.48, S - 0.48, 0.35, 6), H - 0.16, H - 0.1)
    rnd = random.Random(3)
    for i in range(14):
        k.cyl('by_white', rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), H - 0.1, rnd.uniform(0.03, 0.07), 0.006, 6)
    k.ext('by_blk', -0.25, 0.25, -S / 2 - 0.03, -S / 2 - 0.021, 0.5, 0.62)
    for i in range(2):
        k.ext('by_cedar', -0.45, 0.45, -S / 2 - 0.35 - i * 0.3, -S / 2 - 0.05 - i * 0.3, 0, 0.42 - i * 0.21, 0.01)
    # cover folded back on its lifter
    k.box('by_cush', 0, S / 2 + 0.16, 0.25, S, 0.2, 1.0, 0.03, rx=-6)
    for sx in (-1, 1):
        k.rod('by_blk', (sx * (S / 2 + 0.04), 0.3, H - 0.3), (sx * (S / 2 + 0.04), S / 2 + 0.16, 1.2), 0.016, 6)
    return k.done(G, height=1.3)


def pool_toys():
    """What floats in the pool and lies beside it: a ring, a beach ball, a lilo, a skimmer net and a towel."""
    k = Kit('pool_toys')
    k.torus('by_orange', -0.9, 0.2, 0.09, 0.36, 0.11, 14, 6)
    k.sphere('by_white', 0.2, 0.9, 0.2, 0.2, 10, 6)
    for i, m in enumerate(('by_red', 'by_yellow', 'by_blue')):
        k.lathe(m, [(0.202 * math.sin(math.pi * j / 6), -0.202 * math.cos(math.pi * j / 6)) for j in range(7)], 3, 0.2, 0.9, 0.2, a0=i * 120, arc=60)
    for i in range(6):
        k.cyl('by_yellow' if i % 2 else 'by_white', 0.5 + i * 0.13, -0.6, 0.075, 0.075, 1.7, 8, 0.02, axis='Y')
    k.ext('by_blue', -1.7, -1.0, -1.2, 0.5, 0.0, 0.025, 0.008)
    for y in (-0.9, -0.3, 0.3):
        k.ext('by_white', -1.7, -1.0, y - 0.06, y + 0.06, 0.02, 0.028)
    return k.done(G, height=0.4)


def build():
    for f in ALL:
        f()


ALL = (yard_pool_kidney, yard_pool_rect, yard_patio, yard_patio_conc, yard_deck, pergola, picnic_table_yard, picnic_table_party, sun_lounger, adirondack_chair, swing_set_yard, raised_beds, hot_tub, pool_toys)
SHEETS = [
    ('backyard_decks', ['yard_patio', 'yard_patio_conc', 'yard_deck', 'pergola'], 'shot', dict(elev=24, azim=-32, gap=1.0)),
    ('backyard_furn', ['picnic_table_party', 'picnic_table_yard', 'sun_lounger', 'adirondack_chair'], 'shot', dict(elev=22, azim=-32, gap=0.5)),
    ('backyard_play', ['swing_set_yard', 'raised_beds', 'hot_tub', 'pool_toys'], 'shot', dict(elev=24, azim=-32, gap=0.6)),
    ('backyard_pools', ['yard_pool_kidney', 'yard_pool_rect'], 'shot', dict(elev=34, azim=-30, gap=1.0)),
]

"""Ground cover and field crops: grass, weeds, reeds, lily pads, wheat, corn, stubble."""
import math, random
from mathutils import Matrix, Vector
from vegetation_gen import B, UP, TAU, lerp, rand_dir
from vegetation_plants import flower


def grass_blade(b, rng, base, h, w, lean, segs=2, keys=('grass', 'grass2'), spread=None):
    a = rng.uniform(0, TAU) if spread is None else spread
    d = Vector((math.cos(a), math.sin(a), 0))
    base = Vector(base)
    pts = [base + d * (lean * h * t * t) + UP * (h * t) for t in [i / segs for i in range(segs + 1)]]
    k = rng.random()
    b.blade(pts, [w] + [w * lerp(0.85, 0.5, i / segs) for i in range(1, segs)] + [0], keys[0] if k < 0.6 else keys[1], keys[0],
            ridge=0.45, cap0=False, key2=keys[1] if k < 0.35 else keys[0], side=(-d.y, d.x, 0))


def tuft(b, rng, n, h, w, rad, lean=(0.1, 0.6), segs=2, keys=('grass', 'grass2'), c=(0, 0, 0)):
    for i in range(n):
        a, r = i * 2.39996 + rng.uniform(-0.3, 0.3), rad * math.sqrt((i + 0.4) / n)
        hh = rng.uniform(*h) * (1.0 - 0.25 * r / max(rad, 1e-6))
        grass_blade(b, rng, Vector(c) + Vector((math.cos(a) * r, math.sin(a) * r, 0)), hh, rng.uniform(*w), rng.uniform(*lean), segs, keys,
                    spread=a + rng.uniform(-0.8, 0.8))


def corn_stalk(b, rng, x=0.0, y=0.0, h=2.2, far=False, cobs=1):
    base = Vector((x, y, 0))
    lean = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * 0.06
    P = lambda t: base + lean * t * t * h + UP * h * t
    if far:
        b.tube([P(0), P(0.9)], [0.03, 0.0], 3, 'corn', cap0=False, flat=True)
    else:
        b.tube([P(0), P(0.35), P(0.7), P(0.93)], [0.024, 0.02, 0.015, 0.008], 4, 'corn', cap0=False)
        for k in range(3):  # tassel
            d = rand_dir(rng, 0.5, 0.9)
            b.tube([P(0.92), P(0.92) + d * 0.2], [0.012, 0.0], 3, 'tassel', cap0=False, flat=True)
    a0 = rng.uniform(0, TAU)
    nl = 3 if far else 6
    for i in range(nl):
        a = a0 + i * (math.pi + rng.uniform(-0.5, 0.5)) * (1 if not far else 0.7)
        d = Vector((math.cos(a), math.sin(a), 0))
        t = lerp(0.16, 0.8, i / (nl - 1)) + rng.uniform(-0.03, 0.03)
        L = rng.uniform(0.6, 0.85) * (1.0 - 0.3 * abs(t - 0.45))
        s = P(t)
        up = rng.uniform(0.35, 0.6)
        w = rng.uniform(0.05, 0.065) * (1.5 if far else 1.0)
        pts = [s, s + d * L * 0.4 + UP * L * up, s + d * L * 0.78 + UP * L * up * 0.75, s + d * L + UP * L * (up * 0.75 - 0.4)]
        if far:
            pts = [pts[0], pts[1], pts[3]]
        b.blade(pts, [w * 0.5, w, w * 0.8, 0] if not far else [w * 0.6, w, 0], 'corn' if i % 2 else 'corn2', 'corn', ridge=-0.5,
                cap0=False, key2='corn2' if i % 3 == 0 else 'corn', side=(-d.y, d.x, 0))
    if far:
        return
    for i in range(cobs):
        a = a0 + 1.3 + i * 2.6
        d = Vector((math.cos(a), math.sin(a), 0))
        s = P(0.42 + 0.14 * i)
        m = Matrix.Translation(s + d * 0.035) @ (d * 0.5 + UP).to_track_quat('Z', 'Y').to_matrix().to_4x4()
        b.lathe([(0.0, 0.0), (0.045, 0.06), (0.04, 0.2), (0.0, 0.3)], 4, 'corn2', m=m, flat=True, cap0=False, cap1=False,
                facekey=lambda i_, j: 'cob' if i_ == 1 and j % 2 == 0 else None)
        b.tube([m @ Vector((0, 0, 0.28)), m @ Vector((0.03, 0, 0.4))], [0.012, 0.0], 3, 'tassel', cap0=False, flat=True)


def build(reg):
    def one(b, kind='ground', **ex):
        reg(b.done(), dict(kind=kind, trunk_radius=0.0, **ex))
    for name, seed, n, h, w, rad, lean in (('grass_tuft_a', 401, 7, (0.12, 0.2), (0.012, 0.018), 0.07, (0.1, 0.6)),
                                           ('grass_tuft_b', 402, 10, (0.18, 0.28), (0.012, 0.02), 0.09, (0.1, 0.7)),
                                           ('grass_tuft_c', 403, 12, (0.24, 0.35), (0.014, 0.022), 0.11, (0.1, 0.8)),
                                           ('grass_tuft_d', 404, 8, (0.1, 0.16), (0.02, 0.028), 0.1, (0.6, 1.4))):
        b = B(name)
        tuft(b, random.Random(seed), n, h, w, rad, lean)
        one(b, 'grass')
    for name, seed, heads in (('grass_tall_a', 411, 0), ('grass_tall_b', 412, 5)):
        b = B(name)
        rng = random.Random(seed)
        tuft(b, rng, 14, (0.6, 0.9), (0.014, 0.022), 0.14, (0.05, 0.5), segs=3)
        for i in range(heads):
            a = TAU * i / heads + 0.4
            d = Vector((math.cos(a), math.sin(a), 0))
            h = rng.uniform(0.8, 0.95)
            top = d * (0.06 + 0.3 * h * 0.5) + UP * h
            b.tube([d * 0.05, d * (0.05 + 0.08 * h) + UP * h * 0.55, top], [0.007, 0.006, 0.005], 3, 'grass2', cap0=False)
            b.tube([top - UP * 0.01, top + d * 0.02 + UP * 0.06, top + d * 0.05 + UP * 0.15], [0.006, 0.018, 0.0], 4, 'wheat', flat=True)
        one(b, 'grass')

    b = B('weeds_a')  # broad-leaf rosette with seed stalks
    rng = random.Random(421)
    for i in range(8):
        a = TAU * i / 8 + rng.uniform(-0.2, 0.2)
        d = Vector((math.cos(a), math.sin(a), 0))
        L, up = rng.uniform(0.22, 0.34), rng.uniform(0.25, 0.8)
        b.blade([d * 0.02, d * L * 0.5 + UP * L * up, d * L + UP * L * up * 0.7], [0.02, 0.06, 0], 'leaf' if i % 2 else 'leaf2', 'leaf3',
                ridge=-0.35, cap0=False, key2='leaf2' if i % 3 == 0 else 'leaf', side=(-d.y, d.x, 0))
    for i in range(3):
        d = rand_dir(rng, 0, 0) * 0.05
        h = rng.uniform(0.4, 0.6)
        b.tube([d, d * 1.5 + UP * h * 0.6, d * 2.4 + UP * h], [0.008, 0.007, 0.005], 3, 'grass', cap0=False)
        b.tube([d * 2.2 + UP * h * 0.8, d * 2.4 + UP * h * 0.92, d * 2.5 + UP * (h + 0.06)], [0.006, 0.02, 0.0], 4, '#8a5a3a', flat=True)
    one(b, 'weeds')
    b = B('weeds_b')  # tall thistle-like weed
    rng = random.Random(422)
    for sx, h in ((-0.07, 0.75), (0.06, 0.55), (0.0, 0.95)):
        base = Vector((sx, rng.uniform(-0.05, 0.05), 0))
        lean = Vector((sx, rng.uniform(-0.05, 0.05), 0)) * 1.5
        P = lambda t: base + lean * t * t + UP * h * t
        b.tube([P(0), P(0.5), P(1)], [0.012, 0.01, 0.007], 4, 'grass', cap0=False)
        for i in range(5):
            a = i * 2.2 + sx * 9
            d = Vector((math.cos(a), math.sin(a), 0))
            s, L = P(0.12 + 0.17 * i), 0.2 - 0.02 * i
            b.blade([s, s + d * L * 0.5 + UP * L * 0.45, s + d * L + UP * L * 0.25], [0.012, 0.04, 0], 'leaf', 'leaf3', ridge=-0.4, cap0=False,
                    key2='leaf2', side=(-d.y, d.x, 0))
        b.blob(P(1) + UP * 0.02, (0.03, 0.03, 0.035), 'grass', rng, sub=1, jit=0.0)
        flower(b, P(1) + UP * 0.055, UP, 0.04, '#9a5ab8', rng, centre=None, star=False)
    one(b, 'weeds')

    b = B('dandelion_patch')
    rng = random.Random(431)
    for k, (x, y) in enumerate(((0, 0), (0.2, 0.1), (-0.14, 0.17), (-0.05, -0.2))):
        for i in range(6):
            a = TAU * i / 6 + k
            d = Vector((math.cos(a), math.sin(a), 0))
            L = rng.uniform(0.1, 0.15)
            s = Vector((x, y, 0))
            b.blade([s + UP * 0.005, s + d * L * 0.35 + UP * 0.03, s + d * L * 0.6 + UP * 0.035, s + d * L + UP * 0.012], [0.008, 0.03, 0.016, 0],
                    'leaf' if i % 2 else 'leaf2', 'leaf3', ridge=-0.3, cap0=False, side=(-d.y, d.x, 0))
        h = rng.uniform(0.12, 0.22)
        top = Vector((x + rng.uniform(-0.03, 0.03), y + rng.uniform(-0.03, 0.03), h))
        b.tube([(x, y, 0), top], [0.006, 0.005], 3, 'grass2', cap0=False)
        if k == 3:
            b.blob(top + UP * 0.02, 0.035, 'white', rng, sub=1, jit=0.0)
        else:
            flower(b, top, UP + rand_dir(rng) * 0.2, 0.035, 'petal2', rng, centre=None)
    one(b, 'flowers')

    b = B('reeds')
    rng = random.Random(441)
    tuft(b, rng, 16, (1.1, 1.7), (0.018, 0.028), 0.3, (0.02, 0.28), segs=3)
    for i in range(6):
        a, r = i * 2.39996, 0.26 * math.sqrt((i + 0.5) / 6)
        s = Vector((math.cos(a) * r, math.sin(a) * r, 0))
        h = rng.uniform(1.4, 1.9)
        top = s + Vector((rng.uniform(-0.08, 0.08), rng.uniform(-0.08, 0.08), h))
        b.tube([s, s.lerp(top, 0.5), top], [0.011, 0.009, 0.007], 4, 'grass2', cap0=False)
        ax = (top - s).normalized()
        b.tube([top - ax * 0.24, top - ax * 0.22, top - ax * 0.05, top - ax * 0.03], [0.008, 0.026, 0.026, 0.008], 6, 'cattail')
        b.tube([top - ax * 0.03, top + ax * 0.1], [0.006, 0.0], 3, 'grass2', flat=True, cap0=False)
    one(b, 'reeds')

    b = B('lily_pads')  # origin on the water surface
    rng = random.Random(451)
    for k, (x, y, r) in enumerate(((0, 0, 0.3), (0.5, 0.25, 0.22), (-0.42, 0.3, 0.25), (0.2, -0.5, 0.26), (-0.4, -0.3, 0.18), (0.62, -0.2, 0.15))):
        a0, n = rng.uniform(0, TAU), 11
        ctr = Vector((x, y, 0.012))
        top, bot = b.v(ctr + UP * 0.006), b.v(ctr - UP * 0.02)
        ring = [b.v(ctr + Vector((math.cos(a0 + TAU * i / (n + 1)), math.sin(a0 + TAU * i / (n + 1)), 0)) * r * rng.uniform(0.93, 1.05)
                    + UP * (0.012 if i % 3 == 0 else 0.0)) for i in range(n)]
        for i in range(n - 1):
            b.face((top, ring[i], ring[i + 1]), 'pad' if (i + k) % 3 else 'pad2')
            b.face((bot, ring[i + 1], ring[i]), 'leaf3')
        b.face((top, bot, ring[0]), 'leaf3')
        b.face((bot, top, ring[-1]), 'leaf3')
        if k in (1, 3):
            f = ctr + Vector((r * 0.9, r * 0.5, 0.03))
            flower(b, f, UP, 0.085, 'white' if k == 1 else 'petal', rng)
            flower(b, f + UP * 0.02, UP, 0.05, 'white' if k == 1 else 'petal', rng, centre=None)
    one(b, 'water_plant')

    b = B('wheat_clump')
    rng = random.Random(461)
    for i in range(6):
        for j in range(6):
            x, y = -0.42 + i * 0.168 + rng.uniform(-0.05, 0.05), -0.42 + j * 0.168 + rng.uniform(-0.05, 0.05)
            h = rng.uniform(0.75, 0.95)
            lean = Vector((rng.uniform(-0.3, 0.3) + 0.25, rng.uniform(-0.3, 0.3), 0)) * 0.3
            top = Vector((x, y, 0)) + lean * h + UP * h
            b.blade([(x, y, 0), top], [0.016, 0.008], 'wheat' if (i + j) % 3 else 'wheat2',
                    'wheat2', ridge=0.6, cap0=False)
            d = (lean + UP * 0.6).normalized()
            b.tube([top - d * 0.01, top + d * 0.07, top + d * 0.2 + lean * 0.12], [0.008, 0.026, 0.0], 3,
                   'wheat' if (i * j) % 4 else 'wheat2', flat=True)
    one(b, 'crop', footprint=[1.0, 1.0])

    for name, seed, h, cobs in (('corn_stalk_a', 471, 2.2, 1), ('corn_stalk_b', 472, 2.35, 2), ('corn_stalk_c', 473, 1.95, 1)):
        b = B(name)
        corn_stalk(b, random.Random(seed), h=h, cobs=cobs)
        one(b, 'crop')
    for far in (False, True):
        b = B('corn_row' + ('_far' if far else ''))
        rng = random.Random(481)
        for i in range(9):
            r2 = random.Random(482 + i)
            corn_stalk(b, r2, x=-1.333 + i * 0.3333 + rng.uniform(-0.04, 0.04), y=rng.uniform(-0.05, 0.05), h=rng.uniform(1.95, 2.35), far=far,
                       cobs=1 if i % 3 else 2)
        one(b, 'crop', length=3.0, **({'full': 'corn_row'} if far else {'far': 'corn_row_far'}))

    b = B('hay_stubble')
    rng = random.Random(491)
    for i in range(6):
        for j in range(6):
            x, y = -0.42 + i * 0.168 + rng.uniform(-0.05, 0.05), -0.42 + j * 0.168 + rng.uniform(-0.05, 0.05)
            d = rand_dir(rng, 0, 0) * rng.uniform(0.0, 0.05)
            h = rng.uniform(0.07, 0.16)
            b.tube([(x, y, 0), Vector((x, y, h)) + d], [0.014, 0.008], 3, 'wheat' if (i + j) % 3 else 'wheat2', cap0=False, flat=True)
    for i in range(7):
        c = Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), 0.012))
        d = rand_dir(rng, 0, 0) * rng.uniform(0.12, 0.22)
        b.tube([c - d, c + d + UP * 0.01], [0.008, 0.006], 3, 'wheat', flat=True)
    one(b, 'crop', footprint=[1.0, 1.0])

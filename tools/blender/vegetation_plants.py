"""Shrubs and garden plants: bushes, clipped hedges, topiary, flowers, fern, ivy, trellis."""
import math, random
from mathutils import Matrix, Vector
from vegetation_gen import B, UP, TAU, lerp, rand_dir, leaf_tone


def flower(b, c, n, r, key, rng, centre='petal2', star=True):
    """Small closed flower head facing n: petals as a star fan around a raised centre."""
    n = Vector(n).normalized()
    u = n.orthogonal().normalized()
    w = n.cross(u)
    c = Vector(c)
    k = 10 if star else 5
    a0 = rng.uniform(0, TAU)
    ring = [b.v(c + (u * math.cos(a0 + TAU * i / k) + w * math.sin(a0 + TAU * i / k)) * r * (1.0 if i % 2 == 0 or not star else 0.5)
                + n * r * 0.12) for i in range(k)]
    top, bot = b.v(c + n * r * 0.3), b.v(c - n * r * 0.35)
    for i in range(k):
        j = (i + 1) % k
        b.face((top, ring[i], ring[j]), key)
        b.face((bot, ring[j], ring[i]), key)
    if centre:
        b.blob(c + n * r * 0.3, r * 0.3, centre, rng, sub=1, jit=0.0)


def bush_into(b, p, far=False):
    rng = random.Random(p['seed'] + (7 if far else 0))
    sx, sy, h = p['size']
    n = p['clumps']
    cl = []
    for i in range(n):
        a = TAU * i / n + rng.uniform(-0.3, 0.3)
        k = 0.0 if i == 0 else rng.uniform(0.5, 0.78)
        r = h * rng.uniform(0.29, 0.38) * (1.2 if i == 0 else 1.0)
        z = (h - r * 0.85) if i == 0 else rng.uniform(r * 0.75, max(r * 0.8, h * 0.6))
        cl.append((Vector((math.cos(a) * sx / 2 * k, math.sin(a) * sy / 2 * k, z)), r))
    if far:
        cl = [(Vector((c.x, c.y, max(c.z, r * 1.2))), r) for c, r in cl]
        cl = cl[:1] + sorted(cl[1:], key=lambda q: -(q[0].x ** 2 + q[0].y ** 2))[:5]
    else:
        for i in range(p.get('stems', 4)):
            a = TAU * i / 4 + 0.3
            d = Vector((math.cos(a), math.sin(a), 0))
            b.tube([d * 0.04, d * 0.12 + UP * h * 0.25, d * 0.3 * min(sx, sy) + UP * h * 0.5], [0.03, 0.022, 0.012], 4, 'bark')
    for c, r in cl:
        tone = leaf_tone(rng, 0.3 * (c.z / h - 0.5))
        rr = r * (1.3 if far else 1.0)
        vs = b.blob(c, (rr * max(1.0, sx / h * 0.42), rr * max(1.0, sy / h * 0.42), rr * 0.85), tone, rng, sub=1 if far or len(cl) % 2 and r < h * 0.32 else 2,
                    jit=0.12, rot=Matrix.Rotation(rng.uniform(0, TAU), 4, 'Z') if abs(sx - sy) < 0.3 else None)
        vs = [q for q in vs if q[1].z > -0.3]
        for _ in range(1 if far else p['chips']):
            pos, d = rng.choice(vs)
            sz = p['leaf'] * rng.uniform(0.8, 1.3) * (1.7 if far else 1.0)
            b.chip(pos + d * sz * 0.1, d * 0.6 + UP * 0.4 + rand_dir(rng) * 0.4, sz, tone(Vector((0, 0, d.z + 0.3))), 'leaf3', rng)
        for _ in range(p.get('flowers', 0) // (3 if far else 1)):
            pos, d = rng.choice(vs)
            flower(b, pos + d * 0.03, d + rand_dir(rng) * 0.3, p.get('fsize', 0.07) * (1.6 if far else 1.0), p.get('petal', 'petal'), rng,
                   centre=None, star=False)
            if not far:
                b.chip(pos + d * 0.05, d, 0.05, 'petal2', 'petal2', rng, aspect=1.0, thick=0.5)


def leafbox(b, lo, hi, seg, rng, far=False, flat_x=(False, False), chips=0, leaf=0.14, r=0.12):
    """Clipped hedge block: chamfered, faceted, lumpy box with leaf chips. flat_x ends are left flat to butt-join."""
    lo, hi = Vector(lo), Vector(hi)
    nx, ny, nz = (max(1, s // 2) for s in seg) if far else seg
    if far:
        lo.z = 0.0
    grid = {}
    jit = 0.035

    def vert(i, j, k):
        if (i, j, k) not in grid:
            q = Vector((lerp(lo.x, hi.x, i / nx), lerp(lo.y, hi.y, j / ny), lerp(lo.z, hi.z, k / nz)))
            ex = (i == 0 and not flat_x[0]) or (i == nx and not flat_x[1])
            ey, ez = j in (0, ny), k == nz
            if ex + ey + ez >= 2:  # chamfer the clipped edges
                cx = lo.x + r if i == 0 else hi.x - r
                cy = lo.y + r if j == 0 else hi.y - r
                c = Vector((cx if ex else q.x, cy if ey else q.y, hi.z - r if ez else q.z))
                q = c + (q - c).normalized() * r
            h = random.Random(j * 131 + k * 17) if i in (0, nx) and (flat_x[0] or flat_x[1]) else rng
            q += Vector((0 if i in (0, nx) and flat_x[0 if i == 0 else 1] else h.uniform(-jit, jit), h.uniform(-jit, jit),
                         0 if k == 0 else h.uniform(-jit, jit)))
            grid[(i, j, k)] = b.v(q)
        return grid[(i, j, k)]
    faces = []

    def quad(a, c, d, e, nrm):
        vs = [vert(*a), vert(*c), vert(*d), vert(*e)]
        tone = 'leaf3' if nrm.z < 0 else ('leaf2' if rng.random() < 0.6 else 'leaf4') if nrm.z > 0.5 else rng.choice(('leaf', 'leaf', 'leaf2', 'leaf3'))
        if rng.random() < 0.5:  # two triangles on a random diagonal: a faceted, clipped-leaf surface
            vs = vs[1:] + vs[:1]
        faces.append(b.face(vs[:3], tone))
        faces.append(b.face((vs[0], vs[2], vs[3]), tone if rng.random() < 0.6 else rng.choice(('leaf', 'leaf2'))))
    for i in range(nx):
        for j in range(ny):
            quad((i, j, nz), (i + 1, j, nz), (i + 1, j + 1, nz), (i, j + 1, nz), UP)
            quad((i, j, 0), (i, j + 1, 0), (i + 1, j + 1, 0), (i + 1, j, 0), -UP)
        for k in range(nz):
            quad((i, 0, k), (i + 1, 0, k), (i + 1, 0, k + 1), (i, 0, k + 1), Vector((0, -1, 0)))
            quad((i, ny, k), (i, ny, k + 1), (i + 1, ny, k + 1), (i + 1, ny, k), Vector((0, 1, 0)))
    for j in range(ny):
        for k in range(nz):
            quad((0, j, k), (0, j, k + 1), (0, j + 1, k + 1), (0, j + 1, k), Vector((-1, 0, 0)))
            quad((nx, j, k), (nx, j + 1, k), (nx, j + 1, k + 1), (nx, j, k + 1), Vector((1, 0, 0)))
    side = [f for f in faces if f and (f.normal_update() or True) and f.normal.z > -0.5]
    for _ in range(chips):
        f = rng.choice(side)
        f.normal_update()
        if (abs(f.normal.x) > 0.9 and ((flat_x[0] and f.normal.x < 0) or (flat_x[1] and f.normal.x > 0))):
            continue
        sz = leaf * rng.uniform(0.8, 1.3)
        b.chip(f.calc_center_median() + f.normal * sz * 0.1, f.normal + rand_dir(rng) * 0.45, sz,
               'leaf2' if f.normal.z > 0.5 or rng.random() < 0.4 else 'leaf', 'leaf3', rng)


def hedge(name, far, parts, seed, stems=()):
    b = B(name + ('_far' if far else ''), 'hedge')
    rng = random.Random(seed)
    for lo, hi, seg, fx, chips in parts:
        leafbox(b, lo, hi, seg, rng, far, fx, 0 if far else chips)
    if not far:
        for x, y in stems:
            b.tube([(x, y, 0), (x + 0.02, y, 0.14)], [0.035, 0.028], 5, 'bark', cap1=False)
    return b


def build(reg):
    def pair(name, make, ex):
        for far in (False, True):
            reg(make(far).done(), dict(ex, **({'full': name} if far else {'far': name + '_far'})))
    shrub = dict(kind='shrub', trunk_radius=0.0)
    BUSH = {
        'bush_round_a': dict(seed=301, size=(1.2, 1.2, 1.0), clumps=8, chips=11, leaf=0.16),
        'bush_round_b': dict(seed=302, size=(1.7, 1.6, 1.4), clumps=10, chips=11, leaf=0.2, pal='maple'),
        'bush_wide': dict(seed=303, size=(2.6, 1.7, 1.0), clumps=11, chips=10, leaf=0.18, pal='cedar'),
        'bush_flowering_a': dict(seed=304, size=(1.4, 1.3, 1.1), clumps=9, chips=7, leaf=0.16, flowers=5, fsize=0.085),
        'bush_flowering_b': dict(seed=305, size=(1.9, 1.5, 1.5), clumps=10, chips=7, leaf=0.18, flowers=5, fsize=0.095, petal='white',
                                 pal='maple'),
    }
    for name, p in BUSH.items():
        def make(far, name=name, p=p):
            b = B(name + ('_far' if far else ''), p.get('pal', ''))
            bush_into(b, p, far)
            return b
        pair(name, make, dict(shrub, canopy_radius=max(p['size'][:2]) / 2))
    T, F = True, False
    stems2 = [(x, 0.0) for x in (-0.75, -0.25, 0.25, 0.75)]
    pair('hedge_straight', lambda far: hedge('hedge_straight', far, [((-1, -0.4, 0.1), (1, 0.4, 1.2), (8, 4, 5), (T, T), 70)], 311, stems2),
         dict(shrub, length=2.0, joins='x'))
    pair('hedge_end', lambda far: hedge('hedge_end', far, [((-0.5, -0.4, 0.1), (0.5, 0.4, 1.2), (4, 4, 5), (T, F), 40)], 312,
                                        [(-0.25, 0), (0.2, 0)]), dict(shrub, length=1.0, joins='-x'))
    pair('hedge_corner', lambda far: hedge('hedge_corner', far, [((-0.4, -0.4, 0.1), (1.0, 0.4, 1.2), (6, 4, 5), (F, T), 45),
                                                                    ((-0.4, 0.35, 0.1), (0.4, 1.0, 1.2), (4, 3, 5), (F, F), 20)], 313,
                                           [(0, 0), (0.6, 0), (0, 0.6)]), dict(shrub, joins='+x and +y, corner at origin'))
    pair('hedge_tall', lambda far: hedge('hedge_tall', far, [((-1, -0.45, 0.1), (1, 0.45, 1.8), (8, 4, 7), (T, T), 90)], 314, stems2),
         dict(shrub, length=2.0, joins='x'))

    def topiary(far):
        b = B('topiary_ball' + ('_far' if far else ''), 'hedge')
        rng = random.Random(321)
        b.tube([(0, 0, 0), (0.01, 0, 0.4), (0, 0.01, 0.85)], [0.05, 0.035, 0.03], 4 if far else 7, 'bark', level0=True)
        tone = leaf_tone(rng, 0.1)
        vs = b.blob((0, 0, 1.15), 0.48, tone, rng, sub=1 if far else 3, jit=0.07 if far else 0.035)
        if not far:
            b.lathe([(0.0, 0.0), (0.34, 0.0), (0.3, 0.05), (0.0, 0.06)], 10, 'soil', cap0=False, cap1=False)
            for _ in range(36):
                pos, d = rng.choice(vs)
                b.chip(pos + d * 0.01, d + rand_dir(rng) * 0.4, 0.1, tone(Vector((0, 0, d.z + 0.3))), 'leaf3', rng)
        return b
    pair('topiary_ball', topiary, dict(shrub, trunk_radius=0.04))

    def plant(b, rng, x, y, h, key, kind):
        lean = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * h * 0.18
        top = Vector((x, y, 0)) + lean + UP * h
        b.tube([(x, y, 0), Vector((x, y, 0)) + lean * 0.3 + UP * h * 0.55, top], [0.012, 0.01, 0.008], 3, 'grass', cap0=False)
        for i in range(2):
            a = rng.uniform(0, TAU)
            d = Vector((math.cos(a), math.sin(a), 0))
            s = Vector((x, y, h * rng.uniform(0.05, 0.3)))
            b.blade([s, s + d * h * 0.22 + UP * h * 0.2, s + d * h * 0.42 + UP * h * 0.12], [0.02, 0.045, 0], 'grass', 'leaf3', cap0=False,
                    key2='grass2')
        if kind == 'tulip':
            b.lathe([(0.0, -0.01), (0.03, 0.01), (0.042, 0.05), (0.034, 0.1), (0.0, 0.085)], 5, key,
                    m=Matrix.Translation(top) @ Matrix.Rotation(rng.uniform(0, 1), 4, 'Z'), flat=True, cap0=False, cap1=False)
        else:
            flower(b, top, lean.normalized() * 0.5 + UP, h * 0.2 if kind == 'daisy' else 0.06, key, rng)

    def flower_bed():
        b = B('flower_bed')
        rng = random.Random(331)
        b.lathe([(0.78, 0.0), (0.7, 0.07), (0.4, 0.12), (0.0, 0.13)], 11, 'soil', flat=True, cap0=False, cap1=False,
                ringfn=lambda i, a: 1 + 0.07 * math.sin(a * 3 + i))
        for i in range(17):
            a, r = i * 2.39996, 0.62 * math.sqrt((i + 0.5) / 17)
            plant(b, rng, math.cos(a) * r, math.sin(a) * r, rng.uniform(0.3, 0.48) + 0.1, ('petal', 'petal2', 'white')[i % 3],
                  'tulip' if i % 2 else 'daisy')
        return b
    reg(flower_bed().done(), dict(kind='flowers', trunk_radius=0.0))
    for name, seed, kind, key, n in (('flower_clump_a', 341, 'daisy', 'white', 6), ('flower_clump_b', 342, 'tulip', 'petal', 7)):
        b = B(name)
        rng = random.Random(seed)
        for i in range(n):
            a, r = i * 2.39996, 0.16 * math.sqrt((i + 0.3) / n)
            plant(b, rng, math.cos(a) * r, math.sin(a) * r, rng.uniform(0.28, 0.45), key, kind)
        reg(b.done(), dict(kind='flowers', trunk_radius=0.0))

    b = B('fern')
    rng = random.Random(351)
    for i in range(10):
        a = TAU * i / 10 + rng.uniform(-0.2, 0.2)
        d = Vector((math.cos(a), math.sin(a), 0))
        L, H = rng.uniform(0.45, 0.7), rng.uniform(0.3, 0.5)
        if i % 3 == 0:
            L, H = L * 0.6, H * 1.3
        pts = [d * 0.03 + d * L * t + UP * H * (4 * t * (1 - t) + 0.25 * t) * (1.0 if t < 1 else 0.3) for t in (0, 0.2, 0.4, 0.6, 0.8, 1)]
        b.blade(pts, [0.02, 0.1, 0.055, 0.085, 0.04, 0], 'leaf' if i % 2 else 'leaf2', 'leaf3', ridge=0.25, sag=0.25, cap0=False,
                key2='leaf2' if i % 3 else 'leaf4')
    reg(b.done(), dict(kind='plant', trunk_radius=0.0))

    # ivy: the wall is the plane y = 0, the patch grows towards -Y (front)
    b = B('ivy_patch_wall', 'hedge')
    rng = random.Random(361)
    tips = []
    for i in range(5):
        x, pts = rng.uniform(-0.5, 0.5), []
        z, top = 0.0, rng.uniform(1.5, 2.4)
        while z < top:
            pts.append(Vector((x, -0.025, z)))
            z += rng.uniform(0.3, 0.5)
            x += rng.uniform(-0.28, 0.28)
        b.tube(pts, [lerp(0.022, 0.008, k / len(pts)) for k in range(len(pts))], 3, 'bark')
        tips += pts[1:]
    for q in tips:
        tone = leaf_tone(rng, 0.2)
        vs = b.blob((q.x, -0.03, q.z), (rng.uniform(0.2, 0.3), 0.045, rng.uniform(0.18, 0.28)), lambda n, c: 'leaf3' if rng.random() < 0.6 else 'leaf',
                    rng, sub=1, jit=0.15, rot=Matrix.Rotation(rng.uniform(-0.5, 0.5), 4, 'Y'))
        for _ in range(13):
            pos, d = rng.choice([v for v in vs if v[0].y < -0.03])
            pos = pos + Vector((rng.uniform(-0.09, 0.09), 0, rng.uniform(-0.09, 0.09)))
            pos.y = min(pos.y, -0.06)
            b.chip(pos, Vector((rng.uniform(-0.5, 0.5), -1, rng.uniform(-0.2, 0.6))), rng.uniform(0.1, 0.16),
                   rng.choice(('leaf', 'leaf2', 'leaf2', 'leaf4')), 'leaf3', rng, aspect=1.1)
    reg(b.done(), dict(kind='wall_plant', trunk_radius=0.0, wall='y=0, grows towards -y'))

    b = B('vine_trellis', '')
    rng = random.Random(371)
    for x in (-0.48, -0.24, 0, 0.24, 0.48):
        b.box((x, 0, 1.0 if abs(x) < 0.4 else 1.05), (0.035, 0.02, 1.9 if abs(x) < 0.4 else 2.1), 'trellis', bevel=0.004 if abs(x) > 0.4 else 0)
    for z in (0.3, 0.58, 0.86, 1.14, 1.42, 1.7):
        b.box((0, -0.02, z), (1.06, 0.02, 0.035), 'trellis')
    b.box((0, -0.01, 1.95), (1.1, 0.04, 0.05), 'trellis', bevel=0.008)
    for i in range(4):
        x, pts, z = -0.36 + 0.24 * i, [], 0.0
        while z < rng.uniform(1.5, 1.95):
            pts.append(Vector((x, -0.045, z)))
            z += 0.3
            x = max(-0.45, min(0.45, x + rng.uniform(-0.22, 0.22)))
        b.tube(pts, [lerp(0.018, 0.007, k / len(pts)) for k in range(len(pts))], 3, 'bark')
        for q in pts[1:]:
            for _ in range(6):
                pos = q + Vector((rng.uniform(-0.16, 0.16), rng.uniform(-0.035, 0.0), rng.uniform(-0.16, 0.16)))
                b.chip(pos, Vector((rng.uniform(-0.6, 0.6), -1, rng.uniform(-0.2, 0.7))), rng.uniform(0.09, 0.14),
                       rng.choice(('leaf', 'leaf2', 'leaf2', 'leaf4')), 'leaf3', rng, aspect=1.1)
            if rng.random() < 0.45:
                flower(b, q + Vector((rng.uniform(-0.1, 0.1), -0.06, rng.uniform(-0.1, 0.1))), (0, -1, 0.3), 0.055, 'petal', rng)
    reg(b.done(), dict(kind='wall_plant', trunk_radius=0.0))

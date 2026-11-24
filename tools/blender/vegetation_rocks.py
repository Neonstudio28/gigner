"""Rocks and wood: rocks, boulders, shore clusters, stumps, logs, firewood, mushrooms."""
import math, random
from mathutils import Matrix, Vector
from vegetation_gen import B, UP, TAU, lerp, rand_dir


def rock_into(b, rng, c, size, n=16, moss=0.0, bevel=0.04, sink=0.0):
    """Chamfered faceted rock sitting on z = c.z: convex chunk of random points with a flat base."""
    sx, sy, sz = size
    c = Vector(c)
    rot = Matrix.Rotation(rng.uniform(0, TAU), 3, 'Z')
    pts = []
    for i in range(n):
        d = rand_dir(rng, 0.0, 1.0)
        d = d / max(abs(d.x), abs(d.y), abs(d.z)) ** 0.7  # push towards a block: flatter top and sides
        k = rng.uniform(0.8, 1.0)
        q = rot @ Vector((d.x * sx / 2 * k, d.y * sy / 2 * k, d.z * sz * k))
        pts.append(c + q - UP * sink)
    for i in range(6):
        a = TAU * i / 6 + rng.uniform(-0.3, 0.3)
        e = Vector((math.cos(a), math.sin(a), 0))
        e = e / max(abs(e.x), abs(e.y)) ** 0.7
        pts.append(c + rot @ Vector((e.x * sx * 0.47, e.y * sy * 0.47, 0)) - UP * sink)

    def tone(nrm, ctr):
        if nrm.z > 0.75:
            return ('moss' if rng.random() < 0.7 else 'moss2') if rng.random() < moss else 'rock3'
        if nrm.z < 0.05:
            return 'rock2' if rng.random() < 0.6 else 'rock'
        return rng.choice(('rock', 'rock', 'rock3', 'rock2'))
    b.hull(pts, tone, bevel=bevel * min(size), planar=14.0)


def log_into(b, p0, p1, r0, r1, sides=10, rng=None, bark='bark', seed=0, stubs=0, heart=True):
    """Log from p0 to p1 with cut ends (bark rim, pale wood face with a darker heart)."""
    p0, p1 = Vector(p0), Vector(p1)
    ax = (p1 - p0).normalized()
    L = (p1 - p0).length
    pts = [p0 - ax * 0.0, p0, p0 + ax * L * 0.33, p0 + ax * L * 0.66, p1, p1]
    wob = [1.0, 1.0, 1.04, 0.98, 1.0, 1.0]
    rad = [0.0, r0, lerp(r0, r1, 0.33), lerp(r0, r1, 0.66), r1, 0.0]
    rr = [rad[i] * wob[i] for i in range(6)]
    b.tube([pts[1], pts[2], pts[3], pts[4]] if heart else [pts[1], pts[3], pts[4]], rr[1:5] if heart else [rr[1], rr[3], rr[4]], sides, bark, cap0=False, cap1=False,
           facekey=lambda i, j: 'bark2' if (i * 5 + j * 3 + seed) % 4 == 0 else None)
    for q, r, s in ((p0, r0, -1), (p1, r1, 1)):
        m = Matrix.Translation(q) @ (ax * s).to_track_quat('Z', 'Y').to_matrix().to_4x4()
        b.lathe([(r, 0.0), (r * 0.84, 0.004), (0.0, 0.006)] if not heart else [(r, 0.0), (r * 0.84, 0.004), (r * 0.3, 0.006), (0.0, 0.006)], sides, 'cut', m=m,
                cap0=False, cap1=False, facekey=lambda i, j: bark if i == 0 else 'cut2' if i == 2 or (not heart and j % 3 == 0) else None)
    for k in range(stubs):
        t, a = rng.uniform(0.15, 0.85), rng.uniform(-0.6, 3.7)
        side = ax.cross(UP).normalized()
        d = side * math.cos(a) + UP * math.sin(a)
        s = p0.lerp(p1, t)
        r = lerp(r0, r1, t)
        b.tube([s + d * r * 0.7, s + d * (r + 0.12) + ax * 0.04], [r * 0.3, r * 0.22], 6, bark, cap1='cut')


def stump_into(b, rng, r, h, mossy=False):
    ph = rng.uniform(0, TAU)
    lob = lambda i, a: 1 + (0.4 if i == 0 else 0.16 if i == 1 else 0.03) * max(0.0, math.cos(5 * (a - ph))) + (0.05 * math.sin(3 * a + i) if i > 1 else 0)
    hs = [h * (1 + (0.12 if mossy else 0.03) * math.sin(j * 1.9)) for j in range(12)]
    b.lathe([(r * 1.7, 0.0), (r * 1.25, h * 0.18), (r * 1.02, h * 0.5), (r * 0.98, h)], 12, 'bark', ringfn=lob, phase=ph, cap0=False, cap1=False,
            facekey=lambda i, j: 'bark2' if (i + j * 2) % 5 == 0 else None)
    b.lathe([(r * 0.98, h), (r * 0.84, h + 0.006), (r * 0.5, h + 0.012), (r * 0.2, h + 0.012), (0.0, h + 0.012)], 12, 'cut', ringfn=lambda i, a: lob(3, a),
            phase=ph, cap0=False, cap1=False, facekey=lambda i, j: 'bark2' if i == 0 else 'cut2' if i == 2 else None)
    for k in range(5):
        a = ph + TAU * k / 5
        d = Vector((math.cos(a), math.sin(a), 0))
        b.tube([d * r * 0.7 + UP * h * 0.45, d * r * 1.7 + UP * h * 0.16, d * r * rng.uniform(2.6, 3.6)], [r * 0.4, r * 0.3, 0.0], 5, 'bark2' if k % 2 else 'bark')
    # axe notch chip and a split
    b.box((r * 0.55, 0, h + 0.02), (r * 0.5, 0.03, 0.05), 'cut2', rot=Matrix.Rotation(0.5, 4, 'Z'), bevel=0.006)


def mushroom(b, rng, c, h, r, cap='cap'):
    c = Vector(c)
    lean = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * h * 0.2
    b.tube([c, c + lean * 0.6 + UP * h * 0.6, c + lean + UP * h], [r * 0.3, r * 0.22, r * 0.2], 6, 'cap2', cap1=False)
    b.lathe([(r * 0.25, h * 0.96), (r, h * 0.9), (r * 0.95, h * 1.02), (r * 0.6, h * 1.22), (0.0, h * 1.32)], 8, cap,
            m=Matrix.Translation(c + lean), cap0=False, cap1=False,
            facekey=lambda i, j: 'cap2' if i == 0 else None)


def build(reg):
    def one(b, kind, tr=0.0, **ex):
        reg(b.done(), dict(kind=kind, trunk_radius=tr, **ex))
    R = random.Random
    for name, seed, size in (('rock_small_a', 501, (0.45, 0.36, 0.26)), ('rock_small_b', 502, (0.36, 0.3, 0.2)), ('rock_small_c', 503, (0.55, 0.36, 0.2)),
                             ('rock_medium_a', 511, (1.2, 0.95, 0.75)), ('rock_medium_b', 512, (0.95, 0.85, 0.6)),
                             ('rock_medium_c', 513, (1.5, 0.95, 0.6))):
        b = B(name)
        rng = R(seed)
        rock_into(b, rng, (0, 0, 0), size, n=14 if size[0] < 0.7 else 20, moss=0.5 if name.endswith('_c') else 0.0)
        if size[0] > 0.7:
            rock_into(b, rng, (size[0] * 0.42, -size[1] * 0.25, 0), (size[0] * 0.4, size[1] * 0.4, size[2] * 0.4), n=10)
        one(b, 'rock', round(max(size[:2]) / 2, 2) if size[2] > 0.5 else 0.0)
    for name, seed, size, parts in (('boulder_a', 521, (2.6, 2.1, 1.9), ((0, 0, 1.0), (0.9, 0.5, 0.55), (-0.85, -0.55, 0.42), (0.3, -1.0, 0.3))),
                                    ('boulder_b', 522, (3.4, 2.4, 1.5), ((-0.4, 0, 1.0), (0.95, 0.2, 0.7), (0.2, -0.95, 0.4), (-1.3, 0.75, 0.3),
                                                                        (1.5, -0.8, 0.22)))):
        b = B(name)
        rng = R(seed)
        for x, y, k in parts:
            rock_into(b, rng, (x * size[0] / 2.6, y * size[1] / 2.1, 0), (size[0] * 0.8 * k, size[1] * 0.8 * k, size[2] * k), n=26 if k > 0.9 else 14,
                      moss=0.45, bevel=0.03)
        one(b, 'rock', round(size[1] * 0.45, 2))
    for name, seed, n, L in (('shore_rock_cluster_a', 531, 8, 5.0), ('shore_rock_cluster_b', 532, 6, 3.6)):
        b = B(name)
        rng = R(seed)
        for i in range(n):
            x = -L / 2 + L * (i + 0.5) / n + rng.uniform(-0.2, 0.2)
            s = rng.uniform(0.75, 1.5)
            rock_into(b, rng, (x, rng.uniform(-0.45, 0.45), 0), (s * rng.uniform(1.0, 1.4), s, s * rng.uniform(0.5, 0.8)), n=11, moss=0.6, bevel=0.05)
            if i % 2 == 0:
                rock_into(b, rng, (x + rng.uniform(-0.4, 0.4), -0.9 + rng.uniform(-0.2, 0.2), 0), (0.5, 0.4, 0.28), n=7, bevel=0.0)
        one(b, 'rock', 0.0, length=L, note='long axis x, water side -y')

    b = B('stump')
    stump_into(b, R(541), 0.34, 0.5)
    one(b, 'stump', 0.36)
    b = B('stump_mossy', bark='dead')
    rng = R(542)
    stump_into(b, rng, 0.42, 0.42, mossy=True)
    for i in range(6):
        a = rng.uniform(0, TAU)
        k = rng.uniform(0.2, 0.9)
        b.blob((math.cos(a) * 0.42 * k, math.sin(a) * 0.42 * k, 0.43 if k < 0.75 else 0.36), (rng.uniform(0.1, 0.17), rng.uniform(0.1, 0.17), 0.05),
               lambda n, c: 'moss' if n.z > 0.2 else 'moss2', rng, sub=1, jit=0.15)
    for i in range(3):
        mushroom(b, rng, (0.5 + 0.09 * i, -0.25 + 0.16 * i, 0.02), 0.07 + 0.02 * i, 0.05 + 0.012 * i, 'cut2')
    one(b, 'stump', 0.44)

    b = B('log_single', bark='fir')
    log_into(b, (-2, 0, 0.21), (2, 0, 0.19), 0.22, 0.18, 10, R(551), stubs=4)
    one(b, 'log', 0.0, length=4.0, radius=0.22, note='lies along x')
    b = B('log_pile', bark='fir')  # 4-3-2 stack between stakes
    rng = R(561)
    y0 = 0
    for row, n in enumerate((4, 3, 2)):
        for i in range(n):
            r = 0.2
            y = (i - (n - 1) / 2) * 0.42 + rng.uniform(-0.01, 0.01)
            z = 0.2 + row * 0.365
            dx = rng.uniform(-0.12, 0.12)
            log_into(b, (-2 + dx, y, z), (2 + dx, y + rng.uniform(-0.02, 0.02), z), r * rng.uniform(0.95, 1.05), r * rng.uniform(0.85, 0.98), 8, rng,
                     seed=row * 7 + i, heart=False)
    for x in (-1.3, 1.3):
        for y in (-0.9, 0.9):
            b.box((x, y, 0.42), (0.1, 0.1, 0.84), '#7a6248', bevel=0.012)
    one(b, 'log', 0.0, length=4.0, note='logs along x')

    b = B('branch_fallen', bark='dead')
    rng = R(571)
    main = [Vector((-1.3, 0, 0.07)), Vector((-0.5, 0.08, 0.1)), Vector((0.3, -0.05, 0.13)), Vector((1.2, 0.12, 0.2))]
    b.tube(main, [0.07, 0.06, 0.045, 0.02], 6, 'bark', cap0='cut')
    for i, (t, sg) in enumerate(((1, 1), (1, -1), (2, 1), (2, -1), (3, 1))):
        s = main[t]
        d = Vector((0.6, sg * rng.uniform(0.5, 0.9), rng.uniform(0.1, 0.5))).normalized()
        L = rng.uniform(0.5, 0.9)
        e = s + d * L
        e.z = max(e.z, 0.03)
        b.tube([s, s.lerp(e, 0.5) + UP * 0.05, e], [0.035, 0.025, 0.008], 4, 'bark2' if i % 2 else 'bark')
        f = e + Vector((0.25, sg * 0.2, 0.0))
        f.z = max(0.02, e.z - 0.08)
        b.tube([s.lerp(e, 0.5) + UP * 0.05, f], [0.016, 0.004], 3, 'bark2')
        for k in range(3):
            b.chip(e + rand_dir(rng) * 0.1 + UP * 0.03, UP + rand_dir(rng) * 0.6, 0.11, '#a08040', '#7a6030', rng)
    one(b, 'wood', 0.0)

    b = B('firewood_stack', bark='fir')
    rng = R(581)
    for y in (-0.14, 0.14):
        b.box((0, y, 0.035), (1.7, 0.07, 0.07), '#7a6248', bevel=0.008)
    for x in (-0.82, 0.82):
        b.box((x, 0, 0.6), (0.07, 0.07, 1.2), '#7a6248', bevel=0.01)
    z = 0.07
    for row in range(7):
        x = -0.77
        hrow = 0.0
        while x < 0.66:
            w, h = rng.uniform(0.13, 0.2), rng.uniform(0.11, 0.15)
            y0, y1 = -0.21 + rng.uniform(-0.03, 0.03), 0.21 + rng.uniform(-0.03, 0.03)
            kind = rng.randrange(3)
            prof = ([(0, 0), (w, 0), (w * 0.5, h)], [(0, 0), (w, 0), (w * 0.85, h), (w * 0.15, h)], [(0, h), (w * 0.5, 0), (w, h)])[kind]
            ring0 = [b.v((x + px, y0, z + pz)) for px, pz in prof]
            ring1 = [b.v((x + px, y1, z + pz)) for px, pz in prof]
            n = len(prof)
            for i in range(n):
                j = (i + 1) % n
                b.face((ring0[i], ring0[j], ring1[j], ring1[i]), 'bark' if (i == 0 and kind < 2) or (kind == 2 and i == 2) else ('cut' if (i + row) % 2 else 'cut2'), flat=True)
            b.face(ring0[::-1], 'cut', flat=True)
            b.face(ring1, 'cut', flat=True)
            x += w + 0.008
            hrow = max(hrow, h)
        z += hrow + 0.004
    one(b, 'wood', 0.0, size_note='1.7 x 0.45 x 1.2')

    b = B('mushroom_cluster')
    rng = R(591)
    for i, (x, y, h, r) in enumerate(((0, 0, 0.11, 0.07), (0.1, 0.05, 0.07, 0.045), (-0.08, 0.08, 0.08, 0.05), (0.03, -0.1, 0.05, 0.035),
                                     (-0.11, -0.05, 0.045, 0.03), (0.16, -0.06, 0.04, 0.028))):
        mushroom(b, rng, (x, y, 0), h, r)
    one(b, 'plant', 0.0)

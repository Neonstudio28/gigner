"""Distant scenery: faceted snow-capped mountains and wooded hills (origin at base centre)."""
import math, random
from mathutils import Vector
from vegetation_gen import B, UP, TAU, lerp, smooth


def terrain(b, rng, radius, rings, sectors, height, tone, squash=1.0):
    """Jittered polar grid heightfield, closed underneath; faces are flat-shaded triangles."""
    grid = [[b.v((0, 0, height(0.0, 0.0)))]]
    for i in range(1, rings + 1):
        row = []
        for j in range(sectors):
            a = TAU * (j + (0.5 if i % 2 else 0) + rng.uniform(-0.25, 0.25)) / sectors
            r = radius * (i + (rng.uniform(-0.3, 0.3) if i < rings else rng.uniform(-0.25, 0.0))) / rings
            x, y = math.cos(a) * r, math.sin(a) * r * squash
            row.append(b.v((x, y, height(x, y) if i < rings else 0.0)))
        grid.append(row)

    def tri(p, q, r_):
        n = (q.co - p.co).cross(r_.co - p.co).normalized()
        b.face((p, q, r_), tone(n, (p.co + q.co + r_.co) / 3))
    for j in range(sectors):
        tri(grid[0][0], grid[1][j], grid[1][(j + 1) % sectors])
    for i in range(1, rings):
        for j in range(sectors):
            a, c = grid[i][j], grid[i][(j + 1) % sectors]
            if i % 2:
                d, e = grid[i + 1][(j - 1) % sectors], grid[i + 1][j]
            else:
                d, e = grid[i + 1][j], grid[i + 1][(j + 1) % sectors]
            tri(a, e, c)
            tri(a, d, e)
    b.face(grid[rings][::-1], 'mtn2')


def build(reg):
    for name, seed, peaks in (('mountain_snowy_a', 601, ((0, 0, 400, 330), (-230, 40, 290, 240), (240, -30, 250, 230), (90, 120, 210, 200))),
                              ('mountain_snowy_b', 602, ((-80, 0, 380, 300), (150, 30, 340, 280), (330, -20, 190, 180), (-300, 30, 200, 210))),
                              ('mountain_snowy_c', 603, ((40, 0, 410, 290), (-180, -20, 240, 260), (-340, 30, 170, 170), (270, 40, 230, 240),
                                                         (130, -90, 200, 190)))):
        rng = random.Random(seed)
        ridges = [(rng.uniform(0, TAU), rng.uniform(4, 7)) for _ in peaks]

        def height(x, y, peaks=peaks, ridges=ridges):
            h = 0.0
            for (px, py, ph, pr), (a0, k) in zip(peaks, ridges):
                dx, dy = x - px, y - py
                dd = math.hypot(dx, dy)
                ridge = 1 + 0.28 * math.cos(k * math.atan2(dy, dx) + a0) * min(1.0, dd / pr * 2)
                h = max(h, ph * max(0.0, 1 - dd / (pr * ridge)) ** 1.25)
            edge = max(0.0, 1 - math.hypot(x / 500, y / 330) ** 3)
            return (h * 0.92 + 30 * edge) * min(1.0, edge * 3) * rng.uniform(0.93, 1.07)

        def tone(n, c):
            line = 245 + 40 * math.sin(c.x * 0.02) + rng.uniform(-18, 18) + (25 if n.y > 0.3 else 0)
            if c.z > line and n.z > 0.35:
                return 'snow' if n.x - n.y * 0.5 > -0.25 else 'snow2'
            if c.z < 95 + rng.uniform(-25, 25) and n.z > 0.5:
                return 'mtn3'
            return 'mtn' if n.x - n.y * 0.5 > -0.15 else 'mtn2'
        b = B(name)
        terrain(b, rng, 500, 9, 26, height, tone, squash=0.66)
        reg(b.done(), dict(kind='distant', trunk_radius=0.0, snow_line=245))

    for name, seed, rad, hh, sq, bumps in (('hill_wooded_a', 611, 320, 120, 0.7, ((0, 0, 1.0, 260), (-150, 30, 0.6, 150), (170, -20, 0.7, 170))),
                                           ('hill_wooded_b', 612, 260, 85, 0.75, ((-40, 0, 1.0, 220), (120, 20, 0.75, 150)))):
        rng = random.Random(seed)

        def height(x, y, bumps=bumps, hh=hh, rad=rad, sq=sq):
            h = 0.0
            for bx, by, k, br in bumps:
                dd = math.hypot(x - bx, y - by)
                h = max(h, hh * k * smooth(1.0, 0.0, dd / br) ** 0.8)
            edge = max(0.0, 1 - math.hypot(x / rad, y / (rad * sq)) ** 4)
            return (h + 6) * min(1.0, edge * 2.5) * rng.uniform(0.94, 1.06)

        def tone(n, c):
            return rng.choice(('forest', 'forest', 'forest3')) if n.x - n.y * 0.5 + rng.uniform(-0.2, 0.2) > -0.1 else 'forest2'
        b = B(name)
        terrain(b, rng, rad, 6, 20, height, tone, squash=sq)
        # tree tops: three-sided spikes scattered over the canopy
        for i in range(120):
            a, r = i * 2.39996, rad * 0.92 * math.sqrt((i + 0.5) / 120)
            x, y = math.cos(a) * r + rng.uniform(-8, 8), math.sin(a) * r * sq + rng.uniform(-8, 8)
            z = height(x, y)
            if z < 4:
                continue
            w, t = rng.uniform(9, 14), rng.uniform(20, 32)
            ph = rng.uniform(0, TAU)
            base = [b.v((x + math.cos(ph + TAU * k / 3) * w, y + math.sin(ph + TAU * k / 3) * w, max(0.0, z - 7))) for k in range(3)]
            top = b.v((x, y, z + t))
            keys = ('forest3', 'forest', 'forest2')
            for k in range(3):
                b.face((base[k], base[(k + 1) % 3], top), keys[(k + i) % 3])
        reg(b.done(), dict(kind='distant', trunk_radius=0.0))

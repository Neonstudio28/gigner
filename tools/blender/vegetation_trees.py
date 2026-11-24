"""Trees. Broadleaf: forked trunk, limbs, leaf clumps with leaf chips. Conifer: whorls of drooping boughs.
Every tree is a seeded layout realised twice: full, and `_far` (same silhouette and colours, few triangles)."""
import math, random
from mathutils import Matrix, Vector
from vegetation_gen import B, UP, TAU, lerp, smooth, bez, rand_dir, leaf_tone


def tree_layout(p):
    rng = random.Random(p['seed'])
    H, R, tr, fork = p['h'], p['spread'] / 2, p['trunk_r'], p['fork']
    cb = p.get('canopy_base', fork * 0.85)
    cz, rz = (H + cb) / 2, (H - cb) / 2
    off = Vector(p.get('offset', (0, 0, 0)))
    C = Vector((off.x, off.y, cz))
    cr, flat = p['clump'] * R, p.get('flat', 0.68)
    topz = cz + rz * p.get('leader', 0.35)
    wob = p.get('wobble', 0.03) * H
    tx, ty = off.x + rng.uniform(-wob, wob), off.y + rng.uniform(-wob, wob)
    tp, trd = [], []
    for f, m in ((0, p.get('flare', 1.9)), (0.06, 1.42), (0.2, 1.1), (0.55, 1.0), (1.0, 0.86)):
        k = f * fork / topz
        tp.append(Vector((tx * k * k, ty * k * k, f * fork)))
        trd.append(tr * m)
    for f, m in ((0.35, 0.6), (0.7, 0.36), (1.0, 0.14)):
        z = fork + (topz - fork) * f
        k = z / topz
        tp.append(Vector((tx * k * k + rng.uniform(-wob, wob) * 0.4, ty * k * k + rng.uniform(-wob, wob) * 0.4, z)))
        trd.append(tr * m)

    def at(z):
        z = min(max(z, 0.0), topz)
        for i in range(len(tp) - 1):
            if tp[i + 1].z >= z:
                t = (z - tp[i].z) / max(1e-6, tp[i + 1].z - tp[i].z)
                return tp[i].lerp(tp[i + 1], t), lerp(trd[i], trd[i + 1], t)
        return tp[-1], trd[-1]

    def shell(a, e, k, r):
        d = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))
        rh, rv = max(R - r * 0.9, R * 0.25), max(rz - r * flat * 0.9, rz * 0.25)
        return C + Vector((d.x * rh, d.y * rh, d.z * rv)) * k

    limbs, subs, twigs, clumps = [], [], [], []
    nL, a0 = p['limbs'], rng.uniform(0, TAU)
    el, kc = p.get('limb_el', (-0.15, 0.75)), p.get('curve', 0.3)
    lz = p.get('limb_z', (0.82, 1.18))
    for i in range(nL):
        a = a0 + TAU * i / nL + rng.uniform(-0.3, 0.3)
        s, sr = at(fork * rng.uniform(*lz))
        rc = cr * rng.uniform(0.9, 1.2)
        tgt = shell(a, rng.uniform(*el), rng.uniform(0.85, 1.0), rc)
        d = tgt - s
        ctrl = Vector((s.x + d.x * lerp(0.75, 0.2, kc), s.y + d.y * lerp(0.75, 0.2, kc), s.z + d.z * lerp(0.1, 0.85, kc)))
        r0, r1 = sr * p.get('limb_r', 0.6), max(0.03, tr * 0.1)
        ts = (0, 0.2, 0.4, 0.6, 0.8, 1)
        limbs.append(([bez(s, ctrl, tgt, t) for t in ts], [lerp(r0, r1, t ** 0.8) for t in ts]))
        clumps.append((tgt, rc))
        for q in range(p.get('subs', 2)):
            t0 = rng.uniform(0.3, 0.8)
            bs, br = bez(s, ctrl, tgt, t0), lerp(r0, r1, t0 ** 0.8) * 0.7
            rc2 = cr * rng.uniform(0.7, 1.0)
            t2 = shell(a + rng.choice((-1, 1)) * rng.uniform(0.35, 1.0), rng.uniform(el[0], min(1.35, el[1] + 0.4)),
                       rng.uniform(0.8, 1.0), rc2)
            d2 = t2 - bs
            if d2.length > R * 0.7:
                t2 = bs + d2.normalized() * R * 0.7
            mid = bs.lerp(t2, 0.5) + UP * (d2.length * (0.14 if kc > 0.5 else -0.06))
            subs.append(([bs, bez(bs, mid, t2, 0.35), bez(bs, mid, t2, 0.7), t2], [br, br * 0.75, br * 0.5, max(0.025, br * 0.3)]))
            clumps.append((t2, rc2))
    rt = cr * rng.uniform(1.0, 1.15)
    clumps.append((Vector((tp[-1].x, tp[-1].y, H - rt * flat)), rt))
    nodes = [(q, r) for path, rad in limbs + subs for q, r in zip(path[1:], rad[1:])] + list(zip(tp[5:], trd[5:]))
    nF = p.get('fill', 10)
    for k in range(nF):
        zf = 1 - (k + 0.5) / nF * (1 + p.get('low', 0.2))
        rc = cr * rng.uniform(0.75, 1.1)
        c = shell(a0 + k * 2.39996, math.asin(max(-1.0, min(1.0, zf))), rng.uniform(0.88, 1.0), rc)
        clumps.append((c, rc))
        q, r = min(nodes, key=lambda n: (n[0] - c).length)
        if (q - c).length > rc * 0.5:
            r = min(r * 0.6, tr * 0.25)
            twigs.append(([q, q.lerp(c, 0.5) - UP * (q - c).length * 0.05, c], [r, r * 0.7, max(0.02, r * 0.4)]))
    return dict(trunk=(tp, trd), at=at, limbs=limbs, subs=subs, twigs=twigs, clumps=clumps, C=C, R=R, rz=rz, cr=cr,
                flat=flat, topz=topz)


def tree_into(b, p, far=False):
    L = tree_layout(p)
    rng = random.Random(p['seed'] * 31 + (5 if far else 3))
    tp, trd = L['trunk']
    seed, tr, H = p['seed'], p['trunk_r'], p['h']
    bark2 = lambda i, j: 'bark2' if (i * 7 + j * 13 + seed) % 6 == 0 else None
    if far:
        b.tube([tp[0], tp[2], tp[4], tp[-1]], [trd[0] * 0.8, trd[2], trd[4], trd[-1]], 5, 'bark', level0=True)
    else:
        nlob, sides, ph = p.get('lobes', 5), p.get('sides', 10), rng.uniform(0, TAU)
        ringfn = lambda i, a: 1 + (0.34 if i == 0 else 0.14 if i == 1 else 0) * max(0.0, math.cos(nlob * (a - ph)))
        pts, rad, fk = tp, trd, bark2
        if p.get('marks'):  # birch: short rings carry dark dashes
            pts, rad, z, i = [tp[0], tp[1]], [trd[0], trd[1]], tp[1].z, 0
            while z < L['topz'] - 0.3:
                z += 0.07 if i % 2 else rng.uniform(0.3, 0.6)
                q, r = L['at'](z)
                pts.append(q)
                rad.append(r)
                i += 1
            pts.append(tp[-1])
            rad.append(trd[-1])
            arcs = [rng.randrange(sides) for _ in pts]
            fk = lambda i, j: 'bark2' if i >= 2 and i % 2 == 1 and (j - arcs[i]) % sides < 3 else None
        b.tube(pts, rad, sides, 'bark', ringfn=ringfn, facekey=fk, phase=ph, level0=True)
        for k in range(p.get('roots', nlob)):
            a = ph + TAU * k / nlob
            d, ln = Vector((math.cos(a), math.sin(a), 0)), rng.uniform(3.0, 4.2)
            b.tube([d * tr * 0.6 + UP * tr * 1.7, d * tr * 1.9 + UP * tr * 0.5, d * tr * ln], [tr * 0.42, tr * 0.3, 0], 5,
                   'bark2' if k % 2 else 'bark')
    leafless = p.get('leafless')
    for path, rad in L['limbs']:
        if far:
            b.tube([path[0], path[2], path[5]], [rad[0], rad[2], rad[5]], 3, 'bark')
        else:
            b.tube(path, rad, 6, 'bark', facekey=bark2)
    for path, rad in L['subs']:
        if far and leafless:
            b.tube([path[0], path[3]], [rad[0], rad[3]], 3, 'bark')
        elif not far:
            b.tube(path, rad, 5, 'bark', facekey=bark2)
    if not far:
        for path, rad in L['twigs']:
            b.tube(path, rad, 4, 'bark2')
    cl, cr, flat, C = L['clumps'], L['cr'], L['flat'], L['C']
    if leafless:
        for c, r in cl[:-1]:
            for k in range(1 if far else 3):
                d = rand_dir(rng, -0.1, 1.0)
                e = c + d * r * rng.uniform(0.7, 1.3)
                b.tube([c - d * 0.1, c.lerp(e, 0.5) + rand_dir(rng) * r * 0.12, e], [0.05 + tr * 0.06, 0.03 + tr * 0.03, 0],
                       3 if far else 4, 'bark2' if k else 'bark')
        return L
    if far:
        cl = sorted(cl, key=lambda c: -c[1])[:p.get('far_clumps', 16)]
    leaf = p['leaf']
    for c, r in cl:
        tone = leaf_tone(rng, 0.35 * (c.z - C.z) / L['rz'])
        rot = Matrix.Rotation(rng.uniform(0, TAU), 4, 'Z') @ Matrix.Rotation(rng.uniform(-0.3, 0.3), 4, 'X')
        rr = r * (1.25 if far else 1.0)
        vs = b.blob(c, (rr, rr * rng.uniform(0.85, 1.1), rr * flat), tone, rng, sub=1 if far or r < cr * 0.95 else 2,
                    jit=0.1 if far else 0.14, rot=rot)
        vs = [q for q in vs if q[1].z > -0.45] or vs
        npl = (2 if rng.random() < p.get('far_plates', 0.6) else 1) if far else round(p['plates'] * (r / cr) ** 2)
        for _ in range(npl):
            pos, d = rng.choice(vs)
            sz = leaf * rng.uniform(0.75, 1.3) * (1.9 if far else 1.0)
            n = d * 0.55 + UP * p.get('plate_up', 0.5) + rand_dir(rng) * 0.4
            b.chip(pos + d * sz * 0.12 + rand_dir(rng) * sz * 0.25, n, sz, tone(Vector((0, 0, d.z + 0.3))),
                   'leaf3' if rng.random() < 0.7 else 'leaf', rng, aspect=p.get('aspect', 1.3))
    if p.get('droop'):  # willow curtains
        for c, r in cl:
            out = Vector((c.x - C.x, c.y - C.y, 0))
            if out.length < L['R'] * 0.3:
                continue
            for _ in range(2 if far else p['droop']):
                a = rng.uniform(0, TAU)
                s = c + Vector((math.cos(a) * r * 0.8, math.sin(a) * r * 0.8, -r * flat * 0.2))
                ln = min(s.z - p.get('droop_min', 0.9), rng.uniform(0.3, 0.6) * H)
                if ln < 0.6:
                    continue
                o = Vector((s.x, s.y, 0)).normalized()
                wd = p.get('strand_w', 0.26) * (2.4 if far else 1.0) * rng.uniform(0.8, 1.2)
                pts = [s, s - UP * ln * 0.35 + o * ln * 0.05, s - UP * ln * 0.7 + o * ln * 0.03, s - UP * ln]
                b.blade(pts[::2] + pts[3:] if far else pts, [wd, wd * 0.6, 0] if far else [wd, wd * 0.9, wd * 0.6, 0],
                        rng.choice(('leaf', 'leaf2', 'leaf2', 'leaf4')), 'leaf3', ridge=0.4, side=(-o.y, o.x, 0))
    for i in range(p.get('fruit', 0) // (3 if far else 1)):
        c, r = rng.choice(cl)
        d = rand_dir(rng, -0.7, 0.2)
        b.blob(c + Vector((d.x * r, d.y * r, d.z * r * flat)) * 1.03, 0.11 if far else 0.075, 'fruit', rng, sub=1, jit=0.0)
    return L


def conifer_into(b, p, far=False):
    rng = random.Random(p['seed'])
    r2 = random.Random(p['seed'] * 17 + (2 if far else 1))
    H, R, tr, cb = p['h'], p.get('r', 1.0), p['trunk_r'], p.get('crown_base', 1.0)
    snag = p.get('snag')
    lean = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * p.get('lean', 0.012) * H
    prof = [(0, p.get('flare', 1.7)), (0.015, 1.3), (0.05, 1.05), (0.3, 0.82), (0.6, 0.55), (0.85, 0.27), (1.0, 0.0)]
    if snag:
        prof = prof[:3] + [(0.4, 0.85), (0.75, 0.66), (1.0, 0.5)]
    at = lambda z: Vector((lean.x * (z / H) ** 2, lean.y * (z / H) ** 2, z))

    def rad(z):
        f = z / H
        for (f0, m0), (f1, m1) in zip(prof, prof[1:]):
            if f <= f1:
                return tr * lerp(m0, m1, (f - f0) / (f1 - f0))
        return tr * prof[-1][1]
    seed = p['seed']
    if p.get('no_trunk'):
        pass
    elif far:
        fs = (0, 0.05, 0.6, 1.0)
        b.tube([at(f * H) for f in fs], [rad(f * H) for f in fs], 5, 'bark', level0=True)
    else:
        ph = rng.uniform(0, TAU)
        b.tube([at(f * H) for f, m in prof], [tr * m for f, m in prof], 8, 'bark', level0=True, phase=ph,
               ringfn=lambda i, a: 1 + (0.3 if i == 0 else 0.1 if i == 1 else 0) * max(0.0, math.cos(4 * (a - ph))),
               facekey=lambda i, j: 'bark2' if (i * 5 + j * 3 + seed) % 5 == 0 else None)
    if snag and not p.get('no_trunk'):
        top = at(H)
        for k in range(3 if far else 5):
            d = rand_dir(r2, 0, 0) * rad(H) * 0.55
            b.tube([top + d - UP * 0.3, top + d * 1.1 + UP * r2.uniform(0.3, 1.3)], [rad(H) * 0.45, 0], 3 if far else 4,
                   'bark2' if k % 2 else 'bark')
    stubs = p.get('stubs', 5 if cb > 2.5 else 0)
    for k in range(stubs // (3 if far else 1)):
        z = r2.uniform(0.25, 0.95) * (H if snag else cb)
        d = rand_dir(r2, 0, 0)
        ln = r2.uniform(0.5, 1.3) * (1 + (2.2 * (1 - z / H) if snag else 0))
        c = at(z)
        b.tube([c, c + d * ln * 0.6 - UP * ln * 0.05, c + d * ln - UP * ln * r2.uniform(0.0, 0.3)],
               [rad(z) * 0.3, rad(z) * 0.2, 0], 3 if far else 4, 'bark2')
    if snag:
        return
    n = p['tiers']
    tiers = []
    for i in range(n):
        t = i / (n - 1)
        z = cb + (H * 0.97 - cb) * t ** p.get('zpow', 0.9)
        Lb = R * (0.1 + 0.9 * (1 - t) ** p.get('taper', 0.8)) * (0.6 + 0.4 * smooth(0, 0.18, t)) * rng.uniform(0.85, 1.1)
        tiers.append((z, max(Lb, p.get('min_len', 0.4)), lerp(p.get('el_low', -0.2), p.get('el_top', 1.0), t ** 1.3),
                      lerp(p.get('droop_low', 0.5), p.get('droop_top', 0.1), t),
                      max(3, round(p['boughs'] * (0.55 + 0.45 * (1 - t)))), rng.uniform(0, TAU)))
    if far:
        step = max(1, round(n / p.get('far_skirts', 8)))
        groups = [tiers[i:i + step] for i in range(0, n, step)]
        for gi, g in enumerate(groups):
            z, _, el, dr, k, a0 = g[0]
            Lb = max(q[1] for q in g)
            c = at(z)
            znext = groups[gi + 1][0][0] if gi + 1 < len(groups) else H
            apex = b.v(at(min(H, z + max(Lb * 0.45, (znext - z) * 1.7))))
            under = b.v(c + UP * (Lb * (math.sin(el) * 0.5 - dr * 0.25) - 0.1 * Lb))
            ks, ring = max(5, k), []
            for j in range(2 * ks):
                a, u = a0 + TAU * j / (2 * ks), (1.03 if j % 2 == 0 else 0.55)
                ring.append(b.v(c + Vector((math.cos(a), math.sin(a), 0)) * Lb * u + UP * Lb * (math.sin(el) * u - dr * u * u)))
            for j in range(2 * ks):
                q = ring[(j + 1) % (2 * ks)]
                b.face((apex, ring[j], q), ('leaf', 'leaf2', 'leaf', 'leaf4')[(j + gi) % 4] if j % 3 else 'leaf2')
                b.face((under, q, ring[j]), 'leaf3')
        return
    fingers = p.get('fingers', 4)
    # dark inner core so the trunk does not show through the crown
    z0, nc = cb + (H - cb) * 0.12, 7
    rings = []
    for i in range(nc):
        t = i / (nc - 1)
        z = lerp(z0, H * 0.97, t)
        rr = R * p.get('core', 0.2) * (1 - t) ** 0.8 + rad(z) + 0.08
        ph = r2.uniform(0, TAU)
        rings.append([b.v(at(z) + Vector((math.cos(ph + TAU * j / 5), math.sin(ph + TAU * j / 5), 0)) * rr * r2.uniform(0.8, 1.2)
                          - UP * rr * r2.uniform(0, 0.5)) for j in range(5)])
    b.skin(rings, 'leaf3', True, facekey=lambda i, j: 'leaf' if (i + j) % 3 == 0 else None)
    top = at(H * 0.965)
    b.blade([top, top + UP * H * 0.02, at(H) + UP * H * 0.035], [0.1 + R * 0.03, 0.14 + R * 0.04, 0], 'leaf2', 'leaf', ridge=0.9, sag=0.9)
    for z, Lb, el, dr, k, a0 in tiers:
        c = at(z)
        for j in range(k):
            a = a0 + TAU * j / k + r2.uniform(-0.25, 0.25)
            Lj = Lb * r2.uniform(0.8, 1.1)
            d = Vector((math.cos(a), math.sin(a), 0))
            P = lambda u: c + d * (Lj * u) + UP * (Lj * (math.sin(el) * u - dr * u * u))
            W = max(Lj * p.get('bw', 0.24), 0.16)
            k1, k2 = r2.choice((('leaf', 'leaf2'), ('leaf2', 'leaf'), ('leaf', 'leaf'), ('leaf2', 'leaf4')))
            tip = r2.random() < 0.4
            b.blade([P(0), P(0.35), P(0.75), P(1)], [W * 0.3, W * 0.9, W * 0.85, 0],
                    (lambda i: 'leaf4' if tip and i >= 2 else k1), 'leaf3', ridge=0.35, sag=0.3, key2=k2)
            for u0, sg in ((0.4, 1), (0.4, -1), (0.7, 1), (0.7, -1))[:fingers if Lj > 0.9 else 2]:
                d2 = Matrix.Rotation(sg * r2.uniform(0.6, 0.9), 3, 'Z') @ d
                L2, s = Lj * (1 - u0) * r2.uniform(0.75, 1.0) + 0.08 * Lj, P(u0)
                Q = lambda u: s + d2 * (L2 * u) + UP * (L2 * (math.sin(el) * 0.5 * u - (dr + 0.15) * u * u))
                b.blade([Q(0), Q(0.5), Q(1)], [W * 0.45, W * 0.7, 0], k2 if sg > 0 else k1, 'leaf3', ridge=0.35, sag=0.3)


def _stakes(b, far):
    """Two bevelled stakes with a strap around the sapling, and a mulch ring."""
    for sx in (-0.42, 0.42):
        b.box((sx, 0, 0.75), (0.07, 0.07, 1.5), '#b89868', bevel=0.0 if far else 0.012)
        if not far:
            b.box((sx, 0, 1.3), (0.09, 0.09, 0.05), '#3a3a3c', bevel=0.008)
    b.tube([(-0.42, 0, 1.3), (-0.2, 0.04, 1.27), (0, 0.06, 1.25), (0.2, 0.04, 1.27), (0.42, 0, 1.3)], [0.016] * 5,
           3 if far else 5, '#3a3a3c')
    b.lathe([(0.0, 0.0), (0.62, 0.0), (0.55, 0.05), (0.0, 0.06)] if far else [(0.0, 0.0), (0.62, 0.0), (0.6, 0.04), (0.5, 0.07), (0.0, 0.08)],
            6 if far else 12, '#5a4030', cap0=False, cap1=False)


BROAD = {
    'oak_large': dict(seed=11, h=16, spread=18, trunk_r=0.6, fork=3.6, canopy_base=4.4, limbs=5, subs=2, fill=20,
                      clump=0.27, flat=0.66, plates=17, leaf=0.95, curve=0.25, far_clumps=18),
    'oak_medium': dict(seed=12, h=11, spread=12, trunk_r=0.36, fork=2.6, canopy_base=3.0, limbs=4, subs=2, fill=15,
                       clump=0.3, flat=0.66, plates=15, leaf=0.8, curve=0.25, far_clumps=16),
    'oak_young': dict(seed=13, h=6.5, spread=6, trunk_r=0.16, fork=1.9, limbs=3, subs=2, fill=8, clump=0.36, plates=16,
                      leaf=0.55, far_clumps=13),
    'maple_large': dict(seed=21, h=14, spread=13, trunk_r=0.42, fork=2.8, canopy_base=3.0, limbs=5, subs=2, fill=18,
                        clump=0.28, flat=0.8, plates=15, leaf=0.85, curve=0.6, pal='maple', far_clumps=18),
    'maple_medium': dict(seed=22, h=9, spread=8.5, trunk_r=0.26, fork=2.2, limbs=4, subs=2, fill=12, clump=0.32, flat=0.8,
                         plates=17, leaf=0.65, curve=0.6, pal='maple', far_clumps=15),
    'poplar_tall': dict(seed=31, h=18, spread=4.6, trunk_r=0.3, fork=2.0, canopy_base=1.8, limbs=6, subs=1, fill=14,
                        clump=0.55, flat=1.4, low=0.9, plates=13, leaf=0.6, curve=0.95, limb_el=(0.2, 1.3),
                        limb_z=(0.9, 3.5), plate_up=1.2, far_clumps=17, wobble=0.008),
    'willow_lake': dict(seed=41, h=10, spread=13, trunk_r=0.45, fork=2.4, canopy_base=4.6, limbs=5, subs=2, fill=10,
                        clump=0.3, flat=0.6, low=0.1, plates=11, leaf=0.7, pal='willow', droop=4, far_clumps=12),
    'apple_tree': dict(seed=51, h=4.6, spread=5.2, trunk_r=0.13, fork=1.3, limbs=4, subs=2, fill=6, clump=0.38, plates=10,
                       leaf=0.42, fruit=24, far_clumps=12),
    'street_tree': dict(seed=61, h=7, spread=4.6, trunk_r=0.12, fork=2.4, canopy_base=2.5, limbs=4, subs=2, fill=9,
                        clump=0.4, flat=0.85, plates=16, leaf=0.5, curve=0.7, wobble=0.008, far_clumps=14),
    'dead_tree': dict(seed=71, h=9, spread=8, trunk_r=0.32, fork=2.4, limbs=5, subs=3, fill=0, clump=0.3, leafless=True,
                      bark='dead', leaf=0.5, plates=0),
    'sapling_staked': dict(seed=81, h=3.2, spread=1.7, trunk_r=0.035, fork=1.7, limbs=3, subs=1, fill=4, clump=0.5,
                           plates=14, leaf=0.3, roots=0, flare=1.3, sides=6, wobble=0.004, far_clumps=8, extra=_stakes),
    'pine_tall': dict(seed=91, h=22, spread=9, trunk_r=0.36, fork=12, canopy_base=12.5, limbs=6, subs=2, fill=8,
                      clump=0.34, flat=0.5, plates=17, leaf=0.8, curve=0.15, pal='pine', bark='pine', plate_up=0.9,
                      aspect=2.0, limb_el=(-0.2, 0.6), limb_z=(0.85, 1.5), far_clumps=16, stubs=6),
    'pine_medium': dict(seed=92, h=13, spread=7, trunk_r=0.24, fork=6.5, canopy_base=6.8, limbs=5, subs=2, fill=7,
                        clump=0.36, flat=0.5, plates=15, leaf=0.65, curve=0.15, pal='pine', bark='pine', plate_up=0.9,
                        aspect=2.0, limb_el=(-0.2, 0.6), limb_z=(0.85, 1.5), far_clumps=15, stubs=4),
}
BIRCH = [dict(seed=101 + i, h=h, spread=4.6, trunk_r=r, fork=3.6, limbs=3, subs=1, fill=3, clump=0.42, flat=0.75, plates=9,
              leaf=0.5, pal='birch', bark='birch', marks=True, sides=8, lobes=4, roots=2, far_clumps=5, offset=o, wobble=0.01)
         for i, (h, r, o) in enumerate(((10.5, 0.12, (1.3, 0.2, 0)), (9.2, 0.1, (-0.9, 1.0, 0)), (8.4, 0.09, (-0.5, -1.3, 0))))]
CONIFER = {
    'douglas_fir_tall': dict(seed=201, h=28, r=4.6, trunk_r=0.5, crown_base=7.5, tiers=17, boughs=7, far_skirts=15),
    'douglas_fir_medium': dict(seed=202, h=18, r=3.6, trunk_r=0.32, crown_base=3.2, tiers=13, boughs=6, far_skirts=13),
    'fir_young': dict(seed=203, h=8, r=2.3, trunk_r=0.13, crown_base=0.7, tiers=10, boughs=6, far_skirts=10),
    'spruce_blue': dict(seed=204, h=11, r=2.9, trunk_r=0.2, crown_base=0.5, tiers=12, boughs=7, el_low=-0.05,
                        droop_low=0.3, bw=0.26, taper=0.95, pal='spruce', far_skirts=12),
    'cedar_broad': dict(seed=205, h=17, r=5.2, trunk_r=0.6, crown_base=2.2, tiers=12, boughs=6, el_low=-0.1, el_top=0.5,
                        droop_low=0.75, droop_top=0.35, bw=0.26, flare=2.3, pal='cedar', bark='cedar', far_skirts=12),
    'snag_conifer': dict(seed=206, h=14, trunk_r=0.4, snag=True, stubs=14, bark='dead'),
}


def build(reg):
    """reg(object, extras) registers a finished asset."""
    def pair(name, make, kind, tr, **ex):
        for far in (False, True):
            b = make(far)
            reg(b.done(), dict(kind=kind, trunk_radius=tr, **({'full': name} if far else {'far': name + '_far'}), **ex))

    for name, p in BROAD.items():
        def make(far, name=name, p=p):
            b = B(name + ('_far' if far else ''), p.get('pal', ''), p.get('bark', ''))
            tree_into(b, p, far)
            if p.get('stubs'):
                conifer_into(b, dict(seed=p['seed'], h=p['fork'], trunk_r=p['trunk_r'], snag=True, no_trunk=True, stubs=p['stubs'], lean=0), far)
            if p.get('extra'):
                p['extra'](b, far)
            return b
        pair(name, make, 'dead' if p.get('leafless') else 'broadleaf', p['trunk_r'], canopy_radius=p['spread'] / 2,
             canopy_base=p.get('canopy_base', round(p['fork'] * 0.85, 2)))

    def birch(far):
        b = B('birch_cluster' + ('_far' if far else ''), 'birch', 'birch')
        for i, p in enumerate(BIRCH):
            t = b.child()
            tree_into(t, p, far)
            a = 0.4 + TAU * i / 3
            b.absorb(t, Matrix.Translation((math.cos(a) * 0.38, math.sin(a) * 0.38, 0)))
        return b
    pair('birch_cluster', birch, 'broadleaf', 0.45, canopy_radius=3.6, canopy_base=3.0)
    for name, p in CONIFER.items():
        def make(far, name=name, p=p):
            b = B(name + ('_far' if far else ''), p.get('pal', 'fir'), p.get('bark', 'fir'))
            conifer_into(b, p, far)
            return b
        pair(name, make, 'dead' if p.get('snag') else 'conifer', p['trunk_r'], canopy_radius=p.get('r', 0.5),
             canopy_base=p.get('crown_base', 0))

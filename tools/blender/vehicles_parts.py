"""Detail generators shared by every vehicle: seams and strips that follow the body, bumpers, lamps, grilles,
mirrors, handles, plates, exhausts and the furnished cabin (seats, dashboard, steering wheel, door cards)."""
import math
from mathutils import Matrix, Vector
from vehicles_kit import Kit, lin, ALIAS


def _dense(path, L, top=False):
    """Adds the points where a polyline crosses the facet borders of the loft (stations, crease, shoulder)."""
    out = [tuple(path[0])]
    for (x0, c0), (x1, c1) in zip(path, path[1:]):
        ts = {1.0}
        if abs(x1 - x0) > 1e-6:
            ts |= {(x - x0) / (x1 - x0) for x in L.xs if min(x0, x1) + 1e-4 < x < max(x0, x1) - 1e-4}
        if abs(c1 - c0) > 1e-6:
            p = L.base((x0 + x1) / 2)
            cuts = (0.0, p[6][0], -p[6][0]) if top else (p[2][1], p[3][1], p[4][1])
            ts |= {t for t in ((c - c0) / (c1 - c0) for c in cuts) if 1e-3 < t < 1 - 1e-3}
        out += [(x0 + (x1 - x0) * t, c0 + (c1 - c0) * t) for t in sorted(ts)]
    return out


def _rows(pts, w, fn):
    rows = []
    for i, p in enumerate(pts):
        p = Vector(p)
        din = (p - Vector(pts[i - 1])).normalized() if i > 0 else None
        dout = (Vector(pts[i + 1]) - p).normalized() if i < len(pts) - 1 else None
        d = ((din or dout) + (dout or din)).normalized()
        n = Vector((-d.y, d.x)) * (w / 2 / max(0.5, d.dot(din or dout)))
        rows.append([fn(p - n), fn(p + n)])
    return rows


def side_strip(v, path, w, m, t=0.004, L=None, k=None, sym=True):
    """Thin strip (seam, moulding, stripe) following the flank along a side-view polyline [(x, z), ...]."""
    L, k = L or v.L, k or v.k
    rows = _rows(_dense(path, L), w, lambda q: (q.x, L.side_y(q.x, q.y) + t, q.y))
    if sym:
        with k.sym():
            k.patch(rows, m, (0, 1, 0))
    else:
        k.patch(rows, m, (0, 1, 0))


def top_strip(v, path, w, m, t=0.004, L=None, k=None, sym=False):
    """Thin strip on the upper surface along a plan-view polyline [(x, y), ...]."""
    L, k = L or v.L, k or v.k
    rows = _rows(_dense(path, L, True), w, lambda q: (q.x, q.y, L.top_z(q.x, q.y) + t))
    if sym:
        with k.sym():
            k.patch(rows, m, (0, 0, 1))
    else:
        k.patch(rows, m, (0, 0, 1))


def side_panel(v, x0, x1, z0, z1, m, t=0.006, L=None, k=None, walls=True, medge=None):
    """Raised panel on both flanks between x0..x1 and z0..z1 (z may be [(x, z), ...] lines)."""
    L, k = L or v.L, k or v.k
    grid = []
    for x in L.xs_between(x0, x1):
        p = L.base(x)
        a, b = lin(z0, x), lin(z1, x)
        zs = [a, min(max(p[3][1], a), b), min(max(p[4][1], a), b), b]
        grid.append([(x, L.side_y(x, z), z) for z in zs])
    with k.sym():
        if walls:
            k.slab(grid, m, t, (0, 1, 0), medge)
        else:
            k.patch([[(p[0], p[1] + t, p[2]) for p in r] for r in grid], m, (0, 1, 0))


def top_panel(v, x0, x1, y0, y1, m, t=0.006, L=None, k=None, medge=None):
    """Raised panel on the upper surface between x0..x1 and y0..y1 (y0 < y1, may straddle the centre line)."""
    L, k = L or v.L, k or v.k
    grid = []
    for x in L.xs_between(x0, x1):
        hw = L.base(x)[6][0]
        ys = sorted({y0, y1, *[c for c in (-hw, 0.0, hw) if y0 < c < y1]})
        while len(ys) < 5:
            ys.append(ys[-1])
        grid.append([(x, y, L.top_z(x, y)) for y in ys])
    k.slab(grid, m, t, (0, 0, 1), medge)


def bumper(v, x, hw, z, h=0.12, d=0.09, wrap=0.3, m='chrome', strip='black', sign=1, corner=0.08, guards=(), bev=0.02, k=None):
    """Bumper bar wrapped round the corners; x is the body face it sits against, sign +1 front / -1 rear."""
    k = k or v.k
    xc = x + sign * d * 0.4
    path = [(xc - sign * wrap, hw, z), (xc - sign * corner, hw, z), (xc, hw - corner, z), (xc, -hw + corner, z),
            (xc - sign * corner, -hw, z), (xc - sign * wrap, -hw, z)]
    k.bar(path, d, h, m, bev)
    if strip:
        k.bar(path, d + 0.022, h * 0.3, strip)
    for gy in guards:
        for s in (1, -1):
            k.box((xc + sign * 0.035, s * gy, z), (d, 0.07, h + 0.06), strip or m, 0.018)


def lamp(k, x, y, z, w, h, m, sign=1, d=0.03, bezel='chrome', bz=0.012, bev=0.008, sym=True):
    """Rectangular lamp facing +-X in a bezel; mirrored to -y unless sym is False."""
    def one(yy):
        if bezel:
            k.box((x + sign * (d / 2 - 0.008), yy, z), (d, w + 2 * bz, h + 2 * bz), bezel, bev)
        k.box((x + sign * d / 2, yy, z), (d, w, h), m, bev * 0.6)
    one(y)
    if sym:
        one(-y)


def round_lamp(k, x, y, z, r, m, sign=1, bezel='chrome', seg=10, sym=True, d=0.03):
    for yy in ((y, -y) if sym else (y,)):
        k.lathe((x - sign * 0.01, yy, z), (sign, 0, 0), [(0, r + 0.014), (d, r + 0.014, bezel), (d + 0.006, r + 0.004, bezel), (d, r, bezel),
                                                         (d + 0.008, r * 0.6, m), (d + 0.01, 0, m)], bezel, seg)


def side_lamp(v, x, z, m, w=0.1, h=0.04, L=None):
    """Marker lamp on both flanks."""
    L = L or v.L
    with v.k.sym():
        v.k.box((x, L.side_y(x, z) + 0.002, z), (w, 0.016, h), m, 0.005)


def grille(v, x, y0, y1, z0, z1, sign=1, bars=5, vertical=False, m='chrome', bg='grille', depth=0.05, frame=0.014, target=0):
    """Recessed grille: a pocket cut into the body face at x, a frame and bars."""
    k = v.k
    yc, zc, w, h = (y0 + y1) / 2, (z0 + z1) / 2, y1 - y0, z1 - z0
    v.cut_box((x, yc, zc), (2 * depth, w, h), bg, target=target)
    xb = x - sign * 0.012
    if frame:
        for (c, s_) in (((x - sign * 0.004, yc, z0 + frame / 2), (0.03, w, frame)), ((x - sign * 0.004, yc, z1 - frame / 2), (0.03, w, frame)),
                        ((x - sign * 0.004, y0 + frame / 2, zc), (0.03, frame, h)), ((x - sign * 0.004, y1 - frame / 2, zc), (0.03, frame, h))):
            k.box(c, s_, m)
    for i in range(bars):
        f = (i + 1) / (bars + 1)
        if vertical:
            k.box((xb, y0 + w * f, zc), (0.016, 0.014, h - 2 * frame), m)
        else:
            k.box((xb, yc, z0 + h * f), (0.016, w - 2 * frame, 0.014), m)


def mirror(v, x, y, z, m='chrome', size=(0.06, 0.15, 0.1), right=True):
    k = v.k
    for s in ((1, -1) if right else (1,)):
        k.box((x, s * (y + 0.03), z - 0.02), (0.035, 0.09, 0.03), m, 0.008)
        k.box((x, s * (y + 0.1), z + 0.01), size, m, 0.02)
        k.box((x - size[0] / 2 - 0.001, s * (y + 0.1), z + 0.01), (0.006, size[1] - 0.035, size[2] - 0.035), 'paint:#93a6b0')


def handle(v, x, z, m='chrome', L=None, w=0.12):
    L = L or v.L
    with v.k.sym():
        v.k.box((x, L.side_y(x, z) + 0.006, z), (w, 0.022, 0.03), m, 0.007)
        v.k.box((x, L.side_y(x, z) + 0.001, z - 0.004), (w + 0.03, 0.006, 0.05), 'black')


def plate(k, x, z, sign=1, y=0.0):
    k.box((x + sign * 0.006, y, z), (0.012, 0.34, 0.18), 'trim')
    k.box((x + sign * 0.012, y, z), (0.012, 0.3, 0.15), 'plate')
    k.box((x + sign * 0.018, y, z + 0.045), (0.004, 0.26, 0.03), 'paint:#35508f')
    k.box((x + sign * 0.018, y, z - 0.018), (0.004, 0.2, 0.05), 'paint:#3a3c40')


def exhaust(k, x, y, z, length=0.3, r=0.03, m='chrome'):
    k.cyl((x + length, y, z), (x, y, z), r, m, 8, mcap='under')
    k.cyl((x + 0.001, y, z), (x - 0.004, y, z), r * 0.72, 'under', 8)


def wipers(v, P0, P1, yy, n=2):
    """Parked wiper arms and blades lying on the windscreen (P0 base, P1 top in side view; yy(z) = half width)."""
    k = v.k
    d = Vector((P1[0] - P0[0], 0, P1[1] - P0[1])).normalized()
    base = Vector((P0[0], 0, P0[1])) + Vector((d.z, 0, -d.x)) * 0.016
    w = yy(P0[1])
    for i in range(n):
        y = w * (0.62 - i * 0.92)
        a = base + Vector((0, y, 0)) + d * 0.02
        b = base + Vector((0, y - w * 0.5, 0)) + d * 0.07
        k.tube([a, b], 0.007, 'black', 4)
        k.tube([b + Vector((0, 0.2, 0)) + d * 0.0, b + Vector((0, -0.24, 0)) + d * 0.03], 0.011, 'black', 4)


def antenna(k, x, y, z, h=0.75, m='steel'):
    k.cyl((x, y, z), (x - 0.04, y, z + h), 0.005, m, 4)
    k.cyl((x, y, z - 0.005), (x, y, z + 0.03), 0.014, 'black', 6)

def seat(k, x, y, z, w=0.5, m='int', h=0.6, rake=20, head=True, cush=0.5, m2=None):
    """Seat on the floor at z; x is where the cushion meets the backrest (the hip point is about 0.12 ahead)."""
    k.box((x + cush / 2 - 0.05, y, z + 0.075), (cush, w, 0.15), m, 0.04)
    a = math.radians(rake)
    ux, uz = -math.sin(a), math.cos(a)
    bx, bz = x - 0.05, z + 0.1
    k.box((bx + ux * h / 2, y, bz + uz * h / 2), (0.13, w, h), m, 0.04, rot=(0, -rake, 0))
    if m2:
        k.box((bx + ux * h * 0.5 + uz * 0.068, y, bz + uz * h * 0.5 - ux * 0.068), (0.01, w * 0.6, h * 0.7), m2, rot=(0, -rake, 0))
        k.box((x + cush / 2 - 0.03, y, z + 0.152), (cush * 0.7, w * 0.6, 0.008), m2)
    if head:
        k.box((bx + ux * (h + 0.1), y, bz + uz * (h + 0.1)), (0.1, w * 0.52, 0.17), m, 0.035, rot=(0, -rake, 0))
        k.box((bx + ux * (h + 0.01), y, bz + uz * (h + 0.01)), (0.025, w * 0.25, 0.08), 'trim', rot=(0, -rake, 0))


def steering(v, x, y, z, r=0.185, tilt=25, m='trim', col=0.32):
    """Steering wheel as the child part `<vehicle>.steer`: origin at the hub, turns about its local Z (glTF Y)."""
    k = Kit()
    ring = [(r * math.cos(2 * math.pi * i / 12), r * math.sin(2 * math.pi * i / 12), 0) for i in range(12)]
    k.tube(ring, 0.017, m, 5, closed=True)
    k.cyl((0, 0, -0.05), (0, 0, 0.012), 0.05, m, 8)
    k.box((0, 0, -0.012), (0.045, 2 * r - 0.02, 0.016), m)
    k.box((r / 2, 0, -0.012), (r - 0.02, 0.045, 0.016), m)
    v.child('steer', k, (x, y, z), rot=(0, math.radians(tilt - 90), 0))
    t = math.radians(tilt)
    v.k.cyl((x, y, z), (x + math.cos(t) * col, y, z - math.sin(t) * col), 0.032, 'trim', 6)
    v.extra['steer_axis'] = [round(-math.cos(t), 4), 0.0, round(math.sin(t), 4)]


def cabin(v, x0, x1, floor, hw, belt, m='int', dash='trim', front=None, rear=None, steer_y=0.38, narrow=None, shelf=None,
          console=True, bench=False, top=0.35, seat_w=0.5, seat_h=0.6, target=0, dash_d=0.4, lhd=True, floor_m=None, head=True):
    """Cuts the cabin tub out of the body (x1 rear .. x0 front, half width hw, floor to above the belt) and furnishes it.
    front / rear: x of the seat-back base lines. narrow: (x, half width) - behind x the tub narrows between the wheel wells."""
    k = v.k
    zt = belt + top
    if narrow and narrow[0] > x1:
        xa, hn = narrow
        v.cut_box(((x0 + xa) / 2, 0, (floor + zt) / 2), (x0 - xa + 0.01, 2 * hw, zt - floor), m, target=target)
        v.cut_box(((xa + x1) / 2, 0, (floor + zt) / 2), (xa - x1 + 0.01, 2 * hn, zt - floor), m, target=target)
    else:
        v.cut_box(((x0 + x1) / 2, 0, (floor + zt) / 2), (x0 - x1, 2 * hw, zt - floor), m, target=target)
    k.box(((x0 + x1) / 2, 0, floor + 0.004), (x0 - x1 - 0.02, 2 * (narrow[1] if narrow else hw) - 0.02, 0.008), floor_m or 'paint:#2a2a2c')
    # dashboard, instrument binnacle, glovebox, vents
    k.box((x0 - dash_d / 2 + 0.01, 0, belt - 0.14), (dash_d, 2 * hw - 0.004, 0.27), dash, 0.05)
    k.box((x0 - dash_d - 0.01, steer_y, belt - 0.055), (0.12, 0.4, 0.13), dash, 0.03)
    k.box((x0 - dash_d - 0.073, steer_y, belt - 0.05), (0.006, 0.3, 0.07), 'paint:#d8d3c0')
    k.box((x0 - dash_d + 0.006, -steer_y, belt - 0.17), (0.012, 0.42, 0.12), m, 0.004)
    k.box((x0 - dash_d + 0.006, 0, belt - 0.12), (0.014, 0.2, 0.13), 'paint:#3a3c40', 0.004)
    steering(v, x0 - dash_d - 0.26, steer_y, belt - 0.11)
    if console and not bench:
        k.box((front + 0.3 if front is not None else x0 - 0.9, 0, floor + 0.11), (0.95, 0.2, 0.22), dash, 0.03)
        gx = (front if front is not None else x0 - 1.2) + 0.62
        k.cyl((gx, 0, floor + 0.2), (gx - 0.05, 0, floor + 0.42), 0.012, 'steel', 5)
        k.box((gx - 0.055, 0, floor + 0.44), (0.05, 0.05, 0.05), 'black', 0.015)
    if front is not None:
        if bench:
            seat(k, front, 0, floor + 0.05, 2 * hw - 0.16, m, seat_h, 18, False)
            if head:
                for s in (1, -1):
                    k.box((front - 0.05 - math.sin(math.radians(18)) * (seat_h + 0.08), s * steer_y, floor + 0.15 + math.cos(math.radians(18)) * (seat_h + 0.08)), (0.1, 0.28, 0.15), m, 0.035, rot=(0, -18, 0))
        else:
            for s in (1, -1):
                seat(k, front, s * steer_y, floor + 0.05, seat_w, m, seat_h, 20, head)
        v.extra['seat'] = [round(front + 0.12, 3), round(steer_y if lhd else -steer_y, 3), round(floor + 0.3, 3)]
    if rear is not None:
        wn = (narrow[1] if narrow and rear < narrow[0] + 0.3 else hw)
        seat(k, rear, 0, floor + 0.07, 2 * wn - 0.06, m, seat_h - 0.06, 22, False, cush=0.48)
    # door cards: armrest, pull, speaker block
    xs = (front if front is not None else x0 - 1.2) + 0.35
    for s in (1, -1):
        k.box((xs, s * (hw - 0.03), min(floor + 0.4, belt - 0.13)), (0.62, 0.07, 0.06), dash, 0.02)
        k.box((xs + 0.3, s * (hw - 0.008), min(floor + 0.2, belt - 0.22)), (0.2, 0.016, min(0.14, belt - floor - 0.2)), 'paint:#2a2a2c', 0.004)
        k.box((xs - 0.05, s * (hw - 0.006), belt - 0.07), (1.0, 0.012, 0.05), dash)
    if shelf:
        xa, xb, z = shelf
        k.box(((xa + xb) / 2, 0, z - 0.02), (abs(xa - xb), 2 * (narrow[1] if narrow else hw) + 0.06, 0.04), m, 0.01)
        for s in (1, -1):
            k.cyl((min(xa, xb) + abs(xa - xb) * 0.45, s * 0.42, z - 0.004), (min(xa, xb) + abs(xa - xb) * 0.45, s * 0.42, z + 0.008), 0.07, 'paint:#2a2a2c', 8)


def nose(v, z=0.64, h=0.15, gw=0.42, lamps='quad', bars=5, vertical=False, bz=0.46, bh=0.14, guards=(0.3,), amber='corner',
         bm='chrome', strip='black', hw=None, face=None, plate=True, lw=0.15, dam=True, bg='grille', x=None):
    """Front end: recessed full-width face with grille and lamps, wrapped bumper, plate, valance."""
    k, xf = v.k, v.xf if x is None else x
    hw = hw or v.w - 0.02
    fw = face or (lin(v.L.wid, xf) - 0.035)
    if gw:
        grille(v, xf, -gw, gw, z - h / 2, z + h / 2, bars=bars, vertical=vertical, bg=bg)
    v.cut_box((xf, 0, z), (0.07, 2 * fw, h), bg)
    lh = h - 0.045
    if lamps == 'quad':
        for y in (fw - lw / 2 - 0.02, fw - lw * 1.5 - 0.05):
            lamp(k, xf - 0.03, y, z, lw, lh, 'head')
    elif lamps == 'single':
        lamp(k, xf - 0.03, fw - lw / 2 - 0.02, z, lw, lh, 'head')
    elif lamps == 'round4':
        for y in (fw - lh / 2 - 0.03, fw - lh * 1.5 - 0.075):
            round_lamp(k, xf - 0.04, y, z, lh / 2, 'head')
    elif lamps == 'round2':
        round_lamp(k, xf - 0.04, fw - lh / 2 - 0.03, z, lh / 2, 'head')
    if amber == 'corner':
        side_lamp(v, xf - 0.1, z, 'amber', 0.12, lh - 0.015)
    elif amber == 'bumper' and bz:
        lamp(k, xf + 0.06, hw - 0.3, bz, 0.16, bh * 0.4, 'amber', bezel=None)
    elif amber == 'inner':
        lamp(k, xf - 0.03, fw - lw - 0.09, z, 0.08, lh, 'amber', bezel=None)
    if bz:
        bumper(v, xf, hw, bz, bh, m=bm, strip=strip, guards=guards)
        if plate:
            globals()['plate'](k, xf + 0.09, bz)
    if dam:
        k.box((xf - 0.03, 0, lin(v.L.bot, xf) - 0.01), (0.07, 2 * hw - 0.3, 0.08), 'trim', 0.02)


def tail(v, z=0.67, h=0.17, lamp_=(0.6, 0.3), rev=(0.36, 0.12), amber=(0.72, 0.07), bz=0.47, bh=0.14, guards=(0.32,), bm='chrome',
         strip='black', exh=(-0.55,), plate_z=None, hw=None, face=None, panel='trim', x=None):
    """Rear end: recessed lamp panel, lamp clusters, plate, wrapped bumper, exhaust tips."""
    k, xr = v.k, v.xr if x is None else x
    hw = hw or v.w - 0.02
    fw = face or (lin(v.L.wid, xr) - 0.03)
    v.cut_box((xr, 0, z), (0.06, 2 * fw, h), panel)
    lh = h - 0.04
    lamp(k, xr + 0.03, lamp_[0], z, lamp_[1], lh, 'tail', -1)
    if rev:
        lamp(k, xr + 0.03, rev[0], z, rev[1], lh, 'reverse', -1)
    if amber:
        lamp(k, xr + 0.032, amber[0], z, amber[1], lh - 0.03, 'amber', -1, bezel=None)
    if plate_z is None:
        globals()['plate'](k, xr + 0.02, z, -1)
    else:
        globals()['plate'](k, xr - (0.09 if abs(plate_z - bz) < 0.05 else 0.0), plate_z, -1)
    if bz:
        bumper(v, xr, hw, bz, bh, sign=-1, m=bm, strip=strip, guards=guards)
    for y in exh:
        exhaust(k, xr - 0.06, y, (bz or z) - 0.16)
    side_lamp(v, xr + 0.12, z - 0.03, 'tail', 0.1, 0.05)


def scoop(v, x0, x1, hw, h=0.07, m='body'):
    """Hood scoop with a dark mouth."""
    z = v.L.top_z((x0 + x1) / 2, 0)
    v.k.box(((x0 + x1) / 2, 0, z + h / 2 - 0.01), (abs(x1 - x0), 2 * hw, h + 0.02), m, 0.025)
    v.k.box((max(x0, x1) + 0.002, 0, z + h / 2), (0.01, 2 * hw - 0.07, h - 0.035), 'under')


def spoiler(v, x, z, hw, m='body', chord=0.2, h=0.1, wing=False):
    """Rear spoiler: a lip (ducktail) on the tail edge, or a wing on two posts."""
    k = v.k
    if wing:
        k.box((x, 0, z + h), (chord, 2 * hw, 0.03), m, 0.012, rot=(0, 8, 0))
        for s in (1, -1):
            k.box((x, s * hw * 0.62, z + h / 2), (chord * 0.5, 0.03, h), m)
            k.box((x, s * hw, z + h - 0.02), (chord, 0.02, 0.09), m, 0.008)
    else:
        k.prism([(x + chord, z - 0.02), (x + chord, z), (x, z + h), (x - 0.03, z + h), (x - 0.03, z - 0.02)], -hw, hw, 'y', m)


def louvres(v, pa, pb, yy, n=6, m='black', margin=0.07):
    """Slats over a sloping rear window from pa (top) to pb (base), both (x, z)."""
    k = v.k
    d = Vector((pb[0] - pa[0], 0, pb[1] - pa[1]))
    ln = d.length
    d.normalize()
    nrm = Vector((-d.z, 0, d.x)) if d.x < 0 else Vector((d.z, 0, -d.x))
    if nrm.z < 0:
        nrm = -nrm
    ang = math.degrees(math.atan2(-d.z, -d.x))
    for i in range(n):
        p = Vector((pa[0], 0, pa[1])) + d * ln * (i + 0.6) / (n + 0.2) + nrm * 0.03
        w = yy(p.z) - margin
        k.box(p, (ln / n * 0.8, 2 * w, 0.012), m, rot=(0, -ang * 0.45, 0))
    for s in (1, -1):
        a, b = Vector((pa[0], 0, pa[1])) + d * 0.05, Vector((pb[0], 0, pb[1])) - d * 0.05
        k.tube([a + nrm * 0.02 + Vector((0, s * (yy(a.z) - margin), 0)), b + nrm * 0.02 + Vector((0, s * (yy(b.z) - margin), 0))], 0.014, m, 4)


def windscreen(v, p0, p1, wb, wr, m='chrome', t=0.03):
    """Free-standing framed windscreen (open cars)."""
    from vehicles_kit import window, solidify, to_obj
    fk = Kit()
    outer = [(p0[0], wb, p0[1]), (p0[0], -wb, p0[1]), (p1[0], -wr, p1[1]), (p1[0], wr, p1[1])]
    window(fk, v.k, outer, [0, 1, 2, 3], [0.03, 0.04, 0.04, 0.04], m, (p0[0] - 1.0, 0, p0[1]))
    solidify(fk.bm, t, m, m)
    v.parts.append(to_obj('ws', fk.bm))
    return lambda z: wb + (wr - wb) * (z - p0[1]) / max(1e-6, p1[1] - p0[1])


def roof_rack(v, x0, x1, hw, z, m='chrome', bars=4, h=0.07):
    k = v.k
    for s in (1, -1):
        k.tube([(x0, s * hw, z + h), (x1, s * hw, z + h)], 0.014, m, 5)
        for i in range(3):
            x = x0 + (x1 - x0) * i / 2
            k.box((x, s * hw, z + h / 2), (0.05, 0.03, h + 0.02), m, 0.008)
    for i in range(bars):
        x = x0 + (x1 - x0) * (i + 0.5) / bars
        k.box((x, 0, z + h), (0.035, 2 * hw, 0.016), m)

"""Tier 2: pickups, 4x4s, vans and service vehicles. They reuse build_car() with taller specs plus truck parts."""
import math
from mathutils import Vector
from vehicles_kit import Kit, lin, arch_profile
import vehicles_parts as P
from vehicles_cars import build_car, lids, sedan_80s

FLOOR = 'paint:#3a3c40'


def bed(v, x0, x1, floor, hw, tubs=None, m='body', ribs=True):
    """Open load bed cut into the body from above, x0 (front) to x1 (rear). tubs: (xa, xb, half width) between the wheel tubs."""
    zt = lin(v.L.top, x0) + 0.3
    segs = [(x0, x1, hw)] if not tubs else [(x0, tubs[0], hw), (tubs[0], tubs[1], tubs[2]), (tubs[1], x1, hw)]
    for a, b, h in segs:
        v.cut_box(((a + b) / 2, 0, (floor + zt) / 2), (a - b + 0.004, 2 * h, zt - floor), m)
    if ribs:
        n = 7
        hn = tubs[2] if tubs else hw
        for i in range(n):
            y = -hn + 0.1 + (2 * hn - 0.2) * i / (n - 1)
            v.k.box(((x0 + x1) / 2, y, floor + 0.006), (x0 - x1 - 0.06, 0.07, 0.012), m)


def truck_tail(v, z, h=0.3, bz=0.58, bh=0.16, gate=True, lw=0.1, bm='chrome', strip=None, exh=(-0.6,), plate_y=0.0, handle=True):
    """Upright corner lamp stacks, a tailgate (seams, pressed panel, handle), step bumper with the plate, exhaust."""
    k, xr = v.k, v.xr
    fw = lin(v.L.wid, xr) - 0.03
    y = fw - lw / 2 - 0.012
    for s in (1, -1):
        k.box((xr + 0.004, s * y, z), (0.03, lw + 0.024, h + 0.024), 'chrome', 0.008)
        k.box((xr - 0.006, s * y, z + h * 0.2), (0.03, lw, h * 0.56), 'tail', 0.006)
        k.box((xr - 0.006, s * y, z - h * 0.2), (0.03, lw, h * 0.2), 'amber', 0.006)
        k.box((xr - 0.006, s * y, z - h * 0.4), (0.03, lw, h * 0.17), 'reverse', 0.006)
    if gate:
        zt = lin(v.L.top, xr + 0.1)
        gy = y - lw / 2 - 0.035
        for s in (1, -1):
            k.box((xr - 0.001, s * gy, (bz + bh / 2 + zt) / 2 + 0.02), (0.008, 0.014, zt - bz - bh / 2 - 0.06), 'black')
        k.box((xr - 0.004, 0, z), (0.014, 2 * gy - 0.2, h * 0.75), 'body', 0.004)
        if handle:
            k.box((xr - 0.012, 0, zt - 0.09), (0.02, 0.16, 0.035), 'chrome', 0.008)
    if bz:
        P.bumper(v, xr, v.w - 0.02, bz, bh, sign=-1, m=bm, strip=strip, wrap=0.2)
        P.plate(k, xr - 0.09, bz, -1, plate_y)
    for ey in exh:
        P.exhaust(k, xr - 0.06, ey, (bz or z) - 0.2)


def lightbar(v, x, z, hw=0.5, mats=('beacon_r', 'beacon_b')):
    k = v.k
    k.box((x, 0, z + 0.03), (0.28, 2 * hw + 0.08, 0.035), 'black', 0.01)
    for s, m in zip((1, -1), mats):
        k.box((x, s * (hw + 0.12) / 2, z + 0.095), (0.24, hw - 0.12, 0.1), m, 0.025)
        k.box((x, s * hw * 0.86, z + 0.008), (0.1, 0.06, 0.03), 'black')
    k.box((x, 0, z + 0.09), (0.2, 0.2, 0.09), 'chrome', 0.02)
    k.box((x + 0.1, 0, z + 0.09), (0.012, 0.15, 0.05), 'black')


def pushbar(v, z0, z1, hw=0.36, x=None, m='black'):
    k = v.k
    x = (v.xf if x is None else x) + 0.17
    for s in (1, -1):
        k.box((x, s * hw, (z0 + z1) / 2), (0.05, 0.05, z1 - z0), m, 0.014)
        k.box((x - 0.07, s * hw, z0 + 0.08), (0.14, 0.04, 0.06), m)
    for zz in (z1 - 0.05, (z0 + z1) / 2 - 0.02):
        k.box((x, 0, zz), (0.04, 2 * hw, 0.045), m, 0.012)


def spotlight(v, x, y, z):
    k = v.k
    k.cyl((x, y, z - 0.1), (x, y, z), 0.012, 'chrome', 5)
    k.cyl((x - 0.05, y, z + 0.045), (x + 0.07, y, z + 0.045), 0.058, 'chrome', 8, r1=0.066)
    k.cyl((x + 0.07, y, z + 0.045), (x + 0.076, y, z + 0.045), 0.056, 'head', 8)


def spare(k, x, y, z, r=0.36, sign=-1, hub='steel'):
    """Spare wheel carried flat against the tail (axis along X)."""
    k.lathe((x, y, z), (sign, 0, 0), [(0, r * 0.62), (0, r - 0.035, 'black'), (0.035, r, 'black'), (0.19, r, 'black'), (0.225, r - 0.035, 'black'),
                                     (0.225, r * 0.62, 'black'), (0.17, r * 0.56, hub), (0.19, r * 0.2, hub), (0.2, 0, hub)], 'black', 14)


def gh_band(v, x0, x1, z0, z1, m, t=0.005):
    """Flat colour block or line on both flanks of the upper body (greenhouse side planes)."""
    for s in (1, -1):
        v.k.f([(x0, s * (v.yy(z0) + t), z0), (x1, s * (v.yy(z0) + t), z0), (x1, s * (v.yy(z1) + t), z1), (x0, s * (v.yy(z1) + t), z1)], m,
              out=(0, s, 0))


def pickup(name, dz=0.0, r=0.38, wheel='wheel_steel', wb=3.3, ro=1.05, w=0.98, paint=('#c9b790', '#7a4a2a', '#e8e4d8'), open_bed=True,
           bands=None, **over):
    S = dict(type='truck', wb=wb, fo=0.9, ro=ro, w=w, r=r, clear=0.32 + dz, arch=r + 0.09, wheel=wheel, paint=paint, int='paint:#6e5a44',
             gh=dict(pts=[(0.98, 1.06 + dz), (0.52, 1.68 + dz), (-0.3, 1.68 + dz), (-0.42, 1.08 + dz)], wr=w - 0.2, a=0.06, c=0.1,
                     back=(0.07, 0.07)),
             nc=(0.03, 0.05), tc=(0.02, 0.03), cab=dict(front=-0.13, bench=True, seat_h=0.5, x1=-0.38),
             loft=dict(crease=0.75 + dz, bands=bands if bands is not None else [(0.6 + dz, 0.82 + dz, 'body2'), (0.82 + dz, 0.85 + dz, 'chrome'),
                                                                                (0.57 + dz, 0.6 + dz, 'chrome')]),
             seams=[0.92, [(-0.3, None), (-0.3, 0.37 + dz)]], handles=[-0.16])
    S.update(over)
    v = build_car(name, S)
    v.dz = dz
    P.side_strip(v, [(-0.47, lin(v.L.top, -0.47) - 0.004), (-0.47, 0.37 + dz)], 0.03, 'black')
    P.top_strip(v, [(-0.47, -w + 0.06), (-0.47, w - 0.06)], 0.03, 'black')
    if open_bed:
        a = S['arch']
        bed(v, -0.53, v.xr + 0.06, 0.72 + dz, v.wb - 0.05, (v.ra + a + 0.03, v.ra - a - 0.03, w - 0.335))
        for x in (-0.9, v.ra - a - 0.2):  # tie-down rails
            for s in (1, -1):
                v.k.box((x, s * (v.wb - 0.02), lin(v.L.top, x) + 0.012), (0.3, 0.05, 0.02), 'black', 0.006)
    lids(v, boot=False)
    return v


def pickup_80s(name):
    v = pickup(name)
    P.nose(v, z=0.85, h=0.2, gw=0.5, lamps='single', lw=0.2, bars=5, bz=0.6, bh=0.16, guards=(), amber='inner')
    truck_tail(v, 0.84, 0.3)
    P.antenna(v.k, 1.2, -0.84, 1.04)
    return v


def pickup_4x4(name):
    dz = 0.14
    v = pickup(name, dz, 0.45, 'wheel_rally', wb=3.2, paint=('#2f5f9e', '#e8e4d8', '#e0a020'), lip=0.07, lip_m='black', mirror_m='black',
               bands=[(0.66 + dz, 0.72 + dz, 'stripe'), (0.74 + dz, 0.8 + dz, 'body2')])
    k, xf = v.k, v.xf
    P.nose(v, z=0.85 + dz, h=0.2, gw=0.5, lamps='round2', bars=4, bz=0.6 + dz, bh=0.16, guards=(), amber='inner', bm='black', strip=None)
    pushbar(v, 0.5 + dz, 1.02 + dz, 0.38)
    for s in (1, -1):
        P.round_lamp(k, xf + 0.2, s * 0.2, 1.1 + dz, 0.075, 'head', sym=False)
    truck_tail(v, 0.84 + dz, 0.3, bz=0.6 + dz, bm='black')
    # roll bar with lamps in the bed, side steps, skid plate
    hw, zb = v.wb - 0.12, 0.74 + dz
    for x, top in ((-0.75, 1.78 + dz), (-1.0, 1.78 + dz)):
        k.tube([(x, hw, zb), (x, hw - 0.06, top - 0.1), (x, hw - 0.16, top), (x, -hw + 0.16, top), (x, -hw + 0.06, top - 0.1), (x, -hw, zb)],
               0.035, 'chrome', 6)
    for s in (1, -1):
        k.tube([(-1.0, s * (hw - 0.07), 1.6 + dz), (-1.75, s * hw, zb)], 0.03, 'chrome', 6)
        k.tube([(-0.75, s * (hw - 0.16), 1.78 + dz), (-1.0, s * (hw - 0.16), 1.78 + dz)], 0.03, 'chrome', 6)
        k.tube([(1.0, s * (v.w + 0.06), 0.42 + dz), (-0.4, s * (v.w + 0.06), 0.42 + dz)], 0.04, 'chrome', 6)
        for x in (0.8, -0.2):
            k.tube([(x, s * (v.w + 0.06), 0.42 + dz), (x, s * (v.w - 0.15), 0.46 + dz)], 0.025, 'chrome', 5)
    for y in (-0.42, -0.14, 0.14, 0.42):
        P.round_lamp(k, -0.7, y, 1.9 + dz, 0.085, 'head', sym=False, bezel='black', d=0.06)
        k.box((-0.72, y, 1.82 + dz), (0.03, 0.03, 0.05), 'black')
    k.box((xf - 0.25, 0, 0.42 + dz), (0.5, 0.9, 0.03), 'steel', 0.01, rot=(0, 14, 0))
    return v


def tow_truck(name):
    v = pickup(name, 0.06, 0.42, 'wheel_truck', wb=3.6, ro=1.35, w=1.02, paint=('#d8b21c', '#1d1f24', '#b3261e'), open_bed=False,
               wheel_r='wheel_truck_dual', inset_r=0.31, depth_r=0.64, bands=[(0.68, 0.76, 'body2'), (0.8, 0.84, 'stripe')])
    k, xr, dz = v.k, v.xr, 0.06
    P.nose(v, z=0.91, h=0.2, gw=0.5, lamps='quad', lw=0.13, bars=5, bz=0.66, bh=0.17, guards=(0.3,), amber=None)
    pushbar(v, 0.52, 1.1, 0.4)
    lightbar(v, 0.1, 1.74, 0.5, ('amber', 'amber'))
    zd = lin(v.L.top, -1.5)
    # wrecker body: deck plate, tool lockers, winch, boom, sling
    P.top_panel(v, xr + 0.1, -0.55, -0.6, 0.6, 'dsteel', 0.012)
    for s in (1, -1):
        for x0, x1 in ((-0.62, -1.2), (-2.6, xr + 0.12)):
            P.side_panel(v, x1, x0, 0.72, 1.04, 'body', 0.012)
            k.box(((x0 + x1) / 2, s * (v.L.side_y((x0 + x1) / 2, 0.98) + 0.02), 0.98), (0.14, 0.02, 0.03), 'chrome', 0.006)
        k.box((-1.6, s * 0.78, zd + 0.11), (2.3, 0.3, 0.2), 'body', 0.03)
        for i in range(3):
            k.box((-0.9 - i * 0.7, s * 0.935, zd + 0.11), (0.5, 0.012, 0.13), 'body2')
    k.box((-0.8, 0, zd + 0.2), (0.5, 0.9, 0.4), 'body2', 0.03)
    k.cyl((-1.0, -0.36, zd + 0.3), (-1.0, 0.36, zd + 0.3), 0.14, 'steel', 10)
    for s in (1, -1):
        k.cyl((-1.0, s * 0.36, zd + 0.3), (-1.0, s * 0.39, zd + 0.3), 0.19, 'dsteel', 10)
        k.tube([(-0.9, s * 0.42, zd + 0.02), (xr + 0.25, s * 0.1, zd + 1.05)], 0.05, 'body2', 6)
        k.tube([(-2.3, s * 0.5, zd + 0.02), (xr + 0.4, s * 0.1, zd + 0.9)], 0.035, 'body2', 6)
    k.box((xr + 0.24, 0, zd + 1.06), (0.16, 0.3, 0.12), 'body2', 0.03)
    k.cyl((xr + 0.2, -0.1, zd + 1.02), (xr + 0.2, 0.1, zd + 1.02), 0.07, 'steel', 8)
    k.tube([(-1.0, 0, zd + 0.42), (xr + 0.2, 0, zd + 1.09)], 0.012, 'dsteel', 4)
    k.tube([(xr + 0.13, 0, zd + 1.0), (xr + 0.13, 0, zd + 0.42)], 0.012, 'dsteel', 4)
    k.box((xr + 0.13, 0, zd + 0.36), (0.07, 0.05, 0.14), 'red', 0.02)
    for s in (1, -1):  # tow sling
        k.tube([(xr + 0.25, s * 0.3, zd - 0.25), (xr - 0.25, s * 0.3, 0.42)], 0.03, 'dsteel', 5)
    k.box((xr - 0.26, 0, 0.42), (0.08, 1.1, 0.14), 'black', 0.03)
    truck_tail(v, 0.9, 0.24, bz=0.62, bh=0.17, gate=False, bm='body2')
    for s in (1, -1):
        k.box((v.ra, s * (v.w + 0.005), 0.86 + dz), (1.1, 0.03, 0.03), 'black', 0.008)
    return v


def mudguard(k, cx, cz, r, y0, y1, m, a0, a1, seg=10, t=0.045):
    """Separate arched wing over a wheel (old trucks, trailers): top skin, chamfered outer edge and skirt."""
    rows, inner = [], []
    for i in range(seg + 1):
        a = math.radians(a0 + (a1 - a0) * i / seg)
        c, s = math.cos(a), math.sin(a)
        R, R2 = r + t, r + t - 0.045
        rows.append([(cx + R * c, y0, cz + R * s), (cx + R * c, y1 - 0.045, cz + R * s), (cx + R2 * c, y1, cz + R2 * s),
                     (cx + (r - 0.03) * c, y1, cz + (r - 0.03) * s)])
        inner.append([(cx + r * c, y1, cz + r * s), (cx + r * c, y0, cz + r * s)])
    k.patch(rows, m, (0, 0, 1))
    k.patch(inner, 'under', (0, 0, -1))
    for rw, iw in ((rows[0], inner[0]), (rows[-1], inner[-1])):
        k.f([rw[0], rw[1], iw[0], iw[1]], m, out=(rw[0][0] - cx, 0, -1))


def pickup_50s(name):
    xf, xr, r = 2.2, -2.5, 0.37
    v = build_car(name, dict(
        type='truck', wb=2.9, fo=0.75, ro=1.05, w=0.8, r=r, clear=0.34, inset=-0.1, lip=0, arch=0.44, wheel='wheel_steel',
        paint=('#4f8f8a', '#22282a', '#e8e4d8'), int='paint:#5a4632',
        gh=dict(pts=[(0.72, 1.12), (0.45, 1.68), (-0.3, 1.68), (-0.45, 1.12)], wr=0.6, a=0.06, c=0.12, bevel=0.05, crown=0.04, back=(0.12, 0.1)),
        top=[(xf, 0.8), (xf - 0.06, 0.92), (xf - 0.3, 1.02), (0.72, 1.12), (-0.45, 1.12), (-0.47, 0.66), (xr, 0.66)],
        bot=[(xf, 0.5), (xf - 0.15, 0.42), (-0.4, 0.42), (-0.5, 0.48), (xr, 0.48)],
        wid=[(xf, 0.5), (xf - 0.12, 0.62), (0.9, 0.8), (-0.45, 0.8), (-0.47, 0.5), (xr, 0.5)], loft=dict(cham=0.08, crown=0.05, crease=0.8),
        cab=dict(front=-0.2, bench=True, seat_h=0.48, x1=-0.42, x0=0.66, dash_d=0.34, head=False, narrow=None, hw=0.62),
        seams=[0.62, [(-0.36, None), (-0.36, 0.48)]], handles=[-0.24], mirror_r=False))
    k = v.k
    wy = 0.9
    with k.sym():
        mudguard(k, v.fa, r, r + 0.07, 0.6, 1.04, 'body', -20, 165)
        mudguard(k, v.ra, r, r + 0.07, 0.86, 1.04, 'body', 15, 165)
        k.box(((v.fa + v.ra) / 2 + 0.1, 0.9, 0.4), (v.fa - v.ra - 0.95, 0.26, 0.04), 'body2', 0.012)  # running board
        k.box((xf - 0.32, 0.7, 0.93), (0.2, 0.2, 0.2), 'body', 0.06)  # lamp pod on the wing
    P.round_lamp(k, xf - 0.2, 0.7, 0.93, 0.085, 'head')
    P.round_lamp(k, xf - 0.16, 0.7, 0.76, 0.035, 'amber', d=0.02)
    P.grille(v, xf, -0.34, 0.34, 0.54, 0.8, bars=6, frame=0.025, depth=0.04)
    k.box((xf - 0.04, 0, 0.93), (0.05, 0.1, 0.12), 'chrome', 0.02)
    P.bumper(v, xf + 0.1, 0.95, 0.5, 0.11, wrap=0.12, strip=None, corner=0.05)
    for s in (1, -1):
        k.box((xf + 0.04, s * 0.4, 0.5), (0.14, 0.05, 0.06), 'dsteel')
    P.plate(k, xf + 0.19, 0.5)
    # hood side louvres and centre hinge strip
    for i in range(5):
        P.side_strip(v, [(1.55 - i * 0.09, 0.84), (1.55 - i * 0.09, 0.96)], 0.03, 'black')
    P.top_strip(v, [(0.74, 0), (xf - 0.1, 0)], 0.03, 'chrome')
    # stake bed: plank floor, pressed sides with rolled rail, tailgate with chains
    x0, x1, hw, zf, zt = -0.52, xr - 0.05, 0.84, 0.66, 1.1
    k.box(((x0 + x1) / 2, 0, zf + 0.02), (x0 - x1, 2 * hw, 0.05), 'dsteel')
    for i in range(7):
        k.box(((x0 + x1) / 2, -hw + 0.13 + i * (2 * hw - 0.26) / 6, zf + 0.05), (x0 - x1 - 0.08, 0.2, 0.014), 'wood')
    for s in (1, -1):
        k.box(((x0 + x1) / 2, s * hw, (zf + zt) / 2), (x0 - x1, 0.045, zt - zf), 'body', 0.012)
        k.box(((x0 + x1) / 2, s * (hw + 0.022), (zf + zt) / 2 + 0.02), (x0 - x1 - 0.3, 0.012, zt - zf - 0.2), 'body', 0.004)
        k.tube([(x0, s * (hw + 0.01), zt), (x1, s * (hw + 0.01), zt)], 0.03, 'body', 6)
        for x in (x0 + 0.12, (x0 + x1) / 2, x1 + 0.12):
            k.box((x, s * (hw + 0.03), (zf + zt) / 2), (0.07, 0.03, zt - zf), 'body', 0.008)
        k.tube([(x1 + 0.02, s * (hw - 0.03), zt - 0.03), (x1 + 0.3, s * (hw - 0.03), zf + 0.12)], 0.008, 'dsteel', 4)
        k.cyl((x1 + 0.0, s * (hw - 0.1), 0.88), (x1 - 0.05, s * (hw - 0.1), 0.88), 0.055, 'chrome', 8, mcap='tail')
    k.box((x0 + 0.02, 0, (zf + zt) / 2 + 0.03), (0.045, 2 * hw, zt - zf + 0.06), 'body', 0.012)
    k.box((x1 + 0.02, 0, (zf + zt) / 2), (0.045, 2 * hw - 0.05, zt - zf), 'body', 0.012)
    for i in range(3):
        k.box((x1 - 0.006, 0, zf + 0.12 + i * 0.1), (0.012, 2 * hw - 0.5, 0.06), 'body', 0.004)
    P.bumper(v, x1 + 0.02, 0.8, 0.52, 0.1, sign=-1, wrap=0.1, strip=None, corner=0.05)
    P.plate(k, x1 - 0.07, 0.52, -1)
    P.exhaust(k, x1, -0.5, 0.36)
    lids(v, hood=False, boot=False)
    return v


def suv(name, police=False):
    paint = ('#1d1f24', '#eeeeea', '#c9a227') if police else ('#a32a22', '#e2d8bc', '#3a2a20')
    v = build_car(name, dict(
        type='truck', wb=2.7, fo=0.85, ro=1.1, w=0.96, r=0.38, clear=0.33, arch=0.47, wheel='wheel_steel' if police else 'wheel_rally',
        paint=paint, int='paint:#5d5348',
        gh=dict(pts=[(0.92, 1.08), (0.5, 1.76), (-2.12, 1.78), (-2.3, 1.1)], wr=0.78, pillars=[(-0.2, -0.2, 0.1), (-1.15, -1.15, 0.1)],
                a=0.06, c=0.12, roof='body2' if police else 'body'),
        nc=(0.03, 0.05), tc=(0.02, 0.03), cab=dict(front=-0.22, rear=-1.08, shelf=(-2.28, -1.3, 0.82), x0=0.86),
        loft=dict(crease=0.78, bands=[] if police else [(0.52, 0.74, 'body2'), (0.74, 0.78, 'chrome')]),
        seams=[0.86, -0.2, [(-1.2, None), (-1.2, 0.95), (-0.95, 0.8), (-0.9, 0.4)]], handles=[-0.04, -1.02]))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.86, h=0.2, gw=0.46, lamps='quad', lw=0.13, bars=6, bz=0.6, bh=0.16, guards=() if police else (0.3,), amber=None)
    truck_tail(v, 0.86, 0.32, plate_y=-0.5 if not police else 0.0, handle=police)
    lids(v, boot=False)
    if police:
        P.side_panel(v, -0.96, 0.86, 0.42, 1.03, 'body2', 0.003, walls=False)
        with k.sym():
            k.box((0.3, v.L.side_y(0.3, 0.8) + 0.006, 0.8), (0.2, 0.008, 0.2), 'stripe', 0.05)
        lightbar(v, 0.1, 1.775, 0.52)
        pushbar(v, 0.48, 1.04, 0.38)
        spotlight(v, 0.88, 0.9, 1.16)
        P.antenna(k, -1.9, 0.3, 1.78, 0.8)
    else:
        P.roof_rack(v, -0.2, -2.0, 0.62, 1.79, bars=5)
        spare(k, xr - 0.01, 0.0, 0.98, 0.37, hub='body2')
        k.box((xr - 0.012, 0, 0.98), (0.03, 0.12, 0.5), 'black')
    return v


def suv_boxy(name):
    return suv(name)


def police_suv(name):
    return suv(name, True)


def police_sedan(name):
    v = sedan_80s(name, paint=('#1d1f24', '#eeeeea', '#c9a227'), int='paint:#3c4048',
                  gh=dict(pts=[(0.92, 0.875), (0.3, 1.385), (-0.4, 1.405), (-1.08, 1.39), (-1.6, 0.9)], wr=0.7, pillars=[(-0.33, -0.31, 0.1)],
                          a=0.055, c=0.2, roof='body2'))
    k = v.k
    P.side_panel(v, -1.05, 0.86, 0.3, 0.835, 'body2', 0.003, walls=False)
    with k.sym():
        k.box((0.3, v.L.side_y(0.3, 0.66) + 0.006, 0.66), (0.2, 0.008, 0.2), 'stripe', 0.05)
    lightbar(v, -0.3, 1.4, 0.48)
    pushbar(v, 0.32, 0.84, 0.34)
    spotlight(v, 0.9, 0.87, 0.95)
    P.antenna(k, -2.2, 0.3, 0.85, 0.9)
    v.k.box((-1.3, 0, 1.0), (0.03, 1.36, 0.5), 'black')  # prisoner partition
    return v


def offroad_open(name):
    v = build_car(name, dict(
        type='truck', wb=2.4, fo=0.68, ro=0.75, w=0.84, r=0.39, clear=0.36, arch=0.48, sq=3.2, lip=0.06, lip_m='black', wheel='wheel_rally',
        paint=('#b5281f', '#1f2022', '#e8e4d8'), int='paint:#2b2b2e', belt=[(0.45, 1.02), (-1.3, 1.02)], nc=(0.02, 0.03), tail=1.0,
        tc=(0.02, 0.03), pinch=(0.03, 0.03), loft=dict(crease=0.8),
        cab=dict(front=-0.3, rear=-1.02, top=0.3, dash_d=0.3, head=False, seat_h=0.5, steer_y=0.36, seat_w=0.46, x1=-1.55, console=False),
        mirror_m='black', mirror_r=False))
    k, xf, xr = v.k, v.xf, v.xr
    for s in (1, -1):  # cut-down door openings
        v.cut_box((-0.1, s * 0.9, 1.0), (0.75, 0.5, 0.36), 'body')
    yy = P.windscreen(v, (0.47, 1.02), (0.4, 1.6), 0.74, 0.72, m='black')
    P.wipers(v, (0.47, 1.02), (0.4, 1.6), yy)
    P.top_panel(v, 0.52, xf - 0.03, -0.44, 0.44, 'body', 0.07)
    for s in (1, -1):
        k.box((1.2, s * 0.45, 1.0), (0.06, 0.03, 0.05), 'black', 0.008)
    hw = v.wb - 0.03
    k.tube([(-0.62, hw, 1.0), (-0.62, hw - 0.04, 1.52), (-0.62, hw - 0.14, 1.62), (-0.62, -hw + 0.14, 1.62), (-0.62, -hw + 0.04, 1.52),
            (-0.62, -hw, 1.0)], 0.035, 'black', 6)
    for s in (1, -1):
        k.tube([(-0.62, s * (hw - 0.06), 1.56), (-1.6, s * hw, 1.0)], 0.03, 'black', 6)
        k.box((-0.62, s * (hw - 0.3), 1.62), (0.1, 0.3, 0.09), 'black', 0.03)  # roll-bar padding
    P.nose(v, z=0.8, h=0.2, gw=0.34, lamps='round2', bars=6, bz=0.56, bh=0.11, bm='black', strip=None, guards=(), amber='inner')
    for s in (1, -1):
        k.box((xf + 0.12, s * 0.3, 0.56), (0.1, 0.04, 0.09), 'red', 0.015)  # tow hooks
    truck_tail(v, 0.82, 0.2, bz=0.56, bh=0.11, bm='black', gate=False, plate_y=-0.5)
    spare(k, xr - 0.01, 0.0, 0.95, 0.38, hub='body2')
    k.box((xr - 0.012, 0, 0.9), (0.03, 0.14, 0.5), 'black')
    with k.sym():
        k.box((0.3, v.L.side_y(0.3, 0.75) + 0.02, 0.5), (0.9, 0.06, 0.05), 'black', 0.015)  # rock rail
    P.side_strip(v, [(0.9, 0.8), (-1.75, 0.8)], 0.06, 'stripe')
    return v


def van_cargo(name):
    v = build_car(name, dict(
        type='truck', wb=3.0, fo=0.78, ro=1.2, w=1.0, r=0.36, clear=0.3, arch=0.43, wheel='wheel_steel',
        paint=('#e9e4d4', '#c4622d', '#7a2e1c'), int='paint:#5a5148',
        gh=dict(pts=[(1.74, 1.12), (1.32, 1.96), (-2.56, 1.98), (-2.66, 1.14)], wr=0.88, pillars=[(0.55, 0.55, 0.12)], solid=(1,), a=0.07,
                c=0.1, back=(0.1, 0.1)),
        nc=(0.05, 0.08), tc=(0.02, 0.03), cab=dict(x0=1.7, x1=0.34, floor=0.82, front=0.66, seat_h=0.55, console=False, narrow=None),
        loft=dict(crease=0.75, bands=[(0.82, 0.87, 'stripe'), (0.87, 0.98, 'body2'), (0.98, 1.03, 'stripe')]),
        seams=[[(1.72, None), (1.72, 0.9), (1.0, 0.9), (1.0, 0.38)], 0.5, -0.7], handles=[0.64, -0.56]))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.86, h=0.19, gw=0.5, lamps='single', lw=0.2, bars=5, bz=0.56, bh=0.15, guards=(), amber='inner')
    truck_tail(v, 0.9, 0.34, bz=0.56, bh=0.15, gate=False)
    k.box((xr - 0.002, 0, 0.88), (0.008, 0.014, 0.5), 'black')
    for s in (1, -1):
        k.box((xr - 0.012, s * 0.07, 0.98), (0.02, 0.03, 0.11), 'chrome', 0.006)
        gh_band(v, -0.7 - 0.006, -0.7 + 0.006, 1.13, 1.9, 'black')
    gh_band(v, 0.5 - 0.006, 0.5 + 0.006, 1.13, 1.9, 'black')
    gh_band(v, 0.45, -2.5, 1.3, 1.42, 'body2')
    gh_band(v, 0.45, -2.5, 1.44, 1.47, 'stripe')
    k.box((-2.61, 0, 1.56), (0.035, 0.09, 0.86), 'body', rot=(0, 6.8, 0))
    k.box((0.32, 0, 1.5), (0.04, 1.66, 0.8), 'paint:#5a5148')  # bulkhead behind the seats
    for y in (-0.5, 0, 0.5):
        k.box((-0.6, y, 1.985), (3.2, 0.1, 0.03), 'body', 0.012)
    lids(v, boot=False, hood=False)
    P.antenna(k, 1.9, -0.8, 1.1, 0.7)
    return v


def step_van(name):
    v = build_car(name, dict(
        type='truck', wb=3.2, fo=0.72, ro=1.5, w=1.06, r=0.4, clear=0.34, arch=0.47, wheel='wheel_truck', wheel_r='wheel_truck_dual',
        inset_r=0.3, depth_r=0.62, paint=('#ece8dc', '#6a4a2c', '#d9a520'), int='paint:#4a4a4c',
        gh=dict(pts=[(2.24, 1.3), (2.12, 2.62), (-3.02, 2.62), (-3.05, 1.3)], wr=1.0, pillars=[(1.2, 1.2, 0.14)], solid=(1,), back_solid=True,
                a=0.08, c=0.1, ws=(0.07, 0.08), bevel=0.03, crown=0.03),
        nc=(0.03, 0.05), tc=(0.02, 0.03), cab=dict(x0=2.2, x1=0.9, floor=0.9, front=1.14, seat_h=0.5, console=False, narrow=None),
        loft=dict(crease=0.8, bands=[(0.95, 1.05, 'stripe')]),
        seams=[[(2.18, None), (2.18, 0.95), (1.08, 0.95), (1.08, 0.42)]], handles=[1.2], mirror_m='black'))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.98, h=0.2, gw=0.5, lamps='round2', bars=5, bz=0.62, bh=0.16, guards=(), amber='inner', bm='trim', strip=None)
    truck_tail(v, 1.0, 0.3, bz=0.6, bh=0.16, gate=False, bm='trim')
    k.box((0.88, 0, 1.9), (0.04, 1.9, 1.3), 'paint:#4a4a4c')
    gh_band(v, 1.13 - 0.008, 1.13 + 0.008, 1.31, 2.56, 'black')
    gh_band(v, 0.9, -2.9, 1.7, 2.2, 'body2')  # livery block and stripe
    gh_band(v, 0.9, -2.9, 1.6, 1.66, 'stripe')
    for i in range(9):  # roll-up rear door slats, handle, grab rails
        k.box((-3.04, 0, 1.2 + i * 0.15), (0.02, 1.7, 0.012), 'black')
    k.box((-3.06, 0, 1.16), (0.03, 0.3, 0.04), 'chrome', 0.008)
    for s in (1, -1):
        k.tube([(-3.07, s * 0.95, 1.2), (-3.12, s * 0.95, 1.25), (-3.12, s * 0.95, 1.9), (-3.07, s * 0.95, 1.95)], 0.014, 'chrome', 5)
        for i in range(-1, 2):
            k.box((2.1 - abs(i) * 0.0, s * 0.3 * (i + 2) * 0.5, 2.64), (0.08, 0.05, 0.035), 'amber', 0.01) if s > 0 or i > -1 else None
    for y in (-0.6, -0.3, 0, 0.3, 0.6):
        k.box((2.08, y, 2.645), (0.07, 0.06, 0.035), 'amber', 0.01)
    for i in range(6):  # roof ribs
        k.box((1.6 - i * 0.85, 0, 2.645), (0.05, 1.9, 0.02), 'body')
    return v


ROSTER = [('pickup_80s', pickup_80s), ('pickup_4x4', pickup_4x4), ('pickup_50s', pickup_50s), ('suv_boxy', suv_boxy),
          ('offroad_open', offroad_open), ('van_cargo', van_cargo), ('step_van', step_van), ('police_sedan', police_sedan),
          ('police_suv', police_suv), ('tow_truck', tow_truck)]

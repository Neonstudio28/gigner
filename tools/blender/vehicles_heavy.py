"""Tier 3: semi tractors, trailers, medium trucks, bus, caravan, farm tractor and log loader.
Trailers have their origin on the ground midway between the coupling (extras `hitch`) and the axle group."""
import math
from mathutils import Vector
from vehicles_kit import Kit, Vehicle, greenhouse, lin
import vehicles_parts as P
from vehicles_cars import build_car, lids
from vehicles_trucks import truck_tail, gh_band, mudguard, pushbar

R = 0.5       # heavy wheel radius
ZH = 1.22     # fifth-wheel / kingpin height
BLUE = 'paint:#2f62e0'


def frame(k, x0, x1, z=0.86, hy=0.43, h=0.2, m='trim'):
    """Ladder chassis from x0 (front) to x1 (rear)."""
    for s in (1, -1):
        k.box(((x0 + x1) / 2, s * hy, z), (x0 - x1, 0.09, h), m, 0.012)
    n = max(2, round((x0 - x1) / 1.1))
    for i in range(n + 1):
        k.box((x1 + 0.1 + (x0 - x1 - 0.2) * i / n, 0, z), (0.1, 2 * hy - 0.08, h * 0.6), m)


def axle(v, x, y, r=R, name='wheel_truck_dual', zf=0.86, hy=0.43, drive=True, flap=False, spring=True):
    """Wheel pair in the manifest plus axle tube, differential, leaf springs and optional mud flaps."""
    k = v.k
    v.wheel(x, y, r, name)
    k.cyl((x, -y, r), (x, y, r), 0.07, 'dsteel', 8)
    if drive:
        k.lathe((x - 0.24, 0, r), (1, 0, 0), [(0, 0.07), (0.1, 0.19, 'dsteel'), (0.3, 0.19, 'dsteel'), (0.42, 0.09, 'dsteel'), (0.5, 0.06, 'dsteel')],
                'dsteel', 8)
    if spring:
        for s in (1, -1):
            k.box((x, s * hy, r + 0.12), (0.95, 0.075, 0.06), 'dsteel', 0.012)
            k.box((x, s * hy, (r + 0.15 + zf) / 2), (0.14, 0.09, max(0.04, zf - r - 0.2)), 'dsteel')
    if flap:
        for s in (1, -1):
            k.box((x - r - 0.14, s * y, r + 0.02), (0.025, 0.62, 0.62), 'rubber', 0.006)
            k.box((x - r - 0.14, s * y, r + 0.34), (0.04, 0.64, 0.05), 'dsteel')


def fifth_wheel(v, x, z=ZH):
    k = v.k
    k.cyl((x, 0, z - 0.06), (x, 0, z), 0.5, 'dsteel', 12)
    k.box((x - 0.5, 0, z - 0.035), (0.5, 0.5, 0.05), 'dsteel', 0.02, rot=(0, -8, 0))
    k.box((x - 0.25, 0, z + 0.002), (0.5, 0.11, 0.006), 'under')
    k.box((x, 0, z - 0.17), (0.7, 0.95, 0.22), 'trim', 0.03)
    v.extra['hitch'] = [round(x, 3), 0.0, round(z, 3)]


def stack(k, x, y, z0, z1, r=0.065):
    """Vertical exhaust: muffler, perforated heat shield and a raked tip."""
    k.cyl((x, y, z0), (x, y, z1), r, 'chrome', 8, mcap='under')
    k.cyl((x, y, z0 + 0.1), (x, y, z0 + 0.95), r + 0.05, 'steel', 8)
    k.cyl((x, y, z0 + 1.0), (x, y, z1 - 0.45), r + 0.022, 'dsteel', 8)
    k.cyl((x, y, z1), (x - 0.1, y, z1 + 0.14), r, 'chrome', 8, mcap='under')


def tank(k, x0, x1, y, z, r=0.3, step=True):
    """Saddle fuel tank with straps, filler cap and a step plate."""
    k.cyl((x0, y, z), (x1, y, z), r, 'chrome', 12)
    for x in (x0 - 0.2, x1 + 0.2):
        k.cyl((x - 0.03, y, z), (x + 0.03, y, z), r + 0.012, 'dsteel', 12)
    s = 1 if y > 0 else -1
    k.cyl((x0 - 0.38, y + s * r * 0.5, z + r * 0.8), (x0 - 0.38, y + s * r * 0.62, z + r * 0.98), 0.05, 'black', 6)
    if step:
        k.box(((x0 + x1) / 2, y + s * (r - 0.02), z + r * 0.45), (x0 - x1 - 0.5, 0.2, 0.03), 'dsteel', 0.008)


def rear_lamps(k, x, z, hw, bar=True, m='trim'):
    """Tail lamp bar: tail / amber / reverse blocks at both ends and a plate."""
    if bar:
        k.box((x, 0, z), (0.08, 2 * hw, 0.16), m, 0.015)
    for s in (1, -1):
        for i, lm in enumerate(('tail', 'tail', 'amber', 'reverse')):
            k.box((x - 0.04, s * (hw - 0.1 - i * 0.13), z), (0.03, 0.105, 0.1), lm, 0.012)
    P.plate(k, x - 0.045, z, -1)


def markers(k, x, z, ys, m='amber', sx=0.07):
    for y in ys:
        k.box((x, y, z), (sx, 0.08, 0.04), m, 0.012)


def west_mirrors(k, x, y, z, h=0.5):
    for s in (1, -1):
        k.tube([(x + 0.06, s * (y - 0.14), z + h / 2 + 0.12), (x, s * y, z + h / 2 + 0.04), (x, s * y, z - h / 2 - 0.04),
                (x + 0.06, s * (y - 0.14), z - h / 2 - 0.12)], 0.013, 'chrome', 5)
        k.box((x, s * y, z), (0.05, 0.16, h), 'chrome', 0.015)
        k.box((x - 0.027, s * y, z), (0.006, 0.12, h - 0.05), 'paint:#93a6b0')


def horns(k, x, z, ys=(-0.25, 0.25)):
    for y in ys:
        k.cyl((x - 0.3, y, z + 0.07), (x + 0.12, y, z + 0.07), 0.02, 'chrome', 6, r1=0.06, mcap='under')
        k.box((x - 0.26, y, z + 0.03), (0.08, 0.05, 0.06), 'chrome', 0.01)


def half_fenders(k, x0, x1, y, z, w=0.66, m='trim'):
    for s in (1, -1):
        k.bar([(x0 + 0.14, s * y, z - 0.28), (x0, s * y, z), (x1, s * y, z), (x1 - 0.14, s * y, z - 0.28)], w, 0.03, m, 0.01)


def semi_cabover(name):
    w = 1.22
    v = build_car(name, dict(
        type='heavy', wb=4.2, fo=1.25, body_end=0.95, w=w, r=R, clear=0.62, fv=0.0, rv=0.0, arch=0.61, sq=3.0, inset=0.19, wheel='wheel_truck',
        lip=0.05, lip_m='black', paint=('#b3261e', '#ece8dc', '#d9a520'), int='paint:#5a3b30', mirror=False,
        gh=dict(pts=[(3.3, 1.82), (3.2, 2.9), (1.1, 2.9), (1.0, 1.82)], wr=1.12, pillars=[(2.25, 2.25, 0.12)], solid=(1,), back_solid=True,
                a=0.08, c=0.1, ws=(0.06, 0.07), bevel=0.04, crown=0.03),
        nc=(0.02, 0.03), tc=(0.02, 0.03), pinch=(0.04, 0.0),
        cab=dict(x1=1.2, floor=1.2, front=2.25, seat_h=0.6, console=False, narrow=None, dash_d=0.36),
        loft=dict(crease=1.2, bands=[(1.32, 1.5, 'body2'), (1.52, 1.57, 'stripe')]),
        seams=[3.22, [(2.2, None), (2.2, 1.16)]], handles=[2.34]))
    k, xf = v.k, v.xf
    P.nose(v, z=1.2, h=0.5, gw=0.62, lamps=None, bars=7, bz=0.72, bh=0.28, guards=(), amber=None, dam=False, face=0.7, strip=None)
    for y in (0.98, 0.74):
        P.lamp(k, xf + 0.075, y, 0.72, 0.2, 0.13, 'head', bezel='black')
    P.lamp(k, xf + 0.075, 0.55, 0.72, 0.1, 0.1, 'amber', bezel=None)
    k.box((xf + 0.004, 0, 1.56), (0.02, 0.9, 0.09), 'chrome', 0.02)
    k.box((xf - 0.13, 0, 2.93), (0.34, 2.2, 0.05), 'body', 0.015, rot=(0, 12, 0))  # sun visor
    markers(k, 2.95, 2.925, (-0.8, -0.4, 0, 0.4, 0.8))
    horns(k, 2.6, 2.92)
    k.prism([(2.4, 2.9), (1.15, 2.9), (1.15, 3.28), (1.35, 3.3)], -0.98, 0.98, 'y', 'body')  # roof deflector
    k.box((1.14, 0, 3.08), (0.012, 1.7, 0.26), 'body2')
    west_mirrors(k, 3.2, w + 0.18, 2.3)
    gh_band(v, 2.19, 1.05, 1.95, 2.13, 'body2')
    gh_band(v, 2.19, 1.05, 2.15, 2.2, 'stripe')
    for s in (1, -1):
        k.box((3.02, s * (w + 0.03), 0.74), (0.4, 0.12, 0.05), 'chrome', 0.012)
        k.tube([(2.2, s * (w + 0.02), 1.9), (2.17, s * (w + 0.06), 1.95), (2.17, s * (w + 0.06), 2.6), (2.2, s * (w + 0.02), 2.65)], 0.014, 'chrome', 5)
        k.box((1.6, s * (v.yy(2.3) + 0.003), 2.3), (0.4, 0.012, 0.3), 'black', 0.004)  # sleeper vent window
    k.box((1.68, 0, 1.42), (0.9, 2.1, 0.3), 'paint:#8a5a50', 0.05)  # bunk
    # chassis
    frame(k, 2.9, -3.2)
    for s in (1, -1):
        tank(k, 0.7, -0.5, s * 0.92, 0.68)
        stack(k, 0.78, s * 1.05, 0.95, 3.3)
        k.box((0.86, s * 1.05, 2.0), (0.14, 0.06, 0.05), 'dsteel')
    k.box((0.75, 0, 1.25), (0.3, 1.3, 0.6), 'dsteel', 0.04)  # battery / air tank box
    k.tube([(0.92, 0.15, 1.9), (0.55, 0.15, 1.75), (0.45, 0.15, 1.3)], 0.016, 'red', 5)
    k.tube([(0.92, -0.15, 1.9), (0.55, -0.15, 1.75), (0.45, -0.15, 1.3)], 0.016, BLUE, 5)
    for x in (-1.475, -2.725):
        axle(v, x, 0.91, flap=x < -2)
    half_fenders(k, -0.82, -3.38, 0.91, 1.08)
    fifth_wheel(v, -1.95)
    rear_lamps(k, -3.22, 0.86, 1.15)
    k.box((2.1, 0, 0.75), (1.3, 0.8, 0.5), 'under', 0.05)  # engine sump under the cab
    return v


def semi_conventional(name):
    w = 1.15
    xf = 3.65
    v = build_car(name, dict(
        type='heavy', wb=5.2, fo=1.05, body_end=0.1, w=w, r=R, front_arch=False, inset=0.1, wheel='wheel_truck',
        paint=('#2f5f9e', '#ece8dc', '#d9a520'), int='paint:#4b3b30', mirror=False,
        gh=dict(pts=[(1.45, 1.78), (1.25, 2.62), (0.2, 2.62), (0.15, 1.78)], wr=1.02, a=0.07, c=0.1, ws=(0.05, 0.06), back_solid=True, bevel=0.03),
        top=[(xf, 1.62), (xf - 0.05, 1.7), (1.45, 1.78), (0.15, 1.78), (0.1, 1.74)],
        bot=[(xf, 0.9), (1.75, 0.9), (1.5, 0.76), (0.1, 0.76)],
        wid=[(xf, 0.5), (xf - 0.08, 0.58), (1.75, 0.76), (1.45, w), (0.1, w)],
        cab=dict(x0=1.42, x1=0.24, floor=1.12, front=0.5, seat_h=0.55, console=False, narrow=None, dash_d=0.34, hw=1.0),
        loft=dict(crease=1.3, cham=0.06, bands=[(1.2, 1.34, 'body2', 0.1, 1.44), (1.36, 1.4, 'stripe', 0.1, 1.44)]),
        seams=[[(1.4, None), (1.4, 0.8)], [(0.42, None), (0.42, 0.8)]], handles=[0.56]))
    k = v.k
    P.grille(v, xf, -0.4, 0.4, 0.98, 1.58, bars=9, vertical=True, frame=0.035)
    k.box((xf - 0.1, 0, 1.73), (0.12, 0.06, 0.07), 'chrome', 0.02)
    P.top_strip(v, [(1.5, 0), (xf - 0.2, 0)], 0.03, 'chrome')
    for i in range(6):
        P.side_strip(v, [(2.9 - i * 0.12, 1.3), (2.9 - i * 0.12, 1.52)], 0.045, 'black')
    P.side_strip(v, [(1.72, 1.7), (1.72, 0.95)], 0.014, 'black')
    P.bumper(v, xf + 0.06, 1.22, 0.68, 0.3, d=0.12, wrap=0.3, strip=None, corner=0.12)
    P.plate(k, xf + 0.18, 0.68)
    with k.sym():
        mudguard(k, v.fa, R, R + 0.09, 0.62, 1.22, 'body', -14, 188)
        k.box((3.0, 0.92, 1.12), (0.32, 0.42, 0.26), 'body', 0.06)
        k.cyl((1.75, 0.98, 1.2), (1.75, 0.98, 1.72), 0.16, 'chrome', 10)  # air cleaner
        k.cyl((1.75, 0.98, 1.72), (1.75, 0.98, 1.78), 0.1, 'dsteel', 10)
    P.lamp(k, 3.15, 0.92, 1.15, 0.26, 0.12, 'head')
    P.lamp(k, 3.15, 0.92, 1.035, 0.2, 0.04, 'amber', bezel=None)
    k.box((2.6, 0, 0.72), (1.7, 0.8, 0.42), 'under', 0.05)
    k.box((1.3, 0, 2.66), (0.3, 2.0, 0.05), 'body', 0.015, rot=(0, 14, 0))
    k.box((1.33, 0, 2.2), (0.03, 0.03, 0.72), 'black', rot=(0, 13.5, 0))  # split windscreen
    markers(k, 1.0, 2.645, (-0.7, -0.35, 0, 0.35, 0.7))
    horns(k, 0.7, 2.64)
    west_mirrors(k, 1.4, w + 0.2, 2.2)
    # sleeper box
    k.box((-0.37, 0, 1.73), (0.9, 2 * w, 1.94), 'body', 0.06)
    k.box((-0.37, 0, 2.72), (0.7, 2 * w - 0.3, 0.06), 'body', 0.02)
    for s in (1, -1):
        k.box((-0.37, s * (w + 0.003), 1.27), (0.82, 0.008, 0.14), 'body2')
        k.box((-0.37, s * (w + 0.003), 1.38), (0.82, 0.008, 0.04), 'stripe')
        k.box((-0.4, s * (w + 0.004), 2.15), (0.5, 0.012, 0.32), 'chrome', 0.006)
        k.box((-0.4, s * (w + 0.009), 2.15), (0.44, 0.008, 0.26), 'black')
        k.box((-0.1, s * (w + 0.004), 1.0), (0.3, 0.012, 0.36), 'body', 0.004)
        tank(k, 0.95, -0.55, s * 0.9, 0.5, 0.26)
        stack(k, -0.93, s * 1.0, 0.95, 3.35)
    frame(k, xf + 0.02, -3.75)
    k.tube([(-0.82, 0.15, 1.9), (-1.3, 0.15, 1.75), (-1.4, 0.15, 1.3)], 0.016, 'red', 5)
    k.tube([(-0.82, -0.15, 1.9), (-1.3, -0.15, 1.75), (-1.4, -0.15, 1.3)], 0.016, BLUE, 5)
    k.cyl((v.fa, -0.95, R), (v.fa, 0.95, R), 0.06, 'dsteel', 8)
    for x in (-1.975, -3.225):
        axle(v, x, 0.91, flap=x < -3)
    half_fenders(k, -1.32, -3.88, 0.91, 1.08)
    fifth_wheel(v, -2.6)
    rear_lamps(k, -3.77, 0.86, 1.15)
    return v


# ---------------------------------------------------------------------------------------------------------------
def trailer(name, xk, xa, x_rear, paint, zf=1.3, naxles=2, legs=True, spine=0.5, bumper=True):
    """Semi-trailer running gear: kingpin plate, landing legs, bogie, rear guard and lamps. Returns the Vehicle."""
    v = Vehicle(name, 'trailer')
    k = v.k
    v.extra.update(hitch=[round(xk, 3), 0.0, ZH], paint=paint)
    k.box((xk, 0, ZH + 0.02), (1.7, 1.9, 0.04), 'dsteel', 0.01)
    k.cyl((xk, 0, ZH - 0.09), (xk, 0, ZH), 0.045, 'steel', 8)
    for s in (1, -1):  # main beams
        k.box(((xk - 1.5 + x_rear + 0.1) / 2, s * spine, zf - 0.15), (xk - 1.6 - x_rear, 0.1, 0.3), 'trim', 0.012)
    if legs:
        xl = xk - 2.3
        for s in (1, -1):
            k.box((xl, s * 0.78, zf - 0.42), (0.13, 0.13, 0.75), 'dsteel', 0.012)
            k.box((xl, s * 0.78, 0.5), (0.085, 0.085, 0.8), 'steel')
            k.box((xl, s * 0.78, 0.1), (0.3, 0.26, 0.035), 'dsteel', 0.01)
            k.tube([(xl, s * 0.78, zf - 0.7), (xl - 0.75, s * 0.55, zf - 0.08)], 0.025, 'dsteel', 5)
        k.tube([(xl, 0.78, zf - 0.7), (xl, -0.78, zf - 0.2)], 0.022, 'dsteel', 5)
        k.tube([(xl, -0.78, zf - 0.7), (xl, 0.78, zf - 0.2)], 0.022, 'dsteel', 5)
        k.tube([(xl, 0.85, zf - 0.45), (xl, 1.0, zf - 0.45), (xl, 1.0, zf - 0.62), (xl, 1.08, zf - 0.62)], 0.014, 'steel', 5)
    xs = [xa + (i - (naxles - 1) / 2) * 1.3 for i in range(naxles)]
    for s in (1, -1):
        k.box((xa, s * 0.5, zf - 0.38), (naxles * 1.3 + 0.5, 0.12, 0.16), 'dsteel', 0.012)
    for x in xs:
        axle(v, x, 0.91, zf=zf - 0.4, hy=0.5, drive=False, flap=x == xs[0])
    if bumper:
        k.box((x_rear + 0.06, 0, 0.56), (0.1, 2.3, 0.1), 'steel', 0.015)
        for s in (1, -1):
            k.box((x_rear + 0.08, s * 0.7, (zf + 0.5) / 2 - 0.05), (0.08, 0.08, zf - 0.55), 'steel')
    return v


def trailer_box(name):
    xk, xa, xr, xn, hw, z0, z1 = 5.1, -5.1, -6.9, 6.0, 1.22, 1.3, 4.0
    v = trailer(name, xk, xa, xr, ('#ecebe6', '#2f5f9e', '#d9a520'))
    k = v.k
    xc, ln = (xn + xr) / 2, xn - xr
    k.box((xc, 0, (z0 + z1) / 2), (ln, 2 * hw, z1 - z0), 'body', 0.03)
    for z in (z0 + 0.06, z1 - 0.06):  # rails
        for s in (1, -1):
            k.box((xc, s * (hw + 0.004), z), (ln + 0.02, 0.03, 0.14), 'alu', 0.01)
    for x in (xn, xr):
        for s in (1, -1):
            k.box((x - math.copysign(0.03, x), s * (hw - 0.03), (z0 + z1) / 2), (0.1, 0.1, z1 - z0 + 0.01), 'alu', 0.02)
    n = 10
    for i in range(1, n):  # panel joints
        for s in (1, -1):
            k.box((xr + ln * i / n, s * (hw + 0.002), (z0 + z1) / 2), (0.03, 0.01, z1 - z0 - 0.26), 'paint:#c9c7be')
    for s in (1, -1):  # livery: colour block and stripes
        k.box((xc + 0.6, s * (hw + 0.004), 2.5), (ln - 2.4, 0.012, 0.75), 'body2')
        k.box((xc + 0.6, s * (hw + 0.004), 2.0), (ln - 2.4, 0.012, 0.1), 'stripe')
        k.box((xn - 0.5, s * (hw + 0.004), 3.3), (0.6, 0.012, 0.6), 'body2', 0.1)
        for x, m in ((xn - 0.3, 'amber'), (xc, 'amber'), (xr + 0.3, 'tail')):
            k.box((x, s * (hw + 0.012), z0 + 0.06), (0.12, 0.03, 0.05), m, 0.012)
        for i in range(6):  # reflective sill blocks
            k.box((xr + 0.5 + i * 0.5, s * (hw + 0.012), z0 + 0.06), (0.24, 0.02, 0.05), 'red' if i % 2 else 'white')
    # refrigeration unit on the nose
    k.box((xn + 0.14, 0, 3.15), (0.3, 1.8, 1.3), 'white', 0.05)
    k.box((xn + 0.292, 0, 3.3), (0.012, 1.4, 0.6), 'grille')
    for i in range(6):
        k.box((xn + 0.3, 0, 3.05 + i * 0.1), (0.012, 1.4, 0.025), 'steel')
    k.box((xn + 0.292, 0, 2.72), (0.012, 0.8, 0.22), 'body2', 0.02)
    k.box((xn + 0.03, 0.5, 1.7), (0.08, 0.3, 0.3), 'dsteel', 0.02)
    k.tube([(xn + 0.05, 0.42, 1.6), (xn + 0.25, 0.42, 1.45)], 0.016, 'red', 5)
    k.tube([(xn + 0.05, 0.58, 1.6), (xn + 0.25, 0.58, 1.45)], 0.016, BLUE, 5)
    markers(k, xn - 0.1, z1 + 0.005, (-0.9, 0, 0.9))
    # rear doors: frame, seam, lock rods, hinges, lamps in the sill
    k.box((xr - 0.006, 0, (z0 + z1) / 2 + 0.05), (0.012, 0.014, z1 - z0 - 0.3), 'black')
    for s in (1, -1):
        for y in (0.25, 0.75):
            k.cyl((xr - 0.03, s * y, z0 + 0.14), (xr - 0.03, s * y, z1 - 0.14), 0.018, 'steel', 5)
            k.box((xr - 0.04, s * y, z0 + 0.95), (0.03, 0.24, 0.04), 'steel')
        for z in (1.7, 2.65, 3.6):
            k.box((xr - 0.01, s * (hw - 0.11), z), (0.03, 0.14, 0.06), 'steel', 0.008)
        k.box((xr - 0.012, s * hw / 2, 2.65), (0.012, 0.9, 2.2), 'body', 0.004)
    k.box((xr - 0.01, 0, z0 + 0.06), (0.03, 2 * hw, 0.16), 'alu', 0.01)
    rear_lamps(k, xr - 0.0, z0 + 0.06, hw - 0.02, bar=False)
    markers(k, xr - 0.01, z1 - 0.06, (-0.9, -0.12, 0, 0.12, 0.9), 'tail', 0.03)
    for i in range(8):
        k.box((xr + 0.0, -0.98 + i * 0.28, 0.56), (0.012, 0.26, 0.06), 'red' if i % 2 else 'white')
    for x in (xk - 1.0, 0.5, -2.0, xa + 2.2):  # under-floor cross members
        k.box((x, 0, z0 - 0.06), (0.12, 2 * hw - 0.1, 0.1), 'trim')
    return v


def trailer_tanker(name):
    xk, xa, xr, xn, r, zc = 4.6, -4.6, -6.1, 5.9, 1.05, 2.4
    v = trailer(name, xk, xa, xr + 0.1, ('#b9bec3', '#b3261e', '#ecebe6'))
    k = v.k
    ln = xn - xr
    k.lathe((xr, 0, zc), (1, 0, 0), [(0, 0.0), (0.05, 0.55, 'alu'), (0.22, 0.9, 'alu'), (0.5, r, 'alu'), (ln - 0.5, r, 'alu'), (ln - 0.22, 0.9, 'alu'),
                                    (ln - 0.05, 0.55, 'alu'), (ln, 0.0, 'alu')], 'alu', 16, phase=math.pi / 16)
    for i in range(5):
        x = xr + 0.5 + (ln - 1.0) * i / 4
        k.cyl((x - 0.04, 0, zc), (x + 0.04, 0, zc), r + 0.012, 'steel', 16, phase=math.pi / 16, caps=False)
    for s in (1, -1):
        k.box(((xn + xr) / 2, s * (r - 0.005), zc), (ln - 2.6, 0.03, 0.34), 'body2', 0.008)
        k.box(((xn + xr) / 2, s * (r - 0.005), zc - 0.25), (ln - 2.6, 0.03, 0.06), 'stripe', 0.008)
        k.box((xr + 0.9, s * (r + 0.006), zc + 0.02), (0.34, 0.02, 0.34), 'orange', 0.01)
        for x in (xk + 0.2, 1.5, -1.5, xa):  # saddles
            k.box((x, s * 0.52, 1.42), (0.5, 0.2, 0.36), 'trim', 0.02)
        k.cyl((1.8, s * 1.0, 1.28), (-2.6, s * 1.0, 1.28), 0.09, 'dsteel', 8)  # hose tubes
        k.cyl((1.83, s * 1.0, 1.28), (1.8, s * 1.0, 1.28), 0.1, 'steel', 8)
        k.bar([(xa + 1.6, s * 0.91, 0.9), (xa + 1.45, s * 0.91, 1.12), (xa - 1.45, s * 0.91, 1.12), (xa - 1.6, s * 0.9, 0.9)], 0.66, 0.03, 'alu', 0.01)
        k.box((xn - 1.2, s * (r + 0.01), zc - 0.6), (0.12, 0.03, 0.05), 'amber', 0.012)
        k.box((xr + 0.6, s * (r + 0.01), zc - 0.6), (0.12, 0.03, 0.05), 'tail', 0.012)
    # walkway, manholes, handrail, ladder
    zt = zc + r
    k.box((0, 0, zt + 0.02), (ln - 2.4, 0.6, 0.04), 'dsteel', 0.01)
    for x in (-3.2, 0.0, 3.2):
        k.cyl((x, 0, zt - 0.02), (x, 0, zt + 0.16), 0.3, 'alu', 12)
        k.cyl((x, 0, zt + 0.16), (x, 0, zt + 0.2), 0.33, 'steel', 12)
        k.box((x, 0, zt + 0.22), (0.5, 0.06, 0.04), 'dsteel', 0.01)
    k.tube([(xn - 1.3, -0.32, zt), (xn - 1.3, -0.32, zt + 0.45), (xr + 1.3, -0.32, zt + 0.45), (xr + 1.3, -0.32, zt)], 0.018, 'steel', 5)
    for i in range(1, 6):
        x = xn - 1.3 + (xr - xn + 2.6) * i / 6
        k.cyl((x, -0.32, zt), (x, -0.32, zt + 0.45), 0.014, 'steel', 4)
    for s in (1, -1):
        k.tube([(xr - 0.02, s * 0.22, 0.75), (xr - 0.02, s * 0.22, zc + 0.5), (xr + 0.5, s * 0.22, zt + 0.02)], 0.02, 'steel', 5)
    for i in range(8):
        k.cyl((xr - 0.02, -0.22, 0.9 + i * 0.3), (xr - 0.02, 0.22, 0.9 + i * 0.3), 0.014, 'steel', 4)
    k.box((0.2, 0, 1.2), (0.7, 0.5, 0.3), 'dsteel', 0.04)  # discharge valves
    for y in (-0.3, 0.3):
        k.cyl((0.2, y, 1.2), (0.2, y * 2.2, 1.12), 0.06, 'steel', 8)
    rear_lamps(k, xr + 0.12, 0.95, 1.15)
    return v


def trailer_logs(name):
    xk, xa, xr, xn = 4.4, -4.4, -5.9, 5.2
    v = trailer(name, xk, xa, xr, ('#2c2e33', '#d8b21c', '#ecebe6'), zf=1.3, spine=0.3)
    k = v.k
    k.box(((xk - 1.5 + xr) / 2, 0, 1.18), (xk - 1.5 - xr, 0.34, 0.28), 'trim', 0.03)
    k.box(((xn + xk - 1.6) / 2, 0, 1.3), (xn - xk + 1.6, 0.34, 0.12), 'trim', 0.02)
    zb = 1.36
    for x in (xk - 0.2, 1.4, -1.6, xa):  # bunks with stakes
        k.box((x, 0, zb - 0.08), (0.22, 2.44, 0.16), 'body2', 0.02)
        for s in (1, -1):
            k.box((x, s * 1.16, zb + 0.95), (0.13, 0.1, 2.1), 'body2', 0.02)
            k.box((x, s * 1.06, zb + 0.08), (0.16, 0.2, 0.2), 'body2', 0.03, rot=(s * 45, 0, 0))
            k.box((x - 0.5, s * 0.6, 1.14), (0.9, 0.06, 0.06), 'trim', rot=(0, 0, -s * 50)) if x in (1.4, -1.6) else None
    rows = [(-0.81, -0.27, 0.27, 0.81), (-0.54, 0.0, 0.54), (-0.8, -0.26, 0.28, 0.8), (-0.52, 0.03, 0.55)]
    i = 0
    for j, ys in enumerate(rows):
        for y in ys:
            r = 0.215 + 0.03 * ((i * 7) % 5) / 4
            x0 = xn - 0.15 - 0.25 * ((i * 3) % 4) / 3
            x1 = xr + 0.1 + 0.3 * ((i * 5) % 4) / 3
            z = zb + 0.25 + j * 0.44
            k.cyl((x0, y, z), (x1, y, z + 0.01), r, 'paint:#5b4130', 8, r1=r - 0.03, mcap='wood2', phase=i * 0.4)
            k.cyl((x0 + 0.004, y, z), (x0 - 0.01, y, z), r * 0.45, 'paint:#a67c48', 6)
            i += 1
    for x in (3.0, 0.0, -3.0):  # binding chains
        k.tube([(x, 1.07, zb), (x, 1.07, zb + 1.78), (x, 0.7, zb + 2.0), (x, -0.7, zb + 2.0), (x, -1.07, zb + 1.78), (x, -1.07, zb)], 0.018, 'steel', 4)
    k.box((xr + 0.3, 0, zb + 2.02), (0.3, 0.4, 0.02), 'red')  # end-of-load flag
    rear_lamps(k, xr + 0.02, 1.0, 1.15)
    for s in (1, -1):
        k.box((xk - 1.0, s * 0.19, 1.2), (0.12, 0.03, 0.05), 'amber', 0.012)
    return v


# ---------------------------------------------------------------------------------------------------------------
def medium_cab(name, paint, r=0.45, stk=True, **over):
    """Conventional medium-duty cab and hood on a bare chassis with a dual rear axle (flatbed, dump truck)."""
    S = dict(type='heavy', wb=4.6, fo=0.95, body_end=0.28, w=1.1, r=r, clear=0.5, rv=0.0, arch=r + 0.1, sq=2.8, inset=0.16, wheel='wheel_truck',
             paint=paint, int='paint:#4d4a44', mirror=False,
             gh=dict(pts=[(1.62, 1.46), (1.32, 2.32), (0.45, 2.32), (0.36, 1.46)], wr=0.94, a=0.06, c=0.1, back=(0.2, 0.16), bevel=0.03),
             nc=(0.03, 0.06), tc=(0.02, 0.03), pinch=(0.06, 0.0),
             cab=dict(x1=0.4, floor=0.86, front=0.62, bench=True, seat_h=0.5, narrow=None, dash_d=0.34),
             loft=dict(crease=1.05, bands=[(0.86, 0.96, 'body2'), (0.98, 1.02, 'stripe')]),
             seams=[[(1.58, None), (1.58, 0.55)], [(0.52, None), (0.52, 0.55)]], handles=[0.66])
    S.update(over)
    v = build_car(name, S)
    k = v.k
    P.nose(v, z=1.08, h=0.32, gw=0.56, lamps='single', lw=0.22, bars=6, bz=0.62, bh=0.2, guards=(), amber='inner')
    lids(v, boot=False)
    west_mirrors(k, 1.5, v.w + 0.16, 1.85, 0.36)
    markers(k, 1.15, 2.345, (-0.5, 0, 0.5))
    for s in (1, -1):
        k.box((1.05, s * (v.w + 0.02), 0.5), (0.7, 0.16, 0.04), 'dsteel', 0.01)  # cab step
        tank(k, 0.12, -0.8, s * 0.8, 0.62, 0.24, step=False) if s > 0 else k.box((-0.3, s * 0.8, 0.66), (0.8, 0.4, 0.4), 'dsteel', 0.03)
    frame(k, 2.6, -4.25, z=0.8, h=0.18)
    axle(v, -2.3, 1.2 - 0.29, r, zf=0.8, flap=True)
    if stk:
        stack(k, 0.13, -0.95, 0.75, 2.75, 0.05)
    else:
        P.exhaust(k, -1.2, -1.0, 0.5)
    return v


def flatbed_truck(name):
    v = medium_cab(name, ('#3f7d6e', '#ece8dc', '#d9a520'))
    k = v.k
    x0, x1, hw, zd = -0.1, -4.4, 1.2, 1.06
    xc, ln = (x0 + x1) / 2, x0 - x1
    k.box((xc, 0, zd), (ln, 2 * hw, 0.12), 'trim', 0.015)
    for i in range(9):
        k.box((xc, -hw + 0.16 + i * (2 * hw - 0.32) / 8, zd + 0.065), (ln - 0.1, 0.25, 0.014), 'wood')
    for i in range(6):  # cross members, stake pockets
        x = x0 - 0.3 - i * (ln - 0.6) / 5
        k.box((x, 0, zd - 0.1), (0.08, 2 * hw - 0.12, 0.1), 'trim')
        for s in (1, -1):
            k.box((x, s * (hw + 0.03), zd), (0.1, 0.06, 0.1), 'dsteel', 0.01)
    for s in (1, -1):
        k.box((xc, s * (hw + 0.07), zd - 0.02), (ln - 0.2, 0.03, 0.035), 'dsteel', 0.008)
        k.box((-1.2, s * 0.85, 0.72), (0.9, 0.5, 0.4), 'body', 0.03)  # tool lockers
        k.box((-1.2, s * 1.105, 0.74), (0.2, 0.012, 0.04), 'chrome')
    # headboard: frame with mesh bars
    zt = 2.45
    for s in (1, -1):
        k.box((x0 - 0.04, s * (hw - 0.05), (zd + zt) / 2), (0.08, 0.1, zt - zd), 'body', 0.015)
    k.box((x0 - 0.04, 0, zt), (0.08, 2 * hw, 0.1), 'body', 0.015)
    k.box((x0 - 0.04, 0, zd + 0.42), (0.05, 2 * hw - 0.2, 0.7), 'body', 0.01)
    for i in range(9):
        k.box((x0 - 0.04, -hw + 0.24 + i * (2 * hw - 0.48) / 8, (zd + zt) / 2 + 0.38), (0.03, 0.04, zt - zd - 0.8), 'dsteel')
    # load: strapped lumber stack and two drums
    for j in range(3):
        k.box((-2.5, 0.0, zd + 0.17 + j * 0.2), (2.6, 1.5, 0.18), 'wood2', 0.01)
        k.box((-2.5, 0.0, zd + 0.265 + j * 0.2), (2.5, 1.44, 0.02), 'wood')
    for x in (-1.7, -3.3):
        k.bar([(x, 0.76, zd + 0.07), (x, 0.76, zd + 0.68), (x, -0.76, zd + 0.68), (x, -0.76, zd + 0.07)], 0.06, 0.012, 'black')
    for y in (-0.5, 0.5):
        k.lathe((-0.7, y, zd + 0.07), (0, 0, 1), [(0, 0.0), (0, 0.29, 'red'), (0.3, 0.29, 'red'), (0.31, 0.305, 'red'), (0.33, 0.29, 'red'),
                                                  (0.6, 0.29, 'red'), (0.61, 0.305, 'red'), (0.63, 0.29, 'red'), (0.88, 0.29, 'red'),
                                                  (0.88, 0.0, 'dsteel')], 'red', 10)
    rear_lamps(k, x1 + 0.0, 0.84, hw - 0.02)
    k.box((x1 + 0.04, 0, 0.55), (0.08, 2.2, 0.1), 'steel', 0.015)
    return v


def dump_truck(name):
    v = medium_cab(name, ('#d9641c', '#2c2e33', '#ecebe6'), r=0.48, stk=False)
    k = v.k
    x0, x1, hw, zd, zt = 0.0, -4.3, 1.2, 1.06, 2.05
    zs = 2.5
    xc, ln = (x0 + x1) / 2, x0 - x1
    px, pz = x1 + 0.3, zd - 0.05  # hinge
    b = Kit()
    b.box((xc, 0, zd + 0.04), (ln, 2 * hw, 0.1), 'body', 0.02)
    b.box((xc, 0, zd + 0.095), (ln - 0.14, 2 * hw - 0.2, 0.012), 'dsteel')
    for s in (1, -1):
        b.box((xc, s * (hw - 0.04), (zd + zt) / 2), (ln, 0.08, zt - zd), 'body', 0.02)
        b.box((xc, s * (hw - 0.085), (zd + zt) / 2 + 0.03), (ln - 0.14, 0.012, zt - zd - 0.1), 'dsteel')
        b.box((xc, s * hw, zt), (ln + 0.04, 0.14, 0.1), 'body', 0.025)
        for i in range(6):
            b.box((x0 - 0.25 - i * (ln - 0.5) / 5, s * (hw + 0.012), (zd + zt) / 2), (0.1, 0.07, zt - zd - 0.06), 'body', 0.02)
        b.box((x1 + 0.03, s * (hw - 0.02), zt + 0.02), (0.1, 0.1, 0.16), 'dsteel', 0.02)  # tailgate hinge
        b.tube([(x1 + 0.12, s * (hw + 0.02), zd + 0.6), (x1 - 0.02, s * (hw - 0.3), zd + 0.2)], 0.012, 'steel', 4)
    b.box((x0 - 0.04, 0, (zd + zs) / 2), (0.08, 2 * hw, zs - zd), 'body', 0.02)
    b.box((x0 - 0.085, 0, (zd + zt) / 2 + 0.1), (0.012, 2 * hw - 0.2, zt - zd), 'dsteel')
    b.box((x0 + 0.6, 0, zs), (1.3, 2 * hw - 0.1, 0.07), 'body', 0.02, rot=(0, -3, 0))  # cab shield
    for y in (-0.6, 0, 0.6):
        b.box((x0 + 0.6, y, zs - 0.05), (1.2, 0.08, 0.05), 'body', rot=(0, -3, 0))
    b.box((x1 + 0.03, 0, (zd + zt) / 2 + 0.02), (0.06, 2 * hw - 0.16, zt - zd - 0.04), 'body', 0.015)  # tailgate
    for y in (-0.6, 0, 0.6):
        b.box((x1 - 0.01, y, (zd + zt) / 2 + 0.02), (0.04, 0.09, zt - zd - 0.14), 'body', 0.015)
    b.box((x1 - 0.008, 0, zd + 0.3), (0.03, 2 * hw - 0.3, 0.08), 'body', 0.015)
    for s in (1, -1):
        b.box((xc - 0.3, s * 0.4, zd - 0.06), (ln - 1.0, 0.1, 0.1), 'body2')
    b.box((px, 0, pz), (0.14, 1.1, 0.12), 'dsteel', 0.03)
    # gravel heap
    grid = []
    for i in range(8):
        u = i / 7
        row = []
        for j in range(7):
            w_ = j / 6
            hump = math.sin(math.pi * u) ** 0.7 * math.sin(math.pi * w_) ** 0.7
            n = 0.05 * math.sin(i * 2.3 + j * 1.7) * hump
            row.append((x0 - 0.085 - u * (ln - 0.15), (w_ * 2 - 1) * (hw - 0.085), zt - 0.3 + 0.52 * hump + n))
        grid.append(row)
    b.patch(grid, 'paint:#8c8478', (0, 0, 1))
    v.child('bed', b, (px, 0, pz))
    v.extra['bed_axis'] = [0, 1, 0]
    # hoist, sub-frame, rear
    k.cyl((-0.5, 0, 0.72), (-1.3, 0, 0.98), 0.09, 'dsteel', 8)
    k.cyl((-1.3, 0, 0.98), (-1.75, 0, 1.0), 0.055, 'chrome', 8)
    for s in (1, -1):
        k.box((xc - 0.3, s * 0.43, 0.94), (ln - 1.0, 0.09, 0.08), 'trim')
        k.box((x1 + 0.12, s * 0.75, 0.82), (0.1, 0.3, 0.2), 'body2', 0.02)
        for i, lm in enumerate(('tail', 'amber')):
            k.box((x1 + 0.065, s * (0.82 - i * 0.14), 0.82), (0.03, 0.11, 0.1), lm, 0.012)
    P.plate(k, x1 + 0.1, 0.7, -1)
    k.box((x1 + 0.1, 0, 0.6), (0.1, 1.9, 0.1), 'steel', 0.015)
    return v


def school_bus(name):
    w, r = 1.2, 0.48
    xf = 4.25
    pil = [(1.95 - 0.72 * i, 1.95 - 0.72 * i, 0.1) for i in range(10)]
    v = build_car(name, dict(
        type='heavy', wb=6.4, fo=1.05, ro=2.48, w=w, r=r, clear=0.52, arch=0.58, sq=2.8, inset=0.32, inset_r=0.31, depth=0.5, depth_r=0.66,
        wheel='wheel_truck', wheel_r='wheel_truck_dual', paint=('#e8a917', '#1d1f24', '#ecebe6'), int='paint:#59685a', mirror=False,
        gh=dict(pts=[(2.75, 1.62), (2.6, 2.9), (-5.55, 2.92), (-5.66, 1.62)], wr=1.08, pillars=pil, a=0.08, c=0.12, rail=0.28, sill=0.12,
                ws=(0.07, 0.1), back=(0.3, 0.2), bevel=0.05, crown=0.06, inner='paint:#d8d2bd'),
        top=[(xf, 1.3), (xf - 0.06, 1.42), (2.75, 1.62), (-5.66, 1.62), (-5.68, 1.58)],
        bot=[(xf, 0.7), (xf - 0.2, 0.55), (-4.6, 0.55), (-5.68, 0.75)],
        wid=[(xf, 0.95), (xf - 0.1, 1.05), (2.9, 1.12), (2.72, w), (-5.6, w), (-5.68, w - 0.03)],
        cab=dict(x0=2.7, x1=-5.6, floor=1.1, front=None, steer_y=0.62, console=False, narrow=None, dash_d=0.36),
        loft=dict(crease=1.0, bands=[(0.72, 0.78, 'body2', -5.68, 2.72), (1.14, 1.2, 'body2', -5.68, 2.72), (1.46, 1.52, 'body2', -5.68, 2.72)]),
        seams=[], handles=[]))
    k = v.k
    P.nose(v, z=1.06, h=0.3, gw=0.42, lamps='round2', bars=6, bz=0.66, bh=0.2, guards=(), amber='inner', bm='trim', strip=None)
    lids(v, boot=False, y=0.85)
    truck_tail(v, 1.1, 0.3, bz=0.66, bh=0.2, gate=False, bm='trim', exh=(-0.7,))
    # interior: driver seat and eleven rows of benches either side of the aisle
    P.seat(k, 1.6, 0.62, 1.15, 0.5, 'paint:#3a3c40', 0.6, 14, True)
    v.extra['seat'] = [1.72, 0.62, 1.43]
    for i in range(11):
        for s in (1, -1):
            P.seat(k, 0.85 - i * 0.6, s * 0.66, 1.13, 0.82, 'paint:#4f6b52', 0.52, 6, False, cush=0.38)
    k.cyl((2.05, -0.5, 1.1), (2.05, -0.5, 2.1), 0.02, 'chrome', 5)
    # entry door (right), stop sign (left), emergency door (rear)
    yd = v.L.side_y(2.3, 1.3) + 0.004
    for x in (2.68, 2.32, 1.96):
        k.box((x, -yd, 1.12), (0.02, 0.012, 0.94), 'black')
    for x in (2.5, 2.14):
        k.box((x, -yd - 0.004, 1.2), (0.26, 0.012, 0.5), 'body2', 0.02)
    k.box((2.32, -yd, 0.6), (0.8, 0.14, 0.05), 'dsteel', 0.01)
    k.cyl((1.5, yd - 0.004, 1.3), (1.5, yd + 0.03, 1.3), 0.26, 'red', 8, phase=math.pi / 8)
    k.box((1.5, yd + 0.032, 1.3), (0.32, 0.006, 0.09), 'white')
    k.box((1.72, yd + 0.01, 1.3), (0.12, 0.03, 0.06), 'dsteel')
    for x in (-5.686,):
        k.box((x, 0.38, 1.3), (0.012, 0.014, 0.9), 'black')
        k.box((x, -0.38, 1.3), (0.012, 0.014, 0.9), 'black')
        k.box((x - 0.012, -0.28, 1.45), (0.03, 0.1, 0.035), 'chrome', 0.008)
    # roof: warning lamps front and rear, hatch, name boards as colour blocks
    for xx, sg in ((2.5, 1), (-5.44, -1)):
        k.box((xx, 0, 3.0), (0.16, 2.0, 0.2), 'body', 0.03)
        k.box((xx + sg * 0.078, 0, 3.0), (0.012, 0.9, 0.11), 'body2', 0.01)
        for y, m in ((0.85, 'tail'), (0.62, 'amber'), (-0.62, 'amber'), (-0.85, 'tail')):
            P.round_lamp(k, xx + sg * 0.08, y, 3.0, 0.07, m, sign=sg, bezel='black', sym=False, d=0.03)
    for x in (0.5, -3.0):
        k.box((x, 0, 2.99), (0.6, 0.6, 0.06), 'body', 0.02)
    for x in (1.2, -1.2, -3.6):
        k.box((x, 0, 2.975), (0.04, 2.0, 0.02), 'body')
    west_mirrors(k, 2.9, w + 0.14, 1.95, 0.36)
    for s in (1, -1):
        k.tube([(xf - 0.25, s * 0.8, 1.38), (xf + 0.2, s * 1.05, 1.75)], 0.014, 'black', 5)
        k.cyl((xf + 0.2, s * 1.05, 1.75), (xf + 0.17, s * 1.05, 1.75), 0.11, 'black', 8, mcap='paint:#93a6b0')
    P.side_lamp(v, 2.5, 1.3, 'amber', 0.12, 0.06)
    P.side_lamp(v, -5.5, 1.3, 'tail', 0.12, 0.06)
    return v


def camper_trailer(name):
    xc, xa, xh = -1.65, -1.95, 1.95
    a, b = xc + 2.4, xc - 2.4
    v = Vehicle(name, 'trailer')
    k = v.k
    top = [(a, 1.5), (a - 0.08, 2.05), (a - 0.25, 2.3), (a - 0.5, 2.47), (a - 0.9, 2.57), (xc, 2.6), (b + 0.9, 2.57), (b + 0.5, 2.47),
           (b + 0.25, 2.3), (b + 0.08, 2.05), (b, 1.5)]
    bot = [(a, 1.15), (a - 0.06, 0.88), (a - 0.25, 0.68), (a - 0.6, 0.56), (b + 0.6, 0.56), (b + 0.25, 0.68), (b + 0.06, 0.88), (b, 1.15)]
    wid = [(a, 0.82), (a - 0.12, 0.98), (a - 0.5, 1.08), (b + 0.5, 1.08), (b + 0.12, 0.98), (b, 0.82)]
    L = v.loft(top, bot, wid, tuck=0.14, cham=0.24, crease=1.45, crown=0.1, lean=0.03, rocker=0.14, upper='alu', lower='alu',
               bands=[(1.2, 1.36, 'body2'), (1.39, 1.43, 'stripe')], xs=[xa, xc + 1.2, xc - 1.2])
    v.arch(xa, 0.42, 0.33, depth=0.32, lip=0.04, lip_m='steel')
    v.wheel(xa, 0.92, 0.33, 'wheel_steel')
    v.extra.update(hitch=[xh, 0.0, 0.5], paint=('#b9bec3', '#3f7f8c', '#ece8dc'))
    for x in (xc + 1.2, xc, xc - 1.2):  # panel seams
        P.side_strip(v, [(x, 0.62), (x, 2.2)], 0.014, 'steel')
        P.top_strip(v, [(x, -0.8), (x, 0.8)], 0.014, 'steel')
    P.side_strip(v, [(a - 0.5, 1.9), (b + 0.5, 1.9)], 0.014, 'steel')

    def win(x0, x1, z0, z1, door=False):
        P.side_panel(v, x1, x0, z0, z1, 'chrome', 0.012)
        P.side_panel(v, x1 + 0.03, x0 - 0.03, z0 + 0.03, z1 - 0.03, 'paint:#d9d2bd', 0.014, walls=False)
        P.side_panel(v, x1 + 0.03, x0 - 0.03, z0 + 0.03, z1 - 0.03, 'clear', 0.02, walls=False)
    win(xc + 1.7, xc + 0.75, 1.5, 2.0)
    win(xc - 0.9, xc - 1.8, 1.5, 2.0)
    # door on the right side with window, handle and folding step
    yd = lambda z: -(L.side_y(xc, z) + 0.006)
    for x in (xc + 0.35, xc - 0.35):
        k.box((x, yd(1.3), 1.33), (0.02, 0.02, 1.5), 'steel')
    k.box((xc, yd(2.08), 2.08), (0.72, 0.02, 0.02), 'steel')
    k.box((xc, yd(1.75) - 0.004, 1.75), (0.4, 0.016, 0.4), 'chrome', 0.03)
    k.box((xc, yd(1.75) - 0.012, 1.75), (0.33, 0.01, 0.33), 'paint:#3b4750', 0.03)
    k.box((xc - 0.27, yd(1.2) - 0.01, 1.2), (0.05, 0.03, 0.12), 'chrome', 0.01)
    k.box((xc, -1.1, 0.45), (0.6, 0.26, 0.03), 'dsteel', 0.008)
    for x in (xc + 0.27, xc - 0.27):
        k.box((x, -1.0, 0.52), (0.03, 0.2, 0.14), 'dsteel')
    k.tube([(xc + 1.9, -1.06, 2.2), (xc - 1.9, -1.06, 2.2)], 0.05, 'paint:#e8e4d8', 8)  # rolled awning
    # end windows
    for x, rot, sg in ((a - 0.02, -8.3, 1), (b + 0.02, 8.3, -1)):
        k.box((x, 0, 1.78), (0.03, 1.0, 0.44), 'chrome', 0.01, rot=(0, rot, 0))
        k.box((x + sg * 0.012, 0, 1.78), (0.02, 0.92, 0.36), 'paint:#d9d2bd', rot=(0, rot, 0))
        k.box((x + sg * 0.022, 0, 1.78), (0.012, 0.92, 0.36), 'clear', rot=(0, rot, 0))
    # roof vents, drawbar, coupler, jack, gas bottles, stabilisers, tail
    k.box((xc + 0.9, 0, 2.66), (0.5, 0.5, 0.1), 'white', 0.03)
    k.box((xc - 0.8, 0, 2.68), (0.8, 0.7, 0.16), 'white', 0.05)
    for s in (1, -1):
        k.bar([(a - 0.9, s * 0.62, 0.5), (xh - 0.2, s * 0.05, 0.5)], 0.07, 0.1, 'dsteel', 0.01)
        k.lathe((a + 0.32, s * 0.2, 0.56), (0, 0, 1), [(0, 0.0), (0, 0.15, 'white'), (0.42, 0.15, 'white'), (0.52, 0.08, 'white'), (0.56, 0.05, 'steel'),
                                                      (0.6, 0.05, 'steel'), (0.6, 0.0, 'steel')], 'white', 10)
        k.box((b + 0.5, s * 0.85, 0.3), (0.06, 0.06, 0.55), 'dsteel')
        k.box((b + 0.5, s * 0.85, 0.03), (0.16, 0.16, 0.03), 'dsteel')
        P.round_lamp(k, b + 0.035, s * 0.6, 1.22, 0.07, 'tail', sign=-1, sym=False)
        P.round_lamp(k, b + 0.035, s * 0.42, 1.22, 0.05, 'amber', sign=-1, sym=False)
    k.box((a + 0.32, 0, 0.52), (0.45, 0.75, 0.04), 'dsteel', 0.01)
    k.box((xh - 0.08, 0, 0.5), (0.34, 0.12, 0.11), 'dsteel', 0.03)
    k.cyl((xh, 0, 0.44), (xh, 0, 0.52), 0.05, 'steel', 8)
    k.cyl((xh - 0.42, 0, 0.12), (xh - 0.42, 0, 0.85), 0.03, 'steel', 6)
    k.cyl((xh - 0.42, -0.04, 0.1), (xh - 0.42, 0.04, 0.1), 0.1, 'black', 10)
    k.box((xh - 0.42, 0.06, 0.86), (0.03, 0.14, 0.03), 'steel')
    k.tube([(b - 0.05, 0.75, 0.6), (b - 0.05, -0.75, 0.6)], 0.035, 'chrome', 6)
    for s in (1, -1):
        k.box((b + 0.02, s * 0.5, 0.6), (0.14, 0.05, 0.05), 'dsteel')
    P.plate(k, b + 0.03, 0.98, -1)
    k.cyl((xa, -0.92, 0.33), (xa, 0.92, 0.33), 0.04, 'dsteel', 6)
    return v


# ---------------------------------------------------------------------------------------------------------------
def tractor_farm(name):
    v = Vehicle(name, 'heavy')
    k = v.k
    v.extra.update(paint=('#2f7d3a', '#e3c21c', '#ecebe6'), seat=[-0.83, 0.0, 1.42], hitch=[-1.95, 0.0, 0.42])
    xa, xb, rf, rr = 1.2, -1.2, 0.42, 0.78
    v.wheel(xa, 0.72, rf, 'wheel_tractor')
    v.wheel(xb, 0.9, rr, 'wheel_tractor')
    # hood, grille, engine
    k.box((1.02, 0, 1.27), (1.56, 0.62, 0.6), 'body', 0.07)
    k.box((1.805, 0, 1.25), (0.02, 0.44, 0.42), 'grille', 0.02)
    for i in range(6):
        k.box((1.817, 0, 1.08 + i * 0.065), (0.012, 0.4, 0.02), 'body2')
    P.round_lamp(k, 1.81, 0.14, 1.47, 0.045, 'head', bezel='trim')
    for s in (1, -1):
        k.box((1.02, s * 0.312, 1.36), (1.3, 0.008, 0.1), 'body2')
        k.box((1.02, s * 0.312, 1.28), (1.3, 0.008, 0.025), 'stripe')
        for i in range(5):
            k.box((0.7 + i * 0.16, s * 0.313, 1.12), (0.09, 0.008, 0.14), 'black')
    k.box((1.02, 0, 1.573), (1.3, 0.012, 0.008), 'black')
    k.cyl((0.45, 0.12, 1.57), (0.45, 0.12, 1.6), 0.05, 'black', 8)
    k.box((1.0, 0, 0.8), (1.3, 0.42, 0.4), 'dsteel', 0.04)
    for s in (1, -1):
        k.cyl((1.25, s * 0.22, 0.86), (0.75, s * 0.22, 0.86), 0.09, 'steel', 8)
        k.box((0.5, s * 0.23, 0.78), (0.2, 0.08, 0.26), 'trim', 0.02)
    k.box((1.78, 0, 0.72), (0.22, 0.56, 0.32), 'trim', 0.04)  # nose weights
    for i in range(5):
        k.box((1.893, -0.2 + i * 0.1, 0.72), (0.012, 0.012, 0.3), 'under')
    k.box((1.35, 0, 0.56), (0.5, 0.3, 0.2), 'dsteel', 0.03)
    k.box((xa, 0, rf + 0.02), (0.13, 1.24, 0.1), 'dsteel', 0.02)
    for s in (1, -1):
        k.cyl((xa, s * 0.6, rf - 0.1), (xa, s * 0.6, rf + 0.14), 0.045, 'steel', 6)
        k.tube([(xa - 0.14, s * 0.56, rf + 0.02), (xa - 0.14, 0.0, rf + 0.02)], 0.018, 'steel', 5)
    # exhaust, air pre-cleaner
    k.cyl((1.15, 0.15, 1.56), (1.15, 0.15, 2.4), 0.03, 'dsteel', 8, mcap='under')
    k.cyl((1.15, 0.15, 1.66), (1.15, 0.15, 2.08), 0.07, 'dsteel', 8)
    k.cyl((1.15, 0.15, 2.4), (1.11, 0.15, 2.47), 0.03, 'dsteel', 8, mcap='under')
    k.cyl((0.7, -0.15, 1.56), (0.7, -0.15, 1.8), 0.025, 'steel', 6)
    k.lathe((0.7, -0.15, 1.78), (0, 0, 1), [(0, 0.05), (0.02, 0.085, 'steel'), (0.1, 0.085, 'steel'), (0.14, 0.04, 'steel'), (0.14, 0, 'steel')], 'steel', 8)
    # transmission, rear axle, platform
    k.box((-0.5, 0, 0.8), (1.75, 0.46, 0.5), 'dsteel', 0.05)
    k.cyl((xb, -0.7, rr), (xb, 0.7, rr), 0.13, 'dsteel', 8)
    k.lathe((xb, 0, rr), (1, 0, 0), [(-0.3, 0.0), (-0.28, 0.2, 'dsteel'), (0.0, 0.3, 'dsteel'), (0.28, 0.2, 'dsteel'), (0.3, 0.0, 'dsteel')], 'dsteel', 8)
    k.box((-0.55, 0, 1.07), (1.25, 1.04, 0.05), 'dsteel', 0.012)
    k.box((-0.55, 0, 1.098), (1.1, 0.5, 0.008), 'black')
    for s in (1, -1):
        k.box((-0.1, s * 0.66, 0.62), (0.34, 0.26, 0.035), 'dsteel', 0.01)
        k.box((-0.1, s * 0.55, 0.85), (0.05, 0.04, 0.45), 'dsteel')
    # dash console, steering, seat, levers
    k.box((0.12, 0, 1.33), (0.32, 0.52, 0.56), 'body', 0.05)
    k.box((-0.045, 0, 1.45), (0.012, 0.36, 0.16), 'paint:#d8d3c0', 0.004)
    P.steering(v, -0.34, 0.0, 1.66, r=0.2, tilt=48, col=0.42)
    k.box((-0.85, 0, 1.16), (0.3, 0.3, 0.14), 'trim', 0.02)
    P.seat(k, -0.95, 0, 1.2, 0.5, 'paint:#2a2a2c', 0.42, 10, False, cush=0.44, m2='yellow')
    for y, x in ((-0.34, -0.55), (-0.42, -0.62), (0.36, -0.5)):
        k.cyl((x, y, 1.08), (x + 0.06, y, 1.42), 0.014, 'steel', 5)
        k.box((x + 0.065, y, 1.44), (0.05, 0.05, 0.05), 'red' if y < 0 else 'black', 0.015)
    # rear fenders with inner panels, lamps
    arc = [(xb + 0.885 * math.cos(math.radians(a)), rr + 0.885 * math.sin(math.radians(a))) for a in range(20, 161, 14)]
    with k.sym():
        mudguard(k, xb, rr, 0.84, 0.52, 1.14, 'body', 20, 160)
        k.prism(arc, 0.52, 0.55, 'y', 'body')
        k.box((-0.52, 0.84, 1.31), (0.05, 0.05, 0.2), 'trim')
        k.box((-1.98, 0.84, 1.16), (0.05, 0.05, 0.2), 'trim')
    P.round_lamp(k, -0.5, 0.84, 1.45, 0.07, 'head', bezel='trim')
    P.lamp(k, -1.99, 0.84, 1.27, 0.12, 0.07, 'tail', sign=-1, bezel='trim')
    # roll-over frame and canopy
    k.bar([(-1.5, 0.62, 1.1), (-1.5, 0.62, 2.5), (-1.5, -0.62, 2.5), (-1.5, -0.62, 1.1)], 0.07, 0.07, 'trim', 0.012)
    k.box((-0.8, 0, 2.57), (1.7, 1.5, 0.07), 'body2', 0.025)
    for s in (1, -1):
        k.tube([(0.0, s * 0.5, 1.1), (-0.02, s * 0.62, 2.54)], 0.02, 'trim', 5)
        k.box((-1.5, s * 0.7, 2.25), (0.05, 0.1, 0.14), 'amber', 0.015)
    k.prism([(-0.24, 1.6), (0.24, 1.6), (0.0, 2.02)], -1.565, -1.545, 'x', 'red')  # slow-vehicle triangle
    k.prism([(-0.15, 1.65), (0.15, 1.65), (0.0, 1.91)], -1.575, -1.56, 'x', 'orange')
    # three-point linkage, drawbar, power take-off
    for s in (1, -1):
        k.bar([(-1.3, s * 0.3, 0.6), (-2.05, s * 0.42, 0.45)], 0.05, 0.07, 'dsteel', 0.01)
        k.tube([(-1.45, s * 0.3, 1.05), (-1.75, s * 0.36, 0.52)], 0.018, 'steel', 5)
        k.box((-1.42, s * 0.3, 1.05), (0.3, 0.05, 0.07), 'dsteel', 0.01)
    k.cyl((-1.35, 0, 1.0), (-1.95, 0, 0.82), 0.025, 'steel', 6)
    k.box((-1.65, 0, 0.42), (0.7, 0.1, 0.04), 'dsteel', 0.01)
    k.cyl((-1.95, 0, 0.38), (-1.95, 0, 0.5), 0.022, 'steel', 6)
    k.cyl((-1.38, 0, 0.66), (-1.52, 0, 0.66), 0.035, 'steel', 6)
    k.box((-1.46, 0, 0.74), (0.2, 0.2, 0.03), 'yellow', 0.008)
    return v


def log_loader(name):
    v = Vehicle(name, 'heavy')
    k = v.k
    v.extra.update(paint=('#e3a81a', '#25272b', '#ecebe6'), seat=[-0.43, 0.0, 2.4])
    ax, r, wy = 1.75, 0.75, 0.92
    for x in (ax, -ax):
        v.wheel(x, wy, r, 'wheel_loader')
        k.cyl((x, -0.62, r), (x, 0.62, r), 0.15, 'dsteel', 8)
        k.lathe((x, 0, r), (1, 0, 0), [(-0.32, 0.0), (-0.3, 0.2, 'dsteel'), (0.0, 0.32, 'dsteel'), (0.3, 0.2, 'dsteel'), (0.32, 0.0, 'dsteel')], 'dsteel', 8)
        for s in (1, -1):  # flat fenders with a chamfered lip and stays
            k.bar([(x + 0.98, s * wy, 1.3), (x + 0.8, s * wy, 1.6), (x - 0.8, s * wy, 1.6), (x - 0.98, s * wy, 1.3)], 0.7, 0.045, 'body', 0.012)
            k.box((x, s * 0.56, 1.5), (0.5, 0.1, 0.12), 'trim')
    # rear frame, engine hood, counterweight
    k.box((-1.4, 0, 1.1), (3.4, 1.04, 1.0), 'trim', 0.06)
    k.box((-2.05, 0, 2.0), (2.1, 1.5, 0.82), 'body', 0.09)
    k.box((-3.25, 0, 1.2), (0.36, 1.7, 0.95), 'body2', 0.09)
    k.box((-3.107, 0, 2.0), (0.02, 1.1, 0.56), 'grille', 0.02)
    for i in range(7):
        k.box((-3.117, 0, 1.79 + i * 0.07), (0.012, 1.06, 0.022), 'dsteel')
    for s in (1, -1):
        for i in range(6):
            k.box((-2.7 + i * 0.17, s * 0.752, 2.08), (0.09, 0.01, 0.4), 'black')
        k.box((-2.05, s * 0.752, 1.72), (1.9, 0.01, 0.1), 'body2')
        k.box((-1.4, s * 0.752, 2.1), (0.3, 0.012, 0.44), 'body', 0.004)
        k.box((-1.3, s * 0.76, 2.1), (0.03, 0.02, 0.1), 'black', 0.006)
        P.lamp(k, -3.435, s * 0.66, 1.42, 0.2, 0.1, 'tail', sign=-1, bezel='black', sym=False)
        P.lamp(k, -3.435, s * 0.42, 1.42, 0.12, 0.1, 'amber', sign=-1, bezel='black', sym=False)
        for i in range(4):  # hazard chevrons
            k.box((-3.433, s * (0.14 + i * 0.2), 0.98), (0.008, 0.1, 0.28), 'yellow', rot=(s * 30, 0, 0))
    k.box((-3.44, 0, 1.42), (0.02, 0.3, 0.1), 'reverse', 0.01)
    k.box((-3.45, 0, 0.82), (0.14, 0.24, 0.08), 'dsteel', 0.02)
    k.cyl((-3.47, 0, 0.74), (-3.47, 0, 0.92), 0.025, 'steel', 6)
    k.cyl((-1.75, 0.32, 2.4), (-1.75, 0.32, 3.2), 0.04, 'dsteel', 8, mcap='under')
    k.cyl((-1.75, 0.32, 2.45), (-1.75, 0.32, 2.85), 0.085, 'dsteel', 8)
    k.cyl((-2.5, -0.3, 2.4), (-2.5, -0.3, 2.62), 0.035, 'steel', 6)
    k.lathe((-2.5, -0.3, 2.6), (0, 0, 1), [(0, 0.06), (0.02, 0.11, 'steel'), (0.12, 0.11, 'steel'), (0.17, 0.05, 'steel'), (0.17, 0, 'steel')], 'steel', 8)
    k.tube([(-2.2, 0, 2.41), (-2.2, 0, 2.47), (-2.6, 0, 2.47), (-2.6, 0, 2.41)], 0.014, 'black', 5)
    # cab: base, glazed upper, roof cap, interior
    k.box((-0.38, 0, 1.75), (1.26, 1.5, 0.9), 'body', 0.07)
    yy = greenhouse(v, [(0.2, 2.2), (0.1, 3.38), (-0.92, 3.38), (-1.0, 2.2)], 0.73, 0.68, pillars=[(-0.42, -0.42, 0.08)], a=0.07, c=0.07,
                    rail=0.07, sill=0.05, ws=(0.06, 0.07), back=(0.06, 0.07), bevel=0.03, crown=0.02, roof='body2', inner='paint:#3a3c40')
    k.box((-0.41, 0, 3.43), (1.3, 1.5, 0.07), 'body2', 0.025)
    k.box((-0.4, 0, 2.205), (1.14, 1.4, 0.012), 'paint:#2a2a2c')
    k.box((-0.6, 0, 2.3), (0.32, 0.4, 0.2), 'trim', 0.03)
    P.seat(k, -0.55, 0, 2.36, 0.52, 'paint:#3a3c40', 0.55, 12, True, cush=0.46)
    k.box((0.02, 0, 2.42), (0.22, 1.3, 0.44), 'trim', 0.04)
    k.box((-0.095, 0.0, 2.56), (0.012, 0.5, 0.1), 'paint:#d8d3c0')
    P.steering(v, -0.2, 0.0, 2.78, r=0.17, tilt=40, col=0.3)
    for y in (-0.42, -0.5):
        k.cyl((-0.3, y, 2.22), (-0.26, y, 2.62), 0.014, 'steel', 5)
        k.box((-0.255, y, 2.64), (0.05, 0.05, 0.05), 'black', 0.015)
    for s in (1, -1):
        P.lamp(k, 0.2, s * 0.5, 3.43, 0.18, 0.09, 'head', bezel='black', sym=False)
        P.lamp(k, -1.03, s * 0.5, 3.43, 0.18, 0.09, 'reverse', sign=-1, bezel='black', sym=False)
        k.box((-0.38, s * 0.752, 1.9), (0.9, 0.01, 0.1), 'body2')
    k.cyl((-0.7, 0.4, 3.46), (-0.7, 0.4, 3.5), 0.09, 'trim', 8)
    k.cyl((-0.7, 0.4, 3.5), (-0.7, 0.4, 3.62), 0.07, 'amber', 8)
    west_mirrors(k, 0.26, 0.9, 2.95, 0.34)
    # door (left), ladder and handrails
    for x in (0.12, -0.9):
        k.box((x, 0.752, 1.78), (0.014, 0.01, 0.8), 'black')
    k.box((-0.8, 0.76, 2.05), (0.04, 0.03, 0.14), 'black', 0.01)
    for i, z in enumerate((0.62, 0.98, 1.34)):
        k.box((-0.38, 0.88, z), (0.62, 0.26, 0.04), 'dsteel', 0.01)
    for x in (-0.68, -0.08):
        k.box((x, 0.98, 0.98), (0.04, 0.03, 0.78), 'dsteel')
        k.tube([(x, 0.99, 1.35), (x, 1.0, 2.1), (x, 0.78, 2.15)], 0.018, 'black', 5)
    k.box((-0.38, -0.86, 1.25), (0.9, 0.22, 0.5), 'trim', 0.03)  # tool / battery box on the right
    k.box((-0.38, -0.975, 1.3), (0.2, 0.012, 0.04), 'steel')
    # articulation joint and steering rams
    for z in (0.8, 1.3):
        k.box((0.52, 0, z), (0.6, 0.5, 0.1), 'dsteel', 0.02)
    k.cyl((0.6, 0, 0.7), (0.6, 0, 1.42), 0.07, 'steel', 8)
    for s in (1, -1):
        k.cyl((0.0, s * 0.42, 1.0), (0.6, s * 0.42, 1.0), 0.06, 'dsteel', 8)
        k.cyl((0.6, s * 0.42, 1.0), (1.05, s * 0.4, 1.0), 0.035, 'chrome', 6)
    # front frame, loader tower, boom
    k.box((1.75, 0, 1.05), (1.9, 0.9, 0.8), 'body', 0.07)
    k.box((2.72, 0, 1.05), (0.05, 0.6, 0.4), 'body2', 0.01)
    tower = [(0.95, 1.4), (1.9, 1.4), (1.62, 2.38), (1.35, 2.55), (1.1, 2.38)]
    with k.sym():
        k.prism(tower, 0.36, 0.5, 'y', 'body')
        k.bar([(1.35, 0.6, 2.38), (2.75, 0.6, 2.05), (3.55, 0.6, 1.0)], 0.12, 0.3, 'body', 0.03)
        k.cyl((1.35, 0.5, 2.38), (1.35, 0.7, 2.38), 0.1, 'dsteel', 8)
        k.cyl((3.55, 0.5, 1.0), (3.55, 0.7, 1.0), 0.1, 'dsteel', 8)
        k.cyl((1.7, 0.47, 1.15), (2.3, 0.47, 1.62), 0.085, 'dsteel', 8)
        k.cyl((2.3, 0.47, 1.62), (2.75, 0.5, 1.97), 0.045, 'chrome', 6)
    k.cyl((2.8, -0.6, 2.0), (2.8, 0.6, 2.0), 0.09, 'body', 8)
    k.cyl((1.4, 0, 2.3), (2.2, 0, 2.12), 0.08, 'dsteel', 8)  # tilt ram and link
    k.cyl((2.2, 0, 2.12), (2.8, 0, 2.05), 0.045, 'chrome', 6)
    k.bar([(2.8, 0, 2.0), (3.5, 0, 1.55)], 0.1, 0.12, 'body', 0.02)
    # fork carriage, tines, grapple
    xc = 3.62
    for s in (1, -1):
        k.box((xc, s * 0.85, 0.98), (0.12, 0.1, 1.4), 'body2', 0.02)
        k.box((xc, s * 0.3, 0.98), (0.08, 0.08, 1.3), 'body2')
        k.box((xc + 0.09, s * 0.52, 0.72), (0.07, 0.15, 0.9), 'dsteel', 0.015)
        k.box((xc + 0.62, s * 0.52, 0.3), (1.1, 0.15, 0.07), 'dsteel', 0.015)
        k.prism([(xc + 1.17, 0.265), (xc + 1.42, 0.265), (xc + 1.17, 0.335)], s * 0.52 - 0.075, s * 0.52 + 0.075, 'y', 'dsteel')
        pts = [(xc + 0.45 + 0.85 * math.cos(math.radians(a)), s * 0.44, 1.02 + 0.85 * math.sin(math.radians(a))) for a in range(132, -31, -18)]
        k.bar(pts, 0.09, 0.12, 'body', 0.02)
        k.cyl((xc - 0.02, s * 0.44, 1.2), (xc + 0.3, s * 0.44, 1.83), 0.05, 'dsteel', 6)
    for z in (0.32, 1.0, 1.66):
        k.box((xc, 0, z), (0.11, 1.8, 0.11), 'body2', 0.02)
    k.cyl((xc + 0.45 + 0.85 * math.cos(math.radians(60)), -0.44, 1.02 + 0.85 * math.sin(math.radians(60))),
          (xc + 0.45 + 0.85 * math.cos(math.radians(60)), 0.44, 1.02 + 0.85 * math.sin(math.radians(60))), 0.045, 'body', 6)
    # the load: a separate part so it can be hidden
    ld = Kit()
    for i, (x, z, rr, ln) in enumerate(((xc + 0.42, 0.6, 0.26, 3.5), (xc + 0.95, 0.59, 0.25, 3.7), (xc + 0.68, 1.04, 0.24, 3.4))):
        y0 = ln / 2 + 0.1 * (i - 1)
        ld.cyl((x, y0, z), (x, y0 - ln, z + 0.01), rr, 'paint:#5b4130', 8, r1=rr - 0.025, mcap='wood2', phase=i * 0.5)
        for yy_, sg in ((y0, 1), (y0 - ln, -1)):
            ld.cyl((x, yy_ + sg * 0.004, z), (x, yy_ - sg * 0.01, z), rr * 0.45, 'paint:#a67c48', 6)
    v.child('load', ld, (xc + 0.68, 0, 0.34))
    return v


ROSTER = [('semi_cabover', semi_cabover), ('semi_conventional', semi_conventional), ('flatbed_truck', flatbed_truck),
          ('dump_truck', dump_truck), ('school_bus', school_bus), ('log_loader', log_loader),
          ('trailer_box', trailer_box), ('trailer_tanker', trailer_tanker), ('trailer_logs', trailer_logs),
          ('camper_trailer', camper_trailer), ('tractor_farm', tractor_farm)]

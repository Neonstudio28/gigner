"""Shared wheel assets for the vehicles family: centred on their own origin, axle along Y, outer face towards +Y,
modelled at 0.33 m radius (the engine scales them to the radius given in each vehicle's `wheels` extra)."""
import math
from mathutils import Matrix
import lib
from vehicles_kit import Kit, compact

R = 0.33


def spin(k, n, phase=0.0):
    """Yields n transforms around the axle; build each element at the top (+Z) of the wheel."""
    for i in range(n):
        yield k.xf(Matrix.Rotation(phase + 2 * math.pi * i / n, 4, 'Y'))


def tyre(k, hw=0.108, rim=0.2, floor=0.045, back=-0.05, seg=20, blocks=20, lip='chrome', barrel='dsteel', y0=0.0,
         letters=False, lugtread=False):
    """Tyre with grooved tread and shoulder blocks, rim lip, barrel and the back wall behind the spokes."""
    w = hw
    prof = [(back, 0.0), (back, rim - 0.02, 'under'), (-w + 0.004, rim - 0.005, 'under'), (-w, rim + 0.07, 'tyre'),
            (-w + 0.016, R - 0.014, 'tyre'), (-w + 0.034, R, 'tyre'), (-0.022, R, 'tyre'), (-0.016, R - 0.011, 'under'),
            (0.016, R - 0.011, 'under'), (0.022, R, 'under'), (w - 0.034, R, 'tyre'), (w - 0.016, R - 0.014, 'tyre'),
            (w, rim + 0.07, 'tyre'), (w - 0.004, rim + 0.012, 'tyre'), (w + 0.006, rim + 0.004, lip),
            (w - 0.004, rim - 0.012, lip), (floor + 0.012, rim - 0.03, barrel), (floor, rim - 0.05, barrel), (floor, 0.0, 'under')]
    k.lathe((0, y0, 0), (0, 1, 0), prof, 'tyre', seg)
    for s in (1, -1):
        for T in spin(k, blocks, (0.5 if s < 0 else 0.0) * 2 * math.pi / blocks):
            with T:
                if lugtread:
                    k.box((0.03 * s, y0 + s * (w * 0.5), R + 0.004), (0.05, w * 0.95, 0.03), 'tyre', rot=(0, 0, 28 * s))
                else:
                    k.box((0, y0 + s * (w - 0.04), R - 0.004), (2 * math.pi * R / blocks * 0.6, 0.034, 0.016), 'tyre')
    if letters:
        for a0 in (60, 240):
            for j, wd in enumerate((1, 1, 0.6, 1, 1.3, 1, 0.6, 1)):
                with k.xf(Matrix.Rotation(math.radians(a0 + j * 8.5 - 30), 4, 'Y')):
                    k.box((0, y0 + w - 0.006, rim + 0.062), (0.022 * wd, 0.012, 0.026), 'white')


def hub(k, y, r=0.05, n=5, lr=0.03, cap='chrome', nut='chrome', face='alu', depth=0.03):
    k.lathe((0, y - depth, 0), (0, 1, 0), [(0, r + 0.012), (depth, r, face), (depth + 0.006, r - 0.012, face)], face, 10)
    k.lathe((0, y, 0), (0, 1, 0), [(0, lr * 0.62), (0.014, lr * 0.55, cap), (0.02, lr * 0.3, cap), (0.02, 0, cap)], cap, 8)
    for T in spin(k, n, math.pi / n):
        with T:
            k.cyl((0, y - 0.004, lr + 0.008), (0, y + 0.014, lr + 0.008), 0.009, nut, 6)


def disc(k, y=0.05, r=0.15):
    k.lathe((0, y, 0), (0, 1, 0), [(0, 0.0), (0, r, 'steel'), (0.012, r, 'steel'), (0.012, 0.075, 'steel'), (0.022, 0.07, 'dsteel'), (0.022, 0, 'dsteel')], 'steel', 14)
    k.box((-0.105, y + 0.012, 0.06), (0.07, 0.03, 0.11), 'red', 0.012, rot=(0, -30, 0))


def wheel_steel():
    k = Kit()
    tyre(k, lip='steel', floor=0.05)
    # pressed steel centre with vent slots and a chrome hubcap
    k.lathe((0, 0.05, 0), (0, 1, 0), [(0, 0.176), (0.012, 0.172, 'plate'), (0.03, 0.13, 'plate'), (0.022, 0.105, 'plate'),
                                    (0.04, 0.09, 'plate'), (0.04, 0, 'plate')], 'plate', 16)
    for T in spin(k, 8):
        with T:
            k.box((0, 0.068, 0.148), (0.04, 0.012, 0.018), 'under', 0.004, rot=(-24, 0, 0))
    k.lathe((0, 0.088, 0), (0, 1, 0), [(0, 0.098), (0.012, 0.094, 'chrome'), (0.03, 0.06, 'chrome'), (0.036, 0.022, 'chrome'), (0.036, 0, 'chrome')], 'chrome', 14)
    return k.obj('wheel_steel')


def wheel_alloy5():
    k = Kit()
    tyre(k, lip='alu', barrel='alu')
    disc(k)
    for T in spin(k, 5):
        with T:
            k.prism([(-0.036, 0.03), (0.036, 0.03), (0.027, 0.186), (-0.027, 0.186)], 0.07, 0.096, 'y', 'alu')
            k.prism([(-0.017, 0.07), (0.017, 0.07), (0.012, 0.17), (-0.012, 0.17)], 0.09, 0.101, 'y', 'dsteel')
    hub(k, 0.1, 0.058, 5, 0.032, face='alu')
    return k.obj('wheel_alloy5')


def wheel_wire():
    k = Kit()
    tyre(k, lip='chrome', barrel='chrome')
    disc(k, 0.048, 0.14)
    k.lathe((0, 0.078, 0), (0, 1, 0), [(0, 0.176), (0.014, 0.176, 'chrome'), (0.014, 0.158, 'chrome'), (0, 0.158, 'chrome')], 'chrome', 16)
    for T in spin(k, 18):
        with T:
            k.box((0, 0.086, 0.105), (0.013, 0.012, 0.125), 'chrome', rot=(0, 0, 0))
    k.lathe((0, 0.07, 0), (0, 1, 0), [(0, 0.056), (0.028, 0.05, 'chrome'), (0.044, 0.026, 'chrome'), (0.06, 0.012, 'steel'), (0.06, 0, 'steel')], 'chrome', 10)
    for T in spin(k, 3):
        with T:
            k.box((0, 0.118, 0.028), (0.014, 0.012, 0.05), 'chrome', 0.004)
    return k.obj('wheel_wire')


def wheel_rally():
    k = Kit()
    tyre(k, lip='chrome', floor=0.05, letters=True)
    disc(k, 0.03, 0.14)
    # slotted steel centre: outer band + five webs between the slots, the brake shows through
    k.lathe((0, 0.05, 0), (0, 1, 0), [(0, 0.178), (0.016, 0.172, 'dsteel'), (0.034, 0.15, 'dsteel'), (0.022, 0.15, 'dsteel'), (0, 0.178, 'dsteel')], 'dsteel', 16)
    for T in spin(k, 5):
        with T:
            k.prism([(-0.046, 0.085), (0.046, 0.085), (0.034, 0.156), (-0.034, 0.156)], 0.066, 0.086, 'y', 'dsteel')
    k.lathe((0, 0.06, 0), (0, 1, 0), [(0, 0.098), (0.03, 0.09, 'dsteel'), (0.036, 0.06, 'dsteel'), (0.036, 0, 'dsteel')], 'dsteel', 10)
    hub(k, 0.096, 0.046, 5, 0.04, face='chrome', depth=0.02)
    return k.obj('wheel_rally')


def truck_face(k, y, deep, n=6, tyre_kw=None):
    """Heavy steel disc wheel: hand holes, lug ring and a protruding (front) or recessed (rear dual) hub."""
    f = y + (0.02 if deep else 0.066)
    k.lathe((0, f, 0), (0, 1, 0), [(-0.03 if deep else 0.0, 0.176), (0.0, 0.17, 'white'), (0.014 if not deep else -0.004, 0.118, 'white'),
                                  (0.02 if not deep else -0.012, 0.1, 'white'), (0.02 if not deep else -0.012, 0, 'white')], 'white', 12)
    for T in spin(k, 6, math.pi / 6):
        with T:
            k.cyl((0, f - 0.02, 0.145), (0, f + (0.012 if not deep else 0.002), 0.145), 0.019, 'under', 6)
    yh = f + (0.02 if not deep else -0.012)
    k.lathe((0, yh, 0), (0, 1, 0), [(0, 0.074), (0.012, 0.07, 'dsteel'), (0.05, 0.056, 'dsteel'), (0.066, 0.04, 'steel'), (0.066, 0, 'steel')], 'dsteel', 10)
    for T in spin(k, n):
        with T:
            k.cyl((0, yh - 0.002, 0.094), (0, yh + 0.02, 0.094), 0.011, 'steel', 6)


def wheel_truck():
    k = Kit()
    tyre(k, hw=0.1, rim=0.198, floor=0.03, lip='white', barrel='white', blocks=18)
    truck_face(k, 0.0, False)
    return k.obj('wheel_truck')


def wheel_truck_dual():
    k = Kit()
    tyre(k, hw=0.098, rim=0.198, floor=0.0, back=-0.06, lip='white', barrel='white', blocks=18, y0=0.106)
    tyre(k, hw=0.098, rim=0.198, floor=0.09, back=0.0, lip='white', barrel='white', blocks=18, y0=-0.106)
    truck_face(k, 0.106, True)
    return k.obj('wheel_truck_dual')


def wheel_tractor():
    """Big rear farm-tractor wheel with chevron lugs (extra to the requested set)."""
    k = Kit()
    tyre(k, hw=0.1, rim=0.165, floor=0.02, lip='yellow', barrel='yellow', blocks=22, lugtread=True)
    k.lathe((0, 0.02, 0), (0, 1, 0), [(0, 0.14), (0.02, 0.13, 'yellow'), (0.05, 0.075, 'yellow'), (0.05, 0, 'yellow')], 'yellow', 12)
    hub(k, 0.07, 0.05, 8, 0.045, cap='dsteel', nut='steel', face='dsteel', depth=0.0)
    return k.obj('wheel_tractor')


def build():
    return [lib.finish(compact(f())) for f in (wheel_steel, wheel_alloy5, wheel_wire, wheel_rally, wheel_truck, wheel_truck_dual, wheel_tractor)]
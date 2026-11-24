"""Furniture family: shops assets."""
import math
from furniture_kit import *

G = 'shops'


def _bt(b, x, y, z, h, r, m, cap='black', label=None, n=5):
    """Cheap few-sided bottle for dense displays."""
    b.lathe(m, x, y, z, [(r, 0), (r, h * 0.58), (r * 0.36, h * 0.78), (r * 0.36, h * 0.94)], n=n, caps=(False, False))
    b.cyl(cap, x, y, z + h * 0.93, r * 0.42, h * 0.07, n=n, caps=(False, True))
    if label:
        b.lathe(label, x, y, z + h * 0.16, [(r + 0.002, 0), (r + 0.002, h * 0.28)], n=n, caps=(False, False))


def _bottles(b, x0, x1, y, z, hmax, rng, gap=0.018):
    """One row of assorted spirits and wine bottles along a shelf whose front edge is `y`."""
    x = x0
    while x < x1 - 0.05:
        r, h = rng.uniform(0.032, 0.042), hmax * rng.uniform(0.68, 0.97)
        m, lab, cap = rng.choice(GLASSY), rng.choice(GOODS), rng.choice(('black', 'red', 'brass', 'white'))
        for i in range(rng.randint(2, 3)):
            if x + 2 * r > x1:
                break
            _bt(b, x + r, y + 0.03 + r, z, h, r, m, cap, lab)
            x += 2 * r + gap
        x += 0.02


def _gondola(b, kinds, seed, W=1.2, H=1.5, D=0.42, accent='red', peg=False):
    """Double-sided shelf island: base deck plus len(kinds) - 1 shelves a side, stocked by kinds (bottom to top)."""
    rng = R(seed)
    b.box('grey_l', 0, 0, 0.1, W - 0.04, 0.03, H - 0.1, skip='b')
    b.box('offwhite', 0, 0, H, W, 0.07, 0.035, bev=0.008)
    for sx in (-1, 1):
        b.box('steel_d', sx * (W / 2 - 0.015), 0, 0, 0.03, 0.07, H, skip='b')
        b.box('offwhite', sx * (W / 2 - 0.008), 0, 0.14, 0.016, 2 * D - 0.1, 0.5, bev=0.006, edges='x')       # end panels
    b.box('offwhite', 0, 0, 0.05, W, 2 * D, 0.09, bev=0.008, edges='zT')
    b.box(accent, 0, 0, 0.0, W - 0.02, 2 * D - 0.03, 0.05, skip='tb')
    n = len(kinds)
    step = (H - 0.14 - 0.12) / n
    for side in (0, 1):
        k = b.mark()
        for i, kind in enumerate(kinds):
            z = 0.14 + i * step
            dd = D if i == 0 else D - 0.08
            if i:
                b.box('offwhite', 0, -dd / 2 - 0.015, z - 0.025, W - 0.06, dd, 0.025, skip='k')
                for sx in (-1, 1):
                    b.prism('steel_d', [(-0.015, z - 0.025), (-dd * 0.9, z - 0.025), (-0.015, z - 0.12)], sx * (W / 2 - 0.05) - 0.004, sx * (W / 2 - 0.05) + 0.004, plane='yz')
            b.box(accent if i % 2 == 0 else 'white', 0, -dd - 0.017, z - 0.03, W - 0.06, 0.004, 0.032, skip='k')
            for j in range(4):
                b.box('white', -0.42 + j * 0.28 + rng.uniform(-0.03, 0.03), -dd - 0.02, z - 0.026, 0.06, 0.003, 0.024, skip='k')
            if kind == 'peg':
                _peg_tools(b, -W / 2 + 0.08, W / 2 - 0.08, -0.016, z + 0.02, step - 0.08, rng)
            elif kind == 'liquor':
                _bottles(b, -W / 2 + 0.05, W / 2 - 0.04, -dd - 0.012, z, step - 0.07, rng)
            else:
                goods(b, kind, -W / 2 + 0.04, W / 2 - 0.04, -dd - 0.012, z, min(dd, 0.3), step - 0.07, rng, n=6)
        if side:
            b.rot(k, 'z', 180)


def _peg_tools(b, x0, x1, y, z, h, rng):
    """Hand tools hanging on pegboard hooks."""
    x = x0
    i = 0
    while x < x1 - 0.06:
        t = i % 5
        col = rng.choice(('red', 'yellow', 'blue', 'orange', 'green'))
        b.cyl('steel', x, y, z + h - 0.02, 0.005, 0.05, n=4, axis='y', rz=180)
        if t == 0:    # hammer
            b.box('wood_l', x, y - 0.03, z + h - 0.3, 0.022, 0.022, 0.26, bev=0.005)
            b.box('iron', x, y - 0.03, z + h - 0.05, 0.1, 0.03, 0.035, bev=0.006)
        elif t == 1:  # screwdrivers
            for dx in (-0.025, 0.025):
                b.cyl(col, x + dx, y - 0.03, z + h - 0.12, 0.014, 0.09, n=6)
                b.cyl('steel', x + dx, y - 0.03, z + h - 0.25, 0.004, 0.13, n=4)
        elif t == 2:  # saw
            b.prism('steel', [(-0.05, 0), (0.05, 0.02), (0.05, -0.3), (0.0, -0.3)], -0.003, 0.003, plane='xz', x=x, y=y - 0.03, z=z + h - 0.08)
            b.box(col, x, y - 0.03, z + h - 0.1, 0.11, 0.022, 0.09, bev=0.01)
        elif t == 3:  # wrench
            b.box('steel', x, y - 0.03, z + h - 0.28, 0.022, 0.008, 0.24)
            b.cyl('steel', x, y - 0.026, z + h - 0.05, 0.026, 0.008, n=6, axis='y', rz=180)
            b.cyl('steel', x, y - 0.026, z + h - 0.285, 0.02, 0.008, n=6, axis='y', rz=180)
        else:         # blister pack
            b.box('white', x, y - 0.026, z + h - 0.2, 0.1, 0.006, 0.17)
            b.box(col, x, y - 0.034, z + h - 0.18, 0.06, 0.012, 0.09, bev=0.004)
        x += 0.15 + (0.03 if t == 2 else 0)
        i += 1


@asset('gondola_grocery', G, length=1.2)
def gondola_grocery(b):
    _gondola(b, ('bag', 'box', 'can', 'box'), 11, accent='red')


@asset('gondola_hardware', G, length=1.2)
def gondola_hardware(b):
    _gondola(b, ('tool', 'box', 'peg'), 12, accent='orange')


@asset('gondola_liquor', G, length=1.2)
def gondola_liquor(b):
    _gondola(b, ('box', 'liquor', 'liquor'), 13, accent='green_d')


@asset('wall_shelf_stocked', G, length=1.2)
def wall_shelf_stocked(b):
    """Single-sided 1.2 m shop shelving that stands against a wall (back at y = +0.2)."""
    W, D, H = 1.2, 0.4, 1.9
    rng = R(14)
    zs, clear = shelf_unit(b, 'wood', 0, 0, 0, W, D, H, 5, t=0.025, back='wood_d')
    b.box('wood', 0, -0.01, H, W + 0.04, D + 0.04, 0.04, bev=0.012)
    for i, z in enumerate(zs):
        b.box('cream', 0, -D / 2 - 0.006, z - 0.027, W - 0.05, 0.004, 0.028, skip='k')
        goods(b, ('bag', 'mix', 'jar', 'box', 'can')[i], -W / 2 + 0.04, W / 2 - 0.04, -D / 2 + 0.01, z, 0.3, clear - 0.03, rng)


@asset('fridge_display_2door', G)
def fridge_display_2door(b):
    W, D, H = 1.3, 0.7, 2.0
    rng = R(15)
    b.box('char', 0, 0.02, 0, W - 0.04, D - 0.06, 0.08, skip='tb')
    k = b.mark()
    b.box('offwhite', 0, 0.05, 0.08, W, D - 0.1, H - 0.08, bev=0.012, edges='zT', skip='f')
    b.box('offwhite', 0, -D / 2 + 0.05, 0.08, W, 0.1, 0.16, skip='k')                    # grille band
    for i in range(5):
        b.box('grey_d', 0, -D / 2 - 0.002, 0.11 + i * 0.022, W - 0.2, 0.004, 0.01, skip='k')
    b.box('panel', 0, -D / 2 + 0.04, H - 0.26, W - 0.04, 0.09, 0.22, bev=0.01, skip='k')  # lit header
    for i, m in enumerate(('red', 'blue')):
        b.box(m, 0, -D / 2 - 0.007, H - 0.2 + i * 0.07, W - 0.3, 0.004, 0.04, skip='k')
    # interior
    b.box('white', 0, 0.04, 0.24, W - 0.08, D - 0.2, 0.01, skip='b')
    b.box('white', 0, D / 2 - 0.07, 0.24, W - 0.08, 0.01, H - 0.52, skip='k')
    for i in range(4):
        z = 0.25 + i * 0.37
        if i:
            b.box('steel', 0, 0.02, z - 0.012, W - 0.08, D - 0.24, 0.012)
        x = -W / 2 + 0.1
        while x < W / 2 - 0.1:
            col = rng.choice(GOODS)
            if i in (1, 3):
                for j in range(3):
                    can(b, x + j * 0.075, -0.13, z, 0.033, 0.12, col, band=rng.choice(GOODS), n=6)
                x += 0.26
            else:
                m = rng.choice(('clear_g', 'clear_a', col, '#3a2416'))
                for j in range(3):
                    _bt(b, x + j * 0.08, -0.13, z, 0.26, 0.034, m, cap=rng.choice(('red', 'white', 'brass')), label=col)
                x += 0.28
    for sx in (-1, 1):
        x = sx * (W / 4 - 0.005)
        frame(b, 'steel_d', x, -D / 2 + 0.05, 0.24 + (H - 0.52) / 2 + 0.02, W / 2 - 0.09, H - 0.56, t=0.035, depth=0.04, bev=0.006)
        b.box('clear', x, -D / 2 + 0.03, 0.26, W / 2 - 0.09, 0.008, H - 0.56)
        b.box('chrome', x - sx * (W / 4 - 0.075), -D / 2 - 0.02, 0.85, 0.025, 0.03, 0.5, bev=0.008)


@asset('freezer_chest', G)
def freezer_chest(b):
    W, D, H = 1.5, 0.72, 0.86
    rng = R(16)
    b.box('char', 0, 0, 0, W - 0.06, D - 0.06, 0.06, skip='tb')
    b.box('enamel', 0, 0, 0.06, W, D, H - 0.12, bev=0.03, edges='z')
    b.box('enamel_b', 0, 0, 0.5, W + 0.004, D + 0.004, 0.09)
    b.box('enamel_r', 0, 0, 0.47, W + 0.004, D + 0.004, 0.03)
    for i in range(6):
        b.box('grey_d', W / 2 - 0.25, -D / 2 - 0.002, 0.14 + i * 0.022, 0.3, 0.004, 0.01, skip='k')
    basin(b, 'white', 0, 0, H - 0.36, W - 0.12, D - 0.14, 0.3, bev=0.03, taper=1.04, rim=0.06, rim_w=0.06, rim_m='grey_l')
    for i in range(7):
        for j in range(2):
            col = rng.choice(GOODS)
            x, y = -0.57 + i * 0.19, -0.13 + j * 0.26
            b.box(col, x, y, H - 0.36, 0.17, 0.24, rng.uniform(0.1, 0.2), bev=0.008, skip='b', rz=rng.uniform(-6, 6))
    for sx, z in ((-1, 0.0), (1, 0.012)):
        b.box('clear', sx * (W / 4 - 0.02), 0, H - 0.06 + z, W / 2 - 0.02, D - 0.1, 0.008)
        b.box('steel', sx * (W / 4 - 0.02), -D / 2 + 0.06, H - 0.06 + z, W / 2 - 0.02, 0.02, 0.016)
        b.box('steel', sx * (W / 4 - 0.02), D / 2 - 0.06, H - 0.06 + z, W / 2 - 0.02, 0.02, 0.016)
        b.box('char', sx * 0.2, 0, H - 0.05 + z, 0.03, 0.2, 0.014, bev=0.004)
    b.decal('sale', -0.4, -D / 2 - 0.003, 0.3, 0.3, 0.12)


def _register(b, x, y, z, rz=0):
    k = b.mark()
    b.box('beige', 0, 0, 0, 0.42, 0.42, 0.1, bev=0.01)                                    # cash drawer
    b.box('char', 0, -0.213, 0.025, 0.36, 0.006, 0.05, skip='k')
    b.box('chrome', 0, -0.22, 0.04, 0.08, 0.01, 0.016)
    b.box('char', 0, 0.03, 0.1, 0.4, 0.34, 0.1, bev=0.012, taper=(1, 0.75), shear=(0, 0.04))
    b.box('char', 0, -0.07, 0.1, 0.4, 0.2, 0.05, bev=0.008, rx=14)
    b.decal('keypad', -0.07, -0.075, 0.158, 0.2, 0.15, face='t', rx=14)
    for i, m in enumerate(('red', 'green', 'yellow', 'blue')):
        b.box(m, 0.11, -0.13 + i * 0.04, 0.152 + i * 0.01, 0.07, 0.03, 0.012, rx=14)
    b.box('char', 0, 0.12, 0.2, 0.3, 0.1, 0.09, bev=0.01)
    b.decal('lcd', 0, 0.068, 0.25, 0.24, 0.06, rx=-8)
    b.box('white', -0.14, 0.14, 0.29, 0.07, 0.03, 0.03)                                   # receipt
    b.box('white', -0.14, 0.13, 0.31, 0.06, 0.003, 0.06, rx=-20)
    b.rot(k, 'z', rz); b.move(k, x, y, z)


@asset('cash_register', G, mount='top')
def cash_register(b):
    _register(b, 0, 0, 0)


@asset('checkout_counter', G, surface=0.92, stand=[0, 0.75, 0])
def checkout_counter(b):
    """80s shop counter; the clerk stands behind it (+Y) at `stand`."""
    W, D, H = 1.8, 0.7, 0.92
    rng = R(17)
    b.box('char', 0, 0.02, 0, W - 0.04, D - 0.08, 0.1, skip='tb')
    b.box('wood', 0, 0, 0.1, W, D, H - 0.14, bev=0.008, edges='z')
    for i in range(3):
        b.box('wood_d', (i - 1) * 0.58, -D / 2 - 0.004, 0.18, 0.5, 0.008, 0.56, bev=0.006, edges='F', skip='k')
    b.box('cream', 0, -0.02, H - 0.04, W + 0.04, D + 0.06, 0.04, bev=0.012)
    b.box('red', 0, -0.02, H - 0.052, W + 0.044, D + 0.064, 0.014)
    for i in range(2):                                                                  # staff side shelves
        b.box('wood_d', -0.4 + i * 0.8, D / 2 + 0.002, 0.2, 0.7, 0.006, 0.6, skip='f')
    _register(b, 0.5, 0.05, H, rz=180)
    b.box('green_d', -0.25, -0.02, H, 0.5, 0.4, 0.006, bev=0.002, skip='b')   # counter mat
    # impulse rack on the customer side
    for i in range(3):
        z = H + 0.01 + i * 0.1
        y = -0.28 + i * 0.05
        b.box('steel_d', -0.62, y, z, 0.42, 0.09, 0.012)
        b.box('steel_d', -0.62, y - 0.045, z, 0.42, 0.008, 0.035)
        for j in range(6):
            b.box(rng.choice(GOODS), -0.79 + j * 0.068, y, z + 0.012, 0.06, 0.07, rng.uniform(0.04, 0.075), skip='b')
    for sx in (-1, 1):
        b.box('steel_d', -0.62 + sx * 0.215, -0.2, H, 0.012, 0.22, 0.26, taper=(1, 0.5), shear=(0, 0.05))
    b.cyl('clear', -0.02, -0.2, H, 0.07, 0.16, n=8)                                       # sweets jar
    b.cyl('red', -0.02, -0.2, H + 0.16, 0.06, 0.03, n=8)
    for i in range(5):
        b.ball(rng.choice(GOODS), -0.02 + rng.uniform(-0.03, 0.03), -0.2 + rng.uniform(-0.03, 0.03), H + 0.03 + i * 0.022, 0.022, n=5, rings=3)
    b.box('tan', 0.05, 0.2, H, 0.2, 0.12, 0.28, bev=0.008, taper=(1.1, 1.3), skip='t')    # paper bags
    b.decal('sale', -0.2, -D / 2 - 0.03, H - 0.25, 0.4, 0.16)


def _crate(b, x, y, z, w, d, h, rx=0, m='wood_l'):
    k = b.mark()
    b.box('wood_d', 0, 0, 0, w, d, 0.015)
    for sy in (-1, 1):
        for i in range(2):
            b.box(m, 0, sy * (d / 2 - 0.006), 0.02 + i * h * 0.5, w, 0.012, h * 0.4)
    for sx in (-1, 1):
        for i in range(2):
            b.box(m, sx * (w / 2 - 0.006), 0, 0.02 + i * h * 0.5, 0.012, d - 0.024, h * 0.4)
    b.rot(k, 'x', rx); b.move(k, x, y, z)


@asset('produce_stand', G)
def produce_stand(b):
    W = 1.5
    rng = R(18)
    for sx in (-1, 1):
        b.prism('wood', [(-0.45, 0), (0.42, 0), (0.42, 1.0), (0.3, 1.0), (-0.45, 0.42)], sx * (W / 2 - 0.04) - 0.02, sx * (W / 2 - 0.04) + 0.02, plane='yz', bev=0.006)
    b.box('wood', 0, 0.36, 0.15, W - 0.1, 0.03, 0.1)
    b.box('wood', 0, -0.4, 0.1, W - 0.1, 0.03, 0.1)
    b.box('wood_d', 0, 0.0, 0.5, W - 0.1, 0.92, 0.02, rx=28)
    fruit = (('red', 0.045, 1), ('orange', 0.045, 1), ('yellow', 0.035, 1.6), ('green_l', 0.045, 1), ('#6e2a5a', 0.03, 1), ('#7fb069', 0.07, 0.8))
    for row in range(2):
        for i in range(3):
            x = (i - 1) * 0.46
            y, z = -0.22 + row * 0.42, 0.42 + row * 0.225
            _crate(b, x, y, z, 0.42, 0.36, 0.14, rx=28)
            col, r, sz = fruit[row * 3 + i]
            k = b.mark()
            nx = int(0.36 / (2 * r))
            for u in range(nx):
                for v in range(int(0.3 / (2 * r))):
                    b.ball(col, -0.18 + (u + 0.5) * 0.36 / nx + rng.uniform(-0.008, 0.008), -0.15 + (v + 0.5) * 2 * r, 0.1 + rng.uniform(0, 0.02), r, n=5, rings=3, sz=sz)
            b.rot(k, 'x', 28); b.move(k, x, y, z)
            b.box('white', x, y - 0.2, z + 0.03, 0.12, 0.004, 0.08, rx=28)
            b.box('red', x, y - 0.203, z + 0.05, 0.08, 0.003, 0.03, rx=28)
    b.box('green_d', 0, 0.38, 1.0, W, 0.14, 0.035, bev=0.008)
    b.prism('green', [(-0.75, 1.03), (0.75, 1.03), (0.75, 1.1), (-0.75, 1.1)], 0.3, 0.46, plane='xz')
    for i in range(8):
        b.box('white' , -0.66 + i * 0.19, 0.38, 1.031, 0.09, 0.164, 0.07)


@asset('magazine_rack', G)
def magazine_rack(b):
    W, H = 0.9, 1.5
    for sx in (-1, 1):
        b.prism('wood', [(-0.2, 0), (0.2, 0), (0.2, H), (0.1, H), (-0.2, 0.3)], sx * (W / 2) - 0.012, sx * (W / 2) + 0.012, plane='yz', bev=0.005)
    b.box('wood_d', 0, 0.19, 0.05, W, 0.012, H - 0.05)
    b.box('wood', 0, 0, 0.02, W, 0.4, 0.05)
    b.box('wood', 0, 0.15, H, W + 0.05, 0.14, 0.03, bev=0.008)
    n = 0
    for i in range(5):
        z = 0.14 + i * 0.26
        y = -0.15 + i * 0.065
        b.box('wood', 0, y, z, W - 0.02, 0.07, 0.02)
        b.box('wood', 0, y - 0.035, z, W - 0.02, 0.012, 0.07)
        for j in range(4):
            if (i, j) in ((1, 2), (3, 0)):
                continue
            x = -0.315 + j * 0.21
            b.box('white', x, y + 0.01, z + 0.02, 0.19, 0.02, 0.26, rx=-13, skip='b')
            b.decal(f'mag{n % 8 + 1}', x, y - 0.0015, z + 0.152, 0.185, 0.255, rx=-13)
            n += 1


def _garment(b, col, w=0.42, h=0.62, t=0.035, long=False, trim=None):
    """Garment on a hanger: shoulders at z = 0 (hook above), thin along Y."""
    b.tube('chrome', [(0, 0, 0.02), (0, 0, 0.06), (0.02, 0, 0.075)], 0.004, n=3)
    b.prism(col, [(-w / 2, -0.06), (-0.04, 0.02), (0.04, 0.02), (w / 2, -0.06), (w / 2 * 0.86, -h), (-w / 2 * 0.86, -h)], -t / 2, t / 2, plane='xz')
    if trim:
        b.box(trim, 0, 0, -h * 0.55, w * 0.7, t + 0.004, 0.05)
    if long:
        b.box(col, 0, 0, -h - 0.3, w * 0.8, t * 0.8, 0.31, taper=(1.05, 1))


@asset('clothes_rack_round', G)
def clothes_rack_round(b):
    rng = R(19)
    k = b.mark()
    b.box('chrome', 0.2, 0, 0.03, 0.4, 0.04, 0.025, bev=0.006)
    b.cyl('black', 0.38, 0, 0, 0.022, 0.03, n=6)
    b.radial(k, 4)
    b.cyl('chrome', 0, 0, 0.05, 0.022, 1.4, n=8)
    b.tube('chrome', [(0.5 * math.cos(a), 0.5 * math.sin(a), 1.4) for a in [i * math.tau / 14 for i in range(14)]], 0.012, n=5, closed=True)
    k = b.mark()
    b.rod('chrome', (0, 0, 1.4), (0.5, 0, 1.4), 0.008, n=4)
    b.radial(k, 4)
    b.cyl('chrome', 0, 0, 1.45, 0.006, 0.12, n=4)
    b.cyl('red', -0.004, 0, 1.6, 0.11, 0.008, n=12, axis='x')
    b.cyl('white', -0.006, 0, 1.6, 0.08, 0.012, n=10, axis='x')
    cols = ('red', 'blue', 'mustard', 'green', 'navy', 'pink', 'teal', 'cream', 'purple', 'brown')
    for i in range(18):
        a = i * 360 / 18 + rng.uniform(-3, 3)
        k = b.mark()
        _garment(b, cols[i % len(cols)], h=rng.uniform(0.55, 0.72), trim=rng.choice((None, 'white', 'yellow')))
        b.rot(k, 'z', 90); b.move(k, 0.5, 0, 1.325); b.rot(k, 'z', a)


@asset('clothes_rack_wall', G, mount='wall')
def clothes_rack_wall(b):
    W, z = 1.6, 1.7
    rng = R(20)
    b.box('wood', 0, -0.17, z, W, 0.34, 0.03, bev=0.008)
    for sx in (-1, 1):
        b.prism('steel_d', [(0, z), (-0.3, z), (0, z - 0.26)], sx * (W / 2 - 0.12) - 0.01, sx * (W / 2 - 0.12) + 0.01, plane='yz')
        b.box('steel_d', sx * (W / 2 - 0.12), -0.2, z - 0.1, 0.012, 0.03, 0.1)
    b.cyl('chrome', -W / 2 + 0.04, -0.2, z - 0.1, 0.012, W - 0.08, n=6, axis='x')
    cols = ('navy', 'red', 'cream', 'green', 'mustard', 'blue', 'pink', 'brown', 'teal')
    for i in range(13):
        k = b.mark()
        _garment(b, cols[i % len(cols)], h=rng.uniform(0.55, 0.7), long=i % 4 == 3, trim=rng.choice((None, 'white')))
        b.rot(k, 'z', 90 + rng.uniform(-8, 8)); b.move(k, -0.62 + i * 0.105, -0.2, z - 0.175)
    for i in range(4):                                                                  # folded stacks on the shelf
        x = -0.6 + i * 0.4
        for j in range(rng.randint(2, 4)):
            b.soft(rng.choice(cols), x, -0.17, z + 0.03 + j * 0.045, 0.3, 0.26, 0.045, r=0.015)


def _shoe(b, x, y, z, col, rz=0, boot=False):
    k = b.mark()
    b.box('white', 0, 0, 0, 0.09, 0.26, 0.02, skip='b')
    b.box(col, 0, -0.01, 0.02, 0.085, 0.24, 0.055, bev=0.02, edges='T', skip='b')
    b.box(col, 0, 0.06, 0.06, 0.08, 0.11, 0.1 if boot else 0.045, bev=0.015, edges='T', skip='b')
    b.box('white', 0, -0.03, 0.076, 0.03, 0.08, 0.004, rx=-8, skip='b')
    b.rot(k, 'z', rz); b.move(k, x, y, z)


@asset('shoe_display', G)
def shoe_display(b):
    W = 1.2
    rng = R(21)
    for sx in (-1, 1):
        b.prism('wood', [(-0.25, 0), (0.25, 0), (0.25, 1.3), (0.12, 1.3), (-0.25, 0.35)], sx * (W / 2) - 0.012, sx * (W / 2) + 0.012, plane='yz', bev=0.005)
    b.box('wood_d', 0, 0.24, 0.02, W, 0.012, 1.28)
    cols = ('brown', 'black', 'red', 'white', 'navy', 'tan', 'blue', 'wood_dd')
    for i in range(4):
        z = 0.32 + i * 0.26
        y = -0.1 + i * 0.07
        b.box('wood', 0, y, z, W - 0.02, 0.3, 0.02, rx=-14)
        b.box('wood', 0, y - 0.15, z + 0.03, W - 0.02, 0.012, 0.03)
        for j in range(3):
            c = cols[(i * 3 + j) % len(cols)]
            for dx in (-0.05, 0.05):
                k = b.mark()
                _shoe(b, 0, 0, 0, c, rz=-8 if dx < 0 else 8, boot=(i + j) % 5 == 0)
                b.rot(k, 'x', -14); b.move(k, -0.38 + j * 0.38 + dx, y, z + 0.022)
    for j in range(5):                                                                  # boxed stock underneath
        for s in range(rng.randint(1, 2)):
            b.box(rng.choice(('cream', 'red_d', 'navy', 'tan')), -0.46 + j * 0.23, 0.02, 0.02 + s * 0.115, 0.2, 0.34, 0.11, bev=0.004)
            b.box('white', -0.46 + j * 0.23, -0.152, 0.05 + s * 0.115, 0.08, 0.003, 0.05)
    b.box('wood', 0, 0, 0, W, 0.5, 0.02)


def _pistol(b, x, y, z, rz=0, m='iron', grip='wood_dd', long=False):
    k = b.mark()
    L = 0.3 if long else 0.2
    b.box(m, 0, 0, 0, L, 0.035, 0.028, bev=0.005)
    b.box(grip, -L / 2 + 0.035, -0.055, 0, 0.05, 0.1, 0.026, bev=0.006, rz=-12)
    b.box(m, -L / 2 + 0.085, -0.03, 0.004, 0.05, 0.04, 0.012)
    b.rot(k, 'z', rz); b.move(k, x, y, z)


def _case(b, W, D=0.6, H=0.95, wood='wood', felt='#7c221f'):
    """Glass-topped display counter. Returns the height of the felt deck."""
    zb = 0.5
    b.box('char', 0, 0.02, 0, W - 0.04, D - 0.08, 0.08, skip='tb')
    b.box(wood, 0, 0, 0.08, W, D, zb - 0.08, bev=0.008, edges='z')
    n = max(2, round(W / 0.6))
    for i in range(n):
        b.box('wood_d', -W / 2 + (i + 0.5) * W / n, -D / 2 - 0.004, 0.13, W / n - 0.06, 0.008, zb - 0.18, bev=0.006, edges='F', skip='k')
    b.box(felt, 0, 0, zb, W - 0.04, D - 0.04, 0.012, skip='b')
    b.box('clear', 0, -D / 2 + 0.012, zb, W - 0.03, 0.008, H - zb)
    b.box('clear', 0, 0, H - 0.01, W - 0.03, D - 0.03, 0.008)
    for sx in (-1, 1):
        b.box('clear', sx * (W / 2 - 0.012), 0, zb, 0.008, D - 0.04, H - zb - 0.01)
        for sy in (-1, 1):
            b.box('brass', sx * (W / 2 - 0.012), sy * (D / 2 - 0.012), zb, 0.024, 0.024, H - zb, skip='b')
    for sy in (-1, 1):
        b.box('brass', 0, sy * (D / 2 - 0.012), H - 0.012, W - 0.048, 0.024, 0.024, skip='lr')
    b.box(wood, 0, D / 2 - 0.012, zb, W - 0.048, 0.02, H - zb - 0.012, skip='lr')
    b.box('clear', 0, 0.02, zb + 0.22, W - 0.05, D - 0.14, 0.008)                         # inner glass shelf
    return zb + 0.012


@asset('gun_display_case', G, surface=0.95, length=1.5)
def gun_display_case(b):
    z = _case(b, 1.5, felt='#254d33')
    for i in range(5):
        _pistol(b, -0.56 + i * 0.28, -0.1, z, rz=(8, -6, 12, 0, -10)[i], m=('iron', 'chrome', 'iron', 'steel', 'iron')[i], grip=('wood_dd', 'black', 'wood_r', 'cream', 'black')[i], long=i % 2 == 0)
        b.box('white', -0.56 + i * 0.28, -0.22, z, 0.07, 0.04, 0.003, skip='b')
    for i in range(4):
        _pistol(b, -0.45 + i * 0.3, 0.03, z + 0.226, rz=(-8, 5, -4, 10)[i], m=('steel', 'iron', 'iron', 'chrome')[i], grip=('wood_r', 'wood_dd', 'black', 'wood_dd')[i])
    for i in range(6):
        b.box(('red', 'yellow', 'green_d', 'red', 'blue', 'yellow')[i], -0.6 + i * 0.1 + (0.5 if i > 2 else 0), 0.17, z, 0.085, 0.12, 0.05, bev=0.004)   # ammunition boxes


@asset('glass_display_case', G, surface=0.95, length=1.2)
def glass_display_case(b):
    z = _case(b, 1.2, felt='navy')
    rng = R(23)
    for i in range(4):                                                                  # watches on stands, rings in trays
        x = -0.44 + i * 0.29
        b.box('offwhite', x, -0.08, z, 0.1, 0.07, 0.06, bev=0.02, edges='xT', rx=-20)
        b.box(('gold', 'chrome', 'gold', 'black')[i], x, -0.105, z + 0.03, 0.03, 0.012, 0.085, rx=-20)
        b.cyl(('white', 'navy', 'black', 'gold')[i], x, -0.118, z + 0.075, 0.022, 0.008, n=8, axis='y', rz=180)
    for i in range(3):
        x = -0.35 + i * 0.35
        b.box('black', x, 0.02, z + 0.226, 0.22, 0.16, 0.014, bev=0.004)
        for j in range(8):
            b.cyl('gold' if (i + j) % 3 else 'chrome', x - 0.075 + (j % 4) * 0.05, -0.02 + (j // 4) * 0.07, z + 0.24, 0.012, 0.008, n=6)
            b.box(rng.choice(('red', 'blue_l', 'green_l', 'white', 'purple')), x - 0.075 + (j % 4) * 0.05, -0.02 + (j // 4) * 0.07, z + 0.248, 0.01, 0.01, 0.008)
    b.lathe('gold', -0.45, 0.16, z, [(0.035, 0), (0.035, 0.008), (0.01, 0.02), (0.008, 0.07), (0.03, 0.08), (0.04, 0.13), (0.035, 0.13)], n=8)    # trophy cup
    b.box('wood_dd', 0.0, 0.16, z, 0.16, 0.1, 0.05, bev=0.008)
    b.box('brass', 0.4, 0.15, z, 0.1, 0.07, 0.11, bev=0.01)                                # mantel clock
    disc_decal(b, 'clock', 0.4, 0.114, z + 0.065, 0.035, n=8)


def _guitar(b, x, y, z, col, rz=0):
    k = b.mark()
    pts = [(0.17 * s * (1 + 0.12 * math.cos(2 * a)) * math.sin(a) * 0.95, 0.2 - 0.21 * math.cos(a) * (1 + 0.05 * math.cos(a))) for s, a in [(1, i * math.tau / 12) for i in range(12)]]
    b.prism(col, pts, -0.045, 0.045, plane='xz', bev=0.008, edges='caps')
    b.cyl('black', 0, -0.047, 0.24, 0.045, 0.003, n=8, axis='y')
    b.box('wood_dd', 0, -0.02, 0.38, 0.05, 0.03, 0.5)
    b.box('wood_dd', 0, -0.02, 0.88, 0.07, 0.03, 0.14, taper=(1.15, 1), bev=0.006)
    b.box('black', 0, -0.05, 0.1, 0.09, 0.012, 0.025)
    for i in (-1, 1):
        b.box('silver', i * 0.012, -0.046, 0.12, 0.003, 0.003, 0.84)
    b.rot(k, 'x', -8); b.rot(k, 'z', rz); b.move(k, x, y, z)


def _radio(b, x, y, z, col='silver', w=0.36):
    b.box(col, x, y, z, w, 0.11, 0.2, bev=0.01)
    for sx in (-1, 1):
        b.cyl('char', x + sx * w * 0.3, y - 0.056, z + 0.08, w * 0.16, 0.006, n=8, axis='y', rz=180)
    b.decal('dial', x, y - 0.057, z + 0.165, w * 0.6, 0.04)
    b.box('char', x, y - 0.056, z + 0.05, w * 0.22, 0.006, 0.09, skip='k')
    b.tube('chrome', [(x - w / 2 + 0.03, y, z + 0.2), (x - w / 2 + 0.03, y, z + 0.25), (x + w / 2 - 0.03, y, z + 0.25), (x + w / 2 - 0.03, y, z + 0.2)], 0.007, n=4)


@asset('pawn_shelf', G, length=1.5)
def pawn_shelf(b):
    W, D, H = 1.5, 0.45, 2.0
    zs, clear = shelf_unit(b, 'wood_d', 0, 0, 0, W, D, H, 4, t=0.03, back='wood_dd')
    b.box('wood_d', 0, -0.01, H, W + 0.05, D + 0.04, 0.05, bev=0.014)
    y = -0.02
    # bottom: amplifier, toolbox, vacuum-style drum
    b.box('char', -0.42, y, zs[0], 0.5, 0.26, 0.38, bev=0.012)
    b.box('tan', -0.42, y - 0.132, zs[0] + 0.04, 0.44, 0.006, 0.24, skip='k')
    b.box('silver', -0.42, y - 0.132, zs[0] + 0.3, 0.44, 0.006, 0.05, skip='k')
    for i in range(5):
        b.cyl('black', -0.58 + i * 0.08, y - 0.135, zs[0] + 0.325, 0.014, 0.014, n=6, axis='y', rz=180)
    b.box('red', 0.22, y, zs[0], 0.46, 0.22, 0.2, bev=0.012)
    b.box('red_d', 0.22, y, zs[0] + 0.2, 0.47, 0.23, 0.05, bev=0.012)
    b.box('chrome', 0.22, y, zs[0] + 0.25, 0.2, 0.03, 0.03, bev=0.008)
    for sx in (-1, 1):
        b.box('chrome', 0.22 + sx * 0.14, y - 0.116, zs[0] + 0.17, 0.04, 0.008, 0.05)
    b.cyl('#c9b892', 0.6, y, zs[0], 0.1, 0.3, n=10)
    b.cyl('char', 0.6, y, zs[0] + 0.3, 0.105, 0.04, n=10)
    # second: televisions
    crt(b, -0.4, y, zs[1], 0.5, 0.36, 0.38, body='wood_r', region='scr_show')
    crt(b, 0.14, y, zs[1], 0.36, 0.3, 0.3, body='char', region='scr_tv')
    crt(b, 0.52, y, zs[1], 0.3, 0.28, 0.26, body='enamel_r', side=False)
    b.box('white', -0.4, y - 0.19, zs[1] + 0.3, 0.1, 0.004, 0.06, rx=10)
    # third: radios, camera, toaster-like bits
    _radio(b, -0.45, y, zs[2], 'silver', 0.4)
    _radio(b, 0.0, y, zs[2], 'char', 0.32)
    b.box('black', 0.34, y, zs[2], 0.14, 0.07, 0.09, bev=0.008)
    b.cyl('char', 0.34, y - 0.035, zs[2] + 0.045, 0.035, 0.05, n=8, axis='y', rz=180)
    b.cyl('clear', 0.34, y - 0.086, zs[2] + 0.045, 0.026, 0.004, n=8, axis='y', rz=180)
    b.box('wood_r', 0.56, y, zs[2], 0.2, 0.16, 0.22, bev=0.012)                           # mantel clock
    disc_decal(b, 'clock', 0.56, y - 0.083, zs[2] + 0.13, 0.07, n=10)
    # top: guitars and a trumpet case
    _guitar(b, -0.48, y + 0.1, zs[3], 'wood_l', rz=0)
    _guitar(b, -0.12, y + 0.1, zs[3], 'red', rz=0)
    b.box('black', 0.4, y, zs[3], 0.56, 0.24, 0.16, bev=0.03)
    for sx in (-1, 1):
        b.box('brass', 0.4 + sx * 0.18, y - 0.122, zs[3] + 0.09, 0.04, 0.008, 0.04)
    b.box('black', 0.4, y - 0.13, zs[3] + 0.06, 0.12, 0.02, 0.025, bev=0.006)
    for i, (x, zz) in enumerate(((-0.6, zs[1]), (0.34, zs[2] + 0.09), (0.4, zs[3] + 0.16))):
        b.box('yellow', x, y - 0.2, zz + 0.001, 0.07, 0.05, 0.003, rz=10)                  # price tags


@asset('shopping_basket_stack', G)
def shopping_basket_stack(b):
    b.box('steel_d', 0, 0, 0, 0.5, 0.36, 0.03, bev=0.006)
    for sx in (-1, 1):
        b.tube('steel_d', [(sx * 0.22, 0.17, 0.03), (sx * 0.22, 0.17, 0.75), (sx * 0.22, 0.1, 0.75)], 0.012, n=5)
    b.rod('steel_d', (-0.22, 0.17, 0.75), (0.22, 0.17, 0.75), 0.012, n=5)
    n = 5
    for i in range(n):
        z = 0.03 + i * 0.07
        col = 'red' if i % 2 == 0 else 'red_d'
        top = i == n - 1
        if top:
            b.box(col, 0, 0, z, 0.36, 0.24, 0.22, taper=(1.2, 1.25), skip='t')
            basin(b, col, 0, 0, z + 0.01, 0.42, 0.29, 0.21, bev=0.0, taper=1.2)
        for sy in (-1, 1):
            b.box(col, 0, sy * 0.15, z + 0.2, 0.45, 0.02, 0.025)
        for sx in (-1, 1):
            b.box(col, sx * 0.22, 0, z + 0.2, 0.02, 0.3, 0.025)
            if not top:
                b.box(col, sx * 0.2, 0, z + 0.13, 0.012, 0.27, 0.07, taper=(1, 1.05))
                for sy in (-1, 1):
                    b.box(col, 0, sy * 0.135, z + 0.13, 0.39, 0.012, 0.07)
    z = 0.03 + (n - 1) * 0.07 + 0.22
    for sy in (-1, 1):
        b.tube('black', [(-0.2, sy * 0.15, z), (-0.19, sy * 0.19, z - 0.04), (0.19, sy * 0.19, z - 0.04), (0.2, sy * 0.15, z)], 0.008, n=4)


def _donut(b, x, y, z, col, r=0.045):
    b.lathe('#c98a4b', x, y, z, [(r * 0.35, r * 0.3), (r * 0.65, 0), (r, r * 0.3), (r * 0.65, r * 0.62)], n=7, caps=(False, False))
    b.lathe(col, x, y, z, [(r * 0.98, r * 0.34), (r * 0.65, r * 0.66), (r * 0.33, r * 0.34)], n=7, caps=(False, False))


@asset('donut_display_case', G, surface=1.25, length=1.2)
def donut_display_case(b):
    W, D, H = 1.2, 0.7, 1.25
    rng = R(24)
    b.box('char', 0, 0.02, 0, W - 0.04, D - 0.08, 0.08, skip='tb')
    b.box('cream', 0, 0, 0.08, W, D, 0.62, bev=0.01, edges='z')
    b.box('pink', 0, -D / 2 - 0.003, 0.3, W - 0.02, 0.006, 0.2, skip='k')
    b.box('white', 0, -D / 2 - 0.005, 0.38, W - 0.02, 0.006, 0.04, skip='k')
    b.box('steel', 0, 0, 0.7, W + 0.02, D + 0.02, 0.03, bev=0.008)
    for sx in (-1, 1):                                                                  # glazed hood with a slanted front
        b.prism('clear', [(-D / 2 + 0.03, 0.73), (D / 2 - 0.02, 0.73), (D / 2 - 0.02, H), (-D / 2 + 0.2, H), (-D / 2 + 0.03, 1.05)], sx * (W / 2 - 0.012) - 0.004, sx * (W / 2 - 0.012) + 0.004, plane='yz')
    b.add([(-W / 2 + 0.01, -D / 2 + 0.03, 0.73), (W / 2 - 0.01, -D / 2 + 0.03, 0.73), (W / 2 - 0.01, -D / 2 + 0.03, 1.05), (-W / 2 + 0.01, -D / 2 + 0.03, 1.05)], [(0, 1, 2, 3)], 'clear')
    b.add([(-W / 2 + 0.01, -D / 2 + 0.03, 1.05), (W / 2 - 0.01, -D / 2 + 0.03, 1.05), (W / 2 - 0.01, -D / 2 + 0.2, H), (-W / 2 + 0.01, -D / 2 + 0.2, H)], [(0, 1, 2, 3)], 'clear')
    b.box('steel', 0, 0.09, H, W, D - 0.22, 0.025, bev=0.006)
    b.rod('chrome', (-W / 2 + 0.01, -D / 2 + 0.03, 1.05), (W / 2 - 0.01, -D / 2 + 0.03, 1.05), 0.008, n=4)
    b.box('panel', 0, 0.05, H - 0.012, W - 0.1, 0.1, 0.012, skip='t')
    icing = ('pink', '#5b3a25', 'white', 'yellow', '#c98a4b', '#d9534a')
    for t in range(2):
        z = 0.74 + t * 0.2
        yy = -0.08 + t * 0.12
        if t:
            b.box('steel', 0, yy, z - 0.012, W - 0.06, 0.3, 0.012)
        for j in range(3):
            x = (j - 1) * 0.37
            b.box('white', x, yy, z, 0.34, 0.27, 0.012, bev=0.004)
            col = icing[(t * 3 + j) % len(icing)]
            for u in range(3):
                for v in range(2):
                    if rng.random() < 0.88:
                        _donut(b, x - 0.11 + u * 0.11, yy - 0.06 + v * 0.12, z + 0.012, col)
            b.box('white', x, yy - 0.15, z + 0.012, 0.07, 0.004, 0.04, rx=-15)


@asset('coffee_station', G, surface=0.92, length=1.2)
def coffee_station(b):
    W, D, H = 1.2, 0.6, 0.92
    carcass(b, 'wood', 0, 0, 0, W, D, H - 0.04, toe=0.1, top=('cream', 0.02, 0.04))
    fronts(b, 'wood_d', 0, -D / 2, 0.11, W - 0.02, H - 0.17, [(1, 'dd'), (3, 'lr')], hm='chrome')
    # brewer with two pots
    b.box('char', -0.3, 0.08, H, 0.44, 0.34, 0.05, bev=0.008)
    b.box('steel', -0.3, 0.2, H + 0.05, 0.44, 0.1, 0.3, bev=0.008)
    b.box('char', -0.3, 0.08, H + 0.35, 0.44, 0.34, 0.12, bev=0.012)
    b.box('ledr', -0.14, -0.092, H + 0.4, 0.03, 0.004, 0.02, skip='k')
    b.box('orange', -0.2, -0.092, H + 0.4, 0.03, 0.004, 0.02, skip='k')
    for i, (x, lid) in enumerate(((-0.41, 'black'), (-0.19, 'orange'))):
        b.lathe('clear', x, 0.05, H + 0.055, [(0.05, 0), (0.085, 0.03), (0.085, 0.1), (0.045, 0.15), (0.05, 0.17)], n=10, caps=(False, False))
        b.lathe('#2a170d', x, 0.05, H + 0.057, [(0.047, 0), (0.08, 0.03), (0.08, 0.085)], n=10, caps=(False, True))
        b.cyl(lid, x, 0.05, H + 0.165, 0.052, 0.014, n=10, caps=(False, True))
        b.tube(lid, [(x, -0.03, H + 0.165), (x, -0.08, H + 0.15), (x, -0.08, H + 0.09), (x, -0.035, H + 0.075)], 0.01, n=4)
        b.cyl('char', x, 0.05, H + 0.05, 0.09, 0.006, n=10)
    # cups, lids, condiments
    for i in range(2):
        b.cyl('white', 0.08 + i * 0.1, 0.12, H, 0.04, 0.22 + i * 0.05, n=8, r2=0.045)
        for j in range(4):
            b.cyl('grey_l', 0.08 + i * 0.1, 0.12, H + 0.04 + j * 0.05, 0.046, 0.004, n=8)
    b.box('char', 0.38, 0.1, H, 0.3, 0.22, 0.07, bev=0.006)
    for i, m in enumerate(('white', 'pink', 'yellow', 'brown')):
        b.box(m, 0.275 + i * 0.07, 0.1, H + 0.07, 0.06, 0.18, 0.03, skip='b')
    b.cyl('steel', 0.2, -0.12, H, 0.04, 0.12, n=8)
    for i in range(4):
        b.box('brown', 0.185 + i * 0.01, -0.12, H + 0.06, 0.004, 0.004, 0.13, ry=-8 + i * 5)
    dish(b, 'mug', 0.02, -0.14, H, 0.036, 0.085, 'white')
    b.box('steel', 0.42, -0.12, H, 0.14, 0.14, 0.15, bev=0.01)                           # napkin dispenser
    b.box('white', 0.42, -0.192, H + 0.05, 0.1, 0.004, 0.06, skip='k')


@asset('soda_fountain', G, surface=0.92, length=1.0)
def soda_fountain(b):
    W, D, H = 1.0, 0.65, 0.92
    carcass(b, 'steel', 0, 0, 0, W, D, H - 0.03, toe=0.1, top=('steel', 0.02, 0.03))
    fronts(b, 'grey_l', 0, -D / 2, 0.11, W - 0.02, H - 0.16, [(1, 'lr')], hm='chrome', style='flat', knob_kind='pull')
    b.box('enamel_r', 0, 0.08, H + 0.1, 0.8, 0.4, 0.5, bev=0.02)                           # dispenser head
    b.box('white', 0, -0.123, H + 0.4, 0.76, 0.006, 0.16, skip='k')
    cols = ('red', 'orange', 'green', '#3a2416', 'yellow', 'blue')
    for i, c in enumerate(cols):
        x = -0.3 + i * 0.12
        b.box(c, x, -0.128, H + 0.42, 0.09, 0.006, 0.12, bev=0.004, edges='F', skip='k')
        b.box('white', x, -0.132, H + 0.47, 0.06, 0.004, 0.03, skip='k')
        b.box('char', x, -0.15, H + 0.3, 0.05, 0.07, 0.07, bev=0.008)
        b.cyl('char', x, -0.16, H + 0.26, 0.014, 0.04, n=6)
        b.box('chrome', x, -0.19, H + 0.25, 0.03, 0.008, 0.09, rx=-12)
    b.box('steel', 0, 0.08, H + 0.03, 0.8, 0.4, 0.07, skip='b')
    b.box('char', 0, -0.2, H, 0.8, 0.16, 0.03, bev=0.006)                                # drip tray
    for i in range(9):
        b.box('steel', -0.36 + i * 0.09, -0.2, H + 0.03, 0.012, 0.14, 0.004, skip='b')
    b.box('steel', 0, 0.08, H + 0.6, 0.5, 0.3, 0.1, bev=0.02)                              # ice hopper lid
    for i, sx in enumerate((-1, 1)):
        b.cyl('white', sx * 0.45, -0.18, H, 0.045, 0.3, n=8)
        for j in range(5):
            b.cyl(('red', 'blue')[i], sx * 0.45, -0.18, H + 0.03 + j * 0.055, 0.047, 0.012, n=8, caps=(False, False))


@asset('menu_board_wall', G, mount='wall', length=1.8)
def menu_board_wall(b):
    z = 2.0
    b.box('char', 0, -0.03, z, 1.86, 0.06, 0.7, bev=0.012)
    for i in range(3):
        x = (i - 1) * 0.6
        b.box('panel', x, -0.062, z + 0.05, 0.56, 0.004, 0.6, skip='k')
        b.decal('menu', x, -0.0655, z + 0.35, 0.54, 0.58, sub=(i / 3, 0, (i + 1) / 3, 1))
    b.box('red', 0, -0.07, z + 0.66, 1.86, 0.02, 0.05, bev=0.006)
    for sx in (-1, 1):
        b.tube('char', [(sx * 0.7, -0.03, z + 0.7), (sx * 0.7, -0.03, z + 0.78), (sx * 0.7, 0.0, z + 0.8)], 0.008, n=4)


@asset('neon_open_sign', G, mount='wall')
def neon_open_sign(b):
    """Window sign; the tubes use light__neon (border) and light__neon2 (letters)."""
    z = 1.5
    w, h = 0.72, 0.36
    b.box('black', 0, -0.01, z, w, 0.02, h, bev=0.006)
    y = -0.045
    c, m = z + h / 2, 0.035
    b.tube('neon', [(-w / 2 + m + 0.04, y, z + m), (w / 2 - m - 0.04, y, z + m), (w / 2 - m, y, z + m + 0.04), (w / 2 - m, y, z + h - m - 0.04), (w / 2 - m - 0.04, y, z + h - m),
                    (-w / 2 + m + 0.04, y, z + h - m), (-w / 2 + m, y, z + h - m - 0.04), (-w / 2 + m, y, z + m + 0.04)], 0.009, n=4, closed=True)
    lh, lw, r = 0.14, 0.09, 0.008
    def L(x, pts, closed=False):
        b.tube('neon2', [(x + px * lw, y, c + pz * lh) for px, pz in pts], r, n=4, closed=closed)
    L(-0.24, [(-0.5, -0.3), (-0.5, 0.3), (-0.2, 0.5), (0.2, 0.5), (0.5, 0.3), (0.5, -0.3), (0.2, -0.5), (-0.2, -0.5)], closed=True)
    L(-0.08, [(-0.5, -0.5), (-0.5, 0.5), (0.3, 0.5), (0.5, 0.3), (0.5, 0.15), (0.3, 0.0), (-0.5, 0.0)])
    L(0.08, [(-0.5, -0.5), (-0.5, 0.5)])
    for pz, px in ((0.5, 0.5), (0.0, 0.3), (-0.5, 0.5)):
        L(0.08, [(-0.5, pz), (px, pz)])
    L(0.24, [(-0.5, -0.5), (-0.5, 0.5), (0.5, -0.5), (0.5, 0.5)])
    for sx in (-1, 1):
        b.rod('steel_d', (sx * 0.25, -0.01, z + h), (sx * 0.25, -0.004, z + h + 0.2), 0.003, n=3)
    b.tube('black', [(0.3, -0.01, z), (0.32, -0.01, z - 0.15), (0.36, -0.004, z - 0.5)], 0.005, n=3)


@asset('bank_teller_counter', G, surface=1.05, length=2.4, stand=[[-0.6, 0.7, 0], [0.6, 0.7, 0]])
def bank_teller_counter(b):
    """Two teller windows; customers face it from -Y, tellers stand at `stand`."""
    W, D, H = 2.4, 0.7, 1.05
    b.box('wood_dd', 0, 0, 0, W, D - 0.04, 0.12, skip='tb')
    b.box('wood', 0, 0, 0.12, W, D, H - 0.16, bev=0.008, edges='z')
    for i in range(4):
        x = (i - 1.5) * 0.59
        b.box('wood_d', x, -D / 2 - 0.004, 0.2, 0.5, 0.008, H - 0.36, bev=0.008, edges='F', skip='k')
        b.box('wood', x, -D / 2 - 0.01, 0.26, 0.38, 0.008, H - 0.48, bev=0.006, edges='F', skip='k')
    b.box('#3d4a45', 0, -0.02, H - 0.04, W + 0.06, D + 0.08, 0.04, bev=0.012)                # stone top
    top = 1.95
    for sx in (-1, 0, 1):
        b.box('wood', sx * (W / 2 - 0.04), 0, H, 0.08, 0.1, top - H, bev=0.006, edges='z')
    b.box('wood', 0, 0, top, W + 0.04, 0.14, 0.08, bev=0.012)
    for sx in (-1, 1):
        x = sx * (W / 4 - 0.02)
        ww = W / 2 - 0.1
        b.box('clear', x, 0, H + 0.16, ww, 0.01, top - H - 0.16)
        frame(b, 'brass', x, 0.012, H + 0.16 + (top - H - 0.16) / 2, ww - 0.02, top - H - 0.18, t=0.02, depth=0.024, bev=0.004)
        b.box('brass', x, 0, H + 0.14, ww, 0.03, 0.02)
        for i in range(5):                                                              # speak-through slots
            b.box('brass', x, -0.006, H + 0.5 + i * 0.03, 0.14, 0.004, 0.012, skip='k')
        b.box('brass', x, -0.05, H, 0.34, 0.3, 0.008, skip='b')                           # deal tray
        b.box('#2a332f', x, -0.05, H + 0.006, 0.28, 0.24, 0.004, skip='b')
        b.box('white', x - 0.3, -0.2, H, 0.1, 0.15, 0.03, rz=12, skip='b')                 # slips and pen
        b.cyl('black', x + 0.32, -0.2, H, 0.03, 0.015, n=8)
        b.box('black', x + 0.32, -0.2, H + 0.015, 0.008, 0.008, 0.12, rx=18)
        b.tube('brass', [(x + 0.32, -0.2, H + 0.02), (x + 0.26, -0.22, H + 0.004), (x + 0.2, -0.16, H + 0.004)], 0.003, n=3)
        b.box('black', x, -0.012, top - 0.2, 0.3, 0.008, 0.08, skip='k')
        b.box('gold', x, -0.017, top - 0.175, 0.2, 0.004, 0.03, skip='k')
        # teller side: cash drawer and stamp
        b.box('wood_d', x, D / 2 + 0.002, 0.6, 0.6, 0.006, 0.2, bev=0.005, edges='K', skip='f')
        b.box('brass', x, D / 2 + 0.012, 0.7, 0.12, 0.012, 0.014)
        b.box('green', x + 0.2, 0.2, H, 0.16, 0.07, 0.04, bev=0.004)
        b.box('white', x + 0.2, 0.2, H + 0.04, 0.04, 0.071, 0.002)


@asset('bank_vault_door', G, hinge=[-0.95, -0.2, 0], length=2.4, height=2.5)
def bank_vault_door(b):
    """Steel wall frame (2.4 x 2.5 m, back at y = 0) with the round door as a `.door` child hinged on its -X side."""
    W, H, cz, R0 = 2.4, 2.5, 1.2, 0.95
    n = 16
    ring = [(R0 * math.cos(i * math.tau / n), cz + R0 * math.sin(i * math.tau / n)) for i in range(n)]
    # frame plate with a round opening: quads from the square outline to the circle
    def sq(a):
        c, s = math.cos(a), math.sin(a)
        k = 1 / max(abs(c), abs(s) * (W / 2) / (H - cz) if s > 0 else abs(s) * (W / 2) / cz, 1e-6)
        return (max(-W / 2, min(W / 2, c * k * 1.0 * W / 2)), max(0.0, min(H, cz + s * k * W / 2)))
    outer = [sq(i * math.tau / n) for i in range(n)]
    for y, flipf in ((-0.2, False),):
        vs = [(x, y, z) for x, z in ring] + [(x, y, z) for x, z in outer]
        b.add(vs, [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)], 'steel_d')
    vs = [(x, -0.2, z) for x, z in ring] + [(x, 0.0, z) for x, z in ring]
    b.add(vs, [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)], 'steel')         # opening reveal
    b.box('steel_d', -W / 2 + 0.0, -0.1, 0, 0.02, 0.2, H, skip='r')
    b.box('steel_d', W / 2, -0.1, 0, 0.02, 0.2, H, skip='l')
    b.box('steel_d', 0, -0.1, H, W + 0.02, 0.2, 0.02, skip='b')
    b.lathe('steel', 0, -0.2, cz, [(R0 + 0.1, 0), (R0 + 0.1, -0.03), (R0, -0.03)], n=n, axis='y', caps=(False, False))
    for i in range(8):
        a = i * math.tau / 8 + 0.39
        b.cyl('iron', (R0 + 0.05) * math.cos(a), -0.23, cz + (R0 + 0.05) * math.sin(a), 0.02, 0.012, n=6, axis='y', rz=180)
    p = b.part('door', pivot=(-R0, -0.2, cz))
    y0 = -0.23
    p.lathe('steel', 0, y0, cz, [(R0 - 0.02, 0), (R0 - 0.02, -0.14), (R0 - 0.06, -0.18), (R0 - 0.3, -0.18), (R0 - 0.34, -0.22), (0, -0.22)], n=n, axis='y', caps=(False, False))
    p.lathe('steel_d', 0, y0, cz, [(R0 - 0.04, 0.2), (R0 - 0.02, 0)], n=n, axis='y', caps=(True, False))
    for i in range(10):                                                                 # locking bolts round the rim
        a = i * math.tau / 10
        p.cyl('chrome', (R0 - 0.18) * math.cos(a), y0 - 0.18, cz + (R0 - 0.18) * math.sin(a), 0.035, 0.03, n=8, axis='y', rz=180)
    p.lathe('iron', 0, y0 - 0.22, cz, [(0.2, 0), (0.2, -0.04), (0.14, -0.06), (0.05, -0.06), (0.05, -0.16), (0, -0.16)], n=12, axis='y', caps=(False, False))
    k = p.mark()
    p.rod('chrome', (0, y0 - 0.34, cz), (0.36, y0 - 0.34, cz), 0.016, n=6)
    p.ball('chrome', 0.37, y0 - 0.34, cz, 0.035, n=6, rings=3)
    p.radial(k, 5, axis='y', pivot=(0, y0 - 0.34, cz))
    p.tube('chrome', [(0.26 * math.cos(i * math.tau / 12), y0 - 0.34, cz + 0.26 * math.sin(i * math.tau / 12)) for i in range(12)], 0.012, n=4, closed=True)
    p.cyl('brass', 0.42, y0 - 0.22, cz + 0.42, 0.07, 0.03, n=10, axis='y', rz=180)             # combination dial
    disc_decal(p, 'gauge', 0.42, y0 - 0.2515, cz + 0.42, 0.055, n=10)
    p.box('brass', -0.4, y0 - 0.225, cz - 0.45, 0.2, 0.006, 0.1, skip='k')
    for dz in (-0.45, 0.45):                                                            # hinge arms
        p.box('iron', -R0 + 0.12, y0 - 0.1, cz + dz - 0.06, 0.5, 0.08, 0.12, bev=0.012)
        p.cyl('iron', -R0 - 0.06, y0 - 0.06, cz + dz - 0.1, 0.05, 0.2, n=8)
    for dz in (-0.45, 0.45):
        b.box('iron', -R0 - 0.14, -0.23, cz + dz - 0.14, 0.14, 0.06, 0.28, bev=0.01)
    return {}


@asset('rope_stanchion', G, length=1.5)
def rope_stanchion(b):
    """Two posts 1.5 m apart joined by a rope; tile along X to make a queue line."""
    for sx in (-1, 1):
        x = sx * 0.75
        b.lathe('brass', x, 0, 0, [(0.16, 0), (0.16, 0.02), (0.1, 0.05), (0.03, 0.07), (0.025, 0.9), (0.04, 0.92), (0.04, 0.95), (0.025, 0.97), (0.035, 1.0), (0, 1.02)], n=10)
        b.tube('brass', [(x - sx * 0.035, 0, 0.935), (x - sx * 0.06, 0, 0.935), (x - sx * 0.06, 0, 0.9)], 0.006, n=4)
    pts = [(-0.69 + i * 1.38 / 8, 0, 0.9 - 0.22 * (1 - ((i - 4) / 4) ** 2)) for i in range(9)]
    b.tube('paint__rope:#8c1f2b', pts, 0.02, n=6)
    for sx in (-1, 1):
        b.cyl('brass', sx * 0.66, 0, 0.87, 0.024, 0.05, n=6)


@asset('atm_indoor', G)
def atm_indoor(b):
    W, D, H = 0.62, 0.6, 1.7
    b.box('char', 0, 0.02, 0, W - 0.04, D - 0.06, 0.08, skip='tb')
    b.box('paint__atm:#2c4a7a', 0, 0, 0.08, W, D, H - 0.08, bev=0.014, edges='zT')
    b.box('panel', 0, -D / 2 - 0.004, H - 0.24, W - 0.08, 0.01, 0.17, bev=0.004, edges='F', skip='k')
    for i, m in enumerate(('yellow', 'white')):
        b.box(m, 0, -D / 2 - 0.011, H - 0.2 + i * 0.05, W - 0.2, 0.003, 0.03, skip='k')
    b.box('grey_l', 0, -D / 2 - 0.02, 0.86, W - 0.06, 0.06, 0.56, bev=0.01, skip='k')        # fascia
    b.box('char', -0.06, -D / 2 - 0.052, 1.14, 0.32, 0.006, 0.24, bev=0.006, edges='F', skip='k')
    b.decal('scr_atm', -0.06, -D / 2 - 0.0565, 1.26, 0.28, 0.2)
    for sx in (-1, 1):
        for i in range(3):
            b.box('grey_d', -0.06 + sx * 0.18, -D / 2 - 0.054, 1.18 + i * 0.06, 0.025, 0.008, 0.03, skip='k')
    b.box('grey_l', 0, -D / 2 - 0.1, 0.8, W - 0.06, 0.2, 0.08, bev=0.01, rx=0)               # keypad shelf
    b.decal('keypad', -0.08, -D / 2 - 0.1, 0.8815, 0.14, 0.15, face='t')
    b.box('char', 0.19, -D / 2 - 0.054, 1.3, 0.1, 0.008, 0.02, skip='k')                    # card slot
    b.box('green', 0.19, -D / 2 - 0.056, 1.335, 0.03, 0.006, 0.012, skip='k')
    b.box('char', 0.19, -D / 2 - 0.054, 1.18, 0.14, 0.008, 0.03, skip='k')                  # receipt
    b.box('white', 0.19, -D / 2 - 0.06, 1.16, 0.08, 0.003, 0.05, rx=-10)
    b.box('steel', 0.1, -D / 2 - 0.054, 0.96, 0.3, 0.01, 0.06, bev=0.004, skip='k')          # cash slot
    b.box('black', 0.1, -D / 2 - 0.06, 0.98, 0.26, 0.004, 0.018, skip='k')
    b.box('steel', 0, -D / 2 - 0.004, 0.2, W - 0.12, 0.008, 0.5, bev=0.006, edges='F', skip='k')   # service door
    b.cyl('chrome', W / 2 - 0.12, -D / 2 - 0.008, 0.48, 0.016, 0.012, n=6, axis='y', rz=180)


@asset('barber_chair', G)
def barber_chair(b):
    b.lathe('chrome', 0, 0, 0, [(0.3, 0), (0.3, 0.025), (0.2, 0.06), (0.09, 0.09), (0.07, 0.2), (0.1, 0.22), (0.1, 0.3), (0.05, 0.32), (0.05, 0.42)], n=14)
    b.box('enamel', 0, 0.02, 0.42, 0.5, 0.5, 0.06, bev=0.015)
    b.soft('paint__fabric:#8c1f2b', 0, 0, 0.48, 0.52, 0.5, 0.12, r=0.04)
    b.soft('paint__fabric:#8c1f2b', 0, 0.27, 0.56, 0.5, 0.11, 0.56, r=0.04, rx=-12)
    b.box('enamel', 0, 0.335, 0.58, 0.44, 0.03, 0.5, bev=0.01, rx=-12)
    b.box('chrome', 0, 0.36, 1.08, 0.04, 0.02, 0.2, rx=-12)
    b.soft('paint__fabric:#8c1f2b', 0, 0.37, 1.2, 0.26, 0.09, 0.14, r=0.035, rx=-12)
    for sx in (-1, 1):
        b.box('enamel', sx * 0.29, 0.02, 0.44, 0.05, 0.46, 0.26, bev=0.015)
        b.soft('paint__fabric:#8c1f2b', sx * 0.29, 0.0, 0.7, 0.08, 0.36, 0.05, r=0.02)
        b.box('chrome', sx * 0.29, -0.2, 0.5, 0.055, 0.03, 0.2, bev=0.008)
        b.tube('chrome', [(sx * 0.2, -0.22, 0.44), (sx * 0.2, -0.4, 0.3), (sx * 0.2, -0.46, 0.16)], 0.014, n=5)
    b.box('chrome', 0, -0.48, 0.13, 0.46, 0.16, 0.025, bev=0.008, rx=25)
    for i in range(4):
        b.box('black', 0, -0.52 + i * 0.03, 0.156 + i * 0.014, 0.4, 0.012, 0.006, rx=25)
    b.tube('chrome', [(0.1, 0, 0.3), (0.34, 0.05, 0.34), (0.42, 0.05, 0.5)], 0.012, n=5)
    b.ball('black', 0.42, 0.05, 0.52, 0.03, n=6, rings=3)
    return {'seat': [[0, 0, 0.62]]}


@asset('salon_mirror_station', G, surface=0.8)
def salon_mirror_station(b):
    """Stands against a wall: back at y = +0.25."""
    W, D, H = 1.0, 0.5, 0.8
    rng = R(26)
    carcass(b, 'wood_l', 0, 0, 0, W, D, H - 0.03, toe=0.08, top=('offwhite', 0.015, 0.03))
    fronts(b, 'white', 0, -D / 2, 0.09, W - 0.02, H - 0.13, [(1, 'ddd'), (2.4, 'lor')], hm='chrome')
    b.box('wood_l', 0, D / 2 - 0.02, H, W, 0.04, 1.1, bev=0.008)
    b.box('mirror', 0, D / 2 - 0.044, H + 0.1, W - 0.2, 0.006, 0.9, skip='k')
    for sx in (-1, 1):
        for i in range(5):
            b.ball('lamp', sx * (W / 2 - 0.05), D / 2 - 0.05, H + 0.16 + i * 0.19, 0.03, n=6, rings=3)
    for i in range(5):
        b.ball('lamp', -0.36 + i * 0.18, D / 2 - 0.05, H + 1.05, 0.03, n=6, rings=3)
    x = -0.42
    for i in range(7):
        r = rng.uniform(0.022, 0.032)
        h = rng.uniform(0.12, 0.2)
        if i % 3 == 2:
            can(b, x + r, 0.12, H, r, h, rng.choice(GOODS), band='white', lid='white', n=6)
            b.cyl('white', x + r, 0.12, H + h, r * 0.4, 0.025, n=5)
        else:
            _bt(b, x + r, 0.12, H, h, r, rng.choice(('pink', 'mint', 'blue_l', 'purple', 'cream')), cap=rng.choice(('white', 'gold', 'black')), n=6)
        x += 2 * r + 0.02
    b.box('enamel_r', 0.26, 0.02, H + 0.02, 0.2, 0.08, 0.08, bev=0.02, rz=20)                # hairdryer
    b.box('enamel_r', 0.3, -0.06, H, 0.04, 0.05, 0.12, bev=0.01, rz=20, rx=-65)
    b.tube('black', [(0.34, -0.14, H + 0.02), (0.42, -0.16, H + 0.01), (0.46, -0.05, H + 0.01), (0.4, 0.05, H + 0.008)], 0.006, n=4)
    b.cyl('steel', 0.1, 0.1, H, 0.05, 0.12, n=8, caps=(True, False))                       # jar of combs and scissors
    for i in range(3):
        b.box(('black', 'red', 'steel')[i], 0.085 + i * 0.015, 0.1, H + 0.04, 0.008, 0.03, 0.17, ry=-10 + i * 10)
    b.box('black', -0.05, -0.1, H, 0.2, 0.04, 0.008, rz=-15)
    b.box('white', -0.3, -0.08, H, 0.24, 0.18, 0.03, bev=0.01)


def _arcade(b, body, trim, region, marq, two=False, W=0.66):
    D, H = 0.86, 1.78
    side = [(0.38, 0), (0.38, 1.78), (-0.2, 1.78), (-0.3, 1.52), (-0.16, 1.44), (-0.08, 1.04), (-0.42, 0.98), (-0.42, 0.86), (-0.3, 0.82), (-0.3, 0)]
    for sx in (-1, 1):
        x = sx * (W / 2 - 0.012)
        b.prism(body, side, x - 0.012, x + 0.012, plane='yz')
        b.prism(trim, [(0.2, 0.25), (0.2, 0.7), (-0.2, 0.55), (-0.2, 0.25)], x + sx * 0.013 - 0.001, x + sx * 0.013 + 0.001, plane='yz')
        b.prism('yellow', [(0.25, 1.15), (0.25, 1.6), (-0.1, 1.5), (0.0, 1.15)], x + sx * 0.013 - 0.001, x + sx * 0.013 + 0.001, plane='yz')
    wi = W - 0.046
    b.box(body, 0, 0.37, 0, wi, 0.02, H, skip='lr')
    b.box(body, 0, 0.09, H - 0.02, wi, 0.56, 0.02, skip='lr')
    b.box('char', 0, -0.295, 0.0, wi, 0.012, 0.82, skip='lr')                              # lower front
    b.box(trim, 0, -0.302, 0.08, wi, 0.004, 0.05, skip='lrk')
    b.box('steel_d', 0, -0.303, 0.36, 0.3, 0.008, 0.34, bev=0.006, edges='F', skip='k')      # coin door
    for sx in (-1, 1):
        b.box('light__coin:#ff8a3a', sx * 0.07, -0.309, 0.56, 0.05, 0.004, 0.07, skip='k')
        b.box('black', sx * 0.07, -0.312, 0.585, 0.008, 0.004, 0.03, skip='k')
    b.box('black', 0, -0.308, 0.42, 0.16, 0.006, 0.05, skip='k')
    # control deck
    b.prism('char', [(-0.42, 0.86), (-0.42, 0.98), (-0.08, 1.04), (-0.08, 0.86)], -wi / 2, wi / 2, plane='yz')
    b.box(trim, 0, -0.25, 1.012, wi - 0.04, 0.3, 0.004, rx=10, skip='b')
    for i, px in enumerate(((-0.14, 0.14) if two else (-0.12,))):
        b.cyl('black', px, -0.26, 1.01, 0.03, 0.012, n=8, rx=10)
        b.cyl('chrome', px, -0.26, 1.02, 0.008, 0.07, n=5, rx=10)
        b.ball(('red', 'blue')[i], px, -0.272, 1.095, 0.024, n=6, rings=3)
        for j in range(2 if two else 3):
            bx = px + (0.09 + j * 0.07 if not two else (0.075 if i == 0 else -0.075)) 
            by = -0.25 + (0.0 if not two else (j - 0.5) * 0.09)
            b.cyl(('yellow', 'red', 'blue', 'green')[(i * 2 + j) % 4], bx, by, 1.014 + (by + 0.25) * 0.17, 0.02, 0.012, n=7, rx=10)
    # screen and marquee
    b.prism('black', [(-0.08, 1.04), (-0.16, 1.44), (-0.12, 1.46), (0.0, 1.04)], -wi / 2, wi / 2, plane='yz')
    k = b.mark()
    b.box('screen', 0, 0, 0, wi - 0.12, 0.012, 0.36, bev=0.006, edges='F', skip='k')
    b.decal(region, 0, -0.0135, 0.18, wi - 0.14, 0.34)
    b.rot(k, 'x', -11.3); b.move(k, 0, -0.098, 1.065)
    b.prism('panel', [(-0.3, 1.52), (-0.2, 1.78), (-0.17, 1.78), (-0.17, 1.5), (-0.16, 1.44)], -wi / 2, wi / 2, plane='yz')
    k = b.mark()
    b.decal(marq, 0, -0.002, 0.13, wi - 0.02, 0.26)
    b.rot(k, 'x', -21); b.move(k, 0, -0.302, 1.525)


@asset('arcade_cabinet_1', G, stand=[0, -0.75, 0])
def arcade_cabinet_1(b):
    _arcade(b, 'paint__arcade1:#1f2c4a', 'red', 'scr_arc1', 'marq1')


@asset('arcade_cabinet_2', G, stand=[0, -0.75, 0])
def arcade_cabinet_2(b):
    _arcade(b, 'paint__arcade2:#7c221f', 'yellow', 'scr_arc2', 'marq2', two=True, W=0.74)


@asset('jukebox', G)
def jukebox(b):
    W, D, H = 0.86, 0.62, 1.5
    R0 = W / 2
    arch = [(-R0, 0), (R0, 0), (R0, H - R0)] + [(R0 * math.cos(a), H - R0 + R0 * math.sin(a)) for a in [i * math.pi / 10 for i in range(1, 10)]] + [(-R0, H - R0)]
    b.box('wood_dd', 0, 0, 0, W + 0.04, D + 0.02, 0.1, bev=0.012)
    b.prism('wood_r', arch, -D / 2 + 0.03, D / 2, plane='xz', bev=0.01, edges='caps', z=0.02)
    for mcol, off in (('neon', 0.05), ('light__neon3:#ffd24a', 0.11)):                      # glowing arch tubes
        r = R0 - off
        pts = [(-r, -D / 2 + 0.02, 0.5)] + [(r * math.cos(math.pi - i * math.pi / 10), -D / 2 + 0.02, H - R0 + 0.02 + r * math.sin(i * math.pi / 10)) for i in range(11)] + [(r, -D / 2 + 0.02, 0.5)]
        b.tube(mcol, pts, 0.024, n=5)
    inner = R0 - 0.15
    win = [(-inner, 0.86), (inner, 0.86), (inner, H - R0)] + [(inner * math.cos(a), H - R0 + inner * math.sin(a)) for a in [i * math.pi / 8 for i in range(1, 8)]] + [(-inner, H - R0)]
    b.prism('black', win, -D / 2 + 0.01, -D / 2 + 0.03, plane='xz', z=0.02)
    b.decal('juke', 0, -D / 2 + 0.008, 1.0, 0.5, 0.26)
    for i in range(3):                                                                  # records in the window
        b.cyl('black', -0.16 + i * 0.16, -D / 2 + 0.006, 1.28, 0.085, 0.006, n=10, axis='y', rz=180)
        b.cyl(('red', 'yellow', 'blue_l')[i], -0.16 + i * 0.16, -D / 2 - 0.002, 1.28, 0.03, 0.004, n=8, axis='y', rz=180)
    b.box('chrome', 0, -D / 2, 0.78, W - 0.1, 0.06, 0.08, bev=0.012)                         # selector bar
    for i in range(10):
        b.box(('white', 'red')[i % 2], -0.29 + i * 0.065, -D / 2 - 0.032, 0.8, 0.045, 0.006, 0.04, skip='k')
    b.box('#c9a24a', 0, -D / 2 + 0.014, 0.16, W - 0.2, 0.02, 0.56, bev=0.006, edges='F', skip='k')   # speaker grille
    for i in range(7):
        b.box('chrome', -0.27 + i * 0.09, -D / 2 + 0.0, 0.16, 0.014, 0.012, 0.56, skip='k')
    b.cyl('chrome', 0, -D / 2 - 0.01, 0.44, 0.1, 0.014, n=10, axis='y', rz=180)
    b.cyl('red', 0, -D / 2 - 0.022, 0.44, 0.06, 0.008, n=10, axis='y', rz=180)
    for sx in (-1, 1):
        b.box('chrome', sx * (R0 - 0.02), -D / 2 + 0.02, 0.12, 0.05, 0.03, 0.38, bev=0.01)


@asset('pool_table', G, surface=0.8)
def pool_table(b):
    W, D, H = 2.5, 1.4, 0.82
    rng = R(28)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.lathe('wood_dd', sx * (W / 2 - 0.2), sy * (D / 2 - 0.2), 0, [(0.07, 0), (0.08, 0.03), (0.06, 0.08), (0.09, 0.3), (0.1, 0.5), (0.1, 0.56)], n=8)
    b.box('wood_d', 0, 0, 0.52, W - 0.12, D - 0.12, 0.2, bev=0.03, edges='zB')
    b.box('paint__felt:#2f7d52', 0, 0, 0.72, W - 0.2, D - 0.2, 0.06, skip='b')
    for sy in (-1, 1):                                                                  # rails and cushions
        b.box('wood', 0, sy * (D / 2 - 0.06), 0.7, W, 0.14, 0.12, bev=0.02, edges='xT')
        for sx in (-1, 1):
            b.box('paint__felt:#2f7d52', sx * (W / 4 - 0.03), sy * (D / 2 - 0.15), 0.78, W / 2 - 0.3, 0.05, 0.035, bev=0.015, edges='xT', skip='b')
            b.cyl('white', sx * W / 4, sy * (D / 2 - 0.05), 0.82, 0.012, 0.002, n=4)
    for sx in (-1, 1):
        b.box('wood', sx * (W / 2 - 0.06), 0, 0.7, 0.14, D - 0.26, 0.12, bev=0.02, edges='yT', skip='fk')
        b.box('paint__felt:#2f7d52', sx * (W / 2 - 0.15), 0, 0.78, 0.05, D - 0.5, 0.035, bev=0.015, edges='yT', skip='b')
    for px in (-1, 0, 1):
        for sy in (-1, 1):
            x, y = px * (W / 2 - 0.13), sy * (D / 2 - (0.13 if px else 0.1))
            b.cyl('black', x, y, 0.781, 0.06, 0.001, n=8)
            b.cyl('black', x, y, 0.826, 0.055, 0.001, n=8)
    cols = ('yellow', 'blue', 'red', 'purple', 'orange', 'green', 'red_d', 'black', 'yellow', 'blue')
    n = 0
    for r in range(4):
        for i in range(r + 1):
            b.ball(cols[n % len(cols)], 0.55 + r * 0.05, (i - r / 2) * 0.058, 0.809, 0.028, n=6, rings=3)
            n += 1
    b.ball('white', -0.6, 0.04, 0.809, 0.028, n=6, rings=3)
    b.ball('red', -0.2, -0.3, 0.809, 0.028, n=6, rings=3)
    for i, (x, y, rz) in enumerate(((-0.5, 0.28, 12), (0.1, -0.45, -4))):                 # cues
        k = b.mark()
        b.cyl('wood_l', -0.7, 0, 0, 0.007, 1.4, n=5, axis='x', r2=0.014)
        b.cyl('wood_dd', 0.3, 0, 0, 0.012, 0.4, n=5, axis='x', r2=0.015)
        b.rot(k, 'z', rz); b.move(k, x, y, 0.8 + 0.02 + i * 0.0)
    b.box('blue', 1.0, 0.63, 0.82, 0.025, 0.025, 0.025)


@asset('dartboard', G, mount='wall')
def dartboard(b):
    z = 1.5
    b.box('wood_dd', 0, -0.02, z - 0.02, 0.62, 0.04, 0.66, bev=0.01)
    for sx in (-1, 1):                                                                  # open cabinet doors with score slates
        k = b.mark()
        b.box('wood_d', sx * 0.155, -0.01, 0, 0.31, 0.02, 0.66, bev=0.006)
        b.box('#2a332f', sx * 0.155, -0.022, 0.07, 0.24, 0.004, 0.5, skip='k')
        for i in range(5):
            b.box('white', sx * 0.155 + (i % 2) * 0.03 - 0.03, -0.025, 0.46 - i * 0.07, 0.1, 0.002, 0.01, skip='k')
        b.rot(k, 'z', -sx * 150, pivot=(0, 0, 0)); b.move(k, sx * 0.31, -0.05, z - 0.02)
    b.cyl('black', 0, -0.04, z + 0.31, 0.23, 0.03, n=16, axis='y', rz=180)
    disc_decal(b, 'dart', 0, -0.0715, z + 0.31, 0.225, n=16)
    b.tube('steel', [(0.2 * math.cos(i * math.tau / 12), -0.074, z + 0.31 + 0.2 * math.sin(i * math.tau / 12)) for i in range(12)], 0.003, n=3, closed=True)
    for i, (x, dz, c) in enumerate(((0.03, 0.05, 'red'), (-0.08, -0.03, 'yellow'), (0.1, -0.1, 'red'))):
        b.cyl('brass', x, -0.072, z + 0.31 + dz, 0.005, 0.07, n=4, axis='y', rz=180, rx=10)
        b.box(c, x, -0.15, z + 0.31 + dz + 0.012, 0.03, 0.04, 0.004, rx=10)
        b.box(c, x, -0.15, z + 0.31 + dz + 0.0, 0.004, 0.04, 0.03, rx=10)


@asset('bar_counter', G, surface=1.1, length=3.0, stand=[0, 0.7, 0])
def bar_counter(b):
    """3 m bar; customers on -Y (foot rail), bartender behind at `stand`."""
    W, D, H = 3.0, 0.65, 1.1
    b.box('wood_dd', 0, 0.04, 0, W - 0.02, D - 0.14, 0.12, skip='tb')
    b.box('wood_d', 0, 0, 0.12, W, D - 0.1, H - 0.18, bev=0.008, edges='z')
    for i in range(6):
        x = (i - 2.5) * 0.495
        b.box('wood', x, -D / 2 + 0.046, 0.2, 0.44, 0.008, 0.72, bev=0.008, edges='F', skip='k')
        b.box('wood_d', x, -D / 2 + 0.04, 0.27, 0.32, 0.008, 0.58, bev=0.008, edges='F', skip='k')
    b.box('wood', 0, -0.03, H - 0.06, W + 0.08, D + 0.1, 0.06, bev=0.02)
    b.box('wood_dd', 0, -D / 2 - 0.06, H - 0.07, W + 0.08, 0.07, 0.08, bev=0.03, edges='x')    # padded arm rail
    b.cyl('brass', -W / 2 + 0.05, -D / 2 - 0.1, 0.2, 0.022, W - 0.1, n=8, axis='x')         # foot rail
    for i in range(4):
        x = -W / 2 + 0.2 + i * (W - 0.4) / 3
        b.tube('brass', [(x, -D / 2 + 0.05, 0.3), (x, -D / 2 - 0.1, 0.24), (x, -D / 2 - 0.1, 0.0)], 0.014, n=5)
        b.cyl('brass', x, -D / 2 - 0.1, 0, 0.04, 0.012, n=8)
    # bartender side: shelf, sink, bottle well
    b.box('steel', 0, D / 2 - 0.04, 0.72, W - 0.04, 0.26, 0.03)
    for i in range(3):
        b.box('wood_dd', -1.0 + i * 1.0, D / 2 - 0.048, 0.18, 0.9, 0.006, 0.5, skip='f')
    # top dressing
    rng = R(29)
    for i in range(5):
        x = -1.25 + i * 0.62
        b.cyl(('red', 'cream', 'green', 'cream', 'red')[i], x, -0.12, H, 0.05, 0.004, n=8)
        if i % 2 == 0:
            b.lathe('clear_a', x, -0.12, H + 0.004, [(0.03, 0), (0.036, 0.13), (0.03, 0.13), (0.026, 0.01)], n=8, caps=(True, False))
            b.cyl('#c98a2b', x, -0.12, H + 0.012, 0.028, 0.09, n=8)
            b.cyl('white', x, -0.12, H + 0.102, 0.029, 0.018, n=8)
    dish(b, 'bowl', -0.6, 0.02, H, 0.08, 0.05, 'wood_l')
    b.cyl('#b98a4a', -0.6, 0.02, H + 0.035, 0.065, 0.008, n=8)
    b.cyl('clear', 0.75, 0.05, H, 0.07, 0.02, n=8)                                        # ashtray
    b.box('steel', 1.3, 0.0, H, 0.14, 0.1, 0.14, bev=0.01)                                # napkins
    b.box('white', 1.3, -0.052, H + 0.05, 0.1, 0.004, 0.06, skip='k')
    b.box('black', -1.3, 0.08, H, 0.3, 0.18, 0.012, bev=0.004)                            # bar mat
    return {'seat_line': [[-1.2, -0.75, 0], [1.2, -0.75, 0]]}


@asset('back_bar', G, surface=0.95, length=3.0)
def back_bar(b):
    """Stands against a wall: back at y = +0.25."""
    W, D, H = 3.0, 0.5, 0.95
    rng = R(30)
    carcass(b, 'wood_d', 0, 0, 0, W, D, H - 0.04, toe=0.1, toe_m='wood_dd', top=('wood', 0.02, 0.04))
    fronts(b, 'wood', 0, -D / 2, 0.11, W - 0.02, H - 0.17, [(1, 'dddd'), (2.6, 'lrlrlr')], hm='brass')
    yb = D / 2 - 0.02
    b.box('wood_d', 0, yb, H, W, 0.04, 1.35, bev=0.006)
    b.box('mirror', 0, yb - 0.024, H + 0.12, W - 0.5, 0.006, 1.05, skip='k')
    for sx in (-1, 1):
        b.box('wood', sx * (W / 2 - 0.08), yb - 0.06, H, 0.14, 0.14, 1.35, bev=0.012, edges='z')
        b.box('wood_d', sx * (W / 2 - 0.08), yb - 0.134, H + 0.1, 0.08, 0.008, 1.1, bev=0.006, edges='F', skip='k')
    b.box('wood', 0, yb - 0.08, H + 1.35, W + 0.08, 0.24, 0.1, bev=0.03, edges='xB')          # cornice
    b.box('wood_d', 0, yb - 0.08, H + 1.45, W + 0.04, 0.2, 0.03)
    for i in range(3):
        z = H + i * 0.36
        dd = 0.34 - i * 0.07
        if i:
            b.box('clear', 0, yb - 0.02 - dd / 2, z - 0.012, W - 0.3, dd, 0.012)
            for sx in (-1, 0, 1):
                b.box('brass', sx * (W / 2 - 0.3), yb - 0.03 - dd / 2, z - 0.05, 0.02, dd - 0.02, 0.038)
        _bottles(b, -W / 2 + 0.24, W / 2 - 0.24, yb - dd - 0.02, z, 0.31, rng, gap=0.07 + i * 0.015)
    b.box('panel', 0, yb - 0.1, H + 1.34, W - 0.4, 0.06, 0.012, skip='t')
    # counter: till, glasses rack, ice bucket
    _register(b, -1.1, -0.02, H)
    for i in range(8):
        b.lathe('clear', 0.7 + (i % 4) * 0.09, -0.12 + (i // 4) * 0.09, H, [(0.03, 0), (0.036, 0.12)], n=6, caps=(True, False))
    b.lathe('steel', 1.25, -0.05, H, [(0.08, 0), (0.1, 0.18), (0.11, 0.18)], n=10, caps=(True, False))
    b.cyl('white', 1.25, -0.05, H + 0.16, 0.095, 0.01, n=10)


@asset('beer_tap_set', G, mount='top')
def beer_tap_set(b):
    b.box('steel', 0, 0, 0, 0.6, 0.2, 0.025, bev=0.006)                                   # drip tray
    for i in range(7):
        b.box('char', -0.24 + i * 0.08, -0.01, 0.025, 0.05, 0.14, 0.003, skip='b')
    b.lathe('brass', 0, 0.06, 0.025, [(0.06, 0), (0.06, 0.02), (0.04, 0.04), (0.04, 0.3), (0.05, 0.32)], n=10)
    b.box('brass', 0, 0.06, 0.34, 0.56, 0.08, 0.08, bev=0.02)
    cols = ('red', 'green_d', 'cream', 'navy')
    for i, c in enumerate(cols):
        x = -0.2 + i * 0.133
        b.cyl('chrome', x, 0.02, 0.37, 0.016, 0.07, n=6, axis='y', rz=180)
        b.cyl('chrome', x, -0.045, 0.3, 0.012, 0.08, n=6)
        b.cyl('chrome', x, -0.045, 0.38, 0.01, 0.04, n=5)
        b.box(c, x, -0.045, 0.42, 0.04, 0.03, 0.15, bev=0.008, taper=(1.3, 1))
        b.box('white', x, -0.061, 0.47, 0.03, 0.003, 0.06, skip='k')

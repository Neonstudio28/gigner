"""Furniture family: living assets."""
import math
from furniture_kit import *

G = 'living'


def _pillow(b, x, y, z, s, c1, c2, rx=0, rz=0):
    k = b.mark()
    b.soft(c1, 0, 0, 0, s, 0.13, s, r=0.05)
    for dx in (-0.25, 0.0, 0.25):
        b.soft(c2, dx * s, 0, -0.003, s * 0.12, 0.136, s + 0.006, r=0.05)
    b.rot(k, 'x', rx); b.rot(k, 'z', rz); b.move(k, x, y, z)


def _sofa(b, n, pillows=True):
    W, D = 0.64 * n + 0.44, 0.92
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box('wood_dd', sx * (W / 2 - 0.09), sy * (D / 2 - 0.09), 0, 0.07, 0.07, 0.09, bev=0.008, taper=(1.3, 1.3))
    b.box('fabric', 0, 0, 0.08, W - 0.04, D - 0.04, 0.2, bev=0.025)
    for sx in (-1, 1):
        b.soft('fabric', sx * (W / 2 - 0.11), -0.01, 0.1, 0.22, D, 0.52, r=0.06)
    b.soft('fabric', 0, D / 2 - 0.13, 0.2, W - 0.4, 0.24, 0.64, r=0.06, rx=-6)
    seats = []
    for i in range(n):
        x = (i - (n - 1) / 2) * 0.64
        b.soft('fabric', x, -0.09, 0.27, 0.63, 0.64, 0.17, r=0.045)
        b.soft('fabric', x, 0.2, 0.43, 0.62, 0.17, 0.4, r=0.055, rx=-13)
        seats.append([round(x, 3), -0.1, 0.46])
    if pillows:
        _pillow(b, -W / 2 + 0.42, 0.02, 0.45, 0.4, 'cream', 'orange', rx=-24, rz=18)
        if n > 2:
            _pillow(b, W / 2 - 0.44, 0.03, 0.45, 0.38, 'offwhite', 'purple', rx=-22, rz=-14)
    return {'seat': seats}


@asset('sofa_3', G)
def sofa_3(b):
    return _sofa(b, 3)


@asset('sofa_2', G)
def sofa_2(b):
    return _sofa(b, 2)


@asset('armchair', G)
def armchair(b):
    return _sofa(b, 1)


@asset('coffee_table', G, surface=0.43)
def coffee_table(b):
    b.box('wood', 0, 0, 0.38, 1.2, 0.62, 0.05, bev=0.014)
    b.box('wood_d', 0, 0, 0.3, 1.06, 0.5, 0.08, bev=0.006, edges='z', skip='t')
    b.box('wood_d', 0, 0, 0.1, 1.0, 0.44, 0.025, bev=0.006)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box('wood', sx * 0.5, sy * 0.23, 0, 0.07, 0.07, 0.38, bev=0.012, edges='z', taper=(1.35, 1.35))


@asset('coffee_table_setting', G, mount='top')
def coffee_table_setting(b):
    b.box('white', -0.12, -0.02, 0, 0.5, 0.4, 0.004, rz=38)
    b.lathe('char', 0.3, -0.08, 0, [(0.15, 0), (0.17, 0.02), (0.16, 0.02), (0.145, 0.008), (0, 0.008)], n=12)
    bottle(b, 0.34, -0.02, 0.008, 0.32, 0.042, 'gloss:#2f5a3a', cap='gold', label='cream', neck=0.3)
    for dx, dy in ((0.22, -0.1), (0.3, -0.16), (0.38, -0.12), (0.25, -0.02)):
        dish(b, 'wine', dx, dy, 0.008, 0.03, 0.15, 'clear')
    for px, py, rz in ((-0.3, 0.1, 20), (-0.08, -0.14, -30)):
        dish(b, 'plate', px, py, 0.004, 0.105)
        b.prism('#7a4a2e', [(-0.06, -0.035), (0.07, 0), (-0.06, 0.035)], 0.012, 0.05, plane='xy', x=px, y=py, rz=rz)
        b.prism('pink', [(-0.06, -0.035), (0.07, 0), (-0.06, 0.035)], 0.05, 0.06, plane='xy', x=px, y=py, rz=rz)
    b.cyl('red', 0.02, 0.12, 0.004, 0.035, 0.11, n=8, r2=0.042)
    b.cyl('white', 0.02, 0.12, 0.114, 0.044, 0.008, n=8)
    b.rod('red', (0.02, 0.12, 0.11), (0.035, 0.13, 0.19), 0.004, n=4)
    b.box('char', 0.1, -0.04, 0.004, 0.1, 0.06, 0.012, bev=0.004)
    for dx, m in ((0.075, 'white'), (0.125, 'char')):
        b.cyl('clear', dx, -0.04, 0.016, 0.016, 0.05, n=6)
        b.cyl(m, dx, -0.04, 0.066, 0.017, 0.012, n=6)


@asset('tv_crt_console', G)
def tv_crt_console(b):
    b.box('wood', 0, 0, 0.12, 0.95, 0.5, 0.66, bev=0.012)
    legs(b, 'wood_d', 0, 0, 0.86, 0.42, 0.12, t=0.05, taper=0.6)
    b.box('wood_d', -0.13, -0.253, 0.2, 0.62, 0.012, 0.52, bev=0.006, edges='F', skip='k')
    b.box('screen', -0.13, -0.262, 0.23, 0.55, 0.014, 0.45, bev=0.012, edges='F', skip='k')
    b.decal('scr_show', -0.13, -0.2695, 0.455, 0.5, 0.4)
    b.box('char', 0.33, -0.254, 0.2, 0.22, 0.01, 0.52, skip='k')
    for i in range(2):
        b.cyl('silver', 0.33, -0.259, 0.63 - i * 0.1, 0.035, 0.03, n=10, axis='y', rz=180)
    for i in range(8):
        b.box('wood_l', 0.33, -0.262, 0.23 + i * 0.03, 0.17, 0.008, 0.014, skip='k')
    b.box('char', 0, 0.2, 0.3, 0.6, 0.2, 0.36, bev=0.02, skip='f')
    return {'surface': 0.78}


@asset('bookshelf_full', G)
def bookshelf_full(b):
    zs, ch = shelf_unit(b, 'wood', 0, 0, 0, 0.9, 0.3, 1.9, 5)
    b.box('wood', 0, -0.01, 1.9, 0.96, 0.34, 0.03, bev=0.01)
    rng = R(11)
    for i, z in enumerate(zs):
        if i == 2:
            books(b, -0.42, -0.05, -0.13, z, 0.2, ch - 0.04, rng)
            plant(b, 'orchid', 0.22, -0.02, z, 0.6, 'terra')
        elif i == 4:
            books(b, -0.42, 0.1, -0.13, z, 0.2, ch - 0.04, rng)
            b.ball('blue_l', 0.28, 0, z + 0.1, 0.09, n=10, rings=5)
            b.cyl('brass', 0.28, 0, z, 0.05, 0.02, n=8)
        else:
            books(b, -0.42, 0.42, -0.13, z, 0.2, ch - 0.04, rng, fill=0.92)


@asset('recliner', G)
def recliner(b):
    W, D = 0.94, 0.96
    b.box('char', 0, 0, 0, W - 0.18, D - 0.2, 0.08, bev=0.01)
    b.soft('fabric', 0, -0.02, 0.07, W - 0.3, D - 0.12, 0.24, r=0.05)
    for sx in (-1, 1):
        b.soft('fabric', sx * (W / 2 - 0.12), -0.02, 0.07, 0.24, D - 0.08, 0.53, r=0.08)
    b.soft('fabric', 0, -0.08, 0.3, W - 0.47, 0.6, 0.17, r=0.05)
    b.soft('fabric', 0, 0.3, 0.38, W - 0.45, 0.22, 0.4, r=0.07, rx=-18)
    b.soft('fabric', 0, 0.42, 0.74, W - 0.5, 0.2, 0.3, r=0.07, rx=-18)
    b.soft('fabric', 0, -0.445, 0.1, W - 0.49, 0.1, 0.3, r=0.04)
    b.rod('steel', (W / 2 + 0.002, -0.1, 0.3), (W / 2 + 0.03, -0.22, 0.46), 0.01)
    b.ball('wood_dd', W / 2 + 0.03, -0.225, 0.47, 0.026, n=6, rings=3)
    return {'seat': [[0, -0.08, 0.5]]}


@asset('side_table', G, surface=0.56)
def side_table(b):
    b.box('wood', 0, 0, 0.53, 0.5, 0.5, 0.03, bev=0.01)
    b.box('wood', 0, 0, 0.4, 0.43, 0.43, 0.13, bev=0.005, edges='z', skip='t')
    drawer(b, 'wood_d', 0, -0.215, 0.415, 0.34, 0.1, kind='knob')
    legs(b, 'wood', 0, 0, 0.44, 0.44, 0.4, t=0.045, taper=0.6)
    b.box('wood_d', 0, 0, 0.12, 0.4, 0.4, 0.02, bev=0.005)


@asset('tv_crt_small', G, mount='top')
def tv_crt_small(b):
    crt(b, 0, 0, 0.015, 0.5, 0.42, 0.38, body='char', region='scr_tv')
    for sx in (-1, 1):
        b.box('black', sx * 0.18, -0.08, 0, 0.05, 0.2, 0.016)
        b.rod('chrome', (sx * 0.02, 0.08, 0.4), (sx * 0.26, 0.1, 0.74), 0.004, n=4)
    b.lathe('char', 0, 0.08, 0.375, [(0.05, 0), (0.035, 0.035), (0, 0.04)], n=8)


@asset('tv_stand', G, surface=0.5)
def tv_stand(b):
    carcass(b, 'wood', 0, 0, 0.05, 1.0, 0.42, 0.45, top=('wood', 0.015, 0.03))
    for sx in (-1, 1):
        b.box('wood_dd', sx * 0.42, 0, 0, 0.08, 0.34, 0.05)
    b.box('wood_dd', -0.22, -0.2, 0.3, 0.5, 0.03, 0.14, skip='f')
    b.box('wood_dd', -0.22, -0.2, 0.1, 0.5, 0.03, 0.17, skip='f')
    b.box('char', -0.22, -0.16, 0.305, 0.42, 0.24, 0.085, bev=0.006)   # VCR
    b.box('black', -0.26, -0.2815, 0.345, 0.2, 0.004, 0.025, skip='k')
    b.box('ledr', -0.07, -0.2815, 0.33, 0.05, 0.004, 0.014, skip='k')
    rng = R(4)
    for i in range(9):   # tapes
        b.box(rng.choice(('char', 'black', 'red_d', 'navy', 'offwhite')), -0.43 + i * 0.03, -0.12, 0.105, 0.026, 0.14, 0.2, skip='bk')
    b.box('wood', -0.22, -0.2, 0.275, 0.5, 0.03, 0.02)
    door(b, 'wood_d', 0.26, -0.21, 0.08, 0.42, 0.38, hinge='r', style='glass')
    b.box('wood', 0.26, -0.05, 0.26, 0.42, 0.28, 0.015)
    b.box('silver', 0.26, -0.1, 0.275, 0.34, 0.2, 0.07, bev=0.005)


@asset('bookshelf_low', G, surface=0.9)
def bookshelf_low(b):
    zs, ch = shelf_unit(b, 'wood', 0, 0, 0, 1.2, 0.3, 0.87, 2)
    b.box('wood', 0, -0.01, 0.87, 1.26, 0.34, 0.03, bev=0.01)
    rng = R(5)
    books(b, -0.57, 0.2, -0.13, zs[0], 0.2, ch - 0.05, rng)
    b.box('tan', 0.4, -0.02, zs[0], 0.3, 0.22, 0.2, bev=0.01)
    b.box('brown', 0.4, -0.135, zs[0] + 0.12, 0.1, 0.006, 0.03)
    books(b, -0.57, -0.05, -0.13, zs[1], 0.2, ch - 0.05, rng)
    books(b, 0.2, 0.57, -0.13, zs[1], 0.2, ch - 0.05, rng)
    dish(b, 'bowl', 0.08, -0.02, zs[1], 0.07, 0.12, 'teal')
    plant(b, 'snake', -0.38, 0, 0.9, 0.7, 'terra')
    frame(b, 'brass', 0.3, 0.06, 1.02, 0.14, 0.18, t=0.015, depth=0.02)
    b.decal('pic_vase', 0.3, 0.05, 1.02, 0.14, 0.18)
    b.box('wood_d', 0.3, 0.07, 0.9, 0.1, 0.05, 0.03)


@asset('floor_lamp', G)
def floor_lamp(b):
    b.lathe('brass', 0, 0, 0, [(0.15, 0), (0.15, 0.015), (0.05, 0.04), (0.018, 0.07), (0.014, 1.38)], n=12)
    b.lathe('brass', 0, 0, 1.3, [(0.014, 0), (0.03, 0.02), (0.03, 0.05), (0.014, 0.07)], n=8, caps=(False, False))
    b.ball('lamp', 0, 0, 1.47, 0.05, n=8, rings=4, sz=1.3)
    shade(b, 'cream', 0, 0, 1.33, 0.24, 0.15, 0.3, n=14)
    b.lathe('orange', 0, 0, 1.33, [(0.243, 0), (0.236, 0.025)], n=14, caps=(False, False))
    for i in range(3):
        a = math.radians(i * 120)
        b.rod('brass', (0, 0, 1.4), (math.cos(a) * 0.19, math.sin(a) * 0.19, 1.5), 0.003, n=3)
    b.rod('brass', (0.03, 0, 1.38), (0.03, 0, 1.28), 0.002, n=3)


@asset('table_lamp', G, mount='top')
def table_lamp(b):
    b.lathe('teal', 0, 0, 0, [(0.07, 0), (0.075, 0.01), (0.05, 0.03), (0.085, 0.12), (0.075, 0.2), (0.03, 0.26), (0.02, 0.27)], n=10)
    b.cyl('brass', 0, 0, 0.27, 0.012, 0.09, n=6)
    b.ball('lamp', 0, 0, 0.39, 0.035, n=8, rings=4, sz=1.2)
    shade(b, 'cream', 0, 0, 0.3, 0.16, 0.1, 0.2, n=12)
    b.lathe('mustard', 0, 0, 0.3, [(0.163, 0), (0.158, 0.02)], n=12, caps=(False, False))
    for i in range(3):
        a = math.radians(i * 120 + 30)
        b.rod('brass', (0, 0, 0.35), (math.cos(a) * 0.125, math.sin(a) * 0.125, 0.42), 0.0025, n=3)


@asset('rug_rect', G)
def rug_rect(b):
    W, D = 2.4, 1.6
    b.box('red_d', 0, 0, 0, W, D, 0.01, bev=0.004, edges='T', skip='b')
    b.box('cream', 0, 0, 0.004, W - 0.16, D - 0.16, 0.009, skip='b')
    b.box('#9c3b30', 0, 0, 0.008, W - 0.24, D - 0.24, 0.008, skip='b')
    b.box('mustard', 0, 0, 0.012, W - 0.56, D - 0.56, 0.007, skip='b')
    b.box('navy', 0, 0, 0.015, W - 0.64, D - 0.64, 0.007, skip='b')
    dia = [(-0.3, 0), (0, -0.22), (0.3, 0), (0, 0.22)]
    for dx in (-0.55, 0, 0.55):
        b.prism('cream', dia, 0.015, 0.025, plane='xy', x=dx)
        b.prism('red', [(p * 0.55, q * 0.55) for p, q in dia], 0.015, 0.028, plane='xy', x=dx)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.prism('mustard', [(p * 0.4, q * 0.4) for p, q in dia], 0.008, 0.019, plane='xy', x=sx * 0.98, y=sy * 0.58)
        for i in range(20):
            b.box('cream', sx * (W / 2 + 0.03), -D / 2 + 0.04 + i * (D - 0.08) / 19, 0, 0.07, 0.03, 0.005, skip='b')


@asset('rug_round', G)
def rug_round(b):
    for r, h, m in ((1.0, 0.01, 'teal'), (0.9, 0.013, 'cream'), (0.82, 0.016, 'blue_d'), (0.5, 0.019, 'cream'), (0.42, 0.022, 'orange'), (0.2, 0.025, 'blue_d')):
        b.lathe(m, 0, 0, 0, [(r, 0), (r, h - 0.003), (r - 0.004, h), (0, h)], n=24, caps=(False, False))
    k = b.mark()
    b.prism('orange', [(-0.05, 0.56), (0.05, 0.56), (0, 0.76)], 0.012, 0.019, plane='xy')
    b.radial(k, 12)


@asset('fireplace_brick', G, surface=1.22)
def fireplace_brick(b):
    W, D, H = 1.7, 0.5, 1.15
    b.box('grey_d', 0, -0.12, 0, W + 0.2, D + 0.3, 0.06, bev=0.012)           # hearth slab
    for sx in (-1, 1):
        b.box('brick', sx * (W / 2 - 0.22), 0, 0.06, 0.44, D, H - 0.06, bev=0.008, edges='z')
    b.box('brick', 0, 0, 0.82, W - 0.88, D, H - 0.82, skip='lr')
    b.box('char', 0, D / 2 - 0.03, 0.06, W - 0.88, 0.06, 0.76, skip='lr')
    b.box('black', 0, 0.02, 0.06, W - 0.88, D - 0.1, 0.004, skip='b')
    b.prism('brick_d', [(-0.44, 0.76), (-0.36, 0.86), (0.36, 0.86), (0.44, 0.76), (0.44, 0.9), (-0.44, 0.9)], -0.26, -0.2, plane='xz')
    rng = R(7)
    for row in range(11):   # proud bricks in darker and lighter tones
        z = 0.08 + row * 0.097
        for col in range(8):
            x = -W / 2 + 0.115 + col * 0.21 + (0.105 if row % 2 else 0)
            if abs(x) < 0.5 and z < 0.88 or x > W / 2 - 0.1 or rng.random() < 0.45:
                continue
            b.box(rng.choice(('brick_d', '#a35a45', 'brick_d', '#7d3f33')), x, -D / 2 - 0.004, z, 0.19, 0.012, 0.075, skip='k')
    b.box('wood', 0, -0.05, H, W + 0.16, D + 0.16, 0.07, bev=0.016)                # mantel
    b.box('wood', 0, -0.03, H - 0.05, W + 0.06, D + 0.08, 0.05, bev=0.01)
    b.box('iron', 0, -0.1, 0.1, 0.62, 0.3, 0.02)                                   # grate
    for i in range(7):
        b.box('iron', -0.27 + i * 0.09, -0.26, 0.06, 0.015, 0.015, 0.16)
    for sx in (-1, 1):
        b.box('iron', sx * 0.29, -0.1, 0.06, 0.02, 0.3, 0.05)
    for x, y, z, rz in ((-0.05, -0.12, 0.17, 6), (0.03, -0.04, 0.17, -8), (0, -0.09, 0.26, 3)):
        b.cyl('wood_dd', x - 0.24, y, z, 0.05, 0.48, n=7, axis='x', rz=rz)
    for x, s in ((-0.12, 0.8), (0.02, 1.2), (0.14, 0.7)):
        b.prism('light__fire:#ff9a3a', [(-0.06 * s, 0), (0.06 * s, 0), (0.03 * s, 0.12 * s), (0, 0.26 * s), (-0.035 * s, 0.1 * s)], -0.11, -0.07, plane='xz', x=x, z=0.28)
    b.box('brass', -0.5, -0.03, H + 0.07, 0.06, 0.06, 0.012)                       # mantel dressing
    b.lathe('brass', -0.5, -0.03, H + 0.08, [(0.02, 0), (0.008, 0.03), (0.012, 0.16), (0.025, 0.18)], n=8)
    b.cyl('cream', -0.5, -0.03, H + 0.25, 0.011, 0.12, n=6)
    b.box('wood_dd', 0, -0.03, H + 0.07, 0.26, 0.1, 0.2, bev=0.03, edges='T')
    disc_decal(b, 'clock', 0, -0.084, H + 0.175, 0.075, n=10)
    frame(b, 'gold', 0.5, 0.06, H + 0.2, 0.16, 0.2, t=0.018, depth=0.02)
    b.decal('pic_boat', 0.5, 0.05, H + 0.2, 0.16, 0.2)
    b.box('wood_dd', 0.5, 0.075, H + 0.07, 0.1, 0.04, 0.05)


@asset('piano_upright', G)
def piano_upright(b):
    W = 1.48
    b.box('wood', 0, 0.12, 0.0, W, 0.36, 1.2, bev=0.012)
    b.box('wood', 0, 0.12, 1.2, W + 0.04, 0.4, 0.03, bev=0.01)
    b.box('wood_d', 0, -0.065, 0.76, W - 0.12, 0.012, 0.38, bev=0.006, edges='F', skip='k')
    b.box('wood_d', 0, -0.065, 0.1, W - 0.12, 0.012, 0.46, bev=0.006, edges='F', skip='k')
    b.box('wood', 0, -0.17, 0.6, W, 0.3, 0.08, bev=0.012)                           # key bed
    b.box('black', 0, -0.2, 0.68, W - 0.1, 0.2, 0.012, skip='b')
    b.decal('piano', 0, -0.21, 0.6955, W - 0.12, 0.17, face='t')
    b.box('wood', 0, -0.07, 0.68, W - 0.04, 0.05, 0.06, bev=0.01)
    for sx in (-1, 1):
        b.box('wood', sx * (W / 2 - 0.04), -0.19, 0.68, 0.08, 0.26, 0.05, bev=0.012)
        b.prism('wood', [(-0.06, 0), (0.04, 0), (0.04, 0.6), (-0.3, 0.6), (-0.3, 0.52), (-0.06, 0.4)], sx * (W / 2 - 0.04) - 0.035, sx * (W / 2 - 0.04) + 0.035, plane='yz', bev=0.006)
    b.box('wood_d', 0, -0.1, 0.8, 0.6, 0.02, 0.24, bev=0.005, rx=-12)               # music desk
    b.box('wood_d', 0, -0.13, 0.8, 0.6, 0.05, 0.015)
    b.decal('sheet', 0, -0.108, 0.925, 0.36, 0.22, rx=-12)
    for i, m in enumerate(('brass', 'brass', 'brass')):
        b.box(m, (i - 1) * 0.09, -0.11, 0.03, 0.04, 0.09, 0.012, bev=0.004)
    b.box('wood_dd', 0, -0.03, 0, 0.36, 0.08, 0.08)


@asset('piano_stool', G)
def piano_stool(b):
    b.soft('leather', 0, 0, 0.44, 0.7, 0.34, 0.07, r=0.025)
    b.box('wood', 0, 0, 0.36, 0.66, 0.3, 0.08, bev=0.006)
    legs(b, 'wood', 0, 0, 0.64, 0.28, 0.36, t=0.05, taper=0.6)
    return {'seat': [[0, 0, 0.5]]}


@asset('record_player_stand', G, surface=0.62)
def record_player_stand(b):
    W, D = 0.9, 0.42
    legs(b, 'wood_d', 0, 0, W - 0.1, D - 0.08, 0.14, t=0.045, taper=0.55)
    b.box('wood', 0, 0, 0.14, W, D, 0.46, bev=0.01, skip='f')
    b.box('wood_dd', 0, -0.012, 0.16, W - 0.04, D - 0.03, 0.42, skip='fb')
    b.box('wood', -0.02, 0, 0.16, 0.02, D - 0.03, 0.42)
    rng = R(9)
    x = -W / 2 + 0.03
    while x < -0.05:   # record sleeves
        t = rng.uniform(0.008, 0.016)
        b.box(rng.choice(GOODS), x + t / 2, 0, 0.16, t, 0.31, 0.31 + rng.uniform(-0.01, 0.005), ry=rng.uniform(-3, 3), skip='b')
        x += t + 0.004
    b.box('char', 0.21, 0.01, 0.16, 0.36, 0.3, 0.14, bev=0.006)                     # amplifier
    b.box('silver', 0.21, -0.142, 0.17, 0.34, 0.004, 0.12, skip='k')
    for i in range(3):
        b.cyl('char', 0.1 + i * 0.07, -0.144, 0.21, 0.018, 0.02, n=8, axis='y', rz=180)
    b.decal('dial', 0.21, -0.146, 0.262, 0.28, 0.04)
    b.box('wood_d', 0.21, 0.01, 0.31, 0.38, 0.3, 0.014)
    for i in range(6):
        b.box(rng.choice(GOODS), 0.08 + i * 0.045, 0, 0.325, 0.04, 0.2, 0.25, skip='b')
    # turntable
    b.box('wood_d', -0.14, 0, 0.6, 0.48, 0.36, 0.07, bev=0.008)
    b.box('silver', -0.14, 0, 0.67, 0.45, 0.33, 0.006, skip='b')
    b.cyl('char', -0.19, 0, 0.676, 0.15, 0.014, n=14)
    disc_decal(b, 'record', -0.19, 0, 0.6935, 0.145, n=14, face='t')
    b.cyl('chrome', -0.19, 0, 0.69, 0.006, 0.015, n=5)
    b.cyl('silver', 0.03, 0.11, 0.676, 0.022, 0.03, n=8)
    b.rod('chrome', (0.03, 0.11, 0.705), (-0.07, -0.06, 0.7), 0.005, n=4)
    b.box('char', -0.075, -0.07, 0.692, 0.025, 0.04, 0.012, rz=-30)
    b.cyl('char', 0.04, -0.12, 0.676, 0.014, 0.012, n=6)
    b.box('clear', -0.14, 0.17, 0.676, 0.47, 0.006, 0.34, rx=-8, skip='b')        # open lid
    for sx in (-1, 1):
        b.box('clear', -0.14 + sx * 0.235, 0.17, 0.676, 0.006, 0.06, 0.34, rx=-8, skip='b', shear=(0, -0.03))
    b.box('char', 0.31, 0.02, 0.6, 0.22, 0.2, 0.3, bev=0.008)                        # speaker
    b.box('tan', 0.31, -0.083, 0.62, 0.19, 0.006, 0.26, skip='k')
    b.cyl('char', 0.31, -0.086, 0.69, 0.07, 0.006, n=10, axis='y', rz=180)
    b.cyl('char', 0.31, -0.086, 0.82, 0.035, 0.006, n=8, axis='y', rz=180)


for _i, (_kind, _s, _pm) in enumerate((('snake', 1.25, 'white'), ('palm', 1.15, 'terra'), ('bush', 1.0, 'enamel_b')), 1):
    def _mk(kind=_kind, s=_s, pm=_pm, i=_i):
        @asset(f'potted_plant_{i}', G)
        def potted(b):
            plant(b, kind, 0, 0, 0, s, pm, R(20 + i))
            if kind != 'snake':
                b.cyl('offwhite' if pm != 'terra' else 'terra', 0, 0, 0, 0.2 * s, 0.015, n=10)
    _mk()


for _i, (_reg, _w, _h, _fm) in enumerate((('pic_lake', 0.72, 0.52, 'wood'), ('pic_boat', 0.42, 0.56, 'gold'), ('pic_vase', 0.34, 0.46, 'wood_dd'), ('pic_peaks', 0.9, 0.62, 'white')), 1):
    def _mk(reg=_reg, w=_w, h=_h, fm=_fm, i=_i):
        @asset(f'wall_picture_{i}', G, mount='wall')
        def picture(b):
            z = 1.55
            frame(b, fm, 0, 0, z, w, h, t=0.045, depth=0.035, bev=0.012)
            b.box('offwhite', 0, -0.006, z - h / 2, w, 0.012, h, skip='klrtb')
            m = 0.045 if i != 4 else 0.0
            b.decal(reg, 0, -0.016, z, w - 2 * m, h - 2 * m)
            if i == 2:
                b.box('brass', 0, -0.036, z - h / 2 - 0.035, 0.1, 0.004, 0.02, skip='k')
    _mk()


@asset('wall_clock', G, mount='wall')
def wall_clock(b):
    z, r = 1.9, 0.17
    b.lathe('wood', 0, 0, z, [(r + 0.03, 0), (r + 0.03, -0.03), (r + 0.015, -0.045), (r, -0.045), (r, -0.02), (0, -0.02)], n=16, axis='y', caps=(True, False))
    disc_decal(b, 'clock', 0, -0.024, z, r, n=16)
    b.cyl('brass', 0, -0.024, z, 0.012, 0.01, n=6, axis='y', rz=180)


@asset('wall_mirror', G, mount='wall')
def wall_mirror(b):
    z, w, h = 1.5, 0.56, 0.86
    frame(b, 'wood', 0, 0, z, w, h, t=0.06, depth=0.04, bev=0.014)
    b.box('mirror', 0, -0.008, z - h / 2, w, 0.012, h, skip='klrtb')
    b.prism('wood', [(-0.2, 0), (0.2, 0), (0.12, 0.07), (0, 0.1), (-0.12, 0.07)], -0.035, 0, plane='xz', z=z + h / 2 + 0.058, bev=0.008)
    for sx in (-1, 1):
        b.ball('gold', sx * (w / 2 + 0.03), -0.04, z + h / 2 + 0.03, 0.018, n=6, rings=3)


@asset('curtain_pair', G, mount='wall', window=1.2)
def curtain_pair(b):
    zt, zb = 2.2, 0.72
    b.rod('brass', (-0.92, -0.08, zt), (0.92, -0.08, zt), 0.014, n=8)
    for sx in (-1, 1):
        b.ball('brass', sx * 0.95, -0.08, zt, 0.035, n=8, rings=4)
        b.box('brass', sx * 0.8, -0.04, zt - 0.015, 0.02, 0.08, 0.03)
        k = b.mark()
        pts = []
        n = 7
        for i in range(n + 1):
            pts.append((0.42 + i * 0.44 / n, -0.115 if i % 2 else -0.055))
        back = [(p, q + 0.03) for p, q in reversed(pts)]
        b.prism('fabric', pts + back, zb, zt - 0.02, plane='xy')
        b.box('cream', 0.64, -0.1, zb + 0.55, 0.46, 0.1, 0.05, bev=0.012)      # tie-back
        b.box('#a53a31', 0.64, -0.085, zb, 0.47, 0.105, 0.06, skip='b')
        for i in range(8):
            b.cyl('brass', 0.45 + i * 0.055, -0.08, zt - 0.03, 0.02, 0.012, n=6, axis='y', caps=(False, False))
        if sx < 0:
            b.scale(k, -1, 1, 1)
            for j in range(k[1], len(b.f)):
                idx, s, uv = b.f[j]
                b.f[j] = (tuple(reversed(idx)), s, uv)
    b.box('fabric', 0, -0.09, zt + 0.0, 1.76, 0.13, 0.2, bev=0.02)             # pelmet
    b.box('cream', 0, -0.158, zt + 0.02, 1.76, 0.006, 0.03, skip='k')


@asset('coat_rack', G)
def coat_rack(b):
    b.lathe('wood', 0, 0, 0, [(0.2, 0), (0.2, 0.02), (0.06, 0.05), (0.025, 0.1), (0.022, 1.7), (0.035, 1.72), (0.035, 1.76), (0, 1.8)], n=10)
    k = b.mark()
    b.tube('wood', [(0.02, 0, 1.56), (0.12, 0, 1.6), (0.17, 0, 1.68)], 0.012, n=5)
    b.ball('wood', 0.17, 0, 1.69, 0.02, n=6, rings=3)
    b.radial(k, 6)
    k = b.mark()
    b.tube('wood', [(0.02, 0, 1.2), (0.1, 0, 1.22), (0.13, 0, 1.28)], 0.01, n=5)
    b.radial(k, 3)
    b.soft('blue_d', 0.14, 0.02, 0.85, 0.16, 0.36, 0.8, r=0.05)                 # coat
    b.box('blue_d', 0.2, -0.17, 0.9, 0.09, 0.09, 0.6, bev=0.03, rx=6)
    b.box('navy', 0.225, 0.02, 0.9, 0.006, 0.05, 0.7)
    b.lathe('tan', -0.1, -0.13, 1.66, [(0.15, 0), (0.15, 0.008), (0.085, 0.02), (0.075, 0.1), (0, 0.11)], n=10, rx=-25, rz=35)
    b.lathe('brown', -0.1, -0.13, 1.66, [(0.088, 0.02), (0.084, 0.045)], n=10, caps=(False, False), rx=-25, rz=35)


@asset('radiator', G)
def radiator(b):
    n = 10
    for i in range(n):
        x = (i - (n - 1) / 2) * 0.085
        b.soft('offwhite', x, 0, 0.1, 0.07, 0.15, 0.55, r=0.03)
    for z in (0.17, 0.57):
        b.cyl('offwhite', -n * 0.0425, 0, z, 0.03, n * 0.085, n=8, axis='x')
    for sx in (-1, 1):
        b.box('offwhite', sx * 0.38, 0, 0, 0.05, 0.12, 0.12, bev=0.01, taper=(0.7, 0.7))
    b.tube('copper', [(0.44, 0, 0.17), (0.5, 0, 0.17), (0.5, 0, 0.0)], 0.014, n=6)
    b.cyl('brass', 0.5, 0, 0.19, 0.022, 0.05, n=8)
    b.cyl('red', 0.5, 0, 0.24, 0.03, 0.02, n=8)
    b.tube('copper', [(-0.44, 0, 0.57), (-0.49, 0, 0.57), (-0.49, 0, 0.0)], 0.014, n=6)


@asset('ceiling_fan', G, mount='ceiling', spin='blades')
def ceiling_fan(b):
    b.lathe('brass', 0, 0, -0.06, [(0.03, 0), (0.07, 0.03), (0.07, 0.06)], n=10)
    b.cyl('brass', 0, 0, -0.26, 0.014, 0.21, n=6)
    b.lathe('white', 0, 0, -0.4, [(0.06, 0), (0.12, 0.03), (0.12, 0.1), (0.05, 0.14)], n=12)
    b.lathe('brass', 0, 0, -0.44, [(0.04, 0), (0.07, 0.04)], n=10)
    for i in range(3):
        a = math.radians(i * 120)
        x, y = math.cos(a) * 0.09, math.sin(a) * 0.09
        b.tube('brass', [(x * 0.4, y * 0.4, -0.43), (x, y, -0.46), (x * 1.5, y * 1.5, -0.5)], 0.008, n=4)
        shade(b, 'cream', x * 1.6, y * 1.6, -0.6, 0.075, 0.035, 0.1, n=8)
        b.ball('lamp', x * 1.6, y * 1.6, -0.57, 0.03, n=6, rings=3)
    p = b.part('blades', pivot=(0, 0, -0.33))
    p.cyl('brass', 0, 0, -0.345, 0.135, 0.03, n=12)
    k = p.mark()
    p.box('brass', 0.2, 0, -0.335, 0.16, 0.035, 0.008)
    p.prism('wood', [(0.26, -0.055), (0.7, -0.075), (0.74, -0.04), (0.74, 0.04), (0.7, 0.075), (0.26, 0.055)], -0.326, -0.314, plane='xy', bev=0.004, ry=0)
    p.radial(k, 4)
    return {'radius': 0.74}


@asset('chandelier', G, mount='ceiling')
def chandelier(b):
    b.lathe('brass', 0, 0, -0.04, [(0.03, 0), (0.06, 0.02), (0.06, 0.04)], n=10)
    for i in range(6):
        b.box('brass', 0, 0, -0.1 - i * 0.05, 0.022, 0.006, 0.05, rz=i * 90)
    b.lathe('brass', 0, 0, -0.75, [(0, 0), (0.03, 0.03), (0.05, 0.08), (0.02, 0.14), (0.045, 0.22), (0.07, 0.26), (0.03, 0.32), (0.015, 0.36), (0.012, 0.42)], n=10)
    b.ball('brass', 0, 0, -0.77, 0.028, n=8, rings=4)
    k = b.mark()
    b.tube('brass', [(0.04, 0, -0.56), (0.16, 0, -0.66), (0.3, 0, -0.66), (0.36, 0, -0.58)], 0.011, n=5)
    b.lathe('brass', 0.36, 0, -0.58, [(0.012, 0), (0.05, 0.015), (0.05, 0.022), (0.02, 0.03)], n=8)
    b.cyl('cream', 0.36, 0, -0.55, 0.014, 0.09, n=6)
    b.ball('lamp', 0.36, 0, -0.43, 0.024, n=6, rings=4, sz=1.5)
    b.radial(k, 6)
    k = b.mark()
    b.tube('brass', [(0.03, 0, -0.42), (0.1, 0, -0.36), (0.19, 0, -0.38)], 0.008, n=4)
    b.lathe('brass', 0.19, 0, -0.38, [(0.01, 0), (0.035, 0.012), (0.015, 0.02)], n=6)
    b.cyl('cream', 0.19, 0, -0.36, 0.011, 0.07, n=6)
    b.ball('lamp', 0.19, 0, -0.265, 0.02, n=6, rings=4, sz=1.5)
    b.rot(k, 'z', 30)
    b.radial(k, 6)


@asset('pendant_lamp', G, mount='ceiling')
def pendant_lamp(b):
    b.lathe('char', 0, 0, -0.03, [(0.02, 0), (0.05, 0.015), (0.05, 0.03)], n=10)
    b.cyl('black', 0, 0, -0.62, 0.005, 0.6, n=4)
    b.lathe('enamel_g', 0, 0, -0.84, [(0.24, 0), (0.235, 0.012), (0.12, 0.13), (0.05, 0.2), (0.03, 0.24), (0, 0.24)], n=14, caps=(False, False))
    b.lathe('white', 0, 0, -0.838, [(0.228, 0), (0.115, 0.122), (0.045, 0.19)], n=14, caps=(False, False))
    b.f[-28:] = [(tuple(reversed(i)), s, u) for i, s, u in b.f[-28:]]
    b.cyl('brass', 0, 0, -0.7, 0.022, 0.06, n=6)
    b.ball('lamp', 0, 0, -0.75, 0.045, n=8, rings=4, sz=1.2)


@asset('ceiling_light_dome', G, mount='ceiling')
def ceiling_light_dome(b):
    b.lathe('brass', 0, 0, -0.035, [(0.19, 0), (0.2, 0.012), (0.2, 0.035)], n=16, caps=(False, False))
    b.lathe('lamp', 0, 0, -0.13, [(0, 0), (0.07, 0.012), (0.13, 0.04), (0.175, 0.08), (0.185, 0.1)], n=16, caps=(False, False))
    b.lathe('brass', 0, 0, -0.155, [(0, 0), (0.014, 0.008), (0.014, 0.028)], n=6)


@asset('staircase_straight', G, rise=3.0, run=3.75, width=1.0, steps=16)
def staircase_straight(b):
    n, rise, go = 16, 3.0 / 16, 0.25
    run = (n - 1) * go
    y0 = -run / 2
    sl = rise / go
    for i in range(n - 1):
        yf = y0 + i * go
        b.box('wood', 0, yf + go / 2 - 0.015, (i + 1) * rise - 0.035, 0.94, go + 0.03, 0.035, bev=0.008, edges='F')
        b.box('white', 0, yf + 0.01, i * rise, 0.92, 0.02, rise - 0.035, skip='tblr')
    b.box('white', 0, run / 2 - 0.01, (n - 1) * rise, 0.92, 0.02, rise - 0.035, skip='tblr')
    b.box('wood', 0, run / 2 - 0.02, 3.0 - 0.035, 0.94, 0.07, 0.035, bev=0.008, edges='F')
    zr = lambda y: sl * (y - y0) + rise + 0.86
    for sx in (-1, 1):
        x = sx * 0.48
        b.prism('white', [(y0, 0), (y0 + 0.28, 0), (run / 2, 3.0 - 0.24), (run / 2, 3.0), (y0, rise + 0.05)], x - 0.02, x + 0.02, plane='yz')
        xr = sx * 0.445
        for i in range(n - 1):
            yc = y0 + i * go + go / 2
            b.box('white', xr, yc, (i + 1) * rise, 0.028, 0.028, zr(yc) - (i + 1) * rise - 0.02, skip='b')
        ya, yb = y0 - 0.02, run / 2 - 0.05
        b.prism('wood', [(ya, zr(ya) - 0.03), (yb, zr(yb) - 0.03), (yb, zr(yb) + 0.03), (ya, zr(ya) + 0.03)], xr - 0.032, xr + 0.032, plane='yz', bev=0.01, edges='sides')
        for y, zb_, zt_ in ((y0 - 0.03, 0.0, zr(y0) + 0.12), (run / 2 - 0.045, 3.0 - 0.3, zr(run / 2) + 0.06)):
            b.box('wood', xr, y, zb_, 0.09, 0.09, zt_ - zb_, bev=0.01, edges='z')
            b.box('wood', xr, y, zt_, 0.12, 0.12, 0.03, bev=0.008)
            b.lathe('wood', xr, y, zt_ + 0.03, [(0.03, 0), (0.05, 0.035), (0.03, 0.075), (0, 0.085)], n=8)
            b.box('wood_d', xr, y, zb_ + 0.0, 0.11, 0.11, 0.14, bev=0.008, edges='zT')

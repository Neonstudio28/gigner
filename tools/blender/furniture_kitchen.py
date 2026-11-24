"""Furniture family: kitchen assets."""
import math
from furniture_kit import *

G = 'kitchen'

CAB, TOP, DOOR = 'wood', 'paint__counter:#d6d0c2', 'wood'
CH, CD = 0.86, 0.6   # carcass height, depth; worktop adds 0.04


def _base(b, x, w, rows, top=True, y=0.0):
    b.box('char', x, y + 0.04, 0, w, CD - 0.1, 0.1, skip='tb')
    b.box(CAB, x, y + 0.01, 0.1, w, CD - 0.02, CH - 0.1)
    fronts(b, DOOR, x, y - CD / 2 + 0.02, 0.11, w - 0.008, CH - 0.115, rows, hm='steel', hz=0.82)
    if top:
        _top(b, x, w, y)


def _top(b, x, w, y=0.0):
    b.box(TOP, x, y - 0.01, CH, w, CD + 0.02, 0.04, bev=0.01, edges='F')
    b.box(TOP, x, y + CD / 2 - 0.01, CH + 0.04, w, 0.02, 0.06, bev=0.006, edges='F', skip='b')


@asset('kitchen_base_cabinet', G, surface=0.9, module=0.6)
def kitchen_base_cabinet(b):
    _base(b, 0, 0.6, [(1, 'd'), (3.6, 'lr')])


@asset('kitchen_drawer_cabinet', G, surface=0.9, module=0.6)
def kitchen_drawer_cabinet(b):
    _base(b, 0, 0.6, [(1, 'd'), (1.2, 'd'), (1.2, 'd'), (1.2, 'd')])
    b.box('offwhite', 0.12, -0.05, 0.9, 0.3, 0.22, 0.018, bev=0.005)       # chopping board, knife block
    b.box('wood_dd', -0.17, 0.12, 0.9, 0.11, 0.14, 0.2, bev=0.012, rx=-14)
    for i in range(4):
        b.box('black', -0.2 + i % 2 * 0.06, 0.06 + i // 2 * 0.045, 1.09 - i // 2 * 0.012, 0.02, 0.012, 0.07, rx=-14)


@asset('kitchen_wall_cabinet', G, mount='wall', module=0.6)
def kitchen_wall_cabinet(b):
    z, h, dp = 1.45, 0.72, 0.33
    b.box(CAB, 0, -dp / 2, z, 0.6, dp, h, bev=0.006, edges='TB')
    fronts(b, DOOR, 0, -dp, z + 0.004, 0.592, h - 0.008, [(1, 'lr')], hm='steel', hz=0.16)
    b.box(CAB, 0, -dp / 2 - 0.012, z + h, 0.6, dp + 0.03, 0.03, bev=0.008, edges='F')


@asset('kitchen_wall_shelf', G, mount='wall', module=0.6)
def kitchen_wall_shelf(b):
    z, h, dp = 1.45, 0.72, 0.3
    zs, ch = shelf_unit(b, CAB, 0, -dp / 2, z, 0.6, dp, h, 2, back='cream')
    rng = R(31)
    for i in range(3):
        dish(b, 'plate', -0.17 + i * 0.012, -0.14, zs[0] + i * 0.016, 0.1, m=('white', 'blue_l', 'white')[i])
    for i in range(3):
        dish(b, 'mug', 0.06 + i * 0.085, -0.17, zs[0], 0.035, 0.085, m=('red', 'yellow', 'teal')[i])
    goods(b, 'jar', -0.27, 0.0, -dp + 0.005, zs[1], 0.2, ch, rng)
    goods(b, 'box', 0.02, 0.27, -dp + 0.005, zs[1], 0.2, ch, rng)


@asset('kitchen_sink_unit', G, surface=0.9, module=1.2)
def kitchen_sink_unit(b):
    W = 1.2
    _base(b, 0, W, [(1, 'oo'), (3.6, 'lrlr')], top=False)
    b.box(DOOR, 0, -CD / 2 + 0.011, 0.71, W - 0.02, 0.018, 0.14, bev=0.006, skip='k')
    # worktop ring around the bowl
    for x, y, w, dd in ((-0.47, -0.01, 0.26, CD + 0.02), (0.47, -0.01, 0.26, CD + 0.02), (0, -0.27, 0.68, 0.1), (0, 0.24, 0.68, 0.12)):
        b.box(TOP, x, y, CH, w, dd, 0.04, bev=0.01 if y < -0.2 or abs(x) > 0.4 else 0, edges='F')
    b.box(TOP, 0, CD / 2 - 0.01, CH + 0.04, W, 0.02, 0.06, bev=0.006, edges='F', skip='b')
    for sx in (-1, 1):
        basin(b, 'steel', sx * 0.17, -0.03, CH - 0.13, 0.3, 0.36, 0.17, bev=0.03, taper=1.08)
        b.cyl('char', sx * 0.17, -0.03, CH - 0.128, 0.025, 0.003, n=8)
    for x, y, w, dd in ((0, -0.225, 0.68, 0.03), (0, 0.185, 0.68, 0.07), (-0.33, -0.03, 0.02, 0.36), (0.33, -0.03, 0.02, 0.36), (0, -0.03, 0.04, 0.36)):
        b.box('steel', x, y, CH + 0.03, w, dd, 0.014, skip='b')
    b.box('steel', 0, 0.2, CH + 0.044, 0.2, 0.05, 0.016, bev=0.005)
    b.tube('chrome', [(0, 0.21, CH + 0.06), (0, 0.21, CH + 0.3), (0, 0.13, CH + 0.34), (0, 0.04, CH + 0.3), (0, 0.04, CH + 0.26)], 0.014, n=6)
    for sx in (-1, 1):
        b.cyl('chrome', sx * 0.075, 0.21, CH + 0.064, 0.016, 0.04, n=6)
        b.box('enamel_r' if sx < 0 else 'enamel_b', sx * 0.075, 0.21, CH + 0.1, 0.06, 0.016, 0.012, bev=0.004)
    bottle(b, 0.46, 0.14, CH + 0.04, 0.2, 0.035, 'green_l', cap='white', label='white')
    b.box('yellow', -0.44, 0.12, CH + 0.04, 0.1, 0.065, 0.03, bev=0.01)
    dish(b, 'plate', -0.17, -0.03, CH - 0.127, 0.1)
    dish(b, 'cup', -0.2, 0.0, CH - 0.113, 0.04, 0.07, 'blue_l')


@asset('kitchen_corner', G, surface=0.9, module=0.9)
def kitchen_corner(b):
    pent = [(-0.45, 0.45), (0.45, 0.45), (0.45, -0.45), (-0.15, -0.45), (-0.45, -0.15)]
    b.prism('char', [(p * 0.96 + 0.018, q * 0.96 + 0.018) for p, q in pent], 0, 0.1, plane='xy')
    b.prism(CAB, pent, 0.1, CH, plane='xy')
    b.prism(TOP, [(-0.45, 0.45), (0.45, 0.45), (0.45, -0.45), (-0.165, -0.45), (-0.45, -0.165)], CH, CH + 0.04, plane='xy', bev=0.008, edges='ends')
    b.box(TOP, 0, 0.44, CH + 0.04, 0.9, 0.02, 0.06, bev=0.006, edges='F', skip='b')
    b.box(TOP, 0.44, -0.01, CH + 0.04, 0.02, 0.88, 0.06, bev=0.006, edges='L', skip='b')
    k = b.mark()
    fronts(b, DOOR, 0, 0, 0.11, 0.41, CH - 0.115, [(1, 'd'), (3.6, 'l')], hm='steel', hz=0.82)
    b.rot(k, 'z', -45)
    b.move(k, -0.3 - 0.012, -0.3 - 0.012, 0)
    # worktop dressing: bread bin and jars in the dead corner
    b.box('enamel_g', 0.2, 0.22, CH + 0.04, 0.36, 0.24, 0.2, bev=0.06, edges='xT')
    b.box('char', 0.2, 0.097, CH + 0.12, 0.1, 0.008, 0.02)
    for i, m in enumerate(('red', 'yellow', 'teal')):
        can(b, -0.22 + i * 0.1, 0.33, CH + 0.04, 0.042, 0.13 + i * 0.03, m, band='white', lid='steel')


@asset('kitchen_island', G, surface=0.92)
def kitchen_island(b):
    W, D = 1.6, 0.7
    b.box('char', 0, 0, 0, W - 0.1, D - 0.12, 0.1, skip='tb')
    b.box(CAB, 0, 0, 0.1, W, D, 0.76, bev=0.006, edges='z')
    fronts(b, DOOR, 0, -D / 2, 0.11, W - 0.02, 0.745, [(1, 'dddd'), (3.4, 'lrlr')], hm='steel', hz=0.82)
    for i in range(3):
        b.box('wood_d', (i - 1) * 0.5, D / 2 + 0.006, 0.16, 0.42, 0.012, 0.64, bev=0.006, edges='K', skip='f')
    b.box('wood_l', 0, 0.1, 0.86, W + 0.1, D + 0.3, 0.06, bev=0.014)
    dish(b, 'bowl', -0.4, 0.05, 0.92, 0.15, 0.08, 'white', n=12)
    for i, (dx, dy, m) in enumerate(((-0.45, 0.03, 'red'), (-0.36, 0.08, 'orange'), (-0.4, 0, 'yellow'), (-0.38, 0.03, 'green_l'))):
        b.ball(m, dx, dy, 0.985 + (0.03 if i == 3 else 0), 0.04, n=7, rings=4)
    b.box('wood_ll', 0.35, 0, 0.92, 0.34, 0.24, 0.02, bev=0.006)
    b.box('tan', 0.33, 0, 0.94, 0.18, 0.09, 0.07, bev=0.03)
    b.box('steel', 0.52, 0.01, 0.94, 0.02, 0.16, 0.003, rz=20)
    b.box('black', 0.5, -0.09, 0.94, 0.022, 0.08, 0.012, rz=20)


@asset('stove_oven', G, surface=0.92)
def stove_oven(b):
    W, D, E = 0.76, 0.64, 'enamel_y'
    b.box('char', 0, 0.03, 0, W - 0.04, D - 0.08, 0.08, skip='tb')
    b.box(E, 0, 0, 0.08, W, D, 0.82, bev=0.012, edges='z')
    b.box('char', 0, -0.005, 0.9, W, D + 0.01, 0.02, bev=0.006)
    for sx in (-1, 1):
        for sy, r in ((-1, 0.1), (1, 0.08)):
            x, y = sx * 0.19, sy * 0.15 - 0.03
            b.lathe('grey_l', x, y, 0.92, [(r + 0.025, 0), (r + 0.02, 0.006), (r + 0.004, 0.003)], n=12, caps=(False, False))
            for rr in (r, r * 0.62, r * 0.25):
                b.lathe('black', x, y, 0.922, [(rr, 0), (rr, 0.01), (rr - r * 0.2, 0.01), (rr - r * 0.2, 0)], n=12, caps=(False, False))
    b.box(E, 0, D / 2 - 0.05, 0.92, W, 0.1, 0.18, bev=0.014, edges='TF')
    b.box('char', 0, D / 2 - 0.1 - 0.003, 0.95, W - 0.06, 0.006, 0.12, skip='k')
    for i in range(4):
        b.cyl('silver', -0.27 + i * 0.1 + (0.14 if i > 1 else 0), D / 2 - 0.106, 1.01, 0.026, 0.03, n=8, axis='y', rz=180)
    disc_decal(b, 'clock', 0, D / 2 - 0.108, 1.01, 0.042, n=10)
    b.box(E, 0, -D / 2 - 0.012, 0.28, W - 0.03, 0.024, 0.56, bev=0.008, skip='k')        # oven door
    b.box('glass', 0, -D / 2 - 0.026, 0.42, W - 0.24, 0.006, 0.26, bev=0.003, skip='k')
    pull(b, 'chrome', 0, -D / 2 - 0.024, 0.77, L=W - 0.18, out=0.045, r=0.011)
    b.box(E, 0, -D / 2 - 0.01, 0.1, W - 0.03, 0.02, 0.16, bev=0.008, skip='k')            # warming drawer
    pull(b, 'chrome', 0, -D / 2 - 0.02, 0.2, L=0.3, out=0.035, r=0.008)
    # pot and pan
    b.lathe('enamel_r', -0.19, -0.18, 0.935, [(0.1, 0), (0.105, 0.11), (0.095, 0.11), (0.09, 0.012), (0, 0.012)], n=12)
    b.lathe('enamel_r', -0.19, -0.18, 1.045, [(0.105, 0), (0.06, 0.02), (0, 0.025)], n=12)
    b.ball('black', -0.19, -0.18, 1.08, 0.018, n=6, rings=3)
    for sx in (-1, 1):
        b.box('black', -0.19 + sx * 0.12, -0.18, 1.02, 0.04, 0.05, 0.012, bev=0.004)
    b.lathe('iron', 0.19, 0.12, 0.935, [(0.085, 0), (0.1, 0.035), (0.094, 0.035), (0.08, 0.008), (0, 0.008)], n=12)
    b.box('black', 0.34, 0.03, 0.955, 0.2, 0.025, 0.014, rz=-30, bev=0.004)


@asset('fridge_80s', G)
def fridge_80s(b):
    W, D, H, E = 0.8, 0.7, 1.76, 'enamel_y'
    b.box('char', 0, 0.03, 0, W - 0.04, D - 0.1, 0.09, skip='tb')
    b.box(E, 0, 0.03, 0.09, W, D - 0.06, H - 0.09, bev=0.014, edges='zT')
    b.box(E, 0, -D / 2 + 0.03, 0.11, W - 0.01, 0.06, 1.07, bev=0.02, edges='F', skip='k')
    b.box(E, 0, -D / 2 + 0.03, 1.2, W - 0.01, 0.06, H - 1.21, bev=0.02, edges='F', skip='k')
    b.box('black', 0, -D / 2 + 0.065, 1.18, W - 0.02, 0.01, 0.02, skip='fk')
    for z, L in ((0.95, 0.4), (1.36, 0.22)):
        b.box('wood_d', -W / 2 + 0.06, -D / 2 - 0.025, z - L / 2, 0.035, 0.03, L, bev=0.008)
        for dz in (-L / 2, L / 2 - 0.03):
            b.box('chrome', -W / 2 + 0.06, -D / 2 - 0.006, z + dz, 0.04, 0.04, 0.03, bev=0.005)
    b.box('char', 0, -D / 2 + 0.05, 0.005, W - 0.04, 0.02, 0.09)
    for i in range(5):
        b.box('grey', 0, -D / 2 + 0.038, 0.018 + i * 0.016, W - 0.1, 0.006, 0.007)
    b.decal('note1', 0.12, -D / 2 - 0.004, 0.86, 0.13, 0.17, rz=0, ry=5)
    b.decal('note3', -0.08, -D / 2 - 0.004, 0.74, 0.12, 0.15, ry=-4)
    b.decal('calendar', 0.14, -D / 2 - 0.004, 1.44, 0.17, 0.22)
    for x, z, m in ((0.12, 0.94, 'red'), (-0.08, 0.81, 'yellow'), (-0.2, 1.5, 'blue'), (0.3, 0.6, 'green')):
        b.cyl(m, x, -D / 2 - 0.004, z, 0.016, 0.008, n=6, axis='y', rz=180)
    b.box('tan', 0.15, 0.08, H, 0.36, 0.3, 0.2, bev=0.01)        # cereal box and basket on top
    b.box('red', -0.2, 0.1, H, 0.2, 0.08, 0.28, skip='b')
    b.decal('prod3', -0.2, 0.057, H + 0.14, 0.17, 0.24)


@asset('microwave', G, mount='top')
def microwave(b):
    W, D, H = 0.52, 0.38, 0.3
    b.box('wood_d', 0, 0, 0.012, W, D, H - 0.012, bev=0.01)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.cyl('black', sx * 0.2, sy * 0.13, 0, 0.02, 0.014, n=6)
    b.box('char', 0, -D / 2 - 0.006, 0.02, W - 0.016, 0.014, H - 0.036, bev=0.005, skip='k')
    b.box('glass', -0.075, -D / 2 - 0.016, 0.05, 0.3, 0.006, H - 0.1, bev=0.003, skip='k')
    for i in range(6):
        b.box('grey_d', -0.075, -D / 2 - 0.02, 0.07 + i * 0.03, 0.27, 0.003, 0.004, skip='k')
    pull(b, 'chrome', 0.1, -D / 2 - 0.014, 0.15, L=0.18, vert=True, r=0.008, out=0.03)
    b.decal('keypad', 0.185, -D / 2 - 0.0165, 0.125, 0.1, 0.13)
    b.box('glow', 0.185, -D / 2 - 0.014, 0.215, 0.1, 0.004, 0.035, skip='k')
    b.cyl('silver', 0.185, -D / 2 - 0.013, 0.045, 0.02, 0.02, n=8, axis='y', rz=180)


@asset('toaster', G, mount='top')
def toaster(b):
    b.box('black', 0, 0, 0, 0.27, 0.16, 0.02, bev=0.006)
    b.box('chrome', 0, 0, 0.02, 0.26, 0.15, 0.16, bev=0.03, edges='yT')
    for sy in (-1, 1):
        b.box('black', 0, sy * 0.035, 0.178, 0.18, 0.028, 0.004, skip='b')
        b.box('#c98f4e', 0.0, sy * 0.035, 0.13, 0.13, 0.018, 0.09, bev=0.02, edges='y')
    b.box('black', 0.135, 0, 0.03, 0.012, 0.11, 0.13, bev=0.004)
    b.box('black', 0.15, 0, 0.1, 0.03, 0.04, 0.016, bev=0.005)
    b.cyl('red', 0.141, 0.035, 0.05, 0.012, 0.01, n=6, axis='x')


@asset('kettle', G, mount='top')
def kettle(b):
    b.lathe('enamel_r', 0, 0, 0, [(0.1, 0), (0.115, 0.02), (0.11, 0.1), (0.07, 0.16), (0.05, 0.17)], n=12)
    b.lathe('black', 0, 0, 0.17, [(0.052, 0), (0.045, 0.012), (0.012, 0.02), (0.016, 0.04), (0, 0.045)], n=8)
    b.tube('enamel_r', [(0.09, 0, 0.09), (0.15, 0, 0.13), (0.18, 0, 0.17)], 0.017, n=6)
    b.tube('black', [(-0.07, 0, 0.14), (-0.09, 0, 0.24), (0, 0, 0.275), (0.08, 0, 0.24), (0.07, 0, 0.15)], 0.011, n=5)


@asset('dish_rack', G, mount='top')
def dish_rack(b):
    W, D = 0.44, 0.32
    b.box('grey_l', 0, 0, 0, W + 0.04, D + 0.04, 0.012, bev=0.004)
    for z in (0.03, 0.11):
        b.tube('steel', [(-W / 2, -D / 2, z), (W / 2, -D / 2, z), (W / 2, D / 2, z), (-W / 2, D / 2, z)], 0.005, n=4, closed=True, caps=False)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.rod('steel', (sx * W / 2, sy * D / 2, 0.01), (sx * W / 2, sy * D / 2, 0.11), 0.005, n=4)
    for i in range(8):
        x = -W / 2 + 0.04 + i * 0.035
        b.rod('steel', (x, -D / 2, 0.03), (x, D / 2, 0.03), 0.003, n=3)
    for i in range(5):
        k = b.mark()
        dish(b, 'plate', 0, 0, 0, 0.1, m=('white', 'blue_l', 'white', 'cream', 'white')[i])
        b.rot(k, 'y', 80)
        b.move(k, -W / 2 + 0.05 + i * 0.035, 0.02, 0.135)
    dish(b, 'mug', 0.13, 0.07, 0.035, 0.04, 0.09, 'yellow')
    dish(b, 'mug', 0.14, -0.06, 0.035, 0.04, 0.09, 'teal')
    b.cyl('grey_l', 0.05, -0.1, 0.03, 0.035, 0.1, n=8, caps=(True, False))
    for i, a in enumerate((-10, 6, 14)):
        b.box('steel', 0.04 + i * 0.012, -0.1, 0.06, 0.01, 0.003, 0.15, ry=a)


def _table(b, W, D, H=0.75, kind='sq', t=0.07):
    b.box('wood', 0, 0, H - 0.04, W, D, 0.04, bev=0.014)
    b.box('wood', 0, 0, H - 0.13, W - 0.14, D - 0.14, 0.09, bev=0.004, edges='z', skip='tb')
    legs(b, 'wood', 0, 0, W - 0.1, D - 0.1, H - 0.04, t=t, taper=0.62, kind=kind)
    return {'surface': H}


@asset('dining_table_4', G)
def dining_table_4(b):
    return _table(b, 1.25, 0.85)


@asset('dining_table_6', G)
def dining_table_6(b):
    r = _table(b, 1.9, 0.95, kind='turn', t=0.09)
    b.box('wood_d', 0, 0, 0.705, 1.7, 0.75, 0.006, skip='tb')
    return r


def _place(b, x, y, rz, wine=True):
    k = b.mark()
    b.box('#b9503c', 0, 0, 0, 0.4, 0.28, 0.004, bev=0.0, skip='b')
    dish(b, 'plate', 0, 0, 0.004, 0.115)
    dish(b, 'plate', 0, 0, 0.018, 0.08, m='blue_l')
    b.box('steel', -0.155, 0, 0.004, 0.016, 0.17, 0.004, bev=0.0, skip='b')
    b.box('steel', 0.15, 0, 0.004, 0.014, 0.18, 0.004, skip='b')
    b.box('steel', 0.175, -0.01, 0.004, 0.02, 0.15, 0.004, taper=(1, 1), skip='b')
    dish(b, 'wine' if wine else 'cup', 0.14, 0.15, 0.0, 0.032 if wine else 0.035, 0.15 if wine else 0.1, 'clear')
    b.box('white', -0.16, 0.13, 0.0, 0.1, 0.1, 0.012, rz=20, bev=0.003)
    b.rot(k, 'z', rz)
    b.move(k, x, y, 0)


def _centre(b, x=0.0):
    b.lathe('blue_l', x, 0, 0, [(0.045, 0), (0.07, 0.06), (0.035, 0.15), (0.045, 0.19), (0.035, 0.19), (0, 0.15)], n=10)
    for i, m in enumerate(('red', 'yellow', 'pink', 'white', 'orange')):
        a = math.radians(i * 72)
        top = (x + math.cos(a) * 0.07, math.sin(a) * 0.07, 0.3 + i % 2 * 0.04)
        b.rod('leaf_d', (x, 0, 0.16), top, 0.004, n=3)
        b.ball(m, top[0], top[1], top[2], 0.03, n=6, rings=3, sz=0.7)
    for i in range(3):
        leaf(b, 'leaf', x, 0, 0.17, 0.05, 0.14, 50, i * 120 + 40)


@asset('dining_setting_4', G, mount='top')
def dining_setting_4(b):
    for sx in (-1, 1):
        _place(b, sx * 0.3, -0.26, 0)
        _place(b, sx * 0.3, 0.26, 180)
    _centre(b)
    for dx, m in ((0.14, 'white'), (0.19, 'char')):
        b.cyl('clear', dx, 0.03, 0, 0.016, 0.05, n=6)
        b.cyl(m, dx, 0.03, 0.05, 0.017, 0.012, n=6)


@asset('dining_setting_6', G, mount='top')
def dining_setting_6(b):
    for i in (-1, 0, 1):
        _place(b, i * 0.6, -0.31, 0)
        _place(b, i * 0.6, 0.31, 180)
    _centre(b, -0.3)
    b.lathe('white', 0.3, 0, 0, [(0.07, 0), (0.17, 0.05), (0.16, 0.05), (0.07, 0.01), (0, 0.01)], n=12)
    b.ball('#c98f4e', 0.3, 0, 0.055, 0.12, n=10, rings=4, sz=0.55)
    b.box('white', 0.0, 0.0, 0, 0.34, 0.1, 0.003, skip='b')
    for dx in (-0.1, 0.1):
        b.lathe('brass', dx, 0, 0.003, [(0.04, 0), (0.012, 0.02), (0.012, 0.1), (0.022, 0.11)], n=8)
        b.cyl('cream', dx, 0, 0.113, 0.011, 0.14, n=6)


@asset('dining_chair', G)
def dining_chair(b):
    return chair_frame(b, 'wood', seat='fabric')


@asset('bar_stool', G)
def bar_stool(b):
    H = 0.76
    for i in range(4):
        a = math.radians(45 + i * 90)
        c, s = math.cos(a), math.sin(a)
        b.rod('wood', (c * 0.21, s * 0.21, 0), (c * 0.14, s * 0.14, H - 0.06), 0.02, n=6)
    for z, r in ((0.24, 0.185), (0.5, 0.163)):
        b.lathe('chrome' if z < 0.3 else 'wood', 0, 0, z, [(r, 0), (r + 0.012, 0.006), (r + 0.012, 0.018), (r, 0.024), (r - 0.012, 0.018), (r - 0.012, 0.006), (r, 0)], n=4, caps=(False, False), phase=45)
    b.cyl('wood', 0, 0, H - 0.07, 0.185, 0.03, n=12, bev=0.006)
    b.lathe('fabric', 0, 0, H - 0.04, [(0.18, 0), (0.195, 0.015), (0.195, 0.04), (0.16, 0.06), (0, 0.065)], n=12)
    return {'seat': [[0, 0, H + 0.04]]}


@asset('high_chair', G)
def high_chair(b):
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.rod('wood_l', (sx * 0.27, sy * 0.27, 0), (sx * 0.17, sy * 0.17, 0.56), 0.018, n=6)
        b.rod('wood_l', (sx * 0.245, -0.245, 0.14), (sx * 0.245, 0.245, 0.14), 0.012, n=5)
        b.box('wood_l', sx * 0.19, 0.0, 0.58, 0.03, 0.34, 0.2, bev=0.008)
    b.rod('wood_l', (-0.235, -0.235, 0.2), (0.235, -0.235, 0.2), 0.012, n=5)
    b.box('wood_l', 0, -0.26, 0.19, 0.44, 0.1, 0.02, bev=0.006)
    b.box('wood_l', 0, 0, 0.55, 0.38, 0.36, 0.035, bev=0.01)
    b.soft('yellow', 0, 0, 0.585, 0.32, 0.3, 0.03, r=0.012)
    b.box('wood_l', 0, 0.17, 0.58, 0.38, 0.03, 0.42, bev=0.012, rx=-6)
    b.soft('yellow', 0, 0.15, 0.66, 0.3, 0.03, 0.3, r=0.012, rx=-6)
    b.box('white', 0, -0.27, 0.77, 0.5, 0.26, 0.02, bev=0.008)
    for x, y, w, dd in ((0, -0.39, 0.5, 0.016), (-0.242, -0.27, 0.016, 0.26), (0.242, -0.27, 0.016, 0.26)):
        b.box('white', x, y, 0.785, w, dd, 0.02, bev=0.004)
    dish(b, 'bowl', -0.08, -0.27, 0.79, 0.06, 0.035, 'blue_l')
    b.box('red', 0.1, -0.25, 0.79, 0.02, 0.1, 0.008, rz=30)
    return {'seat': [[0, 0.02, 0.63]]}


@asset('trash_bin_kitchen', G)
def trash_bin_kitchen(b):
    b.lathe('enamel', 0, 0, 0, [(0.15, 0), (0.155, 0.02), (0.17, 0.52), (0.175, 0.53)], n=14)
    b.lathe('char', 0, 0, 0, [(0.158, 0), (0.158, 0.03)], n=14, caps=(False, False))
    b.lathe('enamel', 0, 0, 0.53, [(0.18, 0), (0.18, 0.02), (0.14, 0.06), (0, 0.075)], n=14)
    b.tube('chrome', [(-0.05, 0, 0.6), (-0.05, 0, 0.63), (0.05, 0, 0.63), (0.05, 0, 0.6)], 0.007, n=4)
    b.box('black', 0, -0.19, 0.005, 0.1, 0.09, 0.015, bev=0.005, rx=8)
    b.box('chrome', 0, 0.175, 0.5, 0.08, 0.02, 0.05, bev=0.004)

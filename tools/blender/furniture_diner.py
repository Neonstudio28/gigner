"""Furniture family: diner assets."""
import math
from furniture_kit import *

G = 'diner'


RED = 'paint__fabric:#b8332b'


def _napkins(b, x, y, z):
    b.box('chrome', x, y, z, 0.1, 0.12, 0.13, bev=0.008)
    b.box('white', x, y, z + 0.03, 0.104, 0.08, 0.08)
    b.cyl('white', x - 0.1, y - 0.02, z, 0.02, 0.07, n=6)                                 # salt and pepper
    b.cyl('chrome', x - 0.1, y - 0.02, z + 0.07, 0.021, 0.012, n=6)
    b.cyl('#3a2416', x - 0.1, y + 0.04, z, 0.02, 0.07, n=6)
    b.cyl('chrome', x - 0.1, y + 0.04, z + 0.07, 0.021, 0.012, n=6)
    b.lathe('red', x + 0.1, y - 0.02, z, [(0.026, 0), (0.028, 0.1), (0.012, 0.13), (0.008, 0.17)], n=6)      # ketchup, mustard
    b.lathe('yellow', x + 0.1, y + 0.045, z, [(0.026, 0), (0.028, 0.1), (0.012, 0.13), (0.008, 0.17)], n=6)
    b.box('white', x, y + 0.1, z, 0.05, 0.004, 0.16)                                      # menu card in a holder
    b.decal('menu', x, y + 0.097, z + 0.09, 0.11, 0.13, sub=(0, 0, 0.33, 1))
    b.box('chrome', x, y + 0.1, z, 0.12, 0.03, 0.012)


@asset('napkin_set', G, mount='top')
def napkin_set(b):
    _napkins(b, 0, 0, 0)


def _booth_bench(b, y, face, W=1.2):
    """Upholstered bench whose seat faces `face` (+1 = towards +Y)."""
    k = b.mark()
    b.box('char', 0, 0.02, 0, W - 0.04, 0.5, 0.1, skip='tb')
    b.box('enamel', 0, 0, 0.1, W, 0.56, 0.2, bev=0.01, edges='z')
    b.soft(RED, 0, -0.03, 0.3, W - 0.02, 0.5, 0.14, r=0.04)
    b.box('enamel', 0, 0.25, 0.3, W, 0.08, 0.86, bev=0.01)
    for i in range(3):
        b.soft(RED if i != 1 else 'paint__fabric2:#ecebe6', (i - 1) * (W - 0.04) / 3, 0.17, 0.44, (W - 0.04) / 3 - 0.01, 0.1, 0.66, r=0.035)
    b.box('chrome', 0, 0.25, 1.16, W + 0.01, 0.09, 0.02, bev=0.006)
    if face > 0:
        b.rot(k, 'z', 180)
    b.move(k, 0, y, 0)


def _diner_table(b, W, D, H=0.75, edge='chrome', top='cream'):
    b.lathe('chrome', 0, 0, 0, [(0.22, 0), (0.22, 0.02), (0.06, 0.05), (0.04, 0.08), (0.04, H - 0.06), (0.1, H - 0.04)], n=10)
    b.box(edge, 0, 0, H - 0.04, W, D, 0.035, bev=0.012, edges='z')
    b.box(top, 0, 0, H - 0.004, W - 0.02, D - 0.02, 0.006, bev=0.006, edges='z', skip='b')


@asset('diner_booth', G, surface=0.75)
def diner_booth(b):
    """Two facing benches (seats along Y) with a table between; the aisle is at -X."""
    k = b.mark()
    _booth_bench(b, -0.72, +1)
    _booth_bench(b, 0.72, -1)
    _diner_table(b, 1.1, 0.7)
    _napkins(b, 0.38, 0, 0.752)
    for sy in (-1, 1):
        dish(b, 'plate', -0.1, sy * 0.19, 0.752, 0.11, 0.02, 'white')
        b.box('#c98a4b', -0.1, sy * 0.19, 0.765, 0.1, 0.1, 0.035, bev=0.012)               # burger
        b.box('green_l', -0.1, sy * 0.19, 0.782, 0.11, 0.11, 0.006)
        b.lathe('clear', 0.14, sy * 0.24, 0.752, [(0.028, 0), (0.036, 0.14)], n=7, caps=(True, False))
        b.cyl(('#5b2a1a', 'pink')[sy > 0], 0.14, sy * 0.24, 0.756, 0.03, 0.1, n=7)
        b.box('red', 0.15, sy * 0.24, 0.8, 0.006, 0.006, 0.14, ry=8)
        b.box('white', -0.3, sy * 0.2, 0.752, 0.1, 0.14, 0.004, rz=10, skip='b')
        b.box('steel', -0.3, sy * 0.2, 0.757, 0.012, 0.13, 0.003, rz=10, skip='b')
    return {'seat': [[-0.28, -0.64, 0.48], [0.28, -0.64, 0.48], [-0.28, 0.64, 0.48], [0.28, 0.64, 0.48]], 'seat_facing': 'table'}


@asset('diner_table_2', G, surface=0.75)
def diner_table_2(b):
    _diner_table(b, 0.7, 0.7)


@asset('diner_stool', G)
def diner_stool(b):
    b.lathe('chrome', 0, 0, 0, [(0.2, 0), (0.2, 0.015), (0.12, 0.04), (0.045, 0.07), (0.04, 0.5), (0.06, 0.52), (0.06, 0.56)], n=12)
    b.tube('chrome', [(0.15 * math.cos(i * math.tau / 10), 0.15 * math.sin(i * math.tau / 10), 0.24) for i in range(10)], 0.012, n=4, closed=True)
    for i in range(3):
        a = i * math.tau / 3
        b.rod('chrome', (0.03 * math.cos(a), 0.03 * math.sin(a), 0.24), (0.15 * math.cos(a), 0.15 * math.sin(a), 0.24), 0.008, n=4)
    b.cyl('chrome', 0, 0, 0.56, 0.18, 0.05, n=12)
    b.lathe(RED, 0, 0, 0.6, [(0.17, 0), (0.185, 0.03), (0.17, 0.07), (0.1, 0.085), (0, 0.085)], n=12, caps=(False, False))
    return {'seat': [[0, 0, 0.7]], 'spin': True}


@asset('diner_counter', G, surface=1.05, length=3.0, stand=[0, 0.7, 0])
def diner_counter(b):
    """3 m lunch counter with a pie case; customers sit on -Y, staff stand at `stand`."""
    W, D, H = 3.0, 0.7, 1.05
    b.box('char', 0, 0.05, 0, W - 0.02, D - 0.2, 0.12, skip='tb')
    b.box('enamel', 0, 0.04, 0.12, W, D - 0.16, H - 0.17, bev=0.01, edges='z')
    for i in range(12):                                                                 # ribbed front
        b.box('chrome', -W / 2 + 0.125 + i * 0.25, -D / 2 + 0.115, 0.14, 0.03, 0.012, H - 0.22, skip='k')
    for z, m in ((0.3, RED), (0.72, RED)):
        b.box(m, 0, -D / 2 + 0.117, z, W - 0.01, 0.006, 0.07, skip='k')
    b.box('chrome', 0, 0, H - 0.05, W + 0.04, D, 0.045, bev=0.014, edges='z')
    b.box('paint__counter:#d9534a', 0, 0, H - 0.006, W + 0.02, D - 0.02, 0.008, bev=0.006, edges='z', skip='b')
    b.cyl('chrome', -W / 2 + 0.05, -D / 2 + 0.02, 0.22, 0.02, W - 0.1, n=8, axis='x')        # foot rail
    for i in range(4):
        x = -W / 2 + 0.2 + i * (W - 0.4) / 3
        b.tube('chrome', [(x, -D / 2 + 0.12, 0.3), (x, -D / 2 + 0.02, 0.25), (x, -D / 2 + 0.02, 0.0)], 0.012, n=5)
    for i in range(3):
        b.box('grey_l', -1.0 + i * 1.0, D / 2 - 0.118, 0.2, 0.9, 0.006, 0.55, skip='f')
    z = H + 0.002
    # pie case
    x = 0.95
    b.box('chrome', x, 0.05, z, 0.7, 0.44, 0.03, bev=0.008)
    b.box('clear', x, 0.05, z + 0.03, 0.66, 0.4, 0.4)
    for i in range(2):
        for j in range(2):
            px = x - 0.16 + j * 0.32
            pz = z + 0.038 + i * 0.2
            b.cyl('steel', px, 0.05, pz, 0.11, 0.015, n=10, r2=0.13)
            if (i + j) % 2:
                b.lathe(('#c98a4b', '#e9d98a')[i], px, 0.05, pz + 0.015, [(0.125, 0), (0.11, 0.035), (0, 0.045)], n=10, caps=(False, False))
            else:
                b.cyl('white', px, 0.05, pz + 0.015, 0.11, 0.07, n=10, arc=280)
                b.cyl(('pink', '#5b3a25')[i], px, 0.05, pz + 0.085, 0.112, 0.012, n=10, arc=280)
    b.box('chrome', x, 0.05, z + 0.43, 0.7, 0.44, 0.03, bev=0.008)
    # settings along the counter
    _napkins(b, -0.2, 0.1, z)
    _napkins(b, -1.25, 0.1, z)
    for i, px in enumerate((-0.85, 0.25)):
        dish(b, 'plate', px, -0.15, z, 0.11, 0.02, 'white')
        dish(b, 'mug', px + 0.2, -0.1, z, 0.036, 0.08, 'white')
        b.cyl('#3a2416', px + 0.2, -0.1, z + 0.066, 0.03, 0.004, n=8)
        b.cyl(('#e9c04a', '#c98a4b')[i], px, -0.15, z + 0.016, 0.07, 0.02, n=8)
    b.box('char', 0.3, 0.2, z, 0.3, 0.18, 0.05, bev=0.01)                                 # order pad / till tray
    b.box('white', 0.3, 0.2, z + 0.05, 0.1, 0.14, 0.01)
    return {'stools': [[-1.2, -0.62, 0], [-0.6, -0.62, 0], [0, -0.62, 0], [0.6, -0.62, 0], [1.2, -0.62, 0]]}


@asset('kitchen_grill_line', G, surface=0.92, length=2.4)
def kitchen_grill_line(b):
    """Commercial cook line (fryer, flat-top grill, burners) under an extraction hood. Back at y = +0.4."""
    W, D, H = 2.4, 0.8, 0.92
    b.box('steel', 0, 0, 0.14, W, D, H - 0.14, bev=0.008, edges='z')
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.cyl('steel_d', sx * (W / 2 - 0.08), sy * (D / 2 - 0.08), 0, 0.03, 0.14, n=6)
    for sx in (-0.4, 0.4):
        b.cyl('steel_d', sx, -D / 2 + 0.08, 0, 0.03, 0.14, n=6)
    b.box('steel', 0, D / 2 - 0.02, H, W, 0.04, 0.3)
    # fryer (left)
    for i in range(2):
        x = -1.0 + i * 0.32
        basin(b, 'steel_d', x, 0, H - 0.14, 0.26, 0.5, 0.14, bev=0.0, taper=1.0)
        b.box('#b9862c', x, 0, H - 0.05, 0.25, 0.49, 0.002, skip='b')
        b.tube('steel', [(x - 0.09, 0.2, H - 0.02), (x - 0.09, 0.2, H + 0.02), (x + 0.09, 0.2, H + 0.02), (x + 0.09, 0.2, H - 0.02)], 0.006, n=4)
        b.tube('black', [(x, 0.2, H + 0.02), (x, 0.05, H + 0.12), (x, -0.1, H + 0.14)], 0.01, n=4)
    # flat-top grill (centre)
    b.box('iron', -0.05, 0.02, H, 0.9, 0.6, 0.03, bev=0.006)
    b.box('steel', -0.05, 0.32, H + 0.03, 0.9, 0.02, 0.08)
    for sx in (-1, 1):
        b.box('steel', -0.05 + sx * 0.45, 0.02, H + 0.03, 0.02, 0.6, 0.06, taper=(1, 0.6), shear=(0, 0.1))
    for i, (px, py) in enumerate(((-0.3, 0.1), (-0.12, 0.1), (-0.3, -0.1), (0.1, 0.05))):
        b.cyl('#6b3a22', px, py, H + 0.03, 0.05, 0.016, n=8)                              # burger patties
    for i in range(3):
        b.box('#c96a4a', 0.2 + i * 0.05, -0.12, H + 0.03, 0.035, 0.18, 0.008, rz=4 * i)    # bacon
    b.box('steel', 0.3, 0.16, H + 0.03, 0.09, 0.12, 0.004, rz=30)                          # spatula
    b.box('black', 0.37, 0.05, H + 0.035, 0.025, 0.14, 0.02, rz=30)
    # burners (right)
    for i in range(4):
        x, y = 0.7 + (i % 2) * 0.34, -0.17 + (i // 2) * 0.34
        b.cyl('black', x, y, H, 0.1, 0.012, n=8)
        b.box('iron', x, y, H + 0.012, 0.26, 0.02, 0.02)
        b.box('iron', x, y, H + 0.012, 0.02, 0.26, 0.02)
    b.lathe('steel', 0.7, 0.17, H + 0.034, [(0.11, 0), (0.12, 0.16), (0.125, 0.16)], n=10, caps=(True, False))   # stock pot
    b.cyl('#b8552b', 0.7, 0.17, H + 0.15, 0.115, 0.004, n=10)
    b.lathe('iron', 1.04, -0.17, H + 0.034, [(0.1, 0), (0.13, 0.04), (0.135, 0.04)], n=10, caps=(True, False))  # frying pan
    b.box('black', 1.04, -0.36, H + 0.06, 0.03, 0.2, 0.02)
    # front: knobs, oven doors
    for i in range(10):
        b.cyl('black' if i % 3 else 'red', -1.08 + i * 0.24, -D / 2, H - 0.07, 0.022, 0.03, n=6, axis='y', rz=180)
    b.box('steel_d', 0, -D / 2 - 0.004, H - 0.12, W, 0.008, 0.1, skip='k')
    fronts(b, 'steel', 0, -D / 2, 0.16, W - 0.02, H - 0.3, [(1, 'DDD')], hm='chrome', style='flat', pull_kind='bar')
    b.cyl('chrome', -W / 2 + 0.06, -D / 2 - 0.05, H - 0.18, 0.012, W - 0.12, n=5, axis='x')
    # hood
    hz = 1.95
    b.box('steel', 0, 0.05, hz, W + 0.1, D - 0.1, 0.5, bev=0.01, taper=(1, 1), skip='b')
    b.prism('steel', [(-D / 2 - 0.1, hz - 0.12), (D / 2, hz - 0.12), (D / 2, hz), (-D / 2 + 0.05, hz)], -W / 2 - 0.05, W / 2 + 0.05, plane='yz')
    for i in range(6):
        b.box('steel_d', -1.0 + i * 0.4, -0.05, hz - 0.124, 0.34, 0.5, 0.004, skip='t')
    b.box('panel', 0, 0.28, hz - 0.126, 1.2, 0.1, 0.006, skip='t')
    b.box('steel', 0, D / 2 - 0.02, H + 0.3, W, 0.02, hz - H - 0.42, skip='k')              # splash back
    b.box('steel', 0, D / 2 - 0.1, 1.5, W - 0.2, 0.16, 0.02)                               # shelf with tubs
    for i in range(5):
        b.box(('white', 'red', 'steel', 'yellow', 'white')[i], -0.9 + i * 0.3, D / 2 - 0.1, 1.52, 0.16, 0.12, 0.12, bev=0.008)


@asset('pass_window_shelf', G, mount='wall', length=1.6, surface=1.1)
def pass_window_shelf(b):
    """Kitchen pass: shelf at 1.1 m with a heat-lamp rail, order wheel and bell. Sits in a 1.6 m wall opening."""
    W, z = 1.6, 1.1
    b.box('steel', 0, 0, z - 0.04, W, 0.4, 0.04, bev=0.008)
    for sx in (-1, 1):
        b.prism('steel_d', [(0.02, z - 0.04), (-0.18, z - 0.04), (0.02, z - 0.24)], sx * (W / 2 - 0.1) - 0.01, sx * (W / 2 - 0.1) + 0.01, plane='yz')
        b.box('steel', sx * (W / 2 - 0.03), 0, z, 0.03, 0.03, 0.5)
    b.box('steel', 0, 0, z + 0.5, W, 0.2, 0.04, bev=0.008)
    for i in range(3):
        b.box('light__heat:#ff9a4a', (i - 1) * 0.45, 0, z + 0.49, 0.3, 0.1, 0.012, skip='t')
    for i in range(5):                                                                  # order tickets on the rail
        b.box('white', -0.5 + i * 0.22, -0.1, z + 0.36, 0.08, 0.004, 0.14, rx=4)
        b.box('yellow' if i % 2 else 'pink', -0.5 + i * 0.22, -0.103, z + 0.44, 0.08, 0.003, 0.03, rx=4)
    b.lathe('chrome', 0.6, -0.1, z, [(0.05, 0), (0.05, 0.008), (0.045, 0.03), (0.02, 0.045), (0, 0.05)], n=10)
    b.cyl('chrome', 0.6, -0.1, z + 0.05, 0.008, 0.012, n=5)
    for i, x in enumerate((-0.4, 0.05)):
        dish(b, 'plate', x, -0.02, z, 0.12, 0.02, 'white')
        b.box(('#c98a4b', '#e9c04a')[i], x, -0.02, z + 0.014, 0.1, 0.1, 0.04, bev=0.012)
        b.box('#e3b83a', x + 0.06, -0.06, z + 0.014, 0.06, 0.05, 0.02, bev=0.004)

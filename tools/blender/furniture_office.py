"""Furniture family: office assets."""
import math
from furniture_kit import *

G = 'office'


@asset('desk_office', G, surface=0.76)
def desk_office(b):
    W, D, H = 1.5, 0.75, 0.76
    b.box('wood', 0, 0, H - 0.04, W, D, 0.04, bev=0.012)
    for sx in (-1, 1):
        b.box('wood', sx * (W / 2 - 0.24), 0, 0.08, 0.42, D - 0.08, H - 0.12, bev=0.006, edges='z')
        b.box('wood_dd', sx * (W / 2 - 0.24), 0, 0, 0.38, D - 0.14, 0.08, skip='tb')
        fronts(b, 'wood_d', sx * (W / 2 - 0.24), -D / 2 + 0.04, 0.09, 0.4, H - 0.14, [(1, 'd'), (1, 'd'), (1.7, 'd')] if sx < 0 else [(1, 'd'), (2.7, 'l')], hm='brass')
        b.box('wood_d', sx * (W / 2 - 0.24), D / 2 - 0.036, 0.14, 0.34, 0.008, 0.5, bev=0.005, edges='K', skip='f')
    b.box('wood', 0, D / 2 - 0.06, 0.3, W - 0.9, 0.02, 0.42)
    drawer(b, 'wood_d', 0, -D / 2 + 0.04, 0.63, W - 0.92, 0.085, kind='pull')


@asset('desk_setup', G, mount='top')
def desk_setup(b):
    b.box('green_d', 0, -0.12, 0, 0.6, 0.4, 0.004, skip='b')                           # blotter
    for sx in (-1, 1):
        b.box('brown', sx * 0.28, -0.12, 0.002, 0.05, 0.4, 0.004, skip='b')
    b.box('beige', -0.3, 0.14, 0, 0.42, 0.4, 0.08, bev=0.008)                           # computer base unit
    for i in range(2):
        b.box('char', -0.37 + i * 0.16, -0.062, 0.03, 0.13, 0.004, 0.02, skip='k')
    b.box('ledr', -0.14, -0.062, 0.02, 0.012, 0.004, 0.008, skip='k')
    b.cyl('beige', -0.3, 0.14, 0.08, 0.09, 0.03, n=8)
    crt(b, -0.3, 0.14, 0.11, 0.36, 0.36, 0.3, body='beige', region='scr_pc', side=False)
    b.box('beige', -0.3, -0.2, 0.006, 0.44, 0.17, 0.03, bev=0.006, rx=5)
    b.decal('keyboard', -0.3, -0.2, 0.043, 0.41, 0.14, face='t', rx=5)
    # telephone
    b.box('enamel_k', 0.42, 0.1, 0, 0.2, 0.22, 0.05, bev=0.012, taper=(0.9, 0.8), shear=(0, 0.02))
    disc_decal(b, 'rotary', 0.42, 0.07, 0.053, 0.06, n=10, face='t')
    b.box('enamel_k', 0.42, 0.2, 0.05, 0.22, 0.05, 0.035, bev=0.014)
    for sx in (-1, 1):
        b.cyl('enamel_k', 0.42 + sx * 0.085, 0.2, 0.04, 0.032, 0.04, n=8)
    b.tube('black', [(0.31, 0.2, 0.06), (0.26, 0.15, 0.01), (0.3, 0.02, 0.008), (0.36, 0.0, 0.01)], 0.005, n=4)
    # banker lamp
    b.lathe('brass', 0.58, 0.24, 0, [(0.08, 0), (0.08, 0.012), (0.02, 0.03), (0.012, 0.3)], n=10)
    b.tube('brass', [(0.58, 0.24, 0.3), (0.58, 0.2, 0.36), (0.58, 0.12, 0.36)], 0.01, n=5)
    b.box('enamel_g', 0.58, 0.1, 0.33, 0.3, 0.12, 0.07, bev=0.03, edges='xT')
    b.box('lamp', 0.58, 0.1, 0.325, 0.26, 0.08, 0.006, skip='t')
    # papers, pen pot, mug, in-tray
    for i, (x, y, rz) in enumerate(((0.0, -0.12, 8), (0.03, -0.1, -5), (0.14, 0.22, 0))):
        b.box('white', x, y, 0.005 + i * 0.003, 0.21, 0.29, 0.003, rz=rz, skip='b')
    b.decal('note2', 0.03, -0.1, 0.012, 0.19, 0.26, face='t', rz=-5)
    b.box('char', 0.14, 0.22, 0, 0.25, 0.33, 0.012, bev=0.004)
    b.box('char', 0.14, 0.22, 0.06, 0.25, 0.33, 0.01, bev=0.004)
    for sx in (-1, 1):
        b.box('char', 0.14 + sx * 0.12, 0.36, 0.01, 0.008, 0.02, 0.05)
    b.box('white', 0.14, 0.22, 0.07, 0.21, 0.29, 0.012, skip='b')
    b.cyl('red_d', 0.16, -0.26, 0, 0.035, 0.09, n=8, caps=(True, False))
    for i, (m, a) in enumerate((('yellow', 12), ('blue', -10), ('red', 4))):
        b.box(m, 0.15 + i * 0.012, -0.26, 0.03, 0.007, 0.007, 0.13, ry=a)
    dish(b, 'mug', 0.33, -0.2, 0, 0.038, 0.09, 'white')
    b.cyl('#3a2416', 0.33, -0.2, 0.075, 0.03, 0.004, n=8)
    b.box('yellow', 0.24, -0.05, 0.004, 0.012, 0.15, 0.008, rz=-35)


@asset('office_chair', G)
def office_chair(b):
    k = b.mark()
    b.box('char', 0.15, 0, 0.05, 0.3, 0.045, 0.03, bev=0.008)
    b.cyl('black', 0.29, -0.012, 0.03, 0.03, 0.024, n=8, axis='y')
    b.radial(k, 5)
    b.cyl('char', 0, 0, 0.05, 0.04, 0.08, n=8)
    b.cyl('chrome', 0, 0, 0.12, 0.022, 0.26, n=8)
    b.box('char', 0, 0.02, 0.37, 0.3, 0.3, 0.03, bev=0.008)
    b.soft('fabric', 0, 0, 0.4, 0.5, 0.48, 0.1, r=0.035)
    b.box('char', 0, 0.26, 0.38, 0.06, 0.03, 0.34, bev=0.006, rx=-8)
    b.soft('fabric', 0, 0.27, 0.62, 0.46, 0.09, 0.44, r=0.035, rx=-8)
    for sx in (-1, 1):
        b.tube('char', [(sx * 0.2, 0.12, 0.42), (sx * 0.27, 0.12, 0.46), (sx * 0.27, 0.12, 0.62), (sx * 0.27, -0.12, 0.62)], 0.012, n=5)
        b.soft('char', sx * 0.27, -0.02, 0.62, 0.05, 0.26, 0.03, r=0.012)
    return {'seat': [[0, 0, 0.52]]}


@asset('waiting_chair_row_3', G)
def waiting_chair_row_3(b):
    seats = []
    b.box('steel_d', 0, 0.05, 0.36, 1.66, 0.06, 0.04)
    for sx in (-1, 1):
        b.box('steel_d', sx * 0.72, 0.05, 0.02, 0.05, 0.05, 0.36)
        b.box('steel_d', sx * 0.72, 0.02, 0, 0.06, 0.5, 0.025, bev=0.006)
    for i in range(3):
        x = (i - 1) * 0.56
        b.box('paint__seat:#3b62a8', x, -0.02, 0.4, 0.5, 0.46, 0.05, bev=0.02, rx=3)
        b.box('paint__seat:#3b62a8', x, 0.22, 0.47, 0.5, 0.05, 0.4, bev=0.02, rx=-10)
        for dx in (-0.17, 0.17):
            b.box('steel_d', x + dx, 0.2, 0.38, 0.025, 0.02, 0.2, rx=-10)
        seats.append([round(x, 3), -0.02, 0.47])
    for i in range(4):
        x = (i - 1.5) * 0.56
        b.box('steel_d', x, -0.02, 0.4, 0.025, 0.03, 0.2)
        b.box('black', x, -0.02, 0.6, 0.045, 0.3, 0.025, bev=0.008)
    return {'seat': seats}


@asset('reception_counter', G, surface=1.1, length=2.4)
def reception_counter(b):
    W, D = 2.4, 0.7
    b.box('char', 0, 0, 0, W - 0.04, D - 0.1, 0.1, skip='tb')
    b.box('wood', 0, -0.12, 0.1, W, 0.36, 0.94, bev=0.008, edges='z')
    for i in range(4):
        b.box('wood_d', (i - 1.5) * 0.58, -0.303, 0.2, 0.5, 0.008, 0.74, bev=0.006, edges='F', skip='k')
    b.box('wood_d', 0, -0.305, 0.1, W, 0.012, 0.06, skip='k')
    b.box('paint__counter:#3f7d4b', 0, -0.14, 1.04, W + 0.06, 0.48, 0.06, bev=0.014)        # high transaction top
    b.box('wood', 0, 0.2, 0.1, W, 0.3, 0.62, skip='f')
    b.box('wood', 0, 0.16, 0.72, W, 0.42, 0.04, bev=0.008, edges='K')                      # staff worktop
    for i in range(4):
        b.box('wood_d', (i - 1.5) * 0.58, 0.354, 0.14, 0.52, 0.008, 0.54, bev=0.005, edges='K', skip='f')
        b.box('brass', (i - 1.5) * 0.58, 0.362, 0.55, 0.1, 0.01, 0.014)
    # counter dressing: bell, sign-in clipboard, pen, leaflets
    b.lathe('chrome', -0.6, -0.16, 1.1, [(0.05, 0), (0.05, 0.008), (0.045, 0.03), (0.02, 0.045), (0, 0.05)], n=10)
    b.cyl('chrome', -0.6, -0.16, 1.15, 0.008, 0.012, n=5)
    b.box('brown', 0.2, -0.18, 1.1, 0.24, 0.32, 0.008, rz=-10)
    b.decal('note1', 0.2, -0.18, 1.1115, 0.2, 0.27, face='t', rz=-10)
    b.box('chrome', 0.2 + 0.03, -0.04, 1.108, 0.1, 0.03, 0.012, rz=-10)
    b.box('blue', 0.42, -0.2, 1.1, 0.012, 0.14, 0.01, rz=30)
    b.box('char', 0.9, -0.14, 1.1, 0.26, 0.14, 0.02)
    for i, m in enumerate(('yellow', 'blue_l', 'pink')):
        b.box(m, 0.82 + i * 0.08, -0.12, 1.12, 0.07, 0.02, 0.16, rx=-12)
    b.box('char', 0.9, -0.07, 1.12, 0.26, 0.012, 0.14, rx=-12)
    b.box('black', -1.0, -0.14, 1.1, 0.26, 0.09, 0.012)
    b.box('brass', -1.0, -0.15, 1.112, 0.24, 0.012, 0.06, rx=-15)


def _filing(b, n):
    W, D, H = 0.47, 0.62, 0.07 + n * 0.32
    b.box('char', 0, 0.01, 0, W - 0.03, D - 0.05, 0.05, skip='tb')
    b.box('#77866f', 0, 0, 0.05, W, D, H - 0.05, bev=0.008, edges='zT')
    for i in range(n):
        z = 0.065 + i * 0.32
        b.box('#84947b', 0, -D / 2 - 0.008, z, W - 0.03, 0.016, 0.305, bev=0.006, skip='k')
        b.box('chrome', 0, -D / 2 - 0.022, z + 0.2, 0.14, 0.014, 0.022, bev=0.004)
        b.box('chrome', 0, -D / 2 - 0.018, z + 0.12, 0.1, 0.004, 0.045, skip='k')
        b.box('white', 0, -D / 2 - 0.021, z + 0.128, 0.086, 0.002, 0.03, skip='k')
    b.cyl('chrome', W / 2 - 0.05, -D / 2 - 0.016, H - 0.05, 0.012, 0.01, n=6, axis='y', rz=180)
    return H


@asset('filing_cabinet_4', G)
def filing_cabinet_4(b):
    H = _filing(b, 4)
    b.box('tan', 0.02, 0.02, H, 0.34, 0.28, 0.22, bev=0.008)
    b.box('brown', 0.02, -0.123, H + 0.13, 0.1, 0.006, 0.03)
    b.box('tan', 0.02, 0.02, H + 0.22, 0.36, 0.3, 0.03, bev=0.006)


@asset('filing_cabinet_2', G, surface=0.71)
def filing_cabinet_2(b):
    H = _filing(b, 2)
    plant(b, 'orchid', -0.08, 0.1, H, 0.8, 'terra')
    for i in range(3):
        b.box(('#c9b892', '#b8332b', '#3b62a8')[i], 0.1, -0.05, H + i * 0.022, 0.23, 0.31, 0.02, rz=(-6, 4, -2)[i])


def _board(b, w, h, z, m_frame, m_face, depth=0.03):
    frame(b, m_frame, 0, 0, z, w, h, t=0.04, depth=depth, bev=0.01)
    b.box(m_face, 0, -0.008, z - h / 2, w, 0.016, h, skip='klrtb')


@asset('notice_board', G, mount='wall')
def notice_board(b):
    z = 1.5
    _board(b, 1.2, 0.8, z, 'wood', '#a9825a')
    items = (('note1', -0.42, 0.18, 0.2, 0.26, 3), ('map', 0.0, 0.14, 0.44, 0.3, 0), ('calendar', 0.42, 0.16, 0.2, 0.26, -2), ('note2', -0.44, -0.18, 0.2, 0.26, -4),
             ('news', -0.14, -0.2, 0.3, 0.2, 2), ('note4', 0.16, -0.2, 0.18, 0.23, 5), ('cert', 0.43, -0.2, 0.26, 0.2, 0))
    for i, (reg, x, dz, w, h, rot) in enumerate(items):
        b.decal(reg, x, -0.02 - i * 0.0005, z + dz, w, h, ry=rot)
        b.cyl(('red', 'yellow', 'blue', 'green')[i % 4], x, -0.02, z + dz + h / 2 - 0.02, 0.012, 0.012, n=6, axis='y', rz=180)


@asset('wanted_board', G, mount='wall')
def wanted_board(b):
    z = 1.5
    _board(b, 1.0, 0.72, z, 'wood_d', '#4f6b52')
    b.box('wood_d', 0, -0.03, z + 0.36 + 0.04, 0.5, 0.012, 0.09, bev=0.006, skip='k')
    for i, reg in enumerate(('wanted1', 'wanted2', 'wanted3')):
        b.decal(reg, (i - 1) * 0.31, -0.02, z + 0.02 - (i % 2) * 0.03, 0.27, 0.385, ry=(-3, 2, -2)[i])
        for sx in (-1, 1):
            b.cyl('brass', (i - 1) * 0.31 + sx * 0.11, -0.02, z + 0.19 - (i % 2) * 0.03, 0.009, 0.01, n=5, axis='y', rz=180)
    b.decal('note3', 0.36, -0.021, z - 0.26, 0.16, 0.14)


@asset('flag_stand', G)
def flag_stand(b):
    b.lathe('brass', 0, 0, 0, [(0.17, 0), (0.17, 0.02), (0.1, 0.05), (0.04, 0.07), (0.03, 0.12), (0.018, 0.14), (0.016, 2.2)], n=10)
    b.lathe('gold', 0, 0, 2.2, [(0.016, 0), (0.035, 0.03), (0.02, 0.06), (0.04, 0.12), (0, 0.2)], n=8)
    # draped flag: overlapping cloth folds hanging from the pole
    for i, (x1, drop, yy, m, rz) in enumerate(((0.5, 1.0, 0.0, 'red', -14), (0.44, 1.12, 0.012, 'white', -4), (0.36, 1.22, 0.0, 'red', 8), (0.26, 1.3, -0.012, 'white', 20))):
        b.prism(m, [(0.012, 2.16), (x1, 2.16 - x1 * 0.5), (x1 * 0.7, 2.16 - drop), (0.012, 2.16 - drop + 0.1)], yy - 0.006, yy + 0.006, plane='xz', rz=rz)
    b.prism('blue_d', [(0.012, 2.165), (0.3, 2.02), (0.27, 1.55), (0.012, 1.6)], -0.03, -0.018, plane='xz', rz=-22)
    b.tube('gold', [(0.02, 0, 2.1), (0.06, -0.03, 1.9), (0.04, -0.03, 1.55)], 0.006, n=4)
    b.ball('gold', 0.04, -0.03, 1.52, 0.02, n=6, rings=3, sz=1.6)


@asset('water_cooler', G)
def water_cooler(b):
    b.box('offwhite', 0, 0, 0, 0.32, 0.32, 0.98, bev=0.014, edges='zT')
    b.box('grey_l', 0, -0.164, 0.6, 0.26, 0.008, 0.22, bev=0.02, edges='y', skip='k')
    b.box('grey', 0, -0.17, 0.56, 0.26, 0.07, 0.015)
    for sx, m in ((-1, 'enamel_b'), (1, 'enamel_r')):
        b.box(m, sx * 0.06, -0.18, 0.74, 0.03, 0.03, 0.035, bev=0.006)
        b.box('white', sx * 0.06, -0.175, 0.71, 0.014, 0.02, 0.03)
    for i in range(5):
        b.box('grey', 0, -0.162, 0.1 + i * 0.03, 0.22, 0.004, 0.012, skip='k')
    b.lathe('clear', 0, 0, 0.98, [(0.03, 0), (0.035, 0.05), (0.13, 0.1), (0.135, 0.38), (0.11, 0.42), (0, 0.42)], n=12)
    b.lathe('offwhite', 0, 0, 0.98, [(0.14, 0), (0.14, 0.02), (0.05, 0.035)], n=12, caps=(False, False))
    b.cyl('white', 0.2, -0.05, 0.52, 0.04, 0.24, n=8)                                    # cup dispenser
    b.cyl('offwhite', 0.2, -0.05, 0.76, 0.045, 0.012, n=8)


@asset('copier', G, surface=1.0)
def copier(b):
    W, D = 0.9, 0.62
    b.box('char', 0, 0, 0, W - 0.06, D - 0.06, 0.06, skip='tb')
    b.box('beige', 0, 0, 0.06, W, D, 0.62, bev=0.012, edges='z')
    fronts(b, 'offwhite', 0, -D / 2, 0.08, W - 0.03, 0.56, [(1, 'D'), (1, 'D'), (1.4, 'l')], hm='char', pull_kind='slot', knob_kind='slot', style='flat')
    b.box('offwhite', 0, 0, 0.68, W + 0.04, D + 0.02, 0.2, bev=0.016)
    b.box('beige', -0.06, 0.03, 0.88, W - 0.2, D - 0.1, 0.045, bev=0.012)                 # platen lid
    b.box('char', -0.06, -D / 2 + 0.07, 0.9, 0.3, 0.03, 0.03, bev=0.008)
    b.box('char', 0.36, -0.03, 0.88, 0.14, D - 0.14, 0.012, rx=10)                        # control panel
    b.decal('keypad', 0.36, -0.1, 0.9, 0.09, 0.115, face='t', rx=10)
    b.box('glow', 0.36, 0.1, 0.93, 0.09, 0.05, 0.006, rx=10)
    b.box('green', 0.36, -0.22, 0.875, 0.05, 0.04, 0.012, rx=10)
    b.box('offwhite', -W / 2 - 0.12, 0, 0.66, 0.26, 0.36, 0.015, ry=12)                   # output tray
    b.box('white', -W / 2 - 0.12, 0, 0.678, 0.2, 0.28, 0.012, ry=12)
    b.box('offwhite', W / 2 + 0.1, 0, 0.7, 0.22, 0.34, 0.015, ry=-18)
    b.box('black', 0, -D / 2 - 0.012, 0.74, 0.5, 0.006, 0.02)


@asset('typewriter', G, mount='top')
def typewriter(b):
    b.box('teal', 0, 0, 0, 0.4, 0.36, 0.07, bev=0.014)
    b.box('teal', 0, 0.09, 0.07, 0.4, 0.18, 0.06, bev=0.014)
    b.box('char', 0, -0.07, 0.035, 0.34, 0.17, 0.045, rx=14)
    b.decal('keyboard', 0, -0.075, 0.084, 0.31, 0.14, face='t', rx=14)
    b.cyl('black', -0.23, 0.15, 0.14, 0.03, 0.46, n=10, axis='x')
    for sx in (-1, 1):
        b.cyl('chrome', sx * 0.245 - 0.01, 0.15, 0.14, 0.035, 0.02, n=8, axis='x')
    b.box('white', 0, 0.165, 0.14, 0.24, 0.004, 0.2, rx=-12)
    b.box('chrome', 0, 0.13, 0.165, 0.3, 0.008, 0.02)
    b.box('chrome', -0.24, 0.1, 0.15, 0.012, 0.012, 0.09, ry=-30)
    b.box('black', 0, 0.02, 0.07, 0.14, 0.05, 0.012)


@asset('safe', G, surface=0.9)
def safe(b):
    W, D, H = 0.62, 0.6, 0.9
    b.box('steel_d', 0, 0, 0, W, D, H, bev=0.02)
    b.box('iron', 0, -D / 2 - 0.012, 0.05, W - 0.08, 0.024, H - 0.1, bev=0.01, skip='k')
    for z in (0.2, 0.7):
        b.cyl('steel', W / 2 - 0.03, -D / 2 - 0.02, z - 0.05, 0.018, 0.1, n=8)
    b.lathe('chrome', -0.04, -D / 2 - 0.024, 0.55, [(0.06, 0), (0.06, -0.012), (0.045, -0.02), (0.03, -0.045), (0, -0.05)], n=12, axis='y', caps=(False, False))
    k = b.mark()
    b.rod('chrome', (-0.04, -D / 2 - 0.035, 0.32), (0.06, -D / 2 - 0.035, 0.32), 0.009, n=5)
    b.ball('chrome', 0.065, -D / 2 - 0.035, 0.32, 0.016, n=6, rings=3)
    b.radial(k, 3, axis='y', pivot=(-0.04, -D / 2 - 0.035, 0.32))
    b.cyl('chrome', -0.04, -D / 2 - 0.024, 0.32, 0.028, 0.025, n=8, axis='y', rz=180)
    b.box('brass', 0.1, -D / 2 - 0.026, 0.72, 0.16, 0.004, 0.06, skip='k')
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.cyl('black', sx * 0.24, sy * 0.23, -0.0, 0.04, 0.001, n=6)


def _rifle(b, x, y, z, L=1.05, vertical=True, wood='wood_r'):
    k = b.mark()
    b.box(wood, 0, 0, 0, 0.035, 0.05, 0.34, bev=0.008, taper=(0.8, 0.6))
    b.box('iron', 0, 0, 0.32, 0.03, 0.04, 0.2, bev=0.005)
    b.cyl('iron', 0, 0, 0.5, 0.011, L - 0.5, n=6)
    b.box(wood, 0, 0.0, 0.5, 0.028, 0.035, 0.26, bev=0.006)
    b.tube('iron', [(0, -0.02, 0.32), (0, -0.05, 0.34), (0, -0.05, 0.4), (0, -0.02, 0.42)], 0.004, n=3)
    if not vertical:
        b.rot(k, 'y', 90)
    b.move(k, x, y, z)


@asset('gun_rack_wall', G, mount='wall')
def gun_rack_wall(b):
    z = 1.05
    b.box('wood', 0, -0.012, z, 1.0, 0.024, 1.1, bev=0.008)
    b.box('wood_d', 0, -0.07, z, 1.04, 0.14, 0.05, bev=0.008)
    b.box('wood_d', 0, -0.06, z + 0.72, 1.0, 0.1, 0.05, bev=0.008)
    b.box('wood', 0, -0.03, z + 1.1, 1.06, 0.07, 0.04, bev=0.01)
    for i in range(5):
        x = (i - 2) * 0.19
        b.box('#4d6b4f', x, -0.07, z + 0.05, 0.08, 0.09, 0.006, skip='b')
        for sx in (-1, 1):
            b.box('wood_d', x + sx * 0.035, -0.115, z + 0.72, 0.02, 0.04, 0.05)
        if i != 3:
            _rifle(b, x, -0.075, z + 0.056, L=1.0 if i % 2 else 1.08, wood='wood_r' if i % 2 else 'wood_dd')
    b.box('iron', 0, -0.14, z + 0.6, 1.0, 0.012, 0.02)                                    # locking bar
    b.box('brass', 0.46, -0.15, z + 0.58, 0.05, 0.02, 0.06, bev=0.006)


@asset('evidence_shelf', G)
def evidence_shelf(b):
    W, D, H = 1.2, 0.45, 1.9
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box('steel_d', sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), 0, 0.04, 0.04, H, skip='b')
    rng = R(41)
    for i in range(5):
        z = 0.12 + i * 0.42
        b.box('steel', 0, 0, z - 0.03, W - 0.02, D - 0.02, 0.03, bev=0.004)
        if i == 4:
            b.box('tan', -0.3, 0, z, 0.4, 0.32, 0.2, bev=0.006)
            continue
        x = -W / 2 + 0.06
        while x < W / 2 - 0.3:
            w = rng.uniform(0.26, 0.36)
            h = rng.uniform(0.22, 0.32)
            if rng.random() < 0.75:
                b.box(rng.choice(('tan', '#b99b6b', '#a98860')), x + w / 2, 0, z, w, 0.36, h, bev=0.006)
                b.box('tan', x + w / 2, 0, z + h, w + 0.012, 0.37, 0.04, bev=0.006)
                b.box('white', x + w / 2, -0.182, z + h * 0.35, w * 0.5, 0.004, h * 0.3, skip='k')
                b.box(rng.choice(('red', 'blue', 'yellow')), x + w / 2, -0.184, z + h * 0.52, w * 0.5, 0.004, 0.02, skip='k')
            else:
                b.soft('clear', x + w / 2, 0, z, w * 0.8, 0.26, 0.05, r=0.015)
                b.box('red', x + w / 2, -0.02, z + 0.05, w * 0.6, 0.03, 0.003)
            x += w + 0.03


@asset('jail_bunk', G)
def jail_bunk(b):
    W, L = 0.8, 1.95
    b.box('steel_d', 0, 0, 0.36, W, L, 0.04, bev=0.006)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box('steel_d', sx * (W / 2 - 0.03), sy * (L / 2 - 0.03), 0, 0.045, 0.045, 0.36)
            b.box('steel', sx * (W / 2 - 0.03), sy * (L / 2 - 0.03), 0, 0.09, 0.09, 0.01)
        b.box('steel_d', 0, sx * (L / 2 - 0.03), 0.15, W - 0.1, 0.03, 0.03)
    b.soft('#8f968c', 0, 0, 0.4, W - 0.04, L - 0.04, 0.1, r=0.03)
    for i in range(7):
        b.box('#727a70', 0, -0.8 + i * 0.27, 0.498, W - 0.06, 0.03, 0.004, skip='b')
    b.soft('offwhite', 0, L / 2 - 0.22, 0.49, 0.5, 0.3, 0.09, r=0.035)
    b.soft('#6f7f8f', 0, -L / 2 + 0.3, 0.5, W - 0.06, 0.42, 0.06, r=0.02)
    b.soft('#6f7f8f', 0, -L / 2 + 0.28, 0.555, W - 0.06, 0.34, 0.05, r=0.02)
    return {'seat': [[-W / 2 + 0.2, 0, 0.5]], 'sleep': [[0, 0.1, 0.52]]}


@asset('jail_toilet', G)
def jail_toilet(b):
    S = 'steel'
    b.box(S, 0, 0.14, 0, 0.42, 0.3, 0.9, bev=0.012, edges='zT')
    b.lathe(S, 0, -0.1, 0, [(0.13, 0), (0.14, 0.02), (0.13, 0.2), (0.2, 0.36), (0.21, 0.39), (0.19, 0.4), (0.15, 0.39), (0.08, 0.25), (0, 0.24)], n=12, sy=1.15)
    basin(b, S, 0, 0.1, 0.8, 0.3, 0.18, 0.1, bev=0.04, taper=1.15)
    b.cyl('chrome', 0, 0.26, 0.9, 0.012, 0.05, n=6)
    b.cyl('chrome', -0.16, -0.012, 0.6, 0.02, 0.012, n=8, axis='y')
    for sx in (-1, 1):
        b.cyl('iron', sx * 0.17, -0.012, 0.86, 0.008, 0.006, n=5, axis='y')
        b.cyl('iron', sx * 0.17, -0.012, 0.08, 0.008, 0.006, n=5, axis='y')
    b.cyl('white', 0.25, 0.2, 0.55, 0.05, 0.1, n=8, axis='x')                             # paper roll
    b.rod('steel_d', (0.2, 0.2, 0.6), (0.37, 0.2, 0.6), 0.008, n=4)
    return {'seat': [[0, -0.1, 0.42]]}


def _bars(b, W, H=2.4, door=False):
    n = round(W / 0.11)
    for z, h in ((0, 0.06), (H - 0.06, 0.06), (1.15, 0.05)):
        b.box('iron', 0, 0, z, W, 0.06 if z != 1.15 else 0.035, h, bev=0.006)
    for sx in (-1, 1):
        b.box('iron', sx * (W / 2 - 0.025), 0, 0.06, 0.05, 0.06, H - 0.12, skip='tb')
    for i in range(1, n):
        b.cyl('steel_d', -W / 2 + i * W / n, 0, 0.06, 0.013, H - 0.12, n=6, caps=(False, False))


@asset('jail_bars_panel', G, length=1.5, height=2.4)
def jail_bars_panel(b):
    _bars(b, 1.5)


@asset('jail_door', G, length=1.0, height=2.4, hinge=[-0.5, 0, 0])
def jail_door(b):
    """Fixed frame plus the barred leaf as a `.leaf` child hinged on the -X jamb."""
    for sx in (-1, 1):
        b.box('iron', sx * 0.475, 0, 0, 0.05, 0.08, 2.4, bev=0.006)
    b.box('iron', 0, 0, 2.1, 0.9, 0.08, 0.3, bev=0.006, skip='lr')
    for i in range(1, 8):
        b.cyl('steel_d', -0.45 + i * 0.9 / 8, 0, 2.16, 0.013, 0.18, n=6, caps=(False, False))
    p = b.part('leaf', pivot=(-0.45, 0, 0))
    for z, h in ((0.03, 0.06), (2.02, 0.06), (1.05, 0.05)):
        p.box('iron', 0, 0, z, 0.88, 0.05, h, bev=0.006)
    for sx in (-1, 1):
        p.box('iron', sx * 0.42, 0, 0.09, 0.045, 0.05, 1.93, skip='tb')
    for i in range(1, 8):
        p.cyl('steel_d', -0.44 + i * 0.88 / 8, 0, 0.09, 0.013, 1.93, n=6, caps=(False, False))
    p.box('iron', 0.33, 0, 0.95, 0.18, 0.07, 0.26, bev=0.008)                             # lock box
    p.box('brass', 0.33, -0.037, 1.06, 0.03, 0.004, 0.05, skip='k')
    p.box('iron', 0.0, 0, 0.75, 0.4, 0.04, 0.12, bev=0.006)                               # food slot
    for z in (0.3, 1.7):
        p.cyl('iron', -0.45, 0, z, 0.022, 0.12, n=8)


@asset('bench_plain', G)
def bench_plain(b):
    W = 1.6
    for i in range(3):
        b.box('wood', 0, -0.13 + i * 0.13, 0.42, W, 0.115, 0.035, bev=0.008)
    for sx in (-1, 1):
        b.box('steel_d', sx * (W / 2 - 0.2), 0, 0.38, 0.05, 0.4, 0.04)
        for sy in (-1, 1):
            b.box('steel_d', sx * (W / 2 - 0.2), sy * 0.16, 0, 0.045, 0.045, 0.38, taper=(1, 1))
        b.box('steel_d', sx * (W / 2 - 0.2), 0, 0.12, 0.03, 0.3, 0.03)
    return {'seat': [[-0.5, 0, 0.48], [0, 0, 0.48], [0.5, 0, 0.48]]}


@asset('payphone_wall', G, mount='wall')
def payphone_wall(b):
    z = 1.05
    b.box('steel_d', 0, -0.012, z - 0.1, 0.5, 0.024, 0.9, bev=0.006)                       # backboard
    for sx in (-1, 1):
        b.box('clear', sx * 0.25, -0.16, z + 0.05, 0.012, 0.3, 0.75, bev=0.0)             # privacy wings
        b.box('steel', sx * 0.25, -0.16, z + 0.8, 0.02, 0.3, 0.02)
    b.box('steel', 0, -0.16, z + 0.8, 0.5, 0.3, 0.02)
    b.box('enamel_k', 0, -0.1, z + 0.12, 0.28, 0.16, 0.5, bev=0.014)
    b.box('chrome', 0, -0.184, z + 0.44, 0.24, 0.008, 0.14, bev=0.004, skip='k')
    b.box('black', 0.02, -0.189, z + 0.5, 0.08, 0.004, 0.012, skip='k')
    b.decal('note4', -0.06, -0.19, z + 0.5, 0.07, 0.09)
    b.decal('keypad', 0.04, -0.186, z + 0.33, 0.12, 0.15)
    b.box('chrome', 0.04, -0.184, z + 0.245, 0.16, 0.008, 0.18, bev=0.004, skip='k')
    b.box('chrome', 0, -0.185, z + 0.15, 0.1, 0.012, 0.06, bev=0.004)                     # coin return
    b.box('black', 0, -0.192, z + 0.155, 0.07, 0.004, 0.035)
    b.box('chrome', -0.11, -0.19, z + 0.3, 0.03, 0.04, 0.2, bev=0.006)                    # cradle
    b.box('black', -0.11, -0.225, z + 0.22, 0.045, 0.04, 0.34, bev=0.012)                 # handset
    for dz in (0.22, 0.52):
        b.box('black', -0.11, -0.215, z + dz, 0.055, 0.06, 0.06, bev=0.014)
    b.tube('chrome', [(-0.11, -0.22, z + 0.22), (-0.14, -0.2, z - 0.02), (-0.06, -0.19, z - 0.05), (-0.03, -0.18, z + 0.13)], 0.007, n=5)
    b.box('steel', 0, -0.13, z - 0.06, 0.46, 0.24, 0.02, bev=0.005)                       # shelf with directory
    b.box('yellow', 0.06, -0.13, z - 0.04, 0.2, 0.18, 0.04, bev=0.004)
    b.box('offwhite', 0.06, -0.134, z - 0.036, 0.19, 0.18, 0.032)


@asset('hanging_sign_blank', G, mount='ceiling', face=[1.1, 0.26], face_centre=[0, -0.031, -0.5])
def hanging_sign_blank(b):
    """Double-sided hanging sign; the blank face (1.1 x 0.26 m, both sides) takes the engine's own text."""
    for sx in (-1, 1):
        b.cyl('char', sx * 0.45, 0, -0.34, 0.006, 0.34, n=4)
        b.lathe('char', sx * 0.45, 0, -0.025, [(0.012, 0), (0.03, 0.012), (0.03, 0.025)], n=8)
        b.box('char', sx * 0.45, 0, -0.36, 0.03, 0.02, 0.03)
    b.box('wood_dd', 0, 0, -0.66, 1.24, 0.05, 0.32, bev=0.012)
    b.box('paint__sign:#ecebe6', 0, 0, -0.63, 1.1, 0.06, 0.26, bev=0.004)
    return {}


@asset('fluorescent_troffer', G, mount='ceiling', size=[0.6, 1.2])
def fluorescent_troffer(b):
    W, L = 0.6, 1.2
    b.box('offwhite', 0, 0, -0.06, W, L, 0.06, bev=0.008, edges='B', skip='t')
    b.box('panel', 0, 0, -0.064, W - 0.06, L - 0.06, 0.006, skip='t')
    b.box('offwhite', 0, 0, -0.07, 0.02, L - 0.06, 0.012, skip='t')
    for i in range(1, 4):
        b.box('offwhite', 0, -L / 2 + i * L / 4, -0.068, W - 0.06, 0.012, 0.008, skip='t')


@asset('exit_sign', G, mount='wall')
def exit_sign(b):
    z = 2.15
    b.box('char', 0, -0.03, z, 0.36, 0.06, 0.18, bev=0.008)
    b.box('light__exit:#ff5a4a', 0, -0.062, z + 0.02, 0.32, 0.004, 0.14, skip='k')
    b.decal('exit', 0, -0.0655, z + 0.09, 0.3, 0.13)
    for sx in (-1, 1):
        b.lathe('lamp', sx * 0.1, -0.03, z - 0.045, [(0, 0), (0.03, 0.01), (0.035, 0.04)], n=8)

"""Furniture family: bedbath assets."""
import math
from furniture_kit import *

G = 'bedbath'


def _bedding(b, W, L, z, cover='fabric', pillows=2, blanket='mustard', band='cream', y0=None):
    """Mattress, tucked duvet with a turned-down band, pillows at +Y and a folded blanket at the foot."""
    b.soft('white', 0, 0, z, W, L, 0.2, r=0.05)
    b.soft(cover, 0, -L * 0.14, z + 0.03, W + 0.04, L * 0.74, 0.2, r=0.05)
    b.soft(band, 0, L * 0.19, z + 0.19, W + 0.03, 0.22, 0.05, r=0.02)
    pw = (W - 0.12) / pillows
    for i in range(pillows):
        b.soft('white', (i - (pillows - 1) / 2) * pw, L / 2 - 0.24, z + 0.17, pw - 0.06, 0.4, 0.13, r=0.05, rx=10)
    if blanket:
        b.soft(blanket, 0, -L / 2 + 0.26, z + 0.225, W + 0.05, 0.4, 0.045, r=0.018)
        b.soft(blanket, 0, -L / 2 + 0.24, z + 0.265, W + 0.05, 0.32, 0.04, r=0.018)
        for dy in (-0.1, 0.06):
            b.box('cream', 0, -L / 2 + 0.24 + dy, z + 0.27, W + 0.056, 0.035, 0.038, skip='b')


def _headboard(b, W, y, h, m='wood', panels=2, z=0.0):
    for sx in (-1, 1):
        b.box(m, sx * (W / 2 + 0.02), y, z, 0.08, 0.08, h, bev=0.01, edges='z')
        b.box(m, sx * (W / 2 + 0.02), y, z + h, 0.1, 0.1, 0.025, bev=0.008)
        b.ball(m, sx * (W / 2 + 0.02), y, z + h + 0.05, 0.035, n=8, rings=4)
    b.box(m, 0, y, z + 0.25, W - 0.04, 0.04, h - 0.33, bev=0.004)
    b.box(m, 0, y, z + h - 0.09, W - 0.02, 0.06, 0.07, bev=0.012)
    pw = (W - 0.12) / panels
    for i in range(panels):
        b.box('wood_d', (i - (panels - 1) / 2) * pw, y - 0.024, z + 0.42, pw - 0.06, 0.01, h - 0.6, bev=0.008, edges='F', skip='k')


def _bed(b, W, L=2.0, hb=1.05, cover='fabric', pillows=2, blanket='mustard', m='wood'):
    _headboard(b, W, L / 2 + 0.04, hb, m, panels=2 if W > 1.2 else 1)
    _headboard(b, W, -L / 2 - 0.04, 0.55, m, panels=2 if W > 1.2 else 1)
    for sx in (-1, 1):
        b.box(m, sx * (W / 2 + 0.01), 0, 0.18, 0.035, L, 0.16, bev=0.006, skip='fk')
    b.box('wood_dd', 0, 0, 0.2, W, L, 0.1, skip='tlrfk')
    _bedding(b, W, L, 0.3, cover, pillows, blanket)
    return {'seat': [[W / 2 - 0.15, -0.3, 0.52]], 'sleep': [[0, 0.1, 0.55]]}


@asset('bed_double', G)
def bed_double(b):
    return _bed(b, 1.5)


@asset('bed_single', G)
def bed_single(b):
    return _bed(b, 0.95, pillows=1, cover='paint__fabric:#c4473b', blanket='teal')


@asset('bunk_bed', G)
def bunk_bed(b):
    W, L, H = 0.95, 1.95, 1.7
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box('wood', sx * (W / 2 + 0.03), sy * (L / 2 + 0.03), 0, 0.07, 0.07, H, bev=0.01, edges='zT')
    for z, cov, bl in ((0.28, 'fabric', 'mustard'), (1.12, 'blue', None)):
        for sx in (-1, 1):
            b.box('wood', sx * (W / 2 + 0.03), 0, z - 0.06, 0.03, L, 0.16, bev=0.005, skip='fk')
        for sy in (-1, 1):
            b.box('wood', 0, sy * (L / 2 + 0.03), z - 0.06, W, 0.03, 0.16, bev=0.005, skip='lr')
            b.box('wood', 0, sy * (L / 2 + 0.03), z + 0.3, W, 0.03, 0.12, bev=0.008, skip='lr')
            b.box('wood', 0, sy * (L / 2 + 0.03), z + 0.14, W, 0.02, 0.08, bev=0.004, skip='lr')
        b.box('wood_dd', 0, 0, z - 0.04, W, L, 0.05, skip='lrfk')
        k = b.mark()
        _bedding(b, W - 0.02, L - 0.02, z, cov, 1, bl, band='white')
        b.scale(k, 1, 1, 0.75, pivot=(0, 0, z))
    b.box('wood', -W / 2 - 0.03, 0.15, 1.42, 0.025, L - 0.3, 0.09, bev=0.006)       # guard rails
    b.box('wood', W / 2 + 0.03, 0.25, 1.42, 0.025, L - 0.56, 0.09, bev=0.006)
    for sy in (-1, 1):                                                                # ladder on +X side at the foot
        b.box('wood', W / 2 + 0.075, -0.62 + sy * 0.2, 0, 0.035, 0.04, 1.5, bev=0.006)
    for i in range(4):
        b.box('wood', W / 2 + 0.075, -0.62, 0.26 + i * 0.3, 0.03, 0.36, 0.035, bev=0.005)
    return {'seat': [[W / 2 - 0.2, 0.2, 0.52]], 'sleep': [[0, 0.1, 0.5], [0, 0.1, 1.34]]}


@asset('nightstand', G, surface=0.58)
def nightstand(b):
    b.box('wood', 0, 0, 0.12, 0.5, 0.42, 0.43, bev=0.008, edges='z')
    b.box('wood', 0, -0.008, 0.55, 0.54, 0.46, 0.03, bev=0.01)
    legs(b, 'wood', 0, 0, 0.48, 0.4, 0.12, t=0.05, taper=0.6)
    for i in range(2):
        drawer(b, 'wood_d', 0, -0.21, 0.135 + i * 0.205, 0.46, 0.195, kind='knob')
    b.box('char', -0.12, 0.05, 0.58, 0.16, 0.09, 0.07, bev=0.012)                    # alarm clock radio
    b.decal('lcd', -0.12, 0.0025, 0.618, 0.11, 0.035)
    b.box('navy', 0.12, -0.02, 0.58, 0.16, 0.22, 0.03, rz=12)
    b.box('offwhite', 0.12, -0.02, 0.584, 0.15, 0.21, 0.022, rz=12)
    b.box('navy', 0.12, -0.02, 0.606, 0.16, 0.22, 0.005, rz=12)


@asset('dresser', G, surface=0.87)
def dresser(b):
    W, D = 1.3, 0.48
    b.box('wood', 0, 0, 0.1, W, D, 0.72, bev=0.008, edges='z')
    b.box('wood', 0, -0.01, 0.82, W + 0.05, D + 0.04, 0.035, bev=0.012)
    legs(b, 'wood', 0, 0, W - 0.02, D - 0.02, 0.1, t=0.06, taper=0.65)
    b.box('wood', 0, -D / 2 + 0.02, 0.05, W - 0.14, 0.02, 0.05)
    fronts(b, 'wood_d', 0, -D / 2, 0.11, W - 0.03, 0.7, [(1, 'ddd'), (1.2, 'DD'), (1.3, 'DD')], knob_kind='knob', pull_kind='knob')
    b.box('wood_dd', -0.35, 0.05, 0.855, 0.24, 0.16, 0.09, bev=0.01)                 # jewellery box
    b.box('brass', -0.35, -0.032, 0.9, 0.03, 0.006, 0.02)
    bottle(b, 0.05, 0.08, 0.855, 0.13, 0.028, 'clear_a', cap='gold', neck=0.4)
    bottle(b, 0.13, 0.04, 0.855, 0.09, 0.03, 'pink', cap='gold', neck=0.4)
    b.box('white', 0.42, 0.0, 0.855, 0.3, 0.2, 0.004, skip='b')
    frame(b, 'brass', 0.42, 0.08, 0.96, 0.16, 0.12, t=0.015, depth=0.02)
    b.decal('pic_lake', 0.42, 0.07, 0.96, 0.16, 0.12)
    b.box('wood_dd', 0.42, 0.1, 0.857, 0.1, 0.05, 0.03)


@asset('wardrobe', G)
def wardrobe(b):
    W, D, H = 1.15, 0.58, 1.95
    b.box('wood_dd', 0, 0.01, 0, W - 0.04, D - 0.06, 0.08, skip='tb')
    b.box('wood', 0, 0, 0.08, W, D, H - 0.08, bev=0.01, edges='z')
    b.box('wood', 0, -0.015, H, W + 0.08, D + 0.07, 0.05, bev=0.02, edges='FLR')
    b.box('wood', 0, -0.01, H - 0.03, W + 0.03, D + 0.03, 0.03, bev=0.008)
    fronts(b, 'wood', 0, -D / 2, 0.1, W - 0.03, H - 0.14, [(4.2, 'lr'), (1, 'DD')], hz=0.42)
    for sx in (-1, 1):
        b.box('wood_d', sx * 0.28, -D / 2 - 0.027, 0.62, 0.36, 0.006, 1.12, bev=0.005, edges='F', skip='k')


@asset('vanity_desk', G, surface=0.76)
def vanity_desk(b):
    W, D = 1.05, 0.46
    b.box('wood', 0, 0, 0.72, W, D, 0.035, bev=0.012)
    for sx in (-1, 1):
        b.box('wood', sx * 0.37, 0, 0.42, 0.28, D - 0.04, 0.3, bev=0.006, edges='z')
        legs(b, 'wood', sx * 0.37, 0, 0.27, D - 0.05, 0.42, t=0.045, taper=0.55)
        drawer(b, 'wood_d', sx * 0.37, -D / 2 + 0.02, 0.575, 0.25, 0.135, kind='knob')
        drawer(b, 'wood_d', sx * 0.37, -D / 2 + 0.02, 0.43, 0.25, 0.135, kind='knob')
    b.box('wood', 0, 0.02, 0.63, 0.46, D - 0.08, 0.09)
    drawer(b, 'wood_d', 0, -D / 2 + 0.04, 0.635, 0.44, 0.08, kind='knob')
    # mirror: arched frame on two posts
    arch = [(-0.3, 0), (0.3, 0), (0.3, 0.52), (0.2, 0.66), (0, 0.72), (-0.2, 0.66), (-0.3, 0.52)]
    b.prism('wood', arch, 0.16, 0.2, plane='xz', z=0.755, bev=0.008)
    b.prism('mirror', [(p * 0.86, q * 0.9 + 0.035) for p, q in arch], 0.154, 0.16, plane='xz', z=0.755)
    for sx in (-1, 1):
        b.box('wood', sx * 0.4, 0.18, 0.755, 0.2, 0.03, 0.42, bev=0.006)
        b.box('mirror', sx * 0.4, 0.162, 0.78, 0.16, 0.004, 0.37, skip='k')
    for i, (m, h) in enumerate((('pink', 0.1), ('clear_a', 0.14), ('teal', 0.08))):
        bottle(b, -0.38 + i * 0.07, 0.06 - i % 2 * 0.05, 0.755, h, 0.024, m, cap='gold', neck=0.4)
    b.lathe('white', 0.35, 0, 0.755, [(0.05, 0), (0.06, 0.05), (0.05, 0.055), (0, 0.06)], n=10)
    b.box('brown', 0.12, -0.08, 0.755, 0.05, 0.2, 0.02, bev=0.006, rz=25)             # hair brush
    b.box('red', -0.1, -0.1, 0.755, 0.018, 0.018, 0.07)


@asset('vanity_stool', G)
def vanity_stool(b):
    b.soft('fabric', 0, 0, 0.4, 0.44, 0.34, 0.08, r=0.03)
    b.box('wood', 0, 0, 0.35, 0.42, 0.32, 0.06, bev=0.006)
    legs(b, 'wood', 0, 0, 0.4, 0.3, 0.35, t=0.045, taper=0.55)
    return {'seat': [[0, 0, 0.47]]}


@asset('crib', G)
def crib(b):
    W, L, H = 0.72, 1.3, 0.95
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box('white', sx * W / 2, sy * L / 2, 0, 0.05, 0.05, H, bev=0.008, edges='zT')
        for z in (0.32, H - 0.07):
            b.box('white', sx * W / 2, 0, z, 0.03, L - 0.05, 0.045, bev=0.006, skip='fk')
        for i in range(13):
            b.box('white', sx * W / 2, -L / 2 + 0.09 + i * (L - 0.18) / 12, 0.36, 0.016, 0.016, H - 0.43, skip='tb')
    for sy in (-1, 1):
        b.box('white', 0, sy * L / 2, 0.32, W - 0.05, 0.03, H - 0.3, bev=0.006, skip='lr')
        b.prism('white', [(-0.36, 0), (0.36, 0), (0.25, 0.08), (0, 0.11), (-0.25, 0.08)], sy * L / 2 - 0.015, sy * L / 2 + 0.015, plane='xz', z=H + 0.02)
        b.prism('blue_l', [(0, 0.2), (0.07, 0.07), (0.2, 0.06), (0.1, -0.04), (0.13, -0.18), (0, -0.1), (-0.13, -0.18), (-0.1, -0.04), (-0.2, 0.06), (-0.07, 0.07)],
                sy * L / 2 - sy * 0.019, sy * L / 2 - sy * 0.015, plane='xz', z=0.68)
    b.box('white', 0, 0, 0.3, W - 0.04, L - 0.04, 0.03, skip='b')
    b.soft('offwhite', 0, 0, 0.33, W - 0.07, L - 0.07, 0.1, r=0.03)
    b.soft('blue_l', 0, -0.22, 0.38, W - 0.06, L * 0.55, 0.08, r=0.03)
    b.soft('white', 0, 0.42, 0.42, 0.36, 0.24, 0.07, r=0.03)
    _teddy(b, 0.16, 0.18, 0.43, 0.8)


def _teddy(b, x, y, z, s=1.0, m='tan'):
    b.ball(m, x, y, z + 0.09 * s, 0.085 * s, n=8, rings=4, sz=1.1)
    b.ball(m, x, y - 0.01 * s, z + 0.22 * s, 0.065 * s, n=8, rings=4)
    b.ball('cream', x, y - 0.06 * s, z + 0.205 * s, 0.03 * s, n=6, rings=3)
    b.ball('black', x, y - 0.088 * s, z + 0.212 * s, 0.01 * s, n=4, rings=2)
    for sx in (-1, 1):
        b.ball(m, x + sx * 0.05 * s, y, z + 0.28 * s, 0.026 * s, n=6, rings=3)
        b.ball(m, x + sx * 0.09 * s, y - 0.02 * s, z + 0.13 * s, 0.035 * s, n=6, rings=3, sz=1.4)
        b.ball(m, x + sx * 0.06 * s, y - 0.07 * s, z + 0.03 * s, 0.04 * s, n=6, rings=3)
        b.ball('black', x + sx * 0.025 * s, y - 0.062 * s, z + 0.24 * s, 0.008 * s, n=4, rings=2)


@asset('toy_box', G)
def toy_box(b):
    W, D, H = 0.8, 0.45, 0.42
    b.box('blue', 0, 0, 0, W, D, H, bev=0.012, skip='t')
    basin(b, 'blue_d', 0, 0, 0.14, W - 0.05, D - 0.05, H - 0.14, bev=0.0, taper=1.0, rim=0.02, rim_w=0.025, rim_m='blue')
    for sx in (-1, 1):
        b.box('yellow', sx * 0.25, -D / 2 - 0.004, 0.12, 0.16, 0.008, 0.16, bev=0.03, edges='y', skip='k')
        b.box('rubber', sx * (W / 2 + 0.006), 0, 0.28, 0.012, 0.14, 0.03, bev=0.004)
    b.box('red', 0, -D / 2 - 0.004, 0.02, W, 0.008, 0.04, skip='k')
    b.box('blue', 0, D / 2 + 0.06, 0.4, W, 0.025, 0.4, bev=0.008, rx=-12)             # lid leaning open
    b.ball('red', -0.22, 0, 0.36, 0.1, n=10, rings=5)
    b.lathe('white', -0.22, 0, 0.36, [(0.102, -0.012), (0.102, 0.012)], n=10, caps=(False, False))
    _teddy(b, 0.2, 0.05, 0.22, 1.0)
    for i, (x, y, z, m, rz) in enumerate(((0.0, -0.08, 0.3, 'yellow', 10), (0.07, -0.1, 0.3, 'green', -20), (0.03, -0.08, 0.37, 'red', 30), (-0.06, 0.1, 0.3, 'orange', 0))):
        b.box(m, x, y, z, 0.07, 0.07, 0.07, bev=0.006, rz=rz)
    b.box('green', -0.5, -0.1, 0, 0.07, 0.07, 0.07, bev=0.006, rz=30)                 # strays on the floor
    b.box('yellow', -0.52, 0.02, 0, 0.07, 0.07, 0.07, bev=0.006, rz=-15)
    b.box('char', 0.52, -0.08, 0.012, 0.16, 0.07, 0.035, bev=0.01, rz=20)            # toy car
    b.box('red', 0.52, -0.08, 0.03, 0.17, 0.075, 0.03, bev=0.01, rz=20)
    b.box('red', 0.515, -0.08, 0.058, 0.08, 0.065, 0.028, bev=0.01, rz=20)


@asset('bathtub', G)
def bathtub(b):
    W, D, H = 1.6, 0.76, 0.56
    b.box('porcelain', 0, 0, 0, W, D, H - 0.02, bev=0.012, edges='z', skip='t')
    basin(b, 'porcelain', 0, 0, 0.1, W - 0.16, D - 0.16, H - 0.1, bev=0.1, taper=1.14, rim=0.03, rim_w=0.08)
    b.box('porcelain', 0, -D / 2 - 0.004, 0.06, W - 0.1, 0.008, H - 0.16, bev=0.006, edges='F', skip='k')
    b.cyl('chrome', 0.5, 0, 0.102, 0.03, 0.004, n=8)
    b.box('chrome', 0.76, 0, H + 0.0, 0.05, 0.2, 0.02, bev=0.005)
    b.tube('chrome', [(0.76, 0, H + 0.02), (0.76, 0, H + 0.1), (0.7, 0, H + 0.13), (0.62, 0, H + 0.1)], 0.016, n=6)
    for sy in (-1, 1):
        b.cyl('chrome', 0.76, sy * 0.07, H + 0.02, 0.014, 0.04, n=6)
        b.cyl('enamel_r' if sy < 0 else 'enamel_b', 0.76, sy * 0.07, H + 0.06, 0.026, 0.014, n=6)
    b.box('pink', -0.62, -0.31, H, 0.09, 0.06, 0.03, bev=0.012)
    bottle(b, -0.72, 0.3, H, 0.2, 0.035, 'teal', cap='white', label='white')
    bottle(b, -0.62, 0.31, H, 0.16, 0.03, 'yellow', cap='red')
    b.ball('yellow', -0.3, 0.33, H + 0.035, 0.045, n=7, rings=4, sz=0.8)                # rubber duck
    b.ball('yellow', -0.3, 0.3, H + 0.085, 0.028, n=6, rings=3)
    b.box('orange', -0.3, 0.27, H + 0.075, 0.02, 0.025, 0.008)
    towel(b, 'blue_l', 0.1, -D / 2 - 0.012, H + 0.005, 0.5, 0.3, stripe='white', t=0.02)


@asset('shower_stall', G)
def shower_stall(b):
    W, H = 0.9, 2.0
    b.box('porcelain', 0, 0, 0, W, W, 0.1, bev=0.012)
    basin(b, 'porcelain', 0, 0, 0.06, W - 0.12, W - 0.12, 0.042, bev=0.03, taper=1.06)
    b.cyl('chrome', 0, 0, 0.062, 0.035, 0.003, n=8)
    for x, y in ((-0.43, -0.43), (0.43, -0.43), (-0.43, 0.43)):
        b.box('chrome', x, y, 0.1, 0.03, 0.03, H - 0.1)
    for z in (0.1, H - 0.03):
        b.box('chrome', 0, -0.43, z, W - 0.09, 0.03, 0.03, skip='lr')
        b.box('chrome', -0.43, 0, z, 0.03, W - 0.09, 0.03, skip='fk')
    b.box('clear', -0.43, 0, 0.13, 0.008, W - 0.09, H - 0.16, skip='tbfk')
    b.box('clear', -0.2, -0.43, 0.13, 0.37, 0.008, H - 0.16, skip='tblr')
    b.box('clear', 0.2, -0.435, 0.13, 0.4, 0.008, H - 0.16, skip='tb')              # sliding door
    b.box('chrome', 0.005, -0.435, 0.13, 0.02, 0.014, H - 0.16)
    pull(b, 'chrome', 0.06, -0.44, 1.05, L=0.22, vert=True, r=0.008, out=0.035)
    # wall side (+Y): riser, head and mixer; shelf with bottles on +X side
    b.tube('chrome', [(0.1, 0.43, 1.1), (0.1, 0.43, 1.95), (0.1, 0.28, 1.98), (0.1, 0.22, 1.93)], 0.012, n=6)
    b.lathe('chrome', 0.1, 0.22, 1.93, [(0.015, 0), (0.07, -0.04), (0.07, -0.05)], n=10, rx=25)
    b.cyl('chrome', 0.1, 0.44, 1.1, 0.045, 0.03, n=10, axis='y', rz=180)
    b.box('chrome', 0.1, 0.4, 1.09, 0.02, 0.02, 0.07, bev=0.005, rz=0, ry=35)
    b.box('chrome', 0.3, 0.38, 1.3, 0.22, 0.1, 0.01)
    bottle(b, 0.25, 0.38, 1.31, 0.19, 0.03, 'green_l', cap='white', label='white')
    bottle(b, 0.34, 0.38, 1.31, 0.15, 0.032, 'orange', cap='char')
    b.box('white', 0.3, 0.33, 0.9, 0.1, 0.05, 0.03, bev=0.01)
    return {'stand': [[0, 0, 0.1]]}


@asset('toilet', G)
def toilet(b):
    P = 'porcelain'
    b.lathe(P, 0, -0.06, 0, [(0.14, 0), (0.15, 0.02), (0.12, 0.14), (0.13, 0.24), (0.2, 0.36), (0.215, 0.39), (0.2, 0.4), (0.15, 0.39), (0.1, 0.24), (0, 0.22)], n=12, sy=1.25)
    b.box(P, 0, 0.14, 0, 0.26, 0.24, 0.38, bev=0.03, edges='z')
    b.lathe('white', 0, -0.06, 0.4, [(0.215, 0), (0.22, 0.012), (0.21, 0.022), (0.13, 0.022), (0.125, 0.0)], n=12, sy=1.25, caps=(False, False))   # seat
    b.box(P, 0, 0.26, 0.38, 0.5, 0.2, 0.38, bev=0.02)
    b.box(P, 0, 0.26, 0.76, 0.53, 0.225, 0.035, bev=0.012)
    b.box('chrome', -0.2, 0.152, 0.68, 0.07, 0.02, 0.018, bev=0.004)
    b.lathe('white', 0, 0.118, 0.46, [(0.215, 0), (0.22, 0.012), (0.2, 0.024), (0, 0.024)], n=12, sy=1.25, rx=98, caps=(False, True))         # lid up
    b.box('chrome', 0, 0.15, 0.4, 0.2, 0.03, 0.02)
    for sx in (-1, 1):
        b.cyl('white', sx * 0.1, 0.1, 0.0, 0.016, 0.02, n=6)
    b.tube('chrome', [(0.2, 0.3, 0.38), (0.2, 0.3, 0.2), (0.2, 0.4, 0.16)], 0.008, n=5)
    return {'seat': [[0, -0.05, 0.43]]}


@asset('sink_pedestal', G)
def sink_pedestal(b):
    P = 'porcelain'
    b.lathe(P, 0, 0.05, 0, [(0.12, 0), (0.125, 0.03), (0.08, 0.1), (0.07, 0.5), (0.11, 0.68)], n=10, sy=0.8)
    b.lathe(P, 0, -0.04, 0.66, [(0.12, 0), (0.24, 0.1), (0.3, 0.17), (0.3, 0.2), (0.27, 0.2), (0.25, 0.2)], n=14, sy=0.82, caps=(True, False))
    k = b.mark()
    b.lathe(P, 0, -0.04, 0.74, [(0.25, 0.12), (0.2, 0.05), (0.08, 0.0), (0, 0.0)], n=14, sy=0.82, caps=(False, False))
    b.box(P, 0, 0.22, 0.66, 0.6, 0.12, 0.2, bev=0.02)
    tap(b, 0, 0.2, 0.86, h=0.1, reach=0.12, spread=0.1)
    b.cyl('chrome', 0, -0.04, 0.742, 0.022, 0.003, n=8)
    b.box('pink', 0.22, 0.21, 0.86, 0.07, 0.045, 0.025, bev=0.01)
    b.tube('chrome', [(0, 0.12, 0.6), (0, 0.2, 0.5), (0, 0.28, 0.5)], 0.016, n=6)


@asset('sink_vanity', G, surface=0.84)
def sink_vanity(b):
    W, D = 0.9, 0.5
    b.box('char', 0, 0.03, 0, W - 0.03, D - 0.1, 0.09, skip='tb')
    b.box('white', 0, 0, 0.09, W, D, 0.7, bev=0.006, edges='z')
    fronts(b, 'white', 0, -D / 2, 0.1, W - 0.02, 0.68, [(1, 'o'), (3.4, 'lr')], hm='chrome', hz=0.8)
    b.box('white', 0, -D / 2 - 0.009, 0.63, W - 0.026, 0.018, 0.145, bev=0.006, skip='k')
    for x, y, w, dd in ((-0.34, 0, 0.26, D + 0.03), (0.34, 0, 0.26, D + 0.03), (0, -0.21, 0.42, 0.11), (0, 0.2, 0.42, 0.13)):
        b.box('paint__counter:#d6d0c2', x, y - 0.012, 0.79, w, dd, 0.04, bev=0.008, edges='F')
    b.box('paint__counter:#d6d0c2', 0, D / 2 - 0.01, 0.83, W, 0.02, 0.08, skip='b')
    basin(b, 'porcelain', 0, -0.035, 0.7, 0.42, 0.3, 0.135, bev=0.08, taper=1.2)
    b.cyl('chrome', 0, -0.035, 0.702, 0.02, 0.003, n=8)
    tap(b, 0, 0.17, 0.83, h=0.1, reach=0.11, spread=0.09)
    dish(b, 'mug', 0.33, 0.12, 0.83, 0.035, 0.09, 'blue_l')
    b.box('red', 0.325, 0.12, 0.86, 0.008, 0.008, 0.13, ry=12)
    b.box('green', 0.335, 0.125, 0.86, 0.008, 0.008, 0.13, ry=-10)
    bottle(b, -0.34, 0.13, 0.83, 0.16, 0.035, 'white', cap='blue', label='blue_l', neck=0.3)
    b.box('green_l', -0.3, -0.05, 0.83, 0.08, 0.05, 0.025, bev=0.01)
    towel(b, 'mint', 0.25, -D / 2 - 0.045, 0.6, 0.22, 0.26, t=0.014)
    b.rod('chrome', (0.1, -D / 2 - 0.038, 0.6), (0.4, -D / 2 - 0.038, 0.6), 0.007, n=5)
    for x in (0.1, 0.4):
        b.rod('chrome', (x, -D / 2 - 0.038, 0.6), (x, -D / 2 - 0.01, 0.6), 0.007, n=5)


@asset('bath_mirror_cabinet', G, mount='wall')
def bath_mirror_cabinet(b):
    z, W, H, D = 1.25, 0.62, 0.66, 0.13
    b.box('white', 0, -D / 2, z, W, D, H, bev=0.008)
    for sx in (-1, 1):
        b.box('mirror', sx * W / 4, -D - 0.004, z + 0.02, W / 2 - 0.024, 0.008, H - 0.04, bev=0.003, skip='k')
        b.box('chrome', sx * 0.03, -D - 0.012, z + 0.06, 0.012, 0.008, 0.07)
    b.box('chrome', 0, -D / 2 - 0.01, z + H, W - 0.1, 0.07, 0.04, bev=0.01)
    for i in range(3):
        b.ball('lamp', (i - 1) * 0.18, -D / 2 - 0.03, z + H + 0.06, 0.04, n=8, rings=4)
        b.cyl('chrome', (i - 1) * 0.18, -D / 2 - 0.03, z + H + 0.03, 0.02, 0.02, n=6)


@asset('towel_rail', G, mount='wall')
def towel_rail(b):
    z = 1.2
    b.rod('chrome', (-0.36, -0.07, z), (0.36, -0.07, z), 0.01, n=6)
    for sx in (-1, 1):
        b.rod('chrome', (sx * 0.34, 0, z), (sx * 0.34, -0.07, z), 0.01, n=6)
        b.cyl('chrome', sx * 0.34, -0.012, z, 0.03, 0.012, n=8, axis='y')
        b.ball('chrome', sx * 0.37, -0.07, z, 0.014, n=6, rings=3)
    towel(b, 'fabric', -0.13, -0.085, z, 0.3, 0.45, stripe='cream', t=0.018)
    towel(b, 'white', 0.18, -0.085, z, 0.2, 0.3, stripe='blue_l', t=0.018)


@asset('laundry_basket', G)
def laundry_basket(b):
    b.lathe('tan', 0, 0, 0, [(0.17, 0), (0.18, 0.02), (0.225, 0.5), (0.24, 0.5), (0.24, 0.54), (0.21, 0.54), (0.2, 0.5), (0, 0.5)], n=12)
    for z in (0.1, 0.22, 0.34, 0.44):
        r = 0.18 + 0.045 * z / 0.5
        b.lathe('#8a7350', 0, 0, z, [(r + 0.004, 0), (r + 0.006, 0.03)], n=12, caps=(False, False))
    for sx in (-1, 1):
        b.tube('#8a7350', [(sx * 0.235, -0.06, 0.52), (sx * 0.29, -0.06, 0.5), (sx * 0.29, 0.06, 0.5), (sx * 0.235, 0.06, 0.52)], 0.012, n=5)
    b.soft('blue_l', -0.04, 0.02, 0.48, 0.3, 0.26, 0.1, r=0.04, rz=20)
    b.soft('white', 0.06, -0.05, 0.53, 0.22, 0.2, 0.08, r=0.035, rz=-25)
    b.soft('red', 0.18, 0.0, 0.42, 0.1, 0.16, 0.16, r=0.035, ry=30)
    b.soft('yellow', -0.03, 0.08, 0.56, 0.14, 0.12, 0.06, r=0.025, rz=40)


def _laundry_panel(b, W, D, H):
    b.box('enamel', 0, D / 2 - 0.06, H, W, 0.12, 0.16, bev=0.02, edges='TF')
    b.box('char', 0, D / 2 - 0.123, H + 0.03, W - 0.08, 0.006, 0.1, skip='k')
    for x in (-0.2, 0.2):
        b.cyl('silver', x, D / 2 - 0.125, H + 0.08, 0.035, 0.03, n=10, axis='y', rz=180)
        b.box('char', x, D / 2 - 0.157, H + 0.075, 0.008, 0.004, 0.035)
    for i in range(4):
        b.box(('white', 'white', 'white', 'ledr')[i], -0.06 + i * 0.04, D / 2 - 0.128, H + 0.065, 0.025, 0.006, 0.03, skip='k')


@asset('washer', G, surface=0.92)
def washer(b):
    W, D, H = 0.68, 0.66, 0.92
    b.box('char', 0, 0.02, 0, W - 0.04, D - 0.08, 0.06, skip='tb')
    b.box('enamel', 0, 0, 0.06, W, D, H - 0.06, bev=0.014, edges='zT')
    b.box('enamel', 0, -0.06, H, W - 0.1, D - 0.24, 0.016, bev=0.006)                 # top lid
    b.box('char', 0, -D / 2 + 0.07, H + 0.016, 0.14, 0.03, 0.006)
    b.box('grey_l', 0, -D / 2 - 0.003, 0.1, W - 0.06, 0.006, 0.02, skip='k')
    _laundry_panel(b, W, D, H)
    b.box('orange', 0.2, 0.06, H + 0.016, 0.14, 0.09, 0.22, bev=0.008)                # detergent box
    b.decal('prod5', 0.2, 0.012, H + 0.13, 0.11, 0.15)


@asset('dryer', G, surface=0.92)
def dryer(b):
    W, D, H = 0.68, 0.66, 0.92
    b.box('char', 0, 0.02, 0, W - 0.04, D - 0.08, 0.06, skip='tb')
    b.box('enamel', 0, 0, 0.06, W, D, H - 0.06, bev=0.014, edges='zT')
    b.lathe('enamel', 0, -D / 2, 0.5, [(0.25, 0), (0.25, -0.02), (0.23, -0.035), (0.17, -0.035), (0.16, -0.02)], n=16, axis='y', caps=(False, False))
    b.lathe('glass', 0, -D / 2, 0.5, [(0.16, -0.02), (0.1, -0.045), (0, -0.05)], n=16, axis='y', caps=(False, False))
    b.box('chrome', 0.23, -D / 2 - 0.04, 0.45, 0.03, 0.03, 0.1, bev=0.006)
    b.box('grey_l', 0, -D / 2 - 0.003, 0.1, W - 0.06, 0.006, 0.02, skip='k')
    _laundry_panel(b, W, D, H)
    b.soft('white', -0.1, -0.05, H, 0.34, 0.26, 0.05, r=0.02)                         # folded laundry
    b.soft('blue_l', -0.1, -0.05, H + 0.05, 0.32, 0.25, 0.05, r=0.02)
    b.soft('red', -0.1, -0.05, H + 0.1, 0.3, 0.24, 0.04, r=0.018)


@asset('water_heater', G)
def water_heater(b):
    r, H = 0.26, 1.5
    for i in range(3):
        a = math.radians(i * 120 + 30)
        b.box('steel_d', math.cos(a) * 0.19, math.sin(a) * 0.19, 0, 0.05, 0.05, 0.08)
    b.lathe('enamel', 0, 0, 0.08, [(r - 0.02, 0), (r, 0.02), (r, H - 0.12), (r - 0.03, H - 0.09), (r - 0.12, H - 0.08)], n=16)
    for z in (0.3, H - 0.25):
        b.lathe('grey_l', 0, 0, z, [(r + 0.003, 0), (r + 0.003, 0.015)], n=16, caps=(False, False))
    b.box('char', 0, -r - 0.01, 0.16, 0.2, 0.06, 0.16, bev=0.01)
    b.cyl('red', 0.04, -r - 0.04, 0.24, 0.025, 0.02, n=8, axis='y', rz=180)
    b.box('silver', -0.04, -r - 0.042, 0.2, 0.05, 0.004, 0.08, skip='k')
    b.decal('label', 0, -r - 0.004, 0.95, 0.2, 0.1)
    for sx, m in ((-1, 'copper'), (1, 'copper')):
        b.tube(m, [(sx * 0.1, 0, H - 0.01), (sx * 0.1, 0, H + 0.2), (sx * 0.1, 0.2, H + 0.3)], 0.014, n=6)
        b.cyl('brass', sx * 0.1, 0, H + 0.02, 0.022, 0.04, n=6)
    b.cyl('red', -0.1, 0, H + 0.12, 0.03, 0.012, n=6)
    b.cyl('steel', 0, 0.02, H - 0.01, 0.05, 0.25, n=10)                              # flue
    b.lathe('steel', 0, 0.02, H + 0.02, [(0.1, 0), (0.05, 0.06)], n=10, caps=(False, False))
    b.tube('copper', [(r - 0.01, 0, H - 0.25), (r + 0.04, 0, H - 0.25), (r + 0.04, 0, 0.15)], 0.01, n=5)
    b.box('brass', r + 0.01, 0, H - 0.27, 0.05, 0.04, 0.04, bev=0.006)

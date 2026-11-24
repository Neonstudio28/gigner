"""Furniture family: garage assets."""
import math
from furniture_kit import *

G = 'garage'


@asset('tool_chest_red', G, surface=1.05)
def tool_chest_red(b):
    W, D = 0.7, 0.46
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.cyl('black', sx * (W / 2 - 0.07) - 0.015, sy * (D / 2 - 0.07), 0.04, 0.04, 0.03, n=8, axis='x')
            b.box('steel_d', sx * (W / 2 - 0.07), sy * (D / 2 - 0.07), 0.06, 0.05, 0.05, 0.05)
    b.box('enamel_r', 0, 0, 0.11, W, D, 0.62, bev=0.012, edges='z')                        # roller cabinet
    for i, h in enumerate((0.2, 0.14, 0.1, 0.1)):
        z = 0.13 + sum((0.2, 0.14, 0.1, 0.1)[:i]) + i * 0.012
        b.box('enamel_r', 0, -D / 2 - 0.006, z, W - 0.04, 0.012, h, bev=0.005, edges='F', skip='k')
        b.box('chrome', 0, -D / 2 - 0.02, z + h - 0.03, W - 0.1, 0.016, 0.016)
    b.box('black', 0, 0, 0.73, W + 0.01, D + 0.01, 0.015)
    b.box('enamel_r', 0, 0.02, 0.745, W - 0.04, D - 0.06, 0.3, bev=0.012, edges='z')          # top box
    for i in range(3):
        b.box('enamel_r', 0, -D / 2 + 0.044, 0.76 + i * 0.075, W - 0.08, 0.012, 0.065, bev=0.005, edges='F', skip='k')
        b.box('chrome', 0, -D / 2 + 0.03, 0.8 + i * 0.075, W - 0.14, 0.014, 0.014)
    b.box('enamel_r', 0, 0.02, 1.045, W - 0.03, D - 0.05, 0.04, bev=0.012)
    b.box('chrome', 0, -D / 2 + 0.04, 1.03, 0.08, 0.012, 0.04)
    b.tube('chrome', [(W / 2, -0.1, 0.5), (W / 2 + 0.05, -0.1, 0.5), (W / 2 + 0.05, 0.1, 0.5), (W / 2, 0.1, 0.5)], 0.01, n=5)
    b.box('steel', -0.15, 0.0, 1.085, 0.3, 0.03, 0.012, rz=20)                             # spanner and rag on top
    b.soft('orange', 0.18, 0.02, 1.085, 0.2, 0.16, 0.03, r=0.012, rz=-15)


@asset('workbench', G, surface=0.9)
def workbench(b):
    W, D, H = 1.8, 0.7, 0.9
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box('steel_d', sx * (W / 2 - 0.06), sy * (D / 2 - 0.06), 0, 0.07, 0.07, H - 0.06)
        b.box('steel_d', sx * (W / 2 - 0.06), 0, 0.18, 0.05, D - 0.18, 0.05)
    b.box('wood_l', 0, 0, 0.2, W - 0.14, D - 0.1, 0.03)
    b.box('wood', 0, 0, H - 0.06, W, D, 0.06, bev=0.01)
    fronts(b, 'steel', -0.45, -D / 2 + 0.05, H - 0.22, 0.7, 0.15, [(1, 'dd')], hm='chrome', style='flat')
    # pegboard back with tools
    b.box('wood_ll', 0, D / 2 - 0.015, H, W, 0.03, 0.75, bev=0.004)
    b.box('wood', 0, D / 2 - 0.08, H + 0.75, W, 0.16, 0.03, bev=0.006)
    tools = ((-0.75, 'h'), (-0.55, 's'), (-0.3, 'w'), (-0.18, 'w'), (0.05, 'saw'), (0.35, 's'), (0.5, 'h'), (0.7, 'w'))
    y = D / 2 - 0.04
    for x, t in tools:
        z = H + 0.6
        b.cyl('steel', x, y, z, 0.005, 0.03, n=4, axis='y', rz=180)
        if t == 'h':
            b.box('wood_l', x, y - 0.02, z - 0.3, 0.025, 0.022, 0.28, bev=0.005)
            b.box('iron', x, y - 0.02, z - 0.03, 0.11, 0.03, 0.04, bev=0.006)
        elif t == 's':
            b.cyl('red' if x < 0 else 'yellow', x, y - 0.02, z - 0.1, 0.016, 0.1, n=6)
            b.cyl('steel', x, y - 0.02, z - 0.26, 0.005, 0.16, n=4)
        elif t == 'w':
            b.box('steel', x, y - 0.02, z - 0.26, 0.024, 0.008, 0.24)
            b.cyl('steel', x, y - 0.016, z - 0.02, 0.028, 0.008, n=6, axis='y', rz=180)
        else:
            b.prism('steel', [(-0.06, 0), (0.06, 0.02), (0.06, -0.36), (0.0, -0.36)], -0.003, 0.003, plane='xz', x=x, y=y - 0.02, z=z - 0.06)
            b.box('wood_r', x, y - 0.02, z - 0.08, 0.13, 0.024, 0.1, bev=0.01)
    # bench vice
    vx, vz = 0.6, H
    b.box('enamel_b', vx, -0.2, vz, 0.16, 0.2, 0.05, bev=0.01)
    b.box('enamel_b', vx, -0.16, vz + 0.05, 0.1, 0.12, 0.1, bev=0.01)
    for dy in (-0.25, -0.33):
        b.box('enamel_b', vx, dy, vz + 0.1, 0.14, 0.03, 0.1, bev=0.008)
        b.box('steel', vx, dy + (0.017 if dy < -0.3 else -0.017), vz + 0.17, 0.14, 0.006, 0.03)
    b.cyl('steel', vx, -0.42, vz + 0.12, 0.012, 0.2, n=6, axis='y')
    b.rod('steel', (vx - 0.09, -0.41, vz + 0.12), (vx + 0.09, -0.41, vz + 0.12), 0.006, n=4)
    # clutter: paint tins, oil can, jar of screws, plank, box
    for i, c in enumerate(('blue', 'white', 'green')):
        can(b, -0.7 + i * 0.13, 0.18, H, 0.055, 0.12, 'steel', band=c, n=8)
    b.lathe('red', -0.2, 0.2, H, [(0.05, 0), (0.05, 0.1), (0.01, 0.15), (0.006, 0.26)], n=8)
    b.cyl('clear', 0.05, 0.2, H, 0.04, 0.09, n=8)
    b.cyl('steel', 0.05, 0.2, H + 0.09, 0.042, 0.015, n=8)
    b.box('wood_l', -0.2, -0.12, H, 0.7, 0.09, 0.03, rz=6)
    b.box('yellow', 0.15, -0.15, H, 0.04, 0.2, 0.012, rz=-20)                              # tape measure and level
    b.box('tan', 0.6, 0.0, 0.23, 0.4, 0.3, 0.26, bev=0.006)
    b.box('enamel_r', -0.3, 0.0, 0.23, 0.44, 0.22, 0.2, bev=0.012)
    b.box('chrome', -0.3, 0.0, 0.43, 0.16, 0.03, 0.03, bev=0.008)
    b.box('panel', 0, D / 2 - 0.1, H + 0.73, 1.2, 0.08, 0.012, skip='t')


@asset('car_lift_2post', G, lift_range=[0.12, 1.8], width=3.3)
def car_lift_2post(b):
    """Two-post lift: posts 3.3 m apart across X, the car drives through along Y. `.arms` child slides on Z by `lift_range`."""
    for sx in (-1, 1):
        x = sx * 1.65
        b.box('steel_d', x, 0, 0, 0.5, 0.6, 0.025, bev=0.006)
        b.box('enamel_b', x, 0, 0.025, 0.28, 0.3, 2.8, bev=0.012, edges='z')
        b.box('char', x - sx * 0.142, 0, 0.1, 0.006, 0.12, 2.6)
        b.box('enamel_y', x, 0, 2.825, 0.3, 0.32, 0.06, bev=0.01)
        for i in range(4):
            b.cyl('iron', x + (i % 2 - 0.5) * 0.36, (i // 2 - 0.5) * 0.44, 0.025, 0.02, 0.02, n=6)
    b.box('enamel_y', 0, 0, 2.885, 3.6, 0.2, 0.1, bev=0.01)                                # overhead beam
    b.box('enamel_b', 1.65 + 0.2, -0.05, 1.0, 0.16, 0.2, 0.3, bev=0.012)                    # power unit
    b.cyl('char', 1.85, -0.05, 1.3, 0.07, 0.22, n=8)
    b.box('ledr', 1.85, -0.152, 1.16, 0.03, 0.006, 0.03)
    b.box('green', 1.85, -0.152, 1.08, 0.03, 0.006, 0.03)
    b.tube('black', [(1.85, 0.03, 1.0), (1.85, 0.12, 0.6), (1.7, 0.16, 0.1)], 0.012, n=4)
    p = b.part('arms', pivot=(0, 0, 0))
    for sx in (-1, 1):
        x = sx * 1.65
        p.box('enamel_y', x - sx * 0.2, 0, -0.02, 0.2, 0.36, 0.3, bev=0.012)
        for sy in (-1, 1):
            k = p.mark()
            p.box('enamel_y', -sx * 0.45, 0, 0, 0.9, 0.09, 0.08, bev=0.008)
            p.box('steel', -sx * 1.05, 0, 0.01, 0.5, 0.065, 0.055)
            p.cyl('rubber', -sx * 1.25, 0, 0.065, 0.07, 0.03, n=8)
            p.rot(k, 'z', sx * sy * -32); p.move(k, x - sx * 0.26, sy * 0.12, 0.0)
    return {}


@asset('floor_jack', G)
def floor_jack(b):
    for sx in (-1, 1):
        b.prism('enamel_r', [(-0.3, 0.03), (0.34, 0.03), (0.34, 0.1), (0.1, 0.16), (-0.3, 0.12)], sx * 0.09 - 0.01, sx * 0.09 + 0.01, plane='yz')
        b.cyl('iron', sx * 0.105 - 0.0125, -0.24, 0.035, 0.035, 0.025, n=8, axis='x')
        b.cyl('iron', sx * 0.13 - 0.015, 0.3, 0.03, 0.03, 0.03, n=8, axis='x')
    b.box('enamel_r', 0, 0.05, 0.04, 0.17, 0.5, 0.02)
    b.box('enamel_r', 0, -0.08, 0.1, 0.1, 0.4, 0.04, rx=-14, bev=0.008)                     # lift arm
    b.cyl('iron', 0, -0.26, 0.17, 0.055, 0.02, n=10)
    b.cyl('steel', 0, 0.2, 0.08, 0.035, 0.12, n=8, axis='y')
    b.box('enamel_r', 0, 0.33, 0.08, 0.08, 0.06, 0.08, bev=0.01)
    b.tube('steel', [(0, 0.34, 0.14), (0, 0.5, 0.5), (0, 0.6, 0.86)], 0.014, n=6)
    b.cyl('black', -0.08, 0.6, 0.86, 0.018, 0.16, n=6, axis='x')


@asset('compressor', G)
def compressor(b):
    for sx in (-1, 1):
        b.box('enamel_b', sx * 0.3, 0, 0, 0.05, 0.34, 0.2, bev=0.006, taper=(1, 0.5))
        if sx > 0:
            b.cyl('black', 0.32, 0, 0.09, 0.09, 0.04, n=10, axis='x')
        else:
            b.box('black', -0.3, 0, 0, 0.07, 0.36, 0.02)
    b.cyl('enamel_b', -0.45, 0, 0.36, 0.2, 0.9, n=12, axis='x')
    for sx in (-1, 1):
        b.lathe('enamel_b', sx * 0.45, 0, 0.36, [(0.2, 0), (0.17, sx * 0.05), (0.08, sx * 0.08), (0, sx * 0.085)], n=12, axis='x', caps=(False, False))
    b.box('enamel_b', 0, 0, 0.55, 0.6, 0.26, 0.03, bev=0.006)
    b.cyl('char', -0.22, 0, 0.58, 0.1, 0.24, n=10, axis='x')                               # motor
    for i in range(4):
        b.cyl('grey_d', -0.2 + i * 0.05, 0, 0.58, 0.105, 0.012, n=10, axis='x')
    b.box('iron', 0.18, 0, 0.58, 0.14, 0.14, 0.16, bev=0.01)                               # pump head with fins
    for i in range(5):
        b.box('grey_d', 0.18, 0, 0.6 + i * 0.03, 0.16, 0.16, 0.012)
    b.cyl('black', 0.27, 0, 0.66, 0.11, 0.03, n=10, axis='x')                              # belt guard
    b.tube('copper', [(0.18, 0.06, 0.74), (0.18, 0.14, 0.8), (0.05, 0.16, 0.6), (0.05, 0.12, 0.5)], 0.008, n=4)
    b.cyl('brass', 0.4, -0.12, 0.5, 0.012, 0.08, n=5)
    b.cyl('char', 0.4, -0.14, 0.6, 0.04, 0.02, n=10, axis='y')
    disc_decal(b, 'gauge', 0.4, -0.141, 0.6, 0.036, n=10)
    b.tube('yellow', [(0.5, 0.0, 0.3), (0.56, -0.1, 0.25), (0.56, -0.2, 0.3), (0.5, -0.24, 0.4), (0.46, -0.2, 0.46)], 0.012, n=4)   # coiled hose
    b.tube('steel', [(-0.5, 0.0, 0.56), (-0.62, 0.0, 0.7), (-0.74, 0, 0.74)], 0.014, n=5)   # handle
    b.cyl('black', -0.78, -0.1, 0.74, 0.018, 0.2, n=6, axis='y')


@asset('tyre_changer', G)
def tyre_changer(b):
    b.box('enamel_r', 0, 0, 0, 0.8, 0.7, 0.5, bev=0.016, edges='zT')
    b.box('char', 0, 0, 0, 0.82, 0.72, 0.04)
    for i in range(3):
        b.box('black', -0.2 + i * 0.14, -0.38, 0.03, 0.09, 0.14, 0.025, rx=10, bev=0.006)   # pedals
    b.cyl('steel', 0, -0.02, 0.5, 0.06, 0.12, n=8)
    b.cyl('steel_d', 0, -0.02, 0.6, 0.3, 0.03, n=14)                                      # turntable
    k = b.mark()
    b.box('steel', 0.2, -0.02, 0.63, 0.14, 0.05, 0.03, bev=0.006)
    b.radial(k, 4, pivot=(0, -0.02, 0))
    b.lathe('rubber', 0, -0.02, 0.66, [(0.2, 0.02), (0.3, 0), (0.33, 0.06), (0.33, 0.14), (0.3, 0.2), (0.2, 0.18)], n=14, caps=(False, False))   # tyre on the table
    b.lathe('silver', 0, -0.02, 0.68, [(0.2, 0), (0.2, 0.16), (0.16, 0.14), (0.05, 0.1), (0, 0.1)], n=14, caps=(False, False))
    b.box('enamel_r', 0.3, 0.28, 0.5, 0.14, 0.14, 1.1, bev=0.012, edges='z')                # column
    b.box('enamel_r', 0.2, 0.18, 1.5, 0.12, 0.44, 0.1, bev=0.012, rz=-45)                    # swing arm
    b.cyl('steel', 0.03, -0.0, 1.0, 0.022, 0.6, n=6)
    b.box('steel', 0.03, -0.02, 0.96, 0.06, 0.08, 0.05, bev=0.008)
    b.cyl('black', 0.03, -0.0, 1.6, 0.035, 0.05, n=8)
    b.box('enamel_r', -0.44, 0.1, 0.1, 0.06, 0.36, 0.34, bev=0.012)                         # bead breaker
    b.box('steel', -0.5, 0.0, 0.2, 0.03, 0.2, 0.24, bev=0.008)
    b.cyl('char', 0.3, 0.2, 0.9, 0.04, 0.02, n=10, axis='y', rz=180)
    disc_decal(b, 'gauge', 0.3, 0.179, 0.9, 0.036, n=10)
    b.tube('black', [(0.3, 0.2, 0.86), (0.36, 0.1, 0.7), (0.42, 0.12, 0.56)], 0.008, n=4)


@asset('parts_shelf', G, length=1.5)
def parts_shelf(b):
    W, D, H = 1.5, 0.5, 2.0
    rng = R(51)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box('enamel_b', sx * (W / 2 - 0.025), sy * (D / 2 - 0.025), 0, 0.05, 0.05, H, skip='b')
        b.rod('enamel_b', (sx * (W / 2 - 0.025), -D / 2 + 0.03, 0.2), (sx * (W / 2 - 0.025), D / 2 - 0.03, 0.6), 0.01, n=4)
        b.rod('enamel_b', (sx * (W / 2 - 0.025), D / 2 - 0.03, 1.0), (sx * (W / 2 - 0.025), -D / 2 + 0.03, 1.4), 0.01, n=4)
    for i in range(4):
        z = 0.12 + i * 0.5
        b.box('orange', 0, 0, z - 0.06, W - 0.04, D, 0.06, bev=0.006)
        b.box('wood_l', 0, 0, z, W - 0.06, D - 0.04, 0.012, skip='b')
        z += 0.012
        if i == 0:                                                                      # tyres standing in a row
            for j in range(4):
                b.lathe('rubber', -0.56 + j * 0.3, 0, z + 0.3, [(0.17, -0.09), (0.28, -0.1), (0.3, -0.05), (0.3, 0.05), (0.28, 0.1), (0.17, 0.09)], n=12, axis='x', caps=(False, False))
            b.box('enamel_r', 0.55, 0, z, 0.24, 0.3, 0.3, bev=0.012)
        elif i == 1:                                                                    # oil cans and boxes
            for j in range(5):
                can(b, -0.62 + j * 0.13, -0.08, z, 0.05, 0.24, ('yellow', 'red', 'blue', 'yellow', 'green')[j], band='white', n=6)
            for j in range(3):
                b.box(('tan', '#b99b6b', 'tan')[j], 0.15 + j * 0.24, 0, z, 0.22, 0.36, rng.uniform(0.18, 0.3), bev=0.006)
                b.box('white', 0.15 + j * 0.24, -0.182, z + 0.08, 0.1, 0.003, 0.06)
        elif i == 2:                                                                    # parts bins, exhaust, battery
            for j in range(6):
                c = ('blue', 'red', 'yellow')[j % 3]
                b.box(c, -0.6 + j * 0.16, -0.05, z, 0.14, 0.3, 0.12, taper=(1, 1.1), skip='t')
                b.box('steel', -0.6 + j * 0.16, -0.05, z + 0.08, 0.12, 0.26, 0.01, skip='b')
            b.box('char', 0.5, 0, z, 0.3, 0.18, 0.2, bev=0.01)
            for sx in (-1, 1):
                b.cyl('steel', 0.5 + sx * 0.09, 0, z + 0.2, 0.014, 0.025, n=6)
            b.box('white', 0.5, -0.092, z + 0.06, 0.2, 0.003, 0.08)
        else:
            b.cyl('steel_d', -0.6, 0.05, z + 0.08, 0.07, 0.6, n=8, axis='x')              # silencer box
            b.cyl('steel', -0.7, 0.05, z + 0.08, 0.025, 0.9, n=6, axis='x')
            b.box('tan', 0.5, 0, z, 0.36, 0.36, 0.24, bev=0.006)
            b.box('enamel_y', 0.1, -0.05, z, 0.14, 0.2, 0.2, bev=0.03)


@asset('oil_drum_pump', G)
def oil_drum_pump(b):
    b.lathe('enamel_b', 0, 0, 0, [(0.28, 0), (0.29, 0.01), (0.29, 0.28), (0.3, 0.29), (0.3, 0.31), (0.29, 0.32), (0.29, 0.58), (0.3, 0.59), (0.3, 0.61), (0.29, 0.62), (0.29, 0.88), (0.28, 0.9), (0.27, 0.88), (0, 0.88)], n=14)
    b.lathe('yellow', 0, 0, 0.36, [(0.292, 0), (0.292, 0.18)], n=14, caps=(False, False))
    b.box('white', 0, -0.294, 0.4, 0.2, 0.004, 0.1, skip='k')
    b.cyl('steel', 0.14, 0, 0.88, 0.03, 0.03, n=6)
    b.cyl('steel', -0.12, 0, 0.88, 0.035, 0.08, n=8)                                      # hand pump
    b.cyl('steel_d', -0.12, 0, 0.96, 0.05, 0.2, n=8)
    b.tube('steel', [(-0.12, 0, 1.16), (-0.12, 0, 1.3), (-0.12, -0.2, 1.3), (-0.12, -0.3, 1.2)], 0.016, n=6)
    b.tube('black', [(-0.12, 0.05, 1.05), (-0.12, 0.2, 1.2), (-0.12, 0.34, 1.16)], 0.012, n=5)
    b.cyl('red', -0.12, 0.34, 1.16, 0.02, 0.12, n=6, axis='y')
    b.lathe('steel', 0.3, -0.34, 0, [(0.12, 0), (0.14, 0.2), (0.15, 0.2)], n=10, caps=(True, False))   # drip bucket and funnel
    b.lathe('red', 0.12, 0.05, 0.9, [(0.012, 0), (0.012, 0.06), (0.09, 0.16)], n=8, caps=(False, False))
    b.cyl('black', 0, 0, 0.001, 0.4, 0.002, n=12, sy=0.8)                                  # oil stain


@asset('motel_bed', G)
def motel_bed(b):
    W, L = 1.5, 2.0
    b.box('wood_dd', 0, 0.02, 0, W - 0.1, L - 0.14, 0.14, skip='tb')
    b.soft('white', 0, 0, 0.14, W, L, 0.2, r=0.04)                                         # box spring
    b.soft('white', 0, 0, 0.34, W, L, 0.18, r=0.05)
    b.soft('paint__fabric:#c8643a', 0, -0.12, 0.36, W + 0.04, L - 0.22, 0.19, r=0.05)       # bedspread
    for i in range(4):
        b.box('paint__fabric2:#e3b83a', -0.56 + i * 0.37, -0.12, 0.552, 0.05, L - 0.3, 0.004, skip='b')
    b.box('paint__fabric2:#e3b83a', 0, -L / 2 + 0.3, 0.553, W - 0.1, 0.05, 0.004, skip='b')
    for sx in (-1, 1):
        b.soft('white', sx * 0.36, L / 2 - 0.22, 0.5, 0.62, 0.36, 0.12, r=0.045, rx=6)
    b.soft('teal', 0, L / 2 - 0.44, 0.56, 0.4, 0.2, 0.1, r=0.04, rx=-10)
    b.box('white', 0, L / 2 - 0.5, 0.535, W + 0.045, 0.2, 0.012, bev=0.004)                 # turned-down sheet
    # wall-style headboard with buttons and reading lamps
    b.box('wood', 0, L / 2 + 0.03, 0, W + 0.5, 0.06, 1.15, bev=0.01)
    b.soft('leather', 0, L / 2 - 0.02, 0.55, W + 0.2, 0.06, 0.5, r=0.02)
    for i in range(5):
        for j in range(2):
            b.cyl('wood_dd', -0.6 + i * 0.3, L / 2 - 0.05, 0.7 + j * 0.2, 0.015, 0.008, n=6, axis='y', rz=180)
    for sx in (-1, 1):
        b.tube('brass', [(sx * 0.9, L / 2, 1.0), (sx * 0.9, L / 2 - 0.12, 1.05), (sx * 0.82, L / 2 - 0.2, 1.0)], 0.008, n=4)
        b.lathe('cream', sx * 0.82, L / 2 - 0.2, 0.9, [(0.07, 0), (0.035, 0.1)], n=8, caps=(False, True))
        b.cyl('lamp', sx * 0.82, L / 2 - 0.2, 0.9, 0.06, 0.004, n=8)
    return {'seat': [[-0.78, 0, 0.56], [0.78, 0, 0.56]], 'sleep': [[-0.36, 0.1, 0.58], [0.36, 0.1, 0.58]]}


@asset('motel_desk', G, surface=0.76)
def motel_desk(b):
    """Long laminate dresser-desk (r14) with a mirror, lamp, ice bucket and a tucked chair. Back at y = +0.25."""
    W, D, H = 1.8, 0.5, 0.76
    b.box('wood', 0, 0, H - 0.04, W, D, 0.04, bev=0.01)
    b.box('wood', -0.5, 0, 0.1, 0.8, D - 0.04, H - 0.14, bev=0.006, edges='z')
    b.box('wood_dd', -0.5, 0.02, 0, 0.76, D - 0.1, 0.1, skip='tb')
    fronts(b, 'wood_d', -0.5, -D / 2 + 0.02, 0.11, 0.78, H - 0.16, [(1, 'dd'), (1, 'dd'), (1, 'dd')], hm='brass')
    b.box('wood', W / 2 - 0.02, 0, 0, 0.04, D - 0.04, H - 0.04, bev=0.006, edges='z')
    b.box('wood_d', 0.44, D / 2 - 0.04, 0.3, 0.86, 0.02, 0.42)
    b.box('wood', 0.3, D / 2 - 0.02, H, 1.0, 0.03, 0.9, bev=0.008)                           # mirror
    b.box('mirror', 0.3, D / 2 - 0.037, H + 0.06, 0.9, 0.004, 0.78, skip='k')
    b.lathe('paint__lampbase:#3f8f8c', -0.6, 0.05, H, [(0.07, 0), (0.07, 0.015), (0.03, 0.04), (0.06, 0.12), (0.06, 0.2), (0.02, 0.28), (0.015, 0.34)], n=10)
    shade(b, 'cream', -0.6, 0.05, H + 0.3, 0.14, 0.09, 0.2, n=10)
    b.cyl('lamp', -0.6, 0.05, H + 0.34, 0.03, 0.1, n=6)
    b.lathe('steel', 0.0, 0.05, H, [(0.07, 0), (0.085, 0.16), (0.09, 0.16)], n=10, caps=(True, False))   # ice bucket and glasses
    b.cyl('white', 0.0, 0.05, H + 0.14, 0.08, 0.01, n=10)
    for i in range(2):
        b.lathe('clear', 0.16 + i * 0.08, 0.0, H, [(0.026, 0), (0.032, 0.09)], n=7, caps=(True, False))
    b.box('char', 0.55, 0.05, H, 0.2, 0.22, 0.05, bev=0.012, taper=(0.9, 0.8))               # telephone
    b.box('char', 0.55, 0.12, H + 0.05, 0.22, 0.05, 0.035, bev=0.014)
    disc_decal(b, 'rotary', 0.55, 0.03, H + 0.052, 0.055, n=10, face='t')
    b.box('white', 0.75, -0.08, H, 0.12, 0.18, 0.004, rz=10, skip='b')
    b.box('red_d', -0.28, -0.05, H, 0.16, 0.22, 0.03, bev=0.005, rz=-12)                    # Bible
    k = b.mark()
    chair_frame(b, 'wood_d', w=0.44, d=0.44, sh=0.45, bh=0.9, seat='paint__fabric:#c8643a')
    b.rot(k, 'z', 180); b.move(k, 0.44, -0.3, 0)
    return {'seat': [[0.44, -0.3, 0.5]], 'seat_facing': [0, 1, 0]}


@asset('luggage_rack', G, surface=0.5)
def luggage_rack(b):
    for sy in (-1, 1):
        for sx in (-1, 1):
            b.rod('wood', (sx * 0.3, sy * 0.2, 0), (-sx * 0.3, sy * 0.2, 0.5), 0.016, n=5)
        b.cyl('brass', 0, sy * 0.2 - 0.02, 0.25, 0.014, 0.04, n=6, axis='y')
    for sx in (-1, 1):
        b.rod('wood', (sx * 0.3, -0.2, 0.5), (sx * 0.3, 0.2, 0.5), 0.018, n=5)
        b.rod('wood', (sx * 0.3, -0.2, 0.03), (sx * 0.3, 0.2, 0.03), 0.012, n=4)
    for i in range(4):
        b.box('#4a4d52', 0, -0.15 + i * 0.1, 0.512, 0.62, 0.05, 0.006)
    # suitcase and vanity case on top
    b.box('paint__case:#6b4a34', 0, 0, 0.52, 0.62, 0.4, 0.18, bev=0.025)
    b.box('brass', 0, -0.201, 0.6, 0.63, 0.006, 0.012)
    for sx in (-1, 1):
        b.box('brass', sx * 0.2, -0.205, 0.59, 0.04, 0.008, 0.04)
    b.tube('black', [(-0.07, -0.2, 0.62), (-0.07, -0.24, 0.62), (0.07, -0.24, 0.62), (0.07, -0.2, 0.62)], 0.008, n=4)
    b.box('teal', 0.1, 0.02, 0.7, 0.28, 0.2, 0.16, bev=0.02)
    b.box('chrome', 0.1, -0.082, 0.8, 0.05, 0.006, 0.03)


@asset('wall_ac_unit', G, mount='wall')
def wall_ac_unit(b):
    """Through-wall motel air conditioner under the window: back at y = 0, base 0.2 m above the floor."""
    z = 0.2
    W, D, H = 1.05, 0.22, 0.42
    b.box('beige', 0, -D / 2, z, W, D, H, bev=0.012)
    b.box('cream', 0, -D - 0.004, z + 0.03, W - 0.06, 0.008, H - 0.14, bev=0.006, edges='F', skip='k')
    for i in range(9):
        b.box('#8f8a7a', -0.1, -D - 0.009, z + 0.05 + i * 0.027, W - 0.34, 0.004, 0.012, skip='k')
    b.box('wood_d', 0.38, -D - 0.009, z + 0.05, 0.18, 0.004, 0.24, skip='k')                 # woodgrain control door
    for i in range(2):
        b.cyl('char', 0.34 + i * 0.08, -D - 0.011, z + 0.22, 0.022, 0.02, n=8, axis='y', rz=180)
    b.box('white', 0.38, -D - 0.012, z + 0.1, 0.12, 0.003, 0.06, skip='k')
    for i in range(14):
        b.box('#8f8a7a', -0.46 + i * 0.07, -D / 2 - 0.02, z + H + 0.001, 0.045, D - 0.1, 0.004, skip='b')
    b.box('char', 0, -D / 2, z - 0.02, W - 0.1, D - 0.06, 0.02)


@asset('ice_machine', G)
def ice_machine(b):
    W, D, H = 0.9, 0.75, 1.7
    b.box('char', 0, 0.02, 0, W - 0.06, D - 0.08, 0.1, skip='tb')
    b.box('enamel', 0, 0, 0.1, W, D, H - 0.1, bev=0.014, edges='zT')
    b.box('enamel_b', 0, -D / 2 - 0.004, H - 0.42, W - 0.06, 0.008, 0.34, bev=0.006, edges='F', skip='k')    # header
    for i in range(3):                                                                  # ice cube pictogram
        b.box('white', -0.22 + i * 0.2, -D / 2 - 0.012, H - 0.36 + (i % 2) * 0.06, 0.14, 0.006, 0.14, bev=0.02, edges='F', skip='k', ry=(-12, 8, -6)[i])
    b.box('panel', 0, -D / 2 - 0.004, H - 0.06, W - 0.06, 0.008, 0.04, skip='k')
    # sloped bin door
    b.box('steel', 0, -D / 2 - 0.02, 0.62, W - 0.1, 0.03, 0.56, bev=0.008, rx=-10)
    b.box('chrome', 0, -D / 2 - 0.09, 0.74, 0.4, 0.03, 0.03, bev=0.008)
    b.box('enamel', 0, -D / 2 - 0.02, 0.5, W, 0.1, 0.12, bev=0.012)
    for i in range(7):
        b.box('grey_d', 0, -D / 2 - 0.002, 0.16 + i * 0.03, W - 0.2, 0.004, 0.014, skip='k')
    b.box('white', 0.3, -D / 2 - 0.003, 1.02, 0.18, 0.004, 0.1, skip='k')
    b.lathe('steel', -0.62, -0.1, 0, [(0.09, 0), (0.11, 0.24), (0.115, 0.24)], n=10, caps=(True, False))     # ice bucket beside it
    b.tube('steel', [(-0.73, -0.1, 0.22), (-0.62, -0.1, 0.36), (-0.51, -0.1, 0.22)], 0.006, n=4)
    b.box('steel', 0.2, -D / 2 - 0.1, 0.56, 0.1, 0.16, 0.06, bev=0.01, rx=30)                # scoop


@asset('vending_indoor', G)
def vending_indoor(b):
    W, D, H = 0.95, 0.8, 1.83
    b.box('char', 0, 0.02, 0, W - 0.06, D - 0.08, 0.1, skip='tb')
    b.box('paint__vend:#b8332b', 0, 0, 0.1, W, D, H - 0.1, bev=0.014, edges='zT')
    b.box('panel', -0.14, -D / 2 - 0.004, 0.72, 0.58, 0.01, 1.02, bev=0.006, edges='F', skip='k')            # lit display
    b.decal('vend', -0.14, -D / 2 - 0.0095, 1.23, 0.56, 1.0)
    b.box('char', 0.31, -D / 2 - 0.004, 0.72, 0.24, 0.01, 1.02, bev=0.006, edges='F', skip='k')             # selection column
    for i in range(8):
        b.box(('red', 'orange', 'green', 'yellow', 'blue', 'white', 'purple', 'red')[i], 0.31, -D / 2 - 0.012, 1.02 + i * 0.085, 0.18, 0.008, 0.06, bev=0.004, edges='F', skip='k')
    b.box('steel', 0.31, -D / 2 - 0.012, 0.9, 0.16, 0.006, 0.08, skip='k')                                  # coin slot and return
    b.box('black', 0.31, -D / 2 - 0.016, 0.94, 0.012, 0.004, 0.035, skip='k')
    b.cyl('chrome', 0.31, -D / 2 - 0.01, 0.8, 0.025, 0.014, n=8, axis='y', rz=180)
    b.box('black', 0.31, -D / 2 - 0.014, 0.74, 0.1, 0.006, 0.03, skip='k')
    b.box('char', -0.05, -D / 2 - 0.004, 0.3, 0.6, 0.012, 0.22, bev=0.008, edges='F', skip='k')             # delivery chute
    b.box('black', -0.05, -D / 2 - 0.012, 0.33, 0.52, 0.006, 0.14, skip='k')
    b.box('steel', -0.05, -D / 2 - 0.03, 0.44, 0.52, 0.04, 0.02, rx=-30)
    b.box('white', 0, -D / 2 - 0.004, H - 0.08, W - 0.1, 0.006, 0.04, skip='k')
    for sx in (-1, 1):
        b.box('white', sx * (W / 2 + 0.002), 0, 0.5, 0.004, D - 0.1, 0.9, skip='')
        b.box('yellow', sx * (W / 2 + 0.005), 0, 0.8, 0.004, D - 0.2, 0.2)

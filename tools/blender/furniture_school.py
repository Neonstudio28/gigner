"""Furniture family: school classrooms, corridors, gym, cafeteria, library and labs."""
import math, random
from furniture_kit import *

G = 'school'


@asset('student_desk', G, surface=0.72)
def student_desk(b):
    """Classic combo desk: laminate top on a steel frame, book rack under, moulded seat on the same frame."""
    b.box('wood_l', 0, -0.1, 0.7, 0.62, 0.46, 0.025, bev=0.006)
    b.box('steel_d', 0, -0.1, 0.62, 0.56, 0.4, 0.012)
    b.box('steel_d', 0, -0.1, 0.6, 0.56, 0.012, 0.08)
    for sx in (-1, 1):
        b.rod('steel', (sx * 0.26, -0.3, 0), (sx * 0.26, -0.3, 0.7), 0.012)
        b.rod('steel', (sx * 0.26, 0.1, 0), (sx * 0.26, 0.1, 0.7), 0.012)
        b.rod('steel', (sx * 0.26, -0.3, 0.02), (sx * 0.26, 0.45, 0.02), 0.012)
        b.rod('steel', (sx * 0.2, 0.42, 0.02), (sx * 0.2, 0.42, 0.42), 0.012)
    b.box('blue', 0, 0.42, 0.42, 0.4, 0.38, 0.03, bev=0.01)
    b.box('blue', 0, 0.62, 0.62, 0.4, 0.03, 0.26, bev=0.01, rx=-8)
    b.rod('steel', (0, 0.6, 0.42), (0, 0.6, 0.6), 0.012)
    b.box('yellow', 0.12, -0.12, 0.727, 0.18, 0.012, 0.004, rz=12)
    return {'seat': [[0, 0.42, 0.45]]}


@asset('teacher_desk', G, surface=0.76, length=1.5)
def teacher_desk(b):
    """Steel teacher's desk, pedestal drawers, blotter, apple, books and a pencil cup."""
    carcass(b, 'grey_l', 0.45, 0, 0, 0.5, 0.72, 0.74)
    for i in range(3):
        drawer(b, 'grey_l', 0.45, -0.365, 0.12 + i * 0.22, 0.44, 0.18, hm='chrome')
    b.box('grey_l', -0.5, 0.3, 0, 0.04, 0.12, 0.74)
    b.box('grey_l', -0.05, 0.34, 0.1, 0.96, 0.02, 0.6)
    b.box('wood_l', 0, 0, 0.74, 1.5, 0.76, 0.03, bev=0.006)
    b.box('green_d', -0.2, -0.05, 0.771, 0.6, 0.42, 0.004)
    b.cyl('red', 0.45, -0.15, 0.81, 0.04, 0.07, n=10)
    b.cyl('black', -0.6, 0.2, 0.77, 0.035, 0.1, n=8)
    for i in range(4):
        b.box(('red_d', 'navy', 'green_d', 'mustard')[i], 0.55, 0.22, 0.77 + i * 0.035, 0.24, 0.18, 0.033, rz=(-4, 6, -2, 3)[i])
    return {'seat': [[0, 0.7, 0.46]]}


@asset('chalkboard', G, mount='wall', length=4.0, height=1.2)
def chalkboard(b):
    """Wall chalkboard: green slate in an oak frame, chalk tray, erasers, a map roller above."""
    z = 1.5
    b.box('wood', 0, -0.02, z - 0.62, 4.0, 0.04, 1.24, bev=0.008)
    b.box('#2f4a3a', 0, -0.045, z - 0.58, 3.86, 0.01, 1.16)
    b.box('wood', 0, -0.08, z - 0.64, 3.9, 0.09, 0.03)
    for x in (-1.2, 0.4):
        b.box('#d9c28a', x, -0.08, z - 0.61, 0.13, 0.05, 0.03)
    for x in (-0.6, -0.5, 0.9):
        b.cyl('white', x, -0.08, z - 0.605, 0.006, 0.08, n=5, axis='x')
    b.cyl('offwhite', 0, -0.06, z + 0.72, 0.035, 3.6, n=8, axis='x')
    b.box('#a7b9d0', 1.3, -0.04, z + 0.33, 0.9, 0.006, 0.36)
    for i, (x, w) in enumerate(((-1.3, 0.9), (-0.2, 1.1), (0.9, 0.5))):
        b.box('#c7d6c8', x, -0.052, z + (0.15 if i != 1 else -0.1) , w, 0.002, 0.012)
    b.box('white', -1.6, -0.052, z + 0.32, 0.4, 0.002, 0.02)


@asset('cork_board', G, mount='wall', length=1.8)
def cork_board(b):
    """Classroom bulletin board: cork, scalloped border, a spelling list, drawings and a calendar."""
    z = 1.7
    b.box('wood_l', 0, -0.015, z - 0.5, 1.8, 0.03, 1.0)
    b.box('#b88a58', 0, -0.032, z - 0.46, 1.72, 0.006, 0.92)
    for i in range(18):
        b.cyl(('red', 'yellow', 'blue')[i % 3], -0.84 + i * 0.099, -0.036, z + 0.44, 0.05, 0.004, n=8, axis='y')
    rng = random.Random(4)
    cols = ('#f1ede2', '#f3d36b', '#9fc5e8', '#f4b6c2', '#b6d7a8', '#ffffff')
    for i in range(9):
        x, zz = -0.6 + (i % 3) * 0.6, z + 0.2 - (i // 3) * 0.3
        b.box(cols[i % 6], x + rng.uniform(-0.05, 0.05), -0.037, zz - 0.11, 0.36, 0.003, 0.24, rz=0, ry=rng.uniform(-6, 6))
        b.cyl('red', x, -0.04, zz + 0.1, 0.01, 0.01, n=5, axis='y')


@asset('cubby_shelf', G, surface=0.9, length=2.4)
def cubby_shelf(b):
    """Low cubby unit: 3x8 boxes, backpacks, lunch boxes and a jacket hook rail above."""
    W, H, D = 2.4, 0.9, 0.4
    b.box('wood_l', 0, 0, 0, W, D, 0.03)
    b.box('wood_l', 0, 0, H - 0.03, W, D, 0.03)
    b.box('wood_l', 0, D / 2 - 0.01, 0, W, 0.02, H)
    for i in range(9):
        b.box('wood_l', -W / 2 + i * W / 8, 0, 0, 0.025, D, H)
    for j in (1, 2):
        b.box('wood_l', 0, 0, j * H / 3 - 0.01, W, D, 0.02)
    rng = random.Random(9)
    for i in range(8):
        for j in range(3):
            if rng.random() < 0.6:
                c = rng.choice(('red', 'blue', 'green', 'purple', 'orange', 'pink', 'navy', 'yellow'))
                x = -W / 2 + (i + 0.5) * W / 8
                b.soft(c, x, -0.02, j * H / 3 + 0.03, 0.22, 0.24, 0.2, r=0.04)
    return {'surface': H}


@asset('locker_bank', G, length=1.9, height=1.9)
def locker_bank(b):
    """Six steel hallway lockers: louvred doors, number plates, handles, a sloped top."""
    n, w, H, D = 6, 0.31, 1.83, 0.38
    b.box('steel_d', 0, 0, 0, n * w + 0.04, D, 0.1)
    for i in range(n):
        x = -n * w / 2 + (i + 0.5) * w
        b.box('enamel_b', x, 0, 0.1, w - 0.01, D, H - 0.1, bev=0.004)
        b.box('enamel_b', x, -D / 2 - 0.004, 0.14, w - 0.04, 0.008, H - 0.2)
        for j in range(5):
            b.box('steel_d', x, -D / 2 - 0.01, H - 0.2 - j * 0.04, w - 0.12, 0.006, 0.015)
            b.box('steel_d', x, -D / 2 - 0.01, 0.25 + j * 0.04, w - 0.12, 0.006, 0.015)
        b.box('chrome', x + w / 2 - 0.06, -D / 2 - 0.02, 0.95, 0.025, 0.03, 0.16)
        b.box('silver', x, -D / 2 - 0.012, H - 0.32, 0.07, 0.004, 0.035)
    b.box('enamel_b', 0, 0, H, n * w + 0.02, D, 0.03)
    b.box('enamel_b', 0, 0.04, H + 0.03, n * w + 0.02, D - 0.08, 0.08, rx=-14)


@asset('cafeteria_table', G, surface=0.74, length=3.0)
def cafeteria_table(b):
    """Mobile folding cafeteria table with attached stools on both sides."""
    b.box('#d8cfb8', 0, 0, 0.72, 3.0, 0.76, 0.03, bev=0.008)
    b.box('steel_d', 0, 0, 0.7, 3.0, 0.78, 0.02, skip='t')
    for sx in (-1, 1):
        b.box('steel', sx * 1.0, 0, 0.05, 0.08, 0.08, 0.66)
        b.rod('steel', (sx * 1.0, -0.6, 0.38), (sx * 1.0, 0.6, 0.38), 0.02)
        b.box('rubber', sx * 1.0, 0, 0, 0.2, 0.2, 0.05)
    for sy in (-1, 1):
        for i in range(4):
            x = -1.15 + i * 0.77
            b.rod('steel', (x, sy * 0.4, 0.38), (x, sy * 0.6, 0.38), 0.015)
            b.rod('steel', (x, sy * 0.6, 0.38), (x, sy * 0.6, 0.44), 0.015)
            b.cyl('blue', x, sy * 0.6, 0.44, 0.17, 0.035, n=12)
    for x, y, c in ((-0.8, -0.2, 'orange'), (0.6, 0.2, 'red'), (1.2, -0.18, 'green')):
        b.box('#c7b9a0', x, y, 0.75, 0.36, 0.26, 0.015)
        b.box(c, x + 0.08, y, 0.765, 0.1, 0.08, 0.02)
        b.box('white', x - 0.1, y + 0.05, 0.765, 0.05, 0.08, 0.1)
    return {'seat': [[x, sy * 0.6, 0.48] for x in (-1.15, -0.38, 0.39, 1.16) for sy in (-1, 1)]}


@asset('gym_bleachers', G, length=10.0, height=2.4)
def gym_bleachers(b):
    """Telescoping wooden gym bleachers, six rows, steel end rails and aisle step."""
    L, n = 10.0, 6
    for i in range(n):
        y = -1.8 + i * 0.6
        z = 0.4 + i * 0.4
        b.box('wood_l', 0, y + 0.3, z - 0.04, L, 0.32, 0.05, bev=0.006)
        b.box('wood_l', 0, y + 0.05, z - 0.4, L, 0.2, 0.03)
        b.box('steel_d', 0, y + 0.3, 0, L, 0.6, z - 0.06, skip='t')
    for sx in (-1, 1):
        for i in range(n):
            b.rod('steel', (sx * (L / 2 - 0.04), -1.8 + i * 0.6 + 0.3, 0.4 + i * 0.4), (sx * (L / 2 - 0.04), -1.8 + i * 0.6 + 0.3, 1.3 + i * 0.4), 0.02)
        b.rod('steel', (sx * (L / 2 - 0.04), -1.5, 1.3), (sx * (L / 2 - 0.04), 1.5, 3.3), 0.02)
    return {'seat': [[round(-4 + j * 2.0, 2), round(-1.5 + i * 0.6, 2), round(0.4 + i * 0.4, 2)] for i in range(n) for j in range(5)]}


@asset('basketball_backboard', G, mount='wall', height=4.0)
def basketball_backboard(b):
    """Gym wall-mounted backboard on a truss arm: glass board, orange rim, net, wall pad."""
    b.box('steel_d', 0, -0.05, 2.6, 0.12, 0.1, 1.4)
    b.rod('steel_d', (0, -0.05, 3.8), (0, -1.2, 3.4), 0.03)
    b.rod('steel_d', (0, -0.05, 2.7), (0, -1.2, 3.1), 0.03)
    b.box('clear', 0, -1.22, 2.9, 1.8, 0.025, 1.05)
    for z in (2.9, 3.91):
        b.box('white', 0, -1.24, z, 1.8, 0.01, 0.04)
    for z in (3.05, 3.47):
        b.box('orange', 0, -1.24, z, 0.59, 0.006, 0.03)
    for sx in (-1, 1):
        b.box('orange', sx * 0.28, -1.24, 3.05, 0.03, 0.006, 0.45)
    b.box('navy', 0, -1.25, 2.83, 1.84, 0.06, 0.1)
    b.cyl('orange', 0, -1.5, 3.05, 0.23, 0.02, n=16)
    b.cyl('white', 0, -1.5, 2.65, 0.15, 0.4, n=12, r2=0.22)
    b.box('navy', 0, -0.03, 0.2, 1.8, 0.06, 1.8)


@asset('lab_bench', G, surface=0.9, length=2.4)
def lab_bench(b):
    """Science lab bench: black resin top, oak cabinets, sink, gooseneck tap, gas cocks, glassware."""
    carcass(b, 'wood_l', 0, 0, 0, 2.4, 0.76, 0.86, toe=0.08)
    fronts(b, 'wood_l', 0, -0.38, 0.1, 2.3, 0.72, [(1, 'dddd'), (3, 'lrlr')], hm='chrome')
    b.box('black', 0, 0, 0.86, 2.5, 0.8, 0.04, bev=0.005)
    b.box('char', 0.7, 0, 0.87, 0.4, 0.34, 0.02)
    b.rod('chrome', (0.7, 0.25, 0.9), (0.7, 0.25, 1.2), 0.012)
    b.rod('chrome', (0.7, 0.25, 1.2), (0.7, 0.08, 1.12), 0.012)
    for x in (-0.6, -0.2):
        b.cyl('brass', x, 0.3, 0.9, 0.015, 0.08, n=6)
        b.rod('brass', (x, 0.3, 0.96), (x, 0.22, 0.96), 0.006)
    b.cyl('clear', -0.8, -0.1, 0.9, 0.05, 0.18, n=10, r2=0.02)
    b.cyl('clear_g', -0.4, -0.15, 0.9, 0.035, 0.12, n=10)
    b.cyl('clear_a', -0.3, 0.05, 0.9, 0.025, 0.16, n=8)
    b.box('iron', 0.1, -0.1, 0.9, 0.16, 0.12, 0.01)
    b.rod('iron', (0.1, -0.05, 0.9), (0.1, -0.05, 1.3), 0.008)
    b.cyl('iron', 0.1, -0.1, 1.1, 0.06, 0.01, n=10)
    return {'seat': [[x, -0.65, 0.66] for x in (-0.7, 0.0, 0.7)]}


@asset('lab_stool', G)
def lab_stool(b):
    b.cyl('wood_l', 0, 0, 0.62, 0.17, 0.04, n=12)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        b.rod('steel', (0.1 * math.cos(a), 0.1 * math.sin(a), 0.62), (0.2 * math.cos(a), 0.2 * math.sin(a), 0), 0.012)
    b.cyl('steel', 0, 0, 0.22, 0.17, 0.015, n=12, r2=0.17)
    return {'seat': [[0, 0, 0.66]]}


@asset('library_shelf', G, length=1.8, height=1.5)
def library_shelf(b):
    """Double-faced library stack full of books with a call-number header."""
    rng = R(7)
    zs, gap = shelf_unit(b, 'wood_l', 0, 0, 0, 1.8, 0.5, 1.5, 5, back='wood_l')
    for z in zs:
        books(b, -0.86, 0.86, -0.24, z, 0.2, min(0.25, gap - 0.02), rng)
        books(b, -0.86, 0.86, 0.04, z, 0.2, min(0.25, gap - 0.02), rng)
    b.box('white', 0, -0.26, 1.4, 0.5, 0.01, 0.07)


@asset('trophy_case', G, length=2.0, height=2.0)
def trophy_case(b):
    """Glass-fronted hallway trophy case: gold cups, plaques and a team pennant."""
    carcass(b, 'wood', 0, 0, 0, 2.0, 0.45, 0.8)
    b.box('wood', 0, 0.2, 0.8, 2.0, 0.05, 1.2)
    b.box('wood', 0, 0, 1.98, 2.04, 0.47, 0.04)
    for sx in (-1, 1):
        b.box('wood', sx * 0.99, 0, 0.8, 0.04, 0.45, 1.18)
    for z in (0.8, 1.38):
        b.box('clear', 0, 0, z + 0.01, 1.94, 0.4, 0.015)
        for i in range(5):
            x = -0.75 + i * 0.37
            tall = (i % 2) * 0.08
            b.box('black', x, 0, z + 0.02, 0.1, 0.1, 0.06)
            b.cyl('gold', x, 0, z + 0.08, 0.025, 0.12 + tall, n=8)
            b.cyl('gold', x, 0, z + 0.2 + tall, 0.04, 0.1, n=10, r2=0.075)
    b.box('clear', 0, -0.22, 0.8, 1.96, 0.01, 1.16)
    b.box('red_d', 0.4, 0.17, 1.6, 0.6, 0.01, 0.25)
    b.box('brass', -0.5, 0.17, 1.66, 0.3, 0.01, 0.22)


@asset('water_fountain', G)
def water_fountain(b):
    """Wall-hung stainless drinking fountain."""
    b.box('steel', 0, 0.1, 0.75, 0.42, 0.3, 0.32, bev=0.02)
    b.box('chrome', 0, 0.06, 1.06, 0.36, 0.22, 0.02)
    b.cyl('chrome', 0, 0.04, 1.08, 0.015, 0.04, n=6)
    b.box('chrome', 0.18, -0.06, 0.95, 0.04, 0.03, 0.06)


@asset('wall_clock_school', G, mount='wall')
def wall_clock_school(b):
    """Round classroom clock with a black rim."""
    b.cyl('black', 0, -0.02, 2.4, 0.18, 0.04, n=24, axis='y')
    b.cyl('white', 0, -0.042, 2.4, 0.16, 0.004, n=24, axis='y')
    b.box('black', 0.04, -0.046, 2.42, 0.1, 0.002, 0.01, ry=30)
    b.box('black', 0, -0.046, 2.45, 0.008, 0.002, 0.12)


@asset('overhead_projector', G)
def overhead_projector(b):
    """AV cart with an overhead projector."""
    for z in (0.1, 0.72):
        b.box('steel_d', 0, 0, z, 0.6, 0.45, 0.03)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.rod('steel', (sx * 0.28, sy * 0.2, 0.08), (sx * 0.28, sy * 0.2, 0.74), 0.012)
            b.cyl('rubber', sx * 0.28, sy * 0.2, 0, 0.04, 0.05, n=8, axis='x')
    b.box('grey_l', 0, 0, 0.75, 0.38, 0.38, 0.12, bev=0.01)
    b.box('clear', 0, 0, 0.87, 0.3, 0.3, 0.005)
    b.box('grey', 0, 0.16, 0.87, 0.04, 0.04, 0.42)
    b.box('black', 0, 0.06, 1.28, 0.12, 0.14, 0.1)


@asset('globe_stand', G)
def globe_stand(b):
    b.cyl('wood', 0, 0, 0, 0.16, 0.03, n=12)
    b.rod('brass', (0, 0, 0.03), (0, 0, 0.6), 0.012)
    for i in range(7):
        r = math.sin(math.pi * (i + 0.5) / 7) * 0.2
        b.cyl(('blue', 'green_l')[i % 2], 0, 0, 0.6 + i * 0.057, r, 0.057, n=14)


@asset('flag_classroom', G, mount='wall')
def flag_classroom(b):
    """Small US flag on a wall bracket."""
    b.rod('brass', (0, 0, 2.2), (0, -0.6, 2.55), 0.01)
    for i in range(7):
        b.box(('red', 'white')[i % 2], 0, -0.62, 2.5 - i * 0.05, 0.004, 0.45, 0.05)
    b.box('navy', 0.004, -0.5, 2.36, 0.006, 0.2, 0.15)

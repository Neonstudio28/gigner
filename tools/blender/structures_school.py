"""School grounds: aluminium stadium bleachers, press box, floodlights, goal posts, scoreboard, play structure, signs."""
import math, random
import structures_kit as K
from structures_kit import Kit

G = 'school'
K.PAL.update({
    'sc_alu': ('paint', '#c3c7ca'), 'sc_alu_d': ('paint', '#8d9296'), 'sc_galv': ('paint', '#a3a8ab'), 'sc_conc': ('paint', '#a19d95'),
    'sc_brick': ('paint', '#8e4a3a'), 'sc_navy': ('paint', '#1f2f55'), 'sc_gold': ('paint', '#d8a93a'), 'sc_white': ('paint', '#ecebe4'),
    'sc_red': ('paint', '#b3302a'), 'sc_green': ('paint', '#3f7a46'), 'sc_yellow': ('paint', '#e6c13a'), 'sc_blue': ('paint', '#2f62a8'),
    'sc_black': ('paint', '#1f2022'), 'sc_glass': ('paint', '#2b3a44'), 'sc_lamp': ('light', '#fff4d8'), 'sc_wood': ('paint', '#8a6a48'),
    'sc_rubber': ('paint', '#2a2a2c'), 'sc_tan': ('paint', '#cdb48a'), 'sc_orange': ('paint', '#dd7a2c'),
})


def stadium_bleachers():
    """Home-side aluminium bleachers: 10 rows of planks on galvanised frames, aisle stairs, back and side rails."""
    k = Kit('stadium_bleachers')
    L, n, run, rise = 30.0, 10, 0.75, 0.42
    frames = 11
    for i in range(n):
        y, z = i * run, 0.5 + i * rise
        k.box('sc_alu', 0, y + 0.18, z - 0.05, L, 0.28, 0.05)
        k.box('sc_alu_d', 0, y + 0.5, z - rise * 0.55, L, 0.22, 0.04)
    for f in range(frames):
        x = -L / 2 + 0.3 + f * (L - 0.6) / (frames - 1)
        k.beam('sc_galv', (x, -0.1, 0), (x, (n - 1) * run + 0.4, 0.5 + (n - 1) * rise), 0.1, 0.12)
        k.box('sc_galv', x, (n - 1) * run + 0.3, 0, 0.12, 0.12, 0.5 + (n - 1) * rise)
        k.box('sc_galv', x, (n - 1) * run * 0.5, 0, 0.1, 0.1, 0.5 + (n - 1) * rise * 0.5)
        k.box('sc_conc', x, (n - 1) * run * 0.5, -0.05, 0.3, (n - 1) * run + 0.8, 0.06)
    top = 0.5 + (n - 1) * rise
    for x in (-L / 2, L / 2):
        k.rod('sc_galv', (x, -0.1, 1.0), (x, (n - 1) * run + 0.35, top + 1.1), 0.03)
        k.rod('sc_galv', (x, -0.1, 0.1), (x, -0.1, 1.0), 0.03)
    for xx in (-L / 2, L / 2):
        pass
    for j in range(13):
        x = -L / 2 + j * L / 12
        k.rod('sc_galv', (x, (n - 1) * run + 0.35, top), (x, (n - 1) * run + 0.35, top + 1.1), 0.025)
    k.rod('sc_galv', (-L / 2, (n - 1) * run + 0.35, top + 1.1), (L / 2, (n - 1) * run + 0.35, top + 1.1), 0.03)
    k.rod('sc_galv', (-L / 2, -0.1, 1.0), (L / 2, -0.1, 1.0), 0.03)
    for ax in (-L / 4, L / 4):
        for i in range(2 * n):
            k.box('sc_alu_d', ax, i * run / 2 - 0.1, 0.0 + i * rise / 2, 1.1, run / 2 + 0.02, 0.05)
        k.rod('sc_galv', (ax - 0.6, -0.4, 1.0), (ax - 0.6, (n - 1) * run, top + 0.9), 0.025)
    k.box('sc_navy', 0, -0.11, 0.1, L, 0.02, 0.8)
    return k.done(G, height=top + 1.2, seat=[[round(-L / 2 + 1 + j * 2.0, 2), round(i * run + 0.18, 2), round(0.5 + i * rise, 2)] for i in range(n) for j in range(15)])


def press_box():
    """Elevated press box on steel legs with a glazed front, flat roof, ladder and PA horns."""
    k = Kit('press_box')
    W, D, H, z0 = 8.0, 3.0, 2.6, 4.6
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('sc_galv', sx * (W / 2 - 0.2), sy * (D / 2 - 0.2), 0, 0.2, 0.2, z0)
    k.box('sc_galv', 0, 0, z0 - 0.2, W, D, 0.2)
    k.box('sc_white', 0, 0, z0, W, D, H)
    k.box('sc_glass', 0, -D / 2 - 0.01, z0 + 1.0, W - 0.6, 0.02, 1.2)
    for i in range(6):
        k.box('sc_white', -W / 2 + 0.3 + i * (W - 0.6) / 5, -D / 2 - 0.03, z0 + 1.0, 0.08, 0.04, 1.2)
    k.box('sc_navy', 0, 0, z0 + H, W + 0.4, D + 0.4, 0.2)
    k.box('sc_navy', 0, -D / 2 - 0.05, z0 + 0.4, W, 0.06, 0.4)
    k.box('sc_gold', 0, -D / 2 - 0.09, z0 + 0.48, W * 0.7, 0.02, 0.24)
    k.ladder('sc_galv', W / 2 - 0.8, D / 2 + 0.3, 0, z0, cage=False)
    for sx in (-1, 1):
        k.rod('sc_galv', (sx * 2.5, 0, z0 + H + 0.2), (sx * 2.5, 0, z0 + H + 1.3), 0.04)
        k.cyl('sc_alu', sx * 2.5, -0.2, z0 + H + 1.2, 0.12, 0.5, 10, r2=0.3, axis='Y')
    return k.done(G, height=z0 + H + 1.6)


def stadium_light():
    """Field floodlight: tapered galvanised pole, cross-arm bank of 12 lamps, service ladder."""
    k = Kit('stadium_light')
    H = 22.0
    k.cyl('sc_conc', 0, 0, 0, 0.5, 0.4, 10)
    k.cyl('sc_galv', 0, 0, 0.4, 0.28, H - 0.4, 10, r2=0.16)
    k.ladder('sc_galv', 0, 0.3, 2.5, H - 1.0, w=0.4, cage=True, cage_from=4.0)
    for r in range(3):
        z = H - 0.2 + r * 0.9
        k.box('sc_galv', 0, -0.25, z - 0.08, 3.8, 0.14, 0.14)
        for c in range(4):
            x = -1.35 + c * 0.9
            k.cyl('sc_alu_d', x, -0.45, z + 0.3, 0.34, 0.4, 12, axis='Y')
            k.cyl('sc_lamp', x, -0.86, z + 0.3, 0.3, 0.02, 12, axis='Y')
    k.box('sc_galv', 0, -0.25, H - 0.4, 0.2, 0.2, 2.9)
    k.box('sc_alu_d', 0, 0.3, 1.3, 0.5, 0.3, 0.7)
    return k.done(G, height=H + 3)


def goal_post():
    """Single-pedestal football goal: gooseneck, crossbar and two yellow uprights with wind ribbons."""
    k = Kit('goal_post')
    k.cyl('sc_yellow', 0, 1.8, 0, 0.11, 3.0, 10)
    k.box('sc_navy', 0, 1.8, 0, 0.5, 0.5, 1.8)
    k.tube('sc_yellow', [(0, 1.8, 3.0), (0, 1.6, 3.15), (0, 0.6, 3.15), (0, 0, 3.05)], 0.1, 10)
    k.rod('sc_yellow', (-2.82, 0, 3.05), (2.82, 0, 3.05), 0.08, 10)
    for sx in (-1, 1):
        k.rod('sc_yellow', (sx * 2.82, 0, 3.05), (sx * 2.82, 0, 9.1), 0.06, 8)
        k.box('sc_red', sx * 2.82 - 0.02, -0.02, 8.6, 0.04, 0.02, 0.6)
    return k.done(G, height=9.2)


def scoreboard():
    """End-zone scoreboard: HOME / GUEST / QTR / DOWN panels on two posts with a sponsor sign."""
    k = Kit('scoreboard')
    W, H, z0 = 8.0, 3.2, 3.0
    for sx in (-1, 1):
        k.box('sc_galv', sx * (W / 2 - 0.8), 0.2, 0, 0.3, 0.3, z0 + H)
    k.box('sc_black', 0, 0, z0, W, 0.4, H)
    k.box('sc_navy', 0, -0.21, z0 + H - 0.7, W, 0.02, 0.7)
    k.box('sc_white', 0, -0.23, z0 + H - 0.55, W * 0.5, 0.01, 0.4)
    for sx in (-1, 1):
        k.box('sc_white', sx * 2.4, -0.22, z0 + H - 1.15, 1.8, 0.01, 0.28)
        for d in (-0.38, 0.38):
            k.box('sc_red', sx * 2.4 + d, -0.22, z0 + 0.95, 0.6, 0.01, 0.95)
            k.box('sc_black', sx * 2.4 + d, -0.23, z0 + 1.35, 0.3, 0.01, 0.12)
    for d in (-0.5, 0.0, 0.5):
        k.box('sc_yellow', d, -0.22, z0 + 1.0, 0.32, 0.01, 0.55)
    k.box('sc_red', 0, -0.22, z0 + 0.2, W * 0.8, 0.01, 0.5)
    k.box('sc_white', 0, -0.23, z0 + 0.3, W * 0.6, 0.01, 0.3)
    return k.done(G, height=z0 + H)


def play_structure():
    """Modular playground structure: two decks on green posts, red tube slide, wavy slide, ladder, monkey bars, roof."""
    k = Kit('play_structure')
    posts = [(-2.4, -1.0), (-2.4, 1.0), (-0.4, -1.0), (-0.4, 1.0), (1.6, -1.0), (1.6, 1.0)]
    for x, y in posts:
        k.cyl('sc_green', x, y, 0, 0.07, 3.2, 10)
        k.sphere('sc_yellow', x, y, 3.25, 0.09, 8, 6)
    k.box('sc_tan', -1.4, 0, 1.2, 2.0, 2.0, 0.08)
    k.box('sc_tan', 0.6, 0, 1.6, 2.0, 2.0, 0.08)
    for x0, x1, z in ((-2.4, -0.4, 1.28), (-0.4, 1.6, 1.68)):
        for y in (-1.0, 1.0):
            k.box('sc_blue', (x0 + x1) / 2, y, z + 0.25, x1 - x0 - 0.15, 0.05, 0.55)
    k.prism('sc_red', [(-2.4, 2.9), (-0.4, 2.9), (-1.4, 3.6)], -1.15, 1.15, plane='XZ')
    k.tube('sc_red', [(1.6, 0, 1.9), (2.6, 0, 1.6), (3.2, 0.8, 1.1), (3.4, 2.0, 0.6), (3.0, 2.8, 0.35)], 0.36, 12)
    for i in range(9):
        t = i / 8
        k.box('sc_yellow', -3.1 - t * 2.6, 0.0, 1.2 - t * 0.9 + 0.1 * math.sin(t * 9), 0.36, 0.8, 0.05)
    for sy in (-0.42, 0.42):
        k.rod('sc_yellow', (-2.4, sy, 1.5), (-5.7, sy, 0.6), 0.03)
    for i in range(5):
        k.rod('sc_blue', (1.6 + 0.1, -0.3 + 0, 0.3 + i * 0.3), (1.6 + 0.1, 0.3, 0.3 + i * 0.3), 0.025)
    k.box('sc_blue', 1.6 + 0.2, -0.45, 0, 0.06, 0.06, 1.6)
    k.box('sc_blue', 1.6 + 0.2, 0.45, 0, 0.06, 0.06, 1.6)
    for x in (-2.4, -0.4):
        k.rod('sc_green', (x, -1.0, 2.9), (x, 1.0, 2.9), 0.05)
    return k.done(G, height=3.7)


def monkey_bars():
    """Arched overhead ladder on green legs."""
    k = Kit('monkey_bars')
    L = 3.6
    for sy in (-0.3, 0.3):
        pts = [(-L / 2, sy, 0), (-L / 2, sy, 1.8), (-L / 4, sy, 2.1), (L / 4, sy, 2.1), (L / 2, sy, 1.8), (L / 2, sy, 0)]
        k.tube('sc_green', pts, 0.045, 8)
    for i in range(11):
        x = -L / 2 + 0.2 + i * (L - 0.4) / 10
        z = 1.8 + 0.3 * math.sin(math.pi * (x + L / 2) / L)
        k.rod('sc_yellow', (x, -0.3, z), (x, 0.3, z), 0.022)
    for x in (-L / 2, L / 2):
        for i in range(4):
            k.rod('sc_yellow', (x, -0.3, 0.35 + i * 0.4), (x, 0.3, 0.35 + i * 0.4), 0.022)
    return k.done(G, height=2.2)


def tetherball():
    k = Kit('tetherball')
    k.cyl('sc_conc', 0, 0, 0, 0.25, 0.08, 10)
    k.cyl('sc_galv', 0, 0, 0.08, 0.04, 3.0, 8)
    k.rod('sc_white', (0, 0, 2.9), (0.25, 0.05, 1.5), 0.006, 4)
    k.sphere('sc_yellow', 0.27, 0.05, 1.4, 0.11, 10, 8)
    return k.done(G, height=3.1)


def backstop():
    """Little-league chain-link backstop with a hooded top and dugout bench."""
    k = Kit('backstop')
    for a in (-50, -25, 0, 25, 50):
        r = math.radians(a)
        k.cyl('sc_galv', math.sin(r) * 5, -math.cos(r) * 5 + 5, 0, 0.05, 4.5, 8)
    for i in range(4):
        r0, r1 = math.radians(-50 + i * 25), math.radians(-25 + i * 25)
        x0, y0, x1, y1 = math.sin(r0) * 5, 5 - math.cos(r0) * 5, math.sin(r1) * 5, 5 - math.cos(r1) * 5
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        ln = math.hypot(x1 - x0, y1 - y0)
        k.box('sc_alu_d', mx, my, 0.05, ln, 0.01, 4.3, rz=math.degrees(math.atan2(y1 - y0, x1 - x0)))
        for z in (0.05, 2.2, 4.4):
            k.rod('sc_galv', (x0, y0, z), (x1, y1, z), 0.03)
    k.box('sc_wood', 6, 1.0, 0.0, 3.0, 0.4, 0.45)
    return k.done(G, height=4.6)


def school_sign(name='school_sign_elem', label='sc_navy'):
    """Brick monument sign with a white marquee letter board on a stone cap; planting box at the foot."""
    k = Kit(name)
    k.box('sc_conc', 0, 0, 0, 3.6, 0.9, 0.2)
    k.box('sc_brick', 0, 0, 0.2, 3.4, 0.7, 1.9)
    for sx in (-1, 1):
        k.box('sc_brick', sx * 1.85, 0, 0.2, 0.5, 0.8, 2.3)
        k.box('sc_conc', sx * 1.85, 0, 2.5, 0.6, 0.9, 0.12)
    k.box('sc_conc', 0, 0, 2.1, 3.3, 0.8, 0.12)
    k.sign(0, -0.36, 1.72, 3.0, 0.55, t=0.1, back=False)
    k.box('sc_white', 0, -0.36, 0.45, 3.0, 0.02, 0.9)
    for i in range(4):
        k.box('sc_black', -1.1 + (i % 2) * 0.4, -0.375, 1.05 - i * 0.18, 1.6 - (i % 3) * 0.3, 0.005, 0.1)
    k.box(label, 0, -0.36, 2.0, 3.2, 0.02, 0.08)
    k.box('sc_conc', 0, -0.9, 0, 3.6, 0.8, 0.3)
    for i in range(7):
        k.sphere(('sc_red', 'sc_yellow', 'sc_green')[i % 3] if i % 2 else 'sc_green', -1.5 + i * 0.5, -0.9, 0.38, 0.18, 8, 6)
    return k.done(G, height=2.6)


ALL = (stadium_bleachers, press_box, stadium_light, goal_post, scoreboard, play_structure, monkey_bars, tetherball, backstop,
       school_sign, lambda: school_sign('school_sign_high', 'sc_red'))

SHEETS = [
    ('school_grounds', ['stadium_bleachers', 'press_box', 'stadium_light', 'goal_post', 'scoreboard', 'play_structure', 'monkey_bars',
                        'tetherball', 'backstop', 'school_sign_elem', 'school_sign_high'], 'shot', dict(gap=1.0, elev=18, azim=-32, cols=4)),
]


def build():
    for f in ALL:
        f()

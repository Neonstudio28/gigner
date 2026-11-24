"""Trailer-park yard life: carport, above-ground pool, trampoline, fire pit, lawn furniture, flamingos and junk."""
import math, random
import structures_kit as K
from structures_kit import Kit

G = 'trailer'
K.PAL.update({
    'tr_pink': ('paint', '#ec6fa4'), 'tr_blk': ('paint', '#1f2022'), 'tr_white': ('paint', '#ecebe4'), 'tr_blue': ('paint', '#3c6fb4'),
    'tr_alu': ('paint', '#b9bdc0'), 'tr_wood': ('paint', '#8a6a48'), 'tr_wood2': ('paint', '#6e5338'), 'tr_conc': ('paint', '#9d9a92'),
    'tr_red': ('paint', '#b8352c'), 'tr_green': ('paint', '#3f7a46'), 'tr_yellow': ('paint', '#e2b53a'), 'tr_fab': ('paint', '#7a5f4a'),
    'tr_fab2': ('paint', '#5f6f4a'), 'tr_tarp': ('paint', '#2f62a8'), 'tr_galv': ('paint', '#a3a8ab'), 'tr_rub': ('paint', '#2a2a2c'),
    'tr_stone': ('paint', '#7d776e'), 'tr_ash': ('paint', '#3b3633'), 'tr_ember': ('paint', '#c4542a'), 'tr_web': ('paint', '#3f8f6a'),
    'tr_web2': ('paint', '#d9c25a'), 'tr_rust': ('paint', '#8a4f2c'), 'tr_flower': ('paint', '#d84a6a'), 'tr_flower2': ('paint', '#f0d24a'),
    'tr_leaf': ('paint', '#4f8a3a'), 'tr_water': ('paint', '#5fb6d0'), 'tr_bamboo': ('paint', '#c7a46a'), 'tr_purple': ('paint', '#6a4f9a'),
})


def pink_flamingo():
    """Plastic lawn flamingo on two wire legs."""
    k = Kit('pink_flamingo')
    for sx in (-0.03, 0.03):
        k.rod('tr_galv', (sx, 0, 0), (sx, 0, 0.42), 0.006, 4)
    k.cbox('tr_pink', 0, 0.02, 0.48, 0.12, 0.3, 0.14, 0.03)
    k.cbox('tr_pink', 0, 0.14, 0.52, 0.09, 0.1, 0.1, 0.02, rx=20)
    k.beam('tr_pink', (0, -0.1, 0.52), (0, -0.14, 0.82), 0.04, 0.04)
    k.cbox('tr_pink', 0, -0.17, 0.85, 0.07, 0.1, 0.07, 0.015)
    k.cbox('tr_blk', 0, -0.25, 0.83, 0.03, 0.06, 0.03, 0.005, rx=-30)
    return k.done(G, height=0.9)


def carport_metal():
    """Steel carport: four square posts, a low-pitch corrugated roof and gutter."""
    k = Kit('carport_metal')
    W, L, H = 3.4, 6.4, 2.3
    for sx in (-1, 1):
        for y in (-L / 2 + 0.1, 0, L / 2 - 0.1):
            k.box('tr_galv', sx * (W / 2 - 0.08), y, 0, 0.08, 0.08, H + (0.12 if sx > 0 else 0))
            k.box('tr_conc', sx * (W / 2 - 0.08), y, -0.05, 0.24, 0.24, 0.08)
        k.box('tr_galv', sx * (W / 2 - 0.08), 0, H + (0.12 if sx > 0 else 0), 0.1, L, 0.1)
    n = 14
    for i in range(n):
        x = -W / 2 - 0.15 + (W + 0.3) * (i + 0.5) / n
        z = H + 0.1 + 0.12 * (x + W / 2) / W
        k.box('tr_alu', x, 0, z, (W + 0.3) / n - 0.01, L + 0.3, 0.025 if i % 2 else 0.045, ry=-2)
    k.box('tr_alu', -W / 2 - 0.18, 0, H + 0.03, 0.08, L + 0.3, 0.08)
    return k.done(G, height=H + 0.4)


def pool_above_ground():
    """Round steel-wall pool with blue liner, top rail, uprights and an A-frame ladder."""
    k = Kit('pool_above_ground')
    R, H = 2.3, 1.15
    k.cyl('tr_blue', 0, 0, 0, R, H, 28)
    k.cyl('tr_water', 0, 0, H - 0.12, R - 0.05, 0.02, 28)
    k.torus('tr_white', 0, 0, H, R + 0.04, 0.06, 28, 4, sz=0.4)
    for i in range(12):
        a = i * math.pi * 2 / 12
        k.box('tr_white', math.cos(a) * (R + 0.02), math.sin(a) * (R + 0.02), 0, 0.1, 0.1, H, rz=math.degrees(a))
    for sx in (-1, 1):
        k.rod('tr_white', (sx * 0.28, -R - 0.7, 0), (sx * 0.28, -R + 0.05, H + 0.35), 0.025, 6)
        k.rod('tr_white', (sx * 0.28, -R + 0.05, H + 0.35), (sx * 0.28, -R + 0.6, 0.2), 0.025, 6)
    for i in range(4):
        t = (i + 1) / 5
        k.box('tr_white', 0, -R - 0.7 + 0.75 * t, (H + 0.35) * t, 0.56, 0.12, 0.03)
    return k.done(G, height=H + 0.4)


def trampoline():
    """Backyard trampoline: padded ring, black mat, W legs and a safety-net cage of poles."""
    k = Kit('trampoline')
    R, H = 1.85, 0.85
    k.torus('tr_blue', 0, 0, H, R, 0.11, 28, 6, sz=0.45)
    k.cyl('tr_blk', 0, 0, H - 0.04, R - 0.08, 0.02, 28)
    for i in range(6):
        a = i * math.pi / 3
        x, y = math.cos(a) * (R - 0.05), math.sin(a) * (R - 0.05)
        k.rod('tr_galv', (x, y, 0), (x, y, H), 0.025, 6)
        k.rod('tr_galv', (x, y, H), (x * 1.02, y * 1.02, H + 1.6), 0.02, 6)
    for i in range(24):
        a0, a1 = i * math.pi / 12, (i + 1) * math.pi / 12
        k.rod('tr_blk', (math.cos(a0) * R, math.sin(a0) * R, H + 1.58), (math.cos(a1) * R, math.sin(a1) * R, H + 1.58), 0.012, 4)
    return k.done(G, height=H + 1.7)


def lawn_chair(name='lawn_chair', web='tr_web'):
    """Aluminium folding lawn chair with woven webbing."""
    k = Kit(name)
    for sx in (-1, 1):
        k.rod('tr_alu', (sx * 0.27, -0.25, 0), (sx * 0.27, 0.22, 0.4), 0.014, 6)
        k.rod('tr_alu', (sx * 0.27, 0.25, 0), (sx * 0.27, -0.2, 0.4), 0.014, 6)
        k.rod('tr_alu', (sx * 0.27, 0.22, 0.4), (sx * 0.27, 0.3, 0.92), 0.014, 6)
        k.rod('tr_alu', (sx * 0.27, -0.24, 0.6), (sx * 0.27, 0.24, 0.6), 0.012, 6)
    for i in range(6):
        k.box(web if i % 2 else 'tr_web2', -0.25 + i * 0.1, 0.0, 0.4, 0.085, 0.46, 0.012)
    for i in range(6):
        z = 0.46 + i * 0.075
        k.box(web if i % 2 == 0 else 'tr_web2', 0, 0.22 + (z - 0.4) * 0.15, z, 0.52, 0.012, 0.06)
    return k.done(G, height=0.95)


def firepit_ring():
    """Stone fire ring with ash, charred logs and a few embers."""
    k = Kit('firepit_ring')
    rng = random.Random(7)
    for i in range(14):
        a = i * math.pi * 2 / 14
        k.cbox('tr_stone', math.cos(a) * 0.62, math.sin(a) * 0.62, 0, 0.26 + rng.random() * 0.06, 0.2, 0.18 + rng.random() * 0.06, 0.04, rz=math.degrees(a) + rng.uniform(-15, 15))
    k.cyl('tr_ash', 0, 0, 0, 0.52, 0.04, 16)
    for a in (10, 70, 140):
        k.cyl('tr_wood2', 0, 0, 0.1, 0.06, 0.7, 8, axis='X', a0=0) if False else k.beam('tr_ash', (math.cos(math.radians(a)) * 0.35, math.sin(math.radians(a)) * 0.35, 0.06), (-math.cos(math.radians(a)) * 0.2, -math.sin(math.radians(a)) * 0.2, 0.22), 0.1, 0.1)
    for i in range(5):
        k.cbox('tr_ember', rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2), 0.04, 0.06, 0.06, 0.03, 0.01)
    return k.done(G, height=0.3)


def chest_freezer():
    """Old white chest freezer left out on the deck, chrome handle and a rust streak."""
    k = Kit('chest_freezer')
    k.cbox('tr_white', 0, 0, 0.45, 1.3, 0.72, 0.8, 0.04)
    k.cbox('tr_white', 0, 0, 0.89, 1.32, 0.74, 0.08, 0.03)
    k.box('tr_alu', 0, -0.38, 0.78, 0.4, 0.03, 0.05)
    k.box('tr_rust', 0.45, -0.365, 0.3, 0.06, 0.005, 0.4)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('tr_rub', sx * 0.58, sy * 0.3, 0, 0.06, 0.06, 0.05)
    return k.done(G, height=0.95)


def porch_couch():
    """Worn three-seat couch dragged out onto the grass."""
    k = Kit('porch_couch')
    k.cbox('tr_fab', 0, 0, 0.1, 2.0, 0.86, 0.34, 0.06)
    for i in range(3):
        k.cbox('tr_fab', -0.64 + i * 0.64, -0.04, 0.44, 0.62, 0.7, 0.14, 0.05)
        k.cbox('tr_fab', -0.64 + i * 0.64, 0.33, 0.58, 0.6, 0.2, 0.46, 0.06, rx=-8)
    for sx in (-1, 1):
        k.cbox('tr_fab', sx * 0.96, 0, 0.44, 0.18, 0.86, 0.32, 0.05)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('tr_wood2', sx * 0.9, sy * 0.36, 0, 0.07, 0.07, 0.1)
    k.box('tr_fab2', 0.4, -0.06, 0.52, 0.5, 0.45, 0.02, rz=12)
    return k.done(G, height=1.0)


def tarp_heap():
    """Something under a weighted blue tarp: a mower or a project car's engine, never moved."""
    k = Kit('tarp_heap')
    k.prism('tr_tarp', [(-1.3, 0), (-1.1, 0.6), (-0.3, 0.95), (0.6, 0.9), (1.2, 0.5), (1.35, 0)], -0.8, 0.8, plane='XZ')
    for x, y in ((-1.2, -0.75), (1.2, 0.75), (1.1, -0.75), (-1.1, 0.78)):
        k.box('tr_rub', x, y, 0, 0.5, 0.3, 0.18)
    for i in range(3):
        k.rod('tr_yellow', (-1.2 + i * 1.1, -0.82, 0.3), (-1.2 + i * 1.1, 0.82, 0.3), 0.008, 4)
    return k.done(G, height=1.0)



def cinder_blocks():
    """A loose stack of cinder blocks with a board on top."""
    k = Kit('cinder_blocks')
    rng = random.Random(3)
    for lay in range(3):
        for i in range(3 - lay):
            k.box('tr_conc', -0.4 + i * 0.42 + lay * 0.2 + rng.uniform(-0.03, 0.03), rng.uniform(-0.03, 0.03), lay * 0.2, 0.39, 0.19, 0.19, rz=rng.uniform(-6, 6))
    k.box('tr_wood', 0.1, 0, 0.62, 1.2, 0.2, 0.03, rz=5)
    return k.done(G, height=0.7)


def kids_slide():
    """Little plastic climb-and-slide in faded primary colours."""
    k = Kit('kids_slide')
    k.box('tr_red', 0, 0.35, 0, 0.7, 0.6, 0.75)
    k.box('tr_blue', 0, 0.35, 0.75, 0.78, 0.66, 0.06)
    k.beam('tr_yellow', (0, 0.05, 0.75), (0, -1.15, 0.06), 0.5, 0.05)
    for sx in (-1, 1):
        k.beam('tr_yellow', (sx * 0.27, 0.05, 0.83), (sx * 0.27, -1.15, 0.12), 0.05, 0.08)
    for i in range(3):
        k.box('tr_green', 0, 0.68, 0.18 + i * 0.22, 0.5, 0.06, 0.05)
    return k.done(G, height=0.9)


def cluster_mailbox():
    """Park mailbox cluster on a pedestal: sixteen doors, two parcel lockers, outgoing slot."""
    k = Kit('cluster_mailbox')
    k.box('tr_conc', 0, 0, -0.05, 1.1, 0.7, 0.1)
    k.box('tr_alu', 0, 0, 0.05, 0.36, 0.36, 0.55)
    k.cbox('tr_alu', 0, 0, 1.0, 0.9, 0.48, 0.85, 0.02)
    k.cbox('tr_alu', 0, 0, 1.45, 0.96, 0.54, 0.06, 0.02)
    for r in range(4):
        for c in range(4):
            k.box('tr_galv', -0.33 + c * 0.22, -0.245, 1.27 - r * 0.13, 0.19, 0.01, 0.11)
            k.box('tr_blk', -0.33 + c * 0.22 + 0.06, -0.252, 1.31 - r * 0.13, 0.03, 0.006, 0.02)
    for c in range(2):
        k.box('tr_galv', -0.22 + c * 0.44, -0.245, 0.62, 0.4, 0.01, 0.22)
    return k.done(G, height=1.5)


def tiki_torch():
    """Bamboo tiki torch with a fuel cup."""
    k = Kit('tiki_torch')
    k.cyl('tr_bamboo', 0, 0, 0, 0.025, 1.5, 6)
    k.cyl('tr_bamboo', 0, 0, 1.5, 0.07, 0.18, 8, r2=0.05)
    k.cyl('tr_blk', 0, 0, 1.68, 0.012, 0.06, 6)
    return k.done(G, height=1.75)


def tyre_planter():
    """Old tyre painted white and planted up with marigolds."""
    k = Kit('tyre_planter')
    k.torus('tr_white', 0, 0, 0.12, 0.34, 0.12, 18, 6, sz=0.9)
    k.cyl('tr_ash', 0, 0, 0, 0.3, 0.2, 14)
    rng = random.Random(11)
    for i in range(9):
        a = rng.random() * math.pi * 2
        r = rng.random() * 0.22
        k.cbox('tr_leaf', math.cos(a) * r, math.sin(a) * r, 0.2, 0.1, 0.1, 0.12, 0.03)
        k.cbox(rng.choice(['tr_flower', 'tr_flower2']), math.cos(a) * r, math.sin(a) * r, 0.31, 0.07, 0.07, 0.05, 0.02)
    return k.done(G, height=0.4)


def sign_slow_kids():
    """Hand-painted park sign on a post: SLOW, KIDS AT PLAY."""
    k = Kit('sign_slow_kids')
    k.box('tr_wood2', 0, 0, 0, 0.09, 0.09, 1.7)
    k.cbox('tr_yellow', 0, -0.06, 1.25, 0.7, 0.03, 0.5, 0.01)
    k.cbox('tr_red', 0, -0.08, 1.38, 0.5, 0.005, 0.1, 0.005)
    k.cbox('tr_blk', 0, -0.08, 1.2, 0.56, 0.005, 0.07, 0.005)
    k.cbox('tr_blk', 0, -0.08, 1.09, 0.4, 0.005, 0.06, 0.005)
    return k.done(G, height=1.75)


def wind_spinner():
    """Garden pinwheel beside a shepherd hook with wind chimes."""
    k = Kit('wind_spinner')
    k.rod('tr_galv', (0, 0, 0), (0, 0, 1.2), 0.012, 4)
    cols = ['tr_red', 'tr_yellow', 'tr_blue', 'tr_green', 'tr_purple', 'tr_pink']
    for i in range(6):
        a = math.radians(i * 60)
        k.box(cols[i], math.cos(a) * 0.12, -0.03, 1.2 + math.sin(a) * 0.12, 0.22, 0.004, 0.06, ry=-i * 60, rz=20)
    k.rod('tr_galv', (0.4, 0, 0), (0.4, 0, 1.4), 0.01, 4)
    k.rod('tr_galv', (0.4, 0, 1.4), (0.6, 0, 1.4), 0.01, 4)
    for i in range(5):
        k.cyl('tr_alu', 0.53 + (i - 2) * 0.03, 0, 1.05 + i * 0.03, 0.008, 0.25 - i * 0.03, 5)
    return k.done(G, height=1.45)


ALL = (pink_flamingo, carport_metal, pool_above_ground, trampoline, lawn_chair, lambda: lawn_chair('lawn_chair_b', 'tr_red'),
       firepit_ring, chest_freezer, porch_couch, tarp_heap, cinder_blocks, kids_slide, cluster_mailbox, tiki_torch, tyre_planter,
       sign_slow_kids, wind_spinner)

SHEETS = [
    ('trailer_yard', ['pink_flamingo', 'carport_metal', 'pool_above_ground', 'trampoline', 'lawn_chair', 'lawn_chair_b', 'firepit_ring', 'chest_freezer', 'porch_couch',
                      'tarp_heap', 'cinder_blocks', 'kids_slide', 'cluster_mailbox', 'tiki_torch', 'tyre_planter', 'sign_slow_kids', 'wind_spinner'], 'shot', dict(gap=0.6, elev=18, azim=-32, cols=6)),
]


def build():
    for f in ALL:
        f()

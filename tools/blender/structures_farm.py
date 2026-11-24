"""Countryside and new-build: high-voltage pylon, livestock, stables, hog barn, feed bin, timber house frames by stage."""
import math, random
import structures_kit as K
from structures_kit import Kit
from structures_towers import lattice

G = 'farm'
K.PAL.update({
    'pig': ('paint', '#e6a99c'), 'pig2': ('paint', '#c98376'), 'wool': ('paint', '#e9e3d2'), 'wool2': ('paint', '#d6ccb6'),
    'bay': ('paint', '#7a4a2c'), 'bay2': ('paint', '#4a2c1c'), 'chest': ('paint', '#a8683a'), 'hoof': ('paint', '#2e2824'),
    'grey_horse': ('paint', '#b9b6ae'), 'goat': ('paint', '#ece6da'), 'goat2': ('paint', '#8a6a4a'), 'horn': ('paint', '#9c8f78'),
    'osb': ('paint', '#c9a768'), 'osb2': ('paint', '#b8955a'), 'stud': ('paint', '#dcc08c'), 'wrap': ('paint', '#eef0ee'),
    'tarpaper': ('paint', '#34363a'), 'insul': ('paint', '#d7c9a2'), 'pvc': ('paint', '#e8e8e2'), 'abs': ('paint', '#2b2b2d'),
    'rebar': ('paint', '#6a4a36'), 'cream_b': ('paint', '#efe8d6'), 'curtain': ('paint', '#c9c4b4'),
})


# --- high-voltage line ---------------------------------------------------------------------------------

def insulator(k, x, y, z, L=2.4, n=11):
    """Suspension string hanging from (x, y, z): yoke, glass discs, clamp."""
    k.cbox('dsteel', x, y, z - 0.08, 0.3, 0.12, 0.16)
    k.cyl('dsteel', x, y, z - L, 0.025, L, 5)
    for i in range(n):
        k.cyl('dglass', x, y, z - 0.35 - i * (L - 0.6) / n, 0.16, 0.05, 10, r2=0.06)
    k.cbox('dsteel', x, y, z - L - 0.05, 0.5, 0.14, 0.1)


def arm(k, z, reach, top=0.9, w0=1.1):
    for sx in (-1, 1):
        x0, x1 = sx * w0 / 2, sx * reach
        for sy in (-1, 1):
            k.beam('galv', (x0, sy * w0 / 2, z), (x1, sy * 0.15, z), 0.08, 0.08)
            k.beam('galv', (x0, sy * w0 / 2, z + top), (x1, sy * 0.1, z + 0.12), 0.07, 0.07)
        for i in range(5):
            t0, t1 = i / 5, (i + 1) / 5
            xa, xb = x0 + (x1 - x0) * t0, x0 + (x1 - x0) * t1
            za, zb = z + top * (1 - t0) + 0.12 * t0, z + top * (1 - t1) + 0.12 * t1
            for sy in (-1, 1):
                k.beam('galv', (xa, sy * w0 / 2 * (1 - t0), za), (xb, sy * w0 / 2 * (1 - t1), z), 0.04, 0.04)
            k.beam('galv', (xb, -w0 / 2 * (1 - t1), z), (xb, w0 / 2 * (1 - t1), z), 0.04, 0.04)
        insulator(k, x1 * 0.97, 0, z)
    return [[sx * reach * 0.97, z - 2.5] for sx in (-1, 1)]


def hv_pylon():
    k = Kit('hv_pylon')
    lattice(k, 'galv', 0.0, 22.0, 7.6, 2.0, 7, leg=0.2, br=0.08, power=1.25)
    lattice(k, 'galv', 22.0, 32.5, 2.0, 1.3, 4, leg=0.15, br=0.06)
    lattice(k, 'galv', 32.5, 35.5, 1.3, 0.25, 2, leg=0.1, br=0.05)
    hangs = arm(k, 21.6, 7.4, w0=2.0) + arm(k, 26.4, 6.4, w0=1.75) + arm(k, 31.0, 5.4, w0=1.4)
    for sx in (-1, 1):                         # earth-wire peak
        k.beam('galv', (0, 0, 35.5), (sx * 2.2, 0, 34.6), 0.08, 0.08)
        k.cbox('dsteel', sx * 2.2, 0, 34.55, 0.25, 0.25, 0.12)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * 3.8, sy * 3.8
            k.box('conc', x, y, -0.2, 1.2, 1.2, 0.55, 0.05)
            k.box('dsteel', x, y, 0.35, 0.5, 0.5, 0.08)
    for z in (3.2, 3.6):                       # anti-climb guard and barbed band
        w = 7.6 - (7.6 - 2.0) * (1 - (1 - z / 22.0) ** 1.25)
        for i, (ax, ay, bx, by) in enumerate(((-1, -1, 1, -1), (1, -1, 1, 1), (1, 1, -1, 1), (-1, 1, -1, -1))):
            k.beam('dsteel', (ax * w / 2 * 1.04, ay * w / 2 * 1.04, z), (bx * w / 2 * 1.04, by * w / 2 * 1.04, z), 0.03, 0.03)
    w = 7.6 - (7.6 - 2.0) * (1 - (1 - 2.4 / 22.0) ** 1.25)
    k.cbox('yellow', 0, -w / 2 - 0.05, 2.4, 0.6, 0.02, 0.45, 0.01)
    k.cbox('red', 0, -w / 2 - 0.065, 2.45, 0.5, 0.01, 0.12)
    k.cbox('black', 0, -w / 2 - 0.065, 2.28, 0.12, 0.01, 0.18)
    k.cbox('white', -0.8, -w / 2 - 0.05, 2.0, 0.3, 0.02, 0.2)
    return k.done(G, height=35.5, hang=hangs)


# --- livestock (boxy, like the townsfolk) ----------------------------------------------------------------

def legs(k, mat, hoof, xs, ys, h, t):
    for x in xs:
        for y in ys:
            k.box(mat, x, y, 0.0, t, t, h, t * 0.12)
            k.box(hoof, x, y, 0.0, t * 1.06, t * 1.06, min(0.1, h * 0.18), 0.01)


def pig(name='pig', spot=False):
    k = Kit(name)
    legs(k, 'pig', 'pig2', (-0.2, 0.2), (-0.36, 0.36), 0.32, 0.13)
    k.box('pig', 0, 0, 0.26, 0.62, 1.15, 0.52, 0.09)
    if spot:
        k.box('black', 0.312, 0.15, 0.4, 0.01, 0.35, 0.25)
        k.box('black', -0.12, 0.2, 0.775, 0.22, 0.26, 0.012)
    k.box('pig', 0, -0.68, 0.34, 0.46, 0.34, 0.4, 0.06)
    k.box('pig2', 0, -0.88, 0.4, 0.22, 0.1, 0.16, 0.03)
    for sx in (-1, 1):
        k.cbox('black', sx * 0.05, -0.935, 0.48, 0.03, 0.01, 0.04)
        k.cbox('black', sx * 0.12, -0.851, 0.63, 0.04, 0.01, 0.04)
        k.cbox('pig', sx * 0.16, -0.62, 0.79, 0.14, 0.06, 0.16, 0.01, rx=-25, ry=sx * 20)
    k.tube('pig2', [(0, 0.575, 0.62), (0.04, 0.65, 0.66), (-0.03, 0.68, 0.72), (0.02, 0.64, 0.76)], 0.02, 4)
    return k.done(G, height=0.85)


def sheep(name='sheep', face='black'):
    k = Kit(name)
    legs(k, face, 'hoof', (-0.15, 0.15), (-0.32, 0.32), 0.42, 0.08)
    k.box('wool', 0, 0, 0.36, 0.62, 1.0, 0.5, 0.14)
    k.box('wool2', 0, 0, 0.82, 0.48, 0.84, 0.08, 0.04)
    k.box('wool', 0, -0.52, 0.62, 0.34, 0.24, 0.26, 0.08)
    k.box(face, 0, -0.68, 0.5, 0.22, 0.3, 0.3, 0.04, rx=-12)
    for sx in (-1, 1):
        k.cbox(face, sx * 0.17, -0.62, 0.78, 0.16, 0.05, 0.07, 0.01, ry=sx * 15)
        k.cbox('black', sx * 0.1, -0.79, 0.7, 0.035, 0.01, 0.035)
    k.box('wool', 0, 0.5, 0.6, 0.12, 0.12, 0.2, 0.03)
    return k.done(G, height=0.95)


def horse(name='horse_bay', coat='bay', mane='bay2', blaze=True):
    k = Kit(name)
    legs(k, coat, 'hoof', (-0.2, 0.2), (-0.72, 0.7), 0.95, 0.14)
    for x in (-0.2, 0.2):
        k.box(mane, x, 0.7, 0.1, 0.15, 0.15, 0.12)     # dark socks on the hind legs
    k.box(coat, 0, 0, 0.9, 0.62, 1.8, 0.7, 0.12)
    k.box('chest', 0, -0.9, 0.95, 0.5, 0.12, 0.5, 0.06)
    k.beam(coat, (0, -0.85, 1.35), (0, -1.15, 2.0), 0.36, 0.5, 0.06)
    k.beam(mane, (0, -0.73, 1.55), (0, -1.0, 2.15), 0.1, 0.12)
    with k.at(0, -1.25, 2.02, rx=-58):
        k.cbox(coat, 0, 0, -0.28, 0.3, 0.32, 0.72, 0.06)
        k.cbox(mane, 0, 0, -0.68, 0.26, 0.28, 0.14, 0.04)
        if blaze:
            k.cbox('white', 0, -0.165, -0.3, 0.09, 0.01, 0.5)
        for sx in (-1, 1):
            k.cbox('black', sx * 0.155, -0.08, -0.06, 0.01, 0.06, 0.06)
            k.cbox('black', sx * 0.06, -0.165, -0.6, 0.04, 0.01, 0.04)
            k.cbox(coat, sx * 0.1, 0.06, 0.17, 0.07, 0.06, 0.2, 0.01, ry=sx * 12)
    k.beam(mane, (0, 0.9, 1.5), (0, 1.12, 0.65), 0.14, 0.12, 0.03)
    return k.done(G, height=2.45)


def goat(name='goat', coat='goat', patch='goat2'):
    k = Kit(name)
    legs(k, coat, 'hoof', (-0.13, 0.13), (-0.3, 0.3), 0.5, 0.07)
    k.box(coat, 0, 0, 0.46, 0.4, 0.86, 0.38, 0.06)
    k.box(patch, 0, 0.1, 0.835, 0.3, 0.5, 0.01)
    k.beam(coat, (0, -0.38, 0.68), (0, -0.5, 0.98), 0.18, 0.2, 0.03)
    k.box(coat, 0, -0.62, 0.86, 0.2, 0.34, 0.2, 0.03, rx=-20)
    k.box(patch, 0, -0.74, 0.74, 0.06, 0.06, 0.14)
    for sx in (-1, 1):
        k.beam('horn', (sx * 0.06, -0.52, 1.08), (sx * 0.09, -0.36, 1.26), 0.04, 0.04)
        k.cbox(coat, sx * 0.14, -0.52, 1.0, 0.14, 0.04, 0.05, 0.01, ry=sx * 25)
    k.box(coat, 0, 0.43, 0.76, 0.06, 0.06, 0.14, 0.01, rx=-30)
    return k.done(G, height=1.26)


# --- timber house frames, by construction stage ------------------------------------------------------------

FW, FD, FH, SLAB = 11.0, 8.6, 2.75, 0.3
# openings per wall as (centre along the wall, width, sill height, head height); walls run left to right seen from outside
OPEN = {
    'f': [(-3.4, 1.8, 0.8, 2.3), (-0.9, 1.0, 0.0, 2.15), (2.6, 1.3, 0.9, 2.3)],
    'b': [(2.6, 0.95, 0.0, 2.1), (-0.6, 1.3, 1.1, 2.2), (-3.4, 0.7, 1.4, 2.2)],
    'l': [(1.6, 1.4, 0.9, 2.3), (-1.8, 1.1, 1.1, 2.2)],
    'r': [(-1.6, 1.3, 0.9, 2.3), (1.6, 0.7, 1.4, 2.2)],
}


def wall_frame(k, L, opens, z0, h, sheath=None):
    """Stud wall in a frame where the wall runs along X at y = 0 and its outside faces -Y."""
    t, dp = 0.045, 0.14
    for z in (z0, z0 + h - t, z0 + h - 2 * t):
        k.ext('stud', -L / 2, L / 2, -dp / 2, dp / 2, z, z + t)
    def inside(x, pad=0.0):
        return any(abs(x - c) < w / 2 + pad for c, w, _, _ in opens)
    n = int(L / 0.406)
    for i in range(n + 1):
        x = -L / 2 + t / 2 + i * (L - t) / n
        if not inside(x, t):
            k.ext('stud', x - t / 2, x + t / 2, -dp / 2, dp / 2, z0 + t, z0 + h - 2 * t)
    for c, w, sill, head in opens:
        for sx in (-1, 1):                         # king and jack studs
            k.ext('stud', c + sx * (w / 2 + t * 1.5) - t / 2, c + sx * (w / 2 + t * 1.5) + t / 2, -dp / 2, dp / 2, z0 + t, z0 + h - 2 * t)
            k.ext('stud', c + sx * (w / 2 + t / 2) - t / 2, c + sx * (w / 2 + t / 2) + t / 2, -dp / 2, dp / 2, z0 + t, z0 + head)
        k.ext('wood1', c - w / 2 - t, c + w / 2 + t, -dp / 2, dp / 2, z0 + head, z0 + head + 0.24)
        for x in (c - w / 4, c + w / 4):           # cripples over the header
            k.ext('stud', x - t / 2, x + t / 2, -dp / 2, dp / 2, z0 + head + 0.24, z0 + h - 2 * t)
        if sill > 0:
            k.ext('stud', c - w / 2, c + w / 2, -dp / 2, dp / 2, z0 + sill - t, z0 + sill)
            for x in (c - w / 4, c + w / 4):
                k.ext('stud', x - t / 2, x + t / 2, -dp / 2, dp / 2, z0 + t, z0 + sill - t)
    k.beam('wood2', (-L / 2 + 0.2, -dp / 2 + 0.01, z0 + 0.1), (-L / 2 + 1.4, -dp / 2 + 0.01, z0 + h - 0.15), 0.02, 0.09)
    if not sheath:
        return
    mat, cover = sheath
    y = -dp / 2 - 0.006
    cuts = sorted(opens)
    xs = [-L / 2 - 0.02] + [v for c, w, _, _ in cuts for v in (c - w / 2, c + w / 2)] + [L / 2 + 0.02]
    for i in range(0, len(xs), 2):                 # full-height runs between openings
        a, b = xs[i], xs[i + 1]
        if b - a > 0.05:
            k.ext(mat, a, a + (b - a) * cover, y - 0.006, y + 0.006, z0, z0 + h)
    for c, w, sill, head in cuts:                  # over and under each opening
        k.ext(mat, c - w / 2, c + w / 2, y - 0.006, y + 0.006, z0 + head, z0 + h)
        if sill > 0:
            k.ext(mat, c - w / 2, c + w / 2, y - 0.006, y + 0.006, z0, z0 + sill)
    if cover >= 1:                                 # panel seams
        for i in range(1, int(L / 1.22) + 1):
            x = -L / 2 + i * 1.22
            if not inside(x):
                k.ext('osb2', x - 0.006, x + 0.006, y - 0.009, y - 0.005, z0, z0 + h)


def walls(k, z0, sheath=None):
    for side, (x, y, rz, L) in {'f': (0, -FD / 2, 0, FW), 'b': (0, FD / 2, 180, FW), 'l': (-FW / 2, 0, -90, FD), 'r': (FW / 2, 0, 90, FD)}.items():
        with k.at(x, y, 0, rz=rz):
            wall_frame(k, L - (0.28 if side in 'lr' else 0), OPEN[side], z0, FH, sheath)
    with k.at(FW * 0.1, 0, 0, rz=90):              # interior partition
        wall_frame(k, FD - 0.3, [(0.8, 0.9, 0.0, 2.05)], z0, FH)


def slab(k, z1=SLAB, stubs=True):
    k.ext('conc', -FW / 2 - 0.15, FW / 2 + 0.15, -FD / 2 - 0.15, FD / 2 + 0.15, -0.3, z1, 0.02)
    k.ext('dconc', -FW / 2 - 0.16, FW / 2 + 0.16, -FD / 2 - 0.16, FD / 2 + 0.16, -0.3, 0.05)
    if stubs:
        for x, y, m, r in ((2.4, 1.6, 'pvc', 0.05), (2.9, 1.6, 'pvc', 0.025), (3.6, 2.8, 'abs', 0.05), (-3.2, -1.0, 'abs', 0.05), (-3.0, -0.4, 'pvc', 0.02), (0.6, 3.6, 'pvc', 0.03)):
            k.cyl(m, x, y, z1, r, 0.45, 8)
        k.cyl('dsteel', -4.6, 3.6, z1, 0.06, 0.5, 6)


def house_slab():
    k = Kit('house_slab')
    slab(k)
    for side in range(4):                          # anchor bolts round the edge
        L = FW if side % 2 == 0 else FD
        for i in range(int(L / 1.8)):
            t = -L / 2 + 0.6 + i * 1.8
            x, y = (t, (-1) ** (side // 2) * (FD / 2 - 0.08)) if side % 2 == 0 else ((-1) ** (side // 2) * (FW / 2 - 0.08), t)
            k.cyl('dsteel', x, y, SLAB, 0.008, 0.14, 4)
    for i in range(6):                             # a bundle of rebar and a stack of sill plate left on the slab
        k.beam('rebar', (-4.8, -3.2 + i * 0.04, SLAB + 0.02), (-0.8, -3.1 + i * 0.04, SLAB + 0.02), 0.014, 0.014)
    for i in range(3):
        for j in range(4):
            k.ext('stud', 1.0 + j * 0.15, 1.14 + j * 0.15, -3.4, 0.4, SLAB + i * 0.05, SLAB + 0.045 + i * 0.05)
    return k.done(G, height=1.0, floor=SLAB)


def trusses(k, z, rise, every=0.61, deck=None, wrap=None):
    over = 0.45
    y0, y1 = -FD / 2 - over, FD / 2 + over
    zr = z + rise + rise * over / (FD / 2)
    n = int(FW / every)
    for i in range(n + 1):
        x = -FW / 2 + 0.05 + i * (FW - 0.1) / n
        k.beam('stud', (x, -FD / 2, z + 0.07), (x, FD / 2, z + 0.07), 0.045, 0.14)
        for s in (-1, 1):
            k.beam('stud', (x, s * (FD / 2 + over), z + 0.07 - rise * over / (FD / 2)), (x, 0, z + 0.07 + rise), 0.045, 0.14)
            k.beam('stud', (x, s * FD / 4, z + 0.07), (x, 0, z + rise * 0.95), 0.035, 0.09)
            k.beam('stud', (x, s * FD / 4, z + 0.07), (x, s * FD / 4, z + rise * 0.5), 0.035, 0.09)
    k.ext('wood1', -FW / 2 - 0.3, FW / 2 + 0.3, -0.04, 0.04, z + rise - 0.1, z + rise + 0.08)
    for s in (-1, 1):                              # gable-end ladders
        for j in range(6):
            yy = -FD / 2 + j * FD / 5
            k.beam('stud', (s * (FW / 2 - 0.05), yy, z + 0.07), (s * (FW / 2 - 0.05), yy, z + 0.07 + rise * (1 - abs(yy) / (FD / 2))), 0.045, 0.09)
    if deck:
        mat, cover = deck
        k.gable(mat, FD + 0.2, FW * cover + 0.3, z + 0.07, rise, over=over, t=0.02, plane='YZ', y0=-FW / 2 - 0.3)
        if mat == 'tarpaper':
            k.gable('osb', FD + 0.2, FW + 0.6, z + 0.07, rise, over=over, t=0.012, plane='YZ', y0=-FW / 2 - 0.3)
    if wrap:
        for s in (-1, 1):                          # gable-end sheathing triangles
            k.prism('osb', [(-FD / 2, z + 0.07), (FD / 2, z + 0.07), (0, z + rise)], s * FW / 2 - 0.01, s * FW / 2 + 0.01, 'YZ')


def house_frame_a():
    """Walls up: slab, stud walls with headers and bracing, no roof yet."""
    k = Kit('house_frame_a')
    slab(k, stubs=False)
    walls(k, SLAB)
    for x in (-3.0, 0.5, 3.8):                     # temporary diagonal braces to the slab
        k.beam('wood2', (x, -FD / 2 - 0.08, SLAB + 2.3), (x + 0.2, -FD / 2 - 1.6, 0.05), 0.04, 0.09)
    k.box('osb', 2.5, 1.5, SLAB, 1.22, 2.44, 0.4)
    return k.done(G, height=SLAB + FH, floor=SLAB)


def house_frame_b():
    """Trusses set, some walls sheathed in OSB, part of the roof decked."""
    k = Kit('house_frame_b')
    slab(k, stubs=False)
    walls(k, SLAB, ('osb', 0.6))
    trusses(k, SLAB + FH, FD / 2 * 0.6, deck=('osb', 0.55))
    return k.done(G, height=SLAB + FH + FD * 0.3 + 0.5, floor=SLAB)


def house_frame_c():
    """Dried in: walls sheathed and house-wrapped, roof decked under tar paper, openings still bare."""
    k = Kit('house_frame_c')
    slab(k, stubs=False)
    walls(k, SLAB, ('wrap', 1.0))
    trusses(k, SLAB + FH, FD / 2 * 0.6, deck=('tarpaper', 1.0), wrap=True)
    for x in (-3.5, 0.0, 3.5):                     # wrap tape seams and a pallet of shingles on the deck
        k.ext('blue', x - 0.05, x + 0.05, -FD / 2 - 0.09, -FD / 2 - 0.085, SLAB, SLAB + FH)
    with k.at(-2.0, -1.4, SLAB + FH + FD / 4 * 0.6 + 0.1, rx=31):
        k.box('slate', 0, 0, 0, 1.0, 0.7, 0.32, 0.02)
    return k.done(G, height=SLAB + FH + FD * 0.3 + 0.5, floor=SLAB)


def truss_stack():
    k = Kit('truss_stack')
    for x in (-3.5, 0.0, 3.5):
        k.ext('wood3', x - 0.2, x + 0.2, -0.5, 0.5, 0.0, 0.1)
    for i in range(9):
        z = 0.1 + i * 0.05
        k.beam('stud', (-4.7, 0, z), (4.7, 0, z), 0.14, 0.045)
    for i in range(9):                             # trusses lie flat: webs fan towards the far edge
        z = 0.12 + i * 0.05
        for s in (-1, 1):
            k.beam('stud', (s * 4.7, -0.05, z), (0, 2.5, z), 0.12, 0.04)
            k.beam('stud', (s * 2.35, -0.05, z), (s * 0.4, 2.2, z), 0.09, 0.035)
    k.cbox('dsteel', 0, 1.2, 0.6, 0.02, 2.6, 0.02)
    return k.done(G, height=0.7)


# --- livestock buildings --------------------------------------------------------------------------------

def metal_roof(k, mat, span, L, z, rise, over=0.4):
    k.gable(mat, span, L, z, rise, over=over, t=0.06, plane='YZ', y0=-L / 2 - over)
    for i in range(int((L + 2 * over) / 0.9)):     # standing seams
        x = -L / 2 - over + 0.45 + i * 0.9
        for s in (-1, 1):
            k.beam('zinc', (x, s * (span / 2 + over), z - rise * over / (span / 2) + 0.07), (x, 0, z + rise + 0.07), 0.03, 0.03)
    k.ext('zinc', -L / 2 - over, L / 2 + over, -0.12, 0.12, z + rise + 0.02, z + rise + 0.12)


def stable_barn():
    """Horse stable: board-and-batten row of Dutch-door stalls under a deep front overhang, tack room, cupola."""
    k = Kit('stable_barn')
    L, D, H = 24.0, 9.0, 3.2
    k.ext('dconc', -L / 2 - 0.1, L / 2 + 0.1, -D / 2 - 2.6, D / 2 + 0.1, -0.2, 0.08)
    k.ext('barn', -L / 2, L / 2, -D / 2, D / 2, 0.08, H)
    for i in range(int(L / 0.6)):
        x = -L / 2 + 0.3 + i * 0.6
        for y in (-D / 2 - 0.02, D / 2 + 0.02):
            k.ext('dred', x - 0.04, x + 0.04, y - 0.02, y + 0.02, 0.08, H)
    for s in (-1, 1):
        k.prism('barn', [(-D / 2, H), (D / 2, H), (0, H + D / 2 * 0.45)], s * L / 2 - 0.05, s * L / 2 + 0.02, 'YZ')
    n = 7
    for i in range(n):
        x = -L / 2 + (i + 0.5) * L / n
        tack = i == n // 2
        k.ext('white', x - 0.75, x + 0.75, -D / 2 - 0.04, -D / 2 - 0.01, 0.08, 2.5)
        k.ext('dred' if not tack else 'wood3', x - 0.65, x + 0.65, -D / 2 - 0.07, -D / 2 - 0.03, 0.12, 1.3)
        if tack:
            k.ext('wood3', x - 0.65, x + 0.65, -D / 2 - 0.07, -D / 2 - 0.03, 1.32, 2.42)
        else:
            k.ext('black', x - 0.6, x + 0.6, -D / 2 - 0.04, -D / 2 - 0.02, 1.35, 2.4)
            k.cbox('white', x, -D / 2 - 0.075, 0.71, 0.08, 0.02, 1.4, rx=0, ry=42)
            k.cbox('white', x, -D / 2 - 0.075, 0.71, 0.08, 0.02, 1.4, ry=-42)
        k.cbox('iron', x + 0.55, -D / 2 - 0.09, 1.25, 0.12, 0.03, 0.05)
        k.cyl('galv', x + 0.9, -D / 2 - 0.04, 1.6, 0.05, 0.04, 6, axis='-Y')
    k.ext('white', -L / 2, L / 2, -D / 2 - 0.05, -D / 2, H - 0.25, H)
    for i in range(9):                             # overhang on posts
        x = -L / 2 + 0.2 + i * (L - 0.4) / 8
        k.box('wood2', x, -D / 2 - 2.4, 0.08, 0.18, 0.18, H - 0.38)
        k.beam('wood2', (x, -D / 2 - 2.4, H - 0.9), (x, -D / 2 - 1.6, H - 0.3), 0.1, 0.1)
    k.ext('wood2', -L / 2, L / 2, -D / 2 - 2.5, -D / 2 - 2.3, H - 0.4, H - 0.2)
    with k.at(0, -D / 2, H - 0.1, rx=-10):
        k.ext('zinc', -L / 2 - 0.2, L / 2 + 0.2, -2.75, 0.1, 0, 0.05)
    metal_roof(k, 'roof', D, L, H, D / 2 * 0.45)
    k.box('white', 0, 0, H + D / 2 * 0.45 + 0.05, 1.3, 1.3, 1.2, 0.02)
    for s in (-1, 1):
        k.ext('black', -0.4, 0.4, s * 0.66 - 0.01, s * 0.66 + 0.01, H + D / 2 * 0.45 + 0.3, H + D / 2 * 0.45 + 1.0)
    k.gable('roof', 1.6, 1.6, H + D / 2 * 0.45 + 1.25, 0.55, over=0.1, t=0.05)
    k.rod('iron', (0, 0, H + D / 2 * 0.45 + 1.8), (0, 0, H + D / 2 * 0.45 + 2.6), 0.02)
    k.ext('iron', -0.5, 0.0, -0.02, 0.02, H + D / 2 * 0.45 + 2.35, H + D / 2 * 0.45 + 2.6)
    return k.done(G, height=H + D / 2 * 0.45 + 2.6)


def hog_barn():
    """Long low confinement barn: white steel siding, roll-up curtain sides, roof fans, end-wall fans."""
    k = Kit('hog_barn')
    L, D, H = 32.0, 11.0, 2.8
    k.ext('dconc', -L / 2 - 0.2, L / 2 + 0.2, -D / 2 - 0.2, D / 2 + 0.2, -0.2, 0.3)
    for y in (-D / 2, D / 2):
        k.ext('white', -L / 2, L / 2, y - 0.08, y + 0.08, 0.3, 1.0)
        k.ext('curtain', -L / 2 + 0.3, L / 2 - 0.3, y - 0.05, y + 0.05, 1.0, H - 0.25)
        k.ext('white', -L / 2, L / 2, y - 0.08, y + 0.08, H - 0.25, H)
        for i in range(17):
            x = -L / 2 + 0.15 + i * (L - 0.3) / 16
            k.ext('white', x - 0.1, x + 0.1, y - 0.1, y + 0.1, 0.3, H)
    for s in (-1, 1):
        k.ext('white', s * L / 2 - 0.08, s * L / 2 + 0.08, -D / 2, D / 2, 0.3, H)
        k.prism('white', [(-D / 2, H), (D / 2, H), (0, H + D / 2 * 0.3)], s * L / 2 - 0.08, s * L / 2 + 0.08, 'YZ')
    for y in (-2.6, 2.6):                          # end-wall exhaust fans
        k.cbox('dgrey', L / 2 + 0.2, y, 1.5, 0.3, 1.5, 1.5, 0.04)
        for j in range(6):
            k.cbox('galv', L / 2 + 0.36, y, 0.9 + j * 0.24, 0.02, 1.3, 0.03)
    k.cbox('dgrey', -L / 2 - 0.12, 0, 1.2, 0.08, 1.0, 1.8)
    metal_roof(k, 'galv', D, L, H, D / 2 * 0.3, over=0.3)
    for i in range(4):
        x = -L / 2 + 4 + i * (L - 8) / 3
        k.cyl('galv', x, 0, H + D / 2 * 0.3 + 0.05, 0.35, 0.6, 10)
        k.cyl('dsteel', x, 0, H + D / 2 * 0.3 + 0.65, 0.42, 0.06, 10)
    return k.done(G, height=H + D / 2 * 0.3 + 0.75)


def feed_bin():
    """Bulk feed bin on four legs with a hopper cone, ladder and auger tube."""
    k = Kit('feed_bin')
    r, z0 = 1.3, 1.6
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.beam('galv', (sx * 0.95, sy * 0.95, 0), (sx * 0.95, sy * 0.95, z0 + 1.2), 0.1, 0.1)
            k.box('conc', sx * 0.95, sy * 0.95, -0.1, 0.4, 0.4, 0.15)
    k.lathe('galv', [(0.0, z0 - 0.9), (0.18, z0 - 0.9), (r, z0 + 0.4), (r, z0 + 4.6), (0.3, z0 + 5.6), (0.0, z0 + 5.7)], 20)
    for i in range(1, 9):
        k.torus('zinc', 0, 0, z0 + 0.4 + i * 0.52, r + 0.005, 0.012, 20, 3)
    k.ladder('galv', 0, -r - 0.05, 0.4, z0 + 4.6)
    k.rod('galv', (0, 0, z0 - 0.9), (0.6, 4.0, 1.2), 0.08, 8)
    k.cyl('dsteel', 0, 0, z0 + 5.55, 0.32, 0.18, 10)
    return k.done(G, height=z0 + 5.8)


def loafing_shed():
    """Three-sided open-front field shelter with a single-slope metal roof."""
    k = Kit('loafing_shed')
    L, D, Hf, Hb = 12.0, 5.0, 3.0, 2.3
    for x in (-L / 2, -L / 4, 0, L / 4, L / 2):
        k.box('wood3', x, -D / 2, 0, 0.16, 0.16, Hf)
        k.box('wood3', x, D / 2, 0, 0.16, 0.16, Hb)
    k.ext('wold', -L / 2, L / 2, D / 2 - 0.04, D / 2 + 0.04, 0.0, Hb)
    for s in (-1, 1):
        k.prism('wold', [(-D / 2, 0), (D / 2, 0), (D / 2, Hb), (-D / 2, Hf)], s * L / 2 - 0.04, s * L / 2 + 0.04, 'YZ')
    for i in range(int(L / 0.5)):
        x = -L / 2 + 0.25 + i * 0.5
        k.ext('wood3', x - 0.03, x + 0.03, D / 2 + 0.04, D / 2 + 0.07, 0, Hb)
    k.ext('wood2', -L / 2, L / 2, -D / 2 - 0.1, -D / 2 + 0.1, Hf - 0.25, Hf)
    with k.at(0, -D / 2 - 0.5, Hf + 0.05, rx=-math.degrees(math.atan((Hf - Hb) / D))):
        k.ext('zinc', -L / 2 - 0.3, L / 2 + 0.3, 0, D + 1.0, 0, 0.05)
    k.ext('hay', -L / 2 + 0.5, -L / 2 + 2.6, D / 2 - 1.6, D / 2 - 0.2, 0, 1.0, 0.1)
    k.box('galv', 2.0, 0.5, 0, 2.4, 0.7, 0.6, 0.02)
    k.ext('water', 0.9, 3.1, 0.2, 0.8, 0.45, 0.52)
    return k.done(G, height=Hf + 0.3)



# --- churchyard and memorials --------------------------------------------------------------------------------

M = 'memorial'
K.PAL.update({'granite': ('paint', '#8e8c88'), 'granite2': ('paint', '#6f6e6b'), 'marble': ('paint', '#dcd8cf'), 'moss': ('paint', '#6f7a4a'),
              'flame': ('light', '#ffb347'), 'gilt': ('metal', '#c9a24a')})


def headstone(name, kind, mat='granite'):
    k = Kit(name)
    k.box('dconc', 0, 0, 0, 1.0, 0.5, 0.14, 0.02)
    if kind == 'round':
        k.box(mat, 0, 0, 0.14, 0.7, 0.16, 0.62, 0.02)
        k.cyl(mat, 0, 0.08, 0.76, 0.35, 0.16, 16, axis='-Y', a0=0)
        k.cbox('granite2', 0, -0.085, 0.55, 0.42, 0.01, 0.06)
        k.cbox('granite2', 0, -0.085, 0.42, 0.3, 0.01, 0.04)
        k.cbox('moss', 0.22, -0.02, 0.17, 0.2, 0.17, 0.04)
    elif kind == 'cross':
        k.box(mat, 0, 0, 0.14, 0.5, 0.3, 0.24, 0.02)
        k.box(mat, 0, 0, 0.38, 0.14, 0.12, 1.0, 0.01)
        k.cbox(mat, 0, 0, 1.1, 0.56, 0.12, 0.14, 0.01)
    elif kind == 'flat':
        k.box(mat, 0, 0, 0.14, 0.9, 0.3, 0.4, 0.03)
        k.cbox('granite2', 0, -0.152, 0.38, 0.6, 0.01, 0.05)
        k.cbox('granite2', 0, -0.152, 0.28, 0.4, 0.01, 0.04)
        k.cyl('bronze', 0.32, -0.0, 0.54, 0.04, 0.2, 6)
    else:
        k.box(mat, 0, 0, 0.14, 0.62, 0.62, 0.3, 0.02)
        k.box(mat, 0, 0, 0.44, 0.44, 0.44, 0.24, 0.01)
        k.lathe(mat, [(0.0, 0.68), (0.18, 0.68), (0.11, 2.3), (0.0, 2.5)], 4, a0=45)
    k.box('dirt2', 0, 0.85, 0, 0.9, 1.6, 0.03, 0.01)
    return k.done(M, height=2.5 if kind == 'obelisk' else 1.2)


def iron_fence():
    k = Kit('iron_fence')
    L, H = 3.0, 1.2
    k.ext('stone2', -L / 2, L / 2, -0.12, 0.12, 0, 0.3, 0.02)
    for y in (0.5, H - 0.1):
        k.ext('iron', -L / 2, L / 2, -0.015, 0.015, y, y + 0.04)
    for i in range(20):
        x = -L / 2 + 0.075 + i * 0.15
        k.cbox('iron', x, 0, 0.3 + (H - 0.3) / 2 + 0.05, 0.022, 0.022, H - 0.2)
        k.cbox('iron', x, 0, H + 0.08, 0.05, 0.05, 0.1, rz=45)
    for sx in (-1, 1):
        k.box('stone2', sx * L / 2, 0, 0, 0.36, 0.36, H + 0.25, 0.02)
        k.box('stone', sx * L / 2, 0, H + 0.25, 0.44, 0.44, 0.1, 0.02)
    return k.done(M, length=L, height=H + 0.35)


def cemetery_gate():
    k = Kit('cemetery_gate')
    W, H = 4.0, 2.4
    for sx in (-1, 1):
        k.box('stone2', sx * (W / 2 + 0.3), 0, 0, 0.6, 0.6, H, 0.03)
        k.box('stone', sx * (W / 2 + 0.3), 0, H, 0.72, 0.72, 0.14, 0.03)
        k.lathe('stone', [(0, H + 0.14), (0.2, H + 0.14), (0.22, H + 0.3), (0, H + 0.55)], 10, x=sx * (W / 2 + 0.3))
        for i in range(12):
            x = sx * (0.1 + i * 0.16)
            k.cbox('iron', x, 0, 1.0, 0.025, 0.025, 1.9)
        k.ext('iron', sx * 0.05, sx * (W / 2), -0.02, 0.02, 0.12, 0.16)
        k.ext('iron', sx * 0.05, sx * (W / 2), -0.02, 0.02, 1.85, 1.9)
    k.tube('iron', [(-W / 2, 0, H - 0.1)] + [(-W / 2 + W * t / 8, 0, H + 0.8 * math.sin(math.pi * t / 8)) for t in range(1, 8)] + [(W / 2, 0, H - 0.1)], 0.03, 5)
    k.cbox('iron', 0, 0, H + 0.62, 1.6, 0.03, 0.34)
    k.cbox('gilt', 0, -0.02, H + 0.62, 1.4, 0.01, 0.22)
    return k.done(M, height=H + 0.9)


def memorial_wall():
    """Low granite wall of names in three angled panels, with a centre plaque, flag sockets and a flame bowl."""
    k = Kit('memorial_wall')
    for i, ang in ((-1, 18), (0, 0), (1, -18)):
        with k.at(i * 3.55, abs(i) * 0.55, 0, rz=ang):
            k.box('granite2', 0, 0, 0, 3.6, 0.7, 0.3, 0.02)
            k.box('granite', 0, 0, 0.3, 3.4, 0.45, 1.25 if i else 1.7, 0.03)
            k.box('granite2', 0, 0, 1.55 if i else 2.0, 3.5, 0.55, 0.08, 0.02)
            for r in range(9 if i else 12):
                for c in range(3):
                    k.cbox('marble', -1.1 + c * 1.1, -0.228, 0.45 + r * 0.12, 0.8, 0.005, 0.03)
    k.cbox('bronze', 0, -0.24, 1.75, 1.1, 0.02, 0.35)
    k.cbox('gilt', 0, -0.252, 1.85, 0.8, 0.006, 0.05)
    k.box('granite2', 0, -1.9, 0, 1.2, 1.2, 0.5, 0.04)
    k.lathe('bronze', [(0, 0.5), (0.45, 0.6), (0.52, 0.75), (0.4, 0.8), (0, 0.72)], 16, y=-1.9)
    k.cyl('flame', 0, -1.9, 0.76, 0.15, 0.35, 8, r2=0.02)
    for x in (-2.0, 0.0, 2.0):
        k.cyl('dsteel', x, 1.0, 0, 0.06, 0.1, 8)
    return k.done(M, height=2.1)


def cannon_field():
    k = Kit('cannon_field')
    for sy in (-1, 1):
        k.torus('wood3', 0.2, sy * 0.5, 0.72, 0.68, 0.05, 16, 4, axis='Y')
        k.cyl('iron', 0.2, sy * 0.5, 0.72, 0.1, 0.16, 8, axis='Y')
        for a in range(0, 180, 30):
            c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
            k.rod('wood3', (0.2 - 0.66 * c, sy * 0.5, 0.72 - 0.66 * s), (0.2 + 0.66 * c, sy * 0.5, 0.72 + 0.66 * s), 0.03, 4)
        k.beam('wood2', (0.2, sy * 0.25, 0.75), (-1.9, sy * 0.1, 0.05), 0.12, 0.2)
    k.box('granite2', 0, 0, 0, 3.8, 1.6, 0.06, 0.02)
    with k.at(0.2, 0, 0.92, ry=-6):
        k.cyl('bronze', -0.6, 0, 0, 0.2, 2.2, 12, axis='X', r2=0.13)
        k.cyl('bronze', -0.75, 0, 0, 0.23, 0.12, 12, axis='X')
        k.cyl('bronze', 1.58, 0, 0, 0.15, 0.06, 12, axis='X')
    return k.done(M, height=1.45)


def plaque_stand():
    k = Kit('plaque_stand')
    k.box('granite2', 0, 0, 0, 0.9, 0.6, 0.15, 0.02)
    k.box('granite', 0, 0, 0.15, 0.6, 0.35, 0.8, 0.02)
    with k.at(0, -0.05, 0.95, rx=35):
        k.cbox('bronze', 0, 0, 0, 0.75, 0.5, 0.05, 0.01)
        k.cbox('gilt', 0, -0.0, 0.027, 0.55, 0.06, 0.005)
    return k.done(M, height=1.25)


ALL = (hv_pylon, pig, lambda: pig('pig_spotted', True), sheep, lambda: sheep('sheep_white', 'cream_b'), horse,
       lambda: horse('horse_grey', 'grey_horse', 'dgrey', False), lambda: horse('horse_chestnut', 'chest', 'bay', True), goat,
       lambda: goat('goat_brown', 'goat2', 'black'), house_slab, house_frame_a, house_frame_b, house_frame_c, truss_stack,
       stable_barn, hog_barn, feed_bin, loafing_shed,
       lambda: headstone('headstone_round', 'round'), lambda: headstone('headstone_cross', 'cross', 'marble'), lambda: headstone('headstone_flat', 'flat'),
       lambda: headstone('obelisk', 'obelisk', 'marble'), iron_fence, cemetery_gate, memorial_wall, cannon_field, plaque_stand)

SHEETS = [
    ('farm_pylon', ['hv_pylon'], 'shot', dict(gap=1.0, elev=8, azim=-30)),
    ('farm_stock', ['pig', 'pig_spotted', 'sheep', 'sheep_white', 'goat', 'goat_brown', 'horse_bay', 'horse_grey', 'horse_chestnut'], 'shot', dict(gap=0.5, elev=14, azim=-40, cols=5)),
    ('farm_frames', ['house_slab', 'house_frame_a', 'house_frame_b', 'house_frame_c', 'truss_stack'], 'shot', dict(gap=1.0, elev=22, azim=-34, cols=3)),
    ('farm_memorial', ['headstone_round', 'headstone_cross', 'headstone_flat', 'obelisk', 'iron_fence', 'cemetery_gate', 'memorial_wall', 'cannon_field', 'plaque_stand'], 'shot', dict(gap=0.6, elev=14, azim=-30, cols=5)),
    ('farm_barns', ['stable_barn', 'hog_barn', 'feed_bin', 'loafing_shed'], 'shot', dict(gap=1.5, elev=16, azim=-30, cols=2)),
]


def build():
    for f in ALL:
        f()

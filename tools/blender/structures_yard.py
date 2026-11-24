"""Lots, farm and yard: containers, lumber, sheds, hay, farm tanks, construction-site pieces."""
import math, random
from structures_kit import Kit, circle, rrect, corr_profile

G = 'yard'


# --- containers ---------------------------------------------------------------------------------------
def container_leaf(p, s, lw, hd, mat, ang, label=False):
    """Container door leaf hanging from the part origin: s = +1 runs towards +Y when closed, -1 towards -Y."""
    with p.at(rz=ang):
        p.ext(mat, -0.025, 0.025, s * 0.012, s * lw, 0.0, hd, 0.006)
        for z in (0.25, hd * 0.5, hd - 0.25):
            p.ext(mat, 0.025, 0.045, s * 0.06, s * (lw - 0.04), z - 0.05, z + 0.05)
        for f in (0.3, 0.74):
            y = s * lw * f
            p.cyl('galv', 0.062, y, 0.02, 0.016, hd - 0.04, 6)
            for z in (0.12, hd - 0.12):
                p.cbox('dsteel', 0.055, y, z, 0.03, 0.07, 0.06)
            p.cbox('dsteel', 0.07, y - s * 0.1, 1.05, 0.016, 0.26, 0.03)
            p.cbox('dsteel', 0.06, y - s * 0.2, 1.05, 0.03, 0.05, 0.07)
        for z in (0.2, hd * 0.37, hd * 0.63, hd - 0.2):
            p.cbox('dsteel', 0.0, s * 0.03, z, 0.08, 0.07, 0.12)
        if label:
            p.cbox('white', 0.027, s * lw * 0.52, hd - 0.62, 0.006, 0.42, 0.3)
            p.cbox('yellow', 0.027, s * lw * 0.52, hd - 0.92, 0.006, 0.42, 0.1)


def container(name, opened=False, mat='body'):
    k = Kit(name)
    L, W, H = 6.06, 2.44, 2.59
    for sy in (-1, 1):
        k.ext(mat, -L / 2, L / 2, sy * W / 2 - sy * 0.14, sy * W / 2, 0.02, 0.18, 0.008)
        k.ext(mat, -L / 2, L / 2, sy * W / 2 - sy * 0.1, sy * W / 2, H - 0.12, H - 0.01, 0.008)
        for sx in (-1, 1):
            k.box(mat, sx * (L / 2 - 0.07), sy * (W / 2 - 0.07), 0.02, 0.14, 0.14, H - 0.03, 0.008)
            for z in (0.0, H - 0.13):
                k.box('dsteel', sx * (L / 2 - 0.08), sy * (W / 2 - 0.08), z, 0.18, 0.18, 0.13, 0.012)
    for sx in (-1, 1):
        k.ext(mat, sx * L / 2 - sx * 0.12, sx * L / 2, -W / 2 + 0.14, W / 2 - 0.14, H - 0.14, H - 0.01, 0.008)
        k.ext(mat, sx * L / 2 - sx * 0.12, sx * L / 2, -W / 2 + 0.14, W / 2 - 0.14, 0.02, 0.17, 0.008)
    k.ext('wood3', -L / 2 + 0.05, L / 2 - 0.05, -W / 2 + 0.1, W / 2 - 0.1, 0.1, 0.19)
    prof = corr_profile(L - 0.28, 0.55, 0.05, 0.02, 0.28)
    for sy in (-1, 1):
        k.prism(mat, [(u, sy * (W / 2 - 0.075 + v)) for u, v in prof], 0.18, H - 0.12, 'XY')
    k.prism(mat, [(-(L / 2 - 0.075 + v), u) for u, v in corr_profile(W - 0.28, 0.55, 0.05, 0.02, 0.28)], 0.17, H - 0.14, 'XY')
    k.prism(mat, [(u, H - 0.075 + v) for u, v in corr_profile(L - 0.24, 0.6, 0.03, 0.02)], -W / 2 + 0.1, W / 2 - 0.1, 'XZ')
    lw, hd = W / 2 - 0.15, H - 0.33
    hx = L / 2 - 0.03
    dl = k.part('door_l', hx, -(W / 2 - 0.145), 0.18)
    container_leaf(dl, 1, lw, hd, mat, -112 if opened else 0)
    dr = k.part('door_r', hx, W / 2 - 0.145, 0.18)
    container_leaf(dr, -1, lw, hd, mat, 258 if opened else 0, label=True)
    k.cbox('white', -L / 2 + 1.0, -W / 2 + 0.03, H - 0.55, 0.9, 0.006, 0.3)
    if opened:
        k.box('tan', 1.9, 0.5, 0.19, 1.0, 1.1, 0.9, 0.015)
        k.box('tan', 1.9, -0.6, 0.19, 0.9, 0.9, 0.7, 0.015)
        k.box('tan', 1.95, 0.45, 1.09, 0.8, 0.8, 0.6, 0.015, rz=8)
        k.box('wood1', 0.7, 0.0, 0.19, 1.1, 1.9, 1.3, 0.02)
        for z in (0.5, 1.0):
            k.box('wood3', 0.7, 0.0, z, 1.13, 1.93, 0.08)
    return k.done(G, length=L, width=W, height=H, doors={'door_l': -112 if opened else 0, 'door_r': 258 if opened else 0})


# --- lumber -------------------------------------------------------------------------------------------
def boards(k, rnd, x, y, z, L, W, layers, per, bt, mats=('wood1', 'ply', 'wood2', 'wood1'), sticker=0.02, jit=0.04):
    """Stickered pack of boards running along X; returns the top height."""
    bw = W / per
    for j in range(layers):
        for i in range(per):
            dx = rnd.uniform(-jit, jit)
            k.ext(rnd.choice(mats), x - L / 2 + dx, x + L / 2 + dx, y - W / 2 + i * bw + 0.004, y - W / 2 + (i + 1) * bw - 0.004, z, z + bt)
        z += bt
        if sticker and j < layers - 1:
            for f in (-0.36, 0.0, 0.36):
                k.ext('wood3', x + f * L - 0.02, x + f * L + 0.02, y - W / 2 - 0.02, y + W / 2 + 0.02, z, z + sticker)
            z += sticker
    return z


def bunks(k, x, y, z, L, W, n=3, s=0.09, mat='wood3'):
    for i in range(n):
        xx = x - L * 0.38 + L * 0.76 * i / (n - 1)
        k.ext(mat, xx - s / 2, xx + s / 2, y - W / 2 - 0.03, y + W / 2 + 0.03, z, z + s, 0.008)
    return z + s


def straps(k, xs, y, z0, z1, W, mat='dsteel'):
    for x in xs:
        k.ext(mat, x - 0.02, x + 0.02, y - W / 2 - 0.006, y + W / 2 + 0.006, z0 - 0.004, z1 + 0.006)


def lumber_stack_a():
    k = Kit('lumber_stack_a')
    rnd = random.Random(11)
    z = bunks(k, 0, 0, 0, 3.6, 1.1)
    z = boards(k, rnd, 0, 0, z, 3.6, 1.1, 7, 6, 0.045)
    return k.done(G, length=3.6)


def lumber_stack_b():
    k = Kit('lumber_stack_b')
    rnd = random.Random(12)
    z0 = bunks(k, 0, 0, 0, 4.8, 1.2)
    z = boards(k, rnd, 0, 0, z0, 4.8, 1.2, 6, 5, 0.05, jit=0.06)
    z1 = bunks(k, 0, 0, z, 4.2, 1.2, 3, 0.07)
    z2 = boards(k, rnd, -0.2, 0, z1, 4.2, 1.14, 6, 8, 0.045, mats=('wood1', 'wood1', 'ply'), sticker=0, jit=0.0)
    straps(k, (-1.6, 1.2), 0, z1, z2, 1.14)
    k.ext('red', -2.305, -2.3, -0.565, 0.565, z1 + 0.004, z2 - 0.004)
    return k.done(G, length=4.8)


def lumber_stack_c():
    k = Kit('lumber_stack_c')
    rnd = random.Random(13)
    z = bunks(k, 0, 0, 0, 3.0, 0.9, 2, 0.1)
    s = 0.15
    for j, n in enumerate((5, 4, 3)):
        for i in range(n):
            y = (i - (n - 1) / 2) * (s + 0.012)
            dx = rnd.uniform(-0.08, 0.08)
            k.ext(rnd.choice(('wood2', 'wood1', 'wood2')), -1.5 + dx, 1.5 + dx, y - s / 2, y + s / 2, z, z + s, 0.008)
        z += s
        if j < 2:
            for x in (-1.0, 1.0):
                k.ext('wood3', x - 0.02, x + 0.02, -n * 0.08, n * 0.08, z, z + 0.025)
            z += 0.025
    k.box('wood1', 0.25, 0.0, z, 2.4, s, s, 0.008, rz=9)
    k.box('wood2', 0.1, -0.75, 0.0, 3.0, s, s, 0.008, rz=-4)
    return k.done(G, length=3.0)


def plywood_stack():
    k = Kit('plywood_stack')
    rnd = random.Random(14)
    L, W = 2.44, 1.22
    z = bunks(k, 0, 0, 0, L, W)
    z0 = z
    for i in range(11):
        t = 0.045
        k.box('ply' if i % 2 == 0 else 'wood1', rnd.uniform(-0.015, 0.015), rnd.uniform(-0.015, 0.015), z, L, W, t - 0.004)
        z += t
    straps(k, (-0.8, 0.8), 0, z0, z, W + 0.03)
    k.box('ply', 0.1, 0.06, z + 0.008, L, W, 0.02, 0.003, rz=7)
    k.box('wood1', -0.12, -0.02, z + 0.03, L, W, 0.02, 0.003, rz=-3)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('tan', sx * (L / 2 - 0.05), sy * (W / 2 - 0.05), z0 + 0.1, 0.14, 0.14, 0.3, 0.006)
    return k.done(G, length=L)


def log_deck():
    k = Kit('log_deck')
    rnd = random.Random(7)
    r, L = 0.25, 5.0
    for y in (-1.6, 1.6):
        k.cyl('bark', -2.1, y, 0.14, 0.14, 4.2, 7, axis='X')
    z0 = 0.26
    for j, n in enumerate((7, 6, 5, 4, 3)):
        for i in range(n):
            x = (i - (n - 1) / 2) * r * 2.04
            rr = r * rnd.uniform(0.84, 1.0)
            ll = L + rnd.uniform(-0.3, 0.2)
            dy = rnd.uniform(-0.2, 0.2)
            z = z0 + r + j * r * 1.75 - (r - rr)
            a = rnd.uniform(0, 45)
            k.cyl('bark', x, dy - ll / 2, z, rr, ll, 8, axis='Y', a0=a)
            k.cyl('endgrain', x, dy - ll / 2 - 0.012, z, rr * 0.86, ll + 0.024, 8, axis='Y', a0=a)
    for sx in (-1, 1):
        for y in (-1.6, 1.6):
            k.box('dsteel', sx * 1.92, y, 0.0, 0.1, 0.1, 1.9, 0.01)
            k.box('dsteel', sx * 1.92, y, 0.0, 0.3, 0.3, 0.03, 0.006)
    return k.done(G, length=L, width=3.9)


# --- sheds --------------------------------------------------------------------------------------------
def lumber_shed():
    k = Kit('lumber_shed')
    rnd = random.Random(21)
    xs = (-5.7, -1.9, 1.9, 5.7)
    yf, yb, hf, hb = -2.8, 2.8, 4.6, 3.7
    for x in xs:
        for y, h in ((yf, hf), (yb, hb)):
            k.box('conc', x, y, 0, 0.42, 0.42, 0.22, 0.03)
            k.box('wood3', x, y, 0.2, 0.22, 0.22, h - 0.2, 0.012)
        for sx in (-1, 1):
            if abs(x + sx * 1.0) < 6:
                k.beam('wood3', (x + sx * 0.08, yf, hf - 0.95), (x + sx * 0.95, yf, hf - 0.02), 0.1, 0.1)
    for y, h in ((yf, hf), (yb, hb)):
        k.ext('wood2', -6.0, 6.0, y - 0.1, y + 0.1, h, h + 0.25, 0.01)
    ang = math.degrees(math.atan2(hb - hf, yb - yf))
    with k.at(0, 0, (hf + hb) / 2 + 0.25, rx=ang):
        for i in range(9):
            x = -5.9 + i * 11.8 / 8
            k.ext('wood2', x - 0.04, x + 0.04, -3.45, 3.35, 0.0, 0.18)
        for i in range(6):
            y = -3.3 + i * 6.5 / 5
            k.ext('wood3', -6.2, 6.2, y - 0.04, y + 0.04, 0.18, 0.24)
        k.prism('zinc', [(u, 0.24 + v) for u, v in corr_profile(12.7, 0.62, 0.05, 0.02)], -3.6, 3.5, 'XZ')
        k.ext('dgreen', -6.36, 6.36, -3.63, -3.59, -0.04, 0.3, 0.006)
        for sx in (-1, 1):
            k.ext('dgreen', sx * 6.33 - 0.02, sx * 6.33 + 0.02, -3.6, 3.5, -0.02, 0.3)
    for i in range(9):
        k.ext(('wold', 'wood2', 'wold', 'wood3')[i % 4], -5.9, 5.9, yb + 0.11, yb + 0.14, 0.3 + i * 0.36 + 0.008, 0.3 + (i + 1) * 0.36 - 0.008)
    for x in xs:
        for z in (0.55, 1.65, 2.7):
            k.ext('wood3', x - 0.06, x + 0.06, 1.0, yb - 0.1, z - 0.14, z, 0.008)
            k.beam('wood3', (x, 1.2, z - 0.14), (x, yb - 0.1, z - 0.6), 0.08, 0.08)
    for b in range(3):
        xc = -3.8 + b * 3.8
        for z in (0.55, 1.65, 2.7):
            if rnd.random() < 0.15:
                continue
            h = rnd.uniform(0.28, 0.62)
            Lb = rnd.uniform(3.2, 3.7)
            dx = rnd.uniform(-0.1, 0.1)
            m = rnd.choice(('wood1', 'ply', 'wood2', 'wood1'))
            k.ext(m, xc - Lb / 2 + dx, xc + Lb / 2 + dx, 1.25, 2.55, z, z + h, 0.012)
            k.ext('endgrain', xc - Lb / 2 + dx - 0.004, xc + Lb / 2 + dx + 0.004, 1.29, 2.51, z + 0.03, z + h - 0.03)
            for f in (-0.3, 0.3):
                k.ext('dsteel', xc + dx + f * Lb - 0.02, xc + dx + f * Lb + 0.02, 1.244, 2.556, z, z + h + 0.006)
    z = bunks(k, -3.6, -0.6, 0, 3.6, 1.1)
    boards(k, rnd, -3.6, -0.6, z, 3.6, 1.1, 4, 5, 0.05)
    z = bunks(k, 3.4, -0.9, 0, 3.0, 1.0)
    boards(k, rnd, 3.4, -0.9, z, 3.0, 1.0, 6, 4, 0.06, mats=('wood2', 'wood1'))
    k.sign(0, yf - 0.16, hf + 0.12, 3.6, 0.6, t=0.1, back=False)
    return k.done(G, footprint=[12.0, 6.0], clear_height=3.5)


def carport():
    k = Kit('carport')
    W, D, hf, hb = 3.2, 5.6, 2.45, 2.2
    k.ext('conc', -W / 2, W / 2, -D / 2, D / 2, 0, 0.06, 0.015)
    for sx in (-1, 1):
        for y, h in ((-D / 2 + 0.25, hf), (0.0, (hf + hb) / 2), (D / 2 - 0.25, hb)):
            k.box('white', sx * (W / 2 - 0.12), y, 0.06, 0.09, 0.09, h - 0.06, 0.008)
            k.box('dsteel', sx * (W / 2 - 0.12), y, 0.06, 0.2, 0.2, 0.02, 0.004)
    ang = math.degrees(math.atan2(hb - hf, D - 0.5))
    with k.at(0, 0, (hf + hb) / 2, rx=ang):
        for sx in (-1, 1):
            k.ext('white', sx * (W / 2 - 0.12) - 0.05, sx * (W / 2 - 0.12) + 0.05, -D / 2 - 0.1, D / 2 + 0.1, 0.0, 0.16, 0.008)
        for i in range(5):
            y = -D / 2 + 0.1 + i * (D - 0.2) / 4
            k.ext('white', -W / 2 - 0.1, W / 2 + 0.1, y - 0.03, y + 0.03, 0.16, 0.24)
        k.prism('zinc', [(u, 0.24 + v) for u, v in corr_profile(W + 0.4, 0.3, 0.035, 0.02)], -D / 2 - 0.25, D / 2 + 0.25, 'XZ')
        k.ext('white', -W / 2 - 0.22, W / 2 + 0.22, -D / 2 - 0.29, -D / 2 - 0.25, 0.08, 0.32, 0.006)
        k.ext('stripe', -W / 2 - 0.222, W / 2 + 0.222, -D / 2 - 0.296, -D / 2 - 0.25, 0.16, 0.22)
    for sx in (-1, 1):
        k.beam('white', (sx * (W / 2 - 0.12), -D / 2 + 0.3, hf - 0.5), (sx * (W / 2 - 0.12), -D / 2 + 0.75, hf - 0.03), 0.05, 0.05)
    return k.done(G, footprint=[W, D])


def garden_shed():
    k = Kit('garden_shed')
    W, D, H = 2.4, 1.8, 2.0
    k.ext('wood3', -W / 2 - 0.04, W / 2 + 0.04, -D / 2 - 0.04, D / 2 + 0.04, 0, 0.1, 0.01)
    k.ext('green', -W / 2, W / 2, -D / 2, D / 2, 0.1, H)
    for sx in (-1, 1):
        k.prism('green', [(-D / 2, H), (D / 2, H), (0, H + 0.62)], sx * W / 2 - (0.02 if sx > 0 else 0), sx * W / 2 + (0.02 if sx < 0 else 0), 'YZ')
        k.prism('white', [(-D / 2, H - 0.02), (D / 2, H - 0.02), (D / 2, H + 0.08), (-D / 2, H + 0.08)], sx * (W / 2 + 0.012) - 0.012, sx * (W / 2 + 0.012) + 0.012, 'YZ')
        for sy in (-1, 1):
            k.box('white', sx * W / 2, sy * D / 2, 0.1, 0.1, 0.1, H - 0.1, 0.008)
        for i in range(1, 6):
            k.box('dgreen', sx * (W / 2 + 0.006), -D / 2 + i * D / 6, 0.1, 0.012, 0.035, H - 0.1 + 0.6 * (1 - abs(-D / 2 + i * D / 6) / (D / 2)))
    for sy in (-1, 1):
        for i in range(1, 8):
            x = -W / 2 + i * W / 8
            if sy < 0 and (-0.95 < x < 0.05 or 0.35 < x < 1.0):
                continue
            k.box('dgreen', x, sy * (D / 2 + 0.006), 0.1, 0.035, 0.012, H - 0.1)
    k.gable('roof', D, W, H, 0.62, over=0.18, t=0.07, plane='YZ')
    k.ext('dgrey', -W / 2 - 0.2, W / 2 + 0.2, -0.06, 0.06, H + 0.68, H + 0.74, 0.01)
    # door
    k.frame('white', -0.45, -D / 2 - 0.012, 0.1, 0.96, 1.86, 0.08, 0.03, 0.005, bottom=False)
    k.ext('door', -0.85, -0.05, -D / 2 - 0.02, -D / 2, 0.1, 1.88)
    for z in (0.22, 1.0, 1.74):
        k.ext('white', -0.84, -0.06, -D / 2 - 0.034, -D / 2 - 0.02, z - 0.05, z + 0.05)
    k.beam('white', (-0.82, -D / 2 - 0.027, 0.27), (-0.08, -D / 2 - 0.027, 0.95), 0.09, 0.014)
    k.beam('white', (-0.82, -D / 2 - 0.027, 1.05), (-0.08, -D / 2 - 0.027, 1.69), 0.09, 0.014)
    for z in (0.3, 1.66):
        k.ext('iron', -0.86, -0.62, -D / 2 - 0.04, -D / 2 - 0.034, z - 0.025, z + 0.025)
    k.cbox('iron', -0.13, -D / 2 - 0.045, 1.0, 0.05, 0.03, 0.14, 0.006)
    # window
    k.frame('white', 0.68, -D / 2 - 0.012, 1.0, 0.66, 0.66, 0.07, 0.03, 0.005)
    k.ext('dglass', 0.42, 0.94, -D / 2 - 0.008, -D / 2, 1.07, 1.59)
    k.ext('white', 0.665, 0.695, -D / 2 - 0.02, -D / 2, 1.07, 1.59)
    k.ext('white', 0.42, 0.94, -D / 2 - 0.02, -D / 2, 1.315, 1.345)
    k.ext('white', 0.3, 1.06, -D / 2 - 0.06, -D / 2, 0.96, 1.0, 0.006)
    k.prism('wold', [(-D / 2, 0.1), (-D / 2 - 0.6, 0.0), (-D / 2 - 0.6, 0.02), (-D / 2, 0.13)], -0.92, 0.02, 'YZ')
    return k.done(G, footprint=[W, D])


def greenhouse_small():
    k = Kit('greenhouse_small')
    W, D, he, hr, hb = 2.4, 3.0, 1.85, 2.55, 0.4
    k.ext('gravel', -W / 2 + 0.1, W / 2 - 0.1, -D / 2 + 0.1, D / 2 - 0.1, 0, 0.03)
    for sx in (-1, 1):
        k.ext('brick', sx * W / 2 - sx * 0.12, sx * W / 2, -D / 2, D / 2, 0, hb, 0.008)
        k.ext('stone', sx * W / 2 - sx * 0.15, sx * W / 2 + sx * 0.02, -D / 2 - 0.02, D / 2 + 0.02, hb, hb + 0.04, 0.006)
    k.ext('brick', -W / 2 + 0.12, W / 2 - 0.12, D / 2 - 0.12, D / 2, 0, hb)
    for sx in (-1, 1):
        k.ext('brick', sx * 0.45, sx * (W / 2 - 0.12), -D / 2, -D / 2 + 0.12, 0, hb)
    f = 0.04
    x = W / 2 - 0.07
    for sx in (-1, 1):
        for i in range(6):
            y = -D / 2 + f / 2 + i * (D - f) / 5
            k.ext('white', sx * x - f / 2, sx * x + f / 2, y - f / 2, y + f / 2, hb + 0.04, he)
            k.beam('white', (sx * x, y, he), (0, y, hr), f, f, ext=0.01)
        k.ext('white', sx * x - f / 2, sx * x + f / 2, -D / 2, D / 2, he - f / 2, he + f / 2, 0.004)
        k.ext('glass', sx * x - 0.004, sx * x + 0.004, -D / 2 + f, D / 2 - f, hb + 0.04, he)
    k.ext('white', -f / 2, f / 2, -D / 2, D / 2, hr - 0.02, hr + 0.04, 0.004)
    e = 0.02
    k.prism('glass', [(-x, he + e), (0, hr + e), (x, he + e), (x, he + e - 0.01), (0, hr + e - 0.01), (-x, he + e - 0.01)], -D / 2 + f, D / 2 - f, 'XZ')
    for y in (-D / 2 + f / 2, D / 2 - f / 2):
        k.prism('glass', [(-x, hb + 0.04), (x, hb + 0.04), (x, he), (0, hr), (-x, he)], y - 0.004, y + 0.004, 'XZ')
        k.ext('white', -x, x, y - f / 2, y + f / 2, he - f / 2, he + f / 2)
        k.ext('white', -f / 2, f / 2, y - f / 2, y + f / 2, he, hr)
    # door
    y = -D / 2 + f / 2
    for sx in (-1, 1):
        k.ext('white', sx * 0.43 - f / 2, sx * 0.43 + f / 2, y - 0.03, y + 0.03, 0, he)
    k.frame('white', 0, y - 0.035, 0.03, 0.8, 1.78, 0.05, 0.03, 0.004)
    k.ext('white', -0.36, 0.36, y - 0.05, y - 0.02, 0.85, 0.9)
    k.cbox('dsteel', 0.32, y - 0.06, 0.95, 0.03, 0.03, 0.12, 0.005)
    # benches and plants
    for sx in (-1, 1):
        bx = sx * 0.78
        k.planks('wood2', bx - 0.3, bx + 0.3, -1.2, 1.25, 0.72, 0.03, 4, 0.02, along='Y')
        for yy in (-1.1, 0.0, 1.15):
            k.ext('wood3', bx - 0.28, bx + 0.28, yy - 0.03, yy + 0.03, 0.0, 0.72)
        for j, yy in enumerate((-0.85, -0.2, 0.5, 1.0)):
            r = 0.1 + 0.02 * ((j + (sx > 0)) % 2)
            k.cyl('orange', bx, yy, 0.75, r * 0.75, 0.18, 7, r2=r)
            k.sphere(('leaf', 'lgreen')[(j + (sx > 0)) % 2], bx, yy, 1.02 + 0.03 * j, r * 1.5, 6, 4, 1.2 + 0.25 * (j % 2))
            if j % 2 == 0:
                k.sphere(('red', 'yellow')[(j // 2 + (sx > 0)) % 2], bx + 0.05, yy - 0.06, 1.13 + 0.03 * j, 0.05, 5, 3)
    return k.done(G, footprint=[W, D])


def chicken_coop():
    k = Kit('chicken_coop')
    W, D, z0, H = 1.3, 1.0, 0.5, 1.35
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('wood3', sx * (W / 2 - 0.05), sy * (D / 2 - 0.05), 0, 0.08, 0.08, z0, 0.006)
    k.ext('wood3', -W / 2 - 0.02, W / 2 + 0.02, -D / 2 - 0.02, D / 2 + 0.02, z0, z0 + 0.06, 0.008)
    k.ext('barn', -W / 2, W / 2, -D / 2, D / 2, z0 + 0.06, H)
    for sx in (-1, 1):
        k.prism('barn', [(-D / 2, H), (D / 2, H), (0, H + 0.36)], sx * W / 2 - (0.02 if sx > 0 else 0), sx * W / 2 + (0.02 if sx < 0 else 0), 'YZ')
        for sy in (-1, 1):
            k.box('white', sx * W / 2, sy * D / 2, z0 + 0.06, 0.06, 0.06, H - z0 - 0.06, 0.005)
    k.gable('roofred', D, W, H, 0.36, over=0.12, t=0.05, plane='YZ')
    # pop door, ramp, window
    k.frame('white', -0.25, -D / 2 - 0.01, z0 + 0.06, 0.4, 0.46, 0.05, 0.02, 0.004)
    k.ext('black', -0.4, -0.1, -D / 2 - 0.004, -D / 2, z0 + 0.11, z0 + 0.47)
    k.beam('wold', (-0.25, -D / 2 - 0.02, z0 + 0.06), (-0.25, -D / 2 - 0.95, 0.02), 0.28, 0.025)
    for i in range(6):
        t = (i + 0.5) / 6
        k.cbox('wood3', -0.25, -D / 2 - 0.02 - 0.93 * t, z0 + 0.075 - (z0 + 0.04) * t + 0.01, 0.28, 0.025, 0.02, rx=28)
    k.frame('white', 0.32, -D / 2 - 0.01, 0.88, 0.4, 0.34, 0.045, 0.02, 0.004)
    k.ext('black', 0.165, 0.475, -D / 2 - 0.004, -D / 2, 0.925, 1.175)
    for i in range(4):
        k.ext('galv', 0.2 + i * 0.08 - 0.004, 0.2 + i * 0.08 + 0.004, -D / 2 - 0.012, -D / 2 - 0.004, 0.925, 1.175)
    # nest box on +X
    k.prism('barn', [(0, z0 + 0.2), (0.36, z0 + 0.2), (0.36, z0 + 0.5), (0, z0 + 0.62)], -D / 2 + 0.1, D / 2 - 0.1, 'XZ')
    k.prism('roofred', [(W / 2 - 0.0, z0 + 0.62), (W / 2 + 0.42, z0 + 0.49), (W / 2 + 0.42, z0 + 0.53), (W / 2, z0 + 0.66)], -D / 2 + 0.06, D / 2 - 0.06, 'XZ')
    for sy in (-1, 1):
        k.beam('wood3', (W / 2 + 0.3, sy * 0.3, z0 + 0.2), (W / 2, sy * 0.3, z0 - 0.12), 0.04, 0.04)
    # wire run on -X
    x0, x1, hr = -W / 2 - 1.9, -W / 2, 0.95
    for xx in (x0 + 0.03, (x0 + x1) / 2, x1 - 0.03):
        for sy in (-1, 1):
            k.box('wood2', xx, sy * (D / 2 - 0.03), 0, 0.05, 0.05, hr)
    for sy in (-1, 1):
        for z in (0.03, hr - 0.025):
            k.ext('wood2', x0, x1, sy * (D / 2 - 0.03) - 0.025, sy * (D / 2 - 0.03) + 0.025, z - 0.025, z + 0.025)
        for i in range(1, 12):
            if i == 6:
                continue
            xx = x0 + i * 1.9 / 12
            k.ext('galv', xx - 0.004, xx + 0.004, sy * (D / 2 - 0.03) - 0.004, sy * (D / 2 - 0.03) + 0.004, 0.05, hr - 0.05)
        k.ext('galv', x0, x1, sy * (D / 2 - 0.03) - 0.004, sy * (D / 2 - 0.03) + 0.004, hr / 2 - 0.004, hr / 2 + 0.004)
    for z in (0.03, hr - 0.025):
        k.ext('wood2', x0 + 0.005, x0 + 0.055, -D / 2 + 0.05, D / 2 - 0.05, z - 0.025, z + 0.025)
    for i in range(1, 6):
        yy = -D / 2 + i * D / 6
        k.ext('galv', x0 + 0.026, x0 + 0.034, yy - 0.004, yy + 0.004, 0.05, hr - 0.05)
        k.ext('galv', x0, x1, yy - 0.004, yy + 0.004, hr - 0.01, hr - 0.002)
    k.box('galv', -W / 2 - 0.9, 0.1, 0, 0.3, 0.3, 0.05, 0.01)
    k.cyl('red', -W / 2 - 0.9, 0.1, 0.05, 0.1, 0.2, 8, 0.02)
    return k.done(G, footprint=[3.2, 1.0])


# --- hay and farm -------------------------------------------------------------------------------------
def sq_bale(k, x, y, z, rz=0.0, L=1.0, W=0.46, H=0.36, rx=0.0):
    with k.at(x, y, z, rz=rz, rx=rx):
        k.box('hay', 0, 0, 0, L, W, H, 0.03)
        for yy in (-0.11, 0.11):
            k.ext('hay2', -L / 2 - 0.004, L / 2 + 0.004, yy - 0.012, yy + 0.012, -0.0, H + 0.004)


def hay_bale_square():
    k = Kit('hay_bale_square')
    sq_bale(k, 0, 0, 0)
    return k.done(G)


def hay_bale_round():
    k = Kit('hay_bale_round')
    R, hw = 0.75, 0.6
    prof = [(0.12, -hw + 0.015), (0.3, -hw), (0.42, -hw + 0.015), (0.56, -hw), (0.68, -hw + 0.02), (R, -hw + 0.08), (R, hw - 0.08), (0.68, hw - 0.02), (0.56, hw), (0.42, hw - 0.015), (0.3, hw), (0.12, hw - 0.015)]
    k.lathe('hay', prof, 14, 0, 0, R - 0.03, axis='X')
    for x in (-0.36, 0.0, 0.36):
        k.cyl('hay2', x - 0.025, 0, R - 0.03, R + 0.006, 0.05, 14, axis='X')
    k.sphere('hay', 0.3, -0.78, 0.0, 0.3, 7, 4, 0.45)
    return k.done(G, diameter=1.5, width=1.2)


def hay_stack():
    k = Kit('hay_stack')
    rnd = random.Random(31)
    for x in (-0.51, 0.51):
        for y in (-0.48, 0.0, 0.48):
            sq_bale(k, x + rnd.uniform(-0.015, 0.015), y, 0, rz=rnd.uniform(-2, 2))
    for x in (-0.66, -0.17, 0.32):
        sq_bale(k, x, rnd.uniform(-0.2, -0.08), 0.365, rz=90 + rnd.uniform(-3, 3))
    sq_bale(k, -0.2, -0.1, 0.73, rz=5)
    sq_bale(k, 1.25, -0.5, 0.0, rz=64)
    sq_bale(k, -1.22, 0.1, 0.18, rz=90, rx=-62)
    k.sphere('hay', 0.5, -1.0, 0.0, 0.45, 7, 4, 0.4)
    k.sphere('hay2', -0.7, -0.95, 0.0, 0.3, 6, 4, 0.45)
    return k.done(G)


def feed_trough():
    k = Kit('feed_trough')
    L = 2.4
    k.prism('wood2', [(-0.36, 0.78), (-0.22, 0.4), (0.22, 0.4), (0.36, 0.78), (0.32, 0.78), (0.2, 0.44), (-0.2, 0.44), (-0.32, 0.78)], -L / 2, L / 2, 'YZ')
    for sx in (-1, 1):
        k.prism('wood3', [(-0.38, 0.8), (-0.23, 0.38), (0.23, 0.38), (0.38, 0.8)], sx * L / 2 - (0.0 if sx > 0 else 0.04), sx * L / 2 + (0.04 if sx > 0 else 0.0), 'YZ')
        x = sx * 0.85
        k.beam('wood3', (x, -0.4, 0.0), (x, 0.24, 0.62), 0.07, 0.09)
        k.beam('wood3', (x + 0.07 * sx, 0.4, 0.0), (x + 0.07 * sx, -0.24, 0.62), 0.07, 0.09)
    k.ext('wood3', -0.9, 0.9, -0.035, 0.035, 0.27, 0.34)
    k.prism('hay', [(-0.3, 0.72), (-0.2, 0.44), (0.2, 0.44), (0.3, 0.72), (0.12, 0.82), (-0.1, 0.8)], -L / 2 + 0.04, L / 2 - 0.04, 'YZ')
    for x, y in ((-0.7, 0.1), (0.1, -0.12), (0.8, 0.08)):
        k.sphere('hay2', x, y, 0.78, 0.2, 6, 4, 0.5)
    return k.done(G, length=L)


def scarecrow():
    k = Kit('scarecrow')
    k.box('wood3', 0, 0.03, 0, 0.07, 0.07, 1.6)
    k.ext('wood3', -0.82, 0.82, 0.0, 0.06, 1.42, 1.48)
    k.prism('red', [(-0.23, 0.92), (0.23, 0.92), (0.27, 1.52), (-0.27, 1.52)], -0.12, 0.12, 'XZ', 0.035)
    for sx in (-1, 1):
        k.beam('red', (sx * 0.24, 0, 1.46), (sx * 0.66, 0, 1.44), 0.16, 0.16, 0.035)
        k.cyl('straw', sx * 0.64, 0, 1.44, 0.05, 0.2, 6, r2=0.1, axis=(sx, 0, -0.1))
        k.box('denim', sx * 0.12, 0, 0.36, 0.17, 0.16, 0.6, 0.03, ry=sx * 5)
        k.cyl('straw', sx * 0.09, 0, 0.2, 0.1, 0.2, 6, r2=0.055)
        k.box('denim', sx * 0.13, -0.125, 1.2, 0.04, 0.012, 0.32)
        k.cbox('brass', sx * 0.13, -0.135, 1.24, 0.03, 0.01, 0.03)
    k.box('denim', 0, 0, 0.9, 0.5, 0.26, 0.14, 0.03)
    k.box('denim', 0, -0.122, 1.0, 0.3, 0.012, 0.26)
    k.cbox('yellow', 0.12, -0.125, 1.38, 0.1, 0.012, 0.1, rz=0, ry=12)
    k.box('rope', 0, 0, 1.52, 0.2, 0.2, 0.04, 0.01)
    k.sphere('canvas', 0, 0, 1.72, 0.17, 8, 5, 1.05)
    for sx in (-1, 1):
        k.cbox('black', sx * 0.065, -0.16, 1.75, 0.035, 0.02, 0.035)
    k.cyl('orange', 0, -0.16, 1.7, 0.025, 0.09, 5, r2=0.004, axis='-Y')
    k.ext('black', -0.06, 0.06, -0.165, -0.15, 1.635, 1.645)
    k.cyl('straw', 0, 0, 1.83, 0.31, 0.025, 10)
    k.cyl('straw', 0, 0, 1.855, 0.16, 0.15, 10, 0.02, r2=0.13)
    k.cyl('red', 0, 0, 1.856, 0.165, 0.04, 10)
    # crow on the arm
    k.sphere('black', 0.62, 0.03, 1.58, 0.07, 6, 4, 0.8)
    k.sphere('black', 0.66, 0.0, 1.66, 0.045, 6, 3)
    k.cyl('yellow', 0.69, -0.02, 1.66, 0.014, 0.05, 4, r2=0.002, axis=(0.8, -0.5, -0.1))
    k.beam('black', (0.6, 0.05, 1.6), (0.5, 0.1, 1.56), 0.05, 0.015)
    return k.done(G, height=2.0)


def well_pump():
    k = Kit('well_pump')
    k.box('conc', 0, 0, 0, 1.3, 1.3, 0.1, 0.02)
    k.planks('wold', -0.55, 0.55, -0.55, 0.55, 0.1, 0.04, 5, 0.012, along='Y', b=0.005, alt='wood2')
    y0 = 0.12
    k.lathe('dgreen', [(0.1, 0.14), (0.1, 0.18), (0.062, 0.22), (0.062, 0.8), (0.09, 0.84), (0.09, 1.04), (0.075, 1.1), (0.03, 1.14)], 10, 0, y0)
    k.tube('dgreen', [(0, y0 - 0.05, 0.92), (0, y0 - 0.3, 0.92), (0, y0 - 0.37, 0.8)], 0.036, 7)
    k.box('dgreen', 0, y0 + 0.09, 1.0, 0.035, 0.1, 0.2, 0.006)
    k.beam('dgreen', (0, y0 - 0.02, 1.24), (0, y0 + 0.62, 0.78), 0.028, 0.04, 0.006, ext=0.03)
    k.rod('dsteel', (0, y0 - 0.0, 1.12), (0, y0 - 0.0, 1.24), 0.012, 5)
    k.cyl('wood2', 0, y0 + 0.6, 0.7, 0.024, 0.16, 6, axis=(0, 0.82, -0.58))
    k.cyl('dsteel', -0.035, y0 + 0.1, 1.17, 0.016, 0.07, 6, axis='X')
    by = y0 - 0.38
    k.lathe('galv', [(0.105, 0.14), (0.14, 0.42), (0.128, 0.42), (0.1, 0.17), (0.0, 0.17)], 10, 0, by)
    k.cyl('water', 0, by, 0.34, 0.127, 0.008, 10)
    k.tube('dsteel', [(0.14 * math.cos(math.radians(a)), by + 0.02, 0.42 + 0.16 * math.sin(math.radians(a)) * 0.6) for a in range(0, 181, 30)], 0.006, 4)
    return k.done(G)


def fuel_tank_stand():
    k = Kit('fuel_tank_stand')
    hs, r, L = 1.5, 0.46, 1.9
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.beam('dsteel', (sx * 0.78, sy * 0.46, 0.0), (sx * 0.66, sy * 0.36, hs), 0.07, 0.07)
            k.box('dsteel', sx * 0.78, sy * 0.46, 0, 0.18, 0.18, 0.02, 0.004)
        k.beam('dsteel', (sx * 0.77, -0.45, 0.2), (sx * 0.68, 0.37, hs - 0.15), 0.04, 0.04)
        k.beam('dsteel', (sx * 0.77, 0.45, 0.2), (sx * 0.68, -0.37, hs - 0.15), 0.04, 0.04)
        k.ext('dsteel', sx * 0.66 - 0.04, sx * 0.66 + 0.04, -0.42, 0.42, hs - 0.04, hs + 0.04)
        k.prism('dsteel', [(-0.4, hs + 0.04), (0.4, hs + 0.04), (0.4, hs + 0.22), (0.26, hs + 0.1), (-0.26, hs + 0.1), (-0.4, hs + 0.22)], sx * 0.6 - 0.03, sx * 0.6 + 0.03, 'YZ')
    for sy in (-1, 1):
        k.beam('dsteel', (-0.76, sy * 0.45, 0.25), (0.68, sy * 0.37, hs - 0.15), 0.04, 0.04)
        k.ext('dsteel', -0.7, 0.7, sy * 0.36 - 0.035, sy * 0.36 + 0.035, hs - 0.04, hs + 0.04)
    zc = hs + 0.08 + r
    k.cyl('red', -L / 2, 0, zc, r, L, 14, 0.07, axis='X')
    for x in (-0.6, 0.6):
        k.cyl('dred', x - 0.03, 0, zc, r + 0.008, 0.06, 14, axis='X')
    k.cyl('dsteel', -0.4, 0, zc + r - 0.01, 0.06, 0.09, 8, 0.012)
    k.tube('dsteel', [(0.5, 0, zc + r - 0.02), (0.5, 0, zc + r + 0.22), (0.5, 0.1, zc + r + 0.22)], 0.02, 5)
    k.cbox('white', 0.0, -r - 0.001, zc + 0.05, 0.6, 0.012, 0.22)
    k.cbox('yellow', 0.0, -r - 0.004, zc - 0.02, 0.3, 0.012, 0.05)
    # outlet, hose and nozzle
    k.cyl('brass', L / 2 - 0.25, -0.2, zc - r - 0.1, 0.03, 0.12, 6)
    k.tube('rubber', [(L / 2 - 0.25, -0.2, zc - r - 0.1), (L / 2 - 0.25, -0.5, zc - r - 0.35), (L / 2 - 0.2, -0.56, 0.7), (L / 2 - 0.12, -0.5, 0.5), (L / 2 - 0.1, -0.44, 1.15)], 0.022, 5)
    k.cbox('dsteel', L / 2 - 0.1, -0.46, 1.22, 0.05, 0.07, 0.16, 0.01)
    k.rod('galv', (L / 2 - 0.1, -0.47, 1.3), (L / 2 - 0.1, -0.6, 1.4), 0.014, 5)
    return k.done(G, height=round(zc + r, 2))


def propane_tank_large():
    k = Kit('propane_tank_large')
    r, zc = 0.5, 0.86
    prof = [(0.0, -1.5), (0.2, -1.47), (0.38, -1.38), (0.48, -1.22), (r, -1.05), (r, 1.05), (0.48, 1.22), (0.38, 1.38), (0.2, 1.47), (0.0, 1.5)]
    k.lathe('white', prof, 14, 0, 0, zc, axis='X')
    for x in (-1.06, 1.06):
        k.cyl('lgrey', x - 0.015, 0, zc, r + 0.006, 0.03, 14, axis='X')
    for x in (-0.85, 0.85):
        k.box('conc', x, 0, 0, 0.26, 0.86, 0.14, 0.02)
        k.prism('conc', [(-0.36, 0.14), (0.36, 0.14), (0.36, zc - 0.28), (0.2, zc - 0.44), (-0.2, zc - 0.44), (-0.36, zc - 0.28)], x - 0.09, x + 0.09, 'YZ', 0.01)
        k.box('lgrey', x, 0, zc + r - 0.02, 0.05, 0.12, 0.1, 0.01)
    k.cyl('lgrey', 0, 0, zc + r - 0.03, 0.17, 0.2, 10, 0.03)
    k.cbox('dsteel', 0, 0.165, zc + r + 0.06, 0.12, 0.03, 0.04)
    k.cyl('white', 0.45, 0, zc + r - 0.02, 0.05, 0.07, 8, 0.01)
    k.cyl('black', 0.45, 0, zc + r + 0.05, 0.035, 0.012, 8)
    k.tube('dsteel', [(0.1, -0.1, zc + r + 0.08), (0.3, -0.42, zc + 0.3), (0.3, -r - 0.07, zc), (0.3, -r - 0.07, 0.0)], 0.018, 5)
    k.cbox('red', 0.3, -r - 0.09, zc + 0.02, 0.09, 0.05, 0.09, 0.01)
    k.cbox('yellow', -0.55, -r + 0.004, zc + 0.02, 0.36, 0.02, 0.26)
    k.cbox('red', -0.55, -r - 0.0, zc + 0.02, 0.2, 0.024, 0.12)
    return k.done(G, length=3.0)


def oil_tank():
    k = Kit('oil_tank')
    zc = 0.3 + 0.55
    k.prism('slate', rrect(0.68, 1.1, 0.34, 4, 0, zc), -0.76, 0.76, 'YZ', 0.045)
    for x in (-0.4, 0.4):
        k.prism('dgrey', rrect(0.695, 1.115, 0.345, 4, 0, zc), x - 0.02, x + 0.02, 'YZ')
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.cyl('iron', sx * 0.55, sy * 0.2, 0.0, 0.028, 0.42, 6)
            k.box('iron', sx * 0.55, sy * 0.2, 0.0, 0.12, 0.12, 0.015)
    zt = zc + 0.55
    k.cyl('iron', -0.45, 0, zt - 0.02, 0.035, 0.24, 7)
    k.cyl('red', -0.45, 0, zt + 0.2, 0.05, 0.05, 7, 0.01)
    k.tube('iron', [(0.45, 0, zt - 0.02), (0.45, 0, zt + 0.5), (0.45, 0.16, zt + 0.6)], 0.025, 6)
    k.cyl('iron', 0.45, 0.14, zt + 0.59, 0.05, 0.03, 7, axis=(0, 0.85, 0.5))
    k.cyl('dsteel', 0.0, 0, zt - 0.02, 0.03, 0.06, 6)
    k.cyl('glass', 0.0, 0, zt + 0.04, 0.022, 0.12, 6)
    k.cyl('red', 0.0, 0, zt + 0.07, 0.014, 0.03, 5)
    k.cyl('brass', 0.76, 0, 0.42, 0.022, 0.08, 6, axis='X')
    k.cbox('red', 0.85, 0, 0.45, 0.05, 0.02, 0.08, 0.004)
    k.tube('brass', [(0.84, 0, 0.42), (0.92, 0, 0.42), (0.92, 0, 0.03), (0.92, 0.3, 0.03)], 0.01, 5)
    k.cbox('white', 0.25, -0.345, zc + 0.15, 0.3, 0.008, 0.2)
    return k.done(G)


# --- construction site --------------------------------------------------------------------------------
def scaffold_tower():
    k = Kit('scaffold_tower')
    W, D, H = 2.1, 1.3, 4.0
    hx, hy = W / 2, D / 2
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.cyl('galv', sx * hx, sy * hy, 0.16, 0.025, H + 1.05 - 0.16, 6)
            k.cyl('dsteel', sx * hx, sy * hy, 0.02, 0.014, 0.16, 5)
            k.box('dsteel', sx * hx, sy * hy, 0.0, 0.16, 0.16, 0.02, 0.004)
            for z in (2.0, 4.0):
                k.cyl('orange', sx * hx, sy * hy, z - 0.06, 0.035, 0.12, 6)
        for i in range(10):
            z = 0.5 + i * 0.5
            k.cyl('galv', sx * hx, -hy, z, 0.018, D, 5, axis='Y')
    for sy, lifts in ((1, (0, 1)), (-1, (0,))):
        for l in lifts:
            z = l * 2.0
            k.rod('galv', (-hx, sy * (hy + 0.03), z + 0.3), (hx, sy * (hy + 0.03), z + 1.9), 0.014, 5)
            k.rod('galv', (-hx, sy * (hy + 0.045), z + 1.9), (hx, sy * (hy + 0.045), z + 0.3), 0.014, 5)
    for z, ys in ((2.0, (0.0, 0.43)), (4.0, (-0.43, 0.0, 0.43))):
        for y in ys:
            k.ext('wood1', -hx - 0.12, hx + 0.12, y - 0.2, y + 0.2, z + 0.02, z + 0.065, 0.008)
            for x in (-hx - 0.1, hx + 0.1):
                k.ext('dsteel', x - 0.015, x + 0.015, y - 0.203, y + 0.203, z + 0.017, z + 0.068)
    for sy in (-1, 1):
        for z in (H + 0.55, H + 1.0):
            k.cyl('galv', -hx, sy * hy, z, 0.018, W, 5, axis='X')
        k.ext('yellow', -hx, hx, sy * (hy - 0.03) - 0.012, sy * (hy - 0.03) + 0.012, H + 0.065, H + 0.19)
    for sx in (-1, 1):
        k.ext('yellow', sx * (hx - 0.03) - 0.012, sx * (hx - 0.03) + 0.012, -hy + 0.04, hy - 0.04, H + 0.065, H + 0.22)
    k.cyl('orange', 0.3, 0.2, H + 0.065, 0.14, 0.26, 8, r2=0.16)
    return k.done(G, height=H + 1.05, deck=H + 0.065)


def cement_mixer():
    k = Kit('cement_mixer')
    zp = 0.92
    for sx in (-1, 1):
        k.cyl('rubber', sx * 0.5 - 0.045, 0.38, 0.2, 0.2, 0.09, 10, 0.02, axis='X')
        k.cyl('yellow', sx * 0.5 - 0.05 + sx * 0.005, 0.38, 0.2, 0.09, 0.1, 8, axis='X')
        k.beam('yellow', (sx * 0.42, 0.38, 0.2), (sx * 0.42, 0.0, zp), 0.05, 0.07)
        k.beam('yellow', (sx * 0.42, 0.0, zp), (sx * 0.36, -0.5, 0.0), 0.05, 0.07)
        k.cbox('dsteel', sx * 0.42, 0.0, zp, 0.08, 0.1, 0.1, 0.01)
    k.cyl('dsteel', -0.5, 0.38, 0.2, 0.025, 1.0, 6, axis='X')
    k.ext('yellow', -0.4, 0.4, -0.52, -0.46, 0.0, 0.05, 0.006)
    k.ext('yellow', -0.42, 0.42, 0.16, 0.22, 0.55, 0.61)
    with k.at(0, 0, zp, rx=38):
        k.lathe('orange', [(0.0, -0.36), (0.22, -0.34), (0.36, -0.14), (0.38, 0.1), (0.3, 0.36), (0.23, 0.43), (0.2, 0.43), (0.26, 0.24), (0.0, 0.16)], 12)
        k.cyl('dgrey', 0, 0, 0.2, 0.245, 0.01, 12)
        k.cyl('dsteel', 0, 0, -0.08, 0.395, 0.05, 12)
        k.cyl('dsteel', 0, 0, -0.44, 0.06, 0.1, 8)
        k.cyl('yellow', -0.42, 0, 0.0, 0.03, 0.84, 6, axis='X')
    k.box('yellow', 0.0, 0.5, 0.38, 0.42, 0.3, 0.36, 0.025)
    for i in range(4):
        k.ext('black', -0.15, 0.15, 0.652, 0.656, 0.46 + i * 0.06, 0.49 + i * 0.06)
    k.cbox('red', 0.14, 0.5, 0.745, 0.05, 0.05, 0.02, 0.004)
    k.torus('dsteel', 0.55, 0.0, zp, 0.17, 0.014, 10, 4, axis='X')
    for a in (0, 60, 120):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        k.rod('dsteel', (0.55, -0.17 * c, zp - 0.17 * s), (0.55, 0.17 * c, zp + 0.17 * s), 0.008, 4)
    k.cyl('dsteel', 0.44, 0, zp, 0.02, 0.12, 6, axis='X')
    k.tube('yellow', [(-0.3, 0.5, 0.6), (-0.3, 0.85, 0.75), (0.3, 0.85, 0.75), (0.3, 0.5, 0.6)], 0.018, 5)
    return k.done(G)


def portable_toilet():
    k = Kit('portable_toilet')
    W, D, H = 1.1, 1.2, 2.1
    for sx in (-1, 1):
        k.ext('dgrey', sx * 0.4 - 0.07, sx * 0.4 + 0.07, -D / 2 - 0.03, D / 2 + 0.03, 0, 0.1, 0.015)
    k.ext('teal', -W / 2, W / 2, -D / 2, D / 2, 0.08, H, 0.025)
    for sx in (-1, 1):
        for y in (-0.3, 0.0, 0.3):
            k.cbox('teal', sx * W / 2, y, 1.0, 0.03, 0.2, 1.4, 0.012)
        for i in range(4):
            k.cbox('black', sx * (W / 2 + 0.003), 0.0, 1.84 + i * 0.045, 0.008, 0.7, 0.02)
        for sy in (-1, 1):
            k.box('teal', sx * (W / 2 - 0.03), sy * (D / 2 - 0.03), 0.08, 0.1, 0.1, H - 0.06, 0.02)
    k.ext('white', -W / 2 - 0.04, W / 2 + 0.04, -D / 2 - 0.04, D / 2 + 0.04, H - 0.02, H + 0.08, 0.03)
    k.box('white', 0, 0, H + 0.08, W - 0.2, D - 0.2, 0.07, 0.03)
    k.frame('lgrey', 0, -D / 2 - 0.01, 0.12, 0.84, 1.9, 0.06, 0.03, 0.006)
    k.ext('white', -0.36, 0.36, -D / 2 - 0.022, -D / 2, 0.18, 1.96, 0.008)
    k.cbox('white', 0, -D / 2 - 0.026, 0.72, 0.54, 0.014, 0.8, 0.008)
    k.cbox('blue', 0, -D / 2 - 0.03, 1.55, 0.3, 0.008, 0.2)
    k.cbox('dsteel', 0.27, -D / 2 - 0.04, 1.08, 0.06, 0.04, 0.16, 0.008)
    k.cyl('green', 0.27, -D / 2 - 0.026, 1.25, 0.03, 0.014, 8, axis='-Y')
    for z in (0.4, 1.05, 1.75):
        k.cbox('dsteel', -0.37, -D / 2 - 0.03, z, 0.05, 0.02, 0.1)
    k.cyl('dgrey', -W / 2 + 0.14, D / 2 - 0.14, H + 0.06, 0.05, 0.36, 8)
    k.cyl('dgrey', -W / 2 + 0.14, D / 2 - 0.14, H + 0.42, 0.075, 0.03, 8)
    return k.done(G, height=2.25)


def construction_fence_panel():
    k = Kit('construction_fence_panel')
    L, H, z0 = 3.5, 2.0, 0.12
    x = L / 2 - 0.03
    k.tube('galv', [(-x, 0, z0), (x, 0, z0), (x, 0, z0 + H), (-x, 0, z0 + H)], 0.02, 6, closed=True)
    k.cyl('galv', 0, 0, z0, 0.016, H, 5)
    for i in range(1, 16):
        if i == 8:
            continue
        xx = -x + i * 2 * x / 16
        k.ext('galv', xx - 0.004, xx + 0.004, -0.004, 0.004, z0, z0 + H)
    for i in range(1, 6):
        zz = z0 + i * H / 6
        k.ext('galv', -x, x, -0.004, 0.004, zz - 0.004, zz + 0.004)
    for sx in (-1, 1):
        k.cyl('galv', sx * x, 0, 0.02, 0.02, z0, 6)
        k.box('conc', sx * x, 0, 0, 0.26, 0.7, 0.14, 0.03)
        k.cbox('dsteel', sx * x, 0, z0 + H - 0.25, 0.09, 0.05, 0.06, 0.008)
    k.cbox('yellow', -0.9, -0.012, z0 + 1.35, 0.6, 0.012, 0.4, 0.004)
    k.cbox('black', -0.9, -0.02, z0 + 1.35, 0.5, 0.006, 0.06)
    return k.done(G, length=L, height=H + z0)


def pile(k, mats, R, H, n=12, m=6, seed=1, x=0.0, y=0.0, ex=1.0, ey=1.0, rough=0.12):
    """Lumpy heap: jittered rings lofted from the ground up to a rounded top, lower and upper bands in two colours."""
    rnd = random.Random(seed)
    rings = []
    for j in range(m):
        t = j / (m - 1)
        r = R * (1 - 0.93 * t ** 0.9)
        z = H * (1 - (1 - t) ** 1.7)
        ring = []
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * (j % 2)) / n
            rr = r * (1 + rnd.uniform(-rough, rough))
            ring.append((x + ex * rr * math.cos(a), y + ey * rr * math.sin(a), max(0.0, z + (rnd.uniform(-rough, rough) * H * 0.25 if 0 < j else 0.0))))
        rings.append(ring)
    k.loft(mats[0], rings[:2])
    k.loft(mats[1], rings[1:])


def dirt_pile():
    k = Kit('dirt_pile')
    pile(k, ('dirt2', 'dirt'), 1.7, 1.35, 12, 6, 41, ex=1.15)
    pile(k, ('dirt2', 'dirt'), 0.8, 0.5, 9, 4, 42, x=1.7, y=-0.7)
    rnd = random.Random(43)
    for i in range(7):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(1.7, 2.3)
        k.sphere('dirt2' if i % 2 else 'gravel2', d * 1.1 * math.cos(a), d * math.sin(a), 0.03, rnd.uniform(0.08, 0.16), 5, 3, 0.7)
    # shovel stuck in the side
    k.rod('wood2', (-1.25, -0.9, 0.42), (-1.55, -1.25, 1.45), 0.02, 6)
    k.beam('dsteel', (-1.16, -0.8, 0.12), (-1.26, -0.92, 0.46), 0.2, 0.02, 0.004)
    k.tube('wood2', [(-1.5, -1.3, 1.44), (-1.56, -1.26, 1.52), (-1.62, -1.2, 1.46)], 0.016, 5)
    return k.done(G, footprint=[4.6, 3.6])


def gravel_pile():
    k = Kit('gravel_pile')
    pile(k, ('gravel2', 'gravel'), 2.1, 1.6, 14, 6, 51, rough=0.07)
    pile(k, ('gravel2', 'gravel'), 1.2, 0.8, 10, 5, 52, x=2.0, y=0.6, rough=0.08)
    rnd = random.Random(53)
    for i in range(10):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(2.1, 2.7)
        k.sphere(('gravel', 'gravel2', 'lgrey')[i % 3], d * math.cos(a), d * math.sin(a), 0.02, rnd.uniform(0.06, 0.13), 5, 3, 0.7)
    return k.done(G, footprint=[5.4, 4.4])


ALL = (lambda: container('shipping_container'), lambda: container('shipping_container_open', True, 'barn'), lumber_stack_a, lumber_stack_b, lumber_stack_c,
       plywood_stack, log_deck, lumber_shed, carport, garden_shed, greenhouse_small, chicken_coop, hay_bale_round, hay_bale_square, hay_stack, feed_trough,
       scarecrow, well_pump, fuel_tank_stand, propane_tank_large, oil_tank, scaffold_tower, cement_mixer, portable_toilet, construction_fence_panel,
       dirt_pile, gravel_pile)

SHEETS = [
    ('yard_containers', ['shipping_container', 'shipping_container_open'], 'shot', dict(gap=1.2, elev=14, azim=48)),
    ('yard_lumber', ['lumber_stack_a', 'lumber_stack_b', 'lumber_stack_c', 'plywood_stack', 'log_deck'], 'shot', dict(gap=0.5, elev=18, azim=-36, cols=3)),
    ('yard_sheds_a', ['lumber_shed', 'carport'], 'shot', dict(gap=1.0, elev=12, azim=-32)),
    ('yard_sheds_b', ['garden_shed', 'greenhouse_small', 'chicken_coop'], 'shot', dict(gap=0.6, elev=14, azim=-34)),
    ('yard_farm_a', ['hay_bale_round', 'hay_bale_square', 'hay_stack', 'feed_trough', 'scarecrow', 'well_pump'], 'shot', dict(gap=0.4, elev=14, azim=-32)),
    ('yard_farm_b', ['fuel_tank_stand', 'propane_tank_large', 'oil_tank'], 'shot', dict(gap=0.5, elev=12, azim=-32)),
    ('yard_site_a', ['scaffold_tower', 'cement_mixer', 'portable_toilet', 'construction_fence_panel'], 'shot', dict(gap=0.5, elev=12, azim=-32)),
    ('yard_site_b', ['dirt_pile', 'gravel_pile'], 'shot', dict(gap=0.6, elev=18, azim=-32)),
]


def build():
    for f in ALL:
        f()

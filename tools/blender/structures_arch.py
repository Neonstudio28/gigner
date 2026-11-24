"""Architectural detail parts: columns, porch kit, cornices, shutters, doors, steps, loading dock.
Doors: origin at the bottom centre of the opening on the wall plane (y = 0); swinging leaves are child parts with their
origin on the hinge line. `door_panel` and `door_screen` are bare leaves with the origin at the hinge edge (x = 0)."""
import math
from structures_kit import Kit, circle, rrect, offset_poly, corr_profile
from structures_civic import arch_pts

G = 'arch'


def column_doric(name, H, r):
    k = Kit(name)
    pw = r * 2.9
    k.box('stone', 0, 0, 0, pw, pw, 0.18, 0.025)
    k.lathe('stone', [(r * 1.34, 0.18), (r * 1.4, 0.22), (r * 1.4, 0.29), (r * 1.26, 0.33), (r * 1.26, 0.36), (r * 1.32, 0.39), (r * 1.32, 0.44), (r * 1.08, 0.5), (r * 1.02, 0.56)], 16)
    zs = [(0.54, 1.0), (0.54 + (H - 1.2) * 0.35, 1.0), (H - 0.66, 0.84)]
    rings = []
    for z, f in zs:
        rings.append([((r * f * (1.0 if i % 2 == 0 else 0.9)) * math.cos(math.radians(i * 15)), (r * f * (1.0 if i % 2 == 0 else 0.9)) * math.sin(math.radians(i * 15)), z) for i in range(24)])
    k.loft('white', rings)
    k.lathe('stone', [(r * 0.86, H - 0.68), (r * 0.94, H - 0.64), (r * 0.94, H - 0.59), (r * 0.86, H - 0.56), (r * 0.86, H - 0.44), (r * 1.3, H - 0.24), (r * 1.3, H - 0.18)], 16)
    k.box('stone', 0, 0, H - 0.18, pw, pw, 0.18, 0.025)
    return k.done(G, height=H)


def pilaster():
    k = Kit('pilaster')
    H, w, t = 4.5, 0.62, 0.14
    k.box('stone', 0, -t / 2 - 0.03, 0, w + 0.16, t + 0.06, 0.3, 0.02)
    k.box('stone', 0, -t / 2 - 0.015, 0.3, w + 0.08, t + 0.03, 0.1, 0.02)
    k.box('white', 0, -t / 2, 0.4, w, t, H - 0.9, 0.008)
    for i in range(4):
        k.box('stone', -0.21 + i * 0.14, -t - 0.008, 0.6, 0.07, 0.016, H - 1.3, 0.006)
    k.box('stone', 0, -t / 2 - 0.015, H - 0.5, w + 0.08, t + 0.03, 0.08, 0.015)
    k.box('white', 0, -t / 2, H - 0.42, w, t, 0.14)
    k.prism('stone', [(0, H - 0.28), (-t - 0.04, H - 0.28), (-t - 0.12, H - 0.14), (-t - 0.12, H), (0, H)], -w / 2 - 0.1, w / 2 + 0.1, 'YZ')
    return k.done(G, 'wall', anchor='bottom', height=H)


def porch_post_turned():
    k = Kit('porch_post_turned')
    H, w = 2.6, 0.14
    k.box('white', 0, 0, 0, w + 0.05, w + 0.05, 0.1, 0.012)
    k.box('white', 0, 0, 0.1, w, w, 0.72, 0.008)
    r = w / 2
    k.lathe('white', [(r * 0.95, 0.82), (r * 1.0, 0.86), (r * 0.6, 0.92), (r * 0.9, 0.98), (r * 0.9, 1.02), (r * 0.62, 1.08), (r * 0.98, 1.3), (r * 0.8, 1.72), (r * 0.6, 1.94),
                      (r * 0.9, 1.99), (r * 0.9, 2.03), (r * 0.6, 2.08), (r * 1.0, 2.14), (r * 0.95, 2.18)], 10)
    k.box('white', 0, 0, 2.18, w, w, 0.34, 0.008)
    k.box('white', 0, 0, H - 0.08, w + 0.06, w + 0.06, 0.08, 0.012)
    return k.done(G, height=H)


def porch_post_square():
    k = Kit('porch_post_square')
    H, w = 2.6, 0.16
    k.box('white', 0, 0, 0, w + 0.07, w + 0.07, 0.22, 0.012)
    k.box('white', 0, 0, 0.22, w + 0.03, w + 0.03, 0.04, 0.01)
    k.box('white', 0, 0, 0.26, w, w, H - 0.5, 0.012)
    k.box('white', 0, 0, H - 0.26, w + 0.03, w + 0.03, 0.04, 0.01)
    k.box('white', 0, 0, H - 0.22, w + 0.07, w + 0.07, 0.14, 0.012)
    k.box('white', 0, 0, H - 0.08, w + 0.12, w + 0.12, 0.08, 0.012)
    return k.done(G, height=H)


def porch_bracket():
    """Origin in the corner between post and beam; the bracket runs +X along the beam and -Z down the post."""
    k = Kit('porch_bracket')
    t = 0.07
    k.box('white', 0.3, 0, -0.07, 0.6, t, 0.07, 0.006)
    k.box('white', 0.035, 0, -0.6, 0.07, t, 0.53, 0.006)
    k.prism('white', [(0.07, -0.56), (0.07, -0.44), (0.47, -0.07), (0.58, -0.07)], -t / 2 + 0.008, t / 2 - 0.008, 'XZ', 0.006)
    k.tube('white', k.arc(0.07, 0, -0.07, 0.2, 270, 360, 4, 'XZ'), 0, sq=(0.03, 0.04))
    return k.done(G, 'wall', anchor='corner')


def porch_railing():
    k = Kit('porch_railing')
    L = 1.5
    k.box('white', 0, 0, 0.86, L, 0.09, 0.05, 0.01)
    k.box('white', 0, 0, 0.8, L, 0.05, 0.06)
    k.box('white', 0, 0, 0.1, L, 0.05, 0.07, 0.008)
    n = 11
    for i in range(n):
        k.box('white', -L / 2 + L * (i + 0.5) / n, 0, 0.17, 0.04, 0.04, 0.63)
    return k.done(G, length=L, height=0.91)


def porch_lattice():
    k = Kit('porch_lattice')
    W, H, p = 1.5, 0.6, 0.15
    k.frame('white', 0, 0, 0, W, H, 0.06, 0.04, 0.005)
    x0, x1, z0, z1 = -W / 2 + 0.05, W / 2 - 0.05, 0.05, H - 0.05
    c = x0 - z1
    while c < x1 - z0:
        ua, ub = max(x0, z0 + c), min(x1, z1 + c)
        if ub - ua > 0.05:
            k.beam('white', (ua, 0.008, ua - c), (ub, 0.008, ub - c), 0.035, 0.012)
        c += p
    c = x0 + z0
    while c < x1 + z1:
        ua, ub = max(x0, c - z1), min(x1, c - z0)
        if ub - ua > 0.05:
            k.beam('white', (ua, -0.008, c - ua), (ub, -0.008, c - ub), 0.035, 0.012)
        c += p
    return k.done(G, length=W, height=H)


def steps(k, w, n, rise, run, tread='wold', riser='white', nose=0.03, y0=0.0):
    """Stair descending towards -Y from the top landing edge at y0; the top tread is level with n * rise."""
    for i in range(n):
        h = rise * (n - i)
        y = y0 - run * i
        k.ext(riser, -w / 2, w / 2, y - run, y, 0, h - 0.04)
        k.ext(tread, -w / 2 - 0.02, w / 2 + 0.02, y - run - nose, y, h - 0.04, h, 0.006)


def porch_steps():
    k = Kit('porch_steps')
    steps(k, 1.5, 4, 0.18, 0.29)
    for sx in (-1, 1):
        k.prism('white', [(0, 0), (-1.16, 0), (-1.16, 0.14), (0, 0.72 - 0.04)], sx * 0.77 - 0.02, sx * 0.77 + 0.02, 'YZ')
    return k.done(G, rise=0.72, run=1.19, width=1.5)


def steps_wide():
    k = Kit('steps_wide')
    W, n, rise, run = 8.0, 6, 0.16, 0.34
    steps(k, W - 1.4, n, rise, run, 'stone', 'stone2', 0.02)
    for sx in (-1, 1):
        x = sx * (W / 2 - 0.35)
        k.box('stone2', x, -1.07, 0, 0.7, 2.14, n * rise + 0.12, 0.025)
        k.box('stone', x, -1.07, n * rise + 0.12, 0.8, 2.24, 0.1, 0.03)
        k.box('stone2', x, -1.75, n * rise + 0.22, 0.5, 0.5, 0.5, 0.03)
        k.box('stone', x, -1.75, n * rise + 0.72, 0.6, 0.6, 0.08, 0.025)
    return k.done(G, rise=n * rise, run=n * run, width=W)


def cornice_corbel():
    k = Kit('cornice_corbel')
    prof = [(0, 0), (-0.05, 0), (-0.05, 0.08), (-0.08, 0.1), (-0.08, 0.3), (-0.3, 0.36), (-0.33, 0.4), (-0.33, 0.46), (-0.38, 0.5), (-0.38, 0.56), (0, 0.56)]
    k.prism('stone', prof, -0.5, 0.5, 'YZ')
    for x in (-0.375, -0.125, 0.125, 0.375):
        k.prism('white', [(-0.08, 0.06), (-0.14, 0.08), (-0.16, 0.2), (-0.26, 0.24), (-0.3, 0.34), (-0.08, 0.36)], x - 0.05, x + 0.05, 'YZ', 0.008)
    for i in range(10):
        k.box('white', -0.45 + i * 0.1, -0.065, 0.005, 0.05, 0.03, 0.05)
    return k.done(G, 'wall', anchor='bottom', length=1.0)


def cornice_scallop():
    k = Kit('cornice_scallop')
    pts = [(-0.5, 0.36), (-0.5, 0.12)]
    for i in range(4):
        cx = -0.375 + i * 0.25
        pts += [(cx - 0.125 * math.cos(math.radians(a)), 0.12 - 0.1 * math.sin(math.radians(a))) for a in (30, 60, 90, 120, 150)]
        pts.append((cx + 0.125, 0.12))
    pts.append((0.5, 0.36))
    k.prism('white', pts, -0.05, 0.0, 'XZ')
    for i in range(4):
        cx = -0.375 + i * 0.25
        k.cyl('stone2', cx, -0.05, 0.14, 0.035, 0.012, 8, axis='-Y')
    k.prism('white', [(0, 0.36), (-0.07, 0.36), (-0.09, 0.4), (-0.09, 0.44), (-0.12, 0.47), (-0.12, 0.5), (0, 0.5)], -0.5, 0.5, 'YZ')
    k.box('stone2', 0, -0.03, 0.3, 1.0, 0.065, 0.03)
    return k.done(G, 'wall', anchor='bottom', length=1.0)


def window_shutter():
    k = Kit('window_shutter')
    W, H = 0.42, 1.4
    k.frame('dgreen', 0, -0.02, -H / 2, W, H, 0.055, 0.035, 0.006)
    k.box('dgreen', 0, -0.02, -0.03, W - 0.1, 0.035, 0.06)
    k.box('green', 0, -0.006, -H / 2 + 0.05, W - 0.1, 0.012, H - 0.1)
    for z0, z1 in ((-H / 2 + 0.065, -0.04), (0.04, H / 2 - 0.065)):
        n = 8
        for i in range(n):
            k.cbox('dgreen', 0, -0.022, z0 + (z1 - z0) * (i + 0.5) / n, W - 0.11, 0.035, 0.012, rx=-32)
    for z in (-H / 2 + 0.2, H / 2 - 0.2):
        k.box('iron', -W / 2 + 0.02, -0.04, z, 0.07, 0.008, 0.03)
    return k.done(G, 'wall', anchor='center', height=H)


def window_box_flowers():
    k = Kit('window_box_flowers')
    W = 1.0
    k.prism('white', [(0, 0), (-0.2, 0), (-0.17, -0.19), (0, -0.19)], -W / 2, W / 2, 'YZ', 0.008)
    k.box('white', 0, -0.1, -0.03, W + 0.03, 0.225, 0.03, 0.006)
    k.box('dirt2', 0, -0.1, -0.012, W - 0.05, 0.16, 0.02)
    for sx in (-1, 1):
        k.prism('white', [(0, -0.19), (-0.15, -0.19), (0, -0.33)], sx * 0.34 - 0.02, sx * 0.34 + 0.02, 'YZ')
    cols = ['red', 'yellow', 'pink', 'white', 'purple']
    for i in range(7):
        x = -0.42 + i * 0.14
        k.sphere('leaf' if i % 2 else 'lgreen', x, -0.1 + (0.02 if i % 2 else -0.02), 0.05, 0.1, 6, 3, 0.8)
        for j in range(3):
            a = math.radians(j * 120 + i * 40)
            k.sphere(cols[(i + j) % 5], x + 0.055 * math.cos(a), -0.1 + 0.055 * math.sin(a), 0.11 + 0.02 * (j % 2), 0.035, 5, 3)
    for x in (-0.3, 0.1, 0.38):
        k.sphere('leaf', x, -0.2, -0.04, 0.07, 6, 3, 1.3)
    return k.done(G, 'wall', anchor='top', length=W)


def knob(k, x, y, z, mat='brass', side=-1):
    k.lathe(mat, [(0.028, 0.0), (0.028, 0.008), (0.012, 0.014), (0.012, 0.04), (0.03, 0.05), (0.03, 0.07), (0.0, 0.08)], 8, x, y, z, axis='-Y' if side < 0 else 'Y')


def panel_leaf(k, x0, w, h, t=0.045, mat='door', cols=2, rows=(0.2, 0.62, 0.62, 0.3), stile=0.11, rail=0.1, z0=0.0, y=0.0, panel=None):
    """Framed leaf from x0 to x0 + w: slab with raised field panels on both faces (rows are relative heights, bottom up)."""
    k.ext(mat, x0, x0 + w, y - t / 2, y + t / 2, z0, z0 + h, 0.004)
    pw = (w - stile * 2 - rail * (cols - 1) * 0.8) / cols
    tot = sum(rows)
    avail = h - rail * (len(rows) + 1) - 0.06
    z = z0 + rail + 0.06
    for rh in rows:
        ph = avail * rh / tot
        for c in range(cols):
            xa = x0 + stile + c * (pw + rail * 0.8)
            for s in (-1, 1):
                k.cbox(panel or mat, xa + pw / 2, y + s * (t / 2 + 0.003), z + ph / 2, pw, 0.018, ph, 0.007)
        z += ph + rail


def hinges(k, x, y, zs, mat='dsteel'):
    for z in zs:
        k.cyl(mat, x, y, z, 0.012, 0.1, 6)


def door_panel():
    k = Kit('door_panel')
    panel_leaf(k, 0.0, 0.9, 2.05, rows=(0.55, 0.9, 0.3))
    for s in (-1, 1):
        knob(k, 0.83, s * 0.0225, 1.0, side=s)
        k.cbox('brass', 0.83, s * 0.024, 1.0, 0.05, 0.006, 0.16, 0.002)
    hinges(k, 0.0, -0.03, (0.2, 0.95, 1.75))
    return k.done(G, 'wall', anchor='hinge', width=0.9, height=2.05)


def door_screen():
    k = Kit('door_screen')
    W, H, t = 0.9, 2.05, 0.03
    k.frame('white', W / 2, 0, 0, W, H, 0.09, t, 0.004)
    k.box('white', W / 2, 0, 0.09, W - 0.18, t, 0.22)
    k.box('white', W / 2, 0, 0.95, W - 0.18, t, 0.09)
    k.box('glass', W / 2, 0, 0.31, W - 0.18, 0.006, H - 0.4)
    k.beam('white', (0.09, 0, 0.31), (W - 0.09, 0, 0.95), 0.03, 0.02)
    k.beam('white', (W - 0.09, 0, 0.31), (0.09, 0, 0.95), 0.03, 0.02)
    k.tube('dsteel', [(W - 0.05, -0.015, 0.98), (W - 0.05, -0.05, 0.98), (W - 0.05, -0.05, 1.12), (W - 0.05, -0.015, 1.12)], 0.008, 5)
    k.rod('dsteel', (0.12, 0.02, 1.9), (0.55, 0.02, 1.86), 0.012, 5)
    hinges(k, 0.0, -0.02, (0.25, 1.75))
    return k.done(G, 'wall', anchor='hinge', width=W, height=H)


def glass_leaf(k, x0, w, h, pull=1, t=0.045, mat='alu', z0=0.02):
    """Aluminium shop-door leaf from x0 to x0 + w with clear glass, kick plate, push bar (-Y side) and pull handle (+Y)."""
    x1 = x0 + w
    k.ext(mat, x0, x0 + 0.07, -t / 2, t / 2, z0, h, 0.004)
    k.ext(mat, x1 - 0.07, x1, -t / 2, t / 2, z0, h, 0.004)
    k.ext(mat, x0 + 0.07, x1 - 0.07, -t / 2, t / 2, h - 0.08, h, 0.0)
    k.ext(mat, x0 + 0.07, x1 - 0.07, -t / 2, t / 2, z0, z0 + 0.22, 0.0)
    k.ext('glass', x0 + 0.07, x1 - 0.07, -0.006, 0.006, z0 + 0.22, h - 0.08)
    k.ext('chrome', x0 + 0.03, x1 - 0.03, -t / 2 - 0.05, -t / 2 - 0.02, 1.0, 1.05)
    hx = x1 - 0.035 if pull > 0 else x0 + 0.035
    for xx in (x0 + 0.035, x1 - 0.035):
        k.ext('chrome', xx - 0.012, xx + 0.012, -t / 2 - 0.03, -t / 2, 1.01, 1.04)
    k.tube('chrome', [(hx, t / 2, 0.92), (hx, t / 2 + 0.05, 0.92), (hx, t / 2 + 0.05, 1.22), (hx, t / 2, 1.22)], 0.01, 6)
    k.ext('dsteel', hx - 0.02, hx + 0.02, -t / 2 - 0.004, t / 2 + 0.004, 0.8, 0.86)


def shop_frame(k, W, H, tr=0.4, mat='alu', d=0.11):
    """Fixed frame around a W x H opening with a glazed transom above."""
    for sx in (-1, 1):
        k.box(mat, sx * (W / 2 + 0.03), 0, 0, 0.06, d, H + tr + 0.06, 0.004)
    k.box(mat, 0, 0, H, W, d, 0.06)
    k.box(mat, 0, 0, H + tr, W + 0.12, d, 0.06, 0.004)
    k.box('glass', 0, 0, H + 0.06, W, 0.012, tr - 0.06)
    k.box('dsteel', 0, 0, 0, W, d, 0.02)


def door_shop_glass():
    k = Kit('door_shop_glass')
    W, H = 0.95, 2.15
    shop_frame(k, W, H)
    leaf = k.part('leaf', -W / 2, 0, 0)
    glass_leaf(leaf, 0.005, W - 0.01, H - 0.005, 1)
    k.box('signface', 0, -0.062, H + 0.12, 0.6, 0.008, 0.2)
    k.note_face(0, -0.067, H + 0.22, 0.6, 0.2)
    return k.done(G, 'wall', anchor='bottom', opening=[W, H], hinge={'leaf': 'left'})


def door_double_shop():
    k = Kit('door_double_shop')
    W, H = 1.8, 2.15
    shop_frame(k, W, H)
    l = k.part('leaf_l', -W / 2, 0, 0)
    glass_leaf(l, 0.005, W / 2 - 0.008, H - 0.005, 1)
    r = k.part('leaf_r', W / 2, 0, 0)
    glass_leaf(r, -W / 2 + 0.003, W / 2 - 0.008, H - 0.005, -1)
    return k.done(G, 'wall', anchor='bottom', opening=[W, H], hinge={'leaf_l': 'left', 'leaf_r': 'right'})


def wood_leaf(k, x0, w, h, pull, arched=False, R=0.9, cx=0.0):
    """Tall timber leaf with two long raised panels, strap hinges and a brass pull; `arched` rounds the top to radius R."""
    t = 0.06
    x1 = x0 + w
    if arched:
        xs = [x0 + w * i / 5 for i in range(6)]
        top = [(x, h - R + math.sqrt(max(0.0, R * R - (x - cx) ** 2))) for x in xs]
        k.prism('door', [(x0, 0.01), (x1, 0.01)] + list(reversed(top)), -t / 2, t / 2, 'XZ', 0.004)
        hp = min(top[0][1], top[-1][1]) - 0.2
    else:
        k.ext('door', x0, x1, -t / 2, t / 2, 0.01, h, 0.004)
        hp = h - 0.16
    for s in (-1, 1):
        k.cbox('dgreen', (x0 + x1) / 2, s * (t / 2 + 0.004), 0.16 + 0.36, w - 0.26, 0.02, 0.72, 0.008)
        k.cbox('dgreen', (x0 + x1) / 2, s * (t / 2 + 0.004), 1.02 + (hp - 1.02) / 2, w - 0.26, 0.02, hp - 1.02, 0.008)
    hx = x1 - 0.09 if pull > 0 else x0 + 0.09
    k.tube('brass', [(hx, -t / 2, 0.95), (hx, -t / 2 - 0.06, 0.95), (hx, -t / 2 - 0.06, 1.3), (hx, -t / 2, 1.3)], 0.014, 6)
    k.cbox('brass', hx, -t / 2 - 0.004, 1.125, 0.07, 0.008, 0.46, 0.002)
    hgx = x0 if pull > 0 else x1
    for z in (0.3, hp - 0.25):
        k.ext('iron', min(hgx, hgx + pull * 0.5), max(hgx, hgx + pull * 0.5), -t / 2 - 0.012, -t / 2, z, z + 0.06)
        k.cyl('iron', hgx, -t / 2 - 0.012, z - 0.03, 0.016, 0.12, 6)


def door_double_wood(arched=False):
    k = Kit('door_double_wood_arched' if arched else 'door_double_wood')
    W, H = 1.8, 2.7
    R = W / 2
    for sx in (-1, 1):
        k.box('stone', sx * (W / 2 + 0.11), -0.03, 0, 0.22, 0.2, H - (R if arched else 0) + 0.0, 0.012)
        k.box('stone2', sx * (W / 2 + 0.11), -0.04, 0, 0.28, 0.24, 0.3, 0.015)
    if arched:
        k.tube('stone', [((R + 0.11) * math.cos(math.radians(a)), -0.03, H - R + (R + 0.11) * math.sin(math.radians(a))) for a in range(0, 181, 15)], 0, sq=(0.2, 0.22))
        k.box('stone2', 0, -0.05, H + 0.0, 0.26, 0.26, 0.3, 0.02)
    else:
        k.box('stone', 0, -0.03, H, W + 0.44, 0.2, 0.24, 0.012)
        k.box('stone2', 0, -0.05, H + 0.24, W + 0.6, 0.26, 0.1, 0.02)
    k.box('stone2', 0, -0.06, 0, W + 0.1, 0.3, 0.03, 0.006)
    l = k.part('leaf_l', -W / 2, 0, 0)
    wood_leaf(l, 0.005, W / 2 - 0.008, H - 0.01, 1, arched, R - 0.005, W / 2)
    r = k.part('leaf_r', W / 2, 0, 0)
    wood_leaf(r, -W / 2 + 0.003, W / 2 - 0.008, H - 0.01, -1, arched, R - 0.005, -W / 2)
    return k.done(G, 'wall', anchor='bottom', opening=[W, H], hinge={'leaf_l': 'left', 'leaf_r': 'right'})


def door_garage_roller():
    k = Kit('door_garage_roller')
    W, H = 3.0, 3.0
    for sx in (-1, 1):
        k.box('dsteel', sx * (W / 2 + 0.04), -0.04, 0, 0.1, 0.1, H + 0.02, 0.006)
        k.box('yellow', sx * (W / 2 + 0.04), -0.092, 0, 0.1, 0.006, 1.0)
    k.box('galv', 0, -0.14, H, W + 0.3, 0.34, 0.36, 0.03)
    k.box('zinc', 0, -0.312, H + 0.05, W + 0.1, 0.006, 0.26)
    c = k.part('curtain', 0, -0.04, H)
    n = 20
    p = (H - 0.12) / n
    prof = [(0.02, 0.0)]
    for i in range(n):
        z = -i * p
        prof += [(-0.02, z - p * 0.15), (-0.035, z - p * 0.45), (-0.035, z - p * 0.7), (-0.02, z - p)]
    prof += [(0.02, -(H - 0.12))]
    c.prism('galv', prof, -W / 2 + 0.01, W / 2 - 0.01, 'YZ')
    c.box('dsteel', 0, -0.01, -H + 0.005, W - 0.02, 0.07, 0.115, 0.008)
    c.box('rubber', 0, -0.01, -H, W - 0.02, 0.05, 0.012)
    for x in (-0.9, 0.9):
        c.tube('dsteel', [(x - 0.1, -0.045, -H + 0.06), (x - 0.1, -0.08, -H + 0.06), (x + 0.1, -0.08, -H + 0.06), (x + 0.1, -0.045, -H + 0.06)], 0.01, 5)
    c.box('dsteel', 0, -0.05, -H + 0.9, 0.1, 0.02, 0.14, 0.004)
    return k.done(G, 'wall', anchor='bottom', opening=[W, H])


def door_garage_panel():
    k = Kit('door_garage_panel')
    W, H = 2.4, 2.1
    for sx in (-1, 1):
        k.box('white', sx * (W / 2 + 0.06), -0.03, 0, 0.12, 0.1, H + 0.12, 0.008)
    k.box('white', 0, -0.03, H, W, 0.1, 0.12, 0.008)
    dpart = k.part('door', 0, -0.01, H)
    rows, cols = 4, 4
    sh = H / rows
    pw = (W - 0.02 - 0.1 * (cols + 1)) / cols
    for r in range(rows):
        z = -H + r * sh
        dpart.ext('cream', -W / 2 + 0.005, W / 2 - 0.005, -0.02, 0.02, z + 0.004, z + sh - 0.004, 0.004)
        for c in range(cols):
            x = -W / 2 + 0.01 + 0.1 + c * (pw + 0.1) + pw / 2
            if r == rows - 1:
                dpart.cbox('dgrey', x, -0.022, z + sh / 2, pw + 0.02, 0.012, sh - 0.18, 0.003)
                dpart.cbox('glass', x, -0.026, z + sh / 2, pw - 0.04, 0.008, sh - 0.24)
            else:
                dpart.cbox('cream', x, -0.024, z + sh / 2, pw, 0.016, sh - 0.2, 0.007)
    dpart.tube('dsteel', [(-0.1, -0.02, -H + 0.2), (-0.1, -0.06, -H + 0.2), (0.1, -0.06, -H + 0.2), (0.1, -0.02, -H + 0.2)], 0.01, 5)
    dpart.cbox('dsteel', 0, -0.025, -H + sh * 1.5, 0.06, 0.02, 0.1, 0.004)
    return k.done(G, 'wall', anchor='bottom', opening=[W, H])


def door_barn_x():
    k = Kit('door_barn_x')
    W, H = 2.4, 2.7
    k.box('dsteel', 0, -0.06, H + 0.12, W * 2 + 0.2, 0.05, 0.06, 0.006)
    for x in (-W + 0.2, 0, W - 0.2):
        k.box('dsteel', x, -0.02, H + 0.1, 0.08, 0.04, 0.12)
    leaf = k.part('leaf', 0, -0.07, 0)
    n = 10
    for i in range(n):
        leaf.ext('barn' if i % 3 else 'red', -W / 2 + W * i / n + 0.003, -W / 2 + W * (i + 1) / n - 0.003, -0.02, 0.02, 0.03, H)
    f, t = 0.14, 0.03
    y0, y1 = -0.02 - t, -0.02
    leaf.ext('white', -W / 2, W / 2, y0, y1, 0.03, 0.03 + f, 0.004)
    leaf.ext('white', -W / 2, W / 2, y0, y1, H - f, H, 0.004)
    zm = H * 0.5
    leaf.ext('white', -W / 2 + f, W / 2 - f, y0, y1, zm - f / 2, zm + f / 2)
    for sx in (-1, 1):
        leaf.ext('white', sx * W / 2 - (f if sx > 0 else 0), sx * W / 2 + (f if sx < 0 else 0), y0, y1, 0.03 + f, H - f)
    yc = (y0 + y1) / 2 - 0.002
    for za, zb in ((0.03 + f, zm - f / 2), (zm + f / 2, H - f)):
        leaf.beam('white', (-W / 2 + f, yc, za), (W / 2 - f, yc, zb), 0.12, t - 0.004)
        leaf.beam('white', (-W / 2 + f, yc - 0.004, zb), (W / 2 - f, yc - 0.004, za), 0.12, t - 0.004)
    for x in (-W / 2 + 0.35, W / 2 - 0.35):
        leaf.box('dsteel', x, 0.0, H - 0.1, 0.07, 0.012, 0.26)
        leaf.cyl('dsteel', x, -0.02, H + 0.15, 0.06, 0.04, 8, axis='Y')
    leaf.tube('iron', [(W / 2 - 0.07, y0, 1.1), (W / 2 - 0.07, y0 - 0.06, 1.1), (W / 2 - 0.07, y0 - 0.06, 1.4), (W / 2 - 0.07, y0, 1.4)], 0.012, 5)
    return k.done(G, 'wall', anchor='bottom', opening=[W, H], slide='x')


def loading_dock():
    k = Kit('loading_dock')
    W, D, H = 3.0, 2.4, 1.2
    k.ext('conc', -W / 2, W / 2, -D, 0, 0, H, 0.02)
    k.ext('dconc', -W / 2 - 0.003, W / 2 + 0.003, -D - 0.003, 0.0, 0, 0.12)
    k.ext('yellow', -W / 2 - 0.004, W / 2 + 0.004, -D - 0.012, -D + 0.1, H - 0.1, H + 0.006)
    for i in range(6):
        k.ext('black', -W / 2 + 0.25 + i * 0.5, -W / 2 + 0.45 + i * 0.5, -D - 0.016, -D + 0.104, H - 0.104, H + 0.01)
    for x in (-0.9, 0.9):
        k.box('dsteel', x, -D - 0.01, H - 0.62, 0.3, 0.02, 0.5)
        k.box('rubber', x, -D - 0.06, H - 0.6, 0.26, 0.1, 0.46, 0.02)
        for z in (H - 0.52, H - 0.22):
            k.cyl('galv', x, -D - 0.11, z, 0.025, 0.012, 6, axis='-Y')
    k.box('dsteel', 0, -D + 0.45, H, 1.8, 0.9, 0.015, 0.004)
    k.box('dsteel', 0, -D + 0.02, H + 0.003, 1.8, 0.1, 0.02, 0.004, rx=20)
    # side steps with a pipe rail
    x0 = W / 2
    n, run = 6, 0.28
    for i in range(n):
        h = H * (n - i) / n
        k.ext('conc', x0, x0 + 0.9, -0.9 - run * (i + 1), -0.9 - run * i, 0, h, 0.01)
    k.ext('conc', x0, x0 + 0.9, -0.9, 0, 0, H, 0.01)
    rail = [(x0 + 0.85, -0.05, H + 0.9), (x0 + 0.85, -0.9, H + 0.9), (x0 + 0.85, -0.9 - run * n, 0.9 + H / n), (x0 + 0.85, -0.9 - run * n, H / n)]
    k.tube('yellow', rail, 0.022, 6)
    for y, z in ((-0.05, H), (-0.9, H), (-0.9 - run * 3, H / 2 + 0.1)):
        k.cyl('yellow', x0 + 0.85, y, z, 0.02, 0.9 if z >= H else 0.88, 6)
    return k.done(G, height=H, length=W)


def cellar_bulkhead():
    k = Kit('cellar_bulkhead')
    W, L, h0, h1 = 1.5, 1.7, 0.78, 0.22
    for sx in (-1, 1):
        k.prism('conc', [(0, 0), (-L, 0), (-L, h1), (0, h0)], sx * (W / 2 - 0.07) - 0.07, sx * (W / 2 - 0.07) + 0.07, 'YZ', 0.01)
    k.ext('conc', -W / 2, W / 2, -L, -L + 0.14, 0, h1, 0.01)
    k.ext('black', -W / 2 + 0.14, W / 2 - 0.14, -L + 0.14, 0, 0.0, 0.12)
    ang = math.degrees(math.atan2(h0 - h1, L))
    sl = math.hypot(h0 - h1, L)
    for sx in (-1, 1):
        with k.at(sx * 0.0, -L, h1 + 0.01, rx=ang):
            x = sx * (W / 4 + 0.005)
            k.ext('door', x - W / 4 + 0.012, x + W / 4 - 0.012, -0.03, sl + 0.02, 0.0, 0.04, 0.006)
            for j in range(3):
                yy = 0.12 + j * (sl - 0.24) / 2
                k.ext('dgreen', x - W / 4 + 0.03, x + W / 4 - 0.03, yy - 0.05, yy + 0.05, 0.04, 0.062, 0.004)
                k.ext('iron', sx * (W / 2 - 0.03) - 0.18 * (sx > 0), sx * (W / 2 - 0.03) + 0.18 * (sx < 0), yy - 0.02, yy + 0.02, 0.062, 0.072)
            hx = sx * 0.1
            k.tube('iron', [(hx, sl * 0.3, 0.062), (hx, sl * 0.3, 0.1), (hx, sl * 0.3 + 0.18, 0.1), (hx, sl * 0.3 + 0.18, 0.062)], 0.01, 5)
    k.ext('white', -W / 2 - 0.02, W / 2 + 0.02, -0.05, 0.0, h0 - 0.02, h0 + 0.1, 0.006)
    return k.done(G, 'ground')


ALL = (lambda: column_doric('column_doric_45', 4.5, 0.3), lambda: column_doric('column_doric_60', 6.0, 0.38), pilaster, porch_post_turned, porch_post_square,
       porch_bracket, porch_railing, porch_lattice, porch_steps, steps_wide, cornice_corbel, cornice_scallop, window_shutter, window_box_flowers,
       door_panel, door_screen, door_shop_glass, door_double_shop, door_double_wood, lambda: door_double_wood(True), door_garage_roller, door_garage_panel,
       door_barn_x, loading_dock, cellar_bulkhead)

SHEETS = [
    ('arch_columns', ['column_doric_60', 'column_doric_45', 'pilaster', 'steps_wide'], 'shot', dict(gap=0.5, elev=10, azim=-30)),
    ('arch_porch', ['porch_steps', 'porch_post_turned', 'porch_post_square', 'porch_railing', 'porch_lattice', 'porch_bracket'], 'shot', dict(gap=0.25, elev=10, azim=-28)),
    ('arch_trim', ['cornice_corbel', 'cornice_scallop', 'window_shutter', 'window_box_flowers'], 'shot', dict(gap=0.2, elev=8, azim=-28)),
    ('arch_doors_a', ['door_panel', 'door_screen', 'door_shop_glass', 'door_double_shop', 'door_double_wood', 'door_double_wood_arched'], 'shot', dict(gap=0.35, elev=6, azim=-24)),
    ('arch_doors_b', ['door_garage_roller', 'door_garage_panel', 'door_barn_x'], 'shot', dict(gap=0.4, elev=8, azim=-26)),
    ('arch_dock', ['cellar_bulkhead', 'loading_dock'], 'shot', dict(gap=0.8, elev=18, azim=-32)),
]


def build():
    for f in ALL:
        f()

"""Street furniture, part 1: mail, news, vending, phones, meters, hydrant, bollards, ATM."""
import math
from streetprops_kit import *

STEEL, DARK, BLACK, CREAM = '#8f979c', '#2b2e32', '#1a1b1d', '#e9e6dc'
BODY = '#2a559b'                       # shared default of paint__body (the engine recolours it per instance)


def body_mat():
    return LB('paint', 'body', BODY)


def legs(a, m, w, d, h, t=0.05, pad=None):
    """Four corner legs under a cabinet of footprint w x d."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (w / 2 - t / 2 - 0.02), sy * (d / 2 - t / 2 - 0.02)
            a.box(m, t, t, h, (x, y, h / 2))
            if pad:
                a.box(pad, t + 0.03, t + 0.03, 0.012, (x, y, 0.006))


def arch(w, z0, z1, n=8, plane_x0=None):
    """Outline of a rectangle with a semicircular top (2D, CCW): width w, base z0, spring line z1."""
    r = w / 2
    return [(-r, z0), (r, z0)] + [(r * math.cos(rad(180 * i / n)), z1 + r * math.sin(rad(180 * i / n))) for i in range(n + 1)]


# ------------------------------------------------------------------ mail
@asset('furniture')
def mailbox_blue():
    a = Asset('mailbox_blue')
    blue, dk = P('#27457f'), P('#1c3260')
    a.prism(blue, arch(0.52, 0.14, 0.92), -0.28, 0.28, 'yz', 0.012)
    legs(a, blue, 0.5, 0.46, 0.15, 0.055, dk)
    # pull-down letter door with hood
    with a.at((0, -0.215, 1.03), (-28, 0, 0)):
        a.box(dk, 0.48, 0.03, 0.2, (0, -0.02, 0), 0.008, 'xz')
        a.handle(MT(STEEL), (-0.1, -0.035, 0.03), (0.1, -0.035, 0.03), (0, -0.03, 0), 0.008)
    a.box(blue, 0.5, 0.05, 0.03, (0, -0.25, 0.905), 0.006, 'x')
    # collection door
    a.rim(dk, 0.4, 0.42, (0, -0.265, 0.55), 0.03, 0.014)
    a.cyl(MT(STEEL), 0.016, (0.13, -0.26, 0.55), (0.13, -0.275, 0.55), 8)
    a.decal('mail_label', 0.26, 0.152, (-0.03, -0.2635, 0.6))
    for s in a.mx():
        a.box(dk, 0.012, 0.36, 0.05, (0.283, 0, 0.3))
        a.plate(P(CREAM), 0.2, 0.09, (0.2815, 0, 0.75), (0, 0, 90))
    return a


@asset('furniture')
def mailbox_post():
    a = Asset('mailbox_post')
    wood, tin = P('#8a6a48'), MT('#a9afb3')
    a.box(wood, 0.09, 0.09, 1.08, (0, 0.06, 0.54), 0.008, 'z')
    a.box(wood, 0.07, 0.5, 0.07, (0, -0.06, 1.045), 0.006, 'y')
    with a.at((0, 0.06, 0.78), (45, 0, 0)):
        a.box(wood, 0.05, 0.05, 0.34, (0, 0, 0.0))
    a.prism(tin, arch(0.17, 1.085, 1.2), -0.31, 0.19, 'xz', 0.006)
    a.prism(tin, arch(0.185, 1.08, 1.2), -0.325, -0.31, 'xz')
    a.cyl(MT('#6f7579'), 0.012, (0, -0.325, 1.25), (0, -0.34, 1.25), 6)
    a.box(tin, 0.2, 0.52, 0.01, (0, -0.06, 1.082))
    # signal flag
    a.box(P('#b8281f'), 0.006, 0.02, 0.2, (0.092, -0.2, 1.24))
    a.box(P('#b8281f'), 0.006, 0.09, 0.06, (0.092, -0.165, 1.31))
    a.cyl(MT('#6f7579'), 0.012, (0.085, -0.2, 1.15), (0.1, -0.2, 1.15), 6)
    a.plate(P(BLACK), 0.11, 0.05, (0.0875, 0.02, 1.16), (0, 0, 90))
    return a


# ------------------------------------------------------------------ newspaper boxes
def _news_window(a, name, w, h, at, dk):
    x, y, z = at
    a.rim(dk, w + 0.05, h + 0.05, (x, y - 0.006, z), 0.03, 0.022)
    a.decal(name, w * 0.8, w * 0.8 * 4 / 3 if w * 0.8 * 4 / 3 < h else h * 0.96, (x, y - 0.004, z))
    a.plate(CLR(), w, h, (x, y - 0.014, z), t=0.004)


@asset('furniture')
def newspaper_boxes():
    out = []
    dk, steel = P(DARK), MT(STEEL)
    # a: cabinet on a pedestal, coin head on top
    a = Asset('newspaper_box_a')
    m = body_mat()
    a.box(dk, 0.44, 0.38, 0.03, (0, 0, 0.015), 0.008, 'z')
    a.box(m, 0.16, 0.16, 0.42, (0, 0, 0.24), 0.012, 'z')
    a.box(m, 0.5, 0.42, 0.66, (0, 0, 0.78), 0.02)
    _news_window(a, 'news_a', 0.36, 0.44, (0, -0.21, 0.83), dk)
    a.handle(steel, (-0.12, -0.225, 1.075), (0.12, -0.225, 1.075), (0, -0.035, 0), 0.008)
    a.box(m, 0.26, 0.2, 0.17, (0.08, 0.02, 1.195), 0.012)
    a.plate(steel, 0.09, 0.11, (0.13, -0.083, 1.195))
    a.plate(dk, 0.03, 0.008, (0.13, -0.088, 1.215))
    a.cyl(steel, 0.014, (0.13, -0.085, 1.165), (0.13, -0.1, 1.165), 6)
    a.decal('tag_news', 0.21, 0.061, (-0.1, -0.2135, 0.52))
    a.extras['tints'] = {'body': ['#b8281f', '#2a559b']}
    out.append(a)
    # b: full height cabinet, sloped head
    a = Asset('newspaper_box_b')
    legs(a, dk, 0.44, 0.36, 0.1, 0.045)
    a.box(m, 0.46, 0.4, 0.92, (0, 0, 0.56), 0.018)
    a.prism(m, [(-0.2, 1.02), (0.2, 1.02), (0.2, 1.2), (0.02, 1.2), (-0.2, 1.08)], -0.23, 0.23, 'yz', 0.012)
    _news_window(a, 'news_b', 0.34, 0.42, (0, -0.2, 0.74), dk)
    a.handle(steel, (-0.1, -0.215, 0.99), (0.1, -0.215, 0.99), (0, -0.03, 0), 0.008)
    a.slats(dk, -0.16, 0.16, 0.16, 0.42, -0.204, 5, 0.018, 0.01)
    with a.at((0, -0.2, 1.08), (-61.4, 0, 0)):
        a.decal('tag_daily', 0.24, 0.07, (-0.07, -0.004, 0.125))
        a.plate(steel, 0.08, 0.1, (0.14, -0.004, 0.125))
        a.plate(dk, 0.03, 0.008, (0.14, -0.009, 0.14))
    a.extras['tints'] = {'body': ['#2a559b', '#e3b62e']}
    out.append(a)
    # c: slim free-paper rack with a slanted clear lid
    a = Asset('newspaper_box_c')
    for s in a.mx():
        a.tube(steel, [(0.17, -0.14, 0), (0.17, -0.14, 0.4)], 0.014, 6)
        a.tube(steel, [(0.17, 0.14, 0), (0.17, 0.14, 0.4)], 0.014, 6)
        a.tube(steel, [(0.17, -0.14, 0.12), (0.17, 0.14, 0.12)], 0.01, 6)
    a.prism(m, [(-0.18, 0.38), (0.18, 0.38), (0.18, 1.02), (0.06, 1.02), (-0.18, 0.8)], -0.21, 0.21, 'yz', 0.014)
    with a.at((0, -0.18, 0.8), (-47.5, 0, 0)):
        a.rim(dk, 0.38, 0.3, (0, -0.006, 0.163), 0.028, 0.02)
        a.decal('news_c', 0.2, 0.2667, (0, -0.004, 0.163), shape=[(0, 0.1), (1, 0.1), (1, 1), (0, 1)])
        a.plate(CLR(), 0.33, 0.25, (0, -0.014, 0.163), t=0.004)
        a.handle(steel, (-0.08, -0.018, 0.03), (0.08, -0.018, 0.03), (0, -0.03, 0), 0.007)
    a.decal('tag_take', 0.3, 0.0875, (0, -0.1835, 0.62))
    a.plate(P(CREAM), 0.3, 0.1, (0, -0.1815, 0.48))
    a.extras['tints'] = {'body': ['#2f6a49', '#e3b62e']}
    out.append(a)
    return out


# ------------------------------------------------------------------ vending
@asset('furniture')
def vending_soda():
    a = Asset('vending_soda')
    red, dk, steel = P('#a52026'), P(BLACK), MT(STEEL)
    a.box(red, 0.86, 0.72, 1.74, (0, 0.02, 0.95), 0.025)
    a.box(dk, 0.8, 0.66, 0.08, (0, 0.02, 0.04))
    a.box(P('#7d181d'), 0.88, 0.05, 1.76, (0, -0.355, 0.95), 0.012, 'y')           # door slab
    a.decal('soda', 0.52, 1.144, (-0.14, -0.3835, 1.19))
    a.rim(steel, 0.56, 1.184, (-0.14, -0.385, 1.19), 0.02, 0.014)
    # selection column
    a.box(P('#3a0d10'), 0.22, 0.012, 1.18, (0.29, -0.383, 1.19))
    for i, c in enumerate(('#c5262b', '#c5262b', '#e8742a', '#2f8f4f', '#e9e6dc')):
        a.box(P(c), 0.16, 0.022, 0.075, (0.29, -0.392, 1.66 - i * 0.105), 0.006, 'xz')
    a.box(steel, 0.17, 0.016, 0.25, (0.29, -0.39, 1.0), 0.006, 'xz')
    a.plate(dk, 0.035, 0.008, (0.29, -0.4, 1.08))
    a.plate(dk, 0.09, 0.012, (0.29, -0.4, 1.02))
    a.box(dk, 0.08, 0.02, 0.06, (0.29, -0.395, 0.93), 0.006, 'xz')
    a.cyl(steel, 0.02, (0.29, -0.39, 0.72), (0.29, -0.405, 0.72), 8)
    # delivery bin
    a.box(dk, 0.56, 0.02, 0.2, (-0.14, -0.375, 0.36))
    a.box(steel, 0.6, 0.035, 0.035, (-0.14, -0.39, 0.245), 0.008, 'x')
    a.box(P('#55171a'), 0.5, 0.014, 0.12, (-0.14, -0.386, 0.39), 0, rot=(12, 0, 0))
    for s in a.mx():
        with a.at((0.432, 0.1, 0), (0, 0, 90)):
            a.slats(dk, -0.2, 0.2, 0.22, 0.52, 0, 6, 0.02, 0.008)
    a.extras['lit'] = 'atlas front'
    return a


@asset('furniture')
def vending_snack():
    a = Asset('vending_snack')
    br, dk, steel = P('#4f3a2e'), P(BLACK), MT(STEEL)
    W, H = 0.96, 1.83
    a.box(br, W, 0.5, H - 0.08, (0, 0.14, H / 2 + 0.04), 0.02)               # rear carcass
    a.box(dk, W - 0.06, 0.7, 0.08, (0, 0.02, 0.04))
    # front frame around the display window: left stile, right control column, header, base
    y0, y1 = -0.38, -0.1
    a.bx(br, -W / 2, -W / 2 + 0.06, y0, y1, 0.08, H, 0.012, 'z')
    a.bx(br, 0.2, W / 2, y0, y1, 0.08, H, 0.012, 'z')
    a.bx(br, -W / 2 + 0.06, 0.2, y0, y1, 1.6, H)
    a.bx(br, -W / 2 + 0.06, 0.2, y0, y1, 0.08, 0.52)
    a.decal('snack_head', 0.6, 0.125, (-0.11, y0 - 0.003, 1.715))
    # shelves with goods
    cols = ('#c5262b', '#e3b62e', '#2f8f4f', '#2a559b', '#e8742a', '#8a4a9e', '#e9e6dc', '#7a4a2b')
    a.bx(P('#c9cdd0'), -W / 2 + 0.06, 0.2, -0.1, -0.09, 0.52, 1.6)
    for r in range(5):
        z = 0.56 + r * 0.21
        a.bx(steel, -W / 2 + 0.06, 0.2, -0.33, -0.1, z - 0.012, z)
        for c in range(6):
            x = -0.36 + c * 0.1
            hh = 0.1 + 0.05 * rnd(r, c)
            a.box(P(cols[int(rnd(r, c, 7) * 8) % 8]), 0.075, 0.16, hh, (x, -0.22, z + hh / 2), 0, rot=(0, 0, (rnd(c, r) - 0.5) * 10))
    a.plate(CLR(), 0.64, 1.1, (-0.11, y0 + 0.012, 1.06), t=0.004)
    # controls
    x = 0.34
    a.plate(dk, 0.2, 0.09, (x, y0 - 0.004, 1.5))
    a.plate(LT('panel', '#9fe6a8'), 0.15, 0.045, (x, y0 - 0.009, 1.5), t=0.004)
    a.decal('keypad', 0.16, 0.16, (x, y0 - 0.003, 1.3))
    a.box(steel, 0.17, 0.016, 0.2, (x, y0 - 0.006, 1.03), 0.006, 'xz')
    a.plate(dk, 0.035, 0.008, (x, y0 - 0.016, 1.09))
    a.plate(dk, 0.09, 0.012, (x, y0 - 0.016, 1.02))
    a.box(dk, 0.08, 0.02, 0.06, (x, y0 - 0.01, 0.84), 0.006, 'xz')
    # delivery flap
    a.box(dk, 0.6, 0.02, 0.24, (-0.11, y0 - 0.002, 0.3))
    a.box(steel, 0.56, 0.014, 0.17, (-0.11, y0 - 0.014, 0.31), 0.006, 'xz', rot=(8, 0, 0))
    a.plate(P('#e3b62e'), 0.2, 0.035, (-0.11, y0 - 0.024, 0.33))
    with a.at((W / 2 + 0.002, 0.16, 0), (0, 0, 90)):
        a.slats(dk, -0.18, 0.18, 0.2, 0.5, 0, 6, 0.02, 0.008)
    with a.at((-W / 2 - 0.002, 0.16, 0), (0, 0, -90)):
        a.slats(dk, -0.18, 0.18, 0.2, 0.5, 0, 6, 0.02, 0.008)
    return a


@asset('furniture')
def ice_freezer():
    a = Asset('ice_freezer')
    wh, dk, steel, bl = P('#e4e7e8'), P(DARK), MT(STEEL), P('#2a62b3')
    W = 1.7
    prof = [(-0.42, 0.1), (0.42, 0.1), (0.42, 1.62), (-0.14, 1.62), (-0.42, 0.86)]
    a.prism(wh, prof, -W / 2, W / 2, 'yz', 0.02)
    legs(a, dk, W, 0.84, 0.1, 0.07)
    a.box(wh, 1.3, 0.1, 0.42, (0, 0.26, 1.83), 0.015)
    a.decal('ice', 1.16, 0.4, (0, 0.207, 1.83))
    for x in (-0.5, 0.5):
        a.box(steel, 0.04, 0.04, 0.06, (x, 0.26, 1.61))
    ang = math.degrees(math.atan2(0.28, 0.76))
    with a.at((0, -0.42, 0.86), (-ang, 0, 0)):
        for s in a.mx():
            a.box(P('#d3d8da'), 0.74, 0.04, 0.7, (0.4, -0.02, 0.405), 0.012, 'xz')
            a.rim(steel, 0.74, 0.7, (0.4, -0.043, 0.405), 0.03, 0.012)
            a.decal('ice_door', 0.38, 0.456, (0.42, -0.043, 0.43))
            a.box(steel, 0.03, 0.035, 0.3, (0.08, -0.06, 0.405), 0.008, 'z')
    a.box(bl, W + 0.01, 0.012, 0.1, (0, -0.424, 0.76))
    a.slats(dk, -0.7, 0.7, 0.2, 0.5, -0.424, 6, 0.022, 0.01)
    for s in a.mx():
        a.box(bl, 0.012, 0.86, 0.1, (W / 2 + 0.002, 0, 0.76))
    a.box(steel, 0.3, 0.3, 0.1, (0.55, 0.2, 1.67), 0.012)
    return a


# ------------------------------------------------------------------ phones
def _phone_unit(a, at):
    """Wall pay phone: body, handset on its cradle, keypad, coin slot and return, armoured cord."""
    dk, steel = P(BLACK), MT(STEEL)
    with a.at(at):
        a.box(dk, 0.24, 0.1, 0.42, (0, 0, 0), 0.012)
        a.box(steel, 0.24, 0.105, 0.1, (0, -0.002, -0.2), 0.008)
        a.decal('keypad', 0.1, 0.1, (0.045, -0.053, -0.03))
        a.decal('phone_card', 0.075, 0.1, (0.05, -0.053, 0.12))
        a.plate(steel, 0.05, 0.012, (-0.03, -0.054, 0.17))
        a.plate(dk, 0.06, 0.04, (0.05, -0.058, -0.2))
        # handset
        a.box(dk, 0.04, 0.035, 0.2, (-0.07, -0.085, 0.02), 0.01, 'z')
        a.box(dk, 0.05, 0.05, 0.055, (-0.07, -0.075, 0.115), 0.01)
        a.box(dk, 0.05, 0.05, 0.055, (-0.07, -0.075, -0.075), 0.01)
        a.tube(steel, [(-0.07, -0.07, -0.1), (-0.09, -0.1, -0.24), (-0.04, -0.09, -0.34), (-0.02, -0.055, -0.24)], 0.006, 5)


@asset('furniture')
def payphone_post():
    a = Asset('payphone_post')
    steel, blue, dk = MT(STEEL), P('#2a559b'), P(DARK)
    a.box(dk, 0.3, 0.3, 0.02, (0, 0.05, 0.01), 0.006, 'z')
    a.bolts(steel, [(sx * 0.11, 0.05 + sy * 0.11, 0.02) for sx in (-1, 1) for sy in (-1, 1)], 0.012, 0.01, (0, 0, 1))
    a.box(steel, 0.1, 0.1, 1.5, (0, 0.05, 0.77), 0.012, 'z')
    # three-sided hood
    a.box(blue, 0.5, 0.03, 0.7, (0, 0.0, 1.5), 0.008, 'y')
    for s in a.mx():
        a.prism(blue, [(0.0, 1.15), (0.0, 1.85), (-0.3, 1.85), (-0.3, 1.5), (-0.14, 1.15)], 0.235, 0.265, 'yz', 0.006)
    a.box(blue, 0.56, 0.36, 0.035, (0, -0.14, 1.86), 0.01, 'xy')
    a.box(steel, 0.47, 0.22, 0.02, (0, -0.11, 1.17), 0.006, 'xy')
    _phone_unit(a, (0, -0.07, 1.5))
    a.box(blue, 0.03, 0.3, 0.3, (0, -0.1, 2.03), 0.006, 'x')
    for s in a.mx():
        a.decal('phone_sign', 0.26, 0.26, (0.0165, -0.1, 2.03), (0, 0, 90))
    return a


@asset('furniture')
def phone_booth():
    a = Asset('phone_booth')
    alu, dk, blue = MT('#a7adb1'), P(DARK), P('#2a559b')
    S, H, t = 0.92, 2.2, 0.045
    h = S / 2 - t / 2
    a.box(MT('#6f7579'), S, S, 0.04, (0, 0, 0.02), 0.008, 'z')
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box(alu, t, t, H - 0.04, (sx * h, sy * h, H / 2 + 0.02))
    # header with signs on all four sides, roof
    a.box(blue, S + 0.02, S + 0.02, 0.2, (0, 0, H - 0.14), 0.008, 'z')
    for i in range(4):
        with a.at(rot=(0, 0, i * 90)):
            a.decal('phone_head', 0.8, 0.15, (0, -S / 2 - 0.013, H - 0.14))
    a.box(alu, S + 0.06, S + 0.06, 0.05, (0, 0, H - 0.015), 0.015, 'xyT')
    a.plate(LT('lamp', '#fff3c9'), 0.4, 0.4, (0, 0, H - 0.245), (90, 0, 0), t=0.01)
    # fixed sides: back, left, right
    for rz in (90, 180, 270):
        with a.at(rot=(0, 0, rz)):
            a.box(alu, S - 2 * t, 0.02, 0.5, (0, -h, 0.29))
            a.box(alu, S - 2 * t, 0.03, 0.04, (0, -h, 0.56))
            a.box(alu, S - 2 * t, 0.03, 0.04, (0, -h, 1.25))
            a.box(CLR(), S - 2 * t, 0.006, H - 0.82, (0, -h, 0.56 + (H - 0.82) / 2))
    # folding door (child, hinged on the front-left post)
    dr = a.child('door', (-S / 2 + t, -h, 0.04))
    dw = S - 2 * t
    for i in (0, 1):
        x0 = -S / 2 + t + i * dw / 2
        with dr.at((x0 + dw / 4, -h, 0)):
            dr.rim(alu, dw / 2 - 0.006, H - 0.3, (0, 0, 0.04 + (H - 0.3) / 2), 0.035, 0.03)
            dr.box(alu, dw / 2 - 0.07, 0.016, 0.46, (0, 0, 0.3))
            dr.box(alu, dw / 2 - 0.07, 0.03, 0.035, (0, 0, 0.55))
            dr.box(CLR(), dw / 2 - 0.07, 0.006, H - 0.9, (0, 0, 0.57 + (H - 0.9) / 2))
    dr.handle(alu, (0.02, -h - 0.015, 1.0), (0.02, -h - 0.015, 1.25), (0, -0.04, 0), 0.009)
    _phone_unit(a, (0, h - 0.07, 1.35))
    a.box(alu, 0.5, 0.24, 0.025, (0, h - 0.13, 1.0), 0.006, 'xy')
    a.box(P('#d9d3c2'), 0.2, 0.16, 0.05, (0.1, h - 0.13, 1.04), 0.006)
    a.extras['door'] = {'axis': 'z', 'note': 'bifold leaf pair, hinge on front-left post'}
    return a


# ------------------------------------------------------------------ meters, hydrant, bollards
def _meter_head(a, at, col='#7d858a'):
    m, dk, steel = MT(col), P(BLACK), MT('#b9bec2')
    with a.at(at):
        a.cz(m, 0.045, 0.0, 0.05, n=10, bev=0.006)
        a.prism(m, arch(0.17, 0.045, 0.2, 6), -0.06, 0.06, 'xz', 0.008)
        a.prism(dk, arch(0.125, 0.15, 0.21, 6), -0.068, -0.058, 'xz')
        a.decal('meter_face', 0.105, 0.105, (0, -0.0705, 0.215))
        a.prism(dk, arch(0.125, 0.15, 0.21, 6), 0.058, 0.068, 'xz')
        a.plate(P('#e3b62e'), 0.11, 0.05, (0, -0.064, 0.105))
        a.plate(dk, 0.03, 0.007, (0.02, -0.068, 0.108))
        a.cyl(steel, 0.016, (0.085, 0, 0.11), (0.105, 0, 0.11), 8)
        a.box(steel, 0.008, 0.012, 0.05, (0.108, 0, 0.125))


@asset('furniture')
def parking_meters():
    a = Asset('parking_meter')
    steel = MT('#8f979c')
    a.cz(steel, 0.06, 0, 0.02, n=10)
    a.cz(steel, 0.03, 0.02, 1.1, n=10)
    a.cz(steel, 0.038, 1.04, 1.1, n=10, bev=0.006)
    _meter_head(a, (0, 0, 1.1))
    b = Asset('parking_meter_double')
    b.cz(steel, 0.06, 0, 0.02, n=10)
    b.cz(steel, 0.03, 0.02, 1.06, n=10)
    b.box(steel, 0.4, 0.06, 0.05, (0, 0, 1.075), 0.01, 'x')
    for x in (-0.14, 0.14):
        _meter_head(b, (x, 0, 1.1))
    return [a, b]


@asset('furniture')
def fire_hydrant():
    a = Asset('fire_hydrant')
    red, cap = P('#b8281f'), P('#d9d4c8')
    n = 12
    a.lathe(red, [(0, 0), (0.13, 0), (0.13, 0.03), (0.095, 0.045), (0.085, 0.07), (0.085, 0.4), (0.105, 0.41), (0.105, 0.44), (0.09, 0.45),
                  (0.09, 0.56), (0.11, 0.575), (0.11, 0.6), (0.095, 0.63), (0.06, 0.68), (0, 0.69)], n)
    a.bolts(MT('#6f7579'), [(0.112 * math.cos(rad(a_)), 0.112 * math.sin(rad(a_)), 0.03) for a_ in range(30, 390, 60)], 0.011, 0.012, (0, 0, 1))
    a.cz(cap, 0.03, 0.685, 0.715, n=5)
    a.cz(cap, 0.018, 0.715, 0.75, n=5)
    for s in a.mx():
        a.cyl(red, 0.05, (0.07, 0, 0.5), (0.15, 0, 0.5), 10)
        a.cyl(cap, 0.058, (0.15, 0, 0.5), (0.18, 0, 0.5), 10, bev=0.006)
        a.cyl(cap, 0.02, (0.18, 0, 0.5), (0.2, 0, 0.5), 5)
    a.cyl(red, 0.065, (0, -0.07, 0.42), (0, -0.16, 0.42), 10)
    a.cyl(cap, 0.075, (0, -0.16, 0.42), (0, -0.195, 0.42), 10, bev=0.006)
    a.cyl(cap, 0.024, (0, -0.195, 0.42), (0, -0.215, 0.42), 5)
    return a


@asset('furniture')
def bollards():
    a = Asset('bollard_steel')
    st = MT('#a9afb3')
    a.cz(MT('#6f7579'), 0.11, 0, 0.015, n=12)
    a.lathe(st, [(0, 0.015), (0.07, 0.015), (0.07, 0.84), (0.062, 0.87), (0.04, 0.892), (0, 0.9)], 12)
    a.lathe(P(BLACK), [(0.0715, 0.7), (0.0715, 0.76)], 12, caps=False)
    b = Asset('bollard_yellow_black')
    ye, bk = P('#e3b62e'), P(BLACK)
    b.box(MT('#6f7579'), 0.26, 0.26, 0.015, (0, 0, 0.0075), 0.02, 'z')
    b.bolts(MT('#8f979c'), [(sx * 0.1, sy * 0.1, 0.015) for sx in (-1, 1) for sy in (-1, 1)], 0.012, 0.01, (0, 0, 1))
    z = 0.015
    for i, (h, m) in enumerate(((0.22, ye), (0.16, bk), (0.2, ye), (0.16, bk), (0.2, ye))):
        b.cyl(m, 0.08, (0, 0, z), (0, 0, z + h), 12, caps=(i == 0))
        z += h
    b.lathe(ye, [(0.08, z), (0.07, z + 0.035), (0.04, z + 0.055), (0, z + 0.06)], 12)
    return [a, b]


@asset('furniture')
def atm_outdoor():
    a = Asset('atm_outdoor')
    body, teal, dk, steel = P('#cfd3d4'), P('#156a6e'), P(BLACK), MT(STEEL)
    W = 0.82
    a.box(P(DARK), W - 0.04, 0.62, 0.1, (0, 0.03, 0.05))
    a.box(body, W, 0.66, 1.72, (0, 0.03, 0.96), 0.02)
    a.box(teal, W + 0.04, 0.72, 0.28, (0, 0.0, 1.9), 0.02)
    a.decal('atm_head', 0.7, 0.16, (0, -0.363, 1.9))
    a.box(teal, W + 0.012, 0.012, 0.1, (0, -0.302, 0.3))
    # recessed fascia: dark surround, screen, keypad shelf, slots
    a.box(dk, 0.68, 0.03, 0.86, (0, -0.305, 1.28), 0.01, 'xz')
    a.rim(steel, 0.36, 0.28, (-0.1, -0.325, 1.52), 0.02, 0.016)
    a.decal('atm_screen', 0.32, 0.24, (-0.1, -0.324, 1.52))
    for i in range(3):
        for sx in (-0.3, 0.1):
            a.box(steel, 0.03, 0.012, 0.03, (sx, -0.325, 1.6 - i * 0.08))
    a.box(steel, 0.17, 0.014, 0.05, (0.22, -0.325, 1.6), 0.005, 'xz')
    a.plate(dk, 0.11, 0.01, (0.22, -0.335, 1.6))
    a.plate(LT('panel', '#63e08a'), 0.03, 0.012, (0.22, -0.335, 1.56), t=0.004)
    a.box(steel, 0.17, 0.014, 0.04, (0.22, -0.325, 1.46), 0.005, 'xz')
    a.plate(P(CREAM), 0.1, 0.008, (0.22, -0.335, 1.46))
    a.prism(steel, [(-0.3, 1.2), (-0.3, 1.26), (-0.44, 1.2)], -0.32, 0.32, 'yz', 0.006)
    with a.at((0.0, -0.44, 1.2), (-66.8, 0, 0)):
        a.decal('keypad', 0.15, 0.15, (-0.1, -0.004, 0.076))
    a.box(steel, 0.42, 0.016, 0.07, (0, -0.325, 1.05), 0.006, 'xz')
    a.plate(dk, 0.34, 0.016, (0, -0.336, 1.05))
    a.decal('warn', 0.09, 0.09, (0.3, -0.3035, 0.72))
    a.plate(P('#e9e6dc'), 0.2, 0.12, (-0.2, -0.3035, 0.7))
    a.cyl(dk, 0.035, (0.3, -0.36, 2.0), (0.3, -0.39, 2.0), 8)
    return a

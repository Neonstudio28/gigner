"""Tier 1: passenger cars. Every car is a spec handed to build_car() plus its own nose, tail and trim code."""
import math
from mathutils import Vector
from vehicles_kit import Kit, Vehicle, greenhouse, lin
import vehicles_parts as P

DARK = 'paint:#2a2a2c'


def build_car(name, S):
    """Body loft, wheel wells, cabin, greenhouse, seams, handles, mirrors and wheels from a spec dict.
    Returns the Vehicle with v.xf / v.xr (nose / tail x), v.fa / v.ra (axles), v.w, v.wb (belt half width), v.yy."""
    v = Vehicle(name, S.get('type', 'car'))
    wb, w, r = S['wb'], S['w'], S.get('r', 0.33)
    v.fa, v.ra, v.w, v.r = wb / 2, -wb / 2, w, r
    xf, xr = v.fa + S['fo'], S.get('body_end', v.ra - S.get('ro', 0))  # body_end: cab-only body (heavy trucks)
    v.xf, v.xr = xf, xr
    v.S = S
    cl = S.get('clear', 0.2)
    g = S.get('gh')
    pts = g['pts'] if g else S['belt']
    p0, pn = pts[0], pts[-1]
    v.p0, v.pn = p0, pn
    nose, tail = S.get('nose', p0[1] - 0.07), S.get('tail', pn[1] - 0.04)
    nc, tc = S.get('nc', (0.04, 0.07)), S.get('tc', (0.04, 0.07))
    top = S.get('top') or [(xf, nose - nc[1]), (xf - nc[0], nose), *S.get('hood', []), (p0[0], p0[1]), (pn[0], pn[1]),
                           *S.get('deck', []), (xr + tc[0], tail), (xr, tail - tc[1])]
    bot = S.get('bot') or [(xf, cl + S.get('fv', 0.2)), (xf - 0.12, cl + 0.07), (xf - 0.42, cl), (xr + 0.45, cl), (xr + 0.12, cl + 0.09),
                           (xr, cl + S.get('rv', 0.22))]
    pf, pr = S.get('pinch', (0.08, 0.08))
    wid = S.get('wid') or [(xf, w - pf), (xf - 0.1, w - pf * 0.25), (xf - 0.5, w), (xr + 0.5, w), (xr + 0.1, w - pr * 0.25), (xr, w - pr)]
    kw = dict(S.get('loft', {}))
    L = v.loft(top, bot, wid, xs=[v.fa, v.ra, *S.get('xs', [])], **kw)
    v.wb = w - L.lean - L.cham * 1.1
    ar = S.get('arch', r + 0.075)
    sq = S.get('sq', 2.6)
    dp = S.get('depth', 0.3)
    if S.get('front_arch', True):
        v.arch(v.fa, ar, r, sq=sq, lip=S.get('lip', 0.045), lip_m=S.get('lip_m', 'body'), z=S.get('wz'), depth=dp)
    wy = w - S.get('inset', 0.13)
    v.wheel(v.fa, wy, r, S.get('wheel', 'wheel_steel'))
    if 'body_end' not in S:
        v.arch(v.ra, S.get('arch_r', ar), r, sq=sq, lip=S.get('lip', 0.045), lip_m=S.get('lip_m', 'body'), z=S.get('wz'),
               depth=S.get('depth_r', dp))
        v.wheel(v.ra, w - S.get('inset_r', S.get('inset', 0.13)), r, S.get('wheel_r', S.get('wheel', 'wheel_steel')))
    v.extra['paint'] = S.get('paint', ('#a8322a', '#e6e1d3', '#f1eee4'))
    # cabin
    c = dict(S.get('cab', {}))
    im = S.get('int', 'paint:#7a5b3c')
    hw = c.pop('hw', v.wb - 0.065)
    x0, x1 = c.pop('x0', p0[0] - 0.02), c.pop('x1', pn[0] + 0.02)
    nar = c.pop('narrow', (v.ra + ar + 0.05, w - 0.335))
    belt = c.pop('belt', min(p0[1], pn[1]))
    P.cabin(v, x0, x1, c.pop('floor', cl + 0.07), hw, belt, im, narrow=nar if nar and nar[0] > x1 else None, **c)
    if g:
        gk = {k: g[k] for k in g if k != 'pts'}
        v.yy = greenhouse(v, pts, gk.pop('wb', v.wb), gk.pop('wr', w - 0.2), **gk)
        if S.get('wipers', True):
            P.wipers(v, pts[0], pts[1], v.yy)
    # seams, handles, mirrors
    zlo, zhi = cl + 0.05, lambda x: lin(L.top, x) - 0.004
    for sm in S.get('seams', []):
        path = [(sm, zlo), (sm, zhi(sm))] if isinstance(sm, (int, float)) else [(x, zhi(x) if z is None else z) for x, z in sm]
        P.side_strip(v, path, 0.012, 'black')
    for hx in S.get('handles', []):
        P.handle(v, hx, S.get('handle_z', belt - 0.11), S.get('handle_m', 'chrome'))
    if S.get('mirror', True):
        P.mirror(v, p0[0] - 0.12, v.wb - 0.03, belt + 0.07, S.get('mirror_m', 'chrome'), right=S.get('mirror_r', True))
    return v


def hood_lines(v, x0, x1, y, cowl=True, m='black'):
    """Hood or boot-lid shut lines: two lengthwise seams at +-y and a cross seam at x1."""
    P.top_strip(v, [(x0, y), (x1, y)], 0.012, m, sym=True)
    P.top_strip(v, [(x1, -y), (x1, y)], 0.012, m)


def sedan_80s(name, **over):
    v = build_car(name, dict(dict(
        wb=2.75, fo=0.95, ro=1.2, w=0.925, wheel='wheel_steel', paint=('#c8b386', '#6f5a3c', '#3d2f22'), int='paint:#7d5d3d',
        gh=dict(pts=[(0.92, 0.875), (0.3, 1.385), (-0.4, 1.405), (-1.08, 1.39), (-1.6, 0.9)], wr=0.7,
                pillars=[(-0.33, -0.31, 0.1)], a=0.055, c=0.2),
        cab=dict(front=-0.38, rear=-1.26, shelf=(-1.6, -1.34, 0.875)),
        loft=dict(bands=[(0.5, 0.545, 'black')], lower='body'),
        seams=[0.86, -0.32, [(-1.42, None), (-1.42, 0.8), (-1.0, 0.62), (-0.93, 0.25)]], handles=[-0.14, -1.2]), **over))
    k, xf, xr = v.k, v.xf, v.xr
    # nose: full-width recess with grille and quad lamps, chrome bumper with guards, amber corner lamps
    P.grille(v, xf, -0.42, 0.42, 0.565, 0.715, bars=5)
    v.cut_box((xf, 0, 0.64), (0.07, 1.62, 0.15), 'grille')
    for y in (0.5, 0.68):
        P.lamp(k, xf - 0.03, y, 0.64, 0.15, 0.105, 'head')
    P.side_lamp(v, xf - 0.1, 0.64, 'amber', 0.12, 0.09)
    P.bumper(v, xf, 0.905, 0.46, 0.14, guards=(0.3,))
    P.plate(k, xf + 0.09, 0.46)
    k.box((xf - 0.02, 0, 0.345), (0.06, 1.4, 0.07), 'trim', 0.02)
    hood_lines(v, 0.98, xf - 0.07, 0.79)
    P.top_panel(v, 0.93, 1.0, -0.6, 0.6, 'trim', 0.004)
    k.box((xf - 0.1, 0, lin(v.L.top, xf - 0.1) + 0.03), (0.1, 0.03, 0.03), 'chrome', 0.008)
    # tail: lamp clusters, plate recess, bumper, exhaust
    v.cut_box((xr, 0, 0.67), (0.06, 1.66, 0.17), 'trim')
    P.lamp(k, xr + 0.03, 0.6, 0.67, 0.3, 0.13, 'tail', -1)
    P.lamp(k, xr + 0.03, 0.36, 0.67, 0.12, 0.13, 'reverse', -1)
    P.lamp(k, xr + 0.032, 0.72, 0.67, 0.07, 0.1, 'amber', -1, bezel=None)
    P.plate(k, xr + 0.02, 0.67, -1)
    P.bumper(v, xr, 0.905, 0.47, 0.14, sign=-1, guards=(0.32,))
    P.exhaust(k, xr - 0.06, -0.55, 0.3)
    hood_lines(v, -1.68, xr + 0.07, 0.8)
    P.side_lamp(v, xr + 0.12, 0.64, 'tail', 0.1, 0.05)
    P.antenna(k, 1.25, -0.8, 0.86)
    P.side_strip(v, [(v.fa - 0.5, 0.27), (v.ra + 0.5, 0.27)], 0.04, 'chrome')
    return v


def lids(v, hood=True, boot=True, cowl=True, y=None):
    """Hood and boot shut lines plus the black cowl vent strip under the windscreen."""
    y = y or v.w - 0.135
    if hood:
        hood_lines(v, v.p0[0] + 0.06, v.xf - 0.07, y)
    if cowl:
        P.top_panel(v, v.p0[0] + 0.01, v.p0[0] + 0.08, -0.6, 0.6, 'trim', 0.004)
    if boot:
        hood_lines(v, v.pn[0] - 0.08, v.xr + 0.07, y)


def roof_stripes(v, y0, y1, m='stripe'):
    """Stripes on a flat (single-segment) roof."""
    (xa, za), (xb, zb) = v.S['gh']['pts'][1], v.S['gh']['pts'][-2]
    for s in (1, -1):
        v.k.f([(xa - 0.03, s * y0, za + 0.004), (xa - 0.03, s * y1, za + 0.004), (xb + 0.03, s * y1, zb + 0.004), (xb + 0.03, s * y0, zb + 0.004)],
              m, out=(0, 0, 1))


def sedan_luxury(name):
    v = build_car(name, dict(
        wb=3.0, fo=1.05, ro=1.4, w=0.97, wheel='wheel_wire', paint=('#e9e6dc', '#27364f', '#b08d4a'), int='paint:#7a2a2a',
        gh=dict(pts=[(1.0, 0.9), (0.42, 1.4), (-0.5, 1.42), (-1.32, 1.4), (-1.62, 0.92)], wr=0.74,
                pillars=[(-0.3, -0.3, 0.1)], a=0.055, c=0.42, roof='body2', back=(0.07, 0.06)),
        cab=dict(front=-0.36, rear=-1.3, shelf=(-1.62, -1.38, 0.9), bench=True),
        loft=dict(bands=[(0.3, 0.36, 'chrome')]),
        seams=[0.94, -0.3, [(-1.42, None), (-1.42, 0.8), (-1.12, 0.62), (-1.07, 0.3)]], handles=[-0.12, -1.22]))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.655, h=0.15, gw=0, lamps='quad', guards=(0.26,), bh=0.15)
    P.grille(v, xf, -0.3, 0.3, 0.55, 0.77, bars=9, vertical=True, frame=0.03, depth=0.04)
    k.box((xf + 0.012, 0, 0.775), (0.07, 0.66, 0.03), 'chrome', 0.01)
    k.box((xf - 0.08, 0, lin(v.L.top, xf - 0.08) + 0.045), (0.02, 0.012, 0.09), 'chrome')
    k.box((xf - 0.08, 0, lin(v.L.top, xf - 0.08) + 0.09), (0.06, 0.07, 0.012), 'chrome', 0.004)
    P.tail(v, z=0.68, h=0.16, lamp_=(0.55, 0.5), rev=(0.25, 0.08), amber=None, guards=(0.3,), bh=0.15)
    for y in (0.4, 0.55, 0.7):
        for s in (1, -1):
            k.box((xr - 0.002, s * y, 0.68), (0.012, 0.014, 0.125), 'chrome')
    lids(v)
    P.antenna(k, 1.3, -0.84, 0.88)
    P.side_strip(v, [(v.fa + 0.52, 0.62), (v.ra - 0.52, 0.62)], 0.025, 'chrome')
    for s in (1, -1):  # opera lamps on the wide rear pillars
        k.box((-1.28, s * (v.yy(1.12) + 0.004), 1.12), (0.035, 0.014, 0.14), 'chrome', 0.004)
        k.box((-1.28, s * (v.yy(1.12) + 0.008), 1.12), (0.018, 0.014, 0.11), 'amber')
    return v


def coupe_80s(name):
    v = build_car(name, dict(
        wb=2.6, fo=0.92, ro=1.1, w=0.9, wheel='wheel_alloy5', paint=('#3f6f9a', '#aeb3b8', '#e8e4d8'), int='paint:#48525e',
        gh=dict(pts=[(0.78, 0.87), (0.18, 1.34), (-0.72, 1.34), (-1.22, 0.89)], wr=0.69, pillars=[(-0.42, -0.4, 0.1)], a=0.055, c=0.17),
        cab=dict(front=-0.4, rear=-1.0, shelf=(-1.22, -1.04, 0.86)),
        loft=dict(lower='body2', bands=[(0.56, 0.595, 'stripe')]),
        seams=[0.74, [(-0.47, None), (-0.47, 0.25)]], handles=[-0.34], mirror_m='body'))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.64, h=0.13, gw=0.4, lamps='single', lw=0.3, bars=4, bm='body2', guards=(), amber='corner')
    P.tail(v, z=0.68, h=0.15, lamp_=(0.56, 0.42), rev=(0.29, 0.1), amber=(0.8, 0.05), bm='body2', guards=(), exh=(-0.5,))
    lids(v)
    P.top_panel(v, v.p0[0] + 0.2, v.p0[0] + 0.75, -0.3, 0.3, 'body', 0.012)
    P.antenna(k, -1.6, 0.74, 0.86)
    k.box((xr + 0.04, 0, lin(v.L.top, xr + 0.06) + 0.012), (0.1, 1.5, 0.03), 'body', 0.012)
    return v


def muscle_70s(name):
    v = build_car(name, dict(
        wb=2.8, fo=0.95, ro=1.15, w=0.95, wheel='wheel_rally', paint=('#e0701c', '#1b1b1d', '#141416'), int='paint:#232325',
        gh=dict(pts=[(0.5, 0.88), (-0.02, 1.3), (-0.78, 1.3), (-1.72, 0.94)], wr=0.68, pillars=[(-0.6, -0.62, 0.1)], a=0.055, c=0.24,
                back=(0.07, 0.09)),
        cab=dict(front=-0.52, rear=-1.1, shelf=(-1.72, -1.2, 0.86), seat_h=0.56),
        loft=dict(tbands=[(0.1, 0.3, 'stripe')], bands=[(0.33, 0.39, 'stripe')]), arch=0.42, arch_r=0.43, sq=2.3,
        seams=[0.46, [(-0.67, None), (-0.67, 0.25)]], handles=[-0.52], mirror_r=False))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.655, h=0.15, gw=0.5, lamps='round4', bars=3, bh=0.1, bz=0.47, guards=(), amber='bumper')
    k.box((xf - 0.06, 0, 0.36), (0.12, 1.5, 0.06), 'black', 0.015, rot=(0, -25, 0))
    P.scoop(v, 0.72, 1.3, 0.21, 0.075)
    for s in (1, -1):  # hood pins
        k.cyl((xf - 0.2, s * 0.5, v.L.top_z(xf - 0.2, 0.5)), (xf - 0.2, s * 0.5, v.L.top_z(xf - 0.2, 0.5) + 0.02), 0.014, 'chrome', 6)
    P.tail(v, z=0.71, h=0.15, lamp_=(0.5, 0.56), rev=None, amber=None, bh=0.1, bz=0.5, guards=(0.3,), exh=(-0.52, 0.52))
    for y in (0.36, 0.5, 0.64):
        for s in (1, -1):
            k.box((xr - 0.002, s * y, 0.71), (0.012, 0.016, 0.115), 'chrome')
    P.spoiler(v, xr + 0.01, lin(v.L.top, xr + 0.2) - 0.005, 0.86, chord=0.2, h=0.065)
    lids(v, boot=False)
    roof_stripes(v, 0.1, 0.3)
    return v


def pony_80s(name):
    v = build_car(name, dict(
        wb=2.55, fo=0.98, ro=0.97, w=0.88, wheel='wheel_alloy5', paint=('#b3261e', '#2a2b2e', '#d9a520'), int='paint:#2c2c30',
        gh=dict(pts=[(0.68, 0.85), (0.08, 1.29), (-0.5, 1.29), (-1.5, 0.9)], wr=0.66, pillars=[(-0.45, -0.47, 0.1)], a=0.055, c=0.3,
                back=(0.05, 0.06)),
        cab=dict(front=-0.42, rear=-0.98, shelf=(-1.5, -1.06, 0.84), seat_h=0.56),
        nose=0.7, nc=(0.07, 0.07), loft=dict(lower='body2', bands=[(0.56, 0.6, 'stripe')]),
        seams=[0.64, [(-0.52, None), (-0.52, 0.25)]], handles=[-0.38], mirror_m='black'))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.583, h=0.095, gw=0, lamps='quad', lw=0.14, bm='body', bz=0.445, bh=0.13, guards=(), amber='bumper', dam=False)
    k.box((xf + 0.012, 0, 0.33), (0.12, 1.6, 0.11), 'body2', 0.03)
    for s in (1, -1):
        k.box((xf + 0.075, s * 0.25, 0.33), (0.012, 0.3, 0.05), 'under')
    P.top_panel(v, v.p0[0] + 0.12, v.p0[0] + 0.9, -0.24, 0.24, 'body', 0.022)
    for i in range(4):  # hood vents
        for s in (1, -1):
            k.box((1.0 + i * 0.07, s * 0.52, v.L.top_z(1.0 + i * 0.07, 0.52) + 0.003), (0.03, 0.2, 0.008), 'black')
    P.louvres(v, (-0.57, 1.27), (-1.44, 0.93), v.yy, n=7)
    P.tail(v, z=0.68, h=0.14, lamp_=(0.48, 0.58), rev=None, amber=None, bm='body', guards=(), exh=(-0.56, -0.46, 0.46, 0.56), bz=0.46)
    for i in range(1, 3):
        k.box((xr - 0.002, 0, 0.63 + i * 0.033), (0.012, 1.56, 0.008), 'black')
    P.spoiler(v, xr + 0.13, lin(v.L.top, xr + 0.13), 0.78, wing=True, h=0.13, chord=0.24)
    lids(v, boot=False)
    return v


def sports_70s(name):
    xf, xr = 2.3, -2.2
    v = build_car(name, dict(
        wb=2.5, fo=1.05, ro=0.95, w=0.9, wheel='wheel_rally', paint=('#2f6b3f', '#1c1c1e', '#d8d2c0'), int='paint:#6b4a2e',
        gh=dict(pts=[(0.2, 0.82), (-0.3, 1.2), (-0.8, 1.2), (-1.3, 0.88)], wb=0.76, wr=0.6, a=0.05, c=0.16, ttop=(-0.34, -0.76),
                back=(0.05, 0.05)),
        top=[(xf, 0.55), (xf - 0.16, 0.65), (1.25, 0.8), (0.6, 0.79), (0.2, 0.82), (-1.3, 0.88), (-1.75, 0.87), (xr + 0.05, 0.8), (xr, 0.72)],
        pinch=(0.24, 0.1), arch=0.39, sq=2.2, loft=dict(cham=0.06, crown=0.035),
        cab=dict(front=-0.86, hw=0.7, steer_y=0.34, seat_w=0.44, seat_h=0.5, dash_d=0.32, head=False, narrow=None, x1=-1.22),
        seams=[0.12, [(-0.84, None), (-0.84, 0.25)]], handles=[-0.7], mirror_r=False))
    k = v.k
    # pointed nose: slim recess with marker lamps, pop-up headlamp covers, split chrome bumper
    v.cut_box((xf, 0, 0.5), (0.07, 1.0, 0.06), 'grille')
    P.lamp(k, xf - 0.03, 0.2, 0.5, 0.26, 0.035, 'head', bezel=None)
    P.lamp(k, xf - 0.03, 0.42, 0.5, 0.12, 0.035, 'amber', bezel=None)
    P.bumper(v, xf, 0.66, 0.425, 0.07, wrap=0.2, guards=(0.2,))
    P.plate(k, xf + 0.09, 0.425)
    k.box((xf - 0.03, 0, 0.36), (0.07, 0.9, 0.06), 'trim', 0.02)
    for s in (1, -1):
        P.top_panel(v, xf - 0.62, xf - 0.3, s * 0.6 - 0.14, s * 0.6 + 0.14, 'body', 0.008, medge='black')
    hood_lines(v, 0.26, xf - 0.2, 0.74)
    P.top_panel(v, 0.5, 1.5, -0.2, 0.2, 'body', 0.03)
    for s in (1, -1):  # side gills behind the front wheels
        for i in range(3):
            P.side_strip(v, [(0.62 - i * 0.07, 0.52), (0.6 - i * 0.07, 0.68)], 0.025, 'black', sym=True)
    # kamm tail with four round lamps
    v.cut_box((xr, 0, 0.62), (0.06, 1.5, 0.15), 'trim')
    for y in (0.36, 0.56):
        P.round_lamp(k, xr + 0.04, y, 0.62, 0.055, 'tail', -1)
    P.plate(k, xr + 0.02, 0.62, -1)
    P.bumper(v, xr, 0.86, 0.455, 0.08, sign=-1, guards=(0.28,))
    for y in (-0.5, 0.5):
        P.exhaust(k, xr - 0.06, y, 0.31)
    P.spoiler(v, xr + 0.02, 0.795, 0.84, chord=0.14, h=0.045)
    P.side_lamp(v, xr + 0.12, 0.6, 'tail', 0.1, 0.05)
    P.side_lamp(v, xf - 0.3, 0.52, 'amber', 0.1, 0.04)
    return v


def roadster(name):
    v = build_car(name, dict(
        wb=2.35, fo=0.78, ro=0.9, w=0.82, wheel='wheel_wire', paint=('#c4201c', '#1d1d1f', '#e8e4d8'), int='paint:#c2a878',
        belt=[(0.55, 0.8), (-0.78, 0.8)], tail=0.78, arch=0.395, sq=2.2,
        cab=dict(front=-0.5, top=0.3, dash_d=0.34, narrow=None, x1=-0.76, head=False, seat_h=0.52, steer_y=0.36, seat_w=0.46),
        loft=dict(bands=[(0.3, 0.335, 'chrome')]), seams=[0.5, [(-0.6, None), (-0.6, 0.25)]], handles=[-0.46]))
    k, xf, xr = v.k, v.xf, v.xr
    yy = P.windscreen(v, (0.56, 0.8), (0.27, 1.2), 0.72, 0.65)
    P.wipers(v, (0.56, 0.8), (0.27, 1.2), yy)
    hw = v.wb - 0.065
    k.tube([(0.52, hw, 0.815), (-0.75, hw, 0.815), (-0.75, -hw, 0.815), (0.52, -hw, 0.815)], 0.022, 'trim', 6, closed=True)
    # folded hood under its cover, behind the seats
    k.box((-0.98, 0, 0.83), (0.4, 1.46, 0.12), 'body2', 0.045)
    for s in (1, -1):
        k.box((-0.8, s * 0.6, 0.86), (0.05, 0.05, 0.02), 'chrome', 0.006)
    P.nose(v, z=0.585, h=0.13, gw=0.3, lamps='round2', bars=3, bz=0.43, bh=0.08, guards=(0.2,), amber='inner', lw=0.13)
    P.tail(v, z=0.6, h=0.13, lamp_=(0.56, 0.22), rev=(0.38, 0.08), amber=(0.7, 0.04), bz=0.43, bh=0.08, guards=(0.24,), exh=(-0.45,))
    lids(v, cowl=False)
    zr = lin(v.L.top, -1.7) + 0.05  # luggage rack
    k.tube([(-1.48, 0.42, zr), (-1.92, 0.42, zr), (-1.92, -0.42, zr), (-1.48, -0.42, zr)], 0.012, 'chrome', 5, closed=True)
    for y in (-0.21, 0, 0.21):
        k.tube([(-1.48, y, zr), (-1.92, y, zr)], 0.009, 'chrome', 4)
    for x in (-1.5, -1.9):
        for y in (-0.42, 0.42):
            k.cyl((x, y, zr - 0.06), (x, y, zr), 0.012, 'chrome', 5)
    return v


def hatch_compact(name):
    v = build_car(name, dict(
        wb=2.4, fo=0.78, ro=0.8, w=0.83, wheel='wheel_steel', paint=('#e3b81f', '#2a2a2c', '#2a2a2c'), int='paint:#4c4c50',
        gh=dict(pts=[(0.78, 0.87), (0.32, 1.39), (-1.22, 1.39), (-1.78, 0.9)], wr=0.66, pillars=[(-0.28, -0.28, 0.1)], a=0.055, c=0.13,
                back=(0.05, 0.06)),
        cab=dict(front=-0.34, rear=-0.98, shelf=(-1.78, -1.22, 0.84)), arch=0.395,
        loft=dict(bands=[(0.25, 0.37, 'black'), (0.56, 0.6, 'stripe')]),
        seams=[0.72, [(-0.33, None), (-0.33, 0.25)]], handles=[-0.2], mirror_m='black', mirror_r=False))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.64, h=0.13, gw=0.36, lamps='single', lw=0.2, bars=4, bm='black', strip='chrome', guards=(), amber='inner', bz=0.47, bh=0.13,
           bg='black')
    P.tail(v, z=0.68, h=0.14, lamp_=(0.6, 0.24), rev=(0.42, 0.08), amber=None, bm='black', strip='chrome', guards=(), bh=0.13, exh=(-0.45,))
    lids(v, boot=False)
    # hatch: wiper, handle, hinge blocks
    k.box((xr + 0.02, 0, 0.8), (0.03, 0.2, 0.025), 'black', 0.006)
    P.antenna(k, 0.72, 0.6, 1.36, 0.6)
    return v


def wagon_woody(name):
    v = build_car(name, dict(
        wb=2.95, fo=0.95, ro=1.3, w=0.94, wheel='wheel_steel', paint=('#5d7a52', '#8a5a34', '#d9c08a'), int='paint:#7d5d3d',
        gh=dict(pts=[(1.0, 0.9), (0.4, 1.43), (-2.32, 1.45), (-2.62, 0.92)], wr=0.74, pillars=[(-0.3, -0.3, 0.1), (-1.3, -1.3, 0.1)],
                a=0.055, c=0.11),
        cab=dict(front=-0.36, rear=-1.26, bench=True, shelf=(-2.6, -1.42, 0.62)),
        seams=[0.94, -0.3, [(-1.4, None), (-1.4, 0.8), (-1.13, 0.62), (-1.08, 0.3)]], handles=[-0.12, -1.2]))
    k, xf, xr = v.k, v.xf, v.xr
    P.nose(v, z=0.65, h=0.15, gw=0.4, lamps='quad', bars=6, guards=(0.28,))
    P.tail(v, z=0.66, h=0.2, lamp_=(0.78, 0.13), rev=(0.63, 0.07), amber=None, guards=(0.3,), panel="body")
    lids(v, boot=False)
    # wood panelling framed in light timber, split around the wheel arches
    a = v.S.get('arch', 0.405) + 0.075
    for x0, x1 in ((v.fa - a, v.ra + a), (xf - 0.14, v.fa + a), (v.ra - a, xr + 0.14)):
        P.side_panel(v, x1, x0, 0.37, 0.83, 'wood', 0.008)
        P.side_strip(v, [(x0, 0.39), (x1, 0.39), (x1, 0.81), (x0, 0.81), (x0, 0.39)], 0.045, 'paint:#d2b075', 0.013)
    for x0, x1 in ((v.fa + a - 0.02, v.fa - a + 0.02), (v.ra + a - 0.02, v.ra - a + 0.02)):
        P.side_strip(v, [(x0, 0.81), (x1, 0.81)], 0.045, 'paint:#d2b075', 0.013)
    k.box((xr + 0.022, 0, 0.66), (0.012, 1.08, 0.17), 'wood')
    k.box((xr + 0.02, 0, 0.66), (0.012, 1.14, 0.2), 'paint:#d2b075')
    k.box((xr - 0.004, 0, 0.8), (0.03, 0.16, 0.03), 'chrome', 0.008)
    P.roof_rack(v, -0.3, -2.2, 0.6, 1.455)
    k.box((xr + 0.2, 0, 1.47), (0.06, 1.2, 0.03), 'body', 0.01)
    P.antenna(k, 1.3, -0.8, 0.88)
    return v


ROSTER = [('sedan_80s', sedan_80s), ('sedan_luxury', sedan_luxury), ('coupe_80s', coupe_80s), ('muscle_70s', muscle_70s),
          ('pony_80s', pony_80s), ('sports_70s', sports_70s), ('roadster', roadster), ('hatch_compact', hatch_compact),
          ('wagon_woody', wagon_woody)]

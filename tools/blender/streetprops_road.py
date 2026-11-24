"""Road furniture: signs on galvanised posts, cones, barricades, barriers, covers and grates, guard rail."""
import math
from streetprops_kit import *
from streetprops_furniture import STEEL, DARK, BLACK, CREAM
from streetprops_furniture2 import lerp, wire

GALV, GALV2, ORANGE, YELLOW = '#a3aaae', '#8b9296', '#e8682a', '#e9b92c'
OCT = [(0.293, 0), (0.707, 0), (1, 0.293), (1, 0.707), (0.707, 1), (0.293, 1), (0, 0.707), (0, 0.293)]
DIA = [(0.5, 0), (1, 0.5), (0.5, 1), (0, 0.5)]
TRI = [(0.5, 0), (1, 1), (0, 1)]


def post(a, h, base=True):
    """Galvanised hat-channel sign post, front face at y = -0.012."""
    hat = [(-0.04, 0.013), (-0.04, 0.005), (-0.02, 0.005), (-0.02, -0.012), (0.02, -0.012), (0.02, 0.005), (0.04, 0.005), (0.04, 0.013)]
    a.prism(MT(GALV), hat, 0, h, 'xy')
    for i in range(int(h / 0.3)):
        a.plate(P('#4a4f53'), 0.012, 0.012, (0, -0.0125, 0.2 + i * 0.3), t=0.002)
    if base:
        a.box(P('#8f8a80'), 0.2, 0.2, 0.03, (0, 0, 0.015), 0.012, 'xyT')


def face(a, name, w, h, z, shape=None, y=-0.012, x=0.0, back=GALV2, rz=0.0, bolts=True):
    """Sign blank (4 mm aluminium, same outline as the print) with the atlas face on its -Y side."""
    shape = shape or [(0, 0), (1, 0), (1, 1), (0, 1)]
    with a.at((x, y, z), (0, 0, rz)):
        a.prism(MT(back), [((u - 0.5) * w, (v - 0.5) * h) for u, v in shape], -0.005, -0.001, 'xz')
        a.decal(name, w, h, (0, -0.0085, 0), shape=shape)
        if bolts:
            a.bolts(MT('#c9cdd0'), [(0, -0.008, h * 0.3), (0, -0.008, -h * 0.3)], 0.011, 0.005)


@asset('road')
def signs():
    out = []
    for name, reg, w, h, z, shape, ph in (
            ('sign_stop', 'stop', 0.76, 0.76, 2.3, OCT, 2.6),
            ('sign_yield', 'yield', 0.92, 0.8, 2.25, TRI, 2.6),
            ('sign_one_way', 'one_way', 0.92, 0.307, 2.35, None, 2.56),
            ('sign_speed_25', 'speed', 0.61, 0.813, 2.3, None, 2.75),
            ('sign_pedestrian', 'ped', 1.06, 1.06, 2.35, DIA, 2.8),
            ('sign_no_parking', 'no_parking', 0.31, 0.413, 2.2, None, 2.45),
            ('sign_dead_end', 'dead_end', 1.06, 1.06, 2.35, DIA, 2.8),
            ('sign_curve_chevron', 'chevron', 0.46, 0.613, 1.55, None, 1.9),
            ('sign_route_shield', 'route', 0.62, 0.62, 2.3, None, 2.65)):
        a = Asset(name)
        post(a, ph)
        face(a, reg, w, h, z, shape)
        if name == 'sign_route_shield':
            a.prism(MT(GALV2), [(-0.2, 1.78), (0.2, 1.78), (0.2, 1.95), (-0.2, 1.95)], -0.017, -0.013, 'xz')
            a.plate(P('#f1efe6'), 0.38, 0.15, (0, -0.0185, 1.865), t=0.003)
            a.prism(P(BLACK), [(-0.1, 1.84), (0.02, 1.84), (0.02, 1.81), (0.11, 1.865), (0.02, 1.92), (0.02, 1.89), (-0.1, 1.89)], -0.0235, -0.0205, 'xz')
        out.append(a)
    return out


@asset('road')
def sign_street_names():
    a = Asset('sign_street_names')
    st = MT(GALV)
    a.cz(P('#8f8a80'), 0.1, 0, 0.03, n=10)
    a.cz(st, 0.03, 0.03, 2.75, n=8)
    a.cz(MT(GALV2), 0.04, 2.72, 2.8, n=8, bev=0.006)
    a.box(MT(GALV2), 0.03, 0.03, 0.2, (0, 0, 2.9))
    a.cz(MT(GALV2), 0.02, 3.2, 3.215, n=6)
    for name, z, rz in (('street_a', 2.9, 0), ('street_b', 3.105, 90)):
        with a.at((0, 0, z), (0, 0, rz)):
            a.box(MT(GALV2), 0.94, 0.008, 0.195, (0, 0, 0), 0.02, 'y')
            a.decal(name, 0.92, 0.181, (0, -0.0075, 0))
            a.decal(name, 0.92, 0.181, (0, 0.0075, 0), (0, 0, 180))
            a.box(st, 0.1, 0.03, 0.03, (0, 0, -0.1))
    a.box(MT(GALV2), 0.03, 0.03, 0.03, (0, 0, 3.0))
    return a


@asset('road')
def sign_highway_green():
    a = Asset('sign_highway_green')
    st, dk = MT(GALV), MT(GALV2)
    W, H, zc = 3.3, 1.5125, 3.05
    for s in a.mx():
        x = 1.1
        a.box(P('#8f8a80'), 0.36, 0.36, 0.1, (x, 0.06, 0.05), 0.02, 'xyT')
        # I-beam post
        a.box(st, 0.12, 0.012, zc + H / 2 - 0.1, (x, 0.02, (zc + H / 2 - 0.1) / 2 + 0.1))
        a.box(st, 0.12, 0.012, zc + H / 2 - 0.1, (x, 0.12, (zc + H / 2 - 0.1) / 2 + 0.1))
        a.box(dk, 0.012, 0.09, zc + H / 2 - 0.1, (x, 0.07, (zc + H / 2 - 0.1) / 2 + 0.1))
        a.box(dk, 0.2, 0.2, 0.012, (x, 0.07, 0.106))
        a.bolts(dk, [(x + sx * 0.075, 0.07 + sy * 0.075, 0.112) for sx in (-1, 1) for sy in (-1, 1)], 0.014, 0.012, (0, 0, 1))
    a.box(dk, W, 0.01, H, (0, 0.003, zc), 0.06, 'y')
    a.decal('highway', W - 0.02, H - 0.02, (0, -0.0035, zc), shape=[(0.02, 0), (0.98, 0), (1, 0.04), (1, 0.96), (0.98, 1), (0.02, 1), (0, 0.96), (0, 0.04)])
    for z in (zc - 0.5, zc, zc + 0.5):
        a.box(st, W - 0.1, 0.012, 0.06, (0, 0.012, z))
    return a


@asset('road')
def sign_for_sale():
    a = Asset('sign_for_sale')
    wh, steel = P('#f1efe6'), MT('#6f7579')
    a.box(wh, 0.09, 0.09, 1.6, (-0.48, 0, 0.8), 0.008, 'z')
    a.box(wh, 0.11, 0.11, 0.03, (-0.48, 0, 1.6), 0.012, 'xyB')
    a.box(wh, 1.02, 0.07, 0.07, (-0.02, 0, 1.42), 0.008, 'x')
    a.bar(wh, [(-0.44, 0, 1.12), (-0.18, 0, 1.4)], 0.05, 0.05, up=(0, 1, 0))
    for x in (-0.2, 0.36):
        a.torus(steel, 0.022, 0.005, (x, 0, 1.365), (0, 90, 0), 6, 4)
        a.torus(steel, 0.022, 0.005, (x, 0, 1.33), (90, 0, 0), 6, 4)
    a.box(wh, 0.82, 0.012, 0.56, (0.08, 0, 1.035), 0.01, 'y')
    a.decal('for_sale', 0.8, 0.533, (0.08, -0.0095, 1.035))
    a.decal('for_sale', 0.8, 0.533, (0.08, 0.0095, 1.035), (0, 0, 180))
    a.box(P('#c5262b'), 0.6, 0.01, 0.12, (0.08, 0, 0.68), 0.008, 'y')
    for x in (-0.1, 0.26):
        wire(a, steel, (x, 0, 0.755), (x, 0, 0.74), 0.004)
    return a


@asset('road')
def a_frame_sign():
    a = Asset('a_frame_sign')
    wood, steel = P('#7a5a3c'), MT('#6f7579')
    ang = 14.0
    for sgn in (1, -1):
        with a.at((0, 0, 1.012), (-ang, 0, 0 if sgn > 0 else 180)):
            # panel hangs from the ridge towards -Y
            a.rim(wood, 0.62, 0.98, (0, -0.012, -0.5), 0.045, 0.024)
            a.box(P('#2d3b33'), 0.54, 0.008, 0.9, (0, -0.008, -0.5))
            a.decal('aframe', 0.53, 0.795, (0, -0.0135, -0.47))
            a.box(wood, 0.045, 0.024, 0.1, (-0.2875, -0.012, -0.99))
            a.box(wood, 0.045, 0.024, 0.1, (0.2875, -0.012, -0.99))
    a.box(steel, 0.05, 0.03, 0.008, (-0.2, 0, 1.017))
    a.box(steel, 0.05, 0.03, 0.008, (0.2, 0, 1.017))
    for s in a.mx():
        wire(a, steel, (0.3, -0.13, 0.42), (0.3, 0.13, 0.42), 0.004)
    return a


# ------------------------------------------------------------------ cones and barricades
@asset('road')
def traffic_cone():
    a = Asset('traffic_cone')
    og, wh = P(ORANGE), P('#f1efe6')
    a.box(P('#d85d22'), 0.38, 0.38, 0.03, (0, 0, 0.015), 0.035, 'z')
    r = lambda z: lerp(0.135, 0.028, (z - 0.03) / 0.67)
    zs = [(0.03, og), (0.3, wh), (0.4, og), (0.47, wh), (0.53, og), (0.7, None)]
    for (z0, m), (z1, _) in zip(zs, zs[1:]):
        a.cyl(m, r(z0), (0, 0, z0), (0, 0, z1), 12, r2=r(z1), caps=False)
    a.lathe(og, [(0.028, 0.7), (0.016, 0.7), (0.016, 0.66)], 12, caps=False)
    a.lathe(P('#d85d22'), [(0.15, 0.03), (0.135, 0.045)], 12, caps=False)
    return a


@asset('road')
def traffic_barrel():
    a = Asset('traffic_barrel')
    og, wh, rb = P(ORANGE), P('#f1efe6'), RB('#232325')
    a.lathe(rb, [(0, 0), (0.36, 0), (0.37, 0.02), (0.37, 0.07), (0.33, 0.1), (0, 0.1)], 14)
    steps = [(0.1, 0.3, og), (0.3, 0.45, wh), (0.45, 0.6, og), (0.6, 0.75, wh), (0.75, 0.92, og)]
    for i, (z0, z1, m) in enumerate(steps):
        r0 = 0.3 - i * 0.012
        a.lathe(m, [(r0, z0), (r0 - 0.004, z1 - 0.012), (r0 - 0.014, z1)], 14, caps=False)
    rt = 0.3 - 4 * 0.012 - 0.014
    a.lathe(og, [(rt, 0.92), (rt - 0.03, 0.95), (0, 0.95)], 14)
    a.handle(og, (-0.1, 0, 0.95), (0.1, 0, 0.95), (0, 0, 0.07), 0.016, 6, 0.03)
    return a


def _aleg(a, m, x, spread, h, t=0.04):
    for s in a.mx(1):
        a.bar(m, [(x, spread, 0), (x, 0.012, h)], 0.02, t * 1.6, up=(1, 0, 0))
    a.bar(m, [(x, -spread * 0.6, h * 0.42), (x, spread * 0.6, h * 0.42)], 0.02, 0.03, up=(1, 0, 0))


@asset('road')
def barricades():
    a = Asset('barricade_a')
    st, wh = MT(GALV2), P('#f1efe6')
    for x in (-0.85, 0.85):
        _aleg(a, st, x, 0.33, 1.02)
        a.bolts(MT('#c9cdd0'), [(x, -0.042, 0.93)], 0.014, 0.008)
    a.box(wh, 2.4, 0.03, 0.2, (0, -0.025, 0.92), 0.006, 'x')
    for x in (-0.6, 0.6):
        a.decal('barricade', 1.2, 0.2, (x, -0.0415, 0.92))
        a.decal('barricade', 1.2, 0.2, (x, -0.0085, 0.92), (0, 0, 180))
    a.box(wh, 1.74, 0.02, 0.09, (0, -0.2, 0.36), 0.004, 'x', rot=(18, 0, 0))
    b = Asset('barricade_lights')
    for x in (-0.75, 0.75):
        b.box(st, 0.045, 0.045, 1.5, (x, 0, 0.77), 0.006, 'z')
        b.box(st, 0.06, 1.2, 0.045, (x, 0, 0.0225), 0.008, 'y')
        for s in b.mx(1):
            b.bar(st, [(x, 0.4, 0.04), (x, 0.03, 0.42)], 0.03, 0.03, up=(1, 0, 0))
        # sandbag over each foot
        b.sphere(P('#b79a63'), 0.2, (x, 0.34, 0.08), 8, 4, (0.8, 1.25, 0.42), (0, 0, 8 * x))
        # flasher
        b.box(P(YELLOW), 0.16, 0.07, 0.12, (x, 0, 1.58), 0.012)
        b.cyl(LT('beacon', '#ffb22a'), 0.085, (x, -0.045, 1.72), (x, 0.045, 1.72), 10, bev=0.012)
        b.cyl(P(YELLOW), 0.095, (x, -0.02, 1.72), (x, 0.02, 1.72), 10)
    for z in (0.52, 0.94, 1.36):
        b.box(wh, 2.4, 0.025, 0.2, (0, -0.036, z), 0.006, 'x')
        for x in (-0.6, 0.6):
            b.decal('barricade', 1.2, 0.2, (x, -0.05, z))
        b.bolts(MT('#c9cdd0'), [(x, -0.05, z) for x in (-0.75, 0.75)], 0.014, 0.008)
    return [a, b]


# ------------------------------------------------------------------ concrete, rubber, iron
@asset('road')
def jersey_barrier():
    a = Asset('jersey_barrier')
    con, dk = P('#b5b0a5'), P('#8f8a80')
    L = 3.0
    prof = [(-0.305, 0), (0.305, 0), (0.305, 0.075), (0.18, 0.33), (0.08, 0.81), (-0.08, 0.81), (-0.18, 0.33), (-0.305, 0.075)]
    a.prism(con, prof, -L / 2, L / 2, 'yz', 0.02)
    for x in (-0.9, 0.9):
        a.box(P('#3a3936'), 0.3, 0.63, 0.06, (x, 0, 0.03))               # drain slots
        a.cyl(P('#3a3936'), 0.03, (x, -0.1, 0.62), (x, 0.1, 0.62), 8)      # lifting holes
    for s in a.mx(1):
        a.box(P(YELLOW), 0.1, 0.008, 0.16, (0, 0.118, 0.6), rot=(-11.8, 0, 0))
        a.box(G('#d8231d'), 0.06, 0.006, 0.1, (0, 0.124, 0.6), rot=(-11.8, 0, 0))
    for s in a.mx():
        a.box(MT('#6f7579'), 0.03, 0.05, 0.2, (L / 2 + 0.01, 0, 0.5), 0.006, 'x')
    return a


@asset('road')
def wheel_stop_yellow():
    a = Asset('wheel_stop_yellow')
    ye = P(YELLOW)
    prof = [(-0.08, 0), (0.08, 0), (0.08, 0.05), (0.045, 0.1), (-0.045, 0.1), (-0.08, 0.05)]
    L = 1.8
    a.prism(ye, prof, -L / 2 + 0.06, L / 2 - 0.06, 'yz')
    for s in a.mx():
        a.loft(ye, [[(L / 2 - 0.06, y, z) for y, z in prof], [(L / 2, y * 0.82, z * 0.72) for y, z in prof]], caps=True)
        a.cz(P('#b98f1c'), 0.035, 0.094, 0.101, x=0.6, n=8)
        a.cz(MT('#6f7579'), 0.016, 0.1, 0.106, x=0.6, n=6)
        a.box(P('#2b2e32'), 0.1, 0.165, 0.02, (0.25, 0, 0.01))
    return a


@asset('road')
def speed_bump():
    a = Asset('speed_bump')
    ye, bk = P(YELLOW), RB('#232325')
    prof = [(-0.18, 0), (0.18, 0), (0.13, 0.035), (0.05, 0.055), (-0.05, 0.055), (-0.13, 0.035)]
    n, seg = 6, 0.3
    x0 = -n * seg / 2
    for i in range(n):
        m = ye if i % 2 == 0 else bk
        a.prism(m, prof, x0 + i * seg + 0.003, x0 + (i + 1) * seg - 0.003, 'yz')
        for y in (-0.09, 0.09):
            a.cz(MT('#6f7579'), 0.014, 0.04, 0.048, x=x0 + (i + 0.5) * seg, y=y, n=6)
    for s in a.mx():
        a.loft(bk, [[(n * seg / 2, y, z) for y, z in prof], [(n * seg / 2 + 0.16, y * 0.75, z * 0.1) for y, z in prof]], caps=True)
    return a


@asset('road')
def manhole_cover():
    a = Asset('manhole_cover')
    iron, iron2 = MT('#5b5f62'), MT('#494c4f')
    a.lathe(iron2, [(0, 0), (0.42, 0), (0.42, 0.012), (0.4, 0.02), (0.345, 0.02), (0.345, 0.008), (0, 0.008)], 16)
    a.lathe(iron, [(0, 0.008), (0.338, 0.008), (0.338, 0.022), (0.32, 0.026), (0, 0.026)], 16)
    a.lathe(iron2, [(0.2, 0.026), (0.2, 0.031), (0.23, 0.031), (0.23, 0.026)], 16, caps=False)
    a.lathe(iron2, [(0.07, 0.026), (0.07, 0.031), (0.1, 0.031), (0.1, 0.026)], 16, caps=False)
    for i in range(12):
        ang = math.tau * i / 12
        c, s = math.cos(ang), math.sin(ang)
        a.box(iron2, 0.07, 0.022, 0.005, (0.275 * c, 0.275 * s, 0.0285), rot=(0, 0, math.degrees(ang)))
        if i % 2 == 0:
            a.box(iron2, 0.08, 0.022, 0.005, (0.15 * c, 0.15 * s, 0.0285), rot=(0, 0, math.degrees(ang)))
    for sx in (-1, 1):
        a.box(P('#1c1c1c'), 0.045, 0.02, 0.003, (sx * 0.29, 0, 0.0275), rot=(0, 0, 90))
    return a


@asset('road')
def drain_grate():
    a = Asset('drain_grate')
    iron, iron2, hole = MT('#5b5f62'), MT('#494c4f'), P('#141414')
    W, D = 0.62, 0.42
    a.box(hole, W - 0.04, D - 0.04, 0.006, (0, 0, 0.003))
    a.rim(iron2, W, D, (0, 0, 0.012), 0.04, 0.024, (90, 0, 0))
    n = 9
    for i in range(n):
        x = -W / 2 + 0.04 + (W - 0.08) * (i + 0.5) / n
        a.box(iron, 0.022, D - 0.08, 0.018, (x, 0, 0.013), 0.004, 'y')
    a.box(iron, W - 0.08, 0.02, 0.014, (0, 0, 0.011))
    return a


@asset('road')
def kerb_drain():
    """1.2 m of kerb with a storm inlet: gutter grate in front (towards -Y), throat under the kerb top."""
    a = Asset('kerb_drain')
    con, con2, iron, iron2, hole = P('#b5b0a5'), P('#a39e93'), MT('#5b5f62'), MT('#494c4f'), P('#141414')
    L, h = 1.2, 0.15
    # kerb: two end blocks and a lintel over the throat
    for s in a.mx():
        a.bx(con, 0.42, L / 2, 0, 0.3, 0, h, 0.012, 'xT')
    a.bx(con, -0.42, 0.42, 0, 0.3, h - 0.05, h, 0.012, 'xT')
    a.bx(con2, -0.42, 0.42, 0.14, 0.3, 0, h - 0.05)
    a.bx(hole, -0.42, 0.42, 0.139, 0.141, 0.0, h - 0.05)
    a.bx(iron2, -0.44, 0.44, -0.012, 0.004, h - 0.062, h - 0.045)
    # gutter apron and grate
    a.bx(con2, -L / 2, L / 2, -0.4, 0, 0, 0.012)
    a.box(hole, 0.76, 0.3, 0.004, (0, -0.2, 0.014))
    a.rim(iron2, 0.84, 0.36, (0, -0.2, 0.02), 0.035, 0.016, (90, 0, 0))
    for i in range(10):
        a.box(iron, 0.024, 0.29, 0.014, (-0.385 + 0.77 * (i + 0.5) / 10, -0.2, 0.021), 0.003, 'y')
    return a


@asset('road')
def guard_rail_segment():
    a = Asset('guard_rail_segment')
    st, dk, wood = MT(GALV), MT(GALV2), P('#6b5340')
    L = 4.0
    # W-beam section (y, z): two corrugations, open back
    wsec = [(0.0, -0.155), (-0.012, -0.15), (-0.06, -0.11), (-0.075, -0.075), (-0.06, -0.04), (-0.018, 0.0), (-0.06, 0.04), (-0.075, 0.075),
            (-0.06, 0.11), (-0.012, 0.15), (0.0, 0.155)]
    zc = 0.55
    verts = [(x, y - 0.1, zc + z) for x in (-L / 2, L / 2) for y, z in wsec]
    k = len(wsec)
    faces = [[i, i + 1, k + i + 1, k + i] for i in range(k - 1)]
    a.mesh(st, verts, faces, closed=False)
    a.mesh(dk, [(x, y + 0.004, z) for x, y, z in verts], [f[::-1] for f in faces], closed=False)
    for x in (-1.905, 0, 1.905):
        a.box(wood, 0.15, 0.2, 0.74, (x, 0.07, 0.37), 0.012, 'xyB')
        a.box(wood, 0.15, 0.075, 0.34, (x, -0.0675, zc), 0.006, 'z')
        a.bolts(MT('#c9cdd0'), [(x, -0.118, zc)], 0.02, 0.012)
        a.box(G('#e8e8e2'), 0.06, 0.008, 0.09, (x, -0.12, zc + 0.215))
    for x in (-0.95, 0.95):
        a.bolts(MT('#c9cdd0'), [(x + dx, -0.158, zc + dz) for dx in (-0.05, 0.05) for dz in (-0.075, 0.075)], 0.012, 0.01)
    return a


@asset('road')
def road_reflector_post():
    a = Asset('road_reflector_post')
    wh = P('#f1efe6')
    a.prism(wh, [(-0.05, 0.0), (0.05, 0.0), (0.05, 0.02), (0.0, 0.035), (-0.05, 0.02)], 0, 1.02, 'xy')
    a.prism(wh, [(-0.05, 1.02), (0.05, 1.02), (0.0, 1.1)], 0.0, 0.02, 'xz')
    a.box(P(BLACK), 0.102, 0.004, 0.16, (0, -0.002, 0.86))
    a.box(G('#e8e8e2'), 0.07, 0.006, 0.11, (0, -0.005, 0.86), 0.01, 'y')
    a.box(G('#e3a21a'), 0.07, 0.006, 0.05, (0, 0.036, 0.86))
    a.box(P('#8f8a80'), 0.16, 0.12, 0.012, (0, 0.012, 0.006))
    return a

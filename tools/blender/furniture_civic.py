"""Furniture family: civic assets."""
import math
from furniture_kit import *

G = 'civic'


def _pew_end(b, x, t=0.05, m='wood'):
    """Shaped pew end panel in the YZ plane, centred on x."""
    side = [(-0.3, 0), (0.3, 0), (0.3, 0.86), (0.25, 0.98), (0.17, 1.0), (0.1, 0.9), (-0.02, 0.62), (-0.26, 0.6), (-0.32, 0.52)]
    b.prism(m, side, x - t / 2, x + t / 2, plane='yz', bev=0.008, edges='caps')


def _panelled(b, x, y, z, w, h, n, m='wood', pm='wood_d', face='f', t=0.04):
    """Framed front of n recessed panels on the plane `y` (facing -Y, or +Y when face = 'k')."""
    s = -1 if face == 'f' else 1
    b.box(m, x, y - s * t / 2, z, w, t, h, bev=0.006, edges='z')
    for i in range(n):
        px = x - w / 2 + (i + 0.5) * w / n
        b.box(pm, px, y + s * 0.004, z + 0.1, w / n - 0.1, 0.008, h - 0.2, bev=0.008, edges='F' if face == 'f' else 'K', skip='k' if face == 'f' else 'f')
        b.box(m, px, y + s * 0.01, z + 0.16, w / n - 0.22, 0.008, h - 0.32, bev=0.006, edges='F' if face == 'f' else 'K', skip='k' if face == 'f' else 'f')


@asset('pew', G, length=3.0)
def pew(b):
    W = 3.0
    for sx in (-1, 0, 1):
        _pew_end(b, sx * (W / 2 - 0.025))
    b.box('wood', 0, -0.06, 0.4, W - 0.08, 0.42, 0.04, bev=0.01, edges='x')
    b.soft('paint__velvet:#8c1f2b', 0, -0.07, 0.44, W - 0.12, 0.38, 0.045, r=0.018)
    b.box('wood', 0, 0.16, 0.42, W - 0.08, 0.035, 0.5, rx=-10, bev=0.008, edges='x')
    b.box('wood', 0, 0.245, 0.9, W - 0.08, 0.06, 0.045, bev=0.012)
    b.box('wood_d', 0, 0.22, 0.05, W - 0.08, 0.03, 0.34)
    b.box('wood', 0, 0.3, 0.52, W - 0.1, 0.1, 0.02, bev=0.006)                             # book ledge for the row behind
    b.box('wood', 0, 0.345, 0.54, W - 0.1, 0.012, 0.06)
    for i in range(6):
        x = -1.25 + i * 0.5
        b.box(('red_d', 'navy', 'red_d', 'green_d', 'navy', 'red_d')[i], x, 0.3, 0.54, 0.14, 0.07, 0.03, rz=(-6, 4, 0, 8, -3, 5)[i], bev=0.004)
    b.box('wood_d', 0, 0.3, 0.12, W - 0.1, 0.12, 0.025, rx=15)                            # kneeler
    return {'seat': [[round(-1.2 + i * 0.6, 2), -0.06, 0.5] for i in range(5)]}


@asset('pulpit', G, stand=[0, 0.3, 0.2])
def pulpit(b):
    n = 6
    b.cyl('wood_d', 0, 0.1, 0, 0.62, 0.1, n=n, phase=30)
    b.cyl('wood', 0, 0.1, 0.1, 0.56, 0.1, n=n, phase=30)
    b.lathe('wood', 0, 0, 0.2, [(0.5, 0), (0.5, 0.06), (0.47, 0.08), (0.47, 0.98), (0.52, 1.0), (0.52, 1.06), (0.44, 1.06), (0.44, 0.1)], n=n, phase=150, arc=240, caps=(False, False))
    for i in range(4):
        k = b.mark()
        b.box('wood_d', 0, -0.474, 0.34, 0.22, 0.008, 0.7, bev=0.01, edges='F', skip='k')
        b.box('wood', 0, -0.48, 0.42, 0.12, 0.008, 0.54, bev=0.008, edges='F', skip='k')
        b.rot(k, 'z', (i - 1.5) * 40)
    b.box('gold', 0, -0.5, 0.78, 0.035, 0.012, 0.3)                                       # cross on the front
    b.box('gold', 0, -0.5, 0.96, 0.16, 0.012, 0.035)
    b.box('wood', 0, -0.3, 1.26, 0.56, 0.36, 0.03, rx=-22, bev=0.008)                      # book rest
    b.box('wood', 0, -0.47, 1.2, 0.56, 0.02, 0.04, rx=-22)
    b.box('white', 0, -0.3, 1.292, 0.4, 0.26, 0.03, rx=-22, bev=0.006)
    b.decal('book_open', 0, -0.3, 1.324, 0.38, 0.24, face='t', rx=-22)
    b.tube('brass', [(0.2, -0.1, 1.26), (0.24, -0.16, 1.5), (0.16, -0.26, 1.56)], 0.008, n=4)
    b.cyl('brass', 0.16, -0.26, 1.52, 0.035, 0.05, n=6, r2=0.02)
    for i in range(2):                                                                  # steps at the back
        b.box('wood_d', 0, 0.5 + i * 0.26, 0, 0.6, 0.26, 0.2 - i * 0.1, bev=0.006)


@asset('altar_table', G, surface=0.95)
def altar_table(b):
    W, D, H = 2.0, 0.8, 0.95
    b.box('wood_d', 0, 0, 0, W + 0.1, D + 0.1, 0.08, bev=0.01)
    _panelled(b, 0, -D / 2 + 0.06, 0.08, W - 0.1, H - 0.14, 3, t=0.06)
    for sx in (-1, 1):
        b.box('wood', sx * (W / 2 - 0.08), 0.03, 0.08, 0.06, D - 0.14, H - 0.14, bev=0.006, edges='z')
    b.box('wood', 0, D / 2 - 0.06, 0.08, W - 0.1, 0.04, H - 0.14)
    b.box('gold', 0, -D / 2 + 0.048, 0.3, 0.05, 0.012, 0.4)
    b.box('gold', 0, -D / 2 + 0.048, 0.52, 0.24, 0.012, 0.05)
    b.box('wood', 0, 0, H - 0.06, W + 0.06, D + 0.06, 0.06, bev=0.016)
    b.box('white', 0, 0, H, W - 0.5, D + 0.068, 0.006, skip='b')                           # altar cloth runner
    for sy in (-1, 1):
        b.box('white', 0, sy * (D / 2 + 0.034), H - 0.3, W - 0.5, 0.004, 0.305)
        b.box('gold', 0, sy * (D / 2 + 0.037), H - 0.29, W - 0.5, 0.003, 0.04)
    for sx in (-1, 1):                                                                  # candlesticks
        b.lathe('brass', sx * 0.6, 0.1, H + 0.006, [(0.07, 0), (0.07, 0.015), (0.025, 0.04), (0.02, 0.2), (0.045, 0.22), (0.045, 0.24)], n=8)
        b.cyl('cream', sx * 0.6, 0.1, H + 0.24, 0.016, 0.28, n=6)
        b.lathe('lamp', sx * 0.6, 0.1, H + 0.52, [(0.0, 0), (0.012, 0.015), (0.0, 0.05)], n=5, caps=(False, False))
    b.box('gold', 0, 0.2, H + 0.006, 0.14, 0.1, 0.03, bev=0.008)                           # standing cross
    b.box('gold', 0, 0.2, H + 0.03, 0.035, 0.03, 0.5)
    b.box('gold', 0, 0.2, H + 0.36, 0.26, 0.03, 0.035)
    b.box('red_d', 0, -0.12, H + 0.006, 0.32, 0.24, 0.05, bev=0.008)                       # closed Bible
    b.box('white', 0, -0.12, H + 0.012, 0.325, 0.22, 0.036)
    b.lathe('gold', -0.3, -0.12, H + 0.006, [(0.045, 0), (0.045, 0.01), (0.012, 0.03), (0.012, 0.09), (0.045, 0.13), (0.05, 0.19), (0.045, 0.19)], n=8)      # chalice


@asset('cross_wall', G, mount='wall')
def cross_wall(b):
    z = 1.6
    b.box('wood_d', 0, -0.03, z, 0.14, 0.06, 1.5, bev=0.012)
    b.box('wood_d', 0, -0.035, z + 0.95, 0.9, 0.07, 0.14, bev=0.012)
    b.box('wood', 0, -0.064, z + 0.04, 0.07, 0.008, 1.42, skip='k')
    b.box('wood', 0, -0.072, z + 0.985, 0.82, 0.008, 0.07, skip='k')
    for x, zz in ((0, z + 0.02), (0, z + 1.48), (-0.43, z + 1.02), (0.43, z + 1.02)):
        b.cyl('brass', x, -0.07, zz, 0.018, 0.012, n=6, axis='y', rz=180)


@asset('candle_stand', G)
def candle_stand(b):
    k = b.mark()
    b.tube('iron', [(0.0, 0, 0.3), (0.12, 0, 0.12), (0.26, 0, 0.02)], 0.014, n=5)
    b.cyl('iron', 0.26, 0, 0, 0.03, 0.02, n=6)
    b.radial(k, 3)
    b.lathe('iron', 0, 0, 0.26, [(0.02, 0), (0.035, 0.1), (0.02, 0.14), (0.018, 0.9), (0.04, 0.94), (0.02, 0.98), (0.02, 1.05)], n=8)
    for tier, (r, z, n) in enumerate(((0.32, 0.95, 8), (0.18, 1.12, 5))):
        b.tube('iron', [(r * math.cos(i * math.tau / 12), r * math.sin(i * math.tau / 12), z) for i in range(12)], 0.012, n=4, closed=True)
        for i in range(n):
            a = i * math.tau / n
            x, y = r * math.cos(a), r * math.sin(a)
            if i % 2 == 0:
                b.rod('iron', (0, 0, z - 0.06), (x, y, z), 0.007, n=3)
            b.cyl('brass', x, y, z, 0.03, 0.012, n=6)
            h = 0.1 + 0.05 * ((i * 3 + tier) % 3)
            b.cyl('cream', x, y, z + 0.012, 0.014, h, n=5)
            b.lathe('lamp', x, y, z + 0.012 + h, [(0.0, 0), (0.01, 0.012), (0.0, 0.04)], n=4, caps=(False, False))
    b.cyl('iron', 0, 0, 1.05, 0.018, 0.14, n=6)
    b.cyl('brass', 0, 0, 1.19, 0.035, 0.012, n=6)
    b.cyl('cream', 0, 0, 1.2, 0.018, 0.2, n=5)
    b.lathe('lamp', 0, 0, 1.4, [(0.0, 0), (0.012, 0.014), (0.0, 0.045)], n=4, caps=(False, False))


@asset('church_organ', G)
def church_organ(b):
    """Console with two manuals and a pipe facade behind it; the organist sits on the attached bench at -Y."""
    W, D = 1.7, 0.7
    b.box('wood_dd', 0, 0.1, 0, W + 0.06, D + 0.06, 0.08, bev=0.01)
    b.box('wood_d', 0, 0.1, 0.08, W, D, 1.2, bev=0.008, edges='z')
    for sx in (-1, 1):
        b.prism('wood', [(-0.56, 0.08), (0.2, 0.08), (0.2, 1.3), (-0.2, 1.3), (-0.3, 1.0), (-0.56, 0.92)], sx * (W / 2 - 0.03) - 0.04, sx * (W / 2 - 0.03) + 0.04, plane='yz', bev=0.008, edges='caps')
    b.box('wood', 0, -0.36, 0.72, W - 0.14, 0.4, 0.04, bev=0.008)
    for i in range(2):                                                                  # manuals
        b.box('wood_dd', 0, -0.4 + i * 0.13, 0.76 + i * 0.06, 1.3, 0.16, 0.05)
        b.decal('piano', 0, -0.41 + i * 0.13, 0.811 + i * 0.06, 1.26, 0.13, face='t')
    for sx in (-1, 1):                                                                  # stop jambs
        for i in range(8):
            b.cyl('cream', sx * (0.72 - (i % 2) * 0.05), -0.262, 0.86 + (i // 2) * 0.07, 0.018, 0.02, n=6, axis='y', rz=180)
    b.box('wood', 0, -0.26, 1.0, 0.7, 0.03, 0.3, rx=-12, bev=0.006)                        # music desk
    b.decal('sheet', 0, -0.286, 1.16, 0.46, 0.26, rx=-12)
    b.box('wood_dd', 0, -0.25, 0.1, 1.2, 0.3, 0.03, rx=-8)                                # pedalboard
    for i in range(11):
        b.box('wood_l' if i % 3 else 'black', -0.5 + i * 0.1, -0.3, 0.13, 0.05, 0.34, 0.025, rx=-8)
    # pipe facade
    b.box('wood_d', 0, 0.36, 1.28, W + 0.1, 0.24, 0.1, bev=0.012)
    n = 15
    for i in range(n):
        t = abs(i - (n - 1) / 2) / ((n - 1) / 2)
        h = 1.7 - 0.9 * t + (0.25 if i % 7 == 0 else 0)
        x = -0.77 + i * 0.11
        b.cyl('paint__pipes:#c9b06a', x, 0.36, 1.38, 0.045, h, n=7, caps=(False, True))
        b.box('black', x, 0.313, 1.52, 0.05, 0.006, 0.025, skip='k')
        b.box('paint__pipes:#c9b06a', x, 0.312, 1.5, 0.06, 0.008, 0.02, skip='k')
    for sx in (-1, 1):
        b.box('wood_d', sx * (W / 2 + 0.0), 0.36, 1.38, 0.1, 0.22, 1.1, bev=0.01)
        b.lathe('wood_d', sx * (W / 2), 0.36, 2.48, [(0.07, 0), (0.03, 0.06), (0.05, 0.12), (0, 0.2)], n=6)
    b.box('wood_d', 0, 0.36, 1.9, W, 0.05, 0.06)
    # bench
    b.box('wood', 0, -0.85, 0.56, 1.2, 0.34, 0.04, bev=0.01)
    for sx in (-1, 1):
        b.box('wood', sx * 0.55, -0.85, 0, 0.04, 0.3, 0.56, bev=0.006)
    b.box('wood_d', 0, -0.85, 0.2, 1.06, 0.03, 0.06)
    return {'seat': [[0, -0.85, 0.62]], 'seat_facing': [0, 1, 0]}


@asset('hymn_board', G, mount='wall')
def hymn_board(b):
    z = 1.5
    b.box('wood_d', 0, -0.02, z, 0.5, 0.04, 0.7, bev=0.01)
    b.prism('wood_d', [(-0.25, z + 0.7), (0.25, z + 0.7), (0, z + 0.86)], -0.04, 0, plane='xz', bev=0.008, edges='caps')
    b.decal('hymn', 0, -0.0415, z + 0.36, 0.42, 0.56)
    for i in range(5):
        b.box('wood', 0, -0.045, z + 0.085 + i * 0.112, 0.44, 0.012, 0.012, skip='k')
    b.box('gold', 0, -0.042, z + 0.72, 0.03, 0.006, 0.1, skip='k')
    b.box('gold', 0, -0.042, z + 0.775, 0.08, 0.006, 0.025, skip='k')


@asset('lectern', G, stand=[0, 0.45, 0])
def lectern(b):
    b.box('wood_d', 0, 0, 0, 0.5, 0.44, 0.05, bev=0.012)
    b.box('wood', 0, 0.02, 0.05, 0.14, 0.1, 1.0, bev=0.012, edges='z')
    b.box('wood_d', 0, -0.032, 0.2, 0.08, 0.008, 0.7, skip='k')
    b.box('wood', 0, 0, 1.0, 0.3, 0.2, 0.06, bev=0.012, taper=(1.5, 1.5))
    b.box('wood', 0, -0.02, 1.12, 0.56, 0.42, 0.03, rx=-25, bev=0.008)
    b.box('wood', 0, -0.2, 1.06, 0.56, 0.02, 0.05, rx=-25)
    b.box('red_d', 0, -0.02, 1.152, 0.4, 0.28, 0.03, rx=-25, bev=0.006)
    b.decal('book_open', 0, -0.02, 1.184, 0.38, 0.26, face='t', rx=-25)
    b.box('gold', 0.05, -0.1, 1.15, 0.02, 0.3, 0.003, rx=-25)


@asset('judge_bench', G, surface=1.35, length=2.6, stand=[0, 0.4, 0.4])
def judge_bench(b):
    """Raised bench on a 0.4 m dais; the judge's chair is part of the mesh. Faces the courtroom (-Y)."""
    W = 2.6
    b.box('wood_d', 0, 0.35, 0, W + 0.4, 1.7, 0.2, bev=0.01)
    b.box('wood_d', 0, 0.45, 0.2, W + 0.2, 1.4, 0.2, bev=0.01)
    _panelled(b, 0, -0.2, 0.2, W, 1.1, 5, t=0.06)
    for sx in (-1, 1):
        b.box('wood', sx * (W / 2 - 0.03), 0.07, 0.4, 0.06, 0.5, 0.9, bev=0.006, edges='z')
    b.box('wood', 0, 0.0, 1.3, W + 0.1, 0.62, 0.05, bev=0.014)
    b.box('wood', 0, -0.27, 1.35, W + 0.1, 0.06, 0.1, bev=0.012)                            # modesty rail
    b.lathe('brass', 0, -0.236, 0.85, [(0.2, 0), (0.2, -0.02), (0.16, -0.03), (0, -0.03)], n=12, axis='y', caps=(False, False))   # seal
    b.lathe('gold', 0, -0.262, 0.85, [(0.12, 0), (0.1, -0.012), (0, -0.012)], n=8, axis='y', caps=(False, False))
    # desk top: gavel and block, papers, lamp, water jug, nameplate
    z = 1.35
    b.cyl('wood_dd', 0.35, 0.02, z, 0.06, 0.03, n=8)
    b.cyl('wood_dd', 0.44, -0.02, z + 0.04, 0.03, 0.1, n=6, axis='x')
    b.cyl('wood_l', 0.49, -0.02, z + 0.04, 0.012, 0.22, n=5, axis='y')
    b.box('white', -0.1, 0.02, z, 0.22, 0.3, 0.012, rz=6, skip='b')
    b.box('#c9b892', -0.4, 0.05, z, 0.24, 0.32, 0.02, rz=-8, bev=0.004)
    b.box('black', 0, -0.2, z, 0.3, 0.05, 0.06, rx=-15)
    b.box('brass', 0, -0.228, z + 0.012, 0.24, 0.004, 0.035, rx=-15)
    b.lathe('clear', -0.8, 0.0, z, [(0.05, 0), (0.06, 0.12), (0.035, 0.18), (0.04, 0.22)], n=8, caps=(True, False))
    b.lathe('brass', 0.85, 0.05, z, [(0.07, 0), (0.07, 0.012), (0.015, 0.03), (0.012, 0.28)], n=8)
    b.box('enamel_g', 0.85, -0.03, z + 0.28, 0.26, 0.11, 0.06, bev=0.025, edges='xT')
    b.box('lamp', 0.85, -0.03, z + 0.275, 0.22, 0.07, 0.006, skip='t')
    # high-backed chair
    b.box('wood_dd', 0, 0.62, 0.4, 0.56, 0.5, 0.42, bev=0.01)
    b.soft('leather', 0, 0.6, 0.82, 0.54, 0.5, 0.1, r=0.035)
    b.soft('leather', 0, 0.86, 0.86, 0.56, 0.1, 0.9, r=0.035, rx=-6)
    b.box('wood_dd', 0, 0.94, 0.84, 0.62, 0.05, 1.0, bev=0.012, rx=-6)
    for sx in (-1, 1):
        b.box('wood_dd', sx * 0.3, 0.62, 0.82, 0.06, 0.44, 0.24, bev=0.012)
    # flags behind
    for sx in (-1, 1):
        b.lathe('brass', sx * 1.3, 1.0, 0.4, [(0.12, 0), (0.12, 0.02), (0.03, 0.05), (0.014, 0.1), (0.014, 2.0), (0.03, 2.04), (0, 2.1)], n=8)
        for i, (x1, drop, m) in enumerate(((0.36, 0.9, ('red', 'navy')[sx > 0]), (0.26, 1.02, 'white'), (0.16, 1.1, ('red', 'navy')[sx > 0]))):
            b.prism(m, [(0.012, 2.36), (x1, 2.36 - x1 * 0.5), (x1 * 0.7, 2.36 - drop), (0.012, 2.36 - drop + 0.1)], -0.006 + i * 0.012, 0.006 + i * 0.012, plane='xz', x=sx * 1.3, y=1.0 - 0.02, rz=-20 + i * 16)
    return {'seat': [[0, 0.6, 0.94]]}


def _box_front(b, W, D, H, y, n, gate=None):
    """Low panelled enclosure wall with a capping rail."""
    _panelled(b, 0, y, 0, W, H, n)
    b.box('wood', 0, y + 0.02, H, W + 0.06, 0.1, 0.045, bev=0.012)


@asset('witness_stand', G, stand=[0, 0.1, 0.2])
def witness_stand(b):
    W, D, H = 1.1, 1.1, 1.05
    b.box('wood_d', 0, 0.05, 0, W, D, 0.2, bev=0.01)
    _panelled(b, 0, -D / 2 + 0.09, 0.2, W - 0.04, H - 0.2, 2)
    for sx in (-1, 1):
        k = b.mark()
        _panelled(b, 0, 0, 0.2, D * 0.62, H - 0.2, 1)
        b.rot(k, 'z', sx * 90); b.move(k, sx * (W / 2 - 0.02), -D / 2 + 0.07 + D * 0.31, 0)
        b.box('wood', sx * (W / 2 - 0.04), -D / 2 + 0.07 + D * 0.31, H, 0.1, D * 0.62 + 0.04, 0.045, bev=0.012)
    b.box('wood', 0, -D / 2 + 0.07, H, W + 0.04, 0.16, 0.045, bev=0.012)
    b.tube('black', [(0.2, -D / 2 + 0.07, H + 0.04), (0.2, -D / 2 + 0.1, H + 0.2), (0.2, -D / 2 + 0.2, H + 0.26)], 0.008, n=4)   # microphone
    b.cyl('char', 0.2, -D / 2 + 0.18, H + 0.24, 0.022, 0.07, n=6, axis='y')
    b.box('red_d', -0.25, -D / 2 + 0.07, H + 0.045, 0.16, 0.12, 0.035, bev=0.006)           # Bible
    k = b.mark()
    chair_frame(b, 'wood_d', w=0.46, d=0.44, sh=0.46, bh=0.95, seat='leather')
    b.move(k, 0, 0.18, 0.2)
    return {'seat': [[0, 0.16, 0.7]]}


@asset('jury_box_bench', G, length=3.0)
def jury_box_bench(b):
    """Two-tier jury box for 12 (rear row raised 0.25 m) behind a panelled front."""
    W = 3.0
    seats = []
    b.box('wood_d', 0, 0.3, 0, W, 1.9, 0.1, bev=0.008)
    b.box('wood_d', 0, 0.8, 0.1, W, 0.9, 0.25, bev=0.008)
    _box_front(b, W, 0, 1.0, -0.6, 5)
    for sx in (-1, 1):
        k = b.mark()
        _panelled(b, 0, 0, 0.1, 1.8, 0.9, 2)
        b.rot(k, 'z', sx * 90); b.move(k, sx * (W / 2 - 0.02), 0.32, 0)
    for row in range(2):
        y, z0 = -0.1 + row * 0.9, 0.1 + row * 0.25
        for i in range(6):
            x = -1.2 + i * 0.48
            b.box('wood_d', x, y + 0.02, z0, 0.4, 0.4, 0.36, bev=0.008, edges='z')
            b.box('paint__juryseat:#3f6b52', x, y, z0 + 0.36, 0.42, 0.44, 0.09, bev=0.03, edges='T', skip='b')
            b.box('paint__juryseat:#3f6b52', x, y + 0.23, z0 + 0.42, 0.42, 0.09, 0.5, bev=0.03, rx=-8)
            b.box('wood', x - 0.24, y + 0.02, z0 + 0.36, 0.05, 0.4, 0.22, bev=0.01)
            seats.append([round(x, 2), round(y, 2), round(z0 + 0.48, 2)])
        b.box('wood', -1.2 + 5 * 0.48 + 0.24, y + 0.02, z0 + 0.36, 0.05, 0.4, 0.22, bev=0.01)
    return {'seat': seats}


@asset('courtroom_rail', G, length=2.0)
def courtroom_rail(b):
    W, H = 2.0, 0.95
    b.box('wood', 0, 0, 0, W, 0.1, 0.1, bev=0.01)
    b.box('wood', 0, 0, H - 0.06, W, 0.12, 0.06, bev=0.016)
    b.box('wood_d', 0, 0, H - 0.1, W, 0.06, 0.04)
    for sx in (-1, 1):
        b.box('wood', sx * (W / 2 - 0.05), 0, 0, 0.1, 0.1, H + 0.04, bev=0.01)
        b.box('wood', sx * (W / 2 - 0.05), 0, H + 0.04, 0.13, 0.13, 0.03, bev=0.01)
    for i in range(13):
        b.lathe('wood', -0.78 + i * 0.13, 0, 0.1, [(0.024, 0), (0.03, 0.08), (0.016, 0.2), (0.03, 0.42), (0.03, 0.5), (0.016, 0.62), (0.024, 0.75)], n=6, caps=(False, False))


@asset('public_bench', G, length=2.0)
def public_bench(b):
    W = 2.0
    for sx in (-1, 0, 1):
        _pew_end(b, sx * (W / 2 - 0.025), m='wood_d')
    b.box('wood', 0, -0.06, 0.4, W - 0.08, 0.42, 0.04, bev=0.01, edges='x')
    for i in range(7):
        b.box('wood', 0, 0.12 + i * 0.012, 0.47 + i * 0.065, W - 0.08, 0.025, 0.05, rx=-10)
    b.box('wood', 0, 0.245, 0.9, W - 0.08, 0.06, 0.045, bev=0.012)
    b.box('wood_d', 0, 0.2, 0.08, W - 0.08, 0.03, 0.3)
    return {'seat': [[-0.6, -0.06, 0.48], [0, -0.06, 0.48], [0.6, -0.06, 0.48]]}

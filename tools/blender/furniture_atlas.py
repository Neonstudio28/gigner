"""Original 1024 px atlas for the furniture family, painted with numpy (pictures, posters, screens, labels)."""
import bpy, math, os, random, tempfile
import numpy as np
import lib

SIZE = 1024
REG = {}        # name -> (x, y, w, h) in pixels from the top-left
_painters = []  # (name, w, h, fn)
_state = {}

FONT = {c: [int(v, 16) for v in rows.split()] for c, rows in {
    'A': '0E 11 11 1F 11 11 11', 'B': '1E 11 11 1E 11 11 1E', 'C': '0E 11 10 10 10 11 0E', 'D': '1E 11 11 11 11 11 1E',
    'E': '1F 10 10 1E 10 10 1F', 'F': '1F 10 10 1E 10 10 10', 'G': '0E 11 10 17 11 11 0F', 'H': '11 11 11 1F 11 11 11',
    'I': '0E 04 04 04 04 04 0E', 'J': '07 02 02 02 02 12 0C', 'K': '11 12 14 18 14 12 11', 'L': '10 10 10 10 10 10 1F',
    'M': '11 1B 15 15 11 11 11', 'N': '11 19 15 13 11 11 11', 'O': '0E 11 11 11 11 11 0E', 'P': '1E 11 11 1E 10 10 10',
    'Q': '0E 11 11 11 15 12 0D', 'R': '1E 11 11 1E 14 12 11', 'S': '0F 10 10 0E 01 01 1E', 'T': '1F 04 04 04 04 04 04',
    'U': '11 11 11 11 11 11 0E', 'V': '11 11 11 11 11 0A 04', 'W': '11 11 11 15 15 1B 11', 'X': '11 11 0A 04 0A 11 11',
    'Y': '11 11 0A 04 04 04 04', 'Z': '1F 01 02 04 08 10 1F', '0': '0E 11 13 15 19 11 0E', '1': '04 0C 04 04 04 04 0E',
    '2': '0E 11 01 02 04 08 1F', '3': '1F 02 04 02 01 11 0E', '4': '02 06 0A 12 1F 02 02', '5': '1F 10 1E 01 01 11 0E',
    '6': '06 08 10 1E 11 11 0E', '7': '1F 01 02 04 08 08 08', '8': '0E 11 11 0E 11 11 0E', '9': '0E 11 11 0F 01 02 0C',
    '.': '00 00 00 00 00 0C 0C', '-': '00 00 00 1F 00 00 00', '$': '04 0F 14 0E 05 1E 04', ':': '00 0C 0C 00 0C 0C 00',
    '!': '04 04 04 04 04 00 04', ' ': '00 00 00 00 00 00 00'}.items()}


def rgb(c):
    c = int(c.lstrip('#'), 16)
    return (c >> 16 & 255, c >> 8 & 255, c & 255)


def region(name, w, h):
    def deco(fn):
        _painters.append((name, w, h, fn))
        return fn
    return deco


# ---- drawing helpers on a numpy view `a` (h, w, 3); coordinates are x right, y down
def fill(a, c):
    a[:, :] = rgb(c)


def rect(a, x, y, w, h, c):
    x, y = int(round(x)), int(round(y))
    a[max(y, 0):max(y + int(round(h)), 0), max(x, 0):max(x + int(round(w)), 0)] = rgb(c)


def border(a, t, c):
    h, w = a.shape[:2]
    for r in ((0, 0, w, t), (0, h - t, w, t), (0, 0, t, h), (w - t, 0, t, h)):
        rect(a, *r, c)


def _grid(a):
    h, w = a.shape[:2]
    return np.mgrid[0:h, 0:w]


def disc(a, cx, cy, r, c, r_in=0.0, sy=1.0):
    yy, xx = _grid(a)
    d = (xx - cx) ** 2 + ((yy - cy) / sy) ** 2
    a[(d <= r * r) & (d >= r_in * r_in)] = rgb(c)


def line(a, x0, y0, x1, y1, t, c):
    yy, xx = _grid(a)
    dx, dy = x1 - x0, y1 - y0
    L = max(dx * dx + dy * dy, 1e-9)
    k = np.clip(((xx - x0) * dx + (yy - y0) * dy) / L, 0, 1)
    d = (xx - x0 - k * dx) ** 2 + (yy - y0 - k * dy) ** 2
    a[d <= (t / 2) ** 2] = rgb(c)


def poly(a, pts, c):
    yy, xx = _grid(a)
    inside = np.zeros(a.shape[:2], bool)
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        if y0 == y1:
            continue
        cond = ((y0 <= yy) & (yy < y1)) | ((y1 <= yy) & (yy < y0))
        xi = x0 + (yy - y0) * (x1 - x0) / (y1 - y0)
        inside ^= cond & (xx < xi)
    a[inside] = rgb(c)


def text(a, x, y, s, c, sc=1, sp=1):
    col = rgb(c)
    for ch in s:
        g = FONT.get(ch, FONT[' '])
        for r in range(7):
            for b in range(5):
                if g[r] >> (4 - b) & 1:
                    a[y + r * sc:y + (r + 1) * sc, x + b * sc:x + (b + 1) * sc] = col
        x += (5 + sp) * sc
    return x


def tw(s, sc=1, sp=1):
    return len(s) * (5 + sp) * sc - sp * sc


def ctext(a, y, s, c, sc=1, x0=0, x1=None):
    x1 = a.shape[1] if x1 is None else x1
    text(a, int(x0 + (x1 - x0 - tw(s, sc)) / 2), y, s, c, sc)


def scribble(a, x, y, w, n, dy, c, rng, th=2, lo=0.5):
    """Rows of dashes that read as small print."""
    for i in range(n):
        xx, end = x, x + w * rng.uniform(lo, 1.0)
        while xx < end - 3:
            L = min(rng.randint(3, 12), end - xx)
            rect(a, xx, y + i * dy, L, th, c)
            xx += L + 2


def sector_mask(a, cx, cy, a0, a1):
    yy, xx = _grid(a)
    ang = (np.degrees(np.arctan2(-(yy - cy), xx - cx)) - a0) % 360
    return ang < (a1 - a0)


# ---- regions
@region('pic_lake', 208, 152)
def _pic_lake(a, rng):
    fill(a, '#8fc3e6'); disc(a, 150, 40, 16, '#f7e7a0')
    poly(a, [(0, 90), (50, 48), (95, 80), (140, 55), (208, 92), (208, 152), (0, 152)], '#5d8a6a')
    poly(a, [(0, 100), (70, 70), (130, 100), (208, 78), (208, 152), (0, 152)], '#3f6b4f')
    rect(a, 0, 102, 208, 50, '#4f86b8')
    for i in range(6):
        rect(a, 20 + i * 30, 112 + (i % 3) * 10, 22, 2, '#9cc6e6')
    poly(a, [(0, 152), (0, 132), (60, 140), (120, 152)], '#c9b37a')
    poly(a, [(28, 132), (36, 98), (44, 132)], '#2f5a3a'); rect(a, 34, 130, 4, 8, '#5b3a25')


@region('pic_boat', 152, 208)
def _pic_boat(a, rng):
    fill(a, '#f0d9a8'); rect(a, 0, 120, 152, 88, '#3f7ea6'); disc(a, 112, 44, 18, '#e9824a')
    for i in range(7):
        rect(a, 8 + (i * 37) % 120, 132 + i * 10, 26, 3, '#7fb3d0')
    poly(a, [(40, 128), (112, 128), (100, 146), (52, 146)], '#7a3f2a'); rect(a, 74, 40, 4, 90, '#3d2819')
    poly(a, [(80, 44), (80, 120), (122, 120)], '#f6f1e4'); poly(a, [(72, 60), (72, 120), (42, 120)], '#d9534a')


@region('pic_vase', 152, 208)
def _pic_vase(a, rng):
    fill(a, '#6f8f8a'); rect(a, 0, 150, 152, 58, '#7a5234'); rect(a, 0, 150, 152, 5, '#5b3a25')
    poly(a, [(60, 100), (92, 100), (100, 130), (94, 160), (58, 160), (52, 130)], '#e9e2d0')
    rect(a, 60, 118, 32, 6, '#3b62a8')
    for x, y, c in ((50, 60, '#d9534a'), (76, 42, '#e9c04a'), (102, 62, '#d98fa0'), (64, 78, '#f1ede0'), (92, 84, '#d9534a')):
        line(a, 76, 102, x, y, 3, '#2d6a39'); disc(a, x, y, 13, c); disc(a, x, y, 5, '#7a3f2a')


@region('pic_peaks', 208, 152)
def _pic_peaks(a, rng):
    fill(a, '#f0b27a'); rect(a, 0, 0, 208, 40, '#e98e6a')
    poly(a, [(0, 110), (60, 30), (110, 100), (150, 50), (208, 112), (208, 152), (0, 152)], '#6e6a8a')
    poly(a, [(60, 30), (46, 50), (60, 46), (72, 54)], '#f6f1e4'); poly(a, [(150, 50), (138, 66), (150, 62), (162, 68)], '#f6f1e4')
    rect(a, 0, 112, 208, 40, '#3f5a48')
    for i in range(9):
        x = 10 + i * 23
        poly(a, [(x, 126), (x + 9, 92 + (i % 3) * 6), (x + 18, 126)], '#27412f')


@region('clock', 160, 160)
def _clock(a, rng):
    fill(a, '#efe9d6'); disc(a, 80, 80, 78, '#3d2819', 72)
    for i in range(12):
        ang = math.radians(i * 30)
        r0 = 56 if i % 3 == 0 else 62
        line(a, 80 + r0 * math.sin(ang), 80 - r0 * math.cos(ang), 80 + 68 * math.sin(ang), 80 - 68 * math.cos(ang), 5 if i % 3 == 0 else 3, '#1d1d20')
    line(a, 80, 80, 80 + 34 * math.sin(1.0), 80 - 34 * math.cos(1.0), 6, '#1d1d20')
    line(a, 80, 80, 80 + 54 * math.sin(4.4), 80 - 54 * math.cos(4.4), 4, '#1d1d20')
    disc(a, 80, 80, 6, '#b8332b')


@region('dart', 160, 160)
def _dart(a, rng):
    fill(a, '#1d1d20')
    for i in range(20):
        m = sector_mask(a, 80, 80, i * 18 - 9, i * 18 + 9)
        yy, xx = _grid(a)
        d = np.hypot(xx - 80, yy - 80)
        a[m & (d < 64)] = rgb('#e9dfc0' if i % 2 else '#1d1d20')
        ring = m & (((d > 58) & (d < 64)) | ((d > 34) & (d < 39)))
        a[ring] = rgb('#b8332b' if i % 2 else '#3f7d4b')
    disc(a, 80, 80, 9, '#3f7d4b'); disc(a, 80, 80, 4, '#b8332b'); disc(a, 80, 80, 79, '#8a8d90', 76)


@region('flag', 224, 136)
def _flag(a, rng):
    for i in range(13):
        rect(a, 0, i * 136 / 13, 224, 136 / 13 + 1, '#b8332b' if i % 2 == 0 else '#f1ede0')
    rect(a, 0, 0, 96, 74, '#27406e')
    for r in range(5):
        for c in range(6):
            disc(a, 10 + c * 15 + (r % 2) * 4, 9 + r * 14, 3, '#f1ede0')


def _wanted(hair, skin, shirt, amount):
    def paint(a, rng):
        fill(a, '#e6d9b4'); border(a, 3, '#5b3a25'); rect(a, 8, 8, 88, 22, '#7c221f'); ctext(a, 12, 'WANTED', '#f1ede0', 2)
        rect(a, 20, 36, 64, 62, '#b9ad94')
        poly(a, [(24, 98), (34, 80), (70, 80), (80, 98)], shirt); disc(a, 52, 62, 15, skin); disc(a, 52, 54, 16, hair, 0, 0.7)
        rect(a, 44, 60, 5, 3, '#1d1d20'); rect(a, 56, 60, 5, 3, '#1d1d20')
        scribble(a, 14, 104, 76, 3, 6, '#5b4a3a', rng); ctext(a, 126, amount, '#7c221f', 2)
    return paint


region('wanted1', 104, 148)(_wanted('#3d2819', '#d9a882', '#3b62a8', '$500'))
region('wanted2', 104, 148)(_wanted('#1d1d20', '#b98a62', '#4a4d52', '$250'))
region('wanted3', 104, 148)(_wanted('#b06a3c', '#e3b89a', '#3f7d4b', '$900'))


def _note(paper, head, kind):
    def paint(a, rng):
        fill(a, paper); border(a, 1, '#9a8f7a')
        if head:
            rect(a, 6, 6, 76, 14, head)
        if kind == 'list':
            for i in range(7):
                rect(a, 8, 28 + i * 11, 6, 6, '#4a4d52'); scribble(a, 18, 30 + i * 11, 60, 1, 1, '#4a4d52', rng)
        elif kind == 'pic':
            rect(a, 10, 26, 68, 40, '#7fa7d6'); poly(a, [(10, 66), (34, 40), (52, 58), (62, 48), (78, 66)], '#3f7d4b')
            scribble(a, 8, 74, 72, 4, 8, '#4a4d52', rng)
        else:
            scribble(a, 8, 28 if head else 10, 72, 10 if head else 12, 8, '#4a4d52', rng)
        disc(a, 44, 4, 3, '#b8332b')
    return paint


region('note1', 88, 112)(_note('#f1ede0', '#27406e', 'text'))
region('note2', 88, 112)(_note('#e9d98a', None, 'text'))
region('note3', 88, 112)(_note('#f1ede0', '#b8332b', 'list'))
region('note4', 88, 112)(_note('#cfe3d0', '#254d33', 'pic'))


@region('menu', 384, 152)
def _menu(a, rng):
    fill(a, '#1f2a24'); border(a, 4, '#c69a63'); ctext(a, 10, 'MENU', '#f3d77a', 3)
    items = [('BURGER', '1.75'), ('CHEESE MELT', '1.95'), ('HOT DOG', '1.10'), ('FRIES', '.80'), ('CHILI BOWL', '1.40'),
             ('PIE SLICE', '1.10'), ('DONUT', '.35'), ('COFFEE', '.50'), ('MILKSHAKE', '1.25'), ('SODA', '.60')]
    for i, (nm, pr) in enumerate(items):
        cx, cy = 14 + (i // 5) * 186, 44 + (i % 5) * 20
        text(a, cx, cy, nm, '#f1ede0', 2); text(a, cx + 172 - tw(pr, 2) - 4, cy, pr, '#f3d77a', 2)
    rect(a, 190, 40, 2, 100, '#c69a63')


@region('scr_tv', 120, 92)
def _scr_tv(a, rng):
    for i, c in enumerate(('#d9d9d9', '#d9d24a', '#4ad2d2', '#4ad24a', '#d24ad2', '#d24a4a', '#4a4ad2')):
        rect(a, i * 120 / 7, 0, 120 / 7 + 1, 62, c)
    for i, c in enumerate(('#27406e', '#f1ede0', '#4a2a6e', '#1d1d20', '#3a3a3a', '#1d1d20')):
        rect(a, i * 20, 62, 20, 30, c)


@region('scr_show', 120, 92)
def _scr_show(a, rng):
    fill(a, '#7fa7d6'); rect(a, 0, 56, 120, 36, '#3f7d4b'); disc(a, 92, 20, 9, '#f3e7a0')
    rect(a, 20, 30, 34, 30, '#e4d6b0'); poly(a, [(16, 32), (37, 14), (58, 32)], '#b8332b'); rect(a, 32, 44, 9, 16, '#5b3a25')
    rect(a, 0, 78, 120, 14, '#1d1d20'); scribble(a, 6, 83, 108, 1, 1, '#f1ede0', rng, 3, 0.9)


@region('scr_pc', 120, 92)
def _scr_pc(a, rng):
    fill(a, '#0c1a12'); scribble(a, 6, 8, 100, 9, 8, '#4ade80', rng, 3, 0.25); rect(a, 6, 82, 8, 5, '#4ade80')


@region('scr_arc1', 120, 92)
def _scr_arc1(a, rng):
    fill(a, '#07071a')
    for i in range(40):
        rect(a, rng.randint(0, 118), rng.randint(0, 90), 1, 1, '#f1ede0')
    for r in range(3):
        for c in range(7):
            col = ('#4ad24a', '#d24ad2', '#4ad2d2')[r]
            rect(a, 14 + c * 14, 16 + r * 12, 8, 5, col); rect(a, 12 + c * 14, 19 + r * 12, 12, 3, col)
    poly(a, [(52, 84), (60, 70), (68, 84)], '#f3d77a'); rect(a, 59, 46, 2, 14, '#ff5a4a'); text(a, 4, 3, '004200', '#f1ede0', 1)


@region('scr_arc2', 120, 92)
def _scr_arc2(a, rng):
    fill(a, '#05050f')
    for x, y, w, h in ((6, 6, 108, 3), (6, 83, 108, 3), (6, 6, 3, 80), (111, 6, 3, 80), (22, 22, 30, 3), (68, 22, 30, 3), (22, 22, 3, 22),
                       (95, 22, 3, 22), (40, 40, 40, 3), (40, 40, 3, 16), (77, 40, 3, 16), (22, 66, 76, 3), (58, 54, 3, 14)):
        rect(a, x, y, w, h, '#3b62d8')
    for i in range(12):
        rect(a, 14 + i * 8, 14, 2, 2, '#f3d7a0'); rect(a, 14 + i * 8, 75, 2, 2, '#f3d7a0')
    disc(a, 60, 32, 6, '#f3d73a'); poly(a, [(60, 32), (68, 27), (68, 37)], '#05050f')
    for x, c in ((30, '#ff5a4a'), (90, '#4ad2d2')):
        disc(a, x, 54, 5, c); rect(a, x - 5, 54, 11, 6, c)


@region('scr_atm', 120, 92)
def _scr_atm(a, rng):
    fill(a, '#1b3a6e'); ctext(a, 8, 'WELCOME', '#f1ede0', 2); ctext(a, 30, 'INSERT CARD', '#9fd0ff', 1)
    for i in range(3):
        rect(a, 10, 46 + i * 14, 44, 9, '#3f6fb8'); rect(a, 66, 46 + i * 14, 44, 9, '#3f6fb8')


@region('marq1', 208, 52)
def _marq1(a, rng):
    fill(a, '#141433'); border(a, 3, '#f3d73a')
    for i in range(30):
        rect(a, rng.randint(4, 202), rng.randint(4, 46), 2, 2, '#f1ede0')
    ctext(a, 12, 'STAR RAID', '#ff5a4a', 3); rect(a, 30, 38, 148, 3, '#4ad2d2')


@region('marq2', 208, 52)
def _marq2(a, rng):
    fill(a, '#f3b83a'); border(a, 3, '#27406e'); ctext(a, 12, 'MAZE MUNCH', '#27406e', 3)
    for i in range(9):
        disc(a, 24 + i * 20, 42, 3, '#b8332b')


def _mag(bg, bar, pic, title):
    def paint(a, rng):
        fill(a, bg); rect(a, 0, 0, 60, 16, bar); ctext(a, 4, title, '#f6f1e4', 1)
        rect(a, 8, 22, 44, 36, pic); disc(a, 30, 38, 10, bar); scribble(a, 6, 64, 48, 2, 6, '#1d1d20', rng)
    return paint


for i, (bg, bar, pic, t) in enumerate((('#f1ede0', '#b8332b', '#7fa7d6', 'LAKE LIFE'), ('#e3b83a', '#27406e', '#f1ede0', 'MOTOR'),
                                        ('#7fb069', '#254d33', '#e9d98a', 'ANGLER'), ('#d98fa0', '#6e4a94', '#f1ede0', 'STYLE'),
                                        ('#3b62a8', '#1f2c4a', '#e3b83a', 'TV WEEK'), ('#f1ede0', '#1d1d20', '#dd7a2c', 'NEWS'),
                                        ('#dd7a2c', '#7c221f', '#f1ede0', 'HOME'), ('#a9d3c3', '#3f8f8c', '#f1ede0', 'TRAVEL'))):
    region(f'mag{i + 1}', 60, 80)(_mag(bg, bar, pic, t))


def _prod(bg, band, mark, kind):
    def paint(a, rng):
        fill(a, bg); rect(a, 0, 8, 60, 18, band)
        if kind == 0:
            disc(a, 30, 50, 16, mark, 0, 0.8); disc(a, 30, 50, 9, bg, 0, 0.8)
        elif kind == 1:
            poly(a, [(30, 30), (48, 50), (30, 70), (12, 50)], mark)
        elif kind == 2:
            for j in range(4):
                rect(a, 8, 34 + j * 9, 44, 5, mark)
        else:
            disc(a, 22, 46, 9, mark); disc(a, 38, 46, 9, mark); disc(a, 30, 60, 9, mark)
        rect(a, 10, 12, 40, 3, '#f6f1e4'); rect(a, 16, 18, 28, 3, '#f6f1e4')
    return paint


for i, (bg, band, mk) in enumerate((('#e3b83a', '#b8332b', '#f1ede0'), ('#3b62a8', '#f1ede0', '#e3b83a'), ('#b8332b', '#f1ede0', '#e3b83a'),
                                     ('#3f7d4b', '#e3b83a', '#f1ede0'), ('#f1ede0', '#3b62a8', '#b8332b'), ('#dd7a2c', '#5b3a25', '#f1ede0'),
                                     ('#6e4a94', '#e3b83a', '#f1ede0'), ('#a9d3c3', '#254d33', '#b8332b'))):
    region(f'prod{i + 1}', 60, 80)(_prod(bg, band, mk, i % 4))


@region('exit', 120, 52)
def _exit(a, rng):
    fill(a, '#f6f1e4'); border(a, 3, '#b8332b'); ctext(a, 12, 'EXIT', '#c9281e', 4)


@region('keyboard', 200, 68)
def _keyboard(a, rng):
    fill(a, '#b9b29c')
    for r in range(4):
        for c in range(14):
            rect(a, 6 + c * 13.5 + r * 2, 6 + r * 12, 11, 10, '#e9e4d2' if 0 < c < 13 else '#8a8576')
    rect(a, 48, 54, 100, 10, '#e9e4d2'); rect(a, 8, 54, 34, 10, '#8a8576'); rect(a, 154, 54, 38, 10, '#8a8576')


@region('keypad', 60, 76)
def _keypad(a, rng):
    fill(a, '#3a3d42')
    for i, ch in enumerate('123456789-0.'):
        x, y = 5 + (i % 3) * 18, 4 + (i // 3) * 18
        rect(a, x, y, 14, 14, '#d9d5c8'); text(a, x + 5, y + 4, ch, '#1d1d20', 1)


@region('piano', 252, 36)
def _piano(a, rng):
    fill(a, '#f6f1e4')
    for i in range(21):
        rect(a, i * 12, 0, 1, 36, '#4a4d52')
        if i % 7 not in (2, 6):
            rect(a, i * 12 + 8, 0, 8, 22, '#1d1d20')


@region('calendar', 88, 112)
def _calendar(a, rng):
    fill(a, '#f6f1e4'); rect(a, 0, 0, 88, 50, '#7fa7d6'); poly(a, [(0, 50), (30, 18), (52, 40), (66, 28), (88, 50)], '#3f6b4f')
    rect(a, 0, 50, 88, 12, '#b8332b'); ctext(a, 53, 'JULY', '#f6f1e4', 1)
    for r in range(5):
        for c in range(7):
            rect(a, 6 + c * 11, 67 + r * 8.5, 8, 5, '#b8332b' if c == 0 else '#4a4d52')


@region('map', 200, 136)
def _map(a, rng):
    fill(a, '#e4d6b0'); border(a, 3, '#5b3a25')
    poly(a, [(110, 8), (192, 8), (192, 70), (160, 90), (128, 76), (104, 40)], '#7fa7d6')
    poly(a, [(8, 90), (60, 70), (90, 100), (70, 128), (8, 128)], '#a8c48a')
    for x0, y0, x1, y1 in ((8, 60, 192, 100), (60, 8, 80, 128), (8, 30, 104, 44), (120, 96, 150, 128)):
        line(a, x0, y0, x1, y1, 4, '#f6f1e4'); line(a, x0, y0, x1, y1, 1, '#b06a3c')
    for i in range(10):
        rect(a, 14 + (i % 5) * 9, 48 + (i // 5) * 7, 6, 4, '#a98f68')
    disc(a, 82, 76, 5, '#b8332b'); ctext(a, 118, 'PINE HOLLOW', '#5b3a25', 1, 90, 196)


@region('hymn', 84, 112)
def _hymn(a, rng):
    fill(a, '#2a1c14')
    for i, n in enumerate(('127', '48', '305', '216')):
        rect(a, 8, 8 + i * 26, 68, 20, '#f6f1e4'); ctext(a, 11 + i * 26, n, '#1d1d20', 2)


@region('juke', 120, 68)
def _juke(a, rng):
    fill(a, '#3d2819')
    for r in range(6):
        for c in range(2):
            rect(a, 4 + c * 58, 4 + r * 10.5, 54, 8, '#f6f1e4' if (r + c) % 2 else '#f3c9d0')
            rect(a, 4 + c * 58, 4 + r * 10.5, 8, 8, '#b8332b'); scribble(a, 16 + c * 58, 7 + r * 10.5, 38, 1, 1, '#1d1d20', rng)


@region('vend', 112, 168)
def _vend(a, rng):
    fill(a, '#1d2a3a')
    cols = ('#b8332b', '#e3b83a', '#3f7d4b', '#3b62a8', '#dd7a2c', '#6e4a94', '#f1ede0', '#d98fa0')
    for r in range(5):
        rect(a, 4, 28 + r * 32, 104, 3, '#8a8d90')
        for c in range(5):
            col = cols[(r * 3 + c * 5) % 8]
            rect(a, 8 + c * 20, 6 + r * 32, 15, 22, col); rect(a, 8 + c * 20, 12 + r * 32, 15, 6, cols[(r + c * 3 + 2) % 8])


@region('record', 64, 64)
def _record(a, rng):
    fill(a, '#3a3d42'); disc(a, 32, 32, 31, '#141416')
    for r in (27, 22, 17):
        disc(a, 32, 32, r, '#2a2a2e', r - 1)
    disc(a, 32, 32, 11, '#b8332b'); disc(a, 32, 32, 2, '#f1ede0')


@region('dial', 124, 28)
def _dial(a, rng):
    fill(a, '#e9dfc0'); border(a, 2, '#3d2819')
    for i in range(20):
        rect(a, 8 + i * 5.7, 6, 1, 8 if i % 5 else 14, '#1d1d20')
    rect(a, 70, 3, 2, 22, '#c9281e')


@region('label', 60, 28)
def _label(a, rng):
    fill(a, '#f6f1e4'); border(a, 1, '#4a4d52'); scribble(a, 5, 6, 50, 3, 7, '#27406e', rng)


@region('barber', 104, 144)
def _barber(a, rng):
    fill(a, '#f1ede0'); border(a, 3, '#27406e'); ctext(a, 8, 'STYLES', '#b8332b', 2)
    for i, hair in enumerate(('#3d2819', '#1d1d20', '#b06a3c', '#e3b83a', '#5b3a25', '#8a8d90')):
        cx, cy = 22 + (i % 3) * 30, 48 + (i // 3) * 46
        disc(a, cx, cy + 4, 10, '#e3b89a'); disc(a, cx, cy - 2 - (i % 2) * 3, 11 + (i % 3), hair, 0, 0.6 + 0.1 * (i % 3))
        poly(a, [(cx - 12, cy + 26), (cx - 6, cy + 14), (cx + 6, cy + 14), (cx + 12, cy + 26)], '#7fa7d6')


@region('target', 88, 120)
def _target(a, rng):
    fill(a, '#e9e2d0')
    poly(a, [(10, 116), (18, 62), (32, 52), (56, 52), (70, 62), (78, 116)], '#1d1d20'); disc(a, 44, 34, 17, '#1d1d20')
    for r in (22, 14, 6):
        disc(a, 44, 80, r, '#e9e2d0', r - 2)
    disc(a, 44, 80, 3, '#b8332b')


@region('news', 92, 60)
def _news(a, rng):
    fill(a, '#e4e0d2'); rect(a, 4, 4, 84, 10, '#1d1d20'); ctext(a, 6, 'HOLLOW HERALD', '#e4e0d2', 1)
    rect(a, 4, 18, 36, 24, '#8a8d90')
    scribble(a, 44, 18, 44, 5, 5, '#3a3d42', rng); scribble(a, 4, 46, 84, 3, 5, '#3a3d42', rng)


@region('sale', 60, 24)
def _sale(a, rng):
    fill(a, '#c9281e'); border(a, 2, '#f3d73a'); ctext(a, 5, 'SALE', '#f6f1e4', 2)


@region('lcd', 60, 20)
def _lcd(a, rng):
    fill(a, '#0c1a12'); ctext(a, 3, '12.50', '#4ade80', 2)


@region('cert', 112, 84)
def _cert(a, rng):
    fill(a, '#efe6c8'); border(a, 4, '#b9933c'); rect(a, 30, 12, 52, 6, '#27406e')
    scribble(a, 16, 26, 80, 4, 8, '#4a4d52', rng, 2, 0.7); disc(a, 86, 64, 9, '#b8332b'); rect(a, 14, 66, 40, 2, '#1d1d20')


@region('book_open', 124, 76)
def _book_open(a, rng):
    fill(a, '#f1ede0'); rect(a, 61, 0, 2, 76, '#9a8f7a'); border(a, 1, '#9a8f7a')
    scribble(a, 6, 8, 50, 9, 7, '#3a3d42', rng); scribble(a, 68, 8, 50, 9, 7, '#3a3d42', rng)


@region('sheet', 92, 60)
def _sheet(a, rng):
    fill(a, '#f6f1e4')
    for s in range(3):
        for l in range(5):
            rect(a, 4, 6 + s * 18 + l * 3, 84, 1, '#3a3d42')
        for i in range(9):
            disc(a, 10 + i * 9, 6 + s * 18 + rng.randint(0, 12), 2, '#1d1d20')


@region('poster_oil', 104, 144)
def _poster_oil(a, rng):
    fill(a, '#e3b83a'); rect(a, 0, 0, 104, 30, '#27406e'); ctext(a, 8, 'MOTOR OIL', '#f6f1e4', 1); rect(a, 0, 112, 104, 32, '#b8332b')
    poly(a, [(52, 38), (74, 78), (52, 104), (30, 78)], '#1d1d20'); disc(a, 52, 82, 22, '#1d1d20'); ctext(a, 122, '10W-30', '#f6f1e4', 2)


@region('poster_lake', 104, 144)
def _poster_lake(a, rng):
    fill(a, '#f0b27a'); disc(a, 52, 50, 22, '#f6e7a0'); rect(a, 0, 78, 104, 66, '#3f7ea6')
    poly(a, [(0, 78), (26, 50), (52, 78)], '#3f6b4f'); poly(a, [(46, 78), (78, 44), (104, 78)], '#2f5a3a')
    rect(a, 0, 112, 104, 32, '#27406e'); ctext(a, 118, 'VISIT', '#f6f1e4', 1); ctext(a, 130, 'THE LAKE', '#f3d77a', 1)


@region('rotary', 64, 64)
def _rotary(a, rng):
    fill(a, '#1d1d20'); disc(a, 32, 32, 30, '#d9d5c8'); disc(a, 32, 32, 12, '#1d1d20')
    for i in range(10):
        ang = math.radians(60 + i * 30)
        disc(a, 32 + 21 * math.cos(ang), 32 - 21 * math.sin(ang), 4, '#1d1d20')


@region('gauge', 64, 64)
def _gauge(a, rng):
    fill(a, '#2f3033'); disc(a, 32, 32, 30, '#f1ede0'); disc(a, 32, 32, 30, '#8a8d90', 27)
    for i in range(9):
        ang = math.radians(210 - i * 30)
        line(a, 32 + 19 * math.cos(ang), 32 - 19 * math.sin(ang), 32 + 25 * math.cos(ang), 32 - 25 * math.sin(ang), 2, '#1d1d20')
    line(a, 32, 32, 46, 20, 3, '#c9281e'); disc(a, 32, 32, 4, '#1d1d20')


def _paint():
    """Packs the regions on shelves and paints them; returns the (SIZE, SIZE, 3) uint8 image."""
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:, :] = (128, 128, 128)
    x = y = 2
    row_h = 0
    REG.clear()
    for name, w, h, fn in sorted(_painters, key=lambda p: (-p[2], p[0])):
        if x + w + 2 > SIZE:
            x, y, row_h = 2, y + row_h + 4, 0
        if y + h + 2 > SIZE:
            raise RuntimeError('furniture atlas is full')
        rng = random.Random(sum(ord(c) for c in name))
        view = img[y:y + h, x:x + w]
        fn(view, rng)
        # bleed the border outwards so mip levels do not pick up the neighbour
        img[y - 2:y, x:x + w] = view[0:1]; img[y + h:y + h + 2, x:x + w] = view[h - 1:h]
        img[y - 2:y + h + 2, x - 2:x] = img[y - 2:y + h + 2, x:x + 1]; img[y - 2:y + h + 2, x + w:x + w + 2] = img[y - 2:y + h + 2, x + w - 1:x + w]
        REG[name] = (x, y, w, h)
        x += w + 4
        row_h = max(row_h, h)
    return img


def reset():
    _state.clear()


def uv(name, sub=None):
    """(u0, v0, u1, v1) of a region; `sub` = (fx0, fy0, fx1, fy1) fractions of it, y measured from the top."""
    if not REG:
        _paint()
    x, y, w, h = REG[name]
    if sub:
        x, y, w, h = x + sub[0] * w, y + sub[1] * h, (sub[2] - sub[0]) * w, (sub[3] - sub[1]) * h
    return (x / SIZE, 1 - (y + h) / SIZE, (x + w) / SIZE, 1 - y / SIZE)


def material():
    if 'mat' in _state:
        return _state['mat']
    img = _paint()
    im = bpy.data.images.new('furniture_atlas', SIZE, SIZE, alpha=False)
    px = np.ones((SIZE, SIZE, 4), np.float32)
    px[:, :, :3] = img[::-1].astype(np.float32) / 255.0
    im.pixels.foreach_set(px.ravel())
    path = os.path.join(tempfile.gettempdir(), 'furniture_atlas.png')
    im.filepath_raw, im.file_format = path, 'PNG'
    im.save()
    im.pack()
    m = lib.mat('atlas', '#ffffff')
    nt = m.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = im
    nt.links.new(tex.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    _state['mat'] = m
    return m

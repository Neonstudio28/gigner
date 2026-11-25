"""Freight district: steel dock warehouse, old brick warehouse, Quonset hut and an open pole shed."""
import math
import structures_kit as K
from structures_kit import Kit

G = 'warehouse'
K.PAL.update({
    'wh_trim': ('paint', '#2f4f7a'), 'wh_door': ('paint', '#d9d6cc'), 'wh_slat': ('paint', '#bdb9ad'), 'wh_bump': ('rubber', '#1d1d1f'),
    'wh_safety': ('paint', '#e0b22e'), 'wh_brick': ('paint', '#8f4a3a'), 'wh_brick2': ('paint', '#7a3d30'), 'wh_brick3': ('paint', '#a35a45'),
    'wh_lime': ('paint', '#cfc4ac'), 'wh_ghost': ('paint', '#d8ceb4'), 'wh_plank': ('paint', '#5f6b4f'), 'wh_plank2': ('paint', '#535e45'),
    'wh_tar': ('paint', '#3c3d40'), 'wh_corr': ('metal', '#aab0b2'), 'wh_corr2': ('metal', '#959c9f'), 'wh_rustc': ('paint', '#8f6a4c'),
    'wh_sky': ('paint', '#d9dccb'), 'wh_lumber': ('paint', '#d2b27c'), 'wh_lumber2': ('paint', '#c0a06a'),
})


def ribs(k, mat, a, b, fixed, z0, z1, along='X', step=0.6, out=1, t=0.035):
    """Raised ribs of box-profile steel siding on a wall running from a to b."""
    n = max(1, int((b - a) / step))
    for i in range(n + 1):
        c = a + (b - a) * i / n
        if along == 'X':
            k.ext(mat, c - 0.06, c + 0.06, min(fixed, fixed + out * t), max(fixed, fixed + out * t), z0, z1)
        else:
            k.ext(mat, min(fixed, fixed + out * t), max(fixed, fixed + out * t), c - 0.06, c + 0.06, z0, z1)


def roll_door(k, x, y, z, w, h, frame='wh_trim', leaf='wh_door', slat='wh_slat', part=1.0):
    """Sectional overhead door on the -Y face at (x, y), sill at z; `part` < 1 leaves it partly raised."""
    k.ext('black', x - w / 2, x + w / 2, y - 0.01, y + 0.3, z, z + h)
    z0 = z + h * (1 - part)
    k.ext(leaf, x - w / 2, x + w / 2, y - 0.05, y + 0.02, z0, z + h)
    n = max(2, int(h * part / 0.42))
    for i in range(1, n):
        zz = z0 + (z + h - z0) * i / n
        k.ext(slat, x - w / 2, x + w / 2, y - 0.065, y - 0.05, zz - 0.02, zz + 0.02)
    for s in (-1, 1):
        k.ext(frame, x + s * (w / 2 + 0.08) - 0.08, x + s * (w / 2 + 0.08) + 0.08, y - 0.09, y + 0.02, z, z + h + 0.16)
    k.ext(frame, x - w / 2 - 0.16, x + w / 2 + 0.16, y - 0.09, y + 0.02, z + h, z + h + 0.16)
    k.cbox('dsteel', x, y - 0.08, z0 + 0.25, 0.3, 0.04, 0.05)


def man_door(k, x, y, z, mat='wh_trim', w=0.95, h=2.1, glass=True):
    k.ext('white', x - w / 2 - 0.07, x + w / 2 + 0.07, y - 0.06, y + 0.02, z, z + h + 0.07)
    k.ext(mat, x - w / 2, x + w / 2, y - 0.085, y - 0.05, z + 0.02, z + h)
    if glass:
        k.ext('dglass', x - 0.22, x + 0.22, y - 0.095, y - 0.08, z + 1.25, z + 1.85)
    k.cbox('chrome', x + w / 2 - 0.12, y - 0.11, z + 1.02, 0.05, 0.06, 0.14)


def window(k, x, y, z, w, h, cols=3, rows=2, frame='white', sill='conc'):
    """Multi-pane steel window on the -Y face."""
    k.ext('dglass', x - w / 2, x + w / 2, y - 0.03, y + 0.02, z, z + h)
    for i in range(cols + 1):
        c = x - w / 2 + w * i / cols
        k.ext(frame, c - 0.025, c + 0.025, y - 0.06, y - 0.02, z, z + h)
    for j in range(rows + 1):
        c = z + h * j / rows
        k.ext(frame, x - w / 2 - 0.025, x + w / 2 + 0.025, y - 0.06, y - 0.02, c - 0.025, c + 0.025)
    k.ext(sill, x - w / 2 - 0.1, x + w / 2 + 0.1, y - 0.14, y, z - 0.1, z - 0.02)


def wall_pack(k, x, y, z):
    k.cbox('dsteel', x, y - 0.08, z, 0.34, 0.16, 0.22, 0.02)
    k.cbox('lamp', x, y - 0.13, z - 0.05, 0.26, 0.08, 0.1)


def downspout(k, x, y, z1, mat='white'):
    k.ext(mat, x - 0.05, x + 0.05, y - 0.11, y - 0.02, 0.25, z1)
    k.beam(mat, (x, y - 0.065, 0.3), (x, y - 0.4, 0.08), 0.1, 0.09)


def bollard(k, x, y, h=1.1):
    k.cyl('wh_safety', x, y, 0, 0.09, h, 8)
    k.cyl('black', x, y, h * 0.62, 0.093, 0.12, 8)
    k.sphere('wh_safety', x, y, h, 0.09, 8, 4)


def seam_roof(k, mat, seam, span, L, z, rise, over=0.5, step=1.0):
    """Low gable of standing-seam steel, ridge along X."""
    k.gable(mat, span, L, z, rise, over=over, t=0.07, plane='YZ', y0=-L / 2 - over)
    n = int((L + 2 * over) / step)
    zo = z - rise * over / (span / 2)
    for i in range(n + 1):
        x = -L / 2 - over + (L + 2 * over) * i / n
        for s in (-1, 1):
            k.beam(seam, (x, s * (span / 2 + over), zo + 0.1), (x, 0, z + rise + 0.1), 0.035, 0.04)
    k.ext(seam, -L / 2 - over, L / 2 + over, -0.16, 0.16, z + rise + 0.04, z + rise + 0.15)


def warehouse_steel():
    """Pre-engineered steel freight warehouse: ribbed siding, raised truck dock with four doors under a canopy, drive-in door, corner office."""
    k = Kit('warehouse_steel')
    L, D, H, R = 38.0, 22.0, 7.0, 2.0
    hx, hy = L / 2, D / 2
    k.ext('dconc', -hx - 0.15, hx + 0.15, -hy - 0.15, hy + 0.15, -0.3, 0.25)
    # walls: painted body with a darker wainscot and ribs
    k.ext('body', -hx, hx, -hy, hy, 0.25, H)
    for y, o in ((-hy, -1), (hy, 1)):
        k.ext('wh_trim', -hx - 0.01, hx + 0.01, min(y, y + o * 0.02), max(y, y + o * 0.02), 0.25, 1.5)
        ribs(k, 'body', -hx, hx, y, 1.5, H, 'X', out=o)
        ribs(k, 'wh_trim', -hx, hx, y + o * 0.02, 0.25, 1.5, 'X', out=o)
    for x, o in ((-hx, -1), (hx, 1)):
        k.ext('wh_trim', min(x, x + o * 0.02), max(x, x + o * 0.02), -hy - 0.01, hy + 0.01, 0.25, 1.5)
        k.prism('body', [(-hy, H), (hy, H), (0, H + R)], min(x, x - o * 0.02), max(x, x - o * 0.02), 'YZ')
        ribs(k, 'body', -hy, hy, x, 1.5, H, 'Y', out=o)
        ribs(k, 'wh_trim', -hy, hy, x + o * 0.02, 0.25, 1.5, 'Y', out=o)
        # gable louvre and corner trim
        k.cbox('white', x + o * 0.05, 0, H + 0.75, 0.08, 1.8, 1.1)
        for j in range(5):
            k.cbox('lgrey', x + o * 0.1, 0, H + 0.35 + j * 0.2, 0.04, 1.6, 0.06, rz=0)
        for s in (-1, 1):
            k.ext('white', min(x, x + o * 0.06) - 0.02, max(x, x + o * 0.06) + 0.02, s * hy - 0.1, s * hy + 0.1, 0.25, H)
    seam_roof(k, 'roof', 'zinc', D, L, H, R)
    # translucent roof lights and ridge ventilators
    for i in range(6):
        x = -hx + 3.5 + i * (L - 7) / 5
        for s in (-1, 1):
            with k.at(x, s * hy * 0.5, H + R * 0.5 + 0.09, rx=s * math.degrees(math.atan2(R, hy))):
                k.cbox('wh_sky', 0, 0, 0, 0.9, 3.4, 0.03)
        if i % 2 == 0 or i == 5:
            k.cyl('galv', x + 1.4, 0, H + R + 0.1, 0.32, 0.5, 10)
            k.cyl('galv', x + 1.4, 0, H + R + 0.6, 0.5, 0.22, 10, r2=0.12)
    # gutters and downspouts front and back
    for s in (-1, 1):
        k.ext('white', -hx - 0.5, hx + 0.5, s * (hy + 0.5) - 0.09, s * (hy + 0.5) + 0.09, H - 0.36, H - 0.2)
    for x in (-hx + 0.4, -4.0, hx - 0.4):
        downspout(k, x, -hy, H - 0.25)
    # --- front: raised dock (left), drive-in door and office (right)
    dx0, dx1, dk, dd = -hx + 1.0, 6.0, 1.2, 3.2
    k.ext('conc', dx0, dx1, -hy - dd, -hy, 0, dk)
    k.ext('wh_safety', dx0, dx1, -hy - dd - 0.02, -hy - dd + 0.12, dk - 0.14, dk + 0.005)
    doors = [dx0 + 2.6 + i * 5.6 for i in range(4)]
    for i, x in enumerate(doors):
        roll_door(k, x, -hy, dk, 3.0, 3.1, part=0.55 if i == 2 else 1.0)
        for s in (-1, 1):       # dock bumpers and the leveller plate
            k.cbox('wh_bump', x + s * 1.25, -hy - dd - 0.07, dk - 0.3, 0.28, 0.14, 0.5, 0.02)
        k.ext('dsteel', x - 1.0, x + 1.0, -hy - dd - 0.03, -hy - dd + 1.6, dk, dk + 0.02)
        k.cbox('wh_safety', x, -hy - 0.12, dk + 3.6, 0.5, 0.05, 0.4)
        k.cbox('black', x, -hy - 0.15, dk + 3.6, 0.3, 0.02, 0.26)
        wall_pack(k, x + 2.2, -hy, dk + 3.7)
    # dock stairs and rail at the right end
    for j in range(5):
        k.ext('conc', dx1, dx1 + 1.2, -hy - 1.3 - j * 0.3, -hy, 0, dk - j * 0.24)
    for p in ((dx1 + 1.2, -hy - 0.05), (dx1 + 1.2, -hy - 2.5)):
        k.cyl('wh_safety', p[0], p[1], 0, 0.03, dk + 1.0, 6)
    k.rod('wh_safety', (dx1 + 1.2, -hy - 0.05, dk + 1.0), (dx1 + 1.2, -hy - 2.5, 1.0), 0.03)
    # canopy over the dock
    with k.at(0, -hy, dk + 4.25, rx=-7):
        k.ext('roof', dx0 - 0.3, dx1 + 0.3, -dd - 0.6, 0.05, 0, 0.07)
        k.ext('white', dx0 - 0.3, dx1 + 0.3, -dd - 0.66, -dd - 0.56, -0.16, 0.08)
    for i in range(6):
        x = dx0 + i * (dx1 - dx0) / 5
        k.beam('wh_trim', (x, -hy, dk + 2.7), (x, -hy - dd - 0.3, dk + 3.75), 0.09, 0.09)
        k.beam('wh_trim', (x, -hy, dk + 4.2), (x, -hy - dd - 0.4, dk + 3.78), 0.09, 0.12)
    # drive-in door with bollards
    gx = 10.2
    roll_door(k, gx, -hy, 0.25, 4.2, 4.6)
    for s in (-1, 1):
        bollard(k, gx + s * 2.6, -hy - 0.7)
    wall_pack(k, gx, -hy, 5.5)
    # office corner: door under a small canopy, two windows, sign
    ox = 15.6
    man_door(k, ox - 1.6, -hy, 0.25)
    k.ext('conc', ox - 2.4, ox - 0.8, -hy - 1.2, -hy, 0, 0.25)
    with k.at(ox - 1.6, -hy, 2.75, rx=-12):
        k.ext('wh_trim', -1.0, 1.0, -1.2, 0.02, 0, 0.06)
    window(k, ox + 0.9, -hy, 1.15, 2.2, 1.3, 2, 1)
    window(k, ox + 0.9, -hy, 4.0, 2.2, 1.1, 2, 1)
    wall_pack(k, ox - 1.6, -hy, 3.3)
    k.sign(-7.6, -hy - 0.12, H - 0.55, 12.0, 1.3, t=0.12, back=False)
    # --- back: fire doors, exhaust fans, gas meter
    with k.at(rz=180):
        for x in (-12.0, 12.0):
            man_door(k, x, -hy, 0.25, mat='dgrey', glass=False)
            k.ext('conc', x - 0.8, x + 0.8, -hy - 1.0, -hy, 0, 0.25)
            wall_pack(k, x, -hy, 2.9)
        for x in (-4.0, 4.0):
            k.cbox('dgrey', x, -hy - 0.1, 5.2, 1.5, 0.22, 1.5, 0.03)
            for j in range(6):
                k.cbox('galv', x, -hy - 0.23, 4.6 + j * 0.24, 1.3, 0.02, 0.04)
        for x in (-hx + 0.4, 0.0, hx - 0.4):
            downspout(k, x, -hy, H - 0.25)
        k.cbox('grey', -16.5, -hy - 0.2, 0.9, 0.5, 0.3, 0.6, 0.03)
        k.tube('yellow', [(-16.5, -hy - 0.2, 0.3), (-16.5, -hy - 0.2, 0.6)], 0.03)
        k.tube('yellow', [(-16.2, -hy - 0.2, 1.1), (-16.0, -hy - 0.2, 1.1), (-16.0, -hy - 0.06, 1.1), (-16.0, -hy - 0.06, 3.0)], 0.03)
    return k.done(G, height=H + R + 0.8)


def warehouse_brick():
    """1920s brick freight house: pilasters, stepped parapet gables, steel sash windows, timber platform and canopy, plank freight doors."""
    k = Kit('warehouse_brick')
    L, D, H = 30.0, 15.0, 8.4
    hx, hy = L / 2, D / 2
    k.ext('stone2', -hx - 0.2, hx + 0.2, -hy - 0.2, hy + 0.2, -0.3, 0.9)
    k.ext('wh_brick', -hx, hx, -hy, hy, 0.9, H)
    k.ext('wh_tar', -hx + 0.25, hx - 0.25, -hy + 0.25, hy - 0.25, H - 0.1, H + 0.03)
    for j in range(9):                  # proud brick bands in two tones break up the flat wall
        z = 1.3 + j * 0.8
        k.ext('wh_brick3' if j % 3 == 1 else 'wh_brick2', -hx - 0.012, hx + 0.012, -hy - 0.012, hy + 0.012, z, z + 0.14)
    bays = 6
    for s in (-1, 1):
        y = s * hy
        for i in range(bays + 1):       # pilasters
            x = max(-hx + 0.35, min(hx - 0.35, -hx + i * L / bays))
            k.ext('wh_brick2', x - 0.35, x + 0.35, min(y, y + s * 0.14), max(y, y + s * 0.14), 0.9, H + 0.1)
            k.ext('wh_lime', x - 0.4, x + 0.4, min(y, y + s * 0.18), max(y, y + s * 0.18), H + 0.1, H + 0.3)
        k.ext('wh_brick3', -hx, hx, min(y, y + s * 0.1), max(y, y + s * 0.1), H - 1.0, H - 0.75)
        k.ext('wh_brick2', -hx, hx, min(y, y + s * 0.16), max(y, y + s * 0.16), H - 0.75, H - 0.6)
        k.ext('wh_lime', -hx - 0.05, hx + 0.05, y - 0.22, y + 0.22, H, H + 0.14)
    for s in (-1, 1):                   # stepped end parapets with a round vent
        x = s * hx
        for w, top in ((hy, H + 0.7), (hy * 0.66, H + 1.4), (hy * 0.33, H + 2.1)):
            k.ext('wh_brick', min(x, x - s * 0.4), max(x, x - s * 0.4), -w, w, H - 0.2, top)
            k.ext('wh_lime', min(x + s * 0.05, x - s * 0.45), max(x + s * 0.05, x - s * 0.45), -w - 0.05, w + 0.05, top, top + 0.14)
        k.cyl('wh_lime', x, 0, H + 0.2, 0.75, 0.06, 16, axis='X' if s > 0 else '-X')
        k.cyl('black', x + s * 0.02, 0, H + 0.2, 0.55, 0.06, 16, axis='X' if s > 0 else '-X')
    # --- front (-Y): timber platform, three freight doors, windows above
    pk, pd = 1.15, 3.0
    k.ext('wold', -hx + 0.4, hx - 0.4, -hy - pd, -hy, pk - 0.12, pk)
    k.planks('wold', -hx + 0.4, hx - 0.4, -hy - pd, -hy, pk, 0.03, 12, along='X', alt='wood3')
    for i in range(11):
        x = -hx + 0.7 + i * (L - 1.4) / 10
        for y in (-hy - pd + 0.2, -hy - pd / 2):
            k.box('wood4', x, y, 0, 0.24, 0.24, pk - 0.12)
        k.beam('wood4', (x, -hy - pd + 0.2, 0.15), (x, -hy - pd / 2, pk - 0.2), 0.08, 0.14)
    k.ext('wood4', -hx + 0.4, hx - 0.4, -hy - pd - 0.04, -hy - pd + 0.08, pk - 0.3, pk + 0.02)
    for j in range(5):                  # timber steps at the left end
        k.ext('wold', -hx - 0.9, -hx + 0.4, -hy - 0.7 - j * 0.3, -hy - 0.4 - j * 0.3, pk - 0.06 - (j + 1) * 0.215, pk - (j + 1) * 0.215)
    fx = [-hx + (i + 0.5) * L / bays for i in range(bays)]
    for i, x in enumerate(fx):
        if i in (1, 3, 4):
            k.ext('wh_lime', x - 1.75, x + 1.75, -hy - 0.05, -hy, pk + 3.0, pk + 3.35)
            k.ext('black', x - 1.5, x + 1.5, -hy - 0.01, -hy + 0.2, pk, pk + 3.0)
            off = 0.9 if i == 3 else 0.0
            k.ext('wh_plank', x - 1.55 + off, x + 1.55 + off, -hy - 0.1, -hy - 0.04, pk + 0.02, pk + 3.05)
            for q in range(7):
                k.ext('wh_plank2', x - 1.55 + off + q * 0.5, x - 1.53 + off + q * 0.5, -hy - 0.11, -hy - 0.1, pk + 0.02, pk + 3.05)
            k.beam('wh_plank2', (x - 1.5 + off, -hy - 0.12, pk + 0.15), (x + 1.5 + off, -hy - 0.12, pk + 2.9), 0.03, 0.16)
            for zz in (pk + 0.12, pk + 2.92):
                k.ext('wh_plank2', x - 1.55 + off, x + 1.55 + off, -hy - 0.13, -hy - 0.1, zz - 0.08, zz + 0.08)
            k.ext('iron', x - 3.3, x + 3.3, -hy - 0.14, -hy - 0.08, pk + 3.1, pk + 3.18)
        else:
            window(k, x, -hy, pk + 1.0, 2.4, 1.7, 4, 3, frame='dgreen', sill='wh_lime')
            k.ext('wh_lime', x - 1.35, x + 1.35, -hy - 0.05, -hy, pk + 2.7, pk + 2.98)
        window(k, x, -hy, 5.6, 2.4, 1.6, 4, 3, frame='dgreen', sill='wh_lime')
        k.ext('wh_lime', x - 1.35, x + 1.35, -hy - 0.05, -hy, 7.2, 7.46)
    with k.at(0, -hy, pk + 4.15, rx=-12):   # canopy: corrugated shed roof on timber brackets
        k.ext('wh_corr2', -hx + 0.2, hx - 0.2, -pd - 0.7, 0.05, 0, 0.05)
        for i in range(int((L - 0.4) / 0.5) + 1):
            k.ext('wh_corr', -hx + 0.2 + i * 0.5, -hx + 0.27 + i * 0.5, -pd - 0.7, 0.05, 0.05, 0.075)
        k.ext('wood4', -hx + 0.2, hx - 0.2, -pd - 0.6, -pd - 0.45, -0.18, 0)
    for i in range(bays + 1):
        x = max(-hx + 0.5, min(hx - 0.5, -hx + i * L / bays))
        k.beam('wood4', (x, -hy - 0.14, pk + 4.1), (x, -hy - pd - 0.5, pk + 3.4), 0.12, 0.16)
        k.beam('wood4', (x, -hy - 0.14, pk + 2.4), (x, -hy - pd * 0.75, pk + 3.5), 0.12, 0.12)
    k.cbox('wh_ghost', 0, -hy - 0.17, H - 0.25, 13.0, 0.03, 0.62)     # painted sign band on the parapet
    k.note_face(0, -hy - 0.19, H - 0.25, 13.0, 0.62)
    for x in (-hx + 0.9, hx - 0.9):
        downspout(k, x, -hy - 0.14, H - 0.3, 'dgreen')
    for x in (fx[1], fx[4]):            # gooseneck dock lamps
        k.tube('dgreen', [(x, -hy - 0.1, pk + 3.6), (x, -hy - 0.7, pk + 3.75), (x, -hy - 0.9, pk + 3.55)], 0.025)
        k.cyl('dgreen', x, -hy - 0.9, pk + 3.42, 0.22, 0.14, 10, r2=0.05)
        k.sphere('lamp', x, -hy - 0.9, pk + 3.42, 0.07, 6, 4)
    # --- back: windows, a bricked-up bay, rear door, roof ladder
    with k.at(rz=180):
        for i, x in enumerate(fx):
            for z in (2.2, 5.6):
                if i == 2 and z < 3:
                    k.ext('wh_brick3', x - 1.2, x + 1.2, -hy - 0.02, -hy, z, z + 1.6)
                elif i == 5 and z < 3:
                    man_door(k, x, -hy, 0.9, mat='dgreen', glass=False)
                    for j in range(3):
                        k.ext('conc', x - 0.8, x + 0.8, -hy - 0.4 - j * 0.3, -hy, 0, 0.9 - j * 0.3)
                else:
                    window(k, x, -hy, z, 2.4, 1.6, 4, 3, frame='dgreen', sill='wh_lime')
                k.ext('wh_lime', x - 1.35, x + 1.35, -hy - 0.05, -hy, z + 1.6, z + 1.86)
        k.ladder('iron', fx[0] - 2.3, -hy - 0.25, 2.6, H + 0.9, cage=True, standoff=0.2)
        for x in (-hx + 0.9, hx - 0.9):
            downspout(k, x, -hy - 0.14, H - 0.3, 'dgreen')
    # roof: chimney, glazed monitor, vents
    k.ext('wh_brick2', hx - 3.2, hx - 2.2, hy - 2.6, hy - 1.6, H - 0.5, H + 2.6)
    k.ext('wh_lime', hx - 3.3, hx - 2.1, hy - 2.7, hy - 1.5, H + 2.6, H + 2.75)
    k.ext('white', -8.0, 4.0, -1.6, 1.6, H - 0.45, H + 0.4)
    k.ext('dglass', -7.9, 3.9, -1.63, 1.63, H - 0.2, H + 0.3)
    with k.at(-2.0, 0, 0):
        k.gable('wh_tar', 3.6, 12.0, H + 0.4, 0.7, over=0.15, t=0.06, plane='YZ', y0=-6.15)
    for x in (-12.0, 8.0, 11.0):
        k.cyl('galv', x, 2.5, H - 0.45, 0.2, 0.7, 8)
        k.cyl('galv', x, 2.5, H + 0.25, 0.32, 0.16, 8, r2=0.08)
    return k.done(G, height=H + 2.8)


def warehouse_quonset():
    """Quonset hut store: corrugated steel arch on a concrete kerb, timber end walls with sliding doors."""
    k = Kit('warehouse_quonset')
    W, L = 12.0, 24.0
    r = W / 2
    hy = L / 2
    k.ext('dconc', -r - 0.2, r + 0.2, -hy - 2.5, hy + 0.3, -0.3, 0.12)
    k.ext('conc', -r - 0.1, r + 0.1, -hy, hy, 0.12, 0.5)
    n = 18
    arc = lambda rad, z0=0.5: [(rad * math.cos(math.pi * i / n), z0 + rad * math.sin(math.pi * i / n)) for i in range(n + 1)]
    k.prism('wh_corr', arc(r), -hy, hy, 'XZ')
    m = int(L / 0.8)
    for i in range(m + 1):              # corrugation hoops
        y = -hy + 0.1 + i * (L - 0.2) / m
        k.tube('wh_corr2' if i % 5 else 'wh_rustc', [(p[0], y, p[1]) for p in arc(r + 0.015)], 0.05, 4)
    for s in (-1, 1):                   # end walls
        y = s * hy
        k.prism('body', arc(r - 0.05), min(y, y + s * 0.12), max(y, y + s * 0.12), 'XZ')
        k.tube('white', [(p[0], y + s * 0.12, p[1]) for p in arc(r - 0.02)], 0.09, 4)
    yf = -hy - 0.12                     # front end: sliding doors (one ajar), man door, window, lamp, vent
    k.ext('black', -2.4, 2.4, yf - 0.005, yf + 0.1, 0.5, 4.3)
    for x in (-1.25, 1.75):
        k.ext('wh_plank', x - 1.2, x + 1.2, yf - 0.1, yf - 0.03, 0.5, 4.3)
        for q in range(6):
            k.ext('wh_plank2', x - 1.2 + q * 0.47, x - 1.18 + q * 0.47, yf - 0.11, yf - 0.1, 0.5, 4.3)
        k.beam('white', (x - 1.15, yf - 0.12, 0.6), (x + 1.15, yf - 0.12, 2.35), 0.03, 0.14)
        k.beam('white', (x - 1.15, yf - 0.12, 4.2), (x + 1.15, yf - 0.12, 2.45), 0.03, 0.14)
        for zz in (0.58, 2.4, 4.22):
            k.ext('white', x - 1.2, x + 1.2, yf - 0.125, yf - 0.1, zz - 0.07, zz + 0.07)
    k.ext('iron', -4.4, 4.4, yf - 0.15, yf - 0.06, 4.36, 4.46)
    man_door(k, -4.3, yf, 0.5, mat='wh_plank2', glass=False, h=2.0)
    window(k, 4.2, yf, 1.6, 1.3, 1.1, 2, 2)
    k.cbox('white', 0, yf - 0.04, 5.55, 1.0, 0.06, 0.7)
    for j in range(4):
        k.cbox('lgrey', 0, yf - 0.08, 5.32 + j * 0.16, 0.86, 0.03, 0.05)
    k.tube('dsteel', [(0, yf, 4.95), (0, yf - 0.55, 5.05), (0, yf - 0.7, 4.9)], 0.025)
    k.cyl('dsteel', 0, yf - 0.7, 4.78, 0.22, 0.14, 10, r2=0.05)
    k.sphere('lamp', 0, yf - 0.7, 4.78, 0.07, 6, 4)
    k.cbox('signface', 3.0, yf - 0.03, 3.6, 2.6, 0.04, 0.6)
    k.note_face(3.0, yf - 0.05, 3.6, 2.6, 0.6)
    with k.at(rz=180):                  # back end
        man_door(k, 2.0, yf, 0.5, mat='wh_plank2', glass=False, h=2.0)
        window(k, -2.0, yf, 1.6, 1.3, 1.1, 2, 2)
    for y in (-6.0, 6.0):
        k.cyl('galv', 0, y, 0.5 + r - 0.02, 0.22, 0.4, 8)
        k.sphere('galv', 0, y, 0.5 + r + 0.55, 0.33, 10, 6)
    k.cyl('dsteel', 2.6, 8.5, 0.5 + r * 0.9 - 0.3, 0.1, 1.5, 8)
    k.cyl('dsteel', 2.6, 8.5, 0.5 + r * 0.9 + 1.2, 0.2, 0.12, 8, r2=0.03)
    return k.done(G, height=r + 1.6)


def warehouse_pole_shed():
    """Open-fronted pole shed for lumber and pipe: timber posts and rafters, steel roof, racks of stock in the bays."""
    k = Kit('warehouse_pole_shed')
    L, D, HF, HB = 25.0, 10.0, 5.6, 4.2
    hx, hy = L / 2, D / 2
    k.ext('gravel2', -hx - 0.4, hx + 0.4, -hy - 1.5, hy + 0.3, -0.25, 0.06)
    bays = 5
    slope = math.degrees(math.atan2(HF - HB, D))
    for i in range(bays + 1):
        x = -hx + i * L / bays
        k.box('wood3', x, -hy, 0, 0.3, 0.3, HF)
        k.box('wood3', x, hy, 0, 0.3, 0.3, HB)
        k.box('wood3', x, 0, 0, 0.26, 0.26, (HF + HB) / 2)
        k.beam('wood3', (x, -hy - 0.9, HF + 0.22), (x, hy + 0.4, HB - 0.06), 0.14, 0.3)
        for y, h in ((-hy, HF), (0, (HF + HB) / 2)):
            for s in (-1, 1):
                if -hx < x + s * 1.1 < hx:
                    k.beam('wood3', (x, y, h - 1.3), (x + s * 1.1, y, h - 0.15), 0.1, 0.12)
        k.cbox('dconc', x, -hy, 0.12, 0.5, 0.5, 0.24)
    for y, h in ((-hy, HF), (0, (HF + HB) / 2), (hy, HB)):
        k.ext('wood3', -hx, hx, y - 0.1, y + 0.1, h - 0.3, h - 0.02)
    for j in range(8):                  # purlins
        y = -hy - 0.7 + j * (D + 1.0) / 7
        z = HF + 0.38 - (y + hy) * (HF - HB) / D
        k.ext('wood2', -hx - 0.3, hx + 0.3, y - 0.04, y + 0.04, z, z + 0.12)
    with k.at(0, -hy - 1.0, HF + 0.62, rx=-slope):
        k.ext('wh_corr2', -hx - 0.45, hx + 0.45, 0, D + 1.55, 0, 0.04)
        for i in range(int((L + 0.9) / 0.5) + 1):
            k.ext('wh_corr' if i % 9 else 'wh_rustc', -hx - 0.45 + i * 0.5, -hx - 0.37 + i * 0.5, 0, D + 1.55, 0.04, 0.07)
    # back and end walls: corrugated sheet above a plank kick board
    k.ext('wh_corr2', -hx, hx, hy + 0.15, hy + 0.2, 0.9, HB - 0.3)
    ribs(k, 'wh_corr', -hx, hx, hy + 0.2, 0.9, HB - 0.3, 'X', step=0.5)
    k.ext('wood4', -hx, hx, hy + 0.15, hy + 0.22, 0.06, 0.9)
    for s in (-1, 1):
        x = s * hx
        k.prism('wh_corr2', [(-hy, 0.9), (hy, 0.9), (hy, HB - 0.3), (-hy, HF - 0.3)], min(x + s * 0.15, x + s * 0.2), max(x + s * 0.15, x + s * 0.2), 'YZ')
        k.ext('wood4', min(x + s * 0.15, x + s * 0.22), max(x + s * 0.15, x + s * 0.22), -hy, hy, 0.06, 0.9)
    # stock: racks of lumber in three bays, pipe in one, one bay left clear
    for b in (0, 1, 3):
        x0 = -hx + b * L / bays + 0.5
        w = L / bays - 1.0
        for s in (0.15, 0.85):
            k.box('dsteel', x0 + w * s, hy - 0.4, 0.06, 0.12, 0.12, 4.0)
        for lv in range(3):
            z = 0.35 + lv * 1.25
            for s in (0.15, 0.85):
                k.ext('dsteel', x0 + w * s - 0.05, x0 + w * s + 0.05, 0.4, hy - 0.3, z - 0.1, z)
            for q in range(5 if (b + lv) % 2 else 4):
                for t in range(3 - (q + lv) % 2):
                    x1 = x0 + w - 0.1 - 0.3 * ((q * 3 + t + lv) % 3)
                    y0 = 0.6 + q * 0.75
                    z0 = z + t * 0.2
                    k.ext('wh_lumber' if (q + t + b) % 2 else 'wh_lumber2', x0 + 0.1, x1, y0, y0 + 0.68, z0 + 0.01, z0 + 0.19)
                    k.ext('endgrain', x0 + 0.094, x0 + 0.1, y0 + 0.02, y0 + 0.66, z0 + 0.02, z0 + 0.18)
    x0 = -hx + 4 * L / bays + 0.6
    for lv in range(3):
        for q in range(7 - lv):
            k.cyl('galv' if lv % 2 else 'dsteel', x0 + 0.1, 1.2 + q * 0.34 + lv * 0.17, 0.3 + lv * 0.3, 0.16, L / bays - 1.4, 8, axis='X')
    for y in (1.0, 3.6):
        k.ext('wood4', x0, x0 + L / bays - 1.2, y, y + 0.16, 0.06, 0.14)
    for i in range(bays):               # lamps under the front beam
        x = -hx + (i + 0.5) * L / bays
        k.cyl('dgreen', x, -hy + 0.3, HF - 0.75, 0.24, 0.16, 10, r2=0.06)
        k.sphere('lamp', x, -hy + 0.3, HF - 0.76, 0.07, 6, 4)
        k.rod('black', (x, -hy + 0.3, HF - 0.6), (x, -hy + 0.3, HF - 0.3), 0.012)
    k.sign(0, -hy - 0.22, HF - 0.75, 7.0, 0.8, t=0.1, back=False)
    return k.done(G, height=HF + 1.0)


def yard_ramp():
    """Portable steel yard ramp for loading trucks from the ground."""
    k = Kit('yard_ramp')
    Lr, W, Ht = 9.0, 2.2, 1.25
    for s in (-1, 1):
        k.beam('wh_safety', (s * W / 2, -Lr / 2, 0.1), (s * W / 2, Lr / 2 - 2.4, Ht - 0.1), 0.12, 0.32)
    k.beam('dsteel', (0, -Lr / 2, 0.06), (0, Lr / 2 - 2.4, Ht - 0.06), W, 0.05)
    for i in range(16):
        t = (i + 0.5) / 16
        k.cbox('steel', 0, -Lr / 2 + t * (Lr - 2.4), 0.11 + t * (Ht - 0.12), W - 0.1, 0.05, 0.03)
    k.ext('dsteel', -W / 2, W / 2, Lr / 2 - 2.4, Lr / 2, Ht - 0.07, Ht - 0.02)
    for s in (-1, 1):
        k.ext('wh_safety', s * W / 2 - 0.06, s * W / 2 + 0.06, Lr / 2 - 2.4, Lr / 2, Ht - 0.3, Ht + 0.02)
        k.box('dsteel', s * (W / 2 - 0.2), Lr / 2 - 2.0, 0.3, 0.12, 0.12, Ht - 0.6)
        k.cyl('rubber', s * (W / 2 + 0.12), Lr / 2 - 2.0, 0.3, 0.3, 0.2, 12, axis='X' if s > 0 else '-X')
        k.cyl('wh_safety', s * (W / 2 + 0.13), Lr / 2 - 2.0, 0.3, 0.14, 0.2, 8, axis='X' if s > 0 else '-X')
    k.ext('dsteel', -W / 2, W / 2, Lr / 2 - 2.06, Lr / 2 - 1.94, 0.24, 0.36)
    return k.done(G, height=Ht + 0.1)


def build():
    for f in ALL:
        f()


ALL = (warehouse_steel, warehouse_brick, warehouse_quonset, warehouse_pole_shed, yard_ramp)
SHEETS = [
    ('warehouse_steel', ['warehouse_steel'], 'shot', dict(elev=18, azim=-32, gap=1.0)),
    ('warehouse_brick', ['warehouse_brick'], 'shot', dict(elev=18, azim=-32, gap=1.0)),
    ('warehouse_small', ['warehouse_quonset', 'warehouse_pole_shed', 'yard_ramp'], 'shot', dict(elev=18, azim=-32, gap=2.0)),
]

"""Landmarks: church spire, clock, bandstand, fountain, statue, flagpole, war memorial."""
import math
from structures_kit import Kit, circle, rrect, offset_poly

G = 'civic'
R8 = 1 / math.cos(math.radians(22.5))


def arch_pts(w, h, n=6, cx=0.0, z0=0.0):
    """Outline of a round-topped opening: width w, total height h."""
    r = w / 2
    return [(cx - r, z0), (cx + r, z0)] + [(cx + r * math.cos(math.radians(180 * i / n)), z0 + h - r + r * math.sin(math.radians(180 * i / n))) for i in range(n + 1)]


def church_spire():
    k = Kit('church_spire')
    B, H = 3.2, 3.7
    k.box('white', 0, 0, 0, B, B, H, 0.02)
    k.box('lgrey', 0, 0, 0, B + 0.16, B + 0.16, 0.3, 0.03)
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('white', sx * (B / 2 - 0.12), sy * (B / 2 - 0.12), 0.3, 0.34, 0.34, H - 0.3, 0.02)
    for rz in (0, 90, 180, 270):
        with k.at(0, 0, 0, rz=rz):
            y = -B / 2
            k.prism('black', arch_pts(1.1, 2.2, 6, 0, 0.85), y - 0.012, y + 0.05, 'XZ')
            for sx in (-1, 1):
                k.box('lgrey', sx * 0.61, y - 0.02, 0.8, 0.12, 0.08, 1.75, 0.01)
            k.tube('lgrey', [(0.61 * math.cos(math.radians(a)), y - 0.02, 2.5 + 0.61 * math.sin(math.radians(a))) for a in range(0, 181, 30)], 0, sq=(0.08, 0.12))
            k.box('lgrey', 0, y - 0.04, 0.72, 1.5, 0.14, 0.1, 0.015)
            for i in range(7):
                z = 0.92 + i * 0.26
                w = 1.06 if z < 2.45 else 2 * math.sqrt(max(0.05, 0.55 ** 2 - (z + 0.1 - 2.5) ** 2))
                k.box('grey', 0, y - 0.02, z, w, 0.1, 0.05, rx=-28)
    k.box('white', 0, 0, H, B + 0.3, B + 0.3, 0.16, 0.03)
    k.box('lgrey', 0, 0, H + 0.16, B + 0.56, B + 0.56, 0.14, 0.04)
    z0 = H + 0.3
    # broach: square eaves to the octagonal spire
    k.lathe('slate', [(B / 2 * math.sqrt(2) + 0.2, z0), (B / 2 * math.sqrt(2) + 0.2, z0 + 0.1), (1.3 * R8, z0 + 1.0)], 4, a0=45)
    k.lathe('slate', [(1.42 * R8, z0 + 0.55), (1.3 * R8, z0 + 1.0), (0.07, z0 + 9.0), (0.0, z0 + 9.0)], 8, a0=22.5)
    for i in range(8):
        a = math.radians(22.5 + 45 * i)
        k.beam('roof', (1.32 * R8 * math.cos(a), 1.32 * R8 * math.sin(a), z0 + 0.95), (0.06 * math.cos(a), 0.06 * math.sin(a), z0 + 9.0), 0.07, 0.05)
    for rz in (0, 90, 180, 270):
        with k.at(0, 0, 0, rz=rz):
            k.prism('white', [(-0.42, z0 + 1.1), (0.42, z0 + 1.1), (0.42, z0 + 1.75), (0, z0 + 2.3), (-0.42, z0 + 1.75)], -1.42, -0.9, 'XZ')
            k.prism('black', [(-0.2, z0 + 1.25), (0.2, z0 + 1.25), (0.2, z0 + 1.7), (0, z0 + 1.95), (-0.2, z0 + 1.7)], -1.435, -1.4, 'XZ')
            k.prism('slate', [(-0.52, z0 + 1.72), (0, z0 + 2.38), (0.52, z0 + 1.72), (0.52, z0 + 1.82), (0, z0 + 2.5), (-0.52, z0 + 1.82)], -1.5, -0.8, 'XZ')
    k.sphere('brass', 0, 0, z0 + 9.05, 0.16, 8, 5)
    k.box('brass', 0, 0, z0 + 9.15, 0.07, 0.07, 1.1, 0.01)
    k.box('brass', 0, 0, z0 + 9.78, 0.62, 0.07, 0.07, 0.01)
    return k.done(G, 'roof')


def clock_face():
    k = Kit('clock_face')
    k.lathe('stone', [(0.8, 0.0), (0.8, 0.1), (0.75, 0.15), (0.69, 0.15), (0.67, 0.07)], 24, axis='-Y')
    k.cyl('white', 0, 0.0, 0, 0.66, 0.082, 24, axis='-Y')
    for i in range(12):
        a = math.radians(i * 30)
        big = i % 3 == 0
        k.cbox('black', 0.56 * math.sin(a), -0.088, 0.56 * math.cos(a), 0.05 if big else 0.03, 0.012, 0.16 if big else 0.1, ry=i * 30)
    k.cyl('brass', 0, -0.08, 0, 0.06, 0.06, 10, 0.01, axis='-Y')
    h = k.part('hand_hour', 0, -0.102, 0)
    h.prism('black', [(-0.035, -0.1), (0.035, -0.1), (0.045, 0.22), (0, 0.36), (-0.045, 0.22)], -0.008, 0.008, 'XZ')
    m = k.part('hand_minute', 0, -0.122, 0)
    m.prism('black', [(-0.025, -0.12), (0.025, -0.12), (0.03, 0.4), (0, 0.56), (-0.03, 0.4)], -0.008, 0.008, 'XZ')
    ob = k.done(G, 'wall', hands={'hour': 'clock_face.hand_hour', 'minute': 'clock_face.hand_minute', 'axis': 'y'})
    for c in ob.children:       # shown at ten past ten; the engine turns the hands about their local Y (wall normal)
        c.rotation_euler = (0, math.radians(305 if c.name.endswith('hour') else 60), 0)
    return ob


def bandstand_gazebo():
    k = Kit('bandstand_gazebo')
    A, zd = 3.0, 0.75
    R = A * R8
    k.lathe('stone2', [(R - 0.1, 0), (R - 0.1, zd - 0.12)], 8, a0=22.5)
    k.lathe('stone', [(R - 0.2, zd - 0.12), (R + 0.06, zd - 0.12), (R + 0.06, zd), (R - 0.2, zd)], 8, a0=22.5, closed=True)
    k.lathe('wood1', [(R - 0.2, zd - 0.05), (R - 0.2, zd - 0.012), (0, zd - 0.012)], 8, a0=22.5)
    for i in range(1, 6):
        k.lathe('wood2', [(R * i / 6 - 0.012, zd - 0.02), (R * i / 6 - 0.012, zd - 0.006), (R * i / 6 + 0.012, zd - 0.006), (R * i / 6 + 0.012, zd - 0.02)], 8, a0=22.5, closed=True)
    for i in range(8):
        with k.at(0, 0, 0, rz=45 * i):
            if i != 0:
                k.box('stone', 0, -A + 0.09, 0.08, 1.7, 0.03, zd - 0.3, 0.0)
                k.box('stone2', 0, -A + 0.075, 0.14, 1.5, 0.03, zd - 0.42, 0.0)
    for i in range(4):
        k.box('stone', 0, -A - 0.05 - (3 - i) * 0.32 - 0.16, 0, 2.0, 0.34, (i + 1) * zd / 5, 0.015)
    for sx in (-1, 1):
        k.box('stone2', sx * 1.16, -A - 0.62, 0, 0.3, 1.36, zd + 0.1, 0.03)
        k.box('stone', sx * 1.16, -A - 0.62, zd + 0.1, 0.38, 1.44, 0.08, 0.02)
    zt = zd + 2.75
    side = 2 * A * math.tan(math.radians(22.5))
    for i in range(8):
        a = 22.5 + 45 * i
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        px, py = (R - 0.28) * c, (R - 0.28) * s
        k.box('white', px, py, zd, 0.26, 0.26, 0.3, 0.02, rz=a)
        k.box('white', px, py, zd + 0.3, 0.17, 0.17, zt - zd - 0.3, 0.015, rz=a)
        k.box('white', px, py, zt - 0.16, 0.26, 0.26, 0.16, 0.02, rz=a)
        with k.at(0, 0, 0, rz=45 * i):
            y = -(R - 0.28) * math.cos(math.radians(22.5))
            w = side - 0.62
            for sx in (-1, 1):   # brackets under the beam
                x0 = sx * (w / 2 + 0.1)
                k.beam('white', (x0, y, zt - 0.75), (x0 - sx * 0.6, y, zt - 0.14), 0.07, 0.07)
                k.tube('white', k.arc(x0 - sx * 0.02, y, zt - 0.2, 0.36, 180 if sx > 0 else 0, 270, 4, 'XZ'), 0, sq=(0.035, 0.045))
            k.box('white', 0, y, zt - 0.34, w + 0.3, 0.05, 0.05)
            for j in range(9):
                k.box('white', -w / 2 + 0.12 + j * (w - 0.24) / 8, y, zt - 0.3, 0.035, 0.035, 0.18)
            if i != 0:
                k.box('white', 0, y, zd + 0.9, w + 0.3, 0.1, 0.06, 0.01)
                k.box('white', 0, y, zd + 0.12, w + 0.3, 0.07, 0.06, 0.01)
                for j in range(9):
                    k.box('white', -w / 2 + 0.1 + j * (w - 0.2) / 8, y, zd + 0.18, 0.05, 0.05, 0.72)
    k.lathe('white', [(R - 0.42, zt), (R - 0.1, zt), (R - 0.1, zt + 0.3), (R - 0.42, zt + 0.3)], 8, a0=22.5, closed=True)
    k.lathe('cream', [(R - 0.42, zt + 0.22), (0, zt + 0.5)], 8, a0=22.5)
    k.lathe('dgreen', [(R + 0.45, zt + 0.26), (R + 0.45, zt + 0.36), (0.75, zt + 1.95), (0.0, zt + 1.95)], 8, a0=22.5)
    k.lathe('white', [(R + 0.4, zt + 0.2), (R + 0.47, zt + 0.2), (R + 0.47, zt + 0.27), (R + 0.4, zt + 0.27)], 8, a0=22.5, closed=True)
    for i in range(8):
        a = math.radians(22.5 + 45 * i)
        k.beam('green', ((R + 0.45) * math.cos(a), (R + 0.45) * math.sin(a), zt + 0.36), (0.75 * math.cos(a), 0.75 * math.sin(a), zt + 1.97), 0.09, 0.07)
    k.lathe('white', [(0.68, zt + 1.9), (0.68, zt + 2.3)], 8, a0=22.5)
    k.lathe('dgreen', [(0.95, zt + 2.28), (0.95, zt + 2.34), (0.05, zt + 3.0), (0.0, zt + 3.0)], 8, a0=22.5)
    k.sphere('brass', 0, 0, zt + 3.08, 0.12, 8, 5)
    k.cyl('brass', 0, 0, zt + 3.1, 0.025, 0.5, 6, r2=0.005)
    k.cyl('dsteel', 0, 0, zt + 0.1, 0.02, 0.35, 6)
    k.lathe('lamp', [(0.0, zt - 0.25), (0.16, zt - 0.2), (0.2, zt - 0.05), (0.1, zt + 0.1), (0.0, zt + 0.1)], 8)
    return k.done(G)


def fountain_park():
    k = Kit('fountain_park')
    R = 2.6
    k.lathe('stone2', [(R + 0.35, 0), (R + 0.35, 0.1), (R + 0.22, 0.14)], 16)
    k.lathe('stone', [(R + 0.22, 0.1), (R + 0.2, 0.52), (R + 0.3, 0.56), (R + 0.3, 0.68), (R + 0.24, 0.72), (R - 0.16, 0.72), (R - 0.2, 0.68), (R - 0.2, 0.3), (0.5, 0.3)], 16)
    for i in range(16):
        a = 22.5 * i + 11.25
        k.box('stone2', (R + 0.21) * math.cos(math.radians(a)), (R + 0.21) * math.sin(math.radians(a)), 0.16, 0.05, 0.7, 0.3, 0.01, rz=a)
    k.lathe('water', [(R - 0.2, 0.5), (R - 0.2, 0.56), (0.5, 0.56)], 16)
    k.lathe('stone', [(0.72, 0.3), (0.72, 0.7), (0.6, 0.78), (0.34, 0.9), (0.26, 1.3), (0.3, 1.52), (0.5, 1.66), (1.25, 1.84), (1.32, 1.9), (1.32, 1.98), (1.2, 1.98), (1.12, 1.9), (0.3, 1.86)], 12)
    k.lathe('water', [(1.15, 1.9), (1.15, 1.95), (0.2, 1.95)], 12)
    k.lathe('stone', [(0.3, 1.8), (0.2, 2.0), (0.16, 2.5), (0.22, 2.66), (0.62, 2.8), (0.68, 2.86), (0.68, 2.92), (0.58, 2.92), (0.52, 2.86), (0.14, 2.82)], 12)
    k.lathe('water', [(0.55, 2.84), (0.55, 2.9), (0.1, 2.9)], 12)
    k.lathe('bronze', [(0.14, 2.8), (0.1, 3.05), (0.16, 3.16), (0.1, 3.3), (0.03, 3.42), (0.0, 3.42)], 8)
    k.lathe('water', [(0.045, 3.4), (0.07, 3.62), (0.0, 3.7)], 6)
    for i in range(8):     # falling sheets of water between the tiers
        a = math.radians(45 * i + 22.5)
        c, s = math.cos(a), math.sin(a)
        k.box('water', 0.66 * c, 0.66 * s, 2.0, 0.035, 0.18, 0.9, rz=math.degrees(a))
        k.box('water', 1.3 * c, 1.3 * s, 0.58, 0.04, 0.3, 1.36, rz=math.degrees(a))
    for i in range(4):
        a = math.radians(90 * i + 45)
        k.lathe('bronze', [(0.0, 0.0), (0.09, 0.03), (0.1, 0.16), (0.05, 0.22), (0.0, 0.22)], 6, 0.78 * math.cos(a), 0.78 * math.sin(a), 0.62, axis=(math.cos(a), math.sin(a), 0.5))
    return k.done(G)


def figure(k, x, y, z, mat='bronze', s=1.0):
    """Generic standing founder: boots, trousers, long coat, one arm raised with a rolled plan, hat."""
    with k.at(x, y, z, s=s):
        for sx in (-1, 1):
            k.box(mat, sx * 0.12, -0.03, 0, 0.14, 0.3, 0.1, 0.03)
            k.box(mat, sx * 0.12, 0.01, 0.1, 0.15, 0.17, 0.74, 0.03)
        k.prism(mat, [(-0.27, 0.62), (0.27, 0.62), (0.25, 1.1), (0.3, 1.45), (-0.3, 1.45), (-0.25, 1.1)], -0.13, 0.17, 'XZ', 0.04)
        k.prism(mat, [(-0.02, 0.62), (0.02, 0.62), (0.05, 1.42), (-0.05, 1.42)], -0.145, -0.1, 'XZ', 0.0)
        k.box(mat, 0, 0.02, 1.43, 0.2, 0.2, 0.08, 0.03)
        k.beam(mat, (-0.33, 0.02, 1.4), (-0.38, 0.04, 0.95), 0.12, 0.13, 0.03)
        k.beam(mat, (-0.38, 0.04, 0.98), (-0.34, -0.1, 0.72), 0.1, 0.11, 0.03)
        k.beam(mat, (0.33, 0.02, 1.4), (0.42, -0.14, 1.1), 0.12, 0.13, 0.03)
        k.beam(mat, (0.42, -0.14, 1.12), (0.3, -0.36, 1.3), 0.1, 0.11, 0.03)
        k.rod(mat, (0.3, -0.3, 1.2), (0.3, -0.42, 1.52), 0.035, 6)
        k.box(mat, 0, 0.01, 1.5, 0.21, 0.23, 0.25, 0.05)
        k.box(mat, 0, -0.1, 1.57, 0.05, 0.05, 0.07, 0.01)
        k.cyl(mat, 0, 0.01, 1.74, 0.2, 0.025, 10)
        k.cyl(mat, 0, 0.01, 1.76, 0.125, 0.17, 10, 0.02, r2=0.115)


def statue_plinth():
    k = Kit('statue_plinth')
    k.box('stone2', 0, 0, 0, 2.4, 2.4, 0.2, 0.03)
    k.box('stone', 0, 0, 0.2, 1.9, 1.9, 0.2, 0.03)
    k.box('stone', 0, 0, 0.4, 1.4, 1.4, 0.22, 0.05)
    k.box('stone', 0, 0, 0.62, 1.2, 1.2, 1.25, 0.03)
    k.box('stone', 0, 0, 1.87, 1.42, 1.42, 0.16, 0.05)
    k.box('stone2', 0, 0, 2.03, 1.1, 1.1, 0.1, 0.02)
    for rz in (0, 90, 180, 270):
        with k.at(0, 0, 0, rz=rz):
            k.box('stone2', 0, -0.6, 0.78, 0.92, 0.03, 0.95, 0.0)
    k.box('bronze', 0, -0.625, 0.95, 0.7, 0.03, 0.5, 0.008)
    k.cbox('signface', 0, -0.642, 1.2, 0.58, 0.006, 0.36)
    k.note_face(0, -0.646, 1.2, 0.58, 0.36)
    figure(k, 0, 0.02, 2.13, 'bronze', 1.12)
    return k.done(G)


def flagpole_tall():
    k = Kit('flagpole_tall')
    k.cyl('conc', 0, 0, 0, 0.55, 0.14, 12, 0.03)
    k.cyl('stone', 0, 0, 0.14, 0.38, 0.16, 12, 0.03)
    k.lathe('white', [(0.14, 0.3), (0.16, 0.34), (0.16, 0.5), (0.1, 0.62), (0.085, 0.7), (0.045, 11.8)], 10)
    k.cyl('brass', 0, 0, 11.78, 0.07, 0.05, 8, 0.01)
    k.sphere('brass', 0, 0, 11.93, 0.1, 10, 6)
    k.box('dsteel', 0, -0.1, 1.2, 0.05, 0.08, 0.14, 0.01)
    k.tube('rope', [(0, -0.09, 1.3), (0, -0.09, 11.7)], 0.008, 4)
    k.tube('rope', [(0.03, -0.085, 1.3), (0.05, -0.02, 11.7)], 0.008, 4)
    f = k.part('flag', 0.06, 0, 11.6)
    W, Hh, n = 2.9, 1.7, 8

    def wave(u):
        return 0.14 * math.sin(u * 4.4 + 0.4) * (0.25 + 0.75 * u)

    def sheet(mat, u0, u1, v0, v1, dy=0.0):
        m = max(1, round((u1 - u0) * n))
        rings = []
        for i in range(m + 1):
            u = u0 + (u1 - u0) * i / m
            x, y = u * W, wave(u)
            sag = -0.16 * u * u
            rings.append([(x, y - 0.006 - dy, sag - v0 * Hh), (x, y + 0.006 + dy, sag - v0 * Hh), (x, y + 0.006 + dy, sag - v1 * Hh), (x, y - 0.006 - dy, sag - v1 * Hh)])
        f.loft(mat, rings)
    for i in range(7):
        if i < 4:
            sheet('flag' if i % 2 == 0 else 'white', 0.42, 1.0, i / 7, (i + 1) / 7)
        else:
            sheet('flag' if i % 2 == 0 else 'white', 0.0, 1.0, i / 7, (i + 1) / 7)
    sheet('navy', 0.0, 0.42, 0.0, 4 / 7)
    for j in range(3):
        for i in range(4):
            u = 0.06 + i * 0.1
            f.cbox('white', u * W, wave(u), -0.16 * u * u - (0.1 + j * 0.19) * Hh, 0.09, 0.03, 0.09, ry=45)
    for z in (-0.04, -Hh + 0.04):
        f.cyl('brass', -0.035, 0, z, 0.02, 0.06, 6, axis='X')
    return k.done(G)


def war_memorial():
    k = Kit('war_memorial')
    k.box('stone2', 0, 0, 0, 6.4, 3.6, 0.18, 0.03)
    k.box('stone', 0, 0.2, 0.18, 5.4, 2.6, 0.18, 0.03)
    k.box('stone', 0, 0.35, 0.36, 1.9, 1.9, 0.5, 0.05)
    k.box('stone', 0, 0.35, 0.86, 1.5, 1.5, 1.3, 0.03)
    k.box('stone', 0, 0.35, 2.16, 1.7, 1.7, 0.18, 0.05)
    k.loft('stone', [[(-0.55, -0.2, 2.34), (0.55, -0.2, 2.34), (0.55, 0.9, 2.34), (-0.55, 0.9, 2.34)],
                     [(-0.36, -0.01, 5.5), (0.36, -0.01, 5.5), (0.36, 0.71, 5.5), (-0.36, 0.71, 5.5)],
                     [(-0.02, 0.33, 5.95), (0.02, 0.33, 5.95), (0.02, 0.37, 5.95), (-0.02, 0.37, 5.95)]])
    k.box('bronze', 0, -0.41, 1.05, 1.1, 0.03, 0.9, 0.008)
    k.cbox('signface', 0, -0.428, 1.5, 0.95, 0.006, 0.72)
    k.note_face(0, -0.432, 1.5, 0.95, 0.72)
    k.torus('leaf', 0, -0.46, 0.62, 0.3, 0.085, 12, 6, axis='Y')
    k.box('red', 0, -0.5, 0.33, 0.16, 0.05, 0.12, 0.02)
    k.prism('bronze', [((0.3 if i % 2 == 0 else 0.13) * math.cos(math.radians(90 + i * 36)), 3.1 + (0.3 if i % 2 == 0 else 0.13) * math.sin(math.radians(90 + i * 36))) for i in range(10)], -0.16, -0.1, 'XZ', 0.0)
    for sx in (-1, 1):
        k.box('stone', sx * 2.0, 0.75, 0.36, 1.9, 0.5, 1.25, 0.03)
        k.box('stone2', sx * 2.0, 0.75, 1.61, 2.0, 0.6, 0.12, 0.03)
        k.box('bronze', sx * 2.0, 0.485, 0.6, 1.4, 0.03, 0.8, 0.008)
        for i in range(5):
            k.box('dsteel', sx * 2.0, 0.468, 0.7 + i * 0.14, 1.2, 0.01, 0.05)
        k.box('stone', sx * 3.0, 0.75, 0.36, 0.5, 0.6, 1.6, 0.04)
        k.lathe('stone2', [(0.14, 1.96), (0.26, 2.1), (0.3, 2.28), (0.22, 2.36), (0.0, 2.36)], 8, sx * 3.0, 0.75)
        k.sphere('leaf', sx * 3.0, 0.75, 2.42, 0.2, 8, 4)
    posts = [(-2.9, -1.45), (-1.45, -1.55), (1.45, -1.55), (2.9, -1.45)]
    for x, y in posts:
        k.cyl('dsteel', x, y, 0.18, 0.06, 0.62, 8, 0.012)
        k.sphere('brass', x, y, 0.84, 0.06, 6, 4)
    for (xa, ya), (xb, yb) in ((posts[0], posts[1]), (posts[2], posts[3])):
        k.tube('dsteel', [(xa + (xb - xa) * i / 6, ya + (yb - ya) * i / 6, 0.7 - 0.22 * math.sin(math.pi * i / 6)) for i in range(7)], 0.018, 4)
    return k.done(G)


SHEETS = [
    ('civic_a', ['church_spire', 'bandstand_gazebo', 'flagpole_tall'], 'shot', dict(gap=1.5, elev=12)),
    ('civic_b', ['fountain_park', 'statue_plinth', 'war_memorial', 'clock_face'], 'shot', dict(gap=1.0, elev=14)),
]


def build():
    for f in (church_spire, clock_face, bandstand_gazebo, fountain_park, statue_plinth, flagpole_tall, war_memorial):
        f()

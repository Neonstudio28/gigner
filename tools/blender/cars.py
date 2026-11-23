"""
Builds Pine Hollow's vehicle bodies in Blender and exports them as one GLB.

    blender -b --python tools/blender/cars.py -- public/assets/models/vehicles.glb [preview.png]

Every body is a loft through cross-sections (so it has tumblehome, a crowned roof and a tapered nose rather
than an extruded silhouette), with inset glazing, boolean-cut wheel wells and separately modelled lamps,
bumpers, grilles, mirrors and trim. Material slots are named for what they are (body, accent, glass,
chrome, ...); the game maps those names onto its own palette, so one mesh serves every paint colour.

Axes: +X forward, +Y left, +Z up in Blender, which the glTF exporter turns into the game's +X forward / +Y up.
"""
import bpy, bmesh, math, sys, os
from mathutils import Matrix, Vector

MATS = ['body', 'accent', 'glass', 'chrome', 'trim', 'lamp', 'tail', 'amber', 'plate', 'rubber', 'steel', 'stripe', 'under']
MI = {n: i for i, n in enumerate(MATS)}
PREVIEW = {
    'body': (0.32, 0.06, 0.05), 'accent': (0.75, 0.73, 0.68), 'glass': (0.02, 0.03, 0.04), 'chrome': (0.7, 0.72, 0.74),
    'trim': (0.03, 0.03, 0.03), 'lamp': (0.9, 0.88, 0.75), 'tail': (0.5, 0.02, 0.02), 'amber': (0.8, 0.3, 0.03),
    'plate': (0.85, 0.85, 0.8), 'rubber': (0.015, 0.015, 0.015), 'steel': (0.45, 0.46, 0.47), 'stripe': (0.9, 0.9, 0.86),
    'under': (0.02, 0.02, 0.02),
}


def S(x, zb, wb, zs, zbelt, wt, ztop, crown=0.02):
    """One cross-section: floor height, half-width, shoulder height, beltline, half-width and height of the top."""
    return (x, zb, wb, zs, zbelt, wt, ztop, crown)


def section(s):
    x, zb, wb, zs, zbelt, wt, ztop, crown = s
    return [
        (0.0, zb),
        (wb - 0.11, zb),
        (wb - 0.012, zb + 0.1),
        (wb, zs),
        (wb - 0.022, zbelt),
        (wt, ztop),
        (wt * 0.55, ztop + crown * 0.8),
        (0.0, ztop + crown),
    ]


def lerp(a, b, t):
    return a + (b - a) * t


class Car:
    def __init__(self, name, stations, segs, wheels, r, track_inset=0.16):
        self.name = name
        self.st = stations
        self.segs = segs
        self.wheels = wheels
        self.r = r
        self.inset = track_inset
        self.bm = bmesh.new()  # details, joined to the body after the wheel wells are cut
        self.cutters = bmesh.new()

    # --- body surface queries -------------------------------------------------------------------------
    def sect(self, x):
        st = self.st
        if x >= st[0][0]:
            return section(st[0])
        for a, b in zip(st, st[1:]):
            if b[0] <= x <= a[0]:
                t = (a[0] - x) / max(1e-6, a[0] - b[0])
                return section(tuple(lerp(p, q, t) for p, q in zip(a, b)))
        return section(st[-1])

    def side_y(self, x, z):
        p = self.sect(x)[1:6]
        if z <= p[0][1]:
            return p[0][0]
        for (y0, z0), (y1, z1) in zip(p, p[1:]):
            if z0 <= z <= z1:
                return lerp(y0, y1, (z - z0) / max(1e-6, z1 - z0))
        return p[-1][0]

    def top_z(self, x, y):
        p = self.sect(x)[5:8]
        y = abs(y)
        for (y0, z0), (y1, z1) in zip(p, p[1:]):
            if y1 <= y <= y0:
                return lerp(z0, z1, (y0 - y) / max(1e-6, y0 - y1))
        return p[0][1]

    def xs_between(self, x0, x1):
        lo, hi = min(x0, x1), max(x0, x1)
        return sorted({lo, hi, *[s[0] for s in self.st if lo < s[0] < hi]})

    # --- details --------------------------------------------------------------------------------------
    def box(self, mat, x, y, z, sx, sy, sz, sym=False, pitch=0.0, yaw=0.0, bm=None):
        bm = bm or self.bm
        for s in ((1, -1) if sym else (1,)):
            m = Matrix.Translation((x, y * s, z)) @ Matrix.Rotation(yaw * s, 4, 'Z') @ Matrix.Rotation(pitch, 4, 'Y') @ Matrix.Diagonal((sx, sy, sz, 1))
            r = bmesh.ops.create_cube(bm, size=1, matrix=m)
            for f in {f for v in r['verts'] for f in v.link_faces}:
                f.material_index = MI[mat]

    def cyl(self, mat, x, y, z, r, length, axis='Y', seg=10, sym=False, bm=None):
        bm = bm or self.bm
        rot = {'Y': Matrix.Rotation(math.pi / 2, 4, 'X'), 'X': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'Z': Matrix.Identity(4)}[axis]
        for s in ((1, -1) if sym else (1,)):
            r_ = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=length, matrix=Matrix.Translation((x, y * s, z)) @ rot)
            for f in {f for v in r_['verts'] for f in v.link_faces}:
                f.material_index = MI[mat]

    def side_patch(self, mat, x0, x1, z0, z1, off=0.004, rows=3):
        """Skin lying on the body side between two stations and two heights (seams, mouldings, two-tone)."""
        xs = self.xs_between(x0, x1)
        zs = [lerp(z0, z1, i / rows) for i in range(rows + 1)]
        for s in (1, -1):
            grid = [[self.bm.verts.new((x, s * (self.side_y(x, z) + off), z)) for z in zs] for x in xs]
            for i in range(len(xs) - 1):
                for j in range(rows):
                    q = (grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1])
                    f = self.bm.faces.new(q if s < 0 else q[::-1])
                    f.material_index = MI[mat]

    def top_patch(self, mat, x0, x1, y0, y1, off=0.004):
        xs = self.xs_between(x0, x1)
        ys = sorted({y0, y1, *[y for y in (0.0,) if y0 < y < y1]})
        grid = [[self.bm.verts.new((x, y, self.top_z(x, y) + off)) for y in ys] for x in xs]
        for i in range(len(xs) - 1):
            for j in range(len(ys) - 1):
                f = self.bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
                f.material_index = MI[mat]

    def seam(self, x, z0=None, z1=None):
        s = self.sect(x)
        self.side_patch('trim', x - 0.007, x + 0.007, z0 if z0 is not None else s[2][1] + 0.02, z1 if z1 is not None else s[4][1] - 0.01, 0.003)

    def handle(self, x, z):
        self.box('chrome', x, self.side_y(x, z) + 0.008, z, 0.17, 0.03, 0.04, sym=True)

    def mirror(self, x, z, big=False):
        y = self.side_y(x, z)
        self.box('trim', x, y + 0.07, z, 0.05, 0.16, 0.04, sym=True)
        if big:
            self.box('chrome', x - 0.01, y + 0.2, z + 0.06, 0.05, 0.1, 0.3, sym=True)
        else:
            self.box('body', x - 0.01, y + 0.17, z + 0.03, 0.09, 0.16, 0.11, sym=True)

    def wipers(self, x, z, w):
        for s in (1, -1):
            self.box('trim', x, s * w * 0.45 - 0.1, z, 0.03, w * 0.75, 0.02, pitch=0.0)

    # --- body -----------------------------------------------------------------------------------------
    def build(self):
        bm = bmesh.new()
        rings = []
        for s in self.st:
            pts = section(s)
            rings.append([bm.verts.new((s[0], y, z)) for y, z in pts] + [bm.verts.new((s[0], -y, z)) for y, z in reversed(pts[1:-1])])
        n = len(rings[0])
        side_glass, top_groups = [], []
        for i, (a, b) in enumerate(zip(rings, rings[1:])):
            side, top, sg, tg = self.segs[i]
            grp = []
            for j in range(n):
                f = bm.faces.new((a[j], a[(j + 1) % n], b[(j + 1) % n], b[j]))
                if j in (4, 9):
                    f.material_index = MI[side]
                    if sg:
                        side_glass.append(f)
                elif j in (5, 6, 7, 8):
                    f.material_index = MI[top]
                    if tg:
                        grp.append(f)
                elif j in (0, 13):
                    f.material_index = MI['under']
                else:
                    f.material_index = MI['body']
            if grp:
                top_groups.append(grp)
        bm.faces.new(rings[0]).material_index = MI['body']
        bm.faces.new(rings[-1][::-1]).material_index = MI['body']
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        if side_glass:
            bmesh.ops.inset_individual(bm, faces=side_glass, thickness=0.042, depth=-0.012, use_even_offset=True)
            for f in side_glass:
                f.material_index = MI['glass']
        for grp in top_groups:
            bmesh.ops.inset_region(bm, faces=grp, thickness=0.05, depth=-0.01, use_boundary=True, use_even_offset=True)
            for f in grp:
                f.material_index = MI['glass']

        # wheel wells
        hw = max(s[2] for s in self.st)
        ra = self.r + 0.075
        for wx in self.wheels:
            self.cyl('under', wx, hw - 0.05, self.r, ra, 0.7, 'Y', 16, sym=True, bm=self.cutters)

        body = to_object(self.name + '_raw', bm)
        cut = to_object(self.name + '_cut', self.cutters)
        m = body.modifiers.new('wells', 'BOOLEAN')
        m.operation = 'DIFFERENCE'
        m.solver = 'EXACT'
        m.object = cut
        m.material_mode = 'INDEX'
        m.use_self = True
        dg = bpy.context.evaluated_depsgraph_get()
        mesh = bpy.data.meshes.new_from_object(body.evaluated_get(dg))
        bpy.data.objects.remove(cut)
        bpy.data.objects.remove(body)
        out = bmesh.new()
        out.from_mesh(mesh)
        tmp = bpy.data.meshes.new('tmp')
        self.bm.normal_update()
        self.bm.to_mesh(tmp)
        out.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
        return to_object(self.name, out)


def to_object(name, bm):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for n in MATS:
        me.materials.append(bpy.data.materials[n])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ----------------------------------------------------------------------------------------------------
# shared front / rear ends


def bumper(c, x, z, hw, mat='chrome', h=0.15, d=0.14, front=True, guards=True, rub=True):
    sx = 1 if front else -1
    c.box(mat, x + sx * 0.03, 0, z, d, hw * 2 + 0.05, h)
    c.box(mat, x - sx * 0.14, hw + 0.012, z, 0.34, 0.035, h, sym=True)  # wrap-around ends
    if rub:
        c.box('trim', x + sx * (0.03 + d / 2), 0, z, 0.02, hw * 2 - 0.1, h * 0.36)
    if guards:
        c.box(mat, x + sx * (0.05 + d / 2), 0.36, z + 0.02, 0.05, 0.07, h + 0.08, sym=True)
    c.box('plate', x + sx * (0.045 + d / 2), 0, z, 0.012, 0.32, 0.15)


def face_sedan(c, x, z0, z1, hw, quad=True):
    """Chrome-framed egg-crate grille between rectangular sealed beams, amber corner lamps."""
    h = z1 - z0
    zc = (z0 + z1) / 2
    gw = hw * 0.95
    c.box('trim', x + 0.006, 0, zc, 0.03, gw, h * 0.78)
    c.box('chrome', x + 0.012, 0, zc + h * 0.4, 0.035, gw + 0.04, 0.025)
    c.box('chrome', x + 0.012, 0, zc - h * 0.4, 0.035, gw + 0.04, 0.025)
    for i in range(1, 4):
        c.box('chrome', x + 0.02, 0, zc - h * 0.4 + i * h * 0.2, 0.02, gw, 0.012)
    for i in range(-3, 4):
        c.box('chrome', x + 0.02, i * gw / 8, zc, 0.02, 0.012, h * 0.76)
    lw = hw - gw / 2 - 0.1
    ly = gw / 2 + 0.03 + lw / 2
    c.box('chrome', x + 0.008, ly, zc, 0.03, lw + 0.03, h * 0.82, sym=True)
    if quad:
        for k in (-1, 1):
            c.box('lamp', x + 0.018, ly + k * lw * 0.24, zc, 0.03, lw * 0.44, h * 0.6, sym=True)
    else:
        c.box('lamp', x + 0.018, ly, zc, 0.03, lw * 0.92, h * 0.62, sym=True)
    c.box('amber', x - 0.03, hw - 0.03, zc, 0.16, 0.05, h * 0.5, sym=True)


def tail_sedan(c, x, z0, z1, hw):
    h = z1 - z0
    zc = (z0 + z1) / 2
    lw = hw * 0.62
    ly = hw - 0.06 - lw / 2
    c.box('chrome', x - 0.008, ly, zc, 0.03, lw + 0.03, h + 0.03, sym=True)
    c.box('tail', x - 0.018, ly + lw * 0.17, zc, 0.03, lw * 0.62, h, sym=True)
    c.box('lamp', x - 0.018, ly - lw * 0.33, zc + h * 0.14, 0.03, lw * 0.3, h * 0.6, sym=True)
    c.box('amber', x - 0.018, ly - lw * 0.33, zc - h * 0.34, 0.03, lw * 0.3, h * 0.28, sym=True)
    c.box('chrome', x - 0.012, 0, zc + h * 0.75, 0.03, 0.2, 0.03)  # trunk lock / badge


def exhaust(c, x, y, z):
    c.cyl('chrome', x, y, z, 0.035, 0.22, 'X', 8)


B, A, G = 'body', 'accent', 'glass'


def sedan(wagon=False):
    hw = 0.975
    front = [
        S(2.66, 0.42, 0.89, 0.64, 0.80, 0.79, 0.82, 0.01),
        S(2.52, 0.30, hw, 0.66, 0.87, 0.875, 0.90, 0.02),
        S(1.06, 0.28, hw, 0.68, 0.965, 0.865, 0.995, 0.035),
        S(0.34, 0.28, hw, 0.68, 0.975, 0.725, 1.405, 0.03),
        S(-0.30, 0.28, hw, 0.68, 0.975, 0.73, 1.425, 0.035),
    ]
    if wagon:
        st = front + [
            S(-1.36, 0.28, hw, 0.68, 0.975, 0.73, 1.425, 0.035),
            S(-2.36, 0.28, hw, 0.68, 0.975, 0.72, 1.40, 0.03),
            S(-2.60, 0.30, hw, 0.66, 0.955, 0.86, 0.985, 0.01),
            S(-2.67, 0.42, 0.90, 0.64, 0.86, 0.80, 0.88, 0.0),
        ]
        segs = [(B, B, 0, 0), (B, B, 0, 0), (A, A, 1, 1), (A, A, 1, 0), (A, A, 1, 0), (A, A, 1, 0), (A, A, 0, 1), (B, B, 0, 0)]
    else:
        st = front + [
            S(-0.98, 0.28, hw, 0.68, 0.975, 0.725, 1.405, 0.03),
            S(-1.64, 0.28, hw, 0.68, 0.965, 0.865, 0.99, 0.02),
            S(-2.52, 0.30, hw, 0.66, 0.935, 0.865, 0.955, 0.02),
            S(-2.66, 0.42, 0.90, 0.64, 0.86, 0.80, 0.88, 0.01),
        ]
        segs = [(B, B, 0, 0), (B, B, 0, 0), (A, A, 1, 1), (A, A, 1, 0), (A, A, 1, 0), (A, A, 0, 1), (B, B, 0, 0), (B, B, 0, 0)]
    c = Car('wagon' if wagon else 'sedan', st, segs, [1.55, -1.5], 0.36)
    face_sedan(c, 2.66, 0.60, 0.80, 0.89)
    bumper(c, 2.66, 0.47, 0.93)
    c.box('amber', 2.70, 0.62, 0.47, 0.03, 0.2, 0.05, sym=True)
    if wagon:
        c.box('tail', -2.67, 0.82, 0.74, 0.04, 0.13, 0.26, sym=True)
        c.box('lamp', -2.675, 0.82, 0.65, 0.04, 0.11, 0.06, sym=True)
        c.box('chrome', -2.675, 0, 0.83, 0.03, 0.5, 0.035)
        for y in (-0.5, 0.5):  # roof rack
            c.box('chrome', -1.2, y, c.top_z(-1.2, y) + 0.05, 2.1, 0.03, 0.025)
        for x in (-0.3, -1.2, -2.1):
            c.box('chrome', x, 0, c.top_z(x, 0.5) + 0.065, 0.03, 1.08, 0.02)
        c.seam(-1.38)
    else:
        tail_sedan(c, -2.66, 0.66, 0.84, 0.90)
        c.seam(-1.02, z1=0.95)
    bumper(c, -2.67 if wagon else -2.66, 0.47, 0.93, front=False)
    c.mirror(0.98, 1.0)
    for x in (0.96, -0.31):
        c.seam(x)
    for x in (-0.08, -1.1 if wagon else -0.78):
        c.handle(x, 0.86)
    c.side_patch('chrome', -1.0, 1.05, 0.585, 0.615, 0.008, rows=1)  # rub strip between the arches
    c.side_patch('chrome', 2.05, 2.5, 0.585, 0.615, 0.008, rows=1)
    c.side_patch('chrome', -2.5, -2.0, 0.585, 0.615, 0.008, rows=1)
    c.side_patch('trim', -1.0, 1.05, 0.30, 0.40, 0.004, rows=1)  # rocker
    c.box('trim', 1.0, 0.33, 1.0, 0.04, 0.6, 0.02, sym=True)  # wipers parked on the cowl
    exhaust(c, -2.6, -0.6, 0.3)
    return c


def coupe():
    hw = 0.95
    st = [
        S(2.50, 0.40, 0.87, 0.62, 0.77, 0.77, 0.785, 0.01),
        S(2.36, 0.29, hw, 0.64, 0.83, 0.85, 0.855, 0.025),
        S(0.78, 0.27, hw, 0.66, 0.92, 0.84, 0.95, 0.05),
        S(0.08, 0.27, hw, 0.66, 0.93, 0.69, 1.30, 0.03),
        S(-0.72, 0.27, hw, 0.66, 0.93, 0.69, 1.30, 0.03),
        S(-1.78, 0.27, hw, 0.68, 0.95, 0.84, 0.985, 0.02),
        S(-2.36, 0.30, hw, 0.68, 0.94, 0.84, 0.97, 0.02),
        S(-2.50, 0.42, 0.88, 0.66, 0.87, 0.78, 0.89, 0.01),
    ]
    segs = [(B, B, 0, 0), (B, B, 0, 0), (B, B, 1, 1), (B, B, 1, 0), (B, B, 1, 1), (B, B, 0, 0), (B, B, 0, 0)]
    c = Car('coupe', st, segs, [1.5, -1.45], 0.35)
    # full-width blacked-out grille with four lamps
    c.box('trim', 2.505, 0, 0.675, 0.03, 1.62, 0.17)
    c.box('chrome', 2.51, 0, 0.765, 0.03, 1.66, 0.02)
    for y in (0.7, 0.5):
        c.box('lamp', 2.52, y, 0.675, 0.03, 0.17, 0.13, sym=True)
    c.box('amber', 2.56, 0.5, 0.5, 0.03, 0.22, 0.05, sym=True)
    bumper(c, 2.5, 0.5, 0.9, h=0.11, d=0.12, guards=False, rub=False)
    c.box('body', 2.45, 0, 0.36, 0.1, 1.6, 0.12)  # air dam
    c.box('trim', 1.4, 0, c.top_z(1.4, 0) + 0.02, 0.9, 0.5, 0.06)  # hood scoop
    # tail: three-segment lamps in a blacked-out panel, ducktail spoiler
    c.box('trim', -2.505, 0, 0.76, 0.03, 1.6, 0.17)
    for y in (0.72, 0.56, 0.4):
        c.box('tail', -2.515, y, 0.76, 0.03, 0.13, 0.12, sym=True)
    c.box('body', -2.38, 0, 1.0, 0.24, 1.74, 0.035, pitch=-0.18)
    c.box('body', -2.38, 0.83, 0.97, 0.22, 0.04, 0.08, sym=True)
    bumper(c, -2.5, 0.52, 0.9, h=0.11, d=0.12, front=False, guards=False, rub=False)
    c.mirror(0.7, 0.96)
    c.seam(0.72)
    c.seam(-0.74)
    c.handle(-0.5, 0.84)
    c.side_patch('trim', -0.98, 1.02, 0.29, 0.39, 0.004, rows=1)
    c.box('trim', 0.72, 0.3, 0.955, 0.04, 0.55, 0.02, sym=True)
    for y in (-0.55, 0.55):
        exhaust(c, -2.45, y, 0.3)
    # optional rally stripes (their own slot so the game can leave them off)
    for x0, x1 in ((0.8, 2.36), (-0.72, 0.08), (-2.36, -1.78)):
        for y0, y1 in ((0.07, 0.3), (-0.3, -0.07)):
            c.top_patch('stripe', x0, x1, y0, y1, 0.006)
    return c


def truck(suv=False):
    hw = 1.0
    front = [
        S(2.76, 0.50, 0.93, 0.80, 0.99, 0.85, 1.01, 0.005),
        S(2.64, 0.40, hw, 0.82, 1.07, 0.90, 1.10, 0.02),
        S(1.16, 0.38, hw, 0.84, 1.125, 0.90, 1.155, 0.035),
        S(0.60, 0.38, hw, 0.84, 1.135, 0.80, 1.72, 0.03),
    ]
    if suv:
        st = front + [
            S(-0.42, 0.38, hw, 0.84, 1.135, 0.80, 1.745, 0.035),
            S(-1.48, 0.38, hw, 0.84, 1.135, 0.80, 1.745, 0.035),
            S(-2.50, 0.38, hw, 0.84, 1.135, 0.80, 1.72, 0.03),
            S(-2.70, 0.40, hw, 0.84, 1.12, 0.90, 1.15, 0.0),
            S(-2.76, 0.50, 0.96, 0.82, 1.08, 0.87, 1.10, 0.0),
        ]
        segs = [(B, B, 0, 0), (B, B, 0, 0), (A, A, 1, 1), (A, A, 1, 0), (A, A, 1, 0), (A, A, 1, 0), (A, A, 0, 1), (B, B, 0, 0)]
    else:
        st = front + [
            S(-0.40, 0.38, hw, 0.84, 1.135, 0.80, 1.72, 0.03),
            S(-0.52, 0.38, hw, 0.84, 1.135, 0.90, 1.165, 0.0),
            S(-2.70, 0.40, hw, 0.84, 1.135, 0.90, 1.165, 0.0),
            S(-2.76, 0.48, 0.985, 0.84, 1.125, 0.89, 1.155, 0.0),
        ]
        segs = [(B, B, 0, 0), (B, B, 0, 0), (A, A, 1, 1), (A, A, 1, 0), (A, A, 0, 1), (B, B, 0, 0), (B, B, 0, 0)]
    c = Car('suv' if suv else 'pickup', st, segs, [1.7, -1.65], 0.40)
    if not suv:
        c.box('body', -1.62, 0, 1.25, 2.06, 1.76, 0.74, bm=c.cutters)  # the bed (floor sits just above the tyres)
        for x in (-0.75, -1.3, -1.95, -2.5):
            c.box('trim', x, 0, 0.885, 0.03, 1.74, 0.012)  # bed ribs
    # front: stacked sealed beams either side of a chrome egg-crate grille
    zc = 0.895
    c.box('chrome', 2.765, 0, zc, 0.03, 1.74, 0.21)
    c.box('trim', 2.775, 0, zc, 0.03, 1.02, 0.16)
    for i in range(-2, 3):
        c.box('chrome', 2.785, i * 0.2, zc, 0.02, 0.014, 0.16)
    c.box('chrome', 2.785, 0, zc, 0.02, 1.02, 0.014)
    for z in (zc - 0.052, zc + 0.052):
        c.box('lamp', 2.782, 0.69, z, 0.03, 0.27, 0.085, sym=True)
    c.box('amber', 2.782, 0.69, zc - 0.135, 0.03, 0.27, 0.04, sym=True)
    bumper(c, 2.76, 0.62, 0.97, h=0.17, d=0.16, rub=False)
    c.box('trim', 2.7, 0, 0.47, 0.12, 1.5, 0.14)  # valance
    if suv:
        c.box('tail', -2.765, 0.9, 0.86, 0.03, 0.1, 0.36, sym=True)
        c.box('lamp', -2.77, 0.9, 0.72, 0.03, 0.09, 0.07, sym=True)
        c.box('chrome', -2.77, 0.3, 0.98, 0.03, 0.2, 0.04)
        c.cyl('rubber', -2.86, -0.28, 0.93, 0.36, 0.2, 'X', 14)  # spare
        c.cyl('accent', -2.965, -0.28, 0.93, 0.2, 0.02, 'X', 12)
        c.seam(-0.44)
        c.handle(-0.2, 1.0)
        for y in (-0.52, 0.52):
            c.box('chrome', -1.4, y, c.top_z(-1.4, y) + 0.05, 2.0, 0.03, 0.025)
        for x in (-0.5, -1.4, -2.3):
            c.box('chrome', x, 0, c.top_z(x, 0.52) + 0.065, 0.03, 1.1, 0.02)
    else:
        c.box('tail', -2.765, 0.9, 0.9, 0.03, 0.11, 0.34, sym=True)
        c.box('lamp', -2.77, 0.9, 0.76, 0.03, 0.1, 0.06, sym=True)
        c.box('chrome', -2.768, 0, 1.05, 0.03, 0.2, 0.05)  # tailgate latch
        c.box('trim', -2.762, 0.78, 0.84, 0.012, 0.012, 0.58, sym=True)  # tailgate seams
        c.seam(-0.5)
        c.handle(-0.26, 1.0)
    bumper(c, -2.76, 0.6, 0.97, h=0.16, d=0.2, front=False, guards=False, rub=False)
    c.mirror(1.1, 1.2, big=True)
    c.seam(1.12)
    c.side_patch('chrome', -1.1, 1.15, 0.685, 0.72, 0.008, rows=1)
    c.side_patch('trim', -1.1, 1.15, 0.40, 0.5, 0.004, rows=1)
    c.box('trim', 1.1, 0.34, 1.165, 0.04, 0.6, 0.02, sym=True)
    exhaust(c, -2.5, -0.75, 0.42)
    return c


def van():
    hw = 1.0
    st = [
        S(2.56, 0.48, 0.92, 0.80, 1.00, 0.84, 1.02, 0.005),
        S(2.44, 0.38, hw, 0.84, 1.12, 0.89, 1.15, 0.02),
        S(1.74, 0.36, hw, 0.86, 1.20, 0.89, 1.235, 0.03),
        S(1.14, 0.36, hw, 0.86, 1.22, 0.87, 1.99, 0.04),
        S(0.22, 0.36, hw, 0.86, 1.22, 0.87, 2.03, 0.045),
        S(-1.10, 0.36, hw, 0.86, 1.22, 0.87, 2.03, 0.045),
        S(-2.42, 0.36, hw, 0.86, 1.22, 0.87, 2.01, 0.04),
        S(-2.54, 0.46, 0.975, 0.86, 1.21, 0.85, 1.97, 0.02),
    ]
    segs = [(B, B, 0, 0), (B, B, 0, 0), (B, B, 1, 1), (B, B, 1, 0), (B, B, 0, 0), (B, B, 0, 0), (B, B, 0, 0)]
    c = Car('van', st, segs, [1.75, -1.55], 0.38)
    zc = 0.9
    c.box('chrome', 2.565, 0, zc, 0.03, 1.7, 0.2)
    c.box('trim', 2.575, 0, zc, 0.03, 1.0, 0.15)
    for i in range(1, 4):
        c.box('chrome', 2.585, 0, zc - 0.075 + i * 0.0375, 0.02, 1.0, 0.012)
    c.box('lamp', 2.582, 0.68, zc + 0.02, 0.03, 0.26, 0.13, sym=True)
    c.box('amber', 2.582, 0.68, zc - 0.075, 0.03, 0.26, 0.04, sym=True)
    bumper(c, 2.56, 0.6, 0.96, h=0.16, d=0.15, rub=False)
    for y in (0.4, -0.4):  # twin rear doors with windows
        c.box('glass', -2.545, y, 1.62, 0.02, 0.56, 0.42)
        c.box('trim', -2.54, y, 1.62, 0.02, 0.62, 0.48)
    c.box('trim', -2.548, 0, 1.2, 0.012, 0.014, 1.5)
    c.box('chrome', -2.56, 0.09, 1.08, 0.03, 0.05, 0.14)
    c.box('tail', -2.548, 0.9, 0.98, 0.03, 0.1, 0.4, sym=True)
    c.box('lamp', -2.552, 0.9, 0.84, 0.03, 0.09, 0.07, sym=True)
    bumper(c, -2.54, 0.58, 0.96, h=0.15, d=0.16, front=False, guards=False, rub=False)
    c.mirror(1.55, 1.34, big=True)
    c.seam(1.72, z1=1.2)
    c.seam(0.24, z1=1.9)
    c.seam(-1.08, z1=1.9)
    c.handle(0.48, 1.08)
    c.side_patch('trim', -2.3, -1.08, 1.275, 1.29, 0.004, rows=1)  # sliding-door track
    c.side_patch('trim', -1.0, 1.7, 0.38, 0.48, 0.004, rows=1)
    c.box('trim', 1.68, 0.34, 1.245, 0.04, 0.6, 0.02, sym=True)
    exhaust(c, -2.45, -0.72, 0.4)
    return c


def wheel():
    """Unit wheel (radius 1, width 1), axle on Y, outer face towards -Y."""
    bm = bmesh.new()
    prof = [
        (0.0, 0.40, 'chrome'), (0.2, 0.39, 'chrome'), (0.26, 0.33, 'steel'), (0.5, 0.3, 'steel'), (0.57, 0.42, 'chrome'),
        (0.63, 0.5, 'rubber'), (0.9, 0.5, 'rubber'), (1.0, 0.36, 'rubber'), (1.0, -0.36, 'rubber'), (0.9, -0.5, 'rubber'),
        (0.62, -0.5, 'under'), (0.55, -0.25, 'under'), (0.0, -0.25, 'under'),
    ]
    n = 14
    rings = []
    for r, a, _ in prof:
        if r == 0:
            rings.append([bm.verts.new((0, -a, 0))])
        else:
            rings.append([bm.verts.new((r * math.cos(i / n * math.tau), -a, r * math.sin(i / n * math.tau))) for i in range(n)])
    for k in range(len(prof) - 1):
        a, b = rings[k], rings[k + 1]
        for i in range(n):
            j = (i + 1) % n
            if len(a) == 1:
                f = bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                f = bm.faces.new((a[i], a[j], b[0]))
            else:
                f = bm.faces.new((a[i], a[j], b[j], b[i]))
            f.material_index = MI[prof[k][2]]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for i in range(5):  # slots in the steel wheel, so a spinning wheel reads as spinning
        t = i / 5 * math.tau
        m = Matrix.Translation((0.39 * math.cos(t), -0.325, 0.39 * math.sin(t))) @ Matrix.Rotation(-t, 4, 'Y') @ Matrix.Diagonal((0.07, 0.03, 0.16, 1))
        r = bmesh.ops.create_cube(bm, size=1, matrix=m)
        for f in {f for v in r['verts'] for f in v.link_faces}:
            f.material_index = MI['under']
    return to_object('wheel', bm)


def preview(cars, objs, w, path):
    sc = bpy.context.scene
    for i, (c, o) in enumerate(zip(cars, objs)):
        o.location = ((i // 3) * -7.5, (i % 3) * 3.4 - 3.4, 0)
        for wx in c.wheels:
            for s in (1, -1):
                d = bpy.data.objects.new('w', w.data)
                sc.collection.objects.link(d)
                d.location = (o.location.x + wx, o.location.y + s * (max(x[2] for x in c.st) - c.inset), c.r)
                d.scale = (c.r, 0.26, c.r)
                d.rotation_euler = (0, 0, 0 if s < 0 else math.pi)
    w.location = (0, 0, -50)
    bpy.ops.mesh.primitive_plane_add(size=200)
    m = bpy.data.materials.new('ground')
    m.diffuse_color = (0.3, 0.3, 0.3, 1)
    bpy.context.object.data.materials.append(m)
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.75, 0.8, 0.9, 1)
    sc.world = world
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), 0, math.radians(120))
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.lens = 50
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.render.resolution_x = 1600
    sc.render.resolution_y = 900
    base, ext = os.path.splitext(os.path.abspath(path))
    for tag, pos in (('front', (13, -11, 4.2)), ('rear', (-20, 11, 4.2)), ('side', (-3.75, -22, 1.6))):
        cam.location = pos
        d = Vector((-3.75, 0, 0.7)) - Vector(pos)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = f'{base}_{tag}{ext}'
        bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = os.path.abspath(argv[0]) if argv else os.path.abspath('vehicles.glb')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for n in MATS:
        m = bpy.data.materials.new(n)
        m.diffuse_color = (*PREVIEW[n], 1)
        m.use_nodes = True
        bsdf = m.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (*PREVIEW[n], 1)
        bsdf.inputs['Roughness'].default_value = 0.15 if n in ('glass', 'chrome') else 0.45
        bsdf.inputs['Metallic'].default_value = 1.0 if n in ('chrome', 'steel') else 0.0
    cars = [sedan(False), sedan(True), coupe(), truck(False), truck(True), van()]
    objs = [c.build() for c in cars]
    w = wheel()
    for o in objs + [w]:
        print(o.name, 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_texcoords=False,
                              export_normals=True, export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False)
    print('wrote', out, os.path.getsize(out))
    if len(argv) > 1:
        preview(cars, objs, w, argv[1])


main()

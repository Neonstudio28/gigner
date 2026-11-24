"""Shared shape language for the structures family: closed chamfered primitives, sweeps and lathes that all
write into one bmesh per asset. Every primitive is a closed shell, oriented on creation, so nothing is ever
single-sided and normals never depend on a later recalculation."""
import bpy, bmesh, math
from contextlib import contextmanager
from mathutils import Matrix, Vector
import lib

# name -> (material name or key, sRGB). A name with '__' is a labelled material the engine may recolour.
PAL = {
    # engine-facing labels
    'signface': ('paint__signface', '#f1eee4'), 'stripe': ('paint__stripe', '#c8402f'), 'body': ('paint__body', '#3f6f9e'),
    'fabric': ('paint__fabric', '#b8352c'), 'fabric2': ('paint__fabric2', '#efe9da'), 'door': ('paint__door', '#35604f'),
    'hull': ('paint__hull', '#e9e4d6'), 'flag': ('paint__flag', '#b23a34'), 'wood': ('paint__wood', '#b98a56'),
    'bulb': ('light__bulb', '#ffe6a0'), 'lpanel': ('light__panel', '#fff6dc'), 'water': ('clear__water', '#58a8cc'),
    'glass': ('clear', '#a9c6d2'), 'dglass': ('glass', '#26323b'),
    # metals
    'steel': ('metal', '#8b9198'), 'dsteel': ('metal', '#4c5258'), 'galv': ('metal', '#b4babd'), 'zinc': ('metal', '#9aa3a6'),
    'alu': ('metal', '#c9cdd0'), 'chrome': ('chrome', '#d8dcde'), 'rust': ('paint', '#8a5a3c'), 'brass': ('metal', '#b8944a'),
    'bronze': ('metal', '#5f6b52'), 'iron': ('paint', '#2b2e31'),
    # paints
    'white': ('paint', '#ecebe5'), 'cream': ('paint', '#e4dac0'), 'stone': ('paint', '#cfc7b4'), 'stone2': ('paint', '#b3ab99'),
    'conc': ('paint', '#b7b4ab'), 'dconc': ('paint', '#8d8b85'), 'asphalt': ('paint', '#4a4c50'), 'black': ('paint', '#222326'),
    'grey': ('paint', '#9a9c9e'), 'lgrey': ('paint', '#c6c7c5'), 'dgrey': ('paint', '#5c6066'),
    'brick': ('paint', '#9c4b3c'), 'brick2': ('paint', '#7d3b31'), 'mortar': ('paint', '#c9bfae'),
    'red': ('paint', '#bf3a2f'), 'dred': ('paint', '#8e2b26'), 'barn': ('paint', '#a5342b'), 'orange': ('paint', '#dd7a2c'),
    'yellow': ('paint', '#e3b83a'), 'green': ('paint', '#3d7a52'), 'dgreen': ('paint', '#2c5644'), 'lgreen': ('paint', '#7fae5a'),
    'leaf': ('paint', '#4f8a45'), 'blue': ('paint', '#3f6ea4'), 'lblue': ('paint', '#7fb0d0'), 'navy': ('paint', '#2b3e5c'),
    'teal': ('paint', '#3f8f8a'), 'pink': ('paint', '#ec8fb0'), 'dough': ('paint', '#d9a25e'), 'purple': ('paint', '#7a5aa0'),
    'tan': ('paint', '#c8b08a'), 'slate': ('paint', '#4d5762'), 'roof': ('paint', '#5b6670'), 'roofred': ('paint', '#8c4338'),
    'pool': ('paint', '#9fd3df'), 'tile': ('paint', '#d9cfb8'), 'tile2': ('paint', '#b9a98a'),
    # woods and naturals
    'wood1': ('paint', '#c9a36c'), 'wood2': ('paint', '#a8794a'), 'wood3': ('paint', '#7a5333'), 'wood4': ('paint', '#5a3d27'),
    'wold': ('paint', '#8d7a62'), 'ply': ('paint', '#d6b782'), 'endgrain': ('paint', '#e2c690'), 'bark': ('paint', '#6b4a32'),
    'hay': ('paint', '#d6b658'), 'hay2': ('paint', '#b8973f'), 'dirt': ('paint', '#7d5c40'), 'dirt2': ('paint', '#65482f'),
    'gravel': ('paint', '#9b9890'), 'gravel2': ('paint', '#7f7c75'), 'rubber': ('rubber', '#1b1b1d'), 'rope': ('paint', '#b79f6e'),
    'canvas': ('paint', '#d8cfb6'), 'skin': ('paint', '#d9b08c'), 'denim': ('paint', '#4a6485'), 'straw': ('paint', '#e0c36a'),
    'lamp': ('light', '#fff2c8'), 'redlamp': ('light', '#ff5540'),
}

ASSETS, EXTRAS, GROUPS = [], {}, {}


def rot(rx=0.0, ry=0.0, rz=0.0):
    return Matrix.Rotation(math.radians(rz), 4, 'Z') @ Matrix.Rotation(math.radians(ry), 4, 'Y') @ Matrix.Rotation(math.radians(rx), 4, 'X')


def axis_mx(axis):
    """Matrix turning local +Z onto `axis` ('X', 'Y', 'Z', '-X', '-Y', '-Z' or a vector)."""
    if isinstance(axis, str):
        return {'Z': Matrix.Identity(4), '-Z': rot(rx=180), 'X': rot(ry=90), '-X': rot(ry=-90), 'Y': rot(rx=-90), '-Y': rot(rx=90)}[axis]
    v = Vector(axis).normalized()
    return Vector((0, 0, 1)).rotation_difference(v).to_matrix().to_4x4()


def circle(r, n, a0=0.0, a1=360.0, cx=0.0, cy=0.0):
    """Polygon points on a circle or arc (degrees, counter-clockwise from +X)."""
    full = abs(a1 - a0) >= 360 - 1e-6
    k = n if full else n + 1
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(k)]


def rrect(w, h, r, n=3, cx=0.0, cy=0.0):
    """Rounded rectangle outline centred on (cx, cy)."""
    r = min(r, w / 2 - 1e-4, h / 2 - 1e-4)
    out = []
    for qx, qy, a in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        out += circle(r, n, a, a + 90, cx + qx * (w / 2 - r), cy + qy * (h / 2 - r))
    return out


def offset_poly(pts, d):
    """Offsets a simple polygon by d (positive = outwards) with mitred corners."""
    n = len(pts)
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    s = 1.0 if area > 0 else -1.0
    out = []
    for i in range(n):
        p, a, b = Vector(pts[i]), Vector(pts[i - 1]), Vector(pts[(i + 1) % n])
        e0, e1 = (p - a), (b - p)
        if e0.length < 1e-9 or e1.length < 1e-9:
            out.append(tuple(p))
            continue
        e0.normalize(); e1.normalize()
        n0, n1 = Vector((e0.y, -e0.x)) * s, Vector((e1.y, -e1.x)) * s
        m = n0 + n1
        if m.length < 1e-6:
            out.append(tuple(p + n0 * d))
            continue
        m.normalize()
        k = d / max(0.35, m.dot(n0))
        out.append(tuple(p + m * k))
    return out


def corr_profile(w, pitch, depth, t=0.02, flat=0.3, x0=None):
    """Closed outline of a corrugated sheet: trapezoid ribs on top, flat underside. u runs 0..w (or from x0)."""
    n = max(1, round(w / pitch))
    p = w / n
    x0 = -w / 2 if x0 is None else x0
    top = []
    r = (1 - 2 * flat) / 2
    for i in range(n):
        u = x0 + i * p
        top += [(u, t), (u + flat * p, t), (u + (flat + r) * p, t + depth), (u + (2 * flat + r) * p, t + depth)]
    top.append((x0 + w, t))
    return top + [(x0 + w, 0.0), (x0, 0.0)]


def _box_mesh(sx, sy, sz, b):
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    if b <= 0:
        v = [(x, y, z) for x in (-hx, hx) for y in (-hy, hy) for z in (-hz, hz)]
        return v, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    b = min(b, hx * 0.98, hy * 0.98, hz * 0.98)
    v, ix = [], {}
    for cx in (-1, 1):
        for cy in (-1, 1):
            for cz in (-1, 1):
                ix[cx, cy, cz, 0] = len(v); v.append((cx * hx, cy * (hy - b), cz * (hz - b)))
                ix[cx, cy, cz, 1] = len(v); v.append((cx * (hx - b), cy * hy, cz * (hz - b)))
                ix[cx, cy, cz, 2] = len(v); v.append((cx * (hx - b), cy * (hy - b), cz * hz))
    f = []
    for c in (-1, 1):
        f.append([ix[c, -1, -1, 0], ix[c, 1, -1, 0], ix[c, 1, 1, 0], ix[c, -1, 1, 0]])
        f.append([ix[-1, c, -1, 1], ix[1, c, -1, 1], ix[1, c, 1, 1], ix[-1, c, 1, 1]])
        f.append([ix[-1, -1, c, 2], ix[1, -1, c, 2], ix[1, 1, c, 2], ix[-1, 1, c, 2]])
        for d in (-1, 1):
            f.append([ix[c, d, -1, 0], ix[c, d, -1, 1], ix[c, d, 1, 1], ix[c, d, 1, 0]])
            f.append([ix[c, -1, d, 0], ix[c, -1, d, 2], ix[c, 1, d, 2], ix[c, 1, d, 0]])
            f.append([ix[-1, c, d, 1], ix[-1, c, d, 2], ix[1, c, d, 2], ix[1, c, d, 1]])
            for e in (-1, 1):
                f.append([ix[c, d, e, 0], ix[c, d, e, 1], ix[c, d, e, 2]])
    return v, f


def bounds(ob):
    """World-space box of an asset and its child parts."""
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in [ob, *ob.children_recursive] if o.type == 'MESH' for c in o.bound_box]
    return [min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]


class Kit:
    def __init__(self, name, pivot=None):
        self.name, self.pivot = name, pivot
        self.bm = bmesh.new()
        self.mats, self._mi = [], {}
        self.stack = [Matrix.Identity(4)]
        self.parts, self.faces = [], []

    # --- plumbing -------------------------------------------------------------------------------------
    def mi(self, spec):
        if spec not in self._mi:
            key, col = PAL[spec]
            self._mi[spec] = len(self.mats)
            self.mats.append(lib.mat(key, col) if '__' in key else lib.colour(key, col))
        return self._mi[spec]

    def add(self, mat, verts, faces):
        """Adds one closed shell and orients it outwards."""
        M, i = self.stack[-1], self.mi(mat)
        vs = [self.bm.verts.new(M @ Vector(v)) for v in verts]
        new = []
        for f in faces:
            f = [vs[j] for j in f]
            if len(set(f)) < 3:
                continue
            try:
                face = self.bm.faces.new(f)
            except ValueError:
                continue
            face.material_index = i
            new.append(face)
        bmesh.ops.recalc_face_normals(self.bm, faces=new)

    @contextmanager
    def at(self, x=0.0, y=0.0, z=0.0, rz=0.0, rx=0.0, ry=0.0, s=None, mx=None):
        M = self.stack[-1] @ Matrix.Translation((x, y, z)) @ rot(rx, ry, rz)
        if mx is not None:
            M = M @ mx
        if s is not None:
            M = M @ Matrix.Diagonal((*(s if isinstance(s, (tuple, list)) else (s, s, s)), 1))
        self.stack.append(M)
        try:
            yield self
        finally:
            self.stack.pop()

    def part(self, name, x, y, z):
        """Child object `<asset>.<name>` with its origin at (x, y, z); model it around its own origin."""
        k = Kit(f'{self.name}.{name}', pivot=(x, y, z))
        self.parts.append(k)
        return k

    def _object(self, parent=None):
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        if parent is not None:
            ob.parent = parent
            ob.location = self.pivot
        lib.finish(ob)
        return ob

    def done(self, group, mount='ground', **extras):
        ob = self._object()
        for p in self.parts:
            p._object(ob)
        ex = {'mount': mount, **extras}
        if self.faces:
            ex['face'] = self.faces[0][:5]
            ex['faces'] = self.faces
        if self.parts:      # lib.bounds() ignores the offset of child parts: record the true box
            lo, hi = bounds(ob)
            ex.setdefault('size', [round(hi[i] - lo[i], 3) for i in range(3)])
            ex.setdefault('min', [round(v, 3) for v in lo])
        ASSETS.append(ob)
        EXTRAS[ob.name] = ex
        GROUPS.setdefault(group, []).append(ob)
        return ob

    # --- primitives -----------------------------------------------------------------------------------
    def box(self, mat, x, y, z, sx, sy, sz, b=0.0, rz=0.0, rx=0.0, ry=0.0):
        """Chamfered box standing on z: centre (x, y), bottom at z. Rotations turn it about its base centre."""
        v, f = _box_mesh(sx, sy, sz, b)
        M = Matrix.Translation((x, y, z)) @ rot(rx, ry, rz) @ Matrix.Translation((0, 0, sz / 2))
        self.add(mat, [M @ Vector(p) for p in v], f)

    def cbox(self, mat, x, y, z, sx, sy, sz, b=0.0, rz=0.0, rx=0.0, ry=0.0):
        """Chamfered box by its true centre."""
        v, f = _box_mesh(sx, sy, sz, b)
        M = Matrix.Translation((x, y, z)) @ rot(rx, ry, rz)
        self.add(mat, [M @ Vector(p) for p in v], f)

    def ext(self, mat, x0, x1, y0, y1, z0, z1, b=0.0):
        self.cbox(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, abs(x1 - x0), abs(y1 - y0), abs(z1 - z0), b)

    def beam(self, mat, p0, p1, w, d, b=0.0, roll=0.0, ext=0.0):
        """Rectangular bar from p0 to p1: w is its horizontal thickness, d the other one."""
        p0, p1 = Vector(p0), Vector(p1)
        z = (p1 - p0)
        L = z.length
        z.normalize()
        x = Vector((0, 0, 1)).cross(z)
        x = Vector((1, 0, 0)) if x.length < 1e-6 else x.normalized()
        y = z.cross(x)
        M = Matrix((x, y, z)).transposed().to_4x4()
        M.translation = (p0 + p1) / 2
        v, f = _box_mesh(w, d, L + 2 * ext, b)
        M = M @ Matrix.Rotation(math.radians(roll), 4, 'Z')
        self.add(mat, [M @ Vector(p) for p in v], f)

    def lathe(self, mat, prof, n=12, x=0.0, y=0.0, z=0.0, axis='Z', a0=0.0, arc=360.0, closed=False):
        """Revolves a profile of (radius, height) points about `axis` through (x, y, z)."""
        M = Matrix.Translation((x, y, z)) @ axis_mx(axis)
        full = arc >= 360 - 1e-6
        k = n if full else n + 1
        verts, rings = [], []
        for r, h in prof:
            if r < 1e-6:
                rings.append([len(verts)])
                verts.append(M @ Vector((0, 0, h)))
            else:
                rings.append(list(range(len(verts), len(verts) + k)))
                for i in range(k):
                    a = math.radians(a0 + arc * i / n)
                    verts.append(M @ Vector((r * math.cos(a), r * math.sin(a), h)))
        faces = []
        m = len(prof)
        for j in range(m if closed else m - 1):
            A, B = rings[j], rings[(j + 1) % m]
            for i in range(n):
                i2 = (i + 1) % k
                if len(A) == 1 and len(B) == 1:
                    continue
                if len(A) == 1:
                    faces.append((A[0], B[i], B[i2]))
                elif len(B) == 1:
                    faces.append((A[i], A[i2], B[0]))
                else:
                    faces.append((A[i], A[i2], B[i2], B[i]))
        if full:
            if not closed:
                for ring in (rings[0], rings[-1]):
                    if len(ring) > 1:
                        faces.append(ring)
        else:
            ax = []
            if not closed:
                for ring, (r, h) in ((rings[0], prof[0]), (rings[-1], prof[-1])):
                    if len(ring) > 1:
                        ax.append(len(verts))
                        verts.append(M @ Vector((0, 0, h)))
                        faces.append([ax[-1]] + ring)
                    else:
                        ax.append(ring[0])
            for i in (0, k - 1):
                loop = [rg[i] if len(rg) > 1 else rg[0] for rg in rings]
                if not closed:
                    loop = ([ax[0]] if ax[0] != loop[0] else []) + loop + ([ax[1]] if ax[1] != loop[-1] else [])
                faces.append(loop)
        self.add(mat, verts, faces)

    def cyl(self, mat, x, y, z, r, h, n=12, b=0.0, r2=None, axis='Z', a0=0.0):
        """Cylinder or cone from (x, y, z) along `axis`, optionally chamfered at both ends."""
        r2 = r if r2 is None else r2
        prof = [(r - b, 0), (r, b), (r2, h - b), (r2 - b, h)] if b > 0 else [(r, 0), (r2, h)]
        self.lathe(mat, prof, n, x, y, z, axis, a0)

    def rod(self, mat, p0, p1, r, n=6, r2=None):
        p0, p1 = Vector(p0), Vector(p1)
        self.cyl(mat, p0.x, p0.y, p0.z, r, (p1 - p0).length, n, 0.0, r2, tuple(p1 - p0))

    def sphere(self, mat, x, y, z, r, n=10, m=6, sz=1.0):
        prof = [(r * math.sin(math.pi * j / m), -r * sz * math.cos(math.pi * j / m)) for j in range(m + 1)]
        prof[0], prof[-1] = (0.0, -r * sz), (0.0, r * sz)
        self.lathe(mat, prof, n, x, y, z)

    def torus(self, mat, x, y, z, R, r, n=16, m=8, axis='Z', sz=1.0):
        prof = [(R + r * math.cos(2 * math.pi * j / m), r * sz * math.sin(2 * math.pi * j / m)) for j in range(m)]
        self.lathe(mat, prof, n, x, y, z, axis, closed=True)

    def prism(self, mat, pts, d0, d1, plane='XY', b=0.0):
        """Extrudes a simple polygon from d0 to d1 along the plane normal ('XY' -> Z, 'XZ' -> Y, 'YZ' -> X),
        with an optional chamfer around both caps."""
        P = {'XY': lambda u, v, d: (u, v, d), 'XZ': lambda u, v, d: (u, d, v), 'YZ': lambda u, v, d: (d, u, v)}[plane]
        n = len(pts)
        if d1 < d0:
            d0, d1 = d1, d0
        b = min(b, (d1 - d0) * 0.49)
        if b > 0:
            inner = offset_poly(pts, -b)
            rings = [(inner, d0), (pts, d0 + b), (pts, d1 - b), (inner, d1)]
        else:
            rings = [(pts, d0), (pts, d1)]
        verts = [P(u, v, d) for ring, d in rings for u, v in ring]
        faces = [list(range(n)), list(range((len(rings) - 1) * n, len(rings) * n))]
        for j in range(len(rings) - 1):
            for i in range(n):
                i2 = (i + 1) % n
                faces.append((j * n + i, j * n + i2, (j + 1) * n + i2, (j + 1) * n + i))
        self.add(mat, verts, faces)

    def loft(self, mat, rings, caps=True, closed=False):
        """Skins a list of closed rings (same point count each); `closed` joins the last ring to the first."""
        n = len(rings[0])
        verts = [p for ring in rings for p in ring]
        faces = []
        m = len(rings)
        for j in range(m if closed else m - 1):
            j2 = (j + 1) % m
            for i in range(n):
                i2 = (i + 1) % n
                faces.append((j * n + i, j * n + i2, j2 * n + i2, j2 * n + i))
        if caps and not closed:
            faces += [list(range(n)), list(range((m - 1) * n, m * n))]
        self.add(mat, verts, faces)

    def tube(self, mat, pts, r, n=6, closed=False, sq=None):
        """Pipe along a polyline with mitred corners. `sq=(w, h)` makes it a rectangular bar instead."""
        P = [Vector(p) for p in pts]
        d0 = (P[1] - P[0]).normalized()
        up = Vector((0, 0, 1)) if abs(d0.z) < 0.9 else Vector((1, 0, 0))
        u = d0.cross(up).normalized()
        v = d0.cross(u)
        if sq:
            ring = [P[0] + u * (sx * sq[0] / 2) + v * (sy * sq[1] / 2) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        else:
            ring = [P[0] + (u * math.cos(2 * math.pi * i / n) + v * math.sin(2 * math.pi * i / n)) * r for i in range(n)]
        rings = [ring]
        m = len(P)
        for k in range(1, m + 1 if closed else m):
            p = P[k % m]
            din = (p - P[k - 1]).normalized()
            dout = (P[(k + 1) % m] - p).normalized() if (closed or k < m - 1) else din
            t = din + dout
            t = din if t.length < 1e-6 else t.normalized()
            ring = [q + din * ((p - q).dot(t) / din.dot(t)) for q in ring]
            rings.append(ring)
        if closed:
            rings = rings[1:]
        self.loft(mat, rings, closed=closed)

    # --- shared parts ---------------------------------------------------------------------------------
    def planks(self, mat, x0, x1, y0, y1, z, t, n, gap=0.008, along='X', b=0.0, alt=None, every=3):
        """A deck of n boards filling the rectangle, running along X or Y; `alt` recolours every `every`th board."""
        for i in range(n):
            m = alt if alt and i % every == every - 1 else mat
            if along == 'X':
                w = (y1 - y0) / n
                self.ext(m, x0, x1, y0 + i * w + gap / 2, y0 + (i + 1) * w - gap / 2, z, z + t, b)
            else:
                w = (x1 - x0) / n
                self.ext(m, x0 + i * w + gap / 2, x0 + (i + 1) * w - gap / 2, y0, y1, z, z + t, b)

    def frame(self, mat, x, y, z, w, h, fw, t, b=0.0, bottom=True):
        """Rectangular frame standing in the XZ plane: outer size w x h, bottom centre (x, z), depth t about y."""
        self.box(mat, x, y, z + h - fw, w, t, fw, b)
        if bottom:
            self.box(mat, x, y, z, w, t, fw, b)
        z0 = z + fw if bottom else z
        for s in (-1, 1):
            self.box(mat, x + s * (w - fw) / 2, y, z0, fw, t, z + h - fw - z0, b)

    def ladder(self, mat, x, y, z0, z1, w=0.45, step=0.3, cage=False, cage_from=2.3, standoff=0.0, cage_mat=None):
        """Vertical ladder in the XZ plane at depth y; the climber stands on the -Y side."""
        for s in (-1, 1):
            self.box(mat, x + s * w / 2, y, z0, 0.045, 0.022, z1 - z0)
        n = max(1, int((z1 - z0 - 0.2) / step))
        for i in range(n + 1):
            zz = z0 + 0.15 + i * step
            if zz < z1 - 0.05:
                self.cbox(mat, x, y, zz, w, 0.026, 0.026)
        if standoff > 0:
            k = max(2, int((z1 - z0) / 1.6) + 1)
            for i in range(k):
                zz = z0 + 0.3 + (z1 - z0 - 0.6) * i / (k - 1)
                for s in (-1, 1):
                    self.ext(mat, x + s * w / 2 - 0.02, x + s * w / 2 + 0.02, y, y + standoff, zz - 0.02, zz + 0.02)
        if cage:
            cm = cage_mat or mat
            R, nh = 0.36, max(2, int((z1 - cage_from) / 1.25) + 1)
            arc = [(R * math.cos(math.radians(a)) * (w / 2 + 0.06) / R, -R * 1.9 * math.sin(math.radians(a))) for a in range(0, 181, 36)]
            for i in range(nh):
                zz = cage_from + (z1 - cage_from) * i / (nh - 1)
                self.tube(cm, [(x + px, y + py, zz) for px, py in arc], 0, sq=(0.012, 0.05))
            for px, py in arc[1:-1]:
                self.box(cm, x + px, y + py, cage_from, 0.04, 0.012, z1 - cage_from, rz=0)

    def sign(self, x, y, z, w, h, t=0.14, fw=0.07, frame='dsteel', back=True, b=0.012):
        """Blank sign box centred on (x, y, z): recessed `signface` panels in a raised frame. Records the face."""
        self.box(frame, x, y, z + h / 2, w + 2 * fw, t, fw, b)
        self.box(frame, x, y, z - h / 2 - fw, w + 2 * fw, t, fw, b)
        for s in (-1, 1):
            self.box(frame, x + s * (w + fw) / 2, y, z - h / 2, fw, t, h, b)
        self.cbox('signface', x, y if back else y + 0.01, z, w + 0.01, t - (0.05 if back else 0.03), h + 0.01)
        self.note_face(x, y - t / 2 + 0.025, z, w, h)
        if back:
            self.note_face(x, y + t / 2 - 0.025, z, w, h, 180.0)

    def note_face(self, x, y, z, w, h, yaw=0.0):
        """Adds [x, y, z, width, height, yaw] of a blank sign panel to the manifest (yaw 0 = faces -Y)."""
        M = self.stack[-1]
        p = M @ Vector((x, y, z))
        n = M.to_3x3() @ Vector((math.sin(math.radians(yaw)), -math.cos(math.radians(yaw)), 0))
        self.faces.append([round(p.x, 3), round(p.y, 3), round(p.z, 3), round(w, 3), round(h, 3), round(math.degrees(math.atan2(n.x, -n.y)), 1)])

    def bulbs(self, pts, r=0.05, mat='bulb', socket=None):
        for p in pts:
            self.sphere(mat, p[0], p[1], p[2], r, 6, 4)
            if socket:
                self.cbox(socket, p[0], p[1] + r * 0.9, p[2], r * 1.3, r * 1.2, r * 1.3)

    def arc(self, cx, cy, cz, r, a0, a1, n, plane='XZ', ry=None):
        """3D points on an arc for `tube` (plane XZ, YZ or XY; `ry` squashes the second axis)."""
        ry = r if ry is None else ry
        out = []
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            u, v = r * math.cos(a), ry * math.sin(a)
            out.append({'XZ': (cx + u, cy, cz + v), 'YZ': (cx, cy + u, cz + v), 'XY': (cx + u, cy + v, cz)}[plane])
        return out

    def gable(self, mat, w, d, z, rise, over=0.0, t=0.08, plane='XZ', y0=None, b=0.0):
        """Gable roof slab pair as one prism: ridge runs along Y (plane 'XZ') or X (plane 'YZ')."""
        hw = w / 2 + over
        zo = z - rise * over / (w / 2)
        pts = [(-hw, zo), (0, z + rise), (hw, zo), (hw, zo + t * 1.15), (0, z + rise + t * 1.15), (-hw, zo + t * 1.15)]
        y0 = -d / 2 - over if y0 is None else y0
        self.prism(mat, pts, y0, y0 + d + 2 * over, plane, b)


def check(ob):
    """Counts edges that do not join exactly two faces (every primitive must be a closed shell)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bad = sum(1 for e in bm.edges if len(e.link_faces) != 2)
    bm.free()
    return bad


def shot(family, tag, assets, elev=16.0, azim=-32.0, res=(1920, 1080), samples=24, gap=1.0, lens=55.0, cols=None, fill=0.94):
    """Preview with a camera fitted to the group, for tall landmarks and close-ups (lib.preview frames a square grid)."""
    import os
    scn = bpy.context.scene
    os.makedirs(lib.PREVIEWS, exist_ok=True)
    saved = [(a, a.location.copy()) for a in assets]
    cols = cols or len(assets)
    bb = [bounds(a) for a in assets]
    rows = math.ceil(len(assets) / cols)
    rowd = [max(bb[i][1][1] - bb[i][0][1] for i in range(r * cols, min(len(assets), (r + 1) * cols))) + gap for r in range(rows)]
    y = 0.0
    for r in range(rows):
        x = 0.0
        for i in range(r * cols, min(len(assets), (r + 1) * cols)):
            lo, hi = bb[i]
            a = assets[i]
            a.location = (a.location.x + x - lo[0], a.location.y - y - hi[1], a.location.z - min(lo[2], 0.0))
            x += hi[0] - lo[0] + gap
        y += rowd[r]
    bpy.context.view_layer.update()
    pts = []
    for a in assets:
        lo, hi = bounds(a)
        pts += [Vector((px, py, pz)) for px in (lo[0], hi[0]) for py in (lo[1], hi[1]) for pz in (lo[2], hi[2])]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    ctr = (lo + hi) / 2
    extra = []
    bpy.ops.mesh.primitive_plane_add(size=max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z) * 12, location=(ctr.x, ctr.y, -0.001))
    g = bpy.context.object
    g.data.materials.append(lib.mat('paint__previewfloor', '#9a9da0'))
    extra.append(g)
    sun = bpy.data.objects.new('psun', bpy.data.lights.new('psun', 'SUN'))
    sun.data.energy, sun.data.angle = 4.0, math.radians(3)
    sun.rotation_euler = (math.radians(50), 0, math.radians(azim - 55))
    cam = bpy.data.objects.new('pcam', bpy.data.cameras.new('pcam'))
    cam.data.lens = lens
    cam.data.clip_end = 2000
    for o in (sun, cam):
        scn.collection.objects.link(o)
        extra.append(o)
    e, a_ = math.radians(elev), math.radians(azim)
    back = Vector((math.sin(a_) * math.cos(e), -math.cos(a_) * math.cos(e), math.sin(e)))
    q = (-back).to_track_quat('-Z', 'Y')
    right, up = q @ Vector((1, 0, 0)), q @ Vector((0, 1, 0))
    th = 18.0 / lens * fill
    tv = th * res[1] / res[0]
    us = [(p - ctr).dot(right) for p in pts]
    vs = [(p - ctr).dot(up) for p in pts]
    ctr = ctr + right * (max(us) + min(us)) / 2 + up * (max(vs) + min(vs)) / 2
    dist = max(max(abs((p - ctr).dot(right)) / th, abs((p - ctr).dot(up)) / tv) + (p - ctr).dot(back) for p in pts)
    cam.location = ctr + back * dist
    cam.rotation_euler = q.to_euler()
    scn.camera = cam
    world = bpy.data.worlds.new('pworld')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.68, 0.9, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    scn.world = world
    scn.render.engine = 'CYCLES'
    scn.cycles.samples, scn.cycles.use_denoising, scn.cycles.device = samples, False, 'CPU'
    scn.view_settings.view_transform = 'Standard'
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.image_settings.file_format = 'JPEG'
    scn.render.image_settings.quality = 88
    scn.render.filepath = os.path.join(lib.PREVIEWS, f'{family}_{tag}.jpg')
    bpy.ops.render.render(write_still=True)
    for o in extra:
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.worlds.remove(world)
    for a, loc in saved:
        a.location = loc
    print('[shot]', scn.render.filepath)

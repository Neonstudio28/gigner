"""Mesh-building kit shared by the streetprops generators (see CONTRACT.md).

An Asset accumulates plain vertex/face lists; every primitive is emitted through the current transform stack with
outward-facing winding (closed primitives are checked by signed volume), so nothing depends on normal recalculation.
"""
import bpy, bmesh, math
from contextlib import contextmanager
from mathutils import Matrix, Vector, Euler
import lib

REGISTRY = []          # (group, function) in definition order
UV = {}                # atlas region name -> (u0, v0, u1, v1), filled by streetprops_atlas


def asset(group):
    def deco(fn):
        REGISTRY.append((group, fn))
        return fn
    return deco


# ---------------------------------------------------------------- materials
def P(c): return lib.colour('paint', c)
def G(c): return lib.colour('gloss', c)
def MT(c='#8f979c'): return lib.colour('metal', c)
def RB(c='#1d1d1f'): return lib.colour('rubber', c)
def CH(c='#d5d9dd'): return lib.colour('chrome', c)
def GLS(c='#1b242b'): return lib.colour('glass', c)
def CLR(c='#bcd3dc'): return lib.colour('clear', c)
def LT(label, c): return lib.mat('light__' + label, c)
def LB(key, label, c): return lib.mat(key + '__' + label, c)
def ATL(): return lib.mat('atlas', '#ffffff')


# ---------------------------------------------------------------- maths
def rad(a): return math.radians(a)


def rnd(*k):
    """Deterministic pseudo-random 0..1 from integer keys (no random module: output must not change run to run)."""
    x = math.sin(sum((i + 1) * 12.9898 * (v + 0.37) for i, v in enumerate(k)) + 4.123) * 43758.5453
    return x - math.floor(x)


def xf(at=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    if isinstance(scale, (int, float)):
        scale = (scale, scale, scale)
    return (Matrix.Translation(at) @ Euler([rad(a) for a in rot], 'XYZ').to_matrix().to_4x4()
            @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0)))


def frame(p0, p1):
    """Matrix placing local +Z along p0 -> p1 with the origin at p0."""
    p0, p1 = Vector(p0), Vector(p1)
    q = Vector((0, 0, 1)).rotation_difference((p1 - p0).normalized())
    return Matrix.Translation(p0) @ q.to_matrix().to_4x4()


def ngon(r, n, phase=0.0, ry=None):
    ry = r if ry is None else ry
    return [(r * math.cos((i + phase) * math.tau / n), ry * math.sin((i + phase) * math.tau / n)) for i in range(n)]


def rrect(w, d, r=0.0, k=1):
    """Rounded/chamfered rectangle centred on the origin, CCW. k = segments per corner (1 = chamfer)."""
    if r <= 0:
        return [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]
    out = []
    for cx, cy, a0 in ((w / 2 - r, -d / 2 + r, -90), (w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180)):
        for i in range(k + 1):
            a = rad(a0 + 90 * i / k)
            out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def ring(sec, z=0.0, sx=1.0, sy=None, cx=0.0, cy=0.0):
    sy = sx if sy is None else sy
    return [(cx + x * sx, cy + y * sy, z) for x, y in sec]


def arc(c, r, a0, a1, n, plane='xz'):
    """n+1 points on an arc (degrees) around centre c in the given plane."""
    out = []
    for i in range(n + 1):
        a = rad(a0 + (a1 - a0) * i / n)
        u, v = r * math.cos(a), r * math.sin(a)
        out.append({'xz': (c[0] + u, c[1], c[2] + v), 'yz': (c[0], c[1] + u, c[2] + v), 'xy': (c[0] + u, c[1] + v, c[2])}[plane])
    return out


def fillet(pts, r, k=3):
    """Rounds the interior corners of a 3D polyline with radius r (k segments each)."""
    pts = [Vector(p) for p in pts]
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        a, b, c = pts[i - 1], pts[i], pts[i + 1]
        d0, d1 = (a - b), (c - b)
        l0, l1 = d0.length, d1.length
        d0, d1 = d0.normalized(), d1.normalized()
        ang = d0.angle(d1)
        if ang > math.pi - 1e-3 or r <= 0:
            out.append(b)
            continue
        t = min(r / math.tan(ang / 2), l0 * 0.49, l1 * 0.49)
        p0, p1 = b + d0 * t, b + d1 * t
        for j in range(k + 1):
            s = j / k
            out.append((p0.lerp(b, s)).lerp(b.lerp(p1, s), s))
    out.append(pts[-1])
    return [tuple(p) for p in out]


def _volume(verts, faces):
    vol = 0.0
    for f in faces:
        a = verts[f[0]]
        for i in range(1, len(f) - 1):
            b, c = verts[f[i]], verts[f[i + 1]]
            vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]))
    return vol


def _bevel(verts, faces, pick, offset):
    """Chamfers the edges for which pick(co0, co1) is true (one segment), returns new verts/faces."""
    bm = bmesh.new()
    bv = [bm.verts.new(v) for v in verts]
    for f in faces:
        bm.faces.new([bv[i] for i in f])
    bm.edges.ensure_lookup_table()
    edges = [e for e in bm.edges if pick(e.verts[0].co, e.verts[1].co)]
    if edges:
        bmesh.ops.bevel(bm, geom=edges, offset=offset, segments=1, affect='EDGES', profile=0.5, clamp_overlap=True)
    bm.verts.index_update()
    out = [v.co[:] for v in bm.verts], [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    return out


class Asset:
    def __init__(self, name, angle=38.0):      # 38: ten-sided rounds shade smooth, 45 degree chamfers stay crisp
        self.name, self.angle = name, angle
        self.v, self.f, self.fm, self.fuv = [], [], [], []
        self.mats, self.stack = [], [Matrix.Identity(4)]
        self.children, self.extras, self.pivot, self.has_uv = [], {}, (0, 0, 0), False

    # ------------------------------------------------------------ plumbing
    @property
    def M(self):
        return self.stack[-1]

    @contextmanager
    def at(self, at=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), M=None):
        self.stack.append(self.M @ (M if M is not None else xf(at, rot, scale)))
        try:
            yield self
        finally:
            self.stack.pop()

    def child(self, part, pivot):
        """Separate movable part `<asset>.<part>`; its origin (pivot) is given in the parent's coordinates and it is
        modelled in those same coordinates."""
        c = Asset(f'{self.name}.{part}', self.angle)
        c.pivot = tuple(self.M @ Vector(pivot))
        self.children.append(c)
        return c

    def mx(self, axis=0):
        """for s in a.mx(): ... runs the body twice, the second time mirrored across the axis (winding is kept right)."""
        for sgn in (1, -1):
            sc = [1, 1, 1]
            sc[axis] = sgn
            self.stack.append(self.M @ xf(scale=sc))
            try:
                yield sgn
            finally:
                self.stack.pop()

    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _emit(self, verts, faces, m, M=None, closed=True, uvs=None):
        mat = self.M @ M if M is not None else self.M
        flip = mat.determinant() < 0
        if closed and _volume(verts, faces) < 0:
            flip = not flip
        base, k = len(self.v), self._mi(m)
        self.v.extend((mat @ Vector(v))[:] for v in verts)
        for i, f in enumerate(faces):
            idx = [base + j for j in f]
            uv = list(uvs[i]) if uvs else None
            if flip:
                idx.reverse()
                if uv:
                    uv.reverse()
            self.f.append(idx)
            self.fm.append(k)
            self.fuv.append(uv)

    def build(self, parent=None):
        me = bpy.data.meshes.new(self.name)
        px, py, pz = self.pivot if parent is not None else (0.0, 0.0, 0.0)
        me.from_pydata([(x - px, y - py, z - pz) for x, y, z in self.v], [], self.f)
        for m in self.mats:
            me.materials.append(m)
        me.polygons.foreach_set('material_index', self.fm)
        if self.has_uv:
            layer = me.uv_layers.new(name='UVMap')
            flat = []
            for f, uv in zip(self.f, self.fuv):
                if uv:
                    for u, v in uv:
                        flat += (u, v)
                else:
                    flat += (0.002, 0.002) * len(f)
            layer.data.foreach_set('uv', flat)
        me.update()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        lib.finish(ob, self.angle)
        if parent is not None:
            ob.parent = parent
            ob.location = self.pivot
        for c in self.children:
            c.build(ob)
        return ob

    # ------------------------------------------------------------ primitives
    def mesh(self, m, verts, faces, closed=True, at=(0, 0, 0), rot=(0, 0, 0)):
        self._emit(verts, faces, m, xf(at, rot), closed)

    def quad(self, m, p0, p1, p2, p3):
        """Single face, counter-clockwise seen from its visible side."""
        self._emit([p0, p1, p2, p3], [[0, 1, 2, 3]], m, None, False)

    def box(self, m, sx, sy, sz, at=(0, 0, 0), bev=0.0, be='xyz', rot=(0, 0, 0), taper=None, shear=None):
        """Box centred on `at`. be: axes whose parallel edges get chamfered, plus 'T' (skip bottom face edges) or
        'B' (skip top face edges). taper=(tx, ty) scales the top face; shear=(dx, dy) offsets it."""
        hx, hy, hz = sx / 2, sy / 2, sz / 2
        v = [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]
        if taper or shear:
            tx, ty = taper or (1, 1)
            dx, dy = shear or (0, 0)
            for p in v[4:]:
                p[0], p[1] = p[0] * tx + dx, p[1] * ty + dy
        f = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
        if bev > 0:
            def pick(a, b):
                d = b - a
                ax = 'xyz'[max(range(3), key=lambda i: abs(d[i]))]
                if ax not in be:
                    return False
                if 'T' in be and a.z < 0 and b.z < 0:
                    return False
                if 'B' in be and a.z > 0 and b.z > 0:
                    return False
                return True
            v, f = _bevel(v, f, pick, bev)
        self._emit(v, f, m, xf(at, rot))

    def bx(self, m, x0, x1, y0, y1, z0, z1, bev=0.0, be='xyz', **kw):
        self.box(m, x1 - x0, y1 - y0, z1 - z0, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), bev, be, **kw)

    def plate(self, m, w, h, at, rot=(0, 0, 0), t=0.008, bev=0.0):
        """Thin panel in the XZ plane facing -Y (same convention as decal), e.g. a label colour block."""
        self.box(m, w, t, h, at, bev, 'y', rot)

    def lathe(self, m, prof, n=12, at=(0, 0, 0), rot=(0, 0, 0), M=None, caps=True, phase=0.0, loop=False, sx=1.0, sy=1.0):
        """Revolves prof [(r, z), ...] around local Z. Draw the profile bottom -> out -> up -> in."""
        verts, rings = [], []
        for r, z in prof:
            if r < 1e-7:
                rings.append([len(verts)])
                verts.append((0.0, 0.0, z))
            else:
                rings.append(list(range(len(verts), len(verts) + n)))
                verts += [(r * math.cos((i + phase) * math.tau / n) * sx, r * math.sin((i + phase) * math.tau / n) * sy, z) for i in range(n)]
        faces = []
        pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if loop else [])
        for A, B in pairs:
            if len(A) == 1 and len(B) == 1:
                continue
            for j in range(n):
                j2 = (j + 1) % n
                if len(A) == 1:
                    faces.append([A[0], B[j2], B[j]])
                elif len(B) == 1:
                    faces.append([A[j], A[j2], B[0]])
                else:
                    faces.append([A[j], A[j2], B[j2], B[j]])
        closed = loop
        if not loop:
            c0, c1 = len(rings[0]) == 1, len(rings[-1]) == 1
            cap0, cap1 = caps if isinstance(caps, tuple) else (caps, caps)
            if cap0 and not c0:
                faces.append(rings[0][::-1])
                c0 = True
            if cap1 and not c1:
                faces.append(rings[-1][:])
                c1 = True
            closed = c0 and c1
        self._emit(verts, faces, m, M if M is not None else xf(at, rot), closed)

    def cyl(self, m, r, p0, p1, n=12, r2=None, bev=0.0, caps=True, phase=0.0):
        """Cylinder or cone frustum from p0 to p1 with optional chamfered rims."""
        r2 = r if r2 is None else r2
        h = (Vector(p1) - Vector(p0)).length
        prof = [(r - bev, 0), (r, bev), (r2, h - bev), (r2 - bev, h)] if bev > 0 else [(r, 0), (r2, h)]
        self.lathe(m, prof, n, M=frame(p0, p1), caps=caps, phase=phase)

    def cz(self, m, r, z0, z1, x=0.0, y=0.0, **kw):
        self.cyl(m, r, (x, y, z0), (x, y, z1), **kw)

    def sphere(self, m, r, at=(0, 0, 0), n=12, k=6, scale=(1, 1, 1), rot=(0, 0, 0), a0=0.0, a1=180.0):
        """UV sphere; a0/a1 (degrees from the bottom pole) cut it into a dome or bowl cap."""
        prof = []
        for i in range(k + 1):
            a = rad(a0 + (a1 - a0) * i / k)
            rr = r * math.sin(a)
            prof.append((0.0 if rr < 1e-6 else rr, -r * math.cos(a)))
        self.lathe(m, prof, n, M=xf(at, rot, scale))

    def torus(self, m, R, r, at=(0, 0, 0), rot=(0, 0, 0), n=12, k=6, phase=0.0):
        prof = [(R + r * math.cos(rad(-90 + 360 * i / k)), r * math.sin(rad(-90 + 360 * i / k))) for i in range(k)]
        self.lathe(m, prof, n, at, rot, loop=True, phase=phase)

    def sweep(self, m, pts, sec, closed=False, caps=True, up=None, scales=None):
        """Sweeps the 2D section `sec` (CCW) along the polyline with mitred joints. `up` fixes the section's Y axis."""
        pts = [Vector(p) for p in pts]
        n, k = len(pts), len(sec)
        segs = [(pts[(i + 1) % n] - pts[i]).normalized() for i in range(n if closed else n - 1)]
        verts, prev_n, prev_d, prev_b = [], None, None, None
        for i in range(n):
            din = segs[i - 1] if (i > 0 or closed) else None
            dout = segs[i] if (i < n - 1 or closed) else None
            if din is None:
                d = dout
            elif dout is None:
                d = din
            else:
                d = din + dout
                d = d.normalized() if d.length > 1e-9 else dout
            if up is not None:
                B = Vector(up) - d * Vector(up).dot(d)
                B = B.normalized() if B.length > 1e-6 else prev_b
                N = B.cross(d)
            elif prev_n is None:
                ref = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
                B = (ref - d * ref.dot(d)).normalized()
                N = B.cross(d)
            else:
                N = prev_d.rotation_difference(d) @ prev_n
                N = (N - d * N.dot(d)).normalized()
                B = d.cross(N)
            ax, kk = None, 1.0
            if din is not None and dout is not None:
                c = din.cross(dout)
                ca = din.dot(d)
                if c.length > 1e-6 and ca > 0.25:
                    ax, kk = c.normalized(), 1.0 / ca
            s = scales[i] if scales else 1.0
            for x, y in sec:
                o = (N * x + B * y) * s
                if ax is not None:
                    oa = ax * o.dot(ax)
                    o = oa + (o - oa) * kk
                verts.append((pts[i] + o)[:])
            prev_n, prev_d, prev_b = N, d, B
        faces = []
        for i in range(n if closed else n - 1):
            i2 = (i + 1) % n
            for j in range(k):
                j2 = (j + 1) % k
                faces.append([i * k + j, i * k + j2, i2 * k + j2, i2 * k + j])
        if not closed and caps:
            faces.append(list(range(k))[::-1])
            faces.append([(n - 1) * k + j for j in range(k)])
        self._emit(verts, faces, m, None, closed or caps)

    def tube(self, m, pts, r, n=6, phase=0.0, **kw):
        self.sweep(m, pts, ngon(r, n, phase), **kw)

    def bar(self, m, pts, w, t, up=(0, 0, 1), **kw):
        """Rectangular bar along a polyline: w across, t along `up`."""
        self.sweep(m, pts, rrect(w, t), up=up, **kw)

    def prism(self, m, poly, d0, d1, plane='xz', bev=0.0, be='caps', at=(0, 0, 0), rot=(0, 0, 0)):
        """Extrudes a 2D polygon from depth d0 to d1 along the axis normal to `plane` ('xz' -> Y, 'yz' -> X, 'xy' -> Z)."""
        put = {'xz': lambda a, b, d: (a, d, b), 'yz': lambda a, b, d: (d, a, b), 'xy': lambda a, b, d: (a, b, d)}[plane]
        k = len(poly)
        verts = [put(a, b, d0) for a, b in poly] + [put(a, b, d1) for a, b in poly]
        faces = [list(range(k))[::-1], list(range(k, 2 * k))]
        faces += [[i, (i + 1) % k, k + (i + 1) % k, k + i] for i in range(k)]
        if bev > 0:
            axis = {'xz': 1, 'yz': 0, 'xy': 2}[plane]

            def pick(a, b):
                side = abs(a[axis] - b[axis]) > 1e-6
                return be == 'all' or (be == 'sides' and side) or (be == 'caps' and not side)
            verts, faces = _bevel(verts, faces, pick, bev)
        self._emit(verts, faces, m, xf(at, rot))

    def loft(self, m, rings, caps=True, at=(0, 0, 0), rot=(0, 0, 0)):
        """Skins rings of equal point count (each CCW seen from the far end). A shell is a loft whose rings go up the
        outside and back down the inside."""
        k = len(rings[0])
        verts = [p for r in rings for p in r]
        faces = []
        for i in range(len(rings) - 1):
            for j in range(k):
                j2 = (j + 1) % k
                faces.append([i * k + j, i * k + j2, (i + 1) * k + j2, (i + 1) * k + j])
        if caps:
            faces.append(list(range(k))[::-1])
            faces.append([(len(rings) - 1) * k + j for j in range(k)])
        self._emit(verts, faces, m, xf(at, rot), caps)

    def decal(self, name, w, h, at, rot=(0, 0, 0), shape=None, fold=0.0, back=None):
        """Atlas-mapped face in the XZ plane facing -Y, centred on `at`. `shape` is a polygon in 0..1 region space.
        fold (degrees) creases the sheet along its horizontal centre line, tipping the top half towards the viewer.
        back = material for a reverse side (loose sheets that are seen from both sides)."""
        u0, v0, u1, v1 = UV[name]
        self.has_uv = True
        parts = [shape or [(0, 0), (1, 0), (1, 1), (0, 1)]]
        if fold:
            parts = [[(0, 0), (1, 0), (1, 0.5), (0, 0.5)], [(0, 0.5), (1, 0.5), (1, 1), (0, 1)]]
        c, s_ = math.cos(rad(fold)), math.sin(rad(fold))
        mir = -1.0 if (self.M @ xf(at, rot)).determinant() < 0 else 1.0      # inside a mirror: keep the print readable
        for i, poly in enumerate(parts):
            k = (c, -s_) if i else (1.0, 0.0)
            if mir < 0:
                poly = poly[::-1]
            verts = [((u - 0.5) * w * mir, (v - 0.5) * h * k[1], (v - 0.5) * h * k[0]) for u, v in poly]
            uvs = [[(u0 + (u1 - u0) * u, v0 + (v1 - v0) * v) for u, v in poly]]
            self._emit(verts, [list(range(len(poly)))], ATL(), xf(at, rot), False, uvs)
            if back is not None:
                self._emit([(x, y + 0.002, z) for x, y, z in verts], [list(range(len(poly)))[::-1]], back, xf(at, rot), False)

    # ------------------------------------------------------------ small parts
    def bolts(self, m, pts, r=0.012, h=0.008, d=(0, -1, 0), n=6):
        for p in pts:
            self.cyl(m, r, p, (p[0] + d[0] * h, p[1] + d[1] * h, p[2] + d[2] * h), n=n)

    def handle(self, m, p0, p1, out, r=0.008, n=6, fr=0.02):
        """U-shaped grab handle from p0 to p1 standing off by the vector `out`."""
        a, b, o = Vector(p0), Vector(p1), Vector(out)
        self.tube(m, fillet([a, a + o, b + o, b], fr, 2), r, n)

    def slats(self, m, x0, x1, z0, z1, y, n, t=0.012, d=0.012, vertical=False):
        """Row of n louvre bars on a -Y facing surface at depth y."""
        for i in range(n):
            f = (i + 0.5) / n
            if vertical:
                self.box(m, t, d, z1 - z0, (x0 + (x1 - x0) * f, y, (z0 + z1) / 2))
            else:
                self.box(m, x1 - x0, d, t, ((x0 + x1) / 2, y, z0 + (z1 - z0) * f))

    def rim(self, m, w, h, at, bw=0.03, d=0.02, rot=(0, 0, 0), bev=0.0):
        """Rectangular frame of four bars in the XZ plane (outer size w x h, bar width bw, depth d along Y)."""
        with self.at(at, rot):
            for sx in (-1, 1):
                self.box(m, bw, d, h, (sx * (w - bw) / 2, 0, 0), bev, 'z')
            for sz in (-1, 1):
                self.box(m, w - 2 * bw, d, bw, (0, 0, sz * (h - bw) / 2))

    def wheel(self, r, w, at, axis=(1, 0, 0), tyre=None, hub=None, n=12, hub_r=0.55):
        """Small solid wheel centred on `at`, axle along `axis`."""
        tyre, hub = tyre or RB(), hub or MT('#9aa0a4')
        a, c = Vector(axis).normalized(), Vector(at)
        b = min(r * 0.25, w * 0.3)
        self.lathe(tyre, [(r - b, 0), (r, b), (r, w - b), (r - b, w)], n, M=frame(c - a * w / 2, c + a * w / 2))
        self.cyl(hub, r * hub_r, c - a * (w / 2 + 0.004), c + a * (w / 2 + 0.004), n=n)


def shell(sec_fn, levels, t, floor=None):
    """Rings for Asset.loft making an open-topped container. levels = [(w, d, z), ...] bottom to top;
    sec_fn(w, d) returns the 2D outline. t = wall thickness, floor = inside floor height above the first level."""
    floor = t if floor is None else floor
    out = [ring(sec_fn(w, d), z) for w, d, z in levels]
    z0 = levels[0][2]
    inner = [ring(sec_fn(w - 2 * t, d - 2 * t), max(z, z0 + floor)) for w, d, z in reversed(levels)]
    return out + inner

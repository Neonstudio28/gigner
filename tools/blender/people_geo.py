"""Geometry primitives shared by the people generators (see people.py)."""
import bpy, bmesh, math
from mathutils import Vector, Matrix
import lib

X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
LABELS = {'skin': '#d8a47f', 'hair': '#5b3d26', 'shirt': '#c8ccd2', 'pants': '#3b4759', 'shoes': '#2a2420',
          'jacket': '#4a4f58', 'hat': '#8a3b32', 'dress': '#b9566a'}


def M(spec):
    """Material from a spec: recolour label ('skin'), '#rrggbb' matte colour, or (key, '#rrggbb')."""
    if isinstance(spec, tuple):
        return lib.colour(spec[0], spec[1])
    if spec in LABELS:
        return lib.mat('paint__' + spec, LABELS[spec])
    return lib.colour('paint', spec)


def V(x, y=0.0, z=0.0):
    return Vector((x, y, z))


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def interp(table, x):
    """Piecewise-linear lookup in [(x, v...)] rows sorted by x; returns the tuple of values."""
    if x <= table[0][0]:
        return tuple(table[0][1:])
    for a, b in zip(table, table[1:]):
        if x <= b[0]:
            t = (x - a[0]) / (b[0] - a[0]) if b[0] > a[0] else 0.0
            return tuple(lerp(p, q, t) for p, q in zip(a[1:], b[1:]))
    return tuple(table[-1][1:])


def spow(v, p):
    return math.copysign(abs(v) ** p, v)


def ring(c, ru, rv=None, n=10, e=2.4, u=X, v=Y, rvb=None, phase=0.5):
    """Superellipse ring of n points around c in the plane (u, v). rvb = radius on the -v side."""
    rv = ru if rv is None else rv
    rvb = rv if rvb is None else rvb
    out = []
    for i in range(n):
        t = 2 * math.pi * (i + phase) / n
        cu, sv = spow(math.cos(t), 2 / e), spow(math.sin(t), 2 / e)
        out.append(c + u * (ru * cu) + v * ((rv if sv >= 0 else rvb) * sv))
    return out


def bm_loft(rings, cap0=True, cap1=True, mats=None):
    """Skin of quads through rings (lists of n points) or poles (single Vector). Face material = mats[band]."""
    bm = bmesh.new()
    rows = []
    for r in rings:
        if isinstance(r, Vector):
            rows.append([bm.verts.new(r)])
        else:
            rows.append([bm.verts.new(p) for p in r])
    for k, (a, b) in enumerate(zip(rows, rows[1:])):
        mi = mats[k] if mats else 0
        n = max(len(a), len(b))
        for i in range(n):
            j = (i + 1) % n
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                vs = [a[0], b[i], b[j]]
            elif len(b) == 1:
                vs = [a[i], a[j], b[0]]
            else:
                vs = [a[i], a[j], b[j], b[i]]
            try:
                bm.faces.new(vs).material_index = mi
            except ValueError:
                pass
    if cap0 and len(rows[0]) > 2:
        bm.faces.new(list(reversed(rows[0]))).material_index = mats[0] if mats else 0
    if cap1 and len(rows[-1]) > 2:
        bm.faces.new(rows[-1]).material_index = mats[-1] if mats else 0
    return bm


def bm_box(size, bevel=0.0, segs=1):
    """Axis-aligned box centred on the origin with chamfered edges."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts[:])
    if bevel > 0:
        b = min(bevel, min(size) * 0.45)
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=b, segments=segs, affect='EDGES', profile=0.5)
    return bm


def bm_slab(size, bevel=0.0):
    """Surface detail: box without a back face (+Y side is open), front edges chamfered. 10 or 18 triangles."""
    w, d, h = size[0] / 2, size[1] / 2, size[2] / 2
    b = min(bevel, w * 0.45, h * 0.45, size[1] * 0.8)
    bm = bmesh.new()
    mk = lambda ww, y, hh: [bm.verts.new(V(sx * ww, y, sz * hh)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    loops = [mk(w, d, h)] + ([mk(w, -d + b, h)] if b < size[1] - 1e-5 and b > 0 else []) + [mk(w - b, -d, h - b)]
    for a, c in zip(loops, loops[1:]):
        for i in range(4):
            bm.faces.new([a[i], a[(i + 1) % 4], c[(i + 1) % 4], c[i]])
    bm.faces.new(loops[-1])
    return bm


def bm_prism(pts, depth, axis=Y):
    """Extrudes a planar polygon (list of Vectors) by `depth` along `axis`."""
    a = list(pts)
    b = [p + axis * depth for p in pts]
    return bm_loft([a, b])


def tube_rings(path, radii, n=8, e=2.0, up=Z):
    """Rings along a polyline, each perpendicular to the local direction (parallel transport)."""
    out = []
    radii = radii if isinstance(radii, (list, tuple)) else [radii] * len(path)
    ref = None
    for i, p in enumerate(path):
        d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        if ref is None:
            ref = up if abs(d.dot(up)) < 0.9 else X
        u = (ref - d * ref.dot(d)).normalized()
        v = d.cross(u).normalized()
        ref = u
        r = radii[i]
        r = r if isinstance(r, (list, tuple)) else (r, r)
        out.append(ring(p, r[0], r[1], n, e, u, v))
    return out


def dome(c, ru, rv, rh, n=10, e=2.4, steps=2, sign=1, rvb=None, u=X, v=Y, w=Z, start=0.0):
    """Rings + pole of half an ellipsoid on the plane through c, bulging along sign*w. Skips the equator if start>0."""
    out = []
    for k in range(steps + 1):
        a = lerp(start, 1.0, k / (steps + 1)) * math.pi / 2 if start else (k / (steps + 1)) * math.pi / 2
        if k == 0 and not start:
            continue
        ca, sa = math.cos(a), math.sin(a)
        out.append(ring(c + w * (sign * rh * sa), ru * ca, rv * ca, n, e, u, v, None if rvb is None else rvb * ca))
    out.append(c + w * (sign * rh))
    return out


class Part:
    """One mesh object under construction: collects primitives with their materials."""

    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []
        self._idx = {}

    def mi(self, spec):
        m = M(spec)
        if m.name not in self._idx:
            self._idx[m.name] = len(self.mats)
            self.mats.append(m)
        return self._idx[m.name]

    def add(self, src, mat, xf=None):
        """Copies a temp bmesh in. `mat` is one spec or a list indexed by the source face.material_index."""
        specs = mat if isinstance(mat, list) else [mat]
        idx = [self.mi(s) for s in specs]
        vmap = {}
        for v in src.verts:
            vmap[v] = self.bm.verts.new(xf @ v.co if xf is not None else v.co)
        for f in src.faces:
            try:
                nf = self.bm.faces.new([vmap[v] for v in f.verts])
                nf.material_index = idx[min(f.material_index, len(idx) - 1)]
            except ValueError:
                pass
        src.free()

    def loft(self, rings, mat, cap0=True, cap1=True, mats=None, xf=None):
        if mats is not None:
            uniq = []
            for s in mats:
                if s not in uniq:
                    uniq.append(s)
            self.add(bm_loft(rings, cap0, cap1, [uniq.index(s) for s in mats]), uniq, xf)
        else:
            self.add(bm_loft(rings, cap0, cap1), mat, xf)

    def box(self, c, size, mat, bevel=0.0, segs=1, rot=None, xf=None):
        m = Matrix.Translation(Vector(c))
        if rot is not None:
            m = m @ rot
        if xf is not None:
            m = xf @ m
        self.add(bm_box(size, bevel, segs), mat, m)

    def slab(self, c, size, mat, bevel=0.0, rot=None, xf=None):
        m = Matrix.Translation(Vector(c))
        if rot is not None:
            m = m @ rot
        if xf is not None:
            m = xf @ m
        self.add(bm_slab(size, bevel), mat, m)

    def ball(self, c, r, mat, n=8, steps=1, e=2.0, xf=None):
        r = r if isinstance(r, (list, tuple)) else (r, r, r)
        c = Vector(c)
        lo = dome(c, r[0], r[1], r[2], n, e, steps, -1)
        hi = dome(c, r[0], r[1], r[2], n, e, steps, 1)
        self.loft(list(reversed(lo)) + [ring(c, r[0], r[1], n, e)] + hi, mat, xf=xf)

    def tube(self, path, radii, mat, n=8, e=2.0, up=Z, xf=None):
        self.loft(tube_rings([Vector(p) for p in path], radii, n, e, up), mat, xf=xf)

    def obj(self, name, pivot, parent=None, parent_pivot=None, scale=1.0, angle=38.0):
        """Mesh object whose origin is `pivot` (figure space); geometry and offsets are scaled by `scale`."""
        pv = Vector(pivot)
        for v in self.bm.verts:
            v.co = (v.co - pv) * scale
        ob = lib.to_object(name, self.bm, self.mats, angle=angle, parent=parent)
        ob.location = (pv - Vector(parent_pivot)) * scale if parent is not None else pv * scale
        return ob


def rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)


def about(p, m):
    """Matrix m applied about point p."""
    p = Vector(p)
    return Matrix.Translation(p) @ m @ Matrix.Translation(-p)


def mirror_x():
    return Matrix.Scale(-1, 4, X)


def bm_hull(pts):
    """Convex hull solid of a point list."""
    bm = bmesh.new()
    vs = [bm.verts.new(Vector(p)) for p in pts]
    res = bmesh.ops.convex_hull(bm, input=vs)
    junk = list({g for g in res.get('geom_interior', []) + res.get('geom_unused', []) if isinstance(g, bmesh.types.BMVert)})
    if junk:
        bmesh.ops.delete(bm, geom=junk, context='VERTS')
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.0), verts=bm.verts[:], edges=bm.edges[:])
    return bm


def bm_plate(grid, inward):
    """Closed plate from a grid of surface points [row][col], thickened along the vector `inward`."""
    bm = bmesh.new()
    rows, cols = len(grid), len(grid[0])
    f = [[bm.verts.new(p) for p in r] for r in grid]
    for j in range(rows - 1):
        for i in range(cols - 1):
            try:
                bm.faces.new([f[j][i], f[j][i + 1], f[j + 1][i + 1], f[j + 1][i]])
            except ValueError:
                pass
    loop = [(0, i) for i in range(cols)] + [(j, cols - 1) for j in range(1, rows)] + \
           [(rows - 1, i) for i in range(cols - 2, -1, -1)] + [(j, 0) for j in range(rows - 2, 0, -1)]
    b = {}
    for j, i in loop:
        b[(j, i)] = bm.verts.new(grid[j][i] + inward)
    for k in range(len(loop)):
        p, q = loop[k], loop[(k + 1) % len(loop)]
        try:
            bm.faces.new([f[p[0]][p[1]], f[q[0]][q[1]], b[q], b[p]])
        except ValueError:
            pass
    try:
        bm.faces.new([b[p] for p in loop])
    except ValueError:
        pass
    return bm


def _hull(self, pts, mat, xf=None):
    self.add(bm_hull(pts), mat, xf)


def _plate(self, grid, inward, mat, xf=None):
    self.add(bm_plate(grid, Vector(inward)), mat, xf)


Part.hull = _hull
Part.plate = _plate

"""Shared generators for the vehicles family (see CONTRACT.md): chamfered boxes, prisms, lathes, sweeps, lofted
bodies with boolean cut-outs (wheel wells, cabin tubs, recesses), glazed greenhouses and the vehicle assembler."""
import bpy, bmesh, math
from contextlib import contextmanager
from mathutils import Matrix, Vector
import lib

# ---------------------------------------------------------------------------------------------------------------
# materials: short names -> contract names. Anything else is '<key>:#rrggbb' (auto-named flat colour).
NAMED = {
    'body': ('gloss__body', '#a8322a'), 'body2': ('gloss__body2', '#e6e1d3'), 'stripe': ('gloss__stripe', '#f1eee4'),
    'head': ('light__head', '#fff4d6'), 'tail': ('light__tail', '#b8141a'), 'amber': ('light__amber', '#f59a23'),
    'reverse': ('light__reverse', '#f0f0ea'), 'beacon_r': ('light__beacon_r', '#e8262c'),
    'beacon_b': ('light__beacon_b', '#2f62e0'), 'clear': ('clear', '#b9d0d6'), 'chrome': ('chrome', '#d6dade'),
    'wood': ('paint__wood', '#8a5a34'),
}
ALIAS = {
    'black': 'paint:#17181b', 'under': 'paint:#0f1012', 'trim': 'paint:#25272b', 'tyre': 'rubber:#161616',
    'rubber': 'rubber:#1b1b1c', 'steel': 'metal:#8d9399', 'dsteel': 'metal:#4b4f54', 'plate': 'paint:#e4e0cf',
    'white': 'paint:#ecebe6', 'grille': 'paint:#1d1f22', 'alu': 'metal:#b9bec3', 'yellow': 'gloss:#e3a81a',
    'red': 'gloss:#b3281f', 'orange': 'paint:#d9641c', 'wood2': 'paint:#c49a62',
}
_MATS, _MIDX = [], {}


def reset_materials():
    _MATS.clear()
    _MIDX.clear()


def M(name):
    """Material short name -> global slot index (creates the material on first use)."""
    if isinstance(name, int):
        return name
    name = ALIAS.get(name, name)
    i = _MIDX.get(name)
    if i is not None:
        return i
    if name in NAMED:
        m = lib.mat(*NAMED[name])
    else:
        key, col = name.split(':')
        m = lib.colour(key, col)
    _MIDX[name] = len(_MATS)
    _MATS.append(m)
    return _MIDX[name]


def to_obj(name, bm, weld=1e-4):
    if weld:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in _MATS:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def compact(ob):
    """Drops unused material slots (lib.finish's own slot removal shifts indices twice, so leave it nothing to do)."""
    me = ob.data
    used = sorted({p.material_index for p in me.polygons})
    mats = [me.materials[i] for i in used]
    remap = {i: j for j, i in enumerate(used)}
    idx = [remap[p.material_index] for p in me.polygons]
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    me.polygons.foreach_set('material_index', idx)
    me.update()
    return ob


def lin(line, x):
    """Piecewise-linear lookup in [(x, v), ...] (ascending x); constants pass through."""
    if not isinstance(line, (list, tuple)):
        return line
    if x <= line[0][0]:
        return line[0][1]
    for (x0, y0), (x1, y1) in zip(line, line[1:]):
        if x <= x1:
            return y0 + (y1 - y0) * (x - x0) / max(1e-9, x1 - x0)
    return line[-1][1]


def rotm(rot):
    if rot is None:
        return Matrix.Identity(4)
    if isinstance(rot, Matrix):
        return rot.to_4x4()
    rx, ry, rz = (math.radians(a) for a in rot)
    return Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')


def isect(p1, d1, p2, d2):
    """Closest point on line 1 to line 2 (coplanar lines: their intersection)."""
    c = d1.cross(d2)
    den = c.length_squared
    if den < 1e-12:
        return (p1 + p2) / 2
    t = (p2 - p1).cross(d2).dot(c) / den
    return p1 + d1 * t


# ---------------------------------------------------------------------------------------------------------------
class Kit:
    """A bmesh being filled with primitives. Faces are wound outwards explicitly (no global normal recalculation)."""

    def __init__(self):
        self.bm = bmesh.new()
        self.rec = None

    def f(self, pts, m, out=None, ref=None):
        vs = [p if isinstance(p, bmesh.types.BMVert) else self.bm.verts.new(p) for p in pts]
        try:
            face = self.bm.faces.new(vs)
        except ValueError:
            return None
        face.material_index = M(m)
        if out is not None or ref is not None:
            face.normal_update()
            o = Vector(out) if out is not None else face.calc_center_median() - Vector(ref)
            if face.normal.dot(o) < 0:
                face.normal_flip()
        if self.rec is not None:
            self.rec.append(face)
        return face

    def _closed(self, faces):
        faces = [f for f in faces if f is not None]
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        return faces

    @contextmanager
    def sym(self):
        """Everything added inside the block is mirrored to -Y as well."""
        prev, self.rec = self.rec, []
        yield
        faces, self.rec = self.rec, prev
        if faces:
            r = bmesh.ops.duplicate(self.bm, geom=faces)
            nf = [g for g in r['geom'] if isinstance(g, bmesh.types.BMFace)]
            for v in {v for f in nf for v in f.verts}:
                v.co.y = -v.co.y
            bmesh.ops.reverse_faces(self.bm, faces=nf)
            if prev is not None:
                prev.extend(faces + nf)

    @contextmanager
    def xf(self, mtx):
        """Everything added inside the block is transformed by `mtx`."""
        prev, self.rec = self.rec, []
        yield
        faces, self.rec = self.rec, prev
        for v in {v for f in faces for v in f.verts}:
            v.co = mtx @ v.co
        if mtx.determinant() < 0:
            bmesh.ops.reverse_faces(self.bm, faces=faces)
        if prev is not None:
            prev.extend(faces)

    # --- primitives ---------------------------------------------------------------------------------------------
    def box(self, c, s, m, bev=0.0, rot=None, only=None):
        """Box centred on c with size s; `bev` chamfers all edges, or only those parallel to axis `only` ('x','y','z')."""
        if only:
            a = 'xyz'.index(only)
            u, v = (a + 1) % 3, (a + 2) % 3
            hu, hv, b = s[u] / 2, s[v] / 2, min(bev, 0.45 * min(s[u], s[v]))
            prof = [(hu - b, -hv), (hu, -hv + b), (hu, hv - b), (hu - b, hv), (-hu + b, hv), (-hu, hv - b), (-hu, -hv + b), (-hu + b, -hv)]
            T = Matrix.Translation(c) @ rotm(rot)
            with self.xf(T):
                self.prism(prof, -s[a] / 2, s[a] / 2, only, m)
            return
        T = Matrix.Translation(c) @ rotm(rot)
        h = (s[0] / 2, s[1] / 2, s[2] / 2)
        b = min(bev, 0.45 * min(s))
        c = Vector(c)
        new = []
        if b <= 1e-5:
            vs = {(i, j, k): self.bm.verts.new(T @ Vector((i * h[0], j * h[1], k * h[2]))) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)}
            for a in range(3):
                for sa in (-1, 1):
                    q = []
                    for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                        key = [0, 0, 0]
                        key[a], key[(a + 1) % 3], key[(a + 2) % 3] = sa, su, sv
                        q.append(vs[tuple(key)])
                    new.append(self.f(q, m, ref=c))
            return new
        vs = {}
        for a in range(3):
            u, v = (a + 1) % 3, (a + 2) % 3
            for sa in (-1, 1):
                for su in (-1, 1):
                    for sv in (-1, 1):
                        p = [0, 0, 0]
                        p[a], p[u], p[v] = sa * h[a], su * (h[u] - b), sv * (h[v] - b)
                        vs[(a, sa, su, sv)] = self.bm.verts.new(T @ Vector(p))
        for a in range(3):
            for sa in (-1, 1):
                new.append(self.f([vs[(a, sa, -1, -1)], vs[(a, sa, 1, -1)], vs[(a, sa, 1, 1)], vs[(a, sa, -1, 1)]], m, ref=c))
                u = (a + 1) % 3
                for su in (-1, 1):
                    new.append(self.f([vs[(a, sa, su, -1)], vs[(a, sa, su, 1)], vs[(u, su, 1, sa)], vs[(u, su, -1, sa)]], m, ref=c))
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz in (-1, 1):
                    new.append(self.f([vs[(0, sx, sy, sz)], vs[(1, sy, sz, sx)], vs[(2, sz, sx, sy)]], m, ref=c))
        return new

    def prism(self, prof, lo, hi, axis, m, mcap=None):
        """Extrudes a closed 2D profile along an axis. axis 'x': prof is (y, z); 'y': (x, z); 'z': (x, y)."""
        def P(p, t):
            return {'x': (t, p[0], p[1]), 'y': (p[0], t, p[1]), 'z': (p[0], p[1], t)}[axis]
        a = [self.bm.verts.new(P(p, lo)) for p in prof]
        b = [self.bm.verts.new(P(p, hi)) for p in prof]
        n = len(prof)
        fs = [self.f([a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]], m) for i in range(n)]
        fs += [self.f(a[::-1], mcap or m), self.f(b, mcap or m)]
        return self._closed(fs)

    def cyl(self, p0, p1, r, m, seg=10, r1=None, mcap=None, phase=0.0, caps=True):
        """Cylinder or cone frustum between two points."""
        p0, p1 = Vector(p0), Vector(p1)
        r1 = r if r1 is None else r1
        d = (p1 - p0).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = d.cross(up).normalized()
        w = d.cross(u)
        ring = lambda p, rr: [self.bm.verts.new(p + (u * math.cos(phase + 2 * math.pi * i / seg) + w * math.sin(phase + 2 * math.pi * i / seg)) * rr) for i in range(seg)]
        a, b = ring(p0, r), ring(p1, r1)
        fs = [self.f([a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]], m) for i in range(seg)]
        if caps:
            fs += [self.f(a[::-1], mcap or m), self.f(b, mcap or m)]
            return self._closed(fs)
        mid = (p0 + p1) / 2
        for f in fs:
            c = f.calc_center_median()
            f.normal_update()
            if f.normal.dot(c - mid - d * (c - mid).dot(d)) < 0:
                f.normal_flip()
        return fs

    def lathe(self, o, d, prof, m, seg=12, phase=0.0):
        """Solid of revolution about the axis through `o` along `d`. prof = [(t, r), ...] or [(t, r, mat), ...]
        (mat applies to the band ending at that point). Open ends are capped."""
        o, d = Vector(o), Vector(d).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = d.cross(up).normalized()
        w = d.cross(u)
        rings = []
        for p in prof:
            t, r = p[0], p[1]
            if r < 1e-6:
                rings.append([self.bm.verts.new(o + d * t)])
            else:
                rings.append([self.bm.verts.new(o + d * t + (u * math.cos(phase + 2 * math.pi * i / seg) + w * math.sin(phase + 2 * math.pi * i / seg)) * r) for i in range(seg)])
        fs = []
        for j in range(len(prof) - 1):
            a, b = rings[j], rings[j + 1]
            mm = prof[j + 1][2] if len(prof[j + 1]) > 2 else m
            if len(a) == 1 and len(b) == 1:
                continue
            for i in range(seg):
                k = (i + 1) % seg
                if len(a) == 1:
                    fs.append(self.f([a[0], b[i], b[k]], mm))
                elif len(b) == 1:
                    fs.append(self.f([a[i], a[k], b[0]], mm))
                else:
                    fs.append(self.f([a[i], a[k], b[k], b[i]], mm))
        if len(rings[0]) > 1:
            fs.append(self.f(rings[0][::-1], prof[0][2] if len(prof[0]) > 2 else m))
        if len(rings[-1]) > 1:
            fs.append(self.f(rings[-1], prof[-1][2] if len(prof[-1]) > 2 else m))
        return self._closed(fs)

    def sweep(self, path, prof, m, up=(0, 0, 1), closed=False, caps=True):
        """Sweeps a closed 2D profile along a 3D polyline with mitred joints. Profile coords are (a, b): `a` to the
        right of travel (tangent x up), `b` along up."""
        P = [Vector(p) for p in path]
        up = Vector(up)
        n = len(P)

        def frame(p, t):
            a = t.cross(up)
            if a.length < 1e-6:
                a = t.cross(Vector((1, 0, 0)))
            a.normalize()
            b = a.cross(t).normalized()
            return [p + a * q[0] + b * q[1] for q in prof]

        def project(ring, din, p, nrm):
            den = din.dot(nrm)
            return [q + din * ((p - q).dot(nrm) / den) for q in ring]

        rings = []
        if closed:
            din = (P[0] - P[-1]).normalized()
            cur = frame((P[0] + P[-1]) / 2, din)
            for i in range(n):
                dout = (P[(i + 1) % n] - P[i]).normalized()
                cur = project(cur, din, P[i], (din + dout).normalized())
                rings.append(cur)
                din = dout
        else:
            din = (P[1] - P[0]).normalized()
            cur = frame(P[0], din)
            rings.append(cur)
            for i in range(1, n):
                dout = (P[i + 1] - P[i]).normalized() if i < n - 1 else din
                cur = project(cur, din, P[i], (din + dout).normalized())
                rings.append(cur)
                din = dout
        V = [[self.bm.verts.new(q) for q in r] for r in rings]
        k = len(prof)
        fs = []
        for i in range(len(V) - (0 if closed else 1)):
            a, b = V[i], V[(i + 1) % len(V)]
            fs += [self.f([a[j], a[(j + 1) % k], b[(j + 1) % k], b[j]], m) for j in range(k)]
        if not closed and caps:
            fs += [self.f(V[0][::-1], m), self.f(V[-1], m)]
        return self._closed(fs)

    def tube(self, path, r, m, seg=6, closed=False, caps=True):
        prof = [(r * math.cos(2 * math.pi * i / seg + math.pi / seg), r * math.sin(2 * math.pi * i / seg + math.pi / seg)) for i in range(seg)]
        return self.sweep(path, prof, m, closed=closed, caps=caps)

    def bar(self, path, w, h, m, bev=0.0, closed=False):
        """Rectangular (optionally chamfered) bar swept along a path; w across, h along up."""
        if bev > 0:
            b = min(bev, 0.45 * min(w, h))
            prof = [(w / 2 - b, -h / 2), (w / 2, -h / 2 + b), (w / 2, h / 2 - b), (w / 2 - b, h / 2), (-w / 2 + b, h / 2), (-w / 2, h / 2 - b), (-w / 2, -h / 2 + b), (-w / 2 + b, -h / 2)]
        else:
            prof = [(w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2), (-w / 2, -h / 2)]
        return self.sweep(path, prof, m, closed=closed)

    def obj(self, name, weld=1e-4):
        return to_obj(name, self.bm, weld)

    def patch(self, grid, m, out):
        """Open quad sheet through a 2D grid of points, wound towards `out`."""
        V = [[self.bm.verts.new(p) for p in row] for row in grid]
        fs = []
        for i in range(len(V) - 1):
            for j in range(len(V[i]) - 1):
                fs.append(self.f([V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]], m, out=out))
        return fs

    def slab(self, grid, m, thick, out, medge=None):
        """Raised strip: the sheet `grid` pushed out by `thick` along `out`, with side walls down to the surface."""
        o = Vector(out).normalized() * thick
        top = [[Vector(p) + o for p in row] for row in grid]
        self.patch(top, m, out)
        ring = [(i, 0) for i in range(len(grid))] + [(len(grid) - 1, j) for j in range(1, len(grid[0]))]
        ring += [(i, len(grid[0]) - 1) for i in range(len(grid) - 2, -1, -1)] + [(0, j) for j in range(len(grid[0]) - 2, 0, -1)]
        ctr = sum((Vector(grid[i][j]) for i, j in ring), Vector()) / len(ring)
        for (i0, j0), (i1, j1) in zip(ring, ring[1:] + ring[:1]):
            self.f([grid[i0][j0], grid[i1][j1], top[i1][j1], top[i0][j0]], medge or m, ref=ctr)


# ---------------------------------------------------------------------------------------------------------------
class Loft:
    """Lower body: a closed shell lofted along X through chamfered cross-sections.
    top / bot / wid are [(x, value), ...] lines (any order): top height, underside height and half-width."""

    def __init__(self, top, bot, wid, tuck=0.05, cham=0.035, crease=0.56, crown=0.02, lean=0.012, rocker=0.05,
                 upper='body', lower=None, under='under', bands=(), tbands=(), xs=(), paint=None):
        srt = lambda l: sorted(l, key=lambda p: p[0]) if isinstance(l, (list, tuple)) else l
        self.top, self.bot, self.wid, self.crease = srt(top), srt(bot), srt(wid), srt(crease)
        self.tuck, self.cham, self.crown, self.lean, self.rocker = tuck, cham, crown, lean, rocker
        self.upper, self.lower, self.under = upper, lower or upper, under
        self.bands, self.tbands, self.paint = list(bands), list(tbands), paint  # (z0, z1, mat[, x0, x1]) / (y0, y1, mat[, x0, x1])
        xs = set(xs)
        for l in (self.top, self.bot, self.wid, self.crease):
            if isinstance(l, list):
                xs |= {p[0] for p in l}
        for b in self.bands + self.tbands:
            xs |= set(b[3:5])
        self.x0, self.x1 = min(xs), max(xs)
        self.xs = []
        for x in sorted(xs):
            if not self.xs or x - self.xs[-1] > 0.002:
                self.xs.append(x)

    def base(self, x):
        zb, zt, w = lin(self.bot, x), lin(self.top, x), lin(self.wid, x)
        h = max(zt - zb, 0.02)
        cham, tuck, rk = min(self.cham, h * 0.3, w * 0.4), min(self.tuck, w * 0.3), min(self.rocker, h * 0.25)
        zc = min(max(lin(self.crease, x), zb + rk + 0.02), zt - cham - 0.02)
        cr = self.crown * min(1.0, w / 0.8)
        return [(0.0, zb), (w - tuck - rk * 0.8, zb), (w - tuck, zb + rk), (w, zc), (w - self.lean, zt - cham),
                (w - self.lean - cham * 1.1, zt), (w * 0.5, zt + cr * 0.75), (0.0, zt + cr)]

    def section(self, x):
        """Half section (y >= 0) from the bottom centre to the top centre, with band points inserted."""
        p = self.base(x)
        side, top = p[2:5], p[5:8]
        for b in self.bands:
            for z in b[:2]:
                z = min(max(z, side[0][1] + 0.004), side[-1][1] - 0.004)
                for i in range(len(side) - 1):
                    if side[i][1] <= z <= side[i + 1][1]:
                        t = (z - side[i][1]) / max(1e-9, side[i + 1][1] - side[i][1])
                        side.insert(i + 1, (side[i][0] + (side[i + 1][0] - side[i][0]) * t, z))
                        break
        for b in self.tbands:
            for y in b[:2]:
                y = min(max(y, 0.004), top[0][0] - 0.004)
                for i in range(len(top) - 1):
                    if top[i][0] >= y >= top[i + 1][0]:
                        t = (top[i][0] - y) / max(1e-9, top[i][0] - top[i + 1][0])
                        top.insert(i + 1, (y, top[i][1] + (top[i + 1][1] - top[i][1]) * t))
                        break
        return p[:2] + side + top, 1, 1 + len(side) + 1  # points, first side face, first top face

    def side_y(self, x, z):
        p = self.base(x)[1:6]
        if z <= p[0][1]:
            return p[0][0]
        for (y0, z0), (y1, z1) in zip(p, p[1:]):
            if z <= z1:
                return y0 + (y1 - y0) * (z - z0) / max(1e-9, z1 - z0)
        return p[-1][0]

    def top_z(self, x, y=0.0):
        p = self.base(x)[5:8]
        y = abs(y)
        for (y0, z0), (y1, z1) in zip(p, p[1:]):
            if y >= y1:
                return z0 + (z1 - z0) * (y0 - y) / max(1e-9, y0 - y1)
        return p[-1][1]

    def xs_between(self, x0, x1):
        lo, hi = min(x0, x1), max(x0, x1)
        return sorted({lo, hi, *[x for x in self.xs if lo < x < hi]})

    def mat_at(self, zone, x, c, zc):
        if self.paint:
            r = self.paint(zone, x, c)
            if r:
                return r
        if zone == 'under':
            return self.under
        if zone == 'side':
            for b in self.bands:
                if b[0] - 1e-4 <= c <= b[1] + 1e-4 and (len(b) < 5 or b[3] - 1e-4 <= x <= b[4] + 1e-4):
                    return b[2]
            return self.lower if c < zc else self.upper
        for b in self.tbands:
            if b[0] - 1e-4 <= c <= b[1] + 1e-4 and (len(b) < 5 or b[3] - 1e-4 <= x <= b[4] + 1e-4):
                return b[2]
        return self.upper

    def build(self, name='loft'):
        k = Kit()
        rings, half = [], []
        for x in self.xs:
            p, i_side, i_top = self.section(x)
            half.append(p)
            full = p + [(-y, z) for y, z in p[-2:0:-1]]
            rings.append([k.bm.verts.new((x, y, z)) for y, z in full])
        n, m = len(rings[0]), len(half[0])
        fs = []
        for i in range(len(rings) - 1):
            xm = (self.xs[i] + self.xs[i + 1]) / 2
            zc = lin(self.crease, xm)
            for j in range(n):
                jj = (j + 1) % n
                h = j if j < m - 1 else n - 1 - j  # index of the half-section face
                zone = 'under' if h < i_side else ('side' if h < i_top - 1 else 'top')
                a, b = half[i][h], half[i][h + 1]
                a2, b2 = half[i + 1][h], half[i + 1][h + 1]
                c = (a[1] + b[1] + a2[1] + b2[1]) / 4 if zone == 'side' else (a[0] + b[0] + a2[0] + b2[0]) / 4
                fs.append(k.f([rings[i][j], rings[i][jj], rings[i + 1][jj], rings[i + 1][j]], self.mat_at(zone, xm, c, zc)))
        fs += [k.f(rings[0][::-1], self.upper), k.f(rings[-1], self.upper)]
        k._closed(fs)
        return k.obj(name)


def arch_profile(cx, cz, r, sq=2.0, seg=14, a0=-22.0, a1=202.0):
    """Wheel-arch outline around (cx, cz): superellipse of exponent `sq` (2 = round, 4+ = squared-off)."""
    pts = []
    for i in range(seg + 1):
        a = math.radians(a0 + (a1 - a0) * i / seg)
        c, s = math.cos(a), math.sin(a)
        e = 2.0 / sq
        pts.append((cx + r * math.copysign(abs(c) ** e, c), cz + r * math.copysign(abs(s) ** e, s)))
    return pts


def solidify(bm, thick, m_inner, m_rim):
    """Gives an open skin an inner shell `thick` behind it plus rim faces along its open borders."""
    bm.normal_update()
    faces = bm.faces[:]
    border = [e for e in bm.edges if len(e.link_faces) == 1]
    off = {v: v.co - v.normal * thick * min(v.calc_shell_factor(), 2.2) for v in bm.verts}
    r = bmesh.ops.duplicate(bm, geom=faces)
    vmap = r['vert_map']
    nf = [g for g in r['geom'] if isinstance(g, bmesh.types.BMFace)]
    for v, co in off.items():
        vmap[v].co = co
    for f in nf:
        f.material_index = M(m_inner)
    for e in border:
        a, b = e.verts
        bm.faces.new([a, b, vmap[b], vmap[a]]).material_index = M(m_rim)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])


def window(fk, gk, outer, corners, margins, m, ref, gm='clear', inset=0.012, grow=0.004):
    """Framed opening in a planar panel. `outer` is the panel outline, `corners` the indices of its real corners,
    `margins` the frame width along each side (corner i -> corner i+1). Frame faces go to kit fk, the pane to gk."""
    n = len(corners)
    C = [Vector(outer[i]) for i in corners]
    ctr = sum(C, Vector()) / n
    nrm = Vector()
    for i in range(n):
        nrm += C[i].cross(C[(i + 1) % n])
    nrm.normalize()
    if nrm.dot(ctr - Vector(ref)) < 0:
        nrm = -nrm
    lines = []
    for i in range(n):
        a, b = C[i], C[(i + 1) % n]
        d = (b - a).normalized()
        inw = nrm.cross(d)
        if inw.dot(ctr - a) < 0:
            inw = -inw
        lines.append((a + inw * margins[i], d))
    G = [isect(*lines[i - 1], *lines[i]) for i in range(n)]
    N = len(outer)
    for i in range(n):
        if margins[i] <= 1e-6:
            continue
        j, poly = corners[i], []
        while True:
            poly.append(Vector(outer[j]))
            if j == corners[(i + 1) % n]:
                break
            j = (j + 1) % N
        fk.f(poly + [G[(i + 1) % n], G[i]], m, out=nrm)
    if gk is not None:
        gc = sum(G, Vector()) / n
        gk.f([g + (g - gc).normalized() * grow - nrm * inset for g in G], gm, out=nrm)
    return G


def greenhouse(v, pts, wb, wr, pillars=(), a=0.05, c=0.07, rail=0.04, sill=0.0, ws=(0.035, 0.04), back=(0.04, 0.045),
               solid=(), crown=0.02, bevel=0.02, thick=0.03, frame='body', roof='body', inner='paint:#cfc7b6',
               reveal='black', glass='clear', ttop=None, back_solid=False, ws_solid=False, name='cab', wr_back=None):
    """Glazed cabin. pts: side-view outline [(x, z)] from the windscreen base over the roof to the rear-window base.
    wb / wr: half-width at the belt and at the roof. pillars: [(x_bottom, x_top, width)] between the side windows.
    a / c: front / rear pillar widths, rail: roof rail, ws / back: (side+top, bottom) margins of the end glasses.
    solid: side cells (0 = front) without glass. ttop: (x_front, x_rear) glazed roof panels."""
    P0, Pn = pts[0], pts[-1]
    roofl = sorted(pts[1:-1], key=lambda p: p[0])
    z0, z1 = min(P0[1], Pn[1]), max(p[1] for p in pts)
    yy = lambda z: wb + (wr - wb) * (z - z0) / max(1e-6, z1 - z0)
    belt = lambda x: P0[1] + (Pn[1] - P0[1]) * (P0[0] - x) / max(1e-6, P0[0] - Pn[0])
    div = [(P0[0], pts[1][0], a)] + sorted(pillars, key=lambda p: -p[0]) + [(Pn[0], pts[-2][0], c)]
    sx = {p[0] for p in roofl} | {d[1] for d in div} | (set(ttop) if ttop else set())
    st = sorted(sx, reverse=True)  # roof stations, front to rear
    st = [x for i, x in enumerate(st) if i == 0 or st[i - 1] - x > 0.002]
    rz = lambda x: lin(roofl, x)
    ncr = lambda i: 0.0 if i in (0, len(st) - 1) else crown
    S = lambda x, z, s=1: Vector((x, s * yy(z), z))
    ref = Vector(((P0[0] + Pn[0]) / 2, 0, z0 + 0.1))
    fk, gk = Kit(), v.k
    # roof
    for i in range(len(st) - 1):
        xa, xb = st[i], st[i + 1]
        for s in (1, -1):
            q = [S(xa, rz(xa), s), S(xb, rz(xb), s), Vector((xb, 0, rz(xb) + ncr(i + 1))), Vector((xa, 0, rz(xa) + ncr(i)))]
            if ttop and ttop[1] - 1e-4 <= xb and xa <= ttop[0] + 1e-4:
                window(fk, gk, q, [0, 1, 2, 3], [0.05, 0.045, 0.045, 0.045], roof, ref, glass)
            else:
                fk.f(q, roof, ref=ref)
    # sides
    for s in (1, -1):
        for ci in range(len(div) - 1):
            F, R = div[ci], div[ci + 1]
            top = [x for x in st if F[1] + 1e-4 >= x >= R[1] - 1e-4]
            outer = [S(F[0], belt(F[0]), s)] + [S(x, rz(x), s) for x in top] + [S(R[0], belt(R[0]), s)]
            if ci in solid:
                fk.f(outer, frame, ref=ref)
                continue
            n = len(outer)
            mf = F[2] if ci == 0 else F[2] / 2
            mr = R[2] if ci == len(div) - 2 else R[2] / 2
            window(fk, gk, outer, [0, 1, n - 2, n - 1], [mf, rail, mr, sill], frame, ref, glass)
    # windscreen and rear window
    for (B, T, mg, sol, ci) in ((P0, pts[1], ws, ws_solid, 0), (Pn, pts[-2], back, back_solid, len(st) - 1)):
        wy = wr_back if (wr_back and B is Pn) else None
        outer = [S(B[0], B[1], 1), S(B[0], B[1], -1), S(T[0], T[1], -1), Vector((T[0], 0, T[1])), S(T[0], T[1], 1)]
        if sol:
            fk.f(outer, frame, ref=ref)
        else:
            window(fk, gk, outer, [0, 1, 2, 4], [mg[1], mg[0], mg[0], mg[0]], frame, ref, glass)
    bm = fk.bm
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    if bevel > 0:
        bm.normal_update()
        ed = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(22)]
        bmesh.ops.bevel(bm, geom=ed, offset=bevel, segments=1, affect='EDGES', clamp_overlap=True)
    solidify(bm, thick, inner, reveal)
    v.parts.append(to_obj(name, bm))
    return yy


# ---------------------------------------------------------------------------------------------------------------
class Vehicle:
    """Collects solids (with their boolean cutters), detail geometry and child parts, then joins them into one asset."""

    def __init__(self, name, type='car'):
        self.name, self.k, self.parts, self.solids, self.children = name, Kit(), [], [], []
        self.extra = {'type': type, 'wheels': []}
        self.L = None

    def loft(self, *a, **kw):
        L = Loft(*a, **kw)
        self.solids.append([L.build(self.name + '_body'), []])
        if self.L is None:
            self.L = L
        return L

    def solid(self, kit):
        self.solids.append([kit.obj(self.name + '_solid'), []])
        return len(self.solids) - 1

    def cut(self, kit, target=0):
        self.solids[target][1].append(kit.obj('cutter'))

    def cut_box(self, c, s, m, bev=0.0, target=0, rot=None, only=None):
        k = Kit()
        k.box(c, s, m, bev, rot, only)
        self.cut(k, target)

    def wheel(self, x, y, r, name='wheel_steel', z=None):
        for s in (1, -1):
            self.extra['wheels'].append([round(x, 3), round(s * y, 3), round(r if z is None else z, 3), round(r, 3), name])

    def arch(self, x, r, wheel_r, depth=0.30, sq=2.0, lip=0.045, lip_m='body', liner='under', target=0, L=None, z=None, t=0.02):
        """Wheel well: a pocket cut into both flanks plus a chamfered lip around the opening."""
        L = L or self.L
        cz = wheel_r if z is None else z
        prof = arch_profile(x, cz, r, sq)
        cut = [(prof[0][0], -0.3)] + prof + [(prof[-1][0], -0.3)]
        w = max(L.side_y(px, pz) for px, pz in prof)
        k = Kit()
        with k.sym():
            k.prism(cut, w - depth, w + 0.2, 'y', liner)
        self.cut(k, target)
        if lip <= 0:
            return
        rows = []
        for (px, pz), (qx, qz) in zip(prof, arch_profile(x, cz, r + lip, sq)):
            if pz < lin(L.bot, px) + 0.012:
                continue
            y = L.side_y(px, pz)
            mx, mz = px + (qx - px) * 0.55, pz + (qz - pz) * 0.55
            rows.append([(px, y - 0.03, pz), (px, y + t, pz), (mx, y + t, mz), (qx, L.side_y(qx, qz) - 0.004, qz)])
        with self.k.sym():
            self.k.patch(rows, lip_m, (0, 1, 0))
            for rw in (rows[0], rows[-1]):
                self.k.f(rw, lip_m, out=(0, 0, -1))

    def finish(self):
        objs = []
        dg = bpy.context.evaluated_depsgraph_get()
        for ob, cutters in self.solids:
            for c in cutters:
                md = ob.modifiers.new('cut', 'BOOLEAN')
                md.operation, md.solver, md.object = 'DIFFERENCE', 'EXACT', c
                md.material_mode = 'TRANSFER'
            if cutters:
                dg.update()
                me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
                ob.modifiers.clear()
                ob.data = me
                for c in cutters:
                    bpy.data.objects.remove(c, do_unlink=True)
            objs.append(ob)
        objs += self.parts + [self.k.obj(self.name + '_detail')]
        ob = lib.join(self.name, objs)
        lib.finish(compact(ob))
        for ch in self.children:
            ch.parent = ob
            lib.finish(compact(ch))
        # lib.bounds ignores the offset of child parts, so the true envelope is measured here and overrides size / min
        pts = [Vector(c) for c in ob.bound_box] + [ch.matrix_basis @ Vector(c) for ch in self.children for c in ch.bound_box]
        lo = [min(p[i] for p in pts) for i in range(3)]
        hi = [max(p[i] for p in pts) for i in range(3)]
        self.extra.update(length=round(hi[0] - lo[0], 3), width=round(hi[1] - lo[1], 3),
                          size=[round(hi[i] - lo[i], 3) for i in range(3)], min=[round(x, 3) for x in lo])
        return ob

    def child(self, part, kit, origin, rot=None):
        """Separate moving part `<asset>.<part>`. Without `rot` the geometry is given in asset space and `origin`
        becomes its pivot; with `rot` (euler) the geometry is in the part's own space."""
        ob = kit.obj(f'{self.name}.{part}')
        if rot is None:
            ob.data.transform(Matrix.Translation(-Vector(origin)))
        else:
            ob.rotation_euler = rot
        ob.location = origin
        self.children.append(ob)
        return ob

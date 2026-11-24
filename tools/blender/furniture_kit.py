"""Shared mesh builder and shape generators for the furniture family (see CONTRACT.md).

Every asset is assembled from the same few primitives (chamfered boxes, lathes, tubes, prisms, atlas decals)
so the whole family shares one shape language. Front is Blender -Y, origin on the floor.
"""
import bpy, bmesh, math, random
from mathutils import Matrix, Vector, Euler
import lib
import furniture_atlas as atlas

# short name -> '<material name or key>:<colour>'; '#rrggbb' alone means a flat `paint` colour
PAL = {
    'wood': 'paint__wood:#8f5d38', 'fabric': 'paint__fabric:#c4473b',
    'wood_d': '#5b3a25', 'wood_dd': '#3d2819', 'wood_l': '#c69a63', 'wood_ll': '#e3c08a', 'wood_r': '#7a3f2a',
    'white': '#ecebe6', 'offwhite': '#d9d5c8', 'cream': '#e4d6b0', 'beige': '#c9b892', 'tan': '#a98f68',
    'black': '#1d1d20', 'char': '#2f3033', 'grey_d': '#4a4d52', 'grey': '#7d8187', 'grey_l': '#b4b7ba', 'silver': '#cfd2d4',
    'red': '#b8332b', 'red_d': '#7c221f', 'orange': '#dd7a2c', 'yellow': '#e3b83a', 'mustard': '#c29a36',
    'green': '#3f7d4b', 'green_d': '#254d33', 'green_l': '#7fb069', 'teal': '#3f8f8c', 'mint': '#a9d3c3',
    'blue': '#3b62a8', 'blue_d': '#27406e', 'blue_l': '#7fa7d6', 'navy': '#1f2c4a', 'purple': '#6e4a94', 'pink': '#d98fa0',
    'brown': '#6b4a34', 'brick': '#8e4a3a', 'brick_d': '#6d362b', 'mortar': '#b9ada0', 'leather': '#5a3526',
    'steel': 'metal:#9da3a8', 'steel_d': 'metal:#5c6268', 'iron': 'metal:#3a3d42', 'brass': 'metal:#b9933c',
    'copper': 'metal:#b06a3c', 'chrome': 'chrome:#dadde0', 'gold': 'chrome:#d4af4a',
    'enamel': 'gloss:#eeeeea', 'enamel_g': 'gloss:#8fae8f', 'enamel_y': 'gloss:#d9c58a', 'enamel_r': 'gloss:#b3261e',
    'enamel_k': 'gloss:#1c1c1f', 'enamel_b': 'gloss:#2f5d9e', 'enamel_br': 'gloss:#6a4a36', 'porcelain': 'gloss:#f1f0ec',
    'rubber': 'rubber:#19191b', 'rubber_g': 'rubber:#3b3d40',
    'glass': 'glass:#18222b', 'screen': 'glass:#20302c', 'mirror': 'chrome:#b9c8d0', 'clear': 'clear:#c5dde4',
    'clear_g': 'clear:#7fb08a', 'clear_a': 'clear:#b9772e',
    'lamp': 'light__lamp:#ffe2a8', 'panel': 'light__panel:#fbf6e6', 'neon': 'light__neon:#ff4a6a',
    'neon2': 'light__neon2:#4ad8ff', 'glow': 'light__screen:#9fd8c0', 'ledr': 'light__led:#ff3b2f',
    'leaf': '#3f8a45', 'leaf_d': '#2d6a39', 'leaf_l': '#69a84f', 'soil': '#3b2a20', 'terra': '#b6623f',
    'atlas': 'atlas',
}
_cache = {}


def reset():
    _cache.clear()
    atlas.reset()


def material(spec):
    if spec in _cache:
        return _cache[spec]
    s = PAL.get(spec, spec)
    if s == 'atlas':
        m = atlas.material()
    elif s.startswith('#'):
        m = lib.colour('paint', s)
    else:
        k, c = s.split(':')
        m = lib.mat(k, c) if '__' in k else lib.colour(k, c)
    _cache[spec] = m
    return m


def _mtx(x, y, z, rx=0.0, ry=0.0, rz=0.0):
    t = Matrix.Translation((x, y, z))
    if rx or ry or rz:
        t = t @ Euler((math.radians(rx), math.radians(ry), math.radians(rz)), 'XYZ').to_matrix().to_4x4()
    return t


_DIRS = {'t': (0, 0, 1), 'b': (0, 0, -1), 'f': (0, -1, 0), 'k': (0, 1, 0), 'l': (-1, 0, 0), 'r': (1, 0, 0)}
_CUBE_F = {'b': (0, 3, 2, 1), 't': (4, 5, 6, 7), 'f': (0, 1, 5, 4), 'k': (2, 3, 7, 6), 'l': (0, 4, 7, 3), 'r': (1, 2, 6, 5)}


class Mesh:
    """Accumulates vertices and faces of one asset; `build()` turns it into a Blender object."""

    def __init__(self, name, pivot=(0, 0, 0)):
        self.name, self.pivot = name, Vector(pivot)
        self.v, self.f, self.mats, self.slots, self.parts = [], [], [], {}, []

    # ---- bookkeeping
    def slot(self, spec):
        if spec not in self.slots:
            self.slots[spec] = len(self.mats)
            self.mats.append(material(spec))
        return self.slots[spec]

    def part(self, name, pivot=(0, 0, 0)):
        p = Mesh(f'{self.name}.{name}', pivot)
        self.parts.append(p)
        return p

    def mark(self):
        return (len(self.v), len(self.f))

    def add(self, verts, faces, m, mtx=None, uvs=None):
        s, b = self.slot(m), len(self.v)
        self.v.extend((mtx @ Vector(p)) if mtx is not None else Vector(p) for p in verts)
        for i, fc in enumerate(faces):
            self.f.append((tuple(b + j for j in fc), s, uvs[i] if uvs else None))

    def _dump(self, bm, m, mtx):
        bm.verts.index_update()
        self.add([v.co.copy() for v in bm.verts], [[v.index for v in f.verts] for f in bm.faces], m, mtx)
        bm.free()

    # ---- primitives
    def box(self, m, x, y, z, w, d, h, bev=0.0, seg=1, edges='all', skip='', rx=0, ry=0, rz=0, taper=None, shear=None):
        """Box centred on (x, y) standing on z. `bev` chamfers `edges` ('all', or letters: xyz = edges parallel
        to that axis, TBFKLR = the four edges of that face). `skip` omits faces (tbfklr). `taper` = (sx, sy)
        scale of the top; `shear` = (dx, dy) offset of the top."""
        mtx = _mtx(x, y, z, rx, ry, rz)
        hw, hd = w / 2, d / 2
        if bev <= 0:
            vs = [Vector(p) for p in ((-hw, -hd, 0), (hw, -hd, 0), (hw, hd, 0), (-hw, hd, 0), (-hw, -hd, h), (hw, -hd, h), (hw, hd, h), (-hw, hd, h))]
            fs = [f for k, f in _CUBE_F.items() if k not in skip]
        else:
            bm = bmesh.new()
            bmesh.ops.create_cube(bm, size=1.0)
            for v in bm.verts:
                v.co = Vector((v.co.x * w, v.co.y * d, (v.co.z + 0.5) * h))
            es = bm.edges[:] if edges == 'all' else [e for e in bm.edges if _edge_sel(e, edges, hw, hd, h)]
            bmesh.ops.bevel(bm, geom=es, offset=min(bev, 0.49 * min(w, d, h)), segments=seg, affect='EDGES', profile=0.5)
            if skip:
                bm.normal_update()
                dead = [f for f in bm.faces if any(f.normal.dot(Vector(_DIRS[k])) > 0.999 for k in skip)]
                bmesh.ops.delete(bm, geom=dead, context='FACES')
            bm.verts.index_update()
            vs = [v.co.copy() for v in bm.verts]
            fs = [[v.index for v in f.verts] for f in bm.faces]
            bm.free()
        if taper or shear:
            tx, ty = taper or (1, 1)
            sx, sy = shear or (0, 0)
            for v in vs:
                k = v.z / h
                v.x = v.x * (1 + (tx - 1) * k) + sx * k
                v.y = v.y * (1 + (ty - 1) * k) + sy * k
        self.add(vs, fs, m, mtx)

    def soft(self, m, x, y, z, w, d, h, r=0.04, **kw):
        """Upholstery block: large two-step bevel."""
        self.box(m, x, y, z, w, d, h, bev=r, seg=2, **kw)

    def lathe(self, m, x, y, z, prof, n=12, axis='z', caps=(True, True), rx=0, ry=0, rz=0, sx=1.0, sy=1.0, phase=0.0, arc=360.0):
        """Revolves `prof` [(radius, height), ...] about `axis` from (x, y, z). Outer surfaces run bottom to top,
        inner surfaces top to bottom. Ends at radius 0 close to a point, others get caps."""
        vs, fs, rings = [], [], []
        full = arc >= 359.9
        cnt = n if full else n + 1
        for r, hgt in prof:
            if r <= 1e-6:
                rings.append([len(vs)])
                vs.append((0, 0, hgt))
            else:
                rings.append(list(range(len(vs), len(vs) + cnt)))
                for j in range(cnt):
                    a = math.radians(phase + arc * j / n)
                    vs.append((r * sx * math.cos(a), r * sy * math.sin(a), hgt))
        seg = n if full else n
        for i in range(len(rings) - 1):
            a, b = rings[i], rings[i + 1]
            for j in range(seg):
                j2 = (j + 1) % cnt if full else j + 1
                if len(a) == 1 and len(b) == 1:
                    continue
                if len(a) == 1:
                    fs.append((a[0], b[j2], b[j]))
                elif len(b) == 1:
                    fs.append((a[j], a[j2], b[0]))
                else:
                    fs.append((a[j], a[j2], b[j2], b[j]))
        up = prof[-1][1] >= prof[0][1]
        if caps[0] and len(rings[0]) > 1:
            first_up = prof[1][1] > prof[0][1] or (prof[1][1] == prof[0][1] and up)
            fs.append(tuple(reversed(rings[0])) if first_up else tuple(rings[0]))
        if caps[1] and len(rings[-1]) > 1:
            last_up = prof[-1][1] > prof[-2][1] or (prof[-1][1] == prof[-2][1] and up)
            fs.append(tuple(rings[-1]) if last_up else tuple(reversed(rings[-1])))
        mtx = _mtx(x, y, z, rx, ry, rz)
        if axis == 'x':
            mtx = mtx @ Matrix.Rotation(math.radians(90), 4, 'Y')
        elif axis == 'y':
            mtx = mtx @ Matrix.Rotation(math.radians(-90), 4, 'X')
        self.add(vs, fs, m, mtx)

    def cyl(self, m, x, y, z, r, h, n=12, axis='z', r2=None, bev=0.0, **kw):
        r2 = r if r2 is None else r2
        if bev > 0:
            prof = [(max(r - bev, 0.001), 0), (r, bev), (r2, h - bev), (max(r2 - bev, 0.001), h)]
        else:
            prof = [(r, 0), (r2, h)]
        self.lathe(m, x, y, z, prof, n=n, axis=axis, **kw)

    def ball(self, m, x, y, z, r, n=10, rings=5, sz=1.0, **kw):
        prof = [(r * math.sin(math.pi * i / rings), -r * sz * math.cos(math.pi * i / rings)) for i in range(rings + 1)]
        prof[0], prof[-1] = (0, -r * sz), (0, r * sz)
        self.lathe(m, x, y, z, prof, n=n, **kw)

    def tube(self, m, pts, r, n=6, caps=True, closed=False):
        """Round bar through the 3D points `pts` (mitred corners)."""
        P = [Vector(p) for p in pts]
        cntp = len(P)
        vs, fs = [], []
        up = None
        for i, p in enumerate(P):
            if closed:
                d0, d1 = (p - P[i - 1]).normalized(), (P[(i + 1) % cntp] - p).normalized()
            else:
                d0 = (p - P[i - 1]).normalized() if i > 0 else (P[1] - p).normalized()
                d1 = (P[i + 1] - p).normalized() if i < cntp - 1 else d0
            t = (d0 + d1)
            t = t.normalized() if t.length > 1e-6 else d1
            k = 1.0 / max(0.5, math.sqrt(max(0.0, (1 + d0.dot(d1)) / 2)))
            if up is None:
                up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            u = up.cross(t).normalized()
            w = t.cross(u).normalized()
            up = w
            for j in range(n):
                a = 2 * math.pi * j / n
                vs.append(p + (u * math.cos(a) + w * math.sin(a)) * r * k)
        segs = cntp if closed else cntp - 1
        for i in range(segs):
            a, b = i * n, ((i + 1) % cntp) * n
            for j in range(n):
                j2 = (j + 1) % n
                fs.append((a + j, a + j2, b + j2, b + j))
        if caps and not closed:
            fs.append(tuple(reversed(range(n))))
            fs.append(tuple(range((cntp - 1) * n, cntp * n)))
        self.add(vs, fs, m)

    def rod(self, m, p0, p1, r, n=6):
        self.tube(m, [p0, p1], r, n)

    def prism(self, m, pts, a0, a1, plane='xz', bev=0.0, edges='all', x=0, y=0, z=0, rx=0, ry=0, rz=0):
        """Extrudes the 2D polygon `pts` (in `plane`) from a0 to a1 along the remaining axis."""
        to3 = {'xz': lambda p, q, a: (p, a, q), 'xy': lambda p, q, a: (p, q, a), 'yz': lambda p, q, a: (a, p, q)}[plane]
        bm = bmesh.new()
        f = bm.faces.new([bm.verts.new(to3(p, q, a0)) for p, q in pts])
        r = bmesh.ops.extrude_face_region(bm, geom=[f])
        d = Vector(to3(0, 0, a1 - a0))
        new = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, vec=d, verts=new)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        if bev > 0:
            dn = d.normalized()
            if edges == 'all':
                es = bm.edges[:]
            else:
                par = [e for e in bm.edges if abs((e.verts[1].co - e.verts[0].co).normalized().dot(dn)) > 0.99]
                es = par if edges == 'sides' else [e for e in bm.edges if e not in par]
            bmesh.ops.bevel(bm, geom=es, offset=bev, segments=1, affect='EDGES', profile=0.5)
        self._dump(bm, m, _mtx(x, y, z, rx, ry, rz))

    def quad(self, m, pts, uv=None):
        self.add(pts, [(0, 1, 2, 3)], m, uvs=[uv] if uv else None)

    def decal(self, region, x, y, z, w, h, face='f', rx=0, ry=0, rz=0, sub=None, turn=0):
        """Atlas-textured quad centred on (x, y, z) facing `face` (f = -Y, k = +Y, l = -X, r = +X, t = +Z)."""
        a, b = w / 2, h / 2
        pts = {'f': ((-a, 0, -b), (a, 0, -b), (a, 0, b), (-a, 0, b)), 'k': ((a, 0, -b), (-a, 0, -b), (-a, 0, b), (a, 0, b)),
               'r': ((0, -a, -b), (0, a, -b), (0, a, b), (0, -a, b)), 'l': ((0, a, -b), (0, -a, -b), (0, -a, b), (0, a, b)),
               't': ((-a, -b, 0), (a, -b, 0), (a, b, 0), (-a, b, 0))}[face]
        u0, v0, u1, v1 = atlas.uv(region, sub)
        uv = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
        uv = uv[turn:] + uv[:turn]
        self.add(pts, [(0, 1, 2, 3)], 'atlas', _mtx(x, y, z, rx, ry, rz), uvs=[uv])

    # ---- group operations on everything added since `k = mesh.mark()`
    def xform(self, k, mtx):
        for i in range(k[0], len(self.v)):
            self.v[i] = mtx @ self.v[i]

    def move(self, k, dx=0, dy=0, dz=0):
        self.xform(k, Matrix.Translation((dx, dy, dz)))

    def rot(self, k, axis, deg, pivot=(0, 0, 0)):
        p = Matrix.Translation(pivot)
        self.xform(k, p @ Matrix.Rotation(math.radians(deg), 4, axis.upper()) @ p.inverted())

    def scale(self, k, sx=1, sy=1, sz=1, pivot=(0, 0, 0)):
        p = Matrix.Translation(pivot)
        self.xform(k, p @ Matrix.Diagonal((sx, sy, sz, 1)) @ p.inverted())

    def copy(self, k, mtx=None, flip=False, end=None):
        """Duplicates the group (optionally transformed; `flip` reverses winding for mirrors)."""
        v0, f0 = k
        v1, f1 = end or (len(self.v), len(self.f))
        off = len(self.v) - v0
        self.v.extend((mtx @ p) if mtx is not None else p.copy() for p in self.v[v0:v1])
        for idx, s, uv in self.f[f0:f1]:
            idx = tuple(i + off for i in idx)
            if flip:
                idx, uv = tuple(reversed(idx)), (list(reversed(uv)) if uv else None)
            self.f.append((idx, s, uv))

    def mirror(self, k, axis='x', about=0.0):
        s = [1, 1, 1, 1]
        s[('x', 'y', 'z').index(axis)] = -1
        t = [0, 0, 0]
        t[('x', 'y', 'z').index(axis)] = 2 * about
        self.copy(k, Matrix.Translation(t) @ Matrix.Diagonal(s), flip=True)

    def array(self, k, n, dx=0, dy=0, dz=0):
        end = self.mark()
        for i in range(1, n):
            self.copy(k, Matrix.Translation((dx * i, dy * i, dz * i)), end=end)

    def radial(self, k, n, axis='z', pivot=(0, 0, 0), arc=360.0):
        end = self.mark()
        p = Matrix.Translation(pivot)
        for i in range(1, n):
            self.copy(k, p @ Matrix.Rotation(math.radians(arc * i / n), 4, axis.upper()) @ p.inverted(), end=end)

    # ---- output
    def build(self, parent=None):
        me = bpy.data.meshes.new(self.name)
        piv = self.pivot
        me.from_pydata([tuple(p - piv) for p in self.v], [], [f[0] for f in self.f])
        me.polygons.foreach_set('material_index', [f[1] for f in self.f])
        if any(f[2] for f in self.f):
            uv = me.uv_layers.new(name='UVMap')
            flat = []
            for idx, _, u in self.f:
                for j in range(len(idx)):
                    flat.extend(u[j] if u else (0.0, 0.0))
            uv.data.foreach_set('uv', flat)
        for mt in self.mats:
            me.materials.append(mt)
        me.update()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = piv
        if parent is not None:
            ob.parent = parent
        lib.finish(ob, 50.0)
        wn = ob.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
        wn.keep_sharp, wn.weight, wn.mode = True, 50, 'FACE_AREA'
        for p in self.parts:
            p.build(ob)
        return ob


def _edge_sel(e, spec, hw, hd, h):
    a, b = e.verts[0].co, e.verts[1].co
    d = b - a
    ax = 'xyz'[max(range(3), key=lambda i: abs(d[i]))]
    if ax in spec:
        return True
    eps = 1e-5
    tests = {'T': a.z > h - eps and b.z > h - eps, 'B': a.z < eps and b.z < eps, 'F': a.y < -hd + eps and b.y < -hd + eps,
             'K': a.y > hd - eps and b.y > hd - eps, 'L': a.x < -hw + eps and b.x < -hw + eps, 'R': a.x > hw - eps and b.x > hw - eps}
    return any(tests[c] for c in spec if c in tests)


# ---------------------------------------------------------------------------------------------------------------
# registry
REGISTRY = []  # (name, group, extras, fn)


def asset(name, group, mount='floor', **extras):
    """Registers a generator `fn(b: Mesh)`; it may return a dict of further manifest extras (seat, surface...)."""
    def deco(fn):
        REGISTRY.append((name, group, dict(mount=mount, **extras), fn))
        return fn
    return deco


def build_all(only=None, groups=None):
    objs, extras, grp = [], {}, {}
    for name, group, ex, fn in REGISTRY:
        if (only and name not in only) or (groups and group not in groups):
            continue
        b = Mesh(name)
        more = fn(b) or {}
        ob = b.build()
        objs.append(ob)
        extras[name] = {**ex, **more}
        grp[name] = group
    return objs, extras, grp


def R(seed):
    return random.Random(seed)


# ---------------------------------------------------------------------------------------------------------------
# shared parts (all fronts face -Y; `y` is the plane the part is mounted on unless noted)
def leg(b, m, x, y, z, h, t=0.05, taper=0.6, kind='sq'):
    if kind == 'sq':
        b.box(m, x, y, z, t * taper, t * taper, h, bev=0.004, edges='z', taper=(1 / taper, 1 / taper))
    elif kind == 'rd':
        b.cyl(m, x, y, z, t / 2 * taper, h, n=8, r2=t / 2)
    else:  # turned
        r = t / 2
        b.lathe(m, x, y, z, [(r * 0.45, 0), (r * 0.6, h * 0.08), (r * 0.5, h * 0.3), (r, h * 0.62), (r * 0.7, h * 0.72), (r * 0.7, h * 0.78), (r, h * 0.82), (r, h)], n=8)


def legs(b, m, x, y, w, d, h, t=0.05, taper=0.6, kind='sq', z=0.0):
    for sx in (-1, 1):
        for sy in (-1, 1):
            leg(b, m, x + sx * (w - t) / 2, y + sy * (d - t) / 2, z, h, t, taper, kind)


def knob(b, m, x, y, z, r=0.014):
    b.lathe(m, x, y, z, [(0, -r * 2.2), (r, -r * 1.9), (r, -r * 1.3), (r * 0.45, -r * 0.8), (r * 0.45, 0)], n=8, axis='y', caps=(False, False))


def pull(b, m, x, y, z, L=0.1, vert=False, r=0.006, out=0.028):
    a = L / 2
    pts = [(0, 0, -a), (0, -out, -a), (0, -out, a), (0, 0, a)] if vert else [(-a, 0, 0), (-a, -out, 0), (a, -out, 0), (a, 0, 0)]
    b.tube(m, [(x + p[0], y + p[1], z + p[2]) for p in pts], r, n=5, caps=False)


def handle(b, m, x, y, z, kind='pull', L=0.1, vert=False):
    if kind == 'knob':
        knob(b, m, x, y, z)
    elif kind == 'slot':
        b.box(m, x, y - 0.004, z - 0.012, L, 0.008, 0.024, skip='k')
    elif kind:
        pull(b, m, x, y, z, L, vert)


def drawer(b, m, x, y, z, w, h, hm='brass', kind='pull', t=0.018, two=False):
    b.box(m, x, y - t / 2, z, w, t, h, bev=0.006, skip='k')
    for hx in ((x - w * 0.27, x + w * 0.27) if two else (x,)):
        handle(b, hm, hx, y - t, z + h / 2, kind, L=min(0.12, w * 0.4))


def door(b, m, x, y, z, w, h, hinge='l', style='panel', hm='brass', kind='knob', t=0.018, hz=0.5, glass='glass'):
    f = min(0.06, w * 0.18)
    if style == 'glass':
        for bx, bw, bz, bh in ((x, w, z, f), (x, w, z + h - f, f), (x - w / 2 + f / 2, f, z + f, h - 2 * f), (x + w / 2 - f / 2, f, z + f, h - 2 * f)):
            b.box(m, bx, y - t / 2, bz, bw, t, bh, bev=0.004, edges='F', skip='k')
        b.box(glass, x, y - t * 0.4, z + f, w - 2 * f, 0.004, h - 2 * f, skip='klrtb')
    else:
        b.box(m, x, y - t / 2, z, w, t, h, bev=0.006, skip='k')
        if style == 'panel':
            b.box(m, x, y - t - 0.004, z + f, w - 2 * f, 0.008, h - 2 * f, bev=0.006, edges='F', skip='k')
    hx = x + (w / 2 - 0.035) * (1 if hinge == 'l' else -1)
    handle(b, hm, hx, y - t, z + h * hz, kind, L=min(0.12, h * 0.3), vert=True)


def fronts(b, m, x, y, z, w, h, rows, gap=0.006, hm='brass', pull_kind='pull', knob_kind='knob', style='panel', hz=0.5, t=0.018):
    """Grid of drawer and door fronts on the plane `y`. rows (top to bottom) = [(weight, cells)], cells is a string:
    d drawer, D wide drawer with two handles, l / r door hinged left / right, g / G glass door (hinged l / r), o open."""
    tot = sum(r[0] for r in rows)
    zz = z + h
    for wt, cells in rows:
        rh = h * wt / tot
        zz -= rh
        cw = w / len(cells)
        for i, c in enumerate(cells):
            cx = x - w / 2 + cw * (i + 0.5)
            a = (b, m, cx, y, zz + gap / 2, cw - gap, rh - gap)
            if c in 'dD':
                drawer(*a, hm=hm, kind=pull_kind, t=t, two=(c == 'D'))
            elif c in 'lr':
                door(*a, hinge=c, style=style, hm=hm, kind=knob_kind, t=t, hz=hz)
            elif c in 'gG':
                door(*a, hinge='l' if c == 'g' else 'r', style='glass', hm=hm, kind=knob_kind, t=t, hz=hz)


def carcass(b, m, x, y, z, w, d, h, bev=0.008, toe=0.0, toe_m='char', top=None, skip=''):
    """Cabinet body; `toe` = recessed plinth height; `top` = (material, overhang, thickness)."""
    if toe:
        b.box(toe_m, x, y + 0.03, z, w - 0.02, d - 0.06, toe, skip='tb')
    b.box(m, x, y, z + toe, w, d, h - toe, bev=bev, edges='zT' if not top else 'z', skip=skip)
    if top:
        tm, ov, tt = top
        b.box(tm, x, y - ov / 2, z + h, w + 2 * ov, d + ov, tt, bev=min(0.012, tt * 0.4))


def shelf_unit(b, m, x, y, z, w, d, h, n, t=0.022, back='wood_d', top=True, bev=0.005):
    """Open shelving: two sides, n shelves (the lowest is the floor of the unit), optional back and top.
    Returns the list of shelf surface heights and the clear height between shelves."""
    for sx in (-1, 1):
        b.box(m, x + sx * (w - t) / 2, y, z, t, d, h, bev=bev, edges='zT')
    if back:
        b.box(back, x, y + d / 2 - 0.008, z, w - 2 * t, 0.012, h, skip='lrtb')
    if top:
        b.box(m, x, y, z + h - t, w - 2 * t, d, t, skip='lr')
    step = (h - t - 0.06) / n
    zs = []
    for i in range(n):
        sz = z + 0.06 + i * step
        b.box(m, x, y - 0.003, sz - t, w - 2 * t, d - 0.012, t, skip='lrk')
        zs.append(sz)
    b.box(m, x, y - 0.006, z, w - 2 * t, d - 0.03, 0.06 - t, skip='lrtbk')
    return zs, step - t


BOOK_COLS = ('#7c221f', '#27406e', '#254d33', '#6b4a34', '#c29a36', '#3f8f8c', '#6e4a94', '#b8332b', '#d9d5c8', '#1f2c4a', '#dd7a2c', '#4a4d52')


def books(b, x0, x1, y, z, d, hmax, rng, fill=0.9):
    """Row of books standing between x0 and x1 with their spines on the plane `y`."""
    x = x0 + 0.005
    while x < x1 - 0.03:
        if rng.random() > fill:
            x += rng.uniform(0.04, 0.12)
            continue
        if rng.random() < 0.12 and x1 - x > 0.3:   # a flat stack
            n, w = rng.randint(2, 4), rng.uniform(0.19, 0.24)
            for i in range(n):
                th = rng.uniform(0.025, 0.045)
                b.box(rng.choice(BOOK_COLS), x + w / 2, y + d * 0.45, z + sum_(b, i, th), w * rng.uniform(0.85, 1), d * 0.8, th, rz=rng.uniform(-6, 6), skip='b')
            b._stack = 0
            x += w + 0.012
            continue
        t, hh, dd = rng.uniform(0.022, 0.05), hmax * rng.uniform(0.68, 0.97), d * rng.uniform(0.72, 0.92)
        if x + t > x1:
            break
        lean = rng.random() < 0.08 and x + t + 0.06 < x1
        b.box(rng.choice(BOOK_COLS), x + t / 2 + (0.03 if lean else 0), y + dd / 2, z, t, dd, hh, ry=-14 if lean else 0, skip='bk')
        x += t + (0.065 if lean else 0.002)


def sum_(b, i, th):
    """Running height of a flat stack of books."""
    if i == 0:
        b._stack = 0
    v = b._stack
    b._stack += th
    return v


def bottle(b, x, y, z, h, r, m, cap='black', label=None, n=8, neck=0.34):
    b.lathe(m, x, y, z, [(r * 0.9, 0), (r, h * 0.04), (r, h * 0.56), (r * neck, h * 0.76), (r * neck, h * 0.93)], n=n, caps=(False, False))
    b.cyl(cap, x, y, z + h * 0.92, r * neck * 1.15, h * 0.08, n=n)
    if label:
        b.lathe(label, x, y, z + h * 0.18, [(r + 0.002, 0), (r + 0.002, h * 0.26)], n=n, caps=(False, False))


def can(b, x, y, z, r, h, m, band=None, lid='steel', n=8):
    b.cyl(m, x, y, z, r, h, n=n, caps=(False, False))
    b.cyl(lid, x, y, z + h, r * 0.96, 0.004, n=n, caps=(False, True))
    if band:
        b.lathe(band, x, y, z + h * 0.3, [(r + 0.002, 0), (r + 0.002, h * 0.4)], n=n, caps=(False, False))


GOODS = ('#b8332b', '#e3b83a', '#3f7d4b', '#3b62a8', '#dd7a2c', '#6e4a94', '#ecebe6', '#d98fa0', '#3f8f8c', '#7c221f', '#a9d3c3', '#27406e', '#c9b892', '#7fb069')
GLASSY = ('clear_g', 'clear_a', 'clear', 'glass', 'gloss:#3a2416', 'gloss:#1f3a2a', 'gloss:#6e1f1f')


def goods(b, kind, x0, x1, y, z, d, hmax, rng, label=True, n=8):
    """Fills a shelf span with products. kind: box, can, bottle, jar, liquor, tool, bag, mix. `y` = shelf front edge."""
    x = x0 + 0.01
    while x < x1 - 0.04:
        k = kind if kind != 'mix' else rng.choice(('box', 'can', 'bottle', 'jar', 'bag'))
        col = rng.choice(GOODS)
        if k == 'box':
            w, h, cnt = rng.uniform(0.07, 0.16), hmax * rng.uniform(0.55, 0.95), rng.randint(1, 3)
            dd = min(d - 0.03, rng.uniform(0.05, 0.09) * 3)
            for i in range(cnt):
                if x + w > x1:
                    break
                b.box(col, x + w / 2, y + 0.015 + dd / 2, z, w - 0.004, dd, h, skip='bk')
                if label and rng.random() < 0.5 and w > 0.085:
                    b.decal(f'prod{rng.randint(1, 8)}', x + w / 2, y + 0.012, z + h / 2, w - 0.012, min(h - 0.012, (w - 0.012) * 1.33))
                else:
                    b.box(rng.choice(GOODS), x + w / 2, y + 0.012, z + h * 0.3, w - 0.004, 0.004, h * 0.3, skip='bkt')
                x += w
            x += 0.012
        elif k in ('can', 'jar', 'tool'):
            r = rng.uniform(0.03, 0.045) if k != 'tool' else rng.uniform(0.045, 0.075)
            h, cnt = min(hmax * 0.9, r * rng.uniform(2.2, 3.4) if k != 'tool' else r * 2.3), rng.randint(2, 4)
            band = rng.choice(GOODS)
            for i in range(cnt):
                if x + 2 * r > x1:
                    break
                for row in range(2 if d > 0.3 else 1):
                    if k == 'jar':
                        b.cyl('clear_a' if rng.random() < 0.5 else 'clear_g', x + r, y + 0.02 + r + row * (2 * r + 0.01), z, r, h * 0.85, n=n, caps=(False, False))
                        b.cyl(col, x + r, y + 0.02 + r + row * (2 * r + 0.01), z + h * 0.85, r * 0.9, h * 0.15, n=n, caps=(False, True))
                    else:
                        can(b, x + r, y + 0.02 + r + row * (2 * r + 0.01), z, r, h, col, band if row == 0 else None, lid='steel' if k == 'can' else col, n=n)
                x += 2 * r + 0.006
            x += 0.012
        elif k in ('bottle', 'liquor'):
            r = rng.uniform(0.03, 0.042)
            h, cnt = hmax * rng.uniform(0.7, 0.96), rng.randint(2, 4)
            m = rng.choice(GLASSY) if k == 'liquor' else rng.choice(('clear_g', 'clear_a', 'clear', col))
            lab = rng.choice(GOODS)
            nk = rng.choice((0.28, 0.34, 0.45))
            for i in range(cnt):
                if x + 2 * r > x1:
                    break
                for row in range(2 if d > 0.3 else 1):
                    bottle(b, x + r, y + 0.02 + r + row * (2 * r + 0.012), z, h, r, m, cap=rng.choice(('black', 'red', 'brass', 'white')) if row == 0 else 'black', n=n, label=lab if row == 0 else None, neck=nk)
                x += 2 * r + 0.008
            x += 0.014
        else:  # bag
            w, h = rng.uniform(0.12, 0.2), hmax * rng.uniform(0.5, 0.8)
            if x + w > x1:
                break
            b.box(col, x + w / 2, y + 0.02 + 0.07, z, w - 0.01, 0.14, h, bev=0.02, taper=(0.9, 0.45), skip='b')
            b.box(rng.choice(GOODS), x + w / 2, y + 0.016, z + h * 0.25, w * 0.6, 0.006, h * 0.3, skip='bk')
            x += w + 0.01


def dish(b, kind, x, y, z, r=0.11, h=0.09, m='white', n=10):
    if kind == 'plate':
        b.lathe(m, x, y, z, [(r * 0.55, 0), (r, 0.014), (r * 0.97, 0.018), (r * 0.6, 0.007), (0, 0.007)], n=n)
    elif kind == 'bowl':
        b.lathe(m, x, y, z, [(r * 0.45, 0), (r, h), (r * 0.93, h), (r * 0.4, 0.012), (0, 0.012)], n=n)
    elif kind == 'cup':
        b.lathe(m, x, y, z, [(r * 0.75, 0), (r, h), (r * 0.86, h), (r * 0.62, 0.008), (0, 0.008)], n=8)
    elif kind == 'mug':
        b.lathe(m, x, y, z, [(r, 0), (r, h), (r * 0.84, h), (r * 0.84, 0.01), (0, 0.01)], n=8)
        b.tube(m, [(x + r * 0.9, y, z + h * 0.8), (x + r * 1.7, y, z + h * 0.7), (x + r * 1.7, y, z + h * 0.3), (x + r * 0.9, y, z + h * 0.2)], r * 0.16, n=4, caps=False)
    elif kind == 'wine':
        b.lathe(m, x, y, z, [(r * 0.8, 0), (r * 0.12, 0.006), (r * 0.12, h * 0.45), (r, h * 0.62), (r * 0.85, h), (r * 0.75, h), (r * 0.9, h * 0.64), (0, h * 0.5)], n=8)


def shade(b, m, x, y, z, r0, r1, h, n=12, t=0.006):
    b.lathe(m, x, y, z, [(r0, 0), (r1, h), (r1 - t, h), (r0 - t, 0), (r0, 0)], n=n, caps=(False, False))


def leaf(b, m, x, y, z, w, h, tilt, yaw, bend=0.0):
    """Blade leaf: a thin tapered slab leaning `tilt` degrees away from vertical towards the direction `yaw`."""
    b.box(m, x, y, z, w, 0.006, h, taper=(0.12, 1), shear=(0, bend), rx=-tilt, rz=yaw)


def pot(b, m, x, y, z, r, h, n=10, square=False, soil='soil'):
    if square:
        b.box(m, x, y, z, r * 1.7, r * 1.7, h, bev=0.008, taper=(1.25, 1.25))
        b.box(soil, x, y, z + h - 0.004, r * 1.9, r * 1.9, 0.006, skip='b')
    else:
        b.lathe(m, x, y, z, [(r * 0.7, 0), (r * 0.95, h * 0.85), (r * 1.08, h * 0.85), (r * 1.08, h), (r * 0.9, h), (r * 0.9, h - 0.012), (0, h - 0.012)], n=n)
        b.cyl(soil, x, y, z + h - 0.012, r * 0.9, 0.004, n=n, caps=(False, True))


def plant(b, kind, x, y, z, s=1.0, pm='white', rng=None):
    rng = rng or R(3)
    if kind == 'snake':
        pot(b, pm, x, y, z, 0.11 * s, 0.22 * s, square=True)
        for i in range(12):
            a = i * 360 / 12 * 2.4 + rng.uniform(-15, 15)
            rr = (0.02 + 0.045 * (i % 3) / 2) * s
            leaf(b, ('leaf', 'leaf_d', 'leaf_l')[i % 3], x + rr * math.cos(math.radians(a)), y + rr * math.sin(math.radians(a)), z + 0.2 * s, 0.085 * s, rng.uniform(0.34, 0.6) * s,
                 4 + 7 * (i % 3), a + 90)
    elif kind == 'palm':
        pot(b, pm, x, y, z, 0.16 * s, 0.3 * s)
        b.cyl('brown', x, y, z + 0.28 * s, 0.025 * s, 0.5 * s, n=6)
        for i in range(9):
            a = i * 40 + rng.uniform(-10, 10)
            leaf(b, ('leaf', 'leaf_d')[i % 2], x, y, z + 0.74 * s, 0.11 * s, rng.uniform(0.45, 0.65) * s, rng.uniform(35, 70), a, bend=-0.12 * s)
        for i in range(3):
            leaf(b, 'leaf_l', x, y, z + 0.76 * s, 0.09 * s, 0.4 * s, 12, i * 120 + 20)
    elif kind == 'bush':
        pot(b, pm, x, y, z, 0.17 * s, 0.32 * s)
        b.cyl('brown', x, y, z + 0.3 * s, 0.022 * s, 0.45 * s, n=6)
        for i, (dx, dy, dz, r) in enumerate(((0, 0, 0.95, 0.24), (0.14, 0.05, 0.78, 0.17), (-0.13, 0.08, 0.8, 0.18), (0.02, -0.14, 0.76, 0.16), (-0.03, 0.12, 1.08, 0.15))):
            b.ball(('leaf', 'leaf_d', 'leaf_l')[i % 3], x + dx * s, y + dy * s, z + dz * s, r * s, n=7, rings=4, sz=0.85, rz=i * 23)
    else:  # orchid
        pot(b, pm, x, y, z, 0.07 * s, 0.11 * s, n=8)
        for i in range(4):
            leaf(b, ('leaf', 'leaf_d')[i % 2], x, y, z + 0.1 * s, 0.06 * s, 0.2 * s, 55, i * 90 + 30, bend=-0.03 * s)
        for sx in (-1, 1):
            top = (x + sx * 0.07 * s, y + 0.02 * s, z + 0.5 * s)
            b.tube('leaf_d', [(x, y, z + 0.1 * s), (x + sx * 0.02 * s, y, z + 0.32 * s), top], 0.005 * s, n=4)
            for j in range(3):
                b.ball('pink' if sx > 0 else '#c86ab0', top[0] - sx * j * 0.03 * s, top[1], top[2] - j * 0.05 * s, 0.032 * s, n=6, rings=3, sz=0.6)


def frame(b, m, x, y, z, w, h, t=0.035, depth=0.03, bev=0.008):
    """Picture frame around an opening w x h centred on (x, z); back on the plane `y`."""
    for bx, bz, bw, bh in ((x, z + h / 2, w + 2 * t, t), (x, z - h / 2 - t, w + 2 * t, t), (x - w / 2 - t / 2, z - h / 2, t, h), (x + w / 2 + t / 2, z - h / 2, t, h)):
        b.box(m, bx, y - depth / 2, bz, bw, depth, bh, bev=bev, edges='F', skip='k')


def crt(b, x, y, z, w, d, h, body='beige', region=None, side=True, glow=False):
    """CRT set: bevelled shell, tapering back, bulged glass with an optional atlas picture. Front on plane y - d/2."""
    fd = d * 0.5
    fy = y - d / 2
    b.box(body, x, fy + fd / 2, z, w, fd, h, bev=min(0.02, h * 0.06))
    b.box(body, x, fy + fd + (d - fd) / 2 - 0.01, z + h * 0.08, w * 0.86, d - fd + 0.02, h * 0.8, bev=0.015, taper=(1, 1), skip='f')
    sw = w * (0.72 if side else 0.86)
    sx = x - (w - sw) / 2 + w * 0.06 if side else x
    sh = h * 0.76
    b.box('char', sx, fy - 0.004, z + (h - sh) / 2 - 0.012, sw + 0.024, 0.01, sh + 0.024, bev=0.004, edges='F', skip='k')
    b.box('glow' if glow and not region else 'screen', sx, fy - 0.012, z + (h - sh) / 2, sw, 0.012, sh, bev=0.008, edges='F', skip='k')
    if region:
        b.decal(region, sx, fy - 0.0155, z + h / 2, sw - 0.02, sh - 0.02)
    if side:
        kx = x + w / 2 - w * 0.1
        for i in range(2):
            b.cyl('char', kx, fy, z + h * (0.72 - i * 0.18), w * 0.035, 0.02, n=8, axis='y', rz=180)
        for i in range(4):
            b.box('char', kx, fy - 0.003, z + h * 0.14 + i * h * 0.05, w * 0.1, 0.006, h * 0.02, skip='k')


def disc_decal(b, region, x, y, z, r, n=12, face='f', inset=0.5):
    """Round atlas decal (clock faces, records, dials): n-gon centred on (x, y, z) showing the region's inscribed circle."""
    u0, v0, u1, v1 = atlas.uv(region)
    cu, cv, ru, rv = (u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) * inset, (v1 - v0) * inset
    pts, uv = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        pts.append({'f': (x + c * r, y, z + s * r), 't': (x + c * r, y + s * r, z), 'k': (x - c * r, y, z + s * r)}[face])
        uv.append((cu + c * ru, cv + s * rv))
    b.add(pts, [tuple(range(n))], 'atlas', uvs=[uv])


def cushion(b, x, y, z, s, c1, c2=None, rx=0, rz=0, t=0.13):
    k = b.mark()
    b.soft(c1, 0, 0, 0, s, t, s, r=min(0.05, t * 0.4))
    if c2:
        for dx in (-0.25, 0.0, 0.25):
            b.soft(c2, dx * s, 0, -0.003, s * 0.12, t + 0.006, s + 0.006, r=min(0.05, t * 0.4))
    b.rot(k, 'x', rx); b.rot(k, 'z', rz); b.move(k, x, y, z)


def chair_frame(b, m, w=0.44, d=0.44, sh=0.45, bh=0.95, t=0.04, slats=3, seat=None, kind='slat'):
    """Wooden dining chair: tapered legs, aprons, seat (optional cushion colour) and a raked back."""
    for sx in (-1, 1):
        b.box(m, sx * (w - t) / 2, -(d - t) / 2, 0, t * 0.7, t * 0.7, sh - 0.03, bev=0.005, edges='z', taper=(1.4, 1.4))
        b.box(m, sx * (w - t) / 2, (d - t) / 2 + 0.03, 0, t, t, bh, bev=0.006, edges='zT', shear=(0, 0.0), rx=-4)
        b.box(m, sx * (w - t) / 2, 0, sh - 0.1, t * 0.5, d - t * 1.6, 0.06)
        b.box(m, sx * (w - t) / 2, 0, 0.16, t * 0.45, d - t * 1.4, 0.025)
    b.box(m, 0, -(d - t) / 2, sh - 0.1, w - t * 1.6, t * 0.5, 0.06)
    b.box(m, 0, (d - t) / 2, sh - 0.1, w - t * 1.6, t * 0.5, 0.06)
    b.box(m, 0, -0.01, sh - 0.04, w + 0.02, d + 0.02, 0.04, bev=0.012)
    if seat:
        b.soft(seat, 0, -0.01, sh - 0.005, w - 0.04, d - 0.04, 0.045, r=0.018)
    k = b.mark()
    if kind == 'slat':
        b.box(m, 0, 0, bh - 0.11, w - t, t * 0.55, 0.09, bev=0.01)
        b.box(m, 0, 0, sh + 0.1, w - t, t * 0.45, 0.04)
        for i in range(slats):
            x = (i - (slats - 1) / 2) * (w - t) / (slats + 0.4)
            b.box(m, x, 0, sh + 0.14, 0.035, 0.014, bh - 0.25 - sh)
    else:  # ladder
        for i in range(slats):
            b.box(m, 0, 0, sh + 0.14 + i * (bh - sh - 0.22) / max(1, slats - 1), w - t, t * 0.45, 0.06, bev=0.008)
    b.rot(k, 'x', -4)
    b.move(k, 0, (d - t) / 2 + 0.03, 0)
    return {'seat': [[0, -0.02, sh + 0.02]]}


def flip(b, k):
    """Reverses the winding of everything added since `k = b.mark()` (for the inside of basins and shades)."""
    for j in range(k[1], len(b.f)):
        idx, s, uv = b.f[j]
        b.f[j] = (tuple(reversed(idx)), s, list(reversed(uv)) if uv else None)


def basin(b, m, x, y, z, w, d, h, bev=0.03, taper=1.15, rim=None, rim_w=0.04, rim_m=None):
    """Open-topped cavity (inside faces) whose rim is at z + h; `rim` adds a flat rim of width rim_w around it."""
    k = b.mark()
    b.box(m, x, y, z, w / taper, d / taper, h, bev=bev, edges='zB', skip='t', taper=(taper, taper))
    flip(b, k)
    if rim:
        rm = rim_m or m
        for bx, by, bw, bd in ((x, y - d / 2 - rim_w / 2, w + 2 * rim_w, rim_w), (x, y + d / 2 + rim_w / 2, w + 2 * rim_w, rim_w),
                               (x - w / 2 - rim_w / 2, y, rim_w, d), (x + w / 2 + rim_w / 2, y, rim_w, d)):
            b.box(rm, bx, by, z + h - rim, bw, bd, rim, skip='b')


def tap(b, x, y, z, h=0.16, reach=0.12, m='chrome', handles=True, spread=0.07):
    """Basin mixer: spout facing -Y plus hot and cold handles."""
    b.cyl(m, x, y, z, 0.02, 0.02, n=8)
    b.tube(m, [(x, y, z + 0.02), (x, y, z + h), (x, y - reach * 0.6, z + h + 0.02), (x, y - reach, z + h - 0.03)], 0.011, n=6)
    if handles:
        for sx in (-1, 1):
            b.cyl(m, x + sx * spread, y, z, 0.013, 0.035, n=6)
            b.box('enamel_r' if sx < 0 else 'enamel_b', x + sx * spread, y, z + 0.035, 0.05, 0.014, 0.01, bev=0.003)


def towel(b, m, x, y, z, w, drop, stripe=None, t=0.03):
    """Towel folded over a rail at height z (rail runs along X)."""
    b.box(m, x, y, z - drop, w, t, drop + 0.012, bev=0.008)
    b.box(m, x, y + t * 0.9, z - drop * 0.7, w, t, drop * 0.7 + 0.012, bev=0.008)
    if stripe:
        b.box(stripe, x, y - 0.002, z - drop + 0.05, w + 0.004, t + 0.004, 0.04)

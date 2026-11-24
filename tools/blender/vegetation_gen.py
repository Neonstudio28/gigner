"""Shared mesh generators for the vegetation family: one shape language for every plant, rock and log.

Everything is built into a `B` (builder): one bmesh plus the material slot list of one asset. Faces carry a
`vflat` flag; flagged faces export flat-shaded (faceted foliage, rock), the rest follow lib.finish()
(smooth with sharp edges above 35 degrees: trunks, logs, posts).
"""
import bpy, bmesh, math, random
from mathutils import Matrix, Vector
import lib

UP = Vector((0, 0, 1))
TAU = math.tau

# Foliage palettes: (leaf, leaf2 sunlit, leaf3 underside, leaf4 accent). Material name is
# paint__leaf<tone>[_<palette>], so every foliage material starts with `paint__leaf`.
LEAF = {
    '': ('#3a6e2e', '#548a34', '#234822', '#73a23e'),
    'maple': ('#52882e', '#78a838', '#315a28', '#9cbe46'),
    'birch': ('#6a9c38', '#93bf48', '#426f2e', '#b7d35a'),
    'willow': ('#6f9a45', '#94b85a', '#48703a', '#b3cc70'),
    'fir': ('#2f5e33', '#3f7a3c', '#1c3e28', '#5a9446'),
    'pine': ('#3d6b34', '#55883a', '#254a2a', '#7aa548'),
    'spruce': ('#3f6f62', '#5a8f80', '#264a44', '#7fb0a0'),
    'cedar': ('#3a6a30', '#4f8436', '#234526', '#6f9c40'),
    'hedge': ('#3c7030', '#4f8a36', '#285024', '#68a040'),
}
BARK = {
    '': ('#6b5540', '#4f3e30'),
    'birch': ('#e6e2d6', '#2e2a26'),
    'fir': ('#6a4a38', '#4a3428'),
    'pine': ('#8a5a40', '#5e4030'),
    'cedar': ('#7a4c36', '#56342a'),
    'dead': ('#8b8378', '#6a6258'),
}
FIXED = {
    'grass': ('paint__grass', '#5d9a36'), 'grass2': ('paint__grass2', '#86b944'),
    'corn': ('paint__crop', '#5f9634'), 'corn2': ('paint__crop2', '#8fb345'),
    'wheat': ('paint__crop_wheat', '#d9b24a'), 'wheat2': ('paint__crop2_wheat', '#b98f36'),
    'rock': ('paint__rock', '#8d8f8c'), 'rock2': ('paint__rock2', '#6f716f'), 'rock3': ('paint__rock3', '#a7a8a2'),
    'petal': ('paint__petal', '#e85a8a'), 'petal2': ('paint__petal2', '#f2d24a'),
    'fruit': ('paint__fruit', '#c8322a'),
    'moss': ('paint__moss', '#6a8a3a'), 'moss2': ('paint__moss2', '#4f6f30'),
    'snow': ('paint__snow', '#eef2f6'), 'snow2': ('paint__snow2', '#cfd9e6'),
    'mtn': ('paint__mountain', '#7d8590'), 'mtn2': ('paint__mountain2', '#5f6873'), 'mtn3': ('paint__mountain3', '#6f8a5e'),
    'forest': ('paint__forest', '#35603a'), 'forest2': ('paint__forest2', '#274a30'), 'forest3': ('paint__forest3', '#48783f'),
    'trellis': ('paint__wood', '#d8d2c0'),
    'cut': ('paint__cutwood', '#d2b07a'), 'cut2': ('paint__cutwood2', '#b08a58'), 'soil': ('paint__soil', '#4e3a2c'),
    'cob': ('paint__crop_cob', '#e8c84a'), 'tassel': ('paint__crop_tassel', '#cdb878'),
    'cattail': ('paint__cattail', '#5a3a26'), 'pad': ('paint__leaf_pad', '#4f8a3c'), 'pad2': ('paint__leaf2_pad', '#6aa548'),
    'cap': ('paint__mushroom', '#b5503a'), 'cap2': ('paint__mushroom2', '#ead9b8'), 'white': ('paint__petal3', '#f2efe6'),
}
TONES = {'leaf': 0, 'leaf2': 1, 'leaf3': 2, 'leaf4': 3}


def material(key, pal='', bark=''):
    if key in TONES:
        t = TONES[key]
        return lib.mat('paint__leaf' + ('' if t == 0 else str(t + 1)) + ('_' + pal if pal else ''), LEAF[pal][t])
    if key in ('bark', 'bark2'):
        return lib.mat('paint__' + key + ('_' + bark if bark else ''), BARK[bark][0 if key == 'bark' else 1])
    if key in FIXED:
        return lib.mat(*FIXED[key])
    if key.startswith('#'):
        return lib.colour('paint', key)
    k, c = key.split(':')
    return lib.colour(k, c)


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bez(p0, p1, p2, t):
    return p0 * ((1 - t) ** 2) + p1 * (2 * t * (1 - t)) + p2 * (t * t)


def rand_dir(rng, zmin=-1.0, zmax=1.0):
    z = rng.uniform(zmin, zmax)
    a = rng.uniform(0, TAU)
    s = math.sqrt(max(0.0, 1 - z * z))
    return Vector((s * math.cos(a), s * math.sin(a), z))


def leaf_tone(rng, lift=0.0):
    """Face normal -> leaf tone: sunlit tops light, undersides dark, with some scatter."""
    def f(n, c=None):
        z = n.z + rng.uniform(-0.28, 0.28) + lift
        if z > 0.6:
            return 'leaf4' if rng.random() < 0.3 else 'leaf2'
        if z > 0.1:
            return 'leaf2' if rng.random() < 0.3 else 'leaf'
        if z > -0.4:
            return 'leaf' if rng.random() < 0.4 else 'leaf3'
        return 'leaf3'
    return f


class B:
    def __init__(self, name, pal='', bark='', _share=None):
        self.name, self.pal, self.bark = name, pal, bark
        self.bm = bmesh.new()
        self.fl = self.bm.faces.layers.int.new('vflat')
        self.mats, self.idx = _share if _share else ([], {})

    # --- plumbing -------------------------------------------------------------------------------------
    def mi(self, key):
        if key not in self.idx:
            self.idx[key] = len(self.mats)
            self.mats.append(material(key, self.pal, self.bark))
        return self.idx[key]

    def v(self, co):
        return self.bm.verts.new(co)

    def face(self, vs, key, flat=True):
        try:
            f = self.bm.faces.new(vs)
        except ValueError:
            return None
        f.material_index = self.mi(key)
        f[self.fl] = 1 if flat else 0
        return f

    def child(self):
        """Scratch builder sharing this one's material slots: build at the origin, then absorb(child, matrix)."""
        return B(self.name, self.pal, self.bark, (self.mats, self.idx))

    def absorb(self, other, m=None):
        if m is not None:
            bmesh.ops.transform(other.bm, matrix=m, verts=other.bm.verts)
        me = bpy.data.meshes.new('vtmp')
        other.bm.to_mesh(me)
        other.bm.free()
        self.bm.from_mesh(me)
        bpy.data.meshes.remove(me)
        self.fl = self.bm.faces.layers.int['vflat']

    def paint(self, faces, key, flat=True):
        """Assigns one key (str) or key(normal, centre) to faces."""
        B.last = self
        for f in faces:
            f.normal_update()
            self.cur = f
            f.material_index = self.mi(key if isinstance(key, str) else key(f.normal, f.calc_center_median()))
            f[self.fl] = 1 if flat else 0

    def done(self, angle=35.0):
        for v in self.bm.verts:  # nothing below the ground plane
            if v.co.z < 0:
                v.co.z = 0.0
        ob = lib.to_object(self.name, self.bm, self.mats, angle)
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        fl = bm.faces.layers.int.get('vflat')
        for f in bm.faces:
            if f[fl]:
                for e in f.edges:
                    e.smooth = False
        bm.faces.layers.int.remove(fl)
        bm.to_mesh(ob.data)
        bm.free()
        return ob

    # --- skinned rings: tubes, lathes -----------------------------------------------------------------
    def skin(self, rings, key, flat=False, cap0=True, cap1=True, facekey=None):
        for i in range(len(rings) - 1):
            a, b = rings[i], rings[i + 1]
            n = max(len(a), len(b))
            if n == 1:
                continue
            for j in range(n):
                k = (facekey(i, j) if facekey else None) or key
                j2 = (j + 1) % n
                if len(a) == 1:
                    self.face((a[0], b[j], b[j2]), k, flat)
                elif len(b) == 1:
                    self.face((a[j], b[0], a[j2]), k, flat)
                else:
                    self.face((a[j], b[j], b[j2], a[j2]), k, flat)
        if cap0 and len(rings[0]) > 2:
            self.face(rings[0][::-1], cap0 if isinstance(cap0, str) else key, flat)
        if cap1 and len(rings[-1]) > 2:
            self.face(rings[-1], cap1 if isinstance(cap1, str) else key, flat)

    def tube(self, pts, radii, sides, key, flat=False, cap0=True, cap1=True, ringfn=None, facekey=None, phase=0.0,
             level0=False):
        """Tube along a polyline with per-point radius (0 = point). ringfn(i, angle) scales the radius."""
        pts = [Vector(p) for p in pts]
        n = len(pts)
        rings, ref = [], None
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            if ref is None:
                ref = t.cross(Vector((1, 0, 0)) if abs(t.x) < 0.9 else Vector((0, 1, 0))).normalized()
            else:
                ref = (ref - t * ref.dot(t)).normalized()
            w = t.cross(ref)
            if radii[i] < 1e-5:
                rings.append([self.v(p)])
                continue
            ring = []
            for j in range(sides):
                a = phase + TAU * j / sides
                r = radii[i] * (ringfn(i, a) if ringfn else 1.0)
                q = p + (ref * math.cos(a) + w * math.sin(a)) * r
                if level0 and i == 0:
                    q.z = p.z
                ring.append(self.v(q))
            rings.append(ring)
        self.skin(rings, key, flat, cap0, cap1, facekey)

    def lathe(self, prof, sides, key, m=None, flat=False, facekey=None, phase=0.0, cap0=True, cap1=True, ringfn=None):
        """Surface of revolution around Z from (radius, z) pairs, optionally transformed by m."""
        m = m or Matrix.Identity(4)
        rings = []
        for i, (r, z) in enumerate(prof):
            if r < 1e-6:
                rings.append([self.v(m @ Vector((0, 0, z)))])
            else:
                ring = []
                for j in range(sides):
                    a = phase + TAU * j / sides
                    rr = r * (ringfn(i, a) if ringfn else 1.0)
                    ring.append(self.v(m @ Vector((rr * math.cos(a), rr * math.sin(a), z))))
                rings.append(ring)
        self.skin(rings, key, flat, cap0, cap1, facekey)

    # --- foliage --------------------------------------------------------------------------------------
    def blob(self, c, rad, key, rng, sub=2, jit=0.15, rot=None, flat=True):
        """Faceted closed clump: jittered icosphere scaled to radii `rad`; key is a str or key(normal, centre)."""
        if not isinstance(rad, (tuple, list, Vector)):
            rad = (rad, rad, rad)
        m = Matrix.Translation(c) @ (rot or Matrix.Identity(4)) @ Matrix.Diagonal((rad[0], rad[1], rad[2], 1))
        vs = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=1.0)['verts']
        for v in vs:
            v.co = m @ (v.co * (1 + rng.uniform(-jit, jit)))
        self.paint(list(dict.fromkeys(f for v in vs for f in v.link_faces)), key, flat)
        cc = Vector(c)
        return [(v.co.copy(), (v.co - cc).normalized()) for v in vs]

    def chip(self, c, n, size, key, key_bot, rng, aspect=1.3, thick=0.12):
        """Leaf chip: a nearly flat closed tetrahedron that reads as a kite-shaped leaf (4 triangles)."""
        n = Vector(n).normalized()
        a = n.orthogonal().normalized()
        ang = rng.uniform(0, TAU)
        u = a * math.cos(ang) + n.cross(a) * math.sin(ang)
        w = n.cross(u)
        c = Vector(c)
        A, C = self.v(c + u * size * aspect * 0.55 + n * size * thick), self.v(c - u * size * aspect * 0.45 + n * size * thick)
        Bv, D = self.v(c + w * size * 0.5 - n * size * thick), self.v(c - w * size * 0.5 - n * size * thick)
        self.face((A, Bv, C), key)
        self.face((A, C, D), key)
        self.face((A, D, Bv), key_bot)
        self.face((C, Bv, D), key_bot)

    def plate(self, c, n, size, key, rng, aspect=1.3, thick=0.14, sides=4):
        """Leaf chip: a thin closed kite (bipyramid) lying in the plane with normal n."""
        n = Vector(n).normalized()
        a = n.orthogonal().normalized()
        b = n.cross(a)
        ang = rng.uniform(0, TAU)
        u = a * math.cos(ang) + b * math.sin(ang)
        w = n.cross(u)
        c = Vector(c)
        if sides == 4:
            ring = [c + u * size * aspect * 0.6, c + w * size * 0.5 + u * size * 0.08, c - u * size * 0.45,
                    c - w * size * 0.5 + u * size * 0.08]
        else:
            ring = [c + u * size * aspect * 0.6, c + w * size * 0.5 - u * size * 0.35, c - w * size * 0.5 - u * size * 0.35]
        ring = [self.v(p) for p in ring]
        top, bot = self.v(c + n * size * thick), self.v(c - n * size * thick * 0.7)
        for i in range(len(ring)):
            j = (i + 1) % len(ring)
            self.face((ring[i], ring[j], top), key)
            self.face((ring[j], ring[i], bot), key)

    def blade(self, pts, widths, key, key_bot=None, ridge=0.3, sag=0.0, side=None, key2=None, flat=True, cap0=True):
        """Tapering blade with a triangular section (left edge, ridge, right edge): boughs, fronds, grass,
        corn leaves. `key`/`key2` colour the two upper faces (str or f(segment)), key_bot the underside."""
        pts = [Vector(p) for p in pts]
        n = len(pts)
        rings = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            s = Vector(side) if side is not None else t.cross(UP)
            s = s - t * s.dot(t)
            s = s.normalized() if s.length > 1e-6 else t.orthogonal().normalized()
            nr = s.cross(t)
            w = widths[i]
            if w < 1e-5:
                rings.append([self.v(p)])
            else:
                rings.append([self.v(p - s * w - nr * sag * w), self.v(p + nr * ridge * w), self.v(p + s * w - nr * sag * w)])
        keys = (key, key2 or key, key_bot or key)

        def fk(i, j):
            k = keys[j]
            return k if isinstance(k, str) else k(i)
        self.skin(rings, 'leaf', flat, cap0=fk(0, 2) if cap0 else False, cap1=fk(n - 2, 2), facekey=fk)

    # --- hard forms -----------------------------------------------------------------------------------
    def box(self, c, size, key, rot=None, bevel=0.0, seg=1, flat=False):
        """Box centred on c with optional chamfer. key is a str or key(normal, centre)."""
        t = self.child()
        m = Matrix.Translation(c) @ (rot or Matrix.Identity(4)) @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        bmesh.ops.create_cube(t.bm, size=1.0, matrix=m)
        if bevel > 0:
            bmesh.ops.bevel(t.bm, geom=t.bm.edges[:], offset=bevel, offset_type='OFFSET', segments=seg, profile=0.5,
                            affect='EDGES', clamp_overlap=True)
        bmesh.ops.recalc_face_normals(t.bm, faces=t.bm.faces)
        t.paint(t.bm.faces, key, flat)
        self.absorb(t)

    def hull(self, pts, key, bevel=0.0, flat=True, planar=10.0):
        """Chamfered convex chunk through the points (rocks, split wood)."""
        t = self.child()
        vs = [t.bm.verts.new(p) for p in pts]
        r = bmesh.ops.convex_hull(t.bm, input=vs)
        junk = [g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)]
        if junk:
            bmesh.ops.delete(t.bm, geom=list(set(junk)), context='VERTS')
        if planar:
            bmesh.ops.dissolve_limit(t.bm, angle_limit=math.radians(planar), verts=t.bm.verts[:], edges=t.bm.edges[:])
        if bevel > 0:
            bmesh.ops.bevel(t.bm, geom=t.bm.edges[:], offset=bevel, offset_type='OFFSET', segments=1, profile=0.5,
                            affect='EDGES', clamp_overlap=True)
        bmesh.ops.recalc_face_normals(t.bm, faces=t.bm.faces)
        t.paint(t.bm.faces, key, flat)
        self.absorb(t)

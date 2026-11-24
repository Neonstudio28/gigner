"""Box-only geometry for the townsfolk: every part is a chamfered box, flat shaded, weighted to one bone."""
import bmesh
from mathutils import Matrix, Vector
import lib

SLOTS = {'fixed': 0, 'skin': 1, 'hair': 2, 'shirt': 3, 'pants': 4, 'jacket': 5, 'dress': 6, 'hat': 7, 'shoes': 8}


class Body:
    """Collects the boxes of one character: geometry, per-face colour, tint slot and bone."""

    def __init__(self, bones):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new('Col')
        self.uv = self.bm.loops.layers.uv.new('slot')
        self.dv = self.bm.verts.layers.deform.new()
        self.bones = {b: i for i, b in enumerate(bones)}
        self.palette = {}

    def colour(self, c):
        """A colour is '#hex' (fixed) or ('label', '#hex') for a part the engine may retint."""
        if isinstance(c, tuple):
            label, hexc = c
            self.palette.setdefault(label, hexc)
            return lib.srgb(self.palette[label]), SLOTS[label]
        return lib.srgb(c), 0

    def box(self, bone, c, size, at, top=(1, 1), bev=0.012, rot=None, shift=(0, 0), mirror=False):
        """Box of `size` (x, y, z) centred at `at`. `top` scales the upper face (taper), `shift` slides it in x/y,
        `rot` is (rx, ry, rz) degrees about the centre, `mirror` adds the copy on the other side (bone .L -> .R)."""
        if mirror:
            other = bone[:-1] + 'R' if bone.endswith('.L') else bone
            r2 = None if rot is None else (rot[0], -rot[1], -rot[2])
            self.box(other, c, size, (-at[0], at[1], at[2]), top, bev, r2, (-shift[0], shift[1]))
        t = bmesh.new()
        bmesh.ops.create_cube(t, size=1.0)
        for v in t.verts:
            up = v.co.z > 0
            v.co.x *= size[0] * (top[0] if up else 1)
            v.co.y *= size[1] * (top[1] if up else 1)
            v.co.z *= size[2]
            if up:
                v.co.x += shift[0]
                v.co.y += shift[1]
        b = min(bev, min(size) * 0.3)
        if b > 0.0045:
            bmesh.ops.bevel(t, geom=list(t.edges), offset=b, segments=1, affect='EDGES', profile=0.5)
        m = Matrix.Translation(Vector(at))
        if rot is not None:
            from math import radians
            m = m @ Matrix.Rotation(radians(rot[2]), 4, 'Z') @ Matrix.Rotation(radians(rot[1]), 4, 'Y') @ Matrix.Rotation(radians(rot[0]), 4, 'X')
        rgba, slot = self.colour(c)
        gi = self.bones[bone]
        vmap = {}
        for v in t.verts:
            nv = self.bm.verts.new(m @ v.co)
            nv[self.dv][gi] = 1.0
            vmap[v] = nv
        for f in t.faces:
            nf = self.bm.faces.new([vmap[v] for v in f.verts])
            nf.smooth = False
            for l in nf.loops:
                l[self.col] = rgba
                l[self.uv].uv = ((slot + 0.5) / 16, 0.5)
        t.free()

    def tris(self):
        return sum(len(f.verts) - 2 for f in self.bm.faces)

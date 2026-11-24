"""Paints the streetprops atlas (1024 px, original artwork) with numpy and registers the UV rect of every region.

Regions are packed on shelves; all drawing is in region pixels (origin top-left) on a 3x supersampled canvas.
Text is the font bundled with Blender, converted to triangles and rasterised like every other shape.
"""
import bpy, math
import numpy as np
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
import lib
import streetprops_kit as K

SIZE, SS, PAD = 1024, 3, 6


def rgb(c):
    if isinstance(c, str):
        c = int(c.lstrip('#'), 16)
        return (c >> 16 & 255, c >> 8 & 255, c & 255)
    return c


class Painter:
    def __init__(self, slots=None):
        """slots=None is a dry run that only records region sizes; pack() turns them into slots for the real run."""
        self.slots, self.sizes = slots, []
        self.px = np.full((SIZE * SS, SIZE * SS, 3), 128, np.uint8) if slots is not None else None
        self.ox = self.oy = self.w = self.h = 0
        self._text = {}
        self._cap = None

    # ---------------------------------------------------------- layout
    def pack(self):
        """Skyline bottom-left packing, tallest first; returns {name: (x, y)} and the height used."""
        sky, slots, used = [(0, PAD, SIZE)], {}, 0          # skyline segments (x, y, width)
        for name, w, h in sorted(self.sizes, key=lambda r: (-r[2], -r[1], r[0])):
            W, best = w + PAD, None
            for i, (x, _, _) in enumerate(sky):
                if x + W > SIZE - PAD + PAD:
                    break
                y, j, rem = 0, i, W
                while rem > 0 and j < len(sky):
                    y, rem, j = max(y, sky[j][1]), rem - sky[j][2], j + 1
                if rem <= 0 and (best is None or (y, x) < best[:2]):
                    best = (y, x, i)
            if best is None or best[0] + h + PAD > SIZE:
                raise RuntimeError(f'atlas full at {name}')
            y, x, i = best
            slots[name] = (x + PAD, y)
            used = max(used, y + h)
            new, end = [(x, y + h + PAD, W)], x + W
            for sx, sy, sw in sky[i:]:
                if sx + sw > end:
                    new.append((max(sx, end), sy, sx + sw - max(sx, end)))
            sky = sky[:i] + new
        return slots, used

    def region(self, name, w, h, bg):
        if self.slots is None:
            self.sizes.append((name, w, h))
            self.w = self.h = 0
            return w, h
        x, y = self.slots[name]
        K.UV[name] = ((x + 0.5) / SIZE, 1 - (y + h - 0.5) / SIZE, (x + w - 0.5) / SIZE, 1 - (y + 0.5) / SIZE)
        g = PAD // 2
        self.px[(y - g) * SS:(y + h + g) * SS, (x - g) * SS:(x + w + g) * SS] = rgb(bg)
        self.ox, self.oy, self.w, self.h = x, y, w, h
        return w, h

    # ---------------------------------------------------------- raster
    def tri(self, a, b, c, col):
        S = SS
        pts = [((p[0] + self.ox) * S, (p[1] + self.oy) * S) for p in (a, b, c)]
        x0 = max(int(math.floor(min(p[0] for p in pts))), self.ox * S)
        x1 = min(int(math.ceil(max(p[0] for p in pts))), (self.ox + self.w) * S)
        y0 = max(int(math.floor(min(p[1] for p in pts))), self.oy * S)
        y1 = min(int(math.ceil(max(p[1] for p in pts))), (self.oy + self.h) * S)
        if x1 <= x0 or y1 <= y0:
            return
        area = (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0])
        if abs(area) < 1e-9:
            return
        sg = 1.0 if area > 0 else -1.0
        xs = np.arange(x0, x1) + 0.5
        ys = (np.arange(y0, y1) + 0.5)[:, None]
        m = None
        for i in range(3):
            p, q = pts[i], pts[(i + 1) % 3]
            e = ((q[0] - p[0]) * (ys - p[1]) - (q[1] - p[1]) * (xs - p[0])) * sg >= 0
            m = e if m is None else (m & e)
        self.px[y0:y1, x0:x1][m] = col

    def poly(self, pts, col):
        col = rgb(col)
        if len(pts) == 3:
            return self.tri(pts[0], pts[1], pts[2], col)
        for t in tessellate_polygon([[Vector((x, y, 0)) for x, y in pts]]):
            self.tri(pts[t[0]], pts[t[1]], pts[t[2]], col)

    def rect(self, x, y, w, h, col, r=0, k=4):
        if r > 0:
            return self.poly([(x + w / 2 + px, y + h / 2 + py) for px, py in K.rrect(w, h, r, k)], col)
        self.poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], col)

    def frame(self, x, y, w, h, lw, col, bg, r=0):
        self.rect(x, y, w, h, col, r)
        self.rect(x + lw, y + lw, w - 2 * lw, h - 2 * lw, bg, max(0, r - lw))

    def circle(self, cx, cy, r, col, n=36, ry=None):
        self.poly([(cx + x, cy + y) for x, y in K.ngon(r, n, 0, ry)], col)

    def line(self, p0, p1, w, col, cap=True):
        d = Vector((p1[0] - p0[0], p1[1] - p0[1]))
        if d.length < 1e-6:
            return
        n = Vector((-d.y, d.x)).normalized() * (w / 2)
        self.poly([(p0[0] + n.x, p0[1] + n.y), (p1[0] + n.x, p1[1] + n.y), (p1[0] - n.x, p1[1] - n.y), (p0[0] - n.x, p0[1] - n.y)], col)
        if cap:
            self.circle(p0[0], p0[1], w / 2, col, 12)
            self.circle(p1[0], p1[1], w / 2, col, 12)

    def lines(self, pts, w, col, closed=False):
        for a, b in zip(pts, pts[1:] + (pts[:1] if closed else [])):
            self.line(a, b, w, col)

    def arrow(self, p0, p1, w, col, head=2.6):
        d = Vector((p1[0] - p0[0], p1[1] - p0[1]))
        u = d.normalized()
        n = Vector((-u.y, u.x))
        hl = w * head
        b = Vector(p1) - u * hl
        self.line(p0, (b.x, b.y), w, col, cap=False)
        self.poly([(p1[0], p1[1]), (b.x + n.x * hl * 0.62, b.y + n.y * hl * 0.62), (b.x - n.x * hl * 0.62, b.y - n.y * hl * 0.62)], col)

    # ---------------------------------------------------------- text
    def _glyphs(self, s, bold):
        key = (s, bold)
        if key not in self._text:
            cu = bpy.data.curves.new('atlas_text', 'FONT')
            cu.body, cu.offset = s, bold
            ob = bpy.data.objects.new('atlas_text', cu)
            bpy.context.scene.collection.objects.link(ob)
            ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
            me = ev.to_mesh()
            me.calc_loop_triangles()
            v = [(p.co.x, p.co.y) for p in me.vertices]
            t = [tuple(lt.vertices) for lt in me.loop_triangles]
            ev.to_mesh_clear()
            bpy.data.objects.remove(ob)
            bpy.data.curves.remove(cu)
            x0 = min((p[0] for p in v), default=0.0)
            x1 = max((p[0] for p in v), default=0.0)
            self._text[key] = (v, t, x0, x1)
        return self._text[key]

    def text(self, s, x, y, h, col, align='c', bold=0.012, maxw=None, sx=1.0, rot=0.0):
        """Draws `s` with cap height h px; (x, y) is the anchor on the vertical centre of the capitals."""
        if self._cap is None:
            v = self._glyphs('H', 0.0)[0]
            self._cap = max(p[1] for p in v)
        # weight is added by redrawing the outline shifted around a small circle: Blender's curve offset makes
        # the M and B of the bundled font self-intersect
        v, t, x0, x1 = self._glyphs(s, 0.0)
        k = h / self._cap
        r = bold * k
        x0, x1 = x0 - bold, x1 + bold
        wid = (x1 - x0) * k * sx
        if maxw and wid > maxw:
            sx *= maxw / wid
            wid = maxw
        ax = {'c': -wid / 2, 'l': 0.0, 'r': -wid}[align]
        ca, sa = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        col = rgb(col)
        pts = []
        for px, py in v:
            lx, ly = (px - x0) * k * sx + ax, h / 2 - py * k
            pts.append((x + lx * ca - ly * sa, y + lx * sa + ly * ca))
        shifts = [(0.0, 0.0)] + ([(r * math.cos(i * math.tau / 6), r * math.sin(i * math.tau / 6)) for i in range(6)] if r > 0.2 else [])
        for dx, dy in shifts:
            for a, b, c in t:
                self.tri((pts[a][0] + dx, pts[a][1] + dy), (pts[b][0] + dx, pts[b][1] + dy), (pts[c][0] + dx, pts[c][1] + dy), col)
        return wid

    # ---------------------------------------------------------- output
    def image(self):
        a = self.px.reshape(SIZE, SS, SIZE, SS, 3).astype(np.float32).mean(axis=(1, 3)) / 255.0
        a = np.round(a * 255.0) / 255.0
        rgba = np.ones((SIZE, SIZE, 4), np.float32)
        rgba[..., :3] = a[::-1]
        img = bpy.data.images.new('streetprops_atlas', SIZE, SIZE, alpha=False)
        img.pixels.foreach_set(rgba.ravel())
        img.pack()
        return img


def build():
    from streetprops_atlas_art import paint
    dry = Painter()
    paint(dry)
    slots, used = dry.pack()
    p = Painter(slots)
    p._text = dry._text
    paint(p)
    img = p.image()
    m = K.ATL()
    nt = m.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.links.new(tex.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    print(f'[atlas] {len(K.UV)} regions, shelves use {used}/{SIZE} px')
    return img

"""Heads for the townsfolk: skull, face, sculpted hair, hats, glasses, beards. See people.py."""
import math
from mathutils import Vector, Matrix
from people_geo import *
from people_body import Z_NECK, DARK

# skull rows in head space (origin = neck base): (z, half width, front depth, back depth, centre y)
SKULL = [(.030, .040, .046, .030, -.022), (.058, .064, .070, .056, -.012), (.100, .079, .086, .080, -.004),
         (.150, .084, .090, .094, 0.0), (.200, .085, .090, .098, .002), (.245, .079, .083, .093, .004),
         (.278, .060, .062, .072, .006), (.295, .032, .033, .040, .008)]
HE = 2.3          # squareness of the skull section
ZT = 0.287        # crown reference height for hair shells
SHORT = [(0, .226), (35, .222), (58, .190), (76, .160), (90, .182), (104, .125), (130, .080), (180, .066)]
CROP = [(0, .232), (40, .226), (60, .200), (78, .178), (92, .186), (106, .140), (130, .100), (180, .085)]
LONG = [(0, .222), (38, .205), (62, .135), (85, .075), (180, .055)]
UNDER = [(0, .205), (60, .180), (76, .158), (90, .180), (104, .125), (130, .080), (180, .066)]   # hair seen below a hat


class Head:
    def __init__(self, fig, jaw=1.0, nose=1.0):
        self.f, self.p = fig, fig.P['head']
        self.m = Matrix.Translation(V(0, 0, Z_NECK)) @ Matrix.Scale(fig.hk, 4)
        jw = jaw * (0.93 if fig.sex == 'f' else 1.0) * (1.05 if fig.kid else 1.0)
        self.rows = [(z, rx * (lerp(jw, 1.0, smooth((z - .05) / .1))), yf, yb, yc) for z, rx, yf, yb, yc in SKULL]
        self.nose = nose * (0.8 if fig.sex == 'f' or fig.kid else 1.0)
        self.skull()

    # surface ---------------------------------------------------------------------------------------------
    def hs(self, th, z, off=0.0):
        """Skull surface point: th 0 = face, 90 = the figure's left ear, 180 = back of the head."""
        rx, yf, yb, yc = interp(self.rows, z)
        a = math.radians(th)
        c = math.cos(a)
        return V((rx + off) * spow(math.sin(a), 2 / HE), yc - ((yf if c > 0 else yb) + off) * spow(c, 2 / HE), z)

    def skull(self):
        rr = [ring(V(0, yc, z), rx, yb, 12, HE, rvb=yf) for z, rx, yf, yb, yc in self.rows]
        rr.append(V(0, .008, .302))
        self.p.loft(rr, 'skin', xf=self.m)
        self.p.loft([ring(V(0, .006, z), r, r + .004, 8, 2.2) for z, r in ((-.02, .060), (.05, .058), (.11, .05))], 'skin', xf=self.m)

    def fbox(self, th, z, size, spec, off=0.0, bevel=0.0, turn=0.6, key=None, solid=False):
        (self.p.box if solid else self.p.slab)(self.hs(th, z, off), size, spec, bevel, rot=rot('Z', th * turn), xf=self.m)

    def chunk(self, pts, spec='hair', inner=-.012):
        """Convex lump lying on the skull from (th, z, off) corner points."""
        o = [self.hs(t, z, off) for t, z, off in pts]
        i = [self.hs(t, z, inner) for t, z, off in pts]
        self.p.hull(o + i, spec, xf=self.m)

    # face ------------------------------------------------------------------------------------------------
    def face(self, brow='hair', eye=DARK, ears=True, eye_z=.166):
        k = self.nose
        yf = lambda z: self.hs(0, z).y
        self.p.hull([V(sx * w, yf(z) - d, z) for sx in (-1, 1) for w, d, z in
                     ((.008, -.004, .186), (.012 * k, .026 * k, .132), (.016 * k, -.004, .116), (.004, .030 * k, .128))],
                    'skin', xf=self.m)
        self.chunk([(t, z, o) for t in (-44, -22, 0, 22, 44) for z, o in ((.180, .004), (.196, .0075), (.208, .002))], 'skin')
        for sg in (-1, 1):
            self.fbox(sg * 23, eye_z, (.019, .010, .021), eye, -.001, .003)
            if brow:
                self.fbox(sg * 24, .199, (.040, .012, .011), brow, .0075, .003, turn=0.75)
            if ears:
                self.p.loft([V(sg * .081, .012, .118)] + [ring(V(sg * (.084 + dx), .014, z), .010, r, 6, 2.0, u=X, v=Y)
                                                           for z, r, dx in ((.135, .016, .004), (.165, .022, .008), (.185, .016, .006))]
                            + [V(sg * .084, .014, .196)], 'skin', xf=self.m)

    def glasses(self, kind='sun', frame=DARK, lens=None):
        z, w, h = (.168, .052, .034) if kind == 'sun' else (.167, .044, .034)
        lens = lens or (('gloss', '#15171a') if kind == 'sun' else ('gloss', '#bcd3dc'))
        for sg in (-1, 1):
            self.fbox(sg * 22, z, (w, .008, h), lens, .013, .006, turn=0.45)
            self.fbox(sg * 22, z + h / 2, (w + .004, .011, .007), frame, .014, .002, turn=0.45)
            if kind != 'sun':
                self.fbox(sg * 22, z - h / 2, (w + .004, .011, .005), frame, .014, .002, turn=0.45)
            a, b = self.hs(sg * 52, z + .01, .012), self.hs(sg * 90, z + .012, .012)
            self.p.tube([a, b], [(.0035, .005)] * 2, frame, n=4, e=4.0, xf=self.m)
        self.fbox(0, z + .008, (.022, .008, .007), frame, .017)

    # hair ------------------------------------------------------------------------------------------------
    def shell(self, hl, off, spec='hair', n=14, levels=(0, .3, .58, .82, .96), crown=True, zt=ZT, top=0.0, fwd=None, only=0.0):
        """Thick shell over the skull above the hairline table hl [(|theta|, z)]. off = thickness or [(t, off)].
        fwd(th, t) -> extra forward shift (quiffs, cap fronts)."""
        ot = off if isinstance(off, list) else [(0, off), (1, off)]
        ths = [360 * (i + .5) / n - 180 for i in range(n)]

        def pt(th, t, o):
            if abs(th) < only:
                o = -.012
            q = self.hs(th, lerp(interp(hl, abs(th))[0], zt, t), o)
            q.z += max(o, 0.0) * smooth(t) * 0.9
            if fwd:
                q = q + V(0, -fwd(th, t), 0)
            return q

        rr = [[pt(th, 0, -.008) for th in ths]]
        for t in levels:
            rr.append([pt(th, t, interp(ot, t)[0]) for th in ths])
        if crown:
            o = interp(ot, 1.0)[0]
            rr.append(V(0, .008 - (fwd(0, 1) if fwd else 0) * 0.5, .300 + o + top))
        else:
            rr.append([pt(th, levels[-1], -.008) for th in ths])
        self.p.loft(rr, spec, cap0=False, cap1=False, xf=self.m)

    def band(self, hl, h, off, spec, n=14, thick=.02):
        ths = [360 * (i + .5) / n - 180 for i in range(n)]
        z = lambda th: interp(hl, abs(th))[0]
        rr = [[self.hs(th, z(th) + dz, o) for th in ths] for dz, o in ((0, off - thick), (0, off), (h, off), (h, off - thick))]
        self.p.loft(rr, spec, cap0=False, cap1=False, xf=self.m)

    def fall(self, rows, spec='hair', n=10):
        """Hair hanging behind the head: rows [(z, half width, y front, y back)] top to bottom."""
        rr = [ring(V(0, (y0 + y1) / 2, z), rx, (y1 - y0) / 2, n, 2.6) for z, rx, y0, y1 in rows]
        self.p.loft(rr, spec, xf=self.m)

    def hair(self, style='short', spec='hair'):
        c = self.chunk
        if style == 'short':        # neat side-parted man's cut
            self.shell(SHORT, [(0, .013), (.5, .020), (1, .022)], spec)
            c([(t, z, o) for t in (-48, -20, 12, 40) for z, o in ((.222, .020), (.262, .034))], spec)
        elif style == 'crop':       # flat-topped crew cut
            self.shell(CROP, [(0, .009), (.6, .013), (1, .012)], spec)
        elif style == 'quiff':      # swept-up front
            self.shell(SHORT, [(0, .014), (.5, .024), (1, .028)], spec, fwd=lambda th, t: .014 * max(0, math.cos(math.radians(th))) * t)
            c([(t, z, o) for t in (-42, -15, 15, 42) for z, o in ((.224, .026), (.270, .050))], spec)
        elif style == 'mop':        # thick, covers ears and forehead
            self.shell([(0, .200), (40, .192), (70, .150), (95, .120), (180, .060)], [(0, .020), (.5, .030), (1, .030)], spec)
            c([(t, z, o) for t in (-55, -25, 5, 40) for z, o in ((.186, .024), (.240, .036))], spec)
        elif style == 'curly':
            self.shell([(0, .215), (50, .195), (75, .150), (100, .110), (180, .070)], [(0, .026), (.4, .044), (1, .042)], spec, n=12)
        elif style == 'bald':       # fringe round the sides and back
            self.shell([(0, .150), (62, .150), (76, .158), (90, .180), (104, .125), (130, .085), (180, .072)],
                       [(0, .012), (.5, .016), (1, .010)],
                       spec, levels=(0, .2, .42), crown=False, zt=.262, only=64)
        elif style == 'thin':       # receding, combed back
            self.shell([(0, .262), (30, .250), (55, .200), (76, .160), (90, .182), (104, .125), (180, .070)], [(0, .011), (1, .014)], spec)
        elif style == 'bob':        # chin-length
            self.shell(LONG, [(0, .018), (.5, .028), (1, .028)], spec)
            self.fall([(.225, .080, .020, .112), (.17, .104, .008, .130), (.10, .112, .0, .132), (.035, .112, .0, .126), (.012, .096, .01, .112)], spec)
            c([(t, z, o) for t in (-50, -22, 8, 34) for z, o in ((.200, .022), (.250, .034))], spec)
        elif style == 'long':       # past the shoulders, down the back
            self.shell(LONG, [(0, .018), (.5, .026), (1, .026)], spec)
            self.fall([(.225, .080, .020, .112), (.17, .102, .010, .128), (.08, .108, .0, .130), (-.02, .104, .040, .134), (-.15, .088, .085, .150), (-.19, .06, .10, .145)], spec)
            c([(t, z, o) for t in (-28, 0, 28) for z, o in ((.208, .020), (.250, .030))], spec)
        elif style in ('pony', 'bun', 'topbun', 'pigtails'):
            self.shell([(0, .224), (40, .212), (64, .170), (82, .150), (94, .130), (120, .080), (180, .062)],
                       [(0, .014), (.5, .021), (1, .022)], spec)
            c([(t, z, o) for t in (-44, -14, 14, 44) for z, o in ((.214, .018), (.252, .028))], spec)
            if style == 'pony':
                self.p.tube([V(0, .095, .235), V(0, .150, .232), V(0, .178, .150), V(0, .168, .040), V(0, .150, -.010)],
                            [.030, (.036, .040), (.038, .034), (.030, .026), .010], spec, n=8, xf=self.m)
                self.p.tube([V(0, .112, .236), V(0, .132, .236)], [.040, .040], 'shirt', n=8, xf=self.m)
            elif style == 'bun':
                self.p.ball(V(0, .118, .215), (.052, .046, .050), spec, n=8, xf=self.m)
            elif style == 'topbun':
                self.p.ball(V(0, .040, .325), (.048, .048, .040), spec, n=8, xf=self.m)
            else:
                for sg in (-1, 1):
                    self.p.tube([V(sg * .090, .040, .150), V(sg * .128, .050, .120), V(sg * .135, .055, .020)],
                                [.026, (.032, .032), .012], spec, n=6, xf=self.m)
                    self.p.tube([V(sg * .098, .042, .142), V(sg * .112, .046, .130)], [.034, .034], 'shirt', n=6, xf=self.m)
        elif style == 'under':      # what shows below a hat
            self.shell(UNDER, [(0, .012), (1, .012)], spec, levels=(0, .3, .6), zt=.25, crown=False)
        elif style == 'under_long':
            self.shell([(0, .205), (40, .200), (64, .135), (85, .080), (180, .055)], [(0, .016), (1, .014)], spec, levels=(0, .3, .6), zt=.25, crown=False)
            self.fall([(.20, .098, .012, .122), (.08, .108, .0, .128), (.0, .104, .030, .130), (-.05, .08, .06, .125)], spec)

    def beard(self, spec='hair', full=True, tache=True):
        if full:
            rr = []
            for z, o in ((.012, .002), (.034, .016), (.07, .018), (.105, .014), (.126, .001)):
                rx, yf, yb, yc = interp(self.rows, max(z, .03))
                rr.append(ring(V(0, yc, z), rx + o, yb * .25, 10, HE, rvb=yf + o))
            self.p.loft(rr, spec, xf=self.m)
            for sg in (-1, 1):
                self.chunk([(sg * t, z, .008) for t in (66, 84) for z in (.105, .165)], spec)
        if tache:
            self.chunk([(t, z, o) for t in (-20, 0, 20) for z, o in ((.098, .010), (.114, .014))], spec)

    # hats ------------------------------------------------------------------------------------------------
    def _bill(self, spec, z=.212, off=.018, ext=.085, span=58, drop=.014, back=False, thick=.009):
        pts = []
        for th in (-span, -span * .55, 0, span * .55, span):
            b = self.hs(th, z, off)
            e = ext * math.cos(math.radians(th * 1.25)) + .012
            t = b + V(0, -e, -drop)
            pts += [b, b - V(0, 0, thick), t, t - V(0, 0, thick * .7)]
        self.p.hull(pts, spec, xf=self.m @ rot('Z', 180) @ Matrix.Translation(V(0, -.012, -.02)) if back else self.m)

    def cap(self, spec='hat', bill=None, front=None, back=False, button=True):
        hl = [(0, .208), (90, .196), (180, .168)] if not back else [(0, .190), (90, .196), (180, .200)]
        self.shell(hl, [(0, .019), (.5, .024), (1, .022)], spec, top=-.006)
        if front:
            self.chunk([(t, z, o) for t in (-46, -16, 16, 46) for z, o in ((.216, .027), (.266, .037))], front)
        self._bill(bill or spec, back=back)
        if button:
            self.p.ball(V(0, .008, .322), (.012, .012, .006), bill or spec, n=6, xf=self.m)

    def beanie(self, spec='hat', cuff=None):
        hl = [(0, .200), (80, .170), (180, .125)]
        self.shell(hl, [(0, .020), (.5, .027), (1, .034)], spec)
        self.band(hl, .046, .031, cuff or spec)

    def bandana(self, spec='hat'):
        self.shell([(0, .204), (70, .180), (180, .118)], [(0, .011), (1, .014)], spec)
        y = self.hs(180, .125).y
        self.p.ball(V(0, y + .014, .128), (.022, .016, .018), spec, n=6, xf=self.m)
        for sg in (-1, 1):
            self.p.hull([V(sg * a, y + b, z) for a, b, z in ((.004, .012, .125), (.004, .026, .125), (.034, .030, .050),
                                                             (.050, .018, .058), (.030, .012, .060), (.050, .034, .066))], spec, xf=self.m)

    def hard_hat(self, spec='hat'):
        hl = [(0, .200), (180, .182)]
        self.shell(hl, [(0, .026), (.5, .031), (1, .030)], spec)
        ths = [360 * (i + .5) / 14 - 180 for i in range(14)]
        z = lambda th: interp(hl, abs(th))[0]
        w = lambda th: .040 + .040 * max(0.0, math.cos(math.radians(th))) ** 2
        rr = [[self.hs(th, z(th) + dz, o + (w(th) if k else 0)) + V(0, 0, -.006 * k) for th in ths]
              for dz, o, k in ((0, .010, 0), (0, .014, 1), (.010, .014, 1), (.014, .020, 0))]
        self.p.loft(rr, spec, cap0=False, cap1=False, xf=self.m)
        path = [self.hs(0, .222, .036), self.hs(0, .262, .048), V(0, -.03, .336), V(0, .05, .336), self.hs(180, .262, .048), self.hs(180, .215, .036)]
        self.p.hull([q + V(sx * .016, 0, dz) for q in path for sx in (-1, 1) for dz in (0, -.03)], spec, xf=self.m)

    def brim_hat(self, spec='hat', band='#3b2a1e', zb=.214, brim=(.165, .190, .180), crown=.112, curl=.026, tilt=5.0,
                 pinch=True, badge=None, slope=0.0, n=14):
        """Wide-brimmed hat (campaign hat, sun hat). brim = (half width, front reach, back reach)."""
        m = self.m @ about((0, 0, zb), rot('X', tilt))
        inner = [self.hs(360 * (i + .5) / n - 180, zb, .014) for i in range(n)]
        sx = lambda q: abs(q.x) / brim[0]
        out = ring(V(0, 0, zb), brim[0], brim[2], n, 2.1, rvb=brim[1], phase=0.5)
        # ring() starts at +X and runs towards +Y; the skull ring starts at the back: re-index to match
        out = sorted(out, key=lambda q: math.atan2(q.x, -q.y))
        inner = sorted(inner, key=lambda q: math.atan2(q.x, -q.y))
        up = lambda q, dz: V(q.x, q.y, q.z + dz + curl * sx(q) ** 2 - slope)
        rr = [[q + V(0, 0, -.004) for q in inner], [up(q, -.005) for q in out], [up(q, .005) for q in out],
              [q + V(0, 0, .008) for q in inner]]
        for dz, k in ((.030, 1.0), (crown * .8, .90), (crown, .70 if pinch else .80)):
            rr.append([V(q.x * k * (0.9 if pinch and dz == crown else 1), q.y * k, zb + .008 + dz) for q in inner])
        rr.append(V(0, 0, zb + crown - (.012 if pinch else -.006)))
        self.p.loft(rr, spec, cap0=False, cap1=False, xf=m)
        if band:
            self.p.loft([[V(q.x * k, q.y * k, zb + dz) for q in inner] for dz, k in ((.008, 1.0), (.008, 1.05), (.034, 1.045), (.036, .99))],
                        band, cap0=False, cap1=False, xf=m)
        if badge:
            y = min(q.y for q in inner) * 1.03
            self.p.hull([V(.018 * math.sin(a), y - d, zb + .052 + .018 * math.cos(a)) for a in [i * math.pi / 3 for i in range(6)]
                         for d in (0, .008)], badge, xf=m)

    def flat_cap(self, spec='hat'):
        self.shell([(0, .214), (90, .192), (180, .150)], [(0, .015), (.45, .030), (1, .014)], spec, zt=.280, top=-.008,
                   fwd=lambda th, t: .034 * max(0, math.cos(math.radians(th))) ** 2 * (1 - abs(t - .4)))
        self._bill(spec, z=.212, off=.016, ext=.036, span=50, drop=.012)

    def paper_hat(self, spec='#f2f0ea', band='#dedbd2'):
        rr = [ring(V(0, yc, z), rx, yb, 12, e, rvb=yf) for z, rx, yf, yb, yc, e in
              ((.212, .094, .104, .110, .004, 2.3), (.262, .090, .112, .118, .004, 2.2), (.318, .034, .122, .126, .004, 1.8))]
        self.p.loft(rr, spec, xf=self.m)
        self.band([(0, .210), (180, .206)], .034, .0165, band, thick=.012)

    def headband(self, spec='hat', z=.200, off=.024):
        self.band([(0, z), (180, z - .024)], .028, off, spec)

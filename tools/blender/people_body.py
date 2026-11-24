"""Rigid jointed townsfolk: body builder (trunk, limbs, hands, shoes, skirts). See people.py."""
import math
from mathutils import Vector, Matrix
from people_geo import *

PARTS = ('trunk', 'head', 'arm_l', 'arm_r', 'forearm_l', 'forearm_r', 'leg_l', 'leg_r', 'shin_l', 'shin_r')
# canonical adult joints (metres at scale 1; every figure is this design scaled by `s`)
Z_HIP, Z_KNEE, Z_SH, Z_ELB, Z_WR, Z_NECK, X_HIP = 0.90, 0.50, 1.415, 1.135, 0.885, 1.49, 0.09
Z_CROTCH, Z_TOP = 0.815, 1.445
TN, TE = 16, 2.5      # trunk sides, squareness
LN, LE = 10, 2.25
AN = 8             # sides of arm segments     # limb sides, squareness
ANGLE = 44.0
DARK = '#1c1b1b'

Z_AT = 1.39      # top ring of the upper arm (the shoulder cap domes up from here)
ARM = [(1.39, .055, .061), (1.30, .053, .058), (1.135, .047, .050)]
FOREARM = [(1.135, .0455, .0485), (1.06, .047, .050), (0.885, .032, .037)]
THIGH = [(0.90, .084, .094), (0.78, .081, .090), (0.50, .066, .072)]
SHIN = [(0.50, .064, .070), (0.38, .064, .070), (0.05, .059, .067)]
THIGH_SKIN = [(0.90, .082, .090), (0.78, .078, .085), (0.50, .056, .060)]
SHIN_SKIN = [(0.50, .054, .058, 0.0), (0.36, .055, .060, .008), (0.12, .035, .039, .004), (0.05, .036, .042, 0.0)]


def norm_rows(rows):
    return sorted([(r[0], r[1], r[2], r[3] if len(r) > 3 else 0.0) for r in rows])




class Figure:
    def __init__(self, name, sex='m', height=1.80, girth=1.0, belly=0.0, kid=False, head=None, palette=None,
                 vary=None, limb=None):
        self.name, self.sex, self.kid, self.height = name, sex, kid, height
        f = sex == 'f'
        head_abs = head or (0.84 if kid else 0.96 if f else 1.0)
        self.s = (height - 0.014 - 0.287 * head_abs) / Z_NECK
        self.hk = head_abs / self.s
        self.g = (limb or (0.88 if f else 1.0)) * (1 + (girth - 1) * 0.6) * (1.08 if kid else 1.0)
        w = girth * (1.04 if kid else 1.0)
        self.CH = (0.162 if f else 0.190) * w
        self.WA = (0.132 if f else 0.160) * w * (1.08 if kid else 1.0)
        self.HP = (0.166 if f else 0.165) * w
        self.bust = 0.022 if f and not kid else 0.0
        self.belly = belly
        self.dk = (0.92 if f else 1.0) * (1 + (girth - 1) * 0.8)
        self.SH = max(self.CH + 0.034, self.HP + 0.012 + 0.048 * self.g)
        self.palette = dict(palette or {})
        self.vary = vary
        self.P = {k: Part() for k in PARTS}
        self.zones = [(Z_CROTCH, 1.03, 'pants', 0.0), (1.03, Z_TOP, 'shirt', 0.004)]
        self.neck_spec = None
        self.rows = self._rows()
        self.leg_rows = {}
        self.extra = {}

    # ---------------------------------------------------------------- trunk
    def _rows(self):
        CH, WA, HP, b, d = self.CH, self.WA, self.HP, self.belly, self.dk
        rows = [(Z_CROTCH, HP * 0.90, .100, .110), (0.86, HP * 0.985, .116, .126), (0.93, HP, .120 + b * 0.5, .128),
                (1.04, WA, .113 + b, .104), (1.16, lerp(WA, CH, 0.55), .122 + b * 0.75 + self.bust * 0.2, .108),
                (1.29, CH, .132 + self.bust + b * 0.25, .114), (1.385, max(CH + 0.014, self.SH - 0.030), .118 + self.bust * 0.3, .112),
                (1.428, max(CH + 0.008, self.SH - 0.034), .102, .104), (Z_TOP + .004, CH * 0.76, .086, .091), (1.485, .066, .062, .066), (1.535, .056, .054, .058)]
        return [(z, rx, yf * d, yb * d) for z, rx, yf, yb in rows]

    def trow(self, z):
        return interp(self.rows, z)

    def toff(self, z):
        o = None
        for z0, z1, _, off in self.zones:
            if z0 - 1e-6 <= z <= z1 + 1e-6:
                o = off if o is None else max(o, off)
        return 0.0 if o is None else o

    def tring(self, z, off=0.0, absolute=False):
        rx, yf, yb = self.trow(z)
        o = off if absolute else off + self.toff(z)
        return ring(V(0, 0, z), rx + o, yb + o, TN, TE, rvb=yf + o)

    def tsurf(self, x, z, off=0.0, back=False):
        """Point on the (clothed) trunk surface at lateral x and height z, pushed out by `off`."""
        rx, yf, yb = self.trow(z)
        o = self.toff(z) + off
        t = min(0.999, abs(x) / (rx + o))
        y = ((yb if back else yf) + o) * (1 - t ** TE) ** (1 / TE)
        return V(x, y if back else -y, z)

    def _trunk(self):
        p = self.P['trunk']
        rings, mats = [], []

        def push(r, spec):
            if rings:
                mats.append(spec)
            rings.append(r)

        z0, _, spec0, off0 = self.zones[0]
        rx, yf, yb = self.trow(z0)
        low = dome(V(0, 0.004, z0), rx + off0, yb + off0, 0.032, TN, TE, 1, -1, rvb=yf + off0)
        push(low[1], spec0)
        push(low[0], spec0)
        prev = None
        for za, zb, spec, off in self.zones:
            zs = [za] + [r[0] for r in self.rows if za + 1e-4 < r[0] < zb - 1e-4] + [zb]
            for i, z in enumerate(zs):
                if i == 0 and prev is not None:
                    push(self.tring(z, off, True), spec if off >= prev[1] else prev[0])
                else:
                    push(self.tring(z, off, True), spec)
            prev = (spec, off)
        nspec = self.neck_spec or prev[0]
        push(self.tring(1.485, 0.0, True), nspec)
        push(self.tring(1.535, 0.0, True), 'skin')
        p.loft(rings, None, mats=mats)

    def tband(self, z0, z1, spec, off=0.006, mid=True):
        zs = [z0] + ([r[0] for r in self.rows if z0 + 0.01 < r[0] < z1 - 0.01] if mid else []) + [z1]
        self.P['trunk'].loft([self.tring(z, off) for z in zs], spec, cap0=False)

    def panel(self, zs, xl, xr, spec, off=0.005, nx=2, depth=0.03, back=False):
        """Plate lying on the trunk surface: rows at heights zs, from x=xl(z) to x=xr(z)."""
        fx = lambda f, z: f(z) if callable(f) else f
        grid = [[self.tsurf(lerp(fx(xl, z), fx(xr, z), i / nx), z, off, back) for i in range(nx + 1)] for z in zs]
        self.P['trunk'].plate(grid, (0, -depth if back else depth, 0), spec)

    def poly(self, pts, spec, off=0.006, depth=0.02, back=False):
        """Small convex patch on the trunk from (x, z) corner points."""
        o = [self.tsurf(x, z, off, back) for x, z in pts]
        i = [q + V(0, -depth if back else depth, 0) for q in o]
        self.P['trunk'].hull(o + i, spec)

    def tbox(self, x, z, size, spec, off=0.0, bevel=0.0, back=False, rz=0.0, solid=False):
        """Bevelled box centred `off` in front of the trunk surface."""
        c = self.tsurf(x, z, off, back)
        m = rot('Z', rz + (180 if back else 0)) if rz or back else None
        if solid:
            self.P['trunk'].box(c, size, spec, bevel, rot=m)
        else:
            self.P['trunk'].slab(c, size, spec, bevel, rot=m)

    # ---------------------------------------------------------------- limbs
    def lsurf(self, cx, rows, z, phi, off=0.0):
        """Point on a limb surface; phi 0 = front, 90 = +X side, 180 = back."""
        rx, ry, yc = interp(norm_rows(rows), z)
        a = math.radians(phi)
        return V(cx + (rx * self.g + off) * spow(math.sin(a), 2 / LE), yc - (ry * self.g + off) * spow(math.cos(a), 2 / LE), z)

    def limb(self, part, cx, rows, zones, bottom='ball', top=True, n=LN, e=LE, cap=1.0, lean=0.0, soft_top=False):
        """Vertical limb: rows [(z, rx, ry[, yc])], zones [(z_hi, z_lo, spec, off)] top to bottom."""
        rows = norm_rows(rows)
        g = self.g
        rings, mats = [], []

        def push(r, spec):
            if rings:
                mats.append(spec)
            rings.append(r)

        def rg(z, off):
            rx, ry, yc = interp(rows, z)
            return ring(V(cx, yc, z), rx * g + off, ry * g + off, n, e)

        zt, _, spec0, off0 = zones[0]
        rx, ry, yc = interp(rows, zt)
        if top:
            d = dome(V(cx, yc, zt), rx * g + off0, ry * g + off0, ((rx + ry) / 2 * g + off0) * cap, n, e, 2, 1)
            if lean:      # shoulder caps lean in under the shoulder line
                hh = ((rx + ry) / 2 * g + off0) * cap
                sh = lambda q: q + V(lean * (q.z - zt) / hh, 0, 0)
                d = [sh(r) if isinstance(r, Vector) else [sh(q) for q in r] for r in d]
            if soft_top:
                for r in reversed(d):
                    push(r, spec0)
            else:     # separate shell: a crease at the joint keeps the cap from shading the whole segment
                c0 = V(cx, yc, zt)
                self.P[part].loft(list(reversed(d)) + [[c0 + (q - c0) * 0.997 for q in rg(zt, off0)]], spec0, cap1=False)
        prev = None
        for za, zb, spec, off in zones:
            zs = [za] + [r[0] for r in reversed(rows) if zb + 1e-4 < r[0] < za - 1e-4] + [zb]
            for i, z in enumerate(zs):
                if i == 0 and prev is not None:
                    push(rg(z, off), spec if off >= prev[1] else prev[0])
                else:
                    push(rg(z, off), spec)
            prev = (spec, off)
        if bottom == 'ball':
            zb, off = zones[-1][1], zones[-1][3]
            rx, ry, yc = interp(rows, zb)
            d = dome(V(cx, yc, zb), rx * g + off, ry * g + off, (rx + ry) / 2 * g + off, n, e, 1, -1)
            c0 = V(cx, yc, zb)
            self.P[part].loft([[c0 + (q - c0) * 0.997 for q in rg(zb, off)], d[0], d[1]], prev[0], cap0=False)
        self.P[part].loft(rings, None, mats=mats, cap0=not top, cap1=bottom != 'ball')

    def lstrip(self, part, cx, rows, z0, z1, phi, width, spec, off=0.004, steps=2):
        """Narrow plate running down a limb (trouser stripe, seam)."""
        grid = []
        for k in range(steps + 1):
            z = lerp(z0, z1, k / steps)
            rx = interp(norm_rows(rows), z)[0] * self.g
            da = math.degrees(width / 2 / rx)
            grid.append([self.lsurf(cx, rows, z, phi - da, off), self.lsurf(cx, rows, z, phi + da, off)])
        a = math.radians(phi)
        self.P[part].plate(grid, (-math.sin(a) * 0.02, math.cos(a) * 0.02, 0), spec)

    def lband(self, part, cx, rows, z0, z1, spec, off=0.005, n=None):
        rows = norm_rows(rows)
        rr = []
        for z in (z0, z1):
            rx, ry, yc = interp(rows, z)
            rr.append(ring(V(cx, yc, z), rx * self.g + off, ry * self.g + off, n or (AN if 'arm' in part else LN), LE))
        self.P[part].loft(rr, spec)

    def arms(self, kind='long', spec='shirt', off=0.005, cuff=None, glove=None, band=None):
        """kind: long, short, rolled, cap, none. `band` = [(z_hi, z_lo, spec)] coloured rings on the sleeve."""
        self.arm_off = off + (0.004 if kind in ('short', 'cap') else 0.0)
        for sgn, sd in ((1, 'l'), (-1, 'r')):
            cx = sgn * self.SH
            if kind == 'long':
                az = [(Z_AT, Z_ELB, spec, off)]
                fz = [(Z_ELB, 0.925, spec, off), (0.925, Z_WR, cuff or spec, off + (0.006 if cuff else 0.003))]
            elif kind == 'short':
                az = [(Z_AT, 1.265, spec, off + 0.004), (1.265, Z_ELB, 'skin', 0.0)]
                fz = [(Z_ELB, Z_WR, 'skin', 0.0)]
            elif kind == 'rolled':
                az = [(Z_AT, 1.205, spec, off), (1.205, Z_ELB, cuff or spec, off + 0.011)]
                fz = [(Z_ELB, Z_WR, 'skin', 0.0)]
            elif kind == 'cap':
                az = [(Z_AT, 1.35, spec, off + 0.004), (1.35, Z_ELB, 'skin', 0.0)]
                fz = [(Z_ELB, Z_WR, 'skin', 0.0)]
            else:
                az = [(Z_AT, Z_ELB, 'skin', 0.0)]
                fz = [(Z_ELB, Z_WR, 'skin', 0.0)]
            if band:
                az = self._split(az, band)
                fz = self._split(fz, band)
            self.limb('arm_' + sd, cx, ARM, az, cap=0.60, n=AN, lean=-sgn * 0.026, soft_top=True)
            self.limb('forearm_' + sd, cx, FOREARM, fz, bottom='flat', n=AN)
            self.hand('forearm_' + sd, sgn, glove or 'skin')

    @staticmethod
    def _split(zones, bands):
        """Recolours horizontal slices of limb zones: bands = [(z_hi, z_lo, spec)]."""
        out = []
        for za, zb, spec, off in zones:
            if spec == 'skin':
                out.append((za, zb, spec, off))
                continue
            cuts = sorted({za, zb, *[z for b in bands for z in b[:2] if zb < z < za]}, reverse=True)
            for hi, lo in zip(cuts, cuts[1:]):
                mid = (hi + lo) / 2
                sp = spec
                for b in bands:
                    if b[1] < mid < b[0] and spec != 'skin':
                        sp = b[2]
                out.append((hi, lo, sp, off))
        return out

    def hand(self, part, sgn, spec='skin'):
        k = 0.92 if self.sex == 'f' else 1.0
        k *= 1.06 if self.kid else 1.0
        m = Matrix.Translation(V(sgn * self.SH, 0, Z_WR + 0.004)) @ Matrix.Diagonal((-sgn * k, k, k, 1))
        # local frame: +x points at the body (palm side), -y forward, z down from the wrist
        p = self.P[part]
        e, n = 3.0, 8
        secs = [(0.012, 0.0, 0.000, .030, .035), (-0.03, 0.002, -.004, .021, .046), (-0.095, 0.005, -.006, .021, .050),
                (-0.150, 0.024, -.005, .015, .043)]
        rings = [ring(V(x, y, z), rx, ry, n, e) for z, x, y, rx, ry in secs]
        rings.append(ring(V(0.034, -.005, -0.168), .008, .032, n, e))
        p.loft(rings, spec, xf=m)
        p.tube([V(0.004, -.044, -0.025), V(0.010, -.066, -0.062), V(0.018, -.071, -0.100)], [.016, .0155, .012], spec, n=6, e=2.4, xf=m)
        self.extra.setdefault('grip_' + ('l' if sgn > 0 else 'r'), [round(v * self.s, 4) for v in (m @ V(0.03, -0.004, -0.085))])

    # ---------------------------------------------------------------- legs
    def legs(self, kind='trousers', spec='pants', width=1.0, hem=0.05, cuff=False, short=0.58, sock=None, sock_z=0.17,
             leg='skin', off=0.010, bands=None):
        """kind: trousers, shorts, bare (skirts and dresses add their shells with skirt())."""
        for sgn, sd in ((1, 'l'), (-1, 'r')):
            cx = sgn * X_HIP
            if kind == 'trousers':
                wf = lambda z: 1 + (width - 1) * (0.3 if z > 0.8 else 1.0)
                tr = [(z, rx * wf(z), ry * wf(z)) for z, rx, ry in THIGH]
                sr = [(z, rx * width, ry * width) for z, rx, ry in SHIN]
                tz = [(Z_HIP, Z_KNEE, spec, 0.0)]
                sz = [(Z_KNEE, hem + 0.045, spec, 0.0), (hem + 0.045, hem, spec, 0.006)] if cuff else [(Z_KNEE, hem, spec, 0.0)]
            else:
                tr, sr = THIGH_SKIN, SHIN_SKIN
                tz = [(Z_HIP, short, spec, off), (short, Z_KNEE, leg, 0.0)] if kind == 'shorts' else [(Z_HIP, Z_KNEE, leg, 0.0)]
                sz = [(Z_KNEE, sock_z, leg, 0.0), (sock_z, 0.05, sock, 0.004)] if sock else [(Z_KNEE, 0.05, leg, 0.0)]
            if bands:
                tz, sz = self._split(tz, bands), self._split(sz, bands)
            self.leg_rows[sd] = (tr, sr)
            self.limb('leg_' + sd, cx, tr, tz)
            self.limb('shin_' + sd, cx, sr, sz, bottom='flat')

    def leg_stripe(self, spec, width=0.022, z0=0.88, z1=0.07, off=0.004):
        for sgn, sd in ((1, 'l'), (-1, 'r')):
            tr, sr = self.leg_rows[sd]
            self.lstrip('leg_' + sd, sgn * X_HIP, tr, z0, max(z1, Z_KNEE + 0.01), 90 * sgn, width, spec, off=off)
            if z1 < Z_KNEE:
                self.lstrip('shin_' + sd, sgn * X_HIP, sr, Z_KNEE - 0.01, z1, 90 * sgn, width, spec, off=off)

    def knee_patch(self, spec):
        for sgn, sd in ((1, 'l'), (-1, 'r')):
            self.lstrip('shin_' + sd, sgn * X_HIP, self.leg_rows[sd][1], 0.47, 0.36, 0, 0.085, spec, off=0.005)

    def shoes(self, kind='shoe', spec='shoes', sole=DARK, trim=None):
        """kind: shoe, sneaker, boot, pump, sandal."""
        for sgn, sd in ((1, 'l'), (-1, 'r')):
            p = self.P['shin_' + sd]
            k = (0.92 if self.sex == 'f' else 1.0) * (1.12 if self.kid else 1.0)
            m = Matrix.Translation(V(sgn * X_HIP, 0, 0)) @ Matrix.Diagonal((k, k, 1, 1))
            st = {'shoe': 0.020, 'sneaker': 0.030, 'boot': 0.032, 'pump': 0.014, 'sandal': 0.022}[kind]
            # sections heel -> toe: (y, half width, top z)
            if kind == 'boot':
                secs = [(.086, .036, .11), (.074, .047, .15), (.0, .050, .15), (-.055, .052, .105), (-.12, .054, .085),
                        (-.175, .051, .078), (-.205, .040, .066)]
            elif kind == 'sneaker':
                secs = [(.084, .035, .09), (.072, .046, .112), (.0, .049, .112), (-.06, .051, .092), (-.12, .053, .074),
                        (-.175, .050, .064), (-.205, .039, .055)]
            elif kind == 'pump':
                secs = [(.078, .030, .075), (.066, .040, .085), (.0, .043, .082), (-.06, .045, .066), (-.12, .046, .052),
                        (-.17, .040, .046), (-.198, .026, .038)]
            else:
                secs = [(.084, .034, .085), (.072, .045, .104), (.0, .048, .104), (-.06, .050, .086), (-.12, .051, .066),
                        (-.175, .048, .056), (-.208, .036, .047)]

            def sec(y, w, h, z0, e=3.0, n=8):
                return ring(V(0, y, (z0 + h) / 2), w, (h - z0) / 2, n, e, u=X, v=Z)

            zb = st - 0.004
            if kind == 'pump':
                # bare instep in skin, shoe as a toe box and a heel cup
                p.loft([sec(y, w - .003, h - .004, zb) for y, w, h in secs[:5]], 'skin', xf=m)
                p.loft([sec(y, w, h + .002, zb) for y, w, h in secs[4:]] + [sec(-.206, .012, .03, zb)], spec, xf=m)
                p.loft([sec(y, w + .002, h - .012, zb) for y, w, h in secs[:3]], spec, xf=m)
                p.box(V(0, .055, .018), (.05, .05, .036), sole, xf=m)
            elif kind == 'sandal':
                p.loft([sec(y, w - .004, h - .012, zb) for y, w, h in secs], 'skin', xf=m)
                for y, dz in ((-.115, .0), (-.045, .016)):
                    p.loft([sec(y - .016, .053, .078 + dz, zb, 3.4), sec(y + .016, .053, .084 + dz, zb, 3.4)], spec, xf=m)
            else:
                rr = [sec(y, w, h, zb) for y, w, h in secs]
                rr.append(sec(secs[-1][0] - .008, secs[-1][1] * 0.55, secs[-1][2] * 0.72, zb))
                p.loft(rr, spec, xf=m)
            lip = 0.004
            so = [(y + (lip if i == 0 else -lip if i == len(secs) - 1 else 0), w + lip) for i, (y, w, h) in enumerate(secs) if i in (0, 1, 4, 5, 6)]
            p.loft([ring(V(0, y, st / 2), w, st / 2, 4, 200.0, u=X, v=Z) for y, w in so], sole, xf=m)
            if kind in ('shoe', 'boot'):
                p.box(V(0, .045, st * 0.5 + 0.002), (.092, .082, st + 0.008), sole, xf=m)
            if kind == 'sneaker':
                p.loft([sec(-.168, .052, .058, zb, 3.2), sec(-.198, .042, .056, zb, 3.2), sec(-.212, .026, .046, zb, 3.2)],
                       trim or '#e9e6df', xf=m)
                for y in (-.062, -.092, -.122):
                    p.box(V(0, y, .094 + (y + .062) * 0.3), (.05, .012, .01), trim or '#e9e6df', xf=m)
            if kind == 'boot':
                for y in (-.05, -.085):
                    p.box(V(0, y, .112 + (y + .05) * 0.42), (.046, .012, .01), trim or '#b99a5a', xf=m)

    # ---------------------------------------------------------------- skirts (half shells riding on each leg)
    def _sk_ring(self, sgn, z, prof, a0=-90.0, a1=90.0, n=7, off=0.0, gap=0.0025, e=2.3):
        rx, yf, yb = interp(prof, z)
        pts = []
        for i in range(n):
            a = math.radians(lerp(a0, a1, i / (n - 1)))
            sy = spow(math.sin(a), 2 / e)
            x = gap + (rx + off - gap) * abs(math.cos(a)) ** (2 / e)
            pts.append(V(sgn * x, (yb + off) * sy if sy > 0 else (yf + off) * sy, z))
        return pts

    def skirt(self, prof, spec='dress', z_top=0.93, hem=0.47, hem_band=None):
        """prof: [(z, rx, ry_front, ry_back)]. Each half rides on a thigh (and on the shin below the knee)."""
        self.sk_prof = prof = sorted(prof)
        for sgn, sd in ((1, 'l'), (-1, 'r')):
            zs = [z_top] + [r[0] for r in reversed(prof) if hem + 1e-4 < r[0] < z_top - 1e-4]
            if hem >= Z_KNEE - 0.06:
                self._sk_loft('leg_' + sd, sgn, zs + [hem], prof, spec, hem_band)
            else:
                self._sk_loft('leg_' + sd, sgn, [z for z in zs if z > Z_KNEE - 0.05] + [Z_KNEE - 0.05], prof, spec, None)
                self._sk_loft('shin_' + sd, sgn, [Z_KNEE + 0.05] + [z for z in zs if z < Z_KNEE + 0.05] + [hem], prof, spec,
                              hem_band, off=-0.006)

    def _sk_loft(self, part, sgn, zs, prof, spec, hem_band, off=0.0):
        rr = [self._sk_ring(sgn, z, prof, off=off) for z in zs]
        mats = [spec] * (len(rr) - 1)
        if hem_band:
            rr.insert(-1, self._sk_ring(sgn, zs[-1] + hem_band[1], prof, off=off))
            mats.append(hem_band[0])
        rr.append(self._sk_ring(sgn, zs[-1] + 0.012, prof, off=off - 0.012))     # underside: reads as draped cloth when seated
        mats.append(spec)
        self.P[part].loft(rr, None, mats=mats)

    def apron_skirt(self, z0, z1, spec, a_out=62.0, off=0.007, prof=None, pocket=None):
        """Front apron panel split over the two thighs (follows the skirt profile, or a virtual one over trousers)."""
        prof = prof or getattr(self, 'sk_prof', None) or [(0.3, .178, .118, .13), (1.1, .172, .125, .13)]
        for sgn, sd in ((1, 'l'), (-1, 'r')):
            rr = []
            for z in (z0, (z0 + z1) / 2, z1):
                o = self._sk_ring(sgn, z, prof, -90.0, -90.0 + a_out, 4, off)
                i = self._sk_ring(sgn, z, prof, -90.0, -90.0 + a_out, 4, -0.012)
                rr.append(o + list(reversed(i)))
            self.P['leg_' + sd].loft(rr, spec)
            if pocket:
                zc = lerp(z0, z1, 0.45)
                o = [q for z in (zc + .045, zc - .045) for q in self._sk_ring(sgn, z, prof, -68.0, -40.0, 3, off + 0.005)]
                self.P['leg_' + sd].hull(o + [q + V(0, 0.02, 0) for q in o], pocket)

    # ---------------------------------------------------------------- output
    def build(self):
        self._trunk()
        s = self.s
        root = self.P['trunk'].obj(self.name, (0, 0, 0), scale=s, angle=ANGLE)
        piv = {'head': (0, 0, Z_NECK)}
        for sgn, sd in ((1, 'l'), (-1, 'r')):
            piv['arm_' + sd] = (sgn * self.SH, 0, Z_SH)
            piv['forearm_' + sd] = (sgn * self.SH, 0, Z_ELB)
            piv['leg_' + sd] = (sgn * X_HIP, 0, Z_HIP)
            piv['shin_' + sd] = (sgn * X_HIP, 0, Z_KNEE)
        made = {}
        for k in PARTS[1:]:
            par, ppiv = root, (0, 0, 0)
            if k.startswith('forearm'):
                par, ppiv = made['arm_' + k[-1]], piv['arm_' + k[-1]]
            if k.startswith('shin'):
                par, ppiv = made['leg_' + k[-1]], piv['leg_' + k[-1]]
            made[k] = self.P[k].obj(f'{self.name}.{k}', piv[k], par, ppiv, s, ANGLE)
        root['s'] = s
        self.root = root
        return root

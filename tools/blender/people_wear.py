"""Clothing details modelled on top of a people_body.Figure: collars, ties, jackets, aprons, belts, badges..."""
import math
from mathutils import Vector, Matrix
from people_geo import *
from people_body import *

GOLD, STEEL, BONE, LEATHER = ('metal', '#c9a441'), ('metal', '#b4b2ac'), '#ece8df', '#3a2a20'


def collar(f, spec='shirt', kind='shirt', off=0.0):
    """kind: crew, turtle, shirt (closed, for ties), open (spread, shows the throat), band."""
    if kind == 'crew':
        f.tband(1.450, 1.476, spec, off=.007 + off, mid=False)
    elif kind == 'turtle':
        f.tband(1.452, 1.520, spec, off=.009 + off)
    elif kind == 'band':
        f.tband(1.462, 1.506, spec, off=.007 + off, mid=False)
    else:
        f.tband(1.458, 1.500, spec, off=.006 + off, mid=False)
        if kind == 'open':
            f.poly([(-.036, 1.478), (.036, 1.478), (0, 1.385)], 'skin', off=.0035 + off)
        for sg in (-1, 1):
            if kind == 'open':
                pts = [(sg * .024, 1.498), (sg * .070, 1.486), (sg * .072, 1.424), (sg * .020, 1.398)]
            else:
                pts = [(sg * .005, 1.492), (sg * .058, 1.488), (sg * .060, 1.438), (sg * .010, 1.456)]
            f.poly(pts, spec, off=.013 + off)


def tie(f, spec='#7a2a2a', z_end=1.13, w=.030, off=.011):
    wz = lambda z: interp([(z_end, .002), (z_end + .045, w), (1.44, .014)], z)[0]
    f.panel([1.445, 1.32, 1.22, z_end + .045, z_end], lambda z: -wz(z), wz, spec, off=off, nx=1, depth=.012)
    f.poly([(-.021, 1.470), (.021, 1.470), (.014, 1.430), (-.014, 1.430)], spec, off=off + .006)


def bow_tie(f, spec='#1d1d1f'):
    for sg in (-1, 1):
        f.poly([(sg * .006, 1.456), (sg * .046, 1.474), (sg * .046, 1.428), (sg * .006, 1.446)], spec, off=.016)
    f.tbox(0, 1.451, (.016, .014, .020), spec, off=.018, bevel=.003)


def placket(f, spec='shirt', z0=1.045, z1=1.445, buttons=5, button=BONE, w=.014, off=.004):
    f.panel([z1, lerp(z0, z1, .66), lerp(z0, z1, .33), z0], -w, w, spec, off=off, nx=1, depth=.012)
    for i in range(buttons):
        z = lerp(z1 - .03, z0 + .035, i / max(1, buttons - 1))
        f.tbox(0, z, (.013, .008, .013), button, off=off + .004, bevel=.003)


def chest_pocket(f, side=1, spec='shirt', z=1.305, flap=True, size=(.066, .070), x=.088, off=.004, button=None):
    f.tbox(side * x, z, (size[0], .010, size[1]), spec, off=off, bevel=.003, rz=side * 14)
    if flap:
        f.tbox(side * x, z + size[1] / 2 - .004, (size[0] + .006, .014, .024), spec, off=off + .003, bevel=.003, rz=side * 14)
    if button:
        f.tbox(side * x, z + size[1] / 2 - .010, (.011, .008, .011), button, off=off + .010, bevel=.002, rz=side * 14)


def belt(f, spec=LEATHER, buckle=STEEL, z=1.022, h=.036, off=.006, loops=None, bw=.050):
    f.tband(z - h / 2, z + h / 2, spec, off=off, mid=False)
    if buckle:
        f.tbox(0, z, (bw, .014, h + .010), buckle, off=off + .004, bevel=.004)
    if loops:
        for x in (-.085, .085):
            f.tbox(x, z, (.014, .010, h + .014), loops, off=off + .003, rz=math.copysign(16, x))
            f.tbox(x * .8, z, (.014, .010, h + .014), loops, off=off + .003, back=True)


def badge(f, x=.088, z=1.33, r=.024, spec=GOLD, off=.008, pts=6):
    f.poly([(x + r * math.sin(k * 2 * math.pi / pts), z + r * math.cos(k * 2 * math.pi / pts)) for k in range(pts)],
           spec, off=off, depth=.012)


def name_tag(f, side=-1, z=1.335, spec=BONE):
    f.tbox(side * .085, z, (.052, .008, .018), spec, off=.006, bevel=.002, rz=side * 14)


def jacket_front(f, spec='jacket', inner='shirt', zb=1.12, wt=.058, lap=.046, buttons=2, button='#22201f', pockets=True,
                 breast=None, off=.003, split=True, wb=.004):
    """V opening showing the shirt, raised lapels (lap=0: plain edge band), buttons, pocket flaps."""
    w = lambda z: lerp(wb, wt, max(0.0, z - zb) / (1.47 - zb))
    zs = [1.462, 1.42, 1.36, 1.28, 1.20, zb]
    f.panel(zs, lambda z: -w(z), w, inner, off=off, nx=2, depth=.012)
    lw = lambda z: interp([(zb, .012), (zb + .06, max(.016, lap * .5)), (1.36, max(.016, lap)), (1.42, max(.016, lap * .9)),
                           (1.47, .020)], z)[0]
    for sg in (-1, 1):
        f.panel(zs[:-1] + [zb + .012], lambda z: sg * (w(z) - .005), lambda z: sg * (w(z) + lw(z)), spec, off=off + .007,
                nx=1, depth=.014)
    for i in range(buttons):
        f.tbox(.006, zb - .018 - i * .085, (.017, .009, .017), button, off=off + .003, bevel=.004)
    if split:      # the overlap line of the front below the buttons
        f.panel([zb, 1.0, .90, .845], lambda z: -.003 + (zb - z) * .05, lambda z: .009 + (zb - z) * .05, spec, off=off + .004,
                nx=1, depth=.012)
    if pockets:
        for sg in (-1, 1):
            f.tbox(sg * .108, .985, (.074, .013, .024), spec, off=.004, bevel=.003, rz=sg * 24)
    if breast:
        f.tbox(.094, 1.315, (.056, .010, .012), spec, off=.004, bevel=.002, rz=14)
        f.poly([(.072, 1.318), (.116, 1.318), (.106, 1.338), (.094, 1.330), (.082, 1.340)], breast, off=.004, depth=.01)


def hem_band(f, z0, z1, spec, off=.005):
    f.tband(z0, z1, spec, off=off, mid=False)


def straps(f, spec, x0=.070, x1=.075, w=.030, z0=1.35, z1=1.452, off=.006, back=True, zb=1.10, cross=False):
    """Shoulder straps (overalls, aprons): front from (x0, z0) up to the shoulder at x1, optionally down the back."""
    for sg in (-1, 1):
        xc = lambda z: lerp(x0, x1, (z - z0) / (z1 - z0))
        f.panel([z1, (z0 + z1) / 2, z0], lambda z: sg * (xc(z) - w / 2), lambda z: sg * (xc(z) + w / 2), spec, off=off, nx=1,
                depth=.012)
        if back:
            xb = (lambda z: lerp(-x0 * .4, x1, (z - zb) / (z1 - zb))) if cross else (lambda z: lerp(x0 * .8, x1, (z - zb) / (z1 - zb)))
            f.panel([z1, lerp(zb, z1, .66), lerp(zb, z1, .33), zb], lambda z: sg * (xb(z) - w / 2), lambda z: sg * (xb(z) + w / 2), spec,
                    off=off, nx=1, depth=.012, back=True)
        # over the shoulder
        a, b = f.tsurf(sg * x1, z1, off), f.tsurf(sg * x1, z1, off, back=True)
        top = V(sg * x1, 0, z1 + .022)
        f.P['trunk'].hull([q + V(dx, 0, dz) for q in (a, top, b) for dx in (-w / 2, w / 2) for dz in (0, -.02)], spec)


def apron(f, spec=BONE, bib=True, z_hem=.52, pocket=None, w=.118, tie_back=True, zb=1.36):
    """Waist apron with optional bib; the part below the hips rides on the thighs."""
    f.tband(1.028, 1.066, spec, off=.009, mid=False)
    f.panel([1.03, .98, .925], -w, w, spec, off=.009, nx=4, depth=.014)
    f.apron_skirt(.93, z_hem, spec, pocket=pocket)
    if bib:
        bw = lambda z: lerp(w * .86, .068, (z - 1.06) / (zb - 1.06))
        f.panel([zb, 1.26, 1.16, 1.06], lambda z: -bw(z), bw, spec, off=.008, nx=2, depth=.014)
        straps(f, spec, x0=.055, x1=.074, w=.022, z0=zb - .005, off=.007, back=False)
        f.tband(1.458, 1.482, spec, off=.012, mid=False)
    if tie_back:
        c = f.tsurf(0, 1.045, .012, back=True)
        for sg in (-1, 1):
            f.P['trunk'].hull([c + V(sg * a, b, z) for a, b, z in ((.004, 0, .012), (.004, .014, .0), (.05, .012, .026), (.056, .0, .0),
                                                                    (.05, .012, -.022), (.004, 0, -.012))], spec)
            f.P['trunk'].hull([c + V(sg * a, b, z) for a, b, z in ((.004, .0, -.008), (.012, .014, -.012), (.03, .012, -.10),
                                                                    (.012, .0, -.105), (.036, .0, -.09))], spec)


def hood(f, spec='shirt', strings=BONE):
    rr = [ring(V(0, y, z), rx, ry, 10, 2.4) for z, y, rx, ry in ((1.392, .060, .100, .050), (1.44, .078, .128, .066),
                                                                 (1.49, .094, .112, .060), (1.512, .098, .070, .036))]
    f.P['trunk'].loft(rr, spec)
    f.tband(1.448, 1.492, spec, off=.016, mid=False)
    if strings:
        for sg in (-1, 1):
            f.tbox(sg * .026, 1.385, (.008, .008, .100), strings, off=.006)
            f.tbox(sg * .026, 1.330, (.012, .012, .016), strings, off=.007, bevel=.003)


def kangaroo(f, spec='shirt', z0=.975, z1=1.125, w=.105):
    ww = lambda z: lerp(w, w * .62, (z - z0) / (z1 - z0))
    f.panel([z1, (z0 + z1) / 2, z0], lambda z: -ww(z), ww, spec, off=.008, nx=4, depth=.014)


def ribs(f, zs, spec, off=.006, h=.062):
    """Puffy quilted bands (body warmer)."""
    for z in zs:
        f.P['trunk'].loft([f.tring(z + dz, o) for dz, o in ((-h / 2, 0), (0, off), (h / 2, 0))], spec, cap0=False, cap1=False)


def stripes(f, zs, spec, h=.022, off=.003):
    for z in zs:
        f.tband(z - h / 2, z + h / 2, spec, off=off, mid=False)


def vstripes(f, xs, spec, z0=1.045, z1=1.44, w=.022, off=.003, back=True):
    zs = [z1, lerp(z0, z1, .7), lerp(z0, z1, .4), z0]
    for x in xs:
        f.panel(zs, x - w / 2, x + w / 2, spec, off=off, nx=1, depth=.010)
        if back:
            f.panel(zs, x - w / 2, x + w / 2, spec, off=off, nx=1, depth=.010, back=True)


def camera(f, body='#2b2b2e', lens=('metal', '#8f8f93'), strap='#5a3b28', z=1.215):
    c = f.tsurf(0, z, .034)
    T = f.P['trunk']
    T.box(c, (.122, .052, .078), body, .008)
    T.box(c + V(-.03, 0, .046), (.046, .040, .020), body)
    T.box(c + V(.040, 0, .043), (.018, .020, .012), lens)
    T.tube([c + V(.008, -.02, -.004), c + V(.008, -.062, -.004)], [.032, .030], lens, n=8)
    T.tube([c + V(.008, -.060, -.004), c + V(.008, -.068, -.004)], [.024, .024], ('gloss', '#16181c'), n=8)
    for sg in (-1, 1):
        xs = lambda zz: lerp(.056, .062, (zz - z) / (1.455 - z))
        f.panel([1.455, 1.35, z + .03], lambda zz: sg * (xs(zz) - .009), lambda zz: sg * (xs(zz) + .009), strap, off=.006,
                nx=1, depth=.012)
    f.tband(1.458, 1.480, strap, off=.010, mid=False)


def side_box(f, side, z, size, spec, out=.0, bevel=.006, y=0.0):
    """Box on the hip side of the trunk (holster, radio, pouch)."""
    rx = f.trow(z)[0] + f.toff(z)
    f.P['trunk'].box(V(side * (rx + size[0] / 2 - .012 + out), y, z), size, spec, bevel)


def rag(f, spec='#b23a32', side=-1):
    c = f.tsurf(side * .085, .955, .010, back=True)
    f.P['trunk'].hull([c + V(a, b, z) for a, b, z in ((-.03, 0, .02), (.03, 0, .02), (-.036, .016, -.05), (.034, .014, -.085),
                                                       (.0, .022, -.11), (-.03, .0, -.07), (.03, .0, -.08))], spec)


def cross(f, spec=GOLD, z=1.27):
    f.tbox(0, z, (.012, .008, .060), spec, off=.006)
    f.tbox(0, z + .012, (.038, .008, .012), spec, off=.006)


def shoulder_patch(f, spec, z0=1.37, z1=1.30):
    for sg, sd in ((1, 'l'), (-1, 'r')):
        f.lstrip('arm_' + sd, sg * f.SH, ARM, z0, z1, 90 * sg, .062, spec, off=f.arm_off + .004)


def epaulettes(f, spec, button=None):
    for sg in (-1, 1):
        a = V(sg * (f.CH * .62), 0, 1.458)
        b = V(sg * (f.CH + .012), 0, 1.428)
        f.P['trunk'].hull([q + V(0, dy, dz) for q in (a, b) for dy in (-.022, .022) for dz in (0, -.03)], spec)
        if button:
            f.P['trunk'].box(a + V(sg * .012, 0, .004), (.012, .012, .008), button, .002)


def wrist(f, spec, z0=.975, z1=.935, off=.006):
    for sg, sd in ((1, 'l'), (-1, 'r')):
        f.lband('forearm_' + sd, sg * f.SH, FOREARM, z0, z1, spec, off=off)


def watch(f, spec=STEEL, strap=LEATHER, side=1):
    sd = 'l' if side > 0 else 'r'
    f.lband('forearm_' + sd, side * f.SH, FOREARM, .925, .905, strap, off=.004)
    q = f.lsurf(side * f.SH, FOREARM, .915, 90 * side, .006)
    f.P['forearm_' + sd].box(q, (.010, .030, .030), spec, .004)


def skirt_prof(f, hem, flare=.03, tight=0.0):
    """Skirt profile rows [(z, rx, y front, y back)] from the hips down to `hem`."""
    rx, yf, yb = f.trow(.93)
    top = (.945, rx + .008, yf + .008, yb + .008)
    hip = (.86, max(rx + .012, .184 - tight), yf + .012, yb + .016)
    k = flare * (.86 - hem) / .4
    return [(hem, hip[1] + k, hip[2] + k * .9, hip[3] + k), hip, top]

"""Roster, part two (registers into people_cast.CAST)."""
from people_cast import *

TUCKED = [(Z_CROTCH, 1.03, 'pants', 0.0), (1.03, Z_TOP, 'shirt', 0.004)]
LOOSE = [(Z_CROTCH, .93, 'pants', 0.0), (.93, Z_TOP, 'shirt', 0.009)]
PLAID = [(1.365, 1.335, 0), (1.255, 1.225, 0), (1.085, 1.055, 0), (.975, .945, 0)]


def plaid(f, dark, zs=(1.10, 1.21, 1.32), xs=(-.085, .085)):
    stripes(f, zs, dark, h=.026)
    vstripes(f, xs, dark, z0=1.045, z1=1.40, w=.024, off=.0035)
    return [(a, b, dark) for a, b, _ in PLAID]


def jeans(f, hem=.055, cuff=False, **kw):
    f.legs('trousers', hem=hem, cuff=cuff, **kw)
    for sg in (-1, 1):      # back pockets
        f.tbox(sg * .078, .925, (.070, .010, .074), 'pants', off=.003, bevel=.003, back=True)


@person
def farmer():
    f = Figure('farmer', 'm', 1.80, girth=1.08, belly=.035, palette=P('tan', 'sand', '#b5463a', '#3f5f86', '#5a3d28', hat='#3f6a45'))
    f.zones = [(Z_CROTCH, 1.12, 'pants', 0.006), (1.12, Z_TOP, 'shirt', 0.004)]
    f.arms('rolled', 'shirt', cuff='shirt')
    jeans(f, hem=.06, cuff=True, width=1.06)
    f.shoes('boot', sole=DARK)
    collar(f, 'shirt', 'open')
    bw = lambda z: lerp(.112, .086, (z - 1.12) / .24)
    f.panel([1.36, 1.24, 1.12], lambda z: -bw(z), bw, 'pants', off=.007, nx=4, depth=.014)       # bib
    straps(f, 'pants', x0=.072, x1=.078, w=.034, z0=1.345, off=.007, cross=True, zb=1.12)
    for sg in (-1, 1):
        f.tbox(sg * .072, 1.335, (.020, .010, .020), GOLD, off=.012, bevel=.004)
    f.tbox(0, 1.255, (.092, .010, .070), 'pants', off=.011, bevel=.003)
    f.tbox(0, 1.287, (.098, .012, .012), '#2f4868', off=.012)
    for sg in (-1, 1):
        f.tbox(sg * .112, .965, (.050, .010, .060), '#2f4868', off=.004, bevel=.003, rz=sg * 26)
        side_box(f, sg, 1.07, (.012, .030, .018), GOLD, out=.010, bevel=0)
    hd = Head(f, jaw=1.04)
    hd.face()
    hd.hair('under')
    hd.beard(full=False)
    hd.cap('hat', front=BONE)
    return f, hd


@person
def mechanic():
    f = Figure('mechanic', 'm', 1.78, girth=1.04, palette=P('brown', 'black', '#e6e2d8', '#566b7a', '#2a2420'), vary=['skin', 'hair', 'pants'])
    f.zones = [(Z_CROTCH, Z_TOP, 'pants', 0.007)]
    f.arms('rolled', 'pants', off=.007, cuff='pants')
    f.legs('trousers', hem=.055, width=1.08)
    f.knee_patch('#445662')
    f.shoes('boot', sole=DARK)
    collar(f, 'pants', 'open', off=.004)
    f.poly([(-.030, 1.474), (.030, 1.474), (0, 1.400)], 'shirt', off=.009)
    f.panel([1.39, 1.2, 1.0, .86], -.006, .006, STEEL, off=.004, nx=1, depth=.01)              # zip
    f.tbox(0, 1.392, (.014, .010, .022), STEEL, off=.006)
    f.tband(1.012, 1.048, '#445662', off=.004, mid=False)
    chest_pocket(f, 1, 'pants', z=1.30, button=STEEL)
    f.tbox(-.088, 1.325, (.064, .009, .030), BONE, off=.005, bevel=.003, rz=-14)                # name patch
    f.tbox(-.088, 1.325, (.040, .009, .008), '#b23a32', off=.007, rz=-14)
    for sg in (-1, 1):
        f.tbox(sg * .112, .965, (.050, .010, .064), '#445662', off=.004, bevel=.003, rz=sg * 26)
        f.tbox(sg * .078, .925, (.070, .010, .074), '#445662', off=.003, bevel=.003, back=True)
    rag(f, '#b23a32', -1)
    side_box(f, 1, .96, (.018, .034, .150), STEEL, out=.004, bevel=.004, y=.02)                  # wrench in the leg pocket
    hd = Head(f)
    hd.face()
    hd.hair('short')
    hd.beard(full=False)
    return f, hd


@person
def lumberjack():
    f = Figure('lumberjack', 'm', 1.85, girth=1.13, belly=.02, palette=P('light', 'red', '#a9342c', '#44506a', '#4a3324', hat='#3d5a47'))
    f.zones = list(TUCKED)
    dark = '#2a2325'
    bands = plaid(f, dark)
    f.arms('rolled', 'shirt', cuff='shirt', band=bands[1:])
    jeans(f, hem=.07, cuff=True, width=1.05)
    f.shoes('boot', sole=DARK, trim='#c9a441')
    collar(f, 'shirt', 'open')
    placket(f, 'shirt', buttons=4, z1=1.40)
    belt(f, LEATHER, STEEL, loops=None)
    hd = Head(f, jaw=1.06, nose=1.1)
    hd.face()
    hd.hair('under')
    hd.beard(full=True)
    hd.beanie('hat', cuff='#2f4638')
    return f, hd


def frock(name, h, pal, hem=.50, flare=.03, sleeves='cap', girth=1.0, kid=False, sex='f', hem_band=None, **kw):
    f = Figure(name, sex, h, girth=girth, kid=kid, palette=pal, **kw)
    f.zones = [(Z_CROTCH, Z_TOP, 'dress', 0.005)]
    f.arms(sleeves, 'dress')
    f.legs('bare')
    f.skirt(skirt_prof(f, hem, flare=flare), 'dress', hem=hem, hem_band=hem_band)
    return f


@person
def waitress():
    f = frock('waitress', 1.68, P('light', 'red', dress='#e39aa4', shoes='#efece6'), hem=.50, flare=.035, sleeves='short',
              hem_band=(BONE, .022))
    f.shoes('sneaker', sole='#d9d5cc', trim='#d9d5cc')
    collar(f, BONE, 'open', off=.003)
    for sg, sd in ((1, 'l'), (-1, 'r')):
        f.lband('arm_' + sd, sg * f.SH, ARM, 1.285, 1.262, BONE, off=.013)
    placket(f, 'dress', z0=1.08, z1=1.40, buttons=3, button=BONE)
    apron(f, BONE, bib=False, z_hem=.60, pocket='#d8d2c4', w=.120)
    name_tag(f, 1, 1.33, GOLD)
    f.tbox(-.085, 1.315, (.050, .010, .046), 'dress', off=.004, bevel=.003, rz=-14)       # order pad pocket
    f.tbox(-.085, 1.345, (.034, .010, .030), BONE, off=.005, rz=-14)
    hd = Head(f)
    hd.face()
    hd.hair('topbun')
    hd.headband(BONE, z=.232, off=.026)
    return f, hd


@person
def cook():
    f = Figure('cook', 'm', 1.76, girth=1.16, belly=.06, palette=P('tan', 'dark', '#efece4', '#50555e', '#232120'), vary=['skin', 'hair'])
    f.zones = [(Z_CROTCH, .93, 'pants', 0.0), (.93, Z_TOP, 'shirt', 0.008)]
    f.arms('rolled', 'shirt', off=.007, cuff='shirt')
    f.legs('trousers', hem=.055, width=1.06)
    f.shoes('shoe', sole=DARK)
    collar(f, 'shirt', 'band', off=.004)
    f.panel([1.44, 1.30, 1.16, 1.07], -.085, .085, 'shirt', off=.004, nx=4, depth=.012)     # double-breasted front
    for sg in (-1, 1):
        for z in (1.385, 1.300, 1.215):
            f.tbox(sg * .052, z, (.016, .010, .016), '#c9c4b8', off=.009, bevel=.004)
    f.tband(1.455, 1.490, '#b23a32', off=.012, mid=False)                                   # neckerchief
    f.poly([(-.040, 1.462), (.040, 1.462), (0, 1.395)], '#b23a32', off=.012)
    apron(f, '#dcd7ca', bib=False, z_hem=.50, w=.135, pocket=None)
    f.tbox(.118, 1.0, (.050, .012, .110), '#c9c4b8', off=.012, bevel=.003, rz=24)             # towel tucked in the apron string
    hd = Head(f, jaw=1.05)
    hd.face()
    hd.hair('under')
    hd.beard(full=False)
    hd.paper_hat()
    return f, hd


@person
def priest():
    f = suit('priest', 'm', 1.77, P('pale', 'white', '#1c1c1f', '#1c1c1f', '#151515', jacket='#222226'), girth=1.03, belly=.025,
             tie_col=None, vary=['skin', 'hair'])
    f.tband(1.462, 1.508, '#1c1c1f', off=.009, mid=False)
    f.tbox(0, 1.486, (.040, .012, .026), BONE, off=.012)
    cross(f, STEEL, z=1.255)
    f.panel([1.44, 1.36, 1.30], -.004, .004, STEEL, off=.010, nx=1, depth=.008)
    hd = Head(f)
    hd.face(brow='hair')
    hd.hair('bald')
    return f, hd


@person
def old_man():
    f = Figure('old_man', 'm', 1.71, girth=1.03, belly=.045, palette=P('pale', 'white', '#dfe4e8', '#6b5a48', '#3b2a20', jacket='#7c6a3c',
                                                                    hat='#5d5a52'))
    f.zones = [(Z_CROTCH, .88, 'pants', 0.0), (.88, Z_TOP, 'jacket', 0.012)]
    f.arms('long', 'jacket', off=.008, cuff='jacket')
    f.legs('trousers', hem=.055, width=1.04)
    f.shoes('shoe')
    collar(f, 'shirt', 'shirt', off=.004)
    jacket_front(f, 'jacket', 'shirt', zb=1.16, wt=.050, lap=0, buttons=3, button='#3b2a20', pockets=False)
    tie(f, '#5a2f2c', z_end=1.19, off=.008, w=.026)
    hem_band(f, .88, .915, 'jacket', off=.004)
    for sg in (-1, 1):
        f.tbox(sg * .105, .985, (.072, .012, .060), 'jacket', off=.004, bevel=.003, rz=sg * 24)
    hd = Head(f)
    hd.face()
    hd.hair('under')
    hd.beard(full=False)
    hd.glasses('specs', frame='#3b2a20')
    hd.flat_cap('hat')
    return f, hd


@person
def old_woman():
    f = Figure('old_woman', 'f', 1.60, girth=1.10, belly=.03, palette=P('pale', 'grey', '#e9e2d2', shoes='#4a3528', jacket='#8a6f9e',
                                                                      dress='#55606b'))
    f.zones = [(Z_CROTCH, .96, 'dress', 0.0), (.96, Z_TOP, 'jacket', 0.012)]
    f.arms('long', 'jacket', off=.008, cuff='jacket')
    f.legs('bare', leg='#b9987f')
    f.skirt(skirt_prof(f, .24, flare=.035), 'dress', hem=.24, z_top=.97)
    f.shoes('shoe')
    collar(f, 'shirt', 'open', off=.004)
    jacket_front(f, 'jacket', 'shirt', zb=1.20, wt=.046, lap=0, buttons=3, button=BONE, pockets=False)
    hem_band(f, .96, .995, 'jacket', off=.004)
    for sg in (-1, 1):
        f.tbox(sg * .098, 1.06, (.064, .012, .054), 'jacket', off=.004, bevel=.003, rz=sg * 24)
    f.tband(1.462, 1.476, BONE, off=.016, mid=False)             # pearls
    hd = Head(f)
    hd.face()
    hd.hair('bun')
    hd.glasses('specs', frame=GOLD)
    return f, hd


@person
def teen_m():
    f = Figure('teen_m', 'm', 1.72, girth=.92, palette=P('light', 'brown', '#8c3f3a', '#5b7396', '#e8e4dc'))
    f.zones = [(Z_CROTCH, .94, 'pants', 0.0), (.94, Z_TOP, 'shirt', 0.012)]
    f.arms('long', 'shirt', off=.009, cuff='shirt')
    jeans(f, hem=.06, cuff=True)
    f.shoes('sneaker', sole='#d9d5cc')
    hood(f, 'shirt')
    kangaroo(f, 'shirt')
    hem_band(f, .94, .985, 'shirt', off=.005)
    stripes(f, [1.30], BONE, h=.034, off=.003)
    hd = Head(f)
    hd.face()
    hd.hair('mop')
    return f, hd


@person
def teen_f():
    f = Figure('teen_f', 'f', 1.64, girth=.95, palette=P('tan', 'dark', '#e9c64a', '#4b5f8a', '#e8e4dc', jacket='#6f8fb8'))
    f.zones = [(Z_CROTCH, 1.0, 'pants', 0.0), (1.0, Z_TOP, 'jacket', 0.012)]
    f.arms('rolled', 'jacket', off=.008, cuff='#9db5d2')
    f.legs('trousers', hem=.06, bands=[(.30, .10, '#d7699a')])          # leg warmers
    f.shoes('sneaker', sole='#d9d5cc', trim='#d7699a')
    collar(f, 'jacket', 'open', off=.006)
    jacket_front(f, 'jacket', 'shirt', zb=1.03, wt=.072, wb=.046, lap=.026, buttons=0, pockets=False, split=False)
    for sg in (-1, 1):
        chest_pocket(f, sg, 'jacket', z=1.285, button=STEEL, x=.098, size=(.056, .056))
    hem_band(f, 1.0, 1.04, 'jacket', off=.004)
    hd = Head(f)
    hd.face()
    hd.hair('pony')
    for sg in (-1, 1):
        hd.p.ball(hd.hs(sg * 88, .112, .012), .013, '#d7699a', n=6, xf=hd.m)
    return f, hd


@person
def kid_m():
    f = Figure('kid_m', 'm', 1.22, kid=True, palette=P('light', 'blond', '#d8503c', '#3f5f86', '#e8e4dc', hat='#2f6a8a'))
    f.zones = list(LOOSE)
    f.arms('short', 'shirt')
    f.legs('shorts', short=.60, sock=BONE, sock_z=.20, bands=[(.19, .165, '#d8503c')])
    f.shoes('sneaker', sole='#d9d5cc', trim='#2f6a8a')
    collar(f, BONE, 'crew')
    stripes(f, [1.12, 1.22, 1.32], BONE, h=.036)
    for sg, sd in ((1, 'l'), (-1, 'r')):
        f.lband('arm_' + sd, sg * f.SH, ARM, 1.29, 1.265, BONE, off=f.arm_off + .003)
    hd = Head(f)
    hd.face()
    hd.hair('under')
    hd.cap('hat', back=True)
    return f, hd


@person
def kid_f():
    f = Figure('kid_f', 'f', 1.18, kid=True, palette=P('tan', 'brown', '#f1ede3', dress='#4d8f86', shoes='#b23a32'))
    f.zones = [(Z_CROTCH, 1.33, 'dress', 0.006), (1.33, Z_TOP, 'shirt', 0.003)]
    f.arms('short', 'shirt')
    f.legs('bare')
    f.skirt(skirt_prof(f, .56, flare=.06), 'dress', hem=.56, hem_band=('#3b726b', .03))
    f.shoes('shoe', sole=DARK)
    collar(f, 'shirt', 'crew')
    straps(f, 'dress', x0=.070, x1=.074, w=.036, z0=1.32, off=.008, zb=1.30)
    for sg in (-1, 1):
        f.tbox(sg * .070, 1.30, (.020, .010, .020), GOLD, off=.011, bevel=.004)
    f.tbox(0, 1.12, (.090, .010, .066), '#3b726b', off=.005, bevel=.003)
    hd = Head(f)
    hd.face()
    hd.hair('pigtails')
    return f, hd


@person
def casual_m_1():
    f = Figure('casual_m_1', 'm', 1.80, palette=P('light', 'dark', '#e8e3d6', '#44597c', '#e8e4dc'))
    f.zones = list(LOOSE)
    f.arms('short', 'shirt')
    jeans(f, hem=.055)
    f.shoes('sneaker', sole='#d9d5cc', trim='#8c2f2c')
    collar(f, '#8c2f2c', 'crew')
    stripes(f, [1.315], '#8c2f2c', h=.05)
    stripes(f, [1.262], '#31598a', h=.022)
    for sg, sd in ((1, 'l'), (-1, 'r')):
        f.lband('arm_' + sd, sg * f.SH, ARM, 1.29, 1.265, '#8c2f2c', off=f.arm_off + .003)
    watch(f, '#22201f', '#22201f')
    hd = Head(f)
    hd.face()
    hd.hair('quiff')
    return f, hd


@person
def casual_m_2():
    f = Figure('casual_m_2', 'm', 1.76, girth=1.05, belly=.03, palette=P('brown', 'black', '#7fa3a0', '#b7a682', '#4a3324'))
    f.zones = list(TUCKED)
    f.arms('short', 'shirt')
    f.legs('trousers', hem=.055)
    f.shoes('shoe')
    collar(f, 'shirt', 'open')
    placket(f, 'shirt', buttons=4, z1=1.40)
    chest_pocket(f, 1, 'shirt', flap=False)
    f.tbox(.100, 1.345, (.010, .010, .034), '#22201f', off=.008)            # pen
    belt(f, LEATHER, GOLD, loops='pants')
    for sg in (-1, 1):
        f.tbox(sg * .112, .965, (.046, .010, .060), '#a3936f', off=.003, bevel=.003, rz=sg * 26)
    watch(f, GOLD)
    hd = Head(f)
    hd.face()
    hd.hair('short')
    hd.beard(full=False)
    hd.glasses('specs', frame='#22201f')
    return f, hd


@person
def casual_m_3():
    f = Figure('casual_m_3', 'm', 1.82, palette=P('dark', 'black', '#d9d4c7', '#3d4350', '#e8e4dc', jacket='#8a3b32'))
    f.zones = [(Z_CROTCH, .97, 'pants', 0.0), (.97, Z_TOP, 'jacket', 0.014)]
    f.arms('long', 'jacket', off=.011, cuff='#2a2b30', band=[(1.33, 1.295, BONE)])
    jeans(f, hem=.055)
    f.shoes('sneaker', sole='#d9d5cc')
    collar(f, '#2a2b30', 'band', off=.008)
    jacket_front(f, 'jacket', 'shirt', zb=1.20, wt=.048, lap=0, buttons=0, pockets=False)
    f.panel([1.20, 1.10, 1.02], -.005, .005, STEEL, off=.006, nx=1, depth=.01)          # zip
    hem_band(f, .97, 1.025, '#2a2b30', off=.003)
    stripes(f, [1.31], BONE, h=.035, off=.002)
    for sg in (-1, 1):
        f.tbox(sg * .118, 1.10, (.012, .010, .080), '#2a2b30', off=.004, rz=sg * 30)       # slash pockets
    hd = Head(f)
    hd.face()
    hd.hair('curly')
    return f, hd


@person
def casual_f_1():
    f = frock('casual_f_1', 1.70, P('light', 'brown', dress='#d9b24a', shoes='#8a5a3a'), hem=.44, flare=.07, sleeves='none',
              hem_band=('#b8923a', .028))
    f.neck_spec = 'skin'
    f.shoes('sandal', sole='#5a3d28')
    f.poly([(-.062, 1.452), (.062, 1.452), (.030, 1.375), (-.030, 1.375)], 'skin', off=.0065)     # scoop neck
    belt(f, '#7a3b2e', GOLD, z=1.045, h=.034, bw=.040)
    stripes(f, [1.20], '#b8923a', h=.02)
    wrist(f, GOLD, z0=.945, z1=.925, off=.005)
    hd = Head(f)
    hd.face()
    hd.hair('long')
    return f, hd


@person
def casual_f_2():
    f = Figure('casual_f_2', 'f', 1.66, girth=1.04, palette=P('brown', 'black', '#efe6d6', '#8c3f4a', '#2a2422'))
    f.zones = [(Z_CROTCH, 1.03, 'pants', 0.0), (1.03, Z_TOP, 'shirt', 0.005)]
    f.arms('short', 'shirt')
    f.legs('bare')
    f.skirt(skirt_prof(f, .42, flare=.05), 'pants', hem=.42, z_top=1.0)
    f.shoes('pump')
    collar(f, 'shirt', 'open')
    placket(f, 'shirt', buttons=4, z1=1.38, button=GOLD)
    belt(f, '#2a2422', GOLD, z=1.03, h=.040, bw=.036)
    bow_tie(f, '#8c3f4a')
    for sg, sd in ((1, 'l'), (-1, 'r')):
        f.lband('arm_' + sd, sg * f.SH, ARM, 1.29, 1.262, 'shirt', off=f.arm_off + .006)       # puffed cuff
    hd = Head(f)
    hd.face()
    hd.hair('curly')
    for sg in (-1, 1):
        hd.p.ball(hd.hs(sg * 88, .105, .014), .014, GOLD, n=6, xf=hd.m)
    return f, hd


@person
def casual_f_3():
    f = Figure('casual_f_3', 'f', 1.72, palette=P('pale', 'red', '#5aa6a0', '#6a86ad', '#efece6', hat='#d7699a'))
    f.zones = [(Z_CROTCH, 1.06, 'pants', 0.0), (1.06, Z_TOP, 'shirt', 0.006)]
    f.neck_spec = 'skin'
    f.arms('short', 'shirt')
    jeans(f, hem=.075, cuff=True)
    f.shoes('sneaker', sole='#d9d5cc', trim='#d7699a')
    f.poly([(-.070, 1.452), (.070, 1.452), (.034, 1.392), (-.034, 1.392)], 'skin', off=.0075)    # wide neck
    belt(f, BONE, GOLD, z=1.055, h=.030, bw=.036, loops='pants')
    stripes(f, [1.25, 1.19], BONE, h=.02)
    wrist(f, '#d7699a', z0=.955, z1=.925, off=.006)
    hd = Head(f)
    hd.face()
    hd.hair('bob')
    hd.headband('hat', z=.226, off=.034)
    return f, hd


@person
def biker():
    f = Figure('biker', 'm', 1.86, girth=1.14, belly=.055, palette=P('light', 'brown', '#8d8f93', '#39415a', '#1c1b1b', jacket='#232225',
                                                                   hat='#a3322c'))
    f.zones = [(Z_CROTCH, .98, 'pants', 0.0), (.98, Z_TOP, 'jacket', 0.014)]
    f.arms('cap', 'shirt')
    jeans(f, hem=.075, width=1.04)
    f.shoes('boot', sole=DARK, trim=STEEL)
    collar(f, 'shirt', 'crew', off=.004)
    jacket_front(f, 'jacket', 'shirt', zb=1.0, wt=.078, wb=.050, lap=.024, buttons=0, pockets=False, split=False)
    for sg in (-1, 1):
        f.tbox(sg * .118, 1.30, (.044, .010, .010), STEEL, off=.004, rz=sg * 22)              # zip pockets
        f.tbox(sg * .118, 1.08, (.010, .010, .070), STEEL, off=.004, rz=sg * 28)
    f.panel([1.36, 1.28, 1.20], -.085, .085, '#d9d4c7', off=.004, nx=4, depth=.012, back=True)    # back patch
    f.panel([1.345, 1.28, 1.215], -.05, .05, '#a3322c', off=.007, nx=2, depth=.012, back=True)
    belt(f, '#1c1b1b', STEEL, z=1.0, h=.04, bw=.056)
    side_box(f, 1, .93, (.012, .012, .12), STEEL, out=.006, bevel=0, y=.03)                   # wallet chain
    for sg, sd in ((1, 'l'), (-1, 'r')):
        f.lband('forearm_' + sd, sg * f.SH, FOREARM, .955, .905, '#1c1b1b', off=.006)          # wrist cuffs
    hd = Head(f, jaw=1.06, nose=1.1)
    hd.face()
    hd.hair('under_long')
    hd.beard(full=True)
    hd.glasses('sun')
    hd.bandana('hat')
    return f, hd


@person
def worker():
    f = Figure('worker', 'm', 1.81, girth=1.08, belly=.02, palette=P('tan', 'dark', '#5f7fa6', '#4a5263', '#6b4a2c', jacket='#e8752a',
                                                                   hat='#e9c43a'), vary=['skin', 'hair', 'shirt', 'pants', 'shoes'])
    f.zones = [(Z_CROTCH, .97, 'pants', 0.0), (.97, Z_TOP, 'jacket', 0.013)]
    f.arms('rolled', 'shirt', cuff='shirt')
    jeans(f, hem=.065, width=1.05)
    f.shoes('boot', sole=DARK, trim='#c9a441')
    collar(f, 'shirt', 'open', off=.006)
    jacket_front(f, 'jacket', 'shirt', zb=1.16, wt=.060, lap=0, buttons=0, pockets=False)
    lime = '#e6e35a'
    stripes(f, [1.03, 1.11], lime, h=.036, off=.003)
    vstripes(f, (-.098, .098), lime, z0=1.13, z1=1.42, w=.030, off=.003)
    belt(f, LEATHER, None, z=.975, h=.04, off=.004)
    side_box(f, 1, .93, (.050, .100, .100), LEATHER, out=.002)                                 # tool pouch
    side_box(f, 1, 1.0, (.018, .022, .120), STEEL, out=.030, bevel=.003, y=-.02)                # hammer shaft
    f.P['trunk'].box(V(f.trow(1.0)[0] + .046, -.02, 1.07), (.030, .070, .030), '#3a3a3e')
    side_box(f, -1, .955, (.036, .060, .080), '#3a3a3e', out=.002)                               # tape
    for sg, sd in ((1, 'l'), (-1, 'r')):
        f.lband('forearm_' + sd, sg * f.SH, FOREARM, .95, .89, '#c9a36a', off=.008)              # glove cuffs
    hd = Head(f)
    hd.face()
    hd.hair('under')
    hd.hard_hat('hat')
    return f, hd


@person
def trucker():
    f = Figure('trucker', 'm', 1.79, girth=1.17, belly=.075, palette=P('light', 'sand', '#6b7a4a', '#4a5876', '#5a3d28', jacket='#b5532f',
                                                                     hat='#2f4f7a'))
    f.zones = [(Z_CROTCH, .98, 'pants', 0.0), (.98, Z_TOP, 'jacket', 0.014)]
    bands = [(a, b, '#3a4429') for a, b, _ in PLAID[2:3]]
    f.arms('long', 'shirt', cuff='shirt', band=bands)
    jeans(f, hem=.06, width=1.05)
    f.shoes('boot', sole=DARK)
    collar(f, 'shirt', 'open', off=.006)
    f.tband(1.44, 1.478, 'jacket', off=.012, mid=False)                                          # padded collar
    jacket_front(f, 'jacket', 'shirt', zb=1.14, wt=.050, lap=0, buttons=0, pockets=False)
    ribs(f, [1.015, 1.105, 1.195, 1.285, 1.375], 'jacket', off=.011, h=.089)
    f.panel([1.14, 1.06, .985], -.006, .006, STEEL, off=.012, nx=1, depth=.016)                 # zip
    for sg in (-1, 1):
        f.tbox(sg * .112, 1.06, (.012, .012, .080), '#8f3f22', off=.012, rz=sg * 30)
    hd = Head(f, jaw=1.08)
    hd.face()
    hd.hair('under')
    hd.beard(full=False)
    hd.cap('hat', front=BONE, bill='hat')
    return f, hd


@person
def tourist():
    f = Figure('tourist', 'm', 1.75, girth=1.10, belly=.06, palette=P('pale', 'red', '#3f9a8f', '#c9b88f', '#8a5a3a', hat='#e3d9b8'))
    f.zones = [(Z_CROTCH, .92, 'pants', 0.0), (.92, Z_TOP, 'shirt', 0.010)]
    f.arms('short', 'shirt')
    f.legs('shorts', short=.56, sock=BONE, sock_z=.30)
    f.shoes('sandal', sole='#5a3d28')
    collar(f, 'shirt', 'open')
    placket(f, 'shirt', buttons=2, z0=.95, z1=1.38)
    for x, z, c in ((-.10, 1.30, '#e9c64a'), (.105, 1.13, '#e9c64a'), (-.085, 1.06, '#e8e3d6')):   # print blocks
        f.poly([(x - .026, z), (x, z + .030), (x + .026, z), (x, z - .030)], c, off=.003, depth=.012)
    camera(f)
    f.tband(.99, 1.03, '#31598a', off=.004, mid=False)                                           # belt bag
    f.tbox(.075, .985, (.130, .050, .078), '#31598a', off=.024, bevel=.012, rz=10, solid=True)
    hd = Head(f)
    hd.face()
    hd.hair('under')
    hd.glasses('specs', frame='#22201f', lens=('gloss', '#3a4a44'))
    hd.brim_hat('hat', band='#31598a', brim=(.128, .138, .130), crown=.082, curl=0, tilt=3, pinch=False, slope=.022, n=12)
    return f, hd


@person
def jogger():
    f = Figure('jogger', 'm', 1.78, girth=.95, palette=P('brown', 'black', '#e9c64a', '#31598a', '#efece6', hat='#d8503c'))
    f.zones = [(Z_CROTCH, .96, 'pants', 0.006), (.96, Z_TOP, 'shirt', 0.006)]
    f.neck_spec = 'skin'
    f.arms('cap', 'shirt')
    f.legs('shorts', short=.70, off=.012, sock=BONE, sock_z=.27, bands=[(.25, .23, '#d8503c'), (.215, .195, '#31598a')])
    f.leg_stripe(BONE, width=.026, z0=.88, z1=.705)
    f.shoes('sneaker', sole='#d9d5cc', trim='#d8503c')
    collar(f, BONE, 'crew')
    stripes(f, [1.33], BONE, h=.03)
    stripes(f, [1.29], '#d8503c', h=.03)
    f.tband(.955, .985, BONE, off=.004, mid=False)                                               # waistband
    wrist(f, '#d8503c', z0=.965, z1=.925, off=.007)
    hd = Head(f)
    hd.face()
    hd.hair('quiff')
    hd.beard(full=False)
    hd.headband('hat')
    return f, hd

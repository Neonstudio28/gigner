"""The townsfolk roster: one function per person. Each returns (Figure, Head) ready to build. See people.py."""
from people_geo import *
from people_body import *
from people_head import Head
from people_wear import *

SKIN = {'pale': '#ecc4a6', 'light': '#e0ac8a', 'tan': '#c98f6b', 'brown': '#96623f', 'dark': '#6e4731'}
HAIR = {'black': '#1f1a17', 'dark': '#3b2a1e', 'brown': '#6a4528', 'blond': '#c9a45c', 'red': '#9a4a26', 'grey': '#9c9a96',
        'white': '#dcdad4', 'sand': '#a8824e'}
SUIT = [(Z_CROTCH, .85, 'pants', 0.0), (.85, Z_TOP, 'jacket', .014)]
CAST = {}


def person(fn):
    CAST[fn.__name__] = fn
    return fn


def P(skin, hair, shirt='#c8ccd2', pants='#3b4759', shoes='#2a2420', **kw):
    return dict(skin=SKIN[skin], hair=HAIR[hair], shirt=shirt, pants=pants, shoes=shoes, **kw)


def deputy(name, sex, h, pal, hair, long_sleeves):
    f = Figure(name, sex, h, girth=1.04 if sex == 'm' else 1.0, palette=pal, vary=['skin', 'hair'])
    f.arms('long' if long_sleeves else 'short', 'shirt', cuff='shirt' if long_sleeves else None)
    f.legs('trousers', hem=.06)
    f.leg_stripe('#b7995f', width=.020)
    f.shoes('boot', sole=DARK, trim='#3a3a3a')
    collar(f, 'shirt', 'shirt')
    tie(f, '#3a3327', z_end=1.16, w=.026)
    placket(f, 'shirt', z0=1.05, z1=1.42, buttons=0)
    for sg in (-1, 1):
        chest_pocket(f, sg, 'shirt', z=1.30, button=GOLD)
    badge(f, .088, 1.375, .026, GOLD, off=.012)
    name_tag(f, -1, 1.372, GOLD)
    epaulettes(f, 'shirt')
    shoulder_patch(f, '#4a5a3a')
    belt(f, '#1f1c1a', GOLD, z=1.02, h=.044, bw=.046)
    side_box(f, -1, .955, (.050, .085, .150), '#1f1c1a', out=.004)      # holster
    f.P['trunk'].box(V(-(f.trow(1.0)[0] + .028), .012, 1.035), (.034, .040, .060), '#3a2a20')   # grip
    side_box(f, 1, .985, (.040, .070, .090), '#26272a', out=.002)       # radio
    f.P['trunk'].box(V(f.trow(1.0)[0] + .016, .02, 1.07), (.008, .008, .08), '#26272a')
    hd = Head(f)
    hd.face()
    hd.hair(hair)
    hd.brim_hat('hat', band='#3b2a1e', badge=GOLD, brim=(.170, .192, .182), crown=.118)
    return f, hd


@person
def sheriff_deputy_m():
    f, hd = deputy('sheriff_deputy_m', 'm', 1.83, P('light', 'brown', '#c4aa7a', '#3b4038', '#1c1b1b', hat='#8b6f4a'), 'under', False)
    hd.beard(full=False)
    watch(f)
    return f, hd


@person
def sheriff_deputy_f():
    return deputy('sheriff_deputy_f', 'f', 1.72, P('tan', 'dark', '#c4aa7a', '#3b4038', '#1c1b1b', hat='#8b6f4a'), 'under_long', True)


def suit(name, sex, h, pal, girth=1.0, belly=0.0, tie_col='#7c2b2b', breast=None, button='#22201f', vary=None):
    f = Figure(name, sex, h, girth=girth, belly=belly, palette=pal, vary=vary)
    f.zones = list(SUIT)
    f.arms('long', 'jacket', off=.009, cuff='shirt')
    f.legs('trousers', hem=.055)
    f.shoes('shoe')
    collar(f, 'shirt', 'shirt', off=.004)
    jacket_front(f, 'jacket', 'shirt', breast=breast, button=button)
    if tie_col:
        tie(f, tie_col, z_end=1.15, off=.008)
    return f


@person
def agent_m():
    f = suit('agent_m', 'm', 1.84, P('light', 'dark', '#eceae4', '#24272c', '#151515', jacket='#24272c'), tie_col='#131417',
             vary=['skin', 'hair'])
    hd = Head(f)
    hd.face()
    hd.hair('crop')
    hd.glasses('sun')
    hd.p.tube([hd.hs(96, .15, .012), hd.hs(100, .10, .014), hd.hs(110, .04, .0)], [.004] * 3, BONE, n=4, xf=hd.m)   # earpiece
    return f, hd


@person
def agent_f():
    f = suit('agent_f', 'f', 1.74, P('brown', 'black', '#eceae4', '#24272c', '#151515', jacket='#24272c'), tie_col='#131417',
             vary=['skin', 'hair'])
    hd = Head(f)
    hd.face()
    hd.hair('bun')
    hd.glasses('sun')
    return f, hd


@person
def businessman():
    f = suit('businessman', 'm', 1.79, P('light', 'grey', '#e9eef2', '#6f7378', '#3b2a20', jacket='#6f7378'), girth=1.06, belly=.03,
             tie_col='#8c2f2c', breast=BONE)
    watch(f, GOLD)
    hd = Head(f)
    hd.face()
    hd.hair('thin')
    hd.glasses('specs', frame='#5a4632')
    return f, hd


@person
def businesswoman():
    f = Figure('businesswoman', 'f', 1.70, palette=P('pale', 'blond', '#f0e9dc', '#5b2f45', '#2a1f22', jacket='#5b2f45'))
    f.zones = [(Z_CROTCH, .90, 'pants', 0.0), (.90, Z_TOP, 'jacket', .013)]
    f.arms('long', 'jacket', off=.008, cuff='shirt')
    f.legs('bare', leg='#c9a58c')
    f.skirt(skirt_prof(f, .47, flare=.0, tight=.004), 'pants', hem=.47)
    f.shoes('pump')
    collar(f, 'shirt', 'open', off=.004)
    jacket_front(f, 'jacket', 'shirt', zb=1.10, wt=.052, lap=.040, buttons=1, button=GOLD)
    epaulettes(f, 'jacket')
    hd = Head(f)
    hd.face()
    hd.hair('bob')
    for sg in (-1, 1):
        hd.p.ball(hd.hs(sg * 88, .118, .012), .010, GOLD, n=6, xf=hd.m)
    return f, hd

"""Builds one boxy character from a spec: legs, torso, arms, head, hair, hat, clothes and accessories."""
from npc_geo import Body
from npc_rig import BONES

DARK = '#1c1a19'


def build(spec):
    b = Body(list(BONES))
    g = spec.get
    f = g('sex', 'm') == 'f'
    skin = ('skin', g('skin', '#e0ac86'))
    shirt = ('shirt', g('shirt', '#f1efe9'))
    pants = ('pants', g('pants', '#23242a'))
    shoes = ('shoes', g('shoes', '#2a2420'))
    sw = g('shoulders', 0.50 if f else 0.56)      # shoulder width
    ww = g('waist', 0.42 if f else 0.50)          # waist width
    dd = g('depth', 0.25 if f else 0.28)          # torso depth
    ax = 0.34                                      # arm centre
    aw = 0.13 if f else 0.15
    lw = 0.19 if f else 0.215
    # ---- legs and feet -------------------------------------------------------------------------------
    bottom = g('bottom', 'trousers')
    leg = pants if bottom in ('trousers', 'jeans') else skin
    flare = (1.0, 1.0) if bottom not in ('trousers', 'jeans') else (0.9, 0.92)
    b.box('thigh.L', pants if bottom != 'skirt' else skin, (lw, 0.23, 0.44), (0.115, 0, 0.71), top=(1.04, 1.04), mirror=True)
    b.box('shin.L', leg, (lw + (0.02 if flare[0] < 1 else -0.03), 0.25 if flare[0] < 1 else 0.19, 0.42), (0.115, 0, 0.30), top=flare, mirror=True)
    if bottom == 'shorts':
        b.box('thigh.L', pants, (lw + 0.02, 0.25, 0.26), (0.115, 0, 0.80), mirror=True)
    kind = g('shoe', 'shoe')
    sh = 0.13 if kind == 'boot' else 0.11
    b.box('foot.L', shoes, (lw + 0.005, 0.33, sh), (0.115, -0.045, sh / 2), top=(0.96, 0.9), shift=(0, 0.012), mirror=True)
    if kind == 'sneaker':
        b.box('foot.L', '#e9e6df', (lw + 0.012, 0.335, 0.035), (0.115, -0.045, 0.0175), bev=0.004, mirror=True)
    if kind == 'boot':
        b.box('shin.L', shoes, (lw + 0.012, 0.24, 0.16), (0.115, 0, 0.19), mirror=True)
    # ---- pelvis, belt, torso -------------------------------------------------------------------------
    b.box('hips', pants if bottom != 'skirt' else ('dress', g('dress', '#3b4f7a')), (ww, dd - 0.02, 0.20), (0, 0, 0.93))
    if bottom == 'skirt' and g('top') != 'dress':
        # the skirt rides on the thighs so it folds with them when its wearer sits down
        b.box('thigh.L', ('dress', g('dress', '#3b4f7a')), (ww / 2 + 0.03, dd + 0.035, 0.40), (ww / 4 + 0.012, 0, 0.74), top=(0.9, 0.9), bev=0.01, mirror=True)
    top = g('top', 'shirt')
    body = ('jacket', g('jacket', '#30343c')) if top in ('suit', 'jacket', 'vest_puffy') else ('dress', g('dress', '#b33a3a')) if top == 'dress' else shirt
    b.box('spine', body, (ww, dd, 0.25), (0, 0, 1.135), top=((ww + sw) / 2 / ww, 1.0))
    b.box('chest', body, ((ww + sw) / 2, dd, 0.27), (0, 0, 1.375), top=(sw / ((ww + sw) / 2), 0.96))
    if g('belly'):
        b.box('spine', body, (ww + 0.004, 0.1, 0.32), (0, -dd / 2 + 0.0, 1.16), top=(1.0, 0.3), shift=(0, 0.035), bev=0.02)
    if f and top != 'suit':
        b.box('chest', body, (sw * 0.9, 0.065, 0.15), (0, -dd / 2 + 0.01, 1.355), top=(1.0, 0.3), shift=(0, 0.022), bev=0.016)
    if top == 'dress':
        b.box('thigh.L', body, (ww / 2 + 0.035, dd + 0.045, 0.46), (ww / 4 + 0.014, 0, 0.77), top=(0.88, 0.88), bev=0.01, mirror=True)
    if g('belt', top not in ('dress', 'overalls', 'coverall', 'cassock')):
        b.box('hips', g('belt_c', '#5b4632'), (ww + 0.012, dd - 0.005, 0.045), (0, 0, 1.025), bev=0.004)
        b.box('hips', g('buckle', '#c9b26a'), (0.06, 0.02, 0.05), (0, -dd / 2 + 0.008, 1.025), bev=0.004)
    # ---- neck, collar, arms --------------------------------------------------------------------------
    b.box('neck', skin, (0.14, 0.14, 0.09), (0, 0, 1.53))
    if top in ('shirt', 'uniform', 'suit', 'flannel', 'polo'):
        b.box('chest', shirt, (0.21, 0.19, 0.04), (0, 0, 1.512), top=(1.12, 1.1), bev=0.006)
    sleeve = g('sleeve', 'long' if top in ('suit', 'jacket', 'flannel', 'hoodie', 'coverall', 'cassock') else 'short')
    arm_c = body if top not in ('vest_puffy', 'tank', 'overalls_bare') else (skin if top == 'tank' else shirt)
    b.box('upper_arm.L', arm_c if sleeve != 'none' else skin, (aw, aw + 0.015, 0.30), (ax, 0, 1.31), top=(1.06, 1.06), mirror=True)
    b.box('chest', arm_c if sleeve != 'none' else skin, (0.12, aw + 0.03, 0.10), (sw / 2 + 0.02, 0, 1.44), bev=0.02, mirror=False)
    b.box('chest', arm_c if sleeve != 'none' else skin, (0.12, aw + 0.03, 0.10), (-sw / 2 - 0.02, 0, 1.44), bev=0.02)
    b.box('forearm.L', arm_c if sleeve == 'long' else skin, (aw - 0.01, aw, 0.28), (ax, 0, 1.035), top=(1.05, 1.05), mirror=True)
    if sleeve == 'long' and top in ('suit', 'uniform'):
        b.box('forearm.L', shirt, (aw, aw + 0.01, 0.03), (ax, 0, 0.905), bev=0.004, mirror=True)
    if sleeve == 'short':
        b.box('upper_arm.L', arm_c, (aw + 0.012, aw + 0.027, 0.035), (ax, 0, 1.18), bev=0.004, mirror=True)
    b.box('hand.L', skin, (0.085, 0.12, 0.13), (ax, -0.005, 0.83), top=(1.1, 1.0), mirror=True)
    b.box('hand.L', skin, (0.04, 0.05, 0.07), (ax - 0.01, -0.07, 0.85), bev=0.006, mirror=True)       # thumb
    return b, dict(skin=skin, shirt=shirt, pants=pants, body=body, sw=sw, ww=ww, dd=dd, f=f, ax=ax, aw=aw)

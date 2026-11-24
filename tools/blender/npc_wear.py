"""Clothing details and accessories for the boxy townsfolk: all boxes, each on the bone that carries it."""
DARK = '#1c1a19'


def wear(b, spec, ctx):
    g = spec.get
    sw, ww, dd, f = ctx['sw'], ctx['ww'], ctx['dd'], ctx['f']
    shirt, pants, body = ctx['shirt'], ctx['pants'], ctx['body']
    fy, by = -dd / 2, dd / 2
    top = g('top', 'shirt')
    has = lambda k: k in g('wear', ())
    if top in ('shirt', 'uniform', 'flannel'):                       # placket and buttons
        b.box('chest', body, (0.045, 0.012, 0.25), (0, fy - 0.004, 1.37), bev=0.003)
        b.box('spine', body, (0.045, 0.012, 0.23), (0, fy - 0.004, 1.14), bev=0.003)
        for z in (1.12, 1.2):
            b.box('spine', '#d8d4c8', (0.016, 0.01, 0.016), (0, fy - 0.011, z), bev=0.002)
    if top == 'suit':                                                # shirt front, lapels, buttons
        b.box('chest', shirt, (0.13, 0.014, 0.24), (0, fy - 0.004, 1.385), top=(1.5, 1), bev=0.003)
        for sx in (-1, 1):
            b.box('chest', body, (0.075, 0.02, 0.26), (sx * 0.085, fy - 0.01, 1.375), rot=(0, sx * 14, 0), top=(1.2, 1), bev=0.005)
        for z in (1.1, 1.18):
            b.box('spine', DARK, (0.02, 0.012, 0.02), (0.02, fy - 0.006, z), bev=0.003)
        b.box('hips', body, (ww + 0.02, dd + 0.02, 0.12), (0, 0, 0.99), top=(0.98, 0.98))
    if top == 'flannel':                                             # check: dark bands across body and sleeves
        for z in (1.1, 1.22, 1.34, 1.45):
            b.box('chest' if z > 1.25 else 'spine', g('check', '#2a2422'), (sw * (0.9 if z < 1.3 else 1.0) + 0.006, dd + 0.006, 0.018), (0, 0, z), bev=0.002)
        for sx in (-1, 1):
            b.box('chest', g('check', '#2a2422'), (0.018, dd + 0.006, 0.44), (sx * 0.13, 0, 1.26), bev=0.002)
    if top in ('hoodie',):
        b.box('chest', body, (0.34, 0.16, 0.12), (0, by - 0.02, 1.47), rot=(-20, 0, 0), bev=0.03)            # hood
        b.box('spine', body, (0.28, 0.02, 0.11), (0, fy - 0.008, 1.12), top=(0.8, 1), bev=0.006)             # pocket
        for sx in (-1, 1):
            b.box('chest', '#e8e4da', (0.012, 0.012, 0.11), (sx * 0.04, fy - 0.008, 1.42), bev=0.002)
    if top == 'vest_puffy':
        for z in (1.08, 1.2, 1.32, 1.44):
            b.box('chest' if z > 1.25 else 'spine', body, (sw * 0.94 + 0.03, dd + 0.035, 0.1), (0, 0, z), bev=0.025)
    if top in ('overalls', 'coverall'):
        oc = ('pants', g('pants', '#3f5f86'))
        if top == 'overalls':
            b.box('chest', oc, (0.26, 0.016, 0.2), (0, fy - 0.006, 1.31), top=(0.85, 1), bev=0.004)          # bib
            b.box('spine', oc, (ww + 0.012, dd + 0.012, 0.2), (0, 0, 1.1), bev=0.01)
            b.box('chest', oc, (0.1, 0.012, 0.07), (0, fy - 0.016, 1.31), bev=0.003)                         # bib pocket
            for sx in (-1, 1):
                b.box('chest', oc, (0.045, dd + 0.03, 0.03), (sx * 0.12, 0, 1.505), bev=0.004)               # straps
                b.box('chest', oc, (0.045, 0.014, 0.13), (sx * 0.115, fy - 0.006, 1.45), bev=0.003)
                b.box('chest', oc, (0.045, 0.014, 0.3), (sx * 0.1, by + 0.006, 1.37), rot=(0, sx * 12, 0), bev=0.003)
                b.box('chest', '#c9b26a', (0.03, 0.01, 0.03), (sx * 0.115, fy - 0.014, 1.395), bev=0.003)
        else:
            b.box('chest', DARK, (0.014, 0.012, 0.46), (0, fy - 0.004, 1.27), bev=0.002)                     # zip
            b.box('chest', g('patch', '#f1efe9'), (0.1, 0.012, 0.045), (0.13, fy - 0.004, 1.4), bev=0.003)
    if g('tie'):
        b.box('chest', g('tie'), (0.06, 0.02, 0.05), (0, fy - 0.014, 1.475), top=(1.2, 1), bev=0.005)         # knot
        b.box('chest', g('tie'), (0.065, 0.014, 0.2), (0, fy - 0.012, 1.35), top=(0.75, 1), bev=0.004)
        b.box('spine', g('tie'), (0.065, 0.014, 0.13), (0, fy - 0.012, 1.19), top=(1.0, 1), bev=0.004)
        b.box('spine', g('tie'), (0.065, 0.014, 0.05), (0, fy - 0.012, 1.1), top=(1.0, 1), rot=(0, 45, 0), bev=0.004)
    if has('badge'):
        b.box('chest', '#d4b24a', (0.055, 0.014, 0.065), (0.14, fy - 0.006, 1.4), top=(1.0, 1), rot=(0, 45, 0), bev=0.006)
        b.box('chest', body, (0.11, 0.012, 0.085), (-0.14, fy - 0.004, 1.38), bev=0.004)                     # pocket
        b.box('chest', body, (0.115, 0.016, 0.03), (-0.14, fy - 0.007, 1.42), bev=0.004)
        for sx in (-1, 1):
            b.box('upper_arm.L' if sx > 0 else 'upper_arm.R', g('patch', '#3d5a3a'), (0.012, 0.09, 0.09), (sx * (0.34 + ctx['aw'] / 2 + 0.004), 0, 1.36), bev=0.004)
    if has('suspenders') or has('holster'):
        c = g('strap', '#b08a5a')
        for sx in (-1, 1):
            b.box('chest', c, (0.04, 0.014, 0.26), (sx * 0.13, fy - 0.006, 1.38), bev=0.003)
            b.box('spine', c, (0.04, 0.014, 0.24), (sx * 0.13, fy - 0.006, 1.14), bev=0.003)
            b.box('chest', c, (0.04, dd + 0.02, 0.02), (sx * 0.13, 0, 1.512), bev=0.003)
            b.box('chest', c, (0.04, 0.014, 0.3), (sx * 0.085, by + 0.006, 1.37), rot=(0, sx * 18, 0), bev=0.003)
        b.box('spine', c, (0.04, 0.014, 0.25), (0, by + 0.006, 1.13), bev=0.003)
    if has('holster'):
        b.box('chest', '#6b4a2e', (0.05, 0.11, 0.17), (-sw / 2 + 0.03, fy + 0.03, 1.24), rot=(0, 0, 0), bev=0.01)
        b.box('chest', DARK, (0.03, 0.06, 0.07), (-sw / 2 + 0.03, fy + 0.0, 1.34), bev=0.006)
    if has('gunbelt'):
        b.box('hips', DARK, (ww + 0.03, dd + 0.01, 0.06), (0, 0, 0.98), bev=0.006)
        b.box('hips', DARK, (0.06, 0.12, 0.2), (-ww / 2 - 0.03, -0.01, 0.9), bev=0.012)                      # holster
        b.box('hips', '#3a3a3c', (0.035, 0.05, 0.08), (-ww / 2 - 0.03, -0.02, 1.02), bev=0.006)
        b.box('hips', DARK, (0.05, 0.09, 0.1), (ww / 2 + 0.025, 0.02, 0.95), bev=0.01)                       # pouch
        b.box('hips', DARK, (0.07, 0.045, 0.13), (0.14, fy - 0.01, 0.97), bev=0.008)                         # radio
    if has('hivis'):
        v = '#e8b21c'
        b.box('chest', v, (sw * 0.96 + 0.02, dd + 0.03, 0.26), (0, 0, 1.37), bev=0.012)
        b.box('spine', v, (sw * 0.9 + 0.02, dd + 0.03, 0.2), (0, 0, 1.15), bev=0.012)
        for z, bone in ((1.3, 'chest'), (1.12, 'spine')):
            b.box(bone, '#d8d8d2', (sw * 0.94 + 0.03, dd + 0.04, 0.035), (0, 0, z), bev=0.004)
    if has('apron'):
        a = g('apron', '#f1efe9')
        b.box('spine', a, (ww * 0.86, 0.014, 0.25), (0, fy - 0.006, 1.13), bev=0.004)
        b.box('hips', a, (ww * 0.9, 0.014, 0.42), (0, fy - 0.0, 0.82), bev=0.004)
        b.box('chest', a, (0.24, 0.014, 0.2), (0, fy - 0.006, 1.34), top=(0.8, 1), bev=0.004)
        b.box('hips', a, (ww + 0.02, dd + 0.01, 0.03), (0, 0, 1.03), bev=0.004)
    if has('nametag'):
        b.box('chest', '#f1efe9', (0.07, 0.012, 0.025), (0.13, fy - 0.006, 1.42), bev=0.003)
    if has('collar'):                                                # clerical collar
        b.box('chest', '#f4f2ee', (0.06, 0.02, 0.03), (0, -0.085, 1.515), bev=0.003)
    if has('camera'):
        b.box('chest', DARK, (0.014, dd + 0.03, 0.02), (0.09, 0, 1.512), bev=0.002)
        for sx in (-1, 1):
            b.box('chest', DARK, (0.014, 0.012, 0.24), (sx * 0.06, fy - 0.006, 1.39), rot=(0, sx * -10, 0), bev=0.002)
        b.box('chest', '#2a2a2c', (0.13, 0.06, 0.085), (0, fy - 0.03, 1.25), bev=0.008)
        b.box('chest', '#55585c', (0.055, 0.04, 0.055), (0, fy - 0.075, 1.25), bev=0.01)
    if has('backpack'):
        b.box('chest', g('pack', '#7a3b33'), (0.32, 0.15, 0.4), (0, by + 0.07, 1.28), top=(0.9, 0.8), bev=0.03)
        b.box('chest', g('pack', '#7a3b33'), (0.2, 0.05, 0.14), (0, by + 0.16, 1.2), bev=0.015)
        for sx in (-1, 1):
            b.box('chest', DARK, (0.045, 0.014, 0.28), (sx * 0.15, fy - 0.006, 1.37), bev=0.003)
    if has('watch'):
        b.box('forearm.L', DARK, (ctx['aw'] + 0.006, ctx['aw'] + 0.016, 0.03), (0.34, 0, 0.93), bev=0.004)
    if has('gloves'):
        b.box('hand.L', g('glove', '#c9a24a'), (0.095, 0.13, 0.14), (0.34, -0.005, 0.83), mirror=True)
    if has('scarf'):
        b.box('neck', g('scarf', '#b33a3a'), (0.24, 0.22, 0.07), (0, 0, 1.52), bev=0.02)
        b.box('chest', g('scarf', '#b33a3a'), (0.07, 0.03, 0.2), (0.06, fy - 0.012, 1.4), bev=0.008)
    if has('kneepads'):
        b.box('shin.L', DARK, (0.2, 0.05, 0.12), (0.115, -0.12, 0.5), bev=0.012, mirror=True)
    if has('pocket'):
        b.box('chest', body, (0.1, 0.012, 0.09), (0.14, fy - 0.004, 1.38), bev=0.004)
    if has('purse'):
        b.box('chest', g('purse', '#6b3a2a'), (0.02, 0.02, 0.5), (sw / 2 - 0.05, fy - 0.012, 1.26), rot=(0, 38, 0), bev=0.003)
        b.box('hips', g('purse', '#6b3a2a'), (0.07, 0.2, 0.15), (ww / 2 + 0.05, 0, 0.98), bev=0.012)

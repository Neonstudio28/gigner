"""Heads for the boxy townsfolk: face, ears, hair blocks, facial hair, glasses and hats. All on the 'head' bone."""
DARK = '#1c1a19'
HZ = 1.70       # centre of the head box
HW, HD, HH = 0.30, 0.30, 0.32


def head(b, spec, ctx):
    g = spec.get
    skin, f = ctx['skin'], ctx['f']
    hair = ('hair', g('hair', '#4a3424'))
    H = 'head'
    fy = -HD / 2                                   # the face plane
    b.box(H, skin, (HW, HD, HH), (0, 0, HZ), top=(1.0, 1.0), bev=0.022)
    b.box(H, skin, (0.035, 0.07, 0.09), (HW / 2 + 0.008, 0.01, HZ - 0.01), bev=0.008, mirror=False)      # ears
    b.box(H, skin, (0.035, 0.07, 0.09), (-HW / 2 - 0.008, 0.01, HZ - 0.01), bev=0.008)
    b.box(H, skin, (0.05, 0.05, 0.085), (0, fy - 0.014, HZ - 0.035), top=(0.7, 0.4), shift=(0, 0.016), bev=0.006)   # nose
    for sx in (-1, 1):
        b.box(H, '#f4f1ea', (0.062, 0.012, 0.036), (sx * 0.075, fy - 0.002, HZ + 0.03), bev=0.003)       # eye white
        b.box(H, DARK, (0.03, 0.014, 0.036), (sx * 0.07, fy - 0.004, HZ + 0.03), bev=0.003)              # pupil
        b.box(H, hair if g('brows', True) else skin, (0.075, 0.016, 0.02), (sx * 0.075, fy - 0.004, HZ + 0.068),
              rot=(0, sx * g('brow_tilt', 6), 0), bev=0.003)
    b.box(H, g('lips', '#8a4a40' if not f else '#b0443f'), (0.085 if not f else 0.07, 0.012, 0.016 if not f else 0.024), (0, fy - 0.002, HZ - 0.105), bev=0.003)
    # ---- facial hair ---------------------------------------------------------------------------------
    fh = g('facial')
    if fh in ('moustache', 'full'):
        b.box(H, hair, (0.12, 0.03, 0.035), (0, fy - 0.012, HZ - 0.082), top=(0.8, 1), bev=0.006)
    if fh in ('beard', 'full'):
        b.box(H, hair, (HW + 0.012, 0.09, 0.12), (0, fy + 0.04, HZ - 0.115), top=(1.0, 1.0), bev=0.012)
        b.box(H, hair, (0.2, 0.05, 0.07), (0, fy - 0.005, HZ - 0.17), top=(1.15, 1), bev=0.01)
    if fh == 'stubble':
        b.box(H, '#9c8272', (HW + 0.004, 0.2, 0.09), (0, fy + 0.098, HZ - 0.117), bev=0.012)
    # ---- hair ----------------------------------------------------------------------------------------
    st = g('style', 'short')
    top_z = HZ + HH / 2
    if st != 'bald':
        if st != 'balding':
            b.box(H, hair, (HW + 0.03, HD + 0.03, 0.085), (0, 0.008, top_z + 0.012), top=(0.9, 0.9), bev=0.02)   # cap of hair
        b.box(H, hair, (HW + 0.03, 0.10, 0.20), (0, HD / 2 - 0.03, HZ + 0.05), bev=0.016)                # back of the head
        for sx in (-1, 1):
            b.box(H, hair, (0.03, 0.17, 0.12), (sx * (HW / 2 + 0.006), 0.045, HZ + 0.09), bev=0.008)     # sides
    if st in ('short', 'side_part'):
        b.box(H, hair, (HW + 0.02, 0.07, 0.05), (0.0, fy + 0.02, top_z - 0.012), rot=(12, 0, 0), bev=0.012)   # fringe
        if st == 'side_part':
            b.box(H, hair, (0.20, 0.16, 0.05), (0.06, -0.04, top_z + 0.05), rot=(6, 14, 0), bev=0.014)
    if st == 'flat_top':
        b.box(H, hair, (HW + 0.01, HD + 0.01, 0.06), (0, 0, top_z + 0.06), top=(1.04, 1.04), bev=0.008)
    if st == 'quiff':
        b.box(H, hair, (0.24, 0.14, 0.10), (0, -0.07, top_z + 0.055), rot=(-18, 0, 0), bev=0.02)
        b.box(H, hair, (0.26, 0.16, 0.07), (0, 0.06, top_z + 0.045), bev=0.02)
    if st == 'afro':
        b.box(H, hair, (HW + 0.12, HD + 0.10, 0.20), (0, 0.02, top_z + 0.045), top=(0.82, 0.82), bev=0.045)
        b.box(H, hair, (HW + 0.10, 0.12, 0.2), (0, HD / 2 - 0.0, HZ + 0.02), bev=0.03)
    if st in ('long', 'bob', 'ponytail', 'bun', 'mullet'):
        b.box(H, hair, (HW + 0.04, 0.09, 0.06), (0, fy + 0.025, top_z - 0.02), rot=(14, 0, 0), bev=0.012)       # fringe
        drop = {'long': 0.34, 'bob': 0.20, 'ponytail': 0.10, 'bun': 0.08, 'mullet': 0.22}[st]
        b.box(H, hair, (HW + 0.045 if st != 'mullet' else 0.24, 0.11, drop), (0, HD / 2 - 0.015, HZ - 0.03 - drop / 2 + 0.06), top=(1.0, 1.0), bev=0.018)
        if st in ('long', 'bob'):
            for sx in (-1, 1):
                b.box(H, hair, (0.045, 0.2, drop + 0.02), (sx * (HW / 2 + 0.012), 0.055, HZ + 0.07 - drop / 2), bev=0.01)
        if st == 'ponytail':
            b.box(H, hair, (0.09, 0.09, 0.26), (0, HD / 2 + 0.07, HZ - 0.02), rot=(-16, 0, 0), top=(1.5, 1.5), bev=0.016)
        if st == 'bun':
            b.box(H, hair, (0.13, 0.12, 0.12), (0, HD / 2 + 0.05, HZ + 0.11), bev=0.03)
    # ---- glasses -------------------------------------------------------------------------------------
    gl = g('glasses')
    if gl:
        lens = DARK if gl == 'shades' else '#cfe0e6'
        for sx in (-1, 1):
            b.box(H, DARK, (0.10, 0.012, 0.06), (sx * 0.076, fy - 0.014, HZ + 0.03), bev=0.004)
            b.box(H, lens, (0.082, 0.014, 0.042), (sx * 0.076, fy - 0.016, HZ + 0.03), bev=0.003)
            b.box(H, DARK, (0.012, 0.16, 0.014), (sx * (HW / 2 + 0.004), fy + 0.07, HZ + 0.04), bev=0.002)
        b.box(H, DARK, (0.06, 0.012, 0.012), (0, fy - 0.014, HZ + 0.042), bev=0.002)
    # ---- hats ----------------------------------------------------------------------------------------
    hat = g('hat')
    hc = ('hat', g('hat_c', '#3a5a8c'))
    if hat in ('cap', 'trucker'):
        b.box(H, hc, (HW + 0.045, HD + 0.045, 0.12), (0, 0.005, top_z + 0.03), top=(0.84, 0.84), bev=0.025)
        b.box(H, hc, (HW + 0.0, 0.17, 0.022), (0, fy - 0.075, top_z - 0.012), rot=(-8, 0, 0), top=(0.9, 1), bev=0.008)
        if hat == 'trucker':
            b.box(H, '#f1efe9', (0.2, 0.02, 0.09), (0, fy - 0.012, top_z + 0.035), rot=(-8, 0, 0), bev=0.006)
    if hat in ('cowboy', 'campaign', 'fedora'):
        w = {'cowboy': 0.66, 'campaign': 0.62, 'fedora': 0.5}[hat]
        b.box(H, hc, (w, w * 0.92, 0.025), (0, 0, top_z + 0.0), bev=0.008)
        b.box(H, hc, (HW + 0.03, HD + 0.03, 0.15), (0, 0, top_z + 0.085), top=(0.72, 0.6) if hat != 'campaign' else (0.5, 0.5), bev=0.02)
        b.box(H, g('band', '#2a221c'), (HW + 0.04, HD + 0.04, 0.03), (0, 0, top_z + 0.03), bev=0.004)
        if hat == 'cowboy':
            for sx in (-1, 1):
                b.box(H, hc, (0.12, w * 0.9, 0.025), (sx * (w / 2 - 0.05), 0, top_z + 0.03), rot=(0, sx * -32, 0), bev=0.008)
    if hat == 'hardhat':
        b.box(H, hc, (HW + 0.06, HD + 0.08, 0.13), (0, 0, top_z + 0.04), top=(0.78, 0.78), bev=0.03)
        b.box(H, hc, (HW + 0.09, HD + 0.16, 0.022), (0, -0.03, top_z - 0.015), bev=0.008)
        b.box(H, hc, (0.05, HD + 0.02, 0.03), (0, 0, top_z + 0.11), bev=0.01)
    if hat == 'beanie':
        b.box(H, hc, (HW + 0.045, HD + 0.045, 0.15), (0, 0.005, top_z + 0.03), top=(0.8, 0.8), bev=0.03)
        b.box(H, hc, (HW + 0.06, HD + 0.06, 0.045), (0, 0.005, top_z - 0.03), bev=0.01)
    if hat == 'chef':
        b.box(H, '#f4f2ee', (HW + 0.03, HD + 0.03, 0.07), (0, 0, top_z + 0.01), bev=0.008)
        b.box(H, '#f4f2ee', (HW + 0.08, HD + 0.08, 0.14), (0, 0, top_z + 0.11), top=(1.08, 1.08), bev=0.03)
    if hat == 'headband':
        b.box(H, hc, (HW + 0.05, HD + 0.05, 0.035), (0, 0.005, top_z - 0.05), bev=0.006)

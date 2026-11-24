"""Hand props, modelled where they sit on the REST pose (the engine re-parents each to its bone, so it follows the
hand). A hanging hand's forward (-Y) becomes up once the forearm is raised level: cups, rods and umbrellas use that."""
from npc_geo import Body

K = '#1c1a19'
R, L = -0.34, 0.34          # right and left hand x
HZ = 0.81                   # grip height on the rest pose


def props():
    out = {}

    def prop(name, bone):
        b = Body(['root'])
        out[name] = (b, bone)
        return lambda c, size, at, **kw: b.box('root', c, size, at, **kw)

    p = prop('briefcase', 'hand.R')
    p('#5a3a26', (0.09, 0.42, 0.3), (R, 0, HZ - 0.22), bev=0.015)
    p(K, (0.03, 0.12, 0.05), (R, 0, HZ - 0.045), bev=0.008)
    for y in (-0.12, 0.12):
        p('#c9b26a', (0.095, 0.035, 0.04), (R, y, HZ - 0.085), bev=0.004)
    p = prop('shopping_bag', 'hand.R')
    p('#b98a52', (0.13, 0.3, 0.34), (R, 0, HZ - 0.26), top=(1.15, 1.08), bev=0.01)
    p('#8a6236', (0.02, 0.14, 0.09), (R, 0, HZ - 0.05), bev=0.004)
    p('#5f8a3a', (0.06, 0.1, 0.1), (R, 0.05, HZ - 0.06), bev=0.02)
    p('#d8c9a0', (0.05, 0.05, 0.16), (R, -0.07, HZ - 0.04), rot=(12, 0, 0), bev=0.01)
    p = prop('coffee_cup', 'hand.R')
    p('#f1efe9', (0.075, 0.12, 0.075), (R + 0.02, -0.1, HZ), top=(1, 1), bev=0.012)
    p('#6b4a2e', (0.08, 0.02, 0.08), (R + 0.02, -0.165, HZ), bev=0.006)
    p('#b33a3a', (0.08, 0.045, 0.08), (R + 0.02, -0.1, HZ), bev=0.006)
    p = prop('phone', 'hand.L')
    p(K, (0.016, 0.075, 0.15), (L - 0.055, -0.01, HZ + 0.02), bev=0.005)
    p = prop('phone_r', 'hand.R')
    p(K, (0.016, 0.075, 0.15), (R + 0.055, -0.01, HZ + 0.02), bev=0.005)
    p = prop('cigarette', 'hand.R')
    p('#f1efe9', (0.012, 0.075, 0.012), (R + 0.03, 0.07, HZ + 0.03), bev=0.002)
    p('#d9843a', (0.013, 0.02, 0.013), (R + 0.03, 0.04, HZ + 0.03), bev=0.002)
    p = prop('broom', 'hand.R')
    p('#b08a5a', (0.035, 1.35, 0.035), (R, 0.38, HZ), bev=0.008)
    p('#7a3b33', (0.36, 0.07, 0.06), (R, 1.06, HZ), bev=0.01)
    p('#c9a94a', (0.34, 0.16, 0.045), (R, 1.17, HZ), top=(1, 1), bev=0.008)
    p = prop('rake', 'hand.R')
    p('#b08a5a', (0.035, 1.45, 0.035), (R, 0.42, HZ), bev=0.008)
    p('#4a4d52', (0.4, 0.035, 0.035), (R, 1.14, HZ), bev=0.006)
    for i in range(7):
        p('#4a4d52', (0.018, 0.02, 0.09), (R - 0.18 + i * 0.06, 1.14, HZ + 0.05), bev=0.003)
    p = prop('hammer', 'hand.R')
    p('#8a6236', (0.03, 0.3, 0.035), (R, -0.1, HZ), bev=0.006)
    p('#55585c', (0.04, 0.05, 0.12), (R, -0.25, HZ + 0.01), bev=0.008)
    p = prop('fishing_rod', 'hand.R')
    p(K, (0.03, 0.3, 0.03), (R, -0.05, HZ - 0.05), rot=(45, 0, 0), bev=0.006)
    p('#3a3a3c', (0.018, 2.0, 0.018), (R, -0.86, HZ - 0.86), rot=(45, 0, 0), bev=0.004)
    p('#8a8f96', (0.05, 0.07, 0.07), (R + 0.03, -0.14, HZ - 0.1), bev=0.012)
    p = prop('tray', 'hand.L')
    p('#6b4a2e', (0.42, 0.025, 0.3), (L - 0.06, -0.085, HZ + 0.04), bev=0.008)
    p('#f1efe9', (0.16, 0.02, 0.16), (L - 0.12, -0.105, HZ + 0.06), bev=0.02)
    p('#b33a3a', (0.07, 0.11, 0.07), (L + 0.05, -0.15, HZ), bev=0.01)
    p = prop('umbrella', 'hand.R')
    p(K, (0.022, 1.0, 0.022), (R + 0.02, -0.42, HZ), bev=0.004)
    p('#2a3a5c', (1.15, 0.2, 1.15), (R + 0.02, -0.86, HZ), bev=0.02)
    p('#2a3a5c', (0.8, 0.12, 0.8), (R + 0.02, -0.98, HZ), bev=0.03)
    p(K, (0.03, 0.04, 0.09), (R + 0.02, 0.06, HZ - 0.03), bev=0.006)
    # carried against the body with both hands: these ride on the chest
    p = prop('box', 'chest')
    p('#b98a52', (0.46, 0.34, 0.3), (0, -0.37, 1.2), bev=0.012)
    p('#d8c9a0', (0.47, 0.07, 0.012), (0, -0.37, 1.352), bev=0.003)
    p = prop('newspaper', 'chest')
    for sx in (-1, 1):
        p('#e8e4d8', (0.27, 0.012, 0.36), (sx * 0.135, -0.43, 1.2), rot=(-22, 0, sx * -14), bev=0.004)
    p = prop('clipboard', 'chest')
    p('#8a6236', (0.22, 0.014, 0.3), (0.06, -0.37, 1.16), rot=(-55, 0, 0), bev=0.006)
    p('#f1efe9', (0.19, 0.012, 0.26), (0.06, -0.375, 1.168), rot=(-55, 0, 0), bev=0.003)
    return out

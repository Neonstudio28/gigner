"""People family: rigid jointed townsfolk + hand-held extras.  blender -b -P tools/blender/people.py

Modules: people_geo (primitives), people_body (trunk, limbs, hands, shoes, skirts), people_head (heads, hair, hats),
people_wear (clothing details), people_cast / people_cast2 (the roster), people_props (extras), people_view (sheets).
Set PEOPLE_ONLY=name,name to build a subset while iterating and PEOPLE_FAST=1 to skip the slow preview sheets.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, math
from mathutils import Vector, Matrix
import lib
import people_view as pv
from people_geo import LABELS
from people_body import Z_HIP, Z_KNEE, Z_ELB, Z_NECK
from people_cast import CAST
import people_cast2  # noqa: F401  (registers the rest of the roster)
from people_props import PROPS

FAMILY = 'people'


def build():
    only = [n for n in os.environ.get('PEOPLE_ONLY', '').split(',') if n]
    people, props, extras, pal, grips = [], [], {}, {}, {}
    for name, fn in CAST.items():
        if only and name not in only:
            continue
        f, hd = fn()
        root = f.build()
        people.append(root)
        pal[name] = f.palette
        g = f.extra.get('grip_l', [0, 0, 0])
        grips[name] = g
        extras[name] = {'kind': 'person', 'height': round(f.height, 3), 'scale': round(f.s, 4), 'sex': f.sex,
                        'palette': {k: f.palette.get(k, LABELS[k]) for k in LABELS if k in f.palette},
                        'vary': f.vary if f.vary is not None else ['skin', 'hair', 'shirt', 'pants', 'shoes', 'jacket', 'hat', 'dress'],
                        # hand grip relative to the left forearm origin (mirror x for the right hand)
                        'grip': [round(g[0] - f.SH * f.s, 4), round(g[1], 4), round(g[2] - Z_ELB * f.s, 4)],
                        'seat': round((Z_HIP - 0.09) * f.s, 3)}
    for name, fn in PROPS.items():
        if only and name not in only:
            continue
        ob, ex = fn()
        props.append(ob)
        extras[name] = {'kind': 'prop', **ex}
    return people, props, extras, pal, grips


def tint(roots, pal):
    """Preview only: gives each person its own copies of the label materials in the palette colours."""
    for r in roots:
        p = pal[r.name]
        for o in [r, *r.children_recursive]:
            for i, m in enumerate(o.data.materials):
                lab = m.name.split('__')[-1]
                if m.name.startswith('paint__') and lab in p:
                    o.data.materials[i] = lib.mat(f'paint__pv_{r.name}_{lab}', p[lab])


def part(root, k):
    return bpy.data.objects[f'{root.name}.{k}']


def pose(root, kind):
    """Temporary preview poses. Rotation about X: negative swings a limb forward (towards -Y)."""
    rx = lambda k, deg: setattr(part(root, k), 'rotation_euler', (math.radians(deg), 0, 0))
    if kind == 'walk':
        for k, d in (('leg_l', -32), ('shin_l', 12), ('leg_r', 24), ('shin_r', 38), ('arm_l', 30), ('forearm_l', -14),
                     ('arm_r', -30), ('forearm_r', -34)):
            rx(k, d)
    elif kind == 'run':
        for k, d in (('leg_l', -58), ('shin_l', 60), ('leg_r', 34), ('shin_r', 70), ('arm_l', 50), ('forearm_l', -80),
                     ('arm_r', -55), ('forearm_r', -85)):
            rx(k, d)
    elif kind == 'sit':
        for k, d in (('leg_l', -90), ('shin_l', 90), ('leg_r', -90), ('shin_r', 90), ('arm_l', -28), ('forearm_l', -52),
                     ('arm_r', -28), ('forearm_r', -52)):
            rx(k, d)
        root.location.z = -(Z_HIP - Z_KNEE) * root['s']
    else:
        for c in root.children_recursive:
            c.rotation_euler = (0, 0, 0)
        root.location.z = 0


def previews(people, props, pal, grips):
    fast = os.environ.get('PEOPLE_FAST')
    tint(people, pal)
    every = people + props
    n = len(people)
    per = 10 if n > 12 else max(n, 1)
    rows = [people[i:i + per] for i in range(0, n, per)]
    S = 12 if fast else 24
    if people:
        for tag, turn in (('lineup_front', -12), ('lineup_back', 142)):
            pv.sheet(tag, [pv.strip(r, every, spacing=.78, turn=turn, zc=.93, width=max(per * .78 + .3, 7.9), res=(1920, 540), samples=S) for r in rows])
        pv.sheet('closeup', [pv.strip(r, every, spacing=.62, turn=-24, zc=1.36, width=max(per * .62 + .1, 6.3), res=(1920, 330), samples=S, elev=5)
                             for r in rows])
        pick = lambda names: [o for o in people if o.name in names] or people[:6]
        walk = pick(['sheriff_deputy_m', 'businesswoman', 'lumberjack', 'waitress', 'kid_m', 'jogger'])[:6]
        sit = pick(['agent_m', 'old_woman', 'cook', 'casual_f_1', 'teen_m', 'trucker'])[:6]
        strips = []
        for grp, kind, turn in ((walk, 'walk', -48), (sit, 'sit', -48), (walk[:3] + sit[:3], 'walk', 128), (sit[3:] + walk[3:], 'sit', 128)):
            for o in grp:
                pose(o, 'run' if kind == 'walk' and o.name == 'jogger' else kind)
            bpy.context.view_layer.update()
            strips.append(pv.strip(grp, every, spacing=1.05, turn=turn, zc=.86, width=6.6, res=(1920, 600), samples=S, elev=10))
            for o in grp:
                pose(o, 'rest')
        pv.sheet('poses', strips)
    if props:
        by = {o.name: o for o in every}
        low = {o.name: min(v.co.z for v in o.data.vertices) for o in props}
        for o in props:      # origins are at the grips: stand the props on the floor for their portraits
            o.location.z = -low[o.name]
        small = [by[n] for n in ('coffee_cup', 'newspaper', 'shopping_bag') if n in by]
        big = [by[n] for n in ('umbrella_closed', 'briefcase', 'guitar_case') if n in by]
        strips = [pv.strip(small, every, spacing=.55, turn=turn, zc=.17, width=1.75, res=(960, 540), samples=S, elev=22)
                  for turn in (-58, 122)]
        strips2 = [pv.strip(big, every, spacing=.95, turn=turn, zc=.33, width=3.3, res=(960, 540), samples=S, elev=14)
                   for turn in (-62, 118)]
        rows_ = [pv.np.concatenate(strips, axis=1), pv.np.concatenate(strips2, axis=1)]
        for o in props:
            o.location.z = 0
        # carried: each prop placed at the manifest grip of a figure's right hand
        carry = [(a, b) for a, b in (('businessman', 'briefcase'), ('casual_f_2', 'shopping_bag'), ('old_man', 'umbrella_closed'),
                                     ('teen_m', 'guitar_case'), ('agent_f', 'briefcase'), ('old_woman', 'shopping_bag'))
                 if a in by and b in by]
        if carry:
            for turn in (-38, 142):
                # a prop appears once per strip, so pair them up in two half strips
                halves = []
                for part_ in (carry[:3], carry[3:]):
                    if not part_:
                        continue
                    n_, sp = len(part_), 1.0
                    rz = Matrix.Rotation(math.radians(turn), 3, 'Z')
                    saved = []
                    for i, (a, b) in enumerate(part_):
                        g = Vector(grips[a])
                        saved.append((by[b], by[b].location.copy(), by[b].rotation_euler.copy()))
                        by[b].location = rz @ Vector((-g.x, g.y, g.z)) + Vector(((i - (n_ - 1) / 2) * sp, 0, 0))
                        by[b].rotation_euler = (0, 0, math.radians(turn))
                    halves.append(pv.strip([by[a] for a, _ in part_], every, spacing=sp, turn=turn, zc=.93, width=n_ * sp + .25,
                                           res=(int(1920 * n_ / len(carry)), 620), samples=S, show=[by[b] for _, b in part_]))
                    for o, loc, rot_ in saved:
                        o.location, o.rotation_euler = loc, rot_
                rows_.append(pv.np.concatenate(halves, axis=1))
        pv.sheet('props', rows_)


def main():
    lib.reset()
    people, props, extras, pal, grips = build()
    bpy.context.view_layer.update()
    man = lib.export(FAMILY, people + props, extras)
    for k, v in man.items():
        flag = '' if v.get('kind') == 'prop' or 1500 <= v['tris'] <= 3500 else '   <-- outside 1500-3500'
        print(f"  {k:20s} {v['tris']:5d} tris  size {v['size']}{flag}")
    print('[glb] %.2f MB' % (os.path.getsize(os.path.join(lib.MODELS, FAMILY + '.glb')) / 1e6))
    previews(people, props, pal, grips)


main()

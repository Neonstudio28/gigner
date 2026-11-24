"""Furniture family: `blender -b -P tools/blender/furniture.py` rebuilds furniture.glb, furniture.json and the
preview sheets. Development switches after `--`: --only a,b  --group living,shops  --fast  --noprev  --tag name."""
import sys, os, math, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, lib
import furniture_kit as kit

GROUPS = ('living', 'kitchen', 'bedbath', 'office', 'shops', 'diner', 'civic', 'garage')
for g in GROUPS:
    importlib.import_module('furniture_' + g)


def opt(args, name, default=None):
    return args[args.index(name) + 1].split(',') if name in args else default


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    only, groups, fast = opt(args, '--only'), opt(args, '--group'), '--fast' in args
    partial = bool(only or groups)
    lib.reset()
    kit.reset()
    objs, extras, grp = kit.build_all(only, groups)
    if not partial:
        man = lib.export('furniture', objs, extras)
        size = os.path.getsize(os.path.join(lib.MODELS, 'furniture.glb'))
        print(f'[furniture] {len(man)} assets, {size / 1e6:.2f} MB, max tris {max(m["tris"] for m in man.values())}')
    for o in objs:
        print(f'  {o.name:28s} {lib.tris(o) + sum(lib.tris(c) for c in o.children_recursive):6d} tris')
    if '--noprev' in args:
        return
    # lift wall and ceiling items so they stand on the preview floor
    for o in objs:
        if extras[o.name]['mount'] in ('wall', 'ceiling'):
            o.location.z = -lib.bounds(o)[0][2] + (0.25 if extras[o.name]['mount'] == 'wall' else 0.02)
    bpy.context.view_layer.update()
    kw = dict(res=(1280, 720), samples=10) if fast else {}
    tag = (opt(args, '--tag') or [None])[0]

    def shot(chunk, tag, **k):
        for o in objs:   # only the chunk being photographed is visible
            hide = o not in chunk
            o.hide_render = hide
            for c in o.children_recursive:
                c.hide_render = hide
        lib.preview('furniture', chunk, tag=tag, **{**kw, **k})

    if tag:
        shot(objs, tag)
    else:
        for g in GROUPS:
            mine = [o for o in objs if grp[o.name] == g]
            mine.sort(key=lambda o: max(lib.bounds(o)[1][i] - lib.bounds(o)[0][i] for i in range(3)))
            per = 6
            for i in range(0, len(mine), per):
                shot(mine[i:i + per], f'{g}_{i // per + 1:02d}', cols=3, gap=0.35)
    for o in objs:
        o.hide_render = False
        for c in o.children_recursive:
            c.hide_render = False
    for o in objs:
        o.location.z = 0.0


main()

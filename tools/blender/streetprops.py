"""Pine Hollow street, yard and lot props.  blender -b -P tools/blender/streetprops.py

Regenerates public/assets/models/streetprops.{glb,json} and tools/blender/previews/streetprops_*.jpg.
Development switches after `--`: --only <group,...> (preview only these groups), --names <a,b> (one wip sheet),
--noexport, --nopreview, --fast (low-res previews), --check (magenta back faces, previews go to --out), --out <dir>.
"""
import bpy, sys, os, math, importlib
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
import streetprops_kit as K
import streetprops_atlas

MODULES = ['streetprops_waste', 'streetprops_furniture', 'streetprops_furniture2', 'streetprops_road', 'streetprops_utility', 'streetprops_yard', 'streetprops_yard2',
           'streetprops_gas']


def _arg(argv, key, default=None):
    return argv[argv.index(key) + 1] if key in argv else default


def _dim(ob):
    lo, hi = lib.bounds(ob)
    return max(hi[i] - lo[i] for i in range(3))


def sheets(objs, per=12):
    """Splits a group into preview sheets of similar-sized assets, largest first."""
    objs = sorted(objs, key=lambda o: (-_dim(o), o.name))
    out, cur = [], []
    for o in objs:
        if cur and (len(cur) >= per or (len(cur) >= 4 and _dim(o) < 0.45 * _dim(cur[0]))):
            out.append(cur)
            cur = []
        cur.append(o)
    if cur:
        out.append(cur)
    return out


def shoot(objs, tag, fast=False):
    """lib.preview with the sheet scaled so small props still fill the frame (lib's camera never frames < 2 m)."""
    big = max(_dim(o) for o in objs)
    zoom = max(1.0, min(8.0, 1.1 / big))
    keep = set(objs) | {c for o in objs for c in o.children_recursive}
    for o in bpy.context.scene.objects:
        o.hide_render = o not in keep
    for o in objs:
        o.scale = (zoom,) * 3
    bpy.context.view_layer.update()
    for o in objs:                                   # wall-mounted assets hang below their origin: lift them onto the floor
        o.location.z = max(0.0, -lib.bounds(o)[0][2])
    bpy.context.view_layer.update()
    # lib frames on max(cols * cell_w, rows * cell_d * 1.5): keep the row count dominant so nothing is cut off at the sides
    size = [lib.bounds(o) for o in objs]
    gap = 0.3 * big * zoom
    cw = max(hi[0] - lo[0] for lo, hi in size) + gap
    cd = max(hi[1] - lo[1] for lo, hi in size) + gap
    cols = max(1, math.ceil(math.sqrt(len(objs) * 1.6)))
    while cols > 1 and math.ceil(len(objs) / cols) * cd * 1.5 < cols * cw * 1.12:
        cols -= 1
    lib.preview('streetprops', objs, tag=tag, cols=cols, gap=gap, res=(1280, 720) if fast else (1920, 1080),
                samples=8 if fast else 24)
    for o in objs:
        o.scale = (1, 1, 1)
        o.location.z = 0.0
    bpy.context.view_layer.update()


def mark_backfaces():
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
        src = out.inputs['Surface'].links[0].from_socket
        mix, geo, em = nt.nodes.new('ShaderNodeMixShader'), nt.nodes.new('ShaderNodeNewGeometry'), nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = (1, 0, 1, 1)
        em.inputs['Strength'].default_value = 3.0
        nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
        nt.links.new(src, mix.inputs[1])
        nt.links.new(em.outputs['Emission'], mix.inputs[2])
        nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    only, names, out = _arg(argv, '--only'), _arg(argv, '--names'), _arg(argv, '--out')
    fast = '--fast' in argv
    lib.reset()
    streetprops_atlas.build()
    here = os.path.dirname(os.path.abspath(__file__))
    for m in MODULES:
        if os.path.exists(os.path.join(here, m + '.py')):
            importlib.import_module(m)
    groups, extras, allobs = {}, {}, []
    for group, fn in K.REGISTRY:
        res = fn()
        for a in (res if isinstance(res, (list, tuple)) else [res]):
            ob = a.build()
            groups.setdefault(group, []).append(ob)
            allobs.append(ob)
            if a.extras:
                extras[a.name] = a.extras
    bpy.context.view_layer.update()
    # lib.bounds() places child boxes with the parent's matrix; assets with movable parts get their true box here
    # (extras are merged last into the manifest entry, so these replace lib's size/min)
    for ob in allobs:
        if ob.children_recursive:
            pts = [o.matrix_world @ Vector(c) for o in [ob, *ob.children_recursive] for c in o.bound_box]
            lo = [min(p[i] for p in pts) for i in range(3)]
            hi = [max(p[i] for p in pts) for i in range(3)]
            extras.setdefault(ob.name, {}).update(size=[round(hi[i] - lo[i], 3) for i in range(3)], min=[round(v, 3) for v in lo])
    for g, obs in groups.items():
        print(f'[{g}] {len(obs)} assets, {sum(lib.tris(o) + sum(lib.tris(c) for c in o.children_recursive) for o in obs)} tris')
        for o in obs:
            lo, hi = lib.bounds(o)
            t = lib.tris(o) + sum(lib.tris(c) for c in o.children_recursive)
            print(f'   {o.name:28s} {t:5d} tris  {hi[0] - lo[0]:.2f} x {hi[1] - lo[1]:.2f} x {hi[2] - lo[2]:.2f}  min {lo[0]:.2f} {lo[1]:.2f} {lo[2]:.3f}')
    if '--noexport' not in argv:
        lib.export('streetprops', allobs, extras)
        size = os.path.getsize(os.path.join(lib.MODELS, 'streetprops.glb'))
        print(f'[glb] {size / 1e6:.2f} MB')
    if '--nopreview' in argv:
        return
    if out:
        lib.PREVIEWS = out
    if '--check' in argv:
        mark_backfaces()
    if names:
        want = names.split(',')
        shoot([o for o in allobs if any(o.name.startswith(w) for w in want)], 'wip', fast)
        return
    for g, obs in groups.items():
        if only and g not in only.split(','):
            continue
        for i, sheet in enumerate(sheets(obs)):
            shoot(sheet, f'{g}_{i + 1}', fast)


main()

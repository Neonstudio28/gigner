"""Vegetation family: trees, shrubs, ground cover, crops, rocks, wood and distant mountains.

    blender -b -P tools/blender/vegetation.py [-- --no-preview | --only tag,tag | --fast]

Deterministic: every asset is generated from fixed seeds. Writes public/assets/models/vegetation.{glb,json}
and the preview sheets tools/blender/previews/vegetation_*.jpg. See CONTRACT.md; generators live in
vegetation_gen.py (shared shape language) and vegetation_*.py (one module per group).
"""
import sys, os, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
import lib

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = next((a.split('=', 1)[1].split(',') for a in ARGS if a.startswith('--only=')), None)
FAST = '--fast' in ARGS
GROUPS = [g for g in ('trees', 'plants', 'ground', 'rocks', 'distant')
          if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'vegetation_{g}.py'))]

lib.reset()
assets, extras, by_name = [], {}, {}


def reg(ob, ex):
    assets.append(ob)
    extras[ob.name] = ex
    by_name[ob.name] = ob


for g in GROUPS:
    importlib.import_module('vegetation_' + g).build(reg)


def check(ob):
    """Flags inside-out closed parts (negative volume islands) and stray loose geometry."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    seen, bad = set(), 0
    for f0 in bm.faces:
        if f0 in seen:
            continue
        stack, isl = [f0], []
        seen.add(f0)
        while stack:
            f = stack.pop()
            isl.append(f)
            for e in f.edges:
                for g2 in e.link_faces:
                    if g2 not in seen:
                        seen.add(g2)
                        stack.append(g2)
        if all(len(e.link_faces) == 2 for f in isl for e in f.edges):
            vol = 0.0
            for f in isl:
                vs = [v.co for v in f.verts]
                for i in range(1, len(vs) - 1):
                    vol += vs[0].dot(vs[i].cross(vs[i + 1]))
            bad += vol < 0
    loose = sum(1 for v in bm.verts if not v.link_faces)
    bm.free()
    if bad or loose:
        print(f'[check] {ob.name}: {bad} inverted islands, {loose} loose verts')


for a in assets:
    check(a)
manifest = lib.export('vegetation', assets, extras)
for n, m in manifest.items():
    print(f"  {n:24s} {m['tris']:6d} tris  {m['size']}")
print('[glb] %.2f MB' % (os.path.getsize(os.path.join(lib.MODELS, 'vegetation.glb')) / 1e6))

if '--no-preview' not in ARGS:
    import vegetation_sheets
    vegetation_sheets.render(by_name, extras, ONLY, FAST)

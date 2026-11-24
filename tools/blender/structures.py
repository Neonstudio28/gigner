"""
Structures family: landmarks, rooftop and wall gear, architectural detail parts, lot / farm / yard objects.

    blender -b -P tools/blender/structures.py              # rebuild everything: GLB, manifest, preview sheets
    blender -b -P tools/blender/structures.py -- only=roof,arch sheets=roof_a draft noprev   # while iterating

Conventions (see CONTRACT.md): front faces -Y; origin at the ground / roof plane / wall plane attachment centre.
Manifest extras: `mount` (ground | roof | wall); for signs `face` = [x, y, z, width, height] of the first blank
`paint__signface` panel and `faces` = every panel as [x, y, z, width, height, yaw] (yaw 0 faces -Y, 180 faces +Y).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, lib
import structures_kit as K

FAMILY = 'structures'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = dict(a.split('=', 1) if '=' in a else (a, '1') for a in argv)

lib.reset()
import structures_landmarks, structures_towers, structures_civic, structures_roof, structures_arch, structures_yard
MODS = {'landmarks': structures_landmarks, 'towers': structures_towers, 'civic': structures_civic, 'roof': structures_roof, 'arch': structures_arch, 'yard': structures_yard}
only = opt['only'].split(',') if 'only' in opt else list(MODS)
for name in only:
    MODS[name].build()

by_name = {a.name: a for a in K.ASSETS}
for a in K.ASSETS:
    bad = sum(K.check(o) for o in [a, *a.children_recursive])
    if bad:
        print(f'[check] {a.name}: {bad} open edges')
    print(f'[tris] {a.name:28s} {lib.tris(a) + sum(lib.tris(c) for c in a.children_recursive):6d}  {[round(v, 2) for v in a.dimensions]}')

if len(only) == len(MODS) or 'export' in opt:
    lib.export(FAMILY, K.ASSETS, K.EXTRAS)
    print('[glb] %.2f MB' % (os.path.getsize(os.path.join(lib.MODELS, FAMILY + '.glb')) / 1e6))

if 'noprev' not in opt:
    draft = 'draft' in opt
    res, samples = ((1280, 720), 10) if draft else ((1920, 1080), 24)
    want = opt['sheets'].split(',') if 'sheets' in opt else None
    for name in only:
        for tag, names, kind, kw in MODS[name].SHEETS:
            if want and tag not in want:
                continue
            objs = [by_name[n] for n in names if n in by_name]
            for a in K.ASSETS:      # only the sheet's assets are visible
                for o in (a, *a.children_recursive):
                    o.hide_render = a not in objs
            if kind == 'grid':
                lib.preview(FAMILY, objs, tag=tag, res=res, samples=samples, **kw)
            else:
                K.shot(FAMILY, tag, objs, res=res, samples=samples, **kw)
    for a in K.ASSETS:
        for o in (a, *a.children_recursive):
            o.hide_render = False

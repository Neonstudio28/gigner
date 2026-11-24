"""Vehicles family: blender -b -P tools/blender/vehicles.py [-- only=name,name quick noexport nopreview]
Writes public/assets/models/vehicles.glb + vehicles.json and the preview sheets tools/blender/previews/vehicles_*.jpg."""
import bpy, sys, os, math, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
import vehicles_kit as kit
import vehicles_wheels as wheels

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = next((a[5:].split(',') for a in ARGS if a.startswith('only=')), None)
QUICK = 'quick' in ARGS
GROUP = next((a[6:].split(',') for a in ARGS if a.startswith('group=')), None)
ALL = []
MODULES = ('vehicles_cars', 'vehicles_trucks', 'vehicles_heavy')


def dress(assets, wheel_obs, extras):
    """Preview only: fits wheel copies and gives each vehicle its own paint. Returns the temporary objects."""
    tmp = []
    for a in assets:
        ex = extras.get(a.name, {})
        for (x, y, z, r, wn) in ex.get('wheels', []):
            w = bpy.data.objects.new('pw', wheel_obs[wn].data)
            bpy.context.scene.collection.objects.link(w)
            w.parent = a
            w.location, w.scale = (x, y, z), (r / wheels.R,) * 3
            if y < 0:
                w.rotation_euler = (0, 0, math.pi)
            tmp.append(w)
        for i, m in enumerate(a.data.materials):
            for key, col in zip(('gloss__body', 'gloss__body2', 'gloss__stripe'), ex.get('paint', ())):
                if m.name == key and col:
                    a.data.materials[i] = lib.mat('gloss__pv' + col.lstrip('#'), col)
    return tmp


def shot(assets, tag, azim, elev, samples, res, cols=None, gap=0.8):
    """lib.preview() with the camera pulled in to frame the laid-out assets."""
    orig = bpy.ops.render.render

    class Fit:
        def render(self, **kw):
            scn = bpy.context.scene
            bpy.context.view_layer.update()
            pts = []
            for a in assets:
                lo, hi = lib.bounds(a)
                pts += [c for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2]) for c in (x, y, z)]
            loc, _ = scn.camera.camera_fit_coords(bpy.context.evaluated_depsgraph_get(), pts)
            scn.camera.location = loc
            fwd = scn.camera.matrix_world.to_quaternion() @ kit.Vector((0, 0, -1))
            scn.camera.location -= fwd * 0.06 * (scn.camera.location - kit.Vector(pts[:3])).length
            return orig(**kw)
    bpy.ops.render.__class__  # keep lib.preview untouched: swap the operator module for the duration of the call
    real = lib.bpy
    proxy = type('B', (), {'__getattr__': lambda s_, n: getattr(real, n)})()
    ops = type('O', (), {'__getattr__': lambda s_, n: Fit() if n == 'render' else getattr(real.ops, n)})()
    proxy.ops = ops
    lib.bpy = proxy
    away = [o for o in ALL if o not in assets]
    for o in away:
        o.location.y += 900
    try:
        return lib.preview('vehicles', assets, tag=tag, samples=samples, res=res, azim=azim, elev=elev, cols=cols, gap=gap)
    finally:
        lib.bpy = real
        for o in away:
            o.location.y -= 900


def main():
    lib.reset()
    kit.reset_materials()
    wheel_list = wheels.build()
    wheel_obs = {w.name: w for w in wheel_list}
    assets, extras, groups = [], {}, {}
    for mod in MODULES:
        try:
            m = importlib.import_module(mod)
        except ModuleNotFoundError:
            continue
        for name, fn in m.ROSTER:
            if ONLY and name not in ONLY:
                continue
            v = fn(name)
            assets.append(v.finish())
            extras[name] = v.extra
            groups.setdefault(mod.split('_')[1], []).append(assets[-1])
            print(f'[built] {name}: {lib.tris(assets[-1])} tris')
            if 'mats' in ARGS:
                me = assets[-1].data
                cnt = {}
                for p in me.polygons:
                    cnt[me.materials[p.material_index].name] = cnt.get(me.materials[p.material_index].name, 0) + 1
                print('[mats]', cnt)
    if 'noexport' not in ARGS and not ONLY:
        lib.export('vehicles', wheel_list + assets, extras)
        print('[size] %.2f MB' % (os.path.getsize(os.path.join(lib.MODELS, 'vehicles.glb')) / 1e6))
    if 'nopreview' in ARGS:
        return
    tmp = dress(assets, wheel_obs, extras)
    ALL.extend(wheel_list + assets)
    s, res = (10, (1280, 720)) if QUICK else (40, (1920, 1080))
    if ONLY:
        for i, (az, el) in enumerate(((-38, 17), (142, 22), (-90, 6), (0, 75))):
            shot(assets, '_wip%d' % i, az, el, s, res)
        return
    for w in wheel_list:
        w.location.z = wheels.R
    if not GROUP:
        shot(wheel_list, 'wheels', 158, 10, s, res, cols=7, gap=0.3)
    for w in wheel_list:
        w.location.z = 0
    for g, obs in groups.items():
        for i in range(0, len(obs), 3):
            sub = obs[i:i + 3]
            if GROUP and '%s%d' % (g, i // 3 + 1) not in GROUP:
                continue
            shot(sub, '%s_%d_front' % (g, i // 3 + 1), 52, 16, s, res, cols=1, gap=0.9)
            shot(sub, '%s_%d_rear' % (g, i // 3 + 1), -52, 20, s, res, cols=1, gap=0.9)
        if not GROUP:
            shot(obs, g + '_all', -90, 32, s, res, cols=1 if len(obs) < 4 else 2, gap=1.0)
    for o in tmp:
        bpy.data.objects.remove(o, do_unlink=True)


main()
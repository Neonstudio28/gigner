"""Shared helpers for the asset generators: see CONTRACT.md. Import, do not edit."""
import bpy, bmesh, math, os, json
from mathutils import Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODELS = os.path.join(ROOT, 'public', 'assets', 'models')
PREVIEWS = os.path.join(ROOT, 'tools', 'blender', 'previews')
# key -> (roughness, metallic) used for previews; the engine applies its own values
KEYS = {'paint': (0.85, 0.0), 'gloss': (0.3, 0.1), 'metal': (0.35, 0.85), 'chrome': (0.12, 1.0), 'rubber': (0.95, 0.0),
        'glass': (0.08, 0.4), 'clear': (0.05, 0.0), 'light': (1.0, 0.0), 'atlas': (0.7, 0.0)}


def reset():
    """Empty scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def srgb(c):
    """'#rrggbb' or 0xrrggbb or (r, g, b) in sRGB 0..1 -> linear RGBA for Blender."""
    if isinstance(c, str):
        c = int(c.lstrip('#'), 16)
    if isinstance(c, int):
        c = ((c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255)
    lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (lin(c[0]), lin(c[1]), lin(c[2]), 1.0)


def mat(name, color):
    """Material named '<key>' or '<key>__<label>' with a flat sRGB colour. Reuses an existing one of that name."""
    key = name.split('__')[0]
    if key not in KEYS:
        raise ValueError(f'unknown material key {key!r} in {name!r}')
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color)
    b.inputs['Roughness'].default_value, b.inputs['Metallic'].default_value = KEYS[key]
    if key == 'light':
        b.inputs['Emission Color'].default_value = srgb(color)
        b.inputs['Emission Strength'].default_value = 3.0
    if key == 'clear':
        b.inputs['Alpha'].default_value = 0.25
        m.blend_method = 'BLEND'
    m.diffuse_color = srgb(color)
    return m


def colour(key, color, label=None):
    """Flat-colour material auto-named from its key and colour: colour('paint', '#7a4a2b')."""
    if label:
        return mat(f'{key}__{label}', color)
    c = srgb(color)
    return mat(f'{key}_{int(c[0] * 255):02x}{int(c[1] * 255):02x}{int(c[2] * 255):02x}'.replace('_', '__c'), color)


def to_object(name, bm, materials, angle=35.0, parent=None):
    """bmesh -> linked mesh object. `materials` is the slot list matching face.material_index."""
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if parent is not None:
        ob.parent = parent
    finish(ob, angle)
    return ob


def finish(ob, angle=35.0):
    """Smooth shading with sharp edges above `angle` degrees; drops unused material slots."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    lim = math.radians(angle)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0.0) < lim
    bm.to_mesh(me)
    bm.free()
    used = {p.material_index for p in me.polygons}
    for i in reversed(range(len(me.materials))):
        if i not in used:
            for p in me.polygons:
                if p.material_index > i:
                    p.material_index -= 1
            me.materials.pop(index=i)
    return ob


def join(name, objs):
    """Joins objects (applying their modifiers) into one named mesh object."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target='MESH')
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = o.data.name = name
    return o


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons) if ob.type == 'MESH' else 0


def bounds(ob):
    pts = [ob.matrix_world @ Vector(c) for o in [ob, *ob.children_recursive] if o.type == 'MESH' for c in o.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    return lo, hi


def export(family, assets, extras=None):
    """Writes <family>.glb and <family>.json for the top-level `assets` (children come along)."""
    os.makedirs(MODELS, exist_ok=True)
    bpy.context.view_layer.update()
    names = [a.name for a in assets]
    if len(set(names)) != len(names):
        raise ValueError('duplicate asset names')
    manifest = {}
    for a in assets:
        lo, hi = bounds(a)
        manifest[a.name] = {
            'size': [round(hi[i] - lo[i], 3) for i in range(3)],
            'min': [round(v, 3) for v in lo],
            'tris': tris(a) + sum(tris(c) for c in a.children_recursive),
            'parts': {c.name.split('.', 1)[-1]: [round(v, 4) for v in c.matrix_world.translation] for c in a.children_recursive},
            **((extras or {}).get(a.name, {})),
        }
    bpy.ops.object.select_all(action='DESELECT')
    for a in assets:
        a.select_set(True)
        for c in a.children_recursive:
            c.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(MODELS, family + '.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_normals=True, export_texcoords=True,
                              export_materials='EXPORT', export_animations=False, export_extras=False)
    with open(os.path.join(MODELS, family + '.json'), 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    total = sum(m['tris'] for m in manifest.values())
    print(f'[export] {family}: {len(assets)} assets, {total} tris')
    return manifest


def preview(family, assets, tag='all', cols=None, gap=0.6, res=(1920, 1080), samples=24, elev=24, azim=-35):
    """Lays the assets out in a grid and renders a 3/4 view with Cycles (works headless on any machine)."""
    os.makedirs(PREVIEWS, exist_ok=True)
    scn = bpy.context.scene
    cols = cols or max(1, math.ceil(math.sqrt(len(assets) * 1.6)))
    saved = [(a, a.location.copy()) for a in assets]
    sizes = [bounds(a) for a in assets]
    cw = max(hi[0] - lo[0] for lo, hi in sizes) + gap
    cd = max(hi[1] - lo[1] for lo, hi in sizes) + gap
    for i, a in enumerate(assets):
        a.location = (a.location.x + (i % cols) * cw, a.location.y - (i // cols) * cd, a.location.z)
    bpy.context.view_layer.update()
    rows = math.ceil(len(assets) / cols)
    ctr = Vector(((cols - 1) * cw / 2, -(rows - 1) * cd / 2, max(hi[2] for lo, hi in sizes) * 0.4))
    span = max(cols * cw, rows * cd * 1.5, 2.0)
    extra = []
    bpy.ops.mesh.primitive_plane_add(size=span * 6, location=(ctr.x, ctr.y, -0.001))
    g = bpy.context.object
    g.data.materials.append(mat('paint__previewfloor', '#9a9da0'))
    extra.append(g)
    sun = bpy.data.objects.new('psun', bpy.data.lights.new('psun', 'SUN'))
    sun.data.energy, sun.data.angle = 4.0, math.radians(3)
    sun.rotation_euler = (math.radians(50), 0, math.radians(azim - 55))
    cam = bpy.data.objects.new('pcam', bpy.data.cameras.new('pcam'))
    cam.data.lens = 60
    for o in (sun, cam):
        scn.collection.objects.link(o)
        extra.append(o)
    e, a_ = math.radians(elev), math.radians(azim)
    dist = span * 1.55
    cam.location = ctr + Vector((math.sin(a_) * math.cos(e), -math.cos(a_) * math.cos(e), math.sin(e))) * dist
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scn.camera = cam
    world = bpy.data.worlds.new('pworld')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.68, 0.9, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    scn.world = world
    scn.render.engine = 'CYCLES'
    scn.cycles.samples, scn.cycles.use_denoising, scn.cycles.device = samples, False, 'CPU'
    scn.view_settings.view_transform = 'Standard'
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.image_settings.file_format = 'JPEG'
    scn.render.image_settings.quality = 88
    scn.render.filepath = os.path.join(PREVIEWS, f'{family}_{tag}.jpg')
    bpy.ops.render.render(write_still=True)
    for o in extra:
        bpy.data.objects.remove(o, do_unlink=True)
    for a, loc in saved:
        a.location = loc
    print('[preview]', scn.render.filepath)
    return scn.render.filepath

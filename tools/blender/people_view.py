"""Preview sheets for the people family: strips of figures rendered large and stacked into one JPEG."""
import bpy, math, os, tempfile
import numpy as np
from mathutils import Vector
import lib


def _stage(azim):
    scn = bpy.context.scene
    extra = []
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -0.001))
    g = bpy.context.object
    g.data.materials.append(lib.mat('paint__previewfloor', '#9a9da0'))
    extra.append(g)
    sun = bpy.data.objects.new('psun', bpy.data.lights.new('psun', 'SUN'))
    sun.data.energy, sun.data.angle = 4.0, math.radians(3)
    sun.rotation_euler = (math.radians(50), 0, math.radians(azim - 55))
    cam = bpy.data.objects.new('pcam', bpy.data.cameras.new('pcam'))
    for o in (sun, cam):
        scn.collection.objects.link(o)
        extra.append(o)
    scn.camera = cam
    world = bpy.data.worlds.get('pworld') or bpy.data.worlds.new('pworld')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.68, 0.9, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    scn.world = world
    scn.render.engine = 'CYCLES'
    scn.cycles.use_denoising, scn.cycles.device = False, 'CPU'
    scn.view_settings.view_transform = 'Standard'
    return cam, extra


def strip(roots, every, spacing=0.8, turn=0.0, zc=0.9, width=None, res=(1920, 640), elev=8.0, azim=0.0, samples=24, lens=85, show=()):
    """Renders `roots` side by side (each turned `turn` degrees about Z); returns an (h, w, 4) float array, bottom row first."""
    scn = bpy.context.scene
    saved = [(o, o.location.copy(), o.rotation_euler.copy(), o.hide_render) for o in every]
    for o in every:
        o.hide_render = True
        for c in o.children_recursive:
            c.hide_render = True
    n = len(roots)
    for i, o in enumerate(roots):
        o.location = ((i - (n - 1) / 2) * spacing, 0, o.location.z)
        o.rotation_euler = (0, 0, math.radians(turn))
        o.hide_render = False
        for c in o.children_recursive:
            c.hide_render = False
    for o in show:      # already placed by the caller
        o.hide_render = False
    cam, extra = _stage(azim)
    width = width or n * spacing + 0.3
    cam.data.lens = lens
    dist = width * lens / 36.0
    e, a = math.radians(elev), math.radians(azim)
    ctr = Vector((0, 0, zc))
    cam.location = ctr + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scn.cycles.samples = samples
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.image_settings.file_format = 'PNG'
    tmp = os.path.join(tempfile.gettempdir(), 'people_strip.png')
    scn.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(tmp)
    px = np.empty(res[0] * res[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    for o in extra:
        bpy.data.objects.remove(o, do_unlink=True)
    for o, loc, r, h in saved:
        o.location, o.rotation_euler, o.hide_render = loc, r, h
        for c in o.children_recursive:
            c.hide_render = h
    return px.reshape(res[1], res[0], 4)


def sheet(tag, strips, family='people'):
    """Stacks strips (first on top) into tools/blender/previews/<family>_<tag>.jpg."""
    os.makedirs(lib.PREVIEWS, exist_ok=True)
    arr = np.concatenate(list(reversed(strips)), axis=0)
    h, w = arr.shape[:2]
    img = bpy.data.images.new('psheet', w, h, alpha=False)
    img.pixels.foreach_set(arr.ravel())
    path = os.path.join(lib.PREVIEWS, f'{family}_{tag}.jpg')
    scn = bpy.context.scene
    scn.render.image_settings.file_format = 'JPEG'
    scn.render.image_settings.quality = 88
    scn.view_settings.view_transform = 'Standard'
    img.save_render(path, scene=scn)
    bpy.data.images.remove(img)
    print('[preview]', path)
    return path

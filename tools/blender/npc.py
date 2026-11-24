"""Townsfolk: boxy rigged characters with animation clips. Run: blender -b -P tools/blender/npc.py [-- nopreview]"""
import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
import npc_rig, npc_body, npc_head, npc_wear, npc_props
import npc_clips, npc_clips_move, npc_clips_idle, npc_clips_talk, npc_clips_work
from npc_cast import CAST


def material():
    m = bpy.data.materials.new('paint__npc')
    m.use_nodes = True
    nt = m.node_tree
    a = nt.nodes.new('ShaderNodeVertexColor')
    a.layer_name = 'Col'
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.85
    nt.links.new(a.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def mesh(name, b, mat):
    me = bpy.data.meshes.new(name)
    b.bm.to_mesh(me)
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for bone in b.bones:
        ob.vertex_groups.new(name=bone)
    me.color_attributes.active_color = me.color_attributes['Col']
    me.color_attributes.render_color_index = me.color_attributes.find('Col')
    n = b.tris()
    b.bm.free()
    return ob, n


def character(name, spec, rig, mat):
    b, ctx = npc_body.build(spec)
    npc_wear.wear(b, spec, ctx)
    npc_head.head(b, spec, ctx)
    ob, n = mesh(name, b, mat)
    ob.parent = rig
    ob.modifiers.new('Armature', 'ARMATURE').object = rig
    return ob, dict(palette=b.palette, sex=spec.get('sex', 'm'), scale=spec.get('scale', 1.0), tris=n)


def frozen(ob, name):
    """A static copy of a skinned mesh in its current pose (for preview sheets)."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def rest(rig):
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()


def sheet(tag, rig, model, names, hide, cols=8):
    shots = []
    for n in names:
        a = bpy.data.actions[n]
        rig.animation_data.action = a
        bpy.context.scene.frame_set(int(1 + (a.frame_range[1] - 1) * (0.0 if n.startswith(('walk', 'jog', 'run', 'stroll')) else 0.32)))
        bpy.context.view_layer.update()
        shots.append(frozen(model, 'pose_' + n))
    rest(rig)
    for o in hide:
        o.hide_render = True
    lib.preview('npc', shots, tag=tag, cols=cols, gap=0.3, res=(1920, 900), samples=20, elev=9, azim=-24)
    for o in hide:
        o.hide_render = False
    for o in shots:
        bpy.data.objects.remove(o, do_unlink=True)


if __name__ == '__main__':
    lib.reset()
    bpy.context.scene.render.fps = npc_rig.FPS
    rig = npc_rig.armature()
    mat = material()
    for m in (npc_clips_move, npc_clips_idle, npc_clips_talk, npc_clips_work):
        m.make(rig)
    chars, info = [], {}
    for n, s in CAST.items():
        ob, info[n] = character(n, s, rig, mat)
        chars.append(ob)
    pobs, pinfo = [], {}
    for n, (b, bone) in npc_props.props().items():
        ob, _ = mesh('prop_' + n, b, mat)
        pobs.append(ob)
        pinfo[n] = dict(bone=bone)
    if 'nopreview' not in sys.argv:
        names = list(npc_clips.META)
        every = chars + pobs
        for i in range(0, len(names), 16):
            sheet(f'poses_{i // 16}', rig, chars[i // 16 * 5 % len(chars)], names[i:i + 16], every)
        rest(rig)
        for o in every:
            o.hide_render = True
        for i in range(0, len(chars), 12):
            part = [frozen(o, 'still_' + o.name) for o in chars[i:i + 12]]
            lib.preview('npc', part, tag=f'cast_{i // 12}', cols=6, gap=0.45, res=(1920, 1200), samples=24, elev=10, azim=-22)
            for o in part:
                bpy.data.objects.remove(o, do_unlink=True)
        for o in every:
            o.hide_render = o not in pobs
        lib.preview('npc', pobs, tag='props', cols=5, gap=0.5, res=(1600, 1000), samples=20, elev=20, azim=-30)
        for o in every:
            o.hide_render = False
    rest(rig)
    out = os.path.join(lib.MODELS, 'npc.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=False, export_yup=True, export_skins=True,
                              export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
                              export_frame_range=False, export_optimize_animation_size=True, export_anim_slide_to_zero=True,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_texcoords=True,
                              export_normals=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
    man = dict(characters=info, props=pinfo, clips=npc_clips.META, bones=list(npc_rig.BONES), fps=npc_rig.FPS,
               slots=__import__('npc_geo').SLOTS)
    json.dump(man, open(os.path.join(lib.MODELS, 'npc.json'), 'w'), indent=1)
    print('[npc] wrote', out, os.path.getsize(out) // 1024, 'KB;', len(info), 'characters,', len(npc_clips.META), 'clips,', len(pinfo), 'props;',
          'tris', min(v['tris'] for v in info.values()), '-', max(v['tris'] for v in info.values()))

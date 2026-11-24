"""Preview contact sheets for the vegetation family (lib.preview with a 1.8 m scale box beside each tree)."""
import bpy, bmesh
from mathutils import Matrix
import lib

# tag -> (asset names, cols, gap, kwargs). '+far' after a name adds its _far twin beside it.
SHEETS = {
    'oaks': (['oak_young', 'oak_large', 'oak_medium', 'street_tree'], 2, 2.0, {}),
    'maples_willow': (['maple_medium', 'maple_large', 'willow_lake', 'apple_tree'], 2, 2.0, {}),
    'broadleaf_small': (['sapling_staked', 'birch_cluster', 'dead_tree', 'apple_tree', 'street_tree', 'oak_young'], 3, 1.5, {}),
    'tall': (['poplar_tall', 'douglas_fir_tall', 'pine_tall', 'douglas_fir_medium', 'snag_conifer'], 5, 3.0, dict(elev=12)),
    'conifers': (['fir_young', 'cedar_broad', 'pine_medium', 'spruce_blue'], 4, 3.0, dict(elev=14)),
    'far_broadleaf': (['oak_large+far', 'maple_large+far', 'willow_lake+far', 'oak_medium+far', 'maple_medium+far',
                       'birch_cluster+far'], 4, 1.0, dict(elev=16)),
    'far_small': (['oak_young+far', 'apple_tree+far', 'street_tree+far', 'dead_tree+far', 'sapling_staked+far',
                   'pine_medium+far'], 4, 0.8, dict(elev=16)),
    'far_conifer_a': (['douglas_fir_tall+far', 'pine_tall+far', 'poplar_tall+far', 'douglas_fir_medium+far'], 4, 6.0, dict(elev=10)),
    'far_conifer_b': (['cedar_broad+far', 'snag_conifer+far', 'spruce_blue+far', 'fir_young+far'], 4, 3.0, dict(elev=12)),
    'shrubs': (['bush_round_a', 'bush_round_b', 'bush_wide', 'bush_flowering_a', 'bush_flowering_b', 'topiary_ball',
                'hedge_straight', 'hedge_end', 'hedge_corner', 'hedge_tall', 'fern', 'flower_bed'], 4, 0.5, {}),
    'far_shrubs': (['bush_round_a+far', 'bush_round_b+far', 'bush_wide+far', 'bush_flowering_a+far', 'bush_flowering_b+far',
                    'topiary_ball+far', 'hedge_straight+far', 'hedge_end+far', 'hedge_corner+far', 'hedge_tall+far'], 6, 0.4, {}),
    'garden': (['flower_clump_a', 'flower_clump_b', 'fern', 'flower_bed', 'ivy_patch_wall', 'vine_trellis'], 3, 0.4, {}),
    'grass': (['grass_tuft_a', 'grass_tuft_b', 'grass_tuft_c', 'grass_tuft_d', 'grass_tall_a', 'grass_tall_b', 'weeds_a',
               'weeds_b', 'dandelion_patch'], 3, 0.25, {}),
    'crops': (['reeds', 'lily_pads', 'wheat_clump', 'hay_stubble', 'corn_stalk_a', 'corn_stalk_b', 'corn_stalk_c',
               'corn_row', 'corn_row_far'], 3, 0.4, {}),
    'rocks': (['boulder_a', 'boulder_b', 'rock_medium_a', 'rock_medium_b', 'rock_medium_c'], 3, 0.6, {}),
    'rocks_small': (['rock_small_a', 'rock_small_b', 'rock_small_c', 'mushroom_cluster'], 2, 0.2, {}),
    'shore_wood': (['shore_rock_cluster_a', 'shore_rock_cluster_b', 'log_pile', 'log_single', 'stump', 'stump_mossy',
                    'branch_fallen', 'firewood_stack'], 3, 0.6, {}),
    'distant': (['mountain_snowy_a', 'mountain_snowy_b', 'mountain_snowy_c', 'hill_wooded_a', 'hill_wooded_b'], 2, 1.0, dict(elev=12)),
}


def scale_box(parent, x):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Translation((x, -0.9, 0.9)) @ Matrix.Diagonal((0.5, 0.3, 1.8, 1)))
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.03, segments=1, affect='EDGES')
    return lib.to_object('scale_' + parent.name, bm, [lib.mat('paint__previewscale', '#b9bcc0')], parent=parent)


def render(by_name, extras, only=None, fast=False):
    for tag, (names, cols, gap, kw) in SHEETS.items():
        if only and not any(o in tag for o in only):
            continue
        obs, boxes = [], []
        for n in names:
            for nm in ([n[:-4], n[:-4] + '_far'] if n.endswith('+far') else [n]):
                if nm not in by_name:
                    continue
                ob = by_name[nm]
                obs.append(ob)
                if 'trunk_radius' in extras[nm] and extras[nm].get('kind') in ('broadleaf', 'conifer', 'dead'):
                    boxes.append(scale_box(ob, extras[nm]['trunk_radius'] + 0.9))
        if not obs:
            continue
        if fast:
            kw = dict(kw, samples=12, res=(1600, 900))
        hidden = [o for o in bpy.data.objects if o.parent is None and o not in obs and not o.hide_render]
        for o in hidden:
            o.hide_render = True
            for c in o.children:
                c.hide_render = True
        sc = 0.02 if tag == 'distant' else 1.0  # lib.preview's camera clips at 100 m: render far scenery as a scale model
        for o in obs:
            o.scale = (sc, sc, sc)
        bpy.context.view_layer.update()
        lib.preview('vegetation', obs, tag=tag, cols=cols, gap=gap, **kw)
        for o in obs:
            o.scale = (1, 1, 1)
        for o in hidden:
            o.hide_render = False
            for c in o.children:
                c.hide_render = False
        for bx in boxes:
            bpy.data.objects.remove(bx, do_unlink=True)

"""The townsfolk skeleton and the helpers that key its animation clips."""
import bpy
from math import radians
from mathutils import Matrix, Vector

FPS = 24
# name: (head, tail, parent). Character faces -Y, its left is +X, Z is up.
BONES = {
    'root': ((0, 0, 0), (0, 0, 0.2), None),
    'hips': ((0, 0, 0.95), (0, 0, 1.05), 'root'),
    'spine': ((0, 0, 1.05), (0, 0, 1.25), 'hips'),
    'chest': ((0, 0, 1.25), (0, 0, 1.50), 'spine'),
    'neck': ((0, 0, 1.50), (0, 0, 1.56), 'chest'),
    'head': ((0, 0, 1.56), (0, 0, 1.88), 'neck'),
}
for s, sx in (('L', 1), ('R', -1)):
    BONES[f'upper_arm.{s}'] = ((sx * 0.34, 0, 1.44), (sx * 0.34, 0, 1.17), 'chest')
    BONES[f'forearm.{s}'] = ((sx * 0.34, 0, 1.17), (sx * 0.34, 0, 0.90), f'upper_arm.{s}')
    BONES[f'hand.{s}'] = ((sx * 0.34, 0, 0.90), (sx * 0.34, 0, 0.76), f'forearm.{s}')
    BONES[f'thigh.{s}'] = ((sx * 0.115, 0, 0.92), (sx * 0.115, 0, 0.50), 'hips')
    BONES[f'shin.{s}'] = ((sx * 0.115, 0, 0.50), (sx * 0.115, 0, 0.10), f'thigh.{s}')
    BONES[f'foot.{s}'] = ((sx * 0.115, 0, 0.10), (sx * 0.115, -0.18, 0.02), f'shin.{s}')
UPPER = ['spine', 'chest', 'neck', 'head', 'upper_arm.L', 'forearm.L', 'hand.L', 'upper_arm.R', 'forearm.R', 'hand.R']


def armature():
    arm = bpy.data.armatures.new('rig')
    ob = bpy.data.objects.new('rig', arm)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (h, t, p) in BONES.items():
        b = arm.edit_bones.new(name)
        b.head, b.tail, b.roll = Vector(h), Vector(t), 0.0
        if p:
            b.parent = arm.edit_bones[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in ob.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    ob.animation_data_create()
    return ob


def rot(pitch=0.0, yaw=0.0, roll=0.0):
    """Rotation in armature axes, degrees: pitch swings a hanging limb forward, yaw turns left, roll leans/moves it
    toward the character's right."""
    return Matrix.Rotation(radians(yaw), 3, 'Z') @ Matrix.Rotation(radians(roll), 3, 'Y') @ Matrix.Rotation(radians(-pitch), 3, 'X')


class Clip:
    """One action. `key(t, pose)` sets a pose at t seconds; a pose maps bone -> (pitch, yaw, roll) and
    'hips_at' -> (x, y, z) offset of the hips in metres. Bones not named keep the clip's base pose."""

    def __init__(self, rig, name, dur, loop=True, base=None, upper=False):
        self.rig, self.name, self.dur, self.loop, self.upper = rig, name, dur, loop, upper
        self.base = dict(base or {})
        self.action = bpy.data.actions.new(name)
        self.keys = []

    def key(self, t, pose=None):
        p = dict(self.base)
        p.update(pose or {})
        self.keys.append((t, p))
        return self

    def bake(self):
        rig = self.rig
        rig.animation_data.action = self.action
        if self.loop and self.keys[-1][0] < self.dur:
            self.keys.append((self.dur, self.keys[0][1]))
        names = UPPER if self.upper else list(BONES)
        for t, pose in self.keys:
            f = 1 + t * FPS
            for n in names:
                pb = rig.pose.bones[n]
                rest = pb.bone.matrix_local.to_3x3()
                r = rot(*pose.get(n, (0, 0, 0)))
                pb.rotation_quaternion = (rest.inverted() @ r @ rest).to_quaternion()
                pb.keyframe_insert('rotation_quaternion', frame=f)
                if n == 'hips' and not self.upper:
                    pb.location = rest.inverted() @ Vector(pose.get('hips_at', (0, 0, 0)))
                    pb.keyframe_insert('location', frame=f)
        for fc in self.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'BEZIER'
                kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
        # keep quaternions on the short path between keys
        quats = {}
        for fc in self.action.fcurves:
            if fc.data_path.endswith('rotation_quaternion'):
                quats.setdefault(fc.data_path, [None] * 4)[fc.array_index] = fc
        for fcs in quats.values():
            prev = None
            for i in range(len(fcs[0].keyframe_points)):
                q = [fc.keyframe_points[i].co[1] for fc in fcs]
                if prev and sum(a * b for a, b in zip(q, prev)) < 0:
                    q = [-v for v in q]
                    for fc, v in zip(fcs, q):
                        fc.keyframe_points[i].co[1] = v
                prev = q
            for fc in fcs:
                fc.update()
        self.action.use_fake_user = True
        tr = rig.animation_data.nla_tracks.new()
        tr.name = self.name
        tr.strips.new(self.name, 1, self.action)
        tr.mute = True
        rig.animation_data.action = None
        for pb in rig.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)
        return self


def pose_at(rig, clip, t):
    """Puts the rig in `clip` at t seconds (for preview renders)."""
    rig.animation_data.action = clip.action
    bpy.context.scene.frame_set(int(round(1 + t * FPS)))

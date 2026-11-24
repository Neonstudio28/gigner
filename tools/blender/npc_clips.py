"""Animation clips for the townsfolk rig. Poses use short bone names; angles are (pitch, yaw, roll) degrees:
pitch swings a hanging limb forward (a head looks up, a spine leans back), yaw turns left, roll moves a hanging limb
to the character's right (a spine leans left). 'at' offsets the hips in metres (x left, y back, z up)."""
from npc_rig import Clip

SHORT = {'hip': 'hips', 'sp': 'spine', 'ch': 'chest', 'nk': 'neck', 'hd': 'head', 'at': 'hips_at'}
for s in 'LR':
    SHORT.update({f'a{s}': f'upper_arm.{s}', f'f{s}': f'forearm.{s}', f'h{s}': f'hand.{s}', f't{s}': f'thigh.{s}',
                  f's{s}': f'shin.{s}', f'ft{s}': f'foot.{s}'})
META = {}


def P(**kw):
    """Pose from short names; a bare number is a pitch."""
    return {SHORT[k]: (v if isinstance(v, tuple) else (v, 0, 0)) for k, v in kw.items()}


def mir(p):
    """The same pose on the other side."""
    out = {}
    for k, v in p.items():
        k2 = k[:-1] + ('R' if k[-1] == 'L' else 'L') if k[-2:] in ('.L', '.R') else k
        out[k2] = (-v[0], v[1], v[2]) if k == 'hips_at' else (v[0], -v[1], -v[2])
    return out


def over(a, **kw):
    q = dict(a)
    q.update(P(**kw))
    return q


# arms hanging relaxed: the base of every standing clip
REL = P(aL=(4, 0, -7), aR=(4, 0, 7), fL=14, fR=14)
SIT = over(REL, tL=(84, 0, -4), tR=(84, 0, 4), sL=-84, sR=-84, at=(0, 0, -0.38))


def clip(rig, name, dur, keys, loop=True, base=REL, **meta):
    """keys: [(t, pose), ...]. Meta is written to the manifest (speed for locomotion, seat, prop, hold)."""
    c = Clip(rig, name, dur, loop=loop, base=base)
    for t, p in keys:
        c.key(t, p)
    c.bake()
    META[name] = dict(dur=dur, loop=loop, **meta)
    return c

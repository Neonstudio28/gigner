import type { Kit, Col } from './core/kit';
import type { Rng } from './core/rng';
import { SHIRT_COLORS, PANTS_COLORS, SKIN_COLORS, HAIR_COLORS } from './palette';
import { asset, hasAsset, type Tints } from './assets';

export type Pose = 'stand' | 'sit' | 'talk' | 'hips' | 'cross' | 'point' | 'wave' | 'carry' | 'lean' | 'stride';
type Joints = Record<string, readonly [number, number, number]>;

/** Joint angles (radians, about each limb's own pivot) for the standing and seated poses of the modelled figures. */
export const POSES: Record<Pose, Joints> = {
  stand: { arm_l: [0.04, 0, 0.05], arm_r: [-0.03, 0, -0.05], forearm_l: [-0.12, 0, 0], forearm_r: [-0.1, 0, 0] },
  sit: { leg_l: [-1.5, 0, 0.06], leg_r: [-1.5, 0, -0.06], shin_l: [1.45, 0, 0], shin_r: [1.45, 0, 0], arm_l: [-0.45, 0, 0.08], arm_r: [-0.45, 0, -0.08], forearm_l: [-0.9, 0, 0], forearm_r: [-0.9, 0, 0] },
  talk: { arm_l: [-0.25, 0, 0.1], forearm_l: [-1.35, 0, 0.25], arm_r: [0.05, 0, -0.06], forearm_r: [-0.15, 0, 0], head: [0.04, 0.2, 0] },
  hips: { arm_l: [0.3, 0, 0.9], forearm_l: [-0.3, 0, -1.9], arm_r: [0.3, 0, -0.9], forearm_r: [-0.3, 0, 1.9], leg_l: [0, 0, 0.07], leg_r: [0, 0, -0.07] },
  cross: { arm_l: [-0.5, 0, 0.12], forearm_l: [-1.2, 0, -1.2], arm_r: [-0.5, 0, -0.12], forearm_r: [-1.2, 0, 1.2], head: [0, -0.15, 0] },
  point: { arm_r: [-1.35, 0, -0.1], forearm_r: [-0.1, 0, 0], arm_l: [0.05, 0, 0.06], head: [-0.05, 0.1, 0] },
  wave: { arm_r: [-0.3, 0, -2.3], forearm_r: [0, 0, -0.6], arm_l: [0.05, 0, 0.06], head: [-0.05, 0, 0] },
  carry: { arm_l: [-0.2, 0, 0.06], forearm_l: [-1.25, 0, 0], arm_r: [0.05, 0, -0.06], forearm_r: [-0.12, 0, 0] },
  lean: { leg_l: [-0.25, 0, 0.03], shin_l: [0.6, 0, 0], arm_l: [-0.45, 0, 0.1], forearm_l: [-1.2, 0, -1.1], arm_r: [-0.45, 0, -0.1], forearm_r: [-1.2, 0, 1.1] },
  stride: { leg_l: [-0.3, 0, 0], shin_l: [0.12, 0, 0], leg_r: [0.26, 0, 0], shin_r: [0.4, 0, 0], arm_l: [0.4, 0, 0.05], forearm_l: [-0.3, 0, 0], arm_r: [-0.4, 0, -0.05], forearm_r: [-0.55, 0, 0] },
};

/** Roster weights for people met around town. */
const TOWNSFOLK: [string, number][] = [
  ['casual_m_1', 5], ['casual_m_2', 5], ['casual_m_3', 5], ['casual_f_1', 5], ['casual_f_2', 5], ['casual_f_3', 5], ['teen_m', 3], ['teen_f', 3],
  ['old_man', 3], ['old_woman', 3], ['farmer', 3], ['lumberjack', 2], ['trucker', 2], ['businessman', 2], ['businesswoman', 2], ['tourist', 2],
  ['worker', 1.5], ['jogger', 1], ['biker', 1], ['kid_m', 1.5], ['kid_f', 1.5], ['mechanic', 0.6], ['waitress', 0.5],
];
const JACKETS: Col[] = [0x4a5a6b, 0x6b4a33, 0x2f3a2e, 0x7a3b33, 0x35383f, 0x8a7a5a, 0x3f5f86];

/** Picks colours for a model's variable parts: skin and hair always, clothes about half the time. */
export function dress(rng: Rng, model: string): Tints {
  const info = asset(model)?.info as { vary?: string[]; palette?: Record<string, string> } | undefined;
  const vary = info?.vary ?? [];
  const has = (l: string) => vary.includes(l) && !!info?.palette?.[l];
  const t: Tints = {};
  if (has('skin')) t.skin = rng.pick(SKIN_COLORS);
  if (has('hair')) t.hair = /old_/.test(model) ? rng.pick([0x9a9a98, 0xc8c6c0, 0x77736c]) : rng.pick(HAIR_COLORS);
  if (has('shirt') && rng.chance(0.6)) t.shirt = rng.pick(SHIRT_COLORS);
  if (has('pants') && rng.chance(0.5)) t.pants = rng.pick(PANTS_COLORS);
  if (has('jacket') && rng.chance(0.5)) t.jacket = rng.pick(JACKETS);
  if (has('dress') && rng.chance(0.6)) t.dress = rng.pick(SHIRT_COLORS);
  if (has('hat') && rng.chance(0.5)) t.hat = rng.pick(SHIRT_COLORS);
  return t;
}

/** A named model from the people family, dressed at random. */
export function cast(rng: Rng, model: string, pose?: Pose): PersonOpts {
  return { shirt: 0x3a5a8c, pants: 0x2a3348, skin: 0xd8a47f, hair: 0x2a1f17, model, tint: dress(rng, model), pose };
}

export interface PersonOpts {
  shirt: Col;
  pants: Col;
  skin: Col;
  hair: Col;
  hat?: 'cowboy' | 'cap' | 'deputy' | null;
  skirt?: boolean;
  scale?: number;
  point?: boolean;
  badge?: boolean;
  vest?: Col;
  /** People-family model; the blocky figure is the fallback when the family is not loaded. */
  model?: string;
  tint?: Tints;
  pose?: Pose;
  /** Hand-held extra (briefcase, shopping_bag, coffee_cup, newspaper, guitar_case, umbrella_closed). */
  carry?: string;
  /** Height of the seat for the `sit` pose. */
  seat?: number;
}

/** Blocky low-poly townsfolk in the style of the reference characters. */
export function person(k: Kit, x: number, z: number, ry: number, o: PersonOpts, y = 0) {
  if (o.model && hasAsset(o.model)) {
    const a = asset(o.model)!;
    const info = a.info as { seat?: number; grip?: [number, number, number] };
    const pose = o.pose ?? (o.point ? 'point' : 'stand');
    const joints = POSES[pose];
    const drop = pose === 'sit' ? (o.seat ?? 0.45) - (info.seat ?? 0.8) + 0.02 : 0;
    k.at(x, z, ry, () => {
      k.asset(o.model!, 0, drop, 0, 0, { tint: o.tint, joints });
      if (o.carry && hasAsset(o.carry) && info.grip && pose !== 'sit') {
        // hung from the right hand (grip is given for the left forearm in Blender axes: mirror x, z up, front -y)
        const sh = a.children.get('forearm_r')?.pivot;
        if (sh) k.asset(o.carry, sh.x - info.grip[0], sh.y + info.grip[2], sh.z - info.grip[1], 0);
      }
      if (pose !== 'sit') k.solid(0, 0, 0.5, 0.5);
    }, y);
    return;
  }
  k.at(
    x,
    z,
    ry,
    () => {
      k.solid(0, 0, 0.6, 0.6);
      for (const s of [-1, 1]) {
        k.box(s * 0.11, 0, 0.03, 0.17, 0.09, 0.3, 0x1f1b18);
        k.box(s * 0.105, 0.09, 0, 0.18, 0.78, 0.21, o.skirt ? o.skin : o.pants);
      }
      if (o.skirt) k.box(0, 0.5, 0, 0.46, 0.42, 0.3, o.pants);
      k.box(0, 0.86, 0, 0.5, 0.64, 0.28, o.shirt);
      k.box(0, 0.86, 0, 0.51, 0.06, 0.29, 0x2a221c);
      if (o.vest !== undefined) k.box(0, 0.98, 0, 0.52, 0.5, 0.3, o.vest);
      if (o.badge) k.box(0.13, 1.28, 0.145, 0.07, 0.08, 0.02, 0xd8b44a, 'metal');
      for (const s of [-1, 1]) {
        if (o.point && s > 0) {
          k.boxC(s * 0.32, 1.38, 0.3, 0.13, 0.15, 0.62, o.shirt);
          k.boxC(s * 0.32, 1.38, 0.66, 0.11, 0.12, 0.12, o.skin);
        } else {
          k.box(s * 0.32, 0.88, 0, 0.13, 0.62, 0.15, o.shirt);
          k.box(s * 0.32, 0.76, 0, 0.11, 0.13, 0.13, o.skin);
        }
      }
      k.box(0, 1.5, 0, 0.27, 0.3, 0.27, o.skin);
      k.box(0, 1.78, -0.01, 0.29, 0.09, 0.29, o.hair);
      k.box(0, 1.55, -0.12, 0.29, 0.24, 0.06, o.hair);
      for (const s of [-1, 1]) k.box(s * 0.06, 1.63, 0.136, 0.04, 0.04, 0.01, 0x1a1a1a, 'paint', { cast: false });
      if (o.hat === 'cowboy') {
        k.box(0, 1.8, 0, 0.58, 0.03, 0.58, 0x6b4a2e);
        k.box(0, 1.83, 0, 0.31, 0.17, 0.31, 0x6b4a2e);
      } else if (o.hat === 'cap') {
        k.box(0, 1.78, 0, 0.3, 0.12, 0.3, o.shirt);
        k.box(0, 1.79, 0.2, 0.28, 0.03, 0.16, o.shirt);
      } else if (o.hat === 'deputy') {
        k.box(0, 1.8, 0, 0.56, 0.03, 0.56, 0x5d4a32);
        k.cone(0, 1.83, 0, 0.18, 0.2, 4, 0x5d4a32, 'paint', { ry: Math.PI / 4 });
      }
    },
    0,
    o.scale ?? 1,
  );
}

export function randomPerson(rng: Rng, pose?: Pose): PersonOpts {
  if (hasAsset('casual_m_1')) {
    const total = TOWNSFOLK.reduce((a, [, w]) => a + w, 0);
    let t = rng.next() * total;
    let model = TOWNSFOLK[0][0];
    for (const [m, w] of TOWNSFOLK) {
      if ((t -= w) <= 0) {
        model = m;
        break;
      }
    }
    const o = cast(rng, model, pose);
    if (!pose && rng.chance(0.3)) o.carry = rng.pick(['shopping_bag', 'briefcase', 'shopping_bag', 'umbrella_closed', 'guitar_case']);
    return o;
  }
  const female = rng.chance(0.4);
  return {
    shirt: rng.pick(SHIRT_COLORS),
    pants: rng.pick(PANTS_COLORS),
    skin: rng.pick(SKIN_COLORS),
    hair: rng.pick(HAIR_COLORS),
    hat: rng.chance(0.15) ? 'cowboy' : rng.chance(0.15) ? 'cap' : null,
    skirt: female && rng.chance(0.5),
    scale: rng.range(0.92, 1.06) * (female ? 0.95 : 1),
  };
}

export function deputy(rng: Rng): PersonOpts {
  if (hasAsset('sheriff_deputy_m')) return cast(rng, rng.chance(0.4) ? 'sheriff_deputy_f' : 'sheriff_deputy_m', rng.pick(['stand', 'hips', 'cross'] as const));
  return { shirt: 0xeeece4, pants: 0x1f1f22, skin: rng.pick(SKIN_COLORS), hair: rng.pick(HAIR_COLORS), badge: true, hat: rng.chance(0.4) ? 'deputy' : null, scale: rng.range(0.98, 1.05) };
}

/** A loose group of people chatting around a point. */
export function crowd(k: Kit, rng: Rng, x: number, z: number, n: number, spread = 1.2, mk: (r: Rng) => PersonOpts = randomPerson) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const r = spread * rng.range(0.6, 1);
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    // face the group's centre
    const ry = Math.atan2(x - px, z - pz);
    const o = mk(rng);
    if (o.model && !o.pose) {
      o.pose = rng.pick(['stand', 'talk', 'hips', 'cross', 'talk', 'stand'] as const);
      if (o.pose !== 'stand') o.carry = undefined;
    }
    person(k, px, pz, ry, o);
  }
}

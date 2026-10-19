import type { Kit, Col } from './core/kit';
import type { Rng } from './core/rng';
import { SHIRT_COLORS, PANTS_COLORS, SKIN_COLORS, HAIR_COLORS } from './palette';

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
}

/** Blocky low-poly townsfolk in the style of the reference characters. */
export function person(k: Kit, x: number, z: number, ry: number, o: PersonOpts) {
  k.at(
    x,
    z,
    ry,
    () => {
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

export function randomPerson(rng: Rng): PersonOpts {
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
    person(k, px, pz, ry, mk(rng));
  }
}

import { Rng } from '../core/rng';
import { Placer } from './placer';
import type { BuildingDef } from '../buildings/catalog';
import { SUBURBAN, TRAILERS } from '../b2/houses';
import { CONSTRUCTION } from '../b2/construction';
import { prop } from './blocks';
import { heightAt } from '../terrain';

const N = 1 as const;
const S = -1 as const;

/**
 * Meadowbrook, the subdivision going up west of Lake Hill Rd: Fawn Ct is finished and sold, Meadowbrook Dr is
 * half built, Quail Ct is all framing, and Sparrow Ct is still a gravel road with slabs poured. The developer's
 * site office, plant and spoil heaps sit at the entrance.
 */
export function meadowbrook(pl: Placer) {
  const rng = new Rng(4646);
  const R = (n: string) => pl.net.byName(n);
  pl.clearings.push({ x: -350, z: 172, w: 240, d: 190 });
  // a planted buffer separates the highway strip's back lots from the new homes
  for (let x = -446; x < -300; x += 6.5) {
    const z = 104 + ((x + 446) / 146) * -6 + rng.range(-1.5, 1.5);
    if (!pl.c.occ.blocked(x, z, 1.5) && !pl.onStreet(x, z, 3)) pl.trees.push({ kind: rng.pick(['douglas_fir_tall', 'cedar_broad', 'maple_large', 'douglas_fir_medium']), x, z, s: rng.range(0.8, 1.1), ry: rng.range(0, 6) });
  }
  const o = { setback: 7, gap: 6, jitter: 0.6, driveway: true, mailbox: true, car: 0.5, maxSlope: 7 };
  const raw = { ...o, mailbox: false, car: 0 };
  const any = (list: BuildingDef[]) => (r: Rng) => r.pick(list);
  const late = (r: Rng) => r.pick(CONSTRUCTION.slice(1));
  const early = (r: Rng) => r.pick(CONSTRUCTION.slice(0, 2));
  const half = (r: Rng) => (r.chance(0.5) ? r.pick(SUBURBAN) : late(r));
  const first = pl.sites.length;
  for (const side of [N, S]) {
    pl.along(R('Fawn Ct'), side, 14, R('Fawn Ct').length - 8, any(SUBURBAN), o);
    pl.along(R('Meadowbrook Dr'), side, 22, R('Meadowbrook Dr').length - 10, half, o);
    pl.along(R('Quail Ct'), side, 14, R('Quail Ct').length - 8, late, raw);
    pl.along(R('Sparrow Ct'), side, 12, R('Sparrow Ct').length - 8, early, raw);
  }
  pl.bulb(R('Fawn Ct'), any(SUBURBAN), 4, o);
  pl.bulb(R('Meadowbrook Dr'), half, 3, o);
  pl.bulb(R('Quail Ct'), late, 4, raw);
  pl.bulb(R('Sparrow Ct'), early, 3, raw);
  // brand-new lawns: staked saplings, fresh shrubs, a few SOLD and For Sale boards
  for (const s of pl.sites.slice(first)) {
    if (!s.def.tags?.includes('house')) continue;
    const W = (lx: number, lz: number) => Placer.world(s.x, s.z, s.ry, lx, lz);
    const fz = s.def.d / 2 + 2.5;
    const t = W(-s.def.w / 2 + 2.5, fz);
    if (!pl.c.occ.blocked(t[0], t[1], 0.8) && !pl.onStreet(t[0], t[1], 1)) pl.trees.push({ kind: 'sapling_staked', x: t[0], z: t[1], s: 1, ry: rng.range(0, 6) });
    for (const sx of [-1, 1]) {
      const b = W(sx * 3, s.def.d / 2 - 1.3);
      if (!pl.c.occ.blocked(b[0], b[1], 0.2)) pl.trees.push({ kind: rng.pick(['bush_round_a', 'bush_round_b', 'flower_clump_a']), x: b[0], z: b[1], s: 0.7, ry: 0 });
    }
    if (rng.chance(0.3)) {
      const q = W(-s.def.w / 2 + 1, fz + 1);
      if (!pl.c.occ.blocked(q[0], q[1], 0.3) && !pl.onStreet(q[0], q[1], 0.5)) prop(pl, 'sign_for_sale', q[0], q[1], s.ry, false);
    }
  }
  // developer's yard at the entrance: site office, plant, spoil, aggregate, toilets, barriers
  const dr = R('Meadowbrook Dr');
  const f = pl.net.frontage(dr, 12, S, dr.full + 14);
  const L = (lx: number, lz: number) => Placer.world(f.x, f.z, f.ry, lx, lz);
  const office = TRAILERS[0];
  const [ox, oz] = L(-4, 0);
  pl.put(office, ox, oz, f.ry, 991, { maxSlope: 6 });
  for (const [name, lx, lz, r, solid] of [
    ['wheel_loader', 9, -2, 0.4, true], ['dump_truck', 9, -12, -0.2, true], ['dirt_pile', -2, -14, 0, 0.4], ['dirt_pile', 4, -18, 1.2, 0.4],
    ['gravel_pile', -10, -14, 0.6, 0.4], ['portable_toilet', -10, 3, 0, 0.4], ['portable_toilet', -11.4, 3, 0, 0.4], ['lumber_stack_c', 2, -8, 1.57, 0.4],
    ['plywood_stack', -2, -7, 0, 0.4], ['truss_stack', 14, -16, 0, 0.4], ['jersey_barrier', 15, 4, 1.57, 0.4], ['jersey_barrier', 15, 7.5, 1.57, 0.4], ['pole_sign_rect', 4, 7, 0, 0.3],
  ] as [string, number, number, number, boolean | number][]) {
    const [x, z] = L(lx, lz);
    if (!pl.c.occ.blocked(x, z, 0.5) && !pl.onStreet(x, z, 1)) prop(pl, name, x, z, f.ry + r, solid);
  }
  // the next phase: the open ground between the courts is already graded, scraped and heaped with spoil
  const k = pl.k;
  for (let x = -470; x <= -250; x += 13) {
    for (let z = 90; z <= 262; z += 12) {
      const px = x;
      const pz = z;
      if (pl.c.occ.blocked(px, pz, 7) || pl.onStreet(px, pz, 10) || pl.drives.blocked(px, pz, 6)) continue;
      if (pl.sites.some((st) => Math.hypot(st.x - px, st.z - pz) < 20)) continue;
      const hs = [[-7, -6.5], [7, -6.5], [-7, 6.5], [7, 6.5]].map(([dx, dz]) => heightAt(px + dx, pz + dz));
      if (Math.max(...hs) - Math.min(...hs) > 0.12) {
        if (rng.chance(0.25)) prop(pl, 'dirt_pile', px, pz, rng.range(0, 6), 0.4);
        continue;
      }
      const ry = 0;
      k.at(px, pz, ry, () => k.box(0, -0.05, 0, 13.4, 0.1, 12.4, rng.pick([0x8a7458, 0x7d6a50, 0x947f62]), 'gravel', { cast: false }), heightAt(px, pz));
      if (rng.chance(0.3)) prop(pl, 'dirt_pile', px + rng.range(-3, 3), pz + rng.range(-3, 3), rng.range(0, 6), 0.4);
      else if (rng.chance(0.15)) prop(pl, 'traffic_cone', px, pz, 0, false);
    }
  }
  pl.landmarks.push({ name: 'Meadowbrook (new homes)', x: -360, z: 168, kind: 'district' });
}

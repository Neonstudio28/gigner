import type { BuildingDef } from '../buildings/catalog';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { HOUSES, ESTATES, SHACKS, TRAILERS, SUBURBAN, CABINS } from '../b2/houses';
import { heightAt, isWater } from '../terrain';
import { put } from '../b2/hull';
import { CAR_COLORS } from '../palette';
import { D, front, sAt, N, S } from './core';
import { hard, wear, worksYard, poleSign, level, type Rect, pave, paveR, prop, scatter, trashCorner, poleLine, carPark, forecourt, treeEdge, fence, hedge, weedLine, parked, stalls, lamps, GRAVEL, OLD_ASPHALT, RUBBISH, BEATERS, LUXURY, CARS } from './blocks';

const PI = Math.PI;

/** The highway strip west of downtown: gas, motel, diner, supermarket, donut shop and a used-car lot, each on its own paved lot. */
export function strip(pl: Placer) {
  const rng = new Rng(5150);
  const w = pl.net.byName('W Main St');
  const hwy = pl.net.byName('Old Hwy 10 W');
  const L = (f: { x: number; z: number; ry: number }, lx: number, lz: number) => Placer.world(f.x, f.z, f.ry, lx, lz);

  // Timberline Gas on the corner of Alder St, bins and a billboard behind
  const gas = D('gas');
  const g = front(pl, w, -297, S, gas, 2, 3, 'Timberline Gas');
  {
    const [bx, bz] = L(g, 6, -gas.d / 2 - 0.4);
    trashCorner(pl, rng, bx, bz, g.ry + PI, 10, true);
    const [sx, sz] = L(g, -gas.w / 2 - 3, -gas.d / 2 - 7);
    prop(pl, 'highway_billboard', sx, sz, g.ry + 0.5, 0.6);
    const [a, b] = [L(g, -gas.w / 2 - 1, -gas.d / 2 - 2.5), L(g, gas.w / 2 + 1, -gas.d / 2 - 2.5)];
    fence(pl, 'board', [[a[0], a[1]], [b[0], b[1]]], 0x6f5a44);
    weedLine(pl, rng, a[0], a[1], b[0], b[1], 1.8);
  }

  // Pine Rest Motel: rooms face their parking, arrow sign at the road
  const motel = D('motel');
  const m = front(pl, w, -372, S, motel, 15, 8, 'Pine Rest Motel');
  forecourt(pl, rng, m, motel.w, motel.d, 15, { fill: 0.5, side: 2 });
  {
    const [sx, sz] = L(m, motel.w / 2 + 0.5, motel.d / 2 + 13.5);
    prop(pl, 'motel_arrow_sign', sx, sz, m.ry + PI / 2, 0.5);
    for (const [lx, name] of [[-8, 'ice_freezer'], [-5.6, 'vending_soda'], [12, 'trash_can_street'], [-16, 'bench_metal']] as [number, string][]) {
      const [x, z] = L(m, lx, motel.d / 2 + 0.75);
      prop(pl, name, x, z, m.ry, 0.5);
    }
    const [bx, bz] = L(m, -14, -motel.d / 2 - 0.4);
    trashCorner(pl, rng, bx, bz, m.ry + PI, 9, true);
    const [px, pz] = L(m, 12, -motel.d / 2 - 7);
    prop(pl, 'pool_inground', px, pz, m.ry, false);
    const P = (lx: number, lz: number): [number, number] => {
      const [x, z] = L(m, lx, lz);
      return [x, z];
    };
    fence(pl, 'chain', [P(4, -motel.d / 2 - 1.5), P(4, -motel.d / 2 - 12.5), P(20, -motel.d / 2 - 12.5), P(20, -motel.d / 2 - 1.5)]);
    for (const lx of [6, 8, 16, 18]) {
      const [x, z] = L(m, lx, -motel.d / 2 - 3);
      prop(pl, rng.pick(['patio_chair', 'patio_table_umbrella_open', 'patio_chair']), x, z, m.ry + rng.range(-0.4, 0.4), 0.4);
    }
  }

  // Dottie's Diner between Alder St and 2nd Ave W, lot beside and behind
  const diner = D('diner');
  const dn = front(pl, w, -231, S, diner, 5, 4, "Dottie's Diner");
  carPark(pl, rng, -244, dn.z + diner.d / 2 + 2.5, -209.5, dn.z + diner.d / 2 + 34, { fill: 0.55, stops: true, lights: false });
  pl.entrance(-209.5, dn.z + 20, 1, 0, 6);
  trashCorner(pl, rng, dn.x - 4, dn.z + diner.d / 2 + 0.3, 0, 8, true);
  prop(pl, 'pole_sign_round', dn.x - diner.w / 2 - 3.5, dn.z - diner.d / 2 - 2, 0, 0.4);
  treeEdge(pl, rng, -246, dn.z + 37, -210, dn.z + 37, ['maple_medium', 'birch_cluster', 'oak_young'], 9);

  // Hollow Foods Market set back behind its car park inside the Riverside Dr loop
  const groc = D('grocery');
  const gr = front(pl, w, -264, N, groc, 37, 9, 'Hollow Foods Market');
  forecourt(pl, rng, gr, groc.w, groc.d, 36.5, { fill: 0.5, side: 16 });
  {
    for (let i = 0; i < 5; i++) {
      const [x, z] = L(gr, -9 + i * 0.75, groc.d / 2 + 0.8);
      prop(pl, 'shopping_cart', x, z, gr.ry + PI / 2, 0.3);
    }
    for (const [lx, name] of [[9, 'vending_soda'], [10.6, 'ice_freezer'], [12.6, 'newspaper_box_a'], [-12.5, 'donation_bin'], [-4, 'trash_can_street']] as [number, string][]) {
      const [x, z] = L(gr, lx, groc.d / 2 + 0.7);
      prop(pl, name, x, z, gr.ry, 0.5);
    }
    // loading dock and bale yard behind
    const [cx, cz] = L(gr, 0, -groc.d / 2 - 6);
    paveR(pl, cx, cz, gr.ry, groc.w + 30, 12, OLD_ASPHALT);
    const [dx, dz] = L(gr, 5, -groc.d / 2 - 0.2);
    prop(pl, 'loading_dock', dx, dz, gr.ry + PI, true);
    const [tx, tz] = L(gr, 5.5, -groc.d / 2 - 7.5);
    pl.car('delivery', tx, tz, gr.ry + PI / 2, 0xf2f1ec, { model: 'step_van' });
    const [bx, bz] = L(gr, -8, -groc.d / 2 - 0.4);
    trashCorner(pl, rng, bx, bz, gr.ry + PI, 11, true);
    const [ex, ez] = L(gr, groc.w / 2 + 15, -groc.d / 2 - 6);
    pl.entrance(ex, ez, Math.cos(gr.ry), -Math.sin(gr.ry), 6, 40);
    const [sx, sz] = L(gr, -groc.w / 2 - 13, groc.d / 2 + 34);
    poleSign(pl, 'groc', sx, sz, gr.ry, 'HOLLOW FOODS', 'OPEN 7 – 10 DAILY', '#2e6b3c', '#f4efe2');
    const [a, b] = [L(gr, -groc.w / 2 - 15, -groc.d / 2 - 12.6), L(gr, groc.w / 2 + 15, -groc.d / 2 - 12.6)];
    treeEdge(pl, rng, a[0], a[1], b[0], b[1], ['douglas_fir_medium', 'maple_medium', 'cedar_broad'], 8);
  }

  // Hole Lotta Donuts west of Riverside Dr
  const donut = D('donut');
  const dnt = front(pl, w, -362, N, donut, 14, 5, 'Hole Lotta Donuts');
  forecourt(pl, rng, dnt, donut.w, donut.d, 14, { fill: 0.55, side: 5 });
  {
    const [bx, bz] = L(dnt, 0, -donut.d / 2 - 0.4);
    trashCorner(pl, rng, bx, bz, dnt.ry + PI, 8, true);
  }

  // Hollow Motors used cars at the edge of town: pennants, a row out front, an office trailer
  const lot = pl.net.frontage(hwy, hwy.length - 34, N, hwy.full + 2.5 + 15);
  paveR(pl, lot.x, lot.z, lot.ry, 46, 30, 0x767a81);
  pl.landmarks.push({ name: 'Hollow Motors', x: lot.x, z: lot.z, kind: 'business' });
  const C = (lx: number, lz: number): [number, number] => {
    const [x, z] = L(lot, lx, lz);
    return [x, z];
  };
  stalls(pl, rng, ...C(20.6, 14.4), lot.ry + PI, 15, { fill: 0.92, list: [...CARS, ...LUXURY] });
  stalls(pl, rng, ...C(-20.6, -4), lot.ry, 9, { fill: 0.85, list: CARS });
  pl.put(pl.rng.pick(TRAILERS), ...C(12, -9), lot.ry, 91, { grade: false });
  for (const lx of [-15, -5, 5, 15]) {
    const [x, z] = C(lx, 14.6);
    pl.k.at(x, z, lot.ry, () => put(pl.k, 'pennant_string', 0, 4.2, 0, 0, { solid: false }), heightAt(x, z));
  }
  for (const lx of [-20, -10, 0, 10, 20]) {
    const [x, z] = C(lx, 14.6);
    pl.k.at(x, z, 0, () => pl.k.box(0, 0, 0, 0.09, 4.3, 0.09, 0xd8d8d4, 'metal'), heightAt(x, z));
  }
  poleSign(pl, 'motors', ...C(-21, 13), lot.ry, 'HOLLOW MOTORS', 'USED CARS · WE FINANCE', '#27407a', '#f4efe2');
  const [ex, ez] = C(0, 15);
  pl.entrance(ex, ez, Math.sin(lot.ry), Math.cos(lot.ry), 7);
  fence(pl, 'chain', [C(-23, 12), C(-23, -15), C(23, -15), C(23, 12)]);
  for (const name of ['tyre_stack', 'barrel_steel', 'oil_rack', 'tyre_rack', 'toolbox']) prop(pl, name, ...C(rng.range(-21, -8), rng.range(-14, -10)), rng.range(0, 6), 0.4);
}

const pickOf = (list: BuildingDef[]) => (rng: Rng) => rng.pick(list);

/** In-town housing: the residential streets south and east of downtown, older and closer-set toward the east side. */
export function homes(pl: Placer) {
  const R = (n: string) => pl.net.byName(n);
  const o = { setback: 6, gap: 5, jitter: 1.2, driveway: true, mailbox: true, car: 0.6, maxSlope: 8 };
  const tight = { ...o, setback: 4.5, gap: 3.5 };
  const mixed = (rng: Rng) => (rng.chance(0.45) ? rng.pick(SHACKS) : rng.pick(HOUSES));
  const both = (n: string, pick = pickOf(HOUSES), opt = o, s0 = 10, s1 = -10) => {
    for (const side of [N, S]) pl.along(R(n), side, s0, R(n).length + s1, pick, opt);
  };
  // the streets people live on first, then the avenues take whatever corner lots are left
  both('Maple St');
  both('Alder St');
  pl.along(R('Lakeshore Dr'), N, 10, R('Lakeshore Dr').length - 10, pickOf([...HOUSES, ...CABINS, ...CABINS]), o);
  both('E Main St', pickOf(HOUSES), tight);
  // Riverside Dr faces the park: houses all along its town side wherever the downtown blocks leave room behind their lots
  pl.along(R('Riverside Dr'), S, sAt(R('Riverside Dr'), -196, 'x'), R('Riverside Dr').length - 12, pickOf(HOUSES), tight);
  const newer = pickOf([...HOUSES.slice(8), ...SUBURBAN]);
  both('Heron Ct', newer);
  both('Birch Ct', newer);
  pl.bulb(R('Heron Ct'), newer, 4, o);
  pl.bulb(R('Birch Ct'), newer, 4, o);
  both('Lake Hill Rd', pickOf([...HOUSES, ...SUBURBAN]));
  for (const n of ['Division St S', '1st Ave W S', '1st Ave E S']) both(n);
  both('2nd Ave E', pickOf(HOUSES), tight);
  both('3rd Ave E', mixed, tight);
}

/** Riverside Park: the strip between Riverside Dr and the river - a gravel walk, benches, lamps, picnic tables and big trees. */
export function riverPark(pl: Placer) {
  const rng = new Rng(616);
  const r = pl.net.byName('Riverside Dr');
  const ok = (x: number, z: number) => !isWater(x, z) && !pl.c.occ.blocked(x, z, 1) && !pl.onStreet(x, z, 1) && !pl.pads.blocked(x, z, 1);
  let n = 0;
  for (let s = 70; s < r.length - 70; s += 4) {
    const f = pl.net.frontage(r, s, N, r.full + 5);
    if (!ok(f.x, f.z)) continue;
    pl.k.at(f.x, f.z, f.ry, () => pl.k.box(0, -0.3, 0, 4.3, 0.34, 2.2, 0xb3a98f, 'gravel', { cast: false }), heightAt(f.x, f.z));
    n++;
    const g = pl.net.frontage(r, s, N, r.full + 7.2);
    if (n % 5 === 2 && ok(g.x, g.z)) prop(pl, 'bench_wood', g.x, g.z, g.ry, 0.5);
    if (n % 9 === 4) prop(pl, 'street_lamp_old', ...xz(pl.net.frontage(r, s, N, r.full + 3.4)), 0, 0.3);
    if (n % 15 === 7 && ok(g.x, g.z)) prop(pl, 'trash_can_street', g.x, g.z, g.ry, 0.4);
    if (n % 4 === 0) {
      const t = pl.net.frontage(r, s, N, r.full + rng.range(10, 17));
      if (ok(t.x, t.z)) pl.trees.push({ kind: rng.pick(['maple_large', 'oak_large', 'willow_lake', 'oak_medium', 'birch_cluster', 'maple_medium']), x: t.x, z: t.z, s: rng.range(0.75, 1), ry: rng.range(0, 6) });
    }
    if (n % 11 === 6) {
      const t = pl.net.frontage(r, s, N, r.full + 11.5);
      if (ok(t.x, t.z)) prop(pl, 'picnic_table', t.x, t.z, t.ry + rng.range(-0.4, 0.4), 0.6);
    }
  }
  const mid = pl.net.frontage(r, r.length * 0.38, N, r.full + 9);
  pl.landmarks.push({ name: 'Riverside Park', x: mid.x, z: mid.z, kind: 'park' });
}
const xz = (f: { x: number; z: number }): [number, number] => [f.x, f.z];

type Site = Placer['sites'][number];
const local = (s: Site) => (lx: number, lz: number): [number, number] => {
  const [x, z] = Placer.world(s.x, s.z, s.ry, lx, lz);
  return [x, z];
};
const free = (pl: Placer, x: number, z: number, pad = 0.4) => !isWater(x, z) && !pl.c.occ.blocked(x, z, pad) && !pl.onStreet(x, z, 0.5) && !pl.drives.blocked(x, z, pad);
const drop = (pl: Placer, name: string, p: [number, number], ry = 0, solid: boolean | number = 0.5) => {
  if (free(pl, p[0], p[1])) prop(pl, name, p[0], p[1], ry, solid);
};

/** Cedar Ridge: big houses on big hedged lots up the hill west of town, pools and patios behind, good cars in the drive. */
export function ridge(pl: Placer) {
  const rng = new Rng(8080);
  const first = pl.sites.length;
  const o = { setback: 11, gap: 13, jitter: 2.5, driveway: true, mailbox: true, car: 0, maxSlope: 10 };
  for (const n of ['Ridgecrest Dr', 'Lakeview Ct']) {
    const r = pl.net.byName(n);
    for (const side of [N, S]) pl.along(r, side, n === 'Ridgecrest Dr' ? 46 : 24, r.length - 16, pickOf(ESTATES), o);
    pl.bulb(r, pickOf(ESTATES), 3, o);
  }
  pl.landmarks.push({ name: 'Cedar Ridge', x: -590, z: 200, kind: 'district' });
  for (const s of pl.sites.slice(first)) {
    const W = local(s);
    const hw = s.def.w / 2 + 5;
    const zb = -s.def.d / 2;
    const yd = 17;
    // clipped hedge round the back garden, open at the front
    const c: [number, number][] = [W(-hw, zb + 4), W(-hw, zb - yd), W(hw, zb - yd), W(hw, zb + 4)];
    for (let i = 0; i < 3; i++) hedge(pl, c[i][0], c[i][1], c[i + 1][0], c[i + 1][1], i === 1 ? 'hedge_tall' : 'hedge_straight');
    if (rng.chance(0.6)) {
      const p = W(-1, zb - 8.5);
      if (free(pl, p[0], p[1], 5)) {
        prop(pl, 'pool_inground', p[0], p[1], s.ry, false);
        drop(pl, 'pool_diving_board', W(-6, zb - 8.5), s.ry + PI / 2, 0.4);
      }
    }
    drop(pl, 'patio_table_umbrella_open', W(hw - 5, zb - 4), rng.range(0, 6));
    for (const dx of [-1.6, 1.6]) drop(pl, 'patio_chair', W(hw - 5 + dx, zb - 4.4), dx > 0 ? -PI / 2 : PI / 2, 0.3);
    drop(pl, 'bbq_grill', W(hw - 2.2, zb - 2), s.ry + PI);
    if (rng.chance(0.4)) drop(pl, 'basketball_hoop', W((s.def.drive ?? hw - 4) + 0.2, s.def.d / 2 + 0.6), s.ry, 0.3);
    // formal front: topiary by the door, flower beds under the windows, a specimen tree on the lawn
    for (const sx of [-1, 1]) {
      const t = W(sx * 2.2, s.def.d / 2 + 0.8);
      if (free(pl, t[0], t[1], 0.2)) pl.trees.push({ kind: 'topiary_ball', x: t[0], z: t[1], s: 1, ry: 0 });
      const b = W(sx * 5.4, s.def.d / 2 - 0.2);
      if (free(pl, b[0], b[1], 0.1)) pl.trees.push({ kind: 'flower_bed', x: b[0], z: b[1], s: 1.1, ry: s.ry });
    }
    const t = W(-hw + 4, s.def.d / 2 + 6);
    if (free(pl, t[0], t[1], 1.5)) pl.trees.push({ kind: rng.pick(['maple_large', 'oak_large', 'spruce_blue', 'cedar_broad']), x: t[0], z: t[1], s: rng.range(0.8, 1), ry: rng.range(0, 6) });
    if (s.def.drive !== undefined && rng.chance(0.85)) {
      const p = W(s.def.drive + rng.range(-1.2, 1.2), s.def.d / 2 + 2.6);
      if (!pl.c.occ.blocked(p[0], p[1], 1.5)) parked(pl, rng, p[0], p[1], s.ry + PI / 2, LUXURY);
    }
  }
}

/** The Flats: small worn houses close together on the lane and the gravel road by the slough, junk in every yard. */
export function flats(pl: Placer) {
  const rng = new Rng(3131);
  const first = pl.sites.length;
  const o = { setback: 3.2, gap: 3, jitter: 1.1, driveway: false, mailbox: true, car: 0, maxSlope: 7 };
  const tan = pl.net.byName('Tannery St');
  const sl = pl.net.byName('Slough Rd');
  for (const side of [N, S]) pl.along(tan, side, 14, tan.length - 26, pickOf(SHACKS), o);
  for (const side of [N, S]) pl.along(sl, side, 12, sl.length - 8, pickOf(SHACKS), o);
  pl.bulb(sl, pickOf(SHACKS), 3, o);
  pl.landmarks.push({ name: 'The Flats', x: 410, z: 210, kind: 'district' });
  const JUNK = ['tyre', 'tyre_stack', 'barrel_steel_rusty', 'trash_bag_a', 'trash_bag_b', 'pallet', 'cardboard_box_flat', 'gas_can', 'crate_wood_b', 'trash_can_metal_tipped', 'litter_can', 'litter_bottle', 'paint_cans', 'ladder_step', 'wheelbarrow'];
  for (const s of pl.sites.slice(first)) {
    const W = local(s);
    const hw = s.def.w / 2;
    const zb = -s.def.d / 2;
    // the car lives on a dirt patch beside the house, nose in
    const side = rng.pick([-1, 1]);
    const p = W(side * (hw + 2.6), 1);
    if (free(pl, p[0], p[1], 1.6)) {
      paveR(pl, p[0], p[1], s.ry, 3.6, 7.5, 0x9a8f7a, 'gravel', 0.03, false);
      if (rng.chance(0.75)) parked(pl, rng, p[0], p[1], s.ry + PI / 2 + rng.range(-0.08, 0.08), BEATERS);
    }
    for (let i = 0; i < 5; i++) drop(pl, rng.pick(JUNK), W(rng.range(-hw - 2, hw + 2), zb - rng.range(0.8, 7)), rng.range(0, 6), false);
    for (let i = 0; i < 2; i++) drop(pl, rng.pick(JUNK), W(-side * (hw + rng.range(0.7, 2)), rng.range(-3, 3)), rng.range(0, 6), false);
    if (rng.chance(0.5)) drop(pl, rng.pick(['satellite_dish_yard', 'doghouse', 'kiddie_pool', 'lawn_mower', 'bicycle']), W(rng.range(-hw, hw), s.def.d / 2 + rng.range(1, 2.4)), rng.range(0, 6), 0.3);
    if (rng.chance(0.3)) drop(pl, 'sign_for_sale', W(-side * (hw - 1), s.def.d / 2 + 2.6), s.ry, false);
    // out front: grass worn to dirt, junk by the step, a dead car on the verge, sagging chain-link
    const fz = s.def.d / 2 + 1.4;
    const loose = (q: [number, number], r = 0.25) => !isWater(q[0], q[1]) && !hard(pl, q[0], q[1], r) && !pl.onStreet(q[0], q[1], 0.3);
    for (let i = 0; i < 2; i++) {
      const q = W(rng.range(-hw * 0.6, hw * 0.6), fz + rng.range(-0.2, 0.6));
      if (!pl.onStreet(q[0], q[1], 0.9)) paveR(pl, q[0], q[1], s.ry + rng.range(-0.25, 0.25), rng.range(2.4, 5), rng.range(1.4, 2.2), rng.pick([0x8a7c62, 0x7f7460, 0x93866c]), 'gravel', 0.06, false);
    }
    for (let i = 0; i < 5; i++) {
      const q = W(rng.range(-hw - 1, hw + 1), fz + rng.range(-0.6, 2.6));
      if (loose(q)) prop(pl, rng.pick(JUNK), q[0], q[1], rng.range(0, 6), false);
    }
    if (rng.chance(0.55)) {
      const q = W(rng.range(-hw * 0.5, hw * 0.5), fz + 0.3);
      if (loose(q, 0.5)) prop(pl, rng.pick(['patio_chair', 'bbq_grill', 'barrel_steel_rusty', 'tyre_stack', 'wheelie_bin', 'trash_can_metal', 'lawn_mower', 'bmx_bike']), q[0], q[1], rng.range(0, 6), 0.35);
    }
    if (rng.chance(0.45)) {
      const a = W(-hw - 1.2, fz + 3.1);
      const b = W(hw + 1.2, fz + 3.1);
      if (!pl.onStreet(a[0], a[1], 0.4) && !pl.onStreet(b[0], b[1], 0.4) && !hard(pl, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 1.2)) fence(pl, 'chain', [a, b]);
    }
    for (let i = 0; i < 7; i++) {
      const q = W(rng.range(-hw - 3, hw + 3), rng.range(zb - 8, s.def.d / 2 + 3));
      if (free(pl, q[0], q[1], 0.2)) pl.trees.push({ kind: rng.pick(['weeds_a', 'weeds_b', 'grass_tall_a', 'grass_tall_b', 'dandelion_patch']), x: q[0], z: q[1], s: rng.range(0.9, 1.5), ry: rng.range(0, 6) });
    }
    if (rng.chance(0.3)) {
      const q = W(-side * (hw + 3), zb - 4);
      if (free(pl, q[0], q[1], 1)) pl.trees.push({ kind: rng.pick(['dead_tree', 'snag_conifer', 'poplar_tall']), x: q[0], z: q[1], s: rng.range(0.6, 0.9), ry: rng.range(0, 6) });
    }
  }
  // nobody has a driveway: the cars sit half on the verge along the lane
  for (const r of [tan, sl])
    for (const side of [N, S])
      for (let d = rng.range(10, 18); d < r.length - 12; d += rng.range(8, 17)) {
        const f = pl.net.frontage(r, d, side, r.full + 0.75);
        if (rng.chance(0.3) || isWater(f.x, f.z) || hard(pl, f.x, f.z, 2.3)) continue;
        parked(pl, rng, f.x, f.z, f.ry + (side > 0 ? 0 : PI) + rng.range(-0.06, 0.06), BEATERS);
      }
  // sagging power line down the lane, a corner lot gone to weeds and dumped rubbish
  const pts: [number, number][] = [];
  for (let s = 8; s < tan.length - 6; s += 34) pts.push(xz(pl.net.frontage(tan, s, S, tan.full + 0.9)));
  poleLine(pl, pts, { h: 8.5, lamps: true });
  const v = pl.net.frontage(sl, 30, N, sl.full + 9);
  scatter(pl, rng, [...RUBBISH, 'tyre', 'tyre_stack', 'barrel_steel_rusty', 'pallet', 'shopping_cart'], v.x - 8, v.z - 6, v.x + 8, v.z + 6, 16);
}

/** Whispering Pines: single-wides set at an angle round a gravel loop off Fairground Rd, a shared green with mailboxes and bins in the middle. */
export function trailerCourt(pl: Placer, road = 'Pine Loop', label = 'Whispering Pines', mark: [number, number] = [-512, -84], seed = 2727, rows?: [1 | -1, number, number][]) {
  const rng = new Rng(seed);
  const loop = pl.net.byName(road);
  const first = pl.sites.length;
  const lean = 0.32;
  const row = (side: 1 | -1, s0: number, s1: number, step: number) => {
    for (let s = s0; s < s1; s += step) {
      const def = rng.pick(TRAILERS);
      const f = pl.net.frontage(loop, s, side, loop.full + 2.6 + def.w / 2);
      // long axis pointing away from the lane, raked like a herringbone, door side toward the next lot
      pl.put(def, f.x, f.z, f.ry + PI / 2 - lean, (rng.next() * 1e6) | 0, { maxSlope: 6 });
    }
  };
  for (const [sd, a, b] of rows ?? [[N, 10, loop.length - 6], [S, 16, 78], [S, loop.length - 74, loop.length - 14]]) row(sd, a < 0 ? loop.length + a : a, b < 0 ? loop.length + b : b, 12.5);
  pl.landmarks.push({ name: label, x: mark[0], z: mark[1], kind: 'district' });
  const YARD = ['patio_chair', 'patio_chair', 'bbq_grill', 'kiddie_pool', 'satellite_dish_yard', 'tyre', 'bicycle', 'bmx_bike', 'garden_gnome', 'wheelie_bin', 'trash_can_metal', 'lawn_mower', 'gas_can', 'crate_wood_a', 'doghouse', 'planter_round'];
  for (const s of pl.sites.slice(first)) {
    const W = local(s);
    const hw = s.def.w / 2;
    // gravel pad in front of the deck with the car on it
    const p = W(rng.range(-2, 2), s.def.d / 2 + 2.2);
    if (free(pl, p[0], p[1], 1.4)) {
      paveR(pl, p[0], p[1], s.ry, 7, 3.4, 0xa39a86, 'gravel', 0.03, false);
      if (rng.chance(0.8)) parked(pl, rng, p[0], p[1], s.ry + rng.range(-0.06, 0.06) + (rng.chance(0.5) ? PI : 0), BEATERS);
    }
    for (let i = 0; i < 4; i++) drop(pl, rng.pick(YARD), W(rng.range(-hw, hw), rng.pick([s.def.d / 2 - 0.4, -s.def.d / 2 + 0.6]) + rng.range(-0.5, 0.5)), rng.range(0, 6), 0.3);
    if (rng.chance(0.35)) drop(pl, 'clothesline', W(rng.range(-3, 3), -s.def.d / 2 - 0.6), s.ry, 0.2);
    for (let i = 0; i < 4; i++) {
      const q = W(rng.range(-hw - 1, hw + 1), rng.range(-s.def.d / 2 - 2, -s.def.d / 2 + 0.4));
      if (free(pl, q[0], q[1], 0.2)) pl.trees.push({ kind: rng.pick(['weeds_a', 'weeds_b', 'grass_tall_a', 'fern']), x: q[0], z: q[1], s: rng.range(0.9, 1.4), ry: rng.range(0, 6) });
    }
    const t = W(-hw - 2.5, -s.def.d / 2 - 3);
    if (rng.chance(0.55) && free(pl, t[0], t[1], 1.2)) pl.trees.push({ kind: rng.pick(['pine_tall', 'pine_medium', 'douglas_fir_medium', 'pine_tall']), x: t[0], z: t[1], s: rng.range(0.8, 1.05), ry: rng.range(0, 6) });
  }
  // the green in the middle: mailboxes, bins, a picnic table, swings, the park's propane tank and a row of pines
  const [cx, cz] = [-512, -84];
  const at = (name: string, dx: number, dz: number, ry = 0, solid: boolean | number = 0.5) => drop(pl, name, [cx + dx, cz + dz], ry, solid);
  for (let i = 0; i < 4; i++) at('mailbox_post', -6 + i * 0.9, 9, 0, 0.2);
  at('dumpster_green', 6, 9, 0);
  at('dumpster_blue_open', 8.6, 9, 0);
  at('picnic_table', -2, 0, 0.3);
  at('playground_swing', 5, -3, 0.2);
  at('seesaw', -7, -5, 1.1);
  at('propane_tank_large', 0, -10, 0);
  at('payphone_post', -8.5, 9, 0, 0.3);
  scatter(pl, rng, RUBBISH, cx + 3, cz + 7, cx + 11, cz + 12, 8);
  // sign and lamp where the loop leaves Fairground Rd
  const fair = pl.net.byName('Fairground Rd');
  const g = pl.net.frontage(fair, 40, S, fair.full + 2.2);
  poleSign(pl, 'pines', g.x, g.z, g.ry + PI / 2, 'WHISPERING PINES', 'MOBILE HOME PARK', '#f1e9cf', '#2f4f3a');
  const pts: [number, number][] = [];
  for (let s = 6; s < loop.length; s += 30) pts.push(xz(pl.net.frontage(loop, s, S, loop.full + 1)));
  poleLine(pl, pts, { h: 8.5, lamps: true });
}

/**
 * Highway 10 east of town: the working edge. A wrecking yard and a truck stop on the north side, a builder's
 * yard and a plant-hire yard on the south, each fenced, gated onto the highway and full of its own trade.
 */
export function industry(pl: Placer) {
  const rng = new Rng(6161);
  const hw = pl.net.byName('Old Hwy 10 E');
  const e = hw.full + 5.5;
  const office = D('lumberOffice');
  const shed = D('machineShed');
  // wreckers: rows of dead cars nose to tail, tyres and drums along the fence
  {
    const r: Rect = { x0: 608, z0: -64, x1: 674, z1: -e };
    level(r);
    pl.force(office, r.x1 - 11, r.z1 - 9.5, 0, 6162);
    pl.force(shed, r.x0 + 13, r.z1 - 8, 0, 6163);
    worksYard(pl, rng, r, 's');
    for (let row = 0; row < 3; row++)
      for (let x = r.x0 + 16; x < r.x1 - 6; x += 5.6) {
        const z = r.z0 + 12 + row * 11;
        if (rng.chance(0.8) && !hard(pl, x, z, 2.4)) parked(pl, rng, x + rng.range(-0.4, 0.4), z + rng.range(-0.5, 0.5), rng.pick([0, PI]) + rng.range(-0.2, 0.2), BEATERS);
      }
    scatter(pl, rng, ['tyre_stack', 'tyre', 'barrel_steel_rusty', 'tyre_rack', 'oil_rack', 'pallet', 'gas_can', 'toolbox'], r.x0 + 3, r.z0 + 4, r.x1 - 3, r.z1 - 3, 26, 0.4);
    wear(pl, rng, r.x0 + 2, r.z0 + 2, r.x1 - 2, r.z1 - 2, 60);
    pl.entrance((r.x0 + r.x1) / 2, r.z1, 0, 1, 6.5);
    poleSign(pl, 'wreck', r.x0 + 26, r.z1 + 2.2, 0, 'HOLLOW AUTO WRECKING', 'USED PARTS · TOWING', '#e8d44a', '#1d1d1f');
    parked(pl, rng, (r.x0 + r.x1) / 2 + 9, r.z1 - 5, PI / 2, [['pickup', 'tow_truck']]);
    pl.landmarks.push({ name: 'Hollow Auto Wrecking', x: 641, z: -38, kind: 'business' });
  }
  // truck stop: a wide worn lot, rigs and dropped trailers in echelon, fuel tanks, a row of pumps' worth of clutter
  {
    const r: Rect = { x0: 692, z0: -62, x1: 778, z1: -e };
    level(r);
    pave(pl, r.x0, r.z0, r.x1, r.z1, OLD_ASPHALT, 'asphalt', 0.04);
    wear(pl, rng, r.x0 + 1, r.z0 + 1, r.x1 - 1, r.z1 - 1, 40);
    fence(pl, 'chain', [[r.x0, r.z1 - 2], [r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1 - 2]]);
    const rigs: [string, boolean, number][] = [['semi_cabover', true, 0x2f5d8a], ['trailer_box', false, 0xe9e6dc], ['semi_conventional', true, 0xb3261e], ['trailer_tanker', false, 0xc9c4b6], ['flatbed_truck', false, 0xd9a21c], ['trailer_logs', false, 0x6b6f73]];
    rigs.forEach(([model, trailer, col], i) => {
      const x = r.x0 + 12 + i * 11.5;
      if (x < r.x1 - 8) pl.car('semi', x + (trailer ? 4 : 0), r.z0 + 13 + (i % 2) * 2, PI / 2 + 0.5, col, { model, trailer });
    });
    for (const [name, x, z] of [['fuel_tank_stand', r.x1 - 7, r.z1 - 9], ['propane_tank_large', r.x1 - 7, r.z1 - 16], ['portable_toilet', r.x0 + 3, r.z1 - 8], ['ice_freezer', r.x0 + 3, r.z1 - 11], ['vending_soda', r.x0 + 3, r.z1 - 13.2], ['payphone_post', r.x0 + 3, r.z1 - 15.4], ['dumpster_green', r.x0 + 4, r.z0 + 3]] as [string, number, number][]) prop(pl, name, x, z, name === 'dumpster_green' ? 0 : PI / 2, true);
    scatter(pl, rng, ['traffic_barrel', 'traffic_cone', 'tyre', 'pallet', 'jersey_barrier', 'barrel_steel', ...RUBBISH], r.x0 + 3, r.z0 + 3, r.x1 - 3, r.z1 - 3, 28);
    lamps(pl, [[r.x0 + 20, r.z0 + 1.2, 0], [r.x1 - 20, r.z0 + 1.2, 0], [r.x0 + 30, r.z1 - 1.5, PI], [r.x1 - 30, r.z1 - 1.5, PI]]);
    stalls(pl, rng, r.x0 + 26, r.z1 - 4, PI, 9, { fill: 0.5, list: CARS });
    pl.entrance(r.x0 + 12, r.z1, 0, 1, 9);
    pl.entrance(r.x1 - 14, r.z1, 0, 1, 9);
    poleSign(pl, 'truck', r.x1 - 26, r.z1 + 2.2, 0, 'HWY 10 TRUCK PARK', 'DIESEL · SCALES · 24 HR', '#b3261e', '#f4efe2');
    weedLine(pl, rng, r.x0, r.z0 - 0.5, r.x1, r.z0 - 0.5, 2.4);
    pl.landmarks.push({ name: 'Hwy 10 Truck Park', x: 735, z: -38, kind: 'business' });
  }
  // builder's yard
  {
    const r: Rect = { x0: 664, z0: e, x1: 722, z1: 62 };
    level(r);
    pl.force(office, r.x1 - 12, r.z0 + 9.5, PI, 6164);
    worksYard(pl, rng, r, 'n');
    for (let x = r.x0 + 6; x < r.x1 - 10; x += rng.range(4.6, 6.2)) if (!hard(pl, x, r.z1 - 7.5, 2.2)) prop(pl, rng.pick(['lumber_stack_a', 'lumber_stack_b', 'lumber_stack_c', 'plywood_stack', 'lumber_shed']), x, r.z1 - 7.5, 0, true);
    for (let x = r.x0 + 12; x < r.x1 - 12; x += rng.range(6, 8)) if (!hard(pl, x, r.z0 + 22, 2)) prop(pl, rng.pick(['pallet_stack', 'gravel_pile', 'cement_mixer', 'plywood_stack', 'scaffold_tower']), x, r.z0 + 22 + rng.range(-1, 1), rng.range(-0.2, 0.2), true);
    pl.entrance((r.x0 + r.x1) / 2, r.z0, 0, -1, 6.5);
    poleSign(pl, 'build', r.x0 + 12, r.z0 - 2.2, 0, 'CASCADE BUILDERS SUPPLY', 'LUMBER · CEMENT · HIRE', '#2f4f3a', '#f1e9cf');
    parked(pl, rng, r.x0 + 12, r.z0 + 8, 0.1, [['pickup', 'flatbed_truck'], ['pickup', 'pickup_4x4'], ['van', 'step_van']]);
    pl.landmarks.push({ name: 'Cascade Builders Supply', x: 693, z: 38, kind: 'business' });
  }
  // plant hire: loaders and tippers on packed dirt, spoil heaps, containers for stores
  {
    const r: Rect = { x0: 738, z0: e + 2, x1: 798, z1: 64 };
    level(r);
    pl.force(office, r.x0 + 9, r.z0 + 8.5, PI, 6165);
    pl.force(shed, r.x1 - 24, r.z1 - 22, PI, 6166);
    pave(pl, r.x0, r.z0, r.x1, r.z1, 0x8f8672, 'gravel', 0.04);
    fence(pl, 'chain', [[r.x0 + 34, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1], [r.x0, r.z0], [r.x0 + 26, r.z0]]);
    pl.car('semi', r.x0 + 10, r.z0 + 22, 0.2, 0xd9a21c, { model: 'dump_truck' });
    pl.car('semi', r.x0 + 10, r.z0 + 28, 0.1, 0xd9a21c, { model: 'dump_truck' });
    pl.car('tractor', r.x0 + 30, r.z0 + 30, 0.9, 0xd9a21c, { model: 'wheel_loader' });
    pl.car('tractor', r.x0 + 44, r.z0 + 14, -0.4, 0xd9a21c, { model: 'log_loader' });
    for (const [x, z, ry] of [[r.x1 - 5, r.z0 + 10, PI / 2], [r.x1 - 5, r.z0 + 24, PI / 2], [r.x1 - 9, r.z1 - 4, 0]]) prop(pl, 'shipping_container', x, z, ry, true);
    for (let x = r.x0 + 8; x < r.x1 - 22; x += rng.range(8, 11)) prop(pl, rng.pick(['gravel_pile', 'dirt_pile', 'dirt_pile']), x, r.z1 - 6 + rng.range(-1, 1), rng.range(0, 6), true);
    scatter(pl, rng, ['traffic_barrel', 'traffic_cone', 'jersey_barrier', 'barricade_a', 'tyre', 'barrel_steel', 'pallet', 'sawhorse', 'wheelbarrow'], r.x0 + 3, r.z0 + 3, r.x1 - 8, r.z1 - 10, 20, 0.4);
    prop(pl, 'portable_toilet', r.x0 + 20, r.z0 + 3, 0, true);
    poleSign(pl, 'plant', r.x1 - 12, r.z0 - 4.2, 0, 'RIDGELINE PLANT HIRE', 'EXCAVATION · HAULAGE', '#d9a21c', '#1d1d1f');
    prop(pl, 'fuel_tank_stand', r.x0 + 4, r.z0 + 34, PI / 2, true);
    pl.entrance(r.x0 + 30, r.z0, 0, -1, 7.5);
    lamps(pl, [[r.x0 + 20, r.z1 - 1.2, PI], [r.x1 - 16, r.z1 - 1.2, PI]]);
    weedLine(pl, rng, r.x0, r.z1 + 0.5, r.x1, r.z1 + 0.5, 2.4);
    pl.landmarks.push({ name: 'Ridgeline Plant Hire', x: 768, z: 40, kind: 'business' });
  }
}

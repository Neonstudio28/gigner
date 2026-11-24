import type { BuildingDef } from '../buildings/catalog';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { HOUSES, ESTATES, SHACKS, TRAILERS } from '../b2/houses';
import { heightAt, isWater } from '../terrain';
import { put } from '../b2/hull';
import { CAR_COLORS } from '../palette';
import { D, front, sAt, N, S } from './core';
import { pave, paveR, prop, scatter, trashCorner, poleLine, carPark, forecourt, treeEdge, fence, hedge, weedLine, parked, stalls, lamps, GRAVEL, OLD_ASPHALT, RUBBISH, BEATERS, LUXURY, CARS } from './blocks';

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
    prop(pl, 'pole_sign_rect', sx, sz, gr.ry, 0.5);
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
  prop(pl, 'pole_sign_rect', ...C(-21, 13), lot.ry, 0.5);
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
  pl.along(R('Lakeshore Dr'), N, 10, R('Lakeshore Dr').length - 10, pickOf(HOUSES), o);
  both('E Main St', pickOf(HOUSES), tight);
  pl.along(R('Riverside Dr'), S, sAt(R('Riverside Dr'), 206, 'x'), R('Riverside Dr').length - 12, pickOf(HOUSES), tight);
  both('Heron Ct');
  both('Birch Ct');
  pl.bulb(R('Heron Ct'), pickOf(HOUSES), 4, o);
  pl.bulb(R('Birch Ct'), pickOf(HOUSES), 4, o);
  both('Lake Hill Rd');
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
    for (let i = 0; i < 7; i++) {
      const q = W(rng.range(-hw - 3, hw + 3), rng.range(zb - 8, s.def.d / 2 + 3));
      if (free(pl, q[0], q[1], 0.2)) pl.trees.push({ kind: rng.pick(['weeds_a', 'weeds_b', 'grass_tall_a', 'grass_tall_b', 'dandelion_patch']), x: q[0], z: q[1], s: rng.range(0.9, 1.5), ry: rng.range(0, 6) });
    }
    if (rng.chance(0.3)) {
      const q = W(-side * (hw + 3), zb - 4);
      if (free(pl, q[0], q[1], 1)) pl.trees.push({ kind: rng.pick(['dead_tree', 'snag_conifer', 'poplar_tall']), x: q[0], z: q[1], s: rng.range(0.6, 0.9), ry: rng.range(0, 6) });
    }
  }
  // sagging power line down the lane, a corner lot gone to weeds and dumped rubbish
  const pts: [number, number][] = [];
  for (let s = 8; s < tan.length - 6; s += 34) pts.push(xz(pl.net.frontage(tan, s, S, tan.full + 0.9)));
  poleLine(pl, pts, { h: 8.5, lamps: true });
  const v = pl.net.frontage(sl, 30, N, sl.full + 9);
  scatter(pl, rng, [...RUBBISH, 'tyre', 'tyre_stack', 'barrel_steel_rusty', 'pallet', 'shopping_cart'], v.x - 8, v.z - 6, v.x + 8, v.z + 6, 16);
}

/** Whispering Pines: single-wides set at an angle round a gravel loop off Fairground Rd, a shared green with mailboxes and bins in the middle. */
export function trailerCourt(pl: Placer) {
  const rng = new Rng(2727);
  const loop = pl.net.byName('Pine Loop');
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
  row(N, 10, loop.length - 6, 12.5);
  row(S, 16, 78, 12.5);
  row(S, loop.length - 74, loop.length - 14, 12.5);
  pl.landmarks.push({ name: 'Whispering Pines', x: -512, z: -84, kind: 'district' });
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
  prop(pl, 'pole_sign_rect', g.x, g.z, g.ry + PI / 2, 0.4);
  const pts: [number, number][] = [];
  for (let s = 6; s < loop.length; s += 30) pts.push(xz(pl.net.frontage(loop, s, S, loop.full + 1)));
  poleLine(pl, pts, { h: 8.5, lamps: true });
}

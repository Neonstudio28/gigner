import type { BuildingDef } from '../buildings/catalog';
import type { Road } from '../roads/network';
import type { Col } from '../core/kit';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { heightAt, isWater, LAKE } from '../terrain';
import { put } from '../b2/hull';
import { HOUSES } from '../b2/houses';
import { DISTRICT } from '../b2/district';
import { railFence, securityFence, cow } from '../props';
import { vehicle, VEHICLE_LENGTH } from '../vehicles';
import { asset } from '../assets';
import { addZone } from '../buildings/interiors';
import { CAR_COLORS } from '../palette';

const PI = Math.PI;
const DD = new Map<string, BuildingDef>(DISTRICT.map((d) => [d.id, d]));
const D = (id: string) => DD.get(id)!;
type Frame = { x: number; z: number; ry: number };

/** Lot frame beside a road: centre `dist` back from the centre line at the point nearest (x, z), on the side facing (x, z). */
function beside(pl: Placer, r: Road, x: number, z: number, dist: number): Frame {
  let best = 0;
  let bd = Infinity;
  for (let s = 0; s <= r.length; s += 2) {
    const p = r.at(s);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  const a = pl.net.frontage(r, best, 1, dist);
  const b = pl.net.frontage(r, best, -1, dist);
  return Math.hypot(a.x - x, a.z - z) < Math.hypot(b.x - x, b.z - z) ? a : b;
}

/** Ground prop in a lot frame (local x to the right, local z towards the road). */
function at(pl: Placer, f: Frame, name: string, lx: number, lz: number, ry = 0, solid: boolean | number = true, o: { s?: number } = {}) {
  const [x, z] = Placer.world(f.x, f.z, f.ry, lx, lz);
  if (isWater(x, z)) return;
  pl.k.at(x, z, f.ry + ry, () => put(pl.k, name, 0, 0, 0, 0, { solid, ...o }), heightAt(x, z));
}

/** Keeps the forest off a rectangle of a lot frame. */
function clearing(pl: Placer, f: Frame, x0: number, x1: number, z0: number, z1: number) {
  const c = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([lx, lz]) => Placer.world(f.x, f.z, f.ry, lx, lz));
  const xs = c.map((p) => p[0]);
  const zs = c.map((p) => p[1]);
  const ax = Math.min(...xs);
  const bx = Math.max(...xs);
  const az = Math.min(...zs);
  const bz = Math.max(...zs);
  pl.clearings.push({ x: (ax + bx) / 2, z: (az + bz) / 2, w: bx - ax, d: bz - az });
}

function build(pl: Placer, f: Frame, def: BuildingDef, lx: number, lz: number, ry = 0, seed = 1) {
  const [x, z] = Placer.world(f.x, f.z, f.ry, lx, lz);
  pl.force(def, x, z, f.ry + ry, seed);
}

function tree(pl: Placer, f: Frame, kind: string, lx: number, lz: number, s = 1) {
  const [x, z] = Placer.world(f.x, f.z, f.ry, lx, lz);
  if (!isWater(x, z) && !pl.c.occ.blocked(x, z, 0.3)) pl.trees.push({ kind, x, z, s, ry: (lx * 7.3 + lz * 3.1) % 6.28 });
}

function car(pl: Placer, f: Frame, type: Parameters<typeof vehicle>[2], lx: number, lz: number, ry: number, col: Col, model?: string, trailer = false) {
  const [x, z] = Placer.world(f.x, f.z, f.ry, lx, lz);
  const a = f.ry + ry;
  const info = model ? asset(model)?.info : undefined;
  const L = (info?.length as number | undefined) ?? VEHICLE_LENGTH[type];
  const W = Math.min(2.6, (info?.width as number | undefined) ?? 2.1);
  pl.k.at(0, 0, 0, () => {
    pl.k.solid(x, z, L - 0.2, W, a);
    if (trailer) pl.k.solid(x - Math.cos(a) * 9.4, z + Math.sin(a) * 9.4, 13, 2.6, a);
    vehicle(pl.k, pl.c.signs, type, x, z, a, col, { model, trailer });
  }, heightAt(x, z));
}

function fence(pl: Placer, f: Frame, pts: [number, number][], col: Col = 0x7a6248) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = Placer.world(f.x, f.z, f.ry, pts[i][0], pts[i][1]);
    const [bx, bz] = Placer.world(f.x, f.z, f.ry, pts[i + 1][0], pts[i + 1][1]);
    railFence(pl.k, ax, az, bx, bz, col, 1.25, heightAt);
  }
}

/** A working farm: house by the road, barn and sheds round a gravel yard, silo, stock paddock and a corn field behind. */
function farm(pl: Placer, r: Road, x: number, z: number, seed: number, o: { corn?: boolean; cows?: number; silo?: boolean } = {}) {
  const rng = new Rng(seed);
  const f = beside(pl, r, x, z, r.full + 16);
  const k = pl.k;
  clearing(pl, f, -86, 84, (o.corn ?? true) ? -112 : -50, 18);
  build(pl, f, rng.pick(HOUSES), 0, 0, 0, seed);
  build(pl, f, D('barn'), -30, -26, 0, seed + 1);
  build(pl, f, D('machineShed'), -38, -1, PI / 2, seed + 2);
  // gravel yard between them
  for (let gx = -24; gx <= -10; gx += 4) for (let gz = -18; gz <= 14; gz += 4) {
    const [wx, wz] = Placer.world(f.x, f.z, f.ry, gx, gz);
    if (!pl.c.occ.blocked(wx, wz, 0)) k.at(wx, wz, f.ry, () => k.box(0, -0.25, 0, 4.05, 0.3, 4.05, 0x9a9282, 'gravel', { cast: false }), heightAt(wx, wz));
  }
  if (o.silo ?? true) {
    at(pl, f, 'grain_silo', -41, -34, 0);
    at(pl, f, rng.pick(['grain_bin', 'grain_silo']), -47, -30, 0.4);
  }
  at(pl, f, 'grain_bin', -16, -40, 0);
  at(pl, f, 'windmill_farm', 16, -18, 0.6, 0.5);
  at(pl, f, 'farm_water_tank', 20, -24, 0);
  at(pl, f, 'fuel_tank_stand', -22, 8, PI / 2);
  at(pl, f, 'chicken_coop', 14, -8, -PI / 2);
  at(pl, f, 'well_pump', 9, -12, 0);
  at(pl, f, 'hay_stack', -19, -14, 0.2);
  at(pl, f, 'propane_tank_large', -12, -2, PI / 2);
  at(pl, f, 'greenhouse_small', 12, -24, 0);
  for (let i = 0; i < 6; i++) at(pl, f, 'hay_bale_round', -14 + rng.range(-3, 3), -26 + i * 1.5 + rng.range(-0.3, 0.3), rng.range(-0.2, 0.2));
  for (let i = 0; i < 4; i++) at(pl, f, rng.pick(['tyre', 'oil_tank', 'wheelie_bin', 'firewood_stack', 'tyre_stack']), -24 + rng.range(-2, 8), -8 + rng.range(-6, 6), rng.range(0, 6), false);
  car(pl, f, 'pickup', -15, 6, rng.range(-0.4, 0.4), rng.pick(CAR_COLORS), rng.pick(['pickup_50s', 'pickup_80s', 'pickup_4x4']));
  if (rng.chance(0.6)) car(pl, f, 'tractor', -22, -22, rng.range(0, 6), rng.pick([0x2f6b3f, 0xb3261e, 0x2a5f9a]));
  // paddock with stock, trough and a shade tree
  const n = o.cows ?? 6;
  if (n) {
    fence(pl, f, [[-42, -40], [-80, -40], [-80, 6], [-42, 6], [-42, -4]]);
    for (let i = 0; i < n; i++) {
      const [cx, cz] = Placer.world(f.x, f.z, f.ry, rng.range(-76, -46), rng.range(-36, 2));
      cow(k, cx, cz, rng.range(0, 6), rng, heightAt(cx, cz));
    }
    at(pl, f, 'feed_trough', -50, -10, PI / 2);
    at(pl, f, 'hay_bale_round', -53, -14, 0.3);
    tree(pl, f, 'oak_large', -66, -22, 0.9);
  }
  if (o.corn ?? true) {
    const [cx, cz] = Placer.world(f.x, f.z, f.ry, 28, -78);
    pl.cornFields.push({ x: cx, z: cz, w: 96, d: 56, ry: f.ry });
    at(pl, f, 'scarecrow', 6, -62, 0, false);
    fence(pl, f, [[-22, -48], [78, -48]]);
  }
  // shelter belt and yard trees
  for (let i = 0; i < 6; i++) tree(pl, f, 'poplar_tall', 30, -30 + i * 7, rng.range(0.8, 1));
  for (const [tx, tz, kind] of [[-9, 9, 'maple_large'], [10, 8, 'oak_medium'], [-4, -14, 'apple_tree'], [3, -18, 'apple_tree'], [22, 2, 'birch_cluster']] as const) tree(pl, f, kind, tx, tz, rng.range(0.85, 1.05));
  fence(pl, f, [[-48, 13], [-12, 13]], 0xf1ede2);
  fence(pl, f, [[12, 13], [34, 13], [34, -44]], 0xf1ede2);
  pl.landmarks.push({ name: rng.pick(['Hansen Farm', 'Miller Farm', 'Okafor Farm', 'Lindqvist Farm', 'Cedar Row Farm', 'Whitlock Farm', 'Sorensen Farm', 'Twin Oaks Farm']), x: f.x, z: f.z, kind: 'farm' });
}

export function farms(pl: Placer) {
  const R = (n: string) => pl.net.byName(n);
  farm(pl, R('Orchard Rd'), 200, -400, 301);
  farm(pl, R('Orchard Rd'), 440, -280, 302, { cows: 0 });
  farm(pl, R('Hansen Rd'), -220, -500, 303);
  farm(pl, R('Hansen Rd'), -470, -360, 304, { corn: false, cows: 9 });
  farm(pl, R('County Rd 5'), -60, -560, 305);
  farm(pl, R('Miller Dairy Rd'), -1500, 110, 306, { cows: 10, corn: false });
  farm(pl, R('Ridgeview Ln'), -1150, -110, 307);
  farm(pl, R('Eastside Rd'), 1210, -240, 308);
  farm(pl, R('Homestead Rd'), 1340, 170, 309, { cows: 5 });
  farm(pl, R('Cougar Creek Rd'), -1010, 200, 310, { silo: false });
}

/** Gravel pad over a rectangle of a lot frame (skips anything built). */
function gravel(pl: Placer, f: Frame, x0: number, x1: number, z0: number, z1: number, col: Col = 0x9a9282, mat = 'gravel') {
  const k = pl.k;
  for (let gx = x0 + 3; gx < x1 + 3; gx += 6) for (let gz = z0 + 3; gz < z1 + 3; gz += 6) {
    const [wx, wz] = Placer.world(f.x, f.z, f.ry, gx, gz);
    if (isWater(wx, wz)) continue;
    k.at(wx, wz, f.ry, () => k.box(0, -0.3, 0, 6.05, 0.36, 6.05, col, mat, { cast: false }), heightAt(wx, wz));
  }
}

function wire(pl: Placer, f: Frame, pts: [number, number][]) {
  const w = pts.map(([lx, lz]) => Placer.world(f.x, f.z, f.ry, lx, lz) as unknown as [number, number]);
  for (let i = 0; i < w.length - 1; i++) securityFence(pl.k, [w[i], w[i + 1]], (heightAt(w[i][0], w[i][1]) + heightAt(w[i + 1][0], w[i + 1][1])) / 2);
}

/** Lumber company on Mill Rd: sawmill, office, drying sheds, stacked timber and log decks in a fenced gravel yard. */
export function lumberYard(pl: Placer) {
  const rng = new Rng(611);
  const r = pl.net.byName('Mill Rd');
  const f = beside(pl, r, -860, 150, r.full + 34);
  clearing(pl, f, -60, 60, -46, 34);
  gravel(pl, f, -54, 54, -40, 30);
  build(pl, f, D('sawmill'), -8, -18, 0, 611);
  build(pl, f, D('lumberOffice'), 36, 14, 0, 612);
  for (const [lx, lz, ry] of [[-38, 12, PI / 2], [-38, -14, PI / 2], [34, -26, 0]] as const) at(pl, f, 'lumber_shed', lx, lz, ry, 3);
  for (let i = 0; i < 14; i++) at(pl, f, rng.pick(['lumber_stack_a', 'lumber_stack_b', 'lumber_stack_c', 'plywood_stack']), -22 + (i % 7) * 5.2, 12 + Math.floor(i / 7) * 4 + rng.range(-0.4, 0.4), rng.range(-0.06, 0.06));
  for (let i = 0; i < 5; i++) at(pl, f, 'log_deck', -46 + i * 7, -34, PI / 2 + rng.range(-0.1, 0.1));
  for (let i = 0; i < 3; i++) at(pl, f, 'gravel_pile', 46, -8 + i * 7, rng.range(0, 6), 1);
  at(pl, f, 'fuel_tank_stand', 26, 6, 0);
  at(pl, f, 'portable_toilet', 44, 20, PI);
  at(pl, f, 'dumpster_green', 24, 22, 0);
  for (let i = 0; i < 5; i++) at(pl, f, rng.pick(['tyre_stack', 'traffic_cone', 'oil_tank', 'trash_can_metal']), rng.range(-10, 30), rng.range(2, 8), rng.range(0, 6), false);
  car(pl, f, 'pickup', 28, 26, PI / 2, 0x5d7a52, 'pickup_4x4');
  car(pl, f, 'pickup', 33, 26, PI / 2, 0xe9e6dc, 'pickup_80s');
  car(pl, f, 'semi', 6, 24, PI / 2 + 0.1, 0xb3261e, 'semi_conventional');
  car(pl, f, 'tractor', -30, -22, 0.4, 0xd9a21c, 'log_loader');
  car(pl, f, 'semi', -12, 20, PI, 0xe9e6dc, 'trailer_logs');
  car(pl, f, 'semi', 40, -24, PI / 2, 0x2f5d8a, 'flatbed_truck');
  car(pl, f, 'semi', 38, 8, -PI / 2 + 0.2, 0xd9a21c, 'dump_truck');
  wire(pl, f, [[10, 31], [-55, 31], [-55, -41], [55, -41], [55, 31], [22, 31]]);
  for (let i = 0; i < 12; i++) tree(pl, f, rng.pick(['douglas_fir_tall', 'douglas_fir_medium', 'cedar_broad']), rng.range(-70, 70), -48 - rng.range(0, 14), rng.range(0.8, 1.1));
  pl.landmarks.push({ name: 'Hollow Creek Lumber Co.', x: f.x, z: f.z, kind: 'industrial' });
}

/** Freight district east of town: warehouses, the cannery, a container yard, the grain elevator and the water tower. */
export function freight(pl: Placer) {
  const rng = new Rng(733);
  const fr = pl.net.byName('Freight Rd');
  const a = beside(pl, fr, 610, 40, fr.full + 16);
  clearing(pl, a, -66, 22, -18, 18);
  build(pl, a, D('warehouse'), 0, 0, 0, 733);
  build(pl, a, D('warehouse'), -44, 0, 0, 734);
  const yd = beside(pl, fr, 660, 150, fr.full + 30);
  clearing(pl, yd, -54, 54, -32, 30);
  gravel(pl, yd, -48, 48, -26, 26, 0x77777a, 'asphalt');
  const cols: Col[] = [0xb3402e, 0x2f5d8a, 0x3f7a55, 0xd9a02a, 0x8a8d90, 0x7a3b2a, 0x2a6f7a, 0xc9c4b6];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
    const lx = -36 + i * 13.4 + rng.range(-0.3, 0.3);
    const lz = -18 + row * 9;
    const n = rng.pick([1, 2, 2, 3]);
    const [x, z] = Placer.world(yd.x, yd.z, yd.ry, lx, lz);
    pl.k.at(x, z, yd.ry + rng.range(-0.03, 0.03), () => {
      for (let j = 0; j < n; j++) put(pl.k, j === 0 && rng.chance(0.12) ? 'shipping_container_open' : 'shipping_container', rng.range(-0.15, 0.15), j * 2.59, 0, 0, { solid: j === 0 ? 2.6 * n : false, tint: { body: rng.pick(cols) } });
      for (let j = 0; j < n; j++) put(pl.k, 'shipping_container', 6.3, j * 2.59, 0, 0, { solid: j === 0 ? 2.6 * n : false, tint: { body: rng.pick(cols) } });
    }, heightAt(x, z));
  }
  wire(pl, yd, [[-8, 27], [-49, 27], [-49, -27], [49, -27], [49, 27], [8, 27]]);
  car(pl, yd, 'semi', -30, 18, 0, 0x2f5d8a, 'semi_cabover', true);
  car(pl, yd, 'semi', 14, 18, PI, 0xe9e6dc, 'trailer_box');
  car(pl, yd, 'semi', 30, 18, PI, 0xb3261e, 'trailer_tanker');
  car(pl, yd, 'semi', 43, 12, PI / 2, 0xd9a21c, 'flatbed_truck');
  for (let i = 0; i < 6; i++) at(pl, yd, rng.pick(['traffic_barrel', 'jersey_barrier', 'tyre_stack', 'traffic_cone']), rng.range(-40, 40), 22 + rng.range(-1, 1), rng.range(0, 6), 1);
  const can = pl.net.byName('Cannery Rd');
  const cf = beside(pl, can, 590, 200, can.full + 22);
  clearing(pl, cf, -30, 30, -20, 26);
  build(pl, cf, D('factory'), 0, 0, 0, 735);
  gravel(pl, cf, -22, 22, 14, 24, 0x77777a, 'asphalt');
  for (let i = 0; i < 6; i++) car(pl, cf, rng.pick(['sedan', 'pickup', 'wagon', 'coupe'] as const), -16 + i * 3.1, 19, PI + rng.range(-0.05, 0.05), rng.pick(CAR_COLORS));
  const dep = pl.net.byName('Depot Rd');
  const df = beside(pl, dep, 580, -70, dep.full + 18);
  clearing(pl, df, -12, 26, -12, 12);
  at(pl, df, 'silo_pair_elevator', 0, 0, 0, 6);
  at(pl, df, 'grain_bin', 12, -4, 0);
  at(pl, df, 'grain_bin', 19, -4, 0);
  const wt = beside(pl, dep, 470, -60, dep.full + 16);
  at(pl, wt, 'water_tower_town', 0, 0, 0, 5);
  pl.landmarks.push({ name: 'Cascade Freight Yard', x: yd.x, z: yd.z, kind: 'industrial' }, { name: 'Pine Hollow Canning Co.', x: cf.x, z: cf.z, kind: 'industrial' });
}

/** Town beach and park on the lake shore: café, bait shack, pier with boats, picnic lawn, willows and reeds. */
export function lakefront(pl: Placer) {
  const rng = new Rng(877);
  const k = pl.k;
  const r = pl.net.byName('Lakeshore Dr');
  const cafe = beside(pl, r, -50, 300, r.full + 13);
  build(pl, cafe, D('lakeCafe'), 0, 0, PI, 877);
  const bait = beside(pl, r, 62, 300, r.full + 9);
  build(pl, bait, D('baitShop'), 0, 0, PI, 878);
  // shoreline: first water south of the road at each x
  const shore = (x: number) => {
    for (let z = 275; z < 420; z += 0.5) if (isWater(x, z)) return z;
    return 420;
  };
  // pier
  const px = 14;
  // the first sections stand on the sand, so the deck can be walked onto from the beach
  const z0 = shore(px) - 13;
  const deck = LAKE.level + 0.9;
  const n = 13;
  k.at(px, z0, 0, () => {
    for (let i = 0; i < n; i++) put(k, 'pier_section', 0, LAKE.level, 2 + i * 4, 0, { solid: false });
    put(k, 'pier_end_ladder', 1.1, deck, n * 4 - 0.6, PI / 2, { solid: false });
    for (const s of [-1, 1]) k.solid(s * 1.25, n * 2, 0.2, n * 4, 0, 1.1);
    k.solid(0, n * 4 + 0.1, 2.6, 0.2, 0, 1.1);
    addZone(k, 0, n * 2, 2.4, n * 4, deck, deck);
    put(k, 'bench_wood', 0, deck, n * 4 - 1.2, PI, { solid: false });
    for (const [bx, bz, name, ry] of [[-2.4, 14, 'rowboat', 0.1], [2.5, 22, 'rowboat', -0.2], [-2.6, 30, 'motorboat_small', 0.05], [2.7, 38, 'rowboat', 0.3]] as const) put(k, name, bx, LAKE.level - 0.14, bz, ry, { solid: false });
    for (const [bx, bz] of [[-14, 52], [16, 58], [-30, 44]]) put(k, 'buoy', bx, LAKE.level, bz, 0, { solid: false });
  }, 0);
  // beach furniture and the park lawn
  const prop = (name: string, x: number, z: number, ry = 0, solid: boolean | number = true) => {
    if (isWater(x, z) || pl.c.occ.blocked(x, z, 0.4)) return;
    k.at(x, z, ry, () => put(k, name, 0, 0, 0, 0, { solid }), heightAt(x, z));
  };
  prop('lifeguard_chair', px - 12, shore(px - 12) - 4, PI);
  for (const bx of [-20, -8, 30, 40]) prop('rowboat', bx, shore(bx) - 2.5, rng.range(-0.5, 0.5), 0.5);
  prop('boat_trailer', 78, 292, 0.3);
  for (let i = 0; i < 6; i++) prop('picnic_table', -8 + i * 7 + rng.range(-1, 1), 286 + rng.range(-2, 3), rng.range(-0.3, 0.3), 0.8);
  for (let i = 0; i < 4; i++) prop(rng.pick(['bench_wood', 'bench_metal']), -84 + i * 56, shore(-84 + i * 56) - 7, PI);
  for (const tx of [-6, 34]) prop('trash_can_street', tx, 283, 0);
  prop('playground_swing', -84, 290, 0.2);
  prop('playground_slide', -92, 297, -0.4);
  prop('seesaw', -78, 297, 0.9);
  prop('portable_toilet', 88, 284, PI / 2);
  prop('bike_rack', 30, 281, 0);
  prop('bicycle', 30.4, 281.3, 0.1, false);
  prop('sign_no_parking', 4, 280.5, 0, 0.2);
  for (let x = -330; x <= 400; x += rng.range(7, 16)) {
    const z = shore(x);
    if (z > 400) continue;
    if (Math.abs(x - px) > 8) pl.trees.push({ kind: rng.pick(['reeds', 'reeds', 'reeds', 'lily_pads', 'shore_rock_cluster_a', 'shore_rock_cluster_b']), x: x + rng.range(-2, 2), z: z + rng.range(-1.2, 0.6), s: rng.range(0.8, 1.3), ry: rng.range(0, 6) });
    if (rng.chance(0.3) && !pl.c.occ.blocked(x, z - 6, 2)) pl.trees.push({ kind: 'willow_lake', x, z: z - rng.range(5, 8), s: rng.range(0.8, 1.05), ry: rng.range(0, 6) });
  }
  pl.landmarks.push({ name: 'Town Beach & Pier', x: px, z: z0, kind: 'park' }, { name: 'The Loon Lakeside Café', x: cafe.x, z: cafe.z, kind: 'business' });
}

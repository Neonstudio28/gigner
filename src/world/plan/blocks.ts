import type * as THREE from 'three';
import type { Col } from '../core/kit';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { heightAt, isWater } from '../terrain';
import { put } from '../b2/hull';
import { utilityPole, connectPoles } from '../props';
import { CAR_COLORS } from '../palette';
import type { VehicleType } from '../vehicles';
import { boardFence, chainLink } from './dress2';

const PI = Math.PI;
export const ASPHALT: Col = 0x7c8087;
export const OLD_ASPHALT: Col = 0x6c7077;
export const GRAVEL: Col = 0x9a9282;
export const CONCRETE: Col = 0xb4b0a6;

/** Models a small town actually parks: [type for the collision box, vehicles-family model]. */
export const CARS: [VehicleType, string][] = [
  ['sedan', 'sedan_80s'], ['sedan', 'sedan_80s'], ['coupe', 'coupe_80s'], ['pickup', 'pickup_80s'], ['pickup', 'pickup_80s'], ['pickup', 'pickup_4x4'],
  ['wagon', 'wagon_woody'], ['suv', 'suv_boxy'], ['van', 'van_cargo'], ['sedan', 'hatch_compact'], ['coupe', 'muscle_70s'], ['coupe', 'pony_80s'], ['pickup', 'pickup_50s'],
];
export const BEATERS: [VehicleType, string][] = [['pickup', 'pickup_50s'], ['sedan', 'hatch_compact'], ['pickup', 'pickup_80s'], ['sedan', 'sedan_80s'], ['coupe', 'muscle_70s'], ['van', 'van_cargo']];
export const LUXURY: [VehicleType, string][] = [['sedan', 'sedan_luxury'], ['coupe', 'sports_70s'], ['sedan', 'sedan_luxury'], ['coupe', 'roadster'], ['suv', 'suv_boxy'], ['wagon', 'wagon_woody']];
export const RUBBISH = ['trash_bag_a', 'trash_bag_b', 'trash_bag_c', 'cardboard_box_flat', 'cardboard_box_open', 'cardboard_box_closed', 'litter_paper_a', 'litter_paper_b', 'litter_paper_c', 'litter_cup', 'litter_can', 'litter_bottle', 'newspaper_pile', 'pizza_box'];
export const WEEDS = ['weeds_a', 'weeds_b', 'grass_tall_a', 'grass_tall_b', 'dandelion_patch'];

/** Paved pad over a world rectangle, tiled so it follows the ground. */
export function pave(pl: Placer, x0: number, z0: number, x1: number, z1: number, color: Col = ASPHALT, mat = 'asphalt', dy = 0.05) {
  pl.reserve(x0, z0, x1, z1);
  const k = pl.k;
  const nx = Math.max(1, Math.ceil((x1 - x0) / 10));
  const nz = Math.max(1, Math.ceil((z1 - z0) / 10));
  const w = (x1 - x0) / nx;
  const d = (z1 - z0) / nz;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const cx = x0 + (i + 0.5) * w;
      const cz = z0 + (j + 0.5) * d;
      if (isWater(cx, cz)) continue;
      k.at(cx, cz, 0, () => k.box(0, -0.4, 0, w + 0.02, 0.4 + dy, d + 0.02, color, mat, { cast: false }), heightAt(cx, cz));
    }
}

/** Blender prop standing on the ground at a world position. */
export function prop(pl: Placer, name: string, x: number, z: number, ry = 0, solid: boolean | number = true, s?: number) {
  if (isWater(x, z)) return;
  pl.k.at(x, z, ry, () => put(pl.k, name, 0, 0, 0, 0, s ? { solid, s } : { solid }), heightAt(x, z));
}

/** Loose props dropped at random over a rectangle (never inside a building). */
export function scatter(pl: Placer, rng: Rng, names: string[], x0: number, z0: number, x1: number, z1: number, n: number, solid: boolean | number = false) {
  for (let i = 0; i < n; i++) {
    const x = rng.range(x0, x1);
    const z = rng.range(z0, z1);
    if (pl.c.occ.blocked(x, z, 0.3)) continue;
    prop(pl, rng.pick(names), x, z, rng.range(0, PI * 2), solid);
  }
}

/** Weeds and tall grass along a line (fence feet, pavement edges). */
export function weedLine(pl: Placer, rng: Rng, ax: number, az: number, bx: number, bz: number, every = 2.2) {
  const len = Math.hypot(bx - ax, bz - az);
  for (let t = rng.range(0, every); t < len; t += rng.range(every * 0.5, every * 1.6)) {
    const x = ax + ((bx - ax) * t) / len + rng.range(-0.3, 0.3);
    const z = az + ((bz - az) * t) / len + rng.range(-0.3, 0.3);
    if (!isWater(x, z) && !pl.c.occ.blocked(x, z, 0.1)) pl.trees.push({ kind: rng.pick(WEEDS), x, z, s: rng.range(0.8, 1.4), ry: rng.range(0, 6) });
  }
}

/** A parked car from a list of [type, model] pairs. */
export function parked(pl: Placer, rng: Rng, x: number, z: number, heading: number, list: [VehicleType, string][] = CARS) {
  const [type, model] = rng.pick(list);
  pl.car(type, x, z, heading, rng.pick(CAR_COLORS), { model });
}

/**
 * A row of perpendicular parking stalls: local x runs along the row from its first line, cars stand nose to the
 * local -z edge. Paints the stall lines, drops wheel stops and parks cars in `fill` of the stalls.
 */
export function stalls(pl: Placer, rng: Rng, x: number, z: number, ry: number, n: number, o: { fill?: number; stops?: boolean; list?: [VehicleType, string][]; line?: Col; len?: number } = {}) {
  const k = pl.k;
  const sw = 2.75;
  const len = o.len ?? 5.2;
  k.at(x, z, ry, () => {
    for (let i = 0; i <= n; i++) k.box(i * sw, 0.05, len / 2, 0.11, 0.03, len, o.line ?? 0xe9e7df, 'paint', { cast: false });
    if (o.stops) for (let i = 0; i < n; i++) put(k, 'wheel_stop_yellow', (i + 0.5) * sw, 0.05, 0.45, 0, { solid: false });
  }, heightAt(x, z));
  for (let i = 0; i < n; i++) {
    if (!rng.chance(o.fill ?? 0.5)) continue;
    const [cx, cz] = Placer.world(x, z, ry, (i + 0.5) * sw + rng.range(-0.15, 0.15), len / 2 + rng.range(-0.1, 0.35));
    if (pl.c.occ.blocked(cx, cz, 1.2)) continue;
    parked(pl, rng, cx, cz, ry + (rng.chance(0.8) ? PI / 2 : -PI / 2) + rng.range(-0.04, 0.04), o.list);
  }
}

/** Fence through world points: chain-link, security (tall chain-link with barbed wire look) or boards. */
export function fence(pl: Placer, kind: 'chain' | 'tall' | 'board', pts: [number, number][], col: Col = 0x7a6248) {
  const k = pl.k;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const y = heightAt((ax + bx) / 2, (az + bz) / 2);
    k.at(0, 0, 0, () => (kind === 'board' ? boardFence(k, ax, az, bx, bz, col, 1.8) : chainLink(k, ax, az, bx, bz, kind === 'tall' ? 2.2 : 1.4)), y);
  }
}

/** Utility poles at world points, strung together; every third carries a transformer, `lamp` ones a yard light. */
export function poleLine(pl: Placer, pts: [number, number][], o: { h?: number; lamps?: boolean; facing?: number } = {}) {
  const k = pl.k;
  const poles: THREE.Vector3[][] = [];
  pts.forEach(([x, z], i) => {
    if (isWater(x, z)) return;
    const n = pts[Math.min(i + 1, pts.length - 1)];
    const p = pts[Math.max(i - 1, 0)];
    // cross-arms square to the run
    const ry = o.facing ?? Math.atan2(n[0] - p[0], n[1] - p[1]);
    let att: THREE.Vector3[] = [];
    k.at(x, z, ry, () => (att = utilityPole(k, 0, 0, 0, { h: o.h ?? 9.5, transformer: i % 3 === 1, lamp: o.lamps && i % 2 === 0 })), heightAt(x, z));
    poles.push(att);
  });
  connectPoles(k, poles);
}

/**
 * The mess behind a shop: dumpster, bags, flattened boxes, pallets, crates and a bin or two. Local frame: the
 * wall is along local x at z = 0 and the yard runs out to +z; (x, z) is the middle of the wall foot.
 */
export function trashCorner(pl: Placer, rng: Rng, x: number, z: number, ry: number, w = 7, big = true) {
  const at = (name: string, lx: number, lz: number, r = 0, solid: boolean | number = true) => {
    const [wx, wz] = Placer.world(x, z, ry, lx, lz);
    if (pl.c.occ.blocked(wx, wz, 0.2) || pl.onStreet(wx, wz, -0.4)) return;
    prop(pl, name, wx, wz, ry + r, solid);
  };
  const h = w / 2;
  let lx = -h + 1.3;
  if (big) {
    at(rng.pick(['dumpster_green', 'dumpster_blue_open']), lx, 1.25, rng.range(-0.08, 0.08));
    lx += 2.6;
  }
  const pool = ['wheelie_bin', 'trash_can_metal', 'pallet_stack', 'crate_wood_a', 'crate_wood_b', 'cardboard_box_stack', 'barrel_steel', 'trash_can_metal', 'wheelie_bin', 'gas_meter', 'electric_box', 'hand_truck', 'oil_tank'];
  while (lx < h - 0.5) {
    const name = rng.pick(pool);
    at(name, lx, name === 'pallet_stack' || name === 'oil_tank' ? 1.0 : 0.6, rng.range(-0.3, 0.3));
    lx += rng.range(1.3, 2.4);
  }
  for (let i = 0; i < 2 + w / 3; i++) at(rng.pick(RUBBISH), rng.range(-h, h), rng.range(0.6, 2.8), rng.range(0, 6), false);
  if (rng.chance(0.5)) at('pallet', rng.range(-h + 1, h - 1), 2.4, rng.range(0, 6), false);
  if (rng.chance(0.35)) at('trash_can_metal_tipped', rng.range(-h + 1, h - 1), 2.0, rng.range(0, 6), false);
  if (rng.chance(0.3)) at('shopping_cart', rng.range(-h + 1, h - 1), 2.9, rng.range(0, 6), false);
  if (rng.chance(0.3)) at('tyre_stack', h - 0.6, 0.7, 0, 0.5);
}

/** Cobra-head lot lights (or old-style lamps) at world points. */
export function lamps(pl: Placer, pts: [number, number, number?][], name = 'street_lamp_cobra') {
  for (const [x, z, ry] of pts) if (!pl.c.occ.blocked(x, z, 0.2)) prop(pl, name, x, z, ry ?? 0, 0.3);
}

/**
 * A surface car park over a world rectangle: asphalt, double rows of stalls with drive aisles between (rows run
 * along x when the lot is wider than deep), lights, oil stains, litter and weeds at the edges.
 */
export function carPark(pl: Placer, rng: Rng, x0: number, z0: number, x1: number, z1: number, o: { fill?: number; color?: Col; list?: [VehicleType, string][]; stops?: boolean; lights?: boolean } = {}) {
  pave(pl, x0, z0, x1, z1, o.color ?? ASPHALT);
  const k = pl.k;
  const alongX = x1 - x0 >= z1 - z0;
  const L = alongX ? x1 - x0 : z1 - z0; // row length
  const D = alongX ? z1 - z0 : x1 - x0; // across the rows
  const n = Math.floor((L - 1.5) / 2.75);
  const pad = (L - n * 2.75) / 2;
  // rows: one against each long edge, double rows in the middle while there is room for 6.5 m aisles
  const rows: [number, 1 | -1][] = [[0.3, 1], [D - 0.3, -1]];
  const inner = Math.floor((D - 10.8 - 6.5) / 17.1);
  const gap = (D - 10.8 - inner * 10.6) / (inner + 1);
  for (let i = 0; i < inner; i++) {
    const c = 5.4 + gap * (i + 1) + 10.6 * i + 5.3;
    rows.push([c, -1], [c, 1]);
    for (let t = pad; t <= L - pad + 0.1; t += 2.75 * 4) {
      const [lx, lz] = alongX ? [x0 + t, z0 + c] : [x0 + c, z0 + t];
      if (o.lights !== false && Math.round((t - pad) / 2.75) % 8 === 4) prop(pl, 'street_lamp_double', lx, lz, alongX ? 0 : PI / 2, 0.3);
    }
  }
  for (const [c, dir] of rows) {
    // stall frame: local x along the row, cars nose toward local -z
    if (alongX) stalls(pl, rng, dir > 0 ? x0 + pad : x1 - pad, z0 + c, dir > 0 ? 0 : PI, n, o);
    else stalls(pl, rng, x0 + c, dir > 0 ? z1 - pad : z0 + pad, dir > 0 ? PI / 2 : -PI / 2, n, o);
  }
  // wear: oil stains and patched squares
  for (let i = 0; i < (L * D) / 160; i++) {
    const x = rng.range(x0 + 2, x1 - 2);
    const z = rng.range(z0 + 2, z1 - 2);
    const s = rng.range(0.6, 1.8);
    k.at(x, z, rng.range(0, 3), () => k.box(0, 0.05, 0, s, 0.014, s * rng.range(0.6, 1.4), rng.pick<Col>([0x55585e, 0x4a4d52, 0x8e9197]), 'paint', { cast: false }), heightAt(x, z));
  }
  scatter(pl, rng, RUBBISH.slice(6), x0, z0, x1, z1, (L * D) / 220);
}

export type Rect = { x0: number; z0: number; x1: number; z1: number };

/** Shade trees just inside a lot's edge along a street, with weeds at the kerb line of the lot. */
export function treeEdge(pl: Placer, rng: Rng, ax: number, az: number, bx: number, bz: number, kinds = ['maple_medium', 'oak_young', 'maple_medium', 'birch_cluster'], every = 13) {
  const len = Math.hypot(bx - ax, bz - az);
  for (let t = every * 0.5; t < len; t += every * rng.range(0.8, 1.25)) {
    const x = ax + ((bx - ax) * t) / len;
    const z = az + ((bz - az) * t) / len;
    if (!isWater(x, z) && !pl.c.occ.blocked(x, z, 0.8) && !pl.drives.blocked(x, z, 2.5)) pl.trees.push({ kind: rng.pick(kinds), x, z, s: rng.range(0.75, 1.0), ry: rng.range(0, 6) });
  }
  weedLine(pl, rng, ax, az, bx, bz, 3.5);
}

/** A fenced works yard on gravel: stacked materials, a container, drums, a truck, with a gate gap on one side. */
export function worksYard(pl: Placer, rng: Rng, r: Rect, gate: 'n' | 's' | 'e' | 'w') {
  const { x0, z0, x1, z1 } = r;
  pave(pl, x0, z0, x1, z1, GRAVEL, 'gravel');
  const g = 5;
  const mx = (x0 + x1) / 2;
  const mz = (z0 + z1) / 2;
  const side = (k: 'n' | 's' | 'e' | 'w', a: [number, number], b: [number, number], m: [number, number], along: [number, number]) => {
    if (k !== gate) return fence(pl, 'tall', [a, b]);
    fence(pl, 'tall', [a, [m[0] - along[0] * g / 2, m[1] - along[1] * g / 2]]);
    fence(pl, 'tall', [[m[0] + along[0] * g / 2, m[1] + along[1] * g / 2], b]);
  };
  side('n', [x0, z0], [x1, z0], [mx, z0], [1, 0]);
  side('s', [x0, z1], [x1, z1], [mx, z1], [1, 0]);
  side('w', [x0, z0], [x0, z1], [x0, mz], [0, 1]);
  side('e', [x1, z0], [x1, z1], [x1, mz], [0, 1]);
  const w = x1 - x0;
  const d = z1 - z0;
  prop(pl, rng.pick(['shipping_container', 'shipping_container_open']), x0 + 4.2, z0 + d * 0.3, PI / 2, true);
  const stuff = ['lumber_stack_a', 'lumber_stack_b', 'plywood_stack', 'pallet_stack', 'pallet_stack', 'crate_wood_a', 'barrel_steel', 'barrel_steel_rusty', 'tyre_stack', 'gravel_pile', 'cement_mixer', 'oil_tank'];
  for (let x = x0 + 9; x < x1 - 3; x += rng.range(3.2, 5)) prop(pl, rng.pick(stuff), x, z0 + 2.4 + rng.range(-0.3, 0.3), rng.range(-0.1, 0.1), true);
  for (let z = z0 + 7; z < z1 - 3; z += rng.range(3.5, 5.5)) prop(pl, rng.pick(stuff), x1 - 2.6, z, PI / 2 + rng.range(-0.1, 0.1), true);
  if (w > 16 && d > 14) parked(pl, rng, mx + 2, mz + 2, rng.range(-0.3, 0.3), [['van', 'step_van'], ['pickup', 'pickup_4x4'], ['van', 'van_cargo']]);
  scatter(pl, rng, ['pallet', 'tyre', 'traffic_cone', 'sawhorse', 'wheelbarrow', 'ladder_step', 'paint_cans', 'toolbox', 'gas_can'], x0 + 2, z0 + 5, x1 - 5, z1 - 2, 7);
  for (const [fx, fz, tx, tz] of [[x0, z0, x1, z0], [x0, z1, x1, z1]]) weedLine(pl, rng, fx, fz, tx, tz, 2.5);
}

/** Market stalls under striped tents, with crates and a few shoppers' cars kept out by cones. */
export function market(pl: Placer, rng: Rng, r: Rect) {
  const { x0, z0, x1, z1 } = r;
  for (let x = x0 + 4; x < x1 - 3; x += 6.5)
    for (const z of [z0 + 4, z1 - 4]) {
      prop(pl, 'tent_market', x, z, z < (z0 + z1) / 2 ? 0 : PI, 0.4);
      scatter(pl, rng, ['crate_wood_a', 'crate_wood_b', 'barrel_wood', 'planter_box', 'cardboard_box_open'], x - 2.4, z - 1.6, x + 2.4, z + 1.6, 3, 0.5);
    }
  for (const x of [x0, x1]) for (let z = z0 + 1; z < z1; z += 3.2) prop(pl, 'traffic_cone', x, z, 0, false);
}

export type BackKind = 'park' | 'split' | 'yard' | 'market';

/**
 * The half of a commercial block behind the service alley, out to the street behind (`out` = +1 when that
 * street lies to the south). Always paved and used: customer parking, a works yard, market stalls, or houses
 * that front the back street; entrances cut the kerb of the back street and the side avenues.
 */
export function backLot(pl: Placer, rng: Rng, xa: number, xb: number, zAlley: number, zStreet: number, out: 1 | -1, kind: BackKind, houses: () => void = () => {}) {
  const z0 = Math.min(zAlley, zStreet);
  const z1 = Math.max(zAlley, zStreet);
  const m = 0.8;
  const zs = out > 0 ? z1 - m : z0 + m; // lot edge toward the back street
  const cut = kind === 'park' ? xb : kind === 'split' ? xa + (xb - xa) * 0.52 : xa + (xb - xa) * 0.56;
  const lot: Rect = { x0: xa + m, z0: z0 + (out > 0 ? 0 : m), x1: cut - (cut < xb ? 1.2 : m), z1: z1 - (out > 0 ? m : 0) };
  carPark(pl, rng, lot.x0, lot.z0, lot.x1, lot.z1, { fill: kind === 'market' ? 0.3 : 0.55, stops: true });
  pl.entrance((lot.x0 + lot.x1) / 2 + 3.4, zs, 0, out, 6.5);
  pl.entrance(lot.x0, (z0 + z1) / 2 + out * 6, -1, 0, 6);
  if (kind === 'park') pl.entrance(lot.x1, (z0 + z1) / 2 + out * 6, 1, 0, 6);
  const rest: Rect = { x0: cut + 1.2, z0: lot.z0, x1: xb - m, z1: lot.z1 };
  if (kind === 'yard') worksYard(pl, rng, { ...rest, z0: rest.z0 + (out > 0 ? 1 : 0), z1: rest.z1 - (out > 0 ? 0 : 1) }, out > 0 ? 'n' : 's');
  else if (kind === 'market') {
    pave(pl, rest.x0, rest.z0, rest.x1, rest.z1, OLD_ASPHALT);
    market(pl, rng, rest);
  } else if (kind === 'split') {
    houses();
    fence(pl, 'board', [[cut, z0 + 1.5], [cut, z1 - 1.5]], 0x7a6a55);
  }
  // street edges: trees and weeds inside the kerb, a low fence where the lot meets the avenue
  treeEdge(pl, rng, xa + 1.6, zs, cut - 1, zs);
  // the lot's own lights along its far edge
  lamps(pl, [[lot.x0 + 3, zs - out * 0.6, out > 0 ? PI : 0], [lot.x1 - 3, zs - out * 0.6, out > 0 ? PI : 0]]);
  scatter(pl, rng, ['donation_bin', 'vending_soda', 'payphone_post', 'newspaper_box_a', 'shopping_cart', 'shopping_cart'], lot.x0 + 1, zs - out * 1.2 - 0.4, lot.x1 - 1, zs - out * 1.2 + 0.4, 2, 0.4);
}

/** Paved pad in a rotated frame (flat ground): centre (cx, cz), local x across, local z deep. */
export function paveR(pl: Placer, cx: number, cz: number, ry: number, w: number, d: number, color: Col = ASPHALT, mat = 'asphalt', dy = 0.05, reserve = true) {
  const k = pl.k;
  const n = Math.max(1, Math.ceil(w / 12));
  for (let i = 0; i < n; i++) {
    const lx = -w / 2 + ((i + 0.5) * w) / n;
    const [x, z] = Placer.world(cx, cz, ry, lx, 0);
    k.at(x, z, ry, () => k.box(0, -0.4, 0, w / n + 0.02, 0.4 + dy, d, color, mat, { cast: false }), heightAt(x, z));
  }
  if (!reserve) return;
  const c = [-1, 1].flatMap((a) => [-1, 1].map((b) => Placer.world(cx, cz, ry, (a * w) / 2, (b * d) / 2)));
  pl.reserve(Math.min(...c.map((p) => p[0])), Math.min(...c.map((p) => p[1])), Math.max(...c.map((p) => p[0])), Math.max(...c.map((p) => p[1])));
}

/** A hedge between two world points (2 m sections). */
export function hedge(pl: Placer, ax: number, az: number, bx: number, bz: number, kind = 'hedge_straight') {
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.round(len / 2));
  const ry = Math.atan2(-(bz - az), bx - ax);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    if (!isWater(x, z) && !pl.c.occ.blocked(x, z, 0.1) && !pl.onStreet(x, z) && !pl.drives.blocked(x, z, 0.3)) pl.trees.push({ kind, x, z, s: len / n / 2, ry });
  }
}

/**
 * The paved forecourt between a building and its street: `depth` metres out from the front wall, a row of
 * stalls nosed up to the walk at the door, a second row at the street edge and a double row between when
 * there is room, entrances cut to the street at both ends.
 */
export function forecourt(pl: Placer, rng: Rng, f: { x: number; z: number; ry: number }, w: number, d: number, depth: number, o: { fill?: number; color?: Col; side?: number; walk?: boolean; list?: [VehicleType, string][] } = {}) {
  const W = w + 2 * (o.side ?? 3);
  const L = (lx: number, lz: number) => Placer.world(f.x, f.z, f.ry, lx, lz);
  const [cx, cz] = L(0, d / 2 + depth / 2);
  paveR(pl, cx, cz, f.ry, W, depth, o.color ?? ASPHALT);
  const k = pl.k;
  if (o.walk !== false) k.at(f.x, f.z, f.ry, () => k.box(0, 0.05, d / 2 + 0.8, w, 0.1, 1.6, CONCRETE, 'concrete', { cast: false }), heightAt(f.x, f.z));
  const n = Math.floor((W - 1) / 2.75);
  const h = (n * 2.75) / 2;
  const row = (lz: number, flip: boolean, fill = o.fill ?? 0.5) => {
    const [x, z] = L(flip ? h : -h, lz);
    stalls(pl, rng, x, z, f.ry + (flip ? PI : 0), n, { fill, stops: true, list: o.list });
  };
  const z0 = d / 2 + (o.walk !== false ? 1.7 : 0.3);
  row(z0, false, Math.min(0.9, (o.fill ?? 0.5) + 0.25));
  if (depth >= 13.5) row(d / 2 + depth - 0.4, true, (o.fill ?? 0.5) * 0.6);
  for (let zc = z0 + 5.2 + 6.6 + 5.2; zc + 5.2 + 6.6 + 5.2 < d / 2 + depth; zc += 10.4 + 6.6) {
    row(zc, true);
    row(zc, false);
    for (const lx of [-h + 5.5, h - 5.5]) {
      const [x, z] = L(lx, zc);
      prop(pl, 'street_lamp_double', x, z, f.ry, 0.3);
    }
  }
  const dir: [number, number] = [Math.sin(f.ry), Math.cos(f.ry)];
  for (const sx of W > 26 ? [-1, 1] : [1]) {
    const [x, z] = L(sx * (W / 2 - 4.5), d / 2 + depth - 0.2);
    pl.entrance(x, z, dir[0], dir[1], 6.5);
  }
  const [a, b] = [L(-W / 2, d / 2 + 1), L(W / 2, d / 2 + depth - 1)];
  scatter(pl, rng, RUBBISH.slice(6), Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), 2 + (W * depth) / 200);
}

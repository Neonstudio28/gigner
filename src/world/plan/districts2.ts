import type { BuildingDef } from '../buildings/catalog';
import type { Road } from '../roads/network';
import type { Col } from '../core/kit';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { heightAt, isWater, LAKE, river, addFieldTint } from '../terrain';
import { CROP_TILE, CROP_GROUND, type Crop } from '../crops';
import { put } from '../b2/hull';
import { HOUSES } from '../b2/houses';
import { DISTRICT } from '../b2/district';
import * as THREE from 'three';
import { railFence, securityFence, cow, wire as cable } from '../props';
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
/** The stock yard east of the farmhouse: a barn or shed for the animals, a railed paddock, feed, water and the herd. */
function livestock(pl: Placer, f: Frame, rng: Rng, kind: 'pigs' | 'horses' | 'sheep' | 'goats') {
  const shed = { pigs: 'hog_barn', horses: 'stable_barn', sheep: 'loafing_shed', goats: 'loafing_shed' }[kind];
  const herd = { pigs: ['pig', 'pig', 'pig_spotted'], horses: ['horse_bay', 'horse_grey', 'horse_chestnut'], sheep: ['sheep', 'sheep_white', 'sheep_white'], goats: ['goat', 'goat_brown'] }[kind];
  const n = { pigs: 9, horses: 5, sheep: 12, goats: 8 }[kind];
  at(pl, f, shed, 62, -21, 0);
  fence(pl, f, [[44, -13], [44, 14], [82, 14], [82, -13], [70, -13]]);
  at(pl, f, 'feed_trough', 50, -9, 0);
  at(pl, f, 'feed_trough', 58, -9, 0);
  at(pl, f, kind === 'pigs' ? 'feed_bin' : 'farm_water_tank', 79, -18, 0);
  if (kind !== 'pigs') at(pl, f, 'hay_bale_round', 76, 10, rng.range(0, 3));
  else for (let i = 0; i < 3; i++) {
    const [wx, wz] = Placer.world(f.x, f.z, f.ry, 50 + i * 9, 4 + rng.range(-2, 2));
    pl.k.at(wx, wz, f.ry + rng.range(0, 3), () => pl.k.box(0, -0.02, 0, rng.range(4, 7), 0.06, rng.range(3, 5), 0x5e4a36, 'gravel', { cast: false }), heightAt(wx, wz));
  }
  for (let i = 0; i < n; i++) at(pl, f, rng.pick(herd), rng.range(47, 79), rng.range(-6, 11), rng.range(0, 6), 0.3);
  tree(pl, f, 'oak_large', 78, 4, 0.85);
}

/**
 * High-tension line on lattice pylons striding across the farmland north of the river: one pylon every ~140 m
 * along the route, nudged off roads and buildings, three phase conductors sagging between the cross-arms.
 */
export function pylons(pl: Placer) {
  const route: [number, number][] = [[-1500, -250], [-1000, -300], [-560, -470], [-120, -500], [260, -470], [700, -400], [1100, -420], [1600, -360]];
  const info = asset('hv_pylon')?.info as { hang?: number[][] } | undefined;
  const hang = info?.hang ?? [];
  const k = pl.k;
  const towers: THREE.Vector3[][] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, az] = route[i];
    const [bx, bz] = route[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / 140));
    for (let j = i ? 1 : 0; j <= n; j++) {
      let t = j / n;
      let x = ax + (bx - ax) * t;
      let z = az + (bz - az) * t;
      for (let tries = 0; tries < 8 && (isWater(x, z) || pl.onStreet(x, z, 9) || pl.c.occ.blocked(x, z, 8)); tries++) {
        t += (tries % 2 ? -1 : 1) * (tries + 1) * (14 / L);
        x = ax + (bx - ax) * t;
        z = az + (bz - az) * t;
      }
      if (isWater(x, z) || pl.onStreet(x, z, 6)) continue;
      const y = heightAt(x, z);
      k.at(x, z, ry, () => put(k, 'hv_pylon', 0, 0, 0, 0, { solid: true }), y);
      pl.c.occ.add(x, z, 15, 9, ry, 1, true);
      const c = Math.cos(ry);
      const sn = Math.sin(ry);
      towers.push(hang.map(([hx, hy]) => new THREE.Vector3(x + hx * c, y + hy, z - hx * sn)));
    }
  }
  for (let i = 0; i < towers.length - 1; i++) for (let j = 0; j < towers[i].length; j++) cable(k, towers[i][j], towers[i + 1][j], 0.022, 0.035);
}

type FarmO = { crops: Crop[]; cows?: number; silo?: boolean; stock?: 'pigs' | 'horses' | 'sheep' | 'goats'; name: string; half?: [number, number]; back?: number };

/** Crop tiles already planted, hashed on a coarse grid, so neighbouring farms never plant the same ground twice. */
const planted = new Map<string, [number, number][]>();
const isPlanted = (x: number, z: number) => {
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [px, pz] of planted.get(`${Math.floor(x / 16) + i},${Math.floor(z / 16) + j}`) ?? []) if (Math.abs(px - x) < CROP_TILE && Math.abs(pz - z) < CROP_TILE) return true;
  return false;
};

/** Plants a field (frame rectangle) with one crop, tile by tile, leaving out tiles on roads, water, buildings or steep ground. */
function field(pl: Placer, f: Frame, rng: Rng, crop: Crop, x0: number, x1: number, z0: number, z1: number) {
  const T = CROP_TILE;
  const nx = Math.floor((x1 - x0) / T);
  const nz = Math.floor((z1 - z0) / T);
  if (nx < 2 || nz < 2) return;
  let n = 0;
  const kept: [number, number][] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const [x, z] = Placer.world(f.x, f.z, f.ry, x0 + (i + 0.5) * T, z0 + (j + 0.5) * T);
    if (Math.hypot(x, z) > 1780 || isPlanted(x, z)) continue;
    let ok = true;
    const hs: number[] = [];
    for (const [dx, dz] of [[0, 0], [-T / 2, -T / 2], [T / 2, -T / 2], [-T / 2, T / 2], [T / 2, T / 2]]) {
      const [px, pz] = [x + dx, z + dz];
      if (isWater(px, pz) || pl.c.occ.blocked(px, pz, 1.5) || pl.net.near(px, pz).some((h) => Math.abs(h.lat) < h.road.full + 2.5)) { ok = false; break; }
      hs.push(heightAt(px, pz));
    }
    if (!ok || Math.max(...hs) - Math.min(...hs) > 1.5) continue;
    const rv = river.query(x, z);
    if (rv && rv.dist < rv.hw + 14) continue;
    pl.cropTiles.push({ x, z, ry: f.ry, crop });
    addFieldTint(x, z, T, f.ry, CROP_GROUND[crop]);
    kept.push([x, z]);
    n++;
  }
  for (const [x, z] of kept) {
    const k = `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
    if (!planted.has(k)) planted.set(k, []);
    planted.get(k)!.push([x, z]);
  }
  if (!n) return;
  const [cx, cz] = Placer.world(f.x, f.z, f.ry, (x0 + x1) / 2, (z0 + z1) / 2);
  pl.cornFields.push({ x: cx, z: cz, w: x1 - x0, d: z1 - z0, ry: f.ry, crop });
  // what stands in the field: scarecrows in the corn, round bales on the cut hay and stubble
  const spot = (name: string, solid: boolean | number = false) => at(pl, f, name, rng.range(x0 + 8, x1 - 8), rng.range(z0 + 8, z1 - 8), rng.range(0, 6), solid);
  if (crop === 'corn' || crop === 'sunflower' || crop === 'veg') spot('scarecrow');
  if (crop === 'stubble' || crop === 'hay') for (let i = 0; i < (crop === 'stubble' ? 14 : 5); i++) spot(rng.chance(0.75) ? 'hay_bale_round' : 'hay_bale_square', 0.8);
}

function farm(pl: Placer, r: Road, seed: number, o: FarmO) {
  const rng = new Rng(seed);
  // the yard stands at the end of the lane: local +z looks back down it, and the lane runs in to the gravel at (-14, 15)
  const e = r.pts[r.pts.length - 1];
  const ry = Math.atan2(-e.tx, -e.tz);
  const [ox, oz] = Placer.world(e.x, e.z, ry, 14, -15);
  const f: Frame = { x: ox, z: oz, ry };
  const k = pl.k;
  const [hl, hr] = o.half ?? [200, 200];
  const back = o.back ?? 150;
  const Ln = r.length;
  clearing(pl, f, -hl - 6, hr + 6, -58 - back - 6, Ln + 10);
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
  if (o.stock) livestock(pl, f, rng, o.stock);
  // shelter belt and yard trees
  for (let i = 0; i < 6; i++) tree(pl, f, 'poplar_tall', 30, -30 + i * 7, rng.range(0.8, 1));
  for (const [tx, tz, kind] of [[-9, 9, 'maple_large'], [10, 8, 'oak_medium'], [-4, -14, 'apple_tree'], [3, -18, 'apple_tree'], [22, 2, 'birch_cluster']] as const) tree(pl, f, kind, tx, tz, rng.range(0.85, 1.05));
  fence(pl, f, [[-48, 13], [-19, 13]], 0xf1ede2);
  fence(pl, f, [[-9, 13], [12, 13]], 0xf1ede2);
  fence(pl, f, [[12, 13], [34, 13], [34, -44]], 0xf1ede2);
  pl.landmarks.push({ name: o.name, x: f.x, z: f.z, kind: 'farm' });
  // the fields: either side of the lane, either side of the yard, and one great field behind it
  const [c1, c2, c3, c4, c5] = o.crops;
  const side = o.stock ? 90 : 42;
  field(pl, f, rng, c1, -hl, -25, 24, Ln - 4);
  field(pl, f, rng, c2, -3, hr, 24, Ln - 4);
  field(pl, f, rng, c3, -hl, hr, -58 - back, -58);
  field(pl, f, rng, c4, -hl, -92, -52, 20);
  field(pl, f, rng, c5, side, hr, -52, 20);
  // wire fence and a pole line down the lane, a mailbox and name board where it leaves the county road
  for (const sd of [-1, 1]) {
    const pts: [number, number][] = [];
    for (let s0 = 14; s0 <= Ln - 6; s0 += 12) {
      const q = r.at(s0);
      pts.push([q.x - q.tz * sd * 5.2, q.z + q.tx * sd * 5.2]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      k.at(0, 0, 0, () => railFence(k, ax, az, bx, bz, 0x7a6248), heightAt((ax + bx) / 2, (az + bz) / 2));
    }
  }
  const g = r.at(11);
  k.at(g.x - g.tz * 4.2, g.z + g.tx * 4.2, Math.atan2(g.tx, g.tz), () => put(k, 'mailbox_post', 0, 0, 0, 0, { solid: 0.2 }), heightAt(g.x - g.tz * 4.2, g.z + g.tx * 4.2));
  for (let i = 0; i < 5; i++) {
    const q = r.at(20 + i * ((Ln - 30) / 4));
    const [tx, tz] = [q.x + q.tz * 8.5, q.z - q.tx * 8.5];
    if (rng.chance(0.7)) pl.trees.push({ kind: rng.pick(['oak_large', 'maple_large', 'poplar_tall']), x: tx, z: tz, s: rng.range(0.85, 1.05), ry: rng.range(0, 6) });
  }
}

export function farms(pl: Placer) {
  planted.clear();
  const R = (n: string) => pl.net.byName(n);
  farm(pl, R('Hansen Farm Ln'), 301, { name: 'Hansen Farm', crops: ['corn', 'wheat', 'corn', 'hay', 'sunflower'], cows: 8 });
  farm(pl, R('Lindqvist Farm Ln'), 302, { name: 'Lindqvist Farm', crops: ['wheat', 'hay', 'wheat', 'veg', 'stubble'], cows: 0, stock: 'pigs', back: 60 });
  farm(pl, R('Okafor Farm Ln'), 303, { name: 'Okafor Farm', crops: ['sunflower', 'corn', 'wheat', 'veg', 'hay'], back: 170 });
  farm(pl, R('Whitlock Farm Ln'), 304, { name: 'Whitlock Farm', crops: ['hay', 'stubble', 'corn', 'wheat', 'veg'], cows: 9, stock: 'horses' });
  farm(pl, R('Sorensen Farm Ln'), 305, { name: 'Sorensen Farm', crops: ['corn', 'wheat', 'stubble', 'hay', 'corn'] });
  farm(pl, R('Miller Dairy Ln'), 306, { name: 'Miller Dairy', crops: ['hay', 'corn', 'hay', 'wheat', 'stubble'], cows: 12, stock: 'sheep' });
  farm(pl, R('Twin Oaks Farm Ln'), 307, { name: 'Twin Oaks Farm', crops: ['wheat', 'sunflower', 'corn', 'veg', 'hay'], silo: false, stock: 'goats' });
  farm(pl, R('Cedar Row Farm Ln'), 308, { name: 'Cedar Row Farm', crops: ['corn', 'wheat', 'hay', 'sunflower', 'corn'], stock: 'pigs' });
  farm(pl, R('Homestead Farm Ln'), 309, { name: 'Homestead Farm', crops: ['wheat', 'corn', 'stubble', 'hay', 'veg'], cows: 5, stock: 'horses' });
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

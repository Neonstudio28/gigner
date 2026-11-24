import type { BuildingDef } from '../buildings/catalog';
import type { Ctx } from '../buildings/common';
import type { Road } from '../roads/network';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { heightAt, addFlatPad } from '../terrain';
import { donutShop, diner, gasStation } from '../buildings/commercial';
import { church, sheriffOffice } from '../buildings/civic';
import { SHOPS } from '../b2/shops';
import { HOUSES } from '../b2/houses';
import { CIVIC_B2 } from '../b2/civic';
import { LANDMARKS } from '../b2/landmarks';
import { put } from '../b2/hull';
import { yards, alleys } from './dress2';
import { DISTRICT } from '../b2/district';
import { farms, lumberYard, freight, lakefront } from './districts2';

const PI = Math.PI;
const N = 1 as const; // frontage side of an eastbound street: 1 = north, -1 = south
const S = -1 as const;

/** Old-catalogue building wrapped as a def (stand-ins until its remake lands). */
function legacy(id: string, w: number, d: number, fn: (c: Ctx, x: number, z: number, ry: number) => void, oz = 0): BuildingDef {
  return {
    id,
    name: id,
    w,
    d,
    tags: [],
    build: (c, x, z, ry) => {
      c.occ.add(x, z, w, d, ry, 1, false);
      const [bx, bz] = Placer.world(x, z, ry, 0, oz);
      fn(c, bx, bz, ry);
    },
  };
}

const B = new Map<string, BuildingDef>([...SHOPS, ...HOUSES, ...CIVIC_B2, ...LANDMARKS, ...DISTRICT].map((d) => [d.id, d]));
const D = (id: string) => {
  const d = B.get(id);
  if (!d) throw new Error(`no building ${id}`);
  return d;
};

/** Arc length where a straight-ish road crosses x (E-W roads) or z (N-S roads). */
function sAt(r: Road, v: number, axis: 'x' | 'z') {
  let best = r.pts[0];
  for (const p of r.pts) if (Math.abs(p[axis] - v) < Math.abs(best[axis] - v)) best = p;
  const i = r.pts.indexOf(best);
  for (const j of [i - 1, i]) {
    const a = r.pts[j];
    const b = r.pts[j + 1];
    if (!a || !b || a[axis] === b[axis]) continue;
    const t = (v - a[axis]) / (b[axis] - a[axis]);
    if (t >= 0 && t <= 1) return a.s + (b.s - a.s) * t;
  }
  return best.s;
}

/** Stands a def on a street frontage at coordinate v along the road. */
function front(pl: Placer, r: Road, v: number, side: 1 | -1, def: BuildingDef, setback: number, seed: number, label?: string, kind = 'business', axis: 'x' | 'z' = 'x') {
  const f = pl.net.frontage(r, sAt(r, v, axis), side, r.full + setback + def.d / 2);
  pl.force(def, f.x, f.z, f.ry, seed);
  if (label) pl.landmarks.push({ name: label, x: f.x, z: f.z, kind });
  return f;
}

/** A terrace of abutting shopfronts along one block face of an E-W street, centred between x0 and x1. */
function row(pl: Placer, r: Road, side: 1 | -1, x0: number, x1: number, ids: string[]) {
  const defs = ids.map(D);
  const total = defs.reduce((s, d) => s + d.w, 0);
  let x = (x0 + x1) / 2 - (side * total) / 2;
  for (const d of defs) {
    front(pl, r, x + (side * d.w) / 2, side, d, 0.2, (x * 13) | 0, d.name);
    x += side * d.w;
  }
}

/** Flattens the building sites; must run before anything samples the terrain. */
export function registerTownPads() {
  addFlatPad(0, -45, 170, 62, 30);
}

/** Prop from the Blender families standing on the ground. */
function prop(pl: Placer, name: string, x: number, z: number, ry = 0, solid: boolean | number = true) {
  pl.k.at(0, 0, 0, () => put(pl.k, name, x, 0, z, ry, { solid }), heightAt(x, z));
}

function civic(pl: Placer) {
  const main = pl.net.byName('Main St');
  front(pl, main, -45, N, D('townhall'), 9, 11, 'Pine Hollow Town Hall', 'civic');
  // the green: bandstand, fountain, memorial and flag
  prop(pl, 'bandstand_gazebo', 45, -52);
  prop(pl, 'fountain_park', 45, -28);
  prop(pl, 'war_memorial', 22, -40, PI / 2);
  prop(pl, 'statue_plinth', 68, -40);
  prop(pl, 'flagpole_tall', -22, -16, 0, 0.4);
  pl.landmarks.push({ name: 'Town Green', x: 45, z: -45, kind: 'park' });
  const rng = new Rng(77);
  for (let i = 0; i < 10; i++) pl.trees.push({ kind: 'oak', x: 45 + rng.pick([-1, 1]) * rng.range(22, 30), z: -45 + rng.range(-26, 26), s: rng.range(0.6, 0.9) });
}

function mainStreet(pl: Placer) {
  const main = pl.net.byName('Main St');
  row(pl, main, S, -90, 0, ['hardware', 'barber', 'pharmacy', 'records', 'gazette', 'bakery']);
  row(pl, main, S, 0, 90, ['tavern', 'pawn', 'antiques', 'insurance', 'thrift', 'video']);
  row(pl, main, S, -180, -90, ['laundry', 'liquor', 'thrift', 'barber', 'pawn', 'records']);
  row(pl, main, S, 90, 180, ['bakery', 'hardware', 'video', 'pharmacy', 'liquor', 'insurance']);
  row(pl, main, N, -180, -90, ['antiques', 'gazette', 'tavern', 'laundry', 'bakery', 'insurance']);
  row(pl, main, N, 110, 180, ['records', 'thrift', 'pharmacy', 'hardware', 'barber']);
  // highway services at either end of the grid
  front(pl, main, -225, S, D('gas'), 2, 3, 'Timberline Gas');
  front(pl, main, -225, N, D('diner'), 9, 4, "Dottie's Diner");
  front(pl, main, 225, N, D('donut'), 9, 5, 'Hole Lotta Donuts');
  front(pl, main, 225, S, D('sheriff'), 7, 6, 'Hollow County Sheriff', 'civic');
  front(pl, main, 315, S, D('motel'), 12, 8, 'Pine Rest Motel');
  front(pl, main, -315, N, D('grocery'), 16, 9, 'Hollow Foods Market');
  front(pl, main, 100, N, D('bank'), 3, 10, 'First Cascade Bank');
  const alder = pl.net.byName('Alder St');
  front(pl, alder, -45, S, D('church'), 8, 7, 'Pine Hollow Community Church', 'civic');
  front(pl, alder, 45, S, D('courthouse'), 9, 12, 'Hollow County Courthouse', 'civic');
}

function homes(pl: Placer) {
  const pick = (rng: Rng) => rng.pick(HOUSES);
  const o = { setback: 6, gap: 5, jitter: 1.2, driveway: true, mailbox: true, car: 0.6, maxSlope: 8 };
  const R = (n: string) => pl.net.byName(n);
  // houses face the east-west streets; the avenues only carry the corner lots' side yards
  for (const n of ['Maple St', 'Alder St', 'Lakeshore Dr']) for (const side of [N, S]) pl.along(R(n), side, 10, R(n).length - 10, pick, o);
  pl.along(R('River St'), S, 10, R('River St').length - 10, pick, o);
}

/** Everything that stands in Pine Hollow: the lakeside grid, the farms, the lumber yard and the freight yards. */
export function town(pl: Placer) {
  civic(pl);
  mainStreet(pl);
  lakefront(pl);
  homes(pl);
  farms(pl);
  lumberYard(pl);
  freight(pl);
  yards(pl);
  alleys(pl);
}

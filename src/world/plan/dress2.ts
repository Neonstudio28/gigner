import { Rng } from '../core/rng';
import type { Col } from '../core/kit';
import { Placer } from './placer';
import { heightAt, isWater, LAKE } from '../terrain';
import { put } from '../b2/hull';
import { gable } from '../b2/parts';
import { utilityPole, connectPoles, picketFence } from '../props';
import type * as THREE from 'three';

type Kit = Placer['k'];
const PI = Math.PI;
const WOODS: Col[] = [0x8a6a48, 0x7a5a3c, 0x9a7a55, 0x6f6a62, 0xb9a98a];

/** Board fence between two points of the current frame: posts, two rails and a run of boards. */
/** True when a run would stand in the lake or river (shore lots lose that side of the fence). */
export function wet(ax: number, az: number, bx: number, bz: number) {
  for (let t = 0; t <= 1; t += 0.25) if (isWater(ax + (bx - ax) * t, az + (bz - az) * t) || heightAt(ax + (bx - ax) * t, az + (bz - az) * t) < LAKE.level + 0.35) return true;
  return false;
}

export function boardFence(k: Kit, ax: number, az: number, bx: number, bz: number, col: Col, h = 1.7) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 0.6) return;
  const ry = Math.atan2(-(bz - az), bx - ax);
  k.at((ax + bx) / 2, (az + bz) / 2, ry, () => {
    k.box(0, 0.08, 0, len, h - 0.08, 0.04, col, 'boards');
    for (const y of [0.35, h - 0.35]) k.box(0, y, 0.05, len, 0.09, 0.05, col);
    const n = Math.max(1, Math.round(len / 2.4));
    for (let i = 0; i <= n; i++) k.box(-len / 2 + (len * i) / n, 0, 0.05, 0.11, h + 0.06, 0.11, col);
    k.solid(0, 0, len, 0.25);
  });
}

/** Chain-link run: steel posts, top rail and a see-through mesh panel. */
export function chainLink(k: Kit, ax: number, az: number, bx: number, bz: number, h = 1.3) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 0.6) return;
  const ry = Math.atan2(-(bz - az), bx - ax);
  k.at((ax + bx) / 2, (az + bz) / 2, ry, () => {
    const n = Math.max(1, Math.round(len / 2.6));
    for (let i = 0; i <= n; i++) k.box(-len / 2 + (len * i) / n, 0, 0, 0.06, h + 0.05, 0.06, 0x9a9ea2, 'metal');
    k.box(0, h - 0.04, 0, len, 0.05, 0.05, 0x9a9ea2, 'metal');
    for (let y = 0.2; y < h - 0.1; y += 0.22) k.box(0, y, 0, len, 0.012, 0.012, 0xa9adb0, 'metal', { cast: false });
    for (let x = -len / 2 + 0.3; x < len / 2; x += 0.3) k.box(x, 0.05, 0, 0.012, h - 0.1, 0.012, 0xa9adb0, 'metal', { cast: false });
    k.solid(0, 0, len, 0.2);
  });
}

/** Garden shed with a gable roof and a plank door. */
export function shed(k: Kit, rng: Rng, x: number, z: number, ry: number) {
  const w = rng.range(2.4, 3.4);
  const d = rng.range(2.0, 2.8);
  const col = rng.pick<Col>([0x8a3a2e, 0x6f7a5a, 0xb9a98a, 0x7a8a96, 0xe9e4d6]);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w + 0.2, 0.12, d + 0.2, 0x8f8c87, 'concrete');
    k.box(0, 0.12, 0, w, 2.0, d, col, 'siding');
    k.box(0, 0.12, d / 2 + 0.02, 1.0, 1.8, 0.04, 0x5a4632, 'boards');
    k.box(0.38, 1.0, d / 2 + 0.05, 0.05, 0.12, 0.03, 0x2a2a2c, 'metal');
    k.at(0, 0, 0, () => gable(k, w, d, 2.12, { pitch: 0.5, color: 0x4b4f55, mat: 'shingle', fill: col, fillMat: 'siding', oh: 0.2, goh: 0.2 }));
    k.solid(0, 0, w, d);
  });
}

/** Two T-posts with washing lines. */
export function clothesline(k: Kit, x: number, z: number, ry: number, rng: Rng) {
  k.at(x, z, ry, () => {
    for (const s of [-1, 1]) {
      k.box(s * 2.4, 0, 0, 0.07, 1.9, 0.07, 0xb9bdc0, 'metal');
      k.box(s * 2.4, 1.85, 0, 0.05, 0.05, 1.2, 0xb9bdc0, 'metal');
    }
    for (const lz of [-0.5, 0, 0.5]) k.box(0, 1.87, lz, 4.8, 0.012, 0.012, 0xe9e6dc, 'paint', { cast: false });
    const cols: Col[] = [0xf2efe6, 0x9ab6cf, 0xd98a8a, 0xe9d9a0, 0x8fb08a];
    for (let i = 0; i < 5; i++) {
      const w = rng.range(0.5, 1.0);
      k.box(rng.range(-1.9, 1.9), 1.86 - rng.range(0.6, 1.0), rng.pick([-0.5, 0, 0.5]), w, rng.range(0.6, 1.0), 0.015, rng.pick(cols));
    }
  });
}

/** True where nothing is built and no street runs. */
export function clear(pl: Placer, x: number, z: number, pad = 0.5) {
  if (isWater(x, z) || heightAt(x, z) < LAKE.level + 0.35) return false;
  if (pl.c.occ.blocked(x, z, pad) || pl.pads.blocked(x, z, pad)) return false;
  return !pl.net.near(x, z).some((h) => Math.abs(h.lat) < h.road.full + 1);
}

const YARD_TREES: [string, number, number][] = [
  ['maple_medium', 0.9, 3], ['oak_young', 1.0, 2], ['apple_tree', 1.0, 2], ['birch_cluster', 0.8, 1.5], ['fir_young', 1.0, 1.5],
  ['spruce_blue', 0.9, 1], ['maple_large', 0.75, 1], ['oak_medium', 0.8, 1], ['douglas_fir_medium', 0.8, 1.5], ['cedar_broad', 0.7, 0.7],
];
function yardTree(rng: Rng): [string, number] {
  let t = rng.range(0, YARD_TREES.reduce((s, y) => s + y[2], 0));
  for (const y of YARD_TREES) if ((t -= y[2]) <= 0) return [y[0], y[1]];
  return ['maple_medium', 0.9];
}

/** Back yards, fences, sheds, bins, shrubs and trees for every house in town. */
type Rect = [number, number, number, number];
const GREYS: Col[] = [0x8f9296, 0x9a9c9e, 0x85888c, 0xa7a59c];

/**
 * The lived-in part of a suburban back yard, drawn in the house frame (yard runs from the back wall at zb towards -z):
 * a pool on its patio, a deck, or a paved patio, each furnished, plus the play set, kitchen garden or spa that goes
 * with it. Returns the ground it takes up, so sheds and trees keep off it.
 */
function backyard(pl: Placer, s: { x: number; z: number; ry: number; def: { w: number } }, hw: number, zb: number, yd: number, kind: 'pool' | 'deck' | 'patio', rng: Rng, plant: (kind: string, lx: number, lz: number, sc: number) => void): Rect[] {
  const k = pl.k;
  const taken: Rect[] = [];
  const PIh = PI / 2;
  const take = (x: number, z: number, w: number, d: number) => taken.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  const sd = rng.pick([-1, 1]);
  const chairs = (x: number, y: number, z: number, n: number, r = 1.15) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + 0.4;
      put(k, 'patio_chair', x + Math.cos(a) * r, y, z + Math.sin(a) * r, PIh - a + PI, { solid: false });
    }
  };
  const table = (x: number, y: number, z: number) => {
    if (rng.chance(0.5)) put(k, rng.chance(0.4) ? 'picnic_table_party' : 'picnic_table_yard', x, y, z, rng.pick([0, PIh]) + rng.range(-0.15, 0.15), { solid: 0.9 });
    else {
      put(k, rng.chance(0.7) ? 'patio_table_umbrella_open' : 'patio_table_umbrella', x, y, z, rng.range(0, 3), { solid: 0.5 });
      chairs(x, y, z, rng.pick([3, 4, 4]));
    }
  };
  const grill = (x: number, y: number, z: number, ry: number) => put(k, 'bbq_grill', x, y, z, ry, { solid: 0.4 });
  const pave = (conc: boolean, x0: number, z0: number, n: number, m: number, hole?: (i: number, j: number) => boolean) => {
    // n x m cells of 1.5 m from the corner (x0, z0) towards +x and -z; 3 m panels where four cells are free
    const done = new Set<number>();
    const ok = (i: number, j: number) => i < n && j < m && !done.has(j * 64 + i) && !hole?.(i, j);
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) {
        if (!ok(i, j)) continue;
        const big = ok(i + 1, j) && ok(i, j + 1) && ok(i + 1, j + 1);
        const c = big ? 2 : 1;
        for (let a = 0; a < c; a++) for (let b = 0; b < c; b++) done.add((j + b) * 64 + i + a);
        put(k, `yard_pave_${conc ? 'conc' : 'tc'}${big ? '2' : ''}`, x0 + (i + c / 2) * 1.5, 0, z0 - (j + c / 2) * 1.5, 0, { solid: false, cast: false });
      }
  };
  const MULCH = 0x4a3426;
  const SHRUBS = rng.pick([['bush_round_a', 'bush_round_b', 'topiary_ball'], ['bush_flowering_a', 'bush_flowering_b', 'fern'], ['bush_round_a', 'bush_flowering_a', 'bush_wide', 'fern']]);
  /** Planting bed between paving and fence: mulch, brick edging on the paved side, shrubs. `nx, nz` points from the paving into the bed. */
  const bed = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number, depth: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const [cx, cz] = [(ax + bx) / 2 + (nx * depth) / 2, (az + bz) / 2 + (nz * depth) / 2];
    k.box(cx, -0.3, cz, nx ? depth : len, 0.42, nx ? len : depth, MULCH, 'gravel', { cast: false });
    const ry = nx ? (nx > 0 ? -PIh : PIh) : nz > 0 ? PI : 0;
    for (let t = 0.75; t < len; t += 1.5) put(k, 'bed_edging', ax + ((bx - ax) * t) / len, 0, az + ((bz - az) * t) / len, ry, { solid: false, cast: false });
    for (let t = rng.range(0.6, 1.2); t < len - 0.5; t += rng.range(1.3, 2.1))
      plant(rng.pick(SHRUBS), ax + ((bx - ax) * t) / len + nx * depth * 0.55, az + ((bz - az) * t) / len + nz * depth * 0.55, rng.range(0.75, 1.0));
  };
  const stones = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(x1 - x0, z1 - z0);
    for (let t = 1.5; t < len; t += 3) put(k, 'stepping_stones', x0 + ((x1 - x0) * t) / len, 0, z0 + ((z1 - z0) * t) / len, ry, { solid: false, cast: false });
  };
  if (kind === 'pool') {
    // the whole fenced yard is one design: paving from the back wall to planting beds along the fences, pool set in it
    const rect = rng.chance(0.4) && Math.floor((hw * 2 - 1.8) / 1.5) >= 10;
    const pc = rect ? 8 : 7;
    const n = Math.floor((hw * 2 - 1.8) / 1.5);
    const m = Math.floor((yd - 0.9) / 1.5);
    const [x0, z0] = [-n * 0.75, zb];
    const pi0 = sd > 0 ? n - 1 - pc : 1;
    const px = x0 + (pi0 + pc / 2) * 1.5;
    const pz = z0 - (2 + 2.5) * 1.5;
    const flip = rng.chance(0.5);
    put(k, rect ? 'yard_pool_rect' : 'yard_pool_kidney', px, 0, pz, flip ? PI : 0, { solid: false });
    pave(rect, x0, z0, n, m, (i, j) => i >= pi0 && i < pi0 + pc && j >= 2 && j < 7);
    const side = (hw * 2 - n * 1.5) / 2;
    bed(-x0, z0, -x0, z0 - m * 1.5, 1, 0, side);
    bed(x0, z0, x0, z0 - m * 1.5, -1, 0, side);
    bed(-hw, z0 - m * 1.5, hw, z0 - m * 1.5, 0, -1, yd - m * 1.5);
    take(0, zb - yd / 2, hw * 2, yd);
    const Y = 0.2;
    const tw = (n - pc - 1) * 1.5;
    const tx = -sd * (n * 0.75 - tw / 2);
    const rear = z0 - (7 + (m - 7) / 2) * 1.5;
    const nl = tw >= 3 ? rng.pick([2, 3, 3]) : 2;
    for (let i = 0; i < nl; i++) put(k, 'sun_lounger', px + (i - (nl - 1) / 2) * 1.5 + (tw >= 3 ? 0 : sd * 2.2), Y, rear - 0.2, PI + rng.range(-0.06, 0.06), { solid: false });
    if (tw >= 3) {
      table(tx, Y, z0 - 5.2);
      if (rng.chance(0.6)) put(k, 'hot_tub', tx, Y, z0 - 10.4, sd * PIh, { solid: 1.1 });
      else {
        put(k, 'adirondack_chair', tx - 0.6, Y, z0 - 10.4, PI - 0.3, { solid: false });
        put(k, 'adirondack_chair', tx + 0.6, Y, z0 - 10.4, PI + 0.3, { solid: false });
      }
    } else put(k, 'picnic_table_party', px - sd * (pc * 0.75 - 1.6), Y, rear, rng.range(-0.1, 0.1), { solid: 0.9 });
    grill(-sd * (n * 0.75 - 0.7), Y, z0 - 2.4, -sd * PIh);
    // toys at the end away from the diving board
    put(k, 'pool_toys', px + (flip ? -1 : 1) * (pc * 0.75 - 0.9), Y, pz + rng.range(-0.4, 0.4), PIh, { solid: false });
    for (const [lx, lz] of [[x0 + 0.5, z0 - m * 1.5 + 0.5], [-x0 - 0.5, z0 - m * 1.5 + 0.5], [px - pc * 0.75 + 0.2, z0 - 2.5], [px + pc * 0.75 - 0.2, z0 - 2.5]]) put(k, 'yard_planter', lx, Y, lz, rng.range(0, 3), { solid: 0.35 });
    return taken;
  }
  let from: [number, number];
  if (kind === 'deck') {
    const fx = sd * rng.range(0, Math.max(0, s.def.w / 2 - 3));
    put(k, 'yard_deck', fx, 0, zb - 1.85, PI, { solid: false });
    k.solid(fx, zb - 1.85, 5, 3.6);
    take(fx, zb - 2.6, 6, 6.4);
    put(k, 'patio_table_umbrella_open', fx + 1.1, 0.55, zb - 1.9, rng.range(0, 3), { solid: false });
    chairs(fx + 1.1, 0.55, zb - 1.9, 3, 1.05);
    put(k, 'bbq_grill', fx - 1.7, 0.55, zb - 0.9, PI, { solid: false });
    if (rng.chance(0.6)) put(k, 'adirondack_chair', fx - 1.5, 0.55, zb - 2.7, PI + 0.5, { solid: false });
    from = [fx, zb - 4.9];
  } else {
    // a terrace the full width of the house, so the back steps land on paving
    const conc = rng.chance(0.45);
    const n = Math.max(4, Math.floor(s.def.w / 1.5));
    const m = rng.pick([2, 3, 3]);
    const x0 = -n * 0.75;
    pave(conc, x0, zb, n, m);
    take(0, zb - m * 0.75, n * 1.5 + 1, m * 1.5 + 1);
    const Y = 0.2;
    const fx = sd * (n * 0.75 - 2.7);
    const fz = zb - m * 1.5 + 2.1;
    if (m === 3 && rng.chance(0.45)) put(k, 'pergola', fx, Y, fz, 0, { solid: false });
    table(fx, Y, fz);
    grill(-sd * (n * 0.75 - 0.8), Y, zb - m * 1.5 + 0.8, PI);
    if (rng.chance(0.5)) put(k, 'sun_lounger', -sd * (n * 0.75 - 2.4), Y, zb - m * 1.5 + 1.3, sd * 0.4, { solid: false });
    for (const sx of [-1, 1]) if (rng.chance(0.7)) put(k, 'yard_planter', sx * (n * 0.75 - 0.45), Y, zb - m * 1.5 + 0.45, rng.range(0, 3), { solid: 0.35 });
    // low planting along the terrace ends
    for (const sx of [-1, 1]) bed(sx * n * 0.75, zb - 0.2, sx * n * 0.75, zb - m * 1.5, sx, 0, 0.9);
    from = [-sd * 1.5, zb - m * 1.5];
  }
  // what the rest of the lawn is used for
  const zr = zb - yd + 3.2;
  const xs = [-(hw - 3.6), hw - 3.6];
  if (rng.chance(0.5)) xs.reverse();
  const extra = rng.pick(['swing', 'beds', 'fire', 'swing', 'beds', 'tramp', 'none']);
  if (yd > 11.5) {
    if (extra !== 'none') stones(from[0], from[1], extra === 'beds' ? xs[1] : xs[0] * (extra === 'swing' ? 0.55 : 1), zr + 1.9);
    if (extra === 'swing') put(k, 'swing_set_yard', xs[0] * 0.55, 0, zr, rng.range(-0.15, 0.15), { solid: false }) && take(xs[0] * 0.55, zr, 7, 3.2);
    if (extra === 'tramp') put(k, 'trampoline', xs[0], 0, zr, 0, { solid: 1.6 }) && take(xs[0], zr, 4.4, 4.4);
    if (extra === 'fire') {
      put(k, 'firepit_ring', xs[0], 0, zr, 0, { solid: 0.5 });
      for (let i = 0; i < 4; i++) put(k, 'adirondack_chair', xs[0] + Math.cos(i * 1.57 + 0.6) * 1.7, 0, zr + Math.sin(i * 1.57 + 0.6) * 1.7, PIh - (i * 1.57 + 0.6) + PI, { solid: false });
      take(xs[0], zr, 5, 5);
    }
    if (extra === 'beds' || rng.chance(0.3)) put(k, 'raised_beds', xs[1], 0, zr + 0.2, rng.pick([0, PIh]), { solid: 1.2 }) && take(xs[1], zr + 0.2, 3.6, 3.6);
  }
  return taken;
}

/**
 * The middle of a deep residential block, behind everybody's back fence, is never mown lawn: it is the old trees and
 * scrub the lots were cut out of. Finds open ground ringed by houses and grows a grove there.
 */
function blockInteriors(pl: Placer) {
  const rng = new Rng(7373);
  const homes = pl.sites.filter((s) => s.def.tags.includes('house') || s.def.tags.includes('shack'));
  if (!homes.length) return;
  const C = 8;
  const key = (x: number, z: number) => Math.floor(x / C) * 4096 + Math.floor(z / C);
  const grid = new Map<number, [number, number][]>();
  const add = (x: number, z: number) => (grid.get(key(x, z)) ?? grid.set(key(x, z), []).get(key(x, z))!).push([x, z]);
  const crowded = (x: number, z: number, r: number) => {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [tx, tz] of grid.get(key(x + i * C, z + j * C)) ?? []) if (Math.hypot(tx - x, tz - z) < r) return true;
    return false;
  };
  for (const t of pl.trees) add(t.x, t.z);
  const GROVE: [string, number][] = [['douglas_fir_medium', 1.0], ['maple_large', 0.85], ['oak_medium', 0.9], ['birch_cluster', 0.9], ['cedar_broad', 0.8], ['maple_medium', 1.0], ['fir_young', 1.1]];
  const UNDER = ['fern', 'bush_wide', 'bush_round_a', 'grass_tall_a', 'grass_tall_b', 'weeds_a'];
  let [x0, x1, z0, z1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const h of pl.sites) [x0, x1, z0, z1] = [Math.min(x0, h.x), Math.max(x1, h.x), Math.min(z0, h.z), Math.max(z1, h.z)];
  const base0 = (x: number, z: number) => heightAt(x, z);
  for (let gx = x0; gx <= x1; gx += 6.5)
    for (let gz = z0; gz <= z1; gz += 6.5) {
      const [x, z] = [gx + rng.range(-2, 2), gz + rng.range(-2, 2)];
      // ringed by homes: one within 48 m in at least three quadrants
      let q = 0;
      for (const h of homes) {
        const [dx, dz] = [h.x - x, h.z - z];
        if (dx * dx + dz * dz < 48 * 48) q |= 1 << ((dx > 0 ? 1 : 0) + (dz > 0 ? 2 : 0));
      }
      if (((q & 1) + ((q >> 1) & 1) + ((q >> 2) & 1) + ((q >> 3) & 1)) < 3) {
        // or a leftover block in town: buildings of any kind on all four sides within 130 m
        let q2 = 0;
        for (const h of pl.sites) {
          const [dx, dz] = [h.x - x, h.z - z];
          if (dx * dx + dz * dz < 130 * 130) q2 |= 1 << ((dx > 0 ? 1 : 0) + (dz > 0 ? 2 : 0));
        }
        if (q2 !== 15) continue;
      }
      let ok = clear(pl, x, z, 2);
      for (let a = 0; ok && a < 8; a++) ok = clear(pl, x + Math.cos(a * 0.785) * 4.5, z + Math.sin(a * 0.785) * 4.5, 1);
      if (!ok || crowded(x, z, 5) || Math.abs(base0(x + 3, z) - base0(x - 3, z)) > 2.5) continue;
      const [kind, sc] = rng.pick(GROVE);
      pl.trees.push({ kind, x, z, s: sc * rng.range(0.9, 1.3), ry: rng.range(0, PI * 2) });
      add(x, z);
      for (let i = 0; i < 3; i++) {
        const [ux, uz] = [x + rng.range(-3, 3), z + rng.range(-3, 3)];
        if (clear(pl, ux, uz, 0.3)) pl.trees.push({ kind: rng.pick(UNDER), x: ux, z: uz, s: rng.range(0.8, 1.3), ry: rng.range(0, PI * 2) });
      }
    }
}

export function yards(pl: Placer) {
  const k = pl.k;
  const rng = new Rng(4141);
  const plant = (s: { x: number; z: number; ry: number }, kind: string, lx: number, lz: number, sc = 1, ry?: number) => {
    const [x, z] = Placer.world(s.x, s.z, s.ry, lx, lz);
    if (clear(pl, x, z, 0.2)) pl.trees.push({ kind, x, z, s: sc, ry: ry ?? rng.range(0, PI * 2) });
  };
  for (const s of pl.sites) {
    if (!s.def.tags.includes('house') && !s.def.tags.includes('shack')) continue;
    const hw = s.def.w / 2 + 3.4;
    const zb = -s.def.d / 2;
    let yd = rng.range(11, 14);
    const zf = zb + 3;
    const W = (lx: number, lz: number) => Placer.world(s.x, s.z, s.ry, lx, lz);
    const corners = [W(-hw, zb - yd), W(hw, zb - yd), W(0, zb - yd), W(-hw, zb - yd / 2), W(hw, zb - yd / 2), W(0, zb - yd / 2)];
    const open = corners.every(([x, z]) => clear(pl, x, z));
    const base = heightAt(s.x, s.z);
    let style = rng.range(0, 1);
    // suburban homes use their back yards: a pool, a deck or a patio, where the ground is level enough for one
    const yr = new Rng(9000 + ((s.x * 13 + s.z * 7) | 0));
    const level = (depth: number, tol: number) => [[-hw, zb - depth], [hw, zb - depth], [-hw, zb - 2], [hw, zb - 2], [0, zb - depth / 2]].every(([lx, lz]) => {
      const [x, z] = W(lx, lz);
      return Math.abs(heightAt(x, z) - base) < tol && clear(pl, x, z);
    });
    let kind: 'pool' | 'deck' | 'patio' | null = null;
    if (open && s.def.tags.includes('house') && !s.def.tags.includes('shack')) {
      const roll = yr.next();
      if (roll < 0.2 && s.def.w + 6.8 >= 15.4 && level(14.5, 0.3)) {
        kind = 'pool';
        yd = 14.5;
        style = 0.3;
      } else if (roll < 0.36 && level(6, 0.45)) kind = 'deck';
      else if (roll < 0.66 && level(6, 0.3)) kind = 'patio';
    }
    let taken: Rect[] = [];
    const free = (lx: number, lz: number, r: number) => taken.every(([x0, z0, x1, z1]) => lx < x0 - r || lx > x1 + r || lz < z0 - r || lz > z1 + r);
    k.at(s.x, s.z, s.ry, () => {
      if (open && style < 0.8) {
        const col = kind === 'pool' ? yr.pick(GREYS) : rng.pick(WOODS);
        const gate = rng.pick([-1, 1]);
        const raw = style < 0.55 ? (a: number, b: number, c: number, d: number) => boardFence(k, a, b, c, d, col, style < 0.2 ? 1.2 : 1.7) : style < 0.68 ? (a: number, b: number, c: number, d: number) => chainLink(k, a, b, c, d) : (a: number, b: number, c: number, d: number) => picketFence(k, a, b, c, d);
        const run = (a: number, b: number, c: number, d: number) => {
          const [p, q] = [W(a, b), W(c, d)];
          if (!wet(p[0], p[1], q[0], q[1])) raw(a, b, c, d);
        };
        run(-hw, zf, -hw, zb - yd);
        run(hw, zb - yd, hw, zf);
        run(-hw, zb - yd, hw, zb - yd);
        for (const sd of [-1, 1]) if (sd !== gate) run(sd * hw, zf, sd * (s.def.w / 2), zf);
      }
      if (kind) taken = backyard(pl, s, hw, zb, yd, kind, yr, (kd, lx, lz, sc) => plant(s, kd, lx, lz, sc));
      if (open) {
        const sx = rng.pick([-1, 1]) * (hw - 2.6);
        if (rng.chance(0.5) && free(sx, zb - yd + 2.4, 2)) shed(k, rng, sx, zb - yd + 2.4, rng.pick([0, PI / 2]));
        const cx = rng.range(-2, 2);
        if (rng.chance(0.3) && free(cx, zb - yd * 0.45, 2.5)) clothesline(k, cx, zb - yd * 0.45, rng.pick([0, PI / 2]), rng);
        if (rng.chance(0.25)) put(k, 'cellar_bulkhead', rng.range(-2, 2), 0, zb - 0.9, PI, { solid: 0.5 });
      }
      // bins by the side wall
      const bs = rng.pick([-1, 1]);
      if (rng.chance(0.75)) put(k, rng.pick(['wheelie_bin', 'trash_can_metal', 'trash_can_metal']), bs * (s.def.w / 2 + 0.6), 0, zb + rng.range(2, 5), bs * PI / 2);
      if (rng.chance(0.35)) put(k, rng.pick(['wheelie_bin', 'trash_can_metal_tipped', 'trash_bag_a']), bs * (s.def.w / 2 + 0.7), 0, zb + rng.range(5.5, 7), rng.range(0, 6), { solid: false });
    }, base);
    if (open) {
      const n = rng.pick([1, 1, 2, 2, 3, 3]);
      for (let i = 0; i < n; i++) {
        const [kind, sc] = yardTree(rng);
        const [tx, tz] = [rng.range(-hw + 3, hw - 3), zb - rng.range(4, yd - 2.5)];
        if (free(tx, tz, 2.2)) plant(s, kind, tx, tz, sc * rng.range(0.85, 1.15));
      }
      if (rng.chance(0.35)) plant(s, 'firewood_stack', rng.pick([-1, 1]) * (hw - 0.6), zb - rng.range(2, yd - 3), 1, PI / 2 + s.ry);
      if (rng.chance(0.3)) for (let i = 0; i < 3; i++) plant(s, 'flower_bed', -hw + 1.6 + i * 1.7, zb - yd + 1.2, 1, s.ry);
      for (let i = 0; i < 7; i++) plant(s, rng.pick(['weeds_a', 'weeds_b', 'grass_tall_a', 'grass_tall_b', 'dandelion_patch', 'dandelion_patch']), rng.pick([-1, 1]) * (hw - rng.range(0.3, 0.9)), zb - rng.range(0, yd), rng.range(0.8, 1.3));
    }
    // the driveway: a hoop over the garage, the kids' bikes, a hose reel by the front wall
    if (s.def.drive !== undefined) {
      const dx = s.def.drive;
      const zd = s.def.d / 2 + 0.6;
      k.at(s.x, s.z, s.ry, () => {
        if (rng.chance(0.22)) put(k, 'basketball_hoop', dx + rng.range(-0.4, 0.4), 0, zd, 0, { solid: 0.3 });
        if (rng.chance(0.15)) put(k, rng.pick(['bicycle', 'bmx_bike']), dx + rng.range(-1.6, 1.6), 0, zd + rng.range(1.5, 4), rng.range(0, 6), { solid: false });
        if (rng.chance(0.2)) put(k, 'garden_hose_reel', dx + rng.pick([-1, 1]) * 2.4, 0, s.def.d / 2 + 0.4, 0, { solid: 0.2 });
      }, base);
    }
    // foundation planting and a front-lawn tree
    for (const sd of [-1, 1]) {
      const m = rng.pick([0, 1, 2, 3]);
      for (let i = 0; i < m; i++) plant(s, rng.pick(['bush_round_a', 'bush_round_b', 'bush_flowering_a', 'bush_flowering_b', 'bush_wide', 'topiary_ball', 'fern']), sd * (s.def.w / 2 + 0.9), zb + 2.5 + i * 2.2 + rng.range(-0.3, 0.3), rng.range(0.8, 1.1));
    }
    if (rng.chance(0.75)) {
      const [kind, sc] = yardTree(rng);
      plant(s, kind, rng.pick([-1, 1]) * (s.def.w / 2 + rng.range(0.5, 2.5)), s.def.d / 2 + rng.range(1.5, 3.5), sc);
    }
    if (rng.chance(0.3)) for (let i = 0; i < 4; i++) plant(s, rng.pick(['hedge_straight', 'hedge_straight', 'hedge_tall']), -hw + 0.2, zb + 4 + i * 2, 1, s.ry + PI / 2);
  }
  blockInteriors(pl);
}


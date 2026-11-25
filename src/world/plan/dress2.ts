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
function backyard(pl: Placer, s: { x: number; z: number; ry: number; def: { w: number } }, hw: number, zb: number, yd: number, kind: 'pool' | 'deck' | 'patio', rng: Rng): Rect[] {
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
  if (kind === 'pool') {
    const rect = rng.chance(0.4);
    const [pw, pd] = rect ? [11.4, 6.6] : [10.4, 7.6];
    const room = hw * 2 - pw;
    const px = room > 5.5 ? sd * (hw - pw / 2 - 0.9) : 0;
    const pz = zb - 2.2 - pd / 2 - Math.max(0, (yd - pd - 4.5) / 2);
    put(k, rect ? 'yard_pool_rect' : 'yard_pool_kidney', px, 0, pz, rng.chance(0.5) ? PI : 0, { solid: false });
    take(px, pz, pw + 1, pd + 1);
    // on the pool deck: loungers along the far side, toys by the shallow end
    const ly = 0.2;
    for (let i = 0; i < rng.pick([2, 2, 3]); i++) put(k, 'sun_lounger', px - 2.4 + i * 2.3 + rng.range(-0.1, 0.1), ly, pz - pd / 2 + 0.42, PI / 2 + rng.range(-0.05, 0.05), { solid: false });
    if (rng.chance(0.7)) put(k, 'pool_toys', px + sd * -(pw / 2 - 1.3), ly, pz + rng.range(-0.6, 0.6), rng.range(0, 6), { solid: false });
    if (room > 5.5) {
      // a paved terrace beside the pool for the table and the grill
      const tx = -sd * (hw - 2.6);
      const tz = zb - 3.6;
      put(k, 'yard_patio', tx, 0, tz, PIh, { solid: false });
      take(tx, tz, 4.6, 5.8);
      table(tx, 0.07, tz - 0.5);
      grill(tx + sd * 1.3, 0.07, tz + 2.0, PI);
      if (rng.chance(0.4)) put(k, 'hot_tub', tx, 0, tz - 5.2, PI, { solid: 1.1 }) && take(tx, tz - 5.2, 3, 3.6);
    } else {
      put(k, 'picnic_table_party', px + sd * (pw / 2 - 1.6), ly, pz + pd / 2 - 1.05, rng.range(-0.1, 0.1), { solid: 0.9 });
    }
    return taken;
  }
  const fx = sd * rng.range(0, Math.max(0, s.def.w / 2 - 3));
  if (kind === 'deck') {
    put(k, 'yard_deck', fx, 0, zb - 1.85, PI, { solid: false });
    k.solid(fx, zb - 1.85, 5, 3.6);
    take(fx, zb - 2.6, 6, 6.4);
    put(k, 'patio_table_umbrella_open', fx + 1.1, 0.55, zb - 1.9, rng.range(0, 3), { solid: false });
    chairs(fx + 1.1, 0.55, zb - 1.9, 3, 1.05);
    put(k, 'bbq_grill', fx - 1.7, 0.55, zb - 0.9, PI, { solid: false });
    if (rng.chance(0.6)) put(k, 'adirondack_chair', fx - 1.5, 0.55, zb - 2.7, PI + 0.5, { solid: false });
  } else {
    const conc = rng.chance(0.45);
    put(k, conc ? 'yard_patio_conc' : 'yard_patio', fx, 0, zb - 2.3, 0, { solid: false });
    take(fx, zb - 2.3, 6, 5);
    if (rng.chance(0.3)) put(k, 'pergola', fx, 0.07, zb - 2.3, 0, { solid: false });
    table(fx - 0.6, 0.07, zb - 2.5);
    grill(fx + 1.9, 0.07, zb - 0.9, PI);
    if (conc && rng.chance(0.35)) put(k, 'sun_lounger', fx + 1.8, 0.07, zb - 3.0, 0.3, { solid: false });
  }
  // what the rest of the lawn is used for
  const zr = zb - yd + 3.2;
  const xs = [-(hw - 3.6), hw - 3.6];
  if (rng.chance(0.5)) xs.reverse();
  const extra = rng.pick(['swing', 'beds', 'fire', 'swing', 'beds', 'tramp', 'none']);
  if (yd > 11.5) {
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
      if (roll < 0.16 && s.def.w + 6.8 >= 13.4 && level(14.5, 0.3)) {
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
      if (kind) taken = backyard(pl, s, hw, zb, yd, kind, yr);
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
}


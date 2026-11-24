import { Rng } from '../core/rng';
import type { Col } from '../core/kit';
import { Placer } from './placer';
import { heightAt } from '../terrain';
import { put } from '../b2/hull';
import { gable } from '../b2/parts';
import { utilityPole, connectPoles, picketFence } from '../props';
import { GRID, STREETS } from './roads';
import type * as THREE from 'three';

type Kit = Placer['k'];
const PI = Math.PI;
const WOODS: Col[] = [0x8a6a48, 0x7a5a3c, 0x9a7a55, 0x6f6a62, 0xb9a98a];

/** Board fence between two points of the current frame: posts, two rails and a run of boards. */
function boardFence(k: Kit, ax: number, az: number, bx: number, bz: number, col: Col, h = 1.7) {
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
function chainLink(k: Kit, ax: number, az: number, bx: number, bz: number, h = 1.3) {
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
function shed(k: Kit, rng: Rng, x: number, z: number, ry: number) {
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
function clothesline(k: Kit, x: number, z: number, ry: number, rng: Rng) {
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
function clear(pl: Placer, x: number, z: number, pad = 0.5) {
  if (pl.c.occ.blocked(x, z, pad)) return false;
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
export function yards(pl: Placer) {
  const k = pl.k;
  const rng = new Rng(4141);
  const plant = (s: { x: number; z: number; ry: number }, kind: string, lx: number, lz: number, sc = 1, ry?: number) => {
    const [x, z] = Placer.world(s.x, s.z, s.ry, lx, lz);
    if (clear(pl, x, z, 0.2)) pl.trees.push({ kind, x, z, s: sc, ry: ry ?? rng.range(0, PI * 2) });
  };
  for (const s of pl.sites) {
    if (!s.def.tags.includes('house')) continue;
    const hw = s.def.w / 2 + 3.4;
    const zb = -s.def.d / 2;
    const yd = rng.range(11, 14);
    const zf = zb + 3;
    const W = (lx: number, lz: number) => Placer.world(s.x, s.z, s.ry, lx, lz);
    const corners = [W(-hw, zb - yd), W(hw, zb - yd), W(0, zb - yd), W(-hw, zb - yd / 2), W(hw, zb - yd / 2), W(0, zb - yd / 2)];
    const open = corners.every(([x, z]) => clear(pl, x, z));
    const base = heightAt(s.x, s.z);
    const style = rng.range(0, 1);
    k.at(s.x, s.z, s.ry, () => {
      if (open && style < 0.8) {
        const col = rng.pick(WOODS);
        const gate = rng.pick([-1, 1]);
        const run = style < 0.55 ? (a: number, b: number, c: number, d: number) => boardFence(k, a, b, c, d, col, style < 0.2 ? 1.2 : 1.7) : style < 0.68 ? (a: number, b: number, c: number, d: number) => chainLink(k, a, b, c, d) : (a: number, b: number, c: number, d: number) => picketFence(k, a, b, c, d);
        run(-hw, zf, -hw, zb - yd);
        run(hw, zb - yd, hw, zf);
        run(-hw, zb - yd, hw, zb - yd);
        for (const sd of [-1, 1]) if (sd !== gate) run(sd * hw, zf, sd * (s.def.w / 2), zf);
      }
      if (open) {
        if (rng.chance(0.5)) shed(k, rng, rng.pick([-1, 1]) * (hw - 2.6), zb - yd + 2.4, rng.pick([0, PI / 2]));
        if (rng.chance(0.3)) clothesline(k, rng.range(-2, 2), zb - yd * 0.45, rng.pick([0, PI / 2]), rng);
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
        plant(s, kind, rng.range(-hw + 3, hw - 3), zb - rng.range(4, yd - 2.5), sc * rng.range(0.85, 1.15));
      }
      if (rng.chance(0.35)) plant(s, 'firewood_stack', rng.pick([-1, 1]) * (hw - 0.6), zb - rng.range(2, yd - 3), 1, PI / 2 + s.ry);
      if (rng.chance(0.3)) for (let i = 0; i < 3; i++) plant(s, 'flower_bed', -hw + 1.6 + i * 1.7, zb - yd + 1.2, 1, s.ry);
      for (let i = 0; i < 7; i++) plant(s, rng.pick(['weeds_a', 'weeds_b', 'grass_tall_a', 'grass_tall_b', 'dandelion_patch', 'dandelion_patch']), rng.pick([-1, 1]) * (hw - rng.range(0.3, 0.9)), zb - rng.range(0, yd), rng.range(0.8, 1.3));
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

/** Gravel service alleys down the middle of each block, with the back-lot power line and its clutter. */
export function alleys(pl: Placer) {
  const k = pl.k;
  const rng = new Rng(5151);
  const rows = [STREETS.river, STREETS.main, STREETS.alder, STREETS.maple, STREETS.shore];
  for (let r = 0; r < rows.length - 1; r++) {
    const zm = (rows[r] + rows[r + 1]) / 2;
    for (let x0 = GRID.x0; x0 < GRID.x1; x0 += GRID.step) {
      const poles: THREE.Vector3[][] = [];
      let laid = 0;
      for (let x = x0 + 10; x <= x0 + GRID.step - 10; x += 3) {
        if (!clear(pl, x, zm, 1.6) || !clear(pl, x, zm - 1.8, 0) || !clear(pl, x, zm + 1.8, 0)) continue;
        k.at(x, zm, 0, () => k.box(0, -0.2, 0, 3.02, 0.24, 4.2, 0x9a958a, 'gravel', { cast: false }), heightAt(x, zm));
        laid++;
        if (rng.chance(0.1)) pl.trees.push({ kind: rng.pick(['weeds_a', 'weeds_b', 'grass_tall_b']), x: x + rng.range(-1, 1), z: zm + rng.pick([-1, 1]) * 2.3, s: rng.range(0.9, 1.4), ry: rng.range(0, 6) });
        if (rng.chance(0.06)) k.at(x, zm + rng.pick([-1, 1]) * 2.6, rng.range(0, 6), () => put(k, rng.pick(['trash_can_metal', 'wheelie_bin', 'trash_bag_b', 'cardboard_box_flat', 'tyre', 'trash_can_metal_tipped']), 0, 0, 0, 0, { solid: false }), heightAt(x, zm));
      }
      if (laid < 8) continue;
      for (let x = x0 + 14; x <= x0 + GRID.step - 14; x += 31) {
        if (!clear(pl, x, zm + 2.9, 0.4)) continue;
        let att: THREE.Vector3[] = [];
        k.at(x, zm + 2.9, PI / 2, () => (att = utilityPole(k, 0, 0, 0, { h: 9, transformer: rng.chance(0.35) })), heightAt(x, zm + 2.9));
        poles.push(att);
      }
      connectPoles(k, poles);
    }
  }
}

import type { Kit } from '../core/kit';
import type { Rng } from '../core/rng';
import { asset } from '../assets';
import { warm } from './hull';

/** Room rectangle in the building's local frame (floor coordinates are applied by `room()`). */
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
export type Wall = 'f' | 'b' | 'l' | 'r';
type AO = NonNullable<Parameters<Kit['asset']>[5]> & { y?: number };

/** Places a model on the floor at (x, z); collides unless `solid: false`. Lit as interior. */
export function item(k: Kit, name: string, x: number, z: number, ry = 0, o: AO = {}): boolean {
  const a = asset(name);
  if (!a) return false;
  warm(k, () => k.asset(name, x, o.y ?? 0, z, ry, { cast: false, solid: a.h > 0.35 && a.min.y < 0.5 ? Math.min(a.h, 1.6) : false, ...o }));
  return true;
}

/**
 * Stands a model with its back against a wall of the room (b = far wall at z0, f = near wall at z1), `t` (0-1)
 * along that wall, facing into the room; `off` pulls it away from the wall.
 */
export function against(k: Kit, R: Rect, wall: Wall, t: number, name: string, o: AO & { off?: number } = {}): boolean {
  const a = asset(name);
  if (!a) return false;
  const back = -a.min.z + (o.off ?? 0.03);
  const lx = R.x0 + (R.x1 - R.x0) * t;
  const lz = R.z0 + (R.z1 - R.z0) * t;
  if (wall === 'b') return item(k, name, lx, R.z0 + back, 0, o);
  if (wall === 'f') return item(k, name, lx, R.z1 - back, Math.PI, o);
  if (wall === 'l') return item(k, name, R.x0 + back, lz, Math.PI / 2, o);
  return item(k, name, R.x1 - back, lz, -Math.PI / 2, o);
}

const mid = (R: Rect) => [(R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2] as const;
const PICS = ['wall_picture_1', 'wall_picture_2', 'wall_picture_3', 'wall_picture_4'];

/** Sitting room: sofa facing a console TV over a rug, armchair, lamp, shelves, pictures. `tv` is the TV wall. */
export function living(k: Kit, rng: Rng, R: Rect, tv: Wall = 'l') {
  const [cx, cz] = mid(R);
  const sofa: Wall = tv === 'l' ? 'r' : tv === 'r' ? 'l' : tv === 'b' ? 'f' : 'b';
  const horiz = tv === 'l' || tv === 'r';
  item(k, 'rug_rect', cx, cz, horiz ? Math.PI / 2 : 0, { solid: false });
  against(k, R, tv, 0.42, rng.chance(0.6) ? 'tv_crt_console' : 'tv_stand');
  against(k, R, sofa, 0.5, rng.chance(0.7) ? 'sofa_3' : 'sofa_2', { off: 0.25 });
  item(k, 'coffee_table', cx, cz, horiz ? Math.PI / 2 : 0);
  item(k, 'coffee_table_setting', cx, cz, 0, { solid: false, y: asset('coffee_table')?.h ?? 0.4 });
  against(k, R, sofa, 0.5, rng.pick(PICS), { solid: false });
  against(k, R, sofa, 0.9, 'floor_lamp', { off: 0.2 });
  against(k, R, tv, 0.14, rng.chance(0.5) ? 'bookshelf_full' : 'record_player_stand');
  against(k, R, tv, 0.93, 'potted_plant_2', { off: 0.15 });
  const side: Wall = horiz ? 'b' : 'l';
  if (!against(k, R, side, 0.5, rng.chance(0.5) ? 'fireplace_brick' : 'piano_upright')) against(k, R, side, 0.5, 'bookshelf_low');
  against(k, R, side, 0.2, 'armchair', { off: 0.4 });
  against(k, R, side, 0.8, rng.pick(PICS), { solid: false });
  item(k, 'ceiling_fan', cx, cz, 0, { solid: false, y: 2.7 });
}

/** Kitchen: counter run with sink, stove and fridge along `run`, wall cabinets above, table and chairs. */
export function kitchen(k: Kit, rng: Rng, R: Rect, run: Wall = 'b') {
  const len = run === 'b' || run === 'f' ? R.x1 - R.x0 : R.z1 - R.z0;
  const units = ['fridge_80s', 'kitchen_base_cabinet', 'kitchen_sink_unit', 'kitchen_drawer_cabinet', 'stove_oven', 'kitchen_base_cabinet', 'kitchen_drawer_cabinet', 'kitchen_base_cabinet'];
  let s = 0.08;
  for (const u of units) {
    const a = asset(u);
    if (!a || s + a.w > len - 0.1) break;
    against(k, R, run, (s + a.w / 2) / len, u);
    if (u !== 'fridge_80s' && u !== 'kitchen_sink_unit' && u !== 'stove_oven') {
      against(k, R, run, (s + a.w / 2) / len, rng.chance(0.75) ? 'kitchen_wall_cabinet' : 'kitchen_wall_shelf', { solid: false });
      const top = rng.pick(['microwave', 'toaster', 'kettle', 'dish_rack', '']);
      if (top) warm(k, () => against(k, R, run, (s + a.w / 2) / len, top, { solid: false, off: 0.12, y: 0.92 }));
    }
    s += a.w + 0.01;
  }
  const [cx, cz] = mid(R);
  const off = run === 'b' ? [0, 0.7] : run === 'f' ? [0, -0.7] : run === 'l' ? [0.7, 0] : [-0.7, 0];
  const tx = cx + off[0];
  const tz = cz + off[1];
  const six = Math.min(R.x1 - R.x0, R.z1 - R.z0) > 3.6 && rng.chance(0.5);
  item(k, six ? 'dining_table_6' : 'dining_table_4', tx, tz);
  item(k, six ? 'dining_setting_6' : 'dining_setting_4', tx, tz, 0, { solid: false, y: 0.76 });
  const cw = (six ? 1.9 : 1.2) / 2;
  for (const sx of six ? [-0.55, 0.55] : [0]) {
    item(k, 'dining_chair', tx + sx, tz - 0.62, 0, { solid: false });
    item(k, 'dining_chair', tx + sx, tz + 0.62, Math.PI, { solid: false });
  }
  item(k, 'dining_chair', tx - cw - 0.2, tz, Math.PI / 2, { solid: false });
  item(k, 'dining_chair', tx + cw + 0.2, tz, -Math.PI / 2, { solid: false });
  item(k, 'pendant_lamp', tx, tz, 0, { solid: false, y: 2.7 });
  const opp: Wall = run === 'b' ? 'f' : run === 'f' ? 'b' : run === 'l' ? 'r' : 'l';
  against(k, R, opp, 0.85, 'trash_bin_kitchen');
  against(k, R, opp, 0.5, 'wall_clock', { solid: false });
}

/** Bedroom: bed with its head on `head`, nightstands with lamps, wardrobe, dresser, rug. */
export function bedroom(k: Kit, rng: Rng, R: Rect, head: Wall = 'b', kid = false) {
  const [cx, cz] = mid(R);
  const bed = kid ? rng.pick(['bed_single', 'bunk_bed']) : 'bed_double';
  const bw = asset(bed)?.w ?? 1.6;
  const len = head === 'b' || head === 'f' ? R.x1 - R.x0 : R.z1 - R.z0;
  against(k, R, head, 0.5, bed);
  for (const s of [-1, 1]) {
    const t = 0.5 + (s * (bw / 2 + 0.34)) / len;
    if (against(k, R, head, t, 'nightstand')) warm(k, () => against(k, R, head, t, 'table_lamp', { solid: false, off: 0.12, y: 0.62 }));
  }
  against(k, R, head, 0.5, rng.pick(PICS), { solid: false });
  item(k, rng.chance(0.5) ? 'rug_round' : 'rug_rect', cx, cz, 0, { solid: false });
  const opp: Wall = head === 'b' ? 'f' : head === 'f' ? 'b' : head === 'l' ? 'r' : 'l';
  const side: Wall = head === 'b' || head === 'f' ? 'l' : 'b';
  against(k, R, opp, 0.25, 'wardrobe');
  against(k, R, opp, 0.72, kid ? 'toy_box' : 'dresser');
  against(k, R, side, 0.82, kid ? 'bookshelf_low' : 'vanity_desk');
  if (!kid) against(k, R, side, 0.82, 'vanity_stool', { off: 0.6, solid: false });
  against(k, R, side, 0.3, 'wall_mirror', { solid: false });
}

/** Bathroom: tub or shower on the far wall, toilet, basin with mirror cabinet, towel rail. */
export function bath(k: Kit, rng: Rng, R: Rect, tub: Wall = 'b') {
  const side: Wall = tub === 'b' || tub === 'f' ? 'r' : 'b';
  against(k, R, tub, 0.5, R.x1 - R.x0 > 1.9 && rng.chance(0.7) ? 'bathtub' : 'shower_stall');
  against(k, R, side, 0.3, 'toilet');
  against(k, R, side, 0.72, rng.chance(0.5) ? 'sink_vanity' : 'sink_pedestal');
  against(k, R, side, 0.72, 'bath_mirror_cabinet', { solid: false });
  const opp: Wall = side === 'r' ? 'l' : 'f';
  against(k, R, opp, 0.4, 'towel_rail', { solid: false });
  against(k, R, opp, 0.8, 'laundry_basket');
}

/** Utility corner: washer, dryer, water heater. */
export function laundry(k: Kit, R: Rect, wall: Wall = 'b') {
  against(k, R, wall, 0.2, 'washer');
  against(k, R, wall, 0.5, 'dryer');
  against(k, R, wall, 0.85, 'water_heater');
}

import { Rng } from '../core/rng';
import type { Col } from '../core/kit';
import type { Road } from '../roads/network';
import { heightAt, isWater } from '../terrain';
import { put } from '../b2/hull';
import { Placer } from './placer';

const PI = Math.PI;
type Site = Placer['sites'][number];

/** Streets people live on: kerbed, with sidewalks, outside the shopping streets. */
const LIVED = new Set(['residential', 'collector']);

/** The street a house faces and how far its front door is from the back of that street's sidewalk. */
function facing(pl: Placer, s: Site) {
  const x = s.def.door ?? 0;
  const z0 = (s.def.front ?? s.def.d / 2) + 1.3;
  for (let t = 0.5; t < 16; t += 0.25) {
    const [wx, wz] = Placer.world(s.x, s.z, s.ry, x, z0 + t);
    const hit = pl.net.near(wx, wz).find((h) => Math.abs(h.lat) < h.road.full);
    if (hit) return LIVED.has(hit.road.kind) && hit.road.spec.curb ? { road: hit.road, z0, len: t } : null;
  }
  return null;
}

/**
 * The lived-in look of the ordinary streets: every house gets a front walk and a household of its own (a fenced
 * or hedged front, flower beds, kids' things, a project in the drive, a boat on a trailer, bins out for
 * collection), and the streets themselves get drains, patched asphalt, name and speed signs and gutter litter.
 */
export function streets(pl: Placer) {
  const k = pl.k;
  const rng = new Rng(2025);
  const clearOf = (x: number, z: number, r = 0.4) => !isWater(x, z) && !pl.c.occ.solids?.blocked(x, z, r) && !pl.onStreet(x, z, 0.2) && !pl.drives.blocked(x, z, r);
  const slab = (x: number, z: number, ry: number, w: number, d: number, color: Col, mat: string, h = 0.05) =>
    k.at(x, z, ry, () => k.box(0, -0.3, 0, w, 0.3 + h, d, color, mat, { cast: false }), heightAt(x, z));

  for (const s of pl.sites) {
    if (!s.def.tags.includes('house') && !s.def.tags.includes('shack')) continue;
    const f = facing(pl, s);
    if (!f) continue;
    const worn = s.def.tags.includes('shack');
    const W = (lx: number, lz: number) => Placer.world(s.x, s.z, s.ry, lx, lz);
    const drop = (name: string, lx: number, lz: number, ry = 0, solid: boolean | number = 0.4, r = 0.5) => {
      const [x, z] = W(lx, lz);
      if (!clearOf(x, z, r)) return false;
      k.at(x, z, ry + s.ry, () => put(k, name, 0, 0, 0, 0, { solid }), heightAt(x, z));
      if (solid) pl.c.occ.solids?.add(x, z, 0.8, 0.8, 0, 0, false);
      return true;
    };
    const plant = (kind: string, lx: number, lz: number, sc = 1, ry = 0) => {
      const [x, z] = W(lx, lz);
      if (clearOf(x, z, 0.2)) pl.trees.push({ kind, x, z, s: sc, ry: ry + s.ry });
    };
    const door = s.def.door ?? 0;
    const zs = f.z0 + f.len; // back of the sidewalk
    const hw = s.def.w / 2 + 2.6;
    const drive = s.def.drive;
    const onDrive = (lx: number) => drive !== undefined && Math.abs(lx - drive) < 2.6;

    // front walk from the steps to the sidewalk: poured concrete, or stepping stones at the poorer houses
    if (f.len > 1.2) {
      const stones = worn && rng.chance(0.6);
      for (let t = stones ? 0.5 : 0.4; t < f.len + 0.2; t += stones ? 1.15 : 0.8) {
        const [x, z] = W(door + (stones ? rng.range(-0.12, 0.12) : 0), f.z0 + t);
        if (pl.drives.blocked(x, z, 0.1)) continue;
        slab(x, z, s.ry + (stones ? rng.range(-0.3, 0.3) : 0), stones ? 0.75 : 1.25, stones ? 0.6 : 0.82, stones ? 0x8f8b82 : 0xb4b0a6, 'concrete', stones ? 0.035 : 0.045);
      }
    }

    // the front boundary: picket fence with a gate at the walk, a clipped hedge, or open lawn
    const edge = rng.next();
    const zf = zs - 0.55;
    if (f.len > 3.2 && edge < (worn ? 0.22 : 0.42)) {
      const hedge = !worn && edge < 0.12;
      const step = 2;
      for (let lx = -hw; lx < hw - 0.5; lx += step) {
        const mid = lx + step / 2;
        if (Math.abs(mid - door) < (hedge ? 1.9 : 1.75) || onDrive(mid) || onDrive(lx) || onDrive(lx + step)) continue;
        const [x, z] = W(mid, zf);
        if (!clearOf(x, z, 0.3)) continue;
        if (hedge) pl.trees.push({ kind: 'hedge_straight', x, z, s: 1, ry: s.ry });
        else k.at(x, z, s.ry, () => put(k, 'fence_picket', 0, 0, 0, 0, { solid: false }), heightAt(x, z));
      }
      if (!hedge) {
        for (const sd of [-1, 1]) drop('fence_picket_post', door + sd * 0.72, zf, 0, false, 0.1);
        if (rng.chance(0.6)) drop('fence_picket_gate', door, zf, 0, false, 0.1);
        // returns up the sides of the lawn
        for (const sd of [-1, 1]) {
          if (onDrive(sd * hw)) continue;
          for (let lz = zf - 1; lz > f.z0 - 1.5; lz -= 2) {
            const [x, z] = W(sd * hw, lz);
            if (clearOf(x, z, 0.3)) k.at(x, z, s.ry + PI / 2, () => put(k, 'fence_picket', 0, 0, 0, 0, { solid: false }), heightAt(x, z));
          }
        }
      }
    }

    // a spot on the front lawn, clear of the walk and the drive
    const lawn = (): [number, number] | null => {
      for (let i = 0; i < 6; i++) {
        const lx = rng.range(-hw + 1.2, hw - 1.2);
        const lz = rng.range(f.z0 + 0.6, Math.max(f.z0 + 0.8, zf - 1.3));
        if (Math.abs(lx - door) < 1.5 || onDrive(lx)) continue;
        return [lx, lz];
      }
      return null;
    };
    const onLawn = (name: string, solid: boolean | number = 0.4, ry = rng.range(0, 6)) => {
      const p = lawn();
      return p ? drop(name, p[0], p[1], ry, solid) : false;
    };

    // who lives here
    const home = rng.pick(worn ? ['neglect', 'neglect', 'kids', 'diy', 'plain'] : ['garden', 'garden', 'kids', 'kids', 'diy', 'retired', 'plain', 'sale']);
    if (home === 'garden') {
      // beds either side of the walk and under the front windows, a bird bath, the barrow left out
      for (let t = 0.8; t < f.len - 0.6; t += 1.3) for (const sd of [-1, 1]) plant(rng.pick(['flower_clump_a', 'flower_clump_b']), door + sd * 1.0, f.z0 + t, rng.range(1, 1.5), rng.range(0, 6));
      for (let lx = -s.def.w / 2 + 1.2; lx < s.def.w / 2 - 1; lx += 1.7) if (Math.abs(lx - door) > 2 && !onDrive(lx)) plant('flower_bed', lx, (s.def.front ?? s.def.d / 2) + 0.9, 1, 0);
      onLawn(rng.pick(['bird_bath', 'garden_gnome', 'planter_round']));
      if (rng.chance(0.5)) onLawn('wheelbarrow', 0.5);
      if (rng.chance(0.5)) drop('garden_hose_reel', door + 2.2, (s.def.front ?? s.def.d / 2) + 0.4, PI, 0.3);
      if (rng.chance(0.4)) onLawn('garden_gnome', false);
    } else if (home === 'kids') {
      onLawn(rng.pick(['bmx_bike', 'bicycle']), false);
      if (rng.chance(0.6)) onLawn(rng.pick(['kiddie_pool', 'sandbox']), 0.6);
      if (rng.chance(0.5)) onLawn('bmx_bike', false);
      if (drive !== undefined && rng.chance(0.7)) drop('basketball_hoop', drive - 2.5, f.z0 + 1.2, -PI / 2, 0.4);
      if (rng.chance(0.4)) onLawn('doghouse', 0.6, rng.range(-0.4, 0.4));
    } else if (home === 'diy') {
      onLawn('lawn_mower', 0.5);
      if (rng.chance(0.6)) onLawn(rng.pick(['sawhorse', 'ladder_step']), 0.5);
      if (rng.chance(0.6)) onLawn(rng.pick(['toolbox', 'paint_cans', 'gas_can']), false);
      if (rng.chance(0.4)) drop('ladder_long', s.def.w / 2 - 1.2, (s.def.front ?? s.def.d / 2) + 0.3, PI / 2, false);
    } else if (home === 'retired') {
      const p = lawn();
      if (p) {
        drop('patio_chair', p[0] - 0.6, p[1], PI + 0.3, 0.4);
        drop('patio_chair', p[0] + 0.6, p[1], PI - 0.3, 0.4);
      }
      onLawn('bird_bath');
      if (rng.chance(0.5)) onLawn('satellite_dish_yard', 0.5, PI);
      for (let t = 0.8; t < f.len - 0.6; t += 1.6) plant('flower_clump_a', door - 1.0, f.z0 + t, rng.range(1, 1.4), rng.range(0, 6));
    } else if (home === 'sale') {
      drop('sign_for_sale', door + 2.4, zf - 0.8, rng.range(-0.2, 0.2), 0.3);
      if (rng.chance(0.5)) drop('newspaper_pile', door + 0.2, f.z0 + 0.4, rng.range(0, 6), false);
    } else if (home === 'neglect') {
      for (let i = 0; i < 9; i++) {
        const p = lawn();
        if (p) plant(rng.pick(['weeds_a', 'weeds_b', 'grass_tall_a', 'grass_tall_b', 'dandelion_patch']), p[0], p[1], rng.range(0.8, 1.4), rng.range(0, 6));
      }
      onLawn(rng.pick(['tyre', 'trash_bag_a', 'trash_bag_b', 'barrel_steel_rusty']), 0.4);
      if (rng.chance(0.5)) onLawn(rng.pick(['trash_can_metal_tipped', 'tyre_stack', 'pallet']), 0.4);
      if (rng.chance(0.4)) onLawn('satellite_dish_yard', 0.5, PI);
    }
    // things most households leave out
    if (home !== 'neglect' && rng.chance(0.3)) onLawn('bbq_grill', 0.5, PI);
    if (rng.chance(0.2)) drop('newspaper_pile', door + rng.range(-0.3, 0.3), f.z0 + rng.range(1, Math.max(1.2, f.len - 1)), rng.range(0, 6), false);
    // collection day: bins at the kerb on some streets
    if (rng.chance(0.3)) {
      const bx = drive !== undefined ? drive - 2.5 : door + 1.6;
      drop('wheelie_bin', bx, zs - 0.5, PI, 0.4, 0.2);
      if (rng.chance(0.5)) drop(rng.pick(['wheelie_bin', 'trash_bag_a', 'cardboard_box_flat']), bx - 0.8, zs - 0.5, PI, 0.4, 0.2);
    }
    // the boat that never gets to the lake, on its trailer beside the drive
    if (drive !== undefined && !worn && rng.chance(0.14)) {
      const lx = drive + (drive > 0 ? 3.6 : -3.6);
      const [x, z] = W(lx, f.z0 + 2.2);
      if ([-2.4, 0, 2.4].every((dz) => clearOf(...W(lx, f.z0 + 2.2 + dz), 1.4)) && !pl.c.occ.blocked(x, z, 0.5)) {
        k.at(x, z, s.ry, () => {
          put(k, 'boat_trailer', 0, 0, 0, 0, { solid: 1.2 });
          put(k, 'motorboat_small', 0, 0.68, 0.4, 0, { solid: false });
        }, heightAt(x, z));
        pl.c.occ.add(x, z, 2.4, 5.4, s.ry, 0.2, false);
      }
    }
  }
  for (const r of pl.net.roads) if (LIVED.has(r.kind) && r.spec.curb && r.length > 50) dressStreet(pl, rng, r);
}

/** Carriageway and kerb detail along one residential street. */
function dressStreet(pl: Placer, rng: Rng, r: Road) {
  const k = pl.k;
  const net = pl.net;
  const hw = r.spec.hw;
  const clear = (x: number, z: number, y: number) => !net.inJunction(r, x, z, y) && !net.near(x, z).some((h) => h.road !== r && !r.chained.has(h.road) && Math.abs(h.lat) < h.road.full + 2);
  const flat = (name: string, s: number, side: 1 | -1, lat: number, turn = 0) => {
    const f = net.frontage(r, s, side, lat);
    if (f.p.elevated || !clear(f.x, f.z, f.y)) return;
    k.at(f.x, f.z, f.ry + turn, () => put(k, name, 0, 0, 0, 0, { solid: false }), f.y + 0.045);
  };
  // drains at the kerb, manholes down the middle
  for (let s = 24; s < r.length - 20; s += 46) for (const side of [1, -1] as const) flat('drain_grate', s + (side > 0 ? 0 : 11), side, hw - 0.42, PI / 2);
  for (let s = 38; s < r.length - 30; s += 74) flat('manhole_cover', s + rng.range(-6, 6), 1, rng.range(-0.9, 0.9));
  // years of patching: utility trenches across the street, squared-off repairs, sealed cracks, oil under the regular parking spots
  for (let s = 12; s < r.length - 12; s += rng.range(7, 15)) {
    const side: 1 | -1 = rng.chance(0.5) ? 1 : -1;
    const t = rng.next();
    const lat = t < 0.25 ? 0 : rng.range(0.4, hw - 0.9);
    const f = net.frontage(r, s, side, lat);
    if (f.p.elevated || !clear(f.x, f.z, f.y)) continue;
    k.at(f.x, f.z, f.ry + (t >= 0.5 && t < 0.8 ? rng.range(0, 3) : rng.range(-0.04, 0.04)), () => {
      if (t < 0.25) k.box(0, 0.05, 0, hw * 2 - 0.5, 0.012, rng.range(0.5, 0.9), rng.pick<Col>([0x55585d, 0x606368]), 'asphalt', { cast: false });
      else if (t < 0.5) k.box(0, 0.05, 0, rng.range(1.2, 2.6), 0.012, rng.range(1, 3.4), rng.pick<Col>([0x5a5d62, 0x64676c, 0x50535a, 0x7c7f85]), 'asphalt', { cast: false });
      else if (t < 0.8) k.box(0, 0.052, 0, rng.range(2.5, 6.5), 0.012, 0.07, 0x2e3033, 'paint', { cast: false });
      else k.box(0, 0.052, 0, rng.range(0.5, 1.2), 0.012, rng.range(0.5, 1.4), rng.pick<Col>([0x3e4044, 0x46484c]), 'paint', { cast: false });
    }, f.y);
  }
  // what the wind leaves in the gutter
  for (let s = 10; s < r.length - 10; s += rng.range(9, 22)) {
    const side: 1 | -1 = rng.chance(0.5) ? 1 : -1;
    flat(rng.pick(['litter_paper_a', 'litter_paper_b', 'litter_paper_c', 'litter_paper_d', 'litter_can', 'litter_cup', 'litter_bottle', 'pizza_box']), s, side, hw - rng.range(0.25, 0.6), rng.range(0, 6));
  }
  // a speed limit as you enter the street from each end, behind the kerb
  if (r.length > 90)
    for (const [s, side] of [[26, -1], [r.length - 26, 1]] as const) {
      const f = net.frontage(r, s, side, hw + 0.75);
      if (f.p.elevated || !clear(f.x, f.z, f.y) || pl.drives.blocked(f.x, f.z, 1) || pl.c.occ.solids?.blocked(f.x, f.z, 0.3)) continue;
      // facing the driver arriving on that side
      k.at(f.x, f.z, Math.atan2(f.p.tx * side, f.p.tz * side), () => put(k, r.def.culdesac && side < 0 ? 'sign_dead_end' : 'sign_speed_25', 0, 0, 0, 0, { solid: 0.15 }), f.y + 0.16);
    }
  // street-name blades on the corner where it meets another street
  for (const end of [0, 1] as const) {
    const on = end ? r.endOn : r.startOn;
    if (!on || r.def.link) continue;
    const back = on.road.full + 1.4;
    const p = r.at(end ? r.length - back : back);
    const dir = end ? 1 : -1;
    const x = p.x + p.tz * dir * (hw + 0.85);
    const z = p.z - p.tx * dir * (hw + 0.85);
    if (isWater(x, z) || pl.drives.blocked(x, z, 0.8) || pl.c.occ.solids?.blocked(x, z, 0.3)) continue;
    k.at(x, z, Math.atan2(p.tx, p.tz), () => put(k, 'sign_street_names', 0, 0, 0, 0, { solid: 0.15 }), p.y + 0.16);
  }
  // young trees staked on the verge
  if (r.kind === 'residential')
    for (let s = 34; s < r.length - 30; s += rng.range(55, 90)) {
      const side: 1 | -1 = rng.chance(0.5) ? 1 : -1;
      const f = net.frontage(r, s, side, hw + 0.95);
      if (!clear(f.x, f.z, f.y) || pl.drives.blocked(f.x, f.z, 1.6) || pl.c.occ.blocked(f.x, f.z, 1.2)) continue;
      pl.trees.push({ kind: 'sapling_staked', x: f.x, z: f.z, s: 1, ry: rng.range(0, 6) });
    }
}

import { Rng } from '../core/rng';
import { Placer } from './placer';
import { heightAt, isWater, LAKE, addLotPad } from '../terrain';
import { addZone } from '../buildings/interiors';
import { put } from '../b2/hull';
import { signBoard, F_OS } from '../b2/kit2';
import { D } from './core';
import { paveR, prop, stalls, fence, poleSign, parked, scatter, lamps, treeEdge, hedge, RUBBISH, GRAVEL } from './blocks';

const PI = Math.PI;
type Frame = { x: number; z: number; ry: number };

interface Eatery {
  id: string;
  road: string;
  /** World point the lot stands beside (picks the spot along the road and the side). */
  at: [number, number];
  label: string;
  strap: string;
  bg: string;
  ink: string;
  menu: string[];
  /** No drive-thru lane (walk-up stand). */
  walkUp?: boolean;
}

const EATS: Eatery[] = [
  { id: 'bigBun', road: 'Old Hwy 10 W', at: [-452, 40], label: 'BIG BUN', strap: 'DRIVE-THRU · BURGERS 99¢', bg: '#b3262e', ink: '#ffd23f', menu: ['BIG BUN  1.89', 'DOUBLE  2.49', 'FRIES  .79', 'SHAKE  1.19', 'COLA  .69'] },
  { id: 'pizzaPalace', road: 'Old Hwy 10 E', at: [597, 40], label: 'PIZZA PALACE', strap: 'LUNCH BUFFET 3.99', bg: '#f6f1e4', ink: '#b3262e', menu: ['SLICE  1.25', 'PAN PIZZA  7.99', 'BREADSTIX  1.99', 'SALAD BAR  2.99', 'PITCHER  2.50'] },
  { id: 'cluckers', road: 'Old Hwy 10 W', at: [-618, -40], label: "CLUCKER'S", strap: 'FRIED CHICKEN · BUCKET 7.99', bg: '#f6f1e4', ink: '#c0272d', menu: ['2 PC DINNER  2.99', 'BUCKET  7.99', 'BISCUIT  .39', 'SLAW  .89', 'ICED TEA  .69'] },
  { id: 'tacoShack', road: 'Old Hwy 10 E', at: [1096, -20], label: 'TACO SHACK', strap: 'TACOS 59¢ · OPEN LATE', bg: '#d9862b', ink: '#4a1f6a', menu: ['TACO  .59', 'BURRITO  1.29', 'NACHOS  1.49', 'TOSTADA  .99', 'COLA  .69'] },
  { id: 'dairyDream', road: 'Lakeshore Dr', at: [-172, 320], label: 'DAIRY DREAM', strap: 'CONES · SHAKES · SUNDAES', bg: '#f6f1e4', ink: '#2f5f95', menu: ['CONE  .60', 'DIP CONE  .85', 'SUNDAE  1.35', 'SHAKE  1.25', 'HOT DOG  .99'], walkUp: true },
  { id: 'pizzaHutch', road: 'E Main St', at: [388, 40], label: 'PIZZA HUTCH', strap: 'PAN PIZZA · SALAD BAR · BOOK CLUB', bg: '#b3262e', ink: '#fff6e0', menu: ['PERSONAL PAN  1.99', 'LARGE PAN  9.99', 'BREADSTICKS  1.79', 'SALAD BAR  2.99', 'PITCHER  2.75'] },
  { id: 'burgerBaron', road: 'Old Hwy 10 E', at: [444, 40], label: 'BURGER BARON', strap: 'FLAME BROILED · HAVE IT YOUR WAY', bg: '#fff3d6', ink: '#c8322c', menu: ['WHAMMER  .99', 'DBL CHEESE  1.49', 'ONION RINGS  .89', 'CHICKEN TENDERS  1.99', 'COLA  .69'] },
  { id: 'domingos', road: 'Old Hwy 10 E', at: [492, 40], label: "DOMINGO'S", strap: 'DELIVERY · 30 MIN OR FREE · 555-3030', bg: '#fdfbf4', ink: '#2456a6', menu: ['MEDIUM  5.99', 'LARGE  7.99', '2 LARGE  10.99', 'COLA 2L  1.29'], walkUp: true },
];

/** Frontage frame on the side of the road facing (x, z), at the road point nearest it. */
function beside(pl: Placer, road: string, x: number, z: number, dist: (full: number) => number): Frame {
  const r = pl.net.byName(road);
  let best = 0;
  let bd = Infinity;
  for (let s = 0; s <= r.length; s += 2) {
    const p = r.at(s);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) [bd, best] = [d, s];
  }
  const a = pl.net.frontage(r, best, 1, dist(r.full));
  const b = pl.net.frontage(r, best, -1, dist(r.full));
  return Math.hypot(a.x - x, a.z - z) < Math.hypot(b.x - x, b.z - z) ? a : b;
}

/** One fast-food lot: building, customer parking out front, drive-thru lane round the back, pole sign, bin enclosure. */
function eatery(pl: Placer, e: Eatery, seed: number) {
  const rng = new Rng(seed);
  const def = D(e.id);
  const k = pl.k;
  const sb = e.walkUp ? 13 : 18;
  const f = beside(pl, e.road, e.at[0], e.at[1], (full) => full + sb + def.d / 2);
  const L = (lx: number, lz: number): [number, number] => {
    const [x, z] = Placer.world(f.x, f.z, f.ry, lx, lz);
    return [x, z];
  };
  const hw = def.w / 2;
  const hd = def.d / 2;
  const HX = e.walkUp ? 15 : 19;
  const back = e.walkUp ? 3 : 7.5;
  // grade the whole lot flat at the height of the kerb, and keep the woods off it
  {
    const [cx, cz] = L(0, (sb - back) / 2);
    const [kx, kz] = L(0, hd + sb);
    addLotPad(cx, cz, HX * 2 + 2, def.d + sb + back + 2, f.ry, heightAt(kx, kz), 6);
    pl.clearings.push({ x: cx, z: cz, w: HX * 2 + 14, d: HX * 2 + 14 });
  }
  const y = heightAt(f.x, f.z);
  // one sheet of asphalt from the kerb to behind the building
  paveR(pl, ...L(0, (sb - back) / 2), f.ry, HX * 2, def.d + sb + back, 0x6f7379);
  pl.force(def, f.x, f.z, f.ry, seed);
  pl.landmarks.push({ name: def.name, x: f.x, z: f.z, kind: 'business' });
  // concrete walk round the front and the door side, painted kerb
  k.at(f.x, f.z, f.ry, () => {
    k.box(0, 0.05, hd + 0.8, def.w + 1.6, 0.1, 1.6, 0xb9b6ad, 'concrete', { cast: false });
    k.box(-hw - 0.8, 0.05, 0, 1.6, 0.1, def.d, 0xb9b6ad, 'concrete', { cast: false });
    k.box(0, 0.05, hd + 1.62, def.w + 1.6, 0.11, 0.08, 0xd8b23a, 'paint', { cast: false });
  }, y);
  // parking: a row nosed in to the front walk, a second row backing on to the street between the two driveways
  const nA = Math.floor((HX - 1 + hw) / 2.75);
  stalls(pl, rng, ...L(-HX + 1, hd + 1.75), f.ry, nA, { fill: 0.6, stops: true });
  const nB = Math.floor((HX * 2 - 17) / 2.75);
  stalls(pl, rng, ...L((nB * 2.75) / 2, hd + sb - 0.4), f.ry + PI, nB, { fill: 0.3, stops: true });
  for (const sx of [-1, 1]) {
    const [ex, ez] = L(sx * (HX - 4.2), hd + sb - 0.2);
    pl.entrance(ex, ez, Math.sin(f.ry), Math.cos(f.ry), 6.5);
  }
  poleSign(pl, `eat.${e.id}`, ...L(-HX + 1.6, hd + sb - 1.4), f.ry + PI / 2, e.label, e.strap, e.bg, e.ink);
  lamps(pl, [[...L(HX - 1, hd + sb - 1.2), f.ry], [...L(-HX + 1, -hd - back + 1.2), f.ry + PI]] as [number, number, number][], 'street_lamp_double');

  if (!e.walkUp) {
    // drive-thru: in behind the building, past the menu board, up the right side to the pickup window
    const x0 = hw + 0.9;
    const x1 = hw + 4.3;
    k.at(f.x, f.z, f.ry, () => {
      const line = (ax: number, az: number, bx: number, bz: number) => k.box((ax + bx) / 2, 0.055, (az + bz) / 2, Math.abs(bx - ax) + 0.12, 0.03, Math.abs(bz - az) + 0.12, 0xd8b23a, 'paint', { cast: false });
      line(x0, -hd - 0.4, x0, hd + 1.6);
      line(x1, -hd - 4.2, x1, hd + 1.6);
      line(-hw, -hd - 0.8, x0, -hd - 0.8);
      line(-hw - 4, -hd - 4.2, x1, -hd - 4.2);
      // raised kerb island between the lane and the edge of the lot, with shrubs
      k.box(x1 + 0.9, 0, 0.4, 1.4, 0.2, def.d + 5, 0xb9b6ad, 'concrete');
      k.box(x1 + 0.9, 0.2, 0.4, 1.0, 0.06, def.d + 4.6, 0x5a4632, 'paint', { cast: false });
      for (let z = -hd - 1; z <= hd + 2; z += 2.4) put(k, 'bush_round_a', x1 + 0.9, 0.2, z, z, { solid: false, s: 0.7 });
      // lane arrows and the stop bar at the window
      for (const [ax, az, r] of [[-hw + 2, -hd - 2.5, PI / 2], [(x0 + x1) / 2, -hd + 2, 0], [(x0 + x1) / 2, hd - 1, 0]] as const) {
        k.push(ax, 0, az, r);
        k.box(0, 0.055, -0.5, 0.22, 0.03, 1.6, 0xe9e7df, 'paint', { cast: false });
        k.box(-0.28, 0.055, 0.0, 0.22, 0.03, 0.9, 0xe9e7df, 'paint', { cast: false, ry: 0.6 });
        k.box(0.28, 0.055, 0.0, 0.22, 0.03, 0.9, 0xe9e7df, 'paint', { cast: false, ry: -0.6 });
        k.pop();
      }
      k.box((x0 + x1) / 2, 0.055, 2.6, x1 - x0 - 0.3, 0.03, 0.4, 0xe9e7df, 'paint', { cast: false });
      // height bar over the lane entry
      const [bx, bz] = [-hw - 1.5, -hd - 2.5];
      for (const dz of [-1.9, 1.9]) k.cyl(bx, 0, bz + dz, 0.09, 0.09, 3.3, 8, 0xd8b23a, 'metal');
      k.box(bx, 3.3, bz, 0.12, 0.12, 4, 0xd8b23a, 'metal');
      for (const dz of [-1.3, 1.3]) k.box(bx, 2.95, bz + dz, 0.02, 0.36, 0.02, 0x2a2c30, 'metal', { cast: false });
      k.cyl(bx, 2.72, bz - 1.6, 0.07, 0.07, 3.2, 8, 0xd8b23a, 'gloss', { rx: PI / 2 });
      signBoard(pl.c, `eat.${e.id}.clr`, bx, 3.62, bz, 2.6, 0.42, '#d8b23a', [{ text: 'DRIVE-THRU · CLEARANCE 9 FT', font: F_OS, weight: '800', color: '#1d1f22', y: 0.58, size: 0.5, maxW: 0.92 }], { ry: -PI / 2, twoSided: true });
      // menu board and speaker post on the far side of the lane, facing the driver
      const [mx, mz] = [hw - 2.5, -hd - 5.0];
      for (const dx of [-1.0, 1.0]) k.box(mx + dx, 0, mz, 0.12, 1.0, 0.12, 0x2a2c30, 'metal');
      k.box(mx, 0.9, mz, 2.5, 1.9, 0.22, 0x2a2c30, 'metal');
      k.box(mx, 2.8, mz, 2.6, 0.1, 0.5, 0x2a2c30, 'metal');
      signBoard(pl.c, `eat.${e.id}.menu`, mx, 1.6, mz + 0.12, 2.3, 1.5, '#fbf6e6', [
        { text: e.label, font: F_OS, weight: '800', color: e.ink === '#ffd23f' ? '#b3262e' : e.ink, y: 0.15, size: 0.13, maxW: 0.9 },
        ...e.menu.map((t, i) => ({ text: t, font: F_OS, weight: '700', color: '#26303a', y: 0.32 + i * 0.135, size: 0.1, maxW: 0.86 })),
      ], { frame: 0x2a2c30 });
      signBoard(pl.c, `eat.${e.id}.ord`, mx, 2.52, mz + 0.12, 2.3, 0.34, e.bg, [{ text: 'ORDER HERE', font: F_OS, weight: '800', color: e.ink, y: 0.58, size: 0.62, maxW: 0.9 }], { frame: 0x2a2c30 });
      k.box(mx + 1.9, 0, mz + 0.1, 0.3, 1.25, 0.24, 0x8d9197, 'metal');
      k.box(mx + 1.9, 0.95, mz + 0.23, 0.22, 0.22, 0.02, 0x1d1f22, 'paint', { cast: false });
      k.solid(mx, mz, 2.6, 0.4, 0, 2.8);
      for (const dz of [-hd - 0.2, 0.4, hd + 1.9]) put(k, 'bollard_yellow_black', x0 - 0.25, 0, dz, 0, { solid: 0.2 });
    }, y);
    // a car at the window and one ordering
    if (rng.chance(0.8)) parked(pl, rng, ...L((x0 + x1) / 2, 0.2), f.ry - PI / 2);
    if (rng.chance(0.6)) parked(pl, rng, ...L(hw - 1.5, -hd - 2.5), f.ry + PI);
  }

  // bin enclosure at the back corner on the door side: board fence on three sides, dumpsters, grease drum
  {
    const [cx, cz] = [-HX + 3.6, -hd - back + 2.4];
    fence(pl, 'board', [L(cx + 3.2, cz + 2), L(cx + 3.2, cz - 2), L(cx - 3.2, cz - 2), L(cx - 3.2, cz + 2)], 0x8a7355);
    prop(pl, 'dumpster_green', ...L(cx - 1.5, cz - 0.4), f.ry, true);
    prop(pl, 'dumpster_blue_open', ...L(cx + 1.4, cz - 0.4), f.ry, true);
    k.at(...L(cx + 2.4, cz + 1.2), f.ry, () => {
      k.cyl(0, 0, 0, 0.3, 0.3, 0.9, 10, 0x3a3c40, 'metal');
      k.cyl(0, 0.9, 0, 0.31, 0.31, 0.04, 10, 0x1d1f22, 'metal');
    }, y);
    scatter(pl, rng, RUBBISH, ...L(cx - 3, cz - 1.5), ...L(cx + 3, cz + 2.5), 7);
  }
  // picnic tables on the door side, bins by the walk
  for (const lz of e.walkUp ? [-1, 2.5] : [-3, 1]) prop(pl, 'picnic_table', ...L(-hw - 4.2, lz), f.ry + PI / 2 + rng.range(-0.1, 0.1), 0.8);
  prop(pl, 'trash_can_street', ...L(-hw - 2.2, hd + 0.5), 0, 0.3);
  prop(pl, 'trash_can_street', ...L(hw - 0.5, hd + 1.2), 0, 0.3);
  if (e.walkUp) for (const lx of [-3, 0.5, 4]) prop(pl, 'patio_table_umbrella_open', ...L(lx, hd + 3.6), lx, 0.8);
  scatter(pl, rng, RUBBISH.slice(6), ...L(-HX + 1, -hd), ...L(HX - 1, hd + sb - 1), 9);
  // planting strip round the sides and back
  treeEdge(pl, rng, ...L(-HX - 2.5, hd + sb - 4), ...L(-HX - 2.5, -hd - back), ['maple_medium', 'oak_young', 'birch_cluster'], 11);
  treeEdge(pl, rng, ...L(HX + 2.5, hd + sb - 4), ...L(HX + 2.5, -hd - back), ['maple_medium', 'oak_young', 'birch_cluster'], 11);
  hedge(pl, ...L(-HX + 8, -hd - back - 1.2), ...L(HX, -hd - back - 1.2));
}

/** Heron Point Fish House: on the shore east of the pier, deck out over the water, gravel car park up to Lakeshore Dr. */
function fishHouse(pl: Placer) {
  const rng = new Rng(4410);
  const def = D('fishHouse');
  const k = pl.k;
  const g = beside(pl, 'Lakeshore Dr', 172, 330, (full) => full);
  // walk down the beach from the kerb to the waterline; the lake wall stands 2.5 m short of it
  let reach = 0;
  for (let t = 4; t < 90; t += 0.5) {
    const [x, z] = Placer.world(g.x, g.z, g.ry, 0, -t);
    if (isWater(x, z)) { reach = t; break; }
  }
  if (!reach) return;
  const cz = -(reach - 2.5 - def.d / 2);
  const L = (lx: number, lz: number): [number, number] => {
    const [x, z] = Placer.world(g.x, g.z, g.ry, lx, lz);
    return [x, z];
  };
  const [bx, bz] = L(0, cz);
  pl.clearings.push({ x: bx, z: bz, w: 56, d: 70 });
  for (let i = pl.trees.length - 1; i >= 0; i--) if (Math.hypot(pl.trees[i].x - bx, pl.trees[i].z - bz) < 27) pl.trees.splice(i, 1);
  pl.force(def, bx, bz, g.ry + PI, 4410);
  pl.landmarks.push({ name: def.name, x: bx, z: bz, kind: 'business' });
  // gravel car park between the road and the restaurant
  const lot0 = cz + def.d / 2 + 3.2;
  const depth = -lot0;
  if (depth > 6.5) {
    paveR(pl, ...L(0, lot0 + depth / 2), g.ry, 40, depth, GRAVEL, 'gravel');
    const n = 13;
    stalls(pl, rng, ...L((-n * 2.75) / 2, lot0 + 0.4), g.ry, n, { fill: 0.6, stops: true, line: 0xcfc9b8 });
    if (depth > 24) stalls(pl, rng, ...L(8, -0.6), g.ry + PI, 8, { fill: 0.35, stops: true, line: 0xcfc9b8 });
    const [ex, ez] = L(15.5, -0.2);
    pl.entrance(ex, ez, Math.sin(g.ry), Math.cos(g.ry), 7);
    lamps(pl, [[...L(-19, lot0 + 1), g.ry + PI], [...L(19, -2), g.ry]] as [number, number, number][], 'street_lamp_old');
  }
  poleSign(pl, 'eat.fish', ...L(-18, -2.2), g.ry + PI / 2, 'FISH HOUSE', 'CHOWDER · FISH & CHIPS · DOCK', '#f1e9cf', '#2f4f3f');
  // kitchen yard beside the entry: fenced bins, gas tank, crates, a skiff on its trailer
  fence(pl, 'board', [L(-10.5, lot0 - 0.4), L(-16, lot0 - 0.4), L(-16, cz - 4)], 0x6a5038);
  prop(pl, 'dumpster_green', ...L(-13.8, lot0 - 2), g.ry, true);
  prop(pl, 'propane_tank_large', ...L(-12.4, cz - 2), g.ry + PI / 2, true);
  for (const [lx, lz] of [[-14.6, cz + 1.5], [-14.4, cz + 0.4], [-13.6, cz + 1.1]]) prop(pl, rng.pick(['crate_wood_a', 'crate_wood_b']), ...L(lx, lz), rng.range(0, 3), 0.5);
  prop(pl, 'boat_trailer', ...L(17, lot0 - 5), g.ry + 0.3, true);
  prop(pl, 'rowboat', ...L(14.5, cz - 6), g.ry + 1.2, 0.5);
  // dock at the foot of the gangway with boats tied up
  const [dx, dz] = L(0, cz - def.d / 2 - 11 - 4.6);
  k.at(dx, dz, g.ry + PI, () => {
    for (let i = 0; i < 4; i++) put(k, 'pier_section', 0, LAKE.level, 2 + i * 4, 0, { solid: false });
    addZone(k, 0, 8, 2.4, 16, LAKE.level + 0.9, LAKE.level + 0.9);
    for (const s of [-1, 1]) k.solid(s * 1.25, 8, 0.2, 16, 0, 1.1);
    put(k, 'motorboat_small', -2.6, LAKE.level - 0.14, 6, 0.05, { solid: false });
    put(k, 'rowboat', 2.5, LAKE.level - 0.14, 11, -0.2, { solid: false });
    put(k, 'motorboat_small', 2.7, LAKE.level - 0.14, 3.5, PI, { solid: false });
  }, 0);
}

export function eateries(pl: Placer) {
  EATS.forEach((e, i) => eatery(pl, e, 4400 + i));
  fishHouse(pl);
}

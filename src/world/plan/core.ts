import type { BuildingDef } from '../buildings/catalog';
import type { Road } from '../roads/network';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { SHOPS } from '../b2/shops';
import { HOUSES, ESTATES, SHACKS, TRAILERS } from '../b2/houses';
import { CIVIC_B2 } from '../b2/civic';
import { LANDMARKS } from '../b2/landmarks';
import { DISTRICT } from '../b2/district';
import { CORE } from './roads';
import { heightAt } from '../terrain';
import { pave, prop, scatter, trashCorner, poleLine, backLot, carPark, treeEdge, lamps, fence, weedLine, OLD_ASPHALT, CONCRETE, RUBBISH, type BackKind } from './blocks';

const PI = Math.PI;
export const N = 1 as const; // frontage side of an eastbound street: 1 = north, -1 = south
export const S = -1 as const;

const B = new Map<string, BuildingDef>([...SHOPS, ...HOUSES, ...ESTATES, ...SHACKS, ...TRAILERS, ...CIVIC_B2, ...LANDMARKS, ...DISTRICT].map((d) => [d.id, d]));
export const D = (id: string) => {
  const d = B.get(id);
  if (!d) throw new Error(`no building ${id}`);
  return d;
};

/** Arc length where a road crosses x (E-W roads) or z (N-S roads). */
export function sAt(r: Road, v: number, axis: 'x' | 'z') {
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

/** Stands a def on a street frontage at coordinate v along the road, `setback` behind the back of the sidewalk. */
export function front(pl: Placer, r: Road, v: number, side: 1 | -1, def: BuildingDef, setback: number, seed: number, label?: string, kind = 'business', axis: 'x' | 'z' = 'x') {
  const f = pl.net.frontage(r, sAt(r, v, axis), side, r.full + setback + def.d / 2);
  pl.force(def, f.x, f.z, f.ry, seed);
  if (label) pl.landmarks.push({ name: label, x: f.x, z: f.z, kind });
  return f;
}

interface Unit {
  x0: number;
  x1: number;
  /** Depth of the building behind the sidewalk. */
  d: number;
}

/**
 * A terrace of abutting shopfronts filling a block face of Main Street from xa to xb. Whatever width the
 * shops leave over becomes one open passage through to the alley (after shop `passAt`).
 */
function terrace(pl: Placer, r: Road, side: 1 | -1, xa: number, xb: number, ids: string[], passAt = 3): Unit[] {
  const defs: BuildingDef[] = [];
  let total = 0;
  for (const id of ids) {
    const d = D(id);
    if (total + d.w > xb - xa) continue;
    defs.push(d);
    total += d.w;
  }
  const left = xb - xa - total;
  const pass = left >= 2.6 ? left : 0;
  let x = xa + (pass ? 0 : left / 2);
  const out: Unit[] = [];
  defs.forEach((d, i) => {
    if (pass && i === Math.min(passAt, defs.length - 1)) {
      // the passage: concrete walk, a lamp bracket's worth of clutter, open to the alley
      const z0 = side === S ? r.full : -CORE.alley + 2.8;
      const z1 = side === S ? CORE.alley - 2.8 : -r.full;
      pave(pl, x + 0.1, z0, x + pass - 0.1, z1, CONCRETE, 'concrete', 0.06);
      const rng = new Rng((x * 7) | 0);
      for (const name of ['trash_can_metal', 'crate_wood_a', 'cardboard_box_stack', 'wheelie_bin']) if (rng.chance(0.7)) prop(pl, name, x + rng.pick([0.6, pass - 0.6]), rng.range(z0 + 5, z1 - 3), rng.range(0, 6), 0.4);
      scatter(pl, rng, RUBBISH, x + 0.5, z0 + 3, x + pass - 0.5, z1, 5);
      x += pass;
    }
    front(pl, r, x + d.w / 2, side, d, 0.2, (x * 13) | 0, d.name);
    out.push({ x0: x, x1: x + d.w, d: d.d + 0.2 });
    x += d.w;
  });
  return out;
}

/** Service yards between the backs of a shop row and the alley: old paving, dumpsters, pallets, bins, weeds. */
function shopBacks(pl: Placer, rng: Rng, side: 1 | -1, xa: number, xb: number, units: Unit[], full: number) {
  const sg = side === S ? 1 : -1; // +1: the yards run toward +z
  const zA = sg * (CORE.alley - 2.8);
  pave(pl, xa, Math.min(sg * (full + 10), zA), xb, Math.max(sg * (full + 10), zA), OLD_ASPHALT, 'asphalt', 0.04);
  for (const u of units) {
    const zr = sg * (full + u.d);
    const room = Math.abs(zA - zr);
    trashCorner(pl, rng, (u.x0 + u.x1) / 2, zr + sg * 0.15, sg > 0 ? 0 : PI, u.x1 - u.x0 - 0.8, room > 3.6);
    // a staff car nosed up to the back wall where the yard is deep enough
    if (room > 6.2 && rng.chance(0.6)) pl.car('sedan', u.x1 - 1.6, zr + sg * 3.1, PI / 2 * sg, rng.pick([0x8a2f2a, 0x2f4a6a, 0xd8d4c8, 0x4a5a48, 0x2a2a2c]), { model: rng.pick(['sedan_80s', 'hatch_compact', 'pickup_80s', 'coupe_80s']) });
  }
  weedLine(pl, rng, xa, zA, xb, zA, 4);
}

/** Interior x-range of a core block between two avenues (inside their sidewalks). */
function span(pl: Placer, i: number): [number, number] {
  const names = ['2nd Ave W', '1st Ave W', 'Division St', '1st Ave E', '2nd Ave E'];
  return [CORE.aves[i] + pl.net.byName(names[i]).full + 0.15, CORE.aves[i + 1] - pl.net.byName(names[i + 1]).full - 0.15];
}

/** Downtown: four blocks of Main Street, shop rows corner to corner, service alleys and worked back lots. */
export function core(pl: Placer) {
  const main = pl.net.byName('Main St');
  const alder = pl.net.byName('Alder St');
  const river = pl.net.byName('Riverside Dr');
  const rng = new Rng(9090);
  const full = main.full;
  const house = (r: Road, x: number, side: 1 | -1, id: string, seed: number) => {
    const def = D(id);
    const f = pl.net.frontage(r, sAt(r, x, 'x'), side, r.full + 5.5 + def.d / 2);
    pl.put(def, f.x, f.z, f.ry, seed, { road: r, driveway: true, mailbox: true, car: 0.8 });
  };
  const faces: { i: number; side: 1 | -1; ids: string[]; back: BackKind; homes?: string[]; passAt?: number }[] = [
    { i: 0, side: S, ids: ['laundry', 'liquor', 'thrift', 'video', 'pawn', 'barber', 'records', 'bakery'], back: 'yard', passAt: 4 },
    { i: 1, side: S, ids: ['hardware', 'barber', 'pharmacy', 'records', 'gazette', 'bakery', 'insurance', 'video'], back: 'park' },
    { i: 2, side: S, ids: ['tavern', 'pawn', 'antiques', 'insurance', 'thrift', 'video', 'liquor', 'laundry'], back: 'split', homes: ['house_white', 'house_green'], passAt: 2 },
    { i: 3, side: S, ids: ['bakery', 'hardware', 'laundry', 'pharmacy', 'liquor', 'gazette', 'records'], back: 'split', homes: ['house_cream', 'house_pink'], passAt: 4 },
    { i: 0, side: N, ids: ['antiques', 'gazette', 'tavern', 'insurance', 'thrift', 'pawn', 'barber', 'video'], back: 'split', homes: ['house_blue', 'house_tan'] },
    { i: 1, side: N, ids: ['pharmacy', 'records', 'antiques', 'laundry', 'bakery', 'tavern', 'liquor', 'barber'], back: 'market', passAt: 5 },
  ];
  for (const f of faces) {
    const [xa, xb] = span(pl, f.i);
    const sg = f.side === S ? 1 : -1;
    const units = terrace(pl, main, f.side, xa, xb, f.ids, f.passAt);
    shopBacks(pl, rng, f.side, xa, xb, units, full);
    // the back-lot power line along the far side of the alley, with yard lights
    const zp = sg * (CORE.alley + 3.6);
    poleLine(pl, [xa + 3, xa + (xb - xa) * 0.36, xa + (xb - xa) * 0.68, xb - 3].map((x) => [x, zp] as [number, number]), { lamps: true, h: 9 });
    const back = f.side === S ? alder : river;
    const zStreet = f.side === S ? CORE.south - alder.full - 0.2 : Math.max(pl.net.frontage(river, sAt(river, xa, 'x'), S, river.full + 0.3).z, pl.net.frontage(river, sAt(river, xb, 'x'), S, river.full + 0.3).z);
    backLot(pl, rng, xa, xb, sg * (CORE.alley + 2.9), zStreet, sg as 1 | -1, f.back, () => {
      const w = xb - xa;
      (f.homes ?? []).forEach((id, n) => house(back, xa + w * (0.66 + n * 0.21), f.side === S ? N : S, id, 400 + f.i * 10 + n));
    });
  }
  // NE block east of Division: First Cascade Bank on the corner (inside the sidewalks), then shops to 2nd Ave E
  const [xa, xb] = span(pl, 3);
  const bank = D('bank');
  front(pl, main, xa + bank.w / 2 + 1.2, N, bank, 1.6, 10, 'First Cascade Bank');
  const units = terrace(pl, main, N, xa + bank.w + 6.2, xb, ['records', 'thrift', 'hardware', 'insurance', 'gazette', 'bakery', 'video'], 9);
  shopBacks(pl, rng, N, xa + bank.w + 6.2, xb, units, full);
  // the bank's drive-through lane and customer lot beside and behind it
  pave(pl, xa, -CORE.alley - 2.8, xa + bank.w + 6, -full - 0.4, 0x8a8e96, 'asphalt', 0.045);
  prop(pl, 'atm_outdoor', xa + bank.w + 2.6, -full - 3, -PI / 2, 0.5);
  for (const z of [-full - 8, -full - 16]) prop(pl, 'bollard_yellow_black', xa + bank.w + 2.2, z, 0, 0.3);
  pl.entrance(xa + bank.w + 4.2, -full - 0.5, 0, 1, 4.6);
  poleLine(pl, [xa + 3, xa + (xb - xa) * 0.36, xa + (xb - xa) * 0.68, xb - 3].map((x) => [x, -CORE.alley - 3.6] as [number, number]), { lamps: true, h: 9 });
  const zr = Math.max(pl.net.frontage(river, sAt(river, xa, 'x'), S, river.full + 0.3).z, pl.net.frontage(river, sAt(river, xb, 'x'), S, river.full + 0.3).z);
  backLot(pl, rng, xa, xb, -CORE.alley - 2.9, zr, -1, 'park');
  townHallSquare(pl);
  courthouseSquare(pl);
  churchLot(pl);
}

const full0 = (pl: Placer) => pl.net.byName('Main St').full;

/** Concrete path between two world points. */
function path(pl: Placer, ax: number, az: number, bx: number, bz: number, w = 2.4) {
  const len = Math.hypot(bx - ax, bz - az);
  const ry = Math.atan2(bx - ax, bz - az);
  pl.k.at((ax + bx) / 2, (az + bz) / 2, ry, () => pl.k.box(0, -0.3, 0, w, 0.36, len, CONCRETE, 'concrete', { cast: false }), heightAt((ax + bx) / 2, (az + bz) / 2));
}

/** Town Hall Square: the hall at the head of its own block, a green with fountain, bandstand and memorial, staff lot behind. */
function townHallSquare(pl: Placer) {
  const rng = new Rng(77);
  const [xa, xb] = span(pl, 2);
  const cx = (xa + xb) / 2;
  const hall = D('townhall');
  const zf = -47; // hall front
  pl.force(hall, cx, zf - hall.d / 2, 0, 11);
  pl.landmarks.push({ name: 'Pine Hollow Town Hall', x: cx, z: zf - hall.d / 2, kind: 'civic' }, { name: 'Town Hall Square', x: cx, z: -30, kind: 'park' });
  pl.reserve(xa, zf, xb, -full0(pl));
  // walks: Main Street to the steps round the fountain, and across the green between the avenues
  path(pl, cx, -12.2, cx, -22.5, 3.2);
  path(pl, cx, -33.5, cx, zf + 0.5, 3.2);
  for (const sx of [-1, 1]) {
    path(pl, cx + sx * 5.6, -22.5, cx + sx * 5.6, -33.5, 2.2);
    path(pl, cx + sx * 6.5, -28, sx > 0 ? xb : xa, -28, 2.2);
  }
  for (const z of [-22.5, -33.5]) path(pl, cx - 6.7, z, cx + 6.7, z, 2.2);
  prop(pl, 'fountain_park', cx, -28);
  prop(pl, 'bandstand_gazebo', cx - 24, -28);
  prop(pl, 'war_memorial', cx + 23, -33, 0);
  prop(pl, 'statue_plinth', cx + 23, -21, 0);
  for (const sx of [-1, 1]) {
    prop(pl, 'flagpole_tall', cx + sx * 7.5, zf + 3, 0, 0.4);
    for (const z of [-17, -39]) prop(pl, 'street_lamp_old', cx + sx * 3.2, z, 0, 0.3);
    for (const z of [-25, -31]) prop(pl, 'bench_wood', cx + sx * 8, z, -sx * PI / 2, 0.6);
    prop(pl, 'trash_can_street', cx + sx * 3.2, -14.5, 0, 0.4);
    for (let i = 0; i < 4; i++) pl.trees.push({ kind: 'flower_bed', x: cx + sx * (3.4 + i * 1.7), z: zf + 1.4, s: 1, ry: 0 });
    for (const z of [-16, -40]) for (const dx of [14, 30]) pl.trees.push({ kind: rng.pick(['oak_medium', 'maple_large', 'oak_medium']), x: cx + sx * dx + rng.range(-1.5, 1.5), z: z + rng.range(-1.5, 1.5), s: rng.range(0.7, 0.9), ry: rng.range(0, 6) });
  }
  // staff parking beside the hall off Riverside Dr, bins at the back door
  const zb = zf - hall.d - 0.6;
  carPark(pl, rng, xa + 1, zb - 4, cx - hall.w / 2 - 3, zf - 6, { fill: 0.6, stops: true, lights: false });
  pl.entrance(xa + 8, zb - 4, 0, -1, 6);
  carPark(pl, rng, cx + hall.w / 2 + 3, zb - 4, xb - 1, zf - 6, { fill: 0.45, stops: true, lights: false });
  pl.entrance(xb - 8, zb - 4, 0, -1, 6);
  trashCorner(pl, rng, cx, zb, PI, 9, true);
  treeEdge(pl, rng, xa + 2, zb - 5, xb - 2, zb - 5, ['maple_medium', 'oak_young']);
}

/** Courthouse Square: the courthouse on its lawn facing Alder St, the sheriff's office and patrol yard on the avenue, public lot behind. */
function courthouseSquare(pl: Placer) {
  const rng = new Rng(78);
  const alder = pl.net.byName('Alder St');
  const ave = pl.net.byName('1st Ave E S');
  const xa = pl.net.byName('Division St S').full + 0.4;
  const xb = CORE.aves[3] - ave.full - 0.4;
  const z0 = CORE.south + alder.full + 0.3;
  const court = D('courthouse');
  const cx = xa + 30;
  const f = front(pl, alder, cx, S, court, 13, 12, 'Hollow County Courthouse', 'civic');
  pl.reserve(xa, z0, xb, z0 + 13);
  path(pl, cx, z0 - 0.2, cx, z0 + 13.4, 3.6);
  for (const sx of [-1, 1]) {
    prop(pl, 'street_lamp_old', cx + sx * 3.4, z0 + 4, 0, 0.3);
    prop(pl, 'bench_wood', cx + sx * 3.2, z0 + 9, -sx * PI / 2, 0.6);
    prop(pl, sx < 0 ? 'flagpole_tall' : 'statue_plinth', cx + sx * 11, z0 + 7, 0, 0.5);
    for (const dx of [9, 19]) pl.trees.push({ kind: 'oak_medium', x: cx + sx * dx, z: z0 + 3 + rng.range(0, 2), s: 0.85, ry: rng.range(0, 6) });
  }
  // sheriff on the avenue with a fenced patrol yard behind it
  const sh = D('sheriff');
  const zs = f.z + 8;
  const sf = front(pl, ave, zs, -1, sh, 5, 6, 'Hollow County Sheriff', 'civic', 'z');
  const yx0 = sf.x - sh.d / 2 - 15;
  pave(pl, yx0, zs - sh.w / 2 - 1, sf.x - sh.d / 2 - 0.4, zs + sh.w / 2 + 13, 0x7c8087);
  fence(pl, 'tall', [[yx0, zs - sh.w / 2 - 1], [yx0, zs + sh.w / 2 + 13], [xb - 6.5, zs + sh.w / 2 + 13]]);
  for (let i = 0; i < 3; i++) pl.car('police', yx0 + 3.2, zs - 6 + i * 4.2, 0, 0xf1ede2, { model: i === 1 ? 'police_suv' : 'police_sedan' });
  pl.entrance(xb, zs + sh.w / 2 + 9, 1, 0, 6);
  pave(pl, sf.x - sh.d / 2, zs + sh.w / 2 + 0.4, xb, zs + sh.w / 2 + 13, 0x7c8087);
  // public parking behind the courthouse off Division St
  const zl = f.z + court.d / 2 + 3;
  carPark(pl, rng, xa + 1, zl, yx0 - 2, zl + 27, { fill: 0.6, stops: true });
  pl.entrance(xa + 1, zl + 13.5, -1, 0, 6.5);
  trashCorner(pl, rng, f.x + 6, zl - 2.4, 0, 8, true);
  treeEdge(pl, rng, xa + 1.5, z0 + 2, xa + 1.5, zl - 2, ['maple_large', 'oak_medium'], 11);
}

/** Community church west of Division on Alder St: lawn, signboard walk, gravel car park beside it. */
function churchLot(pl: Placer) {
  const rng = new Rng(79);
  const alder = pl.net.byName('Alder St');
  const z0 = CORE.south + alder.full + 0.3;
  const ch = D('church');
  const f = front(pl, alder, -34, S, ch, 9, 7, 'Pine Hollow Community Church', 'civic');
  path(pl, f.x, z0 - 0.2, f.x, z0 + 9.4, 2.6);
  for (const sx of [-1, 1]) pl.trees.push({ kind: 'maple_large', x: f.x + sx * 12, z: z0 + 5, s: 0.85, ry: sx });
  const xb = -pl.net.byName('Division St S').full - 0.6;
  carPark(pl, rng, f.x + ch.w / 2 + 4, z0 + 10, xb, z0 + 38, { fill: 0.35, color: 0x9a9282, lights: false });
  pl.entrance(xb, z0 + 24, 1, 0, 6);
  prop(pl, 'donation_bin', f.x + ch.w / 2 + 5.4, z0 + 8.6, PI, 0.5);
  treeEdge(pl, rng, f.x + ch.w / 2 + 4, z0 + 2.5, xb - 1, z0 + 2.5, ['oak_medium', 'maple_medium'], 10);
}

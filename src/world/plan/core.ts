import type { BuildingDef } from '../buildings/catalog';
import type { Road } from '../roads/network';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { SHOPS } from '../b2/shops';
import { HOUSES, ESTATES, SHACKS, TRAILERS } from '../b2/houses';
import { CIVIC_B2 } from '../b2/civic';
import { LANDMARKS } from '../b2/landmarks';
import { DISTRICT } from '../b2/district';
import { ALLEY, BANK_LOT, MAIN, AVE_N, AVE_S, face } from './roads';
import { alleyEdge, lamps, wear, pave, paveTrap, path, prop, scatter, trashCorner, poleLine, backLot, carPark, treeEdge, fence, BEATERS, hedge, parked, stalls, weedLine, inFrame, W, fbuild, fcar, fentrance, ftree, freserve, OLD_ASPHALT, CONCRETE, RUBBISH, type BackKind, type Bounds } from './blocks';

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

/** Is the frame point on a street other than a service alley? */
const onAve = (pl: Placer, x: number, z: number) => {
  const [wx, wz] = W(x, z);
  return pl.net.near(wx, wz).some((h) => h.road.kind !== 'alley' && Math.abs(h.lat) < h.road.full + 0.15);
};

/**
 * The shape of a block seen from one of its street faces, in that face's frame (x along the face, z into the
 * block): where the side streets cut it off at each depth and where the street behind closes it. Found by
 * walking out from the middle until a sidewalk is met, so it follows whatever lines the streets take.
 */
function shape(pl: Placer, len: number, mid = len / 2): Bounds & { zb: (x: number) => number } {
  const memo = (fn: (v: number) => number) => {
    const m = new Map<number, number>();
    return (v: number) => {
      const key = Math.round(v * 4);
      let r = m.get(key);
      if (r === undefined) m.set(key, (r = fn(key / 4)));
      return r;
    };
  };
  const walk = (x: number, z: number, dx: number, dz: number, max: number) => {
    for (let t = 0; t < max; t += 0.2) if (onAve(pl, x + dx * t, z + dz * t)) return t - 0.2;
    return max;
  };
  return {
    xl: memo((z) => mid - walk(mid, z, -1, 0, 160)),
    xr: memo((z) => mid + walk(mid, z, 1, 0, 160)),
    zb: memo((x) => ALLEY + 4 + walk(x, ALLEY + 4, 0, 1, 140)),
  };
}
/** Tightest side limits over a depth range, and the nearest the back street comes over a width. */
const inner = (b: Bounds, z0: number, z1: number): [number, number] => [Math.max(b.xl(z0), b.xl(z1)), Math.min(b.xr(z0), b.xr(z1))];
const nearest = (zb: (x: number) => number, x0: number, x1: number) => Math.min(zb(x0), zb((x0 + x1) / 2), zb(x1));

/**
 * A terrace of abutting shopfronts along a block face from xa to xb (face frame: the sidewalk's back edge is at
 * z = full). Whatever width the shops leave over becomes one open passage through to the alley (after shop `passAt`).
 */
function terrace(pl: Placer, full: number, xa: number, xb: number, ids: string[], passAt = 3): Unit[] {
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
      // the passage: concrete walk and a little clutter, open to the alley
      const z1 = ALLEY - 2.8;
      pave(pl, x + 0.1, full, x + pass - 0.1, z1, CONCRETE, 'concrete', 0.06);
      const rng = new Rng((x * 7 + W(x, 0)[0]) | 0);
      for (const name of ['trash_can_metal', 'crate_wood_a', 'cardboard_box_stack', 'wheelie_bin']) if (rng.chance(0.7)) prop(pl, name, x + rng.pick([0.6, pass - 0.6]), rng.range(full + 5, z1 - 3), rng.range(0, 6), 0.4);
      scatter(pl, rng, RUBBISH, x + 0.5, full + 3, x + pass - 0.5, z1, 5);
      x += pass;
    }
    fbuild(pl, d, x + d.w / 2, full + 0.2 + d.d / 2, PI, (W(x, 0)[0] * 13) | 0, d.name);
    out.push({ x0: x, x1: x + d.w, d: d.d + 0.2 });
    x += d.w;
  });
  return out;
}

/** Service yards between the backs of a shop row and the alley: dumpsters, pallets, bins, a staff car, weeds. */
function shopBacks(pl: Placer, rng: Rng, xa: number, xb: number, units: Unit[], full: number) {
  const zA = ALLEY - 2.8;
  for (const u of units) {
    const zr = full + u.d;
    const room = zA - zr;
    const door = (u.x1 - u.x0) / 2 - 1.6;
    trashCorner(pl, rng, (u.x0 + u.x1) / 2, zr + 0.1, 0, u.x1 - u.x0 - 0.8, room > 2.4, [door, -door]);
    // a staff car nosed up to the back wall where the yard is deep enough
    if (room > 6.2 && rng.chance(0.6)) fcar(pl, 'sedan', u.x1 - 1.6, zr + 3.1, PI / 2, rng.pick([0x8a2f2a, 0x2f4a6a, 0xd8d4c8, 0x4a5a48, 0x2a2a2c]), { model: rng.pick(['sedan_80s', 'hatch_compact', 'pickup_80s', 'coupe_80s']) });
  }
  weedLine(pl, rng, xa, zA, xb, zA, 4);
}

/** Block faces use the road plan's convention (see face()): +1 is the south side of Main Street, -1 the north. */
const SOUTH = 1 as const;
const NORTH = -1 as const;

interface Face {
  i: number;
  side: 1 | -1;
  ids: string[];
  back: BackKind;
  /** Second row of businesses at the back of the block, facing the back street. */
  row?: string[];
  passAt?: number;
}

/** One side of a Main Street block, built in the frame of that face: shop row, service yards, alley, back lot. */
function blockFace(pl: Placer, rng: Rng, f: Face) {
  const main = pl.net.byName('Main St');
  const back = pl.net.byName(f.side > 0 ? 'Alder St' : 'Riverside Dr');
  const full = main.full;
  const g = face(f.i, f.side);
  inFrame(g.x, g.z, g.ry, () => {
    const b = shape(pl, g.len);
    const zA = ALLEY - 2.8;
    // the row stands square to Main Street, clear of both avenues over its whole depth
    const [ra, rb] = inner(b, full + 0.3, full + 21);
    const xa = ra + 0.15;
    const xb = rb - 0.15;
    // old paving from the back of the sidewalk to the alley, out to the slanted avenue lines either side
    paveTrap(pl, full + 0.05, zA, { xl: (z) => b.xl(z) + 0.1, xr: (z) => b.xr(z) - 0.1 }, OLD_ASPHALT, 'asphalt', 0.04);
    const bank = f.i === 3 && f.side < 0 ? D('bank') : null;
    const units = terrace(pl, full, xa, bank ? xb - bank.w - 7.4 : xb, f.ids, f.passAt);
    shopBacks(pl, rng, xa, xb, units, full);
    if (bank) {
      // First Cascade Bank on the 1st Ave E corner with its drive-through lane and customer lot (no alley behind it)
      fbuild(pl, bank, xb - bank.w / 2 - 1.2, full + 1.6 + bank.d / 2, PI, 10, 'First Cascade Bank');
      const x0 = g.len - BANK_LOT + 0.4;
      paveTrap(pl, zA, ALLEY + 2.8, { xl: () => x0, xr: (z) => b.xr(z) - 0.1 }, 0x8a8e96, 'asphalt', 0.045);
      pave(pl, x0, full + 0.4, xb - bank.w - 1.4, zA, 0x8a8e96, 'asphalt', 0.045);
      prop(pl, 'atm_outdoor', xb - bank.w - 3.8, full + 3, PI / 2, 0.5);
      for (const z of [full + 8, full + 16]) prop(pl, 'bollard_yellow_black', xb - bank.w - 3.4, z, 0, 0.3);
      fentrance(pl, xb - bank.w - 5.4, full + 0.5, 0, -1, 4.6);
    }
    // where a slanted avenue leaves a wedge beside the end shop it becomes a pocket of street furniture
    for (const sx of [-1, 1]) {
      const kit = ['planter_box', 'bench_wood', 'newspaper_box_a', 'trash_can_street', 'planter_box'];
      for (let z = full + 2.2, n = f.i + (sx > 0 ? 2 : 0); z < full + 17; z += 3.6, n++) {
        const [e, lim] = sx < 0 ? [xa, b.xl(z) + 0.5] : [xb, b.xr(z) - 0.5];
        if (Math.abs(lim - e) < 2.3 || (bank && sx > 0)) continue;
        const name = kit[n % kit.length];
        prop(pl, name, (e + lim) / 2 + sx * 0.3, z, name === 'bench_wood' ? -sx * PI / 2 : 0, 0.5);
      }
    }
    // the back-lot power line along the far side of the alley, with yard lights
    const zp = ALLEY + 3.6;
    const [pa, pb] = [b.xl(zp) + 3, b.xr(zp) - 3];
    poleLine(pl, [0, 0.36, 0.68, 1].map((t) => [pa + (pb - pa) * t, zp] as [number, number]), { lamps: true, h: 9 });
    // behind the alley: the lot's rectangle sits inside the block's slanted sides, its paving runs out to them
    const z0 = ALLEY + 2.9;
    // (a deep block keeps a 36 m lot; the houses of the street behind take the rest, see homes())
    const mid = (b.xl(z0) + b.xr(z0)) / 2;
    const [ia, ib] = inner(b, z0, Math.min(b.zb(mid), z0 + 36));
    const zS = Math.min(nearest(b.zb, ia + 1, ib - 1) - 0.2, z0 + 36);
    const [la, lb] = inner(b, z0, zS);
    backLot(pl, rng, la, lb, z0, zS, 1, f.back, undefined, b);
    const zE = nearest(b.zb, ia + 1, ib - 1) - 0.4;
    if (f.row && zE - zS > 12) backRow(pl, rng, b, zS + 0.6, zE, f.row, f.i * 10 + (f.side > 0 ? 0 : 5));
    const ax = bank ? g.len - BANK_LOT - 2 : xb;
    alleyEdge(pl, rng, xa, ax, z0, 1);
    wear(pl, rng, xa, full + 14, ax, ALLEY + 2.8);
  });
}

/**
 * The back of a deep block, from the rear car park (z0) to the back street (z1): a second row of shops facing
 * that street, with small customer lots between pairs and a paved service strip behind.
 */
function backRow(pl: Placer, rng: Rng, b: Bounds, z0: number, z1: number, ids: string[], seed: number) {
  const [xa, xb] = inner(b, z0, z1);
  const deep = z1 - z0;
  let x = xa + 1.5;
  let n = 0;
  const lot = (x0: number, x1: number) => {
    if (x1 - x0 < 9) return pave(pl, x0, z0, x1, z1 - 0.4, OLD_ASPHALT), hedgeRow(x0, x1);
    carPark(pl, rng, x0, z0, x1, z1 - 0.4, { fill: 0.5, stops: true, lights: false });
    fentrance(pl, (x0 + x1) / 2, z1 - 0.4, 0, 1, 6);
  };
  const hedgeRow = (x0: number, x1: number) => {
    for (let t = x0 + 1.5; t < x1 - 1; t += 2.4) ftree(pl, 'hedge_straight', t, z1 - 1.2);
  };
  while (x < xb - 8) {
    const def = D(ids[n % ids.length]);
    if (x + def.w > xb - 1.5 || def.d + 4 > deep) break;
    const zc = z1 - 3 - def.d / 2;
    fbuild(pl, def, x + def.w / 2, zc, 0, 600 + seed + n, def.name);
    // apron to the sidewalk, service strip behind
    pave(pl, x - 0.4, zc + def.d / 2, x + def.w + 0.4, z1 - 0.4, 0xa9a59c, 'concrete', 0.06);
    if (zc - def.d / 2 - z0 > 1.5) {
      pave(pl, x - 0.4, z0, x + def.w + 0.4, zc - def.d / 2, OLD_ASPHALT);
      trashCorner(pl, rng, x + def.w * 0.7, zc - def.d / 2 - 1.2, 0, 3, false);
    }
    x += def.w;
    n++;
    const gap = n % 2 ? 1.2 : 16;
    if (x + gap > xb - 1.5) break;
    if (gap > 2) lot(x + 0.4, x + gap - 0.4);
    else pave(pl, x, z0, x + gap, z1 - 0.4, OLD_ASPHALT);
    x += gap;
  }
  if (xb - x > 4) lot(x + 0.4, xb - 0.4);
  if (x - xa < 4) return;
  lamps(pl, [[xa + 3, z1 - 1, 0], [xb - 3, z1 - 1, 0]]);
}

/** Downtown: four blocks of Main Street, no two the same shape; shop rows corner to corner, service alleys, worked back lots. */
export function core(pl: Placer) {
  const rng = new Rng(9090);
  // zoning: downtown between Riverside Dr and Alder St, and the civic blocks south of Alder, hold no homes
  pl.noHomes.push([...AVE_N, ...[...AVE_S].reverse()]);
  pl.noHomes.push([AVE_S[1], AVE_S[2], AVE_S[3], [100, 180], [0, 188], [-100, 190]]);
  const faces: Face[] = [
    { i: 0, side: SOUTH, ids: ['laundry', 'liquor', 'thrift', 'video', 'pawn', 'barber', 'records', 'bakery'], back: 'yard', row: ['hardware', 'pawn', 'video'], passAt: 4 },
    { i: 1, side: SOUTH, ids: ['hardware', 'barber', 'pharmacy', 'records', 'gazette', 'bakery', 'insurance', 'video', 'antiques', 'liquor'], back: 'park', row: ['tavern', 'insurance', 'laundry'], passAt: 5 },
    { i: 2, side: SOUTH, ids: ['tavern', 'pawn', 'antiques', 'insurance', 'thrift', 'video', 'liquor', 'laundry'], back: 'park', row: ['insurance', 'gazette', 'video', 'records'], passAt: 2 },
    { i: 3, side: SOUTH, ids: ['bakery', 'hardware', 'laundry', 'pharmacy', 'liquor', 'gazette', 'records', 'barber', 'tavern', 'thrift'], back: 'yard', row: ['hardware', 'thrift', 'laundry'], passAt: 4 },
    { i: 0, side: NORTH, ids: ['antiques', 'gazette', 'tavern', 'insurance', 'thrift', 'pawn', 'barber', 'video'], back: 'park', row: ['antiques', 'bakery', 'records', 'insurance'] },
    { i: 1, side: NORTH, ids: ['pharmacy', 'records', 'antiques', 'laundry', 'bakery', 'tavern', 'liquor', 'barber', 'hardware', 'insurance'], back: 'market', row: ['thrift', 'barber', 'liquor', 'pawn'], passAt: 5 },
    { i: 3, side: NORTH, ids: ['records', 'thrift', 'hardware', 'insurance', 'gazette', 'bakery', 'video', 'pawn'], back: 'park', row: ['gazette', 'pharmacy', 'video'], passAt: 9 },
  ];
  for (const f of faces) blockFace(pl, rng, f);
  townHallSquare(pl);
  // the civic lots south of Alder St keep their own frames: Alder bends at Division, so each side follows its own leg
  const [o, w, e] = [AVE_S[2], AVE_S[1], AVE_S[3]];
  inFrame(o[0], o[1], Math.atan2(-(e[1] - o[1]), e[0] - o[0]), () => courthouseSquare(pl));
  inFrame(o[0], o[1], Math.atan2(-(o[1] - w[1]), o[0] - w[0]), () => churchLot(pl));
}

/** Town Hall Square: the hall at the head of its own wedge-shaped block, a green with fountain, bandstand and memorial, staff lots behind. */
function townHallSquare(pl: Placer) {
  const rng = new Rng(77);
  const full = pl.net.byName('Main St').full;
  const g = face(2, -1);
  inFrame(g.x, g.z, g.ry, () => {
    const b = shape(pl, g.len);
    const hall = D('townhall');
    const zR = nearest(b.zb, g.len / 2 - 20, g.len / 2 + 20) - 1;
    const zf = zR - hall.d - 16; // the hall stands at the back of the block; the green fills the rest
    const zc = (full + zf) / 2 + 1; // fountain
    const [xa, xb] = inner(b, full + 0.5, zR);
    const cx = (xa + xb) / 2;
    const at = fbuild(pl, hall, cx, zf + hall.d / 2, PI, 11, 'Pine Hollow Town Hall', 'civic');
    pl.landmarks.push({ name: 'Town Hall Square', x: (at.x + W(cx, zc)[0]) / 2, z: (at.z + W(cx, zc)[1]) / 2, kind: 'park' });
    freserve(pl, xa, full, xb, zR);
    // walks: Main Street to the steps round the fountain, and across the green between the avenues
    path(pl, cx, full - 0.2, cx, zc - 5.5, 3.2);
    path(pl, cx, zc + 5.5, cx, zf - 0.5, 3.2);
    for (const sx of [-1, 1]) {
      path(pl, cx + sx * 5.6, zc - 5.5, cx + sx * 5.6, zc + 5.5, 2.2);
      path(pl, cx + sx * 6.5, zc, sx > 0 ? b.xr(zc) : b.xl(zc), zc, 2.2);
      // diagonal walks in from the two Main Street corners
      path(pl, cx + sx * 6.2, zc - 5, sx > 0 ? b.xr(full + 1) - 1 : b.xl(full + 1) + 1, full + 0.6, 2);
    }
    for (const z of [zc - 5.5, zc + 5.5]) path(pl, cx - 6.7, z, cx + 6.7, z, 2.2);
    prop(pl, 'fountain_park', cx, zc);
    prop(pl, 'bandstand_gazebo', cx + 24, zc + 9);
    prop(pl, 'war_memorial', cx - 23, zc + 10, PI);
    prop(pl, 'statue_plinth', cx - 22, zc - 4, PI / 2);
    for (const sx of [-1, 1]) {
      prop(pl, 'flagpole_tall', cx + sx * 7.5, zf - 3, 0, 0.4);
      for (const z of [zc - 14, zc + 13]) prop(pl, 'street_lamp_old', cx + sx * 3.2, z, 0, 0.3);
      for (const z of [zc - 3, zc + 3]) prop(pl, 'bench_wood', cx + sx * 8, z, sx * PI / 2, 0.6);
      prop(pl, 'bench_wood', cx + sx * 16, zc + 1.9, PI, 0.6);
      prop(pl, 'trash_can_street', cx + sx * 3.2, zc - 17, 0, 0.4);
      for (let i = 0; i < 4; i++) ftree(pl, 'flower_bed', cx + sx * (3.4 + i * 1.7), zf - 1.4);
      for (const z of [zc - 15, zc + 16]) for (const dx of [13, 29]) ftree(pl, rng.pick(['oak_medium', 'maple_large', 'oak_medium']), cx + sx * dx + rng.range(-1.5, 1.5), z + rng.range(-1.5, 1.5), rng.range(0.7, 0.9), rng.range(0, 6));
    }
    // staff parking either side of the hall off Riverside Dr, bins at the back door
    const zb = zf + hall.d + 0.6;
    const z1 = zR - 3;
    for (const sx of [-1, 1]) {
      const [l, r] = sx < 0 ? [Math.max(b.xl(zf + 6), b.xl(z1)) + 1, cx - hall.w / 2 - 3] : [cx + hall.w / 2 + 3, Math.min(b.xr(zf + 6), b.xr(z1)) - 1];
      carPark(pl, rng, l, zf + 6, r, z1, { fill: sx < 0 ? 0.6 : 0.45, stops: true, lights: false });
      fentrance(pl, sx < 0 ? l + 8 : r - 8, z1, 0, 1, 6);
    }
    trashCorner(pl, rng, cx, zb, 0, 9, true);
    treeEdge(pl, rng, xa + 2, zR, xb - 2, zR, ['maple_medium', 'oak_young']);
  });
}

/**
 * Courthouse Square, in a frame on Alder St (x east from Division St, z south from Alder's centre line): the
 * courthouse on its lawn, the sheriff's office and patrol yard on the avenue, public lot behind.
 */
function courthouseSquare(pl: Placer) {
  const rng = new Rng(78);
  const b = shape(pl, 0, 45);
  const xa = pl.net.byName('Division St S').full + 0.4;
  const z0 = pl.net.byName('Alder St').full + 0.3;
  const court = D('courthouse');
  const cx = xa + 30;
  const fz = z0 + 13 + court.d / 2;
  fbuild(pl, court, cx, fz, PI, 12, 'Hollow County Courthouse', 'civic');
  const xb = Math.min(b.xr(z0 + 2), b.xr(fz + 36)) - 0.4;
  freserve(pl, xa, z0, xb, z0 + 13);
  path(pl, cx, z0 - 0.2, cx, z0 + 13.4, 3.6);
  for (const sx of [-1, 1]) {
    prop(pl, 'street_lamp_old', cx + sx * 3.4, z0 + 4, 0, 0.3);
    prop(pl, 'bench_wood', cx + sx * 3.2, z0 + 9, -sx * PI / 2, 0.6);
    prop(pl, sx < 0 ? 'flagpole_tall' : 'statue_plinth', cx + sx * 11, z0 + 7, 0, 0.5);
    for (const dx of [9, 19]) ftree(pl, 'oak_medium', cx + sx * dx, z0 + 3 + rng.range(0, 2), 0.85, rng.range(0, 6));
  }
  // sheriff facing the avenue with a fenced patrol yard behind it
  const sh = D('sheriff');
  const zs = fz + 8;
  const sx = xb - 5 - sh.d / 2;
  fbuild(pl, sh, sx, zs, PI / 2, 6, 'Hollow County Sheriff', 'civic');
  const yx0 = sx - sh.d / 2 - 15;
  pave(pl, yx0, zs - sh.w / 2 - 1, sx - sh.d / 2 - 0.4, zs + sh.w / 2 + 13, 0x7c8087);
  fence(pl, 'tall', [[yx0, zs - sh.w / 2 - 1], [yx0, zs + sh.w / 2 + 13], [xb - 6.5, zs + sh.w / 2 + 13]]);
  for (let i = 0; i < 3; i++) fcar(pl, 'police', yx0 + 3.2, zs - 6 + i * 4.2, 0, 0xf1ede2, { model: i === 1 ? 'police_suv' : 'police_sedan' });
  fentrance(pl, xb, zs + sh.w / 2 + 9, 1, 0, 6);
  // the yard is worked: marked bays against the station wall, impounded wrecks along the back fence, cones and barriers stacked
  stalls(pl, rng, sx - sh.d / 2 - 0.6, zs - sh.w / 2 + 1, -PI / 2, 4, { fill: 0, stops: true });
  for (const i of [0, 2]) fcar(pl, 'police', sx - sh.d / 2 - 3.3, zs - sh.w / 2 + 1 + (i + 0.5) * 2.75, PI, 0xf1ede2, { model: i ? 'police_sedan' : 'police_suv' });
  const zy = zs + sh.w / 2 + 13;
  stalls(pl, rng, yx0 + 7, zy - 0.5, PI, 0, {});
  for (let i = 0; i < 3; i++) if (i !== 1 || rng.chance(0.5)) parked(pl, rng, yx0 + 8.5 + i * 3.1, zy - 3.4, PI / 2 + rng.range(-0.08, 0.08), BEATERS);
  for (let i = 0; i < 4; i++) prop(pl, 'jersey_barrier', sx - sh.d / 2 + 3 + i * 2.1, zy - 0.9, 0, 0.6);
  for (let i = 0; i < 5; i++) prop(pl, 'traffic_cone', sx + 3 + rng.range(-1.2, 1.2), zy - 2.2 + rng.range(-0.8, 0.8), rng.range(0, 6), false);
  prop(pl, 'barricade_lights', sx + 6, zy - 1.2, 0.2, 0.5);
  prop(pl, 'barricade_a', sx + 7.6, zy - 1.4, -0.15, 0.5);
  prop(pl, 'traffic_barrel', sx + 1, zy - 1.1, 0, 0.4);
  prop(pl, 'traffic_barrel', sx + 1.9, zy - 1.3, 1, 0.4);
  prop(pl, 'fuel_tank_stand', yx0 + 2.4, zy - 3, PI / 2, 1.2);
  prop(pl, 'oil_rack', yx0 + 1.2, zy - 6.5, PI / 2, 0.6);
  prop(pl, 'tyre_stack', yx0 + 1.3, zy - 8.2, 0, 0.5);
  prop(pl, 'utility_pole_light', yx0 + 0.9, zs + sh.w / 2 + 4, PI / 2, 0.3);
  prop(pl, 'dumpster_green', sx - sh.d / 2 + 2.2, zs + sh.w / 2 + 2, 0, true);
  prop(pl, 'electric_box', sx - sh.d / 2 + 4.6, zs + sh.w / 2 + 1.1, 0, 0.5);
  wear(pl, rng, yx0 + 1, zs - sh.w / 2, sx - sh.d / 2 - 1, zy - 1, 40);
  // memorial lawn between the courthouse and the sheriff: a walk in from the corner, the war memorial, benches under the trees
  const lx0 = cx + court.w / 2 + 3;
  const lx1 = xb - 2;
  const lz1 = zs - sh.w / 2 - 3;
  const mx = (lx0 + lx1) / 2 + 2;
  const mz = z0 + 13 + (lz1 - z0 - 13) * 0.45;
  if (lx1 - lx0 > 14) {
    pave(pl, mx - 3.4, mz - 3.4, mx + 3.4, mz + 3.4, CONCRETE, 'concrete');
    prop(pl, 'war_memorial', mx, mz, PI, 1.4);
    path(pl, mx, z0 - 0.2, mx, mz - 3.2, 2.2);
    path(pl, lx0 - 3.2, mz, mx - 3.2, mz, 2.2);
    path(pl, mx + 3.2, mz, xb + 0.2, mz, 2.2);
    for (const sd of [-1, 1]) {
      prop(pl, 'bench_wood', mx + sd * 4.6, mz - 2.2, -sd * PI / 2, 0.6);
      prop(pl, 'planter_round', mx + sd * 2.6, mz - 4.4, 0, 0.4);
      ftree(pl, 'flower_bed', mx + sd * 2.4, mz + 4.6, 1, 0);
      ftree(pl, 'flower_bed', mx + sd * 4.2, mz + 4.6, 1, 0);
      ftree(pl, rng.pick(['maple_large', 'oak_medium']), mx + sd * 8.5, mz - 6.5, 0.9, rng.range(0, 6));
      ftree(pl, rng.pick(['maple_medium', 'birch_cluster']), mx + sd * 9.5, mz + 3.5, 1, rng.range(0, 6));
    }
    prop(pl, 'street_lamp_old', mx - 1.9, mz - 8, 0, 0.3);
    prop(pl, 'trash_can_street', mx + 1.9, mz - 6.2, 0, 0.4);
    prop(pl, 'picnic_table', mx - 7.5, mz + 3.2, 0.3, 0.9);
    prop(pl, 'flagpole_tall', mx, mz + 6, 0, 0.3);
    hedge(pl, lx0, lz1, lx1, lz1);
  }
  pave(pl, sx - sh.d / 2, zs + sh.w / 2 + 0.4, xb, zs + sh.w / 2 + 13, 0x7c8087);
  // public parking behind the courthouse off Division St
  const zl = fz + court.d / 2 + 3;
  carPark(pl, rng, xa + 1, zl, yx0 - 2, zl + 27, { fill: 0.6, stops: true });
  fentrance(pl, xa + 1, zl + 13.5, -1, 0, 6.5);
  trashCorner(pl, rng, cx + 6, zl - 2.4, 0, 8, true);
  treeEdge(pl, rng, xa + 1.5, z0 + 2, xa + 1.5, zl - 2, ['maple_large', 'oak_medium'], 11);
}

/** Community church west of Division on Alder St (same kind of frame, on Alder's western leg): lawn, walk, gravel car park beside it. */
function churchLot(pl: Placer) {
  const rng = new Rng(79);
  const z0 = pl.net.byName('Alder St').full + 0.3;
  const ch = D('church');
  const fx = -34;
  fbuild(pl, ch, fx, z0 + 9 + ch.d / 2, PI, 7, 'Pine Hollow Community Church', 'civic');
  path(pl, fx, z0 - 0.2, fx, z0 + 9.4, 2.6);
  for (const sx of [-1, 1]) ftree(pl, 'maple_large', fx + sx * 12, z0 + 5, 0.85, sx);
  const xb = -pl.net.byName('Division St S').full - 1.6;
  carPark(pl, rng, fx + ch.w / 2 + 4, z0 + 10, xb, z0 + 38, { fill: 0.35, color: 0x9a9282, lights: false });
  fentrance(pl, xb, z0 + 24, 1, 0, 6);
  prop(pl, 'donation_bin', fx + ch.w / 2 + 5.4, z0 + 8.6, PI, 0.5);
  treeEdge(pl, rng, fx + ch.w / 2 + 4, z0 + 2.5, xb - 1, z0 + 2.5, ['oak_medium', 'maple_medium'], 10);
}

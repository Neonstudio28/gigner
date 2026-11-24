import type { Col } from '../core/kit';
import type { Ctx } from '../buildings/common';
import type { BuildingDef } from '../buildings/catalog';
import { room, addZone } from '../buildings/interiors';
import { Rng } from '../core/rng';
import { face, win, WHITE } from './kit2';
import { hull, partition, put, upper, spread, type Look, type Op } from './hull';
import { gable, porch, services, gutter, stack } from './parts';
import { living, kitchen, bedroom, bath, laundry, against, type Rect } from './furnish';

export interface HouseO {
  id: string;
  name: string;
  w: number;
  d: number;
  wall: Col;
  wallMat?: string;
  trim?: Col;
  roof?: Col;
  roofMat?: string;
  doorCol?: Col;
  /** Gable faces the street. */
  turn?: boolean;
  pitch?: number;
  /** Porch width as a fraction of the front (0 = stoop only). */
  porch?: number;
  shutters?: Col;
  /** Second bedroom at the back. */
  beds?: 1 | 2;
  /** Attached garage: true = one bay, 2 = double. */
  garage?: boolean | 2;
  /** Second storey (dressed, not walkable). */
  storeys?: 1 | 2;
  /** Paired dormers on the roof slope facing the street. */
  dormers?: boolean;
  /** Second chimney at the other gable. */
  twin?: boolean;
  /** Sun-bleached paint, patched roof, no TV aerial: the Flats. */
  worn?: boolean;
  chimney?: boolean;
  /** Interior wall colours: living, kitchen, bedroom, bath. */
  paint?: [Col, Col, Col, Col];
}

const WALLS: Col[] = [0xe9d8a6, 0xcfe0d2, 0xd9c7e0, 0xe6c9b0, 0xc9dbe6, 0xe8e0c8, 0xd2e2b8, 0xe9c6c0];

const garageW = (o: HouseO) => (o.garage === 2 ? 6.6 : o.garage ? 4.2 : 0);

/** Clapboard family house on a raised foundation: porch, gable roof, living room, kitchen, bedrooms and bath. */
export function house(c: Ctx, x: number, z: number, ry: number, seed: number, o: HouseO) {
  const { kit: k } = c;
  const rng = new Rng(seed * 31 + o.w * 7);
  const { w, d } = o;
  const y0 = 0.62;
  const h = 2.75;
  const trim = o.trim ?? WHITE;
  const mat = o.wallMat ?? 'siding';
  const roofC = o.roof ?? 0x4b4f55;
  const pw = (o.porch ?? 0.6) * w;
  const pd = 2.4;
  const gw = garageW(o);
  const h2 = o.storeys === 2 ? 2.8 : 0;
  c.occ.add(x + gw / 2, z + pd / 2, w + gw + 0.6, d + pd + 1.2, ry, 0.8, false);
  const P = o.paint ?? [rng.pick(WALLS), rng.pick(WALLS), rng.pick(WALLS), 0xcfe6ea];
  const base = { floor: 0xb98e62, floorMat: 'woodFloor', lights: 'dome', step: 3.6, trim } as const;
  const L: Look = { ...base, wall: P[0], wains: undefined };
  k.at(x, z, ry, () => {
    const sx = w * 0.1; // living/kitchen on the left of this line, bedrooms and bath on the right
    const a0 = w / 2 - 0.3;
    const b0 = d / 2 - 0.3;
    const doorX = -a0 + (sx + a0) * 0.72;
    const wo = { frame: trim, sill: trim, head: 'hood', mx: 2, my: 2, shutters: o.shutters } as const;
    const f: Op[] = [
      { x: doorX, w: 1.0, h: 2.15, kind: 'door', color: o.doorCol ?? 0x7a2a26, door: { glass: true, frame: trim } },
      { x: -a0 + (sx + a0) * 0.28, w: 1.8, y: 0.8, h: 1.5, kind: 'win', win: { ...wo, mx: 3 } },
      { x: (sx + a0) / 2, w: 1.3, y: 0.9, h: 1.4, kind: 'win', win: { ...wo, box: 0xf1ede2 } },
    ];
    const zl = -b0 * 0.12; // living | kitchen
    const two = o.beds === 2;
    const zb1 = two ? b0 * 0.22 : -b0 * 0.2; // front bedroom | bath
    const zb2 = two ? -b0 * 0.28 : -b0; // bath | back bedroom
    const bk: Op[] = [
      { x: a0 - (sx + a0) * 0.3 - 0.3, w: 0.95, h: 2.1, kind: 'door', color: trim, door: { glass: true, frame: trim } },
      { x: a0 - (sx + a0) * 0.72, w: 1.3, y: 1.1, h: 1.1, kind: 'win', win: wo },
      { x: -(sx + a0) / 2, w: two ? 1.3 : 0.7, y: two ? 0.9 : 1.4, h: two ? 1.4 : 0.8, kind: 'win', win: { ...wo, shutters: undefined } },
    ];
    const lf: Op[] = [{ x: zl + (b0 - zl) * 0.76, w: 1.4, y: 0.9, h: 1.4, kind: 'win', win: wo }, { x: (-b0 + zl) / 2, w: 1.1, y: 1.1, h: 1.1, kind: 'win', win: wo }];
    const rt: Op[] = [{ x: -(zb1 + b0) / 2, w: 1.3, y: 0.9, h: 1.4, kind: 'win', win: wo }, ...(two ? [{ x: -(zb2 + zb1) / 2, w: 0.7, y: 1.4, h: 0.8, kind: 'win' as const, win: { ...wo, shutters: undefined } }] : [])];
    const { a, b } = hull(k, { w, d, y0, h, wall: o.wall, wallMat: mat, look: L, frame: trim, f, b: bk, l: lf, r: rt, base: 0x8f8c87 });
    const LK: Look = { ...base, wall: P[1], wains: 0xf1ede2, wainsMat: 'beadboard', floor: 0xffffff, floorMat: 'checker' };
    const LB: Look = { ...base, wall: P[2], floor: 0x9a8f80, floorMat: 'carpet' };
    const LT: Look = { ...base, wall: P[3], wains: 0xf4f4ee, wainsMat: 'tiles', wainsH: 1.3, floor: 0xffffff, floorMat: 'tiles' };
    partition(k, sx, b, sx, -b, y0, h, LB, [{ at: b - zb1 - 1.0, leaf: trim }, { at: b - zb1 + 0.75, w: 0.8, leaf: trim }, ...(two ? [{ at: b - zb2 + 0.8, leaf: trim }] : [])]);
    partition(k, -a, zl, sx, zl, y0, h, LK, [{ at: (sx + a) / 2, w: 1.7 }]);
    partition(k, sx, zb1, a, zb1, y0, h, LT);
    if (two) partition(k, sx, zb2, a, zb2, y0, h, LB);
    const m = 0.08;
    const RL: Rect = { x0: -a, x1: sx - m, z0: zl + m, z1: b };
    const RK: Rect = { x0: -a, x1: sx - m, z0: -b, z1: zl - m };
    const RB: Rect = { x0: sx + m, x1: a, z0: zb1 + m, z1: b };
    const RT: Rect = { x0: sx + m, x1: a, z0: zb2 + m, z1: zb1 - m };
    room(k, y0, () => {
      for (const [R, col, fm] of [[RK, 0xffffff, 'checker'], [RT, 0xffffff, 'tiles'], [RB, 0x9a8f80, 'carpet']] as const) k.box((R.x0 + R.x1) / 2, 0.02, (R.z0 + R.z1) / 2, R.x1 - R.x0 + 0.04, 0.012, R.z1 - R.z0 + 0.04, col, fm, { cast: false });
      living(k, rng, RL, 'l');
      kitchen(k, rng, RK, 'b');
      bedroom(k, rng, RB, 'r');
      bath(k, rng, RT, 'r');
      if (two) bedroom(k, rng, { x0: sx + m, x1: a, z0: -b, z1: zb2 - m }, 'r', true);
      else laundry(k, { x0: sx + 1.2, x1: a, z0: -b, z1: zb1 }, 'b');
      against(k, RL, 'f', 0.93, 'coat_rack');
      for (const [R, wl, t] of [[RL, 'l', 0.76], [RB, 'f', 0.5], [RK, 'l', 0.5]] as const) against(k, R, wl, t, 'curtain_pair', { solid: false, off: 0.02 });
    });
    // roof, gable ends, chimney
    if (h2) {
      const wu = { frame: trim, sill: trim, head: 'hood', mx: 2, my: 2, shutters: o.shutters } as const;
      upper(k, w, d, y0 + h, h2, o.wall, mat, {
        f: { xs: spread(Math.max(3, Math.round(w / 3.4)), w - 1.6), w: 1.2, h: 1.5, y: 0.75, o: wu },
        b: { xs: spread(Math.max(2, Math.round(w / 4.2)), w - 2.4), w: 1.2, h: 1.5, y: 0.75, o: wu },
        l: { xs: spread(2, d - 2.6), w: 1.1, h: 1.5, y: 0.75, o: wu },
        r: { xs: spread(2, d - 2.6), w: 1.1, h: 1.5, y: 0.75, o: wu },
      });
      for (const sd of ['f', 'b', 'l', 'r'] as const) face(k, sd, w, d, (len) => k.box(0, y0 + h - 0.08, 0.03, len + 0.08, 0.2, 0.07, trim));
    }
    const rise = gable(k, w, d, y0 + h + h2, { pitch: o.pitch ?? 0.62, color: roofC, mat: o.roofMat ?? 'shingle', turn: o.turn, trim, fill: o.wall, fillMat: mat, oh: 0.55, goh: 0.45 });
    const top = y0 + h + h2;
    if (o.turn) face(k, 'f', w, d, () => k.box(0, top + rise * 0.3, 0.02, 0.9, 0.9, 0.08, trim));
    if (o.turn) face(k, 'f', w, d, () => k.box(0, top + rise * 0.3 + 0.1, 0.05, 0.7, 0.7, 0.06, 0x3c4a50, 'glass'));
    if (o.chimney !== false) stack(k, -w / 2 + 1.4, top + rise * 0.35, o.turn ? -d / 4 : 0, rise * 0.65 + 1.3);
    if (o.twin) stack(k, w / 2 - 1.4, top + rise * 0.35, o.turn ? -d / 4 : 0, rise * 0.65 + 1.3);
    if (o.worn) {
      // tar-paper patches and a blue tarp on the roof slope, a boarded side window
      const sl = Math.atan(o.pitch ?? 0.62);
      if (!o.turn) {
        k.box(w * 0.18, top + rise * 0.52, d * 0.24, 2.6, 0.05, 1.9, 0x2f3338, 'paint', { rx: sl, cast: false });
        k.box(-w * 0.22, top + rise * 0.36, d * 0.33, 2.2, 0.06, 1.6, 0x3f6fa8, 'paint', { rx: sl, cast: false });
      }
      face(k, 'l', w, d, () => k.box(0.6, y0 + 0.5, 0.05, 1.3, 1.0, 0.05, 0x8a6a48, 'boards'));
    } else put(k, 'antenna_tv', w / 4, top + rise * (o.turn ? 0.5 : 1) - 0.1, o.turn ? -d / 4 : 0);
    if (o.dormers && !o.turn) {
      const pt = o.pitch ?? 0.62;
      for (const dx of [-w * 0.24, w * 0.24]) {
        const dz = d * 0.27;
        const yb = top + (d / 2 - dz) * pt;
        k.box(dx, yb - 0.3, dz + 0.5, 1.7, 1.7, 1.6, o.wall, mat);
        k.at(dx, dz + 1.3, 0, () => win(k, 0, yb, 1.0, 1.1, { frame: trim, sill: trim, mx: 2, my: 2 }));
        for (const sg of [-1, 1]) k.box(dx + sg * 0.52, yb + 1.52, dz + 0.45, 1.3, 0.1, 2.0, roofC, o.roofMat ?? 'shingle', { rz: -sg * 0.62 });
      }
    }
    // porch or stoop
    if (pw > 2) porch(k, doorX + Math.min(0, w / 2 - (doorX + pw / 2)) + Math.max(0, -w / 2 - (doorX - pw / 2)), d / 2, pw, pd, { y0, h: 2.45, color: trim, roof: roofC, roofMat: o.roofMat ?? 'shingle', stepsAt: doorX - (doorX + Math.min(0, w / 2 - (doorX + pw / 2)) + Math.max(0, -w / 2 - (doorX - pw / 2))), stepsW: 1.5 });
    else {
      k.box(doorX, 0, d / 2 + 0.7, 1.8, y0, 1.4, 0x9a968e, 'concrete');
      for (let i = 0; i < 3; i++) k.box(doorX, 0, d / 2 + 1.4 + 0.15 + i * 0.3, 1.8, y0 - ((i + 1) * y0) / 4, 0.3, 0x9a968e, 'concrete');
      addZone(k, doorX, d / 2 + 0.7, 1.8, 1.4, y0);
      addZone(k, doorX, d / 2 + 1.85, 1.8, 0.9, y0, 0);
      k.box(doorX, y0 + 2.4, d / 2 + 0.6, 2.2, 0.1, 1.3, roofC, 'shingle', { rx: 0.2 });
    }
    // back stoop, services, gutters
    face(k, 'b', w, d, (len) => {
      const bx = a0 - (sx + a0) * 0.3 - 0.3;
      k.box(bx, 0, 0.6, 1.5, y0, 1.2, 0x9a968e, 'concrete');
      for (let i = 0; i < 3; i++) k.box(bx, 0, 1.2 + 0.15 + i * 0.3, 1.5, y0 - ((i + 1) * y0) / 4, 0.3, 0x9a968e, 'concrete');
      services(k, -len / 2 + 1.0, y0 + h);
      if (!o.turn) gutter(k, -len / 2, len / 2, y0 + h + h2, 0.55, trim);
      put(k, 'ac_unit_window', -(sx + a0) / 2, y0 + (two ? 0.9 : 1.4), 0.1);
    });
    // corner boards and water table
    for (const sxn of [-1, 1]) for (const szn of [-1, 1]) k.box(sxn * (w / 2 + 0.01), y0, szn * (d / 2 + 0.01), 0.16, h + h2, 0.16, trim);
    for (const s of ['f', 'b', 'l', 'r'] as const) face(k, s, w, d, (len) => k.box(0, y0 - 0.06, 0.03, len + 0.06, 0.14, 0.06, trim));
    // attached garage with its own low gable
    if (o.garage) {
      k.push(w / 2 + gw / 2, 0, -d / 2 + 3.4);
      const gl: Look = { wall: 0xd8d4c8, floor: 0x9a968e, floorMat: 'concrete', ceil: 0xc9c4b6, ceilMat: 'boards', lights: 'bulb' };
      hull(k, { w: gw, d: 6.8, y0: 0.06, h: 2.5, wall: o.wall, wallMat: mat, look: gl, frame: trim, skip: 'l', f: gw > 5 ? [{ x: -1.6, w: 2.7, h: 2.15, kind: 'garage', color: trim }, { x: 1.6, w: 2.7, h: 2.15, kind: 'garage', color: trim }] : [{ x: 0, w: 3.0, h: 2.15, kind: 'garage', color: trim }], r: [{ x: 0, w: 0.9, y: 1.2, h: 0.9, kind: 'win', win: { frame: trim, sill: trim } }], base: 0x8f8c87 });
      gable(k, gw, 6.8, 2.56, { pitch: 0.5, color: roofC, mat: o.roofMat ?? 'shingle', turn: true, trim, fill: o.wall, fillMat: mat, oh: 0.35 });
      room(k, 0.06, () => {
        put(k, 'workbench', 0, 0, -2.9);
    
    put(k, 'tool_cabinet_red', 1.4, 0, -2.6);
        put(k, 'shelf_garage', -1.6, 0, 1.0, Math.PI / 2);
      });
      k.pop();
    }
  });
}

const H = (o: HouseO, tag = 'house'): BuildingDef => {
  const gw = garageW(o);
  return { id: o.id, name: o.name, w: o.w + gw, d: o.d + 3.6, front: o.d / 2 + 2.4, drive: gw ? o.w / 2 + gw / 2 : undefined, tags: [tag], build: (c, x, z, ry, seed) => house(c, x - (gw / 2) * Math.cos(ry), z + (gw / 2) * Math.sin(ry), ry, seed, o) };
};

export const HOUSES: BuildingDef[] = [
  H({ id: 'house_cream', name: 'Cream clapboard house', w: 11.5, d: 8.6, wall: 0xf0e6c8, roof: 0x5a4a42, shutters: 0x2f5d4b, doorCol: 0x2f5d4b, porch: 0.62 }),
  H({ id: 'house_blue', name: 'Blue gable-front house', w: 10.5, d: 10, wall: 0x8fb0c4, roof: 0x3f444a, turn: true, porch: 1, doorCol: 0xa3262e, beds: 2 }),
  H({ id: 'house_yellow', name: 'Yellow house with garage', w: 12, d: 9, wall: 0xe8cf7a, roof: 0x6a3f34, shutters: 0xf1ede2, garage: true, porch: 0.45, beds: 2 }),
  H({ id: 'house_green', name: 'Sage bungalow', w: 10, d: 8.4, wall: 0x9fb89a, roof: 0x4a4038, turn: true, pitch: 0.5, porch: 1, doorCol: 0x6a3f24 }),
  H({ id: 'house_red', name: 'Red farm-style house', w: 12.5, d: 9.2, wall: 0xa8483e, roof: 0x8a9096, roofMat: 'roofMetal', shutters: 0x2a2623, doorCol: 0xf1ede2, porch: 1, beds: 2 }),
  H({ id: 'house_white', name: 'White cottage', w: 10, d: 8.2, wall: 0xf1ede2, roof: 0x4f6a5a, shutters: 0x27407a, doorCol: 0x27407a, porch: 0, chimney: true }),
  H({ id: 'house_tan', name: 'Tan house with garage', w: 11, d: 9, wall: 0xcdb590, roof: 0x55504a, garage: true, porch: 0.5, doorCol: 0x4a3324, trim: 0x5a4636 }),
  H({ id: 'house_pink', name: 'Rose house', w: 11, d: 9.4, wall: 0xdba9a0, roof: 0x4b4f55, turn: true, porch: 0.6, shutters: 0xf1ede2, beds: 2 }),
];

/** Cedar Ridge: big two-storey houses with double garages, dormers and twin chimneys. */
export const ESTATES: BuildingDef[] = [
  H({ id: 'estate_white', name: 'White colonial', w: 15.5, d: 10.6, wall: 0xf4f1e8, roof: 0x3d4248, shutters: 0x23302c, doorCol: 0x7a1f1c, porch: 0.34, beds: 2, storeys: 2, garage: 2, twin: true }, 'estate'),
  H({ id: 'estate_brick', name: 'Brick manor', w: 16, d: 11, wall: 0xffffff, wallMat: 'brickRed', roof: 0x4a4038, shutters: 0xf1ede2, doorCol: 0x1f2a36, porch: 0.3, beds: 2, storeys: 2, garage: 2, twin: true, dormers: true }, 'estate'),
  H({ id: 'estate_grey', name: 'Grey lake house', w: 15, d: 10.4, wall: 0x9aa3a6, roof: 0x2f3438, trim: 0xf4f1e8, doorCol: 0xd9a21c, porch: 1, beds: 2, storeys: 2, garage: 2, dormers: true }, 'estate'),
  H({ id: 'estate_cream', name: 'Cream Georgian', w: 16.5, d: 10.8, wall: 0xefe3c2, roof: 0x55362c, shutters: 0x2f4a3a, doorCol: 0x2f4a3a, porch: 0.3, beds: 2, storeys: 2, garage: true, twin: true, dormers: true }, 'estate'),
  H({ id: 'estate_stone', name: 'Brick-front ranch house', w: 18, d: 10.2, wall: 0xffffff, wallMat: 'brickTan', roof: 0x3b3f44, pitch: 0.42, shutters: 0x3a2a20, doorCol: 0x3a2a20, porch: 0.5, beds: 2, garage: 2, twin: true }, 'estate'),
];

/** The Flats: small worn houses on narrow lots. */
export const SHACKS: BuildingDef[] = [
  H({ id: 'shack_grey', name: 'Weathered grey house', w: 8.6, d: 7.4, wall: 0x9c9a92, trim: 0xc9c4b6, roof: 0x5c4a40, roofMat: 'roofMetal', pitch: 0.45, porch: 0, doorCol: 0x5d6a58, chimney: false, worn: true }, 'shack'),
  H({ id: 'shack_green', name: 'Faded green house', w: 9, d: 7.6, wall: 0x8a9a80, trim: 0xd8d4c8, roof: 0x4b4640, pitch: 0.5, porch: 0.7, doorCol: 0x6a3f24, turn: true, worn: true }, 'shack'),
  H({ id: 'shack_blue', name: 'Peeling blue house', w: 8.8, d: 8, wall: 0x7f95a3, trim: 0xcfcabb, roof: 0x7a4a3a, roofMat: 'roofMetal', pitch: 0.4, porch: 0.5, doorCol: 0xc9c4b6, chimney: false, worn: true }, 'shack'),
  H({ id: 'shack_tan', name: 'Tar-paper house', w: 8.2, d: 7.2, wall: 0xb09a78, trim: 0x8a7a62, roof: 0x3a3a3c, pitch: 0.38, porch: 0, doorCol: 0x7a2a26, worn: true }, 'shack'),
  H({ id: 'shack_white', name: 'Shotgun house', w: 7.6, d: 9.6, wall: 0xd8d2c2, trim: 0xa8a294, roof: 0x6a5a50, roofMat: 'roofMetal', pitch: 0.5, porch: 1, doorCol: 0x3f5a6a, turn: true, chimney: false, worn: true }, 'shack'),
];

interface TrailerO {
  id: string;
  name: string;
  wall: Col;
  stripe: Col;
  skirt?: Col;
  len?: number;
  awning?: Col;
}

/** Single-wide mobile home: ribbed siding with a colour band, skirting, a timber deck at the door, hitch and propane at the ends. */
function trailer(c: Ctx, x: number, z: number, ry: number, seed: number, o: TrailerO) {
  const { kit: k } = c;
  const rng = new Rng(seed * 17 + 5);
  const w = o.len ?? 15.6;
  const d = 4.4;
  const y0 = 0.72;
  const h = 2.35;
  const trim = 0xe6e2d6;
  const FR = 0x8c9096;
  c.occ.add(x, z + 0.9, w + 2.6, d + 2.6, ry, 0.8, false);
  const base = { floor: 0xa8845c, floorMat: 'woodFloor', lights: 'dome', step: 3.2, trim } as const;
  const L: Look = { ...base, wall: 0xe9dfc8, wains: 0xb08a5c, wainsMat: 'boards', wainsH: 1.0 };
  k.at(x, z, ry, () => {
    const doorX = -w * 0.14;
    const wo = { frame: FR, sill: FR, mx: 2, my: 1 } as const;
    const x1 = w * 0.1; // living + kitchen | bath
    const x2 = w * 0.24; // bath | bedroom
    const f: Op[] = [
      { x: doorX, w: 0.9, h: 2.0, kind: 'door', color: 0xd8d4c8, door: { glass: true, frame: FR } },
      { x: -w * 0.34, w: 2.0, y: 0.9, h: 1.1, kind: 'win', win: { ...wo, mx: 3 } },
      { x: w * 0.36, w: 1.3, y: 1.0, h: 1.0, kind: 'win', win: wo },
    ];
    const bk: Op[] = [
      { x: w * 0.3, w: 1.3, y: 1.0, h: 1.0, kind: 'win', win: wo },
      { x: -w * 0.18, w: 0.7, y: 1.4, h: 0.6, kind: 'win', win: wo },
      { x: -w * 0.36, w: 1.3, y: 1.0, h: 1.0, kind: 'win', win: wo },
    ];
    const { a, b } = hull(k, { w, d, y0, h, wall: o.wall, wallMat: 'roofMetal', look: L, frame: FR, f, b: bk, l: [{ x: 0, w: 1.6, y: 0.9, h: 1.1, kind: 'win', win: { ...wo, mx: 3 } }], r: [{ x: 0, w: 1.0, y: 1.0, h: 1.0, kind: 'win', win: wo }], base: o.skirt ?? 0xb9b4a6 });
    const LT: Look = { ...base, wall: 0xcfe6ea, wains: 0xf4f4ee, wainsMat: 'tiles', wainsH: 1.3, floor: 0xffffff, floorMat: 'tiles' };
    const LB: Look = { ...base, wall: 0xd9c7b0, floor: 0x8a7f70, floorMat: 'carpet' };
    partition(k, x1, b, x1, -b, y0, h, LT, [{ at: 0.9, w: 0.8, leaf: trim }]);
    partition(k, x2, b, x2, -b, y0, h, LB, [{ at: 0.9, w: 0.8, leaf: trim }]);
    const m = 0.08;
    room(k, y0, () => {
      k.box((x1 + x2) / 2, 0.02, 0, x2 - x1 - 0.1, 0.012, 2 * b, 0xffffff, 'tiles', { cast: false });
      k.box((x2 + a) / 2, 0.02, 0, a - x2 - 0.1, 0.012, 2 * b, 0x8a7f70, 'carpet', { cast: false });
      living(k, rng, { x0: -a, x1: -a * 0.38, z0: -b, z1: b }, 'l');
      kitchen(k, rng, { x0: -a * 0.36, x1: x1 - m, z0: -b, z1: b * 0.1 }, 'b');
      bath(k, rng, { x0: x1 + m, x1: x2 - m, z0: -b, z1: b * 0.2 }, 'b');
      bedroom(k, rng, { x0: x2 + m, x1: a, z0: -b, z1: b }, 'r');
    });
    // colour bands, roof with a shallow crown, a flue
    for (const sd of ['f', 'b', 'l', 'r'] as const)
      face(k, sd, w, d, (len) => {
        k.box(0, y0 + 0.62, 0.012, len, 0.34, 0.03, o.stripe, 'paint', { cast: false });
        k.box(0, y0 + h - 0.16, 0.012, len, 0.14, 0.03, o.stripe, 'paint', { cast: false });
      });
    k.box(0, y0 + h, 0, w + 0.3, 0.12, d + 0.3, 0xd4d1c8, 'roofMetal');
    k.box(0, y0 + h + 0.12, 0, w + 0.1, 0.1, d * 0.56, 0xcbc8be, 'roofMetal');
    k.box(w * 0.2, y0 + h + 0.2, 0.4, 0.3, 0.35, 0.3, FR, 'metal');
    put(k, 'antenna_tv', -w * 0.3, y0 + h + 0.2, 0);
    // timber deck and steps at the door
    const dw = 3.0;
    const dd = 1.8;
    const wood = 0x8a6a48;
    k.box(doorX, 0, d / 2 + dd / 2, dw, y0, dd, wood, 'boards');
    for (const sx of [-1, 1]) for (const sz of [0.1, dd - 0.1]) k.box(doorX + sx * (dw / 2 - 0.08), y0, d / 2 + sz, 0.1, 0.95, 0.1, 0x7a5c3e, 'boards');
    k.box(doorX - dw / 2 + 0.08, y0 + 0.9, d / 2 + dd / 2, 0.08, 0.08, dd, 0x7a5c3e, 'boards');
    k.box(doorX - 0.75, y0 + 0.9, d / 2 + dd - 0.1, dw - 1.5, 0.08, 0.08, 0x7a5c3e, 'boards');
    const sxp = doorX + dw / 2 - 0.75;
    for (let i = 0; i < 3; i++) k.box(sxp, 0, d / 2 + dd + 0.15 + i * 0.3, 1.3, y0 - ((i + 1) * y0) / 4, 0.3, wood, 'boards');
    addZone(k, doorX, d / 2 + dd / 2, dw, dd, y0);
    addZone(k, sxp, d / 2 + dd + 0.45, 1.3, 0.9, y0, 0);
    if (o.awning) {
      k.box(doorX, y0 + 2.25, d / 2 + dd / 2, dw + 0.3, 0.08, dd + 0.3, o.awning, 'roofMetal', { rx: 0.14 });
      for (const sx of [-1, 1]) k.box(doorX + sx * (dw / 2 - 0.08), y0 + 0.95, d / 2 + dd - 0.1, 0.07, 1.2, 0.07, 0xd8d4c8, 'metal');
    }
    // hitch tongue, propane and the window unit
    face(k, 'l', w, d, () => {
      for (const sg of [-1, 1]) k.box(sg * 0.5, 0.42, 0.8, 0.09, 0.09, 1.9, 0x3a3d42, 'metal', { ry: -sg * 0.5 });
      k.box(0, 0.2, 1.6, 0.14, 0.4, 0.14, 0x3a3d42, 'metal');
    });
    face(k, 'r', w, d, () => put(k, 'propane_tank', 0.6, 0, 0.5));
    face(k, 'b', w, d, () => {
      put(k, 'ac_unit_window', w * 0.3, y0 + 1.0, 0.1);
      services(k, -w / 2 + 1.0, y0 + h);
    });
  });
}

const T = (o: TrailerO): BuildingDef => ({ id: o.id, name: o.name, w: (o.len ?? 15.6) + 1, d: 4.4 + 3.6, front: 2.2 + 2.9, tags: ['trailer'], build: (c, x, z, ry, seed) => trailer(c, x, z, ry, seed, o) });

/** Whispering Pines trailer court. */
export const TRAILERS: BuildingDef[] = [
  T({ id: 'trailer_white', name: 'White single-wide', wall: 0xe9e6dc, stripe: 0x8a5a3a, awning: 0xb9b4a6 }),
  T({ id: 'trailer_aqua', name: 'Aqua single-wide', wall: 0xdfe8e4, stripe: 0x4f9a94, skirt: 0xc9c4b6 }),
  T({ id: 'trailer_tan', name: 'Tan single-wide', wall: 0xd9c9a4, stripe: 0x6a4a34, awning: 0x8a9096, len: 14.2 }),
  T({ id: 'trailer_yellow', name: 'Yellow single-wide', wall: 0xe9dfa8, stripe: 0xf1ede2, skirt: 0xa8a294, len: 16.8 }),
  T({ id: 'trailer_blue', name: 'Blue-band single-wide', wall: 0xe6e6e2, stripe: 0x3f5f8a, awning: 0x3f5f8a }),
  T({ id: 'trailer_rust', name: 'Rust-band single-wide', wall: 0xd8d0c0, stripe: 0x9a4a2e, skirt: 0x8f8c87, len: 14.2 }),
];

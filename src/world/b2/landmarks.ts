import type { Col } from '../core/kit';
import type { Ctx } from '../buildings/common';
import type { BuildingDef } from '../buildings/catalog';
import { Rng } from '../core/rng';
import { room, addZone, furnishStore, furnishDiner, furnishCafe, furnishSheriff, furnishOffice } from '../buildings/interiors';
import { face, cornice, awning, signBoard, WHITE, STONE, DARK, F_OS } from './kit2';
import { hull, spread, put, partition, type Look, type Op } from './hull';
import { parapetRoof, roofGear, gable, services, post } from './parts';
import { item } from './furnish';
import { asset } from '../assets';

type Kit = Ctx['kit'];
export interface BlockO {
  w: number;
  d: number;
  h?: number;
  y0?: number;
  wall: Col;
  wallMat?: string;
  look: Look;
  f: Op[];
  b?: Op[];
  l?: Op[];
  r?: Op[];
  roof?: 'flat' | 'gable' | 'gableT';
  roofCol?: Col;
  roofMat?: string;
  pitch?: number;
  band?: number;
  frame?: Col;
  gear?: number;
  furnish?: (k: Kit, rng: Rng, a: number, b: number) => void;
}

/** One walk-in volume with its roof; returns the height of the wall top. Call inside `k.at`. */
export function block(c: Ctx, o: BlockO): number {
  const { kit: k, rng } = c;
  const y0 = o.y0 ?? 0.18;
  const h = o.h ?? 3.4;
  const mat = o.wallMat ?? 'brickRed';
  const { a, b } = hull(k, { w: o.w, d: o.d, y0, h, wall: o.wall, wallMat: mat, look: o.look, frame: o.frame ?? WHITE, f: o.f, b: o.b ?? [], l: o.l ?? [], r: o.r ?? [], base: 0x8f8c87 });
  if (o.furnish) room(k, y0, () => o.furnish!(k, rng, a, b));
  let H = y0 + h;
  if ((o.roof ?? 'flat') === 'flat') {
    const band = o.band ?? 0.7;
    k.box(0, H, 0, o.w, band, o.d, o.wall, mat);
    H += band;
    parapetRoof(k, o.w, o.d, H, { wall: o.wall, wallMat: mat, h: 0.5 });
    roofGear(k, rng, o.w, o.d, H, o.gear ?? 2 + Math.floor(o.w / 7));
  } else {
    gable(k, o.w, o.d, H, { pitch: o.pitch ?? 0.6, color: o.roofCol ?? 0x4b4f55, mat: o.roofMat ?? 'shingle', turn: o.roof === 'gableT', fill: o.wall, fillMat: mat });
  }
  return H;
}

export const glassDoor = (x: number, color: Col, w = 1.1): Op => ({ x, w, h: 2.3, kind: 'door', color, door: { glass: true, transom: 0.45, frame: color } });
export const shopWin = (x: number, w: number, color: Col, h = 2.2): Op => ({ x, w, y: 0.6, h, kind: 'shop', color });
export const sash = (x: number, w = 1.1, h = 1.5, y = 0.95, frame: Col = WHITE): Op => ({ x, w, h, y, kind: 'win', win: { frame, my: 1, sill: frame } });
export const backDoor = (x: number): Op => ({ x, w: 0.95, h: 2.1, kind: 'door', color: 0x6b6f73, door: { frame: 0x8a8580 } });

/** Stands a sign model and letters its flat faces (manifest `faces`: x, depth, height, w, h, turn in degrees). "A|B" is two lines. */
export function faceSign(c: Ctx, key: string, name: string, x: number, z: number, ry: number, bg: string, ink: string, texts: string[], y = 0) {
  const { kit: k } = c;
  if (!put(k, name, x, y, z, ry, { solid: 0.4 })) return;
  const faces = (asset(name)!.info.faces as number[][] | undefined) ?? [];
  k.at(x, z, ry, () => {
    let slot = -1;
    let prev = '';
    faces.forEach((f, i) => {
      const id = `${f[2]}|${f[3]}`;
      if (id !== prev) slot++;
      prev = id;
      const t = texts[slot];
      if (!t) return;
      const back = Math.abs(f[5]) > 90;
      const lines = t.split('|');
      signBoard(c, `${key}.${slot}`, f[0] * (back ? -1 : 1) * 1, y + f[2], -f[1] + (back ? -0.012 : 0.012), f[3] * 0.96, f[4] * 0.94, bg,
        lines.map((text, j) => ({ text, font: F_OS, weight: '800', color: ink, y: lines.length === 1 ? 0.56 : 0.4 + j * 0.42, size: lines.length === 1 ? 0.56 : 0.36, maxW: 0.88 })),
        { ry: back ? Math.PI : 0, frame: undefined });
      void i;
    });
  });
}

/** Lot paving with oil stains and a kerb-height apron edge. */
export function lot(k: Kit, w: number, d: number, color: Col = 0x6f6f72, mat = 'asphalt', cz = 0) {
  k.box(0, 0, cz, w, 0.05, d, color, mat, { cast: false });
}

/** A fuel pump with hose, on its island. */
function pump(k: Kit, x: number, z: number, body: Col) {
  k.box(x, 0.16, z, 0.85, 1.25, 0.5, body, 'gloss');
  k.box(x, 1.41, z, 0.95, 0.5, 0.56, 0xe9e6dc, 'gloss');
  k.box(x, 1.91, z, 0.85, 0.12, 0.5, body, 'gloss');
  for (const s of [-1, 1]) {
    k.box(x, 1.5, z + s * 0.285, 0.6, 0.3, 0.02, 0x20262a, 'glass');
    k.box(x + 0.3, 0.75, z + s * 0.3, 0.12, 0.4, 0.1, DARK, 'rubber');
  }
}

export const L_STORE: Look = { wall: 0xe6dcc3, wains: 0x8a6a48, floor: 0xffffff, floorMat: 'checker', lights: 'troffer' };
export const L_CAFE: Look = { wall: 0xf3d9c8, wains: 0xd9869a, floor: 0xffffff, floorMat: 'checker', lights: 'pendant', step: 3.2 };
export const L_OFFICE: Look = { wall: 0xd7dccb, wains: 0x7a6248, floor: 0x8f8a80, floorMat: 'carpet', lights: 'troffer' };
export const L_WOOD: Look = { wall: 0xece4d2, wains: 0x7a5a3c, floor: 0xb98e62, floorMat: 'woodFloor', ceil: 0xe9e2d2, ceilMat: 'beadboard', lights: 'pendant', step: 4 };

/** Filling station: mart at the back of the lot, pumps under the canopy, price pylon on the corner. */
function gas(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  c.occ.add(x, z, 42, 36, ry, 0.5, false);
  k.at(x, z, ry, () => {
    lot(k, 42, 36, 0x77777a, 'concrete');
    k.at(-4, -11, 0, () => {
      const w = 20;
      const d = 11;
      const red = 0xb8322a;
      const H = block(c, { w, d, wall: 0xe9e4d6, wallMat: 'stucco', look: L_STORE, frame: red, band: 1.1,
        f: [glassDoor(0, red, 1.6), shopWin(-5.6, 6.4, red), shopWin(5.6, 6.4, red)], b: [backDoor(w / 2 - 1.6)], r: [sash(0, 1.2, 1.2, 1.2, 0x8a8580)],
        furnish: (kk, r, a, b) => furnishStore(kk, r, a, b, 0, true) });
      face(k, 'f', w, d, (len) => {
        k.box(0, H - 1.0, 0.06, len, 0.9, 0.12, red, 'gloss');
        signBoard(c, 'gas.mart', 0, H - 0.55, 0.14, 9, 0.7, '#b8322a', [{ text: 'TIMBERLINE FOOD MART', font: F_OS, weight: '800', color: '#fff6dc', y: 0.56, size: 0.6, maxW: 0.92 }], { frame: DARK, lamps: 4 });
        k.box(0, 0, 1.0, len + 2, 0.16, 2.0, 0x9a968e, 'concrete');
        put(k, 'ice_freezer', -7.6, 0.16, 0.55, 0);
        put(k, 'vending_soda', 7.2, 0.16, 0.5, 0);
        put(k, 'vending_snack', 8.3, 0.16, 0.5, 0);
        put(k, 'newspaper_box_a', 2.2, 0.16, 0.45, 0);
        put(k, 'trash_can_street', -2.3, 0.16, 0.5, 0);
        put(k, 'payphone_post', -9.2, 0.16, 0.5, 0);
      });
      face(k, 'b', w, d, (len) => {
        services(k, -len / 2 + 1.2, H - 0.8);
        put(k, 'dumpster_green', 4, 0, 1.6, 0);
        put(k, 'tyre_stack', -3, 0, 0.8, 0.4);
        put(k, 'trash_bag_b', 5.6, 0, 1.2, 1);
      });
      // service bay on the right
      k.at(w / 2 + 4.5, 0.5, 0, () => {
        const HH = block(c, { w: 9, d: 10, h: 3.8, wall: 0xe9e4d6, wallMat: 'stucco', look: { wall: 0xbfc2c0, floor: 0x77777a, floorMat: 'concrete', lights: 'bulb' }, band: 0.7, gear: 1,
          f: [{ x: 0, w: 4.2, h: 3.3, kind: 'garage', color: 0xd9dde0 }], l: [] });
        face(k, 'f', 9, 10, () => {
          k.box(0, HH - 0.65, 0.06, 9, 0.55, 0.12, 0xb8322a, 'gloss');
          signBoard(c, 'gas.bay', 0, HH - 0.38, 0.14, 5, 0.45, '#b8322a', [{ text: 'LUBE · TIRES · REPAIR', font: F_OS, weight: '700', color: '#fff6dc', y: 0.58, size: 0.6, maxW: 0.92 }], { frame: DARK });
          put(k, 'tyre_stack', 3.6, 0, 0.7, 0);
          put(k, 'tyre', 3.0, 0, 1.4, 0);
        });
      });
    });
    // canopy and two pump islands
    for (const cx of [-9, 9]) {
      if (!put(k, 'gas_canopy', cx, 0, 7, 0, { solid: 0.35 })) {
        k.box(cx, 4.9, 7, 12, 0.5, 8, 0xe9e6dc, 'gloss');
        for (const s of [-1, 1]) k.box(cx + s * 3.5, 0, 7, 0.4, 4.9, 0.4, 0xe9e6dc, 'gloss');
      }
      k.box(cx, 0.05, 7, 9, 0.12, 1.3, 0xb9b5aa, 'concrete');
      for (const px of [-2.4, 2.4]) pump(k, cx + px, 7, 0xb8322a);
      k.solid(cx, 7, 6.5, 0.8);
      put(k, 'trash_can_street', cx + 4.2, 0.17, 7, 0);
      for (const s of [-1, 1]) put(k, 'bollard_yellow_black', cx + s * 4.8, 0, 7, 0);
    }
    faceSign(c, 'gas.pylon', 'gas_price_pylon', 18.5, 15, 0, '#b8322a', '#fff6dc', ['TIMBER|LINE', 'GAS', 'REG  1.09', 'PLUS 1.19', 'DIESEL 1.05']);
    for (let i = 0; i < 6; i++) put(k, rng.pick(['litter_cup', 'litter_can', 'litter_paper_b', 'litter_paper_c']), rng.range(-18, 18), 0.05, rng.range(-2, 16), rng.range(0, 6), { solid: false });
  });
}

/** Drive-up donut shop under a giant donut. */
function donut(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const w = 14;
  const d = 11;
  const pink = 0xd9708a;
  c.occ.add(x, z, w, d, ry, 1.2, false);
  k.at(x, z, ry, () => {
    const H = block(c, { w, d, wall: 0xf4e3cf, wallMat: 'stucco', look: L_CAFE, frame: pink, band: 0.9,
      f: [glassDoor(-3.5, pink), shopWin(2.2, 8.4, pink)], l: [shopWin(1, 5, pink)], b: [backDoor(w / 2 - 1.6)], r: [{ x: 1.5, w: 1.3, h: 1.1, y: 1.0, kind: 'win', win: { frame: pink, sill: STONE } }],
      furnish: (kk, r, a, b) => furnishCafe(kk, r, a, b, -3.5) });
    face(k, 'f', w, d, (len) => {
      awning(k, 0, 3.5, len - 0.6, { a: pink, b: 0xfdf3e3, proj: 1.4, drop: 0.6 });
      signBoard(c, 'donut.f', 0, H - 0.5, 0.1, 8.5, 0.7, '#fdf3e3', [{ text: 'HOLE LOTTA DONUTS', font: F_OS, weight: '800', color: '#c2476a', y: 0.56, size: 0.62, maxW: 0.92 }], { frame: pink, lamps: 3 });
      put(k, 'newspaper_box_b', 5.9, 0, 0.5, 0);
      put(k, 'trash_can_street', -5.6, 0, 0.5, 0);
    });
    face(k, 'r', w, d, (len) => {
      // drive-up window
      k.box(1.5, 2.6, 0.5, 2.2, 0.12, 1.0, pink, 'gloss');
      signBoard(c, 'donut.dt', -2.4, 2.2, 0.08, 2.4, 0.5, '#c2476a', [{ text: 'DRIVE-THRU', font: F_OS, weight: '800', color: '#fdf3e3', y: 0.58, size: 0.6, maxW: 0.9 }], {});
      void len;
    });
    face(k, 'b', w, d, (len) => {
      services(k, -len / 2 + 1.2, H - 0.6);
      put(k, 'dumpster_blue_open', 2.5, 0, 1.5, 0);
      put(k, 'cardboard_box_stack', 0.4, 0, 0.7, 0.3);
    });
    if (!put(k, 'giant_donut_sign', 0, H + 0.5, d / 2 - 2.2, 0, { solid: false })) k.box(0, H + 0.5, d / 2 - 2, 3, 3, 0.8, 0xc98a4a);
  });
}

/** Streamlined roadside diner. */
function dinerB(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const w = 22;
  const d = 9;
  const red = 0xb5322c;
  c.occ.add(x, z, w, d, ry, 1.2, false);
  k.at(x, z, ry, () => {
    const xs = spread(6, w - 5.5);
    const H = block(c, { w, d, h: 3.0, y0: 0.5, wall: 0xdfe4e6, wallMat: 'corrugated', look: { wall: 0xf1ead8, wains: red, floor: 0xffffff, floorMat: 'checker', lights: 'pendant', step: 3 }, frame: 0xc9ced2, band: 0.8, gear: 3,
      f: [glassDoor(0, red, 1.2), ...xs.filter((v) => Math.abs(v) > 1.5).map((v) => shopWin(v, 2.5, 0xc9ced2, 1.5))].map((o) => (o.kind === 'shop' ? { ...o, y: 1.0 } : o)),
      l: [shopWin(0, 4, 0xc9ced2, 1.5)], r: [shopWin(0, 4, 0xc9ced2, 1.5)], b: [backDoor(w / 2 - 1.6)],
      furnish: (kk, _r, a, b) => furnishDiner(kk, a, b, 0) });
    for (const s of ['f', 'l', 'r'] as const)
      face(k, s, w, d, (len) => {
        k.box(0, 0.75, 0.04, len, 0.28, 0.08, red, 'gloss');
        k.box(0, H - 0.75, 0.05, len, 0.2, 0.1, red, 'gloss');
        k.box(0, H - 0.2, 0.12, len + 0.24, 0.2, 0.3, 0xc9ced2, 'chrome');
      });
    face(k, 'f', w, d, () => {
      k.box(0, 0, 0.9, 3.2, 0.5, 1.8, 0x9a968e, 'concrete');
      k.box(0, 0, 2.1, 3.2, 0.25, 0.6, 0x9a968e, 'concrete');
      k.box(0, 3.4, 0.9, 3.6, 0.14, 1.9, red, 'gloss');
      addZone(k, 0, 0.9, 3.2, 1.8, 0.5);
      addZone(k, 0, 2.1, 3.2, 0.6, 0.5, 0);
      put(k, 'newspaper_box_c', 2.4, 0, 0.5, 0);
    });
    signBoard(c, 'diner.roof', 0, H + 1.0, d / 2 - 0.6, 9, 1.4, '#b5322c', [{ text: "DOTTIE'S DINER", font: F_OS, weight: '800', color: '#fff3d6', y: 0.5, size: 0.6, maxW: 0.9 }, { text: 'OPEN 24 HOURS · PIE', font: F_OS, weight: '600', color: '#fff3d6', y: 0.84, size: 0.2, maxW: 0.8 }], { frame: 0xc9ced2, lamps: 4, twoSided: true });
    for (const s of [-1, 1]) k.box(s * 3.6, H, d / 2 - 0.6, 0.12, 0.4, 0.12, DARK, 'metal');
    face(k, 'b', w, d, (len) => {
      services(k, -len / 2 + 1.2, H - 0.6);
      put(k, 'dumpster_green', 3, 0, 1.5, 0);
      put(k, 'trash_bag_a', 4.6, 0, 1.0, 0);
      put(k, 'trash_bag_c', 1.2, 0, 0.9, 2);
    });
  });
}

/** White clapboard church: bell tower over the door, spire, tall side windows, pews facing the pulpit. */
function churchB(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const w = 12;
  const d = 26;
  const wall = 0xf2efe6;
  c.occ.add(x, z, w, d + 4, ry, 1.5, false);
  k.at(x, z, ry, () => {
    const win = (v: number): Op => ({ x: v, w: 1.1, h: 3.0, y: 1.2, kind: 'win', win: { frame: WHITE, head: 'arch', headCol: WHITE, sill: WHITE, my: 2 } });
    const zs = spread(5, d - 6);
    const H = block(c, { w, d, h: 5.2, y0: 0.6, wall, wallMat: 'siding', look: { ...L_WOOD, step: 5 }, roof: 'gableT', pitch: 0.9, roofCol: 0x4a4f57,
      f: [{ x: 0, w: 1.9, h: 2.8, kind: 'door', color: 0x7a3a2a, door: { frame: WHITE } }], l: zs.map(win), r: zs.map(win), b: [],
      furnish: (kk, _r, a, b) => {
        for (let pz = -b + 5.5; pz < b - 3; pz += 1.5)
          for (const s of [-1, 1]) {
            kk.box(s * (a / 2 + 0.3), 0.4, pz, a - 1.2, 0.08, 0.45, 0x7a5a3c);
            kk.box(s * (a / 2 + 0.3), 0, pz - 0.24, a - 1.2, 0.95, 0.07, 0x7a5a3c);
            for (const e of [-1, 1]) kk.box(s * (a / 2 + 0.3) + e * (a / 2 - 0.6), 0, pz - 0.02, 0.07, 0.75, 0.5, 0x6a4c32);
          }
        kk.box(0, 0, -b + 2.0, a * 2 - 0.4, 0.3, 3.6, 0x8a6a48, 'woodFloor');
        kk.box(0, 0.3, -b + 2.6, 0.9, 1.15, 0.6, 0x6a4c32);
        kk.box(0, 0.3, -b + 1.0, 2.4, 0.95, 0.8, WHITE);
        kk.box(0, 2.2, -b + 0.2, 0.18, 2.2, 0.1, 0x6a4c32);
        kk.box(0, 3.5, -b + 0.2, 1.2, 0.18, 0.1, 0x6a4c32);
        kk.box(0, 0.01, 0, 1.6, 0.02, b * 2 - 5, 0x8a2f2a, 'carpet');
      } });
    // tower, belfry and spire
    k.at(0, d / 2 + 1.2, 0, () => {
      k.box(0, 0, 0, 4.4, 0.6, 3.2, 0x8f8c87, 'concrete');
      for (const s of [-1, 1]) k.box(s * 1.9, 0.6, 0, 0.6, H + 3.6, 3.2, wall, 'siding');
      k.box(0, 3.7, 0, 3.2, H - 0.1, 3.2, wall, 'siding');
      k.box(0, H + 3.6, 0, 4.7, 0.3, 3.5, WHITE);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(sx * 1.6, H + 3.9, sz * 1.1, 0.5, 2.2, 0.5, wall, 'siding');
      k.box(0, H + 4.3, 0, 0.9, 1.0, 0.9, 0x6a5a3a, 'metal');
      k.box(0, H + 6.1, 0, 4.7, 0.3, 3.5, WHITE);
      if (!put(k, 'church_spire', 0, H + 6.4, 0, 0, { solid: false, s: 0.85 })) k.roof(0, H + 6.4, 0, 3.4, [[-1.7, 0], [0, 7], [1.7, 0]], 0x4a4f57, 'shingle', {});
      k.box(0, 0, 2.5, 4.4, 0.6, 1.8, 0x9a968e, 'concrete');
      for (let i = 0; i < 3; i++) k.box(0, 0, 3.6 + i * 0.36, 4.4, 0.45 - i * 0.15, 0.4, 0x9a968e, 'concrete');
      addZone(k, 0, 0.9, 3.2, 5.0, 0.6);
      addZone(k, 0, 3.94, 4.4, 1.08, 0.6, 0);
      k.box(0, 0, 4.48 + 2.4, 2.6, 0.07, 4.8, 0xb9b4a8, 'concrete', { cast: false });
      k.solid(-1.9, 0, 0.6, 3.2);
      k.solid(1.9, 0, 0.6, 3.2);
    });
    signBoard(c, 'church.board', -w / 2 - 2.5, 1.3, d / 2 + 4, 2.4, 1.3, '#f4f1e8', [{ text: 'PINE HOLLOW', font: F_OS, weight: '700', color: '#22303a', y: 0.3, size: 0.24, maxW: 0.9 }, { text: 'COMMUNITY CHURCH', font: F_OS, weight: '800', color: '#22303a', y: 0.55, size: 0.26, maxW: 0.92 }, { text: 'SUNDAY 9 & 11 · ALL WELCOME', font: F_OS, weight: '600', color: '#22303a', y: 0.84, size: 0.15, maxW: 0.9 }], { frame: WHITE, twoSided: true });
    for (const s of [-1, 1]) k.box(-w / 2 - 2.5 + s * 1.1, 0, d / 2 + 4, 0.12, 1.4, 0.12, WHITE);
  });
}

/** County sheriff: low tan-brick office with a flag, a radio mast and a fenced yard behind. */
function sheriffB(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const w = 22;
  const d = 14;
  const brown = 0x4a3a2a;
  c.occ.add(x, z, w, d, ry, 1.2, false);
  k.at(x, z, ry, () => {
    const H = block(c, { w, d, wall: 0xffffff, wallMat: 'brickTan', look: L_OFFICE, frame: brown, band: 0.9,
      f: [glassDoor(0, brown, 1.5), ...[-7.5, -4, 4, 7.5].map((v) => sash(v, 1.5, 1.5, 0.95, brown))], l: [sash(0, 1.3, 1.4, 1.0, brown)], b: [backDoor(w / 2 - 1.6), backDoor(-w / 2 + 2)],
      furnish: (kk, r, a, b) => furnishSheriff(kk, r, a, b, 0) });
    face(k, 'f', w, d, (len) => {
      k.box(0, H - 0.95, 0.06, len, 0.16, 0.12, STONE, 'concrete');
      cornice(k, -len / 2, len / 2, H + 0.1, { color: STONE, h: 0.4, proj: 0.25 });
      signBoard(c, 'sheriff.f', 0, H - 0.42, 0.1, 9, 0.62, '#3a2f24', [{ text: 'HOLLOW COUNTY SHERIFF', font: F_OS, weight: '800', color: '#e8c97a', y: 0.56, size: 0.6, maxW: 0.92 }], { frame: brown, lamps: 3 });
      k.box(0, 0, 1.0, 4.5, 0.18, 2.0, 0x9a968e, 'concrete');
      k.box(0, 3.2, 1.0, 4.5, 0.14, 2.0, brown);
      for (const s of [-1, 1]) post(k, s * 2.0, 0.18, 1.8, 3.02, brown, false);
      put(k, 'flagpole_tall', -8.5, 0, 3.5, 0, { solid: 0.3 });
      put(k, 'mailbox_blue', 4, 0, 1.2, 0);
    });
    put(k, 'antenna_tv', w / 2 - 3, H + 0.5, -d / 2 + 3, 0, { solid: false, s: 2.2 });
    face(k, 'b', w, d, (len) => services(k, -len / 2 + 1.2, H - 0.6));
  });
}

/** Stone-fronted bank with a columned porch. */
function bankB(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const w = 16;
  const d = 18;
  const green = 0x2c4a3e;
  c.occ.add(x, z, w, d, ry, 1.2, false);
  k.at(x, z, ry, () => {
    const tall = (v: number): Op => ({ x: v, w: 1.5, h: 2.6, y: 0.9, kind: 'win', win: { frame: green, head: 'lintel', headCol: STONE, sill: STONE, my: 2 } });
    const H = block(c, { w, d, h: 4.4, y0: 0.7, wall: 0xffffff, wallMat: 'brickRed', look: { ...L_OFFICE, wall: 0xe4dcc6, wains: 0x5a4632, floor: 0xb98e62, floorMat: 'woodFloor' }, frame: green, band: 1.2,
      f: [{ x: 0, w: 1.8, h: 2.7, kind: 'door', color: green, door: { glass: true, transom: 0.6, frame: green } }, tall(-5), tall(5)], l: spread(3, d - 5).map(tall), r: spread(3, d - 5).map(tall), b: [backDoor(w / 2 - 1.6)],
      furnish: (kk, r, a, b) => furnishOffice(kk, r, a, b, 0) });
    face(k, 'f', w, d, (len) => {
      k.box(0, 0, 1.5, 9.6, 0.7, 3.0, 0xb9b5aa, 'concrete');
      for (let i = 0; i < 3; i++) k.box(0, 0, 3.2 + i * 0.35, 9.6, 0.5 - i * 0.17, 0.4, 0xb9b5aa, 'concrete');
      for (const v of [-4.1, -1.5, 1.5, 4.1]) if (!put(k, 'column_doric_45', v, 0.7, 2.5, 0, { solid: 0.3 })) k.box(v, 0.7, 2.5, 0.6, 4.5, 0.6, STONE, 'concrete');
      k.box(0, 5.2, 1.5, 10, 0.7, 3.2, STONE, 'concrete');
      k.at(0, 1.5, 0, () => gable(k, 10, 3.2, 5.9, { pitch: 0.3, color: 0x6a6f76, mat: 'roofMetal', turn: true, fill: STONE, fillMat: 'concrete', oh: 0.2, goh: 0.15 }));
      signBoard(c, 'bank.f', 0, 5.55, 3.12, 8.6, 0.5, '#d9cfba', [{ text: 'FIRST CASCADE BANK', font: F_OS, weight: '800', color: '#2c4a3e', y: 0.58, size: 0.62, maxW: 0.94 }], {});
      cornice(k, -len / 2, len / 2, H - 0.3, { color: STONE, h: 0.6, proj: 0.4, dentils: true });
      put(k, 'atm_outdoor', 6.6, 0, 0.5, 0);
      put(k, 'trash_can_street', -6.6, 0, 0.5, 0);
    });
    face(k, 'b', w, d, (len) => services(k, -len / 2 + 1.2, H - 0.6));
  });
}

/** Single-storey motel: a row of rooms behind a covered walk, office at the road end, arrow sign. */
function motelB(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const n = 9;
  const bay = 4.6;
  const w = n * bay + 7;
  const d = 8;
  const teal = 0x2f7f86;
  const doors = [0xb5322c, 0xd9a13a, 0x2f7f86, 0xe07a3a];
  c.occ.add(x, z, w, d + 3, ry, 1.2, false);
  k.at(x, z, ry, () => {
    const x0 = -w / 2 + 7;
    const f: Op[] = [glassDoor(-w / 2 + 2.2, teal), shopWin(-w / 2 + 5, 2.6, teal, 1.6)];
    const b: Op[] = [];
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.5) * bay;
      f.push({ x: cx - 1.2, w: 0.95, h: 2.1, kind: 'door', color: doors[i % 4], door: { frame: WHITE } }, sash(cx + 0.9, 1.6, 1.3, 0.95));
      b.push({ x: cx + 1.2, w: 0.7, h: 0.6, y: 1.6, kind: 'win', win: { frame: WHITE, sill: WHITE } });
    }
    const y0 = 0.18;
    const H = block(c, { w, d, h: 2.8, y0, wall: 0xf1e7cf, wallMat: 'stucco', look: { wall: 0xe9dcc0, floor: 0x7a8a6a, floorMat: 'carpet', lights: 'dome', step: bay }, roof: 'gable', pitch: 0.35, roofCol: 0x8a4a3a, f, b });
    room(k, y0, () => {
      for (let i = 0; i <= n; i++) partition(k, x0 + i * bay, -d / 2 + 0.3, x0 + i * bay, d / 2 - 0.3, 0, 2.8, { wall: 0xe9dcc0, floor: 0 });
      for (let i = 0; i < n; i++) {
        const cx = x0 + (i + 0.5) * bay;
        item(k, 'bed_double', cx + 0.7, -d / 2 + 2.6, Math.PI / 2);
        item(k, 'nightstand', cx - 1.2, -d / 2 + 1.0, 0);
        item(k, 'dresser', cx - 1.7, 0.6, Math.PI / 2);
        item(k, 'armchair', cx + 1.4, d / 2 - 1.3, Math.PI);
      }
      item(k, 'vanity_desk', -w / 2 + 3.4, -1, 0);
      item(k, 'sofa_2', -w / 2 + 1.2, 0.5, Math.PI / 2);
    });
    face(k, 'f', w, d, (len) => {
      k.box(0, 0, 1.3, len, 0.16, 2.6, 0xa9a59c, 'concrete');
      k.box(0, H - 0.05, 1.35, len + 0.6, 0.14, 2.8, 0x8a4a3a, 'shingle');
      k.box(0, H - 0.25, 2.6, len + 0.6, 0.22, 0.14, WHITE);
      for (let px = -len / 2 + 0.3; px <= len / 2; px += bay) post(k, px, 0.16, 2.5, H - 0.4, WHITE, false);
      for (let i = 0; i < n; i++) {
        const cx = x0 + (i + 0.5) * bay;
        if (i % 2 === 0) put(k, 'dining_chair', cx + 0.4, 0.16, 0.7, rng.range(-0.4, 0.4), { solid: false });
        if (i % 3 === 1) put(k, 'ac_unit_window', cx - 0.9, 0.7, 0.05, 0, { solid: false });
      }
      put(k, 'vending_soda', -len / 2 + 6.95, 0.16, 0.5, 0);
      signBoard(c, 'motel.office', -len / 2 + 3.5, H - 0.45, 0.1, 3, 0.5, '#2f7f86', [{ text: 'OFFICE', font: F_OS, weight: '800', color: '#fdf3e3', y: 0.58, size: 0.62, maxW: 0.8 }], { lamps: 1 });
    });
    faceSign(c, 'motel.sign', 'motel_arrow_sign', -w / 2 + 2, d / 2 + 9, 0, '#2f7f86', '#fdf3e3', ['PINE REST|MOTEL', 'VACANCY']);
  });
}

/** Supermarket: long glazed front under a deep fascia, billboard on the roof, carts and crates outside. */
function groceryB(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const w = 28;
  const d = 20;
  const green = 0x2f6b3f;
  c.occ.add(x, z, w, d, ry, 1.2, false);
  k.at(x, z, ry, () => {
    const H = block(c, { w, d, h: 4.0, wall: 0xffffff, wallMat: 'brickPaint', look: { ...L_STORE, wall: 0xf1ead8, wains: green }, frame: green, band: 1.5, gear: 6,
      f: [glassDoor(-1.0, green, 1.5), glassDoor(1.0, green, 1.5), shopWin(-8, 10.5, green), shopWin(8, 10.5, green)], b: [backDoor(w / 2 - 1.6), { x: -6, w: 3.4, h: 3.2, kind: 'garage', color: 0xb9bdc0 }],
      furnish: (kk, r, a, b) => furnishStore(kk, r, a, b, 0, true) });
    face(k, 'f', w, d, (len) => {
      k.box(0, H - 1.7, 0.9, len + 0.4, 1.5, 1.8, green, 'gloss');
      k.box(0, H - 1.82, 0.9, len + 0.4, 0.12, 1.8, WHITE);
      for (const v of spread(5, len - 1)) post(k, v, 0.16, 1.6, H - 2.0, WHITE, false);
      k.box(0, 0, 1.0, len + 0.4, 0.16, 2.2, 0xa9a59c, 'concrete');
      signBoard(c, 'grocery.f', 0, H - 0.95, 1.82, 13, 1.1, '#2f6b3f', [{ text: 'HOLLOW FOODS MARKET', font: F_OS, weight: '800', color: '#fbe9b0', y: 0.48, size: 0.56, maxW: 0.94 }, { text: 'FRESH PRODUCE · MEAT · DAIRY · VIDEO', font: F_OS, weight: '600', color: '#fbe9b0', y: 0.84, size: 0.18, maxW: 0.9 }], { lamps: 5 });
      put(k, 'vending_soda', -12.6, 0.16, 0.5, 0);
      put(k, 'ice_freezer', -10.9, 0.16, 0.55, 0);
      put(k, 'newspaper_box_a', 4.2, 0.16, 0.45, 0);
      put(k, 'newspaper_box_b', 4.9, 0.16, 0.45, 0);
      put(k, 'trash_can_street', 3.2, 0.16, 0.5, 0);
      put(k, 'cardboard_box_stack', 11.6, 0.16, 0.6, 0.2);
      put(k, 'phone_booth', 13.0, 0.16, 0.7, 0);
    });
    faceSign(c, 'grocery.bb', 'roof_billboard', 6, d / 2 - 5, 0, '#f3e6b8', '#a3262e', ['THIS WEEK|T-BONE $2.49 LB'], H + 0.5);
    face(k, 'b', w, d, (len) => {
      services(k, -len / 2 + 1.2, H - 0.6);
      if (!put(k, 'loading_dock', 6, 0, 0, 0)) k.box(6, 0, 1.3, 4, 1.2, 2.6, 0x9a968e, 'concrete');
      put(k, 'dumpster_green', -3, 0, 1.6, 0);
      put(k, 'dumpster_blue_open', -5.4, 0, 1.6, 0);
      for (let i = 0; i < 5; i++) put(k, rng.pick(['cardboard_box_closed', 'cardboard_box_open', 'cardboard_box_flat', 'trash_bag_a', 'trash_bag_c']), rng.range(-10, 0), 0, rng.range(0.6, 3), rng.range(0, 6), { solid: false });
    });
  });
}

const mk = (id: string, name: string, w: number, d: number, tags: string[], fn: (c: Ctx, x: number, z: number, ry: number) => void): BuildingDef => ({ id, name, w, d, tags, build: fn });

/** One-off buildings of the town. Names are our own. */
export const LANDMARKS: BuildingDef[] = [
  mk('gas', 'Timberline Gas', 42, 36, ['highway'], gas),
  mk('donut', 'Hole Lotta Donuts', 14, 11, ['highway', 'cafe'], donut),
  mk('diner', "Dottie's Diner", 22, 9, ['highway', 'cafe'], dinerB),
  mk('church', 'Pine Hollow Community Church', 12, 30, ['civic'], churchB),
  mk('sheriff', 'Hollow County Sheriff', 22, 14, ['civic'], sheriffB),
  mk('bank', 'First Cascade Bank', 16, 22, ['main', 'office'], bankB),
  mk('motel', 'Pine Rest Motel', 49, 11, ['highway'], motelB),
  mk('grocery', 'Hollow Foods Market', 28, 22, ['main', 'store'], groceryB),
];

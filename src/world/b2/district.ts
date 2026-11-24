import type { Col } from '../core/kit';
import type { Ctx } from '../buildings/common';
import type { BuildingDef } from '../buildings/catalog';
import { room, addZone, furnishCourt, furnishOffice, furnishCafe, furnishStore } from '../buildings/interiors';
import { face, cornice, signBoard, WHITE, STONE, DARK, F_OS } from './kit2';
import { hull, upper, spread, put, partition, warm, type Look, type Op } from './hull';
import { parapetRoof, roofGear, gable, services, steps, post } from './parts';
import { column, pediment, clock } from './civic';
import { block, glassDoor, shopWin, sash, backDoor, lot, L_CAFE, L_OFFICE, L_STORE, L_WOOD } from './landmarks';
import { lumberStack } from '../props';

type Kit = Ctx['kit'];
const PI = Math.PI;
const BARN_RED = 0x8f2f25;
const L_BARN: Look = { wall: 0x8a6a48, floor: 0x8a7a5e, floorMat: 'gravel', lights: 'none' };
const L_SHOP: Look = { wall: 0xb9bcc0, floor: 0x8f8c87, floorMat: 'concrete', lights: 'bulb', step: 6 };
const L_COURT: Look = { wall: 0xe6dfcb, wains: 0x5f4630, wainsH: 1.2, floor: 0xa87c52, floorMat: 'woodFloor', lights: 'dome', step: 4.4 };

/** Rectangular hay bale stack. */
function bales(k: Kit, x: number, y: number, z: number, nx: number, ny: number, nz = 1) {
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let l = 0; l < nz; l++) {
    if (j === ny - 1 && (i + l) % 3 === 2) continue;
    k.box(x + (i - (nx - 1) / 2) * 1.12 + (j % 2) * 0.12, y + j * 0.47, z + l * 0.56, 1.08, 0.45, 0.52, (i + j + l) % 2 ? 0xd2b660 : 0xc9aa52, 'field');
  }
}

/** Round hay bale lying on its side. */
function roundBale(k: Kit, x: number, z: number, ry = 0) {
  k.cyl(x, 0.75, z, 0.75, 0.75, 1.3, 14, 0xcdb05a, 'field', { rx: PI / 2, ry });
}

/** Gambrel-roofed timber barn with sliding doors, hay loft, lean-to and a cupola; open inside with stalls. */
function barn(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 12;
  const D = 18;
  const h = 4.4;
  c.occ.add(x, z, W + 5, D, ry, 0.5, false);
  k.at(x, z, ry, () => {
    const wo = { frame: WHITE, mx: 2, my: 2, sill: WHITE } as const;
    const sideW: Op[] = spread(4, D - 4).map((sx) => ({ x: sx, w: 0.9, h: 0.9, y: 1.5, kind: 'win' as const, win: wo }));
    hull(k, { w: W, d: D, y0: 0.06, h, t: 0.25, wall: BARN_RED, wallMat: 'boards', look: L_BARN, frame: WHITE, noCeil: true, base: null,
      f: [{ x: 0, w: 3.6, h: 3.5, kind: 'gap' }], b: [{ x: 0, w: 3.0, h: 3.2, kind: 'gap' }], l: sideW, r: sideW });
    // stone footing and white corner boards
    k.box(0, 0, 0, W + 0.16, 0.5, D + 0.16, 0x9a958c, 'stone');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(sx * (W / 2 + 0.02), 0.5, sz * (D / 2 + 0.02), 0.22, h - 0.4, 0.22, WHITE);
    const y = 0.06 + h;
    const prof: [number, number][] = [[-W / 2, 0], [-W * 0.31, W * 0.3], [0, W * 0.44], [W * 0.31, W * 0.3], [W / 2, 0]];
    k.at(0, 0, PI / 2, () => k.roof(0, y, 0, D, prof, 0x5a5f66, 'roofMetal', { eaveOH: 0.5, gableOH: 0.7, trim: WHITE, fill: BARN_RED, fillMat: 'boards', ridge: 0x5a5f66 }));
    for (const s of ['f', 'b'] as const)
      face(k, s, W, D, () => {
        // sliding doors parked open either side, track, loft door with X brace and hoist beam
        const dw = s === 'f' ? 1.8 : 1.5;
        const dh = s === 'f' ? 3.5 : 3.2;
        k.box(0, dh + 0.12, 0.1, dw * 4 + 0.6, 0.1, 0.1, DARK, 'metal');
        for (const e of [-1, 1]) {
          const cx = e * (dw * 1.5 + 0.1);
          k.box(cx, 0.1, 0.1, dw, dh, 0.07, BARN_RED, 'boards');
          for (const [bx, by, bw, bh] of [[0, dh - 0.1, dw, 0.16], [0, 0.1, dw, 0.16], [0, dh / 2, dw, 0.14], [-dw / 2 + 0.08, 0.1, 0.16, dh], [dw / 2 - 0.08, 0.1, 0.16, dh]] as const)
            k.box(cx + bx, bw === dw ? by : 0.1, 0.15, bw, bw === dw ? bh : dh, 0.03, WHITE);
          const dl = Math.hypot(dw - 0.3, dh / 2 - 0.3);
          const an = Math.atan2(dh / 2 - 0.3, dw - 0.3);
          for (const [yy, sg] of [[dh * 0.25, 1], [dh * 0.25, -1], [dh * 0.75, 1], [dh * 0.75, -1]] as const) k.box(cx, yy + 0.02, 0.15, dl, 0.12, 0.025, WHITE, 'paint', { rz: sg * an });
        }
        k.box(0, y + 0.5, 0.05, 1.7, 1.9, 0.06, BARN_RED, 'boards');
        for (const [bx, bw, by, bh] of [[0, 1.9, y + 0.4, 0.14], [0, 1.9, y + 2.36, 0.14], [-0.9, 0.14, y + 0.4, 2.1], [0.9, 0.14, y + 0.4, 2.1]] as const) k.box(bx, by, 0.09, bw, bh, 0.04, WHITE);
        for (const sg of [-1, 1]) k.box(0, y + 1.4, 0.09, 2.5, 0.12, 0.03, WHITE, 'paint', { rz: sg * 0.84 });
        k.box(0, y + W * 0.44 - 0.75, 0.55, 0.16, 0.16, 1.4, 0x5a4632);
        if (s === 'f') k.box(0, 0, 1.2, 4.4, 0.07, 2.4, 0x9a958a, 'gravel', { cast: false });
      });
    if (!put(k, 'cupola_barn', 0, y + W * 0.44 - 0.1, 0)) {
      k.box(0, y + W * 0.44 - 0.3, 0, 1.5, 1.5, 1.5, WHITE);
      k.cone(0, y + W * 0.44 + 1.2, 0, 1.3, 1.1, 4, 0x5a5f66, 'roofMetal', { ry: PI / 4 });
    }
    put(k, 'weather_vane', 0, y + W * 0.44 + 2.75, 0);
    // lean-to machinery shed on the left
    k.at(-W / 2 - 2.4, 0, 0, () => {
      for (const pz of spread(4, D - 1)) k.box(-2.2, 0, pz, 0.2, 2.6, 0.2, 0x6a5038);
      k.box(-2.2, 2.6, 0, 0.2, 0.2, D - 0.6, 0x6a5038);
      k.at(0, 0, PI / 2, () => k.roof(0, 2.75, 0, D - 0.4, [[2.5, 0], [-2.4, 1.3]], 0x6b7076, 'corrugated', { eaveOH: 0.3, gableOH: 0.2 }));
      k.box(0, 0, 0, 4.6, 0.05, D - 0.6, 0x8a7a5e, 'gravel', { cast: false });
      bales(k, 0.6, 0.05, -D / 2 + 2.2, 3, 4, 3);
      put(k, 'tyre_stack', -1, 0.05, D / 2 - 1.6, 0.4);
      for (let i = 0; i < 3; i++) k.cyl(-1.2 + i * 0.75, 0.05, 2.2 + (i % 2) * 0.5, 0.29, 0.29, 0.88, 12, i === 1 ? 0x3f6f9a : 0x9a3b2a, 'metal');
      k.solid(0.6, -D / 2 + 2.4, 3.4, 2.4, 0, 2);
    });
    room(k, 0.06, () => {
      // stalls down the right, hay stacked at the back left, loft floor over the rear half
      for (let i = 0; i < 4; i++) {
        const sz = -D / 2 + 2.4 + i * 3;
        k.box(W / 2 - 1.9, 0, sz + 1.5, 3.2, 1.35, 0.1, 0x7a5a3c, 'boards');
        k.box(W / 2 - 3.5, 0, sz, 0.1, 1.35, 1.9, 0x7a5a3c, 'boards');
        k.box(W / 2 - 3.5, 0, sz + 1.5, 0.16, 2.6, 0.16, 0x6a5038);
        k.box(W / 2 - 1.9, 0, sz, 2.6, 0.06, 2.6, 0xc9aa52, 'field', { cast: false });
        k.solid(W / 2 - 1.9, sz + 1.5, 3.2, 0.15, 0, 1.4);
      }
      bales(k, -W / 2 + 2.2, 0, -D / 2 + 1.2, 3, 5, 4);
      k.solid(-W / 2 + 2.2, -D / 2 + 2, 3.4, 2.6, 0, 2.4);
      k.box(0, 2.9, -D / 4, W - 0.6, 0.14, D / 2 - 0.4, 0x8a6a48, 'planks');
      for (const sx of [-1, 1]) for (const pz of [-0.5, -D / 4, -D / 2 + 0.6]) k.box(sx * 2.2, 0, pz, 0.2, 2.9, 0.2, 0x6a5038);
      bales(k, 0, 3.04, -D / 2 + 1.2, 6, 3, 3);
      // ladder to the loft, feed sacks, pitchfork
      for (const sx of [-0.25, 0.25]) k.box(-2.4 + sx, 0, -0.3, 0.06, 3.2, 0.06, 0x6a5038, 'paint', { rx: -0.12 });
      for (let i = 1; i < 9; i++) k.box(-2.4, i * 0.34, -0.3 - i * 0.04, 0.5, 0.04, 0.05, 0x6a5038);
      for (let i = 0; i < 5; i++) k.box(-W / 2 + 0.9, (i % 3) * 0.2, 3 + Math.floor(i / 3) * 0.9, 0.8, 0.2, 0.5, 0xd9cfb4, 'paint', { ry: rng.range(-0.2, 0.2) });
      k.box(-W / 2 + 0.5, 0, 6.2, 0.04, 1.6, 0.04, 0x8a6a48, 'paint', { rz: 0.12 });
      for (const tz of [-4, 4]) for (const tx of [-W / 2 + 0.3, W / 2 - 0.3]) k.box(tx, h - 0.3, tz, 0.18, 0.18, 0.18, 0x6a5038);
      for (const tz of spread(4, D - 3)) k.box(0, h - 0.1, tz, W - 0.5, 0.2, 0.2, 0x6a5038);
    });
  });
}

/** Open-fronted pole shed for farm machinery. */
function machineShed(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 16;
  const D = 8;
  c.occ.add(x, z, W, D, ry, 0.5, false);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, W, 0.06, D, 0x8a7a5e, 'gravel', { cast: false });
    const col = 0xdde3e8;
    k.box(0, 0, -D / 2 + 0.06, W, 3.3, 0.12, col, 'corrugated');
    for (const s of [-1, 1]) k.box(s * (W / 2 - 0.06), 0, 0, 0.12, 3.6, D, col, 'corrugated');
    k.solid(0, -D / 2, W, 0.3);
    for (const s of [-1, 1]) k.solid(s * W / 2, 0, 0.3, D);
    for (const px of spread(5, W)) {
      k.box(px, 0, D / 2 - 0.1, 0.22, 3.9, 0.22, 0x6a5038);
      k.box(px, 0, -D / 2 + 0.2, 0.2, 3.3, 0.2, 0x6a5038);
      k.beam({ x: px, y: 3.95, z: D / 2 }, { x: px, y: 3.3, z: -D / 2 }, 0.14, 0.22, 0x6a5038);
    }
    k.box(0, 3.72, D / 2 - 0.1, W, 0.24, 0.18, 0x6a5038);
    k.roof(0, 3.4, 0, W, [[D / 2 + 0.2, 0.75], [-D / 2 - 0.2, 0]], 0x8a9096, 'corrugated', { eaveOH: 0.5, gableOH: 0.4 });
    // contents: implements, drums, workbench, tyres
    k.at(-5.5, -1.6, 0, () => {
      k.box(0, 0, 0, 2.6, 0.9, 0.7, 0x6a5038, 'planks');
      k.box(0, 0.9, 0, 2.8, 0.06, 0.8, 0x4a3b2a);
      k.box(-0.6, 0.96, 0, 0.5, 0.25, 0.3, 0xb3261e, 'gloss');
      k.box(0, 1.5, -0.4, 2.4, 1.0, 0.04, 0x8a6a48, 'planks');
    });
    for (let i = 0; i < 4; i++) k.cyl(-1.5 + i * 0.7, 0.06, -D / 2 + 0.7, 0.29, 0.29, 0.88, 12, rng.pick([0x3f6f9a, 0x9a3b2a, 0x2f6b3f, 0xc9ccd0]), 'metal');
    put(k, 'tyre_stack', 6.6, 0.06, -2.6, 0.3);
    put(k, 'tyre', 5.8, 0.06, -1.6, 1);
    // disc harrow
    k.at(3.4, -1.2, 0.2, () => {
      k.box(0, 0.7, 0, 3.4, 0.12, 0.12, 0xb3261e, 'metal');
      k.box(0, 0.7, 1.1, 0.12, 0.12, 2.2, 0xb3261e, 'metal');
      for (let i = 0; i < 9; i++) k.cyl(-1.5 + i * 0.37, 0.45, 0, 0.42, 0.42, 0.03, 12, 0x8a8d90, 'metal', { rz: PI / 2 });
    });
    bales(k, 6, 0.06, 1.4, 2, 3, 2);
  });
}

/** Wall-mounted name board in block capitals. */
function nameBoard(c: Ctx, key: string, text: string, y: number, w: number, bg = '#e9e4d6', ink = '#2a2623', h = 0.9) {
  signBoard(c, key, 0, y, 0.1, w, h, bg, [{ text, font: F_OS, weight: '800', color: ink, y: 0.56, size: 0.58, maxW: 0.92 }], { frame: DARK });
}

/** Pallet with a load of boxes or sacks. */
function pallet(k: Kit, rng: Rng0, x: number, y: number, z: number, load = true) {
  k.at(x, z, rng.range(-0.15, 0.15), () => {
    for (const pz of [-0.5, 0, 0.5]) k.box(0, y, pz, 1.2, 0.1, 0.1, 0xb08a5a, 'planks');
    for (let i = 0; i < 5; i++) k.box(-0.5 + i * 0.25, y + 0.1, 0, 0.18, 0.03, 1.1, 0xc09a66, 'planks');
    if (!load) return;
    const kind = rng.pick([0, 1, 2]);
    if (kind === 0) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) k.box(-0.3 + j * 0.6, y + 0.13 + i * 0.4, 0, 0.56, 0.4, 1.0, i % 2 ? 0xb99a6c : 0xc4a67a);
    else if (kind === 1) for (let i = 0; i < 4; i++) k.box((i % 2) * 0.08, y + 0.13 + i * 0.2, 0, 1.0, 0.2, 0.9, 0xd9cfb4);
    else for (const [bx, bz] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.3], [0.3, 0.3]]) k.cyl(bx, y + 0.13, bz, 0.27, 0.27, 0.85, 10, rng.pick([0x3f6f9a, 0x9a3b2a, 0x2f6b3f]), 'metal');
    k.solid(0, 0, 1.2, 1.1, 0, 1.2);
  });
}
type Rng0 = Ctx['rng'];

/** Corrugated freight warehouse: raised dock with roller doors along the front, office in the corner. */
function warehouse(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 30;
  const D = 16;
  const col = rng.pick<Col>([0xdfe8ee, 0xefe6d2, 0xd3e6da, 0xeedccb]);
  c.occ.add(x, z, W + 2, D + 8, ry, 0.5, false);
  k.at(x, z, ry, () => {
    lot(k, W + 6, 10, 0x6f6f72, 'asphalt', D / 2 + 5);
    const H = block(c, { w: W, d: D, h: 5.6, y0: 1.2, wall: col, wallMat: 'corrugated', look: L_SHOP, roof: 'gable', roofMat: 'roofMetal', roofCol: 0x6f7880, pitch: 0.28, frame: 0x5f666b,
      f: [...[-10, -4, 2].map((dx) => ({ x: dx, w: 3.2, h: 3.4, kind: 'garage' as const, color: 0xd9dde0 })), { x: 11.5, w: 1.0, h: 2.1, kind: 'door', color: 0x5f666b }, sash(8.6, 1.4, 1.1, 1.1, 0x5f666b)],
      b: [backDoor(-W / 2 + 2)], l: [sash(0, 2, 1, 3.2, 0x5f666b)], r: [sash(0, 2, 1, 3.2, 0x5f666b)],
      furnish: (kk, r, a, b) => {
        // racking down the back wall, pallets on the floor, office partition in the right corner
        for (const rx of spread(5, a * 2 - 4)) {
          for (const e of [-1, 1]) for (const zz of [-b + 0.3, -b + 1.3]) kk.box(rx + e * 1.25, 0, zz, 0.08, 4.2, 0.08, 0x2f5d8a, 'metal');
          for (const sy of [0.15, 1.5, 2.85]) {
            kk.box(rx, sy, -b + 0.8, 2.6, 0.08, 1.1, 0xd9812a, 'metal');
            if (r.chance(0.8)) kk.box(rx + r.range(-0.4, 0.4), sy + 0.08, -b + 0.8, r.range(0.9, 1.6), r.range(0.5, 1.0), 0.9, r.pick([0xb99a6c, 0xc4a67a, 0xa98a5c]));
          }
          kk.solid(rx, -b + 0.8, 2.6, 1.1, 0, 4.2);
        }
        for (let i = 0; i < 7; i++) pallet(kk, r, -a + 2 + r.range(0, a * 1.3), 0, r.range(-b + 3.4, b - 2.2));
        // forklift
        kk.at(-2, 2.5, 0.6, () => {
          kk.box(0, 0.25, 0, 1.1, 0.7, 1.9, 0xe0a81c, 'gloss');
          kk.box(0, 0.95, -0.35, 1.0, 0.5, 0.9, 0x2a2a2c);
          for (const sx of [-0.45, 0.45]) kk.box(sx, 0.95, 0.35, 0.06, 1.3, 0.06, 0x2a2a2c, 'metal');
          kk.box(0, 2.25, 0, 1.0, 0.05, 1.3, 0x2a2a2c, 'metal');
          for (const sx of [-0.3, 0.3]) {
            kk.box(sx, 0.1, 1.05, 0.08, 2.4, 0.1, 0x3a3a3c, 'metal');
            kk.box(sx, 0.12, 1.65, 0.1, 0.05, 1.1, 0x3a3a3c, 'metal');
          }
          for (const sx of [-0.55, 0.55]) for (const sz of [-0.6, 0.6]) kk.cyl(sx, 0.28, sz, 0.28, 0.28, 0.2, 10, 0x1b1b1b, 'rubber', { rz: PI / 2 });
          kk.solid(0, 0, 1.2, 2.4, 0, 2);
        });
      } });
    face(k, 'f', W, D, (len) => {
      // dock apron with bumpers, steps and a canopy over the doors
      k.box(-4, 0, 1.2, 20, 1.2, 2.4, 0x9a968e, 'concrete');
      k.solid(-4, 1.2, 20, 2.4, 0, 1.2);
      for (const dx of [-10, -4, 2]) for (const e of [-1, 1]) k.box(dx + e * 1.2, 0.7, 2.45, 0.3, 0.4, 0.1, 0x1b1b1b, 'rubber');
      addZone(k, 11.5, 1.15, 2.2, 2.4, 1.2);
      steps(k, 11.5, 2.3 + 7 * 0.3, 1.6, 1.2, { color: 0x9a968e, rail: 0xd9b323 });
      k.box(11.5, 0, 1.15, 2.2, 1.2, 2.3, 0x9a968e, 'concrete');
      k.box(-4, 5.3, 1.4, 20.4, 0.14, 2.8, 0x6f7880, 'corrugated');
      for (const dx of [-13.5, -7, -1, 5.5]) k.beam({ x: dx, y: 6.4, z: 0.05 }, { x: dx, y: 5.4, z: 2.6 }, 0.05, 0.05, 0x5f666b, 'metal');
      nameBoard(c, 'wh.name', 'CASCADE FREIGHT & STORAGE', H - 0.9, 12);
      for (const [dx, n] of [[-10, '1'], [-4, '2'], [2, '3']] as const) signBoard(c, `wh.bay${n}`, dx, 5.0, 0.1, 0.7, 0.7, '#d9b323', [{ text: n, font: F_OS, weight: '800', color: '#1b1b1b', y: 0.56, size: 0.8 }], { frame: DARK });
      pallet(k, rng, -7, 1.2, 1.3);
      pallet(k, rng, 0.6, 1.2, 1.2, false);
      put(k, 'dumpster_blue_open', 14.2, 0, 3.2, PI / 2);
    });
    face(k, 'b', W, D, (len) => {
      services(k, -len / 2 + 1.4, H - 0.8);
      for (let i = 0; i < 4; i++) pallet(k, rng, -6 + i * 1.6, i === 1 ? 0.14 : 0, 1.2, false);
      put(k, 'tyre_stack', 6, 0, 0.8, 0);
    });
    for (const vx of [-9, 0, 9]) put(k, 'roof_vent_turbine', vx, H + D / 2 * 0.28 - 0.1, 0);
  });
}

/** Brick cannery: three-bay works with monitor roof, tall chimney, water tank and a loading bay. */
function factory(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 40;
  const D = 20;
  const h = 7;
  c.occ.add(x, z, W + 2, D + 2, ry, 0.5, false);
  k.at(x, z, ry, () => {
    const wo = { frame: 0x3d4a45, mx: 4, my: 5, head: 'lintel', headCol: STONE, sill: STONE } as const;
    const bigs = (n: number, span: number): Op[] => spread(n, span).map((wx) => ({ x: wx, w: 2.6, h: 3.6, y: 1.5, kind: 'win' as const, win: wo }));
    const H = block(c, { w: W, d: D, h, y0: 0.2, wall: 0xffffff, wallMat: 'brickBrown', look: L_SHOP, band: 0.9, gear: 6, frame: 0x3d4a45,
      f: [{ x: -15, w: 3.6, h: 3.8, kind: 'garage', color: 0x7f8a86 }, { x: -9.6, w: 1.2, h: 2.3, kind: 'door', color: 0x3d4a45, door: { transom: 0.5 } }, ...bigs(5, 22).map((o) => ({ ...o, x: o.x + 5 }))],
      b: [backDoor(14), ...bigs(7, 34)], l: bigs(3, 14), r: bigs(3, 14),
      furnish: (kk, r, a, b) => {
        // canning line: conveyor, retort kettles, crates and tanks
        kk.box(2, 0.8, 2, 22, 0.12, 0.9, 0x8a8d90, 'metal');
        for (const lx of spread(8, 21)) kk.box(2 + lx, 0, 2, 0.1, 0.8, 0.8, 0x5f666b, 'metal');
        for (let i = 0; i < 14; i++) kk.cyl(-8 + i * 1.5 + r.range(-0.2, 0.2), 0.92, 2, 0.09, 0.09, 0.22, 8, 0xc9ccd0, 'metal');
        kk.solid(2, 2, 22, 0.9, 0, 1);
        for (const tx of [-4, 1, 6, 11]) {
          kk.cyl(tx, 0.5, -b + 2.4, 1.1, 1.1, 2.4, 14, 0xb9bcc0, 'metal');
          kk.sphere(tx, 2.9, -b + 2.4, 1.1, 0xb9bcc0, 'metal', 14, 6);
          for (const e of [-0.8, 0.8]) kk.box(tx + e, 0, -b + 2.4, 0.12, 0.6, 0.12, 0x5f666b, 'metal');
          kk.cyl(tx, 3.9, -b + 2.4, 0.12, 0.12, 2.6, 8, 0x8a8d90, 'metal');
          kk.solid(tx, -b + 2.4, 2.2, 2.2, 0, 3);
        }
        kk.box(3.5, 6.2, -b + 2.4, 17, 0.24, 0.24, 0x8a8d90, 'metal');
        for (let i = 0; i < 9; i++) pallet(kk, r, -a + 1.6 + (i % 3) * 1.7, 0, b - 1.4 - Math.floor(i / 3) * 1.6);
        for (let i = 0; i < 6; i++) pallet(kk, r, a - 2 - (i % 2) * 1.7, 0, -1 + Math.floor(i / 2) * 1.8);
        // foreman's office
        partition(kk, a - 6, b - 5, a, b - 5, 0.2, 3, L_OFFICE, [{ at: 2.5, w: 1 }]);
        partition(kk, a - 6, b - 5, a - 6, b, 0.2, 3, L_OFFICE);
        kk.box(a - 3, 3.2, b - 2.5, 6, 0.1, 5, 0xe9e4d6);
        kk.at(a - 3, b - 2.6, 0, () => furnishOffice(kk, r, 2.8, 2.2, 0));
      } });
    // roof monitor (clerestory) running the length of the works
    k.box(0, H, 0, W - 8, 1.5, 6, 0xffffff, 'brickBrown');
    for (const s of [-1, 1]) for (const wx of spread(10, W - 12)) k.box(wx, H + 0.3, s * 3.02, 2.4, 0.9, 0.06, 0x9fb6bd, 'glass');
    k.roof(0, H + 1.5, 0, W - 8, [[3, 0], [0, 0.9], [-3, 0]], 0x5a6268, 'roofMetal', { eaveOH: 0.4, gableOH: 0.3, fill: 0xffffff, fillMat: 'brickBrown' });
    // chimney stack on the left rear corner, water tank on the right
    k.at(-W / 2 + 3, -D / 2 - 2.2, 0, () => {
      k.box(0, 0, 0, 3.4, 3, 3.4, 0xffffff, 'brickBrown');
      k.cyl(0, 3, 0, 1.0, 1.5, 19, 16, 0xffffff, 'brickBrown');
      k.cyl(0, 22, 0, 1.15, 1.15, 0.5, 16, 0xffffff, 'brickDark');
      for (const by of [8, 14, 19]) k.cyl(0, by, 0, 1.36 - by * 0.012, 1.38 - by * 0.012, 0.16, 16, 0x3a3a3c, 'metal');
      k.solid(0, 0, 3.4, 3.4);
    });
    if (!put(k, 'water_tank_roof', W / 2 - 5, H, -4)) k.cyl(W / 2 - 5, H + 2, -4, 1.6, 1.6, 3, 12, 0x7a5a3c, 'planks');
    for (const ex of [-6, 4]) put(k, 'exhaust_stack', ex, H, 6.5);
    face(k, 'f', W, D, (len) => {
      cornice(k, -len / 2, len / 2, H + 0.9 - 0.25, { h: 0.5, proj: 0.3, color: STONE });
      k.box(0, 0.2 + h - 0.1, 0.06, len, 0.3, 0.12, STONE, 'concrete');
      for (const px of [-19.6, -12.2, -7.9, -3.25, 2.25, 7.75, 13.25, 19.6]) {
        k.box(px, 0.2, 0.08, 0.7, 5.3, 0.16, 0xffffff, 'brickBrown');
        k.box(px, 5.5, 0.08, 0.9, 0.2, 0.2, STONE, 'concrete');
      }
      // faded painted sign on the brick
      signBoard(c, 'factory.name', 5, 0.2 + h - 1.05, 0.1, 20, 1.3, '#d8cfb8', [{ text: 'PINE HOLLOW CANNING CO.', font: F_OS, weight: '800', color: '#5a4a3c', y: 0.56, size: 0.62, maxW: 0.94, letter: 4 }], { frame: undefined });
      k.box(-15, 0, 2.2, 6, 0.2, 4.4, 0x9a968e, 'concrete');
      pallet(k, rng, -11.6, 0, 1.4);
      pallet(k, rng, -11.4, 0, 2.9, false);
      put(k, 'dumpster_green', 17, 0, 1.6, 0);
      for (let i = 0; i < 4; i++) k.cyl(12 + i * 0.66, 0, 0.6 + (i % 2) * 0.3, 0.29, 0.29, 0.88, 12, i % 2 ? 0x3f6f9a : 0x8a8d90, 'metal');
    });
    face(k, 'b', W, D, (len) => {
      services(k, len / 2 - 1.4, H - 1);
      put(k, 'fire_escape_ladder', 6, 0, 0.02, 0);
      for (let i = 0; i < 5; i++) pallet(k, rng, -4 + i * 1.5, i % 2 ? 0.14 : 0, 1.4, i === 2);
    });
  });
}

/** Log lying on the ground (or on a stack) along local X. */
function log(k: Kit, x: number, y: number, z: number, len: number, r: number) {
  k.cyl(x, y + r, z, r, r * 0.92, len, 9, 0x6a4e36, 'planks', { rz: PI / 2 });
  for (const e of [-1, 1]) k.cyl(x + e * (len / 2 + 0.005), y + r, z, r * 0.9, r * 0.9, 0.01, 9, 0xd2a46a, 'paint', { rz: PI / 2 });
}

/** Pyramid of logs between stakes. */
function logDeck(k: Kit, x: number, z: number, ry: number, n = 5, len = 6) {
  k.at(x, z, ry, () => {
    for (let row = 0; row < n; row++) for (let i = 0; i < n - row; i++) log(k, (row % 2) * 0.2, row * 0.56, (i - (n - row - 1) / 2) * 0.66, len, 0.32);
    for (const e of [-1, 1]) for (const s of [-1, 1]) k.box(e * (len / 2 - 0.8), 0, s * (n * 0.33 + 0.1), 0.14, 1.5, 0.14, 0x5a4632);
    k.solid(0, 0, len, n * 0.66 + 0.3, 0, n * 0.5);
  });
}

/** Sawmill: open pole shed over the head saw and log carriage, log deck, sawdust pile and burner. */
function sawmill(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 26;
  const D = 11;
  c.occ.add(x, z, W + 12, D + 6, ry, 0.5, false);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, W + 10, 0.05, D + 8, 0x8f8672, 'gravel', { cast: false });
    k.box(0, 0.05, 0, W, 0.12, D, 0x9a968e, 'concrete', { cast: false });
    const posts = spread(6, W - 0.4);
    for (const px of posts) for (const s of [-1, 1]) {
      k.box(px, 0, s * (D / 2 - 0.15), 0.3, 5, 0.3, 0x6a5038);
      k.beam({ x: px, y: 4.2, z: s * (D / 2 - 0.15) }, { x: px, y: 5, z: s * (D / 2 - 1.4) }, 0.12, 0.16, 0x6a5038);
      k.solid(px, s * (D / 2 - 0.15), 0.3, 0.3);
    }
    for (const px of posts) {
      k.box(px, 5, 0, 0.24, 0.3, D, 0x6a5038);
      for (const s of [-1, 1]) k.beam({ x: px, y: 5.15, z: s * D / 2 }, { x: px, y: 5.15 + D / 2 * 0.36, z: 0 }, 0.16, 0.24, 0x6a5038);
      k.box(px, 5.3, 0, 0.16, D / 2 * 0.36 - 0.2, 0.16, 0x6a5038);
    }
    gable(k, W, D, 5.3, { pitch: 0.36, color: 0x7d858c, mat: 'corrugated', oh: 0.7, goh: 0.5 });
    // half-height board wall along the back, sign on the gable end
    k.box(0, 0.17, -D / 2 + 0.2, W - 0.4, 2.2, 0.1, 0x8a6a48, 'boards');
    k.solid(0, -D / 2 + 0.2, W, 0.2);
    // log carriage on rails, head saw, roller table and green chain
    k.at(-3, 0.6, 0, () => {
      for (const s of [-0.6, 0.6]) k.box(0, 0.17, s, 15, 0.1, 0.08, 0x5f666b, 'metal');
      k.box(-3, 0.3, 0, 4.4, 0.3, 1.6, 0x2f6b3f, 'metal');
      for (const hx of [-4.6, -3, -1.4]) k.box(hx, 0.6, -0.5, 0.3, 0.9, 0.3, 0x2f6b3f, 'metal');
      log(k, -3, 0.6, 0.1, 5.2, 0.42);
      k.cyl(1.4, 1.1, 1.0, 1.1, 1.1, 0.04, 28, 0xc9ccd0, 'metal', { rx: PI / 2 });
      k.box(1.4, 0.17, 1.5, 1.6, 0.9, 0.9, 0xd9812a, 'metal');
      k.box(1.4, 1.5, 1.5, 1.4, 0.9, 0.7, 0xd9812a, 'metal');
      k.solid(-1, 0.3, 15, 2.6, 0, 1.4);
    });
    k.at(8, 0.4, 0, () => {
      k.box(0, 0.75, 0, 9, 0.1, 1.3, 0x8a8d90, 'metal');
      for (const lx of spread(5, 8.6)) for (const s of [-0.55, 0.55]) k.box(lx, 0.17, s, 0.1, 0.6, 0.1, 0x5f666b, 'metal');
      for (let i = 0; i < 17; i++) k.cyl(-4.2 + i * 0.52, 0.85, 0, 0.07, 0.07, 1.2, 8, 0xb9bcc0, 'metal', { rx: PI / 2 });
      for (let i = 0; i < 3; i++) k.box(-2 + i * 2.2, 0.93, rng.range(-0.3, 0.3), 3.6, 0.06, 0.3, 0xd2a46a, 'planks');
      k.solid(0, 0, 9, 1.3, 0, 1);
    });
    for (const lx of [-9, -3, 4]) lumberStack(k, rng, lx, -D / 2 + 1.8, 0, rng.pick([3, 4, 5]));
    // out in the yard: log decks, sawdust cone, slab pile, tepee burner
    logDeck(k, -W / 2 - 1, D / 2 + 2.2, 0.06, 5, 6.5);
    logDeck(k, -W / 2 + 7, D / 2 + 2.6, -0.04, 4, 6);
    k.cone(W / 2 + 2.6, 0, D / 2 - 1, 2.8, 2.1, 12, 0xcda66a, 'gravel');
    k.solid(W / 2 + 2.6, D / 2 - 1, 3.4, 3.4, 0, 1.2);
    k.beam({ x: W / 2 - 1.5, y: 3.6, z: D / 2 - 1 }, { x: W / 2 + 2.4, y: 2.3, z: D / 2 - 1 }, 0.5, 0.3, 0x5f666b, 'metal');
    k.at(W / 2 + 4, -D / 2 - 1, 0, () => {
      k.cyl(0, 0, 0, 1.3, 3.2, 7, 14, 0x7a4a36, 'corrugated');
      k.sphere(0, 7, 0, 1.3, 0x4a4a4c, 'metal', 12, 5);
      k.box(0, 0, 3.1, 1.2, 1.8, 0.3, 0x3a3a3c, 'metal');
      k.solid(0, 0, 5.6, 5.6);
    });
    signBoard(c, 'mill.name', 0, 5.6, D / 2 + 0.75, 9, 1.0, '#2f4f3a', [{ text: 'HOLLOW CREEK LUMBER CO.', font: F_OS, weight: '800', color: '#f1e9cf', y: 0.56, size: 0.58, maxW: 0.92 }], { frame: DARK });
  });
}

/** Yard office of the lumber company: small board-and-batten building with a porch. */
function lumberOffice(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const W = 10;
  const D = 8;
  c.occ.add(x, z, W, D + 3, ry, 0.5, false);
  k.at(x, z, ry, () => {
    const g = 0x4f6a52;
    const H = block(c, { w: W, d: D, h: 2.9, y0: 0.5, wall: g, wallMat: 'boards', look: L_WOOD, roof: 'gable', roofMat: 'roofMetal', roofCol: 0x6b4a3a, pitch: 0.55,
      f: [{ x: -1.5, w: 1.0, h: 2.1, kind: 'door', color: 0x6a4a32, door: { glass: true } }, sash(2.2, 2.2, 1.3, 0.9)], b: [sash(0, 1.1, 1.1, 1.1)], l: [sash(0)], r: [sash(0)],
      furnish: (kk, r, a, b) => furnishOffice(kk, r, a, b, -1.5) });
    face(k, 'f', W, D, (len) => {
      k.box(0, 0, 1.1, len, 0.5, 2.2, 0x8a6a48, 'planks');
      k.solid(0, 1.1, len, 2.2, 0, 0.5);
      for (const px of spread(4, len - 0.3)) post(k, px, 0.5, 2.0, 2.5, 0x6a5038, false);
      k.roof(0, H - 0.5, 1.2, len + 0.4, [[1.3, 0], [-1.2, 0.6]], 0x6b4a3a, 'roofMetal', { eaveOH: 0.2, gableOH: 0.2 });
      k.at(-1.5, 2.2, 0, () => steps(k, 0, 0, 1.8, 0.5, { color: 0x8a6a48, mat: 'planks' }));
      nameBoard(c, 'mill.office', 'OFFICE · SALES', H - 0.2, 4.2, '#f1e9cf', '#2f4f3a', 0.6);
      put(k, 'ice_freezer', 3.4, 0.5, 0.5, 0);
      k.box(1.2, 0.5, 0.5, 1.5, 0.45, 0.4, 0x6a5038, 'planks');
    });
    face(k, 'b', W, D, (len) => services(k, -len / 2 + 1, H - 0.6));
  });
}

/** Café table with four chairs and a parasol. */
function patioSet(k: Kit, x: number, y: number, z: number, col: Col) {
  k.cyl(x, y + 0.72, z, 0.55, 0.55, 0.04, 14, 0xe9e4d6);
  k.cyl(x, y, z, 0.05, 0.05, 2.3, 6, 0x8a8d90, 'metal');
  k.cyl(x, y, z, 0.25, 0.28, 0.05, 10, 0x5f666b, 'metal');
  k.cone(x, y + 2.05, z, 1.35, 0.5, 8, col, 'paint');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + 0.4;
    const cx = x + Math.sin(a) * 0.85;
    const cz = z + Math.cos(a) * 0.85;
    k.box(cx, y + 0.42, cz, 0.42, 0.04, 0.42, 0xf1ede2, 'paint', { ry: a });
    k.box(cx + Math.sin(a) * 0.2, y + 0.46, cz + Math.cos(a) * 0.2, 0.42, 0.44, 0.04, 0xf1ede2, 'paint', { ry: a });
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) k.box(cx + lx, y, cz + lz, 0.03, 0.42, 0.03, 0x8a8d90, 'metal');
  }
  k.solid(x, z, 1.1, 1.1, 0, 1);
}

/** Lakeside café: clapboard pavilion with a wrap-round deck over the beach, parasols and string lights. */
function lakeCafe(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const W = 14;
  const D = 9;
  c.occ.add(x, z, W + 2, D + 8, ry, 0.5, false);
  k.at(x, z, ry, () => {
    const blue = 0x6f9aa8;
    const H = block(c, { w: W, d: D, h: 3.1, y0: 0.7, wall: 0xf1ede2, wallMat: 'siding', look: { ...L_CAFE, wall: 0xf4efe2, wains: 0x6f9aa8, floor: 0xb98e62, floorMat: 'woodFloor' }, roof: 'gable', roofMat: 'shingle', roofCol: 0x4f6f7a, pitch: 0.5, frame: blue,
      f: [glassDoor(0, blue, 1.5), shopWin(-4.2, 4.2, blue, 1.9), shopWin(4.2, 4.2, blue, 1.9)], b: [backDoor(4.6), sash(-3, 1.2, 1.1, 1.2)], l: [sash(0, 2.4, 1.5, 0.9, blue)], r: [sash(0, 2.4, 1.5, 0.9, blue)],
      furnish: (kk, r, a, b) => furnishCafe(kk, r, a, b, 0) });
    face(k, 'f', W, D, (len) => {
      // deck with railing, steps, parasol tables and festoon lights
      const dd = 6;
      k.box(0, 0.5, dd / 2, len + 3, 0.2, dd, 0xa98a62, 'planks');
      k.solid(0, dd / 2, len + 3, dd, 0, 0.7);
      for (const px of spread(6, len + 2.6)) for (const pz of [0.4, dd - 0.3]) k.box(px, 0, pz, 0.2, 0.5, 0.2, 0x6a5038);
      const rail = (ax: number, az: number, bx: number, bz: number) => {
        const l = Math.hypot(bx - ax, bz - az);
        const horiz = Math.abs(bx - ax) > Math.abs(bz - az);
        const mx = (ax + bx) / 2;
        const mz = (az + bz) / 2;
        k.box(mx, 1.6, mz, horiz ? l : 0.1, 0.08, horiz ? 0.1 : l, WHITE);
        k.box(mx, 0.85, mz, horiz ? l : 0.05, 0.05, horiz ? 0.05 : l, WHITE);
        const n = Math.round(l / 0.16);
        for (let i = 0; i <= n; i++) k.box(ax + ((bx - ax) * i) / n, 0.88, az + ((bz - az) * i) / n, 0.04, 0.72, 0.04, WHITE, 'paint', { cast: false });
        k.solid(mx, mz, horiz ? l : 0.15, horiz ? 0.15 : l, 0, 1.7);
      };
      const hw = len / 2 + 1.5;
      rail(-hw, 0.2, -hw, dd);
      rail(hw, 0.2, hw, dd);
      rail(-hw, dd, -1.2, dd);
      rail(1.2, dd, hw, dd);
      addZone(k, 0, dd / 2, len + 3, dd + 0.1, 0.7);
      steps(k, 0, dd + 4 * 0.3, 2.4, 0.7, { color: 0xa98a62, mat: 'planks' });
      for (const [px, pz, col] of [[-5.6, 3.6, 0xc8443a], [-2.2, 4.1, 0xe9d9a0], [2.4, 3.8, 0x4f8f8a], [5.8, 3.4, 0xc8443a]] as const) patioSet(k, px, 0.7, pz, col);
      for (const e of [-1, 1]) k.box(e * hw, 0.7, dd, 0.1, 3.2, 0.1, 0x6a5038);
      for (const e of [-1, 1]) {
        const n = 10;
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const sag = Math.sin(t * PI) * 0.5;
          k.sphere(e * hw * (1 - t * 0.05), 3.75 - sag, dd - t * (dd - 0.4), 0.06, [0xffd97a, 0xff9a6a, 0x9ad0ff][i % 3], 'light', 6, 4);
        }
        k.beam({ x: e * hw, y: 3.85, z: dd }, { x: e * hw * 0.95, y: 3.85, z: 0.4 }, 0.015, 0.015, DARK, 'paint', false);
      }
      signBoard(c, 'cafe.lake', 0, H + 0.15, 0.14, 7.5, 0.95, '#f4efe2', [{ text: 'THE LOON · LAKESIDE CAFÉ', font: F_OS, weight: '800', color: '#3f6f7a', y: 0.56, size: 0.56, maxW: 0.92 }], { frame: blue, lamps: 3 });
      put(k, 'trash_can_street', -hw + 0.6, 0.7, 0.7, 0);
      k.box(hw - 0.9, 0.7, 0.6, 0.9, 1.3, 0.5, DARK);
    });
    face(k, 'b', W, D, (len) => {
      services(k, -len / 2 + 1.2, H - 0.6);
      put(k, 'dumpster_green', -2, 0, 1.5, 0);
      put(k, 'cardboard_box_stack', 1.2, 0, 0.8, 0.3);
      k.at(4.6, 1.6, 0, () => steps(k, 0, 0, 1.4, 0.7, { color: 0x9a968e }));
    });
  });
}

/** Bait and boat-hire shack on the shore. */
function baitShop(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 8;
  const D = 6.5;
  c.occ.add(x, z, W + 4, D + 3, ry, 0.5, false);
  k.at(x, z, ry, () => {
    const H = block(c, { w: W, d: D, h: 2.7, y0: 0.35, wall: 0xa8553f, wallMat: 'boards', look: { ...L_STORE, floor: 0xa98a62, floorMat: 'woodFloor', lights: 'bulb' }, roof: 'gable', roofMat: 'corrugated', roofCol: 0x7d858c, pitch: 0.45,
      f: [{ x: -1.6, w: 1.0, h: 2.1, kind: 'door', color: 0x4f6a52, door: { glass: true } }, sash(1.6, 2.4, 1.2, 1.0)], l: [sash(0)], r: [sash(0)],
      furnish: (kk, r, a, b) => furnishStore(kk, r, a, b, -1.6, true) });
    face(k, 'f', W, D, (len) => {
      k.box(0, 0, 0.9, len + 0.4, 0.35, 1.8, 0xa98a62, 'planks');
      k.solid(0, 0.9, len + 0.4, 1.8, 0, 0.35);
      k.roof(0, H - 0.3, 1.0, len + 0.6, [[1.2, 0], [-1.0, 0.5]], 0x7d858c, 'corrugated', { eaveOH: 0.2, gableOH: 0.2 });
      for (const e of [-1, 1]) post(k, e * (len / 2), 0.35, 1.7, 2.2, 0x6a5038, false);
      signBoard(c, 'bait', 0, H + 0.55, 0.3, 5.4, 0.8, '#f1e9cf', [{ text: 'BAIT · TACKLE · BOAT HIRE', font: F_OS, weight: '800', color: '#8f2f25', y: 0.56, size: 0.56, maxW: 0.92 }], { frame: DARK });
      put(k, 'ice_freezer', 2.9, 0.35, 0.5, 0);
      // minnow tank, oars, life rings
      k.box(-3.3, 0.35, 0.5, 0.9, 0.7, 0.6, 0x7f9aa8, 'metal');
      for (let i = 0; i < 3; i++) k.box(0.3 + i * 0.16, 0.35, 0.12, 0.08, 2.1, 0.04, i % 2 ? 0xd2a46a : 0xb98e62, 'paint', { rx: -0.05 });
      for (const lx of [-0.5, 3.6]) k.torus(lx, 1.9, 0.08, 0.26, 0.07, 6, 12, 0xe0701c, 'paint');
    });
    // rowing boats pulled up beside the shack
    for (let i = 0; i < 3; i++)
      k.at(W / 2 + 1.8 + i * 1.7, rng.range(-0.5, 1), rng.range(-0.2, 0.2), () => {
        const col = rng.pick<Col>([0xe9e4d6, 0x6f9aa8, 0xb3261e, 0x4f6a52]);
        k.box(0, 0.12, 0, 1.1, 0.1, 3.0, col, 'boards');
        for (const s of [-1, 1]) k.box(s * 0.6, 0.12, 0, 0.07, 0.42, 3.1, col, 'boards', { rz: s * -0.2 });
        k.box(0, 0.12, -1.52, 1.15, 0.42, 0.07, col, 'boards');
        k.box(0, 0.12, 1.75, 0.5, 0.4, 0.5, col, 'boards', { ry: PI / 4 });
        for (const bz of [-0.7, 0.4]) k.box(0, 0.4, bz, 1.15, 0.04, 0.26, 0xb98e62, 'planks');
        k.solid(0, 0, 1.3, 3.2, 0, 0.5);
      });
  });
}

/** County courthouse: two storeys of tan brick, four-column portico, and a square clock tower with a belfry. */
function courthouse(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 26;
  const D = 18;
  const y0 = 1.3;
  const h = 4.4;
  const H = y0 + h + 3.8;
  c.occ.add(x, z - 2.5, W, D, ry, 1.5, false);
  k.at(x, z - 2.5, ry, () => {
    const wo = { frame: WHITE, head: 'arch', headCol: STONE, sill: STONE, mx: 2, my: 3 } as const;
    const W1 = (xs: number[]): Op[] => xs.map((wx) => ({ x: wx, w: 1.4, y: 0.9, h: 2.6, kind: 'win' as const, win: wo }));
    const { a, b: bb } = hull(k, { w: W, d: D, y0, h, t: 0.4, wall: 0xffffff, wallMat: 'brickTan', look: L_COURT, base: 0xcfc8b8,
      f: [{ x: 0, w: 2.2, h: 2.9, kind: 'door', color: 0x3f2c20, door: { double: true, transom: 0.7 } }, ...W1([-10.4, -7, 7, 10.4])],
      b: [{ x: -9, w: 1.1, h: 2.2, kind: 'door', color: 0x5b5f63 }, ...W1([-4.5, 0, 4.5, 9])], l: W1(spread(4, D - 4)), r: W1(spread(4, D - 4)) });
    // lobby across the front, courtroom behind on the right, clerk and records on the left
    partition(k, -a, 3, a, 3, y0, h, L_COURT, [{ at: a + 4.5, w: 1.8 }, { at: a - 8, w: 1.1, leaf: 0x5a3f2a }]);
    partition(k, -4, -bb, -4, 3, y0, h, L_COURT, [{ at: 3, w: 1.1, leaf: 0x5a3f2a }]);
    room(k, y0, () => {
      k.at(4.5, -3, 0, () => furnishCourt(k, 8, bb - 3));
      k.at(-8.6, -3, 0, () => furnishOffice(k, rng, 4.2, bb - 3, 3));
      for (const sx of [-10, -7.4, 8, 10.6]) if (!put(k, 'waiting_chair_row_3', sx, 0, bb - 0.6, PI, { solid: 1 })) k.box(sx, 0, bb - 0.6, 1.8, 0.45, 0.5, 0x5a3f2a);
      put(k, 'flag_stand', 2.4, 0, bb - 0.7);
      put(k, 'notice_board', -11.2, 0, 3.15, PI);
      put(k, 'potted_plant_2', -2.4, 0, bb - 0.7);
    });
    upper(k, W, D, y0 + h, 3.8, 0xffffff, 'brickTan', {
      f: { xs: [-10.4, -7, 7, 10.4], o: wo, w: 1.4, h: 2.2, y: 0.8 }, b: { xs: [-9, -4.5, 0, 4.5, 9], o: wo, w: 1.4, h: 2.2, y: 0.8 },
      l: { xs: spread(4, D - 4), o: wo, w: 1.4, h: 2.2, y: 0.8 }, r: { xs: spread(4, D - 4), o: wo, w: 1.4, h: 2.2, y: 0.8 },
    });
    for (const s of ['f', 'b', 'l', 'r'] as const)
      face(k, s, W, D, (len) => {
        k.box(0, y0 + h - 0.1, 0.06, len + 0.1, 0.34, 0.14, STONE, 'concrete');
        k.box(0, y0 - 0.3, 0.08, len + 0.2, 0.3, 0.18, STONE, 'concrete');
        cornice(k, -len / 2, len / 2, H - 0.55, { h: 1.0, proj: 0.65, brackets: Math.round(len / 1.1) });
        for (const e of [-1, 1]) for (let i = 0; i < 12; i++) k.box(e * (len / 2 - (i % 2 ? 0.3 : 0.45)), y0 + i * 0.66, 0.04, i % 2 ? 0.6 : 0.9, 0.48, 0.08, STONE, 'concrete');
      });
    parapetRoof(k, W, D, H, { h: 0.8, cap: STONE, wall: 0xffffff, wallMat: 'brickTan' });
    roofGear(k, rng, W, D, H, 2);
    // projecting centre bay carrying the tower, with the portico in front of it
    const bw = 8.4;
    const pd = 3.6;
    const ch = h + 3.0;
    k.box(0, 0, D / 2 + pd / 2, bw + 1.6, y0, pd, 0xcfc8b8, 'concrete');
    addZone(k, 0, D / 2 + pd / 2, bw + 1.6, pd + 0.1, y0);
    const sz = D / 2 + pd + Math.round(y0 / 0.17) * 0.36;
    steps(k, 0, sz, bw + 1.6, y0, { color: 0xcfc8b8, run: 0.36, rail: DARK });
    // paved walk from the foot of the steps out to the sidewalk
    k.box(0, 0, (sz + 25.5) / 2, 4, 0.07, 25.5 - sz, 0xb9b4a8, 'concrete', { cast: false });
    for (const cx of spread(4, bw)) column(k, cx, y0, D / 2 + pd - 0.65, ch, 0.42);
    k.box(0, y0 + ch, D / 2 + pd / 2 - 0.1, bw + 1.2, 0.95, pd + 0.2, WHITE);
    k.box(0, y0 + ch + 0.95, D / 2 + pd / 2 - 0.05, bw + 1.7, 0.16, pd + 0.6, WHITE);
    signBoard(c, 'courthouse', 0, y0 + ch + 0.48, D / 2 + pd + 0.03, 8.6, 0.66, '#f1ede2', [{ text: 'HOLLOW COUNTY COURTHOUSE', font: F_OS, weight: '700', color: '#3a3530', y: 0.55, size: 0.6, maxW: 0.96, letter: 4 }], { frame: WHITE });
    pediment(k, 0, y0 + ch + 1.11, D / 2 + pd + 0.2, bw + 1.6, 1.9, pd + 0.3);
    warm(k, () => k.box(0, y0 + ch - 0.04, D / 2 + pd / 2, bw + 0.8, 0.04, pd - 0.4, 0xdfe8ea, 'beadboard', { cast: false }));
    // clock tower: brick shaft, clock stage, open belfry with arches, pyramidal copper roof
    const tw = 5.2;
    const tz = D / 2 - tw / 2 - 0.4;
    k.box(0, H, tz, tw, 5.2, tw, 0xffffff, 'brickTan');
    for (let i = 0; i < 4; i++) {
      k.push(0, 0, tz, (i * PI) / 2);
      k.box(0, H + 1.2, tw / 2 + 0.03, 0.9, 2.2, 0.06, 0x3d4a45, 'glass');
      k.box(0, H + 5.2, tw / 2 - 0.1, tw + 0.5, 0.3, 0.5, STONE, 'concrete');
      clock(k, 0, H + 7.0, tw / 2 + 0.02, 1.05);
      k.box(0, H + 8.7, tw / 2 - 0.1, tw + 0.5, 0.3, 0.5, STONE, 'concrete');
      for (const e of [-1, 1]) {
        k.box(e * (tw / 2 - 0.4), H + 9, tw / 2 - 0.4, 0.8, 3.0, 0.8, WHITE);
        k.box(e * 0.75, H + 9, tw / 2 - 0.3, 0.3, 2.3, 0.3, WHITE);
      }
      k.box(0, H + 11.3, tw / 2 - 0.3, tw - 0.6, 0.7, 0.4, WHITE);
      k.box(0, H + 9, tw / 2 - 0.25, tw - 1.6, 0.9, 0.08, WHITE);
      k.pop();
    }
    k.box(0, H + 5.5, tz, tw, 3.2, tw, 0xffffff, 'brickTan');
    k.box(0, H + 9, tz, tw - 1.8, 0.2, tw - 1.8, 0x5f666b);
    k.cyl(0, H + 9.9, tz, 0.5, 0.75, 1.0, 10, 0xb08a3a, 'metal');
    k.box(0, H + 12, tz, tw + 0.7, 0.25, tw + 0.7, WHITE);
    k.cone(0, H + 12.25, tz, (tw + 0.4) * 0.72, 5.0, 4, 0x4f7a6b, 'roofMetal', { ry: PI / 4 });
    k.cyl(0, H + 17.2, tz, 0.05, 0.08, 1.8, 6, 0xc8b06a, 'metal');
    k.sphere(0, H + 19.05, tz, 0.18, 0xc8b06a, 'metal');
    face(k, 'b', W, D, (len) => {
      services(k, len / 2 - 1.5, H - 1);
      k.box(-9, 0, 0.7, 1.6, y0, 1.4, 0xcfc8b8, 'concrete');
      addZone(k, -9, 0.7, 1.6, 1.5, y0);
      steps(k, -9, 1.4 + Math.round(y0 / 0.17) * 0.3, 1.6, y0, { color: 0xcfc8b8, rail: DARK });
    });
  });
}

const mk = (id: string, name: string, w: number, d: number, tags: string[], fn: (c: Ctx, x: number, z: number, ry: number) => void): BuildingDef => ({ id, name, w, d, tags, build: fn });
export const DISTRICT: BuildingDef[] = [
  mk('courthouse', 'Hollow County Courthouse', 26, 28, ['civic'], courthouse),
  mk('barn', 'Barn', 17, 18, ['farm'], barn),
  mk('machineShed', 'Machine Shed', 16, 8, ['farm'], machineShed),
  mk('warehouse', 'Cascade Freight & Storage', 32, 26, ['industrial'], warehouse),
  mk('factory', 'Pine Hollow Canning Co.', 42, 26, ['industrial'], factory),
  mk('sawmill', 'Hollow Creek Lumber Co.', 38, 19, ['industrial'], sawmill),
  mk('lumberOffice', 'Lumber Yard Office', 10, 11, ['industrial', 'office'], lumberOffice),
  mk('lakeCafe', 'The Loon Lakeside Café', 17, 21, ['cafe'], lakeCafe),
  mk('baitShop', 'Bait & Tackle', 14, 10, ['store'], baitShop),
];
export { bales, roundBale, pallet, logDeck, log, patioSet };

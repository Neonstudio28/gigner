import type { Kit, Col } from '../core/kit';
import type { Ctx } from '../buildings/common';
import type { BuildingDef } from '../buildings/catalog';
import { room, furnishCourt, furnishSheriff, furnishOffice } from '../buildings/interiors';
import { face, cornice, signBoard, WHITE, STONE, DARK, F_OS } from './kit2';
import { hull, upper, spread, put, partition, warm, type Look, type Op } from './hull';
import { parapetRoof, roofGear, services, gutter, gable, steps } from './parts';

/** Doric column: stepped base, tapered faceted shaft with necking, echinus and square abacus. */
export function column(k: Kit, x: number, y: number, z: number, h: number, r = 0.42, color: Col = WHITE) {
  if (put(k, h > 5.2 ? 'column_doric_60' : 'column_doric_45', x, y, z, 0, { s: h / (h > 5.2 ? 6 : 4.5) })) return;
  k.box(x, y, z, r * 2.7, 0.18, r * 2.7, color);
  k.cyl(x, y + 0.18, z, r * 1.2, r * 1.28, 0.14, 16, color);
  k.cyl(x, y + 0.32, z, r * 0.84, r, h - 0.82, 16, color);
  k.cyl(x, y + h - 0.5, z, r * 0.92, r * 0.84, 0.08, 16, color);
  k.cyl(x, y + h - 0.42, z, r * 1.25, r * 0.9, 0.2, 16, color);
  k.box(x, y + h - 0.22, z, r * 2.7, 0.22, r * 2.7, color);
}

/** Triangular pediment (tympanum with raking cornices) of width w and rise, base at y, front face at z. */
export function pediment(k: Kit, x: number, y: number, z: number, w: number, rise: number, depth: number, color: Col = WHITE, tymp: Col = 0xe9e4d6) {
  k.pediment(x, y, z - depth / 2, w, rise, depth, tymp);
  const len = Math.hypot(w / 2, rise);
  const a = Math.atan2(rise, w / 2);
  for (const s of [-1, 1]) {
    k.box(x + (s * w) / 4, y + rise / 2 - 0.02, z - depth / 2 + 0.12, len + 0.5, 0.3, depth + 0.5, color, 'paint', { rz: s * -a });
    k.box(x + (s * w) / 4, y + rise / 2 + 0.2, z - depth / 2 + 0.16, len + 0.7, 0.12, depth + 0.7, color, 'paint', { rz: s * -a });
  }
  k.box(x, y - 0.3, z - depth / 2 + 0.1, w + 0.5, 0.3, depth + 0.4, color);
}

/** Clock dial on the wall plane facing +Z. */
export function clock(k: Kit, x: number, y: number, z: number, r = 0.8) {
  if (put(k, 'clock_face', x, y, z, 0, { s: r / 0.8 })) return;
  k.cyl(x, y, z, r + 0.1, r + 0.1, 0.1, 20, DARK, 'paint', { rx: Math.PI / 2 });
  k.cyl(x, y, z + 0.04, r, r, 0.06, 20, 0xf4efe0, 'paint', { rx: Math.PI / 2 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.box(x + Math.sin(a) * r * 0.82, y + Math.cos(a) * r * 0.82 - 0.05, z + 0.08, 0.05, 0.12, 0.02, DARK, 'paint', { rz: -a });
  }
  k.box(x + 0.16, y + 0.1, z + 0.09, 0.06, r * 0.5, 0.02, DARK, 'paint', { rz: -0.9 });
  k.box(x - 0.05, y + 0.02, z + 0.1, 0.045, r * 0.75, 0.02, DARK, 'paint', { rz: 0.35 });
}

const CIVIC: Look = { wall: 0xe4dcc6, wains: 0x6f5238, wainsH: 1.15, floor: 0xb08458, floorMat: 'woodFloor', lights: 'dome', step: 4.4 };

/** Town hall: brick block behind a six-column portico with a clock pediment, wide steps and a domed cupola. */
function townHall(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 28;
  const D = 20;
  const y0 = 1.2;
  const h = 4.6;
  const H = y0 + h + 3.9;
  c.occ.add(x, z - 3, W, D, ry, 1.5, false);
  k.at(x, z - 3, ry, () => {
    const wo = { frame: WHITE, head: 'lintel', headCol: STONE, sill: STONE, mx: 2, my: 3 } as const;
    const f: Op[] = [{ x: 0, w: 2.2, h: 2.9, kind: 'door', color: 0x4a3324, door: { double: true, transom: 0.7 } }, ...[-11, -7.4, 7.4, 11].map((wx) => ({ x: wx, w: 1.5, y: 1.0, h: 2.5, kind: 'win' as const, win: wo }))];
    const side: Op[] = spread(4, D - 4).map((sx) => ({ x: sx, w: 1.5, y: 1.0, h: 2.5, kind: 'win' as const, win: wo }));
    const b: Op[] = [{ x: 9, w: 1.1, h: 2.2, kind: 'door', color: 0x5b5f63 }, ...[-9, -4.5, 0, 4.5].map((wx) => ({ x: wx, w: 1.5, y: 1.0, h: 2.5, kind: 'win' as const, win: wo }))];
    const { a, b: bb } = hull(k, { w: W, d: D, y0, h, wall: 0xffffff, wallMat: 'brickRed', look: CIVIC, f, b, l: side, r: side, base: 0xcfc8b8, t: 0.4 });
    // lobby across the front, council chamber behind on the left, offices on the right
    partition(k, -a, 3.2, a, 3.2, y0, h, CIVIC, [{ at: a - 5.5, w: 1.8 }, { at: a + 8, w: 1.1, leaf: 0x5a3f2a }]);
    partition(k, 4, -bb, 4, 3.2, y0, h, CIVIC, [{ at: 3.5, w: 1.1, leaf: 0x5a3f2a }]);
    room(k, y0, () => {
      k.at(-5.5, -4.4, 0, () => furnishCourt(k, 8.6, bb - 2.6));
      k.at(9, -4.4, 0, () => furnishOffice(k, rng, 4.6, bb - 2.6, -3));
      if (!put(k, 'reception_counter', 6, 0, 5.6, Math.PI, { solid: 1.2 })) {
        k.box(6, 0, 5.6, 3.2, 1.05, 0.7, 0x6f5238);
        k.box(6, 1.05, 5.6, 3.4, 0.06, 0.85, 0x2f5d4b, 'gloss');
        k.solid(6, 5.6, 3.2, 0.7, 0, 1.2);
      }
      for (const sx of [-10.5, -8]) if (!put(k, 'waiting_chair_row_3', sx, 0, bb - 0.6, Math.PI, { solid: 1 })) k.box(sx, 0, bb - 0.6, 1.8, 0.45, 0.5, 0x2a4f8c);
      put(k, 'flag_stand', -2.6, 0, bb - 0.7);
      put(k, 'notice_board', 11.5, 0, 3.3, Math.PI);
      put(k, 'potted_plant', 2.6, 0, bb - 0.7);
    });
    // upper storey with tall windows, stone band, bracketed cornice and parapet
    upper(k, W, D, y0 + h, 3.9, 0xffffff, 'brickRed', {
      f: { xs: [-11, -7.4, 7.4, 11], o: wo, w: 1.5, h: 2.2, y: 0.8 },
      l: { xs: spread(4, D - 4), o: wo, w: 1.5, h: 2.2, y: 0.8 },
      r: { xs: spread(4, D - 4), o: wo, w: 1.5, h: 2.2, y: 0.8 },
      b: { xs: [-9, -4.5, 0, 4.5, 9], o: wo, w: 1.5, h: 2.2, y: 0.8 },
    });
    for (const s of ['f', 'b', 'l', 'r'] as const)
      face(k, s, W, D, (len) => {
        k.box(0, y0 + h - 0.1, 0.06, len + 0.1, 0.3, 0.12, STONE, 'concrete');
        k.box(0, y0 - 0.25, 0.08, len + 0.2, 0.25, 0.16, STONE, 'concrete');
        cornice(k, -len / 2, len / 2, H - 0.5, { h: 0.9, proj: 0.6, dentils: true });
        for (const e of [-1, 1]) {
          // stone quoins at the corners
          for (let i = 0; i < 12; i++) k.box(e * (len / 2 - (i % 2 ? 0.3 : 0.45)), y0 + i * 0.68, 0.04, i % 2 ? 0.6 : 0.9, 0.5, 0.08, STONE, 'concrete');
        }
      });
    parapetRoof(k, W, D, H, { h: 0.9, cap: STONE });
    roofGear(k, rng, W, D, H, 3);
    // portico: steps, six columns, entablature with the town's name, pediment with the clock
    const pw = 13;
    const pd = 4.2;
    const ch = h + 3.2;
    k.box(0, 0, D / 2 + pd / 2, pw + 1, y0, pd, 0xcfc8b8, 'concrete');
    k.at(0, D / 2 + pd + 0.01, 0, () => {
      k.push(0, 0, 0, Math.PI);
      steps(k, 0, 0, pw + 1, y0, { color: 0xcfc8b8, run: 0.36, rail: DARK });
      k.pop();
    });
    for (const cx of spread(6, pw + 2.2)) column(k, cx, y0, D / 2 + pd - 0.7, ch, 0.44);
    k.box(0, y0 + ch, D / 2 + pd / 2 - 0.1, pw + 0.6, 1.0, pd + 0.2, WHITE);
    k.box(0, y0 + ch + 1.0, D / 2 + pd / 2 - 0.05, pw + 1.1, 0.16, pd + 0.6, WHITE);
    signBoard(c, 'townhall', 0, y0 + ch + 0.5, D / 2 + pd + 0.03, 9.5, 0.7, '#f1ede2', [{ text: 'PINE HOLLOW TOWN HALL', font: F_OS, weight: '700', color: '#3a3530', y: 0.55, size: 0.62, maxW: 0.96, letter: 6 }], { frame: WHITE });
    pediment(k, 0, y0 + ch + 1.16, D / 2 + pd + 0.2, pw + 1.0, 2.5, pd + 0.3);
    clock(k, 0, y0 + ch + 2.1, D / 2 + pd + 0.22, 0.75);
    warm(k, () => k.box(0, y0 + ch - 0.04, D / 2 + pd / 2, pw, 0.04, pd - 0.4, 0xdfe8ea, 'beadboard', { cast: false }));
    // cupola: square drum with louvres, dome and finial
    k.box(0, H, -1, 4.2, 1.2, 4.2, WHITE);
    k.box(0, H + 1.2, -1, 4.6, 0.16, 4.6, WHITE);
    k.cyl(0, H + 1.36, -1, 1.5, 1.6, 2.4, 8, WHITE);
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2 + Math.PI / 8;
      k.box(Math.sin(an) * 1.5, H + 1.7, -1 + Math.cos(an) * 1.5, 0.7, 1.6, 0.06, 0x5d6b66, 'paint', { ry: an });
    }
    k.cyl(0, H + 3.76, -1, 1.85, 1.85, 0.2, 8, WHITE);
    k.sphere(0, H + 3.9, -1, 1.55, 0x4f7a6b, 'roofMetal', 12, 8);
    k.cyl(0, H + 5.3, -1, 0.06, 0.1, 1.6, 6, 0xc8b06a, 'metal');
    k.sphere(0, H + 6.9, -1, 0.16, 0xc8b06a, 'metal');
    face(k, 'b', W, D, (len) => {
      services(k, -len / 2 + 1.5, H - 1);
      gutter(k, -len / 2 + 0.4, len / 2 - 0.4, H - 0.2, 0.02, 0x8a8d90);
      k.box(-9, 0, 0.7, 1.6, y0, 1.4, 0xcfc8b8, 'concrete');
    });
    void gable;
    void furnishSheriff
;
  });
}

export const CIVIC_B2: BuildingDef[] = [{ id: 'townhall', name: 'Pine Hollow Town Hall', w: 28, d: 30, tags: ['civic'], build: townHall }];

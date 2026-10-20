import * as THREE from 'three';
import type { BuildingDef } from './catalog';
import type { Ctx } from './common';
import { windowAt, doorAt, flatRoof, rooftop, flagPole, balustrade, pedWindow, chimney, downspout } from './common';
import type { Col, Kit, SignRef } from '../core/kit';
import { Rng } from '../core/rng';
import { P } from '../palette';
import { vehicle, VEHICLE_LENGTH, type VehicleType } from '../vehicles';
import { acornLamp, bench, planter, securityFence, trashCan, streetLight, hydrant } from '../props';
import { panelSign, textOnly, drawLines, makeCanvas, clockFace, type Line } from '../textures';

/* ------------------------------------------------------------------------------------------------
 * Pine Hollow civic and landmark buildings (fictional town, modelled on Wallace, Idaho).
 * Local frame: street side = +Z, centred on the footprint, base at y = 0.
 * ---------------------------------------------------------------------------------------------- */

export const CIVIC: BuildingDef[] = [];

const HALF = Math.PI / 2;
const F_SLAB = 'Alfa Slab One';
const F_OSW = 'Oswald';
const sgn = (c: Ctx, key: string, draw: () => HTMLCanvasElement): SignRef => c.signs.custom(`civ:${key}`, draw);

/* ------------------------------------------------------------------------- generic helpers */

type Side = 'f' | 'b' | 'l' | 'r';
/** Runs `fn` in a frame sitting on one wall of a w×d box centred at the origin: +Z outward, +X along the wall. */
function onFace(k: Kit, side: Side, w: number, d: number, fn: (len: number, zf: number) => void) {
  const ry = side === 'f' ? 0 : side === 'b' ? Math.PI : side === 'r' ? HALF : -HALF;
  const horiz = side === 'f' || side === 'b';
  k.at(0, 0, ry, () => fn(horiz ? w : d, horiz ? d / 2 : w / 2));
}

function steps(k: Kit, x: number, zEdge: number, w: number, rise: number, n: number, color: Col = 0xbfb29a, tread = 0.4, mat = 'stone') {
  for (let j = 0; j < n; j++) k.box(x, 0, zEdge + (n - 1 - j) * tread + tread / 2, w, ((j + 1) * rise) / n, tread, color, mat);
}

/** Sloping stone cheek wall beside a stair; runs from zOuter back toward -Z. */
function wingWall(k: Kit, x: number, zOuter: number, len: number, rise: number, color: Col, t = 1.0) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(len, 0);
  s.lineTo(len, rise + 1.0);
  s.lineTo(0, 1.0);
  s.closePath();
  k.at(x, zOuter, HALF, () => k.extrude(s, t, color, 'stone'));
  k.solid(x, zOuter - len / 2, t, len);
}

function archShape(hw: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-hw, 0);
  s.lineTo(hw, 0);
  s.lineTo(hw, h - hw);
  s.absarc(0, h - hw, hw, 0, Math.PI, false);
  s.lineTo(-hw, 0);
  return s;
}

interface ArchOpts {
  trim?: Col;
  trimMat?: string;
  frame?: Col;
  glass?: Col;
  mx?: number;
  bars?: number[];
  key?: boolean;
  sill?: boolean;
  surround?: number;
}
/** Round-headed window on a +Z wall (surface z = zf); (x, y) is the bottom centre of the opening, h includes the arch. */
function archWin(k: Kit, x: number, y: number, zf: number, w: number, h: number, o: ArchOpts = {}) {
  const trim = o.trim ?? 0xf1ebdf;
  const frame = o.frame ?? 0xf0ede4;
  const hw = w / 2;
  const sr = o.surround ?? 0.32;
  if (sr > 0) k.extrude(archShape(hw + sr, h + sr), 0.22, trim, o.trimMat ?? 'stone', x, y, zf + 0.04);
  k.extrude(archShape(hw + 0.06, h + 0.06), 0.2, frame, 'paint', x, y - 0.02, zf);
  k.extrude(archShape(hw - 0.07, h - 0.12), 0.2, o.glass ?? P.glass, 'glass', x, y + 0.05, zf - 0.02);
  const mx = o.mx ?? 1;
  const spring = h - hw;
  for (let i = 1; i < mx + 1; i++) k.box(x - hw + (w * i) / (mx + 1), y + 0.05, zf + 0.09, 0.07, spring - 0.05, 0.05, frame);
  k.box(x, y + spring - 0.04, zf + 0.09, w - 0.1, 0.07, 0.05, frame);
  for (const b of o.bars ?? []) k.box(x, y + b, zf + 0.09, w - 0.1, 0.09, 0.05, frame);
  if (o.key !== false) k.box(x, y + h + sr - 0.1, zf + 0.15, 0.5, 0.5, 0.12, trim, o.trimMat ?? 'stone');
  if (o.sill !== false && sr > 0) k.box(x, y - 0.16, zf + 0.15, w + sr * 2 + 0.3, 0.18, 0.34, trim, o.trimMat ?? 'stone');
}

/** Flat fluted pilaster on a +Z wall (x centre, y base). */
function pilaster(k: Kit, x: number, y: number, zf: number, w: number, h: number, color: Col, mat = 'stone', flutes = true) {
  k.box(x, y, zf + 0.17, w, h, 0.34, color, mat);
  k.box(x, y, zf + 0.2, w + 0.22, 0.4, 0.4, color, mat);
  k.box(x, y + h - 0.45, zf + 0.22, w + 0.34, 0.45, 0.44, color, mat);
  if (flutes) for (let i = -1; i <= 1; i++) k.box(x + i * w * 0.27, y + 0.45, zf + 0.345, 0.05, h - 1.0, 0.02, 0xb9b3a4, 'paint', { cast: false });
}

/** Classical entablature (frieze, dentils, cornice) around the top of a wall face. */
function entablature(k: Kit, len: number, zf: number, top: number, trim: Col, mat = 'stone') {
  k.box(0, top - 2.0, zf + 0.04, len + 0.1, 0.95, 0.12, trim, mat);
  k.box(0, top - 1.1, zf + 0.1, len + 0.3, 0.3, 0.26, trim, mat);
  const n = Math.round(len / 0.55);
  for (let i = 0; i < n; i++) k.box(-len / 2 + 0.3 + (i * (len - 0.6)) / Math.max(1, n - 1), top - 1.42, zf + 0.2, 0.24, 0.3, 0.2, trim, mat, { cast: false });
  k.box(0, top - 0.78, zf + 0.25, len + 0.6, 0.78, 0.6, trim, mat);
  k.box(0, top - 0.08, zf + 0.32, len + 0.9, 0.12, 0.72, trim, mat);
}

function lawn(k: Kit, x: number, z: number, w: number, d: number, col: Col = P.lawn) {
  k.plane(x, 0.04, z, w, d, col, 'field');
}
function hedge(k: Kit, x: number, z: number, w: number, d: number, h = 0.9, col: Col = 0x35502a) {
  k.box(x, 0, z, w, h, d, col, 'field', { cast: false });
}
function pave(k: Kit, cx: number, cz: number, w: number, d: number, col: Col = 0x6f737b) {
  k.box(cx, 0, cz, w, 0.04, d, col, 'asphalt', { cast: false });
}
function slab(k: Kit, cx: number, cz: number, w: number, d: number, h = 0.1, col: Col = P.concrete) {
  k.box(cx, 0, cz, w, h, d, col, 'concrete', { cast: false });
}
function mark(k: Kit, x: number, z: number, w: number, d: number, col: Col = 0xf1f1ec, y = 0.05) {
  k.plane(x, y, z, w, d, col, 'decal');
}
function shrub(k: Kit, x: number, z: number, r: number, col: Col = 0x3f5e30, y = 0) {
  k.ico(x, y + r * 0.7, z, r, 0, col, 'paint', 1, 0.8, 1);
}
function conifer(k: Kit, x: number, z: number, h: number) {
  k.cyl(x, 0, z, 0.12, 0.2, h * 0.3, 5, P.trunk);
  k.cone(x, h * 0.18, z, h * 0.3, h * 0.46, 6, 0x2f4c2a);
  k.cone(x, h * 0.45, z, h * 0.23, h * 0.38, 6, 0x35562f);
  k.cone(x, h * 0.68, z, h * 0.15, h * 0.32, 6, 0x3d6034);
  k.solid(x, z, 0.5, 0.5);
}
function maple(k: Kit, x: number, z: number, h: number, col: Col = 0x5d8a36) {
  k.cyl(x, 0, z, 0.16, 0.26, h * 0.5, 6, P.trunk);
  k.ico(x, h * 0.66, z, h * 0.34, 1, col, 'paint', 1, 0.85, 1);
  k.ico(x + h * 0.14, h * 0.52, z + h * 0.06, h * 0.22, 0, 0x4f7a30, 'paint');
  k.solid(x, z, 0.5, 0.5);
}
function lampPost(k: Kit, x: number, z: number, ry = 0, h = 8, twin = false) {
  k.at(x, z, ry, () => {
    k.solid(0, 0, 0.5, 0.5);
    k.box(0, 0, 0, 0.7, 0.35, 0.7, 0xb8babc, 'concrete');
    k.cyl(0, 0.35, 0, 0.09, 0.13, h, 6, 0x4b4f54, 'metal');
    for (const s of twin ? [-1, 1] : [1]) {
      k.box(s * 0.55, h + 0.3, 0, 1.1, 0.08, 0.1, 0x4b4f54, 'metal');
      k.box(s * 1.15, h + 0.2, 0, 0.9, 0.16, 0.4, 0x3a3d41, 'metal');
      k.box(s * 1.15, h + 0.15, 0, 0.7, 0.04, 0.3, 0xfff1d0, 'light', { cast: false });
    }
  });
}
function park(c: Ctx, type: VehicleType, x: number, z: number, ry: number, color: Col, o?: Parameters<typeof vehicle>[7]) {
  vehicle(c.kit, c.signs, type, x, z, ry, color, o);
  c.kit.solid(x, z, VEHICLE_LENGTH[type] - 0.2, 2.0, ry);
}
function pole(k: Kit, signs: Ctx['signs'], x: number, z: number, h = 10) {
  k.cyl(x, 0, z, 0.55, 0.65, 0.3, 8, 0xb8babc, 'concrete');
  flagPole(k, signs, x, z, h);
  k.solid(x, z, 0.5, 0.5);
}
function lineSign(c: Ctx, key: string, w: number, h: number, bg: string | null, lines: Line[], o?: Parameters<typeof panelSign>[4]): SignRef {
  return sgn(c, key, () => panelSign(w, h, bg, lines, o));
}

/* ------------------------------------------------------------------------------------------------
 * 1. Pine County Courthouse (after the 1907 Shoshone County Courthouse in Wallace)
 * ---------------------------------------------------------------------------------------------- */
function courthouse(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k, signs } = c;
  const rng = new Rng(seed);
  const W = 46;
  const D = 24;
  const ZC = -7;
  const B = 2.2;
  const FH = 4.8;
  const TOP = B + FH * 3;
  const zf = D / 2;
  const BW = 15;
  const BP = 3.2;
  const zb = zf + BP;
  const WALL = 0xf0ede4;
  const TRIM = 0xf4f1ea;
  const BASE = 0xc9c2b2;
  const GL = 0x2b3a4a;
  const s2 = B + FH;
  const s3 = B + FH * 2;
  c.occ.add(x, z, 58, 42, ry, 1, false);
  const frieze = sgn(c, 'ch.frieze', () => textOnly(640, 64, [{ text: 'PINE COUNTY COURT HOUSE', font: F_OSW, weight: '700', color: '#7a6a3c', y: 0.52, size: 0.74, maxW: 0.97, letter: 3 }]));
  k.at(x, z, ry, () => {
    k.solid(0, ZC, W + 1, D + 1);
    k.solid(0, ZC + zb - BP / 2, BW, BP + 0.5);
    k.at(0, ZC, 0, () => {
      // raised basement, walls, bay
      k.box(0, 0, 0, W + 0.8, B, D + 0.8, BASE, 'stone');
      k.box(0, B - 0.4, 0, W + 1.2, 0.4, D + 1.2, TRIM, 'stone');
      k.box(0, B, 0, W, FH * 3, D, WALL, 'stucco');
      k.box(0, B, zf + BP / 2 - 0.2, BW, FH * 3, BP + 0.4, WALL, 'stucco');
      k.box(0, 0, zf + BP / 2 - 0.2, BW + 0.8, B, BP + 1.2, BASE, 'stone');
      k.box(0, B - 0.4, zf + BP / 2 - 0.2, BW + 1.2, 0.4, BP + 1.6, TRIM, 'stone');
      for (const y of [s2, s3]) {
        k.box(0, y - 0.18, 0, W + 0.2, 0.36, D + 0.2, TRIM, 'stone');
        k.box(0, y - 0.18, zf + BP / 2 - 0.2, BW + 0.2, 0.36, BP + 0.6, TRIM, 'stone');
      }
      // entablature + parapet all round, heavier over the bay
      for (const s of ['f', 'b', 'l', 'r'] as Side[]) onFace(k, s, W, D, (len, f) => {
        entablature(k, len, f, TOP, TRIM);
        k.box(0, TOP, f + 0.25, len + 0.7, 1.3, 0.6, TRIM, 'stone');
        for (let i = 0; i < Math.floor(len / 3); i++) k.box(-len / 2 + 1.5 + i * 3, TOP + 1.3, f + 0.25, 0.9, 0.22, 0.7, TRIM, 'stone');
      });
      k.at(0, 0, 0, () => {
        entablature(k, BW + 0.9, zb, TOP, TRIM);
        k.box(0, TOP, zb + 0.25, BW + 1.6, 1.3, 0.6, TRIM, 'stone');
        k.sign(0, TOP - 1.55, zb + 0.135, 12.6, 0.78, frieze, { thick: 0.02 });
        k.pediment(0, TOP + 1.3, zb + 0.35, BW + 1.2, 2.7, 0.7, TRIM, 'stone');
        k.pediment(0, TOP + 1.55, zb + 0.72, BW - 1.4, 1.9, 0.12, 0xdcd5c4, 'stone');
        k.cyl(0, TOP + 2.3, zb + 0.82, 0.7, 0.7, 0.08, 10, 0xc9b06a, 'metal', { rx: HALF });
      });
      k.box(0, TOP, 0, W - 0.3, 0.06, D - 0.3, P.roofTar);
      rooftop(k, rng, W, D, TOP + 0.05, 3);
      k.box(-13, TOP, -3, 3.4, 1.4, 3.0, 0xd8d3c7, 'concrete');
      k.cyl(-13, TOP + 1.4, -3, 0.9, 1.1, 0.6, 8, 0x6f737b, 'metal');

      // front wings: pilasters + three rows of windows
      const wx = [10.9, 13.9, 16.9, 19.9];
      for (const s of [-1, 1]) {
        for (const px of [8.5, 12.4, 15.4, 18.4, 22.0]) pilaster(k, s * px, B, zf, px === 22.0 ? 1.1 : 0.7, TOP - 2.0 - B, TRIM);
        for (const px of wx) {
          windowAt(k, s * px, 1.0, zf, 1.3, 1.0, { frame: TRIM, mx: 2, my: 1, glass: GL });
          pedWindow(k, s * px, B + 0.9, zf, 1.5, 2.8, TRIM, GL);
          windowAt(k, s * px, s2 + 0.9, zf, 1.5, 3.0, { frame: TRIM, mx: 2, my: 3, glass: GL });
          windowAt(k, s * px, s3 + 0.7, zf, 1.5, 1.8, { frame: TRIM, mx: 2, my: 2, glass: GL });
        }
      }
      // central bay: paired pilasters, two-storey arched windows, entrance, balcony
      for (const s of [-1, 1]) for (const px of [5.7, 6.9]) pilaster(k, s * px, B, zb, 0.8, TOP - 2.0 - B, TRIM);
      archWin(k, 0, B, zb, 3.4, 4.2, { glass: 0x3a2a1e, trim: TRIM, mx: 0 });
      doorAt(k, -0.82, B, zb, 1.5, 3.0, 0x4b3020, { glass: true, frame: TRIM });
      doorAt(k, 0.82, B, zb, 1.5, 3.0, 0x4b3020, { glass: true, frame: TRIM });
      for (const s of [-1, 1]) {
        archWin(k, s * 3.8, B + 0.5, zb, 1.7, 3.9, { glass: GL, trim: TRIM, mx: 1, bars: [1.6] });
        archWin(k, s * 3.8, s2 + 1.0, zb, 1.7, 5.9, { glass: GL, trim: TRIM, mx: 1, bars: [2.1, 4.2] });
      }
      archWin(k, 0, s2 + 0.15, zb, 3.4, 7.4, { glass: GL, trim: TRIM, mx: 3, bars: [2.3, 3.9, 5.0] });
      // balcony on medallion brackets
      k.box(0, s2 - 0.4, zb + 1.1, 7.4, 0.4, 2.4, TRIM, 'stone');
      balustrade(k, 0, s2, zb + 2.2, 7.4, TRIM, 1.0);
      for (const sx of [-1, 1]) k.at(sx * 3.6, 0, HALF, () => balustrade(k, 0, s2, -zb - 1.1 + 2 * zb * 0 + zb * 0 - 0, 2.2, TRIM, 1.0));
      for (const bx of [-2.8, 0, 2.8]) {
        k.beam({ x: bx, y: s2 - 0.4, z: zb + 2.0 }, { x: bx, y: s2 - 1.6, z: zb + 0.1 }, 0.5, 0.45, TRIM, 'stone');
        k.cyl(bx, s2 - 1.0, zb + 0.07, 0.42, 0.42, 0.1, 8, 0xe6dcc4, 'stone', { rx: HALF });
      }

      // side + rear elevations
      for (const s of ['l', 'r'] as Side[]) onFace(k, s, W, D, (len, f) => {
        for (let i = 0; i < 6; i++) {
          const px = -9.4 + i * 3.76;
          windowAt(k, px, 1.0, f, 1.3, 1.0, { frame: TRIM, mx: 2, my: 1, glass: GL });
          windowAt(k, px, B + 0.9, f, 1.5, 2.8, { frame: TRIM, mx: 2, my: 3, glass: GL });
          windowAt(k, px, s2 + 0.9, f, 1.5, 3.0, { frame: TRIM, mx: 2, my: 3, glass: GL });
          windowAt(k, px, s3 + 0.7, f, 1.5, 1.8, { frame: TRIM, mx: 2, my: 2, glass: GL });
        }
        for (const px of [-11.3, 11.3]) pilaster(k, px, B, f, 0.9, TOP - 2.0 - B, TRIM);
        void len;
      });
      onFace(k, 'b', W, D, (len, f) => {
        for (let i = 0; i < 9; i++) {
          const px = -16 + i * 4;
          if (px === 0) continue;
          windowAt(k, px, 1.0, f, 1.3, 1.0, { frame: TRIM, mx: 2, my: 1, glass: GL });
          windowAt(k, px, B + 0.9, f, 1.5, 2.8, { frame: TRIM, mx: 2, my: 3, glass: GL, ac: i === 1 || i === 7 });
          windowAt(k, px, s2 + 0.9, f, 1.5, 3.0, { frame: TRIM, mx: 2, my: 3, glass: GL });
          windowAt(k, px, s3 + 0.7, f, 1.5, 1.8, { frame: TRIM, mx: 2, my: 2, glass: GL });
        }
        doorAt(k, 0, B, f, 1.9, 2.8, 0x4b3020, { glass: true, double: true, frame: TRIM });
        k.box(0, 0, f + 1.0, 4.0, B, 2.0, BASE, 'stone');
        steps(k, 0, f + 2.0, 3.4, B, 5, 0xbfb29a, 0.4);
        k.box(0, B + 3.1, f + 1.0, 3.6, 0.18, 2.0, TRIM, 'stone');
        for (const sx of [-1, 1]) k.box(sx * 1.7, B, f + 1.7, 0.25, 3.1, 0.25, TRIM, 'stone');
        downspout(k, -len / 2 + 0.6, f + 0.1, TOP - 1);
        downspout(k, len / 2 - 0.6, f + 0.1, TOP - 1);
      });
    });

    // ---- approach: landing, grand stair with cheek walls, lamps, lawn
    const zl = ZC + zb;
    k.box(0, 0, zl + 1.2, 12.6, B, 2.4, BASE, 'stone');
    steps(k, 0, zl + 2.4, 12.0, B, 11, 0xcfc8b8, 0.6);
    for (const s of [-1, 1]) {
      wingWall(k, s * 6.5, zl + 2.4 + 6.6, 8.8, B, BASE, 1.0);
      k.at(0, 0, 0, () => acornLamp(k, s * 6.5, zl + 1.4, 3.6));
    }
    k.cyl(0, 0, 0, 0, 0, 0.001, 3, 0xffffff);
    lawn(k, 0, 15.2, 56, 11.2);
    slab(k, 0, 18.7, 6, 4.2, 0.06, 0xd6d3cb);
    slab(k, 0, 19.6, 56, 2.2, 0.06, 0xcfcdc6);
    for (const s of [-1, 1]) {
      pole(k, signs, s * 11, 13.6, 11);
      hedge(k, s * 17.5, 10.0, 11, 0.9, 0.8);
      hedge(k, s * 7.0, 8.6, 2.0, 1.2, 0.8);
      maple(k, s * 21, 15.2, 8.5, s > 0 ? 0x5d8a36 : 0x6a9a3a);
      maple(k, s * 15, 17.8, 6.5, s > 0 ? 0x73a043 : 0x4f7a30);
      bench(k, s * 9, 18.4, 0);
      lampPost(k, s * 13, 20.2, 0, 6.5);
    }
    // war memorial
    k.box(0, 0, 14.2, 2.2, 0.5, 2.2, 0xb9b3a4, 'stone');
    k.box(0, 0.5, 14.2, 1.5, 1.0, 1.5, 0xcfc8b8, 'stone');
    k.cone(0, 1.5, 14.2, 0.7, 3.2, 4, 0xd9d3c3, 'stone', { ry: Math.PI / 4 });
    k.solid(0, 14.2, 2.2, 2.2);
  });
}
CIVIC.push({ id: 'courthouse', name: 'Pine County Courthouse', w: 58, d: 42, front: 12, tags: ['civic', 'landmark', 'downtown'], build: courthouse });

import * as THREE from 'three';
import type { BuildingDef } from './catalog';
import type { Ctx } from './common';
import { windowAt, doorAt, flatRoof, rooftop, flagPole, balustrade, pedWindow, chimney, downspout, storefront, awning, cornice, fireEscape, quoins, column } from './common';
import type { Col, Kit, SignRef } from '../core/kit';
import { Rng } from '../core/rng';
import { P, CAR_COLORS } from '../palette';
import { vehicle, VEHICLE_LENGTH, type VehicleType } from '../vehicles';
import { acornLamp, bench, planter, securityFence, trashCan, streetLight, hydrant } from '../props';
import { panelSign, textOnly, drawLines, makeCanvas, clockFace, star, roundRect, type Line } from '../textures';

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

function archPath<T extends THREE.Path>(p: T, hw: number, h: number, y0: number): T {
  p.moveTo(-hw, y0);
  p.lineTo(hw, y0);
  p.lineTo(hw, h - hw);
  p.absarc(0, h - hw, hw, 0, Math.PI, false);
  p.lineTo(-hw, y0);
  return p;
}
function archShape(hw: number, h: number, y0 = 0): THREE.Shape {
  return archPath(new THREE.Shape(), hw, h, y0);
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
  if (sr > 0) {
    const ring = archShape(hw + sr, h + sr, -0.16);
    ring.holes.push(archPath(new THREE.Path(), hw + 0.02, h + 0.02, 0));
    k.extrude(ring, 0.2, trim, o.trimMat ?? 'stone', x, y, zf + 0.05);
  }
  k.extrude(archShape(hw + 0.03, h + 0.03), 0.2, frame, 'paint', x, y, zf - 0.05);
  k.extrude(archShape(hw - 0.1, h - 0.1, 0.06), 0.2, o.glass ?? P.glass, 'glass', x, y, zf);
  const mx = o.mx ?? 1;
  const spring = h - hw;
  for (let i = 1; i < mx + 1; i++) k.box(x - hw + (w * i) / (mx + 1), y + 0.06, zf + 0.125, 0.07, spring - 0.06, 0.05, frame);
  k.box(x, y + spring - 0.04, zf + 0.125, w - 0.2, 0.07, 0.05, frame);
  for (const b of o.bars ?? []) k.box(x, y + b, zf + 0.125, w - 0.2, 0.09, 0.05, frame);
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
      doorAt(k, -0.82, B, zb + 0.1, 1.5, 3.0, 0x4b3020, { glass: true, frame: TRIM });
      doorAt(k, 0.82, B, zb + 0.1, 1.5, 3.0, 0x4b3020, { glass: true, frame: TRIM });
      for (const s of [-1, 1]) {
        archWin(k, s * 3.8, B + 0.5, zb, 1.7, 3.9, { glass: GL, trim: TRIM, mx: 1, bars: [1.6] });
        archWin(k, s * 3.8, s2 + 1.0, zb, 1.7, 5.9, { glass: GL, trim: TRIM, mx: 1, bars: [2.1, 4.2] });
      }
      archWin(k, 0, s2 + 0.15, zb, 3.4, 7.4, { glass: GL, trim: TRIM, mx: 3, bars: [2.3, 3.9, 5.0] });
      // balcony on medallion brackets
      k.box(0, s2 - 0.4, zb + 1.1, 7.4, 0.4, 2.4, TRIM, 'stone');
      balustrade(k, 0, s2, zb + 2.2, 7.4, TRIM, 1.0);
      for (const sx of [-1, 1]) k.at(sx * 3.6, zb + 1.1, HALF, () => balustrade(k, 0, s2, 0, 2.2, TRIM, 1.0));
      for (const bx of [-2.8, 0, 2.8]) {
        k.beam({ x: bx, y: s2 - 0.4, z: zb + 2.0 }, { x: bx, y: s2 - 1.6, z: zb + 0.1 }, 0.5, 0.45, TRIM, 'stone');
        k.cyl(bx, s2 - 1.0, zb + 0.07, 0.42, 0.42, 0.1, 8, 0xe6dcc4, 'stone', { rx: HALF });
      }

      // side + rear elevations
      for (const s of ['l', 'r'] as Side[]) onFace(k, s, W, D, (_len, f) => {
        for (let i = 0; i < 6; i++) {
          const px = -9.4 + i * 3.76;
          windowAt(k, px, 1.0, f, 1.3, 1.0, { frame: TRIM, mx: 2, my: 1, glass: GL });
          windowAt(k, px, B + 0.9, f, 1.5, 2.8, { frame: TRIM, mx: 2, my: 3, glass: GL });
          windowAt(k, px, s2 + 0.9, f, 1.5, 3.0, { frame: TRIM, mx: 2, my: 3, glass: GL });
          windowAt(k, px, s3 + 0.7, f, 1.5, 1.8, { frame: TRIM, mx: 2, my: 2, glass: GL });
        }
        for (const px of [-11.3, 11.3]) pilaster(k, px, B, f, 0.9, TOP - 2.0 - B, TRIM);
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

/* ------------------------------------------------------------------------------------------------
 * 2. Pine Hollow City Hall: red-brick Romanesque/Italianate with a corner clock tower
 * ---------------------------------------------------------------------------------------------- */
function townHall(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  const W = 44;
  const D = 24;
  const ZC = -7;
  const B = 2.4;
  const s2 = B + 5.0;
  const TOP = s2 + 4.4;
  const zf = D / 2;
  const STONE = 0xdcd0b6;
  const RUBBLE = 0x9a9183;
  const CREAM = 0xf0e7d2;
  const SLATE = 0x4b525d;
  const GL = 0x24303b;
  const px = 3.5;
  const tx = -22.5;
  const tz = 11;
  const clock = sgn(c, 'th.clock', () => clockFace());
  const plaque = lineSign(c, 'th.plaque', 512, 110, '#d9cdb2', [{ text: 'CITY HALL', font: F_SLAB, color: '#33261a', y: 0.52, size: 0.62, maxW: 0.9, letter: 4 }], { border: '#8c7b58', borderW: 8 });
  const founded = lineSign(c, 'th.founded', 384, 96, '#4a3a2a', [
    { text: 'PINE HOLLOW', font: F_OSW, weight: '700', color: '#e8d9a0', y: 0.32, size: 0.36, letter: 3 },
    { text: 'CITY HALL · 1902', font: F_OSW, weight: '600', color: '#e8d9a0', y: 0.72, size: 0.32, letter: 2 },
  ]);
  c.occ.add(x, z, 56, 42, ry, 1, false);
  k.at(x, z, ry, () => {
    k.solid(0, ZC, W + 1, D + 1);
    k.solid(tx, ZC + tz, 9, 9);
    k.solid(px, ZC + zf + 1.8, 8.6, 3.8);
    k.at(0, ZC, 0, () => {
      // walls, rough stone base, belt courses
      k.box(0, 0, 0, W + 0.8, B, D + 0.8, RUBBLE, 'stone');
      k.box(0, B - 0.35, 0, W + 1.1, 0.35, D + 1.1, STONE, 'stone');
      k.box(0, B, 0, W, TOP - B, D, 0xffffff, 'brickRed');
      for (const y of [s2, TOP - 1.1]) k.box(0, y - 0.2, 0, W + 0.24, 0.4, D + 0.24, STONE, 'stone');
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        for (let j = 0; j < 7; j++) k.box(sx * (W / 2), B + j * 1.3, sz * zf, 0.9 + (j % 2) * 0.4, 0.7, 0.9 + (j % 2) * 0.4, STONE, 'stone');
      }
      // brick eaves with Italianate brackets
      for (const s of ['f', 'b', 'l', 'r'] as Side[]) onFace(k, s, W, D, (len, f) => {
        k.box(0, TOP - 0.9, f + 0.05, len + 0.1, 0.4, 0.24, STONE, 'stone');
        const n = Math.floor(len / 1.7);
        for (let i = 0; i < n; i++) {
          const bx = -len / 2 + 0.9 + (i * (len - 1.8)) / Math.max(1, n - 1);
          k.box(bx, TOP - 0.82, f + 0.42, 0.3, 0.78, 0.82, CREAM);
        }
      });
      k.hipRoof(0, TOP, 0, W, D, 6.2, SLATE, 'shingle', 1.2);
      for (const sx of [-1, 1]) chimney(k, sx * 9, TOP + 3.9, -3, 3.6, 0xffffff, 'brickRed');
      // dormers on the front slope
      for (const dx of [-12, -6, 9.5, 15]) {
        k.box(dx, TOP + 1.4, 6, 2.7, 2.7, 4, 0xffffff, 'brickRed');
        k.at(dx, 6, HALF, () => k.roof(0, TOP + 4.1, 0, 4.4, [[1.9, 0], [0, 1.4], [-1.9, 0]], SLATE, 'shingle', { trim: CREAM, fill: 0xffffff, fillMat: 'brickRed', eaveOH: 0.25, gableOH: 0.3 }));
        windowAt(k, dx, TOP + 2.55, 8.0, 1.0, 1.4, { frame: CREAM, mx: 1, my: 2, glass: GL });
      }

      // front windows: arched ground floor, arched upper floor
      for (const wx of [-13.5, -9.5, -5.5, 10.5, 14.5, 18.5]) {
        archWin(k, wx, B + 0.9, zf, 1.8, 3.8, { trim: STONE, glass: GL, mx: 1, bars: [1.7] });
        archWin(k, wx, s2 + 0.8, zf, 1.5, 3.3, { trim: STONE, glass: GL, mx: 1, bars: [1.4], sill: true });
        for (const dy of [0.4]) k.box(wx, 0.7, zf + 0.02, 1.3, 1.0 + dy, 0.1, 0x2a2e33, 'glass');
      }
      archWin(k, px, TOP - 3.3, zf, 2.2, 2.4, { trim: STONE, glass: GL, mx: 1, sill: false, surround: 0.28 });
      for (const s of [-1, 1]) archWin(k, px + s * 2.5, TOP - 3.2, zf, 1.1, 2.1, { trim: STONE, glass: GL, mx: 0, sill: false, surround: 0.25 });

      // entry porch: stone portal, voussoir arch, gable roof, steps
      const pz = zf + 1.75;
      k.box(px, 0, pz, 8.4, B, 3.9, RUBBLE, 'stone');
      k.box(px, B, pz, 8.4, 4.0, 3.9, 0xffffff, 'brickRed');
      k.box(px, B - 0.35, pz, 8.8, 0.35, 4.3, STONE, 'stone');
      k.box(px, B + 3.9, pz, 8.8, 0.35, 4.3, STONE, 'stone');
      k.at(px, pz + 1.95, 0, () => {
        archWin(k, 0, 0.1, 0.0, 4.0, 5.4, { trim: STONE, glass: 0x3a2a1e, surround: 0.55, mx: 0, sill: false });
        doorAt(k, -0.95, 0.1, 0.1, 1.8, 3.1, 0x4b3020, { glass: true, frame: STONE });
        doorAt(k, 0.95, 0.1, 0.1, 1.8, 3.1, 0x4b3020, { glass: true, frame: STONE });
        for (let i = 0; i < 9; i++) {
          const a = (i / 8) * Math.PI;
          k.box(Math.cos(a) * 3.1, 3.55 + Math.sin(a) * 2.9 - 0.25, 0.3, 0.55, 0.5, 0.4, i % 2 ? CREAM : STONE, 'stone', { ry: 0, rz: a - HALF });
        }
      });
      k.at(px, pz, HALF, () => k.roof(0, B + 4.25, 0, 4.1, [[4.6, 0], [0, 2.3], [-4.6, 0]], SLATE, 'shingle', { trim: STONE, fill: 0xffffff, fillMat: 'brickRed', eaveOH: 0.4, gableOH: 0.25 }));
      k.sign(px, B + 4.25 + 1.0, pz + 2.15 + 0.12, 4.3, 0.9, plaque, { thick: 0.04, back: STONE });
      steps(k, px, zf + 3.7, 6.0, B, 7, 0xcfc4ab, 0.5);
      for (const s of [-1, 1]) wingWall(k, px + s * 3.4, zf + 3.7 + 3.5, 3.6 + 0.0, B, STONE, 0.8);
      for (const s of [-1, 1]) k.at(0, 0, 0, () => acornLamp(k, px + s * 3.4, zf + 4.2, 3.4), B);
      k.sign(px + 6.8, B + 1.8, zf + 0.02, 2.6, 0.65, founded, { thick: 0.04, back: 0x2a2018 });

      // side and rear elevations
      for (const s of ['l', 'r'] as Side[]) onFace(k, s, W, D, (_len, f) => {
        for (const wx of [-9, -4.5, 0, 4.5, 9]) {
          if (s === 'l' && wx > 5) continue;
          archWin(k, wx, B + 0.9, f, 1.7, 3.6, { trim: STONE, glass: GL, mx: 1, bars: [1.6] });
          archWin(k, wx, s2 + 0.8, f, 1.5, 3.2, { trim: STONE, glass: GL, mx: 1, bars: [1.4] });
        }
      });
      onFace(k, 'b', W, D, (len, f) => {
        for (const wx of [-18, -13.5, -9, -4.5, 4.5, 9, 13.5, 18]) {
          windowAt(k, wx, B + 0.9, f, 1.4, 2.8, { frame: CREAM, mx: 2, my: 3, glass: GL, arch: STONE });
          windowAt(k, wx, s2 + 0.8, f, 1.4, 2.8, { frame: CREAM, mx: 2, my: 3, glass: GL, arch: STONE, ac: wx === 9 });
        }
        doorAt(k, 0, B, f, 1.9, 2.8, 0x4b3020, { glass: true, double: true, frame: CREAM });
        k.box(0, 0, f + 1.0, 4.0, B, 2.0, RUBBLE, 'stone');
        steps(k, 0, f + 2.0, 3.4, B, 5, 0xbfb29a, 0.4);
        downspout(k, -len / 2 + 0.5, f + 0.1, TOP - 1);
        downspout(k, len / 2 - 0.5, f + 0.1, TOP - 1);
      });
      void rng;

      // clock tower
      k.at(tx, tz, 0, () => {
        const T = 8;
        const sh = TOP + 0.2;
        const cs = sh + 4.0;
        k.box(0, 0, 0, T + 0.7, B, T + 0.7, RUBBLE, 'stone');
        k.box(0, B - 0.35, 0, T + 1.0, 0.35, T + 1.0, STONE, 'stone');
        k.box(0, B, 0, T, sh - B, T, 0xffffff, 'brickRed');
        for (const y of [s2, sh - 0.4]) k.box(0, y - 0.2, 0, T + 0.3, 0.4, T + 0.3, STONE, 'stone');
        for (let i = 0; i < 4; i++) k.at(0, 0, i * HALF, () => {
          const f = T / 2;
          archWin(k, 0, B + 0.7, f, 1.4, 3.6, { trim: STONE, glass: GL, mx: 0, sill: false });
          archWin(k, 0, s2 + 0.7, f, 1.2, 2.8, { trim: STONE, glass: GL, mx: 0, sill: false });
        });
        k.box(0, sh, 0, T - 0.4, 4.0, T - 0.4, 0xffffff, 'brickRed');
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let j = 0; j < 3; j++) k.box(sx * (T / 2 - 0.2), sh + j * 1.35 + 0.05, sz * (T / 2 - 0.2), 0.6 + (j % 2) * 0.2, 1.1, 0.6 + (j % 2) * 0.2, STONE, 'stone');
        for (let i = 0; i < 4; i++) k.at(0, 0, i * HALF, () => {
          const f = T / 2 - 0.2;
          k.sign(0, sh + 2.0, f + 0.02, 3.1, 3.1, clock, { thick: 0.05 });
          k.torus(0, sh + 2.0, f + 0.05, 1.62, 0.1, 4, 16, 0xb08a3a, 'metal');
          k.box(0, sh + 3.55, f + 0.14, 1.2, 0.5, 0.2, STONE, 'stone');
        });
        k.box(0, cs, 0, T + 1.0, 0.5, T + 1.0, STONE, 'stone');
        k.box(0, cs + 0.5, 0, T + 0.3, 0.3, T + 0.3, STONE, 'stone');
        // belfry: four brick piers around dark louvred arches
        const bf = cs + 0.8;
        k.box(0, bf, 0, 5.4, 3.0, 5.4, 0x1c1a18);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(sx * 3.2, bf, sz * 3.2, 1.6, 3.0, 1.6, 0xffffff, 'brickRed');
        for (let i = 0; i < 4; i++) k.at(0, 0, i * HALF, () => archWin(k, 0, bf, 2.9, 4.6, 3.0, { trim: STONE, glass: 0x15130f, mx: 2, key: false, sill: false, surround: 0.25 }));
        k.box(0, bf + 3.0, 0, T + 1.0, 0.5, T + 1.0, STONE, 'stone');
        k.hipRoof(0, bf + 3.5, 0, T + 0.4, T + 0.4, 5.4, SLATE, 'shingle', 0.6);
        k.cyl(0, bf + 8.9, 0, 0.08, 0.13, 1.6, 6, 0x2a2e33, 'metal');
        k.sphere(0, bf + 9.6, 0, 0.3, 0xb08a3a, 'metal', 8, 6);
        k.box(0, bf + 10.5, 0, 1.0, 0.08, 0.08, 0x2a2e33, 'metal');
      });
    });

    // ---- grounds
    lawn(k, 0, 15.2, 56, 12);
    slab(k, px, 18.7, 5.0, 4.6, 0.06, 0xd6d3cb);
    slab(k, 0, 19.7, 56, 2.0, 0.06, 0xcfcdc6);
    pole(k, c.signs, 15.5, 14.5, 10.5);
    maple(k, -8, 15.5, 7.5, 0x6a9a3a);
    maple(k, 21, 16.2, 8.5, 0x5d8a36);
    maple(k, -22, 18.2, 6.5, 0x73a043);
    hedge(k, -12, 8.4, 9, 0.9, 0.8);
    hedge(k, 12, 8.4, 9, 0.9, 0.8);
    bench(k, 9, 16.8, 0);
    bench(k, -2, 16.8, 0);
    lampPost(k, 11, 20.3, 0, 6.5);
    lampPost(k, -11, 20.3, 0, 6.5);
    // miners' memorial: ore cart on a stone plinth
    k.box(-16, 0, 15.6, 3.4, 0.5, 2.4, 0xb9b3a4, 'stone');
    k.box(-16, 0.5, 15.6, 1.9, 0.9, 1.2, 0x5a4332, 'planks');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(-16 + sx * 0.6, 0.55, 15.6 + sz * 0.62, 0.17, 0.17, 0.1, 8, 0x2b2d31, 'metal', { rx: HALF });
    k.box(-16, 1.2, 15.6, 1.6, 0.35, 0.9, 0x3a3d41, 'gravel');
    k.solid(-16, 15.6, 3.4, 2.4);
  });
}
CIVIC.push({ id: 'townHall', name: 'Pine Hollow City Hall', w: 56, d: 42, front: 12, tags: ['civic', 'landmark', 'downtown'], build: townHall });

/* ------------------------------------------------------------------------------------------------
 * shared site pieces: parking stalls, 1990s box ambulance
 * ---------------------------------------------------------------------------------------------- */
function stallRow(k: Kit, x0: number, pitch: number, n: number, z0: number, z1: number) {
  for (let i = 0; i <= n; i++) mark(k, x0 + i * pitch, (z0 + z1) / 2, 0.11, z1 - z0);
}
function carsInRow(c: Ctx, rng: Rng, x0: number, pitch: number, n: number, zc: number, ry: number, fill: number) {
  const types: VehicleType[] = ['sedan', 'wagon', 'pickup', 'suv', 'van', 'coupe'];
  for (let i = 0; i < n; i++) {
    if (!rng.chance(fill)) continue;
    park(c, rng.pick(types), x0 + (i + 0.5) * pitch, zc, ry, rng.pick(CAR_COLORS));
  }
}

/** Type-III box ambulance (late-80s cutaway van chassis). Local +X is the nose. */
function ambulance(c: Ctx, x: number, z: number, ry: number) {
  const k = c.kit;
  const hub = 0x9ea3a8;
  const white = 0xf2f2ee;
  const art = sgn(c, 'amb.side', () =>
    panelSign(512, 128, null, [{ text: 'SILVER VALLEY EMS', font: F_OSW, weight: '700', color: '#c8281e', y: 0.36, size: 0.34, x: 0.56, maxW: 0.7, letter: 2 }, { text: 'AMBULANCE · 911', font: F_OSW, weight: '600', color: '#1f3f8c', y: 0.7, size: 0.26, x: 0.56, maxW: 0.7 }], {
      draw: (g) => {
        g.fillStyle = '#1f55b8';
        for (let i = 0; i < 3; i++) {
          g.save();
          g.translate(64, 64);
          g.rotate((i * Math.PI) / 3);
          g.fillRect(-9, -52, 18, 104);
          g.restore();
        }
      },
    }),
  );
  const rear = sgn(c, 'amb.hood', () =>
    panelSign(256, 48, null, [], {
      draw: (g, w, h) => {
        g.save();
        g.translate(w, 0);
        g.scale(-1, 1);
        drawLines(g, w, h, [{ text: 'AMBULANCE', font: F_OSW, weight: '700', color: '#c8281e', y: 0.5, size: 0.8 }]);
        g.restore();
      },
    }),
  );
  k.at(x, z, ry, () => {
    k.solid(0, 0, 6.5, 2.3);
    const s = new THREE.Shape();
    const pts: [number, number][] = [[-3.2, 0.5], [-3.2, 3.0], [1.1, 3.0], [1.1, 2.3], [1.75, 2.3], [2.6, 1.35], [3.3, 1.25], [3.3, 0.5]];
    s.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts.slice(1)) s.lineTo(px, py);
    s.closePath();
    k.extrude(s, 2.1, white, 'gloss');
    k.boxC(2.17, 1.83, 0, 1.2, 0.04, 1.8, P.glass, 'glass', { rz: -0.8 });
    for (const sz of [-1, 1]) {
      k.box(1.85, 1.35, sz * 1.06, 0.95, 0.8, 0.03, P.glass, 'glass');
      k.box(-0.9, 0.9, sz * 1.06, 4.0, 0.3, 0.02, 0xd9421c, 'decal');
      k.box(-0.9, 1.25, sz * 1.06, 4.0, 0.08, 0.02, 0xf4c20d, 'decal');
      k.box(-3.3, 0.55, sz * 0.8, 0.12, 0.2, 0.3, 0x2b2d31);
      k.box(3.31, 0.95, sz * 0.72, 0.03, 0.2, 0.36, 0xf1eedd, 'light');
      k.box(-3.21, 1.0, sz * 0.95, 0.03, 0.55, 0.15, 0xa3221d, 'light');
    }
    k.signPlane(-1.2, 1.95, 1.07, 3.2, 0.8, art);
    k.signPlane(-1.2, 1.95, -1.07, 3.2, 0.8, art, { ry: Math.PI });
    k.signPlane(3.32, 0.95, 0, 1.2, 0.22, rear, { ry: HALF });
    k.box(-3.0, 3.0, 0, 0.9, 0.2, 0.4, 0xc8281e, 'light');
    k.box(1.5, 2.3, 0, 0.4, 0.2, 1.7, 0xc8281e, 'light');
    k.box(1.5, 2.3, 0.0, 0.42, 0.2, 0.5, 0xf4f4f0, 'light');
    k.box(3.3, 0.5, 0, 0.3, 0.3, 2.1, 0xc9ccd0, 'chrome');
    k.box(-3.4, 0.45, 0, 0.3, 0.2, 2.1, 0xc9ccd0, 'chrome');
    k.box(-3.21, 0.7, 0, 0.02, 2.2, 0.04, 0x55585c, 'decal');
    for (const [wx, dual] of [[2.2, false], [-1.9, true]] as [number, boolean][]) for (const sz of [-1, 1]) {
      k.cylZ(wx, 0.42, sz * 0.95, 0.42, dual ? 0.5 : 0.3, 10, 0x1a1a1b);
      k.cylZ(wx, 0.42, sz * (dual ? 1.22 : 1.12), 0.2, 0.04, 8, hub, 'metal');
    }
  });
}

/* ------------------------------------------------------------------------------------------------
 * 3. Silver Valley Medical Center
 * ---------------------------------------------------------------------------------------------- */
function hospital(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  const FH = 4.2;
  const TOP = FH * 3;
  const BRICK = 0xf0e6d6;
  const BAND = 0xd9d6cf;
  const FR = 0x4a4036;
  const GL = 0x2f4150;
  const bigSign = lineSign(c, 'hosp.name', 640, 56, '#1f4a8a', [{ text: 'SILVER VALLEY MEDICAL CENTER', font: F_OSW, weight: '700', color: '#ffffff', y: 0.52, size: 0.7, maxW: 0.94, letter: 2 }]);
  const er = lineSign(c, 'hosp.er', 512, 128, '#b81d24', [{ text: 'EMERGENCY', font: F_OSW, weight: '700', color: '#ffffff', y: 0.5, size: 0.66, letter: 6 }], { border: '#ffffff', borderW: 8 });
  const erSub = lineSign(c, 'hosp.er2', 512, 72, '#f4f1e8', [{ text: 'AMBULANCE ENTRANCE · NO PARKING', font: F_OSW, weight: '600', color: '#b81d24', y: 0.52, size: 0.55, maxW: 0.94 }]);
  const entry = lineSign(c, 'hosp.main', 512, 100, '#f4f1e8', [{ text: 'MAIN ENTRANCE', font: F_OSW, weight: '700', color: '#1f4a8a', y: 0.52, size: 0.6, letter: 4 }]);
  const hSign = lineSign(c, 'hosp.h', 160, 224, '#1f4a8a', [{ text: 'H', font: F_SLAB, color: '#ffffff', y: 0.38, size: 0.5 }, { text: 'HOSPITAL', font: F_OSW, weight: '700', color: '#ffffff', y: 0.82, size: 0.15, maxW: 0.86 }], { border: '#ffffff', borderW: 6, radius: 14 });
  c.occ.add(x, z, 80, 62, ry, 1, false);

  const ribbon = (k: Kit, len: number, f: number, floors: number, x0: number, pitch: number, wy = 1.0, hh = 1.9) => {
    const n = Math.floor((len - 2) / pitch);
    for (let fl = 0; fl < floors; fl++) {
      for (let i = 0; i < n; i++) {
        const wx = x0 - ((n - 1) * pitch) / 2 + i * pitch;
        windowAt(k, wx, fl * FH + wy, f, pitch - 1.0, hh, { frame: FR, mx: 2, my: 1, glass: GL });
      }
    }
  };
  k.at(x, z, ry, () => {
    // ---- main 3-storey block: x -20..24, z -30..-10
    k.at(2, -20, 0, () => {
      const w = 44;
      const d = 20;
      k.solid(0, 0, w, d);
      k.box(0, 0, 0, w, TOP, d, BRICK, 'brickTan');
      for (const fl of [1, 2, 3]) k.box(0, fl * FH - 0.55, 0, w + 0.3, 0.55, d + 0.3, BAND, 'concrete');
      k.box(0, 0, 0, w + 0.4, 0.5, d + 0.4, 0x9b9893, 'concrete');
      k.box(0, TOP, 0, w + 0.6, 0.35, d + 0.6, BAND, 'concrete');
      flatRoof(k, w, d, TOP + 0.35, 0.9, BAND);
      for (const s of ['f', 'b', 'l', 'r'] as Side[]) onFace(k, s, w, d, (len, f) => {
        ribbon(k, len, f, 3, 0, 3.8);
        if (s === 'f') for (let i = -5; i <= 5; i++) k.box(i * 3.8 + 1.9, 0.5, f + 0.05, 0.5, TOP - 0.5, 0.1, BAND, 'concrete');
      });
      rooftop(k, rng, w, d, TOP + 0.4, 4);
      k.box(-10, TOP + 0.35, -3, 9, 3.2, 6, 0xd9d6cf, 'concrete');
      k.box(-10, TOP + 3.55, -3, 9.4, 0.3, 6.4, 0x9b9893, 'concrete');
      for (let i = 0; i < 3; i++) k.cyl(-13 + i * 3, TOP + 3.85, -3, 0.7, 0.7, 0.8, 8, 0x55585c, 'metal');
      k.cyl(10, TOP + 0.35, 0, 0.9, 1.1, 7.5, 8, 0xb9b4ab, 'concrete');
      k.sign(0, TOP + 0.35 - 1.65 + 0.4, d / 2 + 0.36, 20, 1.75, bigSign, { thick: 0.04 });
    });
    // main entrance: glass vestibule + flat canopy on columns
    k.box(3, 0, -9, 10, 4.6, 2.5, 0x3b4b5c, 'glass');
    k.box(3, 0, -7.7, 10.2, 0.4, 0.2, FR);
    storefront(k, -1.5, 7.5, 0, -7.7, 3.4, { frame: FR, doorW: 2.4 });
    k.box(3, 4.4, -5.2, 15, 0.45, 8.0, BAND, 'concrete');
    k.box(3, 4.2, 1.0, 15.3, 0.9, 0.3, 0x1f4a8a);
    k.sign(3, 4.65, 1.2, 9, 0.9, entry, { thick: 0.04 });
    for (const sx of [-6.5, 0.5, 6.5, 12.5]) {
      k.box(sx, 0, 0.4, 0.55, 4.4, 0.55, BAND, 'concrete');
      k.solid(sx, 0.4, 0.6, 0.6);
    }
    for (const sx of [-4, 3, 10]) k.box(sx, 4.38, -2, 0.7, 0.04, 0.7, 0xfff1d0, 'light', { cast: false });
    slab(k, 3, -2, 16, 8.5, 0.12, 0xd0cfca);

    // ---- west ER wing (1 storey) x -40..-20, z -30..-2
    k.at(-30, -16, 0, () => {
      const w = 20;
      const d = 28;
      const h = 5.0;
      k.solid(0, 0, w, d);
      k.box(0, 0, 0, w, h, d, BRICK, 'brickTan');
      k.box(0, h - 0.6, 0, w + 0.3, 0.6, d + 0.3, BAND, 'concrete');
      k.box(0, 0, 0, w + 0.4, 0.5, d + 0.4, 0x9b9893, 'concrete');
      flatRoof(k, w, d, h, 0.8, BAND);
      for (const s of ['l', 'r', 'b'] as Side[]) onFace(k, s, w, d, (len, f) => ribbon(k, len, f, 1, 0, 4.2, 1.4, 1.6));
      onFace(k, 'f', w, d, (_len, f) => {
        storefront(k, -4.2, 4.2, 0.1, f, 3.3, { frame: FR, doorW: 3.0 });
        for (const sx of [-8, 8]) windowAt(k, sx, 1.4, f, 1.6, 1.6, { frame: FR, mx: 2, my: 1, glass: GL });
      });
      k.box(0, h, 0, 3, 1.4, 3, 0xd9d6cf, 'concrete');
    });
    // drive-under canopy
    const cz = 2.5;
    k.box(-30, 4.6, cz, 18.5, 0.5, 9.0, BAND, 'concrete');
    k.box(-30, 4.3, cz + 4.5, 18.5, 1.3, 0.3, 0xb81d24);
    k.sign(-30, 4.95, cz + 4.7, 9, 1.0, er, { thick: 0.05 });
    k.sign(-30, 3.6, cz + 4.7, 9, 0.5, erSub, { thick: 0.04 });
    for (const sx of [-38.6, -30, -21.4]) {
      k.box(sx, 0, cz + 4.0, 0.6, 4.6, 0.6, BAND, 'concrete');
      k.box(sx, 0, cz + 4.0, 0.9, 0.6, 0.9, 0x9b9893, 'concrete');
      k.solid(sx, cz + 4.0, 0.7, 0.7);
    }
    for (const sx of [-35, -30, -25]) k.box(sx, 4.58, cz, 0.7, 0.04, 0.7, 0xfff1d0, 'light', { cast: false });
    slab(k, -30, cz, 19, 9.2, 0.1, 0xd0cfca);
    pave(k, -30, cz + 6.2, 21, 3.5);
    mark(k, -30, cz + 6.2, 17, 0.2, 0xd8b84a);
    ambulance(c, -34.3, cz, -HALF);
    ambulance(c, -26.2, cz, -HALF);
    k.at(-22.5, 11.5, 0, () => {
      k.box(0, 0, 0, 0.12, 3.0, 0.12, 0x9ea3a8, 'metal');
      k.sign(0.0, 3.1, 0.07, 1.6, 0.8, er, { thick: 0.04, twoSided: true });
    });

    // ---- east 2-storey wing x 24..40, z -30..-16
    k.at(32, -23, 0, () => {
      const w = 16;
      const d = 14;
      const h = FH * 2;
      k.solid(0, 0, w, d);
      k.box(0, 0, 0, w, h, d, BRICK, 'brickTan');
      for (const fl of [1, 2]) k.box(0, fl * FH - 0.55, 0, w + 0.3, 0.55, d + 0.3, BAND, 'concrete');
      k.box(0, 0, 0, w + 0.4, 0.5, d + 0.4, 0x9b9893, 'concrete');
      flatRoof(k, w, d, h, 0.8, BAND);
      for (const s of ['f', 'l', 'r', 'b'] as Side[]) onFace(k, s, w, d, (len, f) => ribbon(k, len, f, 2, 0, 3.8));
      k.box(3, h, -2, 4, 2.5, 4, 0xd9d6cf, 'concrete');
    });

    // ---- ground helipad
    const hx = 31;
    const hz = 8;
    k.cyl(hx, 0, hz, 7.2, 7.2, 0.08, 20, 0x9b9893, 'concrete');
    k.cyl(hx, 0.08, hz, 6.4, 6.4, 0.02, 20, 0xe7b93a, 'decal');
    k.cyl(hx, 0.1, hz, 6.0, 6.0, 0.02, 20, 0x5b5f64, 'decal');
    for (const sx of [-1, 1]) k.box(hx + sx * 1.35, 0.12, hz, 0.65, 0.02, 4.4, 0xf4f4f0, 'decal');
    k.box(hx, 0.12, hz, 2.0, 0.02, 0.65, 0xf4f4f0, 'decal');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.box(hx + Math.cos(a) * 6.7, 0.06, hz + Math.sin(a) * 6.7, 0.3, 0.2, 0.3, 0xfff1a0, 'light', { cast: false });
    }
    k.cyl(hx + 8.5, 0, hz + 9, 0.07, 0.1, 5.5, 6, 0xd9dadc, 'metal');
    k.cone(hx + 8.5, 5.0, hz + 9, 0.35, 1.8, 6, 0xe8631f, 'paint', { rz: -HALF + 0.1 });
    k.solid(hx + 8.5, hz + 9, 0.4, 0.4);

    // ---- parking
    pave(k, -2, 15, 82, 31.5, 0x5f636a);
    slab(k, -2, -7.0, 68, 3.0, 0.12, 0xcdccc7);
    for (const [za, zb] of [[1.5, 7], [14, 19.5], [19.5, 25]] as [number, number][]) stallRow(k, -17, 3.0, 13, za, zb);
    carsInRow(c, rng, -17, 3.0, 13, 4.25, HALF, 0.55);
    carsInRow(c, rng, -17, 3.0, 13, 16.75, HALF, 0.5);
    carsInRow(c, rng, -17, 3.0, 13, 22.25, -HALF, 0.5);
    for (let i = 0; i < 2; i++) mark(k, 1 + i * 3, 4.25, 2.4, 4.8, 0x2c5ca8);
    for (const lx of [-15, 0, 15, 28]) lampPost(k, lx, 12.3, 0, 8, true);
    // front lawn strip, trees, signs
    lawn(k, 0, 29.3, 80, 3.4);
    for (let i = -3; i <= 3; i++) shrub(k, i * 11, 30.2, 1.0);
    maple(k, -26, 29.5, 8);
    maple(k, 18, 29.5, 7);
    k.at(-10, 28.4, 0, () => {
      k.box(0, 0, 0, 0.18, 4.6, 0.18, 0x55585c, 'metal');
      k.sign(0, 3.3, 0.12, 1.5, 2.1, hSign, { thick: 0.05, twoSided: true });
      k.solid(0, 0, 0.4, 0.4);
    });
    pole(k, c.signs, 8, 27.5, 10);
    for (let i = 0; i < 3; i++) bench(k, -2 + i * 3, -6.5, 0);
    planter(k, 11, -6.5);
    planter(k, -4.5, -6.5);
  });
}
CIVIC.push({ id: 'hospital', name: 'Silver Valley Medical Center', w: 80, d: 62, front: 24, tags: ['civic', 'medical', 'landmark'], build: hospital });

/* ------------------------------------------------------------------------------------------------
 * 4. Pine County Sheriff & Jail
 * ---------------------------------------------------------------------------------------------- */
function sheriffJail(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  const TAN = 0xf2e6cf;
  const BAND = 0xcfc9bd;
  const FR = 0x3a342d;
  const GL = 0x24303b;
  const badge = lineSign(c, 'sh.name', 640, 128, '#16294a', [
    { text: 'PINE COUNTY', font: F_SLAB, color: '#e9c94a', y: 0.3, size: 0.34, letter: 3 },
    { text: "SHERIFF'S OFFICE", font: F_OSW, weight: '700', color: '#ffffff', y: 0.72, size: 0.36, letter: 4 },
  ], { border: '#e9c94a', borderW: 6, draw: (g) => star(g, 70, 64, 46, 20, '#e9c94a') });
  const jailSign = lineSign(c, 'sh.jail', 512, 80, '#f4f1e8', [{ text: 'COUNTY JAIL · VISITORS USE FRONT DOOR', font: F_OSW, weight: '700', color: '#16294a', y: 0.52, size: 0.5, maxW: 0.94 }]);
  const hours = lineSign(c, 'sh.hours', 192, 128, '#16294a', [{ text: 'OPEN 24 HRS', font: F_OSW, weight: '700', color: '#ffffff', y: 0.34, size: 0.22 }, { text: 'DIAL 911', font: F_SLAB, color: '#e9c94a', y: 0.7, size: 0.3 }], { border: '#e9c94a', borderW: 5 });
  c.occ.add(x, z, 56, 42, ry, 1, false);
  k.at(x, z, ry, () => {
    // ---- admin block (2 storeys): x -23..7, z 1..14.5
    k.at(-8, 7.75, 0, () => {
      const w = 30;
      const d = 13.5;
      const h = 8.0;
      k.solid(0, 0, w, d);
      k.box(0, 0, 0, w, h, d, TAN, 'brickTan');
      k.box(0, 0, 0, w + 0.3, 0.5, d + 0.3, 0x9b9893, 'concrete');
      k.box(0, 3.9, 0, w + 0.2, 0.4, d + 0.2, BAND, 'concrete');
      k.box(0, h, 0, w + 0.5, 0.4, d + 0.5, BAND, 'concrete');
      flatRoof(k, w, d, h + 0.4, 0.6, BAND);
      onFace(k, 'f', w, d, (_len, f) => {
        for (const wx of [-12, -8.5, -5, 5, 8.5, 12]) {
          windowAt(k, wx, 1.2, f, 2.2, 1.9, { frame: FR, mx: 2, my: 1, glass: GL });
          windowAt(k, wx, 5.0, f, 2.2, 1.9, { frame: FR, mx: 2, my: 1, glass: GL });
        }
        k.box(0, 0, f + 2.0, 9.5, 0.2, 4.0, 0xd0cfca, 'concrete');
        storefront(k, -2.2, 2.2, 0.2, f, 3.2, { frame: FR, doorW: 2.2 });
        k.box(0, 3.4, f + 2.2, 9.5, 0.45, 4.4, BAND, 'concrete');
        for (const sx of [-4.4, 4.4]) k.box(sx, 0.2, f + 3.9, 0.5, 3.2, 0.5, BAND, 'concrete');
        k.sign(0, 5.1, f + 0.12, 9.4, 1.9, badge, { thick: 0.08, back: 0x16294a });
        k.sign(5.8, 1.9, f + 0.06, 1.3, 0.9, hours, { thick: 0.05 });
      });
      for (const s of ['l', 'b'] as Side[]) onFace(k, s, w, d, (len, f) => {
        const n = Math.floor((len - 3) / 3.6);
        for (let i = 0; i < n; i++) {
          const wx = -((n - 1) * 3.6) / 2 + i * 3.6;
          windowAt(k, wx, 1.2, f, 1.6, 1.9, { frame: FR, mx: 2, my: 1, glass: GL });
          windowAt(k, wx, 5.0, f, 1.6, 1.9, { frame: FR, mx: 2, my: 1, glass: GL });
        }
      });
      rooftop(k, rng, w, d, h + 0.45, 3);
      flagPole(k, c.signs, 12.5, 0, 12);
    });
    // ---- sally port garage x 8..20, z 3..12
    k.at(14, 8, 0, () => {
      const w = 12;
      const d = 10;
      const h = 4.6;
      k.solid(0, 0, w, d);
      k.box(0, 0, 0, w, h, d, TAN, 'brickTan');
      k.box(0, h, 0, w + 0.4, 0.4, d + 0.4, BAND, 'concrete');
      flatRoof(k, w, d, h + 0.4, 0.5, BAND);
      onFace(k, 'f', w, d, (_len, f) => {
        k.box(0, 0, f + 0.04, 7.4, 3.8, 0.08, 0x3a3d41, 'paint');
        k.box(0, 0.05, f + 0.1, 6.8, 3.6, 0.06, 0xb9bcc0, 'rollup');
        k.box(0, 3.85, f + 0.12, 7.6, 0.25, 0.2, 0xe9c94a);
        k.sign(0, 4.9, f + 0.3, 6.2, 0.7, jailSign, { thick: 0.08, back: 0x16294a, frame: 0.1 });
      });
      k.box(-w / 2 - 0.1, 0, d / 2 + 0.3, 0.2, 2.0, 0.2, 0x55585c, 'metal');
    });
    // ---- jail wing (2 storeys, slit windows) x 4..27, z -20..3
    k.at(15.5, -8.5, 0, () => {
      const w = 23;
      const d = 23;
      const h = 8.4;
      k.solid(0, 0, w, d);
      k.box(0, 0, 0, w, h, d, TAN, 'brickTan');
      k.box(0, 0, 0, w + 0.3, 0.5, d + 0.3, 0x9b9893, 'concrete');
      k.box(0, h, 0, w + 0.5, 0.5, d + 0.5, BAND, 'concrete');
      flatRoof(k, w, d, h + 0.5, 0.5, BAND);
      for (const s of ['f', 'r', 'b', 'l'] as Side[]) onFace(k, s, w, d, (len, f) => {
        const n = Math.floor((len - 2) / 2.4);
        for (let i = 0; i < n; i++) {
          if (s === 'f' && i < 2) continue;
          const wx = -((n - 1) * 2.4) / 2 + i * 2.4;
          for (const wy of [1.8, 5.4]) {
            k.box(wx, wy, f + 0.02, 0.4, 1.7, 0.1, 0x20262b, 'glass');
            k.box(wx, wy - 0.12, f + 0.05, 0.62, 0.12, 0.12, BAND, 'concrete');
          }
        }
      });
      for (const lx of [-9, -3, 3, 9]) k.box(lx, h + 0.5, 0, 0.12, 1.4, 0.12, 0x6b6f74, 'metal', { cast: false });
      for (const s of [-1, 1]) {
        k.box(s * (w / 2 - 0.2), h + 1.15, 0, 0.05, 0.28, d - 0.4, 0x6b6f74, 'metal', { cast: false });
        k.box(0, h + 1.15, s * (d / 2 - 0.2), w - 0.4, 0.28, 0.05, 0x6b6f74, 'metal', { cast: false });
      }
      k.cyl(-7, h + 0.5, -6, 1.1, 1.1, 1.8, 8, 0xb9b4ab, 'concrete');
      k.box(5, h + 0.5, -4, 4, 2.2, 3.5, 0xd0cfca, 'concrete');
    });
    // ---- exercise yard
    slab(k, -12, -10, 22, 16, 0.12, 0xb8b6b0);
    securityFence(k, [[-23, -18], [-1, -18], [-1, -2], [-23, -2], [-23, -18]], 0, 3.4);
    k.cyl(-8, 0.12, -14, 0.07, 0.07, 3.0, 6, 0x6b6f74, 'metal');
    k.box(-8, 3.05, -13.5, 1.8, 1.1, 0.08, 0xe8e6e0);
    k.torus(-8, 2.95, -12.85, 0.34, 0.03, 4, 12, 0xd9531e, 'metal', { rx: HALF });
    for (let i = 0; i < 2; i++) bench(k, -18 + i * 5, -4.2, Math.PI);
    // ---- front lot: three cruisers + visitor spaces
    pave(k, -4, 18.5, 40, 5.8, 0x5f636a);
    slab(k, 20, 18.5, 14, 5.8, 0.1, 0xb8b6b0);
    for (const px of [-23, -19.5, -16, -12.5]) mark(k, px, 18.2, 0.11, 5.2);
    for (const lx of [-20.5, -17.5, -14.5]) park(c, 'sheriff', lx - 0.0 + 0.0, 18.3, HALF, 0x0a0a0a);
    park(c, 'sheriffSuv', -9.2, 18.3, HALF, 0x0a0a0a);
    park(c, 'pickup', -3.0, 18.3, HALF, rng.pick(CAR_COLORS));
    park(c, 'sedan', 3.2, 18.3, HALF, rng.pick(CAR_COLORS));
    lampPost(k, 2, 15.5, 0, 7.5, true);
    lampPost(k, -26, 15.8, 0, 7.5);
    for (let i = -1; i <= 1; i++) shrub(k, 12 + i * 4, 15.6, 0.9);
    conifer(k, 24, 17, 7);
    conifer(k, 26, 10, 6);
  });
}
CIVIC.push({ id: 'sheriffJail', name: 'Pine County Sheriff & Jail', w: 56, d: 42, front: 14.5, tags: ['civic', 'police', 'landmark'], build: sheriffJail });

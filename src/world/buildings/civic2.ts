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
  const SLATE = 0x3d424b;
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
        for (let j = 0; j < 7; j++) k.box(sx * (W / 2 + 0.02) + sx * (j % 2) * 0.12, B + j * 1.3, sz * (zf + 0.02), 0.9 + (j % 2) * 0.35, 0.7, 0.9 + (j % 2) * 0.35, STONE, 'stone');
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
          k.box(0, sh + 0.1, f + 0.1, T + 0.2, 4.0 - 0.2, 0.0, 0xffffff, 'brickRed');
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

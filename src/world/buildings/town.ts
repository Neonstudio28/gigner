import * as THREE from 'three';
import type { BuildingDef } from './catalog';
import { type Ctx, windowAt, doorAt, storefront, flatRoof, rooftop, flagPole, downspout } from './common';
import type { Col, Kit, SignRef } from '../core/kit';
import { Rng } from '../core/rng';
import { P, CAR_COLORS } from '../palette';
import { vehicle, VEHICLE_LENGTH, type VehicleType, type VehicleOpts } from '../vehicles';
import { bench, dumpster, tireStack, barrel, picketFence, securityFence, trashCan, pallet, cafeTable } from '../props';
import { person, randomPerson } from '../people';
import { panelSign, type Line } from '../textures';

/* ------------------------------------------------------------------------------------------------
 * Pine Hollow services and workplaces: the places a role-play town needs (hospital, schools,
 * garages, tow yard, public works, freight, truck stop, lodge, campground, cemetery, parks,
 * halls and offices). Local frame: street side = +Z, base at y = 0, footprint centred.
 * ---------------------------------------------------------------------------------------------- */

const ASPH = 0x6f737b;
const WHITE = 0xf1f1ec;
const CURB = 0xb8babc;
const STEEL = 0x8a8f94;
const F_OS = 'Oswald';
const F_SLAB = 'Alfa Slab One';
const HALF = Math.PI / 2;

const sgn = (c: Ctx, key: string, draw: () => HTMLCanvasElement): SignRef => c.signs.custom(`town:${key}`, draw);

/** Two-line wall/pole sign. */
export function board(c: Ctx, key: string, title: string, sub: string, bg: string, fg: string, o: { font?: string; w?: number; h?: number; border?: string } = {}): SignRef {
  const w = o.w ?? 1024;
  const h = o.h ?? 256;
  const lines: Line[] = [{ text: title, font: o.font ?? F_OS, weight: '700', color: fg, y: sub ? 0.4 : 0.53, size: sub ? 0.46 : 0.6, maxW: 0.92 }];
  if (sub) lines.push({ text: sub, font: F_OS, weight: '500', color: fg, y: 0.8, size: 0.2, maxW: 0.9, letter: 4 });
  return sgn(c, key, () => panelSign(w, h, bg, lines, { border: o.border ?? fg, borderW: Math.round(h * 0.04), radius: Math.round(h * 0.07) }));
}

function def(id: string, name: string, w: number, d: number, tags: string[], build: BuildingDef['build'], front?: number): BuildingDef {
  return { id, name, w, d, tags, front, build };
}

/* ------------------------------------------------------------------------- site helpers */

function pave(k: Kit, cx: number, cz: number, w: number, d: number, col: Col = ASPH) {
  k.box(cx, 0, cz, w, 0.04, d, col, 'asphalt', { cast: false });
}
function slab(k: Kit, cx: number, cz: number, w: number, d: number, h = 0.1, col: Col = P.concrete) {
  k.box(cx, 0, cz, w, h, d, col, 'concrete', { cast: false });
}
function mark(k: Kit, x: number, z: number, w: number, d: number, col: Col = WHITE) {
  k.plane(x, 0.046, z, w, d, col, 'decal');
}
/** Stall lines across a lot strip: dividers along Z between z0..z1, n stalls starting at x0. */
function stalls(k: Kit, x0: number, pitch: number, n: number, z0: number, z1: number) {
  for (let i = 0; i <= n; i++) mark(k, x0 + i * pitch, (z0 + z1) / 2, 0.11, z1 - z0);
}
function lawn(k: Kit, x: number, z: number, w: number, d: number, col: Col = P.lawn) {
  k.box(x, 0, z, w, 0.06, d, col, 'paint', { cast: false });
}
function shrub(k: Kit, x: number, z: number, r: number, col: Col = 0x3f5e30) {
  k.ico(x, r * 0.7, z, r, 0, col, 'paint', 1, 0.8, 1);
}
function conifer(k: Kit, x: number, z: number, h: number) {
  k.cyl(x, 0, z, 0.12, 0.2, h * 0.3, 5, P.trunk);
  k.cone(x, h * 0.18, z, h * 0.3, h * 0.46, 6, 0x2f4c2a);
  k.cone(x, h * 0.45, z, h * 0.23, h * 0.38, 6, 0x35562f);
  k.cone(x, h * 0.68, z, h * 0.15, h * 0.32, 6, 0x3d6034);
}
function lamp(k: Kit, x: number, z: number, ry = 0, h = 8) {
  k.at(x, z, ry, () => {
    k.solid(0, 0, 0.5, 0.5);
    k.box(0, 0, 0, 0.7, 0.35, 0.7, CURB, 'concrete');
    k.cyl(0, 0.35, 0, 0.09, 0.13, h, 6, 0x4b4f54, 'metal');
    k.box(0.55, h + 0.3, 0, 1.1, 0.08, 0.1, 0x4b4f54, 'metal');
    k.box(1.15, h + 0.2, 0, 0.9, 0.16, 0.4, 0x3a3d41, 'metal');
    k.box(1.15, h + 0.15, 0, 0.7, 0.04, 0.3, 0xfff1d0, 'light', { cast: false });
  });
}
function park(c: Ctx, type: VehicleType, x: number, z: number, ry: number, color: Col, o?: VehicleOpts) {
  vehicle(c.kit, c.signs, type, x, z, ry, color, o);
  c.kit.solid(x, z, VEHICLE_LENGTH[type] - 0.2, 2.0, ry);
}
/** Tractor-trailer; (x, z) is the tractor origin, the trailer runs 15 m back along local -X. */
function parkSemi(c: Ctx, x: number, z: number, ry: number, color: Col) {
  vehicle(c.kit, c.signs, 'semi', x, z, ry, color, { trailer: true, accent: 0xf2f1ec });
  c.kit.at(x, z, ry, () => c.kit.solid(-5.6, 0, 18.6, 2.6));
}
/** A lot of nose-in parked cars along X at row z (facing ±Z), skipping some stalls. */
function parkRow(c: Ctx, rng: Rng, x0: number, pitch: number, n: number, z: number, faceZ: 1 | -1, fill = 0.6) {
  for (let i = 0; i < n; i++) {
    if (!rng.chance(fill)) continue;
    const t: VehicleType = rng.pick(['sedan', 'sedan', 'pickup', 'wagon', 'suv', 'van', 'coupe', 'pickup'] as const);
    park(c, t, x0 + pitch * (i + 0.5), z, faceZ > 0 ? -HALF : HALF, rng.pick(CAR_COLORS), t === 'pickup' && rng.chance(0.4) ? { accent: 0xf2f1ec } : {});
  }
}
/** Box building with parapet roof; (x, z) is the centre in the current frame, front at z + d/2. */
function flatBlock(k: Kit, rng: Rng, x: number, z: number, w: number, d: number, H: number, col: Col, mat: string, units = 1) {
  k.solid(x, z, w, d);
  k.box(x, 0, z, w + 0.08, 0.4, d + 0.08, 0x8f8c87, 'concrete');
  k.box(x, 0, z, w, H, d, col, mat);
  k.at(x, z, 0, () => {
    flatRoof(k, w, d, H, 0.6);
    rooftop(k, rng, w, d, H, units);
  });
}
/** Evenly spaced windows on a +Z wall at zf between x0..x1. */
function winRow(k: Kit, x0: number, x1: number, n: number, y: number, zf: number, w: number, h: number, frame: Col, o: { mx?: number; my?: number } = {}) {
  for (let i = 0; i < n; i++) windowAt(k, x0 + ((x1 - x0) * (i + 0.5)) / n, y, zf, w, h, { frame, mx: o.mx ?? 2, my: o.my ?? 1 });
}
function rollDoor(k: Kit, x: number, zf: number, w: number, h: number, frame: Col = 0x8a8e92) {
  k.box(x, 0, zf + 0.02, w + 0.3, h + 0.2, 0.08, frame, 'metal');
  k.box(x, 0, zf + 0.06, w, h, 0.06, 0xd9dadc, 'rollup');
}
/** Simple yellow school bus; length along local X (front at +X). */
function schoolBus(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    k.solid(0, 0, 11.2, 2.6);
    k.box(-0.5, 0.55, 0, 10.2, 2.35, 2.5, 0xe8a91c, 'gloss');
    k.box(5.25, 0.55, 0, 1.3, 1.3, 2.4, 0xe8a91c, 'gloss');
    k.box(-0.5, 2.9, 0, 10.0, 0.18, 2.3, 0xe8a91c, 'gloss');
    k.box(4.62, 1.75, 0, 0.05, 0.95, 2.2, P.glass, 'glass');
    for (const s of [-1, 1]) {
      for (let i = 0; i < 8; i++) k.box(-4.9 + i * 1.12, 1.75, s * 1.26, 0.9, 0.75, 0.04, P.glass, 'glass');
      k.box(-0.5, 1.45, s * 1.27, 10.2, 0.1, 0.02, 0x1b1b1d);
      k.box(-0.5, 0.95, s * 1.27, 10.2, 0.1, 0.02, 0x1b1b1d);
      for (const wx of [-3.6, 3.9]) k.cylZ(wx, 0.5, s * 1.1, 0.5, 0.38, 10, 0x1a1a1b, 'rubber');
    }
    k.box(5.95, 0.4, 0, 0.12, 0.3, 2.45, 0x2b2d31, 'metal');
    k.box(-5.65, 0.4, 0, 0.12, 0.3, 2.45, 0x2b2d31, 'metal');
  });
}
/** Steel lattice light / radio mast, square in plan; base half-width b, top half-width t. */
function lattice(k: Kit, x: number, z: number, h: number, b: number, t: number, col: Col = STEEL, bands = false) {
  const leg = (sx: number, sz: number) => k.beam({ x: x + sx * b, y: 0, z: z + sz * b }, { x: x + sx * t, y: h, z: z + sz * t }, 0.16, 0.16, col, 'metal');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(sx, sz);
  const n = Math.max(2, Math.round(h / 4));
  for (let i = 0; i < n; i++) {
    const y0 = (h * i) / n;
    const y1 = (h * (i + 1)) / n;
    const w0 = b + ((t - b) * i) / n;
    const w1 = b + ((t - b) * (i + 1)) / n;
    const c = bands && i % 2 ? 0xd8322a : col;
    for (const s of [-1, 1]) {
      k.beam({ x: x - w0, y: y0, z: z + s * w0 }, { x: x + w1, y: y1, z: z + s * w1 }, 0.06, 0.06, c, 'metal', false);
      k.beam({ x: x + s * w0, y: y0, z: z - w0 }, { x: x + s * w1, y: y1, z: z + w1 }, 0.06, 0.06, c, 'metal', false);
    }
  }
  k.solid(x, z, b * 2 + 0.4, b * 2 + 0.4);
}

/* ================================================================================================
 * Silver Valley Medical Center
 * ============================================================================================== */
function hospital(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 64, 56, ry, 1, false);
  const name = board(c, 'hosp.name', 'SILVER VALLEY MEDICAL CENTER', '', '#f4f1ea', '#1f4f6b', { h: 160, border: '#f4f1ea' });
  const er = board(c, 'hosp.er', 'EMERGENCY', '', '#c8262c', '#ffffff', { h: 200 });
  const helo = sgn(c, 'hosp.heli', () => panelSign(512, 512, '#4b4f54', [{ text: 'H', font: F_OS, weight: '700', color: '#ffffff', y: 0.53, size: 0.7 }], { border: '#f2c94c', borderW: 22, radius: 256 }));
  const monument = board(c, 'hosp.mon', 'SILVER VALLEY MEDICAL CENTER', 'EMERGENCY · CLINIC · LAB', '#1f4f6b', '#ffffff');
  k.at(x, z, ry, () => {
    pave(k, 0, 6, 64, 44);
    // main three-storey block
    const MX = -8;
    const MZ = -15;
    flatBlock(k, rng, MX, MZ, 40, 18, 11.2, 0xe9e4d8, 'stucco', 1);
    for (let f = 0; f < 3; f++) {
      k.box(MX, 1.0 + f * 3.6, MZ + 9.02, 40, 1.5, 0.06, 0x8fb1c4, 'glass');
      k.box(MX, 0.85 + f * 3.6, MZ + 9.05, 40.1, 0.15, 0.1, 0xb9b4ab, 'concrete');
      for (const s of [-1, 1]) k.at(MX + s * 20, MZ, s * HALF, () => winRow(k, -8, 8, 5, 1.0 + f * 3.6, 0, 1.4, 1.5, 0xb9b4ab));
    }
    k.sign(MX, 12.4, MZ + 9.1, 26, 1.6, name, {});
    // main entrance canopy
    k.box(MX, 0, MZ + 11.5, 12, 0.15, 5, CURB, 'concrete', { cast: false });
    for (const s of [-1, 1]) k.box(MX + s * 5.5, 0, MZ + 13.6, 0.35, 3.6, 0.35, 0xb9b4ab, 'concrete');
    k.box(MX, 3.6, MZ + 11.6, 12.4, 0.5, 5.2, 0xd9d6cc, 'concrete');
    storefront(k, MX - 4, MX + 4, 0.4, MZ + 9, 3.2, { frame: 0x3a3d41 });
    // helipad on the roof
    k.box(MX + 8, 11.25, MZ, 13, 0.2, 13, 0x4b4f54, 'concrete');
    k.signPlane(MX + 8, 11.47, MZ, 12, 12, helo, { rx: -HALF });
    for (const [lx, lz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) k.box(MX + 8 + lx, 11.45, MZ + lz, 0.3, 0.2, 0.3, 0xffd24a, 'light');
    // ER wing with ambulance canopy
    const EX = 22;
    const EZ = -13;
    flatBlock(k, rng, EX, EZ, 20, 14, 5.2, 0xe9e4d8, 'stucco', 2);
    k.sign(EX, 5.9, EZ + 7.1, 10, 1.6, er, {});
    for (const gx of [EX - 5, EX + 1]) storefront(k, gx - 2, gx + 2, 0.4, EZ + 7, 2.8, { frame: 0x3a3d41 });
    k.box(EX, 0, EZ + 11, 18, 0.15, 8, CURB, 'concrete', { cast: false });
    for (const s of [-1, 1]) for (const zz of [EZ + 14.6]) k.box(EX + s * 8.4, 0, zz, 0.4, 4.4, 0.4, 0xb9b4ab, 'concrete');
    k.box(EX, 4.4, EZ + 11, 18.8, 0.6, 8.4, 0xd9d6cc, 'concrete');
    k.box(EX, 4.4, EZ + 15.22, 18.8, 0.6, 0.06, 0xc8262c, 'paint');
    park(c, 'van', EX - 4, EZ + 11.5, -HALF, 0xf4f2ec, { accent: 0xc8262c });
    park(c, 'van', EX + 3, EZ + 11.5, -HALF, 0xf4f2ec, { accent: 0xc8262c });
    // parking lot
    for (const row of [7, 21]) {
      stalls(k, -30, 3, 18, row - 5, row + 5);
      parkRow(c, rng, -30, 3, 18, row - 2.4, -1, 0.55);
      parkRow(c, rng, -30, 3, 18, row + 2.4, 1, 0.45);
    }
    for (const lx of [-22, 0, 22]) lamp(k, lx, 14, 0);
    // monument sign, flag, shrubs
    k.box(-26, 0, 25.5, 6.6, 0.5, 1.2, 0x9b9893, 'stone');
    k.sign(-26, 1.3, 26.15, 6.2, 1.55, monument, { back: 0x1f4f6b, thick: 0.4 });
    k.solid(-26, 25.5, 6.6, 1.2);
    flagPole(k, c.signs, -20, -2, 11);
    for (let i = 0; i < 8; i++) {
      const sx = -27 + i * 5.2;
      if (Math.abs(sx - MX) > 6.5) shrub(k, sx, -4.3, 0.7);
    }
  });
}

/* ================================================================================================
 * Schools
 * ============================================================================================== */
function playground(k: Kit, x: number, z: number) {
  k.at(x, z, 0, () => {
    k.box(0, 0, 0, 16, 0.1, 12, 0xb08a5a, 'gravel', { cast: false });
    // swing set
    for (const s of [-1, 1]) {
      k.beam({ x: -6.5, y: 0, z: -3 + s * 0.9 }, { x: -6.5, y: 2.6, z: -3 }, 0.1, 0.1, 0xc8262c, 'metal');
      k.beam({ x: -1.5, y: 0, z: -3 + s * 0.9 }, { x: -1.5, y: 2.6, z: -3 }, 0.1, 0.1, 0xc8262c, 'metal');
    }
    k.box(-4, 2.55, -3, 5.2, 0.1, 0.1, 0xc8262c, 'metal');
    for (const sx of [-5.2, -4, -2.8]) {
      k.box(sx, 0.9, -3, 0.02, 1.65, 0.02, 0x333333, 'metal');
      k.box(sx, 0.85, -3, 0.5, 0.05, 0.2, 0x1b1b1d, 'rubber');
    }
    // climbing frame and slide
    k.box(3.5, 0, 2, 2.4, 1.6, 2.4, 0x2c4a8c, 'paint');
    k.box(3.5, 1.6, 2, 2.6, 0.1, 2.6, 0xe6c229, 'paint');
    k.roof(3.5, 3.0, 2, 2.6, [[1.4, 0], [0, 0.8], [-1.4, 0]], 0xc8262c, 'paint', { thick: 0.08, eaveOH: 0.05, gableOH: 0.05 });
    for (const [px, pz] of [[2.3, 0.8], [4.7, 0.8], [2.3, 3.2], [4.7, 3.2]]) k.box(px, 1.6, pz, 0.12, 1.4, 0.12, 0xe6c229, 'paint');
    k.beam({ x: 3.5, y: 1.65, z: 3.3 }, { x: 3.5, y: 0.15, z: 6.2 }, 0.9, 0.08, 0xe6c229, 'gloss');
    // monkey bars
    for (const s of [-1, 1]) k.box(-3, 0, 3.5 + s * 0.6, 0.08, 2.1, 0.08, 0x2f6b4a, 'metal');
    for (const s of [-1, 1]) k.box(-3 + s * 2.4, 0, 4.1, 0.08, 2.1, 0.08, 0x2f6b4a, 'metal');
    for (const s of [-1, 1]) k.box(-3, 2.05, 3.5 + s * 0.6, 4.9, 0.06, 0.06, 0x2f6b4a, 'metal');
    for (let i = 0; i < 9; i++) k.box(-5.2 + i * 0.55, 2.05, 3.5, 0.05, 0.05, 1.2, 0x2f6b4a, 'metal');
    k.solid(0, 0, 14, 10);
  });
}

function elementary(id: string, title: string, sub: string) {
  return def(id, title, 64, 48, ['civic', 'school'], (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed);
    c.occ.add(x, z, 64, 48, ry, 1, false);
    const sign = board(c, `${id}.sign`, title.toUpperCase(), sub, '#f4f1ea', '#7a2c25', { font: F_SLAB, h: 220 });
    k.at(x, z, ry, () => {
      // single-storey brick classroom wing + taller gym
      flatBlock(k, rng, -8, -12, 44, 13, 4.6, 0xffffff, 'brickRed', 3);
      winRow(k, -29, -11, 5, 1.1, -5.5, 1.9, 1.7, 0xf1ece1, { mx: 3, my: 2 });
      winRow(k, -1, 13, 4, 1.1, -5.5, 1.9, 1.7, 0xf1ece1, { mx: 3, my: 2 });
      flatBlock(k, rng, 22, -12, 16, 20, 8.0, 0xffffff, 'brickTan', 2);
      k.at(22, -2, 0, () => winRow(k, -6, 6, 4, 5.4, 0, 2.2, 1.5, 0xf1ece1, { mx: 3, my: 1 }));
      // entrance
      storefront(k, -9, -3, 0.4, -5.5, 3.0, { frame: 0x3a3d41 });
      k.box(-6, 3.4, -3.3, 9, 0.45, 4.6, 0xd9d6cc, 'concrete');
      for (const s of [-1, 1]) k.box(-6 + s * 4.2, 0, -1.2, 0.3, 3.4, 0.3, 0xd9d6cc, 'concrete');
      k.sign(-6, 4.4, -5.42, 11, 1.4, sign, {});
      // bus loop and buses
      pave(k, -2, 6, 52, 12);
      slab(k, -2, -0.6, 30, 1.6, 0.15);
      schoolBus(k, -14, 5, 0);
      schoolBus(k, 2, 5, 0);
      if (rng.chance(0.6)) schoolBus(k, 17, 9, 0);
      flagPole(k, c.signs, -20, -1.5, 10);
      lawn(k, 0, 18, 60, 10);
      for (let i = 0; i < 6; i++) if (Math.abs(-27 + i * 4.6 + 6) > 5.5) shrub(k, -27 + i * 4.6, -4.6, 0.6);
      playground(k, 22, 17);
      for (const bx of [-24, -12]) bench(k, bx, 15, 0);
      for (let i = 0; i < 4; i++) person(k, 12 + i * 1.3, 14 + (i % 2), rng.range(0, 6), { ...randomPerson(rng), shirt: rng.pick([0xc8262c, 0x2c4a8c, 0xe6c229, 0x2f6b4a]) });
    });
  });
}

function highSchool(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 92, 52, ry, 1, false);
  const sign = board(c, 'hs.sign', 'PINE HOLLOW HIGH SCHOOL', 'HOME OF THE LOGGERS', '#1f3d2b', '#f2c94c', { font: F_SLAB, h: 230 });
  k.at(x, z, ry, () => {
    // two-storey classroom block
    flatBlock(k, rng, -12, -14, 60, 16, 8.4, 0xffffff, 'brickBrown', 4);
    for (const fy of [1.1, 4.8]) {
      winRow(k, -41, -18, 7, fy, -6, 1.8, 1.9, 0xf1ece1, { mx: 3, my: 2 });
      winRow(k, -6, 17, 7, fy, -6, 1.8, 1.9, 0xf1ece1, { mx: 3, my: 2 });
    }
    // entrance tower
    k.box(-12, 0, -5.4, 10, 10.2, 2.0, 0xffffff, 'brickRed');
    storefront(k, -15, -9, 0.4, -4.4, 3.2, { frame: 0x3a3d41 });
    k.sign(-12, 6.4, -4.32, 9, 2.0, sign, {});
    k.box(-12, 10.2, -5.4, 10.4, 0.4, 2.4, 0xd9d6cc, 'concrete');
    // gymnasium with a low arched roof
    k.solid(31, -12, 26, 22);
    k.box(31, 0, -12, 26, 9.0, 22, 0xffffff, 'brickTan');
    k.at(31, -12, HALF, () => k.roof(0, 9.0, 0, 22, [[13, 0], [8, 1.6], [3, 2.4], [-3, 2.4], [-8, 1.6], [-13, 0]], 0x8a8e92, 'roofMetal', { eaveOH: 0.4, gableOH: 0.3, fill: 0xffffff, fillMat: 'brickTan' }));
    k.at(31, -1, 0, () => {
      doorAt(k, -3, 0, 0, 1.8, 2.4, 0x2b4a3a, { double: true });
      doorAt(k, 3, 0, 0, 1.8, 2.4, 0x2b4a3a, { double: true });
      winRow(k, -10, 10, 5, 6.0, 0, 2.6, 1.6, 0xf1ece1, { mx: 3 });
    });
    k.sign(31, 4.0, -0.9, 12, 1.4, board(c, 'hs.gym', 'LOGGERS GYM', '', '#1f3d2b', '#f2c94c', { h: 160 }), {});
    // front lot, flag, buses
    pave(k, 0, 12, 90, 22);
    stalls(k, -44, 3, 22, 13, 23);
    parkRow(c, rng, -44, 3, 22, 18, 1, 0.65);
    for (let i = 0; i < 3; i++) schoolBus(k, 16, 4 + i * 3.2, 0);
    flagPole(k, c.signs, -26, -3, 11);
    for (const lx of [-30, 0, 30]) lamp(k, lx, 12, 0);
    for (let i = 0; i < 8; i++) if (Math.abs(-40 + i * 5 + 12) > 6.5) shrub(k, -40 + i * 5, -5.2, 0.7);
  });
}

function footballField(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  c.occ.add(x, z, 118, 76, ry, 1, false);
  const score = board(c, 'hs.score', 'LOGGERS', 'HOME 21 · GUEST 14', '#1f3d2b', '#f2c94c', { h: 320 });
  k.at(x, z, ry, () => {
    // turf (100 yd + end zones = 109.7 × 48.8 m) on a grass apron
    lawn(k, 0, 0, 116, 60, 0x6a8f3c);
    k.box(0, 0.02, 0, 110, 0.06, 49, 0x5f8f3a, 'paint', { cast: false });
    for (let i = -5; i <= 5; i++) mark(k, i * 9.144, 0, i === 0 ? 0.3 : 0.16, 48.8);
    for (const s of [-1, 1]) {
      k.plane(s * 50.29, 0.09, 0, 9.14, 48.8, 0x1f3d2b, 'decal');
      // goalposts
      k.box(s * 55.2, 0, 0, 0.2, 3.0, 0.2, 0xf2c94c, 'metal');
      k.box(s * 55.2, 3.0, 0, 0.18, 0.18, 5.6, 0xf2c94c, 'metal');
      for (const gz of [-2.8, 2.8]) k.box(s * 55.2, 3.0, gz, 0.12, 6.0, 0.12, 0xf2c94c, 'metal');
      k.solid(s * 55.2, 0, 0.4, 0.4);
    }
    // stepped bleachers on both long sides, facing the field
    for (const s of [-1, 1]) {
      k.at(0, s * 34, s > 0 ? Math.PI : 0, () => {
        k.solid(0, 0, 50, 7);
        for (let i = 0; i < 6; i++) k.box(0, 0, -i * 0.575, 50, 0.45 * (i + 1), 7 - i * 1.15, 0x9ea2a6, 'metal');
        for (let i = 0; i < 6; i++) k.box(0, 0.45 * (i + 1), 3.25 - i * 1.15, 50, 0.08, 0.5, 0xc9ccd0, 'metal');
        if (s < 0) {
          k.box(0, 2.7, -2.4, 10, 2.8, 2.2, 0xf2efe8, 'siding');
          k.box(0, 5.5, -2.4, 10.4, 0.3, 2.6, 0x1f3d2b);
          k.box(0, 3.4, -1.28, 9, 1.0, 0.05, P.glass, 'glass');
        }
      });
    }
    // light towers between the bleachers and the end zones
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      k.solid(sx * 40, sz * 30, 1, 1);
      k.cyl(sx * 40, 0, sz * 30, 0.25, 0.35, 22, 8, 0x8a8e92, 'metal');
      k.box(sx * 40, 22, sz * 30, 5, 2.2, 0.6, 0x3a3d41, 'metal');
      k.box(sx * 40, 22.2, sz * 30 - sz * 0.32, 4.6, 1.8, 0.04, 0xfff1d0, 'light');
    }
    // scoreboard behind the west end zone
    for (const s of [-1, 1]) k.box(-57.5, 0, s * 2.5, 0.4, 6, 0.4, 0x3a3d41, 'metal');
    k.sign(-57.5, 7.5, 0, 9, 3, score, { ry: HALF, back: 0x1f3d2b, thick: 0.5, twoSided: true });
    k.solid(-57.5, 0, 1, 6);
  });
}

/* ================================================================================================
 * Valley Thriftway supermarket
 * ============================================================================================== */
function supermarket(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 60, 62, ry, 1, false);
  const sign = sgn(c, 'thriftway', () =>
    panelSign(1024, 220, null, [
      { text: 'Valley Thriftway', font: 'Lobster', color: '#c8262c', y: 0.42, size: 0.62, stroke: '#ffffff', strokeW: 10 },
      { text: 'FOOD · DRUG · DELI · BAKERY', font: F_OS, weight: '600', color: '#1f3d2b', y: 0.86, size: 0.18, letter: 5 },
    ]),
  );
  k.at(x, z, ry, () => {
    flatBlock(k, rng, 0, -16, 52, 30, 7.0, 0xe4dccb, 'stucco', 4);
    k.box(0, 6.2, -0.9, 52.2, 1.6, 0.4, 0x2f6b4a, 'paint');
    k.box(0, 3.4, 0.5, 30, 0.4, 3.2, 0xe4dccb, 'stucco');
    storefront(k, -12, 12, 0.4, -1, 3.0, { frame: 0x2a2a2a, doorX: -6 });
    k.sign(0, 5.6, -0.65, 16, 3.4, sign, {});
    for (const s of [-1, 1]) k.box(s * 15, 0, 0.6, 0.6, 3.4, 0.6, 0xe4dccb, 'stucco');
    // loading dock at the back
    k.at(0, -31, Math.PI, () => {
      for (const dx of [8, 14]) rollDoor(k, dx, 0, 3.0, 3.2);
      k.box(11, 0, 1.2, 12, 1.1, 2.4, 0xb9b4ab, 'concrete');
    });
    // lot with cart corrals
    pave(k, 0, 15, 60, 32);
    slab(k, 0, 1.4, 52, 2.8, 0.15);
    for (const row of [10, 24]) {
      stalls(k, -27, 3, 18, row - 5, row + 5);
      parkRow(c, rng, -27, 3, 18, row - 2.4, -1, 0.6);
      parkRow(c, rng, -27, 3, 18, row + 2.4, 1, 0.5);
    }
    for (const cx of [-10, 12]) {
      k.box(cx, 0, 17, 0.06, 1.0, 5, 0xc9ccd0, 'metal');
      k.box(cx + 1.2, 0, 17, 0.06, 1.0, 5, 0xc9ccd0, 'metal');
      k.solid(cx + 0.6, 17, 1.4, 5);
    }
    for (const lx of [-20, 0, 20]) lamp(k, lx, 17, 0);
    for (let i = 0; i < 5; i++) person(k, -8 + i * 3.6, 3 + (i % 2), rng.range(0, 6), randomPerson(rng));
    dumpster(k, 28, -26, HALF);
    k.solid(28, -26, 2.2, 2.2);
  });
}

/* ================================================================================================
 * Garages and yards
 * ============================================================================================== */
interface GarageOpts {
  wall?: Col;
  mat?: string;
  bg?: string;
  fg?: string;
  bays?: number;
  tow?: boolean;
}
function garageShop(id: string, title: string, sub: string, o: GarageOpts = {}) {
  const bays = o.bays ?? 3;
  const W = Math.round((8 + bays * 4.6) * 10) / 10;
  return def(id, title, W + 6, 26, ['service', 'garage'], (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed);
    c.occ.add(x, z, W + 6, 26, ry, 1, false);
    const sign = board(c, `${id}.sign`, title.toUpperCase(), sub, o.bg ?? '#f4f1ea', o.fg ?? '#1f3d6b', { h: 220 });
    k.at(x, z, ry, () => {
      const H = 5.4;
      k.solid(0, -7, W, 12);
      k.box(0, 0, -7, W, H, 12, o.wall ?? 0xd9d6cc, o.mat ?? 'cinder');
      k.box(0, H, -7, W + 0.6, 0.35, 12.6, 0x8a8e92, 'metal');
      k.roof(0, H + 0.35, -7, W, [[6.3, 0], [0, 1.4], [-6.3, 0]], 0x9ea2a6, 'corrugated', { eaveOH: 0.3, gableOH: 0.2 });
      for (let i = 0; i < bays; i++) rollDoor(k, -W / 2 + 7 + i * 4.6 + 2.3, -1, 3.6, 3.6);
      // office
      k.box(-W / 2 + 2.8, 0.4, -0.9, 4.4, 2.6, 0.08, P.glass, 'glass');
      doorAt(k, -W / 2 + 6.0, 0, -1, 0.95, 2.2, 0x3a3d41, { glass: true });
      k.sign(0, H - 0.9, -0.85, Math.min(W - 2, 16), 1.4, sign, {});
      pave(k, 0, 6, W + 6, 14);
      tireStack(k, W / 2 + 1.5, -2, 4);
      tireStack(k, W / 2 + 1.5, -3.2, 3);
      for (let i = 0; i < 3; i++) barrel(k, -W / 2 - 1.5, -4 + i * 0.8, rng.pick([0x2f5a8a, 0xc8262c, 0x2f6b4a]));
      for (let i = 0; i < bays; i++) if (rng.chance(0.55)) park(c, rng.pick(['sedan', 'pickup', 'van', 'suv', 'coupe'] as const), -W / 2 + 9.3 + i * 4.6, 3.5, HALF, rng.pick(CAR_COLORS));
      if (o.tow) park(c, 'tow', W / 2 - 2, 10, 0, 0xf2c94c, { accent: 0x1b1b1d });
      parkRow(c, rng, -W / 2, 3, Math.floor((W - (o.tow ? 8 : 0)) / 3), 11, 1, 0.4);
      person(k, -W / 2 + 6, 1.5, 0.6, { shirt: 0x2c4a8c, pants: 0x2a3348, skin: rng.pick([0xf0c9a8, 0xd8a47f]), hair: 0x2a1f17 });
    });
  });
}

function towYard(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 42, 36, ry, 1, false);
  const sign = board(c, 'tow.sign', 'BIG TIMBER TOWING', '24 HR TOWING · IMPOUND · RECOVERY', '#f2c94c', '#1b1b1d', { h: 220 });
  k.at(x, z, ry, () => {
    k.plane(0, 0.03, 0, 42, 36, 0x977757, 'gravel');
    securityFence(k, [[-6, 17], [-20, 17], [-20, -17], [20, -17], [20, 17], [6, 17]]);
    // office trailer
    k.solid(-12, 11, 9, 4);
    k.box(-12, 0.6, 11, 9, 2.6, 3.6, 0xf2efe8, 'siding');
    k.box(-12, 0, 11, 8.6, 0.6, 3.4, 0x8a8e92, 'corrugated');
    k.box(-12, 3.2, 11, 9.2, 0.15, 3.8, 0x9ea2a6, 'metal');
    k.at(-12, 12.8, 0, () => {
      doorAt(k, 2, 0.6, 0, 0.9, 2.0, 0xe9e8e4);
      windowAt(k, -1.5, 1.6, 0, 1.6, 0.9, { frame: 0x9ea2a6, my: 1 });
    });
    k.sign(0, 4.6, 17.3, 10, 2.2, sign, { back: 0x1b1b1d, thick: 0.2 });
    for (const s of [-1, 1]) k.box(s * 4.6, 0, 17.3, 0.25, 3.6, 0.25, 0x5b5f63, 'metal');
    park(c, 'tow', 8, 12, 0, 0xf2c94c, { accent: 0x1b1b1d });
    park(c, 'tow', 14, 12, 0, 0xc8262c, { accent: 0xf2f1ec });
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 6; i++) {
        if (!rng.chance(0.75)) continue;
        const t: VehicleType = rng.pick(['sedan', 'coupe', 'wagon', 'pickup', 'van', 'jeep'] as const);
        park(c, t, -15 + i * 5.5, -11 + r * 9, HALF, rng.pick(CAR_COLORS));
      }
    tireStack(k, 17, -14, 5);
  });
}

function publicWorks(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 64, 46, ry, 1, false);
  const sign = board(c, 'pw.sign', 'PINE HOLLOW PUBLIC WORKS', 'STREETS · WATER · SNOW REMOVAL', '#1f4f6b', '#ffffff', { h: 220 });
  k.at(x, z, ry, () => {
    k.plane(0, 0.03, 0, 64, 46, 0x9d978c, 'gravel');
    // garage bays
    k.solid(-10, -12, 38, 16);
    k.box(-10, 0, -12, 38, 7.0, 16, 0xc9ccd0, 'corrugated');
    k.roof(-10, 7.0, -12, 38, [[8.2, 0], [0, 1.6], [-8.2, 0]], 0x2f6b4a, 'roofMetal', { eaveOH: 0.4, gableOH: 0.3, fill: 0xc9ccd0, fillMat: 'corrugated' });
    for (let i = 0; i < 5; i++) rollDoor(k, -26 + i * 7, -4, 4.8, 5.0);
    k.sign(-10, 6.0, -3.8, 18, 1.8, sign, {});
    // sand & salt shed (open front)
    k.at(20, -12, 0, () => {
      k.solid(0, -2, 16, 12);
      for (const s of [-1, 1]) k.box(s * 7.8, 0, 0, 0.4, 2.5, 14, 0xb9b4ab, 'concrete');
      k.box(0, 0, -7, 16, 2.5, 0.4, 0xb9b4ab, 'concrete');
      for (const s of [-1, 1]) for (const pz of [-6.6, 0, 6.6]) k.box(s * 7.8, 2.5, pz, 0.3, 3.0, 0.3, P.woodDark);
      k.roof(0, 5.5, 0, 16.4, [[7.4, 0], [0, 2.6], [-7.4, 0]], 0x8a8e92, 'corrugated', { eaveOH: 0.4, gableOH: 0.3 });
      k.cone(0, 0, -2, 6.0, 4.0, 10, 0xb8a27a, 'gravel');
    });
    // gravel piles, plow blades, trucks
    for (const [gx, gz, r] of [[-22, 10, 4], [-12, 12, 3.4]] as const) {
      k.cone(gx, 0, gz, r, r * 0.8, 9, 0x8f8a80, 'gravel');
      k.solid(gx, gz, r * 1.6, r * 1.6);
    }
    for (let i = 0; i < 3; i++) {
      k.box(0 + i * 4, 0, 14, 3.0, 1.0, 0.3, 0xd9902a, 'metal', { rx: -0.3 });
      k.solid(i * 4, 14, 3, 1);
    }
    park(c, 'pickup', 14, 6, 0, 0xd9902a, { accent: 0x1b1b1d });
    park(c, 'pickup', 14, 10, 0, 0xd9902a, { accent: 0x1b1b1d });
    park(c, 'delivery', 22, 8, 0, 0xf2efe8, { accent: 0x1f4f6b });
    for (let i = 0; i < 6; i++) pallet(k, -28 + (i % 3) * 1.4, 18 + Math.floor(i / 3) * 1.4, 0);
    void rng;
  });
}

function freightDepot(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 58, 46, ry, 1, false);
  const sign = board(c, 'freight.sign', 'CASCADE FREIGHT LINES', 'TRUCKING · WAREHOUSING · LTL', '#f4f1ea', '#8a2a24', { h: 220 });
  k.at(x, z, ry, () => {
    pave(k, 0, 6, 58, 34);
    k.solid(0, -14, 44, 18);
    k.box(0, 0, -14, 44, 8.5, 18, 0xd9d6cc, 'corrugated');
    k.box(0, 8.5, -14, 44.4, 0.5, 18.4, 0x8a2a24, 'metal');
    k.box(0, 0, -4.4, 44, 1.2, 1.2, 0xb9b4ab, 'concrete');
    for (let i = 0; i < 5; i++) rollDoor(k, -16 + i * 8, -5, 3.0, 3.4);
    k.sign(0, 6.6, -4.88, 22, 2.2, sign, {});
    // semis backed up to the docks (trailer rear at the dock face)
    for (const i of [0, 2, 3]) parkSemi(c, -16 + i * 8, 11.3, -HALF, rng.pick([0xf2efe8, 0x8a2a24, 0x2c4a8c]));
    for (let i = 0; i < 5; i++) pallet(k, 20 + (i % 2) * 1.4, -2 + i * 1.3, 0);
    lamp(k, -24, 4, 0);
    lamp(k, 24, 4, Math.PI);
  });
}

function truckStop(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 82, 60, ry, 1, false);
  const sign = board(c, 'ts.sign', 'TIMBERLINE', 'TRUCK STOP · CAFE · DIESEL', '#1f3d2b', '#f2c94c', { font: F_SLAB, w: 768, h: 384 });
  const canopy = board(c, 'ts.canopy', 'TIMBERLINE  ·  DIESEL  ·  UNLEADED', '', '#1f3d2b', '#ffffff', { h: 120 });
  const cafe = board(c, 'ts.cafe', 'TIMBERLINE CAFE', 'OPEN 24 HOURS', '#f4f1ea', '#8a2a24', { font: F_SLAB, h: 200 });
  k.at(x, z, ry, () => {
    pave(k, 0, 0, 82, 60);
    // store + cafe
    k.solid(-22, -20, 30, 14);
    k.box(-22, 0, -20, 30, 5.0, 14, 0xc9a07a, 'boards');
    k.roof(-22, 5.0, -20, 30, [[7.6, 0], [0, 1.8], [-7.6, 0]], 0x2f4a3a, 'roofMetal', { eaveOH: 0.8, gableOH: 0.4, fill: 0xc9a07a, fillMat: 'boards' });
    storefront(k, -34, -14, 0.3, -13, 3.0, { frame: 0x3d2f28, doorX: -24 });
    k.sign(-22, 4.15, -12.85, 14, 1.5, cafe, {});
    // diesel canopy and pumps out front
    k.at(14, 8, 0, () => {
      for (const px of [-12, -4, 4, 12]) for (const pz of [-4, 4]) {
        k.solid(px, pz, 0.8, 0.8);
        k.box(px, 0, pz, 0.6, 5.5, 0.6, 0xf2efe8, 'metal');
      }
      k.box(0, 5.5, 0, 30, 1.0, 12, 0x1f3d2b, 'metal');
      k.box(0, 5.45, 0, 29.4, 0.06, 11.4, 0xfff1d0, 'light', { cast: false });
      k.sign(0, 6.0, 6.03, 24, 0.9, canopy, {});
      for (const px of [-12, -4, 4, 12]) {
        k.box(px, 0, 0, 1.4, 0.2, 9, CURB, 'concrete');
        for (const pz of [-2.5, 2.5]) {
          k.solid(px, pz, 0.9, 0.7);
          k.box(px, 0.2, pz, 0.8, 1.8, 0.6, 0xe9e8e4, 'paint');
          k.box(px, 1.4, pz, 0.82, 0.4, 0.62, 0x2f6b4a, 'paint');
        }
      }
    });
    // tall pole sign
    for (const s of [-1, 1]) {
      k.solid(34 + s * 2, 24, 0.6, 0.6);
      k.box(34 + s * 2, 0, 24, 0.4, 14, 0.4, 0x5b5f63, 'metal');
    }
    k.sign(34, 15.5, 24, 8, 4, sign, { back: 0x1f3d2b, thick: 0.6, twoSided: true });
    // semis in the back lot
    for (let i = 0; i < 4; i++) parkSemi(c, 6 + i * 7, -14.1, -HALF, rng.pick([0x1d1d1f, 0xf2efe8, 0x8a2a24, 0x2c4a8c, 0x2f6b4a]));
    parkRow(c, rng, -36, 3, 9, -6, 1, 0.6);
    for (const lx of [-30, 0, 30]) lamp(k, lx, 18, 0, 10);
    person(k, -26, -11, 0.4, randomPerson(rng));
    person(k, -19, -11.5, -0.6, randomPerson(rng));
  });
}

function readyMix(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  c.occ.add(x, z, 60, 44, ry, 1, false);
  const sign = board(c, 'rm.sign', 'VALLEY READY-MIX & GRAVEL', 'CONCRETE · ROCK · SAND', '#f2efe8', '#8a2a24', { h: 200 });
  k.at(x, z, ry, () => {
    k.plane(0, 0.03, 0, 60, 44, 0xa59d8f, 'gravel');
    // batch plant: silo on legs, conveyor, office
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(-12 + sx * 2.4, 0, -10 + sz * 2.4, 0.3, 7, 0.3, 0x8a8e92, 'metal');
    k.solid(-12, -10, 6, 6);
    k.cyl(-12, 7, -10, 3.2, 3.2, 9, 14, 0xd9d6cc, 'metal');
    k.cone(-12, 4.5, -10, 3.2, 2.5, 14, 0xd9d6cc, 'metal', { rx: Math.PI });
    k.beam({ x: -2, y: 0.5, z: -10 }, { x: -9.5, y: 15.5, z: -10 }, 1.0, 0.6, 0x5b5f63, 'metal');
    for (const [gx, gz, r, col] of [[10, -10, 6, 0x8f8a80], [20, -6, 5, 0xb8a27a], [16, 8, 4.5, 0x9a9488]] as const) {
      k.cone(gx, 0, gz, r, r * 0.75, 10, col, 'gravel');
      k.solid(gx, gz, r * 1.6, r * 1.6);
    }
    k.solid(-22, 10, 8, 5);
    k.box(-22, 0, 10, 8, 3.0, 5, 0xf2efe8, 'siding');
    k.box(-22, 3.0, 10, 8.4, 0.2, 5.4, 0x9ea2a6, 'metal');
    k.at(-22, 12.5, 0, () => doorAt(k, 2, 0, 0, 0.9, 2.1, 0xe9e8e4));
    k.sign(-12, 3.4, 21.4, 12, 2.0, sign, { back: 0x2b2d31, thick: 0.2 });
    for (const s of [-1, 1]) k.box(-12 + s * 5.6, 0, 21.4, 0.25, 3.0, 0.25, 0x5b5f63, 'metal');
    park(c, 'pickup', -14, 4, 0, 0xf2efe8, { accent: 0x8a2a24 });
    park(c, 'semi', 4, 10, HALF, 0x8a2a24, { accent: 0xf2efe8 });
  });
}

/* ================================================================================================
 * Spirit Lake Lodge, campground, radio, depot, brewery
 * ============================================================================================== */
function lodge(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  c.occ.add(x, z, 48, 28, ry, 1, false);
  const sign = board(c, 'lodge.sign', 'SPIRIT LAKE LODGE', 'ROOMS · DINING · BOAT RENTALS', '#3d2f28', '#f2e3c2', { font: F_SLAB, h: 230 });
  const log = 0x8a6440;
  const stone = 0x8f8c86;
  k.at(x, z, ry, () => {
    k.solid(0, -3, 40, 14);
    k.box(0, 0, -3, 40.4, 1.2, 14.4, stone, 'stone');
    k.box(0, 1.2, -3, 40, 6.4, 14, log, 'boards');
    k.box(0, 4.3, -3, 40.2, 0.25, 14.2, 0x5a4332);
    k.roof(0, 7.6, -3, 40, [[7, 0], [0, 4.0], [-7, 0]], 0x2f4a3a, 'roofMetal', { eaveOH: 1.0, gableOH: 0.8, fill: log, fillMat: 'boards' });
    // central entrance gable
    k.box(0, 0, 4.6, 10, 8.0, 1.4, log, 'boards');
    k.at(0, 4.5, HALF, () => k.roof(0, 8.0, 0, 4, [[5.2, 0], [0, 2.6], [-5.2, 0]], 0x2f4a3a, 'roofMetal', { eaveOH: 0.6, gableOH: 0.6, fill: log, fillMat: 'boards' }));
    doorAt(k, 0, 1.2, 5.3, 1.8, 2.5, 0x4a2f20, { double: true, glass: true });
    k.sign(0, 6.0, 5.36, 9, 1.8, sign, {});
    for (const fy of [1.8, 4.9]) {
      winRow(k, -19, -6, 4, fy, 4.0, 1.4, 1.5, 0xe9e0c8, { mx: 2, my: 2 });
      winRow(k, 6, 19, 4, fy, 4.0, 1.4, 1.5, 0xe9e0c8, { mx: 2, my: 2 });
    }
    // porch along the front
    k.box(0, 0, 6.4, 40, 1.2, 3.2, 0x7b6a56, 'planks');
    k.roof(0, 4.2, 0, 40.4, [[8.2, 0], [4.0, 0.7]], 0x2f4a3a, 'roofMetal', { thick: 0.14, eaveOH: 0.2, gableOH: 0.2 });
    for (let i = 0; i < 9; i++) k.cyl(-18 + i * 4.5, 1.2, 7.8, 0.18, 0.2, 3.0, 6, log);
    for (const s of [-1, 1]) {
      k.box(s * 20.6, 0, -3, 1.8, 13, 2.2, stone, 'stone');
      k.box(s * 20.6, 13, -3, 1.4, 0.25, 1.8, 0x5c5a56);
    }
    pave(k, 0, 11.5, 44, 5, 0x8a8e95);
    for (let i = 0; i < 4; i++) cafeTable(k, -16 + i * 3.2, 9.6, i % 2 ? 0x2f6b4a : 0xc8262c, 2);
    for (const fx of [-22, 22]) conifer(k, fx, 8, 9);
  });
}

function campground(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 72, 52, ry, 0, false);
  const sign = board(c, 'camp.sign', 'SPIRIT LAKE CAMPGROUND', 'TENTS · RV HOOKUPS · BOAT LAUNCH', '#3d2f28', '#f2e3c2', { font: F_SLAB, h: 230 });
  k.at(x, z, ry, () => {
    // entrance sign
    for (const s of [-1, 1]) k.cyl(s * 3.2, 0, 24, 0.22, 0.26, 3.4, 7, 0x6e4b30);
    k.sign(0, 3.0, 24, 6.0, 1.5, sign, { back: 0x3d2f28, thick: 0.15, twoSided: true });
    k.solid(0, 24, 7, 0.6);
    // restroom / shower block
    k.solid(-28, 14, 8, 5);
    k.box(-28, 0, 14, 8, 3.0, 5, 0xc9b79c, 'boards');
    k.roof(-28, 3.0, 14, 8, [[2.9, 0], [0, 1.2], [-2.9, 0]], 0x2f4a3a, 'roofMetal', { eaveOH: 0.4, gableOH: 0.3 });
    // sites
    for (let i = 0; i < 10; i++) {
      const sx = -24 + (i % 5) * 12;
      const sz = i < 5 ? -14 : 4;
      k.plane(sx, 0.03, sz, 9, 7, 0x9d8a6c, 'gravel');
      // picnic table + fire ring
      k.box(sx + 2.5, 0.72, sz + 2.2, 1.8, 0.06, 0.8, 0x8a6a46, 'planks');
      for (const s of [-1, 1]) k.box(sx + 2.5, 0.42, sz + 2.2 + s * 0.65, 1.8, 0.05, 0.3, 0x8a6a46, 'planks');
      k.solid(sx + 2.5, sz + 2.2, 1.8, 1.6);
      k.cyl(sx - 2.5, 0, sz + 2.5, 0.6, 0.6, 0.25, 8, 0x5b5f63, 'metal');
      if (rng.chance(0.4)) {
        // RV / travel trailer
        k.solid(sx, sz - 1, 7.4, 2.6);
        k.box(sx, 0.5, sz - 1, 7.4, 2.6, 2.4, 0xf2efe8, 'siding');
        k.box(sx, 1.4, sz - 1, 7.45, 0.3, 2.45, rng.pick([0x2f6b4a, 0x8a4a2a, 0x2c4a8c]));
        for (const s of [-1, 1]) k.cylZ(sx - 1, 0.42, sz - 1 + s * 1.1, 0.42, 0.3, 8, 0x1a1a1b, 'rubber');
      } else if (rng.chance(0.75)) {
        // A-tent
        const col = rng.pick([0x2f6b4a, 0xd27d2c, 0x2c4a8c, 0xc8262c, 0xe6c229]);
        k.at(sx, sz - 1, rng.range(-0.4, 0.4), () => {
          k.roof(0, 0, 0, 3.0, [[1.3, 0], [0, 1.5], [-1.3, 0]], col, 'paint', { thick: 0.06, eaveOH: 0.05, gableOH: 0.1 });
          k.solid(0, 0, 3, 2.6);
        });
      }
      if (rng.chance(0.5)) park(c, rng.pick(['pickup', 'suv', 'wagon', 'jeep'] as const), sx + 4.2, sz - 2, HALF, rng.pick(CAR_COLORS));
    }
    for (let i = 0; i < 6; i++) conifer(k, rng.range(-34, 34), rng.range(-24, 20), rng.range(7, 12));
    person(k, -20, -10, 1.2, randomPerson(rng));
    person(k, 8, 8, -0.8, randomPerson(rng));
  });
}

function radioStation(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  c.occ.add(x, z, 40, 34, ry, 1, false);
  const sign = board(c, 'radio.sign', 'KPHR 1340 AM', 'THE VOICE OF THE SILVER VALLEY', '#c8262c', '#ffffff', { h: 220 });
  k.at(x, z, ry, () => {
    k.plane(0, 0.03, 0, 40, 34, 0xa59d8f, 'gravel');
    k.solid(-8, 8, 12, 7);
    k.box(-8, 0, 8, 12, 3.4, 7, 0xe8e6df, 'cinder');
    k.box(-8, 3.4, 8, 12.4, 0.25, 7.4, 0x7a7e82, 'metal');
    k.at(-8, 11.5, 0, () => {
      doorAt(k, 3, 0, 0, 1.0, 2.2, 0xc8262c);
      windowAt(k, -2, 1.1, 0, 2.4, 1.1, { frame: 0x9ea2a6, mx: 2, my: 1 });
    });
    k.sign(-8, 4.2, 11.6, 8, 1.7, sign, { back: 0xc8262c, thick: 0.15 });
    lattice(k, 8, -4, 58, 1.6, 0.5, 0xd8d6d0, true);
    k.box(8, 58, -4, 0.3, 2.0, 0.3, 0xc8262c, 'metal');
    k.sphere(8, 60.2, -4, 0.35, 0xff5544, 'light', 8, 6);
    for (const [gx, gz] of [[22, -4], [-6, -16], [-6, 8]]) k.tube([new THREE.Vector3(8, 40, -4), new THREE.Vector3(gx, 0.3, gz)], 0.02, 0x7a7e82, 'wire', 2, false);
    securityFence(k, [[-1, -12], [17, -12], [17, 4], [-1, 4], [-1, -12]]);
    park(c, 'jeep', -16, 0, HALF, 0xc8262c);
  });
}

function depot(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  c.occ.add(x, z, 34, 30, ry, 1, false);
  const sign = board(c, 'depot.sign', 'PINE HOLLOW DEPOT', 'VISITOR CENTER · RAILROAD MUSEUM', '#3d4a3a', '#f2e3c2', { font: F_SLAB, h: 220 });
  const wall = 0xd9b56a;
  const trim = 0x5a3a28;
  // the depot faces the street; the old track and caboose lie behind it
  k.at(x, z, ry, () => k.at(0, 4, 0, () => {
    k.solid(0, 0, 26, 8);
    k.box(0, 0, 0, 30, 0.5, 13, 0xb9b4ab, 'concrete');
    k.box(0, 0.5, 0, 26, 4.0, 8, wall, 'boards');
    k.box(0, 0.5, 0, 26.1, 1.0, 8.1, trim, 'boards');
    k.roof(0, 4.5, 0, 26, [[6.4, -0.6], [0, 2.6], [-6.4, -0.6]], 0x6b2a24, 'shingle', { eaveOH: 0.3, gableOH: 1.2, fill: wall, fillMat: 'boards' });
    // bay window (station master) and brackets
    k.box(0, 0.5, 4.5, 4, 3.6, 1.2, wall, 'boards');
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) k.beam({ x: -11 + i * 5.5, y: 3.0, z: s * 4.05 }, { x: -11 + i * 5.5, y: 4.4, z: s * 5.6 }, 0.14, 0.14, trim);
    for (const s of [-1, 1]) k.at(0, s * 4, s > 0 ? 0 : Math.PI, () => {
      doorAt(k, -6, 0.5, 0, 1.2, 2.5, trim, { glass: true });
      doorAt(k, 6, 0.5, 0, 1.2, 2.5, trim, { glass: true });
      for (const wx of [-10, -2.5, 2.5, 10]) windowAt(k, wx, 1.4, 0, 1.0, 1.7, { frame: 0xf2e3c2, my: 2 });
    });
    windowAt(k, 0, 1.4, 5.1, 2.6, 1.6, { frame: 0xf2e3c2, mx: 3, my: 2 });
    k.sign(0, 5.6, 4.6, 9, 1.8, sign, { ry: 0, back: trim, thick: 0.14 });
    for (let i = 0; i < 3; i++) bench(k, -9 + i * 9, 5.6, 0);
    // caboose on a stub of track
    k.at(-4, -12, 0, () => {
      for (const s of [-1, 1]) k.box(0, 0.1, s * 0.72, 20, 0.15, 0.1, 0x5b5f63, 'metal');
      for (let i = 0; i < 12; i++) k.box(-9.5 + i * 1.75, 0, 0, 0.25, 0.12, 2.4, 0x5a4332);
      k.solid(0, 0, 9, 3);
      k.box(0, 0.9, 0, 8.4, 2.6, 2.7, 0xb8322a, 'boards');
      k.box(0, 3.5, 0, 3.0, 1.2, 2.2, 0xb8322a, 'boards');
      k.box(0, 3.5, 0, 8.8, 0.12, 2.9, 0x2b2d31, 'metal');
      k.box(0, 4.7, 0, 3.2, 0.12, 2.4, 0x2b2d31, 'metal');
      for (const s of [-1, 1]) for (const wx of [-3, 3]) k.cylZ(wx, 0.45, s * 0.72, 0.42, 0.18, 10, 0x2b2d31, 'metal');
    });
  }));
}

function brewery(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 32, 26, ry, 1, false);
  const sign = board(c, 'brew.sign', 'TIMBER RIDGE BREWING CO.', 'TAPROOM · EST. 1994', '#2b2421', '#e9c27a', { font: F_SLAB, h: 220 });
  k.at(x, z, ry, () => {
    flatBlock(k, rng, 0, -4, 26, 16, 7.6, 0xffffff, 'brickDark', 2);
    for (const wx of [-9, -3, 3, 9]) windowAt(k, wx, 1.2, 4.0, 2.2, 3.4, { frame: 0x2b2421, mx: 3, my: 3, arch: 0xd9cdb6 });
    doorAt(k, 0, 0.4, 4.05, 1.6, 2.6, 0x2b2421, { double: true, glass: true });
    k.sign(0, 6.1, 4.12, 16, 1.6, sign, {});
    // copper tanks visible on the side
    for (let i = 0; i < 3; i++) k.cyl(14.5, 0, -8 + i * 3.4, 1.3, 1.3, 6.5, 12, 0xb87333, 'metal');
    k.solid(14.5, -4.6, 3, 10);
    // patio with string lights
    slab(k, 0, 8.5, 26, 7, 0.12);
    for (let i = 0; i < 4; i++) cafeTable(k, -9 + i * 6, 8.5, null, 4);
    picketFence(k, -13, 12, -2, 12, 0x2b2421, 1.0);
    picketFence(k, 2, 12, 13, 12, 0x2b2421, 1.0);
    for (const s of [-1, 1]) k.box(s * 12.6, 0, 11.6, 0.15, 3.2, 0.15, 0x2b2421);
    for (const s of [-1, 1]) k.tube([new THREE.Vector3(s * 12.6, 3.2, 11.6), new THREE.Vector3(s * 6, 2.8, 8), new THREE.Vector3(0, 3.3, 4.2)], 0.015, 0x222222, 'wire', 8, false);
    for (let i = 0; i < 3; i++) person(k, -6 + i * 4, 9.5, rng.range(0, 6), randomPerson(rng));
  });
}

/* ================================================================================================
 * Sierra Silver Mine (headframe, hoist house, ore bins, portal)
 * ============================================================================================== */
function mine(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  c.occ.add(x, z, 64, 44, ry, 1, false);
  const sign = board(c, 'mine.sign', 'SIERRA SILVER MINE', 'SHAFT No. 2 · AUTHORIZED PERSONNEL ONLY', '#2b2421', '#e9c27a', { font: F_SLAB, h: 230 });
  const timber = 0x6b4e33;
  k.at(x, z, ry, () => {
    k.plane(0, 0.03, 0, 64, 44, 0x8a7a66, 'gravel');
    // timber headframe over the shaft
    const hx = -6;
    const hz = -6;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.beam({ x: hx + sx * 3.2, y: 0, z: hz + sz * 3.2 }, { x: hx + sx * 1.2, y: 18, z: hz + sz * 1.2 }, 0.45, 0.45, timber);
    for (let i = 1; i < 5; i++) {
      const y = i * 3.6;
      const w = 3.2 - (2.0 * y) / 18;
      for (const s of [-1, 1]) {
        k.box(hx, y, hz + s * w, w * 2, 0.3, 0.3, timber);
        k.box(hx + s * w, y, hz, 0.3, 0.3, w * 2, timber);
      }
    }
    k.beam({ x: hx, y: 0, z: hz + 12 }, { x: hx, y: 16, z: hz + 1.5 }, 0.5, 0.5, timber);
    k.box(hx, 18, hz, 3.0, 0.4, 3.0, timber);
    k.torus(hx, 19.4, hz, 1.3, 0.12, 4, 14, 0x3a3d41, 'metal', { ry: HALF });
    k.solid(hx, hz, 7, 7);
    // hoist house with the cable running up to the sheave
    k.solid(hx, hz + 18, 12, 8);
    k.box(hx, 0, hz + 18, 12, 6, 8, 0x9a4a3a, 'corrugated');
    k.roof(hx, 6, hz + 18, 12, [[4.4, 0], [0, 1.6], [-4.4, 0]], 0x8a8e92, 'corrugated', { eaveOH: 0.3, gableOH: 0.2, fill: 0x9a4a3a, fillMat: 'corrugated' });
    k.tube([new THREE.Vector3(hx, 4.5, hz + 14), new THREE.Vector3(hx, 19.4, hz + 0.6)], 0.05, 0x2b2d31, 'wire', 2, false);
    // ore bin and tipple
    k.solid(14, -8, 9, 7);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(14 + sx * 4, 0, -8 + sz * 3, 0.4, 5.5, 0.4, timber);
    k.box(14, 5.5, -8, 9, 4.5, 7, 0x8a6a46, 'boards');
    k.roof(14, 10, -8, 9, [[3.8, 0], [-3.8, 1.4]], 0x8a8e92, 'corrugated', { eaveOH: 0.3, gableOH: 0.2 });
    k.beam({ x: hx + 2, y: 7, z: hz }, { x: 9.5, y: 9, z: -8 }, 1.2, 0.8, timber);
    // portal into the hillside and waste rock
    k.at(0, -20, 0, () => {
      k.box(0, 0, -2, 14, 7, 4, 0x7b7c82, 'stone');
      k.box(0, 0, 0.1, 3.4, 3.4, 0.3, 0x1b1b1d);
      for (const s of [-1, 1]) k.box(s * 1.9, 0, 0.3, 0.45, 3.6, 0.45, timber);
      k.box(0, 3.6, 0.3, 4.4, 0.45, 0.5, timber);
      k.solid(0, -2, 14, 4);
    });
    for (const [px, pz, r] of [[22, -16, 6], [26, 6, 5]] as const) {
      k.cone(px, 0, pz, r, r * 0.7, 9, 0x6f6a62, 'gravel');
      k.solid(px, pz, r * 1.5, r * 1.5);
    }
    // track and ore carts from the portal to the bin
    for (const s of [-1, 1]) k.beam({ x: s * 0.45, y: 0.1, z: -18 }, { x: 12 + s * 0.45, y: 0.1, z: -9 }, 0.08, 0.1, 0x5b5f63, 'metal');
    for (const t of [0.35, 0.7]) {
      const cx = 12 * t;
      const cz = -18 + 9 * t;
      k.box(cx, 0.3, cz, 1.6, 0.9, 1.0, 0x5a4a3c, 'metal', { ry: -0.64 });
      k.solid(cx, cz, 1.8, 1.2);
    }
    k.sign(-22, 3.0, 20.4, 9, 2.0, sign, { back: 0x2b2421, thick: 0.2 });
    for (const s of [-1, 1]) k.box(-22 + s * 4.2, 0, 20.4, 0.3, 4.0, 0.3, timber);
    k.solid(-22, 20.4, 9, 0.5);
    park(c, 'pickup', -18, 8, 0, 0x6d8ea3, { accent: 0xe9e8e2 });
    park(c, 'jeep', -18, 13, 0, 0x2f6b4a);
  });
}

/* ================================================================================================
 * Cemetery and parks
 * ============================================================================================== */
function cemetery(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const { kit: k } = c;
  const rng = new Rng(seed);
  c.occ.add(x, z, 74, 54, ry, 0.5, false);
  const sign = board(c, 'cem.sign', 'PINE HOLLOW CEMETERY', 'EST. 1889', '#1b1f1c', '#e9e0c8', { font: F_SLAB, h: 200 });
  k.at(x, z, ry, () => {
    // wrought-iron fence with a gate arch at the front
    const fence = (ax: number, az: number, bx: number, bz: number) => picketFence(k, ax, az, bx, bz, 0x1b1f1c, 1.3);
    fence(-36, 26, -3, 26);
    fence(3, 26, 36, 26);
    fence(36, 26, 36, -26);
    fence(36, -26, -36, -26);
    fence(-36, -26, -36, 26);
    for (const s of [-1, 1]) {
      k.box(s * 3, 0, 26, 0.9, 3.0, 0.9, 0x9b9893, 'stone');
      k.solid(s * 3, 26, 0.9, 0.9);
    }
    k.beam({ x: -3, y: 3.0, z: 26 }, { x: 0, y: 4.0, z: 26 }, 0.1, 0.1, 0x1b1f1c, 'metal');
    k.beam({ x: 3, y: 3.0, z: 26 }, { x: 0, y: 4.0, z: 26 }, 0.1, 0.1, 0x1b1f1c, 'metal');
    k.sign(0, 3.25, 26.05, 4.6, 0.8, sign, { twoSided: true });
    k.plane(0, 0.04, 0, 3.4, 50, 0x9d978c, 'gravel');
    // headstones in rows
    for (let r = 0; r < 8; r++)
      for (let i = 0; i < 14; i++) {
        if (!rng.chance(0.82)) continue;
        const hx = (i < 7 ? -32 : 4.5) + (i % 7) * 4.0 + rng.range(-0.2, 0.2);
        const hz = 20 - r * 5.4;
        const col = rng.pick([0x9b9893, 0xb9b4ab, 0x7f7b75, 0xd9d4c8]);
        const kind = rng.next();
        if (kind < 0.65) {
          k.box(hx, 0, hz, 0.9, 1.0, 0.22, col, 'stone');
          k.cylZ(hx, 1.0, hz, 0.45, 0.22, 8, col, 'stone');
        } else if (kind < 0.85) k.box(hx, 0, hz, 1.2, 0.7, 0.3, col, 'stone');
        else {
          k.box(hx, 0, hz, 0.8, 0.5, 0.8, col, 'stone');
          k.cone(hx, 0.5, hz, 0.35, 2.4, 4, col, 'stone', { ry: Math.PI / 4 });
        }
      }
    for (let i = 0; i < 6; i++) conifer(k, rng.pick([-34, 34]) + rng.range(-1, 1), rng.range(-22, 22), rng.range(8, 13));
    k.ico(-20, 4.5, -12, 3.2, 0, 0x4f7a30, 'paint', 1, 0.9, 1);
    k.cyl(-20, 0, -12, 0.25, 0.3, 3.0, 5, P.trunk);
    k.solid(-20, -12, 0.8, 0.8);
  });
}

function ballpark(id: string, title: string) {
  return def(id, title, 86, 86, ['park'], (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed);
    c.occ.add(x, z, 86, 86, ry, 0.5, false);
    const sign = board(c, `${id}.sign`, title.toUpperCase(), 'BALLFIELD · PLAYGROUND · PICNIC SHELTER', '#2f4a3a', '#f2e3c2', { font: F_SLAB, h: 220 });
    k.at(x, z, ry, () => {
      lawn(k, 0, 0, 86, 86);
      // diamond: home plate near the front-left corner, outfield toward the back-right.
      // Bases 27.4 m apart: home (0,0), first (19.4,19.4)/√2…, second straight out at z = 38.8/√2.
      k.at(-24, 24, Math.PI * 0.75, () => {
        const hd = 27.4 / Math.SQRT2;
        k.box(0, 0.02, hd, 31, 0.06, 31, 0xb08a5a, 'gravel', { cast: false, ry: Math.PI / 4 });
        k.box(0, 0.04, hd, 24, 0.06, 24, 0x6f9a3c, 'paint', { cast: false, ry: Math.PI / 4 });
        k.cyl(0, 0.05, hd, 2.7, 2.7, 0.06, 12, 0xb08a5a, 'gravel', { cast: false });
        for (const [bx, bz] of [[0, 0], [hd, hd], [0, hd * 2], [-hd, hd]]) k.box(bx, 0.07, bz, 0.5, 0.08, 0.5, 0xf4f2ec, 'paint', { ry: Math.PI / 4 });
        // backstop
        for (let i = -3; i <= 3; i++) k.box(i * 2.2, 0, -4.5 + Math.abs(i) * 0.6, 0.1, 5.5, 0.1, 0x8a8e92, 'metal');
        k.box(0, 0, -3.6, 14, 5.5, 0.04, 0x8a8e92, 'metal');
        k.solid(0, -3.6, 14, 0.4);
        // dugouts
        for (const s of [-1, 1]) k.at(s * 11, -1, s * 0.6, () => {
          k.box(0, 0, 0, 8, 2.4, 2.4, 0xb9b4ab, 'cinder');
          k.box(0, 2.4, 0, 8.4, 0.15, 2.8, 0x2f4a3a, 'metal');
          k.solid(0, 0, 8, 2.4);
        });
      });
      // outfield fence along the back edges
      picketFence(k, -42, -42, 42, -42, 0x2f4a3a, 2.0);
      picketFence(k, 42, -42, 42, 30, 0x2f4a3a, 2.0);
      // picnic shelter + playground
      k.at(26, 28, 0, () => {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          k.solid(sx * 4.5, sz * 3, 0.4, 0.4);
          k.box(sx * 4.5, 0, sz * 3, 0.3, 2.8, 0.3, P.woodDark);
        }
        k.roof(0, 2.8, 0, 10, [[4, 0], [0, 1.6], [-4, 0]], 0x6b2a24, 'roofMetal', { eaveOH: 0.4, gableOH: 0.3 });
        slab(k, 0, 0, 10, 7, 0.1);
        for (let i = 0; i < 2; i++) k.box(-2 + i * 4, 0.72, 0, 1.8, 0.06, 0.8, 0x8a6a46, 'planks');
      });
      playground(k, 4, 32);
      k.sign(-30, 1.6, 42.2, 7, 1.6, sign, { back: 0x2f4a3a, thick: 0.2 });
      for (const s of [-1, 1]) k.box(-30 + s * 3.2, 0, 42.2, 0.2, 2.4, 0.2, 0x5a4332);
      for (let i = 0; i < 4; i++) bench(k, 10 + i * 4, 20, Math.PI);
      for (let i = 0; i < 4; i++) trashCan(k, -10 + i * 14, 38);
      for (let i = 0; i < 6; i++) person(k, rng.range(-30, 30), rng.range(-30, 30), rng.range(0, 6), randomPerson(rng));
    });
  });
}

/* ================================================================================================
 * Halls and offices (parametric: name, colours)
 * ============================================================================================== */
interface HallOpts {
  wall?: Col;
  mat?: string;
  bg?: string;
  fg?: string;
  roof?: Col;
}
function civicHall(id: string, title: string, sub: string, o: HallOpts = {}) {
  return def(id, title, 24, 26, ['civic', 'hall'], (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed);
    c.occ.add(x, z, 24, 26, ry, 1, false);
    const sign = board(c, `${id}.sign`, title.toUpperCase(), sub, o.bg ?? '#1f3d6b', o.fg ?? '#ffffff', { h: 220 });
    const wall = o.wall ?? 0xf2efe8;
    const mat = o.mat ?? 'siding';
    k.at(x, z, ry, () => {
      k.solid(0, -3, 18, 16);
      k.box(0, 0, -3, 18.2, 0.8, 16.2, 0x8b8782, 'stone');
      k.box(0, 0.8, -3, 18, 5.2, 16, wall, mat);
      // front-gabled hall: ridge runs back from the street, hidden behind the false front
      k.at(0, -3, HALF, () => k.roof(0, 6.0, 0, 16, [[9, 0], [0, 3.0], [-9, 0]], o.roof ?? 0x3b3d42, 'shingle', { eaveOH: 0.5, gableOH: 0, fill: wall, fillMat: mat, trim: 0xf4f1ea }));
      // front gable faces the street: false front with a pediment
      k.at(0, 5, 0, () => {
        k.box(0, 0.8, 0.0, 18.4, 6.6, 0.3, wall, mat);
        k.pediment(0, 7.4, 0, 18.6, 2.2, 0.4, 0xf4f1ea);
        k.sign(0, 6.6, 0.2, 12, 1.5, sign, {});
        doorAt(k, 0, 0.8, 0.15, 1.8, 2.6, 0x2b2421, { double: true, frame: 0xf4f1ea });
        for (const wx of [-6.2, -3.2, 3.2, 6.2]) windowAt(k, wx, 1.8, 0.15, 1.2, 2.0, { frame: 0xf4f1ea, my: 2 });
        for (let i = 0; i < 3; i++) k.box(0, 0, 0.5 + i * 0.3, 4, 0.8 - i * 0.26, 0.3, 0xb5b2ab, 'concrete');
      });
      for (const s of [-1, 1]) k.at(s * 9, -3, s * HALF, () => winRow(k, -6, 6, 3, 2.0, 0, 1.2, 2.0, 0xf4f1ea, { my: 2 }));
      flagPole(k, c.signs, -10, 8, 9);
      lawn(k, 0, 9, 24, 7);
      for (let i = 0; i < 4; i++) shrub(k, -8 + i * 5.3, 6.6, 0.55);
      void rng;
    });
  });
}

interface OfficeOpts {
  wall?: Col;
  mat?: string;
  roof?: Col;
  bg?: string;
  fg?: string;
  stories?: 1 | 2;
}
/** Small professional office (clinic, dentist, vet, insurance, attorney) with a monument sign and a side lot. */
function office(id: string, title: string, sub: string, o: OfficeOpts = {}) {
  return def(id, title, 26, 22, ['office'], (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed);
    c.occ.add(x, z, 26, 22, ry, 1, false);
    const sign = board(c, `${id}.sign`, title, sub, o.bg ?? '#f4f1ea', o.fg ?? '#1f3d6b', { h: 230 });
    const wall = o.wall ?? 0xe4dccb;
    const mat = o.mat ?? 'siding';
    const H = (o.stories ?? 1) === 2 ? 6.4 : 3.4;
    k.at(x, z, ry, () => {
      k.solid(-5, -3, 14, 12);
      k.box(-5, 0, -3, 14.1, 0.5, 12.1, 0x8b8782, 'stone');
      k.box(-5, 0.5, -3, 14, H, 12, wall, mat);
      k.hipRoof(-5, H + 0.5, -3, 14, 12, 2.4, o.roof ?? 0x3b3d42, 'shingle', 0.6);
      k.at(-5, 3, 0, () => {
        doorAt(k, 0, 0.5, 0, 1.0, 2.2, 0x2b4a3a, { glass: true, frame: 0xf4f1ea });
        for (const wx of [-4.2, -2.2, 2.2, 4.2]) windowAt(k, wx, 1.3, 0, 1.2, 1.4, { frame: 0xf4f1ea, my: 2 });
        if (H > 4) for (const wx of [-4.2, -1.4, 1.4, 4.2]) windowAt(k, wx, 4.4, 0, 1.2, 1.3, { frame: 0xf4f1ea, my: 2 });
        k.box(0, 0, 0.6, 2.4, 0.5, 1.2, 0xb5b2ab, 'concrete');
        k.box(0, 2.9, 0.9, 2.8, 0.15, 1.8, o.roof ?? 0x3b3d42);
      });
      // monument sign on the lawn
      lawn(k, -5, 7, 14, 6);
      k.box(-5, 0, 9, 5.4, 0.5, 0.8, 0x9b9893, 'stone');
      k.sign(-5, 1.3, 9.42, 5.0, 1.15, sign, { back: 0x6c6a66, thick: 0.3 });
      k.solid(-5, 9, 5.4, 0.8);
      for (const sx of [-10, -0.5]) shrub(k, sx, 3.8, 0.6);
      // side lot
      pave(k, 8, 1, 10, 20);
      stalls(k, 3, 3, 3, -8, -2);
      for (let i = 0; i < 3; i++) if (rng.chance(0.6)) park(c, rng.pick(['sedan', 'suv', 'wagon', 'pickup'] as const), 4.5 + i * 3, -5, HALF, rng.pick(CAR_COLORS));
      downspout(k, 2, -9, H);
    });
  });
}

/* ================================================================================================
 * Apartments on the edge of town: two-storey motel-style walk-ups around a parking lot
 * ============================================================================================== */
interface AptOpts {
  wall: Col;
  mat: string;
  trim: Col;
  roof: Col;
  door: Col;
  /** Low hipped roof (1970s) or a plain gable (1990s). */
  hip?: boolean;
  pool?: boolean;
  bg: string;
  fg: string;
}

/** Walk-up block L long and 11 deep, front (+Z) gallery on posts, open stairs past both ends (each adds 5.8 m). */
function walkup(c: Ctx, rng: Rng, L: number, o: AptOpts) {
  const k = c.kit;
  const D = 11;
  const F = 0.3;
  const H = 2.75;
  const top = F + 2 * H;
  const zf = D / 2;
  const gz = zf + 1.0;
  const CON = 0xc6c3bc;
  k.solid(0, 0, L, D);
  k.box(0, 0, 0, L + 0.1, F, D + 0.1, 0x8f8c87, 'concrete');
  k.box(0, F, 0, L, 2 * H, D, o.wall, o.mat);
  k.box(0, F + H - 0.1, 0, L + 0.08, 0.2, D + 0.08, o.trim);
  if (o.hip) k.hipRoof(0, top, 0, L, D, 2.0, o.roof, 'shingle', 0.7);
  else k.roof(0, top, 0, L, [[zf, 0], [0, 2.4], [-zf, 0]], o.roof, 'shingle', { trim: o.trim, fill: o.wall, fillMat: o.mat, eaveOH: 0.6, gableOH: 0.4, ridge: o.roof });

  // gallery: walkway slab, posts to the eave, canopy, railing
  k.box(0, 0, gz, L, 0.12, 2.1, CON, 'concrete', { cast: false });
  k.box(0, F + H - 0.05, gz, L, 0.22, 2.0, CON, 'concrete');
  k.box(0, top - 0.14, gz, L + 0.2, 0.14, 2.2, o.roof);
  const nPost = Math.max(2, Math.round(L / 4));
  for (let i = 0; i <= nPost; i++) {
    const px = -L / 2 + 0.2 + ((L - 0.4) * i) / nPost;
    k.box(px, 0, zf + 1.9, 0.18, top - 0.14, 0.18, o.trim);
    k.solid(px, zf + 1.9, 0.3, 0.3);
  }
  k.box(0, F + H + 0.95, zf + 1.95, L, 0.08, 0.08, o.trim);
  const nBal = Math.round(L / 0.5);
  for (let i = 0; i <= nBal; i++) k.box(-L / 2 + (L * i) / nBal, F + H + 0.17, zf + 1.95, 0.04, 0.8, 0.04, o.trim);

  // open stairs running down past each end of the gallery
  for (const s of [-1, 1]) {
    const xl = s * (L / 2 + 0.7);
    k.box(xl, F + H - 0.05, gz, 1.4, 0.22, 2.0, CON, 'concrete');
    for (const zz of [gz - 0.9, gz + 0.9]) k.box(xl + s * 0.6, 0, zz, 0.15, F + H - 0.05, 0.15, o.trim);
    const xt = s * (L / 2 + 1.4);
    const xb = s * (L / 2 + 5.6);
    k.beam({ x: xt, y: F + H - 0.05, z: gz }, { x: xb, y: 0.05, z: gz }, 1.1, 0.18, CON, 'concrete');
    const n = 14;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      k.box(xt + (xb - xt) * t, (F + H) * (1 - t) - 0.02, gz, 0.3, 0.06, 1.1, CON, 'concrete');
    }
    for (const zz of [gz - 0.6, gz + 0.6]) k.beam({ x: xt, y: F + H + 0.9, z: zz }, { x: xb, y: 0.95, z: zz }, 0.05, 0.05, o.trim, 'metal');
    k.solid((xt + xb) / 2, gz, 4.2, 1.3);
  }

  // units: door and window per flat on each floor, AC units, bits of life on the gallery
  const n = Math.max(2, Math.round(L / 8));
  const U = L / n;
  for (let i = 0; i < n; i++) {
    const xi = -L / 2 + U * (i + 0.5);
    for (const fl of [0, 1]) {
      const y = F + fl * H;
      doorAt(k, xi - U * 0.25, y, zf, 0.92, 2.1, o.door, { frame: o.trim });
      windowAt(k, xi + U * 0.15, y + 0.9, zf, 1.8, 1.25, { frame: o.trim, mx: 2 });
      if (rng.chance(0.4)) {
        k.box(xi + U * 0.15, y + 0.95, zf + 0.25, 0.7, 0.42, 0.45, 0xd9d6cc);
        k.box(xi + U * 0.15, y + 1.0, zf + 0.48, 0.55, 0.28, 0.02, 0x8f9194);
      }
      if (rng.chance(0.3)) bench(k, xi + U * 0.33, gz + 0.3, 0);
      if (fl === 0 && rng.chance(0.25)) k.cyl(xi - U * 0.42, 0.12, gz, 0.25, 0.2, 0.4, 7, 0x8a4a2a);
    }
    k.at(xi, -zf, Math.PI, () => {
      for (const fl of [0, 1]) windowAt(k, 0, F + fl * H + 0.9, 0, 2.2, 1.25, { frame: o.trim, mx: 2 });
    });
  }
  for (const s of [-1, 1]) k.at(s * (L / 2), 0, (s * Math.PI) / 2, () => {
    for (const fl of [0, 1]) windowAt(k, -2.2, F + fl * H + 0.9, 0, 1.1, 1.2, { frame: o.trim, mx: 2 });
  });
}

/** Garden-apartment complex: a long walk-up at the back, a short one down the left side, lot, office and laundry. */
function apartments(id: string, title: string, sub: string, o: AptOpts) {
  return def(id, title, 72, 56, ['residential', 'apartments'], (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed);
    c.occ.add(x, z, 72, 56, ry, 1, false);
    const sign = board(c, `${id}.sign`, title.toUpperCase(), sub, o.bg, o.fg, { h: 220 });
    const office = board(c, `${id}.office`, 'OFFICE · LAUNDRY', '', o.bg, o.fg, { h: 120 });
    k.at(x, z, ry, () => {
      k.at(0, -20.5, 0, () => walkup(c, rng, 40, o));
      k.at(-29.5, 8, HALF, () => walkup(c, rng, 26, o));

      // lot: one row along the back building, a double row in the middle, aisles between
      pave(k, 3, 6, 46, 34);
      pave(k, 10, 25.5, 9, 5);
      stalls(k, -18, 3, 14, -11, -5.5);
      parkRow(c, rng, -18, 3, 14, -8.6, -1, 0.7);
      stalls(k, -12, 3, 11, 3, 15);
      parkRow(c, rng, -12, 3, 11, 6.4, 1, 0.6);
      parkRow(c, rng, -12, 3, 11, 11.6, -1, 0.55);
      for (const [lx, lz] of [[-18, 0], [24, 0], [-18, 20], [24, 20]]) lamp(k, lx, lz, lx < 0 ? 0 : Math.PI);

      // office and laundry
      k.at(31.5, -17, 0, () => {
        k.solid(0, 0, 8, 7);
        k.box(0, 0, 0, 8.1, 0.3, 7.1, 0x8f8c87, 'concrete');
        k.box(0, 0.3, 0, 8, 3.0, 7, o.wall, o.mat);
        k.hipRoof(0, 3.3, 0, 8, 7, 1.5, o.roof, 'shingle', 0.5);
        doorAt(k, -1.6, 0.3, 3.5, 0.95, 2.1, 0x3d5a73, { frame: o.trim, glass: true });
        windowAt(k, 1.6, 1.1, 3.5, 2.2, 1.3, { frame: o.trim, mx: 2 });
        k.sign(0, 2.55, 3.56, 5.2, 0.7, office, {});
        k.box(-4.5, 0, 0, 0.8, 1.1, 0.8, 0xd9d6cc);
      });

      if (o.pool) {
        // fenced pool, a 1970s complex's pride
        k.at(31, 6, 0, () => {
          slab(k, 0, 0, 8, 14, 0.12);
          k.box(0, 0.06, 0, 5, 0.1, 10, 0x3f8fb8, 'water', { cast: false });
          k.box(0, 0.12, -5.2, 5.2, 0.05, 0.3, 0xf1f1ec);
          securityFence(k, [[-4.2, -7.2], [4.2, -7.2], [4.2, 7.2], [-4.2, 7.2], [-4.2, -7.2]], 0, 1.4);
          for (const zz of [-3, 0, 3]) k.box(3.1, 0.12, zz, 0.7, 0.35, 1.8, 0xf1f1ec);
        });
      } else {
        // picnic lawn and a few young trees
        lawn(k, 31, 6, 8, 14);
        k.box(31, 0.72, 6, 1.8, 0.06, 0.8, 0x8a6a46, 'planks');
        for (const zz of [0, 12]) conifer(k, 31, zz, rng.range(6, 9));
      }

      // dumpsters behind a cinder-block screen, mailbox cluster, monument sign
      k.at(31, 22, 0, () => {
        k.box(0, 0, -1.8, 7, 1.8, 0.25, 0xb9b4ab, 'cinder');
        for (const s of [-1, 1]) k.box(s * 3.5, 0, 0, 0.25, 1.8, 3.6, 0xb9b4ab, 'cinder');
        dumpster(k, -1.6, -0.2, 0, undefined, rng);
        dumpster(k, 1.6, -0.2, 0);
        k.solid(0, 0, 7, 3.8);
      });
      k.box(-6, 0, 24.5, 3.0, 1.4, 0.5, 0x6c7075, 'metal');
      k.solid(-6, 24.5, 3.0, 0.5);
      k.box(-14, 0, 26.2, 6.6, 0.5, 1.2, 0x9b9893, 'stone');
      k.sign(-14, 1.3, 26.85, 6.2, 1.55, sign, { back: 0x6c6a66, thick: 0.4 });
      k.solid(-14, 26.2, 6.6, 1.2);
      for (const [tx, tz] of [[-33, -25], [33, -26], [-20, 26.5], [34, 26]]) conifer(k, tx, tz, rng.range(9, 13));
      for (let i = 0; i < 3; i++) person(k, rng.range(-16, 20), rng.range(-3, 2), rng.range(0, 6), randomPerson(rng));
    });
  });
}

/* ================================================================================================
 * Warehouses and storage (godowns): steel distribution buildings with truck docks, mini-storage
 * ============================================================================================== */
interface WarehouseOpts {
  /** Building footprint (the site adds a 34 m truck court in front). */
  w: number;
  d: number;
  H: number;
  wall: Col;
  mat?: string;
  roof: Col;
  bg: string;
  fg: string;
  /** White insulated panels, rooftop condensers and reefer trailers. */
  cold?: boolean;
  trailers?: number;
}

/** Steel warehouse: low gable roof, raised truck docks along the front, office at one end, trailers at the doors. */
function warehouseSite(id: string, title: string, sub: string, o: WarehouseOpts) {
  const W = o.w + 8;
  const D = o.d + 34;
  return def(id, title, W, D, ['industrial', 'warehouse'], (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed);
    c.occ.add(x, z, W, D, ry, 1, false);
    const sign = board(c, `${id}.sign`, title.toUpperCase(), sub, o.bg, o.fg, { h: 200 });
    const mat = o.mat ?? 'corrugated';
    k.at(x, z, ry, () => {
      const bz = -D / 2 + o.d / 2 + 1;
      const fz = bz + o.d / 2;
      k.solid(0, bz, o.w, o.d);
      k.box(0, 0, bz, o.w + 0.2, 0.3, o.d + 0.2, 0x8f8c87, 'concrete');
      k.box(0, 0.3, bz, o.w, o.H, o.d, o.wall, mat);
      k.box(0, 0.3, bz, o.w + 0.1, 1.0, o.d + 0.1, 0x9a978f, 'concrete');
      k.roof(0, o.H + 0.3, bz, o.w, [[o.d / 2, 0], [0, o.d * 0.08], [-o.d / 2, 0]], o.roof, 'roofMetal', { eaveOH: 0.4, gableOH: 0.3, fill: o.wall, fillMat: mat });
      if (o.cold) for (let i = 0; i < 4; i++) k.box(-o.w / 2 + 8 + i * 9, o.H + 0.3 + o.d * 0.04, bz - 4, 3.2, 1.4, 2.2, 0xc9ccd0, 'metal');
      // office block at the +x end of the front
      const ox = o.w / 2 - 8;
      flatBlock(k, rng, ox, fz + 3, 14, 6, 4.4, 0xe4e1d8, 'stucco', 1);
      storefront(k, ox - 5, ox - 1, 0.4, fz + 6, 2.8, { frame: 0x3a3d41 });
      winRow(k, ox, ox + 6, 2, 1.2, fz + 6, 1.8, 1.4, 0x3a3d41, { mx: 2 });
      k.sign(-o.w / 6, o.H - 1.6, fz + 0.06, Math.min(22, o.w * 0.45), 2.4, sign, {});
      // dock wall and doors (floor 1.2 m above the truck court), bumpers and dock lights
      const dockEnd = ox - 9;
      const n = Math.max(2, Math.floor((dockEnd + o.w / 2 - 4) / 4.6));
      k.box((dockEnd - o.w / 2) / 2, 0, fz + 0.3, dockEnd + o.w / 2, 1.2, 0.6, 0xb5b2ab, 'concrete');
      const docks: number[] = [];
      for (let i = 0; i < n; i++) {
        const dx = -o.w / 2 + 4 + i * 4.6;
        docks.push(dx);
        k.box(dx, 1.2, fz + 0.62, 3.4, 3.5, 0.08, 0x5a5e62, 'metal');
        k.box(dx, 1.25, fz + 0.66, 3.0, 3.2, 0.06, o.cold ? 0xe9e8e4 : 0xd9dadc, 'rollup');
        for (const s of [-1, 1]) k.box(dx + s * 1.55, 0.75, fz + 0.75, 0.28, 0.4, 0.3, 0x1b1b1d, 'rubber');
        k.box(dx + 2.0, 4.6, fz + 0.75, 0.25, 0.2, 0.3, 0xffe9b0, 'light');
      }
      // truck court, trailers backed up to some doors, car lot by the office
      pave(k, 0, fz + 17, W, 34);
      const used = new Set<number>();
      for (let t = 0; t < (o.trailers ?? 3); t++) {
        const i = rng.int(0, docks.length - 1);
        if (used.has(i)) continue;
        used.add(i);
        // tractor faces away from the dock; the 15 m trailer runs back to the door
        parkSemi(c, docks[i], fz + 0.9 + 14.9, -HALF, rng.pick([0xf2f1ec, 0xc8262c, 0x2c4a8c, 0x2f6b4a, 0xe8a91c]));
        if (o.cold) k.box(docks[i], 1.4, fz + 0.9 + 0.9, 2.3, 1.6, 0.5, 0xd9d6cc, 'metal');
      }
      stalls(k, ox - 4, 3, 5, fz + 26, fz + 32);
      parkRow(c, rng, ox - 4, 3, 5, fz + 28.5, 1, 0.7);
      for (const lx of [-o.w / 2 + 2, 0, o.w / 2 - 2]) lamp(k, lx, fz + 33, Math.PI);
      securityFence(k, [[-W / 2 + 0.5, fz + 8], [-W / 2 + 0.5, -D / 2 + 0.5], [W / 2 - 0.5, -D / 2 + 0.5], [W / 2 - 0.5, fz + 8]]);
    });
  });
}

/** Mini-storage: rows of roll-up units inside a fence, an office and keypad gate at the front. */
function selfStorage(id: string, title: string, sub: string) {
  const W = 70;
  const D = 60;
  return def(id, title, W, D, ['industrial', 'storage'], (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed);
    c.occ.add(x, z, W, D, ry, 1, false);
    const sign = board(c, `${id}.sign`, title.toUpperCase(), sub, '#c8562a', '#ffffff', { h: 220 });
    k.at(x, z, ry, () => {
      pave(k, 0, 0, W, D);
      // four rows of units, doors on both long sides
      const rowL = 50;
      for (let r = 0; r < 4; r++) {
        const rz = -22 + r * 13;
        const rx = 6;
        k.solid(rx, rz, rowL, 6);
        k.box(rx, 0, rz, rowL + 0.1, 0.25, 6.1, 0x9a978f, 'concrete');
        k.box(rx, 0.25, rz, rowL, 2.9, 6, 0xe9e6dc, 'corrugated');
        k.roof(rx, 3.15, rz, rowL, [[3, 0], [0, 0.45], [-3, 0]], 0x8a8e92, 'roofMetal', { eaveOH: 0.5, gableOH: 0.3, fill: 0xe9e6dc, fillMat: 'corrugated' });
        for (const s of [-1, 1])
          for (let u = 0; u < 15; u++) {
            const ux = rx - rowL / 2 + 1.7 + u * 3.33;
            k.box(ux, 0.25, rz + s * 3.03, 2.6, 2.35, 0.06, 0xd86a2c, 'rollup');
          }
      }
      // office and gate at the front left, fence round the lot
      flatBlock(k, rng, -27, 22, 12, 8, 3.6, 0xe4dccb, 'stucco', 1);
      storefront(k, -31, -27, 0.4, 26, 2.6, { frame: 0x3a3d41 });
      k.sign(-27, 3.0, 26.06, 10, 1.1, sign, {});
      k.box(-16, 0, 27, 0.25, 1.3, 0.25, 0x4b4f54, 'metal');
      k.box(-16, 1.0, 27.15, 0.35, 0.45, 0.12, 0x2b2d31, 'metal');
      securityFence(k, [[-W / 2 + 0.5, 28], [-W / 2 + 0.5, -D / 2 + 0.5], [W / 2 - 0.5, -D / 2 + 0.5], [W / 2 - 0.5, 29.5], [-12, 29.5]]);
      for (let i = 0; i < 3; i++) park(c, rng.pick(['pickup', 'van', 'suv'] as const), -10 + i * 14, -15.5 + rng.int(0, 2) * 13, 0, rng.pick(CAR_COLORS));
      for (const lx of [-20, 20]) lamp(k, lx, 0, 0, 7);
    });
  });
}

/* ================================================================================================
 * Catalogue
 * ============================================================================================== */
export const TOWN: BuildingDef[] = [
  def('hospital', 'Silver Valley Medical Center', 64, 56, ['civic', 'medical'], hospital),
  elementary('westEndElementary', 'West End Elementary', 'PINE HOLLOW SCHOOL DISTRICT 391'),
  elementary('sunnysideElementary', 'Sunnyside Elementary', 'HOME OF THE BOBCATS · DISTRICT 391'),
  def('highSchool', 'Pine Hollow High School', 92, 52, ['civic', 'school'], highSchool),
  def('footballField', 'Logger Field', 118, 76, ['civic', 'school'], (c, x, z, ry) => footballField(c, x, z, ry)),
  def('supermarket', 'Valley Thriftway', 60, 62, ['retail'], supermarket),
  garageShop('hollowAuto', "Hollow Auto Repair", 'BRAKES · TUNE-UPS · TIRES · TOWING', { tow: true }),
  garageShop('cascadeTire', 'Cascade Tire & Lube', 'QUICK LUBE · ALIGNMENTS', { bays: 2, bg: '#c8262c', fg: '#ffffff', wall: 0xf2efe8 }),
  garageShop('riversideBody', 'Riverside Body Shop', 'COLLISION · PAINT · GLASS', { bays: 3, bg: '#1f3d2b', fg: '#f2c94c', wall: 0xc9ccd0, mat: 'corrugated' }),
  garageShop('ridgeMachine', 'Ridge Machine & Welding', 'FABRICATION · LOGGING EQUIPMENT', { bays: 2, bg: '#2b2d31', fg: '#f2c94c', wall: 0x9ea2a6, mat: 'corrugated' }),
  garageShop('emsStation', 'Pine Hollow Ambulance', 'EMERGENCY MEDICAL SERVICES', { bays: 2, bg: '#c8262c', fg: '#ffffff', wall: 0xf2efe8, mat: 'brickPaint' }),
  garageShop('countyRoads', 'Pine County Road Dept.', 'GRADERS · PLOWS · GRAVEL', { bays: 3, bg: '#e6c229', fg: '#1b1b1d', wall: 0xc9ccd0, mat: 'corrugated' }),
  def('towYard', 'Big Timber Towing', 42, 36, ['service'], towYard),
  def('publicWorks', 'Pine Hollow Public Works', 64, 46, ['civic', 'industrial'], publicWorks),
  def('freightDepot', 'Cascade Freight Lines', 58, 46, ['industrial'], freightDepot),
  def('truckStop', 'Timberline Truck Stop', 82, 60, ['highway'], truckStop),
  def('readyMix', 'Valley Ready-Mix & Gravel', 60, 44, ['industrial'], (c, x, z, ry) => readyMix(c, x, z, ry)),
  def('lodge', 'Spirit Lake Lodge', 48, 28, ['lake', 'hotel'], (c, x, z, ry) => lodge(c, x, z, ry)),
  def('campground', 'Spirit Lake Campground', 72, 52, ['lake', 'park'], campground),
  def('radioStation', 'KPHR 1340 AM', 40, 34, ['media'], (c, x, z, ry) => radioStation(c, x, z, ry)),
  def('depot', 'Pine Hollow Depot', 34, 30, ['civic', 'landmark'], (c, x, z, ry) => depot(c, x, z, ry)),
  def('brewery', 'Timber Ridge Brewing Co.', 32, 26, ['downtown', 'restaurant'], brewery),
  def('cemetery', 'Pine Hollow Cemetery', 74, 54, ['civic'], cemetery),
  def('mine', 'Sierra Silver Mine', 64, 44, ['industrial'], (c, x, z, ry) => mine(c, x, z, ry)),
  ballpark('westEndPark', 'West End Park'),
  ballpark('loggerPark', 'Logger Ballpark'),
  ballpark('sunnysideField', 'Sunnyside Field'),
  warehouseSite('distCenter', 'Cascade Distribution Center', 'FREIGHT · CROSS-DOCK · WAREHOUSING', { w: 70, d: 42, H: 9, wall: 0xc9ccd0, roof: 0x8a8e92, bg: '#1f3d6b', fg: '#ffffff', trailers: 4 }),
  warehouseSite('coldStorage', 'Valley Cold Storage', 'FROZEN · CHILLED · FRUIT PACKING', { w: 46, d: 34, H: 8, wall: 0xf2f1ec, mat: 'paint', roof: 0xd9d6cc, bg: '#2c6b8a', fg: '#ffffff', cold: true, trailers: 3 }),
  warehouseSite('feedWarehouse', 'Timberline Feed & Grain Warehouse', 'BULK FEED · SEED · FENCING', { w: 36, d: 24, H: 7, wall: 0x8a3a2e, mat: 'boards', roof: 0x4a4c52, bg: '#3d2f28', fg: '#f2e3c2', trailers: 1 }),
  selfStorage('selfStorage', 'Pine Hollow Self Storage', '24 HR ACCESS · RV & BOAT · U-HAUL'),
  apartments('valleyViewApts', 'Valley View Apartments', '1 & 2 BEDROOMS · NOW LEASING', {
    wall: 0x8a6a4a, mat: 'boards', trim: 0xe9e0c8, roof: 0x3b3d42, door: 0xc9a227, hip: true, pool: true, bg: '#5a3a24', fg: '#f2e3c2',
  }),
  apartments('cascadeCourtApts', 'Cascade Court Apartments', 'INCOME RESTRICTED · OFFICE ON SITE', {
    wall: 0xd9cfb8, mat: 'siding', trim: 0xf2efe8, roof: 0x4a4c52, door: 0x2c4a6b, bg: '#2c4a6b', fg: '#ffffff',
  }),
  civicHall('vfwHall', 'VFW Post 4421', 'VETERANS OF FOREIGN WARS', { bg: '#1f3d6b' }),
  civicHall('grangeHall', 'Silver Valley Grange', 'GRANGE HALL · NO. 116', { wall: 0xb8322a, mat: 'boards', bg: '#f4f1ea', fg: '#7a2c25' }),
  civicHall('elksLodge', 'Elks Lodge 1798', 'B.P.O.E. · MEMBERS & GUESTS', { wall: 0xffffff, mat: 'brickTan', bg: '#4a2a5a', fg: '#f2e3c2' }),
  office('clinic', 'Pine Hollow Family Clinic', 'DR. A. MORALES · DR. J. KIM', { bg: '#1f4f6b', fg: '#ffffff' }),
  office('dentist', 'Valley Dental', 'FAMILY DENTISTRY', { wall: 0xb8c4cc, bg: '#f4f1ea', fg: '#2c6b8a' }),
  office('vet', 'Silver Valley Animal Hospital', 'LARGE & SMALL ANIMALS', { wall: 0xd9cfa7, bg: '#2f6b4a', fg: '#ffffff' }),
  office('insurance', 'Hollow Valley Insurance', 'AUTO · HOME · LIFE · FARM', { wall: 0xe8e6df, bg: '#f4f1ea', fg: '#7a2c25' }),
  office('lawFirm', 'Harlan & Pierce, Attorneys', 'CRIMINAL · FAMILY · PROBATE', { wall: 0xffffff, mat: 'brickRed', bg: '#1b1f1c', fg: '#e9c27a', stories: 2 }),
  office('realtor', 'Cedar Realty', 'HOMES · LAND · RANCHES', { wall: 0xa7b08a, bg: '#f4f1ea', fg: '#2f6b4a' }),
  office('daycare', 'Little Pines Daycare', 'AGES 2–5 · PRESCHOOL', { wall: 0xe9d6c8, bg: '#f2c94c', fg: '#2c4a8c' }),
  office('forestService', 'U.S. Forest Service', 'SILVER VALLEY RANGER DISTRICT', { wall: 0x8a6440, mat: 'boards', bg: '#2f4a3a', fg: '#f2e3c2', roof: 0x2f4a3a }),
];

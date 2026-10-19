import * as THREE from 'three';
import { Ctx, windowAt, doorAt, storefront, awning, cornice, flatRoof, rooftop, chimney, downspout, billboardFrame, fireEscape } from './common';
import { cafeTable, barberPole, planter } from '../props';
import { P } from '../palette';
import type { SignId } from '../signs';
import type { Col } from '../core/kit';

export interface StoreOpts {
  x: number;
  z: number;
  ry: number;
  w: number;
  d: number;
  stories?: 1 | 2 | 3;
  height?: number;
  wall?: string;
  wallColor?: Col;
  trim?: Col;
  sign?: SignId;
  signW?: number;
  signH?: number;
  awning?: 'awningRed' | 'awningGreen' | 'awningBlue';
  frame?: Col;
  door?: number;
  eyebrow?: boolean;
  billboard?: boolean;
  blade?: SignId;
  chimneys?: number;
  sideWindows?: -1 | 1 | 0;
  produce?: boolean;
  /** Café / restaurant tables on the sidewalk (umbrella colour or null). */
  seating?: number | null;
  barber?: boolean;
  /** Neon window sign (sign id) glowing in the storefront. */
  neon?: SignId;
  fireEscape?: boolean;
  planters?: boolean;
  roofSign?: SignId;
}

/** Classic brick main-street block: storefront, sign band, cornice, flat roof with clutter. */
export function brickStore(c: Ctx, o: StoreOpts) {
  const { kit: k, rng } = c;
  const st = o.stories ?? 1;
  const H = o.height ?? (st === 3 ? 12.4 : st === 2 ? 8.8 : 5.2);
  const wall = o.wall ?? 'brickRed';
  const wc = o.wallColor ?? 0xffffff;
  const trim = o.trim ?? P.trimCream;
  const zf = o.d / 2;
  c.occ.add(o.x, o.z, o.w, o.d, o.ry, 1.5);
  k.at(o.x, o.z, o.ry, () => {
    k.box(0, 0, 0, o.w, H, o.d, wc, wall);
    k.box(0, 0, 0, o.w + 0.08, 0.4, o.d + 0.08, 0x8f8c87, 'concrete');
    for (const sx of [-1, 1]) k.box(sx * (o.w / 2 - 0.3), 0.4, zf + 0.07, 0.62, H - 1.4, 0.14, wc, wall);
    const sfH = 3.4;
    storefront(k, -o.w / 2 + 0.75, o.w / 2 - 0.75, 0.4, zf, sfH, { frame: o.frame ?? 0x37322e, doorX: o.door ?? o.w * 0.25 });
    // brick piers split long storefronts into bays
    const bays = Math.max(1, Math.round((o.w - 1.5) / 6.5));
    for (let i = 1; i < bays; i++) {
      const px = -o.w / 2 + 0.75 + ((o.w - 1.5) * i) / bays;
      if (Math.abs(px - (o.door ?? o.w * 0.25)) < 1.2) continue;
      k.box(px, 0.4, zf + 0.1, 0.55, sfH, 0.2, wc, wall);
      k.box(px, 0.4, zf + 0.12, 0.65, 0.35, 0.26, 0x8f8c87, 'concrete');
    }
    k.box(0, sfH + 0.4, zf + 0.06, o.w - 1.2, 1.2, 0.12, trim);
    if (o.sign) {
      const sh = o.signH ?? 0.95;
      k.sign(0, sfH + 1.0, zf + 0.13, Math.min(o.signW ?? o.w * 0.78, o.w - 1.6), sh, c.signs.get(o.sign));
    }
    if (o.awning) awning(k, 0, sfH + 0.32, zf, o.w - 1.5, 1.7, 0.75, o.awning);
    for (let f = 1; f < st; f++) {
      const fy = 5.55 + (f - 1) * 3.6;
      k.box(0, fy - 0.7, zf + 0.06, o.w, 0.22, 0.16, trim);
      const n = Math.max(2, Math.floor((o.w - 2) / 2.5));
      const span = o.w - 3;
      for (let i = 0; i < n; i++) {
        const x = -span / 2 + (span * (i + 0.5)) / n;
        windowAt(k, x, fy, zf, 1.2, 1.85, { frame: trim, mx: 1, my: 2, arch: o.eyebrow ? 0xf4f1ea : undefined, ac: rng.chance(0.15) });
      }
      if (o.sideWindows) {
        k.at((o.sideWindows * o.w) / 2, 0, (o.sideWindows * Math.PI) / 2, () => {
          const m = Math.floor((o.d - 4) / 3);
          for (let i = 0; i < m; i++) windowAt(k, -o.d / 2 + 3 + i * 3, fy, 0, 1.1, 1.7, { frame: trim });
        });
      }
    }
    if (o.fireEscape && st > 1) k.at(0, -zf, Math.PI, () => fireEscape(k, -o.w * 0.2, 0, st, 3.6, 1.95, 3.0));
    if (o.neon) k.sign(-o.w * 0.25, 2.3, zf + 0.03, 1.6, 0.5, c.signs.get(o.neon), {});
    if (o.seating !== undefined) for (let i = 0; i < 3; i++) cafeTable(k, -o.w / 2 + 2.5 + i * 2.6, zf + 3.0, o.seating, 2);
    if (o.barber) barberPole(k, (o.door ?? o.w * 0.25) + 1.0, 1.2, zf + 0.25);
    if (o.planters) for (const px of [-o.w / 2 + 1.2, o.w / 2 - 1.2]) planter(k, px, zf + 1.0);
    if (o.roofSign) {
      for (const s of [-1, 1]) k.box(s * o.w * 0.28, H, -1, 0.15, 3.0, 0.15, 0x6f7377, 'metal');
      k.box(0, H + 1.2, -1, o.w * 0.66, 0.12, 0.12, 0x6f7377, 'metal');
      k.sign(0, H + 2.0, -0.92, o.w * 0.62, 2.0, c.signs.get(o.roofSign), {});
    }
    cornice(k, o.w, H, zf, trim);
    flatRoof(k, o.w, o.d, H, 0.7);
    rooftop(k, rng, o.w, o.d, H, st === 2 ? 2 : 1);
    for (let i = 0; i < (o.chimneys ?? 1); i++) chimney(k, rng.range(-o.w / 2 + 1.5, o.w / 2 - 1.5), H - 0.1, rng.range(-o.d / 2 + 1.5, -1), 1.6, 0xffffff, wall);
    if (o.billboard) billboardFrame(k, 0, H + 0.4, -o.d * 0.15, o.w * 0.62, 6.5);
    if (o.blade) k.sign(o.w / 2 - 1.0, H * 0.42, zf + 0.85, 0.75, 3.4, c.signs.get(o.blade), { ry: Math.PI / 2, back: 0x2a2a2a, twoSided: true, thick: 0.15 });
    // back wall
    k.at(0, -zf, Math.PI, () => {
      doorAt(k, o.w * 0.25, 0.4, 0, 1.0, 2.2, 0x6b6f73);
      windowAt(k, -o.w * 0.2, 1.4, 0, 1.0, 1.2, { frame: 0x8a8580 });
      if (st === 2) windowAt(k, -o.w * 0.2, 5.6, 0, 1.0, 1.4, { frame: 0x8a8580, ac: true });
    });
    downspout(k, o.w / 2 - 0.1, -zf - 0.08, H);
    if (o.produce) {
      for (let i = 0; i < 4; i++) {
        const x = -o.w / 2 + 2 + i * 1.3;
        k.box(x, 0, zf + 1.1, 1.1, 0.7, 0.8, P.woodLight, 'planks');
        k.box(x, 0.7, zf + 1.1, 1.0, 0.18, 0.7, [0xc0392b, 0xe67e22, 0x7fb03a, 0xe8c547][i]);
      }
    }
  });
}

/** Don's Donuts — purple facade, striped awning, giant rooftop donut. */
export function donutShop(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const w = 17;
  const d = 16;
  const H = 5.0;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xc9bfd8, 'brickPaint');
    k.box(0, 0, zf + 0.08, w + 0.2, H + 0.7, 0.24, 0x3a2e72);
    storefront(k, -w / 2 + 0.8, w / 2 - 0.8, 0.3, zf + 0.2, 3.1, { frame: 0x241c4f, doorX: 4.2 });
    k.sign(0, 4.35, zf + 0.22, w - 1.0, 1.35, c.signs.get('dons'));
    awning(k, 0, 3.55, zf + 0.2, w - 1.1, 1.6, 0.7, 'awningRed');
    flatRoof(k, w, d, H, 0.4);
    rooftop(k, rng, w, d, H, 1);
    const dy = H + 5.6;
    const dz = 0.2;
    for (const s of [-1, 1]) k.box(s * 2.0, H - 0.1, dz, 0.4, 1.9, 0.4, P.metalGrey, 'metal');
    k.box(0, H - 0.1, dz, 4.8, 0.35, 0.8, P.metalGrey, 'metal');
    k.torus(0, dy, dz, 3.65, 1.7, 8, 16, 0xd59d5f, 'paint');
    k.torus(0, dy, dz + 0.45, 3.65, 1.62, 8, 16, 0x5b3423, 'paint', undefined, 0.8);
    const spr = [0xf4f1ea, 0xf06292, 0x64b5f6, 0xffd54f, 0x81c784];
    for (let i = 0; i < 70; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rho = rng.range(-1.1, 1.1);
      const R = 3.65 + rho;
      const zz = dz + 0.45 + 0.8 * Math.sqrt(Math.max(0, 1.62 * 1.62 - rho * rho)) + 0.02;
      k.boxC(Math.cos(a) * R, dy + Math.sin(a) * R, zz, 0.4, 0.1, 0.1, rng.pick(spr), 'paint', { rz: rng.range(0, Math.PI), cast: false });
    }
    k.at(0, -zf, Math.PI, () => doorAt(k, 3, 0.2, 0, 1.0, 2.2, 0x6b6f73));
  });
}

/** 86 Gasoline: canopy, pump islands, store with service bays and pylon sign. */
export function gasStation(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  // the forecourt stays drivable: only the store, canopy posts, islands and pylon are solid
  c.occ.add(x, z, 42, 36, ry, 1, false);
  k.at(x, z, ry, () => {
    k.solid(-6, -11.5, 22, 11);
    for (const ix of [-4.2, 4.2]) k.solid(-3 + ix, 5.5, 1.5, 7.4);
    for (const px of [-8.5, 8.5]) for (const pz of [-2.6, 2.6]) k.solid(-3 + px, 5.5 + pz, 0.7, 0.7);
    k.solid(17.5, 15.5, 3.8, 1.0);
    k.box(0, 0, 1, 42, 0.05, 34, P.concrete, 'concrete', { cast: false });
    const cx = -3;
    const cz = 5.5;
    const cy = 5.3;
    for (const px of [-8.5, 8.5]) for (const pz of [-2.6, 2.6]) {
      k.box(cx + px, 0.05, cz + pz, 0.5, cy, 0.5, P.trimWhite);
      k.box(cx + px, 0.05, cz + pz, 0.7, 0.6, 0.7, 0xd8321c);
    }
    k.box(cx, cy, cz, 24, 1.05, 11, 0xf4f2ed);
    k.box(cx, cy + 0.32, cz, 24.08, 0.28, 11.08, 0x2c7a4b);
    k.box(cx, cy + 0.05, cz, 24.04, 0.12, 11.04, 0xd8321c);
    for (let i = -2; i <= 2; i++) for (const lz of [-2.6, 2.6]) k.box(cx + i * 4.4, cy - 0.03, cz + lz, 1.4, 0.05, 0.6, 0xfff4dd, 'light', { cast: false });
    k.sign(cx - 7.5, cy + 0.55, cz + 5.56, 0.9, 0.9, signs.get('gas'), { thick: 0.02 });
    k.sign(cx + 7.5, cy + 0.55, cz + 5.56, 0.9, 0.9, signs.get('gas'), { thick: 0.02 });
    for (const s of [-1, 1]) k.box(cx + 3 + s * 3.2, cy + 1.05, cz + 4.6, 0.2, 1.1, 0.2, P.metalGrey, 'metal');
    k.sign(cx + 3, cy + 2.3, cz + 4.6, 9.0, 2.2, signs.get('gasWord'), { back: 0xf7f5ef, thick: 0.3 });
    for (const ix of [-4.2, 4.2]) {
      const px = cx + ix;
      k.box(px, 0.05, cz, 1.4, 0.24, 7.2, 0xd9d6cf, 'concrete');
      for (const pz of [-1.8, 1.8]) {
        k.box(px, 0.29, cz + pz, 0.62, 1.65, 1.05, 0xefece4);
        k.box(px, 1.94, cz + pz, 0.68, 0.38, 1.1, 0xd8321c);
        k.box(px + 0.32, 1.1, cz + pz, 0.02, 0.32, 0.5, 0x1f2a22, 'glass');
        k.box(px - 0.32, 1.1, cz + pz, 0.02, 0.32, 0.5, 0x1f2a22, 'glass');
        k.box(px + 0.36, 0.6, cz + pz + 0.3, 0.1, 0.5, 0.1, 0x2a2a2a);
      }
      for (const pz of [-3.4, 3.4]) k.cyl(px, 0.29, cz + pz, 0.13, 0.13, 0.9, 8, 0xf2c230);
    }
    // store + service bays
    const sz = -11.5;
    k.box(-6, 0.05, sz, 22, 4.8, 11, 0xffffff, 'brickRed');
    k.at(-6, sz + 5.5, 0, () => {
      storefront(k, -10.2, -1.5, 0.05, 0, 3.0, { frame: 0x2e2a27, doorX: -2.8 });
      k.box(0, 3.3, 0.06, 22, 1.2, 0.12, 0xf4f1ea);
      k.sign(-4.5, 3.9, 0.14, 9.5, 1.0, signs.get('gasStore'));
      for (const bx of [3.2, 7.6]) {
        k.box(bx, 0.05, 0.02, 3.8, 3.4, 0.1, 0xe8e8e6, 'rollup');
        k.box(bx, 3.45, 0.04, 4.0, 0.15, 0.14, 0xf4f1ea);
      }
      for (let i = 0; i < 3; i++) k.box(-9 + i * 0.95, 0.05, 0.7, 0.8, 1.8, 0.7, [0xc0392b, 0x2e86c1, 0xc0392b][i]);
      k.box(-0.8, 0.05, 0.75, 1.6, 0.9, 0.8, 0xf4f6f8);
    });
    k.at(-6, sz, 0, () => {
      flatRoof(k, 22, 11, 4.85, 0.5);
      rooftop(k, c.rng, 22, 11, 4.85, 1);
    });
    // pylon sign
    k.at(17.5, 15.5, 0, () => {
      for (const s of [-1, 1]) k.box(s * 1.4, 0, 0, 0.35, 10.5, 0.35, 0x6f7377, 'metal');
      k.box(0, 0, 0, 3.8, 0.8, 1.0, 0x5b5f63, 'concrete');
      k.sign(0, 9.3, 0, 3.8, 3.8, signs.get('gas'), { thick: 0.35, twoSided: true });
      k.box(0, 6.6, 0, 4.2, 1.1, 0.4, 0xf4f2ed);
      k.sign(0, 6.6, 0.0, 4.0, 0.95, signs.get('gasStore'), { thick: 0.42, twoSided: true });
      k.box(0, 5.4, 0, 4.0, 0.9, 0.3, 0x1b1b1b);
    });
  });
}

export function autoService(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const w = 20;
  const d = 20;
  const H = 5.4;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xffffff, 'brickRed');
    for (const bx of [-5.6, -1.2]) {
      k.box(bx, 0, zf + 0.02, 3.8, 3.8, 0.1, 0xe4e4e2, 'rollup');
      k.box(bx, 3.8, zf + 0.04, 4.1, 0.2, 0.15, 0x8b8b88);
    }
    doorAt(k, 3.5, 0.05, zf, 1.0, 2.2, 0x3f5468, { glass: true });
    windowAt(k, 6.6, 1.0, zf, 2.2, 1.5, { frame: 0x8b8b88, mx: 2, my: 1 });
    k.sign(0, 4.65, zf + 0.06, 14, 1.0, c.signs.get('auto'), { back: 0xe9e9e9, frame: 0.08 });
    flatRoof(k, w, d, H, 0.5);
    rooftop(k, rng, w, d, H, 1);
    k.at(w / 2, 0, Math.PI / 2, () => {
      windowAt(k, -3, 1.4, 0, 1.4, 1.2, { frame: 0x8b8b88 });
      windowAt(k, 2, 1.4, 0, 1.4, 1.2, { frame: 0x8b8b88, ac: true });
    });
    k.box(w / 2 + 0.3, 2.6, 2, 0.6, 0.45, 0.8, 0xd9d6cc);
  });
}

/** Board-and-batten storefront with a side-gabled roof and a porch canopy. */
export function woodStore(c: Ctx, x: number, z: number, ry: number, sign: SignId, wallColor: Col = 0x9b7653) {
  const { kit: k } = c;
  const w = 18;
  const d = 15;
  const H = 4.6;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, wallColor, 'boards');
    k.box(0, 0, 0, w + 0.1, 0.35, d + 0.1, 0x8f8c87, 'concrete');
    k.roof(0, H, 0, w, [[d / 2, 0], [0, 3.0], [-d / 2, 0]], P.roofNavy, 'roofMetal', { trim: P.trimWhite, fill: wallColor, fillMat: 'boards', ridge: P.roofNavy });
    storefront(k, -w / 2 + 1.5, w / 2 - 1.5, 0.35, zf, 2.9, { frame: 0x3a2f27, doorX: 0 });
    k.roof(0, 3.65, zf + 1.2, w - 1, [[1.3, -0.35], [-1.25, 0]], P.roofNavy, 'roofMetal', { thick: 0.12, eaveOH: 0.1, gableOH: 0.05 });
    for (const px of [-w / 2 + 1.0, -2.8, 2.8, w / 2 - 1.0]) k.box(px, 0.05, zf + 2.4, 0.2, 3.25, 0.2, P.woodDark);
    k.box(0, 0, zf + 1.2, w - 0.8, 0.12, 2.6, P.concrete, 'concrete', { cast: false });
    k.sign(0, 4.5, zf + 0.32, 7.5, 1.4, c.signs.get(sign), { back: 0x1b1b1b, frame: 0.08 });
    k.box(0, 3.8, zf + 0.2, 0.3, 1.0, 0.3, P.woodDark);
  });
}

export function diner(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const w = 18;
  const d = 12;
  const H = 4.4;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xf2efe6, 'paint');
    k.box(0, 0, 0, w + 0.05, 0.9, d + 0.05, 0x1f6f6a);
    k.box(0, 0.9, 0, w + 0.08, 0.12, d + 0.08, 0xd5d8db, 'metal');
    k.box(0, 2.85, 0, w + 0.08, 0.14, d + 0.08, 0xd5d8db, 'metal');
    k.box(0, 3.0, 0, w + 0.06, 0.55, d + 0.06, 0xc8262c);
    k.box(0, 1.05, zf - 0.02, w - 1.2, 1.7, 0.1, P.glassLit, 'glass');
    for (let i = 0; i <= 9; i++) k.box(-w / 2 + 0.6 + i * ((w - 1.2) / 9), 1.0, zf + 0.04, 0.08, 1.8, 0.06, 0xd5d8db, 'metal');
    k.at(w / 2, 0, Math.PI / 2, () => {
      k.box(0, 1.05, -0.02, d - 1.5, 1.7, 0.1, P.glassLit, 'glass');
      doorAt(k, 3.6, 0.05, 0.02, 1.1, 2.3, 0xd5d8db, { glass: true });
    });
    flatRoof(k, w, d, H, 0.3, 0xd5d8db);
    rooftop(k, rng, w, d, H, 1);
    for (const s of [-1, 1]) k.box(s * 3.5, H - 0.1, 0.5, 0.2, 1.4, 0.2, P.metalGrey, 'metal');
    k.sign(0, H + 2.1, 0.5, 9.5, 2.8, c.signs.get('diner'), { back: 0xf6efe0, thick: 0.3, twoSided: true });
  });
}

/** Small white post office with a flag. */
export function postOffice(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const w = 16;
  const d = 14;
  const H = 5.2;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xf3f1ea, 'brickPaint');
    k.box(0, 0, 0, w + 0.1, 0.5, d + 0.1, 0x9b9893, 'concrete');
    for (let i = 0; i < 3; i++) k.box(0, i * 0.17, zf + 0.9 - i * 0.3, 4.4, 0.17, 1.2 - i * 0.3, P.concrete, 'concrete');
    doorAt(k, 0, 0.5, zf, 1.8, 2.5, 0x2c3a4f, { glass: true, double: true });
    for (const wx of [-5, -2.6, 2.6, 5]) windowAt(k, wx, 1.4, zf, 1.2, 2.2, { frame: 0xffffff, mx: 2, my: 3 });
    k.sign(0, 3.95, zf + 0.06, 11, 0.9, c.signs.get('postOffice'));
    cornice(k, w, H, zf, 0xffffff);
    flatRoof(k, w, d, H, 0.6, 0xe9e6de);
  });
}

export const _keep = THREE;

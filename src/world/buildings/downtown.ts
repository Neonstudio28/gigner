import * as THREE from 'three';
import { Ctx, windowAt, doorAt, storefront, flatRoof, rooftop, downspout, billboardFrame, flagPole, quoins, column, balustrade, pedWindow, fireEscape } from './common';
import { acornLamp, planter, bench, cafeTable, crateStack, trashCan } from '../props';
import { person } from '../people';
import { P } from '../palette';
import type { Col, Kit } from '../core/kit';
import type { SignId } from '../signs';

const STONE = 0xe3d3b4;
const TRIM = 0xf1ebdf;

function steps(k: Kit, x: number, zEdge: number, w: number, rise: number, n: number, color: Col = 0xbfb29a, tread = 0.4) {
  for (let j = 0; j < n; j++) k.box(x, 0, zEdge + (n - 1 - j) * tread + tread / 2, w, ((j + 1) * rise) / n, tread, color, 'stone');
}

/** Pine County Courthouse: sandstone, six-column portico, clock tower with copper dome. */
export function courthouse(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  const w = 32;
  const d = 22;
  const B = 1.3;
  const H = 10.5;
  const zf = d / 2;
  const patina = 0x5f9e8a;
  c.occ.add(x, z + 2.5, w + 2, d + 7, ry, 2);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w + 1.2, B, d + 1.2, 0xbfb29a, 'stone');
    k.box(0, B, 0, w, H, d, STONE, 'stone');
    k.box(0, B + 4.9, 0, w + 0.2, 0.3, d + 0.2, TRIM);
    k.box(0, B + H - 0.45, 0, w + 0.6, 0.45, d + 0.6, TRIM);
    k.box(0, B + H, 0, w + 1.0, 0.35, d + 1.0, TRIM);
    for (let i = 0; i < 40; i++) k.box(-w / 2 + 0.4 + (i * (w - 0.8)) / 39, B + H - 0.75, zf + 0.33, 0.2, 0.22, 0.12, TRIM);
    k.box(0, B + H + 0.3, 0, w, 0.05, d, P.roofTar);
    balustrade(k, 0, B + H + 0.35, zf + 0.25, w + 0.6, TRIM);
    balustrade(k, 0, B + H + 0.35, -zf - 0.25, w + 0.6, TRIM);
    for (const s of [-1, 1]) k.at(s * (w / 2 + 0.25), 0, Math.PI / 2, () => balustrade(k, 0, B + H + 0.35, 0, d + 0.6, TRIM));
    for (const [cx, cz] of [[-w / 2, -zf], [w / 2, -zf], [-w / 2, zf], [w / 2, zf]]) quoins(k, cx, cz, B + H - 0.5, TRIM, B);
    // façade windows (outside the portico)
    for (const wx of [-13.6, -10.4, 10.4, 13.6]) {
      pedWindow(k, wx, B + 0.9, zf, 1.3, 2.6, TRIM, 0x2b3a4a);
      windowAt(k, wx, B + 5.8, zf, 1.3, 2.6, { frame: TRIM, mx: 2, my: 3, arch: TRIM, glass: 0x2b3a4a });
    }
    for (const s of [-1, 1])
      k.at((s * w) / 2, 0, (s * Math.PI) / 2, () => {
        for (const wx of [-7.5, -2.5, 2.5, 7.5]) {
          pedWindow(k, wx, B + 0.9, 0, 1.3, 2.6, TRIM, 0x2b3a4a);
          windowAt(k, wx, B + 5.8, 0, 1.3, 2.6, { frame: TRIM, mx: 2, my: 3, arch: TRIM, glass: 0x2b3a4a });
        }
      });
    k.at(0, -zf, Math.PI, () => {
      for (const wx of [-12, -8, -4, 4, 8, 12]) {
        windowAt(k, wx, B + 1.0, 0, 1.3, 2.4, { frame: TRIM, mx: 2, my: 3 });
        windowAt(k, wx, B + 5.8, 0, 1.3, 2.4, { frame: TRIM, mx: 2, my: 3, ac: wx === -8 || wx === 8 });
      }
      doorAt(k, 0, B, 0, 1.8, 2.6, 0x5b3a26, { double: true, frame: TRIM, glass: true });
      steps(k, 0, 0.1, 3.6, B, 5);
    });
    // portico
    k.box(0, 0, zf + 2.3, 19, B, 4.6, 0xbfb29a, 'stone');
    for (let i = 0; i < 6; i++) column(k, -7.5 + i * 3, B, zf + 3.9, 7.6, 0.42, TRIM);
    k.box(0, B + 7.6, zf + 2.3, 19.2, 1.3, 4.9, TRIM);
    k.sign(0, B + 8.25, zf + 4.76, 15.5, 0.9, signs.get('courthouse'));
    k.pediment(0, B + 8.9, zf + 2.3, 19.8, 3.3, 4.9, TRIM);
    k.pediment(0, B + 9.15, zf + 4.66, 16.4, 2.5, 0.2, 0xd9ccb4);
    doorAt(k, 0, B, zf, 2.6, 3.6, 0x5b3a26, { double: true, frame: TRIM, glass: true });
    for (const s of [-1, 1]) windowAt(k, s * 4.2, B + 1.0, zf, 1.4, 2.6, { frame: TRIM, mx: 2, my: 3 });
    for (const s of [-1, 1]) windowAt(k, s * 4.2, B + 5.8, zf, 1.4, 2.4, { frame: TRIM, mx: 2, my: 3 });
    steps(k, 0, zf + 4.6, 17.5, B, 6);
    for (const s of [-1, 1]) {
      k.box(s * 9.4, 0, zf + 5.8, 1.0, B + 0.5, 2.6, 0xbfb29a, 'stone');
      k.cyl(s * 9.4, B + 0.5, zf + 6.5, 0.07, 0.09, 1.8, 8, 0x1d2420, 'metal');
      k.sphere(s * 9.4, B + 2.6, zf + 6.5, 0.32, 0xf3efe6, 'gloss', 10, 8);
    }
    // clock tower, belfry and dome
    const ty = B + H + 0.35;
    k.box(0, ty, 0, 9, 4.6, 9, STONE, 'stone');
    for (const s of [-1, 1]) for (const t of [-1, 1]) quoins(k, s * 4.5, t * 4.5, 4.6, TRIM, ty);
    k.box(0, ty + 4.6, 0, 9.6, 0.4, 9.6, TRIM);
    k.box(0, ty + 5.0, 0, 7.4, 4.0, 7.4, TRIM);
    for (let i = 0; i < 4; i++)
      k.at(0, 0, (i * Math.PI) / 2, () => {
        k.signPlane(0, ty + 7.0, 3.72, 3.0, 3.0, signs.get('clock'));
        k.torus(0, ty + 7.0, 3.72, 1.56, 0.1, 4, 20, 0xb08a3a, 'metal');
        windowAt(k, 0, ty + 1.2, 4.5, 1.0, 2.4, { frame: TRIM, arch: TRIM, glass: 0x2b3a4a });
      });
    k.box(0, ty + 9.0, 0, 8.0, 0.35, 8.0, TRIM);
    k.cyl(0, ty + 9.35, 0, 2.5, 2.5, 3.2, 8, 0x262b33);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      k.cyl(Math.cos(a) * 2.9, ty + 9.35, Math.sin(a) * 2.9, 0.22, 0.22, 3.2, 8, TRIM);
    }
    k.cyl(0, ty + 12.55, 0, 3.35, 3.35, 0.4, 8, TRIM);
    k.add(new THREE.SphereGeometry(3.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), patina, 'paint', k.local(0, ty + 12.95, 0));
    k.cyl(0, ty + 15.9, 0, 0.75, 0.75, 1.4, 8, TRIM);
    k.cone(0, ty + 17.3, 0, 0.9, 1.3, 8, patina);
    k.cyl(0, ty + 18.6, 0, 0.05, 0.05, 2.2, 6, 0xd8b44a, 'metal');
    k.sphere(0, ty + 20.8, 0, 0.2, 0xd8b44a, 'metal');
    for (let i = 0; i < 3; i++) k.box(-10 + i * 10, B + H + 0.35, -6, 1.6, 1.0, 1.2, 0xc9c8c2);
  });
}

/** Red-brick Town Hall with a white four-column portico and pediment clock (as in the reference). */
export function townHall(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  const w = 30;
  const d = 18;
  const B = 0.9;
  const H = 9.6;
  const zf = d / 2;
  c.occ.add(x, z + 2, w + 1, d + 5, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w + 0.6, B, d + 0.6, 0xc9bfae, 'stone');
    k.box(0, B, 0, w, H, d, 0xffffff, 'brickRed');
    k.box(0, B + 4.6, 0, w + 0.15, 0.25, d + 0.15, TRIM);
    k.box(0, B + H - 0.55, 0, w + 0.5, 0.55, d + 0.5, TRIM);
    for (let i = 0; i < 38; i++) k.box(-w / 2 + 0.4 + (i * (w - 0.8)) / 37, B + H - 0.85, zf + 0.28, 0.2, 0.25, 0.1, TRIM);
    k.hipRoof(0, B + H, 0, w + 0.4, d + 0.4, 4.4, 0x3d424c, 'shingle', 0.55);
    for (const [cx, cz] of [[-w / 2, -zf], [w / 2, -zf], [-w / 2, zf], [w / 2, zf]]) quoins(k, cx, cz, B + H - 0.6, TRIM, B);
    for (const s of [-1, 1]) {
      k.box(s * 10.5, B + H + 1.2, -2.5, 1.0, 3.2, 1.0, 0xffffff, 'brickRed');
      k.box(s * 10.5, B + H + 4.4, -2.5, 1.2, 0.2, 1.2, TRIM);
    }
    for (const wx of [-12.5, -9.5, 9.5, 12.5]) {
      pedWindow(k, wx, B + 0.8, zf, 1.2, 2.3, TRIM);
      windowAt(k, wx, B + 5.3, zf, 1.2, 2.2, { frame: TRIM, mx: 2, my: 3 });
      k.box(wx, B + 7.6, zf + 0.06, 1.7, 0.2, 0.14, TRIM);
    }
    for (const s of [-1, 1])
      k.at((s * w) / 2, 0, (s * Math.PI) / 2, () => {
        for (const wx of [-5.5, -1.8, 1.8, 5.5]) {
          pedWindow(k, wx, B + 0.8, 0, 1.2, 2.3, TRIM);
          windowAt(k, wx, B + 5.3, 0, 1.2, 2.2, { frame: TRIM, mx: 2, my: 3 });
        }
      });
    k.at(0, -zf, Math.PI, () => {
      for (const wx of [-11, -7, -3, 3, 7, 11]) {
        windowAt(k, wx, B + 1.0, 0, 1.2, 2.1, { frame: TRIM, mx: 2, my: 3 });
        windowAt(k, wx, B + 5.3, 0, 1.2, 2.1, { frame: TRIM, mx: 2, my: 3, ac: wx === 7 });
      }
      doorAt(k, 0, B, 0, 1.6, 2.4, 0x5b3a26, { frame: TRIM, double: true });
    });
    // portico
    k.box(0, 0, zf + 1.9, 14.4, B, 3.8, 0xc9bfae, 'stone');
    for (const cx of [-5.4, -1.8, 1.8, 5.4]) column(k, cx, B, zf + 3.2, 8.4, 0.46, TRIM);
    k.box(0, B + 8.4, zf + 1.9, 14.6, 1.1, 4.0, TRIM);
    k.sign(0, B + 8.95, zf + 3.92, 9.0, 0.75, signs.get('townHall'));
    k.pediment(0, B + 9.5, zf + 1.9, 15.2, 3.0, 4.0, TRIM);
    k.signPlane(0, B + 10.75, zf + 3.93, 1.7, 1.7, signs.get('clock'));
    k.torus(0, B + 10.75, zf + 3.93, 0.9, 0.08, 4, 18, 0xb08a3a, 'metal');
    for (const s of [-1, 1]) k.box(s * 1.6, B + 10.1, zf + 3.85, 1.2, 0.5, 0.2, TRIM);
    doorAt(k, 0, B, zf, 2.0, 3.0, 0x4a2e20, { double: true, frame: TRIM, glass: true });
    k.box(0, B + 3.15, zf + 0.06, 2.4, 0.9, 0.08, 0x2b3a4a, 'glass');
    for (const s of [-1, 1]) windowAt(k, s * 3.6, B + 5.3, zf, 1.2, 2.2, { frame: TRIM, mx: 2, my: 3 });
    for (const s of [-1, 1]) pedWindow(k, s * 3.6, B + 0.8, zf, 1.2, 2.3, TRIM);
    steps(k, 0, zf + 3.8, 12, B, 4);
    for (const s of [-1, 1]) {
      k.box(s * 10, 0, zf + 1.4, 8.5, 0.9, 1.2, 0x3f6a2c);
      flagPole(k, signs, s * 16, zf + 5, 10);
    }
  });
}

/** 1970s two-storey police station: tan brick, concrete bands, canopy and radio mast. */
export function policeStation(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs, rng } = c;
  const w = 28;
  const d = 18;
  const H = 8;
  const zf = d / 2;
  const band = 0xd9d4c8;
  c.occ.add(x, z + 1.5, w, d + 3, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xffffff, 'brickTan');
    k.box(0, 0, 0, w + 0.1, 0.45, d + 0.1, 0x9b9893, 'concrete');
    for (const y of [3.7, H - 0.7]) k.box(0, y, 0, w + 0.2, 0.7, d + 0.2, band, 'concrete');
    k.box(0, 3.55, zf + 0.12, w + 0.2, 0.2, 0.06, 0x1d2f5a);
    storefront(k, -3.5, 3.5, 0.45, zf, 2.9, { frame: 0x3a3f46, doorX: 0, doorW: 1.8 });
    for (const s of [-1, 1]) {
      for (const wx of [6.5, 10.5]) windowAt(k, s * wx, 1.2, zf, 3.0, 1.4, { frame: 0x6b6f73, mx: 3, my: 1 });
      for (const wx of [7, 11]) windowAt(k, s * wx, 4.8, zf, 3.0, 1.3, { frame: 0x6b6f73, mx: 3, my: 1, ac: rng.chance(0.4) });
    }
    k.sign(0, 5.4, zf + 0.06, 10.5, 1.4, signs.get('police'));
    k.box(0, 3.15, zf + 2.0, 9, 0.35, 4, band, 'concrete');
    k.box(0, 3.1, zf + 2.0, 8.6, 0.05, 3.6, 0xfff3d6, 'light', { cast: false });
    for (const s of [-1, 1]) k.box(s * 4.0, 0, zf + 3.7, 0.4, 3.15, 0.4, band, 'concrete');
    for (let i = 0; i < 4; i++) k.cyl(-4.5 + i * 3, 0, zf + 4.6, 0.14, 0.14, 0.9, 8, 0xf2c230);
    k.at(-w / 2, 0, -Math.PI / 2, () => {
      k.box(2.5, 0, 0.02, 4.0, 3.4, 0.1, 0xb9bcbf, 'rollup');
      windowAt(k, -4, 4.8, 0, 2.6, 1.3, { frame: 0x6b6f73, mx: 2, my: 1 });
    });
    k.at(0, -zf, Math.PI, () => doorAt(k, 6, 0.45, 0, 1.0, 2.2, 0x5b5f63));
    flatRoof(k, w, d, H, 0.6, band);
    rooftop(k, rng, w, d, H, 2);
    // radio mast
    const mx = w / 2 - 3;
    const mz = -zf + 3;
    for (let i = 0; i < 8; i++) {
      const y0 = H + i * 1.8;
      for (const [ax, az, bx, bz] of [[-0.4, -0.4, 0.4, -0.4], [0.4, -0.4, 0.4, 0.4], [0.4, 0.4, -0.4, 0.4], [-0.4, 0.4, -0.4, -0.4]]) {
        k.beam({ x: mx + ax, y: y0, z: mz + az }, { x: mx + bx, y: y0 + 1.8, z: mz + bz }, 0.04, 0.04, 0xc8382b, 'metal');
        k.box(mx + ax, y0, mz + az, 0.06, 1.8, 0.06, 0xd9d9d6, 'metal');
      }
    }
    k.sphere(mx, H + 14.6, mz, 0.18, 0xff3b2f, 'light');
    flagPole(k, signs, -11, zf + 6, 9);
    flagPole(k, signs, 11, zf + 6, 9);
  });
}

export function fireStation(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs, rng } = c;
  const w = 30;
  const d = 18;
  const H = 8;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xffffff, 'brickRed');
    k.box(0, 0, 0, w + 0.1, 0.3, d + 0.1, 0x9b9893, 'concrete');
    for (const bx of [-10.5, -4.5]) {
      k.box(bx, 0.3, zf + 0.02, 4.6, 4.6, 0.1, 0xeceae4, 'rollup');
      k.box(bx, 3.2, zf + 0.08, 4.2, 0.6, 0.02, 0x2b3a4a, 'glass');
      k.box(bx, 4.9, zf + 0.06, 5.2, 0.3, 0.16, TRIM);
      for (const s of [-1, 1]) k.box(bx + s * 2.5, 0.3, zf + 0.06, 0.3, 4.6, 0.16, TRIM);
      k.box(bx, 5.25, zf + 0.15, 0.3, 0.2, 0.3, 0xfff3d6, 'light', { cast: false });
    }
    k.sign(-7.5, 6.2, zf + 0.06, 12, 1.2, signs.get('fireDept'));
    doorAt(k, 3.5, 0.3, zf, 1.0, 2.2, 0xb5241e, { frame: TRIM, glass: true });
    windowAt(k, 6.5, 1.3, zf, 1.6, 1.4, { frame: TRIM, mx: 2, my: 2 });
    k.sign(5.0, 3.4, zf + 0.06, 3.6, 1.2, signs.get('station1'));
    for (const wx of [3.5, 6.5, 9.5]) windowAt(k, wx, 5.2, zf, 1.1, 1.5, { frame: TRIM, mx: 2, my: 2 });
    k.box(0, H - 0.6, zf + 0.08, w + 0.2, 0.6, 0.2, TRIM);
    flatRoof(k, w, d, H, 0.6, 0xd8d6d0);
    rooftop(k, rng, w, d, H, 1);
    // hose-drying tower
    const tx = w / 2 - 3;
    const tz = -zf + 3;
    k.box(tx, 0, tz, 4.5, H + 6, 4.5, 0xffffff, 'brickRed');
    for (let i = 0; i < 3; i++) windowAt(k, tx, 3 + i * 3.6, tz + 2.25, 0.8, 1.6, { frame: TRIM, my: 1 });
    k.add(new THREE.ConeGeometry(3.6, 2.4, 4), 0x3d424c, 'shingle', k.local(tx, H + 6 + 1.2, tz, { ry: Math.PI / 4 }));
    k.box(tx, H + 7.5, tz, 0.1, 1.2, 0.1, 0x3a3a3a, 'metal');
    k.box(w / 2 - 0.3, 6.5, zf - 2, 0.4, 0.4, 0.4, 0xff3b2f, 'light');
  });
}

/** Liberty Theater: dark brick façade, bulb-lit marquee and vertical blade sign. */
export function theater(c: Ctx, x: number, z: number, ry: number, d = 26) {
  const { kit: k, signs } = c;
  const w = 18;
  const H = 11;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xffffff, 'brickDark');
    k.box(0, 0, 0, w + 0.1, 0.35, d + 0.1, 0x8f8c87, 'concrete');
    for (const s of [-1, 1]) k.box(s * (w / 2 - 0.4), 0.35, zf + 0.1, 0.8, H - 0.3, 0.3, 0xffffff, 'brickDark');
    storefront(k, -5, 5, 0.35, zf, 3.3, { frame: 0x2a1d14, doorX: 0, doorW: 2.4 });
    k.box(0, 0.35, zf + 1.0, 1.6, 2.4, 1.4, 0x7a1d1d);
    k.box(0, 1.3, zf + 1.71, 1.2, 0.9, 0.02, P.glassLit, 'glass');
    for (const s of [-1, 1]) {
      k.box(s * 6.6, 0.8, zf + 0.06, 1.6, 2.4, 0.12, 0xd8b44a, 'metal');
      k.box(s * 6.6, 0.95, zf + 0.13, 1.3, 2.1, 0.02, s > 0 ? 0x2a5a8c : 0x8c2a4a, 'gloss', { cast: false });
    }
    // marquee
    const my = 4.2;
    k.box(0, my, zf + 1.7, 14, 1.6, 3.4, 0xf2e4bf);
    k.sign(0, my + 0.8, zf + 3.42, 13.4, 1.4, signs.get('marquee'));
    for (const s of [-1, 1]) k.at(s * 7.01, zf + 1.7, (s * Math.PI) / 2, () => k.signPlane(0, my + 0.8, 0, 3.2, 1.4, signs.get('marquee')));
    k.box(0, my - 0.02, zf + 1.7, 13.6, 0.05, 3.0, 0xfff1d0, 'light', { cast: false });
    k.box(0, my + 1.6, zf + 1.7, 14.3, 0.25, 3.7, 0xc8262c);
    for (let i = 0; i <= 28; i++) k.sphere(-7 + i * 0.5, my - 0.08, zf + 3.42, 0.07, 0xfff3c4, 'light', 6, 4);
    for (const s of [-1, 1]) for (let i = 0; i <= 6; i++) k.sphere(s * 7.02, my - 0.08, zf + 0.1 + i * 0.55, 0.07, 0xfff3c4, 'light', 6, 4);
    for (const s of [-1, 1]) k.beam({ x: s * 5, y: H - 1.5, z: zf + 0.1 }, { x: s * 5, y: my + 1.7, z: zf + 3.0 }, 0.06, 0.06, 0x2b2d30, 'metal');
    // blade sign
    k.sign(0, 8.6, zf + 1.4, 1.6, 6.4, signs.get('theaterV'), { ry: Math.PI / 2, back: 0xc8262c, twoSided: true, thick: 0.4, frame: 0.08 });
    k.box(0, 5.4, zf + 0.6, 0.3, 0.3, 1.6, 0x2b2d30, 'metal');
    k.box(0, 11.8, zf + 0.6, 0.3, 0.3, 1.6, 0x2b2d30, 'metal');
    for (const s of [-1, 1]) windowAt(k, s * 4.2, 6.6, zf, 1.6, 3.0, { frame: 0xe9dcc0, arch: 0xe9dcc0, mx: 2, my: 3 });
    k.box(0, H - 0.6, zf + 0.1, w + 0.3, 0.6, 0.3, 0xe9dcc0);
    k.box(0, H, zf - 0.3, 8, 1.4, 0.6, 0xffffff, 'brickDark');
    k.box(0, H + 1.4, zf - 0.3, 8.4, 0.25, 0.8, 0xe9dcc0);
    flatRoof(k, w, d, H, 0.6);
    k.at(w / 2, 0, Math.PI / 2, () => doorAt(k, -8, 0.35, 0, 1.6, 2.3, 0x5b5f63, { double: true }));
  });
}

/** Purple-brick grocery with the LOAN banner and rooftop billboard frame (reference). */
export function grocery(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs, rng } = c;
  const w = 28;
  const d = 24;
  const H = 7.4;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xffffff, 'brickPurple');
    k.box(0, 0, 0, w + 0.1, 0.35, d + 0.1, 0x8f8c87, 'concrete');
    storefront(k, -12, 6, 0.35, zf, 3.4, { frame: 0x8e1f24, doorX: -2, doorW: 2.4 });
    k.box(-3, 3.75, zf + 0.06, 18.4, 0.3, 0.12, 0x8e1f24);
    k.sign(-3, 5.3, zf + 0.08, 11, 2.6, signs.get('grocery'), { back: 0xf3efe2, thick: 0.15 });
    k.box(9.5, 0.35, zf + 0.02, 4.0, 3.6, 0.1, 0xb9bcbf, 'rollup');
    for (const ax of [-11.5, -9.6]) {
      k.box(ax, 5.6, zf + 0.25, 1.1, 0.7, 0.5, 0xe2e0d8);
      k.box(ax, 5.68, zf + 0.51, 0.9, 0.55, 0.02, 0x8f9194);
    }
    k.at(-w / 2, 0, -Math.PI / 2, () => {
      k.sign(0, 4.3, 0.08, 6.4, 3.3, signs.get('loan'), { back: 0x1f5fa8, thick: 0.12 });
      windowAt(k, 7, 1.4, 0, 1.4, 1.2, { frame: 0x8a8580 });
    });
    flatRoof(k, w, d, H, 0.8, 0xb9adb4);
    rooftop(k, rng, w, d, H, 3);
    billboardFrame(k, -2, H + 0.6, -3, 14, 6.0);
    downspout(k, w / 2 - 0.1, zf + 0.1, H);
    for (let i = 0; i < 2; i++) crateStack(k, rng, 6 + i * 1.5, zf + 1.4, rng.range(-0.3, 0.3));
    for (const s of [-0.6, 0.6]) k.box(-10 + s, 0, zf + 1.6, 0.05, 1.0, 1.8, 0x9ea2a6, 'metal');
    for (let i = 0; i < 4; i++) k.box(-10, 0.3, zf + 0.9 + i * 0.35, 0.9, 0.55, 0.6, 0xb0b4b8, 'metal');
  });
}

/** Tex Outpost outfitter: curved parapet, flag banner sign, gooseneck lamps. */
export function texOutpost(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs, rng } = c;
  const w = 40;
  const d = 30;
  const H = 8.5;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, -0.4, w - 0.6, H, d - 0.8, 0xffffff, 'brickRed');
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, H);
    s.quadraticCurveTo(0, H + 5.6, -w / 2, H);
    s.closePath();
    k.extrude(s, 0.8, 0xffffff, 'brickRed', 0, 0, zf - 0.4);
    // green cap following the parapet curve (quadratic apex = H + 2.8)
    const arc: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      arc.push(k.toWorld(-w / 2 + w * t, H + 2 * t * (1 - t) * 5.6 + 0.12, zf - 0.4));
    }
    k.tube(arc, 0.32, 0x2f5a3a, 'paint', 32);
    k.box(0, 0, zf + 0.05, w + 0.6, 0.4, 0.4, 0x8f8c87, 'concrete');
    storefront(k, -16, 16, 0.4, zf, 3.4, { frame: 0x8e1f24, doorX: -4, doorW: 2.4 });
    k.box(0, 3.85, zf + 0.06, w - 6, 0.25, 0.12, 0x8e1f24);
    k.sign(0, 6.6, zf + 0.12, 14, 5.2, signs.get('tex'), { back: 0x1d1f24, thick: 0.18, frame: 0.12 });
    for (let i = 0; i < 5; i++) {
      const lx = -6 + i * 3;
      k.beam({ x: lx, y: 9.7, z: zf + 0.1 }, { x: lx, y: 10.1, z: zf + 1.2 }, 0.05, 0.05, 0x2b2d30, 'metal');
      k.cone(lx, 9.65, zf + 1.25, 0.3, 0.35, 8, 0x2b2d30, 'metal');
      k.cyl(lx, 9.62, zf + 1.25, 0.2, 0.2, 0.02, 8, 0xfff1d0, 'light', { cast: false });
    }
    for (const sx of [-1, 1]) k.box(sx * (w / 2 + 0.3), 0, zf - 1.5, 1.2, H + 0.8, 3, 0xffffff, 'brickRed');
    k.sign(-12, 2.3, zf + 0.03, 1.6, 0.6, signs.get('neonOpen'));
    flatRoof(k, w - 0.6, d - 0.8, H, 0.4);
    for (let i = 0; i < 3; i++) crateStack(k, rng, -14 + i * 1.4, zf + 1.5, rng.range(-0.3, 0.3));
    for (const s of [-0.5, 0.5]) k.box(-17 + s, 0, zf + 1.3, 0.05, 1.8, 1.6, 0x9ea2a6, 'metal');
    downspout(k, -w / 2 + 0.2, zf + 0.1, H);
  });
}

/** 1950s drive-in burger joint with car-hop canopy, menu boards and a pylon sign. */
export function burgerBarn(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  c.occ.add(x, z, 26, 16, ry, 1, false);
  k.at(x, z, ry, () => {
    k.solid(-3, 0, 10, 8);
    k.at(-3, 0, 0, () => {
      k.box(0, 0, 0, 10, 3.4, 8, 0xb8322a, 'boards');
      k.box(0, 0, 0, 10.1, 0.3, 8.1, 0x8f8c87, 'concrete');
      k.roof(0, 3.4, 0, 10, [[4, 0], [2.6, 1.3], [0, 2.1], [-2.6, 1.3], [-4, 0]], 0x34394a, 'roofMetal', { trim: TRIM, fill: 0xb8322a, fillMat: 'boards', eaveOH: 0.4 });
      k.pane(0, 1.0, 4.052, 8, 1.6, 'shop', 1.0);
      k.box(0, 0.95, 4.35, 8.2, 0.08, 0.7, 0xd9d9d6, 'metal');
      for (let i = 0; i <= 4; i++) k.box(-4 + i * 2, 0.95, 4.04, 0.08, 1.7, 0.06, TRIM);
      k.box(0, 2.75, 4.05, 9.6, 0.5, 0.08, TRIM);
      for (const s of [-1, 1]) {
        k.beam({ x: s * 4.6, y: 0.4, z: 4.06 }, { x: s * 3.1, y: 2.9, z: 4.06 }, 0.15, 0.06, TRIM);
        k.beam({ x: s * 4.6, y: 2.9, z: 4.06 }, { x: s * 3.1, y: 0.4, z: 4.06 }, 0.15, 0.06, TRIM);
      }
    });
    // car-hop canopy with menu boards
    k.solid(8, 0, 1.2, 14);
    for (const pz of [-6, -2, 2, 6]) {
      k.box(8, 0, pz, 0.25, 3.1, 0.25, TRIM);
      k.sign(8.3, 1.35, pz, 0.8, 0.62, signs.get('menu'), { ry: Math.PI / 2, back: 0x2a2a2a, thick: 0.1 });
      k.box(8.55, 0.95, pz, 0.35, 0.05, 0.6, 0xd9d9d6, 'metal');
    }
    k.box(8, 3.1, 0, 5.0, 0.3, 14.5, 0xc8262c);
    k.box(8, 3.05, 0, 4.8, 0.05, 14.3, 0xfff1d0, 'light', { cast: false });
    k.box(8, 3.4, 0, 5.2, 0.12, 14.7, TRIM);
    // pylon sign
    k.solid(-9, 6, 1.0, 1.0);
    k.cyl(-9, 0, 6, 0.18, 0.22, 9, 10, 0x7a7e82, 'metal');
    k.sign(-9, 7.6, 6, 3.4, 2.2, signs.get('burgerBarn'), { back: 0xc8262c, thick: 0.35, twoSided: true });
    k.box(-9, 5.6, 6, 3.0, 0.5, 0.3, 0xffd24a, 'light');
    for (const [tx, tz] of [[-6, 7], [-2, 7.5]]) cafeTable(k, tx, tz, 0xc8262c, 3);
    trashCan(k, 0, 6.5, 0xc8262c);
  });
}

export function library(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  const w = 16;
  const d = 14;
  const B = 1.0;
  const H = 6.5;
  const zf = d / 2;
  c.occ.add(x, z + 1.5, w, d + 3, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w + 0.6, B, d + 0.6, 0xbfb29a, 'stone');
    k.box(0, B, 0, w, H, d, 0xd9cdb2, 'stone');
    k.box(0, B + H - 0.4, 0, w + 0.5, 0.45, d + 0.5, TRIM);
    k.box(0, B + H + 0.05, 0, w, 0.05, d, P.roofTar);
    balustrade(k, 0, B + H + 0.05, zf + 0.15, w + 0.4, TRIM, 0.7);
    for (const s of [-1, 1]) for (const wx of [3.6, 6.2]) windowAt(k, s * wx, B + 1.0, zf, 1.4, 3.6, { frame: TRIM, arch: TRIM, mx: 2, my: 4 });
    for (const cx of [-1.6, 1.6]) column(k, cx, B, zf + 1.8, 5.6, 0.36, TRIM);
    k.box(0, B + 5.6, zf + 1.0, 5.4, 0.9, 2.2, TRIM);
    k.sign(0, B + 6.05, zf + 2.12, 4.8, 0.6, signs.get('library'));
    k.pediment(0, B + 6.5, zf + 1.0, 5.8, 1.6, 2.2, TRIM);
    k.box(0, 0, zf + 1.0, 5.6, B, 2.2, 0xbfb29a, 'stone');
    doorAt(k, 0, B, zf, 1.6, 2.6, 0x4a2e20, { double: true, frame: TRIM, glass: true });
    steps(k, 0, zf + 2.1, 5.0, B, 3);
    k.cyl(0, B + H, 0, 2.6, 2.8, 1.2, 12, TRIM);
    k.add(new THREE.SphereGeometry(2.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x5f9e8a, 'paint', k.local(0, B + H + 1.2, 0));
    k.sphere(0, B + H + 3.9, 0, 0.25, 0xd8b44a, 'metal');
    for (const s of [-1, 1]) planter(k, s * 3.6, zf + 3.0, 0xf2c94c);
  });
}

/** Two-storey western false-front store with a porch roof and balcony. */
export function falseFront(c: Ctx, x: number, z: number, ry: number, o: { w: number; d: number; sign: SignId; color: Col; balcony?: boolean; trim?: Col }) {
  const { kit: k, signs } = c;
  const { w, d } = o;
  const H = 6.4;
  const zf = d / 2;
  const trim = o.trim ?? 0xf2e8d5;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, o.color, 'boards');
    k.box(0, 0, 0, w + 0.1, 0.35, d + 0.1, 0x8f8c87, 'concrete');
    k.box(0, 0, zf - 0.1, w + 0.4, H + 2.2, 0.35, o.color, 'boards');
    k.box(0, H + 2.2, zf - 0.1, w + 0.7, 0.3, 0.6, trim);
    k.box(0, H + 1.6, zf + 0.1, w + 0.5, 0.2, 0.3, trim);
    k.roof(0, H - 0.5, zf - 1.0, w - 0.6, [[1.0, -1.0], [-1.0, 0.0]], 0x5a4a3a, 'roofMetal', { thick: 0.12, eaveOH: 0.2, gableOH: 0.1 });
    storefront(k, -w / 2 + 1, w / 2 - 1, 0.35, zf + 0.08, 2.9, { frame: 0x3a2a1c, doorX: 0, doorW: 1.4 });
    k.box(0, 3.35, zf + 1.5, w, 0.15, 3.0, 0x6b4a30, 'planks');
    for (const px of [-w / 2 + 0.3, -w / 6, w / 6, w / 2 - 0.3]) k.box(px, 0, zf + 2.85, 0.22, 3.35, 0.22, 0x5a3e28);
    k.box(0, 0, zf + 1.5, w, 0.35, 3.0, 0x7a5a3c, 'planks');
    if (o.balcony) {
      k.box(0, 4.3, zf + 2.95, w, 0.08, 0.08, trim);
      k.box(0, 3.5, zf + 2.95, w, 0.06, 0.06, trim);
      for (let i = 0; i <= Math.floor(w / 0.3); i++) k.box(-w / 2 + i * 0.3, 3.5, zf + 2.95, 0.04, 0.8, 0.04, trim);
      for (const s of [-1, 1]) doorAt(k, s * (w / 4), 3.5, zf + 0.08, 0.9, 2.1, 0x4a3524, { frame: trim, glass: true });
    } else {
      for (const s of [-1, 1]) windowAt(k, s * (w / 4), 4.1, zf + 0.08, 1.1, 1.6, { frame: trim, mx: 2, my: 2 });
    }
    k.sign(0, H + 0.7, zf + 0.1, w * 0.78, 1.25, signs.get(o.sign), {});
  });
}

export function gazebo(c: Ctx, x: number, z: number) {
  const { kit: k } = c;
  const white = 0xf4f2ec;
  k.solid(x, z, 7.4, 7.4);
  k.at(x, z, Math.PI / 8, () => {
    k.cyl(0, 0, 0, 3.7, 3.8, 0.7, 8, white);
    k.cyl(0, 0.7, 0, 3.5, 3.5, 0.06, 8, 0xa47e56, 'planks');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.cos(a) * 3.3;
      const pz = Math.sin(a) * 3.3;
      k.box(px, 0.7, pz, 0.2, 2.8, 0.2, white);
      if (i !== 2) {
        const b = ((i + 1) / 8) * Math.PI * 2;
        const qx = Math.cos(b) * 3.3;
        const qz = Math.sin(b) * 3.3;
        for (const yy of [1.0, 1.6]) k.beam({ x: px, y: yy, z: pz }, { x: qx, y: yy, z: qz }, 0.06, 0.08, white);
        for (let j = 1; j < 8; j++) {
          const t = j / 8;
          k.box(px + (qx - px) * t, 1.0, pz + (qz - pz) * t, 0.05, 0.6, 0.05, white);
        }
      }
    }
    k.cyl(0, 3.4, 0, 3.6, 3.6, 0.25, 8, white);
    k.cone(0, 3.65, 0, 4.4, 2.4, 8, 0x2f4a3a, 'shingle');
    k.cyl(0, 6.0, 0, 0.12, 0.12, 0.6, 6, white);
    k.sphere(0, 6.7, 0, 0.18, 0xd8b44a, 'metal');
    for (let i = 0; i < 3; i++) k.box(Math.cos((2.5 / 8) * Math.PI * 2) * (3.9 + i * 0.35), 0, Math.sin((2.5 / 8) * Math.PI * 2) * (3.9 + i * 0.35), 1.8, 0.7 - i * 0.22, 0.4, white, 'paint', { ry: -(2.5 / 8) * Math.PI * 2 });
  });
}

/** Veterans' memorial: stone pedestal with a bronze figure. */
export function statue(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const bronze = 0x5d6e57;
  k.solid(x, z, 3, 3);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, 3.0, 0.5, 3.0, 0xbfb29a, 'stone');
    k.box(0, 0.5, 0, 2.0, 2.2, 2.0, 0xd9cdb2, 'stone');
    k.box(0, 2.7, 0, 2.3, 0.25, 2.3, 0xbfb29a, 'stone');
    k.box(0, 1.2, 1.01, 1.2, 0.7, 0.03, 0x6b5a3a, 'metal');
    k.at(0, 0, 0, () => person(k, 0, 0, 0, { shirt: bronze, pants: bronze, skin: bronze, hair: bronze, hat: 'cap', scale: 1.35 }), 2.95);
    k.beam({ x: 0.45, y: 3.2, z: 0.1 }, { x: 0.5, y: 5.0, z: 0.15 }, 0.06, 0.06, bronze, 'metal');
  });
}

export function fountain(c: Ctx, x: number, z: number) {
  const { kit: k } = c;
  k.solid(x, z, 6.6, 6.6);
  k.cyl(x, 0, z, 3.2, 3.4, 0.6, 16, 0xd9cdb2, 'stone');
  k.cyl(x, 0.5, z, 2.9, 2.9, 0.04, 16, 0x4c7f95, 'water', { cast: false });
  k.cyl(x, 0, z, 0.5, 0.6, 1.6, 10, 0xd9cdb2, 'stone');
  k.cyl(x, 1.6, z, 1.4, 0.4, 0.4, 12, 0xd9cdb2, 'stone');
  k.cyl(x, 1.9, z, 1.2, 1.2, 0.03, 12, 0x4c7f95, 'water', { cast: false });
  k.cyl(x, 1.9, z, 0.2, 0.25, 0.8, 8, 0xd9cdb2, 'stone');
  k.sphere(x, 2.8, z, 0.25, 0xd9cdb2, 'stone');
}

export function squareBench(c: Ctx, x: number, z: number, ry: number) {
  bench(c.kit, x, z, ry);
}

export function squareLamp(c: Ctx, x: number, z: number) {
  acornLamp(c.kit, x, z);
}

export { fireEscape };

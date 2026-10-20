import * as THREE from 'three';
import type { BuildingDef } from './catalog';
import type { Ctx } from './common';
import { windowAt, doorAt, storefront, awning, downspout } from './common';
import type { Col, Kit, SignRef } from '../core/kit';
import { Rng } from '../core/rng';
import { P, CAR_COLORS } from '../palette';
import { vehicle, VEHICLE_LENGTH, type VehicleType, type VehicleOpts } from '../vehicles';
import { trashCan, bench, dumpster, cafeTable, barrel, cone, tireStack } from '../props';
import { panelSign, textOnly, drawLines, makeCanvas, roundRect, type Line } from '../textures';

/* ------------------------------------------------------------------------------------------------
 * 1990s highway-strip businesses (fictional brands). Local frame: street side = +Z, base at y = 0.
 * ---------------------------------------------------------------------------------------------- */

type G2 = CanvasRenderingContext2D;

const ASPH = 0x6f737b;
const WHITE = 0xf1f1ec;
const CURB = 0xb8babc;
const STEEL = 0x8a8f94;
const DARKM = 0x2b2d31;
const HALF = Math.PI / 2;

const sgn = (c: Ctx, key: string, draw: () => HTMLCanvasElement): SignRef => c.signs.custom(`s90:${key}`, draw);

/* ------------------------------------------------------------------------- ground / site helpers */

function pave(k: Kit, cx: number, cz: number, w: number, d: number, col: Col = ASPH) {
  k.box(cx, 0, cz, w, 0.04, d, col, 'asphalt', { cast: false });
}
function slab(k: Kit, cx: number, cz: number, w: number, d: number, h = 0.1, col: Col = P.concrete) {
  k.box(cx, 0, cz, w, h, d, col, 'concrete', { cast: false });
}
function mark(k: Kit, x: number, z: number, w: number, d: number, col: Col = WHITE) {
  k.plane(x, 0.046, z, w, d, col, 'decal');
}
/** n+1 stall dividers along X between z0..z1. */
function stalls(k: Kit, x0: number, pitch: number, n: number, z0: number, z1: number) {
  for (let i = 0; i <= n; i++) mark(k, x0 + i * pitch, (z0 + z1) / 2, 0.11, z1 - z0);
}
/** n+1 stall dividers along Z between x0..x1. */
function stallsZ(k: Kit, z0: number, pitch: number, n: number, x0: number, x1: number) {
  for (let i = 0; i <= n; i++) mark(k, (x0 + x1) / 2, z0 + i * pitch, x1 - x0, 0.11);
}
function island(k: Kit, x: number, z: number, w: number, d: number) {
  k.box(x, 0, z, w, 0.17, d, CURB, 'concrete', { cast: false });
  k.plane(x, 0.18, z, w - 0.5, d - 0.5, P.lawn, 'field');
}
function shrub(k: Kit, x: number, z: number, r: number, col: Col = 0x3f5e30, y = 0) {
  k.ico(x, y + r * 0.7, z, r, 0, col, 'paint', 1, 0.8, 1);
}
function conifer(k: Kit, x: number, z: number, h: number) {
  k.cyl(x, 0, z, 0.12, 0.2, h * 0.3, 5, P.trunk);
  k.cone(x, h * 0.18, z, h * 0.3, h * 0.46, 6, 0x2f4c2a);
  k.cone(x, h * 0.45, z, h * 0.23, h * 0.38, 6, 0x35562f);
  k.cone(x, h * 0.68, z, h * 0.15, h * 0.32, 6, 0x3d6034);
}
/** Parking-lot light pole; arm extends toward local +X (rotate with ry). */
function lamp(k: Kit, x: number, z: number, ry = 0, h = 8, twin = false) {
  k.at(x, z, ry, () => {
    k.solid(0, 0, 0.5, 0.5);
    k.box(0, 0, 0, 0.7, 0.35, 0.7, CURB, 'concrete');
    k.cyl(0, 0.35, 0, 0.09, 0.13, h, 6, 0x4b4f54, 'metal');
    for (const s of twin ? [-1, 1] : [1]) {
      k.box(s * 0.55, h + 0.3, 0, 1.1, 0.08, 0.1, 0x4b4f54, 'metal');
      k.box(s * 1.15, h + 0.2, 0, 0.9, 0.16, 0.4, 0x3a3d41, 'metal');
      k.box(s * 1.15, h + 0.15, 0, 0.7, 0.04, 0.3, 0xfff1d0, 'light', { cast: false });
    }
  });
}
function park(c: Ctx, type: VehicleType, x: number, z: number, ry: number, color: Col, o?: VehicleOpts) {
  vehicle(c.kit, c.signs, type, x, z, ry, color, o);
  c.kit.solid(x, z, VEHICLE_LENGTH[type] - 0.2, 2.0, ry);
}
/** Square frustum (mansard / hut roofs). Top dims tw×td must be > 0. */
function frustum(k: Kit, x: number, y: number, z: number, w: number, d: number, tw: number, td: number, h: number, color: Col, mat = 'shingle') {
  const a = w / 2;
  const b = d / 2;
  const c = tw / 2;
  const e = td / 2;
  const V = [[-a, 0, b], [a, 0, b], [a, 0, -b], [-a, 0, -b], [-c, h, e], [c, h, e], [c, h, -e], [-c, h, -e]];
  const F = [[0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7], [4, 5, 6], [4, 6, 7]];
  const pos: number[] = [];
  const uv: number[] = [];
  F.forEach((f, i) => {
    const face = i >> 1;
    for (const vi of f) {
      const p = V[vi];
      pos.push(p[0], p[1], p[2]);
      if (face === 4) uv.push(p[0], p[2]);
      else uv.push(face % 2 === 0 ? p[0] : p[2], p[1] * 1.5);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  k.add(g, color, mat, k.local(x, y, z));
}
/** Flat-topped wall with a flat membrane roof and small rooftop clutter. */
function flatTop(k: Kit, rng: Rng, x: number, z: number, w: number, d: number, H: number, cap: Col = 0xb9b4ab, units = 1) {
  k.box(x, H, z, w - 0.3, 0.06, d - 0.3, P.roofTar);
  k.box(x, H, z + d / 2 - 0.15, w, 0.5, 0.3, cap, 'concrete');
  k.box(x, H, z - d / 2 + 0.15, w, 0.5, 0.3, cap, 'concrete');
  k.box(x - w / 2 + 0.15, H, z, 0.3, 0.5, d, cap, 'concrete');
  k.box(x + w / 2 - 0.15, H, z, 0.3, 0.5, d, cap, 'concrete');
  for (let i = 0; i < units; i++) {
    const ux = x + rng.range(-w / 2 + 2.5, w / 2 - 2.5);
    const uz = z + rng.range(-d / 4, d / 4);
    k.box(ux, H + 0.06, uz, 1.8, 0.9, 1.3, 0xc9c8c2);
    k.cyl(ux, H + 0.96, uz, 0.45, 0.45, 0.05, 8, 0x55585c);
  }
}
/** Brick or masonry enclosure for a dumpster; opens toward local +Z. */
function trashCorral(k: Kit, x: number, z: number, rng: Rng, wall = 'brickRed') {
  k.at(x, z, 0, () => {
    k.solid(0, -0.9, 3.2, 0.3);
    k.solid(-1.55, 0, 0.3, 2.2);
    k.solid(1.55, 0, 0.3, 2.2);
    k.box(0, 0, -1.0, 3.3, 1.9, 0.25, 0xffffff, wall);
    for (const s of [-1, 1]) k.box(s * 1.55, 0, 0, 0.25, 1.9, 2.25, 0xffffff, wall);
    dumpster(k, 0, -0.1, 0, P.dumpster, rng);
    k.box(-1.4, 0, 1.1, 0.12, 1.7, 0.9, 0x5b6a62, 'metal', { ry: 0.5 });
    k.box(1.4, 0, 1.1, 0.12, 1.7, 0.9, 0x5b6a62, 'metal', { ry: -0.5 });
  });
}
/** Little 4-pane window on a +Z wall that glows like a lit interior. */
function litWindow(k: Kit, x: number, y: number, zf: number, w: number, h: number, frame: Col = 0x2b2420) {
  k.box(x, y, zf - 0.02, w, h, 0.06, P.glassLit, 'glass');
  k.box(x, y + h, zf + 0.02, w + 0.2, 0.1, 0.1, frame);
  k.box(x, y - 0.1, zf + 0.03, w + 0.3, 0.1, 0.14, frame);
  for (const s of [-1, 1]) k.box(x + (s * (w + 0.1)) / 2, y, zf + 0.02, 0.1, h, 0.1, frame);
}

/* ------------------------------------------------------------------------------- sign helpers */

const F_SLAB = 'Alfa Slab One';
const F_OS = 'Oswald';

function drawBun(g: G2, cx: number, cy: number, w: number) {
  const h = w * 0.72;
  const top = cy - h * 0.5;
  g.fillStyle = '#d28f34';
  roundRect(g, cx - w * 0.42, top + h * 0.78, w * 0.84, h * 0.22, h * 0.1);
  g.fill();
  g.fillStyle = '#4a2a18';
  roundRect(g, cx - w * 0.48, top + h * 0.56, w * 0.96, h * 0.22, h * 0.1);
  g.fill();
  g.fillStyle = '#7bbf3e';
  g.beginPath();
  g.moveTo(cx - w * 0.5, top + h * 0.56);
  for (let i = 0; i <= 8; i++) g.lineTo(cx - w * 0.5 + (w * i) / 8, top + h * (i % 2 ? 0.66 : 0.5));
  g.lineTo(cx + w * 0.5, top + h * 0.56);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffd23a';
  g.fillRect(cx - w * 0.44, top + h * 0.5, w * 0.88, h * 0.07);
  g.fillStyle = '#e8a843';
  g.beginPath();
  g.ellipse(cx, top + h * 0.5, w * 0.5, h * 0.5, 0, Math.PI, Math.PI * 2);
  g.closePath();
  g.fill();
  g.fillStyle = '#fff2c8';
  for (const [sx, sy] of [[-0.25, 0.3], [0, 0.18], [0.25, 0.3], [-0.12, 0.38], [0.14, 0.4], [-0.35, 0.42], [0.36, 0.43]]) {
    g.beginPath();
    g.ellipse(cx + w * sx, top + h * sy, w * 0.03, h * 0.025, 0.4, 0, Math.PI * 2);
    g.fill();
  }
}

function menuBoard(title: string, items: [string, string][], accent: string, bg = '#17191c', ink = '#ffffff'): HTMLCanvasElement {
  const [c, g] = makeCanvas(384, 480);
  g.fillStyle = bg;
  g.fillRect(0, 0, 384, 480);
  g.strokeStyle = accent;
  g.lineWidth = 10;
  g.strokeRect(5, 5, 374, 470);
  const lines: Line[] = [{ text: title, font: F_SLAB, color: accent, y: 0.1, size: 0.1, maxW: 0.8 }];
  const step = 0.78 / items.length;
  items.forEach(([name, price], i) => {
    const y = 0.22 + i * step + step / 2;
    lines.push({ text: name, font: F_OS, weight: '600', color: ink, y, size: 0.058, x: 0.34, maxW: 0.5 });
    lines.push({ text: price, font: F_OS, weight: '700', color: accent, y, size: 0.062, x: 0.85, maxW: 0.2 });
  });
  drawLines(g, 384, 480, lines);
  return c;
}

/** Pole sign: sturdy steel post(s) carrying a two-sided panel. Returns the sign-centre y. */
function poleSign(k: Kit, x: number, z: number, o: { h: number; w: number; sh: number; ref: SignRef; back: Col; pole?: Col; thick?: number; twin?: number; frame?: number }) {
  const pole = o.pole ?? 0x6f7377;
  const sy = o.h - o.sh / 2;
  k.box(x, 0, z, o.twin ? o.twin + 1.4 : 1.2, 0.5, 1.2, CURB, 'concrete');
  if (o.twin) {
    for (const s of [-1, 1]) {
      k.solid(x + (s * o.twin) / 2, z, 0.6, 0.6);
      k.box(x + (s * o.twin) / 2, 0.5, z, 0.32, o.h - o.sh * 0.4, 0.32, pole, 'metal');
    }
  } else {
    k.solid(x, z, 0.7, 0.7);
    k.cyl(x, 0.5, z, 0.2, 0.26, o.h - o.sh * 0.5, 8, pole, 'metal');
  }
  k.sign(x, sy, z, o.w, o.sh, o.ref, { back: o.back, thick: o.thick ?? 0.4, twoSided: true, frame: o.frame ?? 0.12 });
  return sy;
}

/* ================================================================================================
 * 1. BIG BUN BURGERS — brick, brown mansard, drive-thru wrap, bun-topped pole sign
 * ============================================================================================== */

function burger3d(k: Kit, x: number, y: number, z: number, s: number) {
  k.cyl(x, y, z, 0.88 * s, 0.95 * s, 0.26 * s, 12, 0xd28f34);
  k.cyl(x, y + 0.26 * s, z, 0.97 * s, 0.97 * s, 0.24 * s, 12, 0x4a2a18);
  k.cyl(x, y + 0.5 * s, z, 1.08 * s, 1.0 * s, 0.1 * s, 10, 0x6fae3a);
  k.box(x, y + 0.6 * s, z, 1.75 * s, 0.06 * s, 1.75 * s, 0xf2c230, 'paint', { ry: Math.PI / 4 });
  k.ico(x, y + 0.66 * s, z, 1.02 * s, 1, 0xe0a03a, 'paint', 1, 0.66, 1);
  for (const [sx, sy2, sz] of [[-0.4, 0.62, 0.45], [0.35, 0.62, 0.5], [0, 0.7, 0.25], [0.55, 0.45, 0.4], [-0.6, 0.4, 0.4], [0.15, 0.55, 0.78]]) {
    k.box(x + sx * s, y + 0.7 * s + sy2 * s * 0.55, z + sz * s, 0.14 * s, 0.05 * s, 0.09 * s, 0xfff2c8);
  }
}

function bigBun(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 40;
  const D = 36;
  c.occ.add(x, z, W, D, ry, 1, false);
  const pole = sgn(c, 'bb.pole', () =>
    panelSign(640, 440, '#c8262c', [
      { text: 'BIG BUN', font: F_SLAB, color: '#ffd24a', y: 0.33, size: 0.3, stroke: '#4a0d0d', strokeW: 12, maxW: 0.86 },
      { text: 'BURGERS', font: F_SLAB, color: '#ffffff', y: 0.64, size: 0.22, stroke: '#4a0d0d', strokeW: 9, maxW: 0.8 },
      { text: 'DRIVE-THRU · OPEN LATE', font: F_OS, weight: '700', color: '#ffd24a', y: 0.89, size: 0.09 },
    ], { border: '#ffd24a', borderW: 16 }));
  const tower = sgn(c, 'bb.tower', () =>
    panelSign(512, 300, '#c8262c', [
      { text: 'BIG BUN', font: F_SLAB, color: '#ffffff', y: 0.82, size: 0.2, stroke: '#4a0d0d', strokeW: 8, maxW: 0.9 },
    ], { border: '#ffd24a', borderW: 12, draw: (g, w, h) => drawBun(g, w / 2, h * 0.38, h * 0.82) }));
  const menu = sgn(c, 'bb.menu', () =>
    menuBoard('BIG BUN MENU', [['BIG BUN', '1.99'], ['CHEESE BUN', '2.19'], ['BUN JR.', '.99'], ['CHICKEN CRISP', '2.29'], ['FRIES', '.99'], ['SHAKE', '1.29'], ['COLA', '.89'], ['BUN MEAL', '3.99']], '#ffd24a'));
  const thru = sgn(c, 'bb.thru', () =>
    panelSign(384, 160, '#c8262c', [
      { text: 'DRIVE', font: F_SLAB, color: '#ffd24a', y: 0.32, size: 0.34 },
      { text: 'THRU  →', font: F_SLAB, color: '#ffffff', y: 0.72, size: 0.34 },
    ], { border: '#ffffff', borderW: 8 }));
  const play = sgn(c, 'bb.play', () => panelSign(384, 120, '#ffd24a', [{ text: 'BUN PLAY PLACE', font: F_SLAB, color: '#c8262c', y: 0.52, size: 0.5, maxW: 0.92 }], { border: '#c8262c', borderW: 8 }));

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    k.solid(0, -5, 16, 10);
    // drive-thru loop edges + stalls
    for (const sx of [-1, 1]) {
      mark(k, sx * 10.1, -2, 0.12, 22, 0xe7b93a);
      mark(k, sx * 14.0, -2, 0.12, 22);
    }
    mark(k, 0, -10.9, 28.2, 0.12, 0xe7b93a);
    mark(k, 0, -15.9, 28.2, 0.12);
    stalls(k, -8.1, 2.7, 6, 1.7, 6.9);
    stalls(k, -13.5, 2.7, 10, 13.1, 18);
    mark(k, 0, 7.9, 0.15, 5.2, 0);
    // front walk + planting beds
    slab(k, 0, 0.9, 17.5, 1.8, 0.1);
    island(k, -17.5, 15.8, 5, 4.4);
    island(k, 17.5, 15.8, 5, 4.4);
    shrub(k, 16.0, 15.0, 0.7);
    shrub(k, 18.5, 16.4, 0.8, 0x44693a);
    shrub(k, -15.8, 17.0, 0.7, 0x44693a);

    k.at(0, -5, 0, () => {
      const H = 4.0;
      const zf = 5;
      k.box(0, 0, 0, 16, H, 10, 0xffffff, 'brickRed');
      k.box(0, 0, 0, 16.14, 0.35, 10.14, 0x8f8c87, 'concrete');
      storefront(k, -7.2, 7.2, 0.35, zf, 2.9, { frame: 0x2b2420, doorX: 4.6, kick: 0x2b2420 });
      // red / yellow stripe wrap
      for (const [bw, bd, ox, oz] of [[16.2, 0.1, 0, zf + 0.04], [16.2, 0.1, 0, -zf - 0.04]]) {
        k.box(ox, 3.3, oz, bw, 0.2, bd, 0xc8262c);
        k.box(ox, 3.5, oz, bw, 0.2, bd, 0xffd24a);
      }
      for (const sx of [-1, 1]) {
        k.box(sx * 8.04, 3.3, 0, 0.1, 0.2, 10.2, 0xc8262c);
        k.box(sx * 8.04, 3.5, 0, 0.1, 0.2, 10.2, 0xffd24a);
      }
      // mansard
      k.box(0, H - 0.12, 0, 16.7, 0.16, 10.7, 0x3e2a1e);
      frustum(k, 0, H, 0, 16.7, 10.7, 14.8, 8.8, 1.4, 0x4a3326);
      k.box(0, H + 1.4, 0, 14.8, 0.08, 8.8, P.roofTar);
      k.box(-3, H + 1.45, -1, 1.8, 0.9, 1.3, 0xc9c8c2);
      k.box(3, H + 1.45, -1, 1.8, 0.9, 1.3, 0xc9c8c2);
      // entrance portal + bun tower sign
      k.box(5.1, 3.3, zf + 0.45, 4.6, 2.6, 0.9, 0xc8262c);
      k.box(5.1, 3.3, zf + 0.9, 4.8, 0.14, 0.1, 0xffd24a);
      k.sign(5.1, 4.6, zf + 0.97, 4.0, 2.35, tower, { thick: 0.04 });
      k.box(4.6, 0, zf + 1.6, 0.18, 3.0, 0.18, 0xe9e0c8);
      k.box(7.0, 0, zf + 1.6, 0.18, 3.0, 0.18, 0xe9e0c8);
      k.box(5.8, 3.0, zf + 0.9, 3.0, 0.25, 1.4, 0xc8262c);
      k.solid(4.6, zf + 1.6, 0.3, 0.3);
      k.solid(7.0, zf + 1.6, 0.3, 0.3);
      // window ledges + patio table
      for (const tx of [-5.5, -2.5]) cafeTable(k, tx, zf + 1.6, 0xc8262c, 2);
      // left (drive-thru) wall: pay + pickup windows with canopy
      k.at(-8, 0, -HALF, () => {
        for (const wz of [-1.5, 1.8]) {
          k.box(wz, 0.9, 0.02, 1.8, 1.4, 0.08, P.glassLit, 'glass');
          k.box(wz, 0.8, 0.2, 2.0, 0.1, 0.5, 0xd9d9d6, 'metal');
          k.box(wz, 2.3, 0.08, 2.2, 0.12, 0.14, 0x2b2420);
          for (const s of [-1, 1]) k.box(wz + s * 0.95, 0.9, 0.06, 0.1, 1.4, 0.1, 0x2b2420);
        }
        k.box(0.15, 2.75, 0.55, 7.2, 0.16, 1.1, 0xc8262c);
        k.box(0.15, 2.7, 0.55, 7.0, 0.05, 1.0, 0xfff1d0, 'light', { cast: false });
        k.sign(-1.5, 3.05, 0.03, 1.5, 0.4, sgn(c, 'bb.pay', () => textOnly(256, 64, [{ text: 'PAY HERE', font: F_SLAB, color: '#ffd24a', y: 0.5, size: 0.7 }])), { back: 0x4a3326, thick: 0.05 });
        k.sign(1.8, 3.05, 0.03, 1.5, 0.4, sgn(c, 'bb.pick', () => textOnly(256, 64, [{ text: 'PICK UP', font: F_SLAB, color: '#ffd24a', y: 0.5, size: 0.7 }])), { back: 0x4a3326, thick: 0.05 });
      });
      // right wall windows
      k.at(8, 0, HALF, () => {
        for (const wz of [-2.5, 2]) windowAt(k, wz, 1.0, 0, 2.2, 1.6, { frame: 0x2b2420, mx: 2, my: 1 });
      });
      // back wall: service door, vents, grease bin
      k.at(0, -5, Math.PI, () => {
        doorAt(k, 3.5, 0.35, 0, 1.1, 2.2, 0x6b6f73);
        k.box(-2, 0.35, 0.02, 2.4, 2.4, 0.1, 0xe8e8e6, 'rollup');
        k.box(-5, 2.5, 0.12, 0.9, 0.6, 0.3, 0x8a8c8f, 'metal');
        downspout(k, 7.8, -0.1, H);
      });
    });
    // menu board + speaker post (driver's side of the right lane)
    k.at(9.2, -1.6, HALF, () => {
      k.solid(0, 0, 2, 0.5);
      for (const s of [-1, 1]) k.box(s * 0.7, 0, 0, 0.14, 2.3, 0.14, 0x2b2d31, 'metal');
      k.box(0, 0.7, 0, 1.7, 1.9, 0.18, 0x17191c);
      k.signPlane(0, 1.65, 0.1, 1.5, 1.8, menu);
      k.box(0, 2.6, 0.12, 1.9, 0.12, 0.7, 0xc8262c);
    });
    k.at(9.6, -6.2, HALF, () => {
      k.solid(0, 0, 0.5, 0.5);
      k.box(0, 0, 0, 0.8, 0.3, 0.8, CURB, 'concrete');
      k.cyl(0, 0.3, 0, 0.06, 0.06, 1.1, 6, 0x555a60, 'metal');
      k.box(0, 1.1, 0.05, 0.4, 0.5, 0.15, 0x2b2d31);
      k.box(0, 1.2, 0.14, 0.22, 0.22, 0.03, 0x111214);
    });
    k.sign(-12.1, 1.5, 12.2, 1.9, 0.8, thru, { back: 0xc8262c, thick: 0.08, ry: HALF });
    k.box(-12.1, 0, 12.2, 0.1, 1.1, 0.1, STEEL, 'metal');
    // play place: a glassy box with a roof dome
    k.at(17.3, -4, 0, () => {
      k.solid(0, 0, 5, 5);
      k.box(0, 0, 0, 4.6, 3.2, 4.6, 0xffd24a, 'boards');
      k.box(0, 0, 0, 4.7, 0.3, 4.7, CURB, 'concrete');
      for (const [i, col] of [0xc8262c, 0x2f7fd0, 0x3fa34d].entries()) k.cyl(-1.4 + i * 1.4, 3.2, 1.4, 0.45, 0.45, 1.0, 8, col);
      k.cyl(0, 3.2, 0, 1.8, 2.1, 0.7, 8, 0xc8262c);
      k.box(0, 1.0, 2.32, 3.4, 1.4, 0.06, P.glassLit, 'glass');
      k.sign(0, 2.75, 2.35, 3.0, 0.65, play, { thick: 0.05 });
      // slide
      k.beam({ x: 1.6, y: 2.9, z: -2.3 }, { x: 1.6, y: 0.35, z: -5.2 }, 0.8, 0.08, 0xc8262c);
      k.box(1.6, 0, -5.3, 0.9, 0.35, 0.9, 0x3fa34d);
    });
    trashCorral(k, -17, -11.5, rng);
    // pole sign topped with a 3D burger
    k.at(0, 0, 0, () => {
      const sx = -17.4;
      const sz = 15.6;
      poleSign(k, sx, sz, { h: 8.2, w: 4.0, sh: 2.8, ref: pole, back: 0xc8262c, pole: 0xe9e0c8 });
      burger3d(k, sx, 8.4, sz, 1.0);
    });
    lamp(k, -6, 12.3, 0, 8, true);
    lamp(k, 6, 12.3, 0, 8, true);
    trashCan(k, 2.3, 3.1, 0xc8262c);
    park(c, 'sedan', -5.4, 4.3, HALF, rng.pick(CAR_COLORS));
    park(c, 'pickup', 2.7, 4.3, HALF, rng.pick(CAR_COLORS));
    park(c, 'van', 8.1, 15.7, -HALF, rng.pick(CAR_COLORS));
    park(c, 'coupe', 12.0, -5.5, HALF, rng.pick(CAR_COLORS));
  });
}

/* ------------------------------------------------------------------------------ shape helpers */

function archShape(w: number, h: number): THREE.Shape {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.closePath();
  return s;
}
function trapShape(bw: number, tw: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-bw / 2, 0);
  s.lineTo(bw / 2, 0);
  s.lineTo(tw / 2, h);
  s.lineTo(-tw / 2, h);
  s.closePath();
  return s;
}
function frontage(k: Kit, rng: Rng, W: number, zc: number, depth: number, gaps: [number, number][]) {
  let x0 = -W / 2;
  const segs: [number, number][] = [];
  for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (g0 > x0) segs.push([x0, g0]);
    x0 = g1;
  }
  if (x0 < W / 2) segs.push([x0, W / 2]);
  for (const [a, b] of segs) {
    island(k, (a + b) / 2, zc, b - a, depth);
    const n = Math.max(1, Math.floor((b - a) / 3.4));
    for (let i = 0; i < n; i++) {
      const sx = n === 1 ? (a + b) / 2 : a + 1.2 + (i * (b - a - 2.4)) / (n - 1);
      shrub(k, sx, zc + rng.range(-0.3, 0.3), rng.range(0.5, 0.75), rng.pick([0x3f5e30, 0x44693a, 0x4f7a3c]), 0.18);
    }
  }
}
function cactus(k: Kit, x: number, z: number, h: number) {
  k.box(x, 0, z, 0.6, 0.45, 0.6, 0xb5532f);
  k.cyl(x, 0.45, z, 0.2, 0.24, h, 6, 0x4f8a45);
  k.cyl(x - 0.34, 0.45 + h * 0.45, z, 0.13, 0.15, h * 0.4, 6, 0x4f8a45);
  k.box(x - 0.22, 0.45 + h * 0.4, z - 0.05, 0.22, 0.14, 0.14, 0x4f8a45);
  k.cyl(x + 0.32, 0.45 + h * 0.3, z, 0.12, 0.14, h * 0.35, 6, 0x4f8a45);
  k.box(x + 0.2, 0.45 + h * 0.28, z, 0.2, 0.12, 0.12, 0x4f8a45);
}

/* ================================================================================================
 * 2. TACO SHACK — cream stucco, arches, terracotta roof, bell tower, front drive-thru lane
 * ============================================================================================== */

function tacoShack(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 38;
  const D = 26;
  c.occ.add(x, z, W, D, ry, 1, false);
  const pole = sgn(c, 'tc.pole', () =>
    panelSign(640, 400, '#e0457b', [
      { text: 'TACO SHACK', font: F_SLAB, color: '#ffd23a', y: 0.3, size: 0.25, stroke: '#5a1230', strokeW: 10, maxW: 0.9 },
      { text: 'TACOS · BURRITOS · NACHOS', font: F_OS, weight: '700', color: '#ffffff', y: 0.58, size: 0.1 },
      { text: 'DRIVE-THRU', font: F_SLAB, color: '#1fe0cf', y: 0.82, size: 0.17, stroke: '#0a3d38', strokeW: 6 },
    ], { border: '#1fa59a', borderW: 18 }));
  const wall = sgn(c, 'tc.wall', () => panelSign(768, 170, '#1fa59a', [{ text: 'TACO SHACK', font: F_SLAB, color: '#ffd23a', y: 0.52, size: 0.64, stroke: '#0a4a45', strokeW: 8, maxW: 0.9 }], { border: '#e0457b', borderW: 12 }));
  const menu = sgn(c, 'tc.menu', () => menuBoard('TACO SHACK', [['TACO', '.79'], ['SUPER TACO', '1.29'], ['BURRITO', '1.99'], ['NACHOS', '1.49'], ['QUESADILLA', '1.79'], ['CHURROS', '.99'], ['SODA', '.89']], '#ffd23a', '#145a55'));
  const order = sgn(c, 'tc.order', () => textOnly(256, 64, [{ text: 'ORDER HERE', font: F_SLAB, color: '#ffd23a', y: 0.5, size: 0.7, stroke: '#145a55', strokeW: 6 }]));

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    mark(k, 0, 1.0, 36, 0.12, 0xe7b93a);
    mark(k, 0, 5.7, 36, 0.12);
    stalls(k, -16.8, 2.8, 12, 6.0, 11.0);
    for (let i = 0; i < 4; i++) mark(k, 12 + i * 2.2, 3.3, 1.2, 0.3, 0xf1f1ec);
    frontage(k, rng, W, 12.0, 2.0, [[-10, -3], [9, 16]]);
    lamp(k, -6.5, 12.0, 0, 7.5, true);
    lamp(k, 17.2, 12.0, -HALF, 7.5);
    k.solid(-3, -4.5, 15, 9);
    k.at(-3, -4.5, 0, () => {
      const H = 3.9;
      const zf = 4.5;
      k.box(0, 0, 0, 15, H, 9, 0xe8dcb5, 'stucco');
      k.box(0, 0, 0, 15.14, 0.3, 9.14, 0xb9b0a0, 'concrete');
      for (const sx of [-1, 1]) k.box(sx * 7.5, H - 0.4, 0, 0.14, 0.4, 9.14, 0x1fa59a);
      k.box(0, H - 0.4, zf, 15.14, 0.4, 0.14, 0x1fa59a);
      k.box(0, H - 0.4, -zf, 15.14, 0.4, 0.14, 0x1fa59a);
      k.hipRoof(0, H, 0, 15, 9, 1.7, 0xb85a32, 'shingle', 0.6);
      k.sign(0.5, H + 0.0, zf + 0.62, 7.6, 1.5, wall, { thick: 0.15, back: 0x1fa59a });
      k.box(0.5, H - 0.8, zf + 0.54, 7.9, 0.1, 0.22, 0xe0457b);
      // arched glazing
      for (const ax of [-2.2, 1.5]) {
        k.extrude(archShape(2.9, 3.1), 0.1, 0xb85a32, 'paint', ax, 0.35, zf + 0.0);
        k.extrude(archShape(2.5, 2.8), 0.06, P.glassLit, 'glass', ax, 0.35, zf + 0.06);
        k.box(ax, 0.35, zf + 0.08, 0.07, 2.0, 0.05, 0xe8dcb5);
        k.box(ax, 1.3, zf + 0.08, 2.5, 0.07, 0.05, 0xe8dcb5);
      }
      // order window with striped awning
      k.box(4.4, 1.2, zf - 0.02, 1.9, 1.3, 0.06, P.glassLit, 'glass');
      k.box(4.4, 1.05, zf + 0.25, 2.2, 0.1, 0.55, 0xd9d9d6, 'metal');
      awning(k, 4.4, 2.8, zf + 0.04, 2.5, 1.5, 0.6, 'awningGreen');
      k.sign(4.4, 3.2, zf + 0.06, 1.6, 0.4, order, { thick: 0.05, back: 0x145a55 });
      // entry door with arch trim
      doorAt(k, 6.35, 0.3, zf, 1.1, 2.3, 0x1fa59a, { glass: true });
      k.extrude(archShape(1.6, 0.8), 0.12, 0xb85a32, 'paint', 6.35, 2.55, zf + 0.04);
      // bell tower
      k.at(-6.2, 4.5, 0, () => {
        k.box(0, 0, 0, 2.4, 6.4, 2.4, 0xe8dcb5, 'stucco');
        k.box(0, 0, 0, 2.55, 0.35, 2.55, 0xb9b0a0, 'concrete');
        for (const [ox, oz, rr] of [[0, 1.2, 0], [0, -1.2, 0], [1.2, 0, HALF], [-1.2, 0, HALF]] as [number, number, number][]) {
          k.at(ox, oz, rr, () => k.extrude(archShape(1.2, 1.9), 0.1, 0x2a2220, 'paint', 0, 3.7, 0.02));
        }
        frustum(k, 0, 6.4, 0, 3.0, 3.0, 0.5, 0.5, 1.9, 0xb85a32);
        k.cyl(0, 8.3, 0, 0.04, 0.04, 0.6, 5, 0x333333, 'metal');
        k.box(0, 8.6, 0, 0.4, 0.04, 0.04, 0x333333, 'metal');
        k.cyl(0, 4.0, 0, 0.12, 0.42, 0.7, 8, 0xe0b53a, 'metal');
        k.box(0, 3.78, 0, 0.1, 0.3, 0.1, 0x333333, 'metal');
      });
      // menu board + speaker
      k.at(-6.8, 3.0, 0, () => {
        k.solid(0, 0, 2.2, 0.8);
        k.box(0, 0, 0, 2.2, 0.15, 0.9, CURB, 'concrete');
        for (const s of [-1, 1]) k.box(s * 0.8, 0.15, 0, 0.14, 2.0, 0.14, 0x2b2d31, 'metal');
        k.box(0, 0.8, 0, 1.9, 1.7, 0.18, 0x145a55);
        k.signPlane(0, 1.65, 0.1, 1.7, 1.55, menu);
        k.box(0, 2.45, 0.15, 2.1, 0.14, 0.5, 0xe0457b);
      });
      // rear
      k.at(0, -zf, Math.PI, () => {
        doorAt(k, -3, 0.3, 0, 1.0, 2.2, 0x6b6f73);
        k.box(3, 0.3, 0.02, 2.2, 2.3, 0.1, 0xe8e8e6, 'rollup');
      });
    });
    // patio with umbrellas and cacti
    for (const tx of [6.5, 9.7]) cafeTable(k, tx, -2.8, rng.pick([0xe0457b, 0x1fa59a, 0xf28c28]), 3);
    cactus(k, 12.8, -5.2, 1.6);
    cactus(k, -12.4, 0.2, 1.1);
    trashCan(k, 2.0, 0.55, 0x1fa59a);
    trashCorral(k, -15.5, -10, rng, 'stucco');
    // pole sign with a giant bell
    const sx = -15.5;
    const sz = 12.0;
    poleSign(k, sx, sz, { h: 8.0, w: 3.8, sh: 2.4, ref: pole, back: 0xe0457b, pole: 0xe8dcb5 });
    k.cyl(sx, 8.2, sz, 0.14, 0.88, 1.5, 10, 0xe0b53a, 'metal');
    k.cyl(sx, 8.2, sz, 0.98, 0.98, 0.14, 10, 0xc9972a, 'metal');
    k.sphere(sx, 8.15, sz, 0.2, 0x4a3a1a, 'paint', 6, 4);
    k.torus(sx, 9.78, sz, 0.18, 0.05, 4, 8, 0x333333, 'metal', { rx: HALF });
    park(c, 'pickup', -8.4, 8.5, HALF, rng.pick(CAR_COLORS));
    park(c, 'sedan', -2.8, 8.5, HALF, rng.pick(CAR_COLORS));
    park(c, 'suv', 11.2, 8.5, HALF, rng.pick(CAR_COLORS));
    park(c, 'wagon', -13.5, 3.3, 0, rng.pick(CAR_COLORS));
  });
}

/* ================================================================================================
 * 3. PIZZA PALACE — the red steep "hut" roof, trapezoid windows, brick base, ridge sign
 * ============================================================================================== */

function pizzaPalace(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 38;
  const D = 30;
  c.occ.add(x, z, W, D, ry, 1, false);
  const ridge = sgn(c, 'pz.ridge', () =>
    panelSign(640, 150, '#f4ede0', [{ text: 'Pizza Palace', font: 'Lobster', color: '#b3231c', y: 0.52, size: 0.78, stroke: '#ffffff', strokeW: 4, maxW: 0.92 }], { border: '#b3231c', borderW: 12 }));
  const pole = sgn(c, 'pz.pole', () =>
    panelSign(640, 330, '#f4ede0', [
      { text: 'Pizza Palace', font: 'Lobster', color: '#b3231c', y: 0.36, size: 0.34, maxW: 0.88 },
      { text: 'DINE IN · CARRY OUT · DELIVERY', font: F_OS, weight: '700', color: '#2a2a2a', y: 0.68, size: 0.095 },
      { text: 'LUNCH BUFFET 4.99', font: F_OS, weight: '700', color: '#b3231c', y: 0.86, size: 0.12 },
    ], { border: '#b3231c', borderW: 16 }));
  const specials = sgn(c, 'pz.spec', () =>
    panelSign(256, 320, '#2a2a2a', [
      { text: 'TODAY', font: F_SLAB, color: '#ffd24a', y: 0.14, size: 0.14 },
      { text: 'ALL YOU CAN', font: F_OS, weight: '700', color: '#ffffff', y: 0.38, size: 0.1 },
      { text: 'EAT BUFFET', font: F_OS, weight: '700', color: '#ffffff', y: 0.52, size: 0.1 },
      { text: '4.99', font: F_SLAB, color: '#ff6a4d', y: 0.78, size: 0.3 },
    ], { border: '#ffd24a', borderW: 8 }));

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    stalls(k, -11, 2.7, 8, 2.8, 8.0);
    stalls(k, -15.9, 2.7, 6, -9.0, -4.0);
    mark(k, -14, 13.4, 5, 0.1, 0xf1f1ec);
    frontage(k, rng, W, 13.6, 2.6, [[-14, -7], [8, 15]]);
    lamp(k, -12.5, 9.5, 0, 8);
    lamp(k, 11, 9.5, 0, 8, true);
    slab(k, 0, 1.7, 21, 1.5, 0.1);
    k.solid(-2, -5, 17, 13);
    k.at(-2, -5, 0, () => {
      const w = 17;
      const d = 13;
      const H = 3.4;
      const zf = d / 2;
      k.box(0, 0, 0, w, H, d, 0xffffff, 'brickRed');
      k.box(0, 0, 0, w + 0.14, 0.35, d + 0.14, 0x8f8c87, 'concrete');
      k.box(0, H - 0.3, 0, w + 0.2, 0.3, d + 0.2, 0xf0e8d4);
      // steep red roof (two tiers: lower skirt + upper hut)
      frustum(k, 0, H, 0, w + 1.8, d + 1.8, w - 1.6, d - 1.4, 1.7, 0xb02a22);
      frustum(k, 0, H + 1.7, 0, w - 1.6, d - 1.4, 6.8, 1.2, 2.6, 0xb02a22);
      k.box(0, H + 4.3, 0, 6.9, 0.2, 1.3, 0x7d1a15);
      k.box(0, H - 0.05, 0, w + 1.9, 0.1, d + 1.9, 0x7d1a15);
      // trapezoid windows
      const trap = (px: number) => {
        k.extrude(trapShape(4.0, 3.2, 2.2), 0.1, 0x4a2c1c, 'paint', px, 0.55, zf + 0.0);
        k.extrude(trapShape(3.6, 2.85, 1.95), 0.06, P.glassLit, 'glass', px, 0.68, zf + 0.06);
        k.box(px, 0.68, zf + 0.09, 0.07, 1.95, 0.04, 0x4a2c1c);
      };
      trap(-5.2);
      trap(5.2);
      k.box(0, 0.35, zf + 0.02, 3.0, 2.5, 0.12, 0x4a2c1c);
      doorAt(k, 0, 0.35, zf + 0.04, 1.8, 2.3, 0x4a2c1c, { glass: true, double: true });
      k.box(0, 3.1, zf + 0.5, 3.4, 0.12, 1.1, 0xb02a22);
      k.sign(-2.4, 3.0, zf + 0.04, 0.9, 1.1, specials, { thick: 0.04, back: 0x2a2a2a });
      // side windows
      for (const sx of [-1, 1]) {
        k.at(sx * (w / 2), 0, sx * HALF, () => {
          for (const wz of [-3, 0, 3]) {
            k.extrude(trapShape(2.3, 1.8, 1.7), 0.1, 0x4a2c1c, 'paint', wz, 0.9, 0);
            k.extrude(trapShape(2.0, 1.55, 1.5), 0.06, P.glassLit, 'glass', wz, 1.0, 0.06);
          }
        });
      }
      // ridge sign
      for (const sx of [-2.2, 2.2]) k.box(sx, H + 4.2, 0, 0.14, 0.9, 0.14, 0x555a60, 'metal');
      k.sign(0, H + 5.15, 0, 6.2, 1.25, ridge, { back: 0xf4ede0, thick: 0.3, twoSided: true });
      k.box(0, H + 5.15, 0, 6.2, 0.1, 0.34, 0xb3231c);
      // rear service
      k.at(0, -d / 2, Math.PI, () => {
        doorAt(k, 3, 0.35, 0, 1.1, 2.2, 0x6b6f73);
        k.box(-3, 0.5, 0.1, 0.9, 0.6, 0.35, 0x8a8c8f, 'metal');
      });
    });
    trashCorral(k, 11, -12, rng);
    // pole sign + roof-silhouette cap
    const sx = -14.5;
    const sz = 13.9;
    poleSign(k, sx, sz, { h: 7.8, w: 3.8, sh: 2.0, ref: pole, back: 0xf4ede0, pole: 0xb02a22 });
    frustum(k, sx, 7.9, sz, 4.0, 0.7, 1.8, 0.5, 1.2, 0xb02a22);
    for (let i = 0; i < 2; i++) conifer(k, 17 + i * 0.1, 12.0 - i * 0.2, 4.2 + i * 0.5);
    park(c, 'sedan', -8.5, 5.4, HALF, rng.pick(CAR_COLORS));
    park(c, 'wagon', -3.1, 5.4, HALF, rng.pick(CAR_COLORS));
    park(c, 'pickup', 7.7, 5.4, HALF, rng.pick(CAR_COLORS));
    park(c, 'van', -13.4, -6.5, 0, 0xe9e8e2);
  });
}

/* ================================================================================================
 * 4. CLUCKER'S FRIED CHICKEN — red & white striped mansard + cupola, striped bucket sign
 * ============================================================================================== */

function bucket3d(k: Kit, x: number, y: number, z: number, s: number) {
  const rb = 0.95 * s;
  const rt = 1.35 * s;
  const h = 2.0 * s;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    k.beam({ x: x + rb * ca, y, z: z + rb * sa }, { x: x + rt * ca, y: y + h, z: z + rt * sa }, ((rb + rt) / 2) * 0.55, 0.12, i % 2 ? 0xf6f2e8 : 0xc8262c, 'paint');
  }
  k.cyl(x, y + h - 0.05, z, rt + 0.1, rt + 0.1, 0.18 * s, 12, 0xc8262c);
  k.cyl(x, y, z, rb, rb, 0.05, 12, 0x8a1a1a);
  // drumsticks poking out of the top
  for (const [dx, dz, tilt, col] of [[-0.35, 0.1, 0.5, 0xc8742a], [0.35, -0.1, -0.45, 0xb8641e], [0, 0.4, 0.2, 0xd68a38], [0.1, -0.4, 0, 0xc07028]] as [number, number, number, number][]) {
    const bx = x + dx * s;
    const bz = z + dz * s;
    k.cyl(bx, y + h, bz, 0.14 * s, 0.19 * s, 0.5 * s, 6, col, 'paint', { rz: tilt });
    k.ico(bx - tilt * 0.4 * s, y + h + 0.58 * s, bz, 0.3 * s, 0, col, 'paint', 1, 0.9, 1);
    k.box(bx - tilt * 0.55 * s, y + h + 0.38 * s, bz, 0.1 * s, 0.4 * s, 0.1 * s, 0xf0e4c8, 'paint', { rz: tilt });
  }
}

function cluckers(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 38;
  const D = 36;
  c.occ.add(x, z, W, D, ry, 1, false);
  const wall = sgn(c, 'ck.wall', () =>
    panelSign(768, 240, '#c8262c', [
      { text: "Clucker's", font: 'Lobster', color: '#ffffff', y: 0.42, size: 0.62, stroke: '#7a1010', strokeW: 6, maxW: 0.9 },
      { text: 'FRIED CHICKEN', font: F_OS, weight: '700', color: '#ffe9a8', y: 0.84, size: 0.2, letter: 6 },
    ], { border: '#ffffff', borderW: 12 }));
  const pole = sgn(c, 'ck.pole', () =>
    panelSign(512, 200, '#ffffff', [
      { text: "Clucker's", font: 'Lobster', color: '#c8262c', y: 0.4, size: 0.5, maxW: 0.9 },
      { text: 'FRIED CHICKEN · DRIVE-THRU', font: F_OS, weight: '700', color: '#2a2a2a', y: 0.82, size: 0.14 },
    ], { border: '#c8262c', borderW: 14 }));
  const menu = sgn(c, 'ck.menu', () => menuBoard("CLUCKER'S", [['2 PC MEAL', '2.99'], ['3 PC MEAL', '3.79'], ['8 PC BUCKET', '8.49'], ['12 PC BUCKET', '10.99'], ['BISCUIT', '.59'], ['COLESLAW', '.89'], ['MASHED POTATOES', '.99']], '#ffe9a8', '#8a1a1a'));
  const deal = sgn(c, 'ck.deal', () =>
    panelSign(384, 200, '#ffe9a8', [
      { text: 'FAMILY BUCKET', font: F_SLAB, color: '#c8262c', y: 0.28, size: 0.17, maxW: 0.9 },
      { text: '12 PIECES · 4 SIDES', font: F_OS, weight: '700', color: '#2a2a2a', y: 0.55, size: 0.12 },
      { text: '10.99', font: F_SLAB, color: '#c8262c', y: 0.8, size: 0.28 },
    ], { border: '#c8262c', borderW: 10 }));

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    for (const sx of [-1, 1]) {
      mark(k, sx * 11.0, -3, 0.12, 20, 0xe7b93a);
      mark(k, sx * 15.0, -3, 0.12, 20);
    }
    stalls(k, -8.1, 2.7, 6, 2.4, 7.6);
    stalls(k, -10.8, 2.7, 8, 12.8, 18.0);
    island(k, -16, 15.4, 6, 5.2);
    island(k, 15.5, 15.4, 6, 5.2);
    shrub(k, -14.5, 14.2, 0.8, 0x44693a, 0.18);
    shrub(k, -17.2, 16.6, 0.6, 0x3f5e30, 0.18);
    shrub(k, 14.3, 14.2, 0.7, 0x3f5e30, 0.18);
    lamp(k, -12.2, 10.2, 0, 8, true);
    lamp(k, 12.2, 10.2, 0, 8, true);
    slab(k, 0, 1.2, 17, 1.8, 0.1);
    k.solid(0, -6, 15, 10);
    k.at(0, -6, 0, () => {
      const w = 15;
      const d = 10;
      const H = 3.5;
      const zf = d / 2;
      k.box(0, 0, 0, w, H, d, 0xf3efe6, 'brickPaint');
      k.box(0, 0, 0, w + 0.14, 0.35, d + 0.14, 0x8f8c87, 'concrete');
      k.box(0, H - 0.25, 0, w + 0.1, 0.25, d + 0.1, 0xc8262c);
      // striped mansard + cupola
      frustum(k, 0, H, 0, w + 0.9, d + 0.9, w - 2.0, d - 2.0, 1.7, 0xffffff, 'awningRed');
      k.box(0, H + 1.7, 0, w - 2.0, 0.08, d - 2.0, P.roofTar);
      k.box(0, H + 1.78, 0, 4.2, 1.5, 4.2, 0xf3efe6, 'brickPaint');
      frustum(k, 0, H + 3.28, 0, 5.2, 5.2, 0.6, 0.6, 1.5, 0xffffff, 'awningRed');
      k.box(0, H + 4.78, 0, 0.25, 0.25, 0.25, 0xc8262c);
      k.cyl(0, H + 5.0, 0, 0.03, 0.03, 0.8, 5, 0xc8262c);
      for (const [ox, oz, rr] of [[0, 2.11, 0], [0, -2.11, 0], [2.11, 0, HALF], [-2.11, 0, HALF]] as [number, number, number][]) {
        k.at(ox, oz, rr, () => k.extrude(archShape(1.4, 1.2), 0.06, P.glassLit, 'glass', 0, H + 1.95, 0));
      }
      // front glazing + striped awning
      storefront(k, -6.8, 6.8, 0.35, zf, 2.7, { frame: 0xc8262c, doorX: -4.2, kick: 0xc8262c });
      awning(k, 1.2, 3.15, zf + 0.04, 11.2, 1.3, 0.55, 'awningRed');
      k.sign(0, H - 0.0 + 0.2, zf + 0.12, 7.6, 2.0, wall, { thick: 0.12 });
      k.sign(5.4, 1.5, zf + 0.12, 1.5, 0.8, deal, { thick: 0.05, back: 0xc8262c });
      // drive-thru window on the right wall + menu board
      k.at(w / 2, 0, HALF, () => {
        k.box(2.0, 1.0, 0.02, 1.8, 1.3, 0.08, P.glassLit, 'glass');
        k.box(2.0, 0.9, 0.22, 2.0, 0.1, 0.5, 0xd9d9d6, 'metal');
        awning(k, 2.0, 2.7, 0.04, 2.4, 1.1, 0.5, 'awningRed');
      });
      for (const sx of [-1, 1]) {
        k.at(sx * (w / 2), 0, sx * HALF, () => {
          windowAt(k, -2.6, 1.0, 0, 2.0, 1.5, { frame: 0xc8262c, mx: 2, my: 1 });
        });
      }
      k.at(0, -zf, Math.PI, () => {
        doorAt(k, 4, 0.35, 0, 1.1, 2.2, 0x6b6f73);
        k.box(-3, 0.5, 0.1, 0.9, 0.6, 0.35, 0x8a8c8f, 'metal');
      });
    });
    k.at(15.4, -3.5, -HALF, () => {
      k.solid(0, 0, 1.9, 0.5);
      for (const s of [-1, 1]) k.box(s * 0.7, 0, 0, 0.14, 2.3, 0.14, 0x2b2d31, 'metal');
      k.box(0, 0.7, 0, 1.7, 1.9, 0.18, 0x8a1a1a);
      k.signPlane(0, 1.65, 0.1, 1.5, 1.8, menu);
      k.box(0, 2.6, 0.12, 1.9, 0.12, 0.7, 0xc8262c);
    });
    trashCorral(k, -15.5, -14, rng);
    const sx = -16.5;
    const sz = 15.9;
    poleSign(k, sx, sz, { h: 6.4, w: 3.4, sh: 1.35, ref: pole, back: 0xc8262c, pole: 0xf3efe6 });
    bucket3d(k, sx, 6.6, sz, 1.0);
    park(c, 'sedan', -5.4, 5.0, HALF, rng.pick(CAR_COLORS));
    park(c, 'pickup', 5.4, 5.0, HALF, rng.pick(CAR_COLORS));
    park(c, 'wagon', 2.7, 15.4, -HALF, rng.pick(CAR_COLORS));
    park(c, 'jeep', -5.4, 15.4, -HALF, 0xd27d2c);
  });
}

/* ================================================================================================
 * 5. DAIRY DREAM — walk-up ice-cream stand with red mansard, picnic tables
 * ============================================================================================== */

function picnic(k: Kit, x: number, z: number, ry: number, umbrella?: Col) {
  k.at(x, z, ry, () => {
    k.solid(0, 0, 2.2, 1.9);
    k.box(0, 0.72, 0, 2.0, 0.08, 0.8, 0xa87a4a, 'planks');
    for (const s of [-1, 1]) {
      k.box(0, 0.42, s * 0.7, 2.0, 0.07, 0.3, 0xa87a4a, 'planks');
      k.beam({ x: -0.8, y: 0, z: s * 0.85 }, { x: -0.5, y: 0.72, z: s * 0.1 }, 0.07, 0.07, 0x7a5a38);
      k.beam({ x: 0.8, y: 0, z: s * 0.85 }, { x: 0.5, y: 0.72, z: s * 0.1 }, 0.07, 0.07, 0x7a5a38);
    }
    if (umbrella !== undefined) {
      k.cyl(0, 0.72, 0, 0.03, 0.03, 1.9, 5, 0xdddddd, 'metal');
      k.cone(0, 2.35, 0, 1.4, 0.45, 8, umbrella);
    }
  });
}

function softServe3d(k: Kit, x: number, y: number, z: number, s: number) {
  k.cone(x, y, z, 0.62 * s, 1.5 * s, 8, 0xd9a95a, 'paint', { rx: Math.PI });
  k.cyl(x, y + 1.5 * s, z, 0.7 * s, 0.7 * s, 0.14 * s, 8, 0xc8262c);
  k.ico(x, y + 1.82 * s, z, 0.78 * s, 1, 0xfff4e0, 'paint', 1, 0.55, 1);
  k.ico(x, y + 2.25 * s, z, 0.6 * s, 1, 0xfff4e0, 'paint', 1, 0.55, 1);
  k.ico(x, y + 2.6 * s, z, 0.4 * s, 1, 0xfff4e0, 'paint', 1, 0.7, 1);
  k.cone(x, y + 2.8 * s, z, 0.14 * s, 0.3 * s, 6, 0xfff4e0);
}

function dairyDream(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 36;
  const D = 28;
  c.occ.add(x, z, W, D, ry, 1, false);
  const roofSign = sgn(c, 'dd.roof', () =>
    panelSign(640, 160, '#c8262c', [{ text: 'Dairy Dream', font: 'Lobster', color: '#ffffff', y: 0.5, size: 0.78, stroke: '#7a1010', strokeW: 6, maxW: 0.92 }], { border: '#ffffff', borderW: 10 }));
  const pole = sgn(c, 'dd.pole', () =>
    panelSign(512, 300, '#ffffff', [
      { text: 'Dairy Dream', font: 'Lobster', color: '#c8262c', y: 0.34, size: 0.4, maxW: 0.9 },
      { text: 'SOFT SERVE · SUNDAES · SHAKES', font: F_OS, weight: '700', color: '#2a2a2a', y: 0.68, size: 0.09 },
      { text: 'BLIZZ-STYLE TREATS 1.49', font: F_OS, weight: '700', color: '#c8262c', y: 0.86, size: 0.1 },
    ], { border: '#c8262c', borderW: 14 }));
  const menuL = sgn(c, 'dd.menuL', () => menuBoard('SUNDAES', [['HOT FUDGE', '1.59'], ['STRAWBERRY', '1.59'], ['BANANA SPLIT', '2.29'], ['PEANUT BUSTER', '2.19'], ['CONE', '.85'], ['DIPPED CONE', '1.15']], '#ffffff', '#c8262c'));
  const menuR = sgn(c, 'dd.menuR', () => menuBoard('SHAKES', [['VANILLA', '1.39'], ['CHOCOLATE', '1.39'], ['STRAWBERRY', '1.39'], ['MALT', '1.59'], ['ROOT BEER FLOAT', '1.49'], ['SMALL CONE', '.69']], '#ffffff', '#c8262c'));

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    stalls(k, -10.8, 2.7, 8, 4.0, 9.2);
    mark(k, 0, 9.2, 22, 0.12);
    frontage(k, rng, W, 12.0, 3.0, [[-14, -7], [6, 13]]);
    lamp(k, -12.5, 7.4, 0, 7.5);
    lamp(k, 14, -3, -HALF, 7.5, true);
    // concrete service pad
    slab(k, -2, 1.8, 13, 3.0, 0.1);
    k.solid(-2, -4.0, 9.2, 6.2);
    k.at(-2, -4.0, 0, () => {
      const w = 9;
      const d = 6;
      const H = 3.0;
      const zf = d / 2;
      k.box(0, 0, 0, w, H, d, 0xf3efe6, 'brickPaint');
      k.box(0, 0, 0, w + 0.14, 0.3, d + 0.14, 0x8f8c87, 'concrete');
      k.box(0, 1.8, zf + 0.04, w, 0.14, 0.1, 0xc8262c);
      frustum(k, 0, H, 0, w + 1.0, d + 1.0, w - 1.2, d - 1.2, 1.5, 0xa8201f);
      k.box(0, H + 1.5, 0, w - 1.2, 0.08, d - 1.2, 0xa8201f);
      k.box(0, H - 0.1, 0, w + 1.1, 0.14, d + 1.1, 0x7a1010);
      // roof sign, two-sided, on posts
      for (const sx of [-3, 3]) k.box(sx, H + 1.45, 0, 0.14, 0.9, 0.14, 0x555a60, 'metal');
      k.sign(0, H + 2.3, 0, 6.4, 1.3, roofSign, { back: 0xc8262c, thick: 0.25, twoSided: true });
      // order windows (sliding glass) + shelves + awnings
      for (const wx of [-1.6, 1.6]) {
        k.box(wx, 1.2, zf - 0.02, 2.0, 1.3, 0.06, P.glassLit, 'glass');
        k.box(wx, 1.05, zf + 0.3, 2.3, 0.1, 0.6, 0xd9d9d6, 'metal');
        for (const s of [-1, 1]) k.box(wx + s * 1.1, 1.2, zf + 0.02, 0.1, 1.3, 0.1, 0xc8262c);
        awning(k, wx, 2.75, zf + 0.04, 2.5, 1.3, 0.6, 'awningRed');
      }
      for (const [i, ref] of [menuL, menuR].entries()) {
        const mx = i ? 3.7 : -3.7;
        k.box(mx, 0.35, zf + 0.12, 1.0, 1.9, 0.14, 0x8a1a1a);
        k.signPlane(mx, 1.3, zf + 0.2, 0.9, 1.7, ref);
      }
      // side + rear
      k.at(w / 2, 0, HALF, () => doorAt(k, 0.5, 0.3, 0, 1.0, 2.2, 0x6b6f73));
      k.at(0, -zf, Math.PI, () => {
        windowAt(k, 2, 1.2, 0, 1.4, 1.0, { frame: 0xc8262c });
        k.box(-2.5, 0.4, 0.1, 0.9, 0.6, 0.35, 0x8a8c8f, 'metal');
      });
    });
    // picnic grounds
    slab(k, 11.5, 0.5, 11, 9, 0.08);
    picnic(k, 8.8, -1.8, 0.1, 0xc8262c);
    picnic(k, 13.6, -1.8, -0.1, 0xf6f2e8);
    picnic(k, 8.8, 3.2, 0, 0xf6f2e8);
    picnic(k, 13.6, 3.2, 0.1, 0xc8262c);
    bench(k, -9.2, 1.5, 0);
    trashCan(k, 4.2, 2.3, 0xc8262c);
    trashCan(k, 7.0, -4.5, 0xc8262c);
    const sx = -14.5;
    const sz = 12.2;
    poleSign(k, sx, sz, { h: 6.6, w: 3.2, sh: 1.9, ref: pole, back: 0xc8262c, pole: 0xf3efe6 });
    softServe3d(k, sx, 6.8, sz, 0.8);
    park(c, 'wagon', -8.1, 6.6, HALF, rng.pick(CAR_COLORS));
    park(c, 'sedan', -2.7, 6.6, HALF, rng.pick(CAR_COLORS));
    park(c, 'pickup', 5.4, 6.6, HALF, rng.pick(CAR_COLORS));
  });
}

/* ================================================================================================
 * 6. REWIND VIDEO — blue facade, yellow ticket sign, posters, return slot
 * ============================================================================================== */

function posterSheet(): HTMLCanvasElement {
  const [c, g] = makeCanvas(640, 280);
  g.fillStyle = '#10131c';
  g.fillRect(0, 0, 640, 280);
  const posters: [string, string, string, string, string][] = [
    ['LASER', 'STORM', '#1b1f5c', '#ff5a3a', '#ffd24a'],
    ['NIGHT', 'TRAIN', '#2a0f2a', '#ff2e63', '#ffffff'],
    ['DINO', 'RANCH', '#1e5a2a', '#ffd24a', '#ffffff'],
    ['CANYON', 'RUN', '#7a3410', '#ffe08a', '#2a0f00'],
    ['HEART', 'LAND', '#c46a8a', '#ffffff', '#4a1030'],
  ];
  posters.forEach(([a, b, c0, c1, ink], i) => {
    const px = 8 + i * 126;
    const grad = g.createLinearGradient(px, 8, px, 272);
    grad.addColorStop(0, c0);
    grad.addColorStop(0.7, c1);
    grad.addColorStop(1, c0);
    g.fillStyle = grad;
    g.fillRect(px, 8, 116, 264);
    g.fillStyle = ink;
    g.beginPath();
    g.arc(px + 58, 100, 30 + (i % 3) * 5, 0, Math.PI * 2);
    g.fill();
    drawLines(g, 640, 280, [
      { text: a, font: 'Bebas Neue', color: '#ffffff', y: 0.66, size: 0.17, x: (px + 58) / 640, maxW: 0.17, stroke: '#000000', strokeW: 4 },
      { text: b, font: 'Bebas Neue', color: ink, y: 0.8, size: 0.17, x: (px + 58) / 640, maxW: 0.17, stroke: '#000000', strokeW: 4 },
      { text: 'NOW ON VIDEO', font: F_OS, weight: '600', color: '#ffffff', y: 0.94, size: 0.05, x: (px + 58) / 640, maxW: 0.17 },
    ]);
  });
  return c;
}

function rewindVideo(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 44;
  const D = 30;
  c.occ.add(x, z, W, D, ry, 1, false);
  const BLUE = 0x1d4aa3;
  const ticket = sgn(c, 'rv.ticket', () =>
    panelSign(640, 260, '#ffd23a', [
      { text: 'REWIND', font: F_SLAB, color: '#1d4aa3', y: 0.4, size: 0.42, maxW: 0.7, stroke: '#0c2a66', strokeW: 3 },
      { text: 'VIDEO', font: F_SLAB, color: '#c8262c', y: 0.76, size: 0.26, maxW: 0.5, letter: 8 },
    ], { border: '#1d4aa3', borderW: 8 }));
  const kind = sgn(c, 'rv.kind', () => panelSign(640, 110, '#1d4aa3', [{ text: 'BE KIND, PLEASE REWIND', font: F_SLAB, color: '#ffd23a', y: 0.52, size: 0.55, maxW: 0.94 }], { border: '#ffd23a', borderW: 6 }));
  const rent = sgn(c, 'rv.rent', () =>
    panelSign(384, 140, '#c8262c', [
      { text: 'NEW RELEASES', font: F_SLAB, color: '#ffffff', y: 0.34, size: 0.27, maxW: 0.9 },
      { text: 'RENT 2 · GET 1 FREE', font: F_OS, weight: '700', color: '#ffd24a', y: 0.74, size: 0.2, maxW: 0.9 },
    ], { border: '#ffd24a', borderW: 6 }));
  const posters = sgn(c, 'rv.posters', posterSheet);
  const returns = sgn(c, 'rv.ret', () =>
    panelSign(256, 200, '#1d4aa3', [
      { text: 'VIDEO', font: F_SLAB, color: '#ffd24a', y: 0.2, size: 0.2 },
      { text: 'RETURNS', font: F_SLAB, color: '#ffffff', y: 0.42, size: 0.2 },
      { text: 'DROP TAPES HERE', font: F_OS, weight: '700', color: '#ffd24a', y: 0.68, size: 0.1 },
      { text: '24 HRS', font: F_OS, weight: '700', color: '#ffffff', y: 0.86, size: 0.12 },
    ], { border: '#ffd24a', borderW: 6 }));
  const pole = sgn(c, 'rv.pole', () =>
    panelSign(384, 220, '#1d4aa3', [
      { text: 'REWIND', font: F_SLAB, color: '#ffd24a', y: 0.3, size: 0.3 },
      { text: 'VIDEO', font: F_SLAB, color: '#ffffff', y: 0.62, size: 0.26 },
      { text: 'OPEN 9AM-11PM', font: F_OS, weight: '700', color: '#ffd24a', y: 0.88, size: 0.11 },
    ], { border: '#ffd24a', borderW: 10 }));

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    stalls(k, -15.2, 2.7, 11, 2.6, 7.8);
    frontage(k, rng, W, 14.0, 2.0, [[-18, -10], [10, 17]]);
    lamp(k, -16.5, 12.8, 0, 8, true);
    lamp(k, 16.5, 12.8, 0, 8, true);
    slab(k, 0, 1.3, 26, 2.6, 0.1);
    k.solid(0, -7, 24, 12);
    k.at(0, -7, 0, () => {
      const w = 24;
      const d = 12;
      const H = 5.4;
      const zf = d / 2;
      k.box(0, 0, 0, w, H, d, BLUE, 'stucco');
      k.box(0, 0, 0, w + 0.14, 0.4, d + 0.14, 0x8f8c87, 'concrete');
      k.box(0, H - 0.1, zf + 0.1, w + 0.1, 0.4, 0.22, 0xffd24a);
      k.box(0, 4.0, zf + 0.03, w, 0.28, 0.06, 0xffd24a);
      flatTop(k, rng, 0, 0, w, d, H, 0x1a3f8c, 3);
      // glazing with posters + doors
      storefront(k, -11.2, 11.2, 0.4, zf, 3.4, { frame: 0x0c2a66, doorX: 5.5, doorW: 2.4, kick: 0x0c2a66 });
      for (let i = 0; i < 3; i++) k.signPlane(-8.4 + i * 4.3, 1.6, zf + 0.0, 3.0, 1.35, posters);
      // ticket-shaped sign: yellow board with wall-coloured discs punching the side notches
      k.sign(-5, 4.65, zf + 0.15, 7.4, 2.5, ticket, { thick: 0.25, back: 0xffd23a });
      for (const s of [-1, 1]) k.cyl(-5 + s * 3.7, 4.65, zf + 0.3, 0.55, 0.55, 0.02, 14, BLUE, 'stucco', { rx: HALF });
      k.sign(8.0, 4.7, zf + 0.15, 5.2, 0.9, kind, { thick: 0.12 });
      k.sign(8.0, 2.0, zf + 0.12, 2.4, 0.9, rent, { thick: 0.08, back: 0x800000 });
      // return slot + sign on the wall by the door
      k.sign(-11.0, 1.5, zf + 0.1, 0.9, 0.7, returns, { thick: 0.06 });
      k.box(-11.0, 0.75, zf + 0.08, 0.7, 0.45, 0.14, 0x0c2a66);
      k.box(-11.0, 0.95, zf + 0.16, 0.5, 0.04, 0.04, 0x111111);
      // side + rear
      for (const sx of [-1, 1]) {
        k.at(sx * (w / 2), 0, sx * HALF, () => {
          for (const wz of [-2, 2]) litWindow(k, wz, 1.6, 0, 2.0, 1.4, 0x0c2a66);
        });
      }
      k.at(0, -zf, Math.PI, () => {
        doorAt(k, 6, 0.4, 0, 1.1, 2.2, 0x6b6f73);
        k.box(-3, 0.5, 0.1, 0.9, 0.6, 0.35, 0x8a8c8f, 'metal');
        downspout(k, 11.8, -0.1, H);
      });
    });
    // free-standing drop box near the entrance
    k.at(-4.2, 4.3, 0, () => {
      k.solid(0, 0, 1.0, 0.8);
      k.box(0, 0, 0, 0.9, 1.35, 0.7, BLUE);
      k.box(0, 1.0, 0.36, 0.55, 0.05, 0.04, 0x111111);
      k.sign(0, 0.55, 0.37, 0.7, 0.4, returns, { thick: 0.02 });
    });
    trashCorral(k, 19, -14, rng, 'brickDark');
    poleSign(k, -19.4, 14.5, { h: 7.6, w: 3.4, sh: 2.0, ref: pole, back: 0x1d4aa3, pole: 0x6f7377 });
    park(c, 'sedan', -9.5, 5.2, HALF, rng.pick(CAR_COLORS));
    park(c, 'suv', 0.2, 5.2, HALF, rng.pick(CAR_COLORS));
    park(c, 'coupe', 5.6, 5.2, HALF, rng.pick(CAR_COLORS));
    park(c, 'van', 12.1, 5.2, HALF, rng.pick(CAR_COLORS));
  });
}

/* @@END */

export const STRIP: BuildingDef[] = [
  { id: 'bigBun', name: 'Big Bun Burgers', w: 40, d: 36, front: 0, tags: ['fastfood', 'highway'], build: bigBun },
  { id: 'tacoShack', name: 'Taco Shack', w: 38, d: 26, front: 0, tags: ['fastfood', 'highway'], build: tacoShack },
  { id: 'pizzaPalace', name: 'Pizza Palace', w: 38, d: 30, front: 1.5, tags: ['fastfood', 'restaurant', 'highway'], build: pizzaPalace },
  { id: 'cluckers', name: "Clucker's Fried Chicken", w: 38, d: 36, front: -1, tags: ['fastfood', 'highway'], build: cluckers },
  { id: 'dairyDream', name: 'Dairy Dream', w: 36, d: 28, front: -1, tags: ['fastfood', 'dessert', 'highway', 'downtown'], build: dairyDream },
  { id: 'rewindVideo', name: 'Rewind Video', w: 44, d: 30, front: -1, tags: ['video', 'highway', 'downtown'], build: rewindVideo },
];

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
    lamp(k, 17.2, 12.0, HALF, 7.5);
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

/* ================================================================================================
 * Shared extras for the second batch (strip mall, bowling, grocery, car wash, truck stop, ...)
 * ============================================================================================== */

/** Sub-rectangle of a sign-atlas ref, split into cols×rows (row 0 at the top). */
function subRef(r: SignRef, cols: number, rows: number, i: number, j: number): SignRef {
  const du = (r.u1 - r.u0) / cols;
  const dv = (r.v1 - r.v0) / rows;
  return { page: r.page, u0: r.u0 + du * i, u1: r.u0 + du * (i + 1), v1: r.v1 - dv * j, v0: r.v1 - dv * (j + 1) };
}
/** Unlit emissive tube / light strip. */
function neon(k: Kit, x: number, y: number, z: number, w: number, h: number, d: number, col: Col) {
  k.box(x, y, z, w, h, d, col, 'light', { cast: false });
}
/** Fuel pump; faces ±Z, stands on an island top at `y`. */
function pump(k: Kit, x: number, z: number, ry: number, body: Col, accent: Col, y = 0.17) {
  k.at(x, z, ry, () => {
    k.solid(0, 0, 0.95, 0.7);
    k.box(0, 0, 0, 0.8, 1.45, 0.5, body, 'gloss');
    k.box(0, 1.45, 0, 0.86, 0.3, 0.56, accent, 'gloss');
    for (const s of [-1, 1]) {
      k.box(0, 1.08, s * 0.26, 0.5, 0.24, 0.02, 0x2b9a4a, 'light', { cast: false });
      k.box(0, 0.7, s * 0.26, 0.5, 0.2, 0.02, 0x15171a, 'paint');
      k.box(0.5, 0.55, s * 0.12, 0.1, 0.4, 0.16, 0x1b1b1d, 'metal');
    }
  }, y);
}
/** Flat fuel canopy over [x±w/2, z±d/2] with columns, fascia band and lit underside. */
function canopy(k: Kit, x: number, z: number, w: number, d: number, h: number, fascia: Col, trim: Col, cols: [number, number][], lit = 0xfff1d0) {
  const t = 0.35;
  k.box(x, h - t, z, w, t, d, 0xe9e9e4);
  for (const s of [-1, 1]) {
    k.box(x, h - 0.75, z + (s * d) / 2 + s * 0.05, w + 0.2, 1.05, 0.1, fascia, 'gloss');
    k.box(x + (s * w) / 2 + s * 0.05, h - 0.75, z, 0.1, 1.05, d, fascia, 'gloss');
  }
  k.box(x, h - 0.5, z + d / 2 + 0.1, w + 0.2, 0.1, 0.04, trim, 'gloss');
  const n = Math.max(2, Math.round(w / 4));
  for (let i = 0; i < n; i++) neon(k, x - w / 2 + (w * (i + 0.5)) / n, h - t - 0.03, z, 0.6, 0.03, d - 1.2, lit);
  for (const [cx, cz] of cols) {
    k.solid(cx, cz, 0.6, 0.6);
    k.box(cx, 0, cz, 0.8, 0.45, 0.8, CURB, 'concrete');
    k.box(cx, 0.45, cz, 0.5, h - t - 0.45, 0.5, 0xe9e9e4);
  }
}
/** Arcade-style cabinet, screen toward +Z. */
function cabinet(k: Kit, x: number, z: number, ry: number, screen: Col, body: Col = 0x23202c) {
  k.at(x, z, ry, () => {
    k.solid(0, 0, 0.9, 0.8);
    k.box(0, 0, 0, 0.8, 1.75, 0.7, body);
    k.box(0, 1.5, 0.2, 0.74, 0.25, 0.3, screen, 'light', { cast: false });
    k.box(0, 0.95, 0.355, 0.6, 0.5, 0.02, screen, 'light', { cast: false });
    k.box(0, 0.8, 0.45, 0.7, 0.1, 0.3, 0x15131c);
    k.box(-0.15, 0.9, 0.5, 0.06, 0.08, 0.06, 0xe23a3a);
    k.box(0.15, 0.9, 0.5, 0.06, 0.08, 0.06, 0xf2c230);
  });
}
function payphone(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    k.solid(0, 0, 0.8, 0.6);
    k.box(0, 0, -0.2, 0.7, 2.0, 0.1, 0x30343a, 'metal');
    for (const s of [-1, 1]) k.box(s * 0.31, 0, 0, 0.08, 2.0, 0.5, 0x30343a, 'metal');
    k.box(0, 1.9, 0, 0.7, 0.1, 0.5, 0x30343a, 'metal');
    k.box(0, 1.35, -0.12, 0.4, 0.4, 0.14, 0x9aa0a6, 'metal');
    k.box(0, 1.75, 0.0, 0.5, 0.25, 0.04, 0x2a62b8, 'gloss');
  });
}
function barberPole(k: Kit, x: number, z: number) {
  k.solid(x, z, 0.5, 0.5);
  k.cyl(x, 0, z, 0.2, 0.22, 0.2, 8, 0x222222, 'metal');
  const cols = [0xc8262c, 0xf4f1ea, 0x1d4aa3];
  for (let i = 0; i < 6; i++) k.cyl(x, 0.2 + i * 0.28, z, 0.16, 0.16, 0.28, 8, cols[i % 3], 'gloss');
  k.ico(x, 2.0, z, 0.2, 0, 0xf4f1ea, 'gloss');
}
/** String of triangular pennants between two points with a catenary sag. */
function pennants(k: Kit, a: [number, number, number], b: [number, number, number], sag: number, cols: Col[], n: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.17, 0);
  shape.lineTo(0.17, 0);
  shape.lineTo(0, -0.5);
  shape.closePath();
  const pt = (t: number) => ({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), z: a[2] + (b[2] - a[2]) * t });
  const segs = Math.max(4, Math.round(n / 2));
  for (let i = 0; i < segs; i++) k.cylBetween(pt(i / segs), pt((i + 1) / segs), 0.018, 3, 0x2a2a2a, 'metal', false);
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const yaw = Math.atan2(-dz, dx);
  for (let i = 0; i < n; i++) {
    const p = pt((i + 0.5) / n);
    k.extrude(shape, 0.015, cols[i % cols.length], 'paint', p.x, p.y, p.z, { ry: yaw, cast: false });
  }
}
function cart(k: Kit, x: number, z: number, ry: number, y = 0) {
  k.at(x, z, ry, () => {
    k.box(0, 0.35, 0, 0.58, 0.45, 0.95, 0xb8bcc0, 'metal');
    k.box(0, 0.12, 0, 0.5, 0.05, 0.9, 0x55585c, 'metal');
    k.box(0, 0.8, -0.5, 0.6, 0.04, 0.05, 0xc8262c, 'paint');
    for (const sx of [-1, 1]) for (const sz of [-0.4, 0.4]) k.box(sx * 0.24, 0, sz, 0.05, 0.12, 0.05, 0x222222);
  }, y);
}
/** Open-sided pen of shopping carts opening toward +Z. */
function cartCorral(k: Kit, x: number, z: number, n = 5) {
  k.at(x, z, 0, () => {
    k.solid(0, 0, 1.9, 4.6);
    for (const s of [-1, 1]) {
      k.box(s * 0.85, 0, 0, 0.06, 1.0, 4.5, 0x9a9ea3, 'metal');
      k.box(s * 0.85, 0.5, 0, 0.06, 0.05, 4.5, 0x9a9ea3, 'metal');
    }
    k.box(0, 0, -2.2, 1.7, 1.0, 0.06, 0x9a9ea3, 'metal');
    for (let i = 0; i < n; i++) cart(k, 0, -1.7 + i * 0.7, 0);
  });
}
/** 0..n-1 in a deterministic random order. */
function shuffled(rng: Rng, n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function tree(k: Kit, x: number, z: number, h: number, col: Col = 0x4d7a34) {
  k.cyl(x, 0, z, 0.14, 0.2, h * 0.5, 5, P.trunk);
  k.ico(x, h * 0.72, z, h * 0.34, 0, col, 'paint', 1, 1.1, 1);
}
/** Canvas "seen through the shop window" interior, 512×168. */
function interiorTex(kind: 'arcade' | 'laundry' | 'radio' | 'wok' | 'salon' | 'showroom'): HTMLCanvasElement {
  const W = 512;
  const H = 168;
  const [c, g] = makeCanvas(W, H);
  const glow = (txt: string, x: number, y: number, col: string, size: number) => {
    g.save();
    g.shadowColor = col;
    g.shadowBlur = 10;
    g.fillStyle = col;
    g.font = `${size}px "Bebas Neue", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(txt, x, y);
    g.restore();
  };
  if (kind === 'arcade') {
    g.fillStyle = '#150d26';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 120; i++) {
      g.fillStyle = ['#ff4fd8', '#3fe0ff', '#ffe14a', '#6bff6b'][i % 4];
      g.fillRect((i * 97) % W, 128 + ((i * 53) % 40), 3, 3);
    }
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 11; i++) {
        const x = 8 + i * 46 + (r ? 20 : 0);
        const y = r ? 40 : 30;
        const s = ['#3fe0ff', '#ff4fd8', '#ffe14a', '#6bff6b', '#ff8a3a'][(i + r * 2) % 5];
        g.fillStyle = r ? '#1c1a2a' : '#2a2640';
        g.fillRect(x, y, 38, 112);
        g.fillStyle = s;
        g.fillRect(x + 4, y + 4, 30, 12);
        g.fillRect(x + 5, y + 24, 28, 34);
        g.fillStyle = '#0c0a14';
        g.fillRect(x - 1, y + 62, 40, 10);
      }
    }
    glow('OPEN', 458, 22, '#ff4fd8', 30);
    glow('FREE PLAY', 70, 16, '#3fe0ff', 22);
  } else if (kind === 'laundry') {
    g.fillStyle = '#dbe7ee';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#8c98a3';
    g.fillRect(0, 128, W, 40);
    g.fillStyle = '#f7fbfd';
    g.fillRect(0, 0, W, 14);
    for (let i = 0; i < 7; i++) {
      const x = 14 + i * 50;
      g.fillStyle = '#f2f4f5';
      g.fillRect(x, 58, 44, 74);
      g.fillStyle = '#2a62b8';
      g.fillRect(x + 4, 62, 36, 8);
      g.fillStyle = '#3c4650';
      g.beginPath();
      g.arc(x + 22, 100, 17, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = ['#7fc4e6', '#9ad7f0', '#6bb1d8'][i % 3];
      g.beginPath();
      g.arc(x + 22, 100, 12, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 3; i++) {
      const x = 372 + i * 46;
      for (let j = 0; j < 2; j++) {
        g.fillStyle = '#e9ecee';
        g.fillRect(x, 22 + j * 54, 42, 52);
        g.fillStyle = '#3c4650';
        g.beginPath();
        g.arc(x + 21, 52 + j * 54, 14, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#c9d3da';
        g.beginPath();
        g.arc(x + 21, 52 + j * 54, 9, 0, Math.PI * 2);
        g.fill();
      }
    }
    glow('OPEN 24 HRS', 190, 36, '#2a7bff', 26);
  } else if (kind === 'radio') {
    g.fillStyle = '#272a33';
    g.fillRect(0, 0, W, H);
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 6; i++) {
        const x = 20 + i * 62;
        const y = 12 + r * 48;
        g.fillStyle = '#12141a';
        g.fillRect(x, y, 54, 40);
        g.fillStyle = ['#3a6fb0', '#2f8a7a', '#8a3ab0'][(i + r) % 3];
        g.fillRect(x + 4, y + 4, 46, 32);
      }
    }
    g.fillStyle = '#c8262c';
    g.fillRect(396, 14, 100, 34);
    g.fillStyle = '#ffffff';
    g.font = '28px "Bebas Neue", sans-serif';
    g.textAlign = 'center';
    g.fillText('SALE', 446, 38);
    g.fillStyle = '#3a3d48';
    g.fillRect(0, 132, W, 36);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = '#0d0e12';
      g.fillRect(14 + i * 62, 118, 48, 24);
      g.fillStyle = '#9aa0a8';
      g.fillRect(20 + i * 62, 122, 12, 12);
      g.fillRect(36 + i * 62, 122, 12, 12);
    }
  } else if (kind === 'wok') {
    g.fillStyle = '#7a1a12';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#c99a2e';
    g.fillRect(0, 0, W, 8);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = '#d6301f';
      g.beginPath();
      g.ellipse(50 + i * 82, 38, 17, 22, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#e8c46a';
      g.fillRect(44 + i * 82, 12, 12, 6);
      g.fillRect(44 + i * 82, 58, 12, 6);
    }
    g.fillStyle = '#f6ecd0';
    g.fillRect(30, 84, 300, 56);
    g.fillStyle = '#3a2a20';
    for (let i = 0; i < 6; i++) g.fillRect(40, 92 + i * 8, 120 + (i % 3) * 40, 3);
    g.fillStyle = '#2e1410';
    g.fillRect(0, 132, W, 36);
    g.fillStyle = '#8b5a2b';
    g.fillRect(360, 100, 130, 36);
    glow('OPEN', 440, 80, '#ffd24a', 28);
  } else if (kind === 'salon') {
    g.fillStyle = '#f2d6e4';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#c9d6dc';
    g.fillRect(0, 128, W, 40);
    for (let i = 0; i < 5; i++) {
      const x = 14 + i * 96;
      g.fillStyle = '#8fb8c9';
      g.fillRect(x, 16, 74, 82);
      g.fillStyle = '#e9f6fb';
      g.fillRect(x + 6, 22, 62, 70);
      g.fillStyle = '#1e1b22';
      g.fillRect(x + 22, 100, 30, 30);
      g.fillRect(x + 28, 130, 18, 8);
      g.fillStyle = '#cc3a7a';
      g.fillRect(x + 14, 98, 46, 6);
    }
    glow('OPEN', 470, 142, '#ff4fa8', 26);
  } else {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#e9f0f4');
    grad.addColorStop(1, '#b7c4cc');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#9aa7b0';
    g.fillRect(0, 120, W, 48);
    for (let i = 0; i < 3; i++) {
      const x = 40 + i * 160;
      g.fillStyle = ['#c8262c', '#1d4aa3', '#e8e2d0'][i];
      g.beginPath();
      g.moveTo(x, 118);
      g.lineTo(x + 20, 82);
      g.lineTo(x + 110, 80);
      g.lineTo(x + 126, 118);
      g.closePath();
      g.fill();
      g.fillStyle = '#10151a';
      g.beginPath();
      g.arc(x + 26, 120, 12, 0, Math.PI * 2);
      g.arc(x + 100, 120, 12, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#ffd23a';
    g.fillRect(0, 10, W, 14);
  }
  return c;
}

/* ================================================================================================
 * 7. VALLEY PLAZA STRIP MALL — five units under a covered walkway
 * ============================================================================================== */

function stripMall(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 58;
  const D = 34;
  c.occ.add(x, z, W, D, ry, 1, false);
  const units = [
    { id: 'px', cx: -20, col: 0x3a2a55, mat: 'stucco', frame: 0x15101f, kind: 'arcade' as const },
    { id: 'sd', cx: -10, col: 0x8fb7cf, mat: 'stucco', frame: 0xf2f4f5, kind: 'laundry' as const },
    { id: 'rh', cx: 0, col: 0xffffff, mat: 'brickRed', frame: 0x1b1b1d, kind: 'radio' as const },
    { id: 'gw', cx: 10, col: 0xb8332a, mat: 'stucco', frame: 0x2a0e0a, kind: 'wok' as const },
    { id: 'sm', cx: 20, col: 0xe3a8c0, mat: 'stucco', frame: 0xf6f1f2, kind: 'salon' as const },
  ];
  const sPx = sgn(c, 'sm.px', () =>
    panelSign(768, 100, '#0d0818', [
      { text: 'PIXEL PALACE', font: F_SLAB, color: '#ff4fd8', y: 0.4, size: 0.5, maxW: 0.88, stroke: '#3a0d4a', strokeW: 6 },
      { text: 'VIDEO ARCADE · OPEN LATE', font: F_OS, weight: '700', color: '#3fe0ff', y: 0.82, size: 0.2, maxW: 0.7, letter: 3 },
    ], { border: '#3fe0ff', borderW: 6 }));
  const sSd = sgn(c, 'sm.sd', () => {
    return panelSign(768, 100, '#1b5cc4', [
      { text: 'SUDS', font: F_SLAB, color: '#ffffff', y: 0.42, size: 0.6, maxW: 0.4, stroke: '#0c2a66', strokeW: 6 },
      { text: 'COIN LAUNDRY · WASH · DRY · FOLD', font: F_OS, weight: '700', color: '#bfe6ff', y: 0.84, size: 0.2, maxW: 0.8, letter: 2 },
    ], {
      border: '#ffffff',
      borderW: 6,
      draw: (g, w, h) => {
        g.fillStyle = 'rgba(255,255,255,0.8)';
        for (const [bx, by, br] of [[0.12, 0.4, 0.2], [0.2, 0.7, 0.12], [0.8, 0.35, 0.18], [0.89, 0.62, 0.12], [0.72, 0.7, 0.08]]) {
          g.beginPath();
          g.arc(bx * w, by * h, br * h, 0, Math.PI * 2);
          g.fill();
        }
      },
    });
  });
  const sRh = sgn(c, 'sm.rh', () =>
    panelSign(768, 100, '#c8262c', [
      { text: 'RADIO HUT', font: F_SLAB, color: '#ffffff', y: 0.4, size: 0.54, maxW: 0.7, stroke: '#4a0d0d', strokeW: 5 },
      { text: 'STEREOS · TVs · PHONES · BATTERIES', font: F_OS, weight: '700', color: '#ffd24a', y: 0.83, size: 0.2, maxW: 0.84, letter: 2 },
    ], { border: '#ffffff', borderW: 6 }));
  const sGw = sgn(c, 'sm.gw', () =>
    panelSign(768, 100, '#7a1a12', [
      { text: 'GOLDEN WOK', font: F_SLAB, color: '#ffd24a', y: 0.4, size: 0.5, maxW: 0.7, stroke: '#2a0e0a', strokeW: 5 },
      { text: 'CHINESE FOOD · TAKEOUT · LUNCH SPECIALS', font: F_OS, weight: '700', color: '#ffffff', y: 0.83, size: 0.19, maxW: 0.86, letter: 2 },
    ], { border: '#ffd24a', borderW: 6 }));
  const sSm = sgn(c, 'sm.sm', () =>
    panelSign(768, 100, '#f6e3ec', [
      { text: 'Shear Magic', font: 'Lobster', color: '#cc2a72', y: 0.4, size: 0.62, maxW: 0.62, stroke: '#ffffff', strokeW: 4 },
      { text: 'HAIR · NAILS · TANNING', font: F_OS, weight: '700', color: '#1d6b72', y: 0.84, size: 0.2, maxW: 0.7, letter: 3 },
    ], { border: '#1d6b72', borderW: 6 }));
  const fasciaRefs = [sPx, sSd, sRh, sGw, sSm];
  const pole = sgn(c, 'sm.pole', () =>
    panelSign(512, 700, '#1c4a3a', [
      { text: 'VALLEY PLAZA', font: F_SLAB, color: '#ffd24a', y: 0.08, size: 0.1, maxW: 0.88 },
      { text: 'PIXEL PALACE', font: F_SLAB, color: '#ff8adf', y: 0.24, size: 0.085, maxW: 0.84 },
      { text: 'SUDS LAUNDRY', font: F_SLAB, color: '#bfe6ff', y: 0.38, size: 0.085, maxW: 0.84 },
      { text: 'RADIO HUT', font: F_SLAB, color: '#ff7a6a', y: 0.52, size: 0.085, maxW: 0.84 },
      { text: 'GOLDEN WOK', font: F_SLAB, color: '#ffd24a', y: 0.66, size: 0.085, maxW: 0.84 },
      { text: 'SHEAR MAGIC', font: F_SLAB, color: '#ffc0dc', y: 0.8, size: 0.085, maxW: 0.84 },
      { text: 'SPACES FOR LEASE', font: F_OS, weight: '700', color: '#ffffff', y: 0.93, size: 0.045, maxW: 0.7 },
    ], { border: '#ffd24a', borderW: 12 }));
  const interior = new Map(units.map((u) => [u.kind, sgn(c, `sm.in.${u.kind}`, () => interiorTex(u.kind))]));

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    const zf = -3.5;
    const H = 5.6;
    const bz = -9;
    // parking in front of the walk, aisle, planted edge
    stalls(k, -25.2, 2.8, 18, 0.4, 5.9);
    mark(k, 0, 9.2, 52, 0.12, 0xe7b93a);
    frontage(k, rng, W, 14.2, 2.2, [[16, 25]]);
    for (const lx of [-26, 0, 26]) lamp(k, lx, 11.6, 0, 8, true);
    conifer(k, -26.6, 14.6, 6.5);
    conifer(k, 26.6, 11, 6);
    // rear service lane
    k.box(0, 0, -15.8, 52, 0.06, 2.4, 0x5b5f66, 'asphalt', { cast: false });
    k.solid(0, bz, 50, 11);

    // building
    k.box(0, 0, bz, 50.2, 0.4, 11.2, 0x8f8c87, 'concrete');
    for (const u of units) {
      k.box(u.cx, 0, bz, 10, H, 11, u.col, u.mat);
      k.box(u.cx, H, bz, 10.02, 0.5, 11.02, 0xb9b4ab, 'concrete');
    }
    flatTop(k, rng, 0, bz, 50, 11, H + 0.5, 0xb9b4ab, 3);
    // covered walkway
    slab(k, 0, zf + 1.6, 50.4, 3.2, 0.15);
    k.box(0, 3.25, zf + 1.6, 50.6, 0.25, 3.2, 0xdad6cc);
    k.box(0, 3.1, zf + 3.15, 50.6, 1.5, 0.2, 0x2f4f46, 'gloss');
    k.box(0, 4.5, zf + 3.15, 50.8, 0.12, 0.28, 0xe9e5d8);
    for (let i = 0; i <= 10; i++) {
      const px = -25 + i * 5;
      k.solid(px, zf + 3.0, 0.35, 0.35);
      k.box(px, 0.15, zf + 3.0, 0.25, 3.1, 0.25, 0xe9e5d8);
    }
    units.forEach((u, i) => {
      const x0 = u.cx - 4.5;
      const x1 = u.cx + 4.5;
      storefront(k, x0, x1, 0.4, zf, 2.9, { frame: u.frame, doorX: u.cx + 2.9, doorW: 1.3, kick: u.frame });
      k.signPlane(u.cx, 0.4 + 1.45, zf + 0.02, 9, 2.9, interior.get(u.kind)!);
      k.sign(u.cx, 3.85, zf + 3.35, 9.2, 1.2, fasciaRefs[i], { thick: 0.12 });
      // rear door
      k.at(u.cx + 3.2, bz - 5.5, Math.PI, () => doorAt(k, 0, 0.15, 0, 1.1, 2.1, 0x6b6f73));
    });
    // neon trim on the arcade fascia
    neon(k, -20, 3.1, zf + 3.27, 9.0, 0.06, 0.05, 0xff4fd8);
    neon(k, -20, 4.5, zf + 3.27, 9.0, 0.06, 0.05, 0x3fe0ff);
    // walkway props
    for (const [cx, col] of [[-23.6, 0x3fe0ff], [-22.4, 0xff4fd8], [-21.2, 0xffe14a]] as [number, number][]) cabinet(k, cx, zf + 0.6, 0, col);
    bench(k, -10.4, zf + 0.7, Math.PI);
    cart(k, -7.6, zf + 1.1, 0.4);
    payphone(k, -6.2, zf + 0.35, 0);
    k.at(2.4, zf + 1.4, 0.2, () => {
      k.solid(0, 0, 0.9, 0.5);
      k.box(0, 0, 0, 0.8, 1.0, 0.04, 0xffd23a, 'paint', { ry: 0.5 });
      k.box(0, 0, 0, 0.8, 1.0, 0.04, 0xffd23a, 'paint', { ry: -0.5 });
    });
    for (const lx of [7.2, 13.4]) {
      k.cyl(lx, 2.7, zf + 1.4, 0.03, 0.03, 0.5, 4, 0x222222);
      k.ico(lx, 2.45, zf + 1.4, 0.3, 0, 0xd6301f, 'gloss', 1, 1.2, 1);
    }
    barberPole(k, 15.8, zf + 0.7);
    trashCan(k, 24.2, zf + 0.7);
    // rooftop mast on the electronics store
    k.box(0, H + 0.5, bz + 1, 0.12, 4.2, 0.12, 0x6f7377, 'metal');
    for (let i = 0; i < 3; i++) k.box(0, H + 1.6 + i * 1.0, bz + 1, 1.6 - i * 0.4, 0.05, 0.05, 0x9aa0a6, 'metal');
    // rear dumpsters
    dumpster(k, -14, -15.9, 0, P.dumpster, rng);
    dumpster(k, 8, -15.9, 0, P.dumpster, rng);
    poleSign(k, 22.5, 14.2, { h: 9.4, w: 4.4, sh: 6.0, ref: pole, back: 0x1c4a3a, twin: 3.0 });
    // lot cars
    const spots = shuffled(rng, 18).slice(0, 10);
    const types: VehicleType[] = ['sedan', 'wagon', 'coupe', 'pickup', 'van', 'suv', 'sedan', 'pickup', 'sedan', 'coupe'];
    spots.forEach((s, i) => park(c, types[i], -23.8 + s * 2.8, 3.1, rng.chance(0.5) ? HALF : -HALF, rng.pick(CAR_COLORS)));
  });
}

/* ================================================================================================
 * 8. BOWL-O-RAMA — windowless lane hall, glass entry block, Googie tower sign, giant roof pin
 * ============================================================================================== */

/** Window run on a +Z wall: glass, kick plate, mullions and a header (no door). */
function glassWall(k: Kit, x0: number, x1: number, y: number, zf: number, h: number, frame: Col, kick = 0.5) {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  k.box(cx, y, zf - 0.04, w, h, 0.1, P.glass, 'glass');
  k.box(cx, y, zf + 0.03, w, kick, 0.1, frame);
  k.box(cx, y + h - 0.14, zf + 0.03, w, 0.16, 0.12, frame);
  const n = Math.max(2, Math.round(w / 2.2));
  for (let i = 0; i <= n; i++) k.box(x0 + (w * i) / n, y, zf + 0.03, 0.1, h, 0.1, frame);
}
/** Double glass doors on a +Z wall, centred at x. */
function doubleDoor(k: Kit, x: number, y: number, zf: number, frame: Col) {
  k.box(x, y, zf + 0.02, 2.6, 2.4, 0.1, frame);
  for (const s of [-1, 1]) {
    k.box(x + s * 0.6, y + 0.05, zf + 0.07, 1.05, 2.25, 0.04, P.glassLit, 'glass');
    k.box(x + s * 0.12, y + 1.0, zf + 0.12, 0.05, 0.3, 0.05, 0xc0c3c6, 'metal');
  }
}
function bowlInterior(): HTMLCanvasElement {
  const [c, g] = makeCanvas(512, 168);
  g.fillStyle = '#1a1233';
  g.fillRect(0, 0, 512, 168);
  g.fillStyle = '#ff3ea5';
  g.fillRect(0, 6, 512, 4);
  g.fillStyle = '#3fe0ff';
  g.fillRect(0, 14, 512, 4);
  for (let i = 0; i < 7; i++) {
    const tx = 48 + i * 62;
    const bx = 10 + i * 72;
    g.fillStyle = '#d9a85a';
    g.beginPath();
    g.moveTo(tx, 40);
    g.lineTo(tx + 40, 40);
    g.lineTo(bx + 62, 168);
    g.lineTo(bx, 168);
    g.closePath();
    g.fill();
    g.strokeStyle = '#3a2a1a';
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = '#ffffff';
    for (const [px, py] of [[20, 32], [14, 36], [26, 36], [8, 40], [20, 40], [32, 40]]) {
      g.beginPath();
      g.arc(tx + px, py - 6, 2.4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = ['#3fe0ff', '#ffe14a', '#ff4fd8'][i % 3];
    g.fillRect(tx + 6, 22, 28, 8);
  }
  g.save();
  g.shadowColor = '#ff3ea5';
  g.shadowBlur = 10;
  g.fillStyle = '#ff7ac8';
  g.font = '26px "Bebas Neue", sans-serif';
  g.textAlign = 'center';
  g.fillText('OPEN BOWLING', 256, 108);
  g.restore();
  return c;
}
function lathe(k: Kit, pts: [number, number][], x: number, y: number, z: number, s: number, color: Col, mat = 'gloss', seg = 10) {
  const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r * s, h * s)), seg);
  k.add(g, color, mat, k.local(x, y, z));
}
const PIN: [number, number][] = [[0.01, 0], [1.15, 0], [1.5, 1.2], [2.1, 2.8], [2.38, 4.5], [2.2, 6.2], [1.55, 8.2], [0.95, 10], [0.9, 11], [1.2, 12.3], [1.27, 13.6], [0.9, 14.6], [0.01, 15]];
function giantPin(k: Kit, x: number, y: number, z: number, h: number) {
  const s = h / 15;
  lathe(k, PIN, x, y, z, s, 0xf4f1ea);
  for (const [y0, rr] of [[9.4, 0.97], [10.2, 0.95]] as [number, number][]) k.cyl(x, y + y0 * s, z, rr * s, rr * s, 0.6 * s, 10, 0xc8262c, 'gloss');
}
function starburst(k: Kit, x: number, y: number, z: number, r: number, col: Col, spokes = 8) {
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI;
    const long = i % 2 === 0;
    k.boxC(x, y, z, r * (long ? 2 : 1.3), 0.1, 0.1, col, 'light', { rz: a, cast: false });
  }
  for (let i = 0; i < spokes * 2; i += 2) {
    const a = (i / (spokes * 2)) * Math.PI * 2;
    k.sphere(x + Math.cos(a) * r, y + Math.sin(a) * r, z, 0.17, 0xffe58a, 'light', 6, 4);
  }
}

function bowlORama(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 56;
  const D = 46;
  c.occ.add(x, z, W, D, ry, 1, false);
  const TEAL = 0x1f8f9a;
  const ORANGE = 0xf0742a;
  const wall = sgn(c, 'bw.wall', () =>
    panelSign(1024, 170, '#1b3a52', [
      { text: 'BOWL-O-RAMA', font: F_SLAB, color: '#ffb23a', y: 0.45, size: 0.62, maxW: 0.7, stroke: '#7a2a0a', strokeW: 8 },
      { text: '40 LANES · COSMIC BOWL · SNACK BAR · LOUNGE', font: F_OS, weight: '700', color: '#7fe6f0', y: 0.88, size: 0.14, maxW: 0.8, letter: 4 },
    ], { border: '#ffb23a', borderW: 8 }));
  const tower = sgn(c, 'bw.tower', () =>
    panelSign(640, 240, '#f4f1ea', [
      { text: 'BOWL-O-RAMA', font: F_SLAB, color: '#d9421f', y: 0.38, size: 0.34, maxW: 0.9, stroke: '#1b3a52', strokeW: 6 },
      { text: 'LANES · LEAGUES · LOUNGE', font: F_OS, weight: '700', color: '#1b3a52', y: 0.72, size: 0.14, maxW: 0.86, letter: 3 },
      { text: 'OPEN 10AM – 2AM', font: F_OS, weight: '700', color: '#1f8f9a', y: 0.9, size: 0.1 },
    ], { border: '#1f8f9a', borderW: 14 }));
  const reader = sgn(c, 'bw.reader', () =>
    panelSign(576, 160, '#16181c', [
      { text: 'COSMIC BOWL FRI & SAT', font: F_OS, weight: '700', color: '#ffe14a', y: 0.24, size: 0.2, maxW: 0.92 },
      { text: 'MEN’S LEAGUE TUES 7PM', font: F_OS, weight: '700', color: '#ffffff', y: 0.5, size: 0.2, maxW: 0.92 },
      { text: 'KIDS BOWL FREE SUMMER', font: F_OS, weight: '700', color: '#7fe6f0', y: 0.76, size: 0.2, maxW: 0.92 },
    ], { border: '#ffe14a', borderW: 8 }));
  const lobby = sgn(c, 'bw.lobby', bowlInterior);

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    const HX = 4;
    const H = 8.2;
    const hz = -11.75;
    const zf = 4;
    k.solid(HX, hz, 40, 21.5);
    k.solid(HX, 1.5, 24, 5);
    // lot
    slab(k, HX, 4.6, 24, 1.2, 0.12);
    stalls(k, -12.2, 2.8, 14, 5.4, 10.9);
    stalls(k, -12.2, 2.8, 14, 17.5, 22.9);
    mark(k, 7, 14.2, 40, 0.12, 0xe7b93a);
    for (const lx of [-8, 8, 24]) lamp(k, lx, 14.2, 0, 9, true);
    island(k, -22, 23 - 1.0, 12, 2.0);
    for (let i = 0; i < 4; i++) shrub(k, -26 + i * 2.8, 22.2, 0.6);
    conifer(k, -26.5, 8, 7);
    conifer(k, 26.5, 20.5, 6.5);
    // hall
    k.box(HX, 0, hz, 40, H, 21.5, 0xffffff, 'cinder');
    k.box(HX, 0, hz, 40.14, 0.5, 21.64, 0x8f8c87, 'concrete');
    k.box(HX, 5.4, hz + 10.77, 40.1, 0.5, 0.06, TEAL);
    k.box(HX, 5.95, hz + 10.77, 40.1, 0.4, 0.06, ORANGE);
    for (const s of [-1, 1]) {
      k.box(HX + (s * 40) / 2, 5.4, hz, 0.06, 0.5, 21.6, TEAL);
      k.box(HX + (s * 40) / 2, 5.95, hz, 0.06, 0.4, 21.6, ORANGE);
    }
    flatTop(k, rng, HX, hz, 40, 21.5, H, 0xb9b4ab, 5);
    k.sign(HX - 1.5, 6.9, -1 + 0.14, 20, 3.0, wall, { thick: 0.2, back: 0x1b3a52 });
    neon(k, HX - 1.5, 5.3, -1 + 0.26, 20.4, 0.07, 0.05, 0xff3ea5);
    neon(k, HX - 1.5, 8.5, -1 + 0.26, 20.4, 0.07, 0.05, 0x3fe0ff);
    // entry block
    const ex = 4;
    k.box(ex, 0, 1.5, 24, 4.8, 5, 0xffffff, 'brickTan');
    k.box(ex, 0, 1.5, 24.14, 0.4, 5.14, 0x8f8c87, 'concrete');
    k.box(ex, 4.8, 1.5, 24.6, 0.3, 5.6, 0xb9b4ab, 'concrete');
    k.box(ex, 4.1, zf + 0.04, 24.2, 0.7, 0.1, TEAL, 'gloss');
    neon(k, ex, 4.0, zf + 0.12, 24.2, 0.07, 0.05, 0x3fe0ff);
    neon(k, ex, 4.5, zf + 0.12, 24.2, 0.07, 0.05, 0xff3ea5);
    glassWall(k, ex - 9, ex + 9, 0.4, zf, 3.4, 0x20262c, 0.55);
    k.signPlane(ex, 0.4 + 1.7, zf + 0.02, 18, 3.4, lobby);
    doubleDoor(k, ex, 0.4, zf, 0x20262c);
    for (const sx of [-1, 1]) {
      k.box(ex + sx * 10.7, 0, zf - 0.05, 3.2, 4.8, 0.14, 0xffffff, 'brickRed');
    }
    // roof pin + bolt-on cradle
    k.box(21, H, -6, 2.4, 0.3, 2.4, 0x8a8f94, 'metal');
    giantPin(k, 21, H + 0.3, -6, 7.2);
    // Googie tower sign
    k.at(-21, 15.5, 0, () => {
      k.solid(0, 0, 3.4, 1.8);
      k.box(0, 0, 0, 4.6, 0.6, 1.8, CURB, 'concrete');
      for (const s of [-1, 1]) k.beam({ x: s * 1.9, y: 0.6, z: 0 }, { x: s * 1.2, y: 11.4, z: 0 }, 0.5, 0.5, 0x6f7377, 'metal');
      k.box(0, 7.2, 0, 4.2, 0.35, 0.5, 0x6f7377, 'metal');
      k.sign(0, 8.8, 0, 7.6, 2.9, tower, { thick: 0.5, back: 0x1b3a52, twoSided: true, frame: 0.22 });
      k.sign(0, 5.2, 0, 4.6, 1.3, reader, { thick: 0.35, back: 0x16181c, twoSided: true, frame: 0.15 });
      neon(k, 0, 10.45, 0.3, 8.0, 0.08, 0.05, 0xff3ea5);
      neon(k, 0, 7.15, 0.3, 8.0, 0.08, 0.05, 0x3fe0ff);
      neon(k, 0, 10.45, -0.3, 8.0, 0.08, 0.05, 0xff3ea5);
      neon(k, 0, 7.15, -0.3, 8.0, 0.08, 0.05, 0x3fe0ff);
      starburst(k, 0, 12.6, 0, 1.4, 0xff9a3a);
      starburst(k, -3.9, 11.4, 0, 0.95, 0x3fe0ff, 6);
      starburst(k, 3.9, 11.4, 0, 0.95, 0xff3ea5, 6);
      k.sphere(0, 12.6, 0, 0.5, 0xffe14a, 'light', 8, 6);
    });
    // side / rear details
    for (const s of [-1, 1]) {
      k.at(HX + s * 20, hz + 4, s * HALF, () => {
        doorAt(k, 0, 0.15, 0, 1.2, 2.2, 0x6b6f73);
        k.box(0, 3.2, 0.1, 0.5, 0.25, 0.25, 0xe8e4d8);
        neon(k, 0, 3.6, 0.3, 0.5, 0.1, 0.05, 0xffb23a);
      });
    }
    for (let i = 0; i < 3; i++) k.box(HX - 12 + i * 12, 0.15, -hz - 8.4 - 0.1 - 10.7 + 0.0, 4.0, 3.3, 0.14, 0xe4e1d6, 'rollup');
    dumpster(k, -18, -21.3, 0, P.dumpster, rng);
    dumpster(k, -14.8, -21.3, 0, P.dumpster, rng);
    // cars
    const types: VehicleType[] = ['pickup', 'sedan', 'van', 'coupe', 'suv', 'sedan', 'wagon', 'pickup', 'sedan', 'coupe', 'suv', 'sedan'];
    const row1 = shuffled(rng, 14).slice(0, 7);
    const row2 = shuffled(rng, 14).slice(0, 5);
    row1.forEach((s, i) => park(c, types[i], -10.8 + s * 2.8, 8.1, rng.chance(0.5) ? HALF : -HALF, rng.pick(CAR_COLORS)));
    row2.forEach((s, i) => park(c, types[i + 7], -10.8 + s * 2.8, 20.2, rng.chance(0.5) ? HALF : -HALF, rng.pick(CAR_COLORS)));
  });
}

/* ================================================================================================
 * 9. THRIFTY MART — neighbourhood supermarket: entry tower, long canopy, cart corrals, big lot
 * ============================================================================================== */

function groceryInterior(): HTMLCanvasElement {
  const [c, g] = makeCanvas(512, 168);
  g.fillStyle = '#efe6cf';
  g.fillRect(0, 0, 512, 168);
  g.fillStyle = '#bfb59a';
  g.fillRect(0, 130, 512, 38);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 512, 10);
  const prod = ['#d6301f', '#f2c230', '#4f9a3a', '#e8782a', '#2a62b8', '#8a3ab0'];
  for (let a = 0; a < 5; a++) {
    const x = 20 + a * 96;
    g.fillStyle = '#8a8f94';
    g.fillRect(x, 40, 70, 92);
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 7; i++) {
        g.fillStyle = prod[(a + r + i) % prod.length];
        g.fillRect(x + 3 + i * 9.4, 44 + r * 22, 7, 16);
      }
    }
    g.fillStyle = '#1b6b3a';
    g.fillRect(x + 20, 18, 30, 12);
  }
  g.fillStyle = '#2a7a3a';
  g.fillRect(0, 108, 512, 8);
  return c;
}

function thriftyMart(c: Ctx, x: number, z: number, ry: number, seed: number) {
  const k = c.kit;
  const rng = new Rng(seed);
  const W = 60;
  const D = 52;
  c.occ.add(x, z, W, D, ry, 1, false);
  const GREEN = 0x1f6b3a;
  const YEL = 0xffd23a;
  const tower = sgn(c, 'tm.tower', () =>
    panelSign(768, 240, '#1f6b3a', [
      { text: 'THRIFTY MART', font: F_SLAB, color: '#ffd23a', y: 0.4, size: 0.4, maxW: 0.9, stroke: '#0d3a1d', strokeW: 8 },
      { text: 'LOW PRICES EVERY DAY', font: F_OS, weight: '700', color: '#ffffff', y: 0.78, size: 0.16, maxW: 0.8, letter: 4 },
    ], { border: '#ffd23a', borderW: 12 }));
  const fasciaL = sgn(c, 'tm.fl', () =>
    panelSign(640, 96, '#ffd23a', [{ text: 'FRESH PRODUCE · MEATS · DELI · BAKERY', font: F_SLAB, color: '#1f6b3a', y: 0.52, size: 0.4, maxW: 0.94 }], { border: '#1f6b3a', borderW: 6 }));
  const fasciaR = sgn(c, 'tm.fr', () =>
    panelSign(640, 96, '#c8262c', [{ text: 'PHARMACY · FILM DEVELOPING · MONEY ORDERS', font: F_SLAB, color: '#ffffff', y: 0.52, size: 0.34, maxW: 0.95 }], { border: '#ffd23a', borderW: 6 }));
  const pole = sgn(c, 'tm.pole', () =>
    panelSign(512, 600, '#1f6b3a', [
      { text: 'THRIFTY', font: F_SLAB, color: '#ffd23a', y: 0.14, size: 0.14, maxW: 0.86, stroke: '#0d3a1d', strokeW: 6 },
      { text: 'MART', font: F_SLAB, color: '#ffffff', y: 0.3, size: 0.17, maxW: 0.6, stroke: '#0d3a1d', strokeW: 6 },
      { text: 'OPEN 7AM – MIDNIGHT', font: F_OS, weight: '700', color: '#ffd23a', y: 0.47, size: 0.07, maxW: 0.86 },
      { text: 'WEEKLY SPECIALS', font: F_SLAB, color: '#1f6b3a', y: 0.62, size: 0.075, maxW: 0.8 },
      { text: 'FRYER CHICKEN  .99/LB', font: F_OS, weight: '700', color: '#c8262c', y: 0.76, size: 0.07, maxW: 0.8 },
      { text: 'BANANAS  .29/LB', font: F_OS, weight: '700', color: '#c8262c', y: 0.87, size: 0.07, maxW: 0.8 },
    ], { border: '#ffd23a', borderW: 12, draw: (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(24, h * 0.54, w - 48, h * 0.4); } }));
  const interior = sgn(c, 'tm.in', groceryInterior);

  k.at(x, z, ry, () => {
    pave(k, 0, 0, W, D);
    const zf = -8;
    const bz = -16;
    const H = 6.4;
    k.solid(0, bz, 46, 16);
    k.solid(-8, -9.1, 12, 8);
    // lot: three rows of stalls, cart corrals, islands
    stalls(k, -22.4, 2.8, 16, 0.6, 6.1);
    stalls(k, -22.4, 2.8, 16, 6.1, 11.6);
    stalls(k, -22.4, 2.8, 16, 18.8, 24.3);
    for (const cx of [-22.4, 22.4]) island(k, cx, 12, 2.2, 2.4);
    mark(k, 0, 14.8, 56, 0.12, 0xe7b93a);
    mark(k, 0, -2.5, 46, 0.35, 0xe7b93a);
    for (let i = 0; i < 6; i++) mark(k, -17 + i * 6.8, -1.6, 3.2, 0.4);
    for (const lx of [-20, 0, 20]) {
      lamp(k, lx, 12, 0, 9, true);
      lamp(k, lx, 24.6, 0, 9, true);
    }
    for (const cx of [-14, 8, 24]) cartCorral(k, cx + 0.0, 3.2);
    for (const cx of [-26.5, 26.5]) cartCorral(k, cx, 16);
    island(k, 0, 24.9 + 0.0, 40, 2.4);
    for (let i = 0; i < 8; i++) shrub(k, -18 + i * 5.2, 25.0, 0.6);
    conifer(k, -28.4, -2, 7);
    conifer(k, 28, -2, 7);
    tree(k, 28, 20, 6);
    // building
    k.box(0, 0, bz, 46, H, 16, 0xe3d9bf, 'stucco');
    k.box(0, 0, bz, 46.14, 0.5, 16.14, 0x8f8c87, 'concrete');
    k.box(0, 4.2, zf - 0.03, 46, 0.35, 0.06, GREEN);
    flatTop(k, rng, 0, bz, 46, 16, H, 0xb9b4ab, 5);
    // entry tower
    const tx = -8;
    k.box(tx, 0, -9.1, 12, 8.4, 7.8, 0xefe8d4, 'stucco');
    k.box(tx, 0, -9.1, 12.14, 0.5, 7.94, 0x8f8c87, 'concrete');
    k.hipRoof(tx, 8.4, -9.1, 12, 7.8, 1.8, 0x23563a, 'roofMetal', 0.5);
    k.sign(tx, 6.4, -5.2 + 0.1, 9.6, 3.0, tower, { thick: 0.2, back: 0x0d3a1d });
    neon(k, tx, 4.55, -5.2 + 0.1, 11.6, 0.07, 0.05, 0xffd23a);
    // sidewalk canopy + glazing
    slab(k, 0, zf + 1.7, 46, 3.4, 0.15);
    k.box(0, 3.75, zf + 1.7, 46.4, 0.25, 3.4, 0xe9e5d8);
    k.box(0, 3.5, zf + 3.3, 46.4, 1.1, 0.2, GREEN, 'gloss');
    k.box(0, 4.6, zf + 3.3, 46.6, 0.1, 0.26, YEL);
    for (let i = 0; i <= 8; i++) {
      const px = -23 + i * 5.75;
      k.solid(px, zf + 3.1, 0.35, 0.35);
      k.box(px, 0.15, zf + 3.1, 0.3, 3.6, 0.3, 0xe9e5d8);
    }
    k.sign(-14.5, 4.05, zf + 3.45, 15.5, 0.85, fasciaL, { thick: 0.1 });
    k.sign(14.5, 4.05, zf + 3.45, 15.5, 0.85, fasciaR, { thick: 0.1 });
    glassWall(k, -22.6, -14, 0.4, zf, 3.0, 0x1b3a28, 0.6);
    glassWall(k, -2.2, 22.6, 0.4, zf, 3.0, 0x1b3a28, 0.6);
    k.signPlane(-18.3, 0.4 + 1.5, zf + 0.02, 8.6, 3.0, interior);
    k.signPlane(10.2, 0.4 + 1.5, zf + 0.02, 24.8, 3.0, interior);
    // tower entry doors
    k.box(tx, 0.4, -5.2 - 0.06, 8.6, 3.0, 0.12, P.glass, 'glass');
    doubleDoor(k, tx - 1.6, 0.4, -5.2, 0x1b3a28);
    doubleDoor(k, tx + 1.6, 0.4, -5.2, 0x1b3a28);
    for (const sx of [-1, 1]) k.box(tx + sx * 4.5, 0.4, -5.2 + 0.03, 0.2, 3.0, 0.12, 0x1b3a28);
    k.box(tx, 3.3, -5.2 + 0.03, 9.0, 0.2, 0.12, 0x1b3a28);
    for (const bx of [tx - 4.6, tx + 4.6, tx - 0.0]) {
      k.solid(bx, -4.6, 0.4, 0.4);
      k.cyl(bx, 0, -4.6, 0.16, 0.16, 0.95, 6, 0xf2c230, 'metal');
    }
    // front stuff: ice chest, propane cage, benches, bins, kiddie ride
    k.at(-1.0, zf + 0.8, 0, () => {
      k.solid(0, 0, 2.0, 0.9);
      k.box(0, 0, 0, 1.8, 1.2, 0.8, 0xf4f1ea, 'metal');
      k.box(0, 1.2, 0, 1.85, 0.08, 0.85, 0x2a62b8);
    });
    k.at(18.5, zf + 0.9, 0, () => {
      k.solid(0, 0, 1.6, 1.0);
      k.box(0, 0, 0, 1.5, 0.1, 0.9, 0x5b5f66, 'metal');
      for (let i = 0; i < 5; i++) k.box(-0.7 + i * 0.35, 0.1, 0, 0.04, 1.7, 0.04, 0xc8262c, 'metal');
      k.box(0, 1.8, 0, 1.5, 0.05, 0.9, 0xc8262c, 'metal');
      for (let i = 0; i < 4; i++) k.cyl(-0.5 + (i % 2) * 1.0, 0.1, -0.2 + (i >> 1) * 0.45, 0.2, 0.2, 0.8, 8, 0xe6e8ea, 'metal');
    });
    bench(k, 3.6, zf + 0.7, Math.PI);
    bench(k, -18, zf + 0.7, Math.PI);
    trashCan(k, 6.4, zf + 0.7);
    trashCan(k, -11, zf + 0.7);
    k.at(12.5, zf + 0.9, 0, () => {
      k.solid(0, 0, 0.9, 0.9);
      k.box(0, 0, 0, 0.6, 0.5, 0.6, 0x1d4aa3);
      k.ico(0, 0.9, 0, 0.35, 0, 0xc8262c, 'gloss', 1, 1.1, 1);
    });
    // rear dock + compactor
    for (const dx of [-14, -6]) {
      k.box(dx, 0.15, bz - 8 - 0.06, 3.4, 3.0, 0.14, 0xe4e1d6, 'rollup');
      k.box(dx, 0, bz - 8 - 0.6, 3.6, 1.1, 1.0, 0x6b6f73, 'concrete');
    }
    k.box(19, 0, -24.9, 4.6, 2.0, 1.8, 0x3f6b46, 'metal');
    k.solid(19, -24.9, 4.6, 1.8);
    dumpster(k, 12, -25.0, 0, P.dumpster, rng);
    // cars
    const types: VehicleType[] = ['sedan', 'pickup', 'wagon', 'van', 'coupe', 'suv', 'sedan', 'pickup', 'sedan', 'coupe', 'wagon', 'sedan', 'suv', 'sedan', 'pickup', 'van'];
    const rows: [number, number][] = [[3.35, 8], [8.85, 5], [21.55, 5]];
    let t = 0;
    for (const [rz, n] of rows) {
      for (const s of shuffled(rng, 16).slice(0, n)) {
        park(c, types[t++ % types.length], -21 + s * 2.8, rz, rng.chance(0.5) ? HALF : -HALF, rng.pick(CAR_COLORS));
      }
    }
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
  { id: 'stripMall', name: 'Valley Plaza', w: 58, d: 34, front: -3.5, tags: ['retail', 'arcade', 'laundromat', 'highway'], build: stripMall },
  { id: 'bowlORama', name: 'Bowl-O-Rama', w: 56, d: 46, front: 4, tags: ['entertainment', 'bowling', 'highway'], build: bowlORama },
  { id: 'thriftyMart', name: 'Thrifty Mart', w: 60, d: 52, front: -8, tags: ['grocery', 'highway'], build: thriftyMart },
];

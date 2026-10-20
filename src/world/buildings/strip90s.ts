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
      k.beam({ x: 2.4, y: 2.8, z: -1 }, { x: 4.4, y: 0.3, z: 0.4 }, 0.8, 0.08, 0xc8262c);
      k.box(4.4, 0, 0.4, 0.8, 0.3, 0.8, 0x3fa34d);
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

/* @@END */

export const STRIP: BuildingDef[] = [
  { id: 'bigBun', name: 'Big Bun Burgers', w: 40, d: 36, front: 0, tags: ['fastfood', 'highway'], build: bigBun },
];

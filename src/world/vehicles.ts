import * as THREE from 'three';
import type { Kit, Col } from './core/kit';
import type { SignBook } from './signs';

export type VehicleType = 'sedan' | 'wagon' | 'coupe' | 'pickup' | 'van' | 'suv' | 'sheriff' | 'sheriffSuv' | 'semi' | 'tow' | 'jeep';

export interface VehicleOpts {
  accent?: Col;
  trailer?: boolean;
  stripes?: boolean;
  woody?: boolean;
}

const CHROME = 0xc9ccd0;
const TIRE = 0x1a1a1b;
const GLASS = 0x1c242c;
const DARK = 0x232325;
const LAMP = 0xf1eedd;
const TAIL = 0xa3221d;

type Pt = [number, number];

/** Side silhouette: bottom edge with wheel arches, then the given upper outline from front to rear. */
function profile(upper: Pt[], bottom: number, arches: { x: number; r: number }[], xr: number, xf: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(xr, bottom);
  for (const a of [...arches].sort((p, q) => p.x - q.x)) {
    s.lineTo(a.x - a.r, bottom);
    s.absarc(a.x, bottom, a.r, Math.PI, 0, true);
  }
  s.lineTo(xf, bottom);
  for (const [x, y] of upper) s.lineTo(x, y);
  s.lineTo(xr, bottom);
  return s;
}

function poly(pts: Pt[]): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

function wheel(k: Kit, x: number, z: number, r: number, width: number, side: number, dual = false) {
  k.cylZ(x, r, z, r, width, 12, TIRE, 'rubber');
  k.cylZ(x, r, z + side * (width / 2 + 0.005), r * 0.58, 0.02, 10, CHROME, 'metal');
  k.cylZ(x, r, z + side * (width / 2 + 0.015), r * 0.22, 0.02, 8, 0x8a8e92, 'metal');
  if (dual) k.cylZ(x, r, z - side * (width + 0.02), r, width, 12, TIRE, 'rubber');
}

function wheels(k: Kit, axles: number[], r: number, W: number, inset = 0.16, duals: boolean[] = []) {
  axles.forEach((x, i) => {
    for (const s of [-1, 1]) wheel(k, x, s * (W / 2 - inset), r, 0.26, s, duals[i]);
  });
}

/** Glass side windows as thin extrusions sitting proud of the cabin sides. */
function sideGlass(k: Kit, panes: Pt[][], halfW: number) {
  for (const p of panes) for (const s of [-1, 1]) k.extrude(poly(p), 0.025, GLASS, 'glass', 0, 0, s * (halfW + 0.008));
}

function paneBetween(k: Kit, a: Pt, b: Pt, width: number) {
  k.beam({ x: a[0], y: a[1], z: 0 }, { x: b[0], y: b[1], z: 0 }, width, 0.035, GLASS, 'glass');
}

function carFront(k: Kit, xf: number, W: number, yLow: number, yHigh: number, grille: Col = 0x2d2f31) {
  k.box(xf + 0.04, yLow, 0, 0.16, 0.18, W + 0.06, CHROME, 'metal');
  k.box(xf + 0.01, yLow + 0.22, 0, 0.05, yHigh - yLow - 0.26, W * 0.5, grille);
  for (let i = 0; i < 4; i++) k.box(xf + 0.035, yLow + 0.26 + i * ((yHigh - yLow - 0.34) / 3), 0, 0.02, 0.02, W * 0.5, CHROME, 'metal');
  for (const s of [-1, 1]) {
    k.box(xf + 0.01, yLow + 0.24, s * (W / 2 - 0.28), 0.05, Math.min(0.2, yHigh - yLow - 0.28), 0.36, LAMP, 'gloss');
    k.box(xf + 0.015, yLow + 0.18, s * (W / 2 - 0.12), 0.04, 0.1, 0.14, 0xe0882e, 'gloss');
  }
}

function carRear(k: Kit, xr: number, W: number, yLow: number, yHigh: number) {
  k.box(xr - 0.04, yLow, 0, 0.16, 0.18, W + 0.06, CHROME, 'metal');
  for (const s of [-1, 1]) k.box(xr - 0.01, yLow + 0.24, s * (W / 2 - 0.3), 0.05, Math.min(0.22, yHigh - yLow - 0.26), 0.5, TAIL, 'gloss');
  k.box(xr - 0.02, yLow + 0.22, 0, 0.03, 0.17, 0.36, 0xf2efe6);
}

function mirrors(k: Kit, x: number, y: number, W: number) {
  for (const s of [-1, 1]) {
    k.box(x, y, s * (W / 2 + 0.08), 0.06, 0.06, 0.16, DARK);
    k.box(x, y + 0.04, s * (W / 2 + 0.16), 0.08, 0.14, 0.06, CHROME, 'metal');
  }
}

function sedanLike(k: Kit, color: Col, wagon: boolean, roofColor?: Col) {
  const W = 1.95;
  const xf = 2.62;
  const xr = -2.62;
  const body = profile(
    [
      [2.66, 0.62],
      [2.62, 0.9],
      [2.45, 0.97],
      [1.05, 1.02],
      [wagon ? -2.5 : -1.6, 1.02],
      [-2.55, 0.98],
      [-2.64, 0.85],
      [-2.64, 0.32],
    ],
    0.32,
    [
      { x: -1.5, r: 0.47 },
      { x: 1.55, r: 0.47 },
    ],
    xr,
    xf,
  );
  k.extrude(body, W, color, 'gloss');
  k.box(0, 0.12, 0, 4.6, 0.3, W - 0.3, DARK);
  const gh: Pt[] = wagon
    ? [
        [1.05, 1.0],
        [0.25, 1.42],
        [-2.42, 1.42],
        [-2.52, 1.0],
      ]
    : [
        [1.05, 1.0],
        [0.25, 1.42],
        [-0.95, 1.42],
        [-1.6, 1.0],
      ];
  const Wg = W - 0.24;
  k.extrude(poly(gh), Wg, roofColor ?? color, 'gloss');
  sideGlass(
    k,
    wagon
      ? [
          [
            [0.92, 1.06],
            [0.28, 1.37],
            [-0.25, 1.37],
            [-0.25, 1.06],
          ],
          [
            [-0.38, 1.06],
            [-0.38, 1.37],
            [-1.35, 1.37],
            [-1.35, 1.06],
          ],
          [
            [-1.48, 1.06],
            [-1.48, 1.37],
            [-2.36, 1.37],
            [-2.4, 1.06],
          ],
        ]
      : [
          [
            [0.92, 1.06],
            [0.28, 1.37],
            [-0.25, 1.37],
            [-0.25, 1.06],
          ],
          [
            [-0.38, 1.06],
            [-0.38, 1.37],
            [-0.9, 1.37],
            [-1.42, 1.06],
          ],
        ],
    Wg / 2,
  );
  paneBetween(k, [1.0, 1.05], [0.3, 1.39], Wg - 0.16);
  if (wagon) k.box(-2.54, 1.05, 0, 0.03, 0.32, Wg - 0.2, GLASS, 'glass');
  else paneBetween(k, [-1.52, 1.05], [-0.98, 1.39], Wg - 0.16);
  carFront(k, xf, W, 0.42, 0.92);
  carRear(k, xr, W, 0.42, 0.92);
  mirrors(k, 0.95, 1.02, W);
  for (const s of [-1, 1]) k.box(0, 0.62, s * (W / 2 + 0.005), 4.9, 0.035, 0.012, CHROME, 'metal');
  wheels(k, [-1.5, 1.55], 0.36, W);
}

function coupe(k: Kit, color: Col, stripes: boolean) {
  const W = 1.9;
  const xf = 2.45;
  const xr = -2.45;
  const body = profile(
    [
      [2.5, 0.55],
      [2.42, 0.76],
      [0.6, 0.93],
      [-1.9, 0.96],
      [-2.4, 0.94],
      [-2.47, 0.6],
      [-2.47, 0.28],
    ],
    0.28,
    [
      { x: -1.45, r: 0.46 },
      { x: 1.5, r: 0.46 },
    ],
    xr,
    xf,
  );
  k.extrude(body, W, color, 'gloss');
  k.box(0, 0.1, 0, 4.3, 0.28, W - 0.3, DARK);
  const Wg = W - 0.28;
  k.extrude(poly([[0.6, 0.92], [-0.12, 1.27], [-0.75, 1.27], [-1.85, 0.95]]), Wg, color, 'gloss');
  sideGlass(k, [[[0.48, 0.97], [-0.12, 1.23], [-0.62, 1.23], [-0.62, 0.97]], [[-0.74, 0.97], [-0.74, 1.22], [-1.45, 0.97]]], Wg / 2);
  paneBetween(k, [0.56, 0.95], [-0.08, 1.25], Wg - 0.14);
  paneBetween(k, [-1.78, 0.97], [-0.8, 1.25], Wg - 0.14);
  k.box(1.3, 0.92, 0, 0.9, 0.08, 0.6, color, 'gloss');
  k.box(-2.3, 0.96, 0, 0.18, 0.1, W - 0.1, color, 'gloss');
  if (stripes) {
    for (const s of [-0.18, 0.18]) {
      k.beam({ x: 2.43, y: 0.78, z: s }, { x: 0.62, y: 0.95, z: s }, 0.18, 0.012, 0xf4f1ea, 'gloss', false);
      k.beam({ x: -0.76, y: 1.285, z: s }, { x: -0.12, y: 1.285, z: s }, 0.18, 0.012, 0xf4f1ea, 'gloss', false);
      k.beam({ x: -1.9, y: 0.975, z: s }, { x: -2.4, y: 0.955, z: s }, 0.18, 0.012, 0xf4f1ea, 'gloss', false);
    }
  }
  carFront(k, xf, W, 0.35, 0.72, 0x1d1d1f);
  carRear(k, xr, W, 0.36, 0.9);
  mirrors(k, 0.5, 0.94, W);
  for (const s of [-0.45, 0.45]) k.cylX(-2.55, 0.3, s, 0.05, 0.3, 6, CHROME, 'metal');
  wheels(k, [-1.45, 1.5], 0.35, W);
}

function pickupLike(k: Kit, color: Col, mode: 'pickup' | 'suv' | 'tow', accent?: Col) {
  const W = 2.0;
  const xf = 2.72;
  const xr = -2.72;
  const bedTop = mode === 'suv' ? 1.16 : 0.86;
  const body = profile(
    [
      [2.75, 0.8],
      [2.68, 1.12],
      [1.2, 1.16],
      [-0.45, 1.16],
      [-0.45, bedTop],
      [-2.7, bedTop],
      [-2.74, 0.6],
      [-2.74, 0.42],
    ],
    0.42,
    [
      { x: -1.65, r: 0.52 },
      { x: 1.7, r: 0.52 },
    ],
    xr,
    xf,
  );
  k.extrude(body, W, color, 'gloss');
  k.box(0, 0.22, 0, 4.9, 0.32, W - 0.3, DARK);
  const Wg = W - 0.2;
  const roofC = accent ?? color;
  if (mode === 'suv') {
    k.extrude(poly([[1.2, 1.15], [0.62, 1.8], [-2.62, 1.8], [-2.66, 1.15]]), Wg, roofC, 'gloss');
    sideGlass(k, [[[1.02, 1.22], [0.64, 1.73], [-0.3, 1.73], [-0.3, 1.22]], [[-0.45, 1.22], [-0.45, 1.73], [-2.5, 1.73], [-2.52, 1.22]]], Wg / 2);
    k.box(-2.67, 1.25, 0, 0.03, 0.45, Wg - 0.25, GLASS, 'glass');
  } else {
    k.extrude(poly([[1.2, 1.15], [0.62, 1.78], [-0.4, 1.78], [-0.45, 1.15]]), Wg, roofC, 'gloss');
    sideGlass(k, [[[1.02, 1.22], [0.64, 1.72], [-0.3, 1.72], [-0.3, 1.22]]], Wg / 2);
    k.box(-0.47, 1.26, 0, 0.03, 0.42, Wg - 0.4, GLASS, 'glass');
    k.box(-1.6, 0.86, 0, 2.2, 0.03, W - 0.22, 0x2a2a2a);
    for (const s of [-1, 1]) k.box(-1.58, 0.86, s * (W / 2 - 0.05), 2.26, 0.32, 0.1, color, 'gloss');
    k.box(-2.68, 0.86, 0, 0.08, 0.32, W, color, 'gloss');
    for (const s of [-1, 1]) k.box(-1.58, 1.18, s * (W / 2 - 0.05), 2.26, 0.04, 0.14, CHROME, 'metal');
  }
  paneBetween(k, [1.12, 1.2], [0.67, 1.73], Wg - 0.16);
  if (accent !== undefined) for (const s of [-1, 1]) k.box(0.0, 0.72, s * (W / 2 + 0.006), 5.1, 0.16, 0.012, accent, 'gloss', { cast: false });
  carFront(k, xf, W, 0.5, 1.08);
  carRear(k, xr, W, 0.5, bedTop - 0.02);
  mirrors(k, 1.05, 1.25, W);
  wheels(k, [-1.65, 1.7], 0.4, W);
  if (mode === 'tow') {
    k.box(-1.0, 0.88, 0, 0.3, 1.4, 1.6, 0x2a2a2a, 'metal');
    k.beam({ x: -1.0, y: 2.2, z: 0 }, { x: -3.2, y: 2.8, z: 0 }, 0.22, 0.22, 0xe0b23a, 'metal');
    k.beam({ x: -1.0, y: 1.2, z: 0 }, { x: -2.2, y: 2.4, z: 0 }, 0.12, 0.12, 0x3a3a3a, 'metal');
    k.box(-3.2, 1.6, 0, 0.04, 1.2, 0.04, 0x3a3a3a, 'metal');
    k.box(-3.2, 1.45, 0, 0.18, 0.18, 0.1, 0x3a3a3a, 'metal');
    k.box(0.1, 1.8, 0, 0.3, 0.1, 1.2, 0xe0882e, 'light');
  }
}

function van(k: Kit, color: Col, accent?: Col) {
  const W = 2.0;
  const xf = 2.52;
  const xr = -2.5;
  const body = profile(
    [
      [2.55, 0.85],
      [2.42, 1.12],
      [1.75, 1.2],
      [1.15, 1.98],
      [-2.42, 2.05],
      [-2.52, 1.92],
      [-2.52, 0.4],
    ],
    0.4,
    [
      { x: -1.55, r: 0.49 },
      { x: 1.75, r: 0.49 },
    ],
    xr,
    xf,
  );
  k.extrude(body, W, color, 'gloss');
  k.box(0, 0.2, 0, 4.4, 0.3, W - 0.3, DARK);
  paneBetween(k, [1.73, 1.24], [1.2, 1.93], W - 0.3);
  sideGlass(k, [[[1.6, 1.3], [1.18, 1.9], [0.45, 1.9], [0.45, 1.3]]], W / 2);
  for (const s of [-1, 1]) k.box(-2.53, 1.3, s * 0.45, 0.03, 0.5, 0.65, GLASS, 'glass');
  k.box(-2.53, 0.42, 0, 0.03, 1.55, 0.03, 0x2a2a2a);
  if (accent !== undefined) for (const s of [-1, 1]) k.box(-0.3, 1.0, s * (W / 2 + 0.006), 4.0, 0.22, 0.012, accent, 'gloss', { cast: false });
  carFront(k, xf, W, 0.48, 1.05);
  carRear(k, xr, W, 0.48, 1.0);
  mirrors(k, 1.55, 1.35, W);
  wheels(k, [-1.55, 1.75], 0.38, W);
}

function jeep(k: Kit, color: Col) {
  const W = 1.75;
  const body = profile(
    [
      [1.95, 0.95],
      [1.88, 1.12],
      [0.55, 1.14],
      [0.45, 1.05],
      [-1.75, 1.05],
      [-1.8, 0.48],
    ],
    0.48,
    [
      { x: -1.1, r: 0.5 },
      { x: 1.2, r: 0.5 },
    ],
    -1.8,
    1.92,
  );
  k.extrude(body, W, color, 'gloss');
  k.box(-0.65, 0.8, 0, 2.2, 0.3, W - 0.16, 0x3b2a20);
  for (const s of [-0.4, 0.4]) {
    k.box(-0.1, 0.95, s, 0.45, 0.45, 0.42, 0x3b2a20);
    k.box(-0.32, 1.1, s, 0.12, 0.65, 0.42, 0x3b2a20);
  }
  k.box(0.5, 1.14, 0, 0.06, 0.55, W - 0.1, 0x2a2a2a);
  k.box(0.5, 1.2, 0, 0.03, 0.42, W - 0.3, GLASS, 'glass');
  const rb = [
    { x: -0.7, y: 1.05, z: -W / 2 + 0.08 },
    { x: -0.7, y: 2.0, z: -W / 2 + 0.08 },
    { x: -0.7, y: 2.0, z: W / 2 - 0.08 },
    { x: -0.7, y: 1.05, z: W / 2 - 0.08 },
  ];
  for (let i = 0; i < 3; i++) k.beam(rb[i], rb[i + 1], 0.08, 0.08, 0x2a2a2a, 'metal');
  for (let i = 0; i < 4; i++) k.cylZ(1.6, 1.25, -0.6 + i * 0.4, 0.09, 0.08, 8, LAMP, 'gloss');
  k.box(1.95, 0.55, 0, 0.12, 0.16, W + 0.1, 0x2a2a2a);
  k.box(1.93, 0.72, 0, 0.04, 0.35, 0.8, 0x1d1d1f);
  k.cylX(-1.95, 0.95, 0, 0.42, 0.24, 12, TIRE, 'rubber');
  wheels(k, [-1.1, 1.2], 0.42, W, 0.12);
}

function semi(k: Kit, color: Col, trailer: boolean, accent?: Col) {
  const W = 2.5;
  k.box(-1.4, 0.65, 0, 7.4, 0.32, 1.0, 0x262628, 'metal');
  k.box(2.35, 1.1, 0, 2.4, 2.4, W, color, 'gloss');
  k.box(0.75, 1.25, 0, 0.8, 2.1, W - 0.1, color, 'gloss');
  k.box(2.35, 3.5, 0, 2.3, 0.1, W - 0.1, accent ?? color, 'gloss');
  k.box(3.56, 2.35, 0, 0.04, 0.95, W - 0.2, GLASS, 'glass');
  k.box(3.56, 2.33, 0, 0.06, 1.0, 0.08, color, 'gloss');
  for (const s of [-1, 1]) {
    k.box(2.8, 2.3, s * (W / 2 + 0.01), 1.2, 0.95, 0.02, GLASS, 'glass');
    k.box(3.58, 3.35, s * 0.6, 0.1, 0.08, 0.5, 0xffb52e, 'light');
    k.box(3.0, 2.2, s * (W / 2 + 0.25), 0.06, 0.6, 0.18, CHROME, 'metal');
    k.cylX(0.4, 0.98, s * 1.1, 0.34, 1.6, 12, CHROME, 'metal');
    k.cyl(1.25, 1.2, s * 1.05, 0.1, 0.1, 3.6, 8, CHROME, 'metal');
    k.box(-3.3, 0.5, s * 1.05, 0.04, 0.6, 0.5, 0x1a1a1a);
  }
  k.box(3.58, 1.3, 0, 0.06, 0.9, 1.3, CHROME, 'metal');
  for (let i = 0; i < 6; i++) k.box(3.62, 1.36 + i * 0.13, 0, 0.02, 0.04, 1.2, 0x2a2a2a);
  k.box(3.65, 0.75, 0, 0.2, 0.3, W + 0.05, CHROME, 'metal');
  for (const s of [-1, 1]) k.box(3.6, 1.45, s * 0.95, 0.06, 0.32, 0.4, LAMP, 'gloss');
  k.box(3.4, 3.6, 0, 0.6, 0.06, W - 0.2, 0x2a2a2a);
  k.box(-2.4, 1.0, 0, 1.4, 0.12, 1.4, 0x1d1d1d, 'metal');
  const axles = [2.6, -1.6, -2.9];
  axles.forEach((x, i) => {
    for (const s of [-1, 1]) wheel(k, x, s * (W / 2 - 0.2), 0.52, 0.3, s, i > 0);
  });
  if (trailer) {
    k.box(-8.3, 1.35, 0, 13.2, 2.75, W, 0xeeeeea, 'rollup');
    k.box(-8.3, 1.25, 0, 13.2, 0.12, W + 0.04, 0x8a8e92, 'metal');
    for (const s of [-1, 1]) k.box(-4.0, 0.3, s * 0.8, 0.12, 1.0, 0.12, 0x5a5d60, 'metal');
    for (const x of [-12.6, -13.9]) for (const s of [-1, 1]) wheel(k, x, s * (W / 2 - 0.2), 0.52, 0.3, s, true);
    k.box(-14.9, 1.4, 0, 0.05, 2.6, 0.04, 0x8a8e92, 'metal');
    for (const s of [-1, 1]) k.box(-14.93, 0.9, s * 0.9, 0.05, 0.12, 0.3, TAIL, 'gloss');
  }
}

function sheriffCar(k: Kit, signs: SignBook, suv: boolean) {
  const body = 0x3a2a1f;
  const white = 0xf2f1ec;
  if (suv) pickupLike(k, body, 'suv', white);
  else sedanLike(k, body, false, white);
  const W = suv ? 2.0 : 1.95;
  const y0 = suv ? 0.72 : 0.5;
  const x0 = suv ? -1.05 : -0.95;
  const x1 = suv ? 1.1 : 1.0;
  for (const s of [-1, 1]) k.box((x0 + x1) / 2, y0, s * (W / 2 + 0.007), x1 - x0, suv ? 0.42 : 0.48, 0.014, white, 'gloss', { cast: false });
  const tex = signs.get('sheriffDoor');
  k.sign(0.12, y0 + 0.24, W / 2 + 0.02, 1.25, 0.62, tex, { thick: 0.004 });
  k.sign(0.12, y0 + 0.24, -W / 2 - 0.02, 1.25, 0.62, tex, { thick: 0.004, ry: Math.PI });
  for (const s of [-1, 1]) k.sign(-1.95, y0 + 0.25, s * (W / 2 + 0.02), 0.42, 0.21, signs.get('n911'), { thick: 0.004, ry: s > 0 ? 0 : Math.PI });
  const ry = suv ? 1.82 : 1.44;
  const rx = suv ? 0.0 : -0.35;
  k.box(rx, ry, 0, 0.32, 0.06, 1.35, 0x2a2a2a, 'metal');
  k.box(rx, ry + 0.06, -0.38, 0.28, 0.14, 0.58, 0xff2b2b, 'light');
  k.box(rx, ry + 0.06, 0.38, 0.28, 0.14, 0.58, 0x2b6bff, 'light');
  k.box(suv ? 2.85 : 2.75, suv ? 0.5 : 0.42, 0, 0.1, 0.55, 1.2, 0x1a1a1a, 'metal');
  k.box(0.6, 1.1, (W / 2 + 0.12) * 1, 0.1, 0.18, 0.14, 0x1a1a1a);
}

/** Places a vehicle; local +X is the front. */
export function vehicle(k: Kit, signs: SignBook, type: VehicleType, x: number, z: number, ry: number, color: Col, o: VehicleOpts = {}) {
  k.at(x, z, ry, () => {
    switch (type) {
      case 'sedan':
        sedanLike(k, color, false, o.accent);
        break;
      case 'wagon':
        sedanLike(k, color, true, o.accent);
        if (o.woody) for (const s of [-1, 1]) k.box(-0.5, 0.48, s * 0.982, 3.6, 0.4, 0.012, 0x7a5232, 'planks', { cast: false });
        break;
      case 'coupe':
        coupe(k, color, !!o.stripes);
        break;
      case 'pickup':
        pickupLike(k, color, 'pickup', o.accent);
        break;
      case 'suv':
        pickupLike(k, color, 'suv', o.accent ?? 0xf2f1ec);
        break;
      case 'tow':
        pickupLike(k, color, 'tow', o.accent);
        break;
      case 'van':
        van(k, color, o.accent);
        break;
      case 'jeep':
        jeep(k, color);
        break;
      case 'semi':
        semi(k, color, !!o.trailer, o.accent);
        break;
      case 'sheriff':
        sheriffCar(k, signs, false);
        break;
      case 'sheriffSuv':
        sheriffCar(k, signs, true);
        break;
    }
  });
}

export const VEHICLE_LENGTH: Record<VehicleType, number> = {
  sedan: 5.3,
  wagon: 5.3,
  coupe: 4.95,
  pickup: 5.5,
  van: 5.1,
  suv: 5.5,
  sheriff: 5.4,
  sheriffSuv: 5.6,
  semi: 7.5,
  tow: 6.4,
  jeep: 3.9,
};

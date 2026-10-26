import * as THREE from 'three';
import type { BuildingDef } from './catalog';
import { type Ctx, doorAt, chimney } from './common';
import { colonial, ranch, aframeCabin } from './homes';
import { Kit, Occupancy, boxGeo } from '../core/kit';
import type { Col } from '../core/kit';
import { Rng } from '../core/rng';
import { P } from '../palette';

/* ───────────────────────────── infrastructure ───────────────────────────── */

interface G {
  c: Ctx;
  k: Kit;
  r: Rng;
  /** Vehicle collision box in the drawing frame (mirror-aware). */
  solid: (x: number, z: number, w: number, d: number) => void;
}

interface Spec {
  id: string;
  name: string;
  tags: string[];
  /** Footprint extents in the drawing frame (x right, z front). */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Main front wall z in the drawing frame. */
  zf: number;
  /** Driveway x in the drawing frame; houses with a drive are never mirrored. */
  drive?: number;
  draw: (g: G) => void;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function flipWinding(g: THREE.BufferGeometry) {
  for (const name of ['position', 'normal', 'uv', 'color']) {
    const a = g.attributes[name] as THREE.BufferAttribute | undefined;
    if (!a) continue;
    const n = a.itemSize;
    const arr = a.array as Float32Array;
    for (let t = 0; t + 2 < a.count; t += 3)
      for (let j = 0; j < n; j++) {
        const i1 = (t + 1) * n + j;
        const i2 = (t + 2) * n + j;
        const tmp = arr[i1];
        arr[i1] = arr[i2];
        arr[i2] = tmp;
      }
  }
}

/** Draws with every part mirrored about local x = 0 of the current frame (winding fixed so faces stay outward). */
function mirrored(k: Kit, fn: () => void) {
  const host = k as unknown as { add: Kit['add'] };
  const M = new THREE.Matrix4().makeScale(-1, 1, 1);
  const baseInv = k.matrix.clone().invert();
  host.add = function (this: Kit, geo, color, mat, local, cast) {
    // final = base * M * inner * local, where inner = base^-1 * current
    const inner = new THREE.Matrix4().multiplyMatrices(baseInv, this.matrix);
    const X = inner.clone().invert().multiply(M).multiply(inner);
    if (local) X.multiply(local);
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    g.applyMatrix4(X);
    flipWinding(g);
    Kit.prototype.add.call(this, g, color, mat, undefined, cast);
  };
  try {
    fn();
  } finally {
    delete (host as { add?: Kit['add'] }).add;
  }
}

function mk(s: Spec): BuildingDef {
  const w = r2(s.x1 - s.x0);
  const d = r2(s.z1 - s.z0);
  const cx = (s.x0 + s.x1) / 2;
  const cz = (s.z0 + s.z1) / 2;
  return {
    id: s.id,
    name: s.name,
    w,
    d,
    front: r2(s.zf - cz),
    drive: s.drive === undefined ? undefined : r2(s.drive - cx),
    tags: s.tags,
    build(c, x, z, ry, seed) {
      const k = c.kit;
      const r = new Rng(seed * 2654435761 + 12345);
      const flip = s.drive === undefined && r.chance(0.5);
      c.occ.add(x, z, w, d, ry, 1, false);
      const g: G = { c, k, r, solid: (sx, sz, sw, sd) => k.solid(flip ? -sx : sx, sz, sw, sd) };
      k.at(x, z, ry, () =>
        k.at(flip ? cx : -cx, -cz, 0, () => {
          if (flip) mirrored(k, () => s.draw(g));
          else s.draw(g);
        }),
      );
    },
  };
}

/* ───────────────────────────── palettes ───────────────────────────── */

const WALLS = [0xe8e6df, 0xd9cfa7, 0x9fb3c2, 0xa7b08a, 0xc9a07a, 0xe4dccb, 0x8d9aa3, 0xb9a98b, 0xd8c690, 0x93a8a0, 0xc9b79c, 0xb8c4cc];
const WHITES = [0xf2efe8, 0xe9e0c8, 0xe7e4dc, 0xf4f0e4];
const ROOFS = [0x4a4c52, 0x3b3d42, 0x5a4a40, 0x40483f, 0x4d3a33, 0x56585c, 0x2f3340];
const DOORS = [0x3d2f28, 0x7a2c25, 0x2b4a3a, 0x24304f, 0x1e1e20, 0x6b3a22, 0xa23b32, 0x3d5a73];
const SHUT = [0x2f4a3a, 0x24304f, 0x3b4048, 0x6b2a24, 0x1e1e20];
const STONE = 0x9b9893;
const GREENS = [0x3f5e30, 0x4f7a38, 0x2f4c2a, 0x5a8a3a];

/* ───────────────────────────── geometry helpers ───────────────────────────── */

interface RoofO {
  col: Col;
  mat?: string;
  trim?: Col;
  fill?: Col;
  fillMat?: string;
  ridge?: Col;
  eave?: number;
  gable?: number;
  thick?: number;
}

/** Gable roof, ridge along X, over a w×d wall rectangle centred on (x, z) whose top is at y. */
function gX(k: Kit, x: number, y: number, z: number, w: number, d: number, rise: number, o: RoofO) {
  k.roof(x, y, z, w, [[d / 2, 0], [0, rise], [-d / 2, 0]], o.col, o.mat ?? 'shingle', {
    trim: o.trim, fill: o.fill, fillMat: o.fillMat, ridge: o.ridge, eaveOH: o.eave, gableOH: o.gable, thick: o.thick,
  });
}

/** Gable roof, ridge along Z (front gable). */
function gZ(k: Kit, x: number, y: number, z: number, w: number, d: number, rise: number, o: RoofO) {
  k.at(x, z, Math.PI / 2, () =>
    k.roof(0, y, 0, d, [[w / 2, 0], [0, rise], [-w / 2, 0]], o.col, o.mat ?? 'shingle', {
      trim: o.trim, fill: o.fill, fillMat: o.fillMat, ridge: o.ridge, eaveOH: o.eave, gableOH: o.gable, thick: o.thick,
    }),
  );
}

/** Foundation, walls, corner boards and a frieze band for a rectangular block. */
function block(k: Kit, x: number, z: number, w: number, d: number, y0: number, H: number, col: Col, mat: string, trim: Col, found: Col = STONE, foundMat = 'concrete') {
  if (y0 > 0) k.box(x, 0, z, w + 0.12, y0, d + 0.12, found, foundMat);
  k.box(x, y0, z, w, H, d, col, mat);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(x + (sx * w) / 2, y0, z + (sz * d) / 2, 0.16, H, 0.16, trim);
  k.box(x, y0 + H - 0.12, z, w + 0.1, 0.24, d + 0.1, trim);
}

/** Cylinder whose UVs are in metres so wall textures keep their scale. */
function cylTex(k: Kit, x: number, y: number, z: number, rT: number, rB: number, h: number, seg: number, col: Col, mat: string) {
  const g = new THREE.CylinderGeometry(rT, rB, h, seg);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const circ = 2 * Math.PI * ((rT + rB) / 2);
  // the torso's (seg + 1) * 2 vertices come first in CylinderGeometry
  for (let i = 0; i < (seg + 1) * 2; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h + y);
  k.add(g, col, mat, k.local(x, y + h / 2, z));
}

/** Box without its bottom/back faces (wall-mounted trim, balusters): ~1/3 fewer triangles. Face order: +x -x +y -y +z -z. */
function fbox(k: Kit, x: number, y: number, z: number, w: number, h: number, d: number, col: Col, mat = 'paint', drop: number[] = [3, 5]) {
  const src = boxGeo(w, h, d, y).toNonIndexed();
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = src.attributes[name] as THREE.BufferAttribute;
    const n = a.itemSize;
    const out = new Float32Array((6 - drop.length) * 6 * n);
    let o = 0;
    for (let f = 0; f < 6; f++) {
      if (drop.includes(f)) continue;
      for (let i = 0; i < 6 * n; i++) out[o++] = (a.array as Float32Array)[f * 6 * n + i];
    }
    g.setAttribute(name, new THREE.BufferAttribute(out, n));
  }
  src.dispose();
  k.add(g, col, mat, k.local(x, y + h / 2, z));
}

interface WinO {
  mx?: number;
  my?: number;
  shut?: Col;
  glass?: Col;
  ac?: boolean;
  noSill?: boolean;
}

/** Lightweight framed window on a +Z wall whose surface is at zf; (x, y) is the bottom centre of the glass. */
function win(k: Kit, x: number, y: number, zf: number, w: number, h: number, trim: Col, o: WinO = {}) {
  const mx = o.mx ?? 1;
  const my = o.my ?? 2;
  fbox(k, x, y - 0.1, zf + 0.01, w + 0.2, h + 0.2, 0.06, trim);
  fbox(k, x, y, zf + 0.025, w, h, 0.05, o.glass ?? P.glass, 'glass');
  for (let i = 1; i < mx; i++) fbox(k, x - w / 2 + (w * i) / mx, y, zf + 0.055, 0.045, h, 0.02, trim, 'paint', [1, 3, 5]);
  for (let i = 1; i < my; i++) fbox(k, x, y + (h * i) / my - 0.022, zf + 0.055, w, 0.045, 0.02, trim, 'paint', [1, 3, 5]);
  if (!o.noSill) fbox(k, x, y - 0.17, zf + 0.07, w + 0.3, 0.07, 0.17, trim);
  fbox(k, x, y + h + 0.1, zf + 0.05, w + 0.28, 0.09, 0.12, trim);
  if (o.shut !== undefined) for (const s of [-1, 1]) fbox(k, x + s * (w / 2 + 0.32), y - 0.04, zf + 0.04, 0.42, h + 0.08, 0.05, o.shut);
  if (o.ac) {
    k.box(x, y + 0.02, zf + 0.3, Math.min(0.75, w * 0.7), 0.42, 0.5, 0xd9d6cc);
    k.box(x, y + 0.08, zf + 0.56, Math.min(0.6, w * 0.6), 0.28, 0.02, 0x8f9194);
  }
}

function rail(k: Kit, x0: number, x1: number, y: number, z: number, col: Col, step = 0.22, h = 0.9) {
  const len = x1 - x0;
  k.box((x0 + x1) / 2, y + h - 0.07, z, len, 0.07, 0.1, col);
  k.box((x0 + x1) / 2, y + 0.1, z, len, 0.07, 0.08, col);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) fbox(k, x0 + (len * i) / n, y + 0.17, z, 0.045, h - 0.24, 0.045, col, 'paint', [2, 3, 5]);
}

/** Rail running along Z at world x. */
function railZ(k: Kit, x: number, z0: number, z1: number, y: number, col: Col, step = 0.22, h = 0.9) {
  const len = Math.abs(z1 - z0);
  k.at(x, (z0 + z1) / 2, Math.PI / 2, () => rail(k, -len / 2, len / 2, y, 0, col, step, h));
}

function steps(k: Kit, x: number, zEdge: number, w: number, n: number, h: number, col: Col = P.concrete, mat = 'concrete') {
  for (let i = 0; i < n; i++) k.box(x, 0, zEdge + 0.15 + i * 0.3, w, (h * (n - i)) / (n + 0.5), 0.3, col, mat);
}

function turnedPost(k: Kit, x: number, y: number, z: number, h: number, col: Col) {
  fbox(k, x, y, z, 0.2, 0.2, 0.2, col, 'paint', [3]);
  k.cyl(x, y + 0.2, z, 0.065, 0.075, h - 0.5, 6, col, 'paint', { cast: true });
  k.cyl(x, y + h * 0.5 - 0.1, z, 0.1, 0.1, 0.14, 6, col);
  fbox(k, x, y + h - 0.3, z, 0.22, 0.3, 0.22, col, 'paint', [3]);
}

function squarePost(k: Kit, x: number, y: number, z: number, h: number, col: Col, s = 0.16) {
  k.box(x, y, z, s, h, s, col);
}

function shrub(k: Kit, x: number, z: number, rad: number, col: Col, detail = 1) {
  k.ico(x, rad * 0.7, z, rad, detail, col, 'paint', 1, 0.8, 1);
}

function foundationShrubs(k: Kit, r: Rng, x0: number, x1: number, z: number, skip: [number, number][] = [], n = 4) {
  const col = r.pick(GREENS);
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + r.range(0.1, 0.9))) / n;
    if (skip.some(([a, b]) => x > a && x < b)) continue;
    shrub(k, x, z, r.range(0.35, 0.6), r.chance(0.7) ? col : r.pick(GREENS), r.chance(0.8) ? 0 : 1);
  }
}

/** Adirondack-style porch chair facing +Z (rotate with ry). */
function chair(k: Kit, x: number, y: number, z: number, ry: number, col: Col) {
  k.at(x, z, ry, () => {
    k.box(0, y + 0.36, 0, 0.55, 0.05, 0.5, col);
    k.box(0, y + 0.4, -0.27, 0.55, 0.62, 0.05, col, 'paint', { rx: -0.3 });
    for (const s of [-1, 1]) {
      k.box(s * 0.27, y + 0.45, 0.02, 0.05, 0.05, 0.5, col);
      k.box(s * 0.25, y, 0.2, 0.05, 0.38, 0.05, col);
      k.box(s * 0.25, y, -0.2, 0.05, 0.38, 0.05, col);
    }
  });
}

function hangingPlant(k: Kit, x: number, yTop: number, z: number, r: Rng) {
  k.box(x, yTop - 0.7, z, 0.02, 0.7, 0.02, 0x333333);
  k.cyl(x, yTop - 0.95, z, 0.2, 0.12, 0.25, 7, 0x8a4a2a);
  k.ico(x, yTop - 0.92, z, 0.28, 0, r.pick(GREENS), 'paint', 1, 0.8, 1);
}

/** 90s 18-inch minidish on a short mast, facing +Z (pitched up). */
function dish(k: Kit, x: number, y: number, z: number, ry = 0) {
  k.at(x, z, ry, () => {
    k.cyl(0, y, 0, 0.025, 0.025, 0.55, 5, 0x8a8e92, 'metal');
    k.cyl(0, y + 0.55, 0.05, 0.3, 0.05, 0.1, 8, 0xdcdad4, 'metal', { rx: 0.95 });
    k.box(0, y + 0.55, 0.3, 0.04, 0.04, 0.3, 0x6c7075, 'metal', { rx: 0.2 });
  });
}

function bike(k: Kit, x: number, z: number, ry: number, col: Col) {
  k.at(x, z, ry, () => {
    for (const s of [-1, 1]) k.torus(0, 0.26, s * 0.4, 0.26, 0.025, 3, 10, 0x222222, 'rubber', { ry: Math.PI / 2 });
    k.beam({ x: 0, y: 0.26, z: -0.4 }, { x: 0, y: 0.5, z: -0.05 }, 0.03, 0.03, col);
    k.beam({ x: 0, y: 0.5, z: -0.05 }, { x: 0, y: 0.26, z: 0.4 }, 0.03, 0.03, col);
    k.beam({ x: 0, y: 0.5, z: -0.05 }, { x: 0, y: 0.56, z: 0.32 }, 0.03, 0.03, col);
    k.box(0, 0.54, 0.34, 0.4, 0.03, 0.03, 0x222222);
  });
}

/** Basketball hoop on a pole, backboard facing +Z. */
function hoop(k: Kit, x: number, z: number) {
  k.cyl(x, 0, z, 0.06, 0.07, 3.3, 6, 0x4a4e52, 'metal');
  k.box(x, 3.0, z + 0.45, 0.06, 0.06, 0.9, 0x4a4e52, 'metal');
  k.box(x, 2.9, z + 0.9, 1.1, 0.75, 0.05, 0xe6e8ea);
  k.box(x, 3.0, z + 0.91, 0.5, 0.35, 0.03, 0xc43b32, 'decal');
  k.torus(x, 3.0, z + 1.2, 0.23, 0.018, 3, 9, 0xd2602a, 'paint', { rx: Math.PI / 2 });
}

function lights(k: Kit, ax: number, ay: number, az: number, bx: number, by: number, bz: number, n = 7, sag = 0.3) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = Math.sin(t * Math.PI) * sag;
    const p = new THREE.Vector3(ax + (bx - ax) * t, ay + (by - ay) * t - s, az + (bz - az) * t);
    pts.push(p);
    if (i > 0 && i < n) k.sphere(p.x, p.y - 0.06, p.z, 0.05, 0xfff1c9, 'light', 5, 4);
  }
  k.tube(pts, 0.012, 0x222222, 'wire', 8, false);
}

function flagBracket(k: Kit, c: Ctx, x: number, y: number, z: number) {
  k.beam({ x, y, z }, { x: x + 0.7, y: y + 0.55, z: z + 0.35 }, 0.04, 0.04, 0xd8d8d8, 'metal');
  k.sign(x + 0.55, y + 0.15, z + 0.38, 0.9, 0.5, c.signs.get('flag'), { ry: Math.PI / 2 - 0.4, thick: 0.01, twoSided: true });
}

function hoseCoil(k: Kit, x: number, y: number, z: number) {
  k.box(x, y, z, 0.1, 0.1, 0.06, 0x6c7075, 'metal');
  k.cylZ(x, y + 0.1, z + 0.18, 0.2, 0.18, 8, 0x2f6b3a);
}

function woodpile(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - (row === 2 ? 1 : 0); i++) k.cylZ(-0.45 + i * 0.3 + (row === 2 ? 0.15 : 0), 0.12 + row * 0.2, 0, 0.1, 0.9, 5, row % 2 ? 0x8a6a46 : 0x7b5a3c, 'paint');
  });
}

function trashCans(k: Kit, x: number, z: number, n = 2) {
  for (let i = 0; i < n; i++) {
    k.cyl(x + i * 0.65, 0, z, 0.27, 0.23, 0.9, 7, i ? 0x3f6b46 : 0x4a4e52);
    k.cyl(x + i * 0.65, 0.9, z, 0.29, 0.29, 0.05, 7, i ? 0x2f5336 : 0x3a3d40);
  }
}

function fenceSeg(k: Kit, ax: number, az: number, bx: number, bz: number, col: Col = 0xf4f2ec, h = 1.0) {
  const len = Math.hypot(bx - ax, bz - az);
  const ry = Math.atan2(bx - ax, bz - az) - Math.PI / 2;
  k.at((ax + bx) / 2, (az + bz) / 2, ry, () => {
    for (const y of [0.25, h - 0.3]) k.box(0, y, -0.03, len, 0.07, 0.05, col);
    const n = Math.floor(len / 0.2);
    for (let i = 0; i <= n; i++) k.box(-len / 2 + (len * i) / n, 0.02, 0.02, 0.09, h - 0.05, 0.025, col);
    const posts = Math.max(1, Math.round(len / 2.2));
    for (let i = 0; i <= posts; i++) k.box(-len / 2 + (len * i) / posts, 0, -0.04, 0.12, h + 0.08, 0.12, col);
  });
}

/** Side-wall frame: local +Z faces ±X; `u(zw)` converts a drawing-frame z to the local x. */
function side(k: Kit, s: number, xWall: number, fn: (u: (zw: number) => number) => void) {
  k.at(s * xWall, 0, (s * Math.PI) / 2, () => fn((zw) => -s * zw));
}

/** Back-wall frame: local +Z faces -Z; local x = -drawing x. */
function back(k: Kit, zWall: number, fn: (u: (xw: number) => number) => void) {
  k.at(0, zWall, Math.PI, () => fn((xw) => -xw));
}

/* ───────────────────────────── 1. Queen Anne Victorian ───────────────────────────── */

const QA_SCHEMES = [
  { wall: 0x7b9a8a, up: 0xd9c9a3, trim: 0xf0e8d4, acc: 0x8c3b3a },
  { wall: 0x7d9bb5, up: 0xe3d7b8, trim: 0xf4efe2, acc: 0xa8523a },
  { wall: 0xc7a35a, up: 0x7a4b3a, trim: 0xf1e7cf, acc: 0x3d5a4a },
  { wall: 0xb78b8e, up: 0xe9dfc9, trim: 0xf7f2e8, acc: 0x5c6e58 },
  { wall: 0x8a7fa0, up: 0xd8cfb8, trim: 0xf4efe2, acc: 0x7a3b4a },
];

const victorianQueenAnne = mk({
  id: 'victorianQueenAnne',
  name: 'Queen Anne Victorian',
  tags: ['victorian', 'historic'],
  x0: -5.7,
  x1: 7.0,
  z0: -4.8,
  z1: 7.9,
  zf: 4.1,
  draw: ({ c, k, r, solid }) => {
    const p = r.pick(QA_SCHEMES);
    const roofC = r.pick([0x4a4c52, 0x3d3f45, 0x5a4a40, 0x40483f]);
    const F = 0.7;
    const H1 = 3.0;
    const top = F + H1 * 2;
    const bayX = -2.3;
    const tx = 3.6;
    const tz = 3.7;
    const trim = p.trim;
    const door = p.acc;
    const stoneC = 0x8b8782;
    solid(0, 0, 9, 8.2);
    solid(bayX, 4.4, 3.8, 1.8);

    // body: clapboard below, shingles above
    k.box(0, 0, 0, 9.2, F, 8.4, stoneC, 'stone');
    k.box(0, F, 0, 9, H1, 8.2, p.wall, 'siding');
    k.box(0, F + H1, 0, 9, H1, 8.2, p.up, 'siding');
    k.box(0, F + H1 - 0.1, 0, 9.14, 0.22, 8.34, trim);
    k.box(0, top - 0.25, 0, 9.14, 0.3, 8.34, trim);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(sx * 4.5, F, sz * 4.1, 0.16, H1 * 2, 0.16, trim);
    // front bay
    k.box(bayX, 0, 4.4, 3.92, F, 1.92, stoneC, 'stone');
    k.box(bayX, F, 4.4, 3.8, H1, 1.8, p.wall, 'siding');
    k.box(bayX, F + H1, 4.4, 3.8, H1, 1.8, p.up, 'siding');
    k.box(bayX, F + H1 - 0.1, 4.4, 3.94, 0.22, 1.94, trim);
    k.box(bayX, top - 0.25, 4.4, 3.94, 0.3, 1.94, trim);
    for (const sx of [-1, 1]) k.box(bayX + sx * 1.9, F, 5.3, 0.16, H1 * 2, 0.16, trim);
    // turret
    k.cyl(tx, 0, tz, 1.62, 1.62, F, 8, stoneC, 'stone');
    cylTex(k, tx, F, tz, 1.5, 1.5, H1, 8, p.wall, 'siding');
    cylTex(k, tx, F + H1, tz, 1.5, 1.5, H1, 8, p.up, 'siding');
    k.cyl(tx, F + H1 - 0.1, tz, 1.58, 1.58, 0.22, 8, trim);
    k.cyl(tx, top - 0.3, tz, 1.66, 1.66, 0.34, 8, trim);
    k.cone(tx, top, tz, 2.0, 4.6, 8, roofC, 'paint');
    k.cone(tx, top + 4.55, tz, 0.07, 0.8, 5, p.acc, 'metal');
    k.sphere(tx, top + 4.55, tz, 0.14, 0xd8b44a, 'metal', 6, 4);
    for (const phi of [-Math.PI / 8, Math.PI / 8, (3 * Math.PI) / 8, (5 * Math.PI) / 8]) {
      k.at(tx + 1.386 * Math.sin(phi), tz + 1.386 * Math.cos(phi), phi, () => {
        win(k, 0, F + 0.85, 0, 0.5, 1.5, trim, { mx: 1, my: 3 });
        win(k, 0, F + H1 + 0.7, 0, 0.5, 1.5, trim, { mx: 1, my: 3 });
      });
    }
    // roofs
    k.hipRoof(0, top, 0, 9, 8.2, 3.6, roofC, 'shingle', 0.6);
    gZ(k, bayX, top, 2.45, 3.8, 5.7, 2.9, { col: roofC, trim, fill: p.up, fillMat: 'boards', eave: 0.3, gable: 0.4, ridge: roofC });
    k.cylZ(bayX, top + 1.1, 5.35, 0.36, 0.08, 8, trim);
    k.cylZ(bayX, top + 1.1, 5.4, 0.28, 0.09, 8, P.glass, 'glass');
    for (let i = 0; i < 3; i++) k.box(bayX + (i - 1) * 0.55, top + 0.18, 5.34, 0.3, 0.3, 0.05, p.acc, 'paint', { rz: Math.PI / 4 });
    chimney(k, -3.0, 8.0, -2.4, 3.2, 0xffffff, 'brickRed');
    // windows
    const w = { mx: 2, my: 3 };
    for (const wx of [-3.35, -1.25]) {
      win(k, wx, F + 0.55, 5.3, 1.1, 1.8, trim, w);
      win(k, wx, F + H1 + 0.55, 5.3, 1.1, 1.7, trim, w);
    }
    side(k, -1, 4.2, (u) => {
      win(k, u(4.4), F + 0.55, 0, 0.9, 1.6, trim, w);
      win(k, u(4.4), F + H1 + 0.55, 0, 0.9, 1.6, trim, w);
    });
    doorAt(k, 0.5, F, 4.1, 1.0, 2.25, door, { frame: trim, glass: true });
    win(k, 0.5, F + H1 + 0.55, 4.1, 1.1, 1.7, trim, w);
    side(k, -1, 4.5, (u) => {
      for (const zz of [1.0, -2.2]) {
        win(k, u(zz), F + 0.55, 0, 1.0, 1.7, trim, w);
        win(k, u(zz), F + H1 + 0.55, 0, 1.0, 1.7, trim, w);
      }
    });
    side(k, 1, 4.5, (u) => {
      for (const zz of [-0.4, -3.0]) {
        win(k, u(zz), F + 0.55, 0, 1.0, 1.7, trim, w);
        win(k, u(zz), F + H1 + 0.55, 0, 1.0, 1.7, trim, w);
      }
    });
    back(k, -4.1, (u) => {
      for (const xx of [-2.8, 0, 2.8]) {
        win(k, u(xx), F + 0.7, 0, 1.0, 1.5, trim, w);
        win(k, u(xx), F + H1 + 0.55, 0, 1.0, 1.7, trim, w);
      }
    });
    // wraparound porch
    const deck = r.pick([0x8f8a82, 0xa89a86, 0x7b8a86]);
    k.box(0.65, 0, 5.45, 12.1, F, 2.7, deck, 'planks');
    k.box(5.6, 0, 0.45, 2.2, F, 7.3, deck, 'planks');
    k.box(0.65, 0.04, 6.82, 12.14, F - 0.1, 0.06, trim);
    k.box(6.72, 0.04, 0.45, 0.06, F - 0.1, 7.34, trim);
    k.roof(0.65, 3.05, 0, 12.0, [[7.0, 0], [4.0, 0.55]], roofC, 'shingle', { thick: 0.14, eaveOH: 0.25, gableOH: 0.3, trim });
    k.at(5.7, 0.45, Math.PI / 2, () => k.roof(0, 3.05, 0, 7.6, [[1.2, 0], [-1.2, 0.55]], roofC, 'shingle', { thick: 0.14, eaveOH: 0.25, gableOH: 0.3, trim }));
    for (const px of [-5.2, -3.1, -1.0, 2.0, 4.2, 6.5]) turnedPost(k, px, F, 6.6, 2.3, trim);
    for (const pz of [4.2, 1.8, -0.6, -3.0]) turnedPost(k, 6.5, F, pz, 2.3, trim);
    rail(k, -5.1, -1.1, F, 6.6, trim, 0.24);
    rail(k, 2.1, 6.4, F, 6.6, trim, 0.24);
    railZ(k, 6.5, 6.5, -2.9, F, trim, 0.26);
    for (const px of [-5.2, -3.1, -1.0, 2.0, 4.2, 6.5]) {
      k.box(px - 0.25, F + 2.05, 6.6, 0.3, 0.12, 0.08, trim, 'paint', { rz: -0.7 });
      k.box(px + 0.25, F + 2.05, 6.6, 0.3, 0.12, 0.08, trim, 'paint', { rz: 0.7 });
    }
    steps(k, 0.5, 6.8, 1.9, 3, F, deck, 'planks');
    // 90s life
    if (r.chance(0.7)) chair(k, -3.8, F, 6.0, 0.15, r.pick([0xf2efe8, 0x2f4a3a, 0x7a2c25]));
    if (r.chance(0.6)) chair(k, -2.9, F, 6.1, -0.2, r.pick([0xf2efe8, 0x2f4a3a]));
    if (r.chance(0.7)) hangingPlant(k, 2.0, F + 2.3, 6.4, r);
    if (r.chance(0.5)) hangingPlant(k, -3.1, F + 2.3, 6.4, r);
    if (r.chance(0.55)) dish(k, 3.4, top + 1.6, -2.4, 0.3);
    if (r.chance(0.5)) flagBracket(k, c, -5.2, F + 1.9, 6.7);
    if (r.chance(0.4)) lights(k, -5.2, F + 2.0, 6.6, -1.0, F + 2.0, 6.6, 7);
    if (r.chance(0.4)) bike(k, 5.5, 6.0, 1.2, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    foundationShrubs(k, r, -5.0, -0.5, 7.2, [], 4);
    shrub(k, 3.4, 7.3, 0.55, r.pick(GREENS));
  },
});

/* ───────────────────────────── 2. Miner's cottage ───────────────────────────── */

const minersCottage = mk({
  id: 'minersCottage',
  name: "Miner's Cottage",
  tags: ['historic', 'victorian'],
  x0: -3.5,
  x1: 3.5,
  z0: -6.4,
  z1: 6.7,
  zf: 4.0,
  draw: ({ k, r, solid }) => {
    const wall = r.pick([0xe8e6df, 0xd9cfa7, 0x9fb3c2, 0xa7b08a, 0xc9a07a, 0xb8c4cc, 0xd8c690]);
    const trim = r.pick(WHITES);
    const roofC = r.pick([0x5a4a40, 0x4a4c52, 0x6b3a2a, 0x40483f]);
    const mat = r.chance(0.65) ? 'siding' : 'boards';
    const F = 0.5;
    const H = 2.7;
    solid(0, 0, 6, 8);
    solid(0, -5.1, 4.2, 2.2);

    block(k, 0, 0, 6, 8, F, H, wall, mat, trim, 0x8f8c87);
    // rear kitchen addition
    k.box(0, 0, -5.1, 4.3, F, 2.3, 0x8f8c87, 'concrete');
    k.box(0, F, -5.1, 4.2, 2.3, 2.2, wall, mat);
    k.roof(0, F + 2.3, -5.1, 4.2, [[1.3, 0.0], [-1.3, 0.55]], roofC, 'roofMetal', { trim, thick: 0.12, eaveOH: 0.3, gableOH: 0.3 });
    // steep front gable
    gZ(k, 0, F + H, 0, 6, 8, 3.3, { col: roofC, mat: r.chance(0.5) ? 'roofMetal' : 'shingle', trim, fill: wall, fillMat: mat, eave: 0.4, gable: 0.5, ridge: roofC });
    k.cylZ(0, F + H + 1.0, 4.03, 0.4, 0.04, 8, trim);
    k.cylZ(0, F + H + 1.0, 4.06, 0.3, 0.05, 8, P.glass, 'glass');
    // front: door + narrow tall windows
    const zf = 4.0;
    doorAt(k, 1.7, F, zf, 0.95, 2.1, r.pick(DOORS), { frame: trim, glass: r.chance(0.5) });
    win(k, -1.3, F + 0.55, zf, 0.8, 1.55, trim, { mx: 1, my: 2, shut: r.chance(0.4) ? r.pick(SHUT) : undefined });
    win(k, 0.15, F + 0.55, zf, 0.7, 1.55, trim, { mx: 1, my: 2 });
    for (const s of [-1, 1]) {
      side(k, s, 3, (u) => {
        win(k, u(1.6), F + 0.6, 0, 0.8, 1.5, trim, { mx: 1, my: 2 });
        win(k, u(-1.6), F + 0.6, 0, 0.8, 1.5, trim, { mx: 1, my: 2 });
      });
    }
    back(k, -6.2, (u) => win(k, u(-0.8), F + 0.65, 0, 0.8, 1.2, trim, { mx: 1, my: 2 }));
    side(k, 1, 2.1, (u) => doorAt(k, u(-5.0), F, 0, 0.9, 2.0, r.pick(DOORS), { frame: trim }));
    // shed-roofed front porch
    const deck = 0x8a7a66;
    k.box(0, 0, 4.9, 6.2, F, 1.8, deck, 'planks');
    k.roof(0, F + 2.5, 0, 6.4, [[6.1, -0.05], [3.9, 0.3]], roofC, 'roofMetal', { trim, thick: 0.12, eaveOH: 0.25, gableOH: 0.2 });
    for (const px of [-2.85, 0.6, 2.85]) squarePost(k, px, F, 5.7, 2.5, trim, 0.16);
    rail(k, -2.75, 0.5, F, 5.7, trim, 0.2, 0.85);
    steps(k, 1.7, 5.8, 1.7, 2, F, deck, 'planks');
    squarePost(k, -2.85, F, 5.7, 2.5, trim);
    k.box(1.7, F + 2.2, 5.7, 3.0, 0.14, 0.1, trim);
    chimney(k, -0.9, F + H + 1.5, -1.8, 2.4, 0xffffff, 'brickRed');
    // 90s life
    if (r.chance(0.6)) chair(k, -1.8, F, 5.0, 0.2, r.pick([0xf2efe8, 0x6b3a22, 0x2f4a3a]));
    if (r.chance(0.5)) hangingPlant(k, 0.6, F + 2.5, 5.6, r);
    if (r.chance(0.5)) woodpile(k, -3.2, -1.5, Math.PI / 2);
    if (r.chance(0.5)) dish(k, 2.2, F + H + 1.9, 0.2, 0.2);
    if (r.chance(0.4)) hoseCoil(k, -2.0, F + 0.6, zf + 0.05);
    if (r.chance(0.4)) lights(k, -2.85, F + 2.3, 5.8, 2.85, F + 2.3, 5.8, 8, 0.3);
    if (r.chance(0.4)) fenceSeg(k, -3.3, 6.5, -3.3, 2.0);
    foundationShrubs(k, r, -2.8, 2.8, 4.25, [[0.7, 2.7]], 3);
  },
});

/* ───────────────────────────── existing builders as defs ───────────────────────────── */

function quiet(c: Ctx): Ctx {
  return { ...c, occ: new Occupancy() };
}

/** Body-centre world position for a footprint whose centre is `dz` in front of the body centre. */
const bodyAt = (x: number, z: number, ry: number, dx: number, dz: number): [number, number] => [
  x - dx * Math.cos(ry) - dz * Math.sin(ry),
  z + dx * Math.sin(ry) - dz * Math.cos(ry),
];

const colonialDef: BuildingDef = {
  id: 'colonial',
  name: 'Colonial',
  w: 12.6,
  d: 12.1,
  front: 4.25 - 1.775,
  tags: ['postwar', 'suburban'],
  build(c, x, z, ry, seed) {
    const r = new Rng(seed * 2654435761 + 777);
    const [bx, bz] = bodyAt(x, z, ry, 0, 1.775);
    c.occ.add(x, z, 12.6, 12.1, ry, 1, false);
    colonial(quiet(c), bx, bz, ry, {
      color: r.pick([0xb07a4f, 0xe8e6df, 0x9fb3c2, 0xa7b08a, 0xd9cfa7, 0xc9a07a, 0x8d9aa3, 0xb24a3a]),
      roof: r.pick(ROOFS),
      shutters: r.chance(0.7) ? r.pick(SHUT) : undefined,
      porch: r.chance(0.5) ? 'full' : 'portico',
      chimney: r.chance(0.8) ? 'brick' : 'white',
      trim: r.pick(WHITES),
    });
    c.kit.at(x, z, ry, () => c.kit.solid(0, -1.775, 10.5, 8.5));
  },
};

const ranchPorchDef: BuildingDef = {
  id: 'ranchPorch',
  name: 'Ranch with Porch & Carport',
  w: 19.5,
  d: 12.7,
  front: 4.5 - 1.5,
  drive: 7.05,
  tags: ['postwar', 'suburban'],
  build(c, x, z, ry, seed) {
    const r = new Rng(seed * 2654435761 + 4242);
    const [bx, bz] = bodyAt(x, z, ry, 2.55, 1.5);
    c.occ.add(x, z, 19.5, 12.7, ry, 1, false);
    ranch(quiet(c), bx, bz, ry, {
      color: r.pick([0xe8e6df, 0xd9cfa7, 0x9fb3c2, 0xa7b08a, 0xc9a07a, 0xb8c4cc]),
      roof: r.pick([0x2b3448, 0x4a4c52, 0x40483f, 0x5a4a40]),
      shutters: r.pick(SHUT),
      trim: r.pick(WHITES),
      carport: true,
      flag: r.chance(0.5),
      lights: r.chance(0.5),
    });
    c.kit.at(x, z, ry, () => c.kit.solid(-2.55, -1.5, 14, 9));
  },
};

const aframeDef: BuildingDef = {
  id: 'aframe',
  name: 'A-Frame Cabin',
  w: 8.6,
  d: 13.8,
  front: 5 - 1.4,
  tags: ['lake', 'cabin', 'rural'],
  build(c, x, z, ry, seed) {
    const r = new Rng(seed * 2654435761 + 99);
    const [bx, bz] = bodyAt(x, z, ry, 0, 1.4);
    c.occ.add(x, z, 8.6, 13.8, ry, 1, false);
    aframeCabin(quiet(c), bx, bz, ry, r.pick([0x8b5e3c, 0x7a5236, 0x9a6b44, 0x6b4a32]));
    c.kit.at(x, z, ry, () => c.kit.solid(0, -1.4, 7.5, 10));
  },
};

/* ───────────────────────────── extra helpers (catalogue 2) ───────────────────────────── */

/** Polygon in the (z, y) plane extruded along X, centred on x (dormer cheeks, rounded roofs). */
function prismYZ(k: Kit, x: number, w: number, pts: [number, number][], col: Col, mat = 'paint') {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  k.at(x, 0, -Math.PI / 2, () => k.extrude(s, w, col, mat));
}

function garageDoor(k: Kit, x: number, zf: number, w: number, h: number, trim: Col, col: Col = 0xe9e8e4) {
  k.box(x, 0, zf + 0.02, w + 0.3, h + 0.14, 0.08, trim);
  k.box(x, 0, zf + 0.06, w, h, 0.06, col, 'rollup');
}

/** Exposed rafter tails under a ±Z eave (`dir` = +1 front, -1 back). */
function tails(k: Kit, x0: number, x1: number, zw: number, yw: number, dir: number, run: number, drop: number, col: Col, step = 0.8) {
  const n = Math.max(1, Math.round((x1 - x0) / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    k.beam({ x, y: yw, z: zw }, { x, y: yw - drop, z: zw + dir * run }, 0.09, 0.1, col);
  }
}

/** Square tapered column (4-sided, wider at the base). */
function taperCol(k: Kit, x: number, y: number, z: number, h: number, col: Col) {
  k.cyl(x, y, z, 0.11, 0.18, h, 4, col, 'paint', { ry: Math.PI / 4 });
  k.box(x, y + h, z, 0.3, 0.1, 0.3, col);
}

/** Round-top door with a stone surround and iron straps, facing +Z at zf. */
function archDoor(k: Kit, x: number, y: number, zf: number, w: number, h: number, col: Col) {
  const arch = (ww: number, hh: number) => {
    const s = new THREE.Shape();
    s.moveTo(-ww / 2, 0);
    s.lineTo(ww / 2, 0);
    s.lineTo(ww / 2, hh - ww / 2);
    s.absarc(0, hh - ww / 2, ww / 2, 0, Math.PI, false);
    s.lineTo(-ww / 2, 0);
    return s;
  };
  k.extrude(arch(w + 0.45, h + 0.22), 0.08, 0xb9b3a6, 'stone', x, y, zf + 0.04);
  k.extrude(arch(w, h), 0.07, col, 'paint', x, y, zf + 0.075);
  for (const hy of [0.55, 1.3]) k.box(x, y + hy, zf + 0.12, w * 0.92, 0.07, 0.02, 0x2a2a2c, 'metal');
  k.box(x + w * 0.3, y + 1.0, zf + 0.13, 0.07, 0.16, 0.05, 0x2a2a2c, 'metal');
}

/** Half-timbering on a front-facing gable triangle (half-width hw, rise R, base y0) at plane z. */
function timbers(k: Kit, x: number, y0: number, z: number, hw: number, R: number, col: Col) {
  const zz = z + 0.03;
  k.box(x, y0, zz, hw * 2, 0.2, 0.07, col);
  for (let i = -3; i <= 3; i++) {
    const xx = x + (hw * i) / 3.6;
    const hv = R * (1 - Math.abs(xx - x) / hw) - 0.2;
    if (hv > 0.3) k.box(xx, y0 + 0.2, zz, 0.11, hv, 0.07, col);
  }
  const yy = y0 + R * 0.42;
  k.box(x, yy, zz, hw * 1.16, 0.13, 0.07, col);
  for (const s of [-1, 1]) k.beam({ x: x + s * hw * 0.78, y: y0 + 0.2, z: zz }, { x: x + s * hw * 0.2, y: yy, z: zz }, 0.1, 0.07, col);
}

function brickPlanter(k: Kit, r: Rng, x: number, z: number, w: number, d = 0.7) {
  k.box(x, 0, z, w, 0.55, d, 0xffffff, 'brickRed');
  k.box(x, 0.55, z, w + 0.12, 0.07, d + 0.12, 0xcfcac2, 'concrete');
  k.box(x, 0.5, z, w - 0.3, 0.12, d - 0.3, 0x4a3a2c);
  const n = Math.max(2, Math.round(w / 0.8));
  for (let i = 0; i < n; i++) {
    const xx = x - w / 2 + 0.4 + ((w - 0.8) * i) / Math.max(1, n - 1);
    k.ico(xx, 0.8, z, 0.28, 0, r.pick(GREENS), 'paint', 1, 0.8, 1);
    if (r.chance(0.6)) k.ico(xx + 0.1, 1.05, z + 0.05, 0.1, 0, r.pick([0xd84a6a, 0xe6c23a, 0xf0efe8, 0xb54aa0]));
  }
}

/* ───────────────────────────── 6. Craftsman bungalow ───────────────────────────── */

const CB_SCHEMES = [
  { wall: 0x8a9a74, up: 0xc9b58a, trim: 0xefe6cf, acc: 0x6b3a22 },
  { wall: 0x7b8fa0, up: 0xd9cfae, trim: 0xf1ead6, acc: 0x7a2c25 },
  { wall: 0xb89a6a, up: 0x8a6a4a, trim: 0xefe6cf, acc: 0x2f4a3a },
  { wall: 0x8c5a3c, up: 0xc2a97a, trim: 0xe8dfc6, acc: 0x2b4a3a },
  { wall: 0x6f8a86, up: 0xd0c19a, trim: 0xf1ead6, acc: 0x8c3b3a },
];

const craftsmanBungalow = mk({
  id: 'craftsmanBungalow',
  name: 'Craftsman Bungalow',
  tags: ['historic', 'suburban', 'victorian'],
  x0: -5.9,
  x1: 6.1,
  z0: -4.1,
  z1: 6.9,
  zf: 3.5,
  draw: ({ c, k, r, solid }) => {
    const p = r.pick(CB_SCHEMES);
    const roofC = r.pick(ROOFS);
    const brick = r.chance(0.45);
    const pierC: Col = brick ? 0xffffff : 0x9b9893;
    const pierM = brick ? 'brickBrown' : 'stone';
    const F = 0.6;
    const H = 2.7;
    const E = F + H;
    solid(0, 0, 10, 7);
    solid(0, 4.75, 10.2, 2.5);

    block(k, 0, 0, 10, 7, F, H, p.wall, 'siding', p.trim, pierC, pierM);
    // low gable whose front slope sweeps down over the porch
    k.roof(0, E, 0, 10, [[6.1, -0.55], [0, 2.4], [-3.5, 0]], roofC, 'shingle', { trim: p.trim, fill: p.up, fillMat: 'shingle', ridge: roofC, eaveOH: 0.5, gableOH: 0.8, thick: 0.14 });
    tails(k, -4.9, 4.9, 5.75, E - 0.4, 1, 0.65, 0.31, p.acc);
    tails(k, -4.9, 4.9, -3.5, E - 0.02, -1, 0.42, 0.3, p.acc);
    for (const s of [-1, 1])
      for (const zz of [1.8, -1.8, ...(s < 0 ? [0] : [])]) {
        const y = E + (zz > 0 ? 2.4 - 0.4836 * zz : 2.4 - 0.686 * -zz) - 0.2;
        k.beam({ x: s * 4.95, y, z: zz }, { x: s * 5.75, y, z: zz }, 0.14, 0.14, p.acc);
        k.beam({ x: s * 4.95, y: y - 0.7, z: zz }, { x: s * 5.6, y: y - 0.04, z: zz }, 0.1, 0.1, p.acc);
      }

    // shed dormer
    const dz = 3.0;
    k.box(0, E + 0.6, dz - 1.05, 4.2, 1.6, 2.1, p.wall, 'siding');
    k.roof(0, 0, 0, 4.2, [[dz, E + 2.2], [dz - 2.3, E + 2.45]], roofC, 'shingle', { trim: p.trim, thick: 0.12, eaveOH: 0.3, gableOH: 0.3 });
    for (const wx of [-1.35, 0, 1.35]) win(k, wx, E + 0.9, dz, 0.9, 0.75, p.trim, { mx: 2, my: 1 });

    // windows and door
    doorAt(k, 0.05, F, 3.5, 1.0, 2.15, p.acc, { frame: p.trim, glass: true });
    win(k, -3.2, F + 0.6, 3.5, 1.3, 1.5, p.trim, { mx: 2, my: 2 });
    win(k, 3.1, F + 0.6, 3.5, 2.0, 1.5, p.trim, { mx: 3, my: 2 });
    for (const [s, zs] of [[-1, [-1.8, 1.8]], [1, [-2.2, 2.2]]] as [number, number[]][])
      side(k, s, 5.0, (u) => zs.forEach((zz) => win(k, u(zz), F + 0.6, 0, 1.1, 1.5, p.trim, { mx: 2, my: 2 })));
    back(k, -3.5, (u) => [-3, 0, 3].forEach((xx) => win(k, u(xx), F + 0.7, 0, 1.1, 1.4, p.trim, { mx: 2, my: 2 })));

    // stone chimney on the gable end
    k.box(5.5, 0, 0.5, 1.0, 4.4, 1.3, 0x9b9893, 'stone');
    k.box(5.5, 4.4, 0.5, 0.85, 2.2, 1.15, 0x9b9893, 'stone');
    k.box(5.5, 6.6, 0.5, 1.05, 0.14, 1.3, 0x6c6a66);

    // porch: base, deck, knee walls, tapered columns on piers
    const deckC = r.pick([0x7b6a56, 0x8a7a66]);
    k.box(0, 0, 4.75, 10.0, F - 0.12, 2.4, pierC, pierM);
    k.box(0, F - 0.12, 4.75, 10.2, 0.12, 2.5, deckC, 'planks');
    for (const [x0, x1] of [[-4.45, -1.95], [1.85, 4.45]]) {
      k.box((x0 + x1) / 2, F, 5.75, x1 - x0, 0.85, 0.4, pierC, pierM);
      k.box((x0 + x1) / 2, F + 0.85, 5.75, x1 - x0, 0.07, 0.5, 0xcfcac2, 'concrete');
    }
    for (const x of [-4.75, 4.75]) k.box(x, F, 4.5, 0.4, 0.85, 2.0, pierC, pierM);
    for (const x of [-4.75, -1.65, 1.75, 4.75]) {
      k.box(x, F, 5.75, 0.8, 1.0, 0.8, pierC, pierM);
      k.box(x, F + 1.0, 5.75, 0.9, 0.1, 0.9, 0xcfcac2, 'concrete');
      taperCol(k, x, F + 1.1, 5.75, 0.95, p.trim);
    }
    k.box(0, 2.65, 5.75, 10.0, 0.25, 0.3, p.trim);
    steps(k, 0.05, 6.0, 2.0, 3, F, 0xb5b2ab);

    // 1990s life
    if (r.chance(0.7)) chair(k, -3.4, F, 4.9, 0.15, r.pick([0xf2efe8, 0x2f4a3a, 0x7a2c25]));
    if (r.chance(0.5)) chair(k, -2.6, F, 5.0, -0.2, r.pick([0xf2efe8, 0x2f4a3a]));
    if (r.chance(0.6)) hangingPlant(k, 1.75, 2.7, 5.4, r);
    if (r.chance(0.5)) flagBracket(k, c, 4.9, F + 1.7, 5.95);
    if (r.chance(0.4)) bike(k, 3.4, 6.55, 0.4, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    if (r.chance(0.5)) dish(k, -2.4, E + 1.55, -1.5, Math.PI);
    if (r.chance(0.5)) woodpile(k, -5.5, -1.0, Math.PI / 2);
    if (r.chance(0.4)) hoseCoil(k, 4.0, F + 0.7, 3.55);
    foundationShrubs(k, r, -5.0, 5.0, 6.45, [[-1.2, 1.3]], 5);
  },
});

/* ───────────────────────────── 7. American Foursquare ───────────────────────────── */

const foursquare = mk({
  id: 'foursquare',
  name: 'American Foursquare',
  tags: ['historic', 'victorian'],
  x0: -5.6,
  x1: 5.6,
  z0: -5.2,
  z1: 7.7,
  zf: 4.3,
  draw: ({ c, k, r, solid }) => {
    const wall = r.pick(WALLS);
    const up = r.chance(0.5) ? wall : r.pick(WALLS);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const door = r.pick(DOORS);
    const brick = r.chance(0.35);
    const F = 0.8;
    const H1 = 2.8;
    const H2 = 2.7;
    const top = F + H1 + H2;
    solid(0, 0, 9.4, 8.6);

    block(k, 0, 0, 9.4, 8.6, F, H1, brick ? 0xffffff : wall, brick ? 'brickRed' : 'siding', trim, 0x8b8782, 'stone');
    k.box(0, F + H1, 0, 9.4, H2, 8.6, up, 'siding');
    k.box(0, F + H1 - 0.12, 0, 9.55, 0.3, 8.75, trim);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(sx * 4.7, F + H1, sz * 4.3, 0.16, H2, 0.16, trim);
    k.box(0, top - 0.12, 0, 9.5, 0.24, 8.7, trim);
    k.hipRoof(0, top, 0, 9.4, 8.6, 3.2, roofC, 'shingle', 0.9);
    chimney(k, 2.9, top + 1.5, -1.2, 2.0, 0xffffff, 'brickRed');

    // hipped dormer
    k.box(0, top + 0.7, 2.43, 2.2, 1.6, 1.94, up, 'siding');
    k.hipRoof(0, top + 2.3, 2.43, 2.2, 1.94, 0.8, roofC, 'shingle', 0.3);
    win(k, 0, top + 0.95, 3.4, 1.1, 0.9, trim, { mx: 3, my: 1 });

    // windows and door
    for (const x of [-3.2, 3.2]) {
      win(k, x, F + 0.6, 4.3, 1.3, 1.7, trim, { mx: 2, my: 2 });
      win(k, x, F + H1 + 0.65, 4.3, 1.2, 1.7, trim, { mx: 2, my: 2, shut: r.chance(0.4) ? r.pick(SHUT) : undefined });
    }
    win(k, 0, F + H1 + 0.65, 4.3, 1.2, 1.7, trim, { mx: 2, my: 2 });
    doorAt(k, 0, F, 4.3, 1.1, 2.3, door, { frame: trim, glass: true });
    for (const s of [-1, 1]) {
      side(k, s, 4.7, (u) => {
        for (const zz of [-2.2, 1.6]) {
          win(k, u(zz), F + 0.6, 0, 1.1, 1.7, trim, { mx: 2, my: 2 });
          win(k, u(zz), F + H1 + 0.65, 0, 1.1, 1.7, trim, { mx: 2, my: 2 });
        }
      });
    }
    back(k, -4.3, (u) => [-2.8, 0, 2.8].forEach((xx) => {
      win(k, u(xx), F + 0.7, 0, 1.1, 1.6, trim, { mx: 2, my: 2 });
      win(k, u(xx), F + H1 + 0.65, 0, 1.1, 1.7, trim, { mx: 2, my: 2 });
    }));

    // full-width porch
    const deck = r.pick([0x8a7a66, 0x7b6a56]);
    k.box(0, 0, 5.55, 10.0, F - 0.12, 2.5, 0x8b8782, 'stone');
    k.box(0, F - 0.12, 5.55, 10.2, 0.12, 2.7, deck, 'planks');
    k.roof(0, F + 2.5, 0, 10.4, [[6.9, 0], [4.3, 0.6]], roofC, 'shingle', { thick: 0.14, eaveOH: 0.4, gableOH: 0.3, trim });
    for (const x of [-4.6, -1.4, 1.4, 4.6]) {
      k.box(x, F, 6.6, 0.55, 0.9, 0.55, 0x8b8782, 'stone');
      squarePost(k, x, F + 0.9, 6.6, 1.6, trim, 0.26);
    }
    k.box(0, F + 2.4, 6.6, 9.9, 0.2, 0.3, trim);
    rail(k, -4.3, -1.7, F, 6.6, trim, 0.24, 0.9);
    rail(k, 1.7, 4.3, F, 6.6, trim, 0.24, 0.9);
    steps(k, 0, 6.9, 1.8, 3, F);

    // 1990s life
    if (r.chance(0.7)) chair(k, -3.2, F, 6.0, 0.2, r.pick([0xf2efe8, 0x2f4a3a, 0x7a2c25]));
    if (r.chance(0.5)) chair(k, 3.3, F, 6.0, -0.15, r.pick([0xf2efe8, 0x2f4a3a]));
    if (r.chance(0.6)) hangingPlant(k, -1.4, F + 2.4, 6.5, r);
    if (r.chance(0.5)) flagBracket(k, c, 4.7, F + 1.7, 6.8);
    if (r.chance(0.45)) dish(k, -2.2, top + 1.55, -2.0, Math.PI);
    if (r.chance(0.4)) bike(k, 4.3, 7.4, 0.3, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    if (r.chance(0.4)) trashCans(k, 5.0, -2.0, 2);
    foundationShrubs(k, r, -4.8, 4.8, 7.35, [[-1.1, 1.1]], 5);
  },
});

/* ───────────────────────────── 8. Cape Cod ───────────────────────────── */

const capeCod = mk({
  id: 'capeCod',
  name: 'Cape Cod',
  tags: ['postwar', 'suburban'],
  x0: -5.75,
  x1: 5.75,
  z0: -3.95,
  z1: 5.7,
  zf: 3.6,
  draw: ({ c, k, r, solid }) => {
    const wall = r.pick([0xf2efe8, 0xe4dccb, 0x9fb3c2, 0xd9cfa7, 0xb8c4cc, 0x8d9aa3, 0xa7b08a]);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const shut = r.chance(0.75) ? r.pick(SHUT) : undefined;
    const door = r.pick(DOORS);
    const F = 0.5;
    const H = 2.5;
    const E = F + H;
    solid(0, 0, 10.8, 7.2);

    block(k, 0, 0, 10.8, 7.2, F, H, wall, 'siding', trim, 0x8b8782, 'stone');
    gX(k, 0, E, 0, 10.8, 7.2, 3.4, { col: roofC, trim, fill: wall, fillMat: 'siding', ridge: roofC, eave: 0.35, gable: 0.3 });
    chimney(k, 0.4, E + 2.3, 0, 2.7, 0xffffff, 'brickRed');

    // two gable dormers
    for (const dx of [-2.7, 2.7]) {
      k.box(dx, 4.0, 1.35, 1.9, 1.75, 1.5, wall, 'siding');
      gZ(k, dx, 5.75, 1.35, 1.9, 1.5, 0.6, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.25, gable: 0.3, ridge: roofC });
      win(k, dx, 4.7, 2.1, 0.8, 0.85, trim, { mx: 2, my: 2, shut });
    }
    // five-bay front
    doorAt(k, 0, F, 3.6, 1.0, 2.1, door, { frame: trim });
    for (const x of [-4.3, -2.6, 2.6, 4.3]) win(k, x, F + 0.55, 3.6, 0.8, 1.45, trim, { mx: 2, my: 3, shut });
    for (const s of [-1, 1]) {
      side(k, s, 5.4, (u) => {
        for (const zz of [-1.6, 1.6]) win(k, u(zz), F + 0.55, 0, 0.9, 1.45, trim, { mx: 2, my: 3, shut });
        win(k, u(0), E + 1.1, 0, 0.7, 0.8, trim, { mx: 2, my: 2 });
      });
    }
    back(k, -3.6, (u) => [-3.6, -1.2, 1.2, 3.6].forEach((xx) => win(k, u(xx), F + 0.6, 0, 0.9, 1.4, trim, { mx: 2, my: 2 })));

    // small portico
    k.box(0, 0, 4.3, 2.6, F, 1.4, 0xc6c3bc, 'concrete');
    gZ(k, 0, 3.05, 4.0, 2.7, 1.8, 0.75, { col: roofC, trim, fill: trim, eave: 0.2, gable: 0.35, ridge: roofC });
    for (const x of [-1.05, 1.05]) k.cyl(x, F, 4.85, 0.085, 0.095, 2.4, 6, trim);
    k.box(0, 2.82, 4.85, 2.4, 0.2, 0.2, trim);
    steps(k, 0, 5.0, 1.6, 2, F, 0xc6c3bc);

    // 1990s life
    if (r.chance(0.5)) lights(k, -1.05, 2.78, 4.95, 1.05, 2.78, 4.95, 5, 0.2);
    if (r.chance(0.5)) hoseCoil(k, 3.6, F + 0.7, 3.65);
    if (r.chance(0.45)) dish(k, 3.5, E + 0.2 + 1.9, -1.0, Math.PI);
    if (r.chance(0.4)) fenceSeg(k, -5.0, 5.5, -5.0, 1.0);
    if (r.chance(0.4)) bike(k, -3.5, 5.0, 0.5, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    if (r.chance(0.5)) trashCans(k, 5.3, -2.5, 2);
    foundationShrubs(k, r, -5.2, 5.2, 3.95, [[-1.4, 1.4]], 7);
  },
});

/* ───────────────────────────── 9. Split-level ───────────────────────────── */

const splitLevel = mk({
  id: 'splitLevel',
  name: 'Split-Level',
  tags: ['postwar', 'suburban'],
  x0: -8.6,
  x1: 6.6,
  z0: -5.4,
  z1: 5.8,
  zf: 4.0,
  drive: 2.6,
  draw: ({ k, r, solid }) => {
    const wall = r.pick(WALLS);
    const up = r.chance(0.5) ? wall : r.pick(WALLS);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const door = r.pick(DOORS);
    const shut = r.chance(0.6) ? r.pick(SHUT) : undefined;
    const lower = r.pick(['brickRed', 'brickTan', 'brickBrown']);
    solid(-4.75, -0.25, 7.5, 8.5);
    solid(2.6, -0.5, 7.2, 9);

    // one-storey living wing (left)
    block(k, -4.75, -0.25, 7.5, 8.5, 0.6, 2.7, wall, 'siding', trim);
    gX(k, -4.75, 3.3, -0.25, 7.5, 8.5, 1.6, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.5, gable: 0.4, ridge: roofC });
    chimney(k, -6.6, 3.4, -1.6, 2.6, 0xffffff, 'brickRed');
    // two-level section: garage and den below, bedrooms above
    k.box(2.6, 0, -0.5, 7.2, 2.6, 9, 0xffffff, lower);
    k.box(2.6, 2.6, -0.5, 7.2, 2.7, 9, up, 'siding');
    k.box(2.6, 2.5, -0.5, 7.35, 0.2, 9.15, trim);
    k.box(2.6, 5.2, -0.5, 7.35, 0.22, 9.15, trim);
    gX(k, 2.6, 5.3, -0.5, 7.2, 9, 1.9, { col: roofC, trim, fill: up, fillMat: 'siding', eave: 0.5, gable: 0.4, ridge: roofC });
    garageDoor(k, 2.6, 4.0, 4.8, 2.2, trim);
    for (const x of [1.0, 4.2]) win(k, x, 3.2, 4.0, 1.4, 1.25, trim, { mx: 2, my: 2, shut });

    // front: picture window, half-level entry
    win(k, -5.7, 1.2, 4.0, 2.8, 1.4, trim, { mx: 3, my: 1 });
    doorAt(k, -2.2, 0.6, 4.0, 0.95, 2.1, door, { frame: trim, glass: true });
    steps(k, -2.2, 4.0, 1.4, 2, 0.6, 0xb5b2ab);
    side(k, -1, 8.5, (u) => [-2, 1.8].forEach((zz) => win(k, u(zz), 1.2, 0, 1.2, 1.2, trim, { mx: 2, my: 2 })));
    side(k, 1, 6.2, (u) => {
      win(k, u(-2.5), 0.9, 0, 1.1, 1.0, trim, { mx: 2, my: 1 });
      for (const zz of [-2.5, 1.0]) win(k, u(zz), 3.2, 0, 1.1, 1.2, trim, { mx: 2, my: 2 });
    });
    back(k, -4.5, (u) => [-6.3, -3.4].forEach((xx) => win(k, u(xx), 1.2, 0, 1.2, 1.2, trim, { mx: 2, my: 2 })));
    back(k, -5.0, (u) => {
      win(k, u(2.6), 0.9, 0, 1.6, 1.0, trim, { mx: 2, my: 1 });
      win(k, u(2.6), 3.2, 0, 1.4, 1.2, trim, { mx: 2, my: 2 });
    });

    // 1990s life
    if (r.chance(0.45)) hoop(k, 5.8, 4.3);
    if (r.chance(0.5)) dish(k, -3.0, 4.2, -2.0, Math.PI);
    if (r.chance(0.4)) bike(k, -0.6, 5.0, 0.6, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    if (r.chance(0.5)) trashCans(k, 6.6, -3.0, 2);
    foundationShrubs(k, r, -8.0, -3.0, 4.35, [], 4);
  },
});

/* ───────────────────────────── 10. Ranch with attached garage ───────────────────────────── */

const ranchGarage = mk({
  id: 'ranchGarage',
  name: 'Ranch with Attached Garage',
  tags: ['postwar', 'suburban'],
  x0: -10.1,
  x1: 10.5,
  z0: -5.1,
  z1: 5.6,
  zf: 4.5,
  drive: 6.5,
  draw: ({ c, k, r, solid }) => {
    const wall = r.pick(WALLS);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const door = r.pick(DOORS);
    const shut = r.chance(0.7) ? r.pick(SHUT) : undefined;
    const brick = r.pick(['brickRed', 'brickTan', 'brickBrown', 'stone']);
    solid(-3.25, 0, 12.5, 9);
    solid(6.5, 0.25, 7, 9.5);

    block(k, -3.25, 0, 12.5, 9, 0.35, 2.6, wall, 'siding', trim);
    k.box(-3.25, 0.35, 4.53, 12.5, 0.9, 0.08, brick === 'stone' ? 0x9b9893 : 0xffffff, brick);
    k.box(6.5, 0, 0.25, 7, 2.75, 9.5, wall, 'siding');
    k.box(6.5, 2.62, 0.25, 7.1, 0.2, 9.6, trim);
    k.hipRoof(-3.25, 2.95, 0, 12.5, 9, 1.7, roofC, 'shingle', 0.6);
    k.hipRoof(6.5, 2.75, 0.25, 7, 9.5, 1.6, roofC, 'shingle', 0.5);
    garageDoor(k, 6.5, 5.0, 5.2, 2.2, trim);
    chimney(k, -6.5, 3.2, -1.2, 2.0, 0xffffff, 'brickRed');

    for (const x of [-8.0, -5.2]) win(k, x, 1.25, 4.5, 1.6, 1.15, trim, { mx: 2, my: 2, shut });
    win(k, 0.6, 1.0, 4.5, 2.8, 1.4, trim, { mx: 3, my: 1 });
    doorAt(k, -2.0, 0.35, 4.5, 0.95, 2.1, door, { frame: trim });
    k.box(-2.0, 0, 5.0, 1.8, 0.35, 1.0, 0xb5b2ab, 'concrete');
    side(k, -1, 9.5, (u) => [-2, 2].forEach((zz) => win(k, u(zz), 1.1, 0, 1.2, 1.2, trim, { mx: 2, my: 2 })));
    side(k, 1, 10, (u) => doorAt(k, u(-2.5), 0, 0, 0.9, 2.0, 0xe9e8e4, { frame: trim }));
    back(k, -4.5, (u) => [-8, -5, -2, 1].forEach((xx) => win(k, u(xx), 1.1, 0, 1.2, 1.1, trim, { mx: 2, my: 2 })));

    if (r.chance(0.5)) flagBracket(k, c, -3.2, 2.1, 4.6);
    if (r.chance(0.4)) lights(k, -9.5, 2.7, 4.7, 3.0, 2.7, 4.7, 10, 0.25);
    if (r.chance(0.5)) dish(k, -6.0, 3.9, -2.2, Math.PI);
    if (r.chance(0.5)) trashCans(k, 10.6, -3.0, 2);
    if (r.chance(0.35)) hoop(k, 9.6, 5.2);
    foundationShrubs(k, r, -9.4, 2.6, 4.85, [[-2.9, -1.1]], 6);
  },
});

/* ───────────────────────────── 11. 1990s two-storey with front garage ───────────────────────────── */

const modernTwoStory = mk({
  id: 'modernTwoStory',
  name: '1990s Two-Storey',
  tags: ['modern', 'suburban'],
  x0: -7.1,
  x1: 10.5,
  z0: -5.6,
  z1: 6.0,
  zf: 4.0,
  drive: 6.5,
  draw: ({ k, r, solid }) => {
    const wall = r.pick([0xd9cfb8, 0xc9c3b4, 0xb8c4cc, 0x9fb3c2, 0xe4dccb, 0xa9a99a, 0xc9b79c]);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const door = r.pick(DOORS);
    const shut = r.chance(0.5) ? r.pick(SHUT) : undefined;
    const F = 0.4;
    const H1 = 2.8;
    const top = F + H1 + 2.7;
    solid(-1.75, -0.5, 9.5, 9);
    solid(6.5, 0.75, 7, 9.5);

    block(k, -1.75, -0.5, 9.5, 9, F, top - F, wall, 'siding', trim);
    k.box(-1.75, F + H1 - 0.1, -0.5, 9.6, 0.2, 9.1, trim);
    k.box(-4.25, F, 4.05, 4.5, 1.0, 0.1, 0x9b9893, 'stone');
    k.hipRoof(-1.75, top, -0.5, 9.5, 9, 2.6, roofC, 'shingle', 0.5);
    // snout garage with a front gable
    k.box(6.5, 0, 0.75, 7, 2.9, 9.5, wall, 'siding');
    k.box(6.5, 2.78, 0.75, 7.1, 0.2, 9.6, trim);
    gZ(k, 6.5, 2.9, 0.75, 7, 9.5, 2.2, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.4, gable: 0.35, ridge: roofC });
    garageDoor(k, 6.5, 5.5, 5.2, 2.25, trim);
    k.cylZ(6.5, 4.0, 5.53, 0.45, 0.06, 10, trim);
    k.cylZ(6.5, 4.0, 5.56, 0.34, 0.05, 10, P.glass, 'glass');
    // two-storey entry foyer
    k.box(-1.0, 0, 4.6, 3.0, top, 1.2, wall, 'siding');
    gZ(k, -1.0, top, 3.2, 3.0, 4.0, 1.7, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.35, gable: 0.3, ridge: roofC });
    doorAt(k, -1.0, F, 5.2, 1.0, 2.2, door, { frame: trim, glass: true });
    for (const s of [-1, 1]) win(k, -1.0 + s * 0.95, F + 0.3, 5.2, 0.32, 1.9, trim, { mx: 1, my: 1, noSill: true });
    win(k, -1.0, F + H1 + 0.4, 5.2, 1.4, 1.5, trim, { mx: 2, my: 2 });
    k.box(-1.0, 0, 5.75, 2.2, F, 1.0, 0xb5b2ab, 'concrete');
    for (const x of [-4.8, 1.8]) {
      win(k, x, F + 0.6, 4.0, x < 0 ? 1.6 : 1.0, 1.5, trim, { mx: 2, my: 2, shut });
      win(k, x, F + H1 + 0.55, 4.0, x < 0 ? 1.4 : 1.0, 1.4, trim, { mx: 2, my: 2, shut });
    }
    side(k, -1, 6.5, (u) => [-3, 1.5].forEach((zz) => {
      win(k, u(zz), F + 0.6, 0, 1.2, 1.4, trim, { mx: 2, my: 2 });
      win(k, u(zz), F + H1 + 0.55, 0, 1.2, 1.4, trim, { mx: 2, my: 2 });
    }));
    back(k, -5.0, (u) => [-4.5, -1.5, 1.5].forEach((xx) => {
      win(k, u(xx), F + 0.6, 0, 1.2, 1.4, trim, { mx: 2, my: 2 });
      win(k, u(xx), F + H1 + 0.55, 0, 1.2, 1.4, trim, { mx: 2, my: 2 });
    }));
    if (r.chance(0.5)) hoop(k, 9.6, 5.8);
    if (r.chance(0.5)) trashCans(k, 10.6, -2.5, 2);
    if (r.chance(0.4)) bike(k, 2.2, 5.0, 0.5, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    foundationShrubs(k, r, -6.3, 2.8, 4.35, [[-2.6, 0.6]], 5);
  },
});

/* ───────────────────────────── 12. Log cabin ───────────────────────────── */

const logCabin = mk({
  id: 'logCabin',
  name: 'Log Cabin',
  tags: ['cabin', 'lake', 'rural'],
  x0: -5.7,
  x1: 6.3,
  z0: -4.7,
  z1: 6.3,
  zf: 3.5,
  draw: ({ k, r, solid }) => {
    const logC = r.pick([0x8a6440, 0x7a5636, 0x9a7048, 0x6f5236]);
    const chink = 0xd8cbb2;
    const roofC = r.pick([0x2f4a3a, 0x6b2a24, 0x4a4c52, 0x3d4a5a]);
    const trim = r.pick([0x3d2f28, 0xe9e0c8, 0x2b4a3a]);
    const F = 0.5;
    const H = 2.9;
    solid(0, -0.25, 10, 7.5);
    for (const [px, pz] of [[-4.6, -3.6], [4.6, -3.6], [-4.6, 3.1], [4.6, 3.1], [0, -3.6], [0, 3.1]]) k.box(px, 0, pz, 0.6, F, 0.6, 0x8f8c86, 'stone');
    k.box(0, F, -0.25, 9.8, H, 7.3, chink, 'paint');
    // stacked logs, corners crossing
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const y = F + 0.18 + i * (H / rows);
      const lc = i % 2 ? logC : r.chance(0.5) ? logC : 0x80603e;
      k.cylX(0, y, 3.45, 0.2, 10.7, 6, lc);
      k.cylX(0, y, -3.95, 0.2, 10.7, 6, lc);
      k.cylZ(-4.9, y + 0.18, -0.25, 0.2, 8.3, 6, lc);
      k.cylZ(4.9, y + 0.18, -0.25, 0.2, 8.3, 6, lc);
    }
    gX(k, 0, F + H, -0.25, 9.8, 7.3, 3.0, { col: roofC, mat: 'roofMetal', fill: logC, fillMat: 'boards', eave: 0.7, gable: 0.6 });
    // river-rock chimney
    k.box(5.5, 0, -0.6, 1.3, F + H + 3.6, 1.6, 0x8f8c86, 'stone');
    k.box(5.5, F + H + 3.6, -0.6, 1.0, 0.2, 1.3, 0x6c6a66);
    // front porch
    const deck = 0x7b6a56;
    k.box(0, 0, 4.7, 10.4, F, 2.4, deck, 'planks');
    k.roof(0, F + 2.55, 0, 10.8, [[6.0, 0], [3.5, 0.55]], roofC, 'roofMetal', { thick: 0.12, eaveOH: 0.2, gableOH: 0.3 });
    for (const x of [-4.9, -1.6, 1.6, 4.9]) k.cyl(x, F, 5.6, 0.14, 0.17, 2.55, 6, logC);
    k.box(0, F + 2.45, 5.6, 10.0, 0.22, 0.26, logC);
    rail(k, -4.8, -1.7, F, 5.6, logC, 0.5, 0.85);
    rail(k, 1.7, 4.8, F, 5.6, logC, 0.5, 0.85);
    steps(k, 0, 5.9, 1.6, 2, F, deck, 'planks');
    doorAt(k, 0, F, 3.65, 1.0, 2.15, 0x5a3a24, { frame: trim });
    for (const x of [-2.8, 2.8]) win(k, x, F + 0.8, 3.65, 1.2, 1.2, trim, { mx: 2, my: 2 });
    side(k, -1, 5.1, (u) => [-1.8, 1.4].forEach((zz) => win(k, u(zz), F + 0.8, 0, 1.0, 1.1, trim, { mx: 2, my: 2 })));
    back(k, -4.15, (u) => [-2.5, 2.5].forEach((xx) => win(k, u(xx), F + 0.9, 0, 1.0, 1.0, trim, { mx: 2, my: 2 })));
    win(k, 0, F + H + 0.7, 3.6, 1.0, 1.0, trim, { mx: 2, my: 2, noSill: true });
    // life
    woodpile(k, -5.6, -1.5, Math.PI / 2);
    if (r.chance(0.7)) chair(k, -3.3, F, 4.6, 0.2, logC);
    if (r.chance(0.6)) chair(k, -2.4, F, 4.7, -0.15, logC);
    if (r.chance(0.5)) {
      k.cyl(3.4, 0, 7.4, 0.35, 0.4, 0.5, 7, 0x8a6a46);
      k.beam({ x: 3.4, y: 0.5, z: 7.4 }, { x: 3.7, y: 1.1, z: 7.5 }, 0.05, 0.05, 0x6b4a33);
    }
    if (r.chance(0.5)) hangingPlant(k, 1.6, F + 2.5, 5.4, r);
  },
});

/* ───────────────────────────── 13. Single-wide mobile home ───────────────────────────── */

const singleWide = mk({
  id: 'singleWide',
  name: 'Single-Wide Mobile Home',
  tags: ['trailer'],
  x0: -2.4,
  x1: 4.8,
  z0: -10.2,
  z1: 10.3,
  zf: 10.0,
  drive: 3.6,
  draw: ({ k, r, solid }) => {
    const wall = r.pick([0xf2efe8, 0xe9e0c8, 0xd9e2e6, 0xe6dcc8, 0xc9d4c0, 0xe9d6c8]);
    const band = r.pick([0x8a4a2a, 0x2f4a6b, 0x4a6b3a, 0x6b2a24, 0x5a4a40]);
    const trim = 0xf4f2ec;
    solid(0, 0, 4.3, 20);
    k.box(0, 0, 0, 4.2, 0.7, 19.9, r.pick([0xb8b4aa, 0xd9d4c8, 0x8a8e92]), 'corrugated');
    k.box(0, 0.7, 0, 4.3, 2.5, 20, wall, 'siding');
    k.box(0, 1.85, 0, 4.34, 0.28, 20.04, band);
    gZ(k, 0, 3.2, 0, 4.3, 20, 0.35, { col: 0xd9d9d6, mat: 'roofMetal', trim, eave: 0.15, gable: 0.12 });
    k.box(0, 0.25, 10.4, 0.3, 0.3, 0.9, 0x5a5e62, 'metal');
    win(k, 0, 1.5, 10.0, 1.6, 1.0, trim, { mx: 2, my: 1 });
    side(k, 1, 2.15, (u) => {
      for (const zz of [-7.5, -4, 3, 7]) win(k, u(zz), 1.5, 0, 1.1, 1.0, trim, { mx: 2, my: 1 });
      doorAt(k, u(-0.5), 0.7, 0, 0.9, 1.95, r.pick([0xe9e8e4, 0x6b3a22, 0x3d5a73]), { frame: trim, glass: true });
    });
    side(k, -1, 2.15, (u) => [-6, -1, 4.5].forEach((zz) => win(k, u(zz), 1.5, 0, 1.1, 1.0, trim, { mx: 2, my: 1 })));
    back(k, -10, (u) => win(k, u(0), 1.5, 0, 1.0, 0.8, trim, { mx: 1, my: 1 }));
    // wooden deck and steps at the door, aluminium awning over it
    const deck = r.pick([0x8a7a66, 0x9a8a72]);
    k.box(3.4, 0, -0.5, 2.4, 0.66, 3.2, deck, 'planks');
    steps(k, 3.4, 1.1, 1.2, 2, 0.66, deck, 'planks');
    for (const zz of [-2, 1]) k.box(4.5, 0.66, zz, 0.08, 0.9, 0.08, deck);
    k.box(4.5, 1.5, -0.5, 0.08, 0.08, 3.1, deck);
    k.box(3.3, 2.75, -0.5, 2.3, 0.06, 3.4, 0xe9e8e4, 'metal', { rz: -0.08 });
    for (const zz of [-2.1, 1.1]) k.box(4.4, 0.66, zz, 0.06, 2.0, 0.06, 0xc9ccd0, 'metal');
    if (r.chance(0.6)) {
      k.cylX(-0.5, 0.55, -11.0, 0.42, 1.6, 8, 0xe9e8e4, 'metal');
      for (const s of [-1, 1]) k.sphere(-0.5 + s * 0.8, 0.55, -11.0, 0.42, 0xe9e8e4, 'metal', 8, 5);
    }
    if (r.chance(0.5)) dish(k, -1.2, 3.25, -4.0, Math.PI / 2);
    if (r.chance(0.5)) trashCans(k, -2.0, 9.2, 2);
    if (r.chance(0.4)) bike(k, 3.6, 3.0, 1.5, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
  },
});

/* ───────────────────────────── 14. Double-wide manufactured home ───────────────────────────── */

const doubleWide = mk({
  id: 'doubleWide',
  name: 'Double-Wide',
  tags: ['trailer', 'rural'],
  x0: -9.4,
  x1: 9.4,
  z0: -4.6,
  z1: 6.6,
  zf: 4.2,
  drive: 6.8,
  draw: ({ k, r, solid }) => {
    const wall = r.pick([0xe4dccb, 0xc9c3b4, 0xb8c4cc, 0xd9cfa7, 0xa7b08a, 0xe8e6df]);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const shut = r.chance(0.6) ? r.pick(SHUT) : undefined;
    solid(0, 0, 18, 8.4);
    k.box(0, 0, 0, 17.9, 0.6, 8.3, r.pick([0xb8b4aa, 0x9a8e7c]), 'boards');
    k.box(0, 0.6, 0, 18, 2.45, 8.4, wall, 'siding');
    k.box(0, 2.98, 0, 18.1, 0.16, 8.5, trim);
    gX(k, 0, 3.05, 0, 18, 8.4, 1.0, { col: roofC, mat: 'shingle', trim, fill: wall, fillMat: 'siding', eave: 0.35, gable: 0.3 });
    for (const x of [-6.8, -4.3, 4.0, 6.6]) win(k, x, 1.3, 4.2, 1.2, 1.1, trim, { mx: 2, my: 2, shut });
    win(k, -1.4, 1.2, 4.2, 2.2, 1.2, trim, { mx: 3, my: 1 });
    doorAt(k, 1.4, 0.6, 4.2, 0.92, 2.0, r.pick(DOORS), { frame: trim, glass: true });
    for (const s of [-1, 1]) side(k, s, 9, (u) => [-1.6, 1.8].forEach((zz) => win(k, u(zz), 1.3, 0, 1.0, 1.0, trim, { mx: 2, my: 1 })));
    back(k, -4.2, (u) => [-6, -2, 2.5, 6].forEach((xx) => win(k, u(xx), 1.4, 0, 1.0, 0.9, trim, { mx: 2, my: 1 })));
    // porch deck with a small gable roof
    const deck = r.pick([0x8a7a66, 0x7b6a56]);
    k.box(1.0, 0, 5.3, 4.2, 0.56, 2.2, deck, 'planks');
    steps(k, 1.0, 6.25, 1.4, 2, 0.56, deck, 'planks');
    for (const x of [-0.9, 2.9]) k.box(x, 0.56, 6.2, 0.14, 2.2, 0.14, trim);
    gZ(k, 1.0, 2.76, 5.2, 4.2, 2.2, 0.8, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.2, gable: 0.2 });
    rail(k, -0.85, 0.2, 0.56, 6.2, trim, 0.25, 0.85);
    if (r.chance(0.6)) {
      k.cylX(-8.0, 0.55, -5.4, 0.42, 1.6, 8, 0xe9e8e4, 'metal');
      for (const s of [-1, 1]) k.sphere(-8.0 + s * 0.8, 0.55, -5.4, 0.42, 0xe9e8e4, 'metal', 8, 5);
    }
    if (r.chance(0.5)) dish(k, 5.0, 3.6, -1.0, Math.PI);
    if (r.chance(0.5)) chair(k, 0.0, 0.56, 5.4, 0.2, r.pick([0xf2efe8, 0x2f4a3a]));
    if (r.chance(0.5)) lights(k, -0.9, 2.6, 6.25, 2.9, 2.6, 6.25, 6, 0.2);
    foundationShrubs(k, r, -8.6, 8.6, 4.55, [[-1.2, 3.4]], 5);
  },
});

/* ───────────────────────────── 15. Townhouse row (four units) ───────────────────────────── */

const townhouseRow = mk({
  id: 'townhouseRow',
  name: 'Townhouse Row',
  tags: ['townhouse'],
  x0: -13.1,
  x1: 13.1,
  z0: -5.4,
  z1: 7.0,
  zf: 5.0,
  draw: ({ k, r, solid }) => {
    const F = 0.9;
    const H1 = 2.9;
    const top = F + H1 + 2.8;
    const roofC = r.pick(ROOFS);
    solid(0, 0, 25.6, 10);
    k.box(0, 0, 0, 25.7, F, 10.1, 0x8b8782, 'stone');
    gX(k, 0, top, 0, 25.6, 10, 2.6, { col: roofC, trim: 0xf2efe8, fill: 0xd9d4c8, fillMat: 'siding', eave: 0.45, gable: 0.4, ridge: roofC });
    for (let i = 0; i < 4; i++) {
      const x = -9.6 + i * 6.4;
      const scheme = r.pick([
        { col: 0xffffff, mat: 'brickRed', trim: 0xf2efe8 },
        { col: 0xffffff, mat: 'brickTan', trim: 0x3d2f28 },
        { col: r.pick(WALLS), mat: 'siding', trim: r.pick(WHITES) },
        { col: r.pick(WALLS), mat: 'siding', trim: r.pick(WHITES) },
      ]);
      k.box(x, F, 0, 6.4, top - F, 10, scheme.col, scheme.mat);
      k.box(x, F + H1 - 0.1, 0, 6.45, 0.2, 10.05, scheme.trim);
      k.box(x, top - 0.2, 0, 6.5, 0.3, 10.1, scheme.trim);
      k.box(x + 3.2, F, 0, 0.3, top - F + 0.4, 10.2, 0xb9b4ab, 'concrete');
      // front gable dormer per unit
      gZ(k, x + 0.8, top, 4.2, 3.2, 2.2, 1.4, { col: roofC, trim: scheme.trim, fill: scheme.col, fillMat: scheme.mat, eave: 0.2, gable: 0.2 });
      k.box(x + 0.8, top - 0.3, 4.2, 3.2, 1.0, 2.2, scheme.col, scheme.mat);
      win(k, x + 0.8, top + 0.0, 5.3, 1.2, 0.9, scheme.trim, { mx: 2, my: 1 });
      // bay window, door and stoop
      k.box(x + 0.9, F, 5.45, 3.0, 2.3, 0.9, scheme.col, scheme.mat);
      k.box(x + 0.9, F + 2.3, 5.45, 3.2, 0.18, 1.1, roofC);
      win(k, x + 0.9, F + 0.6, 5.9, 2.4, 1.4, scheme.trim, { mx: 3, my: 2 });
      doorAt(k, x - 2.0, F, 5.0, 0.95, 2.15, r.pick(DOORS), { frame: scheme.trim, glass: true });
      steps(k, x - 2.0, 5.0, 1.3, 3, F, 0xb5b2ab);
      k.box(x - 2.0, F + 2.4, 5.4, 1.5, 0.12, 0.9, roofC);
      for (const wx of [x - 1.5, x + 1.6]) win(k, wx, F + H1 + 0.6, 5.0, 1.1, 1.5, scheme.trim, { mx: 2, my: 2 });
      back(k, -5, (u) => {
        win(k, u(x - 1.4), F + 0.7, 0, 1.2, 1.4, scheme.trim, { mx: 2, my: 2 });
        doorAt(k, u(x + 1.6), F, 0, 0.9, 2.1, 0xe9e8e4, { frame: scheme.trim });
        win(k, u(x), F + H1 + 0.6, 0, 1.3, 1.4, scheme.trim, { mx: 2, my: 2 });
      });
      if (r.chance(0.6)) k.ico(x - 0.8, 0.45, 6.4, 0.45, 0, r.pick(GREENS), 'paint', 1, 0.8, 1);
      if (r.chance(0.4)) bike(k, x + 2.4, 6.4, 0.3, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    }
    for (const s of [-1, 1]) side(k, s, 12.8, (u) => [-2, 2].forEach((zz) => {
      win(k, u(zz), F + 0.7, 0, 1.0, 1.4, 0xf2efe8, { mx: 2, my: 2 });
      win(k, u(zz), F + H1 + 0.6, 0, 1.0, 1.4, 0xf2efe8, { mx: 2, my: 2 });
    }));
  },
});

/* ───────────────────────────── 16. Side-by-side duplex ───────────────────────────── */

const duplex = mk({
  id: 'duplex',
  name: 'Duplex',
  tags: ['duplex', 'historic', 'suburban'],
  x0: -7.4,
  x1: 7.4,
  z0: -5.0,
  z1: 6.9,
  zf: 4.5,
  draw: ({ c, k, r, solid }) => {
    const wall = r.pick(WALLS);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const F = 0.6;
    const H1 = 2.7;
    const top = F + H1 + 2.6;
    solid(0, 0, 14, 9);
    block(k, 0, 0, 14, 9, F, top - F, wall, 'siding', trim, 0x8b8782, 'stone');
    k.box(0, F + H1 - 0.1, 0, 14.1, 0.22, 9.1, trim);
    gX(k, 0, top, 0, 14, 9, 2.5, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.45, gable: 0.4, ridge: roofC });
    for (const s of [-1, 1]) {
      chimney(k, s * 4.5, top + 1.0, -1.8, 2.2, 0xffffff, 'brickRed');
      doorAt(k, s * 1.2, F, 4.5, 0.95, 2.15, r.pick(DOORS), { frame: trim, glass: true });
      for (const x of [s * 3.3, s * 5.6]) {
        win(k, x, F + 0.6, 4.5, 1.1, 1.5, trim, { mx: 2, my: 2, shut: r.chance(0.5) ? r.pick(SHUT) : undefined });
        win(k, x, F + H1 + 0.6, 4.5, 1.1, 1.4, trim, { mx: 2, my: 2 });
      }
      win(k, s * 1.2, F + H1 + 0.6, 4.5, 0.9, 1.4, trim, { mx: 2, my: 2 });
      side(k, s, 7, (u) => [-2.3, 1.8].forEach((zz) => {
        win(k, u(zz), F + 0.6, 0, 1.0, 1.4, trim, { mx: 2, my: 2 });
        win(k, u(zz), F + H1 + 0.6, 0, 1.0, 1.4, trim, { mx: 2, my: 2 });
      }));
      if (r.chance(0.5)) chair(k, s * 3.2, F, 5.4, s * 0.2, r.pick([0xf2efe8, 0x2f4a3a]));
    }
    back(k, -4.5, (u) => [-4.5, -1.5, 1.5, 4.5].forEach((xx) => win(k, u(xx), F + 0.7, 0, 1.0, 1.3, trim, { mx: 2, my: 2 })));
    // shared porch
    const deck = r.pick([0x8a7a66, 0x7b6a56]);
    k.box(0, 0, 5.6, 9.0, F - 0.1, 2.2, 0x8b8782, 'stone');
    k.box(0, F - 0.1, 5.6, 9.2, 0.1, 2.3, deck, 'planks');
    k.roof(0, F + 2.45, 0, 9.4, [[6.8, 0], [4.5, 0.5]], roofC, 'shingle', { thick: 0.13, eaveOH: 0.3, gableOH: 0.25, trim });
    for (const x of [-4.3, -0.2, 0.2, 4.3]) squarePost(k, x, F, 6.5, 2.45, trim);
    steps(k, -1.2, 6.6, 1.3, 2, F);
    steps(k, 1.2, 6.6, 1.3, 2, F);
    if (r.chance(0.5)) flagBracket(k, c, 4.4, F + 1.6, 6.7);
    if (r.chance(0.5)) trashCans(k, 7.4, -2.5, 3);
    foundationShrubs(k, r, -6.6, 6.6, 6.75, [[-2.0, 2.0]], 4);
  },
});

/* ───────────────────────────── 17. Lodge-style estate (Cedar Ridge) ───────────────────────────── */

const lodgeEstate = mk({
  id: 'lodgeEstate',
  name: 'Lodge-Style Estate',
  tags: ['estate'],
  x0: -9.3,
  x1: 15.6,
  z0: -6.8,
  z1: 9.0,
  zf: 4.0,
  drive: 10.0,
  draw: ({ k, r, solid }) => {
    const cedar = r.pick([0x9a6b44, 0x8a5e3c, 0x7a5a3e, 0x6f5a46, 0x8c7a5c]);
    const stone = r.pick([0x8f8c86, 0x9b9389, 0x7f7b75]);
    const roofC = r.pick([0x2f3438, 0x3a3d40, 0x2f4a3a, 0x4a3a30]);
    const trim = r.pick([0x3d2f28, 0x2b2421, 0xe9e0c8]);
    const F = 0.6;
    const top = F + 3.0 + 2.8;
    solid(-1.5, -1, 13, 10);
    solid(-2, 6, 5.4, 4);
    solid(10, -0.5, 10, 9);

    // main block: stone base, cedar above
    k.box(-1.5, 0, -1, 13.2, 1.7, 10.2, stone, 'stone');
    k.box(-1.5, 1.7, -1, 13, top - 1.7, 10, cedar, 'boards');
    k.box(-1.5, F + 3.0 - 0.1, -1, 13.1, 0.22, 10.1, trim);
    gX(k, -1.5, top, -1, 13, 10, 3.6, { col: roofC, mat: 'roofMetal', fill: cedar, fillMat: 'boards', eave: 0.9, gable: 0.8, ridge: roofC });
    // great room with a glass gable and timber truss
    k.box(-2, 0, 6, 5.4, 1.2, 4.2, stone, 'stone');
    k.box(-2, 1.2, 6, 5.0, top - 1.2, 4.0, cedar, 'boards');
    gZ(k, -2, top, 4, 5.0, 8.0, 3.0, { col: roofC, mat: 'roofMetal', fill: cedar, fillMat: 'boards', eave: 0.8, gable: 0.9, ridge: roofC });
    win(k, -2, 1.5, 8.0, 3.8, 2.3, trim, { mx: 3, my: 2, noSill: true });
    win(k, -2, 4.1, 8.0, 3.8, 2.0, trim, { mx: 3, my: 1, noSill: true });
    const tri = new THREE.Shape();
    tri.moveTo(-2.0, 0);
    tri.lineTo(2.0, 0);
    tri.lineTo(0, 2.3);
    tri.closePath();
    k.extrude(tri, 0.06, P.glass, 'glass', -2, top + 0.1, 8.04);
    for (const s of [-1, 1]) k.beam({ x: -2 + s * 2.7, y: top - 0.1, z: 8.6 }, { x: -2, y: top + 2.85, z: 8.6 }, 0.26, 0.3, 0x5a4332);
    k.beam({ x: -2, y: top - 0.2, z: 8.6 }, { x: -2, y: top + 2.7, z: 8.6 }, 0.22, 0.26, 0x5a4332);
    k.box(-2, top - 0.25, 8.6, 5.6, 0.3, 0.3, 0x5a4332);
    // tall stone chimney on the west gable
    k.box(-8.4, 0, -1, 1.7, top + 4.4, 2.2, stone, 'stone');
    k.box(-8.4, top + 4.4, -1, 1.3, 0.25, 1.8, 0x5c5a56);
    // three-car garage wing
    k.box(10, 0, -0.5, 10, 1.0, 9, stone, 'stone');
    k.box(10, 1.0, -0.5, 10, 2.2, 9, cedar, 'boards');
    gX(k, 10, 3.2, -0.5, 10, 9, 2.4, { col: roofC, mat: 'roofMetal', fill: cedar, fillMat: 'boards', eave: 0.7, gable: 0.6, ridge: roofC });
    for (const gx of [6.8, 10, 13.2]) garageDoor(k, gx, 4.0, 2.7, 2.3, trim, r.pick([0x6b4a33, 0x7a5a3e, 0xe9e8e4]));
    // entry
    doorAt(k, 2.6, F, 4.0, 1.3, 2.4, 0x4a2f20, { frame: trim, glass: true, double: true });
    for (const x of [1.4, 3.8]) {
      k.box(x, 0, 5.6, 0.7, 0.9, 0.7, stone, 'stone');
      k.box(x, 0.9, 5.6, 0.3, 2.5, 0.3, 0x5a4332);
    }
    k.roof(2.6, 3.4, 0, 3.2, [[6.2, 0], [4.0, 0.6]], roofC, 'roofMetal', { thick: 0.14, eaveOH: 0.25, gableOH: 0.2 });
    steps(k, 2.6, 4.0, 2.2, 2, F, 0xa9a49a, 'stone');
    for (const x of [-6.2, 3.8]) {
      win(k, x, F + 0.9, 4.0, 1.6, 1.8, trim, { mx: 2, my: 2 });
      win(k, x, F + 3.5, 4.0, 1.6, 1.6, trim, { mx: 2, my: 2 });
    }
    side(k, 1, 15, (u) => win(k, u(-1.5), 1.4, 0, 1.2, 1.0, trim, { mx: 2, my: 1 }));
    back(k, -6, (u) => [-6, -3, 0, 3].forEach((xx) => {
      win(k, u(xx), F + 0.9, 0, 1.6, 2.0, trim, { mx: 2, my: 2 });
      win(k, u(xx), F + 3.5, 0, 1.4, 1.6, trim, { mx: 2, my: 2 });
    }));
    // landscaping: boulders, small firs, lanterns
    for (const [bx, bz, br] of [[-6.5, 6.5, 0.7], [5.4, 7.6, 0.5], [-7.6, 4.8, 0.45]]) k.ico(bx, br * 0.4, bz, br, 0, 0x8a8780, 'stone', 1.2, 0.7, 1);
    for (const [fx, fz] of [[-8.6, 7.6], [15.0, 6.2]]) {
      k.cyl(fx, 0, fz, 0.12, 0.15, 0.8, 5, 0x5d4636);
      k.cone(fx, 0.6, fz, 1.1, 3.4, 7, 0x2f4c2a);
    }
    for (const x of [1.0, 4.2]) k.box(x, F + 1.9, 4.1, 0.25, 0.4, 0.25, 0xfff1c9, 'light');
    foundationShrubs(k, r, -7.6, 0.4, 8.5, [], 4);
  },
});

/* ───────────────────────────── 18. Colonial revival estate ───────────────────────────── */

const colonialEstate = mk({
  id: 'colonialEstate',
  name: 'Colonial Estate',
  tags: ['estate'],
  x0: -8.8,
  x1: 15.5,
  z0: -5.8,
  z1: 7.6,
  zf: 4.0,
  drive: 11.5,
  draw: ({ k, r, solid }) => {
    const brickWall = r.chance(0.55);
    const wall = brickWall ? 0xffffff : r.pick([0xf2efe8, 0xe9e0c8, 0xd9cfb8]);
    const mat = brickWall ? r.pick(['brickRed', 'brickPaint', 'brickBrown']) : 'siding';
    const trim = 0xf4f1ea;
    const roofC = r.pick([0x2f3340, 0x3b3d42, 0x34394a]);
    const shut = r.pick([0x1e1e20, 0x2f4a3a, 0x24304f]);
    const F = 0.7;
    const H1 = 3.0;
    const top = F + H1 + 2.9;
    solid(0, -0.5, 16, 9);
    solid(11.5, -1.25, 7, 7.5);

    block(k, 0, -0.5, 16, 9, F, top - F, wall, mat, trim, 0x9b9893, 'stone');
    k.box(0, F + H1 - 0.1, -0.5, 16.1, 0.24, 9.1, trim);
    k.hipRoof(0, top, -0.5, 16, 9, 3.2, roofC, 'shingle', 0.6);
    for (const s of [-1, 1]) chimney(k, s * 7.2, top - 0.5, -0.5, 4.6, 0xffffff, 'brickRed');
    for (const dx of [-4.2, 0, 4.2]) {
      k.box(dx, top + 0.5, 2.6, 1.8, 1.6, 1.6, wall, mat);
      gZ(k, dx, top + 2.1, 2.6, 1.8, 1.6, 0.9, { col: roofC, trim, fill: trim, eave: 0.2, gable: 0.2 });
      win(k, dx, top + 1.0, 3.4, 0.8, 0.85, trim, { mx: 2, my: 2 });
    }
    // five-bay front with shutters
    for (const x of [-6, -3, 3, 6]) {
      win(k, x, F + 0.6, 4.0, 1.2, 1.8, trim, { mx: 2, my: 3, shut });
      win(k, x, F + H1 + 0.55, 4.0, 1.2, 1.7, trim, { mx: 2, my: 3, shut });
    }
    win(k, 0, F + H1 + 0.55, 4.0, 1.2, 1.7, trim, { mx: 2, my: 3 });
    doorAt(k, 0, F, 4.0, 1.3, 2.5, r.pick([0x1e1e20, 0x7a2c25, 0x2b4a3a]), { frame: trim, double: true });
    k.cylZ(0, F + 2.8, 4.05, 0.75, 0.08, 12, trim);
    k.cylZ(0, F + 2.8, 4.1, 0.6, 0.06, 12, P.glass, 'glass');
    // two-storey portico
    k.box(0, 0, 5.3, 6.2, F, 2.8, 0xd9d5cc, 'stone');
    for (const x of [-2.6, -0.9, 0.9, 2.6]) k.cyl(x, F, 6.2, 0.24, 0.29, top - F - 0.45, 10, trim);
    k.box(0, top - 0.45, 5.3, 6.4, 0.5, 2.6, trim);
    k.pediment(0, top + 0.05, 5.3, 6.6, 1.5, 2.6, trim);
    steps(k, 0, 6.6, 3.0, 3, F, 0xd9d5cc, 'stone');
    for (const s of [-1, 1]) side(k, s, 8, (u) => [-2.8, 1.5].forEach((zz) => {
      win(k, u(zz), F + 0.6, 0, 1.2, 1.8, trim, { mx: 2, my: 3, shut });
      win(k, u(zz), F + H1 + 0.55, 0, 1.2, 1.7, trim, { mx: 2, my: 3, shut });
    }));
    back(k, -5, (u) => [-5, -1.5, 1.5, 5].forEach((xx) => {
      win(k, u(xx), F + 0.6, 0, 1.2, 1.7, trim, { mx: 2, my: 3 });
      win(k, u(xx), F + H1 + 0.55, 0, 1.2, 1.6, trim, { mx: 2, my: 3 });
    }));
    // garage wing
    k.box(11.5, 0, -1.25, 7, 3.1, 7.5, wall, mat);
    k.box(11.5, 3.0, -1.25, 7.1, 0.2, 7.6, trim);
    k.hipRoof(11.5, 3.1, -1.25, 7, 7.5, 1.9, roofC, 'shingle', 0.4);
    for (const gx of [10.0, 13.0]) garageDoor(k, gx, 2.5, 2.5, 2.3, trim, 0xf2efe8);
    k.sphere(11.5, 5.4, -1.25, 0.3, 0xc9b06a, 'metal', 8, 6);
    // formal shrubs and lamp posts
    for (const x of [-7.4, -4.4, 4.4, 7.4]) k.ico(x, 0.65, 5.0, 0.7, 1, 0x35502a, 'paint', 1, 0.9, 1);
    for (const x of [-3.8, 3.8]) {
      k.cyl(x, 0, 7.2, 0.06, 0.08, 1.9, 6, 0x1b1f1c, 'metal');
      k.box(x, 1.9, 7.2, 0.3, 0.4, 0.3, 0xfff1c9, 'light');
    }
  },
});

/* ───────────────────────────── 19. Farmhouse ───────────────────────────── */

const farmhouseGable = mk({
  id: 'farmhouseGable',
  name: 'Farmhouse',
  tags: ['rural', 'farm'],
  x0: -6.1,
  x1: 8.0,
  z0: -9.5,
  z1: 6.5,
  zf: 3.5,
  draw: ({ c, k, r, solid }) => {
    const wall = r.pick([0xf2efe8, 0xe9e0c8, 0xe4dccb, 0xd9cfa7, 0xb8c4cc]);
    const trim = r.pick([0xf4f2ec, 0x2f4a3a, 0x7a2c25]);
    const roofC = r.pick([0x8a8e92, 0x6b2a24, 0x2f4a3a, 0x4a4c52]);
    const F = 0.7;
    const H1 = 2.8;
    const top = F + H1 + 2.6;
    solid(0, 0, 11, 7);
    solid(-1.25, -6.25, 5.5, 5.5);
    block(k, 0, 0, 11, 7, F, top - F, wall, 'siding', 0xf4f2ec, 0x8b8782, 'stone');
    k.box(0, F + H1 - 0.1, 0, 11.1, 0.2, 7.1, 0xf4f2ec);
    gX(k, 0, top, 0, 11, 7, 3.0, { col: roofC, mat: 'roofMetal', trim: 0xf4f2ec, fill: wall, fillMat: 'siding', eave: 0.45, gable: 0.4 });
    gZ(k, 0, top + 0.6, 3.0, 2.6, 1.6, 1.4, { col: roofC, mat: 'roofMetal', trim: 0xf4f2ec, fill: wall, fillMat: 'siding', eave: 0.2, gable: 0.25 });
    k.box(0, top - 0.4, 3.1, 2.6, 1.1, 0.8, wall, 'siding');
    win(k, 0, top + 0.1, 3.5, 0.8, 0.9, 0xf4f2ec, { mx: 2, my: 2 });
    // rear kitchen ell
    block(k, -1.25, -6.25, 5.5, 5.5, F, 2.7, wall, 'siding', 0xf4f2ec);
    gZ(k, -1.25, F + 2.7, -6.25, 5.5, 5.5, 2.0, { col: roofC, mat: 'roofMetal', trim: 0xf4f2ec, fill: wall, fillMat: 'siding', eave: 0.35, gable: 0.3 });
    chimney(k, -3.0, top + 0.7, -0.4, 2.3, 0xffffff, 'brickRed');
    for (const x of [-3.6, 3.6]) {
      win(k, x, F + 0.6, 3.5, 1.1, 1.7, 0xf4f2ec, { mx: 2, my: 3, shut: trim === 0xf4f2ec ? undefined : trim });
      win(k, x, F + H1 + 0.5, 3.5, 1.0, 1.5, 0xf4f2ec, { mx: 2, my: 2 });
    }
    doorAt(k, 0, F, 3.5, 1.0, 2.2, trim === 0xf4f2ec ? 0x7a2c25 : trim, { frame: 0xf4f2ec, glass: true });
    for (const s of [-1, 1]) side(k, s, 5.5, (u) => [-1.6, 1.6].forEach((zz) => {
      win(k, u(zz), F + 0.6, 0, 1.0, 1.6, 0xf4f2ec, { mx: 2, my: 2 });
      win(k, u(zz), F + H1 + 0.5, 0, 1.0, 1.4, 0xf4f2ec, { mx: 2, my: 2 });
    }));
    back(k, -9.0, (u) => win(k, u(-1.25), F + 0.7, 0, 1.0, 1.2, 0xf4f2ec, { mx: 2, my: 2 }));
    // wraparound porch
    const deck = 0x8a7a66;
    k.box(0.9, 0, 4.7, 12.8, F, 2.4, deck, 'planks');
    k.box(6.6, 0, 0.35, 2.0, F, 6.3, deck, 'planks');
    k.roof(0.9, F + 2.5, 0, 13.0, [[5.9, 0], [3.5, 0.55]], roofC, 'roofMetal', { thick: 0.13, eaveOH: 0.3, gableOH: 0.2, trim: 0xf4f2ec });
    k.at(6.5, 0.35, Math.PI / 2, () => k.roof(0, F + 2.5, 0, 6.6, [[1.1, 0], [-1.1, 0.5]], roofC, 'roofMetal', { thick: 0.13, eaveOH: 0.3, gableOH: 0.2, trim: 0xf4f2ec }));
    for (const x of [-5.3, -1.8, 1.8, 5.3, 7.3]) turnedPost(k, x, F, 5.7, 2.5, 0xf4f2ec);
    for (const zz of [3.0, -0.5, -2.6]) turnedPost(k, 7.3, F, zz, 2.5, 0xf4f2ec);
    rail(k, -5.2, -1.9, F, 5.7, 0xf4f2ec, 0.24);
    rail(k, 1.9, 7.2, F, 5.7, 0xf4f2ec, 0.24);
    railZ(k, 7.3, 5.6, -2.6, F, 0xf4f2ec, 0.26);
    steps(k, 0, 5.9, 1.8, 3, F, deck, 'planks');
    if (r.chance(0.7)) chair(k, -3.6, F, 4.9, 0.2, r.pick([0xf2efe8, 0x2f4a3a]));
    if (r.chance(0.6)) hangingPlant(k, 1.8, F + 2.5, 5.5, r);
    if (r.chance(0.5)) flagBracket(k, c, -5.3, F + 1.9, 5.8);
    woodpile(k, -6.0, -4.0, Math.PI / 2);
    foundationShrubs(k, r, -5.5, 5.5, 6.2, [[-1.2, 1.2]], 5);
  },
});

/* ───────────────────────────── 20. Lake cottage ───────────────────────────── */

const lakeCottage = mk({
  id: 'lakeCottage',
  name: 'Lake Cottage',
  tags: ['lake', 'cabin'],
  x0: -5.0,
  x1: 7.2,
  z0: -4.0,
  z1: 6.8,
  zf: 3.5,
  draw: ({ k, r, solid }) => {
    const wall = r.pick([0x6f7d6a, 0x8a3a2e, 0x5a4a3c, 0x7d8a8e, 0xb9a98b, 0x4f5f5a]);
    const trim = r.pick([0xf2efe8, 0xe9e0c8]);
    const roofC = r.pick([0x3b3d42, 0x4a4c52, 0x40483f, 0x5a4a40]);
    const F = 0.8;
    const H = 2.7;
    solid(0, 0, 9, 7);
    for (const [px, pz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) k.box(px, 0, pz, 0.5, F, 0.5, 0x8f8c86, 'concrete');
    k.box(0, F, 0, 9, H, 7, wall, 'boards');
    gX(k, 0, F + H, 0, 9, 7, 3.4, { col: roofC, trim, fill: wall, fillMat: 'boards', eave: 0.5, gable: 0.45, ridge: roofC });
    // screened porch
    k.box(-1.75, 0, 4.9, 5.5, F, 2.8, 0x7b6a56, 'planks');
    k.roof(-1.75, F + 2.4, 0, 5.8, [[6.4, 0], [3.5, 0.6]], roofC, 'shingle', { thick: 0.12, eaveOH: 0.2, gableOH: 0.2, trim });
    for (const x of [-4.4, -1.75, 0.9]) k.box(x, F, 6.2, 0.15, 2.4, 0.15, trim);
    for (const [x0, x1] of [[-4.4, -1.75], [-1.75, 0.9]]) k.box((x0 + x1) / 2, F + 0.6, 6.2, x1 - x0 - 0.15, 1.7, 0.03, 0x2a3a3a, 'glass');
    k.box(-1.75, F, 6.2, 5.4, 0.6, 0.08, trim);
    // open deck to the east
    k.box(4.6, 0, 1.0, 5.0, F, 5.0, 0x8a7a66, 'planks');
    rail(k, 2.3, 6.9, F, 3.4, trim, 0.3, 0.9);
    railZ(k, 7.0, 3.4, -1.4, F, trim, 0.3, 0.9);
    steps(k, 4.6, 3.6, 1.2, 3, F, 0x8a7a66, 'planks');
    doorAt(k, 2.6, F, 3.5, 0.95, 2.1, r.pick(DOORS), { frame: trim, glass: true });
    win(k, 1.0, F + 0.7, 3.5, 1.0, 1.3, trim, { mx: 2, my: 2 });
    win(k, 0, F + H + 0.8, 3.5, 1.2, 1.1, trim, { mx: 2, my: 2 });
    side(k, 1, 4.5, (u) => win(k, u(-1.5), F + 0.7, 0, 1.6, 1.3, trim, { mx: 2, my: 2 }));
    side(k, -1, 4.5, (u) => [-1.5, 1.5].forEach((zz) => win(k, u(zz), F + 0.7, 0, 1.0, 1.2, trim, { mx: 2, my: 2 })));
    back(k, -3.5, (u) => [-2, 2].forEach((xx) => win(k, u(xx), F + 0.8, 0, 1.0, 1.1, trim, { mx: 2, my: 2 })));
    chimney(k, -3.0, F + H + 1.0, -1.2, 2.4, 0x9b9893, 'stone');
    if (r.chance(0.7)) chair(k, 4.0, F, 1.5, Math.PI * 0.4, r.pick([0xf2efe8, 0x2f6b4a, 0xc8262c]));
    if (r.chance(0.7)) chair(k, 5.4, F, 0.2, Math.PI * 0.6, r.pick([0xf2efe8, 0x2f6b4a, 0xc8262c]));
    if (r.chance(0.6)) {
      // canoe on sawhorses
      for (const zz of [-5.4, -3.6]) k.box(5.6, 0, zz, 0.9, 0.6, 0.1, 0x8a6a46);
      k.cylZ(5.6, 0.85, -4.5, 0.35, 4.6, 6, r.pick([0xc8262c, 0x2f6b4a, 0xd27d2c]), 'gloss');
    }
    woodpile(k, -5.4, 1.5, Math.PI / 2);
  },
});

/* ───────────────────────────── extra helpers (catalogue 3) ───────────────────────────── */

/** Waist-high chain-link fence from a to b: line posts, a top rail and fine wire uprights. */
function chainLink(k: Kit, ax: number, az: number, bx: number, bz: number, h = 1.15) {
  const len = Math.hypot(bx - ax, bz - az);
  const posts = Math.max(1, Math.round(len / 2.5));
  for (let i = 0; i <= posts; i++) k.cyl(ax + ((bx - ax) * i) / posts, 0, az + ((bz - az) * i) / posts, 0.035, 0.035, h + 0.05, 5, 0x9ea2a6, 'metal');
  k.beam({ x: ax, y: h, z: az }, { x: bx, y: h, z: bz }, 0.035, 0.035, 0x9ea2a6, 'metal');
  const n = Math.max(2, Math.round(len / 0.35));
  for (let j = 0; j < n; j++) {
    const t = (j + 0.5) / n;
    fbox(k, ax + (bx - ax) * t, 0.04, az + (bz - az) * t, 0.012, h - 0.06, 0.012, 0xb4b8bb, 'metal', [2, 3]);
  }
}

/** Front-yard chain-link along z with a gate gap at gx (worn rentals and mill-town lots). */
function frontChainLink(k: Kit, x0: number, x1: number, z: number, gx: number) {
  chainLink(k, x0, z, gx - 0.7, z);
  chainLink(k, gx + 0.7, z, x1, z);
}

/* ───────────────────────────── 21. Workers' hip-roof cottage ───────────────────────────── */

const hipCottage = mk({
  id: 'hipCottage',
  name: "Workers' Hip-Roof Cottage",
  tags: ['historic', 'millworker'],
  x0: -4.7,
  x1: 4.7,
  z0: -5.1,
  z1: 7.2,
  zf: 4.0,
  draw: ({ k, r, solid }) => {
    const wall = r.pick([0xe8e6df, 0xd9cfa7, 0x9fb3c2, 0xa7b08a, 0xc9a07a, 0x8d9aa3, 0xb24a3a, 0x7b8f6a]);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const mat = r.chance(0.6) ? 'siding' : 'boards';
    const F = 0.7;
    const H = 2.7;
    const E = F + H;
    solid(0, 0, 8, 8);

    block(k, 0, 0, 8, 8, F, H, wall, mat, trim, 0x8b8782, 'concrete');
    k.hipRoof(0, E, 0, 8, 8, 2.9, roofC, r.chance(0.3) ? 'roofMetal' : 'shingle', 0.45);
    chimney(k, 0.6, E + 1.2, -0.8, 2.1, 0xffffff, 'brickRed');

    // full-width porch under a shed roof
    const deck = r.pick([0x8a7a66, 0x7b6a56, 0x9b9893]);
    k.box(0, 0, 5.2, 8.0, F, 2.4, deck, 'planks');
    k.roof(0, E - 0.4, 0, 8.4, [[6.55, 0], [4.0, 0.55]], roofC, 'shingle', { thick: 0.12, eaveOH: 0.15, gableOH: 0.2, trim });
    for (const x of [-3.8, -1.0, 1.0, 3.8]) squarePost(k, x, F, 6.2, E - 0.4 - F, trim);
    rail(k, -3.75, -1.05, F, 6.2, trim, 0.25, 0.85);
    rail(k, 1.05, 3.75, F, 6.2, trim, 0.25, 0.85);
    steps(k, 0, 6.4, 1.6, 2, F, deck, 'planks');
    doorAt(k, 0, F, 4.0, 0.95, 2.1, r.pick(DOORS), { frame: trim, glass: true });
    for (const x of [-2.4, 2.4]) win(k, x, F + 0.6, 4.0, 0.9, 1.6, trim, { mx: 1, my: 2 });
    for (const s of [-1, 1]) side(k, s, 4, (u) => [-2, 1.8].forEach((zz) => win(k, u(zz), F + 0.6, 0, 0.9, 1.5, trim, { mx: 1, my: 2, ac: s > 0 && zz < 0 && r.chance(0.4) })));
    back(k, -4, (u) => {
      win(k, u(-2), F + 0.8, 0, 0.9, 1.3, trim, { mx: 1, my: 2 });
      doorAt(k, u(1.8), F, 0, 0.9, 2.0, 0xe9e8e4, { frame: trim });
    });
    k.box(1.8, 0, -4.5, 1.4, F, 1.0, 0x9b9893, 'concrete');

    if (r.chance(0.6)) chair(k, -2.6, F, 5.0, 0.2, r.pick([0xf2efe8, 0x2f4a3a, 0x8a3a2e]));
    if (r.chance(0.4)) hangingPlant(k, -1.0, E - 0.45, 6.0, r);
    if (r.chance(0.5)) woodpile(k, -4.35, -1.5, Math.PI / 2);
    if (r.chance(0.6)) trashCans(k, -3.4, -4.75, 2);
    if (r.chance(0.35)) frontChainLink(k, -4.6, 4.6, 7.05, 0);
    else foundationShrubs(k, r, -3.8, 3.8, 6.75, [[-1.2, 1.2]], 4);
  },
});

/* ───────────────────────────── 22. Mill company house ───────────────────────────── */

const millHouse = mk({
  id: 'millHouse',
  name: 'Mill Company House',
  tags: ['historic', 'millworker'],
  x0: -4.1,
  x1: 4.1,
  z0: -7.1,
  z1: 7.6,
  zf: 4.5,
  draw: ({ k, r, solid }) => {
    // the mill built them all alike in 1923; owners have repainted and added on since
    const wall = r.pick([0xe8e6df, 0xd9cfa7, 0xc9b79c, 0x9fb3c2, 0xa7b08a, 0xb9a98b, 0x8a3a2e, 0x6f7d6a]);
    const trim = r.pick(WHITES);
    const roofC = r.pick([0x4a4c52, 0x5a4a40, 0x6b2a24, 0x40483f, 0x8a8e92]);
    const metal = r.chance(0.5);
    const mat = r.chance(0.5) ? 'boards' : 'siding';
    const F = 0.6;
    const H = 3.0;
    const E = F + H;
    solid(0, 0, 6.4, 9);

    block(k, 0, 0, 6.4, 9, F, H, wall, mat, trim, 0x8b8782, 'concrete');
    gZ(k, 0, E, 0, 6.4, 9, 3.0, { col: roofC, mat: metal ? 'roofMetal' : 'shingle', trim, fill: wall, fillMat: mat, eave: 0.35, gable: 0.3, ridge: roofC });
    chimney(k, 0, E + 1.6, -2.6, 2.0, 0xffffff, 'brickRed');
    win(k, 0, E + 0.7, 4.5, 0.8, 1.0, trim, { mx: 1, my: 2 });

    // shed-roof porch across the front
    const deck = r.pick([0x8a7a66, 0x7b6a56, 0x9a8a72]);
    k.box(0, 0, 5.7, 6.4, F, 2.4, deck, 'planks');
    k.roof(0, E - 0.35, 0, 6.8, [[7.0, 0], [4.5, 0.5]], roofC, metal ? 'roofMetal' : 'shingle', { thick: 0.12, eaveOH: 0.15, gableOH: 0.2, trim });
    for (const x of [-3.0, 3.0]) squarePost(k, x, F, 6.7, E - 0.35 - F, trim);
    rail(k, -0.6, 2.95, F, 6.7, trim, 0.25, 0.85);
    steps(k, -1.5, 6.9, 1.3, 2, F, deck, 'planks');
    doorAt(k, -1.5, F, 4.5, 0.9, 2.1, r.pick(DOORS), { frame: trim, glass: true });
    win(k, 1.4, F + 0.6, 4.5, 1.0, 1.6, trim, { mx: 1, my: 2 });
    for (const s of [-1, 1]) side(k, s, 3.2, (u) => [-2.8, 0, 2.6].forEach((zz) => win(k, u(zz), F + 0.6, 0, 0.85, 1.5, trim, { mx: 1, my: 2 })));

    if (r.chance(0.65)) {
      // lean-to added on the back
      const add = r.chance(0.5) ? wall : r.pick([0xd9cfa7, 0xb9a98b, 0xe8e6df]);
      k.box(0.8, 0, -5.6, 4.6, F + 2.3, 2.2, add, mat);
      k.roof(0.8, F + 2.3, 0, 4.9, [[-6.7, 0], [-4.5, 0.6]], roofC, metal ? 'roofMetal' : 'shingle', { thick: 0.1, eaveOH: 0.15, gableOH: 0.1, trim });
      back(k, -6.7, (u) => {
        win(k, u(1.8), F + 0.7, 0, 0.8, 0.9, trim, { mx: 1, my: 1 });
        doorAt(k, u(-0.3), 0, 0, 0.85, 2.0, 0xe9e8e4, { frame: trim });
      });
    } else {
      back(k, -4.5, (u) => doorAt(k, u(1.4), F, 0, 0.85, 2.0, 0xe9e8e4, { frame: trim }));
      k.box(1.4, 0, -5.0, 1.3, F, 1.0, 0x9b9893, 'concrete');
    }
    woodpile(k, -3.75, -2.0, Math.PI / 2);
    if (r.chance(0.5)) chair(k, 1.6, F, 5.6, -0.2, r.pick([0xf2efe8, 0x2f4a3a]));
    if (r.chance(0.4)) dish(k, 3.0, E - 0.3, -3.6, Math.PI / 2);
    if (r.chance(0.6)) trashCans(k, 2.4, -6.4, 2);
    if (r.chance(0.45)) frontChainLink(k, -4.0, 4.0, 7.45, -1.5);
  },
});

/* ───────────────────────────── 23. Minimal Traditional (1940s starter) ───────────────────────────── */

const minimalTraditional = mk({
  id: 'minimalTraditional',
  name: 'Minimal Traditional',
  tags: ['postwar', 'suburban', 'starter'],
  x0: -5.6,
  x1: 5.6,
  z0: -4.3,
  z1: 6.7,
  zf: 3.75,
  draw: ({ k, r, solid }) => {
    const wall = r.pick(WALLS);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const shut = r.chance(0.55) ? r.pick(SHUT) : undefined;
    const F = 0.45;
    const H = 2.6;
    const E = F + H;
    solid(0, 0, 10, 7.5);
    solid(-2.5, 4.5, 4, 1.5);

    block(k, 0, 0, 10, 7.5, F, H, wall, 'siding', trim, 0x8b8782, 'concrete');
    gX(k, 0, E, 0, 10, 7.5, 2.3, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.35, gable: 0.25, ridge: roofC });
    chimney(k, -3.7, E + 0.7, -1.0, 2.1, 0xffffff, r.pick(['brickRed', 'brickTan']));
    // front-gable bay with the picture window
    k.box(-2.5, 0, 4.5, 4.1, F, 1.6, 0x8b8782, 'concrete');
    k.box(-2.5, F, 4.5, 4.0, H, 1.5, wall, 'siding');
    gZ(k, -2.5, E, 3.9, 4.0, 2.7, 1.6, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.3, gable: 0.25, ridge: roofC });
    win(k, -2.5, F + 0.7, 5.25, 2.4, 1.3, trim, { mx: 3, my: 1 });
    // door on a stoop under a little metal awning
    doorAt(k, 0.9, F, 3.75, 0.95, 2.1, r.pick(DOORS), { frame: trim, glass: r.chance(0.5) });
    k.box(0.9, 0, 4.4, 1.6, F, 1.3, 0xc6c3bc, 'concrete');
    steps(k, 0.9, 5.05, 1.2, 1, F, 0xc6c3bc);
    k.box(0.9, F + 2.3, 4.2, 1.7, 0.06, 1.0, r.pick([0xe9e8e4, 0x2f4a3a, 0x7a2c25]), 'metal', { rx: -0.22 });
    win(k, 3.3, F + 0.7, 3.75, 1.2, 1.3, trim, { mx: 2, my: 2, shut });
    for (const s of [-1, 1]) side(k, s, 5, (u) => [-1.6, 1.6].forEach((zz) => win(k, u(zz), F + 0.8, 0, 1.0, 1.2, trim, { mx: 2, my: 2, ac: s < 0 && zz > 0 && r.chance(0.35) })));
    back(k, -3.75, (u) => {
      for (const xx of [-3.2, 0.4]) win(k, u(xx), F + 0.8, 0, 1.0, 1.1, trim, { mx: 2, my: 2 });
      doorAt(k, u(2.9), F, 0, 0.9, 2.0, 0xe9e8e4, { frame: trim });
    });

    if (r.chance(0.5)) hoseCoil(k, 4.6, F + 0.6, 3.8);
    if (r.chance(0.45)) dish(k, 3.4, E + 0.7, -1.5, Math.PI);
    if (r.chance(0.5)) trashCans(k, 5.0, -3.6, 2);
    if (r.chance(0.35)) bike(k, 3.2, 5.0, 0.4, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    if (r.chance(0.3)) frontChainLink(k, -5.5, 5.5, 6.55, 0.9);
    else foundationShrubs(k, r, 1.8, 4.9, 4.1, [], 3);
  },
});

/* ───────────────────────────── 24. Raised ranch (split-entry bi-level) ───────────────────────────── */

const raisedRanch = mk({
  id: 'raisedRanch',
  name: 'Raised Ranch',
  tags: ['postwar', 'suburban', '1970s'],
  x0: -6.8,
  x1: 6.8,
  z0: -7.0,
  z1: 6.8,
  zf: 4.25,
  drive: 3.6,
  draw: ({ k, r, solid }) => {
    const wall = r.pick(WALLS);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const shut = r.chance(0.55) ? r.pick(SHUT) : undefined;
    const brick = r.pick(['brickRed', 'brickTan', 'brickBrown']);
    const Lo = 2.4;
    const Up = 2.7;
    const top = Lo + Up;
    solid(0, 0, 12.5, 8.5);

    // half-sunk lower level in brick, siding above
    k.box(0, 0, 0, 12.5, Lo, 8.5, 0xffffff, brick);
    k.box(0, Lo, 0, 12.5, Up, 8.5, wall, 'siding');
    k.box(0, Lo - 0.08, 0, 12.65, 0.2, 8.65, trim);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box((sx * 12.5) / 2, Lo, (sz * 8.5) / 2, 0.16, Up, 0.16, trim);
    gX(k, 0, top, 0, 12.5, 8.5, 1.8, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.55, gable: 0.4, ridge: roofC });
    chimney(k, -4.8, top + 0.4, -1.4, 1.9, 0xffffff, brick);
    garageDoor(k, 3.6, 4.25, 4.6, 2.1, trim);

    // split foyer: the door opens onto a landing half a storey up
    const ex = -1.2;
    k.box(ex, 0, 5.0, 2.0, 1.2, 1.5, 0xc6c3bc, 'concrete');
    steps(k, ex, 5.75, 1.4, 3, 1.2, 0xc6c3bc);
    doorAt(k, ex, 1.2, 4.25, 1.0, 2.1, r.pick(DOORS), { frame: trim, glass: true });
    for (const s of [-1, 1]) fbox(k, ex + s * 0.78, 1.35, 4.27, 0.3, 1.8, 0.05, P.glass, 'glass');
    k.box(ex, 3.5, 4.8, 2.6, 0.14, 1.2, roofC);
    railZ(k, ex - 1.0, 4.3, 5.75, 1.2, 0x3a3d41, 0.3, 0.9);

    for (const x of [-5.0, -3.2]) {
      win(k, x, Lo + 0.6, 4.25, 1.3, 1.3, trim, { mx: 2, my: 2, shut });
      win(k, x, 0.5, 4.25, 1.3, 0.9, trim, { mx: 2, my: 1 });
    }
    for (const x of [2.4, 4.8]) win(k, x, Lo + 0.6, 4.25, 1.3, 1.3, trim, { mx: 2, my: 2, shut });
    for (const s of [-1, 1]) side(k, s, 6.25, (u) => [-2, 2].forEach((zz) => {
      win(k, u(zz), Lo + 0.6, 0, 1.1, 1.2, trim, { mx: 2, my: 2 });
      if (s < 0) win(k, u(zz), 0.5, 0, 1.1, 0.8, trim, { mx: 2, my: 1 });
    }));
    back(k, -4.25, (u) => {
      doorAt(k, u(-2.5), Lo, 0, 1.8, 2.1, 0xe9e8e4, { frame: trim, glass: true, double: true });
      for (const xx of [1.0, 4.0]) win(k, u(xx), Lo + 0.6, 0, 1.2, 1.2, trim, { mx: 2, my: 2 });
      for (const xx of [-4.5, 2.5]) win(k, u(xx), 0.5, 0, 1.2, 0.8, trim, { mx: 2, my: 1 });
    });
    // back deck off the kitchen
    const deck = r.pick([0x8a7a66, 0x7b6a56]);
    k.box(-2.5, Lo - 0.2, -5.45, 4.6, 0.2, 2.4, deck, 'planks');
    for (const [px, pz] of [[-4.6, -6.5], [-0.4, -6.5]]) k.box(px, 0, pz, 0.16, Lo - 0.2, 0.16, deck);
    rail(k, -4.7, -0.3, Lo, -6.6, deck, 0.25, 0.9);
    if (r.chance(0.5)) {
      // barbecue on the deck
      k.cyl(-1.4, Lo, -5.6, 0.04, 0.04, 0.6, 4, 0x2b2d31, 'metal');
      k.sphere(-1.4, Lo + 0.8, -5.6, 0.3, 0x1e1e20, 'metal', 8, 5);
    }

    if (r.chance(0.5)) hoop(k, 6.2, 4.6);
    if (r.chance(0.5)) dish(k, 3.0, top + 0.6, -2.0, Math.PI);
    if (r.chance(0.5)) trashCans(k, 6.0, -3.0, 2);
    foundationShrubs(k, r, -6.0, -2.4, 4.6, [], 3);
  },
});

/* ───────────────────────────── 25. Dutch Colonial (gambrel) ───────────────────────────── */

const dutchColonial = mk({
  id: 'dutchColonial',
  name: 'Dutch Colonial',
  tags: ['historic', 'suburban', 'postwar'],
  x0: -6.4,
  x1: 5.8,
  z0: -4.8,
  z1: 6.5,
  zf: 4.25,
  draw: ({ c, k, r, solid }) => {
    const wall = r.pick([0xe8e6df, 0xd9cfa7, 0x9fb3c2, 0xb8c4cc, 0xa7b08a, 0xc9b79c, 0x8d9aa3, 0x7b8f6a]);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const shut = r.chance(0.75) ? r.pick(SHUT) : undefined;
    const F = 0.6;
    const H = 2.8;
    const E = F + H;
    solid(0, 0, 10.5, 8.5);

    block(k, 0, 0, 10.5, 8.5, F, H, wall, 'siding', trim, 0x8b8782, 'stone');
    // gambrel: steep lower slopes hold the second storey
    k.roof(0, E, 0, 10.5, [[4.25, 0], [3.3, 2.4], [0, 3.4], [-3.3, 2.4], [-4.25, 0]], roofC, 'shingle', { trim, fill: wall, fillMat: 'siding', ridge: roofC, eaveOH: 0.4, gableOH: 0.3 });
    // full-width shed dormer on the front slope
    k.box(0, E, 3.375, 7.6, 2.25, 1.55, wall, 'siding');
    k.roof(0, E + 2.25, 0, 7.8, [[4.35, 0], [2.2, 0.55]], roofC, 'shingle', { thick: 0.12, eaveOH: 0.15, gableOH: 0.1, trim });
    for (const x of [-2.6, 0, 2.6]) win(k, x, E + 0.55, 4.15, 1.0, 1.15, trim, { mx: 2, my: 2, shut });
    // exterior end chimney
    k.box(-5.75, 0, 0, 1.0, E + 4.0, 1.3, 0xffffff, 'brickRed');
    k.box(-5.75, E + 4.0, 0, 1.15, 0.15, 1.45, 0x6c6a66);

    // entry portico
    doorAt(k, 0, F, 4.25, 1.0, 2.15, r.pick(DOORS), { frame: trim });
    k.box(0, 0, 4.95, 2.6, F, 1.4, 0xc6c3bc, 'concrete');
    for (const x of [-1.0, 1.0]) k.cyl(x, F, 5.45, 0.08, 0.09, 2.3, 6, trim);
    gZ(k, 0, F + 2.35, 4.9, 2.6, 1.6, 0.7, { col: roofC, trim, fill: trim, eave: 0.2, gable: 0.3, ridge: roofC });
    steps(k, 0, 5.65, 1.6, 2, F, 0xc6c3bc);
    for (const x of [-4.1, -2.4, 2.4, 4.1]) win(k, x, F + 0.55, 4.25, 0.9, 1.5, trim, { mx: 2, my: 3, shut });
    for (const s of [-1, 1]) side(k, s, 5.25, (u) => {
      for (const zz of [-2, 2]) win(k, u(zz), F + 0.6, 0, 0.9, 1.4, trim, { mx: 2, my: 2 });
      for (const zz of [-1.4, 1.4]) win(k, u(zz), E + 0.8, 0, 0.8, 1.1, trim, { mx: 2, my: 2 });
    });
    back(k, -4.25, (u) => [-3.5, -1.0, 1.5, 3.8].forEach((xx) => win(k, u(xx), F + 0.6, 0, 0.9, 1.3, trim, { mx: 2, my: 2 })));

    if (r.chance(0.5)) flagBracket(k, c, 1.6, F + 1.8, 4.3);
    if (r.chance(0.4)) fenceSeg(k, 5.5, 6.2, 5.5, 1.5);
    if (r.chance(0.5)) trashCans(k, 4.7, -3.8, 2);
    foundationShrubs(k, r, -4.9, 4.9, 4.6, [[-1.5, 1.5]], 6);
  },
});

/* ───────────────────────────── 26. 2000s Craftsman-style two-storey ───────────────────────────── */

const neoTraditional = mk({
  id: 'neoTraditional',
  name: 'New Craftsman Two-Storey',
  tags: ['modern', 'suburban'],
  x0: -5.2,
  x1: 12.5,
  z0: -5.1,
  z1: 7.4,
  zf: 4.5,
  drive: 8.6,
  draw: ({ k, r, solid }) => {
    const wall = r.pick([0x8a9a84, 0x9aa4a8, 0xc9b79c, 0x6f7d6a, 0xb9a98b, 0x7d8a8e, 0xd9cfb8, 0x5f6b72]);
    const accent = r.pick([0xd9cfb8, 0xe9e0c8, 0x5a4a3c, 0x8a6a4a, 0xb9a98b]);
    const trim = r.pick(WHITES);
    const roofC = r.pick(ROOFS);
    const F = 0.5;
    const H1 = 2.8;
    const top = F + H1 + 2.6;
    solid(0, 0, 9, 9);
    solid(8.6, 0.25, 7, 8);

    block(k, 0, 0, 9, 9, F, top - F, wall, 'siding', trim);
    k.box(0, F + H1 - 0.1, 0, 9.1, 0.2, 9.1, trim);
    gX(k, 0, top, 0, 9, 9, 2.4, { col: roofC, trim, fill: wall, fillMat: 'siding', eave: 0.5, gable: 0.4, ridge: roofC });
    // shingled front gable over the left bay
    gZ(k, -2.0, top, 3.0, 4.6, 3.2, 2.0, { col: roofC, trim, fill: accent, fillMat: 'shingle', eave: 0.4, gable: 0.3, ridge: roofC });
    win(k, -2.0, top + 0.45, 4.6, 0.9, 0.7, trim, { mx: 2, my: 1, noSill: true });
    k.box(0, F, 4.53, 9, 0.75, 0.08, 0x9b9893, 'stone');

    // porch on stone piers with tapered columns
    k.box(0, 0, 5.6, 9.0, F, 2.2, 0xc6c3bc, 'concrete');
    k.roof(0, F + 2.75, 0, 9.4, [[6.95, 0], [4.5, 0.5]], roofC, 'shingle', { thick: 0.13, eaveOH: 0.2, gableOH: 0.2, trim });
    for (const x of [-4.1, -0.5, 4.1]) {
      k.box(x, F, 6.4, 0.6, 0.9, 0.6, 0x9b9893, 'stone');
      taperCol(k, x, F + 0.9, 6.4, 1.75, trim);
    }
    steps(k, 1.0, 6.7, 1.6, 2, F, 0xc6c3bc);
    doorAt(k, 1.0, F, 4.5, 1.0, 2.2, r.pick(DOORS), { frame: trim, glass: true });
    fbox(k, 1.8, F + 0.3, 4.55, 0.3, 1.8, 0.05, P.glass, 'glass');
    win(k, -2.6, F + 0.8, 4.5, 2.2, 1.4, trim, { mx: 3, my: 2 });
    win(k, 3.3, F + 0.8, 4.5, 1.1, 1.4, trim, { mx: 2, my: 2 });
    for (const x of [-2.0, 0.8, 3.3]) win(k, x, F + H1 + 0.5, 4.5, 1.1, 1.3, trim, { mx: 2, my: 2 });

    // two-car garage flush with the front, gable to the street
    k.box(8.6, 0, 0.25, 7, 2.9, 8, wall, 'siding');
    k.box(8.6, 2.78, 0.25, 7.1, 0.2, 8.1, trim);
    gZ(k, 8.6, 2.9, 0.25, 7, 8, 2.1, { col: roofC, trim, fill: accent, fillMat: 'shingle', eave: 0.4, gable: 0.35, ridge: roofC });
    garageDoor(k, 8.6, 4.25, 5.6, 2.2, trim);
    for (const gx of [7.0, 10.2]) k.box(gx, 2.45, 4.32, 0.25, 0.25, 0.08, 0x2b2d31, 'metal');

    side(k, -1, 4.5, (u) => [-2, 2].forEach((zz) => {
      win(k, u(zz), F + 0.8, 0, 1.0, 1.3, trim, { mx: 2, my: 2 });
      win(k, u(zz), F + H1 + 0.5, 0, 1.0, 1.2, trim, { mx: 2, my: 2 });
    }));
    back(k, -4.5, (u) => {
      doorAt(k, u(-1.5), F, 0, 1.8, 2.1, 0xe9e8e4, { frame: trim, glass: true, double: true });
      for (const xx of [-3.6, 1.5, 3.4]) win(k, u(xx), F + H1 + 0.5, 0, 1.0, 1.2, trim, { mx: 2, my: 2 });
    });
    k.box(-1.5, 0, -5.0, 3.6, 0.15, 1.0, 0xc6c3bc, 'concrete');

    if (r.chance(0.5)) hoop(k, 11.9, 4.7);
    if (r.chance(0.4)) bike(k, 6.2, 5.2, 0.4, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    if (r.chance(0.5)) trashCans(k, 12.3, -2.5, 2);
    if (r.chance(0.5)) chair(k, -3.0, F, 5.6, 0.2, r.pick([0xf2efe8, 0x2f4a3a, 0x8a6a46]));
    foundationShrubs(k, r, -4.4, 4.4, 7.05, [[0, 2]], 5);
  },
});

/* ───────────────────────────── 27. Modern farmhouse (2010s) ───────────────────────────── */

const modernFarmhouse = mk({
  id: 'modernFarmhouse',
  name: 'Modern Farmhouse',
  tags: ['modern', 'suburban', 'rural'],
  x0: -4.7,
  x1: 10.6,
  z0: -6.0,
  z1: 7.5,
  zf: 5.5,
  draw: ({ k, r, solid }) => {
    const dark = r.chance(0.25);
    const body = dark ? r.pick([0x3a3d42, 0x2f3a33]) : r.pick([0xf4f3ef, 0xeeece6, 0xe9e6de]);
    const black = 0x1e1f22;
    const wood = r.pick([0x9a6b44, 0x8a5e3c, 0xb07a4f]);
    const roofC = dark ? 0x8a8e92 : black;
    const F = 0.5;
    const H = 3.2;
    const E = F + H;
    solid(0, 0, 8, 11);
    solid(7.0, 1.0, 6, 7);

    // tall gable-front main block in board and batten, standing-seam roof
    block(k, 0, 0, 8, 11, F, H, body, 'boards', black, 0x9b9893, 'concrete');
    gZ(k, 0, E, 0, 8, 11, 4.6, { col: roofC, mat: 'roofMetal', trim: black, fill: body, fillMat: 'boards', eave: 0.3, gable: 0.25 });
    for (const x of [-2.0, 2.0]) win(k, x, F + 0.45, 5.5, 1.1, 2.1, black, { mx: 1, my: 1 });
    win(k, 0, E + 0.7, 5.5, 1.6, 1.7, black, { mx: 2, my: 1, noSill: true });
    k.box(0, E + 2.9, 5.56, 0.5, 0.5, 0.06, black, 'metal');

    // side wing with the entry porch
    block(k, 7.0, 1.0, 6, 7, F, 2.9, body, 'boards', black, 0x9b9893, 'concrete');
    gX(k, 7.0, F + 2.9, 1.0, 6, 7, 2.4, { col: roofC, mat: 'roofMetal', trim: black, fill: body, fillMat: 'boards', eave: 0.35, gable: 0.3 });
    k.box(7.0, 0, 5.75, 6.4, F, 2.5, 0xc6c3bc, 'concrete');
    k.roof(7.0, F + 2.6, 0, 6.6, [[7.1, 0], [4.5, 0.35]], roofC, 'roofMetal', { thick: 0.1, eaveOH: 0.15, gableOH: 0.15 });
    for (const x of [4.3, 9.7]) squarePost(k, x, F, 6.8, 2.6, wood, 0.18);
    doorAt(k, 6.0, F, 4.5, 1.0, 2.3, wood, { frame: black, glass: true });
    win(k, 8.4, F + 0.5, 4.5, 1.6, 1.9, black, { mx: 2, my: 1 });
    steps(k, 6.0, 7.0, 1.6, 1, F, 0xc6c3bc);
    for (const px of [5.1, 6.9]) {
      k.cyl(px, F, 5.0, 0.28, 0.22, 0.6, 8, black);
      shrub(k, px, 5.0 + 0.0, 0.3, 0x3f5e30, 0);
    }

    for (const s of [-1, 1]) if (s < 0) side(k, s, 4, (u) => [-3, 0.5, 3.5].forEach((zz) => win(k, u(zz), F + 0.5, 0, 1.0, 1.9, black, { mx: 1, my: 1 })));
    side(k, 1, 10, (u) => win(k, u(1.0), F + 0.6, 0, 1.2, 1.4, black, { mx: 2, my: 1 }));
    back(k, -5.5, (u) => {
      doorAt(k, u(0), F, 0, 2.4, 2.3, black, { frame: black, glass: true, double: true });
      win(k, u(0), E + 0.8, 0, 1.4, 1.4, black, { mx: 2, my: 1 });
    });
    back(k, -2.5, (u) => win(k, u(7.0), F + 0.6, 0, 1.6, 1.2, black, { mx: 2, my: 1 }));

    if (r.chance(0.6)) lights(k, 4.3, F + 2.5, 6.9, 9.7, F + 2.5, 6.9, 7, 0.25);
    if (r.chance(0.6)) chair(k, 8.6, F, 5.7, -0.25, wood);
    if (r.chance(0.5)) trashCans(k, 9.9, -2.0, 2);
    foundationShrubs(k, r, -3.6, 3.6, 5.85, [], 4);
  },
});

/* ───────────────────────────── 28. Fourplex (1970s rental) ───────────────────────────── */

const fourplex = mk({
  id: 'fourplex',
  name: 'Fourplex',
  tags: ['multifamily', 'rental'],
  x0: -7.6,
  x1: 7.6,
  z0: -5.6,
  z1: 6.9,
  zf: 5.0,
  draw: ({ k, r, solid }) => {
    const wall = r.pick([0xc9b79c, 0xb9a98b, 0x8a7a66, 0xd9cfb8, 0x9a8a72, 0xa7b08a, 0x8d9aa3]);
    const brick = r.pick(['brickRed', 'brickBrown', 'brickTan']);
    const trim = r.pick([0xf2efe8, 0x5a4a3c, 0x3d2f28]);
    const roofC = r.pick(ROOFS);
    const F = 0.3;
    const H1 = 2.7;
    const top = F + H1 + 2.7;
    solid(0, 0, 14, 10);

    block(k, 0, 0, 14, 10, F, top - F, wall, 'siding', trim, 0x8b8782, 'concrete');
    k.box(0, F, 5.02, 14, H1, 0.08, 0xffffff, brick);
    k.box(0, F + H1 - 0.1, 0, 14.1, 0.2, 10.1, trim);
    k.hipRoof(0, top, 0, 14, 10, 1.7, roofC, 'shingle', 0.6);

    // centre stair-hall entry with a flat canopy
    k.box(0, 0, 5.75, 3.2, 0.2, 1.4, 0xc6c3bc, 'concrete');
    doorAt(k, 0, F, 5.06, 1.0, 2.1, r.pick(DOORS), { frame: trim, glass: true });
    k.box(0, F + 2.35, 5.65, 2.8, 0.12, 1.3, roofC);
    for (const s of [-1, 1]) k.box(s * 1.3, 0, 6.2, 0.1, F + 2.35, 0.1, 0x3a3d41, 'metal');
    win(k, 0, F + H1 + 0.4, 5.0, 1.0, 1.5, trim, { mx: 1, my: 2 });
    for (const x of [-5.0, -2.7, 2.7, 5.0]) {
      win(k, x, F + 0.8, 5.1, 1.3, 1.2, trim, { mx: 2, my: 1, ac: r.chance(0.35) });
      win(k, x, F + H1 + 0.6, 5.0, 1.3, 1.2, trim, { mx: 2, my: 1, ac: r.chance(0.35) });
    }
    for (const s of [-1, 1]) side(k, s, 7, (u) => [-2.4, 2.0].forEach((zz) => {
      win(k, u(zz), F + 0.8, 0, 1.1, 1.2, trim, { mx: 2, my: 1 });
      win(k, u(zz), F + H1 + 0.6, 0, 1.1, 1.2, trim, { mx: 2, my: 1 });
    }));
    back(k, -5, (u) => [-5, -2, 2, 5].forEach((xx) => {
      win(k, u(xx), F + 0.8, 0, 1.1, 1.1, trim, { mx: 2, my: 1 });
      win(k, u(xx), F + H1 + 0.6, 0, 1.1, 1.1, trim, { mx: 2, my: 1 });
    }));
    // mailboxes, bins and the odd satellite dish
    k.box(4.2, 0, 6.4, 1.1, 1.3, 0.45, 0x6c7075, 'metal');
    trashCans(k, -7.0, 6.2, 3);
    if (r.chance(0.6)) dish(k, -3.0, F + H1 + 1.9, 5.15, 0);
    if (r.chance(0.5)) dish(k, 3.8, F + H1 + 1.9, 5.15, 0);
    if (r.chance(0.5)) bike(k, -4.6, 6.0, 0.3, r.pick([0xc43b32, 0x2c4a8c, 0xd9a441]));
    if (r.chance(0.4)) frontChainLink(k, -7.5, 7.5, 6.8, 0);
  },
});

const HOUSES0: BuildingDef[] = [
  victorianQueenAnne,
  minersCottage,
  colonialDef,
  ranchPorchDef,
  aframeDef,
  craftsmanBungalow,
  foursquare,
  capeCod,
  splitLevel,
  ranchGarage,
  modernTwoStory,
  logCabin,
  singleWide,
  doubleWide,
  townhouseRow,
  duplex,
  lodgeEstate,
  colonialEstate,
  farmhouseGable,
  lakeCottage,
  hipCottage,
  millHouse,
  minimalTraditional,
  raisedRanch,
  dutchColonial,
  neoTraditional,
  modernFarmhouse,
  fourplex,
];
export const HOUSES: BuildingDef[] = HOUSES0;

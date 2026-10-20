import * as THREE from 'three';
import type { BuildingDef } from './catalog';
import { type Ctx, windowAt, doorAt, chimney } from './common';
import { colonial, ranch, aframeCabin } from './homes';
import { Kit, Occupancy } from '../core/kit';
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

/** Draws with every part mirrored about local x = 0 (winding fixed so faces stay outward). */
function mirrored(k: Kit, fn: () => void) {
  const host = k as unknown as { add: Kit['add'] };
  const M = new THREE.Matrix4().makeScale(-1, 1, 1);
  host.add = function (this: Kit, geo, color, mat, local, cast) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    if (local) g.applyMatrix4(local);
    g.applyMatrix4(M);
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

function rail(k: Kit, x0: number, x1: number, y: number, z: number, col: Col, step = 0.22, h = 0.9) {
  const len = x1 - x0;
  k.box((x0 + x1) / 2, y + h - 0.07, z, len, 0.07, 0.1, col);
  k.box((x0 + x1) / 2, y + 0.1, z, len, 0.07, 0.08, col);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) k.box(x0 + (len * i) / n - 0.02, y + 0.17, z - 0.02, 0.045, h - 0.24, 0.045, col);
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
  k.box(x, y, z, 0.2, 0.2, 0.2, col);
  k.cyl(x, y + 0.2, z, 0.065, 0.075, h - 0.5, 6, col);
  k.cyl(x, y + h * 0.5 - 0.1, z, 0.1, 0.1, 0.16, 6, col);
  k.box(x, y + h - 0.3, z, 0.22, 0.3, 0.22, col);
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
    shrub(k, x, z, r.range(0.35, 0.6), r.chance(0.7) ? col : r.pick(GREENS), r.chance(0.5) ? 0 : 1);
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
    k.box(0, F + H1, 0, 9, H1, 8.2, p.up, 'shingle');
    k.box(0, F + H1 - 0.1, 0, 9.14, 0.22, 8.34, trim);
    k.box(0, top - 0.25, 0, 9.14, 0.3, 8.34, trim);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(sx * 4.5, F, sz * 4.1, 0.16, H1 * 2, 0.16, trim);
    // front bay
    k.box(bayX, 0, 4.4, 3.92, F, 1.92, stoneC, 'stone');
    k.box(bayX, F, 4.4, 3.8, H1, 1.8, p.wall, 'siding');
    k.box(bayX, F + H1, 4.4, 3.8, H1, 1.8, p.up, 'shingle');
    k.box(bayX, F + H1 - 0.1, 4.4, 3.94, 0.22, 1.94, trim);
    k.box(bayX, top - 0.25, 4.4, 3.94, 0.3, 1.94, trim);
    for (const sx of [-1, 1]) k.box(bayX + sx * 1.9, F, 5.3, 0.16, H1 * 2, 0.16, trim);
    // turret
    k.cyl(tx, 0, tz, 1.62, 1.62, F, 8, stoneC, 'stone');
    cylTex(k, tx, F, tz, 1.5, 1.5, H1, 8, p.wall, 'siding');
    cylTex(k, tx, F + H1, tz, 1.5, 1.5, H1, 8, p.up, 'shingle');
    k.cyl(tx, F + H1 - 0.1, tz, 1.58, 1.58, 0.22, 8, trim);
    k.cyl(tx, top - 0.3, tz, 1.66, 1.66, 0.34, 8, trim);
    k.cone(tx, top, tz, 2.0, 4.6, 8, roofC, 'paint');
    k.cone(tx, top + 4.55, tz, 0.07, 0.8, 5, p.acc, 'metal');
    k.sphere(tx, top + 4.55, tz, 0.14, 0xd8b44a, 'metal', 6, 4);
    for (const phi of [-Math.PI / 8, Math.PI / 8, (3 * Math.PI) / 8, (5 * Math.PI) / 8]) {
      k.at(tx + 1.386 * Math.sin(phi), tz + 1.386 * Math.cos(phi), phi, () => {
        windowAt(k, 0, F + 0.85, 0, 0.5, 1.5, { frame: trim, mx: 1, my: 3 });
        windowAt(k, 0, F + H1 + 0.7, 0, 0.5, 1.5, { frame: trim, mx: 1, my: 3 });
      });
    }
    // roofs
    k.hipRoof(0, top, 0, 9, 8.2, 3.6, roofC, 'shingle', 0.6);
    gZ(k, bayX, top, 2.45, 3.8, 5.7, 2.9, { col: roofC, trim, fill: p.up, fillMat: 'shingle', eave: 0.3, gable: 0.4, ridge: roofC });
    k.cylZ(bayX, top + 1.1, 5.35, 0.36, 0.08, 8, trim);
    k.cylZ(bayX, top + 1.1, 5.4, 0.28, 0.09, 8, P.glass, 'glass');
    for (let i = 0; i < 3; i++) k.box(bayX + (i - 1) * 0.55, top + 0.18, 5.34, 0.3, 0.3, 0.05, p.acc, 'paint', { rz: Math.PI / 4 });
    chimney(k, -3.0, 8.0, -2.4, 3.2, 0xffffff, 'brickRed');
    // windows
    const w = { frame: trim, mx: 2, my: 3 };
    for (const wx of [-3.35, -1.25]) {
      windowAt(k, wx, F + 0.55, 5.3, 1.1, 1.8, { ...w, shutters: undefined });
      windowAt(k, wx, F + H1 + 0.55, 5.3, 1.1, 1.7, w);
    }
    side(k, -1, 4.2, (u) => {
      windowAt(k, u(4.4), F + 0.55, 0, 0.9, 1.6, w);
      windowAt(k, u(4.4), F + H1 + 0.55, 0, 0.9, 1.6, w);
    });
    doorAt(k, 0.5, F, 4.1, 1.0, 2.25, door, { frame: trim, glass: true });
    windowAt(k, 0.5, F + H1 + 0.55, 4.1, 1.1, 1.7, w);
    side(k, -1, 4.5, (u) => {
      for (const zz of [1.0, -2.2]) {
        windowAt(k, u(zz), F + 0.55, 0, 1.0, 1.7, w);
        windowAt(k, u(zz), F + H1 + 0.55, 0, 1.0, 1.7, w);
      }
    });
    side(k, 1, 4.5, (u) => {
      for (const zz of [-0.4, -3.0]) {
        windowAt(k, u(zz), F + 0.55, 0, 1.0, 1.7, w);
        windowAt(k, u(zz), F + H1 + 0.55, 0, 1.0, 1.7, w);
      }
    });
    back(k, -4.1, (u) => {
      for (const xx of [-2.8, 0, 2.8]) {
        windowAt(k, u(xx), F + 0.7, 0, 1.0, 1.5, w);
        windowAt(k, u(xx), F + H1 + 0.55, 0, 1.0, 1.7, w);
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
    windowAt(k, -1.3, F + 0.55, zf, 0.8, 1.55, { frame: trim, mx: 1, my: 2, shutters: r.chance(0.4) ? r.pick(SHUT) : undefined });
    windowAt(k, 0.15, F + 0.55, zf, 0.7, 1.55, { frame: trim, mx: 1, my: 2 });
    for (const s of [-1, 1]) {
      side(k, s, 3, (u) => {
        windowAt(k, u(1.6), F + 0.6, 0, 0.8, 1.5, { frame: trim, mx: 1, my: 2 });
        windowAt(k, u(-1.6), F + 0.6, 0, 0.8, 1.5, { frame: trim, mx: 1, my: 2 });
      });
    }
    back(k, -6.2, (u) => windowAt(k, u(-0.8), F + 0.65, 0, 0.8, 1.2, { frame: trim, mx: 1, my: 2 }));
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

/* @@MORE */

export const HOUSES: BuildingDef[] = [victorianQueenAnne, minersCottage, colonialDef, ranchPorchDef, aframeDef];

import type { Kit, Col } from '../core/kit';
import type { Rng } from '../core/rng';

/**
 * Walk-in interiors. A `shell` replaces a building's solid block with real walls, see-through glazing and an
 * open doorway; the `furnish*` functions lay out a room inside it. Every shell registers a zone so the player
 * on foot stands on its floor and the camera knows there is a ceiling overhead.
 */

export interface Zone {
  cx: number;
  cz: number;
  hw: number;
  hd: number;
  c: number;
  s: number;
  /** Floor height at the back (-Z) and front (+Z) edge: equal for a room, different for a stair. */
  yb: number;
  yf: number;
  /** Ceiling height, or undefined outdoors (porches, stairs). */
  ceil?: number;
}

const ZONES: Zone[] = [];

/** Every enclosed room (zones with a ceiling). */
export function rooms(): Zone[] {
  return ZONES.filter((z) => z.ceil !== undefined);
}

export function clearZones() {
  ZONES.length = 0;
  DOORS.length = 0;
}

/** An open doorway in an outside wall: its sill, and the unit vector pointing out of the building. */
export interface Doorway {
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
  w: number;
}
const DOORS: Doorway[] = [];
export const doorways = () => DOORS;
/** Records a doorway at local (x, y, z) whose outside is local +Z (the townsfolk use these to go in and out). */
export function addDoorway(k: Kit, x: number, y: number, z: number, w: number) {
  const p = k.toWorld(x, y, z);
  const q = k.toWorld(x, y, z + 1);
  DOORS.push({ x: p.x, y: p.y, z: p.z, nx: q.x - p.x, nz: q.z - p.z, w });
}

/** A walkable floor (local rectangle centred on x, z); `yBack`/`yFront` differ to make a ramp out of a stair. */
export function addZone(k: Kit, x: number, z: number, w: number, d: number, yBack: number, yFront = yBack, ceil?: number) {
  const p = k.toWorld(x, 0, z);
  const ry = k.worldYaw(0);
  ZONES.push({ cx: p.x, cz: p.z, hw: w / 2, hd: d / 2, c: Math.cos(ry), s: Math.sin(ry), yb: p.y + yBack, yf: p.y + yFront, ceil: ceil === undefined ? undefined : p.y + ceil });
}

/** The floor under a point: the highest one the walker at height `y` could step onto. */
export function zoneAt(x: number, z: number, y?: number): { floor: number; ceil?: number } | null {
  let best: { floor: number; ceil?: number } | null = null;
  for (const r of ZONES) {
    const dx = x - r.cx;
    const dz = z - r.cz;
    if (Math.abs(dx) > r.hw + r.hd || Math.abs(dz) > r.hw + r.hd) continue;
    const lx = dx * r.c - dz * r.s;
    const lz = dx * r.s + dz * r.c;
    if (Math.abs(lx) > r.hw || Math.abs(lz) > r.hd) continue;
    const floor = r.yb + (r.yf - r.yb) * (lz / r.hd / 2 + 0.5);
    if (y !== undefined && floor > y + 0.6) continue;
    if (!best || floor > best.floor) best = { floor, ceil: r.ceil };
  }
  return best;
}

export interface Opening {
  /** Centre along the wall, in the building's own x (front/back walls) or z (side walls). */
  x: number;
  w: number;
  /** Sill height above the floor and height of the opening. */
  y?: number;
  h: number;
  door?: boolean;
}

export interface ShellOpts {
  w: number;
  d: number;
  /** Floor level and clear height. */
  y0: number;
  h: number;
  t?: number;
  wall: Col;
  wallMat: string;
  lining?: Col;
  floor?: Col;
  floorMat?: string;
  frame?: Col;
  front?: Opening[];
  back?: Opening[];
  left?: Opening[];
  right?: Opening[];
  /** Walls left out (another volume joins there). */
  skip?: string;
  lights?: number;
}

/** Indoor surfaces only ever see the cool sky fill, so they are tinted towards lamplight. */
const warm = (k: Kit, fn: () => void) => {
  const was = k.indoor;
  k.indoor = true;
  k.tinted(1.5, 1.27, 1.0, fn);
  k.indoor = was;
};

/** Runs a `furnish*` layout on a shell's floor. */
export function room(k: Kit, y0: number, fn: () => void) {
  k.at(0, 0, 0, () => warm(k, fn), y0);
}

function wall(k: Kit, len: number, o: ShellOpts, ops: Opening[], flip: number) {
  const t = o.t ?? 0.3;
  const { y0, h } = o;
  const lin = o.lining ?? 0xe9e4d8;
  const fr = o.frame ?? 0x37322e;
  const seg = (xc: number, yb: number, w: number, hh: number, solid: boolean) => {
    if (w < 0.02 || hh < 0.02) return;
    k.box(xc, y0 + yb, 0, w, hh, t, o.wall, o.wallMat);
    warm(k, () => k.box(xc, y0 + yb, -t / 2 - 0.012, w, hh, 0.024, lin, 'paint', { cast: false }));
    if (solid) k.solid(xc, 0, w, t);
  };
  const list = ops.map((p) => ({ ...p, x: p.x * flip, y: p.y ?? 0 })).sort((a, b) => a.x - b.x);
  let cur = -len / 2;
  for (const p of list) {
    const a = p.x - p.w / 2;
    seg((cur + a) / 2, 0, a - cur, h, true);
    seg(p.x, p.y + p.h, p.w, h - p.y - p.h, false);
    for (const s of [-1, 1]) k.box(p.x + s * (p.w / 2 - 0.035), y0 + p.y, 0, 0.07, p.h, t + 0.08, fr);
    k.box(p.x, y0 + p.y + p.h - 0.07, 0, p.w, 0.07, t + 0.08, fr);
    if (p.door) {
      // leaves stand open into the room
      const n = p.w > 1.7 ? 2 : 1;
      const lw = p.w / n - 0.08;
      for (let i = 0; i < n; i++) {
        const hx = p.x + (i === 0 ? -1 : 1) * (p.w / 2 - 0.06);
        const hz = -t / 2 - lw / 2 - 0.02;
        k.box(hx, y0 + 0.02, hz, 0.05, 0.3, lw, fr);
        k.box(hx, y0 + 0.32, hz, 0.03, p.h - 0.5, lw - 0.1, 0xbfd6dc, 'clear', { cast: false });
        k.box(hx, y0 + p.h - 0.2, hz, 0.05, 0.1, lw, fr);
        for (const e of [-1, 1]) k.box(hx, y0 + 0.02, hz + e * (lw / 2 - 0.03), 0.05, p.h - 0.12, 0.06, fr);
        k.solid(hx, hz, 0.12, lw);
      }
    } else {
      seg(p.x, 0, p.w, p.y, false);
      k.solid(p.x, 0, p.w, t);
      k.box(p.x, y0 + p.y, 0, p.w, p.h, 0.03, 0xbfd6dc, 'clear', { cast: false });
      k.box(p.x, y0 + p.y, 0, p.w, 0.07, t + 0.14, fr);
      const n = Math.max(1, Math.round(p.w / 1.8));
      for (let i = 1; i < n; i++) k.box(a + (p.w * i) / n, y0 + p.y, 0, 0.06, p.h, 0.08, fr);
    }
    cur = p.x + p.w / 2;
  }
  seg((cur + len / 2) / 2, 0, len / 2 - cur, h, true);
}

/** Hollow building: four walls with openings, floor, ceiling with light panels. Returns the inner half-size. */
export function shell(k: Kit, o: ShellOpts): { a: number; b: number } {
  const t = o.t ?? 0.3;
  const { w, d, y0, h } = o;
  const skip = o.skip ?? '';
  if (!skip.includes('f')) k.at(0, d / 2 - t / 2, 0, () => wall(k, w, o, o.front ?? [], 1));
  if (!skip.includes('b')) k.at(0, -d / 2 + t / 2, Math.PI, () => wall(k, w, o, o.back ?? [], -1));
  if (!skip.includes('r')) k.at(w / 2 - t / 2, 0, Math.PI / 2, () => wall(k, d - 2 * t, o, o.right ?? [], -1));
  if (!skip.includes('l')) k.at(-w / 2 + t / 2, 0, -Math.PI / 2, () => wall(k, d - 2 * t, o, o.left ?? [], 1));
  const a = w / 2 - t;
  const b = d / 2 - t;
  warm(k, () => {
    k.box(0, y0 - 0.03, 0, a * 2, 0.05, b * 2, o.floor ?? 0xffffff, o.floorMat ?? 'planks', { cast: false });
    k.box(0, y0 + h - 0.08, 0, a * 2, 0.08, b * 2, 0xf1eee6, 'paint', { cast: false });
  });
  const step = o.lights ?? 4.6;
  const nx = Math.max(1, Math.round((a * 2) / step));
  const nz = Math.max(1, Math.round((b * 2) / step));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const lx = -a + ((i + 0.5) * a * 2) / nx;
      const lz = -b + ((j + 0.5) * b * 2) / nz;
      warm(k, () => {
        k.box(lx, y0 + h - 0.14, lz, 1.25, 0.05, 0.32, 0xfff1d8, 'light', { cast: false });
        k.box(lx, y0 + h - 0.1, lz, 1.4, 0.03, 0.46, 0xd9d6cf, 'paint', { cast: false });
      });
    }
  addZone(k, 0, 0, w, d, y0, y0, y0 + h);
  return { a, b };
}

/** Furniture blocks the walker but not the camera above it. */
const low = (k: Kit, x: number, z: number, w: number, d: number, h = 1.3) => k.solid(x, z, w, d, 0, h);

const OAK = 0x7a5534;
const DARKWOOD = 0x4d3422;
const STEELC = 0xc9ccd0;
const PRODUCTS = [0xc0392b, 0xe6a23c, 0x2e86c1, 0x3f9b5b, 0xf2efe6, 0x8e5bb5, 0xe8c547, 0xd9662b, 0x1f6f6a];

/** Furniture is laid out in the room's own frame with y = 0 at the floor; anything waist-high is solid. */
function counter(k: Kit, x: number, z: number, len: number, ry: number, body: Col, top: Col, depth = 0.65, h = 1.0) {
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, len, h - 0.05, depth - 0.08, body);
    k.box(0, h - 0.05, 0, len + 0.06, 0.05, depth, top, 'gloss');
    low(k, 0, 0, len, depth);
  });
}

function stool(k: Kit, x: number, z: number, seat: Col) {
  k.cyl(x, 0, z, 0.2, 0.22, 0.03, 8, STEELC, 'chrome');
  k.cyl(x, 0.03, z, 0.035, 0.035, 0.62, 6, STEELC, 'chrome');
  k.cyl(x, 0.65, z, 0.19, 0.17, 0.09, 10, seat, 'gloss');
}

function chair(k: Kit, x: number, z: number, ry: number, col: Col) {
  k.at(x, z, ry, () => {
    k.box(0, 0.42, 0, 0.42, 0.05, 0.42, col);
    k.box(0, 0.47, -0.19, 0.42, 0.45, 0.05, col);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(sx * 0.18, 0, sz * 0.18, 0.04, 0.42, 0.04, 0x2a2623);
  });
}

function table(k: Kit, x: number, z: number, w: number, d: number, top: Col, h = 0.74) {
  k.box(x, h - 0.05, z, w, 0.05, d, top, 'gloss');
  k.cyl(x, 0, z, 0.05, 0.05, h - 0.05, 6, 0x3a3a3c, 'metal');
  k.cyl(x, 0, z, 0.05, 0.05, h - 0.05, 6, 0x3a3a3c, 'metal');
  k.cyl(x, 0, z, 0.26, 0.28, 0.03, 8, 0x3a3a3c, 'metal');
  low(k, x, z, w * 0.8, d * 0.8);
}

function tableSet(k: Kit, x: number, z: number, top: Col, col: Col) {
  table(k, x, z, 0.85, 0.85, top);
  chair(k, x - 0.7, z, -Math.PI / 2, col);
  chair(k, x + 0.7, z, Math.PI / 2, col);
}

/** Diner booth: two benches facing each other across a table; long axis along local X. */
function booth(k: Kit, x: number, z: number, ry: number, vinyl: Col) {
  k.at(x, z, ry, () => {
    for (const s of [-1, 1]) {
      k.box(s * 0.72, 0, 0, 0.5, 0.45, 1.2, vinyl, 'gloss');
      k.box(s * 0.93, 0.45, 0, 0.1, 0.62, 1.2, vinyl, 'gloss');
      k.box(s * 0.93, 1.07, 0, 0.12, 0.04, 1.22, STEELC, 'chrome');
    }
    k.box(0, 0.7, 0, 0.72, 0.05, 1.1, 0xe9e2d2, 'gloss');
    k.box(0, 0.69, 0, 0.75, 0.02, 1.13, STEELC, 'chrome');
    k.cyl(0, 0, 0, 0.05, 0.05, 0.7, 6, STEELC, 'chrome');
    for (const s of [-1, 1]) k.box(0.1 * s, 0.75, 0.42, 0.05, 0.1, 0.05, s > 0 ? 0xc0392b : 0xe8c547);
    low(k, 0, 0, 2.0, 1.2);
  });
}

/** Free-standing retail shelf (or wall shelf when `oneSided`), products facing ±Z. */
function shelf(k: Kit, rng: Rng, x: number, z: number, len: number, ry: number, oneSided = false, h = 1.55) {
  k.at(x, z, ry, () => {
    const dp = oneSided ? 0.42 : 0.84;
    k.box(0, 0, 0, len, 0.12, dp, 0x8d9094);
    k.box(0, 0.12, oneSided ? -dp / 2 + 0.02 : 0, len, h - 0.12, 0.04, 0xdedbd2);
    for (const e of [-1, 1]) k.box(e * (len / 2 - 0.02), 0, 0, 0.04, h, dp, 0xdedbd2);
    const rows = Math.floor((h - 0.2) / 0.42);
    for (let r = 0; r < rows; r++) {
      const y = 0.14 + r * 0.42;
      k.box(0, y - 0.03, 0, len - 0.06, 0.03, dp - 0.04, 0xdedbd2);
      for (const side of oneSided ? [1] : [-1, 1]) {
        let px = -len / 2 + 0.08;
        while (px < len / 2 - 0.3) {
          const pw = rng.range(0.25, 0.6);
          const ph = rng.range(0.16, 0.34);
          const cz = oneSided ? 0.03 : side * (dp / 4 + 0.01);
          k.box(px + pw / 2, y, cz, Math.min(pw, len / 2 - px - 0.06), ph, dp / (oneSided ? 1.4 : 2.6), rng.pick(PRODUCTS), 'paint', { cast: false });
          px += pw + 0.03;
        }
      }
    }
    low(k, 0, 0, len, dp);
  });
}

/** Glass-door drinks cooler against a wall, facing +Z. */
function cooler(k: Kit, rng: Rng, x: number, z: number, len: number, ry: number) {
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, len, 2.1, 0.7, 0x2b2f33);
    k.box(0, 0.18, 0.2, len - 0.1, 1.74, 0.34, 0xeef3f5, 'gloss', { cast: false });
    k.box(0, 1.95, 0.36, len - 0.1, 0.05, 0.05, 0xdff3ff, 'light', { cast: false });
    for (let r = 0; r < 4; r++) for (let i = 0; i < Math.floor(len / 0.2) - 1; i++) k.box(-len / 2 + 0.2 + i * 0.2, 0.22 + r * 0.43, 0.3, 0.13, 0.26, 0.13, rng.pick(PRODUCTS), 'gloss', { cast: false });
    const n = Math.max(1, Math.round(len / 0.8));
    for (let i = 0; i <= n; i++) k.box(-len / 2 + (len * i) / n, 0.12, 0.38, 0.06, 1.9, 0.05, 0x9da1a5, 'metal');
    k.box(0, 0.16, 0.39, len, 1.8, 0.02, 0xbfd6dc, 'clear', { cast: false });
    low(k, 0, 0, len, 0.7);
  });
}

function register(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    k.box(0, 1.0, 0, 0.42, 0.16, 0.4, 0x3b3f43);
    k.box(0, 1.16, -0.1, 0.36, 0.2, 0.08, 0x2a2d30, 'paint', { rx: -0.35 });
    k.box(0, 1.2, -0.05, 0.3, 0.14, 0.02, 0x7fe0a0, 'light', { rx: -0.35, cast: false });
  });
}

function desk(k: Kit, x: number, z: number, ry: number, wood: Col = OAK) {
  k.at(x, z, ry, () => {
    k.box(0, 0.72, 0, 1.6, 0.05, 0.8, wood, 'gloss');
    for (const s of [-1, 1]) k.box(s * 0.55, 0, 0, 0.45, 0.72, 0.74, wood);
    k.box(0, 0.3, -0.36, 0.7, 0.42, 0.03, wood);
    k.box(-0.3, 0.77, -0.12, 0.44, 0.36, 0.36, 0xd8d3c4);
    k.box(-0.3, 0.83, 0.065, 0.34, 0.26, 0.01, 0x243b3a, 'glass', { cast: false });
    k.box(0.35, 0.77, 0.1, 0.3, 0.03, 0.4, 0xf4f1ea);
    k.box(0.6, 0.77, -0.2, 0.12, 0.26, 0.12, 0x2f6b4a);
    low(k, 0, 0, 1.6, 0.8);
  });
  chair(k, x + Math.sin(ry) * 0.75, z + Math.cos(ry) * 0.75, ry + Math.PI, 0x2f3338);
}

function cabinet(k: Kit, x: number, z: number, ry: number, n = 2, col: Col = 0x8e9488) {
  k.at(x, z, ry, () => {
    for (let i = 0; i < n; i++) {
      const cx = (i - (n - 1) / 2) * 0.5;
      k.box(cx, 0, 0, 0.48, 1.35, 0.6, col);
      for (let r = 0; r < 4; r++) k.box(cx, 0.1 + r * 0.32, 0.31, 0.16, 0.03, 0.03, 0xd9d9d9, 'metal', { cast: false });
    }
    low(k, 0, 0, n * 0.5, 0.6);
  });
}

function pew(k: Kit, x: number, z: number, len: number, ry: number, wood: Col = OAK) {
  k.at(x, z, ry, () => {
    k.box(0, 0.4, 0, len, 0.06, 0.45, wood, 'gloss');
    k.box(0, 0.4, -0.22, len, 0.55, 0.06, wood, 'gloss');
    for (const e of [-1, 1]) k.box(e * (len / 2 - 0.03), 0, -0.02, 0.06, 0.95, 0.5, wood, 'gloss');
    low(k, 0, 0, len, 0.5);
  });
}

function sofa(k: Kit, x: number, z: number, ry: number, col: Col, len = 2.0) {
  k.at(x, z, ry, () => {
    k.box(0, 0.1, 0, len, 0.34, 0.85, col);
    k.box(0, 0.44, -0.33, len, 0.42, 0.2, col);
    for (const e of [-1, 1]) k.box(e * (len / 2 - 0.1), 0.1, 0, 0.2, 0.52, 0.85, col);
    low(k, 0, 0, len, 0.85);
  });
}

function poolTable(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    k.box(0, 0.62, 0, 2.5, 0.2, 1.35, DARKWOOD, 'gloss');
    k.box(0, 0.82, 0, 2.3, 0.02, 1.15, 0x2f7a4d, 'paint', { cast: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(sx * 1.05, 0, sz * 0.5, 0.16, 0.62, 0.16, DARKWOOD);
    for (const [bx, bz, bc] of [[0.4, 0.1, 0xc0392b], [0.52, -0.05, 0xe8c547], [-0.6, 0.2, 0xf4f1ea], [0.5, 0.22, 0x2e4a7c], [0.1, -0.3, 0x1a1a1a]] as [number, number, Col][]) k.sphere(bx, 0.87, bz, 0.035, bc, 'gloss', 6, 4);
    k.box(-0.2, 0.84, -0.35, 1.4, 0.02, 0.025, 0xc9a26b, 'paint', { ry: 0.3, cast: false });
    low(k, 0, 0, 2.5, 1.35);
  });
  // lamp over the table
  k.box(x, 2.0, z, ry ? 0.45 : 1.5, 0.14, ry ? 1.5 : 0.45, 0x2f6b4a);
  k.box(x, 1.99, z, ry ? 0.35 : 1.35, 0.02, ry ? 1.35 : 0.35, 0xfff0c8, 'light', { cast: false });
}

function rug(k: Kit, x: number, z: number, w: number, d: number, col: Col) {
  k.box(x, 0.022, z, w, 0.015, d, col, 'paint', { cast: false });
  k.box(x, 0.024, z, w - 0.4, 0.015, d - 0.4, 0xd8cdb4, 'paint', { cast: false });
  k.box(x, 0.026, z, w - 0.8, 0.015, d - 0.8, col, 'paint', { cast: false });
}

function bottles(k: Kit, rng: Rng, x: number, y: number, z: number, len: number) {
  for (let px = -len / 2 + 0.08; px < len / 2; px += 0.14) k.box(x + px, y, z, 0.07, rng.range(0.22, 0.34), 0.07, rng.pick([0x2f6b4a, 0x7a4a1e, 0xd8d3c4, 0x1d3b2a, 0xb5651d, 0x9b2335]), 'gloss', { cast: false });
}

/** Picture, noticeboard or neon on a wall; faces +Z at local z. */
function plaque(k: Kit, x: number, y: number, z: number, w: number, h: number, col: Col, ry = 0, mat = 'paint') {
  k.at(x, z, ry, () => {
    k.box(0, y - 0.04, 0, w + 0.08, h + 0.08, 0.03, 0x3a2c20, 'paint', { cast: false });
    k.box(0, y, 0.012, w, h, 0.02, col, mat, { cast: false });
  });
}

// ---- rooms: `a`, `b` are the inner half-width and half-depth; the door is in the front (+Z) wall at doorX ----

export function furnishStore(k: Kit, rng: Rng, a: number, b: number, doorX: number, coolers = false) {
  const side = doorX > 0 ? -1 : 1;
  const cx = Math.max(-a + 1.6, Math.min(a - 1.6, doorX + side * 2.9));
  counter(k, cx, b - 2.4, 2.4, 0, OAK, 0xd8d3c4);
  register(k, cx - 0.6, b - 2.4, 0);
  k.box(cx + 0.7, 1.0, b - 2.4, 0.5, 0.3, 0.35, 0xc0392b);
  const z0 = -b + (coolers ? 2.4 : 1.8);
  const z1 = b - 4.4;
  if (z1 - z0 > 1.5) {
    const n = Math.max(1, Math.floor((a * 2 - 2.6) / 2.5));
    for (let i = 0; i < n; i++) shelf(k, rng, -a + 1.3 + ((i + 0.5) * (a * 2 - 2.6)) / n, (z0 + z1) / 2, z1 - z0, Math.PI / 2);
  }
  for (const s of [-1, 1]) shelf(k, rng, s * (a - 0.23), -1, b * 2 - 5, (-s * Math.PI) / 2, true, 1.9);
  if (coolers) cooler(k, rng, 0, -b + 0.37, a * 2 - 1.2, 0);
  else shelf(k, rng, 0, -b + 0.23, a * 2 - 1.4, 0, true, 1.9);
  plaque(k, cx, 2.4, b - 0.02, 1.6, 0.5, 0xe8c547, Math.PI);
}

export function furnishDiner(k: Kit, a: number, b: number, doorX: number) {
  const red = 0xb8322c;
  // back bar, counter and a row of stools
  counter(k, 0.6, -b + 0.36, a * 2 - 2.4, 0, 0xb9bcc0, STEELC, 0.7, 0.92);
  k.box(0.6, 2.0, -b + 0.3, a * 2 - 4, 0.5, 0.6, STEELC, 'metal');
  for (let i = 0; i < 3; i++) {
    k.box(-3 + i * 3, 0.92, -b + 0.36, 0.4, 0.45, 0.35, i === 1 ? 0x2a2a2c : STEELC, i === 1 ? 'paint' : 'chrome');
    plaque(k, -4 + i * 4, 2.75, -b + 0.02, 2.2, 0.7, i === 1 ? 0x1f6f6a : 0xf4f1ea);
  }
  const cz = -b + 2.2;
  counter(k, 0.6, cz, a * 2 - 4.2, 0, 0x1f6f6a, 0xe9e2d2, 0.7, 1.05);
  k.box(0.6, 1.02, cz + 0.36, a * 2 - 4.2, 0.04, 0.03, STEELC, 'chrome');
  register(k, -a + 3.2, cz, 0);
  k.box(a - 3.6, 1.05, cz, 0.6, 0.4, 0.45, 0xdfe8ea, 'gloss');
  for (let x = -a + 3.6; x < a - 2.2; x += 1.05) stool(k, x, cz + 0.85, red);
  // booths along the front windows
  for (let x = -a + 1.3; x < a - 1.0; x += 2.25) if (Math.abs(x - doorX) > 2.0) booth(k, x, b - 0.68, 0, red);
  for (let x = -a + 2.4; x < a - 2; x += 3.2) if (Math.abs(x - doorX) > 2.4) tableSet(k, x, b - 2.7, 0xe9e2d2, 0x8f2d28);
  // jukebox
  k.box(a - 0.5, 0, 0.6, 0.6, 1.35, 0.9, 0x7a2f24, 'gloss');
  k.box(a - 0.82, 0.75, 0.6, 0.03, 0.45, 0.7, 0xffc86a, 'light', { cast: false });
  low(k, a - 0.5, 0.6, 0.6, 0.9);
}

export function furnishBar(k: Kit, rng: Rng, a: number, b: number, doorX: number) {
  const side = doorX > 0 ? -1 : 1;
  const bx = side * (a - 1.75);
  const len = b * 2 - 4.6;
  const zc = -b + 1 + len / 2;
  // back-bar with bottles, the bar itself, brass rail and stools
  k.at(side * (a - 0.2), zc, (-side * Math.PI) / 2, () => {
    k.box(0, 0, 0, len, 0.95, 0.4, DARKWOOD, 'gloss');
    k.box(0, 0.95, -0.12, len, 1.5, 0.12, DARKWOOD);
    k.box(0, 1.1, -0.04, len - 0.4, 1.1, 0.02, 0x9fb4b8, 'glass', { cast: false });
    for (const y of [0.97, 1.45, 1.9]) {
      k.box(0, y - 0.03, 0.05, len, 0.03, 0.26, DARKWOOD);
      bottles(k, rng, 0, y, 0.06, len - 0.3);
    }
    low(k, 0, 0, len, 0.4);
  });
  counter(k, bx, zc, len, Math.PI / 2, DARKWOOD, 0x6b4428, 0.7, 1.08);
  k.box(bx - side * 0.42, 0.18, zc, 0.04, 0.04, len, 0xc9a24a, 'metal');
  for (let z = zc - len / 2 + 0.6; z < zc + len / 2 - 0.3; z += 0.95) stool(k, bx - side * 0.85, z, 0x2a2623);
  for (let i = 0; i < 3; i++) k.box(bx, 1.08, zc - 1.5 + i * 1.5, 0.1, 0.3, 0.1, [0xc9a24a, 0xc0c3c6, 0x2a2a2a][i], 'metal');
  const ox = -side * (a - 2.6);
  if (b > 5) poolTable(k, -side * Math.max(0.5, a - 3.2), -b + 2.6, a > 4.5 ? 0 : Math.PI / 2);
  for (let z = -b + 5.6; z < b - 1.6; z += 2.3)
    for (let x = ox + (a > 4 ? 0.6 : 0); Math.abs(x - bx) > 3.6; x += side * 2.8) if (z < b - 3.4 || Math.abs(x - doorX) > 1.6) tableSet(k, x, z, DARKWOOD, 0x3a2c20);
  // jukebox, neon and a dartboard
  k.box(-side * (a - 0.4), 0, b - 1.4, 0.6, 1.35, 0.9, 0x6a1f2a, 'gloss');
  k.box(-side * (a - 0.72), 0.75, b - 1.4, 0.03, 0.45, 0.7, 0xff9a4a, 'light', { cast: false });
  low(k, -side * (a - 0.4), b - 1.4, 0.6, 0.9);
  k.box(0, 2.3, -b + 0.04, 1.8, 0.1, 0.03, 0xff4a5a, 'light', { cast: false });
  k.box(0, 2.0, -b + 0.04, 1.2, 0.08, 0.03, 0x5ad0ff, 'light', { cast: false });
  k.cyl(-side * 1.8, 1.5, -b + 0.05, 0.24, 0.24, 0.04, 12, 0x2a2a2a, 'paint', { rx: Math.PI / 2 });
  k.cyl(-side * 1.8, 1.5, -b + 0.075, 0.1, 0.1, 0.02, 10, 0xb8322c, 'paint', { rx: Math.PI / 2 });
}

export function furnishCafe(k: Kit, rng: Rng, a: number, b: number, doorX: number) {
  counter(k, 0, -b + 1.9, a * 2 - 2.6, 0, 0xe9e2d2, OAK, 0.7, 1.02);
  register(k, -a + 2.4, -b + 1.9, 0);
  k.box(0.6, 1.02, -b + 1.9, 1.6, 0.42, 0.5, 0xbfd6dc, 'clear', { cast: false });
  for (let i = 0; i < 5; i++) k.box(0.05 + i * 0.28, 1.04, -b + 1.9, 0.2, 0.1, 0.3, rng.pick([0xd9a05b, 0xb5651d, 0xf2d7b0, 0x7a4a2e]), 'paint', { cast: false });
  counter(k, 0, -b + 0.35, a * 2 - 1.4, 0, 0x5d6266, STEELC, 0.6, 0.92);
  k.box(a - 2.4, 0.92, -b + 0.35, 0.6, 0.55, 0.45, STEELC, 'chrome');
  for (let i = -1; i <= 1; i++) plaque(k, i * 2.2, 2.3, -b + 0.02, 1.8, 0.8, 0x2a2a2c);
  let n = 0;
  for (let z = -b + 4.2; z < b - 1.2; z += 2.2)
    for (let x = -a + 1.6; x < a - 1.2; x += 2.6) {
      if (z > b - 2.6 && Math.abs(x - doorX) < 1.6) continue;
      tableSet(k, x, z, OAK, [0x2f6b4a, 0xb8322c, 0x2a2623][n++ % 3]);
    }
}

export function furnishSheriff(k: Kit, rng: Rng, a: number, b: number, doorX: number) {
  // public counter facing the door, with a waiting bench
  counter(k, doorX, b - 3.4, 5.2, 0, OAK, 0x4d3422, 0.7, 1.1);
  k.box(doorX + 1.6, 1.1, b - 3.4, 0.4, 0.3, 0.3, 0x2a2a2c);
  pew(k, doorX - 5.2, b - 0.4, 2.4, Math.PI);
  pew(k, doorX + 5.2, b - 0.4, 2.4, Math.PI);
  plaque(k, doorX, 2.0, -b + 0.02, 1.5, 1.5, 0xc9a24a, 0, 'metal');
  // squad room
  for (const [dx, dz] of [[-3.2, 0.4], [3.2, 0.4], [-3.2, -2.6], [3.2, -2.6]]) desk(k, doorX + dx, dz, 0, 0x8a8e80);
  cabinet(k, doorX - 1, -b + 0.32, 0, 4);
  // gun rack and noticeboard on the back wall
  k.box(doorX + 2.6, 1.0, -b + 0.08, 1.8, 1.2, 0.12, DARKWOOD);
  for (let i = 0; i < 5; i++) k.box(doorX + 1.9 + i * 0.35, 1.08, -b + 0.16, 0.05, 1.0, 0.05, 0x2a2623, 'metal', { cast: false });
  plaque(k, doorX - 3.4, 1.4, -b + 0.02, 1.8, 1.1, 0xb48a5a);
  for (let i = 0; i < 7; i++) k.box(doorX - 4.1 + rng.range(0, 1.4), 1.5 + rng.range(0, 0.7), -b + 0.045, 0.22, 0.28, 0.01, rng.pick([0xf4f1ea, 0xe8c547, 0xf2d7b0]), 'paint', { cast: false });
  // holding cells on the far side
  const side = doorX > 0 ? -1 : 1;
  const cx0 = side * (a - 3.3);
  k.at(cx0, 0, 0, () => {
    k.box(-side * 3.3, 0, 0, 0.14, 2.9, b * 2, 0xbdb7a6, 'cinder');
    k.solid(-side * 3.3, -b / 2 - 0.9, 0.14, b - 1.8);
    k.solid(-side * 3.3, b / 2 + 0.9, 0.14, b - 1.8);
    k.box(-side * 3.3, 2.2, 0, 0.16, 0.7, 1.8, 0xbdb7a6, 'cinder');
    for (let i = 0; i < 2; i++) {
      const x0 = -1.6 + i * 3.2;
      // barred front with an open gate
      for (let j = 0; j <= 20; j++) {
        if (i === 0 && j > 12 && j < 19) continue;
        k.cyl(x0 - 1.6 + j * 0.16, 0, -1.2, 0.022, 0.022, 2.6, 5, 0x3a3d40, 'metal');
      }
      k.box(x0, 2.6, -1.2, 3.2, 0.08, 0.08, 0x3a3d40, 'metal');
      k.box(x0, 1.2, -1.2, 3.2, 0.05, 0.06, 0x3a3d40, 'metal');
      if (i === 0) {
        k.solid(x0 - 0.55, -1.2, 2.1, 0.12);
        k.solid(x0 + 1.5, -1.2, 0.2, 0.12);
      } else k.solid(x0, -1.2, 3.2, 0.12);
      if (i === 0) {
        k.box(x0 + 1.6, 0, (-1.2 - b) / 2, 0.12, 2.7, b - 1.2, 0xbdb7a6, 'cinder');
        k.solid(x0 + 1.6, (-1.2 - b) / 2, 0.12, b - 1.2);
      }
      // bunk, blanket and a steel toilet
      k.box(x0 - 0.3, 0.35, -b + 0.5, 2.0, 0.1, 0.8, 0x6f7377, 'metal');
      k.box(x0 - 0.3, 0.45, -b + 0.5, 1.9, 0.1, 0.72, 0x7c8a6e);
      k.box(x0 - 1.1, 0.55, -b + 0.5, 0.4, 0.08, 0.5, 0xf2efe6);
      k.cyl(x0 + 1.15, 0, -b + 0.45, 0.2, 0.16, 0.42, 8, STEELC, 'chrome');
      low(k, x0 - 0.3, -b + 0.5, 2.0, 0.8);
    }
  });
}

export function furnishHouse(k: Kit, rng: Rng, a: number, b: number, doorX: number) {
  const side = doorX > 0 ? -1 : 1;
  const col = rng.pick([0x6d7f8c, 0x8c5a4a, 0x5f7355, 0x9a8468]);
  // living room on one side of the door
  const lx = side * (a - 2.4);
  rug(k, lx, b - 2.6, 3.4, 2.6, rng.pick([0x8c3b32, 0x2f4f6b, 0x5b6b3a]));
  sofa(k, lx, b - 0.6, Math.PI, col, 2.2);
  k.box(lx, 0, b - 2.6, 1.1, 0.4, 0.6, OAK, 'gloss');
  k.box(lx, 0, b - 4.6, 1.5, 0.5, 0.45, DARKWOOD);
  k.box(lx, 0.5, b - 4.6, 0.9, 0.7, 0.5, 0x2a2a2c);
  k.box(lx, 0.58, b - 4.34, 0.74, 0.54, 0.01, 0x31506a, 'glass', { cast: false });
  low(k, lx, b - 4.6, 1.5, 0.5);
  k.cyl(lx + side * 1.6, 0, b - 0.5, 0.03, 0.03, 1.5, 5, 0x2a2623, 'metal');
  k.cone(lx + side * 1.6, 1.4, b - 0.5, 0.25, 0.3, 8, 0xfff0c8, 'light', { cast: false });
  // kitchen across the back
  const kx = -side * (a - 2.6);
  counter(k, kx, -b + 0.34, 4.2, 0, 0xf2efe6, 0x8d8a84, 0.64, 0.92);
  k.box(kx - 0.6, 0.92, -b + 0.34, 0.75, 0.02, 0.55, 0x1c1c1e, 'gloss');
  k.box(kx + 1.0, 0.86, -b + 0.34, 0.6, 0.06, 0.42, STEELC, 'chrome');
  k.box(kx - side * 1.05, 1.5, -b + 0.2, 2.0, 0.7, 0.36, 0xf2efe6);
  k.box(kx + side * 2.6, 0, -b + 0.4, 0.8, 1.8, 0.75, 0xf4f4f1, 'gloss');
  low(k, kx + side * 2.6, -b + 0.4, 0.8, 0.75);
  table(k, kx, -b + 2.6, 1.5, 0.95, OAK);
  for (const s of [-1, 1]) {
    chair(k, kx + s * 0.4, -b + 3.25, Math.PI, DARKWOOD);
    chair(k, kx + s * 0.4, -b + 1.95, 0, DARKWOOD);
  }
  // bedroom corner behind a partition
  const px = side * (a - 3.3);
  k.box(px, 0, -b + 1.9, 0.12, 2.6, 3.8, 0xe9e4d8);
  k.solid(px, -b + 1.9, 0.12, 3.8);
  const bx = side * (a - 1.0);
  k.box(bx, 0.2, -b + 1.2, 1.6, 0.3, 2.1, 0xf4f1ea);
  k.box(bx, 0.5, -b + 1.5, 1.62, 0.08, 1.5, rng.pick([0x4f6a8c, 0x8c4f5a, 0x5a7a5a]));
  k.box(bx, 0, -b + 0.14, 1.7, 1.0, 0.1, DARKWOOD);
  for (const e of [-0.4, 0.4]) k.box(bx + e, 0.5, -b + 0.5, 0.55, 0.12, 0.35, 0xffffff);
  low(k, bx, -b + 1.2, 1.6, 2.1);
  plaque(k, lx, 1.5, b - 0.02, 1.0, 0.7, 0x6f8a9a, Math.PI);
}

/** Courtroom with a public gallery, plus a clerk's office in each wing. */
export function furnishCourt(k: Kit, a: number, b: number) {
  const wood = 0x6b4426;
  // dais, bench, witness stand, seal and flags
  k.box(0, 0, -b + 1.6, 10, 0.35, 3.2, wood, 'gloss');
  k.box(0, 0.35, -b + 2.4, 5.0, 1.15, 0.8, wood, 'gloss');
  k.box(0, 1.5, -b + 2.4, 5.2, 0.06, 0.95, DARKWOOD, 'gloss');
  k.box(0, 0.35, -b + 1.3, 0.75, 1.75, 0.2, 0x2a2623);
  k.box(0, 0.35, -b + 1.5, 0.7, 0.5, 0.6, 0x2a2623);
  k.box(3.6, 0.35, -b + 2.2, 1.3, 0.95, 1.3, wood, 'gloss');
  low(k, 0, -b + 1.6, 10, 3.2);
  k.cyl(0, 3.0, -b + 0.06, 0.7, 0.7, 0.06, 16, 0xc9a24a, 'metal', { rx: Math.PI / 2 });
  for (const s of [-1, 1]) {
    k.cyl(s * 3.6, 0.35, -b + 0.5, 0.03, 0.03, 2.7, 5, 0xc9a24a, 'metal');
    k.box(s * 3.6 + 0.3, 2.1, -b + 0.5, 0.6, 0.85, 0.04, s < 0 ? 0xb22234 : 0x2a4f8c, 'paint', { cast: false });
    plaque(k, s * 7.4, 1.7, -b + 0.02, 1.4, 1.8, 0x4d5a4a);
  }
  // jury box
  k.box(9.3, 0, -b + 5.2, 0.12, 1.0, 5.4, wood, 'gloss');
  low(k, 9.3, -b + 5.2, 0.12, 5.4);
  for (let r = 0; r < 2; r++) {
    if (r) k.box(10.9, 0, -b + 5.2, 1.1, 0.25, 5.4, wood);
    for (let i = 0; i < 6; i++) k.at(0, 0, 0, () => chair(k, 9.9 + r * 1.0, -b + 3.0 + i * 0.86, -Math.PI / 2, 0x3a2c20), r * 0.25);
  }
  // counsel tables, lectern, the bar
  for (const s of [-1, 1]) {
    k.box(s * 3.2, 0.7, -b + 6.6, 2.6, 0.06, 0.95, wood, 'gloss');
    for (const e of [-1, 1]) k.box(s * 3.2 + e * 1.2, 0, -b + 6.6, 0.08, 0.7, 0.85, wood);
    low(k, s * 3.2, -b + 6.6, 2.6, 0.95);
    for (const e of [-1, 1]) chair(k, s * 3.2 + e * 0.6, -b + 7.45, Math.PI, 0x3a2c20);
    k.box(s * 3.2 + 0.5, 0.76, -b + 6.6, 0.3, 0.04, 0.4, 0xf4f1ea);
    const rx = s * 5.0;
    k.box(rx, 0.85, -b + 9.0, 8.0, 0.08, 0.14, wood, 'gloss');
    for (let i = 0; i <= 16; i++) k.box(rx - 4 + i * 0.5, 0, -b + 9.0, 0.07, 0.85, 0.07, wood);
    low(k, rx, -b + 9.0, 8.0, 0.14);
  }
  k.box(0, 0, -b + 5.0, 0.6, 1.1, 0.5, wood, 'gloss');
  // gallery
  for (let z = -b + 10.6; z < b - 2.4; z += 1.45) for (const s of [-1, 1]) pew(k, s * 4.8, z, 7.0, Math.PI, wood);
  // wings: partition with a doorway, counter, desks and files
  for (const s of [-1, 1]) {
    const px = s * 12.6;
    for (const zc of [-b / 2 - 0.55, b / 2 + 0.55]) {
      k.box(px, 0, zc, 0.2, 4.6, b - 1.1, 0xe9e4d8);
      k.solid(px, zc, 0.2, b - 1.1);
    }
    k.box(px, 2.6, 0, 0.2, 2.0, 2.2, 0xe9e4d8);
    for (const zc of [-1.1, 1.1]) k.box(px, 0, zc, 0.34, 2.6, 0.16, wood, 'gloss');
    const wx = s * (12.7 + (a - 12.7) / 2);
    counter(k, wx, 3.4, a - 12.7 - 2.4, 0, wood, DARKWOOD, 0.7, 1.1);
    desk(k, wx - 2, -1.0, 0, wood);
    desk(k, wx + 2.2, -1.0, 0, wood);
    desk(k, wx, -5.0, 0, wood);
    cabinet(k, wx, -b + 0.32, 0, 8);
    pew(k, wx, b - 0.4, 4.0, Math.PI, wood);
    rug(k, wx, 7.0, 4.0, 2.4, 0x7a2f2a);
  }
  rug(k, 0, 2.5, 2.2, b * 2 - 9, 0x7a2f2a);
}

/** Small-town office: reception counter, a few desks, files and a waiting bench. */
export function furnishOffice(k: Kit, rng: Rng, a: number, b: number, doorX: number) {
  const side = doorX > 0 ? -1 : 1;
  counter(k, 0, b - 3.6, Math.min(5, a * 2 - 3.4), 0, OAK, DARKWOOD, 0.7, 1.08);
  pew(k, Math.max(-a + 1.4, Math.min(a - 1.4, doorX + side * 3.2)), b - 0.4, 2.2, Math.PI);
  rug(k, doorX, b - 1.7, 1.8, 2.2, rng.pick([0x7a2f2a, 0x2f4f6b, 0x4a5a3a]));
  for (let z = b - 6.2; z > -b + 1.6; z -= 2.6) for (let x = -a + 1.8; x < a - 1.2; x += 3.4) desk(k, x, z, 0, rng.pick([OAK, 0x8a8e80, DARKWOOD]));
  cabinet(k, 0, -b + 0.32, 0, Math.max(2, Math.floor(a * 1.4)));
  for (const s of [-1, 1]) plaque(k, s * (a - 0.02), 1.5, 0, 1.4, 0.9, rng.pick([0x6f8a9a, 0x8a7a5a, 0x4d5a4a]), (-s * Math.PI) / 2);
}

/**
 * Fast-food dining room: order counter with tills under lit menu boards, a kitchen line behind a pass, booths
 * along the windows, loose tables, a drinks station and a tray-return bin. `drive` is the side (±1) of the
 * drive-through window, which gets its own till.
 */
export function furnishFastFood(k: Kit, rng: Rng, a: number, b: number, doorX: number, vinyl: Col, accent: Col, drive: 1 | -1 = 1) {
  const cz = -b + 3.6;
  const len = a * 2 - 3.2;
  // order counter, tills, heat lamps and tray stacks
  counter(k, -drive * 0.4, cz, len, 0, accent, 0xe9e2d2, 0.75, 1.02);
  for (let i = 0; i < 3; i++) register(k, -drive * 0.4 - len / 2 + 1.2 + i * ((len - 2.4) / 2), cz, 0);
  for (const s of [-1, 1]) k.box(-drive * 0.4 + s * (len / 2 - 0.35), 1.02, cz + 0.05, 0.4, 0.14, 0.32, 0x7a5a3c, 'paint', { cast: false });
  // menu boards hung over the counter
  for (let i = 0; i < 4; i++) {
    const x = -drive * 0.4 - len / 2 + ((i + 0.5) * len) / 4;
    k.box(x, 2.25, cz - 0.7, len / 4 - 0.12, 0.62, 0.08, 0x2a2623, 'paint', { rx: 0.18, cast: false });
    k.box(x, 2.27, cz - 0.655, len / 4 - 0.2, 0.54, 0.02, i === 1 ? accent : 0xfff3c8, 'light', { rx: 0.18, cast: false });
    for (let j = 0; j < 3; j++) k.box(x - len / 16 + 0.25, 2.34 + j * 0.13, cz - 0.64 + j * 0.025, len / 8, 0.05, 0.01, 0x3a2c20, 'paint', { rx: 0.18, cast: false });
  }
  // kitchen line against the back wall: fryers, grill, hood, prep table, shake machine
  counter(k, 0, -b + 0.4, a * 2 - 1.2, 0, 0xb9bcc0, STEELC, 0.7, 0.92);
  k.box(0, 1.95, -b + 0.45, a * 2 - 3, 0.5, 0.85, STEELC, 'metal');
  for (let i = 0; i < 4; i++) k.box(-a + 2 + i * 0.75, 0.92, -b + 0.42, 0.6, 0.16, 0.55, 0x2a2a2c, 'paint', { cast: false });
  k.box(a - 2.2, 0.92, -b + 0.42, 0.7, 0.85, 0.6, 0xe9e6dc, 'gloss');
  k.box(drive * (a - 2.4) * 0 + 1.2, 0.92, -b + 0.42, 1.4, 0.06, 0.6, 0x3a3a3c, 'metal', { cast: false });
  // the pass: a steel shelf with heat lamps between kitchen and counter
  k.box(-drive * 0.4, 0, cz - 1.5, len - 1.6, 0.9, 0.6, STEELC, 'metal');
  k.box(-drive * 0.4, 1.35, cz - 1.5, len - 1.6, 0.05, 0.6, STEELC, 'chrome');
  for (const s of [-1, 1]) k.box(-drive * 0.4 + s * (len / 2 - 0.85), 0.9, cz - 1.5, 0.05, 0.45, 0.5, STEELC, 'chrome');
  for (let i = 0; i < 3; i++) k.box(-drive * 0.4 - 1.6 + i * 1.6, 1.28, cz - 1.5, 0.5, 0.05, 0.3, 0xffb060, 'light', { cast: false });
  low(k, -drive * 0.4, cz - 1.5, len - 1.6, 0.6);
  // drive-through till at the side window
  counter(k, drive * (a - 0.45), cz - 1.7, 1.6, Math.PI / 2, 0xb9bcc0, STEELC, 0.6, 1.0);
  register(k, drive * (a - 0.45), cz - 1.7, (-drive * Math.PI) / 2);
  // dining room: booths along the front glass and the far wall, loose tables between
  for (let x = -a + 1.3; x < a - 1.0; x += 2.3) if (Math.abs(x - doorX) > 1.9) booth(k, x, b - 0.7, 0, vinyl);
  for (let z = cz + 2.6; z < b - 2.2; z += 1.5) booth(k, -drive * (a - 0.7), z, Math.PI / 2, vinyl);
  for (let x = -a + 3.2; x < a - 2.6; x += 2.6)
    for (let z = cz + 2.6; z < b - 2.6; z += 2.4) if (Math.abs(x - doorX) > 1.2 || z < b - 4) tableSet(k, x + rng.range(-0.15, 0.15), z, 0xe9e2d2, vinyl);
  // drinks station and the tray-return bin by the door
  const sx = drive * (a - 0.45);
  counter(k, sx, cz + 2.2, 1.8, Math.PI / 2, accent, 0xe9e2d2, 0.6, 0.95);
  k.box(sx, 0.95, cz + 2.2, 0.45, 0.6, 1.2, 0x3b3f43, 'gloss');
  for (let i = 0; i < 4; i++) k.box(sx - drive * 0.24, 1.15, cz + 1.75 + i * 0.3, 0.02, 0.22, 0.2, [0xc0392b, 0xe8c547, 0x3f9b5b, 0x2e86c1][i], 'light', { cast: false });
  k.box(doorX + (doorX > 0 ? -1.5 : 1.5), 0, b - 0.4, 0.7, 1.15, 0.6, 0x7a5a3c, 'paint');
  k.box(doorX + (doorX > 0 ? -1.5 : 1.5), 0.78, b - 0.72, 0.4, 0.22, 0.03, 0x2a2623, 'paint', { cast: false });
  low(k, doorX + (doorX > 0 ? -1.5 : 1.5), b - 0.4, 0.7, 0.6);
  for (const [px, col] of [[-a + 0.03, accent], [a - 0.03, 0xf4f1ea]] as const) plaque(k, px, 1.9, 1.2, 1.5, 0.9, col, px < 0 ? Math.PI / 2 : -Math.PI / 2);
}

/** Lakeside fish house: host stand, a long bar with stools, linen tables, a stone hearth and trophy fish. */
export function furnishFishHouse(k: Kit, rng: Rng, a: number, b: number, doorX: number) {
  // bar along the left wall
  const len = b * 2 - 5;
  k.at(-a + 0.25, -0.6, Math.PI / 2, () => {
    k.box(0, 0, 0, len, 0.95, 0.45, DARKWOOD, 'gloss');
    k.box(0, 0.95, -0.14, len, 1.4, 0.12, DARKWOOD);
    for (const y of [0.97, 1.45, 1.9]) {
      k.box(0, y - 0.03, 0.05, len, 0.03, 0.28, DARKWOOD);
      bottles(k, rng, 0, y, 0.06, len - 0.3);
    }
    low(k, 0, 0, len, 0.45);
  });
  counter(k, -a + 1.9, -0.6, len, Math.PI / 2, DARKWOOD, 0x6b4428, 0.7, 1.08);
  k.box(-a + 2.32, 0.18, -0.6, 0.04, 0.04, len, 0xc9a24a, 'metal');
  for (let z = -0.6 - len / 2 + 0.6; z < -0.6 + len / 2 - 0.3; z += 0.95) stool(k, -a + 2.75, z, 0x5a2a22);
  // kitchen pass at the back
  counter(k, 2, -b + 0.4, a * 2 - 7, 0, 0xb9bcc0, STEELC, 0.7, 0.95);
  k.box(2, 1.9, -b + 0.4, a * 2 - 8, 0.45, 0.7, STEELC, 'metal');
  // hearth on the right wall
  k.box(a - 0.45, 0, -b + 4, 0.9, 3.0, 2.4, 0x8a857c, 'stone');
  k.box(a - 0.75, 0.3, -b + 4, 0.35, 0.9, 1.2, 0x1a1816, 'paint', { cast: false });
  k.box(a - 0.7, 0.32, -b + 4, 0.2, 0.3, 0.8, 0xff8a3a, 'light', { cast: false });
  k.box(a - 0.6, 1.4, -b + 4, 1.1, 0.12, 2.7, DARKWOOD);
  low(k, a - 0.45, -b + 4, 0.9, 2.4, 3);
  // dining tables in rows towards the lake windows
  for (let x = -a + 5; x < a - 1.6; x += 2.7)
    for (let z = -b + 3.4; z < b - 1.6; z += 2.5) {
      if (x > a - 3.2 && z < -b + 6.5) continue;
      if (Math.abs(x - doorX) < 1.8 && z > b - 3.6) continue;
      table(k, x, z, 1.0, 1.0, 0xf1ede2);
      k.cyl(x, 0.74, z, 0.05, 0.06, 0.16, 6, 0xffd97a, 'light');
      for (const [dx, dz, r] of [[-0.78, 0, -Math.PI / 2], [0.78, 0, Math.PI / 2], [0, -0.78, 0], [0, 0.78, Math.PI]] as const) chair(k, x + dx, z + dz, r, DARKWOOD);
    }
  // host stand, trophy fish, oars and a ship's wheel
  k.box(doorX + 1.6, 0, b - 1.3, 0.6, 1.1, 0.45, DARKWOOD, 'gloss');
  low(k, doorX + 1.6, b - 1.3, 0.6, 0.45);
  for (let i = 0; i < 3; i++) {
    plaque(k, -2 + i * 3.2, 2.2, -b + 0.03, 1.3, 0.5, 0x6b4428);
    k.box(-2 + i * 3.2, 2.2, -b + 0.08, 0.95, 0.24, 0.06, [0x7f9aa8, 0xb98e62, 0x6f8f6a][i], 'gloss', { cast: false });
  }
  k.torus(a - 0.06, 2.3, 1.5, 0.45, 0.05, 6, 14, 0x6b4428, 'paint', { ry: Math.PI / 2 });
}

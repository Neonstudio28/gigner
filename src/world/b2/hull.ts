import type { Kit, Col } from '../core/kit';
import { hasAsset } from '../assets';
import { addZone } from '../buildings/interiors';
import { win, door, WHITE, DARK, type WinO, type DoorO } from './kit2';

/** Interior finish of a room: painted upper wall over panelled wainscot, floor and ceiling. */
export interface Look {
  wall: Col;
  wains?: Col;
  wainsMat?: string;
  wainsH?: number;
  floor: Col;
  floorMat?: string;
  ceil?: Col;
  ceilMat?: string;
  trim?: Col;
  lights?: 'troffer' | 'dome' | 'pendant' | 'bulb' | 'none';
  /** Spacing of the ceiling lights (m). */
  step?: number;
}

/** An opening in a wall. `x` is the building's own x (front/back walls) or z (side walls). */
export interface Op {
  x: number;
  w: number;
  h: number;
  /** Sill height above the floor (windows). */
  y?: number;
  kind?: 'win' | 'door' | 'shop' | 'gap' | 'garage';
  color?: Col;
  win?: WinO;
  door?: DoorO;
}

export interface HullO {
  w: number;
  d: number;
  /** Floor height above the ground and clear room height. */
  y0?: number;
  h: number;
  t?: number;
  wall: Col;
  wallMat?: string;
  look: Look;
  f?: Op[];
  b?: Op[];
  l?: Op[];
  r?: Op[];
  /** Sides with no wall (another volume joins there). */
  skip?: string;
  frame?: Col;
  /** Foundation band colour (null: the wall runs to the ground). */
  base?: Col | null;
  noCeil?: boolean;
}

/** Indoor surfaces only see the cool sky fill, so they are tinted towards lamplight. */
export function warm(k: Kit, fn: () => void) {
  const was = k.indoor;
  k.indoor = true;
  k.tinted(1.42, 1.24, 1.0, fn);
  k.indoor = was;
}

/** Places a Blender asset if its family is loaded; returns false so the caller can draw a stand-in. */
export function put(k: Kit, name: string, x: number, y: number, z: number, ry = 0, o: Parameters<Kit['asset']>[5] = {}): boolean {
  if (!hasAsset(name)) return false;
  k.asset(name, x, y, z, ry, o);
  return true;
}

/** Inner face of one wall segment: wainscot with cap rail and baseboard under paint. Drawn in the wall frame. */
function lining(k: Kit, xc: number, yb: number, w: number, hh: number, zi: number, y0: number, L: Look, skirt: boolean) {
  const wh = L.wains !== undefined ? (L.wainsH ?? 1.0) : 0;
  const tr = L.trim ?? WHITE;
  const lo = Math.min(yb + hh, wh);
  if (lo > yb) k.box(xc, y0 + yb, zi - 0.015, w, lo - yb, 0.03, L.wains!, L.wainsMat ?? 'beadboard', { cast: false });
  const up = Math.max(yb, wh);
  if (yb + hh > up) k.box(xc, y0 + up, zi - 0.012, w, yb + hh - up, 0.024, L.wall, 'paint', { cast: false });
  if (wh > yb && wh <= yb + hh + 0.01) k.box(xc, y0 + wh - 0.03, zi - 0.03, w, 0.07, 0.06, L.wains === undefined ? tr : L.wains, 'paint', { cast: false });
  if (skirt && yb === 0) k.box(xc, y0, zi - 0.025, w, 0.13, 0.05, wh ? L.wains! : tr, 'paint', { cast: false });
}

function wallSide(k: Kit, len: number, o: HullO, ops: Op[], flip: number) {
  const t = o.t ?? 0.3;
  const y0 = o.y0 ?? 0.2;
  const { h, look: L } = o;
  const fr = o.frame ?? WHITE;
  const tr = L.trim ?? WHITE;
  const seg = (xc: number, yb: number, w: number, hh: number, solid: boolean) => {
    if (w < 0.02 || hh < 0.02) return;
    k.box(xc, y0 + yb, 0, w, hh, t, o.wall, o.wallMat ?? 'siding');
    warm(k, () => lining(k, xc, yb, w, hh, -t / 2, y0, L, true));
    if (solid) k.solid(xc, 0, w, t);
  };
  const list = ops.map((p) => ({ ...p, x: p.x * flip, y: p.y ?? 0, kind: p.kind ?? (p.y ? 'win' : 'door') })).sort((a, b) => a.x - b.x);
  let cur = -len / 2;
  for (const p of list) {
    const a = p.x - p.w / 2;
    seg((cur + a) / 2, 0, a - cur, h, true);
    seg(p.x, p.y + p.h, p.w, h - p.y - p.h, false);
    cur = p.x + p.w / 2;
    if (p.kind === 'gap') continue;
    // inside casing
    warm(k, () => {
      for (const s of [-1, 1]) k.box(p.x + s * (p.w / 2 + 0.05), y0 + p.y, -t / 2 - 0.03, 0.1, p.h + 0.1, 0.05, tr, 'paint', { cast: false });
      k.box(p.x, y0 + p.y + p.h, -t / 2 - 0.03, p.w + 0.2, 0.1, 0.05, tr, 'paint', { cast: false });
    });
    // reveal (the cut through the wall)
    for (const s of [-1, 1]) k.box(p.x + s * (p.w / 2 - 0.02), y0 + p.y, 0, 0.04, p.h, t + 0.02, fr);
    k.box(p.x, y0 + p.y + p.h - 0.04, 0, p.w, 0.04, t + 0.02, fr);
    if (p.kind === 'win' || p.kind === 'shop') {
      seg(p.x, 0, p.w, p.y, false);
      k.solid(p.x, 0, p.w, t);
      warm(k, () => k.box(p.x, y0 + p.y - 0.04, -t / 2 - 0.06, p.w + 0.16, 0.05, 0.16, tr, 'paint', { cast: false }));
    }
    k.push(0, y0, t / 2);
    if (p.kind === 'win') win(k, p.x, p.y, p.w, p.h, { frame: fr, ...p.win, open: true });
    else if (p.kind === 'shop') {
      // display window: big panes between slim mullions over a panelled stall riser
      k.box(p.x, p.y, -0.1, p.w, p.h, 0.02, 0xcfe2ea, 'clear', { cast: false });
      const n = Math.max(1, Math.round(p.w / 1.9));
      for (let i = 0; i <= n; i++) k.box(p.x - p.w / 2 + (p.w * i) / n, p.y, -0.06, i === 0 || i === n ? 0.1 : 0.07, p.h, 0.12, fr);
      k.box(p.x, p.y + p.h - 0.1, -0.06, p.w, 0.1, 0.12, fr);
      k.box(p.x, p.y + p.h * 0.74, -0.06, p.w, 0.06, 0.1, fr);
      k.box(p.x, p.y - 0.08, 0.0, p.w + 0.1, 0.1, 0.22, fr);
      const m = Math.max(1, Math.round(p.w / 1.2));
      if (p.y > 0.3) for (let i = 0; i < m; i++) k.box(p.x - p.w / 2 + ((i + 0.5) * p.w) / m, 0.08, 0.02, p.w / m - 0.16, p.y - 0.24, 0.04, p.color ?? fr);
    } else if (p.kind === 'door') door(k, p.x, 0, p.w, p.h, p.color ?? 0x6a4a32, { frame: fr, ...p.door, open: true });
    else if (p.kind === 'garage') {
      // roller door wound up into its drum
      k.cylX(p.x, p.h - 0.2, -0.2, 0.2, p.w, 10, 0xb9bcc0, 'metal');
      k.box(p.x, p.h - 0.75, -0.02, p.w, 0.5, 0.04, p.color ?? 0xc9ccd0, 'rollup');
      for (const s of [-1, 1]) k.box(p.x + s * (p.w / 2 + 0.06), 0, 0, 0.12, p.h + 0.1, 0.12, 0xd9b323, 'paint');
    }
    k.pop();
  }
  seg((cur + len / 2) / 2, 0, len / 2 - cur, h, true);
}

/**
 * Walk-in building body centred on the origin (front = +Z): four walls with trimmed openings, finished
 * interior, floor slab and ceiling with lights, and the walkable zone. Returns the inner half-size.
 */
export function hull(k: Kit, o: HullO): { a: number; b: number; y0: number } {
  const t = o.t ?? 0.3;
  const y0 = o.y0 ?? 0.2;
  const { w, d, h, look: L } = o;
  const skip = o.skip ?? '';
  if (!skip.includes('f')) k.at(0, d / 2 - t / 2, 0, () => wallSide(k, w, o, o.f ?? [], 1));
  if (!skip.includes('b')) k.at(0, -d / 2 + t / 2, Math.PI, () => wallSide(k, w, o, o.b ?? [], -1));
  if (!skip.includes('r')) k.at(w / 2 - t / 2, 0, Math.PI / 2, () => wallSide(k, d - 2 * t, o, o.r ?? [], -1));
  if (!skip.includes('l')) k.at(-w / 2 + t / 2, 0, -Math.PI / 2, () => wallSide(k, d - 2 * t, o, o.l ?? [], 1));
  const a = w / 2 - t;
  const b = d / 2 - t;
  if (o.base !== null && y0 > 0.02) k.box(0, 0, 0, w + 0.1, y0, d + 0.1, o.base ?? 0x9a968e, 'concrete');
  warm(k, () => {
    k.box(0, y0 - 0.02, 0, a * 2, 0.04, b * 2, L.floor, L.floorMat ?? 'woodFloor', { cast: false });
    if (!o.noCeil) {
      k.box(0, y0 + h - 0.06, 0, a * 2, 0.06, b * 2, L.ceil ?? 0xf3f0e8, L.ceilMat ?? 'ceilTile', { cast: false });
      // crown moulding
      const tr = L.trim ?? WHITE;
      for (const s of [-1, 1]) {
        k.box(0, y0 + h - 0.16, s * (b - 0.04), a * 2, 0.1, 0.08, tr, 'paint', { cast: false });
        k.box(s * (a - 0.04), y0 + h - 0.16, 0, 0.08, 0.1, b * 2, tr, 'paint', { cast: false });
      }
    }
  });
  if (!o.noCeil) ceilingLights(k, a, b, y0 + h - 0.06, L);
  addZone(k, 0, 0, w, d, y0, y0, y0 + h);
  return { a, b, y0 };
}

/** Grid of ceiling fittings under the ceiling plane `y` of a room with half-size (a, b). */
export function ceilingLights(k: Kit, a: number, b: number, y: number, L: Look, cx = 0, cz = 0) {
  const kind = L.lights ?? 'troffer';
  if (kind === 'none') return;
  const step = L.step ?? (kind === 'troffer' ? 3.6 : 4.2);
  const nx = Math.max(1, Math.round((a * 2) / step));
  const nz = Math.max(1, Math.round((b * 2) / step));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const lx = cx - a + ((i + 0.5) * a * 2) / nx;
      const lz = cz - b + ((j + 0.5) * b * 2) / nz;
      warm(k, () => {
        if (kind === 'troffer') {
          if (!put(k, 'fluorescent_troffer', lx, y, lz)) {
            k.box(lx, y - 0.05, lz, 0.62, 0.05, 1.22, 0xdedbd2, 'paint', { cast: false });
            k.box(lx, y - 0.06, lz, 0.5, 0.02, 1.1, 0xfff4dc, 'light', { cast: false });
          }
        } else if (kind === 'dome') {
          if (!put(k, 'ceiling_light_dome', lx, y, lz)) {
            k.cyl(lx, y - 0.04, lz, 0.2, 0.2, 0.04, 12, 0xc9b27a, 'metal');
            k.sphere(lx, y - 0.1, lz, 0.17, 0xfff1d0, 'light', 10, 6);
          }
        } else if (kind === 'pendant') {
          if (!put(k, 'pendant_lamp', lx, y, lz)) {
            k.cyl(lx, y - 0.7, lz, 0.012, 0.012, 0.7, 5, DARK, 'metal');
            k.cone(lx, y - 0.95, lz, 0.26, 0.26, 12, 0x2f5d50, 'gloss');
            k.sphere(lx, y - 0.97, lz, 0.08, 0xfff1d0, 'light', 8, 6);
          }
        } else {
          k.cyl(lx, y - 0.3, lz, 0.01, 0.01, 0.3, 5, DARK, 'metal');
          k.sphere(lx, y - 0.36, lz, 0.07, 0xffe9b8, 'light', 8, 6);
        }
        k.lamp(lx, y - 0.3, lz, 0xffe2b0, kind === 'troffer' ? 1.4 : 1);
      });
    }
}

/**
 * Interior partition from (x0, z0) to (x1, z1) (axis-aligned), full height `h` above floor `y0`, with door gaps
 * given as distances along it; both faces finished in `L`.
 */
export function partition(k: Kit, x0: number, z0: number, x1: number, z1: number, y0: number, h: number, L: Look, doors: { at: number; w?: number; leaf?: Col }[] = [], t = 0.12) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ry = Math.atan2(-(z1 - z0), x1 - x0);
  const tr = L.trim ?? WHITE;
  k.at(x0, z0, ry, () => {
    const seg = (s0: number, s1: number, yb: number, hh: number, solid: boolean) => {
      const w = s1 - s0;
      if (w < 0.02) return;
      const xc = (s0 + s1) / 2;
      warm(k, () => {
        k.box(xc, y0 + yb, 0, w, hh, t, L.wall, 'paint', { cast: false });
        lining(k, xc, yb, w, hh, -t / 2 + 0.01, y0, L, true);
        k.push(0, 0, 0, Math.PI);
        lining(k, -xc, yb, w, hh, -t / 2 + 0.01, y0, L, true);
        k.pop();
      });
      if (solid) k.solid(xc, 0, w, t);
    };
    let cur = 0;
    for (const dr of [...doors].sort((p, q) => p.at - q.at)) {
      const dw = dr.w ?? 0.95;
      seg(cur, dr.at - dw / 2, 0, h, true);
      seg(dr.at - dw / 2, dr.at + dw / 2, 2.1, h - 2.1, false);
      warm(k, () => {
        for (const s of [-1, 1]) k.box(dr.at + s * (dw / 2 + 0.04), y0, 0, 0.08, 2.14, t + 0.06, tr, 'paint', { cast: false });
        k.box(dr.at, y0 + 2.1, 0, dw + 0.16, 0.08, t + 0.06, tr, 'paint', { cast: false });
        if (dr.leaf !== undefined) {
          // leaf swung open against the wall
          k.at(dr.at - dw / 2, -t / 2 - 0.03, Math.PI * 0.53, () => {
            k.box(dw / 2, 0, 0, dw - 0.04, 2.05, 0.045, dr.leaf!, 'paint', { cast: false });
            k.sphere(dw - 0.12, 1.0, 0.05, 0.035, 0xc8b06a, 'metal', 6, 4);
          }, y0);
        }
      });
      cur = dr.at + dw / 2;
    }
    seg(cur, len, 0, h, true);
  });
}

/** Solid upper storey (or attic block) with dressed windows on any side; not walkable. */
export function upper(k: Kit, w: number, d: number, y: number, h: number, wall: Col, wallMat: string, sides: Partial<Record<'f' | 'b' | 'l' | 'r', { xs: number[]; w?: number; h?: number; y?: number; o?: WinO }>> = {}) {
  k.box(0, y, 0, w, h, d, wall, wallMat);
  for (const [side, s] of Object.entries(sides) as ['f' | 'b' | 'l' | 'r', NonNullable<(typeof sides)['f']>][]) {
    const fn = () => {
      for (const x of s.xs) win(k, x, y + (s.y ?? 0.9), s.w ?? 1.1, s.h ?? 1.7, s.o ?? {});
    };
    if (side === 'f') k.at(0, d / 2, 0, fn);
    else if (side === 'b') k.at(0, -d / 2, Math.PI, fn);
    else if (side === 'r') k.at(w / 2, 0, Math.PI / 2, fn);
    else k.at(-w / 2, 0, -Math.PI / 2, fn);
  }
}

/** Evenly spaced positions across a span, `n` of them, centred. */
export function spread(n: number, span: number, c = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(c - span / 2 + ((i + 0.5) * span) / n);
  return out;
}

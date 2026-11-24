import type { Kit, Col } from '../core/kit';
import type { Rng } from '../core/rng';
import { addZone } from '../buildings/interiors';
import { WHITE, DARK } from './kit2';
import { put } from './hull';

/** Flat roof: gravelled deck inside a parapet with a projecting coping. `y` is the top of the walls. */
export function parapetRoof(k: Kit, w: number, d: number, y: number, o: { h?: number; wall?: Col; wallMat?: string; cap?: Col; deck?: Col; t?: number } = {}) {
  const h = o.h ?? 0.7;
  const t = o.t ?? 0.3;
  const wall = o.wall ?? 0xffffff;
  const mat = o.wallMat ?? 'brickRed';
  const cap = o.cap ?? 0xd9d2c2;
  k.box(0, y - 0.1, 0, w - 0.1, 0.12, d - 0.1, o.deck ?? 0x55524e, 'gravel');
  for (const s of [-1, 1]) {
    k.box(0, y, s * (d / 2 - t / 2), w, h, t, wall, mat);
    k.box(0, y + h, s * (d / 2 - t / 2), w + 0.16, 0.1, t + 0.16, cap, 'concrete');
    k.box(s * (w / 2 - t / 2), y, 0, t, h, d - t * 2, wall, mat);
    k.box(s * (w / 2 - t / 2), y + h, 0, t + 0.16, 0.1, d + 0.16, cap, 'concrete');
  }
}

/** Scatter of rooftop plant on a flat roof at height `y` (AC units, vents, hatch, skylight, aerial, ducts). */
export function roofGear(k: Kit, rng: Rng, w: number, d: number, y: number, n = 3) {
  const names = ['ac_unit_roof', 'ac_unit_roof_2', 'roof_vent_turbine', 'roof_vent_box', 'roof_hatch', 'skylight', 'exhaust_stack', 'antenna_tv', 'satellite_dish', 'duct_run'];
  for (let i = 0; i < n; i++) {
    const x = rng.range(-w / 2 + 1.6, w / 2 - 1.6);
    const z = rng.range(-d / 2 + 1.6, d / 2 - 2.2);
    const ry = rng.pick([0, Math.PI / 2, Math.PI]);
    const name = rng.pick(names);
    if (put(k, name, x, y, z, ry)) continue;
    const kind = rng.int(0, 3);
    if (kind === 0) {
      k.box(x, y, z, 1.5, 0.95, 1.1, 0xb9bcbd, 'metal');
      k.box(x, y + 0.95, z, 1.56, 0.06, 1.16, 0x8e9294, 'metal');
      k.cyl(x, y + 1.0, z, 0.36, 0.36, 0.05, 12, 0x3a3d40, 'metal');
      for (let j = 0; j < 5; j++) k.box(x, y + 0.2 + j * 0.13, z + 0.56, 1.3, 0.05, 0.02, 0x7d8082, 'metal');
      k.box(x, y, z, 1.7, 0.1, 1.3, 0x6a6660, 'concrete');
    } else if (kind === 1) {
      k.cyl(x, y, z, 0.16, 0.16, 0.5, 10, 0xa9acae, 'metal');
      k.sphere(x, y + 0.66, z, 0.28, 0xc4c7c9, 'metal', 10, 6);
    } else if (kind === 2) {
      k.box(x, y, z, 1.3, 0.3, 1.3, 0x8d8a84, 'concrete');
      k.box(x, y + 0.3, z, 1.2, 0.08, 1.2, 0xbcd3db, 'glass');
    } else {
      k.box(x, y, z, 0.7, 0.9, 0.7, 0xa9acae, 'metal');
      k.box(x, y + 0.9, z, 0.9, 0.08, 0.9, 0x8e9294, 'metal');
    }
  }
}

/**
 * Gable roof over a w x d box whose wall head is at `y`. The ridge runs along X by default (gables on the
 * left/right ends); `turn` runs it along Z (gable faces the street). Returns the rise.
 */
export function gable(k: Kit, w: number, d: number, y: number, o: { pitch?: number; color?: Col; mat?: string; oh?: number; goh?: number; trim?: Col; fill?: Col; fillMat?: string; turn?: boolean; thick?: number } = {}) {
  const span = o.turn ? w : d;
  const len = o.turn ? d : w;
  const rise = (span / 2) * (o.pitch ?? 0.6);
  const draw = () =>
    k.roof(0, y, 0, len, [[-span / 2, 0], [0, rise], [span / 2, 0]], o.color ?? 0x4b4f55, o.mat ?? 'shingle', {
      eaveOH: o.oh ?? 0.5,
      gableOH: o.goh ?? 0.4,
      trim: o.trim ?? WHITE,
      fill: o.fill,
      fillMat: o.fillMat,
      ridge: o.mat === 'roofMetal' ? (o.color ?? 0x4b4f55) : undefined,
      thick: o.thick ?? 0.16,
    });
  if (o.turn) k.at(0, 0, Math.PI / 2, draw);
  else draw();
  return rise;
}

/** Flight of steps rising towards -Z from (x, z) at the ground; walkable. Returns the depth it covers. */
export function steps(k: Kit, x: number, z: number, w: number, rise: number, o: { color?: Col; mat?: string; run?: number; rail?: Col } = {}) {
  const n = Math.max(1, Math.round(rise / 0.17));
  const run = o.run ?? 0.3;
  for (let i = 0; i < n; i++) k.box(x, 0, z - i * run - run / 2, w, ((i + 1) * rise) / n, run, o.color ?? 0xb9b4a8, o.mat ?? 'concrete');
  addZone(k, x, z - (n * run) / 2, w, n * run, rise, 0);
  if (o.rail !== undefined)
    for (const s of [-1, 1]) {
      const rx = x + s * (w / 2 - 0.05);
      k.beam({ x: rx, y: 0.9, z }, { x: rx, y: rise + 0.9, z: z - n * run }, 0.05, 0.05, o.rail, 'metal');
      k.box(rx, 0, z - 0.05, 0.05, 0.9, 0.05, o.rail, 'metal');
      k.box(rx, rise, z - n * run + 0.05, 0.05, 0.9, 0.05, o.rail, 'metal');
    }
  return n * run;
}

/** Turned porch post: square plinth and cap blocks with a tapered round shaft and rings. */
export function post(k: Kit, x: number, y: number, z: number, h: number, color: Col = WHITE, turned = true) {
  if (!turned) {
    k.box(x, y, z, 0.16, h, 0.16, color);
    k.box(x, y, z, 0.24, 0.2, 0.24, color);
    k.box(x, y + h - 0.16, z, 0.24, 0.16, 0.24, color);
    return;
  }
  k.box(x, y, z, 0.17, 0.75, 0.17, color);
  k.cyl(x, y + 0.75, z, 0.085, 0.07, 0.08, 10, color);
  k.cyl(x, y + 0.83, z, 0.055, 0.075, h - 1.5, 10, color);
  k.cyl(x, y + h - 0.67, z, 0.085, 0.055, 0.08, 10, color);
  k.box(x, y + h - 0.59, z, 0.17, 0.59, 0.17, color);
}

export interface PorchO {
  /** Deck height above ground and clear height under the beam. */
  y0?: number;
  h?: number;
  color?: Col;
  deck?: Col;
  roof?: Col;
  roofMat?: string;
  /** Local x of the step opening in the front rail (undefined: no steps, closed rail). */
  stepsAt?: number;
  stepsW?: number;
  turned?: boolean;
  rail?: boolean;
  /** Posts across the front. */
  posts?: number;
  /** Extra height the shed roof rises to at the wall. */
  rise?: number;
  lattice?: boolean;
  ceil?: Col;
}

/**
 * Covered porch whose back edge sits on a wall at local z = 0 and which projects `d` towards +Z, centred on x.
 * Deck on a lattice skirt, turned posts with brackets, balustrade, beam and a shed roof; walkable, with steps.
 */
export function porch(k: Kit, x: number, z: number, w: number, d: number, o: PorchO = {}) {
  const y0 = o.y0 ?? 0.6;
  const h = o.h ?? 2.5;
  const c = o.color ?? WHITE;
  const n = o.posts ?? Math.max(2, Math.round(w / 2.6) + 1);
  const sw = o.stepsW ?? 1.5;
  k.push(x, 0, z);
  // deck: boards on a frame, skirt below
  k.box(0, y0 - 0.12, d / 2, w, 0.12, d, o.deck ?? 0x8a8d90, 'planks');
  k.box(0, y0 - 0.3, d - 0.05, w, 0.18, 0.1, c);
  for (const s of [-1, 1]) k.box(s * (w / 2 - 0.05), y0 - 0.3, d / 2, 0.1, 0.18, d, c);
  if (o.lattice !== false && y0 > 0.35) {
    const skirt = (sx: number, sz: number, len: number, ry: number) => {
      if (len < 0.3) return;
      k.at(sx, sz, ry, () => {
        k.box(0, 0.02, 0, len, y0 - 0.34, 0.03, 0xd8d4c8, 'paint');
        const m = Math.round(len / 0.22);
        for (let i = 0; i < m; i++) k.box(-len / 2 + ((i + 0.5) * len) / m, 0.02, 0.02, 0.05, y0 - 0.34, 0.02, 0x9c9a92);
      });
    };
    if (o.stepsAt === undefined) skirt(0, d - 0.06, w, 0);
    else {
      const a0 = -w / 2;
      const a1 = o.stepsAt - sw / 2;
      const b0 = o.stepsAt + sw / 2;
      skirt((a0 + a1) / 2, d - 0.06, a1 - a0, 0);
      skirt((b0 + w / 2) / 2, d - 0.06, w / 2 - b0, 0);
    }
    for (const s of [-1, 1]) skirt(s * (w / 2 - 0.06), d / 2, d, (s * Math.PI) / 2);
  }
  // posts with scroll brackets, beam
  const px: number[] = [];
  for (let i = 0; i < n; i++) px.push(-w / 2 + 0.12 + (i * (w - 0.24)) / (n - 1));
  for (const p of px) {
    post(k, p, y0, d - 0.14, h, c, o.turned !== false);
    for (const s of [-1, 1]) {
      if ((s < 0 && p === px[0]) || (s > 0 && p === px[n - 1])) continue;
      k.beam({ x: p + s * 0.09, y: y0 + h - 0.42, z: d - 0.14 }, { x: p + s * 0.42, y: y0 + h - 0.06, z: d - 0.14 }, 0.05, 0.07, c);
    }
  }
  k.box(0, y0 + h, d - 0.14, w, 0.2, 0.2, c);
  for (const s of [-1, 1]) k.box(s * (w / 2 - 0.12), y0 + h, d / 2 - 0.07, 0.2, 0.2, d - 0.14, c);
  // balustrade between posts (left open at the steps) and down the sides
  if (o.rail !== false) {
    const rail = (x0: number, x1: number, zz: number, ry = 0, len?: number) => {
      const L = len ?? x1 - x0;
      if (L < 0.4) return;
      k.at(ry ? x0 : (x0 + x1) / 2, zz, ry, () => {
        k.box(0, y0 + 0.86, 0, L, 0.07, 0.09, c);
        k.box(0, y0 + 0.12, 0, L, 0.06, 0.06, c);
        const m = Math.max(2, Math.round(L / 0.14));
        for (let i = 0; i < m; i++) k.box(-L / 2 + ((i + 0.5) * L) / m, y0 + 0.18, 0, 0.035, 0.68, 0.035, c);
        k.solid(0, 0, L, 0.1, 0, y0 + 1.0);
      });
    };
    for (let i = 0; i < n - 1; i++) {
      const a = px[i] + 0.09;
      const b = px[i + 1] - 0.09;
      if (o.stepsAt !== undefined && o.stepsAt + sw / 2 > a && o.stepsAt - sw / 2 < b) {
        rail(a, o.stepsAt - sw / 2, d - 0.14);
        rail(o.stepsAt + sw / 2, b, d - 0.14);
      } else rail(a, b, d - 0.14);
    }
    for (const s of [-1, 1]) rail(s * (w / 2 - 0.12), 0, d / 2 - 0.07, Math.PI / 2, d - 0.3);
  }
  // shed roof with fascia and a boarded ceiling
  const rise = o.rise ?? 0.55;
  const len = Math.hypot(d + 0.35, rise);
  k.box(0, y0 + h + 0.2 + rise / 2 - 0.02, (d + 0.35) / 2, w + 0.5, 0.1, len, o.roof ?? 0x4b4f55, o.roofMat ?? 'shingle', { rx: Math.atan2(rise, d + 0.35) });
  k.box(0, y0 + h + 0.1, d + 0.3, w + 0.5, 0.16, 0.06, c);
  k.box(0, y0 + h + 0.16, d / 2, w - 0.2, 0.03, d - 0.2, o.ceil ?? 0xbcd6de, 'beadboard', { cast: false });
  addZone(k, 0, d / 2, w, d, y0, y0, y0 + h);
  k.pop();
  if (o.stepsAt !== undefined) k.at(x + o.stepsAt, z + d, Math.PI, () => {
    // steps descend away from the house: draw them rising towards the deck
    const nn = Math.max(1, Math.round(y0 / 0.18));
    for (let i = 0; i < nn; i++) k.box(0, 0, -(nn - i - 0.5) * 0.3, sw, ((i + 1) * y0) / nn - 0.02, 0.3, o.deck ?? 0x8a8d90, 'planks');
    addZone(k, 0, -(nn * 0.3) / 2, sw, nn * 0.3, 0, y0);
  });
}

/** Wall-mounted services on the wall plane z = 0: meter, conduit, gas meter, tap, vent. */
export function services(k: Kit, x: number, wallH: number) {
  if (!put(k, 'electric_meter_mast', x, 0, 0)) {
    k.box(x, 1.2, 0.06, 0.32, 0.46, 0.12, 0x9a9da0, 'metal');
    k.cyl(x, 1.42, 0.14, 0.09, 0.09, 0.05, 10, 0xd9dde0, 'glass', { rx: Math.PI / 2 });
    k.cyl(x, 1.66, 0.05, 0.025, 0.025, wallH - 1.66, 6, 0x8a8d90, 'metal');
  }
  if (!put(k, 'gas_meter', x + 0.8, 0, 0.1)) {
    k.box(x + 0.8, 0.35, 0.14, 0.34, 0.3, 0.2, 0x8f9396, 'metal');
    k.cyl(x + 0.66, 0, 0.14, 0.02, 0.02, 0.4, 6, 0xc7b24a, 'metal');
    k.cyl(x + 0.94, 0, 0.14, 0.02, 0.02, 0.4, 6, 0xc7b24a, 'metal');
  }
}

/** Gutter along the eave from x0 to x1 at height y (wall plane z = 0, eave projecting `out`) and a downpipe. */
export function gutter(k: Kit, x0: number, x1: number, y: number, out = 0.5, color: Col = WHITE) {
  k.box((x0 + x1) / 2, y - 0.06, out + 0.06, x1 - x0, 0.1, 0.12, color, 'metal');
  k.cyl(x1 - 0.15, 0.1, 0.07, 0.04, 0.04, y - 0.3, 6, color, 'metal');
  k.beam({ x: x1 - 0.15, y: y - 0.2, z: 0.07 }, { x: x1 - 0.15, y: y - 0.06, z: out + 0.04 }, 0.07, 0.07, color, 'metal');
  k.box(x1 - 0.15, 0.02, 0.16, 0.09, 0.09, 0.2, color, 'metal');
}

/** Brick chimney stack rising `h` above `y` with a corbelled cap and pots. */
export function stack(k: Kit, x: number, y: number, z: number, h: number, mat = 'brickRed') {
  k.box(x, y, z, 0.8, h, 0.6, 0xffffff, mat);
  k.box(x, y + h - 0.3, z, 0.92, 0.12, 0.72, 0xffffff, mat);
  k.box(x, y + h - 0.18, z, 1.0, 0.18, 0.8, 0xc9c2b4, 'concrete');
  for (const s of [-1, 1]) k.cyl(x + s * 0.2, y + h, z, 0.1, 0.12, 0.3, 8, 0xa0553c);
}

export { DARK };

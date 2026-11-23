import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { Rng, smoothstep, clamp, lerp } from './core/rng';

const rng = new Rng(4242);
const nA = createNoise2D(() => rng.next());
const nB = createNoise2D(() => rng.next());
const nC = createNoise2D(() => rng.next());

function fbm(x: number, z: number, oct = 4): number {
  let a = 0.5;
  let f = 1;
  let s = 0;
  for (let i = 0; i < oct; i++) {
    s += a * nA(x * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}

function ridged(x: number, z: number, oct = 5): number {
  let a = 0.5;
  let f = 1;
  let s = 0;
  let w = 1;
  for (let i = 0; i < oct; i++) {
    let n = 1 - Math.abs(nB(x * f, z * f));
    n *= n * w;
    w = clamp(n * 1.6, 0, 1);
    s += n * a;
    f *= 2.15;
    a *= 0.5;
  }
  return s;
}

export const LAKE = { x: 1180, z: 330, rx: 250, rz: 150, level: -0.7 };
/** Drivable/explorable radius. */
export const MAP_RADIUS = 1850;
const GRID_HALF = 2000;
const GRID_SEG = 320;
const RING_IN = 1880;
const RING_OUT = 15000;

// ------------------------------------------------------------------ valley (broad Pacific Northwest river valley)
// North and south edges of the valley floor, sampled along x. The mountains start beyond these and
// rise gently at first, so the town has room to breathe and the peaks sit back on the skyline.
const VX = [-2600, -1900, -1500, -1100, -600, 0, 600, 1100, 1500, 1900, 2600];
const VN = [-520, -600, -680, -700, -700, -700, -700, -700, -680, -560, -520];
const VS = [-60, -40, 260, 520, 600, 610, 640, 660, 420, 60, 40];

function knot(arr: number[], x: number): number {
  if (x <= VX[0]) return arr[0];
  if (x >= VX[VX.length - 1]) return arr[arr.length - 1];
  let i = 0;
  while (x > VX[i + 1]) i++;
  const t = (x - VX[i]) / (VX[i + 1] - VX[i]);
  return lerp(arr[i], arr[i + 1], t * t * (3 - 2 * t));
}

/** Centre line of the valley floor. */
const centreZ = (x: number) => (knot(VN, x) + knot(VS, x)) / 2;

export interface ValleyInfo {
  zc: number;
  north: boolean;
  /** Metres beyond the edge of the flat floor (negative = on the floor). */
  e: number;
  floorY: number;
}

/** The floor rises gently upstream (west) and a little toward the east end of the valley. */
const floorRise = (x: number) => Math.max(0, -x - 500) * 0.011 + Math.max(0, x - 1300) * 0.01;

/** Low hills south of town: Cedar Ridge (the view lots) and Church Hill (the old cemetery hill). */
export const HILLS = [
  { name: 'Cedar Ridge', x: 80, z: 500, s: 250, h: 30 },
  { name: 'Summit', x: 390, z: 470, s: 190, h: 20 },
  { name: 'Church Hill', x: -420, z: 440, s: 190, h: 20 },
];

/** Sunnyside bench: north of Highland Dr the floor climbs gently (≤ 7°) toward the mountains. */
const benchRise = (x: number, z: number) => 14 * smoothstep(565, 740, -z) * (1 - smoothstep(700, 1000, Math.abs(x)));

/** Downtown stays level; elsewhere the floor has a little low-poly roll. */
function floorRelief(x: number, z: number) {
  let h = benchRise(x, z);
  for (const b of HILLS) h += b.h * Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / (b.s * b.s));
  const dx = Math.max(0, Math.abs(x) - 560);
  const dz = Math.max(0, Math.abs(z) - 200);
  const roll = Math.max(0, 1.3 * (fbm(x * 0.003 + 9, z * 0.003 - 4, 3) + 0.45));
  return h + roll * smoothstep(0, 160, Math.hypot(dx, dz));
}

export function valley(x: number, z: number): ValleyInfo {
  const zN = knot(VN, x);
  const zS = knot(VS, x);
  const zc = (zN + zS) / 2;
  const north = z < zc;
  return { zc, north, e: north ? zN - z : z - zS, floorY: floorRise(x) };
}

interface Peak {
  name: string;
  x: number;
  z: number;
  h: number;
  r: number;
}
/** Forested summits on the foothills around the valley; the big snow peaks stay on the distant ring. */
export const PEAKS: Peak[] = [
  { name: 'Mt. Hollow', x: -1250, z: -1500, h: 420, r: 700 },
  { name: 'Sunset Peak', x: -150, z: -1600, h: 360, r: 650 },
  { name: 'Silver Crown', x: 950, z: -1500, h: 400, r: 680 },
  { name: 'Placer Butte', x: -800, z: 1450, h: 380, r: 650 },
  { name: 'Lookout Mtn', x: 650, z: 1500, h: 400, r: 650 },
  { name: 'Granite Ridge', x: -1700, z: 900, h: 340, r: 600 },
  { name: 'Bear Paw', x: 1650, z: 1000, h: 360, r: 600 },
];

function lakeEllipse(x: number, z: number) {
  return Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) + nC(x * 0.006, z * 0.006) * 0.08;
}

/** Natural terrain: valley floor, forested foothills, the peaks behind them and the lake basin (no roads/river). */
export function rawHeight(x: number, z: number): number {
  const v = valley(x, z);
  let h = v.floorY + floorRelief(x, z);
  if (v.e > 0) {
    const H = v.north ? 320 + 70 * nA(x * 0.0011, 3.3) : 290 + 60 * nA(x * 0.0012, -7.1);
    const t = 1 - Math.exp(-v.e / 380);
    h += H * Math.pow(t, 1.3);
    const detail = fbm(x * 0.0042, z * 0.0042, 4) * 30 + (ridged(x * 0.0016 + 4, z * 0.0016 - 2, 4) - 0.35) * 52;
    h += detail * smoothstep(0, 120, v.e);
    let pk = 0;
    for (const p of PEAKS) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r) pk = Math.max(pk, p.h * Math.pow(1 - d / p.r, 1.8) * (0.9 + 0.1 * nC(x * 0.003, z * 0.003)));
    }
    h += pk * smoothstep(0, 160, v.e);
  }
  const le = lakeEllipse(x, z);
  if (le < 1.9) {
    h *= smoothstep(1.0, 1.9, le);
    if (le < 1.0) h = LAKE.level - 0.4 - (1 - le) * 5.5;
  }
  return h;
}

// ------------------------------------------------------------------ river
export interface RiverHit {
  dist: number;
  s: number;
  hw: number;
  water: number;
  bed: number;
}

class RiverPath {
  readonly pts: { x: number; z: number; s: number; hw: number; water: number }[] = [];
  private cells = new Map<string, number[]>();
  private size = 32;
  constructor(ctrl: [number, number][]) {
    const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const len = curve.getLength();
    const n = Math.ceil(len / 6);
    let water = Infinity;
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n);
      const s = (i / n) * len;
      // smoothed terrain along the bed, forced to keep flowing downhill
      let base = 0;
      for (const o of [-18, -9, 0, 9, 18]) base += rawHeight(p.x + o, p.z) / 5;
      water = Math.min(water, base - 1.3);
      this.pts.push({ x: p.x, z: p.z, s, hw: lerp(15, 22, i / n), water });
    }
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i];
      const b = this.pts[i + 1];
      const pad = b.hw + 40;
      for (let cx = Math.floor((Math.min(a.x, b.x) - pad) / this.size); cx <= Math.floor((Math.max(a.x, b.x) + pad) / this.size); cx++)
        for (let cz = Math.floor((Math.min(a.z, b.z) - pad) / this.size); cz <= Math.floor((Math.max(a.z, b.z) + pad) / this.size); cz++) {
          const k = `${cx},${cz}`;
          let arr = this.cells.get(k);
          if (!arr) this.cells.set(k, (arr = []));
          arr.push(i);
        }
    }
  }
  query(x: number, z: number): RiverHit | null {
    const arr = this.cells.get(`${Math.floor(x / this.size)},${Math.floor(z / this.size)}`);
    if (!arr) return null;
    let best: RiverHit | null = null;
    for (const i of arr) {
      const a = this.pts[i];
      const b = this.pts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const L2 = dx * dx + dz * dz;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
      if (!best || d < best.dist) {
        const water = lerp(a.water, b.water, t);
        best = { dist: d, s: lerp(a.s, b.s, t), hw: lerp(a.hw, b.hw, t), water, bed: water - 1.9 };
      }
    }
    return best;
  }
}

/**
 * South Fork: comes down the north side of the valley, passes under I-90 west of town, runs past the
 * mill and through town between downtown and the North Side, then bends south-east into Spirit Lake.
 */
export const RIVER_CTRL: [number, number][] = [
  [-1880, -540],
  [-1600, -525],
  [-1350, -500],
  [-1150, -455],
  [-1000, -390],
  [-880, -310],
  [-760, -240],
  [-600, -190],
  [-400, -165],
  [-150, -155],
  [150, -158],
  [400, -168],
  [620, -160],
  [800, -120],
  [930, -40],
  [1030, 70],
  [1110, 190],
  [1160, 260],
];
export const river = new RiverPath(RIVER_CTRL);

export function isWater(x: number, z: number) {
  if (lakeEllipse(x, z) < 0.98) return true;
  const r = river.query(x, z);
  return !!r && r.dist < r.hw;
}

// ------------------------------------------------------------------ height pipeline: raw → roads → river → pads
export interface FlatPad {
  x: number;
  z: number;
  hw: number;
  hd: number;
  fall: number;
  h: number;
}
const pads: FlatPad[] = [];
let roadHook: ((x: number, z: number, h: number) => number) | null = null;

/** Registered by the road network once road profiles exist: grades terrain to meet roads. */
export function setRoadHook(fn: (x: number, z: number, h: number) => number) {
  roadHook = fn;
}

/** Flattens an axis-aligned area (farmyards, mill, mine) to one height and returns it. */
export function addFlatPad(x: number, z: number, w: number, d: number, fall = 32, h?: number): number {
  const height = h ?? rawHeight(x, z);
  pads.push({ x, z, hw: w / 2, hd: d / 2, fall, h: height });
  return height;
}

function applyPads(x: number, z: number, h: number) {
  for (const p of pads) {
    const dx = Math.max(0, Math.abs(x - p.x) - p.hw);
    const dz = Math.max(0, Math.abs(z - p.z) - p.hd);
    const d = Math.hypot(dx, dz);
    if (d < p.fall) h = lerp(p.h, h, smoothstep(0, p.fall, d));
  }
  return h;
}

/** Ground height before roads are graded in (pads + natural terrain); used for road profiles. */
export function preRoadHeight(x: number, z: number) {
  return applyPads(x, z, rawHeight(x, z));
}

// ------------------------------------------------------------------ building lots (graded last, over roads and river)
interface LotPad {
  x: number;
  z: number;
  hw: number;
  hd: number;
  c: number;
  s: number;
  fall: number;
  h: number;
}
const LOT_CELL = 32;
const lotCells = new Map<string, LotPad[]>();

/**
 * Grades a building lot (a rectangle turned by ry, Kit convention) flat at height h and blends it back into
 * the surrounding ground over `fall` metres, so the building stands on the ground instead of a plinth.
 */
export function addLotPad(x: number, z: number, w: number, d: number, ry: number, h: number, fall: number) {
  const p: LotPad = { x, z, hw: w / 2, hd: d / 2, c: Math.cos(ry), s: Math.sin(ry), fall, h };
  const ext = Math.hypot(p.hw, p.hd) + fall;
  for (let i = Math.floor((x - ext) / LOT_CELL); i <= Math.floor((x + ext) / LOT_CELL); i++)
    for (let j = Math.floor((z - ext) / LOT_CELL); j <= Math.floor((z + ext) / LOT_CELL); j++) {
      const k = `${i},${j}`;
      let arr = lotCells.get(k);
      if (!arr) lotCells.set(k, (arr = []));
      arr.push(p);
    }
}

/** Distance from (x, z) to a lot's flat rectangle (0 inside). */
function lotDist(p: LotPad, x: number, z: number) {
  const dx = x - p.x;
  const dz = z - p.z;
  const lx = dx * p.c - dz * p.s;
  const lz = dx * p.s + dz * p.c;
  return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
}

function applyLots(x: number, z: number, h: number) {
  const arr = lotCells.get(`${Math.floor(x / LOT_CELL)},${Math.floor(z / LOT_CELL)}`);
  if (!arr) return h;
  // beside a street the ground keeps the street's own grading, so a raised lot never banks up over the sidewalk
  let fade = -1;
  // in placement order: a later lot keeps its own floor flat and blends into what was there before
  for (const p of arr) {
    const d = lotDist(p, x, z);
    if (d >= p.fall) continue;
    if (fade < 0) fade = roadEdge ? smoothstep(0.4, 3, roadEdge(x, z)) : 1;
    // the floor itself always stays level (the building stands on it); only its slope gives way to the street
    h = lerp(h, lerp(p.h, h, smoothstep(0, p.fall, d)), lerp(1, fade, smoothstep(0, 0.5, d)));
  }
  return h;
}

/** Is (x, z) within `margin` of a lot's flat floor? (Scans every bin the margin reaches: a lot is only binned out to its fall.) */
function nearLot(x: number, z: number, margin: number) {
  for (let i = Math.floor((x - margin) / LOT_CELL); i <= Math.floor((x + margin) / LOT_CELL); i++)
    for (let j = Math.floor((z - margin) / LOT_CELL); j <= Math.floor((z + margin) / LOT_CELL); j++) {
      const arr = lotCells.get(`${i},${j}`);
      if (arr && arr.some((p) => lotDist(p, x, z) < margin)) return true;
    }
  return false;
}

/** Final ground height of the near terrain (metres). */
export function heightAt(x: number, z: number): number {
  let h = preRoadHeight(x, z);
  if (roadHook) h = roadHook(x, z, h);
  const r = river.query(x, z);
  if (r) {
    const B = r.hw + 8;
    if (r.dist < B) h = Math.min(h, r.bed + (h - r.bed) * smoothstep(r.hw * 0.45, B, r.dist));
  }
  return applyLots(x, z, h);
}

// ------------------------------------------------------------------ road-aware near-terrain mesh
let roadTop: ((x: number, z: number, nearY: number) => number) | null = null;
let roadClose: ((x: number, z: number, margin: number) => boolean) | null = null;
let roadEdge: ((x: number, z: number) => number) | null = null;

/** Registered by the road network: top of the road/sidewalk surface at a point, and a proximity test. */
export function setRoadSurfaceHooks(top: (x: number, z: number, nearY: number) => number, close: (x: number, z: number, margin: number) => boolean, edge: (x: number, z: number) => number) {
  roadTop = top;
  roadClose = close;
  roadEdge = edge;
}

/** Keeps the ground just under any at-grade road, shoulder or sidewalk so it never pokes through. */
function underRoads(x: number, z: number, h: number) {
  if (!roadTop) return h;
  const y = roadTop(x, z, h);
  return y > -1e9 && y - h < 2.5 ? Math.min(h, y - 0.12) : h;
}

const STEP = (GRID_HALF * 2) / GRID_SEG;
/** Near-terrain cells beside roads are split SUB×SUB (≈4 m) so the ground follows the road grading. */
const SUB = 3;
/** Cells under building lots are split finer (≈2 m) so graded lots stay flat up to the walls. */
const SUB_LOT = 6;

/** Height on one grid cell split along the same diagonal the mesh uses (u, v in 0..1). */
function cellHeight(a: number, b: number, c: number, d: number, u: number, v: number, even: boolean) {
  if (even) return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  return v >= u ? a + (d - c) * u + (c - a) * v : a + (b - a) * u + (d - b) * v;
}

/** Exact heights of the drawn near-terrain triangles, so vehicles, trees and props sit on what you see. */
class TerrainSampler {
  ready = false;
  private h: Float32Array = new Float32Array(0);
  private rough: Uint8Array = new Uint8Array(0);
  private fine = new Map<number, Float32Array>();
  init(h: Float32Array, rough: Uint8Array, fine: Map<number, Float32Array>) {
    this.h = h;
    this.rough = rough;
    this.fine = fine;
    this.ready = true;
  }
  height(x: number, z: number): number {
    const fx = (x + GRID_HALF) / STEP;
    const fz = (z + GRID_HALF) / STEP;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    if (!this.ready || i < 0 || j < 0 || i >= GRID_SEG || j >= GRID_SEG) return heightAt(x, z);
    const key = j * GRID_SEG + i;
    const f = this.fine.get(key);
    if (f) {
      const n = Math.round(Math.sqrt(f.length));
      const s = n - 1;
      const gx = (fx - i) * s;
      const gz = (fz - j) * s;
      const a = Math.min(s - 1, Math.floor(gx));
      const b = Math.min(s - 1, Math.floor(gz));
      return cellHeight(f[b * n + a], f[b * n + a + 1], f[(b + 1) * n + a], f[(b + 1) * n + a + 1], gx - a, gz - b, (i * s + a + j * s + b) % 2 === 0);
    }
    // jittered mountain-wall cells: the analytic height is close enough there
    if (this.rough[key]) return heightAt(x, z);
    const c = GRID_SEG + 1;
    return cellHeight(this.h[j * c + i], this.h[j * c + i + 1], this.h[(j + 1) * c + i], this.h[(j + 1) * c + i + 1], fx - i, fz - j, (i + j) % 2 === 0);
  }
}
const sampler = new TerrainSampler();

/** Height of the ground mesh as drawn (falls back to the analytic terrain before the mesh exists). */
export function groundHeight(x: number, z: number): number {
  return sampler.height(x, z);
}

/** Height anywhere, including the distant mountain ring (for pylons beyond the near grid). */
export function farHeight(x: number, z: number): number {
  return Math.hypot(x, z) < RING_IN ? heightAt(x, z) : ringHeight(x, z);
}

function mountainExtra(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const env = smoothstep(3600, 6400, r);
  const pass = 1 - 0.8 * Math.exp(-Math.pow((z - centreZ(x)) / (300 + r * 0.06), 2));
  const peaks = Math.pow(ridged(x * 0.00024 + 3.1, z * 0.00024 - 1.7, 4), 1.5) * 1120 + fbm(x * 0.0009, z * 0.0009, 3) * 130;
  const VOL = { x: 2900, z: -7300, h: 1550, r: 3700 };
  const dv = Math.hypot(x - VOL.x, z - VOL.z);
  const v = Math.pow(Math.max(0, 1 - dv / VOL.r), 1.55) * VOL.h;
  return Math.max(0, peaks * env * pass) + v * (0.85 + 0.15 * nC(x * 0.002, z * 0.002));
}

function ringHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const near = rawHeight(x, z);
  const far = Math.max(near, mountainExtra(x, z) + 26 * (fbm(x * 0.0032, z * 0.0032) + 0.5) + Math.min(r, 4000) * 0.06);
  return lerp(near, far, smoothstep(RING_IN, 3400, r));
}

/** 0..1: how forested a spot is (used by the vegetation scatter and ground tint). */
export function forestDensity(x: number, z: number): number {
  if (lakeEllipse(x, z) < 1.12) return 0;
  const v = valley(x, z);
  const clearing = smoothstep(-0.35, 0.15, nC(x * 0.004 + 11, z * 0.004 - 5));
  let d: number;
  if (v.e > 0) {
    const h = rawHeight(x, z);
    d = (0.35 + 0.6 * clearing) * (1 - smoothstep(560, 700, h));
  } else {
    d = smoothstep(-110, 0, v.e) * 0.75 * (0.4 + 0.6 * clearing);
    // the forest closes in around the edge of town (farms and lots are cleared by the layout)
    const town = Math.hypot(x / 1000, z / 560);
    d = Math.max(d, smoothstep(1.0, 1.45, town) * 0.6 * (0.35 + 0.65 * clearing));
    const r = river.query(x, z);
    if (r && r.dist > r.hw + 4 && r.dist < r.hw + 45) d = Math.max(d, 0.35 * clearing);
    // second growth takes back every piece of the valley floor that nobody built on, farmed or mowed
    const meadow = smoothstep(0.25, 0.6, nA(x * 0.0031 - 7, z * 0.0031 + 3));
    d = Math.max(d, smoothstep(16, 58, wildDistance(x, z)) * (0.9 - 0.75 * meadow));
  }
  return d;
}

const WILD = { half: 1920, cell: 8, n: 480, data: null as Float32Array | null };

/** Metres from (x, z) to the nearest road, lot, farm or other developed ground; 0 until the town is laid out. */
export function wildDistance(x: number, z: number): number {
  const f = WILD.data;
  if (!f) return 0;
  const u = clamp((x + WILD.half) / WILD.cell - 0.5, 0, WILD.n - 1.001);
  const w = clamp((z + WILD.half) / WILD.cell - 0.5, 0, WILD.n - 1.001);
  const i = Math.floor(u);
  const j = Math.floor(w);
  const fu = u - i;
  const fw = w - j;
  const a = f[j * WILD.n + i];
  const b = f[j * WILD.n + i + 1];
  const c = f[(j + 1) * WILD.n + i];
  const e = f[(j + 1) * WILD.n + i + 1];
  return (a + (b - a) * fu) * (1 - fw) + (c + (e - c) * fu) * fw;
}

/** Records the developed ground once the town is laid out, so the forest can grow back around it. */
export function setDevelopment(developed: (x: number, z: number) => boolean) {
  const { n, cell, half } = WILD;
  const f = new Float32Array(n * n).fill(1e6);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) if (developed(-half + (i + 0.5) * cell, -half + (j + 0.5) * cell)) f[j * n + i] = 0;
  const D1 = cell;
  const D2 = cell * Math.SQRT2;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      let v = f[j * n + i];
      if (i > 0) v = Math.min(v, f[j * n + i - 1] + D1);
      if (j > 0) {
        v = Math.min(v, f[(j - 1) * n + i] + D1);
        if (i > 0) v = Math.min(v, f[(j - 1) * n + i - 1] + D2);
        if (i < n - 1) v = Math.min(v, f[(j - 1) * n + i + 1] + D2);
      }
      f[j * n + i] = v;
    }
  for (let j = n - 1; j >= 0; j--)
    for (let i = n - 1; i >= 0; i--) {
      let v = f[j * n + i];
      if (i < n - 1) v = Math.min(v, f[j * n + i + 1] + D1);
      if (j < n - 1) {
        v = Math.min(v, f[(j + 1) * n + i] + D1);
        if (i < n - 1) v = Math.min(v, f[(j + 1) * n + i + 1] + D2);
        if (i > 0) v = Math.min(v, f[(j + 1) * n + i - 1] + D2);
      }
      f[j * n + i] = v;
    }
  WILD.data = f;
}

const C = (hex: number) => new THREE.Color(hex);
const COL = {
  floor: C(0x66803f),
  floor2: C(0x718a45),
  meadow: C(0x76894a),
  dry: C(0x9d9a5c),
  forest: C(0x45612f),
  forestDark: C(0x364d27),
  dirt: C(0x7d6a52),
  rock: C(0x7b7d84),
  rockDark: C(0x5f6168),
  alpine: C(0x6d7a58),
  snow: C(0xf2f4f7),
  shore: C(0xa89c7a),
  lakebed: C(0x5b6a5a),
  riverbed: C(0x6f6a58),
};

/** Representative ground colour at a point (also used by the minimap). */
export function groundColor(cx: number, cy: number, cz: number, ny: number, out: THREE.Color) {
  const n = nC(cx * 0.01, cz * 0.01);
  const le = lakeEllipse(cx, cz);
  if (le < 1.0) return out.copy(COL.lakebed);
  if (le < 1.1) return out.copy(COL.shore);
  const r = river.query(cx, cz);
  if (r && r.dist < r.hw + 3) return out.copy(COL.riverbed);
  if (r && r.dist < r.hw + 7) return out.copy(COL.shore);
  const v = valley(cx, cz);
  if (v.e > 20 || Math.hypot(cx, cz) > 2100) {
    const snowLine = 660 + nC(cx * 0.003, cz * 0.003) * 90 - (1 - ny) * 90;
    if (cy > snowLine && ny > 0.42) return out.copy(COL.snow);
    if (cy > snowLine - 90 && ny > 0.6) return out.copy(COL.snow).lerp(COL.rock, 0.4);
    if (cy > 540 || ny < 0.5) return out.copy(ny < 0.66 ? COL.rockDark : COL.rock).lerp(COL.rock, n * 0.5 + 0.5);
    if (cy > 420) return out.copy(COL.alpine).lerp(COL.forestDark, clamp(n + 0.4, 0, 1));
    return out.copy(COL.forestDark).lerp(COL.forest, clamp(n * 0.5 + 0.35, 0, 1));
  }
  if (ny < 0.8) return out.copy(COL.dirt).lerp(COL.rock, 0.3);
  const fd = forestDensity(cx, cz);
  if (v.e < -40 && fd < 0.2) return out.copy(COL.floor).lerp(COL.floor2, n * 0.5 + 0.5).lerp(COL.dry, clamp(nA(cx * 0.004, cz * 0.004) * 0.6, 0, 0.35));
  out.copy(COL.meadow).lerp(COL.dry, clamp(nA(cx * 0.004, cz * 0.004) * 0.8, 0, 0.6));
  return out.lerp(COL.forest, smoothstep(0.15, 0.8, fd)).lerp(COL.forestDark, clamp(fd * n, 0, 0.5));
}

/** Writes flat-shaded, per-face coloured triangles (wound to face up) into preallocated arrays. */
class FacetWriter {
  readonly pos: Float32Array;
  readonly col: Float32Array;
  p = 0;
  private e1 = new THREE.Vector3();
  private e2 = new THREE.Vector3();
  private tmp = new THREE.Color();
  constructor(
    maxTris: number,
    private sink?: (x: number, z: number) => number,
  ) {
    this.pos = new Float32Array(maxTris * 9);
    this.col = new Float32Array(maxTris * 9);
  }
  tri(A: THREE.Vector3, B0: THREE.Vector3, C0: THREE.Vector3) {
    let B = B0;
    let Cc = C0;
    const nrm = this.e1.subVectors(B, A).cross(this.e2.subVectors(Cc, A)).normalize();
    if (nrm.y < 0) {
      nrm.negate();
      B = C0;
      Cc = B0;
    }
    groundColor((A.x + B.x + Cc.x) / 3, (A.y + B.y + Cc.y) / 3, (A.z + B.z + Cc.z) / 3, nrm.y, this.tmp);
    for (const v of [A, B, Cc]) {
      const p = this.p;
      this.pos[p] = v.x;
      this.pos[p + 1] = v.y - (this.sink ? this.sink(v.x, v.z) : 0);
      this.pos[p + 2] = v.z;
      this.col[p] = this.tmp.r;
      this.col[p + 1] = this.tmp.g;
      this.col[p + 2] = this.tmp.b;
      this.p += 3;
    }
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, this.p), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col.slice(0, this.p), 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

/** Builds a flat-shaded, per-face coloured mesh from a height-sampled vertex grid (skipping refined cells). */
function facetMesh(verts: Float32Array, cols: number, rows: number, wrap: boolean, sink?: (x: number, z: number) => number, skip?: (i: number, j: number) => boolean): THREE.BufferGeometry {
  const quadsX = wrap ? cols : cols - 1;
  const w = new FacetWriter(quadsX * (rows - 1) * 2, sink);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const V = (i: number, j: number, out: THREE.Vector3) => {
    const k = (j * cols + (i % cols)) * 3;
    return out.set(verts[k], verts[k + 1], verts[k + 2]);
  };
  for (let j = 0; j < rows - 1; j++)
    for (let i = 0; i < quadsX; i++) {
      if (skip?.(i, j)) continue;
      V(i, j, a);
      V(i + 1, j, b);
      V(i, j + 1, c);
      V(i + 1, j + 1, d);
      if ((i + j) % 2 === 0) {
        w.tri(a, c, b);
        w.tri(b, c, d);
      } else {
        w.tri(a, c, d);
        w.tri(a, d, b);
      }
    }
  return w.geometry();
}

/** Re-winds a non-indexed triangle soup so every face points up (+Y), then computes normals. */
function upFacing(g: THREE.BufferGeometry) {
  const attrs = Object.values(g.attributes) as THREE.BufferAttribute[];
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let t = 0; t < pos.count; t += 3) {
    const ax = pos.getX(t);
    const az = pos.getZ(t);
    const ny = (pos.getZ(t + 1) - az) * (pos.getX(t + 2) - ax) - (pos.getX(t + 1) - ax) * (pos.getZ(t + 2) - az);
    if (ny >= 0) continue;
    for (const at of attrs)
      for (let c = 0; c < at.itemSize; c++) {
        const arr = at.array as Float32Array;
        const i1 = (t + 1) * at.itemSize + c;
        const i2 = (t + 2) * at.itemSize + c;
        const tmp = arr[i1];
        arr[i1] = arr[i2];
        arr[i2] = tmp;
      }
  }
  g.computeVertexNormals();
}

export function createTerrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'terrain';
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  mat.name = 'terrain';

  const cols = GRID_SEG + 1;
  const grid = new Float32Array(cols * cols * 3);
  const gh = new Float32Array(cols * cols);
  const jittered = new Uint8Array(cols * cols);
  const jitter = new Rng(99);
  /** Ground height at a mesh vertex: graded terrain, kept just below any at-grade road surface. */
  const vh = (x: number, z: number) => underRoads(x, z, heightAt(x, z)) - (valley(x, z).e < 0 ? 0.02 : 0);
  for (let j = 0; j < cols; j++)
    for (let i = 0; i < cols; i++) {
      let x = -GRID_HALF + (i / GRID_SEG) * GRID_HALF * 2;
      let z = -GRID_HALF + (j / GRID_SEG) * GRID_HALF * 2;
      const v = valley(x, z);
      // low-poly irregularity only on the mountain walls, away from roads and farmyards
      const jx = jitter.range(-3.5, 3.5);
      const jz = jitter.range(-3.5, 3.5);
      if (v.e > 45 && i > 0 && j > 0 && i < GRID_SEG && j < GRID_SEG && !roadClose?.(x, z, 20) && !nearLot(x, z, 25) && !pads.some((p) => Math.abs(x - p.x) < p.hw + p.fall && Math.abs(z - p.z) < p.hd + p.fall)) {
        x += jx;
        z += jz;
        jittered[j * cols + i] = 1;
      }
      const k = (j * cols + i) * 3;
      const y = vh(x, z);
      grid[k] = x;
      grid[k + 1] = y;
      grid[k + 2] = z;
      gh[j * cols + i] = y;
    }

  // cells beside roads are refined so the ground follows cuts, fills, curbs and junctions closely, and cells under
  // building lots twice as finely again, so a lot graded flat is drawn flat right up to the walls
  const rough = new Uint8Array(GRID_SEG * GRID_SEG);
  const sub = new Uint8Array(GRID_SEG * GRID_SEG);
  for (let j = 0; j < GRID_SEG; j++)
    for (let i = 0; i < GRID_SEG; i++) {
      const key = j * GRID_SEG + i;
      rough[key] = jittered[j * cols + i] | jittered[j * cols + i + 1] | jittered[(j + 1) * cols + i] | jittered[(j + 1) * cols + i + 1];
      const cx = -GRID_HALF + (i + 0.5) * STEP;
      const cz = -GRID_HALF + (j + 0.5) * STEP;
      if (rough[key] || Math.hypot(cx, cz) >= RING_IN - 30) continue;
      if (nearLot(cx, cz, STEP * 0.75)) sub[key] = SUB_LOT;
      else if (roadClose?.(cx, cz, 15)) sub[key] = SUB;
    }
  const subAt = (i: number, j: number) => (i >= 0 && j >= 0 && i < GRID_SEG && j < GRID_SEG ? sub[j * GRID_SEG + i] : 0);
  const fine = new Map<number, Float32Array>();
  let fineTris = 0;
  for (const s of sub) fineTris += s * s * 2;
  const fw = new FacetWriter(fineTris);
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const C = new THREE.Vector3();
  const D = new THREE.Vector3();
  for (let j = 0; j < GRID_SEG; j++)
    for (let i = 0; i < GRID_SEG; i++) {
      const s = sub[j * GRID_SEG + i];
      if (!s) continue;
      const n = s + 1;
      const x0 = -GRID_HALF + i * STEP;
      const z0 = -GRID_HALF + j * STEP;
      const h00 = gh[j * cols + i];
      const h10 = gh[j * cols + i + 1];
      const h01 = gh[(j + 1) * cols + i];
      const h11 = gh[(j + 1) * cols + i + 1];
      // an edge shared with a refined neighbour keeps only the vertices both cells have (the coarser grid's) and runs
      // straight between them; against an unrefined neighbour the whole edge stays straight (no cracks either way)
      const edge = (k: number, sN: number, px: (t: number) => number, pz: (t: number) => number, h0: number, h1: number) => {
        if (!sN) return lerp(h0, h1, k / s);
        const step = s / Math.min(s, sN);
        const at = (kk: number) => (kk === 0 ? h0 : kk === s ? h1 : vh(px(kk / s), pz(kk / s)));
        const k0 = k - (k % step);
        return k === k0 ? at(k) : lerp(at(k0), at(k0 + step), (k - k0) / step);
      };
      const f = new Float32Array(n * n);
      for (let b = 0; b <= s; b++)
        for (let a = 0; a <= s; a++) {
          const u = a / s;
          const v = b / s;
          let h: number;
          const ea = a === 0 || a === s;
          const eb = b === 0 || b === s;
          if (ea && eb) h = a === 0 ? (b === 0 ? h00 : h01) : b === 0 ? h10 : h11;
          else if (a === 0) h = edge(b, subAt(i - 1, j), () => x0, (t) => z0 + t * STEP, h00, h01);
          else if (a === s) h = edge(b, subAt(i + 1, j), () => x0 + STEP, (t) => z0 + t * STEP, h10, h11);
          else if (b === 0) h = edge(a, subAt(i, j - 1), (t) => x0 + t * STEP, () => z0, h00, h10);
          else if (b === s) h = edge(a, subAt(i, j + 1), (t) => x0 + t * STEP, () => z0 + STEP, h01, h11);
          else h = vh(x0 + u * STEP, z0 + v * STEP);
          f[b * n + a] = h;
        }
      fine.set(j * GRID_SEG + i, f);
      for (let b = 0; b < s; b++)
        for (let a = 0; a < s; a++) {
          const P = (aa: number, bb: number, out: THREE.Vector3) => out.set(x0 + (aa / s) * STEP, f[bb * n + aa], z0 + (bb / s) * STEP);
          P(a, b, A);
          P(a + 1, b, B);
          P(a, b + 1, C);
          P(a + 1, b + 1, D);
          if ((i * s + a + j * s + b) % 2 === 0) {
            fw.tri(A, C, B);
            fw.tri(B, C, D);
          } else {
            fw.tri(A, C, D);
            fw.tri(A, D, B);
          }
        }
    }
  sampler.init(gh, rough, fine);

  const sink = (x: number, z: number) => smoothstep(RING_IN + 40, RING_IN + 110, Math.hypot(x, z)) * 260;
  const ground = new THREE.Mesh(facetMesh(grid, cols, cols, false, sink, (i, j) => sub[j * GRID_SEG + i] > 0), mat);
  ground.receiveShadow = true;
  ground.name = 'ground';
  ground.matrixAutoUpdate = false;
  group.add(ground);
  const near = new THREE.Mesh(fw.geometry(), mat);
  near.receiveShadow = true;
  near.name = 'ground-near-roads';
  near.matrixAutoUpdate = false;
  group.add(near);

  const ang = 320;
  const rad = 96;
  const ring = new Float32Array(ang * rad * 3);
  for (let j = 0; j < rad; j++) {
    const t = j / (rad - 1);
    const r = RING_IN + (RING_OUT - RING_IN) * Math.pow(t, 1.7);
    for (let i = 0; i < ang; i++) {
      const th = (i / ang) * Math.PI * 2 + (j > 0 ? jitter.range(-0.004, 0.004) : 0);
      const rr = r + (j > 0 && j < rad - 1 ? jitter.range(-15, 15) : 0);
      const x = Math.cos(th) * rr;
      const z = Math.sin(th) * rr;
      const k = (j * ang + i) * 3;
      ring[k] = x;
      ring[k + 1] = ringHeight(x, z) - (j === 0 ? 1.5 : 0);
      ring[k + 2] = z;
    }
  }
  const mountains = new THREE.Mesh(facetMesh(ring, ang, rad, true), mat);
  mountains.name = 'mountains';
  mountains.receiveShadow = true;
  mountains.matrixAutoUpdate = false;
  group.add(mountains);

  // water surfaces carry per-vertex depth (for colour, clarity and shore foam) and flow (river current);
  // the shading itself is the water material installed by the engine (see engine/water.ts)
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f7f86, roughness: 0.06, metalness: 0.3, envMapIntensity: 1.25 });
  waterMat.name = 'water';

  // lake: rings from the middle out past the shoreline, depth from the basin profile
  const lp: number[] = [];
  const ld: number[] = [];
  const lf: number[] = [];
  const RINGS = 26;
  const SEGS = 120;
  const lakeV = (ri: number, si: number) => {
    const t = ri / RINGS;
    const a = (si / SEGS) * Math.PI * 2;
    const x = LAKE.x + Math.cos(a) * LAKE.rx * 1.04 * t;
    const z = LAKE.z + Math.sin(a) * LAKE.rz * 1.04 * t;
    const le = lakeEllipse(x, z);
    return { x, z, d: le < 1 ? 0.4 + (1 - le) * 5.5 : Math.max(0, 0.4 - (le - 1) * 8) };
  };
  for (let ri = 0; ri < RINGS; ri++)
    for (let si = 0; si < SEGS; si++) {
      const q = [lakeV(ri, si), lakeV(ri + 1, si), lakeV(ri, si + 1), lakeV(ri + 1, si + 1)];
      for (const k of ri === 0 ? [0, 3, 1] : [0, 2, 1, 1, 2, 3]) {
        lp.push(q[k].x - LAKE.x, 0, q[k].z - LAKE.z);
        ld.push(q[k].d);
        lf.push(0, 0);
      }
    }
  const lakeGeo = new THREE.BufferGeometry();
  lakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lakeGeo.setAttribute('wdepth', new THREE.Float32BufferAttribute(ld, 1));
  lakeGeo.setAttribute('flow', new THREE.Float32BufferAttribute(lf, 2));
  upFacing(lakeGeo);
  const water = new THREE.Mesh(lakeGeo, waterMat);
  water.position.set(LAKE.x, LAKE.level, LAKE.z);
  water.receiveShadow = true;
  water.name = 'lake';
  group.add(water);

  // river: five lanes across so depth can fall away to the banks; flow follows the channel downstream
  const pts = river.pts;
  const rpos: number[] = [];
  const rdep: number[] = [];
  const rflow: number[] = [];
  const LANES = [-1, -0.55, 0, 0.55, 1];
  const SPEED = 1.3;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const L = Math.hypot(tx, tz);
    const nx = -tz / L;
    const nz = tx / L;
    const V = (p: typeof a, u: number) => {
      const w = p.hw + 1.5;
      return { x: p.x + nx * w * u, y: p.water, z: p.z + nz * w * u, d: Math.max(0, 1.9 * (1 - u * u) - 0.15), f: [(tx / L) * SPEED * (1 - 0.6 * u * u), (tz / L) * SPEED * (1 - 0.6 * u * u)] };
    };
    for (let l = 0; l < LANES.length - 1; l++) {
      const q = [V(a, LANES[l]), V(b, LANES[l]), V(a, LANES[l + 1]), V(b, LANES[l + 1])];
      for (const k of [0, 1, 2, 2, 1, 3]) {
        rpos.push(q[k].x, q[k].y, q[k].z);
        rdep.push(q[k].d);
        rflow.push(q[k].f[0], q[k].f[1]);
      }
    }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3));
  rg.setAttribute('wdepth', new THREE.Float32BufferAttribute(rdep, 1));
  rg.setAttribute('flow', new THREE.Float32BufferAttribute(rflow, 2));
  upFacing(rg);
  const riverMesh = new THREE.Mesh(rg, waterMat);
  riverMesh.name = 'river';
  riverMesh.receiveShadow = true;
  group.add(riverMesh);
  return group;
}

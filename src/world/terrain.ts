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

export const LAKE = { x: 700, z: 420, rx: 300, rz: 165, level: -0.7 };
/** Drivable/explorable radius. */
export const MAP_RADIUS = 1850;
const GRID_HALF = 2000;
const GRID_SEG = 320;
const RING_IN = 1880;
const RING_OUT = 15000;

// ------------------------------------------------------------------ valley (Wallace-style canyon town)
// Valley centre line and the half-widths of its flat floor to the north and south, sampled along x.
const VX = [-2600, -1800, -1200, -700, -300, 0, 300, 700, 1200, 1800, 2600];
const VZ = [-240, -200, -120, -40, -10, 0, 15, 110, 80, 0, -40];
const VN = [170, 180, 380, 360, 290, 215, 230, 300, 380, 240, 200];
const VS = [170, 180, 300, 330, 300, 250, 260, 520, 420, 240, 200];

function knot(arr: number[], x: number): number {
  if (x <= VX[0]) return arr[0];
  if (x >= VX[VX.length - 1]) return arr[arr.length - 1];
  let i = 0;
  while (x > VX[i + 1]) i++;
  const t = (x - VX[i]) / (VX[i + 1] - VX[i]);
  return lerp(arr[i], arr[i + 1], t * t * (3 - 2 * t));
}

/** Placer-Creek style side canyon opening south of downtown. */
const canyon = (x: number) => 165 * Math.exp(-(((x - 110) / 75) ** 2));

export interface ValleyInfo {
  zc: number;
  north: boolean;
  /** Metres beyond the edge of the flat floor (negative = on the floor). */
  e: number;
  floorY: number;
}

/** The floor rises gently to the west (upstream) so the river has somewhere to come from. */
const floorRise = (x: number) => Math.max(0, -x - 600) * 0.012;

export function valley(x: number, z: number): ValleyInfo {
  const zc = knot(VZ, x);
  const north = z < zc;
  const hw = north ? knot(VN, x) : knot(VS, x) + canyon(x);
  return { zc, north, e: Math.abs(z - zc) - hw, floorY: floorRise(x) };
}

interface Peak {
  name: string;
  x: number;
  z: number;
  h: number;
  r: number;
}
/** Individual mountains close to town (in addition to the distant ring). */
export const PEAKS: Peak[] = [
  { name: 'Mt. Hollow', x: -1450, z: -820, h: 880, r: 720 },
  { name: 'Sunset Peak', x: -220, z: -880, h: 720, r: 620 },
  { name: 'Silver Crown', x: 980, z: -920, h: 780, r: 660 },
  { name: 'Placer Butte', x: -520, z: 840, h: 800, r: 660 },
  { name: 'Lookout Mtn', x: 1330, z: 940, h: 840, r: 660 },
  { name: 'Granite Ridge', x: -1420, z: 640, h: 700, r: 600 },
];

function lakeEllipse(x: number, z: number) {
  return Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) + nC(x * 0.006, z * 0.006) * 0.08;
}

/** Natural terrain: valley floor, steep forested walls, close peaks and the lake basin (no roads/river). */
export function rawHeight(x: number, z: number): number {
  const v = valley(x, z);
  let h = v.floorY;
  if (v.e > 0) {
    const H = v.north ? 470 + 110 * nA(x * 0.0011, 3.3) : (400 + 90 * nA(x * 0.0012, -7.1)) * (1 - 0.35 * Math.exp(-(((x - 110) / 120) ** 2)));
    const t = 1 - Math.exp(-v.e / 220);
    h += H * Math.pow(t, 1.5);
    const detail = fbm(x * 0.0042, z * 0.0042, 4) * 38 + (ridged(x * 0.0016 + 4, z * 0.0016 - 2, 4) - 0.35) * 70;
    h += detail * smoothstep(0, 90, v.e);
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
      this.pts.push({ x: p.x, z: p.z, s, hw: lerp(8, 12.5, i / n), water });
    }
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i];
      const b = this.pts[i + 1];
      const pad = b.hw + 10;
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

/** South Fork: enters from the western canyon, runs along the north edge of downtown and into the lake. */
export const RIVER_CTRL: [number, number][] = [
  [-1860, -300],
  [-1600, -322],
  [-1380, -360],
  [-1180, -382],
  [-1050, -372],
  [-930, -330],
  [-800, -292],
  [-690, -262],
  [-560, -235],
  [-400, -205],
  [-200, -172],
  [0, -152],
  [180, -142],
  [330, -120],
  [440, -72],
  [500, 30],
  [506, 160],
  [480, 262],
  [505, 360],
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

/** Final ground height of the near terrain (metres). */
export function heightAt(x: number, z: number): number {
  let h = preRoadHeight(x, z);
  if (roadHook) h = roadHook(x, z, h);
  const r = river.query(x, z);
  if (r) {
    const B = r.hw + 8;
    if (r.dist < B) h = Math.min(h, r.bed + (h - r.bed) * smoothstep(r.hw * 0.45, B, r.dist));
  }
  return h;
}

/** Height anywhere, including the distant mountain ring (for pylons beyond the near grid). */
export function farHeight(x: number, z: number): number {
  return Math.hypot(x, z) < RING_IN ? heightAt(x, z) : ringHeight(x, z);
}

function mountainExtra(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const env = smoothstep(3600, 6400, r);
  const pass = 1 - 0.8 * Math.exp(-Math.pow((z - knot(VZ, x)) / (300 + r * 0.06), 2));
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
    const r = river.query(x, z);
    if (r && r.dist > r.hw + 4 && r.dist < r.hw + 45) d = Math.max(d, 0.35 * clearing);
  }
  return d;
}

const C = (hex: number) => new THREE.Color(hex);
const COL = {
  floor: C(0x739440),
  floor2: C(0x7d9b45),
  meadow: C(0x7f9a48),
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

/** Builds a flat-shaded, per-face coloured mesh from a height-sampled vertex grid. */
function facetMesh(verts: Float32Array, cols: number, rows: number, wrap: boolean, sink?: (x: number, z: number) => number): THREE.BufferGeometry {
  const quadsX = wrap ? cols : cols - 1;
  const triCount = quadsX * (rows - 1) * 2;
  const pos = new Float32Array(triCount * 9);
  const col = new Float32Array(triCount * 9);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const tmp = new THREE.Color();
  let p = 0;
  const V = (i: number, j: number, out: THREE.Vector3) => {
    const k = (j * cols + (i % cols)) * 3;
    return out.set(verts[k], verts[k + 1], verts[k + 2]);
  };
  const tri = (A: THREE.Vector3, B0: THREE.Vector3, C0: THREE.Vector3) => {
    let B = B0;
    let Cc = C0;
    e1.subVectors(B, A);
    e2.subVectors(Cc, A);
    const nrm = e1.cross(e2).normalize();
    if (nrm.y < 0) {
      nrm.negate();
      B = C0;
      Cc = B0;
    }
    groundColor((A.x + B.x + Cc.x) / 3, (A.y + B.y + Cc.y) / 3, (A.z + B.z + Cc.z) / 3, nrm.y, tmp);
    for (const v of [A, B, Cc]) {
      pos[p] = v.x;
      pos[p + 1] = v.y - (sink ? sink(v.x, v.z) : 0);
      pos[p + 2] = v.z;
      col[p] = tmp.r;
      col[p + 1] = tmp.g;
      col[p + 2] = tmp.b;
      p += 3;
    }
  };
  for (let j = 0; j < rows - 1; j++)
    for (let i = 0; i < quadsX; i++) {
      V(i, j, a);
      V(i + 1, j, b);
      V(i, j + 1, c);
      V(i + 1, j + 1, d);
      if ((i + j) % 2 === 0) {
        tri(a, c, b);
        tri(b, c, d);
      } else {
        tri(a, c, d);
        tri(a, d, b);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function createTerrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'terrain';
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  mat.name = 'terrain';

  const cols = GRID_SEG + 1;
  const grid = new Float32Array(cols * cols * 3);
  const jitter = new Rng(99);
  for (let j = 0; j < cols; j++)
    for (let i = 0; i < cols; i++) {
      let x = -GRID_HALF + (i / GRID_SEG) * GRID_HALF * 2;
      let z = -GRID_HALF + (j / GRID_SEG) * GRID_HALF * 2;
      const v = valley(x, z);
      // low-poly irregularity only on the mountain walls, away from roads and farmyards
      const jx = jitter.range(-3.5, 3.5);
      const jz = jitter.range(-3.5, 3.5);
      if (v.e > 45 && i > 0 && j > 0 && i < GRID_SEG && j < GRID_SEG && !pads.some((p) => Math.abs(x - p.x) < p.hw + p.fall && Math.abs(z - p.z) < p.hd + p.fall)) {
        x += jx;
        z += jz;
      }
      const k = (j * cols + i) * 3;
      grid[k] = x;
      grid[k + 1] = heightAt(x, z) - (v.e < 0 ? 0.02 : 0);
      grid[k + 2] = z;
    }
  const sink = (x: number, z: number) => smoothstep(RING_IN + 40, RING_IN + 110, Math.hypot(x, z)) * 260;
  const ground = new THREE.Mesh(facetMesh(grid, cols, cols, false, sink), mat);
  ground.receiveShadow = true;
  ground.name = 'ground';
  ground.matrixAutoUpdate = false;
  group.add(ground);

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

  // lake surface (turquoise glacial water, like the reference footage)
  const lakeShape = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const x = Math.cos(a) * LAKE.rx * 1.03;
    const z = Math.sin(a) * LAKE.rz * 1.03;
    if (i === 0) lakeShape.moveTo(x, z);
    else lakeShape.lineTo(x, z);
  }
  const lakeGeo = new THREE.ShapeGeometry(lakeShape);
  lakeGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f7f86, roughness: 0.06, metalness: 0.3, envMapIntensity: 1.25 });
  waterMat.name = 'water';
  const water = new THREE.Mesh(lakeGeo, waterMat);
  water.position.set(LAKE.x, LAKE.level, LAKE.z);
  water.receiveShadow = true;
  water.name = 'lake';
  group.add(water);

  // river surface ribbon
  const pts = river.pts;
  const pos: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const L = Math.hypot(tx, tz);
    const nx = -tz / L;
    const nz = tx / L;
    const wa = a.hw + 1.5;
    const wb = b.hw + 1.5;
    const A1 = [a.x + nx * wa, a.water, a.z + nz * wa];
    const A2 = [a.x - nx * wa, a.water, a.z - nz * wa];
    const B1 = [b.x + nx * wb, b.water, b.z + nz * wb];
    const B2 = [b.x - nx * wb, b.water, b.z - nz * wb];
    pos.push(...A1, ...B1, ...A2, ...A2, ...B1, ...B2);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.computeVertexNormals();
  if ((rg.attributes.normal as THREE.BufferAttribute).getY(0) < 0) {
    rg.index = null;
    const p = rg.attributes.position.array as Float32Array;
    for (let i = 0; i < p.length; i += 9)
      for (let c = 0; c < 3; c++) {
        const t = p[i + 3 + c];
        p[i + 3 + c] = p[i + 6 + c];
        p[i + 6 + c] = t;
      }
    rg.computeVertexNormals();
  }
  const riverMat = new THREE.MeshStandardMaterial({ color: 0x2f6f73, roughness: 0.12, metalness: 0.25, envMapIntensity: 1.1 });
  riverMat.name = 'river';
  const riverMesh = new THREE.Mesh(rg, riverMat);
  riverMesh.name = 'river';
  riverMesh.receiveShadow = true;
  group.add(riverMesh);
  return group;
}

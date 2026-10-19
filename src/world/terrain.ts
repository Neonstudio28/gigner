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

export const TOWN = { rx: 400, rz: 340 };
export const LAKE = { x: 700, z: 420, rx: 300, rz: 165, level: -0.7 };
/** Drivable/explorable radius. */
export const MAP_RADIUS = 1850;
/** SR-9 runs north–south along x = 0 and ends at ±SR9_END. */
export const SR9_END = 1800;
const VOLCANO = { x: 2900, z: -7300, h: 1550, r: 3700 };
const GRID_HALF = 2000;
const GRID_SEG = 250;
const RING_IN = 1880;
const RING_OUT = 15000;
/** Half-width of SR-9's perfectly flat cross-section (matches the 16 m terrain grid). */
const CORRIDOR_FLAT = 18;
const CORRIDOR_BLEND = 62;

export function townEllipse(x: number, z: number) {
  return Math.hypot(x / TOWN.rx, z / TOWN.rz);
}

function lakeEllipse(x: number, z: number) {
  return Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) + nC(x * 0.006, z * 0.006) * 0.08;
}

export function isWater(x: number, z: number) {
  return lakeEllipse(x, z) < 0.98;
}

/** Rolling foothills; the town ellipse and the US-20 valley are flattened. */
function baseHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const hills = 26 * (fbm(x * 0.0032, z * 0.0032) + 0.5) + 9 * fbm(x * 0.011 + 7, z * 0.011 - 3, 3);
  const rise = Math.min(Math.max(0, r - 620), 3200) * 0.085;
  const valley = smoothstep(50, 240 + Math.max(0, Math.abs(x) - 800) * 0.05, Math.abs(z));
  return Math.max(0, hills + rise) * valley;
}

function mountainExtra(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const env = smoothstep(3600, 6400, r);
  const pass = 1 - 0.8 * Math.exp(-Math.pow(z / (300 + r * 0.06), 2));
  const peaks = Math.pow(ridged(x * 0.00024 + 3.1, z * 0.00024 - 1.7, 4), 1.5) * 1120 + fbm(x * 0.0009, z * 0.0009, 3) * 130;
  const dv = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
  const v = Math.pow(Math.max(0, 1 - dv / VOLCANO.r), 1.55) * VOLCANO.h;
  return Math.max(0, peaks * env * pass) + v * (0.85 + 0.15 * nC(x * 0.002, z * 0.002));
}

function rawHeight(x: number, z: number): number {
  const te = townEllipse(x, z);
  const tm = smoothstep(1.0, 1.55, te);
  let h = tm > 0 ? baseHeight(x, z) * tm : 0;
  const le = lakeEllipse(x, z);
  if (le < 1.9) {
    const shore = smoothstep(1.0, 1.9, le);
    h *= shore;
    if (le < 1.0) h = LAKE.level - 0.4 - (1 - le) * 5.5;
  }
  return h;
}

export interface FlatPad {
  x: number;
  z: number;
  hw: number;
  hd: number;
  fall: number;
  h: number;
}
const pads: FlatPad[] = [];

function withPads(x: number, z: number): number {
  let h = rawHeight(x, z);
  for (const p of pads) {
    const dx = Math.max(0, Math.abs(x - p.x) - p.hw);
    const dz = Math.max(0, Math.abs(z - p.z) - p.hd);
    const d = Math.hypot(dx, dz);
    if (d < p.fall) h = lerp(p.h, h, smoothstep(0, p.fall, d));
  }
  return h;
}

/**
 * Flattens an axis-aligned area (farmyards) to a single height and returns that height.
 * Must be called before the terrain mesh is built. `h` defaults to the SR-9 road height so
 * farm driveways meet the highway level.
 */
export function addFlatPad(x: number, z: number, w: number, d: number, fall = 32, h?: number): number {
  const height = h ?? heightAt(0, z);
  pads.push({ x, z, hw: w / 2, hd: d / 2, fall, h: height });
  return height;
}

/** Ground height of the near terrain (metres). SR-9's corridor is flat across its width. */
export function heightAt(x: number, z: number): number {
  const ax = Math.abs(x);
  if (ax < CORRIDOR_BLEND) {
    const road = withPads(0, z);
    if (ax <= CORRIDOR_FLAT) return road;
    return lerp(road, withPads(x, z), smoothstep(CORRIDOR_FLAT, CORRIDOR_BLEND, ax));
  }
  return withPads(x, z);
}

/** Height anywhere, including the distant mountain ring (for pylons beyond the near grid). */
export function farHeight(x: number, z: number): number {
  return Math.hypot(x, z) < RING_IN ? heightAt(x, z) : baseHeight(x, z) + mountainExtra(x, z);
}

/** 0..1: how forested a spot is (used by the vegetation scatter and ground tint). */
export function forestDensity(x: number, z: number): number {
  const te = townEllipse(x, z);
  let d = smoothstep(0.98, 1.3, te);
  const clearing = smoothstep(-0.35, 0.1, nC(x * 0.004 + 11, z * 0.004 - 5));
  d *= 0.25 + 0.75 * clearing;
  d *= smoothstep(18, 140, Math.abs(z)) * 0.7 + 0.3 * smoothstep(18, 40, Math.abs(z));
  d *= smoothstep(14, 40, Math.abs(x)) * 0.8 + 0.2;
  const le = lakeEllipse(x, z);
  d *= smoothstep(1.08, 1.35, le);
  return d;
}

const C = (hex: number) => new THREE.Color(hex);
const COL = {
  townGrass: C(0x739440),
  townGrass2: C(0x7d9b45),
  meadow: C(0x7f9a48),
  dry: C(0x9d9a5c),
  forest: C(0x4a6631),
  forestDark: C(0x3c5529),
  dirt: C(0x7d6a52),
  rock: C(0x7b7d84),
  rockDark: C(0x5f6168),
  alpine: C(0x6d7a58),
  snow: C(0xf2f4f7),
  shore: C(0xa89c7a),
  lakebed: C(0x5b6a5a),
};

/** Representative ground colour at a point (also used by the minimap). */
export function groundColor(cx: number, cy: number, cz: number, ny: number, out: THREE.Color) {
  const te = townEllipse(cx, cz);
  const n = nC(cx * 0.01, cz * 0.01);
  const le = lakeEllipse(cx, cz);
  if (le < 1.0) return out.copy(COL.lakebed);
  if (le < 1.12) return out.copy(COL.shore);
  if (cy > 60 || Math.hypot(cx, cz) > 2100) {
    const snowLine = 1020 + nC(cx * 0.003, cz * 0.003) * 140 - (1 - ny) * 100;
    if (cy > snowLine && ny > 0.42) return out.copy(COL.snow);
    if (cy > snowLine - 120 && ny > 0.6) return out.copy(COL.snow).lerp(COL.rock, 0.35);
    if (cy > 700 || ny < 0.55) return out.copy(ny < 0.7 ? COL.rockDark : COL.rock).lerp(COL.rock, n * 0.5 + 0.5);
    if (cy > 420) return out.copy(COL.alpine).lerp(COL.forestDark, clamp(n + 0.4, 0, 1));
    return out.copy(COL.forestDark).lerp(COL.forest, clamp(n * 0.5 + 0.3, 0, 1));
  }
  if (te < 1.0) return out.copy(COL.townGrass).lerp(COL.townGrass2, n * 0.5 + 0.5);
  if (ny < 0.8) return out.copy(COL.dirt).lerp(COL.rock, 0.3);
  const fd = forestDensity(cx, cz);
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
      // keep every face wound counter-clockwise seen from above
      nrm.negate();
      B = C0;
      Cc = B0;
    }
    const cx = (A.x + B.x + Cc.x) / 3;
    const cy = (A.y + B.y + Cc.y) / 3;
    const cz = (A.z + B.z + Cc.z) / 3;
    groundColor(cx, cy, cz, nrm.y, tmp);
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

/** z coordinates of the near-grid rows (SR-9's ribbon samples exactly these so it sits on the mesh). */
export function gridRowsBetween(z0: number, z1: number): number[] {
  const step = (GRID_HALF * 2) / GRID_SEG;
  const out: number[] = [];
  const a = Math.min(z0, z1);
  const b = Math.max(z0, z1);
  for (let j = 0; j <= GRID_SEG; j++) {
    const z = -GRID_HALF + j * step;
    if (z > a && z < b) out.push(z);
  }
  out.unshift(a);
  out.push(b);
  return z0 < z1 ? out : out.reverse();
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
      const inTown = townEllipse(x, z) < 1.05;
      const nearPad = pads.some((p) => Math.abs(x - p.x) < p.hw + p.fall && Math.abs(z - p.z) < p.hd + p.fall);
      // corridor and farm pads stay on the regular grid so road ribbons and yards match exactly
      if (!inTown && !nearPad && Math.abs(x) > 70 && i > 0 && j > 0 && i < GRID_SEG && j < GRID_SEG) {
        x += jitter.range(-4, 4);
        z += jitter.range(-4, 4);
      } else {
        jitter.next();
        jitter.next();
      }
      const k = (j * cols + i) * 3;
      grid[k] = x;
      grid[k + 1] = heightAt(x, z) - (inTown ? 0.02 : 0);
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
      ring[k + 1] = baseHeight(x, z) + mountainExtra(x, z) - (j === 0 ? 1.5 : 0);
      ring[k + 2] = z;
    }
  }
  const mountains = new THREE.Mesh(facetMesh(ring, ang, rad, true), mat);
  mountains.name = 'mountains';
  mountains.receiveShadow = true;
  mountains.matrixAutoUpdate = false;
  group.add(mountains);

  const lakeShape = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const x = Math.cos(a) * LAKE.rx * 1.02;
    const z = Math.sin(a) * LAKE.rz * 1.02;
    if (i === 0) lakeShape.moveTo(x, z);
    else lakeShape.lineTo(x, z);
  }
  const lakeGeo = new THREE.ShapeGeometry(lakeShape);
  lakeGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(lakeGeo, new THREE.MeshStandardMaterial({ color: 0x3d6b80, roughness: 0.07, metalness: 0.35, envMapIntensity: 1.2 }));
  water.material.name = 'water';
  water.position.set(LAKE.x, LAKE.level, LAKE.z);
  water.receiveShadow = true;
  water.name = 'lake';
  group.add(water);

  return group;
}

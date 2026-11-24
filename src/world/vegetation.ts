import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prepare, type Col, type Occupancy } from './core/kit';
import { Rng } from './core/rng';
import { groundHeight, forestDensity, valley, isWater, river, MAP_RADIUS } from './terrain';
import { addWindSway } from './materials';
import { P } from './palette';
import { asset, hasAsset } from './assets';

export type TreeKind = 'fir' | 'pine' | 'oak' | 'bush' | 'young' | 'apple';
/** A generic kind, or the name of one model from the vegetation family. */
export type PlantKind = TreeKind | (string & {});

function piece(g: THREE.BufferGeometry, color: Col, m?: THREE.Matrix4): THREE.BufferGeometry {
  const p = prepare(g, color);
  g.dispose();
  if (m) p.applyMatrix4(m);
  return p;
}

function jitter(g: THREE.BufferGeometry, rng: Rng, amt: number, keepBottom = true) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  // Non-indexed geometry duplicates shared corners: displace by position hash so seams stay closed.
  const cache = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let d = cache.get(key);
    if (!d) {
      d = [rng.range(-amt, amt), keepBottom ? rng.range(-amt * 0.4, amt * 0.4) : rng.range(-amt, amt), rng.range(-amt, amt)];
      cache.set(key, d);
    }
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
}

const M = (x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));

const merge = (parts: THREE.BufferGeometry[]) => {
  const out = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return out;
};

function firGeo(seed: number, layers = 7, seg = 7): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [piece(new THREE.CylinderGeometry(0.2, 0.34, 5, 6), P.trunk, M(0, 2.5, 0))];
  const greens = [0x2c4a2a, 0x335530, 0x2a4627, 0x3a5c33];
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const r = 3.0 * (1 - t) + 0.55;
    const h = 3.6 - t * 1.2;
    const y = 2.6 + i * 2.05;
    const g = new THREE.ConeGeometry(r, h, seg, 1).toNonIndexed();
    jitter(g, rng, 0.22);
    parts.push(piece(g, greens[i % greens.length], M(0, y + h / 2, 0, rng.range(0, Math.PI))));
  }
  parts.push(piece(new THREE.ConeGeometry(0.5, 2.4, 5), greens[1], M(0, 2.6 + layers * 2.05 + 0.6, 0)));
  return merge(parts);
}

function tallPineGeo(seed: number): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [piece(new THREE.CylinderGeometry(0.22, 0.42, 15, 6), 0x6a4a35, M(0, 7.5, 0))];
  const greens = [0x3b5a2f, 0x456a35, 0x34512b];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const y = 10 + i * 1.3 + rng.range(-0.4, 0.4);
    const rr = i < 5 ? rng.range(1.0, 1.8) : 0;
    const g = new THREE.IcosahedronGeometry(rng.range(1.4, 2.1), 0);
    jitter(g, rng, 0.2, false);
    parts.push(piece(g, rng.pick(greens), M(Math.cos(a) * rr, y, Math.sin(a) * rr, 0, 1.25, 0.8, 1.25)));
  }
  parts.push(piece(new THREE.ConeGeometry(1.1, 3.2, 6), greens[0], M(0, 18.6, 0)));
  return merge(parts);
}

function broadleafGeo(seed: number, blobs: number, greens: number[], trunkH: number, crownY: number, spread: number, fruit?: number): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [piece(new THREE.CylinderGeometry(0.2, 0.34, trunkH, 6), 0x5e4532, M(0, trunkH / 2, 0))];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rng.range(0, 1);
    parts.push(
      piece(
        new THREE.CylinderGeometry(0.07, 0.13, trunkH * 0.6, 5),
        0x5e4532,
        new THREE.Matrix4().compose(
          new THREE.Vector3(Math.cos(a) * 0.5, trunkH * 1.0, Math.sin(a) * 0.5),
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 1.4, Math.sin(a)).normalize()),
          new THREE.Vector3(1, 1, 1),
        ),
      ),
    );
  }
  for (let i = 0; i < blobs; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = i === 0 ? 0 : rng.range(spread * 0.45, spread);
    const g = new THREE.IcosahedronGeometry(rng.range(spread * 0.62, spread * 0.92), 0);
    jitter(g, rng, 0.16, false);
    parts.push(piece(g, rng.pick(greens), M(Math.cos(a) * rr, crownY + rng.range(-spread * 0.3, spread * 0.6), Math.sin(a) * rr)));
  }
  if (fruit !== undefined)
    for (let i = 0; i < 26; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = rng.range(spread * 0.8, spread * 1.25);
      parts.push(piece(new THREE.IcosahedronGeometry(0.13, 0), fruit, M(Math.cos(a) * rr, crownY + rng.range(-spread * 0.4, spread * 0.5), Math.sin(a) * rr)));
    }
  return merge(parts);
}

function bushGeo(seed: number): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.IcosahedronGeometry(rng.range(0.45, 0.75), 0);
    jitter(g, rng, 0.1, false);
    parts.push(piece(g, rng.pick([0x4c7a32, 0x5a8a3a, 0x3f6a2c]), M(rng.range(-0.5, 0.5), rng.range(0.35, 0.7), rng.range(-0.5, 0.5))));
  }
  return merge(parts);
}

function farConiferGeo(): THREE.BufferGeometry {
  return merge([
    piece(new THREE.CylinderGeometry(0.25, 0.35, 3, 4), P.trunk, M(0, 1.5, 0)),
    piece(new THREE.ConeGeometry(3.0, 9, 6), 0x2f4c2b, M(0, 6.5, 0)),
    piece(new THREE.ConeGeometry(2.1, 7, 6), 0x34532f, M(0, 11.5, 0, 0.5)),
  ]);
}

function farBroadleafGeo(): THREE.BufferGeometry {
  return merge([piece(new THREE.CylinderGeometry(0.2, 0.32, 4.5, 4), 0x5e4532, M(0, 2.25, 0)), piece(new THREE.IcosahedronGeometry(3.2, 0), 0x5f8a34, M(0, 6.6, 0, 0, 1.15, 0.9, 1.15))]);
}

function grassGeo(seed: number): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const h = rng.range(0.35, 0.75);
    const g = new THREE.BoxGeometry(0.07, h, 0.03);
    g.translate(0, h / 2, 0);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(rng.range(-0.25, 0.25), 0, rng.range(-0.25, 0.25)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.3, 0.3), rng.range(0, Math.PI), rng.range(-0.3, 0.3))),
      new THREE.Vector3(1, 1, 1),
    );
    parts.push(piece(g, rng.pick([0x6f9a3e, 0x7aa646, 0x5f8a35]), m));
  }
  return merge(parts);
}

function cornGeo(seed: number): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  for (let s = 0; s < 3; s++) {
    const ox = (s - 1) * 0.42 + rng.range(-0.08, 0.08);
    const oz = rng.range(-0.12, 0.12);
    const h = rng.range(2.0, 2.5);
    const st = new THREE.BoxGeometry(0.07, h, 0.07);
    st.translate(0, h / 2, 0);
    parts.push(piece(st, 0x7a9a3c, M(ox, 0, oz)));
    for (let i = 0; i < 6; i++) {
      const lg = new THREE.BoxGeometry(0.75, 0.025, 0.14);
      lg.translate(0.36, 0, 0);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(ox, 0.5 + i * (h / 7), oz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng.range(0, Math.PI * 2), -rng.range(0.3, 0.7), 'YZX')),
        new THREE.Vector3(1, 1, 1),
      );
      parts.push(piece(lg, rng.pick([0x5f8f34, 0x6e9e3c, 0x557f2e]), m));
    }
    parts.push(piece(new THREE.ConeGeometry(0.1, 0.4, 4), 0xd8c070, M(ox, h + 0.18, oz)));
  }
  return merge(parts);
}

/** Spatial hash of tree trunks for vehicle collisions. */
export class TreeIndex {
  private cells = new Map<string, number[]>();
  private size = 16;
  add(x: number, z: number, r: number) {
    const k = `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`;
    let a = this.cells.get(k);
    if (!a) this.cells.set(k, (a = []));
    a.push(x, z, r);
  }
  hit(x: number, z: number): boolean {
    const cx = Math.floor(x / this.size);
    const cz = Math.floor(z / this.size);
    for (let i = cx - 1; i <= cx + 1; i++)
      for (let j = cz - 1; j <= cz + 1; j++) {
        const a = this.cells.get(`${i},${j}`);
        if (!a) continue;
        for (let n = 0; n < a.length; n += 3) {
          const dx = x - a[n];
          const dz = z - a[n + 1];
          if (dx * dx + dz * dz < a[n + 2] * a[n + 2]) return true;
        }
      }
    return false;
  }
}

interface Inst {
  m: THREE.Matrix4;
  c: THREE.Color;
}

const FINE = 200;
const COARSE = 600;
const HIGH_DIST = 230;
const GRASS_DIST = 150;
const BUSH_DIST = 260;
const CORN_DIST = 720;
/** Full-detail models stand within this distance; their lighter `_far` versions take over beyond it. */
const NEAR = 70;
const CELL = 50;

type Cat = 'tree' | 'grass' | 'bush' | 'corn';
interface KindDef {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  cat: Cat;
  /** Which distant stand-in the kind collapses to. */
  low: 'lowC' | 'lowB' | null;
  /** Full-detail version shown close to the camera. */
  hi?: { geo: THREE.BufferGeometry; mat: THREE.Material };
}

interface FineChunk {
  minX: number;
  minZ: number;
  high: THREE.Object3D[];
  low: THREE.Object3D[];
  grass: THREE.Object3D[];
  bush: THREE.Object3D[];
  corn: THREE.Object3D[];
}
interface CoarseChunk {
  minX: number;
  minZ: number;
  low: THREE.Object3D[];
  fine: FineChunk[];
}
interface Cell {
  minX: number;
  minZ: number;
  y: number;
  kinds: Map<string, Inst[]>;
  meshes?: THREE.InstancedMesh[];
}

const rectDist = (x: number, z: number, minX: number, minZ: number, size: number) => {
  const dx = Math.max(minX - x, 0, x - (minX + size));
  const dz = Math.max(minZ - z, 0, z - (minZ + size));
  return Math.hypot(dx, dz);
};

/** Instanced vegetation with chunked LOD: full models by the camera, light ones in the middle distance, stand-ins far away. */
export class Vegetation {
  readonly group = new THREE.Group();
  private coarse: CoarseChunk[] = [];
  private cells = new Map<string, Cell>();
  private shown = new Set<Cell>();

  constructor(
    items: Map<string, Inst[]>,
    private defs: Record<string, KindDef>,
  ) {
    this.group.name = 'vegetation';
    const fineMap = new Map<string, FineChunk>();
    const coarseMap = new Map<string, CoarseChunk>();
    const coarseLow = new Map<string, Map<string, Inst[]>>();
    const fineItems = new Map<string, Map<string, Inst[]>>();
    const push = <K>(m: Map<K, Inst[]>, k: K, it: Inst) => {
      let a = m.get(k);
      if (!a) m.set(k, (a = []));
      a.push(it);
    };
    for (const [kind, arr] of items) {
      const def = defs[kind];
      for (const it of arr) {
        const x = it.m.elements[12];
        const z = it.m.elements[14];
        const fk = `${Math.floor(x / FINE)},${Math.floor(z / FINE)}`;
        const ck = `${Math.floor(x / COARSE)},${Math.floor(z / COARSE)}`;
        let fm = fineItems.get(fk);
        if (!fm) fineItems.set(fk, (fm = new Map()));
        push(fm, kind, it);
        if (def.low) {
          let cm = coarseLow.get(ck);
          if (!cm) coarseLow.set(ck, (cm = new Map()));
          push(cm, def.low, it);
        }
        if (def.hi) {
          const cx = Math.floor(x / CELL);
          const cz = Math.floor(z / CELL);
          const key = `${cx},${cz}`;
          let cell = this.cells.get(key);
          if (!cell) this.cells.set(key, (cell = { minX: cx * CELL, minZ: cz * CELL, y: it.m.elements[13], kinds: new Map() }));
          push(cell.kinds, kind, it);
        }
      }
    }
    for (const [fk, fm] of fineItems) {
      const [fx, fz] = fk.split(',').map(Number);
      const ck = `${Math.floor((fx * FINE) / COARSE)},${Math.floor((fz * FINE) / COARSE)}`;
      const fc: FineChunk = { minX: fx * FINE, minZ: fz * FINE, high: [], low: [], grass: [], bush: [], corn: [] };
      const lows = new Map<string, Inst[]>();
      for (const [kind, arr] of fm) {
        const def = defs[kind];
        const mesh = this.inst(def.geo, def.mat, kind, arr, def.cat !== 'grass' && !def.hi);
        (def.cat === 'tree' ? fc.high : fc[def.cat]).push(mesh);
        if (def.low) {
          let la = lows.get(def.low);
          if (!la) lows.set(def.low, (la = []));
          la.push(...arr);
        }
      }
      for (const [low, arr] of lows) fc.low.push(this.inst(defs[low].geo, defs[low].mat, low, arr, false));
      fineMap.set(fk, fc);
      let cc = coarseMap.get(ck);
      if (!cc) {
        const [cx, cz] = ck.split(',').map(Number);
        cc = { minX: cx * COARSE, minZ: cz * COARSE, low: [], fine: [] };
        coarseMap.set(ck, cc);
      }
      cc.fine.push(fc);
    }
    for (const [ck, cm] of coarseLow) {
      const cc = coarseMap.get(ck);
      if (!cc) continue;
      for (const [low, arr] of cm) cc.low.push(this.inst(defs[low].geo, defs[low].mat, low, arr, false));
    }
    this.coarse = [...coarseMap.values()];
  }

  private inst(geo: THREE.BufferGeometry, mat: THREE.Material, name: string, arr: Inst[], shadow: boolean) {
    const mesh = new THREE.InstancedMesh(geo, mat, arr.length);
    arr.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      mesh.setColorAt(i, it.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.visible = false;
    mesh.name = name;
    this.group.add(mesh);
    return mesh;
  }

  /** Switches chunk detail around the camera; call once per frame. */
  update(cam: THREE.Vector3) {
    const set = (objs: THREE.Object3D[], v: boolean) => {
      for (const o of objs) o.visible = v;
    };
    for (const cc of this.coarse) {
      const split = rectDist(cam.x, cam.z, cc.minX, cc.minZ, COARSE) < HIGH_DIST;
      set(cc.low, !split);
      for (const fc of cc.fine) {
        const d = rectDist(cam.x, cam.z, fc.minX, fc.minZ, FINE);
        const high = split && d < HIGH_DIST;
        set(fc.high, high);
        set(fc.low, split && !high);
        set(fc.grass, d < GRASS_DIST);
        set(fc.bush, d < BUSH_DIST);
        set(fc.corn, d < CORN_DIST);
      }
    }
    // full-detail models, built the first time the camera comes near their cell
    const now = new Set<Cell>();
    const c0x = Math.floor((cam.x - NEAR) / CELL);
    const c1x = Math.floor((cam.x + NEAR) / CELL);
    const c0z = Math.floor((cam.z - NEAR) / CELL);
    const c1z = Math.floor((cam.z + NEAR) / CELL);
    for (let cz = c0z; cz <= c1z; cz++)
      for (let cx = c0x; cx <= c1x; cx++) {
        const cell = this.cells.get(`${cx},${cz}`);
        if (!cell) continue;
        const dy = Math.max(0, Math.abs(cam.y - cell.y) - 45);
        if (Math.hypot(rectDist(cam.x, cam.z, cell.minX, cell.minZ, CELL), dy) > NEAR) continue;
        if (!cell.meshes) {
          cell.meshes = [];
          for (const [kind, arr] of cell.kinds) {
            const hi = this.defs[kind].hi!;
            cell.meshes.push(this.inst(hi.geo, hi.mat, `${kind}|hi`, arr, true));
          }
        }
        now.add(cell);
      }
    for (const c of this.shown) if (!now.has(c)) set(c.meshes!, false);
    for (const c of now) if (!this.shown.has(c)) set(c.meshes!, true);
    this.shown = now;
  }
}

export interface PlacedTree {
  kind: PlantKind;
  x: number;
  z: number;
  s?: number;
  ry?: number;
}

export interface VegetationInput {
  occ: Occupancy;
  trees: PlacedTree[];
  cornFields: { x: number; z: number; w: number; d: number; ry: number }[];
  grassPatches: { x: number; z: number; w: number; d: number; n: number }[];
  /** Open ground (farmyards, substation) where the forest scatter must not plant trees. */
  clearings?: { x: number; z: number; w: number; d: number }[];
}

/** One model of the vegetation family as a single vertex-coloured geometry. */
function modelGeo(name: string): THREE.BufferGeometry {
  const a = asset(name)!;
  const parts = a.parts.map((p) => {
    const g = p.geo.clone();
    g.deleteAttribute('uv');
    if (p.label) {
      const col = g.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * p.color.r, col.getY(i) * p.color.g, col.getZ(i) * p.color.b);
    }
    return g;
  });
  return merge(parts);
}

/** Which models stand in for each generic kind: [model, scale, weight]. */
const VARIANTS: Record<TreeKind, [string, number, number][]> = {
  fir: [
    ['douglas_fir_tall', 0.72, 4],
    ['douglas_fir_medium', 1.0, 4],
    ['cedar_broad', 1.0, 1.5],
    ['spruce_blue', 1.3, 0.5],
  ],
  pine: [
    ['pine_tall', 0.9, 2],
    ['pine_medium', 1.25, 1],
  ],
  oak: [
    ['oak_large', 0.72, 1],
    ['oak_medium', 0.95, 2],
    ['maple_large', 0.8, 1.5],
    ['maple_medium', 1.1, 2],
    ['birch_cluster', 1.0, 1],
  ],
  young: [['fir_young', 0.9, 1]],
  apple: [['apple_tree', 1, 1]],
  bush: [
    ['bush_round_a', 1.3, 1],
    ['bush_round_b', 1.3, 1],
    ['bush_wide', 1.2, 1],
    ['bush_flowering_a', 1.2, 0.3],
    ['bush_flowering_b', 1.2, 0.3],
  ],
};
const GROUND_COVER = ['grass_tall_a', 'grass_tall_b', 'grass_tuft_c', 'grass_tuft_d', 'weeds_a', 'weeds_b'];
const catOf = (n: string): Cat =>
  /^(grass|weeds|fern|dandelion|flower_clump|mushroom|hay_stubble|wheat|branch|ivy)/.test(n)
    ? 'grass'
    : /^corn/.test(n)
      ? 'corn'
      : /^(bush|hedge|topiary|flower_bed|reeds|lily|rock|boulder|shore|stump|log|firewood|vine|sapling)/.test(n)
        ? 'bush'
        : 'tree';
const conifer = (n: string) => /fir|pine|cedar|spruce|snag|poplar/.test(n);

/** Forest, town trees, orchards, bushes, ground cover and corn: instanced, LOD'd and wind-animated. */
export function createVegetation(input: VegetationInput): { veg: Vegetation; trees: TreeIndex } {
  const rng = new Rng(777);
  const clearings = input.clearings ?? [];
  const cleared = (x: number, z: number) => clearings.some((c) => Math.abs(x - c.x) < c.w / 2 && Math.abs(z - c.z) < c.d / 2);
  const items = new Map<string, Inst[]>();
  const trees = new TreeIndex();
  const models = hasAsset('douglas_fir_tall');
  const add = (kind: string, x: number, y: number, z: number, ry: number, s: number, sy = s) => {
    let a = items.get(kind);
    if (!a) items.set(kind, (a = []));
    const c = new THREE.Color(1, 1, 1);
    const v = rng.range(0.86, 1.1);
    c.setRGB(v * rng.range(0.95, 1.04), v, v * rng.range(0.92, 1.02));
    a.push({ m: M(x, y, z, ry, s, sy, s), c });
  };
  const weighted = (list: [string, number, number][]) => {
    let t = rng.next() * list.reduce((n, v) => n + v[2], 0);
    for (const v of list) if ((t -= v[2]) <= 0) return v;
    return list[0];
  };

  const placeTree = (kind: PlantKind, x: number, z: number, s: number, ryIn?: number) => {
    // never in the lake or the river channel
    if (isWater(x, z) && !/^(reeds|lily)/.test(kind)) return;
    const rv = river.query(x, z);
    if (rv && rv.dist < rv.hw + 3) return;
    const y = groundHeight(x, z) - 0.15;
    const ry = ryIn ?? rng.range(0, Math.PI * 2);
    if (models) {
      const generic = VARIANTS[kind as TreeKind];
      const [name, k] = generic ? weighted(generic) : [kind, 1];
      if (!hasAsset(name)) return;
      const cat = catOf(name);
      add(name, x, cat === 'tree' ? y : y + 0.13, z, ry, s * k, cat === 'tree' ? s * k * rng.range(0.94, 1.1) : s * k);
      const tr = (asset(name)!.info.trunk_radius as number | undefined) ?? 0;
      if (tr > 0) trees.add(x, z, tr * s * k + 0.15);
      return;
    }
    switch (kind) {
      case 'fir':
        add(rng.pick(['fir0', 'fir1']), x, y, z, ry, s, s * rng.range(0.95, 1.15));
        trees.add(x, z, 0.3 * s + 0.15);
        break;
      case 'young':
        add(rng.pick(['fir0', 'fir1']), x, y, z, ry, s * 0.45);
        trees.add(x, z, 0.2);
        break;
      case 'pine':
        add('pine0', x, y, z, ry, s, s * rng.range(0.9, 1.1));
        trees.add(x, z, 0.38 * s + 0.15);
        break;
      case 'oak':
        add(rng.pick(['oak0', 'oak1']), x, y, z, ry, s);
        trees.add(x, z, 0.32 * s + 0.15);
        break;
      case 'apple':
        add('apple0', x, y, z, ry, s);
        trees.add(x, z, 0.25 * s + 0.1);
        break;
      case 'bush':
        add('bush0', x, y, z, ry, s);
        break;
    }
  };
  const cover = () => (models ? rng.pick(GROUND_COVER) : rng.pick(['grass0', 'grass1']));

  for (const t of input.trees) placeTree(t.kind, t.x, t.z, t.s ?? rng.range(0.85, 1.25), t.ry);

  // Forest scatter on a jittered grid whose spacing grows with distance.
  const R = MAP_RADIUS + 60;
  for (let gz = -R; gz < R; ) {
    const stepZ = Math.abs(gz) < 700 ? 7.5 : Math.abs(gz) < 1300 ? 12 : 20;
    for (let gx = -R; gx < R; ) {
      const r0 = Math.hypot(gx, gz);
      const step = r0 < 700 ? 7.5 : r0 < 1300 ? 12 : 20;
      const x = gx + rng.range(0, step);
      const z = gz + rng.range(0, stepZ);
      gx += step;
      if (Math.hypot(x, z) > R) continue;
      const d = forestDensity(x, z);
      if (d <= 0.02 || rng.next() > d * 0.92) continue;
      if (input.occ.blocked(x, z, 3) || cleared(x, z)) continue;
      const roll = rng.next();
      const kind: TreeKind = roll < 0.66 ? 'fir' : roll < 0.86 ? 'pine' : roll < 0.95 ? 'oak' : 'young';
      placeTree(kind, x, z, rng.range(0.75, 1.45));
      if (d > 0.5 && rng.chance(0.2)) placeTree('bush', x + rng.range(-3, 3), z + rng.range(-3, 3), rng.range(0.8, 1.6));
      if (models && r0 < 900 && rng.chance(0.25)) placeTree(rng.pick(['fern', 'fern', 'stump_mossy', 'log_single', 'rock_small_a', 'mushroom_cluster', 'branch_fallen']), x + rng.range(-3, 3), z + rng.range(-3, 3), rng.range(0.8, 1.3));
    }
    gz += stepZ;
  }

  // Sparse trees and bushes on the valley floor (yards, lot edges, field margins).
  for (let gz = -700; gz < 660; gz += 13)
    for (let gx = -1800; gx < 1800; gx += 13) {
      const x = gx + rng.range(0, 13);
      const z = gz + rng.range(0, 13);
      if (valley(x, z).e > -8) continue;
      const core = x > -380 && x < 380 && z > -110 && z < 290;
      if (rng.next() > (core ? 0.05 : 0.2)) continue;
      if (input.occ.blocked(x, z, 2.5) || cleared(x, z)) continue;
      const roll = rng.next();
      // back-yard Douglas firs tower over the roofs; maples and alders fill in between
      placeTree(roll < 0.4 ? 'fir' : roll < 0.72 ? 'oak' : roll < 0.84 ? 'pine' : 'bush', x, z, roll < 0.4 ? rng.range(0.8, 1.4) : rng.range(0.6, 1.1));
    }

  for (const gp of input.grassPatches)
    for (let i = 0; i < gp.n; i++) {
      const x = gp.x + rng.range(-gp.w / 2, gp.w / 2);
      const z = gp.z + rng.range(-gp.d / 2, gp.d / 2);
      if (input.occ.blocked(x, z, 0.3)) continue;
      add(cover(), x, groundHeight(x, z), z, rng.range(0, 6), rng.range(0.6, 1.1));
    }
  for (let i = 0; i < 16000; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * 1300;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (input.occ.blocked(x, z, 0.6) || isWater(x, z)) continue;
    if (forestDensity(x, z) > 0.6 && rng.chance(0.6)) continue;
    if (valley(x, z).e < 0 && Math.abs(x) < 1100 && rng.chance(0.7)) continue;
    add(cover(), x, groundHeight(x, z), z, rng.range(0, 6), rng.range(0.7, 1.4));
  }

  for (const f of input.cornFields) {
    const c = Math.cos(f.ry);
    const s = Math.sin(f.ry);
    const [du, dv] = models ? [0.95, 3.6] : [1.25, 0.9];
    for (let u = -f.w / 2; u < f.w / 2; u += du)
      for (let v = -f.d / 2; v < f.d / 2; v += dv) {
        const lx = u + rng.range(-0.1, 0.1);
        const lz = v + rng.range(-0.1, 0.1);
        const x = f.x + lx * c + lz * s;
        const z = f.z - lx * s + lz * c;
        add(models ? 'corn_row' : 'corn0', x, groundHeight(x, z), z, f.ry + Math.PI / 2 + (models ? 0 : rng.range(-0.2, 0.2)), rng.range(0.9, 1.1));
      }
  }

  const oakGreens = [0x5f8a34, 0x6d983b, 0x557d2f, 0x78a443];
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  treeMat.name = 'foliage';
  addWindSway(treeMat, 0.0045, 3);
  const lowMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  lowMat.name = 'grass';
  addWindSway(lowMat, 0.06, 0.05);
  const defs: Record<string, KindDef> = {
    lowC: { geo: farConiferGeo(), mat: treeMat, cat: 'tree', low: null },
    lowB: { geo: farBroadleafGeo(), mat: treeMat, cat: 'tree', low: null },
  };
  if (models) {
    const mk = (name: string, strength: number, minY: number, cull: -1 | 0 | 1) => {
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
      m.name = name;
      addWindSway(m, strength, minY, cull, NEAR);
      return m;
    };
    const mats = {
      tree: [mk('tree-mid', 0.004, 3, -1), mk('tree-near', 0.004, 3, 1), mk('tree', 0.004, 3, 0)],
      small: [mk('plant-mid', 0.03, 0.15, -1), mk('plant-near', 0.03, 0.15, 1), mk('plant', 0.03, 0.15, 0)],
      // rocks, logs and stumps do not move in the wind
      still: [mk('still-mid', 0, 0, -1), mk('still-near', 0, 0, 1), mk('still', 0, 0, 0)],
    };
    for (const name of items.keys()) {
      const cat = catOf(name);
      const set = /^(rock|boulder|shore|stump|log|firewood|branch|mushroom)/.test(name) ? mats.still : cat === 'tree' ? mats.tree : mats.small;
      const far = asset(name)!.info.far as string | undefined;
      const low = cat === 'tree' ? (conifer(name) ? 'lowC' : 'lowB') : null;
      if (far && hasAsset(far)) defs[name] = { geo: modelGeo(far), mat: set[0], cat, low, hi: { geo: modelGeo(name), mat: set[1] } };
      else defs[name] = { geo: modelGeo(name), mat: set[2], cat, low };
    }
  } else {
    const old: Record<string, [THREE.BufferGeometry, 'lowC' | 'lowB' | null]> = {
      fir0: [firGeo(1), 'lowC'],
      fir1: [firGeo(3, 8), 'lowC'],
      pine0: [tallPineGeo(4), 'lowC'],
      oak0: [broadleafGeo(5, 11, oakGreens, 4.5, 6.6, 2.3), 'lowB'],
      oak1: [broadleafGeo(6, 10, oakGreens, 4.0, 6.0, 2.1), 'lowB'],
      apple0: [broadleafGeo(12, 7, [0x5e8c36, 0x6b9a3e, 0x4f7a2e], 1.6, 3.0, 1.45, 0xc0392b), 'lowB'],
      bush0: [bushGeo(7), null],
      grass0: [grassGeo(9), null],
      grass1: [grassGeo(10), null],
      corn0: [cornGeo(11), null],
    };
    for (const [k, [geo, low]] of Object.entries(old)) {
      const cat: Cat = k.startsWith('grass') ? 'grass' : k.startsWith('bush') ? 'bush' : k.startsWith('corn') ? 'corn' : 'tree';
      defs[k] = { geo, mat: cat === 'tree' ? treeMat : lowMat, cat, low };
    }
  }
  return { veg: new Vegetation(items, defs), trees };
}

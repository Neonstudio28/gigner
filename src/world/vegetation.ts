import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prepare, type Col, type Occupancy } from './core/kit';
import { Rng } from './core/rng';
import { heightAt, forestDensity, townEllipse } from './terrain';
import { addWindSway } from './materials';
import { P } from './palette';

export type TreeKind = 'fir' | 'pine' | 'oak' | 'bush' | 'firFar' | 'grass' | 'corn' | 'young';

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

function firGeo(seed: number, layers = 7, seg = 7): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  parts.push(piece(new THREE.CylinderGeometry(0.2, 0.34, 5, 6), P.trunk, M(0, 2.5, 0)));
  const greens = [0x2c4a2a, 0x335530, 0x2a4627, 0x3a5c33];
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const r = 3.0 * (1 - t) + 0.55;
    const h = 3.6 - t * 1.2;
    const y = 2.6 + i * 2.05;
    const g = new THREE.ConeGeometry(r, h, seg, 1);
    const ng = g.toNonIndexed();
    g.dispose();
    jitter(ng, rng, 0.22);
    parts.push(piece(ng, greens[i % greens.length], M(0, y + h / 2, 0, rng.range(0, Math.PI))));
  }
  const top = new THREE.ConeGeometry(0.5, 2.4, 5);
  parts.push(piece(top, greens[1], M(0, 2.6 + layers * 2.05 + 0.6, 0)));
  const out = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return out;
}

function tallPineGeo(seed: number): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  parts.push(piece(new THREE.CylinderGeometry(0.22, 0.42, 15, 6), 0x6a4a35, M(0, 7.5, 0)));
  const greens = [0x3b5a2f, 0x456a35, 0x34512b];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const y = 10 + i * 1.3 + rng.range(-0.4, 0.4);
    const rr = i < 5 ? rng.range(1.0, 1.8) : 0;
    const g = new THREE.IcosahedronGeometry(rng.range(1.4, 2.1), 0);
    jitter(g, rng, 0.2, false);
    parts.push(piece(g, rng.pick(greens), M(Math.cos(a) * rr, y, Math.sin(a) * rr, 0, 1.25, 0.8, 1.25)));
    if (rr > 0) parts.push(piece(new THREE.CylinderGeometry(0.06, 0.1, rr + 0.3, 4), 0x6a4a35, new THREE.Matrix4().compose(new THREE.Vector3((Math.cos(a) * rr) / 2, y - 0.6, (Math.sin(a) * rr) / 2), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0.5, Math.sin(a)).normalize()), new THREE.Vector3(1, 1, 1))));
  }
  parts.push(piece(new THREE.ConeGeometry(1.1, 3.2, 6), greens[0], M(0, 18.6, 0)));
  const out = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return out;
}

function oakGeo(seed: number): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  parts.push(piece(new THREE.CylinderGeometry(0.22, 0.36, 4.5, 6), 0x5e4532, M(0, 2.25, 0)));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rng.range(0, 1);
    parts.push(piece(new THREE.CylinderGeometry(0.08, 0.14, 2.6, 5), 0x5e4532, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 0.6, 4.6, Math.sin(a) * 0.6), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 1.4, Math.sin(a)).normalize()), new THREE.Vector3(1, 1, 1))));
  }
  const greens = [0x5f8a34, 0x6d983b, 0x557d2f, 0x78a443];
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = i === 0 ? 0 : rng.range(1.2, 2.6);
    const g = new THREE.IcosahedronGeometry(rng.range(1.6, 2.4), 1);
    jitter(g, rng, 0.18, false);
    parts.push(piece(g, rng.pick(greens), M(Math.cos(a) * rr, 6.4 + rng.range(-0.8, 1.6), Math.sin(a) * rr)));
  }
  const out = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return out;
}

function bushGeo(seed: number): THREE.BufferGeometry {
  const rng = new Rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.IcosahedronGeometry(rng.range(0.45, 0.75), 0);
    jitter(g, rng, 0.1, false);
    parts.push(piece(g, rng.pick([0x4c7a32, 0x5a8a3a, 0x3f6a2c]), M(rng.range(-0.5, 0.5), rng.range(0.35, 0.7), rng.range(-0.5, 0.5))));
  }
  const out = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return out;
}

function farFirGeo(): THREE.BufferGeometry {
  const parts = [
    piece(new THREE.CylinderGeometry(0.25, 0.35, 3, 4), P.trunk, M(0, 1.5, 0)),
    piece(new THREE.ConeGeometry(3.0, 9, 6), 0x2f4c2b, M(0, 6.5, 0)),
    piece(new THREE.ConeGeometry(2.1, 7, 6), 0x34532f, M(0, 11.5, 0, 0.5)),
  ];
  const out = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return out;
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
  const out = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return out;
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
  const out = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return out;
}

interface Inst {
  m: THREE.Matrix4;
  c: THREE.Color;
}

/** Collects instances per geometry kind and spatial chunk, then builds InstancedMeshes. */
class Scatter {
  private items = new Map<string, Inst[]>();
  constructor(private chunk = 240) {}
  add(kind: string, x: number, y: number, z: number, ry: number, s: number, tint: THREE.Color, sy = s) {
    const key = `${kind}|${Math.floor(x / this.chunk)}|${Math.floor(z / this.chunk)}`;
    let arr = this.items.get(key);
    if (!arr) this.items.set(key, (arr = []));
    arr.push({ m: M(x, y, z, ry, s, sy, s), c: tint });
  }
  build(geos: Record<string, THREE.BufferGeometry>, mats: Record<string, THREE.Material>, shadows: Record<string, boolean>, parent: THREE.Object3D) {
    for (const [key, arr] of this.items) {
      const kind = key.split('|')[0];
      const mesh = new THREE.InstancedMesh(geos[kind], mats[kind], arr.length);
      arr.forEach((it, i) => {
        mesh.setMatrixAt(i, it.m);
        mesh.setColorAt(i, it.c);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = shadows[kind];
      mesh.receiveShadow = true;
      mesh.name = key;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
  }
}

export interface PlacedTree {
  kind: TreeKind;
  x: number;
  z: number;
  s?: number;
}

export interface VegetationInput {
  occ: Occupancy;
  trees: PlacedTree[];
  cornFields: { x: number; z: number; w: number; d: number; ry: number }[];
  grassPatches: { x: number; z: number; w: number; d: number; n: number }[];
}

/** Forest ring, town trees, bushes, grass clumps and corn — all instanced and wind-animated. */
export function createVegetation(input: VegetationInput): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vegetation';
  const rng = new Rng(777);
  const sc = new Scatter();
  const tint = (base = 1, v = 0.12, hue = 0.03) => new THREE.Color().setHSL(0.25 + rng.range(-hue, hue), 0.0, 0).setRGB(1, 1, 1).multiplyScalar(base + rng.range(-v, v)).offsetHSL(rng.range(-hue, hue), 0, 0);
  const tc = () => {
    const c = new THREE.Color(1, 1, 1);
    const v = rng.range(0.82, 1.12);
    c.setRGB(v * rng.range(0.94, 1.04), v, v * rng.range(0.9, 1.02));
    return c;
  };
  void tint;

  const fir = ['fir0', 'fir1', 'fir2'];
  const placeTree = (kind: TreeKind, x: number, z: number, s: number) => {
    const y = heightAt(x, z) - 0.15;
    const ry = rng.range(0, Math.PI * 2);
    const r = Math.hypot(x, z);
    if (kind === 'fir') sc.add(r > 950 ? 'firFar' : rng.pick(fir), x, y, z, ry, s, tc(), s * rng.range(0.95, 1.15));
    else if (kind === 'young') sc.add(rng.pick(fir), x, y, z, ry, s * 0.45, tc());
    else if (kind === 'pine') sc.add(r > 950 ? 'firFar' : 'pine0', x, y, z, ry, s, tc(), s * rng.range(0.9, 1.1));
    else if (kind === 'oak') sc.add(rng.pick(['oak0', 'oak1']), x, y, z, ry, s, tc());
    else if (kind === 'bush') sc.add(rng.pick(['bush0', 'bush1']), x, y, z, ry, s, tc());
  };

  for (const t of input.trees) placeTree(t.kind, t.x, t.z, t.s ?? rng.range(0.85, 1.25));

  // Forest scatter on a jittered grid whose spacing grows with distance.
  const R = 1900;
  for (let gz = -R; gz < R; ) {
    const stepZ = Math.abs(gz) < 700 ? 9 : Math.abs(gz) < 1300 ? 15 : 24;
    for (let gx = -R; gx < R; ) {
      const r0 = Math.hypot(gx, gz);
      const step = r0 < 700 ? 9 : r0 < 1300 ? 15 : 24;
      const x = gx + rng.range(0, step);
      const z = gz + rng.range(0, stepZ);
      gx += step;
      const r = Math.hypot(x, z);
      if (r > R) continue;
      const d = forestDensity(x, z);
      if (d <= 0.02 || rng.next() > d * 0.92) continue;
      if (Math.abs(z) < 16 && townEllipse(x, z) > 0.9) continue;
      if (input.occ.blocked(x, z, 3)) continue;
      const roll = rng.next();
      const kind: TreeKind = roll < 0.66 ? 'fir' : roll < 0.86 ? 'pine' : roll < 0.95 ? 'oak' : 'young';
      placeTree(kind, x, z, rng.range(0.75, 1.45));
      if (d > 0.5 && r < 900 && rng.chance(0.25)) placeTree('bush', x + rng.range(-3, 3), z + rng.range(-3, 3), rng.range(0.8, 1.6));
    }
    gz += stepZ;
  }

  // Sparse trees and bushes inside town blocks (yards, lot edges).
  for (let gz = -340; gz < 340; gz += 13)
    for (let gx = -420; gx < 420; gx += 13) {
      const x = gx + rng.range(0, 13);
      const z = gz + rng.range(0, 13);
      const te = townEllipse(x, z);
      if (te > 1.0) continue;
      const core = Math.abs(x) < 125 && Math.abs(z) < 75;
      const p = core ? 0.03 : z < -90 || Math.abs(x) > 135 ? 0.2 : 0.08;
      if (rng.next() > p) continue;
      if (input.occ.blocked(x, z, 2.5)) continue;
      const roll = rng.next();
      placeTree(roll < 0.45 ? 'fir' : roll < 0.75 ? 'oak' : roll < 0.85 ? 'pine' : 'bush', x, z, rng.range(0.6, 1.1));
    }

  // Grass clumps: lawn edges, meadows and explicit patches.
  for (const gp of input.grassPatches)
    for (let i = 0; i < gp.n; i++) {
      const x = gp.x + rng.range(-gp.w / 2, gp.w / 2);
      const z = gp.z + rng.range(-gp.d / 2, gp.d / 2);
      if (input.occ.blocked(x, z, 0.3)) continue;
      sc.add(rng.pick(['grass0', 'grass1']), x, heightAt(x, z), z, rng.range(0, 6), rng.range(0.6, 1.1), tc());
    }
  for (let i = 0; i < 9000; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * 650;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (input.occ.blocked(x, z, 0.6)) continue;
    if (forestDensity(x, z) > 0.6 && rng.chance(0.6)) continue;
    if (townEllipse(x, z) < 0.95 && rng.chance(0.7)) continue;
    sc.add(rng.pick(['grass0', 'grass1']), x, heightAt(x, z), z, rng.range(0, 6), rng.range(0.7, 1.4), tc());
  }

  // Corn fields.
  for (const f of input.cornFields) {
    const c = Math.cos(f.ry);
    const s = Math.sin(f.ry);
    for (let u = -f.w / 2; u < f.w / 2; u += 1.25)
      for (let v = -f.d / 2; v < f.d / 2; v += 0.9) {
        const lx = u + rng.range(-0.1, 0.1);
        const lz = v + rng.range(-0.1, 0.1);
        const x = f.x + lx * c + lz * s;
        const z = f.z - lx * s + lz * c;
        sc.add('corn0', x, 0, z, f.ry + Math.PI / 2 + rng.range(-0.2, 0.2), rng.range(0.85, 1.1), tc());
      }
  }

  const geos: Record<string, THREE.BufferGeometry> = {
    fir0: firGeo(1),
    fir1: firGeo(2, 6),
    fir2: firGeo(3, 8),
    pine0: tallPineGeo(4),
    oak0: oakGeo(5),
    oak1: oakGeo(6),
    bush0: bushGeo(7),
    bush1: bushGeo(8),
    firFar: farFirGeo(),
    grass0: grassGeo(9),
    grass1: grassGeo(10),
    corn0: cornGeo(11),
  };
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  treeMat.name = 'foliage';
  addWindSway(treeMat, 0.0045, 3);
  const lowMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  lowMat.name = 'grass';
  addWindSway(lowMat, 0.06, 0.05);
  const mats: Record<string, THREE.Material> = {};
  const shadows: Record<string, boolean> = {};
  for (const k of Object.keys(geos)) {
    const low = k.startsWith('grass') || k.startsWith('corn') || k.startsWith('bush');
    mats[k] = low ? lowMat : treeMat;
    shadows[k] = !k.startsWith('grass');
  }
  sc.build(geos, mats, shadows, group);
  return group;
}

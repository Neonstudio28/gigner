import * as THREE from 'three';
import { Rng } from './core/rng';

/** Field crops. Each is planted as square tiles of rows, one instance per tile. */
export type Crop = 'corn' | 'wheat' | 'hay' | 'sunflower' | 'veg' | 'stubble';
export const CROPS: Crop[] = ['corn', 'wheat', 'hay', 'sunflower', 'veg', 'stubble'];
/** Tile edge: eight rows 0.9 m apart, two 3.6 m corn-row models long. */
export const CROP_TILE = 7.2;
const ROWS = 8;
const GAP = CROP_TILE / ROWS;

/** Soil / canopy colour the ground under a field is tinted, so fields still read as fields beyond crop draw distance. */
export const CROP_GROUND: Record<Crop, number> = { corn: 0x5c6b34, wheat: 0xb39a4c, hay: 0x5f8c3a, sunflower: 0x6f7a34, veg: 0x5e4a36, stubble: 0xa8935a };

interface Look {
  h: number;
  hw: number;
  base: number;
  top: number;
}
const LOOK: Record<Crop, Look> = {
  corn: { h: 2.05, hw: 0.4, base: 0x4f7a30, top: 0x8fa64c },
  wheat: { h: 0.95, hw: 0.47, base: 0x9c8440, top: 0xd2b256 },
  hay: { h: 0.5, hw: 0.47, base: 0x4f7f33, top: 0x76a646 },
  sunflower: { h: 1.6, hw: 0.36, base: 0x4c7430, top: 0xdcae2c },
  veg: { h: 0.2, hw: 0.36, base: 0x4c3b2b, top: 0x6a543c },
  stubble: { h: 0.14, hw: 0.2, base: 0x8f7a48, top: 0xbfa765 },
};

/** Non-indexed position / normal / colour triangle soup; every face is written with both windings. */
class Soup {
  pos: number[] = [];
  col: number[] = [];
  private c = new THREE.Color();
  tri(a: number[], b: number[], c: number[], ca: number, cb = ca, cc = ca) {
    for (const [p, q, r, x, y, z] of [[a, b, c, ca, cb, cc], [a, c, b, ca, cc, cb]] as const) {
      this.pos.push(...p, ...q, ...r);
      for (const h of [x, y, z]) {
        this.c.set(h);
        this.col.push(this.c.r, this.c.g, this.c.b);
      }
    }
  }
  /** Quad a-b along the bottom, d-c along the top. */
  quad(a: number[], b: number[], c: number[], d: number[], lo: number, hi = lo) {
    this.tri(a, b, c, lo, lo, hi);
    this.tri(a, c, d, lo, hi, hi);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    const n = new Float32Array(this.pos.length);
    for (let i = 1; i < n.length; i += 3) n[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

/** The rows as ragged ridges: the whole tile in ~130 triangles, and the under-layer of the detailed version. */
function ridges(s: Soup, rng: Rng, L: Look, k = 1) {
  const seg = 4;
  for (let r = 0; r < ROWS; r++) {
    const x = -CROP_TILE / 2 + (r + 0.5) * GAP;
    let px = x + rng.range(-0.06, 0.06);
    let ph = L.h * k * rng.range(0.86, 1.08);
    for (let i = 0; i < seg; i++) {
      const z0 = -CROP_TILE / 2 + (i * CROP_TILE) / seg;
      const z1 = z0 + CROP_TILE / seg;
      const nx = i === seg - 1 ? x : x + rng.range(-0.06, 0.06);
      const nh = L.h * k * rng.range(0.86, 1.08);
      for (const sd of [-1, 1]) s.quad([x + sd * L.hw, -0.5, z0], [x + sd * L.hw, -0.5, z1], [nx, nh, z1], [px, ph, z0], L.base, L.top);
      px = nx;
      ph = nh;
    }
  }
}

export function cropMid(crop: Crop): THREE.BufferGeometry {
  const s = new Soup();
  ridges(s, new Rng(900 + CROPS.indexOf(crop)), LOOK[crop]);
  return s.geo();
}

/** A leaning blade (crossed with nothing: cheap) from the ground to height h. */
function blade(s: Soup, x: number, z: number, h: number, w: number, a: number, lean: number, lo: number, hi: number) {
  const c = Math.cos(a) * w;
  const n = Math.sin(a) * w;
  const lx = Math.cos(a + 1.57) * lean;
  const lz = Math.sin(a + 1.57) * lean;
  s.quad([x - c, -0.1, z - n], [x + c, -0.1, z + n], [x + c * 0.5 + lx, h, z + n * 0.5 + lz], [x - c * 0.5 + lx, h, z - n * 0.5 + lz], lo, hi);
}

/**
 * Close-up tile: the ridges shrunk to an under-layer that hides the soil, with the individual plants standing out
 * of it. Corn is built from the corn-row model when it is loaded (pass its geometry, long axis along x).
 */
export function cropHi(crop: Crop, cornRow?: THREE.BufferGeometry): THREE.BufferGeometry {
  const rng = new Rng(950 + CROPS.indexOf(crop));
  const L = LOOK[crop];
  const s = new Soup();
  const rowX = (r: number) => -CROP_TILE / 2 + (r + 0.5) * GAP;
  if (crop === 'corn' && cornRow) {
    const parts: THREE.BufferGeometry[] = [];
    for (let r = 0; r < ROWS; r++) for (const z of [-CROP_TILE / 4, CROP_TILE / 4]) {
      const g = cornRow.clone();
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(rowX(r) + rng.range(-0.08, 0.08), -0.05, z + rng.range(-0.1, 0.1)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2 + (rng.chance(0.5) ? Math.PI : 0), 0)), new THREE.Vector3(1, rng.range(0.9, 1.1), 1)));
      const tris = g.index ? g.toNonIndexed() : g;
      for (const k of Object.keys(tris.attributes)) if (!['position', 'normal', 'color'].includes(k)) tris.deleteAttribute(k);
      parts.push(tris);
    }
    const pos: number[] = [];
    const nor: number[] = [];
    const col: number[] = [];
    for (const p of parts) {
      pos.push(...(p.attributes.position.array as Float32Array));
      nor.push(...(p.attributes.normal.array as Float32Array));
      col.push(...(p.attributes.color.array as Float32Array));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  ridges(s, rng, L, crop === 'wheat' || crop === 'hay' ? 0.62 : crop === 'corn' || crop === 'sunflower' ? 0.45 : 1);
  for (let r = 0; r < ROWS; r++) {
    const x0 = rowX(r);
    if (crop === 'wheat' || crop === 'hay' || crop === 'stubble') {
      const step = crop === 'stubble' ? 0.45 : 0.24;
      for (let z = -CROP_TILE / 2 + 0.1; z < CROP_TILE / 2; z += step) for (let j = 0; j < (crop === 'stubble' ? 2 : 4); j++) {
        const x = x0 + rng.range(-0.42, 0.42);
        const h = L.h * rng.range(0.82, 1.15);
        const a = rng.range(0, 3.14);
        blade(s, x, z + rng.range(-0.1, 0.1), h, crop === 'hay' ? 0.05 : 0.035, a, rng.range(-0.16, 0.16), L.base, L.top);
        // ear of grain at the tip
        if (crop === 'wheat') blade(s, x + rng.range(-0.03, 0.03), z, h + 0.12, 0.045, a + 1.2, rng.range(-0.1, 0.1), 0xc9a94e, 0xe6cc74);
      }
    } else if (crop === 'corn') {
      for (let z = -CROP_TILE / 2 + 0.2; z < CROP_TILE / 2; z += 0.4) {
        const x = x0 + rng.range(-0.06, 0.06);
        const h = L.h * rng.range(0.9, 1.12);
        blade(s, x, z, h, 0.035, rng.range(0, 3.14), 0, 0x6f8f3a, 0xb9a86a);
        for (let j = 0; j < 4; j++) blade(s, x, z, h * (0.35 + j * 0.16), 0.07, rng.range(0, 3.14), rng.pick([-1, 1]) * rng.range(0.3, 0.55), 0x4f7a30, 0x86a84a);
      }
    } else if (crop === 'sunflower') {
      for (let z = -CROP_TILE / 2 + 0.3; z < CROP_TILE / 2; z += 0.6) {
        const x = x0 + rng.range(-0.08, 0.08);
        const h = L.h * rng.range(0.85, 1.1);
        blade(s, x, z, h, 0.03, 0.4, 0, 0x4c7430, 0x5f8a35);
        for (let j = 0; j < 3; j++) blade(s, x, z, h * (0.3 + j * 0.2), 0.11, rng.range(0, 3.14), rng.pick([-1, 1]) * 0.3, 0x44702c, 0x5f8f3a);
        // flower head: yellow hexagon tilted to the sun with a brown heart
        const rr = rng.range(0.17, 0.23);
        const pt = (i: number, q: number) => [x + Math.cos((i / 6) * 6.283) * rr * q, h + Math.sin((i / 6) * 6.283) * rr * q * 0.9, z + 0.06 + Math.sin((i / 6) * 6.283) * rr * q * 0.35];
        for (let i = 0; i < 6; i++) {
          s.tri(pt(i, 0.45), pt(i, 1), pt(i + 1, 1), 0xe8b92e, 0xf2cf45, 0xe8b92e);
          s.tri([x, h, z + 0.08], pt(i, 0.45), pt(i + 1, 0.45), 0x4a321c);
          s.tri(pt(i, 0.45), pt(i + 1, 1), pt(i + 1, 0.45), 0xe8b92e);
        }
      }
    } else if (crop === 'veg') {
      for (let z = -CROP_TILE / 2 + 0.3; z < CROP_TILE / 2; z += 0.6) {
        const x = x0 + rng.range(-0.05, 0.05);
        const rr = rng.range(0.2, 0.27);
        const col = rng.pick([0x6fa64a, 0x7fb356, 0x5f9a44]);
        const a0 = rng.range(0, 1);
        for (let i = 0; i < 5; i++) {
          const a = a0 + (i / 5) * 6.283;
          const b = a0 + ((i + 1) / 5) * 6.283;
          s.tri([x, L.h + 0.3, z], [x + Math.cos(a) * rr, L.h + 0.02, z + Math.sin(a) * rr], [x + Math.cos(b) * rr, L.h + 0.02, z + Math.sin(b) * rr], 0xa6cf74, col, col);
        }
      }
    }
  }
  return s.geo();
}

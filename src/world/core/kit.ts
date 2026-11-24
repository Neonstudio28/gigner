import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp } from './rng';
import { asset as findAsset, stamp, type Asset, type Tints } from '../assets';

export type Col = THREE.ColorRepresentation;
export interface PartOpts {
  rx?: number;
  ry?: number;
  rz?: number;
  cast?: boolean;
}

/** How a material key renders: the merged bucket it lands in plus per-vertex surface parameters. */
export interface MatSpec {
  bucket: string;
  layer: number;
  tile: number;
  rough: number;
  metal: number;
}
export interface MatResolver {
  spec(key: string): MatSpec;
}
/** A sign's rectangle inside a sign-atlas page. */
export interface SignRef {
  page: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

const KEEP = new Set(['position', 'normal', 'uv', 'color']);
const DEFAULT_SPEC: MatSpec = { bucket: 'world', layer: -1, tile: 1, rough: 0.9, metal: 0 };
const _col = new THREE.Color();
export const ROOM_STYLES = ['home', 'shop', 'office', 'shed'] as const;
export type RoomStyle = (typeof ROOM_STYLES)[number];

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Normalises any geometry to non-indexed position/normal/uv/color plus the `layer` (texture-array
 * slice) and `pbr` (roughness, metalness) attributes read by the shared world material.
 */
export function prepare(src: THREE.BufferGeometry, color: Col, spec: MatSpec = DEFAULT_SPEC): THREE.BufferGeometry {
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  else if (spec.layer >= 0 && spec.tile !== 1) {
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const k = 1 / spec.tile;
    for (let i = 0; i < n; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  }
  if (!g.attributes.color) {
    _col.set(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = _col.r;
      arr[i * 3 + 1] = _col.g;
      arr[i * 3 + 2] = _col.b;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  }
  g.setAttribute('layer', new THREE.Float32BufferAttribute(new Float32Array(n).fill(spec.layer), 1));
  const pbr = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    pbr[i * 2] = spec.rough;
    pbr[i * 2 + 1] = spec.metal;
  }
  g.setAttribute('pbr', new THREE.Float32BufferAttribute(pbr, 2));
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

/** Box whose UVs are in metres (so tiling textures keep a constant world scale). */
export function boxGeo(w: number, h: number, d: number, vOffset = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = dims[f];
    const off = f === 2 || f === 3 ? 0 : vOffset;
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * su, uv.getY(idx) * sv + off);
    }
  }
  return g;
}

interface Bucket {
  mat: string;
  cast: boolean;
  geos: THREE.BufferGeometry[];
}

/** Collects static geometry and merges it per bucket and spatial chunk (keeps frustum culling useful). */
export class Batcher {
  private buckets = new Map<string, Bucket>();
  constructor(
    public chunkSize = 150,
    public chunked = true,
  ) {}

  add(geo: THREE.BufferGeometry, mat: string, cast = true) {
    geo.computeBoundingSphere();
    const bs = geo.boundingSphere!;
    let key = `${mat}|${cast ? 1 : 0}`;
    if (this.chunked) {
      const big = bs.radius > this.chunkSize * 0.75;
      key += big ? '|g' : `|${Math.floor(bs.center.x / this.chunkSize)}|${Math.floor(bs.center.z / this.chunkSize)}`;
    }
    let b = this.buckets.get(key);
    if (!b) {
      b = { mat, cast, geos: [] };
      this.buckets.set(key, b);
    }
    b.geos.push(geo);
  }

  build(getMat: (key: string) => THREE.Material, parent: THREE.Object3D): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [key, b] of this.buckets) {
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, getMat(b.mat));
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.name = key;
      parent.add(mesh);
      out.push(mesh);
    }
    this.buckets.clear();
    return out;
  }
}

/**
 * Small modelling kit: a transform stack plus primitives that feed a Batcher.
 * All "y" arguments on box/cyl are the base of the part, not its centre.
 */
export class Kit {
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  /** Receives world-space collision rectangles registered with `solid()`. */
  onSolid?: (x: number, z: number, w: number, d: number, ry: number, top?: number) => void;
  /** Receives light sources (lamp heads, lit panels, neon) for the volumetric fog: world position, colour, power. */
  onLight?: (p: THREE.Vector3, color: THREE.Color, power: number, indoor: boolean) => void;
  /** Set while building a room: its lights shine on the furniture but do not glow in the street's fog. */
  indoor = false;

  constructor(
    public batch: Batcher,
    public lib: MatResolver,
  ) {}

  get matrix(): THREE.Matrix4 {
    return this.stack[this.stack.length - 1];
  }
  push(x = 0, y = 0, z = 0, ry = 0, scale = 1) {
    const l = new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromAxisAngle(UP, ry), _s.setScalar(scale));
    this.stack.push(this.matrix.clone().multiply(l));
  }
  pop() {
    if (this.stack.length > 1) this.stack.pop();
  }
  at(x: number, z: number, ry: number, fn: () => void, y = 0, scale = 1) {
    this.push(x, y, z, ry, scale);
    try {
      fn();
    } finally {
      this.pop();
    }
  }
  /** Runs `fn` in an arbitrary local frame (e.g. a parked car pitched with a sloping drive). */
  atMatrix(m: THREE.Matrix4, fn: () => void) {
    this.stack.push(this.matrix.clone().multiply(m));
    try {
      fn();
    } finally {
      this.pop();
    }
  }
  toWorld(x: number, y: number, z: number): THREE.Vector3 {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.matrix);
  }
  /** World yaw of a local heading `ry` (local +X rotated by ry). */
  worldYaw(ry = 0): number {
    const e = this.matrix.elements;
    const lx = Math.cos(ry);
    const lz = -Math.sin(ry);
    return Math.atan2(-(e[2] * lx + e[10] * lz), e[0] * lx + e[8] * lz);
  }
  /** Registers a solid footprint (local coordinates) for vehicle collisions. */
  solid(x: number, z: number, w: number, d: number, ry = 0, h?: number) {
    if (!this.onSolid) return;
    const p = this.toWorld(x, h ?? 0, z);
    this.onSolid(p.x, p.z, w, d, this.worldYaw(ry), h === undefined ? undefined : p.y);
  }

  /** Multiplies every colour added while set: warm lamplight on rooms the sun never reaches. */
  tint: THREE.Color | null = null;
  tinted(r: number, g: number, b: number, fn: () => void) {
    const prev = this.tint;
    this.tint = new THREE.Color(r, g, b);
    try {
      fn();
    } finally {
      this.tint = prev;
    }
  }

  add(geo: THREE.BufferGeometry, color: Col, mat = 'paint', local?: THREE.Matrix4, cast = true) {
    const spec = this.lib.spec(mat);
    if (this.tint && mat !== 'light' && mat !== 'clear' && mat !== 'glass') color = new THREE.Color(color).multiply(this.tint);
    const g = prepare(geo, color, spec);
    geo.dispose();
    g.applyMatrix4(local ? _m.multiplyMatrices(this.matrix, local) : this.matrix);
    // anything lit (lamp lenses, canopy panels, neon) also lights the fog around it; tiny bulbs don't count
    if (mat === 'light' && this.onLight) {
      g.computeBoundingBox();
      const b = g.boundingBox!;
      const size = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
      if (size >= 0.25) this.onLight(b.getCenter(new THREE.Vector3()), new THREE.Color(color), clamp(size / 0.7, 0.4, 3), this.indoor);
    }
    this.batch.add(g, spec.bucket, cast);
  }
  /** A light source with no glowing part of its own (e.g. frosted globes), in local coordinates. */
  lamp(x: number, y: number, z: number, color: Col, power = 1) {
    this.onLight?.(this.toWorld(x, y, z), new THREE.Color(color), power, this.indoor);
  }

  local(x: number, y: number, z: number, o?: PartOpts, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
    return new THREE.Matrix4().compose(
      _v.set(x, y, z),
      _q.setFromEuler(_e.set(o?.rx ?? 0, o?.ry ?? 0, o?.rz ?? 0, 'YXZ')),
      _s.set(sx, sy, sz),
    );
  }

  box(x: number, y: number, z: number, w: number, h: number, d: number, color: Col, mat = 'paint', o?: PartOpts) {
    this.add(boxGeo(w, h, d, y), color, mat, this.local(x, y + h / 2, z, o), o?.cast ?? true);
  }
  /** Box positioned by its centre. */
  boxC(x: number, y: number, z: number, w: number, h: number, d: number, color: Col, mat = 'paint', o?: PartOpts) {
    this.add(boxGeo(w, h, d), color, mat, this.local(x, y, z, o), o?.cast ?? true);
  }
  cyl(x: number, y: number, z: number, rTop: number, rBot: number, h: number, seg: number, color: Col, mat = 'paint', o?: PartOpts) {
    this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), color, mat, this.local(x, y + h / 2, z, o), o?.cast ?? true);
  }
  /** Cylinder centred at (x,y,z) lying along local Z (wheels, tanks). */
  cylZ(x: number, y: number, z: number, r: number, len: number, seg: number, color: Col, mat = 'paint') {
    this.add(new THREE.CylinderGeometry(r, r, len, seg), color, mat, this.local(x, y, z, { rx: Math.PI / 2 }));
  }
  /** Cylinder centred at (x,y,z) lying along local X. */
  cylX(x: number, y: number, z: number, r: number, len: number, seg: number, color: Col, mat = 'paint') {
    this.add(new THREE.CylinderGeometry(r, r, len, seg), color, mat, this.local(x, y, z, { rz: Math.PI / 2 }));
  }
  cylBetween(a: THREE.Vector3Like, b: THREE.Vector3Like, r: number, seg: number, color: Col, mat = 'paint', cast = true) {
    const A = new THREE.Vector3(a.x, a.y, a.z);
    const B = new THREE.Vector3(b.x, b.y, b.z);
    const dir = B.clone().sub(A);
    const len = dir.length();
    if (len < 1e-4) return;
    const m = new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()), _s.set(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r, r, len, seg), color, mat, m, cast);
  }
  /** Rectangular beam between two points; `w` is the horizontal width, `t` the thickness. */
  beam(a: THREE.Vector3Like, b: THREE.Vector3Like, w: number, t: number, color: Col, mat = 'paint', cast = true) {
    const A = new THREE.Vector3(a.x, a.y, a.z);
    const B = new THREE.Vector3(b.x, b.y, b.z);
    const dir = B.clone().sub(A);
    const len = dir.length();
    if (len < 1e-4) return;
    dir.normalize();
    const side = Math.abs(dir.y) > 0.98 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3().crossVectors(UP, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, side).normalize();
    const basis = new THREE.Matrix4().makeBasis(side, up, dir);
    basis.setPosition(A.add(B).multiplyScalar(0.5));
    this.add(boxGeo(w, t, len), color, mat, basis, cast);
  }
  cone(x: number, y: number, z: number, r: number, h: number, seg: number, color: Col, mat = 'paint', o?: PartOpts) {
    this.add(new THREE.ConeGeometry(r, h, seg), color, mat, this.local(x, y + h / 2, z, o), o?.cast ?? true);
  }
  ico(x: number, y: number, z: number, r: number, detail: number, color: Col, mat = 'paint', sx = 1, sy = 1, sz = 1, cast = true) {
    this.add(new THREE.IcosahedronGeometry(r, detail), color, mat, this.local(x, y, z, undefined, sx, sy, sz), cast);
  }
  sphere(x: number, y: number, z: number, r: number, color: Col, mat = 'paint', ws = 8, hs = 6) {
    this.add(new THREE.SphereGeometry(r, ws, hs), color, mat, this.local(x, y, z));
  }
  torus(x: number, y: number, z: number, R: number, r: number, rs: number, ts: number, color: Col, mat = 'paint', o?: PartOpts, sz = 1) {
    this.add(new THREE.TorusGeometry(R, r, rs, ts), color, mat, this.local(x, y, z, o, 1, 1, sz), o?.cast ?? true);
  }
  /** Horizontal plane (UVs in metres). */
  plane(x: number, y: number, z: number, w: number, d: number, color: Col, mat = 'paint', o?: PartOpts) {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
    this.add(g, color, mat, this.local(x, y, z, o), o?.cast ?? false);
  }
  /** Vertical plane facing +Z centred at (x,y,z); UVs 0..1. */
  vplane(x: number, y: number, z: number, w: number, h: number, color: Col, mat = 'paint', o?: PartOpts) {
    this.add(new THREE.PlaneGeometry(w, h), color, mat, this.local(x, y, z, o), o?.cast ?? false);
  }
  /**
   * Interior-mapped window pane facing +Z; (x, y) is the bottom centre of the glass. `style` picks the room
   * behind it and `sill` is the height of the glass above that room's floor.
   */
  pane(x: number, y: number, z: number, w: number, h: number, style: RoomStyle = 'home', sill = 0.9, o?: PartOpts) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const su = ROOM_STYLES.indexOf(style);
    const sv = Math.round(clamp(sill, 0, 6) * 10);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, su + 0.25 + uv.getX(i) * 0.5, sv + 0.25 + uv.getY(i) * 0.5);
    this.add(g, 0xffffff, 'window', this.local(x, y + h / 2, z, o), false);
  }
  /** Glazing that fills a thin box (same arguments as `box`): interior-mapped panes on its two large faces. */
  glazing(x: number, y: number, z: number, w: number, h: number, d: number, style: RoomStyle = 'home', sill = 0.9) {
    if (d <= w) {
      this.pane(x, y, z + d / 2 + 0.004, w, h, style, sill);
      this.pane(x, y, z - d / 2 - 0.004, w, h, style, sill, { ry: Math.PI });
    } else {
      this.pane(x + w / 2 + 0.004, y, z, d, h, style, sill, { ry: Math.PI / 2 });
      this.pane(x - w / 2 - 0.004, y, z, d, h, style, sill, { ry: -Math.PI / 2 });
    }
  }
  /** Shape (in local XY) extruded along +Z by depth, centred on z. */
  extrude(shape: THREE.Shape, depth: number, color: Col, mat = 'paint', x = 0, y = 0, z = 0, o?: PartOpts) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -depth / 2);
    this.add(g, color, mat, this.local(x, y, z, o), o?.cast ?? true);
  }
  tube(points: THREE.Vector3[], r: number, color: Col, mat = 'paint', segs = 12, cast = true) {
    const curve = new THREE.CatmullRomCurve3(points);
    this.add(new THREE.TubeGeometry(curve, segs, r, 3, false), color, mat, undefined, cast);
  }

  /** Textured plane facing +Z, mapped to a sign-atlas rectangle. */
  signPlane(x: number, y: number, z: number, w: number, h: number, ref: SignRef, o?: PartOpts) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ref.u0 + uv.getX(i) * (ref.u1 - ref.u0), ref.v0 + uv.getY(i) * (ref.v1 - ref.v0));
    this.add(g, 0xffffff, `signs${ref.page}`, this.local(x, y, z, o), o?.cast ?? false);
  }

  /**
   * Places a Blender-built model (origin on the ground, front towards +Z; vehicles face +X). `tint` recolours
   * its labelled parts. Returns the asset, or undefined when the model is not available.
   */
  asset(name: string, x: number, y: number, z: number, ry = 0, o: { tint?: Tints; s?: number; cast?: boolean; solid?: boolean | number; only?: string[]; skip?: string[] } = {}): Asset | undefined {
    const a = findAsset(name);
    if (!a) return undefined;
    const s = o.s ?? 1;
    const root = new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromAxisAngle(UP, ry), new THREE.Vector3(s, s, s));
    const world = new THREE.Matrix4().multiplyMatrices(this.matrix, root);
    const put = (parts: Asset['parts'], m: THREE.Matrix4) => {
      for (const p of parts) {
        const recolor = p.label ? o.tint?.[p.label] : undefined;
        if (p.key === 'atlas') {
          this.batch.add(stamp(p, m, 0.7, 0), this.lib.spec(`atlas:${a.family}`).bucket, o.cast ?? true);
        } else if (p.key === 'paint' || p.key === 'gloss' || p.key === 'metal' || p.key === 'chrome' || p.key === 'rubber') {
          const spec = this.lib.spec(`${p.key}~`);
          this.batch.add(stamp(p, m, spec.rough, spec.metal, this.tint, recolor), spec.bucket, o.cast ?? true);
        } else {
          // glass, see-through glazing and lit parts join the ordinary buckets
          const g = p.geo.clone();
          const col = p.label ? new THREE.Color(recolor ?? p.color) : new THREE.Color(1, 1, 1);
          if (p.label) g.deleteAttribute('color');
          const spec = this.lib.spec(p.key);
          const out = prepare(g, col, spec);
          g.dispose();
          out.applyMatrix4(m);
          if (p.key === 'light' && this.onLight) {
            out.computeBoundingBox();
            const b = out.boundingBox!;
            const size = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
            const c = out.attributes.color as THREE.BufferAttribute;
            if (size >= 0.25) this.onLight(b.getCenter(new THREE.Vector3()), new THREE.Color(c.getX(0), c.getY(0), c.getZ(0)), clamp(size / 0.7, 0.4, 3), this.indoor);
          }
          this.batch.add(out, spec.bucket, false);
        }
      }
    };
    put(a.parts, world);
    for (const [cn, c] of a.children) {
      if (o.skip?.includes(cn) || (o.only && !o.only.includes(cn))) continue;
      put(c.parts, new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(c.pivot.x, c.pivot.y, c.pivot.z)));
    }
    if (o.solid) {
      const ox = (a.min.x + a.w / 2) * s;
      const oz = (a.min.z + a.d / 2) * s;
      const c = Math.cos(ry);
      const sn = Math.sin(ry);
      this.solid(x + ox * c + oz * sn, z - ox * sn + oz * c, a.w * s, a.d * s, ry, y + (typeof o.solid === 'number' ? o.solid : a.h * s));
    }
    return a;
  }

  /** A sign board: optional backing box plus a textured face on its +Z side. */
  sign(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    ref: SignRef,
    o: { ry?: number; back?: Col; thick?: number; frame?: number; twoSided?: boolean } = {},
  ) {
    const thick = o.thick ?? 0.12;
    const frame = o.frame ?? 0;
    this.push(x, y, z, o.ry ?? 0);
    if (o.back !== undefined) this.boxC(0, 0, 0, w + frame * 2, h + frame * 2, thick, o.back);
    this.signPlane(0, 0, thick / 2 + 0.01, w, h, ref);
    if (o.twoSided) this.signPlane(0, 0, -thick / 2 - 0.01, w, h, ref, { ry: Math.PI });
    this.pop();
  }

  /** Triangular gable wall prism; ridge runs along X, the triangle lies in the ZY plane. */
  gableFill(x: number, y: number, z: number, w: number, d: number, rise: number, color: Col, mat = 'paint') {
    const s = new THREE.Shape();
    s.moveTo(-d / 2, 0);
    s.lineTo(d / 2, 0);
    s.lineTo(0, rise);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    g.rotateY(Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getZ(i) + pos.getX(i), pos.getY(i) + y);
    this.add(g, color, mat, this.local(x, y, z));
  }

  /** Pediment: triangle facing +Z (width along X), extruded `depth` along Z. */
  pediment(x: number, y: number, z: number, w: number, rise: number, depth: number, color: Col, mat = 'paint') {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, rise);
    s.closePath();
    this.extrude(s, depth, color, mat, x, y, z);
  }

  /** Hipped roof over a w×d rectangle (ridge along X when w > d). */
  hipRoof(x: number, y: number, z: number, w: number, d: number, rise: number, color: Col, mat = 'roofMetal', overhang = 0.5) {
    const W = w / 2 + overhang;
    const D = d / 2 + overhang;
    const r = Math.max(0, W - D);
    const P = (px: number, py: number, pz: number) => [px, py, pz];
    const e0 = P(-W, 0, D);
    const e1 = P(W, 0, D);
    const e2 = P(W, 0, -D);
    const e3 = P(-W, 0, -D);
    const r0 = P(-r, rise, 0);
    const r1 = P(r, rise, 0);
    const tris = [e0, e1, r1, e0, r1, r0, e2, e3, r0, e2, r0, r1, e1, e2, r1, e3, e0, r0];
    const pos = new Float32Array(tris.flat());
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // UVs in metres: u runs along each face's eave, v up the slope (seams run downhill)
    const uv = new Float32Array((pos.length / 3) * 2);
    for (let i = 0; i < pos.length / 3; i++) {
      const sideFace = i >= 12;
      uv[i * 2] = sideFace ? pos[i * 3 + 2] : pos[i * 3];
      uv[i * 2 + 1] = pos[i * 3 + 1] * 1.6;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    this.add(g, color, mat, this.local(x, y, z));
    // soffit so the eaves are not see-through from below
    this.boxC(x, y - 0.05, z, W * 2, 0.1, D * 2, color, mat);
  }

  /**
   * Roof built from slabs following a (z, y) profile from front eave to back eave; ridge along X.
   * Works for gable (3 pts), gambrel (5 pts) and shed (2 pts) roofs.
   */
  roof(
    x: number,
    y: number,
    z: number,
    w: number,
    pts: [number, number][],
    color: Col,
    mat = 'roofMetal',
    o: { thick?: number; gableOH?: number; eaveOH?: number; trim?: Col; fill?: Col; fillMat?: string; ridge?: Col } = {},
  ) {
    const thick = o.thick ?? 0.18;
    const goh = o.gableOH ?? 0.35;
    const eoh = o.eaveOH ?? 0.45;
    this.push(x, y, z, 0);
    if (o.fill !== undefined) {
      const s = new THREE.Shape();
      s.moveTo(-pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) s.lineTo(-pts[i][0], pts[i][1]);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
      g.translate(0, 0, -w / 2);
      g.rotateY(Math.PI / 2);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getZ(i) + pos.getX(i), pos.getY(i) + y);
      this.add(g, o.fill, o.fillMat ?? 'paint');
    }
    for (let i = 0; i < pts.length - 1; i++) {
      let [z0, y0] = pts[i];
      let [z1, y1] = pts[i + 1];
      const dz = z1 - z0;
      const dy = y1 - y0;
      const len0 = Math.hypot(dz, dy);
      const ux = dz / len0;
      const uy = dy / len0;
      if (i === 0) {
        z0 -= ux * eoh;
        y0 -= uy * eoh;
      }
      if (i === pts.length - 2) {
        z1 += ux * eoh;
        y1 += uy * eoh;
      }
      const L = Math.hypot(z1 - z0, y1 - y0) + thick * 0.6;
      const theta = Math.atan2(-(y1 - y0), z1 - z0);
      let nY = Math.cos(theta);
      let nZ = Math.sin(theta);
      if (nY < 0) {
        nY = -nY;
        nZ = -nZ;
      }
      const cz = (z0 + z1) / 2 + (nZ * thick) / 2;
      const cy = (y0 + y1) / 2 + (nY * thick) / 2;
      this.add(boxGeo(w + goh * 2, thick, L), color, mat, this.local(0, cy, cz, { rx: theta }));
      if (o.trim !== undefined) {
        for (const sx of [-1, 1]) {
          this.add(boxGeo(0.1, thick + 0.16, L), o.trim, 'paint', this.local(sx * (w / 2 + goh + 0.04), cy - nY * 0.04, cz - nZ * 0.04, { rx: theta }));
        }
        if (i === 0 || i === pts.length - 2) {
          const ez = i === 0 ? z0 : z1;
          const ey = i === 0 ? y0 : y1;
          this.add(boxGeo(w + goh * 2 + 0.2, 0.26, 0.1), o.trim, 'paint', this.local(0, ey + thick * 0.3, ez + (i === 0 ? -ux : ux) * 0.02));
        }
      }
    }
    if (o.ridge !== undefined && pts.length >= 3) {
      const top = pts.reduce((a, b) => (b[1] > a[1] ? b : a));
      this.boxC(0, top[1] + thick + 0.05, top[0], w + goh * 2 + 0.05, 0.14, 0.36, o.ridge);
    }
    this.pop();
  }
}

export interface Rect {
  cx: number;
  cz: number;
  hw: number;
  hd: number;
  c: number;
  s: number;
  ry: number;
  /** Optional vertical extent (solids such as bridge parapets only block within it). */
  y0: number;
  y1: number;
}

/** Spatial hash of rotated rectangles (keeps trees off roads/buildings; vehicle collision). */
export class Occupancy {
  private cells = new Map<string, Rect[]>();
  /** Every rectangle added (used to draw the minimap). */
  readonly list: Rect[] = [];
  /** When set, solid additions are mirrored here without padding (vehicle collision). */
  solids: Occupancy | null = null;
  constructor(private size = 40) {}

  add(cx: number, cz: number, w: number, d: number, ry = 0, pad = 0, solid = true, y0 = -Infinity, y1 = Infinity) {
    const r: Rect = { cx, cz, hw: w / 2 + pad, hd: d / 2 + pad, c: Math.cos(ry), s: Math.sin(ry), ry, y0, y1 };
    this.list.push(r);
    const ext = Math.hypot(r.hw, r.hd);
    const x0 = Math.floor((cx - ext) / this.size);
    const x1 = Math.floor((cx + ext) / this.size);
    const z0 = Math.floor((cz - ext) / this.size);
    const z1 = Math.floor((cz + ext) / this.size);
    for (let i = x0; i <= x1; i++)
      for (let j = z0; j <= z1; j++) {
        const k = `${i},${j}`;
        let arr = this.cells.get(k);
        if (!arr) this.cells.set(k, (arr = []));
        arr.push(r);
      }
    if (solid && this.solids) this.solids.add(cx, cz, w, d, ry, 0, false, y0, y1);
  }

  blocked(x: number, z: number, pad = 0, y?: number): boolean {
    const arr = this.cells.get(`${Math.floor(x / this.size)},${Math.floor(z / this.size)}`);
    if (!arr) return false;
    for (const r of arr) {
      if (y !== undefined && (y < r.y0 || y > r.y1)) continue;
      const dx = x - r.cx;
      const dz = z - r.cz;
      const lx = dx * r.c - dz * r.s;
      const lz = dx * r.s + dz * r.c;
      if (Math.abs(lx) <= r.hw + pad && Math.abs(lz) <= r.hd + pad) return true;
    }
    return false;
  }
}

/** Axis-aligned raised surfaces (sidewalks, plazas) so vehicles ride up kerbs instead of sinking. */
export class SurfaceMap {
  private cells = new Map<string, { x0: number; x1: number; z0: number; z1: number; h: number }[]>();
  constructor(private size = 32) {}
  add(x0: number, x1: number, z0: number, z1: number, h: number) {
    const r = { x0, x1, z0, z1, h };
    for (let i = Math.floor(x0 / this.size); i <= Math.floor(x1 / this.size); i++)
      for (let j = Math.floor(z0 / this.size); j <= Math.floor(z1 / this.size); j++) {
        const k = `${i},${j}`;
        let arr = this.cells.get(k);
        if (!arr) this.cells.set(k, (arr = []));
        arr.push(r);
      }
  }
  at(x: number, z: number): number {
    const arr = this.cells.get(`${Math.floor(x / this.size)},${Math.floor(z / this.size)}`);
    let h = -Infinity;
    if (arr) for (const r of arr) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && r.h > h) h = r.h;
    return h;
  }
}

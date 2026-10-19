import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Col = THREE.ColorRepresentation;
export interface PartOpts {
  rx?: number;
  ry?: number;
  rz?: number;
  cast?: boolean;
}

const KEEP = new Set(['position', 'normal', 'uv', 'color']);
const _col = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

/** Normalises any geometry to non-indexed position/normal/uv/color so everything can be merged. */
export function prepare(src: THREE.BufferGeometry, color: Col): THREE.BufferGeometry {
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
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

/** Collects static geometry and merges it per material and spatial chunk (keeps frustum culling useful). */
export class Batcher {
  private buckets = new Map<string, Bucket>();
  constructor(public chunkSize = 90, public chunked = true) {}

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
  constructor(
    public batch: Batcher,
    public signMat: (tex: THREE.Texture) => string,
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
  toWorld(x: number, y: number, z: number): THREE.Vector3 {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.matrix);
  }

  add(geo: THREE.BufferGeometry, color: Col, mat = 'paint', local?: THREE.Matrix4, cast = true) {
    const g = prepare(geo, color);
    geo.dispose();
    g.applyMatrix4(local ? _m.multiplyMatrices(this.matrix, local) : this.matrix);
    this.batch.add(g, mat, cast);
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
  /** Vertical plane facing +Z centred at (x,y,z); UVs 0..1 (signage). */
  vplane(x: number, y: number, z: number, w: number, h: number, color: Col, mat = 'paint', o?: PartOpts) {
    this.add(new THREE.PlaneGeometry(w, h), color, mat, this.local(x, y, z, o), o?.cast ?? false);
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

  /** A sign board: backing box plus a textured face on its +Z side. */
  sign(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    tex: THREE.Texture,
    o: { ry?: number; back?: Col; thick?: number; frame?: number; twoSided?: boolean } = {},
  ) {
    const thick = o.thick ?? 0.12;
    const frame = o.frame ?? 0;
    this.push(x, y, z, o.ry ?? 0);
    if (o.back !== undefined) this.boxC(0, 0, 0, w + frame * 2, h + frame * 2, thick, o.back);
    const key = this.signMat(tex);
    this.vplane(0, 0, thick / 2 + 0.01, w, h, 0xffffff, key);
    if (o.twoSided) this.vplane(0, 0, -thick / 2 - 0.01, w, h, 0xffffff, key, { ry: Math.PI });
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
    // Re-map UVs to metres so siding/brick lines stay horizontal.
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getZ(i) + pos.getX(i), pos.getY(i) + y);
    this.add(g, color, mat, this.local(x, y, z));
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
        // fascia along the eave
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
}

/** Spatial hash of rotated rectangles used to keep trees/props off roads and buildings. */
export class Occupancy {
  private cells = new Map<string, Rect[]>();
  constructor(private size = 40) {}
  add(cx: number, cz: number, w: number, d: number, ry = 0, pad = 0) {
    const r: Rect = { cx, cz, hw: w / 2 + pad, hd: d / 2 + pad, c: Math.cos(ry), s: Math.sin(ry) };
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
  }
  blocked(x: number, z: number, pad = 0): boolean {
    const arr = this.cells.get(`${Math.floor(x / this.size)},${Math.floor(z / this.size)}`);
    if (!arr) return false;
    for (const r of arr) {
      const dx = x - r.cx;
      const dz = z - r.cz;
      // inverse of ry rotation (local = R(-ry) * d)
      const lx = dx * r.c - dz * r.s;
      const lz = dx * r.s + dz * r.c;
      if (Math.abs(lx) <= r.hw + pad && Math.abs(lz) <= r.hd + pad) return true;
    }
    return false;
  }
}

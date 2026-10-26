import * as THREE from 'three';
import type { Kit, Occupancy } from '../core/kit';
import { clamp, lerp, smoothstep } from '../core/rng';
import { preRoadHeight, river, setRoadHook, setRoadSurfaceHooks } from '../terrain';
import { P } from '../palette';

export type RoadKind = 'interstate' | 'ramp' | 'arterial' | 'strip' | 'downtown' | 'collector' | 'residential' | 'suburban' | 'rural' | 'gravel' | 'dirt' | 'alley' | 'lane';
export type DriveKind = 'highway' | 'road' | 'alley' | 'dirt';

export interface RoadSpec {
  hw: number;
  rank: number;
  surface: string;
  color: number;
  center: 'double' | 'dashed' | 'none' | 'barrier' | 'turn';
  laneLines: number[];
  edge: number;
  shoulder: { w: number; mat: string; color: number } | null;
  curb: boolean;
  park: number;
  walk: number;
  speed: number;
  drive: DriveKind;
  guard: boolean;
  parking: boolean;
}

const S = (o: Partial<RoadSpec> & Pick<RoadSpec, 'hw' | 'rank' | 'speed' | 'drive'>): RoadSpec => ({
  surface: 'asphalt',
  color: P.asphalt,
  center: 'none',
  laneLines: [],
  edge: 0,
  shoulder: null,
  curb: false,
  park: 0,
  walk: 0,
  guard: false,
  parking: false,
  ...o,
});

/**
 * Cross-sections follow the FHWA functional classes: Interstate (12 ft lanes, wide shoulders), principal
 * arterial (Old Hwy 10: rural two-lane with paved shoulders, a five-lane strip with a centre turn lane, and
 * the downtown Main Street), urban collectors (two 12 ft lanes, bike/parking lanes, curbs), local streets
 * (10 ft lanes, parking, no centre line), rural collectors, gravel and dirt roads, and alleys.
 */
export const SPECS: Record<RoadKind, RoadSpec> = {
  interstate: S({ hw: 11.8, rank: 10, color: 0x82868e, center: 'barrier', laneLines: [5.2], edge: 8.6, shoulder: { w: 2.4, mat: 'gravel', color: 0xa9a294 }, speed: 29, drive: 'highway', guard: true }),
  ramp: S({ hw: 4.4, rank: 9, color: 0x82868e, edge: 3.6, shoulder: { w: 1.2, mat: 'gravel', color: 0xa9a294 }, speed: 17, drive: 'highway', guard: true }),
  arterial: S({ hw: 6.0, rank: 7, center: 'double', edge: 3.9, shoulder: { w: 1.6, mat: 'gravel', color: 0xa9a294 }, speed: 21, drive: 'road' }),
  strip: S({ hw: 8.2, rank: 7, center: 'turn', edge: 7.4, curb: true, walk: 2.2, speed: 16, drive: 'road' }),
  downtown: S({ hw: 7.6, rank: 6, center: 'double', curb: true, walk: 4.2, speed: 11, drive: 'road', parking: true }),
  collector: S({ hw: 5.4, rank: 5, center: 'double', edge: 3.6, curb: true, park: 1.5, walk: 1.6, speed: 14, drive: 'road' }),
  residential: S({ hw: 4.4, rank: 4, curb: true, park: 1.6, walk: 1.4, speed: 11, drive: 'road' }),
  suburban: S({ hw: 4.6, rank: 4, color: 0x8d9198, curb: true, park: 2.2, walk: 1.5, speed: 12, drive: 'road' }),
  rural: S({ hw: 3.7, rank: 5, center: 'dashed', edge: 3.4, shoulder: { w: 1.2, mat: 'gravel', color: 0xa9a294 }, speed: 20, drive: 'road' }),
  gravel: S({ hw: 3.0, rank: 3, surface: 'gravel', color: 0xa69d8b, speed: 13, drive: 'dirt' }),
  dirt: S({ hw: 2.3, rank: 2, surface: 'gravel', color: 0x8c7658, speed: 9, drive: 'dirt' }),
  alley: S({ hw: 2.8, rank: 1, color: 0x7d8189, speed: 7, drive: 'alley' }),
  lane: S({ hw: 3.2, rank: 3, color: 0x8a8e95, speed: 8, drive: 'alley' }),
};

export interface RoadDef {
  name: string;
  /** Name shown on maps (defaults to `name`; '' hides it, e.g. ramps and alleys). */
  label?: string;
  kind: RoadKind;
  pts: [number, number][];
  /** Extra height above the graded terrain (viaducts) as a function of position. */
  elev?: (x: number, z: number, s: number) => number;
  culdesac?: boolean;
  /** Ramps interpolate between the roads they connect instead of following the terrain. */
  link?: boolean;
  /** Skip the river bridge parapets (e.g. under the interstate). */
  noBridge?: boolean;
}

export interface Sample {
  x: number;
  z: number;
  y: number;
  tx: number;
  tz: number;
  s: number;
  elevated: boolean;
}

export interface RoadHit {
  road: Road;
  i: number;
  t: number;
  lat: number;
  s: number;
  y: number;
  tx: number;
  tz: number;
  kind: DriveKind;
}

export class Road {
  readonly spec: RoadSpec;
  readonly pts: Sample[] = [];
  length = 0;
  readonly full: number;
  chained = new Set<Road>();
  startOn: { road: Road; hit: RoadHit } | null = null;
  endOn: { road: Road; hit: RoadHit } | null = null;
  constructor(
    readonly id: number,
    readonly def: RoadDef,
  ) {
    this.spec = SPECS[def.kind];
    this.full = this.spec.hw + (this.spec.shoulder?.w ?? 0) + (this.spec.curb ? 0.25 + this.spec.park + this.spec.walk : 0);
    const curve = new THREE.CatmullRomCurve3(def.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal', 0.5);
    this.length = curve.getLength();
    const n = Math.max(2, Math.ceil(this.length / 3));
    const ps = curve.getSpacedPoints(n);
    for (let i = 0; i <= n; i++) {
      const a = ps[Math.max(0, i - 1)];
      const b = ps[Math.min(n, i + 1)];
      const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      this.pts.push({ x: ps[i].x, z: ps[i].z, y: 0, tx: (b.x - a.x) / L, tz: (b.z - a.z) / L, s: (i / n) * this.length, elevated: false });
    }
  }
  get kind() {
    return this.def.kind;
  }
  /** Interpolated sample at arc length s. */
  at(s: number): Sample {
    const f = clamp(s / this.length, 0, 1) * (this.pts.length - 1);
    const i = Math.min(this.pts.length - 2, Math.floor(f));
    const t = f - i;
    const a = this.pts[i];
    const b = this.pts[i + 1];
    return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), y: lerp(a.y, b.y, t), tx: lerp(a.tx, b.tx, t), tz: lerp(a.tz, b.tz, t), s, elevated: a.elevated || b.elevated };
  }
}

const CELL = 24;
const BLEND = 22;

type V2 = [number, number];
type CoverMode = 'surface' | 'mark' | 'edge' | 'side';

/**
 * A curb return where two roads meet: the corner between road `a`'s curb line (running along `w1` away from the
 * junction) and road `b`'s (along `w2`), rounded by a fillet of radius R centred at C on the block side.
 */
export interface Corner {
  a: Road;
  b: Road;
  X: V2;
  C: V2;
  R: number;
  tP: number;
  w1: V2;
  w2: V2;
  n1: V2;
  n2: V2;
  P1: V2;
  P2: V2;
  y1: number;
  y2: number;
  yX: number;
}

/** Lateral offset of a road's curb line (or the outer edge of its paved shoulder). */
const curbLine = (r: Road) => r.spec.hw + (r.spec.curb ? 0 : (r.spec.shoulder?.w ?? 0));
/** Width of the curb, planting strip and sidewalk beyond the curb line. */
const sideWidth = (r: Road) => (r.spec.curb ? 0.25 + r.spec.park + r.spec.walk : 0);
/** Roads that get rounded curb returns (not ramps, the interstate, alleys or lanes). */
const filleted = (r: Road) => !r.def.link && r.kind !== 'interstate' && r.kind !== 'ramp' && r.kind !== 'alley' && r.kind !== 'lane';
const dot2 = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];

/** Road graph: spline roads with typed cross-sections, spatial queries and mesh generation. */
export class RoadNetwork {
  readonly roads: Road[] = [];
  private cells = new Map<string, number[]>();
  private segRoad: Road[] = [];
  private segIdx: number[] = [];

  add(def: RoadDef): Road {
    const r = new Road(this.roads.length, def);
    this.roads.push(r);
    return r;
  }
  byName(name: string) {
    const r = this.roads.find((x) => x.def.name === name);
    if (!r) throw new Error(`no road ${name}`);
    return r;
  }

  // ---------------------------------------------------------------- spatial index
  private index() {
    this.cells.clear();
    this.segRoad = [];
    this.segIdx = [];
    for (const r of this.roads) {
      const pad = r.full + BLEND + 2;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i];
        const b = r.pts[i + 1];
        const id = this.segRoad.length;
        this.segRoad.push(r);
        this.segIdx.push(i);
        for (let cx = Math.floor((Math.min(a.x, b.x) - pad) / CELL); cx <= Math.floor((Math.max(a.x, b.x) + pad) / CELL); cx++)
          for (let cz = Math.floor((Math.min(a.z, b.z) - pad) / CELL); cz <= Math.floor((Math.max(a.z, b.z) + pad) / CELL); cz++) {
            const k = `${cx},${cz}`;
            let arr = this.cells.get(k);
            if (!arr) this.cells.set(k, (arr = []));
            arr.push(id);
          }
      }
    }
  }

  private project(r: Road, i: number, x: number, z: number): RoadHit {
    const a = r.pts[i];
    const b = r.pts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const L2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / L2, 0, 1);
    const qx = a.x + dx * t;
    const qz = a.z + dz * t;
    const tx = lerp(a.tx, b.tx, t);
    const tz = lerp(a.tz, b.tz, t);
    // left normal = (tz, -tx)
    let lat = (x - qx) * tz - (z - qz) * tx;
    // past either end of a segment the perpendicular offset ignores the distance along the road, so a far
    // stretch of a winding road could look close: use the true distance there (also caps the road ends)
    if (t === 0 || t === 1) lat = Math.sign(lat || 1) * Math.hypot(x - qx, z - qz);
    return { road: r, i, t, lat, s: lerp(a.s, b.s, t), y: lerp(a.y, b.y, t), tx, tz, kind: r.spec.drive };
  }

  /** All roads near a point (one hit per road, closest segment). */
  near(x: number, z: number): RoadHit[] {
    const arr = this.cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
    if (!arr) return [];
    const best = new Map<Road, RoadHit>();
    for (const id of arr) {
      const r = this.segRoad[id];
      const h = this.project(r, this.segIdx[id], x, z);
      const prev = best.get(r);
      if (!prev || Math.abs(h.lat) < Math.abs(prev.lat)) best.set(r, h);
    }
    return [...best.values()];
  }

  /** The carriageway under (x, z) (closest to `nearY` when roads stack, e.g. under the viaduct). */
  roadAt(x: number, z: number, nearY?: number): RoadHit | null {
    let best: RoadHit | null = null;
    let bs = Infinity;
    for (const h of this.near(x, z)) {
      if (Math.abs(h.lat) > h.road.spec.hw + (h.road.spec.shoulder ? h.road.spec.shoulder.w * 0.5 : 0)) continue;
      const score = nearY === undefined ? -h.road.spec.rank : Math.abs(h.y - nearY);
      if (score < bs) {
        bs = score;
        best = h;
      }
    }
    if (!best) {
      const c = this.bulbAt(x, z);
      if (c) best = c;
    }
    return best;
  }

  private bulbs: { r: Road; x: number; z: number; y: number; R: number }[] = [];
  readonly corners: Corner[] = [];
  private cornerCells = new Map<string, Corner[]>();
  private bulbAt(x: number, z: number): RoadHit | null {
    for (const b of this.bulbs) {
      if (Math.hypot(x - b.x, z - b.z) < b.R) {
        const e = b.r.pts[b.r.pts.length - 1];
        return { road: b.r, i: b.r.pts.length - 2, t: 1, lat: 0, s: b.r.length, y: b.y, tx: e.tx, tz: e.tz, kind: b.r.spec.drive };
      }
    }
    return null;
  }

  /** Height of road/sidewalk surfaces at a point, choosing the deck closest to nearY. -Infinity if none. */
  surfaceY(x: number, z: number, nearY?: number): number {
    let best = -Infinity;
    let bs = Infinity;
    for (const h of this.near(x, z)) {
      const sp = h.road.spec;
      const a = Math.abs(h.lat);
      let y = -Infinity;
      if (a <= sp.hw + (sp.shoulder?.w ?? 0)) y = h.y + 0.04;
      else if (sp.curb && a <= h.road.full) y = h.y + 0.16;
      if (y === -Infinity) continue;
      const score = nearY === undefined ? -y : Math.abs(y - nearY);
      if (score < bs) {
        bs = score;
        best = y;
      }
    }
    for (const b of this.bulbs) if (Math.hypot(x - b.x, z - b.z) < b.R + 4) best = Math.max(best, b.y + (Math.hypot(x - b.x, z - b.z) < b.R ? 0.04 : 0.16));
    const cy = this.cornerSurface(x, z);
    if (cy > -Infinity && (best === -Infinity || nearY === undefined || Math.abs(cy - nearY) < Math.abs(best - nearY))) best = nearY === undefined ? Math.max(best, cy) : cy;
    return best;
  }

  /** Height of a curb-return fillet (asphalt) or its sidewalk ring at (x, z); -Infinity outside every corner. */
  private cornerSurface(x: number, z: number): number {
    const arr = this.cornerCells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
    if (!arr) return -Infinity;
    for (const c of arr) {
      const dx = x - c.C[0];
      const dz = z - c.C[1];
      const d = Math.hypot(dx, dz);
      // angle along the arc from P1 (0) to P2 (1)
      const a1 = Math.atan2(c.P1[1] - c.C[1], c.P1[0] - c.C[0]);
      let da = Math.atan2(c.P2[1] - c.C[1], c.P2[0] - c.C[0]) - a1;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      let aq = Math.atan2(dz, dx) - a1;
      while (aq > Math.PI) aq -= Math.PI * 2;
      while (aq < -Math.PI) aq += Math.PI * 2;
      const t = aq / da;
      if (t < 0 || t > 1) continue;
      const y = lerp(c.y1, c.y2, t);
      const w = c.a.spec.curb && c.b.spec.curb ? lerp(sideWidth(c.a), sideWidth(c.b), t) : 0;
      if (d <= c.R && d >= c.R - w) return y + 0.16;
      // fillet: between the arc and the curb corner X
      if (d > c.R && Math.hypot(x - c.X[0], z - c.X[1]) < c.tP * 1.05) return lerp(c.yX, y, 0.5) + 0.04;
    }
    return -Infinity;
  }

  /** Terrain grading near at-grade roads (installed into the terrain height pipeline). */
  private grade(x: number, z: number, h: number): number {
    let bw = 0;
    let by = h;
    for (const hit of this.near(x, z)) {
      const r = hit.road;
      const a = r.pts[hit.i];
      const b = r.pts[hit.i + 1];
      if (a.elevated && b.elevated) continue;
      const blend = r.kind === 'interstate' ? 34 : r.spec.rank <= 3 ? 12 : BLEND;
      const w = 1 - smoothstep(r.full, r.full + blend, Math.abs(hit.lat));
      if (w > bw) {
        bw = w;
        by = hit.y - 0.06;
      }
    }
    for (const c of this.bulbs) {
      const w = 1 - smoothstep(c.R + 5, c.R + 18, Math.hypot(x - c.x, z - c.z));
      if (w > bw) {
        bw = w;
        by = c.y - 0.06;
      }
    }
    return bw > 0 ? lerp(h, by, bw) : h;
  }

  // ---------------------------------------------------------------- profiles
  /** Computes road heights (terrain-following, viaducts, ramps, junction matching) and installs grading. */
  finalize() {
    for (const r of this.roads) {
      const raw = r.pts.map((p) => preRoadHeight(p.x, p.z));
      let sm = raw;
      const W = r.kind === 'interstate' ? 14 : 7;
      for (let pass = 0; pass < 3; pass++) {
        const out = sm.slice();
        for (let i = 0; i < sm.length; i++) {
          let sum = 0;
          let n = 0;
          for (let k = -W; k <= W; k++) {
            const j = i + k;
            if (j < 0 || j >= sm.length) continue;
            sum += sm[j];
            n++;
          }
          out[i] = sum / n;
        }
        sm = out;
      }
      r.pts.forEach((p, i) => {
        // never dig more than a little below the natural ground, and lift over the river
        let y = Math.max(sm[i], raw[i] - 2.5);
        const rv = river.query(p.x, p.z);
        if (rv && !r.def.noBridge) {
          // bridge deck rises over the channel, with embankment approaches
          const w = 1 - smoothstep(rv.hw + 3, rv.hw + 30, rv.dist);
          y = Math.max(y, lerp(y, rv.water + 2.7, w));
        }
        p.y = y + (r.def.elev ? r.def.elev(p.x, p.z, p.s) : 0);
      });
    }
    this.index();
    // junctions and continuations
    for (const r of this.roads) {
      for (const end of [0, 1] as const) {
        const p = end ? r.pts[r.pts.length - 1] : r.pts[0];
        for (const o of this.roads) {
          if (o === r) continue;
          const oe = [o.pts[0], o.pts[o.pts.length - 1]];
          if (oe.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 1.5)) {
            r.chained.add(o);
            o.chained.add(r);
            continue;
          }
        }
        let best: { road: Road; hit: RoadHit } | null = null;
        for (const h of this.near(p.x, p.z)) {
          if (h.road === r || r.chained.has(h.road)) continue;
          if (Math.abs(h.lat) <= h.road.spec.hw + 1 && (!best || h.road.spec.rank > best.road.spec.rank)) best = { road: h.road, hit: h };
        }
        if (end) r.endOn = best;
        else r.startOn = best;
      }
    }
    // match heights where roads meet (ramps interpolate end to end)
    const order = [...this.roads].sort((a, b) => b.spec.rank - a.spec.rank);
    for (const r of order) {
      const y0 = r.startOn ? r.startOn.hit.y : null;
      const y1 = r.endOn ? r.endOn.hit.y : null;
      if (r.def.link && y0 !== null && y1 !== null) {
        for (const p of r.pts) {
          const t = p.s / r.length;
          p.y = lerp(y0, y1, smoothstep(0.22, 0.96, t));
        }
      } else {
        const blend = 36;
        for (const p of r.pts) {
          if (y0 !== null) p.y += (y0 - r.pts[0].y) * (1 - smoothstep(0, blend, p.s));
        }
        const yEnd = r.pts[r.pts.length - 1].y;
        for (const p of r.pts) {
          if (y1 !== null) p.y += (y1 - yEnd) * (1 - smoothstep(0, blend, r.length - p.s));
        }
      }
      for (const p of r.pts) p.elevated = p.y - preRoadHeight(p.x, p.z) > 2.4;
      // refresh hits on roads that attach to this one
      for (const o of this.roads) {
        if (o.startOn?.road === r) o.startOn.hit = this.project(r, o.startOn.hit.i, o.pts[0].x, o.pts[0].z);
        if (o.endOn?.road === r) o.endOn.hit = this.project(r, o.endOn.hit.i, o.pts[o.pts.length - 1].x, o.pts[o.pts.length - 1].z);
      }
    }
    this.index();
    this.bulbs = this.roads
      .filter((r) => r.def.culdesac)
      .map((r) => {
        const e = r.pts[r.pts.length - 1];
        return { r, x: e.x + e.tx * 6, z: e.z + e.tz * 6, y: e.y, R: r.spec.hw + 8.6 };
      });
    this.findCorners();
    setRoadHook((x, z, h) => this.grade(x, z, h));
    setRoadSurfaceHooks(
      (x, z, nearY) => this.surfaceY(x, z, nearY),
      (x, z, m) => this.close(x, z, m),
    );
  }

  // ---------------------------------------------------------------- junction corners (curb returns)
  private hitOn(r: Road, x: number, z: number): RoadHit | null {
    return this.near(x, z).find((h) => h.road === r) ?? null;
  }

  /** One rounded corner between road a's curb line on side sa and road b's on side sb, near point (jx, jz). */
  private corner(a: Road, sa: number, ta: V2, pa: V2, b: Road, sb: number, tb: V2, pb: V2) {
    const na: V2 = [ta[1], -ta[0]];
    const nb: V2 = [tb[1], -tb[0]];
    const oa = curbLine(a);
    const ob = curbLine(b);
    const A0: V2 = [pa[0] + na[0] * sa * oa, pa[1] + na[1] * sa * oa];
    const B0: V2 = [pb[0] + nb[0] * sb * ob, pb[1] + nb[1] * sb * ob];
    const cr = ta[0] * tb[1] - ta[1] * tb[0];
    if (Math.abs(cr) < 0.25) return; // shallow merges get no fillet
    const t = ((B0[0] - A0[0]) * tb[1] - (B0[1] - A0[1]) * tb[0]) / cr;
    const X: V2 = [A0[0] + ta[0] * t, A0[1] + ta[1] * t];
    const s1 = Math.sign(dot2(ta, [nb[0] * sb, nb[1] * sb])) || 1;
    const s2 = Math.sign(dot2(tb, [na[0] * sa, na[1] * sa])) || 1;
    const w1: V2 = [ta[0] * s1, ta[1] * s1];
    const w2: V2 = [tb[0] * s2, tb[1] * s2];
    const theta = Math.acos(clamp(dot2(w1, w2), -1, 1));
    if (theta < 0.35 || theta > 2.8) return;
    const wide = (r: Road) => r.kind === 'arterial' || r.kind === 'rural' || r.kind === 'strip';
    let R = Math.max(wide(a) || wide(b) ? 9 : a.kind === 'downtown' || b.kind === 'downtown' ? 5.5 : 4.5, Math.max(sideWidth(a), sideWidth(b)) + 1.6);
    if (a.spec.surface === 'gravel' || b.spec.surface === 'gravel') R = 4;
    let tP = R / Math.tan(theta / 2);
    if (tP > 22) {
      tP = 22;
      R = tP * Math.tan(theta / 2);
    }
    const P1: V2 = [X[0] + w1[0] * tP, X[1] + w1[1] * tP];
    const P2: V2 = [X[0] + w2[0] * tP, X[1] + w2[1] * tP];
    // both tangent points must lie on the real curb lines (not past a road's end)
    const h1 = this.hitOn(a, P1[0], P1[1]);
    const h2 = this.hitOn(b, P2[0], P2[1]);
    const hx = this.hitOn(b, X[0], X[1]) ?? this.hitOn(a, X[0], X[1]);
    if (!h1 || !h2 || !hx || Math.abs(Math.abs(h1.lat) - oa) > 1.2 || Math.abs(Math.abs(h2.lat) - ob) > 1.2) return;
    if (Math.abs(h1.y - h2.y) > 2.5) return;
    const bis = Math.hypot(w1[0] + w2[0], w1[1] + w2[1]);
    const d = R / Math.sin(theta / 2);
    const C: V2 = [X[0] + ((w1[0] + w2[0]) / bis) * d, X[1] + ((w1[1] + w2[1]) / bis) * d];
    const c: Corner = { a, b, X, C, R, tP, w1, w2, n1: [na[0] * sa, na[1] * sa], n2: [nb[0] * sb, nb[1] * sb], P1, P2, y1: h1.y, y2: h2.y, yX: hx.y };
    this.corners.push(c);
    const reach = tP + Math.max(sideWidth(a), sideWidth(b)) + 4;
    for (let cx = Math.floor((X[0] - reach) / CELL); cx <= Math.floor((X[0] + reach) / CELL); cx++)
      for (let cz = Math.floor((X[1] - reach) / CELL); cz <= Math.floor((X[1] + reach) / CELL); cz++) {
        const k = `${cx},${cz}`;
        let arr = this.cornerCells.get(k);
        if (!arr) this.cornerCells.set(k, (arr = []));
        arr.push(c);
      }
  }

  /** Curb returns at every T-junction (road ending on another) and every at-grade crossing. */
  private findCorners() {
    const tan = (p: Sample): V2 => [p.tx, p.tz];
    // T-junctions: the ending road meets the through road on one side
    for (const r of this.roads) {
      if (!filleted(r)) continue;
      for (const end of [0, 1] as const) {
        const on = end ? r.endOn : r.startOn;
        if (!on || !filleted(on.road)) continue;
        const o = on.road;
        const e = end ? r.pts[r.pts.length - 1] : r.pts[0];
        const back = r.at(end ? r.length - 18 : 18);
        const side = Math.sign(this.hitOn(o, back.x, back.z)?.lat ?? 0);
        if (!side) continue;
        const q = o.at(on.hit.s);
        for (const sa of [-1, 1]) this.corner(r, sa, tan(e), [e.x, e.z], o, side, tan(q), [q.x, q.z]);
      }
    }
    // crossings: both roads continue through, four corners
    const box = (r: Road) => {
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (const p of r.pts) {
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        z0 = Math.min(z0, p.z);
        z1 = Math.max(z1, p.z);
      }
      return [x0, x1, z0, z1];
    };
    const roads = this.roads.filter(filleted);
    const boxes = roads.map(box);
    for (let i = 0; i < roads.length; i++)
      for (let j = i + 1; j < roads.length; j++) {
        const A = roads[i];
        const B = roads[j];
        if (A.chained.has(B)) continue;
        const ba = boxes[i];
        const bb = boxes[j];
        if (ba[1] < bb[0] - 1 || bb[1] < ba[0] - 1 || ba[3] < bb[2] - 1 || bb[3] < ba[2] - 1) continue;
        for (let m = 0; m + 4 < A.pts.length; m += 4)
          for (let n = 0; n + 4 < B.pts.length; n += 4) {
            const p = A.pts[m];
            const p2 = A.pts[m + 4];
            const q = B.pts[n];
            const q2 = B.pts[n + 4];
            const dax = p2.x - p.x;
            const daz = p2.z - p.z;
            const dbx = q2.x - q.x;
            const dbz = q2.z - q.z;
            const den = dax * dbz - daz * dbx;
            if (Math.abs(den) < 1e-6) continue;
            const u = ((q.x - p.x) * dbz - (q.z - p.z) * dbx) / den;
            const v = ((q.x - p.x) * daz - (q.z - p.z) * dax) / den;
            if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
            const sA = p.s + u * (p2.s - p.s);
            const sB = q.s + v * (q2.s - q.s);
            // a road that merely ends here is a T (handled above), not a crossing
            if (sA < 12 || sA > A.length - 12 || sB < 12 || sB > B.length - 12) continue;
            const pa = A.at(sA);
            const pb = B.at(sB);
            if (Math.abs(pa.y - pb.y) > 2.5 || pa.elevated || pb.elevated) continue;
            for (const sa of [-1, 1]) for (const sb of [-1, 1]) this.corner(A, sa, [pa.tx, pa.tz], [pa.x, pa.z], B, sb, [pb.tx, pb.tz], [pb.x, pb.z]);
          }
      }
  }

  /** How far back from the junction road r's curb returns run, for corners near (x, z) (0 if none). */
  returnLength(r: Road, x: number, z: number): number {
    let best = 0;
    for (const c of this.corners) if ((c.a === r || c.b === r) && Math.hypot(c.X[0] - x, c.X[1] - z) < 30) best = Math.max(best, c.tP);
    return best;
  }

  /** Is (x, z) on a junction: inside another road's carriageway or within a curb return? */
  inJunction(self: Road, x: number, z: number, y: number): boolean {
    for (const h of this.near(x, z)) if (h.road !== self && !self.chained.has(h.road) && Math.abs(h.lat) < h.road.spec.hw + 1.5 && Math.abs(h.y - y) < 3) return true;
    const arr = this.cornerCells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
    if (arr) for (const c of arr) if (Math.hypot(x - c.X[0], z - c.X[1]) < c.tP + 1.5) return true;
    return false;
  }

  /** Inside the sidewalk strip of `self` between a junction corner and its curb-return tangent point? */
  private inCornerCut(self: Road, x: number, z: number): boolean {
    const arr = this.cornerCells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
    if (!arr) return false;
    for (const c of arr) {
      const q: V2 = [x - c.X[0], z - c.X[1]];
      if (c.a === self) {
        const d = dot2(q, c.w1);
        const e = dot2(q, c.n1);
        if (d < c.tP && d > -40 && e > -0.3 && e < sideWidth(self) + 0.8) return true;
      }
      if (c.b === self) {
        const d = dot2(q, c.w2);
        const e = dot2(q, c.n2);
        if (d < c.tP && d > -40 && e > -0.3 && e < sideWidth(self) + 0.8) return true;
      }
    }
    return false;
  }

  /** Is (x, z) within `margin` of any road's full width (carriageway, shoulders, curbs, sidewalks) or bulb? */
  close(x: number, z: number, margin: number): boolean {
    for (const h of this.near(x, z)) if (Math.abs(h.lat) < h.road.full + margin) return true;
    for (const b of this.bulbs) if (Math.hypot(x - b.x, z - b.z) < b.R + 4 + margin) return true;
    return false;
  }

  /** Registers road footprints so buildings and trees keep clear. */
  occupy(occ: Occupancy) {
    for (const r of this.roads) {
      const w = r.full * 2 + 1.5;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i];
        const b = r.pts[i + 1];
        if (a.elevated && b.elevated && r.kind === 'interstate') {
          occ.add((a.x + b.x) / 2, (a.z + b.z) / 2, Math.hypot(b.x - a.x, b.z - a.z) + 0.5, 16, Math.atan2(-(b.z - a.z), b.x - a.x), 0, false);
          continue;
        }
        occ.add((a.x + b.x) / 2, (a.z + b.z) / 2, Math.hypot(b.x - a.x, b.z - a.z) + 0.6, w, Math.atan2(-(b.z - a.z), b.x - a.x), 0, false);
      }
    }
    for (const c of this.bulbs) occ.add(c.x, c.z, (c.R + 4) * 2, (c.R + 4) * 2, 0, 0, false);
  }

  /** Point beside a road at arc length s (side +1 = left of travel), and the yaw that faces the road. */
  frontage(r: Road, s: number, side: 1 | -1, dist: number) {
    const p = r.at(s);
    const nx = p.tz * side;
    const nz = -p.tx * side;
    const x = p.x + nx * dist;
    const z = p.z + nz * dist;
    // facing back toward the road: direction (-nx, -nz) = (sin ry, cos ry)
    return { x, z, ry: Math.atan2(-nx, -nz), y: p.y, p };
  }

  /** Closest drivable lane point and heading (radians, 0 = +X) for spawning. */
  nearestLane(x: number, z: number, prefer = 0) {
    let best = { x: 0, z: 0, heading: 0 };
    let bd = Infinity;
    for (const r of this.roads) {
      if (r.kind === 'ramp' || r.kind === 'dirt') continue;
      for (let i = 0; i < r.pts.length; i += 2) {
        const p = r.pts[i];
        const d = Math.hypot(p.x - x, p.z - z);
        if (d >= bd) continue;
        bd = d;
        const fwd = Math.cos(Math.atan2(-p.tz, p.tx) - prefer) >= 0 ? 1 : -1;
        const tx = p.tx * fwd;
        const tz = p.tz * fwd;
        const off = r.kind === 'interstate' ? 7 : r.spec.hw > 5 ? 2.2 : 1.6;
        // right-hand lane: right normal = (-tz, tx)
        best = { x: p.x - tz * off, z: p.z + tx * off, heading: Math.atan2(-tz, tx) };
      }
    }
    return best;
  }

  /** Lane polyline for traffic: offset to the right of travel, optionally reversed. */
  lane(r: Road, offset: number, reverse = false): { x: number; z: number; y: number }[] {
    const pts = reverse ? [...r.pts].reverse() : r.pts;
    const sgn = reverse ? -1 : 1;
    return pts.map((p) => ({ x: p.x - p.tz * sgn * offset, z: p.z + p.tx * sgn * offset, y: p.y }));
  }

  mapData() {
    return this.roads.map((r) => ({
      pts: r.pts.filter((_, i) => i % 3 === 0 || i === r.pts.length - 1).map((p) => [p.x, p.z] as [number, number]),
      w: r.spec.hw * 2,
      kind: r.spec.drive,
      rank: r.spec.rank,
      label: r.def.label ?? r.def.name,
      culdesac: r.def.culdesac ? { x: r.pts[r.pts.length - 1].x + r.pts[r.pts.length - 1].tx * 6, z: r.pts[r.pts.length - 1].z + r.pts[r.pts.length - 1].tz * 6, R: r.spec.hw + 8.6 } : null,
    }));
  }

  // ---------------------------------------------------------------- mesh generation
  build(k: Kit, solids: Occupancy) {
    const geo = new MeshAccumulator();
    for (const r of this.roads) buildRoad(this, r, geo, solids);
    for (const c of this.bulbs) buildBulb(c, geo);
    for (const c of this.corners) buildCorner(c, geo);
    geo.flush(k);
  }

  /** Is a point inside another road's carriageway / full zone (for trimming at junctions)? */
  cover(self: Road, x: number, z: number, mode: 'surface' | 'mark' | 'edge' | 'side', y: number): boolean {
    if (mode === 'side' && this.inCornerCut(self, x, z)) return true;
    for (const h of this.near(x, z)) {
      const o = h.road;
      if (o === self || self.chained.has(o)) continue;
      // stacked roads (viaduct over a street) don't trim each other
      if (Math.abs(h.y - y) > 2.5) continue;
      const a = Math.abs(h.lat);
      const inCarriage = a < o.spec.hw - 0.05;
      // at a T the road that ends gives way to the through road, whatever their classes
      const endsOnO = self.startOn?.road === o || self.endOn?.road === o;
      const oEndsOnSelf = o.startOn?.road === self || o.endOn?.road === self;
      const wins = endsOnO || (!oEndsOnSelf && (o.spec.rank > self.spec.rank || (o.spec.rank === self.spec.rank && o.id < self.id)));
      if (mode === 'surface') {
        if (inCarriage && wins) return true;
      } else if (mode === 'mark') {
        if (inCarriage && !oEndsOnSelf && (wins || o.spec.rank >= self.spec.rank)) return true;
      } else if (mode === 'edge') {
        if (a < o.spec.hw + 0.3) return true;
      } else {
        if (inCarriage) return true;
        if (a < o.full && wins) return true;
      }
    }
    for (const b of this.bulbs) if (b.r !== self && Math.hypot(x - b.x, z - b.z) < b.R) return true;
    return false;
  }
}

// ------------------------------------------------------------------ geometry accumulation
interface Bucket {
  mat: string;
  color: number;
  pos: number[];
  uv: number[];
  cast: boolean;
}

class MeshAccumulator {
  private buckets = new Map<string, Bucket>();
  private get(chunk: string, mat: string, color: number, cast: boolean) {
    const key = `${chunk}|${mat}|${color}|${cast ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = { mat, color, pos: [], uv: [], cast }));
    return b;
  }
  /** Quad from 4 corners (a0,a1 at sample i; b0,b1 at i+1); wound so the normal faces `up`. */
  quad(chunk: string, mat: string, color: number, a0: number[], a1: number[], b0: number[], b1: number[], uv: number[][], cast = false, down = false) {
    const b = this.get(chunk, mat, color, cast);
    const ux = a1[0] - a0[0];
    const uy = a1[1] - a0[1];
    const uz = a1[2] - a0[2];
    const vx = b0[0] - a0[0];
    const vy = b0[1] - a0[1];
    const vz = b0[2] - a0[2];
    // normal of (a0,b0,a1) = v × u
    const ny = vz * ux - vx * uz;
    const flipUp = down ? ny > 0 : ny < 0;
    const tris = flipUp ? [a0, a1, b0, b0, a1, b1] : [a0, b0, a1, a1, b0, b1];
    const tuv = flipUp ? [uv[0], uv[1], uv[2], uv[2], uv[1], uv[3]] : [uv[0], uv[2], uv[1], uv[1], uv[2], uv[3]];
    void uy;
    void vy;
    for (let i = 0; i < 6; i++) {
      b.pos.push(tris[i][0], tris[i][1], tris[i][2]);
      b.uv.push(tuv[i][0], tuv[i][1]);
    }
  }
  /** Single triangle wound to face up, UVs in world metres. */
  tri(chunk: string, mat: string, color: number, p0: number[], p1: number[], p2: number[]) {
    const b = this.get(chunk, mat, color, false);
    const ny = (p1[2] - p0[2]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[2] - p0[2]);
    for (const q of ny >= 0 ? [p0, p1, p2] : [p0, p2, p1]) {
      b.pos.push(q[0], q[1], q[2]);
      b.uv.push(q[0], q[2]);
    }
  }
  /** Vertical wall quad whose normal points along (nx, nz). */
  wall(chunk: string, mat: string, color: number, ax: number, az: number, bx: number, bz: number, y0a: number, y1a: number, y0b: number, y1b: number, nx: number, nz: number, s0: number, s1: number, cast = true) {
    const b = this.get(chunk, mat, color, cast);
    const ex = bx - ax;
    const ez = bz - az;
    // (a-bottom, b-bottom, a-top) normal = (e × up) => (−ez·…) choose winding by sign
    const cx = -ez;
    const cz = ex;
    const out = cx * nx + cz * nz < 0;
    const A0 = [ax, y0a, az];
    const A1 = [ax, y1a, az];
    const B0 = [bx, y0b, bz];
    const B1 = [bx, y1b, bz];
    const tris = out ? [A0, B0, A1, A1, B0, B1] : [A0, A1, B0, B0, A1, B1];
    const uvA0 = [s0, y0a];
    const uvA1 = [s0, y1a];
    const uvB0 = [s1, y0b];
    const uvB1 = [s1, y1b];
    const tuv = out ? [uvA0, uvB0, uvA1, uvA1, uvB0, uvB1] : [uvA0, uvA1, uvB0, uvB0, uvA1, uvB1];
    for (let i = 0; i < 6; i++) {
      b.pos.push(tris[i][0], tris[i][1], tris[i][2]);
      b.uv.push(tuv[i][0], tuv[i][1]);
    }
  }
  flush(k: Kit) {
    for (const b of this.buckets.values()) {
      if (!b.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.computeVertexNormals();
      k.add(g, b.color, b.mat, undefined, b.cast);
    }
    this.buckets.clear();
  }
}

const CHUNK = 110;

function buildRoad(net: RoadNetwork, r: Road, g: MeshAccumulator, solids: Occupancy) {
  const sp = r.spec;
  const pts = r.pts;
  const surf = sp.surface === 'gravel' ? 'gravel@decal' : 'asphalt@decal';
  const L = (p: Sample, lat: number, dy: number) => [p.x + p.tz * lat, p.y + dy, p.z - p.tx * lat];
  const n = pts.length - 1;
  const isBridge = (p: Sample) => {
    if (r.def.noBridge || p.elevated) return false;
    const rv = river.query(p.x, p.z);
    return !!rv && rv.dist < rv.hw + 5;
  };
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const chunk = `${r.id}|${Math.floor(a.s / CHUNK)}`;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const tx = (a.tx + b.tx) / 2;
    const tz = (a.tz + b.tz) / 2;
    const at = (lat: number) => [mx + tz * lat, mz - tx * lat] as const;
    /** Sample part-way between a and b. */
    const S = (t: number): Sample => ({
      x: lerp(a.x, b.x, t),
      z: lerp(a.z, b.z, t),
      y: lerp(a.y, b.y, t),
      tx: lerp(a.tx, b.tx, t),
      tz: lerp(a.tz, b.tz, t),
      s: lerp(a.s, b.s, t),
      elevated: a.elevated || b.elevated,
    });
    const covered = (t: number, lat: number, mode: CoverMode) => {
      const p = S(t);
      return net.cover(r, p.x + p.tz * lat, p.z - p.tx * lat, mode, p.y);
    };
    /** The uncovered part [t0, t1] of this segment at lateral offset `lat` (exact to ~2 cm), or null. */
    const clip = (lat: number, mode: CoverMode): [number, number] | null => {
      const ca = covered(0, lat, mode);
      const cb = covered(1, lat, mode);
      if (ca && cb) return null;
      if (!ca && !cb) return [0, 1];
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 7; k++) {
        const m = (lo + hi) / 2;
        if (covered(m, lat, mode) === ca) lo = m;
        else hi = m;
      }
      return ca ? [hi, 1] : [0, lo];
    };
    const band = (l0: number, l1: number, dy: number, mat: string, color: number, mode: CoverMode, cast = false) => {
      const c = clip((l0 + l1) / 2, mode);
      if (!c) return;
      const A = S(c[0]);
      const B = S(c[1]);
      g.quad(chunk, mat, color, L(A, l0, dy), L(A, l1, dy), L(B, l0, dy), L(B, l1, dy), [
        [l0, A.s],
        [l1, A.s],
        [l0, B.s],
        [l1, B.s],
      ], cast);
    };
    const dash = (period: number, on: number) => (a.s % period) < on;
    // carriageway, in two halves so cuts follow oblique junction edges closely
    band(-sp.hw, 0, 0.035, surf, sp.color, 'surface');
    band(0, sp.hw, 0.035, surf, sp.color, 'surface');
    if (sp.surface === 'gravel' && r.kind === 'dirt') {
      // grassy crown between the wheel ruts
      band(-0.45, 0.45, 0.05, 'paint', 0x6f8a45, 'mark');
    }
    // markings
    const Y = P.lineYellow;
    const Wt = P.lineWhite;
    if (sp.center === 'double' || sp.center === 'turn') {
      const o = sp.center === 'turn' ? 1.9 : 0;
      band(o + 0.08, o + 0.2, 0.05, 'decal', Y, 'mark');
      band(-o - 0.2, -o - 0.08, 0.05, 'decal', Y, 'mark');
      if (sp.center === 'turn' && dash(9, 3)) {
        band(o - 0.42, o - 0.3, 0.05, 'decal', Y, 'mark');
        band(-o + 0.3, -o + 0.42, 0.05, 'decal', Y, 'mark');
      }
    } else if (sp.center === 'dashed' && dash(12, 3.5)) band(-0.06, 0.06, 0.05, 'decal', Y, 'mark');
    for (const ll of sp.laneLines) if (dash(12, 3.5)) for (const s of [-1, 1]) band(s * ll - 0.07, s * ll + 0.07, 0.05, 'decal', Wt, 'mark');
    if (sp.edge > 0) {
      for (const s of [-1, 1]) band(s * sp.edge - 0.08, s * sp.edge + 0.08, 0.05, 'decal', r.kind === 'interstate' ? Wt : Wt, 'edge');
      if (r.kind === 'interstate') for (const s of [-1, 1]) band(s * 1.55 - 0.08, s * 1.55 + 0.08, 0.05, 'decal', Y, 'edge');
      if (r.kind === 'ramp') band(-sp.edge - 0.08, -sp.edge + 0.08, 0.05, 'decal', Y, 'edge');
    }
    if (sp.parking) for (const s of [-1, 1]) band(s * (sp.hw - 2.5) - 0.06, s * (sp.hw - 2.5) + 0.06, 0.05, 'decal', Wt, 'edge');
    // shoulders
    if (sp.shoulder) for (const s of [-1, 1]) band(s > 0 ? sp.hw : -sp.hw - sp.shoulder.w, s > 0 ? sp.hw + sp.shoulder.w : -sp.hw, 0.03, sp.shoulder.mat + '@decal', sp.shoulder.color, 'side');
    // curbs, park strips, sidewalks
    if (sp.curb) {
      for (const s of [-1, 1]) {
        const l0 = sp.hw;
        const l1 = l0 + 0.25;
        const l2 = l1 + sp.park;
        const l3 = l2 + sp.walk;
        const c = clip(s * (l0 + 0.6), 'side');
        if (!c) continue;
        const sa = S(c[0]);
        const sbb = S(c[1]);
        const nx = tz * s;
        const nz = -tx * s;
        const A = L(sa, s * l0, 0);
        const B = L(sbb, s * l0, 0);
        g.wall(chunk, 'concrete', 0xb9bab8, A[0], A[2], B[0], B[2], sa.y + 0.03, sa.y + 0.16, sbb.y + 0.03, sbb.y + 0.16, -nx, -nz, sa.s, sbb.s, false);
        const strip = (p0: number, p1: number, dy: number, mat: string, color: number) =>
          g.quad(chunk, mat, color, L(sa, s * p0, dy), L(sa, s * p1, dy), L(sbb, s * p0, dy), L(sbb, s * p1, dy), [
            [p0, sa.s],
            [p1, sa.s],
            [p0, sbb.s],
            [p1, sbb.s],
          ]);
        strip(l0, l1, 0.16, 'concrete', 0xc9cac9);
        if (sp.park > 0) strip(l1, l2, 0.14, 'paint', 0x6f9040);
        strip(l2, l3, 0.16, 'concrete', P.sidewalk);
        const O = L(sa, s * l3, 0);
        const Ob = L(sbb, s * l3, 0);
        g.wall(chunk, 'concrete', 0xb4b5b3, O[0], O[2], Ob[0], Ob[2], sa.y - 0.4, sa.y + 0.16, sbb.y - 0.4, sbb.y + 0.16, nx, nz, sa.s, sbb.s, false);
      }
    }
    // elevated decks / bridges: slab edges, underside, parapets
    const bridge = isBridge(a) || isBridge(b);
    if (a.elevated || b.elevated || bridge) {
      const edge = sp.hw + (sp.shoulder ? Math.min(sp.shoulder.w, 1) : 0) + 0.3;
      const thick = a.elevated ? 1.3 : 0.9;
      for (const s of [-1, 1]) {
        const nx = tz * s;
        const nz = -tx * s;
        const [cx, cz] = at(s * (edge - 0.3));
        if (net.cover(r, cx, cz, 'edge', a.y)) continue;
        const A = L(a, s * edge, 0);
        const B = L(b, s * edge, 0);
        g.wall(chunk, 'concrete', 0xb3b0aa, A[0], A[2], B[0], B[2], a.y - thick, a.y + 0.04, b.y - thick, b.y + 0.04, nx, nz, a.s, b.s);
        // parapet (Jersey-profile approximated by a slanted box)
        const Ai = L(a, s * (edge - 0.45), 0);
        const Bi = L(b, s * (edge - 0.45), 0);
        g.wall(chunk, 'concrete', 0xc4c1ba, A[0], A[2], B[0], B[2], a.y, a.y + 0.95, b.y, b.y + 0.95, nx, nz, a.s, b.s);
        g.wall(chunk, 'concrete', 0xc4c1ba, Ai[0], Ai[2], Bi[0], Bi[2], a.y, a.y + 0.95, b.y, b.y + 0.95, -nx, -nz, a.s, b.s);
        g.quad(chunk, 'concrete', 0xd0cdc6, L(a, s * (edge - 0.45), 0.95), L(a, s * edge, 0.95), L(b, s * (edge - 0.45), 0.95), L(b, s * edge, 0.95), [
          [0, a.s],
          [0.45, a.s],
          [0, b.s],
          [0.45, b.s],
        ]);
        solids.add(mx + tz * s * (edge - 0.2), mz - tx * s * (edge - 0.2), Math.hypot(b.x - a.x, b.z - a.z) + 0.4, 0.5, Math.atan2(-(b.z - a.z), b.x - a.x), 0, false, a.y - 0.5, a.y + 3);
      }
      // underside (faces down)
      const U = (p: Sample, lat: number) => [p.x + p.tz * lat, p.y - thick, p.z - p.tx * lat];
      g.quad(chunk, 'concrete', 0x9e9a92, U(a, -edge), U(a, edge), U(b, -edge), U(b, edge), [
        [0, a.s],
        [edge * 2, a.s],
        [0, b.s],
        [edge * 2, b.s],
      ], false, true);
    } else if (sp.guard && r.kind === 'interstate') {
      // W-beam guardrail on the outer shoulder
      for (const s of [-1, 1]) {
        const lat = s * (sp.hw + 1.6);
        const [cx, cz] = at(lat);
        if (net.cover(r, cx, cz, 'edge', a.y)) continue;
        const A = L(a, lat, 0);
        const B = L(b, lat, 0);
        g.wall(chunk, 'metal', 0xb8bcc0, A[0], A[2], B[0], B[2], a.y + 0.45, a.y + 0.8, b.y + 0.45, b.y + 0.8, tz * s * -1, -tx * s * -1, a.s, b.s, false);
        g.wall(chunk, 'metal', 0x9ea2a6, A[0], A[2], B[0], B[2], a.y + 0.45, a.y + 0.8, b.y + 0.45, b.y + 0.8, tz * s, -tx * s, a.s, b.s, false);
        if (i % 2 === 0) {
          const px = A[0] + tz * s * 0.15;
          const pz = A[2] - tx * s * 0.15;
          g.wall(chunk, 'metal', 0x8e9296, px - tx * 0.08, pz - tz * 0.08, px + tx * 0.08, pz + tz * 0.08, a.y, a.y + 0.8, a.y, a.y + 0.8, tz * s * -1, -tx * s * -1, 0, 0.16, false);
        }
      }
    }
    // centre barrier on the interstate (always)
    if (sp.center === 'barrier') {
      const [cx, cz] = at(0);
      if (!net.cover(r, cx, cz, 'mark', a.y)) {
        for (const s of [-1, 1]) {
          const A = L(a, s * 0.32, 0);
          const B = L(b, s * 0.32, 0);
          g.wall(chunk, 'concrete', 0xc9c6bf, A[0], A[2], B[0], B[2], a.y + 0.03, a.y + 0.85, b.y + 0.03, b.y + 0.85, tz * s, -tx * s, a.s, b.s);
        }
        g.quad(chunk, 'concrete', 0xd2cfc8, L(a, -0.32, 0.85), L(a, 0.32, 0.85), L(b, -0.32, 0.85), L(b, 0.32, 0.85), [
          [0, a.s],
          [0.6, a.s],
          [0, b.s],
          [0.6, b.s],
        ]);
        solids.add(mx, mz, Math.hypot(b.x - a.x, b.z - a.z) + 0.3, 0.7, Math.atan2(-(b.z - a.z), b.x - a.x), 0, false, a.y - 0.5, a.y + 2.5);
      }
    }
    // piers under elevated sections
    if (a.elevated && Math.floor(a.s / 30) !== Math.floor(b.s / 30)) {
      const lats = r.kind === 'interstate' ? [-6.5, 6.5] : [0];
      for (const lat of lats) {
        const [px, pz] = at(lat);
        const clear = net.near(px, pz).every((h) => h.road === r || r.chained.has(h.road) || Math.abs(h.lat) > h.road.spec.hw + 2.5 || h.y > a.y - 3);
        if (!clear) continue;
        const ground = preRoadHeight(px, pz) - 1.5;
        const top = a.y - 1.3;
        if (top - ground < 1.5) continue;
        const half = 0.9;
        for (const [ox, oz, nx2, nz2] of [
          [tx, tz, tx, tz],
          [-tx, -tz, -tx, -tz],
          [tz, -tx, tz, -tx],
          [-tz, tx, -tz, tx],
        ]) {
          const cx2 = px + ox * half;
          const cz2 = pz + oz * half;
          const sx = -oz * half;
          const sz = ox * half;
          g.wall(chunk, 'concrete', 0xaaa69e, cx2 - sx, cz2 - sz, cx2 + sx, cz2 + sz, ground, top, ground, top, nx2, nz2, 0, 1.8, true);
        }
        solids.add(px, pz, 2.0, 2.0, Math.atan2(-tz, tx), 0, false, -100, top - 0.2);
      }
      if (r.kind === 'interstate') {
        // pier cap beam
        const [px, pz] = at(0);
        const top = a.y - 1.3;
        for (const s of [-1, 1]) {
          const A = [px - tz * 8 - tx * 0.8 * s, pz + tx * 8 - tz * 0.8 * s];
          const B = [px + tz * 8 - tx * 0.8 * s, pz - tx * 8 - tz * 0.8 * s];
          g.wall(chunk, 'concrete', 0xb0aca4, A[0], A[1], B[0], B[1], top - 1.2, top, top - 1.2, top, -tx * s, -tz * s, 0, 16, true);
        }
      }
    }
  }
  // stop lines where a lesser road meets a bigger one
  for (const end of [0, 1] as const) {
    const on = end ? r.endOn : r.startOn;
    if (!on || r.def.link || on.road.spec.rank <= r.spec.rank || r.kind === 'alley' || r.kind === 'lane' || r.spec.surface === 'gravel') continue;
    const back = on.road.spec.curb ? on.road.full + 0.9 : on.road.spec.hw + (on.road.spec.shoulder?.w ?? 0) + 1.2;
    const s0 = end ? r.length - back : back;
    const p = r.at(s0);
    const q = r.at(s0 + (end ? -0.45 : 0.45));
    const latA = end ? -r.spec.hw + 0.2 : 0;
    const latB = end ? 0 : r.spec.hw - 0.2;
    const ch = `${r.id}|stop${end}`;
    const L2 = (s: Sample, lat: number) => [s.x + s.tz * lat, s.y + 0.05, s.z - s.tx * lat];
    g.quad(ch, 'decal', P.lineWhite, L2(p, latA), L2(p, latB), L2(q, latA), L2(q, latB), [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
  }
}

function buildBulb(c: { r: Road; x: number; z: number; y: number; R: number }, g: MeshAccumulator) {
  const sp = c.r.spec;
  const segs = 28;
  const e = c.r.pts[c.r.pts.length - 1];
  const entry = Math.atan2(-e.tz, -e.tx); // direction back toward the road (in x,z angle space)
  const chunk = `bulb${c.r.id}`;
  const ring = (r0: number, r1: number, dy: number, mat: string, color: number, skipEntry: boolean) => {
    for (let i = 0; i < segs; i++) {
      const t0 = (i / segs) * Math.PI * 2;
      const t1 = ((i + 1) / segs) * Math.PI * 2;
      const mid = (t0 + t1) / 2;
      const da = Math.abs(((mid - entry + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (skipEntry && da < Math.asin(Math.min(1, (sp.hw + 0.4) / Math.max(r1, 1))) + 0.08) continue;
      const P0 = (r: number, t: number) => [c.x + Math.cos(t) * r, c.y + dy, c.z + Math.sin(t) * r];
      g.quad(chunk, mat, color, P0(r0, t0), P0(r1, t0), P0(r0, t1), P0(r1, t1), [
        [Math.cos(t0) * r0, Math.sin(t0) * r0],
        [Math.cos(t0) * r1, Math.sin(t0) * r1],
        [Math.cos(t1) * r0, Math.sin(t1) * r0],
        [Math.cos(t1) * r1, Math.sin(t1) * r1],
      ]);
    }
  };
  ring(0, c.R, 0.035, 'asphalt@decal', sp.color, false);
  if (sp.curb) {
    ring(c.R, c.R + 0.25, 0.16, 'concrete', 0xc9cac9, true);
    if (sp.park > 0) ring(c.R + 0.25, c.R + 0.25 + sp.park, 0.14, 'paint', 0x6f9040, true);
    ring(c.R + 0.25 + sp.park, c.R + 0.25 + sp.park + sp.walk, 0.16, 'concrete', P.sidewalk, true);
    // curb face
    for (let i = 0; i < segs; i++) {
      const t0 = (i / segs) * Math.PI * 2;
      const t1 = ((i + 1) / segs) * Math.PI * 2;
      const mid = (t0 + t1) / 2;
      const da = Math.abs(((mid - entry + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da < Math.asin(Math.min(1, (sp.hw + 0.4) / c.R)) + 0.08) continue;
      g.wall(chunk, 'concrete', 0xb9bab8, c.x + Math.cos(t0) * c.R, c.z + Math.sin(t0) * c.R, c.x + Math.cos(t1) * c.R, c.z + Math.sin(t1) * c.R, c.y + 0.03, c.y + 0.16, c.y + 0.03, c.y + 0.16, -Math.cos(mid), -Math.sin(mid), 0, 1, false);
    }
  }
}

/** Curb return: asphalt fillet between the curb corner and the arc, then curb, planting strip and sidewalk round it. */
function buildCorner(c: Corner, g: MeshAccumulator) {
  const chunk = `corner${Math.floor(c.X[0] / CHUNK)},${Math.floor(c.X[1] / CHUNK)}`;
  const a1 = Math.atan2(c.P1[1] - c.C[1], c.P1[0] - c.C[0]);
  let da = Math.atan2(c.P2[1] - c.C[1], c.P2[0] - c.C[0]) - a1;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const N = Math.max(4, Math.ceil(Math.abs(da) / 0.14));
  const ring = (rad: number, k: number, dy: number) => {
    const ang = a1 + (da * k) / N;
    return [c.C[0] + Math.cos(ang) * rad, lerp(c.y1, c.y2, k / N) + dy, c.C[1] + Math.sin(ang) * rad];
  };
  const gravel = c.a.spec.surface === 'gravel' && c.b.spec.surface === 'gravel';
  const top = c.a.spec.rank >= c.b.spec.rank ? c.a : c.b;
  const X = [c.X[0], c.yX + 0.03, c.X[1]];
  for (let k = 0; k < N; k++) g.tri(chunk, gravel ? 'gravel@decal' : 'asphalt@decal', top.spec.color, X, ring(c.R, k, 0.03), ring(c.R, k + 1, 0.03));
  if (!c.a.spec.curb || !c.b.spec.curb) return;
  // widths blend from road a's sidewalk (at P1) to road b's (at P2)
  const park = (k: number) => lerp(c.a.spec.park, c.b.spec.park, k / N);
  const walk = (k: number) => lerp(c.a.spec.walk, c.b.spec.walk, k / N);
  const uv = (p: number[]) => [p[0], p[2]];
  const quad = (k: number, r0: (k: number) => number, r1: (k: number) => number, dy: number, mat: string, color: number) => {
    const A0 = ring(r0(k), k, dy);
    const A1 = ring(r1(k), k, dy);
    const B0 = ring(r0(k + 1), k + 1, dy);
    const B1 = ring(r1(k + 1), k + 1, dy);
    g.quad(chunk, mat, color, A0, A1, B0, B1, [uv(A0), uv(A1), uv(B0), uv(B1)]);
  };
  const R = c.R;
  for (let k = 0; k < N; k++) {
    const p = ring(R, k, 0);
    const q = ring(R, k + 1, 0);
    const mx = (p[0] + q[0]) / 2 - c.C[0];
    const mz = (p[2] + q[2]) / 2 - c.C[1];
    const ml = Math.hypot(mx, mz) || 1;
    // curb face looks out to the road (away from the fillet centre)
    g.wall(chunk, 'concrete', 0xb9bab8, p[0], p[2], q[0], q[2], p[1] + 0.03, p[1] + 0.16, q[1] + 0.03, q[1] + 0.16, mx / ml, mz / ml, 0, 1, false);
    quad(k, () => R, () => R - 0.25, 0.16, 'concrete', 0xc9cac9);
    if (park(k) + park(k + 1) > 0.05) quad(k, () => R - 0.25, (j) => R - 0.25 - park(j), 0.14, 'paint', 0x6f9040);
    quad(k, (j) => R - 0.25 - park(j), (j) => R - 0.25 - park(j) - walk(j), 0.16, 'concrete', P.sidewalk);
    const rb0 = R - 0.25 - park(k) - walk(k);
    const rb1 = R - 0.25 - park(k + 1) - walk(k + 1);
    const o0 = ring(rb0, k, 0);
    const o1 = ring(rb1, k + 1, 0);
    g.wall(chunk, 'concrete', 0xb4b5b3, o0[0], o0[2], o1[0], o1[2], o0[1] - 0.4, o0[1] + 0.16, o1[1] - 0.4, o1[1] + 0.16, -mx / ml, -mz / ml, 0, 1, false);
  }
}

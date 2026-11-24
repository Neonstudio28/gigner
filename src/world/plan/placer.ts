import * as THREE from 'three';
import type { Ctx } from '../buildings/common';
import { Occupancy, type Kit } from '../core/kit';
import type { BuildingDef } from '../buildings/catalog';
import type { RoadNetwork, Road, RoadHit } from '../roads/network';
import { heightAt, groundHeight, isWater, river, addLotPad } from '../terrain';
import { Rng, clamp, lerp } from '../core/rng';
import * as pr from '../props';
import { vehicle, VEHICLE_LENGTH, type VehicleType, type VehicleOpts } from '../vehicles';
import type { PlacedTree, VegetationInput } from '../vegetation';
import { CAR_COLORS, P } from '../palette';

export interface PlaceOpts {
  /** Max height difference across the footprint (the lot is graded level; commercial wants ~1 m). */
  maxSlope?: number;
  /** false leaves the ground as it is (sites that already stand on a levelled pad). */
  grade?: boolean;
  road?: Road;
  /** Draw a driveway to the road when the def has `drive`. */
  driveway?: boolean;
  mailbox?: boolean;
  car?: number;
}

/** A paved drive from a lot out to the street, laid once the ground mesh exists so it follows it exactly. */
interface DriveSpec {
  /** Start (just inside the building front) and unit direction toward the street. */
  x: number;
  z: number;
  fx: number;
  fz: number;
  /** Start of the drive (negative: under the building front) and its end at the curb line or road edge. */
  t0: number;
  len: number;
  w: number;
  road: Road;
  mat: 'concrete' | 'asphalt';
  color: number;
  /** Building yaw (frame for the mailbox and the parked car). */
  ry: number;
  mailbox?: { x: number; z: number; color: number };
  car?: { type: VehicleType; at: number; ry: number; color: number; opts: VehicleOpts };
}

/** Sites that are reached by car and so get a paved entrance from their lot to the street. */
const SITE_TAGS = ['medical', 'school', 'retail', 'apartments', 'warehouse', 'storage', 'industrial', 'highway', 'service', 'hotel', 'office', 'media'];

/** Shared placement state for the zone builders. */
export class Placer {
  readonly trees: PlacedTree[] = [];
  /** Driveways (and site entrances): street trees, hydrants, lamps and parked cars keep off them. */
  readonly drives = new Occupancy(16);
  readonly cornFields: VegetationInput['cornFields'] = [];
  readonly grassPatches: VegetationInput['grassPatches'] = [];
  readonly clearings: { x: number; z: number; w: number; d: number }[] = [];
  readonly animated: { obj: THREE.Object3D; update: (dt: number, t: number) => void }[] = [];
  /** Named places for the town map (job sites, civic buildings, parks). */
  readonly landmarks: { name: string; x: number; z: number; kind: string }[] = [];
  readonly rng: Rng;
  /** Graded building lots (their flat floors): a new lot's slope must not run into an older one. */
  private lots = new Occupancy(32);
  private pendingDrives: DriveSpec[] = [];
  /** Every building that stands, in placement order (yards and lots are dressed from this). */
  readonly sites: { def: BuildingDef; x: number; z: number; ry: number }[] = [];
  placed = 0;
  skipped: string[] = [];
  static failed = new Set<string>();

  constructor(
    readonly c: Ctx,
    readonly net: RoadNetwork,
  ) {
    this.rng = new Rng(9090);
  }
  get k() {
    return this.c.kit;
  }

  /** Local→world for a footprint centred at (x, z) rotated by ry (Kit convention). */
  static world(x: number, z: number, ry: number, lx: number, lz: number) {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    return [x + lx * c + lz * s, z - lx * s + lz * c] as const;
  }

  /** Is the rotated footprint clear of roads, buildings, water and too-steep ground? */
  free(x: number, z: number, w: number, d: number, ry: number, maxSlope = 6) {
    const nx = Math.max(2, Math.ceil(w / 3));
    const nz = Math.max(2, Math.ceil(d / 3));
    const pts: (readonly [number, number])[] = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) pts.push(Placer.world(x, z, ry, -w / 2 + (w * i) / nx, -d / 2 + (d * j) / nz));
    // cheap rejections first (occupied, water, river banks, map edge), terrain heights only for free lots
    for (const [px, pz] of pts) if (this.c.occ.blocked(px, pz, 0) || Math.hypot(px, pz) > 1820) return null;
    for (const [px, pz] of pts) {
      if (isWater(px, pz)) return null;
      const rv = river.query(px, pz);
      if (rv && rv.dist < rv.hw + 9) return null;
    }
    let lo = Infinity;
    let hi = -Infinity;
    let sum = 0;
    for (const [px, pz] of pts) {
      const h = heightAt(px, pz);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      sum += h;
      if (hi - lo > maxSlope) return null;
    }
    return { lo, hi, avg: sum / pts.length };
  }

  put(def: BuildingDef, x: number, z: number, ry: number, seed: number, o: PlaceOpts = {}): boolean {
    const f = this.free(x, z, def.w, def.d, ry, o.maxSlope ?? 6);
    if (!f) {
      this.skipped.push(def.id);
      return false;
    }
    this.build(def, x, z, ry, seed, f, o);
    return true;
  }

  /** Places without the free test (for hand-placed landmarks); still levels the ground under it. */
  force(def: BuildingDef, x: number, z: number, ry: number, seed: number, o: PlaceOpts = {}) {
    const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => Placer.world(x, z, ry, (sx * def.w) / 2, (sz * def.d) / 2)));
    const hs = [...corners.map(([px, pz]) => heightAt(px, pz)), heightAt(x, z)];
    this.build(def, x, z, ry, seed, { lo: Math.min(...hs), hi: Math.max(...hs), avg: hs.reduce((a, b) => a + b, 0) / hs.length }, o);
    if (def.access || SITE_TAGS.some((t) => def.tags.includes(t))) this.apron(def, x, z, ry);
  }

  /**
   * Paves a site's entrance out to the street it faces: from the lot's front edge, across any verge and
   * sidewalk, down through a curb cut to the edge of the carriageway (nothing when the lot already meets the sidewalk).
   */
  private apron(def: BuildingDef, x: number, z: number, ry: number) {
    const [ax, aw] = def.access ?? [0, 8];
    const [sx, sz] = Placer.world(x, z, ry, ax, def.d / 2);
    const fx = Math.sin(ry);
    const fz = Math.cos(ry);
    const ok = (h: RoadHit) => !h.road.def.link && h.road.kind !== 'interstate' && h.road.kind !== 'ramp' && h.road.kind !== 'alley';
    for (let d = 0; d <= 34; d += 0.25) {
      const hit = this.net.near(sx + fx * d, sz + fz * d).find((h) => ok(h) && Math.abs(h.lat) < h.road.full + 0.1);
      if (!hit) continue;
      const reach = this.reach(hit.road, sx, sz, fx, fz);
      if (!reach || reach.yard < 0.6) return;
      this.drives.add(sx + fx * reach.len * 0.5, sz + fz * reach.len * 0.5, aw + 1, reach.len + 1, ry, 0, false);
      this.addDrive({ x: sx, z: sz, fx, fz, t0: -0.5, len: reach.len, w: aw, road: hit.road, mat: 'asphalt', color: P.asphalt, ry });
      return;
    }
  }

  /**
   * Walks from (x, z) along (fx, fz) to road r: `len` is where the drive meets the curb line (or the edge of an
   * uncurbed road), `yard` where it reaches the back of the sidewalk.
   */
  private reach(r: Road, x: number, z: number, fx: number, fz: number) {
    const side = r.full - r.spec.hw;
    let yard = -1;
    for (let t = 0; t <= 60; t += 0.1) {
      const e = this.beyondCurb(r, x + fx * t, z + fz * t).e;
      if (yard < 0 && e <= side + 0.3) yard = t;
      if (e <= (r.spec.curb ? 0 : side)) return { len: t, yard: Math.max(0, yard) };
    }
    return null;
  }

  /** Distance of (x, z) beyond road r's curb line (or carriage edge), and the road surface height there. */
  private beyondCurb(r: Road, x: number, z: number) {
    let e = Infinity;
    let y = 0;
    const hit = this.net.near(x, z).find((h) => h.road === r);
    if (hit) {
      e = Math.abs(hit.lat) - r.spec.hw;
      y = hit.y;
    }
    const b = this.net.bulbOf(r);
    if (b) {
      const eb = Math.hypot(x - b.x, z - b.z) - b.R;
      if (eb < e) {
        e = eb;
        y = b.y;
      }
    }
    return { e, y };
  }

  /** Queues a drive and cuts the curb where it crosses (the drive itself is laid on the finished ground). */
  private addDrive(d: DriveSpec) {
    this.pendingDrives.push(d);
    if (d.road.spec.curb) {
      const t = d.len - 0.15;
      this.net.addCurbCut(d.x + d.fx * t, d.z + d.fz * t, d.w - 0.05, 0.8, Math.atan2(d.fx, d.fz));
    }
  }

  private build(def: BuildingDef, x: number, z: number, ry: number, seed: number, f: { lo: number; hi: number; avg: number }, o: PlaceOpts) {
    const k = this.k;
    const base = o.grade === false ? f.hi : this.gradeLot(def, x, z, ry, f);
    try {
      k.at(0, 0, 0, () => def.build(this.c, x, z, ry, seed), base);
    } catch (err) {
      // a broken catalog entry must not take the whole town down
      if (!Placer.failed.has(def.id)) console.warn(`[layout] ${def.id} failed to build`, err);
      Placer.failed.add(def.id);
      return;
    }
    this.placed++;
    this.sites.push({ def, x, z, ry });
    if (o.road && def.drive !== undefined && o.driveway !== false) this.driveway(def, x, z, ry, o);
  }

  /**
   * Levels the lot at the footprint's mean height (cut on the uphill side, fill below) with a flat margin round
   * the walls, then lets it blend back into the slope over a fall that stops short of the street and of other lots.
   */
  private gradeLot(def: BuildingDef, x: number, z: number, ry: number, f: { lo: number; hi: number; avg: number }) {
    const h = f.avg;
    const w = def.w + 2.4;
    const d = def.d + 2.4;
    const want = clamp(3 + 1.6 * (f.hi - f.lo), 3, 12);
    let fall = 0.4;
    for (const cand of [want, want * 0.7, want * 0.45, 2, 1.2]) {
      if (cand > want) continue;
      if (this.fallClear(x, z, w, d, ry, cand)) {
        fall = cand;
        break;
      }
    }
    addLotPad(x, z, w, d, ry, h, fall);
    this.lots.add(x, z, w, d, ry, 0, false);
    return h;
  }

  /** Would a lot's slope out to `fall` metres stay off older lots' floors (near streets it fades out by itself)? */
  private fallClear(x: number, z: number, w: number, d: number, ry: number, fall: number) {
    for (const k of [0.5, 1])
      for (let i = 0; i <= 4; i++)
        for (const [sx, sz] of [
          [-1, -1 + i / 2],
          [1, -1 + i / 2],
          [-1 + i / 2, -1],
          [-1 + i / 2, 1],
        ]) {
          const lx = sx * (w / 2 + (Math.abs(sx) === 1 ? fall * k : 0));
          const lz = sz * (d / 2 + (Math.abs(sz) === 1 ? fall * k : 0));
          const [px, pz] = Placer.world(x, z, ry, lx, lz);
          if (this.lots.blocked(px, pz, 0.3)) return false;
        }
    return true;
  }

  private driveway(def: BuildingDef, x: number, z: number, ry: number, o: PlaceOpts) {
    const r = o.road!;
    const [sx, sz] = Placer.world(x, z, ry, def.drive!, def.d / 2);
    const fx = Math.sin(ry);
    const fz = Math.cos(ry);
    const reach = this.reach(r, sx, sz, fx, fz);
    if (!reach || reach.len < 0.5 || reach.len > 40) return;
    const { len, yard } = reach;
    const [dcx, dcz] = Placer.world(x, z, ry, def.drive!, def.d / 2 + len / 2 - 0.75);
    this.drives.add(dcx, dcz, 3.6, len + 1.5, ry, 0, false);
    this.c.occ.add(dcx, dcz, 3.4, len + 1.5, ry, 0, false);
    const spec: DriveSpec = { x: sx, z: sz, fx, fz, t0: -1.5, len, w: 3.4, road: r, mat: 'concrete', color: P.concrete, ry };
    // the mailbox stands at the back of the sidewalk beside the drive, but not inside a junction's curb return
    if (o.mailbox !== false) {
      const color = this.rng.pick([0x2c2c2e, 0x8a8e92, 0x2c4a8c, 0xc8262c]);
      const [mx, mz] = Placer.world(x, z, ry, def.drive! + 2.4, def.d / 2 + Math.max(0, yard - 0.6));
      const hit = this.net.near(mx, mz).find((h) => h.road === r);
      if (!this.net.inJunction(r, mx, mz, hit?.y ?? 0)) spec.mailbox = { x: mx, z: mz, color };
    }
    // the parked car stays on the lot side of the sidewalk (no car at all on a very shallow front yard)
    if (this.rng.next() < (o.car ?? 0.6)) {
      const type: VehicleType = this.rng.pick(['pickup', 'pickup', 'sedan', 'wagon', 'suv', 'van', 'coupe', 'jeep'] as const);
      const L = VEHICLE_LENGTH[type];
      const at = Math.min(3.6, yard - 0.3 - L / 2);
      if (at >= L / 2 - 1.2) {
        const cry = this.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
        const color = this.rng.pick(CAR_COLORS);
        const opts: VehicleOpts = this.rng.chance(0.3) ? { accent: 0xf2f1ec } : {};
        spec.car = { type, at, ry: cry, color, opts };
      }
    }
    this.addDrive(spec);
  }

  /** Lays every queued drive on the finished ground mesh, with its mailbox and parked car. Call after createTerrain. */
  finish(k: Kit) {
    for (const d of this.pendingDrives) this.layDrive(k, d);
    this.pendingDrives = [];
  }

  /**
   * A drive as a fine grid of quads that follows the drawn ground; over the planting strip and sidewalk it sits at
   * sidewalk level, ramps down through the curb cut and stops at the curb line (or the edge of an uncurbed road).
   */
  private layDrive(k: Kit, d: DriveSpec) {
    const r = d.road;
    const side = r.full - r.spec.hw;
    const curb = r.spec.curb;
    const px = d.fz;
    const pz = -d.fx;
    const height = (x: number, z: number) => {
      const { e, y } = this.beyondCurb(r, x, z);
      const g = groundHeight(x, z) + 0.05;
      if (curb) {
        if (e <= 0.25) return y + lerp(0.045, 0.17, clamp(e / 0.25, 0, 1));
        if (e <= side) return y + 0.17;
        return e < side + 1.2 ? lerp(y + 0.17, g, (e - side) / 1.2) : g;
      }
      if (e <= side) return y + 0.045;
      return e < side + 1.5 ? lerp(y + 0.045, g, (e - side) / 1.5) : g;
    };
    // rows every 0.6 m, plus one at each change of profile (back of sidewalk, curb) so the ramps stay crisp
    const ts = new Set<number>();
    for (let t = d.t0; t < d.len; t += 0.6) ts.add(+t.toFixed(3));
    ts.add(d.len);
    let prevE = Infinity;
    for (let t = 0; t <= d.len; t += 0.05) {
      const e = this.beyondCurb(r, d.x + d.fx * t, d.z + d.fz * t).e;
      for (const edge of curb ? [side + 1.2, side, 0.25] : [side + 1.5])
        if (prevE > edge && e <= edge) ts.add(+t.toFixed(3));
      prevE = e;
    }
    const rows = [...ts].sort((a, b) => a - b);
    const cols = Math.max(3, Math.ceil(d.w / 0.85));
    const grid: number[][][] = rows.map((t) =>
      Array.from({ length: cols + 1 }, (_, c) => {
        const u = -d.w / 2 + (d.w * c) / cols;
        const x = d.x + d.fx * t + px * u;
        const z = d.z + d.fz * t + pz * u;
        return [x, height(x, z), z];
      }),
    );
    const pos: number[] = [];
    const uv: number[] = [];
    const tri = (a: number[], b: number[], c: number[]) => {
      // wound to face up
      const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      for (const q of ny >= 0 ? [a, b, c] : [a, c, b]) {
        pos.push(q[0], q[1], q[2]);
        uv.push(q[0], q[2]);
      }
    };
    for (let i = 0; i < rows.length - 1; i++)
      for (let c = 0; c < cols; c++) {
        const a = grid[i][c];
        const b = grid[i][c + 1];
        const e = grid[i + 1][c];
        const f = grid[i + 1][c + 1];
        tri(a, e, b);
        tri(b, e, f);
      }
    const top = new THREE.BufferGeometry();
    top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    top.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    top.computeVertexNormals();
    k.add(top, d.color, `${d.mat}@decal`, undefined, false);
    // low side skirts wherever the drive stands proud of the ground (ramps up to the sidewalk)
    const skirt: number[] = [];
    for (const c of [0, cols])
      for (let i = 0; i < rows.length - 1; i++) {
        const a = grid[i][c];
        const b = grid[i + 1][c];
        const ga = groundHeight(a[0], a[2]) - 0.15;
        const gb = groundHeight(b[0], b[2]) - 0.15;
        if (a[1] - ga < 0.25 && b[1] - gb < 0.25) continue;
        // wound to face outward on both sides
        if (c === 0) skirt.push(a[0], a[1], a[2], a[0], ga, a[2], b[0], b[1], b[2], b[0], b[1], b[2], a[0], ga, a[2], b[0], gb, b[2]);
        else skirt.push(a[0], a[1], a[2], b[0], b[1], b[2], a[0], ga, a[2], b[0], b[1], b[2], b[0], gb, b[2], a[0], ga, a[2]);
      }
    if (skirt.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(skirt, 3));
      k.add(g, d.color, 'concrete', undefined, false);
    }
    if (d.mailbox) {
      const m = d.mailbox;
      k.at(m.x, m.z, d.ry, () => pr.ruralMailbox(k, 0, 0, -Math.PI / 2, m.color), groundHeight(m.x, m.z));
    }
    if (d.car) {
      const c = d.car;
      const L = VEHICLE_LENGTH[c.type];
      const at = (t: number) => height(d.x + d.fx * t, d.z + d.fz * t);
      const y0 = at(c.at - L / 2);
      const y1 = at(c.at + L / 2);
      // sits on the drive, pitched with its slope
      const m = new THREE.Matrix4()
        .makeTranslation(d.x + d.fx * c.at, (y0 + y1) / 2 - 0.02, d.z + d.fz * c.at)
        .multiply(new THREE.Matrix4().makeRotationY(d.ry))
        .multiply(new THREE.Matrix4().makeRotationX(-Math.atan2(y1 - y0, L)));
      k.atMatrix(m, () => {
        k.solid(0, 0, 2.1, L);
        vehicle(k, this.c.signs, c.type, 0, 0, c.ry, c.color, c.opts);
      });
    }
  }

  /** Packs buildings along one side of a road between arc lengths s0..s1. */
  along(r: Road, side: 1 | -1, s0: number, s1: number, pick: (rng: Rng) => BuildingDef | null, o: PlaceOpts & { setback?: number; gap?: number; jitter?: number } = {}) {
    let s = s0;
    let n = 0;
    let guard = 0;
    let def = pick(this.rng);
    while (def && s < s1 && guard++ < 400) {
      const setback = (o.setback ?? 6) + (o.jitter ? this.rng.range(-o.jitter, o.jitter) : 0);
      const mid = s + def.w / 2;
      if (mid > s1) break;
      const f = this.net.frontage(r, mid, side, r.full + setback + def.d / 2);
      if (this.put(def, f.x, f.z, f.ry, (this.rng.next() * 1e6) | 0, { ...o, road: r })) {
        n++;
        s += def.w + (o.gap ?? 4) + (o.jitter ? this.rng.range(0, o.jitter * 1.5) : 0);
        def = pick(this.rng);
      } else s += 3;
    }
    return n;
  }

  /** Houses around a cul-de-sac bulb. */
  bulb(r: Road, pick: (rng: Rng) => BuildingDef | null, count = 5, o: PlaceOpts = {}) {
    const e = r.pts[r.pts.length - 1];
    const cx = e.x + e.tx * 6;
    const cz = e.z + e.tz * 6;
    const R = r.spec.hw + 8.6 + r.spec.park + r.spec.walk + 7;
    const back = Math.atan2(-e.tz, -e.tx);
    for (let i = 0; i < count; i++) {
      const def = pick(this.rng);
      if (!def) continue;
      const a = back + Math.PI * (0.42 + (1.16 * (i + 0.5)) / count) * 1.0 + Math.PI * 0.0;
      const dist = R + def.d / 2;
      const x = cx + Math.cos(a) * dist;
      const z = cz + Math.sin(a) * dist;
      // face the bulb centre: direction (cx - x, cz - z) = (sin ry, cos ry)
      const ry = Math.atan2(cx - x, cz - z);
      this.put(def, x, z, ry, (this.rng.next() * 1e6) | 0, { ...o, road: r });
    }
  }

  /** Parked vehicle with collision (world coords). */
  car(type: VehicleType, x: number, z: number, ry: number, color: number, o: VehicleOpts = {}, y?: number) {
    const k = this.k;
    k.at(
      0,
      0,
      0,
      () => {
        k.solid(x, z, VEHICLE_LENGTH[type] - 0.2, 2.0, ry);
        vehicle(k, this.c.signs, type, x, z, ry, color, o);
      },
      y ?? heightAt(x, z),
    );
  }
}

// ------------------------------------------------------------------ street furniture along roads

/** Wallace-style triple-globe cast-iron lamp post. */
export function globeLamp(k: Kit, x: number, z: number, y: number) {
  k.at(
    x,
    z,
    0,
    () => {
      k.solid(0, 0, 0.5, 0.5);
      k.cyl(0, 0, 0, 0.22, 0.28, 0.7, 8, 0x1b1f1c, 'metal');
      k.cyl(0, 0.7, 0, 0.08, 0.1, 3.2, 8, 0x1b1f1c, 'metal');
      for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
        const ox = Math.cos(a) * 0.42;
        const oz = Math.sin(a) * 0.42;
        k.beam({ x: 0, y: 3.7, z: 0 }, { x: ox, y: 3.95, z: oz }, 0.06, 0.06, 0x1b1f1c, 'metal');
        k.sphere(ox, 4.2, oz, 0.26, 0xf3efe6, 'gloss', 10, 8);
      }
      k.sphere(0, 4.45, 0, 0.27, 0xf3efe6, 'gloss', 10, 8);
      k.lamp(0, 4.25, 0, 0xffd9a0, 1.6);
      // hanging flower basket (Wallace's signature)
      k.ico(0.42, 3.3, 0, 0.32, 0, 0xc8364a, 'paint', 1, 0.8, 1);
      k.ico(0.42, 3.15, 0, 0.3, 0, 0x4c7a32, 'paint', 1, 0.6, 1);
    },
    y,
  );
}

export function furnishRoads(pl: Placer) {
  const { k, net, c } = pl;
  const rng = new Rng(4545);
  for (const r of net.roads) {
    const sp = r.spec;
    // utility poles + wires (one side) on rural/arterial/residential roads
    if (['arterial', 'rural', 'residential', 'gravel', 'strip'].includes(r.kind) && r.length > 60) {
      const side: 1 | -1 = r.id % 2 ? 1 : -1;
      const off = r.full + 1.4;
      const pts: THREE.Vector3[][] = [];
      for (let s = 15; s < r.length - 10; s += r.kind === 'gravel' ? 48 : 40) {
        const f = net.frontage(r, s, side, off);
        if (f.p.elevated || c.occ.blocked(f.x, f.z, 0.6) || isWater(f.x, f.z)) {
          if (pts.length) pr.connectPoles(k, pts.splice(0));
          continue;
        }
        let att: THREE.Vector3[] = [];
        const y = heightAt(f.x, f.z);
        k.at(f.x, f.z, f.ry + Math.PI / 2, () => (att = pr.utilityPole(k, 0, 0, 0, { transformer: rng.chance(0.15), lamp: r.kind === 'residential' && rng.chance(0.5) })), y);
        c.occ.add(f.x, f.z, 0.6, 0.6, 0, 0.4, false);
        pts.push(att);
      }
      pr.connectPoles(k, pts);
    }
    // street lights
    if (r.kind === 'downtown') {
      for (let s = 8; s < r.length - 6; s += 18)
        for (const side of [1, -1] as const) {
          const f = net.frontage(r, s + (side > 0 ? 0 : 9), side, sp.hw + 0.9);
          if (net.inJunction(r, f.x, f.z, f.y)) continue;
          globeLamp(k, f.x, f.z, f.y + 0.16);
        }
    } else if (r.kind === 'strip' || r.kind === 'arterial' || r.kind === 'suburban' || r.kind === 'ramp') {
      const step = r.kind === 'suburban' ? 62 : r.kind === 'ramp' ? 55 : 48;
      for (let s = 20; s < r.length - 15; s += step) {
        const side: 1 | -1 = (Math.floor(s / step) % 2 ? 1 : -1) as 1 | -1;
        const f = net.frontage(r, s, side, sp.hw + (sp.curb ? 0.9 : (sp.shoulder?.w ?? 0) + 0.8));
        if (f.p.elevated || isWater(f.x, f.z) || net.inJunction(r, f.x, f.z, f.y) || pl.drives.blocked(f.x, f.z, 1.2)) continue;
        k.at(0, 0, 0, () => pr.streetLight(k, f.x, f.z, f.ry, 8), f.y + (sp.curb ? 0.16 : 0));
      }
    }
    // stop signs at T junctions onto bigger roads
    for (const end of [0, 1] as const) {
      const on = end ? r.endOn : r.startOn;
      if (!on || r.def.link || on.road.spec.rank <= sp.rank || r.kind === 'alley') continue;
      const ep = end ? r.pts[r.pts.length - 1] : r.pts[0];
      // behind the crosswalk line, and behind the curb return where there is one
      const back = Math.max(on.road.full + 1.2, on.road.spec.hw + net.returnLength(r, ep.x, ep.z) + 1.0);
      const s0 = end ? r.length - back : back;
      const p = r.at(s0);
      const dir = end ? 1 : -1;
      // right side of the approaching driver
      const rx = -p.tz * dir;
      const rz = p.tx * dir;
      const off = sp.hw + (sp.curb ? 0.9 : 1.2);
      const x = p.x + rx * off;
      const z = p.z + rz * off;
      const ry = Math.atan2(-p.tx * dir, -p.tz * dir);
      if (!isWater(x, z)) k.at(0, 0, 0, () => pr.postSign(k, c.signs, 'stop', x, z, ry, { w: 0.75, h: 0.75 }), heightAt(x, z) + (sp.curb ? 0.16 : 0));
    }
    // hydrants on curbed streets
    if (sp.curb && r.kind !== 'alley')
      for (let s = 30; s < r.length - 20; s += 95) {
        const f = net.frontage(r, s, -1, sp.hw + 0.7);
        if (net.inJunction(r, f.x, f.z, f.y) || pl.drives.blocked(f.x, f.z, 1.2)) continue;
        k.at(0, 0, 0, () => pr.hydrant(k, f.x, f.z), f.y + 0.16);
      }
    // parallel-parked cars downtown and along older streets
    if (sp.parking || r.kind === 'residential') {
      const lat = sp.parking ? sp.hw - 1.3 : sp.hw - 1.1;
      const prob = sp.parking ? 0.62 : 0.12;
      for (let s = 10; s < r.length - 10; s += 6.6) {
        for (const side of [1, -1] as const) {
          if (!rng.chance(prob)) continue;
          const f = net.frontage(r, s, side, lat);
          // keep junction mouths, curb returns and driveways clear
          if (net.near(f.x, f.z).some((h) => h.road !== r && !r.chained.has(h.road) && Math.abs(h.lat) < h.road.spec.hw + 6)) continue;
          if (net.inJunction(r, f.x, f.z, f.y) || pl.drives.blocked(f.x, f.z, 3.2)) continue;
          const t: VehicleType = rng.pick(['sedan', 'sedan', 'pickup', 'wagon', 'coupe', 'suv', 'van', 'pickup'] as const);
          // parked with the flow of traffic on that side
          const heading = Math.atan2(-f.p.tz, f.p.tx) + (side > 0 ? Math.PI : 0);
          const ry = heading;
          pl.car(t, f.x, f.z, ry, rng.pick(CAR_COLORS), t === 'pickup' && rng.chance(0.4) ? { accent: 0xf2f1ec } : t === 'coupe' ? { stripes: rng.chance(0.5) } : {}, f.y + 0.04);
        }
      }
    }
    // street trees in the park strip of old residential streets
    if (sp.park > 0 && r.kind === 'residential')
      for (let s = 12; s < r.length - 10; s += 16)
        for (const side of [1, -1] as const) {
          if (!rng.chance(0.55)) continue;
          const f = net.frontage(r, s + rng.range(-3, 3), side, sp.hw + 0.25 + sp.park / 2);
          if (net.near(f.x, f.z).some((h) => h.road !== r && Math.abs(h.lat) < h.road.full + 2)) continue;
          if (net.inJunction(r, f.x, f.z, f.y) || pl.drives.blocked(f.x, f.z, 1.5)) continue;
          pl.trees.push({ kind: rng.chance(0.75) ? 'oak' : 'fir', x: f.x, z: f.z, s: rng.range(0.55, 0.85) });
        }
  }
}

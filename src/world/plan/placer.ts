import * as THREE from 'three';
import type { Ctx } from '../buildings/common';
import type { Kit } from '../core/kit';
import type { BuildingDef } from '../buildings/catalog';
import type { RoadNetwork, Road } from '../roads/network';
import { heightAt, isWater, river } from '../terrain';
import { Rng } from '../core/rng';
import * as pr from '../props';
import { vehicle, VEHICLE_LENGTH, type VehicleType, type VehicleOpts } from '../vehicles';
import type { PlacedTree, VegetationInput } from '../vegetation';
import { CAR_COLORS, P } from '../palette';

export interface PlaceOpts {
  /** Max height difference across the footprint (houses get a foundation; commercial wants ~1 m). */
  maxSlope?: number;
  foundation?: boolean;
  road?: Road;
  /** Draw a driveway to the road when the def has `drive`. */
  driveway?: boolean;
  mailbox?: boolean;
  car?: number;
}

/** Shared placement state for the zone builders. */
export class Placer {
  readonly trees: PlacedTree[] = [];
  readonly cornFields: VegetationInput['cornFields'] = [];
  readonly grassPatches: VegetationInput['grassPatches'] = [];
  readonly clearings: { x: number; z: number; w: number; d: number }[] = [];
  readonly animated: { obj: THREE.Object3D; update: (dt: number, t: number) => void }[] = [];
  /** Named places for the town map (job sites, civic buildings, parks). */
  readonly landmarks: { name: string; x: number; z: number; kind: string }[] = [];
  readonly rng: Rng;
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
    for (const [px, pz] of pts) {
      const h = heightAt(px, pz);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      if (hi - lo > maxSlope) return null;
    }
    return { lo, hi };
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

  /** Places without the free test (for hand-placed landmarks); still levels/foundations the ground. */
  force(def: BuildingDef, x: number, z: number, ry: number, seed: number, o: PlaceOpts = {}) {
    const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => Placer.world(x, z, ry, (sx * def.w) / 2, (sz * def.d) / 2)));
    const hs = [...corners.map(([px, pz]) => heightAt(px, pz)), heightAt(x, z)];
    this.build(def, x, z, ry, seed, { lo: Math.min(...hs), hi: Math.max(...hs) }, o);
  }

  private build(def: BuildingDef, x: number, z: number, ry: number, seed: number, f: { lo: number; hi: number }, o: PlaceOpts) {
    const k = this.k;
    const base = f.hi - f.lo > 0.35 ? f.hi + 0.05 : f.hi;
    try {
      k.at(0, 0, 0, () => def.build(this.c, x, z, ry, seed), base);
    } catch (err) {
      // a broken catalog entry must not take the whole town down
      if (!Placer.failed.has(def.id)) console.warn(`[layout] ${def.id} failed to build`, err);
      Placer.failed.add(def.id);
      return;
    }
    this.placed++;
    if (f.hi - f.lo > 0.35 && o.foundation !== false) {
      const front = def.front ?? def.d / 2 - 1;
      k.at(
        x,
        z,
        ry,
        () => {
          const h = base - f.lo + 0.4;
          k.box(0, -h, -0.5, def.w - 1.2, h, Math.min(def.d - 1.2, front * 2 + 1), 0x8b8780, 'stone');
        },
        base,
      );
    }
    if (o.road && def.drive !== undefined && o.driveway !== false) this.driveway(def, x, z, ry, base, o);
  }

  private driveway(def: BuildingDef, x: number, z: number, ry: number, base: number, o: PlaceOpts) {
    const k = this.k;
    const r = o.road!;
    const [sx, sz] = Placer.world(x, z, ry, def.drive!, def.d / 2);
    const hit = this.net.near(sx, sz).find((h) => h.road === r);
    if (!hit) return;
    const len = Math.abs(hit.lat) - r.spec.hw + 0.3;
    if (len < 0.5 || len > 40) return;
    const roadY = hit.y + 0.04;
    k.at(
      x,
      z,
      ry,
      () => {
        k.beam({ x: def.drive!, y: 0.04, z: def.d / 2 - 1.5 }, { x: def.drive!, y: roadY - base + 0.02, z: def.d / 2 + len }, 3.4, 0.08, P.concrete, 'concrete', false);
        if (o.mailbox !== false) pr.ruralMailbox(k, def.drive! + 2.4, def.d / 2 + len - (r.spec.curb ? r.spec.park + r.spec.walk + 0.6 : 1.2), -Math.PI / 2, this.rng.pick([0x2c2c2e, 0x8a8e92, 0x2c4a8c, 0xc8262c]));
        if (this.rng.next() < (o.car ?? 0.6)) {
          const t: VehicleType = this.rng.pick(['pickup', 'pickup', 'sedan', 'wagon', 'suv', 'van', 'coupe', 'jeep'] as const);
          k.solid(def.drive!, def.d / 2 + 3.6, 2.1, VEHICLE_LENGTH[t]);
          vehicle(k, this.c.signs, t, def.drive!, def.d / 2 + 3.6, this.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2, this.rng.pick(CAR_COLORS), this.rng.chance(0.3) ? { accent: 0xf2f1ec } : {});
        }
      },
      base,
    );
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
          if (net.near(f.x, f.z).some((h) => h.road !== r && !r.chained.has(h.road) && Math.abs(h.lat) < h.road.spec.hw + 1.5)) continue;
          globeLamp(k, f.x, f.z, f.y + 0.16);
        }
    } else if (r.kind === 'strip' || r.kind === 'arterial' || r.kind === 'suburban' || r.kind === 'ramp') {
      const step = r.kind === 'suburban' ? 62 : r.kind === 'ramp' ? 55 : 48;
      for (let s = 20; s < r.length - 15; s += step) {
        const side: 1 | -1 = (Math.floor(s / step) % 2 ? 1 : -1) as 1 | -1;
        const f = net.frontage(r, s, side, sp.hw + (sp.curb ? 0.9 : (sp.shoulder?.w ?? 0) + 0.8));
        if (f.p.elevated || isWater(f.x, f.z)) continue;
        k.at(0, 0, 0, () => pr.streetLight(k, f.x, f.z, f.ry, 8), f.y + (sp.curb ? 0.16 : 0));
      }
    }
    // stop signs at T junctions onto bigger roads
    for (const end of [0, 1] as const) {
      const on = end ? r.endOn : r.startOn;
      if (!on || r.def.link || on.road.spec.rank <= sp.rank || r.kind === 'alley') continue;
      const back = on.road.full + 1.2;
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
          // keep junction mouths clear
          if (net.near(f.x, f.z).some((h) => h.road !== r && !r.chained.has(h.road) && Math.abs(h.lat) < h.road.spec.hw + 6)) continue;
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
          pl.trees.push({ kind: rng.chance(0.75) ? 'oak' : 'fir', x: f.x, z: f.z, s: rng.range(0.55, 0.85) });
        }
  }
}

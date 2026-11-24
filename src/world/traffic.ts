import * as THREE from 'three';
import { Batcher, Kit } from './core/kit';
import { Rng, clamp } from './core/rng';
import { vehicle, VEHICLE_LENGTH, type VehicleType } from './vehicles';
import type { MaterialLib } from './materials';
import type { SignBook } from './signs';
import type { RoadNetwork } from './roads/network';
import { CAR_COLORS } from './palette';

interface RoutePt {
  x: number;
  z: number;
  y: number;
  speed: number;
}

class Route {
  readonly cum: number[] = [0];
  readonly len: number;
  constructor(readonly pts: RoutePt[]) {
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    this.len = this.cum[this.cum.length - 1];
  }
  /** Position, heading and speed limit at arc length s (binary search). */
  sample(s: number, out: { x: number; z: number; y: number; h: number; speed: number }) {
    s = clamp(s, 0, this.len);
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.cum[m] <= s) lo = m;
      else hi = m;
    }
    const a = this.pts[lo];
    const b = this.pts[hi];
    const t = (s - this.cum[lo]) / Math.max(1e-6, this.cum[hi] - this.cum[lo]);
    out.x = a.x + (b.x - a.x) * t;
    out.z = a.z + (b.z - a.z) * t;
    out.y = a.y + (b.y - a.y) * t;
    out.h = Math.atan2(-(b.z - a.z), b.x - a.x);
    out.speed = a.speed + (b.speed - a.speed) * t;
    return out;
  }
}

interface Car {
  obj: THREE.Group;
  route: Route;
  s: number;
  v: number;
  len: number;
  x: number;
  z: number;
  h: number;
}

/** Spline-following traffic on Highway 10, which is Main Street through town. */
export class Traffic {
  readonly group = new THREE.Group();
  private cars: Car[] = [];
  private routes: Route[] = [];
  enabled = true;

  constructor(mats: MaterialLib, signs: SignBook, net: RoadNetwork, seed = 5) {
    this.group.name = 'traffic';
    const rng = new Rng(seed);
    const mk = (names: string[], offset: number, reverse: boolean) => {
      const pts: RoutePt[] = [];
      const list = reverse ? [...names].reverse() : names;
      for (const n of list) {
        const r = net.byName(n);
        const lane = net.lane(r, offset, reverse);
        for (const p of lane) pts.push({ ...p, speed: r.spec.speed });
      }
      return new Route(pts);
    };
    const town = ['Old Hwy 10 W', 'Main St', 'Old Hwy 10 E'];
    this.routes = [mk(town, 1.95, false), mk(town, 1.95, true)];
    const counts = [9, 9];
    const types: VehicleType[] = ['sedan', 'pickup', 'van', 'wagon', 'coupe', 'suv', 'pickup', 'semi', 'sedan', 'sheriff', 'delivery', 'police', 'pickup', 'sedan'];
    this.routes.forEach((route, ri) => {
      for (let i = 0; i < counts[ri]; i++) {
        const b = new Batcher(1, false);
        const k = new Kit(b, mats);
        let type = rng.pick(types);
        if (type === 'semi' && rng.chance(0.6)) type = 'pickup';
        vehicle(k, signs, type, 0, 0, 0, rng.pick(CAR_COLORS), { accent: rng.chance(0.3) ? 0xf2f1ec : undefined, trailer: type === 'semi', stripes: rng.chance(0.5) });
        const g = new THREE.Group();
        g.name = `car-${type}`;
        b.build((key) => mats.get(key), g);
        const s = ((i + rng.range(0.1, 0.6)) / counts[ri]) * route.len;
        this.cars.push({ obj: g, route, s, v: 0, len: type === 'semi' ? 21 : VEHICLE_LENGTH[type], x: 0, z: 0, h: 0 });
        this.group.add(g);
      }
    });
    this.update(0);
  }

  /** Oriented footprints for the player's collision test. */
  obstacles(): { x: number; z: number; c: number; s: number; hl: number }[] {
    return this.cars.map((c) => {
      const back = c.len > 15 ? (c.len - 7.5) / 2 : 0;
      return { x: c.x - Math.cos(c.h) * back, z: c.z + Math.sin(c.h) * back, c: Math.cos(c.h), s: Math.sin(c.h), hl: c.len / 2 };
    });
  }

  private tmp = { x: 0, z: 0, y: 0, h: 0, speed: 0 };

  update(dt: number, camera?: THREE.Vector3, player?: { x: number; z: number } | null) {
    for (const c of this.cars) {
      if (this.enabled && dt > 0) {
        const p = c.route.sample(c.s, this.tmp);
        let target = p.speed;
        let gap = Infinity;
        for (const o of this.cars) {
          if (o === c || o.route !== c.route) continue;
          let d = o.s - c.s;
          if (d < 0) d += c.route.len;
          gap = Math.min(gap, d - o.len);
        }
        if (player) {
          const dx = player.x - c.x;
          const dz = player.z - c.z;
          const ahead = dx * Math.cos(c.h) - dz * Math.sin(c.h);
          const side = Math.abs(dx * Math.sin(c.h) + dz * Math.cos(c.h));
          if (ahead > 0 && ahead < gap && side < 2.4) gap = ahead - 3.5;
        }
        if (gap < 45) target = Math.min(target, Math.max(0, (gap - 7) * 0.8));
        c.v += clamp(target - c.v, -9 * dt, 3.2 * dt);
        c.s += c.v * dt;
        if (c.s > c.route.len) c.s -= c.route.len;
      }
      const p = c.route.sample(c.s, this.tmp);
      c.x = p.x;
      c.z = p.z;
      c.h = p.h;
      c.obj.position.set(p.x, p.y, p.z);
      c.obj.rotation.y = p.h;
      if (camera) c.obj.visible = Math.hypot(p.x - camera.x, p.z - camera.z) < 1100;
    }
  }
}

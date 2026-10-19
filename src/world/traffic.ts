import * as THREE from 'three';
import { Batcher, Kit } from './core/kit';
import { Rng, smoothstep, clamp } from './core/rng';
import { vehicle, VEHICLE_LENGTH, type VehicleType } from './vehicles';
import type { MaterialLib } from './materials';
import type { SignBook } from './signs';
import { CAR_COLORS } from './palette';

interface Car {
  obj: THREE.Group;
  x: number;
  v: number;
  dir: 1 | -1;
  len: number;
}

const LIMIT = 2300;
const LANE = 1.95;

/** Looping traffic along Main Street / US-20 with simple car-following; yields to the player's car. */
export class Traffic {
  readonly group = new THREE.Group();
  private cars: Car[] = [];
  enabled = true;

  constructor(mats: MaterialLib, signs: SignBook, perDirection = 7, seed = 5) {
    this.group.name = 'traffic';
    const rng = new Rng(seed);
    const types: VehicleType[] = ['sedan', 'pickup', 'van', 'wagon', 'coupe', 'suv', 'pickup', 'semi', 'sedan', 'sheriff', 'delivery', 'police'];
    for (const dir of [1, -1] as const)
      for (let i = 0; i < perDirection; i++) {
        const b = new Batcher(1, false);
        const k = new Kit(b, mats);
        const type = rng.pick(types);
        vehicle(k, signs, type, 0, 0, 0, rng.pick(CAR_COLORS), { accent: rng.chance(0.3) ? 0xf2f1ec : undefined, trailer: type === 'semi', stripes: rng.chance(0.5) });
        const g = new THREE.Group();
        g.name = `car-${type}`;
        b.build((key) => mats.get(key), g);
        g.rotation.y = dir > 0 ? 0 : Math.PI;
        const x = -LIMIT + ((i + (dir > 0 ? 0.15 : 0.62)) / perDirection) * LIMIT * 2;
        this.cars.push({ obj: g, x, v: 0, dir, len: type === 'semi' ? 21 : VEHICLE_LENGTH[type] });
        this.group.add(g);
      }
    this.update(0);
  }

  private speedAt(x: number) {
    return 11 + 12 * smoothstep(320, 520, Math.abs(x));
  }

  /** Axis-aligned footprints for the player's collision test. */
  obstacles(): { x: number; z: number; hl: number }[] {
    return this.cars.map((c) => ({ x: c.x - (c.dir * c.len) / 2 + c.dir * 2.6, z: c.dir * LANE, hl: c.len / 2 }));
  }

  update(dt: number, player?: { x: number; z: number } | null) {
    for (const c of this.cars) {
      if (!this.enabled) {
        c.obj.position.set(c.x, 0, c.dir * LANE);
        continue;
      }
      let target = this.speedAt(c.x);
      const front = c.x + c.dir * 2.6;
      let gap = Infinity;
      for (const o of this.cars) {
        if (o === c || o.dir !== c.dir) continue;
        let d = (o.x - c.x) * c.dir;
        if (d < 0) d += LIMIT * 2;
        gap = Math.min(gap, d - o.len);
      }
      if (player && Math.abs(player.z - c.dir * LANE) < 2.4) {
        const d = (player.x - front) * c.dir;
        if (d > -1 && d < gap) gap = d - 3;
      }
      if (gap < 40) target = Math.min(target, Math.max(0, (gap - 6) * 0.9));
      c.v += clamp(target - c.v, -9 * dt, 3.5 * dt);
      c.x += c.dir * c.v * dt;
      if (c.x > LIMIT) c.x -= LIMIT * 2;
      if (c.x < -LIMIT) c.x += LIMIT * 2;
      c.obj.position.set(c.x, 0, c.dir * LANE);
    }
  }
}

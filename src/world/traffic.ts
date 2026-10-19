import * as THREE from 'three';
import { Batcher, Kit } from './core/kit';
import { Rng, smoothstep } from './core/rng';
import { vehicle, type VehicleType } from './vehicles';
import type { MaterialLib } from './materials';
import type { SignBook } from './signs';
import { CAR_COLORS } from './palette';

interface Car {
  obj: THREE.Group;
  x: number;
  dir: 1 | -1;
}

const LIMIT = 2300;

/** Simple looping traffic along Main Street / US-20. Same speed field per lane, so cars never overlap. */
export class Traffic {
  readonly group = new THREE.Group();
  private cars: Car[] = [];
  enabled = true;

  constructor(mats: MaterialLib, signs: SignBook, perDirection = 6, seed = 5) {
    this.group.name = 'traffic';
    const rng = new Rng(seed);
    const types: VehicleType[] = ['sedan', 'pickup', 'van', 'wagon', 'coupe', 'suv', 'pickup', 'semi', 'sedan', 'sheriff'];
    for (const dir of [1, -1] as const)
      for (let i = 0; i < perDirection; i++) {
        const b = new Batcher(1, false);
        const k = new Kit(b, (t) => mats.signKey(t));
        const type = rng.pick(types);
        vehicle(k, signs, type, 0, 0, 0, rng.pick(CAR_COLORS), { accent: rng.chance(0.3) ? 0xf2f1ec : undefined, trailer: type === 'semi', stripes: rng.chance(0.5) });
        const g = new THREE.Group();
        g.name = `car-${type}`;
        b.build((key) => mats.get(key), g);
        g.rotation.y = dir > 0 ? 0 : Math.PI;
        // stagger so one car is near town at load
        const x = -LIMIT + ((i + (dir > 0 ? 0.15 : 0.62)) / perDirection) * LIMIT * 2;
        this.cars.push({ obj: g, x, dir });
        this.group.add(g);
      }
    this.update(0);
  }

  private speedAt(x: number) {
    return 11 + 12 * smoothstep(320, 520, Math.abs(x));
  }

  update(dt: number) {
    for (const c of this.cars) {
      if (this.enabled) {
        c.x += c.dir * this.speedAt(c.x) * dt;
        if (c.x > LIMIT) c.x -= LIMIT * 2;
        if (c.x < -LIMIT) c.x += LIMIT * 2;
      }
      c.obj.position.set(c.x, 0, c.dir > 0 ? 1.95 : -1.95);
    }
  }
}

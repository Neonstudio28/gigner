import * as THREE from 'three';
import { Batcher, Kit } from './core/kit';
import type { MaterialLib } from './materials';
import type { PersonOpts } from './people';

/**
 * A jointed version of the town's blocky figures: the same proportions as `person()`, but with legs and arms
 * that swing from the hip and shoulder so it can walk. Origin at the feet, facing +Z.
 */
export class Figure {
  readonly group = new THREE.Group();
  private body = new THREE.Group();
  private legs: THREE.Group[] = [];
  private arms: THREE.Group[] = [];
  private phase = Math.random() * 6;
  private swing = 0;

  constructor(mats: MaterialLib, o: PersonOpts) {
    const part = (x: number, y: number, z: number, build: (k: Kit) => void) => {
      const b = new Batcher(1, false);
      build(new Kit(b, mats));
      const g = new THREE.Group();
      b.build((key) => mats.get(key), g);
      g.traverse((m) => ((m as THREE.Mesh).castShadow = true));
      g.position.set(x, y, z);
      this.body.add(g);
      return g;
    };
    const HIP = 0.87;
    const SHOULDER = 1.48;
    for (const s of [-1, 1]) {
      this.legs.push(
        part(s * 0.108, HIP, 0, (k) => {
          k.box(0, -HIP, 0.03, 0.17, 0.09, 0.3, 0x1f1b18);
          k.box(0, -HIP + 0.09, 0, 0.18, 0.78, 0.21, o.skirt ? o.skin : o.pants);
        }),
      );
      this.arms.push(
        part(s * 0.32, SHOULDER, 0, (k) => {
          k.box(0, -0.6, 0, 0.13, 0.62, 0.15, o.shirt);
          k.box(0, -0.72, 0, 0.11, 0.13, 0.13, o.skin);
        }),
      );
    }
    part(0, 0, 0, (k) => {
      if (o.skirt) k.box(0, 0.5, 0, 0.46, 0.42, 0.3, o.pants);
      k.box(0, 0.86, 0, 0.5, 0.64, 0.28, o.shirt);
      k.box(0, 0.86, 0, 0.51, 0.06, 0.29, 0x2a221c);
      if (o.vest !== undefined) k.box(0, 0.98, 0, 0.52, 0.5, 0.3, o.vest);
      if (o.badge) k.box(0.13, 1.28, 0.145, 0.07, 0.08, 0.02, 0xd8b44a, 'metal');
      k.box(0, 1.5, 0, 0.27, 0.3, 0.27, o.skin);
      k.box(0, 1.78, -0.01, 0.29, 0.09, 0.29, o.hair);
      k.box(0, 1.55, -0.12, 0.29, 0.24, 0.06, o.hair);
      for (const s of [-1, 1]) k.box(s * 0.06, 1.63, 0.136, 0.04, 0.04, 0.01, 0x1a1a1a, 'paint', { cast: false });
      if (o.hat === 'cowboy') {
        k.box(0, 1.8, 0, 0.58, 0.03, 0.58, 0x6b4a2e);
        k.box(0, 1.83, 0, 0.31, 0.17, 0.31, 0x6b4a2e);
      } else if (o.hat === 'cap') {
        k.box(0, 1.78, 0, 0.3, 0.12, 0.3, o.shirt);
        k.box(0, 1.79, 0.2, 0.28, 0.03, 0.16, o.shirt);
      } else if (o.hat === 'deputy') {
        k.box(0, 1.8, 0, 0.56, 0.03, 0.56, 0x5d4a32);
        k.cone(0, 1.83, 0, 0.18, 0.2, 4, 0x5d4a32, 'paint', { ry: Math.PI / 4 });
      }
    });
    this.group.add(this.body);
    this.group.scale.setScalar(o.scale ?? 1);
  }

  /** Advances the walk cycle for a ground speed in m/s (0 stands still, above ~3 it becomes a run). */
  animate(dt: number, speed: number) {
    const v = Math.abs(speed);
    const target = v < 0.08 ? 0 : Math.min(1.05, 0.34 + v * 0.2);
    this.swing += (target - this.swing) * Math.min(1, dt * 10);
    this.phase += dt * (v < 0.08 ? 1.2 : 2.6 + v * 2.6) * (speed < 0 ? -1 : 1);
    const a = Math.sin(this.phase) * this.swing;
    this.legs[0].rotation.x = a;
    this.legs[1].rotation.x = -a;
    this.arms[0].rotation.x = -a * 0.85;
    this.arms[1].rotation.x = a * 0.85;
    // a little bounce on each step, a lean into a run, and breathing when idle
    this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.035 * this.swing;
    this.body.rotation.x = Math.max(0, v - 2.2) * 0.05;
    if (v < 0.08) this.arms[0].rotation.z = this.arms[1].rotation.z = 0;
  }
}

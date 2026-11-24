import * as THREE from 'three';
import { Batcher, Kit } from './core/kit';
import type { MaterialLib } from './materials';
import type { PersonOpts } from './people';
import { asset, hasAsset } from './assets';

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
  private shins: THREE.Group[] = [];
  private fore: THREE.Group[] = [];
  private head: THREE.Group | null = null;
  private modelled = false;

  constructor(mats: MaterialLib, o: PersonOpts) {
    if (o.model && hasAsset(o.model)) {
      this.rig(mats, o);
      return;
    }
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

  /** Builds the figure from a people-family model: one group per joint, hung from its pivot. */
  private rig(mats: MaterialLib, o: PersonOpts) {
    const a = asset(o.model!)!;
    this.modelled = true;
    const mesh = (build: (k: Kit) => void) => {
      const b = new Batcher(1, false);
      build(new Kit(b, mats));
      const g = new THREE.Group();
      b.build((key) => mats.get(key), g);
      g.traverse((m) => ((m as THREE.Mesh).castShadow = true));
      return g;
    };
    this.body.add(mesh((k) => k.asset(o.model!, 0, 0, 0, 0, { tint: o.tint, skip: [...a.children.keys()] })));
    const joint = (name: string, parent?: string) => {
      const c = a.children.get(name);
      const g = new THREE.Group();
      if (!c) return g;
      const pp = parent ? a.children.get(parent)?.pivot : undefined;
      g.position.copy(c.pivot);
      if (pp) g.position.sub(pp);
      g.add(mesh((k) => k.asset(o.model!, -c.pivot.x, -c.pivot.y, -c.pivot.z, 0, { tint: o.tint, body: false, only: [name] })));
      return g;
    };
    for (const s of ['l', 'r']) {
      const leg = joint(`leg_${s}`);
      const shin = joint(`shin_${s}`, `leg_${s}`);
      leg.add(shin);
      const arm = joint(`arm_${s}`);
      const fore = joint(`forearm_${s}`, `arm_${s}`);
      arm.add(fore);
      if (s === 'r' && o.carry && hasAsset(o.carry)) {
        const grip = (a.info as { grip?: [number, number, number] }).grip;
        if (grip) {
          const held = mesh((k) => k.asset(o.carry!, 0, 0, 0, 0));
          held.position.set(-grip[0], grip[2], -grip[1]);
          fore.add(held);
        }
      }
      this.body.add(leg, arm);
      this.legs.push(leg);
      this.shins.push(shin);
      this.arms.push(arm);
      this.fore.push(fore);
    }
    this.head = joint('head');
    this.body.add(this.head);
    this.group.add(this.body);
  }

  /** Advances the walk cycle for a ground speed in m/s (0 stands still, above ~3 it becomes a run). */
  animate(dt: number, speed: number) {
    const v = Math.abs(speed);
    const target = v < 0.08 ? 0 : Math.min(1.05, 0.34 + v * 0.2);
    this.swing += (target - this.swing) * Math.min(1, dt * 10);
    this.phase += dt * (v < 0.08 ? 1.2 : 2.6 + v * 2.6) * (speed < 0 ? -1 : 1);
    const a = Math.sin(this.phase) * this.swing;
    if (this.modelled) {
      const c = Math.cos(this.phase);
      const run = Math.min(1, Math.max(0, v - 2.2) / 3);
      const th = 0.5 + run * 0.35;
      this.legs[0].rotation.x = a * th;
      this.legs[1].rotation.x = -a * th;
      // the knee folds while its leg swings forward
      this.shins[0].rotation.x = Math.max(0, -c) * this.swing * (0.75 + run * 0.6) + 0.04 * this.swing;
      this.shins[1].rotation.x = Math.max(0, c) * this.swing * (0.75 + run * 0.6) + 0.04 * this.swing;
      this.arms[0].rotation.x = -a * (0.5 + run * 0.4);
      this.arms[1].rotation.x = a * (0.5 + run * 0.4);
      this.arms[0].rotation.z = 0.05;
      this.arms[1].rotation.z = -0.05;
      const bend = -0.12 - this.swing * (0.22 + run * 0.9);
      this.fore[0].rotation.x = bend + Math.min(0, a) * 0.3;
      this.fore[1].rotation.x = bend + Math.min(0, -a) * 0.3;
      if (this.head) this.head.rotation.y = v < 0.08 ? Math.sin(this.phase * 0.35) * 0.25 : 0;
      this.body.position.y = Math.abs(c) * 0.03 * this.swing - 0.012 * this.swing;
      this.body.rotation.x = 0.03 * this.swing + run * 0.12;
      this.body.rotation.y = a * 0.06;
      return;
    }
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

import * as THREE from 'three';
import { Rng } from './core/rng';
import type { MaterialLib } from './materials';
import type { RoadNetwork } from './roads/network';
import { randomPerson } from './people';
import { Figure } from './walker';

interface Path {
  pts: { x: number; z: number }[];
  cum: number[];
  len: number;
}

interface Ped {
  fig: Figure;
  path: Path;
  s: number;
  dir: 1 | -1;
  speed: number;
  pause: number;
  x: number;
  z: number;
  v: number;
}

/** Townsfolk walking the sidewalks: each follows one side of a street, strolls, stops now and then, turns back. */
export class Pedestrians {
  readonly group = new THREE.Group();
  enabled = true;
  private peds: Ped[] = [];

  constructor(mats: MaterialLib, net: RoadNetwork, private groundAt: (x: number, z: number, nearY?: number) => number, count = 70, seed = 77) {
    this.group.name = 'pedestrians';
    const rng = new Rng(seed);
    const paths: { path: Path; weight: number }[] = [];
    for (const r of net.roads) {
      const sp = r.spec;
      if (!sp.curb || sp.walk < 1.2) continue;
      const off = sp.hw + 0.25 + sp.park + sp.walk * 0.5;
      for (const side of [false, true]) {
        const pts = net.lane(r, off, side).map((p) => ({ x: p.x, z: p.z }));
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
        const len = cum[cum.length - 1];
        // Main Street is where people are; the residential blocks get the odd dog-walker
        if (len > 30) paths.push({ path: { pts, cum, len }, weight: len * (sp.walk > 3 ? 5 : sp.walk > 1.5 ? 1.2 : 0.5) });
      }
    }
    const total = paths.reduce((a, p) => a + p.weight, 0);
    if (!total) return;
    for (let i = 0; i < count; i++) {
      let t = rng.next() * total;
      let pick = paths[0];
      for (const p of paths) {
        if ((t -= p.weight) <= 0) {
          pick = p;
          break;
        }
      }
      const fig = new Figure(mats, randomPerson(rng));
      fig.group.visible = false;
      this.group.add(fig.group);
      this.peds.push({ fig, path: pick.path, s: rng.range(4, pick.path.len - 4), dir: rng.chance(0.5) ? 1 : -1, speed: rng.range(1.05, 1.6), pause: rng.chance(0.2) ? rng.range(2, 10) : 0, x: 0, z: 0, v: 0 });
    }
    this.update(0);
  }

  /** Where everyone is (for the player's car to avoid, and vice versa). */
  positions() {
    return this.peds;
  }

  update(dt: number, camera?: THREE.Vector3, player?: { x: number; z: number } | null) {
    for (const p of this.peds) {
      const path = p.path;
      let want = 0;
      if (this.enabled && dt > 0) {
        if (p.pause > 0) p.pause -= dt;
        else {
          want = p.speed;
          if (Math.random() < dt * 0.012) p.pause = 2 + Math.random() * 9;
        }
        // nobody walks into a moving car
        if (player && Math.hypot(player.x - p.x, player.z - p.z) < 2.6) want = 0;
        p.v += (want - p.v) * Math.min(1, dt * 5);
        p.s += p.v * p.dir * dt;
        if (p.s > path.len - 3) {
          p.s = path.len - 3;
          p.dir = -1;
        } else if (p.s < 3) {
          p.s = 3;
          p.dir = 1;
        }
      }
      let lo = 0;
      let hi = path.cum.length - 1;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (path.cum[m] <= p.s) lo = m;
        else hi = m;
      }
      const a = path.pts[lo];
      const b = path.pts[hi];
      const t = (p.s - path.cum[lo]) / Math.max(1e-6, path.cum[hi] - path.cum[lo]);
      p.x = a.x + (b.x - a.x) * t;
      p.z = a.z + (b.z - a.z) * t;
      const near = !camera || Math.hypot(p.x - camera.x, p.z - camera.z) < 190;
      p.fig.group.visible = near;
      if (!near) continue;
      const g = p.fig.group;
      g.position.set(p.x, this.groundAt(p.x, p.z), p.z);
      const want_ry = Math.atan2((b.x - a.x) * p.dir, (b.z - a.z) * p.dir);
      let d = want_ry - g.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * 6 + (dt === 0 ? 1 : 0));
      p.fig.animate(dt, p.v);
    }
  }
}

import * as THREE from 'three';
import type { Ctx, RoadRect } from '../buildings/common';
import type { Col } from '../core/kit';
import { vehicle, VEHICLE_LENGTH, type VehicleType, type VehicleOpts } from '../vehicles';
import * as pr from '../props';
import { P } from '../palette';
import { heightAt } from '../terrain';
import type { PlacedTree, VegetationInput } from '../vegetation';

export const HALF_PI = Math.PI / 2;
export const SIDE_Y = 0.16;

const VEHICLE_WIDTH: Partial<Record<VehicleType, number>> = { semi: 2.6, firetruck: 2.6, delivery: 2.4, tractor: 2.4 };

export interface Animated {
  obj: THREE.Object3D;
  update: (dt: number, t: number) => void;
}

/** Shared state and drawing helpers for the layout modules. */
export class Layout {
  readonly trees: PlacedTree[] = [];
  readonly cornFields: VegetationInput['cornFields'] = [];
  readonly grassPatches: VegetationInput['grassPatches'] = [];
  readonly animated: Animated[] = [];
  readonly housePoints: THREE.Vector3[] = [];
  readonly poles: THREE.Vector3[][] = [];
  readonly clearings: { x: number; z: number; w: number; d: number }[] = [];

  constructor(readonly c: Ctx) {}
  get k() {
    return this.c.kit;
  }
  get signs() {
    return this.c.signs;
  }
  get rng() {
    return this.c.rng;
  }

  road(x0: number, x1: number, z0: number, z1: number, color: number = P.asphalt, kind: RoadRect['kind'] = 'road') {
    this.k.box((x0 + x1) / 2, -0.3, (z0 + z1) / 2, x1 - x0, 0.33, z1 - z0, color, 'asphalt', { cast: false });
    this.c.occ.add((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 1.2, false);
    this.c.roads.push({ x0, x1, z0, z1, kind });
  }
  dirt(x0: number, x1: number, z0: number, z1: number, color: number = P.dirt, occupy = true, mat = 'paint') {
    this.k.plane((x0 + x1) / 2, 0.012, (z0 + z1) / 2, x1 - x0, z1 - z0, color, mat, { cast: false });
    if (occupy) this.c.occ.add((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 0.5, false);
  }
  /** Asphalt/concrete lot (drivable). */
  pave(x0: number, x1: number, z0: number, z1: number, color: number = P.asphaltDark, mat = 'asphalt', h = 0.04) {
    this.k.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, h, z1 - z0, color, mat, { cast: false });
    this.c.occ.add((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 0.5, false);
    this.c.surf.add(x0, x1, z0, z1, h);
    this.c.roads.push({ x0, x1, z0, z1, kind: 'alley' });
  }
  paint(x0: number, x1: number, z0: number, z1: number, color: number = P.lineWhite) {
    this.k.box((x0 + x1) / 2, 0.03, (z0 + z1) / 2, x1 - x0, 0.014, z1 - z0, color, 'decal', { cast: false });
  }
  sidewalk(x0: number, x1: number, z0: number, z1: number) {
    this.k.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, SIDE_Y, z1 - z0, P.sidewalk, 'concrete', { cast: false });
    this.c.occ.add((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 0.3, false);
    this.c.surf.add(x0, x1, z0, z1, SIDE_Y);
  }
  /** Raised lawn/plaza (park). */
  lawn(x0: number, x1: number, z0: number, z1: number, color: number = P.lawn) {
    this.k.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, SIDE_Y, z1 - z0, color, 'paint', { cast: false });
    this.c.occ.add((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 0, false);
    this.c.surf.add(x0, x1, z0, z1, SIDE_Y);
  }
  /** Parked vehicle with a collision footprint (works inside kit transforms). */
  car(type: VehicleType, x: number, z: number, ry: number, color: Col, o: VehicleOpts = {}) {
    this.k.solid(x, z, VEHICLE_LENGTH[type] - 0.2, VEHICLE_WIDTH[type] ?? 2.0, ry);
    vehicle(this.k, this.signs, type, x, z, ry, color, o);
  }
  carAt(type: VehicleType, x: number, z: number, ry: number, color: Col, y: number, o: VehicleOpts = {}) {
    this.k.at(0, 0, 0, () => this.car(type, x, z, ry, color, o), y);
  }
  grass(x: number, z: number, w: number, d: number, n: number) {
    this.grassPatches.push({ x, z, w, d, n });
  }
  private utilityAt(x: number, z: number, ry: number, tr: boolean) {
    let att: THREE.Vector3[] = [];
    this.k.at(x, z, ry, () => (att = pr.utilityPole(this.k, 0, 0, 0, { transformer: tr })), heightAt(x, z));
    this.c.occ.add(x, z, 0.6, 0.6, 0, 0.4, false);
    this.poles.push(att);
    return att;
  }
  runX(z: number, x0: number, x1: number, step: number, skip?: (x: number) => boolean) {
    const pts: THREE.Vector3[][] = [];
    for (let x = x0; x <= x1; x += step) {
      if (skip?.(x)) continue;
      pts.push(this.utilityAt(x, z, HALF_PI, this.rng.chance(0.2)));
    }
    pr.connectPoles(this.k, pts);
    return pts;
  }
  runZ(x: number, z0: number, z1: number, step: number, skip?: (z: number) => boolean) {
    const pts: THREE.Vector3[][] = [];
    for (let z = z0; z <= z1; z += step) {
      if (skip?.(z)) continue;
      pts.push(this.utilityAt(x, z, 0, this.rng.chance(0.2)));
    }
    pr.connectPoles(this.k, pts);
    return pts;
  }
}

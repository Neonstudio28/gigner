import type { Ctx } from './common';

/**
 * A placeable building. `build` draws it centred on (x, z) with its front facing local +Z
 * (world direction (sin ry, 0, cos ry)), base at y = 0 of the current kit transform, and
 * registers its own occupancy/collision. `w`/`d` is the full footprint including porches,
 * steps and attached carports, used by the layout to test whether a lot is free.
 */
export interface BuildingDef {
  id: string;
  name: string;
  w: number;
  d: number;
  /** Distance from footprint centre to the front face of the main wall (for setbacks). */
  front?: number;
  /** Local x of the front door and its steps (front walks start here). */
  door?: number;
  /** Local x of a garage/carport driveway at the front edge (layout runs the driveway from there to the road). */
  drive?: number;
  /** Lot entrance for sites set back from the street: local x and width of the paved apron to the road. */
  access?: [number, number];
  /** Rough era/zone tags used by the layout to pick styles per neighbourhood. */
  tags: string[];
  build: (c: Ctx, x: number, z: number, ry: number, seed: number) => void;
}

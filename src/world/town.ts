import * as THREE from 'three';
import type { Ctx } from './buildings/common';
import { Layout, type Animated } from './layout/helpers';
import { roads, mainStreet, downtown } from './layout/core';
import { residential } from './layout/residential';
import { outskirts } from './layout/outskirts';
import { utilities, furniture, parkedVehicles, townsfolk } from './layout/streets';
import { registerFarmPads } from './farms';
import { addFlatPad } from './terrain';
import type { VegetationInput } from './vegetation';

export interface TownLayout {
  veg: Omit<VegetationInput, 'occ'>;
  animated: Animated[];
  spawn: THREE.Vector3;
}

/** Lays out Pine Hollow: downtown, civic square, homes, farms, highways and the power grid. */
export function buildTown(c: Ctx): TownLayout {
  // terrain pads first: everything afterwards samples heightAt
  const pads = registerFarmPads();
  addFlatPad(-330, -262, 60, 46, 40, 0);
  const L = new Layout(c);
  roads(L);
  mainStreet(L);
  downtown(L);
  residential(L);
  outskirts(L, pads);
  utilities(L);
  furniture(L);
  parkedVehicles(L);
  townsfolk(L);
  return {
    veg: { trees: L.trees, cornFields: L.cornFields, grassPatches: L.grassPatches, clearings: L.clearings },
    animated: L.animated,
    spawn: new THREE.Vector3(-30, 1.7, 30),
  };
}

import { streets } from './streets';
import type { BuildingDef } from '../buildings/catalog';
import type { Ctx } from '../buildings/common';
import type { Road } from '../roads/network';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import { heightAt, addFlatPad } from '../terrain';
import { donutShop, diner, gasStation } from '../buildings/commercial';
import { church, sheriffOffice } from '../buildings/civic';
import { SHOPS } from '../b2/shops';
import { HOUSES } from '../b2/houses';
import { CIVIC_B2 } from '../b2/civic';
import { LANDMARKS } from '../b2/landmarks';
import { put } from '../b2/hull';
import { yards } from './dress2';
import { townsfolk } from './folk';
import { DISTRICT } from '../b2/district';
import { farms, lumberYard, freight, lakefront, pylons } from './districts2';
import { core } from './core';
import { meadowbrook } from './meadow';
import { schools } from './schools';
import { strip, homes, riverPark, ridge, flats, trailerCourt, industry } from './quarters';

const PI = Math.PI;
void PI;

/** Flattens the building sites; must run before anything samples the terrain. */
export function registerTownPads() {
  addFlatPad(0, -45, 170, 62, 30);
  addFlatPad(-76, -250, 134, 132, 30);
  addFlatPad(116, -252, 212, 140, 30);
}

/** Prop from the Blender families standing on the ground. */
function prop(pl: Placer, name: string, x: number, z: number, ry = 0, solid: boolean | number = true) {
  pl.k.at(0, 0, 0, () => put(pl.k, name, x, 0, z, ry, { solid }), heightAt(x, z));
}

/** Everything that stands in Pine Hollow: the lakeside grid, the farms, the lumber yard and the freight yards. */
export function town(pl: Placer) {
  core(pl);
  strip(pl);
  lakefront(pl);
  farms(pl);
  pylons(pl);
  lumberYard(pl);
  freight(pl);
  industry(pl);
  homes(pl);
  riverPark(pl);
  ridge(pl);
  flats(pl);
  trailerCourt(pl);
  trailerCourt(pl, 'Sunset Loop', 'Sunset Acres', [1655, 60], 6161, [[1, 10, -10], [-1, 14, -14]], 'Sunset Ct');
  schools(pl);
  meadowbrook(pl);
  yards(pl);
  streets(pl);
  townsfolk(pl);
}

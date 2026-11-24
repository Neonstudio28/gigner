import type { BuildingDef } from '../buildings/catalog';
import { SHOPS } from './shops';
import { CIVIC_B2 } from './civic';

/** Every building of the remade town (gallery set `b2`). */
export const B2: BuildingDef[] = [...SHOPS, ...CIVIC_B2];

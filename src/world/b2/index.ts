import type { BuildingDef } from '../buildings/catalog';
import { SHOPS } from './shops';
import { CIVIC_B2 } from './civic';
import { SCHOOLS } from './school';
import { HOUSES, SUBURBAN, CABINS } from './houses';
import { LANDMARKS } from './landmarks';
import { DISTRICT } from './district';
import { FASTFOOD } from './fastfood';

/** Every building of the remade town (gallery set `b2`). */
export const B2: BuildingDef[] = [...LANDMARKS, ...DISTRICT, ...FASTFOOD, ...SHOPS, ...CIVIC_B2, ...SCHOOLS, ...HOUSES, ...SUBURBAN, ...CABINS];

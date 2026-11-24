import type { Placer } from './placer';

/** Flattens the building sites; must run before anything samples the terrain. */
export function registerTownPads() {}

/** Everything that stands in Pine Hollow: the lakeside grid, the farms, the lumber yard and the freight yards. */
export function town(pl: Placer) {
  void pl;
}

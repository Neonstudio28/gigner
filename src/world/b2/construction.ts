import type { BuildingDef } from '../buildings/catalog';
import { Rng } from '../core/rng';
import { put } from './hull';

/**
 * New-build lots in the subdivision: a graded dirt pad with the house at one stage of construction (slab, wall
 * framing, roof trusses, wrapped shell, all Blender assets) and the site clutter that goes with that stage.
 */
const STAGES = ['house_slab', 'house_frame_a', 'house_frame_b', 'house_frame_c'] as const;
const NAMES = ['Poured slab', 'Framed walls', 'Roof trusses on', 'Sheathed shell'];

const C = (stage: number, id: string): BuildingDef => ({
  id,
  name: NAMES[stage],
  w: 17,
  d: 13,
  front: 6.2,
  door: -2,
  drive: 5.6,
  tags: ['construction'],
  build: (c, x, z, ry, seed) => {
    const { kit: k } = c;
    const rng = new Rng(seed * 13 + stage);
    k.at(x, z, ry, () => {
      k.box(0, -0.06, -0.5, 16.4, 0.1, 12.6, 0x8a7458, 'gravel', { cast: false });
      for (let i = 0; i < 5; i++) k.box(rng.range(-7, 7), -0.02, rng.range(-6, 5), rng.range(1.5, 3.5), 0.06, rng.range(1, 2.5), 0x6f5c44, 'gravel', { ry: rng.range(0, 3), cast: false });
      put(k, STAGES[stage], -2, 0, 0, 0, { solid: true });
      // stage clutter at the back and the drive side
      if (stage <= 1) put(k, 'truss_stack', 4.6, 0, -5.4, Math.PI / 2, { solid: 0.4 });
      if (stage === 0) put(k, 'cement_mixer', 5.8, 0, 1.5, rng.range(0, 6), { solid: 0.4 });
      if (stage >= 1) put(k, rng.pick(['lumber_stack_a', 'lumber_stack_b', 'plywood_stack']), 5.6, 0, -2.2, Math.PI / 2, { solid: 0.4 });
      if (stage >= 2) put(k, 'plywood_stack', -7.2, 0, -4.8, 0.1, { solid: 0.4 });
      if (stage === 3) put(k, 'scaffold_tower', -7.6, 0, 0.5, Math.PI / 2, { solid: 0.4 });
      if (rng.chance(0.5)) put(k, 'dirt_pile', -6.4, 0, -5.6, rng.range(0, 6), { solid: 0.3 });
      if (rng.chance(0.35)) put(k, 'portable_toilet', 7.4, 0, -5.4, Math.PI, { solid: 0.4 });
      if (stage >= 1 && rng.chance(0.6)) put(k, 'dumpster_blue_open', 6.2, 0, 4.4, Math.PI / 2, { solid: 0.4 });
      // silt fence panels along the front, open at the drive
      for (let fx = -7.4; fx < 3.4; fx += 2.4) put(k, 'construction_fence_panel', fx, 0, 5.9, 0, { solid: 0.3 });
      for (const sx of [-1, 1]) put(k, 'traffic_cone', 5.6 + sx * 1.8, 0, 6.2, 0, { solid: false });
    });
  },
});

export const CONSTRUCTION: BuildingDef[] = [C(0, 'build_slab'), C(1, 'build_frame_a'), C(2, 'build_frame_b'), C(3, 'build_frame_c')];

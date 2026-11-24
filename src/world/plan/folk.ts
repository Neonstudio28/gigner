import { Rng } from '../core/rng';
import { Placer } from './placer';
import { heightAt, isWater, LAKE } from '../terrain';
import { put } from '../b2/hull';
import { zoneAt } from '../buildings/interiors';
import { addPost, newRing, type Post, type PostPose } from '../../npc/posts';

type Pose = PostPose;
/** Who starts at a spot: a model (or 'any' townsperson), what they are doing and what they hold. */
interface Who {
  model: string;
  pose?: Pose;
  carry?: string;
}
const PI = Math.PI;

/** True where a person cannot stand: water, the wet edge of the beach, or something solid. */
function taken(pl: Placer, x: number, z: number, pad: number) {
  if (isWater(x, z) || heightAt(x, z) < LAKE.level + 0.3) return true;
  return !!pl.c.occ.solids?.blocked(x, z, pad);
}

/** Standing ground at a point: the sidewalk or road surface where there is one, the terrain otherwise. */
function ground(pl: Placer, x: number, z: number) {
  const r = pl.net.surfaceY(x, z);
  // porches, steps and decks count as ground, so nobody stands buried in a stair
  return Math.max(heightAt(x, z), r > -1e8 ? r : -1e9, zoneAt(x, z)?.floor ?? -1e9);
}

function stand(pl: Placer, x: number, z: number, ry: number, o: Who, tag = 'street', extra: Partial<Post> = {}) {
  if (taken(pl, x, z, 0.3)) return false;
  addPost({ kind: 'stand', x, z, y: ground(pl, x, z), ry, tag, ...o, ...extra });
  return true;
}

/** A few people talking in a ring. */
function group(pl: Placer, rng: Rng, x: number, z: number, n: number, tag = 'street') {
  if (taken(pl, x, z, 0.7)) return;
  const ring = newRing();
  const R = 0.55 + n * 0.14;
  const a0 = rng.range(0, 6.28);
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * 6.28 + rng.range(-0.2, 0.2);
    stand(pl, x + Math.sin(a) * R, z + Math.cos(a) * R, a + PI, { model: 'any', pose: rng.pick(['talk', 'stand', 'hips', 'cross', 'talk'] as const) }, tag, { ring });
  }
}

/** A bench with one or two people sitting on it. */
function bench(pl: Placer, rng: Rng, x: number, z: number, ry: number, tag = 'street') {
  if (taken(pl, x, z, 0.8)) return;
  const y = ground(pl, x, z);
  pl.k.at(x, z, ry, () => put(pl.k, 'bench_wood', 0, 0, 0, 0, { solid: 0.9 }), y);
  const n = rng.pick([1, 2, 2]);
  const ring = n > 1 ? newRing() : undefined;
  for (let i = 0; i < 2; i++) {
    const lx = -0.42 + i * 0.84;
    const [sx, sz] = Placer.world(x, z, ry, lx, 0.12);
    const [ax, az] = Placer.world(x, z, ry, lx, 0.85);
    addPost({ kind: 'seat', x: sx, z: sz, y, ry, tag, ax, az, ring, ...(i < n ? { model: 'any', pose: 'sit' as const } : {}) });
  }
}

/** People standing about a building's front door (local frame of its site). */
function door(pl: Placer, rng: Rng, id: string, list: [number, number, number, (r: Rng) => Who][]) {
  pl.sites.forEach((s, site) => {
    if (s.def.id !== id) return;
    const at = (lx: number, lz: number) => Placer.world(s.x, s.z, s.ry, lx, s.def.d / 2 + lz);
    // a flight of steps is a ramp to the walker but not to the eye: the whole group moves out to the flat below it
    const onSteps = (lx: number, lz: number) => {
      const a = zoneAt(...at(lx, lz))?.floor;
      const b = zoneAt(...at(lx, lz + 0.25))?.floor;
      return a !== undefined && (b === undefined ? a > heightAt(...at(lx, lz)) + 0.25 : Math.abs(a - b) > 0.02);
    };
    let out = 0;
    while (out < 8 && list.some(([lx, lz]) => onSteps(lx, lz + out))) out += 0.3;
    if (out) out += 0.5;
    for (const [lx, lz, ry, mk] of list) {
      const [x, z] = at(lx, lz + out);
      stand(pl, x, z, s.ry + ry, mk(rng), id, { site });
    }
  });
}

const as = (model: string, pose: Pose = 'stand', carry?: string) => (): Who => ({ model, pose, carry });
const any = (pose?: Pose) => (): Who => ({ model: 'any', pose });
const deputy = (r: Rng): Who => ({ model: r.chance(0.7) ? 'sheriff_deputy_m' : 'sheriff_deputy_f', pose: r.pick(['hips', 'cross', 'talk'] as const) });

/** The town's standing population: chatting groups, bench sitters, people at their work and on the beach. */
export function townsfolk(pl: Placer) {
  const rng = new Rng(4242);
  // Main Street and the cross streets: groups and loners on the sidewalks, benches against the shopfronts
  for (const name of ['Main St', 'Alder St', 'River St']) {
    const r = pl.net.byName(name);
    if (!r) continue;
    const busy = name === 'Main St';
    for (let s = 20; s < r.length - 20; s += busy ? rng.range(7, 15) : rng.range(26, 50)) {
      const p = r.at(s);
      if (Math.abs(p.x) > 330) continue;
      for (const side of [1, -1] as const) {
        if (!rng.chance(busy ? 0.7 : 0.5)) continue;
        const f = pl.net.frontage(r, s + rng.range(-3, 3), side, r.full - r.spec.walk * rng.range(0.35, 0.65));
        const pick = rng.next();
        if (pick < 0.45) group(pl, rng, f.x, f.z, rng.pick([2, 2, 3, 3, 4]));
        else if (pick < 0.7 && busy) {
          const b = pl.net.frontage(r, s, side, r.full - 0.55);
          bench(pl, rng, b.x, b.z, b.ry);
        } else stand(pl, f.x, f.z, rng.range(0, 6.28), { model: 'any', pose: rng.pick(['stand', 'stride', 'stride', 'carry', 'hips'] as const) });
      }
    }
  }
  // people at their work
  door(pl, rng, 'sheriff', [[-2.2, 2.2, 0.3, deputy], [-1.1, 2.8, PI - 0.4, deputy], [3.5, 1.6, 0, as('agent_m', 'cross')]]);
  door(pl, rng, 'church', [[4.2, 2.4, 0.2, as('priest', 'talk')], [2.9, 3.6, PI, as('old_woman')], [3.9, 4.0, PI + 0.5, as('old_man', 'hips')]]);
  door(pl, rng, 'courthouse', [[-4.3, 3.2, 0.4, as('businessman', 'stand', 'briefcase')], [-3.2, 3.9, PI - 0.3, as('businesswoman', 'talk')], [3.2, 2.6, 0, as('agent_f', 'cross')], [-7, 4.5, 0.8, any('stride')]]);
  door(pl, rng, 'townhall', [[3.2, 3, -0.3, as('businesswoman', 'stand', 'briefcase')], [4.2, 3.6, PI + 0.3, as('casual_m_2', 'talk')]]);
  door(pl, rng, 'bank', [[1.6, 1.4, 0.2, as('businessman', 'stride', 'briefcase')], [-2.5, 1.8, 0.9, as('old_man')]]);
  door(pl, rng, 'diner', [[-3, 1.5, 0.4, as('waitress', 'cross')], [-1.8, 2.1, PI + 0.6, as('trucker', 'talk')], [5, 2, 0, as('cook', 'lean')]]);
  door(pl, rng, 'donut', [[1.5, 1.6, 0.2, as('teen_m', 'carry', 'coffee_cup')], [2.5, 2.2, PI, as('teen_f', 'hips')]]);
  door(pl, rng, 'gas', [[-6, -9, 0.5, as('mechanic', 'hips')], [4, -12, 2.2, as('trucker', 'lean')], [9, -3, 0, any('stride')]]);
  door(pl, rng, 'grocery', [[-3, 1.6, 0.3, as('casual_f_1', 'stand', 'shopping_bag')], [2.4, 2.4, -0.4, as('old_woman', 'stand', 'shopping_bag')], [3.6, 2.2, PI + 0.4, as('casual_f_3', 'talk')]]);
  door(pl, rng, 'motel', [[-10, 2, 0.2, as('tourist', 'point')], [-9, 2.6, PI, as('casual_f_2', 'hips')], [12, 1.6, 0, as('biker', 'lean')]]);
  door(pl, rng, 'lakeCafe', [[-4, 3, 0.5, as('waitress', 'carry')], [2, 4, 0, any('talk')], [3, 4.4, PI, any()]]);
  door(pl, rng, 'baitShop', [[-2.5, 2.2, 0.3, as('old_man', 'hips')], [3, 2.6, -0.6, as('farmer', 'talk')]]);
  door(pl, rng, 'barn', [[-3, 3, 0.4, as('farmer', 'hips')], [5, 5, 2.4, as('farmer', 'carry')]]);
  door(pl, rng, 'sawmill', [[-8, 3, 0.2, as('lumberjack', 'hips')], [-6.6, 3.6, PI + 0.3, as('lumberjack', 'talk')], [6, 4, 1.2, as('worker', 'point')], [12, 6, 0, as('worker', 'stride')]]);
  door(pl, rng, 'lumberOffice', [[2.5, 2, 0.2, as('businessman', 'cross')], [3.4, 2.6, PI, as('trucker', 'talk')]]);
  door(pl, rng, 'warehouse', [[-6, 4, 0.3, as('worker', 'point')], [-4.6, 4.8, PI + 0.4, as('trucker', 'cross')], [8, 5, 1.5, as('worker', 'carry')]]);
  door(pl, rng, 'factory', [[-3, 2.5, 0.3, as('worker', 'talk')], [-1.8, 3.2, PI, as('worker', 'hips')], [10, 3, 0.4, as('mechanic', 'lean')]]);
  // the beach, the pier and the playground
  const shore = (x: number) => {
    for (let z = 275; z < 420; z += 0.5) if (isWater(x, z) || heightAt(x, z) < LAKE.level + 0.3) return z;
    return 420;
  };
  for (let x = -70; x <= 100; x += rng.range(12, 22)) {
    const z = shore(x) - rng.range(3, 9);
    if (rng.chance(0.55)) group(pl, rng, x, z, rng.pick([2, 3, 3, 4]), 'beach');
    else stand(pl, x, z, rng.range(-0.6, 0.6), { model: 'any', pose: rng.pick(['hips', 'point', 'wave', 'stand'] as const) }, 'beach');
  }
  for (const [kx, kz, m] of [[-82, 293, 'kid_m'], [-88, 294, 'kid_f'], [-80, 299, 'kid_f'], [-90, 300, 'kid_m'], [-76, 291, 'casual_f_2']] as const) stand(pl, kx, kz, rng.range(0, 6.28), { model: m, pose: rng.pick(['wave', 'stride', 'stand', 'hips'] as const) }, 'play');
  const pz = shore(14) - 5;
  const deck = LAKE.level + 0.9;
  for (const [lz, ry, mk] of [[44, 0.2, as('old_man', 'carry')], [40, PI / 2, as('kid_m', 'point')], [26, -PI / 2, as('tourist', 'hips')], [14, PI, any('stride')]] as const) addPost({ kind: 'stand', x: 14 + rng.range(-0.5, 0.5), z: pz + lz, y: deck, ry, tag: 'pier', ...mk() });
  // the green: benches round the town hall block
  for (const [bx, bz, ry] of [[-24, 58, PI / 2], [24, 58, -PI / 2], [-12, 22, 0], [12, 22, 0], [-24, 36, PI / 2], [24, 36, -PI / 2]] as const) bench(pl, rng, bx, bz, ry, 'green');
}

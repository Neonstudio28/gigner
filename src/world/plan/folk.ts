import { Rng } from '../core/rng';
import { Placer } from './placer';
import { heightAt, isWater, LAKE } from '../terrain';
import { put } from '../b2/hull';
import { person, randomPerson, cast, deputy, crowd, type PersonOpts, type Pose } from '../people';

const PI = Math.PI;

/** Standing ground at a point: the sidewalk or road surface where there is one, the terrain otherwise. */
function ground(pl: Placer, x: number, z: number) {
  const r = pl.net.surfaceY(x, z);
  return Math.max(heightAt(x, z), r > -1e8 ? r : -1e9);
}

function stand(pl: Placer, x: number, z: number, ry: number, o: PersonOpts) {
  if (isWater(x, z) || pl.c.occ.blocked(x, z, 0.3)) return false;
  person(pl.k, x, z, ry, o, ground(pl, x, z));
  return true;
}

/** A few people talking in a ring. */
function group(pl: Placer, rng: Rng, x: number, z: number, n: number, mk: (r: Rng) => PersonOpts = randomPerson) {
  if (isWater(x, z) || pl.c.occ.blocked(x, z, 1.2)) return;
  pl.k.at(x, z, 0, () => crowd(pl.k, rng, 0, 0, n, 0.55 + n * 0.14, mk), ground(pl, x, z));
}

/** A bench with one or two people sitting on it. */
function bench(pl: Placer, rng: Rng, x: number, z: number, ry: number) {
  if (isWater(x, z) || pl.c.occ.blocked(x, z, 0.8)) return;
  pl.k.at(x, z, ry, () => {
    put(pl.k, 'bench_wood', 0, 0, 0, 0, { solid: 0.9 });
    const n = rng.pick([1, 2, 2]);
    for (let i = 0; i < n; i++) person(pl.k, n === 1 ? rng.range(-0.4, 0.4) : -0.42 + i * 0.84, 0.12, rng.range(-0.15, 0.15), { ...randomPerson(rng, 'sit'), seat: 0.46 });
  }, ground(pl, x, z));
}

/** People standing about a building's front door (local frame of its site). */
function door(pl: Placer, rng: Rng, id: string, list: [number, number, number, (r: Rng) => PersonOpts][]) {
  for (const s of pl.sites) {
    if (s.def.id !== id) continue;
    for (const [lx, lz, ry, mk] of list) {
      const [x, z] = Placer.world(s.x, s.z, s.ry, lx, s.def.d / 2 + lz);
      stand(pl, x, z, s.ry + ry, mk(rng));
    }
  }
}

const as = (model: string, pose: Pose = 'stand', carry?: string) => (r: Rng): PersonOpts => ({ ...cast(r, model, pose), carry });
const any = (pose?: Pose) => (r: Rng) => randomPerson(r, pose);

/** The town's standing population: chatting groups, bench sitters, people at their work and on the beach. */
export function townsfolk(pl: Placer) {
  const rng = new Rng(4242);
  // Main Street and the cross streets: groups and loners on the sidewalks, benches against the shopfronts
  for (const name of ['Main St', 'Alder St', 'River St']) {
    const r = pl.net.byName(name);
    if (!r) continue;
    const busy = name === 'Main St';
    for (let s = 20; s < r.length - 20; s += busy ? rng.range(16, 30) : rng.range(45, 80)) {
      const p = r.at(s);
      if (Math.abs(p.x) > 330) continue;
      const side = rng.chance(0.5) ? 1 : -1;
      const f = pl.net.frontage(r, s, side, r.full - r.spec.walk * rng.range(0.35, 0.65));
      const pick = rng.next();
      if (pick < 0.45) group(pl, rng, f.x, f.z, rng.pick([2, 2, 3, 3, 4]));
      else if (pick < 0.7 && busy) {
        const b = pl.net.frontage(r, s, side, r.full - 0.55);
        bench(pl, rng, b.x, b.z, b.ry);
      } else stand(pl, f.x, f.z, rng.range(0, 6.28), randomPerson(rng, rng.pick(['stand', 'stride', 'stride', 'carry', 'hips'] as const)));
    }
  }
  // people at their work
  door(pl, rng, 'sheriff', [[-2.2, 2.2, 0.3, deputy], [-1.1, 2.8, PI - 0.4, deputy], [3.5, 1.6, 0, as('agent_m', 'cross')]]);
  door(pl, rng, 'church', [[0.9, 2.4, 0.2, as('priest', 'talk')], [-0.4, 3.6, PI, as('old_woman')], [0.6, 4.0, PI + 0.5, as('old_man', 'hips')]]);
  door(pl, rng, 'courthouse', [[-1.5, 3.2, 0.4, as('businessman', 'stand', 'briefcase')], [-0.4, 3.9, PI - 0.3, as('businesswoman', 'talk')], [3.2, 2.6, 0, as('agent_f', 'cross')], [-5, 4.5, 0.8, any('stride')]]);
  door(pl, rng, 'townhall', [[2, 3, -0.3, as('businesswoman', 'stand', 'briefcase')], [3, 3.6, PI + 0.3, as('casual_m_2', 'talk')]]);
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
    for (let z = 275; z < 420; z += 0.5) if (isWater(x, z)) return z;
    return 420;
  };
  for (let x = -70; x <= 100; x += rng.range(12, 22)) {
    const z = shore(x) - rng.range(3, 9);
    if (rng.chance(0.55)) group(pl, rng, x, z, rng.pick([2, 3, 3, 4]));
    else stand(pl, x, z, rng.range(-0.6, 0.6), randomPerson(rng, rng.pick(['hips', 'point', 'wave', 'stand'] as const)));
  }
  for (const [kx, kz, m] of [[-82, 293, 'kid_m'], [-88, 294, 'kid_f'], [-80, 299, 'kid_f'], [-90, 300, 'kid_m'], [-76, 291, 'casual_f_2']] as const) stand(pl, kx, kz, rng.range(0, 6.28), cast(rng, m, rng.pick(['wave', 'stride', 'stand', 'hips'] as const)));
  const pz = shore(14) - 5;
  const deck = LAKE.level + 0.9;
  for (const [lz, ry, mk] of [[40, 0.2, as('old_man', 'carry')], [36, PI / 2, as('kid_m', 'point')], [22, -PI / 2, as('tourist', 'hips')], [10, PI, any('stride')]] as const) person(pl.k, 14 + rng.range(-0.5, 0.5), pz + lz, ry, mk(rng), deck);
  // the green: benches round the town hall block
  for (const [bx, bz, ry] of [[-24, 58, PI / 2], [24, 58, -PI / 2], [-12, 22, 0], [12, 22, 0], [-24, 36, PI / 2], [24, 36, -PI / 2]] as const) bench(pl, rng, bx, bz, ry);
}

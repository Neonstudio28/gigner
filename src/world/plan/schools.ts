import { Rng } from '../core/rng';
import type { Placer } from './placer';
import { SCHOOLS } from '../b2/school';
import { inFrame, fbuild, freserve, pave, path, carPark, ftree, fcar, fentrance, prop, scatter, fence, lamps, W, frameRy, fheight, CONCRETE, ASPHALT } from './blocks';

const def = (id: string) => SCHOOLS.find((d) => d.id === id)!;
const WHITE = 0xf2efe6;
const CHIPS = 0x8a6a48;

/** Flat painted mark at a frame point (court and field lines). */
function mark(pl: Placer, x: number, z: number, w: number, d: number, col = WHITE, ry = 0, y = 0.07) {
  const [wx, wz] = W(x, z);
  pl.k.at(wx, wz, ry + frameRy(), () => pl.k.box(0, y, 0, w, 0.02, d, col, 'paint', { cast: false }), fheight(x, z));
}

/** Bus loop in front of a school: one-way drive between two kerb cuts, a raised walk to the doors, buses at the kerb. */
function busLoop(pl: Placer, rng: Rng, z0: number, z1: number, half: number) {
  pave(pl, -half, z0, half, z1, ASPHALT);
  pave(pl, -half + 2, z0 - 4.5, half - 2, z0, CONCRETE, 'concrete', 0.12);
  for (const s of [-1, 1]) fentrance(pl, s * (half - 3.5), z1, 0, 1, 7, 34);
  for (let x = -half + 6; x < half - 6; x += 3.2) mark(pl, x, z0 + 1.2, 1.6, 0.12, 0xe6c13a);
  mark(pl, 0, z0 + 3.6, 2 * half - 8, 0.12, WHITE);
  for (let i = 0; i < 2; i++) fcar(pl, 'van', -half + 10 + i * 14, z0 + 2, Math.PI / 2, 0xe6b422, { model: 'school_bus' });
  prop(pl, 'bus_stop_sign', half - 4, z0 - 0.6, 0);
  for (const x of [-half + 4, half - 6]) prop(pl, 'bike_rack', x, z0 - 2.5, 0);
  void rng;
}

/** Wood-chip playground: climber, swings, slides, monkey bars, seesaw, tetherball and benches inside a timber edge. */
function playground(pl: Placer, rng: Rng, x0: number, z0: number, x1: number, z1: number) {
  pave(pl, x0, z0, x1, z1, CHIPS, 'gravel', 0.06);
  for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) path(pl, ax, az, bx, bz, 0.3);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  prop(pl, 'play_structure', cx, cz, 0, 2);
  prop(pl, 'playground_swing', x0 + 5, cz - 4, Math.PI / 2, 1);
  prop(pl, 'playground_swing', x0 + 5, cz + 4, Math.PI / 2, 1);
  prop(pl, 'monkey_bars', x1 - 5, cz - 5, 0, 1);
  prop(pl, 'playground_slide', x1 - 5, cz + 4, -Math.PI / 2, 1);
  prop(pl, 'seesaw', cx - 3, z1 - 3, 0, 1);
  prop(pl, 'kids_slide', cx + 4, z0 + 3, Math.PI, 1);
  for (const x of [x0 - 3, x1 + 3]) prop(pl, 'bench_metal', x, cz, x < cx ? Math.PI / 2 : -Math.PI / 2);
  scatter(pl, rng, ['litter_paper_a', 'litter_paper_b'], x0, z0, x1, z1, 3);
}

/** Blacktop with four-square, hopscotch, a painted map and two hoops; tetherball poles at the edge. */
function blacktop(pl: Placer, x0: number, z0: number, x1: number, z1: number) {
  pave(pl, x0, z0, x1, z1, 0x6c7077);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  for (let i = 0; i < 2; i++) {
    const fx = x0 + 5 + i * 8;
    mark(pl, fx, cz, 6, 0.1);
    mark(pl, fx, cz, 0.1, 6);
    mark(pl, fx, cz - 3, 6, 0.1);
    mark(pl, fx, cz + 3, 6, 0.1);
    mark(pl, fx - 3, cz, 0.1, 6);
    mark(pl, fx + 3, cz, 0.1, 6);
  }
  const hop = [0xe6c13a, 0xb3302a, 0x2f62a8, 0x3f7a46];
  for (let i = 0; i < 8; i++) mark(pl, x0 + 22 + (i % 3 === 1 ? 0 : 0), z0 + 2 + i * 0.9, i % 3 === 1 ? 1.6 : 0.8, 0.8, hop[i % 4]);
  mark(pl, cx + 6, cz, 10, 6, 0x3f7a46, 0, 0.065);
  mark(pl, cx + 6, cz, 7, 3.6, 0x2f62a8, 0, 0.068);
  for (const s of [-1, 1]) prop(pl, 'basketball_hoop', x1 - 1.5, cz + s * 5, -Math.PI / 2, 1);
  for (const x of [x0 + 2, x0 + 6]) prop(pl, 'tetherball', x, z1 + 3, 0, 0.3);
}

const ring = (pl: Placer, rng: Rng, pts: [number, number][], kinds: string[], every = 12) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.floor(Math.hypot(bx - ax, bz - az) / every));
    for (let j = 0; j < n; j++) {
      const t = (j + rng.range(0.3, 0.7)) / n;
      ftree(pl, rng.pick(kinds), ax + (bx - ax) * t + rng.range(-1, 1), az + (bz - az) * t + rng.range(-1, 1), rng.range(0.8, 1.15), rng.range(0, 6));
    }
  }
};

/** Pine Hollow Elementary, west of County Rd 5: front lawn, flag and sign, bus loop, staff lot, playground, blacktop, ball field. */
function elementaryCampus(pl: Placer, rng: Rng) {
  freserve(pl, -64, -134, 64, -2);
  fbuild(pl, def('elementary'), 0, -46, 0, 7101, 'Pine Hollow Elementary', 'civic');
  busLoop(pl, rng, -20, -4, 30);
  carPark(pl, rng, 36, -60, 62, -8, { fill: 0.55, lights: true });
  fentrance(pl, 49, -8, 0, 1, 7, 34);
  prop(pl, 'school_sign_elem', -14, -1.5, 0, 0.5);
  prop(pl, 'flagpole_tall', 12, -26, 0, 0.3);
  for (const x of [-30, -22, 22, 30]) prop(pl, 'bush_round_a', x, -28.6, 0, false);
  path(pl, -32, -24, -32, 3);
  path(pl, -33, -64, -33, -72);
  path(pl, 20, -63, 20, -70);
  lamps(pl, [[-26, -3], [0, -3], [26, -3]]);
  // behind: wood-chip playground by the cafetorium doors, blacktop, picnic tables, ball field with backstop
  playground(pl, rng, -32, -94, -6, -70);
  blacktop(pl, 2, -92, 32, -70);
  for (const x of [-12, -6]) prop(pl, 'picnic_table', x, -66, 0);
  pave(pl, -50, -132, 50, -100, 0x7f9a52, 'paint', 0.03);
  prop(pl, 'backstop', -36, -104, Math.PI / 4, 1);
  pave(pl, -40, -112, -32, -104, 0xa58a64, 'gravel', 0.04);
  fence(pl, 'chain', [[-64, -64], [-64, -134], [64, -134], [64, -64]]);
  ring(pl, rng, [[-62, -10], [-62, -132], [62, -132]], ['maple_large', 'oak_large', 'douglas_fir_medium', 'maple_medium']);
  ring(pl, rng, [[-60, -6], [-34, -6]], ['maple_medium', 'oak_medium'], 9);
}

/** Hollow County High, east of County Rd 5: drop-off loop, side lots, gym behind, stadium with track, stands and lights. */
function highCampus(pl: Placer, rng: Rng) {
  freserve(pl, -68, -214, 68, -2);
  fbuild(pl, def('high_school'), 0, -46, 0, 7201, 'Hollow County High School', 'civic');
  fbuild(pl, def('hs_gym'), 40, -85, 0, 7202);
  busLoop(pl, rng, -24, -6, 30);
  for (const s of [-1, 1]) {
    carPark(pl, rng, s < 0 ? -66 : 34, -30, s < 0 ? -34 : 66, -8, { fill: 0.75, lights: true });
    fentrance(pl, s * 50, -8, 0, 1, 7, 34);
  }
  prop(pl, 'school_sign_high', -14, -1.5, 0, 0.5);
  prop(pl, 'flagpole_tall', -20, -26, 0, 0.3);
  lamps(pl, [[-30, -3], [0, -3], [30, -3]]);
  path(pl, 40, -64, 40, -70, 3);
  path(pl, -20, -64, -20, -118, 2.4);
  // tennis courts beside the gym
  pave(pl, -60, -96, -22, -70, 0x3f6a4a, 'paint', 0.06);
  for (const cx of [-50.5, -31.5]) {
    mark(pl, cx, -83, 0.08, 23.8, WHITE, 0, 0.075);
    for (const s of [-1, 1]) mark(pl, cx + s * 5.5, -83, 0.06, 23.8, WHITE, 0, 0.075);
    for (const s of [-1, 1]) mark(pl, cx, -83 + s * 11.9, 11, 0.06, WHITE, 0, 0.075);
    pl.k.at(...W(cx, -83), frameRy(), () => pl.k.box(0, 0, 0, 12, 0.95, 0.04, 0x222222, 'paint'), fheight(cx, -83));
  }
  fence(pl, 'tall', [[-61, -97], [-61, -69], [-21, -69], [-21, -97], [-61, -97]]);
  // stadium, long axis along the frame x: track, field, yard lines, end zones, posts, stands, press box, lights
  pave(pl, -63, -188, 63, -120, 0xa0523d, 'asphalt', 0.05);
  pave(pl, -56, -181, 56, -127, 0x4f8a3a, 'paint', 0.07);
  const zc = -154;
  for (let i = 0; i <= 12; i++) mark(pl, -54.85 + i * 9.14, zc, 0.15, 48.8, WHITE, 0, 0.085);
  for (const s of [-1, 1]) mark(pl, 0, zc + s * 24.4, 109.7, 0.15, WHITE, 0, 0.085);
  for (const x of [-50.3, 50.3]) mark(pl, x, zc, 8.9, 48.6, 0x7c221f, 0, 0.08);
  mark(pl, 0, zc, 8, 8, 0xd8a93a, Math.PI / 4, 0.082);
  for (let l = 1; l < 6; l++) for (const s of [-1, 1]) mark(pl, 0, zc + s * (26 + l * 1.3), 124, 0.06, WHITE, 0, 0.06);
  for (const x of [-55.2, 55.2]) prop(pl, 'goal_post', x, zc, Math.PI / 2, 0.3);
  prop(pl, 'stadium_bleachers', 0, -116, Math.PI, 3);
  prop(pl, 'stadium_bleachers', 0, -192, 0, 3);
  prop(pl, 'press_box', 0, -105, Math.PI, 2);
  for (const x of [-45, 45]) {
    prop(pl, 'stadium_light', x, -112, Math.PI, 0.6);
    prop(pl, 'stadium_light', x, -196, 0, 0.6);
  }
  prop(pl, 'scoreboard', 30, -205, 0, 0.6);
  fence(pl, 'chain', [[-24, -101], [-66, -101], [-66, -212], [66, -212], [66, -101], [-16, -101]]);
  ring(pl, rng, [[66, -100], [66, -212], [-66, -212], [-66, -100]], ['douglas_fir_tall', 'oak_large', 'maple_large', 'douglas_fir_medium'], 14);
}

export function schools(pl: Placer) {
  const rng = new Rng(7100);
  // the two schools stand at opposite ends of town: the elementary on the highway west of Cedar Ridge,
  // the county high school out past the river bridge on Eastside Rd
  inFrame(-660, 21, Math.PI, () => elementaryCampus(pl, rng));
  inFrame(1139, -110, Math.PI / 2, () => highCampus(pl, rng));
}

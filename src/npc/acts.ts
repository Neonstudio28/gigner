/** Where a beat happens: a spot inside the place, one outside it, a sidewalk some way off, or right here. */
export type Go = 'in' | 'yard' | 'walk' | 'stay';
export interface Beat {
  /** Clip to play (one of several at random). */
  c: string | string[];
  /** Prop in hand for the beat ('' empties the hands). */
  p?: string;
  /** Seconds, for looping clips (one-shots run their length). */
  t?: [number, number];
  go?: Go;
  /** Keeps the prop in hand when the beat ends (carrying it to the next one). */
  keep?: boolean;
  /** Needs a seat: skipped when the spot is not one. */
  sit?: boolean;
}
export interface Act {
  /** What the name tag says. */
  say: string;
  beats: Beat[];
  /** Times to run the list before the act is over. */
  rounds?: [number, number];
}

const S: [number, number] = [5, 9];
const M: [number, number] = [10, 18];
const L: [number, number] = [18, 32];

/** Things done at work. */
export const JOBS: Record<string, Act> = {
  counter: { say: 'minding the counter', beats: [{ c: 'counter', t: L, go: 'in' }, { c: ['talk_a', 'nod', 'idle_shift'], t: S }, { c: 'counter', t: M }] },
  tidy: { say: 'tidying up', beats: [{ c: 'wipe', t: M, go: 'in' }, { c: 'look_around', t: S }, { c: 'wipe', t: M, go: 'in' }] },
  sweep: { say: 'sweeping the front step', beats: [{ c: 'sweep', p: 'broom', t: L, go: 'yard' }, { c: ['stretch', 'look_around'], t: S }, { c: 'sweep', p: 'broom', t: M }] },
  stock: { say: 'bringing in stock', beats: [{ c: 'pickup', p: 'box', go: 'yard', keep: true }, { c: 'putdown', p: 'box', go: 'in' }, { c: ['scratch_head', 'idle'], t: S }], rounds: [1, 3] },
  ledger: { say: 'doing the books', beats: [{ c: 'write', p: 'clipboard', t: L, go: 'in' }, { c: ['scratch_head', 'idle_shift'], t: S }] },
  smoke: { say: 'on a smoke break', beats: [{ c: 'smoke', p: 'cigarette', t: L, go: 'yard' }, { c: ['look_around', 'stretch'], t: S }] },
  cook: { say: 'cooking', beats: [{ c: 'counter', t: M, go: 'in' }, { c: 'wipe', t: S }, { c: 'serve', p: 'tray', t: S }, { c: 'counter', t: M }] },
  serve: { say: 'waiting tables', beats: [{ c: 'serve', p: 'tray', t: S, go: 'in' }, { c: ['talk_a', 'nod'], t: S }, { c: 'serve', p: 'tray', t: S, go: 'in' }, { c: 'write', p: 'clipboard', t: S }], rounds: [1, 3] },
  desk: { say: 'at the desk', beats: [{ c: 'write', p: 'clipboard', t: L, go: 'in' }, { c: ['idle_shift', 'stretch', 'scratch_head'], t: S }, { c: 'phone', p: 'phone', t: M }] },
  phone: { say: 'on the phone', beats: [{ c: 'phone', p: 'phone', t: L, go: 'in' }, { c: ['nod', 'shrug'] }] },
  chat: { say: 'catching up', beats: [{ c: ['look_around', 'hips'], t: S, go: 'yard' }, { c: ['talk_a', 'talk_b'], t: M }, { c: 'laugh', t: [2, 3] }] },
  watch: { say: 'keeping an eye out', beats: [{ c: ['hips', 'cross'], t: M, go: 'yard' }, { c: 'look_around', t: S }, { c: ['cross', 'watch'], t: M }] },
  patrol: { say: 'on patrol', beats: [{ c: ['hips', 'look_around'], t: S, go: 'walk' }, { c: 'watch' }, { c: ['cross', 'hips'], t: S, go: 'walk' }], rounds: [1, 2] },
  ticket: { say: 'writing a ticket', beats: [{ c: 'look_around', t: S, go: 'walk' }, { c: 'write', p: 'clipboard', t: M }, { c: 'nod' }] },
  fix: { say: 'fixing something', beats: [{ c: 'hammer', p: 'hammer', t: M, go: 'yard' }, { c: ['scratch_head', 'look_around'], t: S }, { c: 'hammer', p: 'hammer', t: M }, { c: 'wipe', t: S }] },
  rake: { say: 'raking', beats: [{ c: 'rake', p: 'rake', t: L, go: 'yard' }, { c: ['stretch', 'hips'], t: S }, { c: 'rake', p: 'rake', t: M }] },
  garden: { say: 'weeding', beats: [{ c: 'garden', t: L, go: 'yard' }, { c: 'stretch' }, { c: 'garden', t: M, go: 'yard' }] },
  haul: { say: 'hauling', beats: [{ c: 'pickup', p: 'box', go: 'yard', keep: true }, { c: 'putdown', p: 'box', go: 'yard' }, { c: ['hips', 'idle'], t: S }], rounds: [2, 4] },
  fish: { say: 'fishing', beats: [{ c: 'fish', p: 'fishing_rod', t: [40, 80], go: 'yard' }, { c: ['look_around', 'stretch'], t: S }] },
  rounds: { say: 'on the rounds', beats: [{ c: 'putdown', p: 'shopping_bag', go: 'walk', keep: true }, { c: ['nod', 'wave'] }], rounds: [4, 7] },
  pray: { say: 'at prayer', beats: [{ c: 'idle', t: L, go: 'in' }, { c: 'nod' }] },
  read: { say: 'reading', beats: [{ c: 'write', p: 'newspaper', t: L, go: 'in' }, { c: 'idle_shift', t: S }] },
};

/** Things done with free time; the key is the goal the brain picked. */
export const LEISURE: Record<string, Act> = {
  shop: { say: 'shopping', beats: [{ c: 'look_around', t: S, go: 'in' }, { c: 'pickup' }, { c: ['idle_shift', 'scratch_head'], t: S, go: 'in' }, { c: 'counter', t: S, go: 'in' }, { c: 'nod' }] },
  eat: { say: 'getting a bite', beats: [{ c: 'counter', t: S, go: 'in' }, { c: 'drink_stand', p: 'coffee_cup', t: L, go: 'in' }, { c: ['talk_a', 'look_around'], t: S }] },
  bar: { say: 'having a drink', beats: [{ c: 'counter', t: S, go: 'in' }, { c: 'drink_stand', p: 'coffee_cup', t: L, go: 'in' }, { c: ['talk_b', 'laugh', 'lean'], t: M }, { c: 'drink_stand', p: 'coffee_cup', t: M }] },
  bench: { say: 'sitting a while', beats: [{ c: ['sit', 'sit_read', 'sit_drink'], t: [30, 70], go: 'yard', sit: true }, { c: 'stretch' }] },
  park: { say: 'on the green', beats: [{ c: ['hips', 'look_around', 'idle_shift'], t: M, go: 'yard' }, { c: ['stretch', 'phone'], t: S }] },
  beach: { say: 'at the beach', beats: [{ c: ['hips', 'look_around'], t: M, go: 'yard' }, { c: ['point', 'stretch', 'wave'] }, { c: ['cross', 'idle_shift'], t: M }, { c: 'text', p: 'phone_r', t: S }] },
  pier: { say: 'watching the lake', beats: [{ c: ['hips', 'cross'], t: M, go: 'yard' }, { c: 'point' }, { c: 'look_around', t: M }] },
  angle: { say: 'fishing off the pier', beats: [{ c: 'fish', p: 'fishing_rod', t: [50, 90], go: 'yard' }, { c: 'stretch' }] },
  play: { say: 'playing', beats: [{ c: 'cheer', t: [2, 4], go: 'yard' }, { c: ['clap', 'laugh'], t: [2, 4], go: 'yard' }, { c: ['wave', 'point'], go: 'yard' }], rounds: [2, 5] },
  hang: { say: 'hanging out', beats: [{ c: ['text', 'cross'], p: 'phone_r', t: M, go: 'yard' }, { c: ['laugh', 'shrug', 'look_around'], t: [3, 5] }, { c: ['hips', 'idle_shift'], t: M }] },
  stroll: { say: 'out for a walk', beats: [{ c: ['look_around', 'idle_shift'], t: S, go: 'walk' }, { c: ['stretch', 'watch', 'scratch_head'] }], rounds: [1, 3] },
  jog: { say: 'out for a run', beats: [{ c: 'stretch', go: 'walk' }, { c: ['hips', 'idle'], t: [3, 5], go: 'walk' }], rounds: [2, 4] },
  sights: { say: 'seeing the sights', beats: [{ c: 'point', go: 'walk' }, { c: 'text', p: 'phone_r', t: S }, { c: 'look_around', t: S, go: 'walk' }], rounds: [1, 3] },
  church: { say: 'at church', beats: [{ c: 'idle', t: L, go: 'in' }, { c: 'nod' }, { c: ['talk_a', 'listen'], t: M, go: 'yard' }] },
  visit: { say: 'dropping in on a friend', beats: [{ c: 'wait', t: S, go: 'yard' }, { c: ['wave', 'nod'] }, { c: ['talk_a', 'talk_b'], t: M }] },
  home: { say: 'at home', beats: [{ c: ['idle', 'idle_shift'], t: L, go: 'in' }, { c: ['wipe', 'stretch', 'phone'], t: M, go: 'in' }, { c: 'look_around', t: S }] },
  yard: { say: 'out in the yard', beats: [{ c: 'rake', p: 'rake', t: L, go: 'yard' }, { c: 'stretch' }, { c: 'garden', t: M, go: 'yard' }] },
  sleep: { say: 'asleep', beats: [{ c: 'idle', t: [60, 120], go: 'in' }] },
  school: { say: 'in class', beats: [{ c: ['idle', 'idle_shift'], t: [40, 80], go: 'in' }, { c: 'write', p: 'clipboard', t: L }] },
  shelter: { say: 'waiting out the rain', beats: [{ c: ['huddle', 'wait', 'cross'], t: L, go: 'in' }, { c: 'look_sky' }] },
};

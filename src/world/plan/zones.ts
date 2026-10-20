import * as THREE from 'three';
import type { BuildingDef } from '../buildings/catalog';
import type { Col } from '../core/kit';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import type { Road } from '../roads/network';
import { HOUSES } from '../buildings/houses';
import { STRIP } from '../buildings/strip90s';
import { CIVIC } from '../buildings/civic2';
import { brickStore, donutShop, diner, woodStore, postOffice, gasStation, autoService } from '../buildings/commercial';
import { theater, falseFront, gazebo, statue, policeStation, fireStation, texOutpost, burgerBarn, library } from '../buildings/downtown';
import { motel, motelOffice, motelPylon, church, warehouse, waterTower, windmill, roadsideBillboard, welcomeSign } from '../buildings/civic';
import { barn, farmhouse, salesOffice, shed, colonial } from '../buildings/homes';
import { flagPole } from '../buildings/common';
import { substation, transmissionLine } from '../infrastructure';
import { dairyFarm, hayFarm, orchardFarm, setFarmHooks, FARMS } from '../farms';
import * as pr from '../props';
import { person, crowd, randomPerson, deputy } from '../people';
import type { SignId } from '../signs';
import { panelSign } from '../textures';
import { heightAt, farHeight, LAKE, addFlatPad } from '../terrain';
import { CAR_COLORS, P, SIDING_COLORS } from '../palette';
import { vehicle as vehicleFn, type VehicleType } from '../vehicles';

const PI = Math.PI;
const byId = new Map<string, BuildingDef>([...HOUSES, ...STRIP, ...CIVIC].map((d) => [d.id, d]));
const D = (id: string) => byId.get(id);

/** Wraps a legacy builder (c, x, z, ry) as a catalog def. */
const legacy = (id: string, w: number, d: number, fn: (c: Parameters<BuildingDef['build']>[0], x: number, z: number, ry: number) => void, front?: number): BuildingDef => ({
  id,
  name: id,
  w,
  d,
  front,
  tags: [],
  build: (c, x, z, ry) => fn(c, x, z, ry),
});

/** Brick main-street store of a given width/depth and sign. */
function store(sign: SignId, w: number, d: number, o: Partial<Parameters<typeof brickStore>[1]> = {}): BuildingDef {
  return { id: `store-${sign}`, name: sign, w, d, tags: ['downtown'], build: (c, x, z, ry) => brickStore(c, { x, z, ry, w, d, sign, ...o }) };
}

function housePool(tags: string[], exclude: string[] = []): BuildingDef[] {
  return HOUSES.filter((h) => h.tags.some((t) => tags.includes(t)) && !exclude.includes(h.id));
}

/** Fallback houses when the catalog is empty or lacks a style. */
const LEGACY_HOUSES: BuildingDef[] = [
  { id: 'legacyColonial', name: 'colonial', w: 12, d: 14, front: 5, tags: ['historic', 'suburban'], build: (c, x, z, ry, seed) => colonial(c, x, z - 1.5, ry, { color: SIDING_COLORS[seed % SIDING_COLORS.length], porch: 'portico' }) },
];

// ------------------------------------------------------------------ downtown
function fillRow(pl: Placer, r: Road, side: 1 | -1, s0: number, s1: number, defs: BuildingDef[], setback = 0.4) {
  const total = defs.reduce((a, d) => a + d.w, 0);
  const scale = Math.min(1.12, (s1 - s0) / total);
  let s = s0 + Math.max(0, (s1 - s0 - total * scale) / 2);
  for (const d of defs) {
    const w = d.w * scale;
    const def: BuildingDef = d.id.startsWith('store-') ? { ...d, w, build: (c, x, z, ry, seed) => brickStore(c, { x, z, ry, w, d: d.d, sign: d.name as SignId, ...(storeOpts.get(d) ?? {}) }) } : d;
    const f = pl.net.frontage(r, s + w / 2, side, r.full + setback + def.d / 2);
    pl.force(def, f.x, f.z, f.ry, (pl.rng.next() * 1e6) | 0, { foundation: false });
    s += w;
  }
}
const storeOpts = new WeakMap<BuildingDef, Partial<Parameters<typeof brickStore>[1]>>();
function st(sign: SignId, w: number, d: number, o: Partial<Parameters<typeof brickStore>[1]> = {}) {
  const def = store(sign, w, d, o);
  storeOpts.set(def, o);
  return def;
}

function blockSpan(pl: Placer, r: Road, x0: number, x1: number) {
  // Bank/Cedar are straight along x starting at x = -300, so s = x + 300
  void pl;
  void r;
  return [x0 + 300, x1 + 300] as const;
}

export function downtown(pl: Placer) {
  const net = pl.net;
  const bank = net.byName('Bank St');
  const cedar = net.byName('Cedar St');
  const blocks: [number, number][] = [
    [-299, -263.2],
    [-246.8, -182.5],
    [-157.4, -97.5],
    [-72.4, -12.5],
    [12.5, 72.5],
    [97.5, 157.5],
    [182.5, 246.8],
    [263.2, 299],
  ];
  const span = (i: number, r: Road) => blockSpan(pl, r, blocks[i][0], blocks[i][1]);
  const courthouse = D('courthouse');
  // ---- Bank St, north side (fronts face south onto Bank)
  const N = 1 as const;
  fillRow(pl, bank, N, ...span(0, bank), [legacy('dons', 17, 18, (c, x, z, ry) => donutShop(c, x, z + 0, ry)), st('gazette', 14, 18, { stories: 2, wall: 'brickTan', fireEscape: true })]);
  if (courthouse) {
    const [a, b] = span(1, bank);
    const f = net.frontage(bank, (a + b) / 2, N, bank.full + 0.8 + courthouse.d / 2);
    pl.force(courthouse, f.x, f.z, f.ry, 11);
  }
  fillRow(pl, bank, N, ...span(2, bank), [
    legacy('theater', 18, 26, (c, x, z, ry) => theater(c, x, z, ry, 24)),
    st('hotel', 17, 22, { stories: 3, wall: 'brickDark', awning: 'awningGreen', fireEscape: true, roofSign: 'hotelRoof', planters: true }),
    st('cafe', 14, 18, { wall: 'brickPaint', wallColor: 0xf3e9d2, awning: 'awningRed', seating: 0xc8262c }),
    st('books', 12, 18, { stories: 2, eyebrow: true }),
  ]);
  fillRow(pl, bank, N, ...span(3, bank), [
    st('bank', 30, 24, { stories: 2, eyebrow: true, billboard: true, sideWindows: 1, chimneys: 2, fireEscape: true }),
    st('market24', 22, 20, { stories: 2, blade: 'liquor', trim: 0xd9cdb6, fireEscape: true }),
  ]);
  fillRow(pl, bank, N, ...span(4, bank), [
    st('fruit', 16, 18, { wall: 'brickPaint', awning: 'awningRed', produce: true }),
    st('pawn', 15, 18, { wall: 'brickTan', trim: 0xf0e8d8 }),
    st('pizza', 15, 18, { awning: 'awningGreen', seating: 0x1f5a34, neon: 'neonOpen' }),
    st('barber', 12, 18, { wall: 'brickPaint', wallColor: 0xe9eef5, barber: true }),
  ]);
  fillRow(pl, bank, N, ...span(5, bank), [
    st('fiveDime', 14, 20, { stories: 2, awning: 'awningRed', fireEscape: true }),
    st('sporting', 15, 20, { wall: 'brickTan' }),
    st('drugs', 14, 20, { stories: 2, wall: 'brickBrown', planters: true, eyebrow: true }),
    st('realty', 15, 20, { stories: 2, wall: 'brickPaint' }),
  ]);
  fillRow(pl, bank, N, ...span(6, bank), [
    st('chinese', 16, 18, { wall: 'brickPaint', wallColor: 0xf6e6c8, awning: 'awningRed', neon: 'neonOpen' }),
    st('bakery', 13, 18, { wall: 'brickPaint', wallColor: 0xfbe9ee, awning: 'awningRed', seating: 0x8c2f4f }),
    st('laundromat', 12, 18, { wall: 'stucco', wallColor: 0xdfe9ee, neon: 'neonOpen' }),
    st('western', 15, 18, { stories: 2, wall: 'brickBrown', eyebrow: true }),
  ]);
  fillRow(pl, bank, N, ...span(7, bank), [legacy('antiques', 14, 17, (c, x, z, ry) => falseFront(c, x, z - 1.5, ry, { w: 14, d: 14, sign: 'antiques', color: 0x7a5a3c, balcony: true })), st('florist', 15, 17, { wall: 'stucco', wallColor: 0xe9e1cf, awning: 'awningGreen', planters: true })]);

  // ---- Bank St, south side (17 m deep to the alley)
  const S = -1 as const;
  fillRow(pl, bank, S, ...span(0, bank), [legacy('diner', 18, 14, (c, x, z, ry) => diner(c, x, z, ry)), st('icecream', 16, 16, { wall: 'brickPaint', wallColor: 0xfff0f4, awning: 'awningBlue', seating: 0x6bc3c9 })]);
  fillRow(pl, bank, S, ...span(1, bank), [
    legacy('postoffice', 16, 16, (c, x, z, ry) => postOffice(c, x, z - 1, ry)),
    st('steakhouse', 20, 16, { wall: 'brickDark', awning: 'awningGreen', planters: true, chimneys: 2 }),
    legacy('tavern', 17, 16, (c, x, z, ry) => falseFront(c, x, z - 1.5, ry, { w: 17, d: 13, sign: 'tavern', color: 0x6a4a32, balcony: true })),
  ]);
  fillRow(pl, bank, S, ...span(2, bank), [st('hardware', 18, 16, { wall: 'brickRed', awning: 'awningRed' }), st('gun', 14, 16, { wall: 'brickTan' }), st('feed', 16, 16, { wall: 'brickBrown' }), st('pawn', 12, 16, { wall: 'brickPaint', wallColor: 0xe8e2d0 })]);
  fillRow(pl, bank, S, ...span(3, bank), [st('grocery', 26, 16, { wall: 'brickPurple', awning: 'awningGreen' }), st('cafe', 14, 16, { wall: 'brickPaint', wallColor: 0xf0e8d6, seating: 0x2f6b4a }), st('books', 14, 16, { wall: 'brickTan' })]);
  fillRow(pl, bank, S, ...span(4, bank), [st('drugs', 15, 16, { wall: 'brickRed' }), st('market24', 16, 16, { wall: 'brickDark', blade: 'liquor' }), st('barber', 11, 16, { wall: 'brickPaint', barber: true }), st('gazette', 15, 16, { wall: 'brickTan' })]);
  fillRow(pl, bank, S, ...span(5, bank), [st('pizza', 15, 16, { wall: 'brickPaint', wallColor: 0xf6eedd, awning: 'awningRed', seating: 0xc8262c }), st('sporting', 16, 16, { wall: 'brickBrown' }), st('realty', 14, 16, { wall: 'stucco', wallColor: 0xe8e4d8 }), st('fiveDime', 15, 16)]);
  fillRow(pl, bank, S, ...span(6, bank), [st('western', 16, 16, { wall: 'brickTan' }), st('bakery', 14, 16, { wall: 'brickPaint', awning: 'awningBlue' }), st('hardware', 16, 16, { wall: 'brickDark' }), st('chinese', 14, 16, { wall: 'brickRed', awning: 'awningGreen' })]);
  fillRow(pl, bank, S, ...span(7, bank), [st('laundromat', 15, 16, { wall: 'stucco', wallColor: 0xdfe9ee }), st('steakhouse', 16, 16, { wall: 'brickBrown' })]);

  // ---- Cedar St north side: offices and shops (17 m deep)
  for (let i = 1; i < 7; i++) {
    const picks: BuildingDef[] =
      i === 3 && D('lawOffice')
        ? [D('lawOffice')!, st('realty', 14, 16, { stories: 2, wall: 'brickTan' }), st('barber', 12, 16, { barber: true })]
        : [st(pl.rng.pick(['gazette', 'realty', 'books', 'florist', 'antiques', 'sporting'] as const), 15, 16, { stories: pl.rng.chance(0.5) ? 2 : 1, wall: pl.rng.pick(['brickRed', 'brickTan', 'brickBrown', 'brickPaint']) }), st(pl.rng.pick(['cafe', 'bakery', 'drugs', 'fiveDime', 'western'] as const), 14, 16, { wall: pl.rng.pick(['brickRed', 'brickTan', 'stucco']) }), st(pl.rng.pick(['laundromat', 'pawn', 'hardware', 'gun'] as const), 14, 16, { wall: pl.rng.pick(['brickDark', 'brickPaint']) })];
    fillRow(pl, cedar, N, ...span(i, cedar), picks);
  }
  // ---- Cedar St south side: civic buildings, each on its own block
  const civicAt = (i: number, def: BuildingDef | undefined, seed: number) => {
    if (!def) return;
    const [a, b] = span(i, cedar);
    const f = net.frontage(cedar, (a + b) / 2, S, cedar.full + 1.2 + def.d / 2);
    pl.force(def, f.x, f.z, f.ry, seed);
  };
  civicAt(1, D('carnegieLibrary') ?? legacy('library', 16, 18, (c, x, z, ry) => library(c, x, z - 1.5, ry)), 21);
  civicAt(2, D('catholicChurch') ?? legacy('church', 16, 32, (c, x, z, ry) => church(c, x, z - 8, ry)), 22);
  civicAt(3, legacy('fireStation', 30, 18, (c, x, z, ry) => fireStation(c, x, z, ry)), 23);
  civicAt(4, D('townHall'), 24);
  civicAt(5, D('funeralHome'), 25);
  civicAt(6, D('sheriffJail'), 26);

  // ---- River St: Heritage Park and the old depot between the street and the river
  const river = net.byName('River St');
  const depot = D('trainDepot');
  if (depot) pl.along(river, 1, 330, 470, () => depot, { setback: 1, maxSlope: 3, gap: 999 });
  const park = net.frontage(river, 290, 1, river.full + 9);
  const pk = pl.k;
  pk.at(0, 0, 0, () => {
    gazebo(pl.c, park.x, park.z);
    statue(pl.c, park.x + 18, park.z + 2, park.ry);
    for (let i = -2; i <= 2; i++) {
      const f = net.frontage(river, 290 + i * 14, 1, river.full + 2.4);
      pr.bench(pk, f.x, f.z, f.ry);
      pr.acornLamp(pk, f.x + 3, f.z);
    }
    flagPole(pk, pl.c.signs, park.x - 14, park.z, 11);
  }, park.y);
  pl.grassPatches.push({ x: park.x, z: park.z, w: 80, d: 16, n: 60 });

  // ---- town-wide landmarks on the hills
  const wt = D('waterTower');
  if (wt) pl.force(wt, -60, 300, PI, 31);
}

// ------------------------------------------------------------------ neighbourhoods
function pickFrom(pool: BuildingDef[], weights?: number[]) {
  return (rng: Rng) => {
    if (!pool.length) return LEGACY_HOUSES[0];
    if (!weights) return rng.pick(pool);
    let t = rng.next() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) if ((t -= weights[i]) <= 0) return pool[i];
    return pool[pool.length - 1];
  };
}

export function neighbourhoods(pl: Placer) {
  const net = pl.net;
  const oldTown = housePool(['victorian', 'historic']);
  const suburb = housePool(['postwar', 'suburban'], ['victorianQueenAnne', 'minersCottage']);
  const lake = housePool(['lake', 'cabin']);
  const rural = housePool(['rural']);
  const trailer = housePool(['trailer']);
  const opts = { driveway: true, mailbox: true, foundation: true };
  // Old Town (Victorian/miner's cottages climbing the south hill)
  for (const name of ['Pine St', 'King St', 'Buena Vista Ave', 'Hill St', 'Mullan Ave', '2nd St', '8th St', '3rd St', '4th St', '5th St', '6th St', '7th St', 'Placer Creek Rd']) {
    const r = net.byName(name);
    for (const side of [1, -1] as const) pl.along(r, side, 8, r.length - 8, pickFrom(oldTown.length ? oldTown : LEGACY_HOUSES), { ...opts, setback: 4.5, gap: 3, jitter: 1.2, maxSlope: 9 });
    if (r.def.culdesac) pl.bulb(r, pickFrom(oldTown.length ? oldTown : LEGACY_HOUSES), 4, opts);
  }
  // Silver Heights (post-war ranches, split-levels, Cape Cods; cul-de-sacs)
  for (const name of ['Silver Heights Dr', 'Aspen Ct', 'Birch Ct', 'Cedar Ct', 'Larch Ct', 'Juniper Ct', 'Ponderosa Way', 'Elm Crescent', 'Spruce Ct']) {
    const r = net.byName(name);
    for (const side of [1, -1] as const) pl.along(r, side, 10, r.length - 6, pickFrom(suburb.length ? suburb : LEGACY_HOUSES), { ...opts, setback: 7, gap: 5, jitter: 1.5 });
    if (r.def.culdesac) pl.bulb(r, pickFrom(suburb.length ? suburb : LEGACY_HOUSES), 5, opts);
  }
  // Riverside Mobile Home Park
  const rl = net.byName('Riverside Ln');
  for (const side of [1, -1] as const) pl.along(rl, side, 12, rl.length - 12, pickFrom(trailer.length ? trailer : LEGACY_HOUSES), { ...opts, setback: 2.5, gap: 4, car: 0.7 });
  // lake cabins on the shore side of Lake Rd, a few uphill
  const lr = net.byName('Lake Rd');
  const cabins = lake.length ? lake : LEGACY_HOUSES;
  const n0 = pl.placed;
  pl.along(lr, -1, 330, lr.length - 60, pickFrom(cabins), { ...opts, setback: 6, gap: 14, jitter: 3 });
  pl.along(lr, 1, 330, lr.length - 60, pickFrom([...cabins, ...rural]), { ...opts, setback: 8, gap: 26, jitter: 4 });
  void n0;
  // rural homes along the old highway
  for (const name of ['Old US-10 W', 'Old US-10 E']) {
    const r = net.byName(name);
    for (const side of [1, -1] as const) pl.along(r, side, 40, r.length - 60, pickFrom([...(rural.length ? rural : LEGACY_HOUSES), ...(trailer.length ? trailer : [])]), { ...opts, setback: 14, gap: 70, jitter: 6 });
  }
}

// ------------------------------------------------------------------ strip, civic and services
export function strip(pl: Placer) {
  const net = pl.net;
  const front = net.byName('Front St');
  const north = ['rewindVideo', 'stripMall', 'bowlORama', 'thriftyMart', 'driveIn', 'carDealer', 'truckStop'].map(D).filter(Boolean) as BuildingDef[];
  const south = [
    D('cluckers'),
    D('bigBun'),
    legacy('gas86', 42, 36, (c, x, z, ry) => gasStation(c, x, z - 1, ry)),
    D('tacoShack'),
    D('pizzaPalace'),
    D('dairyDream'),
    D('carWash'),
    legacy('policeStation', 28, 25, (c, x, z, ry) => policeStation(c, x, z - 2.5, ry)),
    D('motel2'),
    legacy('burgerBarn', 26, 18, (c, x, z, ry) => burgerBarn(c, x, z, ry)),
    D('roadsideGas'),
    legacy('autoService', 20, 21, (c, x, z, ry) => autoService(c, x, z, ry)),
  ].filter(Boolean) as BuildingDef[];
  let ni = 0;
  pl.along(front, 1, 6, front.length - 20, () => north[ni++] ?? null, { setback: 1.5, gap: 6, maxSlope: 2.5 });
  let si = 0;
  pl.along(front, -1, 6, front.length - 20, () => south[si++] ?? null, { setback: 1.5, gap: 5, maxSlope: 2.5 });
  // Cascade Motor Inn + Bob's Used Cars + Tex Outpost on the old highway east of the exit
  const e = net.byName('Old US-10 E');
  const extra: BuildingDef[] = [
    legacy('cascadeInn', 70, 26, (c, x, z, ry) => {
      c.kit.at(x, z, ry, () => {
        c.kit.box(0, 0, 3, 70, 0.04, 20, 0x6f737b, 'asphalt', { cast: false });
      });
      const [mx, mz] = Placer.world(x, z, ry, 6, -6);
      motel(c, mx, mz, ry, 12);
      const [ox, oz] = Placer.world(x, z, ry, -28, 2);
      motelOffice(c, ox, oz, ry);
      const [px, pz] = Placer.world(x, z, ry, -32, 11.5);
      motelPylon(c, px, pz, ry);
    }),
    legacy('bobsCars', 64, 46, (c, x, z, ry) => bobsCars(c, x, z, ry)),
    legacy('tex', 42, 33, (c, x, z, ry) => texOutpost(c, x, z, ry)),
  ];
  let ei = 0;
  pl.along(e, -1, 60, 520, () => extra[ei++] ?? null, { setback: 2, gap: 12, maxSlope: 3 });
  if (pl.skipped.length) console.info('[layout] skipped:', [...new Set(pl.skipped)].join(', '));
}

function bobsCars(c: Parameters<BuildingDef['build']>[0], x: number, z: number, ry: number) {
  const k = c.kit;
  c.occ.add(x, z, 64, 46, ry, 0.5, false);
  k.at(x, z, ry, () => {
    k.plane(0, 0.03, 0, 64, 46, 0x977757, 'gravel');
    const rng = new Rng(77);
    for (let i = 0; i < 160; i++) k.box(rng.range(-31, 31), 0.03, rng.range(-22, 22), 0.25, 0.1, 0.2, 0x9a7a58, 'paint', { ry: rng.range(0, 3), cast: false });
    salesOffice(c, ...Placer.world(x, z, ry, 22, -16), ry);
    const poles: THREE.Vector3[] = [];
    for (const [px, pz] of [
      [-30, 21],
      [0, 21],
      [30, 21],
      [30, -6],
      [-30, -6],
    ]) {
      k.solid(px, pz, 0.4, 0.4);
      k.cyl(px, 0, pz, 0.12, 0.15, 7, 7, P.woodPole);
      poles.push(k.toWorld(px, 6.8, pz));
    }
    for (let i = 0; i < poles.length - 1; i++) pr.bunting(k, poles[i], poles[i + 1], rng);
    const lot: [VehicleType, number, number, number, object?][] = [
      ['pickup', -24, 12, 0xe8e2cf],
      ['sedan', -17, 12, 0x2f4a3d],
      ['jeep', -10, 12, 0xd9902a],
      ['pickup', -3, 12, 0xa62e2a, { accent: 0xf2f1ec }],
      ['van', 4, 12, 0xe4dbc3],
      ['suv', 11, 12, 0x8a8f94],
      ['coupe', -24, -2, 0x1c1c1e],
      ['sedan', -10, -2, 0xc6b28c],
      ['wagon', 4, -2, 0x5e3d2a, { woody: true }],
      ['semi', -6, -14, 0x1d1d1f, { accent: 0xd9d9d6 }],
    ];
    for (const [t, lx, lz, col, o] of lot) {
      k.solid(lx, lz, 2.1, t === 'semi' ? 7.5 : 5.4);
      vehicleFn(k, c.signs, t, lx, lz, -PI / 2, col, (o ?? {}) as never);
    }
    pr.tireStack(k, 26, -2, 4);
    pr.tireStack(k, 27, -3, 3);
    person(k, 2, 5, PI * 0.8, { shirt: 0xf2efe6, pants: 0x1f1f22, skin: 0xf0c9a8, hair: 0x5a3a22, point: true });
    person(k, 3.4, 3.8, -0.6, { shirt: 0x6b4a33, pants: 0x2a3348, skin: 0xd8a47f, hair: 0x2a1f17, hat: 'cowboy' });
  });
}

export function civic(pl: Placer) {
  const net = pl.net;
  // hospital at the end of Hospital Dr
  const hosp = D('hospital');
  if (hosp) {
    const r = net.byName('Hospital Dr');
    const e = r.pts[r.pts.length - 1];
    pl.force(hosp, e.x, e.z + hosp.d / 2 - 2, PI, 41);
  }
  // high school + football field between Old US-10 and the river
  const hs = D('highSchool');
  const ff = D('footballField');
  const school = net.byName('School Rd');
  if (hs) {
    const e = school.pts[school.pts.length - 1];
    pl.put(hs, e.x - 30, e.z - hs.d / 2 + 6, PI, 42, { maxSlope: 3 }) || pl.force(hs, e.x - 30, e.z - hs.d / 2 + 6, PI, 42);
  }
  if (ff) pl.put(ff, -420, -150, PI / 2 + 0.05, 43, { maxSlope: 3 }) || pl.put(ff, -400, -140, PI / 2, 43, { maxSlope: 4 });
  // elementary school inside the Silver Heights loop
  const es = D('elementarySchool');
  if (es) {
    const r = net.byName('Silver Heights Dr');
    pl.along(r, -1, 120, 360, () => es, { setback: 4, maxSlope: 3, gap: 9999 });
  }
  // radio station on Silver Crown Rd, mine at the end of Mine Rd
  const radio = D('radioStation');
  if (radio) pl.force(radio, 1078, -318, PI * 0.95, 44);
  const mine = D('mineHeadframe');
  if (mine) pl.force(mine, -858, -500, PI * 0.12, 45, { foundation: false });
  // a little park + ball field in Silver Heights
  pl.trees.push({ kind: 'oak', x: -660, z: 30, s: 1.1 }, { kind: 'oak', x: -720, z: 60, s: 1 }, { kind: 'pine', x: -760, z: 0, s: 1.1 });
}

// ------------------------------------------------------------------ lake marina, docks and boats
function boat(k: Placer['k'], x: number, z: number, ry: number, color: Col, y: number) {
  k.at(
    x,
    z,
    ry,
    () => {
      const s = new THREE.Shape();
      s.moveTo(-2.6, 0.9);
      s.lineTo(2.2, 0.9);
      s.quadraticCurveTo(3.2, 0.85, 3.4, 0.6);
      s.lineTo(2.4, 0.05);
      s.lineTo(-2.6, 0.15);
      s.closePath();
      k.extrude(s, 2.0, color, 'gloss', 0, -0.35, 0);
      k.box(-0.4, 0.55, 0, 3.6, 0.08, 1.7, 0xe9e5da, 'planks');
      k.box(0.6, 0.6, 0, 0.8, 0.45, 1.5, 0x2c3a48, 'glass');
      k.box(-2.7, 0.4, 0, 0.35, 0.6, 0.35, 0x2a2a2a, 'metal');
    },
    y,
  );
}

export function lakeside(pl: Placer) {
  const k = pl.k;
  const lr = pl.net.byName('Lake Rd');
  const e = lr.pts[lr.pts.length - 1];
  const cx = e.x + e.tx * 6;
  const cz = e.z + e.tz * 6;
  const rng = new Rng(808);
  // marina: boathouse, long dock with slips and boats (east of the bulb, into the lake)
  const shoreX = LAKE.x - LAKE.rx * Math.sqrt(Math.max(0, 1 - ((cz - LAKE.z) / LAKE.rz) ** 2));
  const y = LAKE.level + 0.9;
  const bx = shoreX - 10;
  pl.c.occ.add(bx, cz, 16, 12, 0, 1);
  k.at(bx, cz, -PI / 2, () => {
    k.box(0, 0, 0, 14, 4.2, 10, 0x8a5a3c, 'boards');
    k.roof(0, 4.2, 0, 14, [[5, 0], [0, 2.4], [-5, 0]], 0x2f4a3a, 'roofMetal', { trim: 0xf2efe8, fill: 0x8a5a3c, fillMat: 'boards' });
    k.box(0, 0, 5.02, 6, 3.2, 0.08, 0xe9e8e4, 'rollup');
    k.sign(0, 5.6, 5.1, 7, 1.2, pl.c.signs.custom('marina', () => panelSign(1024, 200, '#1f4f6b', [{ text: 'SPIRIT LAKE MARINA', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.55, size: 0.6 }], { border: '#ffffff', borderW: 8 })), {});
  }, heightAt(bx, cz));
  const dock = (x0: number, z0: number, len: number, dir: number) => {
    const dx = Math.cos(dir);
    const dz = -Math.sin(dir);
    k.at(x0 + dx * len * 0.5, z0 + dz * len * 0.5, dir, () => {
      k.box(0, y - 0.15, 0, len, 0.15, 2.2, 0xa98a62, 'planks', { cast: false });
      for (let i = 0; i <= len / 3; i++) for (const s of [-1, 1]) k.cyl(-len / 2 + i * 3, LAKE.level - 2, s * 1.0, 0.12, 0.12, 2.9, 6, 0x6b5340);
    });
  };
  dock(shoreX - 2, cz, 46, 0);
  for (let i = 0; i < 4; i++) {
    const px = shoreX + 10 + i * 9;
    dock(px, cz + 1, 10, -PI / 2);
    dock(px, cz - 1, 10, PI / 2);
    boat(k, px + 4, cz + 7, PI / 2, rng.pick([0xf2f1ec, 0xc8262c, 0x2c4a8c, 0xe6c229]), LAKE.level + 0.15);
    if (rng.chance(0.6)) boat(k, px + 4, cz - 7, -PI / 2, rng.pick([0xf2f1ec, 0x2f6b4a, 0xd27d2c]), LAKE.level + 0.15);
  }
  // private docks for shoreline cabins
  for (let s = 360; s < lr.length - 70; s += 70) {
    const f = pl.net.frontage(lr, s, -1, lr.full + 6);
    const dir = Math.atan2(-(LAKE.z - f.z), LAKE.x - f.x);
    const toLake = Math.hypot((f.x - LAKE.x) / LAKE.rx, (f.z - LAKE.z) / LAKE.rz);
    if (toLake > 1.45) continue;
    // walk toward the lake centre until the shoreline
    let sx = f.x;
    let sz = f.z;
    for (let i = 0; i < 40 && Math.hypot((sx - LAKE.x) / LAKE.rx, (sz - LAKE.z) / LAKE.rz) > 1.02; i++) {
      sx += Math.cos(dir) * 2;
      sz -= Math.sin(dir) * 2;
    }
    dock(sx, sz, 14, dir);
    if (rng.chance(0.6)) boat(k, sx + Math.cos(dir) * 12 + Math.sin(dir) * 3, sz - Math.sin(dir) * 12 + Math.cos(dir) * 3, dir, rng.pick([0xf2f1ec, 0xc8262c, 0x2c4a8c]), LAKE.level + 0.15);
  }
  // a couple of boats out on the water
  boat(k, 760, 400, 0.6, 0xf2f1ec, LAKE.level + 0.15);
  boat(k, 640, 470, 2.2, 0xc8262c, LAKE.level + 0.15);
}

// ------------------------------------------------------------------ industry, power, farms
export const PADS = {
  mill: { x: -1010, z: -458, w: 170, d: 66 },
  mine: { x: -855, z: -495, w: 64, d: 44 },
  substation: { x: -1182, z: -478, w: 60, d: 46 },
  radio: { x: 1078, z: -318, w: 40, d: 34 },
  tower: { x: -60, z: 300, w: 26, d: 26 },
  hansen: { x: 1330, z: -105, w: 150, d: 110 },
};

/** Must run before the road network is finalised (road profiles read the flattened ground). */
export function registerPads() {
  const out: Record<string, number> = {};
  for (const [k, p] of Object.entries(PADS)) out[k] = addFlatPad(p.x, p.z, p.w, p.d, k === 'mine' || k === 'tower' || k === 'radio' ? 24 : 36);
  return out;
}

export function industry(pl: Placer, padY: Record<string, number>) {
  const { c, k } = pl;
  const rng = new Rng(616);
  // ---- Cascade Lumber mill
  const m = PADS.mill;
  pl.clearings.push({ x: m.x, z: m.z, w: m.w + 20, d: m.d + 20 });
  k.at(0, 0, 0, () => {
    k.plane(m.x, 0.03, m.z, m.w, m.d, 0x8f7a5c, 'gravel');
    warehouse(c, m.x - 40, m.z - 8, 0);
    // tepee (wigwam) burner — iconic Pacific Northwest mill landmark
    const bx = m.x + 30;
    const bz = m.z - 12;
    k.solid(bx, bz, 12, 12);
    k.cyl(bx, 0, bz, 6.2, 6.4, 1.2, 14, 0x8a8a86, 'concrete');
    k.cyl(bx, 1.2, bz, 1.9, 6.0, 14, 14, 0x6f4a32, 'corrugated');
    k.cyl(bx, 15.2, bz, 1.9, 1.9, 1.2, 14, 0x3a3a3a, 'metal');
    k.sphere(bx, 16.6, bz, 1.95, 0x4a4a4a, 'metal', 10, 4);
    k.beam({ x: bx - 30, y: 1.5, z: bz + 4 }, { x: bx - 4, y: 11, z: bz }, 1.2, 1.2, 0x7d7a74, 'metal');
    // log decks
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 9; i++) {
        const lx = m.x + 55 + rng.range(-1, 1);
        const lz = m.z + 14 - row * 0.9 + i * 0;
        k.cylX(lx, 0.45 + row * 0.78, lz + i * 0.95 - 4, 0.42, 12, 7, rng.pick([0x7a5a3c, 0x6b4e33, 0x8a6a48]), 'paint');
      }
    k.solid(m.x + 55, m.z + 10, 13, 10);
    for (let i = 0; i < 6; i++) pr.lumberStack(k, rng, m.x - 2 + (i % 3) * 7, m.z + 20 + Math.floor(i / 3) * 6, 0, rng.int(2, 4));
    shed(c, m.x + 62, m.z - 18, 0, 0x9a9a92, true);
    pl.car('pickup', m.x - 12, m.z + 22, PI / 2, 0x6d8ea3, { accent: 0xe9e8e2 }, padY.mill);
    pl.car('semi', m.x + 20, m.z + 20, 0, 0x2c3858, { trailer: true, accent: 0xf2f1ec }, padY.mill);
    k.sign(m.x - 40, 10.6, m.z + 3.2, 10, 1.8, c.signs.get('lumber'), { back: 0xf3e7c8, thick: 0.2 });
  }, padY.mill);
  // ---- substation and high-voltage lines on the north slopes
  const sp = PADS.substation;
  const pts = substation(c, sp.x, sp.z, padY.substation);
  const west = transmissionLine(c, [
    [-2350, -1150],
    [-1800, -820],
    [-1450, -600],
    [-1224, -488],
  ]);
  const east = transmissionLine(c, [
    [-1140, -488],
    [-880, -585],
    [-480, -540],
    [-60, -470],
    [360, -440],
    [760, -420],
    [1160, -450],
    [1560, -540],
    [2300, -780],
  ]);
  const drop = (a: THREE.Vector3[], b: THREE.Vector3[]) => {
    for (let i = 0; i < 3; i++) {
      const A = a[i * 2];
      const B = b[i];
      const ps: THREE.Vector3[] = [];
      for (let j = 0; j <= 10; j++) {
        const t = j / 10;
        const p = A.clone().lerp(B, t);
        p.y -= 3 * 4 * t * (1 - t);
        ps.push(p);
      }
      k.tube(ps, 0.045, 0x2b2d30, 'wire', 20, false);
    }
  };
  drop(west.last, pts.west);
  drop(east.first, pts.east);
  void farHeight;
  // ---- Hansen farm (barn, farmhouse, windmill, corn) east of Exit 62
  const h = PADS.hansen;
  pl.clearings.push({ x: h.x, z: h.z, w: h.w + 20, d: h.d + 20 });
  k.at(0, 0, 0, () => {
    farmhouse(c, h.x - 40, h.z + 36, PI);
    barn(c, h.x + 30, h.z + 18, PI, { shed: true });
    waterTower(k, h.x - 10, h.z + 30, { legH: 9 });
    c.occ.add(h.x - 10, h.z + 30, 6, 6, 0, 1);
    k.plane(h.x - 2, 0.03, h.z + 30, 70, 30, 0x8f7050, 'gravel');
    pr.railFence(k, h.x - 75, h.z - 55, h.x + 75, h.z - 55);
    for (let i = 0; i < 6; i++) k.box(h.x + 50 + (i % 3) * 1.3, i > 2 ? 0.8 : 0, h.z + 2, 1.2, 0.8, 0.9, 0xd8b75a);
    for (let i = 0; i < 8; i++) pr.cow(k, h.x + rng.range(-60, -10), h.z + rng.range(-45, -15), rng.range(0, 6), rng);
  }, padY.hansen);
  const wm = windmill(c, h.x + 60, h.z + 40, PI * 0.85);
  wm.position.y += padY.hansen;
  pl.animated.push({ obj: wm, update: (dt) => (wm.rotation.z -= dt * 1.6) });
  pl.cornFields.push({ x: h.x + 25, z: h.z - 25, w: 70, d: 50, ry: 0 });
  c.occ.add(h.x + 25, h.z - 25, 70, 50, 0, 0.5, false);
  pl.car('pickup', h.x - 20, h.z + 28, PI / 2, 0x7b2532, { accent: 0xe9e8e2 }, padY.hansen);
  pl.car('tractor', h.x + 10, h.z + 4, 0.4, 0x2f7a3a, {}, padY.hansen);
  // ---- the three newer farms (dairy, hay, orchard)
  setFarmHooks(
    (_c, type, x, z, ry, color, y, o) => pl.car(type as VehicleType, x, z, ry, color as number, (o ?? {}) as never, y),
    (_c, x, z, w, d, n) => pl.grassPatches.push({ x, z, w, d, n }),
  );
  for (const f of Object.values(FARMS)) pl.clearings.push({ x: f.x, z: f.z, w: f.w + 24, d: f.d + 24 });
  dairyFarm(c, heightAt(FARMS.dairy.x, FARMS.dairy.z), pl.trees);
  hayFarm(c, heightAt(FARMS.hay.x, FARMS.hay.z), pl.trees);
  orchardFarm(c, heightAt(FARMS.orchard.x, FARMS.orchard.z), pl.trees);
}

// ------------------------------------------------------------------ highway dressing and townsfolk
export function dressing(pl: Placer) {
  const { c, k, net } = pl;
  const rng = new Rng(1212);
  const i90 = net.byName('I-90');
  const guide = (key: string, l1: string, l2: string, l3: string) =>
    c.signs.custom(key, () =>
      panelSign(1024, 560, '#1f6b3f', [
        { text: l1, font: 'Oswald', weight: '700', color: '#ffffff', y: 0.2, size: 0.15 },
        { text: l2, font: 'Oswald', weight: '600', color: '#ffffff', y: 0.5, size: 0.22 },
        { text: l3, font: 'Oswald', weight: '600', color: '#ffffff', y: 0.8, size: 0.16 },
      ], { border: '#ffffff', borderW: 12, radius: 26 }),
    );
  const sign = (s: number, side: 1 | -1, ref: ReturnType<typeof guide>) => {
    const f = net.frontage(i90, s, side, i90.spec.hw + 3.4);
    const ry = f.ry + PI;
    k.at(f.x, f.z, ry, () => {
      k.solid(0, 0, 4.4, 0.6);
      for (const o of [-1.8, 1.8]) k.box(o, 0, 0, 0.18, 6.2, 0.18, 0x9ea2a6, 'metal');
      k.sign(0, 5.2, 0.12, 5.6, 3.1, ref, { back: 0x1f6b3f, thick: 0.12 });
    }, heightAt(f.x, f.z));
  };
  const at = (x: number) => {
    let best = 0;
    let bd = Infinity;
    for (const p of i90.pts) if (Math.abs(p.x - x) < bd) {
      bd = Math.abs(p.x - x);
      best = p.s;
    }
    return best;
  };
  sign(at(-1500), -1, guide('ex61e', 'EXIT 61', 'Pine Hollow', 'Mill Rd · 1 MILE'));
  sign(at(-560), 1, guide('ex61w', 'EXIT 61', 'Pine Hollow West', 'Silver Heights · 1/2 MILE'));
  sign(at(620), -1, guide('ex62e', 'EXIT 62', 'Lake Rd · Hospital', 'Pine Hollow East · 1/2 MILE'));
  sign(at(1560), 1, guide('ex62w', 'EXIT 62', 'Pine Hollow', 'Spirit Lake · 1 MILE'));
  for (const [x, side, id] of [
    [-1650, -1, 'billboardPark'],
    [1400, 1, 'billboardCola'],
  ] as const) {
    const f = net.frontage(i90, at(x), side, i90.spec.hw + 18);
    roadsideBillboard(c, f.x, f.z, f.ry, id);
  }
  // welcome signs on the old highway
  const w = net.byName('Old US-10 W');
  const fw = net.frontage(w, 420, -1, w.full + 5);
  k.at(0, 0, 0, () => welcomeSign(c, fw.x, fw.z, fw.ry), heightAt(fw.x, fw.z));
  const e = net.byName('Old US-10 E');
  const fe = net.frontage(e, 220, 1, e.full + 5);
  k.at(0, 0, 0, () => welcomeSign(c, fe.x, fe.z, fe.ry), heightAt(fe.x, fe.z));
  // townsfolk on downtown sidewalks and at the square
  for (const name of ['Bank St', 'Cedar St', '4th St', '5th St', '6th St']) {
    const r = net.byName(name);
    for (let s = 10; s < r.length - 10; s += rng.range(12, 26)) {
      const side = rng.chance(0.5) ? 1 : -1;
      const f = net.frontage(r, s, side, r.spec.hw + 2.4 + rng.range(-0.8, 1.2));
      if (net.near(f.x, f.z).some((h) => h.road !== r && Math.abs(h.lat) < h.road.spec.hw + 1)) continue;
      k.at(0, 0, 0, () => {
        if (rng.chance(0.35)) crowd(k, rng, f.x, f.z, rng.int(2, 3), 0.8, rng.chance(0.15) ? deputy : randomPerson);
        else person(k, f.x, f.z, f.ry + (rng.chance(0.5) ? PI / 2 : -PI / 2), randomPerson(rng));
      }, f.y + 0.16);
    }
  }
  void CAR_COLORS;
}

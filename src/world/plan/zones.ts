import * as THREE from 'three';
import type { BuildingDef } from '../buildings/catalog';
import type { Col } from '../core/kit';
import { Rng } from '../core/rng';
import { Placer } from './placer';
import type { Road } from '../roads/network';
import type { Ctx } from '../buildings/common';
import { HOUSES } from '../buildings/houses';
import { STRIP } from '../buildings/strip90s';
import { CIVIC } from '../buildings/civic2';
import { TOWN, board } from '../buildings/town';
import { brickStore, donutShop, diner, woodStore, postOffice, gasStation, autoService, type StoreOpts } from '../buildings/commercial';
import { theater, falseFront, gazebo, statue, fountain, policeStation, fireStation, texOutpost, library, townHall } from '../buildings/downtown';
import { motel, motelOffice, motelPylon, church, sheriffOffice, warehouse, waterTower, windmill, roadsideBillboard, welcomeSign } from '../buildings/civic';
import { barn, farmhouse, salesOffice, shed } from '../buildings/homes';
import { flagPole } from '../buildings/common';
import { substation, transmissionLine } from '../infrastructure';
import { dairyFarm, hayFarm, orchardFarm, setFarmHooks, FARMS } from '../farms';
import * as pr from '../props';
import { person, crowd, randomPerson, deputy } from '../people';
import type { SignId } from '../signs';
import { panelSign } from '../textures';
import { heightAt, isWater, LAKE, addFlatPad } from '../terrain';
import { P } from '../palette';
import { vehicle as vehicleFn, type VehicleType } from '../vehicles';
import { EXITS } from './roads';

/* ------------------------------------------------------------------------------------------------
 * District builders for the Pine Hollow plan (see roads.ts for the street layout).
 * Big job sites sit on flattened pads registered before the roads are graded.
 * ---------------------------------------------------------------------------------------------- */

const PI = Math.PI;
const HALF = PI / 2;
const byId = new Map<string, BuildingDef>([...HOUSES, ...STRIP, ...CIVIC, ...TOWN].map((d) => [d.id, d]));
/** Catalogue lookup; a missing id is a layout bug, so fail loudly (the zone wrapper logs it). */
function D(id: string): BuildingDef {
  const d = byId.get(id);
  if (!d) throw new Error(`no building ${id}`);
  return d;
}

/** Wraps a legacy builder (drawn centred at a local offset) as a catalogue def with a correct footprint. */
function legacy(id: string, w: number, d: number, fn: (c: Ctx, x: number, z: number, ry: number) => void, oz = 0): BuildingDef {
  return {
    id,
    name: id,
    w,
    d,
    tags: [],
    build: (c, x, z, ry) => {
      c.occ.add(x, z, w, d, ry, 1, false);
      const [bx, bz] = Placer.world(x, z, ry, 0, oz);
      fn(c, bx, bz, ry);
    },
  };
}

const L = {
  police: legacy('policeStation', 28, 25, policeStation, -2.5),
  fire: legacy('fireStation', 30, 22, fireStation, -1.5),
  cityHall: legacy('townHall', 31, 25, townHall, -2.5),
  library: legacy('library', 17, 20, library, -2),
  church: legacy('church', 16, 32, church, 0),
  sheriff: legacy('sheriffOffice', 26, 19, sheriffOffice, -2.5),
  postOffice: legacy('postOffice', 16, 16, postOffice, 0),
  gas: legacy('gas86', 42, 36, gasStation, 0),
  autoService: legacy('autoService', 20, 21, autoService, 0),
  tex: legacy('tex', 42, 33, texOutpost, 0),
  bait: legacy('bait', 18, 16, (c, x, z, ry) => woodStore(c, x, z, ry, 'bait', 0x7a5a3c), 0),
  feed: legacy('feed', 18, 16, (c, x, z, ry) => woodStore(c, x, z, ry, 'feed', 0x9b7653), 0),
  warehouse: legacy('warehouse', 34, 24, warehouse, 0),
};

/* ------------------------------------------------------------------------- helpers */

/** Arc length of the point on a road closest to x (for straight-ish E-W roads). */
function sAtX(r: Road, x: number) {
  let best = r.pts[0];
  for (const p of r.pts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
  return best.s;
}
/** Arc length of the point on a road closest to z (for N-S roads). */
function sAtZ(r: Road, z: number) {
  let best = r.pts[0];
  for (const p of r.pts) if (Math.abs(p.z - z) < Math.abs(best.z - z)) best = p;
  return best.s;
}
/** Arc length of the point on a road closest to (x, z) (for loops and curves). */
function sNear(r: Road, x: number, z: number) {
  let best = r.pts[0];
  for (const p of r.pts) if (Math.hypot(p.x - x, p.z - z) < Math.hypot(best.x - x, best.z - z)) best = p;
  return best.s;
}

/** Places a def on a road's frontage at arc length s (setback measured from the road's full width). */
function front(pl: Placer, r: Road, s: number, side: 1 | -1, def: BuildingDef, setback: number, seed: number, label?: string, kind = 'civic') {
  const f = pl.net.frontage(r, s, side, r.full + setback + def.d / 2);
  pl.force(def, f.x, f.z, f.ry, seed);
  if (label) pl.landmarks.push({ name: label, x: f.x, z: f.z, kind });
  return f;
}

function mark(pl: Placer, name: string, x: number, z: number, kind: string) {
  pl.landmarks.push({ name, x, z, kind });
}

function pickFrom(ids: string[], weights?: number[]) {
  const pool = ids.map(D);
  return (rng: Rng) => {
    if (!weights) return rng.pick(pool);
    let t = rng.next() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) if ((t -= weights[i]) <= 0) return pool[i];
    return pool[pool.length - 1];
  };
}

const POOLS = {
  historic: () => pickFrom(['victorianQueenAnne', 'minersCottage', 'craftsmanBungalow', 'foursquare', 'duplex'], [2, 3, 3, 2, 1]),
  rowhouse: () => pickFrom(['townhouseRow', 'duplex', 'foursquare'], [3, 2, 1]),
  hillside: () => pickFrom(['minersCottage', 'craftsmanBungalow', 'logCabin', 'aframe', 'victorianQueenAnne'], [3, 2, 1, 1, 1]),
  suburb: () => pickFrom(['colonial', 'ranchPorch', 'capeCod', 'splitLevel', 'ranchGarage', 'modernTwoStory'], [2, 2, 2, 2, 3, 2]),
  newer: () => pickFrom(['modernTwoStory', 'ranchGarage', 'splitLevel', 'capeCod'], [3, 2, 1, 1]),
  estate: () => pickFrom(['lodgeEstate', 'colonialEstate', 'modernTwoStory'], [4, 3, 1]),
  rural: () => pickFrom(['farmhouseGable', 'doubleWide', 'ranchPorch', 'logCabin', 'aframe'], [3, 2, 2, 2, 1]),
  cabin: () => pickFrom(['logCabin', 'aframe', 'lakeCottage'], [3, 2, 1]),
  lake: () => pickFrom(['lakeCottage', 'logCabin', 'aframe'], [3, 2, 2]),
  trailer: () => pickFrom(['singleWide', 'doubleWide'], [4, 1]),
};

/* ------------------------------------------------------------------------- storefront rows */

interface Shop {
  w: number;
  d: number;
  /** Fixed-width legacy builders don't stretch to fill the block. */
  fixed?: boolean;
  make: (c: Ctx, x: number, z: number, ry: number, w: number) => void;
}
const st = (sign: SignId, w: number, d: number, o: Partial<StoreOpts> = {}): Shop => ({ w, d, make: (c, x, z, ry, ww) => brickStore(c, { x, z, ry, w: ww, d, sign, ...o }) });
/** Brick storefront with a custom painted sign. */
const cs = (key: string, title: string, bg: string, fg: string, w: number, d: number, o: Partial<StoreOpts> = {}, font?: string): Shop => ({
  w,
  d,
  make: (c, x, z, ry, ww) => brickStore(c, { x, z, ry, w: ww, d, signRef: board(c, `shop.${key}`, title, '', bg, fg, { font, w: 1024, h: 100, border: bg }), ...o }),
});
const fx = (w: number, d: number, fn: (c: Ctx, x: number, z: number, ry: number) => void): Shop => ({ w, d, fixed: true, make: (c, x, z, ry) => fn(c, x, z, ry) });
const falseFrontShop = (sign: SignId, w: number, d: number, color: Col) =>
  fx(w, d, (c, x, z, ry) => {
    const [bx, bz] = Placer.world(x, z, ry, 0, -1.5);
    falseFront(c, bx, bz, ry, { w, d: d - 3, sign, color, balcony: true });
  });

/** Lays a row of storefronts along one side of a straight E-W street between x0..x1. */
function fillRow(pl: Placer, r: Road, side: 1 | -1, x0: number, x1: number, shops: Shop[], setback = 0.4) {
  const s0 = sAtX(r, x0);
  const s1 = sAtX(r, x1);
  const total = shops.reduce((a, d) => a + d.w, 0);
  const scale = Math.min(1.12, (s1 - s0) / total);
  let s = s0 + Math.max(0, (s1 - s0 - total * scale) / 2);
  for (const sh of shops) {
    const w = sh.fixed ? sh.w : sh.w * scale;
    const span = sh.w * scale;
    const f = pl.net.frontage(r, s + span / 2, side, r.full + setback + sh.d / 2);
    pl.force({ id: 'shop', name: 'shop', w, d: sh.d, tags: [], build: (c, x, z, ry) => sh.make(c, x, z, ry, w) }, f.x, f.z, f.ry, (pl.rng.next() * 1e6) | 0, { foundation: false });
    s += span;
  }
}

/* ================================================================================================
 * Pads: flattened building sites (must be registered before the road network is finalised)
 * ============================================================================================== */
export const PADS = {
  mill: { x: -1080, z: -480, w: 240, d: 120 },
  mine: { x: -625, z: -700, w: 48, d: 68 },
  substation: { x: -560, z: -505, w: 60, d: 46 },
  radio: { x: 232, z: -740, w: 38, d: 44 },
  tower: { x: 430, z: 455, w: 26, d: 26 },
  hansen: { x: 1640, z: -360, w: 150, d: 110 },
  publicWorks: { x: -760, z: -485, w: 66, d: 48 },
  freight: { x: -680, z: -485, w: 60, d: 48 },
  readyMix: { x: -470, z: -486, w: 62, d: 46 },
  hospital: { x: 1010, z: -140, w: 66, d: 58 },
  truckStop: { x: 1110, z: -230.5, w: 84, d: 62 },
  supermarket: { x: 470, z: -167, w: 62, d: 64 },
  highSchool: { x: 540, z: 5, w: 94, d: 54 },
  field: { x: 540, z: 115, w: 120, d: 78 },
  elementary: { x: -392, z: 20, w: 50, d: 66 },
  park: { x: -428, z: 122, w: 88, d: 88 },
  lodge: { x: 1060, z: 545, w: 50, d: 30 },
  campground: { x: 1475, z: 300, w: 54, d: 74 },
  cemetery: { x: -300, z: 410, w: 56, d: 76 },
};
const PAD_FALL: Partial<Record<keyof typeof PADS, number>> = { mine: 24, tower: 24, radio: 24, cemetery: 20, lodge: 18 };

export function registerPads() {
  const out: Record<string, number> = {};
  for (const [k, p] of Object.entries(PADS)) out[k] = addFlatPad(p.x, p.z, p.w, p.d, PAD_FALL[k as keyof typeof PADS] ?? 30);
  return out;
}

/** Keeps houses off the job sites and farmyards that are built later in the pass. */
function reserveSites(pl: Placer) {
  for (const p of Object.values(PADS)) pl.c.occ.add(p.x, p.z, p.w, p.d, 0, 2, false);
  for (const f of Object.values(FARMS)) pl.c.occ.add(f.x, f.z, f.w, f.d, 0, 4, false);
}

/* ================================================================================================
 * Civic: Courthouse Square, Court Street civic row, hospital, schools
 * ============================================================================================== */
export function civic(pl: Placer) {
  const net = pl.net;
  reserveSites(pl);
  const main = net.byName('Main St');
  const court = net.byName('Court St');

  // ---- Courthouse Square: courthouse facing Main St and the Bridge St axis, park around it
  pl.force(D('courthouse'), 0, -165, PI, 11);
  mark(pl, 'Pine County Courthouse', 0, -165, 'civic');
  squarePark(pl);

  // ---- Court St south side: one civic building per block, facing north onto Court St
  const S = -1 as const;
  const civ = (x: number, def: BuildingDef, label: string, seed: number, kind = 'civic') => front(pl, court, sAtX(court, x), S, def, 1.5, seed, label, kind);
  civ(-325, L.fire, 'Fire Station 1', 21, 'emergency');
  civ(-288, D('emsStation'), 'Pine Hollow Ambulance (EMS)', 22, 'emergency');
  civ(-210, L.cityHall, 'City Hall', 23);
  civ(-115, L.police, 'Pine Hollow Police Dept.', 24, 'emergency');
  civ(-24, L.sheriff, 'Pine County Sheriff & Jail', 25, 'emergency');
  civ(32, L.library, 'Carnegie Public Library', 26);
  civ(115, L.church, 'First Methodist Church', 27);
  civ(190, D('vfwHall'), 'VFW Post 4421', 28);
  civ(228, D('elksLodge'), 'Elks Lodge 1798', 29);
  civ(292, L.church, "St. Mary's Catholic Church", 30);
  civ(332, D('lawFirm'), 'Harlan & Pierce, Attorneys', 31, 'business');
  void main;

  // ---- Silver Valley Medical Center on Front St, east of the river
  pl.force(D('hospital'), PADS.hospital.x, PADS.hospital.z, PI, 41);
  mark(pl, 'Silver Valley Medical Center', PADS.hospital.x, PADS.hospital.z, 'emergency');
  // ---- schools
  pl.force(D('highSchool'), PADS.highSchool.x, PADS.highSchool.z, 0, 42);
  pl.force(D('footballField'), PADS.field.x, PADS.field.z, 0, 43);
  mark(pl, 'Pine Hollow High School', PADS.highSchool.x, PADS.highSchool.z, 'school');
  mark(pl, 'Logger Field', PADS.field.x, PADS.field.z, 'park');
  pl.force(D('mapleGroveElementary'), PADS.elementary.x, PADS.elementary.z, HALF, 44);
  mark(pl, 'Maple Grove Elementary', PADS.elementary.x, PADS.elementary.z, 'school');
  pl.force(D('mapleGrovePark'), PADS.park.x, PADS.park.z, HALF, 45);
  mark(pl, 'Maple Grove Park', PADS.park.x, PADS.park.z, 'park');
}

/** Lawns, paths, trees, gazebo, fountain and memorial around the courthouse. */
function squarePark(pl: Placer) {
  const { k, c } = pl;
  const y = heightAt(0, -165);
  k.at(0, 0, 0, () => {
    // lawns on the east and west flanks with a cross path
    for (const s of [-1, 1]) {
      k.box(s * 44, 0.02, -165, 27, 0.12, 64, P.lawn, 'paint', { cast: false });
      k.box(s * 44, 0.03, -165, 27, 0.12, 3.2, P.sidewalk, 'concrete', { cast: false });
      k.box(s * 44, 0.03, -165, 3.2, 0.12, 64, P.sidewalk, 'concrete', { cast: false });
    }
    gazebo(c, -44, -165);
    fountain(c, 44, -165);
    statue(c, -44, -142, 0);
    flagPole(k, c.signs, 44, -142, 12);
    for (const s of [-1, 1])
      for (const zz of [-188, -150]) {
        pr.bench(k, s * 38, zz, s > 0 ? -HALF : HALF);
        pr.acornLamp(k, s * 50, zz);
      }
  }, y);
  for (const [tx, tz] of [[-52, -192], [-36, -192], [-52, -138], [36, -138], [52, -192], [52, -138], [36, -192], [-36, -138]]) pl.trees.push({ kind: 'oak', x: tx, z: tz, s: 0.9 });
  pl.grassPatches.push({ x: -44, z: -165, w: 24, d: 60, n: 40 }, { x: 44, z: -165, w: 24, d: 60, n: 40 });
}

/* ================================================================================================
 * Downtown: Main St and Court St storefronts, the riverfront
 * ============================================================================================== */
/** Frontage between the avenues (x ranges, kerb-to-kerb minus a margin). */
const BLOCKS: [number, number][] = [
  [-416, -368.2],
  [-351.9, -272.6],
  [-247.5, -172.6],
  [-147.5, -82.6],
  [-57.5, -8.2],
  [8.2, 57.5],
  [82.6, 147.5],
  [172.6, 247.5],
  [272.6, 351.9],
  [368.2, 416],
];

export function downtown(pl: Placer) {
  const net = pl.net;
  const main = net.byName('Main St');
  const court = net.byName('Court St');
  const N = 1 as const;
  const S = -1 as const;
  const b = (i: number) => BLOCKS[i];

  // ---- Main St, north side (fronts face south onto Main; backs to River St)
  const MN: Shop[][] = [
    [st('hotel', 22, 22, { stories: 3, wall: 'brickDark', awning: 'awningGreen', fireEscape: true, roofSign: 'hotelRoof', planters: true }), cs('saloon', 'SILVER DOLLAR SALOON', '#2b2421', '#e9c27a', 17, 18, { wall: 'brickBrown' }, 'Rye')],
    [fx(17, 18, (c, x, z, ry) => donutShop(c, x, z, ry)), st('gazette', 14, 18, { stories: 2, wall: 'brickTan', fireEscape: true }), st('western', 15, 18, { wall: 'brickBrown' }), st('hardware', 18, 20, { wall: 'brickRed', awning: 'awningRed' }), st('sporting', 15, 18, { wall: 'brickTan' })],
    [fx(18, 26, (c, x, z, ry) => theater(c, x, z, ry, 24)), st('cafe', 14, 18, { wall: 'brickPaint', wallColor: 0xf3e9d2, awning: 'awningRed', seating: 0xc8262c }), st('books', 12, 18, { stories: 2, eyebrow: true }), st('bakery', 13, 18, { wall: 'brickPaint', wallColor: 0xfbe9ee, awning: 'awningRed' }), st('drugs', 16, 20, { stories: 2, wall: 'brickBrown', planters: true, eyebrow: true })],
    [st('bank', 30, 24, { stories: 2, eyebrow: true, sideWindows: 1, chimneys: 2, fireEscape: true }), cs('jewelers', 'SILVER VALLEY JEWELERS', '#1b1f1c', '#e9c27a', 12, 18, { wall: 'brickPaint', wallColor: 0xe8e2d0 }, 'Alfa Slab One'), st('barber', 11, 18, { wall: 'brickPaint', barber: true }), st('florist', 12, 18, { wall: 'stucco', wallColor: 0xe9e1cf, awning: 'awningGreen', planters: true })],
    [st('fiveDime', 16, 20, { stories: 2, awning: 'awningRed', fireEscape: true }), cs('music', 'PINE HOLLOW MUSIC', '#2c4a8c', '#ffffff', 14, 18, { wall: 'brickTan' }), st('pizza', 15, 18, { awning: 'awningGreen', seating: 0x1f5a34, neon: 'neonOpen' })],
    [st('chinese', 16, 18, { wall: 'brickPaint', wallColor: 0xf6e6c8, awning: 'awningRed', neon: 'neonOpen' }), st('icecream', 14, 18, { wall: 'brickPaint', wallColor: 0xfff0f4, awning: 'awningBlue', seating: 0x6bc3c9 }), cs('electronics', 'HOLLOW ELECTRONICS · TV · VCR', '#c8262c', '#ffffff', 16, 18, { wall: 'brickDark' })],
    [cs('outfitters', 'CASCADE OUTFITTERS', '#2f4a3a', '#f2e3c2', 18, 20, { stories: 2, wall: 'brickBrown' }, 'Alfa Slab One'), st('pawn', 14, 18, { wall: 'brickTan', trim: 0xf0e8d8 }), falseFrontShop('antiques', 14, 17, 0x7a5a3c), st('laundromat', 12, 18, { wall: 'stucco', wallColor: 0xdfe9ee, neon: 'neonOpen' })],
    [st('steakhouse', 20, 18, { wall: 'brickDark', awning: 'awningGreen', planters: true, chimneys: 2 }), cs('bell', 'MOUNTAIN BELL TELEPHONE', '#f4f1ea', '#1f4f6b', 16, 20, { stories: 2, wall: 'brickTan' }), st('realty', 14, 18, { stories: 2, wall: 'brickPaint' }), cs('creditunion', 'SILVER VALLEY CREDIT UNION', '#1f4f6b', '#ffffff', 18, 20, { wall: 'stucco', wallColor: 0xe8e4d8 })],
    [st('market24', 22, 20, { stories: 2, blade: 'liquor', trim: 0xd9cdb6, fireEscape: true }), st('feed', 18, 18, { wall: 'brickBrown' }), st('gun', 14, 18, { wall: 'brickTan' }), cs('optical', 'VALLEY OPTICAL', '#f4f1ea', '#2c6b8a', 12, 18, { wall: 'brickPaint' }), cs('travel', 'PINE HOLLOW TRAVEL', '#e6c229', '#1b1f1c', 12, 18, { wall: 'stucco', wallColor: 0xf2efe8 })],
    [fx(18, 14, (c, x, z, ry) => diner(c, x, z, ry)), st('loan', 14, 18, { wall: 'brickRed' }), cs('videos', 'VALLEY VIDEO', '#4a2a5a', '#f2c94c', 14, 18, { wall: 'stucco', wallColor: 0xe9e1cf, neon: 'neonOpen' })],
  ];
  MN.forEach((row, i) => fillRow(pl, main, N, ...b(i), row));

  // ---- Main St, south side (backs onto Main Alley); the square takes blocks 4-5
  const MS: (Shop[] | null)[] = [
    [fx(16, 16, (c, x, z, ry) => postOffice(c, x, z, ry)), st('auto', 18, 16, { wall: 'brickRed', awning: 'awningRed' }), cs('tailor', 'HOLLOW TAILOR & CLEANERS', '#f4f1ea', '#7a2c25', 12, 16, { wall: 'brickPaint' })],
    [cs('kettle', 'The Copper Kettle', '#7a3b1f', '#f2e3c2', 14, 16, { wall: 'brickPaint', wallColor: 0xf0e8d6, seating: 0x7a3b1f }, 'Lobster'), cs('hobby', 'HOLLOW HOBBY & TOY', '#c8262c', '#f2c94c', 14, 16, { wall: 'brickTan' }), st('fruit', 16, 16, { wall: 'brickPaint', awning: 'awningRed', produce: true }), cs('salon', "Rosie's Beauty Salon", '#e9b8c8', '#7a2c4a', 12, 16, { wall: 'stucco', wallColor: 0xf6e6ee }, 'Lobster'), st('grocery', 22, 16, { wall: 'brickPurple', awning: 'awningGreen' })],
    [falseFrontShop('tavern', 17, 16, 0x6a4a32), cs('printing', 'PINE HOLLOW PRINTING', '#f4f1ea', '#1b1f1c', 14, 16, { wall: 'brickTan' }), cs('boots', 'TIMBER BOOT & SHOE', '#3d2f28', '#e9c27a', 14, 16, { wall: 'brickBrown' }), cs('espresso', 'STEAM DONKEY ESPRESSO', '#3d2f28', '#f2e3c2', 12, 16, { wall: 'brickPaint', wallColor: 0xe9e1cf, seating: 0x3d2f28 }), cs('news', 'NEWS & TOBACCO', '#f4f1ea', '#1b1f1c', 14, 16, { wall: 'brickRed' })],
    [cs('title', 'SILVER VALLEY TITLE CO.', '#f4f1ea', '#2f4a3a', 16, 16, { stories: 2, wall: 'brickTan' }), cs('tax', 'HOLLOW TAX & BOOKKEEPING', '#f4f1ea', '#1f3d6b', 14, 16, { wall: 'brickPaint' }), cs('chiro', 'ELLIS CHIROPRACTIC', '#f4f1ea', '#2c6b8a', 12, 16, { wall: 'stucco', wallColor: 0xe8e4d8 }), cs('gifts', 'Huckleberry Gifts', '#5a2a6b', '#f2e3c2', 14, 16, { wall: 'brickPaint', awning: 'awningBlue' }, 'Lobster')],
    null,
    null,
    [cs('union', 'WOODWORKERS LOCAL 3-38', '#1f3d6b', '#f2c94c', 18, 16, { stories: 2, wall: 'brickRed' }), cs('thrift', 'ST. VINCENT THRIFT', '#f4f1ea', '#2f4a3a', 16, 16, { wall: 'stucco', wallColor: 0xe9e1cf }), cs('lunch', "Mabel's Lunch Counter", '#f4f1ea', '#c8262c', 14, 16, { wall: 'brickPaint', seating: 0xc8262c }, 'Lobster'), cs('taxidermy', 'BIG GAME TAXIDERMY', '#2b2421', '#e9c27a', 14, 16, { wall: 'brickBrown' })],
    [cs('arcade', 'STARSHIP ARCADE', '#1b1f2c', '#7fd8ff', 16, 16, { wall: 'stucco', wallColor: 0x3a3550, neon: 'neonOpen' }), cs('gym', 'IRON WORKS GYM', '#1b1b1d', '#e6c229', 16, 16, { wall: 'brickDark' }), cs('rustyspur', 'THE RUSTY SPUR', '#6b2a24', '#f2e3c2', 16, 16, { wall: 'brickBrown', neon: 'neonBeer' }, 'Rye'), cs('mutual', 'CASCADE MUTUAL INSURANCE', '#f4f1ea', '#7a2c25', 14, 16, { wall: 'brickPaint' })],
    [cs('pets', 'PAWS & CLAWS PET SUPPLY', '#2f6b4a', '#ffffff', 16, 16, { wall: 'brickTan' }), cs('sewing', 'VALLEY SEW & VAC', '#f4f1ea', '#5a2a6b', 12, 16, { wall: 'brickPaint' }), cs('hargrove', 'HARGROVE LAW OFFICE', '#1b1f1c', '#e9c27a', 16, 16, { stories: 2, wall: 'brickRed' }), cs('bargain', 'BARGAIN BARN', '#e6c229', '#7a2c25', 16, 16, { wall: 'stucco', wallColor: 0xe9e1cf })],
    [cs('laundry', "LOGGER'S LAUNDRY", '#2c6b8a', '#ffffff', 14, 16, { wall: 'stucco', wallColor: 0xdfe9ee }), cs('speedy', 'SPEEDY MART', '#c8262c', '#ffffff', 16, 16, { wall: 'stucco', wallColor: 0xf2efe8, neon: 'neonOpen' })],
  ];
  MS.forEach((row, i) => row && fillRow(pl, main, S, ...b(i), row));

  // ---- Court St, north side: county offices and professionals (blocks 1-3, 6-8)
  const CN: [number, Shop[]][] = [
    [1, [cs('assessor', 'PINE COUNTY ASSESSOR', '#f4f1ea', '#1f3d6b', 18, 16, { stories: 2, wall: 'brickTan' }), cs('clerk', 'COUNTY CLERK & RECORDER', '#f4f1ea', '#1f3d6b', 18, 16, { stories: 2, wall: 'brickRed' }), cs('dmv', 'DEPT. OF MOTOR VEHICLES', '#1f4f6b', '#ffffff', 20, 16, { wall: 'stucco', wallColor: 0xe4dccb }), cs('chamber', 'CHAMBER OF COMMERCE', '#2f4a3a', '#f2e3c2', 16, 16, { wall: 'brickPaint' })]],
    [2, [cs('bail', 'FREEDOM BAIL BONDS 24 HR', '#c8262c', '#ffffff', 14, 16, { wall: 'brickTan', neon: 'neonOpen' }), cs('defender', 'PUBLIC DEFENDER', '#f4f1ea', '#1b1f1c', 16, 16, { stories: 2, wall: 'brickBrown' }), cs('da', 'DISTRICT ATTORNEY', '#1b1f1c', '#e9c27a', 20, 16, { stories: 2, wall: 'brickRed' }), cs('probation', 'PROBATION & PAROLE', '#f4f1ea', '#1f3d6b', 14, 16, { wall: 'stucco', wallColor: 0xe8e4d8 })]],
    [3, [cs('savings', 'SILVER VALLEY SAVINGS & LOAN', '#1f3d2b', '#f2e3c2', 20, 16, { stories: 2, wall: 'brickDark', eyebrow: true }), cs('drhale', 'R. HALE, M.D.', '#f4f1ea', '#2c6b8a', 14, 16, { wall: 'brickPaint' }), cs('elections', 'COUNTY ELECTIONS', '#f4f1ea', '#7a2c25', 14, 16, { wall: 'brickTan' }), cs('water', 'CITY WATER & SEWER', '#2c6b8a', '#ffffff', 14, 16, { wall: 'stucco', wallColor: 0xdfe9ee })]],
    [6, [cs('power', 'PACIFIC POWER & LIGHT', '#f2c94c', '#1b1b1d', 18, 16, { stories: 2, wall: 'brickTan' }), cs('kphr', 'KPHR 1340 AM STUDIOS', '#c8262c', '#ffffff', 16, 16, { wall: 'brickRed' }), cs('deli', 'COURT STREET DELI', '#2f6b4a', '#ffffff', 14, 16, { wall: 'brickPaint', awning: 'awningGreen', seating: 0x2f6b4a })]],
    [7, [cs('legalaid', 'CASCADE LEGAL AID', '#f4f1ea', '#1f3d6b', 14, 16, { wall: 'brickPaint' }), cs('funeral', 'BISHOP & SONS FUNERAL HOME', '#1b1f1c', '#e9e0c8', 22, 16, { stories: 2, wall: 'brickPaint', wallColor: 0xf2efe8, planters: true }), cs('vets', 'VETERANS SERVICE OFFICE', '#1f3d6b', '#ffffff', 14, 16, { wall: 'brickTan' })]],
    [8, [cs('masonic', 'MASONIC LODGE No. 43', '#1b1f1c', '#e9c27a', 18, 16, { stories: 2, wall: 'brickDark' }), cs('bnb', 'CEDAR INN BED & BREAKFAST', '#f4f1ea', '#2f4a3a', 20, 16, { stories: 2, wall: 'brickPaint', wallColor: 0xe8e2d0, planters: true }), cs('courtcafe', 'COURT STREET CAFE', '#7a2c25', '#f2e3c2', 14, 16, { wall: 'brickRed', awning: 'awningRed', seating: 0x7a2c25 })]],
  ];
  for (const [i, row] of CN) fillRow(pl, court, N, ...b(i), row);
  mark(pl, 'Hotel Cascade', -394, -232, 'business');
  mark(pl, 'Liberty Theater', -236, -234, 'business');
  mark(pl, 'First Pine Bank', -132, -234, 'business');
  mark(pl, 'Post Office', -406, -188, 'civic');
  mark(pl, 'Pine Hollow Gazette', -311, -232, 'business');
  mark(pl, 'District Attorney', -186, -142, 'civic');
  mark(pl, 'Bishop & Sons Funeral Home', 212, -142, 'business');

  // ---- parking behind the Main St north side, off River St
  const k = pl.k;
  const rng = new Rng(330);
  for (const i of [1, 2, 6, 7, 8]) {
    const [x0, x1] = b(i);
    const cx = (x0 + x1) / 2;
    const w = x1 - x0 - 6;
    k.at(0, 0, 0, () => {
      k.box(cx, 0, -255, w, 0.04, 10, 0x6f737b, 'asphalt', { cast: false });
      for (let j = 0; j <= Math.floor(w / 3); j++) k.plane(x0 + 3 + j * 3, 0.046, -255, 0.11, 9, 0xf1f1ec, 'decal');
    }, heightAt(cx, -255));
    for (let j = 0; j < Math.floor(w / 3); j++)
      if (rng.chance(0.45)) pl.car(rng.pick(['sedan', 'pickup', 'wagon', 'suv', 'van'] as const), x0 + 4.5 + j * 3, -255, rng.chance(0.5) ? HALF : -HALF, rng.pick([0x2f4a3d, 0xc6b28c, 0x8a2a24, 0x2c4a8c, 0xe8e2cf, 0x1c1c1e]));
  }

  riverfront(pl);
}

/** River St's north side: Riverwalk park, the old depot, bait shop, brewery and the boat launch. */
function riverfront(pl: Placer) {
  const net = pl.net;
  const river = net.byName('River St');
  const N = 1 as const;
  front(pl, river, sAtX(river, -268), N, D('depot'), 1, 51, 'Pine Hollow Depot · Visitor Center', 'civic');
  front(pl, river, sAtX(river, 58), N, L.bait, 1.5, 52, 'River Outfitters & Bait', 'business');
  front(pl, river, sAtX(river, 120), N, D('brewery'), 1.5, 53, 'Timber Ridge Brewing Co.', 'business');
  const { k, c } = pl;
  // Riverwalk: lawn strip, benches, lamps and the bandstand gazebo
  for (const [x0, x1] of [[-230, -40], [160, 380]] as const) {
    const cx = (x0 + x1) / 2;
    k.at(0, 0, 0, () => k.box(cx, 0.02, -291, x1 - x0, 0.1, 22, P.lawn, 'paint', { cast: false }), heightAt(cx, -291));
    pl.grassPatches.push({ x: cx, z: -291, w: x1 - x0, d: 20, n: Math.round((x1 - x0) * 0.8) });
    for (let x = x0 + 8; x < x1 - 4; x += 16) {
      const y = heightAt(x, -282);
      k.at(0, 0, 0, () => {
        pr.bench(k, x, -282, PI);
        pr.acornLamp(k, x + 5, -281);
      }, y);
      if ((x | 0) % 3 === 0) pl.trees.push({ kind: 'oak', x: x + 2, z: -297, s: 0.8 });
    }
  }
  k.at(0, 0, 0, () => gazebo(c, -140, -295), heightAt(-140, -295));
  mark(pl, 'Riverwalk Park', -140, -292, 'park');
  // boat launch: a concrete ramp down to the water
  const bx = 300;
  const top = heightAt(bx, -282);
  k.at(0, 0, 0, () => {
    k.beam({ x: bx, y: top + 0.05, z: -282 }, { x: bx, y: top - 3.2, z: -330 }, 6, 0.3, P.concrete, 'concrete', false);
    k.box(bx, top, -278, 12, 0.04, 8, 0x6f737b, 'asphalt', { cast: false });
  });
  pl.c.occ.add(bx, -305, 8, 50, 0, 1, false);
  mark(pl, 'Boat Launch', bx, -300, 'park');
}

/* ================================================================================================
 * Front Street strip, motel row, truck stop
 * ============================================================================================== */
export function strip(pl: Placer) {
  const net = pl.net;
  const fs = net.byName('Front St');
  const east = net.byName('Old Hwy 10 E');
  const N = 1 as const;
  const S = -1 as const;
  // north side west of the river: fast food and the plaza
  const northWest: [BuildingDef, string][] = [
    [L.gas, 'Gas 86'],
    [D('bigBun'), 'Big Bun Burgers'],
    [D('tacoShack'), 'Taco Shack'],
    [D('rewindVideo'), 'Rewind Video'],
    [D('stripMall'), 'Valley Plaza'],
  ];
  stripRow(pl, fs, N, 426, 815, northWest);
  stripRow(pl, fs, N, 905, 1066, [
    [D('pizzaPalace'), 'Pizza Palace'],
    [D('dairyDream'), 'Dairy Dream'],
    [L.tex, 'Tex Outpost'],
  ]);
  // south side: Valley Thriftway, garages, tow yard, used cars
  pl.force(D('supermarket'), PADS.supermarket.x, PADS.supermarket.z, PI, 61);
  mark(pl, 'Valley Thriftway', PADS.supermarket.x, PADS.supermarket.z, 'business');
  stripRow(pl, fs, S, 512, 640, [
    [D('hollowAuto'), 'Hollow Auto Repair'],
    [D('cascadeTire'), 'Cascade Tire & Lube'],
    [D('towYard'), 'Big Timber Towing'],
  ]);
  stripRow(pl, fs, S, 668, 828, [
    [legacy('bobsCars', 64, 46, bobsCars), "Bob's Used Cars"],
    [D('riversideBody'), 'Riverside Body Shop'],
    [L.autoService, 'Quick Lube'],
  ]);
  // east of the river: fire station 2 and the feed store beside the hospital
  front(pl, fs, sAtX(fs, 1092), S, L.fire, 1.5, 62, 'Fire Station 2', 'emergency');
  front(pl, fs, sAtX(fs, 1150), S, L.feed, 1.5, 63, 'Valley Feed & Seed', 'business');
  // Timberline truck stop near Exit 64
  pl.force(D('truckStop'), PADS.truckStop.x, PADS.truckStop.z, 0, 64);
  mark(pl, 'Timberline Truck Stop', PADS.truckStop.x, PADS.truckStop.z, 'business');
  // Cascade Inn motel by the interchange
  stripRow(pl, east, N, 1270, 1420, [[legacy('cascadeInn', 70, 26, cascadeInn), 'Cascade Inn Motel']]);
  stripRow(pl, east, S, 1275, 1440, [[D('cluckers'), "Clucker's Chicken"]]);
}

/** Places defs in order along a road side between x0..x1 and labels them on the map. */
function stripRow(pl: Placer, r: Road, side: 1 | -1, x0: number, x1: number, defs: [BuildingDef, string][], gap = 6) {
  let s = sAtX(r, x0);
  const end = sAtX(r, x1);
  for (const [def, label] of defs) {
    let placed = false;
    while (!placed && s + def.w <= end) {
      const f = pl.net.frontage(r, s + def.w / 2, side, r.full + 1.5 + def.d / 2);
      if (pl.put(def, f.x, f.z, f.ry, (pl.rng.next() * 1e6) | 0, { maxSlope: 3.5 })) {
        pl.landmarks.push({ name: label, x: f.x, z: f.z, kind: 'business' });
        placed = true;
        s += def.w + gap;
      } else s += 3;
    }
    if (!placed) console.info(`[layout] ${label} did not fit on ${r.def.name}`);
  }
}

function cascadeInn(c: Ctx, x: number, z: number, ry: number) {
  c.kit.at(x, z, ry, () => c.kit.box(0, 0, 3, 70, 0.04, 20, 0x6f737b, 'asphalt', { cast: false }));
  const [mx, mz] = Placer.world(x, z, ry, 6, -6);
  motel(c, mx, mz, ry, 12);
  const [ox, oz] = Placer.world(x, z, ry, -28, 2);
  motelOffice(c, ox, oz, ry);
  const [px, pz] = Placer.world(x, z, ry, -32, 11.5);
  motelPylon(c, px, pz, ry);
}

function bobsCars(c: Ctx, x: number, z: number, ry: number) {
  const k = c.kit;
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

/* ================================================================================================
 * Neighbourhoods
 * ============================================================================================== */
export function neighbourhoods(pl: Placer) {
  const net = pl.net;
  const R = (name: string) => net.byName(name);
  const home = { driveway: true, mailbox: true, foundation: true };
  /** Both sides of a road (optionally a sub-range), plus the cul-de-sac bulb. */
  const street = (name: string, pick: (rng: Rng) => BuildingDef | null, o: { setback: number; gap: number; jitter?: number; maxSlope?: number; car?: number; bulb?: number; s0?: number; s1?: number; sides?: (1 | -1)[] }) => {
    const r = R(name);
    for (const side of o.sides ?? [1, -1]) pl.along(r, side, o.s0 ?? 8, (o.s1 ?? r.length) - 8, pick, { ...home, setback: o.setback, gap: o.gap, jitter: o.jitter ?? 1, maxSlope: o.maxSlope ?? 8, car: o.car });
    if (r.def.culdesac && o.bulb) pl.bulb(r, pick, o.bulb, home);
  };

  // ---- Old Town: rowhouses nearest downtown, then the historic grid; Eastside offices
  const pine = R('Pine St');
  const pineEnd = sAtX(pine, 352);
  for (const [s, id, label] of [
    [sAtX(pine, 410), 'clinic', 'Pine Hollow Family Clinic'],
    [sAtX(pine, 455), 'dentist', 'Valley Dental'],
    [sAtX(pine, 500), 'realtor', 'Cedar Realty'],
    [sAtX(pine, 545), 'insurance', 'Hollow Valley Insurance'],
    [sAtX(pine, 590), 'daycare', 'Little Pines Daycare'],
  ] as [number, string, string][]) front(pl, pine, s, 1, D(id), 2, (s * 7) | 0, label, 'business');
  street('Pine St', POOLS.rowhouse(), { setback: 3, gap: 2.5, s1: pineEnd });
  for (const name of ['Cedar St', 'Alder St', 'Hemlock St']) street(name, POOLS.historic(), { setback: 4.5, gap: 3 });
  for (const name of ['1st Ave W S', '2nd Ave W S', '3rd Ave W S', '1st Ave E S', '2nd Ave E S', '3rd Ave E S']) street(name, POOLS.historic(), { setback: 4.5, gap: 3 });
  for (const name of ['4th Ave E', '4th Ave W']) street(name, POOLS.historic(), { setback: 4.5, gap: 3, s0: sAtZ(R(name), -112), s1: sAtZ(R(name), 196) });

  // ---- Church Hill: hillside cottages, the cemetery and its chapel
  pl.force(D('cemetery'), PADS.cemetery.x, PADS.cemetery.z, HALF, 71);
  mark(pl, 'Pine Hollow Cemetery', PADS.cemetery.x, PADS.cemetery.z, 'civic');
  const chr = R('Church Hill Rd');
  const ce = chr.pts[chr.pts.length - 1];
  const cx = ce.x + ce.tx * 42;
  const cz = ce.z + ce.tz * 42;
  pl.force(L.church, cx, cz, Math.atan2(-ce.tx, -ce.tz), 72);
  mark(pl, 'Hillside Chapel', cx, cz, 'civic');
  street('Hillside Dr', POOLS.hillside(), { setback: 5, gap: 5, jitter: 2, maxSlope: 10 });
  street('Church Hill Rd', POOLS.hillside(), { setback: 5, gap: 6, jitter: 2, maxSlope: 10, bulb: 2 });
  street('4th Ave W', POOLS.hillside(), { setback: 5, gap: 5, s0: sAtZ(R('4th Ave W'), 196), maxSlope: 10, bulb: 3 });

  // ---- Cedar Ridge: estates on the hill, gate pillars, the water tower at the top
  const tw = PADS.tower;
  pl.k.at(0, 0, 0, () => waterTower(pl.k, tw.x, tw.z, { legH: 16, scale: 1.25 }), heightAt(tw.x, tw.z));
  pl.c.occ.add(tw.x, tw.z, 14, 14, 0, 1);
  mark(pl, 'Water Tower', tw.x, tw.z, 'civic');
  gateSign(pl, R('Ridgecrest Dr'), 'cedarridge', 'CEDAR RIDGE', 'EST. 1978');
  for (const name of ['Ridgecrest Dr', 'Summit Ct', 'Vista Ct', 'Madrona Ln']) street(name, POOLS.estate(), { setback: 9, gap: 12, jitter: 2.5, maxSlope: 5, car: 0.8, bulb: 3 });

  // ---- Maple Grove: curvilinear loop and cul-de-sacs
  gateSign(pl, R('Maple Grove Blvd'), 'maplegrove', 'MAPLE GROVE', 'A FINE PLACE TO LIVE');
  for (const name of ['Maple Grove Blvd', 'Birch Loop', 'Aspen Ct', 'Larch Ct', 'Juniper Ct', 'Ponderosa Way', 'Fir Ct', 'Spruce Ct']) street(name, POOLS.suburb(), { setback: 7, gap: 5, jitter: 1.5, bulb: 5 });

  // ---- Eastgate (1990s subdivision by the hospital)
  gateSign(pl, R('Eastgate Dr'), 'eastgate', 'EASTGATE', 'NEW HOMES FROM $89,900');
  for (const name of ['Eastgate Dr', 'Elm Ct', 'Tamarack Ct']) street(name, POOLS.newer(), { setback: 7, gap: 5, jitter: 1.5, bulb: 5 });

  // ---- Riverside Mobile Home Park
  const rl = R('Riverside Ln');
  gateSign(pl, rl, 'riversidemhp', 'RIVERSIDE', 'MOBILE HOME PARK · SPACES AVAILABLE');
  for (const side of [1, -1] as const) pl.along(rl, side, 14, rl.length - 12, POOLS.trailer(), { ...home, setback: 6, gap: 4, car: 0.7, maxSlope: 4 });
  mark(pl, 'Riverside Mobile Home Park', 745, 15, 'residential');

  // ---- rural: homesteads on the old highway and the gravel roads, cabins up Elk Ridge
  const ow = R('Old Hwy 10 W');
  pl.force(D('grangeHall'), ...frontXZ(pl, ow, -1350, -1, D('grangeHall')), 81);
  mark(pl, 'Silver Valley Grange', -1350, -215, 'civic');
  pl.force(D('forestService'), ...frontXZ(pl, ow, -1680, 1, D('forestService')), 82);
  mark(pl, 'U.S. Forest Service', -1680, -270, 'civic');
  for (const side of [1, -1] as const) pl.along(ow, side, 40, sAtX(ow, -1060), POOLS.rural(), { ...home, setback: 14, gap: 55, jitter: 6 });
  street('Cougar Creek Rd', POOLS.rural(), { setback: 14, gap: 38, jitter: 5, maxSlope: 7, bulb: 2 });
  street('Elk Ridge Rd', POOLS.cabin(), { setback: 10, gap: 40, jitter: 5, maxSlope: 7, bulb: 2 });
  const oe = R('Old Hwy 10 E');
  for (const side of [1, -1] as const) pl.along(oe, side, sAtX(oe, 1320), oe.length - 40, POOLS.rural(), { ...home, setback: 14, gap: 60, jitter: 6 });
  street('Orchard Rd', POOLS.rural(), { setback: 14, gap: 70, jitter: 5, sides: [-1] });
  street('Spirit Lake Rd', POOLS.rural(), { setback: 12, gap: 45, jitter: 4, s0: sAtZ(R('Spirit Lake Rd'), -170), sides: [1] });
}

/** Frontage point (x, z, ry) beside a road at the arc length nearest x. */
function frontXZ(pl: Placer, r: Road, x: number, side: 1 | -1, def: BuildingDef, setback = 3): [number, number, number] {
  const f = pl.net.frontage(r, sAtX(r, x), side, r.full + setback + def.d / 2);
  return [f.x, f.z, f.ry];
}

/** Stone entry pillars with a neighbourhood sign on both sides of a road's first metres. */
function gateSign(pl: Placer, r: Road, key: string, title: string, sub: string) {
  const { k, c } = pl;
  const ref = board(c, `gate.${key}`, title, sub, '#2f3a2f', '#f2e3c2', { font: 'Alfa Slab One', w: 768, h: 256 });
  const s = Math.min(26, r.length * 0.25);
  for (const side of [1, -1] as const) {
    const f = pl.net.frontage(r, s, side, r.full + 2.2);
    if (c.occ.blocked(f.x, f.z, 1) || isWater(f.x, f.z)) continue;
    c.occ.add(f.x, f.z, 4.4, 1.2, f.ry, 0.5);
    k.at(f.x, f.z, f.ry + (side > 0 ? HALF : -HALF), () => {
      k.solid(0, 0, 4.2, 1.0);
      for (const sx of [-1.8, 1.8]) {
        k.box(sx, 0, 0, 0.9, 2.0, 0.9, 0x8f8c86, 'stone');
        k.box(sx, 2.0, 0, 1.05, 0.15, 1.05, 0x6c6a66);
      }
      k.box(0, 0, 0, 2.7, 0.7, 0.6, 0x8f8c86, 'stone');
      k.sign(0, 1.35, 0, 2.7, 0.9, ref, { back: 0x2f3a2f, thick: 0.25, twoSided: true });
    }, heightAt(f.x, f.z));
  }
}

/* ================================================================================================
 * Spirit Lake: lodge, marina, campground, cabins and docks
 * ============================================================================================== */
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

/** First water point walking from (x, z) toward the lake centre (null if none within reach). */
function shoreToward(x: number, z: number, reach = 160) {
  const dx = LAKE.x - x;
  const dz = LAKE.z - z;
  const L = Math.hypot(dx, dz);
  for (let t = 0; t < Math.min(reach, L); t += 1.5) {
    const px = x + (dx / L) * t;
    const pz = z + (dz / L) * t;
    if (isWater(px, pz)) return { x: px, z: pz, dir: Math.atan2(-dz, dx), t };
  }
  return null;
}

export function lakeside(pl: Placer) {
  const { k, net } = pl;
  const lr = net.byName('Lakeshore Dr');
  const rng = new Rng(808);
  const y = LAKE.level + 0.9;
  const dock = (x0: number, z0: number, len: number, dir: number) => {
    const dx = Math.cos(dir);
    const dz = -Math.sin(dir);
    pl.c.occ.add(x0 + dx * len * 0.5, z0 + dz * len * 0.5, len, 2.4, dir, 0, false);
    k.at(x0 + dx * len * 0.5, z0 + dz * len * 0.5, dir, () => {
      k.box(0, y - 0.15, 0, len, 0.15, 2.2, 0xa98a62, 'planks', { cast: false });
      for (let i = 0; i <= len / 3; i++) for (const s of [-1, 1]) k.cyl(-len / 2 + i * 3, LAKE.level - 2, s * 1.0, 0.12, 0.12, 2.9, 6, 0x6b5340);
    });
  };

  // ---- Spirit Lake Lodge on the south shore, campground beyond the east shore
  pl.force(D('lodge'), PADS.lodge.x, PADS.lodge.z, 0, 91);
  mark(pl, 'Spirit Lake Lodge', PADS.lodge.x, PADS.lodge.z, 'business');
  const ls = shoreToward(PADS.lodge.x, PADS.lodge.z - 16);
  if (ls) {
    dock(ls.x - Math.cos(ls.dir) * 2, ls.z + Math.sin(ls.dir) * 2, 36, ls.dir);
    for (let i = 0; i < 3; i++) boat(k, ls.x + Math.cos(ls.dir) * (10 + i * 8) + 3, ls.z - Math.sin(ls.dir) * (10 + i * 8), ls.dir + HALF, rng.pick([0xf2f1ec, 0xc8262c, 0x2c4a8c]), LAKE.level + 0.15);
  }
  pl.force(D('campground'), PADS.campground.x, PADS.campground.z, -HALF, 92);
  mark(pl, 'Spirit Lake Campground', PADS.campground.x, PADS.campground.z, 'park');

  // ---- marina on the west shore: boathouse, gas dock and slips
  const mz = 335;
  const ms = shoreToward(705, mz);
  if (ms) {
    const bx = ms.x - Math.cos(ms.dir) * 10;
    const bz = ms.z + Math.sin(ms.dir) * 10;
    pl.c.occ.add(bx, bz, 16, 12, 0, 1);
    k.at(bx, bz, ms.dir - HALF, () => {
      k.box(0, 0, 0, 14, 4.2, 10, 0x8a5a3c, 'boards');
      k.roof(0, 4.2, 0, 14, [[5, 0], [0, 2.4], [-5, 0]], 0x2f4a3a, 'roofMetal', { trim: 0xf2efe8, fill: 0x8a5a3c, fillMat: 'boards' });
      k.box(0, 0, 5.02, 6, 3.2, 0.08, 0xe9e8e4, 'rollup');
      k.sign(0, 5.6, 5.1, 7, 1.2, pl.c.signs.custom('marina', () => panelSign(1024, 200, '#1f4f6b', [{ text: 'SPIRIT LAKE MARINA', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.55, size: 0.6 }], { border: '#ffffff', borderW: 8 })), {});
    }, heightAt(bx, bz));
    dock(ms.x - Math.cos(ms.dir) * 2, ms.z + Math.sin(ms.dir) * 2, 46, ms.dir);
    for (let i = 0; i < 4; i++) {
      const t = 12 + i * 9;
      const px = ms.x + Math.cos(ms.dir) * t;
      const pz = ms.z - Math.sin(ms.dir) * t;
      dock(px, pz, 10, ms.dir + HALF);
      dock(px, pz, 10, ms.dir - HALF);
      boat(k, px + Math.sin(ms.dir) * 7 + Math.cos(ms.dir) * 4, pz + Math.cos(ms.dir) * 7 - Math.sin(ms.dir) * 4, ms.dir, rng.pick([0xf2f1ec, 0xc8262c, 0x2c4a8c, 0xe6c229]), LAKE.level + 0.15);
    }
    mark(pl, 'Spirit Lake Marina', bx, bz, 'business');
    front(pl, lr, sNear(lr, 715, mz + 45), 1, L.bait, 3, 93, 'Lakeside Bait & Tackle', 'business');
  }

  // ---- cabins: lake side (with private docks) and the far side of Lakeshore Dr; estates on the south-west shore
  const home = { driveway: true, mailbox: true, foundation: true };
  const sE140 = sNear(lr, 1372, 140);
  const sS900 = sNear(lr, 900, 558);
  const sW300 = sNear(lr, 703, 300);
  const sW150 = sNear(lr, 690, 150);
  pl.along(lr, -1, sE140, sS900, POOLS.lake(), { ...home, setback: 8, gap: 16, jitter: 3, maxSlope: 6 });
  pl.along(lr, -1, sS900, sW300, pickFrom(['lodgeEstate', 'colonialEstate']), { ...home, setback: 10, gap: 18, jitter: 2, maxSlope: 6 });
  pl.along(lr, -1, sW300, sW150, POOLS.lake(), { ...home, setback: 8, gap: 16, jitter: 3, maxSlope: 6 });
  pl.along(lr, 1, sE140, sW150, POOLS.cabin(), { ...home, setback: 10, gap: 30, jitter: 4, maxSlope: 7 });
  for (let s = 40; s < sW150; s += 64) {
    const f = net.frontage(lr, s, -1, lr.full + 6);
    const sh = shoreToward(f.x, f.z, 90);
    if (!sh || sh.t < 12) continue;
    if (pl.c.occ.blocked(sh.x - Math.cos(sh.dir) * 3, sh.z + Math.sin(sh.dir) * 3, 0)) continue;
    dock(sh.x - Math.cos(sh.dir) * 2, sh.z + Math.sin(sh.dir) * 2, 14, sh.dir);
    if (rng.chance(0.6)) boat(k, sh.x + Math.cos(sh.dir) * 12 + Math.sin(sh.dir) * 3, sh.z - Math.sin(sh.dir) * 12 + Math.cos(sh.dir) * 3, sh.dir, rng.pick([0xf2f1ec, 0xc8262c, 0x2c4a8c]), LAKE.level + 0.15);
  }
  // a few boats out on the water
  boat(k, LAKE.x - 60, LAKE.z - 20, 0.6, 0xf2f1ec, LAKE.level + 0.15);
  boat(k, LAKE.x + 80, LAKE.z + 50, 2.2, 0xc8262c, LAKE.level + 0.15);
  boat(k, LAKE.x + 10, LAKE.z + 90, 4.0, 0x2c4a8c, LAKE.level + 0.15);
}

/* ================================================================================================
 * Industry, utilities, the north slope and farms
 * ============================================================================================== */
export function industry(pl: Placer, padY: Record<string, number>) {
  const { c, k, net } = pl;
  const rng = new Rng(616);
  // ---- Cascade Lumber mill (between the river and I-90, west of Mill Rd)
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
      for (let i = 0; i < 9; i++) k.cylX(m.x + 55 + rng.range(-1, 1), 0.45 + row * 0.78, m.z + 14 - row * 0.9 + i * 0.95 - 4, 0.42, 12, 7, rng.pick([0x7a5a3c, 0x6b4e33, 0x8a6a48]), 'paint');
    k.solid(m.x + 55, m.z + 10, 13, 10);
    for (let i = 0; i < 6; i++) pr.lumberStack(k, rng, m.x - 2 + (i % 3) * 7, m.z + 20 + Math.floor(i / 3) * 6, 0, rng.int(2, 4));
    shed(c, m.x + 62, m.z - 18, 0, 0x9a9a92, true);
    for (let i = 0; i < 2; i++) pl.car('semi', m.x - 80 + i * 10, m.z + 30, HALF, 0x2c3858, { trailer: true, accent: 0xf2f1ec }, padY.mill);
    pl.car('pickup', m.x - 12, m.z + 22, PI / 2, 0x6d8ea3, { accent: 0xe9e8e2 }, padY.mill);
    k.sign(m.x - 40, 10.6, m.z + 3.2, 10, 1.8, c.signs.get('lumber'), { back: 0xf3e7c8, thick: 0.2 });
  }, padY.mill);
  mark(pl, 'Cascade Lumber Mill', m.x, m.z, 'industrial');

  // ---- Industrial Way: public works, freight, ready-mix (north side); machine shop and lumber yard (south)
  pl.force(D('publicWorks'), PADS.publicWorks.x, PADS.publicWorks.z, 0, 101);
  pl.force(D('freightDepot'), PADS.freight.x, PADS.freight.z, 0, 102);
  pl.force(D('readyMix'), PADS.readyMix.x, PADS.readyMix.z, 0, 103);
  mark(pl, 'Public Works Yard', PADS.publicWorks.x, PADS.publicWorks.z, 'industrial');
  mark(pl, 'Cascade Freight Lines', PADS.freight.x, PADS.freight.z, 'industrial');
  mark(pl, 'Valley Ready-Mix & Gravel', PADS.readyMix.x, PADS.readyMix.z, 'industrial');
  const iw = net.byName('Industrial Way');
  stripRow(pl, iw, -1, -880, -440, [
    [D('ridgeMachine'), 'Ridge Machine & Welding'],
    [L.warehouse, 'Silver Valley Lumber Yard'],
    [D('countyRoads'), 'Pine County Road Dept.'],
  ]);

  // ---- substation and high-voltage lines over the north slopes
  const sp = PADS.substation;
  const pts = substation(c, sp.x, sp.z, padY.substation);
  mark(pl, 'Substation 4', sp.x, sp.z, 'industrial');
  const west = transmissionLine(c, [
    [-2350, -1150],
    [-1700, -950],
    [-1150, -760],
    [-760, -640],
    [-615, -522],
  ]);
  const east = transmissionLine(c, [
    [-500, -530],
    [-480, -640],
    [-150, -660],
    [300, -668],
    [700, -660],
    [1100, -660],
    [1500, -620],
    [1900, -560],
    [2400, -700],
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

  // ---- north slope: Sierra Silver Mine and the KPHR transmitter
  pl.force(D('mine'), PADS.mine.x, PADS.mine.z, -HALF, 104, { foundation: false });
  mark(pl, 'Sierra Silver Mine', PADS.mine.x, PADS.mine.z, 'industrial');
  pl.force(D('radioStation'), PADS.radio.x, PADS.radio.z, -HALF, 105, { foundation: false });
  mark(pl, 'KPHR Radio Transmitter', PADS.radio.x, PADS.radio.z, 'business');

  // ---- Hansen farm (barn, farmhouse, windmill, corn) north of Old Hwy 10 E
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
  mark(pl, 'Hansen Farm', h.x, h.z, 'rural');

  // ---- the West Valley farms and the orchard
  setFarmHooks(
    (_c, type, x, z, ry, color, y, o) => pl.car(type as VehicleType, x, z, ry, color as number, (o ?? {}) as never, y),
    (_c, x, z, w, d, n) => pl.grassPatches.push({ x, z, w, d, n }),
  );
  for (const f of Object.values(FARMS)) pl.clearings.push({ x: f.x, z: f.z, w: f.w + 24, d: f.d + 24 });
  dairyFarm(c, heightAt(FARMS.dairy.x, FARMS.dairy.z), pl.trees);
  hayFarm(c, heightAt(FARMS.hay.x, FARMS.hay.z), pl.trees);
  orchardFarm(c, heightAt(FARMS.orchard.x, FARMS.orchard.z), pl.trees);
  mark(pl, 'Miller Dairy', FARMS.dairy.x, FARMS.dairy.z, 'rural');
  mark(pl, 'Ridgeview Farm', FARMS.hay.x, FARMS.hay.z, 'rural');
  mark(pl, 'Sunny Acres Orchard', FARMS.orchard.x, FARMS.orchard.z, 'rural');
}

/* ================================================================================================
 * Highway dressing and townsfolk
 * ============================================================================================== */
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
  const sign = (x: number, side: 1 | -1, ref: ReturnType<typeof guide>) => {
    const f = net.frontage(i90, sAtX(i90, x), side, i90.spec.hw + 3.4);
    if (c.occ.blocked(f.x, f.z, 0.5)) return;
    const ry = f.ry + PI;
    k.at(f.x, f.z, ry, () => {
      k.solid(0, 0, 4.4, 0.6);
      for (const o of [-1.8, 1.8]) k.box(o, 0, 0, 0.18, 6.2, 0.18, 0x9ea2a6, 'metal');
      k.sign(0, 5.2, 0.12, 5.6, 3.1, ref, { back: 0x1f6b3f, thick: 0.12 });
    }, heightAt(f.x, f.z));
  };
  // eastbound signs on the south shoulder, westbound on the north shoulder, ahead of each exit
  for (const e of EXITS) {
    sign(e.x - 520, -1, guide(`ex${e.n}e`, `EXIT ${e.n}`, e.to, `${e.road} · 1/2 MILE`));
    sign(e.x + 520, 1, guide(`ex${e.n}w`, `EXIT ${e.n}`, e.to, `${e.road} · 1/2 MILE`));
  }
  for (const [x, side, id] of [
    [-1650, -1, 'billboardPark'],
    [1700, 1, 'billboardCola'],
  ] as const) {
    const f = net.frontage(i90, sAtX(i90, x), side, i90.spec.hw + 18);
    roadsideBillboard(c, f.x, f.z, f.ry, id);
  }
  // welcome signs on the old highway at both ends of town
  const w = net.byName('Old Hwy 10 W');
  const fw = net.frontage(w, 300, -1, w.full + 5);
  k.at(0, 0, 0, () => welcomeSign(c, fw.x, fw.z, fw.ry), heightAt(fw.x, fw.z));
  const e = net.byName('Old Hwy 10 E');
  const fe = net.frontage(e, sAtX(e, 1720), 1, e.full + 5);
  k.at(0, 0, 0, () => welcomeSign(c, fe.x, fe.z, fe.ry), heightAt(fe.x, fe.z));
  // townsfolk on downtown sidewalks
  for (const name of ['Main St', 'Court St', '1st Ave W', '1st Ave E', '2nd Ave W', '2nd Ave E']) {
    const r = net.byName(name);
    for (let s = 10; s < r.length - 10; s += rng.range(12, 26)) {
      const side = rng.chance(0.5) ? 1 : -1;
      const f = net.frontage(r, s, side, r.spec.hw + 2.4 + rng.range(-0.8, 1.2));
      if (net.near(f.x, f.z).some((h) => h.road !== r && Math.abs(h.lat) < h.road.spec.hw + 1)) continue;
      if (c.occ.blocked(f.x, f.z, 0.3)) continue;
      k.at(0, 0, 0, () => {
        if (rng.chance(0.35)) crowd(k, rng, f.x, f.z, rng.int(2, 3), 0.8, rng.chance(0.15) ? deputy : randomPerson);
        else person(k, f.x, f.z, f.ry + (rng.chance(0.5) ? PI / 2 : -PI / 2), randomPerson(rng));
      }, f.y + 0.16);
    }
  }
  // a few people in the square
  for (let i = 0; i < 10; i++) {
    const x = rng.pick([-1, 1]) * rng.range(36, 52);
    const z = rng.range(-190, -140);
    k.at(0, 0, 0, () => person(k, x, z, rng.range(0, 6), randomPerson(rng)), heightAt(x, z) + 0.14);
  }
}

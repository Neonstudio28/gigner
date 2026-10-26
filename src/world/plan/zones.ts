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
  bank: legacy('bankBldg', 30, 24, (c, x, z, ry) => brickStore(c, { x, z, ry, w: 30, d: 24, sign: 'bank', stories: 2, eyebrow: true, sideWindows: 1, chimneys: 2 }), 0),
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

/**
 * House mixes per neighbourhood, by era and income: Old Town and the North Side are pre-war, Mill Town is the
 * sawmill's company housing, the West End is post-war, Sunnyside spans the 1960s–2010s, Eastgate is newest.
 */
const POOLS = {
  historic: () => pickFrom(['victorianQueenAnne', 'minersCottage', 'craftsmanBungalow', 'foursquare', 'duplex', 'hipCottage', 'dutchColonial'], [2, 3, 3, 2, 1, 2, 1]),
  rowhouse: () => pickFrom(['townhouseRow', 'duplex', 'foursquare', 'fourplex'], [3, 2, 1, 1]),
  northside: () =>
    pickFrom(['craftsmanBungalow', 'capeCod', 'ranchPorch', 'foursquare', 'minersCottage', 'splitLevel', 'hipCottage', 'minimalTraditional', 'dutchColonial', 'duplex'], [3, 3, 2, 1, 2, 1, 2, 2, 1, 1]),
  hillside: () => pickFrom(['minersCottage', 'craftsmanBungalow', 'logCabin', 'aframe', 'victorianQueenAnne', 'hipCottage'], [3, 2, 1, 1, 1, 2]),
  suburb: () => pickFrom(['colonial', 'ranchPorch', 'capeCod', 'splitLevel', 'ranchGarage', 'modernTwoStory', 'raisedRanch', 'minimalTraditional', 'dutchColonial'], [2, 2, 2, 2, 3, 2, 2, 1, 1]),
  newer: () => pickFrom(['modernTwoStory', 'ranchGarage', 'splitLevel', 'capeCod', 'neoTraditional', 'raisedRanch', 'modernFarmhouse'], [3, 2, 1, 1, 3, 1, 1]),
  /** Sunnyside's middle-class mix, one or two of everything built from the 1960s on. */
  sunnyside: () =>
    pickFrom(['raisedRanch', 'splitLevel', 'ranchGarage', 'capeCod', 'dutchColonial', 'neoTraditional', 'modernTwoStory', 'minimalTraditional', 'modernFarmhouse', 'colonial'], [3, 3, 3, 2, 1, 3, 2, 1, 1, 1]),
  /** Starter homes and rentals in earshot of I-90. */
  starter: () => pickFrom(['minimalTraditional', 'ranchPorch', 'doubleWide', 'duplex', 'fourplex', 'raisedRanch', 'ranchGarage'], [3, 2, 1, 2, 1, 1, 1]),
  /** Mill Town: the company houses, a few older cottages, and the rentals that filled the gaps. */
  milltown: () => pickFrom(['millHouse', 'hipCottage', 'minersCottage', 'minimalTraditional', 'duplex', 'fourplex', 'singleWide'], [6, 3, 2, 2, 1, 1, 1]),
  estate: () => pickFrom(['lodgeEstate', 'colonialEstate', 'modernTwoStory'], [4, 3, 1]),
  posh: () => pickFrom(['lodgeEstate', 'colonialEstate', 'modernTwoStory', 'craftsmanBungalow', 'victorianQueenAnne', 'modernFarmhouse', 'dutchColonial'], [5, 4, 2, 1, 1, 1, 1]),
  rural: () => pickFrom(['farmhouseGable', 'doubleWide', 'ranchPorch', 'logCabin', 'aframe', 'modernFarmhouse', 'minimalTraditional'], [3, 2, 2, 2, 1, 1, 1]),
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

/** Lays a row of storefronts along one side of a road between arc lengths s0..s1. */
function fillRowS(pl: Placer, r: Road, side: 1 | -1, s0: number, s1: number, shops: Shop[], setback = 0.4) {
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
/** Storefront row along a straight E-W street between x0..x1. */
const fillRow = (pl: Placer, r: Road, side: 1 | -1, x0: number, x1: number, shops: Shop[], setback = 0.4) => fillRowS(pl, r, side, sAtX(r, x0), sAtX(r, x1), shops, setback);

/** Places defs in order along a road side between arc lengths s0..s1 (free-space checked) and labels them on the map. */
function stripRowS(pl: Placer, r: Road, side: 1 | -1, s0: number, s1: number, defs: [BuildingDef, string][], gap = 6, kind = 'business') {
  let s = s0;
  for (const [def, label] of defs) {
    let placed = false;
    while (!placed && s + def.w <= s1) {
      const f = pl.net.frontage(r, s + def.w / 2, side, r.full + 1.5 + def.d / 2);
      if (pl.put(def, f.x, f.z, f.ry, (pl.rng.next() * 1e6) | 0, { maxSlope: 3.5 })) {
        pl.landmarks.push({ name: label, x: f.x, z: f.z, kind });
        placed = true;
        s += def.w + gap;
      } else s += 3;
    }
    if (!placed) console.info(`[layout] ${label} did not fit on ${r.def.name}`);
  }
}
const stripRow = (pl: Placer, r: Road, side: 1 | -1, x0: number, x1: number, defs: [BuildingDef, string][], gap = 6, kind = 'business') => stripRowS(pl, r, side, sAtX(r, x0), sAtX(r, x1), defs, gap, kind);

/* ================================================================================================
 * Pads: flattened building sites (must be registered before the road network is finalised)
 * ============================================================================================== */
export const PADS = {
  mill: { x: -1000, z: -250, w: 220, d: 110 },
  mine: { x: -935, z: -660, w: 48, d: 68 },
  substation: { x: -520, z: -432, w: 60, d: 46 },
  radio: { x: 960, z: -690, w: 38, d: 44 },
  tower: { x: 130, z: 540, w: 26, d: 26 },
  hansen: { x: 1600, z: -250, w: 150, d: 110 },
  publicWorks: { x: -700, z: -334, w: 66, d: 48 },
  freight: { x: -625, z: -334, w: 60, d: 48 },
  readyMix: { x: -660, z: -394, w: 62, d: 46 },
  hospital: { x: 650, z: -38, w: 66, d: 58 },
  truckStop: { x: 825, z: 41, w: 84, d: 62 },
  supermarket: { x: 1080, z: -26, w: 62, d: 64 },
  highSchool: { x: 640, z: 48, w: 94, d: 54 },
  field: { x: 640, z: 135, w: 120, d: 78 },
  loggerPark: { x: 640, z: 232, w: 88, d: 88 },
  elementary: { x: -640, z: 124, w: 66, d: 50 },
  westPark: { x: -640, z: 200, w: 88, d: 88 },
  lodge: { x: 1180, z: 512, w: 50, d: 30 },
  campground: { x: 1580, z: 330, w: 54, d: 74 },
  cemetery: { x: -410, z: 450, w: 56, d: 76 },
  sunnysideSchool: { x: -150, z: -633, w: 66, d: 50 },
  sunnysideField: { x: -245, z: -652, w: 88, d: 88 },
  valleyViewApts: { x: 600, z: -536, w: 74, d: 58 },
  cascadeCourtApts: { x: -1100, z: 54, w: 74, d: 58 },
  distCenter: { x: 642, z: -346, w: 80, d: 78 },
  coldStorage: { x: 717, z: -342, w: 56, d: 70 },
  selfStorage: { x: 634, z: -258, w: 72, d: 62 },
  feedWarehouse: { x: 714, z: -261, w: 46, d: 60 },
};
const PAD_FALL: Partial<Record<keyof typeof PADS, number>> = { mine: 24, tower: 24, radio: 24, cemetery: 20, lodge: 18, hospital: 20 };

export function registerPads() {
  const out: Record<string, number> = {};
  for (const [k, p] of Object.entries(PADS)) out[k] = addFlatPad(p.x, p.z, p.w, p.d, PAD_FALL[k as keyof typeof PADS] ?? 30);
  return out;
}

/**
 * High-voltage lines into Substation 4. The west line comes down the valley; the east line climbs from the
 * substation over I-90 and runs along the forest edge above Sunnyside.
 */
const POWER_LINES: Record<'west' | 'east', [number, number][]> = {
  west: [[-2350, -1150], [-1700, -950], [-1150, -760], [-700, -680], [-560, -520]],
  east: [[-470, -520], [-470, -725], [-100, -748], [300, -752], [700, -735], [1100, -600], [1500, -560], [1900, -540], [2400, -700]],
};

/** Keeps houses off the job sites, farmyards and power-line easements that are built later in the pass. */
function reserveSites(pl: Placer) {
  for (const p of Object.values(PADS)) pl.c.occ.add(p.x, p.z, p.w, p.d, 0, 2, false);
  for (const f of Object.values(FARMS)) pl.c.occ.add(f.x, f.z, f.w, f.d, 0, 4, false);
  for (const line of Object.values(POWER_LINES))
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i];
      const [bx, bz] = line[i + 1];
      pl.c.occ.add((ax + bx) / 2, (az + bz) / 2, Math.hypot(bx - ax, bz - az), 20, Math.atan2(-(bz - az), bx - ax), 0, false);
    }
}

/** Main St / Alder St frontage between avenues: kerb lines minus a 0.6 m margin. */
const BLK = {
  w5w4: [-491.75, -408.25],
  w4w3: [-391.75, -308.25],
  w3w2: [-291.75, -212.65],
  w2w1: [-187.35, -112.65],
  w1d: [-87.35, -12.65],
  de1: [12.65, 87.35],
  e1e2: [112.65, 187.35],
  e2e3: [212.65, 291.75],
  e3e4: [308.25, 391.75],
  e4e5: [408.25, 491.75],
} satisfies Record<string, [number, number]>;

/* ================================================================================================
 * Civic: Courthouse Square, the civic row on Alder St, hospital, schools at both ends of town
 * ============================================================================================== */
export function civic(pl: Placer) {
  const net = pl.net;
  reserveSites(pl);
  const main = net.byName('Main St');
  const alder = net.byName('Alder St');
  const N = 1 as const;
  const S = -1 as const;

  // ---- Courthouse Square: the courthouse faces Main St and the Division St axis
  pl.force(D('courthouse'), 0, -47, 0, 11);
  mark(pl, 'Pine County Courthouse', 0, -47, 'civic');
  squarePark(pl);

  // ---- across Main St from the square: City Hall, the post office, the bank and the library
  const onMain = (x: number, def: BuildingDef, label: string, seed: number, kind = 'civic') => front(pl, main, sAtX(main, x), S, def, 1, seed, label, kind);
  onMain(-50, L.cityHall, 'City Hall', 12);
  onMain(-22, L.postOffice, 'Post Office', 13);
  onMain(45, L.bank, 'First Pine Bank', 14, 'business');
  onMain(75, L.library, 'Carnegie Public Library', 15);

  // ---- Alder St civic row (south side, facing north)
  const civ = (x: number, def: BuildingDef, label: string, seed: number, kind = 'civic') => front(pl, alder, sAtX(alder, x), S, def, 1.5, seed, label, kind);
  civ(-268, L.fire, 'Fire Station 1', 21, 'emergency');
  civ(-232, D('emsStation'), 'Pine Hollow Ambulance (EMS)', 22, 'emergency');
  civ(-150, L.police, 'Pine Hollow Police Dept.', 23, 'emergency');
  civ(-50, L.sheriff, 'Pine County Sheriff & Jail', 24, 'emergency');
  civ(50, L.church, 'First Methodist Church', 25);
  civ(132, D('vfwHall'), 'VFW Post 4421', 26);
  civ(170, D('elksLodge'), 'Elks Lodge 1798', 27);
  civ(232, L.church, "St. Mary's Catholic Church", 28);
  civ(272, D('lawFirm'), 'Harlan & Pierce, Attorneys', 29, 'business');
  void N;

  // ---- Silver Valley Medical Center on Old Hwy 10 at the east end of town
  pl.force(D('hospital'), PADS.hospital.x, PADS.hospital.z, 0, 41);
  mark(pl, 'Silver Valley Medical Center', PADS.hospital.x, PADS.hospital.z, 'emergency');

  // ---- schools: West End Elementary + park at the west end, the high school campus at the east end
  pl.force(D('westEndElementary'), PADS.elementary.x, PADS.elementary.z, PI, 42);
  pl.force(D('westEndPark'), PADS.westPark.x, PADS.westPark.z, 0, 43);
  mark(pl, 'West End Elementary', PADS.elementary.x, PADS.elementary.z, 'school');
  mark(pl, 'West End Park', PADS.westPark.x, PADS.westPark.z, 'park');
  pl.force(D('highSchool'), PADS.highSchool.x, PADS.highSchool.z, PI, 44);
  pl.force(D('footballField'), PADS.field.x, PADS.field.z, 0, 45);
  pl.force(D('loggerPark'), PADS.loggerPark.x, PADS.loggerPark.z, 0, 46);
  mark(pl, 'Pine Hollow High School', PADS.highSchool.x, PADS.highSchool.z, 'school');
  mark(pl, 'Logger Field', PADS.field.x, PADS.field.z, 'park');
  mark(pl, 'Logger Ballpark', PADS.loggerPark.x, PADS.loggerPark.z, 'park');
  // ---- Sunnyside Elementary and its ballfield on the North Slope, facing Highland Dr
  pl.force(D('sunnysideElementary'), PADS.sunnysideSchool.x, PADS.sunnysideSchool.z, 0, 47);
  pl.force(D('sunnysideField'), PADS.sunnysideField.x, PADS.sunnysideField.z, 0, 48);
  mark(pl, 'Sunnyside Elementary', PADS.sunnysideSchool.x, PADS.sunnysideSchool.z, 'school');
  mark(pl, 'Sunnyside Field', PADS.sunnysideField.x, PADS.sunnysideField.z, 'park');
}

/** Lawns, paths, trees, gazebo, fountain and memorial around the courthouse. */
function squarePark(pl: Placer) {
  const { k, c } = pl;
  const y = heightAt(0, -47);
  k.at(0, 0, 0, () => {
    for (const s of [-1, 1]) {
      k.box(s * 59, 0.02, -47, 56, 0.12, 68, P.lawn, 'paint', { cast: false });
      k.box(s * 59, 0.03, -47, 56, 0.12, 3.2, P.sidewalk, 'concrete', { cast: false });
      k.box(s * 59, 0.03, -47, 3.2, 0.12, 68, P.sidewalk, 'concrete', { cast: false });
    }
    gazebo(c, -59, -47);
    fountain(c, 59, -47);
    statue(c, -59, -22, 0);
    flagPole(k, c.signs, 59, -22, 12);
    for (const s of [-1, 1])
      for (const zz of [-72, -22]) {
        pr.bench(k, s * 44, zz, s > 0 ? -HALF : HALF);
        pr.acornLamp(k, s * 76, zz);
      }
  }, y);
  for (const [tx, tz] of [[-80, -75], [-38, -75], [-80, -18], [38, -18], [80, -75], [80, -18], [38, -75], [-38, -18]]) pl.trees.push({ kind: 'oak', x: tx, z: tz, s: 0.9 });
  pl.grassPatches.push({ x: -59, z: -47, w: 50, d: 62, n: 50 }, { x: 59, z: -47, w: 50, d: 62, n: 50 });
}

/* ================================================================================================
 * Downtown: Main St, the cross streets, Alder St offices and the riverfront
 * ============================================================================================== */
export function downtown(pl: Placer) {
  const net = pl.net;
  const main = net.byName('Main St');
  const alder = net.byName('Alder St');
  const N = 1 as const;
  const S = -1 as const;

  // ---- Main St, north side (fronts face south onto Main, backs to River St)
  fillRow(pl, main, N, ...BLK.w4w3, [st('hotel', 22, 22, { stories: 3, wall: 'brickDark', awning: 'awningGreen', fireEscape: true, roofSign: 'hotelRoof', planters: true }), cs('saloon', 'SILVER DOLLAR SALOON', '#2b2421', '#e9c27a', 17, 18, { wall: 'brickBrown' }, 'Rye'), fx(18, 26, (c, x, z, ry) => theater(c, x, z, ry, 24)), cs('videos', 'VALLEY VIDEO', '#4a2a5a', '#f2c94c', 14, 18, { wall: 'stucco', wallColor: 0xe9e1cf, neon: 'neonOpen' })]);
  fillRow(pl, main, N, ...BLK.w3w2, [fx(17, 18, (c, x, z, ry) => donutShop(c, x, z, ry)), st('gazette', 14, 18, { stories: 2, wall: 'brickTan', fireEscape: true }), st('western', 15, 18, { wall: 'brickBrown' }), st('hardware', 18, 20, { wall: 'brickRed', awning: 'awningRed' }), st('sporting', 15, 18, { wall: 'brickTan' })]);
  fillRow(pl, main, N, ...BLK.w2w1, [st('cafe', 14, 18, { wall: 'brickPaint', wallColor: 0xf3e9d2, awning: 'awningRed', seating: 0xc8262c }), st('books', 12, 18, { stories: 2, eyebrow: true }), st('bakery', 13, 18, { wall: 'brickPaint', wallColor: 0xfbe9ee, awning: 'awningRed' }), st('drugs', 16, 20, { stories: 2, wall: 'brickBrown', planters: true, eyebrow: true }), cs('jewelers', 'SILVER VALLEY JEWELERS', '#1b1f1c', '#e9c27a', 12, 18, { wall: 'brickPaint', wallColor: 0xe8e2d0 }, 'Alfa Slab One')]);
  fillRow(pl, main, N, ...BLK.e1e2, [st('fiveDime', 16, 20, { stories: 2, awning: 'awningRed', fireEscape: true }), cs('music', 'PINE HOLLOW MUSIC', '#2c4a8c', '#ffffff', 14, 18, { wall: 'brickTan' }), st('pizza', 15, 18, { awning: 'awningGreen', seating: 0x1f5a34, neon: 'neonOpen' }), st('barber', 11, 18, { wall: 'brickPaint', barber: true }), st('florist', 12, 18, { wall: 'stucco', wallColor: 0xe9e1cf, awning: 'awningGreen', planters: true })]);
  fillRow(pl, main, N, ...BLK.e2e3, [st('chinese', 16, 18, { wall: 'brickPaint', wallColor: 0xf6e6c8, awning: 'awningRed', neon: 'neonOpen' }), st('icecream', 14, 18, { wall: 'brickPaint', wallColor: 0xfff0f4, awning: 'awningBlue', seating: 0x6bc3c9 }), cs('electronics', 'HOLLOW ELECTRONICS · TV · VCR', '#c8262c', '#ffffff', 16, 18, { wall: 'brickDark' }), cs('outfitters', 'CASCADE OUTFITTERS', '#2f4a3a', '#f2e3c2', 18, 20, { stories: 2, wall: 'brickBrown' }, 'Alfa Slab One')]);
  fillRow(pl, main, N, ...BLK.e3e4, [st('steakhouse', 20, 18, { wall: 'brickDark', awning: 'awningGreen', planters: true, chimneys: 2 }), cs('bell', 'MOUNTAIN BELL TELEPHONE', '#f4f1ea', '#1f4f6b', 16, 20, { stories: 2, wall: 'brickTan' }), st('pawn', 14, 18, { wall: 'brickTan', trim: 0xf0e8d8 }), st('laundromat', 12, 18, { wall: 'stucco', wallColor: 0xdfe9ee, neon: 'neonOpen' }), cs('creditunion', 'SILVER VALLEY CREDIT UNION', '#1f4f6b', '#ffffff', 16, 20, { wall: 'stucco', wallColor: 0xe8e4d8 })]);

  // ---- Main St, south side (backs onto Main Alley inside 3rd Aves, deeper lots beyond)
  fillRow(pl, main, S, ...BLK.w4w3, [st('grocery', 22, 18, { wall: 'brickPurple', awning: 'awningGreen' }), st('auto', 18, 18, { wall: 'brickRed', awning: 'awningRed' }), cs('feedseed', 'HOLLOW MERCANTILE', '#3d2f28', '#e9c27a', 18, 18, { wall: 'brickBrown' }, 'Rye'), st('gun', 14, 18, { wall: 'brickTan' })]);
  fillRow(pl, main, S, ...BLK.w3w2, [falseFrontShop('tavern', 17, 17, 0x6a4a32), cs('kettle', 'The Copper Kettle', '#7a3b1f', '#f2e3c2', 14, 17, { wall: 'brickPaint', wallColor: 0xf0e8d6, seating: 0x7a3b1f }, 'Lobster'), cs('hobby', 'HOLLOW HOBBY & TOY', '#c8262c', '#f2c94c', 14, 17, { wall: 'brickTan' }), st('fruit', 16, 17, { wall: 'brickPaint', awning: 'awningRed', produce: true }), cs('salon', "Rosie's Beauty Salon", '#e9b8c8', '#7a2c4a', 12, 17, { wall: 'stucco', wallColor: 0xf6e6ee }, 'Lobster')]);
  fillRow(pl, main, S, ...BLK.w2w1, [cs('printing', 'PINE HOLLOW PRINTING', '#f4f1ea', '#1b1f1c', 14, 17, { wall: 'brickTan' }), cs('boots', 'TIMBER BOOT & SHOE', '#3d2f28', '#e9c27a', 14, 17, { wall: 'brickBrown' }), cs('espresso', 'STEAM DONKEY ESPRESSO', '#3d2f28', '#f2e3c2', 12, 17, { wall: 'brickPaint', wallColor: 0xe9e1cf, seating: 0x3d2f28 }), cs('news', 'NEWS & TOBACCO', '#f4f1ea', '#1b1f1c', 12, 17, { wall: 'brickRed' }), st('realty', 14, 17, { stories: 2, wall: 'brickPaint' })]);
  fillRow(pl, main, S, ...BLK.e1e2, [cs('union', 'WOODWORKERS LOCAL 3-38', '#1f3d6b', '#f2c94c', 18, 17, { stories: 2, wall: 'brickRed' }), cs('thrift', 'ST. VINCENT THRIFT', '#f4f1ea', '#2f4a3a', 16, 17, { wall: 'stucco', wallColor: 0xe9e1cf }), cs('lunch', "Mabel's Lunch Counter", '#f4f1ea', '#c8262c', 14, 17, { wall: 'brickPaint', seating: 0xc8262c }, 'Lobster'), cs('taxidermy', 'BIG GAME TAXIDERMY', '#2b2421', '#e9c27a', 14, 17, { wall: 'brickBrown' })]);
  fillRow(pl, main, S, ...BLK.e2e3, [cs('arcade', 'STARSHIP ARCADE', '#1b1f2c', '#7fd8ff', 16, 17, { wall: 'stucco', wallColor: 0x3a3550, neon: 'neonOpen' }), cs('gym', 'IRON WORKS GYM', '#1b1b1d', '#e6c229', 16, 17, { wall: 'brickDark' }), cs('rustyspur', 'THE RUSTY SPUR', '#6b2a24', '#f2e3c2', 16, 17, { wall: 'brickBrown', neon: 'neonBeer' }, 'Rye'), cs('mutual', 'CASCADE MUTUAL INSURANCE', '#f4f1ea', '#7a2c25', 14, 17, { wall: 'brickPaint' })]);
  fillRow(pl, main, S, ...BLK.e3e4, [fx(18, 14, (c, x, z, ry) => diner(c, x, z, ry)), st('loan', 14, 18, { wall: 'brickRed' }), cs('pets', 'PAWS & CLAWS PET SUPPLY', '#2f6b4a', '#ffffff', 16, 18, { wall: 'brickTan' }), cs('speedy', 'SPEEDY MART', '#c8262c', '#ffffff', 16, 18, { wall: 'stucco', wallColor: 0xf2efe8, neon: 'neonOpen' })]);
  mark(pl, 'Hotel Cascade', -380, -24, 'business');
  mark(pl, 'Liberty Theater', -335, -26, 'business');
  mark(pl, 'Pine Hollow Gazette', -255, -24, 'business');

  // ---- the cross streets between Main St and Alder St: Division St and 1st/2nd Aves are shop streets too
  const between = (r: Road, side: 1 | -1, shops: Shop[]) => fillRowS(pl, r, side, sAtZ(r, 31.5), sAtZ(r, 61), shops);
  const cross: [string, 1 | -1, Shop[]][] = [
    ['Division St', 1, [cs('deli', 'COURT STREET DELI', '#2f6b4a', '#ffffff', 14, 17, { wall: 'brickPaint', awning: 'awningGreen' }), cs('optical', 'VALLEY OPTICAL', '#f4f1ea', '#2c6b8a', 14, 17, { wall: 'brickTan' })]],
    ['Division St', -1, [cs('travel', 'PINE HOLLOW TRAVEL', '#e6c229', '#1b1f1c', 14, 17, { wall: 'stucco', wallColor: 0xf2efe8 }), cs('gifts', 'Huckleberry Gifts', '#5a2a6b', '#f2e3c2', 14, 17, { wall: 'brickPaint', awning: 'awningBlue' }, 'Lobster')]],
    ['1st Ave W', 1, [cs('tailor', 'HOLLOW TAILOR & CLEANERS', '#f4f1ea', '#7a2c25', 14, 17, { wall: 'brickPaint' }), cs('bail', 'FREEDOM BAIL BONDS 24 HR', '#c8262c', '#ffffff', 14, 17, { wall: 'brickTan', neon: 'neonOpen' })]],
    ['1st Ave W', -1, [cs('chiro', 'ELLIS CHIROPRACTIC', '#f4f1ea', '#2c6b8a', 14, 17, { wall: 'stucco', wallColor: 0xe8e4d8 }), cs('tax', 'HOLLOW TAX & BOOKKEEPING', '#f4f1ea', '#1f3d6b', 14, 17, { wall: 'brickPaint' })]],
    ['1st Ave E', 1, [cs('sewing', 'VALLEY SEW & VAC', '#f4f1ea', '#5a2a6b', 14, 17, { wall: 'brickPaint' }), cs('bargain', 'BARGAIN BARN', '#e6c229', '#7a2c25', 14, 17, { wall: 'stucco', wallColor: 0xe9e1cf })]],
    ['2nd Ave E', 1, [cs('hargrove', 'HARGROVE LAW OFFICE', '#1b1f1c', '#e9c27a', 14, 17, { stories: 2, wall: 'brickRed' }), cs('courtcafe', 'COURT STREET CAFE', '#7a2c25', '#f2e3c2', 14, 17, { wall: 'brickRed', awning: 'awningRed' })]],
    ['2nd Ave W', 1, [cs('laundry', "LOGGER'S LAUNDRY", '#2c6b8a', '#ffffff', 14, 17, { wall: 'stucco', wallColor: 0xdfe9ee }), cs('drhale', 'R. HALE, M.D.', '#f4f1ea', '#2c6b8a', 14, 17, { wall: 'brickPaint' })]],
    ['2nd Ave W', -1, [cs('shoes2', 'VALLEY SHOE REPAIR', '#3d2f28', '#f2e3c2', 14, 17, { wall: 'brickBrown' }), cs('sewing2', 'QUILT CORNER', '#f4f1ea', '#7a2c4a', 14, 17, { wall: 'brickPaint' })]],
    ['2nd Ave E', -1, [cs('kphr', 'KPHR 1340 AM STUDIOS', '#c8262c', '#ffffff', 14, 17, { wall: 'brickRed' }), cs('power', 'PACIFIC POWER & LIGHT', '#f2c94c', '#1b1b1d', 14, 17, { wall: 'brickTan' })]],
  ];
  for (const [name, side, shops] of cross) between(net.byName(name), side, shops);

  // ---- Alder St, north side: county offices and professionals facing the civic row
  fillRow(pl, alder, N, ...BLK.w3w2, [cs('assessor', 'PINE COUNTY ASSESSOR', '#f4f1ea', '#1f3d6b', 18, 16, { stories: 2, wall: 'brickTan' }), cs('clerk', 'COUNTY CLERK & RECORDER', '#f4f1ea', '#1f3d6b', 18, 16, { stories: 2, wall: 'brickRed' }), cs('dmv', 'DEPT. OF MOTOR VEHICLES', '#1f4f6b', '#ffffff', 20, 16, { wall: 'stucco', wallColor: 0xe4dccb })]);
  fillRow(pl, alder, N, ...BLK.w2w1, [cs('defender', 'PUBLIC DEFENDER', '#f4f1ea', '#1b1f1c', 16, 16, { stories: 2, wall: 'brickBrown' }), cs('da', 'DISTRICT ATTORNEY', '#1b1f1c', '#e9c27a', 20, 16, { stories: 2, wall: 'brickRed' }), cs('probation', 'PROBATION & PAROLE', '#f4f1ea', '#1f3d6b', 14, 16, { wall: 'stucco', wallColor: 0xe8e4d8 })]);
  fillRow(pl, alder, N, ...BLK.w1d, [cs('elections', 'COUNTY ELECTIONS', '#f4f1ea', '#7a2c25', 14, 16, { wall: 'brickTan' }), cs('water', 'CITY WATER & SEWER', '#2c6b8a', '#ffffff', 14, 16, { wall: 'stucco', wallColor: 0xdfe9ee }), cs('chamber', 'CHAMBER OF COMMERCE', '#2f4a3a', '#f2e3c2', 16, 16, { wall: 'brickPaint' })]);
  fillRow(pl, alder, N, ...BLK.de1, [cs('savings', 'SILVER VALLEY SAVINGS & LOAN', '#1f3d2b', '#f2e3c2', 20, 16, { stories: 2, wall: 'brickDark', eyebrow: true }), cs('title', 'SILVER VALLEY TITLE CO.', '#f4f1ea', '#2f4a3a', 16, 16, { stories: 2, wall: 'brickTan' }), cs('legalaid', 'CASCADE LEGAL AID', '#f4f1ea', '#1f3d6b', 14, 16, { wall: 'brickPaint' })]);
  fillRow(pl, alder, N, ...BLK.e1e2, [cs('funeral', 'BISHOP & SONS FUNERAL HOME', '#1b1f1c', '#e9e0c8', 22, 16, { stories: 2, wall: 'brickPaint', wallColor: 0xf2efe8, planters: true }), cs('vets', 'VETERANS SERVICE OFFICE', '#1f3d6b', '#ffffff', 14, 16, { wall: 'brickTan' })]);
  fillRow(pl, alder, N, ...BLK.e2e3, [cs('masonic', 'MASONIC LODGE No. 43', '#1b1f1c', '#e9c27a', 18, 16, { stories: 2, wall: 'brickDark' }), cs('bnb', 'CEDAR INN BED & BREAKFAST', '#f4f1ea', '#2f4a3a', 20, 16, { stories: 2, wall: 'brickPaint', wallColor: 0xe8e2d0, planters: true })]);
  mark(pl, 'District Attorney', -150, 70, 'civic');
  mark(pl, 'Bishop & Sons Funeral Home', 140, 70, 'business');

  // ---- parking behind the Main St shops, off River St
  const k = pl.k;
  const rng = new Rng(330);
  for (const [x0, x1] of [BLK.w3w2, BLK.w2w1, BLK.e1e2, BLK.e2e3]) {
    const cx = (x0 + x1) / 2;
    const w = x1 - x0 - 6;
    k.at(0, 0, 0, () => {
      k.box(cx, 0, -64, w, 0.04, 10, 0x6f737b, 'asphalt', { cast: false });
      for (let j = 0; j <= Math.floor(w / 3); j++) k.plane(x0 + 3 + j * 3, 0.046, -64, 0.11, 9, 0xf1f1ec, 'decal');
    }, heightAt(cx, -64));
    for (let j = 0; j < Math.floor(w / 3); j++)
      if (rng.chance(0.45)) pl.car(rng.pick(['sedan', 'pickup', 'wagon', 'suv', 'van'] as const), x0 + 4.5 + j * 3, -64, rng.chance(0.5) ? HALF : -HALF, rng.pick([0x2f4a3d, 0xc6b28c, 0x8a2a24, 0x2c4a8c, 0xe8e2cf, 0x1c1c1e]));
  }

  riverfront(pl);
}

/** Both banks of the South Fork: Riverfront Park, the old depot, brewery, outfitter and boat launch; North Bank Park across the water. */
function riverfront(pl: Placer) {
  const net = pl.net;
  const river = net.byName('River St');
  const N = 1 as const;
  front(pl, river, sAtX(river, -232), N, D('depot'), 1, 51, 'Pine Hollow Depot · Visitor Center', 'civic');
  front(pl, river, sAtX(river, -132), N, L.bait, 1.5, 52, 'River Outfitters & Bait', 'business');
  front(pl, river, sAtX(river, 150), N, D('brewery'), 1.5, 53, 'Timber Ridge Brewing Co.', 'business');
  const { k, c } = pl;
  // Riverfront Park: lawns, trail, benches and lamps between River St and the water
  const lawnStrip = (x0: number, x1: number, z: number, d: number) => {
    const cx = (x0 + x1) / 2;
    k.at(0, 0, 0, () => k.box(cx, 0.02, z, x1 - x0, 0.1, d, P.lawn, 'paint', { cast: false }), heightAt(cx, z));
    pl.grassPatches.push({ x: cx, z, w: x1 - x0, d: d - 2, n: Math.round((x1 - x0) * 0.6) });
  };
  for (const [x0, x1] of [[-440, -312], [-212, -150], [-114, -14], [14, 128], [172, 440]] as const) {
    lawnStrip(x0, x1, -110, 22);
    for (let x = x0 + 8; x < x1 - 4; x += 18) {
      const y = heightAt(x, -101);
      k.at(0, 0, 0, () => {
        pr.bench(k, x, -101, PI);
        pr.acornLamp(k, x + 5, -100);
      }, y);
      if ((x | 0) % 3 === 0) pl.trees.push({ kind: 'oak', x: x + 2, z: -118, s: 0.8 });
    }
  }
  k.at(0, 0, 0, () => gazebo(c, -60, -112), heightAt(-60, -112));
  mark(pl, 'Riverfront Park', -60, -112, 'park');
  // boat launch: a concrete ramp down to the water
  const bx = 330;
  const top = heightAt(bx, -100);
  k.at(0, 0, 0, () => {
    k.beam({ x: bx, y: top + 0.05, z: -100 }, { x: bx, y: top - 3.2, z: -150 }, 6, 0.3, P.concrete, 'concrete', false);
    k.box(bx, top, -96, 12, 0.04, 6, 0x6f737b, 'asphalt', { cast: false });
  });
  pl.c.occ.add(bx, -125, 8, 52, 0, 1, false);
  mark(pl, 'Boat Launch', bx, -120, 'park');

  // North Bank Park: lawn, trail and a picnic shelter between Riverside Dr and the river
  for (const [x0, x1] of [[-380, -312], [-288, -12], [12, 380]] as const) lawnStrip(x0, x1, -218, 30);
  for (let x = -360; x < 370; x += 40) {
    if (Math.abs(x) < 16 || Math.abs(x + 300) < 16) continue;
    k.at(0, 0, 0, () => pr.bench(k, x, -232, 0), heightAt(x, -232));
    if ((x / 40) % 2 === 0) pl.trees.push({ kind: 'fir', x: x + 6, z: -212, s: 0.8 });
  }
  const sx = 120;
  const sz = -218;
  k.at(sx, sz, 0, () => {
    for (const ox of [-4.5, 4.5]) for (const oz of [-3, 3]) {
      k.solid(ox, oz, 0.4, 0.4);
      k.box(ox, 0, oz, 0.3, 2.8, 0.3, P.woodDark);
    }
    k.roof(0, 2.8, 0, 10, [[4, 0], [0, 1.6], [-4, 0]], 0x6b2a24, 'roofMetal', { eaveOH: 0.4, gableOH: 0.3 });
    for (const ox of [-2, 2]) k.box(ox, 0.72, 0, 1.8, 0.06, 0.8, 0x8a6a46, 'planks');
  }, heightAt(sx, sz));
  pl.c.occ.add(sx, sz, 11, 8, 0, 1, false);
  mark(pl, 'North Bank Park', -150, -218, 'park');
}

/* ================================================================================================
 * Highway commercial at both ends of town (shops on both sides of Old Hwy 10)
 * ============================================================================================== */
export function strip(pl: Placer) {
  const net = pl.net;
  const ow = net.byName('Old Hwy 10 W');
  const oe = net.byName('Old Hwy 10 E');
  const N = 1 as const;
  const S = -1 as const;
  // ---- west end, by Exit 61
  stripRow(pl, ow, N, -935, -772, [
    [L.gas, 'Gas 86 (West)'],
    [legacy('cascadeInn', 70, 26, cascadeInn), 'Cascade Inn Motel'],
  ]);
  stripRow(pl, ow, S, -935, -612, [
    [L.tex, 'Tex Outpost Steakhouse'],
    [D('hollowAuto'), 'Hollow Auto Repair'],
    [D('towYard'), 'Big Timber Towing'],
    [D('cascadeTire'), 'Cascade Tire & Lube'],
    [L.feed, 'Valley Feed & Seed'],
  ]);
  // ---- east end, by Exit 63 and over the river bridge
  stripRow(pl, oe, N, 774, 935, [
    [D('bigBun'), 'Big Bun Burgers'],
    [D('tacoShack'), 'Taco Shack'],
  ]);
  pl.force(D('truckStop'), PADS.truckStop.x, PADS.truckStop.z, PI, 64);
  mark(pl, 'Timberline Truck Stop', PADS.truckStop.x, PADS.truckStop.z, 'business');
  pl.force(D('supermarket'), PADS.supermarket.x, PADS.supermarket.z, 0, 61);
  mark(pl, 'Valley Thriftway', PADS.supermarket.x, PADS.supermarket.z, 'business');
  stripRow(pl, oe, N, 1118, 1392, [
    [D('stripMall'), 'Valley Plaza'],
    [legacy('bobsCars', 64, 46, bobsCars), "Bob's Used Cars"],
    [D('rewindVideo'), 'Rewind Video'],
  ]);
  stripRow(pl, oe, S, 1012, 1392, [
    [L.fire, 'Fire Station 2'],
    [D('dairyDream'), 'Dairy Dream'],
    [D('pizzaPalace'), 'Pizza Palace'],
    [D('cluckers'), "Clucker's Chicken"],
  ]);
  // body shop and quick lube on Eastside Rd, between the highway and the river
  const es = net.byName('Eastside Rd');
  stripRowS(pl, es, 1, sAtZ(es, -14), sAtZ(es, -92), [
    [D('riversideBody'), 'Riverside Body Shop'],
    [L.autoService, 'Quick Lube'],
  ]);
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
  /** Houses along a road (both sides or the listed ones, optionally a sub-range) plus the cul-de-sac bulb. */
  const street = (name: string, pick: (rng: Rng) => BuildingDef | null, o: { setback: number; gap: number; jitter?: number; maxSlope?: number; car?: number; bulb?: number; s0?: number; s1?: number; sides?: (1 | -1)[] }) => {
    const r = R(name);
    for (const side of o.sides ?? [1, -1]) pl.along(r, side, o.s0 ?? 8, Math.min(o.s1 ?? r.length, r.length) - 8, pick, { ...home, setback: o.setback, gap: o.gap, jitter: o.jitter ?? 1, maxSlope: o.maxSlope ?? 8, car: o.car });
    if (r.def.culdesac && o.bulb) pl.bulb(r, pick, o.bulb, home);
  };
  const old = { setback: 4.5, gap: 3 };

  // ---- Main St beyond downtown: doctors, dentist, realtor, insurance, daycare among older homes
  const main = R('Main St');
  for (const [x, side, id, label] of [
    [-450, 1, 'clinic', 'Pine Hollow Family Clinic'],
    [450, 1, 'dentist', 'Valley Dental'],
    [-450, -1, 'daycare', 'Little Pines Daycare'],
    [450, -1, 'realtor', 'Cedar Realty'],
  ] as [number, 1 | -1, string, string][]) front(pl, main, sAtX(main, x), side, D(id), 2, (x * 7) | 0, label, 'business');
  const office = D('insurance');
  front(pl, R('5th Ave E'), sAtZ(R('5th Ave E'), 120), 1, office, 2, 77, 'Hollow Valley Insurance', 'business');

  // ---- Old Town: rowhouses beside downtown, then the alley-backed historic grid south of Main
  street('Alder St W', POOLS.rowhouse(), { ...old, setback: 3, s1: sAtX(R('Alder St W'), -520) });
  street('Alder St E', POOLS.rowhouse(), { ...old, setback: 3 });
  for (const name of ['Maple St', '1st Ave W S', '1st Ave E S', '4th Ave W', '4th Ave E', '3rd Ave E']) street(name, POOLS.historic(), old);
  street('3rd Ave W', POOLS.historic(), { ...old, s0: sAtZ(R('3rd Ave W'), -95) });
  street('5th Ave W', POOLS.historic(), { ...old, s1: sAtZ(R('5th Ave W'), 186) });
  street('5th Ave E', POOLS.historic(), { ...old, s1: sAtZ(R('5th Ave E'), 186) });
  for (const name of ['2nd Ave W S', '2nd Ave E S', 'Division St S']) street(name, POOLS.historic(), { ...old, s1: sAtZ(R(name), 186) });

  // ---- North Side: across the bridges, 1920s–60s houses on a small grid
  street('Riverside Dr', POOLS.northside(), { ...old, sides: [1] });
  for (const name of ['Spruce St', 'N 4th Ave W', 'N 2nd Ave W', 'N 1st Ave W', 'N 1st Ave E', 'N 2nd Ave E', 'N 3rd Ave E', 'N 4th Ave E', 'Division St N']) street(name, POOLS.northside(), old);
  street('3rd Ave W', POOLS.northside(), { ...old, s1: sAtZ(R('3rd Ave W'), -185) });
  street('Larch St', POOLS.northside(), { ...old, sides: [-1], s0: sAtX(R('Larch St'), -440), bulb: 3 });

  // ---- the south hillside: the cemetery and chapel on Church Hill, the water tower on Cedar Ridge
  pl.force(D('cemetery'), PADS.cemetery.x, PADS.cemetery.z, HALF, 71);
  mark(pl, 'Pine Hollow Cemetery', PADS.cemetery.x, PADS.cemetery.z, 'civic');
  const ch = R('2nd Ave W S');
  const ce = ch.pts[ch.pts.length - 1];
  const cx = ce.x + ce.tx * 42;
  const cz = ce.z + ce.tz * 42;
  pl.force(L.church, cx, cz, Math.atan2(-ce.tx, -ce.tz), 72);
  mark(pl, 'Hillside Chapel', cx, cz, 'civic');
  const tw = PADS.tower;
  pl.k.at(0, 0, 0, () => waterTower(pl.k, tw.x, tw.z, { legH: 16, scale: 1.25 }), heightAt(tw.x, tw.z));
  pl.c.occ.add(tw.x, tw.z, 14, 14, 0, 1);
  mark(pl, 'Water Tower', tw.x, tw.z, 'civic');
  gateSign(pl, R('Division St S'), 'cedarridge', 'CEDAR RIDGE', 'EST. 1978', sAtZ(R('Division St S'), 205));
  gateSign(pl, R('2nd Ave E S'), 'cedarridge', 'CEDAR RIDGE', 'EST. 1978', sAtZ(R('2nd Ave E S'), 205));
  gateSign(pl, R('2nd Ave W S'), 'churchhill', 'CHURCH HILL', 'HISTORIC DISTRICT', sAtZ(ch, 205));

  // estates on tight view lots: the avenues as they wind up the hill, then the courts off them
  const posh = { setback: 7, gap: 4, jitter: 1.5, maxSlope: 6, car: 0.85 };
  for (const name of ['Division St S', '2nd Ave E S', '2nd Ave W S']) street(name, POOLS.posh(), { ...posh, s0: sAtZ(R(name), 192), bulb: 4 });
  street('Hillcrest Dr', POOLS.posh(), { ...posh, s1: sAtX(R('Hillcrest Dr'), 505) });
  for (const name of ['Ridgecrest Dr', 'Laurel Ln']) street(name, POOLS.posh(), posh);
  for (const name of ['Overlook Ct', 'Summit Ct', 'Madrona Ct', 'Aspen Ct', 'Sunrise Ct', 'Hilltop Ct', 'Chapel Ct']) street(name, POOLS.posh(), { ...posh, bulb: 5 });
  street('5th Ave W', POOLS.hillside(), { setback: 5, gap: 5, jitter: 2, maxSlope: 9, s0: sAtZ(R('5th Ave W'), 192), bulb: 3 });

  // ---- West End: post-war suburb grown off Alder St, around the elementary school
  street('Alder St W', POOLS.suburb(), { setback: 7, gap: 5, jitter: 1.5, s0: sAtX(R('Alder St W'), -520), bulb: 4 });
  for (const name of ['Sunset Dr', 'Hemlock Ct']) street(name, POOLS.suburb(), { setback: 7, gap: 5, jitter: 1.5, bulb: 5 });

  // ---- Eastgate: 1990s homes where Hillcrest Dr curves past the high school
  street('Hillcrest Dr', POOLS.newer(), { setback: 7, gap: 5, jitter: 1.5, s0: sAtX(R('Hillcrest Dr'), 510), bulb: 4 });
  for (const name of ['Elm Ct', 'Tamarack Ct']) street(name, POOLS.newer(), { setback: 7, gap: 5, jitter: 1.5, bulb: 5 });

  // ---- Sunnyside: the North Slope subdivision across I-90 (1960s on), with starter homes and rentals on
  // Valley View Dr below Highland Dr and the Valley View Apartments by the Exit 63 ramps
  const sr = R('Sunnyside Rd');
  const sun = { setback: 7, gap: 5, jitter: 1.5, maxSlope: 7, car: 0.8 };
  gateSign(pl, sr, 'sunnyside', 'SUNNYSIDE', 'EST. 1964', sAtZ(sr, -520));
  pl.force(D('valleyViewApts'), PADS.valleyViewApts.x, PADS.valleyViewApts.z, PI, 91);
  mark(pl, 'Valley View Apartments', PADS.valleyViewApts.x, PADS.valleyViewApts.z, 'residential');
  street('Sunnyside Rd', POOLS.sunnyside(), { ...sun, s0: sAtZ(sr, -505), bulb: 4 });
  street('Highland Dr', POOLS.sunnyside(), sun);
  street('Meadowlark Ln', POOLS.sunnyside(), sun);
  for (const name of ['Crestview Ct', 'Sunflower Ct', 'Juniper Ct', 'Bitterroot Ct']) street(name, POOLS.sunnyside(), { ...sun, bulb: 5 });
  street('Valley View Dr', POOLS.starter(), { setback: 6, gap: 4, jitter: 1.5, maxSlope: 7, car: 0.85 });

  // ---- Mill Town: the sawmill's 1923 company houses on tight lots by the Mill Spur, more along the highway,
  // and the income-restricted Cascade Court Apartments across Old Hwy 10
  const mt = { setback: 4, gap: 3, jitter: 1, maxSlope: 8, car: 0.65 };
  const hw = R('Old Hwy 10 W');
  gateSign(pl, R('Sawmill Ave'), 'milltown', 'MILL TOWN', 'COMPANY HOUSES · 1923', sAtZ(R('Sawmill Ave'), -14));
  pl.force(D('cascadeCourtApts'), PADS.cascadeCourtApts.x, PADS.cascadeCourtApts.z, PI, 92);
  mark(pl, 'Cascade Court Apartments', PADS.cascadeCourtApts.x, PADS.cascadeCourtApts.z, 'residential');
  for (const name of ['Sawmill Ave', 'Mill Row', 'Shingle St']) street(name, POOLS.milltown(), { ...mt, bulb: 3 });
  pl.along(hw, 1, sAtX(hw, -1290), sAtX(hw, -1012), POOLS.milltown(), { ...home, ...mt });

  // ---- Riverside Mobile Home Park, beside the river at the west end
  const rl = R('Riverside Ln');
  gateSign(pl, rl, 'riversidemhp', 'RIVERSIDE', 'MOBILE HOME PARK · SPACES AVAILABLE');
  for (const side of [1, -1] as const) pl.along(rl, side, 14, rl.length - 12, POOLS.trailer(), { ...home, setback: 6, gap: 4, car: 0.7, maxSlope: 4 });
  mark(pl, 'Riverside Mobile Home Park', -690, -90, 'residential');

  // ---- rural: the Grange and Forest Service on the old highway, homesteads, forest cabins
  const ow = R('Old Hwy 10 W');
  const oe = R('Old Hwy 10 E');
  pl.force(D('grangeHall'), ...frontXZ(pl, ow, -1330, -1, D('grangeHall')), 81);
  mark(pl, 'Silver Valley Grange', -1330, 50, 'civic');
  pl.force(D('forestService'), ...frontXZ(pl, ow, -1680, 1, D('forestService')), 82);
  mark(pl, 'U.S. Forest Service', -1680, 10, 'civic');
  for (const side of [1, -1] as const) pl.along(ow, side, 40, sAtX(ow, -1330), POOLS.rural(), { ...home, setback: 14, gap: 55, jitter: 6 });
  street('Cougar Creek Rd', POOLS.rural(), { setback: 14, gap: 36, jitter: 5, maxSlope: 7, bulb: 2 });
  street('Grouse Ln', POOLS.cabin(), { setback: 10, gap: 34, jitter: 5, maxSlope: 7, bulb: 2 });
  for (const side of [1, -1] as const) pl.along(oe, side, sAtX(oe, 1420), oe.length - 40, POOLS.rural(), { ...home, setback: 14, gap: 60, jitter: 6 });
  street('Orchard Rd', POOLS.rural(), { setback: 14, gap: 70, jitter: 5, sides: [1] });
  street('Eastside Rd', POOLS.rural(), { setback: 12, gap: 40, jitter: 4, s0: sAtZ(R('Eastside Rd'), -170), s1: sAtZ(R('Eastside Rd'), -390) });
}

/** Frontage point (x, z, ry) beside a road at the arc length nearest x. */
function frontXZ(pl: Placer, r: Road, x: number, side: 1 | -1, def: BuildingDef, setback = 3): [number, number, number] {
  const f = pl.net.frontage(r, sAtX(r, x), side, r.full + setback + def.d / 2);
  return [f.x, f.z, f.ry];
}

/** Stone entry pillars with a neighbourhood sign on both sides of a road (near its start unless `at` is given). */
function gateSign(pl: Placer, r: Road, key: string, title: string, sub: string, at?: number) {
  const { k, c } = pl;
  const ref = board(c, `gate.${key}`, title, sub, '#2f3a2f', '#f2e3c2', { font: 'Alfa Slab One', w: 768, h: 256 });
  const s = at ?? Math.min(26, r.length * 0.25);
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
  const IN = 1 as const;
  const OUT = -1 as const;
  const dock = (x0: number, z0: number, len: number, dir: number) => {
    const dx = Math.cos(dir);
    const dz = -Math.sin(dir);
    pl.c.occ.add(x0 + dx * len * 0.5, z0 + dz * len * 0.5, len, 2.4, dir, 0, false);
    k.at(x0 + dx * len * 0.5, z0 + dz * len * 0.5, dir, () => {
      k.box(0, y - 0.15, 0, len, 0.15, 2.2, 0xa98a62, 'planks', { cast: false });
      for (let i = 0; i <= len / 3; i++) for (const s of [-1, 1]) k.cyl(-len / 2 + i * 3, LAKE.level - 2, s * 1.0, 0.12, 0.12, 2.9, 6, 0x6b5340);
    });
  };

  // ---- Spirit Lake Lodge on the south shore, the campground beyond the east shore
  pl.force(D('lodge'), PADS.lodge.x, PADS.lodge.z, 0, 91);
  mark(pl, 'Spirit Lake Lodge', PADS.lodge.x, PADS.lodge.z, 'business');
  const ls = shoreToward(PADS.lodge.x, PADS.lodge.z - 16);
  if (ls) {
    dock(ls.x - Math.cos(ls.dir) * 2, ls.z + Math.sin(ls.dir) * 2, 36, ls.dir);
    for (let i = 0; i < 3; i++) boat(k, ls.x + Math.cos(ls.dir) * (10 + i * 8) + 3, ls.z - Math.sin(ls.dir) * (10 + i * 8), ls.dir + HALF, rng.pick([0xf2f1ec, 0xc8262c, 0x2c4a8c]), LAKE.level + 0.15);
  }
  pl.force(D('campground'), PADS.campground.x, PADS.campground.z, -HALF, 92);
  mark(pl, 'Spirit Lake Campground', PADS.campground.x, PADS.campground.z, 'park');

  // ---- marina on the west shore: boathouse, slips and the bait shop across the road
  const mz = 330;
  const ms = shoreToward(884, mz);
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
  }
  stripRowS(pl, lr, OUT, sNear(lr, 882, 300), sNear(lr, 884, 400), [[L.bait, 'Lakeside Bait & Tackle']]);

  // ---- cabins on the lake side (with private docks) and across the road; estates on the south-west shore
  const home = { driveway: true, mailbox: true, foundation: true };
  const sN = sNear(lr, 878, 140);
  const sSW = sNear(lr, 920, 450);
  const sS = sNear(lr, 1180, 545);
  const sNE = sNear(lr, 1460, 110);
  pl.along(lr, IN, sN, sSW, POOLS.lake(), { ...home, setback: 8, gap: 16, jitter: 3, maxSlope: 6 });
  pl.along(lr, IN, sSW, sS - 40, pickFrom(['lodgeEstate', 'colonialEstate']), { ...home, setback: 10, gap: 18, jitter: 2, maxSlope: 6 });
  pl.along(lr, IN, sS + 40, sNE, POOLS.lake(), { ...home, setback: 8, gap: 16, jitter: 3, maxSlope: 6 });
  pl.along(lr, OUT, sNear(lr, 900, 440), sNE, POOLS.cabin(), { ...home, setback: 10, gap: 30, jitter: 4, maxSlope: 7 });
  for (let s = sN; s < sNE; s += 60) {
    const f = net.frontage(lr, s, IN, lr.full + 6);
    const sh = shoreToward(f.x, f.z, 90);
    if (!sh || sh.t < 12) continue;
    if (pl.c.occ.blocked(sh.x - Math.cos(sh.dir) * 3, sh.z + Math.sin(sh.dir) * 3, 0)) continue;
    dock(sh.x - Math.cos(sh.dir) * 2, sh.z + Math.sin(sh.dir) * 2, 14, sh.dir);
    if (rng.chance(0.6)) boat(k, sh.x + Math.cos(sh.dir) * 12 + Math.sin(sh.dir) * 3, sh.z - Math.sin(sh.dir) * 12 + Math.cos(sh.dir) * 3, sh.dir, rng.pick([0xf2f1ec, 0xc8262c, 0x2c4a8c]), LAKE.level + 0.15);
  }
  boat(k, LAKE.x - 60, LAKE.z - 20, 0.6, 0xf2f1ec, LAKE.level + 0.15);
  boat(k, LAKE.x + 70, LAKE.z + 40, 2.2, 0xc8262c, LAKE.level + 0.15);
  boat(k, LAKE.x + 10, LAKE.z + 80, 4.0, 0x2c4a8c, LAKE.level + 0.15);
}

/* ================================================================================================
 * Industry, utilities, the north slope and farms
 * ============================================================================================== */
export function industry(pl: Placer, padY: Record<string, number>) {
  const { c, k, net } = pl;
  const rng = new Rng(616);
  // ---- Cascade Lumber mill on the river, reached by the Mill Spur
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
    for (let i = 0; i < 2; i++) pl.car('semi', m.x - 80 + i * 10, m.z + 20, HALF, 0x2c3858, { trailer: true, accent: 0xf2f1ec }, padY.mill);
    pl.car('pickup', m.x - 12, m.z + 22, PI / 2, 0x6d8ea3, { accent: 0xe9e8e2 }, padY.mill);
    k.sign(m.x - 40, 10.6, m.z + 3.2, 10, 1.8, c.signs.get('lumber'), { back: 0xf3e7c8, thick: 0.2 });
  }, padY.mill);
  mark(pl, 'Cascade Lumber Mill', m.x, m.z, 'industrial');
  // lumber yard and county road shop along the Mill Spur
  const spur = net.byName('Mill Spur');
  stripRowS(pl, spur, -1, sAtZ(spur, -22), sAtZ(spur, -186), [
    [L.warehouse, 'Silver Valley Lumber Yard'],
    [D('countyRoads'), 'Pine County Road Dept.'],
  ], 6, 'industrial');

  // ---- Industrial Way: public works and freight by the river, ready-mix and the machine shop toward I-90
  pl.force(D('publicWorks'), PADS.publicWorks.x, PADS.publicWorks.z, PI, 101);
  pl.force(D('freightDepot'), PADS.freight.x, PADS.freight.z, PI, 102);
  pl.force(D('readyMix'), PADS.readyMix.x, PADS.readyMix.z, 0, 103);
  mark(pl, 'Public Works Yard', PADS.publicWorks.x, PADS.publicWorks.z, 'industrial');
  mark(pl, 'Cascade Freight Lines', PADS.freight.x, PADS.freight.z, 'industrial');
  mark(pl, 'Valley Ready-Mix & Gravel', PADS.readyMix.x, PADS.readyMix.z, 'industrial');
  stripRow(pl, net.byName('Industrial Way'), 1, -626, -562, [[D('ridgeMachine'), 'Ridge Machine & Welding']], 6, 'industrial');

  // ---- Eastside warehouse district: distribution, cold storage, feed and self-storage on Warehouse Rd
  for (const [id, label, ry] of [
    ['distCenter', 'Cascade Distribution Center', 0],
    ['coldStorage', 'Valley Cold Storage', 0],
    ['selfStorage', 'Pine Hollow Self Storage', PI],
    ['feedWarehouse', 'Timberline Feed & Grain', PI],
  ] as [keyof typeof PADS, string, number][]) {
    const p = PADS[id];
    pl.force(D(id), p.x, p.z, ry, 111);
    mark(pl, label, p.x, p.z, 'industrial');
  }

  // ---- substation and high-voltage lines over the north slopes
  const sp = PADS.substation;
  const pts = substation(c, sp.x, sp.z, padY.substation);
  mark(pl, 'Substation 4', sp.x, sp.z, 'industrial');
  const west = transmissionLine(c, POWER_LINES.west);
  const east = transmissionLine(c, POWER_LINES.east);
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
  pl.force(D('mine'), PADS.mine.x, PADS.mine.z, HALF, 104, { foundation: false });
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
  // townsfolk on the downtown sidewalks
  for (const name of ['Main St', 'Alder St', 'Division St', '1st Ave W', '1st Ave E', '2nd Ave W', '2nd Ave E']) {
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
    const x = rng.pick([-1, 1]) * rng.range(38, 80);
    const z = rng.range(-75, -20);
    k.at(0, 0, 0, () => person(k, x, z, rng.range(0, 6), randomPerson(rng)), heightAt(x, z) + 0.14);
  }
}

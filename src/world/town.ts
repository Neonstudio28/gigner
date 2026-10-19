import * as THREE from 'three';
import type { Ctx } from './buildings/common';
import { flagPole } from './buildings/common';
import { brickStore, donutShop, gasStation, autoService, woodStore, diner, postOffice } from './buildings/commercial';
import { church, sheriffOffice, motel, motelOffice, motelPylon, warehouse, waterTower, windmill, roadsideBillboard, welcomeSign } from './buildings/civic';
import { colonial, ranch, aframeCabin, barn, farmhouse, salesOffice, shed } from './buildings/homes';
import * as pr from './props';
import { vehicle, type VehicleType } from './vehicles';
import { person, crowd, randomPerson, deputy } from './people';
import type { PlacedTree, VegetationInput } from './vegetation';
import { P, SIDING_COLORS, CAR_COLORS } from './palette';
import { heightAt } from './terrain';
import type { Rng } from './core/rng';

const HALF_PI = Math.PI / 2;
const SIDE_Y = 0.16;

export interface TownLayout {
  veg: Omit<VegetationInput, 'occ'>;
  animated: { obj: THREE.Object3D; update: (dt: number, t: number) => void }[];
  spawn: THREE.Vector3;
}

export function buildTown(c: Ctx): TownLayout {
  const { kit: k, signs, rng } = c;
  const trees: PlacedTree[] = [];
  const cornFields: VegetationInput['cornFields'] = [];
  const grassPatches: VegetationInput['grassPatches'] = [];
  const animated: TownLayout['animated'] = [];

  // ------------------------------------------------------------------ roads
  const road = (x0: number, x1: number, z0: number, z1: number, color: number = P.asphalt) => {
    k.box((x0 + x1) / 2, -0.3, (z0 + z1) / 2, x1 - x0, 0.33, z1 - z0, color, 'asphalt', { cast: false });
    c.occ.add((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 1.2);
  };
  const dirt = (x0: number, x1: number, z0: number, z1: number, color: number = P.dirt, occupy = true) => {
    k.plane((x0 + x1) / 2, 0.012, (z0 + z1) / 2, x1 - x0, z1 - z0, color, 'paint', { cast: false });
    if (occupy) c.occ.add((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 0.5);
  };
  const paint = (x0: number, x1: number, z0: number, z1: number, color: number = P.lineWhite) =>
    k.box((x0 + x1) / 2, 0.03, (z0 + z1) / 2, x1 - x0, 0.014, z1 - z0, color, 'decal', { cast: false });
  const sidewalk = (x0: number, x1: number, z0: number, z1: number) => {
    k.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, SIDE_Y, z1 - z0, P.sidewalk, 'concrete', { cast: false });
    c.occ.add((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 0.3);
  };

  // Main Street + highway
  road(-300, 300, -7.5, 7.5);
  road(-9000, -300, -4.6, 4.6);
  road(300, 9000, -4.6, 4.6);
  // Pine Ave
  road(-6.5, 6.5, -345, -7.5);
  road(-6.5, 6.5, 7.5, 130.5);
  // Elm / Oak
  for (const sx of [-1, 1]) {
    road(sx > 0 ? 117 : -127, sx > 0 ? 127 : -117, -266, -7.5);
    road(sx > 0 ? 117 : -127, sx > 0 ? 127 : -117, 7.5, 130.5);
    road(sx > 0 ? 6.5 : -117, sx > 0 ? 117 : -6.5, -164, -156);
    road(sx > 0 ? 6.5 : -117, sx > 0 ? 117 : -6.5, -266, -258);
  }
  road(-127, 127, 130.5, 139.5);

  // markings: Main/highway
  for (const [a, b] of [
    [-9000, -11.6],
    [11.6, 9000],
  ]) {
    paint(a, b, -0.2, -0.08, P.lineYellow);
    paint(a, b, 0.08, 0.2, P.lineYellow);
  }
  for (const [a, b] of [
    [-300, -11.6],
    [11.6, 300],
  ]) {
    paint(a, b, -3.76, -3.64);
    paint(a, b, 3.64, 3.76);
  }
  for (const [a, b] of [
    [-6000, -300],
    [300, 6000],
  ]) {
    paint(a, b, -4.3, -4.18);
    paint(a, b, 4.18, 4.3);
  }
  for (let x = 16; x < 116; x += 6.5)
    for (const sx of [-1, 1]) {
      paint(sx * x - 0.06, sx * x + 0.06, 3.7, 4.9);
      paint(sx * x - 0.06, sx * x + 0.06, -4.9, -3.7);
    }
  // Pine Ave markings
  for (const [a, b] of [
    [-345, -12.6],
    [12.6, 130.5],
  ]) {
    paint(-0.2, -0.08, a, b, P.lineYellow);
    paint(0.08, 0.2, a, b, P.lineYellow);
  }
  // crosswalks + stop bars
  for (const sx of [-1, 1]) {
    for (let z = -7.0; z < 7.2; z += 1.0) paint(sx * 7.0 - (sx > 0 ? 0 : 4), sx * 7.0 + (sx > 0 ? 4 : 0), z, z + 0.55);
    for (let x = -6.0; x < 6.2; x += 1.0) paint(x, x + 0.55, sx * 7.9 - (sx > 0 ? 0 : 3.8), sx * 7.9 + (sx > 0 ? 3.8 : 0));
  }
  paint(11.6, 12.0, -7.3, -0.3);
  paint(-12.0, -11.6, 0.3, 7.3);
  paint(-6.3, -0.3, -12.6, -12.2);
  paint(0.3, 6.3, 12.2, 12.6);
  k.vplane(-3.2, 0.04, -17, 4.2, 1.6, 0xffffff, c.kit.signMat(signs.get('roadStop')), { rx: -HALF_PI, ry: Math.PI });
  k.vplane(3.2, 0.04, 17, 4.2, 1.6, 0xffffff, c.kit.signMat(signs.get('roadStop')), { rx: -HALF_PI });

  // sidewalks with yellow curb paint near the intersection
  for (const sx of [-1, 1]) {
    const xa = sx > 0 ? 6.5 : -117;
    const xb = sx > 0 ? 117 : -6.5;
    sidewalk(xa, xb, -12, -7.5);
    sidewalk(xa, xb, 7.5, 12);
    sidewalk(sx > 0 ? 6.5 : -11, sx > 0 ? 11 : -6.5, -110, -12);
    sidewalk(sx > 0 ? 6.5 : -11, sx > 0 ? 11 : -6.5, 12, 110);
    const ya = sx > 0 ? 6.5 : -40;
    const yb = sx > 0 ? 40 : -6.5;
    k.box((ya + yb) / 2, 0, -7.46, yb - ya, SIDE_Y + 0.006, 0.14, P.curbYellow, 'paint', { cast: false });
    k.box((ya + yb) / 2, 0, 7.46, yb - ya, SIDE_Y + 0.006, 0.14, P.curbYellow, 'paint', { cast: false });
    k.box(sx * 6.46, 0, -26, 0.14, SIDE_Y + 0.006, 28, P.curbYellow, 'paint', { cast: false });
    k.box(sx * 6.46, 0, 26, 0.14, SIDE_Y + 0.006, 28, P.curbYellow, 'paint', { cast: false });
  }
  // dirt shoulders along residential streets and the highway
  for (const sx of [-1, 1]) {
    dirt(sx * 6.5 - (sx > 0 ? 0 : 1.6), sx * 6.5 + (sx > 0 ? 1.6 : 0), -345, -110, P.dirt, false);
    dirt(sx * 6.5 - (sx > 0 ? 0 : 1.6), sx * 6.5 + (sx > 0 ? 1.6 : 0), 110, 130.5, P.dirt, false);
    for (const z of [-164, -266]) {
      dirt(sx > 0 ? 8.1 : -117, sx > 0 ? 117 : -8.1, z - 1.4, z, P.dirt, false);
      dirt(sx > 0 ? 8.1 : -117, sx > 0 ? 117 : -8.1, z + 8, z + 9.4, P.dirt, false);
    }
  }
  for (const sx of [-1, 1]) {
    dirt(sx > 0 ? 300 : -2400, sx > 0 ? 2400 : -300, -6.2, -4.6, P.dirtLight, false);
    dirt(sx > 0 ? 300 : -2400, sx > 0 ? 2400 : -300, 4.6, 6.2, P.dirtLight, false);
  }
  // manholes & drains
  for (const [x, z] of [
    [-40, 2],
    [36, -2],
    [0, -40],
    [2, 60],
    [-90, -2],
    [80, 2],
    [0, -200],
  ])
    pr.manhole(k, x, z);
  for (const x of [-60, -25, 25, 60, 95]) {
    pr.drain(k, x, 7.1, 0);
    pr.drain(k, x + 10, -7.1, 0);
  }

  // ------------------------------------------------------------------ Main Street, north side (west of Pine)
  const NF = -12.2; // building front line, north side
  brickStore(c, { x: -26, z: NF - 13, ry: 0, w: 30, d: 26, stories: 2, sign: 'bank', signW: 13, eyebrow: true, billboard: true, sideWindows: 1, chimneys: 2, door: 9 });
  donutShop(c, -50.5, NF - 8, 0);
  brickStore(c, { x: -71, z: NF - 12, ry: 0, w: 22, d: 24, stories: 2, sign: 'market24', signW: 12, blade: 'liquor', door: -5, trim: 0xd9cdb6 });
  brickStore(c, { x: -91, z: NF - 10, ry: 0, w: 16, d: 20, wall: 'brickPaint', sign: 'fruit', signW: 9.5, signH: 1.05, awning: 'awningRed', produce: true, door: 4 });
  brickStore(c, { x: -108.5, z: NF - 9, ry: 0, w: 15, d: 18, wall: 'brickTan', sign: 'pawn', signW: 9, door: -4, trim: 0xf0e8d8 });
  // north side (east of Pine)
  gasStation(c, 32, -30, 0);
  autoService(c, 66, NF - 10.5, 0);
  woodStore(c, 88, -22.8, 0, 'gun');
  diner(c, 108, NF - 6.5, 0);
  church(c, 31, -82, -HALF_PI);
  // south side (west of Pine)
  warehouse(c, -99, 26, Math.PI);
  sheriffOffice(c, -63, 44, Math.PI);
  postOffice(c, -36, 19.8, Math.PI);
  // sheriff parking lot
  k.box(-63, 0, 21.5, 30, 0.04, 18, P.asphaltDark, 'asphalt', { cast: false });
  for (let i = 0; i <= 8; i++) paint(-76 + i * 3.2, -75.88 + i * 3.2, 14, 19);
  c.occ.add(-63, 21.5, 30, 18, 0, 0.5);
  // pocket park on the SW corner
  k.box(-19, 0, 24, 14, SIDE_Y, 22, P.lawn, 'paint', { cast: false });
  k.box(-19, 0, 24, 1.8, SIDE_Y + 0.01, 22, P.sidewalk, 'concrete', { cast: false });
  k.box(-19, 0.17, 26, 2.4, 1.2, 1.0, 0x8b8a86, 'concrete');
  flagPole(k, signs, -19, 31, 10);
  pr.bench(k, -22.5, 20, HALF_PI);
  pr.bench(k, -15.5, 20, -HALF_PI);
  trees.push({ kind: 'oak', x: -24, z: 31, s: 1.0 }, { kind: 'oak', x: -15, z: 32, s: 0.75 });
  c.occ.add(-19, 24, 14, 22, 0, 0.2);

  // south side (east of Pine): motel complex
  k.box(62, 0, 26, 100, 0.04, 28, P.asphaltDark, 'asphalt', { cast: false });
  c.occ.add(62, 26, 100, 28, 0, 0.5);
  motel(c, 66, 48, Math.PI, 15);
  motelOffice(c, 20, 32, Math.PI);
  motelPylon(c, 14, 14.8, 0);
  for (let i = 0; i < 15; i++) paint(35 + i * 4.4, 35.12 + i * 4.4, 34, 39.5);

  // ------------------------------------------------------------------ west of Elm: feed store + lumber yard
  woodStore(c, -150, -23, 0, 'feed', 0x8a5a3a);
  woodStore(c, -176, -23, 0, 'hardware', 0xa8a39a);
  const LY = { x0: -205, x1: -136, z0: 13, z1: 72 };
  dirt(LY.x0, LY.x1, LY.z0, LY.z1, 0x8f7050);
  {
    const lrng = rng;
    for (let i = 0; i < 5; i++) pr.lumberStack(k, lrng, -184 + (i % 3) * 7, 26 + Math.floor(i / 3) * 5, 0.1 * (i - 2), lrng.int(2, 4));
    // deck under construction
    k.box(-160, 0, 52, 16, 0.5, 9, 0xa47e56, 'planks');
    k.box(-160, 0.5, 52, 16, 0.02, 9, 0x40464e, 'paint');
    for (let i = 0; i <= 6; i++) for (const zz of [47.5, 56.5]) k.box(-168 + i * 2.66, 0, zz, 0.2, 2.6, 0.2, P.woodDark);
    for (let i = 0; i <= 3; i++) k.box(-168, 0, 47.5 + i * 3, 0.2, 2.6, 0.2, P.woodDark);
    pr.dumpster(k, -196, 18, 0, P.dumpster, lrng);
    pr.propaneTank(k, -198, 40, HALF_PI);
    pr.crateStack(k, lrng, -174, 40, 0.3);
    pr.crateStack(k, lrng, -171, 41, -0.2);
    pr.barrel(k, -178, 30, 0x2f7db5);
    pr.barrel(k, -177.3, 30.4, 0x2f7db5);
    pr.barrel(k, -170, 36, 0xc76b2a);
    pr.hoseReel(k, -166, 42);
    for (let i = 0; i < 6; i++) k.box(-192 + i * 0.7, 0, 15, 0.12, 0.8, 0.12, i % 2 ? 0xe2552b : 0xf2f1ec);
    for (let i = 0; i < 5; i++) pr.cone(k, -186 + i * 3.4, 14.6);
    k.box(-150, 0, 36, 1.4, 1.0, 1.0, 0x8a8e92, 'metal');
    k.box(-147, 0, 30, 1.6, 0.8, 1.6, P.woodLight, 'planks');
    for (const [x, z] of [[-140, 14], [-200, 14], [-140, 70], [-200, 70]]) k.box(x, 0, z, 0.25, 2.4, 0.25, P.woodPole);
    for (const s of [-1, 1]) k.box(-150 + s * 2.6, 0, 13.2, 0.25, 3.4, 0.25, P.woodDark);
    k.sign(-150, 2.9, 13.2, 5.6, 1.1, signs.get('lumber'), { ry: Math.PI, back: 0xf3e7c8, twoSided: true, thick: 0.15 });
    shed(c, -195, 62, Math.PI, 0xe9e6dc, true);
    pr.railFence(k, LY.x0, LY.z1, LY.x1, LY.z1);
    pr.railFence(k, LY.x0, LY.z0 + 1, LY.x0, LY.z1);
    pr.pebbles(k, lrng, LY.x0, 6.5, LY.x1, LY.z1, 260, 0.012);
  }

  // ------------------------------------------------------------------ east of Oak: used car lot
  const CL = { x0: 134, x1: 198, z0: -64, z1: -9 };
  dirt(CL.x0, CL.x1, CL.z0, CL.z1, 0x977757);
  salesOffice(c, 184, -54, 0);
  const lotPoles: THREE.Vector3[] = [];
  for (const [x, z] of [
    [136, -10],
    [166, -10],
    [196, -10],
    [196, -38],
    [136, -38],
  ]) {
    k.cyl(x, 0, z, 0.12, 0.15, 7, 7, P.woodPole);
    lotPoles.push(new THREE.Vector3(x, 6.8, z));
  }
  for (let i = 0; i < lotPoles.length - 1; i++) pr.bunting(k, lotPoles[i], lotPoles[i + 1], rng);
  pr.bunting(k, lotPoles[1], new THREE.Vector3(166, 6.8, -38), rng);
  pr.bunting(k, lotPoles[4], new THREE.Vector3(166, 6.8, -38), rng);
  k.cyl(166, 0, -38, 0.12, 0.15, 7, 7, P.woodPole);
  {
    const lotCars: [VehicleType, number, number, number, number, object?][] = [
      ['pickup', 142, -18, -HALF_PI, 0xe8e2cf],
      ['sedan', 149, -18, -HALF_PI, 0x2f4a3d],
      ['jeep', 156, -18, -HALF_PI, 0xd9902a],
      ['pickup', 163, -18, -HALF_PI, 0xa62e2a, { accent: 0xf2f1ec }],
      ['van', 170, -18, -HALF_PI, 0xe4dbc3],
      ['suv', 177, -18, -HALF_PI, 0x8a8f94],
      ['semi', 156, -34, -HALF_PI, 0x1d1d1f, { accent: 0xd9d9d6 }],
      ['coupe', 142, -34, -HALF_PI, 0x1c1c1e],
      ['sedan', 170, -32, -HALF_PI, 0xc6b28c],
      ['wagon', 177, -32, -HALF_PI, 0x5e3d2a, { woody: true }],
    ];
    for (const [t, x, z, r, col, o] of lotCars) vehicle(k, signs, t, x, z, r, col, o as never);
    person(k, 160, -26, Math.PI * 0.8, { shirt: 0xf2efe6, pants: 0x1f1f22, skin: 0xf0c9a8, hair: 0x5a3a22, point: true });
    person(k, 161.4, -27.2, -0.6, { shirt: 0x6b4a33, pants: 0x2a3348, skin: 0xd8a47f, hair: 0x2a1f17, hat: 'cowboy' });
    pr.tireStack(k, 194, -30, 4);
    pr.tireStack(k, 195, -31, 3);
    pr.pebbles(k, rng, CL.x0, CL.z0, CL.x1, -6.5, 220, 0.012);
  }

  // ------------------------------------------------------------------ residential
  const shutterCols = [0x3b4048, 0x2f4a3a, 0x6b2a2a, 0x2c3a55, 0xf2efe8, 0x4a3a2a];
  const roofCols = [P.roofDark, P.roofNavy, 0x4a4f55, 0x5a3a2a, 0x2f4a3a, 0x3d4250];
  let forSalePlaced = false;
  const housePoints: THREE.Vector3[] = [];
  // placed after the lot transform is popped (shed() applies its own world transform)
  const sheds: [number, number, number, number][] = [];
  const lot = (x: number, z: number, ry: number, roadDist: number) => {
    const roll = rng.next();
    const color = rng.pick(SIDING_COLORS);
    const shutters = rng.pick(shutterCols);
    const roof = rng.pick(roofCols);
    let hw = 5.3;
    let front = 4.25;
    if (roll < 0.4) {
      colonial(c, x, z, ry, { color, roof, shutters, porch: rng.chance(0.6) ? 'portico' : 'full', chimney: rng.chance(0.3) ? 'white' : 'brick' });
    } else if (roll < 0.82) {
      ranch(c, x, z, ry, { color, roof, shutters, carport: rng.chance(0.5), flag: rng.chance(0.35), lights: rng.chance(0.6) });
      hw = 7;
      front = 4.5;
    } else {
      aframeCabin(c, x, z, ry, rng.pick([0x8b5e3c, 0x7a4f30, 0x9a6a45]));
      hw = 4;
      front = 5;
    }
    housePoints.push(new THREE.Vector3(x, 0, z));
    k.at(x, z, ry, () => {
      const dx = hw + 2.2;
      const len = roadDist - front + 2;
      const zc = front - 2 + len / 2;
      const concrete = rng.chance(0.65);
      k.plane(dx, 0.02, zc, 3.2, len, concrete ? P.concrete : P.dirt, concrete ? 'concrete' : 'paint');
      k.plane(-1.6 * (roll < 0.82 && roll >= 0.4 ? 1 : 0), 0.018, front + (roadDist - front) / 2, 1.2, roadDist - front, P.sidewalk, 'concrete');
      pr.ruralMailbox(k, dx + 2.2, roadDist - 0.4, -HALF_PI, rng.pick([0x2c2c2e, 0x8a8e92, 0x2c4a8c]));
      if (rng.chance(0.65)) {
        const t: VehicleType = rng.pick(['pickup', 'pickup', 'sedan', 'wagon', 'suv', 'van'] as const);
        vehicle(k, signs, t, dx, front + 4.5, HALF_PI, rng.pick(CAR_COLORS), rng.chance(0.3) ? { accent: 0xf2f1ec } : {});
      }
      if (rng.chance(0.3)) pr.picketFence(k, -hw - 1, roadDist - 2.5, -2.4, roadDist - 2.5);
      for (let i = 0; i < rng.int(2, 4); i++) {
        const p = k.toWorld(rng.range(-hw + 0.5, hw - 0.5), 0, front + 0.9);
        trees.push({ kind: 'bush', x: p.x, z: p.z, s: rng.range(0.6, 1.1) });
      }
      for (let i = 0; i < rng.int(1, 2); i++) {
        const p = k.toWorld(rng.sign() * rng.range(hw + 4, hw + 7), 0, rng.range(-6, front + 6));
        trees.push({ kind: rng.pick(['fir', 'oak', 'oak', 'pine'] as const), x: p.x, z: p.z, s: rng.range(0.6, 1.0) });
      }
      const g = k.toWorld(0, 0, front + (roadDist - front) / 2);
      grassPatches.push({ x: g.x, z: g.z, w: 18, d: 6, n: 10 });
      if (rng.chance(0.3)) {
        const p = k.toWorld(-hw + 1, 0, -10);
        sheds.push([p.x, p.z, ry, rng.pick(SIDING_COLORS)]);
      }
      if (!forSalePlaced && roll >= 0.4 && roll < 0.82) {
        forSalePlaced = true;
        k.box(3.5, 0, front + 6, 0.08, 1.4, 0.08, 0xf2f1ec);
        k.box(3.5, 1.3, front + 6, 1.4, 0.06, 0.06, 0xf2f1ec);
        k.sign(3.5, 0.9, front + 6.05, 1.2, 0.9, signs.get('forsale'), { back: 0xf2f1ec, thick: 0.04, twoSided: true });
      }
    });
  };
  // Pine Ave (both sides north of the commercial core)
  for (const z of [-128, -150, -182, -208, -234, -284, -310, -334]) {
    lot(-26, z, HALF_PI, 26 - 8.2);
    if (z < -100) lot(26, z, -HALF_PI, 26 - 8.2);
  }
  // Cedar Ln
  for (const x of [-56, -82, 56, 82]) {
    lot(x, -182, 0, 182 - 165.5);
    lot(x, -138, Math.PI, 154.5 - 138);
  }
  // Elm (west side) and Oak (east side)
  for (const z of [-62, -92, -122, -152, -188, -218, -246, -290]) {
    lot(-150, z, HALF_PI, 150 - 128.6);
    if (z < -80) lot(150, z, -HALF_PI, 150 - 128.6);
  }
  // Elm east / Oak west (behind Main Street)
  for (const z of [-80, -108, -212, -240]) {
    lot(-100, z, -HALF_PI, 15.4);
    lot(100, z, HALF_PI, 15.4);
  }
  // South St cottages
  for (const x of [-95, -60, 60, 95]) lot(x, 158, Math.PI, 158 - 141);
  for (const [x, z, r, col] of sheds) shed(c, x, z, r, col);

  // ------------------------------------------------------------------ farms (east along the highway)
  farmhouse(c, 325, 36, Math.PI);
  barn(c, 398, 44, Math.PI, { shed: true });
  waterTower(k, 346, 52, { legH: 9 });
  c.occ.add(346, 52, 6, 6, 0, 1);
  const wm = windmill(c, 428, 72, Math.PI * 0.85);
  animated.push({ obj: wm, update: (dt) => (wm.rotation.z -= dt * 1.6) });
  cornFields.push({ x: 279, z: 52, w: 40, d: 70, ry: 0 });
  c.occ.add(279, 52, 40, 70, 0, 0.5);
  pr.railFence(k, 258, 16, 300, 16);
  pr.railFence(k, 258, 16, 258, 88);
  pr.picketFence(k, 306, 13.5, 348, 13.5);
  pr.picketFence(k, 368, 13.5, 380, 13.5);
  dirt(352, 364, 4.6, 34, P.dirt);
  dirt(352, 420, 30, 58, 0x8f7050, false);
  pr.ruralMailbox(k, 350, 9, Math.PI);
  vehicle(k, signs, 'pickup', 337, 22, HALF_PI, 0x6d8ea3, { accent: 0xe9e8e2 });
  vehicle(k, signs, 'tow', 380, 28, -0.25, 0xe9e8e2, { accent: 0x2c3858 });
  person(k, 334, 24, 0.4, { shirt: 0x8a5a3a, pants: 0x2a3348, skin: 0xd8a47f, hair: 0x9a9a98, hat: 'cowboy' });
  for (let i = 0; i < 6; i++) k.box(408 + (i % 3) * 1.3, i > 2 ? 0.8 : 0, 22 + (i > 2 ? 0.3 : 0), 1.2, 0.8, 0.9, 0xd8b75a);
  for (let i = 0; i < 4; i++) pr.barrel(k, 384 + i * 0.7, 52, 0x2f7a5a);
  grassPatches.push({ x: 330, z: 20, w: 60, d: 14, n: 160 }, { x: 395, z: 20, w: 40, d: 14, n: 100 });
  for (let i = 0; i < 10; i++) trees.push({ kind: rng.pick(['oak', 'fir', 'pine'] as const), x: rng.range(300, 440), z: rng.range(80, 120) });
  trees.push({ kind: 'oak', x: 312, z: 50, s: 1.2 }, { kind: 'oak', x: 368, z: 62, s: 1.1 }, { kind: 'bush', x: 360, z: 40 }, { kind: 'bush', x: 316, z: 30 });
  // north farm
  barn(c, 292, -140, 0, { shed: true });
  k.cyl(308, 0, -132, 3.0, 3.0, 13, 14, 0xb9bcbf, 'metal');
  k.sphere(308, 13, -132, 3.05, 0xa9adb0, 'metal', 14, 7);
  for (let i = 1; i < 6; i++) k.cyl(308, i * 2.2, -132, 3.05, 3.05, 0.1, 14, 0x7f8387, 'metal');
  c.occ.add(308, -132, 7, 7, 0, 1);
  cornFields.push({ x: 232, z: -112, w: 50, d: 70, ry: 0 });
  c.occ.add(232, -112, 50, 70, 0, 0.5);
  dirt(268, 273, -126, -4.6, P.dirt);
  pr.railFence(k, 206, -76, 260, -76);
  vehicle(k, signs, 'pickup', 296, -122, -HALF_PI, 0x7b2532, { accent: 0xe9e8e2 });

  // ------------------------------------------------------------------ highway set dressing
  welcomeSign(c, -430, 14, -HALF_PI);
  roadsideBillboard(c, -720, -18, HALF_PI + 0.35, 'billboardPark');
  roadsideBillboard(c, 640, -20, -HALF_PI - 0.4, 'billboardCola');
  pr.postSign(k, signs, 'us20', -320, 7.5, -HALF_PI, { w: 0.8, h: 0.8 });
  pr.postSign(k, signs, 'us20', 320, -7.5, HALF_PI, { w: 0.8, h: 0.8 });
  pr.postSign(k, signs, 'speed25', -305, 7.5, -HALF_PI, { w: 0.7, h: 0.9 });
  pr.postSign(k, signs, 'speed25', 305, -7.5, HALF_PI, { w: 0.7, h: 0.9 });
  pr.postSign(k, signs, 'curve', 900, 7.4, -HALF_PI);

  // ------------------------------------------------------------------ power lines
  const runX = (z: number, x0: number, x1: number, step: number, skip?: (x: number) => boolean) => {
    const pts: THREE.Vector3[][] = [];
    for (let x = x0; x <= x1; x += step) {
      if (skip?.(x)) continue;
      const y = heightAt(x, z);
      const p = utilityAt(x, z, HALF_PI, y, rng.chance(0.2));
      pts.push(p);
    }
    pr.connectPoles(k, pts);
    return pts;
  };
  const runZ = (x: number, z0: number, z1: number, step: number, skip?: (z: number) => boolean) => {
    const pts: THREE.Vector3[][] = [];
    for (let z = z0; z <= z1; z += step) {
      if (skip?.(z)) continue;
      pts.push(utilityAt(x, z, 0, heightAt(x, z), rng.chance(0.2)));
    }
    pr.connectPoles(k, pts);
    return pts;
  };
  const poleList: THREE.Vector3[][] = [];
  const utilityAt = (x: number, z: number, ry: number, y: number, tr: boolean) => {
    let att: THREE.Vector3[] = [];
    k.at(x, z, ry, () => (att = pr.utilityPole(k, 0, 0, 0, { transformer: tr })), y);
    c.occ.add(x, z, 0.6, 0.6, 0, 0.4);
    poleList.push(att);
    return att;
  };
  runX(-8.3, -290, 290, 32, (x) => Math.abs(x) < 14 || (Math.abs(x) > 112 && Math.abs(x) < 132));
  runX(-6.8, -1700, -306, 46);
  runX(-6.8, 306, 1700, 46);
  runZ(8.4, -340, -20, 32);
  runZ(8.4, 20, 128, 27);
  runX(-165.6, -114, -12, 34);
  runX(-165.6, 12, 114, 34);
  runX(-267.6, -114, 114, 38, (x) => Math.abs(x) < 8);
  runZ(-129.2, -262, 128, 33, (z) => Math.abs(z) < 12);
  runZ(129.2, -262, 128, 33, (z) => Math.abs(z) < 12);
  runX(141.2, -110, 110, 36, (x) => Math.abs(x) < 8);
  // service drops from the nearest pole to each house
  for (const hp of housePoints) {
    let best: THREE.Vector3 | null = null;
    let bd = 1e9;
    for (const p of poleList) {
      const d = Math.hypot(p[3].x - hp.x, p[3].z - hp.z);
      if (d < bd) {
        bd = d;
        best = p[3];
      }
    }
    if (best && bd < 55) pr.wire(k, best, new THREE.Vector3(hp.x, 5.6, hp.z).lerp(best, 0.12), 0.05, 0.015);
  }

  // ------------------------------------------------------------------ street furniture
  for (let x = -110; x <= 110; x += 36) if (Math.abs(x) > 15) pr.streetLight(k, x, 8.3, Math.PI);
  for (let z = -100; z <= 100; z += 40) if (Math.abs(z) > 15) pr.streetLight(k, -8.3, z, HALF_PI);
  pr.trafficSignal(k, 9.4, -9.6, 0, 7.5, 'green');
  pr.trafficSignal(k, -9.4, 9.6, Math.PI, 7.5, 'green');
  pr.trafficSignal(k, -9.4, -9.6, HALF_PI, 6.5, 'red');
  pr.trafficSignal(k, 9.4, 9.6, -HALF_PI, 6.5, 'red');
  pr.postSign(k, signs, 'ped', 12.5, -11.2, HALF_PI);
  pr.postSign(k, signs, 'ped', -12.5, 11.2, -HALF_PI);
  pr.postSign(k, signs, 'ped', 10.4, 13.8, Math.PI);
  for (const [x, z, r] of [
    [-128.6, -9.5, Math.PI],
    [128.6, 9.5, 0],
    [-6.9, -168, Math.PI],
    [6.9, -152, 0],
    [-6.9, -270, Math.PI],
    [6.9, -254, 0],
  ] as const)
    pr.postSign(k, signs, 'stop', x, z, r, { w: 0.75, h: 0.75 });
  for (const [x, z] of [
    [-11.2, -11],
    [11.4, 11.2],
    [-60, 11.4],
    [74, -11.4],
    [-128.5, -30],
    [6.9, -120],
  ])
    pr.hydrant(k, x, z + (Math.abs(z) < 13 ? 0 : 0));
  pr.uspsBox(k, signs, -12.4, -10.6, 0);
  pr.uspsBox(k, signs, -33, 10.8, Math.PI);
  pr.newsBoxes(k, signs, 14.5, -10.9, 0);
  pr.newsBoxes(k, signs, -44, 10.9, Math.PI);
  pr.payphone(k, 12.6, -15.5, HALF_PI);
  for (const x of [-100, -64, -38, -16, 22, 58, 94]) pr.trashCan(k, x, -8.4);
  for (const x of [-84, -20, 40, 100]) pr.trashCan(k, x, 8.4);
  pr.bench(k, -58, -11.2, 0);
  pr.bench(k, -82, -11.2, 0);
  pr.bench(k, 100, 11.2, Math.PI);
  // alley clutter behind Main Street
  for (const [x, z] of [
    [-30, -41],
    [-56, -31],
    [-80, -39],
    [62, -36],
    [100, -27],
  ])
    pr.dumpster(k, x, z, 0, P.dumpster, rng);
  pr.dumpster(k, -80, 15.5, 0, P.dumpster, rng);
  pr.dumpster(k, -118 + 30, 16, 0, 0x3a5f8a);
  for (let i = 0; i < 3; i++) pr.crateStack(k, rng, -105 + i * 1.6, 15.2, rng.range(-0.3, 0.3));
  pr.tireStack(k, 77.2, -16, 5);
  pr.tireStack(k, 77.6, -17.2, 3);
  for (let i = 0; i < 3; i++) pr.barrel(k, 77.4, -19 - i * 0.7, 0x8a2a2a);

  // ------------------------------------------------------------------ parked & placed vehicles
  const mainParked = (x: number, south: boolean) => {
    const t: VehicleType = rng.pick(['sedan', 'sedan', 'pickup', 'wagon', 'coupe', 'suv', 'van'] as const);
    vehicle(k, signs, t, x, south ? 5.65 : -5.65, south ? 0 : Math.PI, rng.pick(CAR_COLORS), t === 'pickup' && rng.chance(0.4) ? { accent: 0xf2f1ec } : t === 'coupe' ? { stripes: rng.chance(0.5) } : {});
  };
  for (const x of [-108, -95, -82, -62, -42, -36, 24, 48, 62, 81, 100])
    if (rng.chance(0.85)) mainParked(x + rng.range(-0.6, 0.6), false);
  for (const x of [-104, -88, -70, -48, 34, 52, 72, 90, 108]) if (rng.chance(0.85)) mainParked(x + rng.range(-0.6, 0.6), true);
  vehicle(k, signs, 'sheriff', -17.5, 5.65, 0, 0);
  vehicle(k, signs, 'sheriff', -24.5, 5.65, 0.0, 0);
  // cars waiting at the red light on Pine Ave (Main Street traffic is animated)
  vehicle(k, signs, 'sedan', 3.3, 16.5, HALF_PI, 0xc6b28c);
  vehicle(k, signs, 'pickup', 3.3, 23.5, HALF_PI, 0x1c1c1e, { accent: 0xc6b28c });
  vehicle(k, signs, 'coupe', -3.3, -16.8, -HALF_PI, 0x2e4a3c);
  // sheriff lot
  vehicle(k, signs, 'sheriff', -73.5, 16.5, HALF_PI, 0);
  vehicle(k, signs, 'sheriffSuv', -70.3, 16.5, HALF_PI, 0);
  vehicle(k, signs, 'sheriff', -57.5, 16.5, HALF_PI, 0);
  vehicle(k, signs, 'sedan', -51.1, 16.5, HALF_PI, 0x2c3858);
  // gas station
  vehicle(k, signs, 'pickup', 29, -23.5, HALF_PI, 0xa62e2a, { accent: 0xf2f1ec });
  vehicle(k, signs, 'coupe', 37.2, -25, HALF_PI, 0xd27d2c, { stripes: true });
  vehicle(k, signs, 'van', 18, -16, Math.PI, 0xc6b28c);
  vehicle(k, signs, 'tow', 46, -40, HALF_PI, 0x2c3858, { accent: 0xe9e8e2 });
  vehicle(k, signs, 'sedan', 62.0, -16.2, -HALF_PI, 0x7b2532);
  // motel lot
  for (const [x, t, col] of [
    [38, 'sedan', 0xe4dbc3],
    [47, 'pickup', 0x2f4a3d],
    [60, 'wagon', 0x8fa6bd],
    [73, 'sedan', 0x5e3d2a],
    [86, 'suv', 0xa62e2a],
    [95, 'van', 0xe9e8e2],
  ] as const)
    vehicle(k, signs, t, x, 36.5, -HALF_PI, col);
  // semi parked on the highway shoulder east of town + traffic at the intersection
  vehicle(k, signs, 'semi', 520, -2.2, Math.PI, 0xa62e2a, { trailer: true, accent: 0xf2f1ec });
  vehicle(k, signs, 'van', -165, 9.8, 0.05, 0xe4dbc3);
  vehicle(k, signs, 'sheriffSuv', -152, 10.0, 0.0, 0);
  vehicle(k, signs, 'van', -78, 19, Math.PI * 0.5, 0x8fa6bd);
  vehicle(k, signs, 'pickup', 40, -78, HALF_PI, 0x5e3d2a);
  vehicle(k, signs, 'sedan', 44, -84, HALF_PI, 0xe9e8e2);

  // ------------------------------------------------------------------ people
  crowd(k, rng, -50, -10.2, 3, 0.9);
  person(k, -56.5, -10.6, 0.2, deputy(rng));
  person(k, -55.6, -10.1, -0.4, randomPerson(rng));
  person(k, -46, -10.4, 0.1, { shirt: 0x8a5a3a, pants: 0x2a3348, skin: 0xf0c9a8, hair: 0x2a1f17, hat: 'cowboy' });
  crowd(k, rng, -28, -10.0, 2, 0.6);
  crowd(k, rng, -20.5, 9.9, 3, 0.9, deputy);
  crowd(k, rng, 13.5, -14.0, 2, 0.6);
  crowd(k, rng, 9.2, 11.2, 3, 0.8);
  crowd(k, rng, -8.6, 11, 4, 1.0);
  crowd(k, rng, -9.0, -22, 2, 0.6);
  crowd(k, rng, -84, -10.0, 2, 0.6);
  crowd(k, rng, 105, -10.6, 2, 0.6);
  crowd(k, rng, 30, -11.5, 2, 0.6);
  crowd(k, rng, -63, 31, 3, 0.9, deputy);
  crowd(k, rng, 15, -95, 3, 1.0);
  person(k, -162, 12, Math.PI, randomPerson(rng));
  person(k, -161, 12.8, -0.6, deputy(rng));
  person(k, 40, 40.8, Math.PI, randomPerson(rng));
  for (let i = 0; i < 10; i++) {
    const x = rng.range(-110, 110);
    if (Math.abs(x) < 14) continue;
    const south = rng.chance(0.5);
    person(k, x, south ? rng.range(8.6, 11.4) : rng.range(-11.4, -8.6), rng.chance(0.5) ? HALF_PI : -HALF_PI, randomPerson(rng));
  }

  // ------------------------------------------------------------------ street trees & lawn grass
  for (let z = -330; z <= -120; z += 22)
    for (const sx of [-1, 1]) if (rng.chance(0.7)) trees.push({ kind: rng.pick(['oak', 'fir', 'oak'] as const), x: sx * rng.range(11, 13), z: z + rng.range(-4, 4), s: rng.range(0.6, 0.95) });
  for (let x = -110; x <= 110; x += 24) trees.push({ kind: 'oak', x: x + rng.range(-3, 3), z: -150 + rng.range(-2, 2), s: 0.7 });
  grassPatches.push({ x: 0, z: -230, w: 30, d: 220, n: 900 }, { x: -170, z: -80, w: 40, d: 120, n: 600 }, { x: 170, z: -150, w: 40, d: 160, n: 600 });

  return {
    veg: { trees, cornFields, grassPatches },
    animated,
    spawn: new THREE.Vector3(-30, 1.7, 30),
  };
}

export function unusedRng(r: Rng) {
  return r;
}

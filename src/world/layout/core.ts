import { Layout, HALF_PI, SIDE_Y } from './helpers';
import { brickStore, donutShop, gasStation, autoService, woodStore, diner, postOffice } from '../buildings/commercial';
import { sheriffOffice, motel, motelOffice, motelPylon, warehouse, church } from '../buildings/civic';
import { courthouse, townHall, policeStation, fireStation, theater, grocery, library, falseFront, gazebo, statue, fountain, burgerBarn } from '../buildings/downtown';
import { flagPole } from '../buildings/common';
import * as pr from '../props';
import { P } from '../palette';

/** Front line of the Court Street south-side row (fronts face north). */
export const COURT_FRONT = -65.5;

export function roads(L: Layout) {
  const { k, signs } = L;
  // Main Street / US-20
  L.road(-300, 300, -7.5, 7.5);
  L.road(-9000, -300, -4.6, 4.6, P.asphalt, 'highway');
  L.road(300, 9000, -4.6, 4.6, P.asphalt, 'highway');
  // Pine Ave: Main→Court, Cedar→north edge; SR-9 continues inside town south of South St
  L.road(-6.5, 6.5, -70, -7.5);
  L.road(-6.5, 6.5, -345, -156);
  L.road(-6.5, 6.5, 7.5, 130.5);
  L.road(-4.6, 4.6, 139.5, 345, P.asphalt, 'highway');
  // Court St and the courthouse-square ring
  L.road(-117, 117, -82, -70);
  L.road(-48, -38, -156, -82);
  L.road(38, 48, -156, -82);
  // Elm / Oak / Cedar / north road / South St
  for (const sx of [-1, 1]) {
    L.road(sx > 0 ? 117 : -127, sx > 0 ? 127 : -117, -266, -7.5);
    L.road(sx > 0 ? 117 : -127, sx > 0 ? 127 : -117, 7.5, 130.5);
    L.road(sx > 0 ? 6.5 : -117, sx > 0 ? 117 : -6.5, -164, -156);
    L.road(sx > 0 ? 6.5 : -117, sx > 0 ? 117 : -6.5, -266, -258);
  }
  L.road(-127, 127, 130.5, 139.5);
  // service alleys behind Main Street
  L.road(-117, -6.5, -51.5, -44.5, 0x7d8189, 'alley');
  L.road(56, 82, -51.5, -44.5, 0x7d8189, 'alley');
  // gravel access road to the substation
  k.box(-218.5, -0.3, -262, 183, 0.34, 8, 0xa9a49a, 'gravel', { cast: false });
  L.c.occ.add(-218.5, -262, 183, 8, 0, 1.2, false);
  L.c.roads.push({ x0: -310, x1: -127, z0: -266, z1: -258, kind: 'dirt' });

  // ---- markings
  for (const [a, b] of [
    [-9000, -11.6],
    [11.6, 9000],
  ]) {
    L.paint(a, b, -0.2, -0.08, P.lineYellow);
    L.paint(a, b, 0.08, 0.2, P.lineYellow);
  }
  for (const [a, b] of [
    [-300, -11.6],
    [11.6, 300],
  ]) {
    L.paint(a, b, -3.76, -3.64);
    L.paint(a, b, 3.64, 3.76);
  }
  for (const [a, b] of [
    [-6000, -300],
    [300, 6000],
  ]) {
    L.paint(a, b, -4.3, -4.18);
    L.paint(a, b, 4.18, 4.3);
  }
  for (let x = 16; x < 116; x += 6.5)
    for (const sx of [-1, 1]) {
      L.paint(sx * x - 0.06, sx * x + 0.06, 3.7, 4.9);
      L.paint(sx * x - 0.06, sx * x + 0.06, -4.9, -3.7);
    }
  for (const [a, b] of [
    [-66, -12.6],
    [-345, -168.5],
    [12.6, 130.5],
    [139.5, 345],
  ]) {
    L.paint(-0.2, -0.08, a, b, P.lineYellow);
    L.paint(0.08, 0.2, a, b, P.lineYellow);
  }
  L.paint(-4.3, -4.18, 139.5, 345);
  L.paint(4.18, 4.3, 139.5, 345);
  // Court St centre line, skipping intersections
  for (const [a, b] of [
    [-113, -52],
    [-34, -10.5],
    [10.5, 34],
    [52, 113],
  ]) {
    L.paint(a, b, -76.2, -76.08, P.lineYellow);
    L.paint(a, b, -75.92, -75.8, P.lineYellow);
  }
  for (const x of [-43, 43]) {
    L.paint(x - 0.06, x + 0.06, -152, -86);
  }
  // crosswalks + stop bars at Main & Pine
  for (const sx of [-1, 1]) {
    for (let z = -7.0; z < 7.2; z += 1.0) L.paint(sx * 7.0 - (sx > 0 ? 0 : 4), sx * 7.0 + (sx > 0 ? 4 : 0), z, z + 0.55);
    for (let x = -6.0; x < 6.2; x += 1.0) L.paint(x, x + 0.55, sx * 7.9 - (sx > 0 ? 0 : 3.8), sx * 7.9 + (sx > 0 ? 3.8 : 0));
  }
  L.paint(11.6, 12.0, -7.3, -0.3);
  L.paint(-12.0, -11.6, 0.3, 7.3);
  L.paint(-6.3, -0.3, -12.6, -12.2);
  L.paint(0.3, 6.3, 12.2, 12.6);
  k.signPlane(-3.2, 0.04, -17, 4.2, 1.6, signs.get('roadStop'), { rx: -HALF_PI, ry: Math.PI });
  k.signPlane(3.2, 0.04, 17, 4.2, 1.6, signs.get('roadStop'), { rx: -HALF_PI });
  // crosswalks at Court & Pine and the square corners
  for (let x = -6; x < 6.2; x += 1.0) L.paint(x, x + 0.55, -69.6, -66.2);
  for (const cx of [-43, 43]) for (let x = -4.5; x < 4.7; x += 1.0) L.paint(cx + x, cx + x + 0.55, -85.8, -82.4);
  for (let z = -81.4; z < -70.6; z += 1.0) {
    L.paint(-10.6, -7.0, z, z + 0.55);
    L.paint(7.0, 10.6, z, z + 0.55);
  }
  k.signPlane(3.2, 0.04, -61, 4.2, 1.6, signs.get('roadStop'), { rx: -HALF_PI });
  k.signPlane(-3.2, 0.04, -173, 4.2, 1.6, signs.get('roadStop'), { rx: -HALF_PI, ry: Math.PI });

  // ---- sidewalks
  for (const sx of [-1, 1]) {
    const xa = sx > 0 ? 6.5 : -117;
    const xb = sx > 0 ? 117 : -6.5;
    L.sidewalk(xa, xb, -12, -7.5);
    L.sidewalk(xa, xb, 7.5, 12);
    L.sidewalk(sx > 0 ? 6.5 : -11, sx > 0 ? 11 : -6.5, -65.5, -12);
    L.sidewalk(sx > 0 ? 6.5 : -11, sx > 0 ? 11 : -6.5, 12, 110);
    L.sidewalk(xa, xb, -70, -65.5);
    L.sidewalk(xa, xb, -168.5, -164);
    L.sidewalk(sx > 0 ? 48 : -117, sx > 0 ? 117 : -48, -86.5, -82);
    L.sidewalk(sx > 0 ? 48 : -52.5, sx > 0 ? 52.5 : -48, -156, -86.5);
    const ya = sx > 0 ? 6.5 : -40;
    const yb = sx > 0 ? 40 : -6.5;
    k.box((ya + yb) / 2, 0, -7.46, yb - ya, SIDE_Y + 0.006, 0.14, P.curbYellow, 'paint', { cast: false });
    k.box((ya + yb) / 2, 0, 7.46, yb - ya, SIDE_Y + 0.006, 0.14, P.curbYellow, 'paint', { cast: false });
    k.box(sx * 6.46, 0, -26, 0.14, SIDE_Y + 0.006, 28, P.curbYellow, 'paint', { cast: false });
    k.box(sx * 6.46, 0, 26, 0.14, SIDE_Y + 0.006, 28, P.curbYellow, 'paint', { cast: false });
  }
  // square inner ring
  L.sidewalk(-38, 38, -86, -82);
  L.sidewalk(-38, 38, -156, -152);
  L.sidewalk(-38, -34, -152, -86);
  L.sidewalk(34, 38, -152, -86);
  // dirt shoulders on residential streets and the highway
  for (const sx of [-1, 1]) {
    L.dirt(sx * 6.5 - (sx > 0 ? 0 : 1.6), sx * 6.5 + (sx > 0 ? 1.6 : 0), -345, -168.5, P.dirt, false);
    L.dirt(sx * 6.5 - (sx > 0 ? 0 : 1.6), sx * 6.5 + (sx > 0 ? 1.6 : 0), 110, 130.5, P.dirt, false);
    L.dirt(sx > 0 ? 8.1 : -117, sx > 0 ? 117 : -8.1, -267.4, -266, P.dirt, false);
    L.dirt(sx > 0 ? 8.1 : -117, sx > 0 ? 117 : -8.1, -258, -256.6, P.dirt, false);
    L.dirt(sx > 0 ? 300 : -2400, sx > 0 ? 2400 : -300, -6.2, -4.6, P.dirtLight, false);
    L.dirt(sx > 0 ? 300 : -2400, sx > 0 ? 2400 : -300, 4.6, 6.2, P.dirtLight, false);
    L.dirt(sx * 4.6 - (sx > 0 ? 0 : 1.6), sx * 4.6 + (sx > 0 ? 1.6 : 0), 139.5, 345, P.dirtLight, false);
  }
  for (const [x, z] of [
    [-40, 2],
    [36, -2],
    [0, -40],
    [2, 60],
    [-90, -2],
    [80, 2],
    [0, -200],
    [-60, -76],
    [60, -76],
    [0, -120 + 44],
  ])
    pr.manhole(k, x, z);
  for (const x of [-60, -25, 25, 60, 95]) {
    pr.drain(k, x, 7.1, 0);
    pr.drain(k, x + 10, -7.1, 0);
    pr.drain(k, x, -70.4, 0);
  }
}

export function mainStreet(L: Layout) {
  const { c, k, signs } = L;
  const NF = -12.2;
  brickStore(c, { x: -26, z: NF - 13, ry: 0, w: 30, d: 26, stories: 2, sign: 'bank', signW: 13, eyebrow: true, billboard: true, sideWindows: 1, chimneys: 2, door: 9, fireEscape: true });
  donutShop(c, -50.5, NF - 8, 0);
  brickStore(c, { x: -71, z: NF - 12, ry: 0, w: 22, d: 24, stories: 2, sign: 'market24', signW: 12, blade: 'liquor', door: -5, trim: 0xd9cdb6, fireEscape: true });
  brickStore(c, { x: -91, z: NF - 10, ry: 0, w: 16, d: 20, wall: 'brickPaint', sign: 'fruit', signW: 9.5, signH: 1.05, awning: 'awningRed', produce: true, door: 4 });
  brickStore(c, { x: -108.5, z: NF - 9, ry: 0, w: 15, d: 18, wall: 'brickTan', sign: 'pawn', signW: 9, door: -4, trim: 0xf0e8d8 });
  gasStation(c, 32, -30, 0);
  autoService(c, 66, NF - 10.5, 0);
  woodStore(c, 88, -22.8, 0, 'gun');
  diner(c, 108, NF - 6.5, 0);
  warehouse(c, -99, 26, Math.PI);
  sheriffOffice(c, -63, 44, Math.PI);
  postOffice(c, -36, 19.8, Math.PI);
  L.pave(-78, -48, 12.5, 30.5);
  for (let i = 0; i <= 8; i++) L.paint(-76 + i * 3.2, -75.88 + i * 3.2, 14, 19);
  // pocket park
  L.lawn(-26, -12, 13, 35);
  k.box(-19, 0, 24, 1.8, SIDE_Y + 0.01, 22, P.sidewalk, 'concrete', { cast: false });
  k.box(-19, 0.17, 26, 2.4, 1.2, 1.0, 0x8b8a86, 'concrete');
  k.solid(-19, 26, 2.4, 1.0);
  flagPole(k, signs, -19, 31, 10);
  pr.bench(k, -22.5, 20, HALF_PI);
  pr.bench(k, -15.5, 20, -HALF_PI);
  L.trees.push({ kind: 'oak', x: -24, z: 31, s: 1.0 }, { kind: 'oak', x: -15, z: 32, s: 0.75 });
  // motel complex + drive-in
  L.pave(12, 88, 12, 40);
  motel(c, 66, 48, Math.PI, 15);
  motelOffice(c, 20, 32, Math.PI);
  motelPylon(c, 14, 14.8, 0);
  for (let i = 0; i < 12; i++) L.paint(35 + i * 4.4, 35.12 + i * 4.4, 34, 39.5);
  L.pave(90, 116, 12, 40);
  burgerBarn(c, 104, 27, Math.PI);
  for (let i = 0; i < 4; i++) L.paint(91, 94.5, 19.6 + i * 4, 19.72 + i * 4);
}

function courtRow(L: Layout) {
  const { c } = L;
  const F = COURT_FRONT;
  const D = 13;
  const z = F + D / 2;
  const R = Math.PI;
  brickStore(c, { x: -108, z, ry: R, w: 14, d: D, stories: 2, wall: 'brickTan', sign: 'gazette', signW: 11, door: 3, fireEscape: true, chimneys: 1 });
  brickStore(c, { x: -95, z, ry: R, w: 11, d: D, wall: 'brickPaint', wallColor: 0xe9eef5, sign: 'barber', signW: 8, door: -2, barber: true, chimneys: 0 });
  brickStore(c, { x: -81.5, z, ry: R, w: 15, d: D, sign: 'pizza', signW: 11, awning: 'awningGreen', seating: 0x1f5a34, neon: 'neonOpen', door: 4 });
  theater(c, -64.5, z, R, D);
  brickStore(c, { x: -48, z, ry: R, w: 14, d: D, wall: 'brickPaint', wallColor: 0xf3e9d2, sign: 'cafe', signW: 11, signH: 1.1, awning: 'awningRed', seating: 0xc8262c, door: 3.5 });
  brickStore(c, { x: -33.5, z, ry: R, w: 14, d: D, stories: 2, wall: 'brickBrown', sign: 'drugs', signW: 11, signH: 1.05, planters: true, door: -3, eyebrow: true });
  brickStore(c, { x: -17.5, z, ry: R, w: 17, d: D, stories: 3, wall: 'brickDark', sign: 'hotel', signW: 12, awning: 'awningGreen', fireEscape: true, roofSign: 'hotelRoof', sideWindows: 1, door: -4, planters: true });
  brickStore(c, { x: 17.5, z, ry: R, w: 16, d: D, wall: 'brickPaint', wallColor: 0xf6e6c8, sign: 'chinese', signW: 12, awning: 'awningRed', neon: 'neonOpen', door: 4 });
  brickStore(c, { x: 32, z, ry: R, w: 12, d: D, stories: 2, sign: 'books', signW: 9.5, door: -2.5, eyebrow: true });
  brickStore(c, { x: 45, z, ry: R, w: 13, d: D, wall: 'brickPaint', wallColor: 0xfbe9ee, sign: 'bakery', signW: 10, awning: 'awningRed', seating: 0x8c2f4f, door: 3 });
  brickStore(c, { x: 58, z, ry: R, w: 12, d: D, wall: 'stucco', wallColor: 0xdfe9ee, sign: 'laundromat', signW: 9.5, neon: 'neonOpen', door: -3 });
  falseFront(c, 73, z, R, { w: 17, d: D, sign: 'tavern', color: 0x6a4a32, balcony: true });
  c.kit.at(73, z, R, () => c.kit.sign(-5.2, 1.9, D / 2 + 0.12, 2.2, 0.7, c.signs.get('neonBeer'), {}));
  fireStation(c, 99, F + 9, R);
}

function square(L: Layout) {
  const { c, k, rng } = L;
  L.lawn(-34, 34, -152, -86);
  const path = (x0: number, x1: number, z0: number, z1: number) => k.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, SIDE_Y + 0.012, z1 - z0, P.sidewalk, 'concrete', { cast: false });
  path(-2.5, 2.5, -104, -86);
  path(-34, 34, -97, -93);
  k.cyl(0, 0, -95, 7, 7, SIDE_Y + 0.016, 16, 0xcfd0d1, 'concrete', { cast: false });
  path(-22, -18, -140, -100);
  path(18, 22, -140, -100);
  path(-22, 22, -144, -140);
  path(-34, -22, -122, -118);
  path(22, 34, -122, -118);
  courthouse(c, 0, -122, 0);
  statue(c, 0, -95, 0);
  fountain(c, -26, -110);
  gazebo(c, 24, -132);
  for (const s of [-1, 1]) flagPole(k, L.signs, s * 6, -101, 11);
  for (const [bx, bz, r] of [
    [-10, -91.5, 0],
    [10, -91.5, 0],
    [-10, -98.5, Math.PI],
    [10, -98.5, Math.PI],
    [-26, -115.5, Math.PI],
    [-16.5, -128, HALF_PI],
    [16.5, -128, -HALF_PI],
    [-6, -145.5, 0],
    [6, -145.5, 0],
  ] as const)
    pr.bench(k, bx, bz, r);
  for (const [lx, lz] of [
    [-4.2, -88],
    [4.2, -88],
    [-15, -91],
    [15, -91],
    [-30, -91],
    [30, -91],
    [-23.8, -106],
    [23.8, -106],
    [-23.8, -138],
    [23.8, -138],
    [0, -146],
  ])
    pr.acornLamp(k, lx, lz);
  for (const px of [-7.5, 7.5]) pr.planter(k, px, -102.5, 0xf2c94c);
  for (let x = -30; x <= 30; x += 10) {
    // keep the courthouse façade open from Court St
    if (Math.abs(x) >= 20) L.trees.push({ kind: 'oak', x, z: -89, s: 0.85 });
    L.trees.push({ kind: x % 20 === 0 ? 'oak' : 'fir', x, z: -149, s: 0.8 });
  }
  for (let z = -142; z <= -104; z += 9.5)
    for (const sx of [-1, 1]) L.trees.push({ kind: 'oak', x: sx * 31, z, s: 0.8 + rng.range(0, 0.2) });
  L.grass(-26, -140, 14, 20, 60);
  L.grass(28, -112, 10, 30, 60);
}

function squareSides(L: Layout) {
  const { c } = L;
  const W = -59.5;
  const E = 59.5;
  falseFront(c, W, -144, HALF_PI, { w: 14, d: 14, sign: 'antiques', color: 0x7a5a3c, balcony: true });
  brickStore(c, { x: W, z: -129.5, ry: HALF_PI, w: 15, d: 14, stories: 2, wall: 'brickBrown', sign: 'western', signW: 11, door: 3, eyebrow: true, chimneys: 1 });
  brickStore(c, { x: W, z: -114.5, ry: HALF_PI, w: 15, d: 14, wall: 'stucco', wallColor: 0xe9e1cf, sign: 'florist', signW: 9, awning: 'awningGreen', planters: true, door: -3 });
  brickStore(c, { x: W, z: -97, ry: HALF_PI, w: 20, d: 14, wall: 'brickPaint', wallColor: 0xfff0f4, sign: 'icecream', signW: 13, awning: 'awningBlue', seating: 0x6bc3c9, door: 5 });
  brickStore(c, { x: E, z: -144, ry: -HALF_PI, w: 14, d: 14, stories: 2, sign: 'fiveDime', signW: 10, awning: 'awningRed', door: -3, fireEscape: true });
  brickStore(c, { x: E, z: -129.5, ry: -HALF_PI, w: 15, d: 14, wall: 'brickTan', sign: 'sporting', signW: 11, door: 4 });
  brickStore(c, { x: E, z: -114.5, ry: -HALF_PI, w: 15, d: 14, stories: 2, wall: 'brickPaint', sign: 'realty', signW: 11, door: -3 });
  brickStore(c, { x: E, z: -97, ry: -HALF_PI, w: 20, d: 14, wall: 'brickDark', sign: 'steakhouse', signW: 13, awning: 'awningGreen', door: 5, planters: true, chimneys: 2 });
  // behind the west row: grocery and its lot off Court St
  grocery(c, -98, -138, 0);
  L.pave(-114, -68, -124, -86.5);
  for (let i = 0; i < 12; i++) L.paint(-112 + i * 3.6, -111.88 + i * 3.6, -124, -118);
  for (let i = 0; i < 12; i++) L.paint(-112 + i * 3.6, -111.88 + i * 3.6, -100, -94);
  // behind the east row: the church facing Oak St, with a small lot
  church(c, 90, -118, HALF_PI);
  L.pave(70, 112, -152, -132);
}

function civicNorth(L: Layout) {
  const { c } = L;
  library(c, -66, -178.5, 0);
  townHall(c, -28, -183, 0);
  policeStation(c, 30, -184, 0);
  L.pave(48, 76, -196, -170);
  for (let i = 0; i < 8; i++) L.paint(49.5 + i * 3.3, 49.62 + i * 3.3, -196, -190);
}

function alleys(L: Layout) {
  const { k, rng } = L;
  for (const [x, z] of [
    [-104, -43],
    [-80, -43.2],
    [-56, -42.8],
    [-32, -43],
    [-12, -42.6],
    [-100, -53],
    [-72, -53.2],
    [-40, -53],
    [64, -43],
    [76, -53],
  ])
    pr.dumpster(k, x, z, 0, rng.chance(0.3) ? 0x3a5f8a : P.dumpster, rng.chance(0.5) ? rng : undefined);
  for (let i = 0; i < 12; i++) pr.puddle(k, rng.range(-110, -12), rng.range(-50.5, -45.5), rng.range(0.6, 1.4), 0.04);
  for (let i = 0; i < 5; i++) pr.crateStack(k, rng, rng.range(-110, -14), rng.range(-43.6, -42), rng.range(-0.4, 0.4));
  for (let i = 0; i < 4; i++) pr.barrel(k, -92 + i * 0.7, -42.8, 0x3a3a3a);
  pr.tireStack(k, -54, -42.6, 4);
  for (const x of [-112, -90, -70, -46, -28, -12, 60, 70]) {
    k.box(x, 2.6, -52.3, 0.3, 0.2, 0.3, 0xfff1d0, 'light', { cast: false });
    k.box(x, 2.8, -52.4, 0.5, 0.06, 0.4, 0x2b2d30, 'metal');
  }
  L.runX(-44.0, -116, -10, 24);
  L.runX(-44.0, 60, 80, 20);
}

export function downtown(L: Layout) {
  courtRow(L);
  square(L);
  squareSides(L);
  civicNorth(L);
  alleys(L);
}


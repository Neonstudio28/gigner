import * as THREE from 'three';
import type { SignRef } from './core/kit';
import {
  panelSign,
  textOnly,
  flagCanvas,
  stopSign,
  diamondSign,
  routeShield,
  lawDoor,
  gasLogo,
  clockFace,
  verticalSign,
  marquee,
  makeCanvas,
  drawLines,
  drawFlag,
  type Line,
} from './textures';

const SIGNS = {
  dons: () =>
    panelSign(1024, 220, '#3a2e72', [{ text: "DON'S DONUTS", font: 'Alfa Slab One', color: '#f7c832', y: 0.55, size: 0.62, stroke: '#1b1442', strokeW: 12, maxW: 0.92 }], {
      border: '#251c55',
      borderW: 10,
    }),
  bank: () => panelSign(1024, 200, '#b1252b', [{ text: 'American Bank', font: 'Rye', color: '#fbf6ec', y: 0.56, size: 0.58 }], { border: '#f2ece0', borderW: 12 }),
  fruit: () =>
    panelSign(1024, 280, '#efe3bf', [
      { text: 'Fruit Market', font: 'Rye', color: '#262626', y: 0.42, size: 0.46 },
      { text: '— SINCE 1956 —', font: 'Oswald', weight: '600', color: '#7a2a1a', y: 0.82, size: 0.17 },
    ], { border: '#3d3a30', borderW: 14 }),
  market24: () => panelSign(1024, 200, '#151515', [{ text: 'MARKET 24H', font: 'Bebas Neue', color: '#ffd21f', y: 0.56, size: 0.78, letter: 6 }], { border: '#ffd21f', borderW: 6 }),
  liquor: () => verticalSign('LIQUOR', '#f4efe2', '#b1252b', 'Oswald', '#2a2a2a'),
  pawn: () => panelSign(1024, 220, '#f2efe6', [{ text: 'PAWN SHOP', font: 'Oswald', weight: '700', color: '#8e1f24', y: 0.55, size: 0.62 }], { border: '#8e1f24' }),
  auto: () =>
    panelSign(1400, 220, '#1d2f5a', [{ text: 'AUTO SERVICE  ·  CALL: 555-6743', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.55, size: 0.52 }], { border: '#e9e9e9', borderW: 10 }),
  gun: () => panelSign(1024, 220, '#1c2433', [{ text: 'GUN STORE', font: 'Oswald', weight: '700', color: '#f2d24b', y: 0.55, size: 0.62 }], { border: '#f2d24b' }),
  hardware: () => panelSign(1024, 220, '#c33a2a', [{ text: 'HARDWARE', font: 'Alfa Slab One', color: '#ffffff', y: 0.55, size: 0.6 }], { border: '#ffffff', borderW: 10 }),
  diner: () =>
    panelSign(1024, 300, '#f6efe0', [{ text: 'Pine Cone Diner', font: 'Lobster', color: '#c8262c', y: 0.5, size: 0.58, stroke: '#ffffff', strokeW: 10 }], {
      border: '#1f6f6a',
      borderW: 16,
      radius: 40,
    }),
  sheriff: () =>
    panelSign(1200, 200, '#f4f0e2', [{ text: '★  COUNTY SHERIFF  ★', font: 'Oswald', weight: '700', color: '#2a2a2a', y: 0.55, size: 0.55 }], { border: '#3a3a3a', borderW: 8 }),
  motelV: () => verticalSign('MOTEL', '#fbf7ee', '#d22b2b', 'Oswald', '#d22b2b'),
  vacancy: () => panelSign(800, 200, '#161616', [{ text: 'VACANCY', font: 'Oswald', weight: '700', color: '#4dff86', y: 0.55, size: 0.6 }]),
  motelName: () =>
    panelSign(1024, 256, '#2f6b6a', [{ text: 'Cascade Motor Inn', font: 'Lobster', color: '#fff7e6', y: 0.52, size: 0.55 }], { border: '#f3e7c8', borderW: 12, radius: 30 }),
  church: () =>
    panelSign(900, 300, '#ffffff', [
      { text: 'PINE HOLLOW', font: 'Oswald', weight: '600', color: '#333333', y: 0.3, size: 0.22 },
      { text: 'Community Church', font: 'Rye', color: '#2a3a5a', y: 0.66, size: 0.3 },
    ], { border: '#2a3a5a', borderW: 12 }),
  usedcars: () =>
    panelSign(1200, 300, '#ffffff', [
      { text: "BOB'S USED CARS", font: 'Alfa Slab One', color: '#c8262c', y: 0.42, size: 0.42 },
      { text: '★ EASY FINANCING ★', font: 'Oswald', weight: '600', color: '#1d3c7a', y: 0.8, size: 0.2 },
    ], { border: '#1d3c7a', borderW: 14 }),
  welcome: () =>
    panelSign(1200, 560, '#6d4a2c', [
      { text: 'Welcome to', font: 'Lobster', color: '#f3e6c4', y: 0.2, size: 0.14 },
      { text: 'PINE HOLLOW', font: 'Rye', color: '#f7ecd0', y: 0.47, size: 0.28, stroke: '#3a2615', strokeW: 10 },
      { text: 'EST. 1889  ·  POP. 2,140', font: 'Oswald', weight: '600', color: '#f3e6c4', y: 0.78, size: 0.1 },
    ], { border: '#3d2814', borderW: 22, radius: 34 }),
  lumber: () => panelSign(1200, 240, '#2c4a2e', [{ text: 'CASCADE LUMBER CO.', font: 'Rye', color: '#f3e7c8', y: 0.56, size: 0.48 }], { border: '#f3e7c8', borderW: 10 }),
  feed: () => panelSign(1024, 220, '#7a2a20', [{ text: 'FEED & SEED', font: 'Alfa Slab One', color: '#f6ecd6', y: 0.55, size: 0.6 }], { border: '#f6ecd6' }),
  postOffice: () =>
    panelSign(1200, 200, '#f4f1ea', [{ text: 'UNITED STATES POST OFFICE', font: 'Oswald', weight: '600', color: '#1d2f5a', y: 0.55, size: 0.45 }], { border: '#1d2f5a', borderW: 8 }),
  forsale: () =>
    panelSign(512, 380, '#d6312b', [
      { text: 'FOR', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.2, size: 0.2 },
      { text: 'SALE', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.47, size: 0.33 },
    ], {
      border: '#ffffff',
      borderW: 16,
      draw: (g, w, h) => {
        g.fillStyle = '#ffffff';
        g.fillRect(w * 0.12, h * 0.68, w * 0.76, h * 0.18);
      },
    }),
  stop: () => stopSign(),
  ped: () => diamondSign('ped'),
  curve: () => diamondSign('curve'),
  deer: () => diamondSign('deer'),
  tractorX: () => diamondSign('tractor'),
  us20: () => routeShield('20'),
  sr9: () => routeShield('9', true),
  sheriffDoor: () => lawDoor('SHERIFF', 'COUNTY'),
  policeDoor: () => lawDoor('POLICE', 'PINE HOLLOW', '#d8dde6', '#f4f6fa'),
  flag: () => flagCanvas(),
  gas: () => gasLogo(false),
  gasWord: () => gasLogo(true),
  gasStore: () => panelSign(1024, 200, '#f4f1ea', [{ text: '86  GASOLINE', font: 'Oswald', weight: '700', color: '#d8321c', y: 0.55, size: 0.6 }], { border: '#d8321c', borderW: 10 }),
  press: () => panelSign(256, 128, '#f4f1ea', [{ text: 'PRESS', font: 'Oswald', weight: '700', color: '#1b1b1b', y: 0.55, size: 0.6 }]),
  speed25: () => speedSign('25'),
  speed55: () => speedSign('55'),
  billboardCola: () =>
    panelSign(1600, 560, '#c8262c', [
      { text: 'Ice Cold', font: 'Lobster', color: '#ffffff', y: 0.25, size: 0.2 },
      { text: 'TIMBER COLA', font: 'Alfa Slab One', color: '#ffd21f', y: 0.55, size: 0.3, stroke: '#7a1010', strokeW: 12 },
      { text: 'THE TASTE OF THE NORTHWEST', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.84, size: 0.1 },
    ], { border: '#ffffff', borderW: 18 }),
  billboardPark: () =>
    panelSign(1600, 560, '#2f5a3a', [
      { text: 'MT. CASCADIA', font: 'Rye', color: '#f7ecd0', y: 0.34, size: 0.26 },
      { text: 'STATE PARK  ·  NEXT EXIT  ·  12 MI', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.68, size: 0.12 },
    ], {
      border: '#f7ecd0',
      borderW: 18,
      draw: (g, w, h) => {
        g.fillStyle = '#e9eef2';
        g.beginPath();
        g.moveTo(w * 0.05, h * 0.92);
        g.lineTo(w * 0.2, h * 0.6);
        g.lineTo(w * 0.35, h * 0.92);
        g.fill();
        g.beginPath();
        g.moveTo(w * 0.65, h * 0.92);
        g.lineTo(w * 0.82, h * 0.55);
        g.lineTo(w * 0.97, h * 0.92);
        g.fill();
      },
    }),
  roadStop: () => textOnly(512, 200, [{ text: 'STOP', font: 'Oswald', weight: '700', color: '#f1f1ec', y: 0.5, size: 0.95, maxW: 0.96 }]),
  n911: () => textOnly(256, 128, [{ text: '911', font: 'Oswald', weight: '700', color: '#161616', y: 0.5, size: 0.7 }]),
  mail: () => panelSign(256, 128, '#2c4a8c', [{ text: 'U.S. MAIL', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.5, size: 0.45 }]),

  // ---- downtown core
  courthouse: () =>
    panelSign(1400, 150, '#e3d6bd', [{ text: 'PINE  COUNTY  COURTHOUSE', font: 'Oswald', weight: '600', color: '#4a3f30', y: 0.55, size: 0.62, letter: 10 }]),
  townHall: () => panelSign(900, 150, '#efeae0', [{ text: 'TOWN  HALL', font: 'Oswald', weight: '600', color: '#3e3a33', y: 0.55, size: 0.64, letter: 12 }]),
  clock: () => clockFace(),
  library: () => panelSign(1000, 150, '#e6dcc8', [{ text: 'PUBLIC  LIBRARY', font: 'Oswald', weight: '600', color: '#45392b', y: 0.55, size: 0.62, letter: 10 }]),
  police: () =>
    panelSign(1300, 220, '#1d2f5a', [{ text: 'PINE HOLLOW POLICE', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.55, size: 0.6, letter: 4 }], { border: '#c9d2e3', borderW: 10 }),
  fireDept: () =>
    panelSign(1300, 220, '#f2ede2', [{ text: 'PINE HOLLOW FIRE DEPT.', font: 'Alfa Slab One', color: '#b5241e', y: 0.55, size: 0.52 }], { border: '#b5241e', borderW: 10 }),
  station1: () => panelSign(512, 200, '#b5241e', [{ text: 'STATION 1', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.55, size: 0.6 }], { border: '#f2ede2', borderW: 8 }),
  theaterV: () => verticalSign('LIBERTY', '#c8262c', '#fff6dc', 'Bebas Neue', '#f2c94c', true),
  marquee: () => marquee('NOW SHOWING · TIMBERLINE', '7:00 & 9:15 · MATINEE SAT'),
  hotel: () => panelSign(1024, 220, '#1f3b33', [{ text: 'Hotel Cascade', font: 'Rye', color: '#f2e4bf', y: 0.55, size: 0.56 }], { border: '#f2e4bf', borderW: 10 }),
  hotelRoof: () => textOnly(1024, 300, [{ text: 'HOTEL', font: 'Bebas Neue', color: '#e8382b', y: 0.55, size: 0.95, letter: 30, stroke: '#ffffff', strokeW: 10 }]),
  pizza: () =>
    panelSign(1024, 240, '#1f5a34', [{ text: "Tony's Pizza", font: 'Lobster', color: '#ffffff', y: 0.52, size: 0.6, stroke: '#c8262c', strokeW: 10 }], { border: '#c8262c', borderW: 12 }),
  cafe: () =>
    panelSign(1024, 240, '#f3e9d2', [
      { text: 'Timberline Café', font: 'Lobster', color: '#4a2c1a', y: 0.45, size: 0.5 },
      { text: 'COFFEE · PIE · BREAKFAST', font: 'Oswald', weight: '600', color: '#8a3b22', y: 0.82, size: 0.16 },
    ], { border: '#4a2c1a', borderW: 10 }),
  chinese: () =>
    panelSign(1024, 220, '#b51f1f', [{ text: 'GOLDEN DRAGON', font: 'Alfa Slab One', color: '#ffd24a', y: 0.55, size: 0.56, stroke: '#5a0d0d', strokeW: 8 }], { border: '#ffd24a', borderW: 10 }),
  tavern: () =>
    panelSign(1100, 260, '#2a1d14', [
      { text: 'THE RUSTY AXE', font: 'Rye', color: '#e9c46a', y: 0.42, size: 0.42 },
      { text: 'TAVERN · LIVE MUSIC FRIDAYS', font: 'Oswald', weight: '600', color: '#f2e8d5', y: 0.8, size: 0.16 },
    ], { border: '#e9c46a', borderW: 10 }),
  neonBeer: () => textOnly(512, 160, [{ text: 'COLD BEER', font: 'Lobster', color: '#ff4d6d', y: 0.52, size: 0.62, stroke: '#ffd6e0', strokeW: 4 }]),
  neonOpen: () => textOnly(400, 160, [{ text: 'OPEN', font: 'Bebas Neue', color: '#5dff9e', y: 0.55, size: 0.8, stroke: '#d8ffe9', strokeW: 4 }]),
  bakery: () =>
    panelSign(1024, 220, '#f7e3e8', [{ text: 'Sweet Pine Bakery', font: 'Lobster', color: '#8c2f4f', y: 0.52, size: 0.56 }], { border: '#8c2f4f', borderW: 10, radius: 30 }),
  laundromat: () => panelSign(1024, 200, '#2a7fb8', [{ text: 'SUDS LAUNDROMAT', font: 'Bebas Neue', color: '#ffffff', y: 0.56, size: 0.72, letter: 4 }], { border: '#ffffff', borderW: 8 }),
  books: () => panelSign(1024, 220, '#2b2f45', [{ text: 'Books & Records', font: 'Rye', color: '#f0e3c2', y: 0.55, size: 0.5 }], { border: '#f0e3c2', borderW: 10 }),
  barber: () => panelSign(900, 200, '#f4f1ea', [{ text: 'BARBER SHOP', font: 'Oswald', weight: '700', color: '#1d3c7a', y: 0.55, size: 0.6 }], { border: '#c8262c', borderW: 12 }),
  drugs: () =>
    panelSign(1024, 220, '#f4f1ea', [
      { text: 'CASCADE DRUG CO.', font: 'Oswald', weight: '700', color: '#c8262c', y: 0.42, size: 0.44 },
      { text: 'PRESCRIPTIONS · SODA FOUNTAIN', font: 'Oswald', weight: '600', color: '#1d3c7a', y: 0.8, size: 0.17 },
    ], { border: '#1d3c7a', borderW: 10 }),
  gazette: () => panelSign(1200, 200, '#f1ece0', [{ text: 'The Pine Hollow Gazette', font: 'Rye', color: '#1b1b1b', y: 0.56, size: 0.5 }], { border: '#1b1b1b', borderW: 8 }),
  antiques: () => panelSign(900, 220, '#5a3a22', [{ text: 'ANTIQUES', font: 'Rye', color: '#f2e2bd', y: 0.56, size: 0.56 }], { border: '#f2e2bd', borderW: 10 }),
  western: () => panelSign(1024, 220, '#f2e2bd', [{ text: 'Western Wear', font: 'Rye', color: '#6b2d1a', y: 0.56, size: 0.56 }], { border: '#6b2d1a', borderW: 10 }),
  florist: () => panelSign(900, 200, '#e9f1e2', [{ text: 'Florist', font: 'Lobster', color: '#3c6b35', y: 0.52, size: 0.66 }], { border: '#c2577a', borderW: 10, radius: 24 }),
  icecream: () =>
    panelSign(1024, 220, '#fbe7ef', [{ text: 'Ice Cream Parlor', font: 'Lobster', color: '#d1477a', y: 0.52, size: 0.56, stroke: '#ffffff', strokeW: 8 }], { border: '#6bc3c9', borderW: 12, radius: 36 }),
  fiveDime: () => panelSign(1024, 220, '#c8262c', [{ text: 'FIVE & DIME', font: 'Alfa Slab One', color: '#ffffff', y: 0.55, size: 0.6 }], { border: '#f2c94c', borderW: 10 }),
  sporting: () => panelSign(1100, 220, '#22472f', [{ text: 'SPORTING GOODS', font: 'Oswald', weight: '700', color: '#f2e4bf', y: 0.55, size: 0.6 }], { border: '#f2e4bf', borderW: 8 }),
  realty: () =>
    panelSign(1100, 220, '#f4f1ea', [
      { text: 'CASCADE REALTY', font: 'Oswald', weight: '700', color: '#1d3c7a', y: 0.42, size: 0.44 },
      { text: '& INSURANCE', font: 'Oswald', weight: '600', color: '#c8262c', y: 0.8, size: 0.2 },
    ], { border: '#1d3c7a', borderW: 8 }),
  steakhouse: () =>
    panelSign(1100, 240, '#3a2414', [{ text: 'Timber Steakhouse', font: 'Rye', color: '#f2d38a', y: 0.55, size: 0.5 }], { border: '#f2d38a', borderW: 10 }),
  grocery: () =>
    panelSign(1100, 260, '#f3efe2', [
      { text: 'CARDEN BROTHERS', font: 'Oswald', weight: '600', color: '#2f6b3a', y: 0.3, size: 0.2 },
      { text: 'GROCERY STORE', font: 'Alfa Slab One', color: '#2f6b3a', y: 0.66, size: 0.38 },
    ], { border: '#2f6b3a', borderW: 10 }),
  loan: () =>
    panelSign(1000, 520, '#1f5fa8', [
      { text: 'CALL: 555-1040', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.12, size: 0.08 },
      { text: 'LOAN', font: 'Alfa Slab One', color: '#ffffff', y: 0.42, size: 0.36 },
      { text: 'LINE OPEN 24/7', font: 'Oswald', weight: '700', color: '#ffd24a', y: 0.74, size: 0.12 },
      { text: 'NO CREDIT CHECK', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.9, size: 0.08 },
    ], { border: '#ffffff', borderW: 14 }),
  tex: () => {
    const W = 1400;
    const H = 520;
    const [c, g] = makeCanvas(W, H);
    drawFlag(g, 0, 0, W, H);
    g.fillStyle = 'rgba(20,24,30,0.86)';
    g.fillRect(W * 0.04, H * 0.24, W * 0.92, H * 0.48);
    g.fillStyle = '#2a2d33';
    g.fillRect(0, H * 0.78, W, H * 0.22);
    drawLines(g, W, H, [
      { text: 'TEX OUTPOST', font: 'Oswald', weight: '700', color: '#f4f4f0', y: 0.48, size: 0.36, letter: 6 },
      { text: 'HUNTING JACKETS · SCOPES · RIFLES · AMMO · FISHING', font: 'Oswald', weight: '600', color: '#f4f4f0', y: 0.89, size: 0.1 },
    ]);
    return c;
  },
  burgerBarn: () =>
    panelSign(800, 520, '#c8262c', [
      { text: 'BURGER', font: 'Alfa Slab One', color: '#ffd24a', y: 0.3, size: 0.26, stroke: '#5a0d0d', strokeW: 10 },
      { text: 'BARN', font: 'Alfa Slab One', color: '#ffffff', y: 0.6, size: 0.3, stroke: '#5a0d0d', strokeW: 10 },
      { text: 'DRIVE-IN · SHAKES', font: 'Oswald', weight: '700', color: '#ffd24a', y: 0.86, size: 0.1 },
    ], { border: '#ffd24a', borderW: 16, radius: 50 }),
  menu: () => {
    const [c, g] = makeCanvas(512, 400);
    g.fillStyle = '#1b1b1b';
    g.fillRect(0, 0, 512, 400);
    const items = ['BARN BURGER  1.25', 'CHEESEBURGER  1.45', 'CHILI DOG  .95', 'FRIES  .60', 'SHAKES  .85', 'ROOT BEER  .40'];
    const lines: Line[] = [{ text: 'MENU', font: 'Bebas Neue', color: '#ffd24a', y: 0.1, size: 0.13 }];
    items.forEach((t, i) => lines.push({ text: t, font: 'Oswald', weight: '600', color: '#ffffff', y: 0.27 + i * 0.12, size: 0.08 }));
    drawLines(g, 512, 400, lines);
    return c;
  },
  bait: () => panelSign(1024, 220, '#2f5a6b', [{ text: 'BAIT & TACKLE', font: 'Alfa Slab One', color: '#f6ecd6', y: 0.55, size: 0.56 }], { border: '#f6ecd6' }),
  fds: () =>
    panelSign(900, 240, null, [
      { text: 'FDS', font: 'Alfa Slab One', color: '#e3b54a', y: 0.32, size: 0.38, x: 0.82 },
      { text: 'Fast Delivery Service', font: 'Lobster', color: '#e3b54a', y: 0.72, size: 0.26, x: 0.42 },
    ]),
  parkingP: () => panelSign(256, 256, '#1f4fa8', [{ text: 'P', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.54, size: 0.8 }], { border: '#ffffff', borderW: 12, radius: 20 }),

  // ---- street names
  stMain: () => streetBlade('MAIN ST'),
  stPine: () => streetBlade('PINE AVE'),
  stCourt: () => streetBlade('COURT ST'),
  stCedar: () => streetBlade('CEDAR LN'),
  stElm: () => streetBlade('ELM ST'),
  stOak: () => streetBlade('OAK ST'),
  stSquare: () => streetBlade('SQUARE ST'),

  // ---- highway & outskirts
  distance: () =>
    panelSign(1024, 420, '#1f6b3f', [
      { text: 'Pine Hollow          2', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.3, size: 0.2 },
      { text: 'Ridgeview          14', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.68, size: 0.2 },
    ], { border: '#ffffff', borderW: 10, radius: 20 }),
  roadClosed: () => panelSign(800, 220, '#ffffff', [{ text: 'ROAD CLOSED', font: 'Oswald', weight: '700', color: '#111111', y: 0.55, size: 0.62 }], { border: '#111111', borderW: 10 }),
  highVoltage: () =>
    panelSign(600, 400, '#ffffff', [
      { text: 'DANGER', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.16, size: 0.2 },
      { text: 'HIGH VOLTAGE', font: 'Oswald', weight: '700', color: '#111111', y: 0.55, size: 0.17 },
      { text: 'KEEP OUT', font: 'Oswald', weight: '700', color: '#111111', y: 0.8, size: 0.15 },
    ], {
      draw: (g, w, h) => {
        g.fillStyle = '#c8102e';
        g.beginPath();
        g.ellipse(w / 2, h * 0.16, w * 0.42, h * 0.13, 0, 0, Math.PI * 2);
        g.fill();
      },
      border: '#111111',
      borderW: 8,
    }),
  substation: () => panelSign(1100, 200, '#f4f1ea', [{ text: 'PINE COUNTY PUD · SUBSTATION 4', font: 'Oswald', weight: '600', color: '#1d3c7a', y: 0.55, size: 0.45 }], { border: '#1d3c7a', borderW: 8 }),
  dairy: () =>
    panelSign(1200, 300, '#f4efe0', [
      { text: 'MILLER DAIRY', font: 'Rye', color: '#2b2b2b', y: 0.42, size: 0.4 },
      { text: 'FAMILY OWNED SINCE 1921', font: 'Oswald', weight: '600', color: '#8a2a20', y: 0.8, size: 0.16 },
    ], { border: '#2b2b2b', borderW: 12 }),
  ridgeview: () => panelSign(1200, 260, '#3a2a1c', [{ text: 'RIDGEVIEW FARM', font: 'Rye', color: '#f2e2bd', y: 0.55, size: 0.48 }], { border: '#f2e2bd', borderW: 10 }),
  hayForSale: () => panelSign(800, 260, '#f4efe0', [{ text: 'HAY FOR SALE', font: 'Oswald', weight: '700', color: '#2b2b2b', y: 0.55, size: 0.5 }], { border: '#2b2b2b', borderW: 10 }),
  produce: () =>
    panelSign(1100, 360, '#f4efe0', [
      { text: 'FRESH PRODUCE', font: 'Alfa Slab One', color: '#3c6b35', y: 0.3, size: 0.24 },
      { text: 'U-PICK APPLES', font: 'Oswald', weight: '700', color: '#c8262c', y: 0.62, size: 0.2 },
      { text: 'SUNNY ACRES ORCHARD', font: 'Oswald', weight: '600', color: '#2b2b2b', y: 0.86, size: 0.12 },
    ], { border: '#3c6b35', borderW: 14 }),
} satisfies Record<string, () => HTMLCanvasElement>;

export type SignId = keyof typeof SIGNS;

function speedSign(n: string): HTMLCanvasElement {
  return panelSign(256, 320, '#ffffff', [
    { text: 'SPEED', font: 'Oswald', weight: '600', color: '#111', y: 0.17, size: 0.15 },
    { text: 'LIMIT', font: 'Oswald', weight: '600', color: '#111', y: 0.34, size: 0.15 },
    { text: n, font: 'Oswald', weight: '700', color: '#111', y: 0.68, size: 0.42 },
  ], { border: '#111111', borderW: 10, radius: 16 });
}

function streetBlade(name: string): HTMLCanvasElement {
  return panelSign(640, 128, '#1f6b3f', [{ text: name, font: 'Oswald', weight: '600', color: '#ffffff', y: 0.55, size: 0.62 }], { border: '#ffffff', borderW: 6, radius: 10 });
}

interface Page {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  x: number;
  y: number;
  rowH: number;
}

const PAGE = 4096;
const MAX_SIDE = 640;
const PAD = 8;

/** Draws every sign once and shelf-packs it into shared atlas pages (one material per page). */
export class SignBook {
  private pages: Page[] = [];
  private cache = new Map<string, SignRef>();

  constructor(private onPage: (index: number, tex: THREE.Texture) => void) {}

  get(id: SignId): SignRef {
    let ref = this.cache.get(id);
    if (!ref) {
      ref = this.place(SIGNS[id]());
      this.cache.set(id, ref);
    }
    return ref;
  }

  /** Signs owned by building modules: drawn once per key and packed into the shared atlas. */
  custom(key: string, draw: () => HTMLCanvasElement): SignRef {
    const k = `custom:${key}`;
    let ref = this.cache.get(k);
    if (!ref) {
      ref = this.place(draw());
      this.cache.set(k, ref);
    }
    return ref;
  }

  private newPage(): Page {
    const [canvas, ctx] = makeCanvas(PAGE, PAGE);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.name = `sign-atlas-${this.pages.length}`;
    const p: Page = { canvas, ctx, tex, x: PAD, y: PAD, rowH: 0 };
    this.pages.push(p);
    this.onPage(this.pages.length - 1, tex);
    return p;
  }

  private place(src: HTMLCanvasElement): SignRef {
    const scale = Math.min(1, MAX_SIDE / src.width, MAX_SIDE / src.height);
    const w = Math.ceil(src.width * scale);
    const h = Math.ceil(src.height * scale);
    let p = this.pages[this.pages.length - 1] ?? this.newPage();
    if (p.x + w + PAD > PAGE) {
      p.x = PAD;
      p.y += p.rowH + PAD;
      p.rowH = 0;
    }
    if (p.y + h + PAD > PAGE) p = this.newPage();
    const { x, y } = p;
    // bleed the edge pixels outward so mipmaps don't pull in neighbouring signs
    p.ctx.drawImage(src, x - 3, y - 3, w + 6, h + 6);
    p.ctx.clearRect(x, y, w, h);
    p.ctx.drawImage(src, x, y, w, h);
    p.x += w + PAD;
    p.rowH = Math.max(p.rowH, h);
    p.tex.needsUpdate = true;
    const page = this.pages.indexOf(p);
    return { page, u0: (x + 1) / PAGE, u1: (x + w - 1) / PAGE, v0: 1 - (y + h - 1) / PAGE, v1: 1 - (y + 1) / PAGE };
  }
}

import * as THREE from 'three';
import { Layout, HALF_PI } from './helpers';
import { COURT_FRONT } from './core';
import * as pr from '../props';
import { person, crowd, randomPerson, deputy } from '../people';
import type { VehicleType } from '../vehicles';
import { CAR_COLORS, P } from '../palette';

export function utilities(L: Layout) {
  L.runX(-8.3, -290, 290, 32, (x) => Math.abs(x) < 14 || (Math.abs(x) > 112 && Math.abs(x) < 132));
  L.runX(-6.8, -1700, -306, 46);
  L.runX(-6.8, 306, 1700, 46);
  L.runZ(8.4, -340, -176, 32);
  L.runZ(8.4, -62, -20, 21);
  L.runZ(8.4, 20, 128, 27);
  L.runX(-165.6, -114, -12, 34);
  L.runX(-165.6, 12, 114, 34);
  L.runX(-267.6, -114, 114, 38, (x) => Math.abs(x) < 8);
  L.runZ(-129.2, -262, 128, 33, (z) => Math.abs(z) < 12);
  L.runZ(129.2, -262, 128, 33, (z) => Math.abs(z) < 12);
  L.runX(141.2, -110, 110, 36, (x) => Math.abs(x) < 8);
  // service drops from the nearest pole to each house
  for (const hp of L.housePoints) {
    let best: THREE.Vector3 | null = null;
    let bd = 1e9;
    for (const p of L.poles) {
      const d = Math.hypot(p[3].x - hp.x, p[3].z - hp.z);
      if (d < bd) {
        bd = d;
        best = p[3];
      }
    }
    if (best && bd < 55) pr.wire(L.k, best, new THREE.Vector3(hp.x, 5.6, hp.z).lerp(best, 0.12), 0.05, 0.015);
  }
}

export function furniture(L: Layout) {
  const { k, signs, rng } = L;
  for (let x = -110; x <= 110; x += 36) if (Math.abs(x) > 15) pr.streetLight(k, x, 8.3, Math.PI);
  for (const z of [-58, -30, 30, 60, 100]) pr.streetLight(k, -8.3, z, HALF_PI);
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
    [-7.6, -170, Math.PI],
    [-6.9, -270, Math.PI],
    [6.9, -254, 0],
    [8.4, -66.8, 0],
    [-9.2, -68.6, -HALF_PI],
    [9.2, -84.2, HALF_PI],
    [-49.6, -85.4, Math.PI],
    [36.4, -85.4, Math.PI],
  ] as const)
    pr.postSign(k, signs, 'stop', x, z, r, { w: 0.75, h: 0.75 });
  // street-name blades
  for (const [x, z, a, b] of [
    [-10.6, -11.2, 'stMain', 'stPine'],
    [10.6, -67, 'stCourt', 'stPine'],
    [-115.6, -67, 'stCourt', 'stElm'],
    [115.6, -67, 'stCourt', 'stOak'],
    [-10.6, -167, 'stCedar', 'stPine'],
    [-50.4, -84.2, 'stCourt', 'stSquare'],
    [-115.6, -11, 'stMain', 'stElm'],
    [115.6, -11, 'stMain', 'stOak'],
  ] as const)
    pr.streetSign(k, signs, x, z, a, b);
  for (const [x, z] of [
    [-11.2, -11],
    [11.4, 11.2],
    [-60, 11.4],
    [74, -11.4],
    [-128.5, -30],
    [6.9, -120 + 66],
    [-56, -68.9],
    [40, -68.9],
    [-50.2, -120],
    [50.2, -110],
    [-20, -166.4],
  ])
    pr.hydrant(k, x, z);
  pr.uspsBox(k, signs, -12.4, -10.6, 0);
  pr.uspsBox(k, signs, -33, 10.8, Math.PI);
  pr.uspsBox(k, signs, -10, -167.2, 0);
  pr.newsBoxes(k, signs, 14.5, -10.9, 0);
  pr.newsBoxes(k, signs, -44, 10.9, Math.PI);
  pr.newsBoxes(k, signs, -12.8, -68.6, Math.PI);
  pr.payphone(k, 12.6, -15.5, HALF_PI);
  for (const x of [-100, -64, -38, -16, 22, 58, 94]) pr.trashCan(k, x, -8.4);
  for (const x of [-84, -20, 40, 100]) pr.trashCan(k, x, 8.4);
  for (const x of [-101.5, -74, -41, 25.5, 64]) pr.trashCan(k, x, -66.3, 0x2f4a3a);
  pr.bench(k, -58, -11.2, 0);
  pr.bench(k, -82, -11.2, 0);
  pr.bench(k, 100, 11.2, Math.PI);
  // Court St: acorn lamps and parking meters
  for (const x of [-101.5, -88.7, -55.6, -40.8, -26.1, 25.4, 38.6, 51.6, 64.1, 81.6]) pr.acornLamp(k, x, COURT_FRONT - 3.9);
  for (const x of [-110, -90, -70, -30, -14, 14, 30, 50, 70]) pr.acornLamp(k, x, -83.6);
  for (let x = -114; x <= 80; x += 6.2) {
    if (Math.abs(x) < 11 || (x > -54 && x < -44)) continue;
    pr.parkingMeter(k, x, -69.6, 0);
  }
  for (let z = -150; z <= -90; z += 6.5) {
    pr.parkingMeter(k, -38.6, z, HALF_PI);
    pr.parkingMeter(k, 38.6, z, -HALF_PI);
  }
  for (const [x, z] of [
    [62, -36],
    [100, -27],
    [-80, 15.5],
  ])
    pr.dumpster(k, x, z, 0, P.dumpster, rng);
  pr.dumpster(k, -88, 16, 0, 0x3a5f8a);
  for (let i = 0; i < 3; i++) pr.crateStack(k, rng, -105 + i * 1.6, 15.2, rng.range(-0.3, 0.3));
  pr.tireStack(k, 77.2, -16, 5);
  pr.tireStack(k, 77.6, -17.2, 3);
  for (let i = 0; i < 3; i++) pr.barrel(k, 77.4, -19 - i * 0.7, 0x8a2a2a);
  pr.postSign(k, signs, 'parkingP', -70, -86.2, 0, { w: 0.7, h: 0.7 });
}

export function parkedVehicles(L: Layout) {
  const { rng } = L;
  const pick = (): VehicleType => rng.pick(['sedan', 'sedan', 'pickup', 'wagon', 'coupe', 'suv', 'van'] as const);
  const opts = (t: VehicleType) => (t === 'pickup' && rng.chance(0.4) ? { accent: 0xf2f1ec } : t === 'coupe' ? { stripes: rng.chance(0.5) } : {});
  const park = (x: number, z: number, ry: number) => {
    const t = pick();
    L.car(t, x, z, ry, rng.pick(CAR_COLORS), opts(t));
  };
  for (const x of [-108, -95, -82, -62, -42, -36, 24, 48, 81, 100]) if (rng.chance(0.85)) park(x + rng.range(-0.6, 0.6), -5.65, Math.PI);
  for (const x of [-104, -88, -70, -48, 34, 52, 72, 90, 108]) if (rng.chance(0.85)) park(x + rng.range(-0.6, 0.6), 5.65, 0);
  // Court St, both sides
  for (let x = -110; x <= 78; x += 6.4) {
    if (Math.abs(x) < 12 || (x > -54 && x < -40)) continue;
    if (rng.chance(0.78)) park(x + rng.range(-0.4, 0.4), -71.25, 0);
    if (x < -52 || (x > -32 && x < 32) || x > 52) if (rng.chance(0.7)) park(x + rng.range(-0.4, 0.4), -80.75, Math.PI);
  }
  // around the square
  for (let z = -148; z <= -92; z += 6.4) {
    if (rng.chance(0.75)) park(-39.3, z + rng.range(-0.3, 0.3), HALF_PI);
    if (rng.chance(0.75)) park(39.3, z + rng.range(-0.3, 0.3), -HALF_PI);
  }
  // lots
  for (let i = 0; i < 11; i++) if (rng.chance(0.6)) park(-110.2 + i * 3.6, -121, HALF_PI);
  for (let i = 0; i < 11; i++) if (rng.chance(0.5)) park(-110.2 + i * 3.6, -97, -HALF_PI);
  for (let i = 0; i < 5; i++) if (rng.chance(0.7)) park(74 + i * 7, -142, rng.chance(0.5) ? 0 : Math.PI);
  L.car('police', 51.2, -193, -HALF_PI, 0);
  L.car('police', 54.5, -193, -HALF_PI, 0);
  L.car('police', 61.1, -193, -HALF_PI, 0);
  L.car('sedan', 67.7, -193, -HALF_PI, 0x5e3d2a);
  L.car('police', 30, -170.5, Math.PI, 0);
  L.car('firetruck', 109.5, -70.4, HALF_PI, 0xb5241e);
  // Main St specials (reference shot)
  L.car('sheriff', -17.5, 5.65, 0, 0);
  L.car('sheriff', -24.5, 5.65, 0, 0);
  L.car('sedan', 3.3, 16.5, HALF_PI, 0xc6b28c);
  L.car('pickup', 3.3, 23.5, HALF_PI, 0x1c1c1e, { accent: 0xc6b28c });
  L.car('coupe', -3.3, -16.8, -HALF_PI, 0x2e4a3c);
  L.car('sheriff', -73.5, 16.5, HALF_PI, 0);
  L.car('sheriffSuv', -70.3, 16.5, HALF_PI, 0);
  L.car('sheriff', -57.5, 16.5, HALF_PI, 0);
  L.car('sedan', -51.1, 16.5, HALF_PI, 0x2c3858);
  L.car('pickup', 29, -23.5, HALF_PI, 0xa62e2a, { accent: 0xf2f1ec });
  L.car('coupe', 37.2, -25, HALF_PI, 0xd27d2c, { stripes: true });
  L.car('van', 18, -16, Math.PI, 0xc6b28c);
  L.car('tow', 46, -40, HALF_PI, 0x2c3858, { accent: 0xe9e8e2 });
  for (const [x, t, col] of [
    [38, 'sedan', 0xe4dbc3],
    [47, 'pickup', 0x2f4a3d],
    [60, 'wagon', 0x8fa6bd],
    [73, 'sedan', 0x5e3d2a],
    [84, 'suv', 0xa62e2a],
  ] as const)
    L.car(t, x, 36.5, -HALF_PI, col);
  for (const [z, t, col] of [
    [21.5, 'coupe', 0xe9e8e2],
    [29.5, 'pickup', 0x6d8ea3],
  ] as const)
    L.car(t, 92.6, z, 0, col);
  L.car('van', -78, 19, HALF_PI, 0x8fa6bd);
  L.car('semi', 520, -2.2, Math.PI, 0xa62e2a, { trailer: true, accent: 0xf2f1ec });
}

export function townsfolk(L: Layout) {
  const { k, rng } = L;
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
  person(k, 40, 40.8, Math.PI, randomPerson(rng));
  for (let i = 0; i < 10; i++) {
    const x = rng.range(-110, 110);
    if (Math.abs(x) < 14) continue;
    person(k, x, rng.chance(0.5) ? rng.range(8.6, 11.4) : rng.range(-11.4, -8.6), rng.chance(0.5) ? HALF_PI : -HALF_PI, randomPerson(rng));
  }
  // downtown: Court St strollers, café patrons, the square
  for (let i = 0; i < 18; i++) {
    const x = rng.range(-112, 80);
    if (Math.abs(x) < 12) continue;
    person(k, x, rng.range(-69.4, -67.6), rng.chance(0.5) ? HALF_PI : -HALF_PI, randomPerson(rng));
  }
  for (const [x, z, n] of [
    [-80, -67.5, 3],
    [-46, -67.4, 2],
    [44, -67.4, 2],
    [-2, -95, 4],
    [-16, -104, 3],
    [14, -112, 2],
    [-26, -103, 3],
    [24, -124, 4],
    [-50.2, -98, 2],
    [50.2, -128, 2],
    [-28, -169.6, 3],
    [30, -167, 2],
    [-98, -108, 2],
    [-66, -167, 2],
    [100, -67.6, 3],
  ] as const)
    crowd(k, rng, x, z, n, 0.9);
  crowd(k, rng, 30, -171.5, 3, 1.0, deputy);
  crowd(k, rng, -18, -85, 2, 0.6);
  for (let i = 0; i < 14; i++) {
    const x = rng.range(-30, 30);
    const z = rng.range(-150, -88);
    if (L.c.occ.solids?.blocked(x, z, 0.8)) continue;
    person(k, x, z, rng.range(0, Math.PI * 2), randomPerson(rng));
  }
  crowd(k, rng, 15, -95, 3, 1.0);
  person(k, -161, 12.8, -0.6, deputy(rng));
}

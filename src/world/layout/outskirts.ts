import * as THREE from 'three';
import { Layout, HALF_PI } from './helpers';
import { woodStore } from '../buildings/commercial';
import { waterTower, windmill, roadsideBillboard, welcomeSign } from '../buildings/civic';
import { barn, farmhouse, salesOffice, shed } from '../buildings/homes';
import { texOutpost } from '../buildings/downtown';
import * as pr from '../props';
import { person } from '../people';
import { transmissionLine, substation, sr9 } from '../infrastructure';
import { dairyFarm, hayFarm, orchardFarm, setFarmHooks, FARMS } from '../farms';
import { heightAt, SR9_END } from '../terrain';
import type { VehicleType, VehicleOpts } from '../vehicles';
import { P } from '../palette';

export function lumberYard(L: Layout) {
  const { c, k, rng, signs } = L;
  woodStore(c, -150, -23, 0, 'feed', 0x8a5a3a);
  woodStore(c, -176, -23, 0, 'hardware', 0xa8a39a);
  woodStore(c, -232, -23, 0, 'bait', 0x5d7a86);
  const LY = { x0: -205, x1: -136, z0: 13, z1: 72 };
  L.dirt(LY.x0, LY.x1, LY.z0, LY.z1, 0x8f7050);
  L.c.roads.push({ x0: LY.x0, x1: LY.x1, z0: LY.z0, z1: LY.z1, kind: 'dirt' });
  for (let i = 0; i < 5; i++) pr.lumberStack(k, rng, -184 + (i % 3) * 7, 26 + Math.floor(i / 3) * 5, 0.1 * (i - 2), rng.int(2, 4));
  k.box(-160, 0, 52, 16, 0.5, 9, 0xa47e56, 'planks');
  k.box(-160, 0.5, 52, 16, 0.02, 9, 0x40464e, 'paint');
  k.solid(-160, 52, 16, 9);
  for (let i = 0; i <= 6; i++) for (const zz of [47.5, 56.5]) k.box(-168 + i * 2.66, 0, zz, 0.2, 2.6, 0.2, P.woodDark);
  for (let i = 0; i <= 3; i++) k.box(-168, 0, 47.5 + i * 3, 0.2, 2.6, 0.2, P.woodDark);
  pr.dumpster(k, -196, 18, 0, P.dumpster, rng);
  pr.propaneTank(k, -198, 40, HALF_PI);
  pr.crateStack(k, rng, -174, 40, 0.3);
  pr.crateStack(k, rng, -171, 41, -0.2);
  pr.barrel(k, -178, 30, 0x2f7db5);
  pr.barrel(k, -177.3, 30.4, 0x2f7db5);
  pr.barrel(k, -170, 36, 0xc76b2a);
  pr.hoseReel(k, -166, 42);
  for (let i = 0; i < 6; i++) k.box(-192 + i * 0.7, 0, 15, 0.12, 0.8, 0.12, i % 2 ? 0xe2552b : 0xf2f1ec);
  for (let i = 0; i < 5; i++) pr.cone(k, -186 + i * 3.4, 14.6);
  k.box(-150, 0, 36, 1.4, 1.0, 1.0, 0x8a8e92, 'metal');
  k.box(-147, 0, 30, 1.6, 0.8, 1.6, P.woodLight, 'planks');
  for (const [x, z] of [
    [-140, 14],
    [-200, 14],
    [-140, 70],
    [-200, 70],
  ])
    k.box(x, 0, z, 0.25, 2.4, 0.25, P.woodPole);
  for (const s of [-1, 1]) k.box(-150 + s * 2.6, 0, 13.2, 0.25, 3.4, 0.25, P.woodDark);
  k.sign(-150, 2.9, 13.2, 5.6, 1.1, signs.get('lumber'), { ry: Math.PI, back: 0xf3e7c8, twoSided: true, thick: 0.15 });
  shed(c, -195, 62, Math.PI, 0xe9e6dc, true);
  pr.railFence(k, LY.x0, LY.z1, LY.x1, LY.z1);
  pr.railFence(k, LY.x0, LY.z0 + 1, LY.x0, LY.z1);
  pr.pebbles(k, rng, LY.x0, 6.5, LY.x1, LY.z1, 260, 0.012);
  L.car('van', -165, 9.8, 0.05, 0xe4dbc3);
  L.car('sheriffSuv', -152, 10.0, 0.0, 0);
  person(k, -162, 12, Math.PI, { shirt: 0x6b4a33, pants: 0x2a3348, skin: 0xd8a47f, hair: 0x2a1f17, hat: 'cowboy' });
}

export function carLot(L: Layout) {
  const { c, k, rng } = L;
  const CL = { x0: 134, x1: 198, z0: -64, z1: -9 };
  L.dirt(CL.x0, CL.x1, CL.z0, CL.z1, 0x977757);
  L.c.roads.push({ x0: CL.x0, x1: CL.x1, z0: CL.z0, z1: CL.z1, kind: 'dirt' });
  salesOffice(c, 184, -54, 0);
  const lotPoles: THREE.Vector3[] = [];
  for (const [x, z] of [
    [136, -10],
    [166, -10],
    [196, -10],
    [196, -38],
    [136, -38],
  ]) {
    k.solid(x, z, 0.4, 0.4);
    k.cyl(x, 0, z, 0.12, 0.15, 7, 7, P.woodPole);
    lotPoles.push(new THREE.Vector3(x, 6.8, z));
  }
  for (let i = 0; i < lotPoles.length - 1; i++) pr.bunting(k, lotPoles[i], lotPoles[i + 1], rng);
  pr.bunting(k, lotPoles[1], new THREE.Vector3(166, 6.8, -38), rng);
  pr.bunting(k, lotPoles[4], new THREE.Vector3(166, 6.8, -38), rng);
  k.solid(166, -38, 0.4, 0.4);
  k.cyl(166, 0, -38, 0.12, 0.15, 7, 7, P.woodPole);
  const lotCars: [VehicleType, number, number, number, number, VehicleOpts?][] = [
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
  for (const [t, x, z, r, col, o] of lotCars) L.car(t, x, z, r, col, o ?? {});
  person(k, 160, -26, Math.PI * 0.8, { shirt: 0xf2efe6, pants: 0x1f1f22, skin: 0xf0c9a8, hair: 0x5a3a22, point: true });
  person(k, 161.4, -27.2, -0.6, { shirt: 0x6b4a33, pants: 0x2a3348, skin: 0xd8a47f, hair: 0x2a1f17, hat: 'cowboy' });
  pr.tireStack(k, 194, -30, 4);
  pr.tireStack(k, 195, -31, 3);
  pr.pebbles(k, rng, CL.x0, CL.z0, CL.x1, -6.5, 220, 0.012);
}

function eastFarms(L: Layout) {
  const { c, k, rng } = L;
  farmhouse(c, 325, 36, Math.PI);
  barn(c, 398, 44, Math.PI, { shed: true });
  waterTower(k, 346, 52, { legH: 9 });
  c.occ.add(346, 52, 6, 6, 0, 1);
  const wm = windmill(c, 428, 72, Math.PI * 0.85);
  L.animated.push({ obj: wm, update: (dt) => (wm.rotation.z -= dt * 1.6) });
  L.cornFields.push({ x: 279, z: 52, w: 40, d: 70, ry: 0 });
  c.occ.add(279, 52, 40, 70, 0, 0.5, false);
  pr.railFence(k, 258, 16, 300, 16);
  pr.railFence(k, 258, 16, 258, 88);
  pr.picketFence(k, 306, 13.5, 348, 13.5);
  pr.picketFence(k, 368, 13.5, 380, 13.5);
  L.dirt(352, 364, 4.6, 34, P.dirt);
  L.dirt(352, 420, 30, 58, 0x8f7050, false);
  L.c.roads.push({ x0: 352, x1: 364, z0: 4.6, z1: 58, kind: 'dirt' });
  pr.ruralMailbox(k, 350, 9, Math.PI);
  L.car('pickup', 337, 22, HALF_PI, 0x6d8ea3, { accent: 0xe9e8e2 });
  L.car('tow', 380, 28, -0.25, 0xe9e8e2, { accent: 0x2c3858 });
  person(k, 334, 24, 0.4, { shirt: 0x8a5a3a, pants: 0x2a3348, skin: 0xd8a47f, hair: 0x9a9a98, hat: 'cowboy' });
  for (let i = 0; i < 6; i++) k.box(408 + (i % 3) * 1.3, i > 2 ? 0.8 : 0, 22 + (i > 2 ? 0.3 : 0), 1.2, 0.8, 0.9, 0xd8b75a);
  k.solid(409.3, 22, 4, 1.2);
  for (let i = 0; i < 4; i++) pr.barrel(k, 384 + i * 0.7, 52, 0x2f7a5a);
  L.grass(330, 20, 60, 14, 160);
  L.grass(395, 20, 40, 14, 100);
  for (let i = 0; i < 10; i++) L.trees.push({ kind: rng.pick(['oak', 'fir', 'pine'] as const), x: rng.range(300, 440), z: rng.range(80, 120) });
  L.trees.push({ kind: 'oak', x: 312, z: 50, s: 1.2 }, { kind: 'oak', x: 368, z: 62, s: 1.1 }, { kind: 'bush', x: 360, z: 40 }, { kind: 'bush', x: 316, z: 30 });
  // north farm
  barn(c, 292, -140, 0, { shed: true });
  k.solid(308, -132, 6.2, 6.2);
  k.cyl(308, 0, -132, 3.0, 3.0, 13, 14, 0xb9bcbf, 'metal');
  k.sphere(308, 13, -132, 3.05, 0xa9adb0, 'metal', 14, 7);
  for (let i = 1; i < 6; i++) k.cyl(308, i * 2.2, -132, 3.05, 3.05, 0.1, 14, 0x7f8387, 'metal');
  c.occ.add(308, -132, 7, 7, 0, 1);
  L.cornFields.push({ x: 232, z: -112, w: 50, d: 70, ry: 0 });
  c.occ.add(232, -112, 50, 70, 0, 0.5, false);
  L.dirt(268, 273, -126, -4.6, P.dirt);
  L.c.roads.push({ x0: 268, x1: 273, z0: -126, z1: -4.6, kind: 'dirt' });
  pr.railFence(k, 206, -76, 260, -76);
  L.car('pickup', 296, -122, -HALF_PI, 0x7b2532, { accent: 0xe9e8e2 });
}

function highwayStrip(L: Layout) {
  const { c, k, signs } = L;
  welcomeSign(c, -430, 14, -HALF_PI);
  welcomeSign(c, 560, -14, HALF_PI);
  roadsideBillboard(c, -720, -18, HALF_PI + 0.35, 'billboardPark');
  roadsideBillboard(c, 640, -20, -HALF_PI - 0.4, 'billboardCola');
  pr.postSign(k, signs, 'us20', -320, 7.5, -HALF_PI, { w: 0.8, h: 0.8 });
  pr.postSign(k, signs, 'us20', 320, -7.5, HALF_PI, { w: 0.8, h: 0.8 });
  pr.postSign(k, signs, 'speed25', -305, 7.5, -HALF_PI, { w: 0.7, h: 0.9 });
  pr.postSign(k, signs, 'speed25', 305, -7.5, HALF_PI, { w: 0.7, h: 0.9 });
  pr.postSign(k, signs, 'curve', 900, 7.4, -HALF_PI);
  pr.postSign(k, signs, 'deer', -1100, -7.4, HALF_PI);
  pr.postSign(k, signs, 'tractorX', -520, 7.4, -HALF_PI);
  for (let x = -1800; x <= 1800; x += 400) if (Math.abs(x) > 500) pr.mileMarker(k, x, x > 0 ? -6.9 : 6.9, 0);
  // Tex Outpost on the eastern highway strip
  texOutpost(c, 228, -34, 0);
  L.pave(206, 252, -19, -6.3);
  for (let i = 0; i < 10; i++) L.paint(208 + i * 4.2, 208.12 + i * 4.2, -18.5, -13);
  L.car('delivery', 216, -16.2, Math.PI, 0x4a3426);
  for (const [x, t, col] of [
    [226.1, 'pickup', 0x7b2532],
    [238.7, 'sedan', 0xe9e8e2],
    [242.9, 'suv', 0x2f4a3d],
  ] as const)
    L.car(t, x, -15.6, HALF_PI, col);
  pr.acornLamp(k, 210, -8.5, 6);
  pr.acornLamp(k, 248, -8.5, 6);
}

function highways(L: Layout) {
  const { c, k, signs } = L;
  sr9(c, [
    [-345, -SR9_END],
    [345, SR9_END],
  ]);
  for (const z of [-SR9_END, SR9_END]) pr.barricade(k, signs, 0, z - Math.sign(z) * 2, 0, heightAt(0, z));
  k.at(0, 0, 0, () => pr.postSign(k, signs, 'distance', 8, -400, Math.PI, { w: 2.4, h: 1.0, y: 2.4 }), heightAt(8, -400));
  k.at(0, 0, 0, () => pr.postSign(k, signs, 'speed55', -7.6, -380, 0, { w: 0.7, h: 0.9 }), heightAt(-7.6, -380));
  k.at(0, 0, 0, () => pr.postSign(k, signs, 'speed55', 7.6, 380, Math.PI, { w: 0.7, h: 0.9 }), heightAt(7.6, 380));
  k.at(0, 0, 0, () => pr.postSign(k, signs, 'deer', 7.6, -980, Math.PI), heightAt(7.6, -980));
  k.at(0, 0, 0, () => pr.postSign(k, signs, 'tractorX', -7.6, 520, 0), heightAt(-7.6, 520));
  // wooden distribution poles along SR-9
  L.runZ(9.0, -1760, -380, 46);
  L.runZ(9.0, 380, 1760, 46);
}

function power(L: Layout) {
  const { c } = L;
  const sub = { x: -330, z: -262 };
  const pts = substation(c, sub.x, sub.z, 0);
  const west = transmissionLine(c, [
    [-2350, -1180],
    [-1700, -950],
    [-1150, -760],
    [-700, -560],
    [-420, -330],
  ]);
  const east = transmissionLine(c, [
    [-280, -400],
    [-120, -470],
    [300, -500],
    [700, -560],
    [1100, -650],
    [1500, -800],
    [2200, -1050],
  ]);
  // drop the end spans into the substation gantries
  const k = c.kit;
  const drop = (a: THREE.Vector3[], b: THREE.Vector3[]) => {
    for (let i = 0; i < 3; i++) {
      const pts2: THREE.Vector3[] = [];
      const A = a[i * 2];
      const B = b[i];
      for (let j = 0; j <= 10; j++) {
        const t = j / 10;
        const p = A.clone().lerp(B, t);
        p.y -= 2.5 * 4 * t * (1 - t);
        pts2.push(p);
      }
      k.tube(pts2, 0.045, 0x2b2d30, 'wire', 20, false);
    }
  };
  drop(west.last, pts.west);
  drop(east.first, pts.east);
  // distribution line from the substation along the access road into town
  L.runX(-267.4, -300, -140, 32);
}

export function outskirts(L: Layout, padY: { dairy: number; hay: number; orchard: number }) {
  setFarmHooks(
    (_c, type, x, z, ry, color, y, o) => L.carAt(type as VehicleType, x, z, ry, color as number, y, (o ?? {}) as VehicleOpts),
    (_c, x, z, w, d, n) => L.grass(x, z, w, d, n),
  );
  for (const f of Object.values(FARMS)) L.clearings.push({ x: f.x, z: f.z, w: f.w + 24, d: f.d + 24 });
  L.clearings.push({ x: -330, z: -262, w: 70, d: 56 });
  lumberYard(L);
  carLot(L);
  eastFarms(L);
  dairyFarm(L.c, padY.dairy, L.trees);
  hayFarm(L.c, padY.hay, L.trees);
  orchardFarm(L.c, padY.orchard, L.trees);
  highwayStrip(L);
  highways(L);
  power(L);
}

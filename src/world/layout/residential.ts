import * as THREE from 'three';
import { Layout, HALF_PI } from './helpers';
import { colonial, ranch, aframeCabin, shed } from '../buildings/homes';
import * as pr from '../props';
import type { VehicleType } from '../vehicles';
import { P, SIDING_COLORS, CAR_COLORS } from '../palette';

const SHUTTERS = [0x3b4048, 0x2f4a3a, 0x6b2a2a, 0x2c3a55, 0xf2efe8, 0x4a3a2a];
const ROOFS = [P.roofDark, P.roofNavy, 0x4a4f55, 0x5a3a2a, 0x2f4a3a, 0x3d4250];

export function residential(L: Layout) {
  const { c, k, rng, signs } = L;
  let forSalePlaced = false;
  const sheds: [number, number, number, number][] = [];

  const lot = (x: number, z: number, ry: number, roadDist: number) => {
    const roll = rng.next();
    const color = rng.pick(SIDING_COLORS);
    const shutters = rng.pick(SHUTTERS);
    const roof = rng.pick(ROOFS);
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
    L.housePoints.push(new THREE.Vector3(x, 0, z));
    k.at(x, z, ry, () => {
      const dx = hw + 2.2;
      const len = roadDist - front + 2;
      const zc = front - 2 + len / 2;
      const concrete = rng.chance(0.65);
      k.plane(dx, 0.02, zc, 3.2, len, concrete ? P.concrete : P.dirt, concrete ? 'concrete' : 'gravel');
      k.plane(-1.6 * (roll < 0.82 && roll >= 0.4 ? 1 : 0), 0.018, front + (roadDist - front) / 2, 1.2, roadDist - front, P.sidewalk, 'concrete');
      pr.ruralMailbox(k, dx + 2.2, roadDist - 0.4, -HALF_PI, rng.pick([0x2c2c2e, 0x8a8e92, 0x2c4a8c]));
      if (rng.chance(0.65)) {
        const t: VehicleType = rng.pick(['pickup', 'pickup', 'sedan', 'wagon', 'suv', 'van'] as const);
        L.car(t, dx, front + 4.5, HALF_PI, rng.pick(CAR_COLORS), rng.chance(0.3) ? { accent: 0xf2f1ec } : {});
      }
      if (rng.chance(0.3)) pr.picketFence(k, -hw - 1, roadDist - 2.5, -2.4, roadDist - 2.5);
      for (let i = 0; i < rng.int(2, 4); i++) {
        const p = k.toWorld(rng.range(-hw + 0.5, hw - 0.5), 0, front + 0.9);
        L.trees.push({ kind: 'bush', x: p.x, z: p.z, s: rng.range(0.6, 1.1) });
      }
      for (let i = 0; i < rng.int(1, 2); i++) {
        const p = k.toWorld(rng.sign() * rng.range(hw + 4, hw + 7), 0, rng.range(-6, front + 6));
        L.trees.push({ kind: rng.pick(['fir', 'oak', 'oak', 'pine'] as const), x: p.x, z: p.z, s: rng.range(0.6, 1.0) });
      }
      const g = k.toWorld(0, 0, front + (roadDist - front) / 2);
      L.grass(g.x, g.z, 18, 6, 10);
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

  // Pine Ave north of the civic block
  for (const z of [-208, -234, -284, -310, -334]) {
    lot(-26, z, HALF_PI, 17.8);
    lot(26, z, -HALF_PI, 17.8);
  }
  // Cedar Ln (north side, beyond the library and police lot)
  for (const x of [-90, 90]) lot(x, -182, 0, 16.5);
  // Elm (west side) and Oak (east side)
  for (const z of [-62, -92, -122, -152, -188, -218, -246, -290]) {
    lot(-150, z, HALF_PI, 21.4);
    if (z < -80) lot(150, z, -HALF_PI, 21.4);
  }
  // Elm east / Oak west behind the civic block
  for (const z of [-212, -240]) {
    lot(-100, z, -HALF_PI, 15.4);
    lot(100, z, HALF_PI, 15.4);
  }
  // Pine Ave south and South St (new rows behind the sheriff and motel)
  for (const z of [72, 98]) {
    lot(-26, z, HALF_PI, 17.8);
    lot(26, z, -HALF_PI, 17.8);
  }
  for (const x of [-100, -76, -52, 52, 76, 100]) lot(x, 117, 0, 13.5);
  for (const x of [-95, -60, 60, 95]) lot(x, 158, Math.PI, 17);
  for (const [x, z, r, col] of sheds) shed(c, x, z, r, col);
  L.grass(0, -260, 30, 160, 700);
  L.grass(-170, -150, 40, 200, 700);
  L.grass(170, -170, 40, 180, 600);
  L.grass(0, 110, 200, 30, 500);
}

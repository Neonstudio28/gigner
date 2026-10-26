import type { Ctx } from './buildings/common';
import { windowAt, doorAt } from './buildings/common';
import { barn, colonial, ranch } from './buildings/homes';
import { railFence, picketFence, ruralMailbox, roundBale, squareBales, cow, crateStack, barrel, postSign, propaneTank } from './props';
import { addFlatPad, heightAt } from './terrain';
import type { PlacedTree } from './vegetation';
import type { Kit, Col } from './core/kit';
import { P } from './palette';

/** Farmyards: Miller Dairy and Ridgeview (hay) in the West Valley, Sunny Acres Orchard east of Spirit Lake. */
export const FARMS = {
  dairy: { x: -1480, z: -130, w: 140, d: 100 },
  hay: { x: -1250, z: -60, w: 110, d: 150 },
  orchard: { x: 1560, z: 130, w: 140, d: 150 },
};

/** Flattens every farmyard; must run before anything samples heightAt. Returns pad heights. */
export function registerFarmPads() {
  return {
    dairy: addFlatPad(FARMS.dairy.x, FARMS.dairy.z, FARMS.dairy.w, FARMS.dairy.d, 40),
    hay: addFlatPad(FARMS.hay.x, FARMS.hay.z, FARMS.hay.w, FARMS.hay.d, 34),
    orchard: addFlatPad(FARMS.orchard.x, FARMS.orchard.z, FARMS.orchard.w, FARMS.orchard.d, 22),
  };
}

function gateArch(c: Ctx, x: number, z: number, ry: number, sign: 'dairy' | 'ridgeview', y: number) {
  const { kit: k, signs } = c;
  k.at(
    x,
    z,
    ry,
    () => {
      for (const s of [-1, 1]) {
        k.solid(s * 3.4, 0, 0.6, 0.6);
        k.cyl(s * 3.4, 0, 0, 0.22, 0.26, 5.2, 8, 0x6e4b30);
      }
      k.box(0, 5.0, 0, 7.6, 0.3, 0.3, 0x6e4b30);
      for (const s of [-1, 1]) k.beam({ x: s * 3.4, y: 4.0, z: 0 }, { x: s * 2.4, y: 5.0, z: 0 }, 0.14, 0.14, 0x6e4b30);
      for (const s of [-1.6, 1.6]) k.box(s, 4.05, 0, 0.03, 0.95, 0.03, 0x2a2a2a, 'metal');
      k.sign(0, 3.6, 0, 4.8, 1.2, signs.get(sign), { back: 0x4b3220, thick: 0.1, twoSided: true });
    },
    y,
  );
}

function silo(k: Kit, x: number, z: number, h: number, r: number, color: Col = 0xd8d4cc) {
  k.solid(x, z, r * 2 + 0.4, r * 2 + 0.4);
  k.cyl(x, 0, z, r, r, h, 14, color, 'concrete');
  for (let i = 1; i < 7; i++) k.cyl(x, (h * i) / 7, z, r + 0.05, r + 0.05, 0.12, 14, 0x6f7377, 'metal');
  k.sphere(x, h, z, r + 0.05, 0xb9bcbf, 'metal', 14, 7);
  k.box(x + r + 0.3, 0, z, 0.6, h - 0.5, 0.6, 0xb9bcbf, 'metal');
}

function grainBin(k: Kit, x: number, z: number, r = 3.2, h = 6) {
  k.solid(x, z, r * 2 + 0.3, r * 2 + 0.3);
  k.cyl(x, 0, z, r, r, h, 16, 0xd0d3d6, 'corrugated');
  k.cone(x, h, z, r + 0.25, 2.4, 16, 0xc3c7cb, 'metal');
  k.cyl(x, h + 2.4, z, 0.4, 0.4, 0.5, 8, 0xc3c7cb, 'metal');
  k.beam({ x: x + r, y: 0, z }, { x: x + 0.3, y: h + 2.6, z }, 0.08, 0.08, 0x6f7377, 'metal');
}

/** Long corrugated-metal dairy barn with roof vents. */
function dairyBarn(c: Ctx, x: number, z: number) {
  const { kit: k } = c;
  const w = 42;
  const d = 15;
  const H = 4.6;
  c.occ.add(x, z, w, d, 0, 1.5);
  k.at(x, z, 0, () => {
    k.box(0, 0, 0, w, 1.2, d, 0xd8d4cc, 'concrete');
    k.box(0, 1.2, 0, w, H - 1.2, d, 0xb8322a, 'corrugated');
    k.roof(0, H, 0, w, [[d / 2, 0], [0, 3.2], [-d / 2, 0]], 0xd9d9d6, 'roofMetal', { trim: 0xf2efe8, fill: 0xb8322a, fillMat: 'corrugated', ridge: 0xb9bcbf, eaveOH: 0.6 });
    for (let i = 0; i < 3; i++) {
      const vx = -12 + i * 12;
      k.box(vx, H + 3.2, 0, 1.6, 1.2, 1.6, 0xd9d9d6, 'metal');
      k.cone(vx, H + 4.4, 0, 1.3, 0.6, 4, 0xc3c7cb, 'metal', { ry: Math.PI / 4 });
    }
    for (const s of [-1, 1]) {
      k.at(0, s * (d / 2), s > 0 ? 0 : Math.PI, () => {
        for (let i = 0; i < 9; i++) windowAt(k, -18 + i * 4.5, 2.4, 0, 1.4, 0.8, { frame: 0xf2efe8, mx: 2, my: 1 });
      });
      k.at((s * w) / 2, 0, (s * Math.PI) / 2, () => {
        k.box(0, 0, 0.03, 4.4, 4.2, 0.1, 0xb8322a, 'corrugated');
        for (const yy of [0, 4.2]) k.box(0, yy, 0.08, 4.6, 0.15, 0.1, 0xf2efe8);
        k.beam({ x: -2.1, y: 0.1, z: 0.12 }, { x: 2.1, y: 4.1, z: 0.12 }, 0.15, 0.06, 0xf2efe8);
        k.beam({ x: 2.1, y: 0.1, z: 0.12 }, { x: -2.1, y: 4.1, z: 0.12 }, 0.15, 0.06, 0xf2efe8);
      });
    }
  });
}

export function dairyFarm(c: Ctx, y: number, trees: PlacedTree[]) {
  const { kit: k, rng } = c;
  const { x: cx, z: cz } = FARMS.dairy;
  // driveway from US-20
  // entrance from Dairy Rd (north)
  gateArch(c, cx - 1, cz - 47, 0, 'dairy', heightAt(cx - 1, cz - 47));
  k.at(0, 0, 0, () => ruralMailbox(k, cx + 4, cz - 96, Math.PI, 0xc8262c), heightAt(cx + 4, cz - 96));
  k.at(
    0,
    0,
    0,
    () => {
      k.plane(cx - 2, 0.025, cz - 4, 40, 26, P.dirt, 'gravel');
      colonial(c, cx - 44, cz - 22, Math.PI, { color: 0xf2efe8, roof: P.roofDark, shutters: 0x2f4a3a, porch: 'full', chimney: 'brick' });
      picketFence(k, cx - 58, cz - 34, cx - 49, cz - 34);
      picketFence(k, cx - 39, cz - 34, cx - 30, cz - 34);
      dairyBarn(c, cx + 18, cz + 2);
      silo(k, cx + 45, cz - 6, 17, 3);
      silo(k, cx + 52.5, cz - 6, 15, 2.6, 0xc9c1b1);
      grainBin(k, cx - 6, cz + 8);
      grainBin(k, cx + 1, cz + 8, 2.8, 5.4);
      k.box(cx + 45, 0, cz + 4, 5, 3.2, 4, 0xf2efe8, 'cinder');
      k.cylX(cx + 45, 1.5, cz + 6.4, 0.9, 3.6, 12, 0xd9dcdf, 'chrome');
      // pasture
      const px0 = cx - 60;
      const px1 = cx + 55;
      const pz0 = cz + 16;
      const pz1 = cz + 48;
      railFence(k, px0, pz0, px1, pz0, 0x6e5440);
      railFence(k, px1, pz0, px1, pz1, 0x6e5440);
      railFence(k, px1, pz1, px0, pz1, 0x6e5440);
      railFence(k, px0, pz1, px0, pz0, 0x6e5440);
      for (let i = 0; i < 16; i++) cow(k, rng.range(px0 + 4, px1 - 4), rng.range(pz0 + 3, pz1 - 3), rng.range(0, Math.PI * 2), rng);
      k.box(cx - 20, 0, cz + 20, 4, 0.7, 1.2, 0x8a8e92, 'metal');
      k.box(cx - 20, 0.6, cz + 20, 3.8, 0.04, 1.0, 0x4c7f95, 'water', { cast: false });
      for (let i = 0; i < 6; i++) roundBale(k, cx + 28 + (i % 3) * 1.8, cz - 12 - Math.floor(i / 3) * 1.8, Math.PI / 2, (i % 2) * 0);
      squareBales(k, cx + 34, cz - 16, 0.2, 8);
      propaneTank(k, cx - 30, cz - 8, 0);
      for (let i = 0; i < 3; i++) barrel(k, cx + 40 + i * 0.7, cz - 14, 0x2f7a5a);
      grassPatch(c, cx, cz + 32, 110, 30, 260);
    },
    y,
  );
  carAt(c, 'tractor', cx + 6, cz - 14, 0.4, 0x2f7a3a, y);
  carAt(c, 'pickup', cx - 30, cz - 26, Math.PI / 2, 0x6d8ea3, y);
  for (const [tx, tz] of [[-70, -30], [-64, -42], [-26, -36], [-74, 10]]) trees.push({ kind: 'oak', x: cx + tx, z: cz + tz, s: 1.1 });
}

export function hayFarm(c: Ctx, y: number, trees: PlacedTree[]) {
  const { kit: k, rng, signs } = c;
  const { x: cx, z: cz, w, d } = FARMS.hay;
  const east = cx + w / 2;
  void east;
  // entrance from Ridgeview Rd (north-west)
  gateArch(c, cx + 2, cz - 98, 0, 'ridgeview', heightAt(cx + 2, cz - 98));
  k.at(0, 0, 0, () => postSign(k, signs, 'hayForSale', cx + 8, cz - 150, Math.PI, { w: 1.6, h: 0.55, y: 1.2 }), heightAt(cx + 8, cz - 150));
  k.at(0, 0, 0, () => ruralMailbox(k, cx + 7, cz - 160, Math.PI), heightAt(cx + 7, cz - 160));
  k.at(
    0,
    0,
    0,
    () => {
      k.plane(cx + 4, 0.03, cz + 34, 50, 34, P.dirt, 'gravel');
      ranch(c, cx - 4, cz + 64, Math.PI / 2, { color: 0xe8e6df, roof: 0x5a3a2a, shutters: 0x6b2a2a, carport: true, flag: true, lights: true });
      barn(c, cx - 26, cz + 22, 0, { shed: true, color: 0x8a6a52 });
      // open-sided pole barn full of round bales
      const bx = cx + 18;
      const bz = cz + 6;
      c.occ.add(bx, bz, 20, 12, 0, 1);
      k.at(bx, bz, 0, () => {
        for (const px of [-9, -3, 3, 9]) for (const pz of [-5.5, 5.5]) {
          k.solid(px, pz, 0.4, 0.4);
          k.box(px, 0, pz, 0.3, 5, 0.3, P.woodDark);
        }
        k.roof(0, 5, 0, 18, [[6, 0], [0, 1.8], [-6, 0]], 0xb9bcbf, 'corrugated', { eaveOH: 0.4, gableOH: 0.3 });
        for (let i = 0; i < 10; i++) roundBale(k, -7.5 + (i % 5) * 3.6, -2 + Math.floor(i / 5) * 2.5, Math.PI / 2);
        for (let i = 0; i < 4; i++) roundBale(k, -5.7 + i * 3.6, -0.8, Math.PI / 2, 1.4);
      });
      // stubble field with scattered bales
      k.plane(cx, 0.03, cz - 52, w - 14, 70, 0xc8b46a, 'field');
      c.occ.add(cx, cz - 52, w - 14, 70, 0, 0.5, false);
      for (let i = 0; i < 22; i++) roundBale(k, cx + rng.range(-42, 42), cz + rng.range(-82, -22), rng.range(0, Math.PI));
      railFence(k, cx - w / 2 + 6, cz - 88, cx + w / 2 - 6, cz - 88, 0x6e5440);
      silo(k, cx - 40, cz + 4, 12, 2.4, 0xb9bcbf);
      grassPatch(c, cx, cz + 60, 80, 40, 220);
    },
    y,
  );
  carAt(c, 'tractor', cx + 6, cz - 20, -0.8, 0xb8322a, y);
  carAt(c, 'pickup', cx + 12, cz + 40, 0.2, 0xa62e2a, y, { accent: 0xf2f1ec });
  for (const [tx, tz] of [[-12, 80], [12, 84], [-36, 72]]) trees.push({ kind: 'oak', x: cx + tx, z: cz + tz, s: 1.0 });
}

export function orchardFarm(c: Ctx, y: number, trees: PlacedTree[]) {
  const { kit: k, rng, signs } = c;
  const { x: cx, z: cz } = FARMS.orchard;
  const west = cx - FARMS.orchard.w / 2;
  k.at(
    0,
    0,
    0,
    () => {
      // produce stand by the highway
      const sx = west + 8;
      const sz = cz - 48;
      c.occ.add(sx, sz, 8, 6, 0, 1);
      k.at(sx, sz, -Math.PI / 2, () => {
        k.box(0, 0, 0, 7, 2.6, 4.5, 0xb08b62, 'boards');
        k.roof(0, 2.6, 0, 7, [[3.8, -0.3], [-2.25, 0.4]], 0xc8262c, 'roofMetal', { thick: 0.1, eaveOH: 0.2, gableOH: 0.2 });
        for (const px of [-3.3, 3.3]) k.box(px, 0, 3.6, 0.15, 2.3, 0.15, P.woodDark);
        k.box(0, 0.9, 2.6, 6.6, 0.1, 1.4, 0x8a6a48, 'planks');
        for (let i = 0; i < 6; i++) {
          k.box(-2.75 + i * 1.1, 1.0, 2.6, 0.9, 0.3, 0.9, 0x9a7a52, 'planks');
          k.box(-2.75 + i * 1.1, 1.3, 2.6, 0.82, 0.12, 0.82, [0xc0392b, 0xe67e22, 0x7fb03a, 0xe8c547, 0xc0392b, 0x8e44ad][i]);
        }
        k.sign(0, 3.7, 1.6, 5.2, 1.7, signs.get('produce'), { back: 0xf4efe0, thick: 0.12 });
        for (const px of [-2.3, 2.3]) k.box(px, 2.6, 1.6, 0.12, 0.6, 0.12, P.woodDark);
      });
      for (let i = 0; i < 4; i++) crateStack(k, rng, sx + 5 + (i % 2) * 1.4, sz - 4 + Math.floor(i / 2) * 1.4, rng.range(-0.3, 0.3));
      k.plane(sx + 10, 0.03, sz, 18, 12, P.dirt, 'gravel');
      colonial(c, west + 34, cz - 40, -Math.PI / 2, { color: 0xf2efe8, roof: 0x2f4a3a, shutters: 0x2f4a3a, porch: 'full', chimney: 'white' });
      barn(c, west + 92, cz - 52, Math.PI / 2, { color: P.barnRed });
      for (let i = 0; i < 6; i++) k.box(west + 70 + (i % 3) * 1.3, Math.floor(i / 3) * 0.8, cz - 22, 1.2, 0.8, 0.9, 0xb08b62, 'planks');
      // orchard rows
      for (let r = 0; r < 11; r++)
        for (let t = 0; t < 15; t++) {
          const ax = west + 28 + t * 7 + (r % 2) * 1.5;
          const az = cz - 6 + r * 7;
          if (az > cz + FARMS.orchard.d / 2 - 4) continue;
          trees.push({ kind: 'apple', x: ax + rng.range(-0.4, 0.4), z: az + rng.range(-0.4, 0.4), s: rng.range(0.85, 1.1) });
        }
      c.occ.add(west + 77, cz + 30, 108, 80, 0, 0, false);
      picketFence(k, west + 22, cz - 62, west + 46, cz - 62);
      grassPatch(c, west + 70, cz + 30, 110, 80, 420);
    },
    y,
  );
  carAt(c, 'pickup', west + 18, cz - 40, Math.PI / 2, 0x3e5f80, y, { accent: 0xe9e8e2 });
  carAt(c, 'tractor', west + 70, cz - 30, 2.4, 0x2f7a3a, y);
  for (let i = 0; i < 3; i++) k.at(0, 0, 0, () => barrel(k, west + 14 + i * 0.7, cz - 30, 0xc0392b), y);
}

// shared hooks provided by the town builder
let carImpl: (c: Ctx, type: string, x: number, z: number, ry: number, color: Col, y: number, o?: object) => void = () => {};
let grassImpl: (c: Ctx, x: number, z: number, w: number, d: number, n: number) => void = () => {};
export function setFarmHooks(car: typeof carImpl, grass: typeof grassImpl) {
  carImpl = car;
  grassImpl = grass;
}
function carAt(c: Ctx, type: string, x: number, z: number, ry: number, color: Col, y: number, o?: object) {
  carImpl(c, type, x, z, ry, color, y, o);
}
function grassPatch(c: Ctx, x: number, z: number, w: number, d: number, n: number) {
  grassImpl(c, x, z, w, d, n);
}

export { doorAt };

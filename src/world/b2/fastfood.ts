import * as THREE from 'three';
import type { Col } from '../core/kit';
import type { Ctx } from '../buildings/common';
import type { BuildingDef } from '../buildings/catalog';
import { furnishFastFood, furnishFishHouse, addZone } from '../buildings/interiors';
import { face, awning, signBoard, WHITE, DARK, F_OS } from './kit2';
import { put, spread, type Look } from './hull';
import { services, steps, parapetRoof } from './parts';
import { block, glassDoor, shopWin, sash, backDoor } from './landmarks';

type Kit = Ctx['kit'];
const PI = Math.PI;

/** Mansard skirt: a four-sided sloped band round a w×d roof edge, `out` beyond the wall at the eave, `inset` back at the top. */
function mansard(k: Kit, w: number, d: number, y: number, rise: number, color: Col, mat = 'shingle', out = 0.45, inset = 0.9) {
  const W = w / 2 + out;
  const D = d / 2 + out;
  const w2 = w / 2 - inset;
  const d2 = d / 2 - inset;
  const q = (a: number[], b: number[], c: number[], e: number[]) => [a, b, c, a, c, e];
  const tris = [
    ...q([-W, 0, D], [W, 0, D], [w2, rise, d2], [-w2, rise, d2]),
    ...q([W, 0, -D], [-W, 0, -D], [-w2, rise, -d2], [w2, rise, -d2]),
    ...q([W, 0, D], [W, 0, -D], [w2, rise, -d2], [w2, rise, d2]),
    ...q([-W, 0, -D], [-W, 0, D], [-w2, rise, d2], [-w2, rise, -d2]),
  ];
  const pos = new Float32Array(tris.flat());
  const uv = new Float32Array((pos.length / 3) * 2);
  const sl = Math.hypot(rise, out + inset) / rise;
  for (let i = 0; i < pos.length / 3; i++) {
    const side = Math.floor(i / 6) >= 2;
    uv[i * 2] = side ? pos[i * 3 + 2] : pos[i * 3];
    uv[i * 2 + 1] = pos[i * 3 + 1] * sl;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  k.add(g, color, mat, k.local(0, y, 0));
  k.box(0, y - 0.12, 0, W * 2, 0.12, D * 2, WHITE);
  k.box(0, y + rise - 0.02, 0, w2 * 2 + 0.2, 0.1, d2 * 2 + 0.2, 0x55524c);
}

interface Brand {
  id: string;
  name: string;
  w: number;
  d: number;
  wall: Col;
  wallMat: string;
  frame: Col;
  accent: Col;
  vinyl: Col;
  look: Look;
  sign: string;
  signBg: string;
  signInk: string;
  top: (c: Ctx, w: number, d: number, H: number) => void;
  y0?: number;
}

const sig = (c: Ctx, b: Brand, key: string, x: number, y: number, z: number, w: number, h = 0.9, lamps = 0) =>
  signBoard(c, `${b.id}.${key}`, x, y, z, w, h, b.signBg, [{ text: b.sign, font: F_OS, weight: '800', color: b.signInk, y: 0.56, size: 0.6, maxW: 0.9 }], { frame: b.frame, lamps });

/** A 1990s drive-through restaurant: glass-fronted dining room, pick-up window on the right, kitchen door and bins behind. */
function fastFood(b: Brand) {
  return (c: Ctx, x: number, z: number, ry: number) => {
    const { kit: k } = c;
    const { w, d } = b;
    c.occ.add(x, z, w, d, ry, 0.8, false);
    k.at(x, z, ry, () => {
      const H = block(c, { w, d, h: 3.2, y0: 0.18, wall: b.wall, wallMat: b.wallMat, look: b.look, frame: b.frame, roof: 'flat', band: 0.25, gear: 3,
        f: [glassDoor(-w / 2 + 2.2, b.frame, 1.5), shopWin(1.4, w - 6.4, b.frame, 2.1)],
        l: [glassDoor(d / 2 - 2.6, b.frame, 1.3), shopWin(-0.4, 2.6, b.frame, 1.6)],
        r: [{ x: 0, w: 1.5, h: 1.15, y: 1.0, kind: 'win', win: { frame: b.frame, sill: WHITE } }, shopWin(d / 2 - 2.6, 3.2, b.frame, 1.6)],
        b: [backDoor(w / 2 - 1.6)],
        furnish: (kk, r, A, B) => furnishFastFood(kk, r, A, B, -w / 2 + 2.2, b.vinyl, b.accent, 1) });
      b.top(c, w, d, H);
      face(k, 'f', w, d, (len) => {
        k.box(0, 0, 0.9, len, 0.16, 1.8, 0xc9c4b8, 'concrete', { cast: false });
        put(k, 'trash_can_street', len / 2 - 0.7, 0.16, 0.6, 0);
        put(k, 'newspaper_box_a', len / 2 - 1.6, 0.16, 0.5, 0);
        put(k, 'bench_metal', 1.5, 0.16, 0.55, PI);
        for (const px of [-len / 2 + 0.5, -len / 2 + 3.9]) {
          k.box(px, 0.16, 1.3, 0.7, 0.45, 0.7, 0x8f8c87, 'concrete');
          k.cone(px, 0.6, 1.3, 0.38, 0.6, 7, 0x4f7a3f, 'paint');
        }
      });
      face(k, 'r', w, d, () => {
        // pick-up window: bumped-out bay, shelf, awning and a lit sign over it
        k.box(0, 0.18, 0.2, 2.3, 0.82, 0.4, b.wall, b.wallMat);
        k.box(0, 1.0, 0.42, 1.9, 0.06, 0.5, 0xc9ccd0, 'chrome');
        awning(k, 0, 3.05, 2.8, { a: b.accent, b: 0xf6f1e4, proj: 1.1, drop: 0.5 });
        signBoard(c, `${b.id}.pick`, -2.6, 2.5, 0.08, 1.9, 0.42, b.signInk, [{ text: 'PICK UP HERE', font: F_OS, weight: '800', color: b.signBg, y: 0.58, size: 0.6, maxW: 0.9 }], {});
        for (const px of [-1.5, 1.5]) k.cyl(px, 0, 0.75, 0.09, 0.09, 1.0, 8, 0xe8c547, 'paint');
      });
      face(k, 'l', w, d, (len) => {
        k.box(0, 0, 0.7, len, 0.16, 1.4, 0xc9c4b8, 'concrete', { cast: false });
        put(k, 'vending_soda', -len / 2 + 1.0, 0.16, 0.5, 0);
        put(k, 'phone_booth', -len / 2 + 2.4, 0.16, 0.6, 0);
      });
      face(k, 'b', w, d, (len) => {
        services(k, -len / 2 + 1.2, H - 0.5);
        k.box(len / 2 - 3.6, 0, 0.9, 1.8, 2.1, 1.6, 0xd8dcdf, 'corrugated');
        k.solid(len / 2 - 3.6, 0.9, 1.8, 1.6, 0, 2.1);
        put(k, 'cardboard_box_stack', 0.8, 0, 0.7, 0.3);
        put(k, 'crate_wood_a', -1.2, 0, 0.6, 0.2);
        for (let i = 0; i < 3; i++) k.cyl(-3 + i * 0.5, 0, 0.5, 0.2, 0.2, 0.7, 8, [0x3f6f9a, 0x6a6a6c, 0x3f6f9a][i], 'metal');
      });
    });
  };
}

const L_FAST: Look = { wall: 0xf3ead8, wains: 0xb5322c, floor: 0xb5653c, floorMat: 'tiles', lights: 'troffer', step: 3.4 };

const BRANDS: Brand[] = [
  { id: 'bigBun', name: 'Big Bun Burgers', w: 15, d: 12, wall: 0xc9a27a, wallMat: 'brickTan', frame: 0x8f2f25, accent: 0xc8322c, vinyl: 0xc8322c, look: L_FAST, sign: 'BIG BUN BURGERS', signBg: '#c8322c', signInk: '#ffd24a',
    top: (c, w, d, H) => {
      const k = c.kit;
      mansard(k, w, d, H, 1.5, 0x8f2f25, 'shingle');
      face(k, 'f', w, d, () => sig(c, BRANDS[0], 'f', 1.2, H + 0.75, 0.2, 7.2, 0.95));
      face(k, 'l', w, d, () => sig(c, BRANDS[0], 'l', 0, H + 0.75, 0.2, 6, 0.8));
      // a yellow bun-shaped beacon on the roof
      k.cyl(-w / 2 + 3, H + 1.5, d / 2 - 3, 0.12, 0.12, 1.4, 6, 0x55524c, 'metal');
      k.cyl(-w / 2 + 3, H + 2.9, d / 2 - 3, 0.7, 1.15, 0.7, 12, 0xe0a040, 'gloss');
      k.cyl(-w / 2 + 3, H + 2.7, d / 2 - 3, 1.2, 1.2, 0.2, 12, 0x6b3a22, 'paint');
      k.cyl(-w / 2 + 3, H + 2.45, d / 2 - 3, 1.15, 1.0, 0.25, 12, 0xe0a040, 'gloss');
    } },
  { id: 'cluckers', name: "Clucker's Fried Chicken", w: 15, d: 12, wall: 0xf1ede2, wallMat: 'stucco', frame: 0xb3262e, accent: 0xb3262e, vinyl: 0xb3262e, look: { ...L_FAST, wains: 0xb3262e, floor: 0xffffff, floorMat: 'checker' }, sign: "CLUCKER'S FRIED CHICKEN", signBg: '#f6f1e4', signInk: '#b3262e',
    top: (c, w, d, H) => {
      const k = c.kit;
      mansard(k, w, d, H, 1.6, 0xb3262e, 'roofMetal');
      // red-and-white striped mansard and a cupola with a weathervane
      for (const sx of spread(7, w - 1.5)) k.box(sx, H + 0.8, d / 2 - 0.2, 0.55, 1.7, 0.06, 0xf6f1e4, 'paint', { rx: -0.7, cast: false });
      k.box(0, H + 1.6, 0, 2.6, 1.3, 2.6, 0xf1ede2, 'siding');
      for (const s of [-1, 1]) k.box(0, H + 1.9, s * 1.31, 1.4, 0.7, 0.03, 0x39424a, 'glass', { cast: false });
      k.cone(0, H + 2.9, 0, 2.2, 1.8, 4, 0xb3262e, 'roofMetal', { ry: PI / 4 });
      k.cyl(0, H + 4.7, 0, 0.04, 0.04, 1.1, 5, DARK, 'metal');
      k.box(0, H + 5.5, 0, 0.9, 0.5, 0.04, 0xb3262e, 'paint');
      k.box(0.35, H + 5.9, 0, 0.3, 0.3, 0.04, 0xe8c547, 'paint');
      face(k, 'f', w, d, () => sig(c, BRANDS[1], 'f', 1.2, 3.25, 0.12, 8.4, 0.6));
    } },
  { id: 'tacoShack', name: 'Taco Shack', w: 14, d: 11, wall: 0xe6cfa4, wallMat: 'stucco', frame: 0x2f7f7a, accent: 0xd9862b, vinyl: 0x2f7f7a, look: { ...L_FAST, wall: 0xf3e4c4, wains: 0x2f7f7a, floor: 0xb5653c }, sign: 'TACO SHACK', signBg: '#d9862b', signInk: '#4a1f6a',
    top: (c, w, d, H) => {
      const k = c.kit;
      parapetRoof(k, w, d, H, { wall: 0xe6cfa4, wallMat: 'stucco', h: 0.5, cap: 0xb5532f });
      // mission bell gable over the entrance and a clay-tile shed roof across the front
      face(k, 'f', w, d, (len) => {
        k.roof(0, H - 0.75, 0.75, len + 0.6, [[0.9, 0], [-0.75, 0.75]], 0xb5532f, 'shingle', { eaveOH: 0.1, gableOH: 0.1, thick: 0.22 });
        for (const px of spread(5, len - 0.4)) k.box(px, 0.16, 1.45, 0.3, H - 1.0, 0.3, 0xe6cfa4, 'stucco');
        k.box(0, H, -0.3, 5.2, 1.1, 0.6, 0xe6cfa4, 'stucco');
        k.box(0, H + 1.1, -0.3, 3.4, 0.9, 0.6, 0xe6cfa4, 'stucco');
        k.box(0, H + 2.0, -0.3, 1.8, 0.6, 0.6, 0xe6cfa4, 'stucco');
        for (const [ww, yy] of [[5.4, 1.1], [3.6, 2.0], [2.0, 2.6]] as const) k.box(0, H + yy, -0.3, ww, 0.1, 0.7, 0xb5532f);
        k.box(0, H + 1.2, 0.01, 0.9, 0.7, 0.04, 0x3a2c20, 'paint', { cast: false });
        k.cyl(0, H + 1.3, 0.05, 0.12, 0.26, 0.4, 8, 0xc9a24a, 'metal');
        sig(c, BRANDS[2], 'f', 0, H + 0.5, 0.06, 4.6, 0.8);
      });
    } },
  { id: 'pizzaPalace', name: 'Pizza Palace', w: 15, d: 12, wall: 0x9a4a36, wallMat: 'brickRed', frame: 0x3a2c20, accent: 0x2e6b3c, vinyl: 0x7a2424, look: { ...L_FAST, wall: 0xe9dcc0, wains: 0x5f3a26, floor: 0x7a2f2a, floorMat: 'carpet', lights: 'pendant', step: 2.8 }, sign: 'PIZZA PALACE', signBg: '#f6f1e4', signInk: '#b3262e',
    top: (c, w, d, H) => {
      const k = c.kit;
      // the red double-pitched "hat" roof: low skirt, then a raised hipped crown
      mansard(k, w, d, H, 1.0, 0xa82a24, 'shingle', 0.7, 2.2);
      k.box(0, H + 0.9, 0, w - 4.6, 0.7, d - 4.6, 0xa82a24, 'shingle');
      k.hipRoof(0, H + 1.6, 0, w - 4.6, d - 4.6, 1.9, 0xa82a24, 'shingle', 0.5);
      face(k, 'f', w, d, () => sig(c, BRANDS[3], 'f', 1.2, 3.2, 0.12, 6.4, 0.6));
    } },
  { id: 'dairyDream', name: 'Dairy Dream', w: 12, d: 9, wall: 0xf4f1ea, wallMat: 'siding', frame: 0x3f7fb5, accent: 0x3f7fb5, vinyl: 0xd9708a, look: { ...L_FAST, wall: 0xfdf3e3, wains: 0x3f7fb5, floor: 0xffffff, floorMat: 'checker' }, sign: 'DAIRY DREAM', signBg: '#f6f1e4', signInk: '#2f5f95',
    top: (c, w, d, H) => {
      const k = c.kit;
      // upswept canopy over the walk-up front, and a giant soft-serve cone on the roof
      face(k, 'f', w, d, (len) => {
        k.roof(0, H - 0.2, 1.2, len + 1.6, [[1.9, 0.9], [-1.4, 0]], 0xf4f1ea, 'roofMetal', { eaveOH: 0, gableOH: 0, thick: 0.2 });
        k.box(0, H + 0.62, 3.05, len + 1.6, 0.34, 0.1, 0x3f7fb5, 'gloss');
        for (const px of [-len / 2 - 0.4, len / 2 + 0.4]) k.cyl(px, 0, 2.8, 0.08, 0.08, H + 0.5, 6, 0x3f7fb5, 'metal');
        sig(c, BRANDS[4], 'f', 1.2, 3.2, 0.12, 5.6, 0.6);
      });
      const [cx, cz] = [-w / 2 + 2.6, 0.5];
      k.cone(cx, H + 0.5, cz, 0.75, 1.9, 10, 0xd9a05b, 'paint', { rx: PI });
      for (const [r, y] of [[0.95, 2.4], [0.78, 2.95], [0.58, 3.4], [0.36, 3.8]] as const) k.cyl(cx, H + y, cz, r * 0.7, r, 0.55, 10, 0xfdf6e8, 'gloss');
      k.cone(cx, H + 4.3, cz, 0.24, 0.5, 8, 0xfdf6e8, 'gloss');
    } },
];

/** Heron Point Fish House: cedar-and-stone lake restaurant whose dining deck stands on piles over the water. */
function fishHouse(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k } = c;
  const W = 20;
  const D = 13;
  const cedar = 0x8a5a3a;
  const green = 0x2f4f3f;
  c.occ.add(x, z, W + 1, D + 1, ry, 0.5, false);
  k.at(x, z, ry, () => {
    const y0 = 0.9;
    const H = block(c, { w: W, d: D, h: 3.3, y0, wall: cedar, wallMat: 'boards', frame: green, roof: 'gable', roofMat: 'shingle', roofCol: 0x3f4a44, pitch: 0.5,
      look: { wall: 0xe9dcc0, wains: 0x5f4630, wainsH: 1.1, floor: 0x9a6f48, floorMat: 'woodFloor', ceil: 0xb98e62, ceilMat: 'boards', lights: 'pendant', step: 3.2 },
      f: [glassDoor(0, green, 1.7), shopWin(-6, 5.6, green, 2.0), shopWin(6, 5.6, green, 2.0)],
      b: [glassDoor(-5, green, 1.5), sash(2, 1.6, 1.3, 1.1, green), sash(6.5, 1.6, 1.3, 1.1, green)],
      l: [sash(0, 3, 1.6, 0.9, green)], r: [sash(-2.5, 2.4, 1.6, 0.9, green), sash(2.5, 2.4, 1.6, 0.9, green)],
      furnish: (kk, r, a, b) => furnishFishHouse(kk, r, a, b, 0) });
    // stone chimney on the right gable
    k.box(W / 2 + 0.35, 0, -D / 2 + 4.6, 0.9, H + 3.6, 1.8, 0x8a857c, 'stone');
    k.box(W / 2 + 0.35, H + 3.6, -D / 2 + 4.6, 1.1, 0.2, 2.0, 0x55524c);
    for (const s of ['f', 'b', 'l', 'r'] as const) face(k, s, W, D, (len) => k.box(0, 0, 0.06, len + 0.1, y0, 0.14, 0x8a857c, 'stone', { cast: false }));

    // the lake side is the building's FRONT: a wide deck on piles, railed, with parasol tables and festoon lights
    face(k, 'f', W, D, (len) => {
      const dd = 11;
      const dw = len + 8;
      k.box(0, y0 - 0.22, dd / 2, dw, 0.22, dd, 0xa98a62, 'planks');
      addZone(k, 0, dd / 2, dw, dd + 0.1, y0);
      for (const px of spread(8, dw - 0.6)) for (const pz of [0.6, dd / 2, dd - 0.4]) k.cyl(px, -3, pz, 0.16, 0.18, 3 + y0 - 0.2, 7, 0x5a4632, 'boards');
      for (const pz of [0.6, dd / 2, dd - 0.4]) k.box(0, y0 - 0.45, pz, dw, 0.24, 0.2, 0x6a5038, 'boards');
      const rail = (ax: number, az: number, bx: number, bz: number) => {
        const l = Math.hypot(bx - ax, bz - az);
        const hz = Math.abs(bx - ax) > Math.abs(bz - az);
        const mx = (ax + bx) / 2;
        const mz = (az + bz) / 2;
        k.box(mx, y0 + 1.0, mz, hz ? l : 0.12, 0.08, hz ? 0.12 : l, 0x6a5038, 'boards');
        k.box(mx, y0 + 0.5, mz, hz ? l : 0.05, 0.05, hz ? 0.05 : l, 0x6a5038, 'boards');
        const n = Math.max(1, Math.round(l / 1.8));
        for (let i = 0; i <= n; i++) k.box(ax + ((bx - ax) * i) / n, y0, az + ((bz - az) * i) / n, 0.12, 1.05, 0.12, 0x6a5038, 'boards');
        const m = Math.round(l / 0.2);
        for (let i = 0; i <= m; i++) k.box(ax + ((bx - ax) * i) / m, y0 + 0.08, az + ((bz - az) * i) / m, 0.035, 0.9, 0.035, 0x7a6248, 'boards', { cast: false });
        k.solid(mx, mz, hz ? l : 0.2, hz ? 0.2 : l, 0, y0 + 1.1);
      };
      const hw = dw / 2;
      rail(-hw, 0.2, -hw, dd);
      rail(hw, 0.2, hw, dd);
      rail(-hw, dd, -1.6, dd);
      rail(1.6, dd, hw, dd);
      for (const s of [-1, 1]) rail(s * hw, 0.2, s * (len / 2 + 0.2), 0.2);
      // gangway down to the boat dock
      k.box(0, y0 - 0.55, dd + 2.4, 2.6, 0.14, 5.2, 0xa98a62, 'planks', { rx: 0.14 });
      addZone(k, 0, dd + 2.4, 2.6, 5, y0, y0 - 0.75);
      for (const sx of [-1, 1]) k.box(sx * 1.3, y0 - 0.1, dd + 2.4, 0.08, 0.08, 5.2, 0x6a5038, 'boards', { rx: 0.14 });
      const cols = [0xb3262e, 0x2f4f3f, 0xe9d9a0, 0x2f5f95];
      let i = 0;
      for (const px of spread(5, dw - 5)) for (const pz of [3.2, 7.6]) {
        if (Math.abs(px) < 1.5) continue;
        if (!put(k, i % 3 === 0 ? 'patio_table_umbrella' : 'patio_table_umbrella_open', px, y0, pz, i * 0.7, { solid: 0.9 })) k.cyl(px, y0, pz, 0.6, 0.6, 0.75, 8, cols[i % 4]);
        for (const a of [0.4, 2.0, 3.6, 5.2]) put(k, 'patio_chair', px + Math.cos(a + i) * 1.15, y0, pz + Math.sin(a + i) * 1.15, PI / 2 - (a + i), { solid: false });
        i++;
      }
      // festoon lights from the eaves out to tall posts on the deck edge
      for (const px of spread(5, dw - 0.4)) {
        k.box(px, y0, dd - 0.05, 0.12, 3.4, 0.12, 0x6a5038, 'boards');
        const n = 12;
        const ya = H - 0.3;
        const yb = y0 + 3.3;
        for (let j = 0; j <= n; j++) {
          const t = j / n;
          k.box(px * (0.7 + 0.3 * t), ya + (yb - ya) * t - Math.sin(t * PI) * 0.55, 0.9 + t * (dd - 1), 0.1, 0.12, 0.1, [0xffd97a, 0xff9a6a, 0x9ad0ff, 0xfff3c8][j % 4], 'light', { cast: false });
        }
      }
      for (const px of [-hw + 0.8, hw - 0.8]) put(k, 'trash_can_street', px, y0, 0.8, 0);
      signBoard(c, 'fish.lake', 0, H + 1.5, 0.3, 9, 1.1, '#f1e9cf', [{ text: 'HERON POINT FISH HOUSE', font: F_OS, weight: '800', color: '#2f4f3f', y: 0.56, size: 0.56, maxW: 0.92 }], { frame: green, lamps: 4 });
    });
    // the land side (building's back): covered entry porch, sign, menu case, barrels and planters
    face(k, 'b', W, D, (len) => {
      const ex = 5;
      k.box(ex, 0, 1.3, 5, y0, 2.6, 0xa98a62, 'planks');
      addZone(k, ex, 1.3, 5, 2.7, y0);
      steps(k, ex, 2.6 + Math.round(y0 / 0.17) * 0.3, 3, y0, { color: 0xa98a62, mat: 'planks', rail: 0x6a5038 });
      k.roof(ex, H - 0.5, 1.4, 6, [[1.6, 0], [-1.4, 0.8]], 0x3f4a44, 'shingle', { eaveOH: 0.2, gableOH: 0.2 });
      for (const s of [-1, 1]) k.box(ex + s * 2.6, y0, 2.4, 0.2, H - y0 - 0.5, 0.2, 0x6a5038, 'boards');
      signBoard(c, 'fish.road', -3, 3.6, 0.12, 7.5, 0.9, '#f1e9cf', [{ text: 'HERON POINT FISH HOUSE', font: F_OS, weight: '800', color: '#2f4f3f', y: 0.56, size: 0.56, maxW: 0.92 }], { frame: green, lamps: 3 });
      for (const px of [-8, 0.6, 9.2]) {
        k.cyl(px, 0, 0.7, 0.42, 0.36, 0.8, 10, 0x7a5a3c, 'boards');
        k.cone(px, 0.8, 0.7, 0.5, 0.7, 7, 0x4f7a3f, 'paint');
      }
      services(k, -len / 2 + 1.0, H - 0.6);
      put(k, 'crate_wood_b', -len / 2 + 2.4, 0, 0.7, 0.2);
      put(k, 'bench_metal', -3, 0, 0.6, PI);
    });
  });
}

export const FASTFOOD: BuildingDef[] = [
  ...BRANDS.map((b): BuildingDef => ({ id: b.id, name: b.name, w: b.w, d: b.d, tags: ['fastfood', 'highway', 'cafe'], build: fastFood(b) })),
  { id: 'fishHouse', name: 'Heron Point Fish House', w: 20, d: 13, tags: ['cafe', 'restaurant'], build: fishHouse },
];

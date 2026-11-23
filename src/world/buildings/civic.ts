import * as THREE from 'three';
import { Ctx, windowAt, doorAt, flatRoof, rooftop, downspout, flagPole, storefront } from './common';
import { P } from '../palette';
import type { Kit, Col } from '../core/kit';
import { shell, room, addZone, furnishSheriff } from './interiors';

export function church(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  const w = 12;
  const d = 24;
  const H = 6.5;
  const white = 0xf4f2ec;
  const roof = 0x232a3d;
  c.occ.add(x, z + 0, w + 4, d + 6, ry, 2);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, white, 'siding');
    k.box(0, 0, 0, w + 0.1, 0.6, d + 0.1, 0x9b9893, 'concrete');
    k.at(0, 0, Math.PI / 2, () =>
      k.roof(0, H, 0, d, [[w / 2, 0], [0, 6.2], [-w / 2, 0]], roof, 'roofMetal', { trim: white, fill: white, fillMat: 'siding', ridge: roof, eaveOH: 0.5 }),
    );
    for (const s of [-1, 1])
      k.at((s * w) / 2, 0, (s * Math.PI) / 2, () => {
        for (let i = 0; i < 4; i++) windowAt(k, -7.5 + i * 5, 1.6, 0, 1.2, 3.1, { arch: white, mx: 2, my: 4, glass: 0x2b3a55 });
      });
    for (const [cx, cz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) k.box(cx, 0.6, cz, 0.3, H - 0.6, 0.3, white);
    // steeple
    const tz = d / 2 + 0.6;
    const T = 4.4;
    k.box(0, 0, tz, T, 14, T, white, 'siding');
    k.box(0, 0, tz, T + 0.1, 0.6, T + 0.1, 0x9b9893, 'concrete');
    k.box(0, 13.8, tz, T + 0.5, 0.4, T + 0.5, white);
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box((px * (T - 0.5)) / 2, 14.2, tz + (pz * (T - 0.5)) / 2, 0.5, 3.0, 0.5, white);
    k.box(0, 14.2, tz, T - 1.2, 2.6, T - 1.2, 0x1e2430);
    k.box(0, 17.2, tz, T + 0.5, 0.4, T + 0.5, white);
    k.add(new THREE.ConeGeometry(3.3, 13, 4), roof, 'roofMetal', k.local(0, 17.6 + 6.5, tz, { ry: Math.PI / 4 }));
    k.box(0, 30.9, tz, 0.12, 1.6, 0.12, 0xe8d38a, 'metal');
    k.box(0, 31.8, tz, 0.8, 0.12, 0.12, 0xe8d38a, 'metal');
    windowAt(k, 0, 9.0, tz + T / 2, 1.2, 2.2, { arch: white, mx: 2, my: 3, glass: 0x2b3a55 });
    doorAt(k, 0, 0.6, tz + T / 2, 2.0, 2.9, 0x6b3b2a, { double: true, frame: white });
    for (let i = 0; i < 3; i++) k.box(0, i * 0.2, tz + T / 2 + 0.6 + (2 - i) * 0.35, 3.4, 0.2, 0.8 + i * 0.0, P.concrete, 'concrete');
    // lawn sign
    for (const s of [-1, 1]) k.box(5 + s * 1.3, 0, d / 2 + 5.2, 0.2, 1.6, 0.2, white);
    k.sign(5, 1.35, d / 2 + 5.2, 3.0, 1.0, signs.get('church'), { back: white, thick: 0.15, twoSided: true });
  });
}

export function sheriffOffice(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs, rng } = c;
  const w = 26;
  const d = 13;
  const H = 7.0;
  const wall = 0xe3d48d;
  const zf = d / 2;
  c.occ.add(x, z + 1.5, w, d + 3, ry, 1.5, false);
  k.at(x, z, ry, () => {
    // ground floor: front office, squad room and two holding cells; the floor above stays solid
    const y0 = 0.52;
    const cols = [-10.5, -7, -3.5, 3.5, 7, 10.5];
    const { a, b } = shell(k, {
      w,
      d,
      y0,
      h: 3.1,
      wall,
      wallMat: 'siding',
      lining: 0xe6e2d2,
      floor: 0xcfc9b8,
      floorMat: 'concrete',
      frame: P.trimWhite,
      front: [{ x: 0, w: 1.9, h: 2.4, door: true }, ...cols.map((wx) => ({ x: wx, w: 1.3, y: 0.88, h: 1.6 }))],
      left: [-3, 3].map((wx) => ({ x: wx, w: 1.2, y: 0.88, h: 1.6 })),
    });
    room(k, y0, () => furnishSheriff(k, rng, a, b, 0));
    k.box(0, y0 + 3.1, 0, w, H + 0.5 - y0 - 3.1, d, wall, 'siding');
    addZone(k, 0, zf + 1.5, w - 0.6, 3.0, 0.5);
    addZone(k, 0, zf + 3.55, 4, 1.1, 0.5, 0);
    k.box(0, 0, 0, w + 0.1, 0.5, d + 0.1, 0x9b9893, 'concrete');
    k.roof(0, H + 0.5, 0, w, [[d / 2, 0], [0, 2.6], [-d / 2, 0]], P.roofNavy, 'roofMetal', { trim: P.trimWhite, fill: wall, fillMat: 'siding', ridge: P.roofNavy, eaveOH: 0.6 });
    for (const [cx, cz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) k.box(cx, 0.5, cz, 0.24, H, 0.24, P.trimWhite);
    k.box(0, 3.85, zf + 0.03, w, 0.16, 0.08, P.trimWhite);
    for (const wx of cols) {
      windowAt(k, wx, 1.4, zf, 1.3, 1.6, { mx: 2, my: 2, frame: P.trimWhite, open: true });
      windowAt(k, wx, 4.6, zf, 1.3, 1.5, { mx: 2, my: 2, frame: P.trimWhite, ac: rng.chance(0.25) });
    }
    windowAt(k, 0, 4.6, zf, 2.2, 1.5, { mx: 3, my: 2, frame: P.trimWhite });
    // long porch canopy
    k.box(0, 3.2, zf + 1.4, w - 1, 0.25, 2.8, 0x9ea4aa, 'roofMetal');
    k.box(0, 3.45, zf + 1.4, w - 0.9, 0.1, 2.9, 0x8a9096, 'metal');
    for (let i = 0; i <= 6; i++) k.box(-w / 2 + 1 + (i * (w - 2)) / 6, 0.5, zf + 2.6, 0.18, 2.7, 0.18, P.trimWhite);
    k.box(0, 0, zf + 1.5, w - 0.6, 0.5, 3.0, P.concrete, 'concrete');
    for (let i = 0; i < 3; i++) k.box(0, 0, zf + 3.1 + i * 0.35, 4, 0.5 - i * 0.16, 0.35, P.concrete, 'concrete');
    k.sign(0, 4.0, zf + 2.85, 7, 0.9, signs.get('sheriff'), { back: 0x3a3a3a, thick: 0.1, frame: 0.05 });
    for (const s of [-1, 1]) {
      k.box(s * 4.5, 0.5, zf + 3.0, 1.6, 0.6, 0.6, 0x4f7a3a);
      k.box(s * 8.5, 0.5, zf + 3.0, 1.6, 0.6, 0.6, 0x4f7a3a);
    }
    k.at(-w / 2, 0, -Math.PI / 2, () => {
      for (const wx of [-3, 3]) {
        windowAt(k, wx, 1.4, 0, 1.2, 1.6, { mx: 2, my: 2, frame: P.trimWhite, open: true });
        windowAt(k, wx, 4.6, 0, 1.2, 1.5, { mx: 2, my: 2, frame: P.trimWhite });
      }
    });
    k.at(0, -zf, Math.PI, () => doorAt(k, 6, 0.5, 0, 1.0, 2.2, 0x5b5f63));
    flagPole(k, signs, -6, zf + 7.5, 9);
    flagPole(k, signs, -3.4, zf + 7.5, 8);
  });
}

export function motel(c: Ctx, x: number, z: number, ry: number, rooms = 15) {
  const { kit: k, rng } = c;
  const uw = 4.4;
  const w = rooms * uw;
  const d = 9;
  const H = 3.4;
  const wall = 0x95663f;
  const zf = d / 2;
  c.occ.add(x, z + 1.2, w, d + 3, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0.25, 0, w, H, d, wall, 'boards');
    k.box(0, 0, 0, w + 0.1, 0.25, d + 0.1, 0x8f8c87, 'concrete');
    k.box(0, 0, zf + 1.3, w, 0.25, 2.6, P.concrete, 'concrete', { cast: false });
    k.roof(0, H + 0.25, 0, w, [[zf + 2.6, -0.35], [0, 1.9], [-zf, 0]], P.roofNavy, 'roofMetal', { trim: P.trimWhite, fill: wall, fillMat: 'boards', eaveOH: 0.3 });
    for (let i = 0; i <= rooms; i++) k.box(-w / 2 + 0.3 + i * ((w - 0.6) / rooms), 0.25, zf + 2.45, 0.18, H - 0.2, 0.18, P.trimWhite);
    const doors = [0x2f6b6a, 0xc47a2c, 0x7a3b2a, 0x3b4f7a];
    for (let i = 0; i < rooms; i++) {
      const rx = -w / 2 + uw * (i + 0.5);
      doorAt(k, rx - 1.0, 0.25, zf, 0.95, 2.15, doors[i % doors.length], { frame: P.trimWhite });
      windowAt(k, rx + 0.85, 1.2, zf, 1.5, 1.1, { glass: 0x4a4038, frame: P.trimWhite, mx: 2, my: 1 });
      k.box(rx + 0.85, 0.3, zf + 0.25, 0.8, 0.5, 0.5, 0xd9d6cc);
      k.box(rx - 1.0, 2.6, zf + 0.08, 0.18, 0.18, 0.12, 0xfff2cc, 'light');
      if (rng.chance(0.3)) k.box(rx + 2.0, 0.25, zf + 0.6, 0.7, 0.9, 0.7, 0x3a6ea5);
    }
    k.at(0, -zf, Math.PI, () => {
      for (let i = 0; i < rooms; i++) windowAt(k, -w / 2 + uw * (i + 0.5), 1.8, 0, 0.6, 0.5, { frame: P.trimWhite, my: 1 });
    });
  });
}

export function motelOffice(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  const w = 11;
  const d = 9;
  const H = 3.6;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0.25, 0, w, H, d, 0x95663f, 'boards');
    k.box(0, 0, 0, w + 0.1, 0.25, d + 0.1, 0x8f8c87, 'concrete');
    storefront(k, -w / 2 + 0.8, w / 2 - 0.8, 0.25, zf, 2.6, { frame: 0x2e2a27, doorX: 2.5 });
    k.roof(0, H + 0.25, 0, w, [[zf + 1.6, -0.2], [-zf, 1.2]], P.roofNavy, 'roofMetal', { trim: P.trimWhite });
    k.sign(0, H + 1.7, 0.6, 7, 1.75, signs.get('motelName'), { back: 0xf3e7c8, thick: 0.2, twoSided: true });
    for (const s of [-1, 1]) k.box(s * 2.4, H + 0.6, 0.6, 0.15, 0.8, 0.15, P.metalGrey, 'metal');
  });
}

export function motelPylon(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  c.occ.add(x, z, 2, 2, ry);
  k.at(x, z, ry, () => {
    k.cyl(0, 0, 0, 0.22, 0.26, 11, 10, 0x7a7e82, 'metal');
    k.box(0, 0, 0, 1.4, 0.6, 1.4, 0x8f8c87, 'concrete');
    k.sign(0, 8.0, 0.0, 1.5, 4.4, signs.get('motelV'), { back: 0xd22b2b, thick: 0.45, twoSided: true, frame: 0.08 });
    k.box(0.0, 10.25, 0, 1.8, 0.2, 0.6, 0xd22b2b);
    k.sign(0, 4.9, 0, 2.6, 0.65, signs.get('vacancy'), { back: 0x111111, thick: 0.3, twoSided: true });
    k.box(-1.0, 3.6, 0, 0.12, 4.6, 0.12, 0x7a7e82, 'metal');
  });
}

export function warehouse(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const w = 34;
  const d = 22;
  const H = 8.6;
  const zf = d / 2;
  c.occ.add(x, z, w, d, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, 0xf2f1ec, 'cinder');
    k.box(0, 0, 0, w + 0.08, 0.3, d + 0.08, 0x9b9893, 'concrete');
    for (const bx of [-11, -5.5]) {
      k.box(bx, 0, zf + 0.02, 4.2, 4.4, 0.1, 0xb9bcbf, 'rollup');
      k.box(bx, 4.4, zf + 0.05, 4.6, 0.6, 0.18, 0x9ea2a6, 'metal');
    }
    doorAt(k, 1.8, 0, zf, 1.1, 2.3, 0x3c6f6a);
    for (const wx of [5, 8.5, 12]) windowAt(k, wx, 2.2, zf, 1.0, 0.9, { frame: 0xa9acaf, glass: 0x29323b, my: 1, ac: wx === 8.5 });
    for (const wx of [-12, -8, -4, 0, 4, 8, 12]) windowAt(k, wx, 6.1, zf, 1.0, 1.0, { frame: 0xa9acaf, my: 1, mx: 1, ac: rng.chance(0.3) });
    // ladder
    for (const s of [-1, 1]) k.box(15 + s * 0.25, 0.4, zf + 0.35, 0.06, H + 0.8, 0.06, 0x8a8e92, 'metal');
    for (let i = 0; i < 26; i++) k.box(15, 0.6 + i * 0.35, zf + 0.35, 0.5, 0.04, 0.04, 0x8a8e92, 'metal');
    flatRoof(k, w, d, H, 0.8, 0xd8d6d0);
    rooftop(k, rng, w, d, H, 3);
    downspout(k, -w / 2 + 0.15, zf + 0.08, H);
    downspout(k, w / 2 - 0.15, zf + 0.08, H);
    k.at(-w / 2, 0, -Math.PI / 2, () => {
      for (const wx of [-6, 0, 6]) windowAt(k, wx, 6.1, 0, 1.0, 1.0, { frame: 0xa9acaf, my: 1 });
      doorAt(k, 3, 0, 0, 1.0, 2.2, 0x5b5f63);
    });
    // rooftop railing
    for (let i = 0; i <= 8; i++) k.box(-w / 2 + 4 + i * 1.6, H + 0.7, -zf + 0.6, 0.06, 1.0, 0.06, 0x6b6f73, 'metal');
    k.box(-w / 2 + 10.4, H + 1.65, -zf + 0.6, 12.8, 0.06, 0.06, 0x6b6f73, 'metal');
    waterTower(k, w / 2 - 6, -zf + 6, { legH: 7.5, base: H - 0.1, scale: 0.85 });
  });
}

/** Timber water tower (also used on the warehouse roof and at the farm). */
export function waterTower(k: Kit, x: number, z: number, o: { legH?: number; base?: number; scale?: number; tank?: Col } = {}) {
  const s = o.scale ?? 1;
  const lh = (o.legH ?? 10) * s;
  const by = o.base ?? 0;
  const half = 2.2 * s;
  const top = 1.5 * s;
  const wood = 0x7a5a40;
  const pts: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const at = (sx: number, sz: number, t: number) => ({ x: x + sx * (half + (top - half) * t), y: by + lh * t, z: z + sz * (half + (top - half) * t) });
  for (const [sx, sz] of pts) k.beam(at(sx, sz, 0), at(sx, sz, 1), 0.32 * s, 0.32 * s, wood);
  const levels = 3;
  for (let l = 0; l <= levels; l++) {
    const t = l / levels;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[(i + 1) % 4];
      k.beam(at(ax, az, t), at(bx, bz, t), 0.16 * s, 0.2 * s, wood);
      if (l < levels) {
        const t2 = (l + 1) / levels;
        k.beam(at(ax, az, t), at(bx, bz, t2), 0.12 * s, 0.12 * s, wood);
        k.beam(at(bx, bz, t), at(ax, az, t2), 0.12 * s, 0.12 * s, wood);
      }
    }
  }
  const py = by + lh;
  k.box(x, py, z, top * 2 + 1.2 * s, 0.25 * s, top * 2 + 1.2 * s, 0x8b6a4c, 'planks');
  const tr = 2.4 * s;
  const th = 3.4 * s;
  k.cyl(x, py + 0.25 * s, z, tr, tr, th, 14, o.tank ?? 0xc9cbcd, 'metal');
  for (let i = 1; i < 4; i++) k.cyl(x, py + 0.25 * s + (th * i) / 4, z, tr + 0.04, tr + 0.04, 0.08 * s, 14, 0x6e7276, 'metal');
  k.cone(x, py + 0.25 * s + th, z, tr + 0.2 * s, 1.5 * s, 14, 0x9fa3a6, 'metal');
  k.sphere(x, py + 0.25 * s + th + 1.55 * s, z, 0.18 * s, 0x6e7276, 'metal');
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.box(x + Math.cos(a) * (top + 0.5 * s), py + 0.25 * s, z + Math.sin(a) * (top + 0.5 * s), 0.06, 0.9 * s, 0.06, 0x5a4332);
  }
  for (const sx of [-0.22, 0.22]) k.box(x + sx * s, by, z + half + 0.15, 0.06, lh + th, 0.06, 0x6e7276, 'metal');
}

/** Farm windmill with an animated rotor. Returns the rotor group. */
export function windmill(c: Ctx, x: number, z: number, ry: number): THREE.Group {
  const { kit: k } = c;
  const H = 13;
  const col = 0x8f9397;
  c.occ.add(x, z, 4, 4, ry, 1);
  k.at(x, z, ry, () => {
    const at = (sx: number, sz: number, t: number) => ({ x: sx * (1.6 - 1.25 * t), y: H * t, z: sz * (1.6 - 1.25 * t) });
    const pts: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (const [sx, sz] of pts) k.beam(at(sx, sz, 0), at(sx, sz, 1), 0.12, 0.12, col, 'metal');
    for (let l = 0; l < 5; l++) {
      const t = l / 5;
      const t2 = (l + 1) / 5;
      for (let i = 0; i < 4; i++) {
        const [ax, az] = pts[i];
        const [bx, bz] = pts[(i + 1) % 4];
        k.beam(at(ax, az, t2), at(bx, bz, t2), 0.06, 0.06, col, 'metal');
        k.beam(at(ax, az, t), at(bx, bz, t2), 0.05, 0.05, col, 'metal');
      }
    }
    k.box(0, H, 0, 0.7, 0.6, 1.2, 0x6d7175, 'metal');
    k.beam({ x: 0, y: H + 0.3, z: -0.4 }, { x: 0, y: H + 0.4, z: -3.0 }, 0.08, 0.08, col, 'metal');
    k.box(0, H - 0.3, -3.2, 0.05, 1.4, 1.8, 0xd9d9d6);
  });
  const rotor = c.dyn('windmill-rotor', (r) => {
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      r.add(new THREE.BoxGeometry(0.42, 1.55, 0.04), 0xd5d6d3, 'metal', r.local(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0, { rz: a - Math.PI / 2 }));
    }
    r.torus(0, 0, 0, 2.0, 0.04, 4, 24, 0x8f9397, 'metal');
    r.torus(0, 0, 0, 0.7, 0.04, 4, 16, 0x8f9397, 'metal');
    r.cylZ(0, 0, 0, 0.18, 0.4, 8, 0x5b5f63, 'metal');
  });
  rotor.position.copy(k.toWorld(0, 0, 0)).add(new THREE.Vector3(0, H + 0.3, 0));
  const fwd = new THREE.Vector3(0, 0, 0.75).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
  rotor.position.x = x + fwd.x;
  rotor.position.z = z + fwd.z;
  rotor.rotation.y = ry;
  return rotor;
}

export function roadsideBillboard(c: Ctx, x: number, z: number, ry: number, sign: 'billboardCola' | 'billboardPark') {
  const { kit: k, signs } = c;
  c.occ.add(x, z, 12, 3, ry, 1);
  k.at(x, z, ry, () => {
    for (const px of [-3.5, 0, 3.5]) k.box(px, 0, -0.4, 0.35, 7.5, 0.35, 0x6b5340);
    k.sign(0, 7.2, 0, 11, 3.85, signs.get(sign), { back: 0xe9e9e9, thick: 0.25, frame: 0.12 });
    k.box(0, 5.05, 0.6, 11, 0.08, 1.0, 0x8a8e92, 'metal');
    for (const px of [-3.5, 0, 3.5]) {
      k.beam({ x: px, y: 5.1, z: 0.9 }, { x: px, y: 5.9, z: 1.5 }, 0.06, 0.06, 0x5b5f63, 'metal');
      k.box(px, 5.75, 1.45, 0.5, 0.2, 0.3, 0x5b5f63, 'metal');
    }
  });
}

export function welcomeSign(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs, rng } = c;
  c.occ.add(x, z, 8, 3, ry, 1);
  k.at(x, z, ry, () => {
    for (const s of [-1, 1]) {
      k.cyl(s * 3.0, 0, 0, 0.32, 0.36, 4.4, 8, 0x6e4b30);
      k.sphere(s * 3.0, 4.45, 0, 0.36, 0x6e4b30);
    }
    k.sign(0, 2.6, 0, 5.4, 2.5, signs.get('welcome'), { back: 0x4b3220, thick: 0.25, twoSided: true });
    for (let i = 0; i < 14; i++) {
      const sx = rng.range(-3.6, 3.6);
      const sz = rng.range(-1.2, 1.2);
      k.ico(sx, 0.25, sz, rng.range(0.35, 0.6), 0, 0x8b8a86, 'paint', 1, 0.6, 1);
    }
    for (let i = 0; i < 12; i++) k.ico(rng.range(-3, 3), 0.3, rng.range(0.6, 1.4), 0.28, 0, rng.pick([0xd94f70, 0xf2c94c, 0x9b59b6, 0xf4f1ea]));
  });
}

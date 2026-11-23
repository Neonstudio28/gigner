import * as THREE from 'three';
import { Ctx, windowAt, doorAt, chimney, downspout } from './common';
import { P } from '../palette';
import type { Col, Kit } from '../core/kit';
import { shell, room, addZone, furnishHouse } from './interiors';

export interface HouseOpts {
  color: Col;
  roof?: Col;
  shutters?: Col;
  porch?: 'portico' | 'full' | 'none';
  chimney?: 'brick' | 'white' | 'none';
  trim?: Col;
  wallMat?: string;
}

/** String of small bulbs hanging between two points. */
export function stringLights(k: Kit, ax: number, ay: number, az: number, bx: number, by: number, bz: number, n = 9) {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sag = Math.sin(t * Math.PI) * 0.35;
    k.sphere(ax + (bx - ax) * t, ay + (by - ay) * t - sag - 0.06, az + (bz - az) * t, 0.06, 0xfff1c9, 'light', 6, 4);
  }
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(k.toWorld(ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.35, az + (bz - az) * t));
  }
  k.tube(pts, 0.012, 0x222222, 'wire', 10, false);
}

function porchRail(k: Kit, x0: number, x1: number, y: number, z: number, color: Col) {
  k.box((x0 + x1) / 2, y + 0.85, z, x1 - x0, 0.08, 0.1, color);
  k.box((x0 + x1) / 2, y + 0.1, z, x1 - x0, 0.06, 0.08, color);
  const n = Math.max(1, Math.floor((x1 - x0) / 0.16));
  for (let i = 0; i <= n; i++) k.box(x0 + ((x1 - x0) * i) / n, y + 0.1, z, 0.04, 0.78, 0.04, color);
}

/** Two-storey colonial with gable roof, shutters and portico or full porch. */
export function colonial(c: Ctx, x: number, z: number, ry: number, o: HouseOpts) {
  const { kit: k } = c;
  const w = 10.5;
  const d = 8.5;
  const H = 5.9;
  const F = 0.6;
  const trim = o.trim ?? P.trimWhite;
  const roof = o.roof ?? P.roofDark;
  const mat = o.wallMat ?? 'siding';
  const zf = d / 2;
  c.occ.add(x, z + 1, w + 2, d + 4, ry, 1);
  k.at(x, z, ry, () => {
    k.box(0, F, 0, w, H, d, o.color, mat);
    k.box(0, 0, 0, w + 0.1, F, d + 0.1, 0x9b9893, 'concrete');
    for (const [cx, cz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) k.box(cx, F, cz, 0.2, H, 0.2, trim);
    k.box(0, F + H - 0.05, 0, w + 0.12, 0.25, d + 0.12, trim);
    k.roof(0, F + H, 0, w, [[d / 2, 0], [0, 2.9], [-d / 2, 0]], roof, 'roofMetal', { trim, fill: o.color, fillMat: mat, ridge: roof, eaveOH: 0.55, gableOH: 0.4 });
    const sh = o.shutters;
    for (const wx of [-3.4, 0, 3.4]) windowAt(k, wx, F + 3.55, zf, 1.0, 1.5, { mx: 2, my: 2, frame: trim, shutters: sh });
    for (const wx of [-3.4, 3.4]) windowAt(k, wx, F + 0.85, zf, 1.0, 1.6, { mx: 2, my: 2, frame: trim, shutters: sh });
    doorAt(k, 0, F, zf, 1.0, 2.15, 0x3d2f28, { frame: trim, glass: true });
    for (const s of [-1, 1])
      k.at((s * w) / 2, 0, (s * Math.PI) / 2, () => {
        for (const wx of [-1.8, 1.8]) {
          windowAt(k, wx, F + 0.85, 0, 0.9, 1.5, { mx: 2, my: 2, frame: trim });
          windowAt(k, wx, F + 3.55, 0, 0.9, 1.4, { mx: 2, my: 2, frame: trim });
        }
        windowAt(k, 0, F + H + 0.9, 0, 0.6, 0.8, { mx: 1, my: 1, frame: trim });
      });
    k.at(0, -zf, Math.PI, () => {
      for (const wx of [-3, 0, 3]) windowAt(k, wx, F + 3.55, 0, 1.0, 1.4, { mx: 2, my: 2, frame: trim });
      windowAt(k, -3, F + 0.9, 0, 1.4, 1.4, { mx: 2, my: 2, frame: trim });
      doorAt(k, 2, F, 0, 0.95, 2.1, 0x6b6f73, { frame: trim });
    });
    downspout(k, w / 2 - 0.05, zf + 0.12, F + H);
    downspout(k, -w / 2 + 0.05, zf + 0.12, F + H);
    const porch = o.porch ?? 'portico';
    if (porch === 'portico') {
      k.box(0, 0, zf + 1.0, 3.2, F, 2.0, P.concrete, 'concrete');
      for (let i = 0; i < 3; i++) k.box(0, 0, zf + 2.25 + i * 0.3, 1.8, F - i * 0.2, 0.3, P.concrete, 'concrete');
      for (const s of [-1, 1]) {
        k.box(s * 1.35, F, zf + 1.8, 0.2, 2.55, 0.2, trim);
        porchRail(k, s * 1.45 - (s > 0 ? 0 : 0), s * 1.45, F, zf + 1.8, trim);
      }
      k.at(0, zf + 1.05, Math.PI / 2, () => k.roof(0, F + 2.55, 0, 2.1, [[1.6, 0], [0, 0.95], [-1.6, 0]], roof, 'roofMetal', { trim, fill: trim, thick: 0.12, eaveOH: 0.2, gableOH: 0.1 }));
    } else if (porch === 'full') {
      k.box(0, 0, zf + 1.25, w, F, 2.5, P.woodLight, 'planks');
      for (let i = 0; i < 3; i++) k.box(0, 0, zf + 2.65 + i * 0.3, 1.8, F - i * 0.2, 0.3, P.concrete, 'concrete');
      const posts = [-w / 2 + 0.2, -w / 4, w / 4, w / 2 - 0.2];
      for (const px of posts) k.box(px, F, zf + 2.35, 0.2, 2.6, 0.2, trim);
      porchRail(k, -w / 2 + 0.3, -1.0, F, zf + 2.35, trim);
      porchRail(k, 1.0, w / 2 - 0.3, F, zf + 2.35, trim);
      k.roof(0, F + 2.6, zf + 1.2, w, [[1.45, -0.25], [-1.25, 0.2]], roof, 'roofMetal', { trim, thick: 0.12, eaveOH: 0.2, gableOH: 0.2 });
      k.box(0, F - 0.05, zf + 1.25, w + 0.05, 0.12, 2.55, trim);
    }
    if ((o.chimney ?? 'brick') !== 'none') {
      const brick = o.chimney === 'white';
      chimney(k, w / 2 + 0.45, 0, -1.2, F + H + 3.4, brick ? 0xf3f1ea : 0xffffff, brick ? 'brickPaint' : 'brickRed');
    }
  });
}

/** Single-storey ranch house with a long porch, metal roof, string lights and carport. */
export function ranch(c: Ctx, x: number, z: number, ry: number, o: HouseOpts & { carport?: boolean; flag?: boolean; lights?: boolean }) {
  const { kit: k, signs, rng } = c;
  const w = 14;
  const d = 9;
  const H = 3.2;
  const F = 0.5;
  const trim = o.trim ?? P.trimWhite;
  const roof = o.roof ?? P.roofNavy;
  const mat = o.wallMat ?? 'siding';
  const zf = d / 2;
  c.occ.add(x + (o.carport ? 2.5 : 0), z + 1.2, w + (o.carport ? 6 : 1), d + 4, ry, 1, false);
  k.at(x, z, ry, () => {
    // a real house: walk in through the front door
    const y0 = F + 0.02;
    const { a, b } = shell(k, {
      w,
      d,
      y0,
      h: H - 0.3,
      t: 0.22,
      wall: o.color,
      wallMat: mat,
      lining: 0xece6d8,
      frame: trim,
      lights: 7,
      front: [{ x: -1.6, w: 1.0, h: 2.15, door: true }, { x: -4.6, w: 1.3, y: 0.88, h: 1.5 }, { x: 2.2, w: 1.1, y: 0.88, h: 1.5 }, { x: 5.0, w: 1.1, y: 0.88, h: 1.5 }],
      left: [-1.8, 1.8].map((wz) => ({ x: wz, w: 1.0, y: 0.88, h: 1.3 })),
      right: [-1.8, 1.8].map((wz) => ({ x: wz, w: 1.0, y: 0.88, h: 1.3 })),
      back: [-3, 3].map((wx) => ({ x: wx, w: 1.2, y: 0.98, h: 1.2 })),
    });
    room(k, y0, () => furnishHouse(k, rng, a, b, -1.6));
    k.box(0, y0 + H - 0.3, 0, w, 0.28, d, o.color, mat);
    addZone(k, 0, zf + 1.3, w - 0.4, 2.6, F);
    k.box(0, 0, 0, w + 0.1, F, d + 0.1, 0x9b9893, 'concrete');
    for (const [cx, cz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) k.box(cx, F, cz, 0.2, H, 0.2, trim);
    k.roof(0, F + H, 0, w, [[zf + 2.6, -0.55], [0, 2.3], [-zf, 0]], roof, 'roofMetal', { trim, fill: o.color, fillMat: mat, ridge: roof, eaveOH: 0.35 });
    k.box(0, 0, zf + 1.3, w - 0.4, F, 2.6, P.concrete, 'concrete');
    for (let i = 0; i < 2; i++) k.box(-1.6, 0, zf + 2.75 + i * 0.3, 1.6, F - i * 0.22, 0.3, P.concrete, 'concrete');
    const posts = [-w / 2 + 0.3, -w / 6, w / 6, w / 2 - 0.3];
    for (const px of posts) k.box(px, F, zf + 2.4, 0.22, H - 0.5, 0.22, 0x5d6168);
    windowAt(k, -4.6, F + 0.9, zf, 1.3, 1.5, { mx: 2, my: 2, frame: trim, shutters: o.shutters ?? 0x3b4048, open: true });
    windowAt(k, 2.2, F + 0.9, zf, 1.1, 1.5, { mx: 2, my: 2, frame: trim, shutters: o.shutters ?? 0x3b4048, open: true });
    windowAt(k, 5.0, F + 0.9, zf, 1.1, 1.5, { mx: 2, my: 2, frame: trim, shutters: o.shutters ?? 0x3b4048, open: true });
    if (o.lights !== false) {
      for (let i = 0; i < posts.length - 1; i++) stringLights(k, posts[i], F + H - 0.7, zf + 2.4, posts[i + 1], F + H - 0.7, zf + 2.4, 7);
    }
    if (o.flag) {
      k.beam({ x: w / 2 - 0.3, y: F + 1.9, z: zf + 2.55 }, { x: w / 2 + 0.6, y: F + 3.0, z: zf + 2.9 }, 0.04, 0.04, 0xd8d8d8, 'metal');
      k.sign(w / 2 + 0.45, F + 2.45, zf + 2.85, 0.9, 0.5, signs.get('flag'), { ry: Math.PI / 2 - 0.4, thick: 0.01, twoSided: true });
    }
    for (const s of [-1, 1])
      k.at((s * w) / 2, 0, (s * Math.PI) / 2, () => {
        windowAt(k, -1.8, F + 0.9, 0, 1.0, 1.3, { mx: 2, my: 2, frame: trim, open: true });
        windowAt(k, 1.8, F + 0.9, 0, 1.0, 1.3, { mx: 2, my: 2, frame: trim, open: true });
        windowAt(k, 0, -0.05, 0, 0.6, 0.35, { mx: 1, my: 1, frame: 0x9b9893 });
      });
    k.at(0, -zf, Math.PI, () => {
      windowAt(k, -3, F + 1.0, 0, 1.2, 1.2, { frame: trim, open: true });
      windowAt(k, 3, F + 1.0, 0, 1.2, 1.2, { frame: trim, open: true });
    });
    chimney(k, -3.5, F + H, -1.0, 3.2, 0xf3f1ea, 'brickPaint');
    downspout(k, w / 2 + 0.05, zf + 0.1, F + H);
    if (o.carport) {
      const cx = w / 2 + 2.6;
      for (const px of [cx - 2.2, cx + 2.2]) for (const pz of [-3, 3.6]) k.box(px, 0, pz, 0.22, 2.7, 0.22, 0x6b5340);
      k.box(cx, 2.7, 0.3, 5.0, 0.25, 7.6, 0x6b5340);
      for (const pz of [-3, 3.6]) k.beam({ x: cx - 2.2, y: 2.0, z: pz }, { x: cx - 1.2, y: 2.7, z: pz }, 0.12, 0.12, 0x6b5340);
      k.roof(cx, 2.95, 0.3, 5.0, [[4.2, -0.2], [-4.2, 0.2]], roof, 'roofMetal', { thick: 0.1, eaveOH: 0.1, gableOH: 0.15 });
      k.box(cx, 0, 0.3, 4.8, 0.06, 8, P.concrete, 'concrete', { cast: false });
    }
  });
}

/** Steep A-frame cabin with a glazed gable and deck — very Pacific Northwest. */
export function aframeCabin(c: Ctx, x: number, z: number, ry: number, color: Col = 0x8b5e3c) {
  const { kit: k } = c;
  const w = 7.5;
  const d = 10;
  const zf = d / 2;
  c.occ.add(x, z + 1, w + 1, d + 4, ry, 1);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w + 0.2, 0.6, d, 0x8f8c87, 'concrete');
    k.at(0, 0, Math.PI / 2, () =>
      k.roof(0, 0.6, 0, d, [[w / 2 + 0.2, 0], [0, 7.6], [-w / 2 - 0.2, 0]], 0x3c4a3e, 'shingle', { trim: 0xe9dcc0, fill: color, fillMat: 'boards', thick: 0.25, eaveOH: 0.3, gableOH: 0.5, ridge: 0x2f3a30 }),
    );
    // glazed gable
    for (let i = 0; i < 3; i++) {
      const y = 1.0 + i * 1.9;
      const half = (w / 2) * (1 - (y + 1.6 - 0.6) / 7.6) - 0.5;
      if (half > 0.4) k.pane(0, y, zf + 0.062, half * 2, 1.6, 'home', 0.9);
    }
    for (const s of [-1, 1]) k.box(s * 0.6, 0.6, zf + 0.06, 0.1, 5.4, 0.08, 0xe9dcc0);
    doorAt(k, 0, 0.6, zf + 0.05, 1.0, 2.1, 0x5a3a26, { frame: 0xe9dcc0, glass: true });
    k.box(0, 0, zf + 1.6, w + 1, 0.6, 3.2, 0x9a7a58, 'planks');
    porchRail(k, -w / 2 - 0.4, -0.8, 0.6, zf + 3.1, 0x6e4b30);
    porchRail(k, 0.8, w / 2 + 0.4, 0.6, zf + 3.1, 0x6e4b30);
    chimney(k, 1.6, 4, -2, 4.4, 0x8b8a86, 'cinder');
  });
}

/** Red gambrel barn with lean-to shed, X-braced doors and cupola. Gable end faces +Z. */
export function barn(c: Ctx, x: number, z: number, ry: number, o: { shed?: boolean; color?: Col } = {}) {
  const { kit: k } = c;
  const w = 13;
  const d = 20;
  const H = 5.6;
  const red = o.color ?? P.barnRed;
  const white = P.trimWhite;
  const zf = d / 2;
  c.occ.add(x + (o.shed ? -2.5 : 0), z, w + (o.shed ? 7 : 1), d + 1, ry, 1.5);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, red, 'boards');
    k.box(0, 0, 0, w + 0.1, 0.35, d + 0.1, 0x8f8c87, 'concrete');
    k.at(0, 0, Math.PI / 2, () =>
      k.roof(0, H, 0, d, [[w / 2, 0], [w / 2 - 1.7, 3.3], [0, 5.0], [-w / 2 + 1.7, 3.3], [-w / 2, 0]], P.roofDark, 'roofMetal', {
        trim: white,
        fill: red,
        fillMat: 'boards',
        ridge: P.roofDark,
        eaveOH: 0.6,
        gableOH: 0.45,
      }),
    );
    for (const [cx, cz] of [[-w / 2, -zf], [w / 2, -zf], [-w / 2, zf], [w / 2, zf]]) k.box(cx, 0.35, cz, 0.25, H - 0.35, 0.25, white);
    for (const s of [1, -1]) {
      const fz = s * (zf + 0.04);
      k.at(0, fz, s > 0 ? 0 : Math.PI, () => {
        k.box(0, 0.35, 0.02, 4.6, 4.2, 0.08, red, 'boards');
        k.box(0, 4.5, 0.06, 5.0, 0.2, 0.12, white);
        for (const px of [-2.4, 0, 2.4]) k.box(px, 0.35, 0.06, 0.2, 4.2, 0.12, white);
        for (const sx of [-1, 1]) {
          const cx = sx * 1.2;
          k.beam({ x: cx - 1.1, y: 0.5, z: 0.1 }, { x: cx + 1.1, y: 4.4, z: 0.1 }, 0.16, 0.08, white);
          k.beam({ x: cx + 1.1, y: 0.5, z: 0.1 }, { x: cx - 1.1, y: 4.4, z: 0.1 }, 0.16, 0.08, white);
        }
        k.box(0, H + 1.0, 0.04, 1.8, 1.8, 0.08, red, 'boards');
        k.box(0, H + 2.8, 0.06, 2.0, 0.16, 0.12, white);
        k.box(0, H + 0.9, 0.06, 2.0, 0.16, 0.12, white);
        for (const sx of [-1, 1]) k.box(sx * 0.95, H + 0.9, 0.06, 0.16, 2.0, 0.12, white);
        for (const sx of [-1, 1]) windowAt(k, sx * 4.4, 3.0, 0, 0.8, 0.8, { frame: white, mx: 2, my: 2 });
      });
    }
    for (const s of [-1, 1])
      k.at((s * w) / 2, 0, (s * Math.PI) / 2, () => {
        for (const wx of [-6, 0, 6]) windowAt(k, wx, 2.6, 0, 0.9, 0.9, { frame: white, mx: 2, my: 2 });
      });
    k.box(0, H + 5.0, 0, 1.6, 1.3, 1.6, white);
    for (const s2 of [-1, 1]) k.box(s2 * 0.81, H + 5.3, 0, 0.04, 0.7, 1.0, 0x2a2a2a);
    k.add(new THREE.ConeGeometry(1.4, 1.1, 4), P.roofDark, 'roofMetal', k.local(0, H + 6.3 + 0.55, 0, { ry: Math.PI / 4 }));
    k.box(0, H + 6.85, 0, 0.05, 0.9, 0.05, 0x3a3a3a, 'metal');
    k.box(0, H + 7.45, 0, 0.7, 0.05, 0.05, 0x3a3a3a, 'metal');
    if (o.shed) {
      const sx = -w / 2 - 2.8;
      for (const pz of [-zf + 0.6, -zf / 3, zf / 3, zf - 0.6]) k.box(sx - 2.6, 0, pz, 0.25, 2.7, 0.25, P.woodDark);
      k.at(sx, 0, Math.PI / 2, () => k.roof(0, 0, 0, d - 1, [[-2.9, 2.75], [2.9, 3.9]], P.roofDark, 'roofMetal', { thick: 0.14, eaveOH: 0.3, gableOH: 0.1, trim: white }));
      k.box(sx, 0, 0, 5.6, 0.04, d - 1, 0x8d6e4c, 'paint', { cast: false });
      for (let i = 0; i < 6; i++) k.box(sx + (i % 2) * 1.3 - 1, (i % 3 === 2 ? 0.8 : 0), -5 + Math.floor(i / 2) * 1.2, 1.2, 0.8, 0.9, 0xd8b75a, 'paint');
      for (let i = 0; i < 3; i++) k.cyl(sx + 1.5, 0, 4 + i * 0.75, 0.32, 0.32, 0.95, 10, 0x2f7a5a);
    }
  });
}

export function farmhouse(c: Ctx, x: number, z: number, ry: number) {
  ranch(c, x, z, ry, { color: P.barnRed, wallMat: 'boards', roof: P.roofNavy, shutters: 0xf2efe8, lights: true, carport: false });
}

/** Single-wide sales office on blocks (used-car lot). */
export function salesOffice(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, signs } = c;
  const w = 12;
  const d = 4.4;
  c.occ.add(x, z, w + 1, d + 3, ry, 1);
  k.at(x, z, ry, () => {
    k.box(0, 0.7, 0, w, 2.7, d, 0xf1efe8, 'siding');
    k.box(0, 0, 0, w - 0.2, 0.7, d - 0.2, 0x8f8c87, 'concrete');
    k.box(0, 3.4, 0, w + 0.3, 0.2, d + 0.3, 0xd9d6cf, 'metal');
    k.box(0, 1.9, d / 2 + 0.02, w, 0.18, 0.04, 0x1d3c7a);
    for (const wx of [-4, 3.5]) windowAt(k, wx, 1.6, d / 2, 1.6, 1.0, { frame: 0xd9d6cf, mx: 2, my: 1 });
    doorAt(k, 0, 0.7, d / 2, 0.95, 2.0, 0x7b8a99, { frame: 0xd9d6cf });
    k.box(0, 0, d / 2 + 0.7, 2.0, 0.7, 1.3, P.woodLight, 'planks');
    k.sign(0, 4.4, 0, 6.5, 1.6, signs.get('usedcars'), { back: 0x1d3c7a, thick: 0.18, twoSided: true });
    for (const s of [-1, 1]) k.box(s * 2.4, 3.5, 0, 0.12, 0.8, 0.12, 0x8a8e92, 'metal');
  });
}

/** Detached garden shed / garage. */
export function shed(c: Ctx, x: number, z: number, ry: number, color: Col, big = false) {
  const { kit: k } = c;
  const w = big ? 6.5 : 3.2;
  const d = big ? 7 : 2.6;
  const H = big ? 3.0 : 2.2;
  c.occ.add(x, z, w, d, ry, 0.6);
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, w, H, d, color, big ? 'siding' : 'boards');
    k.roof(0, H, 0, w, [[d / 2, 0], [0, big ? 1.6 : 0.9], [-d / 2, 0]], P.roofDark, 'roofMetal', { trim: P.trimWhite, fill: color, fillMat: big ? 'siding' : 'boards', thick: 0.12, eaveOH: 0.25, gableOH: 0.2 });
    if (big) k.box(0, 0, d / 2 + 0.03, w - 1.2, 2.4, 0.08, 0xe9e8e4, 'rollup');
    else doorAt(k, 0, 0, d / 2, 1.2, 1.9, color, { frame: P.trimWhite });
  });
}

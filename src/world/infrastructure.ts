import * as THREE from 'three';
import type { Ctx } from './buildings/common';
import type { Kit, Col } from './core/kit';
import { farHeight } from './terrain';
import { securityFence, acornLamp } from './props';
import { windowAt, doorAt } from './buildings/common';
import { P } from './palette';
import { lerp } from './core/rng';

const STEEL = 0x9aa0a6;

/** Steel lattice transmission tower; cross-arms run along local X. Returns 7 conductor/earth points. */
export function pylon(k: Kit, x: number, y: number, z: number, ry: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const H0 = 25;
  const H1 = 36;
  const b0 = 4.2;
  const b1 = 1.35;
  const b2 = 0.9;
  const half = (h: number) => (h <= H0 ? lerp(b0, b1, h / H0) : lerp(b1, b2, (h - H0) / (H1 - H0)));
  const levels = [0, 5, 9.5, 13.5, 17, 20, 22.7, 25, 28.5, 32, 36];
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const P3 = (sx: number, sz: number, h: number) => ({ x: sx * half(h), y: h, z: sz * half(h) });
  k.at(
    x,
    z,
    ry,
    () => {
      k.solid(0, 0, b0 * 2 + 0.8, b0 * 2 + 0.8);
      for (const [sx, sz] of corners) k.box(sx * b0, -1.2, sz * b0, 1.0, 1.5, 1.0, 0x9a9690, 'concrete');
      for (let l = 0; l < levels.length - 1; l++) {
        const h0 = levels[l];
        const h1 = levels[l + 1];
        for (let i = 0; i < 4; i++) {
          const [ax, az] = corners[i];
          const [bx, bz] = corners[(i + 1) % 4];
          k.beam(P3(ax, az, h0), P3(ax, az, h1), 0.2, 0.2, STEEL, 'metal');
          k.beam(P3(ax, az, h1), P3(bx, bz, h1), 0.09, 0.09, STEEL, 'metal');
          k.beam(P3(ax, az, h0), P3(bx, bz, h1), 0.07, 0.07, STEEL, 'metal', false);
          k.beam(P3(bx, bz, h0), P3(ax, az, h1), 0.07, 0.07, STEEL, 'metal', false);
        }
      }
      const arms: [number, number][] = [
        [26, 8.5],
        [30.5, 7],
        [35, 5.6],
      ];
      for (const [ay, span] of arms)
        for (const s of [-1, 1]) {
          const hb = half(ay);
          k.beam({ x: s * hb, y: ay, z: -hb }, { x: s * span, y: ay, z: 0 }, 0.1, 0.1, STEEL, 'metal');
          k.beam({ x: s * hb, y: ay, z: hb }, { x: s * span, y: ay, z: 0 }, 0.1, 0.1, STEEL, 'metal');
          k.beam({ x: s * hb, y: ay + 1.6, z: 0 }, { x: s * span, y: ay + 0.1, z: 0 }, 0.1, 0.1, STEEL, 'metal');
          for (let i = 1; i < 4; i++) {
            const t = i / 4;
            const px = s * lerp(hb, span, t);
            k.beam({ x: px, y: ay, z: 0 }, { x: px, y: ay + lerp(1.6, 0.1, t), z: 0 }, 0.05, 0.05, STEEL, 'metal', false);
          }
          for (let i = 0; i < 7; i++) k.cyl(s * span, ay - 0.35 - i * 0.32, 0, 0.2, 0.2, 0.08, 8, 0x7a8f9a, 'glass', { cast: false });
          k.cyl(s * span, ay - 2.6, 0, 0.03, 0.03, 2.6, 4, 0x6c7175, 'metal', { cast: false });
          out.push(k.toWorld(s * span, ay - 2.6, 0));
        }
      const top = H1;
      for (const [sx, sz] of corners) k.beam(P3(sx, sz, top), { x: 0, y: top + 4, z: 0 }, 0.09, 0.09, STEEL, 'metal');
      out.push(k.toWorld(0, top + 4, 0));
      k.box(0, 3.0, half(3) + 0.05, 0.6, 0.45, 0.02, 0xc8102e, 'paint', { cast: false });
    },
    y,
  );
  return out;
}

/** High-voltage conductor with a parabolic sag. */
function hvWire(k: Kit, a: THREE.Vector3, b: THREE.Vector3, sag: number, r = 0.045) {
  const pts: THREE.Vector3[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  k.tube(pts, r, 0x2b2d30, 'wire', 36, false);
}

/**
 * Places pylons along a polyline (spans ≤ maxSpan), strings the conductors and clears a
 * right-of-way through the forest. Returns the first and last attachment sets.
 */
export function transmissionLine(c: Ctx, way: [number, number][], maxSpan = 240) {
  const { kit: k } = c;
  const towers: [number, number][] = [];
  for (let i = 0; i < way.length - 1; i++) {
    const [ax, az] = way[i];
    const [bx, bz] = way[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / maxSpan));
    for (let j = 0; j < n; j++) towers.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n]);
  }
  towers.push(way[way.length - 1]);
  const sets: THREE.Vector3[][] = [];
  towers.forEach(([x, z], i) => {
    const prev = towers[Math.max(0, i - 1)];
    const next = towers[Math.min(towers.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    // cross-arms perpendicular to the line direction
    const px = -dz;
    const pz = dx;
    const ry = Math.atan2(-pz, px);
    sets.push(pylon(k, x, farHeight(x, z), z, ry));
  });
  for (let i = 0; i < towers.length - 1; i++) {
    const [ax, az] = towers[i];
    const [bx, bz] = towers[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    c.occ.add((ax + bx) / 2, (az + bz) / 2, len, 30, Math.atan2(-(bz - az), bx - ax), 0, false);
    for (let j = 0; j < 7; j++) hvWire(k, sets[i][j], sets[i + 1][j], len * (j === 6 ? 0.022 : 0.03), j === 6 ? 0.03 : 0.045);
  }
  return { first: sets[0], last: sets[sets.length - 1], towers };
}

/** Fenced electrical substation with gantries, transformers and a control house. Returns gantry points. */
export function substation(c: Ctx, x: number, z: number, y: number) {
  const { kit: k, signs } = c;
  const W = 44;
  const D = 34;
  const west: THREE.Vector3[] = [];
  const east: THREE.Vector3[] = [];
  c.occ.add(x, z, W + 4, D + 4, 0, 2, false);
  k.at(
    x,
    z,
    0,
    () => {
      k.plane(0, 0.03, 0, W, D, 0xb9b4aa, 'gravel');
      securityFence(k, [
        [-W / 2, -D / 2],
        [W / 2, -D / 2],
        [W / 2, -3],
      ]);
      securityFence(k, [
        [W / 2, 3],
        [W / 2, D / 2],
        [-W / 2, D / 2],
        [-W / 2, -D / 2],
      ]);
      for (const s of [-3, 3]) k.box(W / 2, 0, s, 0.2, 2.6, 0.2, 0x7a7e82, 'metal');
      k.sign(W / 2 + 0.15, 2.9, 0, 5.2, 0.95, signs.get('substation'), { ry: Math.PI / 2, back: 0xf4f1ea, thick: 0.06 });
      for (const [sx, sz, r] of [[W / 2 + 0.1, -9, Math.PI / 2], [W / 2 + 0.1, 9, Math.PI / 2], [0, D / 2 + 0.1, 0], [0, -D / 2 - 0.1, Math.PI]] as const)
        k.sign(sx, 1.4, sz, 0.75, 0.5, signs.get('highVoltage'), { ry: r, thick: 0.02 });
      // gantries (beam along Z) at both ends
      for (const gx of [-16, 16]) {
        for (const gz of [-9, 9]) {
          k.box(gx, 0, gz, 0.6, 12, 0.6, STEEL, 'metal');
          k.solid(gx, gz, 0.8, 0.8);
        }
        k.box(gx, 11.4, 0, 0.6, 0.6, 18.6, STEEL, 'metal');
        for (let i = 0; i < 6; i++) k.beam({ x: gx, y: 2 * i, z: -9 }, { x: gx, y: 2 * i + 2, z: -9.3 }, 0.05, 0.05, STEEL, 'metal', false);
        for (const pz of [-5, 0, 5]) {
          for (let i = 0; i < 6; i++) k.cyl(gx, 10.9 - i * 0.3, pz, 0.18, 0.18, 0.08, 8, 0x7a8f9a, 'glass', { cast: false });
          (gx < 0 ? west : east).push(k.toWorld(gx, 9.0, pz));
          k.beam({ x: gx, y: 9.0, z: pz }, { x: gx * 0.45, y: 6.5, z: pz }, 0.06, 0.06, 0xb87333, 'metal');
        }
      }
      // busbar & transformers
      for (const pz of [-5, 0, 5]) k.beam({ x: -7, y: 6.5, z: pz }, { x: 7, y: 6.5, z: pz }, 0.1, 0.1, 0xb87333, 'metal');
      for (const tz of [-6, 6]) {
        k.solid(-2, tz, 5, 4);
        k.box(-2, 0, tz, 4.2, 0.4, 3.4, 0x9a9690, 'concrete');
        k.box(-2, 0.4, tz, 3.6, 3.0, 2.6, 0x7d8a86, 'metal');
        for (let i = 0; i < 8; i++) for (const s of [-1, 1]) k.box(-3.6 + i * 0.45, 0.6, tz + s * 1.45, 0.08, 2.4, 0.4, 0x6f7b77, 'metal');
        k.cylX(-2, 3.9, tz - 0.6, 0.45, 2.2, 10, 0x7d8a86, 'metal');
        for (let i = 0; i < 3; i++) {
          k.cyl(-3.0 + i, 3.4, tz + 0.5, 0.16, 0.22, 1.6, 8, 0x8a4a2a, 'gloss');
          k.beam({ x: -3.0 + i, y: 5.0, z: tz + 0.5 }, { x: -3.0 + i, y: 6.5, z: (i - 1) * 5 }, 0.05, 0.05, 0xb87333, 'metal', false);
        }
      }
      for (let i = 0; i < 3; i++) {
        k.solid(8, -5 + i * 5, 1.6, 1.6);
        k.box(8, 0, -5 + i * 5, 0.3, 3.0, 0.3, STEEL, 'metal');
        k.cylX(8, 3.4, -5 + i * 5, 0.45, 1.5, 10, 0xb9bcbf, 'metal');
        k.cyl(8.4, 3.8, -5 + i * 5, 0.12, 0.16, 1.4, 8, 0x8a4a2a, 'gloss');
      }
      // control house
      k.solid(12, 12, 9, 6);
      k.box(12, 0, 12, 8.4, 3.2, 5.4, 0xf0efea, 'cinder');
      k.box(12, 3.2, 12, 8.8, 0.25, 5.8, 0x7a7e82, 'metal');
      k.at(12, 12 - 2.7, Math.PI, () => {
        doorAt(k, 2, 0, 0, 1.0, 2.2, 0x5b5f63);
        windowAt(k, -1.5, 1.2, 0, 1.2, 0.9, { frame: 0x9ea2a6, my: 1 });
      });
      k.box(16.4, 1.6, 12, 0.6, 0.6, 0.9, 0xd9d6cc);
      acornLamp(k, -20, 15, 6);
    },
    y,
  );
  return { west, east };
}

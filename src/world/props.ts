import * as THREE from 'three';
import type { Kit, Col } from './core/kit';
import type { Rng } from './core/rng';
import type { SignBook, SignId } from './signs';
import { P } from './palette';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Wooden utility pole; crossarm runs along local X. Returns world attachment points for wires. */
export function utilityPole(k: Kit, x: number, z: number, ry: number, o: { h?: number; transformer?: boolean; lamp?: boolean } = {}): THREE.Vector3[] {
  const h = o.h ?? 10.5;
  const out: THREE.Vector3[] = [];
  k.at(x, z, ry, () => {
    k.cyl(0, 0, 0, 0.13, 0.17, h, 7, P.woodPole);
    k.box(0, h - 0.75, 0, 2.6, 0.14, 0.14, P.woodDark);
    k.beam(V(-0.9, h - 1.35, 0), V(0, h - 0.82, 0), 0.06, 0.06, 0x555555, 'metal');
    k.beam(V(0.9, h - 1.35, 0), V(0, h - 0.82, 0), 0.06, 0.06, 0x555555, 'metal');
    for (const ix of [-1.15, -0.4, 1.15]) {
      k.cyl(ix, h - 0.68, 0, 0.05, 0.07, 0.22, 6, 0x6f8a7a, 'glass');
      out.push(k.toWorld(ix, h - 0.48, 0));
    }
    k.box(0, h - 2.6, 0, 0.9, 0.1, 0.1, P.woodDark);
    out.push(k.toWorld(0.35, h - 2.55, 0));
    if (o.transformer) {
      k.cyl(0.32, h - 2.2, 0, 0.3, 0.3, 1.0, 10, 0x8c9195, 'metal');
      k.cyl(0.32, h - 1.2, 0, 0.32, 0.3, 0.08, 10, 0x6c7175, 'metal');
    }
    if (o.lamp) {
      k.beam(V(0, h - 3.2, 0), V(0, h - 3.0, 2.0), 0.08, 0.08, 0x8a8e92, 'metal');
      k.box(0, h - 3.2, 2.15, 0.35, 0.18, 0.7, 0x8a8e92, 'metal');
      k.box(0, h - 3.24, 2.15, 0.26, 0.04, 0.5, 0xfff3d6, 'light', { cast: false });
    }
  });
  return out;
}

/** Sagging cable between two world points. */
export function wire(k: Kit, a: THREE.Vector3, b: THREE.Vector3, sagFactor = 0.032, r = 0.022) {
  const len = a.distanceTo(b);
  if (len < 0.5) return;
  const sag = Math.min(2.4, len * sagFactor);
  const pts: THREE.Vector3[] = [];
  const n = Math.max(4, Math.min(14, Math.round(len / 4)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  k.tube(pts, r, 0x1d1d1f, 'wire', n * 2, false);
}

export function connectPoles(k: Kit, poles: THREE.Vector3[][]) {
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i];
    const b = poles[i + 1];
    if (a[0].distanceTo(b[0]) > 70) continue;
    for (let j = 0; j < Math.min(a.length, b.length); j++) wire(k, a[j], b[j], j === 3 ? 0.04 : 0.03);
  }
}

/** Cobra-head street light; arm reaches along local +Z. */
export function streetLight(k: Kit, x: number, z: number, ry: number, h = 8.5) {
  k.at(x, z, ry, () => {
    k.cyl(0, 0, 0, 0.1, 0.16, h, 8, 0x9a9ea2, 'metal');
    k.cyl(0, 0, 0, 0.24, 0.26, 0.5, 8, 0x8a8e92, 'metal');
    const pts = [V(0, h - 0.6, 0), V(0, h + 0.15, 0.6), V(0, h + 0.35, 1.6), V(0, h + 0.3, 2.6)].map((p) => k.toWorld(p.x, p.y, p.z));
    k.tube(pts, 0.06, 0x9a9ea2, 'metal', 8);
    k.boxC(0, h + 0.22, 2.95, 0.45, 0.2, 0.95, 0xb5b9bd, 'metal');
    k.boxC(0, h + 0.1, 2.98, 0.34, 0.04, 0.7, 0xfff3d6, 'light', { cast: false });
  });
}

/** Traffic signal pole with a mast arm along local +Z and three signal heads. */
export function trafficSignal(k: Kit, x: number, z: number, ry: number, arm = 7, phase: 'red' | 'green' = 'red') {
  k.at(x, z, ry, () => {
    k.cyl(0, 0, 0, 0.16, 0.2, 7.2, 10, 0x8c9094, 'metal');
    k.cyl(0, 0, 0, 0.3, 0.32, 0.4, 10, 0x7a7e82, 'metal');
    k.beam(V(0, 6.6, 0), V(0, 6.9, arm), 0.14, 0.14, 0x8c9094, 'metal');
    k.beam(V(0, 5.6, 0), V(0, 6.65, arm * 0.45), 0.07, 0.07, 0x8c9094, 'metal');
    const heads = [arm * 0.55, arm * 0.95];
    for (const hz of heads) signalHead(k, 0, 5.65, hz, phase);
    signalHead(k, 0.25, 2.6, 0.0, phase, Math.PI / 2);
    k.box(0.25, 1.2, 0.0, 0.25, 0.3, 0.2, 0x2b2b2b);
  });
}

function signalHead(k: Kit, x: number, y: number, z: number, phase: 'red' | 'green', ry = 0) {
  k.push(x, y, z, ry);
  k.box(0, 0, 0, 0.42, 1.2, 0.32, 0xd7b23a);
  k.box(0, -0.02, -0.17, 0.62, 1.32, 0.04, 0x1a1a1a);
  const cols: [number, string][] = [
    [0.95, phase === 'red' ? 'light' : 'paint'],
    [0.6, 'paint'],
    [0.25, phase === 'green' ? 'light' : 'paint'],
  ];
  const tint = [0xff3b2f, 0xffb52e, 0x4dff8a];
  cols.forEach(([yy, mat], i) => {
    k.cylZ(0, yy, 0.17, 0.12, 0.04, 10, mat === 'light' ? tint[i] : 0x2a2622, mat);
    k.box(0, yy + 0.08, 0.27, 0.32, 0.03, 0.18, 0x1a1a1a);
  });
  k.pop();
}

export function postSign(k: Kit, signs: SignBook, id: SignId, x: number, z: number, ry: number, o: { w?: number; h?: number; y?: number; rot45?: boolean } = {}) {
  const w = o.w ?? 0.75;
  const h = o.h ?? 0.75;
  const y = o.y ?? 2.3;
  k.at(x, z, ry, () => {
    k.box(0, 0, -0.04, 0.07, y + h * 0.4, 0.05, 0x9ea2a6, 'metal');
    k.sign(0, y, 0.0, w, h, signs.get(id), { thick: 0.02, back: 0x9ea2a6 });
  });
}

export function hydrant(k: Kit, x: number, z: number) {
  k.cyl(x, 0.16, z, 0.15, 0.17, 0.6, 8, P.hydrant);
  k.cyl(x, 0.76, z, 0.1, 0.16, 0.16, 8, P.hydrant);
  k.cyl(x, 0.16, z, 0.22, 0.22, 0.08, 8, P.hydrant);
  k.cylX(x, 0.55, z, 0.07, 0.48, 6, 0xd9d9d9, 'metal');
  k.cylZ(x, 0.5, z, 0.08, 0.38, 6, P.hydrant);
}

export function uspsBox(k: Kit, signs: SignBook, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    for (const sx of [-0.25, 0.25]) for (const sz of [-0.2, 0.2]) k.box(sx, 0.16, sz, 0.06, 0.25, 0.06, 0x2a2a2a);
    k.box(0, 0.4, 0, 0.6, 0.75, 0.55, P.uspsBlue);
    k.add(new THREE.CylinderGeometry(0.3, 0.3, 0.55, 10, 1, false, 0, Math.PI), P.uspsBlue, 'paint', k.local(0, 1.15, 0, { rz: Math.PI / 2, rx: Math.PI / 2 }));
    k.sign(0, 0.85, 0.28, 0.45, 0.22, signs.get('mail'), { thick: 0.01 });
  });
}

export function newsBoxes(k: Kit, signs: SignBook, x: number, z: number, ry: number) {
  const cols = [0x2f7d4a, 0xc7372f, 0x2c4a8c];
  k.at(x, z, ry, () => {
    cols.forEach((col, i) => {
      const bx = (i - 1) * 0.62;
      k.box(bx, 0.16, 0, 0.5, 0.5, 0.42, 0x2a2a2a);
      k.box(bx, 0.66, 0, 0.55, 0.72, 0.48, col);
      k.box(bx, 0.9, 0.245, 0.4, 0.32, 0.02, 0x9fb3bf, 'glass');
      k.sign(bx, 0.76, 0.25, 0.4, 0.13, signs.get('press'), { thick: 0.005 });
    });
  });
}

export function trashCan(k: Kit, x: number, z: number, col: Col = 0x6c7a6e) {
  k.cyl(x, 0.0, z, 0.3, 0.27, 0.95, 10, col, 'metal');
  k.cyl(x, 0.95, z, 0.33, 0.33, 0.08, 10, 0x4c5450, 'metal');
}

export function bench(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    for (const s of [-0.8, 0.8]) k.box(s, 0, 0, 0.08, 0.45, 0.5, 0x2e2e30, 'metal');
    for (let i = 0; i < 3; i++) k.box(0, 0.45, -0.18 + i * 0.16, 1.9, 0.05, 0.12, 0x8a6a48, 'planks');
    for (let i = 0; i < 2; i++) k.box(0, 0.65 + i * 0.18, -0.27, 1.9, 0.12, 0.04, 0x8a6a48, 'planks');
  });
}

export function dumpster(k: Kit, x: number, z: number, ry: number, col: Col = P.dumpster, overflow?: Rng) {
  k.at(x, z, ry, () => {
    k.box(0, 0.2, 0, 2.0, 1.2, 1.3, col, 'metal');
    k.box(0, 0.05, 0, 1.7, 0.15, 1.1, 0x333333);
    k.box(0, 1.4, -0.2, 2.05, 0.06, 0.95, 0x1d1d1d, 'paint', { rx: -0.25 });
    k.box(0, 1.4, 0.35, 2.05, 0.06, 0.55, 0x1d1d1d);
    for (const s of [-1, 1]) k.box(s * 1.04, 0.8, 0, 0.08, 0.12, 1.35, col, 'metal');
    if (overflow) {
      for (let i = 0; i < 4; i++) k.ico(overflow.range(-0.7, 0.7), 1.5, overflow.range(-0.3, 0.4), overflow.range(0.25, 0.4), 0, 0x1c1c1e, 'gloss', 1, 0.8, 1);
      k.box(0.3, 1.4, 0.1, 0.6, 0.4, 0.5, 0xb08b62, 'paint', { ry: 0.4 });
    }
  });
}

export function payphone(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, 0.12, 1.4, 0.12, 0x8a8e92, 'metal');
    k.box(0, 1.1, 0.12, 0.55, 0.85, 0.35, 0x2c4a8c);
    k.box(0, 1.95, 0.12, 0.62, 0.12, 0.42, 0x2c4a8c);
    k.box(0, 1.25, 0.31, 0.3, 0.5, 0.04, 0x8a8e92, 'metal');
  });
}

export function picketFence(k: Kit, ax: number, az: number, bx: number, bz: number, col: Col = 0xf4f2ec, h = 1.05) {
  const len = Math.hypot(bx - ax, bz - az);
  const ry = Math.atan2(bx - ax, bz - az) - Math.PI / 2;
  const n = Math.floor(len / 0.2);
  k.at((ax + bx) / 2, (az + bz) / 2, ry, () => {
    for (const y of [0.3, h - 0.3]) k.box(0, y, 0, len, 0.08, 0.05, col);
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + (len * i) / n;
      k.box(x, 0, 0.04, 0.09, h, 0.025, col);
      k.add(new THREE.ConeGeometry(0.065, 0.12, 4), col, 'paint', k.local(x, h + 0.06, 0.04, { ry: Math.PI / 4 }));
    }
    const posts = Math.max(1, Math.round(len / 2.4));
    for (let i = 0; i <= posts; i++) k.box(-len / 2 + (len * i) / posts, 0, -0.03, 0.12, h + 0.08, 0.12, col);
  });
}

export function railFence(k: Kit, ax: number, az: number, bx: number, bz: number, col: Col = 0x6e5440, h = 1.2, yAt?: (x: number, z: number) => number) {
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.round(len / 2.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    const y = yAt ? yAt(x, z) : 0;
    k.box(x, y - 0.1, z, 0.14, h + 0.1, 0.14, col);
    if (i < n) {
      const t2 = (i + 1) / n;
      const x2 = ax + (bx - ax) * t2;
      const z2 = az + (bz - az) * t2;
      const y2 = yAt ? yAt(x2, z2) : 0;
      for (const ry of [h * 0.45, h * 0.85]) k.beam(V(x, y + ry, z), V(x2, y2 + ry, z2), 0.06, 0.12, col);
    }
  }
}

export function bunting(k: Kit, a: THREE.Vector3, b: THREE.Vector3, rng: Rng) {
  const cols = [0xd9483b, 0xf2c94c, 0x3c7dd9, 0xf4f1ea, 0x2fa36b, 0xe07b39];
  wire(k, a, b, 0.05, 0.015);
  const len = a.distanceTo(b);
  const n = Math.floor(len / 0.7);
  const sag = Math.min(2.4, len * 0.05);
  const dir = b.clone().sub(a);
  const ry = Math.atan2(dir.x, dir.z) - Math.PI / 2;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    const s = new THREE.Shape();
    s.moveTo(-0.22, 0);
    s.lineTo(0.22, 0);
    s.lineTo(0, -0.5);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry + rng.range(-0.15, 0.15)), new THREE.Vector3(1, 1, 1));
    k.add(g, rng.pick(cols), 'paint', m, false);
    const g2 = new THREE.ShapeGeometry(s);
    g2.rotateY(Math.PI);
    k.add(g2, rng.pick(cols), 'paint', m, false);
  }
}

export function cone(k: Kit, x: number, z: number) {
  k.box(x, 0, z, 0.38, 0.04, 0.38, 0xe2552b);
  k.cone(x, 0.04, z, 0.15, 0.62, 8, 0xe2552b);
  k.cyl(x, 0.3, z, 0.1, 0.12, 0.1, 8, 0xf4f1ea);
}

export function barrel(k: Kit, x: number, z: number, col: Col, y = 0) {
  k.cyl(x, y, z, 0.3, 0.3, 0.9, 10, col, 'gloss');
  k.cyl(x, y + 0.3, z, 0.31, 0.31, 0.04, 10, col, 'gloss');
  k.cyl(x, y + 0.6, z, 0.31, 0.31, 0.04, 10, col, 'gloss');
}

export function pallet(k: Kit, x: number, z: number, ry: number, y = 0) {
  k.at(x, z, ry, () => {
    for (const s of [-0.5, 0, 0.5]) k.box(0, y, s, 1.2, 0.1, 0.1, 0xb48e5e);
    for (let i = 0; i < 5; i++) k.box(-0.5 + i * 0.25, y + 0.1, 0, 0.18, 0.03, 1.1, 0xc59c68);
  }, 0);
}

export function crateStack(k: Kit, rng: Rng, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    pallet(k, 0, 0, 0);
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) k.box(rng.range(-0.1, 0.1), 0.13 + i * 0.55, rng.range(-0.1, 0.1), 1.0, 0.55, 1.0, rng.pick([0xc8a46e, 0xb88c56, 0xd6b47c]), 'planks', { ry: rng.range(-0.2, 0.2) });
  });
}

export function tireStack(k: Kit, x: number, z: number, n = 4) {
  for (let i = 0; i < n; i++) k.torus(x, 0.13 + i * 0.25, z, 0.3, 0.13, 6, 10, 0x1b1b1b, 'rubber', { rx: Math.PI / 2 });
}

export function lumberStack(k: Kit, rng: Rng, x: number, z: number, ry: number, layers = 4) {
  k.at(x, z, ry, () => {
    for (let l = 0; l < layers; l++) {
      k.box(-2, l * 0.42, 0, 0.1, 0.1, 1.6, 0x7a5a3c);
      k.box(2, l * 0.42, 0, 0.1, 0.1, 1.6, 0x7a5a3c);
      const n = 5;
      for (let i = 0; i < n; i++) {
        if (l === layers - 1 && rng.chance(0.3)) continue;
        k.box(rng.range(-0.15, 0.15), l * 0.42 + 0.1, -0.6 + i * 0.3, 5.4, 0.3, 0.26, rng.pick([0xc9995f, 0xd2a46a, 0xbf8f58]), 'planks');
      }
    }
  });
}

export function propaneTank(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    for (const s of [-0.8, 0.8]) k.box(s, 0, 0, 0.3, 0.45, 0.8, 0x8f8c87, 'concrete');
    k.cylX(0, 1.0, 0, 0.62, 2.6, 12, 0xb3683a, 'gloss');
    k.sphere(-1.3, 1.0, 0, 0.62, 0xb3683a, 'gloss', 10, 8);
    k.sphere(1.3, 1.0, 0, 0.62, 0xb3683a, 'gloss', 10, 8);
    k.box(0, 1.6, 0, 0.3, 0.2, 0.3, 0x8a8e92, 'metal');
  });
}

export function ruralMailbox(k: Kit, x: number, z: number, ry: number, col: Col = 0x2c2c2e) {
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, 0.1, 1.05, 0.1, 0x6e5440);
    k.box(0, 1.05, 0, 0.3, 0.26, 0.55, col, 'metal');
    k.cylZ(0, 1.3, 0, 0.15, 0.55, 8, col, 'metal');
    k.box(0.17, 1.25, 0.15, 0.02, 0.25, 0.05, 0xc0392b);
  });
}

export function acUnit(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    k.box(0, 0, 0, 0.9, 0.12, 0.9, 0x8f8c87, 'concrete');
    k.box(0, 0.12, 0, 0.8, 0.75, 0.8, 0xd5d3cc);
    k.cyl(0, 0.87, 0, 0.3, 0.3, 0.02, 10, 0x3c3c3c);
  });
}

export function manhole(k: Kit, x: number, z: number, y = 0.03) {
  k.cyl(x, y, z, 0.42, 0.42, 0.015, 12, 0x3b3d40, 'decal', { cast: false });
}

export function drain(k: Kit, x: number, z: number, ry: number) {
  k.at(x, z, ry, () => {
    k.box(0, 0.03, 0, 1.1, 0.012, 0.45, 0x2a2b2d, 'decal', { cast: false });
    for (let i = 0; i < 7; i++) k.box(-0.45 + i * 0.15, 0.04, 0, 0.04, 0.008, 0.38, 0x55575a, 'decal', { cast: false });
  });
}

export function pebbles(k: Kit, rng: Rng, x0: number, z0: number, x1: number, z1: number, n: number, y = 0) {
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.12, 0.3);
    k.box(rng.range(x0, x1), y, rng.range(z0, z1), s * 1.3, s * 0.6, s, rng.pick([0x9a7a58, 0x8a6a4c, 0xa88a68]), 'paint', { ry: rng.range(0, 3), cast: false });
  }
}

export function hoseReel(k: Kit, x: number, z: number) {
  for (let i = 0; i < 4; i++) k.torus(x, 0.03, z, 0.5 + i * 0.12, 0.025, 4, 18, 0x2f6b3a, 'paint', { rx: -Math.PI / 2, cast: false });
}

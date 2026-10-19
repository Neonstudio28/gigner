import * as THREE from 'three';
import type { Kit, Col, Occupancy } from '../core/kit';
import type { Rng } from '../core/rng';
import type { SignBook, SignId } from '../signs';
import { P } from '../palette';

export interface Ctx {
  kit: Kit;
  occ: Occupancy;
  rng: Rng;
  signs: SignBook;
  /** Builds geometry into its own group (for animated parts like windmill rotors). */
  dyn: (name: string, build: (k: Kit) => void) => THREE.Group;
}

export interface WinOpts {
  frame?: Col;
  glass?: Col;
  mx?: number;
  my?: number;
  shutters?: Col;
  arch?: Col;
  sill?: boolean;
  ac?: boolean;
}

/** Window on a wall facing +Z whose surface is z = zf; (x, y) is the bottom centre of the glass. */
export function windowAt(k: Kit, x: number, y: number, zf: number, w: number, h: number, o: WinOpts = {}) {
  const fr = o.frame ?? P.windowFrame;
  const t = 0.1;
  const out = 0.07;
  k.box(x, y, zf - 0.03, w, h, 0.08, o.glass ?? P.glass, 'glass');
  k.box(x, y + h, zf + out / 2 - 0.01, w + t * 2, t, out, fr);
  k.box(x, y - t, zf + 0.04, w + t * 2 + 0.1, t, out + 0.08, fr);
  k.box(x - w / 2 - t / 2, y, zf + out / 2 - 0.01, t, h, out, fr);
  k.box(x + w / 2 + t / 2, y, zf + out / 2 - 0.01, t, h, out, fr);
  const mx = o.mx ?? 1;
  const my = o.my ?? 2;
  for (let i = 1; i < mx; i++) k.box(x - w / 2 + (w * i) / mx, y, zf + 0.02, 0.05, h, 0.04, fr);
  for (let i = 1; i < my; i++) k.box(x, y + (h * i) / my - 0.025, zf + 0.02, w, 0.05, 0.04, fr);
  if (o.shutters !== undefined) {
    for (const s of [-1, 1]) k.box(x + s * (w / 2 + t + 0.3), y - 0.02, zf + 0.04, 0.5, h + 0.04, 0.05, o.shutters);
  }
  if (o.arch !== undefined) {
    const R = w / 2 + 0.28;
    const r = w / 2 + 0.08;
    const s = new THREE.Shape();
    s.moveTo(R, 0);
    s.absarc(0, 0, R, 0, Math.PI, false);
    s.lineTo(-r, 0);
    s.absarc(0, 0, r, Math.PI, 0, true);
    s.closePath();
    k.extrude(s, 0.12, o.arch, 'paint', x, y + h + t, zf + 0.07);
  }
  if (o.ac) {
    k.box(x, y + 0.02, zf + 0.3, Math.min(0.75, w * 0.6), 0.45, 0.55, 0xd9d6cc);
    k.box(x, y + 0.08, zf + 0.58, Math.min(0.6, w * 0.5), 0.3, 0.02, 0x8f9194);
  }
}

export function doorAt(k: Kit, x: number, y: number, zf: number, w: number, h: number, color: Col, o: { frame?: Col; glass?: boolean; double?: boolean } = {}) {
  const fr = o.frame ?? P.windowFrame;
  k.box(x, y, zf + 0.02, w + 0.24, h + 0.12, 0.08, fr);
  k.box(x, y, zf + 0.05, w, h, 0.06, color);
  if (o.glass) k.box(x, y + h * 0.5, zf + 0.085, w * 0.6, h * 0.35, 0.02, P.glass, 'glass');
  if (o.double) k.box(x, y, zf + 0.085, 0.04, h, 0.02, fr);
  k.box(x + w * 0.36, y + h * 0.45, zf + 0.1, 0.06, 0.14, 0.06, 0xc9b06a, 'metal');
}

export function storefront(k: Kit, x0: number, x1: number, y: number, zf: number, h: number, o: { frame?: Col; doorX?: number; doorW?: number; kick?: Col } = {}) {
  const fr = o.frame ?? 0x3b3633;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const dx = o.doorX ?? cx;
  const dw = o.doorW ?? 1.15;
  k.box(cx, y, zf - 0.04, w, h, 0.1, P.glass, 'glass');
  const kickH = 0.55;
  const segs: [number, number][] = [
    [x0, dx - dw / 2 - 0.1],
    [dx + dw / 2 + 0.1, x1],
  ];
  for (const [a, b] of segs) if (b - a > 0.05) k.box((a + b) / 2, y, zf + 0.03, b - a, kickH, 0.1, o.kick ?? fr);
  k.box(cx, y + h - 0.14, zf + 0.03, w, 0.16, 0.12, fr);
  k.box(cx, y + h * 0.76, zf + 0.03, w, 0.08, 0.08, fr);
  const n = Math.max(2, Math.round(w / 1.8));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (w * i) / n;
    if (Math.abs(x - dx) < dw / 2 + 0.1) continue;
    k.box(x, y, zf + 0.03, 0.1, h, 0.1, fr);
  }
  k.box(dx, y, zf + 0.02, dw + 0.2, 2.4, 0.1, fr);
  k.box(dx, y + 0.08, zf + 0.06, dw - 0.12, 2.2, 0.04, P.glassLit, 'glass');
  k.box(dx + dw * 0.32, y + 1.0, zf + 0.12, 0.05, 0.3, 0.05, 0xc0c3c6, 'metal');
}

export function awning(k: Kit, x: number, y: number, zf: number, w: number, proj: number, drop: number, mat: string) {
  const a = Math.atan2(drop, proj);
  const L = Math.hypot(drop, proj);
  k.boxC(x, y - drop / 2, zf + proj / 2, w, 0.06, L, 0xffffff, mat, { rx: a });
  k.box(x, y - drop - 0.32, zf + proj, w, 0.34, 0.04, 0xffffff, mat);
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(proj, -drop);
    sh.lineTo(proj, -drop - 0.32);
    sh.lineTo(0, -0.05);
    sh.closePath();
    k.extrude(sh, 0.04, 0xffffff, mat, x + s * (w / 2), y, zf, { ry: -Math.PI / 2 });
  }
}

export function cornice(k: Kit, w: number, H: number, zf: number, color: Col, depth = 0) {
  k.box(0, H - 0.95, zf + 0.06, w + 0.1, 0.2, 0.16, color);
  k.box(0, H - 0.6, zf + 0.12, w + 0.2, 0.28, 0.28, color);
  k.box(0, H - 0.32, zf + 0.2, w + 0.36, 0.32, 0.44, color);
  const n = Math.floor(w / 0.5);
  for (let i = 0; i < n; i++) k.box(-w / 2 + 0.25 + i * (w / n), H - 0.78, zf + 0.2, 0.18, 0.18, 0.16, color);
  if (depth > 0) {
    for (const s of [-1, 1]) k.box(s * (w / 2 + 0.08), H - 0.32, zf - depth / 2 + 0.2, 0.2, 0.32, depth, color);
  }
}

export function flatRoof(k: Kit, w: number, d: number, H: number, parapet = 0.7, cap: Col = 0xb9b4ab) {
  // sits on top of the wall box so the dark membrane (not the wall material) is what you see from above
  k.box(0, H, 0, w - 0.3, 0.06, d - 0.3, P.roofTar);
  if (parapet > 0) {
    k.box(0, H, d / 2 - 0.15, w, parapet, 0.3, cap, 'concrete');
    k.box(0, H, -d / 2 + 0.15, w, parapet, 0.3, cap, 'concrete');
    k.box(-w / 2 + 0.15, H, 0, 0.3, parapet, d, cap, 'concrete');
    k.box(w / 2 - 0.15, H, 0, 0.3, parapet, d, cap, 'concrete');
  }
}

export function rooftop(k: Kit, rng: Rng, w: number, d: number, H: number, n = 2) {
  for (let i = 0; i < n; i++) {
    const x = rng.range(-w / 2 + 2, w / 2 - 2);
    const z = rng.range(-d / 2 + 2, d / 2 - 3);
    k.box(x, H - 0.1, z, 1.5, 0.95, 1.1, 0xc9c8c2);
    k.cyl(x, H + 0.85, z, 0.4, 0.4, 0.04, 10, 0x55585c);
  }
  for (let i = 0; i < 3; i++) k.cyl(rng.range(-w / 2 + 1, w / 2 - 1), H - 0.1, rng.range(-d / 2 + 1, d / 2 - 1), 0.12, 0.12, 0.8, 6, 0x7f8285, 'metal');
  k.box(rng.range(-w / 4, w / 4), H - 0.1, rng.range(-d / 4, d / 4), 1, 0.4, 1, 0x8a8c8f);
}

export function chimney(k: Kit, x: number, y: number, z: number, h: number, color: Col = 0xffffff, mat = 'brickRed') {
  k.box(x, y, z, 0.9, h, 0.9, color, mat);
  k.box(x, y + h, z, 1.05, 0.15, 1.05, 0x6c6a66);
  k.box(x, y + h + 0.15, z, 0.5, 0.25, 0.5, 0x3c3a38);
}

export function downspout(k: Kit, x: number, z: number, h: number, color: Col = 0xe8e6e0) {
  k.box(x, 0.1, z, 0.1, h - 0.1, 0.1, color);
}

export function billboardFrame(k: Kit, x: number, y: number, z: number, w: number, h: number, tex?: THREE.Texture) {
  const col = 0xc8cacd;
  const cols = Math.max(3, Math.round(w / 1.6));
  for (let i = 0; i <= cols; i++) {
    const px = x - w / 2 + (w * i) / cols;
    k.box(px, y, z, 0.12, h, 0.12, col, 'metal');
    k.box(px, y, z - 1.2, 0.1, h * 0.7, 0.1, col, 'metal');
    k.beam({ x: px, y: y + h * 0.7, z: z - 1.2 }, { x: px, y: y + 0.2, z }, 0.06, 0.06, col, 'metal');
  }
  for (let j = 1; j <= 4; j++) k.box(x, y + (h * j) / 4 - 0.06, z, w, 0.1, 0.1, col, 'metal');
  k.box(x, y + h * 0.35, z + 0.5, w, 0.06, 0.9, 0x9a9da0, 'metal');
  if (tex) k.sign(x, y + h * 0.62, z + 0.12, w, h * 0.66, tex, { back: 0xe8e8e8, thick: 0.1 });
}

/** Flag on a pole: texture faces +Z and -Z. */
export function flagPole(k: Kit, signs: SignBook, x: number, z: number, h = 9) {
  k.cyl(x, 0, z, 0.06, 0.09, h, 8, 0xd9dadc, 'metal');
  k.sphere(x, h + 0.08, z, 0.12, 0xd8b44a, 'metal');
  k.sign(x + 0.95, h - 0.7, z, 1.8, 0.95, signs.get('flag'), { thick: 0.02, twoSided: true });
}

export function signId(id: SignId): SignId {
  return id;
}

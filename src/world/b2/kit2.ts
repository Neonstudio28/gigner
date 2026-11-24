import * as THREE from 'three';
import type { Kit, Col, RoomStyle, SignRef } from '../core/kit';
import type { Ctx } from '../buildings/common';
import { panelSign, type Line } from '../textures';

/**
 * Facade kit for the remade town: mid-poly trim built from layered parts (casings with reveals, sloped sills,
 * stepped cornices with brackets, pilasters with bases and caps, fabric awnings with scalloped valances).
 * Everything here draws in a "wall frame": the wall surface is the plane z = 0 facing +Z, x runs along the
 * wall and y is height. Use `face()` to enter the frame of one side of a rectangular building.
 */

export type Side = 'f' | 'b' | 'l' | 'r';
export const WHITE = 0xf1ede2;
export const STONE = 0xd9cfba;
export const DARK = 0x2a2623;
/** Display face used on every printed sign. */
export const F_OS = 'Oswald';

/** Runs `fn(len)` in the wall frame of one side of a w x d footprint centred on the origin (front = +Z). */
export function face(k: Kit, side: Side, w: number, d: number, fn: (len: number) => void) {
  if (side === 'f') k.at(0, d / 2, 0, () => fn(w));
  else if (side === 'b') k.at(0, -d / 2, Math.PI, () => fn(w));
  else if (side === 'r') k.at(w / 2, 0, Math.PI / 2, () => fn(d));
  else k.at(-w / 2, 0, -Math.PI / 2, () => fn(d));
}

export interface WinO {
  frame?: Col;
  /** Panes across and up (muntin grid); default 1 x 2 = a double-hung sash. */
  mx?: number;
  my?: number;
  sill?: Col | null;
  /** Head: plain casing, a flat stone lintel, a brick arch with keystone, or a small cornice hood. */
  head?: 'plain' | 'lintel' | 'arch' | 'hood';
  headCol?: Col;
  shutters?: Col;
  room?: RoomStyle;
  /** The wall has a real hole here: trim and see-through glass only. */
  open?: boolean;
  /** Flower box under the sill. */
  box?: Col;
  ac?: boolean;
}

/** Window with a proud casing, set-back glass, sloped sill and muntins; (x, y) is the bottom centre of the glass. */
export function win(k: Kit, x: number, y: number, w: number, h: number, o: WinO = {}) {
  const fr = o.frame ?? WHITE;
  const t = 0.11;
  const out = 0.09;
  if (o.open) k.box(x, y, -0.12, w, h, 0.02, 0xcfe2ea, 'clear', { cast: false });
  else k.pane(x, y, 0.012, w, h, o.room ?? 'home', h > 1.75 ? 0.35 : 0.9);
  // casing: jambs, head, and a thinner inner stop that reads as the reveal
  for (const s of [-1, 1]) {
    k.box(x + s * (w / 2 + t / 2), y, out / 2, t, h + t, out, fr);
    k.box(x + s * (w / 2 - 0.02), y, 0.03, 0.04, h, 0.05, fr);
  }
  k.box(x, y + h, out / 2, w + t * 2, t, out, fr);
  k.box(x, y + h - 0.04, 0.03, w, 0.04, 0.05, fr);
  const mx = o.mx ?? 1;
  const my = o.my ?? 2;
  for (let i = 1; i < mx; i++) k.box(x - w / 2 + (w * i) / mx, y, 0.03, 0.035, h, 0.035, fr);
  for (let i = 1; i < my; i++) k.box(x, y + (h * i) / my - 0.03, 0.035, w, i === Math.floor(my / 2) ? 0.07 : 0.035, 0.05, fr);
  if (o.sill !== null) {
    const sc = o.sill ?? fr;
    k.box(x, y - 0.1, 0.09, w + t * 2 + 0.16, 0.1, 0.2, sc);
    k.box(x, y - 0.16, 0.06, w + t * 2, 0.06, 0.12, sc);
  }
  const hc = o.headCol ?? STONE;
  if (o.head === 'lintel') {
    k.box(x, y + h + t, 0.05, w + 0.7, 0.34, 0.1, hc);
    k.box(x, y + h + t + 0.06, 0.07, 0.3, 0.34, 0.14, hc);
  } else if (o.head === 'hood') {
    k.box(x, y + h + t, 0.08, w + t * 2 + 0.1, 0.1, 0.16, fr);
    k.box(x, y + h + t + 0.1, 0.12, w + t * 2 + 0.3, 0.08, 0.24, fr);
  } else if (o.head === 'arch') {
    const n = 7;
    const R = w / 2 + 0.2;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.18 + (0.64 * (i + 0.5)) / n);
      k.box(x + Math.cos(a) * R * 1.02, y + h - R * 0.55 + Math.sin(a) * R * 0.75, 0.05, 0.3, 0.36, 0.1, i === (n - 1) / 2 ? WHITE : hc, 'paint', { rz: a - Math.PI / 2 });
    }
  }
  if (o.shutters !== undefined)
    for (const s of [-1, 1]) {
      const sx = x + s * (w / 2 + t + 0.26);
      k.box(sx, y, 0.03, 0.46, h + 0.04, 0.06, o.shutters);
      for (let j = 0; j < 6; j++) k.box(sx, y + 0.12 + (j * (h - 0.2)) / 6, 0.065, 0.36, 0.04, 0.03, o.shutters);
    }
  if (o.box !== undefined) {
    k.box(x, y - 0.44, 0.16, w + 0.1, 0.26, 0.26, o.box);
    for (let i = 0; i < 5; i++) k.ico(x - w / 2 + 0.15 + (i * (w - 0.3)) / 4, y - 0.2, 0.16, 0.15, 0, [0xd9435e, 0xf2c14e, 0xe8e6df, 0xc2476b, 0x5a8f3c][i], 'paint', 1, 0.8, 1, false);
  }
  if (o.ac) {
    k.box(x, y, 0.2, Math.min(w - 0.1, 0.75), 0.42, 0.5, 0xd8d6cc);
    k.box(x, y + 0.06, 0.455, Math.min(w - 0.2, 0.65), 0.3, 0.01, 0x8f8f88);
  }
}

export interface DoorO {
  frame?: Col;
  /** Glass upper panel (shop door) or a solid panelled door. */
  glass?: boolean;
  double?: boolean;
  /** Fixed light over the door. */
  transom?: number;
  /** Real opening: the leaf stands open inside so you can walk through. */
  open?: boolean;
  hood?: boolean;
}

/** Door with casing, panels, kick plate and handle; (x, y) is the bottom centre of the opening. */
export function door(k: Kit, x: number, y: number, w: number, h: number, color: Col, o: DoorO = {}) {
  const fr = o.frame ?? WHITE;
  const t = 0.12;
  const tr = o.transom ?? 0;
  for (const s of [-1, 1]) k.box(x + s * (w / 2 + t / 2), y, 0.05, t, h + tr + t, 0.1, fr);
  k.box(x, y + h + tr, 0.05, w + t * 2, t, 0.1, fr);
  if (tr > 0) {
    k.box(x, y + h, 0.04, w, 0.07, 0.08, fr);
    k.box(x, y + h + 0.07, -0.02, w, tr - 0.07, 0.02, 0xcfe2ea, o.open ? 'clear' : 'glass', { cast: false });
  }
  if (o.hood) {
    k.box(x, y + h + tr + t, 0.3, w + 0.9, 0.1, 0.7, fr);
    for (const s of [-1, 1]) k.beam({ x: x + s * (w / 2 + 0.25), y: y + h + tr - 0.4, z: 0.02 }, { x: x + s * (w / 2 + 0.25), y: y + h + tr + t, z: 0.55 }, 0.08, 0.08, fr);
  }
  const leaves = o.double ? 2 : 1;
  const lw = w / leaves;
  for (let i = 0; i < leaves; i++) {
    const hinge = o.double ? (i ? 1 : -1) : -1;
    const leaf = () => {
      // drawn with the hinge at local x = 0, the leaf extending to +x
      k.box(lw / 2, 0, 0, lw - 0.02, h - 0.02, 0.05, color);
      if (o.glass) {
        k.box(lw / 2, h * 0.36, 0.005, lw - 0.26, h * 0.54, 0.052, 0xcfe2ea, 'clear', { cast: false });
        k.box(lw / 2, 0.08, 0.03, lw - 0.1, 0.2, 0.02, 0xb9a36a, 'metal');
      } else {
        for (const [py, ph] of [[0.16, h * 0.34], [h * 0.34 + 0.3, h * 0.5 - 0.1]] as [number, number][]) for (const s of [-1, 1]) k.box(lw / 2 + s * lw * 0.22, py, 0.03, lw * 0.32, ph, 0.02, color);
      }
      k.box(lw - 0.12, h * 0.46, 0.05, 0.04, 0.2, 0.06, 0xc8b06a, 'metal');
    };
    const hx = x + (o.double ? (i ? w / 2 : -w / 2) : -w / 2);
    if (o.open) k.at(hx, -0.03, hinge < 0 ? Math.PI * 0.56 : Math.PI - Math.PI * 0.56, leaf, y);
    else k.at(hx, 0.0, hinge < 0 ? 0 : Math.PI, leaf, y);
  }
}

/** Pilaster with plinth and moulded cap. */
export function pilaster(k: Kit, x: number, y: number, h: number, w = 0.5, color: Col = WHITE, mat = 'paint') {
  k.box(x, y, 0.07, w, h, 0.14, color, mat);
  k.box(x, y, 0.1, w + 0.12, 0.5, 0.2, color, mat);
  k.box(x, y + h - 0.3, 0.09, w + 0.1, 0.12, 0.18, color, mat);
  k.box(x, y + h - 0.16, 0.11, w + 0.2, 0.16, 0.22, color, mat);
}

/**
 * Stepped cornice along the wall head with brackets or dentils; `y` is the underside. Returns its height.
 * Ends are returned round the corners by `ret` metres so the profile reads from the side too.
 */
export function cornice(k: Kit, x0: number, x1: number, y: number, o: { color?: Col; proj?: number; h?: number; brackets?: number; dentils?: boolean; scallop?: boolean; ret?: number } = {}) {
  const c = o.color ?? WHITE;
  const p = o.proj ?? 0.45;
  const h = o.h ?? 0.7;
  const x = (x0 + x1) / 2;
  const w = x1 - x0;
  const r = o.ret ?? 0;
  const steps: [number, number, number][] = [
    [0, 0.26 * h, 0.3 * p],
    [0.26 * h, 0.2 * h, 0.55 * p],
    [0.46 * h, 0.34 * h, 0.8 * p],
    [0.8 * h, 0.2 * h, p],
  ];
  for (const [sy, sh, sp] of steps) {
    k.box(x, y + sy, sp / 2 - r / 2, w + sp * 2, sh, sp + r, c);
  }
  if (o.dentils) {
    const n = Math.max(2, Math.round(w / 0.42));
    for (let i = 0; i < n; i++) k.box(x0 + ((i + 0.5) * w) / n, y + 0.08 * h, 0.3 * p + 0.06, 0.2, 0.16 * h, 0.12, c);
  }
  if (o.scallop) {
    // row of half-round drops under the cornice (the bank in the references)
    const n = Math.max(2, Math.round(w / 0.7));
    for (let i = 0; i < n; i++) k.cyl(x0 + ((i + 0.5) * w) / n, y - 0.02, 0.05, 0.3, 0.3, 0.1, 10, c, 'paint', { rx: Math.PI / 2 });
  }
  const nb = o.brackets ?? 0;
  for (let i = 0; i < nb; i++) {
    const bx = nb === 1 ? x : x0 + 0.3 + (i * (w - 0.6)) / (nb - 1);
    k.box(bx, y - 0.5, 0.1, 0.2, 0.5 + 0.46 * h, 0.2, c);
    k.box(bx, y - 0.2, 0.26, 0.16, 0.2 + 0.46 * h, 0.2, c);
    k.box(bx, y + 0.1, 0.4, 0.14, 0.36 * h, 0.2, c);
  }
  return h;
}

/** Fabric awning with stripes modelled as separate strips, closed ends and a scalloped valance. */
export function awning(k: Kit, x: number, y: number, w: number, o: { proj?: number; drop?: number; a?: Col; b?: Col; valance?: number } = {}) {
  const proj = o.proj ?? 1.5;
  const drop = o.drop ?? 0.75;
  const A = o.a ?? 0xb3262e;
  const B = o.b ?? 0xf3efe4;
  const n = Math.max(3, Math.round(w / 0.5) | 1);
  const sw = w / n;
  const len = Math.hypot(proj, drop);
  const ang = Math.atan2(drop, proj);
  const val = o.valance ?? 0.28;
  for (let i = 0; i < n; i++) {
    const cx = x - w / 2 + (i + 0.5) * sw;
    const col = i % 2 ? B : A;
    k.box(cx, y - drop / 2 - 0.03, proj / 2, sw, 0.06, len, col, 'paint', { rx: ang });
    k.box(cx, y - drop - val, proj - 0.02, sw, val, 0.04, col);
    k.cyl(cx, y - drop - val, proj - 0.02, sw / 2, sw / 2, 0.04, 8, col, 'paint', { rx: Math.PI / 2 });
  }
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(proj, -drop), new THREE.Vector2(proj, -drop - val), new THREE.Vector2(0, -drop - val)]);
    k.extrude(sh, 0.04, A, 'paint', x + s * (w / 2) - 0.02, y, 0, { ry: -Math.PI / 2 });
  }
  k.box(x, y - drop - 0.02, proj - 0.03, w, 0.04, 0.04, 0x8f8f8a, 'metal');
}

/** Printed sign board with a dark frame, centred on (x, y, z), with optional gooseneck lamps over it. */
export function signBoard(c: Ctx, key: string, x: number, y: number, z: number, w: number, h: number, bg: string, lines: Line[], o: { frame?: Col; border?: string; ry?: number; lamps?: number; twoSided?: boolean; draw?: Parameters<typeof panelSign>[4] } = {}) {
  const k = c.kit;
  const px = Math.min(1024, Math.max(256, Math.round((w / h) * 256)));
  const ref: SignRef = c.signs.custom(`b2.${key}`, () => panelSign(px, 256, bg, lines, { border: o.border, borderW: 10, ...(o.draw ?? {}) }));
  k.sign(x, y, z, w, h, ref, { back: o.frame ?? DARK, thick: 0.1, ry: o.ry, twoSided: o.twoSided });
  const n = o.lamps ?? 0;
  const top = y + h / 2;
  k.push(x, 0, z, o.ry ?? 0);
  for (let i = 0; i < n; i++) {
    const lx = -w / 2 + ((i + 0.5) * w) / n;
    k.tube([new THREE.Vector3(lx, top + 0.1, -0.05), new THREE.Vector3(lx, top + 0.5, 0.15), new THREE.Vector3(lx, top + 0.45, 0.6), new THREE.Vector3(lx, top + 0.25, 0.7)], 0.025, DARK, 'metal', 8, false);
    k.cone(lx, top + 0.12, 0.7, 0.16, 0.2, 10, DARK, 'metal');
  }
  k.pop();
}
